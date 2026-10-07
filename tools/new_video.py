"""Start a new video from the engine template, with scenes sized for its length.

Run: python tools/new_video.py <name> [--seconds 60] [--format 9:16|16:9] [--language en|bn] [--voice kokoro|chatterbox|bangla_vits|edge]
Creates videos/<name>/ with a scene scaffold (hook, body scenes, logo and call to action). Then: write the brief in
prompts/<name>.json, fill in src/content.json, build src/Scenes.tsx, and follow the pipeline in CLAUDE.md.
"""
import argparse, re, shutil, subprocess, sys

from lib import PIPE, ROOT, save

p = argparse.ArgumentParser()
p.add_argument("name")
p.add_argument("--seconds", type=float, default=60)
p.add_argument("--format", default="9:16", choices=sorted(PIPE["formats"]))
p.add_argument("--language", default="en")
p.add_argument("--voice", default=None)
a = p.parse_args()

if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", a.name):
    sys.exit("name: lower-case letters, digits and hyphens only (it becomes the folder, package and file name)")
video = ROOT / "videos" / a.name
if video.exists():
    sys.exit(f"{video} already exists")
shutil.copytree(ROOT / "engine/template", video)
for sub in ("public", "out"):
    (video / sub).mkdir()

long = a.seconds >= PIPE["long_video_from_seconds"]
cta = 5 if a.seconds < 45 else 6
hook = 4 if a.seconds < 30 else 5
body = a.seconds - hook - cta
if body < PIPE["scene_seconds"]["short"][0]:
    sys.exit("too short: a video needs a hook, at least one body scene and a closing scene (about 12 seconds minimum)")
n = max(1, round(body / (9 if long else 5)))
starts = [0.0] + [round(hook + k * body / n, 1) for k in range(n)] + [a.seconds - cta]


def scene(t, headline, voiceover):
    return {"start": t, "headline": headline, "voiceover": voiceover, "voStart": round(t + 0.3, 1)}


scenes = [scene(0.0, "A question the viewer\n*wants answered*?", "Open with the problem, in one spoken sentence.")]
scenes += [scene(t, f"Step {k + 1}: one idea,\n*one key word*", "One short spoken sentence for this step.") for k, t in enumerate(starts[1:-1])]
scenes[1]["cues"] = {"point": "sentence"}
scenes.append(scene(starts[-1], "", "Follow *DataEntropy* for more."))
if PIPE["formats"][a.format]["headline_lines"] == 1:
    for s in scenes:
        s["headline"] = s["headline"].replace("\n", " ")
voice = a.voice or ("bangla_vits" if a.language == "bn" else "kokoro")
save(video / "src/content.json", {"fps": 30, "durationSeconds": a.seconds, "format": a.format, "language": a.language,
                                  "voice": {"engine": voice, **({"name": "af_heart"} if voice == "kokoro" else {})}, "scenes": scenes})
save(video / "src/words.json", {"scenes": []})
save(video / "package.json", {"name": a.name, "version": "1.0.0", "private": True,
                              "scripts": {"preview": "remotion studio src/index.ts", "typecheck": "tsc --noEmit"},
                              "dependencies": {"@dataentropy/engine": "1.0.0", "@remotion/cli": "4.0.529", "react": "^18.3.1", "react-dom": "^18.3.1", "remotion": "4.0.529"},
                              "devDependencies": {"@types/react": "^18.3.31", "typescript": "^7.0.2"}})
subprocess.run("npm install", cwd=ROOT, shell=True, check=True, stdout=subprocess.DEVNULL)
print(f"created videos/{a.name}: {a.seconds:g}s, {a.format}, {len(scenes)} scenes ({'long' if long else 'short'} pacing), voice {voice}")
