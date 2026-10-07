import React from 'react';
import {ArrowHead, C, EASE, MONO, draw, enter, kf, mixColor, timeline} from '@dataentropy/engine';
import type {Words} from '@dataentropy/engine';
import base from './content.json';

// Editable text, table data, the query and timing live in content.json; colours and layout come from the
// engine (Brand_Guideline/guideline.json). All motion is keyed to scene start frames or to spoken words,
// so retiming a scene or re-recording a line moves its motion with it.

export type SelectContent = typeof base;

/** The scenes of the SELECT + WHERE explainer for a given script: returns the camera track and the world. */
export const selectScenes = (content: SelectContent, words: Words) => {
	const L = content.labels;
	const {S, at} = timeline(content, words);

	// ---------------------------------------------------------------------------
	// World layout (world = screen coordinates when the camera is at 540, 890, 1):
	// the source table on top, the query card under it, the result table at the bottom.
	// Rows flow down: table -> through the question -> answer.
	// ---------------------------------------------------------------------------

	const ROWS = content.table.rows as [string, string, number][];
	const COLS = content.table.columns;
	const Q = content.query;
	const ROW_H = 68;
	const COL_X = [130, 400, 650];
	const TABLE = {x: 130, right: 880, tabY: 300, y: 348, h: ROW_H * (ROWS.length + 1)};
	const MARK_X = 916; // the ?/check gutter beside the table
	const CARD = {x: 130, y: 866, w: 820, h: 234};
	const CODE = {x: 174, y: 934, line: 62, size: 38, cw: 38 * 0.6};
	const RESULT = {x: 290, tabY: 1140, y: 1188, w: 500, colX: [290, 560]};
	const rowY = (r: number) => TABLE.y + ROW_H * (r + 1);
	const cell = (r: number, c: number) => (c === 2 ? (ROWS[r][2] as number).toLocaleString('en-US') : ROWS[r][c]);
	const SELECTED = COLS.map((name) => Q.select.includes(name)); // per column
	const TEST_COL = COLS.indexOf(Q.whereColumn);
	const passing = (value: number) => ROWS.map((_, r) => r).filter((r) => (ROWS[r][TEST_COL] as number) > value);
	const PASS = passing(Q.value); // rows in the first answer
	const PASS_NEW = passing(Q.newValue); // rows left after the number changes
	if (PASS_NEW.some((r) => !PASS.includes(r))) throw new Error('newValue must be stricter than value');

	// The query, one clause per line. KW = length of the keyword at the start of each line.
	const LINES = [`SELECT ${Q.select.join(', ')}`, `FROM ${content.table.name}`, `WHERE ${Q.whereColumn} > ${Q.value}`];
	const KW = [6, 4, 5];
	const NUM_AT = LINES[2].length - String(Q.value).length; // where the number starts on line 3
	const TYPE_AT = [S[3] + 8, S[4] + 6, S[5] + 6]; // each line starts typing here
	const TYPE_RATE = 1.6; // frames per character
	const typed = (f: number, i: number) => Math.floor(kf(f, [TYPE_AT[i], TYPE_AT[i] + LINES[i].length * TYPE_RATE], [0, LINES[i].length], EASE.linear));

	// Key frames of the story.
	const SCAN = {t0: S[6] + 6, perRow: 24, move: 18}; // the test band rests on each row, then steps to the next
	const testedAt = (r: number) => SCAN.t0 + r * SCAN.perRow + 4;
	const RESTORE = S[8] + 10; // the source table goes back to how it started
	const SWAP = S[9] + 14; // the number in the query changes
	const DROP = S[9] + 44; // rows that no longer pass leave the answer
	const RECAP = S[10] + 10;
	// Moments that land on a spoken word (content.json `cues`), with the old fixed offsets as fallback.
	const PICK = at(3, 'pick', 46); // SELECT's columns light up
	const NAMED = at(4, 'named', 26); // FROM lights the table's tab
	const TESTED = at(5, 'tested', 44); // WHERE's condition is highlighted

	// ---------------------------------------------------------------------------
	// Camera: close on the table, down to table + query with a soft push-in per clause, back out to all three.
	// ---------------------------------------------------------------------------

	const camera = (f: number) => {
		// [start frame, x, y, scale]: each move takes 35 frames and pushes in softly on the part being explained.
		const stops = [[S[2], 540, 700, 1], [S[3] + 40, 540, 670, 1.06], [S[4], 500, 670, 1.06], [S[5], 570, 760, 1.06], [S[6], 540, 680, 1.08],
			[S[7], 540, 880, 0.84], [S[8], 540, 868, 0.86], [S[9], 540, 900, 0.88], [S[10], 540, 880, 0.84]];
		const t = stops.flatMap(([at]) => [at, at + 35]);
		const track = (k: number, first: number) => kf(f, t, stops.flatMap((stop, i) => [i ? stops[i - 1][k] : first, stop[k]]));
		return {x: track(1, 540), y: track(2, 562), s: track(3, 1.1)};
	};

	// The source table. Dimmed text means "not picked": a column SELECT left out, or a row that failed WHERE.
	const SourceTable: React.FC<{f: number}> = ({f}) => {
		const card = enter(f, [S[0] + 4, S[0] + 34], [0, 1]); // the outline draws itself
		const fill = enter(f, [S[0] + 18, S[0] + 34], [0, 1]); // then the card fills in
		const restore = kf(f, [RESTORE, RESTORE + 18], [0, 1]);
		const recap = kf(f, [RECAP, RECAP + 18], [0, 1]);
		const picked = Math.max(kf(f, [PICK, PICK + 18], [0, 1]) * (1 - restore), recap); // SELECT's columns light up
		const colDim = kf(f, [PICK + 14, PICK + 32], [0, 1]) * (1 - restore);
		const tab = kf(f, [NAMED, NAMED + 18], [0, 1]) * (1 - restore);
		const rowDim = (r: number) => (PASS.includes(r) ? 0 : kf(f, [testedAt(r), testedAt(r) + 12], [0, 1]) * (1 - kf(f, [RESTORE + r * 3, RESTORE + 18 + r * 3], [0, 1])));
		const {x, right, y, h, tabY} = TABLE;
		return (
			<g>
				<g opacity={fill}>
				<rect x={x} y={tabY} width={190} height={70} rx={16} fill={mixColor(C.navy, C.violet, tab)} />
				<text x={x + 95} y={tabY + 35} fontSize={30} fontWeight={600} textAnchor="middle" fill="#fff">{content.table.name}</text>
				<rect x={x} y={y} width={right - x} height={h} rx={18} fill={C.card} filter="url(#soft)" />
				<clipPath id="tableClip">
					<rect x={x} y={y} width={right - x} height={h} rx={18} />
				</clipPath>
				<g clipPath="url(#tableClip)">
					{COLS.map((name, c) => {
						const on = SELECTED[c] ? picked : 0;
						const w = (c + 1 < COL_X.length ? COL_X[c + 1] : right) - COL_X[c];
						return <rect key={name} x={COL_X[c]} y={y} width={w} height={ROW_H} fill={mixColor(C.lavenderTint, C.violet, on)} />;
					})}
					<RecapBands f={f} />
					{ROWS.map((_, r) => <path key={r} d={`M ${x} ${rowY(r)} L ${right} ${rowY(r)}`} stroke={C.grid} strokeWidth={2} />)}
				</g>
				{COLS.map((name, c) => (
					<text key={name} x={COL_X[c] + 28} y={y + 46} fontSize={36} fontWeight={700}
						fill={SELECTED[c] ? mixColor(C.navy, '#ffffff', picked) : mixColor(C.navy, C.dimmed, colDim)}>{name}</text>
				))}
				{ROWS.map((_, r) => {
					const a = enter(f, [S[0] + 30 + r * 5, S[0] + 50 + r * 5], [0, 1]); // wiped in from the left
					return (
						<g key={r} clipPath={`url(#row-${r})`}>
							<clipPath id={`row-${r}`}>
								<rect x={x} y={rowY(r)} width={(right - x) * a} height={ROW_H} />
							</clipPath>
							{COLS.map((name, c) => (
								<text key={name} x={COL_X[c] + 28} y={rowY(r) + 48} fontSize={40} fontWeight={500}
									fill={mixColor(C.navy, C.dimmed, Math.max(rowDim(r), SELECTED[c] ? 0 : colDim))}>{cell(r, c)}</text>
							))}
						</g>
					);
				})}
				</g>
				<rect x={x} y={y} width={right - x} height={h} rx={18} fill="none" stroke={C.navy} strokeWidth={5} strokeLinecap="round" {...draw(card)} />
			</g>
		);
	};

	// Scene 11: SELECT's columns and WHERE's rows as two sets of bands that cross on the answer.
	const RecapBands: React.FC<{f: number}> = ({f}) => {
		if (f < RECAP) return null;
		const {x, right, y, h} = TABLE;
		return (
			<g>
				{COLS.map((name, c) => {
					if (!SELECTED[c]) return null;
					const w = (c + 1 < COL_X.length ? COL_X[c + 1] : right) - COL_X[c];
					const g = enter(f, [RECAP + c * 4, RECAP + 24 + c * 4], [0, 1]);
					return <rect key={name} x={COL_X[c]} y={y + ROW_H} width={w} height={(h - ROW_H) * g} fill={C.lavender} opacity={0.5} />;
				})}
				{PASS_NEW.map((r, k) => {
					const g = enter(f, [RECAP + 56 + k * 8, RECAP + 80 + k * 8], [0, 1]);
					return <rect key={r} x={x + 8} y={rowY(r) + 5} width={right - x - 16} height={ROW_H - 10} rx={12} fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round" {...draw(g)} />;
				})}
			</g>
		);
	};

	// A "?" beside every row; the test turns it into a check or clears it.
	const RowMarks: React.FC<{f: number}> = ({f}) => (
		<g>
			{ROWS.map((_, r) => {
				const y = rowY(r) + ROW_H / 2;
				const q = enter(f, [S[0] + 84 + r * 6, S[0] + 98 + r * 6], [0, 1]) * kf(f, [testedAt(r), testedAt(r) + 8], [1, 0], EASE.in);
				const check = PASS.includes(r) ? enter(f, [testedAt(r) + 4, testedAt(r) + 18], [0, 1]) * kf(f, [RESTORE - 4, RESTORE + 6], [1, 0], EASE.in) : 0;
				return (
					<g key={r}>
						<text x={MARK_X} y={y + 15} fontSize={42} fontWeight={700} textAnchor="middle" fill={C.violet} opacity={q}>?</text>
						{check > 0 && (
							<path d={`M ${MARK_X - 16} ${y} L ${MARK_X - 5} ${y + 12} L ${MARK_X + 17} ${y - 13}`} fill="none" stroke={C.violet} strokeWidth={7}
								strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, check * 1.2)} opacity={check} />
						)}
					</g>
				);
			})}
		</g>
	);

	// Scene 2: a magnifier checks rows one at a time, and a counter shows why that does not scale.
	const RowByRow: React.FC<{f: number}> = ({f}) => {
		const a = S[1];
		const o = enter(f, [a + 8, a + 22], [0, 1]) * kf(f, [S[2] - 12, S[2] - 2], [1, 0], EASE.in);
		if (o <= 0) return null;
		const y = kf(f, [a + 30, a + 48, a + 66, a + 84], [0, 1, 1, 2].map((r) => rowY(r) + ROW_H / 2));
		const chip = enter(f, [a + 56, a + 72], [0, 1]);
		const n = Math.round(ROWS.length * (L.manyRows / ROWS.length) ** kf(f, [a + 76, a + 116], [0, 1], EASE.linear));
		const lens = {x: 800, r: 44};
		return (
			<g opacity={o}>
				<rect x={TABLE.x + 6} y={y - ROW_H / 2 + 4} width={TABLE.right - TABLE.x - 12} height={ROW_H - 8} rx={12} fill={C.lavender} opacity={0.6} style={{mixBlendMode: 'multiply'}} />
				<path d={`M ${lens.x + lens.r * 0.71} ${y + lens.r * 0.71} l 30 30`} stroke={C.navy} strokeWidth={12} strokeLinecap="round" />
				<circle cx={lens.x} cy={y} r={lens.r} fill="none" stroke={C.navy} strokeWidth={7} />
				<g clipPath="url(#countChip)">
					<clipPath id="countChip">
						<rect x={556} y={270} width={328 * chip} height={72} />
					</clipPath>
					<rect x={560} y={278} width={320} height={56} rx={16} fill={C.card} stroke={C.navy} strokeWidth={4} />
					<text x={720} y={317} fontSize={32} fontWeight={600} textAnchor="middle" fill={C.navy}>{n.toLocaleString('en-US')} {L.rows}</text>
				</g>
			</g>
		);
	};

	// Scene 9: the table is back exactly as it started.
	const UnchangedChip: React.FC<{f: number}> = ({f}) => {
		const wipe = enter(f, [RESTORE + 24, RESTORE + 42], [0, 1]);
		const o = kf(f, [S[10] - 10, S[10]], [1, 0], EASE.in);
		if (wipe <= 0 || o <= 0) return null;
		return (
			<g opacity={o} clipPath="url(#unchangedChip)">
				<clipPath id="unchangedChip">
					<rect x={616} y={270} width={268 * wipe} height={72} />
				</clipPath>
				<rect x={620} y={278} width={260} height={56} rx={16} fill={C.card} stroke={C.violet} strokeWidth={4} />
				<text x={750} y={317} fontSize={32} fontWeight={600} textAnchor="middle" fill={C.navy}>{L.unchanged}</text>
			</g>
		);
	};

	// The query card: the question typed one clause at a time.
	const QueryCard: React.FC<{f: number}> = ({f}) => {
		const a = enter(f, [S[2] + 14, S[2] + 44], [0, 1]); // the outline draws itself
		const fill = enter(f, [S[2] + 30, S[2] + 44], [0, 1]);
		if (a <= 0) return null;
		const {x, y, w, h} = CARD;
		const line = f < TYPE_AT[1] ? 0 : f < TYPE_AT[2] ? 1 : 2;
		const cursor = enter(f, [S[2] + 40, S[2] + 52], [0, 1]) * kf(f, [TYPE_AT[2] + 40, TYPE_AT[2] + 50], [1, 0], EASE.in);
		const baseline = (i: number) => CODE.y + i * CODE.line;
		const condX = CODE.x + (KW[2] + 1) * CODE.cw - 10;
		const condW = (LINES[2].length - KW[2] - 1) * CODE.cw + 20;
		const cond = enter(f, [TESTED, TESTED + 18], [0, 1]);
		const numX = CODE.x + NUM_AT * CODE.cw;
		const out = kf(f, [SWAP, SWAP + 10], [0, 1], EASE.in);
		const into = enter(f, [SWAP + 8, SWAP + 24], [0, 1]);
		const under = enter(f, [SWAP + 20, SWAP + 34], [0, 1]);
		const code = {fontFamily: MONO, fontSize: CODE.size, style: {whiteSpace: 'pre' as const}};
		return (
			<g>
				<rect x={x} y={y} width={w} height={h} rx={20} fill={C.card} filter="url(#soft)" opacity={fill} />
				<rect x={x} y={y} width={w} height={h} rx={20} fill="none" stroke={C.navy} strokeWidth={5} strokeLinecap="round" {...draw(a)} />
				<g opacity={fill}>
					<rect x={x + w - 122} y={y + 20} width={100} height={48} rx={14} fill={C.navy} />
					<text x={x + w - 72} y={y + 54} fontSize={28} fontWeight={600} textAnchor="middle" fill="#fff">{L.sql}</text>
				</g>
				<rect x={condX} y={baseline(2) - 42} width={condW * cond} height={56} rx={12} fill={C.lavender} />
				{LINES.map((text, i) => {
					const n = typed(f, i);
					const end = i === 2 ? Math.min(n, NUM_AT) : n;
					return (
						<text key={i} x={CODE.x} y={baseline(i)} {...code} fill={C.navy} fontWeight={500}>
							<tspan fill={C.violet} fontWeight={700}>{text.slice(0, Math.min(n, KW[i]))}</tspan>
							{text.slice(KW[i], Math.max(KW[i], end))}
						</text>
					);
				})}
				<clipPath id="numClip">
					<rect x={numX - 4} y={baseline(2) - 40} width={String(Q.value).length * CODE.cw + 8} height={52} />
				</clipPath>
				<g clipPath="url(#numClip)">
					<text x={numX} y={baseline(2) - out * 44} {...code} fontWeight={500} fill={C.navy} opacity={1 - out}>
						{LINES[2].slice(NUM_AT, Math.max(NUM_AT, typed(f, 2)))}
					</text>
					<text x={numX} y={baseline(2) + (1 - into) * 44} {...code} fontWeight={700} fill={C.navy} opacity={into > 0 ? 1 : 0}>{Q.newValue}</text>
				</g>
				<path d={`M ${numX} ${baseline(2) + 14} L ${numX + String(Q.newValue).length * CODE.cw} ${baseline(2) + 14}`} fill="none" stroke={C.violet} strokeWidth={6} strokeLinecap="round" {...draw(under)} />
				<rect x={CODE.x + typed(f, line) * CODE.cw + 3} y={baseline(line) - 36} width={5} height={46} rx={2} fill={C.violet} opacity={cursor} />
			</g>
		);
	};

	// Scene 5: a line links the word "leads" in the query to the table it names.
	const FromLink: React.FC<{f: number}> = ({f}) => {
		const p = enter(f, [NAMED + 4, NAMED + 30], [0, 1]);
		const o = kf(f, [S[5] - 2, S[5] + 8], [1, 0], EASE.in);
		if (p <= 0 || o <= 0) return null;
		const y0 = CODE.y + CODE.line - 12;
		const y1 = TABLE.tabY + 24;
		return (
			<g opacity={o}>
				<path d={`M ${CARD.x} ${y0} L 104 ${y0} Q 92 ${y0} 92 ${y0 - 12} L 92 ${y1 + 12} Q 92 ${y1} 104 ${y1} L ${TABLE.x - 8} ${y1}`}
					fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round" {...draw(p)} />
				<ArrowHead x={TABLE.x - 6} y={y1} angle={0} color={C.violet} w={5} size={16} opacity={p > 0.9 ? 1 : 0} />
			</g>
		);
	};

	// Scenes 6-7: WHERE looks at one column, then a test line crosses every row.
	const RowTest: React.FC<{f: number}> = ({f}) => {
		const o = kf(f, [S[7], S[7] + 10], [1, 0], EASE.in);
		if (f < TESTED + 14 || o <= 0) return null;
		const ring = enter(f, [TESTED + 16, TESTED + 46], [0, 1]);
		const t1 = SCAN.t0 + ROWS.length * SCAN.perRow;
		const band = enter(f, [SCAN.t0 - 12, SCAN.t0], [0, 1]) * kf(f, [t1, t1 + 8], [1, 0], EASE.in);
		const stops = ROWS.flatMap((_, r) => [SCAN.t0 + r * SCAN.perRow, SCAN.t0 + (r + 1) * SCAN.perRow - SCAN.move]);
		const y = kf(f, stops, ROWS.flatMap((_, r) => [rowY(r), rowY(r)]));
		const x = COL_X[TEST_COL];
		return (
			<g opacity={o}>
				<rect x={x + 6} y={TABLE.y + 6} width={TABLE.right - x - 12} height={TABLE.h - 12} rx={14} fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round" {...draw(ring)} />
				<g opacity={band}>
					<rect x={TABLE.x} y={y} width={TABLE.right - TABLE.x} height={ROW_H} fill={C.lavender} opacity={0.5} style={{mixBlendMode: 'multiply'}} />
					<rect x={TABLE.x - 8} y={y} width={TABLE.right - TABLE.x + 16} height={ROW_H} rx={12} fill="none" stroke={C.violet} strokeWidth={5} />
				</g>
			</g>
		);
	};

	// Scene 8 on: the answer. Copies of the picked cells travel down behind the query card and land here.
	const ResultTable: React.FC<{f: number}> = ({f}) => {
		const a = enter(f, [S[7] + 20, S[7] + 48], [0, 1]); // the outline draws itself
		const fill = enter(f, [S[7] + 34, S[7] + 48], [0, 1]);
		if (a <= 0) return null;
		const shrink = kf(f, [DROP + 10, DROP + 30], [0, PASS.length - PASS_NEW.length]);
		const {x, y, w, tabY, colX} = RESULT;
		const h = ROW_H * (1 + PASS.length - shrink);
		const cols = COLS.map((name, c) => ({name, c})).filter(({c}) => SELECTED[c]);
		return (
			<g>
				<g opacity={fill}>
					<rect x={x} y={tabY} width={190} height={70} rx={16} fill={C.violet} />
					<text x={x + 95} y={tabY + 35} fontSize={30} fontWeight={600} textAnchor="middle" fill="#fff">{L.result}</text>
					<rect x={x} y={y} width={w} height={h} rx={18} fill={C.card} filter="url(#soft)" />
					<clipPath id="resultClip">
						<rect x={x} y={y} width={w} height={h} rx={18} />
					</clipPath>
					<g clipPath="url(#resultClip)">
						<rect x={x} y={y} width={w} height={ROW_H} fill={C.lavenderTint} />
						{PASS.map((_, k) => <path key={k} d={`M ${x} ${y + ROW_H * (k + 1)} L ${x + w} ${y + ROW_H * (k + 1)}`} stroke={C.grid} strokeWidth={2} />)}
					</g>
					{cols.map(({name}, j) => <text key={name} x={colX[j] + 28} y={y + 46} fontSize={36} fontWeight={700} fill={C.navy}>{name}</text>)}
				</g>
				<rect x={x} y={y} width={w} height={h} rx={18} fill="none" stroke={C.violet} strokeWidth={5} strokeLinecap="round" {...draw(a)} />
				{PASS.flatMap((r, k) => {
					const t = S[7] + 50 + k * 14;
					const p = kf(f, [t, t + 40], [0, 1]);
					if (p <= 0) return [];
					const stays = PASS_NEW.includes(r);
					const o = stays ? 1 : kf(f, [DROP, DROP + 12], [1, 0], EASE.in);
					const up = stays ? (k - PASS_NEW.indexOf(r)) * ROW_H * kf(f, [DROP + 10, DROP + 30], [0, 1]) : 0;
					const top = rowY(r) + (y + ROW_H * (k + 1) - up - rowY(r)) * p;
					const left = TABLE.x + (x - TABLE.x) * p;
					const chip = enter(f, [t, t + 12], [0, 1]) * kf(f, [t + 32, t + 40], [1, 0], EASE.in);
					return [
						<rect key={`${r}-chip`} x={left + 4} y={top + 5} width={TABLE.right - TABLE.x + (w - (TABLE.right - TABLE.x)) * p - 8} height={ROW_H - 10} rx={12}
							fill={C.card} stroke={C.violet} strokeWidth={4} opacity={chip} />,
						...cols.map(({name, c}, j) => (
							<text key={`${r}-${name}`} x={COL_X[c] + 28 + (colX[j] - COL_X[c]) * p} y={top + 48} fontSize={40} fontWeight={500} fill={C.navy} opacity={o}>{cell(r, c)}</text>
						)),
					];
				})}
			</g>
		);
	};

	const world = (f: number) => (
		<>
			<SourceTable f={f} />
			<RowByRow f={f} />
			<RowMarks f={f} />
			<RowTest f={f} />
			<UnchangedChip f={f} />
			<ResultTable f={f} />
			<FromLink f={f} />
			<QueryCard f={f} />
		</>
	);
	return {camera, world};
};
