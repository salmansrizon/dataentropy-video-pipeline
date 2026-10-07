# Bangla TTS: making narration more human and expressive (from EMTIAZZ/bangladeshi-bangla-tts-vits)

Research date: 2026-10-07. Target machine: Windows 11, CPU only. Videos are published, so licence matters.

Reliability note for the writer: pages were read through a summarising fetch tool. Numeric config values and licence strings are reliable; the exact Bangla character list of the model's vocabulary came back visibly garbled (duplicates despite `is_unique: true`) and must be re-read from the raw file before anyone relies on it. Each such point is flagged below.

## 1. Coqui VITS inference parameters: what they control, defaults, how to set them

### Takeaway
VITS has three inference knobs: `inference_noise_scale` (variation in voice/intonation, default 0.667), `inference_noise_scale_dp` (variation in rhythm/phoneme durations, default 0.8) and `length_scale` (speed, default 1.0, larger = slower). They are model attributes read from `config.json` `model_args`, so they can only be changed where the model is loaded: locally, not through the author's Gradio Space, which exposes a single text box.

### Cited Findings
- `inference_noise_scale`: "Noise scale used for the sample noise tensor in inference. Defaults to 0.667." — [Coqui VITS docs](https://docs.coqui.ai/en/latest/models/vits.html)
- `inference_noise_scale_dp`: "Noise scale for the Stochastic Duration Predictor in inference. Defaults to 0.8." — [Coqui VITS docs](https://docs.coqui.ai/en/latest/models/vits.html)
- `length_scale`: "Scale factor for the predicted duration values. Smaller values result faster speech. Defaults to 1." — [Coqui VITS docs](https://docs.coqui.ai/en/latest/models/vits.html)
- `noise_scale` and `noise_scale_dp` (both default 1.0) are the training-time counterparts; they are documented as "in training" and are not what inference reads. — [Coqui VITS docs](https://docs.coqui.ai/en/latest/models/vits.html)
- `use_sdp` (Stochastic Duration Predictor) defaults to True; `inference_noise_scale_dp` only has an effect when it is on. — [Coqui VITS docs](https://docs.coqui.ai/en/latest/models/vits.html); [vits.py, idiap fork](https://raw.githubusercontent.com/idiap/coqui-ai-TTS/dev/TTS/tts/models/vits.py)
- In `Vits.inference()` the values are used as model attributes: durations `w = torch.exp(logw) * x_mask * self.length_scale`; latent sampling `z_p = m_p + torch.randn_like(m_p) * torch.exp(logs_p) * self.inference_noise_scale`; `inference_noise_scale_dp` is passed to the duration predictor when `use_sdp=True`. `length_scale` is not a per-call argument; it is set when the model is initialised from config. — [vits.py, idiap fork](https://raw.githubusercontent.com/idiap/coqui-ai-TTS/dev/TTS/tts/models/vits.py)
- `Synthesizer.__init__` takes `tts_checkpoint`, `tts_config_path`, `use_cuda` etc. and loads the config into `self.tts_config`; the loaded model is `self.tts_model`. Both are plain instance attributes after construction. `Synthesizer.tts()` accepts `**kwargs`, which are forwarded to the model's synthesize path; no explicit `noise_scale`/`length_scale` parameters are declared on it. — [synthesizer.py, idiap fork](https://raw.githubusercontent.com/idiap/coqui-ai-TTS/dev/TTS/utils/synthesizer.py)
- `Synthesizer.tts()` splits input into sentences with `pysbd` and inserts 10000 zero samples (`PAD_SILENCE_SAMPLES = 10000`, about 0.45 s at 22050 Hz) between sentences. — [synthesizer.py, idiap fork](https://raw.githubusercontent.com/idiap/coqui-ai-TTS/dev/TTS/utils/synthesizer.py)
- The Space's `app.py` builds `Synthesizer(tts_checkpoint=model_path, tts_config_path=config_path, use_cuda=False)` and calls `synthesizer.tts(text.strip())`. Its only input is one `gr.Textbox`; output is `gr.Audio(type="filepath")`. No speed/noise inputs exist. — [Space app.py](https://huggingface.co/spaces/EMTIAZZ/bangla-vits-tts/raw/main/app.py)
- This model's `config.json` `model_args`: `noise_scale` 1.0, `noise_scale_dp` 1.0, `length_scale` 1.0, `inference_noise_scale` 0.667, `inference_noise_scale_dp` 1.0, `use_sdp` true. Note `inference_noise_scale_dp` is 1.0 here, above the library default of 0.8. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- VITS output is non-deterministic because of the stochastic duration predictor; a fixed seed is needed to reproduce a take. — [facebook/mms-tts-ben card](https://huggingface.co/facebook/mms-tts-ben)

### Inferences
- Two ways to change the knobs locally, both following from the source above: (a) edit a local copy of `config.json` `model_args` (`inference_noise_scale`, `inference_noise_scale_dp`, `length_scale`) before constructing the `Synthesizer`; (b) after construction set `synthesizer.tts_model.length_scale`, `.inference_noise_scale`, `.inference_noise_scale_dp`. Not executed here; needs a local smoke test.
- Through someone else's Gradio Space the parameters cannot be changed, because the API surface is the text box only. Options are to run locally or duplicate the Space and edit `app.py`/config.
- Direction of effect (from the formulas): higher `inference_noise_scale` = more pitch/timbre variation, livelier but with more risk of artefacts; lower = flatter and more stable. Higher `inference_noise_scale_dp` = more irregular, "spoken" rhythm; lower = more even, read-aloud rhythm. `length_scale` 1.1 to 1.2 slows speech by about 10 to 20%.
- Suggested starting grid to audition (a proposal, not a measured optimum): `inference_noise_scale` 0.5 / 0.667 / 0.8; `inference_noise_scale_dp` 0.6 / 0.8 / 1.0; `length_scale` 1.0 / 1.1. Because output is stochastic, render several seeds per line and keep the best take.
- Since this model already ships with `inference_noise_scale_dp` 1.0, uneven pacing in the Space output may improve by lowering it towards 0.8 rather than raising it.
- Sentence-level control is available without model changes: synthesise sentence by sentence and insert your own pauses, instead of relying on the fixed 10000-sample gap.
- Ceiling: a single-speaker VITS has no emotion or style input. These knobs add variation, not intent (no emphasis, no excitement on a chosen word).

### Gaps
- No published recommended values for Bangla VITS were found; the "typical" 0.667 / 0.8 / 1.0 are library defaults only.
- Whether `Synthesizer.tts(text, length_scale=...)` kwargs reach the VITS model in TTS 0.22.0 specifically was not verified (the signature read was the idiap fork's `dev` branch). Setting attributes on `tts_model` or editing config is the safer documented path.
- The Coqui 0.22 `Synthesizer` sentence segmenter language for a single-language model was not confirmed; whether pysbd splits on the danda "।" is unknown and should be tested locally.

## 2. This model's config: characters, phonemizer, and handling of Latin, digits, English, danda

### Takeaway
The model is a character-based (no phonemizer, no text cleaner) single-speaker VITS at 22050 Hz whose vocabulary is Bangla script plus the punctuation `.?-!|, `. Coqui silently drops any character outside the vocabulary, so Latin letters and ASCII digits are skipped, not spoken; all normalisation must be done before sending text.

### Cited Findings
- `model`: vits; `audio.sample_rate` 22050 (fft 1024, hop 256, win 1024, 80 mels); `use_phonemes` false; `phonemizer` null; `phoneme_language` null; `text_cleaner` null; `add_blank` true; `enable_eos_bos_chars` false. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- `characters_class` is `TTS.tts.utils.text.characters.Graphemes`; pad `<PAD>`, bos `<BOS>`, blank `<BLNK>`, eos token is `।` (danda); `punctuations` is `.?-!|, ` (period, question mark, hyphen, exclamation, ASCII pipe, comma, space). — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- The `characters` string was reported as Bangla script only: no Latin a-z and no ASCII digits 0-9. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- Single speaker: `num_speakers` 0, `use_speaker_embedding` false, `speakers_file` null, `use_language_embedding` false. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- Training setup visible in config: LJSpeech formatter, dataset path `/kaggle/input/datahrbn/MyTTSDataset/metadata.txt`, `run_name` `vits_4_nov`, 50 epochs, batch size 8. Test sentence: "ইয়াহুদ,নয়,ব্যয়,ইয়াহুদী,নেওয়া,উভয়ে,যায়,হয়েছিল,প্রয়োজন।". — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- Coqui's tokenizer discards out-of-vocabulary characters with the message "Character ... not found in the vocabulary. Discarding it." and records them in `not_found_characters`. — [tokenizer.py, TTS v0.22.0](https://raw.githubusercontent.com/coqui-ai/TTS/v0.22.0/TTS/tts/utils/text/tokenizer.py)
- Tokenizer order: text cleaner (skipped entirely when `text_cleaner` is None), phonemisation (only if `use_phonemes`), encode to IDs, intersperse blanks (if `add_blank`), BOS/EOS (if enabled). So for this model, raw text goes straight to character lookup with no normalisation. — [tokenizer.py, TTS v0.22.0](https://raw.githubusercontent.com/coqui-ai/TTS/v0.22.0/TTS/tts/utils/text/tokenizer.py)
- The model card: Apache-2.0, VITS, single speaker, Bangladeshi pronunciation; it gives no documentation on text normalisation, numbers, English words or punctuation, and rates this model "Good" against the author's Orpheus 3B variants ("Better"/"Best"). — [model card](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits)
- The author's GitHub README does not describe datasets, hours, speaker, data licence, inference parameters or preprocessing. — [GitHub repo](https://github.com/EMTIAZ-RUET/bangladeshi-bangla-tts-finetuning)
- The Space does no preprocessing beyond `.strip()`. — [Space app.py](https://huggingface.co/spaces/EMTIAZZ/bangla-vits-tts/raw/main/app.py)

### Inferences
- English words in Latin script ("AI", "RAG", "data") and ASCII digits ("2026", "30%") are dropped silently, producing a gap or a broken sentence. Pre-normalise: write numbers as Bangla words (২০২৬ → "দুই হাজার ছাব্বিশ", 30% → "ত্রিশ শতাংশ"), transliterate English terms into Bangla script the way they are spoken ("AI" → "এ আই", "data" → "ডেটা", "RAG" → "র‍্যাগ"), expand symbols (%, +, &, /, ৳) and abbreviations.
- Only `.?-!|, ` are known-safe punctuation. Replace or remove quotes, colons, semicolons, parentheses, em dashes and ellipses (use comma or period) so they are not discarded mid-phrase.
- Commas and periods are the only pause controls; use them deliberately to shape phrasing.
- Practical safety check when run locally: after each synthesis, read `synthesizer.tts_model.tokenizer.not_found_characters` (or watch the console for "Discarding it") and fail the build if it is non-empty.

### Gaps
- Exact vocabulary not verified. The fetched `characters` string was garbled; it appeared to include a few Bengali digits (৫ ৬ ৭) while the tool also answered "no Bengali digits", and it is unclear whether every conjunct/sign (e.g. ৎ, ড়, ঢ়, ZWNJ) is present. Read the raw `config.json` locally and build the allowed-character set from it.
- Danda "।" handling is unresolved: it is the configured EOS token while `enable_eos_bos_chars` is false, and the tool reported it absent from the `characters` string. Whether a typed "।" is encoded, dropped, or used as a sentence splitter must be tested locally. The pipe `|` in the punctuation list suggests the training transcripts may have used "|" in place of "।"; this is a guess. Test "।" vs "." vs "|" as sentence enders and keep the one that gives a natural stop.
- Training data source, hours, speaker identity and data licence are undocumented. The weights are tagged Apache-2.0, but the rights in the underlying voice recordings are not stated; this is a residual risk for published videos.

## 3. Running Coqui TTS locally on Windows, CPU only; Python versions

### Takeaway
Yes, CPU inference is supported (the Space itself runs `use_cuda=False`). Original `TTS` 0.22.0 needs Python 3.9 to 3.11 and is unmaintained; the maintained fork `coqui-tts` (idiap) supports Python 3.10 to 3.14 and is the lower-risk install on a current Windows machine.

### Cited Findings
- `TTS` 0.22.0 (released 2023-12-12): Requires-Python >=3.9.0, <3.12; classifiers 3.9/3.10/3.11; targets Ubuntu, Windows users are pointed to community guides; licence MPL-2.0. — [PyPI TTS](https://pypi.org/project/TTS/)
- `coqui-tts` 0.27.5 (released 2026-01-26): Requires-Python >=3.10, <3.15; described as a fork of the original unmaintained repository; tested on Ubuntu 24.04, "should also work on Mac and Windows". — [PyPI coqui-tts](https://pypi.org/project/coqui-tts/)
- "From coqui-tts 0.27.4, PyTorch is not included by default and you need to install it yourself" (torch, torchaudio, and torchcodec for PyTorch 2.9+). — [PyPI coqui-tts](https://pypi.org/project/coqui-tts/)
- The author's Space runs this exact model on CPU: `use_cuda=False`. — [Space app.py](https://huggingface.co/spaces/EMTIAZZ/bangla-vits-tts/raw/main/app.py)
- Model files to download: `pytorch_model.pth` and `config.json` from the repo (via `hf_hub_download`). — [Space app.py](https://huggingface.co/spaces/EMTIAZZ/bangla-vits-tts/raw/main/app.py)

### Inferences
- Realistic on this machine: VITS is small (the comparable MMS VITS is 36.3M parameters per its [card](https://huggingface.co/facebook/mms-tts-ben)) and a 30 s script should synthesise in seconds to tens of seconds on CPU.
- Suggested install: a dedicated venv with Python 3.11 or 3.12, CPU PyTorch wheel, then `pip install coqui-tts`; load with the same `Synthesizer(...)` call as the Space. Keep it out of the Node workspace.
- A 0.22-trained checkpoint should load in the fork since it is a continuation of the same codebase, but this was not tested.

### Gaps
- No Windows-specific confirmation for this checkpoint on `coqui-tts` 0.27.x was found; needs a local smoke test. Whether a C++ build toolchain is needed on Windows for either package was not verified.

## 4. The author's Orpheus 3B Bangla fine-tunes

### Takeaway
The Orpheus Bangla model is more expressive (LLM-based, 24 kHz, eight inline non-verbal tags such as `<laugh>` and `<sigh>`) and Apache-2.0, but it is a LoRA on a gated 3B Llama model that recommends a 16 GB+ GPU; it is not practical on a CPU-only Windows machine and would need a rented GPU or hosted endpoint.

### Cited Findings
- `EMTIAZZ/orpheus-3b-bangla-high-data-finetuning`: licence Apache-2.0; LoRA adapters on `canopylabs/orpheus-3b-0.1-pretrained`; about 99,000 Bangla samples from multiple speakers including the Adiba dataset; 30,000 steps on an H100. — [model card](https://huggingface.co/EMTIAZZ/orpheus-3b-bangla-high-data-finetuning)
- Supported tags: `<laugh>`, `<chuckle>`, `<sigh>`, `<cough>`, `<sniffle>`, `<groan>`, `<yawn>`, `<gasp>`. — [model card](https://huggingface.co/EMTIAZZ/orpheus-3b-bangla-high-data-finetuning)
- Output is 24 kHz audio generated as interleaved SNAC codec tokens; prompt uses the Llama chat template; loaded with PEFT `PeftModel.from_pretrained()` and needs a Hugging Face token for the gated base model. — [model card](https://huggingface.co/EMTIAZZ/orpheus-3b-bangla-high-data-finetuning)
- Hardware: GPU with 16 GB+ VRAM recommended; CPU inference "slow". Stated limitations: gated base, slow on CPU, occasional English phoneme mixing for loanwords. No GGUF/quantised version mentioned. — [model card](https://huggingface.co/EMTIAZZ/orpheus-3b-bangla-high-data-finetuning)
- Base family (`canopylabs/orpheus-3b-0.1-ft`): Apache-2.0, built on Llama-3.2-3B-Instruct, gated, emotion and intonation control via tags, about 200 ms streaming latency on GPU, hosted by inference providers (Baseten, fal). — [Orpheus base card](https://huggingface.co/canopylabs/orpheus-3b-0.1-ft)
- The author ranks quality: VITS "Good", Orpheus 3B variants "Better"/"Best". — [VITS model card](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits)

### Inferences
- The tags are non-verbal sounds, not style controls. They add human touches (a sigh, a chuckle) but do not set tone such as "excited" or "calm". Whether they still work after the Bangla fine-tune depends on whether the Bangla training data contained them; the card lists them but shows no evidence.
- CPU verdict: technically runnable but far slower than real time for a 3B autoregressive model emitting audio tokens; treat as "needs GPU or hosted". A rented GPU for a few minutes per video is the realistic route.
- Multi-speaker training data means voice consistency between takes may need a fixed speaker prompt or seed; the card lists no voice names.

### Gaps
- The small-data fine-tune (`EMTIAZZ/orpheus-3b-bangla-small-data-finetuning` or similar) was not opened; its exact repo name, data size and licence are unverified.
- No measured CPU speed, no GGUF build and no hosted endpoint for the Bangla adapter were found.
- Llama 3.2 base weights carry Meta's community licence in addition to the Apache-2.0 tag on the Orpheus repos; how that interacts with commercial use of generated audio was not researched.

## 5. Other Bangla TTS options (2026): licence, expressiveness, hardware, control

### Takeaway
For published videos on a CPU-only machine, the practical choices are (a) Azure's bn-BD neural voices (commercial, SSML prosody only, no emotion styles), (b) ai4bharat Indic Parler-TTS (Apache-2.0, Bengali with prompt-described style and 12 emotions, but 0.9B parameters so slow on CPU), or (c) a hosted expressive service such as ElevenLabs (Bengali support depends on the model; documentation conflicts). `facebook/mms-tts-ben` is ruled out for commercial videos by its CC-BY-NC licence.

### Cited Findings
Open models
- `facebook/mms-tts-ben`: licence CC-BY-NC 4.0 (non-commercial); VITS, 36.3M parameters, 16 kHz; runs through `transformers` 4.33+; non-deterministic without a fixed seed. — [model card](https://huggingface.co/facebook/mms-tts-ben)
- `ai4bharat/indic-parler-tts`: licence Apache-2.0; Bengali officially supported (one of 21 languages); Bengali speakers Arjun, Aditi, Tapan, Rashmi, Arnav, Riya (recommended: Arjun, Aditi); 0.9B parameters; gated (accept conditions on Hugging Face). — [model card](https://huggingface.co/ai4bharat/indic-parler-tts)
- Indic Parler-TTS is controlled by a free-text description prompt covering background noise, reverberation, expressivity, pitch, speaking rate and voice quality; Bengali is one of 10 languages with emotion support: Command, Anger, Narration, Conversation, Disgust, Fear, Happy, Neutral, Proper Noun, News, Sad, Surprise. GPU recommended, CPU possible but slower. — [model card](https://huggingface.co/ai4bharat/indic-parler-tts)
- `bangla-speech-processing/bangla_tts_female` (and `bangla_tts_male`): licence MIT; trained with the Coqui toolkit; 22050 Hz; single speaker; reported MOS 4.10; data curated from several sources including Mozilla Common Voice. The card's architecture text cites "ViT-TTS" (arXiv 2305.12708), while search results for the same organisation describe the models as VITS trained with coqui-ai. — [model card](https://huggingface.co/bangla-speech-processing/bangla_tts_female); [organisation page via search](https://huggingface.co/bangla-speech-processing)
- Piper: the `rhasspy/piper-voices` repo has a `bn/bn_BD` directory (commit "Add mike and google bn voice"). — [piper-voices bn](https://huggingface.co/rhasspy/piper-voices/tree/main/bn)
- OpenSLR 37 provides multi-speaker TTS data for Bangladesh Bengali (bn-BD) and Indian Bengali (bn-IN), the usual base for community Bangla voices. — [OpenSLR 37](https://www.openslr.org/37/)

Cloud services
- Azure Speech has two bn-BD voices, `bn-BD-NabanitaNeural` (female) and `bn-BD-PradeepNeural` (male), plus bn-IN `TanishaaNeural` and `BashkarNeural`. None has speaking styles, and no multilingual or Dragon HD voice lists Bengali. — [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- Azure SSML: `prosody` changes pitch, contour, range, rate and volume. `mstts:express-as` styles are voice-specific and the element is ignored when the style is missing or invalid. Word-level `emphasis` "is only available for these neural voices: en-US-GuyNeural, en-US-DavisNeural, and en-US-JaneNeural". — [Azure SSML voice docs](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)
- ElevenLabs: paid plans may use generated audio commercially ("With a paid subscription, you may use generated audio for commercial purposes..."); free plans have no commercial rights. Expressiveness comes from textual cues plus stability/similarity settings, and audio tags on the newer models. — [ElevenLabs TTS capabilities](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)
- ElevenLabs Bengali support is inconsistent between two official pages: the models overview was read as listing Bengali for Eleven v3 (70+ languages) and newer models but not for Multilingual v2 (29 languages) or Flash v2.5 (32); the TTS capabilities page did not list Bengali in any quoted language list, and its Multilingual v2 list (which includes Hindi and Tamil) has no Bengali. — [ElevenLabs models](https://elevenlabs.io/docs/overview/models); contradicted in part by [ElevenLabs TTS capabilities](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)

### Inferences
- Azure bn-BD is the only verified hosted Bangladeshi-accent option with a clear commercial path. Its expressiveness is limited to `prosody` (rate, pitch, contour, volume) and `break`; `express-as` and `emphasis` will not work for it. The workspace already uses `edge-tts`, which exposes these same two voices, but the project policy already records edge-tts as unlicensed for publishing, so published videos need Azure AI Speech itself.
- Indic Parler-TTS is the most controllable open option (describe the delivery in a sentence, pick a named speaker, choose an emotion). At 0.9B parameters it should run on CPU, but expect minutes per short script; offline batch per scene is feasible for a 30 s video. Its speaker names suggest Indian (West Bengal) accent, so Bangladeshi pronunciation is not guaranteed.
- Accent trade-off: the EMTIAZZ VITS, the bangla-speech-processing voices, Piper `bn_BD` and Azure bn-BD target Bangladesh; Indic Parler-TTS and Google's Bengali voices are India-oriented.
- Rough ranking for "expressive + Bangladeshi + commercially usable + CPU-only machine": hosted expressive service (if Bengali confirmed on the chosen model) or rented-GPU Orpheus Bangla for expressiveness; Azure bn-BD for reliability; tuned local VITS for zero cost.

### Gaps
- Google Cloud TTS: the voices page could not be fetched (domain blocked by the fetch tool). Bengali voice types (Standard/WaveNet/Chirp 3 HD), whether any bn-BD locale exists, and SSML support per voice type are unverified.
- ElevenLabs Bengali support per model needs a direct check in the product (voice library language filter) before committing; the two documentation pages disagree, and the model names reported (including "Eleven v4") came from a summarised read.
- Piper `bn_BD` voice names, quality levels, licences and training data were not read (only the directory was confirmed). Piper voice licences vary per voice; check each `MODEL_CARD`.
- The bangla-speech-processing architecture description is inconsistent (ViT-TTS vs VITS) and the accent of its training speaker is not clearly stated.
- Not researched: Azure pricing, Azure commercial terms wording, Gemini/OpenAI TTS Bengali support, XTTS-v2 (Coqui Public Model Licence, non-commercial, and Bengali is not in its language list as far as known, unverified), F5-TTS/other Bangla fine-tunes.
- No listening tests were done; all quality statements are from model cards.

## 6. Writing casual spoken Bangla so TTS sounds natural

### Takeaway
No authoritative source on scripting Bangla for TTS was found; the guidance below is derived from how this model tokenises text (Bangla characters and six punctuation marks only, no normaliser) and from the Orpheus card's note about loanwords. Treat it as working rules to validate by ear.

### Cited Findings
- The model sees raw characters with no cleaner or phonemiser, and anything outside its vocabulary is dropped. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json); [tokenizer.py, TTS v0.22.0](https://raw.githubusercontent.com/coqui-ai/TTS/v0.22.0/TTS/tts/utils/text/tokenizer.py)
- Safe punctuation for this model is `.?-!|, `. — [model config.json](https://huggingface.co/EMTIAZZ/bangladeshi-bangla-tts-vits/raw/main/config.json)
- Even the larger Bangla Orpheus model shows "occasional English phoneme mixing for loanwords". — [Orpheus Bangla card](https://huggingface.co/EMTIAZZ/orpheus-3b-bangla-high-data-finetuning)
- ElevenLabs-style models read emotional context from the text itself (wording, exclamation marks). — [ElevenLabs TTS capabilities](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)

### Inferences
- Write চলিত (colloquial standard), not সাধু: "করছি / করেছে / হবে", not "করিতেছি / করিয়াছে". Use everyday contractions and particles ("তো", "কিন্তু", "আসলে", "মানে", "তাই না?") sparingly to sound spoken.
- Short sentences, one idea each, 6 to 12 words. A character-level VITS loses intonation on long sentences; split with a period instead of chaining clauses.
- Put the comma where a speaker would breathe. It is the only pause control on the VITS model; avoid comma-heavy lists, which sound choppy.
- Bangla-English mixing: keep the English word (it is how people speak) but spell it in Bangla script as pronounced: "ডেটা", "মডেল", "সার্চ", "এ আই", "চ্যাটবট". Never leave Latin letters in the text for the VITS model. For acronyms spell letter names ("এল এল এম"). Keep a per-project pronunciation dictionary, like the `tts` field already used in `content.json`.
- Numbers, dates, currency, percentages and units always as Bangla words, in the spoken form ("তিন গুণ", "পঞ্চাশ শতাংশ", "দুই হাজার ছাব্বিশ সালে").
- Questions and exclamations: end with "?" or "!" to get rising or energetic contours where the model learned them; a rhetorical question as a hook ("জানেন কি?") gives more intonation variety than a statement.
- Avoid rare conjuncts and Sanskritised vocabulary where a common word exists; models trained on small data mispronounce rare clusters. If a word is mispronounced, respell it phonetically (e.g. add or remove hasanta, split the conjunct) in the `tts` text only, keeping the on-screen subtitle correct.
- Keep the spoken (`tts`) text separate from the displayed subtitle text, so normalised spellings never appear on screen.
- Workflow: render each line 3 to 5 times with different seeds and noise settings, pick the best take, and measure length the same way `npm run srt` does for English lines.

### Gaps
- No primary source (linguistic guideline or vendor document) on writing Bangla scripts for TTS was found within the search budget; everything in Inferences here is unsourced reasoning.
- No verified Bangla text-normalisation library was confirmed in this run (candidates remembered but not checked: `bnnumerizer`, `bangla` / `bnunicodenormalizer` on PyPI); their existence, licences and maintenance status need checking before use.
- Target speaking rate for Bangla narration (words per minute) was not researched; the English 135 to 155 wpm target in the project workflow should not be assumed to transfer.
