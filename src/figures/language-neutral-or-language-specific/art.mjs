// Fig 5: an acrylic slice model of the brain on lazy tongs, the optical bench that splits each sentence vector into a shared
// and a language-specific part, an X-Y recorder and a meter desk. Pure ESM; runs at build time.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as A from "../kit/audit.mjs";
import * as Wd from "./world.mjs";
import * as Md from "./model.mjs";
import * as Pt from "./parts.mjs";
import BRAIN from "./brain.mjs";
import { ORDER } from "./order.mjs";

const { P, W, H, PLATE, PLATE_H, FOOT_H, RC, SLAB, BASE, PLINTH, HUB, TAB, POST_R, POST_TOP, ZB, G_FAN, G_REST, TONG, LEVER, SELECT, ACROSS, TOWARD } = Wd;
const { BB, BEAM_Z, ROW_X, LAMP_Y, SLIDE_Y, SLIDE_LIFT, BUS_S, BUS_P, PICK_X, COUPLER_X, MIRROR, BRIDGE, RODS, REC, PAPER, CHART, DESK, METERS, METER_R } = Wd;
const { FACE_N, FACE_DIR, BED_N, BED_DIR, facePt, bedPt, plateZ, postXY, tongHalf } = Wd;

// The fan is the one assembly that moves in the audit: share 0 is the build (lever up, plates fanned), share 1 the stacked pose.
export const FAN_SPRING = { stagger: 0, stiffness: 40, damping: 12.65 };
const moveOf = (i) => [0, 0, plateZ(i, G_REST) - plateZ(i, G_FAN)];

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 10) / 10;
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const neg = (a) => [-a[0], -a[1], -a[2]];
const add = G.add3;
const mul = G.mul3;
const fx = (o) => G.frameOf(o, X, Y, Z);
const fmx = (o) => G.frameOf(o, neg(X), Y, Z);
const fy = (o) => G.frameOf(o, Y, X, Z);
const fmy = (o) => G.frameOf(o, neg(Y), X, Z);
const fz = (o) => G.frameOf(o, Z, X, Y);
const fT = (o) => G.frameOf(o, TOWARD, ACROSS, Z);
const tip = (F, s) => add(F.o, mul(F.a, s));
const planOf = ([x0, y0], [x1, y1], r) => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
const matrix = (m) => `matrix(${m.join(" ")})`;
const circle2 = (c, r, n = 16) => Array.from({ length: n }, (_, j) => [c[0] + r * Math.cos((j / n) * 2 * Math.PI), c[1] + r * Math.sin((j / n) * 2 * Math.PI)]);
const hexPoly = (r) => Array.from({ length: 6 }, (_, i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);
const stadium2 = (u0, u1, z0, z1, n = 5) => {
  const r = (z1 - z0) / 2;
  const zc = (z0 + z1) / 2;
  const out = [];
  for (let i = 0; i <= n; i++) out.push([u1 - r + r * Math.cos(-Math.PI / 2 + (i / n) * Math.PI), zc + r * Math.sin(-Math.PI / 2 + (i / n) * Math.PI)]);
  for (let i = 0; i <= n; i++) out.push([u0 + r + r * Math.cos(Math.PI / 2 + (i / n) * Math.PI), zc + r * Math.sin(Math.PI / 2 + (i / n) * Math.PI)]);
  return out;
};

// The acrylic plate's plan, about RC: a rounded rectangle with an orientation notch at the anterior (+y) edge on the midline.
export function slabRing() {
  const ring = k.roundedPlan({ x: -SLAB.w / 2, y: -SLAB.d / 2, w: SLAB.w, d: SLAB.d, r: SLAB.r }, 2);
  const [u0] = Wd.brainUV(0, 0);
  const v1 = SLAB.d / 2;
  const n = SLAB.notch;
  const out = [];
  for (let j = 0; j < ring.length; j++) {
    out.push(ring[j]);
    const a = ring[j];
    const b = ring[(j + 1) % ring.length];
    if (Math.abs(a[1] - v1) < 1e-6 && Math.abs(b[1] - v1) < 1e-6 && (a[0] - u0) * (b[0] - u0) < 0) {
      const s = Math.sign(b[0] - a[0]);
      out.push([u0 - s * n, v1], [u0, v1 - n * 0.9], [u0 + s * n, v1]);
    }
  }
  return out;
}
// A tab from a plate corner to its hub, in plan about RC: it overlaps the corner and ends on the hub's round face.
export function tabRing(side) {
  const sgn = side ? 1 : -1;
  const c = [sgn * (SLAB.w / 2), -sgn * (SLAB.d / 2)];
  const d = [sgn * Math.SQRT1_2, -sgn * Math.SQRT1_2]; // from the corner out to the post
  const nn = [Math.SQRT1_2, Math.SQRT1_2];
  const h = Wd.POSTS[side];
  const w = TAB.w;
  const f0 = Math.asin(w / HUB.r);
  const out = [[c[0] - d[0] * TAB.over - nn[0] * w, c[1] - d[1] * TAB.over - nn[1] * w]];
  for (let j = 0; j <= 6; j++) {
    const f = -f0 + (j / 6) * 2 * f0;
    out.push([h[0] - d[0] * HUB.r * Math.cos(f) + nn[0] * HUB.r * Math.sin(f), h[1] - d[1] * HUB.r * Math.cos(f) + nn[1] * HUB.r * Math.sin(f)]);
  }
  out.push([c[0] - d[0] * TAB.over + nn[0] * w, c[1] - d[1] * TAB.over + nn[1] * w]);
  return out;
}
const world = (ring) => ring.map(([u, v]) => [RC[0] + u, RC[1] + v]);

export function scene() {
  const R = A.recorder(P, { order: ["fan"], spring: FAN_SPRING });
  const put = (name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) => R.put({ name, at: ref, bias, svg, shapes, ...rest });
  const record = R.solid;

  function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0, steps = 2, bevel = 0, extra = "", inner = "", attrs, bias = 0 } = {}) {
    const plan = planOf([x0, y0], [x1, y1], r < 0.6 ? 0 : r);
    const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
    put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { attrs, bias });
    return shape;
  }
  function cyl(name, cx, cy, r, z0, z1, style = {}, { steps: given, bevel = 0, extra = "", inner = "", attrs, bias = 0 } = {}) {
    const steps = Math.min(given ?? 64, Math.max(10, Math.round(r * 4)));
    const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
    put(name, [cx, cy, (z0 + z1) / 2], S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { attrs, bias });
    return shape;
  }
  function turnedOf(name, F, profile, style = {}, { extra = "", inner = "", smooth = "auto", steps: given, meta = {} } = {}) {
    const s0 = profile[0][0];
    const s1 = profile[profile.length - 1][0];
    const most = Math.max(...profile.map(([, r]) => r));
    const steps = given ?? Math.min(28, Math.max(10, Math.round(most * 3)));
    const shape = record(A.solid(F, profile, { name, ...meta }));
    return { svg: S(G.solidOf(profile, F, P, { steps, smooth }), { tone: "mid", ...style, inner }) + extra, shape, ref: tip(F, (s0 + s1) / 2) };
  }
  function turned(name, F, profile, style = {}, options = {}) {
    const { svg, shape, ref } = turnedOf(name, F, profile, style, options);
    put(name, ref, svg, [shape], { attrs: options.attrs, bias: options.bias ?? 0 });
    return shape;
  }
  const disc = (name, F, s0, s1, r, style, options) => turned(name, F, [[s0, r], [s1, r]], style, options);
  function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", attrs, bias = 0 } = {}) {
    const shape = record(A.prism(F, poly, s0, s1, { name }));
    const cu = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cv = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    put(name, add(add(tip(F, (s0 + s1) / 2), mul(F.u, cu)), mul(F.v, cv)), S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra, [shape], { attrs, bias });
    return shape;
  }
  const CABLES = [];
  function cable(name, points, r = 0.7, { tone = "mid", bend = 3, maxLength = 22 } = {}) {
    const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    R.route(name, route, r, { limp: true });
    CABLES.push(name);
    tubePieces(route, r, P, { maxLength, spacing: 1.6 }).forEach((piece, index) =>
      put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: name, chunk: index }),
    );
    return route;
  }
  // a post in a holder on a clamp fork, standing on the breadboard
  function opticPost(name, x, y, z1, { r = 1.3, holder = 2.3, hz = 13 } = {}) {
    box(`${name}.fork`, [x - 3.2, y - 3.2, BB.z1], [x + 3.2, y + 3.2, BB.z1 + 1.2], { tone: "lo" }, { extra: Dots([at([x - 2.2, y + 2.2, BB.z1 + 1.2]), at([x + 2.2, y - 2.2, BB.z1 + 1.2])], { size: 0.4 }) });
    // the post holder, with the faint ring of its lock collar, and the post in it
    cyl(`${name}.holder`, x, y, holder, BB.z1 + 1.2, hz, { tone: "mid" }, { steps: 10, inner: Ln(k.sideArc(x, y, holder, hz - 1.4, P, 16), { tone: "faint" }) });
    cyl(`${name}.post`, x, y, r, hz, z1, { tone: "mid" }, { steps: 8 });
  }

  // ---------------------------------------------------------------- bench
  const back = [];
  {
    record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "bench", ground: true }, 8));
    back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
    const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    // three feet show; the fourth, under the far corner, is hidden by the slab and not drawn
    const far = (x, y) => x < PLATE.x + PLATE.w / 2 && y < PLATE.y + PLATE.d / 2;
    for (const [x, y] of byDepth(k.corners(PLATE, 14)).filter(([x, y]) => !far(x, y))) {
      back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 16), { tone: "lo" }));
      back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 16), { tone: "mid" }));
    }
    back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4.4, P, 8), { tone: "faint" }) }));
    back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 8), { tone: "faint" }));
    const screws = k.corners(PLATE, 10);
    back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    back.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    // ruler strip along the front-left edge, in front of the slice model
    const strip = { x: -54, y: 68, w: 124, d: 6, r: 1 };
    back.push(S(k.slabOf(strip, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + strip.d, 0.7, [-1.8, -3.6], P);
    back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
    // the label plate at the front corner, with the maker's mark and three rule lines
    const lp = { x: 96, y: 58, w: 44, d: 11, r: 1.2 };
    back.push(S(k.slabOf(lp, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
    back.push(Ln(k.planOutline(k.insetPlan(lp, 1.3), 0.8, P, 3), { tone: "faint" }));
    back.push(k.faceTextSvg(k.topMatrix([lp.x + 3.6, lp.y + 7.4], 0.8, P, "x"), "AU-5", { size: 3.4, tone: "mid" }));
    const rule = (v, w) => Ln(k.lineOnTop([lp.x + 16, lp.y + v], [lp.x + 16 + w, lp.y + v], 0.8, P), { tone: "lo", free: true });
    back.push(rule(3.0, 22), rule(5.5, 16), rule(8.0, 19));
    back.push(Dots([at([lp.x + 2, lp.y + 2, 0.8]), at([lp.x + lp.w - 2, lp.y + lp.d - 2, 0.8])], { size: 0.42 }));
  }

  // ---------------------------------------------------------------- the slice model: plinth, base block, controls
  const [cx, cy] = RC;
  const baseX0 = cx - BASE.u;
  const baseX1 = cx + BASE.u;
  const baseY0 = cy - BASE.v;
  const baseY1 = cy + BASE.v;
  const PORT_X = { s: cx - 12, p: cx - 4 }; // the fibre ports on the left face, SHARED and SPECIFIC
  {
    box("rack.plinth", [cx - PLINTH.u, cy - PLINTH.v, 0], [cx + PLINTH.u, cy + PLINTH.v, PLINTH.z1], { tone: "lo" }, {
      r: PLINTH.r,
      steps: 4,
      bevel: 0.5,
      extra: Dots(k.corners(planOf([cx - PLINTH.u, cy - PLINTH.v], [cx + PLINTH.u, cy + PLINTH.v], 0), 1.6).map(([x, y]) => at([x, y, PLINTH.z1])), { size: 0.42 }),
      bias: -40,
    });
    const plan = planOf([baseX0, baseY0], [baseX1, baseY1], BASE.r);
    const top = BASE.z1;
    const groove = Ln(k.planOutline(k.insetPlan(plan, 4), top, P, 3), { tone: "faint" });
    const screws = k.corners(plan, 7.5);
    const screwRings = Ln(screws.map(([x, y]) => k.ring(x, y, 1.7, top, P, 14)).join(""), { tone: "lo" });
    // vent slots on the right face, between the fibre side and the lever
    const vents = [];
    for (let i = 0; i < 8; i++) {
      const y = cy + 46 - i * 5;
      const ring = [];
      for (let j = 0; j <= 14; j++) {
        const t = (j / 14) * 2 * Math.PI;
        ring.push([baseX1 + 0.02, y + 0.9 * Math.cos(t), 11 + (Math.sin(t) > 0 ? 3.4 : -3.4) + 0.9 * Math.sin(t)]);
      }
      vents.push(path3(ring, true));
    }
    box("rack.base", [baseX0, baseY0, BASE.z0], [baseX1, baseY1, BASE.z1], { tone: "mid" }, {
      r: BASE.r,
      steps: 3,
      bevel: 1.1,
      inner: Ln(k.sideSeam(plan, BASE.z0 + 3.6, P, 3), { tone: "faint" }),
      extra: groove + screwRings + Dots(screws.map(([x, y]) => at([x, y, top])), { size: 0.5 }) + Ln(vents.join(""), { tone: "lo" }),
      bias: -30,
    });

    // the component selector on the left face: a dial plate with three detents and a knurled knob
    const sf = fy([SELECT.x, baseY1, SELECT.z]);
    const dialTicks = Pt.SELECT_ANGLES.map((deg) => {
      const a = (deg * Math.PI) / 180;
      const p = (r) => [SELECT.x - r * Math.cos(a), baseY1 + 0.92, SELECT.z + r * Math.sin(a)];
      return path3([p(SELECT.r + 1.2), p(SELECT.r + 2.9)]);
    });
    disc("rack.select-dial", sf, 0, 0.9, SELECT.r + 3.4, { tone: "lo" }, { extra: Ln(dialTicks.join(""), { tone: "mid" }) });
    const pointer = `<path class="iso-line" data-tone="hi" data-part="select-pointer" d="${Pt.selectorPointer(Pt.SELECT_ANGLES[0])}"/>`;
    turned("rack.select-knob", sf, [[0.9, SELECT.r], [3.6, SELECT.r], [4.4, SELECT.r - 0.9], [4.6, SELECT.r - 1.5]], { tone: "mid" }, {
      extra: Ln(G.ribsOf(sf, 1.1, 3.4, SELECT.r, 30, P, { least: 0.15 }), { tone: "lo" }) + pointer,
      attrs: ` data-part="select" tabindex="0" role="button" aria-label="Component selector: shared, specific, shared minus specific"`,
    });
    // the two fibre ports on the left face, SPECIFIC and SHARED
    for (const [name, x] of [["s", PORT_X.s], ["p", PORT_X.p]]) turned(`rack.port-${name}`, fy([x, baseY1, 9]), [[0, 3.1], [1.3, 3.1], [1.3, 2.1], [3.6, 2.1]], { tone: "mid" });
    // the lever quadrant on the right face: a sector plate with two stops, and the lever's hub
    const qf = fx([baseX1, LEVER.y, LEVER.z]);
    const sector = [[0, 0]];
    for (let deg = LEVER.rest - 10; deg <= LEVER.pulled + 10; deg += 8) sector.push([-10 * Math.cos((deg * Math.PI) / 180), 10 * Math.sin((deg * Math.PI) / 180)]);
    const stops = [LEVER.rest - 5, LEVER.pulled + 5].map((deg) => at([baseX1 + 0.82, LEVER.y - 8.2 * Math.cos((deg * Math.PI) / 180), LEVER.z + 8.2 * Math.sin((deg * Math.PI) / 180)]));
    const qTicks = [];
    for (let deg = LEVER.rest; deg <= LEVER.pulled + 0.1; deg += (LEVER.pulled - LEVER.rest) / 6) {
      const a = (deg * Math.PI) / 180;
      const p = (r) => [baseX1 + 0.82, LEVER.y - r * Math.cos(a), LEVER.z + r * Math.sin(a)];
      qTicks.push(path3([p(5.6), p(7.0)]));
    }
    prism("rack.quadrant", qf, sector, 0, 0.8, { tone: "lo" }, { extra: Ln(qTicks.join(""), { tone: "mid" }) + Dots(stops, { size: 0.6, tone: "mid" }) });
    // the lever's shaft: a stepped boss on the quadrant whose end face carries the arm
    const shaft = Pt.LEVER_X - baseX1 - Pt.LEVER_ARM;
    turned("rack.lever-hub", qf, [[0.8, 3.2], [1.7, 3.2], [1.7, 2.4], [shaft, 2.4]], { tone: "mid" });
    // the signal port on the right face feeds the recorder
    turned("rack.port-out", fx([baseX1, cy - 52, 9]), [[0, 3.2], [1.3, 3.2], [1.3, 2.2], [3.6, 2.2]], { tone: "mid" });
  }

  // ---------------------------------------------------------------- posts, foot rails and caps
  for (const side of [0, 1]) {
    const [px, py] = postXY(side);
    cyl(`stack.foot${side}`, px, py, 3.0, BASE.z1, BASE.z1 + 1.6, { tone: "mid" }, { bevel: 0.3, extra: Dots([at([px - 1.7, py + 1.7, BASE.z1 + 1.6])], { size: 0.38 }) });
    const post = record(A.cylinder(px, py, POST_R, BASE.z1 + 1.6, POST_TOP - BASE.z1 - 1.6, { name: `stack.post${side}` }));
    put(`stack.post${side}`, [px, py, BASE.z1], S(k.cylinder(px, py, POST_R, BASE.z1 + 1.6, POST_TOP - BASE.z1 - 1.6, P, 16), { tone: "mid", crease: "none" }), [post], { bias: -20 });
    // the cap nut and its washer
    cyl(`stack.washer${side}`, px, py, 3.2, POST_TOP, POST_TOP + 0.8, { tone: "lo" });
    prism(`stack.nut${side}`, fz([px, py, POST_TOP + 0.8]), hexPoly(2.9), 0, 2.4, { tone: "mid" }, { extra: Dots([at([px, py, POST_TOP + 3.2])], { size: 0.55, tone: "hi" }) });
    // the foot rail the tongs' bottom pivots slide in: a slotted bar on the base top, in the tong plane, and its clamp to the post
    const F = Pt.tongFrame(side);
    const rail = stadium2(-Pt.FOOT.u, Pt.FOOT.u, -1, 1);
    const Fr = G.frameOf(add(F.o, mul(TOWARD, (Pt.FOOT.s0 + Pt.FOOT.s1) / 2)), Z, ACROSS, TOWARD);
    const railPoly = rail.map(([u, v]) => [u, v * ((Pt.FOOT.s1 - Pt.FOOT.s0) / 2)]);
    const slot = G.frameOf(add(Fr.o, [0, 0, Pt.FOOT.z1 + 0.01]), Z, ACROSS, TOWARD);
    const slotRing = stadium2(-Pt.FOOT.u + 2.4, Pt.FOOT.u - 2.4, -0.5, 0.5).map(([u, v]) => at(add(add(slot.o, mul(ACROSS, u)), mul(TOWARD, v))));
    prism(`stack.rail${side}`, G.frameOf([Fr.o[0], Fr.o[1], Pt.FOOT.z0], Z, ACROSS, TOWARD), railPoly, 0, Pt.FOOT.z1 - Pt.FOOT.z0, { tone: "lo" }, {
      extra: Ln(k.pathOf(slotRing, true), { tone: "faint" }) + Dots([-Pt.FOOT.u + 1.2, Pt.FOOT.u - 1.2].map((u) => at(add(add(slot.o, mul(ACROSS, u)), [0, 0, 0]))), { size: 0.4 }),
      bias: -10,
    });
  }

  // ---------------------------------------------------------------- the plates and their hubs, moving with the fan
  for (let i = 0; i < 10; i++) {
    const z = plateZ(i, G_FAN);
    const move = moveOf(i);
    const ring = world(slabRing());
    const slab = record(A.extruded(ring, z - SLAB.t / 2, SLAB.t, { name: `stack.plate${i}` }));
    const tabs = [0, 1].map((side) => record(A.extruded(world(tabRing(side)), z + SLAB.t / 2, TAB.t, { name: `stack.tab${i}.${side}`, owner: `stack.plate${i}` })));
    put(`stack.plate${i}`, [cx, cy, z], plateSvg(i), [slab, ...tabs], { piece: "fan", move });
    for (const side of [0, 1]) {
      const [px, py] = postXY(side);
      const z0 = z - HUB.h / 2;
      const z1 = z + HUB.h / 2;
      const hub = record(A.ring(fz([px, py, 0]), z0, z1, POST_R, HUB.r, { name: `stack.hub${i}.${side}` }));
      // the collar, its front touching the tong's back layer at the centre pivot, and a stub of the post rising out of it
      const body = S(k.cylinder(px, py, HUB.r, z0, HUB.h, P, 12), { tone: "mid" }) + S(k.cylinder(px, py, POST_R, z1, 2.8, P, 8), { tone: "mid", crease: "none" });
      put(`stack.hub${i}.${side}`, [px, py, z], body, [hub], { piece: "fan", move, attrs: ` data-hub="${i}"` });
    }
  }

  // ---------------------------------------------------------------- the lazy tongs (live). Their shape changes with the fan, so the
  // audit sees each as the envelope it sweeps: the band of its plane between the widest and the tallest pose.
  for (const side of [0, 1]) {
    const F = Pt.tongFrame(side);
    const hw = tongHalf(G_REST) + TONG.w;
    const env = [[-hw, ZB - TONG.w], [hw, ZB - TONG.w], [hw, ZB + 10 * G_FAN + TONG.w], [-hw, ZB + 10 * G_FAN + TONG.w]];
    const bars = record(A.prism(F, env, TONG.off - TONG.t, TONG.off + TONG.t + 0.05, { name: `stack.tong${side}` }));
    // the slide blocks behind the bottom pivots travel along the rail between the fanned and the stacked width
    const u0 = tongHalf(G_FAN) - 2.2;
    const u1 = tongHalf(G_REST) + 2.2;
    const feet = [1, -1].map((sg, j) =>
      record(A.prism(F, [[sg * u0, Pt.FOOT.z1], [sg * u1, Pt.FOOT.z1], [sg * u1, ZB + 1.4], [sg * u0, ZB + 1.4]], Pt.FOOT.s0 + 0.4, TONG.off - TONG.t, { name: `stack.tong${side}.feet${j}`, owner: `stack.tong${side}` })),
    );
    put(`stack.tong${side}`, add(F.o, [0, 0, ZB + 5 * G_FAN]), tongSvg(side), [bars, ...feet], { bias: 5 });
  }

  // ---------------------------------------------------------------- the lever (live), recorded as the sector it sweeps
  {
    const o = [Pt.LEVER_X, LEVER.y, LEVER.z];
    const F = G.frameOf(o, X, neg(Y), Z);
    // the arm sweeps a thin annular sector, the ball a thicker band at its tip
    const band = (r0, r1, d0, d1) => {
      const out = [];
      for (let deg = d0; deg <= d1 + 1e-9; deg += (d1 - d0) / 12) out.push([r1 * Math.cos((deg * Math.PI) / 180), r1 * Math.sin((deg * Math.PI) / 180)]);
      for (let deg = d1; deg >= d0 - 1e-9; deg -= (d1 - d0) / 12) out.push([r0 * Math.cos((deg * Math.PI) / 180), r0 * Math.sin((deg * Math.PI) / 180)]);
      return out;
    };
    const tipR = LEVER.len + 0.6;
    const arm = record(A.prism(F, band(1.0, tipR - 1.6, LEVER.rest - 6, LEVER.pulled + 6), -Pt.LEVER_ARM, Pt.LEVER_ARM, { name: "live.lever" }));
    const eye = record(A.disc(fx(o), -Pt.LEVER_ARM, Pt.LEVER_ARM, 1.7, { name: "live.lever.eye", owner: "live.lever" }));
    const ball = record(A.prism(F, band(tipR - 2.3, tipR + 2.3, LEVER.rest - 8, LEVER.pulled + 8), -2.3, 2.3, { name: "live.lever.ball", owner: "live.lever" }));
    put("live.lever", o, leverSvg(), [arm, eye, ball], { bias: 1 });
  }

  // ---------------------------------------------------------------- the optical breadboard: the decomposition
  const bbPlan = { x: BB.x, y: BB.y, w: BB.w, d: BB.d, r: BB.r };
  // three feet show; the one under the far corner is hidden by the board
  for (const [x, y] of k.corners(bbPlan, 7).filter(([x, y]) => !(x < BB.x + BB.w / 2 && y < BB.y + BB.d / 2))) cyl(`bb.foot${x}${y}`, x, y, 3.2, 0, BB.z0, { tone: "lo" }, { steps: 8 });
  {
    const grid = k.dotGrid(BB.x + 5, BB.y + 5, 10, 8, 8.2, BB.z1, P);
    const screws = k.corners(bbPlan, 3.2);
    box("bb.plate", [BB.x, BB.y, BB.z0], [BB.x + BB.w, BB.y + BB.d, BB.z1], { tone: "mid" }, {
      r: BB.r,
      steps: 4,
      bevel: 0.7,
      inner: Ln(k.sideSeam(bbPlan, BB.z0 + 1.6, P, 4), { tone: "faint" }),
      extra: Dots(grid, { size: 0.38, tone: "lo" }) + Ln(screws.map(([x, y]) => k.ring(x, y, 1.3, BB.z1, P, 14)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, BB.z1])), { size: 0.42 }),
      bias: -30,
    });
  }
  // three lamp housings, EN, FR, ZH from the left: turned cans along -y with cooling fins and a lens bezel
  // three lamp housings, EN, FR, ZH from the left: a domed back with the cable gland, a finned body and the lens tube, along -y
  const LAMP = [[0, 2.6], [0.9, 3.9], [1.6, 4.4], [8.4, 4.4], [9.2, 3.8], [12.2, 3.8]];
  const LAMP_LEN = 12.2;
  ROW_X.forEach((x, r) => {
    const F = fmy([x, LAMP_Y + LAMP_LEN, BEAM_Z]);
    opticPost(`lamp${r}`, x, LAMP_Y + LAMP_LEN / 2, BEAM_Z - 4.0, { hz: 12 });
    turned(`lamp${r}.can`, F, LAMP, { tone: "mid" }, {
      steps: 12,
      extra: Ln(G.ribsOf(F, 2.4, 7.8, 4.4, 6, P, { least: 0.1 }), { tone: "lo" }) + Ln(G.circleOf(F, 0.02, 1.4, P, 12), { tone: "lo" }) + Dots([at(tip(F, 0.01))], { size: 0.5, tone: "mid" }),
    });
  });

  // the encoder slide: two guide rods, a top bar, and a frame with two rows of windows (round XLM-R-base, square NLLB-200 encoder)
  const SL = { z0: 10, z1: 32, x0: RODS[0] + 2.6, x1: RODS[1] - 2.6 };
  for (const x of RODS) cyl(`slide.rod-base${x}`, x, SLIDE_Y, 2.4, BB.z1, BB.z1 + 2.4, { tone: "mid" }, { bevel: 0.3 });
  box("slide.bar", [RODS[0] - 3, SLIDE_Y - 2.1, 49], [RODS[1] + 3, SLIDE_Y + 2.1, 52], { tone: "mid" }, { r: 0.8, extra: Dots(RODS.map((x) => at([x, SLIDE_Y, 52])), { size: 0.45 }) });
  {
    const yf = SLIDE_Y + 1.01;
    const roundWin = ROW_X.map((x) => path3(circle2([x, BEAM_Z], 2.6).map(([a, b]) => [a, yf, b]), true)).join("");
    const squareWin = ROW_X.map((x) => path3([[x - 2.3, yf, BEAM_Z - SLIDE_LIFT - 2.3], [x + 2.3, yf, BEAM_Z - SLIDE_LIFT - 2.3], [x + 2.3, yf, BEAM_Z - SLIDE_LIFT + 2.3], [x - 2.3, yf, BEAM_Z - SLIDE_LIFT + 2.3]], true)).join("");
    const frame = planOf([SL.x0, SLIDE_Y - 1], [SL.x1, SLIDE_Y + 1], 0);
    const bush = (x) => S(k.cylinder(x, SLIDE_Y, 2.0, SL.z0 + 6, 9, P, 12), { tone: "mid" }) + S(k.cylinder(x, SLIDE_Y, 1.0, SL.z0 + 15, 2.4, P, 8), { tone: "mid", crease: "none" });
    const arms = RODS.map((x, j) => S(k.slabOf(planOf([j ? SL.x1 : x + 1.7, SLIDE_Y - 0.8], [j ? x - 1.7 : SL.x0, SLIDE_Y + 0.8], 0), SL.z0 + 8, 5, P, 2), { tone: "mid" })).join("");
    const kx = (SL.x0 + SL.x1) / 2;
    const knob = S(k.cylinder(kx, SLIDE_Y, 2.0, SL.z1, 3.6, P, 18), { tone: "mid" }) + Ln(k.knurl(kx, SLIDE_Y, 2.0, SL.z1 + 0.5, SL.z1 + 3.1, 18, P), { tone: "lo" });
    const rods = RODS.map((x) => S(k.cylinder(x, SLIDE_Y, 1.0, BB.z1 + 2.4, 49 - BB.z1 - 2.4, P, 10), { tone: "mid", crease: "none" })).join("");
    const svg = arms + bush(RODS[0]) + S(k.slabOf(frame, SL.z0, SL.z1 - SL.z0, P, 2, 0.4), { tone: "mid" }) + `<path class="ls-glass" d="${roundWin}${squareWin}"/>` + Ln(roundWin + squareWin, { tone: "mid" }) + knob + bush(RODS[1]);
    const shapes = [
      record(A.slab(frame, SL.z0, SL.z1 - SL.z0 + SLIDE_LIFT, { name: "slide.frame" }, 2)),
      record(A.cylinder(kx, SLIDE_Y, 2.0, SL.z1 + SLIDE_LIFT, 3.6, { name: "slide.knob", owner: "slide.frame" })),
      ...RODS.map((x) => record(A.cylinder(x, SLIDE_Y, 1.0, BB.z1 + 2.4, 49 - BB.z1 - 2.4, { name: `slide.rod${x}`, owner: "slide.frame" }))),
      ...RODS.map((x) => record(A.cylinder(x, SLIDE_Y, 2.0, SL.z0 + 6, 9 + SLIDE_LIFT, { name: `slide.bush${x}`, owner: `slide.rod${x}` }))),
    ];
    put("live.slide", [kx, SLIDE_Y, (SL.z0 + SL.z1) / 2], `<g data-part="slide" tabindex="0" role="button" aria-label="Encoder slide: XLM-R-base or NLLB-200 encoder">${rods}<g data-move="slide">${svg}</g></g>`, shapes);
  }

  // two bridges carry the pop-up mirrors: one over the SPECIFIC bus (front), one over the SHARED bus (back)
  for (const [bus, by] of [["P", BUS_P], ["S", BUS_S]]) {
    // square uprights screwed to the board through a foot flange
    // the uprights stand behind the bus, clear of the light, and the bar reaches back over them
    const ly = by - 4.4;
    for (const x of [BRIDGE.x0 + 1.6, BRIDGE.x1 - 1.6]) {
      box(`bridge${bus}.flange${x}`, [x - 2.6, ly - 2.6, BB.z1], [x + 2.6, ly + 2.6, BB.z1 + 0.9], { tone: "lo" }, { extra: Dots([at([x - 1.8, ly + 1.8, BB.z1 + 0.9]), at([x + 1.8, ly - 1.8, BB.z1 + 0.9])], { size: 0.38 }) });
      box(`bridge${bus}.leg${x}`, [x - 1.4, ly - 1.4, BB.z1 + 0.9], [x + 1.4, ly + 1.4, BRIDGE.z0], { tone: "mid" });
    }
    box(`bridge${bus}.bar`, [BRIDGE.x0, ly - 1.8, BRIDGE.z0], [BRIDGE.x1, by + 2.1, BRIDGE.z1], { tone: "mid" }, { bevel: 0.3, extra: Dots([at([BRIDGE.x0 + 1.6, ly, BRIDGE.z1]), at([BRIDGE.x1 - 1.6, ly, BRIDGE.z1])], { size: 0.42 }) });
  }
  // the pop-up mirrors: each half-silvered cell hangs on a rod from a solenoid on its bridge; down puts it in the beam.
  // Light comes in along -y and leaves along +x, so every cell faces the viewer.
  const SOL_TOP = BRIDGE.z1 + 5.4;
  const TUBE_Z = BEAM_Z + MIRROR.r + MIRROR.lift + 0.4; // the guide tube's mouth, just above a raised cell
  const ROD_TOP = BRIDGE.z0 - MIRROR.lift; // the rod's top with the cell down; raised, it reaches the bridge's underside
  ROW_X.forEach((x, r) => {
    for (const [bus, by] of [["P", BUS_P], ["S", BUS_S]]) {
      const id = `${bus}${r}`;
      const lift = Pt.liftOf(bus, r, 0);
      const sol = planOf([x - 2.4, by - 2.4], [x + 2.4, by + 2.4], 0.7);
      const solShape = record(A.slab(sol, BRIDGE.z1, SOL_TOP - BRIDGE.z1, { name: `mirror${id}.solenoid`, owner: `bridge${bus}.bar` }, 2));
      const terminals = Dots([at([x - 1.2, by + 1.2, SOL_TOP]), at([x + 1.2, by - 1.2, SOL_TOP])], { size: 0.45 });
      put(`mirror${id}.solenoid`, [x, by, (BRIDGE.z1 + SOL_TOP) / 2], S(k.slabOf(sol, BRIDGE.z1, SOL_TOP - BRIDGE.z1, P, 2), { tone: "mid", inner: Ln(k.sideSeam(sol, BRIDGE.z1 + 2.0, P, 2), { tone: "faint" }) }) + terminals, [solShape]);
      const c = [x, by, BEAM_Z];
      const Fc = G.frameOf(c, TOWARD, ACROSS, Z);
      const cellTop = BEAM_Z + MIRROR.r - 0.4;
      const rod = S(k.cylinder(x, by, 0.6, cellTop, ROD_TOP - cellTop, P, 8), { tone: "mid", crease: "none" });
      // the guide tube the rod slides in, hanging from the bridge
      cyl(`mirror${id}.tube`, x, by, 1.0, TUBE_Z, BRIDGE.z0, { tone: "mid" }, { steps: 10 });
      const glass = G.circleOf(Fc, 1.02, MIRROR.r - 1.0, P, 14);
      const cell = S(G.solidOf([[-1.0, MIRROR.r - 0.5], [-0.5, MIRROR.r], [1.0, MIRROR.r]], Fc, P, { steps: 14 }), { tone: "hi", crease: "lo" }) + `<path class="ls-glass" d="${glass}"/>` + Ln(glass, { tone: "faint" }) + Dots([at(tip(Fc, 1.04))], { size: 0.4, tone: "mid" });
      const move = k.translateAlong(P, [0, 0, lift]);
      // the cell is recorded over its whole stroke, the rod where it is drawn (its top runs up inside the guide tube)
      const stroke = [];
      for (let j = 0; j <= 6; j++) stroke.push([MIRROR.r * Math.cos(Math.PI + (j / 6) * Math.PI), MIRROR.r * Math.sin(Math.PI + (j / 6) * Math.PI)]);
      for (let j = 0; j <= 6; j++) stroke.push([MIRROR.r * Math.cos((j / 6) * Math.PI), MIRROR.lift + MIRROR.r * Math.sin((j / 6) * Math.PI)]);
      const shapes = [record(A.prism(Fc, stroke, -1.0, 1.0, { name: `mirror${id}.cell`, owner: `mirror${id}.rod` })), record(A.cylinder(x, by, 0.6, cellTop + lift, ROD_TOP - cellTop, { name: `mirror${id}.rod`, owner: `mirror${id}.tube` }))];
      put(`live.mirror${id}`, c, `<g data-mirror="${id}" transform="${move}">${rod}${cell}</g>`, shapes);
    }
  });
  // the pick-off on the SHARED bus: a beam-splitter cube in a clamp that sends part of the shared beam back to the analyser
  {
    const s = Pt.CUBE;
    opticPost("pickoff", PICK_X, BUS_S, BEAM_Z - s - 1.4, { hz: 12 });
    box("pickoff.clamp", [PICK_X - s - 0.6, BUS_S - s - 0.6, BEAM_Z - s - 1.4], [PICK_X + s + 0.6, BUS_S + s + 0.6, BEAM_Z - s], { tone: "mid" });
    const diag = path3([[PICK_X - s, BUS_S + s, BEAM_Z + s], [PICK_X + s, BUS_S - s, BEAM_Z + s]]);
    box("pickoff.cube", [PICK_X - s, BUS_S - s, BEAM_Z - s], [PICK_X + s, BUS_S + s, BEAM_Z + s], { tone: "hi", crease: "lo" }, { extra: Ln(diag, { tone: "lo" }) });
  }
  // the analyser on the SPECIFIC bus: a graduated rotation mount locked crossed to the shared beam, which reaches it
  // through the reference port on its back; what passes is the part of the heard language the shared beam does not explain
  {
    const F = fx([PICK_X, BUS_P, BEAM_Z]);
    const AN = Pt.ANALYSER.half;
    opticPost("analyser", PICK_X, BUS_P, BEAM_Z - 7.2, { hz: 12 });
    turned("analyser.mount", F, [[-AN, 6.4], [-1.2, 6.4], [-1.2, 7.2], [1.2, 7.2], [1.2, 6.4], [AN, 6.4]], { tone: "mid" }, {
      extra: Ln(G.ribsOf(F, -1.0, 1.0, 7.2, 64, P, { least: 0.15 }), { tone: "faint" }) + Ln(G.spokesOf(F, AN + 0.02, 4.6, 6.2, 36, P), { tone: "lo" }),
    });
    const ring = G.circleOf(F, AN + 0.02, 2.8, P);
    put("analyser.window", tip(F, AN + 0.03), `<path class="ls-glass" d="${ring}"/>` + Ln(ring, { tone: "mid" }) + Dots([at(G.pointOf(F, AN + 0.03, 5.4, Math.PI / 2))], { size: 0.5, tone: "hi" }), [record(A.disc(F, AN, AN + 0.05, 2.8, { name: "analyser.window", owner: "analyser.mount" }))], { bias: 0.1 });
    // the reference port: a short barrel on the back of the mount, facing the pick-off
    turned("analyser.ref", fmy([PICK_X, BUS_P - 6.4, BEAM_Z]), [[0, 2.4], [1.7, 2.4], [1.7, 1.8], [2.2, 1.8]], { tone: "mid" }, { meta: { owner: "analyser.mount" } });
  }
  // fibre couplers at the bus ends, along +x
  for (const [bus, by] of [["P", BUS_P], ["S", BUS_S]]) {
    const F = fx([COUPLER_X, by, BEAM_Z]);
    opticPost(`coupler${bus}`, COUPLER_X + 2.4, by, BEAM_Z - 2.7, { hz: 12, r: 1.2 });
    turned(`coupler${bus}.tube`, F, [[0, 2.5], [1.1, 2.5], [1.1, 2.0], [5.2, 2.0], [5.2, 2.7], [7.0, 2.7], [7.0, 1.4], [8.8, 1.4]], { tone: "mid" }, {
      extra: Ln(G.ribsOf(F, 5.4, 6.8, 2.7, 16, P, { least: 0.2 }), { tone: "lo" }),
    });
  }
  // the language switch: a small box with a three-position knob
  {
    const L = Pt.LANG_KNOB;
    box("switch.box", [L.x - 6.5, L.y - 6.5, BB.z1], [L.x + 6.5, L.y + 6.5, L.z1], { tone: "mid" }, {
      r: 1.4,
      steps: 3,
      bevel: 0.5,
      inner: Ln(k.sideSeam(planOf([L.x - 6.5, L.y - 6.5], [L.x + 6.5, L.y + 6.5], 1.4), BB.z1 + 2.2, P, 3), { tone: "faint" }),
      extra: Dots(k.corners(planOf([L.x - 6.5, L.y - 6.5], [L.x + 6.5, L.y + 6.5], 0), 1.9).map(([x, y]) => at([x, y, L.z1])), { size: 0.42 }),
    });
    const dialTicks = Pt.LANG_ANGLES.map((deg) => {
      const a = (deg * Math.PI) / 180;
      return k.lineOnTop([L.x + Math.sin(a) * (L.dial - 1.7), L.y - Math.cos(a) * (L.dial - 1.7)], [L.x + Math.sin(a) * L.dial, L.y - Math.cos(a) * L.dial], L.z1 + 0.8, P);
    });
    cyl("switch.dial", L.x, L.y, L.dial, L.z1, L.z1 + 0.8, { tone: "lo" }, { extra: Ln(dialTicks.join(""), { tone: "mid" }) });
    cyl("switch.knob", L.x, L.y, L.r, L.z1 + 0.8, L.z1 + 4.2, { tone: "mid" }, {
      extra: Ln(k.knurl(L.x, L.y, L.r, L.z1 + 1.1, L.z1 + 3.9, 22, P), { tone: "lo" }) + `<path class="iso-line" data-tone="hi" data-part="lang-pointer" data-free="end" d="${Pt.langPointer(Pt.LANG_ANGLES[0])}"/>` + Dots([at([L.x, L.y, L.z1 + 4.2])], { size: 0.55, tone: "hi" }),
      attrs: ` data-part="lang" tabindex="0" role="button" aria-label="Language switch: EN, FR, ZH"`,
    });
  }
  // the beams: continuous runs between two optical parts, lit or dark by the switch settings
  for (const b of Pt.BEAMS) {
    const len = Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1]);
    const dir = [(b.to[0] - b.from[0]) / len, (b.to[1] - b.from[1]) / len];
    const from = [b.from[0] + dir[0] * (b.cut0 ?? 0), b.from[1] + dir[1] * (b.cut0 ?? 0)];
    const to = [b.to[0] - dir[0] * (b.cut1 ?? 0), b.to[1] - dir[1] * (b.cut1 ?? 0)];
    const lo = [Math.min(from[0], to[0]) - 0.25, Math.min(from[1], to[1]) - 0.25, BEAM_Z - 0.25];
    const hi = [Math.max(from[0], to[0]) + 0.25, Math.max(from[1], to[1]) + 0.25, BEAM_Z + 0.25];
    // where a run leaves or meets a face in view, the light makes a spot there
    const spots = [b.dot0 && b.from, b.dot1 && b.to].filter(Boolean).map((p) => at([p[0], p[1], BEAM_Z]));
    const spot = spots.length ? Dots(spots, { size: 0.55, tone: "hi" }) : "";
    put(`live.beam-${b.id}`, [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, BEAM_Z], `<g class="ls-ray" data-beam="${b.id}" style="--step:${b.step}"${b.on(0) ? "" : " data-off"}><path class="iso-line ls-beam" data-tone="hi" pathLength="1" d="${Pt.beamD(b)}"/>${spot}</g>`, [record(A.box(lo, hi, { name: `beam.${b.id}` }))], { bias: -0.05 });
  }

  // ---------------------------------------------------------------- fibres from the couplers round to the slice model's ports
  {
    // each fibre leaves its coupler along the bus, drops off the board's edge, runs along the bench and rises square into its port;
    // the SHARED fibre runs inside the SPECIFIC one, so they never cross
    const portP = tip(fy([PORT_X.p, baseY1, 9]), 3.6);
    const portS = tip(fy([PORT_X.s, baseY1, 9]), 3.6);
    const out = COUPLER_X + 8.8;
    cable("fibre.p", [[out, BUS_P, BEAM_Z], [-63, BUS_P, BEAM_Z], [-58, BUS_P + 4, 12], [-58, BUS_P + 8, 1.6], [-58, 64, 1.6], [portP[0], 64, 1.6], [portP[0], 61, 9], portP], 0.75, { tone: "mid", bend: 4 });
    cable("fibre.s", [[out, BUS_S, BEAM_Z], [-56, BUS_S, BEAM_Z], [-52, BUS_S + 4, 12], [-52, BUS_S + 8, 1.6], [-52, 59, 1.6], [portS[0], 59, 1.6], [portS[0], 57, 9], portS], 0.75, { tone: "mid", bend: 4 });
  }

  // ---------------------------------------------------------------- the X-Y recorder
  {
    const { x0, x1, y0, y1, panel } = REC;
    const top = bedPt(0, REC.bed)[2];
    const yTop = bedPt(0, REC.bed)[1];
    const profile = [[y1, 0], [y1, panel], [yTop, top], [yTop - 7, top], [y0, 28], [y0, 0]];
    const F = G.frameOf([x0, 0, 0], X, Y, Z);
    const cheekScrews = [[y1 - 3, 3], [y1 - 3, panel - 2.5], [y0 + 3, 3], [y0 + 3, 25], [yTop - 3.5, top - 3]].map(([y, z]) => at([x1, y, z]));
    const vents = [];
    for (let i = 0; i < 6; i++) {
      const yy = y0 + 9 + i * 3.2;
      vents.push(path3([[x1 + 0.01, yy, 5.5], [x1 + 0.01, yy, 20.5]]));
    }
    const ventBox = path3([[x1 + 0.01, y0 + 7.4, 5.5], [x1 + 0.01, y0 + 7.4 + 19.2, 5.5], [x1 + 0.01, y0 + 7.4 + 19.2, 20.5], [x1 + 0.01, y0 + 7.4, 20.5]], true);
    prism("rec.body", F, profile, 0, x1 - x0, { tone: "mid" }, { extra: Ln(vents.join(""), { tone: "lo" }) + Ln(ventBox, { tone: "faint" }) + Dots(cheekScrews, { size: 0.45 }) });
    // the paper on the bed, with its grid, axes and the middle-late window
    const bm = matrix(Wd.bedMatrix(0.05));
    const grid = [];
    for (let i = 0; i <= 10; i++) grid.push(`M${f2(Pt.chartA(i / 10))} ${CHART.b0}V${CHART.b1}`);
    for (let v = 0.02; v <= CHART.top + 1e-9; v += 0.02) grid.push(`M${CHART.a0} ${f2(Pt.chartB(v))}H${CHART.a1}`);
    const axes = `M${CHART.a0} ${CHART.b1}V${CHART.b0}H${CHART.a1}`;
    const band = Pt.polyD([[Pt.chartA(0.33), CHART.b0], [Pt.chartA(0.83), CHART.b0], [Pt.chartA(0.83), CHART.b1], [Pt.chartA(0.33), CHART.b1]]);
    const xt = [];
    for (let i = 0; i <= 12; i++) xt.push(`M${f2(Pt.chartA(i / 12))} ${CHART.b0}v${i % 6 === 0 ? -2.2 : -1.3}`);
    const yt = [];
    for (let v = 0; v <= CHART.top + 1e-9; v += 0.02) yt.push(`M${CHART.a0} ${f2(Pt.chartB(v))}h${Math.round(v * 100) % 10 === 0 ? -2.2 : -1.3}`);
    const paper = Pt.polyD([[PAPER.a0, PAPER.b0], [PAPER.a1, PAPER.b0], [PAPER.a1, PAPER.b1], [PAPER.a0, PAPER.b1]]);
    const clipsAt = [[PAPER.a0, PAPER.b0], [PAPER.a1, PAPER.b0], [PAPER.a1, PAPER.b1], [PAPER.a0, PAPER.b1]];
    const paperSvg = `<g transform="${bm}"><path class="ls-paper" d="${paper}"/><path class="ls-band" d="${band}"/><path class="iso-line" data-tone="faint" d="${grid.join("")}"/><path class="iso-line" data-tone="mid" d="${axes}${xt.join("")}${yt.join("")}"/><path class="iso-line" data-tone="lo" d="${paper}"/></g>`;
    const paperShape = record(A.prism(G.frameOf(bedPt(0, 0, 0), BED_N, X, BED_DIR), [[PAPER.a0, PAPER.b0], [PAPER.a1, PAPER.b0], [PAPER.a1, PAPER.b1], [PAPER.a0, PAPER.b1]], 0, 0.1, { name: "rec.paper" }));
    clipsAt.forEach(([a, b], j) => {
      const Fc = G.frameOf(bedPt(a, b, 0), BED_N, X, BED_DIR);
      turned(`rec.clip${j}`, Fc, [[0, 2.0], [0.8, 2.0], [0.8, 1.1], [1.4, 1.1]], { tone: "mid" }, { steps: 8 });
    });
    for (const [name, b] of [["low", PAPER.b0 - 3.0], ["high", PAPER.b1 + 3.0]]) {
      const Fr = G.frameOf(bedPt(0, b, 0), X, BED_DIR, BED_N);
      prism(`rec.rail-${name}`, Fr, [[-1.2, 0], [1.2, 0], [1.2, 1.7], [-1.2, 1.7]], PAPER.a0 - 3.5, PAPER.a1 + 3.5, { tone: "mid" });
    }
    const row = Md.table[0];
    const cid = "ls-reveal";
    const repDepth = row.layer / 12;
    const plot = `<g transform="${bm}"><clipPath id="${cid}"><path data-part="reveal" d="${Pt.revealD(CHART.a1 + 2)}"/></clipPath><g clip-path="url(#${cid})"><path class="iso-line ls-trace" data-tone="hi" data-free="" data-part="trace-shared" d="${Pt.curveD(row.depth, row.shared)}"/><path class="iso-line ls-trace" data-tone="hi" data-dashed data-free="" data-part="trace-specific" d="${Pt.curveD(row.depth, row.specific)}"/></g><path class="iso-line" data-tone="hi" data-part="rep" data-free="end" d="M${f2(Pt.chartA(repDepth))} ${CHART.b1}v2.4"/></g>`;
    put("rec.paper", bedPt((PAPER.a0 + PAPER.a1) / 2, (PAPER.b0 + PAPER.b1) / 2, 0.05), paperSvg + plot, [paperShape], { bias: 0.05 });
    const a0 = Pt.chartA(1);
    const len = PAPER.b1 - PAPER.b0 + 8.4;
    const Fg = G.frameOf(bedPt(a0, PAPER.b0 - 4.2, 1.7), BED_DIR, X, BED_N);
    const arm = S(G.prismOf(Fg, [[-1.5, 0], [1.5, 0], [1.5, 1.9], [-1.5, 1.9]], 0, len, P), { tone: "mid" });
    const ends = [0, len - 2.4].map((s) => S(G.prismOf(G.frameOf(tip(Fg, s), BED_DIR, X, BED_N), [[-2.4, -1.3], [2.4, -1.3], [2.4, 2.4], [-2.4, 2.4]], 0, 2.4, P), { tone: "mid" })).join("");
    const b0 = Pt.chartB(row.shared[row.shared.length - 1]);
    const pen = S(G.prismOf(G.frameOf(bedPt(a0, b0 - 2.2, 1.5), BED_DIR, X, BED_N), [[-2.2, 0], [2.2, 0], [2.2, 3.2], [-2.2, 3.2]], 0, 4.4, P), { tone: "hi", crease: "lo" }) + S(G.solidOf([[0, 0.85], [1.5, 0.85], [2.2, 0.4]], G.frameOf(bedPt(a0, b0, 4.7), BED_N, X, BED_DIR), P), { tone: "mid" });
    const b1 = Pt.chartB(row.specific[row.specific.length - 1]);
    const pen2 = S(G.prismOf(G.frameOf(bedPt(a0, b1 - 1.7, 1.5), BED_DIR, X, BED_N), [[-1.8, 0], [1.8, 0], [1.8, 2.6], [-1.8, 2.6]], 0, 3.4, P), { tone: "mid" }) + S(G.solidOf([[0, 0.65], [1.1, 0.65], [1.8, 0.3]], G.frameOf(bedPt(a0, b1, 4.1), BED_N, X, BED_DIR), P), { tone: "mid" });
    const gShapes = [record(A.prism(G.frameOf(bedPt(0, 0, 0), BED_N, X, BED_DIR), [[CHART.a0 - 3, PAPER.b0 - 5.6], [a0 + 3, PAPER.b0 - 5.6], [a0 + 3, PAPER.b1 + 5.6], [CHART.a0 - 3, PAPER.b1 + 5.6]], 1.75, 6.4, { name: "live.gantry" }))];
    put("live.gantry", bedPt(a0, 22, 3), `<g data-part="gantry">${ends}${arm}<g data-part="pen2">${pen2}</g><g data-part="pen">${pen}</g></g>`, gShapes, { bias: 0.3 });
    // the lower panel: range knobs, the pen-lift lever, and the two signal ports
    [92, 104, 116].forEach((x, j) => {
      const Fk = fy([x, y1, 7.6]);
      turned(`rec.knob${j}`, Fk, [[0, 3.3], [0.6, 3.3], [0.6, 2.6], [3.0, 2.6], [3.6, 2.0], [3.8, 1.5]], { tone: "mid" }, {
        steps: 10,
        extra: Ln(G.ribsOf(Fk, 0.8, 2.8, 2.6, 16, P, { least: 0.15 }), { tone: "lo" }) + Ln(G.spokesOf(Fk, 0.62, 2.8, 3.3, 7, P, { from: Math.PI * 0.75, to: Math.PI * 2.25 }), { tone: "lo" }),
      });
    });
    turned("rec.port-in", fy([80, y1, 7.6]), [[0, 3.0], [1.2, 3.0], [1.2, 2.1], [3.6, 2.1]], { tone: "mid" });
    turned("rec.port-out", fy([138, y1, 7.6]), [[0, 3.0], [1.2, 3.0], [1.2, 2.1], [3.6, 2.1]], { tone: "mid" });
    turned("rec.lift", fy([128, y1, 7.6]), [[0, 1.7], [1.4, 1.7], [1.4, 0.8], [4.0, 0.6]], { tone: "mid" });
  }

  // ---------------------------------------------------------------- the meter desk
  {
    const { x0, x1, y0, y1, lip } = DESK;
    const topZ = Wd.DESK_TOP;
    const yTop = facePt(0, DESK.face)[1];
    const profile = [[y1, 0], [y1, lip], [yTop, topZ], [y0, topZ], [y0, 0]];
    prism("desk.body", G.frameOf([x0, 0, 0], X, Y, Z), profile, 0, x1 - x0, { tone: "mid" });
    const grow = [[y1 + 1.1, 0], [y1 + 1.1, lip + 0.7], [yTop + 0.6, topZ + 1.1], [y0 - 1.1, topZ + 1.1], [y0 - 1.1, 0]];
    for (const [name, x] of [["l", x0 - 2], ["r", x1]]) prism(`desk.cheek-${name}`, G.frameOf([x, 0, 0], X, Y, Z), grow, 0, 2, { tone: "mid" }, { extra: Dots([at([x + (name === "r" ? 2 : 0), y1 - 1.4, 2.4]), at([x + (name === "r" ? 2 : 0), y0 + 2, topZ - 2])], { size: 0.42 }) });
    const slots = [];
    for (let i = 0; i < 9; i++) slots.push(path3([[x0 + 16 + i * 3.6, yTop - 2.6, topZ], [x0 + 16 + i * 3.6, y0 + 2.6, topZ]]));
    put("desk.vents", [(x0 + x1) / 2, (yTop + y0) / 2, topZ + 0.01], Ln(slots.join(""), { tone: "lo" }), [record(A.box([x0 + 15, y0 + 2.6, topZ], [x0 + 18 + 8 * 3.6, yTop - 2.6, topZ + 0.02], { name: "desk.vents" }))], { bias: 0.02 });
    turned("desk.port", fmy([128, y0, 8]), [[0, 3.0], [1.2, 3.0], [1.2, 2.1], [3.6, 2.1]], { tone: "mid" });
    // three meters: semantic, auditory and control regions, middle-late shared - specific
    METERS.forEach(({ a, b }, j) => {
      const Fm = G.frameOf(facePt(a, b, 0), FACE_N, X, FACE_DIR);
      // a turned bezel; the dial sits flush in its face behind the glass, its bore shown by the ring round it
      const bezel = record(A.disc(Fm, 0, 1.3, METER_R + 1.3, { name: `desk.bezel${j}` }));
      const bezelSvg = S(G.solidOf([[0, METER_R + 1.3], [1.0, METER_R + 1.3], [1.3, METER_R + 1.0]], Fm, P, { steps: 18 }), { tone: "mid" });
      const ticks = [];
      for (let i = 0; i <= 10; i++) {
        const t = ((-120 + i * 24) * Math.PI) / 180;
        const r0 = METER_R - (i % 5 === 0 ? 2.4 : 1.6);
        ticks.push(`M${f2(a + Math.sin(t) * r0)} ${f2(b + Math.cos(t) * r0)}L${f2(a + Math.sin(t) * (METER_R - 0.9))} ${f2(b + Math.cos(t) * (METER_R - 0.9))}`);
      }
      const arc = [];
      for (let i = 0; i <= 40; i++) {
        const t = ((-120 + i * 6) * Math.PI) / 180;
        arc.push([a + Math.sin(t) * (METER_R - 0.9), b + Math.cos(t) * (METER_R - 0.9)]);
      }
      const dial = Pt.circleD([a, b], METER_R - 0.6);
      const screw = Pt.circleD([a, b - METER_R * 0.55], 0.8);
      const value = [Md.table[0].sem, Md.table[0].aud, Md.table[0].ctl][j];
      const dialSvg = `${bezelSvg}<g transform="${matrix(Wd.deskFaceMatrix(1.32))}"><path class="ls-dial" d="${dial}"/><path class="iso-line" data-tone="lo" d="${dial}"/><path class="iso-line" data-tone="mid" d="${Pt.lineD(arc)}${ticks.join("")}"/><path class="iso-line" data-tone="lo" d="${screw}M${f2(a - 0.55)} ${f2(b - METER_R * 0.55)}h1.1"/><path class="iso-line ls-needle" data-tone="hi" data-free="" data-part="needle${j}" d="${Pt.needleD(j, value)}"/><path class="ls-pin" d="${Pt.circleD([a, b], 0.75)}"/><path class="ls-glass" d="${dial}"/></g>`;
      put(`live.meter${j}`, facePt(a, b, 1.32), dialSvg, [bezel, record(A.disc(Fm, 1.3, 1.35, METER_R - 0.6, { name: `desk.dial${j}`, owner: `desk.bezel${j}` }))], { bias: 0.1 });
    });
  }

  // ---------------------------------------------------------------- cables: slice model to recorder, recorder to desk
  {
    const rackOut = tip(fx([baseX1, cy - 52, 9]), 3.6);
    const recIn = tip(fy([80, REC.y1, 7.6]), 3.6);
    const recOut = tip(fy([138, REC.y1, 7.6]), 3.6);
    const deskIn = tip(fmy([128, DESK.y0, 8]), 3.6);
    // both leave their port square, lie on the bench round the recorder's front-left corner, and rise square into the next port
    cable("cable.rec", [rackOut, add(rackOut, [5, 0, 0]), [71, rackOut[1], 1.4], [71, -20, 1.4], [recIn[0], -20, 1.4], [recIn[0], -23, recIn[2]], recIn], 0.8, { bend: 4 });
    cable("cable.desk", [recOut, [recOut[0], recOut[1] + 5, recOut[2]], [recOut[0], -21.4, 1.4], [recOut[0], -6, 1.4], [deskIn[0], -2, 1.4], [deskIn[0], 2.4, deskIn[2]], deskIn], 0.8, { bend: 4 });
  }

  return { R, back, cables: CABLES.length };
}

// ---------------------------------------------------------------- the tongs' markup: two layers of bars, the pins and the foot slide blocks
const KS = k.cameraOf(P).k;
function tongSvg(side) {
  const g = G_FAN;
  const pins = Pt.tongPins(side, g);
  return (
    `<g data-tong="${side}">` +
    Pt.fixedSolid(Pt.footBlocks(side, g), { tone: "mid", name: "tong-feet" }) +
    Pt.fixedSolid(Pt.tongLayer(side, g, "back"), { tone: "lo", crease: "none", name: "tong-back" }) +
    Pt.fixedSolid(Pt.tongLayer(side, g, "front"), { tone: "mid", crease: "none", name: "tong-front" }) +
    `<path class="ls-pin" data-part="tong-ends" d="${Pt.dotsD(pins.ends, 0.5 * KS)}"/><path class="ls-hubpin" data-part="tong-pins" d="${Pt.dotsD(pins.centres, 0.75 * KS)}"/>` +
    `</g>`
  );
}

function plateSvg(i) {
  const s = Md.slices[i];
  const b = BRAIN.slices[i];
  const zMid = plateZ(i, G_FAN);
  const top = zMid + SLAB.t / 2;
  const out = [`<g data-plate="${i}">`];
  out.push(S(k.extrude(world(slabRing()), zMid - SLAB.t / 2, SLAB.t, P), { tone: "mid", crease: "faint", className: "ls-acrylic" }));
  const n = s.cells.length / 2;
  const levels = Md.levelsOf(i);
  const geo = [];
  for (let c = 0; c < n; c++) geo.push(Md.ALPHA[s.cells[2 * c]], Md.ALPHA[s.cells[2 * c + 1]], Md.ALPHA[s.n[c]]);
  const cells = Pt.cellPaths(geo.join(""), levels, 0);
  const ringD = (r) => {
    let d = "";
    for (let j = 0; j < r.length; j += 2) {
      const [u, v] = Wd.brainUV(r[j], r[j + 1]);
      d += `${j ? "L" : "M"}${f2(u)} ${f2(v)}`;
    }
    return `${d}Z`;
  };
  const polysD = (list) => list.map((poly) => poly.map(ringD).join("")).join("");
  const brain = polysD(b.outline);
  const mid = b.midline.map(([y0, y1]) => `M0 ${f2(Wd.brainUV(0, y0)[1])}V${f2(Wd.brainUV(0, y1)[1])}`).join("");
  const fam = s.familyOutline;
  out.push(
    `<g transform="${matrix(Wd.plateMatrix(top))}">` +
      `<path class="iso-line" data-tone="lo" d="${brain}"/>` +
      (mid ? `<path class="iso-line ls-midline" data-tone="faint" d="${mid}"/>` : "") +
      `<g class="ls-cells" data-geo="${geo.join("")}" data-lv="${Pt.pack(levels)}"><g data-layer="a" data-show>${cells}</g><g data-layer="b"></g></g>` +
      `<path class="iso-line ls-fam" data-fam="semantic" data-tone="mid" d="${polysD(fam.semantic)}"/>` +
      `<path class="iso-line ls-fam" data-fam="auditory" data-tone="mid" d="${polysD(fam.auditory)}"/>` +
      `<path class="iso-line ls-fam" data-fam="control" data-tone="lo" d="${polysD(fam.control)}"/>` +
      `</g>`,
  );
  // the tabs that clamp the plate to its hubs, screwed to the corners
  for (const side of [0, 1]) {
    const ring = world(tabRing(side));
    const sgn = side ? 1 : -1;
    const c = [RC[0] + sgn * (SLAB.w / 2), RC[1] - sgn * (SLAB.d / 2)];
    const d = [sgn * Math.SQRT1_2, -sgn * Math.SQRT1_2];
    const screws = [-3.6, 1.4].map((t) => at([c[0] + d[0] * t, c[1] + d[1] * t, top + TAB.t]));
    out.push(S(k.extrude(ring, top, TAB.t, P), { tone: "mid", flat: true }) + Dots(screws, { size: 0.36 }));
  }
  out.push(`</g>`);
  return out.join("");
}

function leverSvg() {
  const lv = Pt.leverOf(Pt.leverAngle(1));
  return `<g data-part="lever" tabindex="0" role="button" aria-label="Fan lever">${Pt.fixedSolid(lv.arm, { tone: "mid", name: "lever-arm" })}${Pt.fixedSolid(lv.ball, { tone: "hi", crease: "faint", name: "lever-ball" })}${Dots([at([Pt.LEVER_X + Pt.LEVER_ARM + 0.02, LEVER.y, LEVER.z])], { size: 0.5, tone: "hi" })}</g>`;
}

export function build({ settle = false, order = ORDER } = {}) {
  const { R, back, cables } = scene();
  if (settle) A.settle(R, P);
  const rank = new Map(order.map((name, j) => [name, j]));
  const items = settle || !order.length ? R.items.slice().sort((a, b) => a.key - b.key) : R.items.slice().sort((a, b) => (rank.get(a.name) ?? 1e9) - (rank.get(b.name) ?? 1e9) || a.key - b.key);
  if (settle) R.items.sort((a, b) => a.key - b.key);
  const groups = items.map((item) => (item.attrs ? `<g${item.attrs}>${item.svg}</g>` : item.svg));
  const label =
    "An anatomical teaching model of the brain: ten etched acrylic plates on lazy tongs between two guide posts, beside an optical bench that splits each sentence vector into a part shared with the other two languages and a part specific to the heard language, an X-Y recorder and a desk of three meters. Each plate carries the outline of the brain and of the eighteen analysed regions at its height; the brightness of each etched cell is the held-out prediction score of the selected part, or shared minus specific, in that region.";
  const svg = k.figureSvg({ width: W, height: H, label, body: [...back, `<g class="ls-scene">${groups.join("")}</g>`] });
  return { R, P, svg, cables, items };
}

export const CAPTION =
  "The paper splits each sentence representation from XLM-R-base and the NLLB-200 encoder into a shared component built from the other two languages' translations and an orthogonal residual specific to the heard language, then fits both to fMRI from 94 people hearing Le Petit Prince in English, French or Chinese. Over the middle-late layers the shared component predicts the semantic regions better in all six model-by-language tests, by 0.019 to 0.061 in held-out Fisher z, and every test survives Holm correction. The shared advantage holds in every one of the 48 semantic ROI rows, also appears in auditory and superior temporal regions, and is smaller in control regions.";

// Shorter path data for the same points: absolute M/L paths become relative moves and lines in tenths,
// with h and v where a line runs level. Paths with finer numbers or other commands are left as they are.
const tenths = (t) => {
  const a = Math.abs(t);
  const body = a % 10 ? (a >= 10 ? `${Math.floor(a / 10)}.${a % 10}` : `.${a % 10}`) : `${a / 10}`;
  return (t < 0 ? "-" : "") + body;
};
function shortPath(d) {
  const tokens = d.match(/[MLZ]|-?\d*\.?\d+/g);
  if (!tokens || tokens.some((t) => /\.\d\d/.test(t))) return d;
  let out = "";
  let cmd = "";
  let open = "";
  const emit = (letter, nums) => {
    const implied = letter === open || (open === "m" && letter === "l");
    if (!implied) out += letter;
    nums.forEach((n, i) => {
      const text = tenths(n);
      if ((i > 0 || implied) && text[0] !== "-") out += " ";
      out += text;
    });
    open = letter === "m" ? "m" : letter;
  };
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let first = true;
  for (let i = 0; i < tokens.length; ) {
    let t = tokens[i];
    if (t === "M" || t === "L" || t === "Z") i++;
    else t = cmd === "M" ? "L" : cmd;
    cmd = t;
    if (t === "Z") {
      out += "z";
      open = "";
      cx = sx;
      cy = sy;
      continue;
    }
    const x = Math.round(+tokens[i] * 10);
    const y = Math.round(+tokens[i + 1] * 10);
    i += 2;
    if (t === "M") {
      if (first) {
        out += `M${tenths(x)}${y < 0 ? "" : " "}${tenths(y)}`;
        open = "M";
        first = false;
      } else emit("m", [x - cx, y - cy]);
      sx = x;
      sy = y;
    } else if (x === cx) emit("v", [y - cy]);
    else if (y === cy) emit("h", [x - cx]);
    else emit("l", [x - cx, y - cy]);
    cx = x;
    cy = y;
  }
  return out;
}
export const tighten = (html) => html.replace(/ d="([MLZ0-9. ,-]+)"/g, (_, d) => ` d="${shortPath(d)}"`);

export function render({ order } = {}) {
  const { svg } = build(order ? { order } : {});
  const row = Md.table[0];
  const stage = `<div class="ls-stage" tabindex="0" role="group" aria-label="Slice model. M switches the encoder, left and right arrows the listeners' language, up and down arrows the component, F or Space fans the plates." data-table='${JSON.stringify(Md.table)}'>${svg}<span class="ls-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({
    title: "Acrylic slice model",
    hint: "Turn knobs · slide encoder · pull lever",
    readout: Pt.readoutOf(row),
    keys: [
      { mark: "lit", label: "Etched cells: ROI-projected held-out Fisher z of the selected component, at layer 7 (XLM-R) or 8 (NLLB)" },
      { mark: "raised", label: "Ten axial plates, z −38 to 70 mm, 12 mm apart with the lever down" },
      { mark: "dotted", label: "Etched borders: semantic regions solid, auditory dotted, control dim; outer line: MNI152 brain at that height, for orientation" },
      { mark: "flat", label: "Slide windows: round XLM-R-base, square NLLB-200 encoder" },
      { mark: "edge", label: "Recorder: semantic regions by layer depth, shared solid, specific dashed; meters: middle-late shared − specific in semantic, auditory and control regions" },
    ],
    caption: CAPTION,
    body: stage,
  });
  return { html: tighten(html) };
}
