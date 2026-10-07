import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadBangla} from '@remotion/google-fonts/HindSiliguri';
import guideline from '../../Brand_Guideline/guideline.json';
import {parseMarked} from './core';

// Everything brand-specific comes from Brand_Guideline/guideline.json: swap that file to re-brand.
// The font families are the exception: their loaders are static imports, so a different typeface
// needs the four import lines above changed.

const P = guideline.color_palette;
const X = guideline.pipeline;

export const C = {
	background: P.neutral.off_white.hex,
	card: P.neutral.white.hex,
	grid: P.neutral.light_gray.hex,
	text: P.neutral.near_black.hex,
	muted: P.neutral.body_gray.hex,
	navy: P.primary.deep_navy.hex,
	violet: P.primary.brand_violet.hex,
	purple: P.primary.electric_purple.hex,
	lavender: P.primary.soft_lavender.hex,
	lavenderTint: X.derived_colors.lavender_tint,
	dimmed: X.derived_colors.dimmed,
};

export const BRAND = {
	name: guideline.brand.name,
	tagline: guideline.brand.tagline,
	cta: guideline.call_to_action.examples[0],
	highlight: X.wordmark_highlight, // the letter of the wordmark drawn in the accent colour
};

const weights = ['400', '500', '600', '700'] as const;
const inter = loadInter('normal', {weights: [...weights], subsets: ['latin']}).fontFamily;
// Bangla text falls back to Hind Siliguri; Latin text stays in the primary face.
const bangla = loadBangla('normal', {weights: [...weights], subsets: ['bengali']}).fontFamily;
export const FONT = `${inter}, ${bangla}, ${guideline.typography.primary_font.fallback}`;
export const LOGO_FONT = `${loadPoppins('normal', {weights: ['700'], subsets: ['latin']}).fontFamily}, ${FONT}`;
// Code is set in a monospace face so cursors and highlights can be placed by character count.
export const MONO = `${loadMono('normal', {weights: ['500', '700'], subsets: ['latin']}).fontFamily}, monospace`;

export type Format = keyof typeof X.formats;

/** Screen layout for a format, derived from the guideline's safe area. Headline on top, captions at the bottom, the world between. */
export const layout = (format: Format) => {
	const f = X.formats[format];
	const safe = guideline.video_specifications.safe_area;
	const [W, H] = [f.width, f.height];
	const left = Math.round((W * safe.left_percent) / 100);
	const top = Math.round((H * safe.top_percent) / 100);
	const headlineY = top + X.text.headline_px;
	const subBottom = Math.round((H * (100 - safe.bottom_percent)) / 100) - 14;
	const captionBox = 34 + f.caption_lines * 54;
	const worldTop = headlineY + (f.headline_lines - 1) * 72 + 78;
	const worldBottom = subBottom - captionBox - 28;
	return {
		W, H, left, right: W - left, top, headlineY, subBottom, worldTop, worldBottom,
		headlineLines: f.headline_lines, captionLines: f.caption_lines,
		headlinePx: X.text.headline_px, captionPx: X.text.caption_px,
		// The world is drawn in screen coordinates as seen when the camera is at (cx, cy) with scale 1.
		cx: W / 2, cy: Math.round((worldTop + worldBottom) / 2),
		zone: {x: left, y: worldTop, w: W - 2 * left, h: worldBottom - worldTop},
	};
};
export type Layout = ReturnType<typeof layout>;

/** `cues` names moments of the scene after the spoken word they land on, e.g. {"pick": "columns"}. */
export type Scene = {start: number; headline: string; voiceover: string; voStart: number; tts?: string; rate?: string; cues?: Record<string, string | undefined>};
export type Content = {fps: number; durationSeconds: number; format?: string; scenes: Scene[]; brand?: {cta?: string; tagline?: string}};
export type Words = {scenes: {duration: number; timing?: string; words: {text: string; start: number; end: number}[]}[]};

const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Frame arithmetic for one video. S[i] is scene i's first frame; cue() is the frame a given spoken word starts,
 * so an animation can land on the word that names it.
 */
export const timeline = (content: Content, words: Words) => {
	const FPS = content.fps;
	const END = Math.round(content.durationSeconds * FPS);
	const S = content.scenes.map((s) => Math.round(s.start * FPS));
	const sceneEnd = (i: number) => (i + 1 < S.length ? S[i + 1] : END);
	const shown = content.scenes.map((s) => parseMarked(s.voiceover));
	/** Start and end (seconds from the start of the line) of caption word k in scene i. */
	const wordTime = (i: number, k: number) => {
		const spoken = words.scenes[i];
		const n = shown[i].length;
		if (!spoken || !spoken.words.length) {
			const d = spoken?.duration ?? 3; // no timings yet: spread the words evenly
			return {start: (k / n) * d, end: ((k + 1) / n) * d};
		}
		// The spoken text can differ from the caption (e.g. "S Q L" for "SQL"): map by position when the counts differ.
		const j = spoken.words.length === n ? k : Math.min(spoken.words.length - 1, Math.round((k / n) * spoken.words.length));
		return spoken.words[j];
	};
	/**
	 * Frame at which `word` is spoken in scene i, minus `lead` frames (a visual that lands 0-3 frames before its
	 * word reads as in sync; one that lands late does not). `nth` picks a later occurrence. Throws when the word is
	 * not in the scene's voiceover, so a script edit cannot silently detach an animation from its word.
	 */
	const cue = (i: number, word: string, {lead = 2, nth = 0}: {lead?: number; nth?: number} = {}) => {
		const hits = shown[i].map((w, k) => (bare(w.w) === bare(word) ? k : -1)).filter((k) => k >= 0);
		if (hits[nth] === undefined) throw new Error(`cue: "${word}" (occurrence ${nth + 1}) is not in the voiceover of scene ${i + 1}: "${content.scenes[i].voiceover}"`);
		return Math.round((content.scenes[i].voStart + wordTime(i, hits[nth]).start) * FPS) - lead;
	};
	/** Frame of a named moment: the scene's cue word when content.json gives one, otherwise `fallback` frames into the scene. */
	const at = (i: number, name: string, fallback: number) => {
		const word = content.scenes[i].cues?.[name];
		return word ? cue(i, word) : S[i] + fallback;
	};
	const speech = (i: number) => words.scenes[i]?.duration ?? 3;
	return {FPS, END, S, sceneEnd, cue, at, wordTime, speech, shown};
};
export type Timeline = ReturnType<typeof timeline>;
