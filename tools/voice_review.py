"""Voice review: does each recorded line sound the way its sentence asks to be spoken?

Jev cannot hear audio. So code measures every public/vo/scene-N.wav, and Jev judges only the text:
  Code:  pitch variation (standard deviation in semitones), the pitch movement at the end of the line,
         pauses inside the line, words per minute. Each number becomes a named bucket.
  Jev:   per line, one Choice - what kind of sentence is it (question / contrast_or_emphasis / plain_statement /
         call_to_action). One request per video.
  Policy (in code): a question should end rising or at least not falling; a contrast or emphasis line should not be
         monotone; any line that is monotone, or has no pause although it holds two sentences, is flagged.
  Floor: 0.6 on Jev's confidence; below it the line is judged as a plain statement.

The bucket edges are starting values, not calibrated: they were not set against a human reference recording,
and pitch tracking here is a simple autocorrelation. Use the result to compare voices and takes on the same
script, not as an absolute grade. It says nothing about timbre or how pleasant the voice is.

Run: python tools/voice_review.py <project-dir> [--text-from <other-project>]   (needs TYPESAFE_API_KEY)
  --text-from: take the sentences Jev reads from another project with the same scenes (e.g. the English
               original of a translated video).
Writes <project-dir>/out/voice-review.json.
"""
import json, pathlib, sys, wave

import numpy as np
from typesafe_sdk import Choice

from lib import ask, video_dir

FLOOR = 0.6
KINDS = {
    "question": {"what": "The line asks something; a speaker's voice would lift at the end", "examples": ["Who should she call today?", "So why does it fail?"]},
    "contrast_or_emphasis": {"what": "The line sets two things against each other or leans on one key word", "not_for": "A neutral description",
                             "examples": ["Rows that pass go through. The rest stay behind.", "It works for six leads. Not for six thousand."]},
    "call_to_action": {"what": "The line tells the viewer to do something", "examples": ["Follow us for more."]},
    "plain_statement": {"what": "The line states a fact in a neutral way", "examples": ["FROM says which table to look in."]},
}


def measure(path: pathlib.Path, words: int) -> dict:
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    hop, win = int(0.01 * sr), int(0.04 * sr)
    frames = [x[i:i + win] for i in range(0, len(x) - win, hop)]
    energy = np.array([np.sqrt(np.mean(f ** 2)) for f in frames])
    loud = energy > 0.1 * np.percentile(energy, 95)
    speech = np.flatnonzero(loud)
    first, last = speech[0], speech[-1]
    # Pitch by autocorrelation, 75-400 Hz, on frames that are loud and clearly periodic.
    lo, hi = int(sr / 400), int(sr / 75)
    f0 = np.full(len(frames), np.nan)
    for i in speech:
        f = frames[i] - frames[i].mean()
        ac = np.correlate(f, f, "full")[win - 1:]
        if ac[0] > 0:
            k = lo + int(np.argmax(ac[lo:hi]))
            if ac[k] / ac[0] > 0.5:
                f0[i] = sr / k
    voiced = f0[~np.isnan(f0)]
    semis = 12 * np.log2(voiced / np.median(voiced))
    semis = semis[np.abs(semis) < 12]  # drop octave jumps of the tracker
    n = len(semis)
    end_move = float(np.median(semis[-max(3, n // 6):]) - np.median(semis[n // 2:-max(3, n // 6)])) if n > 20 else 0.0
    # Pauses: runs of quiet frames inside the line, at least 0.15 s.
    quiet, runs, run = ~loud[first:last + 1], [], 0
    for q in quiet:
        run = run + 1 if q else (runs.append(run), 0)[1] if run else 0
    pauses = [r * 0.01 for r in runs if r * 0.01 >= 0.15]
    seconds = (last - first) * 0.01 + 0.04
    return {"seconds": round(seconds, 2), "wpm": round(words / seconds * 60), "pitch_sd_semitones": round(float(np.std(semis)), 2),
            "end_move_semitones": round(end_move, 2), "pauses": [round(p, 2) for p in pauses]}


def buckets(m: dict) -> dict:
    sd, end = m["pitch_sd_semitones"], m["end_move_semitones"]
    return {"pitch": "monotone" if sd < 1.5 else "moderate" if sd < 3 else "lively" if sd < 6 else "suspect_tracking",
            "ending": "rising" if end > 1.5 else "falling" if end < -1.5 else "level",
            "pauses": "none" if not m["pauses"] else "short" if max(m["pauses"]) < 0.3 else "clear"}


def review(project: pathlib.Path, text_from: pathlib.Path) -> dict:
    scenes = json.loads((project / "src/content.json").read_text(encoding="utf8"))["scenes"]
    texts = [s["voiceover"].replace("*", "") for s in json.loads((text_from / "src/content.json").read_text(encoding="utf8"))["scenes"]]
    measured = [measure(project / f"public/vo/scene-{i + 1}.wav", len(s["voiceover"].split())) for i, s in enumerate(scenes)]
    q = {f"kind_{i}": Choice(instructions={"question": f"What kind of sentence is `lines[{i}]` when it is spoken aloud?", "inspect": f"lines[{i}]"}, criteria=KINDS)
         for i in range(len(texts))}
    response = ask("voice-review", project / "out", {"lines": texts}, q)
    rows = []
    for i, (text, m) in enumerate(zip(texts, measured)):
        a = response.answers[f"kind_{i}"]
        kind = a.choice if a.confidence >= FLOOR else "plain_statement"
        b = buckets(m)
        issues = []
        if kind == "question" and b["ending"] == "falling": issues.append("a question that ends falling")
        if kind == "contrast_or_emphasis" and b["pitch"] == "monotone": issues.append("an emphasis line spoken flat")
        if b["pitch"] == "monotone" and kind != "contrast_or_emphasis": issues.append("monotone")
        if text.count(". ") + text.count("? ") >= 1 and b["pauses"] == "none": issues.append("two sentences with no pause between them")
        rows.append({"line": i + 1, "text": text, "kind": a.choice, "kind_conf": round(a.confidence, 2), **m, **b, "issues": issues})
    sds = [r["pitch_sd_semitones"] for r in rows]
    return {"project": project.name, "model": response.model, "lines": rows,
            "summary": {"flagged": sum(bool(r["issues"]) for r in rows), "of": len(rows), "median_pitch_sd": round(float(np.median(sds)), 2),
                        "pitch": {b: sum(r["pitch"] == b for r in rows) for b in ("monotone", "moderate", "lively", "suspect_tracking")},
                        "questions_rising_or_level": f'{sum(r["kind"] == "question" and r["ending"] != "falling" for r in rows)}/{sum(r["kind"] == "question" for r in rows)}'}}


if __name__ == "__main__":
    project = video_dir(sys.argv[1])
    text_from = video_dir(sys.argv[sys.argv.index("--text-from") + 1]) if "--text-from" in sys.argv else project
    result = review(project, text_from)
    (project / "out").mkdir(exist_ok=True)
    (project / "out/voice-review.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf8")
    print(f'\n== {result["project"]}  ({result["model"]})  {json.dumps(result["summary"])}')
    for r in result["lines"]:
        print(f'{r["line"]:>3} {r["kind"]:<21}{r["kind_conf"]:<5} sd {r["pitch_sd_semitones"]:<5} {r["pitch"]:<9} end {r["ending"]:<8} pauses {r["pauses"]:<6} {r["wpm"]:>3} wpm  {"; ".join(r["issues"])}')
