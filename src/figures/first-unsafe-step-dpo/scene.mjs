// Fig 14 scene: world layout, camera, and the paths of every part that moves.
// Shared by parts.mjs and art.mjs (build time) and live.js (every frame).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { S_MIN, S_MAX, PER_PAIR, CHIP_H, CUT_AT, RACK, PIN_TOP, pinX, runOf } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 470;
export const BENCH = { x: -150, y: -80, w: 300, d: 128, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 5;

// film: a flat ribbon on the bench line, frames along x, perforations on the near edge
export const PITCH = 7;
export const YF = -50;
export const Y0 = YF - 4.5;
export const Y1 = YF + 4.5;
export const ZF = 16;
export const GATE_X = -48;
export const CUT_X = CUT_AT[0];
export const ROLL = { r: 3, z: 13, x: [-86, 86] };

// rewinds: reels on y-axis spindles behind the gear boxes, cranks in front
export const REWIND_X = [-114, 114];
export const SPINDLE_Z = 46;
export const REEL_R = 32;
export const HUB_R = 6;
export const REEL_Y = { back: [-55.3, Y0], front: [Y1, -44.7] }; // flanges clear the film by nothing: the pack fills the gap
export const RHO = [10, 25.8]; // the pack edge stays inside the flange windows, so both packs are seen to change all tour
const C = (RHO[1] ** 2 - RHO[0] ** 2) / (S_MAX - S_MIN);
export const CRANK = { y: -26, len: 13, t: 1.4 };

// viewer: head with a lit screen over the gate, flag lever on its crown
export const HEAD = { x: -68, y: -74, w: 38, d: 32, r: 3 };
export const HEAD_Z = [30, 56];
export const SCREEN = { x0: -63, x1: -37, z0: 35, z1: 52, y: -41.2 };
export const FLAG = { x: -34, y: -43.4, z: 60, len: 13 };

// splicer: hinged blade arm over the pins
export const HINGE = { x0: 24, x1: 48, y: -62.5, z: 20 };
export const ARM_OPEN = (105 * Math.PI) / 180;

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [REWIND_X[0], YF, SPINDLE_Z + REEL_R], [REWIND_X[1], YF, SPINDLE_Z + REEL_R], [REWIND_X[0] - REEL_R, YF, SPINDLE_Z], [REWIND_X[1] + REEL_R, YF, SPINDLE_Z], [FLAG.x, FLAG.y, FLAG.z + FLAG.len + 5]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);

export const at = (p) => k.iso(p, P);
const path = (pts, closed) => k.pathOf(pts.map(at), closed);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// ---------------------------------------------------------------- film
// one step's frame, built at the gate; live translates it along x
const hash = (n) => {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) % 1000) / 1000;
};
export function rulesAt(n, cx = GATE_X, z = ZF) {
  const r = hash(n);
  return [-1.9, -0.4, 1.1].map((dx, i) => path([[cx + dx, Y0 + 1.1, z], [cx + dx, Y0 + 1.1 + 2.4 + r() * (i === 1 ? 2.6 : 3.6), z]])).join("");
}
export const CELL = {
  x: path([[GATE_X - 3.5, Y0, ZF], [GATE_X + 3.5, Y1, ZF]]) + path([[GATE_X - 3.5, Y1, ZF], [GATE_X + 3.5, Y0, ZF]]),
  tape: path([[GATE_X - 6, Y0 + 0.3, ZF], [GATE_X + 6, Y0 + 0.3, ZF], [GATE_X + 6, Y1 - 0.3, ZF], [GATE_X - 6, Y1 - 0.3, ZF]], true),
};
// the marks a frame can carry, in paint order: its step text, the safe rewrite's text, the splice tape, the grease-pencil cross
export const CELL_MARKS = [
  ["r", "iso-line", "lo", true],
  ["s", "iso-line", "lo", true],
  ["t", "iso-line fs-tape", "mid", false],
  ["x", "iso-line", "red", false],
];
export const cellShift = (s, n) => k.translateAlong(P, [(s - n) * PITCH, 0, 0]);
export const periodShift = (s) => k.translateAlong(P, [(s - Math.floor(s)) * PITCH, 0, 0]);
// frame lines and perforations every pitch, one pitch beyond both ends so the shift never shows a gap
export function periodic() {
  let lines = "";
  let perfs = "";
  for (let x = GATE_X + 3.5 - PITCH * 7; x <= ROLL.x[1] + 1; x += PITCH) {
    if (x < ROLL.x[0] - PITCH - 1) continue;
    lines += path([[x, Y0, ZF], [x, Y1, ZF]]);
    perfs += path([[x - 0.6, Y1 - 1.9, ZF], [x + 0.6, Y1 - 1.9, ZF], [x + 0.6, Y1 - 0.6, ZF], [x - 0.6, Y1 - 0.6, ZF]], true);
  }
  return { lines, perfs };
}

// ---------------------------------------------------------------- reels
export const packOf = (side, s) => Math.sqrt(RHO[0] ** 2 + C * (side ? s - S_MIN : S_MAX - s));
export const turnOf = (side, s) => (2 * PITCH * (side ? packOf(1, s) - RHO[0] : RHO[1] - packOf(0, s))) / C;
const onFlange = (cx, r, a) => [cx + r * Math.cos(a), REEL_Y.front[1] + 0.05, SPINDLE_Z + r * Math.sin(a)];
const arc = (cx, r, a0, a1, steps = 10) => Array.from({ length: steps + 1 }, (_, i) => onFlange(cx, r, a0 + ((a1 - a0) * i) / steps));
// the wound film between the flanges, exactly as wide as the strip
const reelFrame = (side) => G.frameOf([REWIND_X[side], 0, SPINDLE_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
export const packSolid = (side, s) => G.disc(Y0, Y1, packOf(side, s), reelFrame(side), P, { steps: 48 });
// three windows in the near flange, the film pack seen through them
export function windowsOf(side, s) {
  const cx = REWIND_X[side];
  const rho = packOf(side, s);
  const phi = turnOf(side, s);
  let holes = "";
  let pack = "";
  let edge = "";
  for (let j = 0; j < 3; j++) {
    const a0 = phi + (j * 2 * Math.PI) / 3;
    const a1 = a0 + 1.35;
    holes += path([...arc(cx, 27, a0, a1), ...arc(cx, 9.5, a1, a0, 4)], true);
    // the pack sits a hair inside the window's rim so the rim's stroke stays whole
    const top = Math.min(rho, 26.7);
    const da = 0.3 / top;
    pack += path([...arc(cx, top, a0 + da, a1 - da), ...arc(cx, 9.8, a1 - 0.03, a0 + 0.03, 4)], true);
    if (rho < 26.6) edge += path(arc(cx, rho, a0, a1));
  }
  return { holes, pack, edge };
}
// the crank arm turns with its reel; the handle rides round on it
export function crankOf(side, s) {
  const a = turnOf(side, s) + (side ? 0.6 : 2.2);
  const F = G.frameOf([REWIND_X[side], CRANK.y, SPINDLE_Z], [0, 1, 0], [Math.cos(a), 0, Math.sin(a)], [-Math.sin(a), 0, Math.cos(a)]);
  const poly = G.stadium(2.6, 1.9, CRANK.len, 12);
  return { arm: G.prismOf(F, poly, 0, CRANK.t, P), at: [Math.cos(a) * CRANK.len, 0, Math.sin(a) * CRANK.len], F, poly };
}
// the free film between a pack and its guide roller: the internal tangent of the two circles, then the wrap over the roller.
// Where it runs round the roller's far side it is a separate piece, drawn behind the roller.
const VIEW = G.viewOf(P);
const SILHOUETTE = Math.atan2(VIEW[2], VIEW[0]) + Math.PI / 2; // the roller's far half begins past this angle
const strip = (line) => {
  if (line.length < 2) return { fill: "", edges: "", line };
  const at3 = (y) => line.map(([x, z]) => [x, y, z]);
  return { fill: path([...at3(Y0), ...at3(Y1).reverse()], true), edges: path(at3(Y0)) + path(at3(Y1)), line };
};
export function spanOf(side, s) {
  const cx = REWIND_X[side];
  const rho = packOf(side, s);
  const a = [cx, SPINDLE_Z];
  const b = [ROLL.x[side], ROLL.z];
  const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const u = [(a[0] - b[0]) / d, (a[1] - b[1]) / d];
  const ca = (rho + ROLL.r) / d;
  const sa = Math.sqrt(Math.max(0, 1 - ca * ca)) * (side ? -1 : 1);
  const n = [u[0] * ca - u[1] * sa, u[0] * sa + u[1] * ca];
  const pa = [a[0] - rho * n[0], a[1] - rho * n[1]];
  // the wrap runs from the tangent point over the top: past the left side on the feed roller, from the right on the take-up's
  let angleB = Math.atan2(n[1], n[0]);
  if (!side && angleB < 0) angleB += 2 * Math.PI;
  const on = (t) => [b[0] + ROLL.r * Math.cos(t), b[1] + ROLL.r * Math.sin(t)];
  const far = [pa];
  const near = [];
  if (angleB > SILHOUETTE) {
    for (let i = 0; i <= 3; i++) far.push(on(angleB + ((SILHOUETTE - angleB) * i) / 3));
    for (let i = 0; i <= 3; i++) near.push(on(SILHOUETTE + ((Math.PI / 2 - SILHOUETTE) * i) / 3));
  } else {
    near.push(pa);
    for (let i = 0; i <= 4; i++) near.push(on(angleB + ((Math.PI / 2 - angleB) * i) / 4));
  }
  return { far: strip(far.length > 1 ? far : []), near: strip(near) };
}

// ---------------------------------------------------------------- viewer screen (face plane of the screen glass)
export const SCREEN_M = k.sideMatrix([0, SCREEN.y], 0, P, "left");
export const FH = 15; // one frame's height on the screen
export const SCREEN_X = "M-63 -7.5L-40.6 7.5M-63 7.5L-40.6 -7.5"; // the cross on the projected frame, corner to corner of its picture area
export const screenY = (s, n) => -43.5 + (n - s) * FH;
// a frame line is drawn only while it lies on the glass (the clip would hide it, but a hidden line still has ends)
export const screenLine = (s, n) => {
  const y = screenY(s, n) - FH / 2;
  return y > -SCREEN.z1 + 0.3 && y < -SCREEN.z0 - 0.3 ? `M${SCREEN.x0} ${-FH / 2}H${SCREEN.x1}` : "";
};
export function screenFrame(n) {
  const r = hash(n);
  const lead = runOf(n) < 0;
  const y = (dy) => dy;
  const line = `M${SCREEN.x0} ${y(-FH / 2)}H${SCREEN.x1}`;
  const perf = `M-39.6 ${-FH / 2 - 0.9}h1.6v1.8h-1.6Z`;
  const text = lead ? "" : [-4.2, -0.6, 3].map((dy, i) => `M-59.5 ${dy}h${(7 + r() * (i === 1 ? 7 : 11)).toFixed(1)}`).join("");
  return { line, perf, text };
}

// ---------------------------------------------------------------- flag lever (pivot on the head's crown, swings in the face plane)
export function flagOf(f) {
  const a = Math.PI - (Math.PI / 2) * ease(f);
  const d = [Math.cos(a), Math.sin(a)];
  const q = [d[1], -d[0]];
  const F = G.frameOf([FLAG.x, FLAG.y, FLAG.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const p = (u, v) => [d[0] * u + q[0] * v, d[1] * u + q[1] * v];
  const armPoly = [p(-1.4, -0.9), p(FLAG.len, -0.9), p(FLAG.len, 0.9), p(-1.4, 0.9)];
  const platePoly = [p(FLAG.len - 6.2, 0.9), p(FLAG.len, 0.9), p(FLAG.len, 5.6), p(FLAG.len - 6.2, 5.6)];
  return { arm: G.prismOf(F, armPoly, 0, 1, P), plate: G.prismOf(F, platePoly, 0.15, 0.85, P), F, armPoly, platePoly };
}

// ---------------------------------------------------------------- splicer arm (hinged at the back, closes onto the lips)
// the arm's back end is turned round the hinge pin, so it clears the hinge block at every angle
const ARM_R = 2.6;
const ARM_POLY = [[21, -2.6], [21, 0.5], ...Array.from({ length: 7 }, (_, i) => {
  const t = Math.PI - Math.asin(0.5 / ARM_R) + ((Math.asin(0.5 / ARM_R) + Math.PI / 2) * i) / 6;
  return [ARM_R * Math.cos(t), ARM_R * Math.sin(t)];
})];
export function armOf(closed) {
  const th = ARM_OPEN * (1 - closed);
  const c = Math.cos(th);
  const n = Math.sin(th);
  const rot = ([u, v]) => [u * c - v * n, u * n + v * c];
  const F = G.frameOf([HINGE.x0, HINGE.y, HINGE.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const W = HINGE.x1 - HINGE.x0;
  const poly = ARM_POLY.map(rot);
  const solid = G.prismOf(F, poly, 0, W, P);
  const w = (x, [u, v]) => [x, HINGE.y + u, HINGE.z + v];
  // the two blades across the face that looks at the viewer: the underside once the arm stands up
  const under = n * 0.612 - c * 0.5 > 0;
  const v = under ? -2.6 : 0.5;
  const blades = [CUT_X - 3.5, CUT_X + 3.5].map((x) => path([w(x, rot([under ? 0 : -2.55, v])), w(x, rot([21, v]))])).join("");
  const knob = rot([22.4, -1.05]);
  const c3 = [CUT_X, HINGE.y + knob[0], HINGE.z + knob[1]];
  return { solid, blades, ball: G.sphereOf(c3, 2.1, P, { steps: 32 }), F, poly, W, c3 };
}

// ---------------------------------------------------------------- trim rack: a stack of pair cards per productive stem
export const CHIP = { w: 7, d: 9 };
export const chipPlan = (x, y) => ({ x: x - CHIP.w / 2, y: y - CHIP.d / 2, w: CHIP.w, d: CHIP.d, r: 0 });
export const PIN = { r: 0.7, top: PIN_TOP };
export function stackOf(pin, pairs) {
  const x = pinX(pin);
  const h = pairs * PER_PAIR;
  const plan = chipPlan(x, RACK.y);
  const solid = h > 0.05 ? k.slabOf(plan, RACK.top, h, P, 1) : null;
  let seams = "";
  for (let z = RACK.top + CHIP_H; z < RACK.top + h - 0.05; z += CHIP_H) seams += k.sideSeam(plan, z, P, 1);
  const top = RACK.top + h;
  return { solid, seams, top, h, plan, x };
}
// a pin's visible rod: from its stack up to the tip, or, while a card comes down onto it, below the card and above it
export function stemOf(pin, pairs, chip) {
  const x = pinX(pin);
  const base = RACK.top + pairs * PER_PAIR;
  const on = chip && chip.down && chip.pin === pin;
  const lo = on ? chip.at[2] : PIN.top;
  const hi = on ? chip.at[2] + CHIP_H : PIN.top;
  const rod = (z0, z1) => (z1 - z0 > 0.05 ? { z0, z1, paths: k.cylinder(x, RACK.y, PIN.r, z0, z1 - z0, P, 6) } : null);
  return { x, below: rod(base, lo), above: rod(hi, PIN.top) };
}
export const chipSolid = () => k.slabOf(chipPlan(CUT_AT[0], CUT_AT[1]), CUT_AT[2], CHIP_H, P, 1);
// the cut frame's grease-pencil cross and its own text, carried on the card's top
export function chipMarks(n) {
  const [x, y, z] = CUT_AT;
  const zt = z + CHIP_H;
  const p = (dx, dy) => [x + dx, y + dy, zt];
  return { x: path([p(-3.5, -4.5), p(3.5, 4.5)]) + path([p(-3.5, 4.5), p(3.5, -4.5)]), rules: rulesAt(n, x, zt) };
}
export const chipShift = (pos) => k.translateAlong(P, [pos[0] - CUT_AT[0], pos[1] - CUT_AT[1], pos[2] - CUT_AT[2]]);
