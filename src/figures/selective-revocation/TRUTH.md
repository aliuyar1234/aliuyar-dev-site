# Fig 3 · Card catalogue: what is true

Paper: *Selective Revocation and Replay: Post-Compromise Recovery of Explicit Persisted State*
(repo `selective-revocation-replay`, paper `paper/usenix_security26/main.tex`).
Every number the figure shows is in `model.mjs`; `art.mjs` and `live.js` only read it.

## The object

A card-catalogue cabinet on a bench is the agent's persisted memory. Each of the eight columns is one
task chain, and each drawer is one persisted memory record, its stack of cards being that record's
content: the top two drawers were written by the S1 writer call, the bottom one by the S2 writer. The
top drawer's stack is grey: it is the poisoned workflow note. A red lamp on the frieze of each column
is that chain's suspicious root, the S1 file read, which is given after S2. A bar hooked under it gangs
the two S1 drawers, because both records list that read among their parents. Turning the knob runs one
recovery method. Revoking pulls drawers out, so they leave active state, and the root lamp drops to a
low glow. Replaying is the key on the lid: it strokes once per replayed LLM call, the dial steps one
call per stroke, and as the last stroke lands the grey stack turns clean, because re-running the one S1
writer without the flagged read writes the note-free record. Then the same drawers slide back in. The
S2 drawer stays shut, because it does not descend from the root. Rollback pulls every drawer, strokes
the key nine times (the S1 and S2 suffix) and puts them all back. Full reset and revoke-only pull
drawers and leave them out, with no stroke. No recovery moves nothing. When S3 and S4 run, the dial
steps eight more calls and the lamp pairs on the lid show per chain whether the attack is gone (S3) and
whether the remembered fact is kept (S4). The figure shows that selective replay keeps what rollback
keeps for 9 calls instead of 17, while the methods that only discard state lose the fact.

Camera: azimuth 52° instead of the catalogue's 45°, so the long face of drawers, which carries the
mechanism, is seen more squarely. Elevation stays at 30°.

## Quantities

Deterministic artifact, retrieval memory, explicit attack, detection after S2, per chain c01 to c08.
All five methods give identical counts in all 8 chains except S4, which is listed per chain.

| Shown as | Value | Source |
|---|---|---|
| Columns | 8 chains: c01_travel, c02_procurement, c03_laptop, c04_office, c05_training, c06_pto, c07_vendor, c08_shipping | `results/raw/eval_results.csv` (`chain_id`); main.tex §Experimental Setup |
| Drawers per column | 3 persisted records at detection: 2 from the S1 writer, 1 from S2 | full_reset `revoked_object_count` = 3, selective_replay = 2 (eval_results.csv); writer code `src/llm_backend.py` `write_memory` (user_fact + workflow_note in S1, at most 2 items per call) |
| Grey stack | the S1 `workflow_note` taken from the malicious file | `src/llm_backend.py` `_extract_malicious_note`; main.tex §Results, travel case ("a poisoned workflow note ... and a benign remembered reimbursement-tier fact") |
| Replay output | the S1 writer re-run without the root yields user_fact + topic_fact, so both S1 drawers return clean | `src/llm_backend.py` `write_memory` (topic fact fills the second slot) |
| Selective replay | revokes 2, replays 1 writer event (1 key stroke), fallback 0, residual ASR 0, S4 per chain 10111011 (0.75), 9 extra calls | eval_results.csv; Table 1 (`artifact_table.tex`); `results/tables/tbl1_main_results.csv`, `tbl4_fallback_and_cost.csv` |
| Rollback | revokes 0 (restores the checkpoint before S1), replays the S1 and S2 suffix: 17 − 8 = 9 calls (9 key strokes), residual ASR 0, S4 10111011 (0.75), 17 extra calls | same; `replayed_writer_event_count` is 0 for rollback, so the strokes count calls, not writer events |
| Full reset | revokes 3, replays 0, residual ASR 0, S4 00000000, 8 extra calls | same |
| Revoke only (ablation) | revokes 2, replays 0, residual ASR 0, S4 00000000, 8 extra calls | same; `tbl3_ablation.csv` |
| Root delete | revokes 2, residual ASR 0, S4 0, 8 extra calls: identical to revoke-only on this cell, so the fourth detent serves both and its readout says "revoke only (= root delete)" | eval_results.csv `root_delete` rows |
| No recovery | revokes 0, residual ASR 1 in all 8 chains, S4 00000000, 8 extra calls | same |
| Dial | 0 to 20 extra LLM calls after detection, stepping one call at a time: the replay strokes, then the 8 calls of S3 and S4, which is why every method ends at 8 or more | `extra_llm_calls_after_detection` in eval_results.csv; main.tex §Metrics |
| Readout line 1 | method and phase; at the result: records revoked and writer events replayed per chain | `revoked_object_count`, `replayed_writer_event_count` |
| Readout line 2 | `ASR a · S4 s · +N calls`: residual S3 attack success rate, S4 retention, extra LLM calls after detection, in Table 1's own form (0, 0.75, 1). ASR and S4 read "–" until their lamps light | Table 1 column heads |
| Lid lamps | per chain: S3 lamp green when the attack no longer works (`residual_asr_s3` = 0), S4 lamp green when `s4_retention_correct` = 1 | eval_results.csv |

Not shown, but true for the same cell:

- S3 correctness is 10001111 (0.625) for every recovered method and 0 for no recovery.
- On summary memory, selective replay falls back to rollback in all 8 chains, at 17 calls.
- The stealth variant barely persists unrecovered, so the paper's main comparison uses explicit attacks.

Live confirmation, in the caption only (`results/model_pilots/live_confirmation_latest.json`,
`tbl5_live_confirmation.csv`; main.tex abstract and §Results): `qwen2.5:14b` on c01_travel and
c05_training, retrieval, explicit, 3 repeats each. All six unrecovered reruns kept residual ASR at
1.0; all six selective-replay reruns gave ASR 0.0 with S3 correctness and S4 retention at 1.0,
revoking 4 objects and replaying 2 writer events per chain with no fallback. The figure's motion uses
the deterministic matrix, not these runs.

## Caveats

- **Detection is assumed.** The suspicious root is given after S2, and the figure lights the root lamp at the start of every run.
- **The matrix is deterministic and heuristic.** The default artifact backend is the deterministic heuristic agent; scoring is rule-based.
- **The repo's current code does not reproduce the frozen numbers.** Running it on c01, c02 and c05 (retrieval, explicit, heuristic backend) gives selective replay 3 revoked, 2 replayed and 10 extra calls, against the frozen 2, 1 and 9. `src/agent_loop.py:300` (`_append_tool_trace`) sets the S2 tool results' `parent_ids` to every visible object, so the S2 record becomes a descendant of the root too. No commit history explains the change. The figure follows the frozen artifact the paper reports. The author should either restore the frozen provenance behaviour or re-freeze the matrix and tables, because the paper's Open Science section promises deterministic reproduction of the full matrix.
