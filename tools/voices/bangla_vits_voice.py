"""Bangla: EMTIAZZ/bangladeshi-bangla-tts-vits (Apache-2.0) through its public Hugging Face Space.
The text leaves this machine (sent to the Space). The model drops Latin letters and digits, so write
numbers as Bangla words and English terms in Bangla script. No speed control and no word timings:
tools/vo.py changes tempo afterwards and estimates word times.
Job file: {"voice": {"space": url?}, "lines": [{"text", "speed", "out"}], "result": path}"""
import json, sys, time, urllib.request

job = json.load(open(sys.argv[1], encoding="utf8"))
SPACE = job["voice"].get("space", "https://emtiazz-bangla-vits-tts.hf.space/gradio_api")


def synthesize(text: str) -> bytes:
    body = json.dumps({"data": [text]}).encode("utf8")
    request = urllib.request.Request(f"{SPACE}/call/generate_speech", data=body, headers={"Content-Type": "application/json"})
    event = json.load(urllib.request.urlopen(request, timeout=60))["event_id"]
    stream = urllib.request.urlopen(f"{SPACE}/call/generate_speech/{event}", timeout=180).read().decode("utf8")
    done = [block for block in stream.split("\n\n") if block.startswith("event: complete")]
    if not done:
        raise RuntimeError(f"Space returned no audio: {stream[-200:]!r}")
    return urllib.request.urlopen(json.loads(done[-1].split("data: ", 1)[1])[0]["url"], timeout=120).read()


for line in job["lines"]:
    for attempt in range(4):  # the free Space drops requests now and then
        try:
            open(line["out"], "wb").write(synthesize(line["text"]))
            break
        except Exception:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
json.dump([{"words": None} for _ in job["lines"]], open(job["result"], "w", encoding="utf8"))
