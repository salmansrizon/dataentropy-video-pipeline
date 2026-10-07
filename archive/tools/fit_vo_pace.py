"""Even out the voiceover pace: record every line at the base rate, measure it, then give each line its own
speaking rate so it lands near the target words per minute and still fits its scene.

Run: python tools/fit_vo_pace.py <project-dir>   (records with edge-tts through the project's `npm run vo`)
Writes a `rate` per scene into src/content.json, then re-records and re-measures.
Afterwards rerun tools/make_music.py for the project: the music ducks under the new timings.
"""
import json, pathlib, subprocess, sys

TARGET_WPM = 150
BASE = 0.90          # make-vo.py default rate of -10%
SLOWEST, FASTEST = 0.80, 1.00   # keep the voice natural; beyond this it sounds dragged or rushed
FIT_FASTEST = 1.10   # only used when a line would otherwise run past its scene
MARGIN = 0.25        # silence kept before the next scene, seconds


def run(project, script):
    subprocess.run(f"npm run {script}", cwd=project, shell=True, check=True, stdout=subprocess.DEVNULL)


def table(content, timing):
    sc = content["scenes"]
    for i, (s, d) in enumerate(zip(sc, timing)):
        end = sc[i + 1]["start"] if i + 1 < len(sc) else content["durationSeconds"]
        words = len(s["voiceover"].replace("*", "").split())
        yield i, s, d, words, end - s["voStart"] - MARGIN


def main():
    project = pathlib.Path(sys.argv[1])
    cfile, tfile = project / "src/content.json", project / "src/vo-timing.json"
    content = json.loads(cfile.read_text(encoding="utf-8"))
    for s in content["scenes"]:
        s.pop("rate", None)
    cfile.write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    run(project, "vo"); run(project, "srt")

    for i, s, d, words, room in table(content, json.loads(tfile.read_text())):
        speed = BASE * d / (words * 60 / TARGET_WPM)           # speed that would hit the target pace
        speed = max(SLOWEST, min(FASTEST, speed))
        speed = min(FIT_FASTEST, max(speed, BASE * d / room))  # never run past the scene
        s["rate"] = f"{round((speed - 1) * 100):+d}%"
    cfile.write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    run(project, "vo"); run(project, "srt")

    overruns = 0
    for i, s, d, words, room in table(content, json.loads(tfile.read_text())):
        over = d > room + MARGIN
        overruns += over
        print(f"{project.name} {i + 1:>2} rate {s['rate']:>5} {d:5.2f}s {round(words / d * 60):>3} wpm  room {room + MARGIN:4.1f}s{'  OVERRUN' if over else ''}")
    sys.exit(1 if overruns else 0)


if __name__ == "__main__":
    main()
