"""Bangla voiceover with EMTIAZZ/bangladeshi-bangla-tts-vits (Apache-2.0), through its public Hugging Face Space.
A drop-in for scripts/make-vo.py.

Writes <project>/public/vo/scene-N.wav from src/content.json: each scene's `tts` text when present, otherwise
`voiceover` without *marks*. The model has no speed control, so a scene's `rate` (e.g. "-10%", written by
tools/fit_vo_pace.py) is applied afterwards by changing the tempo without changing the pitch.

The text is sent to https://emtiazz-bangla-vits-tts.hf.space ; the Space runs on a free CPU and can be asleep or busy.
Run: python tools/make_vo_bangla_vits.py <project-dir> [--rate -10%]   then `npm run srt` in the project.
"""
import argparse, json, pathlib, subprocess, tempfile, time, urllib.request

SPACE = "https://emtiazz-bangla-vits-tts.hf.space/gradio_api"
ROOT = pathlib.Path(__file__).resolve().parent.parent
FFMPEG = str(ROOT / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")

parser = argparse.ArgumentParser()
parser.add_argument("project")
parser.add_argument("--rate", default="-10%", help="speed change, e.g. -10%% or +5%%")
args = parser.parse_args()


def synthesize(text: str) -> bytes:
    """One line of Bangla text -> WAV bytes from the Space (submit, wait for the result event, download the file)."""
    body = json.dumps({"data": [text]}).encode("utf8")
    request = urllib.request.Request(f"{SPACE}/call/generate_speech", data=body, headers={"Content-Type": "application/json"})
    event = json.load(urllib.request.urlopen(request, timeout=60))["event_id"]
    stream = urllib.request.urlopen(f"{SPACE}/call/generate_speech/{event}", timeout=180).read().decode("utf8")
    done = [block for block in stream.split("\n\n") if block.startswith("event: complete")]
    if not done:
        raise RuntimeError(f"Space returned no audio: {stream[-200:]!r}")
    result = json.loads(done[-1].split("data: ", 1)[1])[0]
    return urllib.request.urlopen(result["url"], timeout=120).read()


root = pathlib.Path(args.project)
out_dir = root / "public/vo"
out_dir.mkdir(parents=True, exist_ok=True)
scenes = json.loads((root / "src/content.json").read_text(encoding="utf8"))["scenes"]
for i, scene in enumerate(scenes, 1):
    text = scene.get("tts") or scene["voiceover"].replace("*", "")
    for attempt in range(4):  # the free Space drops requests now and then
        try:
            wav = synthesize(text)
            break
        except Exception:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    tempo = 1 + int(scene.get("rate", args.rate).rstrip("%")) / 100
    with tempfile.TemporaryDirectory() as tmp:
        raw = pathlib.Path(tmp) / "vo.wav"
        raw.write_bytes(wav)
        # 16-bit PCM WAV at 24 kHz mono, which `npm run srt` measures and Remotion plays.
        subprocess.run([FFMPEG, "-nostdin", "-loglevel", "error", "-y", "-i", str(raw), "-filter:a", f"atempo={tempo:.3f}",
                        "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(out_dir / f"scene-{i}.wav")], check=True, stdin=subprocess.DEVNULL)
    print(f"scene-{i}.wav", flush=True)
