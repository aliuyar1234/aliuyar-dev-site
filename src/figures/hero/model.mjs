// The model that moves Fig 1. Pure: no DOM, no randomness. art.mjs draws its first state and live.js runs it.
import { BELT, CONV, PUSH, TRAY, DOWN, EYE, HOUSING, STRIP } from "./world.mjs";

export const SPEED = 18;
export const PITCH = 36;
export const PERIOD = PITCH / SPEED;
export const X_START = HOUSING.x1 - TRAY.l / 2 - 0.5;
export const X_WEIGH = (CONV.weigh.x0 + CONV.weigh.x1) / 2;
export const X_REJECT = PUSH.x;
export const X_GONE = DOWN.x0 + TRAY.l;
export const A_WEIGH = (X_WEIGH - X_START) / SPEED;
export const A_REJECT = (X_REJECT - X_START) / SPEED;
export const A_GONE = (X_GONE - X_START) / SPEED;
// Tamper reaches the frontmost tray on the infeed whose front edge has not yet reached the weigh belt.
export const X_TAMPER = CONV.weigh.x0 - TRAY.l / 2;

// Evidence per decision, as slips in its tray. Repeats every 16 decisions.
export const SEQ = [4, 5, 3, 6, 4, 2, 5, 4, 3, 5, 6, 4, 1, 5, 4, 3];
export const T_MIN = 1;
export const T_MAX = 6;
export const T_REST = 3;
export const SLIP = { t: 1.8 };
export const STRIP_OFF = 0.7;

// The reject: a smoothstep stroke, gravity once the tray's centre passes the belt edge, and the belt's speed carried along x throughout.
export const PUSH_OUT = 0.22;
export const PUSH_HOLD = 0.1;
export const PUSH_BACK = 0.36;
export const GRAVITY = 981;
export const PAD0 = PUSH.tipY + PUSH.padT;
export const Y_END = PAD0 + PUSH.stroke + TRAY.w / 2;
export const BIN_FLOOR = 1;
export const BIN_TOP = BIN_FLOOR + 2 * TRAY.h;
export const LAND_Z = BIN_TOP + TRAY.h;
export const SINK = 0.55;
export const RED_HOLD = 1.4;

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export function rodAt(p) {
  if (p < 0) return 0;
  if (p < PUSH_OUT) return ease(p / PUSH_OUT);
  if (p < PUSH_OUT + PUSH_HOLD) return 1;
  return 1 - ease((p - PUSH_OUT - PUSH_HOLD) / PUSH_BACK);
}
const trayY = (p) => Math.max(0, PAD0 + PUSH.stroke * rodAt(Math.min(p, PUSH_OUT)) + TRAY.w / 2);
let lo = 0;
let hi = PUSH_OUT;
for (let i = 0; i < 50; i++) {
  const mid = (lo + hi) / 2;
  trayY(mid) > BELT.y1 ? (hi = mid) : (lo = mid);
}
export const P_TIP = hi;
export const P_LAND = P_TIP + Math.sqrt((2 * (BELT.top - LAND_Z)) / GRAVITY);
export const LAND_X = X_REJECT + SPEED * P_LAND;
export const BIN = { x0: LAND_X - 11, x1: LAND_X + 11, y0: 12.6, y1: 31.2, z1: 16, t: 0.8 };

// The journal: one line per weighing. The roll was loaded with LEAD of blank paper out; the strip hangs to STRIP.drop, then the rest rolls into a curl.
export const LEAD = 3;
export const CURL = { r0: 1.4, paper: 0.4, max: 6 };
export const curlOf = (out) => Math.min(CURL.max, Math.sqrt(CURL.r0 * CURL.r0 + (CURL.paper * Math.max(0, out - STRIP.drop)) / Math.PI));
export const paperOf = (checked) => LEAD + STRIP.pitch * checked;

export const TAU0 = 34.2;

export function createLine(tau0 = TAU0) {
  const state = { tau: 0, next: 0, T: T_REST, signal: true, trays: [], counts: { checked: 0, acted: 0, held: 0 }, lines: [], head: HEAD0, reading: null, stack: [], landedAt: -99, redUntil: -99, pushAt: -99 };
  while (state.tau < tau0 - 1e-9) advance(state, Math.min(0.05, tau0 - state.tau));
  return state;
}

export function advance(state, dt) {
  const events = [];
  const end = state.tau + dt;
  while (state.next * PERIOD <= end + 1e-9) {
    const i = state.next++;
    const tray = { i, n: SEQ[i % SEQ.length], t0: i * PERIOD, verdict: null, landed: false };
    state.trays.push(tray);
    events.push({ type: "emit", i, n: tray.n });
  }
  state.tau = end;
  for (const tray of state.trays) {
    const age = state.tau - tray.t0;
    if (!tray.verdict && age >= A_WEIGH) {
      const fault = !state.signal;
      tray.verdict = !fault && tray.n >= state.T ? "act" : "held";
      state.counts.checked++;
      state.counts[tray.verdict === "act" ? "acted" : "held"]++;
      const line = { i: tray.i, n: fault ? null : tray.n, T: state.T, verdict: tray.verdict, fault };
      state.head = chain(state.head, line);
      state.lines.push(line);
      if (state.lines.length > 24) state.lines.shift();
      state.reading = line;
      if (tray.verdict === "held") state.redUntil = Infinity;
      events.push({ type: "weigh", ...line });
    }
    if (tray.verdict === "held" && !tray.pushed && age >= A_REJECT) {
      tray.pushed = true;
      state.pushAt = tray.t0 + A_REJECT;
      events.push({ type: "push", i: tray.i });
    }
    if (tray.verdict === "held" && !tray.landed && age >= A_REJECT + P_LAND) {
      tray.landed = true;
      state.stack.unshift({ i: tray.i, n: tray.n });
      if (state.stack.length > 6) state.stack.pop();
      state.landedAt = tray.t0 + A_REJECT + P_LAND;
      state.redUntil = state.landedAt + RED_HOLD;
      events.push({ type: "land", i: tray.i });
    }
  }
  state.trays = state.trays.filter((tray) => !tray.landed && state.tau - tray.t0 < A_GONE);
  if (state.redUntil !== Infinity && state.trays.some((t) => t.verdict === "held" && !t.landed)) state.redUntil = Infinity;
  return events;
}

export const xOf = (state, tray) => X_START + SPEED * (state.tau - tray.t0);

// Strips the evidence from the frontmost decision still on the infeed. Returns that tray, or null when none carries evidence.
export function tamper(state) {
  const open = state.trays.filter((t) => !t.verdict && t.n > 0 && xOf(state, t) < X_TAMPER);
  if (!open.length) return null;
  const tray = open.reduce((a, b) => (xOf(state, a) > xOf(state, b) ? a : b));
  tray.n0 = tray.n;
  tray.n = 0;
  tray.strippedAt = state.tau;
  return tray;
}
export const setSignal = (state, on) => (state.signal = on);

// Where a tray is now, and which layer draws it.
export function poseOf(state, tray) {
  const age = state.tau - tray.t0;
  const x = X_START + SPEED * age;
  if (tray.verdict !== "held" || age < A_REJECT) return { layer: "belt", p: [x, 0, BELT.top], emerging: x < X_START + TRAY.l + 0.5 };
  const p = age - A_REJECT;
  const fall = p > P_TIP ? 0.5 * GRAVITY * (p - P_TIP) ** 2 : 0;
  return { layer: "reject", p: [x, trayY(p), Math.max(LAND_Z, BELT.top - fall)] };
}

export function stackOffset(state) {
  return TRAY.h * (1 - ease((state.tau - state.landedAt) / SINK));
}

export const rodOf = (state) => rodAt(state.tau - state.pushAt);
export const redOf = (state) => !state.signal || state.tau < state.redUntil;
export const eyeOf = (state) => state.trays.some((t) => Math.abs(xOf(state, t) - EYE.x) < TRAY.l / 2 + 0.6 && !(t.verdict === "held" && t.pushed));
// The decision being checked: the last tray to cross the photo-eye, lit until the next one crosses.
export function litOf(state) {
  let best = null;
  for (const t of state.trays) {
    const x = xOf(state, t);
    if (x + TRAY.l / 2 >= EYE.x && !(t.verdict === "held" && t.pushed) && (!best || x < xOf(state, best))) best = t;
  }
  return best ? best.i : -1;
}
// The journal is a hash chain: each printed line folds into the head (FNV-1a, 32 bit), so a removed or altered line changes every head after it.
export function chain(head, line) {
  let h = head >>> 0;
  for (const ch of `${line.i}|${line.n ?? "-"}|${line.T}|${line.verdict}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
export const HEAD0 = 2166136261;
export const headOf = (state) => state.head.toString(16).padStart(8, "0").slice(0, 4);
export const readoutOf = (state) =>
  `τ ${state.T} · ${state.signal ? `e ${state.reading ? (state.reading.n ?? "–") : "–"}` : "no signal"} · #${state.counts.checked} · ${headOf(state)} · ${state.counts.acted} acted · ${state.counts.held} held`;
