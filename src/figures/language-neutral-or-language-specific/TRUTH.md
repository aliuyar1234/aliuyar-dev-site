# Fig 5 · Acrylic slice model · truth

The figure shows the paper's real results. Every number on the plates, the recorder, the meters and the readout comes from `data.mjs`, which was generated from the paper repo's result files (provenance field by field in `DATA.md`). `model.mjs` derives what the figure shows from it, and `build.mjs` refuses to build unless `selfCheck()` passes: the mid-layer semantic Δz from the layer curves must equal each H1 effect, and each H1 effect must match the printed table.

One drawn layer is not paper data: the brain outline and midline on each plate come from the MNI152 template (`brain.mjs`), for orientation only. The paper's Harvard-Oxford parcels come from an MNI152-distributed atlas resampled into LPPC's MNIColin27 derivative space (paper Sec. 3.5 and Sec. 6), so the template's outline at a plate's height is a close frame for the etched regions, not an exact one. No number in the figure is read from it.

## The object, what moves, what it means

A heavy bench on feet carries an acrylic slice teaching model of the brain and three instruments wired to it. The model holds ten clear plates on two guide posts. Each plate is clamped by two metal tabs to a collar on each post, and each collar is pinned to the centre pivot of a lazy-tong scissor in front of its post, so all ten plates move together. A lever on the base's front face fans the plates apart so every slice can be read, and drops them back to anatomical spacing. Each plate is etched with the MNI152 brain outline and midline at its height, an anterior notch, the borders of the paper's semantic (solid), auditory (dotted) and control (dim) regions, and lit cells whose brightness is how well the selected component predicts each region.

At the left, an optical breadboard is the decomposition. Three lamps stand for the English, French and Chinese sentence of each aligned triplet. Their beams pass an encoder slide, whose round windows mean XLM-R-base and square windows the NLLB-200 encoder. Each beam then meets two pop-up half-silvered mirrors, one on each bus. On the SPECIFIC bus (front) only the heard language's mirror is down. On the SHARED bus (back) the mirrors of the two other languages are down and combine their beams, which is the leave-target-out mean u. A beam-splitter cube on the SHARED bus sends part of u forward into the reference port of an analyser on the SPECIFIC bus; the analyser is locked crossed to that reference, so what passes it is the heard language's part that u does not explain, v⊥ = h − proj_u(h). Two fibres carry both components into ports on the model's base, and the selector dial beside them picks which one the plates show (shared, specific, or shared − specific). An X-Y recorder at the right back draws the semantic regions' shared and specific curves across encoder depth, and a three-meter desk at the front reads the middle-late shared − specific difference for the semantic, auditory and control regions.

When the listeners' language changes, the mirrors rise and fall, the beams that now carry light draw on from their source, the plates crossfade to the new map, the gantry crosses the chart while both pens redraw, and the needles settle on the new values. Changing the encoder raises or lowers the slide and does the same. The motion means three things:

- Each language's representation is split into what the other two languages share and what remains specific to it.
- Across both encoders and all three listener groups, the shared part predicts the semantic regions better over the middle-late layers.
- The auditory and superior temporal regions also show a strong shared advantage (paper Sec. 4.4), and the control regions a smaller one.

No WebGL layer is used. This is a choice: the plates' data is the luminance of etched cells, one value per cell, and a glow or a shaded effect would blur exactly that.

## Quantities

| Quantity | Value | Source |
|---|---|---|
| Units | about 1 px of the instrument; z up, bench top z = 0; camera azimuth 45°, elevation 30°; scale 1.240 | `world.mjs` |
| Bench | 300 × 160 units, 12 thick, on three visible feet (the fourth, under the far corner, is hidden by the slab and not drawn) | `PLATE`, `FOOT_H` |
| Plates | 10 axial planes at z = −38, −26, −14, −2, 10, 22, 34, 46, 58, 70 mm (12 mm apart), single 2 mm voxel planes of the LPPC grid | `data.mjs` `slices[].z`, `DATA.md` |
| Etch scale | 0.42 units per mm; plate 68 × 84 units, 2 thick, notch on the anterior edge at x = 0 mm | `M`, `SLAB`, `slabRing()` |
| Plate pitch | lever down 5.04 units (12 mm at the etch scale), lever up 30 units; fanned, 70.7% of each covered plate's top face is in view | `G_REST`, `G_FAN` |
| Brain outline | MNI152 ICBM 2009a symmetric template, nilearn 0.10.3 bundled 1 mm grey + white matter maps, brain = (gm + wm) > 0.2 at each plate's z, marching squares, Douglas-Peucker 1.5 mm, pieces and holes under 25 mm² dropped; midline runs where x = 0 lies inside the brain. Orientation only | `brain.mjs` |
| Region borders | union of each family's ROI parcels in that plane: semantic 8 ROIs, auditory 6, control 4; marching squares, simplified at 1 mm | `slices[].familyOutline`, `DATA.md` |
| Cells | 6 mm cells (3 × 3 voxels of the plane), 784 in all; side 2.52 · max(0.45, 0.84 · √(n/9)) units, n = in-mask voxels of 9 | `slices[].cells`, `slices[].n`, `cellPaths()` |
| Cell value | ROI-projected group-mean held-out Fisher z at the representative layer (XLM-R layer 7, NLLB layer 8), int8 × 0.0015 z (shared, specific) or × 0.001 z (shared − specific) | `maps[]`, `grid.scale` |
| Cell brightness | level = round(30 · value / full), full 0.17 z for shared and specific (one scale; the largest value is 0.168), 0.12 z for shared − specific (largest 0.111); nothing saturates; 8 brightness bins; a negative level is drawn as a hollow square | `FULL`, `LEVELS`, `STEPS`, `figure.css` |
| Readout | H1 statistic of the selected model and listener group: semantic regions, middle-late layers, shared − specific Δz, Holm p, n (n is dropped below 520 px wide); e.g. XLM-R EN 0.0609, p_Holm 0.0012, n 31 | `confirmatory.h1`, `readoutOf()` |
| All six H1 effects | XLM-R EN 0.0609, FR 0.0589, ZH 0.0324; NLLB EN 0.0415, FR 0.0429, ZH 0.0194; every p_Holm 0.0012 | `confirmatory.h1`, paper Table 3 |
| Listeners | EN 31, FR 28, ZH 35 (94 in all) | `confirmatory.h1[].n`, `headline.subjects` |
| Decomposition | SHARED u = mean of the other two languages' normalized embeddings; SPECIFIC v⊥ = h − proj_u(h), which is Eqs. 2–3 rewritten (equal up to ε = 10⁻⁸) | paper Eqs. 1–3, `DATA.md` |
| Mirrors | on the SHARED bus a mirror is down unless its row is the heard language; on the SPECIFIC bus only the heard row's mirror is down; a raised cell is 6 units up, clear of the beam; its rod slides in a guide tube under the bridge | `liftOf()`, `MIRROR` |
| Beams | 18 runs between optical parts, each lit by a rule on the heard language: lamp to slide and slide to the SPECIFIC bus always; SPECIFIC to SHARED bus in row r unless r is heard; SHARED bus from the first non-heard row on; SPECIFIC bus from the heard row on; pick-off to the analyser's reference port always. A run that lights draws on from its source, 110 ms later per step down the light path | `BEAMS`, `figure.css` |
| Encoder slide | rises 8 units to put the NLLB windows in the beams | `SLIDE_LIFT` |
| Recorder chart | x = layer depth 0 to 1 (layer/12), y = 0 to 0.12 Fisher z; semantic-family mean of shared (solid) and specific (dashed); XLM-R 13 layers, NLLB layers 4, 6, 8 only; highest plotted value 0.107 | `layerCurves[].family.semantic`, `CHART` |
| Recorder band | middle-late window, depth 0.33 to 0.83, the confirmatory window | `confirmatory.midLayerDepth` |
| Recorder tick | the representative layer of the maps on the plates (layer 7 or 8 of 12) | `maps[].layer` |
| Meters | 0 to 0.10 Fisher z over 240°. Left: semantic Δz_mid (= H1 effect). Middle: auditory Δz_mid (`roi_family_effect_panels.parquet`, panel auditory; the auditory side of H2, not itself a Holm-tested primary test). Right: control Δz_mid (mean of the control curve's shared − specific over depth 0.33 to 0.83) | `table[].sem`, `.aud`, `.ctl` |
| Meter values, XLM-R EN | semantic 0.0609, auditory 0.0647, control 0.0251 | `model.mjs` |
| Selector | three detents: shared 150°, specific 90°, shared − specific 30° | `SELECT_ANGLES` |
| Language knob | EN −45°, FR 0°, ZH 45° | `LANG_ANGLES` |
| Lever | −15° down (plates stacked), 62° up (fanned); the tong bars keep a constant length of 33 units, so each tong's width follows the pitch: 32.6 units stacked, 13.7 fanned | `LEVER`, `TONG`, `tongHalf()` |
| Motion | the fan rides a critically damped spring (stiffness 40, damping 12.65), the same one the audit replays; slide 300 ms, knobs 220 ms, mirrors 260 ms, needles 600 ms (exponential); cells crossfade 0.7 s; gantry crosses in 2.6 s (smoothstep). The frame loop stops once everything has settled | `live.js`, `FAN_SPRING`, `figure.css` |
| Idle tour | starts 3.4 s after load and 8 s after the last touch, timed with timers, not frames; one step every 3.4 s: specific, shared − specific, FR, ZH, NLLB, EN, shared, plates down, plates up and XLM-R, then repeats. The screen-reader status is written only on a user's action, never by the tour | `TOUR`, `IDLE`, `STEP` |
| Lit part | the etched cells | `figure.css` |
| Static markup | 296.4 KB raw, paths at 1 decimal; live code 24.2 KB before minifying, kit excluded | `build.mjs` |
| Painter's order | settled by `A.settle` over 65 states (rest, stacked, uniform and spring-replayed fan transitions) and written to `order.mjs`; `render()` sorts by it and never settles at site build | `build.mjs`, `order.mjs` |

## Caption

The paper splits each sentence representation from XLM-R-base and the NLLB-200 encoder into a shared component built from the other two languages' translations and an orthogonal residual specific to the heard language, then fits both to fMRI from 94 people hearing Le Petit Prince in English, French or Chinese. Over the middle-late layers the shared component predicts the semantic regions better in all six model-by-language tests, by 0.019 to 0.061 in held-out Fisher z, and every test survives Holm correction. The shared advantage holds in every one of the 48 semantic ROI rows, also appears in auditory and superior temporal regions, and is smaller in control regions.
