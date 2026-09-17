import React from 'react';
import {
	AbsoluteFill,
	Audio,
	Img,
	Loop,
	OffthreadVideo,
	Sequence,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {AdScript, Scene, FPS} from '../schema/adScript';
import {shadeColor} from './color';

// Plays under the whole ad (all scenes at once, not per-scene like the
// voiceover), looped seamlessly - musicDurationInSeconds is the track's real
// length, measured up front by the pipeline so Loop knows exactly how long
// one cycle is. Kept quiet and faded at both ends so it sits behind the
// narration rather than competing with it.
// Adjust this to change how loud the background music sits under narration
// across every rendered ad. Tuned by ear against the showcase demo (ffmpeg
// mixdown, not this exact code path - ElevenLabs quota is exhausted so this
// hasn't been confirmed through an actual render yet; re-check once it has).
const MUSIC_VOLUME = 0.08;

// Boosts the spokesperson's narration above its recorded level (1.0 = as
// recorded). Remotion doesn't enforce an upper cap on this value, so
// "maximum" isn't a hard ceiling in the API - it's set here to the highest
// practical value before the boost itself becomes the problem: ElevenLabs'
// output already sits close to full scale, so much beyond this clips/
// distorts rather than getting louder. Confirm by ear once ElevenLabs quota
// is back and a real render can be heard; pull back if it sounds harsh.
const NARRATION_VOLUME = 2.0;

const BackgroundMusic: React.FC<{musicFile: string; musicDurationInSeconds: number}> = ({
	musicFile,
	musicDurationInSeconds,
}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const loopFrames = Math.max(1, Math.round(musicDurationInSeconds * FPS));

	const fadeIn = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<Loop durationInFrames={loopFrames}>
			<Audio src={staticFile(musicFile)} volume={MUSIC_VOLUME * Math.min(fadeIn, fadeOut)} />
		</Loop>
	);
};

// A full-body animated mascot - a friendly fox-like character, not a
// photorealistic or real-person avatar. Deliberately drawn from simple
// shapes so there's no possibility of it resembling any actual individual.
//
// It stands beside the (centered) text rather than below it, walks in from
// off-screen at the start of each scene, points its inner arm toward the
// text, and glances between the text and the viewer on a timer - all to
// read as an expressive presenter rather than a static logo. Its outer arm
// sways gently and its mouth opens/closes along the scene's mouthEnvelope
// (the narration's amplitude curve) for a believable "talking" impression,
// without any lip-sync ML model.
//
// The artwork is authored once, "facing" with its pointing arm on the local
// right - when placed on the right half of the frame it's mirrored so that
// arm (and its gaze) always points back in toward the centered text.
const Spokesperson: React.FC<{
	brand: AdScript['brand'];
	mouthEnvelope?: number[];
	side: 'left' | 'right';
}> = ({brand, mouthEnvelope, side}) => {
	const frame = useCurrentFrame();
	const mouthOpen = mouthEnvelope?.[frame] ?? 0;

	const blinkCycle = frame % 75;
	const isBlinking = blinkCycle < 3;
	const eyeRy = isBlinking ? 1.5 : 13;

	// Walks in from further outside the frame over the first ~0.7s of the
	// scene, taking little steps, then settles into an idle stance.
	const walkInFrames = 20;
	const walkProgress = interpolate(frame, [0, walkInFrames], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const isWalking = frame < walkInFrames;
	const slideInPx = (1 - walkProgress) * -140;
	const stepBob = isWalking ? Math.sin(frame * 1.4) * 10 : 0;
	const legSwing = isWalking ? Math.sin(frame * 1.4) * 16 : 0;

	const bob = Math.sin(frame / 14) * 4 + (isWalking ? Math.abs(stepBob) * 0.3 : 0);

	// Outer arm: idle sway. Inner arm: points toward the centered text, with
	// a small idle wiggle so the pointing gesture still feels alive.
	const outerArmAngle = -18 + Math.sin(frame / 16) * 10;
	const innerArmAngle = -55 + Math.sin(frame / 20) * 4;
	const mouthRy = 5 + mouthOpen * 26;

	// Glances toward the text, then toward the viewer, on a repeating timer.
	const lookCycle = frame % 100;
	const eyeShift = interpolate(
		lookCycle,
		[0, 5, 35, 40, 95, 100],
		[0, 0, 0, 8, 8, 0],
		{extrapolateRight: 'clamp'},
	);

	return (
		<div
			style={{
				position: 'absolute',
				[side]: '3%',
				top: '50%',
				// Sized off frame *width*, not height - a height-based size
				// would blow past the frame's width entirely on a narrow 9:16
				// canvas. This keeps it inside its side of the frame across
				// every aspect ratio, beside the (narrower) centered text.
				width: '27%',
				aspectRatio: '3 / 4',
				transform: `translateY(calc(-50% + ${bob}px))`,
			}}
		>
			<svg
				viewBox="0 0 300 400"
				width="100%"
				height="100%"
				style={{
					transform: `scaleX(${side === 'right' ? -1 : 1}) translateX(${side === 'right' ? -slideInPx : slideInPx}px)`,
				}}
			>
				{/* tail */}
				<ellipse cx="235" cy="310" rx="30" ry="50" fill={brand.secondaryColor} transform="rotate(35 235 310)" />

				{/* legs, stepping while walking in */}
				<ellipse cx="120" cy={385 + legSwing * 0.3} rx="24" ry="14" fill={brand.secondaryColor} />
				<ellipse cx="180" cy={385 - legSwing * 0.3} rx="24" ry="14" fill={brand.secondaryColor} />

				{/* body */}
				<rect x="88" y="205" width="124" height="165" rx="58" fill={brand.secondaryColor} />
				<ellipse cx="150" cy="300" rx="40" ry="50" fill="rgba(255,255,255,0.35)" />

				{/* outer arm: idle sway */}
				<g transform={`rotate(${outerArmAngle} 95 235)`}>
					<ellipse cx="95" cy="270" rx="20" ry="55" fill={brand.secondaryColor} />
				</g>

				{/* inner arm: points toward the text */}
				<g transform={`rotate(${innerArmAngle} 205 235)`}>
					<ellipse cx="205" cy="270" rx="18" ry="55" fill={brand.secondaryColor} />
				</g>

				{/* ears */}
				<path d="M 90 90 L 60 5 L 130 65 Z" fill={brand.secondaryColor} />
				<path d="M 210 90 L 240 5 L 170 65 Z" fill={brand.secondaryColor} />
				<path d="M 92 78 L 74 25 L 118 60 Z" fill="rgba(255,255,255,0.35)" />
				<path d="M 208 78 L 226 25 L 182 60 Z" fill="rgba(255,255,255,0.35)" />

				{/* head */}
				<circle cx="150" cy="145" r="105" fill={brand.secondaryColor} />

				{/* muzzle */}
				<ellipse cx="150" cy="180" rx="55" ry="42" fill="rgba(255,255,255,0.35)" />

				{/* eyes - shift toward the text, then back to the viewer */}
				<ellipse cx={110 + eyeShift} cy="128" rx="12" ry={eyeRy} fill="#20212b" />
				<ellipse cx={190 + eyeShift} cy="128" rx="12" ry={eyeRy} fill="#20212b" />

				{/* nose */}
				<path d="M 138 158 L 162 158 L 150 172 Z" fill="#20212b" />

				{/* mouth */}
				<ellipse cx="150" cy="188" rx="26" ry={mouthRy} fill="#20212b" />
			</svg>
		</div>
	);
};

const SceneFrame: React.FC<{
	scene: Scene;
	brand: AdScript['brand'];
	spokesperson: boolean;
	spokespersonSide: 'left' | 'right';
}> = ({scene, brand, spokesperson, spokespersonSide}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();

	const entrance = spring({frame, fps: FPS, config: {damping: 200}});
	const exitStart = durationInFrames - 12;
	const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const opacity = Math.min(entrance, exit);
	const translateY = interpolate(entrance, [0, 1], [40, 0]);

	const glowColor = shadeColor(brand.secondaryColor, 10);

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(120% 90% at 22% 15%, ${shadeColor(brand.primaryColor, 14)} 0%, ${brand.primaryColor} 55%, ${shadeColor(brand.primaryColor, -10)} 100%)`,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 80,
			}}
		>
			{scene.audioFile ? <Audio src={staticFile(scene.audioFile)} volume={NARRATION_VOLUME} /> : null}

			{!scene.imageFile ? (
				<AbsoluteFill style={{overflow: 'hidden'}}>
					<div
						style={{
							position: 'absolute',
							width: '55%',
							aspectRatio: '1 / 1',
							left: '-15%',
							top: '-10%',
							borderRadius: '50%',
							background: glowColor,
							opacity: 0.16,
							filter: 'blur(60px)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							width: '65%',
							aspectRatio: '1 / 1',
							right: '-20%',
							bottom: '-15%',
							borderRadius: '50%',
							background: glowColor,
							opacity: 0.14,
							filter: 'blur(70px)',
						}}
					/>
				</AbsoluteFill>
			) : null}

			{scene.imageFile ? (
				<AbsoluteFill>
					<Img
						src={staticFile(scene.imageFile)}
						style={{width: '100%', height: '100%', objectFit: 'cover'}}
					/>
					<AbsoluteFill style={{backgroundColor: 'rgba(0, 0, 0, 0.55)'}} />
				</AbsoluteFill>
			) : null}

			{!scene.imageFile && scene.videoFile ? (
				<AbsoluteFill>
					<OffthreadVideo
						src={staticFile(scene.videoFile)}
						muted
						style={{width: '100%', height: '100%', objectFit: 'cover'}}
					/>
					<AbsoluteFill style={{backgroundColor: 'rgba(0, 0, 0, 0.55)'}} />
				</AbsoluteFill>
			) : null}

			{spokesperson ? (
				<Spokesperson
					brand={brand}
					mouthEnvelope={scene.mouthEnvelope}
					side={spokespersonSide}
				/>
			) : null}

			<div
				style={{
					opacity,
					transform: `translateY(${translateY}px)`,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 24,
					textAlign: 'center',
					maxWidth: spokesperson ? '58%' : undefined,
				}}
			>
				<h1
					style={{
						fontFamily: 'Arial, sans-serif',
						fontWeight: 800,
						fontSize: scene.type === 'hook' ? 88 : 64,
						color: '#ffffff',
						margin: 0,
						lineHeight: 1.1,
					}}
				>
					{scene.headline}
				</h1>

				{scene.subtext ? (
					<p
						style={{
							fontFamily: 'Arial, sans-serif',
							fontSize: 36,
							color: brand.secondaryColor,
							margin: 0,
							fontWeight: 600,
						}}
					>
						{scene.subtext}
					</p>
				) : null}

				{scene.bullets ? (
					<ul
						style={{
							listStyle: 'none',
							padding: 0,
							margin: 0,
							display: 'flex',
							flexDirection: 'column',
							gap: 16,
						}}
					>
						{scene.bullets.map((bullet, i) => {
							const bulletDelay = i * 6;
							const bulletSpring = spring({
								frame: frame - bulletDelay,
								fps: FPS,
								config: {damping: 200},
							});
							return (
								<li
									key={bullet}
									style={{
										opacity: bulletSpring,
										transform: `translateX(${interpolate(bulletSpring, [0, 1], [-30, 0])}px)`,
										fontFamily: 'Arial, sans-serif',
										fontSize: 40,
										color: '#ffffff',
										fontWeight: 600,
									}}
								>
									✓ {bullet}
								</li>
							);
						})}
					</ul>
				) : null}

				{scene.type === 'cta' ? (
					<div
						style={{
							marginTop: 16,
							padding: '20px 48px',
							borderRadius: 999,
							backgroundColor: brand.secondaryColor,
							color: '#111111',
							fontFamily: 'Arial, sans-serif',
							fontWeight: 800,
							fontSize: 40,
							transform: `scale(${1 + Math.sin(frame / 6) * 0.03})`,
						}}
					>
						{brand.name}
					</div>
				) : null}
			</div>
		</AbsoluteFill>
	);
};

export const ProductAd: React.FC<AdScript> = (script) => {
	let startFrame = 0;

	return (
		<AbsoluteFill>
			{script.scenes.map((scene, index) => {
				const durationInFrames = Math.round(scene.durationInSeconds * FPS);
				const sequence = (
					<Sequence
						key={`${scene.type}-${startFrame}`}
						from={startFrame}
						durationInFrames={durationInFrames}
					>
						<SceneFrame
							scene={scene}
							brand={script.brand}
							spokesperson={script.spokesperson}
							spokespersonSide={index % 2 === 0 ? 'left' : 'right'}
						/>
					</Sequence>
				);
				startFrame += durationInFrames;
				return sequence;
			})}

			{script.musicFile && script.musicDurationInSeconds ? (
				<BackgroundMusic
					musicFile={script.musicFile}
					musicDurationInSeconds={script.musicDurationInSeconds}
				/>
			) : null}

			{script.watermark ? (
				<AbsoluteFill
					style={{
						justifyContent: 'flex-start',
						alignItems: 'center',
						paddingTop: 36,
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							fontFamily: 'Arial, sans-serif',
							fontWeight: 700,
							fontSize: 22,
							color: 'rgba(255, 255, 255, 0.55)',
							textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
							letterSpacing: 0.5,
						}}
					>
						Made with Phronesis Ad Studio
					</div>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};

export const getTotalDurationInFrames = (script: AdScript) =>
	script.scenes.reduce(
		(total, scene) => total + Math.round(scene.durationInSeconds * FPS),
		0,
	);
