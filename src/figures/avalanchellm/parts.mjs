// Fig 20 geometry: a cosmic-ray hodoscope on a bench. Pure ESM (no Node APIs): art.mjs and build.mjs both call build().
// World units, x along the tube frame (tokens), y into the bench, z up. Every item carries shape descriptors for the audit.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "../kit/tube.mjs";
import { ROWS, COLS, gainAngle, RATE_ANGLES, meterAngle, trimAngle, REST, windowOf, condOf } from "./model.mjs";
import { GAINS, GSTAR } from "./data.mjs";

export const WIDTH = 600;
export const HEIGHT = 450;

// ------------------------------------------------------------ layout
export const BENCH = { x: -152, y: -70, w: 302, d: 96, r: 10 };
const BENCH_H = 12;
const FOOT_H = 5;
const STAND = { x: -146, y: -64, w: 172, d: 62, r: 2 }; // stand top plate, z 10..14
const STAND_Z = 10;
const FRAME_Z = 14;
const TRESTLES = [-126, 6];
const CHEEK = { x: -142, y: -60, w: 6, d: 56, r: 1 };
const RACK = { x: 4, y: -60, w: 18, d: 56, r: 1.2 };
const FRAME_TOP = 90;
const BACK = { x: -136, y: -58, w: 140, d: 4, r: 0 };
const FRONT = { x: -136, y: -9, w: 140, d: 3, r: 0 };
const PANEL_TOP = 84;
const FACE_Y = FRONT.y + FRONT.d; // the lamp panel's face, y = -6
export const colX = (c) => -125 + 8 * c;
export const rowZ = (r) => 78 - 8 * r;
const BEZEL = { r: 3, depth: 1.6, lens: 1.9 };
const TUBE_R = 2.8;
const TRIM = { x: 13, r: 2.7, depth: 2.6 };
const RACK_FACE = RACK.y + RACK.d; // y = -4

const CASE = { x: 52, y: -40, w: 84, d: 58, r: 3 };
const CASE_Z = 3;
const CASE_TOP = 28;
export const GAIN = { at: [80, 0], plate: 16.5, skirt: 10.5, knob: 8, cap: 5.4 };
const GAIN_Z = { plate: CASE_TOP, skirt: CASE_TOP + 0.8, knob: CASE_TOP + 2.8, cap: CASE_TOP + 8.8, top: CASE_TOP + 9.8 };
export const RATE = { at: [118, 6], r: 4.6, top: CASE_TOP + 5 };
export const METER = { at: [116, -21], r: 12.5, top: CASE_TOP + 5 };
export const TOGGLES = { def: [72, -26], null: [92, -26] };
const HV_PORTS = [[58, -34], [58, -24]];
const PORT_TOP = CASE_TOP + 6.2;
const RACK_PORT_Z = 42;
const STAND_POST = [38, -29];
const BAT = { tilt: 30 * (Math.PI / 180), length: 7.5 };

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [CHEEK.x, CHEEK.y, FRAME_TOP + 3], [RACK.x + RACK.w, RACK.y, FRAME_TOP + 3], [GAIN.at[0], GAIN.at[1], GAIN_Z.top]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 54 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 24, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const fp = (x, y, z) => at([x, y, z]);
const Y = [0, 1, 0];
const X = [1, 0, 0];
const f2 = (v) => Math.round(v * 100) / 100;

// shape descriptors, turned into audit shapes by build.mjs
const sSlab = (plan, z, h) => ["slab", plan, z, h];
const sCyl = (x, y, r, z, h) => ["cyl", x, y, r, z, h];
const sDisc = (F, s0, s1, r) => ["disc", F, s0, s1, r];
const sBall = (c, r) => ["ball", c, r];
const sBox = (min, max) => ["box", min, max];

// screen affine of a unit direction in a plane: S(t) = c + cos t * a + sin t * b, written onto live elements
function topAffine([cx, cy], z, rho) {
  const c = at([cx, cy, z]);
  const ux = at([cx + rho, cy, z]);
  const uy = at([cx, cy - rho, z]);
  return { c, a: [uy[0] - c[0], uy[1] - c[1]], b: [ux[0] - c[0], ux[1] - c[1]] }; // t = 0 points to -y, clockwise from above
}
function faceAffine(x, y, z, rho) {
  const c = at([x, y, z]);
  const up = at([x, y, z + rho]);
  const side = at([x + rho, y, z]);
  return { c, a: [up[0] - c[0], up[1] - c[1]], b: [side[0] - c[0], side[1] - c[1]] }; // t = 0 points up, clockwise on the face
}
export const pointOn = (A, t, s = 1) => [A.c[0] + s * (Math.cos(t) * A.a[0] + Math.sin(t) * A.b[0]), A.c[1] + s * (Math.cos(t) * A.a[1] + Math.sin(t) * A.b[1])];
const affAttr = (A, r0, r1) => `data-c="${f2(A.c[0])},${f2(A.c[1])}" data-a="${f2(A.a[0])},${f2(A.a[1])}" data-b="${f2(A.b[0])},${f2(A.b[1])}" data-r="${r0},${r1}"`;
const segD = (p, q) => `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;

// pointers drawn from affines
export const TRIM_AFF = Array.from({ length: ROWS }, (_, r) => faceAffine(TRIM.x, RACK_FACE + TRIM.depth, rowZ(r), 1));
export const GAIN_AFF = topAffine(GAIN.at, GAIN_Z.top, 1);
export const PLATE_AFF = topAffine(GAIN.at, GAIN_Z.plate + 0.01, 1);
export const RATE_AFF = topAffine(RATE.at, RATE.top, 1);
export const METER_AFF = topAffine(METER.at, METER.top - 0.6, 1);
const TRIM_R = [-TRIM.r, TRIM.r]; // the slot runs rim to rim across the head's face
const GAIN_R = [1.2, GAIN.cap - 0.6];
const RATE_R = [0.9, RATE.r - 0.5];
const METER_R = [-2.4, METER.r - 3.2];
const REF_R = [-1.6, METER.r - 4.2];
const liveD = (A, [r0, r1], t) => segD(pointOn(A, t, r0), pointOn(A, t, r1));
const livePath = (cls, av, A, radii, t, extra = "", tone = "hi") => `<path class="iso-line ${cls}" data-tone="${tone}" data-av="${av}"${extra} ${affAttr(A, ...radii)} d="${liveD(A, radii, t)}"/>`;
export const markAt = (g) => pointOn(PLATE_AFF, gainAngle(g), 15);

// one ellipse (a projected circle on a face) as two arcs: lamps are cheap this way
function ellipseD(c, A, r) {
  // the conjugate semi-diameters r*a and r*b of the projected circle, turned into axes
  const [a0, a1] = A.a;
  const [b0, b1] = A.b;
  const m = [a0 * r, b0 * r, a1 * r, b1 * r];
  const e = (m[0] * m[0] + m[1] * m[1] + m[2] * m[2] + m[3] * m[3]) / 2;
  const f = (m[0] * m[0] + m[1] * m[1] - m[2] * m[2] - m[3] * m[3]) / 2;
  const g = m[0] * m[2] + m[1] * m[3];
  const h = Math.hypot(f, g);
  const rx = Math.sqrt(e + h);
  const ry = Math.sqrt(Math.max(0, e - h));
  const phi = Math.atan2(g, f) / 2;
  const ux = Math.cos(phi) * rx;
  const uy = Math.sin(phi) * rx;
  const n = (v) => Number(v.toFixed(1));
  return `M${n(c[0] - ux)} ${n(c[1] - uy)}a${n(rx)} ${n(ry)} ${n((phi * 180) / Math.PI)} 1 0 ${n(2 * ux)} ${n(2 * uy)}a${n(rx)} ${n(ry)} ${n((phi * 180) / Math.PI)} 1 0 ${n(-2 * ux)} ${n(-2 * uy)}Z`;
}

// paths of a part built at a reference world point, shifted so the reference lands on 0,0: reused with <use x y>
function local(ref) {
  const s = at(ref);
  return { P0: { ...P, origin: [P.origin[0] - s[0], P.origin[1] - s[1]] }, s };
}
const useAt = (id, s, extra = "") => `<use href="#${id}" x="${s[0].toFixed(1)}" y="${s[1].toFixed(1)}"${extra}/>`;

export function build(state = REST) {
  const items = [];
  const routes = [];
  const defs = [];
  const put = (name, at3, svg, shapes, extra = {}) => items.push({ name, at: at3, svg, shapes, ...extra });

  // ============================ bench
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = k
      .corners(BENCH, 8)
      .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
      .slice(1);
    let svg = halo;
    const shapes = [];
    for (const [x, y] of feet) {
      svg += S(cyl(x, y, 5.8, -BENCH_H - FOOT_H, 1.6, 16), { tone: "lo" }) + S(cyl(x, y, 4.6, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, 16), { tone: "mid" });
      shapes.push(sCyl(x, y, 5.8, -BENCH_H - FOOT_H, FOOT_H));
    }
    put("stand.feet", [0, 0, -14], svg, shapes);
    const screws = k.corners(BENCH, 10);
    const bench =
      S(slab(BENCH, -BENCH_H, BENCH_H, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4.6, P, 8), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
    put("stand.bench", [0, 0, -6], bench, [sSlab(BENCH, -BENCH_H, BENCH_H)]);
  }

  // label plate on the bench's front face: the maker's mark and three rule lines
  {
    const y = BENCH.y + BENCH.d;
    const plate = { x: -118, y, w: 48, d: 0.8, r: 0.3 };
    const z0 = -9.6;
    const h = 7.6;
    const face = y + 0.8;
    const p = (x, z) => fp(x, face, z);
    const rules = [26, 21, 14].map((w, i) => k.pathOf([p(plate.x + 17, z0 + h - 2 - i * 1.8), p(plate.x + 17 + w, z0 + h - 2 - i * 1.8)])).join("");
    const inset = k.pathOf([p(plate.x + 1.2, z0 + 1.2), p(plate.x + plate.w - 1.2, z0 + 1.2), p(plate.x + plate.w - 1.2, z0 + h - 1.2), p(plate.x + 1.2, z0 + h - 1.2)], true);
    const divider = k.pathOf([p(plate.x + 14.6, z0 + 1.2), p(plate.x + 14.6, z0 + h - 1.2)]);
    const mark = k.faceTextSvg(k.sideMatrix([plate.x + 7.8, face], z0 + h / 2 - 1.1, P, "left"), "AU-20", { size: 2.7, tone: "mid", anchor: "middle" });
    const svg = S(slab(plate, z0, h, 2), { tone: "lo", crease: "none" }) + L(inset + divider, { tone: "faint" }) + mark + L(rules, { tone: "lo", free: true }) + D([p(plate.x + plate.w - 3.2, z0 + h / 2)], { size: 0.45 });
    put("label", [plate.x + 24, y + 0.4, -6], svg, [sSlab(plate, z0, h)]);
  }

  // token ruler on the bench in front of the lamp panel: a tick under every column, a major every fourth
  {
    const strip = { x: colX(0) - 5, y: 1, w: colX(COLS - 1) - colX(0) + 10, d: 7, r: 1 };
    const t = k.topTicks(colX(0), colX(COLS - 1), 8, 4, strip.y + 0.6, 0.6, [2.2, 3.8], P);
    const svg = S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + D([at([strip.x + 2.2, strip.y + 4.6, 0.6]), at([strip.x + strip.w - 2.2, strip.y + 4.6, 0.6])], { size: 0.45 });
    put("ruler", [strip.x + strip.w / 2, strip.y + 3, 0.3], svg, [sSlab(strip, 0, 0.6)]);
  }

  // ============================ stand: two trestles and a top plate
  for (const [i, tx] of TRESTLES.entries()) {
    const foot = { x: tx - 9, y: STAND.y + 2, w: 18, d: STAND.d - 4, r: 2 };
    const web = { x: tx - 3, y: STAND.y + 6, w: 6, d: STAND.d - 12, r: 1 };
    const svg =
      S(slab(foot, 0, 2.5, 3, 0.5), { tone: "lo" }) +
      D(k.corners(foot, 3).map(([x, y]) => at([x, y, 2.5])), { size: 0.45 }) +
      S(slab(web, 2.5, STAND_Z - 2.5, 2), { tone: "mid", inner: L(k.sideSeam(web, 6.25, P, 2), { tone: "faint" }) });
    put(`stand.trestle${i}`, [tx, STAND.y + STAND.d / 2, 4], svg, [sSlab(foot, 0, 2.5), sSlab(web, 2.5, STAND_Z - 2.5)]);
  }
  put("frame.plate", [STAND.x + STAND.w / 2, STAND.y + STAND.d / 2, 12], S(slab(STAND, STAND_Z, FRAME_Z - STAND_Z, 3, 0.6), { tone: "mid" }) + D([STAND.x + 3, STAND.x + STAND.w - 3].map((x) => at([x, STAND.y + STAND.d - 3, FRAME_Z])), { size: 0.45 }), [sSlab(STAND, STAND_Z, FRAME_Z - STAND_Z)]);

  // ============================ tube frame
  // back bulkhead with its terminal strip
  {
    const strip = { x: BACK.x + 2, y: BACK.y - 1, w: BACK.w - 4, d: 5, r: 0.6 };
    const screws = Array.from({ length: COLS }, (_, c) => [colX(c), strip.y + 2.5]);
    const svg =
      S(slab(BACK, FRAME_Z, PANEL_TOP - FRAME_Z, 2), { tone: "mid" }) +
      S(slab(strip, PANEL_TOP, 2.5, 2, 0.4), { tone: "mid" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 1.3, PANEL_TOP + 2.5, P, 12)).join(""), { tone: "lo" }) +
      D(screws.map(([x, y]) => at([x, y, PANEL_TOP + 2.5])), { size: 0.45 });
    put("frame.back", [BACK.x + BACK.w / 2, BACK.y + 2, 50], svg, [sSlab(BACK, FRAME_Z, PANEL_TOP - FRAME_Z), sSlab(strip, PANEL_TOP, 2.5)]);
  }
  // absorber shelf under the top row
  {
    const shelf = { x: BACK.x, y: BACK.y + BACK.d, w: BACK.w, d: FRONT.y - BACK.y - BACK.d, r: 0 };
    const top = rowZ(0) - TUBE_R;
    put("frame.shelf", [shelf.x + shelf.w / 2, shelf.y + shelf.d / 2, top - 0.6], S(slab(shelf, top - 1.2, 1.2, 2), { tone: "lo" }), [sSlab(shelf, top - 1.2, 1.2)]);
  }
  // the top row of Geiger-Mueller tubes: one tube drawn once, placed sixteen times
  {
    const y0 = BACK.y + BACK.d;
    const y1 = FRONT.y;
    const ref = [colX(0), y0, rowZ(0)];
    const { P0, s } = local(ref);
    const F0 = G.frameAlong(ref, Y);
    const body = G.disc(0, y1 - y0, TUBE_R, F0, P0, { rims: "none" });
    const seams = [5, y1 - y0 - 3].map((sv) => G.arcOf(F0, sv, TUBE_R, P0)).join("");
    const band = G.ringBand(3.4, 5.4, TUBE_R, TUBE_R + 0.45, F0, P0);
    const tag = k.slabOf({ x: ref[0] - 1.1, y: y0 + 3.6, w: 2.2, d: 1.6, r: 0.3 }, rowZ(0) + TUBE_R + 0.45, 1.3, P0, 2);
    defs.push(`<g id="av-tube">${S(body, { tone: "hi", crease: "lo", inner: L(seams, { tone: "faint" }) })}${S(band, { tone: "mid" })}${S(tag, { tone: "mid", crease: "none" })}</g>`);
    let svg = "";
    const shapes = [];
    for (let c = 0; c < COLS; c++) {
      const d = at([colX(c), y0, rowZ(0)]);
      svg += useAt("av-tube", d);
      const F = G.frameAlong([colX(c), y0, rowZ(0)], Y);
      shapes.push(sDisc(F, 0, y1 - y0, TUBE_R), ["ring", F, 3.4, 5.4, TUBE_R, TUBE_R + 0.45]);
    }
    // anode leads: from each clip's tag up to its terminal screw on the strip
    // anode leads: from each clip's tag, up over the strip's edge, down onto its terminal screw
    const lead = (c) => [[colX(c), y0 + 4.4, rowZ(0) + TUBE_R + 1.75], [colX(c), y0 + 1.2, PANEL_TOP + 3.2], [colX(c), BACK.y + 1.5, PANEL_TOP + 2.6]];
    const leads = Array.from({ length: COLS }, (_, c) => {
      const [p0, p1, p2] = lead(c).map(at);
      return k.wireSvg(p0, p2, { via: [p1], tone: "lo", size: 0.7 });
    }).join("");
    put("tubes", [colX(7), (y0 + y1) / 2, rowZ(0)], svg, shapes);
    put("tubes.leads", [colX(7), y0 + 1, PANEL_TOP], leads, Array.from({ length: COLS }, (_, c) => ["tube", lead(c), 0.22]));
  }
  // left cheek with the layer scale
  {
    const strip = { x: CHEEK.x + 1, y: CHEEK.y + CHEEK.d, w: 4, d: 0.6, r: 0.2 };
    const face = strip.y + strip.d;
    const z0 = rowZ(ROWS - 1) - 5;
    const z1 = rowZ(0) + 5;
    const ticks = Array.from({ length: ROWS }, (_, r) => k.pathOf([fp(strip.x + strip.w, face, rowZ(r)), fp(strip.x + strip.w - (r % 4 === 0 ? 2.8 : 1.8), face, rowZ(r))])).join("");
    const svg =
      S(slab(CHEEK, FRAME_Z, FRAME_TOP - FRAME_Z, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(CHEEK, PANEL_TOP, P, 2), { tone: "faint" }) }) +
      D([at([CHEEK.x + 3, CHEEK.y + 4, FRAME_TOP]), at([CHEEK.x + 3, CHEEK.y + CHEEK.d - 4, FRAME_TOP])], { size: 0.45 }) +
      S(slab(strip, z0, z1 - z0, 1), { tone: "lo", crease: "none" }) +
      L(ticks, { tone: "mid" });
    put("frame.cheek", [CHEEK.x + 3, CHEEK.y + CHEEK.d / 2, 50], svg, [sSlab(CHEEK, FRAME_Z, FRAME_TOP - FRAME_Z), sSlab(strip, z0, z1 - z0)]);
  }
  // the lamp panel: front bulkhead with a bezel cap and a lamp at every tube end
  {
    const ref = [colX(0), FACE_Y, rowZ(0)];
    const { P0, s } = local(ref);
    const F0 = G.frameAlong(ref, Y);
    const cap = G.disc(0, BEZEL.depth, BEZEL.r, F0, P0);
    const lens = G.circleOf(F0, BEZEL.depth, BEZEL.lens, P0);
    defs.push(`<g id="av-bez">${S(cap, { tone: "mid" })}<path class="iso-line" data-tone="lo" d="${lens}"/></g>`);
    const rules = Array.from({ length: ROWS - 1 }, (_, r) => k.pathOf([fp(FRONT.x, FACE_Y, rowZ(r) - 4), fp(FRONT.x + FRONT.w, FACE_Y, rowZ(r) - 4)])).join("");
    const screws = [[FRONT.x + 3.5, PANEL_TOP - 3], [FRONT.x + FRONT.w - 3.5, PANEL_TOP - 3], [FRONT.x + 3.5, FRAME_Z + 3], [FRONT.x + FRONT.w - 3.5, FRAME_Z + 3]];
    let svg = S(slab(FRONT, FRAME_Z, PANEL_TOP - FRAME_Z, 2, 0.4), { tone: "mid" }) + L(rules, { tone: "faint" }) + D(screws.map(([x, z]) => fp(x, FACE_Y, z)), { size: 0.45 });
    const shapes = [sSlab(FRONT, FRAME_Z, PANEL_TOP - FRAME_Z)];
    put("frame.panel", [FRONT.x + FRONT.w / 2, FRONT.y + 1.5, 50], `<g data-hit="latch">${svg}</g>`, shapes);
    let caps = "";
    const capShapes = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const d = at([colX(c), FACE_Y, rowZ(r)]);
        caps += useAt("av-bez", d);
        capShapes.push(sDisc(G.frameAlong([colX(c), FACE_Y, rowZ(r)], Y), 0, BEZEL.depth, BEZEL.r));
      }
    put("frame.caps", [colX(7), FACE_Y + 0.8, 50], `<g data-hit="latch">${caps}</g>`, capShapes);
    // lamps: a lens disc in front of each cap, lit by the latched window; one ellipse placed 128 times, its opacity live
    const A = faceAffine(0, 0, 0, 1);
    defs.push(`<path id="av-lit" class="av-lamp" style="fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.4px" d="${ellipseD([0, 0], A, BEZEL.lens - 0.15)}"/>`);
    const bits = windowOf(state);
    let lamps = "";
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) lamps += useAt("av-lit", at([colX(c), FACE_Y + BEZEL.depth, rowZ(r)]), ` opacity="${bits[r * COLS + c] ? 1 : 0}"`);
    put("frame.lamps", [colX(7), FACE_Y + BEZEL.depth + 0.1, 50], `<g class="av-lamps">${lamps}</g>`, [sBox([colX(0) - BEZEL.lens, FACE_Y + BEZEL.depth, rowZ(ROWS - 1) - BEZEL.lens], [colX(COLS - 1) + BEZEL.lens, FACE_Y + BEZEL.depth + 0.05, rowZ(0) + BEZEL.lens])]);
  }
  // discriminator rack: one module per row, a trimmer at the end of each row, the harness connectors on its side
  {
    const seams = Array.from({ length: ROWS - 1 }, (_, r) => k.sideSeam(RACK, rowZ(r) - 4, P, 3)).join("");
    const vents = [];
    const side = RACK.x + RACK.w;
    for (let r = 0; r < ROWS; r++) {
      const z = rowZ(r);
      const y0 = RACK.y + 8;
      const y1 = RACK.y + 22;
      vents.push(k.pathOf([fp(side, y0, z + 0.8), fp(side, y1, z + 0.8), fp(side, y1, z - 0.8), fp(side, y0, z - 0.8)], true));
    }
    const screws = [];
    for (let r = 0; r < ROWS; r++) screws.push(fp(side, RACK.y + 3, rowZ(r) + 2.4), fp(side, RACK_FACE - 3, rowZ(r) + 2.4));
    const svg =
      S(slab(RACK, FRAME_Z, FRAME_TOP - FRAME_Z, 3, 0.6), { tone: "mid", inner: L(seams, { tone: "faint" }) }) +
      L(vents.join(""), { tone: "lo" }) +
      D(screws, { size: 0.4 }) +
      D([at([RACK.x + 3.5, RACK.y + 4, FRAME_TOP]), at([RACK.x + RACK.w - 3.5, RACK.y + 4, FRAME_TOP]), at([RACK.x + 3.5, RACK_FACE - 4, FRAME_TOP]), at([RACK.x + RACK.w - 3.5, RACK_FACE - 4, FRAME_TOP])], { size: 0.45 });
    put("frame.rack", [RACK.x + RACK.w / 2, RACK.y + RACK.d / 2, 50], svg, [sSlab(RACK, FRAME_Z, FRAME_TOP - FRAME_Z)]);
    // trimmers: one knurled knob drawn once and placed per row; each slot pointer is live
    const ref = [TRIM.x, RACK_FACE, rowZ(0)];
    const { P0, s } = local(ref);
    const F0 = G.frameAlong(ref, Y);
    const knob = G.disc(0, TRIM.depth, TRIM.r, F0, P0);
    const ribs = k.fadedSvg(G.ribsOf(F0, 0, TRIM.depth, TRIM.r, 22, P0, { fade: [0.1, 0.55] }), { tone: "lo" });
    const collar = G.disc(-0.01, 0.5, TRIM.r + 0.8, F0, P0);
    defs.push(`<g id="av-trim">${S(collar, { tone: "lo" })}${S(knob, { tone: "mid", inner: ribs })}</g>`);
    let trims = "";
    const shapes = [];
    for (let r = 0; r < ROWS; r++) {
      const d = at([TRIM.x, RACK_FACE, rowZ(r)]);
      trims += useAt("av-trim", d);
      trims += livePath("av-slot", "trim", TRIM_AFF[r], TRIM_R, trimAngle(state, r));
      const F = G.frameAlong([TRIM.x, RACK_FACE, rowZ(r)], Y);
      shapes.push(sDisc(F, 0, 0.5, TRIM.r + 0.8), sDisc(F, 0.5, TRIM.depth, TRIM.r));
    }
    put("frame.trims", [TRIM.x, RACK_FACE + 1.3, 50], trims, shapes);
  }

  // ============================ high-voltage supply and controls
  {
    const feet = k.corners(CASE, 7).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)).slice(1);
    put("hv.feet", [CASE.x + CASE.w / 2, CASE.y + CASE.d / 2, 1.5], feet.map(([x, y]) => S(cyl(x, y, 3.2, 0, CASE_Z, 14), { tone: "lo" })).join(""), feet.map(([x, y]) => sCyl(x, y, 3.2, 0, CASE_Z)));
    const front = CASE.y + CASE.d;
    const side = CASE.x + CASE.w;
    const slots = [];
    for (let i = 0; i < 11; i++) {
      const x0 = CASE.x + 27 + i * 4.4;
      slots.push(k.pathOf([fp(x0, front, CASE_Z + 7), fp(x0 + 1.6, front, CASE_Z + 7), fp(x0 + 1.6, front, CASE_Z + 18), fp(x0, front, CASE_Z + 18)], true));
    }
    for (let i = 0; i < 4; i++) {
      const z = CASE_Z + 6 + i * 3.6;
      slots.push(k.pathOf([fp(side, CASE.y + 10, z), fp(side, CASE.y + 40, z), fp(side, CASE.y + 40, z + 1.4), fp(side, CASE.y + 10, z + 1.4)], true));
    }
    const screws = [fp(CASE.x + 4, front, CASE_Z + 3), fp(side - 4, front, CASE_Z + 3), fp(CASE.x + 4, front, CASE_TOP - 3), fp(side - 4, front, CASE_TOP - 3), fp(side, CASE.y + 4, CASE_TOP - 3), fp(side, CASE.y + 4, CASE_Z + 3), fp(side, front - 4, CASE_Z + 3), fp(side, front - 4, CASE_TOP - 3)];
    const panel = k.insetPlan(CASE, 3);
    const svg =
      S(slab(CASE, CASE_Z, CASE_TOP - CASE_Z, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CASE, CASE_TOP - 4, P, 4), { tone: "faint" }) }) +
      L(k.planOutline(panel, CASE_TOP, P, 3), { tone: "faint" }) +
      L(slots.join(""), { tone: "lo" }) +
      D(screws, { size: 0.45 }) +
      D(k.corners(panel, 2.5).map(([x, y]) => at([x, y, CASE_TOP])), { size: 0.45 });
    put("hv.case", [CASE.x + CASE.w / 2, CASE.y + CASE.d / 2, 15], svg, [sSlab(CASE, CASE_Z, CASE_TOP - CASE_Z)]);
    // rack handles on the front face
    for (const [i, hx] of [CASE.x + 5, side - 5].entries()) {
      const posts = [CASE_Z + 6, CASE_TOP - 8];
      let hs = "";
      const shapes = [];
      for (const z of posts) {
        const post = { x: hx - 1.4, y: front, w: 2.8, d: 3, r: 0.4 };
        hs += S(slab(post, z, 2.4, 2), { tone: "mid", crease: "none" });
        shapes.push(sSlab(post, z, 2.4));
      }
      const bar = { x: hx - 1.4, y: front + 3, w: 2.8, d: 2.2, r: 0.8 };
      hs += S(slab(bar, posts[0] - 0.6, posts[1] - posts[0] + 3.6, 3, 0.3), { tone: "mid" });
      shapes.push(sSlab(bar, posts[0] - 0.6, posts[1] - posts[0] + 3.6));
      put(`hv.handle${i}`, [hx, front + 2.5, 15], hs, shapes);
    }
    // mains rocker in its bezel and a fuse holder with a slotted cap, between the left handle and the vents
    {
      const bezel = { x: CASE.x + 10, y: front, w: 9, d: 0.9, r: 0.6 };
      const low = { x: bezel.x + 1.2, y: front + 0.9, w: 6.6, d: 0.7, r: 0.3 };
      const high = { ...low, d: 1.7 };
      const F = G.frameAlong([CASE.x + 23, front, CASE_Z + 12.5], Y);
      const slotFace = front + 3.6;
      const slot = segD(fp(CASE.x + 23 - 1.7, slotFace, CASE_Z + 12.5), fp(CASE.x + 23 + 1.7, slotFace, CASE_Z + 12.5));
      const fs =
        S(slab(bezel, CASE_Z + 7, 9, 2, 0.3), { tone: "lo" }) +
        S(slab(low, CASE_Z + 8.2, 3.4, 2), { tone: "mid", crease: "none" }) +
        S(slab(high, CASE_Z + 11.6, 3.2, 2, 0.3), { tone: "mid" }) +
        S(G.disc(0, 0.8, 2.4, F, P, { steps: 6 }), { tone: "lo" }) +
        S(G.disc(0.8, 3.6, 1.7, F, P, { steps: 20 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 0.8, 3.6, 1.7, 14, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }) +
        L(slot, { tone: "lo" });
      put("hv.front", [CASE.x + 16, front + 1, CASE_Z + 12], fs, [sSlab(bezel, CASE_Z + 7, 9), sSlab(low, CASE_Z + 8.2, 3.4), sSlab(high, CASE_Z + 11.6, 3.2), sDisc(F, 0, 0.8, 2.4), sDisc(F, 0.8, 3.6, 1.7)]);
    }
  }
  // gain knob: dial plate with a detent tick at each grid gain, knurled knob, pointer; the g* marker rides the plate
  {
    const [cx, cy] = GAIN.at;
    const ticks = GAINS.map((g) => {
      const t = gainAngle(g);
      const major = Math.abs(g - 1) < 1e-9;
      return { d: segD(pointOn(PLATE_AFF, t, GAIN.skirt + 0.6), pointOn(PLATE_AFF, t, GAIN.skirt + (major ? 4.6 : 3.2))), major };
    });
    const plate = cyl(cx, cy, GAIN.plate, GAIN_Z.plate, 0.8, 56, 0.4);
    const svg =
      S(plate, { tone: "lo" }) +
      L(k.ring(cx, cy, GAIN.skirt + 0.6, GAIN_Z.skirt, P, 64), { tone: "faint" }) +
      L(ticks.filter((t) => !t.major).map((t) => t.d).join(""), { tone: "mid" }) +
      L(ticks.filter((t) => t.major).map((t) => t.d).join(""), { tone: "hi" }) +
      S(cyl(cx, cy, GAIN.skirt, GAIN_Z.skirt, 2, 52, 0.4), { tone: "mid" }) +
      S(cyl(cx, cy, GAIN.knob, GAIN_Z.knob, 6, 48), { tone: "hi", crease: "lo" }) +
      L(k.knurl(cx, cy, GAIN.knob, GAIN_Z.knob, GAIN_Z.knob + 6, 40, P), { tone: "lo" }) +
      S(cyl(cx, cy, GAIN.cap, GAIN_Z.cap, 1, 32, 0.3), { tone: "hi", crease: "lo" }) +
      livePath("av-pointer", "gain", GAIN_AFF, GAIN_R, gainAngle(GAINS[state.gain])) +
      D([at([cx, cy, GAIN_Z.top])], { size: 0.55, tone: "hi" });
    const mark = markAt(GSTAR[state.def][state.rate]);
    const marks = GAINS.map((g) => markAt(g).map(f2).join(",")).join(" ");
    const marker = `<g class="av-mark" data-av="mark" data-marks="${marks}" data-x="${f2(mark[0])}" data-y="${f2(mark[1])}">${D([mark], { size: 0.85, tone: "hi" })}</g>`;
    put("hv.gain", [cx, cy, GAIN_Z.knob], svg + marker, [sCyl(cx, cy, GAIN.plate, GAIN_Z.plate, 0.8), sCyl(cx, cy, GAIN.skirt, GAIN_Z.skirt, 2), sCyl(cx, cy, GAIN.knob, GAIN_Z.knob, 6), sCyl(cx, cy, GAIN.cap, GAIN_Z.cap, 1)]);
  }
  // target-rate selector: four positions, 1, 2, 4 and 8 x 1e-5
  {
    const [cx, cy] = RATE.at;
    const ring = topAffine(RATE.at, CASE_TOP, 1);
    const ticks = RATE_ANGLES.map((t) => segD(pointOn(ring, t, RATE.r + 1), pointOn(ring, t, RATE.r + 2.8))).join("");
    const base = cyl(cx, cy, RATE.r + 3.4, CASE_TOP, 0.6, 32, 0.3);
    const svg =
      S(base, { tone: "lo" }) +
      L(k.ring(cx, cy, RATE.r + 1, CASE_TOP + 0.6, P, 40), { tone: "faint" }) +
      L(ticks, { tone: "mid" }) +
      S(cyl(cx, cy, RATE.r, CASE_TOP + 0.6, RATE.top - CASE_TOP - 0.6, 28), { tone: "mid" }) +
      L(k.knurl(cx, cy, RATE.r, CASE_TOP + 0.6, RATE.top, 22, P), { tone: "lo" }) +
      livePath("av-pointer", "rate", RATE_AFF, RATE_R, RATE_ANGLES[state.rate]);
    put("hv.rate", [cx, cy, CASE_TOP + 2], `<g data-hit="rate">${svg}</g>`, [sCyl(cx, cy, RATE.r + 3.4, CASE_TOP, 0.6), sCyl(cx, cy, RATE.r, CASE_TOP + 0.6, RATE.top - CASE_TOP - 0.6)]);
  }
  // coincidence meter: the needle reads b_tot, the faint reference pointer b_tot,perm, so the gap between them is delta b.
  // Scale 0.25 to 1.75, a tick every 0.05, a major every 0.25 and the 1.00 criterion mark straight up
  {
    const [cx, cy] = METER.at;
    const face = METER.top - 0.6;
    const ticks = { lo: [], mid: [], hi: [] };
    for (let i = 0; i <= 30; i++) {
      const v = 0.25 + i * 0.05;
      const tone = i === 15 ? "hi" : i % 5 === 0 ? "mid" : "lo";
      const len = { lo: 1.1, mid: 2.1, hi: 2.9 }[tone];
      ticks[tone].push(segD(pointOn(METER_AFF, meterAngle(v), METER.r - 2.4), pointOn(METER_AFF, meterAngle(v), METER.r - 2.4 - len)));
    }
    const row = condOf(state);
    const svg =
      S(cyl(cx, cy, METER.r, CASE_TOP, METER.top - CASE_TOP, 52, 0.6), { tone: "mid" }) +
      L(k.sideArc(cx, cy, METER.r, CASE_TOP + 2, P, 40), { tone: "faint" }) +
      S(cyl(cx, cy, METER.r - 1.8, face, 0.01, 48), { tone: "hi", crease: "none", flat: true }) +
      L(k.ring(cx, cy, METER.r - 2.4, face, P, 56), { tone: "lo" }) +
      L(ticks.lo.join(""), { tone: "lo" }) +
      L(ticks.mid.join(""), { tone: "mid" }) +
      L(ticks.hi.join(""), { tone: "hi" }) +
      livePath("av-ref", "ref", METER_AFF, REF_R, meterAngle(row.bPerm), ' data-free="both"', "mid") +
      livePath("av-needle", "meter", METER_AFF, METER_R, meterAngle(state.shuffled ? row.bPerm : row.bTot), ' data-free="both"') +
      L(k.ring(cx, cy, 1.1, face, P, 16), { tone: "mid" });
    put("hv.meter", [cx, cy, CASE_TOP + 2.5], svg, [sCyl(cx, cy, METER.r, CASE_TOP, METER.top - CASE_TOP)]);
  }
  // toggles: spike definition, and the shuffle null behind a guard
  for (const which of ["def", "null"]) {
    const [cx, cy] = TOGGLES[which];
    const guard = which === "null" ? 5.4 : 0;
    const plate = { x: cx - 5 - (guard ? 2.2 : 0), y: cy - 7.5, w: 10 + (guard ? 4.4 : 0), d: 15, r: 1 };
    let svg = S(slab(plate, CASE_TOP, 0.8, 2, 0.3), { tone: "lo" }) + D([at([cx, cy - 5.6, CASE_TOP + 0.8]), at([cx, cy + 5.6, CASE_TOP + 0.8])], { size: 0.5, tone: "mid" });
    const shapes = [sSlab(plate, CASE_TOP, 0.8)];
    svg += S(cyl(cx, cy, 2.2, CASE_TOP + 0.8, 1.2, 18), { tone: "mid" }) + S(cyl(cx, cy, 1.5, CASE_TOP + 2, 1.6, 16), { tone: "mid" });
    shapes.push(sCyl(cx, cy, 2.2, CASE_TOP + 0.8, 1.2), sCyl(cx, cy, 1.5, CASE_TOP + 2, 1.6));
    // guard posts flank the throw plane, wide enough that the lever clears them in both poses
    const post = (gx) => {
      shapes.push(sCyl(gx, cy, 0.9, CASE_TOP + 0.8, 6.4), sCyl(gx, cy, 1.25, CASE_TOP + 7.2, 0.8));
      return S(cyl(gx, cy, 0.9, CASE_TOP + 0.8, 6.4, 12), { tone: "mid", crease: "none" }) + S(cyl(gx, cy, 1.25, CASE_TOP + 7.2, 0.8, 12), { tone: "mid" });
    };
    const posts = guard ? [cx - guard, cx + guard].sort((a, b) => k.depthOf([a, cy, 0], P) - k.depthOf([b, cy, 0], P)) : [];
    if (guard) svg += post(posts[0]);
    const pivot = [cx, cy, CASE_TOP + 3.6];
    const on = which === "def" ? state.def === 1 : state.shuffled;
    const poses = [-1, 1].map((sign) => {
      const dir = [0, sign * Math.sin(BAT.tilt), Math.cos(BAT.tilt)];
      const F = G.frameAlong(pivot, dir);
      const bat = G.solidOf([[0, 0.9], [BAT.length - 1.2, 0.62]], F, P, { steps: 16 });
      const tip = G.add3(pivot, G.mul3(dir, BAT.length - 0.4));
      return { svg: S(bat, { tone: "hi", crease: "lo" }) + S(G.sphereOf(tip, 1.05, P, { steps: 12 }), { tone: "hi" }), shapes: [["solid", F, [[0, 0.9], [BAT.length - 1.2, 0.62]]], sBall(tip, 1.05)] };
    });
    const shown = on ? 1 : 0;
    // the pose away from the viewer (sign -1) and the near one, both kept; live shows one
    svg += poses.map((p, i) => `<g data-av="${which}" data-pose="${i}"${i === shown ? "" : ' opacity="0"'}>${p.svg}</g>`).join("");
    shapes.push(...poses[shown].shapes);
    if (guard) svg += post(posts[1]);
    put(`hv.${which}`, [cx, cy, CASE_TOP + 3], `<g data-hit="${which}">${svg}</g>`, shapes);
  }

  // ============================ harness: HV and signal coax from bulkhead connectors on the supply's top panel, through a
  // clamp on a cable stand, to the receptacles on the rack's side
  {
    const side = RACK.x + RACK.w;
    const shell = 2.8;
    const lines = [
      { name: "cable.hv", r: 1.0, y: HV_PORTS[0][1], bend: 7, sag: [0.7, 0.9] },
      { name: "cable.sig", r: 0.75, y: HV_PORTS[1][1], bend: 5.4, sag: [0.5, 1.1] },
    ];
    // a clamped coax droops between its supports like a beam fixed at both ends: level where it is held, lowest midway
    const droop = (x0, x1, y, z, sag, n = 8) => Array.from({ length: n }, (_, i) => {
      const u = (i + 1) / n;
      return [x0 + (x1 - x0) * u, y, z - 16 * sag * u * u * (1 - u) * (1 - u)];
    });
    const clampX = [STAND_POST[0] + 1.6, STAND_POST[0] - 1.6];
    for (const [i, line] of lines.entries()) {
      const [px] = HV_PORTS[i];
      // bulkhead connector on the panel: hex nut, body, then the plug's knurled shell, the cable leaving it upward
      const nut = cyl(px, line.y, 2.9, CASE_TOP, 0.8, 6);
      const body = cyl(px, line.y, 2.0, CASE_TOP + 0.8, 2.4, 16);
      const plug = cyl(px, line.y, 2.4, PORT_TOP - 3, 3, 18);
      const svg0 = S(nut, { tone: "mid" }) + S(body, { tone: "mid", crease: "none" }) + S(plug, { tone: "mid" }) + L(k.knurl(px, line.y, 2.4, PORT_TOP - 3, PORT_TOP, 14, P), { tone: "lo" });
      put(`${line.name}.port`, [px, line.y, CASE_TOP + 3], svg0, [sCyl(px, line.y, 2.9, CASE_TOP, 0.8), sCyl(px, line.y, 2.0, CASE_TOP + 0.8, 2.4), sCyl(px, line.y, 2.4, PORT_TOP - 3, 3)]);
      // receptacle on the rack: flange on the face, the plug shell along +x
      const F = G.frameAlong([side, line.y, RACK_PORT_Z], X);
      const svg1 = S(G.disc(0, 0.7, 3.3, F, P, { steps: 20 }), { tone: "lo" }) + S(G.disc(0.7, shell, line.r + 1.1, F, P, { steps: 20 }), { tone: "mid" }) + S(G.disc(shell * 0.45, shell * 0.7, line.r + 1.45, F, P, { steps: 20 }), { tone: "mid" });
      put(`${line.name}.rack`, [side + 1.4, line.y, RACK_PORT_Z], svg1, [sDisc(F, 0, 0.7, 3.3), sDisc(F, 0.7, shell, line.r + 1.1), sDisc(F, shell * 0.45, shell * 0.7, line.r + 1.45)]);
      // up out of the plug, round a wide bend, a droop to the clamp, level through it, a droop to the receptacle
      const R0 = line.bend;
      const zc = RACK_PORT_Z - R0;
      const points = [[px, line.y, PORT_TOP], [px, line.y, zc]];
      for (let j = 1; j <= 12; j++) {
        const a = (j / 12) * (Math.PI / 2);
        points.push([px - R0 + R0 * Math.cos(a), line.y, zc + R0 * Math.sin(a)]);
      }
      points.push(...droop(px - R0, clampX[0], line.y, RACK_PORT_Z, line.sag[0]), [clampX[1], line.y, RACK_PORT_Z], ...droop(clampX[1], side + shell, line.y, RACK_PORT_Z, line.sag[1]));
      // gapped where the clamp block wraps it, so each run ends flat on one of its faces
      const through = crossingsOf(points, [STAND_POST[0], line.y, RACK_PORT_Z], X, 4)[0];
      routes.push({ name: line.name, points, r: line.r, gaps: [[through - 1.6, through + 1.6]] });
    }
    // the cable stand: a round foot on the bench, a post, and a split clamp block both cables pass through
    const [sx, sy] = STAND_POST;
    const clamp = { x: sx - 1.6, y: HV_PORTS[0][1] - 3.4, w: 3.2, d: HV_PORTS[1][1] - HV_PORTS[0][1] + 6.8, r: 0.6 };
    const cz = RACK_PORT_Z - 2.6;
    const svg =
      S(cyl(sx, sy, 5, 0, 1.6, 24, 0.4), { tone: "lo" }) +
      D([0, 2.1, 4.2].map((a) => at([sx + 3.6 * Math.sin(a), sy - 3.6 * Math.cos(a), 1.6])), { size: 0.4 }) +
      S(cyl(sx, sy, 2.2, 1.6, 1.4, 16), { tone: "mid" }) +
      S(cyl(sx, sy, 1.3, 3, cz - 3, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(sx, sy, 1.3, 20, P, 10), { tone: "faint" }) }) +
      S(slab(clamp, cz, 5.2, 2, 0.3), { tone: "mid", inner: L(k.sideSeam(clamp, cz + 2.6, P, 2), { tone: "faint" }) }) +
      D([at([sx, clamp.y + 1.2, cz + 5.2]), at([sx, clamp.y + clamp.d - 1.2, cz + 5.2])], { size: 0.45 });
    put("harness.stand", [sx, sy, 20], svg, [sCyl(sx, sy, 5, 0, 1.6), sCyl(sx, sy, 2.2, 1.6, 1.4), sCyl(sx, sy, 1.3, 3, cz - 3), sSlab(clamp, cz, 5.2)]);
  }

  return { items, routes, defs };
}

// cable chunks, each its own painter's item
export const CHUNK = 12;
export function cablePieces(route) {
  return tubePieces(route.points, route.r, P, { maxLength: CHUNK, gaps: route.gaps || [] }).map((piece) => ({ piece, svg: tubeSvg(piece, { tone: "mid" }) }));
}
