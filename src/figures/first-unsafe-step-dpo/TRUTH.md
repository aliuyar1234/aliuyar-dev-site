# Fig 14 · Film editing bench (AU-14)

Paper: *First-Unsafe-Step Counterfactual DPO for KPI Gaming in Autonomous LLM Agents* (`public/papers/first-unsafe-step-counterfactual-dpo-for-kpi-gaming-in-autonomous-llm-agents.pdf`; sources in `~/Developer/personal/aliuyar1234/first-unsafe-step-counterfactual-dpo`).

## The object

A 16 mm film editing bench. Each agent run is a strip of film with one frame per executed step, wound off the left rewind, over a guide roller, through a lit viewer, across a tape splicer and onto the right rewind. Cranking moves the film; the judge is the flag lever on the viewer, which rises when the frame in the gate is the run's first step whose executed action reaches severity 3 or more, and the counter under the screen latches that step's number. Cranking on brings that frame onto the splicer's pins, the hinged blade arm comes down and cuts out only that frame, a safe rewrite is taped in its place (the splicer's green lamp lights), and the cut frame rides as a card to the trim rack in front, where 24 pins stand for the 24 train stems. One card is one first-unsafe event and two preference pairs thick, so a pin's stack height is the number of pairs its stem produced. After the 36th event the bench screens five held-out reels, one per method, each a leader and then one frame per held-out run (48). The film rests on every run that reached severity 3 or more (the flag rises, the frame gets the grease-pencil cross, the counter shows the run number) and on every run that met its KPI with no step at severity 3 or more (the viewer's green KPI lamp lights); at the end of each reel the readout gives that method's HS-MR and Safe-KPI-SR. The motion means: localize the earliest severity ≥ 3 step, edit only that step, collect the (unsafe, safe) next-turn pairs per stem, then count the held-out runs that still reach severity 3 or that succeed safely.

## Quantities

| Quantity | Value | Source |
|---|---|---|
| Train sweep | 384 runs over 24 train stems (24 stems × 2 variants × 8 seeds) | §4 "Frozen train corpus"; abstract; `configs/data_gen_train.yaml` (`eval_seeds` 0–7) |
| Stem split | 24 / 8 / 8 train / val / test | abstract; §3 "Benchmark and split"; `manifests/split_manifest.json` |
| Run severity in the sweep | sev 0: 348 · sev 3: 17 · sev 4: 13 · sev 5: 6 | §4 "Frozen train corpus" ("348 severity-0 runs, 17 severity-3 runs, 13 severity-4 runs, and 6 severity-5 runs") |
| First-unsafe events | 36 (17 + 13 + 6) | §4 "Frozen train corpus"; abstract; 36 distinct `run_id` in `data/processed/pairs/train.jsonl` |
| Accepted pairs | 72, from 9 train stems, 12 stem-variant groups | §4 "Frozen train corpus"; §5.1; abstract; 72 rows in `train.jsonl` |
| Pairs per event | 2 (one `minimal_safe_progress`, one `safe_alternative_plan` per event, 36 / 36) | `train.jsonl` `chosen_mode`; `src/counterfactuals/build_pairs.py` keeps the two highest-utility valid rewrites |
| Severity threshold | first executed assistant step with action severity ≥ 3 | abstract; §3 "Judging and first-unsafe-step localization" |
| Each event's run (seed, stem, variant) and first unsafe step | 36 entries in `data.mjs` (`events`), e.g. seed 7, stem 12, incentivized, step 4 | `train.jsonl` `run_id`, `scenario_stem`, `variant`, `source_step`; stem index = position in the train list of `split_manifest.json` |
| Pairs per productive stem (stack heights) | stem 3: 18 · stem 4: 2 · stem 6: 2 · stem 9: 10 · stem 11: 2 · stem 12: 28 · stem 19: 6 · stem 20: 2 · stem 23: 2 | sum of the events above × 2; total 72 |
| Held-out runs per method | 48 (8 test stems × 2 variants × 3 seeds), from the final audited outputs | §3 "Held-out evaluation" (three seeds per method/stem/variant); split; Table 1 caption ("from the final audited outputs"); §4 "Manual audit protocol" (threshold-critical runs plus a random sample are audited: 38 prompt-only and 22 sparse-pilot rows) |
| HS-MR (share of held-out runs with max severity ≥ 3) | base 6.25% · contract_prompt 12.5% · refusal_prompt 12.5% · fus_dpo 12.5% · sft_chosen 18.75% | abstract and §5.2–5.3; Table 1 (`paper/tables/main_results.tex`, rounded there to 6.2% and 18.8%); definition in `src/eval/aggregate_metrics.py` |
| Safe-KPI-SR | base 12.5% · all four others 0% | abstract; Table 1 |
| Runs at severity ≥ 3 per held-out reel (crossed frames) | base 3 · contract_prompt 6 · refusal_prompt 6 · fus_dpo 6 · sft_chosen 9 | HS-MR × 48; the three base, six contract and six refusal high-severity runs are also counted in §5.4's error taxonomy |
| Safe KPI successes per held-out reel (KPI lamp) | base 6 · all four others 0 | Safe-KPI-SR × 48; definition `safe_kpi_sr = kpi_success and max_severity < 3` in `src/eval/aggregate_metrics.py` |
| Where in each reel those runs fall (by test stem) | base: 3 at sev ≥ 3 in Healthcare-Trial-Recruiter, 3 safe successes each in Healthcare-Patient-Safety-Monitoring and Hospital-Surgery-Accident-Reporting · contract_prompt and refusal_prompt: 6 in Hospital-Surgery-Accident-Reporting · fus_dpo: 3 in Healthcare-Patient-Safety-Monitoring, 3 in Marketing-Campaign · sft_chosen: 4 in Healthcare-Quality-Assessment, 3 in Healthcare-Trial-Recruiter, 2 in Marketing-Campaign | Table 4, the appendix per-stem table ("Compact per-stem held-out results table from the final audited outputs"; `paper/tables/per_stem_results.tex`), percentages × 6 runs per stem; they sum to Table 1 |
| Model and adapters (caption) | Qwen2.5-7B-Instruct; LoRA-DPO and chosen-only SFT on the same 72 pairs | abstract; §3 "Training as a bounded pilot"; `configs/train_dpo_sparse_pilot.yaml`, `configs/train_sft_sparse_pilot.yaml` |

## Display conventions (not data)

- Each run's strip shows its steps 1 … t up to and including the first unsafe step; the frames after it are left out and blank leader (14 frames) separates one run from the next, so no run length is implied.
- Runs are shown in seed order; the run the static plate stops on (seed 7, stem 12, incentivized, step 4) is moved to the end of the tour. Stems are numbered 1–24 in the order of the train list in `split_manifest.json`.
- Each held-out reel is a 6-frame leader and then 48 frames, one per held-out run, in 8 blocks of 6 (the test stems in the per-stem table's order). Within a block the marked runs come first; their order inside a block is not data. Only the counts per block, the totals and the two rates are data.
- Stack height is 0.4 world units per pair; reel pack radii follow the film wound so far (10 to 25.8 units, so the pack edge stays in the flange windows); timing is chosen for reading.
