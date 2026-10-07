import React from 'react';
import {EASE, band, draw, enter, fadeIn, fadeOut, kf} from './core';
import {C, MONO} from './brand';

// ---------------------------------------------------------------------------
// Building blocks for scenes: cards, tables, chips, typed code, highlights.
// Nothing rises or scales as it appears (brand pipeline rule): outlines draw
// themselves and fill in, text is wiped in from the left, values slide inside
// a clipped cell.
// ---------------------------------------------------------------------------

type Band = ReturnType<typeof band>;
export const ROW_H = 68;
export const CODE = {size: 38, cw: 38 * 0.6, line: 62, rate: 1.6}; // rate = frames per typed character



export const ArrowHead: React.FC<{x: number; y: number; angle: number; color: string; w: number; size?: number; opacity: number}> = ({x, y, angle, color, w, size = 20, opacity}) => (
	<path d={`M ${-size} ${-size * 0.62} L 0 0 L ${-size} ${size * 0.62}`} transform={`translate(${x} ${y}) rotate(${angle})`}
		fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
);

export const Check: React.FC<{x: number; y: number; p: number; color?: string}> = ({x, y, p, color = C.violet}) =>
	p <= 0 ? null : (
		<path d={`M ${x - 16} ${y} L ${x - 5} ${y + 12} L ${x + 17} ${y - 13}`} fill="none" stroke={color} strokeWidth={7}
			strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} />
	);

// Reveals its children from left to right.
export const Wipe: React.FC<{id: string; x: number; y: number; w: number; h: number; p: number; children: React.ReactNode}> = ({id, x, y, w, h, p, children}) => (
	<g clipPath={`url(#${id})`}>
		<clipPath id={id}>
			<rect x={x} y={y} width={w * p} height={h} />
		</clipPath>
		{children}
	</g>
);

// A card whose outline draws itself and then fills in. Children fade in with the fill.
export const Card: React.FC<{f: number; at: number; x: number; y: number; w: number; h: number; stroke?: string; rx?: number; sw?: number; opacity?: number; children?: React.ReactNode}> = ({f, at, x, y, w, h, stroke = C.navy, rx = 18, sw = 5, opacity = 1, children}) => {
	const p = enter(f, [at, at + 30], [0, 1]);
	if (p <= 0 || opacity <= 0) return null;
	const fill = enter(f, [at + 14, at + 30], [0, 1]);
	return (
		<g opacity={opacity}>
			<rect x={x} y={y} width={w} height={h} rx={rx} fill={C.card} filter="url(#soft)" opacity={fill} />
			<g opacity={fill}>{children}</g>
			<rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" {...draw(p)} />
		</g>
	);
};

// A small label chip, wiped in from the left; `out` is the frame it starts to fade.
export const Chip: React.FC<{f: number; at: number; out?: number; id: string; x: number; y: number; w: number; h?: number; text: string; stroke?: string; size?: number}> = ({f, at, out, id, x, y, w, h = 56, text, stroke = C.navy, size = 32}) => {
	const p = enter(f, [at, at + 16], [0, 1]);
	const o = out === undefined ? 1 : fadeOut(f, out);
	if (p <= 0 || o <= 0) return null;
	return (
		<g opacity={o}>
			<Wipe id={id} x={x - 4} y={y - 4} w={w + 8} h={h + 8} p={p}>
				<rect x={x} y={y} width={w} height={h} rx={16} fill={C.card} stroke={stroke} strokeWidth={4} />
				<text x={x + w / 2} y={y + h / 2 + size * 0.35} fontSize={size} fontWeight={600} textAnchor="middle" fill={C.navy}>{text}</text>
			</Wipe>
		</g>
	);
};

// One typed line of SQL: the first `kw` characters are the keyword, in violet.
export const typedCount = (f: number, at: number, text: string) => Math.floor(kf(f, [at, at + text.length * CODE.rate], [0, text.length], EASE.linear));
export const typedEnd = (at: number, text: string) => Math.ceil(at + text.length * CODE.rate);
export const CodeLine: React.FC<{f: number; at: number; x: number; y: number; text: string; kw: number; opacity?: number}> = ({f, at, x, y, text, kw, opacity = 1}) => {
	const n = typedCount(f, at, text);
	if (n <= 0) return null;
	return (
		<text x={x} y={y} fontFamily={MONO} fontSize={CODE.size} fontWeight={500} fill={C.navy} opacity={opacity} style={{whiteSpace: 'pre'}}>
			<tspan fill={C.violet} fontWeight={700}>{text.slice(0, Math.min(n, kw))}</tspan>
			{text.slice(kw, Math.max(kw, n))}
		</text>
	);
};

// The query card with its "SQL" badge.
export const QueryCard: React.FC<{f: number; at: number; x: number; y: number; w: number; h: number; label?: string; children?: React.ReactNode}> = ({f, at, x, y, w, h, label = 'SQL', children}) => (
	<g>
		<Card f={f} at={at} x={x} y={y} w={w} h={h} rx={20}>
			<rect x={x + w - 122} y={y + 20} width={100} height={48} rx={14} fill={C.navy} />
			<text x={x + w - 72} y={y + 54} fontSize={28} fontWeight={600} textAnchor="middle" fill="#fff">{label}</text>
		</Card>
		{children}
	</g>
);

// Table geometry and the table card: name tab, header, rows wiped in one after another.
export type Col = {name: string; w: number};
export const geom = (x: number, y: number, cols: Col[], n: number, rowH = ROW_H) => {
	const colX = cols.map((_, c) => x + cols.slice(0, c).reduce((a, k) => a + k.w, 0));
	const w = cols.reduce((a, k) => a + k.w, 0);
	return {x, y, w, right: x + w, h: rowH * (n + 1), rowH, colX, cols, rowY: (r: number) => y + rowH * (r + 1)};
};
export type Geom = ReturnType<typeof geom>;
export const Table: React.FC<{
	f: number; at: number; id: string; g: Geom; name: string; rows: string[][]; stroke?: string; tabColor?: string; size?: number; opacity?: number;
	headFill?: (c: number) => string; headText?: (c: number) => string; cellColor?: (r: number, c: number) => string; rowAt?: (r: number) => number; under?: React.ReactNode;
}> = ({f, at, id, g, name, rows, stroke = C.navy, tabColor = C.navy, size = 40, opacity = 1, headFill, headText, cellColor, rowAt, under}) => {
	const fill = enter(f, [at + 14, at + 30], [0, 1]);
	if (f < at || opacity <= 0) return null;
	return (
		<g opacity={opacity}>
			{name && (
				<g opacity={fill}>
					<rect x={g.x} y={g.y - 48} width={Math.min(190, g.w - 40)} height={70} rx={16} fill={tabColor} />
					<text x={g.x + Math.min(190, g.w - 40) / 2} y={g.y - 13} fontSize={30} fontWeight={600} textAnchor="middle" fill="#fff">{name}</text>
				</g>
			)}
			<Card f={f} at={at} x={g.x} y={g.y} w={g.w} h={g.h} stroke={stroke}>
				<clipPath id={`${id}-clip`}>
					<rect x={g.x} y={g.y} width={g.w} height={g.h} rx={18} />
				</clipPath>
				<g clipPath={`url(#${id}-clip)`}>
					{g.cols.map((col, c) => <rect key={c} x={g.colX[c]} y={g.y} width={col.w} height={g.rowH} fill={headFill ? headFill(c) : C.lavenderTint} />)}
					{under}
					{rows.map((_, r) => <path key={r} d={`M ${g.x} ${g.rowY(r)} L ${g.right} ${g.rowY(r)}`} stroke={C.grid} strokeWidth={2} />)}
				</g>
				{g.cols.map((col, c) => (
					<text key={c} x={g.colX[c] + 28} y={g.y + g.rowH * 0.68} fontSize={size - 4} fontWeight={700} fill={headText ? headText(c) : C.navy}>{col.name}</text>
				))}
			</Card>
			{rows.map((row, r) => {
				const t = rowAt ? rowAt(r) : at + 26 + r * 5;
				const p = enter(f, [t, t + 20], [0, 1]);
				if (p <= 0) return null;
				return (
					<Wipe key={r} id={`${id}-r${r}`} x={g.x} y={g.rowY(r)} w={g.w} h={g.rowH} p={p}>
						{row.map((v, c) => (
							<text key={c} x={g.colX[c] + 28} y={g.rowY(r) + g.rowH * 0.7} fontSize={size} fontWeight={500} fill={cellColor ? cellColor(r, c) : C.navy}>{v}</text>
						))}
					</Wipe>
				);
			})}
		</g>
	);
};

export const TestBand: React.FC<{f: number; b: Band; x: number; w: number; h?: number}> = ({f, b, x, w, h = ROW_H}) => {
	const o = enter(f, [b.frames[0] - 12, b.frames[0]], [0, 1]) * fadeOut(f, b.end, 8);
	if (o <= 0) return null;
	const y = kf(f, b.frames, b.ys);
	return (
		<g opacity={o}>
			<rect x={x} y={y} width={w} height={h} fill={C.lavender} opacity={0.5} style={{mixBlendMode: 'multiply'}} />
			<rect x={x - 8} y={y} width={w + 16} height={h} rx={12} fill="none" stroke={C.violet} strokeWidth={5} />
		</g>
	);
};

// A value that travels from one place to another inside a white chip; the chip fades once it lands.
export const Flyer: React.FC<{f: number; at: number; from: {x: number; y: number}; to: {x: number; y: number}; w: number; text: string; d?: number; arc?: number; size?: number; opacity?: number; color?: string}> = ({f, at, from, to, w, text, d = 40, arc = 0, size = 40, opacity = 1, color = C.navy}) => {
	const p = kf(f, [at, at + d], [0, 1]);
	if (p <= 0 || opacity <= 0) return null;
	const [x, y] = [from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * arc];
	return (
		<g opacity={opacity}>
			<rect x={x - 16} y={y - size - 2} width={w} height={size + 18} rx={12} fill={C.card} stroke={C.violet} strokeWidth={4} opacity={fadeIn(f, at, 12) * fadeOut(f, at + d - 8, 8)} />
			<text x={x} y={y} fontSize={size} fontWeight={500} fill={color}>{text}</text>
		</g>
	);
};

// An outline that draws itself around a region and fades at `out`.
export const Ring: React.FC<{f: number; at: number; out?: number; x: number; y: number; w: number; h: number; color?: string; d?: number}> = ({f, at, out, x, y, w, h, color = C.violet, d = 24}) => {
	const p = enter(f, [at, at + d], [0, 1]);
	const o = out === undefined ? 1 : fadeOut(f, out);
	if (p <= 0 || o <= 0) return null;
	return <rect x={x} y={y} width={w} height={h} rx={12} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" {...draw(p)} opacity={o} />;
};

// A lavender band behind text, wiped in from the left and faded at `out`.
export const Mark: React.FC<{f: number; at: number; out?: number; x: number; y: number; w: number; h: number}> = ({f, at, out, x, y, w, h}) => {
	const p = enter(f, [at, at + 18], [0, 1]);
	const o = out === undefined ? 1 : fadeOut(f, out);
	if (p <= 0 || o <= 0) return null;
	return <rect x={x} y={y} width={w * p} height={h} rx={12} fill={C.lavender} opacity={0.55 * o} style={{mixBlendMode: 'multiply'}} />;
};

// A code line whose text is replaced: the first version is typed, each later one slides up as the old one slides out.
export const SwapLine: React.FC<{f: number; id: string; x: number; y: number; versions: {text: string; kw: number}[]; typeAt: number; swaps: number[]}> = ({f, id, x, y, versions, typeAt, swaps}) => {
	const widest = Math.max(...versions.map((v) => v.text.length));
	return (
		<g clipPath={`url(#${id})`}>
			<clipPath id={id}>
				<rect x={x - 4} y={y - 40} width={widest * CODE.cw + 8} height={54} />
			</clipPath>
			{versions.map((v, k) => {
				const out = k < swaps.length ? kf(f, [swaps[k], swaps[k] + 10], [0, 1], EASE.in) : 0;
				const into = k === 0 ? 1 : enter(f, [swaps[k - 1] + 8, swaps[k - 1] + 24], [0, 1]);
				if (into <= 0 || out >= 1) return null;
				return (
					<g key={k} transform={`translate(0 ${(1 - into) * 44 - out * 44})`} opacity={1 - out}>
						<CodeLine f={f} at={k === 0 ? typeAt : -9999} x={x} y={y} text={v.text} kw={v.kw} />
					</g>
				);
			})}
		</g>
	);
};


