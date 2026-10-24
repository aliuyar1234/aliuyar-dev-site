// Fig 19 model: the press settings, the paper's measured values for them, the stroke profile and the
// kinematics of one stroke. Pure: art.mjs, live.js and build.mjs all read it.
import DATA from "./data.mjs";

export { DATA };
export const STEPS = DATA.setup.steps; // 200 SDFT steps = 200 strokes
export const P_SET = { random: [0, 0.1, 0.3], trigger: [0.1] };

export const defenseOf = (screen, anchor) => (screen ? (anchor ? "D3" : "D1") : anchor ? "D2" : "D0");
const fixed = (p) => p.toFixed(1);
const thousands = (n) => n.toLocaleString("en-US");
const raw = (x) => (x / 1000).toFixed(6); // ×10⁻³ table value → raw reward, e.g. 1.803 → 0.001803

// Everything the paper reports for one setting of the press.
export function conditionOf({ threat, p, screen, anchor }) {
  const D = defenseOf(screen, anchor);
  const key = `${threat}|${fixed(p)}`;
  const counts = DATA.table1[key];
  // p = 0 corrupts nothing by construction; the paper reports D1 dropping 0 examples under random corruption
  const poisoned = counts ? counts.poisoned : p === 0 ? 0 : null;
  const dropped = screen ? (counts ? counts.dropped : threat === "random" ? 0 : null) : 0;
  const final = DATA.setup.train - (dropped || 0);
  // Table 3 has two seeds for D0 and D2 only. A screen that drops nothing trains on the very same 4,000 pairs, so D1
  // (D3) at random p = 0.3 shows the D0 (D2) runs and says so: Table 2 prints D1 = D0 and D3 = D2 in every random
  // cell, and §5.1 says D0 and D1 "overlap exactly". No D1 or D3 seed is claimed.
  const same = screen && dropped === 0 ? defenseOf(false, anchor) : D;
  const two = DATA.table3[`${key}|${same}`];
  const one = DATA.table2[key][D];
  const reward = two ? { mean: two[0], std: two[1], seeds: 2, from: same === D ? null : same } : { mean: one, std: null, seeds: 1, from: null };
  return { D, key, threat, p, screen, anchor, poisoned, dropped, final, reward, trigger: threat === "trigger" ? DATA.triggerSuccess : null };
}

// Card readout, three short lines: the setting, the data that reaches the die, then the run or its result.
export function readoutOf(c, { step = 0, phase = "idle" } = {}) {
  const l1 = `${c.threat} · p = ${fixed(c.p)} · ${c.D}${c.anchor ? ` · λ = ${DATA.anchorLambda}` : ""}`;
  const pois = c.poisoned === null ? `${thousands(DATA.setup.train)} pairs` : `poisoned ${thousands(c.poisoned)}`;
  const gate = c.screen ? `D1 drops ${c.dropped}` : "no D1";
  const l2 = `${pois} · ${gate} · N = ${thousands(c.final)}`;
  let l3;
  if (phase === "done") {
    const r = c.reward;
    const v = r.std === null ? `${raw(r.mean)} (1 seed)` : `${raw(r.mean)} ± ${raw(r.std)}`;
    if (c.trigger !== null) l3 = `trigger ${c.trigger.toFixed(3)} · clean ${v}`;
    else if (r.std === null) l3 = `clean reward ${v}`;
    else l3 = r.from ? `clean ${v} (${r.from} runs, 2 seeds)` : `clean reward ${v} (2 seeds)`;
  } else if (phase === "run" || phase === "test") {
    l3 = `SDFT step ${step} / ${STEPS} · micro-batch ${DATA.setup.microBatch} · accum ${DATA.setup.accumulation}`;
  } else if (phase === "stop") {
    l3 = `stopping at step ${step} / ${STEPS}`;
  } else {
    l3 = `step 0 / ${STEPS} · ${thousands(DATA.setup.eval)} eval prompts`;
  }
  return [l1, l2, l3];
}

// What a screen reader hears: the setting after a change, and with { done } the result after a run someone started.
export function spoken(c, done = false) {
  const r = c.reward;
  const setting = `${c.threat} poisoning at p ${fixed(c.p)}, ${c.D}: ${c.screen ? `the screen drops ${c.dropped}, ` : ""}${thousands(c.final)} pairs`;
  if (!done) return `${setting} reach the die.`;
  const value = r.std === null ? `${raw(r.mean)} from one seed` : `${raw(r.mean)} ± ${raw(r.std)} over two seeds${r.from ? ` of the ${r.from} runs, on the same pairs` : ""}`;
  return `${setting} after ${STEPS} steps: clean mean reward ${value}${c.trigger !== null ? `, trigger success ${c.trigger.toFixed(3)}` : ""}.`;
}

// ---------------------------------------------------------------- stroke profile: 200 strokes
// The first and last two strokes turn slowly enough to follow (V0 a second); in between the flywheel runs up to PEAK,
// where live.js draws the moving parts as their swept ghosts. Viewing pace only: the paper reports no wall-clock time.
export const V0 = 1.6;
export const PEAK = 80;
export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const geo = (a, b, u) => a * (b / a) ** smooth(u); // speed changes by the same factor every instant: a calm run-up
const SEG = [
  [0.9, (u) => V0 * smooth(u)],
  [1.0, () => V0],
  [1.0, (u) => geo(V0, PEAK, u)],
  [0, () => PEAK], // its length is solved below so the run is exactly 200 strokes
  [1.0, (u) => geo(PEAK, V0, u)],
  [1.0, () => V0],
  [0.9, (u) => V0 * smooth(1 - u)],
];
const DT = 1 / 600;
const strokesIn = ([T, f]) => {
  let sum = 0;
  for (let t = DT / 2; t < T; t += DT) sum += f(t / T) * DT;
  return sum;
};
SEG[3][0] = (STEPS - SEG.reduce((sum, seg, i) => sum + (i === 3 ? 0 : strokesIn(seg)), 0)) / PEAK;
export const RUN = SEG.reduce((sum, [T]) => sum + T, 0);
export function rateAt(t) {
  if (t <= 0 || t >= RUN) return 0;
  for (const [T, f] of SEG) {
    if (t < T) return f(t / T);
    t -= T;
  }
  return 0;
}
// strokes turned at time t: the rate integrated once into a table, scaled so the last sample is exactly 200
const TABLE = (() => {
  const n = Math.ceil(RUN / DT);
  const out = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) out[i] = out[i - 1] + rateAt((i - 0.5) * DT) * DT;
  const k = STEPS / out[n];
  for (let i = 0; i <= n; i++) out[i] *= k;
  out[n] = STEPS;
  return out;
})();
export function strokesAt(t) {
  if (t <= 0) return 0;
  if (t >= RUN) return STEPS;
  const x = t / DT;
  const i = Math.min(TABLE.length - 2, Math.floor(x));
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (x - i);
}
// how far the moving parts are drawn as ghosts at a given stroke rate: sharp up to 2.5 a second, ghosts from 6
export const blurAt = (rate) => smooth((rate - 2.5) / 3.5);

// ---------------------------------------------------------------- one stroke
// The eccentric turns once per stroke; TDC at whole strokes. Heights in world units (table top at z = 40).
export const TABLE_TOP = 40;
export const ECC = 7; // eccentricity: the upper punch travels 2 × 7 = 14
export const STROKE = 2 * ECC;
export const FILL = 6; // die fill depth below the table
export const TAB_H = 1.8;
export const YIELD = 2.5; // with the anchor spring set, the punch stops this far short and the coil takes the rest

// swing arm of the feed shoe: pivot Q on the table, the shoe on a circle of radius RHO through the die
export const Q = [-16, 34];
export const RHO = Math.hypot(Q[0], Q[1]);
const deg = Math.PI / 180;
export const A_DIE = Math.atan2(-Q[1], -Q[0]) / deg; // −64.8°
export const A_REST = A_DIE - 58;
export const A_FWD = A_DIE + 20;
export const LEAD = ((7 + 3) / RHO) / deg; // shoe half length plus tablet radius, as an angle on the arm
export const onArc = (a, r = RHO) => [Q[0] + r * Math.cos(a * deg), Q[1] + r * Math.sin(a * deg)];

const span = (x, a, b) => smooth((x - a) / (b - a));
export function shoeAngle(phase) {
  if (phase < 0.8) return A_REST;
  if (phase < 0.87) return A_REST + (A_FWD - A_REST) * span(phase, 0.8, 0.87);
  if (phase < 0.9) return A_FWD + (A_DIE - A_FWD) * span(phase, 0.87, 0.9);
  if (phase < 0.93) return A_DIE;
  return A_DIE + (A_REST - A_DIE) * span(phase, 0.93, 1);
}
export function lowerAt(phase) {
  if (phase < 0.68) return -FILL;
  if (phase < 0.89) return -FILL + FILL * span(phase, 0.68, 0.8);
  return -FILL * span(phase, 0.89, 0.93);
}
export const ramAt = (s) => -ECC * (1 - Math.cos(2 * Math.PI * s));
// the holder follows the ram down until it is YIELD short of full depth, then stays while the ram compresses the
// spring through the last YIELD of the stroke; the corner is rounded over ±0.8 so the stop is firm but not a kink
const KNEE = 0.8;
export function yieldAt(s, anchor) {
  const x = -ramAt(s) - (STROKE - YIELD);
  return anchor * (x <= -KNEE ? 0 : x >= KNEE ? x : (x + KNEE) ** 2 / (4 * KNEE));
}

// where the tablet pressed on stroke k is, at stroke count s (null while it is still in the die or already in the tray)
const P1 = onArc(A_FWD + LEAD); // where the shoe leaves it
export const CHANNEL = { y: P1[1], x0: 20, x1: 28.8 };
export const CHUTE = { from: [28.8, P1[1], TABLE_TOP], to: [48.8, P1[1], 12] }; // starts just past the table edge
export function tabletAt(k, s) {
  const age = s - k;
  const zc = TABLE_TOP + TAB_H / 2;
  if (age < 0.68 || age > 1.62) return null;
  if (age < 0.8) return { at: [0, 0, TABLE_TOP + lowerAt(age) + TAB_H / 2], where: "die" };
  if (age < 0.87) {
    const a = Math.max(A_DIE, shoeAngle(age) + LEAD);
    const [x, y] = onArc(a);
    return { at: [x, y, zc], where: "table" };
  }
  if (age < 1.3) {
    const u = span(age, 0.87, 1.3);
    return { at: [P1[0] + (CHANNEL.x1 + 0.5 - P1[0]) * u, P1[1], zc], where: "table" };
  }
  const u = (age - 1.3) / 0.32;
  const f = CHUTE.from;
  const t = CHUTE.to;
  // along the chute floor, lifted half a tablet off it
  const L = Math.hypot(t[0] - f[0], t[2] - f[2]);
  const nz = (t[0] - f[0]) / L;
  const nx = -(t[2] - f[2]) / L;
  return { at: [f[0] + (t[0] - f[0]) * u * u + nx * (TAB_H / 2), f[1], f[2] + (t[2] - f[2]) * u * u + nz * (TAB_H / 2)], where: "chute" };
}
export const landedAt = (s) => Math.max(0, Math.min(STEPS, Math.floor(s - 0.62 + 1e-9)));

// ---------------------------------------------------------------- the hopper's grains: one grain per 4,000 / 27 ≈ 148 pairs
export const GRAIN_N = 27;
const PER_GRAIN = DATA.setup.train / GRAIN_N;
const ORDER = Array.from({ length: GRAIN_N }, (_, i) => i).sort((a, b) => ((a * 37) % GRAIN_N) - ((b * 37) % GRAIN_N));
// poisoned grains: Table 1's count where the paper gives one (1,213 → 8, 414 → 3), else p of the 27
export const poisonedGrains = (c) => Math.round(c.poisoned !== null ? c.poisoned / PER_GRAIN : c.p * GRAIN_N);
// grains left lying on the screen: D1's drops at the same scale, at least one when it drops any (47 → 0.3 → 1)
export const heldGrains = (c) => (c.screen && c.dropped ? Math.max(1, Math.round(c.dropped / PER_GRAIN)) : 0);
// the fill under the screen: the poisoned grains that pass it (trigger p = 0.1 with D1: 3 − 1 = 2, 367 pairs ≈ 2.5)
export function grainStates(c) {
  const bad = new Set(ORDER.slice(0, poisonedGrains(c) - heldGrains(c)));
  return ORDER.map((_, i) => (bad.has(i) ? c.threat : "clean"));
}

// ---------------------------------------------------------------- the idle tour: one setting after another
// random p = 0.3 without and with each defence, then the trigger setting with no defence first, so the trigger lamp is
// seen lit under D0 as well: §5.2 measures 0.000 in every condition
export const TOUR = [
  { threat: "random", p: 0.3, screen: false, anchor: false },
  { threat: "random", p: 0.3, screen: false, anchor: true },
  { threat: "random", p: 0.3, screen: true, anchor: false },
  { threat: "trigger", p: 0.1, screen: false, anchor: false },
  { threat: "trigger", p: 0.1, screen: true, anchor: false },
  { threat: "trigger", p: 0.1, screen: false, anchor: true },
];
export const START = TOUR[0];
// the reward dial: 0 to 4 ×10⁻³ over 300°
export const DIAL = { max: 4, sweep: 300 };
