// Fig 17 model: ScrubID's synthetic suite on the manifold. Every number the figure shows comes from here.
// Valve states: LIVE (branch on the supply header), REF (switched to the reference header), SHUT (not part of the model).
import D from "./data.mjs";

export const S0 = D.S0;
export const EPS = Math.max(D.EPS_ABS_MIN, D.EPS_REL * S0); // 0.10
export const TAU = Math.max(D.EPS_ABS_MIN, D.TAU_REL * S0); // 0.05
export const FACTORS = D.FACTORS;
export const RUNS = D.runs;
export const GPT2 = D.gpt2;
export const AGGR = 8;
export const LIVE = 1;
export const REF = -1;
export const SHUT = 0;
export const nameOf = (i) => (i === AGGR ? "aggr" : `r${i}`);

// |m|, the mean absolute task metric of the scrubbed model f^C. Each synthetic example's metric is +1 or -1 (y = 1 or 0);
// f^C keeps it only while aggr and at least one redundant node are kept, and reads 0 otherwise (ScrubID runner,
// _synth_metric_values, _synth_scrubbed_metric_values). So |m| is S0 or 0, and Δ(C) = mean |m(f) − m(f^C)| = S0 − |m|.
export function metric(valves, r) {
  if (valves[AGGR] !== LIVE) return 0;
  for (let i = 0; i < r; i++) if (valves[i] === LIVE) return S0;
  return 0;
}
export const deltaOf = (valves, r) => Math.abs(S0 - metric(valves, r)); // Δ(C) = mean |m(f) − m(f^C)| on this suite

// a circuit {aggr} ∪ {r_i : i in reds}: its valve pattern (kept nodes live, the rest of the model on the reference header)
export function valvesOf(reds, r, aggr = LIVE) {
  const v = Array.from({ length: 9 }, (_, i) => (i < r ? (reds.includes(i) ? LIVE : REF) : SHUT));
  v[AGGR] = aggr;
  return v;
}
export const fullModel = (r) => valvesOf(Array.from({ length: r }, (_, i) => i), r);
export const keptOf = (valves) => valves.map((s, i) => (s === LIVE ? i : -1)).filter((i) => i >= 0 && i !== AGGR);

const setOf = (reds) => new Set(["aggr", ...reds.map((i) => `r${i}`)]);
function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (!union.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / union.size;
}

// RR: the largest Jaccard distance between two near-optimal faithful circuits
export function rrOf(snear) {
  let worst = 0;
  for (let i = 0; i < snear.length; i++) for (let j = i + 1; j < snear.length; j++) worst = Math.max(worst, 1 - jaccard(setOf([snear[i]]), setOf([snear[j]])));
  return worst;
}
// SSS: mean pairwise Jaccard similarity of the circuits the R = 5 replicate discovery runs selected
export function sssOf(rep) {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < rep.length; i++) for (let j = i + 1; j < rep.length; j++) (sum += jaccard(setOf([rep[i]]), setOf([rep[j]]))), pairs++;
  return pairs ? sum / pairs : 1;
}
// CC: the share of components whose necessity (Δ(C \ {v}) − Δ(C) ≥ τ) is contradicted somewhere in S_near (ScrubID diagnostics/cc.py)
export function ccOf(snear, r) {
  const circuits = snear.map((i) => valvesOf([i], r));
  const union = new Set();
  for (const c of circuits) for (let v = 0; v < 9; v++) if (c[v] === LIVE) union.add(v);
  const necessary = (c, v) => {
    const without = c.slice();
    without[v] = REF;
    return deltaOf(without, r) - deltaOf(c, r) >= TAU;
  };
  let contradictory = 0;
  for (const v of union) {
    const somewhere = circuits.some((c) => c[v] === LIVE && necessary(c, v));
    const contradicted = circuits.some((c) => c[v] !== LIVE || !necessary(c, v));
    if (somewhere && contradicted) contradictory++;
  }
  return union.size ? contradictory / union.size : 0;
}

export function auditOf(r, index) {
  const run = RUNS[r][index % RUNS[r].length];
  const RR = rrOf(run.snear);
  const SSS = run.rep ? sssOf(run.rep) : run.SSS;
  const CC = ccOf(run.snear, r);
  const cert = RR >= D.RR_FAIL || SSS < D.SSS_FAIL || CC > D.CC_FAIL;
  return { run, RR, SSS, CC, cert, n: run.snear.length };
}

// ---------------------------------------------------------------- programs: what the valves do, step by step
// step: { phase, valves, r (the model the metric is taken on), hold (s), dial (the r the knob shows), ... }
// Every change of pattern that keeps the reading is made before it is broken: the branches that go live open first,
// and only then are the others switched or shut. handoff() returns the opening step, or nothing when none is needed.
export function handoff(from, fromR, to) {
  const make = to.valves.map((s, i) => (from[i] === LIVE || s === LIVE ? LIVE : from[i]));
  const opens = make.some((s, i) => s !== from[i]);
  const breaks = make.some((s, i) => s !== to.valves[i]);
  if (!opens || !breaks) return [];
  return [{ phase: "make", valves: make, r: fromR, dial: to.dial ?? to.r, hold: 0.5, from: fromR, to: to.r }];
}

// discovery sets each near-optimal faithful circuit of the recorded run in turn, then reads the diagnostics
export function discovery(r, index) {
  const a = auditOf(r, index);
  const steps = [{ phase: "full", valves: fullModel(r), hold: 1.7, r }];
  let prev = null;
  a.run.snear.forEach((c, k) => {
    if (prev !== null && prev !== c) steps.push({ phase: "switch", valves: valvesOf([prev, c], r), hold: 0.6, r, k, n: a.n }); // make before break
    steps.push({ phase: "circuit", valves: valvesOf([c], r), hold: 1.5, r, k, n: a.n, c });
    prev = c;
  });
  steps.push({ phase: "summary", valves: valvesOf([a.run.snear[a.n - 1]], r), hold: 3.4, r, audit: a });
  return steps;
}

// flip one valve of a pattern and back: the necessity test
export function flipTest(valves, r, v, hold = 2.4) {
  const flipped = valves.slice();
  flipped[v] = valves[v] === LIVE ? REF : LIVE;
  return [
    { phase: "flip", valves: flipped, hold, r, flip: v, before: valves },
    { phase: "restore", valves, hold: 1.2, r, flip: v },
  ];
}

// the paper's GPT-2 small rows (Tables T2 and T4, activation patching, attribution-patching generator, mean of 5 seeds).
// While they are read, the aggregator is shut: no flow reaches the meter, the float parks on its bottom stop and the
// ε lamp is dark, so the lamps only speak for what the manifold measures. The certificate lamp shows each row's verdict
// (a certificate for induction, ID and OOD; none for IOI).
const f2 = (v) => v.toFixed(2);
export const PAPER = [
  { text: `T2 IOI · ${GPT2.ioi.size.toFixed(1)}/${GPT2.components} · RR ${f2(GPT2.ioi.RR)} · SSS ${f2(GPT2.ioi.SSS)}`, cert: null },
  { text: `T2 induction · ${GPT2.induction.size.toFixed(1)}/${GPT2.components} · RR ${f2(GPT2.induction.RR)} · SSS ${f2(GPT2.induction.SSS)}`, cert: "red" },
  { text: `T4 induction OOD · ${GPT2.inductionOOD.size.toFixed(1)}/${GPT2.components} · SSS ${f2(GPT2.inductionOOD.SSS)}`, cert: "red" },
];

// the idle tour: r = 1, 2, 4, 8, each with a discovery run, a necessity test after the first two, then the GPT-2 rows
export const TOUR_RUNS = { 1: 0, 2: 0, 4: 0, 8: 1 };
export function tour() {
  const steps = [];
  let valves = null;
  let r = null;
  for (const f of FACTORS) {
    const d = discovery(f, TOUR_RUNS[f]);
    if (valves) steps.push(...handoff(valves, r, d[0]));
    steps.push(...d);
    valves = d[d.length - 1].valves;
    r = f;
    if (f <= 2) steps.push(...flipTest(valves, f, keptOf(valves)[0]));
  }
  const parked = valves.slice();
  parked[AGGR] = SHUT;
  for (const row of PAPER) steps.push({ phase: "paper", valves: parked, r, hold: 3.2, ...row });
  return steps;
}

// the resting pose the static art draws: r = 2, full model, float at S0
export const REST = { r: 2, valves: fullModel(2), m: S0 };
