"""Brief review: code checks what is arithmetic, Jev judges what needs judgment.

Code:  palette contrast on white (WCAG: lines/shapes >= 3:1, text >= 4.5:1), word counts.
Jev:   per scene - faint visuals (Noul), unexplained jargon (Noul);
       per brief - storytelling (Score), visual energy (Score). One request per brief.
Gate:  0.85. Noul >= 0.85 -> FAIL, <= 0.15 -> PASS, else REVIEW.
       Score: top level with confidence >= 0.85 -> PASS, else REVIEW/FAIL.

Run: python tools/brief_review.py prompts/llm.json [more briefs...]   (Jev with TYPESAFE_API_KEY, otherwise Claude answers; see tools/lib.py)
Writes prompts/review/<name>.json.
"""
import json, pathlib, re, sys

from typesafe_sdk import Noul, Score

from lib import ask

ROOT = pathlib.Path(__file__).resolve().parent.parent
GATE = 0.85
BRAND = json.loads((ROOT / "Brand_Guideline/guideline.json").read_text(encoding="utf8"))["color_palette"]


def luminance(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def palette_report():
    rows = []
    for group in ("primary", "neutral"):
        for name, v in BRAND[group].items():
            if name in ("white", "off_white", "light_gray"):
                continue
            r = min(contrast(v["hex"], "#FFFFFF"), contrast(v["hex"], "#F8F7FC"))
            rows.append({"color": name, "hex": v["hex"], "contrast": round(r, 2),
                         "lines_ok": r >= 3, "text_ok": r >= 4.5})
    return rows


STORY = [
    "Facts are listed one after another with no example or narrative",
    "An example appears, but it is dropped or replaced partway through the scenes",
    "One relatable example runs through every scene, from an opening question or problem to its answer",
]
ENERGY = [
    "Mostly text on a plain background with little motion",
    "Elements appear and fade like slides, with little movement between them",
    "Objects move, connect, and transform into each other continuously across scenes",
]
FAINT = {
    "true": {"what": "Some line, dot, arrow, outline, or text is described as faint, pale, thin, hairline, ghosted, light gray, or drawn in soft lavender",
             "examples": ["a faint gray connector", "thin lavender lines between dots", "ghosted labels"]},
    "false": {"what": "Lines and text are described as bold or in navy, violet, or purple; lavender appears only as a fill or glow",
              "examples": ["bold violet arrows", "navy outlined cards with a lavender fill"]},
}
JARGON = {
    "true": {"what": "A technical term appears and nothing in that same scene says what it means in plain words",
             "examples": ["'backpropagation adjusts the weights' with no explanation", "'cosine similarity' shown without saying it measures closeness"]},
    "false": {"what": "Every technical term is explained in plain words in that same scene, or no technical term is used",
              "examples": ["'tokens - small pieces of words'", "'weights - how much each input matters'"]},
}


def review(path):
    brief = json.loads(path.read_text(encoding="utf8"))
    scenes = brief["timeline"]
    state = {"audience": "beginners: students and early-career professionals",
             "video_style": brief["video"].get("style", ""), "timeline": scenes}
    q = {
        "story": Score(instructions="How well does `timeline` tell a story a beginner can follow?", criteria=STORY),
        "energy": Score(instructions={"question": "How much continuous visual motion do the `visual` descriptions in `timeline` call for?",
                                      "inspect": "timeline"}, criteria=ENERGY),
    }
    for i in range(len(scenes)):
        q[f"faint_{i}"] = Noul(instructions={"question": f"Does `timeline[{i}].visual` or `video_style` call for any element that would be hard to see on a white background?",
                                             "inspect": f"timeline[{i}].visual"}, criteria=FAINT)
        q[f"jargon_{i}"] = Noul(instructions={"question": f"Does `timeline[{i}]` use a technical term in its voiceover or on-screen text without explaining it in plain words in that same scene?",
                                              "inspect": f"timeline[{i}]"}, criteria=JARGON)
    judged = ask(f"brief-review-{path.stem}", ROOT / "prompts/review", state, q)
    a = judged.answers

    noul = lambda p: "FAIL" if p >= GATE else "PASS" if p <= 1 - GATE else "REVIEW"
    top = lambda s, n: "PASS" if round(s.score) == n - 1 and s.confidence >= GATE else "FAIL" if round(s.score) == 0 else "REVIEW"
    words = lambda s: len(re.findall(r"[\w'’-]+", s))
    result = {
        "brief": path.name, "judge": judged.model,
        "story": {"score": round(a["story"].score, 2), "confidence": round(a["story"].confidence, 2), "verdict": top(a["story"], len(STORY))},
        "energy": {"score": round(a["energy"].score, 2), "confidence": round(a["energy"].confidence, 2), "verdict": top(a["energy"], len(ENERGY))},
        "scenes": [{
            "seconds": s["seconds"],
            "faint": round(a[f"faint_{i}"].noul, 2), "faint_verdict": noul(a[f"faint_{i}"].noul),
            "jargon": round(a[f"jargon_{i}"].noul, 2), "jargon_verdict": noul(a[f"jargon_{i}"].noul),
            "vo_words": words(s.get("voiceover", "")), "text_words": words(s.get("on_screen_text", "")),
            "text_ok": words(s.get("on_screen_text", "")) <= 12,
        } for i, s in enumerate(scenes)],
        "vo_total_words": sum(words(s.get("voiceover", "")) for s in scenes),
    }
    out = ROOT / "prompts/review" / f"{path.stem}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    print("Palette on white (lines need 3:1, text 4.5:1):")
    for r in palette_report():
        print(f"  {r['color']:<16} {r['hex']}  {r['contrast']:>5}:1  lines {'ok' if r['lines_ok'] else 'NO'}  text {'ok' if r['text_ok'] else 'NO'}")
    for p in sys.argv[1:]:
        r = review(pathlib.Path(p))
        print(f"\n{r['brief']}  story {r['story']['verdict']} ({r['story']['score']}, conf {r['story']['confidence']})  "
              f"energy {r['energy']['verdict']} ({r['energy']['score']}, conf {r['energy']['confidence']})  vo words {r['vo_total_words']}")
        for s in r["scenes"]:
            print(f"  {s['seconds']:>6}s  faint {s['faint_verdict']:<6} {s['faint']:<5} jargon {s['jargon_verdict']:<6} {s['jargon']:<5} "
                  f"vo {s['vo_words']:>2}w  text {s['text_words']:>2}w{'' if s['text_ok'] else ' >12!'}")
