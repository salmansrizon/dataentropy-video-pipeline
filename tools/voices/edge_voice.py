"""edge-tts (Microsoft neural voices through an unofficial client). DRAFTS ONLY: the service is not licensed
for published videos. Returns real word timings. Needs `pip install edge-tts`.
Job file: {"voice": {"name": "en-US-AvaNeural"}, "lines": [{"text", "speed", "out"}], "result": path}"""
import asyncio, json, sys

import edge_tts

job = json.load(open(sys.argv[1], encoding="utf8"))
name = job["voice"].get("name", "en-US-AvaNeural")


async def speak(line):
    rate = f"{round((line['speed'] - 1) * 100):+d}%"
    try:
        talk = edge_tts.Communicate(line["text"], name, rate=rate, boundary="WordBoundary")
    except TypeError:  # older edge-tts: word boundaries are the default
        talk = edge_tts.Communicate(line["text"], name, rate=rate)
    words = []
    with open(line["out"], "wb") as f:
        async for chunk in talk.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 1e7, 3)})
    return {"words": words or None}


async def main():
    results = []
    for line in job["lines"]:
        for attempt in range(4):  # the free service drops requests now and then
            try:
                results.append(await asyncio.wait_for(speak(line), 40))
                break
            except (edge_tts.exceptions.NoAudioReceived, asyncio.TimeoutError):
                if attempt == 3:
                    raise
                await asyncio.sleep(2 * (attempt + 1))
    json.dump(results, open(job["result"], "w", encoding="utf8"))

asyncio.run(main())
