# Video pipeline: instructions for Claude

This repository turns a topic into a narrated, animated explainer video. You (Claude) run the pipeline: you write the brief and script, build the scenes, run the tools, read the reports and fix what they flag. The tools hold the rules; this file tells you the order and the decisions already made.

Never promise an error-free video. Report what was checked, what was not, and what failed.

## Setup (once per machine)

```
python tools/setup.py            # Node packages, Python packages, the Kokoro voice environment, self-test
python tools/setup.py --with chatterbox   # optional: the expressive English voice (about 3 GB of models)
```

- Needs Node 18+, Python 3.10+ and `uv`. Tested on Windows 11; macOS and Linux are untested.
- `TYPESAFE_API_KEY` is optional. Set it in the user's own environment; never write it into a file, a prompt, a log or a commit.
- The `jev` and `motion-design` skills are third-party and are not in this repository. Their sources are in `skills-lock.json`; install them if they are missing and read `motion-design` before designing motion.

## Layout

| Path | What it holds |
|---|---|
| `Brand_Guideline/guideline.json` | Brand colours, fonts, limits, and the `pipeline` block the engine and the gate read. Swap this file to re-brand. |
| `engine/` | Shared Remotion code: timing and word cues, layout per format, headline, captions, outro, building blocks. `engine/template/` is the start of every new video. |
| `videos/<name>/` | One video: `src/content.json` (script, timing, voice), `src/Scenes.tsx` (its world), `motion-inventory.json`. `public/` and `out/` are generated and not committed. |
| `prompts/` | Briefs (`<name>.json`), brief reviews, research notes. |
| `tools/` | The pipeline commands below. |
| `archive/` | Earlier self-contained videos, kept for reference. Do not copy their structure; do not edit them unless asked. |
| `output/` | Rendered MP4s and captions. Not committed. |

## Pipeline (every video)

1. **Scope.** Confirm topic, audience, length, format (`9:16` or `16:9`) and language with the user if they are not stated. One main idea per video; a long video is a sequence of such ideas.
2. **Research.** Facts come from primary sources and go into `prompts/research/<topic>.md` with links. Mark anything unverified. Do not put an unverified claim on screen.
3. **Scaffold.** `python tools/new_video.py <name> --seconds N --format 9:16 --language en`. Scene count and pacing scale with the length.
4. **Brief.** Write `prompts/<name>.json` in the shape of the existing briefs (task, central visual, timeline, rules, sources), then `python tools/brief_review.py prompts/<name>.json`. Fix FAIL rows.
5. **Script.** Fill `videos/<name>/src/content.json`: per scene `start`, `headline` (`*word*` = accent, `\n` = line break), `voiceover` (spoken, conversational, one example carried through), `voStart`, optional `tts` (spoken form, e.g. "S Q L") and `cues`.
6. **Voice.** `python tools/vo.py <name> --fit` records every line, fits each line's rate to the brand pace and its scene, and writes `src/words.json` with the time of every word. If lines overrun, shorten them or move scene starts, then rerun.
7. **Build.** Write `src/Scenes.tsx` from engine blocks. Key every animation to a scene start (`S[i] + frames`) or to a spoken word (`at(i, 'name', fallback)` with `"cues": {"name": "word"}` in `content.json`). List every animation in `motion-inventory.json`, described as the viewer sees it.
8. **Look.** `python tools/render.py <name> --stills` and inspect every still for clipping, overlaps, unreadable text and anything outside the safe area. Fix and repeat.
9. **Music.** `python tools/make_music.py <name>`. Every video gets its own variation.
10. **Reviews.** `python tools/motion_review.py <name>`, `python tools/human_feel_review.py <name>`, optionally `python tools/voice_review.py <name>`. Confirm or override every `change` and `review` row and record the reason in `out/motion-review-confirmations.json`.
11. **Gate and render.** `python tools/render.py <name>` runs `tools/check.py` first. A FAIL stops the render. Renders run one at a time.
12. **Report.** Tell the user the file, what the gate and reviews found, every warning, every override and its reason, and what you did not check (you cannot hear audio).

## Rules already decided

- **Entrances.** Elements appear by fade, masked wipe, line-draw-then-fill or colour change. They never rise, pop or scale as they appear. Soft camera push-ins are allowed. This overrides the guideline's "cards rise 20-30 px" line.
- **Sync.** Trigger a highlight on the word that names the element, about 2 frames early, and change nothing else at that moment. A cue word must be in the scene's voiceover; the gate checks this.
- **Captions.** Full sentence, each word lighting up as it is spoken, as the brand guideline specifies.
- **Motion.** Easing tokens from the engine: `EASE.out` for entering, `EASE.inOut` for things already on screen, `EASE.in` for permanent exits, `EASE.linear` for typing and counting. No bounce. Every animation needs a job.
- **Colour and type.** Only brand palette colours (`C.*`). Text at least 24 px; headlines and captions use the engine's sizes. At most three focal points per scene.
- **Music.** One track per video, varied by video name. Do not change the music of an existing video unless asked.
- **Voices.** English: Kokoro `af_heart` (Apache-2.0) by default; Chatterbox (MIT) when the user wants expression. Bangla: the VITS model through its Space, which drops Latin letters and digits, so write those in Bangla script in `tts`. The `edge` engine is for drafts only and the gate refuses it for a published video.
- **SQL on screen.** One short query, in syntax that works across PostgreSQL, MySQL, SQLite and SQL Server; no `LIMIT`/`TOP`.

## Judgments: Jev, or you

Every review tool asks its judgment questions through `tools/lib.py`.

- With `TYPESAFE_API_KEY` set, Jev answers. You then confirm or override each resulting `change`/`review` row and record why. Never change a question, a policy or a threshold during a review to get a pass.
- Without a key the tool writes `<review>.questions.json`, prints `NEEDS CLAUDE` and exits with code 3. Read the state, answer every question on its own merits in `<review>.answers.json` (the questions file says how), and rerun the tool. Those results are labelled as Claude's. Say so in your report; do not describe them as Jev's.
- A confidence or probability is not a test result. A review that passed does not prove the video is good.

## The gate

`python tools/check.py <name>` writes `out/check-report.json`.

- **FAIL (blocks the render):** broken scene order or lengths, missing closing scene, headline or caption too long, a line that runs past its scene, audio older than the script, a cue word that is not spoken, a draft-only voice, missing music, a colour outside the palette, text below the minimum size, a rising or scaling entrance, an unresolved motion-review row, a missing review, a type error.
- **WARN (reported):** pace outside the brand range, estimated word timings, a review judged by Claude, a missing brief review, an unusually long hook or closing scene.
- `--override "<reason>"` renders anyway and records the reason. Use it only when the user agrees; report it.

## Lengths and formats

- `durationSeconds` can be anything from about 12 seconds to about 15 minutes. From 180 seconds the gate applies long-video scene lengths, and `tools/render.py` renders in 60-second parts and joins them.
- `9:16` gives two headline lines and two caption lines; `16:9` gives one of each. Build scenes inside `layout(format).zone`.

## Working rules

- Follow the user's stated scope. Ask only when the answer changes what you build.
- Do not reset, overwrite or delete the user's work. Do not push, publish or delete a repository without being asked.
- Re-run the gate after any change to the script, timing, voice or scenes; an earlier pass does not carry over.
- Keep changes small and in the place they belong: brand values in the guideline, shared behaviour in `engine/`, one video's content in its folder.

## Known pitfalls

- Keyframe frames passed to `kf` must be strictly increasing.
- `mixColor` needs `#rrggbb` inputs.
- A render run alongside another render or a batch of stills can stall the headless browser. Run one at a time.
- The ffmpeg bundled with Remotion has only a few audio filters (`atempo`, `loudnorm`, `volume`, `amix`); EQ and compression need a full ffmpeg.
- Model downloads are large. They go to `.hf-cache/` in the repository; keep free disk space on that drive.
