# Fig 12 · Gene force table · truth

Paper: *Structured Yet Fragile: Signed Intervention Geometry of Matched ORF and CRISPR Cell Painting Profiles*.
Repository: `signed-intervention-geometry-cell-painting`, official locked run
`offv1__featint__platectrl__thrA2_thrR2__z1p96__beta1p0`.

## The object

A physics force table stands on a levelling tripod on a bench. Two pulleys are clamped to its degree-ruled rim, each with an index tongue over the degree band. A string runs from the central ring over each pulley to a weight hanger with slotted masses: the left string is the gene's ORF profile and the right string its CRISPR profile. The angle between the strings is the signed cosine's z score against the activity-aware null. The masses are the difference in activity strength, hung on the stronger modality's string.

While the centre pin is in, it holds the ring at the centre. The release knob on the column collar draws the pin down flush with the table. The ring is then held only by a centring cord, which runs from an eyelet in the pin cap down the bore to a spring in the column. The ring settles, with one small overshoot, along the resultant of the hung masses, which for one loaded hanger is that hanger's string. The loaded hanger drops by the distance the ring travels, and the other hanger moves by the string geometry. The counter on the bench runs the 200 bootstrap resamples while the ring settles, and the green lamp lights when the label reached the 0.70 consensus.

Each new gene is set up in a fixed order. First the cord reels the ring back to the bore and the pin rises through it, which also resets the counter. Then the last gene's masses come off one at a time, each lifted and slid out sideways through its slot. Then the pulleys swing to the new string angle, the new masses go on one at a time, and the pin is pulled. The readout names the previous gene until its masses are off, and the new gene from the moment the pulleys swing for it. Dragging a pulley sets the angle by hand, and with the pin out the ring follows the loaded string. The readout then states the locked rule's threshold test for that angle and the gene's Δ. It never states a label, because the figure has no per-gene activity flags.

## Quantities shown, and where they come from

| Quantity | Value | Source |
|---|---|---|
| Analysed same-gene ORF/CRISPR pairs | 5,332 | `paper/main.tex` Table 1; `paper/source_data/figure1_dataset.csv` |
| Pairs active in both modalities | 2,552 | Table 1 (caption only) |
| Confident non-inactive final labels | 2,724 | Table 1 (caption only) |
| Final labels: ambiguous / asymmetric_CRISPR / asymmetric_ORF / inactive | 2,605 / 1,613 / 1,111 / 3 (48.9% / 30.3% / 20.8%) | §3.1; `paper/evidence/regime_prevalence.csv`. `build.mjs` checks that they sum to 5,332 and round to the printed shares |
| Activity thresholds | strength z ≥ 2.0, replicate z ≥ 2.0 | §2; `configs/analysis_official.yaml` (in `data.mjs`, not drawn) |
| Sign threshold | \|sign z\| ≥ 1.96 | §2; `configs/analysis_official.yaml`; `src/siggeo/geometry/regimes.py` |
| Asymmetry threshold | \|Δ activity\| > 1.0 | §2; `regimes.py` |
| Bootstrap | 200 resamples; the mode label is kept at consensus ≥ 0.70, otherwise the pair is ambiguous | §2; `configs/analysis_official.yaml`; `src/siggeo/geometry/signed_scores.py` (`final_label = consensus_label if bootstrap_consensus >= consensus_threshold else "ambiguous"`) |
| Per-gene sign z, Δ activity and final label for AKT3, FOS, NAT2, CCND1, KRAS, DHFR, ASGR1 | see `data.mjs` (full precision) | `paper/source_data/figure2_regime_map.csv`, rows copied unchanged |
| Primary-only agreement with the official run: no final centering / artifact sensitivity / interpretable pipeline | 0.951 / 0.994 / 0.758 | Table 1; `paper/evidence/pipeline_agreement.csv`, column `overall_agreement_primary_only`: final-label agreement over genes confident in both runs, inactive excluded (`src/siggeo/evaluation/confounds.py`, `compare_geometry_tables`) (caption only) |
| Plate-holdout final-label agreement | 0.868 | Table 1; `paper/evidence/confound_summary.csv` (caption only) |
| Significant Reactome terms, concentrated in the asymmetric regimes | 536 | Table 1, §3.3 (caption only) |

Δ activity is ORF strength z minus CRISPR strength z (`signed_scores.py`, `delta_activity`). "Activity-aware null" is the paper's own term (§2).

## How the table encodes them (drawing scales, stated in the legend)

- **String angle** = 90° − 20° × sign z: 90° at 0, narrower for a positive signed cosine, wider for a negative one. The ±1.96 sign threshold falls at 51° and 129°. None of the seven genes is clamped, and the build checks this.
- **Masses**: one slotted mass per 1.0 of Δ activity, the locked asymmetry threshold. The stronger modality's hanger carries the excess (ORF when Δ > 0, CRISPR when Δ < 0), with a thinner part mass for the fraction. A gene whose final label is inactive loads neither hanger, because the rule never compares strengths for it. The hangers count as tared.
- **Ring** with the pin pulled: the spring gives 1.1 table units per mass, so the settled ring lies 1.1 × |Δ| from the bore along the loaded string, capped at 10 (AKT3 reaches 9.1). `build.mjs` checks for every gene that the settled ring lies on its loaded string at that distance. The engraved circle around the bore marks |Δ| = 1.0: it sits at the ring's outer radius plus 1.1.
- **Lamp**: lit for every final label other than ambiguous, since only a mode that reached the 0.70 consensus keeps its label. The figure has no per-gene consensus fractions, so the readout says "≥ 0.70" or "< 0.70" and never prints a fraction.
- **Counter**: reset when the pin is seated. It counts 0 to 200 while the ring settles. The count is the protocol's resample count; the ring's path during the count is the spring's settling and stands for no per-resample number.
- **By hand**: dragging a pulley converts the new angle back to sign z on the same scale. The readout gives the threshold test `regimes.py` applies to that z and the gene's Δ: "|Δ| x > 1.0 · angle not used" when |Δ| > 1 (the rule returns inactive or an asymmetric label before it looks at the angle; which one also depends on the per-modality activity flags, which the figure does not have, so the readout names no label), "|sign z| < 1.96 · |Δ| x ≤ 1.0" or "sign z ≥ +1.96 · …" otherwise, and "inactive · strengths not compared" for an inactive gene.

The strength-decile prevalence shift (maximum 0.434, `paper/evidence/confound_summary.csv`) is known and not drawn.

## Readout lines

- seating (previous gene): `<gene> · seating pin` / `sign z · Δ`
- masses off (previous gene): `<gene> · pin in · masses off` / `sign z · Δ`
- new gene: `<gene> · pin in · setting strings`, then `· hanging masses`, then `· 200 resamples set` / `sign z · Δ`
- `<gene> · pulling pin`, then `<gene> · resample n / 200` / `sign z · Δ`
- settled: `<gene> · <final label> · <share of pairs>` / `sign z · Δ · consensus ≥|< 0.70` (the share is the label's: 48.9%, 30.3%, 20.8% of pairs, or 3 of 5,332 pairs for inactive)
- by hand: `<gene> · strings at N.N° = sign z ±x` / the threshold test above
