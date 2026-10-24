# Fig 8 · AU-8 · Key duplicating machine

Paper: *Same-Size Capability Transfer Reveals a Performance-Localization Tradeoff in Deterministic Function Calling*.
Sources: `paper/main.tex`, `paper/tables/main_results.tex` (Table 1), `paper/tables/localization.tex` (Table 2) and `docs/CLAIMS_MATRIX.md` in `sparse-capability-transplants`.

## The object

A bench key duplicating machine. The master key in the left vise is the task-trained Gemma-family 1B donor. The blank in the right vise is the untuned base, which is the same size. Both vises sit on one vise plate. Pulling the handle feeds the plate in on a cross-slide (dovetail ways with gibs, on guide blocks that ride the carriage shaft) against a fixed tracer stylus and a motor-driven cutter wheel. The carriage then traverses along the shaft, so the cutter copies onto the blank what the stylus reads off the master. That copy is the module fitted to the donor-minus-base delta at the layer-12 MLP output. The three-position lever picks how it is cut:

- **Sparse** cuts only at the 16 stations pinned on the index rail, which the fixed pawl reads.
- **Dense** backs the stylus off a little (its adjuster turns) and cuts a fitted profile. That profile follows the master's six cuts closely but is not the master: its roots are rounder, and some cuts are deeper and some shallower. The paper says the same-size interventions do not reconstruct the donor's exact schema-shift semantics (§5.3: SchemaShift strict stays at 0.0016 for sparse, dense and steering, against 0.5344 for the donor).
- **Steering** lifts the stylus clear and lets the depth stop hold one constant offset.

The pruning bolt drops 15 pins into their bores and leaves station 104, the locked one-feature subset. Once the carriage has come back, the dial gauge on its pillar grades the copy on strict success, with tell-tales at the base and donor scores.

## Quantities

| Shown | Value | Where it appears | Source |
|---|---|---|---|
| Base strict success | 0.0375 | base tell-tale on the dial; caption | abstract; main.tex, discovery and confirmation protocol; Table 1 |
| Donor strict success | 0.1781 (0.178125) | donor tell-tale; steering readout; caption | abstract; Table 1 |
| Donor gap | 0.1406, 95% CI [0.1208, 0.1604] | TRUTH only | abstract |
| Sparse, discovery seed (single tier) | 0.2068 | sparse readout ("disc."); pruned readout ("parent 0.2068 disc.") | abstract; Table 1; Table 2 (full sparse module, 256 features) |
| Sparse, 3-seed mean | 0.1658 | sparse readout, needle; caption | abstract; Table 1 |
| Dense, discovery seed (single tier) | 0.1854 | dense readout ("disc.") | Table 1 (`Dense shortcut & single & 0.1854`) |
| Dense, 3-seed mean | 0.2177 | dense readout, needle; caption | abstract; Table 1 |
| Steering, discovery seed | 0.1078 | steering readout, needle; caption | abstract; Table 1 |
| One locked feature | 0.1172 strict, 47.1% (0.4708) of the full sparse gain | pruned readout, needle; caption | abstract; Table 2 |
| Random one-feature controls | mean 0.0566 | pruned readout ("rand") | Table 2 |
| Locked feature index | 104 | the one pin left after pruning; pruned readout | CLAIMS_MATRIX.md ("selected feature `104` as a `1`-feature subset") |
| TopK width | the top 16 of 256 features are kept per token | 16 pins on a 256-station rail; legend; sparse setting line ("TopK 16 of 256") | main.tex, sparse transplant (TopK 16); Table 2 (full sparse module, 256 features); per-token TopK in `src/train/train_delta_module.py` (`topk_sparsify`) and `docs/METHOD_SPEC.md` |
| Sparse gain | λ = 1.25 | sparse cutting readout (not the pruned one: the paper gives the gain for the full module only) | main.tex, sparse transplant and matched controls |
| Hook site | layer-12 MLP output | caption; cutting readout in every mode ("layer-12 MLP out") | main.tex, sparse transplant and matched controls (the dense and steering baselines are fitted at the same hook site) |
| Parameters | sparse 590,081 · dense 591,232 · steering 1,152 | legend; setting lines of the readout | main.tex; Table 1 |
| Primary metric | strict full-call success on 1,920 prompts (SchemaShift, NoCall-MissingTool, NoCall-Unsupported, 640 each) | caption; grading readout | main.tex, task and primary metric |

"disc." is the paper's discovery seed, the single tier of Table 1. The text calls it only the discovery seed; Figure 1 of the PDF labels those points "seed 17". The figure keeps the text's name. Three-seed means are over seeds 17, 29 and 43. Steering, the one-feature subset and the random controls are reported on the discovery seed only, so their readouts carry no three-seed mean.

The pruned state is measured against its own parent: 47.1% is relative to the full discovery-seed sparse module (0.2068), so the pruned readout names that parent ("parent 0.2068 disc."). The needle shows 0.1172.

## Drawing conventions (not claims)

- **Station positions.** The paper does not list the TopK features. The 16 pins sit in groups on five of the master's six cuts, so the sparse copy reads as a set of notches. Station 150 sits on a land between cuts and cuts nothing. Only station 104 is a real index. TopK 16 is a per-token budget: the module keeps the top 16 of its 256 features at each token position. The fixed pin set is the drawing's picture of that budget, not a claim that the same 16 features always fire. Pruning is the paper's reduction of the 256-feature module to the one locked feature, drawn as 16 pins becoming 1. Station numbers other than 104 carry no data, so the readout never shows them: while a copy is cut it names the hook site instead.
- **Dense profile.** The fitted dense profile is invented. It differs from the master by at most 0.65 units of depth, so it reads as a different key that also works. It does not stand for any measured quantity.
- **Gauge.** One turn of the needle is 0.25 strict success. The zero mark sits at the upper left.
- **Geometry.** The key bitting, cut depths, the steering offset (1.4), the stylus back-off (0.8) and every machine dimension are invented for the drawing and carry no data. Every flank of every cut has the cutter wheel's V slope (0.85), so a cut always fits its cutter.
- **Lamps.** Red means the motor is running and green means the machine is ready. They show the machine's state, not a result.
- **Camera.** Azimuth 45°, elevation 30°, world scale 1.36, like the rest of the catalogue.
- **Timing.** One pass takes 6.2 s: swap the blank, feed in, traverse, release, return. The tour cycles dense, steering, sparse and then sparse pruned to one feature. Any key press or click on a control interrupts a running pass at once: the in-feed releases, the carriage eases home in 0.45 s and the requested copy is cut.
