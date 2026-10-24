// Fig 16 · CacheMedic++. Every number the figure shows, from the paper and its evidence bundle (see TRUTH.md).
export default {
  model: "gpt2-medium",
  // six corruption types (§2.2, App. A.2); the last is held out of training and used for evaluation (LOTO, §2.3, §5.1)
  types: [
    { id: "gaussian", spec: "σ = ε·RMS" },
    { id: "dropout_zero", spec: "p = 0.02" },
    { id: "orthogonal_rotation", spec: "QR seed 999" },
    { id: "bitflipish_sparse", spec: "p = 5e-4 · jump 8" },
    { id: "quant_noise", spec: "8-bit de/quant" },
    { id: "contiguous_overwrite", spec: "window [16, 48)" },
  ],
  heldOut: 5,
  eps: [0, 0.08, 0.16],
  nRecent: 32, // old_only: corrupt t < T − 32 (§2.1)
  pHead: 0.25,
  window: [16, 48],
  T: 256, // eval max_seq_len (config_resolved.yaml); sets the drawn arc lengths
  rank: 4, // r = 4 on V (§3.2)
  layers: [10, 11], // protected layers (App. A.1)
  // Score(ε) on held-out contiguous_overwrite (task_metrics.json score_vs_eps; Fig. 1)
  score: {
    none: [0.2373, 0.24, 0.2426],
    smoothing: [0.2373, 0.2453, 0.2466],
    medic: [0.2466, 0.2519, 0.2519],
  },
  // robustness AUC over ε ∈ {0, 0.08, 0.16} (Table 1)
  auc: { none: 0.0384, smoothing: 0.039, medic: 0.0401 },
  // gpt2-large, same protocol (Table 8)
  large: { clean: [0.2974, 0.3001], auc: [0.0472, 0.0475] },
};
