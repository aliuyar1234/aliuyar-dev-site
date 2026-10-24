// The paper's numbers, exactly as printed (Uyar, "Robust Discover→Distill Under Poisoned Distillation Data").
// Rewards are raw clean mean reward on the 800 evaluation prompts; the paper's tables print them ×10⁻³.
export default {
  // §4 Experimental setup
  // (tasks: addition, sorting and string reversal)
  setup: { train: 4000, eval: 800, steps: 200, microBatch: 1, accumulation: 8 },
  // run_all.sh: Anchor-KL weight for the D2 runs (the D0 and D1 runs pass 0.0)
  anchorLambda: 0.1,
  // Table 1: poisoning and filtering statistics (N, poisoned, dropped by D1, final N)
  table1: {
    "random|0.3": { n: 4000, poisoned: 1213, dropped: 0 },
    "trigger|0.1": { n: 4000, poisoned: 414, dropped: 47 },
  },
  // Table 2: single-seed clean mean reward (×10⁻³) per setting and defense; trigger success 0.000 for every trigger run
  table2: {
    "random|0.0": { D0: 1.053, D1: 1.053, D2: 0.904, D3: 0.904 },
    "random|0.1": { D0: 1.678, D1: 1.678, D2: 0.845, D3: 0.845 },
    "random|0.3": { D0: 1.042, D1: 1.042, D2: 1.25, D3: 1.25 },
    "trigger|0.1": { D0: 1.836, D1: 2.401, D2: 0.942, D3: 1.425 },
  },
  // Table 3 and §5.1: two-seed mean ± std (×10⁻³) at the key stress points
  table3: {
    "random|0.3|D0": [1.803, 1.077],
    "random|0.3|D2": [2.27, 1.443],
    "trigger|0.1|D0": [2.305, 0.663],
    "trigger|0.1|D2": [1.151, 0.295],
  },
  // §5.2 and Figure 3a: trigger success under D0, D1, D2 and D3
  triggerSuccess: 0,
};
