import Stripe from 'stripe';

let client: Stripe | undefined;

// Lazily constructed so the app can boot (and everything except billing can
// be used) even before Stripe keys are added to .env.
export const getStripeClient = (): Stripe => {
	if (!client) {
		const apiKey = process.env.STRIPE_SECRET_KEY;
		if (!apiKey) {
			throw new Error(
				'STRIPE_SECRET_KEY is not set. Add your Stripe test-mode secret key to .env to enable billing.',
			);
		}
		client = new Stripe(apiKey);
	}
	return client;
};

// Creates a Stripe-hosted Checkout page for the Pro subscription and
// returns its URL. `sessionId` is our own anonymous session cookie value -
// passed through as client_reference_id so the webhook can link the
// resulting subscription back to the browser that started checkout.
export const createCheckoutSession = async (sessionId: string): Promise<string> => {
	const stripe = getStripeClient();

	const priceId = process.env.STRIPE_PRICE_ID;
	if (!priceId) {
		throw new Error(
			'STRIPE_PRICE_ID is not set. Create a recurring Price for Phronesis Pro in the Stripe Dashboard and add its id to .env.',
		);
	}

	const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

	const checkoutSession = await stripe.checkout.sessions.create({
		mode: 'subscription',
		line_items: [{price: priceId, quantity: 1}],
		client_reference_id: sessionId,
		success_url: `${appUrl}/?checkout=success`,
		cancel_url: `${appUrl}/?checkout=canceled`,
	});

	if (!checkoutSession.url) {
		throw new Error('Stripe did not return a checkout URL.');
	}

	return checkoutSession.url;
};
