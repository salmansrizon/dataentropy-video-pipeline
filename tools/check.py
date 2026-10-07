"""Quality gate: everything that must be true before a video is rendered. Hard failures block tools/render.py.

Run: python tools/check.py <video> [--override "<reason>"]
Writes <video>/out/check-report.json and exits 0 (PASS or OVERRIDDEN) or 1 (FAIL).

FAIL = objective and blocking: broken script structure, a line that runs past its scene, stale audio, a cue word
       that is not spoken, off-brand colour, text below the minimum size, a forbidden entrance, an unresolved
       motion-review row, a missing review, a type error.
WARN = a judgment call, listed in the report and in the final summary: pace outside the brand range, a brief or
       script review that is unsure, estimated word timings.
An override is recorded with its reason; it never turns a FAIL into a PASS.
"""
import datetime, json, pathlib, re, subprocess, sys

from lib import GUIDELINE, PIPE, ROOT, load, save, scene_end, video_dir
from vo import script_key

FORBIDDEN_ENTRANCE = re.compile(r"\b(rises?|rising|pops?|popping|bounc\w+|scales? up|grows? from (a )?(point|nothing|zero)|slides? up into place)\b", re.I)
REVEALS = ("headline_reveal",)  # masked text reveals are not pop-ins


def palette() -> set:
    p = GUIDELINE["color_palette"]
    colours = {v["hex"].lower() for group in ("primary", "neutral") for v in p[group].values()}
    return colours | {v.lower() for v in PIPE["derived_colors"].values()} | {"#fff", "#ffffff"}


def gates(video: pathlib.Path):
    content = load(video / "src/content.json")
    scenes = content.get("scenes", [])
    fmt = PIPE["formats"].get(content.get("format", ""))
    total = content.get("durationSeconds", 0)

    # --- script and structure -------------------------------------------------------------------------------
    yield "format", "FAIL", bool(fmt), f"format is '{content.get('format')}', expected one of {sorted(PIPE['formats'])}"
    if not fmt or not scenes:
        yield "scenes", "FAIL", bool(scenes), "content.json has no scenes"
        return
    starts = [s["start"] for s in scenes]
    yield "scene order", "FAIL", starts[0] == 0 and starts == sorted(set(starts)), "scene starts must begin at 0 and strictly increase"
    kind = "long" if total >= PIPE["long_video_from_seconds"] else "short"
    lo, hi = PIPE["scene_seconds"][kind]
    lengths = [round(scene_end(content, i) - s["start"], 2) for i, s in enumerate(scenes)]
    bad = [f"{i + 1}: {d}s" for i, d in enumerate(lengths[:-1]) if not lo <= d <= hi]
    yield "scene length", "FAIL", not bad, f"scenes outside {lo}-{hi}s for a {kind} video: {bad}"
    cta_lo, cta_hi = PIPE["cta_seconds"]
    yield "call to action", "FAIL", scenes[-1]["headline"] == "" and lengths[-1] >= cta_lo, f"the last scene is the logo and call to action: no headline, at least {cta_lo}s (it is {lengths[-1]}s)"
    yield "call to action length", "WARN", lengths[-1] <= cta_hi + 2, f"the closing scene is {lengths[-1]}s; the brand asks for {cta_lo}-{cta_hi}s"
    yield "hook", "WARN", lengths[0] <= 8, f"the first scene is {lengths[0]}s; viewers decide in the first 3-6 seconds"
    max_words = GUIDELINE["typography"]["animation_text_rules"]["maximum_words_per_scene"]
    for i, s in enumerate(scenes):
        lines = s["headline"].split("\n") if s["headline"] else []
        n = len(s["headline"].replace("*", "").split())
        yield f"headline {i + 1}", "FAIL", len(lines) <= fmt["headline_lines"] and n <= max_words, f"{len(lines)} lines / {n} words; limit {fmt['headline_lines']} lines / {max_words} words"
        cap = len(s["voiceover"].replace("*", "").split())
        limit = fmt["caption_lines"] * PIPE["text"]["caption_words_per_line"]
        yield f"caption {i + 1}", "FAIL", cap <= limit, f"{cap} words; captions hold {limit} in this format"
        yield f"voice start {i + 1}", "FAIL", s["start"] <= s["voStart"] < scene_end(content, i), "voStart must fall inside its scene"

    # --- voice ----------------------------------------------------------------------------------------------
    words_file = video / "src/words.json"
    words = load(words_file) if words_file.exists() else {"scenes": []}
    recorded = len(words["scenes"]) == len(scenes)
    yield "voice recorded", "FAIL", recorded, "run `python tools/vo.py <video> --fit`"
    if recorded:
        yield "voice up to date", "FAIL", words.get("for") == script_key(content), "the script, rates or voice changed since recording: rerun tools/vo.py"
        plo, phi = PIPE["pace_wpm"]
        for i, (s, w) in enumerate(zip(scenes, words["scenes"])):
            room = scene_end(content, i) - s["voStart"]
            yield f"line {i + 1} fits", "FAIL", w["duration"] <= room, f"speech {w['duration']}s, room {room:.2f}s"
            yield f"audio {i + 1}", "FAIL", (video / f"public/vo/scene-{i + 1}.wav").exists(), "missing WAV: rerun tools/vo.py"
            wpm = round(len(s["voiceover"].split()) / max(w["duration"], 0.1) * 60)
            yield f"pace {i + 1}", "WARN", plo <= wpm <= phi, f"{wpm} wpm; brand range {plo}-{phi}"
            for name, word in (s.get("cues") or {}).items():
                bare = lambda x: re.sub(r"[^\w]", "", x.lower())
                yield f"cue {i + 1}.{name}", "FAIL", bare(word) in [bare(x) for x in s["voiceover"].replace("*", "").split()], f"cue word '{word}' is not in the line"
        est = sum(w.get("timing") == "estimated" for w in words["scenes"])
        yield "word timings", "WARN", est == 0, f"{est} lines have estimated word times (this voice gives none); cues and captions are approximate"
    engine = content.get("voice", {}).get("engine", "kokoro")
    yield "voice licence", "WARN" if content.get("draft") else "FAIL", engine != "edge", "the edge voice is for drafts only; it is not licensed for published videos (set \"draft\": true to render a draft)"
    yield "music", "FAIL", content.get("music") is False or (video / "public/music.wav").exists(), "run `python tools/make_music.py <video>` or set \"music\": false"

    # --- brand ----------------------------------------------------------------------------------------------
    allowed, min_px = palette(), PIPE["text"]["min_label_px"]
    for src in sorted((video / "src").glob("*.tsx")):
        code = src.read_text(encoding="utf8")
        off = sorted({h.lower() for h in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", code)} - allowed)
        yield f"palette {src.name}", "FAIL", not off, f"colours outside the brand palette: {off}"
        small = sorted({int(n) for n in re.findall(r"fontSize=\{(\d+)\}", code) if int(n) < min_px})
        yield f"text size {src.name}", "FAIL", not small, f"font sizes below {min_px}px: {small}"

    # --- motion ---------------------------------------------------------------------------------------------
    inv_file = video / "motion-inventory.json"
    yield "motion inventory", "FAIL", inv_file.exists(), "list every animation in motion-inventory.json"
    if inv_file.exists():
        popped = [k for k, v in load(inv_file)["animations"].items() if k not in REVEALS and FORBIDDEN_ENTRANCE.search(v["what"])]
        yield "entrances", "FAIL", not popped, f"elements must not rise, pop or scale as they appear: {popped}"
    review = video / "out/motion-review.json"
    yield "motion review", "FAIL", review.exists(), "run `python tools/motion_review.py <video>`"
    if review.exists():
        confirmed = json.dumps(load(video / "out/motion-review-confirmations.json")) if (video / "out/motion-review-confirmations.json").exists() else ""
        rows = load(review)["rows"]
        open_rows = [r["id"] for r in rows if r["decision"] in ("change", "review") and f'"{r["id"]}"' not in confirmed]
        yield "motion review resolved", "FAIL", not open_rows, f"apply or override (with a reason in out/motion-review-confirmations.json): {open_rows}"
        yield "motion review judge", "WARN", "claude" not in str(load(review).get("model", "")), "judged by Claude, not Jev (no TYPESAFE_API_KEY)"

    # --- script reviews -------------------------------------------------------------------------------------
    feel = video / "out/human-feel.json"
    yield "script review", "FAIL", feel.exists(), "run `python tools/human_feel_review.py <video>`"
    if feel.exists():
        s = load(feel)["summary"]
        yield "script reads as speech", "WARN", not s.get("telegraphic_lines"), f"telegraphic lines: {s.get('telegraphic_lines')}"
    brief = ROOT / "prompts/review" / f"{video.name}.json"
    yield "brief review", "WARN", brief.exists(), f"no brief review at {brief.relative_to(ROOT)} (write prompts/{video.name}.json and run tools/brief_review.py)"
    if brief.exists():
        b = load(brief)
        fails = [x["seconds"] for x in b["scenes"] if "FAIL" in (x["faint_verdict"], x["jargon_verdict"])] + [k for k in ("story", "energy") if b[k]["verdict"] == "FAIL"]
        yield "brief review verdicts", "FAIL", not fails, f"FAIL rows in the brief review: {fails}"

    # --- code -----------------------------------------------------------------------------------------------
    tsc = subprocess.run("npx tsc --noEmit", cwd=video, shell=True, capture_output=True, text=True)
    yield "typecheck", "FAIL", tsc.returncode == 0, (tsc.stdout + tsc.stderr).strip()[:400]


def run(video: pathlib.Path, override: str | None = None) -> dict:
    results = [{"gate": g, "level": level, "ok": bool(ok), "detail": "" if ok else detail} for g, level, ok, detail in gates(video)]
    fails = [r for r in results if not r["ok"] and r["level"] == "FAIL"]
    warns = [r for r in results if not r["ok"] and r["level"] == "WARN"]
    verdict = "PASS" if not fails else "OVERRIDDEN" if override else "FAIL"
    report = {"video": video.name, "checked": datetime.datetime.now().isoformat(timespec="seconds"), "verdict": verdict,
              "override_reason": override if fails else None, "fails": fails, "warnings": warns, "gates_run": len(results)}
    save(video / "out/check-report.json", report)
    return report


if __name__ == "__main__":
    reason = sys.argv[sys.argv.index("--override") + 1] if "--override" in sys.argv else None
    report = run(video_dir(sys.argv[1]), reason)
    for r in report["fails"]:
        print(f"FAIL  {r['gate']}: {r['detail']}")
    for r in report["warnings"]:
        print(f"warn  {r['gate']}: {r['detail']}")
    print(f"{report['video']}: {report['verdict']}  ({report['gates_run']} gates, {len(report['fails'])} failed, {len(report['warnings'])} warnings)"
          + (f"  override: {reason}" if report["verdict"] == "OVERRIDDEN" else ""))
    sys.exit(0 if report["verdict"] != "FAIL" else 1)
