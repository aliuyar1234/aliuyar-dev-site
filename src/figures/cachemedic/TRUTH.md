# Fig 16 · CacheMedic++ · truth table

Paper: "CacheMedic++: Robust KV-Cache Stabilization via Self-Distillation". Repo: `~/Developer/personal/aliuyar1234/cachemedicpp-research`.
Every number the figure shows lives in `data.mjs`, and `model.mjs` / `world.mjs` read it from there.

## The object

A broadcast transcription turntable standing on the family bench (low plate on feet, ruler strip, the AU-16 plate lying on its front edge). The record is gpt2-medium's stored key/value cache, and the frozen tonearm and cartridge are the attention that reads it. A six-position selector picks the corruption type and a three-detent knob sets ε; both scales face the operator. The defect is pressed into the older part of the groove on 4 of the 16 groove rings, one ring per head: every token except the newest 32 for the five training types, positions 16–47 for the held-out overwrite. A grease-pencil cue bracket on the lead-in marks the newest 32 tokens. A light cleaning arm, hinged beyond the platter rim at 12 o'clock, carries the lit head: a row of twelve bristle tufts and a roller with end caps that span every groove ring radially. It is R_φ. It rides the groove 120° upstream of the stylus. While it is down, the stretch from the head to just past the stylus is drawn back on its ring with a heavier stroke (the restored groove), and the stylus reads that. Everywhere else the stored record stays as pressed, because the correction is computed per query at read time. The platter turns, so the defect is carried under the head and then past the stylus. Lifting the head crossfades the restored stretch back to the pressed groove. Cueing the tonearm moves the stylus in or out of the groove, and the readout follows: no score while the tonearm is up, and for the held-out type the paper's pair, no defense → CacheMedic++, at the current ε, with the side the head selects in full tone.

## Quantities

| Quantity | Value | Source | Where it shows |
|---|---|---|---|
| Base model (frozen) | gpt2-medium | `evidence/canonical/medium_contr/config_resolved.yaml` `model.name`; §5 | caption, aria label |
| Heads per layer | 16 | Fig. 4 caption ("heads 0–15", `04_metrics.tex`); gpt2-medium architecture | 16 groove rings |
| Repair operator | Option A, query-conditioned low-rank additive, V̂ = V + ΔV | §3.2 (`03_method.tex`) | cleaning arm, caption |
| Rank r | 4 | config `repair.rank`; §3.2 | legend key, caption |
| Applied to | V only | config `repair.apply_to: V` | legend key, caption |
| Protected layers | 10, 11 | config `repair.protect_layers` | legend key, caption |
| Training | self-distillation from the frozen model with a clean cache (KD + identity + contraction) | §3.3 | caption |
| Corruption types | gaussian, dropout_zero, orthogonal_rotation, bitflipish_sparse, quant_noise, contiguous_overwrite | §2 (`02_threat_model.tex`); appendix A | selector (6 detents), readout line 1 |
| Held-out type (LOTO) | contiguous_overwrite | config `eval.ood_protocol: loto_holdout_contiguous_overwrite`; Table 1 caption | longer detent mark, "held out" in readout |
| Gaussian | σ = ε·RMS (per head and timestep) | appendix A | readout line 2; only type whose drawn amplitude scales with ε |
| Dropout | p = 0.02 | config `corruption.params.dropout_p`; appendix A | readout line 2 |
| Orthogonal rotation | QR from rotation_seed = 999 | config; appendix A | readout line 2 |
| Bit-flip faults | p = 0.0005, jump 8.0 | config `bitflip_p`, `bitflip_eps_jump`; appendix A | readout line 2 ("p = 5e-4 · jump 8") |
| Quantization | 8-bit symmetric de/quant | config `quant_bits`; appendix A | readout line 2 |
| Overwrite window | positions [16, 48) | config `overwrite_window`; appendix A | the held-out defect's sector (45° of the record), with a jog at each seam; caption |
| ε grid (evaluation) | 0, 0.08, 0.16 | config `eval.corruption_eval.eps`; Table 1 caption | ε knob detents, readout |
| How ε acts | scales Gaussian noise only; the other five operators run at fixed settings once ε > 0 | `empty_dirs_for_codex/src/cachemedicpp/corruption.py` (`corrupt_gaussian` uses ε, `corrupt_contiguous_overwrite` does not); `eval.py` (`corruption_active = ε > 0`) | defect amplitude: Gaussian grows with ε, the others appear at full strength at 0.08 and stay at 0.16 |
| Time mask | old_only, N_recent = 32 | config `corruption.axes`; §2 | recent arc kept clean (45° of 256 positions), marked by the cue bracket; caption |
| Head mask | Bernoulli, p_h = 0.25 | config `corruption.axes.p_head`; §2 | defect on 4 of 16 rings |
| Sequence length | 256 | config `eval.max_seq_len` | one record turn = 256 positions |
| Score vs ε, no defense | 0.2373, 0.2400, 0.2426 | `evidence/canonical/medium_contr/metrics/task_metrics.json` `score_vs_eps.no_defense` | readout line 2, left of the arrow (full tone with R_φ off) |
| Score vs ε, CacheMedic++ | 0.2466, 0.2519, 0.2519 | same file, `score_vs_eps.cachemedic` | readout line 2, right of the arrow (full tone with R_φ on) |
| Score vs ε, best heuristic (smoothing) | 0.2373, 0.2453, 0.2466 | same file, `score_vs_eps.best_heuristic` | data only |
| Clean score | 0.2373 none and smoothing, 0.2466 CacheMedic++ | Table 1 (`table_main_results.tex`) | caption |
| Robustness AUC | 0.0384 none, 0.0390 smoothing, 0.0401 CacheMedic++ | Table 1; `task_metrics.json` `robustness_auc` | readout line 2 (none → CacheMedic++), caption |
| gpt2-large clean score | 0.2974 → 0.3001 | Table 8 (`table_second_model_results.tex`) | caption |
| gpt2-large AUC | 0.0472 → 0.0475 | Table 8 | data only |

## Drawing conventions (not paper quantities)

- The platter turns once every 16 s, slowed from 33⅓ rpm so the defect can be followed past the head. Record angle ψ = −2πt/256, so the stylus meets cache positions in increasing order.
- Drawn offsets are schematic. The largest offset is one groove pitch: the overwrite block sits a full pitch off its ring between two jogs, the rotation runs 0.75 pitch over, Gaussian noise peaks near 0.74 pitch at ε = 0.16 and half that at 0.08. Offsets carry the type's character (noise, notches, a uniform shift, sparse spikes, steps, a displaced block), not measured magnitudes.
- Readout line 2 for the five training types gives the operator's setting and no score, because the paper reports per-ε scores for the held-out type only.
- The pilot lamp is green while the stylus is in the groove. The head's 120° lead on the stylus, the belt drive and the bench are drawing choices.
