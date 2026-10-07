"""Rank candidate explainer topics: Jev scores each candidate on separate dimensions, code combines them.

Jev (one request, four questions per candidate):
  visual   (Score)  - how much of the mechanism can be shown as objects moving
  beginner (Score)  - how much prior knowledge the viewer needs
  size     (Choice) - single_idea / few_steps / many_parts (few_steps suits a 45-60 s video)
  overlap  (Noul)   - would it repeat a video that already exists
Code: rank = 0.4 visual + 0.3 beginner + 0.3 P(few_steps); overlap >= 0.8 is dropped.

Run: python tools/topic_rank.py   (needs TYPESAFE_API_KEY)
Reads prompts/topic-candidates.json, writes prompts/review/topic-rank.json.
"""
import json, pathlib

from typesafe_sdk import Choice, Noul, Score

from lib import ask

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEIGHTS = {"visual": 0.4, "beginner": 0.3, "size": 0.3}
OVERLAP_DROP = 0.8

VISUAL = [
    "The idea is abstract; it can only be explained with words or formulas",
    "Some steps can be drawn, but the key step still needs a spoken or written explanation",
    "Every step can be shown as objects that move, split, join or change on screen",
]
BEGINNER = [
    "The viewer must already know math or programming to follow it",
    "The viewer needs one or two technical terms explained first",
    "A newcomer can follow it from an everyday example alone",
]
SIZE = {
    "single_idea": {"what": "One idea with one visual moment; nothing more to show after it",
                    "examples": ["Rows with the same ID snap together"]},
    "few_steps": {"what": "A short chain of three to five connected steps that build to a result",
                  "examples": ["Split at random, count clicks, compare, decide"]},
    "many_parts": {"what": "Many separate parts or a long chain; a short video would have to skip most of it",
                   "examples": ["A full pipeline with a dozen stages and tools"]},
}


def main():
    state = json.loads((ROOT / "prompts/topic-candidates.json").read_text(encoding="utf-8"))
    questions = {}
    for cid in state["candidates"]:
        path = f"`candidates.{cid}`"
        questions[f"{cid}.visual"] = Score(criteria=VISUAL, instructions=(
            f"How much of the explanation in {path} can be shown as animation without relying on text?"))
        questions[f"{cid}.beginner"] = Score(criteria=BEGINNER, instructions=(
            f"How much prior knowledge does the audience in `audience` need to follow the explanation in {path}?"))
        questions[f"{cid}.size"] = Choice(criteria=SIZE, instructions=(
            f"How many steps does the explanation in {path} have?"))
        questions[f"{cid}.overlap"] = Noul(instructions=(
            f"Would a video about {path} mostly repeat the explanation of one of the videos listed in `existing`?"))

    r = ask("topic-rank", ROOT / "prompts/review", state, questions)

    rows = []
    for cid, c in state["candidates"].items():
        a = {k: r.answers[f"{cid}.{k}"] for k in ("visual", "beginner", "size", "overlap")}
        parts = {"visual": a["visual"].score / (len(VISUAL) - 1), "beginner": a["beginner"].score / (len(BEGINNER) - 1),
                 "size": a["size"].probabilities.get("few_steps", 0.0)}
        rows.append({"id": cid, "title": c["title"], "rank": round(sum(WEIGHTS[k] * v for k, v in parts.items()), 3),
                     **{k: round(v, 2) for k, v in parts.items()}, "size_choice": a["size"].choice,
                     "overlap": round(a["overlap"].noul, 2), "dropped": bool(a["overlap"].noul >= OVERLAP_DROP),
                     "confidence": {k: round(a[k].confidence, 2) for k in ("visual", "beginner", "size")}})
    rows.sort(key=lambda x: (x["dropped"], -x["rank"]))
    out = ROOT / "prompts/review/topic-rank.json"
    out.write_text(json.dumps({"model": getattr(r, "model", "?"), "weights": WEIGHTS, "rows": rows}, indent=2), encoding="utf-8")
    for x in rows:
        print(f"{x['rank']:.2f} {'DROP' if x['dropped'] else '    '} {x['id']:<18} vis {x['visual']:.2f} beg {x['beginner']:.2f} "
              f"few {x['size']:.2f} ({x['size_choice']}) overlap {x['overlap']:.2f}")


if __name__ == "__main__":
    main()
