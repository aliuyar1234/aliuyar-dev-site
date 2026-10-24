// Fig 1: a checkweigher for AI decisions. Pure ESM; runs at build time and returns the static figure.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as A from "../kit/audit.mjs";
import { W, H, P, PLATE, PLATE_H, FOOT_H, BELT, FRAME, CONV, HOUSING, SLOT, DOWN, CAB, POST, HEAD, LAMP, KNOB, PRINTER, STRIP, CELL, PEDESTAL, JBOX, PLUG, PUSH, EYE, TRAY } from "./world.mjs";
import * as M from "./model.mjs";
import { traySvg, placeAt, slatsD, journalSvg, stripOf, sheetD, curlSvg, SCREEN, cellU, gateU, KNOB_FROM, KNOB_TOP, knobAngle } from "./parts.mjs";

const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const fy = (o) => G.frameOf(o, Y, X, Z);
const fx = (o) => G.frameOf(o, X, Y, Z);
const fz = (o) => G.frameOf(o, Z, X, Y);
const fmx = (o) => G.frameOf(o, [-1, 0, 0], Y, Z);
const fmy = (o) => G.frameOf(o, [0, -1, 0], X, Z);
const tip = (F, s) => G.add3(F.o, G.mul3(F.a, s));
const rad = (d) => (d * Math.PI) / 180;

const roundRect = (u0, v0, u1, v1, r, steps = 4) => k.roundedPlan({ x: u0, y: v0, w: u1 - u0, d: v1 - v0, r }, steps);
// closed outlines in the face y = c (u along x, v along z) or x = c (u along y, v along z)
const onFaceY = (c, ring) => path3(ring.map(([u, v]) => [u, c, v]), true);
const onFaceX = (c, ring) => path3(ring.map(([u, v]) => [c, u, v]), true);
const planOf = ([x0, y0], [x1, y1], r) => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });

export function scene() {
  let clips = 0;
  const R = A.recorder(P);
  const put = (name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) => R.put({ name, at: ref, bias, svg, shapes, ...rest });
  const record = R.solid;

  function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.4, steps = 2, bevel = 0, extra = "", inner = "", attrs } = {}) {
    const plan = planOf([x0, y0], [x1, y1], r < 0.6 ? 0 : r);
    const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
    put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { attrs });
    return shape;
  }
  function cyl(name, cx, cy, r, z0, z1, style = {}, { steps: given, bevel = 0, extra = "", inner = "", attrs } = {}) {
    const steps = Math.min(given ?? 48, Math.max(12, Math.round(r * 7)));
    const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
    put(name, [cx, cy, (z0 + z1) / 2], S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { attrs });
    return shape;
  }
  function turnedOf(name, F, profile, style = {}, { extra = "", inner = "", bore = 0, smooth = "auto" } = {}) {
    const s0 = profile[0][0];
    const s1 = profile[profile.length - 1][0];
    const most = Math.max(...profile.map(([, r]) => r));
    const steps = Math.min(40, Math.max(12, Math.round(most * 6)));
    const paths = bore ? G.ringBand(s0, s1, bore, profile[0][1], F, P, { steps }) : G.solidOf(profile, F, P, { steps, smooth });
    const shape = record(bore ? A.ring(F, s0, s1, bore, profile[0][1], { name }) : A.solid(F, profile, { name }));
    return { svg: S(paths, { tone: "mid", ...style, inner }) + extra, shape, ref: tip(F, (s0 + s1) / 2) };
  }
  function turned(name, F, profile, style = {}, options = {}) {
    const { svg, shape, ref } = turnedOf(name, F, profile, style, options);
    put(name, ref, svg, [shape], { attrs: options.attrs });
    return shape;
  }
  const disc = (name, F, s0, s1, r, style, options) => turned(name, F, [[s0, r], [s1, r]], style, options);
  function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "" } = {}) {
    const shape = record(A.prism(F, poly, s0, s1, { name }));
    const cu = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cv = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    put(name, G.add3(G.add3(tip(F, (s0 + s1) / 2), G.mul3(F.u, cu)), G.mul3(F.v, cv)), S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra, [shape]);
    return shape;
  }
  const hexPoly = (r) => Array.from({ length: 6 }, (_, i) => [r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);
  const hex = (name, F, s0, s1, r, style = {}) => prism(name, F, hexPoly(r), s0, s1, { tone: "mid", ...style });
  // a cable gland: hex nut on the panel, then a domed seal; returns where the cable leaves it
  function gland(name, F) {
    hex(`${name}.nut`, F, 0, 1.3, 1.9, { tone: "lo" });
    turned(`${name}.seal`, F, [[1.3, 1.45], [2.4, 1.45], [3.3, 0.85]], { tone: "mid" });
    return tip(F, 3.3);
  }

  const CABLES = [];
  function cable(name, points, r = 0.55, { tone = "mid", bend = 2.2, maxLength = 14 } = {}) {
    const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    R.route(name, route, r);
    CABLES.push(name);
    tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)) }).forEach((piece, index) =>
      put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: name, chunk: index }),
    );
    return route;
  }
  // a recess cut into a flat face: floor, the walls that face the viewer, then whatever sits inside, clipped to the opening
  function recess(face, c, ring, depth, cls, inside = "") {
    const w3 = (u, v, d) => (face === "x" ? [c - d, u, v] : [u, c - d, v]);
    const cu = ring.reduce((a, p) => a + p[0], 0) / ring.length;
    const cv = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    const walls = [[], [], [], [], []];
    ring.forEach(([au, av], i) => {
      const [bu, bv] = ring[(i + 1) % ring.length];
      const len = Math.hypot(bu - au, bv - av) || 1;
      let [nu, nv] = [(bv - av) / len, -(bu - au) / len];
      if (nu * (cu - (au + bu) / 2) + nv * (cv - (av + bv) / 2) < 0) [nu, nv] = [-nu, -nv];
      const n3 = face === "x" ? [0, nu, nv] : [nu, 0, nv];
      if (G.dot3(n3, V) <= 1e-6) return;
      walls[G.toneOf(n3, P)].push(path3([w3(au, av, 0), w3(bu, bv, 0), w3(bu, bv, depth), w3(au, av, depth)], true));
    });
    const outline = path3(ring.map(([u, v]) => w3(u, v, 0)), true);
    const floor = path3(ring.map(([u, v]) => w3(u, v, depth)), true);
    const id = `hero-r${++clips}`;
    return [
      `<clipPath id="${id}"><path d="${outline}"/></clipPath><g clip-path="url(#${id})">`,
      `<path class="${cls}" d="${floor}"/>`,
      ...walls.map((list, tone) => (list.length ? (tone === 4 ? `<path class="iso-top" d="${list.join("")}"/>` : `<path class="iso-shade" data-shade="${tone}" d="${list.join("")}"/>`) : "")),
      inside,
      `</g>`,
      Ln(outline, { tone: "lo" }),
    ].join("");
  }
  const focusRings = [];
  const led = (part, p, size = 0.7) => `<g class="hero-led-dot" data-part="${part}">${Dots([at(p)], { size, tone: "hi" })}</g>`;

  // ---------- bench ----------
  const back = [];
  back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4.6, P, 8), { tone: "faint" }) }));
  back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const plateScrews = k.corners(PLATE, 10);
  back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "bench", ground: true }, 8));
  const RULE = { x: -108, y: PLATE.y + PLATE.d - 11, w: 104, d: 6, r: 1 };
  back.push(S(k.slabOf(RULE, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.8, 0.6, [1.8, 3.4], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Dots([at([RULE.x + 2, RULE.y + 3, 0.6]), at([RULE.x + RULE.w - 2, RULE.y + 3, 0.6])], { size: 0.45 }));
  const LABEL = { x: 52, y: 28, w: 32, d: 10, r: 1.5 };
  back.push(S(k.slabOf(LABEL, 0, 0.9, P, 3), { tone: "mid" }));
  back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.9, P), { tone: "faint" }));
  back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 4, LABEL.y + 7.6], 0.9, P, "x"), "AU-1", { size: 4.2, tone: "lo" }));
  back.push(Ln([16, 12, 14].map((len, row) => k.onTop([[LABEL.x + 14.6, LABEL.y + 3 + row * 2.2], [LABEL.x + 14.6 + len, LABEL.y + 3 + row * 2.2]], 0.9, P)).join(""), { tone: "lo", free: true }));
  back.push(Dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, 0.9]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, 0.9])], { size: 0.45 }));

  // ---------- the sealed model ----------
  const HP = planOf([HOUSING.x0, HOUSING.y0], [HOUSING.x1, HOUSING.y1], 3);
  box("model.plinth", [HP.x + 2.4, HP.y + 2.4, 0], [HP.x + HP.w - 2.4, HP.y + HP.d - 2.4, HOUSING.z0], { tone: "lo" }, { r: 2, steps: 4 });
  {
    const fxp = HOUSING.x1;
    const slot = recess("x", fxp, roundRect(SLOT.y0, SLOT.z0, SLOT.y1, SLOT.z1, 1.2), SLOT.depth, "hero-dark");
    const ledAt = (i) => at([fxp - 0.6, -6 + i * 3, 50]);
    const leds = Array.from({ length: 5 }, (_, i) => `<circle class="hero-led" data-led="${i}" cx="${f2(ledAt(i)[0])}" cy="${f2(ledAt(i)[1])}" r="0.8"/>`).join("");
    const status = recess("x", fxp, roundRect(-8.4, 47.2, 8.4, 52.8, 1.2), 0.6, "hero-glass", leds);
    const vents = Array.from({ length: 5 }, (_, i) => onFaceY(HOUSING.y1, roundRect(HP.x + 5 + i * 3.2, 14, HP.x + 6.5 + i * 3.2, 46, 0.7, 2))).join("");
    const tag = onFaceY(HOUSING.y1, roundRect(HP.x + 22, 30, HP.x + 30, 44, 1, 3));
    const tagScrews = [[HP.x + 23.4, 42.4], [HP.x + 28.6, 42.4], [HP.x + 23.4, 31.6], [HP.x + 28.6, 31.6]].map(([x, z]) => at([x, HOUSING.y1, z]));
    const tagRules = [0, 1, 2].map((i) => path3([[HP.x + 24, HOUSING.y1, 39.4 - i * 2.4], [HP.x + 28 - (i === 1 ? 1.4 : 0), HOUSING.y1, 39.4 - i * 2.4]])).join("");
    const faceScrews = [[-15.4, 24], [15.4, 24], [-15.4, 54.4], [15.4, 54.4]].map(([y, z]) => at([fxp, y, z]));
    const lidScrews = k.corners(HP, 4);
    const extra =
      Ln(vents, { tone: "lo" }) + Ln(tag, { tone: "lo" }) + Ln(tagRules, { tone: "faint", free: true }) + Dots(tagScrews, { size: 0.4 }) + slot + status + Dots(faceScrews, { size: 0.45 }) +
      Ln(lidScrews.map(([x, y]) => k.ring(x, y, 1.6, HOUSING.z1, P, 14)).join(""), { tone: "lo" }) + Dots(lidScrews.map(([x, y]) => at([x, y, HOUSING.z1])), { size: 0.45 });
    const shape = record(A.slab(HP, HOUSING.z0, HOUSING.z1 - HOUSING.z0, { name: "model.case" }, 6));
    put("model.case", [HP.x + HP.w / 2, 0, 35], S(k.slabOf(HP, HOUSING.z0, HOUSING.z1 - HOUSING.z0, P, 6, 1.2), { tone: "mid", inner: Ln(k.sideSeam(HP, HOUSING.z1 - 6, P, 6) + k.sideSeam(HP, 10, P, 6), { tone: "faint" }) }) + extra, [shape]);
  }
  for (const x of [HP.x + 9, HP.x + 25]) cyl("model.handle.post", x, 0, 1.3, HOUSING.z1, HOUSING.z1 + 5, { tone: "mid" }, { steps: 18 });
  box("model.handle", [HP.x + 6.6, -1.6, HOUSING.z1 + 5], [HP.x + 27.4, 1.6, HOUSING.z1 + 7.4], { tone: "mid" }, { r: 1.4, steps: 4, bevel: 0.3 });
  box("model.seal", [HOUSING.x1, 15.4, 46], [HOUSING.x1 + 0.7, 19.2, 49.6], { tone: "mid" }, { r: 0.5, steps: 3, extra: Dots([at([HOUSING.x1 + 0.7, 17.3, 47.8])], { size: 0.4, tone: "lo" }) });
  box("model.lip", [HOUSING.x1, SLOT.y0, BELT.top - 0.8], [CONV.infeed.x0 - 0.3, SLOT.y1, BELT.top], { tone: "lo" }, { r: 0.2 });
  const houseOut = gland("model.gland", fx([HOUSING.x1, -18, 14]));

  // ---------- conveyors ----------
  const FY = FRAME.y;
  function belt(key, { x0, x1 }) {
    const rr = BELT.rr;
    const xa = x0 + rr;
    const xb = x1 - rr;
    const zc = BELT.top - rr;
    const F = G.frameOf([xa, BELT.y0, zc], Y, X, Z);
    const poly = G.stadium(rr, rr, xb - xa, 20);
    const beltShape = record(A.prism(F, poly, 0, BELT.y1 - BELT.y0, { name: `${key}.belt` }));
    const slats = `<path class="iso-line" data-tone="faint" data-slats="${key}" d="${slatsD({ x0, x1 }, 0)}"/>`;
    put(`${key}.belt`, [(x0 + x1) / 2, 0, zc], S(G.prismOf(F, poly, 0, BELT.y1 - BELT.y0, P), { tone: "mid", inner: slats }), [beltShape]);
    return { xa, xb, zc };
  }
  function conveyor(key, { x0, x1 }, { legs = [], rails = null, low = null } = {}) {
    const { xa, xb, zc } = belt(key, { x0, x1 });
    const fx0 = x0 - 0.6;
    const fx1 = x1 + 0.6;
    const z0 = FRAME.z0;
    box(`${key}.frame.back`, [fx0, -FY, z0], [fx1, BELT.y0, FRAME.z1], { tone: "mid" }, { r: 0.3 });
    const axles = (a, b) => [xa, xb].filter((x) => x > a && x < b).map((x) => at([x, FY, zc]));
    const frontPart = (name, a, b, z1) => {
      const front = planOf([a, BELT.y1], [b, FY], 0.3);
      box(name, [a, BELT.y1, z0], [b, FY, z1], { tone: "mid" }, { r: 0.3, inner: Ln(k.sideSeam(front, z0 + 1.6, P, 2), { tone: "faint" }), extra: Dots(axles(a, b), { size: 0.55, tone: "mid" }) });
    };
    if (low) {
      frontPart(`${key}.frame.front`, fx0, low[0], FRAME.z1);
      frontPart(`${key}.frame.low`, low[0], low[1], low[2]);
      frontPart(`${key}.frame.front`, low[1], fx1, FRAME.z1);
    } else frontPart(`${key}.frame.front`, fx0, fx1, FRAME.z1);
    for (const lx of legs) {
      for (const sy of [-1, 1]) {
        const y0 = sy < 0 ? -FY - 0.5 : FY - 2.5;
        box(`${key}.leg`, [lx - 1.5, y0, 1.4], [lx + 1.5, y0 + 3, z0], { tone: "mid" }, { r: 0.4, extra: sy > 0 ? Dots([at([lx, FY + 0.5, z0 - 1.8]), at([lx, FY + 0.5, 4])], { size: 0.4 }) : "" });
        box(`${key}.foot`, [lx - 2.4, y0 - 0.9, 0], [lx + 2.4, y0 + 3.9, 1.4], { tone: "lo" }, { r: 0 });
      }
      box(`${key}.brace`, [lx - 1, -FY + 2.5, 6], [lx + 1, FY - 2.5, 8], { tone: "lo" }, { r: 0.3 });
    }
    if (rails) {
      for (const sy of [-1, 1]) {
        const py0 = sy < 0 ? -FY : BELT.y1;
        const ry0 = sy < 0 ? BELT.y0 : BELT.y1 - 0.8;
        for (const px of rails.posts) {
          box(`${key}.rail.post`, [px - 1, py0, FRAME.z1], [px + 1, py0 + 2, 34.6], { tone: "mid" }, { r: 0.3 });
          if (sy > 0) {
            const KF = fy([px, FY, 32.6]);
            disc(`${key}.rail.knob`, KF, 0, 1.6, 1.3, { tone: "mid" }, { extra: Ln(G.circleOf(KF, 1.6, 0.6, P), { tone: "lo" }) });
          }
        }
        for (const [a, b] of rails.spans) box(`${key}.rail`, [a, ry0, 30], [b, ry0 + 0.8, 33.4], { tone: "mid" }, { r: 0.35, steps: 3 });
      }
    }
    return { xa, xb, zc };
  }
  const PX = PUSH.x;
  const inf = conveyor("infeed", CONV.infeed, { legs: [CONV.infeed.x0 + 5, CONV.infeed.x1 - 7], rails: { posts: [-84, -66, -50.5], spans: [[-86, -48.5]] } });
  const out = conveyor("outfeed", CONV.outfeed, { legs: [CONV.outfeed.x0 + 6, CONV.outfeed.x1 - 6], rails: { posts: [-1, 8.5, 44.5], spans: [[-3, 10.5], [42.5, 48.6]] }, low: [PX - 13, PX + 17.4, 22.2] });

  function gearmotor(key, x, s = 1) {
    const zc = BELT.top - BELT.rr;
    const gy = -FY - 6.6 * s;
    box(`${key}.gearbox`, [x - 3.6 * s, gy, zc - 4.4 * s], [x + 3.6 * s, -FY, zc + 3.4 * s], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.3, extra: Dots([at([x + 3.6 * s, -FY - 2, zc + 2.2 * s]), at([x + 3.6 * s, gy + 2, zc - 3.2 * s])], { size: 0.4 }) });
    const MF = fmy([x, gy, zc - 0.6]);
    const len = 11 * s;
    const mr = 3.3 * s;
    turned(`${key}.motor`, MF, [[0, mr], [len, mr]], { tone: "mid" }, { inner: Ln(G.arcOf(MF, 1.4, mr, P) + G.arcOf(MF, len - 1.4, mr, P), { tone: "faint" }) });
    turned(`${key}.fan`, MF, [[len, mr - 0.2], [len + 2.4 * s, mr - 0.2], [len + 3.4 * s, mr * 0.66], [len + 3.8 * s, 0.6]], { tone: "mid" }, { extra: k.fadedSvg(G.ribsOf(MF, len + 0.2, len + 2.4 * s, mr - 0.2, 12, P, { fade: [0.15, 0.6] }), { tone: "lo" }) });
    const ty = gy - 4 * s;
    box(`${key}.terminal`, [x - 2.2 * s, ty - 5.6 * s, zc - 0.6 + mr - 0.5], [x + 2.2 * s, ty, zc - 0.6 + mr + 2.1 * s], { tone: "mid" }, { r: 0.5, steps: 3, extra: Dots([at([x - 1.2 * s, ty - 4.8 * s, zc - 0.6 + mr + 2.1 * s]), at([x + 1.2 * s, ty - 0.8 * s, zc - 0.6 + mr + 2.1 * s])], { size: 0.35 }) });
  }
  gearmotor("infeed", inf.xa);
  gearmotor("outfeed", out.xa);

  // ---------- weigh station: a single-point load cell cantilevered from a pedestal carries its own short conveyor ----------
  const wg = belt("weigh", CONV.weigh);
  {
    const { x0, x1 } = CONV.weigh;
    for (const sy of [-1, 1]) {
      const ya = sy < 0 ? -FY : BELT.y1;
      const yb = sy < 0 ? BELT.y0 : FY;
      for (const [a, b, xc] of [[x0 - 0.6, x0 + 3.6, wg.xa], [x1 - 3.6, x1 + 0.6, wg.xb]]) {
        box("weigh.block", [a, ya, 21.6], [b, yb, FRAME.z1], { tone: "mid" }, { r: 0.4, steps: 2, bevel: 0.2, extra: sy > 0 ? Dots([at([xc, FY, wg.zc])], { size: 0.55, tone: "mid" }) : "" });
      }
      const TB = fx([x0 + 3.6, sy * 13, 24.4]);
      disc("weigh.tiebar", TB, 0, x1 - x0 - 7.2, 0.9, { tone: "mid" });
    }
    box("weigh.spider", [-30, -13.9, 20.9], [-12, 13.9, 21.9], { tone: "lo" }, { r: 0.4, extra: Dots([at([-28, 13.9, 21.4]), at([-14, 13.9, 21.4])], { size: 0.35 }) });
  }
  gearmotor("weigh", wg.xb, 0.72);
  box("weigh.pedestal", [PEDESTAL.x0, PEDESTAL.y0, 1.2], [PEDESTAL.x1, PEDESTAL.y1, PEDESTAL.z1], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.4, extra: Dots([at([PEDESTAL.x0 + 1.6, PEDESTAL.y1, 2]), at([PEDESTAL.x1 - 1.6, PEDESTAL.y1, 2])], { size: 0.45 }) });
  box("weigh.pedestal.foot", [PEDESTAL.x0 - 2, PEDESTAL.y0 - 2, 0], [PEDESTAL.x1 + 2, PEDESTAL.y1 + 1.4, 1.2], { tone: "lo" }, { r: 0.6 });
  {
    const zc = (CELL.z0 + CELL.z1) / 2;
    const hole = recess("y", CELL.y1, binocular(-24.4, -16.4, zc, 2.3, 0.8), CELL.y1 - CELL.y0 - 1, "hero-dark");
    const cy = (CELL.y0 + CELL.y1) / 2;
    const bolts = [[-34, -2.4], [-34, 2.4], [-29.6, -2.4], [-29.6, 2.4], [-14, -2.4], [-14, 2.4], [-10, -2.4], [-10, 2.4]].map(([x, y]) => at([x, cy + y, CELL.z1]));
    box("weigh.cell", [CELL.x0, CELL.y0, CELL.z0], [CELL.x1, CELL.y1, CELL.z1], { tone: "hi" }, { r: 0.5, steps: 2, bevel: 0.3, extra: hole + Dots(bolts, { size: 0.4 }) });
  }
  box("weigh.gauge", [-23.4, 6, CELL.z1], [-17.4, 11, CELL.z1 + 0.5], { tone: "lo" }, { r: 0.8, steps: 3 });
  box("weigh.mount", [-16, 4.6, CELL.z1], [-8.4, 12.4, 20.9], { tone: "lo" }, { r: 0.3 });
  const cellOut = gland("weigh.cell.gland", fy([-30.5, CELL.y1, 16]));

  // the junction box on the bench reads the cell; its plug carries the signal to the cabinet
  {
    const J = JBOX;
    const lid = planOf([J.x0, J.y0], [J.x1, J.y1], 0.8);
    const screws = k.corners(lid, 1.3).map(([x, y]) => at([x, y, J.z1]));
    box("jbox", [J.x0, J.y0, 0], [J.x1, J.y1, J.z1], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.3, inner: Ln(k.sideSeam(lid, J.z1 - 1.6, P, 3), { tone: "faint" }), extra: Dots(screws, { size: 0.35 }) + led("jbox-led", [J.x0 + 2.4, J.y1, 5.6], 0.65) });
  }
  const jboxIn = gland("jbox.gland", fz([-30.5, PLUG.y, JBOX.z1]));
  const SOCK = fx([PLUG.socket, PLUG.y, PLUG.z]);
  turned("plug.socket", SOCK, [[0, 2.1], [0.8, 2.1]], { tone: "mid" }, { extra: Dots([0, 1, 2].map((i) => at([PLUG.socket + 0.8, PLUG.y + 0.9 * Math.cos(rad(90 + i * 120)), PLUG.z + 0.9 * Math.sin(rad(90 + i * 120))])), { size: 0.3, tone: "mid" }) });
  const CLIP = { x0: PLUG.socket + 10.6, x1: PLUG.socket + 14.6 };
  box("plug.clip.foot", [CLIP.x0 + 0.2, PLUG.y - 2.6, 0], [CLIP.x1 - 0.2, PLUG.y + 2.6, 0.7], { tone: "lo" }, { r: 0.4, extra: Dots([at([(CLIP.x0 + CLIP.x1) / 2, PLUG.y - 1.8, 0.7]), at([(CLIP.x0 + CLIP.x1) / 2, PLUG.y + 1.8, 0.7])], { size: 0.35 }) });
  turned("plug.clip", fx([CLIP.x0, PLUG.y, PLUG.z]), [[0, 1.5], [CLIP.x1 - CLIP.x0, 1.5]], { tone: "mid" }, { extra: Ln(G.circleOf(fx([CLIP.x0, PLUG.y, PLUG.z]), CLIP.x1 - CLIP.x0, 0.55, P), { tone: "lo" }) });

  // photo-eye across the infeed, just before the weigh belt
  box("eye.sensor", [EYE.x - 3, -FY - 3.4, FRAME.z1], [EYE.x + 3, BELT.y0 - 0.4, 35.6], { tone: "mid" }, { r: 0.6, steps: 3, bevel: 0.3, extra: `<g class="hero-eye" data-part="eye">${Dots([at([EYE.x + 1.6, -FY - 1.4, 35.6])], { size: 0.75, tone: "hi" })}</g>` });
  disc("eye.lens", fy([EYE.x, BELT.y0 - 0.4, 31.2]), 0, 0.5, 1.4, { tone: "mid" });
  box("eye.reflector", [EYE.x - 2.6, BELT.y1 + 0.4, FRAME.z1], [EYE.x + 2.6, FY + 1, 35], { tone: "mid" }, { r: 0.5, steps: 3, extra: Dots([at([EYE.x - 1.6, FY + 1, 33.4]), at([EYE.x + 1.6, FY + 1, 33.4])], { size: 0.4 }) });

  // ---------- downstream: where passed decisions are acted on ----------
  const DP = planOf([DOWN.x0, DOWN.y0], [DOWN.x1, DOWN.y1], 3);
  box("down.plinth", [DP.x + 2, DP.y + 2, 0], [DP.x + DP.w - 2, DP.y + DP.d - 2, 3], { tone: "lo" }, { r: 2, steps: 4 });
  {
    const door = onFaceY(DOWN.y1, roundRect(DP.x + 6.4, 8, DP.x + 22, 40, 1.6));
    const doorIn = onFaceY(DOWN.y1, roundRect(DP.x + 8.4, 10, DP.x + 20, 38, 1));
    const louvres = Array.from({ length: 8 }, (_, i) => onFaceX(DOWN.x1, roundRect(-13, 12 + i * 3.6, 13, 13.4 + i * 3.6, 0.7, 3))).join("");
    const screws = k.corners(DP, 4);
    const extra = Ln(door, { tone: "lo" }) + Ln(doorIn, { tone: "faint" }) + Ln(louvres, { tone: "lo" }) + Ln(screws.map(([x, y]) => k.ring(x, y, 1.5, DOWN.z1, P, 14)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, DOWN.z1])), { size: 0.45 });
    const shape = record(A.slab(DP, 3, DOWN.z1 - 3, { name: "down.case" }, 6));
    put("down.case", [DP.x + DP.w / 2, 0, 24], S(k.slabOf(DP, 3, DOWN.z1 - 3, P, 6, 1.2), { tone: "mid", inner: Ln(k.sideSeam(DP, DOWN.z1 - 6, P, 6), { tone: "faint" }) }) + extra, [shape]);
  }
  for (const z of [12, 32]) cyl("down.hinge", DP.x + 5, DOWN.y1 + 0.8, 0.8, z, z + 4, { tone: "lo" }, { steps: 14 });
  box("down.latch", [DP.x + 18.4, DOWN.y1, 22], [DP.x + 20.8, DOWN.y1 + 1.4, 27], { tone: "lo" }, { r: 0.5, steps: 3 });
  cyl("down.eye", DP.x + DP.w / 2, 0, 2.6, DOWN.z1, DOWN.z1 + 1.6, { tone: "mid" }, { steps: 22, extra: Ln(k.ring(DP.x + DP.w / 2, 0, 1.2, DOWN.z1 + 1.6, P, 16), { tone: "lo" }) });
  // the inlet hood the outfeed runs into
  box("down.hood.back", [DOWN.x0 - 9, -FY - 2, FRAME.z0], [DOWN.x0, -FY, 43], { tone: "mid" }, { r: 0.3 });
  box("down.hood.front", [DOWN.x0 - 9, FY, FRAME.z0], [DOWN.x0, FY + 2, 43], { tone: "mid" }, { r: 0.3, extra: Dots([at([DOWN.x0 - 7, FY + 2, 31.4]), at([DOWN.x0 - 2, FY + 2, 31.4]), at([DOWN.x0 - 7, FY + 2, 39.4]), at([DOWN.x0 - 2, FY + 2, 39.4])], { size: 0.4 }) });
  box("down.hood.top", [DOWN.x0 - 9, -FY - 2, 43], [DOWN.x0, FY + 2, 45], { tone: "mid" }, { r: 0.4, bevel: 0.2 });

  // ---------- control cabinet, display head, stack light, knob and journal printer ----------
  const lineAtLoad = M.createLine();
  const CP = planOf([CAB.x0, CAB.y0], [CAB.x1, CAB.y1], 2);
  for (const [x, y] of k.corners(CP, 3.4)) cyl("cab.foot", x, y, 1.6, 0, 2, { tone: "lo" }, { steps: 16 });
  const DOOR = { x0: CAB.x0 + 3, x1: STRIP.x0 - 3, z0: 12, z1: CAB.z1 - 4 };
  {
    const door = onFaceY(CAB.y1, roundRect(DOOR.x0, DOOR.z0, DOOR.x1, DOOR.z1, 1.6));
    const panel = onFaceY(CAB.y1, roundRect(DOOR.x1 + 2, DOOR.z0, CAB.x1 - 3, DOOR.z1, 1.6));
    const louvres = Array.from({ length: 6 }, (_, i) => onFaceX(CAB.x1, roundRect(CAB.y0 + 5, 24 + i * 3.2, CAB.y1 - 5, 25.4 + i * 3.2, 0.7, 3))).join("");
    const panelScrews = [[DOOR.x1 + 3.6, DOOR.z0 + 1.6], [CAB.x1 - 4.6, DOOR.z0 + 1.6], [DOOR.x1 + 3.6, DOOR.z1 - 1.6], [CAB.x1 - 4.6, DOOR.z1 - 1.6]].map(([x, z]) => at([x, CAB.y1, z]));
    const shape = record(A.slab(CP, 2, CAB.z1 - 2, { name: "cab.body" }, 4));
    put("cab.body", [CP.x + CP.w / 2, CP.y + CP.d / 2, 30], S(k.slabOf(CP, 2, CAB.z1 - 2, P, 4, 1), { tone: "mid", inner: Ln(k.sideSeam(CP, 6, P, 4), { tone: "faint" }) }) + Ln(door + panel, { tone: "lo" }) + Ln(louvres, { tone: "lo" }) + Dots(panelScrews, { size: 0.4 }), [shape]);
  }
  for (const z of [15, 34]) cyl("cab.hinge", DOOR.x0 - 0.8, CAB.y1 + 0.7, 0.7, z, z + 4, { tone: "lo" }, { steps: 14 });
  box("cab.latch", [DOOR.x1 - 4.4, CAB.y1, 25], [DOOR.x1 - 2, CAB.y1 + 1.2, 33], { tone: "lo" }, { r: 0.5, steps: 3 });
  const GZ = 8.4;
  const glandEye = gland("cab.gland.eye", fy([EYE.x, CAB.y1, GZ]));
  const glandModel = gland("cab.gland.model", fmx([CAB.x0, -44, GZ]));
  const glandCell = gland("cab.gland.cell", fx([CAB.x1, -42, 6]));
  const glandValve = gland("cab.gland.valve", fx([CAB.x1, -60, 6]));

  // tolerance knob on its dial plate; the scale faces the viewer
  {
    const { x, y, r } = KNOB;
    const z0 = CAB.z1;
    const dial = k.radialTicks(x, y, KNOB.dial - 0.8, 15, 3, z0 + 0.6, [1, 2.1], P, rad(KNOB_FROM), rad(225));
    cyl("knob.dial", x, y, KNOB.dial, z0, z0 + 0.6, { tone: "lo" }, { steps: 48, extra: Ln(k.ring(x, y, KNOB.dial - 0.8, z0 + 0.6, P, 48), { tone: "lo" }) + Ln(dial.minor, { tone: "lo" }) + Ln(dial.major, { tone: "mid" }) });
    cyl("knob.skirt", x, y, r + 0.8, z0 + 0.6, z0 + 1.6, { tone: "mid" }, { steps: 36 });
    const ztop = KNOB_TOP;
    const pointer = `<g transform="${k.topMatrix([x, y], ztop, P, "x")}"><g data-part="pointer" transform="rotate(${knobAngle(M.T_REST)})">${Ln(`M0 -0.8L0 -${f2(r - 0.1)}`, { tone: "hi" })}<circle class="hero-pip" cx="0" cy="-0.8" r="0.45"/></g></g>`;
    focusRings.push(`<path class="hero-focus" data-for="knob" d="${k.ring(x, y, KNOB.dial + 1.6, z0, P, 48)}"/>`);
    cyl("knob", x, y, r, z0 + 1.6, ztop, { tone: "mid" }, {
      steps: 36,
      bevel: 0.3,
      extra: Ln(k.knurl(x, y, r, z0 + 1.6, ztop, 40, P, 0.4), { tone: "lo" }) + pointer,
      attrs: ` data-part="knob" tabindex="0" role="slider" aria-label="Tolerance τ" aria-valuemin="${M.T_MIN}" aria-valuemax="${M.T_MAX}" aria-valuenow="${M.T_REST}" aria-valuetext="${tauText(M.T_REST)}"`,
    });
  }
  cyl("cab.key", CAB.x0 + 6, CAB.y0 + 6, 2.4, CAB.z1, CAB.z1 + 1.8, { tone: "mid" }, { steps: 24, extra: Ln(k.lineOnTop([CAB.x0 + 6, CAB.y0 + 4.8], [CAB.x0 + 6, CAB.y0 + 7.2], CAB.z1 + 1.8, P), { tone: "lo" }) });
  cyl("post.flange", POST.x, POST.y, 4, CAB.z1, CAB.z1 + 1.2, { tone: "mid" }, { steps: 32, extra: Dots([0, 1, 2, 3].map((i) => at([POST.x + 3 * Math.cos((i * Math.PI) / 2 + 0.785), POST.y + 3 * Math.sin((i * Math.PI) / 2 + 0.785), CAB.z1 + 1.2])), { size: 0.35 }) });
  cyl("post", POST.x, POST.y, POST.r, CAB.z1 + 1.2, HEAD.z0 - 2, { tone: "mid" }, { steps: 22 });
  cyl("post.collar", POST.x, POST.y, 3.2, HEAD.z0 - 2, HEAD.z0, { tone: "mid" }, { steps: 24 });
  {
    const HPn = planOf([HEAD.x0, HEAD.y0], [HEAD.x1, HEAD.y1], 1.6);
    const { u0, v0 } = SCREEN;
    const m = k.sideMatrix([0, HEAD.y1 - 0.8], 0, P, "left");
    const n = lineAtLoad.reading ? lineAtLoad.reading.n : 0;
    const cells = Array.from({ length: 6 }, (_, i) => `<rect class="hero-cell" data-cell="${i + 1}"${i < n ? " data-on" : ""} x="${f2(cellU(i))}" y="${f2(v0 + 2)}" width="1.3" height="4.6"/>`).join("");
    const screen = `<g transform="${m}"><text class="hero-digit" data-part="reading" x="${f2(u0 + 1.3)}" y="${f2(v0 + 7.7)}" font-size="7.2">${n}</text>${cells}<path class="hero-gate" data-part="gate" d="M${f2(gateU(M.T_REST) - 0.65)} ${f2(v0 + 7.6)}h1.3"/></g>`;
    const glass = recess("y", HEAD.y1, roundRect(u0, HEAD.z0 + 5, u0 + 18, HEAD.z0 + 15, 0.8), 0.8, "hero-glass", screen);
    const keys = [HEAD.z0 + 13.2, HEAD.z0 + 9.8, HEAD.z0 + 6.4].map((z) => onFaceY(HEAD.y1, roundRect(HEAD.x1 - 7.4, z - 1.1, HEAD.x1 - 3.8, z + 1.1, 0.6, 3))).join("");
    const screws = [[HEAD.x0 + 1.6, HEAD.z0 + 1.8], [HEAD.x0 + 1.6, HEAD.z1 - 1.8], [HEAD.x1 - 1.6, HEAD.z0 + 1.8], [HEAD.x1 - 1.6, HEAD.z1 - 1.8]].map(([x, z]) => at([x, HEAD.y1, z]));
    const vents = [0, 1, 2, 3].map((i) => onFaceX(HEAD.x1, roundRect(HEAD.y0 + 1.6, HEAD.z0 + 4 + i * 3, HEAD.y1 - 1.6, HEAD.z0 + 5 + i * 3, 0.5, 3))).join("");
    const shape = record(A.slab(HPn, HEAD.z0, HEAD.z1 - HEAD.z0, { name: "head" }, 4));
    put("head", [(HEAD.x0 + HEAD.x1) / 2, (HEAD.y0 + HEAD.y1) / 2, 93], S(k.slabOf(HPn, HEAD.z0, HEAD.z1 - HEAD.z0, P, 4, 0.8), { tone: "mid" }) + glass + Ln(keys, { tone: "mid" }) + Ln(vents, { tone: "lo" }) + Dots(screws, { size: 0.4 }), [shape]);
  }
  {
    const { x, y } = LAMP;
    let z = LAMP.z0;
    cyl("lamp.mount", x, y, LAMP.r + 0.5, z, z + 1.4, { tone: "mid" }, { steps: 30 });
    z += 1.4;
    cyl("lamp.pole", x, y, 1.1, z, z + 5, { tone: "mid" }, { steps: 16 });
    z += 5;
    cyl("lamp.base", x, y, LAMP.r + 0.2, z, z + 1.8, { tone: "mid" }, { steps: 30, bevel: 0.2 });
    z += 1.8;
    for (const color of ["green", "red"]) {
      const LF = fz([x, y, z]);
      const body = k.cylinder(x, y, LAMP.r, z, LAMP.tier, P, 24);
      const glow = `<g class="hero-glow" data-glow="${color}"${(color === "red") === M.redOf(lineAtLoad) ? "" : ' style="opacity:0"'}><path class="hero-lens" d="${body.fill}"/><path class="hero-core" d="${k.cylinder(x, y, LAMP.r * 0.5, z + 1.6, LAMP.tier - 3.2, P, 14).fill}"/></g>`;
      const ribs = k.fadedSvg(G.ribsOf(LF, 0, LAMP.tier, LAMP.r, 14, P, { fade: [0.15, 0.6] }), { tone: "lo" });
      const shape = record(A.cylinder(x, y, LAMP.r, z, LAMP.tier, { name: `lamp.${color}` }));
      put(`lamp.${color}`, [x, y, z + LAMP.tier / 2], `<g class="hero-lamp" data-lamp="${color}">${S(body, { tone: "hi", inner: glow + ribs })}</g>`, [shape]);
      z += LAMP.tier;
      cyl("lamp.ring", x, y, LAMP.r + 0.2, z, z + 1, { tone: "mid" }, { steps: 30 });
      z += 1;
    }
    turned("lamp.cap", fz([x, y, z]), [[0, LAMP.r + 0.2], [1.2, LAMP.r + 0.2], [1.9, LAMP.r - 0.1, 1], [2.8, LAMP.r * 0.62, 1], [3.2, LAMP.r * 0.32, 1], [3.35, 0]], { tone: "mid" }, { smooth: false });
  }
  // the journal printer, at the front of the cabinet top; its strip feeds out of the slot and hangs down the cabinet face
  {
    const Pr = PRINTER;
    const PP = planOf([Pr.x0, Pr.y0], [Pr.x1, Pr.y1], 1.2);
    const slotRing = roundRect(STRIP.x0 - 0.6, STRIP.top - 0.3, STRIP.x1 + 0.6, STRIP.top + 0.7, 0.3, 2);
    const slot = recess("y", Pr.y1, slotRing, 1.2, "hero-dark");
    const vents = Array.from({ length: 4 }, (_, i) => onFaceX(Pr.x1, roundRect(Pr.y0 + 2 + i * 2.4, Pr.z0 + 1.8, Pr.y0 + 3.2 + i * 2.4, Pr.z1 - 2.4, 0.5, 3))).join("");
    const shape = record(A.slab(PP, Pr.z0, Pr.z1 - Pr.z0, { name: "printer.body" }, 3));
    put("printer.body", [PP.x + PP.w / 2, PP.y + PP.d / 2, 49], S(k.slabOf(PP, Pr.z0, Pr.z1 - Pr.z0, P, 3, 0.6), { tone: "mid", inner: Ln(k.sideSeam(PP, Pr.z0 + 1.4, P, 3), { tone: "faint" }) }) + slot + Ln(vents, { tone: "lo" }) + led("printer-led", [Pr.x1 - 1.6, Pr.y1, Pr.z0 + 2.6], 0.6), [shape]);
    const LID = planOf([Pr.x0 + 0.8, Pr.y0 + 0.8], [Pr.x1 - 0.8, Pr.y1 - 2.4], 0.8);
    box("printer.lid", [LID.x, LID.y, Pr.z1], [LID.x + LID.w, LID.y + LID.d, Pr.z1 + 1.4], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.3, extra: Ln(k.planOutline(k.insetPlan(LID, 1.4), Pr.z1 + 1.4, P, 3), { tone: "faint" }) });
    disc("printer.hinge", fx([LID.x + 2, Pr.y0 + 0.4, Pr.z1 + 0.7]), 0, LID.w - 4, 0.7, { tone: "lo" });
    box("printer.button", [Pr.x1 - 4, Pr.y1 - 2.2, Pr.z1], [Pr.x1 - 1.6, Pr.y1 - 0.8, Pr.z1 + 0.6], { tone: "lo" }, { r: 0.5, steps: 3 });
    box("printer.tearbar", [STRIP.x0 - 0.8, Pr.y1, STRIP.top - 1.3], [STRIP.x1 + 0.8, Pr.y1 + 0.4, STRIP.top - 0.6], { tone: "mid" }, { r: 0.1 });
  }

  // ---------- pneumatic pusher ----------
  const PZ = PUSH.z;
  box("push.foot", [PX - 6, -40.4, 0], [PX + 20.4, -27.6, 1.2], { tone: "lo" }, { r: 0.6, extra: Dots([at([PX - 4.6, -39, 1.2]), at([PX + 19, -29, 1.2]), at([PX - 4.6, -29, 1.2]), at([PX + 19, -39, 1.2])], { size: 0.4 }) });
  for (const cx of [PX - 2, PX + 18]) box("push.column", [cx - 2, -36, 1.2], [cx + 2, -32, 23.2], { tone: "mid" }, { r: 0.4 });
  box("push.plate", [PX - 6, -56, 23.2], [PX + 20, -18, 24.6], { tone: "mid" }, { r: 0.6, bevel: 0.3, extra: Dots([at([PX + 18.4, -54, 24.6]), at([PX + 18.4, -20, 24.6])], { size: 0.4 }) });
  for (const [y0, y1] of [[-54, -50], [-24, -20]]) box("push.cap", [PX - 5, y0, 24.6], [PX + 5, y1, PZ + 6], { tone: "mid" }, { r: 1, steps: 3, bevel: 0.4 });
  {
    const BF = fy([PX, -50, PZ]);
    turned("push.barrel", BF, [[0, 4.4], [26, 4.4]], { tone: "mid" }, { inner: Ln(G.arcOf(BF, 2.4, 4.4, P) + G.arcOf(BF, 23.6, 4.4, P), { tone: "faint" }) });
    for (const [dx, dz] of [[-3.9, -3.9], [3.9, -3.9], [-3.9, 3.9], [3.9, 3.9]]) {
      prism("push.tierod", fy([PX + dx, -50, PZ + dz]), hexPoly(0.5), 0, 26, { tone: "lo" });
      hex("push.nut", fy([PX + dx, -20, PZ + dz]), 0, 0.7, 0.85, { tone: "lo" });
    }
    turned("push.gland", fy([PX, -20, PZ]), [[0, 2.4], [0.6, 2.4], [1, 2]], { tone: "mid" });
    for (const y of [-45, -29.5]) {
      cyl("push.port", PX, y, 1.2, PZ + 4.3, PZ + 6.2, { tone: "mid" }, { steps: 16 });
      hex("push.fitting", fz([PX, y, PZ + 6.2]), 0, 1.2, 1.05);
    }
  }
  const VX = PX + 9.5;
  box("valve.body", [VX, -50, 24.6], [VX + 7, -24, 30.4], { tone: "mid" }, { r: 0.6, bevel: 0.3, inner: Ln(k.sideSeam(planOf([VX, -50], [VX + 7, -24], 0.6), 27.6, P, 2), { tone: "faint" }), extra: Dots([at([VX + 7, -48, 26.4]), at([VX + 7, -26, 26.4])], { size: 0.35 }) });
  box("valve.coil", [VX + 1, -38.4, 30.4], [VX + 6, -31.6, 36], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.3 });
  box("valve.plug", [VX + 6, -37.2, 30.8], [VX + 9, -32.4, 35.2], { tone: "mid" }, { r: 0.5, steps: 3, extra: Dots([at([VX + 9, -32.4, 34.2])], { size: 0.35 }) });
  for (const y of [-45, -29.5]) {
    cyl("valve.port", VX + 3.5, y, 1, 30.4, 31.4, { tone: "mid" }, { steps: 14 });
    hex("valve.fitting", fz([VX + 3.5, y, 31.4]), 0, 1.1, 1);
  }
  const inlet = fmy([VX + 3.5, -50, 27.5]);
  hex("valve.inlet", inlet, 0, 1.2, 1.1);
  const HOSE_Z = 43.4;
  cable("hose.front", [[VX + 3.5, -29.5, 32.5], [VX + 3.5, -29.5, HOSE_Z], [PX, -29.5, HOSE_Z], [PX, -29.5, PZ + 7.4]], 0.75, { tone: "mid", bend: 3.6 });
  cable("hose.back", [[VX + 3.5, -45, 32.5], [VX + 3.5, -45, HOSE_Z], [PX, -45, HOSE_Z], [PX, -45, PZ + 7.4]], 0.75, { tone: "mid", bend: 3.6 });

  // the air service unit: filter-regulator with its gauge and bowl, on a bracket, fed through the bench
  const FRL = { x0: 50, x1: 57.4, y: -55.5, z0: 24, z1: 31 };
  {
    const { x0, x1, y, z0, z1 } = FRL;
    const cx = (x0 + x1) / 2;
    box("frl.bracket", [x1, y - 4.4, 1.2], [x1 + 1.6, y + 4.4, z1 + 1], { tone: "mid" }, { r: 0.3, extra: Dots([at([x1 + 1.6, y - 2.6, z1 - 1.2]), at([x1 + 1.6, y + 2.6, z1 - 1.2]), at([x1 + 1.6, y - 2.6, z0 + 1.2]), at([x1 + 1.6, y + 2.6, z0 + 1.2])], { size: 0.35 }) });
    box("frl.foot", [x1 - 2.4, y - 5.6, 0], [x1 + 4, y + 5.6, 1.2], { tone: "lo" }, { r: 0.5, extra: Dots([at([x1 + 2.6, y - 4.2, 1.2]), at([x1 + 2.6, y + 4.2, 1.2])], { size: 0.35 }) });
    box("frl.body", [x0, y - 3.7, z0], [x1, y + 3.7, z1], { tone: "mid" }, { r: 1, steps: 3, bevel: 0.4, inner: Ln(k.sideSeam(planOf([x0, y - 3.7], [x1, y + 3.7], 1), z0 + 1.6, P, 3), { tone: "faint" }) });
    turned("frl.bowl", G.frameOf([cx, y, z0], [0, 0, -1], X, Y), [[0, 3.1], [1.4, 3.1], [2, 2.8, 1], [9, 2.5, 1], [11, 1.9, 1], [12, 1.2]], { tone: "mid" }, { inner: Ln(G.arcOf(G.frameOf([cx, y, z0], [0, 0, -1], X, Y), 1.4, 3.1, P), { tone: "faint" }) });
    hex("frl.drain", G.frameOf([cx, y, z0 - 12], [0, 0, -1], X, Y), 0, 1.2, 0.9, { tone: "lo" });
    const GF = fy([cx, y + 3.7, (z0 + z1) / 2]);
    const face = k.sideMatrix([cx, y + 3.7 + 1.2], (z0 + z1) / 2, P, "left");
    const needle = `<g transform="${face}"><g data-part="frl-needle" transform="rotate(38)">${Ln("M0 0.6L0 -1.9", { tone: "hi", free: "end" })}</g></g>`;
    const gticks = Array.from({ length: 7 }, (_, i) => {
      const a = rad(-120 + i * 40);
      return path3([[cx + 1.7 * Math.sin(a), y + 3.7 + 1.2, (z0 + z1) / 2 + 1.7 * Math.cos(a)], [cx + 2.3 * Math.sin(a), y + 3.7 + 1.2, (z0 + z1) / 2 + 2.3 * Math.cos(a)]]);
    }).join("");
    disc("frl.gauge", GF, 0, 1.2, 2.6, { tone: "mid" }, { extra: Ln(G.circleOf(GF, 1.2, 2.3, P), { tone: "lo" }) + Ln(gticks, { tone: "lo" }) + needle + Dots([at([cx, y + 4.9, (z0 + z1) / 2])], { size: 0.35, tone: "hi" }) });
    const KF = fz([cx, y, z1]);
    turned("frl.knob", KF, [[0, 1.4], [1, 1.4], [1, 2.2], [3.4, 2.2], [3.8, 1.8]], { tone: "mid" }, { smooth: false, extra: Ln(k.knurl(cx, y, 2.2, z1 + 1.2, z1 + 3.2, 24, P, 0.3), { tone: "lo" }) });
  }
  const frlIn = fmx([FRL.x0, FRL.y, 27.5]);
  hex("frl.port", frlIn, 0, 1.2, 1.1);
  cable("hose.supply", [tip(inlet, 1.2), [VX + 3.5, FRL.y, 27.5], tip(frlIn, 1.2)], 0.8, { tone: "mid", bend: 2.6 });
  const frlSup = fmy([(FRL.x0 + FRL.x1) / 2 - 1.6, FRL.y - 3.7, 27.5]);
  hex("frl.inlet", frlSup, 0, 1.2, 1.1);
  box("air.bulkhead", [51.4, -68, 0], [57.4, -62, 3], { tone: "mid" }, { r: 0.6, bevel: 0.3, extra: Dots([at([52.4, -67, 3]), at([56.4, -63, 3])], { size: 0.35 }) });
  const bulk = fz([(FRL.x0 + FRL.x1) / 2 - 1.6, -65, 3]);
  hex("air.bulkhead.nut", bulk, 0, 1, 1.4, { tone: "lo" });
  cable("hose.air", [tip(frlSup, 1.2), [bulk.o[0], -65, 27.5], tip(bulk, 1)], 0.8, { tone: "mid", bend: 3 });

  // ---------- held bin ----------
  const BIN = M.BIN;
  {
    const { x0, x1, y0, y1, z1, t } = BIN;
    box("bin.floor", [x0, y0, 0], [x1, y1, 1], { tone: "lo" }, { r: 0.6 });
    box("bin.back", [x0, y0, 1], [x1, y0 + t, z1], { tone: "mid" }, { r: 0.2 });
    box("bin.left", [x0, y0 + t, 1], [x0 + t, y1 - t, z1], { tone: "mid" }, { r: 0.2 });
    box("bin.right", [x1 - t, y0 + t, 1], [x1, y1 - t, z1], { tone: "mid" }, { r: 0.2, extra: Dots([at([x1, y0 + 2, 3]), at([x1, y1 - 2, 3]), at([x1, y0 + 2, z1 - 2]), at([x1, y1 - 2, z1 - 2])], { size: 0.4 }) });
    box("bin.front", [x0, y1 - t, 1], [x1, y1, z1], { tone: "mid" }, { r: 0.2, inner: Ln(k.sideSeam(planOf([x0, y1 - t], [x1, y1], 0.2), z1 - 2.6, P, 2), { tone: "faint" }), extra: Dots([at([x0 + 1.6, y1, 3]), at([x1 - 1.6, y1, 3])], { size: 0.4 }) });
    const cx = (x0 + x1) / 2;
    box("bin.hasp", [cx - 2, y1, 8.6], [cx + 2, y1 + 0.5, 14.8], { tone: "mid" }, { r: 0.4, extra: Dots([at([cx - 1.2, y1 + 0.5, 13.8]), at([cx + 1.2, y1 + 0.5, 13.8])], { size: 0.35 }) });
    box("bin.staple", [cx - 0.9, y1 + 0.5, 9.4], [cx + 0.9, y1 + 1.5, 10.6], { tone: "lo" }, { r: 0.2 });
    box("bin.lock", [cx - 1.8, y1 + 0.6, 4.6], [cx + 1.8, y1 + 2.2, 8.6], { tone: "mid" }, { r: 0.5, steps: 3, bevel: 0.3, extra: Dots([at([cx, y1 + 2.2, 5.8])], { size: 0.35, tone: "lo" }) });
    const shackle = [[-1.1, 0], [-1.1, 1.8], ...Array.from({ length: 9 }, (_, i) => [-1.1 * Math.cos((i / 8) * Math.PI), 1.8 + 1.1 * Math.sin((i / 8) * Math.PI)]), [1.1, 1.8], [1.1, 0]].map(([u, h]) => [cx + u, y1 + 1.4, 8.6 + h]);
    put("bin.shackle", [cx, y1 + 1.4, 10.2], Ln(path3(shackle), { tone: "mid" }), [record(A.box([cx - 1.4, y1 + 1, 8.6], [cx + 1.4, y1 + 1.8, 11.8], { name: "bin.shackle" }))]);
  }

  // ---------- reference weights in their case: the check is itself checked ----------
  {
    const CASE = { x: -86, y: 18, w: 35, d: 15, r: 1.6 };
    const top = 3.4;
    const cy = CASE.y + CASE.d / 2;
    const weights = [[-79.6, 4.4], [-68.7, 3.5], [-59.9, 2.7], [-53.4, 2]];
    const pockets = weights.map(([x, r]) => k.ring(x, cy, r + 0.6, top, P, 32)).join("");
    box("weights.case", [CASE.x, CASE.y, 0], [CASE.x + CASE.w, CASE.y + CASE.d, top], { tone: "lo" }, { r: CASE.r, steps: 4, bevel: 0.3, inner: Ln(k.sideSeam(CASE, 1.6, P, 4), { tone: "faint" }), extra: Ln(k.planOutline(k.insetPlan(CASE, 1.2), top, P, 4), { tone: "faint" }) + Ln(pockets, { tone: "lo" }) + Dots([at([CASE.x + CASE.w / 2, CASE.y + CASE.d, 2.2])], { size: 0.45 }) });
    for (const x of [CASE.x + 6, CASE.x + CASE.w - 6]) disc("weights.hinge", fx([x - 2, CASE.y + 0.6, top + 0.5]), 0, 4, 0.5, { tone: "lo" });
    for (const [x, r] of weights) {
      const h = 1.5 * r;
      turned("weights.weight", fz([x, cy, top]), [[0, r], [h, r], [h, 0.42 * r], [h + 0.22 * r, 0.42 * r], [h + 0.22 * r, 0.62 * r], [h + 0.62 * r, 0.62 * r], [h + 0.74 * r, 0.4 * r], [h + 0.78 * r, 0]], { tone: "mid" }, { smooth: false, inner: Ln(k.sideArc(x, cy, r, top + 0.6, P, 20), { tone: "faint" }) });
    }
  }

  // ---------- cables ----------
  const low = 0.95;
  cable("cable.model", [houseOut, [houseOut[0] + 3.6, -18, 14], [houseOut[0] + 3.6, -18, low], [glandModel[0] - 6.6, -18, low], [glandModel[0] - 6.6, -44, low], [glandModel[0] - 6.6, -44, GZ], glandModel], 0.6);
  cable("cable.eye", [[EYE.x, -FY - 3.4, 31.2], [EYE.x, -22.6, 31.2], [EYE.x, -22.6, GZ], glandEye], 0.5);
  cable("cable.cell", [cellOut, [-30.5, PLUG.y, 16], jboxIn], 0.5);
  cable("cable.signal", [[CLIP.x1, PLUG.y, PLUG.z], [-5.4, PLUG.y, PLUG.z], [-5.4, PLUG.y - 4, low], [-5.4, -42, low], [-5.4, -42, 6], glandCell], 0.55);
  cable("cable.valve", [[VX + 9, -34, 33], [PX + 21.6, -34, 33], [PX + 21.6, -34, low], [PX + 21.6, -60, low], [glandValve[0] + 3.6, -60, low], [glandValve[0] + 3.6, -60, 6], glandValve], 0.55);

  // ---------- the live line: trays, pusher rod, pushed tray and the held stack, ordered by the volume they sweep ----------
  const st = lineAtLoad;
  const litI = M.litOf(st);
  const beltTrays = [];
  const rejects = [];
  for (const tray of st.trays) {
    const pose = M.poseOf(st, tray);
    const g = `<g data-tray="${tray.i}"${pose.emerging ? ' clip-path="url(#hero-slot)"' : ""}><g transform="${placeAt(pose.p)}">${traySvg(tray.n, tray.i === litI)}</g></g>`;
    (pose.layer === "belt" ? beltTrays : rejects).push(g);
  }
  const slotRing = roundRect(SLOT.y0, SLOT.z0 - 0.4, SLOT.y1, SLOT.z1, 1.2);
  const slotClip = k.pathOf(G.hullOf([...slotRing.map(([u, v]) => at([HOUSING.x1, u, v])), ...slotRing.map(([u, v]) => at([HOUSING.x1 + 40, u, v]))]), true);
  const ROD_F = fy([PX, PUSH.glandY, PZ]);
  const ROD = G.rodOut(ROD_F, 0, PUSH.tipY - PUSH.glandY, PUSH.rodR, P, { stroke: PUSH.stroke });
  const stack = st.stack.slice(0, 2).map((h, j) => `<g data-stack="${j}" transform="${placeAt([M.LAND_X, M.Y_END, M.BIN_TOP - j * TRAY.h])}">${traySvg(h.n)}</g>`).reverse().join("");
  const PAD = { x: PX - 5.6, y: PUSH.tipY, w: 11.2, d: PUSH.padT, r: 0.4 };
  const rod = `<g data-part="rod"><clipPath id="hero-rod"><path data-hold d="${ROD.clip}"/></clipPath><g clip-path="url(#hero-rod)">${S(ROD.paths, { tone: "mid" })}</g>${S(k.slabOf(PAD, 28.8, 4.4, P, 2, 0.3), { tone: "mid" })}</g>`;
  put("live.line", [0, 0, 32], `<g data-layer="rod">${rod}</g><g data-layer="belt">${beltTrays.join("")}</g>`, [
    record(A.box([HOUSING.x1, -TRAY.w / 2 - 0.2, BELT.top], [DOWN.x0, TRAY.w / 2 + 0.2, BELT.top + TRAY.h], { name: "live.belt" })),
    record(A.slide(ROD_F, 0, PUSH.tipY - PUSH.glandY, PUSH.rodR, { name: "push.rod" })),
    record(A.box([PAD.x, PAD.y, 28.8], [PAD.x + PAD.w, PAD.y + PAD.d, 33.2], { name: "push.pad" })),
  ]);
  put("live.reject", [M.LAND_X, M.Y_END, 20], `<g data-layer="stack" transform="${placeAt([0, 0, M.stackOffset(st)])}">${stack}</g><g data-layer="reject">${rejects.join("")}</g>`, [
    record(A.box([PX - TRAY.l / 2, TRAY.w / 2 + 0.2, BELT.top], [M.LAND_X + TRAY.l / 2, M.Y_END + TRAY.w / 2, BELT.top + TRAY.h], { name: "live.push" })),
    record(A.box([M.LAND_X - TRAY.l / 2, M.Y_END - TRAY.w / 2, M.BIN_FLOOR], [M.LAND_X + TRAY.l / 2, M.Y_END + TRAY.w / 2, BELT.top - 0.2], { name: "live.fall" })),
  ]);
  // the plug and its lead slide out together along x when the signal is pulled
  {
    const PF = fx([PLUG.socket + 0.8, PLUG.y, PLUG.z]);
    const nut = turnedOf("plug.nut", PF, [[0, 2], [2, 2]], { tone: "mid" });
    const body = turnedOf("plug.body", PF, [[2, 1.6], [4.6, 1.6]], { tone: "mid" });
    const boot = turnedOf("plug.boot", PF, [[4.6, 1.3], [6.6, 0.75]], { tone: "mid" }, { smooth: false });
    const ribs = k.fadedSvg(G.ribsOf(PF, 0, 2, 2, 16, P, { fade: [0.15, 0.6], seams: true }), { tone: "lo" });
    const leadFrom = PLUG.socket + 0.8 + 6.6;
    const lead = [[leadFrom, PLUG.y, PLUG.z], [CLIP.x0, PLUG.y, PLUG.z]];
    R.route("cable.lead", lead, 0.55);
    const pieces = tubePieces(lead, 0.55, P, { maxLength: 30, spacing: 0.6 });
    focusRings.push(`<path class="hero-focus" data-for="plug" d="${path3(Array.from({ length: 33 }, (_, i) => [PLUG.socket + 3.4 + 4.6 * Math.cos((i / 32) * 2 * Math.PI), PLUG.y + 4.6 * Math.sin((i / 32) * 2 * Math.PI), PLUG.z]), true)}"/>`);
    put("live.plug", [PLUG.socket + 5, PLUG.y, PLUG.z], `<g data-part="plug-move">${pieces.map((p) => tubeSvg(p, { tone: "mid" })).join("")}${boot.svg}${body.svg}${nut.svg}${ribs}</g>`, [nut.shape, body.shape, boot.shape, ...pieces.map((p) => A.tube(p.points, p.radii))], {
      attrs: ` data-part="plug" tabindex="0" role="switch" aria-checked="true" aria-label="Load-cell signal plug"`,
      route: "cable.lead",
    });
  }
  // the journal strip, its printed lines and the curl, redrawn by the page as lines feed
  {
    const s = stripOf(st.counts.checked);
    const sheet = sheetD(s.bottom);
    const lines = `<clipPath id="hero-sheet"><path data-part="sheet-clip" d="${sheet}"/></clipPath><g clip-path="url(#hero-sheet)"><g data-part="journal">${journalSvg(st.lines)}</g></g>`;
    const rMax = M.CURL.max;
    put("live.strip", [(STRIP.x0 + STRIP.x1) / 2, STRIP.y + 1, 40], `<path class="hero-paper" data-part="sheet" d="${sheet}"/>${Ln(sheetEdges(s.bottom), { tone: "lo", className: "hero-edges" })}${lines}<g data-part="curl">${curlSvg(s.bottom, s.r)}</g>`, [
      record(A.box([STRIP.x0, STRIP.y, STRIP.top - STRIP.drop - rMax], [STRIP.x1, STRIP.y + 2 * rMax, STRIP.top], { name: "live.strip" })),
    ]);
  }

  A.settle(R, P);
  R.items.sort((a, b) => a.key - b.key);
  const groups = R.items.map((item) => (item.attrs ? `<g${item.attrs}>${item.svg}</g>` : item.svg));
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      "A checkweigher for AI decisions on a bench. A sealed model housing pushes each decision out of a slot in a clear tray holding a token and a stack of evidence slips. The tray crosses a photo-eye onto a short weigh conveyor carried by a load cell, read through a junction box and a plug, under a display head with a stack light. A tray short of the tolerance, or one weighed while the load cell's plug is out, is knocked sideways by a pneumatic pusher into a locked bin; the rest run into the downstream unit. A printer on the control cabinet prints one line per weighing onto a strip that hangs down the cabinet and curls.",
    body: [`<defs><clipPath id="hero-slot"><path d="${slotClip}"/></clipPath></defs>`, ...back, `<g class="hero-line">${groups.join("")}</g>`, ...focusRings],
  });
  const html = k.plateHtml({
    fig: "Fig 1",
    title: "Decision checkweigher",
    hint: "turn knob · tap · pull plug",
    readout: M.readoutOf(st),
    keys: [
      { mark: "lit", label: "The decision being checked" },
      { mark: "raised", label: "e: evidence slips in its tray, against tolerance τ" },
      { mark: "green", label: "Passed, acted on downstream" },
      { mark: "red", label: "Held in the locked bin" },
      { mark: "dim", label: "#: journal line, then the head of its hash chain" },
    ],
    caption:
      "A model of the idea, with no measured data behind it. Every decision leaves the sealed model in a tray with its evidence, and the line weighs that evidence against a stated tolerance before anything downstream acts on it. A decision is acted on only after a valid reading at or above the tolerance: a short one is pushed into a locked bin, and with the load-cell plug pulled every decision is held, so the line fails closed. The printer logs every weighing, passed or held, and chains each line to the one before it.",
    body: `<div class="iso-stage hero-stage" tabindex="0" role="group" aria-label="Decision checkweigher. T or Space strips the evidence from the next decision on the infeed; P pulls or reseats the load-cell plug; arrow keys set the tolerance.">${svg}<span class="hero-sr" role="status" aria-live="polite" data-status></span></div>`,
  });
  return { R, P, svg, html: lean(html), cables: CABLES.length };
}

export function tauText(T) {
  const held = M.SEQ.filter((n) => n < T).length;
  return `τ ${T}: a decision needs ${T} evidence slip${T === 1 ? "" : "s"}; ${held} of ${M.SEQ.length} in the sequence are held`;
}
function sheetEdges(bottom) {
  return path3([[STRIP.x0, STRIP.y, STRIP.top], [STRIP.x0, STRIP.y, bottom]]) + path3([[STRIP.x1, STRIP.y, STRIP.top], [STRIP.x1, STRIP.y, bottom]]);
}

// Drops points that sit on the straight line between their neighbours (within rounding), which is most of every tube's straight run.
export function lean(html) {
  return html.replace(/ d="([^"]*)"/g, (whole, d) => (/[^MLZ0-9 .\-]/.test(d) ? whole : ` d="${leanPath(d)}"`));
}
function leanPath(d) {
  return d
    .split("M")
    .filter(Boolean)
    .map((part) => {
      const closed = part.endsWith("Z");
      const points = part.replace("Z", "").split("L").map((pair) => pair.trim().split(" ").map(Number));
      if (points.some((p) => p.length !== 2 || p.some(Number.isNaN))) return "M" + part;
      const kept = [points[0]];
      for (let i = 1; i < points.length - 1; i++) {
        const a = kept[kept.length - 1];
        const b = points[i];
        const c = points[i + 1];
        const ux = c[0] - a[0];
        const uy = c[1] - a[1];
        const len = Math.hypot(ux, uy);
        const along = len ? ((b[0] - a[0]) * ux + (b[1] - a[1]) * uy) / (len * len) : -1;
        const off = len ? Math.abs((b[0] - a[0]) * uy - (b[1] - a[1]) * ux) / len : 1;
        if (!(off < 0.07 && along > 0 && along < 1)) kept.push(b);
      }
      if (points.length > 1) kept.push(points[points.length - 1]);
      // first point absolute, the rest as relative steps in whole tenths, so nothing drifts
      const tenths = kept.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
      let text = `M${num(tenths[0][0])}${sep(num(tenths[0][1]))}`;
      for (let i = 1; i < tenths.length; i++) {
        const dx = num(tenths[i][0] - tenths[i - 1][0]);
        const dy = num(tenths[i][1] - tenths[i - 1][1]);
        text += (i === 1 ? "l" + dx : sep(dx)) + sep(dy);
      }
      return text + (closed ? "z" : "");
    })
    .join("");
}
const num = (tenths) => {
  const text = String(tenths / 10);
  return text.startsWith("0.") ? text.slice(1) : text.startsWith("-0.") ? "-" + text.slice(2) : text;
};
const sep = (text) => (text.startsWith("-") ? text : " " + text);

// the binocular bore of a single-point load cell: two holes joined by a slot, as a ring in (x, z)
function binocular(c0, c1, z, r, half) {
  const pts = [];
  const n = 16;
  const a0 = Math.asin(half / r);
  const b = Math.PI - a0;
  for (let i = 0; i <= n; i++) {
    const a = -b + (2 * b * i) / n;
    pts.push([c1 + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = a0 + (2 * b * i) / n;
    pts.push([c0 + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  return pts;
}

export function render() {
  return { html: scene().html };
}
