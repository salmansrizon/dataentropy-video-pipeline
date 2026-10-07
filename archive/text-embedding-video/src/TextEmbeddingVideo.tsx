import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import content from './content.json';
import voTiming from './vo-timing.json';

// How text embeddings let search find meaning. Editable text/timing: content.json. vo-timing.json: `npm run srt`.
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
const BAR = {x: 110, y: 420, w: 860, h: 90, textX: 190, font: 38};
const QCHAR = BAR.font * 0.5;
const CARD_FONT = 30, CCHAR = CARD_FONT * 0.51;
const CARDS = [{x: 320, y: 700, w: 420}, {x: 780, y: 700, w: 330}, {x: 780, y: 800, w: 330}];
const NODE = {x: 540, y: 950, w: 420, h: 130};
const ROWS_Y = [1085, 1145, 1205, 1265];
const ORIGIN = {x: 200, y: 1230};
// Map points (query first): angle from the x-axis and distance from the origin.
const POLAR: [number, number][] = [[40, 550], [34, 600], [72, 480], [5, 700]];
const MAP = POLAR.map(([deg, len]) => ({x: ORIGIN.x + len * Math.cos((deg * Math.PI) / 180), y: ORIGIN.y - len * Math.sin((deg * Math.PI) / 180)}));
const LIST_Y = [610, 700, 790];
const CAPTION_Y = 1345;
const camera = (f: number) => kf(f, [S[5], S[5] + 30], [1, 0.94]);

// Word centers (estimated glyph widths) for the word-match lines.
const qWord = (w: string) => {
	const i = content.query.indexOf(w);
	return BAR.textX + (i + w.length / 2) * QCHAR;
};
const cardWord = (k: number, w: string) => {
	const t = content.products[k];
	return CARDS[k].x - (t.length * CCHAR) / 2 + (t.indexOf(w) + w.length / 2) * CCHAR;
};
const ITEMS = [content.query, ...content.products]; // everything that becomes a vector

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const SearchBar: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[0], S[0] + 18], [0, 1]);
	const dy = enter(f, [S[0], S[0] + 18], [24, 0]);
	const typed = Math.floor(kf(f, [S[0] + 12, S[0] + 36], [0, content.query.length], EASE.linear));
	const blink = f < S[1] + 30 && Math.floor(f / 12) % 2 === 0 ? 1 : 0;
	return (
		<g opacity={o} transform={`translate(0 ${dy})`}>
			<rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={45} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#soft)" />
			<circle cx={BAR.x + 42} cy={BAR.y + 40} r={14} fill="none" stroke={C.navy} strokeWidth={5} />
			<line x1={BAR.x + 52} y1={BAR.y + 50} x2={BAR.x + 64} y2={BAR.y + 62} stroke={C.navy} strokeWidth={5} strokeLinecap="round" />
			<text x={BAR.textX} y={BAR.y + 58} fontSize={BAR.font} fontWeight={600} fill={C.text}>{content.query.slice(0, typed)}</text>
			<rect x={BAR.textX + typed * QCHAR + 4} y={BAR.y + 24} width={5} height={42} rx={2} fill={C.violet} opacity={blink} />
		</g>
	);
};

// Product cards: appear, then travel into the embedding model (scene 3).
const cardEnter = [S[0] + 30, S[1] + 70, S[2] + 5];
const ProductCard: React.FC<{f: number; k: number}> = ({f, k}) => {
	const c = CARDS[k];
	const a = cardEnter[k];
	const t = kf(f, [S[2] + 25 + k * 6, S[2] + 60 + k * 6], [0, 1], EASE.inOut);
	const o = enter(f, [a, a + 18], [0, 1]) * exit(f, [S[2] + 48 + k * 6, S[2] + 60 + k * 6], [1, 0]);
	if (o <= 0) return null;
	const dx = k === 0 ? 0 : enter(f, [a, a + 18], [60, 0]);
	const x = c.x + dx + (NODE.x - c.x) * t;
	const y = c.y + (NODE.y - c.y) * t;
	const s = 1 - t * 0.6;
	return (
		<g opacity={o} transform={`translate(${x} ${y}) scale(${s})`}>
			<rect x={-c.w / 2} y={-38} width={c.w} height={76} rx={14} fill={C.background} stroke={C.navy} strokeWidth={4} />
			<text y={11} fontSize={CARD_FONT} fontWeight={600} textAnchor="middle" fill={C.text}>{content.products[k]}</text>
		</g>
	);
};

// A violet query pill leaves the search bar and follows the cards into the model.
const QueryPill: React.FC<{f: number}> = ({f}) => {
	const a = S[2] + 15;
	const o = enter(f, [a, a + 10], [0, 1]) * exit(f, [a + 38, a + 48], [1, 0]);
	if (o <= 0) return null;
	const t = kf(f, [a, a + 48], [0, 1]);
	const x = 300 + (NODE.x - 300) * t, y = BAR.y + BAR.h + 40 + (NODE.y - (BAR.y + BAR.h + 40)) * t;
	return (
		<g opacity={o} transform={`translate(${x} ${y}) scale(${1 - t * 0.6})`}>
			<rect x={-120} y={-32} width={240} height={64} rx={32} fill={C.violet} />
			<text y={11} fontSize={30} fontWeight={700} textAnchor="middle" fill="#fff">{content.query}</text>
		</g>
	);
};

// Scene 2: word-by-word matching fails for the real match and "succeeds" for the decoy.
const WordMatch: React.FC<{f: number}> = ({f}) => {
	const o = exit(f, [S[2], S[2] + 12], [1, 0]);
	if (f < S[1] || o <= 0) return null;
	const top = BAR.y + BAR.h + 6, bot = CARDS[0].y - 40;
	const tries: [string, string][] = [['cheap', 'Budget-friendly'], ['cheap', 'computer'], ['laptop', 'Budget-friendly'], ['laptop', 'computer']];
	const match = {x1: qWord('laptop'), x2: cardWord(1, 'Laptop')};
	const md = enter(f, [S[1] + 90, S[1] + 105], [0, 1]);
	const q = enter(f, [S[1] + 105, S[1] + 118], [0, 1]);
	return (
		<g opacity={o}>
			{tries.map(([qw, pw], k) => {
				const a = S[1] + 10 + k * 12;
				const d = enter(f, [a, a + 12], [0, 1]);
				const x = enter(f, [a + 12, a + 24], [0, 1]);
				const x1 = qWord(qw), x2 = cardWord(0, pw), mx = (x1 + x2) / 2, my = (top + bot) / 2;
				return (
					<g key={k} opacity={d > 0 ? 1 : 0}>
						<line x1={x1} y1={top} x2={x1 + (mx - x1) * d} y2={top + (my - top) * d} stroke={C.navy} strokeWidth={5} strokeLinecap="round" />
						{[[-1, -1, 1, 1], [1, -1, -1, 1]].map(([a1, b1, a2, b2], j) => (
							<line key={j} x1={mx + a1 * 14} y1={my + b1 * 14} x2={mx + a1 * 14 + (a2 - a1) * 14 * x} y2={my + b1 * 14 + (b2 - b1) * 14 * x}
								stroke={C.violet} strokeWidth={6} strokeLinecap="round" opacity={x > 0 ? 1 : 0} />
						))}
					</g>
				);
			})}
			<line x1={match.x1} y1={top} x2={match.x1 + (match.x2 - match.x1) * md} y2={top + (bot - top) * md} stroke={C.navy} strokeWidth={5} strokeLinecap="round"
				opacity={md > 0 ? 1 : 0} />
			<text x={(match.x1 + match.x2) / 2 + 30} y={(top + bot) / 2 + 20} fontSize={64} fontWeight={800} fill={C.violet} opacity={q}>?</text>
		</g>
	);
};

const EmbeddingNode: React.FC<{f: number}> = ({f}) => {
	const o = enter(f, [S[2], S[2] + 20], [0, 1]) * exit(f, [S[3], S[3] + 15], [1, 0]);
	if (o <= 0) return null;
	const s = enter(f, [S[2], S[2] + 20], [0.96, 1]);
	const pulse = kf(f, [S[2] + 55, S[2] + 65, S[2] + 80], [0, 1, 0]);
	const pathDraw = enter(f, [S[2] + 12, S[2] + 36], [0, 1]);
	const pathO = exit(f, [S[2] + 70, S[2] + 82], [1, 0]);
	const starts = [[300, BAR.y + BAR.h + 40], ...CARDS.map((c) => [c.x, c.y + 38])];
	return (
		<g opacity={o}>
			{starts.map(([sx, sy], k) => (
				<path key={k} d={`M ${sx} ${sy} C ${sx} ${sy + 120}, ${NODE.x + (k - 1.5) * 60} ${NODE.y - 180}, ${NODE.x + (k - 1.5) * 60} ${NODE.y - NODE.h / 2}`}
					fill="none" stroke={C.purple} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pathDraw}
					opacity={pathDraw > 0 ? pathO : 0} />
			))}
			<g transform={`translate(${NODE.x} ${NODE.y}) scale(${s * (1 + pulse * 0.04)})`}>
				<ellipse rx={300} ry={120} fill={C.lavender} opacity={0.45} />
				<rect x={-NODE.w / 2} y={-NODE.h / 2} width={NODE.w} height={NODE.h} rx={28} fill={C.card} stroke={C.navy} strokeWidth={5} filter="url(#glow)" />
				<text y={-4} fontSize={40} fontWeight={700} textAnchor="middle" fill={C.navy}>{content.modelName}</text>
				<text y={36} fontSize={26} fontWeight={500} textAnchor="middle" fill={C.violet}>{content.modelNote}</text>
			</g>
		</g>
	);
};

// Number rows come out of the model, then fold into points on the meaning map.
const VectorRows: React.FC<{f: number}> = ({f}) => (
	<g>
		{ITEMS.map((item, k) => {
			const a = S[2] + 70 + k * 6;
			const o = enter(f, [a, a + 16], [0, 1]);
			const fold = kf(f, [S[3] + 20 + k * 6, S[3] + 55 + k * 6], [0, 1]);
			if (o <= 0 || fold >= 1) return null;
			const rise = enter(f, [a, a + 16], [NODE.y - ROWS_Y[k], 0]);
			const x = 540 + (MAP[k].x - 540) * fold, y = ROWS_Y[k] + rise + (MAP[k].y - ROWS_Y[k]) * fold;
			const isQ = k === 0;
			return (
				<g key={k} opacity={o * (1 - fold) ** 2} transform={`translate(${x} ${y}) scale(${1 - fold * 0.9})`}>
					<rect x={-430} y={-28} width={860} height={56} rx={12} fill={C.card} stroke={C.purple} strokeWidth={4} />
					<text x={-405} y={10} fontSize={28} fontWeight={700} fill={isQ ? C.violet : C.navy}>{item}</text>
					<text x={405} y={10} fontSize={28} fontWeight={500} textAnchor="end" fill={C.navy}>{content.vectors[k]}</text>
				</g>
			);
		})}
	</g>
);

// The meaning map: axes, points, arrows from the origin, and the angle arc.
const MeaningMap: React.FC<{f: number}> = ({f}) => {
	const o = exit(f, [S[4], S[4] + 15], [1, 0]);
	const axes = enter(f, [S[3] + 5, S[3] + 30], [0, 1]);
	if (axes <= 0 || o <= 0) return null;
	const arc = enter(f, [S[3] + 80, S[3] + 100], [0, 1]);
	const [aq, ap] = [POLAR[0][0], POLAR[1][0]].map((d) => (d * Math.PI) / 180);
	const R = 230;
	const arcPt = (ang: number) => `${ORIGIN.x + R * Math.cos(ang)} ${ORIGIN.y - R * Math.sin(ang)}`;
	const glow = enter(f, [S[3] + 60, S[3] + 78], [0, 1]);
	const labelPos: [number, number, 'start' | 'middle' | 'end'][] = [[0, -34, 'middle'], [-10, 48, 'end'], [-26, 10, 'end'], [0, -34, 'end']];
	return (
		<g opacity={o}>
			<ellipse cx={(MAP[0].x + MAP[1].x) / 2} cy={(MAP[0].y + MAP[1].y) / 2} rx={130 * glow} ry={100 * glow} fill={C.lavender} opacity={0.55} />
			<line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x + 780 * axes} y2={ORIGIN.y} stroke={C.navy} strokeWidth={4} strokeLinecap="round" />
			<line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x} y2={ORIGIN.y - 560 * axes} stroke={C.navy} strokeWidth={4} strokeLinecap="round" />
			<text x={ORIGIN.x + 780} y={ORIGIN.y + 44} fontSize={26} fontWeight={500} textAnchor="end" fill={C.navy} opacity={axes}>{content.mapNote}</text>
			{MAP.map((p, k) => {
				const a = S[3] + 45 + k * 6;
				const d = enter(f, [a, a + 18], [0, 1]);
				const dot = enter(f, [S[3] + 50 + k * 6, S[3] + 62 + k * 6], [0.96, 1]);
				const isQ = k === 0;
				const [dx, dy, anchor] = labelPos[k];
				const col = isQ ? C.violet : C.navy;
				return (
					<g key={k} opacity={d > 0 ? 1 : 0}>
						<line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x + (p.x - ORIGIN.x) * d} y2={ORIGIN.y + (p.y - ORIGIN.y) * d} stroke={col} strokeWidth={5} strokeLinecap="round" />
						<circle cx={p.x} cy={p.y} r={16 * dot} fill={col} opacity={d} />
						{k === 1 ? (
							ITEMS[k].split(' ').map((w, li) => (
								<text key={li} x={p.x + 26} y={p.y + 2 + li * 32} fontSize={28} fontWeight={600} fill={col} opacity={d}>{w}</text>
							))
						) : (
							<text x={p.x + dx} y={p.y + dy} fontSize={28} fontWeight={isQ ? 700 : 600} textAnchor={anchor} fill={col} opacity={d}>{ITEMS[k]}</text>
						)}
					</g>
				);
			})}
			<path d={`M ${arcPt(aq)} A ${R} ${R} 0 0 1 ${arcPt(aq - (aq - ap) * arc)}`} fill="none" stroke={C.purple} strokeWidth={8} strokeLinecap="round"
				opacity={arc > 0 ? 1 : 0} filter="url(#glow)" />
		</g>
	);
};

// Scene 5: results rank by closeness; the same idea powers search, recommendations, assistants.
const Results: React.FC<{f: number}> = ({f}) => {
	if (f < S[4]) return null;
	const o = exit(f, [S[5], S[5] + 15], [1, 0]);
	return (
		<g opacity={o}>
			{content.products.map((p, k) => {
				const a = S[4] + 12 + k * 8;
				const t = kf(f, [a, a + 26], [0, 1]);
				const from = MAP[k + 1];
				const x = from.x + (540 - from.x) * t, y = from.y + (LIST_Y[k] - from.y) * t;
				const top = k === 0;
				return (
					<g key={k} opacity={enter(f, [a, a + 10], [0, 1])} transform={`translate(${x} ${y}) scale(${0.4 + 0.6 * t})`}>
						<rect x={-430} y={-36} width={860} height={72} rx={16} fill={top ? C.lavenderTint : C.card} stroke={top ? C.violet : C.navy} strokeWidth={top ? 5 : 4} />
						<text x={-400} y={11} fontSize={32} fontWeight={600} fill={C.text}>{p}</text>
						<text x={400} y={11} fontSize={32} fontWeight={700} textAnchor="end" fill={C.navy}>{content.scores[k].toFixed(2)}</text>
					</g>
				);
			})}
			<text x={970} y={LIST_Y[2] + 76} fontSize={26} fontWeight={500} textAnchor="end" fill={C.navy} opacity={enter(f, [S[4] + 45, S[4] + 60], [0, 1])}>
				{content.scoresNote}
			</text>
			{content.uses.map((u, k) => {
				const a = S[4] + 70 + k * 10;
				const oo = enter(f, [a, a + 16], [0, 1]);
				const dy = enter(f, [a, a + 16], [24, 0]);
				const cx = 250 + k * 290, cy = 1060;
				return (
					<g key={k} opacity={oo} transform={`translate(0 ${dy})`}>
						<circle cx={cx} cy={cy} r={62} fill={C.lavenderTint} stroke={C.navy} strokeWidth={4} />
						{k === 0 && <><circle cx={cx - 8} cy={cy - 8} r={20} fill="none" stroke={C.navy} strokeWidth={5} /><line x1={cx + 7} y1={cy + 7} x2={cx + 24} y2={cy + 24} stroke={C.navy} strokeWidth={5} strokeLinecap="round" /></>}
						{k === 1 && <path d={`M ${cx} ${cy - 28} l 8 18 l 20 2 l -15 13 l 5 20 l -18 -10 l -18 10 l 5 -20 l -15 -13 l 20 -2 z`} fill="none" stroke={C.navy} strokeWidth={4} strokeLinejoin="round" />}
						{k === 2 && <path d={`M ${cx - 28} ${cy - 22} h 56 a 8 8 0 0 1 8 8 v 26 a 8 8 0 0 1 -8 8 h -30 l -14 12 v -12 h -12 a 8 8 0 0 1 -8 -8 v -26 a 8 8 0 0 1 8 -8 z`} fill="none" stroke={C.navy} strokeWidth={4} strokeLinejoin="round" />}
						<text x={cx} y={cy + 106} fontSize={30} fontWeight={600} textAnchor="middle" fill={C.navy}>{u}</text>
					</g>
				);
			})}
		</g>
	);
};

const CAPTIONS: [string, number, number, number][] = [
	[content.mismatchNote, S[1] + 100, S[2], CAPTION_Y],
	[content.vectorNote, S[2] + 85, S[3], CAPTION_Y],
	[content.vectorSubNote, S[2] + 95, S[3], CAPTION_Y + 42],
	[content.closenessNote, S[3] + 90, S[4], CAPTION_Y],
];
const Caption: React.FC<{f: number}> = ({f}) => (
	<>
		{CAPTIONS.map(([t, a, b, y], k) => {
			const o = enter(f, [a, a + 15], [0, 1]) * exit(f, [b - 8, b], [1, 0]);
			if (o <= 0) return null;
			return <text key={k} x={540} y={y + enter(f, [a, a + 15], [16, 0])} fontSize={k === 2 ? 26 : 30} fontWeight={k === 2 ? 500 : 600} textAnchor="middle" fill={C.navy} opacity={o}>{t}</text>;
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
			const len = (ws: {w: string}[]) => ws.map((x) => x.w).join(' ').length;
			const fits = words.length <= 7 && len(words) <= 34;
			const perLine = fits ? words.length : words.reduce((best, w, i) => (!/^[?.,!:;]/.test(w.w) && Math.max(len(words.slice(0, i)), len(words.slice(i))) < Math.max(len(words.slice(0, best)), len(words.slice(best))) ? i : best), 1);
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

export const TextEmbeddingVideo: React.FC = () => {
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
					<WordMatch f={f} />
					<EmbeddingNode f={f} />
					<MeaningMap f={f} />
					<VectorRows f={f} />
					{[0, 1, 2].map((k) => <ProductCard key={k} f={f} k={k} />)}
					<QueryPill f={f} />
					<Results f={f} />
					<SearchBar f={f} />
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
