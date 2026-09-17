import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {generateAndRenderAd, PipelineStage} from '../pipeline';

const STAGE_MESSAGES: Record<PipelineStage, string> = {
	script: 'Asking Claude to write the ad script...',
	voiceover: 'Synthesizing voiceover...',
	render: 'Rendering video (this can take a minute)...',
};

// End-to-end: plain-language description -> AI script -> voiceover -> rendered mp4.
const main = async () => {
	const description = process.argv.slice(2).join(' ').trim();
	if (!description) {
		console.error(
			'Usage: npm run make-ad -- "A description of your product and the ad you want"',
		);
		process.exit(1);
	}

	const outDir = path.join(process.cwd(), 'out');
	await fs.mkdir(outDir, {recursive: true});
	const outputPath = path.join(outDir, 'ad.mp4');

	const {script, voiceName} = await generateAndRenderAd(
		description,
		outputPath,
		{},
		(stage) => console.log(STAGE_MESSAGES[stage]),
	);

	await fs.writeFile(
		path.join(outDir, 'script.json'),
		JSON.stringify(script, null, 2),
	);

	console.log(`Narrated by: ${voiceName}`);
	console.log(`Done. Video: ${outputPath}`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
