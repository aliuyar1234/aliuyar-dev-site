// Fig 20 model: the hodoscope's state, the lamp windows and the readout, all from data.mjs.
// Pure ESM: art.mjs (static pose), live.js (every change) and build.mjs import the same functions.
import { GAINS, RATES, DEFS, GSTAR, rowOf } from "./data.mjs";

export const ROWS = 8; // lamp rows: 8 consecutive layers of the 28
export const COLS = 16; // lamp columns: 16 consecutive tokens of the 256
export const REST = { def: 0, rate: 2, gain: 5, shuffled: false, window: 0 }; // one-sided, r* 4e-5, g 1.00

export const condOf = (s) => rowOf(s.def, s.rate, s.gain);
export const gstarOf = (s) => GSTAR[s.def][s.rate];
export const isGstar = (s) => Math.abs(GAINS[s.gain] - gstarOf(s)) < 1e-9;

// a small seeded generator, so the build and the page latch the same windows
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (r, c) => r * COLS + c;
// adjacent pairs along tokens (t, t+1) and down layers (l, l+1), the counts b_time and b_depth divide by the lit sites
export function pairsOf(bits) {
  let time = 0;
  let depth = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (!bits[at(r, c)]) continue;
      if (c < COLS - 1 && bits[at(r, c + 1)]) time++;
      if (r < ROWS - 1 && bits[at(r + 1, c)]) depth++;
    }
  return { time, depth };
}
// lit sites, and those in the last column or row, which have no forward neighbour inside the window
function sitesOf(bits) {
  let lit = 0;
  let lastCol = 0;
  let lastRow = 0;
  bits.forEach((on, i) => {
    if (!on) return;
    lit++;
    if (i % COLS === COLS - 1) lastCol++;
    if (i >= (ROWS - 1) * COLS) lastRow++;
  });
  return { lit, time: lit - lastCol, depth: lit - lastRow };
}
// the window's own branching, over the sites that can have a forward neighbour
export function branchingOf(bits) {
  const pairs = pairsOf(bits);
  const sites = sitesOf(bits);
  return { time: pairs.time / Math.max(1, sites.time), depth: pairs.depth / Math.max(1, sites.depth), lit: sites.lit };
}

// sites lit per row: the shuffled raster's b_tot,perm is about twice the occupied fraction of sites (b_time,perm ~ b_depth,perm ~ p).
// Drawn at the g = 1.00 occupancy for every gain of a condition: an approximation, since the paper matches the per-unit
// spike rate, not site occupancy; the measured b_tot,perm moves by at most 0.0084 across g in any condition
export function occupancyOf(def, rate) {
  return rowOf(def, rate, 5).bPerm / 2;
}
function countsOf(def, rate, window) {
  const p = occupancyOf(def, rate);
  const next = rng(9173 + window * 131 + def * 17 + rate * 7);
  return Array.from({ length: ROWS }, () => {
    let n = 0;
    for (let c = 0; c < COLS; c++) if (next() < p) n++;
    return n;
  });
}

// move lit lamps within their rows until the window's time and depth pairs match the measured b_time and b_depth
function settleTo(bits, target, next, steps, temperature) {
  const misfit = (p) => (p.time - target.time) ** 2 + (p.depth - target.depth) ** 2;
  let pairs = pairsOf(bits);
  let error = misfit(pairs);
  for (let step = 0; step < steps && error > 0; step++) {
    const r = Math.floor(next() * ROWS);
    const on = [];
    const off = [];
    for (let c = 0; c < COLS; c++) (bits[at(r, c)] ? on : off).push(c);
    if (!on.length || !off.length) continue;
    const a = on[Math.floor(next() * on.length)];
    const b = off[Math.floor(next() * off.length)];
    bits[at(r, a)] = 0;
    bits[at(r, b)] = 1;
    const trial = pairsOf(bits);
    const e = misfit(trial);
    const heat = temperature * (1 - step / steps);
    if (e < error || (e === error && next() < 0.2) || (heat > 0 && next() < Math.exp((error - e) / heat))) {
      pairs = trial;
      error = e;
    } else {
      bits[at(r, a)] = 1;
      bits[at(r, b)] = 0;
    }
  }
  return bits;
}
function targetOf(bits, bTime, bDepth) {
  const sites = sitesOf(bits);
  return { time: Math.round(bTime * sites.time), depth: Math.round(bDepth * sites.depth) };
}

const cache = new Map();
// the raw window for a state: built at g = 1.00 from its seed, then walked one detent at a time, so a turn of the gain
// moves only the lamps that the change in the rounded b_time and b_depth pair targets asks for
export function rawWindow(def, rate, gain, window) {
  const key = `${def}.${rate}.${gain}.${window}`;
  if (cache.has(key)) return cache.get(key);
  let bits;
  if (gain === 5) {
    const next = rng(4049 + window * 977 + def * 89 + rate * 13);
    bits = new Uint8Array(ROWS * COLS);
    countsOf(def, rate, window).forEach((n, r) => {
      const cols = Array.from({ length: COLS }, (_, c) => c);
      for (let i = 0; i < n; i++) bits[at(r, cols.splice(Math.floor(next() * cols.length), 1)[0])] = 1;
    });
    const row = rowOf(def, rate, 5);
    settleTo(bits, targetOf(bits, row.bTime, row.bDepth), next, 6000, 1.5);
    // a cold pass, so the g = 1.00 window meets its rounded targets and its neighbours move no lamps to repair it
    settleTo(bits, targetOf(bits, row.bTime, row.bDepth), next, 3000, 0);
  } else {
    const toward = gain < 5 ? gain + 1 : gain - 1;
    bits = Uint8Array.from(rawWindow(def, rate, toward, window));
    const row = rowOf(def, rate, gain);
    settleTo(bits, targetOf(bits, row.bTime, row.bDepth), rng(733 + gain * 31 + window * 7), 600, 0);
  }
  cache.set(key, bits);
  return bits;
}

// the null: each row's tokens permuted, every row keeping its count; of a few seeded permutations, the one whose
// window branching sits nearest the measured b_tot,perm stands for the shuffle
export function shuffledWindow(def, rate, gain, window) {
  const key = `n${def}.${rate}.${gain}.${window}`;
  if (cache.has(key)) return cache.get(key);
  const raw = rawWindow(def, rate, gain, window);
  const goal = rowOf(def, rate, gain).bPerm;
  let best = null;
  let bestError = Infinity;
  for (let trial = 0; trial < 24; trial++) {
    const next = rng(55001 + window * 37 + trial * 101);
    const bits = new Uint8Array(ROWS * COLS);
    for (let r = 0; r < ROWS; r++) {
      const order = Array.from({ length: COLS }, (_, c) => c);
      for (let i = COLS - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (let c = 0; c < COLS; c++) bits[at(r, order[c])] = raw[at(r, c)];
    }
    const b = branchingOf(bits);
    const e = Math.abs(b.time + b.depth - goal);
    if (e < bestError) (best = bits), (bestError = e);
  }
  cache.set(key, best);
  return best;
}

export const windowOf = (s) => (s.shuffled ? shuffledWindow : rawWindow)(s.def, s.rate, s.gain, s.window);

// ---------------------------------------------------------------- dials (angles in radians, clockwise from up)
const DEG = Math.PI / 180;
// the gain knob: angle proportional to g over a 270 degree sweep, so the grid's uneven steps show as uneven detents
export const gainAngle = (g) => ((g - 1) / 0.3) * 135 * DEG;
export const RATE_ANGLES = [-45, -15, 15, 45].map((a) => a * DEG);
// the coincidence meter reads b_tot (and its reference pointer b_tot,perm) from 0.25 to 1.75 over the same 270 degrees, its
// 1.00 mark, the criterion g* is chosen by, at the top. The dial is turned 36 degrees on its panel so that top faces the
// viewer of the 54 degree camera: the needle then swings across the line of sight, where its travel is not foreshortened
export const meterAngle = (b) => (((Math.max(0.25, Math.min(1.75, b)) - 1) / 0.75) * 135 - 36) * DEG;
// drawn, not data: the paper publishes no tau_l(g) values. Each row's trimmer turns with r*, the spike definition and g,
// deeper rows a little more, to show that every row's threshold is re-set for every setting
export function trimAngle(s, row) {
  const base = [55, 25, -5, -35][s.rate] + (s.def ? 12 : 0);
  return (base + (GAINS[s.gain] - 1) * 150 * (0.45 + (0.55 * row) / (ROWS - 1))) * DEG;
}

// ---------------------------------------------------------------- words
const fix = (v) => v.toFixed(3);
// two lines: the condition that sets every number, then the measured values for it
export function readoutOf(s) {
  const row = condOf(s);
  const head = `${s.def ? 2 : 1}-sided · r* ${RATES[s.rate]}e-5 · ${isGstar(s) ? "g*" : "g"} ${GAINS[s.gain].toFixed(2)}`;
  if (s.shuffled) return [`${head} · shuffled`, `b_perm ${fix(row.bPerm)} · Δb ${fix(row.dB)}`];
  return [head, `b_tot ${fix(row.bTot)} · Δb ${fix(row.dB)} · ${row.n.toLocaleString("en-US")} aval.`];
}
export function describe(s) {
  const row = condOf(s);
  const v = s.shuffled ? `shuffled, b perm ${fix(row.bPerm)}` : `b time ${fix(row.bTime)}, b depth ${fix(row.bDepth)}, b tot ${fix(row.bTot)}, ${row.n} avalanches`;
  return `${DEFS[s.def]}, r* ${RATES[s.rate]}e-5, gain ${GAINS[s.gain].toFixed(2)}${isGstar(s) ? " (g*)" : ""}: ${v}, delta b ${fix(row.dB)}.`;
}
