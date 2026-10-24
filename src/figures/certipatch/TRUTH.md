# Fig 4 · CertiPatch jig: truth table

Paper: *CertiPatch: Specification Repair for Frozen Language Models with Replayable Empirical Certificates* (repo `certipatch`, PDF `public/papers/`). All numbers live in `model.mjs`; geometry, readout, caption and legend read them from there.

## The object

A bench test jig. The frozen model is a sealed block clamped to the bench: two lead-sealed straps across the lid joint on its right face, 24 cooling fins for its 24 layers with the four at layers 6, 12, 18 and 23 picked out, and a port on the lid above each of those four. A spring probe on a rail sweeps the block's input strip (the whole domain, 10,000 prompts, read on a ruler with 50 ticks). A dial gauge reads the failure count; while nothing is being read its needle rests on a stop pin 40° below zero, so a reading of 0 is visibly a reading. A press with a non-rising handwheel on its crown turns a nut; the lead screw rides down with the yoke onto a thrust bearing and seats the patch plate on depth stops at the four ports. The plate carries four rank-4 taps (four lamellae each) and a gate switch. Each tap has a trim knob with a pointer bar over a scale. In each round the four pointers are re-set (solve on the active set), the probe sweeps, and its lamp shows red when margin violations remain or green when none do. After the final sweep the gauge reads 0 and a witness stripe is laid across each pointer and its housing. A blank card slides from the magazine across the feed table to the punch, where only the punches whose hole is set in a row come down. The card turns lit with its first field, then rides to the reader, whose bridge sweeps it and lights four check lamps (identity, artifacts, scope, metrics) and the verdict. Pressing T or clicking the patch turns one trim pointer after issue; its stripe visibly breaks from the housing's, the replay stops at the patch-hash row, and the artifacts lamp and verdict go red: the certificate fails closed. At the end of a loop the yoke lifts, the reader's ledges draw back and the card drops into the stacker pit onto the cards already filed, and a new blank feeds.

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| Main model | Pythia-410M-deduped, weights frozen | sealed block, legend, readout | Sec 5 (`EleutherAI/pythia-410m-deduped`); Sec 3 "All base model weights remain frozen" |
| Layers | 24 | 24 fins | Pythia-410M architecture (24 layers, d = 1024) |
| Hookpoints | layers 6, 12, 18, 23 | 4 marked fins, 4 lid ports, 4 taps, readout "patch on L6 L12 L18 L23" | `configs/default.yaml` `mode: quartiles`; `load_model.py`: floor(n/4), floor(n/2), floor(3n/4), n−1 |
| Patch rank | r = 4 | 4 lamellae per tap core, readout | `configs/default.yaml` `patch.rank_r: 4`; Sec 3 Eq. 1 (GLR-HP) |
| Patch parameters | 32,768 | legend, caption | Table 2 (PARITY-4D, main model), CertiPatch Params = 32,768; the COMPARE-2D run uses the same default patch config (4 quartile layers × 2 × d 1024 × r 4), which `model.mjs` computes |
| Scope gate s(x) | deterministic gate | gate switch on the patch | Sec 3, Eq. 1 |
| Spec | COMPARE-2D, "Is aa greater than bb?", aa, bb ∈ 00..99 | caption | `certipatch/specs/compare_2d.py` |
| Domain size | n = 10,000 (exact scope) | ruler (50 ticks, a major per 1,000), gauge full scale, readouts | Table 1, Total column |
| Base failures | 5,050 / 10,000 | gauge after the first sweep, readout | Fig 1, Base cell on COMPARE-2D |
| Failure | predicted label ≠ spec label | gauge | `certipatch/eval/metrics.py` docstring |
| Counterexample | margin m < τ (misclassified or under-margin) | probe lamp red, readout "m < τ" | `certipatch/cegis/counterexamples.py` (margin violations, not only misclassifications) |
| τ (configured threshold) | 1.0 | readouts, caption (`TAU`) | `configs/default.yaml` `objective.tau_margin: 1.0`; Sec 3. Kept separate from the measured min margin below |
| Hardest-first | add the lowest-margin counterexamples | readout "hardest m < τ added" | `select_hardest` in `counterexamples.py`; `cegis.policy: hardest_margin`; Sec 3 step (iii) |
| Outer rounds | 7 (iterations 0–6), the last finds none | 7 rounds of pointer re-sets and sweeps (one click each), lamp red ×6 then green | Fig 2, x-axis 0..6 (COMPARE-2D, main model); loop ends when no counterexample is found (Sec 3) |
| Patched failures | 0 / 10,000 | gauge at certify, readout | Table 1, COMPARE-2D Failures |
| Min margin (measured) | 1.00 | readout "min margin 1.00", caption (`MIN_MARGIN`) | Table 1, COMPARE-2D Min margin |
| Certificate fields | model fingerprint, manifest hash, patch hash, scope definition (domain hash), counterexample budgets, metrics | 6 punched rows | Sec 4, first paragraph |
| Replay checks | run identity, artifact integrity, scope integrity, metric consistency | 4 check lamps + verdict | Sec 4, "Operational semantics" |
| Fail-closed | any mismatch fails verification | broken witness stripe, red artifacts lamp and red verdict after the nudge | Sec 4; Fig 5 (patch perturbed → FAIL) |

Not shown, because the paper has no exact figure for them: per-round failure counts (Fig 2 is a plot, so the needle rests on its stop pin during the rounds), active-set sizes per round, and certificate hash values (none are published in the repo). The tamper study in Fig 5 ran on the COMPARE-6D-STRAT certificate. The jig shows the same patch-hash check on the COMPARE-2D card.

## Drawn, not data

The pointer angles are a drawing of convergence: each pointer swings less every round and lands on a fixed final setting in round 7. They do not encode patch weights. Wheel turns, travel distances and timings are mechanism, not measurements.

## Card layout (model, not data)

The punched pattern is a fixed seeded pattern standing for the six fields. Rows from the back of the card to the front: fingerprint, manifest, patch, scope, budgets, metrics. The reader sweeps from back to front, so each check lamp lights at the last row it needs: identity (row 5), artifacts (rows 4 and 3), scope (rows 2 and 1), metrics (row 0, after the probe's re-sweep returns the gauge to 0).
