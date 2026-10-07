// Measures each public/vo/scene-N.wav, then writes:
//   src/vo-timing.json  (speech duration per scene, used for subtitle word timing)
//   ../output/<name>-explainer.srt  (timed captions, next to the rendered MP4)
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const root = new URL('..', import.meta.url);
const c = JSON.parse(readFileSync(new URL('src/content.json', root)));

// Seconds until the last sample louder than the threshold (ignores trailing silence).
const speechLength = (file) => {
	const b = readFileSync(file);
	const channels = b.readUInt16LE(22), rate = b.readUInt32LE(24), bits = b.readUInt16LE(34);
	if (bits !== 16) throw new Error(`${file}: expected 16-bit PCM`);
	const data = b.indexOf('data') + 8;
	let last = 0;
	for (let i = data; i + 1 < b.length; i += 2) if (Math.abs(b.readInt16LE(i)) > 800) last = i;
	return (last - data) / 2 / channels / rate;
};

const durations = c.scenes.map((_, i) => +speechLength(new URL(`public/vo/scene-${i + 1}.wav`, root)).toFixed(2));
writeFileSync(new URL('src/vo-timing.json', root), JSON.stringify(durations) + '\n');

const ts = (s) => {
	const ms = Math.round(s * 1000);
	const p = (n, w = 2) => String(n).padStart(w, '0');
	return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = c.scenes
	.map((s, i) => `${i + 1}\n${ts(s.voStart)} --> ${ts(s.voStart + durations[i] + 0.2)}\n${s.voiceover.replaceAll('*', '')}\n`)
	.join('\n');
const name = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).name.replace(/-video$/, '-explainer');
mkdirSync(new URL('../output', root), {recursive: true});
writeFileSync(new URL(`../output/${name}.srt`, root), srt);

c.scenes.forEach((s, i) => {
	const next = i + 1 < c.scenes.length ? c.scenes[i + 1].start : c.durationSeconds;
	const words = s.voiceover.split(/\s+/).length;
	const end = s.voStart + durations[i];
	console.log(`scene ${i + 1}: ${durations[i]}s, ${Math.round((words / durations[i]) * 60)} wpm, ends ${end.toFixed(2)}s / scene ends ${next}s${end > next ? '  <-- OVERRUNS' : ''}`);
});
