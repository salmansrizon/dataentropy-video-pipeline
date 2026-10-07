import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import content from './content.json';
import voTiming from './vo-timing.json';

// How a neural network learns to spot spam. Editable text/timing: content.json. vo-timing.json: `npm run srt`.
// Motion (motion-design skill): EASE.out = enters, EASE.inOut = on-screen moves and camera,
// EASE.in = permanent exits, EASE.linear = typing. Lines are navy/violet/purple >= 4px;
// lavender is only a fill or glow (1.7:1 on white, too light for lines).

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']});
const FONT = `${fontFamily}, Arial, sans-serif`;
const LOGO_FONT = `${loadPoppins('normal', {weights: ['700'], subsets: ['latin']}).fontFamily}, ${FONT}`;

const C = content.colors;
const FPS = content.fps;
const END = content.durationSeconds * FPS;
const S = content.scenes.map((s) => Math.round(s.start * FPS));
const sceneEnd = (i: number) => (i + 1 < S.length ? S[i + 1] : END);
const SAFE = {left: 76, right: 1004};
const SUB_BOTTOM = 1560;

type Ease = (t: number) => number;
const EASE = {
	out: Easing.bezier(0.22, 1, 0.36, 1),
	inOut: Easing.bezier(0.645, 0.045, 0.355, 1),
	in: Easing.bezier(0.55, 0.055, 0.675, 0.19),
	linear: (t: number) => t,
};
const kf = (f: number, frames: number[], values: number[], easing: Ease | Ease[] = EASE.inOut) => {
	if (f <= frames[0]) return values[0];
	const i = frames.findIndex((_, k) => k + 1 < frames.length && f < frames[k + 1]);
	if (i < 0) return values[values.length - 1];
	const e = Array.isArray(easing) ? easing[i] : easing;
	return values[i] + (values[i + 1] - values[i]) * e((f - frames[i]) / (frames[i + 1] - frames[i]));
};
const enter = (f: number, frames: number[], values: number[]) => kf(f, frames, values, EASE.out);
const exit = (f: number, frames: number[], values: number[]) => kf(f, frames, values, EASE.in);
const mixColor = (a: string, b: string, t: number) => {
	const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const parseMarked = (s: string) =>
	s.split(/(\*[^*]+\*)/).flatMap((part) => {
		const hl = part.startsWith('*');
		return part.replaceAll('*', '').split(/\s+/).filter(Boolean).map((w) => ({w, hl}));
	});
const spaced = (w: string, k: number) => (k > 0 && !/^[?.,!:;]/.test(w) ? ' ' : '') + w;

// ---------------------------------------------------------------------------
// Layout (world coordinates; the camera only zooms softly around WORLD_CENTER)
// ---------------------------------------------------------------------------
const WORLD_CENTER = {x: 540, y: 900};
const CARD = {x: 110, y: 420, w: 860, h: 100};
const INPUT = {x: 360, r: 46, y: [760, 900, 1040]};
const HIDDEN = {x: 620, r: 42, y: [690, 830, 970, 1110]};
const OUT = {x: 870, y: 900, r: 58};
const ANSWER = {x: 690, y: 1150, w: 310, h: 70};
const CAPTION_Y = 1330;
const W0 = content.weightsBefore; // rows 0-2: input i -> hidden j; row 3: hidden j -> output
const W1 = content.weightsAfter;

const camera = (f: number) => kf(f, [S[1] + 90, S[1] + 140, S[5], S[5] + 30], [1, 0.96, 0.96, 0.9]);
// Training morphs the weights; stroke width shows each weight.
const weightT = (f: number) => kf(f, [S[3] + 80, S[3] + 120], [0, 1]);
const weight = (f: number, row: number, j: number) => W0[row][j] + (W1[row][j] - W0[row][j]) * weightT(f);
const score = (f: number) =>
	Math.round(kf(f, [S[4] + 10, S[4] + 95], [content.scoreBefore, content.scoreAfter], EASE.linear));

// All connections: [x1, y1, x2, y2, row, j].
const LINKS: number[][] = [
	...INPUT.y.flatMap((iy, i) => HIDDEN.y.map((hy, j) => [INPUT.x, iy, HIDDEN.x, hy, i, j])),
	...HIDDEN.y.map((hy, j) => [HIDDEN.x, hy, OUT.x, OUT.y, 3, j]),
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

// The email being judged; pinned above the network. In scene 5 it flips through training examples.
const EmailCard: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[0] + 5, S[0] + 22], [0, 1]);
	const dy = enter(f, [S[0] + 5, S[0] + 22], [24, 0]);
	const a = S[4] + 10;
	const slot = Math.floor((f - a) / 14);
	const flipping = f >= a && slot < content.examples.length;
	const final = f >= a + content.examples.length * 14;
	const text = final ? content.variant : flipping ? content.examples[slot] : content.email;
	const local = f >= a ? (f - a) % 14 : 99;
	const sy = (flipping || (final && f < a + content.examples.length * 14 + 4)) && local < 4 ? enter(f, [f - local, f - local + 4], [0.2, 1]) : 1;
	return (
		<g opacity={o} transform={`translate(0 ${dy + CARD.y + CARD.h / 2}) scale(1 ${sy}) translate(0 ${-(CARD.y + CARD.h / 2)})`}>
			<rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={18} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#soft)" />
			<rect x={CARD.x + 28} y={CARD.y + 30} width={56} height={40} rx={6} fill="none" stroke={C.navy} strokeWidth={4} />
			<path d={`M ${CARD.x + 28} ${CARD.y + 32} l 28 20 l 28 -20`} fill="none" stroke={C.navy} strokeWidth={4} strokeLinejoin="round" />
			<text x={CARD.x + 110} y={CARD.y + 62} fontSize={34} fontWeight={600} fill={C.text}>{text}</text>
		</g>
	);
};

// Scene 1: a small envelope rides a violet arrow into the Spam folder.
const SpamFolder: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[0] + 25, S[0] + 40], [0, 1]) * exit(f, [S[1] + 5, S[1] + 18], [1, 0]);
	if (o <= 0) return null;
	const draw = enter(f, [S[0] + 30, S[0] + 50], [0, 1]);
	const t = kf(f, [S[0] + 50, S[0] + 75], [0, 1]);
	const [x0, y0, cx, cy, x1, y1] = [700, 530, 760, 640, 800, 700];
	const ex = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1;
	const ey = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
	const pop = kf(f, [S[0] + 72, S[0] + 78, S[0] + 90], [0, 1, 0]);
	return (
		<g opacity={o}>
			<path d={`M ${x0} ${y0} Q ${cx} ${cy}, ${x1} ${y1}`} fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round"
				pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
			<g transform={`translate(820 760) scale(${1 + pop * 0.06})`}>
				<path d="M -90 -40 L -40 -40 L -25 -58 L 90 -58 L 90 50 L -90 50 Z" fill={C.lavenderTint} stroke={C.navy} strokeWidth={5} strokeLinejoin="round" />
				<text y={20} fontSize={34} fontWeight={700} textAnchor="middle" fill={C.navy}>Spam</text>
			</g>
			<g opacity={t > 0 && t < 1 ? 1 : 0} transform={`translate(${ex} ${ey}) scale(${1 - t * 0.4})`}>
				<rect x={-28} y={-20} width={56} height={40} rx={6} fill={C.card} stroke={C.violet} strokeWidth={4} />
				<path d="M -28 -18 l 28 20 l 28 -20" fill="none" stroke={C.violet} strokeWidth={4} strokeLinejoin="round" />
			</g>
		</g>
	);
};

// Scene 2: hand-written rules pile up faster and faster, then slide away; a new scam slips past.
const RULE_T = [10, 28, 40, 48, 54];
const RuleCards: React.FC<{f: number}> = ({f}) => {
	const out = exit(f, [S[1] + 75, S[1] + 95], [0, 1]);
	if (out >= 1) return null;
	return (
		<g transform={`translate(${-500 * out} 0) rotate(${-8 * out} 330 780)`} opacity={1 - out}>
			{content.rules.map((r, k) => {
				const a = S[1] + RULE_T[k];
				const o = enter(f, [a, a + 12], [0, 1]);
				const dy = enter(f, [a, a + 12], [24, 0]);
				return (
					<g key={k} opacity={o} transform={`translate(0 ${dy})`}>
						<rect x={110} y={600 + k * 78} width={440} height={64} rx={14} fill={C.card} stroke={C.navy} strokeWidth={4} />
						<text x={134} y={643 + k * 78} fontSize={32} fontWeight={600} fill={C.navy}>{r}</text>
					</g>
				);
			})}
		</g>
	);
};

const VariantCard: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[1] + 40, S[1] + 58], [0, 1]) * exit(f, [S[1] + 95, S[1] + 108], [1, 0]);
	if (o <= 0) return null;
	const dx = enter(f, [S[1] + 40, S[1] + 58], [60, 0]);
	const q = enter(f, [S[1] + 60, S[1] + 74], [0, 1]);
	const [first, ...rest] = content.variant.split(', ');
	return (
		<g opacity={o} transform={`translate(${dx} 0)`}>
			<rect x={600} y={650} width={370} height={120} rx={16} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#soft)" />
			<text x={630} y={700} fontSize={32} fontWeight={600} fill={C.text}>{first},</text>
			<text x={630} y={745} fontSize={32} fontWeight={600} fill={C.text}>{rest.join(', ')}</text>
			<text x={930} y={640} fontSize={96} fontWeight={800} textAnchor="middle" fill={C.violet} opacity={q}
				transform={`translate(930 610) scale(${0.96 + 0.04 * q}) translate(-930 -610)`}>?</text>
		</g>
	);
};

// The network: connections (width = weight), neurons, forward and backward pulses.
const Network: React.FC<{f: number}> = ({f}) => {
	const draw = enter(f, [S[1] + 100, S[1] + 130], [0, 1]);
	if (draw <= 0) return null;
	const grow = kf(f, [S[2] + 30, S[2] + 60], [0, 1]); // uniform outline -> weighted widths
	const act = (j: number) => enter(f, [S[2] + 90 + j * 4, S[2] + 108 + j * 4], [0, content.activation[j]]);
	const verdict = enter(f, [S[4] + 120, S[4] + 135], [0, 1]);
	// Pulses: forward in scene 3 (and each example in scene 5), backward in scene 4.
	const pulse = (link: number[], p: number) => {
		const [x1, y1, x2, y2] = link;
		return {x: x1 + (x2 - x1) * p, y: y1 + (y2 - y1) * p};
	};
	const fwd1 = (f - (S[2] + 60)) / 30; // inputs -> hidden
	const fwd2 = (f - (S[2] + 100)) / 22; // hidden -> output
	const back = (f - (S[3] + 50)) / 50; // output -> inputs
	return (
		<g>
			{LINKS.map((l, k) => {
				const [x1, y1, x2, y2, row, j] = l;
				const w = 4 + weight(f, row, j) * 8 * grow;
				return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.navy} strokeWidth={w} strokeLinecap="round"
					pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />;
			})}
			{LINKS.map((l, k) => {
				const second = l[4] === 3;
				const ps = [second ? fwd2 : fwd1, back < 0 || back > 1 ? -1 : second ? back * 2 : back * 2 - 1].map((p, i) => (i === 1 ? 1 - p : p));
				return ps.map((p, i) => {
					if (p < 0 || p > 1 || (i === 1 && (back < 0 || back > 1))) return null;
					const {x, y} = pulse(l, p);
					return <circle key={`${k}-${i}`} cx={x} cy={y} r={11} fill={C.purple} />;
				});
			})}
			{HIDDEN.y.map((y, j) => (
				<g key={j}>
					<circle cx={HIDDEN.x} cy={y} r={HIDDEN.r + 18} fill={C.lavender} opacity={act(j) * 0.8} />
					<circle cx={HIDDEN.x} cy={y} r={HIDDEN.r} fill={C.card} stroke={C.navy} strokeWidth={5}
						pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
					<text x={HIDDEN.x} y={y + 16} fontSize={44} fontWeight={700} textAnchor="middle" fill={C.navy}
						opacity={enter(f, [S[2] + 84 + j * 4, S[2] + 96 + j * 4], [0, 1])}>+</text>
				</g>
			))}
			<circle cx={OUT.x} cy={OUT.y} r={OUT.r} fill={mixColor(C.card, C.lavenderTint, verdict)} stroke={C.violet} strokeWidth={6 + verdict * 2}
				pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} filter={verdict > 0.5 ? 'url(#glow)' : undefined} />
		</g>
	);
};

// Input neurons: the email's clues fly down from the card and become numbers.
const Inputs: React.FC<{f: number}> = ({f}) => {
	const draw = enter(f, [S[1] + 100, S[1] + 130], [0, 1]);
	if (draw <= 0) return null;
	return (
		<g>
			{INPUT.y.map((y, i) => {
				const [label, value] = content.clues[i] as [string, number];
				const a = S[2] + i * 5;
				const t = kf(f, [a, a + 30], [0, 1]);
				const cy = CARD.y + CARD.h - 10 + (y - (CARD.y + CARD.h - 10)) * t;
				const labelO = enter(f, [a + 20, a + 35], [0, 1]);
				return (
					<g key={i}>
						<circle cx={INPUT.x} cy={y} r={INPUT.r} fill={C.card} stroke={C.navy} strokeWidth={5}
							pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
						{t > 0 && (
							<g opacity={enter(f, [a, a + 8], [0, 1])}>
								<circle cx={INPUT.x} cy={cy} r={INPUT.r - 8} fill={C.lavenderTint} stroke={C.violet} strokeWidth={4} />
								<text x={INPUT.x} y={cy + 11} fontSize={32} fontWeight={700} textAnchor="middle" fill={C.navy}>{value}</text>
							</g>
						)}
						{label.split('\n').map((line, li, all) => (
							<text key={li} x={292} y={y + 11 + (li - (all.length - 1) / 2) * 36} fontSize={32} fontWeight={500} textAnchor="end" fill={C.navy} opacity={labelO}>
								{line}
							</text>
						))}
					</g>
				);
			})}
		</g>
	);
};

// Output score, the right answer, and the error gap between them.
const OutputPanel: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[2] + 120, S[2] + 138], [0, 1]);
	const verdict = enter(f, [S[4] + 120, S[4] + 135], [0, 1]);
	const ans = enter(f, [S[3] + 10, S[3] + 28], [0, 1]) * exit(f, [S[4] + 100, S[4] + 112], [1, 0]);
	const gap = enter(f, [S[3] + 30, S[3] + 50], [0, 1]) * kf(f, [S[4] + 10, S[4] + 95], [1, 0.12], EASE.linear);
	const gapTop = OUT.y + OUT.r + 92, gapBottom = ANSWER.y - 10;
	return (
		<g>
			<text x={OUT.x} y={OUT.y + OUT.r + 72} fontSize={34} fontWeight={700} textAnchor="middle" fill={C.navy} opacity={o * (1 - verdict)}>
				Spam: {score(f)}%
			</text>
			<text x={OUT.x} y={OUT.y + OUT.r + 72} fontSize={34} fontWeight={700} textAnchor="middle" fill={C.violet} opacity={verdict}>
				{content.verdict}
			</text>
			{ans > 0 && (
				<g opacity={ans}>
					<rect x={OUT.x - 13} y={gapBottom - (gapBottom - gapTop) * gap} width={26} height={(gapBottom - gapTop) * gap} rx={8}
						fill={C.lavender} stroke={C.violet} strokeWidth={6} opacity={gap > 0.01 ? 1 : 0} />
					<text x={OUT.x - 32} y={(gapTop + gapBottom) / 2 + 11} fontSize={32} fontWeight={600} textAnchor="end" fill={C.violet} opacity={gap > 0.05 ? 1 : 0}>error</text>
					<g transform={`translate(${(1 - ans) * 40} 0)`}>
						<rect x={ANSWER.x} y={ANSWER.y} width={ANSWER.w} height={ANSWER.h} rx={14} fill={C.background} stroke={C.navy} strokeWidth={5} />
						<text x={ANSWER.x + ANSWER.w / 2} y={ANSWER.y + 45} fontSize={28} fontWeight={600} textAnchor="middle" fill={C.navy}>Right answer: Spam</text>
					</g>
				</g>
			)}
		</g>
	);
};

// Small explanatory captions under the network; the example counter counts up smoothly.
const CAPTIONS: [string, number, number][] = [
	[content.networkNote, S[1] + 120, S[2] + 10],
	[content.weightNote, S[2] + 40, S[2] + 110],
	[content.activationNote, S[2] + 118, S[3]],
	[content.trainingNote, S[3] + 60, S[4]],
];
const Caption: React.FC<{f: number}> = ({f}) => {
	const n = Math.round(kf(f, [S[4] + 10, S[4] + 95], [1, 10000], EASE.linear));
	const counterO = enter(f, [S[4] + 5, S[4] + 20], [0, 1]) * exit(f, [S[5], S[5] + 10], [1, 0]);
	return (
		<>
			{CAPTIONS.map(([t, a, b], k) => {
				const o = enter(f, [a, a + 15], [0, 1]) * exit(f, [b - 8, b], [1, 0]);
				if (o <= 0) return null;
				return (
					<text key={k} x={540} y={CAPTION_Y + enter(f, [a, a + 15], [16, 0])} fontSize={30} fontWeight={k === 0 ? 700 : 500} textAnchor="middle"
						fill={k === 0 ? C.violet : C.navy} opacity={o}>{t}</text>
				);
			})}
			{counterO > 0 && (
				<text x={540} y={CAPTION_Y} fontSize={34} fontWeight={700} textAnchor="middle" fill={C.navy} opacity={counterO}>
					{n.toLocaleString('en-US')} {content.examplesNote}
				</text>
			)}
		</>
	);
};

// ---------------------------------------------------------------------------
// Shared building blocks (from rag-video): headline, subtitles, logo outro
// ---------------------------------------------------------------------------

const Headline: React.FC<{f: number}> = ({f}) => (
	<>
		{content.scenes.map((sc, i) => {
			if (!sc.headline) return null;
			const a = S[i];
			const out = kf(f, [sceneEnd(i) - 8, sceneEnd(i)], [1, 0], EASE.in);
			if (f < a || out <= 0) return null;
			return (
				<g key={i} opacity={out}>
					{sc.headline.split('\n').map((line, li) => {
						const y = 250 + li * 72;
						const rise = enter(f, [a + li * 4, a + 18 + li * 4], [74, 0]);
						return (
							<g key={li}>
								<clipPath id={`hl-${i}-${li}`}><rect x={0} y={y - 62} width={1080} height={80} /></clipPath>
								<text x={SAFE.left} y={y + rise} clipPath={`url(#hl-${i}-${li})`} fontSize={58} fontWeight={700} fill={C.navy}>
									{parseMarked(line).map(({w, hl}, k) => <tspan key={k} fill={hl ? C.violet : C.navy}>{spaced(w, k)}</tspan>)}
								</text>
							</g>
						);
					})}
				</g>
			);
		})}
	</>
);

const Subtitles: React.FC<{f: number}> = ({f}) => (
	<>
		{content.scenes.map((sc, i) => {
			const start = sc.voStart * FPS;
			const dur = (voTiming[i] ?? 3) * FPS;
			const end = Math.min(sceneEnd(i) - 2, start + dur + 18);
			const o = kf(f, [start - 4, start + 4, end - 6, end], [0, 1, 1, 0]);
			if (o <= 0) return null;
			const words = parseMarked(sc.voiceover);
			const perLine = words.length > 7 ? Math.ceil(words.length / 2) : words.length;
			const lines = [words.slice(0, perLine), words.slice(perLine)].filter((l) => l.length);
			const h = 34 + lines.length * 54;
			let n = 0;
			return (
				<g key={i} opacity={o}>
					<rect x={SAFE.left} y={SUB_BOTTOM - h} width={SAFE.right - SAFE.left} height={h} rx={20} fill={C.navy} fillOpacity={0.88} />
					{lines.map((line, li) => (
						<text key={li} x={540} y={SUB_BOTTOM - h + 56 + li * 54} fontSize={40} fontWeight={600} textAnchor="middle">
							{line.map(({w, hl}, k) => {
								const at = start + (Math.floor(n++ / 3) * 3 * dur) / words.length;
								return <tspan key={k} fill={hl ? C.lavender : '#fff'} fillOpacity={enter(f, [at, at + 8], [0.25, 1])}>{spaced(w, k)}</tspan>;
							})}
						</text>
					))}
				</g>
			);
		})}
	</>
);

const LOGO = {barW: 66, gap: 22, heights: [96, 156, 212, 276], base: 700, wordY: 832, wordSize: 104};
const Outro: React.FC<{f: number}> = ({f}) => {
	const a = S[5] + 6;
	if (f < a) return null;
	const {barW, gap, heights, base} = LOGO;
	const symbolW = heights.length * barW + (heights.length - 1) * gap;
	const left = 540 - symbolW / 2;
	const top = base - heights[heights.length - 1];
	const word = enter(f, [a + 38, a + 58], [0, 1]);
	const glow = kf(f, [a + 52, a + 61, a + 70], [0, 1, 0.35]);
	const tag = enter(f, [a + 52, a + 68], [0, 1]);
	const cta = enter(f, [a + 62, a + 80], [0, 1]);
	const arrow = kf(f, [a + 76, a + 94], [0, 10]);
	return (
		<g>
			<linearGradient id="logoBars" gradientUnits="userSpaceOnUse" x1={left} y1={top} x2={left + symbolW} y2={base}>
				<stop offset="0" stopColor={C.lavender} /><stop offset="0.55" stopColor={C.purple} /><stop offset="1" stopColor={C.violet} />
			</linearGradient>
			<g filter={glow > 0.05 ? 'url(#glow)' : undefined}>
				{heights.map((bh, k) => {
					const g = enter(f, [a + 8 + k * 7, a + 26 + k * 7], [0, 1]);
					const h = Math.max(barW * g, bh * g);
					return <rect key={k} x={left + k * (barW + gap)} y={base - h} width={barW} height={h} rx={barW / 2} fill="url(#logoBars)" opacity={g > 0 ? 1 : 0} />;
				})}
			</g>
			<clipPath id="wordmark"><rect x={140} y={LOGO.wordY - 110} width={800 * word} height={150} /></clipPath>
			<text x={540} y={LOGO.wordY} clipPath="url(#wordmark)" fontFamily={LOGO_FONT} fontSize={LOGO.wordSize} fontWeight={700} textAnchor="middle" fill={C.navy} letterSpacing={-1}>
				Data<tspan fill={C.purple}>E</tspan>ntropy
			</text>
			<text x={540} y={935 + (1 - tag) * 24} fontSize={34} fontWeight={600} textAnchor="middle" fill={C.navy} opacity={tag}>{content.brand.tagline}</text>
			<g opacity={cta} transform={`translate(0 ${(1 - cta) * 24})`}>
				<rect x={260} y={1000} width={560} height={100} rx={20} fill={C.violet} filter="url(#soft)" />
				<text x={520} y={1063} fontSize={38} fontWeight={600} textAnchor="middle" fill="#fff">{content.brand.cta}</text>
				<text x={745 + arrow} y={1063} fontSize={38} fontWeight={600} textAnchor="middle" fill="#fff">→</text>
			</g>
		</g>
	);
};

// ---------------------------------------------------------------------------

export const NeuralNetworkVideo: React.FC = () => {
	const f = useCurrentFrame();
	const s = camera(f);
	const worldO = exit(f, [S[5], S[5] + 18], [1, 0]);
	return (
		<AbsoluteFill style={{backgroundColor: C.background, fontFamily: FONT}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{fontFamily: FONT}}>
				<defs>
					<filter id="soft" x="-30%" y="-30%" width="160%" height="170%">
						<feDropShadow dx="0" dy="10" stdDeviation="14" floodColor={C.violet} floodOpacity="0.12" />
					</filter>
					<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
						<feDropShadow dx="0" dy="0" stdDeviation="12" floodColor={C.violet} floodOpacity="0.35" />
					</filter>
					<pattern id="dots" width={48} height={48} patternUnits="userSpaceOnUse"><circle cx={24} cy={24} r={2} fill={C.grid} /></pattern>
					<radialGradient id="lavGlow" cx="0.85" cy="0.1" r="0.7">
						<stop offset="0" stopColor={C.lavender} stopOpacity={0.35} /><stop offset="1" stopColor={C.lavender} stopOpacity={0} />
					</radialGradient>
				</defs>
				<rect width={1080} height={1920} fill="url(#dots)" />
				<rect width={1080} height={1920} fill="url(#lavGlow)" />
				<g opacity={worldO} transform={`translate(${WORLD_CENTER.x} ${WORLD_CENTER.y}) scale(${s}) translate(${-WORLD_CENTER.x} ${-WORLD_CENTER.y})`}>
					<Network f={f} />
					<Inputs f={f} />
					<OutputPanel f={f} />
					<SpamFolder f={f} />
					<RuleCards f={f} />
					<VariantCard f={f} />
					<EmailCard f={f} />
					<Caption f={f} />
				</g>
				<Outro f={f} />
				<Headline f={f} />
				<Subtitles f={f} />
			</svg>
			{content.scenes.map((sc, i) => (
				<Sequence key={i} from={Math.round(sc.voStart * FPS)}>
					<Audio src={staticFile(`vo/scene-${i + 1}.wav`)} />
				</Sequence>
			))}
			<Audio src={staticFile('music.wav')} />
		</AbsoluteFill>
	);
};
