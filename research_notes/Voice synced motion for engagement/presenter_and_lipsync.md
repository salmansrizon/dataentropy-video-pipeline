# On-screen presenter and lip-sync for narrated 60 s 9:16 explainers (CPU-only Windows, commercial licences)

Research date: 2026-10-07. Sourcing note: several items below come from search-result summaries of paywalled papers or from secondary blogs rather than the primary page; each is marked "(secondary)" or "(search summary)". Anything I could not source is in Gaps, not in Cited Findings.

## 1. Learning-science evidence: embodiment, image, voice and personalisation principles; pedagogical agents; instructor presence

### Takeaway
Simply putting a speaker's image on screen does not reliably improve learning (image principle, d about 0.07), and a visible speaker pulls gaze away from the content; benefits appear only when the agent does something useful (gestures, pointing, gaze toward the material) and they are small to medium (g about 0.2 to 0.35). Simple 2D agents outperform realistic 3D ones (g+ 0.38 vs 0.11), and the largest social-cue effects come from conversational wording and a human-sounding voice, neither of which needs a visible presenter.

### Cited Findings
- Image principle: "People do not necessarily learn better when the speaker's image is added to the screen", d = 0.07 from 11 comparisons, i.e. no significant effect (search summary of the meta-analysis of Mayer's research) — [ScienceDirect, meta-analysis of Mayer's multimedia learning research](https://www.sciencedirect.com/science/article/pii/S1747938X25000673)
- The same meta-analysis reports an overall effect across Mayer's principles of g = 0.37 (multilevel regression), declining slightly per year, with a medium significant effect for the embodiment principle: g = 0.35 for a human-like animated pedagogical agent (search summary) — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1747938X25000673)
- Gesturing on-screen instructors (three-level meta-analyses): retention g = 0.28, 95% CI [0.19, 0.37]; transfer g = 0.31, 95% CI [0.21, 0.41] — [Educational Psychology Review, "Role of Gesturing Onscreen Instructors in Video Lectures"](https://link.springer.com/article/10.1007/s10648-024-09910-0)
- Pedagogical agents meta-analysis (Castro-Alonso, Wong, Adesope, Paas 2021): 32 effect sizes, 2,104 participants, overall g+ = 0.20 in favour of having an agent; 2D agents g+ = 0.38 vs 3D agents g+ = 0.11; most other agent characteristics (nonverbal communication, motion, voice) did not significantly moderate effectiveness — [ERIC EJ1310158](https://eric.ed.gov/?id=EJ1310158); [Springer](https://link.springer.com/article/10.1007/s10648-020-09587-1)
- The authors frame the 2D > 3D result as consistent with the redundancy effect (cognitive load theory) and the coherence principle (cognitive theory of multimedia learning) — [ERIC EJ1310158](https://eric.ed.gov/?id=EJ1310158)
- Instructor presence in instructional video (series of meta-analyses, 35 studies, 46 pairwise comparisons, 6,339 participants): small significant positive effect on retention, no significant effect on transfer; social presence and affective/motivational ratings improved; instructor presence reduced dwell time on relevant visual information; perceived cognitive load went down, not up — [ScienceDirect, "The instructor presence effect and its moderators"](https://www.sciencedirect.com/science/article/pii/S1747938X2300057X)
- Moderators in that work (marginally) favoured videos showing only the instructor's hand, and lab settings; size of the instructor, prior knowledge and domain were also significant moderators (search summary) — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1747938X2300057X)
- Eye-tracking: learners spent about 41% of time on the instructor's face and switched between face and slide about every 3.7 s; another study found over 30% of time on the face when the instructor looked at the camera; individual range 9% to 60% (search summary of several studies) — [Kizilcec et al., "The Instructor's Face in Video Instruction"](https://vhil.stanford.edu/sites/g/files/sbiybj29011/files/media/file/kizilcec-jep-instructors-face.pdf); [PMC9313280](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9313280/); [PMC10963011](https://pmc.ncbi.nlm.nih.gov/articles/PMC10963011/)
- Teaching style interacts with presence: under autonomy-supportive teaching, instructor presence decreased retention and concentration; under controlling teaching it damaged concentration and raised extraneous load; under neutral teaching it promoted retention (search summary) — [ScienceDirect, Learning and Instruction 2025](https://www.sciencedirect.com/science/article/abs/pii/S0959475225002233)
- Personalisation principle (conversational rather than formal wording): median d = 0.79 with 14 of 17 tests supporting it in one account, d = 1.11 in an earlier one (search summary; the two figures come from different editions/analyses) — [Cambridge Handbook ch. 14](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-based-on-social-cues-in-multimedia-learning-personalization-voice-image-and-embodiment-principles/3841340D8AD820C26DBCD39AE664BCEC); [Mayer, Multimedia Learning ch. 13](https://www.cambridge.org/core/books/abs/multimedia-learning/personalization-voice-and-image-principles/97F9B31362E6491806A4718FECCADE3D)
- Voice principle (human voice rather than machine voice): median d = 0.74 with 5 of 6 comparisons supporting, or d = 0.78 with 3 of 3 in the earlier account (search summary) — [Cambridge Handbook ch. 14](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-based-on-social-cues-in-multimedia-learning-personalization-voice-image-and-embodiment-principles/3841340D8AD820C26DBCD39AE664BCEC)
- Stated boundary conditions: personalisation may not apply to high-achieving students or long lessons; the voice principle may not apply when there are negative social cues such as low embodiment (search summary) — [Mayer, Multimedia Learning ch. 13](https://www.cambridge.org/core/books/abs/multimedia-learning/personalization-voice-and-image-principles/97F9B31362E6491806A4718FECCADE3D)
- The voice effect has been re-examined for modern TTS; published work questions whether it still holds for current engines — [Text-to-Speech Software and Learning: Investigating the Relevancy of the Voice Effect](https://www.researchgate.net/publication/327795958_Text-to-Speech_Software_and_Learning_Investigating_the_Relevancy_of_the_Voice_Effect); [The voice effect in multimedia instruction (ERIC EJ1341358)](https://files.eric.ed.gov/fulltext/EJ1341358.pdf)

### Inferences
- For a motion-graphics explainer whose main visual is already carrying the explanation, a static or merely lip-moving presenter is the configuration the evidence supports least: the image principle is null, and eye-tracking says 30 to 40% of gaze would move to the face.
- If a presenter is added, the evidence-backed design is 2D, simple, and functional: it should point, look toward or gesture at the element being explained. Lip-sync on its own is not what the embodiment literature measures.
- The cheapest evidence-backed moves toward "a real human is speaking" are in the audio and script: conversational second-person wording (d about 0.8) and a more human-sounding voice (d about 0.7, though possibly weaker with modern TTS). These effect sizes are larger than any presenter effect found.
- Presence does raise social presence and motivation ratings even where learning does not change, so a presenter is defensible as an engagement/brand choice, not as a learning-gain choice.

### Gaps
- I could not open the full text of the Mayer meta-analysis (NSF PAR link returned 404) or the Castro-Alonso paper (Springer redirect to login), so per-principle k and CI for personalisation and voice in the 2025 meta-analysis, and the exact human-vs-nonhuman and uncanny-valley moderator results, are not confirmed. Figures above for personalisation/voice come from search summaries of the Cambridge chapters and should be checked against the book.
- All of this evidence is on lessons of minutes to tens of minutes with learning tests. I found no study on 30 to 60 s vertical social explainers, or on watch-through/retention metrics for such videos with vs without a presenter.

## 2. Minimal "speaker presence" without a face (waveform, pulsing voice indicator, abstract shape)

### Takeaway
Direct evidence is thin: one finding says giving a voice any visual body raises perceived friendliness and social presence, and a waveform embodiment did not reduce cognitive engagement relative to an avatar, but I found no study showing that an audio-reactive element makes a synthetic voice in a pre-rendered video feel more human. This is practice-driven, not evidence-driven.

### Cited Findings
- "Giving a voice a visual body increased perceptions of its friendliness and social presence"; a waveform embodiment of the voice produced fewer facial expressions in participants but no difference in cognitive engagement compared with avatar and text versions (search summary of the survey) — [Voice in Human-Agent Interaction: A Survey (ACM)](https://dl.acm.org/doi/fullHtml/10.1145/3386867)
- TTS voices diminish social presence in VR but have minimal impact in less immersive 2D settings (search summary) — [Synthetically Expressive (arXiv 2506.23777)](https://arxiv.org/pdf/2506.23777)
- Human voices were rated more attractive and socially appealing than synthetic ones, with large individual differences — [Attractive synthetic voices (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2949882125000957)
- Instructor-presence moderators favoured showing only the instructor's hand over the full instructor (i.e. a minimal, task-relevant embodiment) — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1747938X2300057X)

### Inferences
- A small audio-reactive mark (for example the brand's four logo bars pulsing with voiceover amplitude) is the option with the lowest attention cost and the best brand fit; it gives the voice a "body" without a face to fixate on. It needs only per-frame audio amplitude, which is computable in the existing pipeline from the WAV files with no new model or licence.
- Because the "hand only" condition did best in the instructor-presence moderators, a pointer/cursor/highlight that moves with the narration (signalling) is likely a better use of motion than a voice orb. This overlaps with the existing word-group subtitle reveal, which already acts as a voice-synced element.
- Risk of redundancy: the videos already have voice-synced captions; a second voice-synced element competes with them unless it replaces or is attached to them.

### Gaps
- No controlled study found on audio-reactive waveforms/orbs in explainer or social video, and no platform or design-system guidance with data. Claims that "orbs make AI voices feel alive" are product convention (voice assistants), which I could not source to evidence.
- I did not verify Remotion's audio-visualisation API for this note (it is outside the listed key questions); another researcher's notes or the Remotion docs should confirm the exact helper for reading amplitude per frame.

## 3. 2D character lip-sync from audio (Rhubarb, TTS phonemes, viseme sets, Rive/Lottie in Remotion)

### Takeaway
This is fully feasible on a CPU-only Windows laptop with permissive licences: Rhubarb Lip Sync (MIT, Windows binary, WAV in, JSON mouth cues out, 6 to 9 shapes) or Kokoro's own phoneme timings (Apache-2.0) can drive a swapped SVG mouth keyed to frames in Remotion with no new rendering dependency. Rive and Lottie both have official Remotion packages, but lip-sync by data needs per-frame mouth switching that is simplest in plain SVG/React.

### Cited Findings
Rhubarb Lip Sync
- Licence: MIT; the licence text states the resulting lip-sync data belongs to the user alone. Bundled third-party components are all permissive (Boost, BSD variants for PocketSphinx/sphinxbase and the CMU US English acoustic model, MIT, WTFPL) — [rhubarb-lip-sync LICENSE.md](https://raw.githubusercontent.com/DanielSWolf/rhubarb-lip-sync/master/LICENSE.md)
- Binary releases for Windows, macOS and Linux; input is WAVE (.wav) or Ogg Vorbis (.ogg) — [rhubarb-lip-sync README](https://github.com/DanielSWolf/rhubarb-lip-sync)
- Two recognisers: PocketSphinx (default, English) and a language-independent "phonetic" recogniser (less precise) — [README](https://github.com/DanielSWolf/rhubarb-lip-sync)
- Mouth shapes. Basic, required: A = closed mouth for P, B, M; B = slightly open with clenched teeth (most consonants); C = open mouth (EH, AE); D = wide open (AA); E = slightly rounded (AO, ER); F = puckered lips (UW, OW, W). Extended, optional: G = upper teeth on lower lip (F, V); H = tongue raised for long L; X = idle/rest during pauses — [README](https://github.com/DanielSWolf/rhubarb-lip-sync)
- `--extendedShapes` chooses which optional shapes are used (default "GHX"; empty string gives the six basic shapes only). `--dialogFile` accepts the transcript as plain text to improve recognition. `--threads` defaults to the core count — [README](https://github.com/DanielSWolf/rhubarb-lip-sync)
- Output formats: TSV, XML, JSON (timestamped mouth cues), and DAT for Moho/OpenToonz — [README](https://github.com/DanielSWolf/rhubarb-lip-sync)

Visemes from TTS phonemes
- Kokoro is Apache-2.0, runs on CPU, outputs 24 kHz audio, requires espeak-ng (Windows .msi available), and its `KPipeline` generator yields (graphemes, phonemes, audio) per segment — [hexgrad/kokoro](https://github.com/hexgrad/kokoro)
- Kokoro 0.9.4 `KPipeline.Result.tokens` carry `start_ts`/`end_ts` per token for English, derived from the model's predicted phoneme durations in the same synthesis call; they are approximate by design (search summary of third-party write-ups and PRs, not the official README) — [Kokoro for TTS and word timestamps](https://ryanwelch.co.uk/blog/kokoro-word-timestamps/); [audio.cpp PR 626](https://github.com/0xShug0/audio.cpp/pull/626); [onnx-community timestamped model discussion](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/discussions/2)
- Microsoft's viseme set has 22 IDs (0 to 21), many phonemes per viseme. Mapping (en-US, IPA): 0 silence; 1 æ ə ʌ; 2 ɑ; 3 ɔ; 4 ɛ ʊ; 5 ɝ; 6 j i ɪ; 7 w u; 8 o; 9 aʊ; 10 ɔɪ; 11 aɪ; 12 h; 13 ɹ; 14 l; 15 s z; 16 ʃ tʃ dʒ ʒ; 17 ð; 18 f v; 19 d t n θ; 20 k g ŋ; 21 p b m — [Microsoft Learn, "Get facial position with viseme"](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme)
- Azure neural TTS emits viseme events (viseme ID plus audio offset in 100 ns ticks) alongside the audio; it can also return ready-made 2D SVG mouth animation (en-US only) or 55 blend shapes at 60 fps — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme)

Rive and Lottie in Remotion
- `@remotion/rive` provides `<RemotionRiveCanvas>`, which renders a .riv file synchronised to Remotion's timeline. Props: `src` (required), `fit`, `alignment`, `artboard`, `animation`, `onLoad`, `enableRiveAssetCdn`, `assetLoader`. A ref exposes `getAnimationInstance()` (a `LinearAnimationInstance`), `getArtboard()`, `getRenderer()`, `getCanvas()` — [Remotion docs, RemotionRiveCanvas](https://www.remotion.dev/docs/rive/remotionrivecanvas)
- The Rive docs page describes playing a selected linear animation; it does not document state machines or inputs — [Remotion docs](https://www.remotion.dev/docs/rive/remotionrivecanvas)
- `@remotion/lottie` provides `<Lottie>` taking `animationData` (JSON), with `playbackRate`, `loop`, `direction`, `renderer` ("svg" default, "canvas", "html"), `assetsPath`, and `onAnimationLoaded` (gives the lottie `AnimationItem`); it follows Sequence timing — [Remotion docs, Lottie](https://www.remotion.dev/docs/lottie/lottie)

### Inferences
- Mapping Rhubarb to SVG is a lookup, not a rig: draw 6 to 9 mouth paths (A to F, optionally G, H, X), load the JSON cues, and for the current frame pick the cue where `start <= frame/fps < end`. That is one small pure function plus a `<g>` per shape, which fits the project's existing "key everything to frames" approach and adds no npm dependency.
- A collapsed mapping from the Microsoft 22-viseme table to Rhubarb's 9 shapes is straightforward (21 -> A; 18 -> G; 14 -> H; 0 -> X; 7, 8 -> F; 3, 5 -> E; 2, 9, 11 -> D; 1, 4 -> C; consonants 12, 13, 15, 16, 17, 19, 20 and 6 -> B). This mapping is my own derivation from the two cited tables, not a published standard.
- Route choice: the current pipeline uses edge-tts, which gives no phonemes, so Rhubarb on the existing WAVs (with `--dialogFile` set to the voiceover text) is the zero-change route. If the pipeline moves to Kokoro, deriving visemes from its phoneme durations removes the recognition step and its errors, at the cost of mapping Kokoro's phoneme symbols yourself; both are CPU-only.
- For a minimal vector brand, 6 mouth shapes (or even 3: closed / half / open driven by amplitude) is stylistically safer than 22 visemes; fine viseme detail reads as "cartoon character", which the brand guideline excludes.
- Rive/Lottie make sense only if a designer supplies a rig. For data-driven lip-sync they are awkward: Lottie plays a timeline (you would need to jump to a marker frame per viseme through the `AnimationItem`), and the Remotion Rive wrapper is documented around one linear animation rather than state-machine inputs.

### Gaps
- Preston Blair and Oculus/Meta viseme sets: I did not fetch primary sources. From memory (unverified here): the Preston Blair set is the classic roughly 10-shape animator's phoneme chart, and the Oculus Lipsync set has 15 visemes (sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou). Rhubarb's README also, as I recall, credits its six basic shapes to Hanna-Barbera practice. These need a citation before going into the report.
- Rhubarb's exact JSON schema (I recall `{"metadata": {...}, "mouthCues": [{"start": 0.00, "end": 0.05, "value": "X"}]}` with times in seconds) and its latest release number were not confirmed verbatim in the fetch.
- Rhubarb runtime on an i5 for 60 s of audio was not found; no benchmark located. It is CPU-only C++ with PocketSphinx, so it should be seconds to low minutes, but that is an assumption to measure.
- Kokoro's token timing fields are confirmed only through third-party sources; the official README does not document them. Whether per-phoneme (not just per-word) timings are exposed without touching `pred_dur` directly is unconfirmed.
- Whether `@remotion/rive` at 4.0.529 can drive state-machine inputs via the ref was not determined (the first docs URL I tried, /docs/rive/rivecomponent, is a 404; the component page is /docs/rive/remotionrivecanvas).
- Rive editor/runtime licensing and Lottie asset licensing (e.g. LottieFiles marketplace terms) were not researched.

## 4. Realistic talking-head generation from one image plus audio; hosted services

### Takeaway
Nothing in this category is practical on an i5 laptop with no GPU: every open model is designed for CUDA, and the one that is clearly light enough for CPU (Wav2Lip) is non-commercial. SadTalker (Apache-2.0), MuseTalk (MIT), EchoMimic (Apache-2.0), Hallo (MIT) and LatentSync (Apache-2.0) are commercially usable in principle but need a GPU; hosted services cost roughly $18 to $29/month at entry level and are the only realistic route on this hardware.

### Cited Findings
- Wav2Lip: "This repository can only be used for personal/research/non-commercial purposes"; trained on LRS2, which prohibits commercial use; commercial use is directed to Sync Labs (sync.so) — [Rudrabha/Wav2Lip](https://github.com/Rudrabha/Wav2Lip)
- Wav2Lip public model output is 96x96 face region; it is the lightest of the group ("possible but not recommended" on CPU) (secondary) — [tomodahinata model selection guide 2026](https://tomodahinata.com/en/blog/ai-lip-sync-talking-head-model-selection-guide-2026)
- SadTalker: "The license has been updated to Apache 2.0, and we've removed the non-commercial restriction"; Windows install supported (`webui.bat`); setup references CUDA 11.3; 256 px and 512 px face-render variants; disclaimer prohibits uses infringing others' portrait rights — [OpenTalker/SadTalker](https://github.com/OpenTalker/SadTalker)
- SadTalker takes a single photo plus audio (does not need a source video) (secondary) — [tomodahinata guide](https://tomodahinata.com/en/blog/ai-lip-sync-talking-head-model-selection-guide-2026)
- MuseTalk: code MIT, weights usable commercially; dependencies (Whisper, sd-vae, dwpose) keep their own licences; 256x256 face region; "real-time (30fps+)" on a V100 GPU; needs video (or image) plus audio; not practical on CPU (secondary, consistent with repo) — [tomodahinata guide](https://tomodahinata.com/en/blog/ai-lip-sync-talking-head-model-selection-guide-2026); [TMElyralab/MuseTalk](https://github.com/TMElyralab/MuseTalk)
- LatentSync: code and weights Apache-2.0; latent diffusion with 20 to 50 denoising steps; 8 GB VRAM (v1.5) or 18 GB (v1.6); GPU required in practice (secondary) — [tomodahinata guide](https://tomodahinata.com/en/blog/ai-lip-sync-talking-head-model-selection-guide-2026)
- LivePortrait: Windows one-click installer exists; it is video-driven (driving video or motion template), not audio-driven; docs are CUDA-oriented — [KwaiVGI/LivePortrait](https://github.com/KwaiVGI/LivePortrait)
- LivePortrait licence: MIT for the project, but the InsightFace pretrained model packs it uses (buffalo_l etc.) are released for non-commercial research only; a licence-clarification issue is open on the repo (search summary) — [LivePortrait issue 548](https://github.com/KlingAIResearch/LivePortrait/issues/548); [InsightFace model zoo](https://github.com/deepinsight/insightface/blob/master/model_zoo/README.md)
- EchoMimic and EchoMimicV2 are released under Apache-2.0 (search summary) — [antgroup/echomimic](https://github.com/antgroup/echomimic); [antgroup/echomimic_v2](https://github.com/antgroup/echomimic_v2)
- Hallo (Fudan) is MIT-licensed — [hallo LICENSE](https://github.com/fudan-generative-vision/hallo/blob/main/LICENSE). It is diffusion-based, needs 16 GB+ VRAM and is much slower per second of video than SadTalker (secondary, search summary) — [Pixazo comparison](https://www.pixazo.ai/blog/best-open-source-ai-lip-sync-models)
- Hosted pricing (all secondary, third-party pricing roundups, 2026): HeyGen Creator $29/month ($24 annual); HeyGen Business $149/month plus seats; D-ID Lite $5.90/month ($4.70 annual) for 10 minutes; D-ID Pro about $29/month (about $16 annual) and is the lowest D-ID tier that unlocks commercial use; D-ID trial output is watermarked and excludes commercial use; Synthesia Starter $29/month or $18/month annual for about 10 minutes/month (120 minutes/year). Paid tiers of all three are reported to include commercial use rights — [Argil, D-ID pricing 2026](https://www.argil.ai/blog/d-id-pricing-5be73); [DEV, HeyGen alternatives 2026](https://dev.to/stimlau/6-best-heygen-alternatives-in-2026-tested-with-pricing-55fi); [DEV, Synthesia alternatives 2026](https://dev.to/stimlau/6-best-synthesia-alternatives-in-2026-tested-with-pricing-1h07)
- The HeyGen credit figures in those roundups conflict (one says Creator has 600 credits, another 200 credits/month, with about 20 credits per premium avatar minute) — [DEV, HeyGen alternatives](https://dev.to/stimlau/6-best-heygen-alternatives-in-2026-tested-with-pricing-55fi); contradicted within [the same search set](https://www.fahimai.com/heygen-vs-d-id)

### Inferences
- On the stated hardware, the realistic-avatar branch reduces to "pay a hosted service" or "rent a cloud GPU". Local generation of 60 s at 25 to 30 fps on an i5 CPU would mean 1,500 to 1,800 frames through networks built for GPUs; I found no published CPU timing, and the absence of any CPU guidance in the repos is itself a signal.
- Licence filter alone removes Wav2Lip (non-commercial) and makes LivePortrait risky (InsightFace weights), and LivePortrait is not audio-driven anyway. SadTalker is the only "one image + audio, permissive, Windows-documented" candidate, and it is GPU-oriented with dated visual quality.
- A photoreal talking head conflicts with the brand guideline (clean minimal vector, no excessive 3D) and would need compositing as a video layer in Remotion, plus it triggers the disclosure and consent issues in section 5. Nothing in section 1 suggests it would improve learning over a 2D agent (2D g+ 0.38 vs 3D 0.11).

### Gaps
- No verified compute-time-per-minute numbers on CPU for any model; no reliable GPU numbers either beyond MuseTalk's "30 fps+ on V100". This needs a local test or should be reported as unknown.
- SadTalker CPU mode: the README excerpt showed no `--cpu` flag; I believe the inference script has one but did not verify it.
- Hosted prices come from third-party blogs and conflict in places; vendor pricing pages and terms of service (commercial rights, avatar ownership, watermarking, whether custom avatars need consent verification) were not fetched and must be checked before any purchase.
- EchoMimic/Hallo weight licences and their dependency licences (e.g. face detectors, wav2vec, Stable Diffusion bases) were not audited; "Apache-2.0"/"MIT" refers to the repositories.

## 5. Risks for an education brand: uncanny valley, disclosure rules, consent

### Takeaway
A realistic synthetic presenter brings real downside (some learners report discomfort and lower engagement, and it triggers mandatory AI disclosure on YouTube and Meta), whereas a clearly non-realistic animated presenter is explicitly outside YouTube's disclosure requirement. On Meta, note that the rule covers "realistic-sounding audio" as well as photorealistic video, which may reach a TTS voiceover regardless of whether a presenter is shown.

### Cited Findings
- In a 2024 study of video lectures with AI-generated instructors, engagement was higher with the human instructor than with the AI-generated one, and some participants described an uncanny-valley reaction ("I felt uncomfortable, the AI instructor acts like a human, but she is not") — [Video Lectures With AI-Generated Instructors (ERIC EJ1441518)](https://files.eric.ed.gov/fulltext/EJ1441518.pdf)
- A 2025 BJET study found the opposite on eeriness: its AI teacher was rated moderately to highly attractive and the uncanny valley effect did not occur — [Xu et al. 2025, British Journal of Educational Technology](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.13530)
- AI-generated messages using the participant's own face increased eeriness and discomfort, which reduced trust in the message — [Uncanny Valley and Trust (arXiv 2505.05543)](https://arxiv.org/pdf/2505.05543)
- Pedagogical-agent meta-analysis: 2D agents (g+ 0.38) more effective than 3D agents (g+ 0.11); uncanny valley was one of the theories tested — [ERIC EJ1310158](https://eric.ed.gov/?id=EJ1310158)
- YouTube requires disclosure when content is meaningfully altered or synthetically generated and seems realistic: making a real person appear to say or do something they did not, altering footage of real events or places, or generating a realistic-looking scene that did not occur — [YouTube Help, altered or synthetic content](https://support.google.com/youtube/answer/14328491)
- YouTube does not require disclosure for clearly unrealistic content, including fully animated video, nor for production assistance such as script or caption generation, colour adjustment, beauty filters, or cloning your own voice for voiceover — [YouTube Help](https://support.google.com/youtube/answer/14328491)
- YouTube consequences: it may apply a label itself, and repeated non-disclosure can lead to content removal or suspension from the YouTube Partner Program; photorealistic AI content is labelled in the player, other disclosed content in the expanded description — [YouTube Help](https://support.google.com/youtube/answer/14328491)
- Meta (Facebook, Instagram, Threads) requires use of its disclosure tool for organic content containing photorealistic video or realistic-sounding audio that was digitally created or altered; AI-made or AI-edited still images are not subject to the same mandatory self-label; Meta also applies "AI info" automatically when it detects C2PA/IPTC signals; failure to disclose can lead to penalties under Community Standards (all secondary) — [FrameOS, AI content disclosure labels 2026](https://frameos.studio/blog/ai-content-disclosure-labels); [TechCrunch 2024](https://techcrunch.com/2024/02/06/meta-ai-generated-image-labelling/)
- SadTalker's own terms prohibit use that infringes others' portrait rights — [OpenTalker/SadTalker](https://github.com/OpenTalker/SadTalker)

### Inferences
- The uncanny-valley evidence for AI instructors is mixed (one study with discomfort and lower engagement, one with none), so it is a risk rather than a certainty; quality of the avatar is probably the deciding factor, and the low-cost options available on this hardware are the low-quality end.
- A flat 2D vector presenter or abstract speaker mark sits in YouTube's "clearly unrealistic/animated" exemption, so adding it creates no new disclosure duty there. A photoreal avatar would.
- On Meta, the current TTS voiceover may already fall under "realistic-sounding audio that was digitally created"; this is independent of the presenter decision and worth checking against the official page before publishing.
- Consent: using any real person's face (founder, staff, stock photo) as a talking-head source creates likeness/portrait-rights exposure and platform policy exposure; an invented vector character avoids it entirely.

### Gaps
- Meta's official help page did not return content to the fetch tool; the Meta rules above are from secondary sources and the current 2026 wording should be verified at Meta's Help Centre / Transparency Center.
- I did not research statutory rules (EU AI Act Article 50 transparency duties for deepfakes and synthetic audio, US state right-of-publicity and deepfake laws, or the jurisdiction the brand operates in). These matter for consent and labelling and are a real gap.
- YouTube's page does not explicitly say whether a third-party TTS narrator voice (not a clone of your own) needs disclosure; the listed non-disclosure examples mention cloning your own voice only.
- Hosted-service consent mechanisms for custom avatars (identity verification, consent videos) were not researched.

## 6. Screen-space cost in a 1080x1920 frame

### Takeaway
I found no source giving standard presenter sizes for vertical explainers; what the evidence does give is the attention cost: a visible face takes roughly 30 to 40% of viewing time and reduces dwell on the learning content, and instructor size is a significant moderator. In the current layout the only free region between headline and subtitles is about 928 x 990 px, so any presenter competes directly with the main visual.

### Cited Findings
- A visible instructor significantly reduced dwell time on relevant visual material; instructor size, prior knowledge and domain were significant moderators — [ScienceDirect, instructor presence meta-analyses](https://www.sciencedirect.com/science/article/pii/S1747938X2300057X)
- About 41% of viewing time on the instructor's face with a gaze switch every 3.7 s; over 30% in another study; individual range 9% to 60% (search summary) — [Kizilcec et al.](https://vhil.stanford.edu/sites/g/files/sbiybj29011/files/media/file/kizilcec-jep-instructors-face.pdf); [PMC9313280](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9313280/)
- Picture-in-picture instructor presence produced different eye-movement patterns for learners with high vs low sustained attention — [PMC9313280](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9313280/)
- Videos showing only the instructor's hand were (marginally) favoured over fuller embodiment — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1747938X2300057X)

### Inferences
- Layout arithmetic from the project's own rules (CLAUDE.md: safe sides 76 to 1004, headline zone above y = 400, subtitle zone below y = 1390): the content window is 928 x 990 px, about 919,000 px2, or 44% of the 2,073,600 px2 frame. A 240 px circular presenter bubble takes about 45,000 px2 (roughly 5% of that window); a 400 x 500 px half-body character takes 200,000 px2 (roughly 22%). These are my calculations, not sourced norms.
- In a 60 s video with 2.5 to 6 s scenes, a 3.7 s face/content gaze-switch cadence would cost about one switch per scene, which is expensive when each scene makes one point.
- Lowest-cost placements: attach a small speaker mark to the subtitle bar (already where the eyes go for the words), or show a presenter full-size only in the hook (0 to 3 s) and CTA, where there is no competing diagram, and remove it during explanation scenes.

### Gaps
- No sourced figure for "typical" presenter size in 9:16 explainer formats (TikTok/Reels/Shorts). Platform UI overlays (right-hand action rail, bottom caption area) also constrain placement and were not researched.
- The eye-tracking numbers are from landscape lecture videos with slides, not vertical motion graphics; transfer to this format is an assumption.
- The meta-analysis's direction of the size moderator (whether smaller instructors help or hurt) was not visible in the abstract-level summary.
