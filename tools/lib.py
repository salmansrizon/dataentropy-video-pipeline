"""Shared helpers for the pipeline tools: paths, the brand guideline, ffmpeg, timings, and the judge.

The judge (`ask`) is how every review gets its judgment calls:
  - with TYPESAFE_API_KEY set, the questions go to Jev (TypeSafe);
  - without it, the questions are written to <out>/<review>.questions.json and the tool stops (exit code 3).
    Claude then answers them in <out>/<review>.answers.json and reruns the tool. Those results are recorded
    with source "claude", never as Jev's.
"""
import glob, hashlib, json, os, pathlib, sys, types, wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
GUIDELINE = json.loads((ROOT / "Brand_Guideline/guideline.json").read_text(encoding="utf8"))
PIPE = GUIDELINE["pipeline"]
NEEDS_CLAUDE = 3  # exit code: a review is waiting for Claude's answers


def video_dir(arg: str) -> pathlib.Path:
    """A video given by name ("sql-select") or by path."""
    p = pathlib.Path(arg)
    for cand in (p, ROOT / "videos" / arg, ROOT / arg):
        if (cand / "src/content.json").exists():
            return cand.resolve()
    sys.exit(f"no video found for '{arg}' (looked for src/content.json in {p}, videos/{arg})")


def load(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf8"))


def save(path: pathlib.Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def ffmpeg() -> str:
    """The ffmpeg that ships with Remotion's compositor for this platform (no separate install needed)."""
    hits = glob.glob(str(ROOT / "node_modules/@remotion/compositor-*/ffmpeg*"))
    if not hits:
        sys.exit("ffmpeg not found: run `npm install` at the repository root first")
    return hits[0]


def durations(video: pathlib.Path) -> list:
    """Speech length of every line, in seconds (words.json from tools/vo.py; vo-timing.json for archived videos)."""
    words = video / "src/words.json"
    return [s["duration"] for s in load(words)["scenes"]] if words.exists() else load(video / "src/vo-timing.json")


def speech_span(path: pathlib.Path):
    """(first, last) second of audible speech in a 16-bit PCM WAV, ignoring leading and trailing silence."""
    import numpy as np
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.abs(np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")[::ch])
    loud = np.flatnonzero(x > 800)
    return (loud[0] / sr, loud[-1] / sr) if len(loud) else (0.0, 0.0)


def scene_end(content: dict, i: int) -> float:
    sc = content["scenes"]
    return sc[i + 1]["start"] if i + 1 < len(sc) else content["durationSeconds"]


def ask(review: str, out_dir: pathlib.Path, state: dict, questions: dict, timeout: int = 60):
    """Answers to `questions` about `state`. Returns an object with .answers (dict of answer objects) and .model."""
    if os.environ.get("TYPESAFE_API_KEY"):
        from typesafe_sdk import TypeSafeClient
        with TypeSafeClient(timeout=timeout) as client:
            return client.system_one(state=state, questions=questions)
    asked = {k: q.model_dump() for k, q in questions.items()}
    key = hashlib.sha256(json.dumps([state, asked], sort_keys=True, ensure_ascii=False).encode("utf8")).hexdigest()[:16]
    need, got = out_dir / f"{review}.questions.json", out_dir / f"{review}.answers.json"
    if got.exists() and load(got).get("for") == key:
        answers = {k: types.SimpleNamespace(**v) for k, v in load(got)["answers"].items()}
        missing = set(asked) - set(answers)
        if not missing:
            return types.SimpleNamespace(answers=answers, model="claude (no TYPESAFE_API_KEY)", usage=None)
        sys.exit(f"{got} is missing answers for: {sorted(missing)[:5]}")
    save(need, {"for": key, "how_to_answer": (
        "No TYPESAFE_API_KEY is set, so Claude makes these judgments. Read `state`, answer every question, and save "
        f"{got.name} next to this file as {{\"for\": \"{key}\", \"answers\": {{<question id>: <answer>}}}}. "
        "Answer shape by type - choice: {\"choice\": <one criteria key>, \"confidence\": 0-1, \"probabilities\": {}}; "
        "score: {\"score\": <index into the criteria list, 0-based, may be fractional>, \"confidence\": 0-1}; "
        "noul: {\"noul\": <probability 0-1 that the answer is yes>}. Judge each question on its own. Then rerun the tool."),
        "state": state, "questions": asked})
    print(f"NEEDS CLAUDE: no TYPESAFE_API_KEY. Questions written to {need}. Answer them in {got.name} and rerun.")
    sys.exit(NEEDS_CLAUDE)
