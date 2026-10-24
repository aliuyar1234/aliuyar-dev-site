// Fig 13 data: the measured values the figure shows, from "Outcome Is Not Verification" (sources in TRUTH.md).
// Table 2: main pooled results at scale (test split, pooled hidden states, linear scorer); Table 1: strict same-step
// flips in the test split; §3: schema slots per trace; §4: the model whose hidden states are read.
// fit: [d, rho] of the binormal score model per target, solved from these values by fit.mjs (checked on every build).
export default {
  model: "Qwen3-4B-Instruct-2507",
  arith: { name: "Arith", slots: 7, flips: "5.04k", trace: 0.625, prefix: { flip: 0.845, pvs: 0.679 }, local: { flip: 0.864, pvs: 0.73 } },
  logic: { name: "Logic", slots: 6, flips: "4.32k", trace: 0.972, prefix: { flip: 0.995, pvs: 0.697 }, local: { flip: 1.0, pvs: 0.975 } },
  fit: {
    arith: { trace: [0.4506, 0], prefix: [0.6575, 0.7903], local: [0.8666, 0.6888] },
    logic: { trace: [2.7026, 0], prefix: [0.7294, 0.9599], local: [2.7718, 0.6452] },
  },
};
