# Fig 13 · Signal-box lever frame · truth table

Paper: *Outcome Is Not Verification: Auditing Hidden-State Verifiers with Counterfactual Local Validity*
(PDF in `public/papers/`, code in `~/Developer/personal/aliuyar1234/outcome-is-not-verification`).
The values live in `data.mjs`, and `model.mjs` derives everything that moves from them.

## Quantities shown

| Quantity | Value in the figure | Source |
|---|---|---|
| Model whose hidden states are read | Qwen3-4B-Instruct-2507 | §4, first sentence |
| Arithmetic schema slots | 7: C1–C3, D1–D3, Ans (seven slot levers) | §3 "Domains" |
| Logic schema slots | 6: L1–L3, N1–N2, Ans (slot lever 6 collared) | §3 "Domains" |
| A core change invalidates | the core steps and Ans (doomed splice): bar B locks C1–C3 and Ans | §3 "World pairs and trace pool" |
| A distractor change invalidates | the distractor steps (recoverable splice): bar C locks D1–D3 | §3 "World pairs and trace pool" |
| Final-trace outcome o | arm repeater level (on) for a doomed splice, dropped (off) for source gold and a recoverable splice | §3 (doomed: "the final answer becomes wrong"; recoverable: "the answer remains correct"); o as in Eq. (3) |
| Arithmetic changed inputs | x1 (core), d1 (distractor) | code, `data/arithmetic.py:165` (`changed_leaf = "x1" if change_branch == "core" else "d1"`) |
| Logic changed facts | core seed, dist seed | code, `data/logic.py:199` (`"core_seed_fact" if change_branch == "core" else "dist_seed_fact"`) |
| A world pair changes exactly one input | the cross-lock: only one world lever can be reversed | §3 "Each world pair … changes exactly one branch-local input or fact family" |
| Local validity label y | "free, y = 1" / "locked, y = 0" | Eq. (1), §2 |
| Arithmetic TraceAUROC | 0.625 | Table 2; §6.1 |
| Logic TraceAUROC | 0.972 | Table 2; §6.1 |
| Arithmetic strict same-step FlipAcc, PrefixOutcome → LocalValidity | 0.845 → 0.864 (readout and left meter) | Table 2; §6.2 |
| Arithmetic PVS, PrefixOutcome → LocalValidity | 0.679 → 0.730 (readout and right meter) | Table 2; §6.2 |
| Logic strict same-step FlipAcc, PrefixOutcome → LocalValidity | 0.995 → 1.000 (readout and left meter) | Table 2; §6.2 |
| Logic PVS, PrefixOutcome → LocalValidity | 0.697 → 0.975 (readout and right meter) | Table 2; §6.2 |
| Strict flips in the test split | 5.04k arithmetic, 4.32k logic | Table 1, scale rows, test column |
| Scorers compared | TraceOutcome, PrefixOutcome, LocalValidity (the commutator's three positions), all linear on the same pooled hidden states; PrefixOutcome and LocalValidity share the canonical step pool, TraceOutcome uses one final-step example per stored trace | §4 list of scorers and fairness invariant |
| A strict same-step flip | same slot, renderer and step text, opposite local-validity labels in the two worlds | §2, Eq. (2); Figure 1 |
| Audit centred on counterfactual local validity (caption lead) | "an audit centered on counterfactual local validity" | Abstract; §1 contributions (2) |

The readout and the two meters print the measured values only. The meters read 0.5 to 1.0 with a tick every 0.05; under
TraceOutcome they rest on their stop pins, because Table 2 reports TraceOutcome on TraceAUROC alone. The caption states the
setting the paper holds fixed (extractor, scorer class, step pool) and the measured changes.

## What is modelled, not measured

The paper reports aggregates, not per-step scores, so the repeater needles and flip lamps come from the simplest score
model that reproduces the measured rates. It is an equal-variance binormal model: valid and invalid steps sit `d` apart,
so the validity AUROC is Φ(d/√2) = PVS. It has no outcome term, so both outcome-conditioned AUROCs in Eq. (3) equal that
value. The two steps of a strict flip share a component with weight ρ, so P(s_valid > s_invalid) = Φ(d/√(2(1−ρ))) =
FlipAcc. TraceOutcome scores only the final step (Ans), with d from TraceAUROC and ρ = 0. `fit.mjs` solves the table
below from `data.mjs`, and every build checks that the stored values match the solve and reproduce the paper's rates.

| Domain · target | d | ρ | Reproduces |
|---|---|---|---|
| Arith · PrefixOutcome | 0.6575 | 0.7903 | PVS 0.679, FlipAcc 0.845 |
| Arith · LocalValidity | 0.8666 | 0.6888 | PVS 0.730, FlipAcc 0.864 |
| Logic · PrefixOutcome | 0.7294 | 0.9599 | PVS 0.697, FlipAcc 0.995 |
| Logic · LocalValidity | 2.7718 | 0.6452 | PVS 0.975, FlipAcc 0.9995 (1.000 is fitted as 0.9995, since the probit of 1 is infinite) |
| Arith · TraceOutcome | 0.4506 | 0 | TraceAUROC 0.625 |
| Logic · TraceOutcome | 2.7026 | 0 | TraceAUROC 0.972 |

The figure draws one world pair per domain: pair 40 of the model's seeded normals, a single sample from the model, not
data. In it, under LocalValidity in arithmetic, three of the four core flip lamps light green and C3 lights red; under
PrefixOutcome, Ans lights red as well. Every logic flip lamp of that pair lights green under both targets. At the modelled
rates about one arithmetic flip in seven ranks the wrong way, and about one logic flip in two hundred under PrefixOutcome.
The repeater needles follow the current world, so in logic under LocalValidity the invalid steps' needles swing left of
the valid ones when a world lever is reversed, while under PrefixOutcome they stay mixed. The caption says that repeater
needles and flip lamps come from the fitted model. Localization (Table 2, last two columns) is not shown.

## The object and its motion

A mechanical railway signal-box lever frame on a bench. Nine levers stand in quadrants on the frame. A signalman squeezes
the catch handle, which lifts the catch block out of its notch, and swings the lever over, which drives the lever's tappet
forward through the locking tray. The two left-hand levers are world levers. Reversing the x1 lever moves its tappet, and
its V-notch cams the drive dog of lock bar B sideways, so bar B pushes a dog into the notch of every core tappet (C1–C3,
Ans). Reversing the d1 lever does the same through bar C for D1–D3. The bars slide in keepers bolted over their saddles. A
both-way cross dog between the two world tappets lets only one of them be reversed. Each slot lever is one schema slot
holding the same source-gold step text in either world. Pulling it asks the interlocking whether that step is valid
against the gold pre-step state of the current world. If the tappet runs free the step is valid (y = 1). If its notch's
back wall meets a dog after 0.9 units, it is locked (y = 0). That is Eq. (1) computed by the locking.

On the block shelf, a repeater behind each slot lever shows the linear scorer's reading of the pooled hidden state for
that step in the current world. When a locked lever is pulled, its flip lamp lights: green if the scorer ranked the valid
twin (the same text in the source world) above it (Eq. 2), red if below. The commutator switches the scorer's supervision
target (TraceOutcome, PrefixOutcome, LocalValidity) and the knob beside it the domain; for logic, the lever collar moves
from its peg on the bench onto slot lever 6, which has no slot. The shelf runs out on a knee bracket past the frame and
carries the arm repeater, which shows the outcome o that PrefixOutcome is trained on (level when the x1 lever makes the
splice doomed, dropped otherwise, so with d1 changed it stays off while D1–D3 lock), and the two meters, which show the
selected scorer's measured FlipAcc and PVS. Turning the commutator from PrefixOutcome to LocalValidity swings the PVS
meter from 0.697 to 0.975 in logic and from 0.679 to 0.730 in arithmetic.

Every V-riding dog has a V nose parallel to its notch's flanks, so each flank drives its dog as an exact cam
(`model.mjs`: `shiftOf`, `crossOf`). The plays are derived from the drawn geometry. A world lever stopped by the cross-lock
moves 0.32 units, short of the 0.48 at which it would start its lock bar. Every action is planned when it starts, from the
state at that moment, so queued actions never act on a stale world.
