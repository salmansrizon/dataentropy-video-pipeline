import {Easing} from 'remotion';

// Motion primitives shared by every video. All animation is a pure function of the frame number,
// so any frame renders the same when scrubbing or rendering in parts.

export type Ease = (t: number) => number;

// Easing tokens (motion-design skill): out for things entering (the brand curve), inOut for things already
// on screen that move or morph, in only for permanent exits, linear for time-based motion.
export const EASE = {
	out: Easing.bezier(0.22, 1, 0.36, 1),
	inOut: Easing.bezier(0.645, 0.045, 0.355, 1),
	in: Easing.bezier(0.55, 0.055, 0.675, 0.19),
	linear: (t: number) => t,
};

/** Keyframe track: kf(frame, [f0, f1, ...], [v0, v1, ...], easing), clamped. One curve, or one per segment. */
export const kf = (f: number, frames: number[], values: number[], easing: Ease | Ease[] = EASE.inOut) => {
	if (f <= frames[0]) return values[0];
	const i = frames.findIndex((_, k) => k + 1 < frames.length && f < frames[k + 1]);
	if (i < 0) return values[values.length - 1];
	const e = Array.isArray(easing) ? easing[i] : easing;
	return values[i] + (values[i + 1] - values[i]) * e((f - frames[i]) / (frames[i + 1] - frames[i]));
};
export const enter = (f: number, frames: number[], values: number[]) => kf(f, frames, values, EASE.out);
export const fadeIn = (f: number, at: number, d = 14) => enter(f, [at, at + d], [0, 1]);
export const fadeOut = (f: number, at: number, d = 10) => kf(f, [at, at + d], [1, 0], EASE.in);

/** Stroke props that draw a path or rect outline from 0 to p. */
export const draw = (p: number) => ({pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p, opacity: p > 0 ? 1 : 0});

/** Mix two #rrggbb colours. Returns hex so calls can nest. */
export const mixColor = (a: string, b: string, t: number) => {
	const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/** "Some *marked words* here" -> words with a highlight flag. */
export const parseMarked = (s: string) =>
	s.split(/(\*[^*]+\*)/).flatMap((part) => {
		const hl = part.startsWith('*');
		return part.replaceAll('*', '').split(/\s+/).filter(Boolean).map((w) => ({w, hl}));
	});
/** A word with its leading space, except before punctuation. */
export const spaced = (w: string, k: number) => (k > 0 && !/^[?.,!:;।]/.test(w) ? ' ' : '') + w;

/** Camera stops: [start frame, x, y, scale]. Each move takes `d` frames. */
export const camTrack = (f: number, first: number[], stops: number[][], d = 35) => {
	const t = stops.flatMap(([at]) => [at, at + d]);
	const track = (k: number) => (stops.length ? kf(f, t, stops.flatMap((stop, i) => [i ? stops[i - 1][k] : first[k - 1], stop[k]])) : first[k - 1]);
	return {x: track(1), y: track(2), s: track(3)};
};

/** Position of an item as a list is re-ordered several times: steps = [[frame, order], ...], order[i] = item at place i. */
export const orderPos = (f: number, item: number, steps: [number, number[]][], d = 30) =>
	steps.reduce((pos, [at, order], k) => (k === 0 ? order.indexOf(item) : pos + (order.indexOf(item) - steps[k - 1][1].indexOf(item)) * kf(f, [at, at + d], [0, 1])), 0);

/** A band that rests on each row in turn: frames and y positions for kf, and when row r is reached. */
export const band = (t0: number, n: number, rowY: (r: number) => number, perRow = 24, move = 18) => ({
	frames: Array.from({length: n}, (_, r) => [t0 + r * perRow, t0 + (r + 1) * perRow - move]).flat(),
	ys: Array.from({length: n}, (_, r) => [rowY(r), rowY(r)]).flat(),
	at: (r: number) => t0 + r * perRow + 4,
	end: t0 + n * perRow,
});
