// Fig 7 · the overhead projector's static geometry, built once, in painter's order (back to front).
// Each item records its true shapes as descriptors; build.mjs turns them into audit shapes.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import {
  P, BENCH, BENCH_H, FOOT_H, BODY, FEET_TOP, SHELL_TOP, DECK_TOP, FRAME_TOP, SHEET_TOP, ZH, KR, LEAF, MARKS,
  POST, POST_BOTTOM, POST_TOP, SLIDER, SLIDER_Z, RACK, RACK_Z, KNOB, KNOB_F, LANES, CARRIER,
  leafSvg, slotSvg, mastTop, mastLow, MAST, knobLines, leafFrame, V,
} from "./view.mjs";
import { UP } from "./model.mjs";

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const merge = (list) => ({
  fill: list.map((p) => p.fill).join(""),
  outline: list.map((p) => p.outline).join(""),
  crease: list.map((p) => p.crease || "").join(""),
  top: list.map((p) => p.top || "").join(""),
  bevel: list.map((p) => p.bevel || "").join(""),
  shades: [0, 1, 2, 3].map((i) => list.map((p) => p.shades[i] || "").join("")),
});
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// face-plane helpers
const onY = (y, list, closed = false) => k.pathOf(list.map(([x, z]) => at([x, y, z])), closed);
const onX = (x, list, closed = false) => k.pathOf(list.map(([y, z]) => at([x, y, z])), closed);
const arcPts = (cx, cz, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});
const stadiumV = (cx, z0, z1, r) => [...arcPts(cx, z1 - r, r, 0, Math.PI), ...arcPts(cx, z0 + r, r, Math.PI, 2 * Math.PI)];

// the cord: boot on the housing front, a drop to the bench, a run to the plug in the power block
export const CORD_R = 1.3;
export const CORD = G.fillet([[-44, 69, 11], [-44, 72.5, 11], [-50, 72.5, 1.9], [-69.8, 72.5, 1.9]], 3.4, 7, { P, tube: CORD_R });
export const cordPieces = () => tubePieces(CORD, CORD_R, P, { maxLength: 9 });

export function build(pose = { lj: 0, lq: 1, fz: 0 }, sel = "J") {
  const items = [];
  const put = (name, svg, shapes = [], extra = {}) => items.push({ name, svg, shapes, ...extra });

  // ============================ bench, ruler, maker's plate
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(BENCH, 22)).slice(1)) {
      feet.push(S(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 22), { tone: "lo" }));
      feet.push(S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 22), { tone: "lo" }));
      shapes.push(["cyl", x, y, 7, -BENCH_H - FOOT_H, 1.6], ["cyl", x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6]);
    }
    put("stand.feet", halo + feet.join(""), shapes);
    const screws = k.corners(BENCH, 10);
    // tapped mounting holes on a 16-unit pitch beside the projector; the tray legs bolt into two of them.
    // Holes hidden under the tray bed or the housing from this camera are left out of the markup.
    const covers = [[[64, -47, 37], [149, 47, 39.5]], [[-62, -62, 0], [62, 62, 40]]];
    const hidden = (p) => covers.some(([lo, hi]) => {
      let t0 = 0, t1 = 1e4;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(V[i]) < 1e-9) { if (p[i] < lo[i] || p[i] > hi[i]) return false; continue; }
        const a = (lo[i] - p[i]) / V[i], b = (hi[i] - p[i]) / V[i];
        t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      }
      return t0 <= t1;
    });
    const HOLES = [];
    for (let x = 70; x <= 134; x += 16) for (let y = -56; y <= 56; y += 16) if (!(x === 134 && Math.abs(y) === 40) && ![-1.6, 1.6].some((d) => hidden([x + d, y, 0])) && !hidden([x, y + 1.6, 0])) HOLES.push([x, y]);
    put("stand.bench",
      S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }) +
      `<path class="so-bore" d="${HOLES.map(([x, y]) => k.ring(x, y, 0.75, 0, P, 10)).join("")}"/>` +
      L(HOLES.map(([x, y]) => k.ring(x, y, 1.5, 0, P, 12)).join(""), { tone: "faint" }),
      [["slab", BENCH, -BENCH_H, BENCH_H]]);

    const strip = { x: -30, y: 76, w: 100, d: 6, r: 1 };
    const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.2], P);
    put("bench.ruler",
      S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) +
      Dt([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }),
      [["slab", strip, 0, 0.6]]);

    const plate = { x: 98, y: 60, w: 48, d: 16, r: 1.5 };
    const z = 0.8;
    const rules = [24, 19, 13].map((w, i) => k.lineOnTop([plate.x + 18, plate.y + 4.4 + i * 3.6], [plate.x + 18 + w, plate.y + 4.4 + i * 3.6], z, P)).join("");
    put("bench.label",
      S(k.slabOf(plate, 0, z, P, 4), { tone: "lo", crease: "none" }) +
      L(k.planOutline(k.insetPlan(plate, 1.6), z, P, 4), { tone: "faint" }) +
      L(k.lineOnTop([plate.x + 15, plate.y + 1.6], [plate.x + 15, plate.y + plate.d - 1.6], z, P), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([plate.x + 3.4, plate.y + 9.6], z, P, "x"), "AU-7", { size: 3.6, tone: "mid" }) +
      L(rules, { tone: "lo", free: true }) +
      Dt([at([plate.x + plate.w - 3, plate.y + 3, z]), at([plate.x + plate.w - 3, plate.y + plate.d - 3, z])], { size: 0.45 }),
      [["slab", plate, 0, z]]);
  }

  // ============================ power block on the bench (the cord's far end)
  {
    const block = { x: -98, y: 63, w: 18, d: 18, r: 2 };
    const recess = [[68.5, 0.6], [75.5, 0.6], [75.5, 6.6], [68.5, 6.6]];
    put("power.block",
      S(k.slabOf(block, 0, 9, P, 4, 0.6), { tone: "mid" }) +
      L(onX(-80, recess, true), { tone: "lo" }) +
      L(k.sideSeam(block, 2.4, P, 4), { tone: "faint" }) +
      L([[-93, 67], [-85, 77]].map(([x, y]) => k.ring(x, y, 1.4, 9, P, 14)).join(""), { tone: "lo" }) +
      Dt([at([-93, 67, 9]), at([-85, 77, 9])], { size: 0.45 }),
      [["slab", block, 0, 9]]);
  }

  // ============================ folding post: bracket, clevis hinge, mast with rack (behind the housing)
  const CF = G.frameOf([POST[0], 0, 46], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const D_SHAPE = [[-6, -6], [6, -6], ...arcPts(0, 0, 6, 0, Math.PI, 12).slice(0, -1).map(([u, v]) => [u, v])].concat([[-6, 0]]);
  {
    const bracket = { x: -84, y: -19, w: 22, d: 18, r: 1.5 };
    put("post.bracket",
      S(k.slabOf(bracket, 22, 18, P, 4, 0.5), { tone: "mid" }) +
      Dt([at([-66, -15, 40]), at([-66, -5, 40])], { size: 0.45 }),
      [["slab", bracket, 22, 18]]);
    put("post.cheekFar", S(G.prismOf(CF, D_SHAPE, -19, -16.5, P), { tone: "mid" }), [["prism", CF, D_SHAPE, -19, -16.5, { owner: "clevis" }]]);
    // the post's lower end is a D-shaped tang round the pin; the mast stands flush on its flat top
    const TANG = [[-3.5, POST_BOTTOM - 46], [3.5, POST_BOTTOM - 46], ...arcPts(0, 0, 3.5, 0, -Math.PI, 10)];
    put("post.knuckle", S(G.prismOf(CF, TANG, -16.5, -3.5, P), { tone: "mid" }) , [["prism", CF, TANG, -16.5, -3.5, { owner: "clevis" }]]);
    const low = mastLow(pose.fz);
    put("post.mast",
      slotSvg(low.mast, { tone: "mid", name: "mastLow" }) + slotSvg(low.rack, { tone: "mid", crease: "none", name: "rackLow" }) +
      `<path class="iso-line" data-tone="lo" data-slot="teethLow" d="${low.teeth}"/>`,
      (pose) => {
        const z1 = SLIDER_Z[0] + pose.fz;
        return [["slab", MAST, POST_BOTTOM, z1 - POST_BOTTOM, { owner: "clevis" }], ["slab", RACK, RACK_Z[0], z1 - RACK_Z[0], { owner: "clevis" }]];
      });
    put("post.cheekNear", S(G.prismOf(CF, D_SHAPE, -3.5, -1, P), { tone: "mid" }), [["prism", CF, D_SHAPE, -3.5, -1, { owner: "clevis" }]]);
    const lock = [[0.4, 2.6], [1, 3.3], [4.2, 3.3], [4.8, 2.7]];
    put("post.lock",
      S(G.disc(-1, 0.4, 2.2, CF, P), { tone: "mid" }) +
      S(G.solidOf(lock, CF, P), { tone: "mid" }) +
      L(G.ribsOf(CF, 1, 4.2, 3.3, 22, P), { tone: "lo" }) +
      L(G.circleOf(CF, 4.8, 1.1, P), { tone: "lo" }),
      [["disc", CF, -1, 0.4, 2.2, { owner: "clevis" }], ["solid", CF, lock, { owner: "clevis" }]]);
  }

  // ============================ the carriage on the mast: slider and the pinion's knurled focus knob (moves with focus)
  {
    const knob = [[0, 4.4], [0.5, 5], [4.5, 5], [5, 4.4]];
    const lines = knobLines(pose.fz);
    put("carriage.slider",
      S(k.slabOf(SLIDER, SLIDER_Z[0], SLIDER_Z[1] - SLIDER_Z[0], P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(SLIDER, SLIDER_Z[0] + 4, P, 4), { tone: "faint" }) }) +
      Dt([at([SLIDER.x + 2.2, SLIDER.y + SLIDER.d - 2.2, SLIDER_Z[1]]), at([SLIDER.x + SLIDER.w - 2.2, SLIDER.y + 2.2, SLIDER_Z[1]])], { size: 0.45 }),
      [["slab", SLIDER, SLIDER_Z[0], SLIDER_Z[1] - SLIDER_Z[0], { owner: "clevis" }]], { part: "carriage" });
    put("carriage.knob",
      S(G.disc(-1.2, 0, 2.6, KNOB_F, P), { tone: "mid" }) +
      S(G.solidOf(knob, KNOB_F, P), { tone: "mid" }) +
      `<path class="iso-line" data-tone="lo" data-slot="ribs" d="${lines.ribs}"/>` +
      L(G.circleOf(KNOB_F, 5, 1.2, P), { tone: "lo" }) +
      `<path class="iso-line" data-tone="hi" data-slot="pointer" data-free="end" d="${lines.pointer}"/>`,
      [["disc", KNOB_F, -1.2, 0, 2.6], ["solid", KNOB_F, knob]], { part: "carriage" });
    const top = mastTop(pose.fz);
    put("post.mastTop",
      slotSvg(top.mast, { tone: "mid", name: "mast" }) + slotSvg(top.rack, { tone: "mid", crease: "none", name: "rack" }) +
      `<path class="iso-line" data-tone="lo" data-slot="teeth" d="${top.teeth}"/>`,
      (pose) => {
        const z0 = SLIDER_Z[1] + pose.fz;
        return [["slab", MAST, z0, POST_TOP - z0, { owner: "clevis" }], ["slab", RACK, z0, RACK_Z[1] - z0, { owner: "clevis" }]];
      });
    const cap = { x: POST[0] - 4.2, y: POST[1] - 4.2, w: 8.4, d: 8.4, r: 1.2 };
    put("post.cap", S(k.slabOf(cap, POST_TOP, 2.5, P, 3, 0.5), { tone: "mid" }) + Dt([at([POST[0], POST[1], POST_TOP + 2.5])], { size: 0.45 }), [["slab", cap, POST_TOP, 2.5, { owner: "clevis" }]]);
  }

  // ============================ lamp housing: rubber feet, shell with fan grille and vents, deck with the Fresnel stage
  {
    const feet = byDepth(k.corners(BODY, 9)).map(([x, y]) => S(k.cylinder(x, y, 4.2, 0, FEET_TOP, P, 18), { tone: "lo" })).join("");
    put("body.feet", `<path class="iso-halo" d="${k.haloOf(BODY, 0, 6, P)}" style="opacity:.7"/>` + feet, k.corners(BODY, 9).map(([x, y]) => ["cyl", x, y, 4.2, 0, FEET_TOP]));

    // the +y face (y = 62): fan grille and vent slots; the +x face (x = 62): fuse cap
    const Y = BODY.y + BODY.d;
    const g = [-14, 19];
    const grille =
      L([11, 4.6].map((r) => k.sideRing([g[0], Y, g[1]], r, "y", P, 48)).join(""), { tone: "lo" }) +
      L([9.2, 7].map((r) => k.sideRing([g[0], Y, g[1]], r, "y", P, 44)).join(""), { tone: "faint" }) +
      L(k.sideRing([g[0], Y, g[1]], 2, "y", P, 20), { tone: "mid" }) +
      L([0.25, 0.75, 1.25, 1.75].map((q) => {
        const a = q * Math.PI;
        return onY(Y, [[g[0] + 2 * Math.cos(a), g[1] + 2 * Math.sin(a)], [g[0] + 9.2 * Math.cos(a), g[1] + 9.2 * Math.sin(a)]]);
      }).join(""), { tone: "faint" }) +
      Dt([[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([dx, dz]) => at([g[0] + dx, Y, g[1] + dz])), { size: 0.45 });
    const slots = Array.from({ length: 8 }, (_, i) => onY(Y, stadiumV(9.2 + i * 5, 10, 28, 1.2), true)).join("");
    const vents = `<path class="so-bore" d="${slots}"/>` + L(slots, { tone: "lo" });
    const shell = k.slabOf(BODY, FEET_TOP, SHELL_TOP - FEET_TOP, P, 8, 0);
    put("body.shell",
      S(shell, { tone: "mid", inner: L(k.sideSeam(BODY, 7, P, 8), { tone: "faint" }) }) + grille + vents +
      Dt([[-49, 29.5], [49, 29.5]].map(([x, z]) => at([x, Y, z])), { size: 0.45 }),
      [["slab", BODY, FEET_TOP, SHELL_TOP - FEET_TOP]]);

    const deck = k.insetPlan(BODY, 1.2);
    const GLASS = { x: -47.5, y: -47.5, w: 95, d: 95, r: 2.5 };
    const rings = [6, 11, 16, 21, 26, 31].map((r) => k.ring(0, 0, r, DECK_TOP, P, 72)).join("");
    const tx = k.topTicks(-40, 40, 4, 5, 47.5, DECK_TOP, [1.6, 3], P, "x");
    const ty = k.topTicks(-40, 40, 4, 5, 47.5, DECK_TOP, [1.6, 3], P, "y");
    const screws = k.corners(deck, 5.4);
    put("body.deck",
      S(k.slabOf(deck, SHELL_TOP, DECK_TOP - SHELL_TOP, P, 8, 1), { tone: "mid" }) +
      `<path class="so-glass" d="${k.planOutline(GLASS, DECK_TOP, P, 4)}"/>` +
      L(k.planOutline(GLASS, DECK_TOP, P, 4), { tone: "lo" }) +
      L(rings, { tone: "faint" }) +
      L(tx.minor + ty.minor, { tone: "lo" }) + L(tx.major + ty.major, { tone: "mid" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 1.8, DECK_TOP, P, 14)).join(""), { tone: "lo" }) +
      Dt(screws.map(([x, y]) => at([x, y, DECK_TOP])), { size: 0.45 }),
      [["slab", deck, SHELL_TOP, DECK_TOP - SHELL_TOP]]);

    // rocker power switch and fuse cap on the right face
    const X = BODY.x + BODY.w;
    const bezel = { x: X, y: 42.5, w: 1.6, d: 11, r: 0.8 };
    const lower = { x: X + 1.6, y: 44, w: 1, d: 8, r: 0.4 };
    const upper = { x: X + 1.6, y: 44, w: 2, d: 8, r: 0.4 };
    const FUSE = G.frameOf([X, 30, 20], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("body.switch",
      S(k.slabOf(bezel, 14.5, 11, P, 3, 0.3), { tone: "mid" }) +
      S(k.slabOf(lower, 15.5, 4.5, P, 2), { tone: "mid" }) +
      S(k.slabOf(upper, 20, 4.5, P, 2, 0.3), { tone: "mid" }) +
      S(G.disc(0, 1.6, 2.4, FUSE, P), { tone: "mid" }) +
      L(onX(X + 1.6, [[28.6, 20], [31.4, 20]]), { tone: "lo" }),
      [["slab", bezel, 14.5, 11], ["slab", lower, 15.5, 4.5], ["slab", upper, 20, 4.5], ["disc", FUSE, 0, 1.6, 2.4]]);

    // strain-relief boot where the cord leaves the housing
    const BOOT = G.frameOf([-44, Y, 11], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const boot = [[0, 3.2], [1.6, 3.2], [1.6, 2.6], [7, 1.75]];
    const slope = (1.75 - 2.6) / 5.4;
    put("body.boot",
      S(G.solidOf(boot, BOOT, P), { tone: "mid", inner: L([3.2, 4.6, 6].map((s) => G.arcOf(BOOT, s, 2.6 + slope * (s - 1.6), P, { slope })).join(""), { tone: "faint" }) }),
      [["solid", BOOT, boot]]);
  }

  // ============================ cord and plug
  {
    const plug = { x: -80, y: 69.5, w: 7, d: 6, r: 1 };
    const TAIL = G.frameOf([-73, 72.5, 1.9], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const tail = [[0, 1.9], [0.8, 1.9], [3.2, 1.45]];
    put("power.plug",
      S(k.slabOf(plug, 0.2, 3.4, P, 3, 0.3), { tone: "mid" }) +
      L([-78, -76.6, -75.2].map((x) => k.lineOnTop([x, plug.y], [x, plug.y + plug.d], 3.6, P)).join(""), { tone: "lo" }) +
      S(G.solidOf(tail, TAIL, P), { tone: "mid" }),
      [["slab", plug, 0.2, 3.4], ["solid", TAIL, tail]]);
    cordPieces().forEach((piece, index) => put(`cord:${index}`, tubeSvg(piece, { tone: "mid" }), [], { chunk: index, piece }));
  }

  // ============================ the comparison tray beside the stage, and its two reference carriers
  {
    const X = BODY.x + BODY.w;
    const plate = { x: X, y: -40, w: 2, d: 80, r: 0.5 };
    put("tray.bracket", S(k.slabOf(plate, 28, 11.5, P, 2), { tone: "mid" }), [["slab", plate, 28, 11.5]]);
    for (const y of [-40, 40]) {
      put(`tray.leg${y < 0 ? "Far" : "Near"}`,
        S(k.cylinder(134, y, 4, 0, 1.6, P, 24, 0.3), { tone: "lo" }) +
        S(k.cylinder(134, y, 2.4, 1.6, 35.4, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(134, y, 2.4, 30, P, 12), { tone: "faint" }) }),
        [["cyl", 134, y, 4, 0, 1.6], ["cyl", 134, y, 2.4, 1.6, 35.4]]);
    }
    const bed = { x: X + 2, y: -47, w: 85, d: 94, r: 2 };
    put("tray.bed", S(k.slabOf(bed, 37, 2.5, P, 4, 0.6), { tone: "mid" }), [["slab", bed, 37, 2.5]]);
    const inner = { x: X + 2, y: -47, w: 2, d: 94, r: 0.5 };
    put("tray.stop", S(k.slabOf(inner, 39.5, 3, P, 2, 0.3), { tone: "mid" }) + Dt([at([65, -42, 42.5]), at([65, 0, 42.5]), at([65, 42, 42.5])], { size: 0.45 }), [["slab", inner, 39.5, 3]]);
    // guide rails either side of each lane: the middle one runs between the two carriers
    const rail = (y) => ({ x: X + 4, y, w: 74, d: 2, r: 0.4 });
    const railItem = (name, y, ticks = "") => put(name, S(k.slabOf(rail(y), 39.5, 2, P, 2, 0.3), { tone: "mid" }) + ticks, [["slab", rail(y), 39.5, 2]]);
    const t = k.topTicks(70, 136, 2, 5, 45, 41.5, [0.8, 1.5], P);
    railItem("tray.railFar", -47);
    for (const k2 of ["J", "Q"]) {
      const c = LANES[k2];
      const plan = { x: CARRIER.x, y: c - CARRIER.half, w: CARRIER.w, d: 2 * CARRIER.half, r: 1 };
      const win = { x: CARRIER.x + 3, y: c - 17, w: 34, d: 34, r: 0.6 };
      const z = 40.7;
      const map = ([x, y]) => [CARRIER.x + 20 + 0.42 * (x - 1), c + 0.42 * (y + 3)];
      const marks = [...MARKS.S, ...MARKS[k2]].map((line) => k.onTop(line.map(map), z, P)).join("");
      const tab = { x: CARRIER.x + CARRIER.w, y: c - 4, w: 2.6, d: 8, r: 0.8 };
      put(`ref${k2}`,
        S(k.slabOf(plan, 39.5, 1.2, P, 3, 0.4), { tone: "hi" }) +
        `<path class="so-film so-ref" d="${k.planOutline(win, z, P, 3)}"/>` +
        L(k.planOutline(win, z, P, 3), { tone: "lo" }) +
        L(marks, { tone: "mid", free: true }) +
        Dt([at([plan.x + 1.6, plan.y + 1.6, z]), at([plan.x + 1.6, plan.y + plan.d - 1.6, z])], { size: 0.4 }) +
        S(k.slabOf(tab, 39.5, 1.2, P, 2), { tone: "hi" }) +
        S(k.cylinder(tab.x + 1.3, c, 1.7, z, 2.5, P, 18, 0.3), { tone: "mid" }) +
        L(k.knurl(tab.x + 1.3, c, 1.7, z, z + 2.5, 14, P), { tone: "lo" }),
        [["slab", plan, 39.5, 1.2], ["slab", tab, 39.5, 1.2], ["cyl", tab.x + 1.3, c, 1.7, z, 2.5]], { part: `ref${k2}` });
      if (k2 === "J") railItem("tray.railMid", -1);
    }
    railItem("tray.railNear", 45, L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }));
    // the lamp block closes the tray's far end: one panel lamp at the end of each lane, where no carrier passes over it
    const END = { x: 140, y: -47, w: 9, d: 94, r: 0.8 };
    const ET = 44.5;
    put("tray.end",
      S(k.slabOf(END, 39.5, ET - 39.5, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(END, 41.8, P, 3), { tone: "faint" }) }) +
      Dt([at([144.5, -42.5, ET]), at([144.5, 0, ET]), at([144.5, 42.5, ET])], { size: 0.45 }),
      [["slab", END, 39.5, ET - 39.5]]);
    // each lens is a glass dome set into its bezel, so only its crown shows; only the lens takes the status colour
    const BZ = ET + 1.3;
    for (const k2 of ["J", "Q"]) {
      const y = LANES[k2];
      const lens = [144.5, y, BZ + 0.7];
      put(`tray.lamp${k2}`,
        S(k.cylinder(144.5, y, 3.3, ET, 1.3, P, 24, 0.3), { tone: "mid" }) +
        `<g data-lamp="${k2}">${S(G.sphereOf(lens, 2.2, P, { steps: 24 }), { tone: "mid" })}</g>`,
        [["cyl", 144.5, y, 3.3, ET, 1.3, { owner: `lamp${k2}` }], ["ball", lens, 2.2, { owner: `lamp${k2}` }]]);
    }
  }

  // ============================ stop posts: a raised leaf leans back onto two rubber-capped posts outside the stage
  {
    const RB = 1.6;
    for (const which of ["J", "Q"]) {
      const F = leafFrame(which, UP);
      const shapes = [];
      let svg = "";
      for (const u of [-22, 24]) {
        const c = G.add3(G.add3(F.o, G.mul3(F.a, u)), G.add3(G.mul3(F.b, 18), G.mul3(F.n, LEAF.t / 2 + RB + 0.02)));
        const [cx, cy] = c;
        const owner = `stop${which}${u}`;
        const h = c[2] - DECK_TOP - 1;
        svg += S(k.cylinder(cx, cy, 2.2, DECK_TOP, 1, P, 18, 0.25), { tone: "mid" }) +
          S(k.cylinder(cx, cy, 1.15, DECK_TOP + 1, h, P, 12), { tone: "mid", crease: "none" }) +
          S(G.sphereOf(c, RB, P, { steps: 18 }), { tone: "lo" });
        shapes.push(["cyl", cx, cy, 2.2, DECK_TOP, 1, { owner }], ["cyl", cx, cy, 1.15, DECK_TOP + 1, h, { owner }], ["ball", c, RB, { owner }]);
      }
      put(`stage.stops${which}`, svg, shapes);
    }
  }

  // ============================ the stage: mount frame, base transparency S, pin hinges
  {
    const far = [[-46, -46], [46, -46], [46, -36], [-36, -36], [-36, 36], [-46, 36]];
    const near = [[36, -36], [46, -36], [46, 46], [-46, 46], [-46, 36], [36, 36]];
    put("stage.frameFar", S(k.extrude(far, DECK_TOP, FRAME_TOP - DECK_TOP, P, { convex: false }), { tone: "mid" }), [["ext", far, DECK_TOP, FRAME_TOP - DECK_TOP, { owner: "stage" }]]);
    put("stage.frameNear", S(k.extrude(near, DECK_TOP, FRAME_TOP - DECK_TOP, P, { convex: false }), { tone: "mid" }), [["ext", near, DECK_TOP, FRAME_TOP - DECK_TOP, { owner: "stage" }]]);
    const sheet = { x: -38, y: -38, w: 76, d: 82, r: 0.6 };
    const marks = MARKS.S.map((line) => k.onTop(line, SHEET_TOP, P)).join("");
    put("stage.sheet",
      `<path class="so-film so-sheet" d="${k.planOutline(sheet, SHEET_TOP, P, 3)}"/>` +
      L(k.planOutline(sheet, SHEET_TOP, P, 3), { tone: "mid" }) +
      L([-20, 20].map((x) => k.ring(x, 42, 1.75, SHEET_TOP, P, 16)).join(""), { tone: "lo" }) +
      L(marks, { tone: "hi", free: true }),
      [["slab", sheet, FRAME_TOP, SHEET_TOP - FRAME_TOP, { owner: "stage" }]]);
    // knuckles: fixed ones on the frame (mid), the leaf's own ones (hi); pin heads at both ends
    const spans = [[-33, -19], [-18.5, -4.5], [-4, 10], [10.5, 24.5], [25, 39]];
    for (const which of ["J", "Q"]) {
      const F = which === "J" ? G.frameOf([-42, 0, ZH], [0, 1, 0], [1, 0, 0], [0, 0, 1]) : G.frameOf([0, -42, ZH], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      const [a0, a1] = [spans[0][0], spans[spans.length - 1][1]];
      const steps = { steps: 12 };
      const svg = [S(G.disc(a0 - 0.5, a0, 0.75, F, P, steps), { tone: "mid" })]
        .concat(spans.map(([s0, s1], i) => S(G.disc(s0, s1, KR, F, P, steps), { tone: i % 2 ? "hi" : "mid" })))
        .concat([S(G.disc(a1, a1 + 0.5, 0.75, F, P, steps), { tone: "mid" })]).join("");
      put(`stage.hinge${which}`, svg,
        [["disc", F, a0 - 0.5, a0, 0.75, { owner: "stage" }], ...spans.map(([s0, s1]) => ["disc", F, s0, s1, KR, { owner: "stage" }]), ["disc", F, a1, a1 + 0.5, 0.75, { owner: "stage" }]]);
    }
  }

  // ============================ the two overlay leaves (live code keeps the one that is not standing up on top)
  put("leafJ", leafSvg("J", pose.lj, sel === "J"), (pose) => [["leaf", "J", pose.lj]], { part: "leafJ" });
  put("leafQ", leafSvg("Q", pose.lq, sel === "Q"), (pose) => [["leaf", "Q", pose.lq]], { part: "leafQ" });

  // ============================ registration pegs through S (in front of either leaf)
  put("stage.pegs",
    [-20, 20].map((x) => S(k.cylinder(x, 42, 1.2, FRAME_TOP, 2.6, P, 16, 0.25), { tone: "mid" })).join(""),
    [-20, 20].map((x) => ["cyl", x, 42, 1.2, FRAME_TOP, 2.6, { owner: "stage" }]));

  // ============================ projection head on its arm (moves with focus)
  {
    const arm = { x: SLIDER.x + SLIDER.w, y: -12.5, w: 57, d: 5, r: 1 };
    put("head.arm",
      S(k.slabOf(arm, 137, 5, P, 3, 0.4), { tone: "mid" }) +
      Dt([at([arm.x + 4, -10, 142]), at([arm.x + arm.w - 4, -10, 142])], { size: 0.45 }),
      [["slab", arm, 137, 5]], { part: "head" });
    const box = { x: -13, y: -13, w: 26, d: 26, r: 2.5 };
    put("head.lens",
      S(k.cylinder(0, 0, 6.5, 122, 6, P, 40, 0.3), { tone: "mid", inner: L(k.knurl(0, 0, 6.5, 123, 127, 44, P), { tone: "lo" }) }) +
      S(k.cylinder(0, 0, 8, 128, 8, P, 44, 0.4), { tone: "mid", inner: L(k.sideArc(0, 0, 8, 132, P, 24), { tone: "faint" }) }),
      [["cyl", 0, 0, 6.5, 122, 6], ["cyl", 0, 0, 8, 128, 8]], { part: "head" });
    const vents = [-6, -2, 2, 6].map((y) => onX(13, stadiumV(y, 140.6, 144.6, 0.7).map(([a, b]) => [a, b]), true)).join("");
    put("head.box",
      S(k.slabOf(box, 136, 10, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(box, 139, P, 4), { tone: "faint" }) }) +
      `<path class="so-bore" d="${vents}"/>` + L(vents, { tone: "lo" }) +
      Dt([at([-9.5, 9.5, 146]), at([9.5, -9.5, 146])], { size: 0.45 }),
      [["slab", box, 136, 10]], { part: "head" });
    const XF = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const tri = [[-13, 146], [13, 146], [-13, 172]];
    const n = Math.SQRT1_2 * 1.2;
    const flap = [[13, 146], [13 + n, 146 + n], [-13 + n, 172 + n], [-13, 172]];
    put("head.cheekFar", S(G.prismOf(XF, tri, -13, -11.8, P), { tone: "mid" }), [["prism", XF, tri, -13, -11.8]], { part: "head" });
    put("head.cheekNear",
      S(G.prismOf(XF, tri, 11.8, 13, P), { tone: "mid" }) +
      L([[-9, 150], [-10, 164]].map(([y, z]) => k.sideRing([13, y, z], 1.1, "x", P, 14)).join(""), { tone: "lo" }) +
      Dt([at([13, -9, 150]), at([13, -10, 164])], { size: 0.4 }),
      [["prism", XF, tri, 11.8, 13]], { part: "head" });
    const HF = G.frameOf([0, -13, 173.2], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const tab = { x: -4, y: 13 + n, w: 8, d: 2.2, r: 0.6 };
    const onFlap = (x, t) => [x, flap[1][0] + t * (flap[2][0] - flap[1][0]), flap[1][1] + t * (flap[2][1] - flap[1][1])];
    const panel = k.pathOf([[-11.4, 0.12], [11.4, 0.12], [11.4, 0.88], [-11.4, 0.88]].map(([x, t]) => at(onFlap(x, t))), true);
    put("head.flap",
      S(G.prismOf(XF, flap, -14, 14, P), { tone: "mid", inner: L(panel, { tone: "faint" }) + Dt([[-12.6, 0.06], [12.6, 0.06], [-12.6, 0.94], [12.6, 0.94]].map(([x, t]) => at(onFlap(x, t))), { size: 0.45 }) }) +
      S(G.disc(-12, 12, 1.3, HF, P), { tone: "mid" }) +
      S(k.slabOf(tab, 146 + n - 1.2, 1.2, P, 2), { tone: "mid" }),
      [["prism", XF, flap, -14, 14], ["disc", HF, -12, 12, 1.3], ["slab", tab, 146 + n - 1.2, 1.2]], { part: "head" });
  }

  return items;
}
