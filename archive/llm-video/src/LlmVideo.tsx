import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import content from './content.json';
import voTiming from './vo-timing.json';

// How an LLM writes a reply. Editable text/timing: content.json. vo-timing.json: `npm run srt`.
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
const CHAT = {x: 90, y: 410, w: 900, h: 360};
const BUBBLE = {x: 130, y: 460, w: 820};
const TILE = {font: 30, h: 50, gap: 12, rowY: [510, 580], x0: 160};
const REPLY = {x: 130, y: 722, font: 36};
const CHAR = REPLY.font * 0.5; // ponytail: estimated Inter glyph width; use measureText if layout drifts
const NODE = {x: 540, y: 1000, w: 400, h: 140};
const CAND = {x: 130, barX: 370, barMax: 460, rowY: [1135, 1195, 1255], h: 46};
const CAPTION_Y = 1340;

// Token tiles: two rows, widths from character count.
const TILES = content.tokens.flatMap((row, r) => {
	let x = TILE.x0;
	return row.map((t) => {
		const w = t.length * TILE.font * 0.55 + 30;
		const tile = {t, r, x, w, y: TILE.rowY[r]};
		x += w + TILE.gap;
		return tile;
	});
});
const tileIndex = (t: string) => TILES.findIndex((x) => x.t === t);

// Rounds of next-token prediction. Round 0 is shown slowly with attention; 1 and 2 repeat quickly.
const R0 = S[3];
const ROUND_START = [R0, R0 + 100, R0 + 135];
const picks = content.rounds.map((r) => r.candidates[0][0]);
const blankX = (r: number) => REPLY.x + ([content.replyStart, ...picks.slice(0, r)].join(' ').length + 1) * CHAR;
// Frame each round's chosen token lands in the reply.
const roundTiming = (r: number) => {
	const a = ROUND_START[r];
	return r === 0
		? {appear: S[2] + 80, bars: S[2] + 95, choose: a + 50, fly: a + 60, land: a + 85}
		: {appear: a, bars: a + 4, choose: a + 20, fly: a + 26, land: a + 46};
};
const landed = (f: number) => content.rounds.filter((_, r) => f >= roundTiming(r).land).length;

const camera = (f: number) =>
	kf(f, [S[1], S[1] + 40, S[4], S[4] + 40, S[5], S[5] + 30], [1, 0.94, 0.94, 0.82, 0.82, 0.78]);

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const ChatWindow: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[0], S[0] + 18], [0, 1]);
	const dy = enter(f, [S[0], S[0] + 18], [24, 0]);
	return (
		<g opacity={o} transform={`translate(0 ${dy})`}>
			<rect x={CHAT.x} y={CHAT.y} width={CHAT.w} height={CHAT.h} rx={20} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#soft)" />
		</g>
	);
};

// The student's message: typed text that splits into token tiles (bubble grows to fit two rows).
const PromptCard: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[0] + 4, S[0] + 20], [0, 1]);
	const h = kf(f, [S[2], S[2] + 24], [80, 160]);
	const typed = Math.floor(kf(f, [S[0] + 10, S[0] + 40], [0, content.prompt.length], EASE.linear));
	const textO = exit(f, [S[2], S[2] + 10], [1, 0]);
	return (
		<g opacity={o}>
			<rect x={BUBBLE.x} y={BUBBLE.y} width={BUBBLE.w} height={h} rx={16} fill={C.background} stroke={C.navy} strokeWidth={4} />
			<text x={BUBBLE.x + 30} y={BUBBLE.y + 52} fontSize={34} fontWeight={500} fill={C.text} opacity={textO}>
				{content.prompt.slice(0, typed)}
			</text>
		</g>
	);
};

const TokenTile: React.FC<{f: number; i: number}> = ({f, i}) => {
	const t = TILES[i];
	const a = S[2] + 8 + i * 3;
	const o = enter(f, [a, a + 16], [0, 1]);
	const dy = enter(f, [a, a + 16], [20, 0]);
	// Attention (round 0): related tiles gain a violet outline.
	const att = content.attention.includes(t.t) ? kf(f, [R0 + 20, R0 + 30, R0 + 85, R0 + 95], [0, 1, 1, 0]) : 0;
	return (
		<g opacity={o} transform={`translate(0 ${dy})`}>
			<rect x={t.x} y={t.y - TILE.h / 2} width={t.w} height={TILE.h} rx={12} fill={mixColor(C.card, C.lavenderTint, att)}
				stroke={mixColor(C.navy, C.violet, att)} strokeWidth={4 + att * 2} />
			<text x={t.x + t.w / 2} y={t.y + 10} fontSize={TILE.font} fontWeight={600} textAnchor="middle" fill={C.navy}>{t.t}</text>
		</g>
	);
};

// "thank" + "-you": one word split into two pieces (illustrative).
const SplitMark: React.FC<{f: number}> = ({f}) => {
	const a = TILES[tileIndex('thank')];
	const b = TILES[tileIndex('-you')];
	const p = enter(f, [S[2] + 35, S[2] + 50], [0, 1]);
	const o = exit(f, [S[3], S[3] + 10], [1, 0]);
	const x1 = a.x + 8, x2 = b.x + b.w - 8, y = a.y + TILE.h / 2 + 12;
	return <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={C.violet} strokeWidth={6} strokeLinecap="round" opacity={p > 0 ? o : 0} />;
};

// Tokens flow into the model along curved paths.
const TokenPaths: React.FC<{f: number}> = ({f}) => {
	const draw = enter(f, [S[2] + 40, S[2] + 70], [0, 1]);
	const o = exit(f, [S[2] + 110, S[2] + 125], [1, 0]);
	if (draw <= 0 || o <= 0) return null;
	return (
		<g opacity={o}>
			{TILES.map((t, i) => {
				const sx = t.x + t.w / 2, sy = t.y + TILE.h / 2;
				const ex = NODE.x + (i - 4) * 30, ey = NODE.y - NODE.h / 2;
				return (
					<path key={i} d={`M ${sx} ${sy} C ${sx} ${sy + 200}, ${ex} ${ey - 200}, ${ex} ${ey}`} fill="none" stroke={C.purple} strokeWidth={5}
						strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
				);
			})}
		</g>
	);
};

const LLMNode: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[1] + 100, S[1] + 124], [0, 1]);
	const s = enter(f, [S[1] + 100, S[1] + 124], [0.96, 1]);
	const pulse = content.rounds.reduce((m, _, r) => Math.max(m, kf(f, [roundTiming(r).appear - 6, roundTiming(r).appear, roundTiming(r).appear + 12], [0, 1, 0])), 0);
	return (
		<g opacity={o} transform={`translate(${NODE.x} ${NODE.y}) scale(${s * (1 + pulse * 0.04)})`}>
			<ellipse rx={300} ry={130} fill={C.lavender} opacity={0.45} />
			<rect x={-NODE.w / 2} y={-NODE.h / 2} width={NODE.w} height={NODE.h} rx={28} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#glow)" />
			<text y={-6} fontSize={48} fontWeight={700} textAnchor="middle" fill={C.navy}>LLM</text>
			<text y={38} fontSize={28} fontWeight={500} textAnchor="middle" fill={C.violet}>predicts the next token</text>
		</g>
	);
};

// Scene 2: the "answer lookup" idea is crossed out and removed.
const Database: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[1] + 10, S[1] + 30], [0, 1]) * exit(f, [S[1] + 85, S[1] + 100], [1, 0]);
	if (o <= 0) return null;
	const dx = enter(f, [S[1] + 10, S[1] + 30], [60, 0]) + exit(f, [S[1] + 85, S[1] + 100], [0, 80]);
	const x = exit(f, [S[1] + 50, S[1] + 66], [0, 1]) > 0 ? enter(f, [S[1] + 50, S[1] + 66], [0, 1]) : 0;
	return (
		<g opacity={o} transform={`translate(${NODE.x + dx} ${NODE.y})`}>
			<path d="M -110 -70 L -110 70 A 110 30 0 0 0 110 70 L 110 -70" fill={C.card} stroke={C.navy} strokeWidth={5} strokeLinejoin="round" />
			<ellipse cy={-70} rx={110} ry={30} fill={C.lavenderTint} stroke={C.navy} strokeWidth={5} />
			<path d="M -110 0 A 110 30 0 0 0 110 0" fill="none" stroke={C.navy} strokeWidth={4} />
			<text y={150} fontSize={32} fontWeight={600} textAnchor="middle" fill={C.navy}>answer lookup?</text>
			{[[-130, -110, 130, 110], [130, -110, -130, 110]].map(([x1, y1, x2, y2], k) => (
				<line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * x} y2={y1 + (y2 - y1) * x} stroke={C.violet} strokeWidth={10} strokeLinecap="round" />
			))}
		</g>
	);
};

// Candidate next tokens with probability bars, one column per round.
const ProbabilityBars: React.FC<{f: number; r: number}> = ({f, r}) => {
	const t = roundTiming(r);
	const cands = content.rounds[r].candidates as [string, number][];
	if (f < t.appear || f > t.land + 2) return null;
	return (
		<g>
			{cands.map(([tok, p], k) => {
				const chosen = k === 0;
				const a = t.appear + k * 4;
				const o = enter(f, [a, a + 14], [0, 1]);
				const y0 = CAND.rowY[k];
				const bar = enter(f, [t.bars, t.bars + 18], [0, (p / 100) * CAND.barMax]);
				const pick = chosen ? kf(f, [t.choose, t.choose + 8], [0, 1]) : 0;
				// Chosen token flies into the reply; the others sink back into the model.
				const fly = chosen ? kf(f, [t.fly, t.land], [0, 1]) : 0;
				const sink = chosen ? 0 : exit(f, [t.fly, t.fly + 14], [0, 1]);
				const riseY = enter(f, [a, a + 14], [NODE.y - y0, 0]);
				const bx = blankX(r), tw = tok.length * CHAR;
				const x = CAND.x + (bx - CAND.x) * fly;
				const y = y0 + riseY + (REPLY.y - 10 - y0) * fly + (NODE.y - y0) * sink;
				const rowO = o * (1 - sink) * (chosen ? exit(f, [t.land - 4, t.land + 2], [1, 0]) : 1);
				return (
					<g key={k} opacity={rowO}>
						<g opacity={1 - fly}>
							<rect x={CAND.barX} y={y - CAND.h / 2} width={Math.max(bar, 8)} height={CAND.h} rx={10}
								fill={mixColor(C.purple, C.violet, pick)} stroke={C.navy} strokeWidth={4} />
							<text x={CAND.barX + Math.max(bar, 8) + 16} y={y + 11} fontSize={30} fontWeight={600} fill={C.navy}>{p}%</text>
						</g>
						<rect x={x - 12} y={y - CAND.h / 2} width={tw + 24} height={CAND.h} rx={12}
							fill={mixColor(C.card, C.violet, pick)} stroke={mixColor(C.navy, C.violet, pick)} strokeWidth={4} />
						<text x={x} y={y + 12} fontSize={32} fontWeight={600} fill={pick > 0.5 ? '#fff' : C.navy}>{tok}</text>
					</g>
				);
			})}
		</g>
	);
};

// Attention: bold arcs from the blank back to related earlier tokens (round 0 only).
const AttentionArc: React.FC<{f: number}> = ({f}) => {
	const draw = enter(f, [R0 + 10, R0 + 35], [0, 1]);
	const o = exit(f, [R0 + 85, R0 + 95], [1, 0]);
	if (draw <= 0 || o <= 0) return null;
	const bx = blankX(0) + 30, by = REPLY.y - 34;
	return (
		<g opacity={o}>
			{content.attention.map((tok) => {
				const t = TILES[tileIndex(tok)];
				const tx = t.x + t.w / 2, ty = t.y + TILE.h / 2 + 4;
				return (
					<path key={tok} d={`M ${bx} ${by} Q ${tx + (bx - tx) * 0.15} ${by}, ${tx} ${ty}`} fill="none" stroke={C.purple}
						strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} filter="url(#glow)" />
				);
			})}
		</g>
	);
};

// The reply grows word by word, then one landed token at a time; a violet cursor marks the blank.
const ReplyLine: React.FC<{f: number}> = ({f}) => {
	const start = content.replyStart.split(' ');
	const shown = Math.floor(kf(f, [S[0] + 50, S[0] + 80], [0, start.length], EASE.linear));
	const words = [...start.slice(0, shown), ...(shown === start.length ? picks.slice(0, landed(f)) : [])];
	const text = words.join(' ');
	const blink = f > S[0] + 38 && Math.floor(f / 12) % 2 === 0 ? 1 : 0.25;
	const cx = REPLY.x + (text.length + (text ? 1 : 0)) * CHAR;
	const done = landed(f) === picks.length;
	return (
		<g opacity={enter(f, [S[0] + 38, S[0] + 50], [0, 1])}>
			<text x={REPLY.x} y={REPLY.y} fontSize={REPLY.font} fontWeight={600} fill={C.navy}>{text}</text>
			{!done && <rect x={cx} y={REPLY.y - 32} width={5} height={40} rx={2} fill={C.violet} opacity={blink} />}
		</g>
	);
};

// Scene 5: text pages stream into the model along violet paths.
const PAGES = [[-60, 620], [-60, 1000], [-60, 1380], [1140, 620], [1140, 1000], [1140, 1380]];
const TrainingStack: React.FC<{f: number}> = ({f}) => {
	const o = exit(f, [S[5], S[5] + 18], [1, 0]);
	return (
		<g opacity={o}>
			{PAGES.map(([px, py], k) => {
				const a = S[4] + 15 + k * 4;
				const ex = NODE.x + (px < 540 ? -NODE.w / 2 : NODE.w / 2), ey = NODE.y;
				const cx = (px + ex) / 2, cy = py + (ey - py) * 0.2 - 60;
				const draw = enter(f, [a, a + 28], [0, 1]);
				const t = kf(f, [a + 8, a + 45], [0, 1]);
				const pageO = kf(f, [a + 8, a + 16, a + 38, a + 46], [0, 1, 1, 0]);
				// Point on the quadratic path at t.
				const x = (1 - t) ** 2 * px + 2 * (1 - t) * t * cx + t * t * ex;
				const y = (1 - t) ** 2 * py + 2 * (1 - t) * t * cy + t * t * ey;
				return (
					<g key={k}>
						<path d={`M ${px} ${py} Q ${cx} ${cy}, ${ex} ${ey}`} fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round"
							pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} opacity={draw > 0 ? exit(f, [a + 46, a + 58], [1, 0]) : 0} />
						<g opacity={pageO} transform={`translate(${x} ${y}) scale(${1 - t * 0.5})`}>
							<rect x={-35} y={-45} width={70} height={90} rx={10} fill={C.card} stroke={C.navy} strokeWidth={4} />
							{[0, 1, 2].map((l) => <line key={l} x1={-20} y1={-22 + l * 20} x2={l === 2 ? 5 : 20} y2={-22 + l * 20} stroke={C.navy} strokeWidth={4} strokeLinecap="round" />)}
						</g>
					</g>
				);
			})}
		</g>
	);
};

const FactCheckBadge: React.FC<{f: number}> = ({f}) => {
	const a = S[4] + 70;
	const o = enter(f, [a, a + 18], [0, 1]);
	const dy = enter(f, [a, a + 18], [24, 0]);
	return (
		<g opacity={o} transform={`translate(540 ${1250 + dy})`}>
			<rect x={-230} y={-40} width={460} height={80} rx={40} fill={C.card} stroke={C.violet} strokeWidth={4} filter="url(#soft)" />
			<path d="M -205 0 l 14 14 l 26 -28" fill="none" stroke={C.violet} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
			<text x={30} y={11} fontSize={32} fontWeight={600} textAnchor="middle" fill={C.navy}>{content.factCheck}</text>
		</g>
	);
};

// Small explanatory caption under the model; swaps per step (exit faster than enter).
const CAPTIONS: [string, number, number][] = [
	[content.tokenNote, S[2] + 20, S[2] + 78],
	[content.probNote, S[2] + 100, S[3]],
	[content.attentionNote, S[3] + 12, S[3] + 100],
	[content.trainingNote, S[4] + 40, S[5]],
];
const Caption: React.FC<{f: number}> = ({f}) => (
	<>
		{CAPTIONS.map(([t, a, b], k) => {
			const o = enter(f, [a, a + 15], [0, 1]) * exit(f, [b - 8, b], [1, 0]);
			if (o <= 0) return null;
			const y = k === 3 ? NODE.y + NODE.h / 2 + 60 : CAPTION_Y;
			return <text key={k} x={540} y={y + enter(f, [a, a + 15], [16, 0])} fontSize={30} fontWeight={500} textAnchor="middle" fill={C.navy} opacity={o}>{t}</text>;
		})}
	</>
);

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

export const LlmVideo: React.FC = () => {
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
					<TrainingStack f={f} />
					<ChatWindow f={f} />
					<PromptCard f={f} />
					<TokenPaths f={f} />
					{TILES.map((_, i) => <TokenTile key={i} f={f} i={i} />)}
					<SplitMark f={f} />
					<Database f={f} />
					<LLMNode f={f} />
					<AttentionArc f={f} />
					<ReplyLine f={f} />
					{content.rounds.map((_, r) => <ProbabilityBars key={r} f={f} r={r} />)}
					<Caption f={f} />
					<FactCheckBadge f={f} />
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
