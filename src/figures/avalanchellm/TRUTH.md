# Fig 20 · Event cascade hodoscope

Paper: *Token–Layer Activation Event Cascades in LLMs: Rate-Matched Connectivity under Gain Scaling* (AvalancheLLM).
Sources: `AvalancheLLM/paper/latex/main.tex` (sections below), `paper/latex/tables/*.tex`, and
`paper/latex/tables/table_T01_SUMMARY.csv` (run `RUN_S05_ae9d76afcc57`, Qwen2.5-7B-Instruct, Dataset A).

## The object

A cosmic-ray hodoscope on a bench. Its frame holds rows of Geiger-Mueller tubes, each wired to a terminal strip, with an
indicator lamp at every tube end. The 8 × 16 lamp panel is a window onto the token-by-layer event lattice: rows are layers,
columns are tokens, and a lit lamp is an active site. Turning the knurled gain knob on the high-voltage supply scales every
block's MLP residual by g. While it turns, the discriminator trimmers at the end of the rows turn too, because each layer's
threshold is re-set so its event rate stays on its target for r*. The lit count per row is held at the g = 1.00 occupancy of the
condition: the paper matches the per-unit spike rate, not site occupancy, but the measured b_tot,perm (twice the
occupancy, to first order) moves by at most 0.0084 across g in any condition, so occupancy is nearly constant under rate
matching. What changes is how lit lamps join along tokens (b_time) and down layers (b_depth), and the coincidence meter on
the supply shows it: its needle reads b_tot, its faint reference pointer reads b_tot,perm, and the angle between them is
Δb. A turn through the grid moves the needle a few degrees (across the grid b_tot changes by 0.011 to 0.023, depending on the condition); the shuffle drops
it onto the reference pointer, and r* swings it across most of the scale. The guarded toggle shuffles token order within
each row, which gives the baseline Δb is measured against. The other toggle picks the spike definition, the small selector
picks r*, and the marker beside the gain dial shows g* for the condition that is set: the detent where the needle sits
nearest the 1.00 mark.

## Quantities shown, with sources

| Quantity | Value | Where it appears | Source |
|---|---|---|---|
| Model, layers | Qwen2.5-7B-Instruct, 28 layers | caption, key, 8 lamp rows | §4.1; T01 matches the "inst" columns of the replication table (appendix, `tab_replication_summary.tex`); F01 raster layers 0–27 |
| Tokens per sequence | T = 256 | key, caption | §6 limitations ("64 calibration sequences of length 256") |
| Event | X_{t,ℓ} = 1[Σ_i s_{t,ℓ,i} > 0], s = 1[z > τ_ℓ] (one-sided) or 1[\|z\| > τ_ℓ] (two-sided) | lit lamp, definition toggle | §3.1 |
| Rate matching | τ_ℓ(g) chosen per layer so E_{t,i}[s] ≈ r*; checked by max \|rate error\| across layers. In the code each layer's target r*_ℓ is its own rate at g = 1 and τ0 = 2.5, scaled so the layer mean is r*, so the figure says "its target for r*" | trimmers, key, caption; the max error in the caption | §3.2; `spec/04_RATE_MATCHING_PROTOCOL.md`, `avalanche_llm/phases.py` (r_star_l), `analysis/phase5.py` (max_err against r_star_l) |
| Target rates | r* ∈ {1, 2, 4, 8} × 10⁻⁵ | rate selector, readout line 1 | §4.2 |
| Gain grid | G = {0.70, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.30} | 11 detents on the gain dial | §4.2 |
| Gain intervention | h_{ℓ+1} = h_ℓ + Attn_ℓ(h_ℓ) + g·MLP_ℓ(h_ℓ) | gain knob, key, caption | §3.6 |
| Branching | b_time, b_depth: forward-neighbour activations per active site, over possible forward neighbours; b_tot = b_time + b_depth | meter needle, readout, caption | §3.4 |
| Null and Δb | within-layer token permutation keeping each layer's counts exactly; Δb = b − b_perm | shuffle toggle, meter reference pointer (b_perm) and its gap to the needle (Δb), readout | §3.5 |
| g* | argmin_g \|b_tot(g) − 1\| on Dataset A; one-sided 0.70 / 0.70 / 1.30 / 1.30, two-sided 0.85 / 1.00 / 1.30 / 1.30 for r* = 1, 2, 4, 8 × 10⁻⁵ | marker on the gain dial, "g*" in the readout | §3.6, Table 1 (`tab_gstar_summary.tex`) |
| Per-condition rows (88) | b_time, b_depth, b_tot, b_tot,perm, Δb_tot, avalanche count, max \|rate error\| for 2 definitions × 4 rates × 11 gains | meter, readout, aria status, lamp windows, caption | `table_T01_SUMMARY.csv`; Table 8 (`tab_t01_selected.tex`) prints the selected columns |
| Rest readout and meter | one-sided, r* = 4 × 10⁻⁵, g = 1.00: b_tot 1.102, b_tot,perm 0.876, Δb 0.226, 26,230 avalanches | static readout, needle and reference pointer | T01 |
| Avalanches | connected components of active sites under 4-neighbourhood adjacency, counted over the 64 sequences (`n_avalanches`, `n_sequences` = 64) | readout "aval.", lamp key | §3.3; T01 |
| Meter range | all 88 rows: b_tot 0.580–1.402, b_tot,perm 0.326–1.242, inside the 0.25–1.75 scale | meter scale | T01 |
| Caption values | one-sided, r* = 4 × 10⁻⁵: b_tot 1.109 (g 0.70) → 1.089 (g 1.30); Δb 0.233 → 0.210; avalanches 25,770 → 27,007; max \|rate error\| over the 11 gains 5.23 × 10⁻⁷ (at g 1.10) | caption | T01 / Table 8 |
| Rate-match tolerance | 5 × 10⁻⁴ | `data.mjs` only | T01 CSV column `rate_match_tol_abs` |
| Dataset B perplexity | 15.173 at g = 1; at g* 17.627 / 17.627 / 16.300 / 16.300 (one-sided), 15.746 / 15.173 / 16.300 / 16.300 (two-sided) | `data.mjs` only, not drawn | Table 2 (`tab_generalization_b.tex`) |

The readout has two lines. The first is the condition that sets every number: the spike definition (`1-sided` or
`2-sided`), r* and the gain (`g*` when the set gain is the calibrated one), plus `shuffled` when the null is on. The second
is what is measured for it: b_tot, Δb and the avalanche count (`aval.`), or, shuffled, `b_perm` (b_tot,perm) and Δb. The
aria status adds b_time and b_depth.

## Drawn, not data

- **Lamp windows.** The paper does not publish rasters per setting, so each 8 × 16 window is synthetic, built by
  `model.mjs` from a fixed seed. The lit count in each row is a binomial draw at occupancy b_tot,perm(g = 1) / 2. For a
  within-layer shuffled raster, b_time,perm and b_depth,perm are both about the occupancy. That count is held fixed for
  every gain of a condition: an approximation, since the paper matches the per-unit spike rate rather than site occupancy;
  the measured b_tot,perm varies by at most 0.0084 across g in any condition, so occupancy is nearly constant. Lamps then move within their rows until the window's own neighbour
  pairs match the measured b_time and b_depth, rounded to whole pairs, counted only over sites that have a forward
  neighbour inside the window. The g = 1.00 window gets a cold pass after its anneal, so it meets its own
  rounded pair targets in all 64 condition-window pairs checked. Each other detent starts from its neighbour toward g = 1.00,
  so a turn of the knob moves only the lamps that a change in the rounded targets asks for: at rest (window 0) the sweep from
  0.70 to 1.30 moves 4 lamps, all between g 1.10 and 1.15, where the measured b_time crosses half a pair. Over the first 32
  windows of each of the 88 conditions, the worst condition misses the measured b_time by 0.014 on average, b_depth by 0.017,
  and b_tot,perm for the shuffled window by 0.018.
- **Shuffled window.** A within-row permutation of the raw window, so every row keeps its count exactly. Of 24 seeded
  permutations, the one nearest the measured b_tot,perm is shown.
- **Trimmer angles.** The paper gives no τ_ℓ(g) values. Each trimmer turns with r*, the definition and g, deeper rows
  slightly more, to show that every row is re-set for every setting.
- **Dial geometry.** The gain pointer angle is linear in g over 270°, so the grid's uneven steps show as uneven detents. The
  meter is linear in b over 270°, 0.25 to 1.75, a tick every 0.05 and a major every 0.25, with 1.00 at the top; the dial
  is turned 36° on its panel so that its top faces the 54° camera and the needle's travel is not foreshortened. The
  needle moves as a damped movement (about 3 % overshoot); the reference pointer eases. The selector has four positions.
- **Supply front.** The mains rocker and fuse holder are period parts with no data behind them.
- **Window size.** 8 of 28 layers and 16 of 256 tokens. The caption says so.
