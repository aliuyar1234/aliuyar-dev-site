// Fig 8 model: the paper's numbers and the copy each mode cuts. Pure, shared by the build and the page.
// Sources are listed in TRUTH.md.

// strict success on the primary metric (SchemaShift ∪ NoCall-MissingTool ∪ NoCall-Unsupported, 1,920 prompts).
// *1: the single (discovery-seed) tier of Table 1; *3: mean over seeds 17, 29 and 43;
// one: the locked one-feature subset of the discovery-seed sparse module; random1: mean of the random one-feature controls
export const STRICT = { base: 0.0375, donor: 0.1781, sparse1: 0.2068, sparse3: 0.1658, dense1: 0.1854, dense3: 0.2177, steering1: 0.1078, one: 0.1172, random1: 0.0566 };
export const KEPT = 0.4708; // share of the full sparse gain the one feature retains (Table 2)
export const TOPK = 16;
export const LATENTS = 256;
export const FEATURE = 104; // the locked one-feature subset
export const GAIN = 1.25;
export const PARAMS = { sparse: 590081, dense: 591232, steering: 1152 };

export const MODES = ["sparse", "dense", "steering"];

// ---------------------------------------------------------------- the key and its cuts (world units)
export const BLADE = 56; // shoulder (s = 0) to tip
export const CUT_END = 50; // the bitting ends here; the tip chamfer follows
export const CUT_SLOPE = 0.85; // flank of the cutter's V (depth per unit along the blade): every flank faces away from the camera
export const ENGAGE = 6; // in-feed that brings the edge to the stylus and cutter
export const START = 3.5; // the pass ends this far from the shoulder
export const TRAVEL = BLADE - START;
export const STEER_DEPTH = 1.4; // the one offset

// the 16 pinned stations of 256 along the blade. 104 is the paper's locked feature; the paper does not list
// the other 15 TopK features, so they are placed in groups on five of the master's six cuts for the drawing
export const STATIONS = [25, 36, 47, 59, 70, 81, 93, 104, 115, 150, 161, 172, 183, 194, 205, 216];
export const stationAt = (index) => ((index + 0.5) / LATENTS) * BLADE;

const clampCut = (s, d) => Math.max(0, Math.min(d, CUT_SLOPE * (s - START), CUT_SLOPE * (CUT_END - s)));

// the master's bitting: six cuts with the cutter's flank and a short flat; cut 3 sits on station 104
const AT = [0, 1, 2, 3, 4, 5].map((i) => stationAt(104) + (i - 2) * 7.4);
const DEPTH = [2.6, 4.0, 3.2, 1.6, 3.6, 2.0];
export function master(s) {
  let d = 0;
  AT.forEach((at, i) => (d = Math.max(d, DEPTH[i] - CUT_SLOPE * Math.max(0, Math.abs(s - at) - 0.5))));
  return clampCut(s, d);
}
// the dense module's copy: a fitted profile on the same six cuts, rounder at the root, some deeper and some shallower
const DENSE = [2.8, 3.6, 3.4, 2.0, 3.3, 2.3];
export function dense(s) {
  let d = 0;
  AT.forEach((at, i) => (d = Math.max(d, DENSE[i] - CUT_SLOPE * (Math.hypot(s - at, 1) - 1))));
  return clampCut(s, d);
}
const notches = (list) => (s) => {
  let d = 0;
  for (const index of list) {
    const at = stationAt(index);
    d = Math.max(d, master(at) - CUT_SLOPE * Math.abs(s - at));
  }
  return d;
};
const sparseCut = notches(STATIONS);
const oneCut = notches([FEATURE]);
const steerCut = (s) => clampCut(s, STEER_DEPTH);

// the profile a finished copy carries
export function target(mode, pruned) {
  if (mode === "dense") return dense;
  if (mode === "steering") return steerCut;
  return pruned ? oneCut : sparseCut;
}

// the blank's edge while the cutter stands at s = at (it travels from the tip to the shoulder)
export function edgeOf(mode, pruned, at) {
  const t = target(mode, pruned);
  if (at <= 0) return t;
  const here = t(Math.min(BLADE, at));
  return (s) => (s >= at ? t(s) : Math.max(0, here - CUT_SLOPE * (at - s)));
}

// ---------------------------------------------------------------- one pass, as a pure function of its age (seconds)
export const PASS = { swap: 0.5, engage: 0.5, traverse: 3.6, release: 0.4, back: 1.2 };
export const PASS_END = PASS.swap + PASS.engage + PASS.traverse + PASS.release + PASS.back;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const glide = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t - Math.sin(2 * Math.PI * t) / (2 * Math.PI));

// c: carriage travel along x (0 … TRAVEL), feed: in-feed toward the cutter, at: cutter station or -1, swap: blank opacity
export function passAt(age, mode, pruned) {
  const t = target(mode, pruned);
  let left = age;
  const out = { c: 0, feed: 0, at: -1, swap: 1, spin: 0, phase: "swap", done: false };
  out.spin = ease((age - 0.3) / 0.4) * (1 - ease((age - (PASS_END - 1.1)) / 0.6));
  if (left < PASS.swap) {
    out.swap = Math.abs(1 - (2 * left) / PASS.swap) ** 1.5;
    out.at = left < PASS.swap / 2 ? -2 : BLADE + 1; // -2: the old copy is still there
    return out;
  }
  left -= PASS.swap;
  if (left < PASS.engage) {
    out.phase = "cut";
    out.feed = ENGAGE * ease(left / PASS.engage);
    out.at = BLADE + 1;
    return out;
  }
  left -= PASS.engage;
  if (left < PASS.traverse) {
    out.phase = "cut";
    out.c = TRAVEL * glide(left / PASS.traverse);
    out.at = BLADE - out.c;
    out.feed = ENGAGE + t(out.at);
    return out;
  }
  left -= PASS.traverse;
  out.at = START;
  if (left < PASS.release) {
    out.phase = "cut";
    out.c = TRAVEL;
    out.feed = ENGAGE * (1 - ease(left / PASS.release));
    return out;
  }
  left -= PASS.release;
  out.phase = "back";
  out.c = TRAVEL * (1 - ease(left / PASS.back));
  out.done = left >= PASS.back;
  return out;
}

// ---------------------------------------------------------------- what the gauge and the readout say
export function grade(mode, pruned) {
  if (mode === "dense") return STRICT.dense3;
  if (mode === "steering") return STRICT.steering1;
  return pruned ? STRICT.one : STRICT.sparse3;
}
const f4 = (v) => v.toFixed(4);
const SETUP = {
  sparse: `sparse · TopK ${TOPK} of ${LATENTS} · 590,081 params`,
  one: `pruned · feature #${FEATURE} · parent ${f4(STRICT.sparse1)} disc.`,
  dense: "dense · fitted MLP · 591,232 params",
  steering: "steering · one offset · 1,152 params",
};
const VALUES = {
  sparse: `strict ${f4(STRICT.sparse3)} 3-seed · ${f4(STRICT.sparse1)} disc.`,
  one: `${f4(STRICT.one)} · ${(KEPT * 100).toFixed(1)}% of gain · rand ${f4(STRICT.random1)}`,
  dense: `strict ${f4(STRICT.dense3)} 3-seed · ${f4(STRICT.dense1)} disc.`,
  steering: `strict ${f4(STRICT.steering1)} disc. · donor ${f4(STRICT.donor)}`,
};
const nameOf = (mode, pruned) => (mode === "sparse" && pruned ? "one" : mode);
// two lines: the setting, then what it measures (or what the machine is doing)
export function readoutOf(mode, pruned, phase) {
  const name = nameOf(mode, pruned);
  if (phase === "cut") return [SETUP[name], `cutting · layer-12 MLP out${name === "sparse" ? ` · λ ${GAIN}` : ""}`];
  if (phase === "back") return [SETUP[name], "grading · 1,920 prompts"];
  return [SETUP[name], VALUES[name]];
}
