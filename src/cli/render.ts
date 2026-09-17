import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {adScriptSchema} from '../schema/adScript';
import {synthesizeVoiceover} from '../ai/textToSpeech';
import {renderAd} from '../render';

const main = async () => {
	const scriptPath =
		process.argv[2] ?? path.join(process.cwd(), 'out', 'script.json');
	const raw = await fs.readFile(scriptPath, 'utf-8');
	let script = adScriptSchema.parse(JSON.parse(raw));

	const outDir = path.join(process.cwd(), 'out');
	await fs.mkdir(outDir, {recursive: true});

	const needsVoiceover = script.scenes.some(
		(scene) => scene.voiceover && !scene.audioFile,
	);
	if (needsVoiceover) {
		console.log('Synthesizing voiceover...');
		script = await synthesizeVoiceover(script, `ad-${Date.now()}`);
		await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
	}

	const outputPath = path.join(outDir, 'ad.mp4');
	console.log('Rendering video (this can take a minute)...');
	await renderAd(script, outputPath);
	console.log(`Video rendered to ${outputPath}`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
