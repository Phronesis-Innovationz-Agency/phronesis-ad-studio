import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, {NextFunction, Request, Response} from 'express';
import multer from 'multer';
import Stripe from 'stripe';
import {createCheckoutSession, getStripeClient} from './billing/stripe';
import {generateAndRenderAd, PipelineStage} from './pipeline';
import {AspectRatio} from './schema/adScript';
import {
	canGenerate,
	getUsage,
	linkSessionToEmail,
	recordRender,
	restoreAccessByEmail,
	setSubscriptionStatus,
	setSubscriptionStatusByCustomerId,
	shouldWatermark,
	FREE_TIER_MONTHLY_LIMIT,
} from './tiers';

type JobStatus =
	| 'queued'
	| 'writing-script'
	| 'recording-voiceover'
	| 'rendering'
	| 'done'
	| 'error';

type Job = {
	id: string;
	status: JobStatus;
	videoUrl?: string;
	voiceName?: string;
	error?: string;
};

const STAGE_TO_STATUS: Record<PipelineStage, JobStatus> = {
	script: 'writing-script',
	voiceover: 'recording-voiceover',
	render: 'rendering',
};

const jobs = new Map<string, Job>();

const VALID_ASPECT_RATIOS: AspectRatio[] = ['9:16', '1:1', '16:9'];

const RENDERS_DIR = path.join(process.cwd(), 'out', 'renders');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const WEB_UI_DIR = path.join(process.cwd(), 'web-ui');
const SESSION_COOKIE = 'phronesis_sid';

const IMAGE_MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {fileSize: 8 * 1024 * 1024},
	fileFilter: (req, file, cb) => {
		if (IMAGE_MIME_TO_EXT[file.mimetype]) {
			cb(null, true);
		} else {
			cb(new Error('Product photo must be a JPEG, PNG, or WebP image.'));
		}
	},
});

const app = express();

// Must be registered before express.json() below - Stripe's signature
// check needs the exact raw request body, not a parsed/re-serialized one.
app.post(
	'/api/stripe/webhook',
	express.raw({type: 'application/json'}),
	(req, res) => {
		const signature = req.headers['stripe-signature'];
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!webhookSecret || typeof signature !== 'string') {
			res.status(400).send('Webhook is not configured.');
			return;
		}

		let event: Stripe.Event;
		try {
			event = getStripeClient().webhooks.constructEvent(req.body, signature, webhookSecret);
		} catch (error) {
			console.error('Stripe webhook signature verification failed:', error);
			res.status(400).send('Invalid signature.');
			return;
		}

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				const email = session.customer_details?.email;
				const customerId =
					typeof session.customer === 'string' ? session.customer : session.customer?.id;

				if (email && customerId) {
					setSubscriptionStatus(email, customerId, 'active');
					if (session.client_reference_id) {
						linkSessionToEmail(session.client_reference_id, email);
					}
				}
				break;
			}
			case 'customer.subscription.updated':
			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				const customerId =
					typeof subscription.customer === 'string'
						? subscription.customer
						: subscription.customer.id;
				const isActive = subscription.status === 'active' || subscription.status === 'trialing';
				setSubscriptionStatusByCustomerId(customerId, isActive ? 'active' : 'canceled');
				break;
			}
			default:
				break;
		}

		res.json({received: true});
	},
);

app.use(express.json());
app.use(cookieParser());

// Anonymous, cookie-based identity - just enough to track free-tier usage
// per browser. No accounts/login exist yet.
app.use((req, res, next) => {
	let sessionId: string = req.cookies[SESSION_COOKIE];
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		res.cookie(SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 365 * 24 * 60 * 60 * 1000,
		});
	}
	res.locals.sessionId = sessionId;
	next();
});

app.use(express.static(WEB_UI_DIR));
app.use('/renders', express.static(RENDERS_DIR));
// Only the curated demo asset is exposed here, not all of public/ - the
// audio/uploads subfolders hold other visitors' generated content.
app.use('/demo', express.static(path.join(process.cwd(), 'public', 'demo')));
app.use('/brand', express.static(path.join(process.cwd(), 'public', 'brand')));
app.use('/app', express.static(path.join(process.cwd(), 'public', 'app')));

app.get('/api/usage', (req, res) => {
	res.json(getUsage(res.locals.sessionId));
});

app.post('/api/checkout', async (req, res) => {
	try {
		const url = await createCheckoutSession(res.locals.sessionId);
		res.json({url});
	} catch (error) {
		console.error('Failed to create checkout session:', error);
		res.status(500).json({
			error: error instanceof Error ? error.message : 'Could not start checkout.',
		});
	}
});

app.post('/api/restore-access', (req, res) => {
	const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';

	if (!email) {
		res.status(400).json({error: 'Enter the email you subscribed with.'});
		return;
	}

	const restored = restoreAccessByEmail(res.locals.sessionId, email);
	if (!restored) {
		res.status(404).json({
			error: 'No active Phronesis Pro subscription found for that email.',
		});
		return;
	}

	res.json({restored: true});
});

app.post('/api/ads', upload.single('image'), async (req, res) => {
	const description =
		typeof req.body?.description === 'string' ? req.body.description.trim() : '';

	if (!description) {
		res.status(400).json({error: 'Please describe the ad you want.'});
		return;
	}

	const sessionId: string = res.locals.sessionId;

	if (!canGenerate(sessionId)) {
		res.status(402).json({
			error: `You've used all ${FREE_TIER_MONTHLY_LIMIT} free ads this month. Upgrade to Phronesis Pro for unlimited, watermark-free renders.`,
			limitReached: true,
		});
		return;
	}

	const id = crypto.randomUUID();
	const spokesperson = req.body?.spokesperson === 'true';
	const aspectRatio = (VALID_ASPECT_RATIOS as string[]).includes(req.body?.aspectRatio)
		? (req.body.aspectRatio as AspectRatio)
		: '9:16';

	let productImageFile: string | undefined;
	if (req.file) {
		const ext = IMAGE_MIME_TO_EXT[req.file.mimetype];
		const uploadDir = path.join(UPLOADS_DIR, id);
		await fs.mkdir(uploadDir, {recursive: true});
		await fs.writeFile(path.join(uploadDir, `product.${ext}`), req.file.buffer);
		productImageFile = `uploads/${id}/product.${ext}`;
	}

	const job: Job = {id, status: 'queued'};
	jobs.set(id, job);
	res.status(202).json({id});

	void runJob(job, description, sessionId, productImageFile, spokesperson, aspectRatio);
});

const runJob = async (
	job: Job,
	description: string,
	sessionId: string,
	productImageFile: string | undefined,
	spokesperson: boolean,
	aspectRatio: AspectRatio,
) => {
	try {
		await fs.mkdir(RENDERS_DIR, {recursive: true});
		const outputPath = path.join(RENDERS_DIR, `${job.id}.mp4`);

		const {voiceName} = await generateAndRenderAd(
			description,
			outputPath,
			{watermark: shouldWatermark(sessionId), productImageFile, spokesperson, aspectRatio},
			(stage) => {
				job.status = STAGE_TO_STATUS[stage];
			},
		);

		recordRender(sessionId);
		job.status = 'done';
		job.videoUrl = `/renders/${job.id}.mp4`;
		job.voiceName = voiceName;
	} catch (error) {
		job.status = 'error';
		job.error = error instanceof Error ? error.message : 'Something went wrong.';
		console.error(`Job ${job.id} failed:`, error);
	}
};

app.get('/api/ads/:id', (req, res) => {
	const job = jobs.get(req.params.id);
	if (!job) {
		res.status(404).json({error: 'Unknown job id.'});
		return;
	}
	res.json(job);
});

// Multer (and other middleware) errors - e.g. wrong file type, file too large.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	if (res.headersSent) {
		next(err);
		return;
	}
	res.status(400).json({error: err.message || 'Upload failed.'});
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
	console.log(`Phronesis Ad Studio running at http://localhost:${PORT}`);
});
