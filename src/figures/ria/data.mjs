// Fig 21 data: every number the press shows, with its source in the RIA paper and repo (see TRUTH.md).
// The cell is the paper's headline setting: Llama-3-8B (instruct) on the 8-subject MMLU slice, template A, canon none.
export default {
  model: "Llama3-8B",
  task: "MMLU-8",
  n: 512, // slices/checksums.json mmlu_subset n_selected; the paired design keeps these 512 in every variant
  rows: 36820, // §4 "36,820 gated per-example rows"
  tableFloor: 4.12, // Table 1: the lowest listed top cell, so an unlisted cell has flip <= 4.12 %
  rhoRange: [0.072, 0.206], // abstract and Table 2
  noHarm: -2.734, // Table 5: canon_full CI low on clean inputs, Llama3-8B MMLU-8
  // per operator: flip % from Table 1 where listed (count = rate x 512), dAcc from the Fig 5 atlas
  ops: [
    { id: "O1", name: "curly apostrophe", flip: null, dAcc: -0.4 },
    { id: "O2", name: "curly double quote", flip: null, dAcc: -0.2 },
    { id: "O3", name: "hyphen to en dash", flip: null, dAcc: 0.2 },
    { id: "O4", name: "NBSP p30", flip: 9.18, count: 47, dAcc: 0.98 },
    { id: "O5", name: "tab p10", flip: 5.47, count: 28, dAcc: -0.2 },
    { id: "O6", name: "soft wrap 80", flip: 7.23, count: 37, dAcc: 0.78 },
  ],
};
