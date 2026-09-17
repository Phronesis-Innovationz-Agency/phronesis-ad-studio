import {AdScript, AspectRatio} from './schema/adScript';
import {generateAdScript} from './ai/generateScript';
import {pickLibraryImage, pickLibraryMusic, pickLibraryVideo} from './ai/mediaLibrary';
import {synthesizeVoiceover} from './ai/textToSpeech';
import {renderAd} from './render';

export type PipelineStage = 'script' | 'voiceover' | 'render';

export type PipelineOptions = {
	watermark?: boolean;
	// Relative path under public/ to an already-saved product photo
	// (the caller is responsible for writing the file there).
	productImageFile?: string;
	// Show the animated AI spokesperson character.
	spokesperson?: boolean;
	// Overrides whatever aspect ratio the AI defaults to - this is a hard
	// user/platform requirement (phone vs. desktop), not a creative call.
	aspectRatio?: AspectRatio;
};

// Attaches a background image or video to whichever scene benefits most from
// one: the "showcase" scene if the AI wrote one, else the first scene.
const attachBackgroundMedia = (
	script: AdScript,
	media: {imageFile?: string; videoFile?: string},
): AdScript => {
	const scenes = [...script.scenes];
	const targetIndex = Math.max(
		scenes.findIndex((scene) => scene.type === 'showcase'),
		0,
	);
	scenes[targetIndex] = {...scenes[targetIndex], ...media};
	return {...script, scenes};
};

export type GeneratedAdResult = {
	script: AdScript;
	voiceName: string;
};

// Shared by the CLI and the web server: plain-language description -> AI
// script (+ a fitting narrator voice) -> synthesized voiceover -> rendered mp4.
export const generateAndRenderAd = async (
	description: string,
	outputPath: string,
	options: PipelineOptions = {},
	onProgress?: (stage: PipelineStage) => void,
): Promise<GeneratedAdResult> => {
	onProgress?.('script');
	const generated = await generateAdScript(description);
	let script: AdScript = {
		...generated.script,
		watermark: options.watermark ?? false,
		spokesperson: options.spokesperson ?? false,
		aspectRatio: options.aspectRatio ?? generated.script.aspectRatio,
	};

	if (options.productImageFile) {
		script = attachBackgroundMedia(script, {imageFile: options.productImageFile});
	} else {
		const libraryImage = await pickLibraryImage();
		if (libraryImage) {
			script = attachBackgroundMedia(script, {imageFile: libraryImage});
		} else {
			const libraryVideo = await pickLibraryVideo();
			if (libraryVideo) {
				script = attachBackgroundMedia(script, {videoFile: libraryVideo});
			}
		}
	}

	const music = await pickLibraryMusic();
	if (music) {
		script = {...script, musicFile: music.file, musicDurationInSeconds: music.durationInSeconds};
	}

	onProgress?.('voiceover');
	script = await synthesizeVoiceover(script, `ad-${Date.now()}`, generated.voiceId);

	onProgress?.('render');
	await renderAd(script, outputPath);

	return {script, voiceName: generated.voiceName};
};
