// Real values only. Per-gene rows are copied from paper/source_data/figure2_regime_map.csv
// of the signed-intervention-geometry repository (official locked run
// offv1__featint__platectrl__thrA2_thrR2__z1p96__beta1p0): gene symbol, sign_z,
// delta_activity (ORF strength z minus CRISPR strength z) and the final regime label.
export default {
  genes: [
    { id: 10000, symbol: "AKT3", z: -1.1854635904853557, delta: -8.245890226918156, label: "asymmetric_CRISPR" },
    { id: 2353, symbol: "FOS", z: 0.7487025615233346, delta: 4.626574470312795, label: "asymmetric_ORF" },
    { id: 10, symbol: "NAT2", z: -0.6075758612015009, delta: 0.41515824541861157, label: "ambiguous" },
    { id: 595, symbol: "CCND1", z: 3.0574484510384794, delta: 5.42306561612385, label: "asymmetric_ORF" },
    { id: 3845, symbol: "KRAS", z: 0.04698291668530337, delta: -5.863870628135421, label: "ambiguous" },
    { id: 1719, symbol: "DHFR", z: -2.952559336298096, delta: -4.940210604483081, label: "asymmetric_CRISPR" },
    { id: 432, symbol: "ASGR1", z: 0.46228729292631954, delta: -4.216218974638434, label: "inactive" },
  ],
  // Locked thresholds (paper §2; configs/analysis_official.yaml).
  locked: { strengthZ: 2.0, repZ: 2.0, signZ: 1.96, asymmetry: 1.0, bootstraps: 200, consensus: 0.7 },
  // Table 1 and §3.1; evidence/regime_prevalence.csv.
  totals: {
    pairs: 5332,
    activeBoth: 2552,
    confident: 2724,
    regimes: { ambiguous: 2605, asymmetric_CRISPR: 1613, asymmetric_ORF: 1111, inactive: 3 },
  },
};
