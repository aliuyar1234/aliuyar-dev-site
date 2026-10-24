# Fig 7 · SOAR · truth table

Paper: *SOAR: Recovering Operational Overlays from Shared Semantics in Frozen Language Models* (repo `overlay-algebra`, TMLR sources in `paper/tmlr/`). Every number the figure shows lives in `data.mjs`; `model.mjs` reads it for the readout, `art.mjs` for the caption and legend.

## Quantities

| Quantity | Value in figure | Source |
|---|---|---|
| Frozen backbone | Qwen2.5-7B-Instruct | `sections/experiments.tex` l.11 |
| Adapter modules, LoRA rank, alpha | o_proj and down_proj, rank 16, alpha 16 | `sections/experiments.tex` l.11 |
| Seed | 17 (single seed; not shown in the drawing) | `sections/experiments.tex` l.11 |
| Test set | 10,554 filtered SQuAD 1.1 questions (`squad_jcq_v1`) | `sections/experiments.tex` l.7 |
| Residual | ΔR_k = TSVD_r(ΔF_k − β·ΔS) per module, in dense-delta space, ΔW = (α/r)·BA; S and F are trained, SOAR is the residual built from them | `sections/method.tex` l.38–53, eq. 2–3; `sections/abstract.tex` l.2 |
| β grid and choice | {0.5, 0.75, 1.0, 1.25}, both overlays β = 1.0, picked on validation | `sections/method.tex` l.55, `sections/experiments.tex` l.13 |
| Systems compared | prompt-only M0 + ΔS (contract in the prompt); direct M0 + ΔF_k; SOAR M0 + ΔS + ΔR_k | `sections/method.tex` l.59–65 |
| Scope | single-overlay recovery only; no pairwise or triple composition is claimed | `sections/method.tex` l.68, `sections/results.tex` l.63 |
| Evaluation | parser-based, deterministic, greedy decoding, no LLM judge | `sections/experiments.tex` l.17 |
| J · JSON strict valid: prompt / direct / SOAR | 0.0000 / 0.9986 / 0.9986 | Table 2 (`tab:main-results`, `sections/results.tex` l.31); unrounded 0.0 / 0.998579 / 0.998579 in `reports/paper_artifact_bundle_jq_m4/key_numbers.json` |
| J · answer F1: direct / SOAR | 0.8346 / 0.8344 | Table 2 l.31; 0.834623 / 0.834431 in `key_numbers.json` |
| J · recovery ratio | 1.0000 | Table 2 l.31; 1.0 in `key_numbers.json` |
| Q · quote exact: prompt / direct / SOAR | 0.0000 / 0.9413 / 0.9414 | Table 2 l.32; 0.0 / 0.941349 / 0.941444 in `key_numbers.json` |
| Q · answer F1: direct / SOAR | 0.8121 / 0.8122 | Table 2 l.32; 0.812098 / 0.812152 in `key_numbers.json` |
| Q · recovery ratio | 1.0001 | Table 2 l.32; 1.000101 in `key_numbers.json` |
| Prompt-only answer F1 (J and Q) | 0.0000 | Table 2's note (`sections/results.tex` l.37, PDF p.5: "Prompt-only answer F1 is also 0.0000 in both overlays"); supporting: `reports/full_single_overlay_study/metrics.json`, `overlays.{J,Q}.prompt_only_answer_f1` = 0.0 |
| "not explained by prompting alone" | caption wording | `sections/abstract.tex` l.4 |

"JSON strict" in the readout is Table 2's "JSON strict valid", shortened so the line fits at 390 px. "Within 0.0002" in the caption is the larger of the two F1 gaps (J: 0.8346 − 0.8344).

## What the parts mean

| Part | Stands for | Moves? |
|---|---|---|
| Lamp housing, Fresnel deck, post, projection head | frozen Qwen2.5-7B-Instruct (M0) | focus only |
| Base transparency on two registration pegs | scaffold adapter S | never |
| Overlay leaf J on its pin hinge (left) | residual R_J (strict JSON) | folds from flat on S to 110°, leaning back on its stop posts |
| Overlay leaf Q on its pin hinge (right) | residual R_Q (exact quotation) | folds from flat on S to 110°, leaning back on its stop posts |
| Two rubber-capped stop posts behind each hinge | where a raised overlay rests, off the stack | — |
| Both leaves raised | prompt-only control on S | — |
| Tray carriers F_J, F_Q (half-scale sheets) | direct adapters, the reference each stack is compared with | slide 30 units into the comparison position |
| Panel lamp at the end of each tray lane (on the tray's end block) | green: S + R beside its own direct adapter (Table 2 recovery 1.0000 / 1.0001); red: prompt-only S beside it (0.0000 against 0.9986 / 0.9413); off: carrier parked | — |
| Focus knob, rack and carriage | instrument control only; changes no number | head travel −5 … +6 units |

## Object and motion

An overhead projector stands on a bench: the lamp housing with its Fresnel stage, the folding post and the projection head stay fixed, as does the base transparency registered on two pegs, because the backbone is frozen and one scaffold S is shared by both overlays. Two overlay leaves on pin hinges along the stage edges carry the residuals R_J and R_Q; folding a leaf down lays one residual over the scaffold, which is exactly the SOAR system M0 + ΔS + ΔR_k, and the mechanism lets only one leaf lie down at a time, because the paper validates single-overlay recovery only (lowering the other leaf first lifts the one that is down). With both leaves up the stack is the prompt-only control. Sliding a direct adapter's sheet in from the tray puts the reference beside the stack, and the lane lamp and readout give the Table 2 pair: S + R against F reaches the direct adapter on the contract metric and on answer F1; prompt-only S scores 0.0000. The knob racks the head up and down to focus; it is there because the instrument has it, and it changes no number.
