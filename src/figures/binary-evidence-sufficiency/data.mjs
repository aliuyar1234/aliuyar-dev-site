// Fig 11 · the measured values, from the paper (sources in TRUTH.md). Every number the figure shows comes from here.
// AUROC is sufficient-vs-insufficient on the closed-book-negative (CBN) test subset of the primary
// HotpotQA run, Qwen2.5-7B-Instruct, linear probe. null = not reported in the paper.
// cells: the turret cells in index order; suff = the binary target the probe is trained on (not a per-cell reading).
// anchors: PROMPT_END, STEP1_END, STEP2_END. auroc[anchor][subset]: Table 1 (open) and §5.1 / Table A2 (title-masked).
// missingVsMisleading: Table A1, the three-way analysis, by anchor.
export default {
  model: "Qwen2.5-7B-Instruct",
  cells: [
    { name: "sufficient", long: "sufficient", suff: true },
    { name: "suff. noisy", long: "sufficient-noisy", suff: true },
    { name: "missing", long: "missing", suff: false },
    { name: "misleading", long: "misleading", suff: false },
  ],
  anchors: ["prompt end", "step 1", "step 2"],
  subsets: ["CBN", "correct-only", "wrong-only"],
  auroc: {
    open: [
      [0.958, 0.979, 0.956],
      [0.951, null, null],
      [0.952, 0.979, 0.939],
    ],
    masked: [
      [0.949, null, null],
      [null, null, null],
      [0.936, 0.959, 0.934],
    ],
  },
  baselines: { tfidf: 0.815, tfidfMasked: 0.762, correctness: 0.809, questionOnly: 0.5 },
  missingVsMisleading: [0.576, 0.543, 0.505],
  counts: { groups: 2006, variants: 8024, train: 1242, val: 376, test: 388 },
};
