# DataEntropy video pipeline

Turns a topic into a narrated, animated explainer video: research, script, voice, word-timed animation, music, quality checks, and a rendered MP4. Built on [Remotion](https://www.remotion.dev) and run by Claude Code, which follows the instructions in `CLAUDE.md`.

- Any length from about 12 seconds to about 15 minutes, in 9:16 or 16:9.
- Voice from local, openly licensed models; every caption word and highlight is timed to the spoken word.
- A quality gate blocks a render when something objective is wrong (a line running past its scene, off-brand colour, text too small, a pop-in entrance, an unresolved review).
- Brand colours, fonts and limits come from one file, `Brand_Guideline/guideline.json`.

## Set up

Needs Node 18+, Python 3.10+ and [uv](https://docs.astral.sh/uv/).

```
git clone <this repository>
cd dataentropy-video-pipeline
python tools/setup.py
```

Setup installs the Node packages, the Python packages for the tools, and the Kokoro voice in its own environment, then type-checks everything. Tested on Windows 11. The same commands are meant to work on macOS and Linux but have not been run there.

Optional:

- `python tools/setup.py --with chatterbox` adds the expressive English voice (about 3 GB of models, slow on a CPU).
- `TYPESAFE_API_KEY` in your environment lets [Jev](https://docs.typesafe.ai) make the review judgments. Without it, Claude answers the same questions and the results are labelled as Claude's.
- The `jev` and `motion-design` agent skills are third-party; their sources are listed in `skills-lock.json`.

## Make a video

Open the repository in Claude Code and ask for a video, for example: "Make a 90-second vertical video explaining SQL indexes for beginners." Claude follows the pipeline in `CLAUDE.md`. The commands it runs:

| Step | Command |
|---|---|
| Start a video | `python tools/new_video.py <name> --seconds 60 --format 9:16` |
| Review the brief | `python tools/brief_review.py prompts/<name>.json` |
| Record the voice, fit the pace, save word timings | `python tools/vo.py <name> --fit` |
| Stills of every scene | `python tools/render.py <name> --stills` |
| Music | `python tools/make_music.py <name>` |
| Reviews | `python tools/motion_review.py <name>`, `python tools/human_feel_review.py <name>`, `python tools/voice_review.py <name>` |
| Quality gate | `python tools/check.py <name>` |
| Render (runs the gate first) | `python tools/render.py <name>` |

The result is `output/<name>.mp4` with captions in `output/<name>.srt`.

Two finished examples are in `videos/`: `sql-select` (English) and `sql-select-bn` (the same scenes with a Bangla script and voice).

## What is where

| Path | Contents |
|---|---|
| `engine/` | Shared Remotion code and the template for new videos |
| `videos/` | One folder per video: script, scenes, motion inventory |
| `tools/` | Pipeline commands, voice engines, the quality gate |
| `prompts/` | Briefs, brief reviews, research notes |
| `Brand_Guideline/` | The brand file the engine and the gate read |
| `reports/`, `research_notes/` | Research behind the voice and motion decisions |
| `archive/` | Earlier self-contained videos, kept for reference |

Rendered videos, recorded audio, model downloads and installed packages are not in the repository; they are regenerated on each machine.

## Limits to know

- The checks measure what code can measure and ask a model to judge the rest. Nothing here listens to the audio or watches the finished video; a person should.
- The Bangla voice is called through a public Hugging Face Space, so the script text leaves the machine and the service may be unavailable.
- The `edge` voice is for drafts only and is not licensed for published videos; the gate refuses it.
- Remotion has its own licence terms for companies; check them before commercial use.

## Licence

Code: MIT (see `LICENSE`). The DataEntropy name, logo and brand guideline are not covered by it. Replace `Brand_Guideline/` to use the pipeline for another brand.
