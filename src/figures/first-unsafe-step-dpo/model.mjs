// Fig 14 model: the editing-bench timeline as a pure function of tour time T (seconds).
// Film position s is the global frame index centred in the viewer gate; frame n sits (s - n) pitches downstream.
import D from "./data.mjs";

export const LEAD = 14; // blank frames after each run's first unsafe step, before the next run starts
export const SPLICE = 12; // frames from the viewer gate to the splicer's cut
const G0 = 4;
const N = D.events.length;
export const PER_PAIR = 0.4; // stack height of one pair on its pin, world units
export const CHIP_H = D.pairsPerEvent * PER_PAIR;

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (T, a, b) => smooth((T - a) / (b - a));
const sum = (list) => list.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------- the 36 first-unsafe runs, in tour order
export const EVENTS = [];
{
  let G = G0;
  let T = 0;
  for (const [seed, pin, variant, t] of D.events) {
    const F = G + t - 1; // global index of the first unsafe step
    const e = { seed, pin, variant, t, G, F, s0: F - t - 2, t0: T };
    e.tFlag = T + 0.5 + 0.2 * (t + 2); // crank ends with step t centred in the gate: the judge trips the flag
    e.tAdv = e.tFlag + 1.2; // flag up, hold
    e.tCut = e.tAdv + 1.4; // flagged frame on the splicer pins: the blade comes down
    e.tLift = e.tCut + 1.15; // blade back up: the cut frame lifts off, the safe rewrite is taped in
    e.tLand = e.tLift + 1.5; // the pair card lands on its stem's pin; the next run starts cranking
    EVENTS.push(e);
    T = e.tLand;
    G = F + 1 + LEAD;
  }
}
const LAST = EVENTS[N - 1];
export const S_SWEEP = LAST.F + SPLICE;
const T_DONE = LAST.tLand + 0.9;
const T_HELD = T_DONE + 4.6;

// ---------------------------------------------------------------- the five held-out reels: a leader, then one frame per held-out run
const H_LEAD = 6;
const RUNS = D.heldOutRuns;
const H_LEN = H_LEAD + RUNS;
const DWELL = 0.6; // the film rests on each flagged or safe-KPI frame
const HOP = 0.4; // one frame on to the next marked frame
const FPS = 20; // frames per second on a long run between marks
const travel = (frames) => (frames === 1 ? HOP : 0.3 + frames / FPS);
export const REELS = [];
{
  let T = T_HELD;
  D.heldOut.forEach(([name, hs, safe, flagged, kpi], m) => {
    const G = S_SWEEP + m * H_LEN + H_LEAD;
    const marks = Array(RUNS).fill(0); // 1: a step at severity ≥ 3 · 2: KPI met with no step at severity ≥ 3
    flagged.forEach((f, b) => {
      for (let j = 0; j < f; j++) marks[b * D.runsPerTestStem + j] = 1;
      for (let j = 0; j < kpi[b]; j++) marks[b * D.runsPerTestStem + f + j] = 2;
    });
    const R = { name, hs, safe, G, t0: T, flagged: sum(flagged), kpi: sum(kpi), legs: [], stops: [], ups: [], greens: [] };
    let s = G - H_LEAD;
    const go = (to) => {
      const dt = travel(to - s);
      R.legs.push([T, T + dt, s, to]);
      T += dt;
      s = to;
    };
    marks.forEach((mark, j) => {
      if (!mark) return;
      go(G + j);
      R.stops.push({ n: G + j, mark, tArr: T, tDep: T + DWELL });
      T += DWELL;
    });
    go(G + RUNS);
    R.tEnd = T;
    // the flag stays up, and the KPI lamp stays lit, across adjacent marked frames
    for (const stop of R.stops) {
      const list = stop.mark === 1 ? R.ups : R.greens;
      const run = list[list.length - 1];
      if (run && run.n === stop.n - 1) (run.b = stop.tDep), (run.n = stop.n);
      else list.push({ a: stop.tArr, b: stop.tDep, n: stop.n });
    }
    REELS.push(R);
    T += 3.6;
  });
}
const RED_AT = new Map(REELS.flatMap((R) => R.stops.filter((x) => x.mark === 1).map((x) => [x.n, x.tArr])));

export const TOTAL = REELS[REELS.length - 1].tEnd + 4.4;
export const S_MAX = S_SWEEP + REELS.length * H_LEN;
export const S_MIN = EVENTS[0].s0;
export const STILL = LAST.tFlag + 0.7; // the static plate: the last run stopped on its first unsafe step
// where a click stops: each run's flag up, its cut, its card on the pin; the two sweep summaries; each held-out reel's two rates
export const STOPS = EVENTS.flatMap((e) => [e.tFlag + 0.36, e.tCut + 0.6, e.tLand])
  .concat([T_DONE + 1.2, T_DONE + 3.6])
  .concat(REELS.flatMap((R) => [R.tEnd + 0.9, R.tEnd + 2.7]));

const PIN_PAIRS_FINAL = Array(D.sweep.trainStems).fill(0);
for (const e of EVENTS) PIN_PAIRS_FINAL[e.pin - 1] += D.pairsPerEvent;
export const PRODUCTIVE = PIN_PAIRS_FINAL.map((n, i) => (n ? i : -1)).filter((i) => i >= 0);
export const PIN_PAIRS = PIN_PAIRS_FINAL;

const eventAt = (T) => {
  let i = 0;
  while (i < N - 1 && T >= EVENTS[i + 1].t0) i++;
  return i;
};

const pad = (n) => String(n).padStart(2, "0");
const pct = (x) => `${+x.toFixed(2)}%`;

// which run a global frame belongs to, if any (held-out run frames are N, leaders -1)
export function runOf(n) {
  for (let j = 0; j < N; j++) {
    const e = EVENTS[j];
    if (n < e.G) return -1;
    if (n <= e.F) return j;
  }
  if (n < S_SWEEP || n >= S_MAX) return -1;
  return (n - S_SWEEP) % H_LEN < H_LEAD ? -1 : N;
}

function heldPose(pose, T) {
  let m = 0;
  while (m < REELS.length - 1 && T >= REELS[m + 1].t0) m++;
  const R = REELS[m];
  const leg = R.legs.find((l) => T < l[1]) || R.legs[R.legs.length - 1];
  pose.s = T < leg[0] ? leg[2] : leg[2] + (leg[3] - leg[2]) * span(T, leg[0], leg[1]);
  let up = 0;
  for (const u of R.ups) up = Math.max(up, span(T, u.a - 0.05, u.a + 0.3) * (1 - span(T, u.b, u.b + 0.3)));
  pose.flag = up;
  const green = R.greens.find((x) => T >= x.a && T < x.b + 0.1);
  pose.kpi = green ? 1 : 0;
  pose.held = m;
  pose.phase = "held";
  const r = Math.min(RUNS, Math.round(pose.s) - R.G + 1);
  pose.counter = r >= 1 ? pad(r) : "00";
  const f = R.stops.filter((x) => x.mark === 1 && T >= x.tArr).length;
  if (T >= R.tEnd + 1.8) pose.readout = `${R.name} · ${R.kpi}/${RUNS} · Safe-KPI-SR ${pct(R.safe)}`;
  else if (T >= R.tEnd) pose.readout = `${R.name} · ${R.flagged}/${RUNS} · HS-MR ${pct(R.hs)}`;
  else if (r < 1) pose.readout = `held-out reel ${m + 1}/${REELS.length} · ${R.name}`;
  else if (green) pose.readout = `${R.name} · run ${r}/${RUNS} · KPI met · sev < 3`;
  else pose.readout = `${R.name} · run ${r}/${RUNS} · sev ≥ 3: ${f}`;
}

export function poseAt(T) {
  const i = eventAt(T);
  const e = EVENTS[i];
  const pose = { T, s: e.s0, flag: 0, arm: 0, lamp: 0, kpi: 0, chip: null, pairs: Array(D.sweep.trainStems).fill(0), counter: "00", event: i, phase: "crank", held: -1, cutFade: 0 };
  let landed = 0;
  for (const x of EVENTS) if (T >= x.tLand) { pose.pairs[x.pin - 1] += D.pairsPerEvent; landed += D.pairsPerEvent; }
  pose.landed = landed;
  // lamp: green from the splice until the next run's judge trips
  const prev = EVENTS[i - 1];
  pose.lamp = T >= e.tCut + 0.45 ? 1 : prev && T < e.tFlag ? 1 : 0;

  if (T < e.tFlag) {
    pose.s = e.s0 + (e.F - e.s0) * span(T, e.t0, e.tFlag);
  } else if (T < e.tAdv) {
    pose.s = e.F;
  } else {
    pose.s = e.F + SPLICE * span(T, e.tAdv, e.tCut);
  }
  pose.flag = span(T, e.tFlag, e.tFlag + 0.35) * (1 - span(T, e.tLift, e.tLift + 0.4));
  pose.arm = span(T, e.tCut, e.tCut + 0.45) * (1 - span(T, e.tCut + 0.65, e.tCut + 1.15));
  pose.cutFade = span(T, e.tLift, e.tLift + 0.22); // the cut frame's marks leave with the chip

  // the step counter latches on the first unsafe step until the cut
  const n = Math.round(pose.s);
  if (T >= e.tFlag && T < e.tCut + 0.45) pose.counter = pad(e.t);
  else if (n >= e.G && n <= e.F && T < e.tFlag) pose.counter = pad(n - e.G + 1);
  else pose.counter = "00";

  // the chip of the run whose card is in flight (it may belong to the previous run)
  for (const x of [prev, e]) if (x && T >= x.tLift && T < x.tLand) pose.chip = chipAt(x, T, pose.pairs[x.pin - 1]);

  const ev = `event ${i + 1}/${N}`;
  const landing = (x) => `stem ${x.pin}/${D.sweep.trainStems} · +${D.pairsPerEvent} pairs · ${landed}/${D.sweep.pairs}`;
  if (T < e.tFlag) {
    pose.phase = "crank";
    const k = n - e.G + 1;
    // steps before the first unsafe one are below severity 3; the first unsafe step itself is named only once the flag is up
    pose.readout = prev && T < e.t0 + 0.9 ? landing(prev) : k >= 1 && k < e.t ? `${ev} · step ${k} · sev < 3` : k === e.t ? `${ev} · step ${k}` : `${ev} · cranking`;
  } else if (T < e.tAdv) {
    pose.phase = "flag";
    pose.readout = `${ev} · first unsafe step ${e.t} · sev ≥ 3`;
  } else if (T < e.tCut) {
    pose.phase = "advance";
    pose.readout = `${ev} · step ${e.t} to the splicer`;
  } else if (T < e.tLift) {
    pose.phase = "cut";
    pose.readout = `${ev} · step ${e.t} cut · safe rewrite in`;
  } else {
    pose.phase = "kept";
    pose.readout = T < e.tLand ? `${ev} · ${D.pairsPerEvent} pairs to stem ${e.pin}/${D.sweep.trainStems}` : landing(e);
  }

  if (i === N - 1 && T >= T_DONE) {
    pose.lamp = 0;
    pose.counter = "--";
    pose.phase = "done";
    pose.readout = T < T_DONE + 2.3 ? `sweep ${D.sweep.runs} runs · sev 0: ${D.sweep.severity[0]} · sev ≥ 3: ${D.sweep.events}` : `${D.sweep.events} first unsafe steps · ${D.sweep.pairs} pairs · ${D.sweep.stems} stems`;
    if (T >= T_HELD) heldPose(pose, T);
  }
  return pose;
}

// the cut frame rises off the pins, flies to its stem's pin and lands on top of the stack
export const CUT_AT = [36, -50, 16];
export const PIN_TOP = 20; // trim-rack pins: a card comes down onto its pin from above this
export const RACK = { y: 10, top: 7 };
export const pinX = (i) => -119.6 + i * 10.4;
function chipAt(e, T, below) {
  const u = T - e.tLift;
  const [x0, y0, z0] = CUT_AT;
  const x1 = pinX(e.pin - 1);
  const y1 = RACK.y;
  const z1 = RACK.top + below * PER_PAIR;
  const lift = 9;
  const hi = PIN_TOP + 2; // clear of every pin tip on the way over
  let at;
  if (u < 0.35) at = [x0, y0, z0 + lift * smooth(u / 0.35)];
  else if (u < 1.15) {
    const v = smooth((u - 0.35) / 0.8);
    at = [x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, z0 + lift + (hi - z0 - lift) * Math.sin((v * Math.PI) / 2) + 6 * Math.sin(v * Math.PI)];
  } else at = [x1, y1, hi + (z1 - hi) * smooth((u - 1.15) / 0.35)];
  // the card shows once it has cleared the splicer's lips, and its marks go before it lands on the plain stack
  return { pin: e.pin - 1, n: e.F, at, a: smooth((at[2] - z0 - 1.5) / 4), marks: 1 - smooth((u - 1.05) / 0.3), down: u >= 1.15 };
}

// what a frame on the strip shows, as opacities: its step text, the taped-in safe rewrite, the tape, the grease-pencil cross
export function cellOf(n, pose) {
  const j = runOf(n);
  const step = { lead: false, rules: 1, safe: 0, tape: 0, x: 0 };
  if (j < 0) return { lead: true, rules: 0, safe: 0, tape: 0, x: 0 };
  if (j >= N) return { ...step, x: RED_AT.has(n) && pose.T >= RED_AT.get(n) ? smooth((pose.T - RED_AT.get(n)) / 0.3) : 0 };
  const e = EVENTS[j];
  const done = { lead: false, rules: 0, safe: 1, tape: 1, x: 0 };
  if (n !== e.F || j > pose.event) return step;
  if (j < pose.event || pose.phase === "done" || pose.phase === "held") return done;
  if (pose.T < e.tFlag) return step;
  const f = pose.cutFade;
  return { lead: false, rules: 1 - f, safe: f, tape: f, x: smooth((pose.T - e.tFlag) / 0.3) * (1 - f) };
}

// the pair card is drawn last while it is in the air, and just after its pin's stem once it is coming down onto it
export const chipAfter = (pose) => (pose.chip && pose.chip.down ? `rack.stem${pose.chip.pin}` : null);
