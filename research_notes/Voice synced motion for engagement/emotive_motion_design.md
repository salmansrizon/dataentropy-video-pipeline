# Emotive motion design: expressing voiceover emotion and emphasis through motion (no on-screen character)

Reader notes on evidence quality:
- "Primary" = fetched from the publisher's own page. "Snippet" = taken from a search-result summary only, the page itself could not be fetched (m3.material.io and developer.apple.com are JS-rendered, bbc.co.uk and the Utrecht repository blocked the fetch, the CMU Kinedit PDF came back as undecodable binary). Snippet-level items should be re-checked before being quoted verbatim in a published report.
- Frame conversions (ms to frames at 30 fps) are my arithmetic, not from the sources, and sit under Inferences.
- Brand limits used for conflict flags: smooth and purposeful, no bounce, no rapid flashing, at most three focal points, elements must not "pop" in by scaling or rising.

## 1. What established motion systems say about emphasis and emotion (Material, Apple HIG, IBM Carbon, Disney's 12 principles)

### Takeaway
All three design systems split motion into a quiet "utility/productive" register and a louder "emphasized/expressive" register, and reserve the louder one for a few significant moments; that two-register idea maps directly onto calm narration versus stressed words. Material 3 Expressive's headline feature (spring overshoot) conflicts with the no-bounce brand rule, but its own "effects" springs (colour, opacity) are specified with no overshoot and are brand-compatible.

### Cited Findings
- Carbon defines two styles. Productive: "creates a sense of efficiency and responsiveness, while remaining subtle and out of the way", for moments needing task focus. Expressive: "delivers enthusiastic, vibrant, and highly visible movement", reserved for significant moments such as opening a new page or a primary action. (Primary) — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Carbon easing curves. Productive: standard `cubic-bezier(0.2, 0, 0.38, 0.9)`, entrance `cubic-bezier(0, 0, 0.38, 0.9)`, exit `cubic-bezier(0.2, 0, 1, 0.9)`. Expressive: standard `cubic-bezier(0.4, 0.14, 0.3, 1)`, entrance `cubic-bezier(0, 0, 0.3, 1)`, exit `cubic-bezier(0.4, 0.14, 1, 1)`. None overshoot. (Primary) — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Carbon duration tokens: fast-01 70 ms (button/toggle), fast-02 110 ms (fades), moderate-01 150 ms (small expansion, short movement), moderate-02 240 ms (expansion, toast), slow-01 400 ms (large expansion, key alerts), slow-02 700 ms (background dimming). (Primary) — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Carbon on restraint: "The best interface motion may go unnoticed, because it often keeps users engaged with their tasks." (Primary) — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Material easing tokens (from the official Material Components Android motion doc, which mirrors the M3 spec): Standard `cubic-bezier(0.2, 0, 0, 1)` for "utility focused animations that begin and end on screen"; Standard Decelerate `cubic-bezier(0, 0, 0, 1)` for entering; Standard Accelerate `cubic-bezier(0.3, 0, 1, 1)` for exiting; Emphasized (a two-segment path, `M 0,0 C 0.05,0, 0.133333,0.06, 0.166666,0.4 C 0.208333,0.82, 0.25,1, 1,1`) for "common, M3-styled animations that begin and end on screen"; Emphasized Decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)` for entering; Emphasized Accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)` for exiting; Linear for "simple, non-stylized motion". (Primary, GitHub) — [Material Components Android, Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- Material duration tokens: Short 50/100/150/200 ms; Medium 250/300/350/400 ms; Long 450/500/550/600 ms; Extra Long 700/800/900/1000 ms. Selection rule: "Duration should increase as the area/traversal of an animation increases." (Primary, GitHub) — [Material Components Android, Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- Material 3 spring tokens separate "spatial" (position) from "effects" (colour, opacity). Spatial: damping 0.9, stiffness 1400 (fast) / 700 (default) / 300 (slow). Effects: damping 1.0, stiffness 3800 / 1600 / 800. Speed is chosen by component size or distance covered. (Primary, GitHub) — [Material Components Android, Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- Material 3 Expressive has two motion schemes, "expressive" and "standard"; the expressive scheme "overshoots the final values to add bounce" and is recommended for hero moments and key interactions. Effects springs are for colour and opacity "where there shouldn't be any overshoot". (Snippet) — [Material 3 blog, Adding Motion Physics](https://m3.material.io/blog/m3-expressive-motion-theming); [M3 Motion overview](https://m3.material.io/styles/motion/overview/how-it-works)
- Apple HIG: "Add motion purposefully, supporting the experience without overshadowing it. Don't add motion for the sake of adding motion. Gratuitous or excessive animation can distract people or make them feel disconnected." Also: brief, precise feedback animation "tends to feel lightweight and unobtrusive, and can often convey information more effectively than prominent animation." (Snippet) — [Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Disney's 12 principles come from Johnston and Thomas, The Illusion of Life (1981): squash and stretch, anticipation, staging, straight-ahead/pose-to-pose, follow-through and overlapping action, slow in and slow out, arcs, secondary action, timing, exaggeration, solid drawing, appeal. (Secondary explainer) — [Bloop Animation](https://www.bloopanimation.com/the-12-principles-of-animation/)
- Staging as applied to motion graphics (practitioner framing): "directing the viewer's attention to what matters ... not animating everything at once, but isolating the key element and letting it move, then bringing in the supporting pieces." Anticipation: a small movement that precedes and signals a larger one. Exaggeration: pushing an action past strict realism so it reads clearly. (Secondary explainers, practitioner advice) — [Superside](https://www.superside.com/blog/12-principles-of-animation); [Pluralsight](https://www.pluralsight.com/resources/blog/software-development/understanding-12-principles-animation)

### Inferences
- Two-register mapping for narration: calm explanatory lines use the "standard/productive" register (short, symmetric ease-in-out or plain decelerate, 150 to 400 ms); a stressed word, the hook and the payoff use the "emphasized/expressive" register (a stronger decelerate such as `cubic-bezier(0.05, 0.7, 0.1, 1)` or Carbon's `cubic-bezier(0, 0, 0.3, 1)`, 400 to 700 ms). The existing brand curve `cubic-bezier(0.22, 1, 0.36, 1)` is already in the expressive-decelerate family, so the "calm" register is what the videos would need to add.
- BRAND CONFLICT: Material 3 Expressive spatial springs (damping 0.9, overshoot) and any "squash and stretch" or elastic follow-through violate "no bounce". Brand-safe substitutes: damping 1.0 (critically damped) effects-style springs, or bezier curves with no control point above 1.
- BRAND CONFLICT: classic anticipation (a dip before a move) and exaggeration by scale both read as a "pop". A brand-safe anticipation is a non-spatial pre-cue: dim the surroundings or start the camera drift 6 to 10 frames before the element changes.
- Follow-through and overlapping action translate, without bounce, into stagger: child elements (table rows, code lines) finish slightly after their container rather than overshooting.
- Material's rule that duration grows with distance travelled gives a principled way to keep big camera moves slow and small highlights quick without them feeling inconsistent.

### Gaps
- m3.material.io and developer.apple.com pages could not be fetched (JS-rendered). M3 token values come from Google's own Android component docs; M3 Expressive and HIG wording is snippet-level. I could not confirm HIG wording on "realism" or "optional motion / Reduce Motion".
- None of these systems addresses narration or voice-sync; they are UI guidance. Applying them to explainer video is inference.
- No authoritative source found that formally adapts the 12 principles to character-free motion graphics; available material is blog-level.

## 2. Research on how motion parameters convey affect (speed, smoothness, amplitude, direction)

### Takeaway
The robust finding is that speed drives perceived arousal (faster = more aroused/urgent) and that smooth, continuous paths read as calm and positive while abrupt, angular or asynchronous motion reads as tense or threatening; the link between speed and valence is contested. This supports using tempo, not shape distortion, as the main emotional dial.

### Cited Findings
- A 2025 review of design features and emotion (valence/arousal/dominance) reports, citing Lockyer and Bartram (2012), that smooth linear motion paths promote calmness and positive valence while sharp angular movements evoke arousal, dominance and perceived threat; faster motion raised urgency/threat and slower motion fostered relaxation. — [Emotion-Aware Design review, arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- The same review cites Wollner et al.: slow-motion video increased emotional valence versus real-time playback (reported F(1,39)=10.65, p<.01), and slow, linear motion reduced physiological arousal markers. — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- The same review cites Yoo and Kim (2005): high-frequency animation (more than once per 10 seconds, in web banner ads) raised arousal and lowered attitude toward the content. — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- Speed and valence are contested: fast-moving objects are consistently associated with higher arousal, but one study links fast movement to positive affect while others indicate the opposite. (Snippet) — [Affective visualization in VR: integrative review, arXiv 2012.08849](https://arxiv.org/pdf/2012.08849)
- Aesthetic judgment: participants liked movement smoothness and synchrony and disliked abruptness and asynchrony. (Snippet) — [Psychological Research 2025, "Aesthetic judgment of apparent motion"](https://link.springer.com/article/10.1007/s00426-025-02232-y)
- Cross-cultural study of abstract geometric animations for wearables: both cultural groups associated faster speeds with higher arousal. (Snippet) — [arXiv 2605.11668](https://arxiv.org/html/2605.11668)
- Colour and affect (same 2025 review): higher saturation raises arousal; cool hues (blue) map to high valence and low arousal (calm, trust); warm red to high arousal; high brightness to higher valence; grey to low arousal and low valence. — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- Shape (same review, citing Plass et al. 2014): round shapes increased positive affect and improved comprehension (reported d=0.48); angular shapes raise arousal and capture attention. — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)

### Inferences
- Speech-to-motion mapping suggested by this evidence: calm explanation = slow, smooth, linear or gently eased motion and lower saturation; rising excitement = shorter durations and tighter stagger (higher tempo) plus a step up in saturation toward brand violet, while keeping paths smooth; surprise = a single clear discontinuity in tempo (a hold, then one quick, smooth change) rather than a jerky path.
- Because jerk and asynchrony are disliked and read as threat, "energy" for this brand should come from tempo and from how many things change, never from shake, jitter or angular paths. This aligns with the brand's "smooth, purposeful" rule.
- The Yoo and Kim finding (frequent animation lowers attitude) supports rationing emphasis events; it was measured on banner ads, so the 10-second figure should not be transferred literally to a narrated explainer.
- The brand palette (navy, violet, lavender; no red/orange) sits on the cool, high-valence, low-arousal side, so arousal has to be modulated by saturation and brightness (lavender to electric purple) rather than hue.

### Gaps
- I did not read Lockyer and Bartram (2012) or Wollner et al. directly; statistics above are as relayed by the review and by an automated extraction of it. The extraction quoted speeds of "12 px/s" and "4 px/s", which look implausibly slow for screen motion; treat specific numbers as unverified.
- No study found that measures perceived affect of easing curves specifically (ease-out versus ease-in-out) or of amplitude in abstract shape motion.
- Heider-Simmel-style animacy work was not retrieved; no citable finding on it here.
- No study found on motion direction (up/down, toward/away) and valence for abstract graphics.

## 3. Kinetic typography and captions that follow speech prosody; readability limits

### Takeaway
HCI research (Carnegie Mellon, 2002-2006) established that animated text can consistently convey tone of voice and emotion, using mappings such as loudness to size/weight and rising pitch to upward movement. Captioning standards cap reading speed at roughly 17 to 20 characters per second with a minimum display of about 5/6 of a second, which bounds how fast word-group reveals can go.

### Cited Findings
- Lee, Forlizzi and Hudson's Kinetic Typography Engine paper states that kinetic typography can be effective in conveying a speaker's tone of voice, qualities of character, and affective qualities of text. (Snippet; paper link is primary) — [Lee, Forlizzi, Hudson, "The Kinetic Typography Engine" (UIST 2002)](http://johnnylee.net/kt/dist/files/Kinetic_Typography.pdf)
- Documented mappings in the kinetic typography literature: rising pitch at the end of a question mimicked by upward movement of the final word; loudness expressed by changes in type size and weight; bolding, pacing and size change used to portray a loud, urgent voice versus a calmer utterance. (Snippet, secondary summary) — [Wikipedia, Kinetic typography](https://en.wikipedia.org/wiki/Kinetic_typography); [Forlizzi, Lee, Hudson, "The Kinedit System" (CHI 2003)](http://www.cs.cmu.edu/~johnny/academic/Kinedit_CHI2003.pdf)
- A prosody-to-type mapping reported in related work: loudness to font weight, pitch to baseline shift, duration to letter-spacing. (Snippet; original paper not identified with certainty) — [search summary citing closed-caption voice visualisation work](https://www.researchgate.net/publication/344850613_Visualizing_Voice_Characteristics_with_Type_Design_in_Closed_Captions_for_Arabic)
- Lee, Jun, Forlizzi and Hudson (2006): three designers prepared 24 kinetic examples expressing four emotions; 66 participants rated them quite consistently, showing designers can make kinetic effects that reliably convey emotion. (Snippet) — [Lee et al., "Using kinetic typography to convey emotion in text-based interpersonal communication" (DIS 2006)](https://www.researchgate.net/publication/221441498_Using_kinetic_typography_to_convey_emotion_in_text-based_interpersonal_communication)
- Reported palette of emotive text motions in that literature: shaking, twisting, fading, bouncing, looping, jitter and flashing conveying anger, sadness, happiness, fear. (Snippet) — [Communicating emotion with animated text](https://www.researchgate.net/publication/240697270_Communicating_emotion_with_animated_text)
- Netflix English timed-text guide: reading speed up to 20 characters per second for adult programmes, up to 17 for children's; 42 characters per line; two lines maximum; italics allowed for emphasis only when punctuation cannot convey it. (Primary) — [Netflix English Timed Text Style Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-Timed-Text-Style-Guide)
- Netflix timing rules: minimum duration 5/6 of a second per subtitle event (20 frames at 24 fps), maximum 7 seconds, minimum 2-frame gap between events. (Snippet, third-party summary; the fetched style guide defers these to a separate Netflix timing document) — [Gotham Lab summary of Netflix requirements](https://www.gothamlab.com/netflix-subtitle-delivery-requirements-complete-guide/)
- BBC guidance is commonly summarised as 160 to 180 words per minute; a general rule of thumb elsewhere is 12 to 14 characters per second. (Snippet, third-party) — [Closed Caption Creator, subtitle reading speed](https://www.closedcaptioncreator.com/blog/articles/subtitle-reading-speed.html)

### Inferences
- Brand-safe prosody mappings for captions: stressed word = colour change to the highlight colour and/or a weight step (SemiBold to Bold), not a scale-up; question = keep the final word highlighted and hold slightly longer rather than moving it upward (upward movement is a "rise"); pause in speech = no new caption group and no new motion.
- BRAND CONFLICT: most of the emotive kinetic-typography vocabulary in the research (shaking, bouncing, jitter, flashing, sudden size jumps) is prohibited by the brand. Only fading, colour, weight and timing remain. The research shows these parameters carry emotion, but not how much is lost when restricted to that subset.
- Scaling the stressed word is explicitly the kind of "pop by scaling" the brand forbids. If any size emphasis is used, it should be flagged for brand sign-off.
- The videos' target narration rate (135 to 155 wpm) is below the 160 to 180 wpm caption guidance, so captions synced to the voice are within readability limits. At 20 cps, a 3-word group of about 18 characters needs about 0.9 s; 0.83 s (25 frames at 30 fps) is the floor for any caption event. Groups shorter than that should be merged.
- Timing word reveals to word onsets rather than syllables is sufficient: the standards speak of events of at least 5/6 s, far coarser than syllables (my inference; no source compares syllable-level against word-level sync).

### Gaps
- The CMU Kinedit PDF could not be parsed and BBC's subtitle guidelines page could not be fetched, so the precise mappings and the BBC figures are snippet-level. BBC primary source to check: bbc.co.uk/accessibility/forproducts/guides/subtitles.
- No peer-reviewed study found on word-by-word ("karaoke") caption highlighting and comprehension or engagement in short vertical video.
- No source found giving a minimum per-word display time for word-by-word reveals.
- No evidence found that weight or colour emphasis on the stressed word improves recall of that word.

## 4. Audio-reactive techniques (voice loudness/pitch, music beat)

### Takeaway
I found tooling for audio-reactive motion but no reliable evidence on whether driving visuals from a voice's loudness envelope helps or distracts. On the evidence available it should be treated as an optional, heavily smoothed secondary cue, with word-timing-driven emphasis as the primary mechanism.

### Cited Findings
- Remotion provides `useAudioData()` / `getAudioData()` in `@remotion/media-utils` to load audio for per-frame use, `visualizeAudio()` for frequency-spectrum values (low frequencies on the left of the returned array), and `visualizeAudioWaveform()`, which the docs describe as suitable for visualising voice whereas `visualizeAudio()` is for music. `useWindowedAudioData()` also exists. (Snippet of official docs) — [Remotion: visualizeAudio()](https://www.remotion.dev/docs/visualize-audio); [useAudioData()](https://www.remotion.dev/docs/use-audio-data); [Audio visualization guide](https://www.remotion.dev/docs/audio/visualization)
- Lip-sync tolerance standard ITU-R BT.1359-1: asynchrony becomes detectable outside +45 ms (audio leading) to -125 ms (audio lagging), and unacceptable outside +90 ms to -190 ms. The thresholds were derived from newsreader clips. — [arXiv 2212.01686, citing ITU-R BT.1359-1](https://arxiv.org/html/2212.01686v1)
- Frequent animation raised arousal but lowered attitude toward content in banner-ad research (Yoo and Kim 2005, as reported in a review). — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- Decorative animation acts as a seductive detail, a source of extraneous cognitive load that impairs recall. — [Advances in Physiology Education, "Decorative animations impair recall"](https://journals.physiology.org/doi/full/10.1152/advan.00102.2019)

### Inferences
- Audio-reactivity is likely to help when it is (a) attached to the element currently being discussed, so it works as a signalling cue, (b) low amplitude and low-pass filtered so it follows phrase-level energy, not syllables, and (c) on a non-spatial property such as glow opacity. It is likely to distract when it is global, when it tracks every syllable (which at speech rates of 4 to 6 syllables per second approaches "rapid flashing"), or when it moves or scales elements. This is reasoning from the seductive-details and signalling evidence, not a measured result.
- BRAND CONFLICT: a beat-synced or syllable-synced pulse risks "rapid flashing"; scale pulses conflict with "no pop by scaling". If used, restrict to a glow opacity varying within a narrow band and smoothed over roughly 200 to 300 ms (my suggestion, not sourced).
- Sync budget: with visible speech, audio lagging the picture by up to about 125 ms goes unnoticed while audio leading by more than about 45 ms is noticed. For character-free graphics a cautious reading is: let a visual emphasis land on or up to about 3 frames before the stressed word's onset, and never later than about 1 frame after it (at 30 fps, 45 ms is about 1.4 frames and 125 ms about 3.75 frames). The standard was measured on lip-sync, so transfer to abstract graphics is an assumption.
- Music beat is better used at edit level (scene changes and major reveals placed on beats) than as a continuous driver. No source found for this; it is practitioner common sense and should be labelled as such.

### Gaps
- No peer-reviewed or reputable practitioner source found on voice-envelope-driven motion in explainers, on pitch-driven visuals, or on when audio-reactivity distracts. This is a real gap, not an oversight in summarising.
- Remotion API details are from search snippets of the docs; signatures and current behaviour should be checked against the installed version before implementation.
- No source found comparing voice-reactive camera drift against constant drift.

## 5. Staging and attention: cueing in sync with narration

### Takeaway
This is the best-evidenced area: signalling (highlighting what the narration refers to) reliably improves learning with small-to-medium effects, and presenting narration simultaneously with the corresponding visual has a large effect. Decorative motion that carries no information measurably harms recall.

### Cited Findings
- Signalling (cueing) principle: multimedia material is more effective when cues guide attention to the relevant elements or highlight the organisation of the material. — [van Gog, "The Signaling (or Cueing) Principle in Multimedia Learning", Cambridge Handbook chapter](https://dspace.library.uu.nl/bitstream/handle/1874/424007/the_signaling_or_cueing_principle_in_multimedia_learning.pdf?sequence=1)
- Meta-analysis (Alpizar, Adesope and Wong 2020): 44 effect sizes from 29 studies, 2,726 participants; signalling increased learning outcomes, d = 0.38; the effect was moderated by study, participant and presentation features. — [Educational Technology Research and Development](https://link.springer.com/article/10.1007/s11423-020-09748-7)
- Meta-analysis (Schneider, Beege, Nebel and Rey 2018): positive effects of signalling on retention (g+ = 0.53) and transfer (g+ = 0.33). (Snippet) — [van Gog chapter](https://dspace.library.uu.nl/bitstream/handle/1874/424007/the_signaling_or_cueing_principle_in_multimedia_learning.pdf?sequence=1)
- Meta-analysis of signalling text-picture relations (Richter, Scheiter and Eitel 2016): small-to-medium effect favouring signalled material for transfer and comprehension, moderated by prior knowledge, with the benefit mainly for low-prior-knowledge learners. (Snippet) — [Educational Research Review](https://www.sciencedirect.com/science/article/abs/pii/S1747938X15000664)
- Type of signal matters: text-based signals produced larger effects than picture-based signals in the 2020 meta-analysis. (Snippet) — [Alpizar et al. 2020](https://link.springer.com/article/10.1007/s11423-020-09748-7)
- Temporal contiguity: students who received narration simultaneously with animation outperformed those who received narration before the animation on transfer (Mayer and Anderson 1991, 1992); the principle was supported in 9 of 9 tests with a median effect size of 1.22. (Snippet) — [Mayer and Fiorella chapter on reducing extraneous processing](https://www.researchgate.net/publication/262915119_Principles_for_reducing_extraneous_processing_in_multimedia_learning_Coherence_signaling_redundancy_spatial_contiguity_and_temporal_contiguity_principles); [Moreno and Mayer 1999](https://www.davidlewisphd.com/courses/EDD8121/readings/1999-MorenoMayer.pdf)
- Seductive details: irrelevant interesting additions reduce learning; a recent multi-level meta-analysis reports g = -0.19 (comprehension), -0.17 (recall), -0.12 (transfer). (Snippet) — [Educational Psychology Review 2025](https://link.springer.com/article/10.1007/s10648-025-10099-z)
- Decorative animations specifically impaired recall and added extraneous load, with effects larger than the mean seductive-details effect (-0.33) reported by Sundararajan and Adesope. — [Advances in Physiology Education](https://journals.physiology.org/doi/full/10.1152/advan.00102.2019)

### Inferences
- The main lever for "voice and picture feel like one delivery" is semantic sync: when the voice names a column, row or keyword, that element is cued at that moment, and nothing else changes. Cue types that fit the brand: dim non-relevant elements (the brand's dimmed colour #D6D2E0), colour the target violet, a soft glow, an arrow or underline that draws on, a slow camera push-in.
- Because text-based signals outperform picture-only ones, highlighting the same key word in the caption and in the code/table at the same time is likely the highest-value emphasis; it is also purely colour, so it has no brand conflict.
- The audience (SQL/AI learners, likely low prior knowledge) is the group that benefits most from signalling.
- "At most three focal points" is consistent with this evidence: every extra moving element that is not the thing being spoken about is a candidate seductive detail.
- Any audio-reactive or ambient motion must either carry information or be near-imperceptible, given the decorative-animation result.

### Gaps
- The van Gog chapter could not be fetched (HTTP 403); its content is from snippets. Unverified from the chapter: eye-tracking results, and the reported pattern that cues can guide attention without always improving learning.
- No study found that isolates cue-onset timing relative to the spoken word (for example cue leads by 200 ms versus coincident versus lags).
- No study found comparing cue types (spotlight versus dimming versus zoom versus arrow) in short-form vertical video.
- The 9-of-9 and 1.22 figures compare simultaneous with fully successive presentation, a much grosser misalignment than a few frames; they justify sync in principle, not a frame tolerance.

## 6. Emotional arc in a 60-second explainer (hook, tension, explanation, payoff)

### Takeaway
I found no empirical source that prescribes an intensity curve for a 60-second explainer; the arc guidance below is inference built from the affect findings (tempo raises arousal, smoothness and slowness calm, saturation raises arousal) and the design systems' two-register model.

### Cited Findings
- Carbon reserves expressive motion for significant moments and productive motion for task focus. — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Material 3 positions its expressive scheme for "hero moments and key interactions". (Snippet) — [Material 3 blog](https://m3.material.io/blog/m3-expressive-motion-theming)
- Faster motion is associated with higher arousal; smooth, slow, linear motion with calm; higher saturation with higher arousal; frequent animation with lower attitude toward content. — [arXiv 2502.16038](https://arxiv.org/html/2502.16038v3)
- Apple HIG: gratuitous or excessive animation can distract people or make them feel disconnected. (Snippet) — [Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

### Inferences
- Suggested arc (unsourced synthesis, to be validated by review):
  - Hook (question or surprise): expressive register, one focal point, quick single reveal then a clear hold; saturated violet on the key word.
  - Tension/problem: tempo slightly up, tighter stagger, more elements dimmed; still smooth paths.
  - Explanation (longest section): productive register, slowest tempo, lowest saturation, camera nearly still, one cue per spoken term.
  - Payoff: return to the expressive register once, the largest camera move or the fullest colour, then a hold.
  - CTA: calm, static, one focal point.
- Contrast is what makes emphasis legible: if the explanation section already uses the expressive curve and long durations everywhere, the payoff has nowhere to go. The existing convention of using the brand ease-out for everything that enters leaves little headroom; a quieter register for routine reveals would create it.
- Under the brand limits, intensity should be scaled with three dials only: tempo (duration and stagger), number of simultaneously changing elements (1 to 3), and colour saturation/brightness.

### Gaps
- No peer-reviewed or recognised teaching source found with checkable guidance on pacing arcs for 60-second explainers. School of Motion, Motion Design School and Ben Marriott material was not surfaced by search with specific, checkable numbers.
- No retention or engagement data found linking motion intensity to watch-through in short vertical educational video.

## 7. Concrete parameter ranges (holds, stagger, camera, emphasis duration)

### Takeaway
Citable numbers exist for durations, easing curves, caption timing and audio-visual sync tolerance; I found no citable practitioner figures for stagger offsets, camera travel, or emphasis length relative to a word, so those rows below are labelled as derived suggestions.

### Cited Findings
- Duration ladders: Material 50 to 1000 ms in 16 steps, growing with area/distance travelled; Carbon 70, 110, 150, 240, 400, 700 ms. — [Material Components Android, Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md); [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Carbon assigns 700 ms to background dimming and 110 ms to simple fades. — [IBM Carbon, Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Caption floor and ceiling: minimum 5/6 s per event, maximum 7 s, minimum 2-frame gap (third-party summary of Netflix); 17 to 20 characters per second maximum reading speed (Netflix primary). — [Gotham Lab summary](https://www.gothamlab.com/netflix-subtitle-delivery-requirements-complete-guide/); [Netflix English Timed Text Style Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-Timed-Text-Style-Guide)
- Audio-visual sync: detectable outside +45 ms audio-lead to -125 ms audio-lag; unacceptable outside +90 ms to -190 ms (ITU-R BT.1359-1, speech/lip-sync). — [arXiv 2212.01686](https://arxiv.org/html/2212.01686v1)
- Stagger/offset is described qualitatively as revealing similar elements one after another to create rhythm and grouping; no numeric guidance in the source. (Practitioner advice) — [SVGator, Offset and delay in motion design](https://www.svgator.com/blog/offset-delay-motion-design/)

### Inferences
Conversions at 30 fps (1 frame = 33.3 ms) and derived working values. Everything in this table is my derivation unless a source is named above.

| Parameter | Derived working value at 30 fps | Basis |
|---|---|---|
| Calm-register transition | 5 to 12 f (150 to 400 ms) | Material Short3 to Medium4; Carbon moderate/slow-01 |
| Emphasized-register transition | 12 to 21 f (400 to 700 ms) | Material Long/ExtraLong1; Carbon slow-01/slow-02 |
| Large camera move | 21 to 30 f or more (700 to 1000 ms+) | Material ExtraLong; "duration increases with distance" |
| Dim surroundings for a spotlight | about 21 f (700 ms); quicker fade-back | Carbon slow-02 for background dimming |
| Colour-only word highlight | 3 to 6 f (110 to 200 ms) | Carbon fast-02 for fades; Material Short |
| Minimum caption group on screen | 25 f (0.83 s) | Netflix minimum 5/6 s |
| Emphasis landing versus stressed-word onset | land between 3 f early and 1 f late | ITU-R BT.1359 detectability window, transferred from lip-sync |
| Start of a 12 f emphasis transition | begin about 10 to 12 f before the word onset so the eased motion visually completes as the word is spoken | follows from the row above with a decelerating curve |
| Emphasis hold | at least the duration of the stressed word, and not released until the phrase ends | no source; follows the signalling logic |
| Stagger between sibling elements | suggest 2 to 4 f, tighter for excitement, wider for calm | no numeric source found |
| Camera push-in for emphasis | suggest a small scale change over 20 f or more with ease-in-out | no numeric source found |
| Motion during a spoken pause | none; hold | no direct source; consistent with temporal contiguity |

- BRAND CONFLICT flags on parameters: any emphasis implemented as a scale change on the element (as opposed to a camera move on the whole scene) is a "pop by scaling"; any entrance that translates upward is a "rise". Fade plus colour, masked wipes, line-draws and camera moves are the compliant vocabulary. Note that the workspace's existing documented convention (cards fade and rise 24 px, grow from 0.96 scale) is at odds with the brand limits as stated for this task; the report writer should surface that for a decision.

### Gaps
- No checkable practitioner numbers found for stagger, camera travel distance or scale, or emphasis duration relative to word length (School of Motion, Motion Design School, Ben Marriott searches returned nothing specific). The table's last rows are suggestions to be tuned by eye and by the existing motion-review step.
- The Netflix minimum-duration figure is from a third-party summary; the primary Netflix timing document was not fetched.
- The sync window is from a lip-sync standard; no equivalent for abstract graphics was found.
