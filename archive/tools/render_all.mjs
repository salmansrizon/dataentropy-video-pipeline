// Renders video projects into the shared output/ folder, one after another.
// Usage: node tools/render_all.mjs [project-dir ...]   (default: every *-video folder)
import {execSync} from 'node:child_process';
import {readdirSync} from 'node:fs';

const root = new URL('..', import.meta.url);
const projects = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(root).filter((d) => d.endsWith('-video'));
for (const p of projects) {
	console.log(`\n== ${p}`);
	execSync('npm run render', {cwd: new URL(`${p}/`, root), stdio: 'inherit'});
}
