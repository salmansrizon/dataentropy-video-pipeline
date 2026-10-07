"""Chatterbox (ResembleAI, MIT), English, local CPU (about 13x slower than real time on a laptop CPU).
Runs inside .venv-chatterbox (Python 3.11). Expression: voice.exaggeration (default 0.5) and voice.cfg_weight (0.5);
voice.reference is an optional WAV of the speaker to imitate (only with that person's consent).
It has no speed control and no word timings: tools/vo.py changes tempo afterwards and estimates word times.
Job file: {"voice": {...}, "lines": [{"text", "speed", "out"}], "result": path}"""
import json, sys

import soundfile as sf
from chatterbox.tts import ChatterboxTTS

job = json.load(open(sys.argv[1], encoding="utf8"))
v = job["voice"]
model = ChatterboxTTS.from_pretrained(device="cpu")
for line in job["lines"]:
    wav = model.generate(line["text"], exaggeration=v.get("exaggeration", 0.5), cfg_weight=v.get("cfg_weight", 0.5), audio_prompt_path=v.get("reference"))
    sf.write(line["out"], wav.squeeze().numpy(), model.sr, subtype="PCM_16", format="WAV")
json.dump([{"words": None} for _ in job["lines"]], open(job["result"], "w", encoding="utf8"))
