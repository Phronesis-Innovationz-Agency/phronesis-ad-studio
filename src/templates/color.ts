// Lightens (positive percent) or darkens (negative) a #rrggbb color. Used to
// build a gradient/glow background from just the two brand colors the AI (or
// a user) already picked, instead of needing a second designed asset.
export const shadeColor = (hex: string, percent: number): string => {
	const num = parseInt(hex.replace('#', ''), 16);
	const clamp = (value: number) => Math.max(0, Math.min(255, value));

	const r = clamp(((num >> 16) & 0xff) + Math.round(2.55 * percent));
	const g = clamp(((num >> 8) & 0xff) + Math.round(2.55 * percent));
	const b = clamp((num & 0xff) + Math.round(2.55 * percent));

	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
