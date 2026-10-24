// Moving parts of Fig 5, drawn by the same code at build time (art.mjs) and in the page (live.js).
// No data import here: the page gets its numbers from the table the build writes into the markup.
import { iso, pathOf, lineOnTop } from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { P, brainUV, ACROSS, TOWARD, postXY, TONG, tongHalf, plateZ, ZB, ROW_X, BUS_S, BUS_P, LAMP_Y, SLIDE_Y, PICK_X, COUPLER_X, BEAM_Z, MIRROR, LEVER, SELECT, CHART, METER_R, METERS } from "./world.mjs";

const f2 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(([a, b]) => `${f2(a)} ${f2(b)}`);
export const polyD = (list) => `M${pts(list).join("L")}Z`;
export const lineD = (list) => `M${pts(list).join("L")}`;
export const circleD = ([x, y], r) => `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;
const rad = (d) => (d * Math.PI) / 180;
const at = (p) => iso(p, P);

// A bar with round ends from p to q in a 2D plane, as a polygon.
export function barRing(p, q, w, n = 4) {
  const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const out = [];
  for (let i = 0; i <= n; i++) out.push([p[0] + w * Math.cos(a + Math.PI / 2 + (i / n) * Math.PI), p[1] + w * Math.sin(a + Math.PI / 2 + (i / n) * Math.PI)]);
  for (let i = 0; i <= n; i++) out.push([q[0] + w * Math.cos(a - Math.PI / 2 + (i / n) * Math.PI), q[1] + w * Math.sin(a - Math.PI / 2 + (i / n) * Math.PI)]);
  return out;
}

// ---------------------------------------------------------------- etched cells
// geo: three characters per cell (grid i, grid j, voxels of 9 inside the regions);
// levels: one character per cell for each of the 18 views (model x language x component), -30 ... 30.
// Cells are binned into eight brightness steps, one path each, so a switch rewrites nine paths per plate.
export const ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const STEPS = 8;
export const CELL = 6 * 0.42; // one 6 mm cell at the etch scale
export const cellUV = (i, j) => brainUV(-70 + 6 * i, -104 + 6 * j);
// Levels travel run-length packed: "c~k" stands for the character c written k times (k in ALPHA, 3 to 61).
export function pack(text) {
  let out = "";
  for (let i = 0; i < text.length; ) {
    let k = 1;
    while (i + k < text.length && text[i + k] === text[i] && k < 61) k++;
    out += k >= 3 ? `${text[i]}~${ALPHA[k]}` : text.slice(i, i + k);
    i += k;
  }
  return out;
}
export const unpack = (packed) => packed.replace(/(.)~(.)/g, (_, c, k) => c.repeat(ALPHA.indexOf(k)));
export function cellPaths(geo, levels, view) {
  const n = geo.length / 3;
  const bins = Array.from({ length: STEPS + 1 }, () => []);
  const hollow = [];
  for (let c = 0; c < n; c++) {
    const level = ALPHA.indexOf(levels[view * n + c]) - 31;
    const bin = Math.round((Math.abs(level) / 30) * STEPS);
    if (!bin) continue;
    const [u, v] = cellUV(ALPHA.indexOf(geo[3 * c]), ALPHA.indexOf(geo[3 * c + 1]));
    const side = CELL * Math.max(0.45, 0.84 * Math.sqrt(ALPHA.indexOf(geo[3 * c + 2]) / 9));
    (level < 0 ? hollow : bins[bin]).push([Math.round((u - side / 2) * 10), Math.round((v - side / 2) * 10), Math.round(side * 10)]);
  }
  return bins.map((list, b) => (b && list.length ? `<path data-bin="${b}" d="${squaresD(list)}"/>` : "")).join("") + (hollow.length ? `<path data-hollow d="${squaresD(hollow)}"/>` : "");
}
// Squares in tenths, each moved to from the start of the one before (a closed subpath leaves the pen at its start).
const tenth = (t) => {
  const a = Math.abs(t);
  return (t < 0 ? "-" : "") + (a % 10 ? (a >= 10 ? `${Math.floor(a / 10)}.${a % 10}` : `.${a % 10}`) : `${a / 10}`);
};
const pair = (a, b) => {
  const y = tenth(b);
  return tenth(a) + (y[0] === "-" ? "" : " ") + y;
};
function squaresD(list) {
  let d = "";
  let px = 0;
  let py = 0;
  list.forEach(([x, y, s], j) => {
    d += (j ? `m${pair(x - px, y - py)}` : `M${pair(x, y)}`) + `h${tenth(s)}v${tenth(s)}h${tenth(-s)}z`;
    px = x;
    py = y;
  });
  return d;
}

// ---------------------------------------------------------------- lazy tongs
// Each tong stands in a level plane square to the line of sight, TONG.off in front of its post: local (u, z),
// u to screen right. Ten scissor cells; the centre pins sit at the plates' mid-heights and carry the hubs.
// Bars rising to the right are the front layer, bars rising to the left the back layer.
export const tongFrame = (side) => {
  const [x, y] = postXY(side);
  return G.frameOf([x, y, 0], TOWARD, ACROSS, [0, 0, 1]);
};
export function tongBars(g) {
  const hw = tongHalf(g);
  const front = [];
  const back = [];
  for (let i = 0; i < 10; i++) {
    const z = plateZ(i, g);
    front.push([[-hw, z - g / 2], [hw, z + g / 2]]);
    back.push([[hw, z - g / 2], [-hw, z + g / 2]]);
  }
  return { hw, front, back };
}
const merge = (list) => {
  const out = { fill: "", shades: ["", "", "", ""], top: "", crease: "", outline: "" };
  for (const p of list) {
    out.fill += p.fill;
    out.outline += p.outline;
    out.crease += p.crease;
    out.top += p.top;
    p.shades.forEach((d, j) => (out.shades[j] += d));
  }
  return out;
};
// The merged prism paths of one layer of one tong.
export function tongLayer(side, g, layer) {
  const F = tongFrame(side);
  const { front, back } = tongBars(g);
  const [s0, s1] = layer === "front" ? [TONG.off, TONG.off + TONG.t] : [TONG.off - TONG.t, TONG.off];
  return merge((layer === "front" ? front : back).map(([p, q]) => G.prismOf(F, barRing(p, q, TONG.w), s0, s1, P)));
}
// Pins on the tong's front face: the end pins at every joint, the centre pins at the plates.
export function tongPins(side, g) {
  const F = tongFrame(side);
  const hw = tongHalf(g);
  const s = TONG.off + TONG.t + 0.02;
  const ends = [];
  const centres = [];
  for (let i = 0; i <= 10; i++) for (const u of [-hw, hw]) ends.push(at(add3(F, s, u, ZB + i * g)));
  for (let i = 0; i < 10; i++) centres.push(at(add3(F, s, 0, plateZ(i, g))));
  return { ends, centres };
}
function add3(F, s, u, z) {
  return [F.o[0] + F.a[0] * s + F.u[0] * u, F.o[1] + F.a[1] * s + F.u[1] * u, z];
}
// Paths for a set of pin dots, as small circles in screen space.
export const dotsD = (points, r) => points.map((p) => circleD(p, r)).join("");
// The foot bracket the bottom pivots slide in: a slotted bar in the tong plane, local (u, z).
export const FOOT = { u: 19, z0: 20, z1: 21.2, s0: 3.0, s1: 6.6 };
// The slide blocks of the bottom pivots, in the tong plane.
export function footBlocks(side, g) {
  const F = tongFrame(side);
  const hw = tongHalf(g);
  const s1 = TONG.off - TONG.t - 0.02;
  const block = (u) => G.prismOf(F, [[u - 2.2, FOOT.z1], [u + 2.2, FOOT.z1], [u + 2.2, ZB + 1.4], [u - 2.2, ZB + 1.4]], FOOT.s0 + 0.4, s1, P);
  return merge([block(-hw), block(hw)]);
}

// ---------------------------------------------------------------- lever and selector on the rack base
// The lever swings in the y-z plane in front of the base's right face; 0 degrees points along -y (screen right), up is positive.
export const leverAngle = (fan) => LEVER.rest + (LEVER.pulled - LEVER.rest) * fan;
export const LEVER_X = LEVER.x + 4.4; // the arm's plane, in front of the shaft's end
export const LEVER_ARM = 1.5; // the arm's radius at its root; its back face sits on the shaft's end face
export function leverOf(angle) {
  const a = rad(angle);
  const dir = [0, -Math.cos(a), Math.sin(a)];
  const o = [LEVER_X, LEVER.y, LEVER.z];
  const F = G.frameOf(o, dir, [1, 0, 0], G.unit3(G.cross3(dir, [1, 0, 0])));
  // a turned arm with a rounded eye round the pivot, fixed on the shaft's end face, tapering to the ball
  const arm = G.solidOf([[-1.6, 0.6], [-1.3, 1.2], [-0.9, LEVER_ARM], [3.4, LEVER_ARM], [4.2, 0.95], [LEVER.len - 2.2, 0.75], [LEVER.len - 1.6, 0.75]], F, P, { steps: 10 });
  const tip = G.add3(o, G.mul3(dir, LEVER.len + 0.6));
  const ball = G.sphereOf(tip, 2.3, P, { steps: 16 });
  return { arm, ball, tip };
}
// The component selector: a knob on the base's left face (+y), axis +y. Three detents: SHARED, SPECIFIC, SHARED - SPECIFIC.
export const SELECT_ANGLES = [150, 90, 30];
export const SELECT_FACE = SELECT.y + 4.6; // the knob's front cap
export function selectorPointer(angle) {
  const a = rad(angle);
  const p = (r) => at([SELECT.x - r * Math.cos(a), SELECT_FACE + 0.02, SELECT.z + r * Math.sin(a)]);
  return pathOf([p(0.9), p(SELECT.r - 0.9)]);
}

// The language switch: a face-up knob on the breadboard; 0 degrees points to -y as seen from above, clockwise.
export const LANG_KNOB = { x: -84, y: 66, r: 3.4, dial: 6, z1: 16 };
export const LANG_ANGLES = [-45, 0, 45];
export function langPointer(angle) {
  const a = rad(angle);
  const { x, y, r } = LANG_KNOB;
  return lineOnTop([x, y], [x + Math.sin(a) * (r - 0.5), y - Math.cos(a) * (r - 0.5)], LANG_KNOB.z1 + 4.2, P);
}

// ---------------------------------------------------------------- optics
// Pop-up mirrors: on the SHARED bus a mirror is down (in the beam) unless its row is the heard language;
// on the SPECIFIC bus only the heard row's mirror is down.
export const liftOf = (bus, row, target) => ((bus === "S") === (row === target) ? MIRROR.lift : 0);
// Beam runs, each a straight run between two optical parts, with the rule for when it carries light and its order along
// the light path (the light front that sweeps along a run when it lights waits step x 110 ms). A run ends on a mirror's
// centre (cut: the recorded run stops short of the half-silvered cell it meets), behind a part, or on a lit spot (dot).
const AN = 5.2; // analyser body half-length along the SPECIFIC bus
export const CUBE = 2.6; // the pick-off cube's half-size
export const REF_Y = BUS_P - 8.6; // the tip of the reference port on the analyser's rim
const CUT = 1.5;
// Light leaves each lamp along -y, passes the encoder window on the slide, meets the SPECIFIC bus first (its mirror is
// down only for the heard language) and otherwise runs on to the SHARED bus, whose mirror is down for the two other languages.
export const BEAMS = [
  ...ROW_X.map((x, r) => ({ id: `a${r}`, from: [x, LAMP_Y - 0.2], to: [x, SLIDE_Y + 1], dot1: true, on: () => true, step: 0 })),
  ...ROW_X.map((x, r) => ({ id: `w${r}`, from: [x, SLIDE_Y - 1], to: [x, BUS_P], cut1: CUT, on: () => true, step: 1 })),
  ...ROW_X.map((x, r) => ({ id: `b${r}`, from: [x, BUS_P], to: [x, BUS_S], cut0: CUT, cut1: CUT, on: (t) => t !== r, step: 2 })),
  { id: "s0", from: [ROW_X[0], BUS_S], to: [ROW_X[1], BUS_S], cut0: CUT, cut1: CUT, on: (t) => t !== 0, step: 3 },
  { id: "s1", from: [ROW_X[1], BUS_S], to: [ROW_X[2], BUS_S], cut0: CUT, cut1: CUT, on: () => true, step: 4 },
  { id: "s2", from: [ROW_X[2], BUS_S], to: [PICK_X - CUBE, BUS_S], cut0: CUT, on: () => true, step: 5 },
  { id: "s3", from: [PICK_X + CUBE, BUS_S], to: [COUPLER_X, BUS_S], dot0: true, on: () => true, step: 6 },
  { id: "r0", from: [PICK_X, BUS_S + CUBE], to: [PICK_X, REF_Y], dot0: true, on: () => true, step: 6 },
  { id: "p0", from: [ROW_X[0], BUS_P], to: [ROW_X[1], BUS_P], cut0: CUT, cut1: CUT, on: (t) => t === 0, step: 2 },
  { id: "p1", from: [ROW_X[1], BUS_P], to: [ROW_X[2], BUS_P], cut0: CUT, cut1: CUT, on: (t) => t <= 1, step: 3 },
  { id: "p2", from: [ROW_X[2], BUS_P], to: [PICK_X - AN, BUS_P], cut0: CUT, on: () => true, step: 4 },
  { id: "p3", from: [PICK_X + AN, BUS_P], to: [COUPLER_X, BUS_P], dot0: true, on: () => true, step: 7 },
];
export const ANALYSER = { half: AN };
export const beamD = (b) => pathOf([at([b.from[0], b.from[1], BEAM_Z]), at([b.to[0], b.to[1], BEAM_Z])]);

// ---------------------------------------------------------------- the X-Y recorder, in bed coordinates (a along x, b up the bed)
export const chartA = (depth) => CHART.a0 + depth * (CHART.a1 - CHART.a0);
export const chartB = (z) => CHART.b0 + (Math.max(0, z) / CHART.top) * (CHART.b1 - CHART.b0);
export const curveD = (depth, values) => lineD(depth.map((d, i) => [chartA(d), chartB(values[i])]));
// Value of a curve under the pen at a depth: linear between the measured layers, held beyond them.
export function valueAt(depth, values, at) {
  if (at <= depth[0]) return values[0];
  for (let i = 1; i < depth.length; i++) {
    if (at <= depth[i]) return values[i - 1] + ((at - depth[i - 1]) / (depth[i] - depth[i - 1])) * (values[i] - values[i - 1]);
  }
  return values[values.length - 1];
}
// What the pen has drawn so far: the plot clipped to the left of the gantry.
export const revealD = (a) => polyD([[CHART.a0 - 3, CHART.b0 - 4], [a, CHART.b0 - 4], [a, CHART.b1 + 4], [CHART.a0 - 3, CHART.b1 + 4]]);

// ---------------------------------------------------------------- meters on the desk face, in face coordinates (a across, b up): 0 to METER_TOP over 240 degrees
export const METER_TOP = 0.1;
export const METER_SWEEP = 240;
export const needleAngle = (value) => -METER_SWEEP / 2 + Math.max(0, Math.min(1, value / METER_TOP)) * METER_SWEEP;
export function needleD(i, value) {
  const { a, b } = METERS[i];
  const t = rad(needleAngle(value));
  const dir = [Math.sin(t), Math.cos(t)];
  return lineD([[a - dir[0] * 1.6, b - dir[1] * 1.6], [a + dir[0] * (METER_R - 2.1), b + dir[1] * (METER_R - 2.1)]]);
}

// ---------------------------------------------------------------- text the card and the screen reader print
export const MODEL_NAME = { xlmr: "XLM-R", nllb_encoder: "NLLB" };
export const LANG_NAME = { en: "EN", fr: "FR", zh: "ZH" };
export const COMP_NAME = ["shared", "specific", "shared − specific"];
const z4 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(4);
export function readoutOf(row, narrow = false) {
  const head = `${MODEL_NAME[row.model]} ${LANG_NAME[row.lang]}`;
  if (narrow) return `${head} · Δz ${z4(row.effect)} · p_Holm ${row.pHolm.toFixed(4)}`;
  return `${head} · Δz ${z4(row.effect)} · p_Holm ${row.pHolm.toFixed(4)} · n ${row.n}`;
}
export function describe(row, comp, fan) {
  return `${MODEL_NAME[row.model]} encoder, ${LANG_NAME[row.lang]} listeners. Plates ${fan > 0.5 ? "fanned" : "stacked"}, showing ${COMP_NAME[comp]} at layer ${row.layer}. Semantic regions, middle-late layers: shared minus specific ${z4(row.effect)}, Holm-corrected p ${row.pHolm.toFixed(4)}, ${row.n} listeners.`;
}

// ---------------------------------------------------------------- solids the page rewrites: a fixed set of paths, so a frame only sets their d
export function fixedSolid(paths, { tone = "mid", crease = "faint", name, className } = {}) {
  const seam = paths.seamless ? ' data-seamless=""' : "";
  const shades = [0, 1, 2, 3].map((j) => `<path class="iso-shade" data-shade="${j}" d="${paths.shades[j] || ""}"/>`).join("");
  return `<g class="iso-solid${className ? ` ${className}` : ""}" data-part="${name}"${seam}><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top || ""}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${crease === "none" ? "" : (paths.crease || "") + (paths.bevel || "")}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}
export function writeSolid(g, paths) {
  const c = g.children;
  c[0].setAttribute("d", paths.fill);
  for (let j = 0; j < 4; j++) c[1 + j].setAttribute("d", paths.shades[j] || "");
  c[5].setAttribute("d", paths.top || "");
  if (c[6].getAttribute("data-tone") !== "none") c[6].setAttribute("d", (paths.crease || "") + (paths.bevel || ""));
  c[7].setAttribute("d", paths.outline);
}
