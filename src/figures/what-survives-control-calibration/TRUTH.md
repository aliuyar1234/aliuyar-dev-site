# Fig 15 · Vernier height gauge · truth table

Paper: *What Survives Control Calibration? A Full-Scope Negative Result for a Locked Minimum-Description Acceptance Criterion*.
Sources live in `mdca-build-pack/`: `paper/main.tex`, `paper/tables/main_results.tex` (Table 1), `paper/tables/unevaluable_by_family.tex` (appendix table), `paper/paper_data.json` and `src/analysis/acceptance_core.py`. Every number below is in `data.mjs`; `model.mjs` derives the motion from it.

| Quantity | Value in the figure | Source |
|---|---|---|
| Candidate pool per setting | 120 cells = 4 high-level models × 3 site budgets (1, 2, 4) × 10 map cells (dense 1, sparse L1 3, low-rank 3, MLP1 ReLU 3) | main.tex §2 "Candidate family" (the 4 × 3 × 10 breakdown); §3 "Configured versus realized coverage"; paper_data.json candidate_pool_scope (model ids, budgets, map-family grid) |
| Recorded / unevaluable cells | S1 120/0 · S2 116/4 · S3 92/28 | Table 1 "Cells (rec./unev.)" |
| Unevaluable cells by family | S2: low-rank 4 · S3: dense 4, low-rank 8, sparse L1 8, MLP1 ReLU 8, all at b = 4 | unevaluable_by_family.tex (family counts); the budget is from paper_data.json proposal_coverage.unevaluable_cells_by_site_budget_and_map_family (every non-zero entry is b=4; the paper text says "concentrated at b=4", §3 and §4.2) |
| Valid bins (test/shift) | S1 3/3 · S2 3/3 · S3 2/2 | Table 1 "Valid bins (test/shift)"; main.tex §4 |
| Δ to closest frontier-defined (bits/example) | S1 2.008 · S2 0.066 · S3 0.198 | Table 1 |
| g_test of closest frontier-defined (bits) | S1 0.000 · S2 −0.155 · S3 −2.340 | Table 1; exact values from paper_data.json (−0.15489…, −2.33985…) |
| g_shift of closest frontier-defined (bits) | S1 0.000 · S2 −15.582 · S3 −37.016 | Table 1; paper_data.json (−15.5821…, −37.0159…) |
| Supported classes | 0 in every setting | Table 1 |
| Planted oracle A★ in S1 | g_test = g_shift = 0, bootstrap lower bound 0; a separate candidate from the S1 closest frontier-defined one (id 4cf45f8cdae96183), which also ties at 0 | main.tex §4 "The planted oracle still fails", §5 "the oracle and closest frontier-defined candidates tie the frontier at zero"; paper_data.json settings[0].oracle vs primary.best_frontier_defined_candidate_id |
| Δ (readout line 2) | test bits/example from the closest frontier-defined candidate to the global best candidate | Table 1 caption |
| Best-bits class | exactly one candidate per setting, the global best, which is frontier-ineligible; every closest frontier-defined candidate is outside it | Table 1 caption; main.tex §4 "Support failure has two regimes"; paper_data.json primary.best_frontier_defined_candidate_within_best_bits = false |
| Calibration changes the decision (caption) | in all three settings, under both codebooks | main.tex abstract and §5 "Null calibration changes decisions in every setting"; paper_data.json primary/robustness.control_calibration_changed_decision = true |
| Gap definitions | g_test = frontier_test − L_res(A; D_test), g_shift = frontier_shift − L_res(A; D_shift), no refitting | main.tex §2 "Acceptance rule" |
| Gate 1 | within 0.01 bits/example of the best candidate (best-bits class) | main.tex §2 |
| Gate 2 | one-sided grouped-bootstrap lower bound on g_test > 0 | main.tex §2 |
| Gate 3 | g_shift > 0 without refitting | main.tex §2 |
| Frontier | 5th percentile of balanced matched-null residual bits per structural bin, then an isotonic lower envelope; bin width 2 bits, ≥ 5 records per null family for a valid bin. Caption and legend call the matched nulls "matched (spurious) controls", the abstract's term | main.tex §2 "Matched nulls and frontier"; abstract |
| Score | L_tot = L_struct + L_res(test) | main.tex §2 |
| Units of g | total residual bits on the split (not per example) | acceptance_core.py (gap = frontier.evaluate(structural_bits) − record["residual_bits"][split]); {planted,mini_ioi,gpt2_ioi}/scoring.py store "residual_bits" as split totals, beside a separate "residual_bits_per_example" |

## What is drawn to scale and what is schematic

- **To scale (1 world unit = 1 bit):** the height difference between the two stacks. The scriber's drop or rise from the frontier top to the candidate top is exactly g on the split being read, and the riser lifts the candidate by g_test − g_shift (S2 15.427, S3 34.676, S1 0) when the reader swaps to the shift split.
- **Schematic:** the absolute stack heights (base 7, structural block 20, frontier residual block 15). The frontier stack is the same physical stack for every setting and both splits; it stands for that split's frontier, the gauge's zero.
- **Scales:** the main scale's zero line sits at the frontier reading; one division is 2 bits with a long line every 10 bits. The vernier has 10 divisions of 1.8 over 9 main divisions, so it resolves a tenth of a division, 0.2 bits.
- **Counts exact, positions chosen:** the case always shows exactly the recorded number of blocks per setting and per (budget, family) group. Which slots inside a group empty first (cell by cell, model by model) is a layout choice; the paper reports counts, not cell identities.
- **Tray:** one reference block per valid structural bin, a test row and a shift row of three pockets; S3 leaves one pocket empty in each row.
- **Readout:** setting, cells recorded/unevaluable and valid bins (line 1), Δ in bits/example and supported classes (line 2), and the gauge reading of whatever stack the scriber rests on (line 3). It is computed from the parts' pose, so it only shows g once the scriber has settled on the candidate.

## The object

A vernier height gauge stands on a granite surface plate on a steel stand with levelling feet. To its left is the frontier stack: a fixed parallel with a structural-bits block and the 5th-percentile matched-null residual block for the same 2-bit structural bin. Beside it is the candidate stack on a screw riser: the same structural block with the candidate's held-out residual block, whose height changes with the setting. It is the one lit part; the frontier's residual block is `mid` like the structure, so the eye follows the candidate. The reader picks a setting on the three-detent selector (detents face the viewer: S1 right, S2 front right, S3 front), which swaps the candidate's residual block once the scriber is clear (an instant swap, no cross-fade), empties the case slots of the cells that setting logged as unevaluable and fills the tray with that setting's valid bins. The gauge then zeroes on the frontier stack, lifts its scriber, slides over and lowers onto the candidate: since a taller residual block means more residual bits, the scriber landing *above* zero reads a negative gap, and the reading is g_test. Swapping to the shift split turns the riser without re-stacking the blocks (no refitting), and the scriber reads g_shift. In S1 the scriber lands exactly on zero on both splits, as the planted oracle A★ does; in S2 it sits 0.155 bits high on test and 15.582 on shift; in S3 2.340 and 37.016. Support needs all three gates at once. The scriber shows gates 2 and 3 (it must drop below zero, g > 0, on test with a positive bootstrap bound and on shift); gate 1 is Δ on the readout: in every setting the best-bits class holds only the global best candidate, which lies outside the valid frontier bins, and the closest frontier-defined candidate sits Δ = 2.008 / 0.066 / 0.198 bits/example from it, outside the 0.01 gate.
