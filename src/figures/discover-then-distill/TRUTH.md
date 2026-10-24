# Fig 18 · Fractional still: truth table

Paper: *Discover-Then-Distill: Separating Test-Time Adaptation from Self-Distillation Consolidation* (PDF `public/papers/discover-then-distill-separating-test-time-adaptation-from-self-distillation-consolidation.pdf`). Every number the figure shows lives in `data.mjs`. `model.mjs` turns those numbers into one timeline, and the geometry, readout, legend and caption all read from it.

## The object

A laboratory fractional distillation rig on a heavy bench:

- **Heat.** A heating mantle on a retort stand cups a round-bottom flask, which holds the charge.
- **Column and head.** A Vigreux column with twelve rows of indentations rises from the flask to a still head. The head's glass bulb holds:
  - the thermometer's mercury bulb;
  - a swing funnel, a small turned solid on a pin across y. An electromagnet coil, clamped to the stand beside the head, tips the funnel's spout toward the take-off arm.
- **Thermometer.** It runs from 0.80 to 1.00 and has a cut collar at 0.95.
- **Take-off train.** The take-off arm feeds a Liebig condenser. Its water hoses run out to the right of the second rod, to two bench fittings. After the condenser come a vacuum adapter with a drip cone and a conical receiver on a lab jack.
- **Controller.** It sits in front and carries the heat dial, a three-position selector (base best-of-N, TTT, post-SDFT best-of-N) and a green take-off lamp.

## What moves and what it means

- **A held-out task.** Heating a task drives the vapour (the one lit part) up the column for 12 steps of 8 rollouts, N = 96. After k steps the vapour covers exactly k of the 12 rows of indentations (`vapourTop` in `view.mjs`).
  - **TTT:** the vapour climbs row by row; this is the per-task LoRA adapting.
  - **Best-of-N:** the column fills at once, because sampling makes no updates.
  - The thermometer settles on the condition's held-out mean best reward.
  - When the run ends the vapour is vented. For TTT the readout says "LoRA not merged · θ₀ unchanged" (§3.1: no test-time LoRA update is merged into the base checkpoint).
- **The receiver is the persistent checkpoint (θ_cont).** It moves only during consolidation:
  1. Train-side discovery runs with the funnel on reflux: "train-side discovery · 160 tasks", then "kept 38/160 · 23.75% · reward ≥ 0.95".
  2. The splitter swings to take-off and the lamp turns green: "splitter on take-off · 38 demonstrations".
  3. A bead stream runs down the condenser and the receiver's level rises step by step through the 300 SDFT steps: "SDFT · step s/300 · replay 0.2".
  4. "PPL 161.7 → 160.4 · Δ −1.321".
- **Post-SDFT run.** It is heated with the receiver full.
- **Reset.** The tour ends by draining the receiver back to θ₀.

The replay ratio is shown only in the readout and the caption. No part stands for it: in the paper, replay means sampling 0.2 of the SDFT updates from a replay buffer (§3.4), which is not a flow back down the column.

Seeks don't blank the drawing. T jumps, and the vapour, mercury, funnel, stream, knobs and receiver level ease to the new pose with τ = 0.14 s.

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| Held-out discovery tasks | 120 | base run's second readout line, legend, caption | Table 1; §4.1; Table 3 caption |
| Train tasks | 160 | discovery and filter readouts, caption | Table 1; §4.1 |
| TTT steps × rollouts | 12 × 8 | 12 indentation rows; TTT readout "TTT · step k/12 · n n/96" | Table 1; §3.3 |
| Effective sample budget N | 96 per task, all conditions | "n n/96" in every run (best-of-N shows no step counter), "N 96 compute-matched", caption | Table 1; §4.3 ("N = 12 × 8 = 96") |
| Update policy | test-time training updates only an ephemeral LoRA; the persistent checkpoint changes only through SDFT; no adapter is merged | vapour vented after each run; receiver moves only during SDFT; "TTT · LoRA not merged · θ₀ unchanged" | abstract; §3.1 |
| SDFT min reward filter | 0.95 | cut collar on the thermometer; "reward ≥ 0.95" | Table 1; §5.3 |
| Demonstrations kept | 38 of 160 (23.75%) | "kept 38/160 · 23.75%", "38 demonstrations", legend, caption | §5.3 |
| SDFT steps | 300 | "SDFT · step s/300"; the receiver level is proportional to s/300 | Table 1; §5.3 |
| SDFT replay ratio | 0.2 | SDFT readout, caption | Table 1; §3.4 |
| Mean best reward | base BoN 0.8436 · TTT 0.8396 · post-SDFT BoN 0.8288 | thermometer end position, "best … · EM …%", caption | Table 3; abstract |
| Exact match (reward = 1) | 30.8% · 32.9% · 31.2% | first result line of each run, caption | Table 3; abstract |
| TTT exact-match gain | +2.1 points (32.9 − 30.8) | TTT second line "EM +2.1 pts vs base · N 96 compute-matched" | Table 3; §5.1 |
| Δ reward vs base, 95% bootstrap CI | TTT −0.0040 [−0.0289, +0.0215] · post-SDFT −0.0148 [−0.0400, +0.0108] | not shown (kept here and in `data.mjs`; both CIs contain 0) | Table 3; §4.4 (5,000 resamples) |
| Validation perplexity | 161.7 → 160.4, ΔPPL −1.321 | "PPL 161.7 → 160.4 · Δ −1.321", post-SDFT second line "θ cont · retention PPL 161.7 → 160.4", caption | §5.3; Fig. 4 panel B; abstract |
| Backbone | mHC Transformer | caption | §3.2 |

## What is drawn but not measured

- **Gauge motion with no number attached.** This covers the mercury's climb during a run (during train-side discovery and take-off it stands at the 0.95 collar), the vapour's rise curve, the bubbles, the drip rate and the bead stream. Only the end positions (0.8436, 0.8396, 0.8288) and the 0.95 collar are quantities. The paper reports per-step trajectories (Fig. 3A), but the figure doesn't claim to reproduce them.
- **Small differences by design.** The three end positions differ by 0.004 and 0.015 in reward. On the 0.80–1.00 scale that is about 0.5 and 2 world units of mercury, so switching condition barely moves the thermometer.
- **Tasks are counted, not identified.** Per-task rewards and which train tasks passed the filter aren't shown.
- **The receiver has no physical scale.** Its level is proportional to the SDFT steps completed.
- **Durations are tour pacing**, not wall-clock time.

## Parts

Bench (back layer):

- slab with side seam and groove
- corner screws
- three visible feet at the corners
- ruler strip with ticks
- label plate with `AU-18` and three rule lines
- shadow halos

Retort stand:

- cast base with inset rim and screws
- rod boss
- rod, drawn in pieces between the boss heads
- cap
- boss heads, each with a thumbscrew and an arm: three on the main rod (neck clamp, column clamp, coil) and one on the second rod (condenser clamp)
- three three-finger clamps, each with:
  - a crosshead
  - three curved fingers that wrap to tangent contact on the glass
  - a turned jaw screw
  - the upper clamp holds the column between two indentation rows
- second stand with base, rod and cap for the condenser clamp

Heat:

- heating mantle with a back and a front, lip, vent slots and seam
- power socket and cable to the controller
- round-bottom flask with neck, charge and eight bubbles

Column and head:

- column: ground socket with Keck clip, Vigreux column with 12 rows of indentations and the lit vapour
- still head: head socket, body, bulb and neck
- inside the bulb:
  - the thermometer's lower stem and mercury bulb
  - the swing funnel (a turned solid) on its pivot
  - the drip
- head fittings: thread, knurled cap, seal
- thermometer:
  - stem in two pieces either side of the cut collar
  - scale rule, capillary, minor and major ticks, mercury
  - top
- electromagnet: bobbin with two flanges and nine winding rings, terminal block, and a cable that drops behind the rod and runs over the stand base to the controller

Condenser train:

- take-off arm and condenser socket
- inner tube, plus a water jacket with the inner-tube lines and the bead stream
- outlet
- two turned hose barbs
- two hoses
- two bench water blocks with nozzles
- adapter socket with Keck clip
- vacuum adapter with nipple
- drip cone

Receiver:

- conical flask with ground socket
- distillate as a tinted frustum
- falling drop
- lab jack with base, top, four scissor links, two axle pieces, trunnion, lead screw and knurled knob

Controller:

- case with seam, lid inset, vents and screws
- heat dial plate with ticks, and a knurled heat knob with pointer
- selector plate with three marks, and a knurled selector with pointer
- lamp bezel and lamp

Count: 96 solid groups in the static markup, 121 recorded items, 14 tubes.
