"""Generates public/vo/scene-N.wav from src/content.json with a Microsoft neural voice (edge-tts).

Uses each scene's `tts` text when present, otherwise `voiceover` without *marks*.
A scene may set its own `rate` (e.g. "-15%"); tools/fit_vo_pace.py writes these to even out the pace.
Usage: python scripts/make-vo.py [--voice en-US-AndrewNeural] [--rate -5%]
Then run `npm run srt` to re-measure timings.
"""
import argparse, asyncio, json, pathlib, subprocess, tempfile

import edge_tts

import sys
sys.stdout.reconfigure(errors="replace")  # Bangla text cannot be printed on a cp1252 console

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Remotion ships its own ffmpeg; this path is the Windows build.
# node_modules is shared at the workspace root (npm workspaces); a project-local install also works.
_FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
FFMPEG = str(next((d / _FF for d in (ROOT, ROOT.parent) if (d / _FF).exists()), ROOT.parent / _FF))

parser = argparse.ArgumentParser()
parser.add_argument("--voice", default="en-US-AndrewNeural")
parser.add_argument("--rate", default="-10%", help="speed change, e.g. -10%% or +5%%")
args = parser.parse_args()

scenes = json.loads((ROOT / "src/content.json").read_text(encoding="utf8"))["scenes"]
out_dir = ROOT / "public/vo"
out_dir.mkdir(parents=True, exist_ok=True)


async def main():
    for i, scene in enumerate(scenes, 1):
        text = scene.get("tts") or scene["voiceover"].replace("*", "")
        with tempfile.TemporaryDirectory() as tmp:
            mp3 = pathlib.Path(tmp) / "vo.mp3"
            # The free service drops requests now and then; retry a few times.
            for attempt in range(4):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text, args.voice, rate=scene.get("rate", args.rate)).save(str(mp3)), 30)
                    break
                except (edge_tts.exceptions.NoAudioReceived, asyncio.TimeoutError):
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 * (attempt + 1))
            # 16-bit PCM WAV, which `npm run srt` measures and Remotion plays.
            subprocess.run(
                [FFMPEG, "-nostdin", "-loglevel", "error", "-y", "-i", str(mp3),
                 "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(out_dir / f"scene-{i}.wav")],
                check=True, stdin=subprocess.DEVNULL,
            )
        print(f"scene-{i}.wav  {text}", flush=True)


asyncio.run(main())
