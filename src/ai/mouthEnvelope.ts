import fs from 'node:fs/promises';
import decode from 'audio-decode';
import {FPS} from '../schema/adScript';

// Drives the animated spokesperson's mouth: not real lip-sync (no phoneme
// detection), but a per-video-frame "how loud is the voice right now" curve,
// computed from the actual synthesized narration. That's enough to make the
// mouth open/close believably in time with speech, entirely offline and free
// (no ML model, no GPU) - just amplitude analysis of audio we already have.
export const computeMouthEnvelope = async (
	audioFilePath: string,
	durationInSeconds: number,
): Promise<number[]> => {
	const buffer = await fs.readFile(audioFilePath);
	const audioBuffer = await decode(buffer);
	const samples = audioBuffer.channelData[0];
	const sampleRate = audioBuffer.sampleRate;

	const frameCount = Math.max(1, Math.round(durationInSeconds * FPS));
	const samplesPerFrame = Math.max(1, Math.round(sampleRate / FPS));

	const rawEnvelope: number[] = [];
	let peak = 0;

	for (let frame = 0; frame < frameCount; frame++) {
		const start = frame * samplesPerFrame;
		const end = Math.min(samples.length, start + samplesPerFrame);

		let sumSquares = 0;
		for (let i = start; i < end; i++) {
			sumSquares += samples[i] * samples[i];
		}
		const rms = end > start ? Math.sqrt(sumSquares / (end - start)) : 0;

		rawEnvelope.push(rms);
		peak = Math.max(peak, rms);
	}

	if (peak === 0) {
		return rawEnvelope.map(() => 0);
	}

	// Normalize to 0-1 against this clip's own loudest moment, then apply a
	// sqrt curve so quieter speech still visibly moves the mouth instead of
	// looking closed most of the time.
	return rawEnvelope.map((value) => Math.min(1, Math.sqrt(value / peak)));
};
