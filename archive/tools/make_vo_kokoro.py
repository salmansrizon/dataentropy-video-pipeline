"""Voiceover with Kokoro-82M (hexgrad/Kokoro-82M, Apache-2.0), run locally on CPU. A drop-in for scripts/make-vo.py.

Writes <project>/public/vo/scene-N.wav from src/content.json: each scene's `tts` text when present, otherwise
`voiceover` without *marks*. A scene's own `rate` (e.g. "-15%", written by tools/fit_vo_pace.py) sets its speed.

Kokoro needs Python 3.10-3.12, so it lives in its own environment:
  uv venv .venv-kokoro --python 3.12
  uv pip install --python .venv-kokoro/Scripts/python.exe "kokoro>=0.9.4" soundfile "transformers>=4.44" "tokenizers>=0.19"
Run: python tools/make_vo_kokoro.py <project-dir> [--voice af_heart] [--rate -10%] [--sample out.wav "text"]
Then `npm run srt` in the project to re-measure timings. The first run downloads the model (about 330 MB).
"""
import argparse, json, pathlib, subprocess, sys

VENV_PYTHON = pathlib.Path(__file__).resolve().parent.parent / ".venv-kokoro/Scripts/python.exe"
if sys.version_info >= (3, 13):  # started by the system Python (e.g. from `npm run vo`): hand over to the Kokoro environment
    sys.exit(subprocess.run([str(VENV_PYTHON), __file__, *sys.argv[1:]]).returncode)

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000

parser = argparse.ArgumentParser()
parser.add_argument("project", nargs="?")
parser.add_argument("--voice", default="af_heart")
parser.add_argument("--rate", default="-10%", help="speed change, e.g. -10%% or +5%%")
parser.add_argument("--sample", nargs=2, metavar=("WAV", "TEXT"), help="write one line to WAV and exit")
args = parser.parse_args()

pipeline = KPipeline(lang_code=args.voice[0], repo_id="hexgrad/Kokoro-82M")  # voice names start with their language code


def speak(text: str, rate: str, path: pathlib.Path) -> float:
    speed = 1 + int(rate.rstrip("%")) / 100
    audio = np.concatenate([np.asarray(chunk) for _, _, chunk in pipeline(text, voice=args.voice, speed=speed)])
    sf.write(str(path), audio, SR, subtype="PCM_16")  # 16-bit PCM, which `npm run srt` measures and Remotion plays
    return len(audio) / SR


if args.sample:
    print(f"{args.sample[0]}  {speak(args.sample[1], args.rate, pathlib.Path(args.sample[0])):.2f}s")
else:
    root = pathlib.Path(args.project)
    out_dir = root / "public/vo"
    out_dir.mkdir(parents=True, exist_ok=True)
    scenes = json.loads((root / "src/content.json").read_text(encoding="utf8"))["scenes"]
    for i, scene in enumerate(scenes, 1):
        text = scene.get("tts") or scene["voiceover"].replace("*", "")
        seconds = speak(text, scene.get("rate", args.rate), out_dir / f"scene-{i}.wav")
        print(f"scene-{i}.wav  {seconds:.2f}s  {text}", flush=True)
