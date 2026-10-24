// Fig 9 · camera, layout and the moving parts, shared by geometry.mjs and live.js.
import { fitProjection, boxCorners, iso, pathOf, lineOnTop } from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import D from "./data.mjs";

export const WIDTH = 600;
export const HEIGHT = 480;
export const BENCH = { x: -80, y: -94, w: 174, d: 196, r: 10 };
export const CY = { A: 44, B: -52 }; // stage A (PT, front) and stage B (IT, back)
export const MID = -4;
export const CAR = 27;
export const OFF = [-3, -2]; // the tour's off-register setting of stage A
export const LO = 0.15; // a differing star while its plate is out of view
export const PITCH = 28; // one slide frame per 28 along x
export const slideX = (i) => -PITCH * i;
// inserts PT, FullDelta, CapMask, FullDelta - VMask: the frame over plate A and whether the VMask flap is in
export const FRAME = [0, 1, 2, 1];
export const FLAP = [0, 0, 0, 1];
export const LINK_X = 17;
export const AXLE_Z = 120;
export const ROCK = { O: [MID, AXLE_Z], r: 8, C: [-26, 111], c: 5.7, l: 22.2 };
export const DIAL = [65, -3];
export const DIAL_R = 12;
export const DIAL_TOP = 25;
export const KL_FULL = 1.5;
export const SCALE_FROM = -Math.PI; // zero points +y
export const SCALE_SPAN = (3 * Math.PI) / 2;
export const STOP_ANGLE = SCALE_FROM - Math.PI / 4; // the stop pin, mid dead sector
export const MIC_Z = 24.5;
export const micOf = (s) => ({ x: { y: CY[s] + 24, z: MIC_Z }, y: { x: -12, z: MIC_Z } });
export const MIC = { bracket: [34, 37.5], barrel: [37.5, 43], thimble: [43, 50], cap: [50, 53], rB: 2.2, rT: 3.2, rC: 2, bore: 3.4 };

export const P = fitProjection([...boxCorners(BENCH, -17, 0), [-11, -11, 162], [3, 3, 162], [LINK_X + 6, -33, 118]], WIDTH, HEIGHT, { pad: 22, azimuth: 45 });
export const at = (p) => iso(p, P);

// the crank-rocker in the plane x = LINK_X: crank pin Q, rocker tip T, rocker angle phi
export function linkage(theta) {
  const { O, r, C, c, l } = ROCK;
  const Q = [C[0] + c * Math.cos(theta), C[1] + c * Math.sin(theta)];
  const [dx, dz] = [Q[0] - O[0], Q[1] - O[1]];
  const d = Math.hypot(dx, dz);
  const a = (r * r - l * l + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r * r - a * a));
  const [mx, mz] = [O[0] + (a * dx) / d, O[1] + (a * dz) / d];
  const T1 = [mx + (h * dz) / d, mz - (h * dx) / d];
  const T2 = [mx - (h * dz) / d, mz + (h * dx) / d];
  const T = T1[1] < T2[1] ? T1 : T2;
  return { Q, T, phi: Math.atan2(T[0] - O[0], O[1] - T[1]) };
}
// the crank angles of the two dwells: A in view (phi lowest), B in view (phi highest)
export const [THETA_A, THETA_B] = (() => {
  let a = 0, b = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 720; i++) {
    const t = (i / 720) * 2 * Math.PI;
    const { phi } = linkage(t);
    if (phi < lo) (lo = phi), (a = t);
    if (phi > hi) (hi = phi), (b = t);
  }
  return [a, b];
})();
// share of the eyepiece view on plate A (the mirror's normal is (0, -sin phi, cos phi))
export const viewA = (phi) => {
  const s = Math.max(0, Math.min(1, 0.5 - phi / 1.1));
  return s * s * (3 - 2 * s);
};

const X = [1, 0, 0];
const frameX = (x, y, z) => G.frameOf([x, y, z], X, [0, 1, 0], [0, 0, 1]);
const rot = ([u, v], a) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
// a bar with round ends from (0,0) to (du, dv), half width w
function barPolygon(du, dv, w, steps = 6) {
  const len = Math.hypot(du, dv);
  const end = (cx, a0) => Array.from({ length: steps + 1 }, (_, i) => [cx + w * Math.cos(a0 + (i / steps) * Math.PI), w * Math.sin(a0 + (i / steps) * Math.PI)]);
  return [...end(len, -Math.PI / 2), ...end(0, Math.PI / 2)].map((p) => rot(p, Math.atan2(dv, du)));
}

export const MIRROR = { half: 7, t: 0.7, x0: -3, x1: 9 };
export const mirrorShape = (phi) => ({ F: frameX(0, MID, AXLE_Z), poly: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [u * MIRROR.half, v * MIRROR.t]).map((p) => rot(p, phi)), s0: MIRROR.x0, s1: MIRROR.x1 });
export const LEVER = { x0: LINK_X - 3, x1: LINK_X - 1.6, w: 1.25 };
export const leverShape = (phi) => ({ F: frameX(0, ...ROCK.O), poly: barPolygon(ROCK.r * Math.sin(phi), -ROCK.r * Math.cos(phi), LEVER.w), s0: LEVER.x0, s1: LEVER.x1 });
export const LINK = { x0: LINK_X - 1.6, x1: LINK_X - 0.2, w: 1 };
export const linkShape = (Q, T) => ({ F: frameX(0, ...Q), poly: barPolygon(T[0] - Q[0], T[1] - Q[1], LINK.w), s0: LINK.x0, s1: LINK.x1 });
export const prismPaths = (s) => G.prismOf(s.F, s.poly, s.s0, s.s1, P);
export const PIN = { r: 0.7 };
export const HANDLE = { r: 1.5, x0: LINK_X + 0.6, x1: LINK_X + 5.6 };
export const PIN_HEAD = { r: 1, x0: LINK.x1, x1: LINK.x1 + 0.6 };
export const CRANK_FACE = LINK_X - 3;
const pin = ([y, z], x0, x1, r) => G.disc(x0, x1, r, frameX(0, y, z), P, { steps: 20 });
// every moving bar and pin of the crank-rocker, back to front along x
export const linkagePaths = ({ Q, T, phi }) => ({
  lever: prismPaths(leverShape(phi)),
  pinQb: pin(Q, CRANK_FACE, LINK.x0, PIN.r),
  link: prismPaths(linkShape(Q, T)),
  pinT: pin(T, PIN_HEAD.x0, PIN_HEAD.x1, PIN_HEAD.r),
  pinQ: pin(Q, LINK.x1, HANDLE.x0, PIN.r),
  handle: pin(Q, HANDLE.x0, HANDLE.x1, HANDLE.r),
});
export const LINKAGE_SLOTS = ["lever", "pinQb", "link", "pinT", "pinQ", "handle"];
// the detent cam: two notches at +-45 degrees that turn with the rocker
export const CAM = { x0: LINK_X - 4.4, x1: LINK_X - 3, r: 4.6 };
export const camNotches = (phi) =>
  [-1, 1].map((s) => {
    const d = rot([0, 1], (s * Math.PI) / 4 + phi);
    return pathOf([CAM.r - 1.6, CAM.r].map((r) => at([CAM.x1, MID + d[0] * r, AXLE_Z + d[1] * r])));
  }).join("");

// the VMask flap, pivoted on the bar after frame 1: parked along the bar (t = 0), swung over the late band (t = 1)
export const FLAP_PIN = [PITCH + 14, CY.A + 14.2];
export const FLAP_Z = 35;
export const flapShape = (t) => {
  const a = -(Math.PI / 2) * t;
  return { F: G.frameOf([...FLAP_PIN, 0], [0, 0, 1], X, [0, 1, 0]), poly: barPolygon(9.6 * Math.sin(a), -9.6 * Math.cos(a), 1.9, 8), s0: FLAP_Z, s1: FLAP_Z + 0.5 };
};

export const klAngle = (kl) => SCALE_FROM + (SCALE_SPAN * kl) / KL_FULL;
export function needleAt(angle) {
  const [x, y] = DIAL;
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)];
  return lineOnTop([x - dx * 2.6, y - dy * 2.6], [x + dx * (DIAL_R - 3.2), y + dy * (DIAL_R - 3.2)], DIAL_TOP + 0.2, P);
}

// micrometer thimble knurls, which turn with the screw
const ribs = (F, phase) => G.ribsOf(F, MIC.thimble[0] + 1.2, MIC.thimble[1] - 0.4, MIC.rT, 20, P, { phase, fade: [0.1, 0.55] });
export const knurlX = (s, phase) => ribs(frameX(0, micOf(s).x.y, MIC_Z), phase);
export const knurlY = (s, phase) => ribs(G.frameOf([micOf(s).y.x, CY[s], MIC_Z], [0, 1, 0], [-1, 0, 0], [0, 0, 1]), phase);

// the readout keeps its reading while the blink is held; off register it reads nothing
const f3 = (n) => n.toFixed(3);
export function readoutOf({ insert, registered }) {
  const v = D.inserts[insert];
  const head = [`A ${D.pair.A} · B IT · n ${D.test.n}`, `A PT + FullDelta · L${D.layers.mid}, L${D.layers.late}`, `A PT + CapMask · ${D.capMaskFeatures} features`, "A PT + FullDelta − VMask"][insert];
  if (!registered) return [head, "off register", "answer tokens not aligned", "no KL read"];
  const ci = v.capCI ? ` [${f3(v.capCI[0])}, ${f3(v.capCI[1])}]` : "";
  return [head, `KL ans→IT ${f3(v.kl)}${insert === 1 ? ` · −${D.klReductionPct}% vs PT` : ""}`, `Cap ${f3(v.cap)}${ci} · CapRec ${f3(v.capRec)}`, `Len ${v.len.toFixed(2)} tok · VerbCarry ${f3(v.verbCarry)}`];
}
