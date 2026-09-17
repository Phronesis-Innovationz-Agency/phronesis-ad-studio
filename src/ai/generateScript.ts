import Anthropic from '@anthropic-ai/sdk';
import {AdScript, adScriptSchema} from '../schema/adScript';
import {sampleScript} from '../sampleScript';
import {VOICE_CATALOG, DEFAULT_VOICE_NAME, getVoiceIdByName} from './voices';

const SCRIPT_TOOL_SCHEMA = {
	type: 'object' as const,
	properties: {
		voice: {
			type: 'string',
			enum: VOICE_CATALOG.map((voice) => voice.name),
			description: 'Which narrator voice best fits this ad\'s vibe.',
		},
		brand: {
			type: 'object',
			properties: {
				name: {type: 'string'},
				primaryColor: {
					type: 'string',
					pattern: '^#[0-9a-fA-F]{6}$',
					description: 'A 6-digit hex color, e.g. #1a1a2e (not a 3-digit shorthand, not a named color).',
				},
				secondaryColor: {
					type: 'string',
					pattern: '^#[0-9a-fA-F]{6}$',
					description: 'A 6-digit hex color, e.g. #f2c14e (not a 3-digit shorthand, not a named color).',
				},
			},
			required: ['name', 'primaryColor', 'secondaryColor'],
		},
		aspectRatio: {type: 'string', enum: ['9:16', '1:1', '16:9']},
		scenes: {
			type: 'array',
			minItems: 3,
			maxItems: 6,
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						enum: ['hook', 'showcase', 'benefits', 'offer', 'cta'],
					},
					durationInSeconds: {type: 'number', minimum: 1, maximum: 10},
					headline: {type: 'string'},
					subtext: {type: 'string'},
					bullets: {
						type: 'array',
						items: {type: 'string'},
						maxItems: 4,
					},
					voiceover: {
						type: 'string',
						description:
							"The narration line spoken during this scene. Should read naturally aloud and match/support the on-screen headline/subtext/bullets, but doesn't need to repeat them word-for-word.",
					},
				},
				required: ['type', 'durationInSeconds', 'headline', 'voiceover'],
			},
		},
	},
	required: ['voice', 'brand', 'aspectRatio', 'scenes'],
};

const VOICE_GUIDE = VOICE_CATALOG.map((voice) => `- ${voice.name}: ${voice.description}`).join('\n');

const SYSTEM_PROMPT = `You are the creative director for an ad-video generator aimed at product/e-commerce ads (think fast-paced TikTok/Instagram/Facebook ads).

Given a plain-language description of a product and the vibe the user wants, produce a structured ad script following this narrative arc: hook -> showcase -> benefits -> offer -> cta. You may omit "offer" if the user gave no discount/deal. Keep headlines short and punchy (under 8 words). Pick brand colors that fit the product's mood. Write a "voiceover" line for every scene that sounds natural when read aloud by a narrator - together they should flow as one continuous script across the whole ad, like a single voice actor reading straight through.

Also pick the narrator voice that best fits the product's vibe, from this list:
${VOICE_GUIDE}

Always call the emit_ad_script tool with your result.`;

export type GeneratedAd = {
	script: AdScript;
	voiceId: string;
	voiceName: string;
};

export const generateAdScript = async (
	description: string,
): Promise<GeneratedAd> => {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error(
			'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.',
		);
	}

	const client = new Anthropic({apiKey});

	const message = await client.messages.create({
		model: 'claude-opus-5',
		max_tokens: 8000,
		thinking: {type: 'adaptive'},
		output_config: {effort: 'medium'},
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: `Example of the expected shape (for a coffee maker, do not copy the content):\n${JSON.stringify(sampleScript, null, 2)}\n\nNow write a new ad script for this product/description:\n${description}`,
			},
		],
		tools: [
			{
				name: 'emit_ad_script',
				description: 'Emit the structured ad script.',
				input_schema: SCRIPT_TOOL_SCHEMA,
			},
		],
		tool_choice: {type: 'tool', name: 'emit_ad_script'},
	});

	if (message.stop_reason === 'refusal') {
		throw new Error(
			`Claude declined to generate this ad script (${message.stop_details?.category ?? 'policy'}). Try rephrasing the description.`,
		);
	}

	const toolUse = message.content.find((block) => block.type === 'tool_use');
	if (!toolUse || toolUse.type !== 'tool_use') {
		throw new Error('Claude did not return a structured script.');
	}

	const input = toolUse.input as {voice?: string};
	const voiceName = input.voice ?? DEFAULT_VOICE_NAME;

	return {
		script: adScriptSchema.parse(toolUse.input),
		voiceId: getVoiceIdByName(voiceName),
		voiceName,
	};
};
