import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {parseFile} from 'music-metadata';
import {AdScript} from '../schema/adScript';
import {computeMouthEnvelope} from './mouthEnvelope';
import {getVoiceIdByName, DEFAULT_VOICE_NAME} from './voices';

// The voices in ./voices.ts are all defaults ElevenLabs adds to every
// account's own voice library (so they work on the free tier's API, unlike
// shared/community "voice library" voices, which require a paid plan for
// API access). Override with ELEVENLABS_VOICE_ID for manual/CLI runs that
// don't go through generateAdScript's per-brand voice pick.
const MODEL_ID = 'eleven_multilingual_v2';

// Extra seconds tacked onto a scene once we know how long its narration
// actually runs, so on-screen text doesn't get cut off mid-sentence.
const NARRATION_BUFFER_SECONDS = 0.4;

const PUBLIC_DIR = path.join(process.cwd(), 'public');

export const synthesizeVoiceover = async (
	script: AdScript,
	runId: string,
	voiceId?: string,
): Promise<AdScript> => {
	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw new Error(
			'ELEVENLABS_API_KEY is not set. Add it to .env to generate voiceover audio.',
		);
	}

	const client = new ElevenLabsClient({apiKey});
	const resolvedVoiceId =
		voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? getVoiceIdByName(DEFAULT_VOICE_NAME);

	const audioDir = path.join(PUBLIC_DIR, 'audio', runId);
	await fsp.mkdir(audioDir, {recursive: true});

	const scenes = await Promise.all(
		script.scenes.map(async (scene, index) => {
			if (!scene.voiceover || scene.audioFile) {
				return scene;
			}

			const fileName = `scene-${index}.mp3`;
			const absolutePath = path.join(audioDir, fileName);
			const relativePath = `audio/${runId}/${fileName}`;

			const audioStream = await client.textToSpeech.convert(resolvedVoiceId, {
				text: scene.voiceover,
				modelId: MODEL_ID,
				outputFormat: 'mp3_44100_128',
			});

			await pipeline(
				Readable.fromWeb(audioStream as never),
				fs.createWriteStream(absolutePath),
			);

			const metadata = await parseFile(absolutePath);
			const audioDurationInSeconds = metadata.format.duration ?? 0;
			const durationInSeconds = Math.max(
				scene.durationInSeconds,
				audioDurationInSeconds + NARRATION_BUFFER_SECONDS,
			);

			const mouthEnvelope = script.spokesperson
				? await computeMouthEnvelope(absolutePath, durationInSeconds)
				: undefined;

			return {
				...scene,
				audioFile: relativePath,
				durationInSeconds,
				mouthEnvelope,
			};
		}),
	);

	return {...script, scenes};
};
