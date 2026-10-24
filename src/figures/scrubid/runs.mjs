// Fig 17 build-only data: the synthetic runs behind Table T1, in the order of data.mjs, with the diagnostics each run
// recorded, and the T1 means. build.mjs checks that the model recomputes every one of them.
// Source: ScrubID repo, outputs/paper_ready_gpt2_20260120_v6c/runs/<run>/{run_record,diagnostics,certificate}.json
// (EXP_SYNTH_REDUNDANCY_SWEEP_V1, generators G_ATTR_PATCH and G_MANUAL_SEED: the 24 runs T1 aggregates; the sweep's
// 12 G_RANDOM_K runs are not used).
export default {
  runs: {
    1: [
      { run: "run_20260120T115715Z_0006", template: "XOR", generator: "G_ATTR_PATCH", RR: 0, SSS: 1, CC: 0, cert: false },
      { run: "run_20260120T115715Z_0007", template: "XOR", generator: "G_MANUAL_SEED", RR: 0, SSS: 1, CC: 0, cert: false },
      { run: "run_20260120T115715Z_0018", template: "COMPARE", generator: "G_ATTR_PATCH", RR: 0, SSS: 1, CC: 0, cert: false },
      { run: "run_20260120T115715Z_0019", template: "COMPARE", generator: "G_MANUAL_SEED", RR: 0, SSS: 1, CC: 0, cert: false },
      { run: "run_20260120T115716Z_0007", template: "INDUCTION", generator: "G_ATTR_PATCH", RR: 0, SSS: 1, CC: 0, cert: false },
      { run: "run_20260120T115716Z_0008", template: "INDUCTION", generator: "G_MANUAL_SEED", RR: 0, SSS: 1, CC: 0, cert: false },
    ],
    2: [
      { run: "run_20260120T115715Z_0009", template: "XOR", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
      { run: "run_20260120T115715Z_0010", template: "XOR", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
      { run: "run_20260120T115715Z_0021", template: "COMPARE", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
      { run: "run_20260120T115715Z_0022", template: "COMPARE", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
      { run: "run_20260120T115716Z_0010", template: "INDUCTION", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
      { run: "run_20260120T115716Z_0011", template: "INDUCTION", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.6666666666666666, cert: true },
    ],
    4: [
      { run: "run_20260120T115715Z_0012", template: "XOR", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
      { run: "run_20260120T115715Z_0013", template: "XOR", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0001", template: "COMPARE", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0002", template: "COMPARE", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0013", template: "INDUCTION", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0014", template: "INDUCTION", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 1, CC: 0.8, cert: true },
    ],
    8: [
      { run: "run_20260120T115715Z_0015", template: "XOR", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8333333333333334, cert: true },
      { run: "run_20260120T115715Z_0016", template: "XOR", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 0.5333333333333333, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0004", template: "COMPARE", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8333333333333334, cert: true },
      { run: "run_20260120T115716Z_0005", template: "COMPARE", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 0.4666666666666666, CC: 0.8, cert: true },
      { run: "run_20260120T115716Z_0016", template: "INDUCTION", generator: "G_ATTR_PATCH", RR: 0.6666666666666667, SSS: 1, CC: 0.8333333333333334, cert: true },
      { run: "run_20260120T115716Z_0017", template: "INDUCTION", generator: "G_MANUAL_SEED", RR: 0.6666666666666667, SSS: 0.6, CC: 0.8, cert: true },
    ],
  },
  // Table T1 means per planted redundancy factor (mean over the three templates XOR, COMPARE, INDUCTION)
  T1: { 1: { RR: 0, SSS: 1, CC: 0, rate: 0 }, 2: { RR: 0.6667, SSS: 1, CC: 0.6667, rate: 1 }, 4: { RR: 0.6667, SSS: 1, CC: 0.8, rate: 1 }, 8: { RR: 0.6667, SSS: 0.7667, CC: 0.8167, rate: 1 } },
};
