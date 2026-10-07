# Word-level synchronisation of Remotion animation with local TTS voiceover

Scope note: all findings come from reading source, READMEs, official docs and papers. Nothing was installed or executed for this note, so every code example below is untested against the project. The current pipeline was read locally: `rag-video/scripts/make-srt.mjs` measures each `public/vo/scene-N.wav` up to the last loud sample and writes a flat array of durations to `src/vo-timing.json` (e.g. `[2.48,3.01,2.88,...]`); there is no per-word data anywhere.

## 1. Kokoro-82M (`kokoro` 0.9.x, `KPipeline`): per-token / per-word timestamps

### Takeaway
Yes, for English only. Each `KPipeline.Result` carries `tokens` (misaki `MToken` objects) whose `start_ts` / `end_ts` are seconds from the start of that result's audio chunk, derived from the model's own duration predictor (`result.pred_dur`, one integer per phoneme, 25 ms per unit). This is the cheapest route to word timing for English: no extra model, no alignment step.

### Cited Findings
- `Result` dataclass fields: `graphemes: str`, `phonemes: str`, `tokens: Optional[List[en.MToken]]`, `output: Optional[KModel.Output]`, `text_index: Optional[int]`; `audio` and `pred_dur` are properties that read from `output`. — [hexgrad/kokoro pipeline.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py)
- `MToken` fields: `text: str`, `tag: str`, `whitespace: str`, `phonemes: Optional[str]`, `start_ts: Optional[float]`, `end_ts: Optional[float]`, `_: Optional[Underscore]`. — [hexgrad/misaki token.py](https://raw.githubusercontent.com/hexgrad/misaki/main/misaki/token.py)
- Timestamps are filled by `KPipeline.join_timestamps(tokens, pred_dur)`. Source comments: "Multiply by 600 to go from pred_dur frames to sample_rate 24000. Equivalent to dividing pred_dur frames by 40 to get timestamp in seconds. We will count nice round half-frames, so the divisor is 80" (`MAGIC_DIVISOR = 80`). So one `pred_dur` unit = 600 samples = 25 ms at 24 kHz, and word boundaries are placed on a 12.5 ms grid. — [pipeline.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py)
- The start offset is a heuristic the author flags as unsettled: `# TODO: Is -3 an appropriate offset?` on `left = right = 2 * max(0, pred_dur[0].item() - 3)`. The inter-word space duration is split in half between the two neighbouring words ("This way we can cut space characters in half"). — [pipeline.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py)
- `join_timestamps` is called only in the English branches (`if self.lang_code in 'ab'`, the path that uses `self.g2p` / `en_tokenize`). The non-English branch yields results without tokens/timestamps. — [pipeline.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py)
- Tokens with no phonemes are skipped (they keep `start_ts = None`), and the loop `break`s if the token/phoneme count runs past `pred_dur`, so trailing tokens can also be `None`. — [pipeline.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py)
- Speed is already baked in: `duration = torch.sigmoid(duration).sum(axis=-1) / speed` then `pred_dur = torch.round(duration).clamp(min=1).long().squeeze()`. `KModel.Output` is `audio: torch.FloatTensor`, `pred_dur: Optional[torch.LongTensor]`. — [hexgrad/kokoro model.py](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/model.py)
- Supported `lang_code`s: `a` American English, `b` British English, `e` Spanish, `f` French, `h` Hindi, `i` Italian, `j` Japanese, `p` Brazilian Portuguese, `z` Mandarin. Bengali is not among them. Windows needs espeak-ng installed from the MSI. The README's own example only unpacks `(gs, ps, audio)` and does not document timestamps. — [hexgrad/kokoro README](https://raw.githubusercontent.com/hexgrad/kokoro/main/README.md)

### Inferences
- Minimal example (untested; built only from the attribute names verified above):
  ```python
  from kokoro import KPipeline
  import numpy as np, soundfile as sf, json

  pipe = KPipeline(lang_code='a')                 # 'a'/'b' only: other languages give no timestamps
  words, chunks, offset = [], [], 0.0
  for r in pipe(text, voice='af_heart', speed=1.0, split_pattern=None):
      for t in (r.tokens or []):
          if t.start_ts is None or t.end_ts is None:   # punctuation / overflow tokens
              continue
          words.append({"text": t.text,
                        "startMs": round((offset + t.start_ts) * 1000),
                        "endMs":   round((offset + t.end_ts) * 1000)})
      chunks.append(r.audio.numpy())
      offset += len(r.audio) / 24000              # timestamps are relative to each result chunk
  sf.write("scene-1.wav", np.concatenate(chunks), 24000)
  json.dump(words, open("scene-1.words.json", "w"))
  ```
- Per-phoneme timing is available without extra work: `r.pred_dur` has one entry per phoneme character of `r.phonemes` plus a leading `<bos>` and trailing `<eos>` entry (the code expects "at least 3: <bos>, token, <eos>"), so `cumsum(pred_dur) / 40` gives phoneme boundaries in seconds.
- Because `pred_dur` is computed after dividing by `speed`, timestamps already match audio generated with Kokoro's own `speed` argument. Any later change to the WAV (ffmpeg `atempo`, trimming leading silence, loudness tools that pad) invalidates them unless the same transform is applied to the times. The project's `make-vo.py` re-encodes through ffmpeg (`-ar 24000 -c:a pcm_s16le`); a plain re-encode preserves timing, a tempo filter does not.
- A long sentence may be split into several `Result`s (the code chunks at 510 phonemes), so the running `offset` in the example is required.
- Token granularity is misaki's, not whitespace words: punctuation is its own token, and numbers/abbreviations may be expanded. Mapping to caption words should be done by walking tokens and concatenating `t.text + t.whitespace`, not by `voiceover.split(' ')`.
- Timing resolution (12.5 ms grid) is finer than one video frame at 30 fps (33.3 ms), so it is sufficient for frame-level triggers if the durations are faithful.

### Gaps
- No published accuracy figure for Kokoro's `start_ts`/`end_ts` was found. The durations are the ones the decoder was told to synthesise, so they should be close by construction, but the `-3` offset TODO shows the absolute start offset is a guess. A one-off check against a forced aligner (section 3) on a few sentences is the way to measure it.
- The ONNX "timestamped" variant (onnx-community/Kokoro-82M-v1.0-ONNX-timestamped): the model card shows only generic usage and does not document the extra output's name or how to convert it; I could not verify the output tensor name. — [model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped). It is not needed if the PyTorch `kokoro` package is used.
- The installed `kokoro` version in the project's environment was not checked; `tokens[].start_ts` exists on `main`, exact first release not verified.

## 2. Chatterbox TTS (ResembleAI): alignment / word timings

### Takeaway
Chatterbox does not return word timings. It has an internal attention-alignment monitor used only to stop hallucinations, so the practical route is to force-align the generated WAV against the known script (section 3). It also has no Bengali voice.

### Cited Findings
- The README does not mention word timestamps or any alignment output. — [resemble-ai/chatterbox README](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/README.md)
- `ChatterboxTTS.generate(text, repetition_penalty=1.2, min_p=0.05, top_p=1.0, audio_prompt_path=None, exaggeration=0.5, cfg_weight=0.5, temperature=0.8)` has no timestamp/alignment option. — [chatterbox tts.py](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/src/chatterbox/tts.py)
- An `AlignmentStreamAnalyzer` exists internally; issues describe it forcing EOS via `long_tail` detection and detecting token repetition, i.e. it is a generation guard, not a user-facing output. It also crashes on very short text ("IndexError on max(dim=1) when text has 5 or fewer tokens"). — [issue #519](https://github.com/resemble-ai/chatterbox/issues/519), [issues list](https://github.com/resemble-ai/chatterbox/issues)
- Multilingual model languages: ar, da, de, el, en, es, fi, fr, he, hi, it, ja, ko, ms, nl, no, pl, pt, ru, sv, sw, tr, zh. Bengali is not listed. — [README](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/README.md)
- Every output carries the Perth neural watermark. — [README](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/README.md)

### Inferences
- Chatterbox is an autoregressive token model with sampling (`temperature=0.8`), so the same text yields different timing on every run. Timings must be measured from the specific WAV that ships, after generation, never predicted.
- Recommended: generate WAV, then force-align with the known text (stable-ts `align()` or ctc-forced-aligner for English).

### Gaps
- I could not open the `alignment_stream_analyzer.py` source (the path I tried returned 404), so I cannot say whether its attention map could be tapped to derive timings. No official statement from Resemble on a recommended alignment method was found.

## 3. Forced alignment and ASR word timestamps on CPU

### Takeaway
For English, forced alignment of the known script is the accurate route; the only head-to-head benchmark found puts Montreal Forced Aligner ahead of WhisperX and MMS (about 73% vs 53% vs 44% of word boundaries within 25 ms on TIMIT). For Bangla, the pip-installable options are the MMS-based CTC aligners (romanised text) or Whisper-based alignment; MFA, WhisperX and aeneas have no ready Bengali model.

### Cited Findings

Accuracy (human read speech, TIMIT):
- Word-boundary accuracy at tolerance ≤10 / ≤25 / ≤50 / ≤100 ms: MFA 41.6% / 72.8% / 89.4% / 97.4%; WhisperX 22.4% / 52.7% / 82.4% / 94.2%; MMS 18.6% / 43.5% / 75.7% / 94.7%. "The MFA outperformed both WhisperX and MMS." — [Rousso et al., Interspeech 2024, "Tradition or Innovation"](https://arxiv.org/abs/2406.19363)

WhisperX:
- Word timestamps come from "wav2vec2 alignment" (forced phoneme alignment after Whisper transcription). Install: `pip install whisperx`. CPU: `--compute_type int8 --device cpu`. — [m-bain/whisperX README](https://raw.githubusercontent.com/m-bain/whisperX/main/README.md)
- Limitation: "Transcript words which do not contain characters in the alignment models dictionary e.g. '2014.' or '£13.60' cannot be aligned and therefore are not given a timing." — [README](https://raw.githubusercontent.com/m-bain/whisperX/main/README.md)
- Default alignment models: torchaudio bundles for en (`WAV2VEC2_ASR_BASE_960H`), fr, de, es, it, plus a Hugging Face table (ja, zh, nl, uk, pt, ar, cs, ru, pl, hu, fi, fa, el, tr, da, he, vi, ko, ur, te, hi, ca, ml, no, sl, hr, ro, eu, gl, ka, lv, tl, sv, id). There is no `bn` entry; a custom model can be passed with `--align_model`. Output word dicts have `word`, `start`, `end`, `score`; `return_char_alignments=True` adds per-character timings. — [whisperx/alignment.py](https://raw.githubusercontent.com/m-bain/whisperX/main/whisperx/alignment.py)

faster-whisper:
- Install `pip install faster-whisper`; "Python 3.9 or greater"; "FFmpeg does not need to be installed on the system" (PyAV bundles it). CPU: `WhisperModel("large-v3", device="cpu", compute_type="int8")`. Word timestamps: `model.transcribe("audio.mp3", word_timestamps=True)` then `segment.words[]` with `word.start`, `word.end`, `word.word`. `vad_filter=True` available. Benchmark: 13 min of audio in 1m42s on CPU with int8 vs 6m58s for openai/whisper. — [SYSTRAN/faster-whisper README](https://raw.githubusercontent.com/SYSTRAN/faster-whisper/master/README.md)

stable-ts:
- Install `pip install -U stable-ts`. Aligns known text: `result = model.align('audio.mp3', text, language='en')`. Silence suppression is on by default and "adjusts timestamps based on detected non-speech sections". `model.refine()` iteratively tightens boundaries by muting audio and watching token probabilities. Saves JSON/SRT/VTT/ASS. — [jianfch/stable-ts README](https://raw.githubusercontent.com/jianfch/stable-ts/main/README.md)
- The README states: "Development on this repository is indefinitely paused." — [README](https://raw.githubusercontent.com/jianfch/stable-ts/main/README.md)

Montreal Forced Aligner:
- Pretrained acoustic models are listed for Bulgarian, Croatian, Czech, English, French, German, Hausa, Japanese, Korean, Mandarin, Polish, Portuguese, Russian, Swahili, Swedish, Thai, Turkish, Ukrainian, Vietnamese. English models: "English MFA acoustic model v3_1_0" and "English (US) ARPA acoustic model v3_0_0" (CC BY 4.0). Bengali is not listed. — [mfa-models acoustic index](https://mfa-models.readthedocs.io/en/latest/acoustic/index.html)
- Models are fetched with `mfa model download acoustic <name>` / `mfa model download dictionary <name>`. — [MFA pretrained models docs](https://montreal-forced-aligner.readthedocs.io/en/latest/user_guide/models/index.html)

torchaudio MMS_FA:
- `from torchaudio.pipelines import MMS_FA as bundle`; `bundle.get_model()`, `bundle.get_tokenizer()`, `bundle.get_aligner()`; 16 kHz input; trained on "23,000 hours of audio from 1100+ languages"; non-Latin scripts must be romanised first (uroman). — [torchaudio multilingual forced alignment tutorial](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_for_multilingual_data_tutorial.html)
- Deprecation: "The APIs described in this tutorial are deprecated in 2.8 and will be removed in 2.9." — [same tutorial](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_for_multilingual_data_tutorial.html)

ctc-forced-aligner:
- Install `pip install git+https://github.com/MahmoudAshraf97/ctc-forced-aligner.git` (FFmpeg required). Default model `MahmoudAshraf/mms-300m-1130-forced-aligner`; "1130+ languages" by ISO 639-3 code; sentence, word or character granularity; "At least 5X less memory" than the torchaudio API. CLI: `ctc-forced-aligner --audio_path "audio.wav" --text_path "text.txt" --language "eng" --romanize`. Output is JSON segments with `start`, `end`, `text`. Python API: `load_audio()`, `generate_emissions()`, `preprocess_text()`, `get_alignments()`. Code is BSD; the default model is CC-BY-NC 4.0. — [ctc-forced-aligner README](https://raw.githubusercontent.com/MahmoudAshraf97/ctc-forced-aligner/main/README.md)

aeneas:
- Requires Python "2.7 (Linux, OS X, Windows) or 3.5 or later (Linux, OS X)", plus eSpeak and FFmpeg; a Windows all-in-one installer exists. "Confirmed working on 38 languages" (AFR ... UKR); Bengali is not in that list. It works by synthesising the text with a TTS engine (eSpeak default) and aligning via DTW. — [readbeyond/aeneas README](https://raw.githubusercontent.com/readbeyond/aeneas/master/README.md)

Summary table (accuracy cells are from the one benchmark above; "n/f" = no figure found):

| Tool | Windows / CPU install | Word-boundary accuracy | Bengali |
|---|---|---|---|
| Kokoro `start_ts` (section 1) | already in the TTS env | n/f | no (no Bengali voice) |
| faster-whisper `word_timestamps` | one pip package, no FFmpeg | n/f | Whisper has a Bengali language code; timing quality n/f |
| stable-ts `align()` | one pip package (pulls torch + whisper); repo paused | n/f | via Whisper `language='bn'`; quality n/f |
| WhisperX | pip, heavier (torch, pyannote deps) | 52.7% within 25 ms, 82.4% within 50 ms | no default align model |
| MFA | conda-based (Kaldi), heaviest | 72.8% within 25 ms, 89.4% within 50 ms | no pretrained model |
| torchaudio MMS_FA | pip torch/torchaudio, pin below 2.9; uroman needed | 43.5% within 25 ms, 75.7% within 50 ms (MMS) | yes, via romanisation |
| ctc-forced-aligner | pip from git + FFmpeg | n/f (same MMS family) | yes, `--language ben --romanize` |
| aeneas | officially Python 2.7 on Windows; legacy | n/f | not in confirmed list |

### Inferences
- The benchmark numbers are for natural human speech. Clean single-speaker TTS audio with an exactly known transcript is an easier case, so real errors are likely smaller, but no source measured this.
- English recommendation: use Kokoro's own `start_ts`/`end_ts` when the voice is Kokoro; for Chatterbox or any other engine, align the known script with stable-ts `align()` or ctc-forced-aligner. MFA is the most accurate but its conda/Kaldi install is the least convenient with a uv-per-tool setup (MFA's documented install is conda; I did not verify a uv/pip path).
- Bangla recommendation: ctc-forced-aligner with `--language ben --romanize` is the only option found that is pip-installable, CPU-friendly and explicitly covers Bengali. Second choice: stable-ts `align()` with `language='bn'`. For a Coqui VITS voice, the model's own durations (section 4) avoid alignment entirely.
- Use alignment of the known text, not free transcription, whenever possible: plain ASR (`word_timestamps=True`) can mis-spell technical words ("CTE", "RAG"), which breaks the mapping from caption words to timings. If ASR is used, map by word index after normalising, and fail loudly when counts differ.
- WhisperX-style aligners drop timings for digits and symbols; write numbers as words in the `tts` text, or expect gaps to interpolate.
- Licence check: the MMS aligner weights are CC-BY-NC 4.0. Whether using them to time a commercial brand video counts as commercial use is a question for the user, not something the sources settle.
- torchaudio's forced-alignment API is being removed in 2.9, so a new dependency on `torchaudio.pipelines.MMS_FA` needs a version pin; ctc-forced-aligner is the lower-maintenance choice.

### Gaps
- No millisecond word-boundary error was found for faster-whisper, stable-ts, ctc-forced-aligner or aeneas, and none at all for Bengali with any tool.
- Windows install was assessed from documented requirements only; nothing was installed. Known unknowns: MFA under uv, uroman on Windows, WhisperX's dependency weight on CPU-only torch.
- Whether Whisper's Bengali word timestamps are usable on synthetic Bangla speech is untested.

## 4. Coqui VITS (Bangla, character-based): durations from the duration predictor

### Takeaway
Yes. VITS inference computes an integer frame count per input token and returns it in the outputs dict under `durations` (with the hard alignment matrix under `alignments`). With the default audio config one frame is 256 samples at 22,050 Hz, about 11.6 ms.

### Cited Findings
- `Vits.inference()` computes `logw` from the duration predictor (stochastic when `use_sdp`, with `noise_scale=self.inference_noise_scale_dp`), then `w = torch.exp(logw) * x_mask * self.length_scale`, builds the alignment with `generate_path(...)`, and returns a dict with keys `model_outputs`, `alignments`, `durations`, `z`, `z_p`, `m_p`, `logs_p`, `y_mask`. — [coqui-ai/TTS vits.py](https://raw.githubusercontent.com/coqui-ai/TTS/dev/TTS/tts/models/vits.py)
- `VitsAudioConfig` defaults: `hop_length = 256`, `sample_rate = 22050`. `length_scale` scales durations ("Smaller values result faster speech"). `use_sdp: bool = True`, `inference_noise_scale_dp: float = 1.0`. — [vits.py](https://raw.githubusercontent.com/coqui-ai/TTS/dev/TTS/tts/models/vits.py)

### Inferences
- Per-character start time = cumulative sum of `durations` × `hop_length / sample_rate`. Use the model's actual config values, not the defaults, for the specific Bangla checkpoint.
- Word times follow by grouping characters between spaces. If the checkpoint was trained with blank tokens interspersed (`add_blank`), the duration vector has an entry per blank as well, so index mapping must follow the tokenizer's real output sequence, not the raw string.
- With the stochastic duration predictor, durations change on every run unless the seed is fixed or `inference_noise_scale_dp` is set to 0; either way the durations returned belong to the audio returned in the same call, so save both together.
- The high-level `TTS(...).tts_to_file()` API returns only audio, so getting `durations` means calling the model's `inference()` (or the lower-level synthesis helper) directly. This is from memory of the codebase and was not verified in this session.
- These are the durations the decoder was conditioned on, so they should match the waveform closely, like Kokoro's.

### Gaps
- Not verified: which variable is stored under `durations` (expected: the ceil-rounded per-token frame counts), and the exact return shape of Coqui's `synthesis()` helper. Check against the installed package before relying on it.
- The specific Bangla checkpoint's config (sample rate, hop length, `add_blank`, phoneme vs character input) was not inspected.
- No accuracy measurement of VITS-predicted durations vs the actual waveform was found.

## 5. Remotion APIs for word-timed captions and audio-driven animation

### Takeaway
`@remotion/captions` (already installed at 4.0.529 in the workspace root) defines the `Caption` word-timing shape and `createTikTokStyleCaptions()` to page it; these are pure functions with no audio dependency, so any Python aligner can feed them through a JSON file. `@remotion/media-utils` gives amplitude/spectrum data per frame for audio-reactive motion, but not word timing.

### Cited Findings
- Installed type (read from `node_modules/@remotion/captions/dist/caption.d.ts`, package present in the workspace at Remotion 4.0.529):
  ```ts
  export type Caption = {
      text: string;
      startMs: number;
      endMs: number;
      timestampMs: number | null;
      confidence: number | null;
      pageBreakAfter?: boolean;
  };
  ```
  The package also ships `parse-srt`, `serialize-srt` and `ensure-max-characters-per-line`. Docs describe `Caption` as the standard shape for captions from different sources. — [@remotion/captions API](https://www.remotion.dev/docs/captions/api)
- `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds, breakOnSilenceAfterMilliseconds?})` returns `{pages}`; installed types: `TikTokPage = {text, startMs, tokens: TikTokToken[], durationMs}`, `TikTokToken = {text, fromMs, toMs, pageBreakAfter?}`. "The `text` field is whitespace sensitive. You should include spaces in it, ideally before each word"; render with `white-space: pre`. — [createTikTokStyleCaptions docs](https://www.remotion.dev/docs/captions/create-tiktok-style-captions)
  ```tsx
  import {createTikTokStyleCaptions, Caption} from '@remotion/captions';
  const {pages} = createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: 1200});
  ```
- Displaying: docs load with `fetch(staticFile('captions.json'))` held by `useDelayRender()`, place each page in a `<Sequence>` at `(page.startMs / 1000) * fps`, and highlight the active word with `token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs`, where `absoluteTimeMs = page.startMs + (frame / fps) * 1000`. — [Displaying captions](https://www.remotion.dev/docs/captions/displaying)
- `useAudioData(src)` returns `MediaUtilsAudioData | null` and wraps loading in `delayRender()`/`continueRender()`. Installed type: `{channelWaveforms: Float32Array[]; sampleRate: number; durationInSeconds: number; numberOfChannels: number; resultId: string; isRemote: boolean}` (`AudioData` is a deprecated alias). — [useAudioData docs](https://www.remotion.dev/docs/use-audio-data)
  ```tsx
  const audioData = useAudioData(staticFile('vo/scene-1.wav'));
  if (!audioData) return null;
  ```
- `visualizeAudio({audioData, frame, fps, numberOfSamples, smoothing?, optimizeFor?, dataOffsetInSeconds?})` returns `number[]`, "the amplitude of each frequency range. Each value is between 0 and 1"; `numberOfSamples` must be a power of two. — [visualizeAudio docs](https://www.remotion.dev/docs/visualize-audio)
  ```tsx
  const bars = visualizeAudio({fps, frame, audioData, numberOfSamples: 16});
  ```
- `useWindowedAudioData({src, frame, fps, windowInSeconds, channelIndex?})` returns `{audioData, dataOffsetInSeconds}` (installed `use-windowed-audio-data.d.ts`); `visualizeAudio` accepts the matching `dataOffsetInSeconds`. — [visualizeAudio docs](https://www.remotion.dev/docs/visualize-audio)
- `getAudioDurationInSeconds(src): Promise<number>` is deprecated: "Use `getMediaMetadata()` instead, which is faster and supports more formats." It runs in the browser/Chromium only, not in Node or Bun. — [getAudioDurationInSeconds docs](https://www.remotion.dev/docs/get-audio-duration-in-seconds)
- `@remotion/install-whisper-cpp`: `transcribe({inputPath, whisperPath, whisperCppVersion, model, tokenLevelTimestamps, language, splitOnWord, tokensPerItem})`; input must be a "16-bit, 16KHz, WAVE file"; `tokenLevelTimestamps` enables DTW timestamps (token field `t_dtw`); items carry `timestamps {from,to}`, `offsets {from,to}`, `text`, `tokens`. Node/Bun only; Windows needs a compatible Whisper.cpp executable. — [transcribe docs](https://www.remotion.dev/docs/install-whisper-cpp/transcribe)
- `toCaptions({whisperCppOutput})` returns `{captions: Caption[]}`, available from v4.0.216. — [toCaptions docs](https://www.remotion.dev/docs/install-whisper-cpp/to-captions)
  ```tsx
  const whisperCppOutput = await transcribe({
    inputPath: '/path/to/audio.wav',
    whisperPath: path.join(process.cwd(), 'whisper.cpp'),
    whisperCppVersion: '1.5.5',
    model: 'medium.en',
    tokenLevelTimestamps: true,
  });
  const {captions} = toCaptions({whisperCppOutput});
  ```
- `@remotion/whisper-web` also provides a `toCaptions()`, listed alongside converters for OpenAI Whisper and ElevenLabs. — [@remotion/captions API](https://www.remotion.dev/docs/captions/api)

### Inferences
- Storage for determinism: compute timings once in the VO step and commit them as JSON next to the audio, so rendering never runs a model. Suggested shape (my proposal, reusing `Caption` so `createTikTokStyleCaptions` works unchanged), written by a Python step that replaces the duration-only part of `make-srt.mjs`:
  ```json
  {
    "audio": "vo/scene-1.wav",
    "audioSha256": "<hash of the wav the timings were measured from>",
    "source": "kokoro-pred_dur | ctc-forced-aligner | vits-durations",
    "durationMs": 2480,
    "words": [
      {"text": "Retrieval", "startMs": 120, "endMs": 610, "timestampMs": null, "confidence": null},
      {"text": " finds", "startMs": 610, "endMs": 905, "timestampMs": null, "confidence": null}
    ]
  }
  ```
  Times are relative to the scene's WAV; the composition adds `voStart`. The hash lets the build fail when a WAV is regenerated without re-timing, which matters most for sampling-based engines (Chatterbox, VITS with the stochastic duration predictor).
- The project already imports `src/vo-timing.json` statically. Importing the word JSON the same way keeps the render synchronous and deterministic with no `delayRender`; the docs' `fetch(staticFile())` pattern is equally deterministic but adds an async load. Either is fine; the static import is the smaller change.
- Word-triggered animation needs no new Remotion API: resolve a cue to a frame once and feed it to the existing `kf`/`enter` helpers in place of `S[i] + offset`:
  ```ts
  // frame at which word #n of scene i starts (leadFrames: see section 6)
  const cue = (i: number, n: number, leadFrames = 2) =>
    Math.round((scenes[i].voStart + words[i][n].startMs / 1000) * fps) - leadFrames;
  ```
  Referencing cues by word index is brittle when copy changes; a marker in the voiceover text (the brief already uses `*word*` for highlights) resolved to an index at build time is sturdier.
- `visualizeAudio`/`useAudioData` suit decoration that follows loudness (a pulsing speaker glyph), not semantic triggers. They add a decode step per render and are not needed for word sync.
- `@remotion/install-whisper-cpp` would keep everything in Node, but it transcribes rather than aligning known text, requires 16 kHz WAVs (the project writes 24 kHz), and is not installed. A Python aligner writing `Caption`-shaped JSON avoids all three issues.
- Rounding: at 30 fps one frame is 33.3 ms, so `Math.round` introduces up to ±16.7 ms of error, well inside the thresholds in section 6.

### Gaps
- `@remotion/whisper-web` details (API, model sizes, browser-only constraints) were not fetched.
- The meaning of `timestampMs` (a single-point timestamp, as opposed to the start/end range) is inferred from the name and the `t_dtw` field; the `/docs/captions/caption` page returned 404 when fetched.
- `@remotion/install-whisper-cpp` Bengali behaviour and Windows binary availability were not tested.
- The composition's fps was not checked; the frame arithmetic above assumes 30.

## 6. Perception: how far off may the visual be, and should it lead or lag?

### Takeaway
Viewers tolerate sound arriving after the picture far better than sound arriving before it. Broadcast testing puts detectability at about 45 ms when sound is early and about 125 ms when sound is late. So a visual event should land on the word or slightly before it, and should not trail the word by more than about one frame at 30 fps.

### Cited Findings
- ITU-R BT.1359-1 (1998), read from the PDF text: "subjective evaluations show that detectability thresholds are about +45 ms to –125 ms and acceptability thresholds are about +90 ms to –185 ms on the average, a positive value indicates that sound is advanced with respect to vision". — [ITU-R BT.1359-1](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf)
- Same document: overall end-to-end tolerance "shall not exceed +90 ms or –185 ms"; the zone a programme producer controls is taken as +25 ms to −100 ms, and the text notes a "plateau of undetectability" and that a producer "may have selected 'for artistic effect' a non-zero relative timing". — [ITU-R BT.1359-1](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf)
- van Wassenhove, Grant and Poeppel (2007), audiovisual speech: an asymmetric integration window of roughly 200 ms; fusion responses were prevalent "from −30 ms to +170 ms" (positive = audio lagging the visual) and "more robust for audio lags". — [Temporal window of integration in auditory-visual speech perception, Neuropsychologia](https://sciencedirect.com/science/article/abs/pii/S002839320600011X?via=ihub%3D)

### Inferences
- Translated to "visual relative to the spoken word": visual late (sound first) becomes noticeable around 45 ms, about 1.3 frames at 30 fps; visual early (sound after) is not noticed until about 125 ms, about 3.7 frames. Both sources agree on the direction of the asymmetry.
- Practical target: start the visual event 0 to 3 frames (0 to 100 ms) before the word's onset and never more than 1 frame after it. A default lead of 2 frames (67 ms) sits in the middle of the undetectable zone and absorbs aligner error: the TIMIT benchmark in section 3 shows even the weakest aligner has about 76% of boundaries within 50 ms and about 95% within 100 ms.
- For eased entrances the perceptually relevant moment is not well defined. With the brand ease-out curve most of the movement happens in the first third of the duration, so anchoring the animation's start (minus the lead) to the word onset is a reasonable reading; anchoring the end of a 12 to 30 frame entrance to the word would make the element appear to move 0.4 to 1 s before it is named. This is a design inference, not something the sources tested.
- Total error budget = aligner error + frame rounding (up to 16.7 ms at 30 fps) + chosen lead. Kokoro's 12.5 ms timestamp grid and VITS's 11.6 ms frames are both finer than the frame rounding, so the aligner's systematic offset, not its resolution, is the thing to measure.

### Gaps
- Both sources concern lip-sync or audiovisual speech (a talking face and its sound). No study was found on synchrony thresholds for motion-graphics events or caption highlights against narration, so applying these numbers to explainer animation is an extrapolation.
- Other standards and studies often cited on this topic (EBU R37, ATSC IS-191, Dixon and Spitz 1980, Vatakis and Spence) were not retrieved in this session and are not relied on here.
- No source was found on whether word-accurate triggering measurably improves engagement or retention compared with scene-level timing.
