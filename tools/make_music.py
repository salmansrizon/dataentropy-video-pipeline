"""Original background music for a video project, synthesized from code, so it is free to use with no license.

Jev picks one of the brand guideline's music styles for the video (one Choice). Code turns the style into
a tempo, chords and instruments, keys every section to the scene starts in content.json, and ducks the
music under each voiceover line (vo-timing.json).

Run: python tools/make_music.py <project-dir> [--style <name>] [--no-vary]   (Jev needs TYPESAFE_API_KEY; --style skips it)
By default the video gets its own key, tempo, chord order, arpeggio and melody seed, derived from the project
name, so two videos in the same style do not share a track. --no-vary plays the style exactly as defined.
Writes <project-dir>/public/music.wav and <project-dir>/out/music-style.json.
"""
import json, pathlib, sys, wave, zlib

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter

from lib import NEEDS_CLAUDE, ask, durations, video_dir

SR = 44100
CONFIDENCE_FLOOR = 0.6  # a wrong style is cheap to redo; below this use the brand default
DEFAULT_STYLE = "minimal_electronic"

# Chords are MIDI notes. Each style is the brand guideline's audio_guideline.music_style, made concrete.
STYLES = {
    "minimal_electronic": dict(bpm=112, chords=[[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
                               drums="four", arp=[0, 1, 2, 1, 0, 2, 1, 2], pump=0.35, brightness=1800),
    "modern_technology": dict(bpm=120, chords=[[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]],
                              drums="four", arp=[0, 2, 1, 2, 0, 2, 1, 3], pump=0.4, brightness=2600),
    "inspiring_corporate": dict(bpm=100, chords=[[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
                                drums="backbeat", arp=[0, 1, 2, 3, 2, 1, 2, 1], pump=0.0, brightness=2200),
    "light_future_bass": dict(bpm=150, chords=[[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [57, 60, 64, 67]],
                              drums="halftime", arp=[0, 2, 3, 2, 1, 2, 3, 2], pump=0.6, brightness=3200),
}

STYLE_CRITERIA = {
    "minimal_electronic": {
        "what": "Sparse, calm electronic pulse that stays out of the way of a step-by-step explanation",
        "examples": ["A quiet walkthrough of how a system processes data", "A focused, thoughtful explainer"],
    },
    "modern_technology": {
        "what": "Driving, precise electronic sound that feels like machines and data in motion",
        "examples": ["Data flowing through a pipeline", "A model computing an answer step by step"],
    },
    "inspiring_corporate": {
        "what": "Warm, uplifting and hopeful; suits a story about people gaining a skill or solving a problem",
        "examples": ["A beginner finally understands a concept", "A career-growth message"],
    },
    "light_future_bass": {
        "what": "Bright, playful and energetic; suits fast, upbeat social content",
        "not_for": "Calm or serious explanations",
        "examples": ["A punchy social clip with quick cuts", "A fun reveal or surprise"],
    },
}


def pick_style(project: pathlib.Path, content: dict) -> dict:
    inventory = json.loads((project / "motion-inventory.json").read_text(encoding="utf-8"))
    state = {"video": {
        "purpose": inventory["video"],
        "headlines": [s["headline"].replace("*", "").replace("\n", " ") for s in content["scenes"] if s["headline"]],
        "audience": "Beginners learning data and AI skills; vertical social video with a voiceover",
    }}
    from typesafe_sdk import Choice
    r = ask("music-style", project / "out", state, {"style": Choice(
            instructions="Which background music style best fits the tone of the video described in `video`? "
                         "The music plays quietly under a voiceover.",
            criteria=STYLE_CRITERIA)})
    a = r.answers["style"]
    chosen = a.choice if a.confidence >= CONFIDENCE_FLOOR else DEFAULT_STYLE
    return {"model": getattr(r, "model", "?"), "jev_choice": a.choice, "confidence": a.confidence,
            "probabilities": a.probabilities, "floor": CONFIDENCE_FLOOR, "style": chosen}


# ---------- synthesis ----------
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, cutoff, order=2): return lfilter(*butter(order, cutoff / (SR / 2)), x)


def hp(x, cutoff, order=2): return lfilter(*butter(order, cutoff / (SR / 2), "high"), x)


def place(buf, start, sig):
    i = int(start * SR)
    if i >= len(buf): return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n]


def saw(f, n, rng):
    t = np.arange(n) / SR
    return 2 * np.mod(f * t + rng.random(), 1.0) - 1


def pluck(f, dur, rng, bright):
    n = int(dur * SR); t = np.arange(n) / SR
    tone = 0.6 * saw(f, n, rng) + 0.4 * np.sin(2 * np.pi * f * t)
    return lp(tone, bright) * np.exp(-t / 0.18) * np.minimum(1, t / 0.004)


def bell(f, dur):
    t = np.arange(int(dur * SR)) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3.5 * f * t)
    return tone * np.exp(-t / 0.5) * np.minimum(1, t / 0.003)


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    phase = 2 * np.pi * np.cumsum(45 + 75 * np.exp(-t / 0.03)) / SR
    return np.sin(phase) * np.exp(-t / 0.12)


def hat(rng):
    n = int(0.05 * SR)
    return hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR / 0.012)


def clap(rng):
    n = int(0.2 * SR); t = np.arange(n) / SR
    noise = lfilter(*butter(2, [900 / (SR / 2), 3000 / (SR / 2)], "band"), rng.standard_normal(n))
    return noise * np.exp(-t / 0.06)


def envelope(n, segments):
    """Piecewise-linear gain over the track: segments = [(time_s, gain), ...] in time order."""
    t = np.arange(n) / SR
    times, gains = zip(*segments)
    return np.interp(t, times, gains)


def vary(style: dict, name: str) -> tuple[dict, dict]:
    """A per-video variant of a style. Same instruments and feel; different key, tempo and note order."""
    h = zlib.crc32(name.encode())
    v = {"transpose": h % 8 - 3, "bpm": (h >> 3) % 13 - 6, "chord_shift": (h >> 7) % 4, "arp_shift": (h >> 9) % 8, "seed": h % 10007}
    chords = [[note + v["transpose"] for note in chord] for chord in style["chords"]]
    chords = chords[v["chord_shift"]:] + chords[:v["chord_shift"]]
    arp = style["arp"][v["arp_shift"]:] + style["arp"][:v["arp_shift"]]
    return {**style, "bpm": style["bpm"] + v["bpm"], "chords": chords, "arp": arp}, v


def compose(content: dict, timing: list, style: dict, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    total = content["durationSeconds"]
    n = int(total * SR)
    beat = 60 / style["bpm"]
    starts = [s["start"] for s in content["scenes"]]
    snap = lambda s: round(s / beat) * beat  # layer entries land on a beat
    t_arp, t_drums, t_lift, t_cta = snap(starts[1]), snap(starts[2]), snap(starts[-2]), snap(starts[-1])
    chord_at = lambda t: style["chords"][int(t / (4 * beat)) % len(style["chords"])]

    pad, arp, bass, drums, lead = (np.zeros(n) for _ in range(5))

    # Pad: one chord per bar, detuned saws; the CTA holds the home chord to the end.
    bar = 4 * beat
    t = 0.0
    while t < total:
        chord = style["chords"][0] if t >= t_cta else chord_at(t)
        dur = (total - t) if t >= t_cta else min(bar, t_cta - t)
        m = int((dur + 0.3) * SR)
        seg = sum(saw(hz(note) * d, m, rng) for note in chord for d in (0.996, 1.0, 1.004))
        fade = np.minimum(1, np.minimum(np.arange(m) / (0.25 * SR), (m - np.arange(m)) / (0.3 * SR)))
        place(pad, t, seg * fade / (3 * len(chord)))
        if t >= t_cta: break
        t += dur
    pad = 0.6 * lp(pad, 900) + 0.4 * lp(pad, style["brightness"]) * envelope(n, [(0, 0), (t_lift, 0), (t_lift + bar, 1), (total, 1)])

    # Hook motif: four bell notes that rise through the home chord; it returns over the CTA.
    home = style["chords"][0]
    motif = [home[2] + 12, home[0] + 12, home[1] + 12, home[2] + 12]
    for t0 in (0.15, t_cta):
        for k, note in enumerate(motif):
            place(lead, t0 + k * beat / 2, bell(hz(note), 1.6) * (1.0 if k < 3 else 1.3))

    # Arpeggio: 16th-note pluck over the current chord, from the problem scene on.
    k = 0
    t = t_arp
    while t < total - beat:
        chord = chord_at(t) if t < t_cta else home
        idx = style["arp"][k % len(style["arp"])] % len(chord)
        place(arp, t, pluck(hz(chord[idx] + 12), 0.3, rng, style["brightness"]) * (1 if k % 4 == 0 else 0.7))
        k += 1
        t += beat / 4

    # Drums and bass: from the explanation scene until the CTA.
    pump = np.ones(n)
    b = 0
    t = t_drums
    k_sig, c_sig = kick(), clap(rng)
    while t < t_cta:
        pos = b % 4
        hit_kick = {"four": True, "backbeat": pos in (0, 2), "halftime": pos == 0}[style["drums"]]
        hit_clap = {"four": False, "backbeat": pos in (1, 3), "halftime": pos == 2}[style["drums"]]
        if hit_kick:
            place(drums, t, k_sig)
            m = int(beat * SR)
            dip = 1 - style["pump"] * np.exp(-np.arange(m) / SR / 0.12)
            i = int(t * SR)
            pump[i:i + m] = dip[:max(0, min(m, n - i))]
        if hit_clap: place(drums, t, 0.5 * c_sig)
        place(drums, t + beat / 2, 0.35 * hat(rng))
        if t >= t_lift: place(drums, t + beat / 4, 0.18 * hat(rng)); place(drums, t + 3 * beat / 4, 0.18 * hat(rng))
        root = hz(chord_at(t)[0] - 12)
        m = int(beat * 0.9 * SR); tt = np.arange(m) / SR
        place(bass, t, (np.sin(2 * np.pi * root * tt) + 0.2 * np.sin(4 * np.pi * root * tt)) * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.5))
        b += 1
        t += beat

    # Riser into the outcome scene.
    rise = int(2 * beat * SR)
    noise = lfilter(*butter(2, [2000 / (SR / 2), 8000 / (SR / 2)], "band"), rng.standard_normal(rise))
    riser = np.zeros(n); place(riser, t_lift - 2 * beat, noise * np.linspace(0, 1, rise) ** 2)

    # Mix to stereo with a short noise-tail reverb on the melodic parts.
    melodic = 0.55 * pad * envelope(n, [(0, 0), (1.2, 1), (total, 1)]) * pump + 0.35 * arp + 0.3 * lead
    dry = melodic + 0.55 * drums + 0.45 * bass * pump + 0.12 * riser
    out = np.zeros((n, 2))
    for ch in range(2):
        ir_t = np.arange(int(1.4 * SR)) / SR
        ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.35)
        wet = fftconvolve(melodic, ir / np.sqrt(np.sum(ir ** 2)))[:n]
        out[:, ch] = dry + 0.25 * wet
    out[:, 0] += 0.08 * arp; out[:, 1] -= 0.08 * arp  # slight width on the arpeggio

    # Fade the ending, then duck under each voiceover line.
    out *= envelope(n, [(0, 1), (total - 1.5, 1), (total, 0)])[:, None]
    talking = np.zeros(n)
    for sc, dur in zip(content["scenes"], timing):
        i, j = int(sc["voStart"] * SR), int((sc["voStart"] + dur) * SR)
        talking[i:j] = 1
    smooth = lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], talking)
    out *= (1 - 0.8 * smooth)[:, None]  # about -14 dB while the narrator speaks

    out *= 0.5 / np.max(np.abs(out))  # peak at -6 dBFS, leaving room for the voiceover
    return out


def main():
    project = video_dir(sys.argv[1])
    content = json.loads((project / "src/content.json").read_text(encoding="utf-8"))
    timing = durations(project)
    if "--style" in sys.argv:
        record = {"style": sys.argv[sys.argv.index("--style") + 1], "source": "--style override"}
    else:
        try:
            record = pick_style(project, content)
        except SystemExit as e:  # waiting for Claude's answer: stop here, do not fall back silently
            if e.code == NEEDS_CLAUDE: raise
            record = {"style": DEFAULT_STYLE, "source": "fallback (SystemExit)"}
        except Exception as e:  # fallback mode: Jev unavailable, use the brand default
            record = {"style": DEFAULT_STYLE, "source": f"fallback ({type(e).__name__})"}
    style = STYLES[record["style"]]

    seed = 7
    if "--no-vary" not in sys.argv:  # every video gets its own track unless told otherwise
        style, record["variation"] = vary(style, project.name)
        seed = record["variation"]["seed"]

    audio = compose(content, timing, style, seed)
    assert audio.shape == (int(content["durationSeconds"] * SR), 2) and np.isfinite(audio).all()

    (project / "public").mkdir(exist_ok=True); (project / "out").mkdir(exist_ok=True)
    with wave.open(str(project / "public/music.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((audio * 32767).astype("<i2").tobytes())
    (project / "out/music-style.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(project.name, json.dumps(record))


if __name__ == "__main__":
    main()
