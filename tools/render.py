"""Render a video to output/<name>.mp4. The quality gate runs first and a FAIL stops the render.

Run: python tools/render.py <video> [--stills] [--override "<reason>"]
  --stills    render one still near the end of every scene into <video>/out/frames/ (for inspection) and stop
  --override  render although the gate failed; the reason is written into the reports

Long videos are rendered in parts and joined, so a failure costs one part, not the whole render.
Renders run from the repository root, so every video shares one headless browser download.
Writes <video>/out/render-report.json; exits 1 when the gate fails or the file does not match the expected length.
"""
import os, re, subprocess, sys

from check import run as check
from lib import ROOT, ffmpeg, load, save, scene_end, video_dir

PART = 1800  # frames per part (60 s at 30 fps)
# ponytail: parts are joined with a stream copy; AAC framing can leave a few milliseconds of gap at each join.
# If a join is ever audible, render the audio once separately and mux it over the joined picture.
SPLIT_FROM = 5400  # videos longer than this (3 min at 30 fps) are rendered in parts


def remotion(video, *args) -> subprocess.CompletedProcess:
    cmd = ["npx", "remotion", *args, "--public-dir", str(video / "public")]
    # Frames are written to the temp folder while rendering (several GB for a long video): keep them on the repository's drive.
    tmp = ROOT / ".tmp"
    tmp.mkdir(exist_ok=True)
    env = {**os.environ, "TEMP": str(tmp), "TMP": str(tmp), "TMPDIR": str(tmp)}
    return subprocess.run(" ".join(f'"{c}"' if " " in c else c for c in cmd), cwd=ROOT, shell=True, capture_output=True, text=True, encoding="utf8", errors="replace", env=env)


def stills(video, content) -> None:
    out = video / "out/frames"
    out.mkdir(parents=True, exist_ok=True)
    entry = str((video / "src/index.ts").relative_to(ROOT)).replace("\\", "/")
    for i in range(len(content["scenes"])):
        frame = round(scene_end(content, i) * content["fps"]) - 14
        r = remotion(video, "still", entry, "Video", str(out / f"scene-{i + 1:02d}.png"), f"--frame={frame}", "--scale=0.4")
        print(f"scene {i + 1:>2}  frame {frame}  {'ok' if r.returncode == 0 else 'FAILED: ' + (r.stderr or r.stdout)[-300:]}", flush=True)


def main() -> int:
    video = video_dir(sys.argv[1])
    content = load(video / "src/content.json")
    if "--stills" in sys.argv:
        stills(video, content)
        return 0
    reason = sys.argv[sys.argv.index("--override") + 1] if "--override" in sys.argv else None
    gate = check(video, reason)
    if gate["verdict"] == "FAIL":
        for r in gate["fails"]:
            print(f"FAIL  {r['gate']}: {r['detail']}")
        print(f"{video.name}: not rendered. Fix the failures, or pass --override \"<reason>\".")
        return 1
    total = round(content["durationSeconds"] * content["fps"])
    entry = str((video / "src/index.ts").relative_to(ROOT)).replace("\\", "/")
    (ROOT / "output").mkdir(exist_ok=True)
    final = ROOT / "output" / f"{video.name}.mp4"
    spans = [(a, min(a + PART, total) - 1) for a in range(0, total, PART)] if total > SPLIT_FROM else [(0, total - 1)]
    parts = []
    for k, (a, b) in enumerate(spans):
        target = final if len(spans) == 1 else video / f"out/parts/part-{k:03d}.mp4"
        target.parent.mkdir(parents=True, exist_ok=True)
        for attempt in (1, 2):  # the headless browser occasionally drops a connection; one retry
            r = remotion(video, "render", entry, "Video", str(target), f"--frames={a}-{b}")
            if r.returncode == 0 and target.exists():
                break
        else:
            print(f"render failed for frames {a}-{b}:\n{(r.stderr or r.stdout)[-600:]}")
            return 1
        parts.append(target)
        print(f"frames {a}-{b} rendered", flush=True)
    if len(parts) > 1:
        listing = video / "out/parts/list.txt"
        listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf8")
        subprocess.run([ffmpeg(), "-nostdin", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(final)],
                       check=True, stdin=subprocess.DEVNULL)
    probe = subprocess.run(f'npx remotion ffprobe "{final}"', cwd=ROOT, shell=True, capture_output=True, text=True, encoding="utf8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe.stdout + probe.stderr)
    seconds = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0
    ok = abs(seconds - content["durationSeconds"]) < 0.5
    save(video / "out/render-report.json", {"video": video.name, "file": str(final.relative_to(ROOT)), "expected_seconds": content["durationSeconds"],
                                             "measured_seconds": seconds, "frames": total, "parts": len(parts), "length_ok": ok,
                                             "gate": gate["verdict"], "override_reason": gate["override_reason"], "warnings": [w["gate"] for w in gate["warnings"]]})
    print(f"{video.name}: {final.relative_to(ROOT)}  {seconds:.2f}s (expected {content['durationSeconds']}s)  gate {gate['verdict']}  {len(gate['warnings'])} warnings")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
