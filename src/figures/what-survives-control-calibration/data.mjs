// Fig 15 data: the paper's full-scope results (Table 1, §3, Appendix B) and the locked candidate grid (§2).
// Sources: mdca-build-pack/paper/main.tex, paper/tables/*.tex, paper/paper_data.json (the audited summary the tables are built from).
export default {
  // §2 "Candidate family": 4 high-level models × 3 site budgets × 10 map-family/hyperparameter cells = 120 cells per setting
  models: ["H_true_other", "H_first", "H_second", "H_rep"],
  budgets: [1, 2, 4],
  families: [
    { id: "linear_dense", cells: 1 },
    { id: "linear_sparse_l1", cells: 3 },
    { id: "linear_lowrank", cells: 3 },
    { id: "mlp1_relu", cells: 3 },
  ],
  // §2 "Acceptance rule" and "Matched nulls and frontier"
  bestBitsGate: 0.01, // bits/example
  binWidth: 2, // structural bits per bin
  frontierQuantile: 0.05,
  // Table 1 (paper/tables/main_results.tex) with full precision from paper_data.json.
  // g = frontier − L_res, in residual bits on the split (acceptance_core.py, residual_bits totals); Δ in test bits/example.
  // unevaluable: logged unevaluable cells by "budget:family" (paper_data.json proposal_coverage, Appendix B table).
  settings: [
    {
      id: "S1",
      name: "S1 planted",
      recorded: 120,
      unevaluable: 0,
      bins: [3, 3],
      delta: 2.008,
      gTest: 0.0,
      gShift: 0.0,
      supported: 0,
      uneval: {},
      oracle: { gTest: 0.0, gShift: 0.0, lcb: 0.0 },
    },
    {
      id: "S2",
      name: "S2 mini-IOI",
      recorded: 116,
      unevaluable: 4,
      bins: [3, 3],
      delta: 0.066,
      gTest: -0.1548902260915881,
      gShift: -15.582107852061,
      supported: 0,
      uneval: { "4:linear_lowrank": 4 },
    },
    {
      id: "S3",
      name: "S3 GPT-2 IOI",
      recorded: 92,
      unevaluable: 28,
      bins: [2, 2],
      delta: 0.198,
      gTest: -2.3398500028846243,
      gShift: -37.015904391262076,
      supported: 0,
      uneval: { "4:linear_dense": 4, "4:linear_lowrank": 8, "4:linear_sparse_l1": 8, "4:mlp1_relu": 8 },
    },
  ],
};
