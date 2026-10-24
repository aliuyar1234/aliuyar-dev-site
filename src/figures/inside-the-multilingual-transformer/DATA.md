# Data for the multilingual-transformer figure

Paper: *Attention-Side Transformer Computations Organize Shared Multilingual Brain Alignment during Naturalistic Story Listening* (Ali Uyar, DOI 10.5281/zenodo.19185601).
Source repo: `~/Developer/personal/aliuyar1234/multilingual-transformer-neuroanatomy` (read-only, never modified).
The paper PDF in the repo (`paper/attention-side-transformer-brain-alignment.pdf`) and the site copy (`public/papers/inside-the-multilingual-transformer-computational-neuroanatomy.pdf`) are byte-identical (sha1 `c237021a…`). The repo README uses an older title ("Inside the Multilingual Transformer: Computational Neuroanatomy of …"). The PDF title above is the current one.

`data.mjs` is generated. Do not edit it by hand. To rebuild it, run the two scripts in `…/scratchpad/site/brain-data/inside-the-multilingual-transformer/`:

1. `decode_figs.py <repo>` reads the vector figure PDFs and writes `decoded.json`. Its validation report is described below.
2. `build_data.py <repo> <data.mjs>` reads the tables, manifests, configs and `decoded.json`. It asserts every headline number against the paper text and fails on any mismatch.

## Global conventions

- **Quantization.** Every float is rounded to 6 significant digits. The exceptions are p-values (4 significant digits), per-subject effects in `decoded.subjectEffects` (5 significant digits) and the `headline` aggregates (rounded to the precision the paper prints). Nothing is resampled.
- **Blocks.** Block indices are **zero-based, 0–11**, as in the paper's heatmap axes ("Block 0 … 11"). Normalized depth = `block / 11` (`extract_internal_states.py`: `block_index / (n_blocks - 1)`).
- **z.** z is the Fisher-z of the held-out Pearson r between predicted and observed ROI-average BOLD. It is averaged over the 9 leave-one-run-out outer folds (`encoding.primary_score: mean_outer_fold_fisher_z`).
- **Δz.** Δz = z(SHARED) − z(SPECIFIC). SHARED is the mean of the two non-target-language sentence vectors. SPECIFIC is the target-language residual, orthogonalized against SHARED (paper Eqs. 1–4).
- **State families** (`run_primary_tests.py`): attention-side = `ATTN` + `POST_ATTN`; FFN-side = `FFN` + `OUTPUT`.
- **Key casing.** Models are `xlmr` and `nllb`, languages `EN`/`FR`/`ZH`, families `SEMANTIC`/`AUDITORY`/`CONTROL`. These are the repo's own key spellings.

## Fields

### `paper`
| key | source | notes |
|---|---|---|
| `participants` | `table01_sample_summary.csv` sum of `n_subjects` | 94 |
| `runsPerCohort`, `trSec` | `conf/base.yaml` `dataset.canonical_runs`, `tr_seconds`; table01 `n_runs`, `TR` | 9 runs, 2.0 s |
| `alignedTriplets` | `data/manifests/triplets.parquet` row count | 1323 aligned EN/FR/ZH sentence triplets |
| `tokenSubsetTriplets` | `triplets.parquet`: first 15 triplets per canonical run (`attribution.token_subset.triplets_per_run: 15`, `compute_word_attributions._build_token_subset_manifest`) | 135 triplets used for attribution and deletion |
| `permutations`, `bootstraps`, `holmFamily` | `conf/stats.yaml`; table03 `permutation_count`, `bootstrap_count`; paper §5.5 "Holm correction across 12 model-language hypotheses" | |

### `units`
These are plain-language unit strings for the readout. Each is derived from the code paths cited in the sections below.

### `models`
| key | source |
|---|---|
| `id`, `hidden`, `blocks`, `outputParity`, `cacheMB` | `table02_model_state_inventory.csv` columns `model`, `hidden_size`, `n_blocks`, `output_equivalence`, `cache_size_summary` (MB number parsed) |
| `states` | table02 `states_extracted`, reordered from the table's alphabetical order to the block order ATTN, POST_ATTN, FFN, OUTPUT |
| `hf` | `conf/models.yaml` `hf_id` |
| `name`, `norm` | Name from the paper and research.json. `norm` (post-LN XLM-R, pre-LN NLLB encoder) comes from the hook layout in `src/features/extract_internal_states.py`. |

### `states`
These are the four retained internal states per block. The hook descriptions come from `extract_internal_states.py` (`StateCaptureController.__enter__`).
- **XLM-R hooks.** `ATTN` = `layer.attention.output.dropout`. `POST_ATTN` = `layer.attention`. `FFN` = `layer.output.dropout`. `OUTPUT` = `layer`.
- **NLLB hooks.** `ATTN` = `self_attn`. `POST_ATTN` = pre-hook on `final_layer_norm`. `FFN` = `fc2`. `OUTPUT` = `layer`. For the last block, OUTPUT is replaced by `hidden_states[-1]`.
- **INPUT.** INPUT exists in the code but **was not swept**. Its row in the fig03 heatmap rasters is fully transparent (alpha 0), table02 does not list it, and `conf/base.yaml` puts it under `reference_state_names`.

### `cohorts`
- `lang`, `n`, `runs`, `meanRunSec` (seconds, 5 sig), `trSec` come from table01.
- `screened` and `excluded` come from `data/manifests/sample_manifest.parquet`. EN screened 49 participants and excluded 18 (`exclusion_reason = roi_runs=0;missing_roi_targets`). FR and ZH have no exclusions.

### `rois`
These are the 18 atlas ROIs from `data/manifests/roi_metadata.parquet`: `roi_code`, `roi_family`, `hemisphere`, `atlas_label` (Harvard-Oxford label) and `n_voxels` (voxels in LPPC derivative space). `templates/roi_families.yaml` lists the same ROIs but uses `L_TP`/`R_TP` where the run used `L_TemporalPole`/`R_TemporalPole`. The data uses the run's names.

### `tests` (primary confirmatory H1/H2, 12 rows)
- **Columns.** The source is `table03_primary_confirmatory_stats.csv`, mapped as follows: `effect` = `effect_mean`, `ci` = [`ci_low`, `ci_high`], `pRaw` = `p_raw`, `pHolm` = `p_holm`, `n` = `n_subjects`. `hyp` is H1 for `H1_semantic_ffn_preference` and H2 for `H2_auditory_attention_preference`. `holmSig` = `p_holm < 0.05`.
- **H1 effect.** For each subject: the mean Δz over FFN+OUTPUT states (all 12 blocks, family-mean over the 8 semantic ROIs) minus the same mean over ATTN+POST_ATTN states. The table gives the mean over subjects (`run_primary_tests._hypothesis_rows`).
- **H2 effect.** Attention-side minus FFN-side, over the 6 auditory ROIs.
- **p.** One-sided (planned direction) sign-flip test: p = (1 + #{perm ≥ obs}) / 10001, so the floor is 9.999e-05. Holm runs across all 12 rows.
- **ci.** 95% percentile bootstrap over subjects (10,000 resamples).
- **Units.** Δz (Fisher-z). Negative H1 favours attention-side states. Positive H2 favours attention-side states.

### `reverseTests` (6 rows, post hoc)
The source is **paper text only**: Table B.4 ("Exploratory reverse-direction semantic tests …"). No CSV in the repo contains these rows. The values are typed in exactly as printed, in the paper's row order.
- **Consistency check.** `build_data.py` asserts that each `effect` equals −H1 `effect_mean` and each CI equals the negated, reversed H1 CI, both rounded to 4 dp. All 6 rows pass.
- **Caveat.** The printed Holm p of 3e-05 is below the 1/10001 floor of a 10,000-permutation test, and the paper does not state the permutation count for these post hoc tests. Quote these p-values as printed.

### `winners` (representative settings, 12 rows)
- **Source.** `table04_representative_roi_summaries.csv`. `block` = `representative_block`, `state` = `representative_state`, and `rois[roi]` = {`shared_mean_z`, `specific_mean_z`, `delta_z_mean`}, all in Fisher-z.
- **ROI stems.** `roi` is a stem. AG/IFGtri are listed for SEMANTIC and Heschl/pSTG for AUDITORY. Each value is the mean of the L and R hemisphere ROIs (`generate_all_tables.build_table04…`, groupby `roi_stem`).
- **Selection.** For each model×language×family, the winner (block, state) maximizes the subject-mean, family-mean Δz over **all** ROIs in the family: 8 semantic or 6 auditory, not just the two listed (`select_representative_states._choose_representatives`). Ties go to the shallower block, then to the state order ATTN, POST_ATTN, FFN, OUTPUT.

### `tokenMass` (10 representative SHARED settings)
- **Source.** `table05_token_class_attribution.csv`. `mass[class]` = `positive_mass` and `contentBias` = `content_bias`. `rows` is the number of class rows the table has for that setting.
- **Missing PUNCT.** `PUNCT` is `null` where table05 has no PUNCT row: nllb FR semantic, xlmr FR auditory and xlmr FR semantic.
- **Content bias.** contentBias = CONTENT mass / total mass over all classes present, including EDGE. This was verified in `build_data.py` for all 10 settings.
- **Attribution score.** The score is word-deletion occlusion (`compute_word_attributions._compute_for_representative_setting`). A word is deleted from one **source** (non-target) sentence. The sentence is re-encoded and the SHARED vector rebuilt. The score is the increase in mean squared prediction error over the triplet's local BOLD window: 2–12 s after onset (`local_window_*_offset_sec`).
- **Mass.** `positive_mass` = Σ max(score, 0) over all subjects × the 135-triplet subset × words in both source languages. The scale is arbitrary ("units used by the generated bundle", Table B.6). Compare masses only within a setting.
- **Token classes** (`_segment_words`). For Latin-script text: PUNCT is a punctuation-only token, EDGE is the first or last non-punctuation token, FUNCTION is a member of a fixed EN/FR stop-list, and everything else is CONTENT.
- **Chinese has no FUNCTION class.** Chinese is segmented per Han character into CONTENT, EDGE or PUNCT only. So every FUNCTION mass in an EN- or FR-target setting comes from its one Latin-script source language. The ZH-target settings (sources EN + FR) carry the most FUNCTION mass. Part of the lower ZH content bias is therefore built into the segmentation.
- **Scope.** Ten settings: all 6 semantic winners plus the 4 auditory winners whose H2 was positive with p_holm < 0.05 (`attribution.token_scope`: xlmr EN/FR/ZH, nllb ZH).

### `deletion` (20 rows)
- **Columns.** The source is `table06_deletion_validation.csv`: `k`, `topk` = `effect_topk`, `random` = `effect_random`, `diff`, `q` = [`ci_low`, `ci_high`]. `build_data.py` asserts that topk − random = diff.
- **Per-subject drop** (`run_deletion_validation._evaluate_subject_setting`). For each subject: base held-out Fisher-z minus the Fisher-z after deleting the top-k attributed words in every subset triplet. For `random`, the deleted words are matched-random, drawn 100 times and matched by language and token class. The table columns are means over subjects.
- **`q` is not a confidence interval.** `ci_low`/`ci_high` are `np.quantile(delta_diff, 0.025/0.975)` **over per-subject differences** (`build_table06_deletion_validation`): the spread across subjects, not a bootstrap CI of the mean. The paper's Table B.7 labels them "95% CI low/high". On the figure, label them as the subject 2.5–97.5% range, or as the paper's "95% CI" with that note.
- **k.** k ∈ {1, 2}: `conf/base.yaml` `deletion_ks: [1, 2]`, so the adaptive k=3 step never ran.

### `headline`
These are aggregates recomputed in `build_data.py` from the tables above. Each is asserted against the paper's printed value at the paper's precision. `headline.printed` holds the paper's exact sentences for the readout.

| field | computation | paper |
|---|---|---|
| `h1.meanEffect` | mean of 6 H1 `effect_mean` | −0.0083 |
| `h1.negative`, `ciBelowZero`, `holmSigPlanned` | counts | 6/6 negative, "all six confidence intervals lay below zero", 0/6 |
| `h2.meanEffect`, `positive`, `holmSig` | mean of 6 H2 `effect_mean`; counts | 0.0033; 5/6; 4/6 |
| `winners` | table04 state counts per family (2 ROI rows per setting) | semantic 4 attn / 1 post-attn / 1 output / 0 ffn; auditory 1 / 3 / 2 / 0 |
| `contentBias.semantic`, `.auditory` | mean of `content_bias` over table05 **rows** | 0.663 vs. 0.610 |
| `contentBias.semanticCellMean`, `.auditoryCellMean` | mean over the 6 and 4 settings | 0.667 vs. 0.615 (not printed) |
| `deletion.meanDiff`, `.semantic`, `.auditory`, `.k1`, `.k2` | means of `diff` | 0.0381; 0.0402 vs. 0.0350; 0.0294 → 0.0469 |
| `deletion.positive`, `.lowerBoundAboveZero` | counts of `diff > 0` and `ci_low > 0` | 20/20 (both) |

**Weighting caveat.** The paper's 0.663/0.610 content-bias means are **row-weighted**: each class row of table05 counts once. The three settings without a PUNCT row therefore weigh 3/4 as much as the others. Show 0.663 vs. 0.610 as printed. Do not present them as per-setting means.

### `decoded` (exact decode of vector figures; not from a CSV)
- **Why decode.** The repo does not ship the state-sweep result files that the depth figures were drawn from. These are `outputs/group_results/state_sweep_group_results.parquet` and `outputs/subject_results/*`, listed as "archived locally, not published" in `DATA_ACCESS.md`. A search of `/Users/user` found no copy.
- **Exactness.** `outputs/figures/fig04`, `fig05` and `fig09` are matplotlib vector PDFs. Their line vertices, bar edges and marker positions are written with 6–10 decimals in points (about 1e-10 in data units). They invert exactly through the axis tick positions.
- **Validation.** `decode_figs.py` checked the method against the figures whose source tables are on disk:
  - fig08 vs table06: 40 values, max |err| = 2.2e-10.
  - fig04 vs table03: the mean of the decoded subject dots and the decoded CI ends match `effect_mean`, `ci_low` and `ci_high`. That is 36 comparisons, max |err| = 6.6e-11. The dot counts equal `n_subjects` in all 12 cells.
  - fig05: the decoded x positions equal block/11 to within 3e-9.
- **Fields:**
  - `depth`: the 12 normalized depths, block/11.
  - `depthProfiles[roi][state]` (from fig05; roi ∈ AG, IFGtri, pSTG, Heschl): 12 group-mean Δz values (Fisher-z) by block. Each value is the mean over 2 models × 3 languages × 2 hemispheres (`_generate_fig05…`: groupby state × `block_depth_norm` over all rows with that ROI stem). It is **pooled**, not per model or language.
  - `roiMap[family][roi]` (from fig09): mean Δz per hemisphere ROI over models, languages, blocks and the 4 states (`_generate_fig09…`). This is descriptive only (paper Fig. A.8).
  - `subjectEffects["model.LANG.H1|H2"]` (from fig04, grey dots): per-subject H1/H2 effect values (Δz units). They are listed in `subject_id` order, because `primary_subject_effects.parquet` is sorted by model, language, hypothesis, subject_id. The same index in H1 and H2 of one model.language is the same subject. Subject IDs are not included.

## Spot checks (data.mjs value ↔ paper text)

| data.mjs | value | paper quote |
|---|---|---|
| `tests` xlmr FR H2 | effect 0.00379988, ci [0.00171929, 0.00596416], pHolm 0.007199 | Table B.3: "XLMR FR H2 auditory attention preference 0.0038 0.0017 0.0060 0.007199" |
| `tests` nllb EN H1 | −0.00991294, [−0.0128069, −0.00701492], pHolm 1 | Table B.3: "NLLB EN H1 semantic FFN preference -0.0099 -0.0128 -0.0070 1" |
| `tests` nllb ZH H2 | 0.00484793, pHolm 0.005 | Table B.3: "NLLB ZH H2 … 0.0048 0.0026 0.0070 0.005" |
| `winners` xlmr FR AUDITORY | block 7 POST_ATTN, pSTG shared 0.16706 / specific 0.0499865 / Δ 0.117074 | Table B.5: "XLMR FR Auditory 7 POST-ATTN pSTG 0.1671 0.0500 0.1171" |
| `tokenMass` xlmr EN AUDITORY | CONTENT 60.9642, contentBias 0.688708 | Table B.6: "XLMR EN Auditory SHARED Content 60.964 0.689" |
| `deletion` xlmr EN SEMANTIC k=2 | topk 0.0460155, random −0.00342519, diff 0.0494407, q [0.0371803, 0.0671403] | Table B.7: "XLMR EN Semantic 2 0.0460 -0.0034 0.0494 0.0372 0.0671" |
| `deletion` nllb ZH AUDITORY k=2 | diff 0.037965 | Table B.7: "NLLB ZH Auditory 2 0.0337 -0.0043 0.0380 0.0285 0.0478" |
| `cohorts` | EN 31 / FR 28 / ZH 35; EN meanRunSec 625.78 | §5.1 "31 English listeners, 28 French listeners, and 35 Chinese listeners"; Table B.1 "EN 31 9 625.8 2.0" |
| `models` nllb | hidden 1024, 12 blocks, PASS | Table B.2: "NLLB 1024 12 PASS ATTN, FFN, OUTPUT, POST-ATTN" |
| `headline` | all fields | asserted in `build_data.py` against the abstract and §2.2–2.5 (quotes in `headline.printed`) |
| `decoded.depthProfiles` maxima | AG: POST_ATTN 0.0593 @ block 10 (FFN max 0.0361); IFGtri: ATTN 0.0707 @ 8 (FFN max 0.0426); pSTG: POST_ATTN 0.0813 @ 9; Heschl: POST_ATTN 0.0535 @ 9 | Fig. 3 y-axes top out at 0.06 / 0.07 / 0.08 / 0.05; §2.3 "the highest curves are predominantly attn post-attn, or output rather than ffn" |
| `decoded.roiMap` order | AUDITORY R_pSTG 0.0549 > L_pSTG > R_aSTG > L_aSTG > L_Heschl > R_Heschl 0.0326; SEMANTIC R_AG 0.0445 > L_IFGtri > R_IFGtri > L_pMTG > L_TemporalPole > R_pMTG > R_TemporalPole > L_AG 0.0297; CONTROL max 0.0124 | Fig. A.8 bar order (identical, top to bottom); control axis tops at 0.012 |

## Headline numbers for the readout (as printed)

- 94 participants (EN 31, FR 28, ZH 35), 9 runs per cohort, TR 2.0 s. Two encoders: XLM-R-base and the NLLB-200-distilled-600M encoder. Each has 12 blocks × 4 states (attn, post-attn, ffn, output).
- **H1, semantic FFN preference: failed.** The paper puts it as "all six semantic model-language contrasts were negative (mean effect −0.0083; 0/6 Holm-significant in the planned direction)". All six CIs lie below zero.
- **Reverse direction (post hoc): 6/6.** All six semantic cells favour attention-side states after Holm correction. Effects run from 0.0055 to 0.0099 (Table B.4).
- **H2, auditory attention preference.** "positive in 5/6 cells and Holm-significant in 4/6 (mean effect 0.0033)". The significant cells are XLM-R EN 0.0066 (p_holm 0.0012), FR 0.0038 (0.0072) and ZH 0.0073 (0.0022), plus NLLB ZH 0.0048 (0.005).
- **Representative winners.** Semantic winners are 4 attn, 1 post-attn and 1 output, with no ffn. Auditory winners are 1 attn, 3 post-attn and 2 output, with no ffn. The winners sit at blocks 7–11.
- **Content bias.** Semantic 0.663 vs. auditory 0.610 (descriptive).
- **Deletion validation.** 20/20 rows are positive, with a mean top-k minus random difference of 0.0381. Semantic averages 0.0402 vs. auditory 0.0350, and the difference rises from 0.0294 at k = 1 to 0.0469 at k = 2.

## Not available (and what was done instead)

- **Full state × depth sweep per model × language × family** (the values behind paper Fig. 1, `fig03_state_depth_heatmaps`). There is no table and no result parquet on disk. The fig03 panels are embedded as 176×175 8-bit indexed rasters of the coolwarm colormap. Inverting them would give values only to about one of 256 colour steps, against a vmax that is not recorded. That is not exact, so **nothing from fig03 is shipped**. The closest exact per-depth data is `decoded.depthProfiles`, which is pooled over models and languages.
- **Fig. 1 does not show family means.** In the public plotting code (`generate_all_figures._generate_fig03…`), each heatmap cell is overwritten in ROI order. Each panel therefore shows the alphabetically last ROI of its family: **R_pMTG** for semantic, **R_pSTG** for auditory. It is not a family mean. If the figure reproduces Fig. 1, do not caption it as a family average.
- **Per-ROI values at the winners for TP, pMTG and aSTG, and per-hemisphere winner values.** table04 lists only the AG/IFGtri and Heschl/pSTG stems, as L/R means.
- **Per-depth values per model or language, CONTROL-family tests, the INPUT state.** Not computed or not released. INPUT was never swept.
- **Reverse-direction tests.** Only the paper's Table B.4 values, at 4 dp, exist. There are no raw p-values, no subject-level reverse table and no stated permutation count.
- **Word-level attributions and the fig06 example sentences.** `word_attributions.parquet` is not in the repo. fig06 is not usable: its text layer is garbled by a font-encoding problem, and each word is repeated once per subject.
- **`se` and `dz` per test.** Computed in `run_primary_tests.py` but dropped from table03.
- **ROI geometry (atlas volume, coordinates).** `roi_manifest.parquet` points to an `E:\` path. No atlas NIfTI is on disk, so the data carries only labels, hemisphere and voxel counts.
- **fig02 (output-state bridge baseline).** Not used. The paper's own Limitations section puts it out of scope.
