# Fig 19 · Single-punch tablet press: what is true

Paper: *Robust Discover→Distill Under Poisoned Distillation Data* (Ali Uyar), repo
`robust-discover-distill-poisoning`, PDF `public/papers/robust-discover-distill-under-poisoned-distillation-data.pdf`.
Every number the figure shows is in `data.mjs`, as printed in the paper. `model.mjs` turns those numbers into
grain counts, dial angles and the readout, and `parts.mjs`, `art.mjs` and `live.js` only read the model.
`node build.mjs` checks the model against the paper before it writes anything.

## The object

A single-punch tablet press on a bench stands for the consolidation step of a Discover→Distill loop. The hopper
holds the 4,000 distillation pairs as 27 grains, about 148 pairs to a grain. Bright grains are poisoned pairs and
ringed grains are trigger-target pairs. The slider on the console sets the threat and the knob sets the fraction p.
The screen insert that drops onto the hopper is the format gate D1. Any pair it holds stays on the mesh as a ringed
grain, and the red lamp on the hopper collar lights. The spring on the upper-punch holder is Anchor-KL (D2), and its
tension knob sets it. Without D2 the knob sits high, the spring hangs free 4 units short of it and the punch goes the
full stroke. With D2 the knob screws down 6, catches and preloads the spring, and on every stroke the punch stops
2.5 short of full depth while the spring takes up the rest: the trust-region penalty that keeps the student close to the frozen
base model. Turning the flywheel runs 200 strokes, one SDFT step per stroke. On each stroke the eccentric drives the
punch, the feed shoe sweeps the tablet off the die, and the tablet slides down the chute into the tray. The first
and last two strokes turn slowly enough to follow; in between the press runs up to speed and the moving parts are
drawn as the volumes they sweep (punch column, shoe sector, eccentric disc, handle ring), as the flywheel spokes
are; tablets in flight fade out at speed while the tray goes on filling. The dial on the head counts the strokes. After the last stroke a sample tablet goes under the
dial gauge, which reads clean mean reward on the 800 evaluation prompts, with limit hands at ± std where the paper
has two seeds. In the trigger setting the green lamp on the tester lights for a measured trigger success of 0.000,
in every defence setting including none. The whole motion is one run of the benchmark: the data that goes in, what
the gate removes, 200 steps of training, and what the evaluation reads.

Camera: azimuth 45°, elevation 30°, world scale 1.56 (the catalogue's siblings sit at about 1.43 to 1.62).

## Quantities

| Shown as | Value | Source |
|---|---|---|
| Hopper fill | 27 grains for 4,000 training pairs (one grain ≈ 148 pairs) over addition, sorting and string reversal | §4 Experimental setup; abstract |
| Bright grains (random) | 8 at p = 0.3 (1,213 poisoned / 148); 3 at p = 0.1 and 0 at p = 0.0 (p × 27, no count printed) | Table 1 (random p = 0.3: N 4000, poisoned 1213); §3.1 |
| Ringed grains (trigger) | 3 at p = 0.1 (414 / 148 = 2.8) | Table 1 (trigger p = 0.1: poisoned 414) |
| Screen holds (D1) | random p = 0.3: drops 0, final N 4,000, no held grain, red lamp dark. Trigger p = 0.1: drops 47, final N 3,953, one held grain (47 / 148 rounds to 0; one is shown whenever any are dropped), red lamp lit, 2 ringed grains left in the fill (367 pairs ≈ 2.5) | Table 1; abstract ("format gating drops 0/4000 examples"); §4 "Dataset filtering reality check" |
| Random p = 0.0 and 0.1 with the screen | drops 0 | abstract and Table 1 caption: random corruption stays syntactically valid, so D1 removes 0; `paper/make_poisoned_sdft_jsonl.py` (`corrupt_demo` keeps each family's format, clean oracle demos pass `format_ok`); Table 2 prints identical D0 and D1 reward and PPL at p = 0.0 and 0.1 |
| Spring tension (D2) | Anchor-KL weight λ = 0.1, shown in the readout when the spring is set | `paper/run_all.sh` lines 103 and 109 (`run_sdft_cond … _D2_anchor 0.1`); D3 runs `paper/run_optional_extras.ps1` lines 118 and 123 (`-AnchorLambda 0.1`); Eq. (2), §3.2. The paper prints no value for λ |
| Strokes | 200 SDFT gradient steps; readout shows micro-batch 1 · accumulation 8 while running | §4 Training |
| Stroke-counter dial | one turn of the hand per 200 strokes, a tick per 10 and a major tick per 50 | §4 (200 steps) |
| Tray | 24 places fill in proportion to the 200 tablets (one place per 8⅓ strokes) | §4 (200 steps) |
| Evaluation | 800 prompts, in the resting readout | §4 Tasks |
| Dial gauge | clean mean reward ×10⁻³ on a 0–4 scale over 300°; needle at the mean | Table 2 (single seed), Table 3 (two seeds) |
| Random p = 0.3, D0 | 0.001803 ± 0.001077 (2 seeds) | Table 3; §5.1; abstract |
| Random p = 0.3, D2 | 0.002270 ± 0.001443 (2 seeds) | Table 3; §5.1; abstract |
| Random p = 0.3, D1 / D3 | the D0 / D2 reading, labelled "(D0 runs, 2 seeds)" / "(D2 runs, 2 seeds)" | see the note below |
| Random p = 0.0, D0 / D1, D2 / D3 | 0.001053; 0.000904 (1 seed) | Table 2 |
| Random p = 0.1, D0 / D1, D2 / D3 | 0.001678; 0.000845 (1 seed) | Table 2 |
| Trigger p = 0.1, D0 | 0.002305 ± 0.000663 (2 seeds) | Table 3 |
| Trigger p = 0.1, D2 | 0.001151 ± 0.000295 (2 seeds) | Table 3 |
| Trigger p = 0.1, D1 / D3 | 0.002401; 0.001425 (1 seed); D3 trains on the same format-gated set as D1 (drops 47, N 3,953) | Table 2; `paper/run_optional_extras.ps1` line 121 (`sdft_trigger_p0.1_format.jsonl`) |
| Green lamp | trigger success 0.000 under D0, D1, D2 and D3 | Table 2, Table 3, §5.2 |
| Idle tour | random 0.3 D0 → D2 → D1, then trigger 0.1 D0 → D1 → D2 | the settings the paper's tables print; the trigger lamp is seen under D0 first |

D1 and D3 at random p = 0.3: Table 3 has two-seed runs for D0 and D2 only, and no D1 or D3 seed run exists. A screen
that drops nothing passes the very same 4,000 pairs as no screen (Table 2 prints D1 = D0 and D3 = D2 in every random
cell, and §5.1 says D0 and D1 "overlap exactly"), so the figure shows the D0 (D2) two-seed reading and names it as
those runs: "clean 0.001803 ± 0.001077 (D0 runs, 2 seeds)". It claims no D1 or D3 seed.

## What is drawn to scale and what is not

- To scale: grain counts (one per ≈ 148 pairs), the held grain, stroke count, counter turn, tray fill, dial angle,
  limit hands, both lamps and every readout number.
- Not a measured quantity: the punch stroke (14 units), the knob's 6-unit travel, the spring's 2-unit preload and the
  2.5 units the punch stops short under D2. They show that D2 is a restraint, not how strong it is.
- The run's pace is for viewing only (the paper reports no wall-clock time): about 1.6 strokes a second for the first
  and last two strokes, up to 80 a second in between, 7.6 s for the 200 strokes and the reading 1.5 s later.
- The paper reports exact match 0 for all runs (§4 Metrics) and perplexity (Tables 2 and 3). The figure shows
  neither.
