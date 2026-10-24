// Fig 22 · the model: which wells are lit for each record, the timeline of a gated run, the tour, and the readout.
// Pure functions of (segment, time). Shared by art.mjs (static pose), build.mjs (audit poses) and live.js.
import D from "./data.mjs";
import { STATION, BOARD, TABLE_DY } from "./world.mjs";

export const VISIBLE = D.suites.map((s) => s.total - s.hidden); // 7, 8, 52, 26
export const HIDDEN = D.suites.reduce((n, s) => n + s.hidden, 0); // 21
export const TOTAL = D.suites.reduce((n, s) => n + s.total, 0); // 114
const fmt = (v) => v.toFixed(4);
export const CHAMP_RECORD = "iter-000149"; // the record the figure rests on
const SEEN = VISIBLE.reduce((a, b) => a + b, 0); // 93
// PASS@1 of a record, suite by suite, two to a line
const suites = (record) => {
  const c = D.pass[record];
  return [`code ${fmt(c[0])} · math ${fmt(c[1])}`, `logic ${fmt(c[2])} · concept ${fmt(c[3])}`];
};

// ------------------------------------------------------------ fill order of each board (positions are illustrative; counts are exact)
function shuffled(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export const ORDER = VISIBLE.map((n, i) => shuffled(n, 52010 + i * 7));
// the tasks the rollbacks name sit in the core_logic record (they were passed by the champion, or they could not regress)
export const NAMED = { logic_sat_10: 10, logic_sat_44: 44, logic_sat_48: 48 };
{
  const o = ORDER[2];
  const champ = 42;
  for (const idx of Object.values(NAMED)) {
    const at = o.indexOf(idx);
    if (at >= champ) {
      const swapWith = o.findIndex((v, p) => p < 26 && !Object.values(NAMED).includes(v));
      [o[at], o[swapWith]] = [o[swapWith], o[at]];
    }
  }
}
export const litCount = (record) => D.pass[record].map((p, i) => Math.round(p * VISIBLE[i]));
// lit set as booleans, board by board
export function litOf(record) {
  const n = litCount(record);
  return ORDER.map((order, b) => {
    const on = new Array(VISIBLE[b]).fill(false);
    for (let i = 0; i < n[b]; i++) on[order[i]] = true;
    return on;
  });
}

// ------------------------------------------------------------ keyframe tracks
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0 || 1));
      }
    }
    return keys[keys.length - 1][1];
  };
}

// ------------------------------------------------------------ one gated run, from the transfer table to the decision
const OPEN = (95 * Math.PI) / 180;
const SPIN = -Math.PI * 3;
export const RUN_T = {
  fadeIn: [0, 0.5],
  unclamp: [0.5, 1.0],
  open: [1.0, 1.8],
  slideIn: [1.8, 2.3], // the tray runs in to the bore's line
  load: [2.3, 2.9], // the cartridge slides in along the bore
  slideOut: [2.9, 3.4], // the empty tray runs back out of the door's sweep
  close: [3.5, 4.2],
  clamp: [4.2, 4.7],
  evac: [4.8, 5.7],
  purge: [5.9, 6.9],
  transfer: [7.55, 8.7], // the inner door opens first (its wheel screws the interlock rod into the outer door's keeper)
  verify: [8.7, 10.3],
  gate: 10.3,
  after: 11.5,
};
// a valve: opens just after its phase starts, closes as it ends
const pulse = ([t0, t1]) => track([[0, 0], [t0, 0], [t0 + 0.25, 1], [t1 - 0.1, 1], [t1 + 0.15, 0]]);
function runTracks(decision) {
  const T = RUN_T;
  const S = STATION;
  const Y = TABLE_DY;
  const a = T.after;
  const promote = decision === "promote";
  // each track: the run in, which both decisions share, then the promotion's or the rollback's ending
  const k = (head, pro, roll) => track([...head, ...(promote ? pro : roll)]);
  return {
    // in along the bore, through the inner door to the challenger seat; promoted, on to the champion seat (the next
    // challenger is then set down on the tray); rolled back, out the way it came
    cart: k(
      [[0, S.tray], [T.load[0], S.tray], [T.load[1], S.ante], [T.transfer[0], S.ante], [T.transfer[1], S.challenger]],
      [[a + 1.5, S.challenger], [a + 2.3, S.champion], [a + 2.45, S.champion], [a + 2.5, S.tray]],
      [[a + 0.5, S.challenger], [a + 1.8, S.ante], [a + 4.4, S.ante], [a + 5, S.tray]],
    ),
    // the cartridge's offset from the bore's line while it rides the tray, and the tray's own
    across: k([[0, Y], [T.slideIn[0], Y], [T.slideIn[1], 0]], [[a + 2.45, 0], [a + 2.5, Y]], [[a + 5, 0], [a + 5.5, Y]]),
    slide: k([[0, Y], [T.slideIn[0], Y], [T.slideIn[1], 0], [T.slideOut[0], 0], [T.slideOut[1], Y]], [], [[a + 4, Y], [a + 4.4, 0], [a + 5, 0], [a + 5.5, Y]]),
    door: k([[0, 0], [T.open[0], 0], [T.open[1], OPEN], [T.close[0], OPEN], [T.close[1], 0]], [], [[a + 3.2, 0], [a + 4, OPEN], [a + 5.6, OPEN], [a + 6.4, 0]]),
    wheel: k([[0, 0], [T.unclamp[0], 0], [T.unclamp[1], SPIN], [T.clamp[0], SPIN], [T.clamp[1], 0]], [], [[a + 2.6, 0], [a + 3.2, SPIN], [a + 6.4, SPIN], [a + 6.9, 0]]),
    // the inner door's wheel: one turn opens the inner door and screws the interlock rod into the outer door's keeper,
    // so the outer door stays locked while the inner door is open; turned back once the cartridge is through
    lock: k([[0, 0], [T.transfer[0] - 0.5, 0], [T.transfer[0], 1], [T.transfer[1] + 0.05, 1], [T.transfer[1] + 0.55, 0]], [], [[a, 0], [a + 0.5, 1], [a + 1.85, 1], [a + 2.35, 0]]),
    evac: pulse(T.evac),
    purge: pulse(T.purge),
    gauge: track([[0, 0], [T.evac[0] + 0.2, 0], [T.evac[1], 1], [T.purge[0] + 0.2, 1], [T.purge[1], 0]]),
    oil: track([[0, 0], [T.purge[0] + 0.15, 0], [T.purge[0] + 0.5, 1], [T.purge[1], 1], [T.purge[1] + 0.6, 0]]),
    // the challenger is already waiting on the transfer table; after the decision the next one is set down there
    vis: k([[0, 1]], [[a + 2.4, 1], [a + 2.45, 0], [a + 2.9, 0], [a + 3.5, 1]], [[a + 5.9, 1], [a + 6.4, 0], [a + 6.9, 0], [a + 7.5, 1]]),
    // the seat hatch's leaf drops open, the old champion sinks into the chute, and the leaf shuts over it before the
    // promoted cartridge, lit, rides on to the champion's seat (and dims to the champion's tone there)
    hatch: k([[0, 0]], [[a, 0], [a + 0.4, 1], [a + 1.1, 1], [a + 1.45, 0]], []),
    champ: k([[0, 1]], [[a + 1.1, 1], [a + 1.12, 0], [a + 2.4, 0], [a + 2.45, 1]], []),
    sink: k([[0, 0]], [[a + 0.35, 0], [a + 1.05, 1], [a + 2.35, 1], [a + 2.37, 0]], []),
    card: track([[0, 1], [a, 1], [a + 0.5, 0], [a + 0.6, 0], [a + 1.5, 1]]),
  };
}
const TRACKS = { promote: runTracks("promote"), rollback: runTracks("rollback") };
export const RUN_LEN = { promote: RUN_T.after + 3.6, rollback: RUN_T.after + 7.5 };

// ------------------------------------------------------------ segments and the tour
// a segment is { kind, dur, ... }; the pose is a pure function of the segment and the time inside it
// The loop starts and ends on the champion: two later challengers are rolled back against it, the hidden subset stays
// locked, the record goes back to the baseline and to iter-000148, and iter-000149 is promoted again.
// `stamp` is the colour of the run-record card standing in the slot (the last decision).
export const TOUR = [
  { kind: "hold", dur: 3.6, record: CHAMP_RECORD, stamp: "green", say: "champion" },
  { kind: "run", run: 1, dur: RUN_LEN.rollback, from: CHAMP_RECORD, record: CHAMP_RECORD, stamp: "green" },
  { kind: "run", run: 2, dur: RUN_LEN.rollback, from: CHAMP_RECORD, record: CHAMP_RECORD, stamp: "red" },
  { kind: "latch", dur: 3.4, record: CHAMP_RECORD, stamp: "red" },
  { kind: "record", dur: 4.2, from: CHAMP_RECORD, record: "iter-000021", stamp: "red" },
  { kind: "record", dur: 3.6, from: "iter-000021", record: "iter-000148", stamp: "red" },
  { kind: "run", run: 0, dur: RUN_LEN.promote, from: "iter-000148", record: CHAMP_RECORD, stamp: "red" },
  { kind: "hold", dur: 3.6, record: CHAMP_RECORD, stamp: "green", say: "di50" },
];
export const TOUR_LEN = TOUR.reduce((n, s) => n + s.dur, 0);
// segments for a reader's request, starting from the record and card on display
export const runSegment = (run, stamp) => ({ kind: "run", run, dur: RUN_LEN[D.runs[run].decision], from: run === 0 ? "iter-000148" : CHAMP_RECORD, record: CHAMP_RECORD, stamp });
export const recordSegment = (from, record, stamp) => ({ kind: "record", dur: 2.2, from, record, stamp });
export const latchSegment = (record, stamp) => ({ kind: "latch", dur: 3.4, record, stamp });
// where the tour picks up again for a given record and card, or null when a record segment must lead in
export function tourIndexFor(record, stamp) {
  if (record === CHAMP_RECORD) return stamp === "green" ? 0 : 3;
  if (record === "iter-000021" && stamp === "red") return 5;
  return null;
}

// ------------------------------------------------------------ the pose
export const IDLE = { cart: STATION.tray, across: TABLE_DY, slide: TABLE_DY, vis: 1, door: 0, wheel: 0, lock: 0, evac: 0, purge: 0, gauge: 0, oil: 0, hatch: 0, champ: 1, sink: 0, card: 1, stamp: "green", lamp: "", safe: "", hasp: 0 };

export function poseAt(seg, t) {
  const pose = { ...IDLE, wells: null, lines: [] };
  const wellsOf = (record) => litOf(record).map((board) => board.map((on) => (on ? "on" : "off")));
  pose.stamp = seg.stamp || "green";
  if (seg.kind === "hold") {
    pose.wells = wellsOf(seg.record);
    Object.assign(pose, holdText(seg));
    return pose;
  }
  if (seg.kind === "record") {
    // wells change in their fill order, one by one, over the first 1.6 s
    const from = litOf(seg.from);
    const to = litOf(seg.record);
    const u = Math.min(1, t / 1.6);
    pose.wells = to.map((board, b) =>
      board.map((on, i) => {
        const rank = ORDER[b].indexOf(i) / Math.max(1, VISIBLE[b]);
        const k = (b * 0.12 + rank * 0.6) / 0.96;
        return (u >= k ? on : from[b][i]) ? "on" : "off";
      }),
    );
    if (seg.record === "iter-000021") pose.lines = [`iter-000021 · baseline record`, ...suites("iter-000021")];
    // iter-000148's own PASS@1 is not printed; the report of iter-000149 gives its change against it
    else if (seg.record === "iter-000148") pose.lines = [`iter-000148 · champion ${D.runs[0].from}`, `Δ ${D.prevDelta.suite} +${fmt(D.prevDelta.value)} at iter-000149`];
    else pose.lines = holdText({ say: "champion" }).lines;
    return pose;
  }
  if (seg.kind === "latch") {
    pose.wells = wellsOf(seg.record);
    const k = t < 1.8 ? Math.sin(t * 18) * Math.exp(-t * 1.6) : 0;
    pose.hasp = k;
    pose.safe = t > 0.15 && t < 2.6 && Math.floor(t * 3.2) % 2 === 0 ? "red" : "";
    pose.lines = [`hidden subset · ${HIDDEN} of ${TOTAL} tasks locked`, `opens only in sealed evaluator mode`, `with an unlock token`];
    return pose;
  }
  // run
  const run = D.runs[seg.run];
  const decision = run.decision;
  const tr = TRACKS[decision];
  for (const key of ["cart", "across", "slide", "door", "wheel", "lock", "evac", "purge", "gauge", "oil", "vis", "hatch", "champ", "sink", "card"]) pose[key] = tr[key](t);
  const T = RUN_T;
  pose.stamp = t < T.after + 0.55 ? seg.stamp || "green" : decision === "promote" ? "green" : "red";
  // the record before and after; the scan during verify
  const before = litOf(seg.from);
  const after = litOf(seg.record);
  const scanU = (t - T.verify[0]) / (T.verify[1] - T.verify[0]);
  const regressed = run.regressions.map((name) => NAMED[name]);
  pose.wells = before.map((board, b) =>
    board.map((on, i) => {
      if (scanU <= 0) return on ? "on" : "off";
      const cols = Math.ceil(VISIBLE[b] / BOARD.rows);
      const sweep = (b * 0.22 + ((i % cols) / cols) * 0.2) / 0.86; // the bridge's scan, left to right across the boards
      const passed = scanU >= sweep;
      const flash = scanU >= sweep && scanU < sweep + 0.08;
      const red = b === 2 && regressed.includes(i);
      const result = decision === "promote" ? (after[b][i] ? "on" : "off") : red ? "red" : on ? "on" : "off";
      if (!passed) return on ? "on" : "off";
      if (flash && (on || after[b][i])) return "scan";
      if (red && t > T.after + 0.4) return "on";
      return result;
    }),
  );
  pose.lamp = t >= T.gate && t < T.after + 2.6 ? (decision === "promote" ? "green" : "red") : "";
  // readout
  const challenger = `challenger ${run.adapter}`;
  // every line stays within 40 characters, so the last one shares the hint's baseline
  if (t < T.close[1]) {
    pose.lines = [`${run.iter} · ${challenger}`, `loading the antechamber · seed ${run.seed}`];
  } else if (t < T.transfer[0] - 0.5) {
    pose.lines = [`sealing · ${D.config.offline}`, `network denied by default`, D.config.downloads];
  } else if (t < T.verify[0]) {
    pose.lines = [`into the sandbox · ${SEEN} visible tasks`, `hidden subset excluded · ${HIDDEN} tasks`];
  } else if (t < T.gate) {
    pose.lines = [`verifying · PASS@1 · ${SEEN} visible tasks`, `attempt_index 0 · greedy decode`];
  } else if (t < T.after + 1.6) {
    if (decision === "promote") pose.lines = [`never-worse gate · regressions 0`, `max ΔPASS@1 ${fmt(D.gate.maxPassDelta)} ≥ ${fmt(D.gate.thresh)} · promote`];
    else pose.lines = [`never-worse gate · regressions ${run.regressions.length}`, `${run.regressions.join(", ")} · rollback`];
  } else {
    if (decision === "promote") pose.lines = [`${run.iter} · ${run.adapter} promoted`, `run ${run.run} · seed ${run.seed} · logic ${fmt(D.pass[CHAMP_RECORD][2])}`];
    else pose.lines = [`${run.iter} · ${run.adapter} rolled back`, `run ${run.run} · seed ${run.seed}`, `${D.champion} kept`];
  }
  return pose;
}

function holdText(seg) {
  if (seg.say === "di50") return { lines: [`champion ${D.champion} · ${D.peft.method} r${D.peft.rank} α${D.peft.alpha}`, `DI50 ${D.di50.toFixed(4)} · CI95 [${D.ci95[0].toFixed(4)}, ${D.ci95[1].toFixed(4)}]`] };
  return { lines: [`iter-000149 · champion ${D.champion}`, ...suites(CHAMP_RECORD)] };
}

export const REST_SEG = TOUR[0];
export const restPose = () => poseAt(REST_SEG, 0);
