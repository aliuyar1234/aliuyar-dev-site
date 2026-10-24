// Fig 11 · every part of the spectrophotometer as a drawn item with its recorded shapes.
// Pure ESM: shapes are plain descriptors here, and build.mjs turns them into audit shapes.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import {
  P, BENCH, BENCH_H, FOOT_H, YB, ZB, LAMP, LAMP_TOP, MONO, MONO_TOP, COMP, COMP_FLOOR, RIM, WALL, HOOD, DECK, DET, PORT, BOX, BOX_TOP,
  TRAY, TRAY_TOP, LABEL, RULER, T, KNOB, SCALE, SWITCH,
} from "./world.mjs";
import DATA from "./data.mjs";
import { S as Sx, turretFrame, knobPointer, PLUNGER_U, inBeam, square as squareRing, discRing, armRing } from "./moving.mjs";

const at = (p) => k.iso(p, P);
const Gd = (s0, s1, r, F, steps = Math.max(12, Math.min(40, Math.round(r * 2.6)))) => G.disc(s0, s1, r, F, P, { steps });
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (points, o) => k.dotsSvg(points, o);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const FX = (x0 = 0) => G.frameOf([x0, YB, ZB], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
const plane = (y) => k.sideMatrix([0, y], 0, P, "left");
const flatRect = (x0, z0, x1, z1, r, steps = 2) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const sideX = (x) => (points) => k.pathOf(points.map(([y, z]) => at([x, y, z])), true);

// shape descriptors, turned into audit shapes by build.mjs (meta.cut may hold descriptors too)
const slab = (plan, z, h, meta, steps) => Object.assign(["slab", plan, z, h, steps], { meta });
const cyl = (cx, cy, r, z, h, meta) => Object.assign(["cyl", cx, cy, r, z, h], { meta });
const disc = (F, s0, s1, r, meta) => Object.assign(["disc", F, s0, s1, r], { meta });
const ring = (F, s0, s1, rIn, rOut, meta) => Object.assign(["ring", F, s0, s1, rIn, rOut], { meta });
const solid = (F, profile, meta) => Object.assign(["solid", F, profile], { meta });
const ext = (points, z, h, meta) => Object.assign(["ext", points, z, h], { meta });
const ball = (o, r, meta) => Object.assign(["ball", o, r], { meta });

// the beam: two legs along x at (YB, ZB). Light, not a part: recorded as a hairline so the order is measured.
export const BEAM = { lens: -2, in: T.x - T.cuvette, out: T.x + T.cuvette, port: PORT.x0 };
const beamLine = (x0, x1) => k.segment([x0, YB, ZB], [x1, YB, ZB], P);
const beamShape = (x0, x1) => disc(FX(), x0, x1, 0.3, { beam: true });

// a recess in a vertical face at y (facing +y): inner walls by facing, the back plane, outlines; after desk-computer.
// `back` is drawn on the back plane, `inside` in the cavity after its walls; both are clipped by the opening.
let clips = 0;
function recess({ x0, x1, z0, z1, r, depth }, y, backClass, { back = "", inside = "" } = {}) {
  const id = `bs-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 2);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[G.toneOf([nx, 0, nz], P)].push(quad);
  });
  const shape = flatRect(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${plane(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<g transform="${plane(y - depth)}"><path class="${backClass}" d="${shape}"/><path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    back,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
    inside,
    `</g>`,
    `<g transform="${plane(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

// a pit in a top face at zTop: floor, the two inner walls that face the viewer, outlines; `floorLines` lie on its floor
function pit(plan, zTop, depth, floorLines = "") {
  const id = `bs-clip-${clips++}`;
  const ring = k.roundedPlan(plan, 3);
  const top = k.onTop(ring, zTop, P, true);
  const floor = k.onTop(ring, zTop - depth, P, true);
  const { x, y, w, d } = plan;
  const wallX = k.pathOf([at([x, y, zTop]), at([x, y + d, zTop]), at([x, y + d, zTop - depth]), at([x, y, zTop - depth])], true);
  const wallY = k.pathOf([at([x, y, zTop]), at([x + w, y, zTop]), at([x + w, y, zTop - depth]), at([x, y, zTop - depth])], true);
  return [
    `<clipPath id="${id}"><path d="${top}"/></clipPath>`,
    `<g clip-path="url(#${id})"><path class="bs-floor" d="${floor}"/>`,
    floorLines,
    `<path class="iso-shade" data-shade="${G.toneOf([1, 0, 0], P)}" d="${wallX}"/><path class="iso-shade" data-shade="${G.toneOf([0, 1, 0], P)}" d="${wallY}"/>`,
    L(floor, { tone: "faint" }),
    `</g>`,
    L(top, { tone: "lo" }),
  ].join("");
}

// is a point on the detector flange face hidden behind the can body?
function behindCan(p) {
  const V = G.viewOf(P);
  for (let t = 0.5; t < 60; t += 0.5) {
    const x = p[0] + V[0] * t;
    const y = p[1] + V[1] * t - YB;
    const z = p[2] + V[2] * t - ZB;
    if (x > DET.x0 + 2.5 && x < DET.x0 + DET.body && y * y + z * z < (DET.r + 0.05) ** 2) return true;
  }
  return false;
}

export function build({ theta = 0, rho = 0, filter = 0, mask = 0 } = {}) {
  const items = [];
  const put = (name, svg, shapes, extra = {}) => items.push({ name, svg, shapes, ...extra });

  // ============ bench: heavy plate on four feet, groove, corner screws
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    // the far foot is hidden by the plate at this camera: recorded, not drawn
    for (const [index, [x, y]] of byDepth(k.corners(BENCH, 22)).entries()) {
      // only the sides show below the plate's overhang, so the tops are left out
      const sides = (p) => ({ ...p, top: "", crease: "" });
      if (index) feet.push(S(sides(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 14)), { tone: "lo" }), S(sides(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 12)), { tone: "mid" }));
      shapes.push(cyl(x, y, 7, -BENCH_H - FOOT_H, 1.6), cyl(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6));
    }
    const screws = k.corners(BENCH, 10);
    const svg =
      halo + feet.join("") + S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 4, 1.6), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(BENCH, 5), 0, P, 4), { tone: "lo" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 12)).join(""), { tone: "lo" }) + D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
    put("stand.bench", svg, [slab(BENCH, -BENCH_H, BENCH_H, {}, 4), ...shapes]);
  }

  // ============ maker's plate: AU-11 and three rule lines; ruler strip along the front
  {
    const pz = 0.8;
    const rules = [[6.9, 28], [8.9, 22], [10.7, 15]].map(([dy, w]) => k.lineOnTop([LABEL.x + 12, LABEL.y + dy], [LABEL.x + 12 + w, LABEL.y + dy], pz, P));
    const svg =
      S(k.slabOf(LABEL, 0, pz, P, 4), { tone: "mid" }) + L(k.planOutline(k.insetPlan(LABEL, 1.4), pz, P, 4), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([LABEL.x + 12, LABEL.y + 4.9], pz, P, "x"), "AU-11", { size: 3.4, tone: "mid" }) +
      L(rules.join(""), { tone: "lo", free: true }) + D([at([LABEL.x + 3.4, LABEL.y + 3.4, pz]), at([LABEL.x + 3.4, LABEL.y + LABEL.d - 3.4, pz])], { size: 0.45 });
    put("stand.label", svg, [slab(LABEL, 0, pz, {}, 4)]);
    const t = k.topTicks(RULER.x + 2, RULER.x + RULER.w - 2, 2, 5, RULER.y + 0.01, 0.6, [1.6, 3], P);
    const ruler = S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) +
      D([at([RULER.x + 1, RULER.y + 3.8, 0.6]), at([RULER.x + RULER.w - 1, RULER.y + 3.8, 0.6])], { size: 0.35 });
    put("stand.ruler", ruler, [slab(RULER, 0, 0.6, {}, 3)]);
  }

  // ============ lamp housing: plinth, case with lid seam, vents, lamp socket cap, chimney
  {
    const plinth = k.insetPlan(LAMP, -1.5);
    const front = LAMP.y + LAMP.d;
    const side = LAMP.x + LAMP.w;
    const vents = [];
    // the cap seam runs at the monochromator's height; front vents below it, side vents above it (clear of the monochromator)
    const seam = MONO_TOP;
    for (let i = 0; i < 7; i++) vents.push(flatRect(LAMP.x + 5.3 + i * 4.6, seam - 13, LAMP.x + 7.1 + i * 4.6, seam - 2, 0.9));
    const sideVents = [];
    for (let i = 0; i < 7; i++) sideVents.push(sideX(side)(k.roundedPlan({ x: LAMP.y + 5.3 + i * 4.6, y: seam + 2, w: 1.8, d: LAMP_TOP - seam - 4, r: 0.9 }, 2)));
    const cx = LAMP.x + LAMP.w / 2;
    const cy = LAMP.y + LAMP.d / 2;
    const F = FY(cx, 22);
    const sock = Gd(front, front + 1.2, 8, F);
    const cap = Gd(front + 1.2, front + 3.6, 6, F);
    const ribs = G.ribsOf(F, front + 1.2, front + 3.6, 6, 18, P, { fade: [0.1, 0.55], seams: true });
    const screws = [[LAMP.x + 3.5, 6.5], [side - 3.5, 6.5], [LAMP.x + 3.5, LAMP_TOP - 3.5], [side - 3.5, LAMP_TOP - 3.5]].map(([x, z]) => at([x, front, z]));
    const svg =
      S(k.slabOf(plinth, 0, 3, P, 4), { tone: "lo" }) +
      S(k.slabOf(LAMP, 3, LAMP_TOP - 3, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(LAMP, seam, P, 4), { tone: "faint" }) }) +
      `<g transform="${plane(front)}">${L(vents.join(""), { tone: "lo" })}</g>` + L(sideVents.join(""), { tone: "lo" }) +
      D(screws, { size: 0.45 }) + D(k.corners(LAMP, 3.5).map(([x, y]) => at([x, y, LAMP_TOP])), { size: 0.45 }) +
      S(sock, { tone: "lo" }) + S(cap, { tone: "mid" }) + k.fadedSvg(ribs, { tone: "lo" }) + D([at([cx, front + 3.6, 22])], { size: 0.6 });
    put("lamp.case", svg, [slab(plinth, 0, 3, {}, 4), slab(LAMP, 3, LAMP_TOP - 3, {}, 4), disc(F, front, front + 1.2, 8), disc(F, front + 1.2, front + 3.6, 6)]);
    const chim =
      S(k.cylinder(cx, cy, 6, LAMP_TOP, 3, P, 18), { tone: "lo" }) +
      S(k.cylinder(cx, cy, 9.5, LAMP_TOP + 3, 5, P, 24), { tone: "mid", inner: L(k.sideArc(cx, cy, 9.5, LAMP_TOP + 4.7, P, 24) + k.sideArc(cx, cy, 9.5, LAMP_TOP + 6.3, P, 24), { tone: "faint" }) }) +
      S(k.cylinder(cx, cy, 10.5, LAMP_TOP + 8, 1.6, P, 26, 0.5), { tone: "mid" }) + D([at([cx, cy, LAMP_TOP + 9.6])], { size: 0.55 });
    put("lamp.chimney", chim, [cyl(cx, cy, 6, LAMP_TOP, 3), cyl(cx, cy, 9.5, LAMP_TOP + 3, 5), cyl(cx, cy, 10.5, LAMP_TOP + 8, 1.6)]);
  }

  // ============ monochromator: case, grating access plate, exit port and lens tube
  {
    const plinth = k.insetPlan(MONO, -1.5);
    const front = MONO.y + MONO.d;
    const side = MONO.x + MONO.w;
    const plate = { x: MONO.x + 12, y: front, w: 30, d: 1.2, r: 0.6 };
    const pf = front + 1.2;
    const plateScrews = [[plate.x + 2.4, 12.4], [plate.x + plate.w - 2.4, 12.4], [plate.x + 2.4, 31.6], [plate.x + plate.w - 2.4, 31.6]].map(([x, z]) => at([x, pf, z]));
    const svg =
      S(k.slabOf(plinth, 0, 3, P, 4), { tone: "lo" }) +
      S(k.slabOf(MONO, 3, MONO_TOP - 3, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(MONO, MONO_TOP - 6, P, 4), { tone: "faint" }) }) +
      D(k.corners(MONO, 3.5).map(([x, y]) => at([x, y, MONO_TOP])), { size: 0.45 }) +
      S(k.slabOf(plate, 10, 24, P, 2), { tone: "mid", crease: "lo" }) +
      `<g transform="${plane(pf)}">${L(flatRect(plate.x + 5, 15, plate.x + plate.w - 5, 29, 1.2), { tone: "faint" })}</g>` + D(plateScrews, { size: 0.45 });
    put("mono.case", svg, [slab(plinth, 0, 3, {}, 4), slab(MONO, 3, MONO_TOP - 3, {}, 4), slab(plate, 10, 24, {}, 2)]);
    const F = FX();
    const flange = Gd(side, side + 1.4, 5.5, F);
    const tube = Gd(side + 1.4, -4, 3, F);
    const collar = Gd(-4, BEAM.lens, 4, F);
    const port =
      S(flange, { tone: "lo" }) + D(G.dotsOf(F, side + 1.4, 4.4, 6, P, { all: true, phase: 0.5 }), { size: 0.4 }) + S(tube, { tone: "mid" }) +
      S(collar, { tone: "mid", inner: L(G.circleOf(F, BEAM.lens, 2.4, P), { tone: "lo" }) }) + `<path class="bs-lens" d="${G.circleOf(F, BEAM.lens, 2.4, P)}"/>`;
    put("mono.port", port, [disc(F, side, side + 1.4, 5.5), disc(F, side + 1.4, -4, 3), disc(F, -4, BEAM.lens, 4)]);
  }

  // ============ monochromator top: wavelength drum (the read-point selector), its ruled scale and index, slit screw
  {
    const { x, y } = KNOB;
    const ticks = [];
    const major = [];
    for (let a = KNOB.angles[0]; a <= KNOB.angles[2] + 1e-9; a += 10) {
      const big = KNOB.angles.includes(a);
      const t = ((a + 90) * Math.PI) / 180;
      const r0 = big ? 7.6 : 8.6;
      (big ? major : ticks).push(k.lineOnTop([x + r0 * Math.cos(t), y + r0 * Math.sin(t)], [x + 10 * Math.cos(t), y + 10 * Math.sin(t)], MONO_TOP + 2, P));
    }
    const drum =
      S(k.cylinder(x, y, 10, MONO_TOP, 2, P, 30, 0.5), { tone: "lo" }) + L(ticks.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) +
      S(k.cylinder(x, y, 6.5, MONO_TOP + 2, 5.6, P, 30), { tone: "mid", inner: L(k.knurl(x, y, 6.5, MONO_TOP + 2, MONO_TOP + 7.6, 30, P), { tone: "lo" }) }) +
      L(k.ring(x, y, 1.4, MONO_TOP + 7.6, P, 16), { tone: "lo" }) + `<path class="iso-line" data-tone="hi" data-part="knob-pointer" data-free="end" d="${knobPointer(rho)}"/>`;
    put("mono.drum", drum, [cyl(x, y, 10, MONO_TOP, 2), cyl(x, y, 6.5, MONO_TOP + 2, 5.6)]);
    // the ruled strip: ticks grow from its back edge, two screws hold it
    const t = k.topTicks(SCALE.x + 1.5, SCALE.x + SCALE.w - 1.5, 1.5, 6, SCALE.y + 0.01, MONO_TOP + 0.6, [1.4, 2.8], P);
    const scale = S(k.slabOf(SCALE, MONO_TOP, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) +
      D([at([SCALE.x + 0.9, SCALE.y + 2.5, MONO_TOP + 0.6]), at([SCALE.x + SCALE.w - 0.9, SCALE.y + 2.5, MONO_TOP + 0.6])], { size: 0.35 });
    put("mono.scale", scale, [slab(SCALE, MONO_TOP, 0.6, {}, 3)]);
    const s0 = SCALE.stops[0];
    const idx = { x: s0 - 1.6, y: SCALE.y - 1.4, w: 3.2, d: SCALE.d + 2.8, r: 0.6 };
    const index = S(k.slabOf(idx, MONO_TOP + 0.6, 1.4, P, 2, 0.3), { tone: "mid" }) + L(k.lineOnTop([s0, idx.y], [s0, idx.y + idx.d], MONO_TOP + 2, P), { tone: "hi" });
    put("mono.index", index, [slab(idx, MONO_TOP + 0.6, 1.4, {}, 2)], { part: "index" });
    const [tx, ty] = [MONO.x + 10, MONO.y + 9];
    const thumb = S(k.cylinder(tx, ty, 2, MONO_TOP, 2, P, 16), { tone: "lo" }) +
      S(k.cylinder(tx, ty, 3.4, MONO_TOP + 2, 3.4, P, 24), { tone: "mid", inner: L(k.knurl(tx, ty, 3.4, MONO_TOP + 2, MONO_TOP + 5.4, 22, P), { tone: "lo" }) }) +
      D([at([tx, ty, MONO_TOP + 5.4])], { size: 0.45 });
    put("mono.thumb", thumb, [cyl(tx, ty, 2, MONO_TOP, 2), cyl(tx, ty, 3.4, MONO_TOP + 2, 3.4)]);
  }

  // ============ sample compartment: floor plate, rim walls, open lid with hinges and latch tongue
  const own = { owner: "comp" };
  {
    put("comp.floor", S(k.slabOf(COMP, 0, COMP_FLOOR, P, 4, 0.6), { tone: "lo" }), [slab(COMP, 0, COMP_FLOOR, own, 4)]);
    const deckSide = DECK.x + DECK.w;
    const deck =
      S(k.slabOf(DECK, 0, RIM, P, 4, 0.6), { tone: "lo", inner: L(k.sideSeam(DECK, 3, P, 4), { tone: "faint" }) }) +
      D([DECK.y + 6, DECK.y + DECK.d - 6].map((y) => at([deckSide, y, 6.5])), { size: 0.45 });
    put("comp.deck", deck, [slab(DECK, 0, RIM, own, 4)]);
    const back = { x: COMP.x, y: COMP.y, w: COMP.w, d: WALL, r: 0.6 };
    const left = { x: COMP.x, y: COMP.y + WALL, w: WALL, d: COMP.d - WALL * 2, r: 0.6 };
    put("comp.wall-back", S(k.slabOf(back, COMP_FLOOR, RIM - COMP_FLOOR, P, 2, 0.4), { tone: "mid" }), [slab(back, COMP_FLOOR, RIM - COMP_FLOOR, own, 2)]);
    put("comp.wall-left", S(k.slabOf(left, COMP_FLOOR, RIM - COMP_FLOOR, P, 2, 0.4), { tone: "mid" }), [slab(left, COMP_FLOOR, RIM - COMP_FLOOR, own, 2)]);
    // the lid, open: its inside faces the reader. A gasket channel runs round its rim; its inner skin, where a
    // liner or a hold-down spring would sit, is out of sight at this camera, so it is left plain.
    const hood = { x: HOOD.x, y: HOOD.y, w: HOOD.w, d: HOOD.d, r: 2 };
    const face = HOOD.y + HOOD.d;
    const open = { x0: HOOD.x + 2.5, x1: HOOD.x + HOOD.w - 2.5, z0: HOOD.z0 + 2.5, z1: HOOD.z1 - 2.5, r: 1.5, depth: HOOD.d - 2.5 };
    const svg =
      S(k.slabOf(hood, HOOD.z0, HOOD.z1 - HOOD.z0, P, 4, 0.8), { tone: "mid" }) + recess(open, face, "bs-cavity") +
      `<g transform="${plane(face)}">${L(flatRect(HOOD.x + 0.8, HOOD.z0 + 0.8, HOOD.x + HOOD.w - 0.8, HOOD.z1 - 0.8, 1.9) + flatRect(HOOD.x + 1.7, HOOD.z0 + 1.7, HOOD.x + HOOD.w - 1.7, HOOD.z1 - 1.7, 1.7), { tone: "faint" })}</g>` +
      D([[HOOD.x + 4, HOOD.y + 4], [HOOD.x + HOOD.w - 4, HOOD.y + 4], [HOOD.x + 4, face - 4], [HOOD.x + HOOD.w - 4, face - 4]].map(([x, y]) => at([x, y, HOOD.z1])), { size: 0.45 });
    const tongue = { x: T.x - 5, y: face, w: 10, d: 3, r: 0.6 };
    const tongueSvg = S(k.slabOf(tongue, HOOD.z1 - 4.6, 3, P, 2, 0.3), { tone: "mid" }) + D([at([T.x, face + 1.5, HOOD.z1 - 1.6])], { size: 0.45 });
    // the closed lid's front face is the open lid's top: its pull handle; on the side, a screwed cover plate
    const side = HOOD.x + HOOD.w;
    const plate = { x: HOOD.y + 5, y: HOOD.z0 + 25, w: HOOD.d - 10, d: HOOD.z1 - HOOD.z0 - 29, r: 1.6 };
    const hy = HOOD.y + HOOD.d / 2;
    const posts = [HOOD.x + 14, HOOD.x + 42];
    const Fb = G.frameOf([0, hy, HOOD.z1 + 4.2], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const handle =
      L(sideX(side)(k.roundedPlan(plate, 3)), { tone: "lo" }) + L(sideX(side)(k.roundedPlan(k.insetPlan(plate, 1.2), 3)), { tone: "faint" }) +
      D(k.corners(plate, 2.2).map(([y, z]) => at([side, y, z])), { size: 0.45 }) +
      posts.map((x) => S(k.cylinder(x, hy, 1.2, HOOD.z1, 2.8, P, 14), { tone: "mid" })).join("") +
      S(Gd(HOOD.x + 11, HOOD.x + 45, 1.6, Fb), { tone: "mid" });
    put("comp.lid", svg + tongueSvg + handle, [
      slab(hood, HOOD.z0, HOOD.z1 - HOOD.z0, own, 4), slab(tongue, HOOD.z1 - 4.6, 3, own, 2),
      ...posts.map((x) => cyl(x, hy, 1.2, HOOD.z1, 2.8, own)), disc(Fb, HOOD.x + 11, HOOD.x + 45, 1.6, own),
    ]);
    const knuckles = [];
    const shapes = [];
    const rk = 1.8;
    const Fh = G.frameOf([0, COMP.y + rk, RIM + rk], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    for (const x0 of [HOOD.x + 6, HOOD.x + HOOD.w - 15]) {
      const leaf = { x: x0 + 0.5, y: face, w: 8, d: 0.6, r: 0.3 };
      knuckles.push(S(k.slabOf(leaf, RIM + rk, 4.6, P, 2, 0.2), { tone: "mid" }) + D([at([x0 + 2.2, face + 0.6, RIM + 5.2]), at([x0 + 6.8, face + 0.6, RIM + 5.2])], { size: 0.4 }));
      shapes.push(slab(leaf, RIM + rk, 4.6, own, 2));
      // three knuckles on one pin: one turning with the two joints drawn on it
      knuckles.push(S(Gd(x0, x0 + 9, rk, Fh), { tone: "mid", inner: L(G.arcOf(Fh, x0 + 3, rk, P, { least: 0, trim: 0 }) + G.arcOf(Fh, x0 + 6, rk, P, { least: 0, trim: 0 }), { tone: "lo" }) }));
      shapes.push(disc(Fh, x0, x0 + 9, rk, own));
    }
    put("comp.hinges", knuckles.join(""), shapes);
  }

  // ============ turret hub: bearing flange and spindle under the disc
  {
    // the bearing flange and spindle sit wholly under the disc at this camera: recorded, not drawn
    put("turret.hub", "", [cyl(T.x, T.y, 9, COMP_FLOOR, 2, own), cyl(T.x, T.y, 5, COMP_FLOOR + 2, T.z0 - COMP_FLOOR - 2, own)]);
  }

  // ============ the turret: disc, four cell stacks, the hub stack with the mask spider, the plunger, the first beam leg
  const turret = turretItems(theta, mask);
  put("turret", turret.svg, turret.shapes, { group: turret.stacks });

  // ============ the second beam leg: out of the cuvette's far face into the detector entrance (shown only at a detent)
  {
    const lit = inBeam(theta) >= 0 && Math.abs(theta - Math.round(theta / 90) * 90) < 1e-6;
    const svg = `<g data-beam="out"${lit ? ' data-on=""' : ""}>${L(beamLine(BEAM.out, BEAM.port), { tone: "hi", className: "bs-beam" })}${D([at([BEAM.out, YB, ZB])], { size: 0.55, tone: "hi" })}</g>`;
    put("beam", svg, lit ? [beamShape(BEAM.out, BEAM.port)] : []);
  }

  // ============ front and right rim walls, the latch catch and the drain spout
  {
    const front = { x: COMP.x, y: COMP.y + COMP.d - WALL, w: COMP.w, d: WALL, r: 0.6 };
    const right = { x: COMP.x + COMP.w - WALL, y: COMP.y + WALL, w: WALL, d: COMP.d - WALL * 2, r: 0.6 };
    put("comp.wall-right", S(k.slabOf(right, COMP_FLOOR, RIM - COMP_FLOOR, P, 2, 0.4), { tone: "mid" }), [slab(right, COMP_FLOOR, RIM - COMP_FLOOR, own, 2)]);
    const fy = COMP.y + COMP.d;
    const catchPlan = { x: T.x - 4, y: fy, w: 8, d: 1.6, r: 0.5 };
    const F = FY(40, 7);
    const spout = Gd(fy, fy + 5.5, 1.4, F);
    const lip = Gd(fy + 5.5, fy + 6.5, 1.9, F);
    const svg =
      S(k.slabOf(front, COMP_FLOOR, RIM - COMP_FLOOR, P, 2, 0.4), { tone: "mid" }) +
      S(k.slabOf(catchPlan, 5, 4, P, 2, 0.3), { tone: "mid" }) + D([at([T.x, fy + 1.6, 7])], { size: 0.45 }) +
      S(spout, { tone: "mid" }) + S(lip, { tone: "mid" }) + `<path class="bs-bore" d="${G.circleOf(F, fy + 6.5, 1.1, P)}"/>`;
    put("comp.wall-front", svg, [slab(front, COMP_FLOOR, RIM - COMP_FLOOR, own, 2), slab(catchPlan, 5, 4, own, 2), disc(F, fy, fy + 5.5, 1.4, own), disc(F, fy + 5.5, fy + 6.5, 1.9, own)]);
  }

  // ============ detector: entrance tube, the photodetector can, two clamp bands on saddle posts, conduit
  {
    const F = FX();
    const svg = S(Gd(PORT.x0, PORT.x0 + 2, 4, F), { tone: "mid" }) + S(Gd(PORT.x0 + 2, DET.x0 - 1.5, 3, F), { tone: "mid" }) + S(Gd(DET.x0 - 1.5, DET.x0, 5.2, F), { tone: "lo" });
    put("det.port", svg, [disc(F, PORT.x0, PORT.x0 + 2, 4), disc(F, PORT.x0 + 2, DET.x0 - 1.5, 3), disc(F, DET.x0 - 1.5, DET.x0, 5.2)]);
    const Fc = FX(DET.x0);
    const { r, flange: rf, body: sb, len } = DET;
    const profile = [[0, rf], [2.5, rf], [2.5, r], [sb, r], [sb, r + 0.7], [sb + 2, r + 0.7], [sb + 2, r - 0.3], [len, r - 2]];
    // drawn as turnings far to near, so each step in the profile keeps its own silhouette
    const seams = G.arcOf(Fc, 15.5, r, P, { least: 0, trim: 0 }) + G.arcOf(Fc, 20.5, r, P, { least: 0, trim: 0 });
    const bolts = G.dotsOf(Fc, 2.5, (r + rf) / 2, 10, P, { all: true, phase: 0.31 }).filter((_, i) => {
      const t = 0.31 + (i / 10) * Math.PI * 2;
      return !behindCan(G.pointOf(Fc, 2.5, (r + rf) / 2, t));
    });
    // the bands wrap the can, so the can is drawn in three lengths with the bands between (near to far is +s here)
    const [b0, b1] = DET.bands.map((c) => [c - DET.band, c + DET.band]);
    const endProfile = [[b1[1], r], ...profile.slice(3)];
    put(
      "det.can",
      S(Gd(0, 2.5, rf, Fc, 18), { tone: "mid" }) + D(bolts, { size: 0.45 }) + S(Gd(2.5, b0[0], r, Fc, 16), { tone: "mid" }),
      [solid(Fc, [[0, rf], [2.5, rf], [2.5, r], [b0[0], r]])],
    );
    put("det.can-mid", S(Gd(b0[1], b1[0], r, Fc, 16), { tone: "mid", inner: L(seams, { tone: "faint" }) }), [disc(Fc, b0[1], b1[0], r)]);
    put(
      "det.can-end",
      S(Gd(b1[1], sb, r, Fc, 16), { tone: "mid" }) + S(Gd(sb, sb + 2, r + 0.7, Fc, 16), { tone: "mid" }) + S(G.solidOf(profile.slice(6), Fc, P, { steps: 16 }), { tone: "mid" }) +
        S(Gd(len, len + 2, 2.8, Fc), { tone: "mid" }) + D([at([DET.x0 + len + 2, YB, ZB])], { size: 0.6 }),
      [solid(Fc, endProfile), disc(Fc, len, len + 2, 2.8)],
    );
    // clamp bands round the can, each with its pinch lug on top, seated on a turned post that is saddle-cut to the band
    DET.bands.forEach((s, i) => {
      const x = DET.x0 + s;
      const rb = r + 0.8;
      const band = ring(Fc, s - DET.band, s + DET.band, r, rb, { owner: "det" });
      const lug = { x: x - 1.6, y: YB - 1.3, w: 3.2, d: 2.6, r: 0.4 };
      const lz = ZB + rb - 0.25;
      const bandSvg =
        S(G.ringBand(s - DET.band, s + DET.band, r, rb, Fc, P, { steps: 16 }), { tone: "mid" }) +
        S(k.slabOf(lug, lz, 1.8, P, 2, 0.2), { tone: "mid" }) + D([at([x, YB, lz + 1.8])], { size: 0.4 });
      // the length of can inside the band is recorded with it, so the can reads as one body through its clamps
      put(`det.band${i}`, bandSvg, [band, disc(Fc, s - DET.band, s + DET.band, r, { owner: "det" }), slab(lug, lz, 1.8, { owner: "det" }, 2)]);
      const Fp = G.frameOf([x, YB, ZB], [0, 0, -1], [0, 1, 0], [1, 0, 0]);
      const a = DET.post;
      const foot = 1.6;
      const low = Math.sqrt(rb * rb - a * a);
      const postSvg =
        S(k.cylinder(x, YB, 4.4, 0, foot, P, 20, 0.3), { tone: "lo" }) + D([at([x + 3.5, YB, foot]), at([x - 3.5, YB, foot])], { size: 0.4 }) +
        S(G.saddleOf(Fp, a, rb, ZB - foot, P, { steps: 16 }), { tone: "mid" });
      put(`det.post${i}`, postSvg, [cyl(x, YB, 4.4, 0, foot), disc(Fp, low - 0.05, ZB - foot, a, { seated: true, cut: [`det.band${i}`] })]);
    });
    const Fy = FY(88, ZB);
    const start = YB - Math.sqrt(r * r - 1.8 * 1.8);
    const face = BOX.y + BOX.d;
    put("det.conduit", S(Gd(face, face + 1.5, 2.8, Fy), { tone: "lo" }) + S(Gd(face + 1.5, start, 1.8, Fy), { tone: "mid" }), [disc(Fy, face, face + 1.5, 2.8), disc(Fy, face + 1.5, start, 1.8, { seated: true })]);
  }

  // ============ detector electronics box: the two target lamps, the subset switch and its detents, vents
  {
    const front = BOX.y + BOX.d;
    const side = BOX.x + BOX.w;
    const lamps = [];
    const lshapes = [];
    // the lamp for the target of the cell in the beam is on in the markup too, so the page reads before any script runs
    const cell = inBeam(theta);
    const on = cell < 0 ? "" : DATA.cells[cell].suff ? "green" : "red";
    [["green", BOX.x + 9], ["red", BOX.x + 18]].forEach(([id, x]) => {
      const F = FY(x, BOX_TOP - 7);
      lamps.push(S(Gd(front, front + 1, 3.1, F), { tone: "lo" }) + `<g data-lamp="${id}"${on === id ? ` data-on="${id}"` : ""}>${S(Gd(front + 1, front + 1.8, 2.2, F), { tone: "mid", crease: "none" })}</g>`);
      lshapes.push(disc(F, front, front + 1, 3.1), disc(F, front + 1, front + 1.8, 2.2));
    });
    const vents = [];
    for (let i = 0; i < 7; i++) vents.push(sideX(side)(k.roundedPlan({ x: BOX.y + 3.5 + i * 2.6, y: 22, w: 1.3, d: 14, r: 0.65 }, 2)));
    const slot = { x: SWITCH.stops[0] - 2, y: SWITCH.y - 1, w: SWITCH.stops[2] - SWITCH.stops[0] + 4, d: 2, r: 1 };
    const strip = { x: slot.x - 1, y: SWITCH.y + 3.6, w: slot.w + 2, d: 3, r: 0.5 };
    const ticks = SWITCH.stops.map((x) => k.lineOnTop([x, strip.y + 0.01], [x, strip.y + 2.2], BOX_TOP + 0.5, P)).join("");
    const minor = [0, 1].map((i) => (SWITCH.stops[i] + SWITCH.stops[i + 1]) / 2).map((x) => k.lineOnTop([x, strip.y + 0.01], [x, strip.y + 1.2], BOX_TOP + 0.5, P)).join("");
    const svg =
      S(k.slabOf(BOX, 0, BOX_TOP, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BOX, BOX_TOP - 4, P, 4), { tone: "faint" }) }) +
      L(vents.join(""), { tone: "lo" }) + lamps.join("") +
      D(k.corners(BOX, 2.6).map(([x, y]) => at([x, y, BOX_TOP])), { size: 0.45 }) +
      `<path class="bs-bore" d="${k.planOutline(slot, BOX_TOP, P, 3)}"/>` + L(k.planOutline(slot, BOX_TOP, P, 3), { tone: "lo" }) +
      S(k.slabOf(strip, BOX_TOP, 0.5, P, 2), { tone: "lo", crease: "none" }) + L(minor, { tone: "lo" }) + L(ticks, { tone: "mid" });
    put("det.box", svg, [slab(BOX, 0, BOX_TOP, {}, 4), slab(strip, BOX_TOP, 0.5, {}, 2), ...lshapes]);
    const x = SWITCH.stops[0];
    const base = { x: x - 2.5, y: SWITCH.y - 2, w: 5, d: 4, r: 0.6 };
    const lever =
      S(k.slabOf(base, BOX_TOP, 1, P, 2, 0.3), { tone: "mid" }) + S(k.cylinder(x, SWITCH.y, 0.8, BOX_TOP + 1, 3, P, 12), { tone: "mid" }) +
      S(k.cylinder(x, SWITCH.y, 2, BOX_TOP + 4, 2.5, P, 20), { tone: "hi", inner: L(k.knurl(x, SWITCH.y, 2, BOX_TOP + 4, BOX_TOP + 6.5, 16, P), { tone: "lo" }) });
    put("det.lever", lever, [slab(base, BOX_TOP, 1, {}, 2), cyl(x, SWITCH.y, 0.8, BOX_TOP + 1, 3), cyl(x, SWITCH.y, 2, BOX_TOP + 4, 2.5)], { part: "lever" });
  }

  // ============ drain tray under the spout: a pit with a slotted drain floor
  {
    const inner = k.insetPlan(TRAY, 2);
    const fz = TRAY_TOP - 3;
    const slots = [];
    for (let i = 0; i < 6; i++) slots.push(k.planOutline({ x: inner.x + 5 + i * 5, y: inner.y + 3, w: 1.6, d: 7, r: 0.8 }, fz, P, 2));
    const svg = S(k.slabOf(TRAY, 0, TRAY_TOP, P, 3, 0.5), { tone: "mid" }) + pit(inner, TRAY_TOP, 3, L(slots.join(""), { tone: "lo" }));
    put("tray", svg, [slab(TRAY, 0, fz, { owner: "tray" }, 3), slab({ ...TRAY, d: 2 }, fz, 3, { owner: "tray" }, 3), slab({ ...TRAY, w: 2 }, fz, 3, { owner: "tray" }, 3)]);
  }
  return items;
}

// the turret's markup in a pose, with each piece's recorded shapes (build.mjs audits the same pieces)
export function turretItems(theta, mask = 0) {
  const f = turretFrame(theta, mask);
  const lit = inBeam(theta);
  const rest = lit >= 0 && Math.abs(theta - Math.round(theta / 90) * 90) < 1e-6;
  const cellOwn = (i) => ({ owner: `cell${i}` });
  const hub = { owner: "hub" };
  const dz = f.lift;
  const stacks = [];
  for (const c of f.cells) {
    const sq = (half, r) => squareRing(c.x, c.y, half, theta, r);
    const pieces = [
      { name: `turret.cell${c.i}.holder`, svg: Sx(c.holder, { tone: "mid", cls: "bs-holder" }), shapes: [ext(sq(T.holder, 0.9), T.z1, T.holderTop - T.z1, cellOwn(c.i))] },
      {
        name: `turret.cell${c.i}.cuvette`,
        svg: Sx(c.cuvette, { tone: "mid", lit: c.i === lit, cls: "bs-glass", inner: `<path class="iso-line" data-tone="lo" data-m="" d="${c.meniscus}"/>` }),
        shapes: [ext(sq(T.cuvette, 0.6), T.holderTop, T.cuvetteTop - T.holderTop, cellOwn(c.i))],
      },
      { name: `turret.cell${c.i}.cap`, svg: Sx(c.cap, { tone: "mid", cls: "bs-cap" }), shapes: [ext(sq(T.cap, 0.9), T.cuvetteTop + dz, T.capH, hub)] },
      { name: `turret.cell${c.i}.arm`, svg: Sx(c.arm, { tone: "mid", cls: "bs-arm" }) + D([c.screw], { size: 0.4 }), shapes: [ext(armRing(theta, c.i), T.cuvetteTop + dz + T.capH, T.armH, hub)] },
    ];
    stacks.push({ name: `turret.cell${c.i}`, depth: c.depth, svg: `<g data-stack="${c.i}">${pieces.map((p) => p.svg).join("")}</g>`, pieces });
  }
  // centre post through the spider's collar, and the knurled knob with its pointer at the cell in the beam
  {
    const c0 = T.collar0 + dz;
    const c1 = c0 + T.collarH;
    const pieces = [
      { name: "turret.post", svg: Sx(f.post0, { tone: "mid", attr: ' data-post="0"' }), shapes: [cyl(T.x, T.y, T.post, T.z1, c0 - T.z1, hub)] },
      {
        name: "turret.collar",
        svg: Sx(f.collar, { tone: "mid", inner: `<path class="iso-line" data-tone="lo" data-k="" d="${f.collarKnurl}"/>`, attr: ' data-collar=""' }),
        shapes: [cyl(T.x, T.y, T.collar, c0, T.collarH, hub)],
      },
    ];
    stacks.push({ name: "turret.hub", depth: f.hubDepth, svg: `<g data-stack="hub">${pieces.map((p) => p.svg).join("")}</g>`, pieces });
    // the knob and the post above the collar paint after every cell: only the far arms pass under them, and nothing
    // in a near cell reaches up into them
    const top = [
      {
        name: "turret.knob",
        svg:
          Sx(f.post1, { tone: "mid", attr: ' data-post="1"' }) +
          S(k.cylinder(T.x, T.y, T.knob, T.knob0, T.knob1 - T.knob0, P, 28, 0.4), { tone: "mid", inner: L(k.knurl(T.x, T.y, T.knob, T.knob0, T.knob1, 24, P), { tone: "lo" }) }) +
          L(k.ring(T.x, T.y, 1.2, T.knob1, P, 14), { tone: "lo" }) + `<path class="iso-line" data-tone="hi" data-part="turret-pointer" data-free="end" d="${f.pointer}"/>`,
        shapes: [cyl(T.x, T.y, T.post, c1, T.knob0 - c1, hub), cyl(T.x, T.y, T.knob, T.knob0, T.knob1 - T.knob0, hub)],
      },
    ];
    stacks.push({ name: "turret.top", depth: Infinity, svg: `<g data-stack="top">${top.map((p) => p.svg).join("")}</g>`, pieces: top });
  }
  // detent plunger: bracket post from the floor, housing, spring rod and ball riding the notched rim
  {
    const u = PLUNGER_U;
    const F = G.frameAlong([T.x, T.y, (T.z0 + T.z1) / 2], u);
    const [bx, by] = [T.x + 29.75 * u[0], T.y + 29.75 * u[1]];
    const ballAt = T.disc + 1.3;
    const shift = k.translateAlong(P, [-u[0] * f.plunger, -u[1] * f.plunger, 0]);
    const zc = (T.z0 + T.z1) / 2;
    const svg =
      S(k.cylinder(bx, by, 1.4, COMP_FLOOR, zc - 2.2 - COMP_FLOOR, P, 14), { tone: "lo" }) +
      `<g data-part="plunger" transform="${shift}">${S(Gd(ballAt, 29.5, 0.9, F), { tone: "mid" })}${S(G.sphereOf(G.pointOf(F, ballAt, 0, 0), 1.3, P, { steps: 16 }), { tone: "mid" })}</g>` +
      S(Gd(27, 32.5, 2.2, F), { tone: "mid", inner: L(G.arcOf(F, 30.5, 2.2, P), { tone: "faint" }) });
    const back = (shape) => Object.assign(shape, { move: [-u[0] * f.plunger, -u[1] * f.plunger, 0] });
    const pown = { owner: "plunger" };
    stacks.push({
      name: "turret.plunger",
      depth: f.plungerDepth,
      svg: `<g data-stack="plunger">${svg}</g>`,
      pieces: [{
        name: "turret.plunger",
        svg,
        shapes: [cyl(bx, by, 1.4, COMP_FLOOR, zc - 2.2 - COMP_FLOOR, pown), back(disc(F, ballAt, 29.5, 0.9, pown)), back(ball(G.pointOf(F, ballAt, 0, 0), 1.3, pown)), disc(F, 27, 32.5, 2.2, pown)],
      }],
    });
  }
  // the first beam leg: from the monochromator lens to the near face of the cuvette in the beam
  {
    const svg = `<g data-beam="in"${rest ? ' data-on=""' : ""}>${L(beamLine(BEAM.lens, BEAM.in), { tone: "hi", className: "bs-beam" })}${D([at([BEAM.lens, YB, ZB])], { size: 0.55, tone: "hi" })}</g>`;
    stacks.push({ name: "turret.beam", depth: f.beamDepth, svg: `<g data-stack="beam">${svg}</g>`, pieces: [{ name: "beam.in", svg, shapes: rest ? [beamShape(BEAM.lens, BEAM.in)] : [] }] });
  }
  stacks.sort((a, b) => a.depth - b.depth);
  const discSvg = Sx(f.disc, { tone: "mid", cls: "bs-disc", inner: D(f.dots, { size: 0.42, tone: "hi" }) });
  const svg = `<g data-turret="">${discSvg}<g data-stacks="">${stacks.map((s) => s.svg).join("")}</g></g>`;
  const discShape = ext(discRing(theta), T.z0, T.z1 - T.z0, { owner: "turret" });
  const all = [{ name: "turret.disc", depth: -1e9, svg: discSvg, pieces: [{ name: "turret.disc", svg: discSvg, shapes: [discShape] }] }, ...stacks];
  return { svg, stacks: all, shapes: all.flatMap((s) => s.pieces.flatMap((p) => p.shapes)) };
}
