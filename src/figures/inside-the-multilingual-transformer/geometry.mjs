// Fig 6 geometry: every static part of the patch bay, built once, with the true shape of each part recorded beside its drawing.
// Pure ESM, no Node APIs. Items are { name, svg, shapes, at, bias }; shapes are plain descriptors that build.mjs turns into audit shapes.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as R from "./rig.mjs";
import { LEVELS } from "./model.mjs";
import { BLOCKS } from "./labels.mjs";

const { P } = R;
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const path = (points, closed = false) => k.pathOf(points.map(at), closed);
const n1 = (v) => Number(v.toFixed(1));

// ------------------------------------------------------------ helpers
// a rounded rectangle on a vertical face of constant y, in (x, z)
const faceRectY = (y, x0, z0, x1, z1, r, steps = 4) => path(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([x, z]) => [x, y, z]), true);
// the same on a face of constant x, in (y, z)
const faceRectX = (x, y0, z0, y1, z1, r, steps = 4) => path(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, steps).map(([y, z]) => [x, y, z]), true);
// points and outlines on the meter panel, in (u, v) at standoff s
const pp = (u, v, s = 0) => at(R.onPanel(u, v, s));
const panelPath = (points, s, closed = false) => k.pathOf(points.map(([u, v]) => pp(u, v, s)), closed);
const panelRect = (u, v, w, h, r, s, steps = 4) => panelPath(k.roundedPlan({ x: u, y: v, w, d: h, r }, steps), s, true);
const panelFrame = G.frameOf(R.PANEL.o, R.PANEL.n, R.PANEL.u, R.PANEL.v);
const round = (cx, cy, r, steps = 12) => Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * 2 * Math.PI), cy + r * Math.sin((i / steps) * 2 * Math.PI)]);

export function build() {
  const items = [];
  const put = (name, svg, shapes, point, bias = 0) => items.push({ name, svg, shapes, at: point, bias });
  const routes = [];
  const symbols = {};
  // an item drawn as a placed symbol: svg is the full drawing (for the audit and the verification page), use and extra the compact one
  const putUse = (name, use, extra, shapes, point, bias = 0) => items.push({ name, svg: `<g transform="${use.transform}">${symbols[use.id]}</g>${extra}`, use, extra, shapes, at: point, bias });

  // ============================================================ bench
  const { PLATE } = R;
  const zb = -R.PLATE_H;
  {
    // the halo under everything, then the four feet as one item: the plate covers all of them from above
    const feet = k.corners(PLATE, 24);
    const svg = `<path class="iso-halo" d="${k.haloOf(PLATE, zb - R.FOOT_H, R.PLATE_H, P)}"/>` + feet.map(([x, y]) => S(k.cylinder(x, y, 7, zb - R.FOOT_H, 1.6, P, 18), { tone: "lo" }) + S(k.cylinder(x, y, 5.4, zb - R.FOOT_H + 1.6, R.FOOT_H - 1.6, P, 18), { tone: "mid" })).join("");
    put("stand.feet", svg, feet.flatMap(([x, y]) => [["cyl", x, y, 7, zb - R.FOOT_H, 1.6], ["cyl", x, y, 5.4, zb - R.FOOT_H + 1.6, R.FOOT_H - 1.6]]), [PLATE.x + PLATE.w / 2, PLATE.y + PLATE.d / 2, zb - 3], -800);
  }
  {
    const screws = k.corners(PLATE, 10);
    const svg =
      S(k.slabOf(PLATE, zb, R.PLATE_H, P, 8, 1.6), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
      L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
    put("stand.plate", svg, [["slab", PLATE, zb, R.PLATE_H]], [PLATE.x + PLATE.w / 2, PLATE.y + PLATE.d / 2, -6], -500);
  }
  {
    // label plate with the maker's mark and three rule lines
    const label = { x: -24, y: 48, w: 46, d: 11, r: 1.2 };
    const z = 0.8;
    const rules = [26, 20, 14].map((w, i) => k.lineOnTop([label.x + 14, label.y + 2.9 + i * 2.6], [label.x + 14 + w, label.y + 2.9 + i * 2.6], z, P)).join("");
    const svg =
      S(k.slabOf(label, 0, z, P, 3), { tone: "lo", crease: "none" }) +
      L(k.planOutline(k.insetPlan(label, 1.4), z, P, 3), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([label.x + 3, label.y + 7.3], z, P), "AU-6", { size: 3.6, tone: "mid" }) +
      L(rules, { tone: "lo", free: true }) +
      D([at([label.x + label.w - 3, label.y + 3, z]), at([label.x + label.w - 3, label.y + label.d - 3, z])], { size: 0.45 });
    put("label", svg, [["slab", label, 0, z]], [label.x + label.w / 2, label.y + label.d / 2, 0.4]);
  }
  {
    // ruler strip along the front edge
    const strip = { x: -134, y: 46, w: 62, d: 7, r: 1 };
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 2, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    const svg = S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    put("ruler", svg, [["slab", strip, 0, 0.6]], [strip.x + strip.w / 2, strip.y + strip.d / 2, 0.3]);
  }

  // ============================================================ card cage: the transformer
  const { CAGE, IN, STRIP } = R;
  const zp = R.PLINTH_H;
  {
    const plinth = { x: CAGE.x0, y: CAGE.y0, w: CAGE.x1 - CAGE.x0, d: CAGE.y1 - CAGE.y0, r: 2 };
    const svg =
      `<path class="iso-halo" d="${k.haloOf(plinth, 0, 6, P)}"/>` +
      S(k.slabOf(plinth, 0, zp, P, 4, 0.8), { tone: "lo", inner: L(k.sideSeam(plinth, 2.2, P, 4), { tone: "faint" }) }) +
      D([at([CAGE.x0 + 4, CAGE.y1 - 3, zp]), at([CAGE.x1 - 4, CAGE.y1 - 3, zp])], { size: 0.45 });
    put("cage.plinth", svg, [["slab", plinth, 0, zp, 4]], [-72, -13, 3]);
  }
  // rack posts with foot plates; the cage's ears bolt to their front faces
  const posts = [
    { x: -133, y: 4, w: 8, d: 8, foot: { x: -137, y: 1, w: 12, d: 14, r: 1.4 } },
    { x: -19, y: 4, w: 8, d: 8, foot: { x: -19, y: 1, w: 12, d: 14, r: 1.4 } },
  ];
  posts.forEach((post, i) => {
    const plan = { ...post, r: 0.8 };
    const top = 76; // flush with the card tops, so a plug in the front row is never behind a post
    const footSvg = S(k.slabOf(post.foot, 0, 2, P, 3, 0.4), { tone: "lo" }) + D(k.corners(post.foot, 2.2).map(([x, y]) => at([x, y, 2])), { size: 0.45 });
    put(`cage.postfoot${i}`, footSvg, [["slab", post.foot, 0, 2, 3]], [post.foot.x + 6, post.foot.y + 7, 1]);
    // rack holes: square holes down the post's +x face (only the right post's shows)
    const holes = i === 1 ? Array.from({ length: 12 }, (_, j) => faceRectX(post.x + post.w, post.y + 2.6, 8 + j * 5.5, post.y + post.d - 2.6, 10 + j * 5.5, 0.4, 2)).join("") : "";
    const svg =
      S(k.slabOf(plan, 2, top - 2, P, 2, 0.4), { tone: "mid", inner: holes ? L(holes, { tone: "lo" }) : "" }) +
      S(k.slabOf(k.insetPlan(plan, -0.6), top, 1.6, P, 2, 0.4), { tone: "mid" });
    put(`cage.post${i}`, svg, [["slab", plan, 2, top - 2, 2], ["slab", k.insetPlan(plan, -0.6), top, 1.6, 2]], [post.x + 4, post.y + 4, 40]);
  });
  // end plates, back rail with card guides, the dark well between the rails
  const endTop = 72;
  const ends = [
    { x: IN.x0 - 5, y: -50, w: 5, d: R.FACE_Y + 50, r: 0.6 },
    { x: IN.x1, y: -50, w: 5, d: R.FACE_Y + 50, r: 0.6 },
  ];
  ends.forEach((plan, i) => {
    let inner = "";
    if (i === 1) {
      // vent slots on the right plate's outer face, and its four corner screws
      const slots = [];
      for (let j = 0; j < 9; j++) slots.push(faceRectX(plan.x + plan.w, -42 + j * 5.2, 24, -42 + j * 5.2 + 1.8, 54, 0.9, 3));
      inner = L(slots.join(""), { tone: "lo" }) + L(k.sideSeam(plan, zp + 3, P, 2), { tone: "faint" });
    }
    const screws = i === 1 ? D([[-46, 12], [-46, 66], [9, 12], [9, 66]].map(([y, z]) => at([plan.x + plan.w, y, z])), { size: 0.45 }) : "";
    put(`cage.end${i}`, S(k.slabOf(plan, zp, endTop - zp, P, 2, 0.5), { tone: "mid", inner }) + screws, [["slab", plan, zp, endTop - zp, 2]], [plan.x + 2.5, -17, 38]);
  });
  {
    const rail = { x: IN.x0, y: -50, w: IN.x1 - IN.x0, d: 4, r: 0.4 };
    const teeth = Array.from({ length: BLOCKS }, (_, i) => ({ x: R.CARD_X(i) - 1.3, y: -49.4, w: 2.6, d: 2.8, r: 0.4 }));
    // the twelve card guides are one tooth drawn once and placed by translation
    symbols.tooth = S(k.slabOf(teeth[0], 72, 1, P, 2), { tone: "mid" });
    const body = S(k.slabOf(rail, 66, 6, P, 2, 0.4), { tone: "mid" });
    const moves = teeth.map((t) => k.translateAlong(P, [t.x - teeth[0].x, 0, 0]));
    put("cage.rail", body + moves.map((m) => `<g transform="${m}">${symbols.tooth}</g>`).join(""), [["slab", rail, 66, 6, 2], ...teeth.map((t) => ["slab", t, 72, 1, 2])], [-72, -48, 69]);
    items[items.length - 1].compact = body + moves.map((m) => `<use href="#mt-tooth" transform="${m}"/>`).join("");
    const well = { x: IN.x0, y: -46, w: IN.x1 - IN.x0, d: R.PANEL_Y + 46, r: 0 };
    put("cage.well", `<path class="mt-well" d="${k.onTop(k.roundedPlan(well, 1), 70, P, true)}"/>`, [["slab", well, 69.9, 0.1, 1]], [-72, -17, 70], -2);
  }
  // twelve cards: faceplate (with an index window and two captive screws), two ejector handles, and the test strip on the top edge.
  // The cards are identical, so each part is drawn once for card 0 as a symbol and placed on the others by a translation.
  const SOCKET_SHAPES = [
    (x, y) => round(x, y, 2.4, 16), // attn: round
    (x, y) => k.roundedPlan({ x: x - 2.3, y: y - 2.3, w: 4.6, d: 4.6, r: 0.8 }, 2), // post-attn: square
    (x, y) => round(x, y, 2.7, 6), // ffn: hexagon
    (x, y) => k.roundedPlan({ x: x - 2.8, y: y - 1.7, w: 5.6, d: 3.4, r: 1.7 }, 4), // output: oval
  ];
  const c0 = R.CARD_X(0);
  const fy = R.FACE_Y;
  const face = { x: c0 - 3.8, y: R.PANEL_Y, w: 7.6, d: R.FACE_Y - R.PANEL_Y, r: 0.5 };
  const { LEVEL } = R;
  // the level window: a dark recess with faint graduations every 0.02 Δz, edge to edge; the bars are drawn per card
  const grads = [0.02, 0.04, 0.06, 0.08].map((v) => path([[c0 - LEVEL.half, fy, R.levelTop(v)], [c0 + LEVEL.half, fy, R.levelTop(v)]])).join("");
  const faceInner =
    // (symbols are drawn through <use>, whose copies only take the kit's unscoped classes: the recess is a shade-0 fill)
    `<path class="iso-shade" data-shade="0" d="${faceRectY(fy, c0 - LEVEL.half, LEVEL.z0, c0 + LEVEL.half, LEVEL.z1, 0.6)}"/>` +
    L(faceRectY(fy, c0 - LEVEL.half, LEVEL.z0, c0 + LEVEL.half, LEVEL.z1, 0.6), { tone: "lo" }) +
    L(grads, { tone: "faint" }) +
    L([73.6, 8.4].map((z) => k.sideRing([c0, fy, z], 0.95, "y", P, 12)).join(""), { tone: "lo" });
  symbols.face = S(k.slabOf(face, zp, R.CARD_TOP - zp, P, 2, 0.4), { tone: "mid", inner: faceInner }) + D([73.6, 8.4].map((z) => at([c0, fy, z])), { size: 0.42 });
  const HANDLES = [[63.5, 69.5], [12.5, 18.5]];
  const handle = { x: c0 - 2.1, y: fy, w: 4.2, d: 3.2, r: 0.9 };
  HANDLES.forEach(([z0, z1], j) => (symbols[`handle${j}`] = S(k.slabOf(handle, z0, z1 - z0, P, 2, 0.4), { tone: "mid" }) + L(k.planOutline({ x: c0 - 1.4, y: fy + 1.7, w: 2.8, d: 0.9, r: 0.45 }, z1, P, 2), { tone: "faint" })));
  const strip = { x: c0 - STRIP.w / 2, y: STRIP.y0, w: STRIP.w, d: STRIP.y1 - STRIP.y0, r: 0.8 };
  const stripParts = [S(k.slabOf(strip, STRIP.z, STRIP.top - STRIP.z, P, 2, 0.4), { tone: "hi", crease: "lo" })];
  const bezels = [];
  R.SOCKET_Y.forEach((sy, s) => {
    stripParts.push(S(k.extrude(SOCKET_SHAPES[s](c0, sy), STRIP.top, R.SOCKET_H, P), { tone: "hi", crease: "lo" }));
    const bore = k.onTop(round(c0, sy, 1.05, 12), R.SOCKET_TOP, P, true);
    stripParts.push(`<path class="iso-shade" data-shade="0" d="${bore}"/>` + L(bore, { tone: "lo" }));
    // the two winner lamps: a short bezel collar each, the lens is drawn per card
    [0, 1].forEach((f) => {
      const [x, y, z] = R.lampAt(0, s, f);
      bezels.push([x - c0, y, z]);
      stripParts.push(S(k.cylinder(x, y, R.LAMP.bezel, z, R.LAMP.h, P, 12), { tone: "mid", crease: "none" }));
    });
  });
  symbols.strip = stripParts.join("");
  const use = (id, dx) => ({ id, transform: k.translateAlong(P, [dx, 0, 0]) });
  for (let i = 0; i < 12; i++) {
    const cx = R.CARD_X(i);
    const dx = cx - c0;
    const moved = (plan) => ({ ...plan, x: plan.x + dx });
    // the four level bars: mean Δz of the four encoding meters at this card's taps, attn, post-attn, ffn, output
    const bars = LEVELS[i].map((v, s) => {
      const [x0, x1, z0, z1] = [cx + R.levelX(s), cx + R.levelX(s) + LEVEL.bar, LEVEL.z0 + LEVEL.inset, R.levelTop(v)];
      return path([[x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1]], true);
    }).join("");
    putUse(`card${i}.face`, use("face", dx), bars ? `<path class="mt-bar" d="${bars}"/>` : "", [["slab", moved(face), zp, R.CARD_TOP - zp, 2]], [cx, 13.5, 41]);
    HANDLES.forEach(([z0, z1], j) => putUse(`card${i}.handle${j}`, use(`handle${j}`, dx), "", [["slab", moved(handle), z0, z1 - z0, 2]], [cx, fy + 1.6, (z0 + z1) / 2]));
    const lamps = R.SOCKET_Y.flatMap((_, s) => [0, 1].map((f) => [s, f, at(R.lampAt(i, s, f).map((v, j) => (j === 2 ? v + R.LAMP.h : v)))]));
    const rx = R.LAMP.lens * P.scale * Math.sqrt(1.6); // a lens on the top face is an upright ellipse, ry = rx · sin 30°
    const ry = rx * 0.5;
    const extra = lamps.map(([s, f, [x, y]]) => `<ellipse class="mt-lamp" data-lamp="${i}-${s}-${f}" cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}"/>`).join("");
    const shapes = [["slab", moved(strip), STRIP.z, STRIP.top - STRIP.z, 2], ...R.SOCKET_Y.map((sy, s) => ["ext", SOCKET_SHAPES[s](cx, sy), STRIP.top, R.SOCKET_H]), ...bezels.map(([x, y, z]) => ["cyl", x + cx, y, R.LAMP.bezel, z, R.LAMP.h])];
    putUse(`card${i}.strip`, use("strip", dx), extra, shapes, [cx, -16, 75]);
  }
  // rack ears: the faceplate row's two flanges, with slotted holes onto the posts
  [[IN.x0 - 11, IN.x0 - 5], [IN.x1 + 5, IN.x1 + 11]].forEach(([x0, x1], i) => {
    const ear = { x: x0, y: R.PANEL_Y, w: x1 - x0, d: 3, r: 0.4 };
    const slots = [18, 62].map((z) => faceRectY(R.FACE_Y, (x0 + x1) / 2 - 1.8, z - 1, (x0 + x1) / 2 + 1.8, z + 1, 1, 3)).join("");
    const svg = S(k.slabOf(ear, 8, 66, P, 2, 0.4), { tone: "mid", inner: L(slots, { tone: "lo" }) }) + D([18, 62].map((z) => at([(x0 + x1) / 2, R.FACE_Y, z])), { size: 0.5, tone: "hi" });
    put(`cage.ear${i}`, svg, [["slab", ear, 8, 66, 2]], [(x0 + x1) / 2, 13.5, 41]);
  });
  // the cell selector: a switch box on the apron with a three-position bat toggle, wired along the bench to the console's
  // contrast section; the lever and its ball are live
  {
    const { SELECT, SELECT_H, TOGGLE: T } = R;
    const zt = SELECT_H;
    const hex = round(T.x, T.y, 2.7, 6);
    // the three positions: XLM-R left, NLLB right, both (centre) in front of the bushing
    const marks = [[T.x - 7.5, T.y], [T.x + 7.5, T.y], [T.x, T.y + 5.6]];
    const svg =
      `<path class="iso-halo" d="${k.haloOf(SELECT, 0, zt, P)}"/>` +
      S(k.slabOf(SELECT, 0, zt, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(SELECT, 2.2, P, 4), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(SELECT, 2.2), zt, P, 4), { tone: "faint" }) +
      D(k.corners(SELECT, 3.4).map(([x, y]) => at([x, y, zt])), { size: 0.5 }) +
      L(marks.map(([x, y]) => k.ring(x, y, 1.1, zt, P, 12)).join(""), { tone: "lo" }) +
      D(marks.map(([x, y]) => at([x, y, zt])), { size: 0.45, tone: "mid" });
    put("select.box", svg, [["slab", SELECT, 0, zt, 4]], [SELECT.x + SELECT.w / 2, SELECT.y + SELECT.d / 2, zt / 2]);
    put("select.bushing", S(k.extrude(hex, zt, 1.4, P, { bevel: 0.3 }), { tone: "mid" }) + S(k.cylinder(T.x, T.y, 1.8, zt + 1.4, 1.6, P, 20), { tone: "mid" }), [["ext", hex, zt, 1.4], ["cyl", T.x, T.y, 1.8, zt + 1.4, 1.6]], [T.x, T.y, zt + 1.5]);
    // the lead: a gland on the box's +x face and one on the console's front lip; the cable lies on the bench between them
    const g = R.SELECT_GLAND;
    const y = SELECT.y + SELECT.d / 2;
    const glands = [[[SELECT.x + SELECT.w, y, 4.5], [1, 0, 0]], [[g.x, g.y, g.z], [0, 1, 0]]];
    glands.forEach(([o, a], n) => {
      const F = G.frameAlong(o, a);
      put(`select.gland${n}`, S(G.disc(0, 1.6, 1.7, F, P), { tone: "mid", crease: "lo" }) + S(G.disc(1.6, 2.2, 1.25, F, P), { tone: "mid" }), [["disc", F, 0, 1.6, 1.7], ["disc", F, 1.6, 2.2, 1.25]], G.add3(o, G.mul3(a, 1.1)));
    });
    const r = 0.7;
    const low = r + 0.45;
    const x0 = SELECT.x + SELECT.w;
    const raw = [[x0 + 2.2, y, 4.5], [x0 + 4.2, y, 4.5], [x0 + 7.2, y, low], [g.x, y, low], [g.x, g.y + 10, low], [g.x, g.y + 6, g.z], [g.x, g.y + 2.2, g.z]];
    routes.push({ name: "selectcable", points: G.fillet(raw, 2.2, 8, { P, tube: r }), r });
  }

  // ============================================================ meter bank
  const { MB } = R;
  const prof = (by = 0) => {
    // the side profile, grown by `by`, with its two upper corners rounded
    const raw = R.MB_PROFILE.map(([y, z]) => [y, z]);
    const grown = raw.map(([y, z], i) => [y + (i === 0 || i === 4 ? -by : i === 1 || i === 2 ? by : 0), z + (i >= 2 ? by : 0) - (i < 2 ? 0 : 0)]);
    const out = [];
    grown.forEach((p, i) => {
      const r = i === 3 ? 2.4 : i === 4 ? 2 : i === 2 ? 1.6 : 0;
      if (!r) return out.push(p);
      const a = grown[(i + grown.length - 1) % grown.length];
      const b = grown[(i + 1) % grown.length];
      const ta = G.unit3([0, a[0] - p[0], a[1] - p[1]]);
      const tb = G.unit3([0, b[0] - p[0], b[1] - p[1]]);
      for (let j = 0; j <= 4; j++) {
        const t = j / 4;
        const q0 = [p[0] + ta[1] * r, p[1] + ta[2] * r];
        const q1 = [p[0] + tb[1] * r, p[1] + tb[2] * r];
        const m = 1 - t;
        out.push([m * m * q0[0] + 2 * m * t * p[0] + t * t * q1[0], m * m * q0[1] + 2 * m * t * p[1] + t * t * q1[1]]);
      }
    });
    return out;
  };
  const along = (x) => G.frameOf([x, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  [[MB.x0 + 8, -34], [MB.x1 - 8, -34], [MB.x0 + 8, 16], [MB.x1 - 8, 16]].forEach(([x, y], i) => {
    put(`mb.foot${i}`, S(k.cylinder(x, y, 2.8, 0, R.MB_FEET, P, 20), { tone: "lo" }), [["cyl", x, y, 2.8, 0, R.MB_FEET]], [x, y, 1.5]);
  });
  {
    const cheek = prof(0.8);
    const body = prof(0);
    put("mb.cheek0", S(G.prismOf(along(MB.x0), cheek, 0, MB.cheek, P), { tone: "mid" }), [["prism", along(MB.x0), cheek, 0, MB.cheek]], [MB.x0 + 1.5, -9, 32]);
    const seam = path([[MB.x0 + MB.cheek, 22, 9], [MB.x1 - MB.cheek, 22, 9]]);
    put(
      "mb.body",
      `<path class="iso-halo" d="${k.haloOf({ x: MB.x0, y: -40, w: MB.x1 - MB.x0, d: 62, r: 2 }, 0, 4, P)}"/>` +
        S(G.prismOf(along(MB.x0 + MB.cheek), body, 0, MB.x1 - MB.x0 - 2 * MB.cheek, P), { tone: "mid", inner: L(seam, { tone: "faint" }) }) +
        // the top cover's four screws
        D([[MB.x0 + 6.5, -36.5], [MB.x1 - 6.5, -36.5], [MB.x0 + 6.5, -12], [MB.x1 - 6.5, -12]].map(([x, y]) => at([x, y, R.MB_TOP])), { size: 0.5 }),
      [["prism", along(MB.x0 + MB.cheek), body, 0, MB.x1 - MB.x0 - 2 * MB.cheek]],
      [(MB.x0 + MB.x1) / 2, -9, 32],
    );
    // right cheek: vent slots on its outer face, four screws
    const xr = MB.x1;
    const slots = Array.from({ length: 7 }, (_, j) => faceRectX(xr, -32 + j * 4, 14, -32 + j * 4 + 1.6, 44, 0.8, 3)).join("");
    const screws = [[-35, 8], [-35, 55], [16, 8]].map(([y, z]) => at([xr, y, z]));
    put("mb.cheek1", S(G.prismOf(along(MB.x1 - MB.cheek), cheek, 0, MB.cheek, P), { tone: "mid", inner: L(slots, { tone: "lo" }) }) + D(screws, { size: 0.45 }), [["prism", along(MB.x1 - MB.cheek), cheek, 0, MB.cheek]], [MB.x1 - 1.5, -9, 32]);
  }
  {
    // panel furniture: corner screws, the groove between the semantic and auditory halves (edge to edge)
    const W = R.PANEL.w;
    const H = R.PANEL.h;
    // the groove runs between two screws that hold the panel's centre rib
    const gu = R.GROOVE_U;
    const screws = [[2.6, 2.6], [W - 2.6, 2.6], [2.6, H - 2.6], [W - 2.6, H - 2.6], [gu, 2.6], [gu, H - 2.6]].map(([u, v]) => pp(u, v, 0));
    const groove = panelPath([[gu, 2.6], [gu, H - 2.6]], 0);
    put("mb.panel", L(groove, { tone: "lo" }) + D(screws, { size: 0.5 }), [["prism", panelFrame, [[0, 0], [W, 0], [W, H], [0, H]], -0.1, 0]], [(MB.x0 + MB.x1) / 2, 7, 39], -0.5);
  }
  // four encoding meters and two centre-zero contrast meters
  const meterItem = (name, box, kind) => {
    const g = R.meterGeometry(box, kind);
    const poly = k.roundedPlan({ x: box.u, y: box.v, w: box.w, d: box.h, r: 2 }, 4);
    const s = R.BEZEL_S;
    const parts = [S(G.prismOf(panelFrame, poly, 0, s, P), { tone: "hi", crease: "lo" })];
    const win = g.window;
    parts.push(`<path class="mt-scale" d="${panelRect(win.u, win.v, win.w, win.h, 1, s)}"/>`);
    // the scale arc and its ticks, rooted on the arc
    const [px, pv] = g.pivot;
    const ang = (frac) => ((-g.sweep + 2 * g.sweep * frac) * Math.PI) / 180;
    const pt = (a, r) => [px + r * Math.sin(a), pv - r * Math.cos(a)];
    const arc = [];
    for (let j = 0; j <= 40; j++) arc.push(pt(ang(j / 40), g.radius));
    parts.push(L(panelPath(arc, s), { tone: "mid" }));
    const count = 30 - 10 * (kind === "roi");
    const majorEvery = kind === "roi" ? 4 : 5;
    const minor = [];
    const major = [];
    for (let j = 0; j <= count; j++) {
      const a = ang(j / count);
      const big = j % majorEvery === 0;
      const tick = panelPath([pt(a, g.radius), pt(a, g.radius - (big ? 2.4 : 1.3))], s);
      (big ? major : minor).push(tick);
    }
    parts.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
    if (kind !== "roi") {
      // the zero mark, and the live confidence band under the arc
      parts.push(L(panelPath([pt(0, g.radius), pt(0, g.radius - 3.2)], s), { tone: "hi" }));
      parts.push(`<path class="mt-band" data-band="${name}" d=""/>`);
      parts.push(`<path class="mt-index" data-index="${name}" d=""/>`);
    }
    // the needle (live) and its hub; a contrast meter's needle comes up from below the window and is clipped to it
    if (g.hub) {
      parts.push(`<path class="iso-line mt-needle" data-tone="hi" data-needle="${name}" data-free="end" d=""/>`);
      parts.push(D([pp(px, pv, s)], { size: 0.85, tone: "hi" }));
    } else {
      parts.push(`<clipPath id="mt-clip-${name}"><path d="${panelRect(win.u, win.v, win.w, win.h, 1, s)}"/></clipPath><g clip-path="url(#mt-clip-${name})"><path class="iso-line mt-needle" data-tone="hi" data-needle="${name}" data-free="end" d=""/></g>`);
    }
    // the zero-adjust screw on the bezel under the window
    const screw = [box.u + box.w / 2, box.v + box.h - 1.1];
    parts.push(L(panelPath(round(screw[0], screw[1], 0.7, 10), s, true), { tone: "lo" }), D([pp(screw[0], screw[1], s)], { size: 0.35 }));
    put(name, parts.join(""), [["prism", panelFrame, poly, 0, s]], R.onPanel(box.u + box.w / 2, box.v + box.h / 2, 1), 0.5);
  };
  R.METER_BOX.forEach((box, i) => meterItem(`meter${i}`, box, "roi"));
  R.GALVO_BOX.forEach((box, i) => meterItem(`galvo${i}`, box, "galvo"));
  // a lamp grid beside each centre-zero meter, rows XLM-R and NLLB, columns EN, FR, ZH: green where that cell's test is
  // Holm-significant (semantic: the post hoc attention-side test; auditory: the pre-specified test). The ring of the
  // selected cell is drawn in the subject tone.
  R.GRID_BOX.forEach((box, f) => {
    const poly = k.roundedPlan({ x: box.u, y: box.v, w: box.w, d: box.h, r: 1.2 }, 3);
    const s = R.GRID_S;
    const lamps = [];
    for (let m = 0; m < 2; m++)
      for (let l = 0; l < 3; l++) {
        const [u, v] = R.gridLamp(box, m, l);
        const id = `${f}-${m * 3 + l}`;
        lamps.push(`<path class="mt-glamp" data-glamp="${id}" d="${panelPath(round(u, v, R.GRID_LENS, 12), s, true)}"/>`);
        lamps.push(`<path class="iso-line mt-gring" data-gring="${id}" d="${panelPath(round(u, v, R.GRID_LENS + 0.45, 12), s, true)}"/>`);
      }
    put(`grid${f}`, S(G.prismOf(panelFrame, poly, 0, s, P), { tone: "mid", crease: "lo" }) + lamps.join(""), [["prism", panelFrame, poly, 0, s]], R.onPanel(box.u + box.w / 2, box.v + box.h / 2, 0.5), 0.5);
  });
  // patch input on the case top, with its parked plug; carry handle
  {
    const { x, y } = R.INPUT;
    const z = R.MB_TOP;
    const socket = round(x, y, 2.7, 28);
    const up = G.frameAlong([x, y, z + R.SOCKET_H], [0, 0, 1]);
    const plugParts = plugSvg(up, false);
    const svg = S(k.extrude(socket, z, R.SOCKET_H, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }) + plugParts.svg;
    put("mb.input", svg, [["ext", socket, z, R.SOCKET_H], ...plugParts.shapes], [x, y, z + 6]);
    const blocks = [[MB.x0 + 22, MB.x0 + 28], [MB.x1 - 28, MB.x1 - 22]].map(([x0, x1]) => ({ x: x0, y: -34, w: x1 - x0, d: 8, r: 1.2 }));
    const bar = { x: MB.x0 + 25, y: -32, w: MB.x1 - MB.x0 - 50, d: 4, r: 2 };
    const handle = blocks.map((b) => S(k.slabOf(b, z, 9, P, 3, 0.4), { tone: "mid" })).join("") + S(k.slabOf(bar, z + 9, 3, P, 6, 0.6), { tone: "mid" }) + D(blocks.map((b) => at([b.x + b.w / 2, b.y + b.d - 1.8, z + 9])), { size: 0.45 });
    put("mb.handle", handle, [...blocks.map((b) => ["slab", b, z, 9, 3]), ["slab", bar, z + 9, 3, 6]], [(MB.x0 + MB.x1) / 2, -30, z + 6]);
  }
  // reference input on the front lip (the observed BOLD from the brain model)
  const { REF } = R;
  {
    const F = G.frameAlong([REF.x, REF.y, REF.z], [0, 1, 0]);
    const svg = S(G.disc(0, 0.8, 3.0, F, P), { tone: "mid" }) + S(G.disc(0.8, 1.6, 2.0, F, P), { tone: "hi", crease: "lo" }) + S(G.disc(1.6, 2.4, 2.35, F, P), { tone: "hi", crease: "lo" }) + S(G.disc(2.4, 3.2, 2.0, F, P), { tone: "hi", crease: "lo" });
    put("mb.ref", svg, [["disc", F, 0, 0.8, 3.0], ["disc", F, 0.8, 1.6, 2.0], ["disc", F, 1.6, 2.4, 2.35], ["disc", F, 2.4, 3.2, 2.0]], [REF.x, REF.y + 1.6, REF.z]);
  }

  // ============================================================ brain model: AU-5's clear slice stack in miniature
  const { BRAIN_BASE, KNOB, STACK, BOSS } = R;
  const zt = R.BRAIN_BASE_H;
  {
    const svg =
      `<path class="iso-halo" d="${k.haloOf(BRAIN_BASE, 0, 6, P)}"/>` +
      S(k.slabOf(BRAIN_BASE, 0, zt, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BRAIN_BASE, 2, P, 4), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(BRAIN_BASE, 2.4), zt, P, 4), { tone: "faint" }) +
      D(k.corners(BRAIN_BASE, 3.6).map(([x, y]) => at([x, y, zt])), { size: 0.45 });
    put("brain.base", svg, [["slab", BRAIN_BASE, 0, zt, 4]], [BRAIN_BASE.x + BRAIN_BASE.w / 2, BRAIN_BASE.y + BRAIN_BASE.d / 2, 3.5]);
    // the cohort dial under the knob: a thin plate with four detent ticks (EN, FR, ZH, all) rooted on its rim
    const dial = k.cylinder(KNOB.x, KNOB.y, KNOB.dial, zt, 0.5, P, 36);
    const ticks = R.KNOB_ANGLES.map((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const dir = [Math.sin(a), -Math.cos(a)];
      const r0 = i === R.KNOB_POOLED ? KNOB.r + 0.7 : KNOB.r + 1.3;
      return k.lineOnTop([KNOB.x + dir[0] * r0, KNOB.y + dir[1] * r0], [KNOB.x + dir[0] * KNOB.dial, KNOB.y + dir[1] * KNOB.dial], zt + 0.5, P);
    }).join("");
    const knob = k.cylinder(KNOB.x, KNOB.y, KNOB.r, zt + 0.5, KNOB.h, P, 32, 0.3);
    const knurl = k.knurl(KNOB.x, KNOB.y, KNOB.r, zt + 0.5, zt + 0.5 + KNOB.h, 30, P);
    const knobSvg = S(dial, { tone: "lo", inner: L(k.ring(KNOB.x, KNOB.y, KNOB.dial - 1.6, zt + 0.5, P, 32), { tone: "faint" }) }) + L(ticks, { tone: "mid" }) + S(knob, { tone: "hi", crease: "lo", inner: L(knurl, { tone: "lo" }) }) + `<path class="iso-line" data-tone="hi" data-pointer="" data-free="start" d=""/>`;
    put("brain.knob", knobSvg, [["cyl", KNOB.x, KNOB.y, KNOB.dial, zt, 0.5], ["cyl", KNOB.x, KNOB.y, KNOB.r, zt + 0.5, KNOB.h]], [KNOB.x, KNOB.y, zt + 2]);
    // the connector boss on the base's +x face, where the reference cable lands
    const F = G.frameAlong([BOSS.x, BOSS.y, BOSS.z], [1, 0, 0]);
    put("brain.boss", S(G.disc(0, 1.6, 2.0, F, P), { tone: "mid", crease: "lo" }) + S(G.disc(1.6, 2.2, 1.4, F, P), { tone: "mid" }), [["disc", F, 0, 1.6, 2.0], ["disc", F, 1.6, 2.2, 1.4]], [BOSS.x + 1.1, BOSS.y, BOSS.z]);
  }
  {
    // six clear plates on two back posts: a collar under each plate, a cap nut over the top one
    const plan = { x: STACK.cx - STACK.w / 2, y: STACK.cy - STACK.d / 2, w: STACK.w, d: STACK.d, r: STACK.r };
    for (let j = 0; j < STACK.count; j++) {
      const z = R.plateZ(j);
      const top = z + STACK.t;
      const ring = brainSlice(j);
      const etch = path([...ring.map(([x, y]) => [x, y, top])], true) + path([[...ring[0], top], [...ring[ring.length / 2], top]]);
      const holes = R.STACK_POSTS.map(([x, y]) => k.ring(x, y, R.COLLAR_R, top, P, 12)).join("");
      put(`brain.plate${j}`, S(k.slabOf(plan, z, STACK.t, P, 3, 0.3), { tone: "mid", crease: "none", className: "mt-acrylic", inner: L(etch, { tone: "mid" }) + L(holes, { tone: "lo" }) }), [["slab", plan, z, STACK.t, 3]], [STACK.cx, STACK.cy, z + STACK.t / 2]);
      R.STACK_POSTS.forEach(([x, y], n) => {
        const z0 = j ? R.plateZ(j - 1) + STACK.t : zt;
        put(`brain.collar${j}.${n}`, S(k.cylinder(x, y, R.COLLAR_R, z0, z - z0, P, 12), { tone: "mid", crease: "none" }), [["cyl", x, y, R.COLLAR_R, z0, z - z0]], [x, y, (z0 + z) / 2]);
      });
    }
    const top = R.plateZ(STACK.count - 1) + STACK.t;
    R.STACK_POSTS.forEach(([x, y], n) => {
      const hex = round(x, y, 1.9, 6);
      put(`brain.nut${n}`, S(k.extrude(hex, top, 1.2, P, { bevel: 0.25 }), { tone: "mid" }) + S(k.cylinder(x, y, R.POST_R, top + 1.2, 1.0, P, 14, 0.2), { tone: "mid" }), [["ext", hex, top, 1.2], ["cyl", x, y, R.POST_R, top + 1.2, 1.0]], [x, y, top + 1]);
    });
  }
  // the reference cable from the brain base's boss to the console's front lip
  {
    const { REF } = R;
    const r = 0.75;
    const low = r + 0.45;
    const bx = BOSS.x + 2.2;
    const raw = [[bx, BOSS.y, BOSS.z], [bx + 1.6, BOSS.y, BOSS.z], [bx + 4.6, BOSS.y, low], [REF.x, BOSS.y, low], [REF.x, REF.y + 11, low], [REF.x, REF.y + 7, REF.z], [REF.x, REF.y + 3.2, REF.z]];
    routes.push({ name: "refcable", points: G.fillet(raw, 2.6, 8, { P, tube: r }), r });
  }
  return { items, routes, symbols };
}

// one etched axial contour of the brain model: an egg-shaped outline, wider at the occipital (−x) end, with the
// longitudinal fissure notched in at both poles; ring[0] and ring[N/2] are the notch roots
export function brainSlice(j) {
  const { STACK } = R;
  const f = STACK.f[j];
  const N = 32;
  const ring = [];
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * 2 * Math.PI;
    const notch = 1 - 0.2 * (Math.exp(-((phi / 0.16) ** 2)) + Math.exp(-(((phi - 2 * Math.PI) / 0.16) ** 2))) - 0.16 * Math.exp(-(((phi - Math.PI) / 0.16) ** 2));
    const egg = 1 - 0.07 * Math.cos(phi);
    ring.push([STACK.cx + STACK.a * f * notch * Math.cos(phi), STACK.cy + STACK.b * f * egg * Math.sin(phi)]);
  }
  return ring;
}

// the plug: nose collar, knurled grip, boot; built on a frame whose axis points up out of the socket
export function plugSvg(F, lit) {
  const { nose, grip, boot, rNose, rGrip, rBoot0, rBoot1 } = R.PLUG;
  const s1 = nose;
  const s2 = nose + grip;
  const s3 = s2 + boot;
  const bootProfile = [[s2, rBoot0], [s2 + boot * 0.35, (rBoot0 + rBoot1) / 2 + 0.12, 1], [s3, rBoot1]];
  const knurl = G.ribsOf(F, s1 + 0.6, s2 - 0.6, rGrip, 18, P, { fade: [0.1, 0.55], seams: true });
  const parts = [
    S(G.disc(0, s1, rNose, F, P), { tone: lit ? "hi" : "mid", crease: "lo" }),
    S(G.disc(s1, s2, rGrip, F, P), { tone: lit ? "hi" : "mid", crease: "lo", lit, inner: k.fadedSvg(knurl, { tone: "lo" }) }),
    S(G.solidOf(bootProfile, F, P), { tone: lit ? "hi" : "mid", crease: "lo" }),
  ];
  return {
    svg: parts.join(""),
    shapes: [["disc", F, 0, s1, rNose], ["disc", F, s1, s2, rGrip], ["solid", F, bootProfile]],
  };
}

// the cord's drawing for one route: one piece (it is always the top layer)
export function cordSvg(points) {
  return tubePieces(points, R.CORD_R, P, { maxLength: 1000 }).map((piece) => tubeSvg(piece, { tone: "hi" })).join("");
}
export function cablePieces(route) {
  return tubePieces(route.points, route.r, P, { maxLength: 14 });
}
