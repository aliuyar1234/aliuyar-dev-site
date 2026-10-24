// Fig 13 model: the paper's numbers, the interlocking that computes local validity, and the scorer readings.
// Pure ESM, shared by art.mjs (static pose), live.js (every frame) and build.mjs (audit poses).

import DATA from "./data.mjs";

export const PAPER = DATA; // Table 2 (pooled results at scale), Table 1 (strict flips, test split), §3 (slots), §4 (model)

// Nine levers, left to right: two world levers (the branch-local input a world pair changes), then one lever per schema slot.
export const LEVERS = [
  { id: "W1", world: "core" },
  { id: "W2", world: "distractor" },
  { id: "C1", branch: "core" },
  { id: "C2", branch: "core" },
  { id: "C3", branch: "core" },
  { id: "D1", branch: "distractor" },
  { id: "D2", branch: "distractor" },
  { id: "D3", branch: "distractor" },
  { id: "Ans", branch: "answer" },
];
export const SLOT_LEVERS = [2, 3, 4, 5, 6, 7, 8];
export const SPARE = 7; // logic has two distractor slots, so lever 8 is collared out of use (§3: 7 slots vs 6)
export const NAMES = {
  arith: { 2: "C1", 3: "C2", 4: "C3", 5: "D1", 6: "D2", 7: "D3", 8: "Ans" },
  logic: { 2: "L1", 3: "L2", 4: "L3", 5: "N1", 6: "N2", 8: "Ans" },
};
export const WORLD_LABEL = {
  arith: { source: "source world", core: "x1 changed", distractor: "d1 changed" },
  logic: { source: "source world", core: "core seed changed", distractor: "dist seed changed" }, // data/logic.py: core_seed_fact, dist_seed_fact
};
export const LOCK_LABEL = {
  arith: { core: "C1–C3, Ans locked", distractor: "D1–D3 locked" },
  logic: { core: "L1–L3, Ans locked", distractor: "N1–N2 locked" },
};

export const TARGETS = ["trace", "prefix", "local"];
export const TARGET_NAME = { trace: "TraceOutcome", prefix: "PrefixOutcome", local: "LocalValidity" };

export const inUse = (lever, domain) => !(domain === "logic" && lever === SPARE);

// Eq. (1): the source-gold step at a slot is valid in a world unless that world changed the slot's branch.
// A core change invalidates C1–C3 and Ans (a doomed splice); a distractor change invalidates D1–D3 (recoverable).
export function validIn(lever, world) {
  const branch = LEVERS[lever].branch;
  if (!branch || world === "source") return true;
  if (world === "core") return branch !== "core" && branch !== "answer";
  return branch !== "distractor";
}
export const isFlipSlot = (lever, world) => world !== "source" && !validIn(lever, world);
// final-trace correctness o of the trace a step sits in: only a core change ends wrong
export const outcomeOf = (world) => (world === "core" ? 0 : 1);

// ------------------------------------------------------------------ scorer readings
// The paper reports aggregates, not per-step scores. The repeater needles draw from an equal-variance binormal model
// fitted to those aggregates (fit.mjs solves it, data.fit stores it): valid and invalid steps sit d apart, and the two
// steps of a strict flip share a component of weight rho. TraceOutcome reads only the final step.
// deterministic standard normals from (pair, lever, tag)
function hash(a, b, c) {
  let h = 2166136261 ^ (a * 374761393) ^ (b * 668265263) ^ (c * 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
function normal(a, b, c) {
  const u = Math.max(1e-9, hash(a, b, c * 2 + 1));
  const v = hash(a, b, c * 2 + 2);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// the scorer reading s(h) for the source-gold step at a lever, placed in `world` of world pair `pair`
export function scoreOf(domain, target, pair, lever, world) {
  if (!inUse(lever, domain) || !LEVERS[lever].branch) return null;
  const [d, rho] = PAPER.fit[domain][target];
  if (target === "trace") {
    if (LEVERS[lever].branch !== "answer") return null; // TraceOutcome scores one final-step example per trace
    return (outcomeOf(world) ? d / 2 : -d / 2) + normal(pair, lever, world === "core" ? 7 : world === "distractor" ? 8 : 9);
  }
  const valid = validIn(lever, world);
  const shared = Math.sqrt(rho) * normal(pair, lever, 1);
  const own = Math.sqrt(1 - rho) * normal(pair, lever, world === "source" ? 2 : valid ? 4 : 3);
  return (valid ? d / 2 : -d / 2) + shared + own;
}

// needle angle on a repeater dial, radians from vertical; a lever with no reading parks on the stop pin
export const SCALE = (44 * Math.PI) / 180;
export const PARK = (-60 * Math.PI) / 180;
export const needleOf = (s) => (s === null || s === undefined ? PARK : SCALE * Math.max(-1, Math.min(1, s / 2.4)));

// The flip lamp: when a lever is pulled in a world where its step is invalid, the lamp shows whether the scorer ranked
// the valid twin (the same step text in the source world) above it (Eq. 2, one pair).
export function lampOf(domain, target, pair, lever, world) {
  if (target === "trace" || !inUse(lever, domain) || !isFlipSlot(lever, world)) return "";
  return scoreOf(domain, target, pair, lever, "source") > scoreOf(domain, target, pair, lever, world) ? "green" : "red";
}

// The two meters read the selected scorer's measured FlipAcc and PVS (Table 2) on a 0.5 to 1.0 scale; TraceOutcome is
// not scored on those axes, so they rest on their stop pins.
export const METER = { lo: 0.5, hi: 1, arc: (60 * Math.PI) / 180, park: (-74 * Math.PI) / 180 };
export const meterOf = (v) => (v === null ? METER.park : -METER.arc + (2 * METER.arc * (v - METER.lo)) / (METER.hi - METER.lo));
export const metersOf = (domain, target) => (target === "trace" ? [null, null] : [PAPER[domain][target].flip, PAPER[domain][target].pvs]);
// The arm repeater shows the outcome o of the trace the step sits in: on (level) for a doomed splice, off (dropped) otherwise.
export const ARM_OFF = (40 * Math.PI) / 180;
export const armOf = (world) => (outcomeOf(world) ? ARM_OFF : 0);

// ------------------------------------------------------------------ lever kinematics
export const THETA_N = (-10 * Math.PI) / 180;
export const THETA_R = (22 * Math.PI) / 180;
export const STROKE = 9; // tappet travel, world units
export const PLAY = 0.9; // a locked slot tappet moves this far before its notch's back wall meets the dog
export const LIFT = 2.2; // catch block lift when the catch handle is squeezed

// The world tappets drive their dogs with V-notches, and every V-riding dog has a matching V nose, so the
// flank pushes it as a cam: x = (travel - play) / SLOPE. Each play is the y gap left between flank and nose.
export const VEE = { depth: 2.6, flank: 2.9, flat: 0.9, tip: 0.75 }; // notch depth, flank length in y, half-widths of notch floor and nose tip
export const SLOPE = VEE.flank / VEE.depth;
const gapAt = (height) => VEE.flat - VEE.tip + height * SLOPE; // y gap when the nose tip stands this far off the notch floor
export const SHIFT = 2.3; // lock bar travel: the drive dog's nose, 0.3 off its floor, runs out to the tappet's side
export const CROSS = 1.25; // the both-way dog between the world tappets
export const CROSS_IN = 1.2; // how deep each of its noses sits in a world tappet's V at rest
export const PLAY_D = gapAt(VEE.depth - SHIFT); // a world tappet starts its lock bar after this much travel
export const CROSS_AT = gapAt(VEE.depth - CROSS_IN); // and the cross dog after this much
export const PLAY_W = gapAt(VEE.depth - CROSS_IN - CROSS); // a world lever pressing on the cross-lock moves this far, short of PLAY_D

export const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const thetaOf = (stroke) => THETA_N + (THETA_R - THETA_N) * stroke; // stroke 0..1
export const tappetOf = (stroke) => STROKE * stroke;
export const strokeLocked = PLAY / STROKE;
export const strokeLockedW = PLAY_W / STROKE; // a world lever pressed against the cross-lock
const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const shiftOf = (travel) => SHIFT * clamp01((travel - PLAY_D) / (SHIFT * SLOPE));
const crossDrive = (travel) => clamp01((travel - CROSS_AT) / (CROSS * SLOPE));
export const crossOf = (travelW1, travelW2) => CROSS * (crossDrive(travelW1) - crossDrive(travelW2));

// ------------------------------------------------------------------ readout
const f3 = (v) => v.toFixed(3);
export function scorerLine(domain, target) {
  const row = PAPER[domain];
  if (target === "trace") return `TraceOutcome · TraceAUROC ${f3(row.trace)}`;
  return `${TARGET_NAME[target]} · FlipAcc ${f3(row[target].flip)} · PVS ${f3(row[target].pvs)}`;
}
export function stepLine(domain, lever, world) {
  const name = NAMES[domain][lever];
  if (!name) return worldLine(domain, world); // a world lever, or the collared lever in logic, holds no step: name the world
  const valid = validIn(lever, world);
  return `${PAPER[domain].name} ${name} · ${WORLD_LABEL[domain][world]} · ${valid ? "free, y = 1" : "locked, y = 0"}`;
}
export function worldLine(domain, world) {
  if (world === "source") return `${PAPER[domain].name} · source world · all levers free`;
  return `${PAPER[domain].name} · ${WORLD_LABEL[domain][world]} · ${LOCK_LABEL[domain][world]}`;
}
export const crossLine = (domain, world) => `${PAPER[domain].name} · cross-locked · ${WORLD_LABEL[domain][world]}`;
export const domainLine = (domain) => (domain === "logic" ? `Logic · ${PAPER.logic.slots} slots · slot lever 6 collared` : `Arith · ${PAPER.arith.slots} slots · every lever in use`);

// the resting pose the static art shows: arithmetic, LocalValidity, x1 changed, C2 just tried and held
export const REST = { domain: "arith", target: "local", world: "core", pair: 40, lever: 3 };
