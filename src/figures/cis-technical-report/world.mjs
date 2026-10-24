// Fig 22 · the glove box: world dimensions, camera, and every builder the static art, the audit and the live page share.
// World units are about 1 px of the real thing, x and y on the floor, z up. Pure ESM, no Node APIs.
import * as k from "../kit/iso-kit.mjs";
import * as G from "./round.mjs";

export const AZ = 45;
export const WIDTH = 600;
export const HEIGHT = 500;

// ------------------------------------------------------------ bench and plinth
export const BENCH = { x: -114, y: -58, w: 266, d: 112, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 9; // pad, threaded stem and hex nut, as on the family's other benches
export const PLINTH = { x: -93, y: -50, w: 154, d: 76, r: 3 };
export const PLINTH_H = 5;

// ------------------------------------------------------------ chamber (a prism along x, profile in y-z)
export const CH = { x0: -88, x1: 56, back: -46, front: 22, base: 5, low: 28, top: 108, slopeTop: -2 };
export const PROFILE = [
  [CH.back, CH.base],
  [CH.front, CH.base],
  [CH.front, CH.low],
  [CH.slopeTop, CH.top],
  [CH.back, CH.top],
];
const SL = Math.hypot(CH.front - CH.slopeTop, CH.top - CH.low); // 74
export const U = [0, (CH.slopeTop - CH.front) / SL, (CH.top - CH.low) / SL]; // up the slope
export const N = [0, (CH.top - CH.low) / SL, (CH.front - CH.slopeTop) / SL]; // out of the slope
export const SLOPE_L = SL;
// a point on the sloped face: x, distance w up the slope, n out of it
export const face = (x, w, n = 0) => [x, CH.front + U[1] * w + N[1] * n, CH.low + U[2] * w + N[2] * n];
export const WIN = { x0: -78, x1: 46, w0: 6, w1: 77 }; // window opening
export const FRAME = { band: 4, t: 1.6 };
export const PORTS = [-46, 10].map((x) => ({ x, w: 18, rIn: 7, rOut: 9.2, clamp: 10.4 }));
export const WALL = 2.5;
export const IN = { x0: CH.x0 + WALL, x1: CH.x1 - WALL, back: CH.back + WALL, floor: CH.base + WALL };

// ------------------------------------------------------------ antechamber along +x from the right wall
export const AX = { y: -16, z: 50, r: 15, bore: 13.6, x0: CH.x1, x1: 104, flange: 19 };
export const BANDS = [69, 97];
export const DOOR = { r: 18, t: 2.5, hinge: [105.25, AX.y - 20.5] };
export const VALVES = [
  { name: "evac", x: 75 },
  { name: "purge", x: 90 },
];
export const GAUGE = { x: 82, r: 7.2 };
// the interlock: a rod along the antechamber's lower front, 22.4 off its axis (clear of the flanges' r 19). Its wall end
// screws out of a sleeve turned by the inner door's handwheel; its tip enters a blind bore in a keeper on the outer door
const LK = [15 / Math.hypot(15, 14.7), -14.7 / Math.hypot(15, 14.7)];
export const LOCK_R = 22.4;
export const LOCKBAR = { y: AX.y + LK[0] * LOCK_R, z: AX.z + LK[1] * LOCK_R, r: 1.1, x1: 101.8, travel: 3.8 };
// the inner door's handwheel on the chamber wall, coaxial with the rod (s = x − CH.x1): gland, shaft, hub, rim, spokes, sleeve
export const IW = { gland: [0, 2.2, 2.3], shaft: [2.2, 3.4, 0.8], hub: [3.2, 6, 1.3], rim: [4.1, 5.3, 3.9, 4.8], spoke: [4.35, 5.05, 1, 4.1, 0.45], sleeve: [6, 14.6, 1.5] };
// the rod comes out of the sleeve's end; its tip rests 2.2 short of the keeper and enters 1.6 when locked
export const ROD = { from: IW.sleeve[1], to: LOCKBAR.x1 - CH.x1 };
// the transfer table: a cross-slide in front of the antechamber's mouth. Its base and rails sit below the outer
// door's lowest edge, so the door swings over them; the tray waits out of the door's sweep and runs in to the
// bore's line only while the door stands open, level with the bore's floor and against the flange face
export const TABLE_DY = 30;
export const TRAY = { x: AX.x1 + 0.1, y: AX.y + TABLE_DY - 8, w: 24, d: 16, r: 1, z: 33, top: 36.5 };
export const SLIDE = { x: TRAY.x, y: AX.y - 9, w: TRAY.w, d: TABLE_DY + 18, r: 1, z: 26, t: 2.4, railW: 2.4, railH: 2 };
export const RAILS_X = [TRAY.x + 4, TRAY.x + TRAY.w - 4 - SLIDE.railW];
export const POST = [TRAY.x + TRAY.w / 2, SLIDE.y + SLIDE.d / 2];

// ------------------------------------------------------------ bubbler on the right wall, in front of the antechamber
export const BUB = { x: CH.x1, plate: { y: -44, d: 13, z0: 72, z1: 106 }, legX: CH.x1 + 5.5, legs: [-40.5, -34], r: 1.8, z0: 78, z1: 96, bend: 3.25, inletZ: 103 };

// ------------------------------------------------------------ inside
const CART_W = 14;
export const RAIL = { x: -45, y: AX.y - 6, w: IN.x1 + 45, d: 12, z: 34, top: 36.5 };
export const SEAT = { champion: -32, challenger: -6 };
// the seat hatch under the champion: an opening through the rail between its guide lips, a leaf hinged on its back
// edge that drops into a chute hung under the rail, and the depth the retired champion sinks to (onto the chute floor)
// The opening is as long as the cartridge (nose to grip end), so the chute's end walls guide it down
export const HATCH = { x: SEAT.champion - CART_W / 2 - 2, w: CART_W + 2, y: AX.y - 5, d: 10, t: 0.8 };
export const CHUTE = { floor: 15, z0: 16, wall: 1 };
export const SINK = RAIL.top - CHUTE.z0;
export const CART = { w: CART_W, d: 8, h: 7 }; // the adapter cartridge
export const SHELF = { z: 41, top: 43.5, y: IN.back, d: 13 };
export const BOARD = { pitch: 3.0, rows: 6, y: -38.5, t: 1.6, z0: 45.5, h: 22 };
export const SAFE = { x: IN.x0 + 1.5, y: IN.back + 0.5, w: 14, d: 12, z: SHELF.top, h: 20 };
export const BRIDGE = { x: -10, w: 8, z: 49, top: 52 };

// ------------------------------------------------------------ record unit on the bench, fed through the feedthrough
export const REC = { x: -88, y: 27.5, w: 30, d: 16, r: 2, h: 11 };
export const SLOT = { x: -85.5, y: 34.4, w: 10, d: 1.2 };
export const CARD = { x: -85, y: 34.6, w: 9, d: 0.8, h: 13 };
export const FEED = { x: -72, z: 19 };
export const LABEL = { x: 28, y: 39, w: 42, d: 11, r: 1.5 };
export const RULER = { x: -102, y: 45.5, w: 112, d: 5.5, r: 1 };

// ------------------------------------------------------------ the cartridge's stations along x
export const STATION = { tray: TRAY.x + TRAY.w / 2, ante: 80, challenger: SEAT.challenger, champion: SEAT.champion };

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [CH.x0, CH.back, CH.top + 3],
    [CH.x1, CH.back, CH.top + 3],
    [DOOR.hinge[0] + 41, DOOR.hinge[1], AX.z + 18],
    [REC.x, REC.y, REC.h + CARD.h],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: AZ },
);
export const V = G.viewOf(P);
export const at = (p) => k.iso(p, P);
export const depth = (p) => G.dot3(p, V);

// frames
export const FX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
export const FY = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
export const FZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
export const FN = (x, w, n = 0) => G.frameOf(face(x, w, n), N, [1, 0, 0], U);
export const FA = FX([AX.x0, AX.y, AX.z]);
export const IWF = FX([CH.x1, LOCKBAR.y, LOCKBAR.z]);

// ------------------------------------------------------------ markup helpers
export const S = (paths, style) => k.solidSvg(paths, style);
export const Ln = (d, style) => k.lineSvg(d, style);
export const Dt = (points, style) => k.dotsSvg(points, style);

// a solid whose paths live code rewrites: every slot is always present, in SLOTS order (live code finds them by index).
// Plain solids carry only their path data: figure.css paints each slot by its position and the group's tones
// (data-fs="edge crease"). Lit, seamless or restyled ones keep the kit's classes.
export const SLOTS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "bevel", "edge"];
export function fixedSolid(paths, { tone = "hi", crease = "faint", lit = false, part, cls } = {}) {
  const d = slotPaths(paths);
  const named = part ? ` data-part="${part}"` : "";
  if (!(lit || paths.seamless || cls)) return `<g data-fs="${tone} ${crease}"${named}>${SLOTS.map((slot) => (d[slot] ? `<path d="${d[slot]}"/>` : "<path/>")).join("")}</g>`;
  const long = (slot) => (slot === "fill" ? `class="iso-fill"` : slot[0] === "s" && slot.length === 2 ? `class="iso-shade" data-shade="${slot[1]}"` : slot === "top" ? `class="iso-top"` : slot === "edge" ? `class="iso-line iso-edge" data-tone="${tone}"` : `class="iso-line iso-${slot}" data-tone="${crease}"`);
  return `<g class="iso-solid${cls ? " " + cls : ""}"${lit ? " data-lit" : ""}${paths.seamless ? " data-seamless" : ""}${named}>${SLOTS.map((slot) => `<path ${long(slot)} d="${d[slot]}"/>`).join("")}</g>`;
}
export function slotPaths(paths) {
  return { fill: paths.fill || "", s0: paths.shades[0] || "", s1: paths.shades[1] || "", s2: paths.shades[2] || "", s3: paths.shades[3] || "", top: paths.top || "", crease: paths.crease || "", bevel: paths.bevel || "", edge: paths.outline || "" };
}
// merge several solids' paths into one set of slots (they never overlap on screen in a way that needs order)
export function mergePaths(list) {
  return {
    fill: list.map((p) => p.fill).join(""),
    shades: [0, 1, 2, 3].map((i) => list.map((p) => p.shades[i] || "").join("")),
    top: list.map((p) => p.top || "").join(""),
    crease: list.map((p) => p.crease || "").join(""),
    bevel: list.map((p) => p.bevel || "").join(""),
    outline: list.map((p) => p.outline).join(""),
  };
}

// ------------------------------------------------------------ the cartridge (built at x = 0; moved with translateAlong)
export function cartridgeParts() {
  const y0 = AX.y - CART.d / 2;
  const body = { x: -CART.w / 2, y: y0, w: CART.w, d: CART.d, r: 1 };
  const z0 = RAIL.top;
  const out = [];
  out.push({ name: "nose", paths: k.slabOf({ x: -CART.w / 2 - 2, y: AX.y - 2.4, w: 2.2, d: 4.8, r: 0.5 }, z0 + 1.6, 3.2, P, 2), shape: ["slab", { x: -CART.w / 2 - 2, y: AX.y - 2.4, w: 2.2, d: 4.8, r: 0.5 }, z0 + 1.6, 3.2] });
  out.push({ name: "body", paths: k.slabOf(body, z0, CART.h, P, 3, 0.5), shape: ["slab", body, z0, CART.h] });
  const grip = { x: CART.w / 2 - 4.5, y: y0 + 1.2, w: 3, d: CART.d - 2.4, r: 0.6 };
  out.push({ name: "grip", paths: k.slabOf(grip, z0 + CART.h, 1.4, P, 2, 0.3), shape: ["slab", grip, z0 + CART.h, 1.4] });
  return out;
}
export function cartridgeInner() {
  const z = RAIL.top + CART.h;
  const y0 = AX.y - CART.d / 2;
  const recess = { x: -CART.w / 2 + 1.6, y: y0 + 1.4, w: 7, d: CART.d - 2.8, r: 0.6 };
  return [
    Ln(k.planOutline(recess, z, P, 2), { tone: "faint" }),
    Ln(k.lineOnTop([recess.x + 1.2, AX.y - 0.9], [recess.x + 5.6, AX.y - 0.9], z, P) + k.lineOnTop([recess.x + 1.2, AX.y + 1], [recess.x + 4, AX.y + 1], z, P), { tone: "lo", free: true }),
    Dt([at([-CART.w / 2 + 0.6, AX.y - 3, RAIL.top + 3.5]), at([-CART.w / 2 + 0.6, AX.y + 3, RAIL.top + 3.5])], { size: 0.35, tone: "mid" }),
  ].join("");
}
export function cartridgeSvg({ lit, cls = "" } = {}) {
  const parts = cartridgeParts();
  const tone = lit ? "hi" : "hi";
  return parts
    .map((p) => S(p.paths, { tone, crease: "lo", lit, className: cls, inner: p.name === "body" ? cartridgeInner() : "" }))
    .join("");
}

// ------------------------------------------------------------ outer door, rebuilt at each angle
const rotZ = (p, c, a) => {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return [c[0] + dx * ca + dy * sa, c[1] - dx * sa + dy * ca, p[2]];
};
const rotV = (v, a) => [v[0] * Math.cos(a) + v[1] * Math.sin(a), -v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
export function doorFrame(theta) {
  const h = [DOOR.hinge[0], DOOR.hinge[1], 0];
  const o = rotZ([AX.x1, AX.y, AX.z], h, theta);
  return G.frameOf(o, rotV([1, 0, 0], theta), rotV([0, 1, 0], theta), [0, 0, 1]);
}
// the leaf runs from the plate's edge to the face of the door's knuckle on the hinge pin
export const DOOR_LEAF = [[0.2, -3], [2.3, -3], [2.3, 3], [0.2, 3]];
export const DOOR_LEAF_S = 20.5 - DOOR.r + 0.5 - 1.7 + 0.1;
// the door's handwheel: a small boss on the plate, a long hub, a rim standing 6 off the plate on three spoke bars
const T = DOOR.t;
export const WHEEL = { boss: [T, T + 1.4, 3.2], hub: [T + 1.4, T + 7.8, 1.5], rim: [T + 6, T + 7.2, 7, 8.2], spoke: [T + 6.15, T + 7.05, 1.2, 7.4, 0.55], knob: [T + 7.2, T + 10, 1.1, 7.6] };
// the keeper: a lug on the plate's rim on the rod's line, with a blind bore open toward the antechamber
export const KEEPER = { r0: 17.4, r1: 24.4, w: 2.1, bore: 1.3, depth: 1.8, angle: Math.atan2(LOCKBAR.z - AX.z, LOCKBAR.y - AX.y) };
// a spoke bar on frame F at angle a: radial from r0 to r1, `w` either side, between s0 and s1
export const spokeFrame = (F, a) => G.frameOf(F.o, F.a, G.radialOf(F, a), G.tangentOf(F, a));
export const spokePoly = ([, , r0, r1, w]) => [[r0, -w], [r1, -w], [r1, w], [r0, w]];
export function spokesAt(F, spec, turn) {
  return [0, 1, 2].map((i) => G.prismOf(spokeFrame(F, turn + (i * 2 * Math.PI) / 3 + Math.PI / 2), spokePoly(spec), spec[0], spec[1], P));
}
export const keeperFrame = (F) => spokeFrame(F, KEEPER.angle);
export const KEEPER_POLY = [[KEEPER.r0, -KEEPER.w], [KEEPER.r1, -KEEPER.w], [KEEPER.r1, KEEPER.w], [KEEPER.r0, KEEPER.w]];
// the door's rebuilt solids, in drawing order (the gasket line goes after the plate)
export const DOOR_PARTS = ["leaf", "plate", "keeper", "boss", "spoke0", "spoke1", "spoke2", "hub", "rim", "knob"];
// handwheel spin `turn` in radians
export function doorParts(theta, turn = 0) {
  const F = doorFrame(theta);
  const plate = G.disc(0, DOOR.t, DOOR.r, F, P);
  const gasket = G.circleOf(F, 0, DOOR.r - 2.6, P);
  const keeper = G.prismOf(keeperFrame(F), KEEPER_POLY, 0, DOOR.t, P);
  const boss = G.disc(WHEEL.boss[0], WHEEL.boss[1], WHEEL.boss[2], F, P);
  const hub = G.disc(WHEEL.hub[0], WHEEL.hub[1], WHEEL.hub[2], F, P);
  const rim = G.ringBand(WHEEL.rim[0], WHEEL.rim[1], WHEEL.rim[2], WHEEL.rim[3], F, P, { hole: [WHEEL.rim[1], WHEEL.rim[2]] });
  const [k0, k1, kr, ka] = WHEEL.knob;
  const knob = G.disc(k0, k1, kr, G.frameOf(G.pointOf(F, 0, ka, turn + 0.5), F.a, F.u, F.v), P);
  const [spoke0, spoke1, spoke2] = spokesAt(F, WHEEL.spoke, turn);
  // hinge leaf from the plate edge to the knuckle
  const leafF = G.frameOf(rotZ([AX.x1, AX.y - DOOR.r + 0.5, AX.z], [DOOR.hinge[0], DOOR.hinge[1], 0], theta), rotV([0, -1, 0], theta), rotV([1, 0, 0], theta), [0, 0, 1]);
  const leaf = G.prismOf(leafF, DOOR_LEAF, 0, DOOR_LEAF_S, P);
  const front = G.dot3(F.a, V) > 0;
  return { F, leafF, plate, gasket, keeper, boss, hub, rim, knob, spoke0, spoke1, spoke2, leaf, front };
}

// ------------------------------------------------------------ inner door's handwheel and the interlock rod
// lock 0 (inner door shut, rod back) to 1 (inner door open, rod in the keeper): one turn of the inner wheel
export const innerTurn = (lock) => -2 * Math.PI * lock;
export const innerSpokes = (lock) => spokesAt(IWF, IW.spoke, innerTurn(lock));
export const rodTip = (lock) => ROD.to + LOCKBAR.travel * lock;
export const rodPaths = (lock) => G.disc(ROD.from, rodTip(lock), LOCKBAR.r, IWF, P, { steps: 12 });

// ------------------------------------------------------------ the hatch leaf, hinged on the back edge of the opening
// open 0 (shut, flush with the rail top) to 1 (hanging down the chute's back wall)
export function leafFrame(open) {
  const a = (open * Math.PI) / 2;
  return G.frameOf([HATCH.x + 0.1, HATCH.y, RAIL.top - HATCH.t], [1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]);
}
export const LEAF_POLY = [[0, 0], [HATCH.d, 0], [HATCH.d, HATCH.t], [0, HATCH.t]];
export const leafPaths = (open) => G.prismOf(leafFrame(open), LEAF_POLY, 0, HATCH.w - 0.2, P);
export const holePath = () => k.pathOf([[HATCH.x, HATCH.y], [HATCH.x + HATCH.w, HATCH.y], [HATCH.x + HATCH.w, HATCH.y + HATCH.d], [HATCH.x, HATCH.y + HATCH.d]].map(([x, y]) => at([x, y, RAIL.top])), true);

// ------------------------------------------------------------ valve levers, gauge needle, interlock bar
// a flat lever on the valve stem top, turning about z: angle 0 lies along +x, across the outlet (closed);
// a quarter turn lines it up with the outlet toward +y (open)
export const LEVER = { bar: [[-1.6, -1.1], [9, -0.8], [9, 0.8], [-1.6, 1.1]], grip: [[6.4, -1.3], [10.6, -1.3], [10.6, 1.3], [6.4, 1.3]] };
export const leverFrame = (x, angle) => G.frameOf([x, AX.y, AX.z + AX.r + 13.2], [0, 0, 1], [Math.cos(angle), Math.sin(angle), 0], [-Math.sin(angle), Math.cos(angle), 0]);
export function leverPaths(x, angle) {
  const F = leverFrame(x, angle);
  return { bar: G.prismOf(F, LEVER.bar, 0, 1.2, P), grip: G.prismOf(F, LEVER.grip, 1.2, 2.2, P) };
}
export const GAUGE_F = G.frameOf([GAUGE.x, AX.y + AX.r, AX.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
export const GAUGE_FACE = 9.2; // s of the dial face on GAUGE_F
// needle: value 0 (atmosphere) to 1 (evacuated), sweeping 240°
export function needlePath(value) {
  const a = (-120 + 240 * (1 - value)) * (Math.PI / 180);
  const F = GAUGE_F;
  const tip = G.pointOf(F, GAUGE_FACE + 0.15, GAUGE.r - 2.4, Math.PI / 2 - a);
  const tail = G.pointOf(F, GAUGE_FACE + 0.15, 1.4, Math.PI / 2 - a + Math.PI);
  return k.pathOf([at(tail), at(tip)]);
}

// ------------------------------------------------------------ bubbler oil and bubbles
export function oilPaths(level) {
  // level: 0 at rest (small overpressure), 1 while the purge gas is flowing
  const zIn = BUB.z0 + 7 - 3 * level;
  const zOut = BUB.z0 + 9 + 4 * level;
  const r = BUB.r - 0.55;
  const a = k.cylinder(BUB.legX, BUB.legs[0], r, BUB.z0, zIn - BUB.z0, P, 14);
  const b = k.cylinder(BUB.legX, BUB.legs[1], r, BUB.z0, zOut - BUB.z0, P, 14);
  return { a, b, zIn, zOut };
}
export function bubbleDots(phase, level, zOut) {
  if (level < 0.02) return [];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const u = (phase + i / 4) % 1;
    const z = BUB.z0 + 1 + u * (zOut - BUB.z0 - 1.6);
    const wob = Math.sin((phase + i) * 7.1) * 0.4;
    out.push([...at([BUB.legX, BUB.legs[1] + wob, z]), Math.min(1, level * 1.4) * Math.min(1, (1 - u) * 6)]);
  }
  return out;
}

// ------------------------------------------------------------ record card, rising out of the slot
export function cardPaths(rise) {
  const h = Math.max(0.01, CARD.h * rise);
  return k.slabOf({ x: CARD.x, y: CARD.y, w: CARD.w, d: CARD.d, r: 0.2 }, REC.h - CARD.h + h, CARD.h, P, 2);
}
export function cardMarks(rise) {
  // three rule lines (text) and a status stripe on the card's front face (y = CARD.y + CARD.d)
  const zTop = REC.h + CARD.h * rise;
  const y = CARD.y + CARD.d;
  const line = (z, x0, x1) => k.pathOf([at([CARD.x + x0, y, z]), at([CARD.x + x1, y, z])]);
  const show = (z) => z > REC.h + 0.4;
  const rules = [
    [zTop - 2.4, 1.2, 7.6],
    [zTop - 4.2, 1.2, 6.2],
    [zTop - 6, 1.2, 7.0],
  ]
    .filter(([z]) => show(z))
    .map(([z, a, b]) => line(z, a, b))
    .join("");
  const stripe = show(zTop - 9.6) ? k.pathOf([at([CARD.x + 1.2, y, zTop - 9.4]), at([CARD.x + 1.2, y, zTop - 10.8]), at([CARD.x + 4.4, y, zTop - 10.8]), at([CARD.x + 4.4, y, zTop - 9.4])], true) : "";
  return { rules, stripe };
}

// ------------------------------------------------------------ wells on the verifier boards
export function boardsLayout(suites) {
  // each suite's board: as many columns as BOARD.rows rows need, laid out left to right after the hidden-subset compartment
  const cols = suites.map((s) => Math.ceil((s.total - s.hidden) / BOARD.rows));
  const margin = 2;
  const gap = 2;
  let x = SAFE.x + SAFE.w + 2.5;
  return suites.map((s, i) => {
    const w = cols[i] * BOARD.pitch + margin * 2;
    const board = { x, w, cols: cols[i], visible: s.total - s.hidden, suite: s.id };
    x += w + gap;
    return board;
  });
}
export function wellCentre(board, index) {
  const c = index % board.cols;
  const r = Math.floor(index / board.cols);
  return [board.x + 2 + BOARD.pitch * (c + 0.5), BOARD.y + BOARD.t, BOARD.z0 + BOARD.h - 2 - BOARD.pitch * (r + 0.5)];
}
