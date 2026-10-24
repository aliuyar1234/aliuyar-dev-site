# Fig 2 · Criterion balance · truth table

Paper: *When Accuracy Hides Path Dependence: Criterion Fidelity in LLM Judges*
(`~/Developer/personal/aliuyar1234/criterion-fidelity-llm-judges/paper/main.tex`).
Every number the figure shows lives in `model.mjs`. The drawing, the motion, the lamps and the readout all read it from there, and `node build.mjs` re-derives every count from the paper's printed values before it writes anything.

## The object

A precision equal-arm balance on a bench, read like a weighing room instrument. Its two pans carry the two candidates of one criterion family (c1 left, c2 right). A shuttle in front holds the family's criterion cards at three stations: the base card, the two paraphrases clipped together in one holder (the paper scores them jointly, so they are never weighed apart), and the counterfactual. The punched hole is a card's meaning (left hole: c1 should win, right hole: c2 should win) and the printed lines are its wording, so the paraphrases share the base card's hole and change its lines, while the counterfactual keeps the lines and moves the hole. One weighing runs as a real balance does: the arrest pins rise and hold the beam level, the shuttle lowers the old card, slides and lifts the new one into the reader (the one lit part), whose sensing pin finds the hole; the reader drives a carriage along the rail above the beam through a cable, and the carriage's finger sets the poise on the beam; then the pins drop and the beam swings free to its reading. The tongue's rest is the selected judge's rate for that card on a scale whose centre is 50% and whose end stop is 100% toward the pan the card names, so a judge that ignores the counterfactual leaves the beam on the base card's side. The reader's console shows how often each variant's verdict flips when the candidates trade places (four sight gauges) and how often the judge picks the first-shown candidate (dial). A register at the back files the 600 test families into four stacks: right on the base card, right on base and both paraphrases, right on base and the counterfactual, right on all four. The rotary switch picks the judge. The lamps show whether the card's rate is above 50%.

## Counts behind every rate

BioRubric, frozen test split, n = 600 criterion families (Table 1 caption and §3: train/dev/test 2000/400/600). The model stores integer counts. Each one is the only integer that reproduces the paper's printed three-decimal value, and `build.mjs` fails if that stops being true.

| Count (of 600) | Llama-8B standard | Qwen-14B standard | Llama-8B strict | Qwen-14B strict | Derived from |
|---|---|---|---|---|---|
| right on base (BaseAcc × 600) | 436 (0.727) | 470 (0.783) | 346 (0.577) | 518 (0.863) | Table 2; §5 text for strict ("falls from 0.727 to 0.577", "rises from 0.783 to 0.863") |
| right on all four (GCF × 600) | 130 (0.217) | 299 (0.498) | 79 (0.132) | 402 (0.670) | Table 2; §5 text for strict |
| base and both paraphrases right (Inv@BC × base) | 338 (0.775) | 421 (0.896) | 234 (0.676) | 480 (0.927) | Table 2; strict = standard + ΔInv from the appendix strict-minus-standard table (−0.099, +0.031) |
| base and counterfactual right (Sens@BC × base) | 187 (0.429) | 348 (0.740) | 138 (0.399) | 440 (0.849) | Table 2; strict = standard + ΔSens, same table (−0.030, +0.109) |

For the strict rows the build searches every n from 0 to the base-right count for those with |n / base − (standard + Δ)| ≤ 0.0005; exactly one n fits each. The gaps quoted in the paper come out exactly: BaseAcc − GCF = 0.510 (Llama standard), 0.285 (Qwen standard), 0.193 (Qwen strict).

## Quantities shown

| Shown as | Quantity | Llama-8B standard | Qwen-14B standard | Llama-8B strict | Qwen-14B strict | Source |
|---|---|---|---|---|---|---|
| tongue, base card; readout | BaseAcc | 72.7% | 78.3% | 57.7% | 86.3% | counts above |
| tongue, paraphrase pair; readout | Inv@BC | 77.5% | 89.6% | 67.6% | 92.7% | counts above |
| tongue, counterfactual; readout | Sens@BC | 42.9% | 74.0% | 39.9% | 84.9% | counts above |
| register stacks; readout (GCF) | the four counts | table above | | | | counts above |
| gauge 1 | OrderDis, base | 94.5% | 29.3% | 100% | 21.8% | appendix table `tab:variant-order`, column Base |
| gauge 2 | OrderDis, lexical paraphrase | 93.2% | 15.8% | 99.7% | 14.5% | same, Para 1 |
| gauge 3 | OrderDis, structural paraphrase | 94.5% | 32.7% | 99.5% | 20.2% | same, Para 2 |
| gauge 4 | OrderDis, counterfactual | 95.8% | 38.8% | 99.8% | 24.7% | same, CF |
| dial | First-pos | 92.2% | 61.2% | 99.4% | 50.6% | same table, First-pos |

Definitions (§3): BaseAcc = share of families right on the base variant; GCF = share right on all four variants; Sens@BC = P(base right and counterfactual right) / P(base right); Inv@BC = P(base right and both paraphrases right) / P(base right), as in the repo's `metrics.py`; OrderDisagreement = share of logical variants whose AB and BA order-specific decisions disagree before mirrored-order aggregation; First-pos = share of order-specific decisions that pick the first-presented candidate. Para 1 is the lexical paraphrase and Para 2 the structural one: the repo defines the BioRubric variants as `("base", "para_lex", "para_struct", "counterfactual")` (`src/data/constants.py:53`).

The faithful reference is not a paper result. It is the definition of a criterion-faithful judge (§1, §3): right on every variant, so all four counts are 600 and every rate is 100%; its verdict never depends on order, so OrderDis is 0%; and because every variant is scored in both orders and it picks the same candidate both times, it picks the first-shown candidate in exactly half its order-specific decisions (First-pos 50%, by definition).

## Quantities in the caption

| Claim | Value | Source |
|---|---|---|
| Llama-3.1-8B BioRubric BaseAcc / GCF / Sens@BC, standard | 72.7% / 21.7% / 42.9% | Table 2 |
| Llama-3.1-8B BioRubric order disagreement, standard | 94.4% | Table 2, "Order dis." |
| Qwen2.5-14B BioRubric GCF, strict | 67.0% | §5 text ("gcf from 0.498 to 0.670") |
| Qwen2.5-14B strict gap BaseAcc − GCF | 19.3 points | §5 text ("the gap remains a substantial 0.193") |
| Llama-3.1-8B first-presented choice, standard → strict | 92.2% → 99.4% | `tab:variant-order`, First-pos; §6 text |
| Test families | 600 | Table 1 caption, §3 |

## How the model maps to motion

- `rateOf(judge, station)`: BaseAcc for the base card, Inv@BC for the paraphrase pair, Sens@BC for the counterfactual.
- `leanOf = side × (2 × rate − 1)` in units of full deflection, side +1 when the card's hole names c1 (left pan) and −1 for the counterfactual. Full deflection is a beam tilt of 14°. The scale has ten divisions to each end stop, so one division is 5 points of rate, the majors are 75% and 100%, and the zero mark is 50%. No reading reaches past a stop (`build.mjs` checks).
- The poise sits at −48 × lean along the beam, on the arm that goes down; the carriage moves it only while the arrest pins hold the beam level, and the beam's lean can never exceed what the pins allow at their current height (`arrestLimit`).
- Gauges: ten divisions, 10 points of OrderDis each. The gauges and their index dots for the loaded card are drawn brighter.
- Dial: First-pos, 0% to 100% across ±55°, 50% straight up, ten divisions.
- Register: stack height = count / 600 of the full height; twelve rules on the back wall and a seam on each stack every 50 families. The stack for the loaded card's rate is drawn brighter.
- Lamp: green when the rate is above 50%, red otherwise; both off during a weighing.
- Readout, three lines: judge and card; the card's rate with its count and denominator (and GCF on the base card); the loaded card's OrderDis and First-pos.

## What is not shown

The paper reports First-pos pooled over orders and variants and order disagreement per variant; it does not report per-family, per-order verdicts. So the figure does not weigh each order separately or show which candidate a judge picked in a given order; order dependence is read on the gauges and the dial instead. QA-Key (Table 2: gaps 0.017 and 0.028), tie rates, the failure-audit taxonomy and the order-stable subset are not drawn.
