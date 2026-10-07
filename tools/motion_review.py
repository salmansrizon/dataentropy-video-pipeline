"""Motion review for any video project: Jev judges each animation, code applies the motion-design policy.

Jev answers two judgments per animation (in one request):
  purpose  (Choice) - what job the motion does for the viewer
  pattern  (Choice) - what kind of motion it is
Code then maps pattern -> easing/duration using the motion-design decision tree
plus the DataEntropy brand timings, compares with the current implementation, and
gates every action on Jev's confidence. Low-confidence answers go to review.

Run: python tools/motion_review.py <project-dir>   (needs TYPESAFE_API_KEY)
Reads  <project-dir>/motion-inventory.json:
  {"video": "<one-line purpose>", "animations": {"<id>": {"what", "scene", "ease", "frames"}}}
  `what`/`scene` are sent to Jev; `ease` (out|inOut|in|linear|...) and `frames` stay in code.
Writes <project-dir>/out/motion-review.json.
"""
import json, pathlib, sys

from typesafe_sdk import Choice

from lib import ask, video_dir


PURPOSE = {
    "spatial_continuity": {
        "what": "Shows where an object comes from or goes to, so the viewer can follow the same object across a move or transformation",
        "examples": ["A card flies from a document into a map", "The camera pans to follow an object to its next step"],
    },
    "understanding": {
        "what": "Illustrates how the process works: a step happening, a selection being made, or a result forming",
        "not_for": "Motion that only follows an object from one place to another",
        "examples": ["A pulse spreads out and selects matching points", "An answer appears word by word"],
    },
    "emphasis": {
        "what": "Draws the eye to something already in place, without showing a new step",
        "examples": ["A finished element glows as the narrator names it", "A word brightens when it is spoken"],
    },
    "delight": {
        "what": "Adds polish or brand personality; the viewer learns nothing new from it",
        "examples": ["A button's arrow nudges once", "A logo settles with a soft glow"],
    },
    "none": {
        "what": "Has no job; removing it would lose nothing",
        "examples": ["Particles drifting in the background with no meaning"],
    },
}

PATTERN = {
    "enter": {
        "what": "The element becomes visible: it fades, grows, slides, draws, or is revealed into view",
        "examples": ["A card fades in and rises", "An outline draws itself"],
    },
    "exit": {
        "what": "The element leaves the screen or disappears",
        "examples": ["A card shrinks away into another object", "A scene fades out"],
    },
    "on_screen_morph": {
        "what": "An element that is already visible moves to a new place, resizes, or turns into a different shape",
        "not_for": "Continuous loops or steady progress",
        "examples": ["A card shrinks into a dot and flies across", "The camera pans or zooms"],
    },
    "time_based": {
        "what": "Motion that represents steady progress or runs continuously: typing, spinning, looping, or expanding at a constant speed",
        "examples": ["Text appears word by word", "A ring keeps turning", "A ring expands at a steady speed"],
    },
    "subtle_state_change": {
        "what": "The element stays where it is and only its color, brightness, or glow changes",
        "examples": ["A dot turns from lavender to violet", "A card glows briefly"],
    },
}

# Policy (motion-design decision tree + brand timing: micro 0.4 s, standard 0.6 s).
# pattern -> (easing, min frames, max frames)
POLICY = {
    "enter": ("out", 12, 30),            # ease-out; brand micro..standard, illustrative allowance
    "exit": ("in|out", 8, 30),           # exits faster than enters; ease-in only for permanent exits
    "on_screen_morph": ("inOut", 18, 60),
    "time_based": ("linear|sine loop", 1, 10_000),
    "subtle_state_change": ("inOut|out", 6, 18),
}
CONFIDENCE_FLOOR = 0.85  # below this, no automatic decision (shadow review by the main agent)


def main():
    project = video_dir(sys.argv[1] if len(sys.argv) > 1 else ".")
    inventory = json.loads((project / "motion-inventory.json").read_text(encoding="utf8"))
    ANIMATIONS = inventory["animations"]
    state = {
        "video": inventory["video"],
        "animations": {k: {"what": v["what"], "scene": v["scene"]} for k, v in ANIMATIONS.items()},
    }
    questions = {}
    for k in ANIMATIONS:
        questions[f"{k}__purpose"] = Choice(
            instructions={
                "question": f"What job does the animation in `animations.{k}` do for a viewer of this explainer video?",
                "inspect": f"animations.{k}",
            },
            criteria=PURPOSE,
        )
        questions[f"{k}__pattern"] = Choice(
            instructions={
                "question": f"What kind of motion is the animation in `animations.{k}`?",
                "inspect": f"animations.{k}",
            },
            criteria=PATTERN,
        )

    resp = ask("motion-review", project / "out", state, questions)

    rows = []
    for k, cur in ANIMATIONS.items():
        pu, pa = resp.answers[f"{k}__purpose"], resp.answers[f"{k}__pattern"]
        assert pu.choice in PURPOSE and pa.choice in PATTERN, (k, pu.choice, pa.choice)
        ease_ok, lo, hi = POLICY[pa.choice]
        issues = []
        if cur["ease"] not in ease_ok.split("|"):
            issues.append(f"easing {cur['ease']} -> {ease_ok.split('|')[0]}")
        if not lo <= cur["frames"] <= hi:
            issues.append(f"duration {cur['frames']}f -> {lo}-{hi}f")
        if pu.choice == "none":
            issues.append("no job: remove")

        confident = pu.confidence >= CONFIDENCE_FLOOR and pa.confidence >= CONFIDENCE_FLOOR
        decision = "keep" if not issues else ("change" if confident else "review")
        if not confident and not issues:
            decision = "keep (low confidence)"
        rows.append({
            "id": k, "purpose": pu.choice, "purpose_conf": round(pu.confidence, 2),
            "pattern": pa.choice, "pattern_conf": round(pa.confidence, 2),
            "current": f"{cur['ease']} {cur['frames']}f", "decision": decision, "issues": issues,
        })

    out = project / "out/motion-review.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({"model": getattr(resp, "model", None), "rows": rows}, indent=2))

    w = max(len(r["id"]) for r in rows)
    for r in rows:
        print(f"{r['id']:<{w}}  {r['purpose']:<18} {r['purpose_conf']:.2f}  {r['pattern']:<19} {r['pattern_conf']:.2f}  "
              f"{r['current']:<14} {r['decision']:<22} {'; '.join(r['issues'])}")
    print("model:", getattr(resp, "model", "?"), "usage:", getattr(resp, "usage", "?"))


if __name__ == "__main__":
    main()
