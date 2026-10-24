// Fig 17 data the page needs: the settings, the near-optimal circuits and replicate picks of each synthetic run, and the
// GPT-2 rows. Run IDs and the diagnostics each run recorded are in runs.mjs, which only the build reads.
// snear: the near-optimal faithful circuits, each {aggr} plus the listed redundant nodes r<i>.
// rep: the circuit each of the R = 5 replicate discovery runs selected (r = 1 emits no certificate: SSS comes from run_record).
export default {
  S0: 1.0, // baseline_score_s0 in every synthetic run_record
  EPS_ABS_MIN: 0.0001, EPS_REL: 0.10, TAU_REL: 0.05, // epsilon = max(1e-4, 0.10·S0), tau = max(1e-4, 0.05·S0)
  RR_FAIL: 0.5, SSS_FAIL: 0.6, CC_FAIL: 0.5, // verdict thresholds; a certificate is emitted when any verdict is FAIL
  FACTORS: [1, 2, 4, 8],
  runs: {
    1: [{ snear: [0], SSS: 1 }, { snear: [0], SSS: 1 }, { snear: [0], SSS: 1 }, { snear: [0], SSS: 1 }, { snear: [0], SSS: 1 }, { snear: [0], SSS: 1 }],
    2: [{ snear: [0,1], rep: [0,0,0,0,0] }, { snear: [0,1], rep: [0,0,0,0,0] }, { snear: [0,1], rep: [0,0,0,0,0] }, { snear: [0,1], rep: [0,0,0,0,0] }, { snear: [0,1], rep: [0,0,0,0,0] }, { snear: [0,1], rep: [0,0,0,0,0] }],
    4: [{ snear: [0,1,2,3], rep: [0,0,0,0,0] }, { snear: [0,1,2,3], rep: [0,0,0,0,0] }, { snear: [0,1,2,3], rep: [0,0,0,0,0] }, { snear: [0,1,2,3], rep: [0,0,0,0,0] }, { snear: [0,1,2,3], rep: [0,0,0,0,0] }, { snear: [0,1,2,3], rep: [0,0,0,0,0] }],
    8: [{ snear: [0,1,2,5,6], rep: [0,0,0,0,0] }, { snear: [0,1,3,5], rep: [1,1,2,0,1] }, { snear: [0,1,4,6,7], rep: [0,0,0,0,0] }, { snear: [0,2,3,7], rep: [0,0,2,1,2] }, { snear: [0,1,4,5,7], rep: [0,0,0,0,0] }, { snear: [0,2,4,6], rep: [0,0,1,0,1] }],
  },
  // GPT-2 small, head_mlp granularity, I_ACTPATCH, G_ATTR_PATCH, N = 5 suite seeds (Table T2 ID, Table T4 OOD)
  gpt2: { components: 156, heads: 144, mlps: 12, ioi: { size: 124, RR: 0.36188089493959547, SSS: 0.6840180672829987, CC: 0.09871794871794873 }, induction: { size: 92.8, RR: 0.5865743666501636, SSS: 0.4082381844862226, CC: 0.010270967741935484 }, inductionOOD: { size: 17.6, SSS: 0.12853064441138262, RRseed: 0.9333333333333333, snearSeed: 2 } },
};
