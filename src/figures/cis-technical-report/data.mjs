// Fig 22 · every number the figure shows, with its source. See TRUTH.md.
// Paper: CIS technical report (PDF section numbers), evidence bundle in the cis-technical-report repo.
export default {
  model: "qwen2_5_coder_7b_instruct", // §4.1
  peft: { method: "DoRA", rank: 16, alpha: 32, dropout: 0.0 }, // §4.1, adapter_config.json of adapter-000075
  // Table 1 (§4.2): suite snapshots, total and hidden tasks
  suites: [
    { id: "core_code", short: "code", total: 8, hidden: 1 },
    { id: "core_math", short: "math", total: 10, hidden: 2 },
    { id: "core_logic", short: "logic", total: 64, hidden: 12 },
    { id: "concept_understanding", short: "concept", total: 32, hidden: 6 },
  ],
  // Table 2 (§5.1): PASS@1 on visible tasks, and the champion record one iteration before the promotion of iter-000149.
  pass: {
    "iter-000021": [0.0, 0.125, 0.5, 0.0], // baseline, reports/iter-000021/metrics.json
    "iter-000148": [1.0, 1.0, 0.75, 1.0], // core_logic 0.8077 − 0.0577 (iter-000149 summary: "Delta vs prev: core_logic=+0.0577"); other suites unchanged
    "iter-000149": [1.0, 1.0, 0.8076923076923077, 1.0], // champion, reports/iter-000149/metrics.json
  },
  champion: "adapter-000075", // §4.1
  di50: 2.2083, // §5.2
  ci95: [1.7033, 2.7133], // §5.2
  gate: { maxPassDelta: 0.0577, thresh: 0.05 }, // reports/iter-000149/summary.md: ok(max_pass_delta=0.0577, thresh=0.0500)
  prevDelta: { suite: "core_logic", value: 0.0577, prev: "iter-000148" }, // reports/iter-000149/summary.md: "Delta vs prev: core_logic=+0.0577 (prev=iter-000148)"
  config: { offline: "sandbox.offline_default=true", downloads: "models.allow_remote_downloads=false" }, // §3.4
  // §5.1 and §5.3, run records under evidence/runs
  runs: [
    { iter: "iter-000149", adapter: "adapter-000075", from: "adapter-000069", decision: "promote", regressions: [], run: "d74cd05c", seed: 52010 },
    { iter: "iter-000150", adapter: "adapter-000076", decision: "rollback", regressions: ["logic_sat_48"], run: "ec2875b8", seed: 52011 },
    { iter: "iter-000151", adapter: "adapter-000077", decision: "rollback", regressions: ["logic_sat_10", "logic_sat_44"], run: "9477cd3c", seed: 52012 },
  ],
};
