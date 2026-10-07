# RAG Explainer: DataEntropy, 30 s, 1080×1920

A branded Remotion explainer. The question travels through one continuous scene:

1. Documents split into chunks.
2. The chunks become points in a searchable index.
3. A pulse selects the relevant points.
4. Those join the question in a prompt, which goes into the model.
5. An answer forms, with lines back to its sources.

It closes with the DataEntropy logo, tagline and a single call to action. The styling follows `../Brand_Guideline/guideline.json`: light background, navy and violet palette, Inter font, left-aligned headlines, navy subtitle bar, and content kept inside the safe area.

## Commands

```bash
npm install
npm run preview     # Remotion Studio (scrub the timeline)
npm run render      # -> out/rag-explainer.mp4
npm run vo          # regenerate public/vo/*.wav (Microsoft neural voice via edge-tts)
npm run srt         # measure the voiceover -> src/vo-timing.json + out/captions.srt
npm run typecheck
python ../tools/motion_review.py .   # Jev reviews motion-inventory.json against the motion policy -> out/motion-review.json
```

After changing any voiceover text, run `npm run vo && npm run srt`. The `srt` script prints each line's speed and warns when a line runs past its scene.

## Where to edit

All editable values are in **`src/content.json`**:

| What | Key |
| --- | --- |
| Question / answer | `question`, `answer`, `answerNote` |
| Document snippets | `documents[].chunks[]`: `text`, `relevant`, `source` |
| Colors (brand palette) | `colors` |
| Logo text, tagline, CTA | `brand` |
| Scene timing | `scenes[].start` (seconds); animations follow their scene start |
| Headline per scene | `scenes[].headline`: `\n` = line break, `*words*` = violet highlight (max 2 lines) |
| Voiceover / subtitles | `scenes[].voiceover` (`*words*` = lavender highlight), `voStart` (seconds), optional `tts` (spoken text if it differs, e.g. "Data Entropy") |

The voice is `en-US-AndrewNeural` at -10% speed (`pip install edge-tts` once). Change it with `python scripts/make-vo.py --voice en-US-AvaNeural --rate -5%`. For published videos, prefer a licensed service (Azure AI Speech offers the same voices) or a recording saved as `public/vo/scene-1.wav` … `scene-7.wav`. Afterwards, run `npm run srt` so the subtitle timing matches. The guideline's pace is 135–155 words per minute.

Keep exactly three chunks marked `relevant: true`.

Layout, camera keyframes and components live in `src/RagVideo.tsx`: `Question`, `Document`, `Chunk`, `SearchableMap`, `RetrievalPulse`, `Prompt`, `Model`, `Answer`, `SourceConnector`, `Headline`, `Subtitles` and `Outro`.

**Logo:** `Outro` redraws the DataEntropy logo from the brand image: four gradient bars above a Poppins Bold wordmark with a violet "E". Sizes are in `LOGO`. If you have the official SVG, drop it in to replace the drawn version.

## Voiceover script

| Time | Line |
| --- | --- |
| 0.3 s | How can AI answer from your own documents? |
| 4.2 s | Documents are split into small searchable chunks. |
| 8.9 s | The question finds the chunks most relevant to it. |
| 13.8 s | Those chunks join the question as context for the model. |
| 19.0 s | The model writes an answer grounded in that context. |
| 22.2 s | That's RAG: retrieve, add context, generate. |
| 27.0 s | Follow DataEntropy for practical data skills. |

The refund policy shown is a fictional example.
