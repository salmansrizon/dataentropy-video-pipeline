# Making Kokoro-82M (kokoro 0.9.x, KPipeline, misaki) sound more human for short English explainer narration

Evidence labels used below:
- **[AUTHOR-DOC]** written by hexgrad in the model repo, README, or the official Space UI.
- **[AUTHOR-CODE]** read directly from the current `main` source of `hexgrad/kokoro` or `hexgrad/misaki` (fetched 2026-10-07). Behaviour is certain; the audible effect is not documented.
- **[COMMUNITY]** third-party project or report.
- **[UNVERIFIED]** search-snippet only; the primary page could not be opened.

Access note: the Hugging Face discussion pages for hexgrad/Kokoro-82M returned HTTP 403 and the HF API returned `{"error":"Discussions are disabled for this repo"}`. Statements attributed to those threads come from search-result snippets only and are marked [UNVERIFIED].

---

## 1. Does Kokoro have any emotion or style control at all? What can it not do?

### Takeaway
No. Kokoro has no emotion, style, or SSML parameter; the only inputs are text (phonemes plus a small punctuation set), a voice tensor, and `speed`. Expressiveness comes only indirectly: voice choice, punctuation, stress marks, line length, and speed.

### Cited Findings
- [AUTHOR-CODE] The whole inference call is `model(ps, pack[len(ps)-1], speed, return_output=True)`: phoneme string, one style vector, one speed float. There is no emotion, pitch, energy, or style-prompt argument. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-CODE] `KPipeline.__call__` exposes only `text`, `voice`, `speed`, `split_pattern`, `model`. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-DOC] The model is StyleTTS 2 plus ISTFTNet, decoder only, "no diffusion, no encoder release". No encoder release means there is no official way to derive a new style vector from a reference recording (no cloning, no "speak like this clip"). — [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M)
- [AUTHOR-DOC] Training data is "a few hundred hours" of permissive/non-copyrighted audio including synthetic audio from closed TTS models. — [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M)
- [AUTHOR-DOC] The only intonation levers the author advertises in the official demo are: "To adjust intonation, try punctuation `;:,.!?—…"()“”` or stress `ˈ` and `ˌ`", plus stress lowering/raising markup (section 3). — [hexgrad/Kokoro-TTS Space app.py](https://huggingface.co/spaces/hexgrad/Kokoro-TTS/blob/main/app.py)
- [UNVERIFIED] Search snippet of the author thread "Curb Your Expectations: Data & Architecture Limitations": Kokoro "did not see much emotional data in training"; the data mix is "mostly synthetic, neutral speech"; it likely cannot laugh because it saw about zero laughs, and cannot sound extremely angry because there are few or no clips of true anger. — [HF discussion #69](https://huggingface.co/hexgrad/Kokoro-82M/discussions/69)
- [UNVERIFIED] Search snippet of "How to add Pauses & Emotions?": replies were "No, for now" and "Not possible, because trained on synthetic data". — [HF discussion #13](https://huggingface.co/hexgrad/Kokoro-82M/discussions/13)
- [COMMUNITY] GitHub issue #254 "Request for Emotional Features" (anger, laughter, crying) is open with no maintainer reply. — [hexgrad/kokoro issue #254](https://github.com/hexgrad/kokoro/issues/254)
- [COMMUNITY] `eryawww/kokoro_hack` steers emotion by optimising the style vector with Particle Swarm Optimization against Wav2Vec2 emotion-embedding centroids (`python main.py --text "..." --emotion anger`), with an STFT loss weight (default 0.7) to limit quality loss. Apache-2.0. It needs an extra emotion-encoder model and many synthesis passes per line. — [eryawww/kokoro_hack](https://github.com/eryawww/kokoro_hack)

### Inferences
- Cannot do: emotion tags, `[laugh]`/`[sigh]` style non-verbal tokens, SSML `<prosody>`/`<emphasis>`/`<break>`, pitch or energy control, whispering on demand, zero-shot cloning, or a text style prompt. Any such tag typed into the text is simply read or dropped by the G2P.
- Bracketed tags such as `[pause:1.5s]`, `[rate:1.5]`, `[voice:...]` belong to the Kokoro-FastAPI wrapper, not to `KPipeline` (section 3). In plain `kokoro` they are not interpreted.
- For a warm explainer read, the realistic ceiling is "pleasant, well-paced, correctly stressed neutral narrator". Excitement, sadness, sarcasm are out of reach without a different model.
- `kokoro_hack` is a research curiosity for this pipeline: slow on CPU (iterative search per line), result quality not independently reported.

### Gaps
- The author's own wording in discussions #69, #13, #107 could not be read first-hand (discussions disabled / 403).
- No independent listening evaluation of `kokoro_hack` output was found.

---

## 2. Which voices are best / most expressive? Can voices be blended, and what does that do?

### Takeaway
`af_heart` is the only A-grade voice and `af_bella` (A-) is the only other voice near it; grades measure training-data quality and quantity, not expressiveness. Blending is supported natively as an equal-weight mean (`"af_heart,af_bella"`); weighted blends require building the tensor yourself, and the tensor's two halves (timbre vs prosody) can be mixed separately.

### Cited Findings
- [AUTHOR-DOC] American English grades (Overall): **af_heart A**; **af_bella A-** (target quality A, "HH hours"); af_nicole B- (HH hours, headphones emoji); af_aoede C+, af_kore C+, af_sarah C+; af_alloy C, af_nova C; af_sky C-; af_jessica D, af_river D. Male: am_fenrir C+, am_michael C+, am_puck C+; am_echo D, am_eric D, am_liam D, am_onyx D; am_santa D-; am_adam F+. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [AUTHOR-DOC] British English: bf_emma B- (HH hours) is the best; bf_isabella C, bm_fable C, bm_george C; bm_lewis D+; bf_alice D, bf_lily D, bm_daniel D. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [AUTHOR-DOC] "For each voice, the given grades are intended to be estimates of the **quality and quantity** of its associated training data"; "Subjectively, voices will sound better or worse to different people." — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [AUTHOR-DOC] Trait emojis: af_heart has a heart, af_bella a fire emoji, af_nicole a headphones emoji. VOICES.md gives no textual definition of these in the fetched content. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [AUTHOR-CODE] Native blending: `packs = [self.load_single_voice(v) for v in voice.split(delimiter)]` then `torch.mean(torch.stack(packs), dim=0)`, delimiter `","`. So `voice='af_heart,af_bella'` is a 50/50 mean. There is no weight syntax in `kokoro` itself. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-CODE] `load_voice` returns a `torch.FloatTensor` unchanged, and the README shows `voice=torch.load('voice.pt')`, so any custom tensor can be passed as `voice`. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py); [kokoro README](https://github.com/hexgrad/kokoro)
- [AUTHOR-CODE] The style vector is split in the model: `s = ref_s[:, 128:]` feeds the prosody predictor (durations, F0, energy via `F0Ntrain(en, s)`), and `ref_s[:, :128]` feeds the decoder. — [kokoro/model.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/model.py)
- [COMMUNITY] Kokoro-FastAPI weighted syntax: `"af_bella(2)+af_sky(1)"` = 67%/33%, weights normalised to 100%; combined voices can be saved as `.pt` and reused. This is the wrapper's API, not `KPipeline`. — [remsky/Kokoro-FastAPI README](https://github.com/remsky/Kokoro-FastAPI)
- [COMMUNITY] A third-party implementation reports its row-by-row average of `af_bella` and `af_sky` matches the official `torch.mean(torch.stack(packs), 0)` to within 6e-8, supports `af_bella:0.7,af_sky:0.3`, and that `af_heart:0.6,af_bella:0.4` output was transcribed identically by Whisper-small (intelligibility preserved). — [HartsyAI/HartsyInference PR #259](https://github.com/HartsyAI/HartsyInference/pull/259) (search snippet)
- [COMMUNITY] One 2026 guide says female voices are reported as stronger than male voices across the community. — [explainx.ai Kokoro guide](https://explainx.ai/blog/kokoro-local-cpu-tts-openai-compatible-guide-2026)

### Inferences
- Weighted blend in plain `kokoro` (offline, CPU), derived from the code above:
  ```python
  import torch
  p = KPipeline(lang_code='a')
  a = p.load_single_voice('af_heart'); b = p.load_single_voice('af_bella')
  mix = 0.7 * a + 0.3 * b          # same shape as a voice pack
  for r in p(text, voice=mix, speed=0.9): ...
  ```
  `voice=mix` works because `load_voice` passes a FloatTensor through. On CPU the tensor type check (`torch.FloatTensor`) is satisfied.
- Because columns `[:128]` drive the decoder (timbre/acoustics) and `[128:]` drive duration and pitch prediction, a "keep af_heart's timbre, borrow af_bella's delivery" tensor is `torch.cat([a[..., :128], b[..., 128:]], dim=-1)` (or a weighted mix of only the second half). This follows from the source but no author documentation or published listening result for this half-swap was found; treat as an experiment and judge by ear.
- Averaging tends to produce a new, slightly smoother timbre and prosody between the two speakers; it does not add an emotion that neither voice has. Mixing a high-grade voice with a low-grade one is likely to lower quality, so `af_heart` + `af_bella` is the only blend whose inputs are both A-range.
- The fire emoji on `af_bella` suggests a more energetic delivery than `af_heart`, but VOICES.md does not say so in words; this is a reading of the emoji, not a documented claim.
- For this project `af_heart` is already the documented best choice. The cheap experiment is an A/B of `af_heart` vs `af_heart,af_bella` vs a 0.7/0.3 mix on the same 12 lines.

### Gaps
- No author statement on which voice is "most expressive" or "most conversational"; grades are about data, not style.
- No reliable first-hand listening comparison of blends of `af_heart` was found (only a Whisper-transcription sanity check).
- Voice pack tensor shape (commonly described as 510 x 1 x 256) was not verified directly; only the indexing `pack[len(ps)-1]` and the 128/128 split were read from source.

---

## 3. Inline markup: custom phonemes, stress markers, punctuation

### Takeaway
misaki supports three inline features through Markdown-link syntax: `[word](/phonemes/)`, numeric stress `[word](-2|-1|-0.5|0|0.5|+1|+2)`, and number flags `[123](#flags#)`. Capitalisation also changes stress. Only the punctuation set `; : , . ! ? — … " “ ” ( )` reaches the model, and that punctuation is the main intonation and pause control.

### Cited Findings

**Custom phonemes**
- [AUTHOR-DOC] Syntax: `[Misaki](/misˈɑki/) is a G2P engine designed for [Kokoro](/kˈOkəɹO/) models.` — [misaki README](https://github.com/hexgrad/misaki)
- [AUTHOR-DOC] "Customize pronunciation with Markdown link syntax and /slashes/ like `[Kokoro](/kˈOkəɹO/)`". — [Kokoro-TTS Space app.py](https://huggingface.co/spaces/hexgrad/Kokoro-TTS/blob/main/app.py)
- [AUTHOR-CODE] Regex `LINK_REGEX = r'\[([^\]]+)\]\(([^\)]*)\)'`; a feature of the form `/.../` replaces the token's phonemes. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-DOC] Phoneme inventory (American): stress `ˈ` primary, `ˌ` secondary; consonants `b d f h j k l m n p s t v w z ɡ ŋ ɹ ʃ ʒ ð θ ʤ ʧ`; vowels `ə i u ɑ ɔ ɛ ɜ ɪ ʊ ʌ`; diphthong letters `A` (hey), `I` (high), `W` (how), `Y` (soy); `ᵊ` muted schwa (pixel); American-only `æ`, `O` (oh), `ᵻ` (boxes), `ɾ` (butter tap). British-only `a`, `Q`, `ɒ`, `ː`. Standard IPA diphthongs like `eɪ`, `aɪ`, `oʊ` are not in the set; use `A`, `I`, `O`. — [misaki EN_PHONES.md](https://github.com/hexgrad/misaki/blob/main/EN_PHONES.md)

**Stress markup**
- [AUTHOR-DOC] "Lower stress `[1 level](-1)` or `[2 levels](-2)`"; "Raise stress 1 level `[or](+2)` 2 levels (only works on less stressed, usually short words)". — [Kokoro-TTS Space app.py](https://huggingface.co/spaces/hexgrad/Kokoro-TTS/blob/main/app.py)
- [AUTHOR-CODE] Accepted numeric features: any signed integer, plus `0.5`, `+0.5`, `-0.5`. Exact `apply_stress` semantics:
  - `< -1` (e.g. `-2`): remove all stress marks from the word.
  - `-1`, or `0`/`-0.5` on a word with primary stress: delete secondary marks, demote primary `ˈ` to secondary `ˌ`.
  - `0`, `0.5`, `1` on a word with no stress marks: add secondary stress `ˌ`.
  - `>= 1` on a word with secondary but no primary: promote `ˌ` to `ˈ`.
  - `> 1` (e.g. `+2`) on a word with no stress marks: add primary stress `ˈ`.
  - Otherwise unchanged. A word that already has primary stress cannot be raised further. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-CODE] Capitalisation is a stress input: `self.cap_stresses = (0.5, 2)` and `stress = None if word == word.lower() else self.cap_stresses[int(word == word.upper())]`. A Title-case word gets stress 0.5, an ALL-CAPS dictionary word gets stress 2 (same rules as above, so it only affects words that lack primary stress). — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-CODE] Function words are reduced by context: `the` is `ði` before a vowel else `ðə`; `a` as determiner is `ɐ`; `to` is `tə` before consonant, `tʊ` before vowel; `I` gets secondary stress; `in` loses stress as a preposition mid-phrase; `vs`/`vs.` is read "versus". — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)

**Punctuation**
- [AUTHOR-CODE] `PUNCTS = frozenset(';:,.!?—…"“”')`; parentheses are passed through via the tag map (`-LRB-` -> `(`, `-RRB-` -> `)`); straight quotes become curly `“ ”`. Other symbols are dropped or verbalised. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-CODE] A hyphen `-` or en dash `–` tagged by spaCy as punctuation becomes the em-dash token `—`. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-CODE] Symbols verbalised: `%` percent, `&` and, `+` plus, `@` at; `.` "dot" and `/` "slash" inside address-like tokens. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-DOC] The author lists punctuation `;:,.!?—…"()“”` as the way "to adjust intonation". — [Kokoro-TTS Space app.py](https://huggingface.co/spaces/hexgrad/Kokoro-TTS/blob/main/app.py)
- [AUTHOR-CODE] Chunk-boundary priority also ranks punctuation strength: `['!.?…', ':;', ',—']`. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [COMMUNITY] Kokoro-FastAPI adds its own tags on top: `[pause:1.5s]` (colon and trailing `s` required), `[rate:1.5]` (0.25 to 4.0, multiplies request speed), `[voice:am_michael]`, plus the same `[Worcester](/wˈʊstər/)` phoneme syntax. — [remsky/Kokoro-FastAPI README](https://github.com/remsky/Kokoro-FastAPI)
- [UNVERIFIED] A thread "Adding defined period pauses to the input text file" exists; contents could not be read. — [HF discussion #61](https://huggingface.co/hexgrad/Kokoro-82M/discussions/61)

### Inferences
- Practical emphasis recipe: the model has no "emphasis" control, only lexical stress. To make a key word land, (a) lower the stress of neighbouring function words with `[word](-1)`/`(-2)` so the content word stands out, (b) put the key word last before a comma, dash or full stop, where the model naturally places a pitch movement, (c) raise a normally unstressed short word (`[is](+2)`, `[not](+2)`, `[and](+2)`) when it carries the contrast. ALL CAPS on a short word (`NOT`, `AND`) is equivalent to `(+2)` for dictionary words, but all-caps tokens the tagger sees as proper nouns may be spelled out, so the explicit `(+2)` form is safer.
- Stress markup cannot make an already primary-stressed content word louder or higher; for that the only tools are sentence position and punctuation.
- Punctuation effects (model-learned, so approximate; no author table of pause lengths exists): `.` falling terminal contour plus pause; `?` rising or question contour; `!` more energetic terminal; `,` short pause with continuation rise; `;` and `:` medium pause; `—` a break/aside; `…` trailing, hesitant pause; quotes and parentheses change the phrasing of the enclosed span. These descriptions are inference from the tokens being model inputs and the author's "adjust intonation" tip, not measured values.
- Three ASCII dots `...` are not the same token as the Unicode ellipsis `…`: the code keeps whichever characters are in `PUNCTS`, so `...` likely reaches the model as three period tokens while `…` is the single ellipsis token. Type the real `…` character if the trailing-off effect is wanted, and compare by ear.
- Exact pauses are not controllable through text. For precise timing, generate lines separately and insert silence in the audio/timeline (this project already generates one line per scene, so scene timing does this job).
- Custom phonemes are the reliable fix for brand and technical words. Example for "SQL" said as "sequel": `[SQL](/sˈikwəl/)`; for a brand: `[DataEntropy](/dˈAɾə ˈɛntɹəpi/)` (verify by ear; phoneme strings here are composed from EN_PHONES.md, not taken from a source).
- Print `ps` from the generator (`for gs, ps, audio in pipeline(...)`) for every line; it shows exactly which stresses and punctuation tokens the model received, which makes stress edits deterministic to check.

### Gaps
- No author-published description of how long each punctuation mark pauses or exactly how each changes pitch.
- The `#flags#` number feature (`a`, `n`, `&` flags affecting "one"/"and" in numbers) is in the code but undocumented; exact usage not confirmed.
- Whether `...` vs `…` sounds different was not tested.

---

## 4. How does `speed` behave? Does per-line speed variation help? How do `split_pattern` and chunking affect prosody?

### Takeaway
`speed` divides every predicted phoneme duration (pauses included) before pitch is predicted, so it is a uniform tempo scale, not time-stretching and not an expressiveness control. Chunking matters more than speed: each chunk is synthesised independently and the style vector is selected by the chunk's phoneme count, so line length and where splits fall directly change prosody.

### Cited Findings
- [AUTHOR-CODE] `duration = torch.sigmoid(duration).sum(axis=-1) / speed` then `pred_dur = torch.round(duration).clamp(min=1)`. F0 and energy are predicted after the durations are expanded (`F0_pred, N_pred = self.predictor.F0Ntrain(en, s)` on the aligned sequence). — [kokoro/model.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/model.py)
- [AUTHOR-CODE] `speed` may be a callable: `if callable(speed): speed = speed(len(ps))`, receiving the chunk's phoneme-string length. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-CODE] The style vector depends on length: `pack[len(ps)-1]`. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-CODE] Default `split_pattern=r'\n+'`: text is split on newlines first; each segment is synthesised separately. `split_pattern=None` keeps the text as one segment. Within a segment, English text is only split again when it would exceed 510 phonemes, at the last `!.?…`, else `:;`, else `,—`. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-DOC] "Most voices perform best on a 'goldilocks range' of 100-200 tokens out of ~500 possible." "**Weakness** on short utterances, especially less than 10-20 tokens. Root cause could be lack of short-utterance training data and/or model architecture. One possible inference mitigation is to bundle shorter utterances together." "**Rushing** on long utterances, especially over 400 tokens. You can chunk down to shorter utterances or adjust the `speed` parameter to mitigate this." — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [COMMUNITY] Kokoro-FastAPI chunk targets: `TARGET_MIN_TOKENS` 175, `TARGET_MAX_TOKENS` 250, `ABSOLUTE_MAX_TOKENS` 450; its README notes the model takes up to 510 tokens but long chunks tend to sound rushed and produce artefacts. — [remsky/Kokoro-FastAPI README](https://github.com/remsky/Kokoro-FastAPI)
- [COMMUNITY] A reader app reverted to "Kokoro's natural speed" (1.0) as part of making narration more natural, and turned paragraph breaks into a short inserted pause because Kokoro rushed past them. — [Gepardi-dot/reader-tts PR #78](https://github.com/Gepardi-dot/reader-tts/pull/78)
- [AUTHOR-CODE] Each result carries `pred_dur` and per-token `start_ts`/`end_ts` timestamps (English), computed from predicted durations. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)

### Inferences
- Tokens here are phoneme characters (including spaces and punctuation), not words. A 10 to 14 word narration line is roughly 50 to 90 phoneme tokens: above the 10-20 "weak" zone but below the 100-200 sweet spot. Lines under about 5 words fall into the weak zone.
- Because speed scales durations uniformly and durations are rounded to integer frames with a minimum of 1, slow speeds (0.8) stretch pauses and vowels alike and can sound deliberate or drawn-out rather than warm; at 0.8 to 1.0 the effect is mild. Speed does not change pitch range or energy directly.
- Per-line speed variation is a legitimate naturalness lever within what the code allows: humans slow down for the key claim and speed up for set-up. Suggested pattern for this project: hook and outcome lines 0.90 to 0.95, dense explanation lines 0.95 to 1.0, the single most important line 0.85 to 0.9. Keep adjacent lines within about 0.1 of each other so tempo jumps are not audible. No source reports a measured benefit; this is an inference to verify by ear.
- Per-phrase speed inside one line is not available in one pass. It requires synthesising phrases separately and concatenating, which costs the cross-phrase intonation and pushes each piece toward the short-utterance weak zone; generally not worth it for 12 short lines.
- Do not put newlines inside a narration line: with the default `split_pattern` a newline forces two independent short utterances. Pass each line as a single string (or set `split_pattern=None`).
- Line length changes the style vector, so two lines with identical wording but different padding will differ in delivery, and re-wording a line by a few words is a real way to get a different "take". Kokoro inference is deterministic for identical input, so re-rolls must come from changing text, punctuation, speed, or voice mix.
- Bundling test worth running: synthesise two adjacent short lines as one utterance (author's stated mitigation), then cut at the sentence boundary using `tokens[i].start_ts/end_ts`. This gives each sentence context and a style vector from the better-trained length range, at the cost of a cut point to manage.

### Gaps
- No author documentation of the callable `speed` or of the recommended speed range; only the code.
- No measured comparison of 0.8 vs 0.9 vs 1.0 naturalness for `af_heart` was found.
- The exact tokens-per-word ratio above is an estimate, not measured on this project's scripts.

---

## 5. Writing the script so it sounds spoken, not read

### Takeaway
Write for Kokoro's strengths: complete, medium-length sentences with clear punctuation and the key word at the end; spell or mark up anything ambiguous (acronyms, 4-digit numbers, brand names). Avoid one- or two-word lines, fillers, and symbols.

### Cited Findings
- [AUTHOR-DOC] Short utterances (under 10-20 tokens) are weak; bundling short utterances is the suggested mitigation. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [AUTHOR-CODE] Numbers: a bare 4-digit integer with no currency is read as a **year** (`num2words(..., to='year')`), so `1500` becomes "fifteen hundred" and `2024` "twenty twenty-four"; ordinals with `st/nd/rd/th` are read as ordinals; commas are treated as thousands separators; `$`, `£`, `€` are expanded to dollars/cents etc.; decimals are split on the point. Conversion uses num2words. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py); [misaki README](https://github.com/hexgrad/misaki)
- [AUTHOR-CODE] Acronyms: an all-caps word not in the gold dictionary is lower-cased and looked up; if tagged as a proper noun and no stressed dictionary entry is found, `get_NNP` spells it letter by letter with primary stress on the last letter. Dotted abbreviations with short parts (e.g. `U.S.`) are also spelled out. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)
- [AUTHOR-CODE] Out-of-dictionary words go to the fallback (espeak-ng in `KPipeline`); without it they are skipped: "EspeakFallback not Enabled: OOD words will be skipped". — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-DOC] On Windows, espeak-ng must be installed from the `.msi` for the fallback to work. — [kokoro README](https://github.com/hexgrad/kokoro)
- [AUTHOR-CODE] `KPipeline(..., trf=False)` by default; `trf=True` uses the transformer spaCy model for tagging, which drives part-of-speech dependent pronunciations (heteronyms, `a`/`to`/`in` reduction, proper-noun detection). — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [COMMUNITY] A reader app pre-writes years, money, ordinals and clock times as words before Kokoro sees them to stop mis-readings. — [Gepardi-dot/reader-tts PR #78](https://github.com/Gepardi-dot/reader-tts/pull/78)
- [COMMUNITY] Recommended listening test set: "a plain sentence, a proper name, an abbreviation, a date, and a paragraph with punctuation", same text across runs. — [explainx.ai Kokoro guide](https://explainx.ai/blog/kokoro-local-cpu-tts-openai-compatible-guide-2026)

### Inferences
- Sentence length: aim for 8 to 16 words per line, one idea, one or two punctuation breaks. Shorter than 5 words risks the weak short-utterance behaviour; if a punchy fragment is needed ("That's RAG."), attach it to its neighbour with a full stop or dash inside the same string rather than synthesising it alone.
- Contractions: write them ("it's", "you'll", "doesn't"). They are ordinary dictionary words and remove the stiff read-aloud rhythm of "it is" / "does not". Use the uncontracted form only where the stress is the point ("It does [not](+2) guess.").
- Questions: a real question mark gives the one reliably different contour the model has. One question in the hook is a cheap way to vary the melody; do not stack several.
- Emphasis placement: put the word that matters at the end of a clause, just before `,` `—` or `.`. Front-load set-up, end on the payload.
- Commas: each one is a pause token. Use them where a speaker would breathe, delete them where they are only grammatical. An em dash gives a stronger, more conversational break than a comma.
- Numbers: write "five hundred" style in the spoken text when in doubt, and always for 4-digit quantities that are not years ("one thousand five hundred rows", or `1,500`, which the comma handling reads as a cardinal). `500` alone is a normal cardinal.
- Acronyms: decide per term and make it explicit. Spelled: keep `SQL`, `API`, `RAG` and check the printed phonemes; pronounced as a word: use phoneme markup (`[SQL](/sˈikwəl/)`, `[RAG](/ɹˈæɡ/)`) because an acronym that happens to match a dictionary word may be read as that word and an unknown one may be spelled out. This project's existing `tts` field per scene is the right place for the spoken variant.
- Fillers and disfluencies ("um", "uh", "you know"): avoid. The model was trained on mostly neutral, clean speech, so fillers are read as stressed words rather than as natural hesitations (inference from the training-data description; no test found). A conversational feel comes better from "So", "Now", "Here's the thing" openers followed by a comma.
- Avoid symbols, slashes, emoji, URLs and parentheses for asides; write what should be said.
- Exclamation marks: at most one per video; `!` is one of the few energy cues but reads as artificial when repeated.
- Consider `trf=True` only if heteronyms or function-word reductions come out wrong; it needs the larger spaCy model downloaded once and then works offline.

### Gaps
- No author script-writing guidance beyond the punctuation/stress tips and the length notes.
- No first-hand report was found on how Kokoro renders fillers.
- How `RAG`, `SQL`, `API` are actually phonemised by the installed misaki version was not executed here; check the `ps` output locally.

---

## 6. Known artefacts and community workarounds

### Takeaway
The documented artefacts are weak/odd delivery on very short utterances and rushing on long ones; mispronunciations come from G2P, not the acoustic model, and are fixed with phoneme markup. Everything else is handled outside the model (silence insertion, cropping by timestamps, text normalisation).

### Cited Findings
- [AUTHOR-DOC] Weak short utterances (<10-20 tokens): mitigation is to bundle. Rushing on long utterances (>400 tokens): chunk shorter or adjust speed. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [COMMUNITY] Isolated single words can come out with spurious sounds, e.g. "six" as "ah-six-ah"; workaround: wrap in a carrier sentence ("The word is: six") and crop using Kokoro's per-word timestamps, at the cost of flatter intonation. — [explainx.ai Kokoro guide](https://explainx.ai/blog/kokoro-local-cpu-tts-openai-compatible-guide-2026)
- [COMMUNITY] Long chunks near the 510-token limit sound rushed and produce artefacts; wrappers target 175-250 tokens per chunk. — [remsky/Kokoro-FastAPI README](https://github.com/remsky/Kokoro-FastAPI)
- [COMMUNITY] Rushing past paragraph breaks fixed by inserting a short silence between paragraphs; digit-by-digit years fixed by writing numbers as words before synthesis. — [Gepardi-dot/reader-tts PR #78](https://github.com/Gepardi-dot/reader-tts/pull/78)
- [COMMUNITY] Wrapper-level text normalisation can itself remove or alter phrases; Kokoro-FastAPI lets it be disabled with `"normalization_options": {"normalize": False}`. — [remsky/Kokoro-FastAPI README](https://github.com/remsky/Kokoro-FastAPI)
- [COMMUNITY] A project tracks static/crackling at sentence boundaries when concatenating Kokoro chunks. — [ZirekHQ/dengjen-tts issue #305](https://github.com/ZirekHQ/dengjen-tts/issues/305) (title seen in search results only; thread not read)
- [COMMUNITY] A kokoro issue reports failure on very large text combined with the pronunciation helper markup. — [hexgrad/kokoro issue #42](https://github.com/hexgrad/kokoro/issues/42) (title seen in search results only)
- [AUTHOR-CODE] Unknown words are silently skipped if the espeak fallback is unavailable. — [kokoro/pipeline.py](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py)
- [AUTHOR-CODE] `[text](feature)` with an unrecognised feature is ignored (feature set to `None`) and the bracket text is read normally, so a typo in markup fails silently. — [misaki/en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)

### Inferences
- Flat or abrupt line endings: most likely on short lines. Workarounds in order of cost: lengthen the line slightly; end on a content word rather than a function word; try `…` or `—` before the final phrase; bundle with the next line and cut by timestamps; try the `af_heart,af_bella` blend.
- Rushed short sentences: lower speed for that line (0.85 to 0.9) and add a comma where a breath belongs; if still rushed, bundle.
- Mispronunciation: check `ps`, then fix with `[word](/.../)`; do not respell phonetically in plain text unless markup fails, because respellings change the subtitle text if the same string is reused.
- Clicks at joins: when concatenating separately generated lines, add a few milliseconds of fade in/out and explicit silence between lines rather than butt-joining (general audio practice; the linked crackling issue was not read).
- Silent failures to guard against in a build script: missing espeak-ng (words dropped), malformed markup (ignored), a newline inside a line (split into two utterances). A one-line check that the printed `gs` for each line equals the intended text catches all three.
- Because output is deterministic, an A/B harness over a fixed set of lines (voice mix, speed, punctuation variant) is cheap and is the only reliable way to choose, since none of the audible effects above are quantified by the author.

### Gaps
- No author-maintained list of known artefacts beyond the two length notes in VOICES.md.
- "Flat endings" as a named artefact was not found in a first-hand source; it is treated here as a manifestation of the documented short-utterance weakness.
- Crackling-at-boundaries and large-text-with-markup issues were identified by title only; details and resolutions were not read.
- HF discussion threads (the main venue for community tips on this model) are no longer accessible, which limits first-hand community evidence.
