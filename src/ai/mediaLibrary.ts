import fs from 'node:fs/promises';
import path from 'node:path';
import {parseFile} from 'music-metadata';

// Founder-curated stock backgrounds (public/library/{images,videos,music}) -
// see public/library/README.md. Picking is random since there's no way to
// know which stock asset actually fits an arbitrary ad's subject; it's meant
// as "better than nothing", not a smart match.
const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a']);

const listFiles = async (subdir: string, allowedExtensions: Set<string>): Promise<string[]> => {
	const dir = path.join(LIBRARY_DIR, subdir);
	let entries: string[];
	try {
		entries = await fs.readdir(dir);
	} catch {
		return [];
	}
	return entries.filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()));
};

const pickRandom = <T>(items: T[]): T | undefined =>
	items.length > 0 ? items[Math.floor(Math.random() * items.length)] : undefined;

export const pickLibraryImage = async (): Promise<string | undefined> => {
	const files = await listFiles('images', IMAGE_EXTENSIONS);
	const file = pickRandom(files);
	return file ? `library/images/${file}` : undefined;
};

export const pickLibraryVideo = async (): Promise<string | undefined> => {
	const files = await listFiles('videos', VIDEO_EXTENSIONS);
	const file = pickRandom(files);
	return file ? `library/videos/${file}` : undefined;
};

export type LibraryMusic = {
	file: string;
	durationInSeconds: number;
};

export const pickLibraryMusic = async (): Promise<LibraryMusic | undefined> => {
	const files = await listFiles('music', AUDIO_EXTENSIONS);
	const file = pickRandom(files);
	if (!file) {
		return undefined;
	}

	const absolutePath = path.join(LIBRARY_DIR, 'music', file);
	const metadata = await parseFile(absolutePath);
	const durationInSeconds = metadata.format.duration ?? 0;
	if (durationInSeconds <= 0) {
		return undefined;
	}

	return {file: `library/music/${file}`, durationInSeconds};
};
