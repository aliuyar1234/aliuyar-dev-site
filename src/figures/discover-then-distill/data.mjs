// Fig 18 · the paper's measured quantities. Every number the figure shows comes from here.
// Sources: Discover-Then-Distill (Uyar, 2026) and paper/04_results_registry.md.
//   heldOut, train, steps, rollouts, N (= 12 × 8), sdftSteps, minReward, replay   Table 1 (run profile)
//   kept, keepRate (38 / 160 at reward ≥ 0.95)                                    §5.3 (consolidation yield)
//   conditions: mean best reward, exact match (reward = 1) in %, Δ reward vs
//     base best-of-N with its 95% bootstrap CI                                     Table 3 (held-out comparison)
//   ppl: validation perplexity 161.7 → 160.4, ΔPPL −1.321                         §5.3 and Fig. 4B
//   backbone                                                                       §3.2
export default {
  heldOut: 120,
  train: 160,
  steps: 12,
  rollouts: 8,
  N: 96,
  sdftSteps: 300,
  minReward: 0.95,
  replay: 0.2,
  kept: 38,
  keepRate: 23.75,
  conditions: {
    base: { label: "base BoN", reward: 0.8436, em: 30.8 },
    ttt: { label: "TTT", reward: 0.8396, em: 32.9, delta: -0.004, ci: [-0.0289, 0.0215] },
    post: { label: "post-SDFT BoN", reward: 0.8288, em: 31.2, delta: -0.0148, ci: [-0.04, 0.0108] },
  },
  ppl: { base: 161.7, updated: 160.4, delta: -1.321 },
  backbone: "mHC Transformer",
};
