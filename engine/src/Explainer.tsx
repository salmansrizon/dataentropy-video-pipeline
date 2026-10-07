import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {EASE, enter, kf, parseMarked, spaced} from './core';
import {BRAND, C, FONT, LOGO_FONT, layout, timeline} from './brand';
import type {Content, Format, Layout, Timeline, Words} from './brand';

// ---------------------------------------------------------------------------
// The shell every video shares: background, the camera over the video's own
// world, headline, captions, voice and music, and the logo outro. A video
// supplies its content.json, its words.json (from the voice step), a camera
// track and a function that draws its world for a frame.
// ---------------------------------------------------------------------------

type Shell = {content: Content; t: Timeline; L: Layout};

// Headline: left-aligned, masked reveal line by line, *words* in the brand accent.
const Headline: React.FC<Shell & {f: number}> = ({content, t, L, f}) => (
	<>
		{content.scenes.map((sc, i) => {
			if (!sc.headline) return null;
			const [a, b] = [t.S[i], t.sceneEnd(i)];
			const out = kf(f, [b - 8, b], [1, 0], EASE.in);
			if (f < a || out <= 0) return null;
			return (
				<g key={i} opacity={out}>
					{sc.headline.split('\n').map((line, li) => {
						const y = L.headlineY + li * 72;
						const rise = enter(f, [a + li * 4, a + 18 + li * 4], [74, 0]);
						return (
							<g key={li}>
								<clipPath id={`hl-${i}-${li}`}>
									<rect x={0} y={y - 62} width={L.W} height={80} />
								</clipPath>
								<text x={L.left} y={y + rise} clipPath={`url(#hl-${i}-${li})`} fontSize={L.headlinePx} fontWeight={700} fill={C.navy}>
									{parseMarked(line).map(({w, hl}, k) => (
										<tspan key={k} fill={hl ? C.violet : C.navy}>{spaced(w, k)}</tspan>
									))}
								</text>
							</g>
						);
					})}
				</g>
			);
		})}
	</>
);

// Captions: a navy bar in the lower safe area; each word lights up at the moment it is spoken.
const Captions: React.FC<Shell & {f: number}> = ({content, t, L, f}) => (
	<>
		{content.scenes.map((sc, i) => {
			const start = sc.voStart * t.FPS;
			const end = Math.min(t.sceneEnd(i) - 2, start + t.speech(i) * t.FPS + 18);
			const o = kf(f, [start - 4, start + 4, end - 6, end], [0, 1, 1, 0]);
			if (o <= 0) return null;
			const words = t.shown[i];
			const perLine = L.captionLines > 1 && words.length > 6 ? Math.ceil(words.length / 2) : words.length;
			const lines = [words.slice(0, perLine), words.slice(perLine)].filter((l) => l.length);
			const h = 34 + lines.length * 54;
			let n = 0;
			return (
				<g key={i} opacity={o}>
					<rect x={L.left} y={L.subBottom - h} width={L.right - L.left} height={h} rx={20} fill={C.navy} fillOpacity={0.88} />
					{lines.map((line, li) => (
						<text key={li} x={L.cx} y={L.subBottom - h + 56 + li * 54} fontSize={L.captionPx} fontWeight={600} textAnchor="middle">
							{line.map(({w, hl}, k) => {
								const at = start + t.wordTime(i, n++).start * t.FPS;
								return (
									<tspan key={k} fill={hl ? C.lavender : '#fff'} fillOpacity={enter(f, [at - 2, at + 6], [0.25, 1])}>
										{spaced(w, k)}
									</tspan>
								);
							})}
						</text>
					))}
				</g>
			);
		})}
	</>
);

const LOGO = {barW: 66, gap: 22, heights: [96, 156, 212, 276], wordSize: 104};

// Outro: logo bars grow left to right, then the wordmark, tagline and one call to action.
const Outro: React.FC<Shell & {f: number}> = ({content, t, L, f}) => {
	const a = t.S[t.S.length - 1];
	if (f < a) return null;
	const {barW, gap, heights} = LOGO;
	const symbolW = heights.length * barW + (heights.length - 1) * gap;
	const left = L.cx - symbolW / 2;
	const base = L.H / 2 - (L.H > L.W ? 260 : 150); // the block of logo, tagline and button sits around the middle
	const top = base - heights[heights.length - 1];
	const word = enter(f, [a + 46, a + 66], [0, 1]);
	const glow = kf(f, [a + 60, a + 69, a + 78], [0, 1, 0.35]);
	const tag = enter(f, [a + 60, a + 76], [0, 1]);
	const cta = enter(f, [a + 70, a + 88], [0, 1]);
	const arrow = kf(f, [a + 84, a + 102], [0, 10], EASE.inOut);
	const mark = BRAND.name.indexOf(BRAND.highlight);
	const label = content.brand?.cta ?? BRAND.cta;
	const button = Math.max(520, label.length * 21 + 170);
	return (
		<g>
			<linearGradient id="logoBars" gradientUnits="userSpaceOnUse" x1={left} y1={top} x2={left + symbolW} y2={base}>
				<stop offset="0" stopColor={C.lavender} />
				<stop offset="0.55" stopColor={C.purple} />
				<stop offset="1" stopColor={C.violet} />
			</linearGradient>
			<g filter={glow > 0.05 ? 'url(#glow)' : undefined}>
				{heights.map((bh, k) => {
					const g = enter(f, [a + 16 + k * 7, a + 34 + k * 7], [0, 1]);
					const h = Math.max(barW * g, bh * g); // grows from a rounded stub
					return <rect key={k} x={left + k * (barW + gap)} y={base - h} width={barW} height={h} rx={barW / 2} fill="url(#logoBars)" opacity={g > 0 ? 1 : 0} />;
				})}
			</g>
			<clipPath id="wordmark">
				<rect x={L.cx - 400} y={base + 22} width={800 * word} height={150} />
			</clipPath>
			<text x={L.cx} y={base + 132} clipPath="url(#wordmark)" fontFamily={LOGO_FONT} fontSize={LOGO.wordSize} fontWeight={700} textAnchor="middle" fill={C.navy} letterSpacing={-1}>
				{mark < 0 ? BRAND.name : <>{BRAND.name.slice(0, mark)}<tspan fill={C.purple}>{BRAND.highlight}</tspan>{BRAND.name.slice(mark + 1)}</>}
			</text>
			<clipPath id="tagline">
				<rect x={L.cx - 400} y={base + 190} width={800 * tag} height={70} />
			</clipPath>
			<text x={L.cx} y={base + 235} clipPath="url(#tagline)" fontSize={34} fontWeight={500} textAnchor="middle" fill={C.muted}>{content.brand?.tagline ?? BRAND.tagline}</text>
			<g opacity={cta}>
				<rect x={L.cx - button / 2} y={base + 300} width={button} height={100} rx={20} fill={C.violet} filter="url(#soft)" />
				<text x={L.cx - 26} y={base + 363} fontSize={38} fontWeight={600} textAnchor="middle" fill="#fff">{label}</text>
				<text x={L.cx + button / 2 - 60 + arrow} y={base + 363} fontSize={38} fontWeight={600} textAnchor="middle" fill="#fff">→</text>
			</g>
		</g>
	);
};

export type ExplainerProps = {
	content: Content;
	words: Words;
	/** Camera over the world for a frame: world point (x, y) is centred in the content zone at scale s. */
	camera: (f: number) => {x: number; y: number; s: number};
	/** Draws the video's world for a frame, in world coordinates. */
	world: (f: number) => React.ReactNode;
	/** Set false for a video with no music bed. */
	music?: boolean;
};

export const Explainer: React.FC<ExplainerProps> = ({content, words, camera, world, music = true}) => {
	const f = useCurrentFrame();
	const L = layout((content.format ?? '9:16') as Format);
	const t = timeline(content, words);
	const shell = {content, t, L};
	const base = camera(f);
	// A slow breathing zoom (6 s sine loop) keeps a held frame from looking frozen while the narrator talks.
	const cam = {...base, s: base.s * (1 + 0.015 * Math.sin((f / 180) * 2 * Math.PI))};
	const last = t.S[t.S.length - 1];
	const rest = kf(f, [last, last + 12], [1, 0], EASE.in); // the world leaves before the logo
	return (
		<AbsoluteFill style={{backgroundColor: C.background, fontFamily: FONT}}>
			<svg width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} style={{fontFamily: FONT}}>
				<defs>
					<filter id="soft" x="-30%" y="-30%" width="160%" height="170%">
						<feDropShadow dx="0" dy="10" stdDeviation="14" floodColor={C.violet} floodOpacity="0.1" />
					</filter>
					<filter id="glow" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
						<feDropShadow dx="0" dy="0" stdDeviation="12" floodColor={C.violet} floodOpacity="0.35" />
					</filter>
					<pattern id="dots" width={48} height={48} patternUnits="userSpaceOnUse">
						<circle cx={24} cy={24} r={2} fill={C.grid} />
					</pattern>
					{/* The world fades out under the headline and caption zones. */}
					<linearGradient id="worldFade" x1="0" y1="0" x2="0" y2={L.H} gradientUnits="userSpaceOnUse">
						<stop offset={(L.worldTop - 60) / L.H} stopColor="#fff" stopOpacity={0} />
						<stop offset={L.worldTop / L.H} stopColor="#fff" />
						<stop offset={L.worldBottom / L.H} stopColor="#fff" />
						<stop offset={(L.worldBottom + 50) / L.H} stopColor="#fff" stopOpacity={0} />
					</linearGradient>
					<mask id="worldMask" maskUnits="userSpaceOnUse" x={0} y={0} width={L.W} height={L.H}>
						<rect width={L.W} height={L.H} fill="url(#worldFade)" />
					</mask>
					<radialGradient id="lavGlow" cx="0.85" cy="0.1" r="0.7">
						<stop offset="0" stopColor={C.lavender} stopOpacity={0.35} />
						<stop offset="1" stopColor={C.lavender} stopOpacity={0} />
					</radialGradient>
				</defs>
				<rect width={L.W} height={L.H} fill="url(#lavGlow)" />
				{rest > 0 && (
					<g mask="url(#worldMask)" opacity={rest}>
						<g transform={`translate(${L.cx - cam.x * cam.s} ${L.cy - cam.y * cam.s}) scale(${cam.s})`}>
							<rect x={-3000} y={-3000} width={8000} height={8000} fill="url(#dots)" />
							{world(f)}
						</g>
					</g>
				)}
				<Outro {...shell} f={f} />
				<Headline {...shell} f={f} />
				<Captions {...shell} f={f} />
			</svg>
			{content.scenes.map((sc, i) => (
				<Sequence key={i} from={Math.round(sc.voStart * t.FPS)}>
					<Audio src={staticFile(`vo/scene-${i + 1}.wav`)} />
				</Sequence>
			))}
			{music && <Audio src={staticFile('music.wav')} />}
		</AbsoluteFill>
	);
};
