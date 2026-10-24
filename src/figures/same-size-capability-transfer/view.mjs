// Fig 8 camera, world layout and the builders for every part that changes shape. Shared by geometry.mjs (static art) and live.js.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { STATIONS, stationAt, CUT_SLOPE, BLADE, CUT_END } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 450;

// ---------------------------------------------------------------- world (units ≈ 1 px; x along the keys, y toward the operator, z up)
export const BENCH = { x: -154, y: -98, w: 276, d: 182, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 5;
export const STY_X = -50; // tracer stylus and cutter stand one vise-spacing apart
export const CUT_X = 50;
export const KEY_Z = 36;
export const KEY_T = 2.6;
export const KEY_MID = KEY_Z + KEY_T / 2;
export const EDGE_Y = 0; // the bitting edge at rest; it faces the stylus and the cutter, away from the camera
export const BLADE_W = 12;
export const MASTER_SH = STY_X - BLADE; // shoulders at rest (carriage travel c = 0): the stylus and cutter start at the tips
export const BLANK_SH = CUT_X - BLADE;
export const TIP_Y = EDGE_Y - 6; // stylus tip and the cutter's front point (ENGAGE in front of the edge)
export const WHEEL = { o: [CUT_X, TIP_Y - 18, KEY_MID], r: 18, t: 1.5 };
export const SHAFT = { y: 50, z: 12, r: 3 };
export const SLEEVE_R = 5.5;
export const SLEEVES = [-88, 28]; // carriage sleeves on the shaft, at rest
export const PILLOWS = [-148, 92];
export const GUIDE = { y: -4, d: 61 }; // guide blocks on the sleeves carry the cross-slide ways
export const GUIDE_TOP = 22;
export const WAY_TOP = 24;
export const BODY = { x: -118, y: 1, w: 162, d: 33, r: 3 }; // the vise plate rides the ways, z 24 … 30
export const BODY_Z = WAY_TOP;
export const BODY_TOP = 30;
export const JAW = { y: 4.6, d: 13 }; // lower jaw: the bitting edge overhangs it by more than the deepest cut
export const CLAMP = { y: 9, d: 8.6, h: 2 }; // the upper clamp holds only the spine, so the whole bitting stays in view
export const BAR = { x: -96, y: 57, w: 152, d: 6, r: 1 }; // index bar across the guide blocks' front faces, z 14 … 20
export const BAR_Z = 14;
export const BAR_TOP = 20;
export const RAIL = { x: BLANK_SH - 2.4, y: 57.6, w: BLADE + 4.8, d: 4.8, r: 0.8 }; // the 256-station rail on the bar, z 20 … 21.4
export const RAIL_TOP = 21.4;
export const PIN = { y: 60, r: 1.1, h: 3.4, down: 0.5, bore: 1.5 };
export const BOLT = { x: BLANK_SH - 9, y: 60, slide: 4.6, r: 2.6, h: 4.4 };
export const SPRING = { x: -28, z: 25, r: 1.6, back: 38, front: 55.2 };
export const STOP = [-48, 60];
export const STOP_TOP = BAR_TOP + 5.4;
export const HANDLE = { x: -66, arm: 27, ball: 69, r: 6, z: 27 };
export const PAWL = { x: CUT_X, post: 68 };
export const LEVER = { at: [108, 20], len: 11, angles: [-0.56, 0, 0.56] };
export const HOUSE = { x: -118, y: -90, w: 222, d: 32, r: 6 }; // one casting across the back: the motor and the dial
export const HOUSE_TOP = 40;
export const HEAD = { x: 76, y: -58, w: 28, d: 50, r: 3 }; // spindle head casting against the housing's front, z 0 … 30.3
export const HEAD_TOP = 30.3;
export const BEARING = { r: 7, x0: 78, x1: 104 };
export const DIAL = { at: [104, 72.5], r: 11, z: 26, h: 7.2 }; // on a pillar stand at the front right; its case clears the index bar
export const DIAL_BASE = { x: 95.5, y: 64, w: 17, d: 17, r: 2 };
export const DIAL_TOP = DIAL.z + DIAL.h;
export const DIAL_SPAN = 0.25; // one turn of the needle
export const STYLUS = { x: STY_X, face: -14, body: 6.2, tip: 8, r: 1.7, stroke: 3.6, back: 0.8 };

// one camera for the catalogue: azimuth 45, elevation 30, at the family's world scale
export const SCALE = 1.36;
const FIT = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [HOUSE.x, HOUSE.y, HOUSE_TOP], [HOUSE.x + HOUSE.w, HOUSE.y, HOUSE_TOP], [WHEEL.o[0], WHEEL.o[1], WHEEL.o[2] + WHEEL.r + 4]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 45, elevation: 30 },
);
// the fit centres the bounds; keep that centre (nudged down for the readout) and set the scale
const mid = [0, 1].map((i) => ((i ? HEIGHT : WIDTH) / 2 - FIT.origin[i]) / FIT.scale);
export const P = { ...FIT, scale: SCALE, origin: [WIDTH / 2 - SCALE * mid[0], HEIGHT / 2 - SCALE * mid[1]] };
export const at = (p) => k.iso(p, P);

// ---------------------------------------------------------------- moving groups
// s: { c carriage travel, feed in-feed, lift stylus lift 0…1, back stylus back-off 0…1, prune 0…1, lever angle }
export const offsetOf = (part, s) => {
  if (part === "saddle") return [s.c, 0, 0];
  if (part === "body") return [s.c, -s.feed, 0];
  if (part === "stylus") return [0, -STYLUS.stroke * s.lift - STYLUS.back * s.back, 0];
  if (part === "bolt") return [s.c + BOLT.slide * s.prune, 0, 0];
  if (part === "knob") return leverTip(s.lever, 0).map((v, i) => v - leverTip(0, 0)[i]);
  return [0, 0, 0];
};
export const move = (part, s) => k.translateAlong(P, offsetOf(part, s));

// ---------------------------------------------------------------- a solid whose paths change: every slot is always present
const SLOTS = ["fill", 0, 1, 2, 3, "top", "crease", "outline"];
export const slotsOf = (paths) => SLOTS.map((slot) => (typeof slot === "number" ? paths.shades[slot] || "" : paths[slot] || ""));
export function liveSolid(paths, { tone = "hi", lit = false, crease = "faint", attr = "" } = {}) {
  const [fill, s0, s1, s2, s3, top, cr, outline] = slotsOf(paths);
  return `<g class="iso-solid"${lit ? " data-lit" : ""}${attr}><path class="iso-fill" d="${fill}"/>${[s0, s1, s2, s3].map((d, i) => `<path class="iso-shade" data-shade="${i}" d="${d}"/>`).join("")}<path class="iso-top" d="${top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${cr}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${outline}"/></g>`;
}

// ---------------------------------------------------------------- the keys
// The plan ring of a key whose shoulder is at x = sh, with the bitting edge cut to depth(s). Every edge on the bitting
// side faces away from the camera (flanks no steeper than the cutter's, a chamfered far shoulder), so the outline is the
// top face's far edge and the near walls: one clean silhouette with no crossings.
const simplify = (points) => {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const [p, b] = [points[i], points[i + 1]];
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / span > 0.05) out.push(p);
  }
  out.push(points[points.length - 1]);
  return out;
};
export const BOW = { r: 12, back: 15, far: 2.6, near: 2.2 }; // bow circle centred `back` behind the shoulder
const bowC = (sh) => [sh - BOW.back, EDGE_Y + BLADE_W / 2];
export function keyRing(sh, depth) {
  const edge = [];
  for (let s = 0; s <= CUT_END + 1e-9; s += 0.3) edge.push([sh + s, EDGE_Y + depth(s)]);
  const [cx, cy] = bowC(sh);
  const nearY = EDGE_Y + BLADE_W + BOW.near;
  const farY = EDGE_Y - BOW.far;
  const a0 = Math.asin((nearY - cy) / BOW.r);
  const a1 = 2 * Math.PI + Math.asin((farY - cy) / BOW.r);
  const bow = [];
  for (let i = 0; i <= 20; i++) {
    const a = a0 + (i / 20) * (a1 - a0);
    bow.push([cx + BOW.r * Math.cos(a), cy + BOW.r * Math.sin(a)]);
  }
  return [
    [sh - 3, farY],
    ...simplify(edge),
    [sh + BLADE, EDGE_Y + 4.2],
    [sh + BLADE, EDGE_Y + 8.8],
    [sh + BLADE - 2.8, EDGE_Y + BLADE_W],
    [sh, EDGE_Y + BLADE_W],
    [sh, nearY],
    ...bow,
  ];
}
export const BOW_HOLE = (sh) => [bowC(sh)[0] - 4, bowC(sh)[1], 2.8];
export const bowCentre = bowC;
// the outline is one clean silhouette, so its runs chain into a single closed loop: that loop is the fill
function chained(outline) {
  const runs = outline.split("M").filter(Boolean).map((run) => run.split("L").map((pt) => pt.trim()));
  const loop = runs.shift() || [];
  while (runs.length) {
    const end = loop[loop.length - 1];
    const i = runs.findIndex((run) => run[0] === end || run[run.length - 1] === end);
    if (i < 0) break;
    const [run] = runs.splice(i, 1);
    loop.push(...(run[0] === end ? run : run.reverse()).slice(1));
  }
  return `M${loop.join("L")}Z`;
}
export function keyPaths(sh, depth) {
  const paths = k.extrude(keyRing(sh, depth), KEY_Z, KEY_T, P, { convex: false });
  return { ...paths, fill: chained(paths.outline) };
}
// the milled keyway along the blade: one closed slot from the shoulder to the tip chamfer
export const KEYWAY = { y: EDGE_Y + 5.2, d: 1.5, from: 1.2, to: BLADE - 4.2 };

// ---------------------------------------------------------------- index pins on the rail (they sink into their bores when pruned)
export const pinX = (index) => BLANK_SH + stationAt(STATIONS[index]);
export const pinPaths = (index, height) => k.cylinder(pinX(index), PIN.y, PIN.r, RAIL_TOP, height, P, 10);
// a stud too small for four side tones: one side tone, the top and the outline
const PIN_SLOTS = (paths) => [paths.fill, paths.shades.filter(Boolean).join(""), paths.top, paths.outline];
export const pinSlots = (paths) => PIN_SLOTS(paths).map((d) => d || "");
export const pinSolid = (paths, attr, tone = "mid") => {
  const [fill, side, top, outline] = pinSlots(paths);
  return `<g class="iso-solid"${attr}><path class="iso-fill" d="${fill}"/><path class="iso-shade" data-shade="1" d="${side}"/><path class="iso-top" d="${top}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${outline}"/></g>`;
};

// ---------------------------------------------------------------- the mode lever turns about z on its gate plate
export function leverTip(angle, extra = 0) {
  const [x, y] = LEVER.at;
  return [x + Math.sin(angle) * (LEVER.len + extra), y + Math.cos(angle) * (LEVER.len + extra), 0];
}
export function leverRing(angle) {
  const [x, y] = LEVER.at;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [[-1.3, -1.6], [1.3, -1.6], [1, LEVER.len], [-1, LEVER.len]].map(([u, v]) => [x + u * c + v * s, y - u * s + v * c]);
}
export const LEVER_Z = 4.6;
export const leverPaths = (angle) => k.extrude(leverRing(angle), LEVER_Z, 1.6, P);

// ---------------------------------------------------------------- the return spring between the bar post and the plate's lug
export const coilOf = (feed) => k.coil(SPRING.back - feed, SPRING.front, [SPRING.x, SPRING.z], SPRING.r, 7, "y", P);

// ---------------------------------------------------------------- pointers
export function needleAt(value) {
  const a = -Math.PI / 4 + (value / DIAL_SPAN) * Math.PI * 2;
  const [x, y] = DIAL.at;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  return k.lineOnTop([x - dx * 2.8, y - dy * 2.8], [x + dx * (DIAL.r - 2), y + dy * (DIAL.r - 2)], DIAL_TOP + 0.2, P);
}
export function needleRing(value) {
  const a = -Math.PI / 4 + (value / DIAL_SPAN) * Math.PI * 2;
  const [x, y] = DIAL.at;
  const [dx, dy] = [Math.sin(a), -Math.cos(a)];
  const [nx, ny] = [-dy * 0.3, dx * 0.3];
  const tail = [x - dx * 2.8, y - dy * 2.8];
  const tip = [x + dx * (DIAL.r - 2), y + dy * (DIAL.r - 2)];
  return [[tail[0] + nx, tail[1] + ny], [tip[0] + nx, tip[1] + ny], [tip[0] - nx, tip[1] - ny], [tail[0] - nx, tail[1] - ny]];
}
export function stopPointer(angle) {
  const [x, y] = STOP;
  return k.lineOnTop([x, y], [x + Math.sin(angle) * 2.4, y - Math.cos(angle) * 2.4], STOP_TOP, P);
}
export const ADJ = { at: [STY_X, -22] }; // fine-depth knob on the stylus holder
export const HOLDER_TOP = 41;
export const ADJ_TOP = HOLDER_TOP + 5.8;
export function adjusterPointer(angle, z) {
  const [x, y] = ADJ.at;
  return k.lineOnTop([x, y], [x + Math.sin(angle) * 2.4, y - Math.cos(angle) * 2.4], z, P);
}

// ---------------------------------------------------------------- spinning texture on the cutter and the brush wheel
export const FW = G.frameOf(WHEEL.o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
// the cutter's rim is a V with the same flank as the cuts it leaves
export const WHEEL_FACE = WHEEL.r - CUT_SLOPE * WHEEL.t;
export const WHEEL_PROFILE = [[-WHEEL.t, WHEEL_FACE], [0, WHEEL.r], [WHEEL.t, WHEEL_FACE]];
export const wheelTeeth = (phase) => G.ribsOf(FW, 0, WHEEL.t, WHEEL.r, 32, P, { phase, r1: WHEEL_FACE, fade: [0.04, 0.5] });
export const BRUSH = { s0: 7, s1: 11.6, r: 9.4, hub: 3.2 };
export const brushSpokes = (phase) => G.spokesOf(FW, BRUSH.s1, BRUSH.hub, BRUSH.r, 14, P, { phase, sweep: 0.12 });

// faded texture in fixed opacity buckets, so live code can rewrite each bucket's path in place
export const LEVELS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
export function bucketsOf(list) {
  const out = LEVELS.map(() => []);
  for (const { d, alpha } of list) {
    if (alpha < 0.08) continue;
    const i = LEVELS.findIndex((level) => alpha <= level + 0.075);
    out[i < 0 ? LEVELS.length - 1 : i].push(d);
  }
  return out.map((parts) => parts.join(""));
}

// ---------------------------------------------------------------- pointer targets (viewBox units at rest; live code scales the radius)
export const targetOf = (name, s) => {
  if (name === "lever") return at([...leverTip(s.lever).slice(0, 2), 9]);
  if (name === "bolt") return at([BOLT.x + s.c + BOLT.slide * s.prune, BOLT.y, RAIL_TOP + 3]);
  return at([HANDLE.x + s.c, HANDLE.ball - s.feed, HANDLE.z]);
};
