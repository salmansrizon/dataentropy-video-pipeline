"""Human-feel review of a video's script: Jev judges how each line reads, code measures pace and layout facts.

Jev sees text only. It cannot watch the picture or hear the voice and music, so this reviews the script
and the measured timing, not the finished look and sound.

Jev (one request per video):
  per line   register (Choice) - natural_speech / telegraphic / written_prose / slogan / other
  per line   echo     (Noul)   - does the headline say nearly the same words as the voiceover
  per video  flow     (Score)  - do the lines connect into one explanation
  per video  persona  (Noul)   - does the script have a moment of personality
Code: words per minute per line (target 135-155), spread of pace, lines with no comma, scene-length grid.
Gate: register confidence >= 0.6 counts; lower goes to "unsure".

Run: python tools/human_feel_review.py <project-dir> [more...]   (needs TYPESAFE_API_KEY)
Writes <project-dir>/out/human-feel.json.
"""
import json, pathlib, sys

from typesafe_sdk import Choice, Noul, Score

from lib import ask, durations, video_dir

FLOOR = 0.6
PACE = (135, 155)

REGISTER = {
    "natural_speech": {
        "what": "A complete sentence a person would say aloud to a friend while explaining something",
        "examples": ["First it splits the task into small steps.", "So it tries again with another hotel."],
    },
    "telegraphic": {
        "what": "Clipped fragments, labels or a run-on with missing punctuation; grammatical words are dropped or clauses are jammed together",
        "examples": ["Prices up. Sales down.", "It is a loan not a gift you pay it back.", "Step one. Open file."],
    },
    "written_prose": {
        "what": "A formal or textbook sentence that reads fine on a page but that people rarely say aloud",
        "examples": ["The model subsequently estimates the noise that was introduced at each step."],
    },
    "slogan": {
        "what": "A marketing line or call to action aimed at the viewer",
        "examples": ["Follow us for more tips explained simply."],
    },
    "other": "None of these fits",
}
FLOW = [
    "Each line stands alone; the lines could be shuffled without anyone noticing",
    "The lines follow the right order, but few of them refer back to the line before",
    "Lines pick up from the previous one with words like so, then, but or that, and build to a conclusion",
]


def measure(project):
    content = json.loads((project / "src/content.json").read_text(encoding="utf-8"))
    timing = durations(project)
    scenes = content["scenes"]
    rows = []
    for i, (sc, dur) in enumerate(zip(scenes, timing)):
        text = sc["voiceover"].replace("*", "")
        end = scenes[i + 1]["start"] if i + 1 < len(scenes) else content["durationSeconds"]
        rows.append({"headline": sc["headline"].replace("*", "").replace("\n", " "), "voiceover": text,
                     "wpm": round(len(text.split()) / dur * 60), "scene_seconds": round(end - sc["start"], 1),
                     "silence_after": round(end - sc["voStart"] - dur, 1), "has_comma": "," in text})
    return rows


def review(project):
    rows = measure(project)
    state = {"scenes": [{"headline": r["headline"], "voiceover": r["voiceover"]} for r in rows]}
    q = {}
    for i in range(len(rows)):
        q[f"register.{i}"] = Choice(criteria=REGISTER, instructions=(
            f"Which description fits how the sentence in `scenes[{i}].voiceover` would sound when spoken aloud?"))
        q[f"echo.{i}"] = Noul(instructions=(
            f"Does `scenes[{i}].headline` say nearly the same words as `scenes[{i}].voiceover`?"))
    q["flow"] = Score(criteria=FLOW, instructions=(
        "Read every `voiceover` in `scenes` in order. How well do the lines connect to each other?"))
    q["persona"] = Noul(instructions=(
        "Does any `voiceover` in `scenes` contain humor, a personal aside, a surprise or an everyday comparison?"))
    r = ask("human-feel", project / "out", state, q)

    for i, row in enumerate(rows):
        a = r.answers[f"register.{i}"]
        row["register"] = a.choice if a.confidence >= FLOOR else "unsure"
        row["register_confidence"] = round(a.confidence, 2)
        row["echo"] = round(r.answers[f"echo.{i}"].noul, 2)
    body = rows[:-1]  # the last line is the call to action
    wpms = [x["wpm"] for x in rows]
    summary = {
        "model": getattr(r, "model", "?"),
        "natural_lines": sum(x["register"] == "natural_speech" for x in body), "body_lines": len(body),
        "telegraphic_lines": [i + 1 for i, x in enumerate(body) if x["register"] == "telegraphic"],
        "unsure_lines": [i + 1 for i, x in enumerate(body) if x["register"] == "unsure"],
        "headline_echoes": [i + 1 for i, x in enumerate(rows) if x["echo"] >= 0.8],
        "flow": round(r.answers["flow"].score / (len(FLOW) - 1), 2), "flow_confidence": round(r.answers["flow"].confidence, 2),
        "persona": round(r.answers["persona"].noul, 2),
        "pace_in_target": sum(PACE[0] <= w <= PACE[1] for w in wpms), "lines": len(wpms),
        "pace_min": min(wpms), "pace_max": max(wpms),
        "lines_with_comma": sum(x["has_comma"] for x in rows),
        "scene_lengths": sorted({x["scene_seconds"] for x in rows}),
    }
    (project / "out/human-feel.json").write_text(json.dumps({"summary": summary, "scenes": rows}, indent=2), encoding="utf-8")
    return summary, rows


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        s, rows = review(video_dir(arg))
        print(f"\n== {arg}  ({s['model']})")
        print(f"natural {s['natural_lines']}/{s['body_lines']}  telegraphic {s['telegraphic_lines']}  unsure {s['unsure_lines']}  "
              f"flow {s['flow']} (conf {s['flow_confidence']})  persona {s['persona']}  echoes {s['headline_echoes']}")
        print(f"pace in target {s['pace_in_target']}/{s['lines']} (range {s['pace_min']}-{s['pace_max']} wpm)  "
              f"commas {s['lines_with_comma']}  scene lengths {s['scene_lengths']}")
        for i, x in enumerate(rows, 1):
            print(f"  {i:>2} {x['register']:<15}{x['register_confidence']:.2f} echo {x['echo']:.2f} {x['wpm']:>3} wpm  {x['voiceover']}")
