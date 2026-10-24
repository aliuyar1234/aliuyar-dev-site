// Fig 13 geometry: a signal-box lever frame on a bench. Pure ESM (no Node APIs), shared by art.mjs, live.js and build.mjs.
// World units are about 1 px of the real thing: x along the frame, y toward the signalman, z up.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { LEVERS, SLOT_LEVERS, SPARE, THETA_N, LIFT, SHIFT, CROSS, CROSS_IN, VEE, SLOPE, METER, thetaOf, tappetOf, shiftOf, crossOf } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 540;

// ------------------------------------------------------------------ layout
export const LX = [-72, -60, -42, -30, -18, -6, 6, 18, 30];
const BENCH = { x: -102, y: -60, w: 156, d: 142, r: 9 };
const BENCH_H = 12;
const FOOT_H = 7;
const FRAME = { x0: -81, x1: 39, back: -40, front: 4 };
const FLOOR_Z = 32; // floor plate top
const BASE_Z = 33.2; // quadrant base plate top
export const PIVOT = [-18, 10]; // (y, z) of the lever pivot shaft, inside the frame
const RQ = 30; // quadrant radius
const STD = [
  [-86, -81],
  [39, 44],
];
const COLUMNS = [-78, -51, 36];
const COL_Y = [-40.5, -36.5];
const SHELF = { x: -116, y: -54, w: 158, d: 20, r: 1.5 }; // runs out past the frame on a knee bracket for the meters
const SHELF_Z = [122, 125.5];
const TRAY = { x: -80.5, y: 4, w: 119, d: 56, r: 1.2 };
const BED = 2.4;
const TAP_TOP = 4.4;
const BAR_Z = [5.0, 6.6];
const TAP_Y = [-12, 48]; // a tappet runs forward (+y) when its lever is reversed
const TAP_HW = 2.5;
const CH = { A: 40, B: 30, C: 20 }; // channel y: cross-lock, core bar, distractor bar
const NOTCH = 2.6;
export const FACE_Y = -45.4; // repeater face plane
const DIAL_Z = 135.5;

// camera: azimuth 45, elevation 30, as every plate in the catalogue
export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...k.boxCorners({ x: SHELF.x, y: SHELF.y, w: SHELF.w, d: SHELF.d, r: 0 }, 0, 146)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45, elevation: 30 },
);

// ------------------------------------------------------------------ small helpers
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const at = (p) => k.iso(p, P);
const pts = (list) => list.map(at);
const r1 = (v) => Math.round(v * 10) / 10;
const XF = (x0 = 0) => G.frameOf([x0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]); // prisms in the (y, z) plane, extruded along x
const YF = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]); // turned parts whose axis points at the signalman
const xPrism = (poly, x0, x1) => G.prismOf(XF(), poly, x0, x1, P);
const xShape = (poly, x0, x1, meta) => A.prism(XF(), poly, x0, x1, meta);
const yPrism = (poly, y0, y1) => G.prismOf(YF([0, 0, 0]), poly, y0, y1, P); // plates in the (x, z) plane, extruded along y
const voidSvg = (points) => `<path style="fill:var(--anatomy-shade-0);stroke:none" d="${k.pathOf(pts(points), true)}"/>${L(k.pathOf(pts(points), true), { tone: "lo" })}`;

function clipZ(poly, zc) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ina = a[1] >= zc;
    const inb = b[1] >= zc;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (zc - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, zc]);
    }
  }
  return out;
}

// a point of a lever, given its angle: t along the lever from the pivot, w toward the front
const yzOf = (theta, t, w) => [PIVOT[0] + t * Math.sin(theta) + w * Math.cos(theta), PIVOT[1] + t * Math.cos(theta) - w * Math.sin(theta)];
const p3 = (x, theta, t, w) => {
  const [y, z] = yzOf(theta, t, w);
  return [x, y, z];
};
const halfWidth = (t) => 2.4 - (0.9 * (t - 18)) / 68;
const ROD_W = (t) => -halfWidth(t) - 0.85;

// ------------------------------------------------------------------ a lever, in any pose
// pose: { stroke 0..1, lift 0..LIFT, squeeze 0..1 }
const ARC = [(-25 * Math.PI) / 180, (24 * Math.PI) / 180];
const BLOCK_ANGLE = Math.atan2(-halfWidth(30) - 1.2, 29.8);
export const NOTCHES = [THETA_N + BLOCK_ANGLE, thetaOf(1) + BLOCK_ANGLE];

// Shapes for the audit are made only when the audit kit is passed in, so the page bundle never loads it.
export function leverParts(index, pose = { stroke: 0, lift: 0, squeeze: 0 }, { collar = 0, lit = false, audit = null } = {}) {
  const x = LX[index];
  const world = Boolean(LEVERS[index].world);
  const theta = thetaOf(pose.stroke);
  const lift = pose.lift;
  const own = `lever.${LEVERS[index].id}`;
  const meta = (name) => ({ name: `${own}.${name}`, owner: own });
  const tw = (list) => list.map(([t, w]) => yzOf(theta, t, w));
  const parts = [];
  const shapes = [];
  const add = (svg, shape) => {
    parts.push(svg);
    if (audit) shapes.push(shape(audit));
  };
  const xs = (poly, x0, x1, name) => (K) => K.prism(XF(), poly, x0, x1, meta(name));
  // catch block, riding on the quadrant; it drops into a notch at each end of the stroke
  const hb = halfWidth(30);
  const block = tw([[28 + lift, -hb - 2.2], [31.6 + lift, -hb - 2.2], [31.6 + lift, -hb - 0.2], [28 + lift, -hb - 0.2]]);
  add(S(xPrism(block, x - 1.3, x + 1.3), { tone: "mid", crease: "lo" }), xs(block, x - 1.3, x + 1.3, "block"));
  // catch rod, square section, sliding through one guide on the back of the lever
  const rod = (t0, t1) => {
    const d = 0.45;
    return tw([[t0, ROD_W(t0) - d], [t1, ROD_W(t1) - d], [t1, ROD_W(t1) + d], [t0, ROD_W(t0) + d]]);
  };
  const g0 = 58.4;
  const g1 = 61.6;
  for (const [t0, t1] of [[31.6 + lift, g0], [g1, 85.7 + lift]]) {
    const poly = rod(t0, t1);
    add(S(xPrism(poly, x - 0.45, x + 0.45), { tone: "mid", crease: "none" }), xs(poly, x - 0.45, x + 0.45, "rod"));
  }
  const guide = tw([[g0, -halfWidth(g0)], [g1, -halfWidth(g1)], [g1, -halfWidth(g1) - 1.8], [g0, -halfWidth(g0) - 1.8]]);
  add(S(xPrism(guide, x - 0.9, x + 0.9), { tone: "mid", crease: "lo" }), xs(guide, x - 0.9, x + 0.9, "guide"));
  // catch handle: pivoted on the lever's back, squeezed toward the grip
  const phi = pose.squeeze * 0.09;
  const turn = ([t, w]) => {
    const dt = t - 84;
    const dw = w + 1.5;
    return [84 + dt * Math.cos(phi) - dw * Math.sin(phi), -1.5 + dt * Math.sin(phi) + dw * Math.cos(phi)];
  };
  const handle = tw([[83.6, -1.5], [84.6, -2.7], [95.2, -4.1], [96.0, -3.2]].map(turn));
  add(S(xPrism(handle, x - 0.8, x + 0.8), { tone: "mid", crease: "lo" }), xs(handle, x - 0.8, x + 0.8, "catch"));
  // the stem, cut where it leaves the slot in the quadrant base
  const stem = clipZ(tw([[16, -2.5], [86, -1.5], [86, 1.5], [16, 2.5]]), BASE_Z);
  add(S(xPrism(stem, x - 1.2, x + 1.2), { tone: "mid", crease: lit ? "lo" : "faint", lit: Boolean(lit) }), xs(stem, x - 1.2, x + 1.2, "stem"));
  // the grip: a turned handle on the lever's axis, with a ferrule where it meets the stem
  const axis = [0, Math.sin(theta), Math.cos(theta)];
  const F = G.frameAlong(p3(x, theta, 86, 0), axis);
  const ferrule = world ? 2.0 : 1.85;
  add(S(G.disc(0, world ? 2.4 : 1.2, ferrule, F, P, { steps: 12 }), { tone: "mid", crease: "lo" }), (K) => K.disc(F, 0, world ? 2.4 : 1.2, ferrule, meta("ferrule")));
  const g = world ? 2.4 : 1.2;
  const profile = [[g, 1.45], [g + 10.6, 1.45], [g + 11.8, 1.0], [g + 12.5, 0]];
  add(S(G.solidOf(profile, F, P, { steps: 12, smooth: false }), { tone: "mid", crease: "faint" }), (K) => K.solid(F, profile, meta("grip")));
  if (collar > 0) {
    // a lever collar: the sleeve a signalman drops over a lever that is out of use
    const C = G.frameAlong(p3(x, theta, 86 + g + 3.2, 0), axis);
    add(`<g data-collar opacity="${collar.toFixed(2)}">${S(G.ringBand(0, 4.2, 1.5, 2.3, C, P, { steps: 16 }), { tone: "mid", crease: "lo" })}</g>`, (K) => K.ring(C, 0, 4.2, 1.5, 2.3, meta("collar")));
  }
  return { svg: parts.join(""), shapes };
}

// ------------------------------------------------------------------ the tappets and locking tray
function tappetRing(index) {
  const x = LX[index];
  const id = LEVERS[index].id;
  const notches = [];
  const vee = (side, y) => notches.push({ side, y0: y - VEE.flank - VEE.flat, y1: y + VEE.flank + VEE.flat, vee: true });
  // a locking notch: its back wall sits PLAY behind the dog, so a locked tappet stops there; its front wall stands well
  // clear in front, where it never meets the dog
  const square = (side, y) => notches.push({ side, y0: y - 2.4, y1: y + 4.7, vee: false });
  if (id === "W1") vee(-1, CH.B), vee(1, CH.A);
  else if (id === "W2") vee(-1, CH.C), vee(-1, CH.A);
  else if (LEVERS[index].branch === "distractor") square(1, CH.C);
  else square(1, CH.B);
  const e = (side) => x + side * TAP_HW;
  const ring = [[e(-1), TAP_Y[0]], [e(1), TAP_Y[0]]];
  for (const n of notches.filter((n) => n.side > 0).sort((a, b) => a.y0 - b.y0)) {
    const inner = e(1) - NOTCH;
    ring.push([e(1), n.y0], n.vee ? [inner, n.y0 + VEE.flank] : [inner, n.y0], n.vee ? [inner, n.y1 - VEE.flank] : [inner, n.y1], [e(1), n.y1]);
  }
  ring.push([e(1), TAP_Y[1]], [e(-1), TAP_Y[1]]);
  for (const n of notches.filter((n) => n.side < 0).sort((a, b) => b.y0 - a.y0)) {
    const inner = e(-1) + NOTCH;
    ring.push([e(-1), n.y1], n.vee ? [inner, n.y1 - VEE.flank] : [inner, n.y1], n.vee ? [inner, n.y0 + VEE.flank] : [inner, n.y0], [e(-1), n.y0]);
  }
  return ring;
}

// a dog: a block in plan, with a V nose wherever it rides a V-notch, its flanks parallel to the notch's
function dogRing(x0, x1, y, { left = false, right = false, h = 1.5 } = {}) {
  const run = (h - VEE.tip) / SLOPE; // x length of a nose flank
  const t = VEE.tip;
  const ring = [[left ? x0 + run : x0, y - h], [right ? x1 - run : x1, y - h]];
  if (right) ring.push([x1, y - t], [x1, y + t]);
  ring.push([right ? x1 - run : x1, y + h], [left ? x0 + run : x0, y + h]);
  if (left) ring.push([x0, y + t], [x0, y - t]);
  return ring;
}

// ------------------------------------------------------------------ the instruments on the block shelf
// a face-plane group at y = FACE_Y: local x is world x, local y is world -z
const faceAt = (x, z, y = FACE_Y) => k.sideMatrix([x, y], z, P, "left");
const polar = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
const f2 = (v) => (Math.round(v * 10) / 10).toString(); // face-plane units, one decimal like every other path
const seg = (a, b) => `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`;
const circle = (r, cls, extra = "") => `<circle r="${r}" class="${cls}"${extra}/>`;

export function needleTransform(angle) {
  return `rotate(${((angle * 180) / Math.PI).toFixed(1)})`;
}

function repeaterDial(index) {
  const x = LX[index];
  const R = 4.2;
  const ticks = [];
  for (let i = 0; i <= 8; i++) {
    const a = -0.768 + (1.536 * i) / 8;
    const major = i % 4 === 0;
    ticks.push(seg(polar(R - (major ? 1.3 : 0.8), a), polar(R, a)));
  }
  const pin = polar(R - 0.7, (-60 * Math.PI) / 180);
  return `<g transform="${faceAt(x, DIAL_Z)}" class="oi-dial">${circle(R + 0.7, "oi-bezel")}${circle(R, "oi-face")}<path class="oi-tick" d="${ticks.join("")}"/><circle cx="${f2(pin[0])}" cy="${f2(pin[1])}" r="0.32" class="oi-pin"/><g data-needle="${index}" transform="${needleTransform(-1.047)}"><path class="oi-needle" data-free="" d="M0 0.9L0 -3.5"/></g>${circle(0.5, "oi-hub")}<g transform="translate(0 6.4)">${circle(1.35, "oi-bezel")}<circle r="0.9" class="oi-lamp" data-lamp="${index}"/></g><circle cx="-3.9" cy="-5.3" r="0.32" class="oi-screw"/><circle cx="3.9" cy="-5.3" r="0.32" class="oi-screw"/></g>`;
}

// the two meters on the bracket end of the shelf: FlipAcc and PVS of the selected scorer, 0.5 to 1.0 (Table 2)
export const METERS = [-108, -96];
const deg = (a) => ((a * 180) / Math.PI).toFixed(1);
function meterDial(x, index, angle) {
  const R = 4.2;
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = -METER.arc + (2 * METER.arc * i) / 10;
    ticks.push(seg(polar(R - (i % 5 === 0 ? 1.3 : 0.8), a), polar(R, a)));
  }
  const pin = polar(R - 0.7, METER.park - 0.12);
  const screw = `<g transform="translate(0 6.4)">${circle(1.05, "oi-bezel")}<path class="oi-tick" d="M-1.05 0L1.05 0"/></g>`;
  return `<g transform="${faceAt(x, DIAL_Z)}">${circle(R + 0.7, "oi-bezel")}${circle(R, "oi-face")}<path class="oi-tick" d="${ticks.join("")}"/><circle cx="${f2(pin[0])}" cy="${f2(pin[1])}" r="0.32" class="oi-pin"/><g data-meter="${index}" transform="${needleTransform(angle)}"><path class="oi-needle" d="M0 0.9L0 -3.7"/></g>${circle(0.5, "oi-hub")}${screw}<circle cx="-3.9" cy="-5.3" r="0.32" class="oi-screw"/><circle cx="3.9" cy="-5.3" r="0.32" class="oi-screw"/></g>`;
}
// the arm repeater: a miniature semaphore arm on its post, level (on) for a doomed splice, dropped (off) otherwise
export const ARM_X = -84;
const PIVOT_ARM = [-2.2, -0.6];
export const armTransform = (angle) => `translate(${PIVOT_ARM[0]} ${PIVOT_ARM[1]}) rotate(${deg(angle)})`;
function armDial(x, angle) {
  const R = 4.2;
  const pivot = PIVOT_ARM;
  const post = seg(pivot, [pivot[0], Math.sqrt(R * R - pivot[0] * pivot[0])]); // the arm's post, down to the rim
  const arm = `<g data-arm transform="${armTransform(angle)}"><path class="oi-arm" d="M0 -0.45L5.6 -0.75L5.6 0.75L0 0.45Z"/><path class="oi-stripe" d="M4.3 -0.69L4.3 0.69"/></g>`;
  return `<g transform="${faceAt(x, DIAL_Z)}">${circle(R + 0.7, "oi-bezel")}${circle(R, "oi-face")}<path class="oi-post" d="${post}"/>${arm}<circle cx="${pivot[0]}" cy="${pivot[1]}" r="0.55" class="oi-hub"/><g transform="translate(0 6.4)">${circle(1.05, "oi-bezel")}<path class="oi-tick" d="M-1.05 0L1.05 0"/></g><circle cx="-3.9" cy="-5.3" r="0.32" class="oi-screw"/><circle cx="3.9" cy="-5.3" r="0.32" class="oi-screw"/></g>`;
}

export const COMMUTATOR = { x: -60, z: 135.5, angles: { trace: -0.7, prefix: 0, local: 0.7 } };
export function commutatorHandle(angle, audit = null) {
  const { x, z } = COMMUTATOR;
  const y0 = FACE_Y - 0.4;
  const F = G.frameOf([x, y0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const [s, c] = [Math.sin(angle), Math.cos(angle)];
  const bar = [[-0.85, -0.6], [0.85, -0.6], [0.5, 4.6], [-0.5, 4.6]].map(([u, v]) => [u * c + v * s, -u * s + v * c]);
  const handle = G.prismOf(F, bar, 0.4, 1.9, P);
  const boss = G.disc(0, 2.3, 1.55, F, P, { steps: 16 });
  const tip = polar(4.1, angle).map((v, i) => (i ? -v : v));
  const svg = S(handle, { tone: "mid", crease: "lo" }) + S(boss, { tone: "mid", crease: "lo" }) + D([at([x + tip[0], y0 + 1.9, z + tip[1]])], { size: 0.45, tone: "hi" });
  return { svg, shapes: audit ? [audit.prism(F, bar, 0.4, 1.9, { name: "shelf.commutator.handle", owner: "commutator" }), audit.disc(F, 0, 2.3, 1.55, { name: "shelf.commutator.boss", owner: "commutator" })] : [] };
}
export const DOMAIN_KNOB = { x: -72, z: 135.5, angles: { arith: -0.6, logic: 0.6 } };

// ------------------------------------------------------------------ the whole scene, as ordered items
// Each item: { name, svg, shapes, part? }. part names the live group that moves it.
export function build(rest = {}) {
  const items = [];
  const put = (name, svg, shapes = [], extra = {}) => items.push({ name, svg, shapes, ...extra });
  const dark = (d) => `<path style="fill:var(--anatomy-shade-0);stroke:none" d="${d}"/>`;

  // ---- bench
  const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
  put("stand.halo", halo, [A.slab(BENCH, -BENCH_H - FOOT_H - 0.05, 0.05, { name: "stand.halo" })]);
  // the far foot is wholly under the bench, so only the three that show are drawn
  // feet sit close enough to the edge that they show below it; one foot is drawn once and placed at the others
  const feet = k.corners(BENCH, 10.5).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)).slice(1);
  feet.forEach(([fx, fy], i) => {
    put(`stand.foot${i}`, S(k.cylinder(fx, fy, 6, -BENCH_H - FOOT_H, 1.8, P, 18), { tone: "lo" }) + S(k.cylinder(fx, fy, 4.4, -BENCH_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 18), { tone: "mid", crease: "faint" }), [
      A.cylinder(fx, fy, 6, -BENCH_H - FOOT_H, 1.8, { name: `stand.foot${i}.pad` }),
      A.cylinder(fx, fy, 4.4, -BENCH_H - FOOT_H + 1.8, FOOT_H - 1.8, { name: `stand.foot${i}` }),
    ], { family: "foot", fx, fy });
  });
  const groove = k.insetPlan(BENCH, 5);
  const benchInner = L(k.sideSeam(BENCH, -4, P, 8), { tone: "faint" });
  const screws = k.corners(BENCH, 9);
  put("stand.bench", S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "lo", inner: benchInner }) + L(k.planOutline(groove, 0, P), { tone: "faint" }) + screws.map(([sx, sy]) => L(k.ring(sx, sy, 2.1, 0, P, 16), { tone: "lo" })).join("") + D(pts(screws.map(([sx, sy]) => [sx, sy, 0])), { size: 0.5 }), [A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench" })]);

  // ruler strip along the front, and the label plate with the maker's mark
  const strip = { x: -52, y: 72, w: 104, d: 6.4, r: 1 };
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 2, 5, strip.y + 0.01, 0.6, [1.8, 3.4], P);
  put("stand.ruler", S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }), [A.slab(strip, 0, 0.6, { name: "stand.ruler" }, 3)]);
  const plate = { x: -94, y: 66, w: 34, d: 12, r: 1.4 };
  const pz = 0.8;
  const rules = [
    [[plate.x + 13, plate.y + 3.4], [plate.x + 30, plate.y + 3.4]],
    [[plate.x + 13, plate.y + 6.0], [plate.x + 27, plate.y + 6.0]],
    [[plate.x + 13, plate.y + 8.6], [plate.x + 23.5, plate.y + 8.6]],
  ];
  put(
    "stand.label",
    S(k.slabOf(plate, 0, pz, P, 4), { tone: "mid", crease: "lo" }) +
      L(k.planOutline(k.insetPlan(plate, 1.6), pz, P, 4), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([plate.x + 3.4, plate.y + 7.9], pz, P, "x"), "AU-13", { size: 3.3, tone: "mid" }) +
      rules.map(([a, b]) => L(k.lineOnTop(a, b, pz, P), { tone: "lo", free: true })).join("") +
      D(pts([[plate.x + 2.4, plate.y + 2.4, pz], [plate.x + plate.w - 2.4, plate.y + plate.d - 2.4, pz]]), { size: 0.45 }),
    [A.slab(plate, 0, pz, { name: "stand.label" }, 4)],
  );

  // the collar peg: the lever collar rests here while every lever is in use, and goes onto lever 8 for logic
  {
    const [cx, cy] = [46.5, 40];
    const F = G.frameAlong([cx, cy, 0.8], [0, 0, 1]);
    // the peg stops low enough inside the collar that the collar hides all of it
    put("stand.peg", S(k.cylinder(cx, cy, 2.8, 0, 0.8, P, 20), { tone: "mid", crease: "faint" }) + D(pts([[cx - 2.0, cy + 0.9, 0.8], [cx + 2.0, cy - 0.9, 0.8]]), { size: 0.38 }) + S(k.cylinder(cx, cy, 1.15, 0.8, 2.2, P, 16), { tone: "mid", crease: "faint" }), [
      A.cylinder(cx, cy, 2.8, 0, 0.8, { name: "stand.peg.flange", owner: "peg" }),
      A.cylinder(cx, cy, 1.15, 0.8, 2.2, { name: "stand.peg", owner: "peg" }),
    ]);
    put("stand.collar", `<g data-collar-rest>${S(G.ringBand(0, 4.2, 1.5, 2.3, F, P, { steps: 16 }), { tone: "mid", crease: "lo" })}</g>`, [A.ring(F, 0, 4.2, 1.5, 2.3, { name: "stand.collar" })]);
  }

  // ---- frame: far standard, girders, floor plates
  const stdPoly = [[-45, 2], [9, 2], [6, 33], [-42, 33]];
  // a rounded loop in the plane x = const, for the cast web of the near standard
  const loopX = (x, y0, y1, z0, z1, r) => {
    const out = [];
    const corner = (cy, cz, a0) => {
      for (let s = 0; s <= 4; s++) {
        const a = a0 + (s * Math.PI) / 8;
        out.push([x, cy + r * Math.cos(a), cz + r * Math.sin(a)]);
      }
    };
    corner(y1 - r, z0 + r, -Math.PI / 2);
    corner(y1 - r, z1 - r, 0);
    corner(y0 + r, z1 - r, Math.PI / 2);
    corner(y0 + r, z0 + r, Math.PI);
    return out;
  };
  const standard = (side) => {
    const [x0, x1] = STD[side];
    const foot = side ? { x: x0, y: -48, w: 10, d: 60, r: 1 } : { x: x0 - 2.5, y: -48, w: 7.5, d: 60, r: 1 };
    const fx = side ? x1 + 2.5 : x0 - 1.3;
    const bolts = side ? [[fx, -44.5, 2], [fx, -18, 2], [fx, 8.5, 2]] : [[fx, -44.5, 2], [fx, 8.5, 2]];
    // the near standard is a cast web: a rib round the edge (two rules), a lightening hole, screws on the rib
    const rib = (d) => [[-45 + 1.1 * d, 2 + d], [9 - 1.1 * d, 2 + d], [6 - 0.9 * d, 33 - d], [-42 + 0.9 * d, 33 - d]].map(([y, z]) => [x1, y, z]);
    const hole = loopX(x1, -27.5, -9.5, 10.5, 24.5, 3.2);
    const inner = side
      ? L(k.pathOf(pts(rib(2.4)), true), { tone: "lo" }) +
        L(k.pathOf(pts(rib(3.4)), true), { tone: "faint" }) +
        `<path style="fill:var(--anatomy-shade-0);stroke:none" d="${k.pathOf(pts(hole), true)}"/>` +
        L(k.pathOf(pts(hole), true), { tone: "lo" }) +
        D(pts([[x1, -43.5, 3.2], [x1, 7.5, 3.2], [x1, 4.8, 31.8], [x1, -40.8, 31.8], [x1, -18.5, 3.2], [x1, -18.5, 31.8]]), { size: 0.45 })
      : "";
    const washers = side ? bolts.map(([bx, by]) => L(k.ring(bx, by, 1.5, 2, P, 14), { tone: "lo" })).join("") : "";
    put(`stand.std${side}.foot`, S(k.slabOf(foot, 0, 2, P, 3, 0.4), { tone: "lo", crease: "faint" }) + washers + D(pts(bolts), { size: 0.5 }), [A.slab(foot, 0, 2, { name: `stand.std${side}.foot` }, 3)]);
    put(`frame.std${side}`, S(xPrism(stdPoly, x0, x1), { tone: "mid", crease: "faint", inner }), [xShape(stdPoly, x0, x1, { name: `frame.std${side}` })]);
  };
  standard(0);
  const back = { x: FRAME.x0, y: FRAME.back, w: FRAME.x1 - FRAME.x0, d: 4, r: 0 };
  put("frame.back", S(k.slabOf(back, 0, 30, P, 2), { tone: "mid" }), [A.slab(back, 0, 30, { name: "frame.back" }, 2)]);
  const front = { x: FRAME.x0, y: 0, w: FRAME.x1 - FRAME.x0, d: 4, r: 0 };
  {
    let face = "";
    for (const x of LX) {
      face += voidSvg([[x - 3.1, 4, 1.9], [x + 3.1, 4, 1.9], [x + 3.1, 4, 5.0], [x - 3.1, 4, 5.0]].map(([px, py, pz]) => [px, py, pz]));
    }
    const bolts = [];
    for (let x = FRAME.x0 + 4; x <= FRAME.x1 - 3; x += 6) bolts.push([x, 4, 26.8]);
    face += D(pts(bolts), { size: 0.4, tone: "mid" });
    put("frame.front", S(k.slabOf(front, 0, 30, P, 2), { tone: "mid", crease: "faint" }) + face, [A.slab(front, 0, 30, { name: "frame.front" }, 2)]);
    // lever badges: one plate per lever on the front girder
    LX.forEach((x, i) => {
      const badge = { x: x - 3.2, y: 4, w: 6.4, d: 0.5, r: 0 };
      const outline = [[x - 2.0, 4.5, 14.0], [x + 2.0, 4.5, 14.0], [x + 2.0, 4.5, 16.6], [x - 2.0, 4.5, 16.6]];
      put(`frame.badge${i}`, S(k.slabOf(badge, 13.1, 4.4, P, 2), { tone: "mid", crease: "lo" }) + L(k.pathOf(pts(outline), true), { tone: "faint" }) + D(pts([[x - 2.65, 4.5, 15.3], [x + 2.65, 4.5, 15.3]]), { size: 0.36 }), [A.slab(badge, 13.1, 4.4, { name: `frame.badge${i}` }, 2)], { family: "badge", fx: x });
    });
  }
  // a guide strip over the tappet mouths, and joint plates where the frame's sections meet (the floor seams)
  {
    const strip = { x: FRAME.x0 + 0.6, y: 4, w: FRAME.x1 - FRAME.x0 - 1.2, d: 0.6, r: 0 };
    const bolts = LX.slice(0, -1).map((x, i) => [(x + LX[i + 1]) / 2, 4.6, 6.6]);
    put("frame.strip", S(k.slabOf(strip, 5.6, 2, P, 1), { tone: "mid", crease: "faint" }) + D(pts([[FRAME.x0 + 2.2, 4.6, 6.6], ...bolts, [FRAME.x1 - 2.2, 4.6, 6.6]]), { size: 0.38 }), [A.slab(strip, 5.6, 2, { name: "frame.strip" }, 1)]);
    [-47.5, 12].forEach((jx, i) => {
      const plate = { x: jx - 2, y: 4, w: 4, d: 0.5, r: 0 };
      const bolts = [9.6, 12.6, 21.4, 24.4].map((z) => [jx, 4.5, z]);
      put(`frame.joint${i}`, S(k.slabOf(plate, 8.4, 17.2, P, 1), { tone: "mid", crease: "faint" }) + L(k.segment([jx, 4.5, 8.4], [jx, 4.5, 25.6], P), { tone: "faint" }) + D(pts(bolts.map(([bx, by, bz]) => [bx - 1.1, by, bz]).concat(bolts.map(([bx, by, bz]) => [bx + 1.1, by, bz]))), { size: 0.36 }), [A.slab(plate, 8.4, 17.2, { name: `frame.joint${i}` }, 1)], { family: "joint", fx: jx });
    });
  }
  const floor = { x: FRAME.x0, y: FRAME.back - 1, w: FRAME.x1 - FRAME.x0, d: FRAME.front - FRAME.back + 2, r: 0 };
  {
    const seams = [-47.5, 12].map((sx) => L(k.lineOnTop([sx, floor.y], [sx, floor.y + floor.d], FLOOR_Z, P), { tone: "lo" }) + L(k.segment([sx, floor.y + floor.d, FLOOR_Z], [sx, floor.y + floor.d, FLOOR_Z - 2], P), { tone: "lo" })).join("");
    const screws = [];
    for (const sx of [FRAME.x0 + 2.6, -50.1, -44.9, 9.4, 14.6, FRAME.x1 - 2.6]) screws.push([sx, floor.y + 2.4, FLOOR_Z], [sx, floor.y + floor.d - 2.4, FLOOR_Z]);
    put("frame.floor", S(k.slabOf(floor, FLOOR_Z - 2, 2, P, 2, 0.5), { tone: "mid", crease: "faint" }) + seams + D(pts(screws), { size: 0.45 }), [A.slab(floor, FLOOR_Z - 2, 2, { name: "frame.floor" }, 2)]);
  }

  // ---- the locking tray
  put("tray.bed", S(k.slabOf(TRAY, 0, BED, P, 3, 0.6), { tone: "lo", crease: "faint" }), [A.slab(TRAY, 0, BED, { name: "tray.bed" }, 3)]);
  const rims = [
    { x: TRAY.x, y: TRAY.y, w: 2.6, d: TRAY.d, r: 0.6 },
    { x: TRAY.x + TRAY.w - 2.6, y: TRAY.y, w: 2.6, d: TRAY.d, r: 0.6 },
  ];
  const rimOf = (rim, i) => put(`tray.rim${i}`, S(k.slabOf(rim, BED, BAR_Z[0] - BED, P, 3, 0.3), { tone: "mid", crease: "faint" }), [A.slab(rim, BED, BAR_Z[0] - BED, { name: `tray.rim${i}` }, 3)]);
  rimOf(rims[0], 0);
  // tappets: clipped where they enter the front girder, so they can slide back into it
  LX.forEach((x, i) => {
    const ring = tappetRing(i);
    const clip = G.hullOf([[x - 3.6, 4, BED], [x + 3.6, 4, BED], [x - 3.6, 4, TAP_TOP + 0.3], [x + 3.6, 4, TAP_TOP + 0.3], [x - 3.6, 70, BED], [x + 3.6, 70, BED], [x - 3.6, 70, TAP_TOP + 0.3], [x + 3.6, 70, TAP_TOP + 0.3]].map(at));
    const index = L(k.lineOnTop([x - TAP_HW, 44.6], [x + TAP_HW, 44.6], TAP_TOP, P), { tone: "lo" }) + D(pts([[x - 1.1, 46.4, TAP_TOP], [x + 1.1, 46.4, TAP_TOP]]), { size: 0.38 });
    const inner = S(k.extrude(ring, BED, TAP_TOP - BED, P, { convex: false }), { tone: "mid", crease: "lo" }) + index;
    // the tappet's section where it leaves the girder stays put while the tappet slides through it
    const mouth = L(k.pathOf(pts([[x - TAP_HW, 4, TAP_TOP], [x + TAP_HW, 4, TAP_TOP], [x + TAP_HW, 4, BED]])), { tone: "lo" });
    const wrap = [`<clipPath id="oi-tc${i}"><path d="${k.pathOf(clip, true)}"/></clipPath><g clip-path="url(#oi-tc${i})"><g data-tappet="${i}">`, `</g></g>${mouth}`];
    // the slot tappets come in two patterns (notched for bar B or bar C), each drawn once and placed
    const family = LEVERS[i].world ? {} : { family: `tappet${LEVERS[i].branch === "distractor" ? "C" : "B"}`, fx: x };
    put(`tray.tappet${i}`, wrap[0] + inner + wrap[1], [A.extruded(ring.map(([px, py]) => [px, Math.max(py, 4)]), BED, TAP_TOP - BED, { name: `tray.tappet${i}` })], { part: `tappet${i}`, wrap, inner, ...family });
  });
  // saddles under the bars, the cross-lock guide cheeks
  const saddle = (name, cx, y) => {
    const plan = { x: cx - 1.4, y: y - 1.6, w: 2.8, d: 3.2, r: 0.3 };
    put(name, S(k.slabOf(plan, BED, BAR_Z[0] - BED, P, 2), { tone: "mid", crease: "faint" }), [A.slab(plan, BED, BAR_Z[0] - BED, { name }, 2)], { family: "saddle", fx: cx, fy: y });
    // a keeper bolted over each saddle closes it into a guide the bar slides through: far cheek, then near cheek and cap
    const cheek = (dy) => ({ x: cx - 1.4, y: y + dy, w: 2.8, d: 0.3, r: 0 });
    const cap = { x: cx - 1.4, y: y - 1.6, w: 2.8, d: 3.2, r: 0.2 };
    const KZ = [BAR_Z[0], BAR_Z[1] + 0.4];
    put(`${name}.back`, S(k.slabOf(cheek(-1.6), KZ[0], KZ[1] - KZ[0], P, 1), { tone: "mid", crease: "faint" }), [A.slab(cheek(-1.6), KZ[0], KZ[1] - KZ[0], { name: `${name}.back`, owner: name }, 1)], { family: "keeperBack", fx: cx, fy: y });
    put(
      `${name}.keeper`,
      S(k.slabOf(cheek(1.3), KZ[0], KZ[1] - KZ[0], P, 1), { tone: "mid", crease: "faint" }) + S(k.slabOf(cap, KZ[1], 0.5, P, 2), { tone: "mid", crease: "lo" }) + D(pts([[cx - 0.7, y, KZ[1] + 0.5], [cx + 0.7, y, KZ[1] + 0.5]]), { size: 0.32 }),
      [A.slab(cheek(1.3), KZ[0], KZ[1] - KZ[0], { name: `${name}.cheek`, owner: name }, 1), A.slab(cap, KZ[1], 0.5, { name: `${name}.cap`, owner: name }, 2)],
      { family: "keeper", fx: cx, fy: y },
    );
  };
  [[-66, CH.B], [-51, CH.B], [0, CH.B], [24, CH.B], [-51, CH.C], [-24, CH.C], [13.5, CH.C]].forEach(([cx, y], i) => saddle(`tray.saddle${i}`, cx, y));
  [[CH.A - 4.7], [CH.A + 2.6]].forEach(([y0], i) => {
    const plan = { x: -69.2, y: y0, w: 6.4, d: 2.1, r: 0.3 };
    put(`tray.cheek${i}`, S(k.slabOf(plan, BED, 2.6, P, 2), { tone: "mid", crease: "faint" }), [A.slab(plan, BED, 2.6, { name: `tray.cheek${i}` }, 2)]);
  });
  // dogs: they ride with their bar (or, for the cross-lock, on their own) and sit beside a tappet
  const dog = (name, ring, part, z1 = BAR_Z[0], family = null, fx = 0) => {
    const inner = S(k.extrude(ring, BED, z1 - BED, P), { tone: "hi", crease: "lo" });
    const wrap = [`<g data-part="${part}">`, "</g>"];
    put(name, wrap[0] + inner + wrap[1], [A.extruded(ring, BED, z1 - BED, { name, owner: part })], { part, wrap, inner, ...(family ? { family, fx } : {}) });
  };
  const eW1 = LX[0] - TAP_HW;
  const eW2 = LX[1] - TAP_HW;
  // a drive dog: its nose stands 0.3 off the floor of its world tappet's V, so its bar travels SHIFT before the nose is out
  const driveH = VEE.tip + (VEE.depth - 0.3 - 0.2) * SLOPE;
  dog("tray.dogB.drive", dogRing(eW1 + 0.1, eW1 + VEE.depth - 0.3, CH.B, { right: true, h: driveH }), "barB");
  dog("tray.dogC.drive", dogRing(eW2 + 0.1, eW2 + VEE.depth - 0.3, CH.C, { right: true, h: driveH }), "barC");
  for (const i of [2, 3, 4, 8]) dog(`tray.dogB.${LEVERS[i].id}`, dogRing(LX[i] + TAP_HW + 0.1, LX[i] + TAP_HW + 2.5, CH.B), "barB", BAR_Z[0], "dogB", LX[i]);
  for (const i of [5, 6, 7]) dog(`tray.dogC.${LEVERS[i].id}`, dogRing(LX[i] + TAP_HW + 0.1, LX[i] + TAP_HW + 2.5, CH.C), "barC", BAR_Z[0], "dogC", LX[i]);
  dog("tray.dogA", dogRing(LX[0] + TAP_HW - CROSS_IN, LX[1] - TAP_HW + CROSS_IN, CH.A, { left: true, right: true, h: 2.4 }), "cross", TAP_TOP);
  rimOf(rims[1], 1); // the near rim is drawn after the dogs that come close to it
  // the lock bars over the tappets
  const barB = { x: eW1 - 3.1, y: CH.B - 1.2, w: LX[8] + TAP_HW + 3.1 - (eW1 - 3.1), d: 2.4, r: 0.4 };
  const barC = { x: eW2 - 3.1, y: CH.C - 1.2, w: LX[7] + TAP_HW + 3.1 - (eW2 - 3.1), d: 2.4, r: 0.4 };
  for (const [name, plan, part] of [["tray.barC", barC, "barC"], ["tray.barB", barB, "barB"]]) {
    const rivets = [];
    for (let x = plan.x + 3; x < plan.x + plan.w - 2; x += 12) rivets.push([x, plan.y + 1.2, BAR_Z[1]]);
    put(name, `<g data-part="${part}">${S(k.slabOf(plan, BAR_Z[0], BAR_Z[1] - BAR_Z[0], P, 2, 0.3), { tone: "mid", crease: "lo" })}${D(pts(rivets), { size: 0.38 })}</g>`, [A.slab(plan, BAR_Z[0], BAR_Z[1] - BAR_Z[0], { name, owner: part }, 2)], { part });
  }
  const strap = { x: TRAY.x, y: 51, w: TRAY.w, d: 3.5, r: 0.5 }; // a front stop rail: a reversed tappet runs on under it
  put("tray.strap", S(k.slabOf(strap, BAR_Z[0], 1.4, P, 2, 0.3), { tone: "mid", crease: "faint" }) + D(pts([[strap.x + 1.3, strap.y + 1.75, BAR_Z[0] + 1.4], [strap.x + strap.w - 1.3, strap.y + 1.75, BAR_Z[0] + 1.4]]), { size: 0.45 }), [A.slab(strap, BAR_Z[0], 1.4, { name: "tray.strap" }, 2)]);

  // ---- the knee bracket and bearer that carry the shelf out past the frame
  {
    const [y0, y1] = [COL_Y[0] + 1, COL_Y[1] - 1];
    const knee = [[-80, 97], [-80, 120], [-109, 120], [-109, 118.4]];
    const hole = [[-82.6, 103.5], [-82.6, 117.6], [-101, 117.6]];
    const face = (list) => k.pathOf(pts(list.map(([x, z]) => [x, y1, z])), true);
    const bolts = [[-81.4, y1, 101], [-81.4, y1, 117.8], [-106.5, y1, 118.9]];
    put("frame.knee", S(yPrism(knee, y0, y1), { tone: "mid", crease: "faint" }) + `<path style="fill:var(--anatomy-shade-0);stroke:none" d="${face(hole)}"/>` + L(face(hole), { tone: "lo" }) + D(pts(bolts), { size: 0.4 }), [A.prism(YF([0, 0, 0]), knee, y0, y1, { name: "frame.knee" })]);
    const bearer = { x: -113, y: COL_Y[0] + 0.1, w: 32.1, d: 3.8, r: 0.4 };
    put("frame.bearer", S(k.slabOf(bearer, SHELF_Z[0] - 2, 2, P, 2, 0.3), { tone: "mid", crease: "faint" }) + D(pts([[-110.5, bearer.y + bearer.d, SHELF_Z[0] - 1], [-84, bearer.y + bearer.d, SHELF_Z[0] - 1]]), { size: 0.38 }), [A.slab(bearer, SHELF_Z[0] - 2, 2, { name: "frame.bearer" }, 2)]);
  }

  // ---- above the floor: quadrants, levers and the shelf columns, back to front along x
  const slices = [];
  COLUMNS.forEach((cx, i) => slices.push({ x: cx, kind: "column", i }));
  LX.forEach((x, i) => slices.push({ x, kind: "lever", i }));
  slices.sort((a, b) => a.x - b.x);
  const arc = [];
  for (let s = 0; s <= 12; s++) {
    const a = ARC[0] + ((ARC[1] - ARC[0]) * s) / 12;
    arc.push([PIVOT[0] + RQ * Math.sin(a), PIVOT[1] + RQ * Math.cos(a)]);
  }
  const cheekPoly = [[arc[0][0], BASE_Z], ...arc, [arc[arc.length - 1][0], BASE_Z]];
  // a notch cut down from the top edge of the near cheek: a dark opening, its walls drawn as an open U that ends on the edge
  const notchOf = (a, x) => {
    const hw = 1.25 / RQ;
    const q = (r, b) => [x, PIVOT[0] + r * Math.sin(b), PIVOT[1] + r * Math.cos(b)];
    const fill = [q(RQ + 0.25, a - hw), q(RQ - 2.0, a - hw), q(RQ - 2.0, a + hw), q(RQ + 0.25, a + hw), [x - 1.2, ...q(RQ + 0.3, a + hw).slice(1)], [x - 1.2, ...q(RQ + 0.3, a - hw).slice(1)]];
    const walls = [q(RQ, a - hw), q(RQ - 2.0, a - hw), q(RQ - 2.0, a + hw), q(RQ, a + hw)];
    return `<path style="fill:var(--anatomy-shade-0);stroke:none" d="${k.pathOf(pts(fill), true)}"/>${L(k.pathOf(pts(walls)), { tone: "lo" })}`;
  };
  for (const slice of slices) {
    if (slice.kind === "column") {
      const cx = slice.x;
      const flange = { x: cx - 3, y: COL_Y[0] - 0.8, w: 6, d: 5.6, r: 0.6 };
      const col = { x: cx - 2, y: COL_Y[0], w: 4, d: 4, r: 0.5 };
      const cap = { x: cx - 2.9, y: COL_Y[0] - 0.9, w: 5.8, d: 5.8, r: 0.5 };
      put(`frame.column${slice.i}`, S(k.slabOf(flange, FLOOR_Z, 1.2, P, 2, 0.3), { tone: "mid", crease: "faint" }) + D(pts([[cx - 2.2, COL_Y[1] + 0.6, FLOOR_Z + 1.2], [cx + 2.2, COL_Y[1] + 0.6, FLOOR_Z + 1.2]]), { size: 0.4 }) + S(k.slabOf(col, FLOOR_Z + 1.2, SHELF_Z[0] - 2 - FLOOR_Z - 1.2, P, 2), { tone: "mid", crease: "faint", inner: L(k.sideSeam(col, 60, P, 2), { tone: "faint" }) }) + S(k.slabOf(cap, SHELF_Z[0] - 2, 2, P, 2, 0.3), { tone: "mid", crease: "faint" }), [
        A.slab(flange, FLOOR_Z, 1.2, { name: `frame.column${slice.i}.flange`, owner: `column${slice.i}` }, 2),
        A.slab(col, FLOOR_Z + 1.2, SHELF_Z[0] - 2 - FLOOR_Z - 1.2, { name: `frame.column${slice.i}`, owner: `column${slice.i}` }, 2),
        A.slab(cap, SHELF_Z[0] - 2, 2, { name: `frame.column${slice.i}.cap`, owner: `column${slice.i}` }, 2),
      ], { family: "column", fx: cx });
      continue;
    }
    const i = slice.i;
    const x = LX[i];
    const fam = { fx: x };
    const base = { x: x - 3.8, y: -33.4, w: 7.6, d: 29.6, r: 0.8 };
    const slot = { x: x - 1.45, y: -25.6, w: 2.9, d: 20.4, r: 1.2 };
    const slotTop = k.planOutline(slot, BASE_Z, P, 4);
    put(`quad${i}.base`, S(k.slabOf(base, FLOOR_Z, BASE_Z - FLOOR_Z, P, 3, 0.3), { tone: "mid", crease: "faint" }) + dark(slotTop) + L(slotTop, { tone: "lo" }) + D(pts([[x - 2.6, base.y + 1.6, BASE_Z], [x + 2.6, base.y + 1.6, BASE_Z], [x - 2.6, base.y + base.d - 1.6, BASE_Z], [x + 2.6, base.y + base.d - 1.6, BASE_Z]]), { size: 0.4 }), [A.slab(base, FLOOR_Z, BASE_Z - FLOOR_Z, { name: `quad${i}.base` }, 3)], { family: "qbase", ...fam });
    const cut = NOTCHES.map((a) => {
      const c = [x, PIVOT[0] + (RQ - 0.9) * Math.sin(a), PIVOT[1] + (RQ - 0.9) * Math.cos(a)];
      return A.orientedBox(c, [[1, 0, 0], [0, Math.sin(a), Math.cos(a)], [0, Math.cos(a), -Math.sin(a)]], [3.2, 1.2, 1.3]);
    });
    put(`quad${i}.far`, S(xPrism(cheekPoly, x - 2.7, x - 1.5), { tone: "mid", crease: "faint" }), [xShape(cheekPoly, x - 2.7, x - 1.5, { name: `quad${i}.far`, cut })], { family: "qfar", ...fam });
    const pose = rest.levers?.[i] ?? { stroke: 0, lift: 0, squeeze: 0 };
    const collar = rest.collar && i === SPARE ? 1 : 0;
    const lit = rest.lit === i;
    const lever = leverParts(i, pose, { collar, lit, audit: A });
    const plain = !LEVERS[i].world && !collar && !lit && pose.stroke === 0 && pose.lift === 0;
    put(`lever${i}`, `<g data-lever="${i}">${lever.svg}</g>`, lever.shapes, { part: `lever${i}`, wrap: [`<g data-lever="${i}">`, "</g>"], inner: lever.svg, ...(plain ? { family: "lever", ...fam } : {}) });
    const notches = NOTCHES.map((a) => notchOf(a, x + 2.7)).join("");
    put(`quad${i}.near`, S(xPrism(cheekPoly, x + 1.5, x + 2.7), { tone: "mid", crease: "faint" }) + notches + D(pts([[x + 2.7, -27.2, BASE_Z + 1.6], [x + 2.7, -8.8, BASE_Z + 1.6]]), { size: 0.38 }), [xShape(cheekPoly, x + 1.5, x + 2.7, { name: `quad${i}.near`, cut })], { family: "qnear", ...fam });
  }
  standard(1);

  // ---- the block shelf and its instruments
  put("shelf", S(k.slabOf(SHELF, SHELF_Z[0], SHELF_Z[1] - SHELF_Z[0], P, 4, 0.8), { tone: "mid", crease: "faint", inner: L(k.sideSeam(SHELF, SHELF_Z[0] + 1.2, P, 4), { tone: "faint" }) }), [A.slab(SHELF, SHELF_Z[0], SHELF_Z[1] - SHELF_Z[0], { name: "shelf" }, 4)]);
  const z0 = SHELF_Z[1];
  const caseOf = (name, x, w, top, owner, extra = "", family = null) => {
    const plinth = { x: x - w / 2 - 0.6, y: FACE_Y - 8.0, w: w + 1.2, d: 8.6, r: 0.8 };
    const box = { x: x - w / 2, y: FACE_Y - 7.0, w, d: 7.0, r: 1.4 };
    const cap = { x: x - w / 2 - 0.3, y: FACE_Y - 7.3, w: w + 0.6, d: 7.6, r: 1.6 };
    const svg = S(k.slabOf(plinth, z0, 1.2, P, 2, 0.3), { tone: "mid", crease: "faint" }) + S(k.slabOf(box, z0 + 1.2, top - z0 - 1.2, P, 3, 0.5), { tone: "mid", crease: "faint", inner: L(k.sideSeam(box, z0 + 3.0, P, 3), { tone: "faint" }) }) + S(k.slabOf(cap, top, 1.2, P, 3, 0.4), { tone: "mid", crease: "faint" }) + extra;
    const shapes = [A.slab(plinth, z0, 1.2, { name: `${name}.plinth`, owner }, 2), A.slab(box, z0 + 1.2, top - z0 - 1.2, { name: `${name}.case`, owner }, 3), A.slab(cap, top, 1.2, { name: `${name}.cap`, owner }, 3)];
    if (family) {
      // the case is the same at every repeater, so it is drawn once and placed; the dial is drawn per lever
      const body = svg.slice(0, svg.length - extra.length);
      put(name, svg, shapes, { family, fx: x, wrap: ["", extra], inner: body });
    } else put(name, svg, shapes);
  };
  // domain switch over the core world lever: a knurled knob with a pointer
  {
    const { x, z } = DOMAIN_KNOB;
    const F = YF([x, FACE_Y, z]);
    const ticks = Object.values(DOMAIN_KNOB.angles).map((a) => seg(polar(3.4, a), polar(4.3, a))).join("");
    const knob = S(G.disc(0, 1.9, 2.6, F, P, { steps: 20 }), { tone: "mid", crease: "lo", inner: G.ribsOf(F, 0.2, 1.7, 2.6, 20, P, { fade: [0.1, 0.55] }).map(({ d, alpha }) => (alpha > 0.05 ? `<path class="iso-line" data-tone="lo" opacity="${alpha.toFixed(2)}" d="${d}"/>` : "")).join("") });
    const face = `<g transform="${faceAt(x, z, FACE_Y + 1.9)}"><g data-knob transform="${needleTransform(DOMAIN_KNOB.angles.arith)}"><path class="oi-pointer" d="M0 0.7L0 -2.1"/></g></g>`;
    const plate = `<g transform="${faceAt(x, z)}">${circle(4.6, "oi-plate")}<path class="oi-tick" d="${ticks}"/></g>`;
    caseOf("shelf.domain", x, 10, z0 + 17.4, "domain", plate + knob + face, "case");
    items[items.length - 1].shapes.push(A.disc(F, 0, 1.9, 2.6, { name: "shelf.domain.knob", owner: "domain" }));
  }
  // supervision-target commutator over the distractor world lever
  {
    const { x, z } = COMMUTATOR;
    const ticks = Object.values(COMMUTATOR.angles).map((a) => seg(polar(3.5, a), polar(4.4, a))).join("");
    const plate = `<g transform="${faceAt(x, z)}">${circle(4.6, "oi-plate")}<path class="oi-tick" d="${ticks}"/></g><g transform="${faceAt(x, DIAL_Z)}">${[-1, 1].map((sx) => `<circle cx="${sx * 3.9}" cy="-5.3" r="0.32" class="oi-screw"/>`).join("")}</g>`;
    const handle = commutatorHandle(COMMUTATOR.angles[rest.target ?? "local"], A);
    caseOf("shelf.commutator", x, 10, z0 + 17.4, "commutator", plate + `<g data-commutator>${handle.svg}</g>`, "case");
    items[items.length - 1].shapes.push(...handle.shapes);
  }
  for (const i of SLOT_LEVERS) caseOf(`shelf.repeater${i}`, LX[i], 10, z0 + 17.4, `repeater${i}`, repeaterDial(i), "case");
  const meters = rest.meters ?? [METER.park, METER.park];
  METERS.forEach((x, i) => caseOf(`shelf.meter${i}`, x, 10, z0 + 17.4, `meter${i}`, meterDial(x, i, meters[i]), "case"));
  caseOf("shelf.arm", ARM_X, 10, z0 + 17.4, "arm", armDial(ARM_X, rest.arm ?? 0), "case");
  return items;
}

// ------------------------------------------------------------------ what moves, as transforms
export const vec = (dx, dy, dz) => k.translateAlong(P, [dx, dy, dz]);
export const screenOf = ([dx, dy, dz]) => {
  const o = k.iso([0, 0, 0], P);
  const p = k.iso([dx, dy, dz], P);
  return [p[0] - o[0], p[1] - o[1]];
};
export { tappetOf, shiftOf, crossOf, SHIFT, LIFT };
