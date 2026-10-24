# Fig 11 · Turret spectrophotometer: truth table

Paper: *Binary Context Sufficiency in Hidden States: Dissociating Sufficiency from Correctness in Fixed-Question, Changed-Context Multi-Hop QA* (PDF `public/papers/binary-evidence-sufficiency-dissociation.pdf`). The repo's `reports/` holds only run manifests with no metrics, and its README repeats Table 1, so the PDF is the source for every number. Every number lives in `data.mjs`. The readout and the screen-reader sentence (`model.mjs`), and the caption and the legend (`art.mjs`), all read it from there.

## The object

The object is a single-beam spectrophotometer on a heavy bench. A lamp housing with a vented chimney feeds a grating monochromator. From the monochromator's lens a fixed beam runs at one height across the open sample compartment, through the clear upper part of one cuvette, and into a turned detector can. The can is held in two clamp bands on saddle-cut posts. The beam is the one HotpotQA question, held fixed. The compartment holds a four-position turret, and each cuvette is one context variant of that question: cell 1 sufficient, cell 2 sufficient-noisy, cell 3 missing, cell 4 misleading. Indexing the turret (arrows, 1–4, or a click on it) turns the notched disc a quarter turn, and a spring detent plunger drops into the next notch. Only the cuvette in the beam is lit, and the beam is drawn only while a cuvette sits in the detent. The question never moves and only its context changes, which is the paper's fixed-question, changed-context design.

The detector stands for the linear probe on Qwen2.5-7B-Instruct hidden states. Its electronics box carries two lamps that show the binary target of the cell in the beam: green for the two sufficient cells, red for the two insufficient ones. They are named as the target in the legend, the readout and the status line ("target insufficient"). They are not a per-cell reading of the probe. The probe's measured quantity is the AUROC in the readout, taken over the whole test subset.

Three controls change what the readout reports. None of them changes which cell is in the beam.

- **Read point.** The wavelength drum on the monochromator has three detents (prompt end, step 1, step 2), and its index slides along the ruled scale strip. On a real instrument the drum sets where in the spectrum the reading is taken. Here it sets where in the forward pass the hidden state is read.
- **Subset.** A three-position slide lever on the detector box selects closed-book-negative (CBN), correct-only or wrong-only test questions.
- **Title masks.** A four-arm mask spider is parked on the turret's centre post, under the knob. M, or a click on the spider, slides it down the post in one stroke, and its four caps seat on all four cuvettes at once: title masking removes page titles from every context. The spider rides the turret when it indexes. M again lifts it. The turret and the spider never move at the same time.

The readout has two lines:

- Line 1 is the measured quantity and its scope: read point · subset (prefixed "masked" once the caps are seated) · AUROC. A combination the paper does not report reads "n/r", which the legend defines.
- Line 2 is the cell in the beam and its target, for example "cell 3 · missing · target insufficient". While parts move it reads "turret indexing", "lowering title masks" or "lifting title masks".

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| Model | Qwen2.5-7B-Instruct | legend (detector), caption, screen-reader label | Abstract; §3.2, primary run |
| Context variants | sufficient (clean), sufficient-noisy, missing, misleading | 4 cuvettes; readout line 2 ("sufficient", "suff. noisy", "missing", "misleading"); legend; caption | §3.1 (1)–(4): both supporting paragraphs with easy distractors; both with harder distractors; one supporting paragraph replaced by a distractor; one replaced by a high-overlap near-miss |
| Binary target | sufficient = clean + noisy; insufficient = missing + misleading | green lamp for cells 1–2, red for cells 3–4; "target sufficient / insufficient" in readout and status line; legend | §1 ("two sufficient variants (clean and noisy)"); §3.1 reframing ("with Missing and Misleading merged"); Figure 1 ("Insufficient = Missing + Misleading") |
| Read points | PROMPT_END, STEP1_END, STEP2_END | 3 drum detents and scale index; readout "prompt end / step 1 / step 2" | §3.2 anchors |
| Main subset | closed-book-negative: questions the model cannot answer from the question alone | lever position 1; readout "CBN"; defined in the caption | §3.3 |
| CBN AUROC, prompt end | 0.958 | readout at rest; caption | Table 1, prompt-end probe; §4.2 |
| CBN AUROC, step 1 | 0.951 | readout | Table 1, step-1 probe; §4.2 |
| CBN AUROC, step 2 | 0.952 | readout; caption | Table 1, step-2 probe; §4.1; abstract |
| Correct-only AUROC | 0.979 at prompt end and at step 2 | readout (lever position 2); caption (step 2) | Table 1, correct-only column; §4.1 |
| Wrong-only AUROC | 0.956 at prompt end, 0.939 at step 2 | readout (lever position 3); caption (step 2) | Table 1, wrong-only column; §4.1 |
| Step-1 correct-only and wrong-only | not reported (Table 1 shows "—") | readout "n/r" | Table 1 |
| TF-IDF lexical baseline | 0.815 | caption | Table 1; §4.1; defined in §3.4 |
| Correctness probe (step 2) | 0.809 | caption | Table 1; §4.1 |
| Question-only answerability control | 0.500 | caption | Table 1; §4.1 |
| Title-masked AUROC, step 2 | 0.936 | readout with the spider seated (step 2, CBN); caption | §5.1; Table A2, title-masked row; abstract |
| Title-masked AUROC, prompt end | 0.949 | readout with the spider seated (prompt end, CBN) | §5.1 ("0.949 vs. 0.936"); Table A2, title-masked row |
| Title-masked correct-only / wrong-only, step 2 | 0.959 / 0.934 | readout with the spider seated (step 2, lever 2 / 3) | §5.1; Table A2, title-masked row |
| Title-masked step 1, and title-masked prompt-end subsets | not reported | readout "n/r" | §5.1 and Table A2 report only the values above |
| Title-masked TF-IDF baseline | 0.762 | stored in `data.mjs`, not shown | §5.1; Table A2 |
| Missing-vs-misleading AUROC, three-way probe | 0.576 / 0.543 / 0.505 (prompt end / step 1 / step 2) | caption only (0.505, attributed to the three-way probe at step 2). The red lamp is not this number: it shows the binary target, which merges cells 3 and 4 by definition (§3.1) | Table A1, missing/misleading column; §4.3 |
| Retained groups | 2,006 groups, 8,024 variants; 1,242 train / 376 val / 388 test | stored in `data.mjs`, not shown | §3.5; Table A3, primary row |

The DeepSeek-R1-Distill-Qwen-7B replication (§5.2) is not drawn. The figure shows the primary run only.

## Drawn, not data

- The lamps show the binary target of the cell in the beam, the label the probe is trained against. The readout AUROC says how well the probe ranks sufficient above insufficient over the whole test subset. The figure does not simulate individual examples, so indexing the turret changes line 2 and the lamp but not the AUROC, which is a test-set number.
- Turret angles, the detent notch, the plunger stroke, the beam shutter, drum angles, lever travel, the spider's stroke and every timing are mechanism, not measurements.
- Cuvette, holder and cap sizes, the meniscus line and the beam height carry no data.
- The mark AU-11 on the label plate is the catalogue maker's mark.

## Parts

About 105 distinct parts (101 drawn solids), grouped as follows:

- **Base:** plate on 4 feet (the far one recorded, hidden by the plate), groove, 4 corner screws in rings, label plate (AU-11, 3 rule lines, 2 screws), ruler strip with ticks and 2 screws.
- **Lamp:** plinth; case with a cap seam level with the monochromator top, 8 screws, 7 front vents and 7 side vents; socket disc with a ribbed cap; chimney (neck, banded body, cap).
- **Monochromator:** plinth; case with seam and 4 screws; grating access plate with inner frame and 4 screws; exit port (flange with 6 bolts, tube, lens collar and lens); wavelength drum (skirt with ticks and 3 detent marks, knurled knob, pointer); ruled scale strip with ticks and 2 screws; index slider with hairline; knurled slit thumb screw.
- **Compartment:** floor plate; deck block with seam and 2 screws; 4 rim walls; open lid (gasket channel, 4 screws, latch tongue, pull handle on 2 posts, screwed side cover plate); 2 hinges, each a leaf with 2 screws and a three-knuckle pin; front catch; drain spout with lip and bore; turret bearing flange and spindle (recorded, hidden under the disc).
- **Turret:** notched disc (4 V notches) with engraved index dots 1–4; 4 holder sleeves; 4 cuvettes rising from them, each with a meniscus line; centre post; knurled knob with pointer; detent plunger (bracket post, housing, spring rod, ball).
- **Mask spider:** knurled collar on the post, 4 arms with screws, 4 caps.
- **Beam:** entry leg from the lens to the cuvette, exit leg from the cuvette to the detector port, each with its end dot.
- **Detector:** entrance port (collar, tube, flange); can (bolted flange, body in three lengths with 2 seams, end ring, nose, boss); 2 clamp bands, each with a pinch lug and screw; 2 posts saddle-cut to the bands, on feet with 2 screws each; conduit with gland nut.
- **Electronics box:** case with seam, 4 screws and 7 vents; 2 target lamps in bezels; switch slot; detent strip with 3 major and 2 minor ticks; lever (base, stem, knurled knob).
- **Tray:** drain tray under the spout, a pit with 6 drain slots.
