// Fig 7 · SOAR. Every value the plate shows, from the paper (Table 2, §3.3, §4.1, §4.2)
// and reports/paper_artifact_bundle_jq_m4/tables/table1_single_overlay_recovery.csv in the repo.
export default {
  model: "Qwen2.5-7B-Instruct",
  lora: { rank: 16, alpha: 16, modules: ["o_proj", "down_proj"] },
  betaGrid: [0.5, 0.75, 1.0, 1.25],
  beta: 1.0,
  seed: 17,
  test: 10554,
  overlays: {
    J: { contract: "strict JSON", metric: "JSON strict", prompt: 0.0, direct: 0.9986, soar: 0.9986, promptF1: 0.0, directF1: 0.8346, soarF1: 0.8344, recovery: 1.0 },
    Q: { contract: "exact quote", metric: "quote exact", prompt: 0.0, direct: 0.9413, soar: 0.9414, promptF1: 0.0, directF1: 0.8121, soarF1: 0.8122, recovery: 1.0001 },
  },
};
