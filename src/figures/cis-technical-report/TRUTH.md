# Fig 22 · CIS · truth table

Paper: "CIS: A Deterministic, Offline-by-Default Compounding Intelligence Sandbox with Verifier-Gated Self-Improvement" (`docs/CIS_Technical_Report.pdf`, section numbers as printed in the PDF). Evidence bundle: `~/Developer/personal/aliuyar1234/cis-technical-report/evidence/` (`reports/iter-0000NN/{summary.md,metrics.json}`, `runs/run-*/run_record.json`).
Every number the figure shows lives in `data.mjs`; `model.mjs` derives the wells, the timeline and the readout from it, and `world.mjs` / `parts.mjs` draw from `model.mjs`.

## The object

A laboratory glove box on the family bench (low plate on three levelling feet, each a pad, a threaded stem and a hex nut; ruler strip; the AU-22 plate on its front edge). The sealed chamber, with a bolted window, two glove ports, a luminaire and a circulation filter on its roof, is the offline-by-default sandbox. A gas-tight feedthrough carries the chamber's record line out to a sealed record unit on the bench, whose slot holds the current run record card. On the back shelf inside stand four verifier boards with one well per visible task, lit green for the tasks the record on display passes, and beside them a locked compartment holding the hidden subset. A rail runs through the chamber with two seats: the champion's, over a hatch leaf hinged at the back of an opening with a chute under it, and the challenger's, under a verifier bridge with a gate lamp. Outside on the right, an antechamber is the only way in: an outer door with its own handwheel (boss, hub, three spokes, rim, spinner knob) and hinge, evacuation and purge valves, a vacuum gauge, and on the chamber wall the inner door's handwheel, coaxial with an interlock rod that runs along the antechamber in two lugs to a blind-bore keeper on the outer door's rim. A cross-slide transfer table holds the next challenger cartridge, the one lit part. What moves, and what the motion means: the outer door unclamps and swings open; the tray runs in to the bore and the challenger slides into the antechamber; the door closes, the antechamber is evacuated (gauge needle sweeps) and purged (the oil bubbler on the right wall vents); the inner handwheel turns once, which opens the inner door and screws the rod into the outer door's keeper, so the outer door is locked for as long as the inner door is open; the cartridge goes through to the challenger seat, the wheel turns back and the rod withdraws; the bridge scans every well (attempt_index 0, greedy decode). A well that turns red is a regression on a task that was passed before: the gate lamp turns red, the cartridge goes back out the way it came (the interlock turns again for it), and a new card with a red stripe prints into the record slot. With no regression the lamp turns green, the hatch leaf drops open, the old champion sinks into the chute, the leaf closes, the challenger rides on to the champion's seat and the card's stripe is green. Pressing the latch on the locked compartment makes it shake and blink red: the hidden subset stays sealed. B swaps the boards to the baseline record and back.

The inner door itself is not drawn. The antechamber bore is 48 long and 13.6 in radius; from the family camera (azimuth 45°, elevation 30°) its far end projects about 38 units from the mouth, while the mouth's opening reaches only about 8.3 units in that direction, and the chamber wall where the door sits is hidden behind the window frame. So the inner door shows the way a real glove box shows it from outside: by its handwheel and its interlock.

## Quantities

| Quantity | Value | Source | Where it shows |
|---|---|---|---|
| Base model | qwen2_5_coder_7b_instruct | §4.1 | caption, legend, aria label |
| Adapter type of every challenger | DoRA adapters (PEFT) on qwen2_5_coder_7b_instruct | §3.6 ("This paper reports results using DoRA adapters (PEFT) on the base model qwen2_5_coder_7b_instruct") | legend ("Challenger adapter cartridge (DoRA adapter on qwen2_5_coder_7b_instruct)") |
| PEFT settings of the champion | DoRA, rank 16, α 32, dropout 0.0 | §4.1 (`adapters/adapter-000075/checkpoint/adapter_config.json`); stated for adapter-000075 only | hold readout "champion adapter-000075 · DoRA r16 α32" |
| Champion adapter | adapter-000075 | §4.1, `reports/iter-000149/summary.md` | readout, caption |
| Previous champion | adapter-000069 | `reports/iter-000149/summary.md` ("promoted from adapter-000069"); it is the champion going into iter-000149, so the champion after iter-000148 (prev=iter-000148 in the same report) | readout of the iter-000148 record |
| Suites, total / hidden / visible tasks | core_code 8/1/7, core_math 10/2/8, core_logic 64/12/52, concept_understanding 32/6/26 | Table 1 (§4.2) | wells per board (7, 8, 52, 26) |
| Visible tasks in all | 93 | sum of Table 1 visible column | readout ("93 visible tasks"), caption |
| Hidden tasks in all | 21 of 114 | sum of Table 1 hidden and total columns | latch readout, caption |
| Hidden-subset access | only in sealed evaluator mode plus an unlock token; default evaluation excludes it | §1.1 item 2, §3.3 | locked compartment, latch readout |
| PASS@1, baseline iter-000021 | code 0.0000, math 0.1250, logic 0.5000, concept 0.0000 | Table 2 (§5.1), `reports/iter-000021/metrics.json` | B record: 0, 1, 26, 0 lit wells; readout; caption |
| PASS@1, champion iter-000149 | code 1.0000, math 1.0000, logic 0.8077, concept 1.0000 | Table 2 (§5.1), `reports/iter-000149/metrics.json` (core_logic 0.8076923…) | rest record: 7, 8, 42, 26 lit wells; readout; caption |
| Record before the promotion, iter-000148 | champion adapter-000069; core_logic Δ +0.0577 at iter-000149 | `reports/iter-000149/summary.md` ("promoted from adapter-000069", "Delta vs prev: core_logic=+0.0577 (prev=iter-000148)") | readout of the iter-000148 record: "iter-000148 · champion adapter-000069" / "Δ core_logic +0.0577 at iter-000149" |
| Wells lit for iter-000148 | 7, 8, 39, 26 | derived, not printed: the delta line names only core_logic, so the other suites are drawn as unchanged; 0.8077 − 0.0577 = 0.7500 = 39/52 (0.0577 = 3/52 exactly) | the boards while the promotion run starts from iter-000148; the readout shows the printed delta, not the derived rate |
| Promotion of iter-000149 | promote, max ΔPASS@1 0.0577 ≥ thresh 0.0500, regression_count 0 | `reports/iter-000149/summary.md` ("ok(max_pass_delta=0.0577, thresh=0.0500)"), `metrics.json` | gate readout, green lamp, green card stripe |
| Never-worse rule | any task passed before but failed by the challenger is a regression; promotion requires regression_count = 0 | §3.7 | red wells, red lamp, rollback |
| Rollback iter-000150 | adapter-000076, regressed on logic_sat_48 | §5.3, `reports/iter-000150/summary.md` (ERR-008) | one red well on the core_logic board, readout, caption |
| Rollback iter-000151 | adapter-000077, regressed on logic_sat_10 and logic_sat_44 | §5.3, `reports/iter-000151/summary.md` (ERR-008) | two red wells, readout, caption |
| Run records and seeds | d74cd05c seed 52010 (iter-000149), ec2875b8 seed 52011 (iter-000150), 9477cd3c seed 52012 (iter-000151) | §5.1, §5.3, `runs/run-*/run_record.json` | readout at the end of each run |
| DI50 of iter-000149 | 2.2083, CI95 [1.7033, 2.7133] | §5.2, `reports/iter-000149/summary.md` | tour readout while the champion holds |
| Offline configuration | sandbox.offline_default=true, models.allow_remote_downloads=false; network denied by default | §3.4 ("Network is denied by default"; the config values are those of the reported workspace) | readout while the antechamber is sealed |
| Evaluation | attempt_index 0, greedy decode, PASS@1 on the visible subset | §2.3, Table 2 caption, §4.4 | readout while the bridge scans |

## What is illustrative

- Well positions on each board are illustrative; the counts are exact (lit = round(PASS@1 × visible), which is exact for every record above). The three named tasks sit at wells 10, 44 and 48 of the core_logic board, inside the champion's 42.
- The vacuum gauge and the oil bubbler are the antechamber's state indicators (evacuated, purged). They carry no numbers and no scale.
- The timeline (seconds per phase) is pacing for the reader, not a measurement. Outside the gate, the paper does not state durations.
- The antechamber, its interlock (rod into keeper while the inner door is open) and the transfer are the object's way of showing that the challenger enters the offline sandbox through one sealed path (§3.4); the paper describes the sandbox's configuration, not a door mechanism.
- The sinking champion, the hatch and the printing card are the object's way of showing promotion and the run record; they are a model of the idea, not a claim about the implementation, which the paper withholds.
