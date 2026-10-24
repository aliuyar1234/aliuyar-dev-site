# Fig 17 · AU-17 · Hydraulic test manifold (ScrubID)

## The object and its motion

A pump on a reservoir bench feeds a supply header. Eight branch lines r0 to r7 hang from it. Each has a three-way ball valve that can draw from the supply header (the live model) or from a reference header below it (the resample distribution), or sit shut when the node is not part of the planted model. All branches rejoin in a collecting header. A series three-way valve, aggr, joins that flow to a glass rotameter, and the float in the tapered tube reads |m|, the mean absolute task metric of the scrubbed model, against an ε band around S0. A circuit is a valve pattern: its nodes stay on supply and every other node is switched to the reference header. The pattern is ε-faithful when Δ(C) ≤ ε; on this suite Δ(C) = S0 − |m|, so that is when the float stays within ε of the full-model reading S0. The console knob sets the planted redundancy factor r (1, 2, 4 or 8 branches in use). Discovery sets each near-optimal faithful pattern from the recorded run in turn, then the readout gives RR, SSS and CC and the cert lamp lights. A single-lever flip moves one node to the reference header and reads its Δ against τ. The float moves on a damped spring (k 38, c 7.4) toward the model's |m|; levers follow their target angles (exponential, τ 0.13 s), and the knob its detent (0.12 s). The idle tour runs r = 1, 2, 4, 8, with a necessity test after r = 1 and r = 2, then reads the GPT-2 rows from Tables T2 and T4 with the meter shut off, and loops.

Every change of valve pattern that should keep the reading is made before it is broken: between two circuits of S_near the next circuit's branch opens first (a `switch` step, readout `C k/n → k+1/n`), and between two factors, after Home and after the GPT-2 rows, the branches that go live open first (a `make` step, readout `r a → b`). Only a pattern that is exactly a member of S_near prints `C k/n {…}`.

Every number in the readout, and the ε lamp, comes from the model on the pattern the levers have reached (each lever selects the port of its nearest detent), never from the lagging float. Each synthetic example's metric is +1 or −1 and a scrubbed model either keeps it or reads 0, so the only values are |m| 0.00 or 1.00 and Δ 0.00 or 1.00. A flip prints `r_i → ref` while the lever travels and its `+Δ … τ` verdict once it has arrived.

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| S0 (synthetic baseline score) | 1.0 | float rest height, readout `S0` | `baseline_score_s0` in every synthetic `run_record.json`, `outputs/paper_ready_gpt2_20260120_v6c/runs/` |
| ε | max(1e-4, 0.10·S0) = 0.10 | ε band on the meter scale (0.9 to 1.1), ε lamp, readout | `spec/00_CANONICAL.md` `EPSILON_REL_FRAC: 0.10`, `EPSILON_ABS_MIN: 0.0001`; `runner.py` line 1029 |
| τ (necessity) | max(1e-4, 0.05·S0) = 0.05 | flip readout `+Δ … ≥ τ 0.05` | `spec/00_CANONICAL.md` `TAU_REL_FRAC_NECESSITY: 0.05`; `runner.py` line 1031 |
| Synthetic metric | per example m(x; f) = +1 if y = 1, else −1, so S0 = mean \|m\| = 1.0; the scrubbed model keeps m(x; f) if aggr and at least one r_i are kept, else 0. The float shows \|m\| = mean \|m(x; f^C)\|: S0 or 0 | float height for every valve pattern, readout `\|m\|` | `runner.py` `_synth_metric_values`, `_synth_scrubbed_metric_values`; `datasets/synthetic.py` (y) |
| Δ(C) | mean \|m(x; f) − m(x; f^C)\|, which on this suite equals S0 − \|m\| | readout `Δ` | paper §0.3.4; `runner.py` `_synth_delta`; `model.mjs` `deltaOf` |
| Planted redundancy factor r | 1, 2, 4, 8 | knob detents, number of branches in use | Table T1, `planted_redundancy_factor` |
| S_near per run | e.g. r 2: {aggr,r0}, {aggr,r1}; r 8 XOR manual seed: {aggr,r0}, {aggr,r1}, {aggr,r3}, {aggr,r5} | discovery valve patterns, readout `C k/n` | `certificate.json` per run. 24 runs: EXP_SYNTH_REDUNDANCY_SWEEP_V1, generators G_ATTR_PATCH and G_MANUAL_SEED, 3 templates × 4 factors, the two generators T1 aggregates (COMPARE r 8: SSS (1.0 + 0.467)/2 = 0.733 matches T1; the sweep's 12 G_RANDOM_K runs are not used). `data.mjs` (page) holds S_near and replicates; `runs.mjs` (build only) holds run IDs and the recorded RR, SSS, CC and certificate |
| Replicate circuits (R = 5) | per run, from `certificate.json` | SSS | `data.mjs` `rep` |
| RR | max Jaccard distance over S_near | summary readout | paper §Diagnostics; recomputed in `model.mjs` and checked by `build.mjs` against every stored run in `runs.mjs` |
| SSS | mean pairwise Jaccard similarity of the 5 replicates | summary readout | same |
| CC | share of components whose necessity is inconsistent across S_near (necessary in one circuit, not in another) | summary readout, caption | ScrubID `cc.py`, paper §0.3.6; recomputed and checked the same way |
| Certificate rule | emitted when any verdict is FAIL: RR ≥ 0.50, SSS < 0.60, CC > 0.50 | cert lamp red | `spec/00_CANONICAL.md` `RR_THRESHOLD_HIGH`, `SSS_THRESHOLD_BORDERLINE`, `CC_THRESHOLD_MODERATE`; `runner.py` `_audit_certificate_reason_codes` |
| T1 means r = 1 | RR 0, SSS 1, CC 0, cert rate 0 | caption, r 1 summary | `table_T1.csv` |
| T1 means r = 2 | RR 0.667, SSS 1, CC 0.667, cert rate 1 | caption | `table_T1.csv` |
| T1 means r = 4 | RR 0.667, SSS 1, CC 0.8, cert rate 1 | caption | `table_T1.csv` |
| T1 means r = 8 | RR 0.667, SSS 0.767, CC 0.817, cert rate 1 | caption | `table_T1.csv` |
| GPT-2 small components | 144 heads + 12 MLPs = 156 | caption, paper readout `/156` | `head_mlp` granularity, paper §Experiments |
| T2 IOI (I_ACTPATCH, G_ATTR_PATCH, N 5) | 124.0 kept, RR 0.36, SSS 0.68, CC 0.10, verdict WARN | caption, tour readout (cert lamp dark: no certificate; ε lamp dark, meter shut off) | `table_T2.csv` |
| T2 induction | 92.8 kept, RR 0.59, SSS 0.41, CC 0.01, verdict FAIL | caption, tour readout (cert lamp red; ε lamp dark) | `table_T2.csv` |
| T4 induction OOD | 17.6 kept, SSS 0.13, verdict FAIL | tour readout (cert lamp red; ε lamp dark) | `table_T4.csv` |

All report paths are under `outputs/paper_ready_gpt2_20260120_v6c/reports/report_20260120T171815Z_0000/` in the ScrubID repo.

## How the figure maps the model

- Bank lever up (94° in its x-z plane, toward the supply header): the node is kept on the live model. Lever down (−105°, toward the reference header): the node is resampled from the reference distribution. Lever level to the right (24°, horizontal on screen): shut, the node is outside the planted model of factor r. Each angle ends the grip clear of the neighbouring valve; a stop plate behind each hub carries a detent mark at all three.
- aggr is the series valve under the meter, so turning it to the reference header drops the float to 0 whatever the bank does (+Δ 1.00 ≥ τ, necessary). Its lever is up (68°) for the collected flow, down (−42°) for the reference feed, and in the middle (12°) shut.
- While a GPT-2 row is read, aggr is shut: no flow reaches the meter, the float parks on its bottom stop and the ε lamp is dark, so the lamps only speak for what the manifold measures. The cert lamp shows each row's verdict.
- With r = 1, r0 is necessary. With r ≥ 2, flipping any one r_i from the full model gives +Δ 0.00 < τ (not necessary), while inside its near-optimal circuit {aggr, r_i} the same node is necessary (+Δ 1.00 ≥ τ, as each `certificate.json` records). That inconsistency across S_near is what CC counts. The tour's two necessity tests flip the kept node of the last circuit, so both read necessary.
- The tour uses run index 0 for r = 1, 2, 4 and run index 1 for r = 8 (XOR, G_MANUAL_SEED), the run whose replicates pick different circuits (SSS 0.53).

## Not shown

- Greater-than suite, the G_MANUAL_SEED and G_RANDOM_K rows of Tables T2 and T4, and Table T3 (sensitivity deltas).
- MDL values and the ranking of candidates; discovery shows only the resulting S_near.
- The real GPT-2 circuits: the manifold always holds a synthetic pattern; the GPT-2 rows appear only as numbers in the readout and caption.
- Confidence intervals.

## Drawn, not data

- Every dimension of the bench, pump, posts, headers, gauge, console and meter is invented for legibility.
- The gauge needle, the sight-glass level and the meter scale range (0 to 1.2) are fixed drawing choices.
- The float's spring constants, the lever and knob follow times, the 0.5 s make steps and all other timings of the tour.
- The flow itself: no fluid quantity in the drawing corresponds to anything in the paper beyond m.
