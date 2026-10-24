// Fig 21 rig: the world layout of the proof press and its camera, shared by parts.mjs (geometry) and live.js (motion).
// World units, x along the bed (the carriage travels toward +x), y across it (+y toward the viewer), z up.
import * as k from "../kit/iso-kit.mjs";
import { CYL_R, TRAVEL, GEAR_R, PINION_R, MEASURE, ROWS } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 450;

export const BENCH = { x: -133, y: -52, w: 260, d: 100, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 5;

// the press base: a cabinet of galley drawers on the bench, the bed on top of it
export const CABINET = { x: -88, y: -36, w: 170, d: 48, r: 2 };
export const BED = { x: -96, y: -40, w: 186, d: 56, r: 2.5 };
export const BED_Z = 24;
export const BT = 44; // bed top
export const PLATE_TOP = BT + 1; // type bed plate
export const TYPE_H = 4;
export const TH = PLATE_TOP + TYPE_H; // type height: the rails' top and the cylinder's contact line
export const QUAD_H = 2.6;
export const RAILS = [-39, 10]; // rail plans start at these y, 4 deep
export const RAIL_D = 4;

// chase and forme
export const CHASE = { x: -41, y: -31, w: 74, d: 38 };
export const CHASE_BAR = 2.6;
export const CHASE_H = 3.4;
export const PITCH = { x: 2, y: 2.6 };
export const FORME = { x: -34, y: -26, w: MEASURE * 2, d: ROWS * 2.6 };
export const slotAt = (row, col) => [FORME.x + col * PITCH.x, FORME.y + row * PITCH.y];

// carriage, built at rest (cylinder axis at x = XC, the left end of the bed) and moved by +TRAVEL * share along x.
// At rest the form rollers' whole plan (XC + 15.6 - 3 .. XC + 22.2 + 3) lies left of the forme, and one turn of the
// cylinder (XC .. XC + TRAVEL) still sweeps its whole measure: XC + 25.2 < FORME.x and XC + TRAVEL > FORME.x + FORME.w.
export const XC = -59.45;
export const AXIS_Z = TH + CYL_R;
export const CHEEK_Y = { far: [-45, -41], near: [17, 21] };
export const CHEEK = [[29, TH - 7], [-17, TH - 7], [-17, TH + 21], [-13, TH + 35], [4, TH + 35], [29, TH + 17]]; // (x - XC, z), convex
// two form rollers on the type, 0.6 apart, and the ink drum resting on both (centres 8.5 apart), clear of the cylinder
export const ROLLERS = [{ x: 15.6, z: TH + 3, r: 3 }, { x: 22.2, z: TH + 3, r: 3 }];
export const DRUM = { x: 18.9, z: TH + 3 + Math.sqrt(8.5 ** 2 - 3.3 ** 2), r: 5.5 };
export const GEAR = { x: 0, z: AXIS_Z, r: GEAR_R, tip: GEAR_R + 0.8, y: [22, 24.4] };
const MESH = (120 * Math.PI) / 180;
export const PINION = { x: (GEAR_R + PINION_R) * Math.cos(MESH), z: AXIS_Z + (GEAR_R + PINION_R) * Math.sin(MESH), r: PINION_R, tip: PINION_R + 0.8, y: [22, 24.4] };
export const CRANK = { len: 10.5, y: [25.2, 26.6], grip: [26.6, 33.4], rest: (215 * Math.PI) / 180 };
export const TRIP = { x: 20.5, z: TH - 2.4, len: 7.6, y: [22.6, 23.6], trip: (-16 * Math.PI) / 180, print: (18 * Math.PI) / 180 };
export const GRIPPER = { rest: (140 * Math.PI) / 180, y: [-33, 8] };
export const FEED = { from: [-14, TH + 23], to: [-40, TH + 14], t: 1.2, y: [-39.4, 15.4] };

// bench furniture
export const DELIVERY = { x: 44, y: -33, w: 42, d: 40, r: 1.5 };
export const SHEET = { x: 46, y: -30, w: 38, d: 34 };
export const LEVER = { x: 6, z: 13, len: 8.5, y: [CABINET.y + CABINET.d + 1.2, CABINET.y + CABINET.d + 2.2], off: (-26 * Math.PI) / 180, on: (26 * Math.PI) / 180 };
export const LAMPS = { x: 58, w: 26, z: [BED_Z + 4, BED_Z + 16] };
export const TRAY = { x: -122, y: 22, w: 76, d: 21, r: 1.5 };
export const TRAY_H = 6;
export const TRAY_WALL = 1.4;
export const DIVIDER = 1;
export const cellW = (TRAY.w - 2 * TRAY_WALL - 5 * DIVIDER) / 6;
export const cellX = (i) => TRAY.x + TRAY_WALL + i * (cellW + DIVIDER) + cellW / 2; // compartment centres
export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [XC - 17, CHEEK_Y.far[0], TH + 35],
    [XC + TRAVEL + 29, CHEEK_Y.far[0], TH + 35],
    [XC - 20, CRANK.grip[1], TH + 40],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 50 },
);

// screen helpers for the live page: a point, and the screen images of the world unit vectors
export const at = (p) => k.iso(p, P);
export const unitX = k.axisVector(P, [1, 0, 0]);
export const unitY = k.axisVector(P, [0, 1, 0]);
export const unitZ = k.axisVector(P, [0, 0, 1]);
// the screen point of (x, z) on the vertical plane y, turned by angle a about (cx, cz): a rotation in an xz face
export function faceMatrix([cx, y, cz], a) {
  const c = at([cx, y, cz]);
  const [ux, uy] = unitX;
  const [wx, wy] = unitZ;
  // M = B R B^-1 with B = [u w] (columns), R the rotation x -> z by a
  const det = ux * wy - wx * uy;
  const inv = [wy / det, -wx / det, -uy / det, ux / det]; // rows of B^-1
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const r = [cos, -sin, sin, cos]; // [x', z'] = R [x, z]
  const br = [ux * r[0] + wx * r[2], ux * r[1] + wx * r[3], uy * r[0] + wy * r[2], uy * r[1] + wy * r[3]];
  const m = [br[0] * inv[0] + br[1] * inv[2], br[0] * inv[1] + br[1] * inv[3], br[2] * inv[0] + br[3] * inv[2], br[2] * inv[1] + br[3] * inv[3]];
  const e = c[0] - (m[0] * c[0] + m[1] * c[1]);
  const f = c[1] - (m[2] * c[0] + m[3] * c[1]);
  const n = (v) => Math.round(v * 1000) / 1000;
  return `matrix(${n(m[0])} ${n(m[2])} ${n(m[1])} ${n(m[3])} ${n(e)} ${n(f)})`;
}

// ------------------------------------------------------------ live detail, drawn in the static pose and re-drawn by live.js
const V = (() => {
  // toward the viewer: depthOf grows along it
  const e = [k.depthOf([1, 0, 0], P) - k.depthOf([0, 0, 0], P), k.depthOf([0, 1, 0], P) - k.depthOf([0, 0, 0], P), k.depthOf([0, 0, 1], P) - k.depthOf([0, 0, 0], P)];
  const n = Math.hypot(...e);
  return e.map((v) => v / n);
})();
const r1 = (v) => Math.round(v * 10) / 10;
const pathOf = (pts, closed) => pts.map((p, i) => `${i ? "L" : "M"}${r1(p[0])} ${r1(p[1])}`).join("") + (closed ? "Z" : "");
function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// the gripper bar on the cylinder at angle phi (x toward z), a prism along y: fill, edges, and whether it faces the viewer
const GRIP_X = [[CYL_R - 0.4, -1.6], [CYL_R + 0.9, -1.6], [CYL_R + 1.4, -0.7], [CYL_R + 1.4, 1.3], [CYL_R - 0.4, 1.3]];
const FINGERS = [-27, -18, -9, 0];
export function gripperAt(phi, xc = XC) {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const xz = ([rho, tau]) => [xc + rho * c - tau * s, AXIS_Z + rho * s + tau * c];
  const [y0, y1] = GRIPPER.y;
  const p3 = (q, y) => {
    const [x, z] = xz(q);
    return [x, y, z];
  };
  const pts = GRIP_X.flatMap((q) => [at(p3(q, y0)), at(p3(q, y1))]);
  const end = GRIP_X.map((q) => at(p3(q, y1)));
  const top = [GRIP_X[2], GRIP_X[3]];
  const long = top.map((q) => pathOf([at(p3(q, y0)), at(p3(q, y1))])).join("");
  const fingers = FINGERS.map((y) => pathOf([at(p3(top[0], y)), at(p3(top[1], y))])).join("");
  return { front: c * V[0] + s * V[2] > 0, fill: pathOf(hull(pts), true), edge: pathOf(hull(pts), true) + pathOf(end, true) + long + fingers };
}
export const GRIP_AWAY = Math.atan2(-V[2], -V[0]); // the gripper angle that faces straight away from the viewer
export const gripperShape = (phi) => ["prism", { o: [XC, 0, AXIS_Z], a: [0, 1, 0], u: [Math.cos(phi), 0, Math.sin(phi)], v: [-Math.sin(phi), 0, Math.cos(phi)] }, GRIP_X, GRIPPER.y[0], GRIPPER.y[1]];
// gear teeth: rim lines across the tooth-tip band at every tooth, where the rim faces the viewer
export function teethAt(g, count, phase, xc = XC) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * 2 * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    if (c * V[0] + s * V[2] < 0.14) continue;
    const x = xc + g.x + g.tip * c;
    const z = g.z + g.tip * s;
    d += pathOf([at([x, g.y[0], z]), at([x, g.y[1], z])]);
  }
  return d;
}
export const TEETH = { gear: 36, pinion: 15 };
