"""Voice step: record every line of a video, save when each word is spoken, and report whether lines fit their scenes.

Reads  <video>/src/content.json   scenes[].voiceover (or scenes[].tts for the spoken form), optional scenes[].rate,
                                  and "voice": {"engine": "kokoro", "name": "af_heart", "rate": "-10%", ...}
Writes <video>/public/vo/scene-N.wav   24 kHz mono 16-bit
       <video>/src/words.json          per scene: speech length and the start/end of every word
                                       ("timing": "model" = from the voice model, "estimated" = spread over the speech)
       output/<name>.srt               captions

Engines (tools/voices/): kokoro (English, default), chatterbox (English, expressive, slow on CPU),
bangla_vits (Bangla), edge (drafts only, not licensed for publishing).

Run: python tools/vo.py <video> [--fit]
  --fit   record once, give every line its own speaking rate so it lands near the brand pace and inside its scene,
          and record again. Run this after changing the script or the scene starts.
Exit code 1 when a line still runs past its scene.
"""
import hashlib, json, os, pathlib, subprocess, sys, tempfile

from lib import PIPE, ROOT, ffmpeg, load, save, scene_end, speech_span, video_dir

# engine -> (python environment at the repo root or None for the current one, speed is applied by the model itself)
ENGINES = {"kokoro": (".venv-kokoro", True), "chatterbox": (".venv-chatterbox", False), "bangla_vits": (None, False), "edge": (None, True)}
SLOWEST, FASTEST, FIT_FASTEST = 0.80, 1.00, 1.15  # natural range; FIT_FASTEST only when a line would overrun
MARGIN = 0.25  # silence kept before the next scene, seconds


def python_for(env):
    if env is None:
        return sys.executable
    for exe in (ROOT / env / "Scripts/python.exe", ROOT / env / "bin/python"):
        if exe.exists():
            return str(exe)
    sys.exit(f"{env} is missing: run `python tools/setup.py --with {env.split('-')[-1]}`")


def speed_of(rate: str) -> float:
    return 1 + int(rate.rstrip("%")) / 100


def script_key(content: dict) -> str:
    """Fingerprint of everything the recording depends on, so tools/check.py can tell when the audio is out of date."""
    voice = content.get("voice", {"engine": "kokoro", "name": "af_heart"})
    lines = [[s.get("tts") or s["voiceover"].replace("*", ""), s.get("rate")] for s in content["scenes"]]
    return hashlib.sha256(json.dumps([voice, lines], ensure_ascii=False, sort_keys=True).encode("utf8")).hexdigest()[:16]


def record(video: pathlib.Path, content: dict) -> dict:
    voice = content.get("voice", {"engine": "kokoro", "name": "af_heart"})
    engine = voice.get("engine", "kokoro")
    if engine not in ENGINES:
        sys.exit(f"unknown voice engine '{engine}'; choose one of {sorted(ENGINES)}")
    env, native_speed = ENGINES[engine]
    out_dir = video / "public/vo"
    out_dir.mkdir(parents=True, exist_ok=True)
    spoken = [s.get("tts") or s["voiceover"].replace("*", "") for s in content["scenes"]]
    speeds = [speed_of(s.get("rate", voice.get("rate", "-10%"))) for s in content["scenes"]]
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        job = {"voice": voice, "result": str(tmp / "result.json"),
               "lines": [{"text": t, "speed": sp if native_speed else 1.0, "out": str(tmp / f"raw-{i}")} for i, (t, sp) in enumerate(zip(spoken, speeds))]}
        (tmp / "job.json").write_text(json.dumps(job, ensure_ascii=False), encoding="utf8")
        subprocess.run([python_for(env), str(ROOT / "tools/voices" / f"{engine}_voice.py"), str(tmp / "job.json")], check=True,
                       env={**os.environ, "HF_HOME": os.environ.get("HF_HOME", str(ROOT / ".hf-cache")), "PYTHONIOENCODING": "utf8"})
        results = load(tmp / "result.json")
        scenes = []
        for i, (text, sp, res) in enumerate(zip(spoken, speeds, results)):
            wav = out_dir / f"scene-{i + 1}.wav"
            tempo = [] if native_speed else ["-filter:a", f"atempo={sp:.3f}"]
            subprocess.run([ffmpeg(), "-nostdin", "-loglevel", "error", "-y", "-i", str(tmp / f"raw-{i}"), *tempo,
                            "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(wav)], check=True, stdin=subprocess.DEVNULL)
            first, last = speech_span(wav)
            words = res.get("words")
            if words and not native_speed:
                words = [{**w, "start": round(w["start"] / sp, 3), "end": round(w["end"] / sp, 3)} for w in words]
            timing = "model"
            if not words:  # no timings from the model: spread the words over the audible speech by their length
                timing, parts = "estimated", text.split()
                total, t = sum(len(p) + 1 for p in parts), first
                words = []
                for p in parts:
                    d = (last - first) * (len(p) + 1) / total
                    words.append({"text": p, "start": round(t, 3), "end": round(t + d, 3)})
                    t += d
            scenes.append({"duration": round(last, 2), "timing": timing, "words": words})
    data = {"voice": voice, "for": script_key(content), "scenes": scenes}
    save(video / "src/words.json", data)
    return data


def table(content: dict, words: dict):
    lo, hi = PIPE["pace_wpm"]
    for i, (s, w) in enumerate(zip(content["scenes"], words["scenes"])):
        n = len(s["voiceover"].replace("*", "").split())
        room = scene_end(content, i) - s["voStart"]
        yield i, s, w["duration"], n, room, round(n / max(w["duration"], 0.1) * 60), (lo, hi)


def fit(video: pathlib.Path, content: dict) -> dict:
    """Two passes: measure at the base rate, then give each line the rate that hits the pace and fits its scene."""
    for s in content["scenes"]:
        s.pop("rate", None)
    words = record(video, content)
    base = speed_of(content.get("voice", {}).get("rate", "-10%"))
    target = sum(PIPE["pace_wpm"]) / 2
    for i, s, d, n, room, _, _ in table(content, words):
        speed = max(SLOWEST, min(FASTEST, base * d / (n * 60 / target)))
        speed = min(FIT_FASTEST, max(speed, base * d / (room - MARGIN)))  # never run past the scene
        s["rate"] = f"{round((speed - 1) * 100):+d}%"
    for _ in range(3):  # re-record; if a line still overruns, speed up just that line and try again
        words = record(video, content)
        late = [(i, s, d, room) for i, s, d, n, room, _, _ in table(content, words) if d > room - 0.1]
        if not late:
            break
        for i, s, d, room in late:
            s["rate"] = f"{round((min(FIT_FASTEST, speed_of(s['rate']) * d / (room - MARGIN) * 1.03) - 1) * 100):+d}%"
    save(video / "src/content.json", content)
    return words


def srt(video: pathlib.Path, content: dict, words: dict) -> None:
    def ts(s):
        ms = round(s * 1000)
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    blocks = [f"{i + 1}\n{ts(s['voStart'])} --> {ts(s['voStart'] + w['duration'] + 0.2)}\n{s['voiceover'].replace('*', '')}\n"
              for i, (s, w) in enumerate(zip(content["scenes"], words["scenes"]))]
    (ROOT / "output").mkdir(exist_ok=True)
    (ROOT / "output" / f"{video.name}.srt").write_text("\n".join(blocks), encoding="utf8")


if __name__ == "__main__":
    video = video_dir(sys.argv[1])
    content = load(video / "src/content.json")
    words = fit(video, content) if "--fit" in sys.argv else record(video, content)
    srt(video, content, words)
    overruns = 0
    for i, s, d, n, room, wpm, (lo, hi) in table(content, words):
        over = d > room
        overruns += over
        note = "  OVERRUN" if over else "" if lo <= wpm <= hi else "  (pace outside the brand range)"
        print(f"{video.name} {i + 1:>2}  rate {s.get('rate', '-'):>5}  {d:5.2f}s of {room:4.1f}s  {wpm:>3} wpm  {words['scenes'][i]['timing']}{note}")
    sys.exit(1 if overruns else 0)
