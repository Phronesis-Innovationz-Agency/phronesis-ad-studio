import React from 'react';
import {Composition} from 'remotion';
import {ProductAd, getTotalDurationInFrames} from './templates/ProductAd';
import {adScriptSchema, DIMENSIONS, FPS} from './schema/adScript';
import {sampleScript} from './sampleScript';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="ProductAd"
				component={ProductAd}
				durationInFrames={getTotalDurationInFrames(sampleScript)}
				fps={FPS}
				width={DIMENSIONS[sampleScript.aspectRatio].width}
				height={DIMENSIONS[sampleScript.aspectRatio].height}
				schema={adScriptSchema}
				defaultProps={sampleScript}
				calculateMetadata={async ({props}) => {
					const parsed = adScriptSchema.parse(props);
					const dims = DIMENSIONS[parsed.aspectRatio];
					return {
						durationInFrames: getTotalDurationInFrames(parsed),
						width: dims.width,
						height: dims.height,
					};
				}}
			/>
		</>
	);
};
