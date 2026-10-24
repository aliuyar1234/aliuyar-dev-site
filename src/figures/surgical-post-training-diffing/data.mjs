// Fig 9 · values from the paper (Table 1, Table 2, Sec 2-4) and the repo configs. TRUTH.md lists each source.
export default {
  pair: { A: "Gemma 3 4B PT", B: "Gemma 3 4B IT" },
  template: "Instruction:\\n{prompt}\\n\\nResponse:\\n",
  test: { n: 600, slices: 6, perSlice: 100 },
  layers: { mid: 16, late: 28 }, // configs/delta_module.yaml
  topK: 16, // configs/delta_module.yaml sparse_module.top_k
  capMaskFeatures: 5, // abstract, Sec 1, Sec 5
  bootstrap: 10000, // Table 2
  // Table 1, held-out test split; Cap CI from Table 2
  inserts: [
    { id: "none", name: "PT", kl: 1.256, cap: 0.0, capRec: 0.0, len: 47.38, verbCarry: 0.0 },
    { id: "full", name: "FullDelta", kl: 0.901, cap: 0.07, capRec: 0.186, len: 16.65, verbCarry: 0.923, capCI: [0.043, 0.098] },
    { id: "cap", name: "CapMask", kl: 1.255, cap: 0.0, capRec: 0.0, len: 47.38, verbCarry: 0.0 },
    { id: "vsub", name: "FullDelta − VMask", kl: 0.903, cap: 0.07, capRec: 0.186, len: 17.84, verbCarry: 0.886 },
  ],
  it: { kl: 0, cap: 0.377, capRec: 1, len: 11.92, verbCarry: 1 },
  klReductionPct: 28.3, // Sec 4.1
};
