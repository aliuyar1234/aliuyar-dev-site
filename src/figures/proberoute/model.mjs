// Fig 10 model: which jack each cord takes, how bright each lamp is, and what the readout says.
// Every number comes from data.mjs, which comes from the paper.
import D from "./data.mjs";
import * as W from "./world.mjs";
import { cordOrder } from "./order.mjs";

// Per-horizon probe level 0..1 (min to max of that row), the way the router's prior is z-scored per horizon.
const RANGE = D.top1.map((row) => [Math.min(...row), Math.max(...row)]);
export const probeLevel = (h, l) => {
  const [lo, hi] = RANGE[h];
  const n = (D.top1[h][l] - lo) / (hi - lo);
  return 0.08 + 0.92 * n * n;
};
const ALPHA_MAX = Math.max(...D.alpha.flatMap((row) => Object.values(row)));

// The cords of head h take its support in x order, so no two cords of one head cross at the shelf.
export function assignment(supports) {
  const out = new Array(W.SEATS.length).fill(null);
  for (let h = 0; h < W.H; h++) {
    const seats = W.seatsOf(h).sort((a, b) => W.SEATS[a].x - W.SEATS[b].x);
    const layers = [...supports[h]].sort((a, b) => a - b);
    seats.forEach((seat, j) => (out[seat] = layers[j]));
  }
  return out;
}
export const PROBE = assignment(D.support);
export const alphaOf = (seat, layers = PROBE) => (layers[seat] == null ? 0 : D.alpha[W.SEATS[seat].head][layers[seat]] || 0);

// Three random supports, four distinct layers per head, for the random-init ablation's cords. They are illustrative
// draws (made once from a seeded shuffle and written down here): the paper does not list its random supports.
export const RANDOM_DRAWS = [
  [[10, 5, 15, 9], [1, 9, 5, 2], [11, 9, 14, 8], [11, 6, 1, 3]],
  [[2, 15, 13, 8], [13, 15, 4, 5], [10, 5, 4, 1], [5, 8, 15, 1]],
  [[8, 14, 15, 6], [11, 2, 12, 5], [4, 6, 15, 5], [12, 5, 1, 9]],
];
export const RANDOM = RANDOM_DRAWS.map(assignment);

// Patching: a head's cords can only go in or come out while every head above it is out, since the sheets of the
// rows above hang in front of the rows below. A change from one board to another takes the heads out from the top
// down to the lowest head that changes, then puts them back from there up.
export const FLIGHT = 1.1; // seconds for one cord from seat to jack
export const GAP = 0.22; // seconds between the cords of one head
export const EMPTY = new Array(16).fill(null);
export function plan(from, to) {
  const changed = [0, 1, 2, 3].filter((h) => W.seatsOf(h).some((i) => from[i] !== to[i]));
  if (!changed.length) return [];
  const deepest = Math.max(...changed);
  const steps = [];
  for (let h = 0; h <= deepest; h++) {
    const seats = W.patchOrder(h, from).reverse();
    if (seats.length) steps.push({ head: h, kind: "out", seats, layers: from });
  }
  for (let h = deepest; h >= 0; h--) {
    const seats = W.patchOrder(h, to);
    if (seats.length) steps.push({ head: h, kind: "in", seats, layers: to });
  }
  return steps;
}
export const stepTime = (step) => FLIGHT + (step.seats.length - 1) * GAP;
// The pose of one cord t seconds into its head's step.
export function stepPose(step, n, t) {
  const seat = step.seats[n];
  const u = Math.max(0, Math.min(1, (t - n * GAP) / FLIGHT));
  const layer = step.layers[seat];
  return W.patchPose(seat, step.head, layer, step.kind === "in" ? u : 1 - u);
}

export function posesOf(layers) {
  return layers.map((layer, seat) => (layer == null ? W.stowPose(seat) : W.jackPose(W.SEATS[seat].head, layer)));
}
export function liftsOf(poses) {
  const pegs = W.pegsOf(poses);
  return poses.map((pose, seat) => W.liftOf(W.cordRoute(seat, pose, pegs)));
}

// A resting state of the board. name: "idle" | "probed" | "final" | "dense" | "random"
export function stateOf(name, draw = 0) {
  const lampsOn = name !== "idle";
  const layers = name === "final" ? PROBE : name === "random" ? RANDOM[draw] : new Array(16).fill(null);
  const poses = posesOf(layers);
  const dense = name === "dense";
  return {
    name,
    phase: name,
    layers,
    poses,
    lift: liftsOf(poses),
    order: cordOrder(poses),
    comb: [0, 1, 2, 3].map((h) => (dense ? W.combTime(h) : 0)),
    sweep: lampsOn ? 16 : 0,
    trained: name === "final" ? 1 : 0,
    tokens: name === "final" || dense ? D.tokens.final : name === "random" ? D.tokens.screen : 0,
    budget: name === "random" ? D.tokens.screen : D.tokens.final,
    mix: dense ? "dense" : "sparse",
    init: name === "random" ? "random" : "probe",
    keys: { probe: lampsOn ? 1 : 0, init: name === "random" ? 1 : -1, mix: dense ? 1 : -1 },
  };
}
// Lamp h, l: the probe level once the probe pass has swept past column l.
export const lampLevel = (state, h, l) => Math.max(0, Math.min(1, state.sweep - l)) * probeLevel(h, l);
// The shelf lamps show the learned router weights, which the paper gives for the final 50M probe-init run only.
export const alphaLevel = (state, seat, moving) =>
  state.init === "probe" && state.budget === D.tokens.final && state.layers[seat] === PROBE[seat] && !moving ? state.trained * (alphaOf(seat) / ALPHA_MAX) : 0;
// A head's lamp lights when every cord of the head is home, or its comb is home in dense mode.
export const headLit = (state, h, moving = new Set()) =>
  state.mix === "dense" ? state.comb[h] >= W.combTime(h) : W.seatsOf(h).every((i) => state.layers[i] != null && !moving.has(i));

// The readout: a context line and a line of the paper's numbers for the board as it stands.
const f4 = (v) => v.toFixed(4);
const metrics = (m) => `top-1 h2–4 ${f4(m.top1)} · accept len ${f4(m.accept)}`;
const nll = (m) => `NLL h1–4 ${f4(m.nll)}`;
export function readoutOf(state) {
  const { final: F, screen: R, m, tokens: T } = D;
  const h = state.head > 0 ? state.head : 0;
  const S = (layers = state.layers) => `S = {${W.seatsOf(h).map((i) => layers[i]).filter((l) => l != null).sort((a, b) => a - b).join(", ")}}`;
  const peak = `h=${h + 1} · peak L${D.best[h].layer} ${D.best[h].top1.toFixed(2)}%`;
  // a head carrying any layer off the final support is carrying one of the illustrative random draws
  const drawn = W.seatsOf(h).some((i) => state.layers[i] != null && state.layers[i] !== PROBE[i]);
  const dense = "dense WHS baseline";
  const lines = {
    idle: ["frozen Pythia-1B", `${D.layers} layers × h 1–${D.horizons}`],
    probing: ["offline future-token probes", `probe pass · layer ${Math.min(15, Math.floor(state.sweep))} of 0–15`],
    probed: ["best probe layer, h 1–4", `peaks at layer ${D.best.map((b) => b.layer).join(" / ")}`],
    patching: [state.init === "random" ? "random init, illustrative draw" : "final router support (Fig. 2)", `patch h=${h + 1} · ${S(state.patch || undefined)}`],
    unpatching: ["sparse router", `pull h=${h + 1} · ${m} cords to their seats`],
    bussing: [dense, `comb h=${h + 1} · all ${D.layers} layers to the head`],
    unbussing: [dense, `comb h=${h + 1} back to the tray`],
    training: [state.mix === "dense" ? dense : state.init === "random" ? "sparse, random init" : `ProbeRoute sparse m=${m}`, `router training · ${state.budget}M tokens`],
    final: [`ProbeRoute m=${m}, ${T.final}M tokens · ${nll(F.sparse)}`, metrics(F.sparse)],
    dense: [`dense WHS, ${T.final}M tokens · ${nll(F.dense)}`, metrics(F.dense)],
    random: [`sparse m=${m}, random init · ${T.screen}M tokens`, `top-1 h2–4 ${f4(R.random.top1)} vs probe-init ${f4(R.probe.top1)}`],
    listen: [state.mix === "dense" ? `all ${D.layers} layers bussed` : W.seatsOf(h).some((i) => state.layers[i] != null) ? (drawn ? `illustrative draw · ${S()}` : S()) : "no cords in", peak],
  };
  return lines[state.phase] || ["", ""];
}
