import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {AdScript} from './schema/adScript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const renderAd = async (script: AdScript, outputPath: string) => {
	const entryPoint = path.join(__dirname, 'index.ts');

	const bundleLocation = await bundle({entryPoint});

	const composition = await selectComposition({
		serveUrl: bundleLocation,
		id: 'ProductAd',
		inputProps: script,
	});

	await renderMedia({
		composition,
		serveUrl: bundleLocation,
		codec: 'h264',
		outputLocation: outputPath,
		inputProps: script,
	});

	return outputPath;
};
