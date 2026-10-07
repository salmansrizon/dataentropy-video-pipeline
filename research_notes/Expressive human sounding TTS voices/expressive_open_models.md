# Expressive open TTS models for CPU-only Windows 11 narration (upgrade over Kokoro-82M), as of October 2026

Workload assumed throughout: 12 lines of about 10 words each per 60 s video, roughly 45-50 s of generated speech per video, batch/offline. "RTF" below means generation time divided by audio duration (RTF 5 = 5 s of compute per 1 s of audio). Some sources quote the inverse ("3x real-time" = RTF 0.33); each bullet says which.

Source-quality note: primary sources (GitHub READMEs, Hugging Face model cards, the Hugging Face Open TTS Leaderboard blog) were fetched and read through an automated summariser. Several CPU-speed figures only surfaced in search-result summaries of third-party blogs and are flagged "unverified" where the original page was not opened.

## 1. Concrete expression controls and syntax per model

### Takeaway
Three control styles exist: (a) inline nonverbal tags (Chatterbox Turbo/Nano, Orpheus, Dia, CosyVoice), (b) numeric knobs or emotion vectors (original Chatterbox `exaggeration`/`cfg_weight`, IndexTTS-2 `emo_vector`, Zonos), and (c) natural-language style instructions (Qwen3-TTS `instruct`, Parler-TTS description, VoxCPM2 parenthesised voice design, CosyVoice instruct). For calm-but-warm explainer narration, style instructions and the `exaggeration` knob are the relevant controls; laugh/sigh tags are mostly irrelevant to brand narration. Pocket TTS, Piper and Kokoro have no emotion control at all.

### Cited Findings

Chatterbox family (Resemble AI)
- Model zoo per the official README: Chatterbox-Turbo 350M English ("Paralinguistic Tags (`[laugh]`), Lower Compute and VRAM"); Chatterbox-Nano 110M English ("Same architecture as Turbo, Paralinguistic Tags, Runs on CPU (3x realtime on 8 cores)"); Multilingual V3 500M, 23+ languages; Original Chatterbox 500M English with "CFG & Exaggeration tuning" — [resemble-ai/chatterbox README](https://github.com/resemble-ai/chatterbox)
- Original Chatterbox `generate()` parameters: `text`, `audio_prompt_path` (reference clip), `cfg_weight` (default 0.5), `exaggeration` (default 0.5). Official tip: defaults "work well for most prompts"; for expressive speech "Try lower `cfg_weight` values (e.g. `~0.3`) and increase `exaggeration` to around `0.7` or higher." — [resemble-ai/chatterbox README](https://github.com/resemble-ai/chatterbox)
- Turbo tags are square-bracket tokens embedded in the text; the README lists `[cough]`, `[laugh]`, `[chuckle]` — [resemble-ai/chatterbox README](https://github.com/resemble-ai/chatterbox); [chatterbox-turbo model card](https://huggingface.co/ResembleAI/chatterbox-turbo)
- Turbo does NOT support `cfg_weight`, `exaggeration` or `min_p`. Maintainer explanation: CFG needs batch size 2 per generation so it was removed for speed ("literally 2x less compute"), and exaggeration was tested but lowered naturalness at the smaller size — [HF discussion #22, chatterbox-turbo](https://huggingface.co/ResembleAI/chatterbox-turbo/discussions/22)
- Nano tags per Resemble's product page: "[laugh], [sigh], [cough], [chuckle], [gasp], and more" — [Resemble AI: Chatterbox Nano](https://www.resemble.ai/learn/models/chatterbox-nano)

Orpheus TTS (Canopy Labs)
- Emotion tags are angle-bracket tokens: `<laugh>`, `<chuckle>`, `<sigh>`, `<cough>`, `<sniffle>`, `<groan>`, `<yawn>`, `<gasp>`. Eight English voices: tara, leah, jess, leo, dan, mia, zac, zoe; prompt format `{name}: text` (handled by the Python package). Only the 3B model is released; 1B/400M/150M are listed as planned — [canopyai/Orpheus-TTS README](https://github.com/canopyai/Orpheus-TTS)

Dia 1.6B (Nari Labs)
- Dialogue via `[S1]` / `[S2]` speaker tags; nonverbals in round brackets: `(laughs)`, `(coughs)`, `(sighs)`, `(gasps)`, `(clears throat)` and roughly 16 more. A successor, Dia2, is released — [nari-labs/dia README](https://github.com/nari-labs/dia)

Sesame CSM-1B
- No tag or instruction control. Input is text plus optional audio context; the model adjusts tone, pauses and inflection from prior-turn context — [openspeech.dev CSM-1B](https://www.openspeech.dev/models/sesame-csm-1b); [aiwiki: Sesame CSM](https://aiwiki.ai/wiki/sesame_csm)

Microsoft VibeVoice
- The README summary found no documented emotion/expression control. VibeVoice-Realtime-0.5B offers "11 distinct English style voices" — [microsoft/VibeVoice README](https://github.com/microsoft/VibeVoice)

Qwen3-TTS (Alibaba)
- Variants: 1.7B CustomVoice (instruction control), 1.7B VoiceDesign (instruction control), 1.7B Base, 0.6B CustomVoice (instruction control), 0.6B Base — [Qwen3-TTS-12Hz-1.7B-CustomVoice card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
- API: `model.generate_custom_voice(text=..., language=..., speaker=..., instruct=...)`; `model.generate_voice_design(text=..., language=..., instruct="natural language description")`; `model.generate_voice_clone(text=..., language=..., ref_audio=..., ref_text=...)` — [Qwen3-TTS-12Hz-1.7B-CustomVoice card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
- Nine preset speakers; the English-native ones are Ryan and Aiden (others: Vivian, Serena, Uncle_Fu, Dylan, Eric, Ono_Anna, Sohee) — [Qwen3-TTS-12Hz-1.7B-CustomVoice card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)

Parler-TTS
- Style is a free-text description passed alongside the text, e.g. "A female speaker delivers a slightly expressive and animated speech with a moderate speed and pitch. The recording is of very high quality, with the speaker's voice sounding clear and very close up." Mini v1 was trained with 34 named speakers (Jon, Lea, Gary, Jenna, Mike, Laura, ...) that can be named in the description — [parler-tts-mini-v1 card](https://huggingface.co/parler-tts/parler-tts-mini-v1)
- A separate checkpoint, parler-tts-mini-expresso, exists for emotion-style control — [parler-tts-mini-expresso card](https://huggingface.co/parler-tts/parler-tts-mini-expresso)

VoxCPM (OpenBMB)
- Versions: VoxCPM-0.5B (16 kHz, 2 languages), VoxCPM1.5 (0.6B, 44.1 kHz), VoxCPM2 (2B, 48 kHz, 30 languages). VoxCPM2 voice design is a natural-language description in parentheses at the start of the text; cloning accepts optional style instructions; `cfg_value` and `inference_timesteps` tune synthesis — [OpenBMB/VoxCPM README](https://github.com/OpenBMB/VoxCPM)

Zonos v0.1 (Zyphra)
- Conditioning controls for speaking rate, pitch variation, audio quality and emotions (happiness, anger, sadness, fear); audio-prefix support to elicit vocal qualities; 44 kHz output — [Zyphra/Zonos README](https://github.com/Zyphra/Zonos)

F5-TTS
- A zero-shot cloning model; expression follows the reference clip rather than an explicit control (the search results only surfaced research add-ons such as activation-steering for emotion) — [SWivid/F5-TTS](https://github.com/swivid/f5-tts); [EmoSteer-TTS paper](https://arxiv.org/pdf/2508.03543)

IndexTTS-2 / 2.5 (bilibili)
- Controls: `emo_audio_prompt` (separate emotional reference audio), `emo_alpha` (intensity 0.0-1.0, default 1.0), `emo_vector` (8 floats ordered `[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`), `use_emo_text=True` (derive emotion from the script), `emo_text` (separate emotion description). The repo now ships IndexTTS-2.5 (0.8B) — [index-tts/index-tts README](https://github.com/index-tts/index-tts)

CosyVoice 2 / Fun-CosyVoice3 (Alibaba FunAudioLLM)
- Instruction control for language, dialect, emotion, speed and volume, plus fine-grained inline tags such as `[laughter]` — [FunAudioLLM/CosyVoice README](https://github.com/FunAudioLLM/CosyVoice)

Kyutai Pocket TTS
- No emotion or expression control documented. Voices are presets (alba, giovanni, lola, ...) or a wav for cloning via `--voice` — [kyutai-labs/pocket-tts README](https://github.com/kyutai-labs/pocket-tts)

Piper
- No expression control surfaced on the repository page — [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)

### Inferences
- For a brand narrator (no laughing or sighing), the useful controls are: Chatterbox original `exaggeration` 0.5-0.7 with `cfg_weight` ~0.3-0.5; Qwen3-TTS `instruct` (e.g. "warm, confident, measured explainer tone"); IndexTTS-2 `emo_vector` weighted toward calm/happy; Parler description. Tag-based models (Turbo, Nano, Orpheus, Dia) add realism mainly through nonverbals that a brand explainer will rarely use, so their benefit there is baseline prosody, not controllability.
- Chatterbox Turbo/Nano trade the `exaggeration` knob for speed; only the 500M original keeps it.
- Dia and CSM are dialogue-first models; a single-narrator explainer is outside their sweet spot.

### Gaps
- Exact instruct-mode method names and example instruct strings for CosyVoice 2/3 (`inference_instruct2`, etc.) were not confirmed; the fetched README summary only described the feature.
- Full Chatterbox Turbo tag list beyond `[cough]`, `[laugh]`, `[chuckle]` not confirmed from a primary source (Nano page says "and more").
- Zonos emotion-vector order/parameter names and VoxCPM2's exact Python call signature were not captured.
- VibeVoice-1.5B expression behaviour (it reportedly infers emotion from text) could not be sourced from the current README because the TTS code was removed.
- Kyutai TTS 1.6B (the larger non-Pocket model) was not researched in detail; only Pocket TTS was verified.

## 2. CPU feasibility, speed and small/quantised variants

### Takeaway
Clearly CPU-feasible with official support: Chatterbox Nano (3x faster than real time on 8 cores, official claim), Pocket TTS (about 6x real time on 2 cores, official claim, but no emotion control) and Piper. Feasible-but-slow for this batch size: Chatterbox original/Turbo on CPU (officially supports CPU; ONNX and Q4 builds exist), Qwen3-TTS (reported RTF about 3-6 on CPU, i.e. a few minutes per video), Orpheus via GGUF/llama.cpp. Poor CPU fits: Dia (no CPU support yet), Zonos, F5-TTS, IndexTTS-2 (reported 3-4 minutes per 10 s of audio), VoxCPM2 2B and CosyVoice without a community port.

### Cited Findings
- Chatterbox: "Supports CUDA, CPU, and MPS"; Nano runs "3x faster than realtime on 8 CPU cores"; install `pip install chatterbox-tts`, developed/tested on Python 3.11 — [resemble-ai/chatterbox README](https://github.com/resemble-ai/chatterbox)
- Chatterbox Nano: 110M parameters, "10x real-time on GPU" and "3x real-time on CPU (8 threads)" — [Resemble AI: Chatterbox Nano](https://www.resemble.ai/learn/models/chatterbox-nano)
- ONNX builds exist: official [ResembleAI/chatterbox-turbo-ONNX](https://huggingface.co/ResembleAI/chatterbox-turbo-ONNX), community [onnx-community/chatterbox-multilingual-ONNX](https://huggingface.co/onnx-community/chatterbox-multilingual-ONNX) and [owensong/chatterbox-nano-ONNX](https://huggingface.co/owensong/chatterbox-nano-ONNX)
- A portable Windows GUI runs Chatterbox with Full or Q4-quantised ONNX models; its author says the Q4 model runs "in reasonable speed if you have a strong CPU" (no RTF given) — [Chatterbox TTS Desktop (itch.io)](https://ampedhorizon.itch.io/chatterbox-tts-desktop)
- A self-hosted server project advertises CUDA, ROCm and CPU execution for Chatterbox — [devnen/Chatterbox-TTS-Server](https://github.com/devnen/Chatterbox-TTS-Server)
- Pocket TTS: 100M parameters, "designed to run on CPU", about 200 ms to first chunk, "~6x real-time on a CPU of MacBook Air M4" using only 2 cores; Windows supported; install `pip install pocket-tts` or `uv add pocket-tts` — [kyutai-labs/pocket-tts README](https://github.com/kyutai-labs/pocket-tts)
- Qwen3-TTS on CPU (unverified, from search summaries of community ports): 1.7B CustomVoice at F32 about RTF 5.39 on short text and 6.48 on longer text, about 9.1 GB memory; a high-end CPU gives RTF 3-5 — likely sources [gabriele-mastrapasqua/qwen3-tts (pure C, no PyTorch)](https://github.com/gabriele-mastrapasqua/qwen3-tts) and [dev.to Qwen3-TTS guide](https://dev.to/czmilo/qwen3-tts-the-complete-2026-guide-to-open-source-voice-cloning-and-ai-speech-generation-1in6)
- Other Qwen3-TTS non-PyTorch ports: [TrevorS/qwen3-tts-rs (Rust)](https://github.com/TrevorS/qwen3-tts-rs); a CPU demo Space exists at [broadfield-dev/qweb3-tts-cpu](https://huggingface.co/spaces/broadfield-dev/qweb3-tts-cpu/blob/main/app-stream.py). The official card states no minimum hardware and discusses GPU/FlashAttention only — [Qwen3-TTS card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
- Orpheus: the official repo points to a no-GPU path ("For No GPU inference using Llama cpp see implementation documentation", `additional_inference_options/no_gpu/`) — [canopyai/Orpheus-TTS README](https://github.com/canopyai/Orpheus-TTS); GGUF quantisations are published, e.g. [unsloth/orpheus-3b-0.1-ft-GGUF](https://huggingface.co/unsloth/orpheus-3b-0.1-ft-GGUF) and [QuantFactory/orpheus-3b-0.1-ft-GGUF](https://huggingface.co/QuantFactory/orpheus-3b-0.1-ft-GGUF); Q8_0 weights are about 4 GB — [localaimaster Orpheus guide](https://localaimaster.com/blog/orpheus-tts-setup-guide)
- Dia: GPU required (PyTorch 2.0+, CUDA 12.6); about 2.1x real time on an RTX 4090; 4.4-7.9 GB VRAM; CPU support "to be added soon"; quantised versions planned — [nari-labs/dia README](https://github.com/nari-labs/dia)
- CSM-1B: community Gradio build supports CUDA, MLX and CPU devices — [isa/sesame-csm](https://github.com/isa/sesame-csm)
- IndexTTS-2: README lists NVIDIA CUDA 12.8+, tested on RTX 4090, RTF about 0.20-0.29 on a 4090 with BF16; CPU not stated as supported — [index-tts/index-tts README](https://github.com/index-tts/index-tts). A third-party site reports CPU inference at about 3-4 minutes per 10 s of audio on an 8-core desktop (unverified aggregator) — [index-tts2.org](https://index-tts2.org/)
- VoxCPM: RTF about 0.30 (VoxCPM2) and about 0.15 (VoxCPM1.5) on an RTX 4090; community ports include llama.cpp-omni (CPU/Metal/CUDA/Vulkan), ONNX export and Rust — [OpenBMB/VoxCPM README](https://github.com/OpenBMB/VoxCPM)
- Zonos v0.1: Linux or macOS listed, GPU with 6 GB+ VRAM, "CPU operation possible but significantly slower", depends on eSpeak-ng, about 2x real time on an RTX 4090 — [Zyphra/Zonos README](https://github.com/Zyphra/Zonos)
- F5-TTS and Zonos v0.1 are described as "not CPU viable" in a 2026 comparison (third-party) — [builderai.tools open-weight TTS comparison](https://builderai.tools/blog/open-weight-text-to-speech-models-2026)
- VibeVoice: only the ASR-BitNet model is documented as CPU real-time; no CPU figures for the TTS models — [microsoft/VibeVoice README](https://github.com/microsoft/VibeVoice)
- Parler-TTS supports GPU and CPU devices via Transformers; no CPU benchmark found — [parler-tts-mini-v1 card](https://huggingface.co/parler-tts/parler-tts-mini-v1)
- CosyVoice: README emphasises NVIDIA GPU, Docker and vLLM; CPU support is not explicitly stated — [FunAudioLLM/CosyVoice README](https://github.com/FunAudioLLM/CosyVoice)
- Piper installs with `pip install piper-tts` — [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)

### Inferences
Estimated time for one video (about 48 s of speech), derived from the figures above; these are estimates, not measurements on the target PC:

| Model | Params | CPU status | Est. time per video | Install on Windows |
|---|---|---|---|---|
| Chatterbox Nano | 110M | Official, 3x real time on 8 cores | under 1 min | Easy (`pip install chatterbox-tts`, Python 3.11) |
| Chatterbox Turbo | 350M | CPU supported, official ONNX | likely 1-5 min (no figure found) | Easy |
| Chatterbox original | 500M | CPU supported, Q4 ONNX community | likely several min (no figure found; CFG doubles compute) | Easy |
| Pocket TTS | 100M | Official, ~6x real time on 2 cores (M4) | under 1 min | Easy (`uv add pocket-tts`) |
| Qwen3-TTS 0.6B/1.7B | 0.6B/1.7B | Community reports RTF ~3-6.5 | ~2.5-5.5 min (1.7B), ~9 GB RAM | Medium (PyTorch) or C/Rust port |
| Orpheus 3B GGUF | 3B | Official llama.cpp path | unknown; a 3B LLM emitting audio tokens on CPU is plausibly many minutes | Medium-hard (llama.cpp + SNAC decoder) |
| Parler-TTS mini | ~880M (not verified) | Runs on CPU | unknown | Medium |
| CSM-1B | 1B | Community CPU build | unknown | Medium (gated Llama dependency, unverified) |
| IndexTTS-2/2.5 | 0.8B (2.5) | Unofficial; ~18-24x slower than real time reported | ~15-20 min | Hard, and licence blocks it |
| VoxCPM2 | 2B | Community ports only | unknown | Medium-hard |
| Zonos v0.1 | n/a | "significantly slower"; Windows not listed | impractical | Hard (eSpeak, no Windows) |
| Dia 1.6B | 1.6B | No CPU support | not feasible | n/a |
| F5-TTS | n/a | Reported not CPU viable | impractical | n/a (licence also blocks) |
| CosyVoice 2/3 | 0.5B | Not stated | unknown | Hard (conda, heavy deps; unverified) |
| Piper | small | Built for CPU | seconds | Easy |

- Every model marked "under 1 min" or "minutes" meets the "minutes not hours" bar. Even IndexTTS-2 at an estimated 15-20 minutes technically does, but it fails on licence.
- The search-summary claim that Orpheus "streams at about 200 ms latency" on CPU via llama.cpp looks like a conflation with the GPU streaming figure in the official README and should not be relied on.

### Gaps
- No measured CPU RTF found for Chatterbox Turbo or original Chatterbox (only "runs on CPU" and "reasonable speed on a strong CPU").
- No CPU RTF found for Orpheus GGUF, CSM-1B, Parler-TTS, VoxCPM (ports), CosyVoice or Kyutai TTS 1.6B.
- Qwen3-TTS and IndexTTS-2 CPU numbers come from search-result summaries, not from pages opened and checked; the 0.6B Qwen3 model's CPU speed was not found at all.
- No report specific to Windows 11 CPU-only installs (e.g. PyTorch CPU wheels with chatterbox-tts pinned dependencies) was verified.
- Parameter counts for Parler-TTS mini, Zonos and F5-TTS were not captured.

## 3. Licences, commercial use, cloning consent and watermarking

### Takeaway
Safe for published brand videos on licence grounds: Chatterbox family (MIT), Pocket TTS (MIT), Qwen3-TTS (Apache-2.0), Orpheus (Apache-2.0), Dia (Apache-2.0), CSM-1B (Apache-2.0), Parler-TTS (Apache-2.0), VoxCPM (Apache-2.0), Zonos (Apache-2.0), CosyVoice code (Apache-2.0). Not safe or doubtful: F5-TTS pretrained weights (CC-BY-NC), IndexTTS-2 (bilibili Model Use License, commercial use requires contacting bilibili), VibeVoice (MIT but explicitly "research and development purposes only", TTS code removed), Piper's current repo (GPL-3.0, per-voice licences vary). Chatterbox embeds an inaudible PerTh watermark in every output.

### Cited Findings
- Chatterbox (all variants): MIT. "Every audio file generated by Chatterbox includes Resemble AI's Perth (Perceptual Threshold) Watermarker - imperceptible neural watermarks that survive MP3 compression." — [resemble-ai/chatterbox README](https://github.com/resemble-ai/chatterbox); Nano is MIT with the same PerTh watermark — [Resemble AI: Chatterbox Nano](https://www.resemble.ai/learn/models/chatterbox-nano)
- Pocket TTS: MIT; prohibited-use section forbids "voice impersonation or cloning without explicit and lawful consent" — [kyutai-labs/pocket-tts README](https://github.com/kyutai-labs/pocket-tts)
- Qwen3-TTS: Apache-2.0 — [Qwen3-TTS card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
- Orpheus: Apache-2.0; watermarking is optional ("Use Silent Cipher to watermark your audio generation") — [canopyai/Orpheus-TTS README](https://github.com/canopyai/Orpheus-TTS)
- Dia: Apache-2.0 — [nari-labs/dia README](https://github.com/nari-labs/dia)
- CSM-1B: Apache-2.0 (released 13 March 2025) — [aiwiki: Sesame CSM](https://aiwiki.ai/wiki/sesame_csm)
- Parler-TTS: Apache-2.0 — [parler-tts-mini-v1 card](https://huggingface.co/parler-tts/parler-tts-mini-v1)
- VoxCPM: Apache-2.0, "fully open-source & commercial-ready"; cloning for impersonation or fraud "strictly forbidden"; no built-in watermark, users should "clearly mark any AI-generated content" — [OpenBMB/VoxCPM README](https://github.com/OpenBMB/VoxCPM)
- Zonos v0.1: Apache-2.0 — [Zyphra/Zonos README](https://github.com/Zyphra/Zonos)
- CosyVoice: repository is Apache-2.0 — [FunAudioLLM/CosyVoice README](https://github.com/FunAudioLLM/CosyVoice)
- F5-TTS: code MIT, but "The pre-trained models are licensed under the CC-BY-NC license due to the training data Emilia" — [SWivid/F5-TTS](https://github.com/swivid/f5-tts); see also [Commercial Use discussion #1295](https://github.com/SWivid/F5-TTS/discussions/1295)
- IndexTTS-2: the official repo states the bilibili Model Use License Agreement and that commercial use requires contacting indexspeech@bilibili.com — [index-tts/index-tts README](https://github.com/index-tts/index-tts); contradicted by third-party sites describing it as Apache-2.0 and free for commercial use below 100M MAU / 1B yuan revenue — [SiliconFlow IndexTTS-2](https://www.siliconflow.com/models/indextts-2), [index-tts2.org](https://index-tts2.org/)
- VibeVoice: MIT licence, but "we have removed the VibeVoice-TTS code from this repository" after misuse; VibeVoice-1.5B TTS is listed as "Disabled"; "We do not recommend using VibeVoice in commercial or real-world applications without further testing and development. This model is intended for research and development purposes only." — [microsoft/VibeVoice README](https://github.com/microsoft/VibeVoice)
- Piper: the maintained repo (piper1-gpl) is GPL-3.0; voice licences are documented per voice in VOICES.md — [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)
- XTTS-v2 / Coqui licensing is covered by a dedicated third-party explainer (not opened) — [localaimaster: XTTS v2 commercial licence](https://localaimaster.com/blog/xtts-coqui-commercial-license)

### Inferences
- For IndexTTS-2, the primary source (official README) should override aggregators: treat it as not cleared for commercial brand videos without written permission.
- GPL-3.0 on Piper's code does not by itself restrict the audio output, but individual voice models can carry non-commercial dataset terms, so each voice needs checking.
- The PerTh watermark in Chatterbox is inaudible and is not a usage restriction; it only makes output detectable as Chatterbox-generated.
- Voice cloning with any of these models needs a reference recording the brand has rights to (own recording or a consenting voice talent); preset voices (Qwen3 Ryan/Aiden, Orpheus tara/leo/etc., Pocket TTS alba/etc.) avoid that issue.

### Gaps
- Licence of the CosyVoice2-0.5B and Fun-CosyVoice3-0.5B weights (as opposed to the code) was not confirmed.
- The XTTS-v2 Coqui Public Model License text was not opened; its non-commercial status is stated in the task brief and widely reported but not verified here.
- Whether the Hugging Face VibeVoice-1.5B weights carry an audible disclaimer/watermark was not confirmed from the current README.
- Whether the Pocket TTS voice-cloning weights are gated behind a Hugging Face terms acceptance was not confirmed.
- Licences of Kyutai TTS 1.6B, Dia2 and the Parler expresso checkpoint were not checked.

## 4. Most human-sounding according to public evaluations (2025-2026)

### Takeaway
I could not retrieve the live TTS Arena V2 leaderboard, so no verified Elo ranking of these specific models is available in these notes. The one verified primary source, Hugging Face's Open TTS Leaderboard (30 September 2026), measures intelligibility, speed and speaker similarity rather than human-likeness, and puts Kokoro-82M among the English WER leaders, which means Kokoro is not weak on clarity; the upgrade case is expressiveness, not intelligibility.

### Cited Findings
- The Open TTS Leaderboard (published 30 September 2026) uses three objective metrics: WER/CER via Qwen3 ASR, speed as inverse RTF for batched offline inference on an H200 GPU, and speaker similarity via WavLM embeddings. It is not a listener-preference test — [HF blog: Open TTS Leaderboard](https://huggingface.co/blog/open-tts-leaderboard)
- "hexgrad/Kokoro-82M, Supertone/supertonic-3, and fishaudio/s2-pro lead the pack on English WER"; the blog also discusses Pocket TTS (strong for streaming on GPU/CPU), VoxCPM2 and Fun-CosyVoice3-0.5B-2512 — [HF blog: Open TTS Leaderboard](https://huggingface.co/blog/open-tts-leaderboard)
- Arena-style leaderboards (TTS Arena V2, Artificial Analysis Speech Arena, Voice Arena) rank by Elo from pairwise listener votes — [HF blog: Open TTS Leaderboard](https://huggingface.co/blog/open-tts-leaderboard)
- A search summary of the Artificial Analysis Speech Arena lists the top open-weights models as Breeze TTS 2 (Elo 1216), Fish Audio S2 Pro (1117), Step Audio EditX (1095), Voxtral TTS (1083) (unverified; page not opened, and none of these are in the assigned model list) — [Artificial Analysis TTS leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice)
- One 2026 blog removed its own numeric ranking table because it "combined approximate scores from incompatible sources" and has no reproducible export, which is a caution against blog-level Elo tables — [offlinetts.com ranking article](https://offlinetts.com/blog/tts-model-ranking-2026/)
- The TTS Arena V2 Space page returned only header content to the fetch tool, with no leaderboard data — [TTS Arena V2](https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2)

### Inferences
- Because no verified listener-preference ranking covers the candidate models, the choice between Chatterbox, Qwen3-TTS and Orpheus on "human-sounding" should be made by auditioning the actual 12-line script, not from a leaderboard.
- Low WER (Kokoro's strength) and perceived expressiveness are different axes; models with richer prosody (LLM-based ones) typically show more mispronunciation and hallucination risk, so each generated line needs a listen-through.

### Gaps
- Current TTS Arena V2 Elo scores for Chatterbox, Orpheus, Dia, CSM, Qwen3-TTS, VoxCPM, Zonos, IndexTTS-2, CosyVoice and Kokoro: not retrieved (JS-rendered Space).
- Artificial Analysis open-weights ranking was seen only in a search summary; the names and Elo values above are unverified. Other blog claims seen in search summaries (e.g. "Zonos2 8B 1320+", "CosyVoice 3 1280+") are from low-trust aggregators and were deliberately not used.
- Resemble's own claim of Chatterbox being preferred over ElevenLabs in blind tests was not located in the pages fetched.

## 5. Voice consistency across separately generated lines

### Takeaway
Consistency is a real issue for the LLM-style models when no voice is pinned, but every viable candidate has a pinning mechanism: a reference clip (Chatterbox, Pocket TTS, Qwen3 Base clone, VoxCPM, Zonos, IndexTTS-2, CSM context), a named preset speaker (Qwen3 CustomVoice Ryan/Aiden, Orpheus tara/leo/..., Pocket TTS alba/...), or a seed (Dia). Description-only models (Parler-TTS, Qwen3 VoiceDesign, VoxCPM2 voice design) can drift between calls.

### Cited Findings
- Chatterbox: voice is set per call by `audio_prompt_path`, a roughly 10 s reference clip — [chatterbox-turbo model card](https://huggingface.co/ResembleAI/chatterbox-turbo); Nano clones zero-shot from "10 seconds or more of reference audio" — [Resemble AI: Chatterbox Nano](https://www.resemble.ai/learn/models/chatterbox-nano)
- Dia: to keep speaker identity, provide an audio prompt (5-10 s optimal) or fix the random seed across generations — [nari-labs/dia README](https://github.com/nari-labs/dia)
- CSM-1B: "Coherent voice identity requires audio context: a short snippet of the desired speaker, included as part of the prompt, biases generation toward that timbre and accent" — [openspeech.dev CSM-1B](https://www.openspeech.dev/models/sesame-csm-1b)
- Parler-TTS: 34 named speakers act as anchors, but a third-party summary notes names "are not guaranteed to produce identical output on regeneration" and description-only prompts generate novel voices — [parler-tts-mini-v1 card](https://huggingface.co/parler-tts/parler-tts-mini-v1); [aimodels.fyi summary](https://www.aimodels.fyi/models/huggingFace/parler-tts-mini-v1-parler-tts)
- Qwen3-TTS: CustomVoice takes a fixed `speaker` name plus optional `instruct`; Base takes `ref_audio` + `ref_text`; VoiceDesign takes only a description — [Qwen3-TTS card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
- Orpheus: eight fixed named voices selected by the `{name}:` prefix — [canopyai/Orpheus-TTS README](https://github.com/canopyai/Orpheus-TTS)
- Pocket TTS: preset voice names or a wav file via `--voice` — [kyutai-labs/pocket-tts README](https://github.com/kyutai-labs/pocket-tts)
- Zonos: cloning from a 10-30 s speaker sample — [Zyphra/Zonos README](https://github.com/Zyphra/Zonos)
- IndexTTS-2: speaker reference audio is separate from the emotion reference (`emo_audio_prompt`), so timbre and emotion are pinned independently — [index-tts/index-tts README](https://github.com/index-tts/index-tts)

### Inferences
- For 12 separately generated lines, pick a model with a named preset or reference clip and reuse it unchanged on every call; this fixes timbre. Prosody and energy can still vary line to line with sampling, so a fixed seed plus a regenerate-and-listen pass per line is the practical workflow.
- A clean two-step option that stays licence-safe: design or pick one voice once (e.g. Qwen3 VoiceDesign output, or a Kokoro/own recording), save a 10 s clip, then use it as the reference for all later videos, giving cross-video brand consistency.
- Raising Chatterbox `exaggeration` increases line-to-line variation, so a moderate value (about 0.5-0.6) is the safer starting point for a consistent narrator.

### Gaps
- No source quantified how much timbre or prosody drift occurs across separate calls for any of these models.
- Whether seed-fixing alone gives reproducible output on CPU for Chatterbox, Qwen3-TTS or Orpheus was not verified.
- Whether using another TTS model's output (e.g. a Kokoro voice) as a cloning reference is permitted by that model's terms was not checked.
