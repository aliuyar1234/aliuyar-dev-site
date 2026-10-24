# Fig 6 · Transformer patch bay: truth table

Paper: *Attention-Side Transformer Computations Organize Shared Multilingual Brain Alignment during Naturalistic Story Listening* (repo `multilingual-transformer-neuroanatomy`, PDF `public/papers/inside-the-multilingual-transformer-computational-neuroanatomy.pdf`). Every number comes from `data.mjs` (generated from the repo's tables and the paper's vector figures; see `DATA.md`). `model.mjs` derives what the figure shows, and the readout, caption, legend, aria text and moving parts all read from there.

## The object

A rack test bench. A card cage on the left holds twelve plug-in cards, one for each encoder block (0–11, left to right). Each card has a test strip on its top edge with four sockets, one for each retained internal state, back to front in signal order: attn (round), post-attn (square), ffn (hex) and output (oval). Each socket has two winner lamps in bezels in front of it (semantic left, auditory right). Each card's faceplate carries a level window with four bars, one per state in socket order, standing for the mean Δz of the four encoding meters at that tap, so the cage at rest reads as the paper's state × depth profile.

A lit patch plug sits in one socket. Its stiff lead rises well above the cage and runs over to a parked plug on a sloped meter console. On the console:

- Four encoding meters read the tapped state's Δz for AG and IFGtri (semantic) and for pSTG and Heschl (auditory).
- Two centre-zero meters read attention-side minus FFN-side Δz for the semantic and auditory families of the selected cell. A single cell shows its bootstrap 95% CI as a band; the six-cell mean has no CI and its band closes. A ▲ marks the pre-specified direction.
- Beside each centre-zero meter, a lamp grid (rows XLM-R, NLLB; columns EN, FR, ZH) shows which cells are Holm-significant: auditory for the pre-specified test, semantic for the post hoc reverse-direction test. The selected cell's lamp is ringed.

The selectors, both wired to the console's contrast section and not to the cage:

- A three-position bat toggle on a switch box on the apron selects XLM-R (left), both encoders (centre) or NLLB (right). Its cable lies along the bench to a gland on the console's front lip under the semantic contrast meter.
- A knob on the base of a small clear slice-stack brain model (AU-5's object in miniature: six acrylic plates on two posts, one etched axial contour each) selects the cohort: EN, FR, ZH or all. A cable runs from a boss on the base's visible face to the console's reference input. Centre and all are ganged: they are the one pooled position, the paper's six-cell mean.

What happens when it moves:

- When the plug is lifted out of a socket, the encoding meters fall to zero and the readout names the target tap with its values pending. When it is seated, the meters settle on the new tap and the readout fills in.
- When the selection changes, the centre-zero needles and bands move, the ring moves to the selected cell in each lamp grid, and the card lamps mark that cell's winning taps. At the pooled position the card lamps show every cell's winning taps at once: 12 winners, 9 lamps on 7 sockets, since some cells share a winner.

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| Encoders | XLM-R-base, NLLB-200 encoder | toggle, readout, caption | `data.mjs` `models` (table02, `conf/models.yaml`) |
| Blocks | 12 (0–11) | 12 cards | table02 `n_blocks`; zero-based as in paper Fig. 3 axes |
| Retained states | ATTN, POST_ATTN, FFN, OUTPUT | 4 socket shapes per card, 4 bars per level window | table02 `states_extracted`, reordered to block order; `extract_internal_states.py` hooks |
| Cohorts | EN n=31, FR n=28, ZH n=35; 94 participants | knob detents, aria text, caption | table01 `n_subjects` |
| Shared and specific parts | leave-target-out shared = mean of the other two languages' vectors; specific = orthogonalized target residual | caption | paper §5.3, Eqs. 1–3 |
| Δz at a tap | z(shared) − z(specific), Fisher-z of held-out r | 4 encoding meters, tap readout | paper Eqs. 1–4; `DATA.md` "Global conventions" |
| Encoding-meter values | 4 ROIs × 4 states × 12 blocks, range 0.0114–0.0813 | encoding needles, tap readout (e.g. b9 post-attn: Δz AG .058, IFGtri .063, pSTG .081, HG .053) | paper Fig. 3 vectors, decoded exactly (`decoded.depthProfiles`). Pooled over both encoders, three cohorts and both hemispheres; the paper has no per-encoder or per-cohort values per tap, so the selectors are not wired to these meters |
| Encoding-meter scale | 0 to 0.10 Δz | meter arcs, level windows | display choice that holds the largest value, 0.0813 |
| Level-window bars | mean of the four encoding meters at each of 48 taps, range 0.0142 (b0 output) to 0.0639 (b9 post-attn); attn or post-attn is the highest bar on all 12 cards, ffn the lowest on 9 | 12 × 4 bars on the faceplates, with graduations every 0.02 | `model.mjs` `LEVELS`, the plain mean over AG, IFGtri, pSTG and Heschl of `decoded.depthProfiles` |
| State families | attention-side = ATTN + POST_ATTN; FFN-side = FFN + OUTPUT | centre-zero meters, legend | `run_primary_tests.py`; `DATA.md` |
| Cell readout label | `attn−FFN Δz sem … aud …`: attention-side minus FFN-side Δz per family. Capital FFN names the family (ffn + output); lowercase ffn is the state | cell readout | paper Table B.4 column "Attention-FFN effect", Fig. A.6 axis "Attention-side minus FFN-side effect" |
| ROI symbols | AG, IFGtri, pSTG as in the paper; Heschl is written HG in the tap readout and the legend names both | tap readout, legend | paper Fig. 3 panel titles |
| Caption wording | "organized primarily around attention-side computations"; "winning tap" = the block and state with the highest family-mean Δz per cell and region family | caption | abstract ("organized primarily around attention-side and post-attention computations"); §5.6 and Table B.5 caption |
| Semantic contrast | attention-side minus FFN-side = −H1 effect. XLM-R EN +0.0090, FR +0.0063, ZH +0.0092; NLLB EN +0.0099, FR +0.0055, ZH +0.0097 | semantic centre-zero needle, cell readout `sem` | table03 `effect_mean` for `H1_semantic_ffn_preference`, sign flipped so that both meters read attention-side minus FFN-side |
| Semantic CI | negated, reversed H1 CI, e.g. XLM-R EN [0.0062, 0.0116] | semantic band | table03 `ci_low`, `ci_high` |
| Semantic planned direction | FFN-side (H1) | ▲ at the negative end of the semantic meter; caption | paper §5.5; table03 hypothesis name |
| Semantic post hoc test | attention-side direction, Holm (over the 6 semantic cells) p 0.00003 in 5 cells and 0.00065 in NLLB FR: 6 of 6 below 0.05 | semantic lamp grid, all six green; aria text | paper Table B.4 and §5.5 (as printed; see `DATA.md` caveat) |
| Semantic pre-specified test | Holm p = 1 in all 6 cells | aria text only; the needle's side against the ▲ shows the direction | table03 `p_holm` |
| Auditory contrast | H2 effect: XLM-R EN +0.0066, FR +0.0038, ZH +0.0073; NLLB EN −0.0027, FR +0.0002, ZH +0.0048 | auditory centre-zero needle, cell readout `aud` | table03 `effect_mean` for `H2_auditory_attention_preference` |
| Auditory CI | e.g. NLLB EN [−0.0053, 0.0001] | auditory band | table03 `ci_low`, `ci_high` |
| Auditory planned direction | attention-side (H2) | ▲ at the positive end of the auditory meter | paper §5.5 |
| Auditory pre-specified test | Holm (over 12) p: XLM-R EN 0.0012, FR 0.0072, ZH 0.0022, NLLB ZH 0.005 (green); NLLB EN and FR 1 (dark) | auditory lamp grid | table03 `p_holm` (`holmSig` = p_holm < 0.05) |
| Auditory counts | 5 of 6 positive, 4 of 6 Holm-significant | caption | `headline.h2` (asserted against the paper text in `build_data.py`) |
| Six-cell means | semantic attn − ffn +0.0083 (paper: H1 mean −0.0083), auditory +0.0033 | centre-zero needles at the pooled position, pooled readout | `headline.h1.meanEffect`, `headline.h2.meanEffect`; paper abstract and §2.2–2.3. No CI is printed for these means, so none is drawn |
| Centre-zero scale | ±0.015 Δz | meter arcs | display choice that holds every CI end (−0.0053 to 0.0128) |
| Holm families | 12 tests (6 cells × H1, H2); post hoc: the 6 semantic cells | legend | paper §5.5; `conf/stats.yaml` |
| Winning taps | semantic: 4 attn, 1 post-attn, 1 output; auditory: 1 attn, 3 post-attn, 2 output; 0 ffn; blocks 7–11. So 9 of 12 attn or post-attn, 3 output, none ffn | card lamps per cell; caption | table04 `representative_block`, `representative_state`; `headline.winners` |
| Per-cell winners | XLM-R EN b9 post-attn / b9 post-attn; FR b8 attn / b7 post-attn; ZH b8 attn / b8 attn; NLLB EN b8 attn / b10 output; FR b11 output / b10 output; ZH b9 attn / b10 post-attn (semantic / auditory) | card lamps | table04 |
| Stimulus | Le Petit Prince, 9 runs per cohort | caption | table01; `conf/base.yaml` |

## What the figure does not claim

- The encoding meters and the level windows show the pooled depth profile. The toggle and knob change only the contrast meters, the lamp-grid ring and the card lamps, because those are the only per-cell values the paper reports; their cables run to the console's contrast section, not to the cage.
- The level bars are a plain mean of four ROI curves the paper plots; the paper does not print this mean. The caption does not quote any count from them.
- The brain model and the reference cable stand for the measured BOLD signal. They show no values.
