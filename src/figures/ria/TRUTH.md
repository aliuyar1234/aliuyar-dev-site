# Fig 21 · Cylinder proof press (AU-21)

Paper: *When Formatting Flips Answers: A Deterministic Atlas of Retokenization Sensitivity in LLM Evaluation* (RIA).
Sources: `retokenization-invariance-atlas/paper/ria-paper.pdf` (tables and figures as numbered in the PDF),
`paper/sections/*.tex`, `configs/tasks.yaml`, `ria/ops/operators.py`, `ria/ops/canonicalize.py`, `ria/analysis/aggregate.py`.

## The object

A hand-cranked cylinder proof press on a bench. The type bed holds a forme locked up in a chase with wooden furniture and
quoins: five lines of a multiple-choice question, a brass rule, and the four option lines. Picking a compartment of the sort
tray in front (one per operator O1 to O6) swaps that operator's sorts into the question: the plain sorts lift out, the lit
ones hang a beat above the same slots and drop in, and for O6 the question lines reflow from the soft break. Only question sorts are ever
swapped; the option lines and their labels stay as set. Cranking the press trips the cylinder to print, rolls the carriage
(impression cylinder, ink drum and two form rollers, feed board with a sheet, gripper bar) one full cylinder turn over the
forme and back, and delivers a proof to the board at the right end. At rest the carriage is parked with its form rollers
off the forme, over the left furniture, so every slot of the forme is in view. The proof carries one mark per gated MMLU-8 question
for Llama3-8B; the first k marks are red, where k is the number of answers whose option letter changed against the clean
forme in the paper's run. The canonicalize lever on the cabinet face maps every operator's forme back to one canonical forme,
so its proof is pulled without the mark grid (the paper gives no per-operator count under canon_full) and the readout shows the measured no-harm bound instead. The readout scores the proof on the
board: after a new pick or a lever throw it reads `<set> set · last proof <printed> <count>` until the next pull prints. The chase holds exactly the forme
that fits; the two green lamps are the paired no-truncation and semantics gates, lit because every one of the 36,820 rows
in the run passed both.

## Quantities shown, with sources

| Quantity | Value | Where it appears | Source |
|---|---|---|---|
| Cell shown | Llama3-8B on MMLU-8 (8-subject MMLU subset), template A, canon none | readout, proof, key, caption | Table 1 (top cells by flip-rate); the top three Llama3-8B MMLU-8 cells are O4, O6, O5 |
| Slice size | n = 512 MMLU-8 questions | proof (32 × 16 marks), key, readout | `slices/checksums.json` (`mmlu_subset.n_selected` 512) and `slices/mmlu_subset.json` (512 items), post-gate by `spec_v1_1.md` selection steps 4–5; BoolQ 512, ARC-C 291 in the other slices |
| O4 flip-rate, ΔAcc | 9.18 %, +0.98 pp | readout (rest), proof, caption | Table 1, row 1 |
| O6 flip-rate, ΔAcc | 7.23 %, +0.78 pp | readout, proof | Table 1, row 2 |
| O5 flip-rate, ΔAcc | 5.47 %, −0.20 pp | readout, proof | Table 1, row 5 |
| Flipped counts | 47, 37, 28 of 512 | readout, red marks | derived: 9.18 % × 512 = 47.0, 7.23 % × 512 = 37.0, 5.47 % × 512 = 28.0; ΔAcc +0.98 pp = +5/512 is consistent |
| O1, O2, O3 flip-rate | ≤ 4.12 % | readout; their proofs are pulled without the mark grid, since the paper gives no count | Table 1 lists the eight highest cells (`scripts/make_paper_assets.py`: `main_results` sorted by `flip_rate`, `head(8)`), lowest 4.12 % (Gemma2-2B ARC-C O5); Llama3-8B MMLU-8 O1–O3 are not among them |
| O1, O2, O3 ΔAcc | −0.4, −0.2, +0.2 pp | readout | Figure 5 (RIS/ΔAcc atlas), Llama3-8B MMLU-8 row, read at the figure's one-decimal labels |
| Canonicalization no-harm | CI lower bound −2.734 pp (shown −2.73) on clean inputs, canon_full | readout with the lever thrown | Table 5 (G8), Llama3-8B MMLU-8, full; the other non-MMLU cells are +0.000 |
| Gated rows | 36,820 = 1,315 examples × 2 models × 14 variants | caption, lamps | total: `setup.tex` l. 15 and abstract. Decomposition: the main run (`Makefile` targets `run_modelA_main`, `run_modelB_main`) logs `--operators CLEAN,O1,O2,O3,O4,O5,O6` × `--canon-policies none,full` = 14 rows per example and model; `docs/design/spec_v1_1.md`, "Deterministic slice selection", step 2 lists the variants (clean, O1–O6, canon_full of each operator variant, canon_full of clean = 14), steps 4–5 accept until N = 512, and the paired-design invariant keeps every accepted example in all variants for both models; `slices/checksums.json` `n_selected` gives 512 (BoolQ), 291 (ARC-C), 512 (MMLU-8), so 1,315 |
| TD-flip association | Spearman ρ from 0.072 to 0.206, positive in all six model-task settings | caption | Table 2 (G10); Spearman per `ria/analysis/aggregate.py` (`spearman_td_lcs_vs_flip`) |
| Operators | O1 curly apostrophe, O2 curly double quote, O3 in-word hyphen to en dash, O4 30 % of eligible spaces to NBSP, O5 10 % to tab, O6 soft wrap at 80 columns | tray, key | `ria/ops/operators.py` (k = floor(p · eligible spaces); O6 breaks at the last space once 80 columns are reached); method §3 |
| Scope | operators edit the scope text only: the question for ARC-C and MMLU-8, passage and question for BoolQ; options and template scaffold are rebuilt unchanged | lit sorts, key, caption | `ria/prompts/templates.py` (`build_prompt_from_scope`); `ria/ops/operators.py` ("Scope-only operator implementations") |
| Scoring | option letters scored by log-probability (teacher-forced fallback when option token lengths differ) | caption | `method.tex` l. 3 |
| Gates | no-truncation (max_seq_len 1024, safety_margin 32) and semantics, paired over every variant | lamps, chase | `configs/tasks.yaml`; abstract ("paired no-truncation/semantics gates") |
| Canonicalizer | canon_full maps curly quotes, dashes, NBSP, tabs and newlines back: canon_full(Oᵢ(x)) = canon_full(x) | lever, key | `ria/ops/canonicalize.py`; checked byte for byte on the figure's question for all six operators |

## The question in the forme

The question is illustrative, not a dataset item: *Which of the following best describes a "man-in-the-middle" attack on a
client's TLS session key exchange?* with four options. The swapped positions are what the paper's own
`apply_operator` returns for it under key `mmlu_subset|figure-21`: O1 [78], O2 [40, 58], O3 [44, 47, 51],
O4 [12, 69, 71, 92], O5 [96], O6 [80] (character indices). Every variant passes the semantics gate and canonicalizes back to
the clean text. The aggregate counts on the proof come from the paper's run, not from this one question; red marks are set
in reading order and do not mark particular questions.

## Mechanics

The cylinder has radius 13 and the carriage travels one circumference (2π · 13 = 81.7), so one pull is one full turn of the
impression cylinder. At rest its axis is at x = −59.45; the two form rollers (radius 3, 6.6 apart) and the ink drum resting on
both (radius 5.5) lead it, and the rollers' whole footprint ends at x = −34.25, left of the forme's first column (x = −34).
One turn carries the contact line to x = 22.23, past the forme's last column (x = 22), so the whole measure is printed.
The crank pinion (pitch radius 5) drives the cylinder gear (pitch radius 12), so the crank turns 2.4 times per pull. A pull lasts 6.4 s: trip lever 0.5 s, carriage out 2.6 s, delivery 0.9 s, lever back 0.4 s, home 2.0 s.
The proof on the board changes only when the cylinder has printed it.
