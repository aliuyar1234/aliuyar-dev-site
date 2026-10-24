// CertiPatch, as a timeline. Every number here is from the paper (see TRUTH.md);
// every moving part of the jig is a pure function of tour time T.

export const FINS = 24; // Pythia-410M-deduped: 24 transformer layers
export const PORT_LAYERS = [6, 12, 18, 23]; // quartile hookpoints: floor(n/4), floor(n/2), floor(3n/4), n-1
export const RANK = 4; // patch.rank_r
export const D_MODEL = 1024;
export const PATCH_PARAMS = PORT_LAYERS.length * 2 * D_MODEL * RANK; // 32,768: Table 2 Params (same default patch config)
export const DOMAIN = 10000; // COMPARE-2D: a, b in 00..99
export const BASE_FAILS = 5050; // Fig. 1, Base cell on COMPARE-2D
export const FINAL_FAILS = 0; // Table 1
export const TAU = 1.0; // configured margin threshold, objective.tau_margin
export const MIN_MARGIN = 1.0; // measured: Table 1 min margin 1.00
export const ROUNDS = 7; // Fig. 2: outer iterations 0..6
export const CARD_ROWS = 6; // six recorded fields (Sec. 4); row 5 at the back of the card, row 0 at the front
export const CARD_COLS = 8;
export const CHECKS = ["identity", "artifacts", "scope", "metrics"]; // Sec. 4, operational semantics
// rows, back to front: 5 model fingerprint, 4 manifest, 3 patch, 2 scope, 1 budgets, 0 metrics.
// The read bridge sweeps back to front, so each check lights at the last row it needs.
const CHECK_ROW = { identity: 5, artifacts: 3, scope: 1, metrics: 0 };
export const CARD_TRAVEL = 77; // punch bed to reader bed, world units (+y)
export const FEED = 51; // magazine to the punch bed, world units (+x)
export const DROP = 8.6; // reader deck down onto the filed stack
export const READ = { home: 3, span: 33, front: 33 }; // bridge y at rest, its travel, row 0's y on the reader

export const GAUGE = { ticks: 50, from: -0.75 * Math.PI, span: 1.5 * Math.PI, rest: -0.75 * Math.PI - 0.7, full: DOMAIN };
export const angleOf = (fails) => GAUGE.from + (GAUGE.span * fails) / GAUGE.full;

// trim knobs: pointer angles (0 = -y, clockwise from above). They start at zero, are re-solved each
// round and settle on their final setting; the values are a drawing of convergence, not data.
export const KNOB = { zero: Math.PI, min: Math.PI / 2 + 0.3, max: 1.5 * Math.PI - 0.3, final: [2.25, 3.6, 2.7, 3.95], nudge: 0.95 };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export function knobAt(n, i) {
  if (n >= ROUNDS - 1) return KNOB.final[i];
  const target = KNOB.final[i];
  const swing = 0.62 * 0.5 ** n * ((n + i) % 2 ? 1 : -1);
  return clamp(target + (KNOB.zero - target) * 0.42 ** (n + 1) + swing, KNOB.min, KNOB.max);
}

// a fixed hole pattern standing for the six hashed fields (model, manifest, patch, scope, budgets, metrics)
export const HOLES = (() => {
  let seed = 0x2c1b3f;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: CARD_ROWS }, () => Array.from({ length: CARD_COLS }, () => next() < 0.42));
})();

const ROUND = 2.0;
export const SEGMENTS = [
  ["probe", 3.6],
  ["seat", 2.0],
  ["rounds", ROUND * ROUNDS],
  ["certify", 6.0],
  ["replay", 3.6],
  ["tamper", 4.2],
  ["reset", 3.4],
];
export const STARTS = {};
{
  let t = 0;
  for (const [name, d] of SEGMENTS) (STARTS[name] = t), (t += d);
  STARTS.end = t;
}
export const TOTAL = STARTS.end;
export const RESET = TOTAL - STARTS.reset;
// a step plays to the next stop and holds there: the end of each segment, and of each round
const HOLD = 0.04;
export const STOPS = [];
for (const [i, [name]] of SEGMENTS.entries()) {
  if (name === "rounds") for (let n = 1; n < ROUNDS; n++) STOPS.push(STARTS.rounds + n * ROUND - HOLD);
  STOPS.push(i === SEGMENTS.length - 1 ? TOTAL : STARTS[SEGMENTS[i + 1][0]] - HOLD);
}
export const STILL = STARTS.tamper - HOLD; // reduced motion and the static art: patched, certified, replay passed
export const TAMPER_END = STARTS.reset - HOLD;

const ease = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const span = (t, a, b) => ease((t - a) / (b - a));
const fmt = (n) => n.toLocaleString("en-US");
const PITCH = 5.2; // card row pitch, world units

function blank() {
  return {
    phase: "probe",
    probe: 0,
    yoke: 0,
    trim: KNOB.final.map(() => KNOB.zero),
    witness: 0,
    needle: GAUGE.rest,
    probeLamp: "",
    card: { dx: 0, dy: 0, dz: 0, rows: 0, lit: false },
    ram: 0,
    punchRow: -1,
    ledge: 0,
    bridge: 0,
    lamps: { identity: "", artifacts: "", scope: "", metrics: "", verdict: "" },
    readout: "",
  };
}

// T runs on without wrapping; the pose reads it modulo the loop. Before the first loop (T < 0) the jig
// clears itself from the resting pose without the tamper, so the tour never opens on a failure.
export function poseAt(T) {
  if (T < 0) return resetPose(Math.max(0, T + RESET), false);
  const t = T % TOTAL;
  const pose = blank();
  const needleTo = (from, to, a, b, tt) => from + (to - from) * span(tt, a, b);

  // probe: one exact sweep of the frozen model
  if (t < STARTS.seat) {
    const u = t - STARTS.probe;
    pose.probe = span(u, 0.3, 2.6);
    pose.needle = needleTo(GAUGE.rest, angleOf(BASE_FAILS), 2.6, 3.3, u);
    pose.probeLamp = u >= 2.6 ? "red" : "";
    pose.readout = u < 0.3 ? "Pythia-410M frozen · no patch" : u < 2.6 ? `exact sweep · n = ${fmt(DOMAIN)}` : `base · ${fmt(BASE_FAILS)} / ${fmt(DOMAIN)} fail`;
    return pose;
  }
  pose.phase = "patch";
  // seat: the meter is cleared, the handwheel drives the patch down onto the four ports
  if (t < STARTS.rounds) {
    const u = t - STARTS.seat;
    pose.probe = 1 - span(u, 0, 1.1);
    pose.needle = needleTo(angleOf(BASE_FAILS), GAUGE.rest, 0, 0.7, u);
    pose.yoke = span(u, 0.25, 1.75);
    pose.readout = u < 1.75 ? "seating patch · 4 hookpoints" : `patch on L${PORT_LAYERS.join(" L")} · r = ${RANK}`;
    return pose;
  }
  pose.yoke = 1;
  // seven outer rounds: solve on the active set (the trims move), sweep for counterexamples, add the hardest
  if (t < STARTS.certify) {
    const u = t - STARTS.rounds;
    const n = Math.min(ROUNDS - 1, Math.floor(u / ROUND));
    const v = u - n * ROUND;
    const forward = n % 2 === 0;
    for (let i = 0; i < 4; i++) {
      const from = n === 0 ? KNOB.zero : knobAt(n - 1, i);
      pose.trim[i] = from + (knobAt(n, i) - from) * span(v, 0, 0.6);
    }
    const s = span(v, 0.6, 1.7);
    pose.probe = forward ? s : 1 - s;
    const found = n < ROUNDS - 1;
    pose.probeLamp = v >= 1.7 ? (found ? "red" : "green") : "";
    const label = `round ${n + 1} / ${ROUNDS}`;
    pose.readout = v < 0.6 ? `${label} · solve on active set` : v < 1.7 ? `${label} · sweep for m < τ` : found ? `${label} · hardest m < τ added` : `${label} · all m ≥ τ`;
    return pose;
  }
  pose.trim = [...KNOB.final];
  pose.phase = "certify";
  // certify: a final exact sweep, the meter reads zero, the trims are witness-marked, the card is punched and fed to the reader
  if (t < STARTS.replay) {
    const u = t - STARTS.certify;
    pose.probe = 1 - span(u, 0, 1.0);
    pose.probeLamp = "green";
    pose.needle = needleTo(GAUGE.rest, angleOf(FINAL_FAILS), 1.0, 1.5, u);
    pose.witness = span(u, 1.5, 1.9);
    const p0 = 2.0;
    const step = 0.3;
    const r = clamp(Math.floor((u - p0) / step), -1, CARD_ROWS);
    if (u >= p0 && r < CARD_ROWS) {
      const w = u - p0 - r * step;
      pose.ram = w < 0.11 ? span(w, 0, 0.11) : 1 - span(w, 0.11, 0.21);
      pose.punchRow = r;
      pose.card.rows = r + (w >= 0.11 ? 1 : 0);
      pose.card.dy = PITCH * r + (r < CARD_ROWS - 1 ? PITCH * span(w, 0.21, 0.3) : 0);
    } else if (u >= p0) {
      pose.card.rows = CARD_ROWS;
      pose.card.dy = PITCH * (CARD_ROWS - 1) + (CARD_TRAVEL - PITCH * (CARD_ROWS - 1)) * span(u, p0 + CARD_ROWS * step + 0.15, p0 + CARD_ROWS * step + 1.4);
    }
    pose.card.lit = pose.card.rows > 0;
    pose.readout =
      u < 1.0 ? `certifying · exact sweep n = ${fmt(DOMAIN)}` : u < p0 ? `${fmt(FINAL_FAILS)} / ${fmt(DOMAIN)} fail · min margin ${MIN_MARGIN.toFixed(2)}` : r < CARD_ROWS ? `punching field ${Math.min(CARD_ROWS, pose.card.rows + 1)} / ${CARD_ROWS}` : "certificate issued · exact scope";
    return pose;
  }
  pose.card = { dx: 0, dy: CARD_TRAVEL, dz: 0, rows: CARD_ROWS, lit: true };
  pose.witness = 1;
  pose.needle = angleOf(FINAL_FAILS);
  pose.probeLamp = "green";
  pose.phase = "replay";
  // replay: the reader re-reads every field, re-runs the sweep, and compares
  if (t < STARTS.tamper) {
    const u = t - STARTS.replay;
    readCard(pose, u, false, 2.2);
    pose.probe = span(u, 0.2, 1.7);
    pose.needle = u < 1.8 ? needleTo(angleOf(FINAL_FAILS), GAUGE.rest, 0.05, 0.4, u) : needleTo(GAUGE.rest, angleOf(FINAL_FAILS), 1.8, 2.2, u);
    pose.probeLamp = u < 0.2 ? "green" : u < 1.7 ? "" : "green";
    const checked = CHECKS.filter((id) => pose.lamps[id]).length;
    pose.readout = u < 0.2 ? `replay · reading ${CARD_ROWS} fields` : pose.lamps.verdict ? `replay · ${CHECKS.length} / ${CHECKS.length} checks match · pass` : `replay · recomputing · ${checked} / ${CHECKS.length} checks`;
    return pose;
  }
  pose.probe = 1;
  pose.phase = "tamper";
  // tamper: one trim is nudged off its witness mark; the patch hash no longer matches and replay fails closed
  if (t < STARTS.reset) {
    const u = t - STARTS.tamper;
    pose.trim[1] += KNOB.nudge * span(u, 0.25, 0.95);
    readCard(pose, u - 1.0, true);
    const checked = CHECKS.filter((id) => pose.lamps[id]).length;
    pose.readout = u < 1.0 ? "patch perturbed after issue" : pose.lamps.verdict ? "replay · patch hash mismatch · fail" : `replay · recomputing · ${checked} / ${CHECKS.length} checks`;
    return pose;
  }
  return resetPose(t - STARTS.reset, true);
}

// reset: lamps out, marks cleared, patch lifted and re-zeroed, the issued card dropped into the reader's
// stacker, a blank fed from the magazine to the punch
function resetPose(u, nudged) {
  const prior = poseAt(nudged ? TAMPER_END : STILL);
  const pose = blank();
  pose.phase = "reset";
  const back = span(u, 0.3, 1.4);
  pose.trim = prior.trim.map((a) => a + (KNOB.zero - a) * back);
  pose.witness = 1 - span(u, 0.2, 0.8);
  pose.yoke = 1 - span(u, 0.3, 1.8);
  pose.probe = 1 - span(u, 0.3, 1.4);
  pose.needle = angleOf(FINAL_FAILS) + (GAUGE.rest - angleOf(FINAL_FAILS)) * span(u, 0.2, 0.7);
  pose.probeLamp = u < 0.3 ? "green" : "";
  if (u < 0.3) pose.lamps = { ...prior.lamps };
  pose.ledge = span(u, 0.3, 0.5) * (1 - span(u, 1.1, 1.4));
  if (u < 1.45) {
    const fall = clamp((u - 0.5) / 0.35);
    pose.card = { dx: 0, dy: CARD_TRAVEL, dz: -DROP * fall * fall, rows: CARD_ROWS, lit: u < 0.95 };
  } else {
    pose.card = { dx: -FEED * (1 - span(u, 1.7, 3.0)), dy: 0, dz: 0, rows: 0, lit: false };
  }
  pose.readout = u < 0.3 ? prior.readout : u < 1.45 ? "clearing the jig · card filed" : "feeding a blank card";
  return pose;
}

// the read bridge passes the six rows; each check lights when its last row has been read
const reach = (row) => (READ.front - row * PITCH - READ.home) / READ.span;
function readCard(pose, u, tampered, metricsAt = 0) {
  const sweep = 1.9;
  const stop = tampered ? reach(CHECK_ROW.artifacts) + 0.04 : 1;
  const f = u < 0 ? 0 : Math.min(stop, span(u, 0, sweep)); // forward travel, never runs back
  let done = sweep;
  if (tampered) {
    let lo = 0;
    let hi = sweep;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (span(mid, 0, sweep) < stop) lo = mid;
      else hi = mid;
    }
    done = hi;
  }
  pose.bridge = f * (1 - span(u, done + 0.45, done + 1.3));
  for (const id of CHECKS) {
    if (f < reach(CHECK_ROW[id])) break;
    if (tampered && id === "artifacts") {
      pose.lamps.artifacts = "red";
      pose.lamps.verdict = "red";
      return;
    }
    if (id === "metrics" && u < metricsAt) break;
    pose.lamps[id] = "green";
  }
  if (!tampered && pose.lamps.metrics && u >= Math.max(sweep + 0.25, metricsAt + 0.15)) pose.lamps.verdict = "green";
}
