import {AdScript} from './schema/adScript';

// Used as the Remotion Studio preview default and as a few-shot example
// for the AI script generator.
export const sampleScript: AdScript = {
	brand: {
		name: 'GlowBrew',
		primaryColor: '#1a1a2e',
		secondaryColor: '#f2c14e',
	},
	aspectRatio: '9:16',
	watermark: false,
	spokesperson: true,
	scenes: [
		{
			type: 'hook',
			durationInSeconds: 3,
			headline: 'Tired of bitter coffee?',
			voiceover: 'Tired of bitter coffee?',
		},
		{
			type: 'showcase',
			durationInSeconds: 3,
			headline: 'Meet GlowBrew',
			subtext: 'Smart. Simple. Smooth.',
			voiceover: 'Meet GlowBrew. Smart, simple, smooth.',
		},
		{
			type: 'benefits',
			durationInSeconds: 4,
			headline: 'Why you will love it',
			bullets: [
				'Brews in 90 seconds',
				'Self-cleaning system',
				'Works with any grounds',
			],
			voiceover:
				'It brews in 90 seconds, cleans itself, and works with any grounds.',
		},
		{
			type: 'offer',
			durationInSeconds: 3,
			headline: '30% off this week',
			subtext: 'Free shipping included',
			voiceover: 'Get 30% off this week, with free shipping included.',
		},
		{
			type: 'cta',
			durationInSeconds: 3,
			headline: 'Grab yours before it is gone',
			voiceover: 'Grab yours before it is gone.',
		},
	],
};
