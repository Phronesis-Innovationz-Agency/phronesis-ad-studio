import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {generateAdScript} from '../ai/generateScript';

const main = async () => {
	const description = process.argv.slice(2).join(' ').trim();
	if (!description) {
		console.error(
			'Usage: npm run generate -- "A description of your product and the ad you want"',
		);
		process.exit(1);
	}

	console.log('Asking Claude to write the ad script...');
	const {script, voiceName} = await generateAdScript(description);

	const outDir = path.join(process.cwd(), 'out');
	await fs.mkdir(outDir, {recursive: true});
	const outFile = path.join(outDir, 'script.json');
	await fs.writeFile(outFile, JSON.stringify(script, null, 2));

	console.log(`Script written to ${outFile}`);
	console.log(
		`Picked narrator voice: ${voiceName} (note: "npm run render" on its own uses the ` +
			'default/ELEVENLABS_VOICE_ID voice, not this pick - use "npm run make-ad" for the full AI-picked flow in one step)',
	);
	console.log(JSON.stringify(script, null, 2));
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
