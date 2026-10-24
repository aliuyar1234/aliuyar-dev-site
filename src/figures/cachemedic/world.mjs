// Fig 16 world: camera, layout and every part that moves, as pure functions of a pose.
// Shared by art.mjs (build time), build.mjs (previews, audit) and live.js (browser), so all three draw the same thing.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import D from "./data.mjs";
import { ellipseRing } from "./round.mjs";

// ---------------------------------------------------------------- layout (world units, z up)
// The operator stands at +y (the lower-left face): 12 o'clock is -y, 3 o'clock +x, and the record turns clockwise (phi rising).
export const C = [-12, -4]; // spindle
export const PLINTH = { x: -104, y: -112, w: 205, d: 226, r: 10 };
export const PLINTH_H = 20;
export const FOOT_H = 4; // the turntable's own feet, standing on the bench
export const DECK = k.insetPlan(PLINTH, 6);
export const DZ = 2.5; // deck top
export const FRONT = PLINTH.y + PLINTH.d; // the operator's face, y = 114
// the family bench under it: a low plate on feet, a ruler strip and the maker's plate along its front edge
export const BENCH_Z = -PLINTH_H - FOOT_H; // bench top
export const BENCH = { x: PLINTH.x - 6, y: PLINTH.y - 6, w: PLINTH.w + 14, d: PLINTH.d + 24, r: 8 };
export const BENCH_H = 8;
export const BENCH_FOOT = 6;
export const PLATTER_R = 80;
export const PLATTER_Z = DZ + 1.2;
export const PLATTER_TOP = PLATTER_Z + 12;
export const MAT_R = 77;
export const REC_R = 75;
export const REC_Z = PLATTER_TOP + 0.8;
export const TOP = REC_Z + 1.2; // record surface
export const LABEL_R = 18;
export const PITCH = 3.1;
export const RINGS = Array.from({ length: 16 }, (_, i) => 25 + i * PITCH); // 16 groove rings, one per head of gpt2-medium
export const HIT = [3, 8, 9, 13]; // rings that carry the defect (p_h = 0.25 of 16)
export const RS = RINGS[8]; // the ring the stylus rides

// tonearm: pivot at 2 o'clock, parked toward the operator, trailing in the groove
export const T = [C[0] + 105 * Math.cos(-0.52), C[1] + 105 * Math.sin(-0.52)];
export const ZP = TOP + 8; // horizontal pivot height
const TUBE_END = 92;
const HS_LEN = 15;
const TIP_AT = 12.6; // stylus along the headshell
export const ARM_LIFT = (3.4 * Math.PI) / 180;
// cleaning arm: a radial bridge hinged beyond the platter rim at 12 o'clock; its head spans every groove ring
export const PHI_B = (-70 * Math.PI) / 180; // the head's angle on the record, upstream of the stylus and clear of the tonearm
const R_PIV = 96;
export const PC = [C[0] + R_PIV * Math.cos(PHI_B), C[1] + R_PIV * Math.sin(PHI_B)];
export const ZC = TOP + 10.4; // hinge height: the head stands on the record with the arm level
// console along the operator's edge
export const CONSOLE = { x: C[0] - 80, y: 81, w: 180, d: 25, r: 3 };
export const CON_Z = DZ + 7;

export const WIDTH = 600;
export const HEIGHT = 400;
export const P = k.fitProjection(
  [...k.boxCorners(BENCH, BENCH_Z - BENCH_H - BENCH_FOOT, BENCH_Z), [T[0], T[1], ZP + 8], [C[0] - 80, C[1] - 80, PLATTER_TOP], [PC[0], PC[1], ZC + 6]],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 45 },
);

const at = (p) => k.iso(p, P);
const pol = (r, a, z = TOP) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a), z];
const add = (p, q, s = 1) => [p[0] + q[0] * s, p[1] + q[1] * s, p[2] + q[2] * s];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export { smooth };

// ---------------------------------------------------------------- tonearm geometry
// The arm turns by theta about the pillar and pitches by psi about the yoke pin.
function armFrame(theta, psi) {
  const c = Math.cos(psi);
  const d = [Math.cos(theta) * c, Math.sin(theta) * c, Math.sin(psi)];
  const side = [-Math.sin(theta), Math.cos(theta), 0];
  const up = G.cross3(d, side);
  return { o: [T[0], T[1], ZP], d, side, up };
}
const stylusOf = (theta, beta, psi = 0) => {
  const f = armFrame(theta, psi);
  const h = G.add3(G.mul3(f.d, Math.cos(beta)), G.mul3(f.side, Math.sin(beta)));
  return add(add(f.o, f.d, TUBE_END + 4), h, TIP_AT);
};
// solve the play angle and the headshell offset so the stylus sits on ring RS with the cartridge along the groove
const PARK = (82 * Math.PI) / 180; // parked toward the front-right corner, the headshell clear of the platter
function solve() {
  let beta = -0.3;
  let theta = 2;
  for (let pass = 0; pass < 8; pass++) {
    let lo = PARK;
    let hi = Math.PI + 0.3;
    const err = (t) => Math.hypot(stylusOf(t, beta)[0] - C[0], stylusOf(t, beta)[1] - C[1]) - RS;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (err(mid) > 0) lo = mid;
      else hi = mid;
    }
    theta = (lo + hi) / 2;
    const s = stylusOf(theta, beta);
    const phi = Math.atan2(s[1] - C[1], s[0] - C[0]);
    beta = wrap(phi + Math.PI / 2 - theta); // the groove carries the stylus away from the pivot: a trailing arm
  }
  const s = stylusOf(theta, beta);
  return { theta, beta, phi: Math.atan2(s[1] - C[1], s[0] - C[0]) };
}
export const ARM = { ...solve(), park: PARK };
export const PHI_S = ARM.phi; // world angle of the stylus on the record

// tonearm pose from the cue value a in [0, 1]: lift off the rest, swing, lower into the groove
export function armPose(a) {
  const lift = smooth(0, 0.2, a) * (1 - smooth(0.82, 1, a));
  const swing = smooth(0.16, 0.86, a);
  return { theta: ARM.park + (ARM.theta - ARM.park) * swing, psi: ARM_LIFT * lift, down: smooth(0.9, 1, a) };
}

// cleaning arm: a level radial arm in the groove, or pitched up about its hinge, which lifts the inner end most
export const CLEAN = { theta: PHI_B + Math.PI, piv: R_PIV };
export const CL_LIFT = (8 * Math.PI) / 180;
export function cleanPose(b) {
  const e = smooth(0, 1, b);
  return { theta: CLEAN.theta, psi: CL_LIFT * (1 - e), down: smooth(0.85, 1, b) };
}
function cleanFrame(theta, psi) {
  const c = Math.cos(psi);
  const d = [Math.cos(theta) * c, Math.sin(theta) * c, Math.sin(psi)];
  const side = [-Math.sin(theta), Math.cos(theta), 0];
  return { o: [PC[0], PC[1], ZC], d, side, up: G.cross3(d, side) };
}
// the head, in arm coordinates (u along the arm from the hinge, v to the upstream side, w up from the hinge):
// it spans the record from r = 74 to r = 23, every groove ring, with the roller downstream and the tufts upstream
const HU = [R_PIV - 74, R_PIV - 23];
const HW = ZC - TOP;
export const HEAD = {
  u: HU,
  spine: { v: [-2.2, 2.2], z: [8.8, 11.6] }, // z above the record
  ferrule: { v: [-0.2, 2.6], z: [7.4, 8.8] },
  tufts: { n: 12, v: [0.3, 2.2], z: [0, 7.4] },
  roller: { v: -3.4, r: 2.2, cap: 2.7 },
  cheek: { v: [-4.6, -0.2], z: [1.2, 8.8] },
};

// ---------------------------------------------------------------- moving solids
// Each part: { name, paths, tone, lit, crease, shape }. `shape` is an audit descriptor (see build.mjs).
const frameOn = (o, a, u) => G.frameOf(o, a, u, G.cross3(a, u));

export function tonearmParts(pose) {
  const { theta, psi } = pose;
  const f = armFrame(theta, psi);
  const F = frameOn(f.o, f.d, f.up);
  const parts = [];
  const put = (name, paths, style, shape) => parts.push({ name, paths, ...style, shape });
  // yoke: two cheeks either side of the pitch pin, turning with theta only; -side faces the viewer over the whole swing
  const flat = armFrame(theta, 0);
  const Y = G.frameOf([T[0], T[1], ZP - 4.6], [0, 0, 1], flat.d, flat.side);
  const cheek = (sgn) => [[-3.2, sgn * 3.2], [3.2, sgn * 3.2], [3.2, sgn * 4.6], [-3.2, sgn * 4.6]];
  put("arm.cheekFar", G.prismOf(Y, cheek(1), 0, 8.4, P), { tone: "mid" }, ["prism", Y, cheek(1), 0, 8.4]);
  // counterweight and its shaft behind the pin, the hub on the pin
  put("arm.weight", G.disc(-26, -15, 6, F, P, { bevel: 0.5, steps: 40 }), { tone: "mid" }, ["disc", F, -26, -15, 6]);
  put("arm.shaft", G.disc(-15, -2.8, 1.3, F, P, { steps: 16 }), { tone: "mid", crease: "none" }, ["disc", F, -15, -2.8, 1.3]);
  const Fh = G.frameAlong(f.o, flat.side);
  put("arm.hub", G.disc(-3.2, 3.2, 2.8, Fh, P, { steps: 24 }), { tone: "mid" }, ["disc", Fh, -3.2, 3.2, 2.8]);
  put("arm.cheekNear", G.prismOf(Y, cheek(-1), 0, 8.4, P), { tone: "mid" }, ["prism", Y, cheek(-1), 0, 8.4]);
  // tube and headshell collar
  put("arm.tube", G.disc(2.8, TUBE_END, 1.8, F, P, { steps: 20 }), { tone: "mid", crease: "none" }, ["disc", F, 2.8, TUBE_END, 1.8]);
  put("arm.collar", G.disc(TUBE_END, TUBE_END + 4, 2.5, F, P, { steps: 20 }), { tone: "mid" }, ["disc", F, TUBE_END, TUBE_END + 4, 2.5]);
  // headshell plate, turned by the offset angle, plugged into the collar; the cartridge under it
  const h = G.add3(G.mul3(f.d, Math.cos(ARM.beta)), G.mul3(f.side, Math.sin(ARM.beta)));
  const H = G.frameOf(add(add(f.o, f.d, TUBE_END + 4), f.up, -1.4), f.up, h, G.cross3(f.up, h));
  // the plate's rear edge is cut square to the tube, so it sits flat on the collar face
  const Hv = G.cross3(f.up, h);
  const shear = -(Hv[0] * f.d[0] + Hv[1] * f.d[1] + Hv[2] * f.d[2]) / Math.cos(ARM.beta);
  const plate = [[-3 * shear, -3], [HS_LEN - 1.5, -3.6], [HS_LEN, -2.6], [HS_LEN, 2.6], [HS_LEN - 1.5, 3.6], [3 * shear, 3]];
  const body = [[3.2, -2.4], [TIP_AT + 0.6, -2.4], [TIP_AT + 0.6, 2.4], [3.2, 2.4]];
  const drop = ZP - 1.4 - (TOP + 1.6);
  put("arm.cartridge", G.prismOf(H, body, -drop, 0, P), { tone: "mid" }, ["prism", H, body, -drop, 0]);
  const lift = [[4, 3.2], [7, 3.3], [8, 7.6], [5, 7.6]];
  put("arm.lift", G.prismOf(H, lift, 0.3, 1.1, P), { tone: "mid" }, ["prism", H, lift, 0.3, 1.1]);
  put("arm.headshell", G.prismOf(H, plate, 0, 1.4, P), { tone: "mid" }, ["prism", H, plate, 0, 1.4]);
  // stylus cantilever: from under the cartridge nose to the tip on the record
  const tip = add(add(H.o, h, TIP_AT), f.up, -(drop + 1.6));
  const root = add(add(H.o, h, TIP_AT - 1.8), f.up, -drop);
  return { parts, stylus: { root, tip }, pins: [add(f.o, flat.side, 4.6), add(f.o, flat.side, -4.6)] };
}

export function cleanerParts(pose) {
  const { theta, psi } = pose;
  const f = cleanFrame(theta, psi);
  const F = frameOn(f.o, f.d, f.up);
  const parts = [];
  const put = (name, paths, style, shapes) => parts.push({ name, paths, ...style, shapes });
  const flat = cleanFrame(theta, 0);
  const Y = G.frameOf([PC[0], PC[1], ZC - 2.4], [0, 0, 1], flat.d, flat.side);
  const block = [[-2.4, -2.2], [2.4, -2.2], [2.4, 2.2], [-2.4, 2.2]];
  const [u0, u1] = HU;
  const { spine, ferrule, tufts, roller, cheek } = HEAD;
  // trim weight and rod behind the hinge block, the rod's run in front of it into the head's spine
  put("clean.weight", G.disc(-10, -5.4, 2.2, F, P, { steps: 16 }), { tone: "mid" }, [["disc", F, -10, -5.4, 2.2]]);
  put("clean.rodBack", G.disc(-5.4, -2.4, 0.9, F, P, { steps: 12 }), { tone: "mid", crease: "none" }, [["disc", F, -5.4, -2.4, 0.9]]);
  put("clean.block", G.prismOf(Y, block, 0, 4.8, P), { tone: "mid" }, [["prism", Y, block, 0, 4.8]]);
  put("clean.rod", G.disc(2.4, u0 - 1.6, 0.9, F, P, { steps: 12 }), { tone: "mid", crease: "none" }, [["disc", F, 2.4, u0 - 1.6, 0.9]]);
  // head boxes: polygons in (u, v), extruded in w; z is height above the record when the arm is level
  const H = G.frameOf(f.o, f.up, f.d, f.side);
  const box = (ua, ub, [va, vb]) => [[ua, va], [ub, va], [ub, vb], [ua, vb]];
  const w = (z) => z - HW;
  const prism = (poly, [za, zb]) => ({ paths: G.prismOf(H, poly, w(za), w(zb), P), shape: ["prism", H, poly, w(za), w(zb)] });
  const join = (list) => ({
    fill: list.map((p) => p.fill).join(""), outline: list.map((p) => p.outline).join(""), top: list.map((p) => p.top).join(""),
    crease: list.map((p) => p.crease).join(""), shades: [0, 1, 2, 3].map((i) => list.map((p) => p.shades[i]).join("")),
  });
  // a row of tufts with gaps between them, each a bristle block from the ferrule down to the record
  const len = (u1 - u0 - 1.2 - (tufts.n - 1) * 0.9) / tufts.n;
  const row = Array.from({ length: tufts.n }, (_, i) => prism(box(u0 + 0.6 + i * (len + 0.9), u0 + 0.6 + i * (len + 0.9) + len, tufts.v), tufts.z));
  put("clean.tufts", join(row.map((t) => t.paths)), { tone: "hi", lit: true, crease: "none" }, row.map((t) => t.shape));
  const fe = prism(box(u0, u1, ferrule.v), ferrule.z);
  put("clean.ferrule", fe.paths, { tone: "mid" }, [fe.shape]);
  const cOut = prism(box(u0 - 1.6, u0 - 0.6, cheek.v), cheek.z);
  put("clean.cheekOut", cOut.paths, { tone: "mid" }, [cOut.shape]);
  // the roller between the cheeks, with an end cap at each end
  const R = frameOn(add(add(f.o, f.side, roller.v), f.up, w(roller.r)), f.d, f.up);
  const caps = [[u0 - 0.6, u0 + 0.4], [u1 - 0.4, u1 + 0.6]];
  put("clean.capOut", G.disc(caps[0][0], caps[0][1], roller.cap, R, P, { steps: 24 }), { tone: "hi", lit: true }, [["disc", R, caps[0][0], caps[0][1], roller.cap]]);
  put("clean.roller", G.disc(u0 + 0.4, u1 - 0.4, roller.r, R, P, { steps: 24 }), { tone: "hi", lit: true }, [["disc", R, u0 + 0.4, u1 - 0.4, roller.r]]);
  put("clean.capIn", G.disc(caps[1][0], caps[1][1], roller.cap, R, P, { steps: 24 }), { tone: "hi", lit: true }, [["disc", R, caps[1][0], caps[1][1], roller.cap]]);
  const cIn = prism(box(u1 + 0.6, u1 + 1.6, cheek.v), cheek.z);
  put("clean.cheekIn", cIn.paths, { tone: "mid" }, [cIn.shape]);
  const sp = prism(box(u0 - 1.6, u1 + 1.6, spine.v), spine.z);
  put("clean.spine", sp.paths, { tone: "mid" }, [sp.shape]);
  // bristle strokes on each tuft's downstream face, from the ferrule to the record; axle ends on the cheeks
  const on = (u, v, z) => G.add3(G.add3(H.o, G.mul3(H.u, u)), G.add3(G.mul3(H.v, v), G.mul3(H.a, w(z))));
  const bristles = [];
  for (let i = 0; i < tufts.n; i++) for (const t of [0.33, 0.67]) {
    const u = u0 + 0.6 + i * (len + 0.9) + len * t;
    bristles.push([on(u, tufts.v[0], tufts.z[1]), on(u, tufts.v[0], tufts.z[0])]);
  }
  const axles = [on(u0 - 1.6, roller.v, roller.r), on(u1 + 1.6, roller.v, roller.r)];
  return { parts, bristles, axles };
}

// ---------------------------------------------------------------- knobs on the console (vertical axes)
// knob angle 0 points at the viewer (screen down), so every detent scale lies in front of its knob; types run left to right
const FACE = (3 * Math.PI) / 4;
export const SELECTOR = { x: C[0] - 44, y: CONSOLE.y + CONSOLE.d / 2, r: 5.4, angles: [75, 45, 15, -15, -45, -75].map((a) => (a * Math.PI) / 180) };
export const EPS_KNOB = { x: C[0] - 14, y: CONSOLE.y + CONSOLE.d / 2, r: 4.8, angles: [55, 0, -55].map((a) => (a * Math.PI) / 180) };
export const KNOB_TOP = { selector: CON_Z + 0.6 + 3.4, eps: CON_Z + 0.6 + 3.6 };
const toward = (cx, cy, a, u, v = 0) => [cx + u * Math.sin(a + FACE) + v * Math.cos(a + FACE), cy - u * Math.cos(a + FACE) + v * Math.sin(a + FACE)];
const BAR = [[-3.6, -1.4], [-3.6, 1.4], [5.4, 0.8], [6.6, 0], [5.4, -0.8]];
export function selectorBar(angle) {
  const ring = BAR.map(([u, v]) => toward(SELECTOR.x, SELECTOR.y, angle, u, v));
  return { paths: k.extrude(ring, KNOB_TOP.selector, 2.2, P, { bevel: 0.3 }), shape: ["prism", ring, KNOB_TOP.selector, 2.2] };
}
export function epsPointer(angle) {
  return k.lineOnTop(toward(EPS_KNOB.x, EPS_KNOB.y, angle, 1.3), toward(EPS_KNOB.x, EPS_KNOB.y, angle, EPS_KNOB.r - 0.9), KNOB_TOP.eps, P);
}
export { toward };

// ---------------------------------------------------------------- record surface: the four defect rings, cue bracket, strobe
// Cache position t maps to record angle q = -2*pi*t/T, so the stylus meets t in increasing order as the record turns.
const TAU = Math.PI * 2;
export const angleOfT = (t) => (-TAU * t) / D.T;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// offset of the defect trace from its ring at record angle q, in units of the largest drawn offset
function profile(type, q, ring) {
  const seed = ring * 7.3;
  const u = (-q * D.T) / TAU; // cache position
  switch (type) {
    case 0: // gaussian: noise scaled by the vector's RMS
      return 0.4 * Math.sin(u * 0.9 + seed) + 0.22 * Math.sin(u * 2.3 + seed * 2) + 0.12 * Math.sin(u * 5.1 + seed * 3);
    case 1: { // dropout: sparse elements zeroed, a notch toward the axis
      const cell = Math.floor(u / 9);
      if (hash(cell + seed) > 0.42) return 0;
      const x = u / 9 - cell - 0.5;
      return -Math.max(0, 1 - Math.abs(x) * 7);
    }
    case 2: // orthogonal rotation: the whole old segment turned, so the trace runs displaced
      return 0.75;
    case 3: { // sparse bit-flips: rare large jumps
      const cell = Math.floor(u / 14);
      if (hash(cell * 3.1 + seed) > 0.22) return 0;
      const x = u / 14 - cell - 0.5;
      return (hash(cell + seed + 9) > 0.5 ? 1 : -1) * 1.4 * Math.max(0, 1 - Math.abs(x) * 10);
    }
    case 4: // 8-bit de/quant: the trace snaps to steps
      return Math.round(2.4 * Math.sin(u * 0.35 + seed)) / 3.2;
    default: // contiguous overwrite: a donor block pressed in place of the window, a groove pitch off its ring
      return 1;
  }
}
const OFF = PITCH; // the largest drawn offset: one groove pitch
// sector of record angles a type corrupts: the old part of the groove, or the overwrite window
export function sectorOf(type) {
  if (type === D.heldOut) return [angleOfT(D.window[1]), angleOfT(D.window[0])];
  return [angleOfT(D.T - D.nRecent) + 0.0001, 0];
}
export const BUCKETS = [0.2, 0.4, 0.6, 0.8, 1];
const bucketOf = (alpha) => {
  let b = 0;
  while (b < BUCKETS.length - 1 && alpha > (BUCKETS[b] + BUCKETS[b + 1]) / 2) b++;
  return b;
};
// The four defect rings for one frame: spin (rad), type, eps (0..0.16, times the swap gate), repair (0..1, the head in the groove).
// Each ring is one loop; every segment carries three weights, plain groove, pressed defect and restored groove, and each
// layer is drawn in five opacity buckets, so the trace crossfades where the head lands or lifts instead of switching.
export const LAYERS = ["plain", "bad", "fixed"];
export function grooveTraces(spin, type, eps, repair) {
  const s = Math.min(1, eps / D.eps[1]); // all six operators run once eps > 0
  const amp = type === 0 ? eps / D.eps[2] : s; // only Gaussian noise grows with eps (sigma = eps * RMS)
  const [q0, q1] = sectorOf(type);
  const held = type === D.heldOut;
  const step = (1.5 * Math.PI) / 180;
  const ends = held ? 0 : 3 * step;
  const span = wrap(PHI_S - PHI_B);
  const out = LAYERS.map(() => BUCKETS.map(() => []));
  const nOut = Math.ceil((TAU - (q1 - q0)) / step);
  const nIn = Math.max(2, Math.ceil((q1 - q0) / step));
  for (const i of HIT) {
    const r = RINGS[i];
    const pts = [];
    const plain = (q) => pts.push({ p: at(pol(r, q + spin, TOP + 0.02)), w: null });
    for (let j = 0; j <= nOut; j++) plain(q1 - TAU + ((q0 - q1 + TAU) * j) / nOut);
    for (let j = 0; j <= nIn; j++) {
      const q = q0 + ((q1 - q0) * j) / nIn;
      const phi = q + spin;
      // the head restores the groove from where its roller leaves the record to just past the stylus
      const from = wrap(phi - PHI_B);
      const w = from > -0.04 && from < span + 0.1 ? smooth(-0.04, 0.05, from) * (1 - smooth(span + 0.02, span + 0.1, from)) : 0;
      const ramp = ends ? smooth(q0, q0 + ends, q) * (1 - smooth(q1 - ends, q1, q)) : 1;
      const e = repair * w;
      pts.push({ p: at(pol(r + OFF * amp * profile(type, q, i) * ramp * (1 - e), phi, TOP + 0.02)), w: [1 - s, s * (1 - e), s * e] });
    }
    plain(q1);
    // segment weights: a segment that touches the sector (the jogs at the window seams too) takes the sector's weights
    for (let L = 0; L < 3; L++) {
      let run = null;
      let bucket = -1;
      const flush = () => {
        if (run && run.length > 1) out[L][bucket].push(k.pathOf(run));
        run = null;
      };
      for (let j = 1; j < pts.length; j++) {
        const a = pts[j - 1].w;
        const b = pts[j].w;
        const wt = a && b ? (a[L] + b[L]) / 2 : (a || b) ? (a || b)[L] : L === 0 ? 1 : 0;
        if (wt < 0.1) {
          flush();
          continue;
        }
        const bk = bucketOf(wt);
        if (bk !== bucket) flush();
        if (!run) run = [pts[j - 1].p];
        bucket = bk;
        run.push(pts[j].p);
      }
      flush();
    }
  }
  return out.map((layer) => layer.map((list) => list.join("")));
}
// a grease-pencil cue bracket on the lead-in over the recent arc (t = 224 .. 256), turning with the record
export function cuePath(spin) {
  const rl = REC_R - 1.6;
  const tick = (q) => k.pathOf([at(pol(RINGS[RINGS.length - 1], q + spin)), at(pol(REC_R, q + spin))]);
  const q0 = 0;
  const q1 = angleOfT(D.T - D.nRecent) + TAU;
  const arc = k.pathOf(Array.from({ length: 13 }, (_, j) => at(pol(rl, q0 + spin + ((q1 - q0) * j) / 12))));
  return tick(q0) + tick(q1) + arc;
}
// strobe dots on the platter rim: two rows inset between plain bands, turning with the platter
export const STROBE = { seams: [PLATTER_Z + 1.9, PLATTER_Z + 7.1], rows: [PLATTER_Z + 3.5, PLATTER_Z + 5.5], belt: [PLATTER_Z + 7.9, PLATTER_Z + 9.5] };
const UPF = G.frameOf([C[0], C[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
export function strobeDots(spin) {
  const out = BUCKETS.map(() => []);
  const rows = [[STROBE.rows[0], 120, 0], [STROBE.rows[1], 120, Math.PI / 120]];
  for (const [z, n, off] of rows)
    for (const [x, y, alpha = 1] of G.dotsOf(UPF, z, PLATTER_R, n, P, { phase: spin + off, fade: [0.06, 0.45] }))
      if (alpha >= 0.1) out[bucketOf(alpha)].push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`); // a zero-length stroke with round caps: a dot
  return out.map((list) => list.join(""));
}

// ---------------------------------------------------------------- fixed-structure solid markup, so the page can rewrite its d attributes
export function solidFixed(paths, { tone = "hi", crease = "faint", lit = false, name = "" } = {}) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" data-r="s${i}" d="${paths.shades[i] || ""}"/>`).join("");
  const cr = crease === "none" ? "" : `<path class="iso-line iso-crease" data-tone="${crease}" data-r="crease" d="${paths.crease || ""}"/><path class="iso-line iso-bevel" data-tone="${crease}" data-r="bevel" d="${paths.bevel || ""}"/>`;
  return `<g class="iso-solid" data-m="${name}"${lit ? ' data-lit=""' : ""}><path class="iso-fill" data-r="fill" d="${paths.fill}"/>${shades}<path class="iso-top" data-r="top" d="${paths.top}"/>${cr}<path class="iso-line iso-edge" data-tone="${tone}" data-r="edge" d="${paths.outline}"/></g>`;
}

// cue lever on the tonearm boss: raised while the arm is up, level once the stylus is down
export const CUE = [T[0] - 8, T[1] + 6];
export function cueParts(down) {
  const tilt = 0.55 * (1 - down);
  const a = [0, Math.cos(tilt), Math.sin(tilt)];
  const o = [CUE[0], CUE[1] + 3, DZ + 6.4];
  const F = G.frameAlong(o, a);
  const end = add(o, a, 9.2);
  return {
    parts: [
      { name: "cue.rod", paths: G.disc(0, 7.6, 0.8, F, P, { steps: 12 }), tone: "mid", crease: "none", shape: ["disc", F, 0, 7.6, 0.8] },
      { name: "cue.knob", paths: G.sphereOf(end, 1.8, P, { steps: 20 }), tone: "mid", shape: ["ball", end, 1.8] },
    ],
  };
}

// the resting state: held-out type at full severity, both arms in the groove, the overwrite window straddling the head
export const STILL = {
  spin: PHI_B - (9 * Math.PI) / 180 - (angleOfT(D.window[0]) + angleOfT(D.window[1])) / 2,
  type: D.heldOut,
  eps: 2,
  a: 1,
  b: 1,
};
