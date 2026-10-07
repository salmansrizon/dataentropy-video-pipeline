# Audio polish and evaluation for TTS narration (CPU-only, Windows 11, Python + ffmpeg)

Reading notes for the report writer:

- "Cited Findings" are facts taken from a page or paper opened in this session. "Inferences" are my own synthesis (including every proposed setting, bucket threshold and code sketch). Nothing in this file was listened to; no audio chain was run end to end.
- Source quality is uneven. Papers, official docs and repository READMEs are primary. Loudness targets, EQ/compressor settings and ducking depth come from vendor blogs and tutorial sites, which agree with each other only loosely; they are marked as such.
- Two local facts were checked on this machine on 2026-10-07 and matter for every recommendation below:
  1. The ffmpeg bundled with Remotion (`D:\vedio generation\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe`, version n7.1) is a stripped build. Its complete audio-filter list is: `acopy adelay aformat amerge amix anull apad aresample asetpts asetrate atempo atrim loudnorm pan silencedetect volume` (plus `sine`, `anullsrc`). It has **no** `highpass`, `equalizer`, `deesser`, `acompressor`, `sidechaincompress`, `alimiter`, `aecho`, `afir`, `asplit`, `ebur128` or `silenceremove`. There is no other ffmpeg on PATH.
  2. The default `python` is 3.14.3 with `torch`, `numpy`, `scipy` installed and none of `torchaudio`, `librosa`, `parselmouth`, `pyworld`, `pyloudnorm`, `soundfile`, `faster_whisper`, `jiwer`, `utmosv2`. `uv` is installed and has CPython 3.12.13 and 3.13.14 available.

---

## 1. Post-processing chain for TTS voiceover: which steps, what settings, and which are possible with ffmpeg filters alone

### Takeaway
A conventional voice chain (high-pass, corrective/presence EQ, light compression, de-essing, music ducking, then loudness normalisation to about -14 LUFS / -1 dBTP) is fully expressible with stock ffmpeg filters, but not with the ffmpeg that ships inside this workspace's Remotion install, which only offers `loudnorm`, `volume`, `amix`, `adelay`, `apad`, `atempo` and `silencedetect`. The settings themselves come from audio-tutorial sources rather than research, and no source was found showing that this chain makes synthetic speech sound measurably more human.

### Cited Findings

**ffmpeg filters (official documentation, text read directly from the HTML)**
- `loudnorm` is "EBU R128 loudness normalization", supporting "both single pass (livestreams, files) and double pass (files) modes"; it "can target IL, LRA, and maximum true peak". Options: `I` integrated loudness target, range -70.0 to -5.0, default -24.0; `LRA` range 1.0 to 50.0, default 7.0; `TP` maximum true peak, range -9.0 to +0.0, default -2.0; `measured_I`, `measured_LRA`, `measured_TP`, `measured_thresh` (values from a first measuring pass); `offset`; `linear` (default true); `dual_mono`; `print_format` = `summary`, `json` or `none`. — [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
- `loudnorm` linear mode requires all four `measured_*` values; if the "Target LRA" is lower than the source LRA, or the gain change would push true peak above the target, "normalization mode will revert to dynamic". In dynamic mode "the audio stream will be upsampled to 192 kHz", so the docs say to set the output sample rate explicitly with `-ar` or `aresample`. — [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
- `deesser` options are `i` (intensity for triggering de-essing, 0 to 1, default 0), `m` (amount of ducking on the treble part, 0 to 1, default 0.5), `f` (how much of the original frequency content to keep, 0 to 1, default 0.5) and `s` (output mode: `i` input unchanged, `o` ess filtered out, `e` only the ess; default `o`). It has no frequency parameter. Because `i` defaults to 0, the filter does nothing until `i` is raised. — [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html#deesser)
- `sidechaincompress` "acts like normal compressor but has the ability to compress detected signal using second input signal. It needs two input streams and returns one output stream. First input stream will be processed depending on second stream signal." — [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html#sidechaincompress)
- `acompressor` and `sidechaincompress` share options: `threshold` (default 0.125, a linear amplitude, about -18 dBFS; range 0.00097563 to 1), `ratio` (default 2, range 1 to 20), `attack` ms (default 20), `release` ms (default 250), `makeup` (default 1, range 1 to 64), `knee` (default 2.82843), `detection` peak or rms (default rms), `mix`. `highpass` takes `frequency`/`f` (default 3000 Hz), `poles` (default 2), `width_type`, `width`. `equalizer` takes `frequency`/`f`, `width_type`/`t`, `width`/`w`, `gain`/`g` in dB. `silencedetect` takes `noise`/`n` (default -35 dB) and `duration`/`d` (default 2 s). `aecho` takes `in_gain`, `out_gain`, `delays` (ms, `|`-separated), `decays`. `afir` convolves with an impulse response and has `dry`/`wet` gains. (These option lists came through a summarising fetch of the same page; the `deesser` and `loudnorm` entries in that summary were wrong and were corrected above from the raw text, so treat defaults in this bullet as needing a glance at the docs before use.) — [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html)

**Typical voice-chain settings (tutorial and vendor sources, not research)**
- A high-pass at 80 to 100 Hz removes rumble and should come before the compressor "so the compressor reacts to the vocal cleanly"; a "moderate ratio (3:1 to 4:1)" with fast attack and medium release for compression; de-essing targeted at 5 to 9 kHz placed after compression; "a small lift at 3–5 kHz adds presence and intelligibility". One narration preset quoted: high-pass at 80 Hz, 3 kHz presence lift, 3:1 compression, sibilance tamed at 6 kHz. — search summary drawn from [Audient vocal-chain tutorial](https://audient.com/tutorial/crafting-a-basic-vocal-chain-a-step-by-step-tutorial/), [Amped Studio vocal chain guide](https://ampedstudio.com/blog/vocal-chain/), [Notevibes audio enhancer](https://notevibes.com/audio-enhancer) (individual pages not opened; attribution of each number to a specific page is not verified)

**Loudness targets for social video**
- YouTube turns down content louder than about -14 LUFS and leaves quieter content at its original level; the per-video adjustment is visible under "Stats for nerds" as "Volume / Normalized". — search summary of [Critical Listening Lab: YouTube loudness](https://www.criticallisteninglab.com/en/learn/loudness/youtube) and [Wikipedia: Audio normalization](https://en.wikipedia.org/wiki/Audio_normalization)
- "YouTube adjusts playback volume but does not publish -14 LUFS as an upload requirement... Its public help does not define a numeric mastering or upload target." A -14 LUFS integrated, -1 dBTP reference "remains useful for pre-upload comparison". — search summary of [Pure Audio Insight: YouTube audio levels](https://pureaudioinsight.com/blogs/content-production/perfect-youtube-audio-levels-creators-technical-guide)
- Sources conflict on TikTok and Instagram. One set says YouTube Shorts and Instagram Reels both target -14 LUFS with -1.0 dBTP, and that -14 LUFS / -1.0 dBTP "survives all three platforms" — [Audio Forge Pro: Reels vs Shorts](https://audioforgepro.com/blog/instagram-reels-vs-youtube-shorts-audio-comparison), [mixingandmastering.ai](https://mixingandmastering.ai/blog/lufs-for-tiktok-and-reels); contradicted by [OpusClip blog](https://www.opus.pro/blog/best-loudness-normalizers), which says Instagram and TikTok "favor -10 to -12 LUFS", and by [Mr. Vocal: loudness for shorts](https://mrvocal.com/posts/loudness-for-shorts), which says TikTok "has no in-feed normalization" so a hotter master is louder in the feed. All of these are third-party blogs; none cites platform documentation.

**Music ducking depth**
- Recommendations vary by source: music "roughly 18–25 dB below the voice while speech is present"; "try -18 to -20 dB below speech as a starting point"; duck reduction "-15 dB to -20 dB with a 200–300 ms transition"; and, for creator workflows, "a starting duck of about 6–12 dB". — search summary of [Zella: audio ducking](https://zellahq.com/blog/music-ducking-explained/), [Pure Audio Insight: background music volume](https://pureaudioinsight.com/blogs/content-production/background-music-volume-how-loud-should-it-be), [CapCut: audio ducking](https://www.capcut.com/create/audio-ducking-for-clear-dialogue-in-video), [Storyblocks tutorial](https://www.storyblocks.com/resources/tutorials/how-to-adjust-music-behind-a-voice-track-in-premiere-pro)

### Inferences
- **Availability matrix.** With a full ffmpeg build every requested step maps to a stock filter: `highpass`, `equalizer`, `deesser`, `acompressor`, `loudnorm`, `sidechaincompress`, `alimiter`, `aecho` (crude early reflections) or `afir` (real room impulse response), `adelay`/`apad`/`concat` (pauses), `silencedetect` (measure pauses). With the Remotion-bundled ffmpeg only loudness normalisation (`loudnorm`), static gain (`volume`), mixing (`amix`), padding/delays and silence measurement are possible. Three ways forward, cheapest first: (a) install a full ffmpeg build for the audio stage only (the project's "call the bundled ffmpeg directly" pitfall note is about Remotion rendering and still applies there); (b) do the filtering in Python with the already-installed `scipy.signal` (Butterworth high-pass and peaking biquads are a few lines) and keep ffmpeg for `loudnorm` and mixing; (c) keep the chain to loudnorm plus a static music level and skip EQ/compression.
- **Static ducking works on the bundled build.** For a 30 s explainer with near-continuous narration, a fixed music gain (`volume`) 18 to 20 dB under the voice, raised only in the logo/CTA tail with a timed `volume` expression, gives the same audible result as a sidechain compressor without needing `sidechaincompress`.
- **TTS needs less processing than a microphone recording.** A high-pass, a noise gate and heavy compression exist to fix room rumble, noise and uneven performance level; neural TTS output has none of those. The steps most likely to matter for TTS are (1) loudness normalisation, (2) music level under speech, (3) a mild presence/harshness EQ decided by ear, and (4) pause timing (section 2). Compression above about 3:1 would reduce the intensity variation that section 4 uses as an expressiveness signal.
- **Proposed starting chain (full ffmpeg build required; untested, an attempt to run it on the bundled build failed because the filters are absent).** Values sit inside the cited ranges:
  ```
  ffmpeg -nostdin -i vo.wav -i music.wav -filter_complex "
    [0:a]highpass=f=80,
         equalizer=f=250:t=q:w=1.2:g=-2,
         equalizer=f=4000:t=q:w=1.0:g=2.5,
         acompressor=threshold=0.1:ratio=3:attack=10:release=150:makeup=1.5,
         deesser=i=0.4:m=0.5:f=0.5,
         asplit=2[vo][sc];
    [1:a]volume=0.25[m];
    [m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];
    [vo][duck]amix=inputs=2:duration=first:normalize=0,
         loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[out]" -map "[out]" -ar 48000 mix.wav
  ```
  Then run a second pass feeding the printed `measured_I/LRA/TP/thresh` back into `loudnorm` with `linear=true`, as the docs describe, so the gain is a single linear scale instead of dynamic.
- **One loudness target for all three platforms.** -14 LUFS integrated with a -1 to -1.5 dBTP ceiling is the only value every source accepts as safe; the disagreement is only about whether a louder master gains anything on TikTok.
- **Buckets for the judgment model (loudness compliance), measured with `loudnorm print_format=json` or pyloudnorm:** integrated loudness `too_quiet` below -16 LUFS, `on_target` -15 to -13, `too_loud` above -12; true peak `ok` at or below -1.0 dBTP, `clipping_risk` above. Speech-to-music ratio (voice-stem LUFS minus music-stem LUFS during speech): `music_masks_voice` under 12 dB, `balanced` 15 to 22 dB, `music_inaudible` over 26 dB. The edges are my reading of the conflicting blog ranges.

### Gaps
- No source was found (research or practitioner) testing whether EQ, compression, de-essing or reverb raise the perceived humanness or MOS of TTS output. The chain is standard voiceover practice carried over by analogy.
- Room reverb: no source with settings for narration was retrieved. The common advice that explainer narration stays essentially dry, with at most a very short low-level room, is unsourced here.
- Inserted breath sounds: nothing retrieved on whether adding breaths to TTS helps or hurts perceived naturalness.
- No official loudness documentation from YouTube, Instagram or TikTok was found; platform help pages apparently give no numeric target. Spotify's guidance was not retrieved.
- De-esser frequency: ffmpeg's `deesser` has no frequency control, so the "5 to 9 kHz" advice cannot be applied literally with it; the alternative (a narrow `equalizer` cut, or a band-limited `sidechaincompress`) was not tested.

---

## 2. Do pause placement and pause length affect perceived naturalness, and what durations are recommended?

### Takeaway
Yes. In a controlled listening study, naturalness peaked when pauses at both commas and full stops were about 0.6 s and was lowest for pauses of 0.15 s or less and of 2.4 s or more; longer pauses also made the speech sound slower even though articulation rate was unchanged. Corpus work places normal read-speech pauses in a 200 to 1000 ms "medium" band, with pauses over 1 s characteristic of spontaneous rather than read speech.

### Cited Findings
- Study design: natural (not synthetic) English textbook recordings, four segments of 21 to 32 s, with the pauses at punctuation digitally replaced. Experiment 1 set comma and period pauses to the same value from the set 0.075, 0.15, 0.3, 0.6, 1.2, 2.4, 4.8 s; Experiment 2 varied comma and period pauses independently over 0.15, 0.3, 0.6, 1.2, 2.4 s. Listeners were native English speakers (19 to 24) and Chinese and Japanese non-native speakers (about 20 each). — [Frontiers in Psychology 2022, "How Pause Duration Influences Impressions of English Speech"](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.778018/full)
- Results: "The pause duration of 0.6 s received the highest factor scores" for naturalness in all listener groups; in Experiment 2 the best condition was comma pause 0.6 s with period pause 0.6 s (factor score 0.87), and the search summary of the same paper reports that 0.6 s within sentences with either 0.6 or 1.2 s between sentences rated highest. Very short (0.075 to 0.15 s) and very long (2.4 to 4.8 s) pauses "received the lowest scores". Perceived speech rate fell as pause duration rose. — [Frontiers in Psychology 2022](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.778018/full)
- Campione and Véronis analysed about 6000 pauses in 5.5 hours of read and spontaneous speech in five languages and describe three pause categories: brief (under 200 ms), medium (200 to 1000 ms) and long (over 1000 ms), the long category "occurring only in spontaneous speech". — [Campione & Véronis, Speech Prosody 2002](http://sprosig.org/sp2002/pdf/campione-veronis.pdf) (as summarised in search results; PDF not opened)
- Goldman-Eisler (1968) used a 250 ms threshold, arguing gaps under 0.25 s are mostly articulatory and should not be counted as pauses. — reported in [Llisterri, methodological notes on pauses](https://joaquimllisterri.cat/phonetics/LBASS_21/LBASS_21_5_pauses.html) (search summary)
- Pauses tend to be longer at deeper syntactic boundaries. — [Zellner, "Pauses and the Temporal Structure of Speech"](https://web-archive.southampton.ac.uk/cogprints.org/884/3/Zellner.SpeechPauses.pdf) (search summary)
- A typical articulation rate in read speech is 4.4 to 5.9 syllables per second. — search summary, most likely from [Languages 2023, "Occurrence and Duration of Pauses in Relation to Speech Tempo..."](https://doi.org/10.3390/languages8010023) (attribution to this specific result not verified)
- A dedicated Bengali study exists: "Modeling of Sentence-medial Pauses in Bangla Readout Speech: Occurrence and Duration". — [Academia.edu listing](https://www.academia.edu/738574/Modeling_of_Sentence_medial_Pauses_in_Bangla_Readout_Speech_Occurrence_and_Duration) (title only; contents not read)

### Inferences
- The 0.6 s optimum was measured on 21 to 32 s textbook passages at a learner-oriented pace. A 30 s explainer with four to five scenes cannot afford 0.6 s at every comma; a defensible adaptation is roughly 0.2 to 0.35 s at commas, 0.4 to 0.7 s at sentence ends, and up to about 1 s at scene changes, staying inside Campione and Véronis's "medium" band and keeping the hierarchy "deeper boundary, longer pause".
- The project's own observation that "each comma adds a pause" in edge-tts output means pause placement is controlled from the script punctuation; pause length can be corrected afterwards by measuring with `silencedetect` and padding with `apad`/`adelay`, both present in the bundled ffmpeg.
- Because longer pauses lower perceived speech rate, pause changes and the 135 to 155 wpm target in the project workflow interact: inserted pauses should be counted in the wpm figure.
- **Measurement.** `silencedetect=noise=-35dB:d=0.15` (bundled ffmpeg) or faster-whisper word timestamps give every pause with its position; join with the script to label each pause as within-sentence or sentence-final.
- **Buckets for the judgment model** (per pause, then summarised as the share in each bucket): `none_or_clipped` under 0.15 s at a punctuation mark; `short` 0.15 to 0.3 s; `natural` 0.3 to 1.0 s at sentence ends, 0.15 to 0.5 s at commas; `long` 1.0 to 2.0 s; `disruptive` over 2.0 s. Add two booleans: `hierarchy_ok` (median sentence-final pause longer than median comma pause) and `mid_phrase_pause` (any pause over 0.25 s where the script has no punctuation, a typical TTS artefact).

### Gaps
- The naturalness study used human recordings, not TTS, and passages longer than a short-form video; no equivalent study on synthetic narration or on sub-60-second video was found.
- No voiceover-industry guide with pause durations was retrieved; the durations above are from speech research only.
- The Bengali pause paper was not read, so no Bengali-specific pause durations are reported.
- No evidence was found on pause *variability* (humans vary pause lengths; TTS often repeats the same length) and its effect on naturalness.

---

## 3. MOS and automatic MOS predictors: what they are, CPU use, installation, score meaning, correlation with humans, non-English support

### Takeaway
All five predictors (UTMOS, UTMOSv2, NISQA, DNSMOS, torchaudio SQUIM, WV-MOS) are small enough for CPU inference, but they mostly measure signal cleanliness and rank whole systems well while ranking individual clips only moderately; a 2026 probing study concludes MOS predictors "collapse onto acoustic signal quality". None is trained on Bengali, and cross-language use is documented to degrade, so treat the scores as an artefact check and a relative comparison, not as a naturalness or expressiveness verdict.

### Cited Findings

**MOS itself**
- MOS is the mean of listener ratings on a Likert scale, "typically a five-point scale with 1 being 'bad' and 5 being 'excellent'" (ITU-T P.800.1). — [Kunešová et al., Interspeech 2024](https://www.isca-archive.org/interspeech_2024/kunesova24_interspeech.pdf)
- "The context-dependency of MOS ratings means that data from different listening tests cannot be combined, and MOS models trained on data from one listening test tend to fail to generalize well to other listening tests." — [Kunešová et al., Interspeech 2024](https://www.isca-archive.org/interspeech_2024/kunesova24_interspeech.pdf)
- MOS studies "are typically small-scale experiments conducted with few listeners" and are "generally not useful for comparing two models of roughly similar quality". — [Hugging Face blog: TTS Arena](https://huggingface.co/blog/arena-tts)

**UTMOS (2022) and UTMOSv2 (2024)**
- UTMOS is the UTokyo-SaruLab system for VoiceMOS Challenge 2022, an ensemble of fine-tuned self-supervised (SSL) "strong learners" and classical "weak learners"; it "had the highest score on several metrics for both the main and OOD tracks". — [UTMOS paper, arXiv 2204.02152](https://arxiv.org/abs/2204.02152)
- The single strong learner is distributed for easy use: `predictor = torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True); score = predictor(wave, sr)` with 16 kHz input; requires Python 3.8 or later, `torch` and `torchaudio`; MIT licence. — [tarepan/SpeechMOS](https://github.com/tarepan/SpeechMOS)
- UTMOSv2 is the same lab's system for VoiceMOS Challenge 2024 Track 1 (zoomed-in prediction for high-quality synthetic speech), using "transfer learning from deep image classifiers"; it took "1st place in 7 out of 16 metrics" and 2nd in the other nine. — [sarulab-speech/UTMOSv2](https://github.com/sarulab-speech/UTMOSv2)
- Install: `pip install git+https://github.com/sarulab-speech/UTMOSv2.git`. Use: `model = utmosv2.create_model(pretrained=True)`, then `model.predict(input_path="x.wav")`, `model.predict(input_dir="dir/")` or `model.predict(data=array, sr=16000)`; CLI `python inference.py --input_path x.wav --out_path out.csv`. Supported Python: 3.9 to 3.13. MIT licence. The README calls this "quick and simple" prediction and points to a fuller inference guide for more accurate results. — [UTMOSv2 README](https://raw.githubusercontent.com/sarulab-speech/UTMOSv2/main/README.md)
- A `device = "cpu"` setting is shown in the project's quickstart. — search summary of [UTMOSv2 quickstart notebook](https://github.com/sarulab-speech/UTMOSv2/blob/main/quickstart.ipynb)

**NISQA**
- Three weights: `nisqa.tar` (overall quality plus noisiness, coloration, discontinuity, loudness; transmitted speech), `nisqa_mos_only.tar` (overall quality only), `nisqa_tts.tar` (NISQA-TTS v1.0: naturalness of speech from a TTS or voice-conversion system). — [gabrielmittag/NISQA](https://github.com/gabrielmittag/NISQA)
- Use: `python run_predict.py --mode predict_file --pretrained_model weights/nisqa_tts.tar --deg file.wav --output_dir out` (also `predict_dir`, `predict_csv`); install via `conda env create -f env.yml`. Code is MIT; the weights are CC BY-NC-SA 4.0 (non-commercial). — [gabrielmittag/NISQA](https://github.com/gabrielmittag/NISQA)
- NISQA-TTS is a CNN plus bidirectional LSTM that outputs naturalness on a 5-point scale; community forks add a CPU requirements file and optimised CPU inference. — search summary of [nisqa-pytorch-optimized](https://github.com/hcsolakoglu/nisqa-pytorch-optimized) and the NISQA repositories

**DNSMOS P.835**
- A non-intrusive metric built to evaluate noise suppressors; outputs speech quality (SIG), background-noise quality (BAK) and overall (OVRL). Reported Pearson correlation with human ratings of 0.94 (SIG) and 0.98 (BAK, OVRL) "at the model level", i.e. averaged per system. — [DNSMOS P.835, arXiv 2110.01763](https://arxiv.org/abs/2110.01763) (via search summary)

**torchaudio SQUIM**
- `SQUIM_OBJECTIVE.get_model()(waveform)` returns estimated STOI, PESQ and SI-SDR without a clean reference; `SQUIM_SUBJECTIVE.get_model()(waveform, reference_waveform)` returns an estimated MOS using a *non-matching reference*: any clean speech clip, not the same utterance. "Currently, Torchaudio-Squim model only supports 16000 Hz sampling rate." — [Torchaudio-Squim tutorial](https://docs.pytorch.org/audio/main/tutorials/squim_tutorial.html)
- Scales: STOI 0 to 1; PESQ on roughly a 1 to 5 scale; SI-SDR in dB; MOS on the 1 to 5 scale. — [Torchaudio-Squim tutorial](https://docs.pytorch.org/audio/main/tutorials/squim_tutorial.html), [Torchaudio-Squim paper, arXiv 2304.01448](https://arxiv.org/pdf/2304.01448)

**WV-MOS**
- A wav2vec 2.0 model fine-tuned for MOS prediction: `pip install wvmos`; `from wvmos import get_wvmos; model = get_wvmos(cuda=False); model.calculate_one("x.wav")` or `model.calculate_dir(dir, mean=True)`. — [wvmos on PyPI](https://pypi.org/project/wvmos/), [AndreevP/wvmos](https://github.com/AndreevP/wvmos)

**How well they track humans, and what they miss**
- VoiceMOS 2023 tested zero-shot prediction on unseen domains; the top system reached system-level SRCC 0.979 in one track, while "the two sub-tracks of French text-to-speech synthesis had large differences in their predictability". — [VoiceMOS Challenge 2023 report, arXiv 2310.02640](https://arxiv.org/abs/2310.02640) (search summary)
- Concrete zero-shot numbers on French TTS (no French training data): the track winner scored utterance-level SRCC 0.552 and system-level SRCC 0.790 on the high-quality sub-track; a wav2vec 2.0 predictor scored 0.526 / 0.775 there and 0.702 / 0.892 on the lower-quality speaker-adaptation sub-track; two other architectures gave near-zero or negative correlation (CNN-RNN -0.096 utterance-level). — [Kunešová et al., Interspeech 2024, Table 1](https://www.isca-archive.org/interspeech_2024/kunesova24_interspeech.pdf)
- The same authors: "a MOS prediction model trained on English data may have degraded performance on other languages"; their models "may be better at detecting issues that are typical to lower-quality speech synthesis, such as 'buzzing', but they may struggle with more subtle and possibly language-dependent flaws like incorrect prosody"; predictions cluster "in the upper-middle range (3-4)", with many wav2vec 2.0 outputs "just below 4.0". — [Kunešová et al., Interspeech 2024](https://www.isca-archive.org/interspeech_2024/kunesova24_interspeech.pdf)
- A 2026 benchmark of 860 utterances annotated by trained linguists on 10 perceptual dimensions tested four MOS predictors and four audio-LLM judges: MOS predictors "collapse onto acoustic signal quality"; audio-LLM judges show "selective, prompt-dependent detection that does not generalise across all dimensions"; "Neither class reliably captures a breadth of linguistically structured speech errors." — ["Beyond Naturalness: Probing Automated Text-To-Speech Evaluators on Linguistically Grounded Dimensions", arXiv 2608.09930](https://arxiv.org/abs/2608.09930) (abstract only)
- Work on MOS prediction for low-resource languages exists and relies on fine-tuning with in-language ratings. — [Resource-Efficient Fine-Tuning Strategies for Automatic MOS Prediction in TTS for Low-Resource Languages, arXiv 2305.19396](https://arxiv.org/pdf/2305.19396) (title and listing only)

### Inferences
- **Which to run here.** Lowest-friction on this machine: `utmos22_strong` through `torch.hub` (needs only `torch` + `torchaudio`) and SQUIM (ships inside `torchaudio`). UTMOSv2 is the better-validated model for modern, high-quality TTS but pulls more dependencies and is slower. DNSMOS and SQUIM-objective target noise and distortion, which clean TTS output barely has, so they act as a floor check ("did the processing chain break anything") rather than a discriminator. NISQA-TTS weights are non-commercial, which matters for a company's published videos.
- **Python version.** UTMOSv2 lists Python 3.9 to 3.13; the default interpreter here is 3.14.3 and has no `torchaudio`. A separate `uv` environment on the already-installed CPython 3.12 is the safe route for all the evaluation packages. Not tested.
- **Use them relatively, on the dry voice track.** Given utterance-level SRCC around 0.5 to 0.7 out of domain and compression of scores into the 3 to 4 range, an absolute threshold on one clip is weak evidence. Sound uses: (a) compare candidate voices/engines on the *same script*, averaging over all scene lines; (b) before/after the polish chain, to catch damage; (c) flag outlier lines. Run on the voice-only WAV at 16 kHz mono; background music will lower every score.
- **Bengali.** No predictor here was trained on Bengali ratings. Signal-level artefacts (buzz, glitches, clipped audio) should still be detected, but mispronunciation, wrong stress and unnatural Bengali prosody will not be. For Bengali, give MOS-predictor scores low weight and lean on the ASR check (section 5) and a human listening test (section 6).
- **Buckets for the judgment model** (5-point predictors: UTMOS, UTMOSv2, NISQA-TTS, WV-MOS, SQUIM-MOS, DNSMOS OVRL). Absolute, coarse: `artefacted` below 3.0; `acceptable` 3.0 to 3.8; `clean` above 3.8. Preferably also relative: `delta_vs_baseline` = `worse` (drop over 0.3), `same` (within 0.3), `better` (rise over 0.3), using a fixed reference clip of the current production voice. These cut-offs are my proposal; no source defines them, and each predictor has its own offset, so buckets should be calibrated per predictor on a few known-good and known-bad clips. Tell the judgment model explicitly: "this score reflects signal cleanliness, not expressiveness".

### Gaps
- No utterance-level correlation figures were retrieved for UTMOSv2, NISQA-TTS, WV-MOS or SQUIM-MOS on TTS data; the DNSMOS figures are system-level and for noise suppression, not TTS.
- No published evaluation of any of these predictors on Bengali speech was found.
- CPU inference time per clip was not found for any predictor and was not measured.
- The DNSMOS pip packaging (`speechmos` on PyPI; also exposed in `torchmetrics`) could not be verified: the PyPI page failed to load. Installation details for DNSMOS are therefore unconfirmed.
- WV-MOS output range: the PyPI page does not state it; reports that it can go outside 1 to 5 are not verified here.
- The UTMOSv2 "datasets" document (training languages) and the fuller inference guide (folds, repetitions) were not read.
- The list of which four MOS predictors the 2026 probing paper tested was not in the abstract.

---

## 4. Expressiveness measures: pitch (F0) statistics, energy variation, rate and pause statistics; libraries; typical values

### Takeaway
F0 standard deviation in semitones is the best-supported single number: research links larger F0 variation directly to perceived liveliness and charisma, and normal adult speech sits around 2.5 to 3.5 semitones. But published thresholds depend heavily on the pitch tracker, window length and octave-error handling, so buckets must be calibrated on a human reference recording processed by the same code, not taken from the literature.

### Cited Findings
- "First-language speech that is directed to a large audience is normally characterized by more pitch variation than conversational speech. In studies of English and Swedish, high levels of variation correlate with perceptions of speaker liveliness and charisma." — [Hincks & Edlund, SLaTE 2009](https://www.isca-archive.org/slate_2009/hincks09_slate.pdf) (citing Johns-Lewis 1986; Hincks 2005; Traunmüller & Eriksson 1995; Rosenberg & Hirschberg 2005; Strangert & Gustafson 2008)
- "Speech that is delivered without pitch variation affects a listener's ability to recall information and is not favored by listeners." — [Hincks & Edlund, SLaTE 2009](https://www.isca-archive.org/slate_2009/hincks09_slate.pdf) (citing Hahn 2004)
- Method detail: F0 was converted from Hz to semitones, which "gives us a kind of perceptual speaker normalization, which affords us easy comparison between pitch variation in different speakers", and the standard deviation was taken over a moving 10-second window; "The standard deviation will decrease with increasing amounts of data, but if the amount of data under analysis is constant, it will reflect differing amounts of variation." — [Hincks & Edlund, SLaTE 2009](https://www.isca-archive.org/slate_2009/hincks09_slate.pdf)
- Pitch tracking "is an imperfect technology, with errors ranging from octave errors... Ideally, maximum and minimum fundamental frequency values should be set for each individual speaker." — [Hincks & Edlund, SLaTE 2009](https://www.isca-archive.org/slate_2009/hincks09_slate.pdf)
- In that study, Chinese learners of English judged to speak monotonously averaged about 5 semitones (10 s windowed SD, RAPT tracker) in a first presentation; after training with pitch-variation feedback the test group reached about 9 to 11 semitones and the control group about 6 to 8.5 (values read from Figure 1). — [Hincks & Edlund, SLaTE 2009](https://www.isca-archive.org/slate_2009/hincks09_slate.pdf)
- The range of F0 variation expressed in semitones is about the same for men and women, and "the more 'lively' the type of discourse, the larger it is"; speakers increase their standard deviation by increasing F0 excursions from a base value about 1.5 standard deviations below their mean F0. — [Traunmüller & Eriksson, "The frequency range of the voice fundamental in the speech of male and female adults"](https://www.researchgate.net/publication/240312210_The_frequency_range_of_the_voice_fundamental_in_the_speech_of_male_and_female_adults) (search summary)
- Kitzing (1979) reported an F0 standard deviation of 3 semitones for 51 male speakers; in a forensic-phonetics speaker sample, 59% of speakers' standard deviations fell in the 2.5 to 3.5 semitone range. — ["Preliminary F0 statistics and forensic phonetics"](https://www.researchgate.net/publication/251306660_Preliminary_F0_statistics_and_forensic_phonetics) (search summary)
- One non-academic web page gives bands of under 1.5 semitones for speech perceived as monotone, 2.0 to 4.0 for dynamic conversational English and 3.6 to 5.2 for dynamic or expressive presentation. — [AnyGen: "Monotone Speech"](https://www.anygen.io/showcase/monotone-speech/index.html) (low-authority source; no underlying study identified)
- F0 variation is highly correlated with arousal and is used in controllable-TTS research as a rough measure of how expressive an utterance is. — [Semi-Supervised Generative Modeling for Controllable Speech Synthesis, arXiv 1910.01709](https://arxiv.org/pdf/1910.01709) (search summary)
- Typical read-speech articulation rate: 4.4 to 5.9 syllables per second (see section 2 for the source caveat). — [Languages 2023](https://doi.org/10.3390/languages8010023)

### Inferences
- **The literature values disagree by a factor of two or more, and this is a measurement effect.** Whole-recording SD from a clean tracker gives about 2.5 to 3.5 semitones for ordinary speech (Kitzing, the forensic sample), whereas Hincks and Edlund's 10 s windowed RAPT figures start at 5 for "monotone" speakers. Uncorrected octave jumps inflate SD sharply (one octave error is a 12-semitone outlier). Consequence: fix one extraction recipe, reject outliers, and calibrate buckets on reference audio.
- **Recommended recipe (general knowledge of these libraries; not run in this session).**
  - F0: `librosa.pyin(y, fmin=65, fmax=400, sr=sr)` returns F0 plus a voiced flag and is the simplest pure-Python route; `parselmouth` (`snd.to_pitch()` with Praat's autocorrelation method) matches what phonetics papers use; `pyworld` (`dio`/`harvest` + `stonemask`) is fastest. Narrow `fmin`/`fmax` to the voice (about 65 to 250 Hz for a low male voice, 120 to 400 Hz for a female voice) to suppress octave errors.
  - Convert voiced frames to semitones relative to the clip median: `st = 12 * log2(f0 / median(f0))`. Report `f0_sd_st` (SD), `f0_range_st` (95th minus 5th percentile, which is robust to octave errors) and optionally mean absolute F0 slope in semitones per second.
  - Intensity: frame RMS in dB over voiced frames only (`librosa.feature.rms`), report SD in dB; or short-term loudness with `pyloudnorm`. Compute on the voice track before compression and loudnorm, otherwise the chain flattens the very thing being measured.
  - Rate: words per minute from script and duration (already printed by `npm run srt`); articulation rate = syllables divided by speaking time excluding pauses; rate variation = coefficient of variation of per-sentence wpm.
  - Pauses: count, mean, SD, share of total time, from `silencedetect` or word timestamps (section 2).
- **Proposed buckets for the judgment model, to be recalibrated against a human narrator clip run through the same code:**
  - `f0_sd_st`: `monotone` under 2.0; `moderate` 2.0 to 3.5; `lively` 3.5 to 6.0; `suspect_tracking_or_exaggerated` over 6.0.
  - `f0_range_st` (p95 minus p5): `monotone` under 5; `moderate` 5 to 9; `lively` 9 to 14; `suspect` over 14. (Derived from the SD bands assuming roughly ±1.65 SD; not from a source.)
  - `intensity_sd_db` over voiced frames: `flat` under 3; `moderate` 3 to 6; `dynamic` over 6. No source for these; calibration is essential.
  - `speaking_rate_wpm`: `slow` under 130; `target` 135 to 155 (the project's existing target); `fast` over 165.
  - `rate_variation_cv` across sentences: `uniform` under 0.05; `varied` 0.05 to 0.15; `erratic` over 0.15. No source.
  - A better relative form for every measure: ratio to the human reference clip (`below_human` under 0.7, `human_like` 0.7 to 1.3, `above_human` over 1.3).
- **Caveat to pass to the judgment model.** These numbers measure the *amount* of variation, not whether it is *appropriate*. A TTS voice can have a large F0 SD by stressing the wrong words, or by repeating one identical contour on every sentence. A cheap partial guard is the spread of per-sentence F0 SD and per-sentence final-syllable F0 movement: near-zero spread across sentences signals a repeated contour. Appropriateness still needs a human listener.
- Bengali: F0, intensity, pause and rate statistics are language-independent to compute, but the bucket edges above come from English and Swedish work and should be recalibrated on a Bengali human narrator.

### Gaps
- No study was retrieved giving measured F0 SD or range for professional narrators or explainer-video voiceover specifically, nor a direct "neutral versus expressive" comparison table from an emotional-speech corpus; the ESD and controllable-TTS papers surfaced in search but were not read.
- The 1.5 / 2.0 to 4.0 / 3.6 to 5.2 semitone bands come from a single low-authority page; they are consistent with the academic 2.5 to 3.5 "typical" figure but are not independently verified.
- No sourced typical values were found for intensity SD or for speaking-rate variation in expressive versus monotone narration.
- None of `librosa`, `parselmouth`, `pyworld`, `pyloudnorm` documentation was fetched, and none is installed here; API details above are from general knowledge and need a quick check on install. Python 3.14 wheel availability for `praat-parselmouth` and `pyworld` is unknown.
- No Bengali-specific F0 or rate norms were found.

---

## 5. Intelligibility check: transcribe the TTS audio with a speech recogniser and compute word error rate; is Whisper good enough for Bengali?

### Takeaway
ASR round-trip WER with faster-whisper on CPU is practical and is a sound way to catch dropped, garbled or mispronounced words in English. For Bengali, stock Whisper is not good enough: the original models through large-v2 score about 100% WER on Bengali, and un-fine-tuned large-v3 scores about 55% normalised WER on Common Voice, so a Bengali-fine-tuned checkpoint is required and character error rate is the safer metric.

### Cited Findings
- faster-whisper: `pip install faster-whisper`; Python 3.9 or later; "Unlike openai-whisper, FFmpeg does not need to be installed on the system." CPU use: `WhisperModel(model_size, device="cpu", compute_type="int8")`. `transcribe()` accepts `language`, `beam_size`, `word_timestamps`, `vad_filter`. "`segments` is a generator so the transcription only starts when you iterate over it." — [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- CPU benchmark from the README (the `small` model, 8 threads on an Intel Core i7-12700K; the length of the benchmark audio was not captured in this session, so these are relative figures only): int8 took 1 m 42 s using 1477 MB RAM; int8 with `batch_size=8` took 51 s using 3608 MB. — [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- Whisper's training set contained 1.3 hours of Bengali transcribed speech (against 12 hours for Hindi), plus 1988 hours of Bengali-audio-to-English translation data. — [Whisper paper, arXiv 2212.04356, Appendix E](https://arxiv.org/pdf/2212.04356)
- Whisper Bengali WER on FLEURS: tiny 101.6, base 100.6, small 104.4, medium 100.6, large 104.9, large-v2 104.1 (English on the same table: tiny 12.4, small 6.1, medium 4.4). On Common Voice 9 Bengali: tiny 104.1, base 103.7, small 118.6, medium 124.7, large 106.0, large-v2 103.4 (English: large-v2 9.4). — [Whisper paper, arXiv 2212.04356, Tables 11 and 13](https://arxiv.org/pdf/2212.04356) (values read from the PDF text; Bengali is the 3rd column of Table 11 and the 8th of Table 13)
- Un-fine-tuned `openai/whisper-large-v3` on Common Voice Bengali (9,363 evaluation clips): WER 55.463 normalised, 83.344 orthographic; CER 35.66 normalised. After fine-tuning on 21,409 Bengali Common Voice clips: WER 9.651 normalised, 24.288 orthographic; CER 4.876. — [mozilla-ai/whisper-large-v3-bn model card](https://huggingface.co/mozilla-ai/whisper-large-v3-bn)
- A different fine-tune on FLEURS reports a much worse WER of 44.5. — [KhushiDS/whisper-large-v3-Bengali](https://huggingface.co/KhushiDS/whisper-large-v3-Bengali) (search summary)
- A fine-tuned Hugging Face Whisper model can be converted to the CTranslate2 format that faster-whisper loads. — [Medium: converting a fine-tuned Whisper model to faster-whisper](https://medium.com/@balaragavesh/converting-your-fine-tuned-whisper-model-to-faster-whisper-using-ctranslate2-b272063d3204) (search listing; not opened)
- The `jiwer` library computes WER between a reference and a hypothesis transcript. — [theneuralbase: accuracy comparison with full models](https://theneuralbase.com/faster-whisper/learn/advanced/accuracy-comparison-with-full-models/) (search summary)
- TTS Arena's authors caution that "objective metrics like WER (word error rate) are unreliable measures of model quality". — [Hugging Face blog: TTS Arena](https://huggingface.co/blog/arena-tts)
- A search snippet claimed "Whisper large-v2 achieved a WER of 13.2% on Bengali FLEURS"; this is contradicted by the paper's own Table 13 (104.1) and should be disregarded. — [Whisper paper, arXiv 2212.04356](https://arxiv.org/pdf/2212.04356)

### Inferences
- **English recipe.** `WhisperModel("small.en" or "medium", device="cpu", compute_type="int8")`, `transcribe(wav, language="en", beam_size=5, word_timestamps=True)`, then normalise both script and transcript (lower-case, strip punctuation and the `*highlight*` markers used in `content.json`, expand numerals, apply the `tts` spoken-form override such as "Data Entropy") and compute `jiwer.wer`. CPU time for a 30 s clip was not measured. Word timestamps double as the pause and rate source for sections 2 and 4.
- **What the check proves.** A low WER shows the words are recognisable to a robust recogniser; it says nothing about naturalness or expressiveness, and Whisper's language model can silently "repair" a mispronounced word. A high WER on one line reliably points to a real defect (dropped word, garbled brand name, numeral read wrongly) or to a normalisation mismatch. Report the *list of differing words* to the judgment model, not just the rate.
- **Bengali recipe.** Use a Bengali-fine-tuned large-v3 (for example the Mozilla checkpoint, converted with CTranslate2 for faster-whisper, or loaded through `transformers` on CPU), force `language="bn"`, and report CER alongside WER. The gap between normalised and orthographic WER on the model card (9.7 versus 24.3) shows how sensitive Bengali scoring is to text normalisation: Unicode normalisation of conjuncts and vowel signs, Bengali versus Latin numerals, punctuation such as the danda, and transliterated English brand terms. Large-v3 on CPU will be slow (minutes for a short clip is plausible) but workable for 30 s videos. Not tested.
- The WER values above 100% for stock Whisper on Bengali are consistent with the model outputting text in the wrong script or as a translation, given it saw 1.3 hours of Bengali transcription against 1988 hours of Bengali-to-English translation. This is my reading; the paper does not explain the figure.
- **Buckets for the judgment model.** English WER on a normalised short script: `clean` 0 to 2%; `minor` 2 to 5% (check listed words; often normalisation); `problem` 5 to 15%; `unintelligible` over 15%. Bengali with a fine-tuned model: use CER, `clean` under 5%, `minor` 5 to 10%, `problem` 10 to 20%, `unintelligible` over 20%, on the reasoning that the fine-tuned model's own floor on human speech is about 5% CER. For a 60 to 80 word script one wrong word is already 1.3 to 1.7% WER, so also pass the absolute count of wrong words.

### Gaps
- No published WER for stock Whisper large-v3 or large-v3-turbo on Bengali FLEURS was retrieved; the only large-v3 baseline found is the Common Voice figure on a third-party model card.
- No measurement exists here of how any of these models perform on *synthetic* Bengali speech (edge-tts `bn-BD`/`bn-IN` voices), which is cleaner than Common Voice recordings and may score better.
- CPU speed of large-v3 with int8 was not found or measured.
- The licence and CTranslate2 convertibility of the Mozilla Bengali checkpoint were not checked.
- Whether a Bengali text normaliser is bundled with any WER tool was not established.

---

## 6. How TTS leaderboards collect human preference, and a simple sound A/B listening test for one person

### Takeaway
TTS Arena collects blind pairwise votes: two anonymous systems synthesise the same text, the listener picks the more natural one, names are revealed only after voting, and an Elo-style rating is computed from accumulated votes. The same design scales down to one person as a blinded, randomised, repeated forced-choice test scored with a sign test, which research on TTS evaluation suggests is more discriminating than rating clips on a 1 to 5 scale.

### Cited Findings
- In TTS Arena, users "enter text, which will be synthesized by two models. After listening to each sample, the user will vote on which model sounds more natural." "Model names will be revealed only after a vote is submitted." Ranking uses "an algorithm similar to the Elo rating system, commonly used in chess and other games". — [Hugging Face blog: TTS Arena](https://huggingface.co/blog/arena-tts)
- The stated motivation: automatic metrics such as WER "are unreliable measures of model quality", and MOS studies are small and "generally not useful for comparing two models of roughly similar quality". The blog acknowledges "risks of human bias and abuse" and names delayed model-name reveal as its safeguard. — [Hugging Face blog: TTS Arena](https://huggingface.co/blog/arena-tts)
- The Artificial Analysis speech arena works the same way: listeners hear two clips of the same text from two models without knowing which is which and pick the preferred one; each vote moves both models' Elo ratings. — [Artificial Analysis TTS leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice), as described in [Speechify blog](https://speechify.ai/blog/simba-3-tops-artificial-analysis-tts-leaderboard) (vendor description, search summary)
- ITU-T P.808 standardises crowdsourced listening tests. In ACR (absolute category rating) each clip is rated on a 5-point scale from "bad" = 1 to "excellent" = 5, and averaging gives MOS. In CCR (comparison category rating) listeners hear two clips in random order (A-B or B-A) and rate the second relative to the first on a 7-point scale from -3 to +3; crowdsourced CCR was found "highly reproducible" and "a reliable and valid test method". — [Naderi & Cutler, open-source P.808 implementation, arXiv 2005.08138](https://arxiv.org/abs/2005.08138); [Speech Quality Assessment in Crowdsourcing: CCR Method, arXiv 2104.04371](https://arxiv.org/abs/2104.04371)
- Published critiques of small TTS listening tests exist: Wester, Valentini-Botinhao & Henter, "Are we using enough listeners? No! – An empirically-supported critique of Interspeech 2014 TTS evaluations" (Interspeech 2015), and Camp, Kenter, Finkelstein & Clark, "MOS vs AB: Evaluating text-to-speech systems reliably using clustered standard errors" (Interspeech 2023). — cited in [Kunešová et al., Interspeech 2024](https://www.isca-archive.org/interspeech_2024/kunesova24_interspeech.pdf) (titles only; the papers were not read)

### Inferences
- **One-person A/B protocol (my design, following the arena and CCR principles).**
  1. Same content, matched conditions: render the same script lines with voice/setting A and B; loudness-match every clip to the same LUFS with `loudnorm` (louder tends to win); same sample rate, both dry or both with identical processing.
  2. Blind and randomise: a small script copies each pair to neutral names (`pair03_x.wav`, `pair03_y.wav`) with random assignment and writes the key to a file that is not opened until the end. Randomise pair order and which clip plays first.
  3. One question per pass, forced choice: "Which sounds more like a person explaining this?" Run a separate pass for a second question if needed (for example "Which is clearer?"). Allow at most two plays each; no "tie" option, or allow ties and drop them from the test.
  4. Enough trials: at least 12 to 20 pairs across different sentences; include two or three repeated pairs with the order flipped to check self-consistency.
  5. Listen on the target device (phone speaker and earbuds), in one sitting of under 15 minutes, before looking at any metric.
  6. Score with a two-sided binomial sign test against 50%. Exact thresholds for p < 0.05: 9 of 10, 10 of 12, 13 of 16, 15 of 20. Results below those counts mean "no reliable preference", not "equal".
- **Limits.** One listener measures that listener's preference; the person who built the video knows the script and may recognise voices, so blinding is partial. Two or three extra listeners with five pairs each is a large improvement for little cost, and a native Bengali speaker is necessary for Bengali clips. With several candidates, a round-robin of pairwise wins (count wins; no Elo needed at this scale) is simpler than MOS ratings.
- **Buckets for the judgment model.** `prefers_A` or `prefers_B` when the sign test passes at p < 0.05; `leans_A` / `leans_B` at 65% or more of votes without significance; `no_preference` otherwise; plus `self_consistency` = share of flipped-order repeats answered the same way (`reliable` at 80% or more, `unreliable` below). A human preference result should outrank every automatic metric in sections 3 to 5 when they disagree, since those metrics are documented to miss prosody.
- The CCR 7-point scale is an alternative when the size of the difference matters, but for a handful of clips and one listener the forced binary choice gives a cleaner statistic.

### Gaps
- The exact rating computation and vote-filtering rules of TTS Arena (and its V2) were not retrieved beyond "similar to Elo".
- The findings of the Wester et al. and Camp et al. papers (how many listeners or pairs are needed) were not read; only their titles are cited, so the trial counts above rest on the binomial arithmetic alone.
- No published guidance specific to single-listener or very-small-panel TTS tests was found.
- MUSHRA-style testing for TTS ("Rethinking MUSHRA", arXiv 2411.12719) surfaced in search but was not read.
