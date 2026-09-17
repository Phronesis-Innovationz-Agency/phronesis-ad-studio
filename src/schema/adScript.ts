import {z} from 'zod';

// This schema is the contract between the AI "creative director" step
// (plain-language description -> structured script) and the Remotion
// renderer (structured script -> actual video). Keeping it narrow and
// validated means the AI can be wrong/creative in wording but never in
// shape, so rendering never breaks.

export const sceneTypeSchema = z.enum([
	'hook',
	'showcase',
	'benefits',
	'offer',
	'cta',
]);

export const sceneSchema = z.object({
	type: sceneTypeSchema,
	// Ceiling accounts for the pipeline stretching this to fit the longest
	// possible voiceover (400 chars at natural speech pace is ~30s) plus its
	// buffer - see textToSpeech.ts. Typical fast-paced scenes are far shorter.
	durationInSeconds: z.number().min(1).max(35),
	headline: z.string().min(1).max(80),
	subtext: z.string().max(120).optional(),
	bullets: z.array(z.string().max(60)).max(4).optional(),
	// Narration line for this scene. Written by the AI; audioFile is filled in
	// afterward once text-to-speech has synthesized it (not set by the AI).
	// 400 chars is enough for a longer, fuller-length ad (30s+); typical
	// fast-paced product ads use well under this.
	voiceover: z.string().max(400).optional(),
	audioFile: z.string().optional(),
	// A user-uploaded product photo, or a random pick from the founder's
	// media library when nobody uploaded one, attached to a scene by the
	// pipeline after generation (not set by the AI) - a static-served
	// relative path, same pattern as audioFile.
	imageFile: z.string().optional(),
	// Same idea as imageFile but a looping background video - mutually
	// exclusive with it (imageFile wins if both would apply). Never set by
	// the AI.
	videoFile: z.string().optional(),
	// Per-frame "how loud is the narration right now" (0-1), one entry per
	// video frame of this scene. Drives the animated spokesperson's mouth.
	// Computed from audioFile by the pipeline, not set by the AI.
	mouthEnvelope: z.array(z.number()).optional(),
});

export const adScriptSchema = z.object({
	brand: z.object({
		name: z.string().min(1).max(40),
		primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
		secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	}),
	aspectRatio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
	scenes: z.array(sceneSchema).min(3).max(6),
	// Set by the pipeline for free-tier renders, never by the AI.
	watermark: z.boolean().optional().default(false),
	// A user toggle (not AI-decided): show the animated AI spokesperson.
	spokesperson: z.boolean().optional().default(false),
	// Background music for the whole ad (not per-scene) - a random pick from
	// the founder's music library, attached by the pipeline after generation.
	// Never set by the AI. musicDurationInSeconds is the track's real length,
	// measured once up front so the renderer can loop it seamlessly.
	musicFile: z.string().optional(),
	musicDurationInSeconds: z.number().optional(),
});

export type AdScript = z.infer<typeof adScriptSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type AspectRatio = AdScript['aspectRatio'];

export const DIMENSIONS: Record<AdScript['aspectRatio'], {width: number; height: number}> = {
	'9:16': {width: 1080, height: 1920},
	'1:1': {width: 1080, height: 1080},
	'16:9': {width: 1920, height: 1080},
};

export const FPS = 30;
