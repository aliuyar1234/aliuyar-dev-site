// Fig 10 data: every quantity the switchboard shows, from the ProbeRoute paper (TRUTH.md has the sources).
export default {
  layers: 16, // frozen Pythia-1B, layer index 0..15 (Fig. 2, 1B panels)
  horizons: 4, // h = 1..4 (sec. 3.1)
  m: 4, // top-m support per horizon head (sec. 3.3)
  // Probe top-1 (%) by horizon (rows) and layer, read from the 1B heatmap of Fig. 2 and calibrated on Table 3.
  top1: [
    [12.14, 12.37, 13.1, 13.82, 13.99, 14.75, 15.08, 15.53, 16.09, 16.82, 17.27, 17.6, 18.11, 18.39, 18.0, 16.65],
    [7.11, 7.3, 7.97, 8.25, 8.59, 9.26, 9.65, 9.93, 9.93, 10.1, 10.55, 9.26, 10.21, 9.93, 9.48, 8.65],
    [5.31, 5.15, 5.71, 5.93, 6.04, 6.27, 6.27, 6.6, 6.43, 6.99, 6.32, 6.27, 6.1, 6.6, 5.71, 5.09],
    [4.7, 4.75, 4.92, 5.31, 5.09, 5.31, 5.37, 5.54, 5.54, 5.76, 5.48, 5.43, 4.92, 5.48, 5.26, 4.59],
  ],
  // Table 3, 1B: best probe layer and its top-1 (%) per horizon.
  best: [
    { layer: 13, top1: 18.39 },
    { layer: 10, top1: 10.54 },
    { layer: 9, top1: 6.97 },
    { layer: 9, top1: 5.82 },
  ],
  // The layers the final 1B sparse router selects per horizon, as the Fig. 2 caption lists them. (That the caption lists
  // them by learned weight is an inference: it matches the weights read from the router panel below.)
  support: [
    [12, 13, 11, 14],
    [12, 10, 13, 9],
    [9, 13, 7, 12],
    [9, 8, 13, 7],
  ],
  // Mean learned router weight alpha on each support layer, read from the router panel of Fig. 2 (sums to 1 per horizon).
  alpha: [
    { 11: 0.173, 12: 0.355, 13: 0.307, 14: 0.164 },
    { 9: 0.133, 10: 0.328, 12: 0.345, 13: 0.191 },
    { 7: 0.173, 9: 0.428, 12: 0.161, 13: 0.236 },
    { 7: 0.156, 8: 0.28, 9: 0.316, 13: 0.247 },
  ],
  // Final 1B comparison at 50M training tokens (Table 2).
  final: {
    dense: { top1: 0.1162, accept: 1.111, nll: 5.3769 },
    sparse: { top1: 0.1172, accept: 1.1188, nll: 5.378 },
  },
  // Screening budget 20M tokens: sparse probe-init vs random-init (Table 4).
  screen: {
    probe: { top1: 0.1061, accept: 0.9863, nll: 5.6412 },
    random: { top1: 0.1037, accept: 0.9754, nll: 5.6111 },
  },
  tokens: { final: 50, screen: 20 }, // million training tokens (sec. 4.1)
};
