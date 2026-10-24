// Fig 17 geometry: every part of the test manifold, recorded with its true shape as it is drawn.
// build(pose) returns the recorder; the build settles the painter's keys from it and audits each pose.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "../kit/tube.mjs";
import * as W from "./world.mjs";
import { leverMarkup, leverShapes, angleOf, HUB, AGG_INDEX } from "./lever.mjs";

const { P, XB, YB, SUP, REF, PAD, VALVE, COL, AGG, METER, YC, PUMP } = W;
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const KS = G.scaleOf(P);
// facets for a round part: chords stay within about 0.05 px of the true circle
export const stepsOf = (r) => Math.max(16, Math.ceil((2 * Math.PI * r * KS) / 3.4 / 4) * 4);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];

// a ball housing between two shoulders and two nipples, turned about its axis
const bulge = (s, c, half, r0, r1) => r0 + (r1 - r0) * Math.sqrt(Math.max(0, 1 - ((s - c) / half) ** 2));
function slopeOf(c, half, r0, r1) {
  return (s) => {
    const t = (s - c) / half;
    if (Math.abs(t) >= 0.995) return 0;
    return (-(r1 - r0) * t) / (half * Math.sqrt(1 - t * t));
  };
}
// the float: a rotameter float with a conical skirt, a sharp reading edge and a short head
export const FLOAT_PROFILE = [
  [-5.6, 0],
  [-5.6, 0.7],
  [-1.2, 3.3],
  [0, 3.4],
  [0, 2.5],
  [1.4, 2.5],
  [1.4, 1.6],
  [2.2, 1.6],
  [2.2, 0],
];

export const REST_POSE = { angles: null, m: 1 };

export function build(pose = {}) {
  const angles = pose.angles;
  const m = pose.m ?? 1;
  const R = A.recorder(P);
  const routes = [];
  // parts that never show from this camera in any pose (measured): recorded for the audit, not drawn
  const HIDDEN = new Set(["agg.outlet"]);
  let group = null; // while set, parts are collected into one drawn item instead of each taking its own painter's slot
  const put = (name, ref, svg, shapes, extra = {}) => {
    svg = HIDDEN.has(name) ? "" : svg;
    if (group) group.push({ name, svg, shapes });
    else R.put({ name, at: ref, svg, shapes, bias: 0, ...extra });
  };
  const rec = (shape) => R.solid(shape);

  function box(name, plan, z, h, style = {}, { extra = "", bevel = 0.5, steps = 3, inner = "", owner } = {}) {
    const shape = rec(A.slab(plan, z, h, { name, owner }, steps));
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape]);
    return shape;
  }
  function cyl(name, cx, cy, r, z, h, style = {}, { extra = "", steps = stepsOf(r), bevel = 0, inner = "" } = {}) {
    const shape = rec(A.cylinder(cx, cy, r, z, h, { name }));
    put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape]);
    return shape;
  }
  function turned(name, F, profile, style = {}, { extra = "", inner = "", slope, steps, owner, bevel = 0, fill = "auto" } = {}) {
    const paths = G.lathe(profile, F, P, { smooth: slope ? { slope, rows: 2 } : "auto", steps: steps ?? stepsOf(Math.max(...profile.map(([, r]) => r))), bevel, fill });
    const shape = rec(A.body(F, profile.map(([s, r]) => [s, r]), { name, owner }));
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "hi", ...style, inner }) + extra, [shape]);
    return shape;
  }
  function disc(name, F, s0, s1, r, style = {}, { extra = "", owner, inner = "", bevel = 0, steps = stepsOf(r) } = {}) {
    const shape = rec(A.disc(F, s0, s1, r, { name, owner }));
    put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P, { bevel, steps }), { tone: "mid", ...style, inner }) + extra, [shape]);
    return shape;
  }
  function band(name, F, s0, s1, rIn, rOut, style = {}, { owner } = {}) {
    const shape = rec(A.ring(F, s0, s1, rIn, rOut, { name, owner }));
    put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.ringBand(s0, s1, rIn, rOut, F, P, { steps: stepsOf(rOut) }), { tone: "mid", ...style }), [shape]);
    return shape;
  }
  // a weld pad whose base follows a host cylinder of radius Rh lying along hostAxis through o
  function saddle(name, o, axis, hostAxis, Rh, a, s1, host, style = {}) {
    const F = G.frameOf(o, axis, G.cross3(hostAxis, axis), hostAxis);
    const low = Math.sqrt(Rh * Rh - a * a);
    const shape = rec(A.disc(F, low - 0.05, s1, a, { name, seated: true, cut: [host] }));
    put(name, G.add3(o, G.mul3(axis, (low + s1) / 2)), S(G.saddleOf(F, a, Rh, s1, P, { steps: stepsOf(a) }), { tone: "mid", ...style }), [shape]);
    return G.add3(o, G.mul3(axis, s1));
  }
  // a boss on any recorded host: its base found on the host's surface
  function padOn(name, host, point, outward, a, h, style = {}) {
    const axis = G.unit3(outward);
    const F = G.frameAlong(point, axis);
    const inside = (p) => A.sdf(host, p) < 0;
    // search outward from the host's axis (every call passes a point on it) to where the boss's rim leaves the surface
    const start = (angle) => {
      let lo = 0;
      let hi = h;
      if (!inside(G.pointOf(F, lo, a, angle))) throw new Error(`${name}: boss rim starts outside its host`);
      for (let step = 0; step < 40; step++) {
        const mid = (lo + hi) / 2;
        if (inside(G.pointOf(F, mid, a, angle))) lo = mid;
        else hi = mid;
      }
      return hi;
    };
    const low = Math.min(...Array.from({ length: 48 }, (_, j) => start((j / 48) * Math.PI * 2)));
    const shape = rec(A.disc(F, low - 0.05, h, a, { name, seated: true, cut: [host] }));
    put(name, G.add3(point, G.mul3(axis, (low + h) / 2)), S(G.saddleOf(F, a, start, h, P, { steps: stepsOf(a) }), { tone: "mid", ...style }), [shape]);
    return G.add3(point, G.mul3(axis, h));
  }
  // a pipe or tube: filleted route, gapped under every collar, depth-sorted chunks, optional end flanges
  function pipe(name, control, r, { bend = 2.6, maxLength = 22, tone = "mid", flanges = [false, false], flangeR = 1.5, collars = [], extra = [] } = {}) {
    const line = G.fillet(control, Math.max(r * bend, 3), 12, { P, tube: r });
    const total = G.pathLength(line);
    const gaps = [...extra];
    const fl = [];
    flanges.forEach((on, index) => {
      if (!on) return;
      const thick = Math.max(1.2, r * 0.42);
      const along = index ? total : 0;
      const tangent = G.tangentAlong(line, along);
      const sign = index ? 1 : -1;
      fl.push({ centre: G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2)), tangent, thick });
      gaps.push(index ? [total - thick, total] : [0, thick]);
    });
    const placed = collars.map((c) => {
      const s = crossingsOf(line, c.centre, c.axis, c.radius ?? 12)[0];
      gaps.push([s - c.half, s + c.half]);
      return { ...c, s };
    });
    R.route(name, line, r, { owner: name, gaps, rims: flanges.map((on) => (on ? r * flangeR : r)) });
    tubePieces(line, r, P, { maxLength, gaps }).forEach((part, index) =>
      put(`${name}:${index}`, part.mid, tubeSvg(part, { tone }), [A.tube(part.points, part.radii)], { route: name, chunk: index }),
    );
    fl.forEach(({ centre, tangent, thick }, j) => {
      const F = G.frameAlong(centre, tangent);
      const facing = G.dot3(F.a, V);
      const bolts = Math.abs(facing) > 0.2 ? Dots(G.dotsOf(F, (Math.sign(facing) * thick) / 2, r * flangeR * 0.78, 6, P, { all: true }), { size: 0.38 }) : "";
      disc(`${name}.flange${j}`, F, -thick / 2, thick / 2, r * flangeR, { tone: "mid" }, { owner: name, extra: bolts });
    });
    routes.push({ name, line, r });
    return { line, total, placed };
  }

  // ------------------------------------------------------------ bench base (the reservoir)
  const base = [];
  const B = W.BASE;
  base.push(`<path class="iso-halo" d="${k.haloOf(B, -W.BASE_H - W.FOOT_H, W.BASE_H, P)}"/>`);
  const FT = W.FOOT;
  const feet = k.corners(B, FT.inset).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const z0 = -W.BASE_H - W.FOOT_H;
  feet.forEach(([x, y], j) => {
    rec(A.cylinder(x, y, FT.r, z0, FT.plinth, { name: "stand.foot", ground: true }));
    rec(A.cylinder(x, y, FT.r1, z0 + FT.plinth, W.FOOT_H - FT.plinth, { name: "stand.foot" }));
    if (j === 0) return; // the far foot sits wholly behind the slab
    if (j === 1) {
      const foot = S(k.cylinder(x, y, FT.r, z0, FT.plinth, P, stepsOf(FT.r), 0.3), { tone: "lo" }) + S(k.cylinder(x, y, FT.r1, z0 + FT.plinth, W.FOOT_H - FT.plinth, P, stepsOf(FT.r1)), { tone: "mid" });
      base.push(`<g id="su-foot">${foot}</g>`);
      base.first = [x, y];
      return;
    }
    const [ax, ay] = k.iso([base.first[0], base.first[1], 0], P);
    const [bx, by] = k.iso([x, y, 0], P);
    base.push(`<use href="#su-foot" x="${(bx - ax).toFixed(2)}" y="${(by - ay).toFixed(2)}"/>`);
  });
  base.push(S(k.slabOf(B, -W.BASE_H, W.BASE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(B, -W.BASE_H + 4.4, P, 8), { tone: "faint" }) }));
  base.push(Ln(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(B, 10);
  base.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  base.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = W.LABEL;
  base.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  base.push(Ln(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  base.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 6.2], 0.8, P, "x"), "AU-17", { size: 3.4, tone: "mid" }));
  base.push(
    Ln(
      [
        [3.2, 1],
        [5.2, 0.8],
        [7.2, 0.6],
      ]
        .map(([yy, f]) => k.lineOnTop([label.x + 19, label.y + yy], [label.x + 19 + 21 * f, label.y + yy], 0.8, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  base.push(Dots([at([label.x + 2.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d / 2, 0.8])], { size: 0.42 }));
  rec(A.slab(B, -W.BASE_H, W.BASE_H, { name: "stand.base", ground: true }, 8));

  // reservoir ports on the base top: pump suction, reference balance drop, meter return
  const PORTS = { suction: [PUMP.x, -2, 5.4], balance: [REF.x0, YB, 7], ret: [140, METER.y, 5.4] };
  for (const [id, [x, y, r]] of Object.entries(PORTS)) {
    const bolts = [0, 1, 2, 3].map((j) => at([x + (r - 1) * Math.cos((j * Math.PI) / 2 + 0.6), y + (r - 1) * Math.sin((j * Math.PI) / 2 + 0.6), 2]));
    cyl(`port.${id}`, x, y, r, 0, 2, { tone: "mid" }, { bevel: 0.4, steps: id === "balance" ? 20 : 16, extra: id === "suction" ? "" : Dots(bolts, { size: 0.38 }) });
  }
  // a steel rule let into the bench top along the front edge, 5-unit ticks with a major every 25
  {
    const RULE = { x: W.RULE.x, y: B.y + B.d - 11.6, w: W.RULE.w, d: 4.2, r: 0.6 };
    base.push(S(k.slabOf(RULE, 0, 0.4, P, 2), { tone: "lo", crease: "none" }));
    const t = k.topTicks(RULE.x + 3, RULE.x + RULE.w - 3, 5, 5, RULE.y + RULE.d, 0.4, [-1.4, -2.6], P);
    base.push(Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }));
    base.push(Dots([at([RULE.x + 1.4, RULE.y + RULE.d / 2, 0.4]), at([RULE.x + RULE.w - 1.4, RULE.y + RULE.d / 2, 0.4])], { size: 0.4 }));
  }
  const FILL = [24, -9];
  cyl("filler.boss", FILL[0], FILL[1], 4.8, 0, 1.6, { tone: "mid" }, { bevel: 0.4 });
  cyl("filler.cap", FILL[0], FILL[1], 3.7, 1.6, 3.6, { tone: "mid" }, { bevel: 0.4, extra: Ln(k.knurl(FILL[0], FILL[1], 3.7, 1.8, 5.2, 16, P), { tone: "lo" }) });

  // a sight glass on the reservoir's front face, the fluid line across it
  {
    const SG = { x: 34, y: B.y + B.d, w: 28, d: 1, r: 0.4 };
    const zf = -W.BASE_H + 3;
    const level = -W.BASE_H + 6.2;
    const line = k.segment([SG.x, SG.y + SG.d, level], [SG.x + SG.w, SG.y + SG.d, level], P);
    const screws = Dots([at([SG.x - 2.4, SG.y + 0.2, zf + 3]), at([SG.x + SG.w + 2.4, SG.y + 0.2, zf + 3])], { size: 0.45 });
    box("sight.glass", SG, zf, 6, { tone: "lo" }, { bevel: 0, steps: 2, extra: Ln(line, { tone: "mid" }) + screws });
  }

  // ------------------------------------------------------------ stand posts and header clamps
  const POST_TOP = SUP.z + 6;
  for (const x of W.POSTS) {
    const id = x < 0 ? "L" : "R";
    const fp = { x: x - 7, y: W.POST_Y - 7, w: 14, d: 14, r: 1.5 };
    box(`post${id}.flange`, fp, 0, 2, { tone: "mid" }, { extra: Dots(k.corners(fp, 2.4).map(([px, py]) => at([px, py, 2])), { size: 0.42 }) });
    box(`post${id}.post`, { x: x - 4, y: W.POST_Y - 4, w: 8, d: 8, r: 1 }, 2, POST_TOP - 2, { tone: "mid" }, { bevel: 0.4 });
    box(`post${id}.cap`, { x: x - 5, y: W.POST_Y - 5, w: 10, d: 10, r: 1.4 }, POST_TOP, 2, { tone: "mid" }, { bevel: 0.4 });
    // clamp brackets: each arm and band belongs to the header it holds
    for (const [hz, key, route] of [
      [SUP.z, "sup", "supply"],
      [REF.z, "ref", "reference"],
    ]) {
      const low = hz - 5.6;
      const arm = { x: x - 3, y: W.POST_Y + 4, w: 6, d: YB + 2.5 - (W.POST_Y + 4), r: 0.8 };
      box(`post${id}.arm.${key}`, arm, low - 3, 3, { tone: "mid" }, { bevel: 0.3, owner: route });
      band(`post${id}.band.${key}`, G.frameAlong([x, YB, hz], X), -1.3, 1.3, SUP.r, 5.6, { tone: "mid" }, { owner: route });
    }
  }

  // ------------------------------------------------------------ pump set on its skid
  const skid = { x: PUMP.x - 17, y: -58, w: 34, d: 43, r: 1.5 };
  box("pump.skid", skid, 0, 3, { tone: "mid" }, { extra: Dots(k.corners(skid, 2.6).map(([px, py]) => at([px, py, 3])), { size: 0.42 }) });
  const MOTOR_R = 9.6;
  const MY = -44;
  box("motor.feet", { x: PUMP.x - 7, y: MY - 8, w: 14, d: 16, r: 1 }, 3, PUMP.z - MOTOR_R - 3, { tone: "mid" }, { bevel: 0.3 });
  const MF = G.frameOf([PUMP.x, MY, PUMP.z], Y, X, [0, 0, -1]);
  const motorProfile = [
    [-10, 0],
    [-10, 7.4],
    [-9.2, 8.6],
    [-7.6, 8.6],
    [-7.6, MOTOR_R],
    [6.6, MOTOR_R],
    [6.6, 8.6],
    [8.6, 8.6],
    [9.4, 7.2],
    [9.4, 2.6],
    [10, 2.6],
    [10, 0],
  ];
  turned("motor.body", MF, motorProfile, { tone: "mid" }, { steps: 24 });
  const tb = { x: PUMP.x - 5, y: MY - 4, w: 10, d: 8, r: 1 };
  box("motor.tbox", tb, PUMP.z + MOTOR_R, 5, { tone: "mid" }, { bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(tb, 1.2), PUMP.z + MOTOR_R + 5, P, 2), { tone: "faint" }) + Dots([at([tb.x + 2, tb.y + 2, PUMP.z + MOTOR_R + 5]), at([tb.x + tb.w - 2, tb.y + tb.d - 2, PUMP.z + MOTOR_R + 5])], { size: 0.4 }) });
  const guard = { x: PUMP.x - 4, y: MY + 10.4, w: 8, d: 4, r: 1 };
  box("pump.guard", guard, 3, 21, { tone: "mid" }, { bevel: 0.3, inner: Ln(k.sideSeam(guard, 16, P, 3), { tone: "faint" }) });
  box("pump.foot", { x: PUMP.x - 6, y: YB - 4, w: 12, d: 8, r: 1 }, 3, PUMP.z - PUMP.volute - 3, { tone: "mid" }, { bevel: 0.3 });
  const VF = G.frameOf([PUMP.x, YB, PUMP.z], Y, X, [0, 0, -1]);
  const voluteProfile = [
    [-6, 0],
    [-6, 9.4],
    [-5, PUMP.volute],
    [5, PUMP.volute],
    [6, 9.4],
    [6, 0],
  ];
  const volute = turned("pump.volute", VF, voluteProfile, { tone: "mid" }, { steps: 32, extra: Dots(G.dotsOf(VF, 6, 7.6, 10, P, { all: true }), { size: 0.4 }) + Ln(G.circleOf(VF, 6, 5.6, P, 32), { tone: "faint" }) });
  const discharge = saddle("pump.discharge", [PUMP.x, YB, PUMP.z], Z, Y, PUMP.volute, 6.6, 15, volute);
  disc("pump.nozzle", VF, 6, 9.6, 4.2, { tone: "mid" });
  disc("pump.nozzleFlange", VF, 9.6, 11, 5.4, { tone: "mid" }, { extra: Dots(G.dotsOf(VF, 11, 4.4, 6, P, { all: true }), { size: 0.38 }) });
  pipe("suction", [[PUMP.x, YB + 11, PUMP.z], [PUMP.x, PORTS.suction[1], PUMP.z], [PUMP.x, PORTS.suction[1], 2]], 3.2, { bend: 2, flanges: [true, true], flangeR: 1.5, maxLength: 12 });

  // ------------------------------------------------------------ supply header (riser from the pump, along the top)
  const supply = pipe("supply", [discharge, [PUMP.x, YB, SUP.z], [SUP.x1, YB, SUP.z]], SUP.r, {
    flanges: [true, false],
    flangeR: 1.4,
    maxLength: 200,
    collars: W.POSTS.map((x) => ({ centre: [x, YB, SUP.z], axis: X, half: 1.3 })),
  });
  const supShape = A.tube(supply.line, SUP.r, { name: "supply", owner: "supply", piece: "", ride: "" });
  const blindF = G.frameAlong([SUP.x1 + 1, YB, SUP.z], X);
  disc("supply.blind", blindF, -1, 1, 6.4, { tone: "mid" }, { extra: Dots(G.dotsOf(blindF, 1, 5, 6, P, { all: true }), { size: 0.4 }) });
  // bleed valve on the header crown, between the last branch and the post
  const BX = 66;
  const bleedTop = saddle("bleed.pad", [BX, YB, SUP.z], Z, X, SUP.r, 2, 7, supShape);
  cyl("bleed.body", BX, YB, 2.3, bleedTop[2], 3.4, { tone: "mid" }, { bevel: 0.3 });
  cyl("bleed.knob", BX, YB, 2.9, bleedTop[2] + 3.4, 2.8, { tone: "mid" }, { bevel: 0.3, extra: Ln(k.knurl(BX, YB, 2.9, bleedTop[2] + 3.6, bleedTop[2] + 6, 18, P), { tone: "lo" }) });

  // supply pressure gauge on the header crown: pad, stem, case facing front, dial ticks and a steady needle
  const GX = W.GAUGE.x;
  const gaugePad = saddle("gauge.pad", [GX, YB, SUP.z], Z, X, SUP.r, 2.2, 7, supShape);
  cyl("gauge.stem0", GX, YB, 1.3, gaugePad[2], 1.2, { tone: "mid" });
  cyl("gauge.hex", GX, YB, 2.4, gaugePad[2] + 1.2, 2.2, { tone: "mid" }, { steps: 6, bevel: 0.2 });
  cyl("gauge.stem1", GX, YB, 1.3, gaugePad[2] + 3.4, W.GAUGE.z - W.GAUGE.r - gaugePad[2] - 3.4, { tone: "mid" });
  {
    const GF2 = G.frameOf([GX, YB, W.GAUGE.z], Y, X, Z);
    const face = W.GAUGE.t / 2;
    const rim = W.GAUGE.r - 1.1;
    const ticks = [];
    for (let j = 0; j <= 10; j++) {
      const a = ((225 - j * 27) * Math.PI) / 180;
      ticks.push(k.segment(G.pointOf(GF2, face, rim - (j % 5 ? 1.1 : 1.8), a), G.pointOf(GF2, face, rim, a), P));
    }
    const needleA = (52 * Math.PI) / 180;
    const needle = k.segment(G.pointOf(GF2, face, 0, 0), G.pointOf(GF2, face, rim - 1.4, needleA), P);
    const dial = Ln(G.circleOf(GF2, face, rim, P, 32), { tone: "lo" }) + Ln(ticks.join(""), { tone: "mid" }) + Ln(needle, { tone: "hi", free: "end" }) + Dots([at(G.pointOf(GF2, face, 0, 0))], { size: 0.7, tone: "hi" });
    disc("gauge.case", GF2, -face, face, W.GAUGE.r, { tone: "mid" }, { bevel: 0.5, extra: dial });
  }

  // ------------------------------------------------------------ reference header (balance drop to the reservoir at its left end)
  const reference = pipe("reference", [[REF.x1, YB, REF.z], [REF.x0, YB, REF.z], [REF.x0, YB, 2]], REF.r, {
    flanges: [false, true],
    flangeR: 1.45,
    maxLength: 200,
    collars: W.POSTS.map((x) => ({ centre: [x, YB, REF.z], axis: X, half: 1.3 })),
  });
  const refShape = A.tube(reference.line, REF.r, { name: "reference", owner: "reference", piece: "", ride: "" });
  // reducer at the right end, then the aggregator's reference feed: across, forward, down and into its side port
  const redF = G.frameAlong([REF.x1, YB, REF.z], X);
  turned("reference.reducer", redF, [[0, 0], [0, REF.r], [1.4, REF.r], [4.2, 2.6], [5, 2.6], [5, 0]], { tone: "mid" }, { steps: 16 });

  // ------------------------------------------------------------ collecting header: behind the bank, low, turning forward under the meter
  const collect = pipe("collect", [[COL.x0, YC, COL.z], [AGG.x - AGG.half, YC, COL.z]], COL.r, {
    maxLength: 200,
    collars: W.PEDS.map((x) => ({ centre: [x, YC, COL.z], axis: X, half: 1.3 })),
  });
  const colShape = A.tube(collect.line, COL.r, { name: "collect", owner: "collect", piece: "", ride: "" });
  const colBlind = G.frameAlong([COL.x0 - 1, YC, COL.z], X);
  disc("collect.blind", colBlind, -1, 1, 6.2, { tone: "mid" }, { steps: 16 });
  for (const x of W.PEDS) {
    const id = x < 0 ? "L" : "R";
    const top = COL.z - 5.6;
    const fp = { x: x - 6, y: YC - 7, w: 12, d: 14, r: 1.2 };
    box(`ped${id}.flange`, fp, 0, 1.6, { tone: "mid" }, { extra: Dots(k.corners(fp, 2).map(([px, py]) => at([px, py, 1.6])), { size: 0.4 }) });
    box(`ped${id}.post`, { x: x - 3.5, y: YC - 4, w: 7, d: 8, r: 0.8 }, 1.6, top - 1.6, { tone: "mid" }, { bevel: 0.3, owner: "collect" });
    band(`ped${id}.band`, G.frameAlong([x, YC, COL.z], X), -1.3, 1.3, COL.r, 5.6, { tone: "mid" }, { owner: "collect" });
  }
  const DX = -70;
  const drainFace = saddle("drain.pad", [DX, YC, COL.z], [0, 0, -1], X, COL.r, 2.2, 7.2, colShape);
  cyl("drain.body", DX, YC, 2.6, drainFace[2] - 4.4, 4.4, { tone: "mid" }, { bevel: 0.3 });
  box("drain.handle", { x: DX + 2.4, y: YC - 0.7, w: 6.4, d: 1.4, r: 0.6 }, drainFace[2] - 3, 1.4, { tone: "mid" }, { bevel: 0, steps: 2 });
  cyl("drain.spout", DX, YC, 1.1, drainFace[2] - 7.4, 3, { tone: "mid" });

  // ------------------------------------------------------------ the bank: eight three-way ball valves and their branch lines
  const HEX = Array.from({ length: 6 }, (_, j) => [VALVE.nut * Math.cos((j * Math.PI) / 3 + Math.PI / 6), VALVE.nut * Math.sin((j * Math.PI) / 3 + Math.PI / 6)]);
  const twins = [];
  for (let i = 0; i < W.N; i++) {
    const x = XB[i];
    const name = `b${i}`;
    // the valve column (pads, nipples, nuts, necks, ball, outlet, stem, stop plate, hub) is drawn as one stack, back to
    // front and bottom to top; the lever and its nut take their own slots in front of it
    group = [];
    const top = saddle(`${name}.padS`, [x, YB, SUP.z], [0, 0, -1], X, SUP.r, PAD.a, PAD.s, supShape);
    const bottom = saddle(`${name}.padR`, [x, YB, REF.z], Z, X, REF.r, PAD.a, PAD.s, refShape);
    const F = G.frameOf([x, YB, 0], Z, X, Y);
    const c = VALVE.z;
    const n0 = c - VALVE.half - VALVE.neckH; // a neck runs past the ball each way, then a hex nut, then a short nipple to the pad
    const n1 = c + VALVE.half + VALVE.neckH;
    // each piece is convex, so its silhouette is exact; the painter's order sorts the stack
    const own = { owner: `${name}.valve` };
    disc(`${name}.nip0`, F, bottom[2], n0 - VALVE.nutH, VALVE.nip, { tone: "mid" }, own);
    disc(`${name}.neck0`, F, n0, c - VALVE.half, VALVE.neck, { tone: "mid" }, { bevel: 0.3, ...own });
    const ballProfile = [
      [c - VALVE.half, 0],
      ...Array.from({ length: 15 }, (_, j) => {
        const s = c + VALVE.half * Math.sin(((j - 7) / 7) * (Math.PI / 2));
        return [s, bulge(s, c, VALVE.half, VALVE.neck, VALVE.bulge), j && j < 14 ? 1 : 0];
      }),
      [c + VALVE.half, 0],
    ];
    const body = turned(`${name}.valve`, F, ballProfile, { tone: "mid" }, { slope: slopeOf(c, VALVE.half, VALVE.neck, VALVE.bulge) });
    disc(`${name}.neck1`, F, c + VALVE.half, n1, VALVE.neck, { tone: "mid" }, { bevel: 0.3, ...own });
    disc(`${name}.nip1`, F, n1 + VALVE.nutH, top[2], VALVE.nip, { tone: "mid" }, own);
    for (const [j, s0] of [
      [0, n0 - VALVE.nutH],
      [1, n1],
    ]) {
      const nut = rec(A.prism(F, HEX, s0, s0 + VALVE.nutH, { name: `${name}.hex${j}`, owner: `${name}.valve` }));
      put(`${name}.hex${j}`, [x, YB, s0 + VALVE.nutH / 2], S(G.prismOf(F, HEX, s0, s0 + VALVE.nutH, P), { tone: "mid" }), [nut]);
    }
    const outlet = padOn(`${name}.outlet`, body, [x, YB, c], [0, -1, 0], VALVE.port, VALVE.portH, { tone: "mid" });
    const ST = W.STOP;
    padOn(`${name}.stem`, body, [x, YB, c], Y, VALVE.stem, VALVE.stemH - ST.t, { tone: "mid" });
    const HF = G.frameAlong([x, YB, c], Y);
    // the stop plate on the stem's end behind the hub, a detent mark at each of the three lever positions
    const sy = YB + VALVE.stemH;
    const detents = [W.THROW.live, W.THROW.ref, W.THROW.shut].map((a) => k.segment([x + 3.3 * Math.cos(a), sy, c + 3.3 * Math.sin(a)], [x + ST.r * Math.cos(a), sy, c + ST.r * Math.sin(a)], P)).join("");
    const stop = rec(A.disc(HF, VALVE.stemH - ST.t, VALVE.stemH, ST.r, { name: `${name}.stop` }));
    put(`${name}.stop`, [x, sy - ST.t / 2, c], S(G.disc(VALVE.stemH - ST.t, VALVE.stemH, ST.r, HF, P, { steps: stepsOf(ST.r) }), { tone: "mid" }) + Ln(detents, { tone: "mid" }), [stop]);
    disc(`${name}.hub`, HF, VALVE.stemH, VALVE.stemH + HUB.len, HUB.r, { tone: "mid" });
    const parts = new Map(group.map((g) => [g.name.slice(name.length + 1), g]));
    group = null;
    // the upper neck, nut and nipple are the lower ones moved up the column, drawn as copies of them
    const UP = { neck1: ["neck0", c + VALVE.half - n0], hex1: ["hex0", n1 - (n0 - VALVE.nutH)], nip1: ["nip0", n1 + VALVE.nutH - bottom[2]] };
    const lift = (dz) => {
      const [x0, y0] = at([0, 0, 0]);
      const [x1, y1] = at([0, 0, dz]);
      return [x1 - x0, y1 - y0];
    };
    const SOURCES = new Set(Object.values(UP).map(([src]) => src));
    const svgOf = (part) => {
      if (UP[part]) {
        const [dx, dy] = lift(UP[part][1]);
        twins.push({ copy: parts.get(part).svg, source: parts.get(UP[part][0]).svg, by: [0, 0, UP[part][1]] });
        return `<use href="#su-${UP[part][0]}" x="${dx.toFixed(2)}" y="${dy.toFixed(2)}"/>`;
      }
      return SOURCES.has(part) ? `<g id="su-${part}">${parts.get(part).svg}</g>` : parts.get(part).svg;
    };
    const STACK = ["outlet", "padR", "nip0", "hex0", "neck0", "valve", "neck1", "hex1", "nip1", "padS", "stem", "stop", "hub"];
    R.put({ name: `${name}.column`, at: [x, YB, c], svg: STACK.map(svgOf).join(""), shapes: STACK.flatMap((part) => parts.get(part).shapes), bias: 0 });
    const angle = angles ? angles[i] : W.THROW.live;
    put(`lever${i}`, [x + 5, YB + VALVE.stemH + 2, c + 2], `<g data-lever="${i}">${leverMarkup(i, angle)}</g>`, leverShapes(A, i, angle, `lever${i}`).map(rec), { lever: i });
    disc(`${name}.nut`, HF, VALVE.stemH + HUB.len + W.LEVER.t, VALVE.stemH + HUB.len + W.LEVER.t + 1, 1.4, { tone: "mid" });
    const padTop = saddle(`${name}.padC`, [x, YC, COL.z], Z, X, COL.r, PAD.a, PAD.s, colShape);
    const UZ = 43; // the union on the drop, where it shows between the valve columns above the reference header
    pipe(`${name}.line`, [outlet, [x, YC, c], padTop], W.LINE_R, {
      bend: 2.6,
      maxLength: 100,
      collars: [{ centre: [x, YC, UZ], axis: Z, half: 2.1, radius: 4 }],
    });
    const UF = G.frameAlong([x, YC, UZ], Z);
    turned(`${name}.union`, UF, [[-2.1, 0], [-2.1, 2.7], [-1.3, 3.25], [1.3, 3.25], [2.1, 2.7], [2.1, 0]], { tone: "mid" }, { owner: `${name}.line`, inner: Ln(G.arcOf(UF, 0, 3.25, P), { tone: "faint" }) });
  }

  // ------------------------------------------------------------ aggregator: the series three-way valve under the meter, in line with the collecting header
  const AF = G.frameOf([AGG.x, AGG.y, AGG.z], X, Y, Z);
  const aggProfile = [
    [-5.6, 0],
    ...Array.from({ length: 11 }, (_, j) => {
      const s = 5.6 * Math.sin(((j - 5) / 5) * (Math.PI / 2));
      return [s, bulge(s, 0, 5.6, AGG.end, AGG.bulge), j && j < 10 ? 1 : 0];
    }),
    [5.6, 0],
  ];
  disc("agg.end0", AF, -AGG.half, -5.6, AGG.end, { tone: "mid" }, { bevel: 0.3, owner: "agg.valve" });
  const agg = turned("agg.valve", AF, aggProfile, { tone: "mid" }, { slope: slopeOf(0, 5.6, AGG.end, AGG.bulge) });
  disc("agg.end1", AF, 5.6, AGG.half, AGG.end, { tone: "mid" }, { bevel: 0.3, owner: "agg.valve" });
  padOn("agg.outlet", agg, [AGG.x, AGG.y, AGG.z], Z, 3.6, METER.z0 - AGG.z, { tone: "mid" });
  const side = padOn("agg.side", agg, [AGG.x, AGG.y, AGG.z], Y, 2.6, AGG.bulge + 3, { tone: "mid" });
  disc("agg.stem", AF, AGG.half, AGG.half + HUB.boss, VALVE.stem, { tone: "mid" });
  disc("agg.hub", AF, AGG.half + HUB.boss, AGG.half + HUB.boss + HUB.len, HUB.r, { tone: "mid" });
  const aggAngle = angles ? angles[AGG_INDEX] : W.AGG_THROW.live;
  put("lever8", [AGG.x + AGG.half + 6, AGG.y + 4, AGG.z + 3], `<g data-lever="8">${leverMarkup(AGG_INDEX, aggAngle)}</g>`, leverShapes(A, AGG_INDEX, aggAngle, "lever8").map(rec), { lever: AGG_INDEX });
  disc("agg.nut", AF, AGG.half + HUB.boss + HUB.len + W.LEVER.t, AGG.half + HUB.boss + HUB.len + W.LEVER.t + 1, 1.4, { tone: "mid" });
  // the reference feed: off the header's reducer, across to above the aggregator's front boss, down, and back into it
  const FX = AGG.x;
  pipe("feed", [[REF.x1 + 5, YB, REF.z], [FX, YB, REF.z], [FX, YB, AGG.z], side], 2.2, { bend: 2.4, maxLength: 16 });

  // ------------------------------------------------------------ rotameter: blocks, gland rings, scale plate, glass, float
  const mx = METER.x;
  const my = METER.y;
  const half = METER.block / 2;
  const blockPlan = { x: mx - half, y: my - half, w: METER.block, d: METER.block, r: 1.6 };
  const blockScrews = (z) => Dots(k.corners(blockPlan, 2.4).map(([px, py]) => at([px, py, z])), { size: 0.42 });
  box("meter.bottom", blockPlan, METER.z0, METER.z1 - METER.z0, { tone: "mid" }, { bevel: 0.6, steps: 4, extra: blockScrews(METER.z1) });
  cyl("meter.gland0", mx, my, 6.8, METER.z1, METER.glass0 - METER.z1, { tone: "mid" }, { bevel: 0.3 });
  const plate = { x: mx - half, y: my - half + 0.4, w: METER.block, d: 1.8, r: 0.3 };
  const edge = plate.x + plate.w;
  const face = plate.y + plate.d;
  const ticks = { minor: "", major: "", band: "" };
  for (let j = 0; j <= 24; j++) {
    const z = W.zOf(j * 0.05);
    const major = j % 4 === 0;
    const d = k.segment([edge, face, z], [edge - (major ? 3 : 1.7), face, z], P);
    if (major) ticks.major += d;
    else ticks.minor += d;
  }
  const eps0 = W.zOf(0.9);
  const eps1 = W.zOf(1.1);
  ticks.band = k.segment([edge, face, eps0], [edge - 4.2, face, eps0], P) + k.segment([edge, face, eps1], [edge - 4.2, face, eps1], P) + k.segment([edge - 4.2, face, eps0], [edge - 4.2, face, eps1], P);
  box("meter.plate", plate, METER.z1, METER.top0 - METER.z1, { tone: "mid" }, { bevel: 0, steps: 2, extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Ln(ticks.band, { tone: "hi" }) });
  const GF = G.frameAlong([mx, my, 0], Z);
  const glassShape = (name) => rec(A.ring(GF, METER.glass0, METER.glass1, METER.r - 0.4, METER.r, { name }));
  const glass = k.cylinder(mx, my, METER.r, METER.glass0, METER.glass1 - METER.glass0, P, 48);
  const bore = (side) => {
    const a = G.angleToward(GF, [V[1] * side, -V[0] * side, 0]);
    return k.segment(G.pointOf(GF, METER.glass0, 3.7, a), G.pointOf(GF, METER.glass1, 4.8, a), P);
  };
  // the tapered bore widens upward; its narrow bottom edge shows as the far half of a ring the bore lines rise from
  const backRims = G.arcOf(GF, METER.glass0, METER.r - 0.2, P, { inward: true }) + G.arcOf(GF, METER.glass1, METER.r - 0.2, P, { inward: true }) + G.arcOf(GF, METER.glass0, 3.7, P, { inward: true });
  const midZ = (METER.glass0 + METER.glass1) / 2;
  put("meter.glassBack", [mx, my - 2, midZ], `<g class="su-glass"><path class="su-glass-fill" d="${glass.fill}"/>${Ln(bore(1) + bore(-1), { tone: "faint" })}${Ln(backRims, { tone: "faint" })}</g>`, [glassShape("meter.glassBack")]);
  // the float rides a guide wire strung down the tube's axis between the two glands
  const rod = rec(A.cylinder(mx, my, 0.5, METER.glass0, METER.glass1 - METER.glass0, { name: "meter.rod" }));
  put("meter.rod", [mx, my, midZ], S(k.cylinder(mx, my, 0.5, METER.glass0, METER.glass1 - METER.glass0, P, 8), { tone: "lo", crease: "none" }), [rod]);
  // the float, built at its zero reading; the page translates it
  const FF = G.frameAlong([mx, my, W.zOf(0)], Z);
  const floatPaths = G.lathe(FLOAT_PROFILE, FF, P, { steps: 28 });
  const lift = W.zOf(m) - W.zOf(0);
  const floatMove = k.translateAlong(P, [0, 0, lift]);
  const floatShape = A.moved(A.body(FF, FLOAT_PROFILE.map(([s, r]) => [s, r]), { name: "float", owner: "meter.rod" }), [0, 0, lift]);
  rec(floatShape);
  put("float", [mx, my, W.zOf(m)], `<g data-part="float" transform="${floatMove}">${S(floatPaths, { tone: "hi", lit: true, crease: "lo" })}</g>`, [floatShape], { float: true });
  const front = G.arcOf(GF, METER.glass0, METER.r, P) + G.arcOf(GF, METER.glass1, METER.r, P);
  const shineA = G.angleToward(GF, [-0.2, 1, 0]);
  const shine = k.segment(G.pointOf(GF, METER.glass0, METER.r, shineA), G.pointOf(GF, METER.glass1, METER.r, shineA), P); // rim to rim
  put("meter.glassFront", [mx, my + 2, midZ], `<g class="su-glass">${Ln(shine, { tone: "faint", className: "su-shine" })}<path class="iso-line iso-edge" data-tone="mid" d="${glass.outline}"/>${Ln(front, { tone: "lo" })}</g>`, [glassShape("meter.glassFront")]);
  cyl("meter.gland1", mx, my, 6.8, METER.glass1, METER.top0 - METER.glass1, { tone: "mid" }, { bevel: 0.3 });
  box("meter.top", blockPlan, METER.top0, METER.top1 - METER.top0, { tone: "mid" }, { bevel: 0.6, steps: 4, extra: blockScrews(METER.top1) });
  cyl("meter.vent", mx, my, 1.9, METER.top1, 1.6, { tone: "mid" }, { bevel: 0.3 });
  const RZ = (METER.top0 + METER.top1) / 2;
  const OF = G.frameAlong([mx + half, my, RZ], X);
  disc("meter.outlet", OF, 0, 3, 3, { tone: "mid" }, { bevel: 0.3 });
  pipe("return", [[mx + half + 3, my, RZ], [PORTS.ret[0], my, RZ], [PORTS.ret[0], my, 2]], 2.2, { bend: 2.6, flanges: [false, true], flangeR: 1.6, maxLength: 40 });

  // ------------------------------------------------------------ console: redundancy selector and two status lamps
  const C = W.CONSOLE;
  box("console", C, 0, W.CONSOLE_H, { tone: "mid" }, {
    bevel: 0.8,
    steps: 4,
    inner: Ln(k.sideSeam(C, 3, P, 4), { tone: "faint" }),
    extra: Dots(k.corners(C, 2.6).map(([px, py]) => at([px, py, W.CONSOLE_H])), { size: 0.42 }),
  });
  const [kx, ky] = W.KNOB;
  const zt = W.CONSOLE_H;
  const dial = k.cylinder(kx, ky, 9, zt, 0.6, P, 28);
  const marks = W.KNOB_ANGLES.map((a) => k.lineOnTop([kx + Math.sin(a) * 6.4, ky - Math.cos(a) * 6.4], [kx + Math.sin(a) * 8.8, ky - Math.cos(a) * 8.8], zt + 0.6, P)).join("");
  put("console.dial", [kx, ky, zt + 0.3], S(dial, { tone: "lo", crease: "none" }) + Ln(marks, { tone: "mid" }), [rec(A.cylinder(kx, ky, 9, zt, 0.6, { name: "console.dial" }))]);
  cyl("console.knob", kx, ky, 5.2, zt + 0.6, 4.6, { tone: "hi" }, { bevel: 0.4, extra: Ln(k.knurl(kx, ky, 5.2, zt + 0.8, zt + 5, 24, P), { tone: "lo" }) + `<path class="iso-line" data-tone="hi" data-part="pointer" data-free="" d="${W.pointerOf(pose.r ?? 2)}" style="stroke-width:1.1"/>` });
  for (const [id, ly] of [
    ["eps", ky - 6],
    ["cert", ky + 6],
  ]) {
    const lx = C.x + C.w - 7;
    cyl(`lamp.${id}.bezel`, lx, ly, 2.8, zt, 1.2, { tone: "mid" }, { bevel: 0.3 });
    const lens = rec(A.cylinder(lx, ly, 2.1, zt + 1.2, 1.4, { name: `lamp.${id}` }));
    put(`lamp.${id}`, [lx, ly, zt + 1.9], `<g data-lamp="${id}">${S(k.cylinder(lx, ly, 2.1, zt + 1.2, 1.4, P, 28, 0.3), { tone: "mid" })}</g>`, [lens]);
  }

  return { R, routes, base: base.join(""), twins };
}

// lever angle for each valve state (LIVE 1, REF -1, SHUT 0)
export const anglesOf = (valves) => valves.map((s, i) => angleOf(i, s));
