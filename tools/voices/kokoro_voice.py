"""Kokoro-82M (Apache-2.0), English, local CPU. Runs inside .venv-kokoro (Python 3.10-3.12). Returns real word timings.
Job file: {"voice": {"name": "af_heart"}, "lines": [{"text", "speed", "out"}], "result": path}"""
import json, sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

job = json.load(open(sys.argv[1], encoding="utf8"))
name = job["voice"].get("name", "af_heart")
pipeline = KPipeline(lang_code=name[0], repo_id="hexgrad/Kokoro-82M")  # voice names start with their language code
results = []
for line in job["lines"]:
    audio, words, offset = [], [], 0.0
    for chunk in pipeline(line["text"], voice=name, speed=line["speed"]):
        for tok in getattr(chunk, "tokens", None) or []:
            if tok.start_ts is not None and tok.end_ts is not None and any(ch.isalnum() for ch in tok.text):
                words.append({"text": tok.text, "start": round(offset + tok.start_ts, 3), "end": round(offset + tok.end_ts, 3)})
        audio.append(np.asarray(chunk.audio))
        offset += len(audio[-1]) / 24000
    sf.write(line["out"], np.concatenate(audio), 24000, subtype="PCM_16", format="WAV")
    results.append({"words": words or None})
json.dump(results, open(job["result"], "w", encoding="utf8"))
