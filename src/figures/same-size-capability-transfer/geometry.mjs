// Fig 8 geometry: every part of the key duplicating machine as a drawn item with its true shape.
// The order of put() is the starting painter's order; build.mjs settles the keys from measured depth and writes order.mjs.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { STATIONS, FEATURE, STRICT, target, master, BLADE } from "./model.mjs";
import {
  P, at, BENCH, BENCH_H, FOOT_H, STY_X, CUT_X, KEY_Z, KEY_T, KEY_MID, EDGE_Y, BLADE_W, MASTER_SH, BLANK_SH, WHEEL, SHAFT, SLEEVE_R, SLEEVES, PILLOWS, GUIDE, GUIDE_TOP, WAY_TOP,
  BODY, BODY_Z, BODY_TOP, JAW, CLAMP, BAR, BAR_Z, BAR_TOP, RAIL, RAIL_TOP, PIN, BOLT, SPRING, STOP, STOP_TOP, HANDLE, PAWL, LEVER, LEVER_Z, HOUSE, HOUSE_TOP, HEAD, HEAD_TOP, BEARING,
  DIAL, DIAL_BASE, DIAL_TOP, DIAL_SPAN, STYLUS, ADJ, ADJ_TOP, HOLDER_TOP, FW, BRUSH, KEYWAY, BOW, bowCentre,
  liveSolid, pinSolid, LEVELS, bucketsOf, WHEEL_PROFILE, WHEEL_FACE, keyPaths, keyRing, BOW_HOLE, pinPaths, pinX, leverPaths, leverRing, leverTip, coilOf, needleAt, needleRing, stopPointer, adjusterPointer, wheelTeeth, brushSpokes,
} from "./view.mjs";

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 20, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const poly = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map(at), true)}"/>`;
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const bucketsSvg = (list, tone, attr) => bucketsOf(list).map((d, i) => `<g opacity="${LEVELS[i]}"><path class="iso-line" data-tone="${tone}" ${attr}="${i}" d="${d}"/></g>`).join("");

// shape descriptors (build.mjs turns them into audit shapes)
const sSlab = (plan, z, h, meta) => ["slab", plan, z, h, meta];
const sCyl = (x, y, r, z, h, meta) => ["cyl", x, y, r, z, h, meta];
const sDisc = (F, s0, s1, r, meta) => ["disc", F, s0, s1, r, meta];
const sRing = (F, s0, s1, rIn, rOut, meta) => ["ring", F, s0, s1, rIn, rOut, meta];
const sSolid = (F, profile, meta) => ["solid", F, profile, meta];
const sPrism = (F, polygon, s0, s1, meta) => ["prism", F, polygon, s0, s1, meta];
const sRingZ = (ring, z, h, meta) => ["extruded", ring, z, h, meta];
const sBall = (c, r, meta) => ["ball", c, r, meta];
const sSlide = (F, from, to, r, meta) => ["slide", F, from, to, r, meta];

export const FX = G.frameOf([0, SHAFT.y, SHAFT.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
export const FS = G.frameOf([STY_X, STYLUS.face, KEY_MID], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
const FB = G.frameOf([HEAD.x + HEAD.w, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]); // the belt cover's frame: (u, v) = (y, z)
const circle = (cy, cz, r, n = 28) => Array.from({ length: n }, (_, i) => [cy + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)]);
const MOTOR = [HOUSE.y + 22, 27]; // motor pulley inside the housing, in (y, z)
const SPIN = [WHEEL.o[1], WHEEL.o[2]];
const BELT = G.hullOf([...circle(MOTOR[0], MOTOR[1], 10), ...circle(SPIN[0], SPIN[1], 9.4)]);
const GUARD_R = WHEEL.r + 3.4;
const GUARD_A = [40, 158];
const GUARD = Array.from({ length: 15 }, (_, i) => {
  const a = ((GUARD_A[0] + ((GUARD_A[1] - GUARD_A[0]) * i) / 14) * Math.PI) / 180;
  return [GUARD_R * Math.cos(a), GUARD_R * Math.sin(a)];
});

// the static copy the page opens on: a finished sparse pass
export const OPENING = { mode: "sparse", pruned: false };
export const jawPlan = (sh) => ({ x: sh - 2, y: JAW.y, w: 44, d: JAW.d, r: 1 });
export const BLANK_JAW = jawPlan(BLANK_SH);

// the part of a plan ring on one side of the line x = at (side -1: x <= at, side 1: x >= at)
export function halfRing(ring, at, side) {
  const inside = ([x]) => (x - at) * side >= -1e-9;
  const out = [];
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) {
      const t = (at - p[0]) / (q[0] - p[0]);
      out.push([at, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}

export function build() {
  const items = [];
  const put = (name, svg, shapes, part = "") => items.push({ name, svg, shapes, part });
  const clips = [];

  // ============================ bench on four feet (the far one is hidden)
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(BENCH, 10)).slice(1)) {
      // a rubber foot with a chamfered pad; its top meets the bench's underside, so no top face is drawn
      feet.push(S(cyl(x, y, 6.6, -BENCH_H - FOOT_H, FOOT_H, 12, 1), { tone: "lo", crease: "faint" }).replace(/<path class="iso-top"[^>]*\/>/, ""));
      shapes.push(sCyl(x, y, 6.6, -BENCH_H - FOOT_H, FOOT_H));
    }
    put("stand.feet", halo + feet.join(""), shapes);
    const screws = k.corners(BENCH, 10);
    put(
      "stand.bench",
      S(slab(BENCH, -BENCH_H, BENCH_H, 6, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4.2, P, 6), { tone: "faint" }) }) +
        L(k.planOutline(k.insetPlan(BENCH, 5), 0, P, 6), { tone: "lo" }) +
        L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 14)).join(""), { tone: "lo" }) +
        D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
      [sSlab(BENCH, -BENCH_H, BENCH_H)],
    );
  }
  // label plate on the bench's front face: the maker's mark and three rule lines
  {
    const y = BENCH.y + BENCH.d;
    const plate = { x: -30, y, w: 52, d: 0.8, r: 0.3 };
    const z0 = -9.8;
    const h = 7.6;
    const face = y + 0.8;
    const fp = (x, z) => at([x, face, z]);
    const rules = [28, 22, 15].map((w, i) => k.pathOf([fp(plate.x + 17, z0 + h - 2 - i * 1.8), fp(plate.x + 17 + w, z0 + h - 2 - i * 1.8)])).join("");
    const inset = k.pathOf([fp(plate.x + 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + h - 1.2), fp(plate.x + 1.2, z0 + h - 1.2)], true);
    const divider = k.pathOf([fp(plate.x + 14.6, z0 + 1.2), fp(plate.x + 14.6, z0 + h - 1.2)]);
    const mark = k.faceTextSvg(k.sideMatrix([plate.x + 7.8, face], z0 + h / 2 - 1.1, P, "left"), "AU-8", { size: 2.9, tone: "mid", anchor: "middle" });
    put("label", S(slab(plate, z0, h, 2), { tone: "lo", crease: "none" }) + L(inset + divider, { tone: "faint" }) + mark + L(rules, { tone: "lo", free: true }) + D([fp(plate.x + plate.w - 3.2, z0 + h / 2)], { size: 0.45 }), [sSlab(plate, z0, h)]);
  }
  // ruler strip along the front edge
  {
    const strip = { x: -146, y: 74, w: 64, d: 6.5, r: 1 };
    const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.6, [2, 3.6], P);
    put("ruler", S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])], { size: 0.45 }), [sSlab(strip, 0, 0.6)]);
  }
  // chip tray under the cutter: rim, the far inner walls, the floor and a scatter of chips
  {
    const tray = { x: 28, y: -54, w: 42, d: 42, r: 2 };
    const H = 3.2;
    const inner = k.insetPlan(tray, 1.6);
    const floor = 1;
    const ring = k.ringOf(inner, 3);
    const wallY = [[inner.x + inner.w, inner.y], [inner.x, inner.y]];
    const wallX = [[inner.x, inner.y], [inner.x, inner.y + inner.d]];
    const quad = ([a, b], cls) => poly([[a[0], a[1], H], [b[0], b[1], H], [b[0], b[1], floor], [a[0], a[1], floor]], cls);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const chips = Array.from({ length: 16 }, () => at([inner.x + 5 + rand() * (inner.w - 8), inner.y + 6 + rand() * (inner.d - 8), floor]));
    put(
      "tray",
      S(slab(tray, 0, H, 3, 0.4), { tone: "mid" }) +
        poly(ring.map(([x, y]) => [x, y, H]), "sc-floor") +
        quad(wallY, "sc-wall2") + quad(wallX, "sc-wall1") +
        L(k.pathOf(ring.map(([x, y]) => at([x, y, H])), true), { tone: "lo" }) +
        L(k.pathOf([at([inner.x + inner.w, inner.y, H]), at([inner.x + inner.w, inner.y, floor]), at([inner.x, inner.y, floor]), at([inner.x, inner.y + inner.d, floor]), at([inner.x, inner.y + inner.d, H])]), { tone: "faint" }) +
        D(chips, { size: 0.32, tone: "lo" }),
      [sSlab(tray, 0, H)],
    );
  }

  // ============================ motor housing with its vents, mains rocker and lamps
  {
    const flange = { x: HOUSE.x - 3, y: HOUSE.y - 3, w: HOUSE.w + 3, d: HOUSE.d + 3, r: 7 };
    const face = HOUSE.y + HOUSE.d;
    const fp = (x, z) => at([x, face, z]);
    const slotV = (x, z0, z1) => {
      const pts = [];
      for (let j = 0; j <= 3; j++) pts.push(fp(x + 0.8 * Math.cos(Math.PI + (j / 3) * Math.PI), z1 - 0.8 - 0.8 * Math.sin(Math.PI + (j / 3) * Math.PI)));
      for (let j = 0; j <= 3; j++) pts.push(fp(x + 0.8 * Math.cos((j / 3) * Math.PI), z0 + 0.8 - 0.8 * Math.sin((j / 3) * Math.PI)));
      return k.pathOf(pts, true);
    };
    const vents = Array.from({ length: 9 }, (_, i) => slotV(HOUSE.x + 10 + i * 4.4, 12, 32)).join("");
    const cover = k.insetPlan(HOUSE, 3.2);
    const lid = k.corners(cover, 3).map(([x, y]) => at([x, y, HOUSE_TOP]));
    const slot = (x0, y0, len) => k.planOutline({ x: x0, y: y0, w: 1.8, d: len, r: 0.9 }, HOUSE_TOP, P, 2);
    const topVents = [...Array.from({ length: 9 }, (_, i) => slot(HOUSE.x + 10 + i * 4.4 - 0.9, HOUSE.y + 7, HOUSE.d - 14)), ...Array.from({ length: 9 }, (_, i) => slot(HOUSE.x + 174 + i * 4.4 - 0.9, HOUSE.y + 7, HOUSE.d - 14))].join("");
    put("stand.flange", S(slab(flange, 0, 3.4, 6, 0.4), { tone: "lo" }) + D(k.corners(flange, 3).slice(1).map(([x, y]) => at([x, y, 3.4])), { size: 0.45 }), [sSlab(flange, 0, 3.4)]);
    put(
      "housing",
      S(slab(HOUSE, 3.4, HOUSE_TOP - 3.4, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(HOUSE, HOUSE_TOP - 4.4, P, 6), { tone: "faint" }) + L(vents, { tone: "lo" }) + L(k.planOutline(cover, HOUSE_TOP, P, 6), { tone: "faint" }) + L(topVents, { tone: "lo" }) }) + D(lid, { size: 0.5 }),
      [sSlab(HOUSE, 3.4, HOUSE_TOP - 3.4)],
    );
    // the mains rocker in its bezel, then the two status lamps
    const bezel = { x: HOUSE.x + 62, y: face, w: 9, d: 0.8, r: 0.4 };
    const rocker = { x: HOUSE.x + 63.5, y: face + 0.8, w: 6, d: 1.4, r: 0 };
    put(
      "rocker",
      S(slab(bezel, 17, 13, 1), { tone: "mid", crease: "none" }) + S(slab(rocker, 18.5, 10, 1), { tone: "mid" }) + L(k.pathOf([[rocker.x, rocker.y + rocker.d, 23.5], [rocker.x + rocker.w, rocker.y + rocker.d, 23.5], [rocker.x + rocker.w, rocker.y, 23.5]].map(at)), { tone: "lo" }),
      [sSlab(bezel, 17, 13), sSlab(rocker, 18.5, 10)],
    );
    for (const [i, colour] of ["red", "green"].entries()) {
      const F = G.frameOf([bezel.x + 17 + i * 7.5, face, 23.5], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      put(
        `lamp.${colour}`,
        S(G.disc(0, 0.8, 2.6, F, P, { steps: 12 }), { tone: "mid", crease: "none" }) + `<g data-lamp="${colour}"${colour === "green" ? ' data-on="green"' : ""}>${S(G.disc(0.8, 2, 1.7, F, P, { steps: 10 }), { tone: "mid", crease: "none" })}</g>`,
        [sDisc(F, 0, 0.8, 2.6), sDisc(F, 0.8, 2, 1.7)],
      );
    }
  }
  // dial gauge on its pillar at the front right: strict success, one turn = 0.25; tell-tales at the base and donor scores
  {
    const [x, y] = DIAL.at;
    const ticks = k.radialTicks(x, y, DIAL.r - 2.4, 50, 10, DIAL_TOP, [1.1, 2.2], P, -Math.PI / 4);
    const zero = k.lineOnTop([x - Math.SQRT1_2 * (DIAL.r - 4.6), y - Math.SQRT1_2 * (DIAL.r - 4.6)], [x - Math.SQRT1_2 * (DIAL.r - 2.4), y - Math.SQRT1_2 * (DIAL.r - 2.4)], DIAL_TOP, P);
    const tell = (value) => {
      const a = -Math.PI / 4 + (value / DIAL_SPAN) * Math.PI * 2;
      const pt = (r, da) => [x + Math.sin(a + da) * r, y - Math.cos(a + da) * r, DIAL_TOP];
      return [pt(DIAL.r - 2.2, 0), pt(DIAL.r - 0.6, 0.075), pt(DIAL.r - 0.6, -0.075)];
    };
    const tri = (value, tone) => poly(tell(value), "sc-tell") + L(k.pathOf(tell(value).map(at), true), { tone });
    const FC = G.frameOf([x + DIAL.r, y, DIAL.z + 4], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const screws = k.corners(DIAL_BASE, 2.4).slice(1);
    put(
      "stand.dial",
      S(slab(DIAL_BASE, 0, 3, 3, 0.4), { tone: "mid" }) + D(screws.map(([sx, sy]) => at([sx, sy, 3])), { size: 0.45 }) +
        S(cyl(x, y, 3.2, 3, DIAL.z - 3, 12), { tone: "mid", inner: L(k.sideArc(x, y, 3.2, 14, P, 12), { tone: "faint" }) }),
      [sSlab(DIAL_BASE, 0, 3), sCyl(x, y, 3.2, 3, DIAL.z - 3)],
    );
    put(
      "dial.case",
      S(k.cylinder(x, y, DIAL.r, DIAL.z, DIAL.h, P, 28, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideArc(x, y, DIAL.r, DIAL_TOP - 2.6, P, 28), { tone: "faint" }) }) +
        L(k.knurl(x, y, DIAL.r, DIAL_TOP - 2.6, DIAL_TOP, 26, P, 0.3), { tone: "lo" }) +
        L(k.ring(x, y, DIAL.r - 1.8, DIAL_TOP, P, 28), { tone: "lo" }) +
        L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + L(zero, { tone: "hi" }) +
        tri(STRICT.base, "lo") + tri(STRICT.donor, "hi") +
        L(k.ring(x, y, 1.3, DIAL_TOP, P, 14), { tone: "mid" }),
      [sCyl(x, y, DIAL.r, DIAL.z, DIAL.h)],
    );
    put(
      "dial.crown",
      S(G.disc(0, 1.6, 1.1, FC, P, { steps: 12 }), { tone: "mid" }) + S(G.disc(1.6, 4, 2.1, FC, P, { steps: 16 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(FC, 1.6, 4, 2.1, 14, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }),
      [sDisc(FC, 0, 1.6, 1.1), sDisc(FC, 1.6, 4, 2.1)],
    );
    put("needle", `<path data-needle class="iso-line" data-tone="hi" data-free="start" style="stroke-width:1.1" d="${needleAt(STRICT.sparse3)}"/>` + D([at([x, y, DIAL_TOP + 0.2])], { size: 0.7, tone: "hi" }), [sRingZ(needleRing(STRICT.sparse3), DIAL_TOP, 0.2)]);
  }

  // ============================ spindle head: a casting on the bench against the housing, carrying the spindle bearing and the belt cover
  {
    const base = { x: HEAD.x - 3, y: HEAD.y, w: HEAD.w + 3, d: HEAD.d + 3, r: 2 };
    const screws = [[base.x + 1.6, base.y + base.d - 1.6], [base.x + base.w - 1.6, base.y + base.d - 1.6], [base.x + 1.6, base.y + 12]];
    put(
      "stand.head",
      S(slab(base, 0, 3, 3, 0.4), { tone: "mid" }) + D(screws.map(([x, y]) => at([x, y, 3])), { size: 0.45 }) +
        S(slab(HEAD, 3, HEAD_TOP - 3, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(HEAD, 18, P, 3), { tone: "faint" }) }),
      [sSlab(base, 0, 3), sSlab(HEAD, 3, HEAD_TOP - 3)],
    );
    const FBR = G.frameOf([BEARING.x0, SPIN[0], SPIN[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const len = BEARING.x1 - BEARING.x0;
    put(
      "bearing",
      S(G.disc(0, len, BEARING.r, FBR, P, { steps: 16 }), { tone: "mid", inner: L(G.arcOf(FBR, 3, BEARING.r, P) + G.arcOf(FBR, len - 3, BEARING.r, P), { tone: "faint" }) }) +
        S(cyl(BEARING.x0 + 13, SPIN[0], 1.1, SPIN[1] + BEARING.r - 0.2, 2.4, 8), { tone: "mid" }) + S(cyl(BEARING.x0 + 13, SPIN[0], 0.6, SPIN[1] + BEARING.r + 2.2, 1, 6), { tone: "mid" }),
      [sDisc(FBR, 0, len, BEARING.r, { owner: "spindle" }), sCyl(BEARING.x0 + 13, SPIN[0], 1.1, SPIN[1] + BEARING.r - 0.2, 2.4), sCyl(BEARING.x0 + 13, SPIN[0], 0.6, SPIN[1] + BEARING.r + 2.2, 1)],
    );
  }
  // belt cover on the head's end face: inset flange line with screws, a boss over each pulley, a vent grille and a latch
  {
    const T = 5;
    const fx = HEAD.x + HEAD.w + T;
    const face = (pts) => k.pathOf(pts.map(([u, v]) => at([fx, u, v])), true);
    const inset = G.hullOf([...circle(MOTOR[0], MOTOR[1], 7.6), ...circle(SPIN[0], SPIN[1], 7)]);
    const dir = [SPIN[0] - MOTOR[0], SPIN[1] - MOTOR[1]];
    const len = Math.hypot(...dir);
    const [ux, uy] = [dir[0] / len, dir[1] / len];
    const along = (t, off) => [MOTOR[0] + ux * t - uy * off, MOTOR[1] + uy * t + ux * off];
    const screwAt = [along(-8.8, 0), along(len + 8.2, 0), along(len * 0.32, 8.8), along(len * 0.68, 8.6), along(len * 0.32, -8.8), along(len * 0.68, -8.4)];
    const grille = Array.from({ length: 5 }, (_, i) => {
      const t = len * 0.3 + i * 3.2;
      const pts = [];
      for (let j = 0; j <= 6; j++) {
        const a = Math.PI + (j / 6) * Math.PI;
        pts.push(along(t + 0.8 * Math.cos(a), -4.4 + 0.8 * Math.sin(a)));
      }
      for (let j = 0; j <= 6; j++) {
        const a = (j / 6) * Math.PI;
        pts.push(along(t + 0.8 * Math.cos(a), 4.4 + 0.8 * Math.sin(a)));
      }
      return face(pts);
    }).join("");
    put(
      "belt",
      S(G.prismOf(FB, BELT, 0, T, P), { tone: "mid", inner: L(face(inset), { tone: "faint" }) + L(grille, { tone: "lo" }) }) + D(screwAt.map(([u, v]) => at([fx, u, v])), { size: 0.45 }),
      [sPrism(FB, BELT, 0, T)],
    );
    const bosses = [[MOTOR, 5.2], [SPIN, 4.6]];
    const shapes = [];
    let svg = "";
    for (const [[u, v], r] of bosses) {
      const F = G.frameOf([fx, u, v], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      svg += S(G.disc(0, 1.6, r, F, P, { steps: 14 }), { tone: "mid" }) + L(G.circleOf(F, 1.6, r - 1.6, P), { tone: "faint" }) + D([at([fx + 1.6, u, v])], { size: 0.5 });
      shapes.push(sDisc(F, 0, 1.6, r));
    }
    // latch: a hasp on the cover's lower front edge, pinned by one screw
    const hasp = along(len * 0.5, -9.6);
    const FL = G.frameOf([fx, hasp[0], hasp[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const leaf = [[-1.6, -2.2], [1.6, -2.2], [1.6, 2.6], [-1.6, 2.6]];
    svg += S(G.prismOf(FL, leaf, 0, 0.8, P), { tone: "mid" }) + D([at([fx + 0.8, hasp[0], hasp[1] + 1])], { size: 0.4 });
    shapes.push(sPrism(FL, leaf, 0, 0.8));
    put("belt.parts", svg, shapes);
  }

  // ============================ cutter wheel, its flange and nut, the guard, the chip brush and the spindle
  const sp = (s0, s1, r = 2.4) => [S(G.disc(s0, s1, r, FW, P, { steps: 14 }), { tone: "mid", crease: "none" }), [sDisc(FW, s0, s1, r, { owner: "spindle" })]];
  const spindle = (name, s0, s1) => put(name, ...sp(s0, s1));
  put(
    "wheel",
    S(G.solidOf(WHEEL_PROFILE, FW, P, { steps: 26 }), { tone: "mid", crease: "lo", inner: L(G.circleOf(FW, WHEEL.t, WHEEL_FACE - 2.2, P), { tone: "faint" }) }) +
      bucketsSvg(wheelTeeth(0), "lo", "data-teeth"),
    [sSolid(FW, WHEEL_PROFILE, { owner: "spindle" })],
  );
  put("wheel.flange1", S(G.disc(WHEEL.t, 2.6, 6.4, FW, P, { steps: 20 }), { tone: "mid" }) + D(G.dotsOf(FW, 2.6, 4.6, 6, P, { all: true }), { size: 0.4 }), [sDisc(FW, WHEEL.t, 2.6, 6.4, { owner: "spindle" })]);
  const HEX = Array.from({ length: 6 }, (_, i) => [4 * Math.cos((i * Math.PI) / 3 + 0.2), 4 * Math.sin((i * Math.PI) / 3 + 0.2)]);
  put("wheel.nut", S(G.prismOf(FW, HEX, 2.6, 4.2, P), { tone: "mid" }) + L(G.circleOf(FW, 4.2, 2.4, P), { tone: "lo" }), [sPrism(FW, HEX, 2.6, 4.2, { owner: "spindle" })]);
  {
    // the guard hoods the top of the wheel; its strap runs back onto the housing's top
    const end = G.pointOf(FW, 0, GUARD_R, (GUARD_A[1] * Math.PI) / 180);
    const strap = { x: CUT_X - 2.8, y: HOUSE.y + HOUSE.d - 6, w: 5.6, d: end[1] - (HOUSE.y + HOUSE.d - 6) + 0.3, r: 0.6 };
    put("guard.strap", S(slab(strap, HOUSE_TOP, end[2] - HOUSE_TOP + 1.4, 2, 0.3), { tone: "mid" }) + D([at([CUT_X, strap.y + 2.4, end[2] + 1.4])], { size: 0.45 }), [sSlab(strap, HOUSE_TOP, end[2] - HOUSE_TOP + 1.4)]);
    put("guard", S(G.prismOf(FW, GUARD, -4.4, 4.4, P), { tone: "mid", crease: "lo" }) + D([0.25, 0.6].map((t) => at(G.pointOf(FW, 4.4, GUARD_R - 2.4, ((GUARD_A[0] + (GUARD_A[1] - GUARD_A[0]) * t) * Math.PI) / 180))), { size: 0.45 }), [sPrism(FW, GUARD, -4.4, 4.4, { owner: "spindle" })]);
  }
  spindle("spindle.b", 4.2, BRUSH.s0);
  put(
    "brush",
    S(G.disc(BRUSH.s0, BRUSH.s0 + 0.8, BRUSH.hub + 0.4, FW, P, { steps: 10 }), { tone: "mid" }) +
      S(G.disc(BRUSH.s0 + 0.8, BRUSH.s1, BRUSH.r, FW, P, { steps: 16 }), { tone: "lo", crease: "faint", inner: k.fadedSvg(G.ribsOf(FW, BRUSH.s0 + 0.8, BRUSH.s1, BRUSH.r, 12, P, { fade: [0.05, 0.6] }), { tone: "faint" }) }) +
      `<path data-spokes class="iso-line" data-tone="faint" d="${brushSpokes(0)}"/>` +
      S(G.disc(BRUSH.s1, BRUSH.s1 + 0.8, BRUSH.hub + 0.4, FW, P, { steps: 10 }), { tone: "mid" }),
    [sDisc(FW, BRUSH.s0, BRUSH.s1 + 0.8, BRUSH.r, { owner: "spindle" })],
  );
  spindle("spindle.c", BRUSH.s1 + 0.8, BEARING.x0 - CUT_X);

  // ============================ tracer stylus: column, holder, fine-depth knob, lock screw, the stylus itself
  {
    const foot = { x: STY_X - 10, y: -47, w: 20, d: 20, r: 2 };
    const column = { x: STY_X - 7, y: -44, w: 14, d: 14, r: 1.6 };
    const holder = { x: STY_X - 6.5, y: -36, w: 13, d: 22, r: 1.2 };
    const hz = 27;
    const htop = HOLDER_TOP;
    put(
      "stand.stylus",
      S(slab(foot, 0, 3, 3, 0.4), { tone: "mid" }) + D(k.corners(foot, 2.4).slice(1).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) +
        S(slab(column, 3, hz - 3, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(column, 12, P, 3), { tone: "faint" }) }),
      [sSlab(foot, 0, 3), sSlab(column, 3, hz - 3)],
    );
    put("holder", S(slab(holder, hz, htop - hz, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(holder, 31, P, 3), { tone: "faint" }) }), [sSlab(holder, hz, htop - hz)]);
    const [kx, ky] = ADJ.at;
    const ticks = k.radialTicks(kx, ky, 4.2, 16, 4, htop + 1.4, [1, 1], P);
    put(
      "adjuster",
      S(cyl(kx, ky, 4.2, htop, 1.4, 16), { tone: "mid" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) +
        S(cyl(kx, ky, 3.1, htop + 1.4, 4.4, 14), { tone: "mid" }) + L(k.knurl(kx, ky, 3.1, htop + 1.4, htop + 5.8, 16, P), { tone: "lo" }) +
        `<path data-adjust class="iso-line" data-tone="hi" d="${adjusterPointer(0, ADJ_TOP)}"/>` + D([at([kx, ky, ADJ_TOP])], { size: 0.45, tone: "hi" }),
      [sCyl(kx, ky, 4.2, htop, 1.4), sCyl(kx, ky, 3.1, htop + 1.4, 4.4)],
    );
    const FL = G.frameOf([holder.x + holder.w, -25, KEY_MID + 1.2], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put(
      "lockscrew",
      S(G.disc(0, 1.2, 1.1, FL, P, { steps: 12 }), { tone: "mid" }) + S(G.disc(1.2, 3.4, 2, FL, P, { steps: 12 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(FL, 1.2, 3.4, 2, 10, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }),
      [sDisc(FL, 0, 1.2, 1.1), sDisc(FL, 1.2, 3.4, 2)],
    );
    // the stylus slides in its holder; the clip at the holder face stays put while it moves (data-hold)
    const rod = G.rodOut(FS, 0, STYLUS.body, STYLUS.r, P, { stroke: STYLUS.stroke + STYLUS.back });
    clips.push(`<clipPath id="scx-stylus"><path data-hold="-stylus" d="${rod.clip}"/></clipPath>`);
    put(
      "stylus",
      `<g clip-path="url(#scx-stylus)">${S(rod.paths, { tone: "mid", crease: "none" })}${S(G.solidOf([[STYLUS.body, STYLUS.r], [STYLUS.tip - 0.2, 0.3]], FS, P), { tone: "mid" })}</g>`,
      [sSlide(FS, 0, STYLUS.body, STYLUS.r, { name: "stylus" }), sSolid(FS, [[STYLUS.body, STYLUS.r], [STYLUS.tip - 0.2, 0.3]])],
      "stylus",
    );
  }

  // ============================ carriage shaft on two pillow blocks, and the rear way the saddle's shoes ride on
  const pillow = (x0) => ({ x: x0, y: SHAFT.y - 7, w: 12, d: 14, r: 1.5 });
  const pillowSvg = (plan) => S(slab(plan, 0, 17, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, SHAFT.z, P, 3), { tone: "faint" }) }) + D([at([plan.x + 6, plan.y + 2.4, 17]), at([plan.x + 6, plan.y + plan.d - 2.4, 17])], { size: 0.5 });
  const PL = pillow(PILLOWS[0]);
  const PR = pillow(PILLOWS[1]);
  put("stand.pillowL", pillowSvg(PL), [sSlab(PL, 0, 17, { owner: "shaft" })]);
  const shaft = (s0, s1) => S(G.disc(s0, s1, SHAFT.r, FX, P, { steps: 14 }), { tone: "mid", crease: "none" });
  const pad = 0.4 / G.scaleOf(P);
  const ringAt = (s) => Array.from({ length: 40 }, (_, i) => at(G.pointOf(FX, s, SHAFT.r + pad, (i / 40) * 2 * Math.PI)));
  const hullPath = (s0, s1) => k.pathOf(G.hullOf([...ringAt(s0), ...ringAt(s1)]), true);
  // the back run ends at the left sleeve's hidden face; its clip rides with the saddle (data-hold)
  clips.push(`<clipPath id="scx-back"><path data-hold="saddle" d="${hullPath(PL.x - 60, SLEEVES[0] - 7)}"/></clipPath>`);
  put("shaft.back", `<g clip-path="url(#scx-back)">${shaft(PL.x + PL.w, SLEEVES[0] - 7 + 56)}</g>`, [sDisc(FX, PL.x + PL.w, SLEEVES[0] - 7, SHAFT.r, { owner: "shaft" })]);
  const FXs = (gx) => G.frameOf([gx, SHAFT.y, SHAFT.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const sleeve = (gx) => S(G.disc(-7, 7, SLEEVE_R, FXs(gx), P, { steps: 14 }), { tone: "mid", inner: L(G.arcOf(FX, gx - 4.6, SLEEVE_R, P) + G.arcOf(FX, gx + 4.6, SLEEVE_R, P), { tone: "faint" }) });
  put("sleeveL", sleeve(SLEEVES[0]), [sRing(FXs(SLEEVES[0]), -7, 7, SHAFT.r, SLEEVE_R)], "saddle");
  put("shaft.mid", shaft(SLEEVES[0] + 7, SLEEVES[1] - 7), [sDisc(FX, SLEEVES[0] + 7, SLEEVES[1] - 7, SHAFT.r, { owner: "shaft" })], "saddle");
  put("sleeveR", sleeve(SLEEVES[1]), [sRing(FXs(SLEEVES[1]), -7, 7, SHAFT.r, SLEEVE_R)], "saddle");
  clips.push(`<clipPath id="scx-front"><path data-hold="saddle" d="${hullPath(SLEEVES[1] + 7, PR.x + 60)}"/></clipPath>`);
  put("shaft.front", `<g clip-path="url(#scx-front)">${shaft(SLEEVES[1] + 7, PR.x)}</g>`, [sDisc(FX, SLEEVES[1] + 7, PR.x, SHAFT.r, { owner: "shaft" })]);
  put("stand.pillowR", pillowSvg(PR), [sSlab(PR, 0, 17, { owner: "shaft" })]);
  const REAR = { x: SLEEVES[0] - 14, y: GUIDE.y + 0.6, w: SLEEVES[1] - SLEEVES[0] + 70, d: 7, r: 1 };
  const REAR_TOP = 10;
  put(
    "stand.rear",
    S(slab(REAR, 0, REAR_TOP, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(REAR, 3, P, 3), { tone: "faint" }) }) + D([at([REAR.x + 2.6, REAR.y + 3.5, REAR_TOP]), at([REAR.x + REAR.w - 2.6, REAR.y + 3.5, REAR_TOP])], { size: 0.45 }),
    [sSlab(REAR, 0, REAR_TOP)],
  );

  // ============================ saddle: guide blocks on the sleeves and shoes, dovetail ways with gibs, the index bar
  const sleeveTop = SHAFT.z + SLEEVE_R;
  const DOVE = [[-4, 0], [4, 0], [5, WAY_TOP - GUIDE_TOP], [-5, WAY_TOP - GUIDE_TOP]];
  for (const [i, gx] of SLEEVES.entries()) {
    const block = { x: gx - 8, y: GUIDE.y, w: 16, d: GUIDE.d, r: 1.5 };
    const shoe = { x: gx - 6, y: REAR.y, w: 12, d: REAR.d, r: 0.8 };
    put(`shoe${i}`, S(slab(shoe, REAR_TOP, sleeveTop - REAR_TOP, 2, 0.4), { tone: "mid" }), [sSlab(shoe, REAR_TOP, sleeveTop - REAR_TOP)], "saddle");
    put(`guide${i}`, S(slab(block, sleeveTop, GUIDE_TOP - sleeveTop, 3, 0.5), { tone: "mid" }), [sSlab(block, sleeveTop, GUIDE_TOP - sleeveTop)], "saddle");
    const FD = G.frameOf([gx, GUIDE.y + 1, GUIDE_TOP], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const len = GUIDE.d - 1.6; // the way runs from the block's back end to just short of the index bar
    const gib = { x: gx + 5, y: GUIDE.y + 1, w: 1.4, d: len, r: 0.3 };
    put(
      `way${i}`,
      S(G.prismOf(FD, DOVE, 0, len, P), { tone: "mid" }) + S(slab(gib, GUIDE_TOP, WAY_TOP - GUIDE_TOP, 1), { tone: "mid", crease: "none" }) +
        D([0.15, 0.5, 0.85].map((t) => at([gx + 5.7, GUIDE.y + 1 + t * len, WAY_TOP])), { size: 0.4 }),
      [sPrism(FD, DOVE, 0, len), sSlab(gib, GUIDE_TOP, WAY_TOP - GUIDE_TOP)],
      "saddle",
    );
  }
  put(
    "bar",
    S(slab(BAR, BAR_Z, BAR_TOP - BAR_Z, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(BAR, 17, P, 3), { tone: "faint" }) }) +
      D(SLEEVES.flatMap((gx) => [at([gx - 4.5, BAR.y + BAR.d / 2, BAR_TOP]), at([gx + 4.5, BAR.y + BAR.d / 2, BAR_TOP])]), { size: 0.45 }),
    [sSlab(BAR, BAR_Z, BAR_TOP - BAR_Z)],
    "saddle",
  );
  // the 256-station rail: ticks every 8 stations, a major every 32, a bore under every pin
  {
    const inlay = { x: BLANK_SH - 0.6, y: RAIL.y + RAIL.d - 1.7, w: BLADE + 1.2, d: 1.4, r: 0.3 };
    const ticks = k.topTicks(BLANK_SH, BLANK_SH + BLADE, BLADE / 32, 4, inlay.y + 0.05, RAIL_TOP + 0.2, [0.8, 1.5], P);
    const bores = `<path class="sc-bore sc-rim" d="${STATIONS.map((_, i) => k.pathOf(Array.from({ length: 12 }, (_, j) => at([pinX(i) + PIN.bore * Math.cos((j / 12) * 2 * Math.PI), PIN.y + PIN.bore * Math.sin((j / 12) * 2 * Math.PI), RAIL_TOP])), true)).join("")}"/>`;
    put(
      "rail",
      S(slab(RAIL, BAR_TOP, RAIL_TOP - BAR_TOP, 2, 0.3), { tone: "mid" }) + S(slab(inlay, RAIL_TOP, 0.2, 2), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) +
        bores + D([at([RAIL.x + 1.2, RAIL.y + 1.4, RAIL_TOP]), at([RAIL.x + RAIL.w - 1.2, RAIL.y + 1.4, RAIL_TOP])], { size: 0.4 }),
      [sSlab(RAIL, BAR_TOP, RAIL_TOP - BAR_TOP), sSlab(inlay, RAIL_TOP, 0.2)],
      "saddle",
    );
  }
  const KEEP = STATIONS.indexOf(FEATURE);
  STATIONS.forEach((station, i) => {
    put(`pin${i}`, pinSolid(pinPaths(i, PIN.h), ` data-pin="${i}"`, i === KEEP ? "hi" : "mid"), [sCyl(pinX(i), PIN.y, PIN.r, RAIL_TOP, PIN.h)], "saddle");
  });
  // the fixed index pawl on its post in front of the bar reads the pin under the cutter
  {
    const flange = { x: PAWL.x - 6, y: PAWL.post - 0.5, w: 12, d: 10, r: 1.2 };
    const post = { x: PAWL.x - 2.5, y: PAWL.post, w: 5, d: 5.4, r: 0.8 };
    const top = RAIL_TOP + PIN.h + 2.4;
    const arm = { x: PAWL.x - 1, y: PIN.y - 0.6, w: 2, d: PAWL.post - PIN.y + 0.6, r: 0.4 };
    const tip = { x: PAWL.x - 0.6, y: PIN.y - 0.6, w: 1.2, d: 1.4, r: 0.2 };
    put(
      "stand.pawl",
      S(slab(flange, 0, 5, 2, 0.5), { tone: "mid" }) + D([at([flange.x + 1.8, flange.y + flange.d - 1.8, 5]), at([flange.x + flange.w - 1.8, flange.y + flange.d - 1.8, 5]), at([flange.x + flange.w - 1.8, flange.y + 1.8, 5])], { size: 0.45 }) +
        S(slab(post, 5, top + 1.6 - 5, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(post, 16, P, 2), { tone: "faint" }) }),
      [sSlab(flange, 0, 5), sSlab(post, 5, top + 1.6 - 5)],
    );
    put(
      "pawl",
      S(slab(tip, top - 1.6, 1.6, 2), { tone: "mid", crease: "none" }) + S(slab(arm, top, 1.6, 2), { tone: "mid" }) + D([at([PAWL.x, PAWL.post + 3, top + 1.6])], { size: 0.4 }),
      [sSlab(arm, top, 1.6), sSlab(tip, top - 1.6, 1.6)],
    );
  }
  // the pruning bolt slides in its guide and drops every pin but #104
  {
    const guide = { x: BOLT.x - 4, y: RAIL.y, w: RAIL.x - BOLT.x + 4, d: RAIL.d, r: 0.6 };
    const slot = { x: BOLT.x - 0.8, y: BOLT.y - 0.8, w: BOLT.slide + 1.6, d: 1.6, r: 0.8 };
    put("bolt.guide", S(slab(guide, BAR_TOP, RAIL_TOP - BAR_TOP, 2, 0.3), { tone: "mid" }) + L(k.planOutline(slot, RAIL_TOP, P, 4), { tone: "lo" }), [sSlab(guide, BAR_TOP, RAIL_TOP - BAR_TOP)], "saddle");
    put(
      "bolt",
      '<g data-ctl="bolt">' +
      S(cyl(BOLT.x, BOLT.y, 1, RAIL_TOP, 0.8, 12), { tone: "mid" }) +
        S(cyl(BOLT.x, BOLT.y, BOLT.r, RAIL_TOP + 0.8, BOLT.h, 16, 0.3), { tone: "mid", crease: "lo" }) + L(k.knurl(BOLT.x, BOLT.y, BOLT.r, RAIL_TOP + 1.2, RAIL_TOP + 0.8 + BOLT.h - 0.4, 16, P, 0.25), { tone: "lo" }) +
        L(k.ring(BOLT.x, BOLT.y, 1.3, RAIL_TOP + 0.8 + BOLT.h, P, 12), { tone: "faint" }) + "</g>",
      [sCyl(BOLT.x, BOLT.y, 1, RAIL_TOP, 0.8), sCyl(BOLT.x, BOLT.y, BOLT.r, RAIL_TOP + 0.8, BOLT.h)],
      "bolt",
    );
  }
  {
    const [sx, sy] = STOP;
    const ticks = k.radialTicks(sx, sy, 3.6, 16, 4, BAR_TOP + 1.4, [1, 1], P);
    put(
      "stop",
      S(cyl(sx, sy, 3.6, BAR_TOP, 1.4, 16), { tone: "mid" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) +
        S(cyl(sx, sy, 2.6, BAR_TOP + 1.4, STOP_TOP - BAR_TOP - 1.4, 14), { tone: "mid" }) + L(k.knurl(sx, sy, 2.6, BAR_TOP + 1.4, STOP_TOP, 14, P), { tone: "lo" }) +
        `<path data-stop class="iso-line" data-tone="hi" d="${stopPointer(0)}"/>` + D([at([sx, sy, STOP_TOP])], { size: 0.45, tone: "hi" }),
      [sCyl(sx, sy, 3.6, BAR_TOP, 1.4), sCyl(sx, sy, 2.6, BAR_TOP + 1.4, STOP_TOP - BAR_TOP - 1.4)],
      "saddle",
    );
    put("spring.post", S(cyl(SPRING.x, SPRING.front + 1.6, 1.6, BAR_TOP, SPRING.z + 3 - BAR_TOP, 14), { tone: "mid" }), [sCyl(SPRING.x, SPRING.front + 1.6, 1.6, BAR_TOP, SPRING.z + 3 - BAR_TOP)], "saddle");
    const c = coilOf(0);
    put("spring", `<path data-coil="back" class="iso-line" data-tone="lo" d="${c.back}"/><path data-coil="front" class="iso-line" data-tone="mid" d="${c.front}"/>`, [sDisc(G.frameOf([SPRING.x, SPRING.back, SPRING.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, SPRING.front - SPRING.back, SPRING.r, { name: "spring", owner: "spring" })], "saddle");
  }

  // ============================ vise plate on the ways: two vises, master and blank, the spring lug and the handle
  {
    const seam = L(k.sideSeam(BODY, 27, P, 4), { tone: "faint" });
    const rivets = [-112, -76, -40, -4, 38].map((x) => at([x, BODY.y + BODY.d - 2.2, BODY_TOP]));
    put("plate", S(slab(BODY, BODY_Z, BODY_TOP - BODY_Z, 4, 0.6), { tone: "mid", inner: seam }) + D(rivets, { size: 0.4, tone: "lo" }), [sSlab(BODY, BODY_Z, BODY_TOP - BODY_Z)], "body");
    const lug = { x: SPRING.x - 2, y: BODY.y + BODY.d, w: 4, d: SPRING.back - BODY.y - BODY.d, r: 0.4 };
    // the spring's hooked end is pinned to the lug's face
    const hook = coilOf(0).front.match(/^M\s*([-\d.]+)[\s,]+([-\d.]+)/).slice(1).map(Number);
    put("lug", S(slab(lug, BODY_Z, 4.4, 2, 0.3), { tone: "mid" }) + D([hook], { size: 0.45 }), [sSlab(lug, BODY_Z, 4.4)], "body");
    const arm = { x: HANDLE.x - 2.2, y: BODY.y + BODY.d, w: 4.4, d: HANDLE.arm, r: 1 };
    const FH = G.frameOf([HANDLE.x, arm.y + arm.d, HANDLE.z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
    const ball = [HANDLE.x, HANDLE.ball, HANDLE.z];
    const neck = ball[1] - Math.sqrt(HANDLE.r ** 2 - 1.8 ** 2) - (arm.y + arm.d);
    put(
      "handle",
      `<g data-ctl="handle">${S(slab(arm, HANDLE.z - 2.2, 4.4, 3), { tone: "mid" }) + S(G.disc(0, neck, 1.8, FH, P, { steps: 14 }), { tone: "mid", crease: "none" }) + S(G.sphereOf(ball, HANDLE.r, P, { steps: 14 }), { tone: "mid" })}</g>`,
      [sSlab(arm, HANDLE.z - 2.2, 4.4), sDisc(FH, 0, neck, 1.8), sBall(ball, HANDLE.r)],
      "body",
    );
  }
  const keyway = (sh) => L(k.planOutline({ x: sh + KEYWAY.from, y: KEYWAY.y, w: KEYWAY.to - KEYWAY.from, d: KEYWAY.d, r: KEYWAY.d / 2 }, KEY_Z + KEY_T, P, 3), { tone: "lo" });
  const bowRim = (sh) => {
    const [cx, cy] = bowCentre(sh);
    return L(k.ring(cx, cy, BOW.r - 2, KEY_Z + KEY_T, P, 28), { tone: "lo" });
  };
  const hole = (sh) => {
    const [hx, hy, hr] = BOW_HOLE(sh);
    const top = Array.from({ length: 20 }, (_, i) => [hx + hr * Math.cos((i / 20) * 2 * Math.PI), hy + hr * Math.sin((i / 20) * 2 * Math.PI), KEY_Z + KEY_T]);
    return poly(top, "sc-bore") + L(k.pathOf(top.map(at), true), { tone: "lo" });
  };
  const vise = (sh, name, keyItem) => {
    const lower = jawPlan(sh);
    const upper = { x: sh + 2.2, y: CLAMP.y, w: 38, d: JAW.y + JAW.d - CLAMP.y, r: 0.8 };
    const gauge = { x: sh, y: EDGE_Y + BLADE_W + 0.1, w: 1.6, d: 5, r: 0.2 };
    const [kx, ky] = [sh + 9.6, CLAMP.y + (JAW.y + JAW.d - CLAMP.y) / 2];
    const jaw = S(slab(lower, BODY_TOP, KEY_Z - BODY_TOP, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(lower, 33, P, 3), { tone: "faint" }) });
    if (name !== "blank") put(`${name}.jaw`, jaw, [sSlab(lower, BODY_TOP, KEY_Z - BODY_TOP)], "body");
    else {
      // the blank's jaw passes in front of the wheel's lower rim while the blank behind it is still uncut: split it at the wheel too
      const half = (x0, x1) => k.pathOf([[x0, -300, KEY_Z], [x1, -300, KEY_Z], [x1, 300, KEY_Z], [x0, 300, KEY_Z]].map(at), true);
      clips.push(`<clipPath id="scx-jaw-uncut"><path data-hold="-body" d="${half(CUT_X - 600, CUT_X)}"/></clipPath>`);
      clips.push(`<clipPath id="scx-jaw-cut"><path data-hold="-body" d="${half(CUT_X, CUT_X + 600)}"/></clipPath>`);
      put("blank.jaw", `<g clip-path="url(#scx-jaw-uncut)">${jaw}</g>`, [sSlab(lower, BODY_TOP, KEY_Z - BODY_TOP)], "body");
      put("blank.jaw.cut", `<g clip-path="url(#scx-jaw-cut)">${jaw}</g>`, [], "body");
    }
    keyItem();
    put(`${name}.gauge`, S(slab(gauge, KEY_Z, 4.4, 2, 0.2), { tone: "mid" }), [sSlab(gauge, KEY_Z, 4.4)], "body");
    const ut = KEY_Z + KEY_T + CLAMP.h;
    put(
      `${name}.clamp`,
      S(slab(upper, KEY_Z + KEY_T, CLAMP.h, 3, 0.4), { tone: "mid" }) + D([at([upper.x + upper.w - 6, upper.y + upper.d / 2, ut]), at([upper.x + upper.w - 2.4, upper.y + upper.d / 2, ut])], { size: 0.45 }) +
        S(cyl(kx, ky, 3.8, ut, 5.4, 16, 0.4), { tone: "mid" }) + L(k.knurl(kx, ky, 3.8, ut + 0.6, ut + 5, 18, P), { tone: "lo" }) +
        L(k.ring(kx, ky, 2.2, ut + 5.4, P, 14), { tone: "faint" }) + D([at([kx, ky, ut + 5.4])], { size: 0.45 }),
      [sSlab(upper, KEY_Z + KEY_T, CLAMP.h), sCyl(kx, ky, 3.8, ut, 5.4)],
      "body",
    );
  };
  const keyShape = (sh, depth) => sRingZ(keyRing(sh, depth), KEY_Z, KEY_T);
  const marks = (sh) => keyway(sh) + bowRim(sh) + hole(sh);
  vise(MASTER_SH, "master", () =>
    put("master.key", S(keyPaths(MASTER_SH, master), { tone: "hi", crease: "lo" }) + marks(MASTER_SH), [keyShape(MASTER_SH, master)], "body"),
  );
  // the blank straddles the cutter while it is cut, so it is drawn as two copies split at the wheel's plane:
  // the part still to cut goes behind the wheel, the cut part in front. The split stays in the world (data-hold="-body").
  const opening = target(OPENING.mode, OPENING.pruned);
  const top = KEY_Z + KEY_T;
  const half = (x0, x1) => k.pathOf([[x0, -300, top], [x1, -300, top], [x1, 300, top], [x0, 300, top]].map(at), true);
  clips.push(`<clipPath id="scx-uncut"><path data-hold="-body" d="${half(CUT_X - 600, CUT_X)}"/></clipPath>`);
  clips.push(`<clipPath id="scx-cut"><path data-hold="-body" d="${half(CUT_X, CUT_X + 600)}"/></clipPath>`);
  const blank = (clip, extra) => `<g clip-path="url(#${clip})"><g data-blank>${liveSolid(keyPaths(BLANK_SH, opening), { tone: "hi", lit: true, crease: "lo" })}${extra}</g></g>`;
  vise(BLANK_SH, "blank", () => {
    put("blank.key", blank("scx-uncut", marks(BLANK_SH)), [sRingZ(halfRing(keyRing(BLANK_SH, opening), CUT_X, -1), KEY_Z, KEY_T)], "body");
    put("blank.tip", `<g clip-path="url(#scx-cut)"><g data-blank>${liveSolid({ shades: [] }, { tone: "hi", lit: true, crease: "lo" })}</g></g>`, [], "body");
  });

  // ============================ mode lever on its gate plate (front right)
  {
    const plate = { x: LEVER.at[0] - 13, y: LEVER.at[1] - 4, w: 26, d: 17, r: 2 };
    const [px, py] = LEVER.at;
    const arc = (r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [px + Math.sin(a) * r, py + Math.cos(a) * r];
    });
    const lim = 0.7;
    const cap = (a, from, to) => Array.from({ length: 7 }, (_, i) => {
      const t = from + ((to - from) * i) / 6;
      const [cx, cy] = [px + Math.sin(a) * LEVER.len, py + Math.cos(a) * LEVER.len];
      return [cx + Math.sin(a + t) * 1.4, cy + Math.cos(a + t) * 1.4];
    });
    const slot = [...arc(LEVER.len + 1.4, -lim, lim), ...cap(lim, 0, Math.PI), ...arc(LEVER.len - 1.4, lim, -lim), ...cap(-lim, Math.PI, 2 * Math.PI)];
    const detents = LEVER.angles.map((a) => k.ring(px + Math.sin(a) * (LEVER.len - 3.4), py + Math.cos(a) * (LEVER.len - 3.4), 0.6, 2.8, P, 12)).join("");
    put(
      "lever.plate",
      S(slab(plate, 0, 2.8, 4, 0.5), { tone: "mid" }) + L(k.pathOf(slot.map(([x, y]) => at([x, y, 2.8])), true), { tone: "lo" }) + L(detents, { tone: "mid" }) +
        D([at([plate.x + 2.6, plate.y + 2.6, 2.8]), at([plate.x + plate.w - 2.6, plate.y + 2.6, 2.8]), at([plate.x + 2.6, plate.y + plate.d - 2.6, 2.8]), at([plate.x + plate.w - 2.6, plate.y + plate.d - 2.6, 2.8])], { size: 0.45 }) +
        S(cyl(px, py, 2.8, 2.8, LEVER_Z - 2.8, 14), { tone: "mid" }),
      [sSlab(plate, 0, 2.8), sCyl(px, py, 2.8, 2.8, LEVER_Z - 2.8)],
    );
    put("lever.bar", liveSolid(leverPaths(LEVER.angles[0]), { tone: "mid", attr: " data-lever" }), [sRingZ(leverRing(LEVER.angles[0]), LEVER_Z, 1.6)]);
    put("lever.hub", S(cyl(px, py, 1.6, LEVER_Z + 1.6, 1, 14), { tone: "mid" }) + D([at([px, py, LEVER_Z + 2.6])], { size: 0.45 }), [sCyl(px, py, 1.6, LEVER_Z + 1.6, 1)]);
    const [tx, ty] = leverTip(0);
    put(
      "lever.knob",
      `<g data-ctl="lever">${S(cyl(tx, ty, 2.4, LEVER_Z + 1.6, 6.4, 16), { tone: "mid", crease: "lo" }) + L(k.knurl(tx, ty, 2.4, LEVER_Z + 2.4, LEVER_Z + 7.4, 16, P, 0.25), { tone: "lo" }) + L(k.ring(tx, ty, 1.3, LEVER_Z + 8, P, 12), { tone: "faint" })}</g>`,
      [sCyl(tx, ty, 2.4, LEVER_Z + 1.6, 6.4)],
      "knob",
    );
  }
  return { items, clips: clips.join("") };
}
