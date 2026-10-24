// Fig 3: a card-catalogue cabinet that is the agent's persisted memory.
// Pure ESM, no Node APIs: runs at build time in Astro's frontmatter and in build.mjs.
import * as k from "../kit/iso-kit.mjs";
import { CHAINS, METHODS, KNOB_ANGLES, DIAL_SPAN, readoutAt } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 452;

// World layout, about 1 unit per px of the real thing; x along the cabinet, y toward the front, z up.
const X0 = -129;
const X1 = 129;
const BACK = -22;
const FRONT = 34;
const BENCH = { x: X0 - 16, y: BACK - 10, w: X1 - X0 + 32, d: FRONT + 38 - (BACK - 10), r: 9 };
const BENCH_H = 10;
const FOOT_H = 6;
const PLINTH = 12;
const CASE_TOP = 96;
const TOP = { z0: 97.6, z1: 101.6 };

const END = 7; // end stiles
const OW = 27; // opening width
const GAP = 4; // stile between columns
const OH = 19; // opening height
const ROWS = [
  { batch: "s1", z0: 63, poisoned: true },
  { batch: "s1", z0: 40 },
  { batch: "s2", z0: 17 },
];
const FRIEZE_TOP = CASE_TOP;
const LAMP_Z = 90.4;
const CATCH_Z = 85.2;
export const PULL = 30;
const PROUD = 1; // drawer fronts stand proud of the face frame
const BOX_D = 46;
const LAMP_R = 1.8;

const DIAL = { x: 92, y: 4, r: 15, h: 7 };
const KNOB = { x: -100, y: 4, r: 6.2, h: 5.4 };
const CARD = { x: -56, y: -7, w: 96, d: 24, r: 1.4 };
// The replay key: a keycap on a stem that strokes once per replayed LLM call.
const KEY = { x: 58, y: 6, travel: 2.4 };

const columnX = (c) => X0 + END + c * (OW + GAP);
const BAR_DX = OW - 4; // the S1 bar's x within a column

// Azimuth 52 rather than the catalogue's 45: the mechanism is the long face of drawers, so the camera turns a little toward it.
const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...k.boxCorners({ x: X0 - 3, y: BACK, w: X1 - X0 + 6, d: FRONT - BACK + 3, r: 0 }, 0, TOP.z1 + 11)],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 52, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const r1 = (v) => Math.round(v * 10) / 10;
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const faceOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const sideOf = (x) => k.sideMatrix([x, 0], 0, P, "right");
const topOf = (x, y, z) => k.topMatrix([x, y], z, P, "x");
// A rounded rectangle in a face plane's local (u, -z) coordinates.
const flat = (x0, z0, x1, z1, r, steps = 4) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const circle = (cx, cy, r) => `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
// The screen offset of a world offset: every repeated part is one drawing moved by this.
const shift = ([x, y, z]) => {
  const [sx, sy] = k.axisVector(P, [x, y, z]);
  return `translate(${Math.round(sx * 100) / 100} ${Math.round(sy * 100) / 100})`;
};

// Repeated parts are drawn once in <defs> and placed with <use>; a flat build inlines them for the line check.
let DEFS = new Map();
let FLAT = false;
const def = (id, svg) => (DEFS.set(id, svg), id);
const place = (id, transform, attrs = "") => (FLAT ? `<g transform="${transform}"${attrs}>${DEFS.get(id)}</g>` : `<use href="#${id}" transform="${transform}"${attrs}/>`);

function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out;
  };
  const lower = chain(pts);
  const upper = chain([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// The bench every instrument in the catalogue stands on: feet, groove, corner screws, a ruler along
// the cabinet with a major tick under each column, the maker's plate, and the drawers' travel scale.
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 8))) {
    out.push(S(k.cylinder(x, y, 5.8, -BENCH_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4.6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // Ruler along the cabinet: a major tick under each column's centre, a middle one under each stile.
  const ruler = { x: -114, y: 44, w: 228, d: 6, r: 1 };
  out.push(S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = { minor: [], mid: [], major: [] };
  const first = columnX(0) + OW / 2;
  for (let i = 0; i <= 70; i++) {
    const x = first + (i * (OW + GAP)) / 10;
    const kind = i % 10 === 0 ? "major" : i % 5 === 0 ? "mid" : "minor";
    const length = { major: 3.6, mid: 2.6, minor: 1.6 }[kind];
    ticks[kind].push(k.lineOnTop([x, ruler.y + 0.3], [x, ruler.y + 0.3 + length], 0.6, P));
  }
  out.push(L(ticks.minor.join("") + ticks.mid.join(""), { tone: "lo" }), L(ticks.major.join(""), { tone: "mid" }));
  out.push(D([at([ruler.x + 2.4, ruler.y + 3.4, 0.6]), at([ruler.x + ruler.w - 2.4, ruler.y + 3.4, 0.6])], { size: 0.42 }));

  // The maker's plate: the mark and three rule lines standing for the engraving.
  const plate = { x: -129, y: 53.5, w: 46, d: 12.5, r: 1.4 };
  const pz = 0.8;
  out.push(S(k.slabOf(plate, 0, pz, P, 4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.4), pz, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(topOf(plate.x + 11.5, plate.y + 4.7, pz), "AU-3", { size: 3.4, tone: "mid" }));
  const rules = [[6.9, 30], [8.9, 24], [10.7, 16]].map(([dy, w]) => k.lineOnTop([plate.x + 11.5, plate.y + dy], [plate.x + 11.5 + w, plate.y + dy], pz, P));
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 3.2, plate.y + 3.2, pz]), at([plate.x + 3.2, plate.y + plate.d - 3.2, pz])], { size: 0.45 }));

  // Travel scale beside the last column: 0 at the drawer fronts, a major mark every 10 to the stop at 30.
  const strip = { x: X1 - 5.5, y: FRONT + 0.6, w: 5, d: PULL + 1.4, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const travel = { minor: [], major: [], zero: [] };
  for (let i = 0; i <= PULL / 2; i++) {
    const y = FRONT + PROUD + i * 2;
    const kind = i === 0 ? "zero" : i % 5 === 0 ? "major" : "minor";
    travel[kind].push(k.lineOnTop([strip.x + 0.3, y], [strip.x + 0.3 + (kind === "minor" ? 1.4 : 3), y], 0.6, P));
  }
  out.push(L(travel.minor.join(""), { tone: "lo" }), L(travel.major.join(""), { tone: "mid" }), L(travel.zero.join(""), { tone: "hi" }));
  out.push(D([at([strip.x + 3.9, strip.y + 2, 0.6]), at([strip.x + 3.9, strip.y + strip.d - 2, 0.6])], { size: 0.4 }));
  return out.join("");
}

// An opening in the face frame at column 0, row z0 = 0: a dark recess with its inner walls.
function openingDef() {
  const depth = 6;
  const ring = k.roundedPlan({ x: 0, y: 0, w: OW, d: OH, r: 0.6 }, 2);
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (OW / 2 - (ax + bx) / 2) + nz * (OH / 2 - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, FRONT, az]), at([bx, FRONT, bz]), at([bx, FRONT - depth, bz]), at([ax, FRONT - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(0, 0, OW, OH, 0.6, 2);
  DEFS.set("srr-opclip", `<path transform="${faceOf(FRONT)}" d="${shape}"/>`);
  return def(
    "srr-opening",
    [
      `<g clip-path="url(#srr-opclip)">`,
      `<path class="iso-top" d="${tops.join("")}"/>`,
      ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
      `<path class="iso-shade" data-shade="0" transform="${faceOf(FRONT - depth)}" d="${shape}"/>`,
      `</g>`,
      `<path class="iso-line" data-tone="lo" transform="${faceOf(FRONT)}" d="${shape}"/>`,
    ].join(""),
  );
}

// A lamp in a vertical face at the origin: bezel, dark glass, the glass that lights, and its rim.
function lampDefs() {
  def("srr-lamp", `<g transform="${faceOf(0)}"><path class="iso-shade" data-shade="2" d="${circle(0, 0, LAMP_R + 0.9)}"/><path class="iso-line" data-tone="mid" d="${circle(0, 0, LAMP_R + 0.9)}"/><path class="iso-shade" data-shade="0" d="${circle(0, 0, LAMP_R)}"/></g>`);
  def("srr-glow", `<path transform="${faceOf(0)}" d="${circle(0, 0, LAMP_R)}"/>`);
  def("srr-rim", `<path class="iso-line" data-tone="lo" transform="${faceOf(0)}" d="${circle(0, 0, LAMP_R)}"/>`);
}
const lamp = ([x, y, z], attrs) => `<g transform="${shift([x, y, z])}">${place("srr-lamp", "translate(0 0)")}${place("srr-glow", "translate(0 0)", ` class="sr-lamp" ${attrs} style="opacity:0"`)}${place("srr-rim", "translate(0 0)")}</g>`;

function cabinet() {
  const W = X1 - X0;
  const D_ = FRONT - BACK;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: X0, y: BACK, w: W, d: D_, r: 2 }, 0, 6, P)}"/>`];
  // Plinth, set back under the case, with a kick strip and an angle bracket at each end bolting it to the bench.
  const plinth = { x: X0 + 2, y: BACK + 2, w: W - 4, d: FRONT - 2 - (BACK + 2), r: 1 };
  out.push(S(k.slabOf(plinth, 0, PLINTH, P, 3, 0.4), { tone: "lo" }));
  const rail = { x: X0 + 22, y: FRONT - 2, w: W - 44, d: 1.4, r: 0.6 };
  out.push(S(k.slabOf(rail, 2.4, 7.2, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([rail.x + 2.2, FRONT - 0.6, 6]), at([rail.x + rail.w - 2.2, FRONT - 0.6, 6])], { size: 0.42 }));
  for (const bx of [X0 + 7, X1 - 17]) {
    out.push(S(k.slabOf({ x: bx, y: FRONT - 2, w: 10, d: 7, r: 0.8 }, 0, 1, P, 2, 0.2), { tone: "mid" }));
    out.push(S(k.slabOf({ x: bx, y: FRONT - 2, w: 10, d: 1.2, r: 0.4 }, 1, 7.4, P, 2, 0.2), { tone: "mid" }));
    out.push(D([at([bx + 2.6, FRONT - 0.8, 5.4]), at([bx + 7.4, FRONT - 0.8, 5.4]), at([bx + 2.6, FRONT + 3, 1]), at([bx + 7.4, FRONT + 3, 1])], { size: 0.42 }));
  }
  // The case, with a bead along the frieze that wraps onto the side.
  const casePlan = { x: X0, y: BACK, w: W, d: D_, r: 1.2 };
  const bead = L(k.sideSeam(casePlan, FRIEZE_TOP - 2.4, P, 3), { tone: "faint" });
  out.push(S(k.slabOf(casePlan, PLINTH, CASE_TOP - PLINTH, P, 3, 0.8), { tone: "mid", inner: bead }));
  out.push(sidePanel());
  // Face frame: 24 openings, eight columns by three rows.
  const op = openingDef();
  for (const row of ROWS) CHAINS.forEach((_, c) => out.push(place(op, shift([columnX(c), 0, row.z0]))));
  // Frieze: each chain's suspicious-root lamp, and the catch its S1 bar hangs below.
  const catchDef = def("srr-catch", S(k.slabOf({ x: BAR_DX - 2.2, y: FRONT, w: 4.4, d: PROUD + 3.4, r: 0.6 }, CATCH_Z, 2.2, P, 2, 0.3), { tone: "mid" }));
  // and a holder for the chain's name card at the left of each column.
  const holder = flat(1.4, 84.4, 16.6, 89.8, 0.5, 2);
  const card = flat(3, 85.1, 15, 89.1, 0.2, 1);
  const label = def("srr-chain", `<g transform="${faceOf(FRONT)}"><path class="iso-top" d="${card}"/>${L(holder, { tone: "mid" })}${L(card, { tone: "faint" })}${L("M4 -87.1L12.4 -87.1", { tone: "lo", free: true })}</g>` + D([at([2.2, FRONT, 87.1]), at([15.8, FRONT, 87.1])], { size: 0.36 }));
  CHAINS.forEach((_, c) => {
    out.push(place(label, shift([columnX(c), 0, 0])));
    out.push(place(catchDef, shift([columnX(c), 0, 0])));
    out.push(lamp([columnX(c) + BAR_DX, FRONT, LAMP_Z], `data-lamp="root" data-col="${c}"`));
  });
  return out.join("");
}

// The side panel: frame and raised panel with their screws, a card holder, and a bar handle on two posts.
function sidePanel() {
  const out = [];
  const frame = { u0: -(FRONT - 6), u1: -(BACK + 6), z0: PLINTH + 6, z1: CASE_TOP - 9 };
  const panel = { u0: frame.u0 + 4, u1: frame.u1 - 4, z0: frame.z0 + 4, z1: frame.z1 - 4 };
  const screwAt = [[frame.u0 + 2, frame.z0 + 2], [frame.u1 - 2, frame.z0 + 2], [frame.u0 + 2, frame.z1 - 2], [frame.u1 - 2, frame.z1 - 2]];
  // The card holder sits low on the panel, centred under the handle.
  const uc = (panel.u0 + panel.u1) / 2;
  const holder = flat(uc - 8, 38, uc + 8, 46, 0.6, 2);
  const card = flat(uc - 6.8, 38.9, uc + 6.8, 45.1, 0.2, 1);
  const lines = `M${r1(uc - 5)} -43.2L${r1(uc + 4)} -43.2M${r1(uc - 5)} -40.8L${r1(uc + 1.6)} -40.8`;
  out.push(
    `<g transform="${sideOf(X1)}">`,
    L(flat(frame.u0, frame.z0, frame.u1, frame.z1, 2.4), { tone: "lo" }),
    L(flat(panel.u0, panel.z0, panel.u1, panel.z1, 1.6), { tone: "faint" }),
    L(screwAt.map(([u, z]) => circle(u, -z, 1)).join(""), { tone: "lo" }),
    `<path class="iso-top" d="${card}"/>`,
    L(holder, { tone: "mid" }),
    L(card, { tone: "faint" }),
    L(lines, { tone: "lo", free: true }),
    `</g>`,
  );
  out.push(D(screwAt.map(([u, z]) => at([X1, -u, z])), { size: 0.42 }));
  out.push(D([at([X1, -(uc - 7.2), 42]), at([X1, -(uc + 7.2), 42])], { size: 0.36 }));
  // Bar handle: two back plates with their screws, two posts, the grip.
  const yc = -uc;
  const zc = 72;
  for (const py of [yc - 10, yc + 10]) {
    out.push(S(k.slabOf({ x: X1, y: py - 2.4, w: 0.6, d: 4.8, r: 0.8 }, zc - 3.4, 6.8, P, 2), { tone: "mid" }));
    out.push(D([at([X1 + 0.6, py, zc - 2.4]), at([X1 + 0.6, py, zc + 2.4])], { size: 0.36 }));
    out.push(S(k.slabOf({ x: X1 + 0.6, y: py - 1.2, w: 3, d: 2.4, r: 0.5 }, zc - 1.2, 2.4, P, 2), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: X1 + 3.6, y: yc - 12.5, w: 2.2, d: 25, r: 1 }, zc - 1.5, 3, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

function lid() {
  const W = X1 - X0;
  const out = [];
  out.push(S(k.slabOf({ x: X0 - 1.2, y: BACK, w: W + 2.4, d: FRONT - BACK + 1.2, r: 1 }, CASE_TOP, TOP.z0 - CASE_TOP, P, 3), { tone: "lo" }));
  const plan = { x: X0 - 2.6, y: BACK, w: W + 5.2, d: FRONT - BACK + 2.6, r: 1.6 };
  out.push(S(k.slabOf(plan, TOP.z0, TOP.z1 - TOP.z0, P, 3, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 4.4), TOP.z1, P, 3), { tone: "faint" }));
  out.push(selector(), directory(), replayKey(), dial(), results());
  return out.join("");
}

// The result lamps along the front of the lid, a pair over each column: S3 (the attack is gone) and
// S4 (the remembered fact is kept). They sit where no drawer can hide them.
function results() {
  const z = TOP.z1;
  const y = FRONT - 6;
  const r = 2.3;
  const bezel = def("srr-tbezel", S(k.cylinder(0, y, r + 0.9, z, 0.9, P, 32, 0.2), { tone: "mid" }) + `<path class="iso-shade" data-shade="0" d="${k.ring(0, y, r, z + 0.9, P, 32)}"/>`);
  def("srr-tglow", `<path d="${k.ring(0, y, r, z + 0.9, P, 32)}"/>`);
  def("srr-trim", L(k.ring(0, y, r, z + 0.9, P, 32), { tone: "lo" }));
  const out = [];
  CHAINS.forEach((_, c) => {
    const cx = columnX(c) + OW / 2;
    [["s3", cx - 5], ["s4", cx + 5]].forEach(([name, x]) => {
      const t = shift([x, 0, 0]);
      out.push(place(bezel, t), place("srr-tglow", t, ` class="sr-lamp" data-lamp="${name}" data-col="${c}" style="opacity:0"`), place("srr-trim", t));
    });
  });
  return out.join("");
}

// Mode selector: a knurled knob over five detents, one per recovery method.
function selector() {
  const z = TOP.z1;
  const plate = { x: KNOB.x - 13, y: KNOB.y - 12, w: 26, d: 24, r: 2 };
  const out = [`<g class="sr-knob" data-part="knob">`, S(k.slabOf(plate, z, 1.4, P, 3, 0.4), { tone: "lo" })];
  out.push(D(k.corners(plate, 2.6).map(([x, y]) => at([x, y, z + 1.4])), { size: 0.42 }));
  const ring = 9.6;
  const pt = (deg, r) => [r1(Math.sin((deg * Math.PI) / 180) * r), r1(-Math.cos((deg * Math.PI) / 180) * r)];
  const marks = KNOB_ANGLES.map((deg) => `M${pt(deg, ring).join(" ")}L${pt(deg, ring + 2.2).join(" ")}`).join("");
  const arc = `M${pt(KNOB_ANGLES[0], ring).join(" ")}A${ring} ${ring} 0 0 1 ${pt(KNOB_ANGLES[4], ring).join(" ")}`;
  out.push(`<g transform="${topOf(KNOB.x, KNOB.y, z + 1.4)}">${L(arc, { tone: "lo" })}${L(marks, { tone: "mid" })}</g>`);
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.2, z + 1.4, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, z + 2.4, KNOB.h, P, 40, 0.4), { tone: "mid" }) + L(k.knurl(KNOB.x, KNOB.y, KNOB.r, z + 2.6, z + 2.4 + KNOB.h - 0.6, 30, P), { tone: "lo" }));
  const kz = z + 2.4 + KNOB.h;
  const grip = flat(-1.3, -4.8, 1.3, 4.8, 1.2, 3);
  out.push(`<g transform="${topOf(KNOB.x, KNOB.y, kz)}"><g data-part="pointer" transform="rotate(${KNOB_ANGLES[0]})"><path class="iso-top" d="${grip}"/>${L(grip, { tone: "mid" })}${L("M0 -1.2L0 -4.2", { tone: "hi" })}</g></g>`, `</g>`);
  return out.join("");
}

// The catalogue's directory card under a frame: one ruled line per chain, standing for its name.
function directory() {
  const z = TOP.z1;
  const out = [S(k.slabOf(CARD, z, 0.9, P, 3, 0.3), { tone: "lo" })];
  const inner = k.insetPlan(CARD, 2.2);
  out.push(`<path class="iso-top" d="${k.planOutline(inner, z + 0.9, P, 2)}"/>`);
  out.push(L(k.planOutline(inner, z + 0.9, P, 2), { tone: "faint" }));
  const rules = CHAINS.map((_, i) => {
    const row = i % 4;
    const col = i < 4 ? 0 : 1;
    const x = inner.x + 4 + col * (inner.w / 2);
    const y = inner.y + 3.4 + row * 4.2;
    return k.lineOnTop([x, y], [x + 30 - ((i * 7) % 12), y], z + 0.9, P);
  });
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(D(k.corners(CARD, 1.1).map(([x, y]) => at([x, y, z + 0.9])), { size: 0.4 }));
  return out.join("");
}

// The replay key: mounting plate with four screws, a round collar, the stem inside it, and
// the cap, which the live code moves down by KEY.travel for each replayed LLM call.
const KEY_REST = TOP.z1 + 1.2 + 2.6 + 2.6; // the cap's underside at rest
function replayKey() {
  const z = TOP.z1;
  const plate = { x: KEY.x - 9, y: KEY.y - 9, w: 18, d: 18, r: 1.6 };
  const out = [S(k.slabOf(plate, z, 1.2, P, 3, 0.3), { tone: "lo" })];
  out.push(D(k.corners(plate, 2.4).map(([x, y]) => at([x, y, z + 1.2])), { size: 0.42 }));
  out.push(S(k.cylinder(KEY.x, KEY.y, 4.8, z + 1.2, 2.6, P, 36, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(KEY.x, KEY.y, 1.8, z + 3.8, 2.8, P, 20), { tone: "mid" }));
  const cap = { x: KEY.x - 6.5, y: KEY.y - 6.5, w: 13, d: 13, r: 2 };
  const capTop = KEY_REST + 3.6;
  const dish = L(k.planOutline(k.insetPlan(cap, 1.6), capTop, P, 3), { tone: "faint" }) + L(k.ring(KEY.x, KEY.y, 3, capTop, P, 28), { tone: "lo" });
  out.push(`<g data-part="key">${S(k.slabOf(cap, KEY_REST, 3.6, P, 3, 0.5), { tone: "mid", inner: dish })}</g>`);
  return out.join("");
}

// Dial gauge: extra LLM calls after detection, 0 to 20, a major mark every 5 and the zero mark at hi.
function dial() {
  const z = TOP.z1;
  const top_ = z + 1.6 + DIAL.h;
  const out = [S(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 1.6, z, 1.6, P, 48), { tone: "lo" })];
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, z + 1.6, DIAL.h, P, 64, 0.6), { tone: "mid", inner: L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, top_ - 2.6, P, 40), { tone: "faint" }) }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, top_ - 2.6, top_, 60, P, 0.3), { tone: "lo" }));
  const R = DIAL.r - 2.2;
  const pt = (deg, r) => [r1(Math.sin((deg * Math.PI) / 180) * r), r1(-Math.cos((deg * Math.PI) / 180) * r)];
  const ticks = { minor: [], major: [], zero: [] };
  for (let i = 0; i <= 20; i++) {
    const deg = DIAL_SPAN[0] + ((DIAL_SPAN[1] - DIAL_SPAN[0]) * i) / 20;
    const kind = i === 0 ? "zero" : i % 5 === 0 ? "major" : "minor";
    ticks[kind].push(`M${pt(deg, R - (kind === "minor" ? 1.5 : kind === "zero" ? 3.6 : 3)).join(" ")}L${pt(deg, R).join(" ")}`);
  }
  const arc = `M${pt(DIAL_SPAN[0], R).join(" ")}A${R} ${R} 0 1 1 ${pt(DIAL_SPAN[1], R).join(" ")}`;
  out.push(
    `<g transform="${topOf(DIAL.x, DIAL.y, top_)}">${L(circle(0, 0, DIAL.r - 0.9), { tone: "lo" })}${L(arc, { tone: "lo" })}${L(ticks.minor.join(""), { tone: "lo" })}${L(ticks.major.join(""), { tone: "mid" })}${L(ticks.zero.join(""), { tone: "hi" })}<g data-part="needle" transform="rotate(${DIAL_SPAN[0]})">${L(`M0 3.6L0 ${r1(-(R - 0.8))}`, { tone: "lit", className: "sr-needle", free: true })}</g>${L(circle(0, 0, 1.3), { tone: "mid" })}</g>`,
  );
  out.push(D([at([DIAL.x, DIAL.y, top_])], { size: 0.5, tone: "hi" }));
  // Lug and crown on the +x side.
  out.push(S(k.slabOf({ x: DIAL.x + DIAL.r - 0.4, y: DIAL.y - 2, w: 3.4, d: 4, r: 0.6 }, z + 1.6 + DIAL.h * 0.35, 2.6, P, 2), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x + DIAL.r + 4.4, DIAL.y, 1.6, z + 1.6 + DIAL.h * 0.2, 3.6, P, 16), { tone: "mid" }));
  return out.join("");
}

// One drawer at column 0, row z0 = 0, shut: an open box of index cards behind a front with a label
// holder, a cup pull and the end of the card rod. A drawer is one persisted record and its stack of
// cards is that record's content, so the poisoned record is a whole stack drawn darker on top.
const FACE = FRONT + PROUD;
const INNER = FACE - 1.8;
const BOX = { x: 1.4, y: INNER - BOX_D, w: OW - 2.8, d: BOX_D, r: 0.4 };
const BOX_TOP = OH - 3.4;
const CARD_TOP = OH - 2.2;
const CARDS = Array.from({ length: 11 }, (_, i) => INNER - 3 - i * 3.4); // front to back
const GUIDES = { 1: 3.2, 5: 11.4, 8: 6.8 }; // guide cards and where their tabs sit
function cardOf(y, { tab = null, top = CARD_TOP } = {}) {
  const card = { x: 3, y: y - 0.45, w: OW - 6, d: 0.45, r: 0 };
  const out = [S(k.slabOf(card, 1.8, top - 1.8, P, 1), { tone: "mid", crease: "faint" })];
  if (tab !== null) out.push(S(k.slabOf({ x: card.x + tab, y: card.y, w: 6, d: 0.45, r: 0 }, top, 1.6, P, 1), { tone: "mid", crease: "faint" }));
  return out.join("");
}
function drawerDefs() {
  const rim = k.insetPlan(BOX, 1.1);
  const well = k.planOutline(rim, BOX_TOP, P, 2);
  const box = S(k.slabOf(BOX, 0.6, BOX_TOP - 0.6, P, 2), { tone: "mid", inner: `<path class="iso-shade" data-shade="0" d="${well}"/>` });
  // The follower block that keeps the cards upright, at the back of the stack.
  const follower = S(k.slabOf({ x: 3.4, y: CARDS[CARDS.length - 1] - 5, w: OW - 6.8, d: 3, r: 0.4 }, 1.8, 9, P, 2, 0.3), { tone: "mid" });
  const stack = CARDS.map((y, i) => cardOf(y, { tab: GUIDES[i] ?? null })).reverse().join("");
  const pts = [];
  for (const z of [BOX_TOP, CARD_TOP + 2.2 + 0.3]) for (const p of k.corners(rim)) pts.push(at([p[0], p[1], z]));
  DEFS.set("srr-wellclip", `<path d="${k.pathOf(hull(pts), true)}"/>`);
  def("srr-dbox", box + `<g clip-path="url(#srr-wellclip)">${follower}${stack}</g>`);
  // The same stack again, placed with class sr-tint, whose custom properties darken it into the poisoned
  // record; the live code fades it out when replay rewrites the record.
  def("srr-dtint", `<g clip-path="url(#srr-wellclip)">${stack}</g>`);
  def("srr-dwell", L(well, { tone: "lo" }));
  const front = [];
  front.push(S(k.slabOf({ x: 0.6, y: INNER, w: OW - 1.2, d: 1.8, r: 0.5 }, 0.6, OH - 1.2, P, 2, 0.4), { tone: "mid" }));
  const lx = 12;
  const holder = flat(lx - 5.6, 10.6, lx + 5.6, 15.2, 0.5, 2);
  const card = flat(lx - 4.8, 11.3, lx + 4.8, 14.5, 0.2, 1);
  front.push(`<g transform="${faceOf(FACE)}"><path class="iso-top" d="${card}"/>${L(holder, { tone: "mid" })}${L(card, { tone: "faint" })}${L(`M${r1(lx - 3.4)} -12.9L${r1(lx + 2.6)} -12.9`, { tone: "lo", free: true })}${L(circle(lx, -2.5, 1.1), { tone: "mid" })}</g>`);
  front.push(D([at([lx - 5.1, FACE, 12.9]), at([lx + 5.1, FACE, 12.9]), at([lx, FACE, 2.5])], { size: 0.36 }));
  front.push(S(k.slabOf({ x: lx - 4.6, y: FACE, w: 9.2, d: 2.2, r: 1 }, 4.8, 2.8, P, 3, 0.3), { tone: "mid" }));
  front.push(L(k.lineOnTop([lx - 3.2, FACE + 0.9], [lx + 3.2, FACE + 0.9], 7.6, P), { tone: "lo" }));
  def("srr-dfront", front.join(""));
  // The clip that hides the box behind the face frame: the opening swept out to the stop.
  const sweep = [];
  for (const y of [FRONT - 0.05, FRONT + PULL + PROUD + 3])
    for (const [x, z] of [[0, 0], [OW, 0], [OW, OH], [0, OH]]) sweep.push(at([x, y, z]));
  DEFS.set("srr-dclip", `<path d="${k.pathOf(hull(sweep), true)}"/>`);
}

// The S1 bar at column 0: it gangs the two records the S1 writer made from the flagged read. It is held
// off each drawer front by a bracket screwed on either side of it.
function barDef() {
  const out = [];
  const brackets = ROWS.filter((r) => r.batch === "s1").map((row) => row.z0 + OH / 2);
  for (const zc of brackets) {
    // Wider on the left, where the bar's front face covers more of the bracket at this camera.
    out.push(S(k.slabOf({ x: BAR_DX - 4.4, y: FACE, w: 7.5, d: 1.8, r: 0.5 }, zc - 2, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([BAR_DX - 3.7, FACE + 1.8, zc]), at([BAR_DX + 2.4, FACE + 1.8, zc])], { size: 0.36 }));
  }
  const zLow = ROWS[1].z0 + 4;
  const zHigh = CATCH_Z - 1.4;
  out.push(S(k.slabOf({ x: BAR_DX - 1, y: FACE + 1.8, w: 2, d: 1.6, r: 0.6 }, zLow, zHigh - zLow, P, 3, 0.3), { tone: "mid" }));
  return def("srr-bar", out.join(""));
}

function drawers() {
  drawerDefs();
  const bar = barDef();
  const items = [];
  ROWS.forEach((row, ri) =>
    CHAINS.forEach((_, c) => {
      const centre = [columnX(c) + OW / 2, FRONT, row.z0 + OH / 2];
      const at0 = "translate(0 0)";
      const tint = row.poisoned ? place("srr-dtint", at0, ` class="sr-tint" data-tint="${c}"`) : "";
      const content = place("srr-dbox", at0) + tint + place("srr-dwell", at0) + place("srr-dfront", at0);
      const svg = `<g transform="${shift([columnX(c), 0, row.z0])}" clip-path="url(#srr-dclip)"><g class="sr-drawer" data-batch="${row.batch}" data-col="${c}">${content}</g></g>`;
      items.push({ key: k.depthOf(centre, P), svg, c, ri });
    }),
  );
  items.sort((a, b) => a.key - b.key);
  // Each bar goes right after the top drawer of its column, so it paints over both drawers it gangs.
  return items.map((item) => item.svg + (item.ri === 0 ? `<g class="sr-drawer" data-batch="s1" data-col="${item.c}">${place(bar, shift([columnX(item.c), 0, 0]))}</g>` : "")).join("");
}

const LABEL =
  "A card-catalogue cabinet on a bench: eight columns of drawers, one per task chain, three persisted memory records each. A red lamp above each column marks the flagged file read, and a bar gangs the two drawers the S1 writer filled from it; the top one holds the poisoned note. Drawers slide out when revoked and back when replayed, a key on the lid strokes once per replayed LLM call, a pair of lamps per column shows whether the attack is gone and the remembered fact kept, and a dial counts extra LLM calls after detection.";

export function svgOf({ flat: inline = false } = {}) {
  DEFS = new Map();
  FLAT = inline;
  lampDefs();
  const body = [bench(), cabinet(), lid(), drawers()];
  const defs = FLAT
    ? `<defs>${["srr-opclip", "srr-dclip", "srr-wellclip"].map((id) => `<clipPath id="${id}">${DEFS.get(id)}</clipPath>`).join("")}</defs>`
    : `<defs>${[...DEFS].map(([id, svg]) => (id.endsWith("clip") ? `<clipPath id="${id}">${svg}</clipPath>` : `<g id="${id}">${svg}</g>`)).join("")}</defs>`;
  return k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [defs, ...body] });
}

// Screen vectors of the drawer travel and the key stroke, for the live code.
const vec = (v) => k.axisVector(P, v).map((n) => Math.round(n * 1000) / 1000);
export const PULL_VECTOR = vec([0, PULL, 0]);
export const KEY_VECTOR = vec([0, 0, -KEY.travel]);

export const CAPTION =
  "The paper builds a provenance-tracked agent runtime that, given a suspicious root after compromise, revokes the persisted records descended from it and replays only the dirty memory writes, falling back to rollback when replay would be unsound. On retrieval memory in 8 task chains, selective replay brings residual attack success to 0 in every chain and keeps the remembered fact in 6 of 8, as rollback does, for 9 extra LLM calls after detection instead of 17, while revoke-only, root delete and full reset lose the fact. Here each column is one chain and each drawer one persisted record, and the key strokes once per replayed call. In a live check with qwen2.5:14b on two chains, residual attack success stayed at 1.0 in all six unrecovered reruns and fell to 0.0 in all six selective-replay reruns, with S3 correctness and S4 retention at 1.0.";

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function render({ flat: inline = false } = {}) {
  const method = METHODS[0];
  const svg = svgOf({ flat: inline });
  const stage = `<div class="iso-stage sr-stage" tabindex="0" role="slider" aria-valuemin="1" aria-valuemax="${METHODS.length}" aria-valuenow="1" aria-valuetext="${method.name}" aria-label="Recovery method for a card catalogue of persisted agent memory. Left and right arrows turn the method knob, space runs the recovery again, Escape returns to the compromised state." data-pull="${PULL_VECTOR.join(" ")}" data-key="${KEY_VECTOR.join(" ")}">${svg}</div><span class="sr-sr" role="status" aria-live="polite" data-status></span>`;
  const [l1, l2] = readoutAt(method, 0);
  let html = k.plateHtml({
    fig: "Fig 3",
    title: "Card catalogue",
    hint: "Turn the knob · click to rerun",
    readout: "",
    keys: [
      { mark: "red", label: "Root lamp: the flagged S1 file read, low once its descendants are out" },
      { mark: "flat", label: "Grey stack: the poisoned note the S1 writer persisted" },
      { mark: "raised", label: "S1 bar: gangs the two records that list that read as a parent" },
      { mark: "green", label: "Lid lamps per chain: green = attack gone (S3) / fact kept (S4), red = not" },
      { mark: "lit", label: "Dial: extra LLM calls after detection; the key strokes once per replayed call" },
    ],
    caption: CAPTION,
    body: stage,
  });
  html = html.replace(" data-readout></span>", ` data-readout><span class="sr-l1">${escape(l1)}</span><span class="sr-l2">${escape(l2)}</span></span>`);
  return { html };
}
