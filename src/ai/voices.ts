// A curated subset of the default voices ElevenLabs adds to every account's
// own voice library (so they all work on the free tier's API - see
// textToSpeech.ts for why that distinction matters). Claude picks one of
// these by name to match the brand's vibe; see generateScript.ts.
export const VOICE_CATALOG = [
	{
		id: 'TX3LPaxmHKxFdv7VOQHJ',
		name: 'Liam',
		description: 'Energetic, social-media-creator energy. Tech, gadgets, youth brands.',
	},
	{
		id: 'cgSgspJ2msm6clMCkdW9',
		name: 'Jessica',
		description: 'Playful, bright, warm. Fun/summery/lifestyle brands.',
	},
	{
		id: 'JBFqnCBsd6RMkjVDRZzb',
		name: 'George',
		description: 'Warm, captivating storyteller. Cozy, premium, artisanal brands.',
	},
	{
		id: 'IKne3meq5aSn9XLyUdCD',
		name: 'Charlie',
		description: 'Deep, confident, energetic. Bold, sports, high-energy brands.',
	},
	{
		id: 'XrExE9yKIg1WjnnlVkGX',
		name: 'Matilda',
		description: 'Knowledgeable, professional. B2B, tech, productivity products.',
	},
	{
		id: 'Xb7hH8MSUJpSbSDYk0k2',
		name: 'Alice',
		description: 'Clear, engaging educator. Explainer-style, how-it-works products.',
	},
	{
		id: 'SAz9YHcvj6GT2YYXdXww',
		name: 'River',
		description: 'Relaxed, neutral, informative. Calm, minimal, wellness brands.',
	},
	{
		id: 'EXAVITQu4vr4xnSDxMaL',
		name: 'Sarah',
		description: 'Mature, reassuring, confident. Trust-heavy: finance, health, home.',
	},
] as const;

export const DEFAULT_VOICE_NAME = 'Liam';

export const getVoiceIdByName = (name: string | undefined): string => {
	const match = VOICE_CATALOG.find(
		(voice) => voice.name.toLowerCase() === name?.toLowerCase(),
	);
	return (match ?? VOICE_CATALOG[0]).id;
};
