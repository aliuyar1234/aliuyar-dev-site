// Fig 19 parts, back to front. compose(pose) returns the drawn items in painter's order, each with the
// shapes the audit records (thunks over kit/audit.mjs, so the page never loads the audit).
import * as k from "../kit/iso-kit.mjs";
import * as G0 from "../kit/lathe.mjs";
import * as S from "./scene.mjs";
import * as M from "./moving.mjs";
import { TABLE_TOP as TT, TAB_H, Q, CHANNEL, CHUTE, ECC, STEPS, GRAIN_N, ramAt, yieldAt, shoeAngle, tabletAt } from "./model.mjs";

const { P } = S;
// facet counts by on-screen radius: about one facet per 1.5 px of rim, so the static markup stays inside budget
const N = (r) => (r < 2 ? 10 : Math.max(12, Math.min(40, 4 * Math.round((r * S.P.scale) / 4.2))));
const G = {
  ...G0,
  disc: (s0, s1, r, F, P_, o = {}) => G0.disc(s0, s1, r, F, P_, { steps: N(r), ...o }),
  ringBand: (s0, s1, a, b, F, P_, o = {}) => G0.ringBand(s0, s1, a, b, F, P_, { steps: N(b), ...o }),
  lathe: (m, F, P_, o = {}) => G0.lathe(m, F, P_, { steps: N(Math.max(...m.map(([, r]) => r))), ...o }),
  solidOf: (m, F, P_, o = {}) => G0.solidOf(m, F, P_, { steps: N(Math.max(...m.map(([, r]) => r))), ...o }),
  sphereOf: (c, r, P_, o = {}) => G0.sphereOf(c, r, P_, { steps: N(r), ...o }),
};
const at = (p) => k.iso(p, P);
// Compact solids. A shade tone or a fill made of facets that share edges is traced as its union (the edges used once),
// holes wound the other way so the default fill rule keeps them open; the kit's edge, crease and bevel segments are
// chained end to end. Anything that is not a clean edge-sharing set is left exactly as it was.
const ptsOf = (body) => {
  const n = body.match(/-?\d*\.?\d+/g) || [];
  const out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push(`${n[i]} ${n[i + 1]}`);
  return out;
};
const xyOf = (p) => p.split(" ").map(Number);
const areaOf = (loop) => loop.map(xyOf).reduce((sum, a, i, xy) => sum + a[0] * xy[(i + 1) % xy.length][1] - xy[(i + 1) % xy.length][0] * a[1], 0) / 2;
const inside = ([x, y], loop) => {
  let hit = false;
  const xy = loop.map(xyOf);
  for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) if (xy[i][1] > y !== xy[j][1] > y && x < ((xy[j][0] - xy[i][0]) * (y - xy[i][1])) / (xy[j][1] - xy[i][1]) + xy[i][0]) hit = !hit;
  return hit;
};
function unionOf(d) {
  if (!d || d.replace(/M[^MZ]*Z/g, "").trim()) return d;
  const polys = [...d.matchAll(/M([^MZ]*)Z/g)].map(([, body]) => ptsOf(body)).map((ring) => ring.filter((p, i) => p !== ring[(i + 1) % ring.length]));
  if (polys.length < 2) return d;
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const uses = new Map();
  for (const r of polys) r.forEach((a, i) => uses.set(key(a, r[(i + 1) % r.length]), (uses.get(key(a, r[(i + 1) % r.length])) || 0) + 1));
  const adj = new Map();
  const link = (a, b) => (adj.get(a) || adj.set(a, []).get(a)).push(b);
  for (const r of polys)
    r.forEach((a, i) => {
      const b = r[(i + 1) % r.length];
      if (uses.get(key(a, b)) === 1) link(a, b), link(b, a);
    });
  if (!adj.size || [...adj.values()].some((list) => list.length !== 2)) return d;
  const seen = new Set();
  let loops = [];
  for (const first of adj.keys()) {
    if (seen.has(first)) continue;
    const loop = [first];
    seen.add(first);
    let [prev, cur] = [first, adj.get(first)[0]];
    while (cur !== first) {
      if (seen.has(cur)) return d;
      loop.push(cur);
      seen.add(cur);
      const [n0, n1] = adj.get(cur);
      [prev, cur] = [cur, n0 === prev ? n1 : n0];
    }
    const xy = loop.map(xyOf);
    loops.push(loop.filter((_, i) => {
      const [a, b, c] = [xy[(i + xy.length - 1) % xy.length], xy[i], xy[(i + 1) % xy.length]];
      return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-6;
    }));
  }
  // the union must cover what the facets covered: same total area, holes counted negative
  const depth = loops.map((loop, i) => loops.filter((other, j) => j !== i && inside(xyOf(loop[0]), other)).length);
  loops = loops.map((loop, i) => ((areaOf(loop) > 0) === (depth[i] % 2 === 0) ? loop : [...loop].reverse()));
  const covered = polys.reduce((sum, r) => sum + Math.abs(areaOf(r)), 0);
  const traced = loops.reduce((sum, loop) => sum + Math.abs(areaOf(loop)) * (depth[loops.indexOf(loop)] % 2 ? -1 : 1), 0);
  if (Math.abs(covered - traced) > 0.02 * covered + 0.5) return d;
  return loops.map((loop) => `M${loop.join("L")}Z`).join("");
}
function chainOf(d) {
  if (!d || /Z/.test(d)) return d;
  const runs = [...d.matchAll(/M([^M]*)/g)].map(([, body]) => ptsOf(body)).filter((r) => r.length > 1);
  const starts = new Map();
  const ends = new Map();
  runs.forEach((r, i) => {
    (starts.get(r[0]) || starts.set(r[0], []).get(r[0])).push(i);
    (ends.get(r[r.length - 1]) || ends.set(r[r.length - 1], []).get(r[r.length - 1])).push(i);
  });
  const used = new Set();
  const take = (map, p) => (map.get(p) || []).find((i) => !used.has(i));
  const out = [];
  for (let i = 0; i < runs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    let line = [...runs[i]];
    for (let next; (next = take(starts, line[line.length - 1])) !== undefined; ) used.add(next), (line = line.concat(runs[next].slice(1)));
    for (let prev; (prev = take(ends, line[0])) !== undefined; ) used.add(prev), (line = runs[prev].slice(0, -1).concat(line));
    out.push(`M${line.join("L")}`);
  }
  return out.join("");
}
const compact = (paths) => ({ ...paths, fill: unionOf(paths.fill), shades: paths.shades.map(unionOf), outline: chainOf(paths.outline), crease: chainOf(paths.crease), bevel: chainOf(paths.bevel) });
const sol = (paths, style) => k.solidSvg(compact(paths), style);
// a part live.js redraws: same compaction for the static markup, the page rewrites its d attributes each frame
const live = (paths, style) => M.liveSolid(compact(paths), style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const FX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (o) => G.frameOf(o, [0, 1, 0], [0, 0, 1], [1, 0, 0]);
const FZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const tr = (offset) => k.translateAlong(P, offset);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 0, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps && steps <= 8 ? steps : N(r), bevel);
const screwsAt = (pts, z) => D(pts.map(([x, y]) => at([x, y, z])), { size: 0.45 });
// a moving part's swept volume at speed: an empty placeholder in its painter's slot, filled by live.js from
// moving.mjs (ghostsOf) on mount, so the static markup does not carry shapes nobody sees without the script
const ghostSvg = (name, attrs = "") => `<path class="rdd-ghost" data-ghost="${name}"${attrs} d="" style="opacity:0"/>`;

export const REST = { s: 0, screen: 0, anchor: 0, slide: 0, knob: 60, tablets: [], landed: 0, sample: 0, plunger: 0, value: 0, limits: null };

// 24 tablet places in the tray, filled in order
export const TRAY_SLOTS = (() => {
  const out = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) out.push([S.TRAY.x + 5.2 + col * 4.7 + (row % 2) * 2.2, S.TRAY.y + 6.4 + row * 5.6 + ((col * 7) % 3) * 0.4]);
  return out.sort((a, b) => Math.hypot(a[0] - S.TRAY.x - 12, a[1] - 16) - Math.hypot(b[0] - S.TRAY.x - 12, b[1] - 16));
})();
// granules on the hopper fill: a sunflower spiral, in a fixed order so p picks the first p · n as poisoned
export const GRAINS = (() => {
  const out = [];
  const n = GRAIN_N;
  const R = 10.2; // the fill's radius at z 85 is 12.0
  for (let i = 0; i < n; i++) {
    const r = R * Math.sqrt((i + 0.5) / n);
    const a = i * 2.39996;
    out.push([S.HOP.c[0] + r * Math.cos(a), S.HOP.c[1] + r * Math.sin(a)]);
  }
  return out;
})();
export const HELD = [[2.4, 3.4]]; // where held grains lie on the screen, offsets from the hopper axis; D1 never holds more than one (model heldGrains)

export function compose(pose = REST) {
  const items = [];
  const put = (name, svg, shapes = [], extra = {}) => items.push({ name, svg, shapes, ...extra });
  // repeated parts are drawn once in <defs> and placed with <use>
  const defs = {};
  const def = (id, svg) => ((defs[id] ??= svg), id);
  const use = (id, off = null, attrs = "") => `<use href="#rdd-${id}"${off ? ` transform="${tr(off)}"` : ""}${attrs}/>`;
  const sh = (fn, meta = {}) => (A) => fn(A, meta);
  const sSlab = (plan, z, h, meta = {}) => (A) => A.slab({ r: 0, ...plan }, z, h, meta, 3);
  const sCyl = (x, y, r, z, h, meta = {}) => (A) => A.cylinder(x, y, r, z, h, meta);
  const sDisc = (F, s0, s1, r, meta = {}) => (A) => A.disc(F, s0, s1, r, meta);
  const sRing = (F, s0, s1, a, b, meta = {}) => (A) => A.ring(F, s0, s1, a, b, meta);
  const moved = (thunk, off) => (A) => A.moved(thunk(A), off);
  const psi = 2 * Math.PI * pose.s;
  const phase = pose.s >= STEPS ? 0 : pose.s - Math.floor(pose.s);

  // ============================================================ bench
  {
    const B = S.BENCH;
    const z0 = -S.BENCH_H - S.FOOT_H;
    const feet = [];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(B, 12)).slice(1)) {
      feet.push(use(def("foot", sol(cyl(0, 0, 7, z0, 1.6), { tone: "lo" }) + sol(cyl(0, 0, 5.4, z0 + 1.6, S.FOOT_H - 1.6), { tone: "mid" })), [x, y, 0]));
      shapes.push(sCyl(x, y, 7, z0, S.FOOT_H, { name: "stand.foot" }));
    }
    put("stand.feet", `<path class="iso-halo" d="${k.haloOf(B, z0, S.BENCH_H, P)}"/>` + feet.join(""), shapes);
    const screws = k.corners(B, 10);
    put(
      "stand.bench",
      sol(slab(B, -S.BENCH_H, S.BENCH_H, 8, 1.6), { tone: "mid" }) + L(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "lo" }) + L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) + screwsAt(screws, 0),
      [sSlab(B, -S.BENCH_H, S.BENCH_H, { name: "stand.bench" })],
    );
    // label plate on the front face: the maker's mark and three rule lines
    const y = B.y + B.d;
    const plate = { x: -54, y, w: 52, d: 0.8, r: 0.3 };
    const pz = -9.2;
    const ph = 7.4;
    const face = y + 0.8;
    const fp = (x, z) => at([x, face, z]);
    const rules = [24, 19, 12].map((w, i) => k.pathOf([fp(plate.x + 19.6, pz + ph - 2 - i * 1.8), fp(plate.x + 19.6 + w, pz + ph - 2 - i * 1.8)])).join("");
    const inset = k.pathOf([fp(plate.x + 1.2, pz + 1.2), fp(plate.x + plate.w - 1.2, pz + 1.2), fp(plate.x + plate.w - 1.2, pz + ph - 1.2), fp(plate.x + 1.2, pz + ph - 1.2)], true);
    const divider = k.pathOf([fp(plate.x + 17.4, pz + 1.2), fp(plate.x + 17.4, pz + ph - 1.2)]);
    const mark = k.faceTextSvg(k.sideMatrix([plate.x + 10.2, face], pz + ph / 2 - 1.1, P, "left"), "AU-19", { size: 2.7, tone: "mid", anchor: "middle" });
    put("stand.label", sol(slab(plate, pz, ph, 2), { tone: "lo", crease: "none" }) + L(inset + divider, { tone: "faint" }) + mark + L(rules, { tone: "lo", free: true }) + D([fp(plate.x + 2.8, pz + ph / 2), fp(plate.x + plate.w - 2.8, pz + ph / 2)], { size: 0.45 }), [sSlab(plate, pz, ph, { name: "stand.label" })]);
    // ruler strip along the front edge
    const strip = { x: 6, y: 44, w: 88, d: 6, r: 1 };
    const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    put("stand.strip", sol(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + screwsAt([[strip.x + 2, strip.y + 3], [strip.x + strip.w - 2, strip.y + 3]], 0.6), [sSlab(strip, 0, 0.6, { name: "stand.strip" })]);
  }

  // ============================================================ tester: dial gauge over an anvil (back right)
  {
    const T = S.TESTER;
    const top = 9;
    const screws = k.corners(T, 3.4);
    put("tester.base", sol(slab(T, 0, top, 4, 0.8), { tone: "mid" }) + L(k.planOutline(k.insetPlan(T, 2.4), top, P, 3), { tone: "faint" }) + screwsAt(screws, top), [sSlab(T, 0, top, { name: "tester.base" })]);
    // trigger lamp on the front face
    const lampF = FY([T.x + T.w - 7, T.y + T.d, 4.6]);
    const lamp = sol(G.disc(0, 1.2, 2.4, lampF, P), { tone: "mid" }) + `<path class="rdd-lens" data-lamp="trigger" d="${G.circleOf(lampF, 1.2, 1.5, P)}"/>`;
    put("tester.lamp", lamp, [sDisc(lampF, 0, 1.2, 2.4, { name: "tester.lamp", owner: "tester" })]);
    const [ax, ay] = S.DIAL_AT;
    put("tester.anvil", sol(cyl(ax, ay, 5, top, 1.6, 24), { tone: "mid", crease: "lo" }) + L(k.ring(ax, ay, 3.8, top + 1.6, P, 28), { tone: "faint" }), [sCyl(ax, ay, 5, top, 1.6, { name: "tester.anvil" })]);
    put("tester.sample", `<g data-part="sample" style="opacity:${pose.sample}">${sol(cyl(ax, ay, 3, top + 1.6, TAB_H, 20), { tone: "hi" })}${L(k.lineOnTop([ax - 2.4, ay], [ax + 2.4, ay], top + 1.6 + TAB_H, P), { tone: "faint" })}</g>`, pose.sample > 0 ? [sCyl(ax, ay, 3, top + 1.6, TAB_H, { name: "tester.sample" })] : []);
    const post = [ax, T.y + 3.2];
    const [z0, z1] = S.DIAL_Z;
    const pz = z1 - 5; // the arm sits on the post's top
    put(
      "tester.post",
      sol(cyl(post[0], post[1], 3, top, 2.4), { tone: "mid" }) + sol(cyl(post[0], post[1], 2.4, top + 2.4, pz - top - 2.4), { tone: "mid", crease: "none" }),
      [sCyl(post[0], post[1], 3, top, 2.4, { name: "tester.post", owner: "tester" }), sCyl(post[0], post[1], 2.4, top + 2.4, pz - top - 2.4, { name: "tester.post#2", owner: "tester" })],
    );
    const arm = { x: ax - 2.7, y: post[1] - 3, w: 5.4, d: ay - S.DIAL_R - post[1] + 3.6, r: 1 };
    put(
      "tester.arm",
      sol(slab(arm, pz, 4, 3, 0.4), { tone: "mid" }) + sol(cyl(post[0], post[1], 1.8, pz + 4, 1.4), { tone: "mid", crease: "lo" }) + L(k.knurl(post[0], post[1], 1.8, pz + 4.2, pz + 5.2, 14, P), { tone: "lo" }),
      [sSlab(arm, pz, 4, { name: "tester.arm", owner: "tester" }), sCyl(post[0], post[1], 1.8, pz + 4, 1.4, { name: "tester.clamp", owner: "tester" })],
    );
    // plunger out of the stem: its tip comes down PLUNGE onto the sample
    const PF = G.frameOf([ax, ay, z0 - 4], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
    const rest = z0 - 4 - (top + 1.6 + TAB_H + S.PLUNGE + 1.2);
    const stroke = S.PLUNGE;
    const rod = G.rodOut(PF, 0, rest, 1.1, P, { stroke });
    const tipF = FZ([ax, ay, z0 - 4 - rest - 1.2]);
    const down = -stroke * pose.plunger;
    put(
      "tester.plunger",
      `<g data-part="plunger" transform="${tr([0, 0, down])}"><clipPath id="rdd-plunger"><path data-hold="" d="${rod.clip}"${down ? ` transform="translate(0 ${(-k.axisVector(P, [0, 0, down])[1]).toFixed(2)})"` : ""}/></clipPath><g clip-path="url(#rdd-plunger)">${sol(rod.paths, { tone: "mid", crease: "none" })}</g>${sol(G.disc(0, 1.2, 1.8, tipF, P), { tone: "mid" })}</g>`,
      [sDisc(PF, 0, rest - down, 1.1, { name: "tester.plunger", owner: "tester" }), moved(sDisc(tipF, 0, 1.2, 1.8, { name: "tester.tip", owner: "tester" }), [0, 0, down])],
      { move: [0, 0, down] },
    );
    put("tester.stem", sol(cyl(ax, ay, 2.3, z0 - 4, 4), { tone: "mid" }), [sCyl(ax, ay, 2.3, z0 - 4, 4, { name: "tester.stem", owner: "tester" })]);
    // the puck: knurled bezel, 0 to 4 ×10⁻³ over 300°, limit hands and the needle
    const R = S.DIAL_R;
    const ticks = k.radialTicks(ax, ay, R - 3, 40, 10, z1, [1.2, 2.6], P, (-150 * Math.PI) / 180, (300 * Math.PI) / 180);
    const lug = { x: ax - 2, y: ay - R - 1.6, w: 4, d: 2.2, r: 0.6 };
    const hands = pose.limits || [0, 0];
    put(
      "tester.dial",
      sol(slab(lug, z1 - 5, 4, 2), { tone: "mid" }) +
        sol(k.cylinder(ax, ay, R, z0, z1 - z0, P, 32, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideArc(ax, ay, R, z1 - 2.6, P, 40), { tone: "faint" }) }) +
        L(k.knurl(ax, ay, R, z1 - 2.6, z1, 52, P, 0.3), { tone: "lo" }) +
        L(k.ring(ax, ay, R - 1.6, z1, P, 64), { tone: "lo" }) +
        L(ticks.minor, { tone: "lo" }) +
        L(ticks.major, { tone: "mid" }) +
        `<g data-part="limits" style="opacity:${pose.limits ? 1 : 0}"><path class="rdd-hand" data-hand="lo" d="${M.limitOf(hands[0])}"/><path class="rdd-hand" data-hand="hi" d="${M.limitOf(hands[1])}"/></g>` +
        L(M.needleOf(pose.value), { tone: "hi", free: "start", className: "rdd-needle" }).replace("<path", '<path data-part="needle"') +
        L(k.ring(ax, ay, 1.4, z1 + 0.2, P, 16), { tone: "mid" }) +
        D([at([ax, ay, z1 + 0.2])], { size: 0.5, tone: "hi" }),
      [sSlab(lug, z1 - 5, 4, { name: "tester.lug", owner: "tester" }), sCyl(ax, ay, R, z0, z1 - z0, { name: "tester.dial", owner: "tester" })],
    );
  }

  // ============================================================ console: threat slide and poison-fraction selector (front left)
  {
    const C = S.CONSOLE;
    const z = S.CON_H;
    // the front faces: a screwed service panel on +y, two screws on +x
    const fy = (x, zz) => at([x, C.y + C.d, zz]);
    const fxx = (y, zz) => at([C.x + C.w, y, zz]);
    const pan = [C.x + 6, C.x + C.w - 6, 3, z - 3.4];
    const front =
      L(k.pathOf([fy(pan[0], pan[2]), fy(pan[1], pan[2]), fy(pan[1], pan[3]), fy(pan[0], pan[3])], true), { tone: "faint" }) +
      D([fy(pan[0] + 1.6, (pan[2] + pan[3]) / 2), fy(pan[1] - 1.6, (pan[2] + pan[3]) / 2), fxx(C.y + 5, z / 2), fxx(C.y + C.d - 5, z / 2)], { size: 0.45 });
    const screws = k.corners(C, 3.2);
    const panel = k.insetPlan(C, 2.2);
    const slot = { x: S.SLIDE.x[0], y: S.SLIDE.y - 1.7, w: S.SLIDE.x[1] - S.SLIDE.x[0], d: 3.4, r: 1.7 };
    const marks = S.SLIDE.at.map((x) => k.lineOnTop([x, slot.y - 0.4], [x, slot.y - 2.2], z, P)).join("");
    const [kx, ky] = S.KNOB;
    const plateR = 8.2;
    const detents = [-60, 0, 60].map((a) => {
      const r = (a * Math.PI) / 180;
      return k.lineOnTop([kx + Math.sin(r) * (plateR - 2.2), ky - Math.cos(r) * (plateR - 2.2)], [kx + Math.sin(r) * plateR, ky - Math.cos(r) * plateR], z + 0.6, P);
    });
    put(
      "console.box",
      sol(slab(C, 0, z, 4, 0.8), { tone: "mid" }) + L(k.planOutline(panel, z, P, 3), { tone: "faint" }) + screwsAt(screws, z) + `<path class="rdd-void" d="${k.onTop(k.roundedPlan(slot, 4), z, P, true)}"/>` + L(marks, { tone: "mid" }) + front,
      [sSlab(C, 0, z, { name: "console.box" })],
    );
    put(
      "console.plate",
      sol(cyl(kx, ky, plateR, z, 0.6, 40), { tone: "lo", crease: "none" }) + L(detents.join(""), { tone: "mid" }) + L(k.ring(kx, ky, plateR - 2.2, z + 0.6, P, 40), { tone: "faint" }),
      [sCyl(kx, ky, plateR, z, 0.6, { name: "console.plate" })],
    );
    put(
      "console.knob",
      sol(cyl(kx, ky, 5, z + 0.6, 4.4, 36), { tone: "mid", crease: "lo" }) + L(k.knurl(kx, ky, 5, z + 0.6, z + 5, 30, P), { tone: "lo" }) + L(k.ring(kx, ky, 3.8, z + 5, P, 28), { tone: "faint" }) + L(M.pointerOf(pose.knob), { tone: "hi", free: "end" }).replace("<path", '<path data-part="pointer"'),
      [sCyl(kx, ky, 5, z + 0.6, 4.4, { name: "console.knob" })],
    );
    const sx = S.SLIDE.at[0] + (S.SLIDE.at[1] - S.SLIDE.at[0]) * pose.slide;
    const block = { x: S.SLIDE.at[0] - 2.4, y: S.SLIDE.y - 2.4, w: 4.8, d: 4.8, r: 0.8 };
    const grip = [-1.2, 0, 1.2].map((d) => k.lineOnTop([S.SLIDE.at[0] + d, block.y], [S.SLIDE.at[0] + d, block.y + block.d], z + 3.4, P)).join("");
    const off = [sx - S.SLIDE.at[0], 0, 0];
    put("console.slide", `<g data-part="slide" transform="${tr(off)}">${sol(slab(block, z, 3.4, 3, 0.4), { tone: "mid", crease: "lo" })}${L(grip, { tone: "lo" })}</g>`, [moved(sSlab(block, z, 3.4, { name: "console.slide" }), off)], { move: off });
  }

  // ============================================================ press frame
  {
    const PL = S.PLINTH;
    const bolts = [[PL.x + 4.6, PL.y + 4.6], [PL.x + PL.w - 4.6, PL.y + 4.6], [PL.x + 3.6, PL.y + PL.d - 3.4], [PL.x + PL.w - 3.6, PL.y + PL.d - 3.4]];
    put(
      "press.plinth",
      sol(slab(PL, 0, 4, 4, 0.6), { tone: "mid" }) + bolts.map(([x, y]) => use(def("bolt", sol(cyl(0, 0, 2.2, 4, 1.6, 6), { tone: "mid" })), [x, y, 0])).join(""),
      [sSlab(PL, 0, 4, { name: "press.plinth" }), ...bolts.map(([x, y], i) => sCyl(x, y, 2.2, 4, 1.6, { name: `press.bolt${i}` }))],
    );
    const CO = S.COLUMN;
    // the cast foot of the column: a flange on the plinth, flush against the housing's back face
    const foot = { x: CO.x - 3, y: CO.y - 3, w: CO.w + 6, d: CO.d + 3, r: 2 };
    const footBolts = [[CO.x + CO.w + 1.5, CO.y + 2], [CO.x + CO.w + 1.5, CO.y + CO.d - 2.5]];
    put(
      "press.colfoot",
      sol(slab(foot, 4, 3, 2), { tone: "mid" }),
      [sSlab(foot, 4, 3, { name: "press.colfoot" })],
    );
    const cover = { x: CO.x + CO.w, y: CO.y + 4, w: 0.8, d: CO.d - 8, r: 0.3 };
    const cz = [48, 80];
    const fpx = (y, z) => at([cover.x + 0.8, y, z]);
    const coverBolts = [[cover.y + 2, cz[0] + 2], [cover.y + cover.d - 2, cz[0] + 2], [cover.y + 2, cz[1] - 2], [cover.y + cover.d - 2, cz[1] - 2]];
    const boltRing = (F) => G.circleOf(F, 0, 0.95, P, 12);
    // oil cup on the column's side, above the cover
    const OF = FX([CO.x + CO.w, CO.y + CO.d / 2, 88]);
    put(
      "press.column",
      sol(slab(CO, 7, 97, 4, 0.8), { tone: "mid" }) +
        sol(slab(cover, cz[0], cz[1] - cz[0], 2), { tone: "mid", crease: "none" }) +
        L(coverBolts.map(([y, z]) => boltRing(FX([cover.x + 0.8, y, z]))).join(""), { tone: "lo" }) +
        D(coverBolts.map(([y, z]) => fpx(y, z)), { size: 0.45 }) +
        sol(G.disc(0, 1.6, 2, OF, P, { steps: 12 }), { tone: "mid" }) +
        D([at(G.pointOf(OF, 1.6, 0, 0))], { size: 0.45 }),
      [sSlab(CO, 7, 97, { name: "press.column" }), sSlab(cover, cz[0], cz[1] - cz[0], { name: "press.colcover" }), sDisc(OF, 0, 1.6, 2, { name: "press.oilcup", owner: "press" })],
    );
    // the foot's bolts stand in front of the column's side
    put("press.footbolts", footBolts.map(([x, y]) => sol(cyl(x, y, 1.2, 7, 1, 6), { tone: "mid" })).join(""), footBolts.map(([x, y], i) => sCyl(x, y, 1.2, 7, 1, { name: `press.footbolt${i}` })));
    const HO = S.HOUSING;
    const plate = { x: HO.x + HO.w, y: HO.y + 6, w: 0.8, d: HO.d - 14, r: 0.3 };
    const pz = [8, 23];
    const fx = (y, z) => at([plate.x + 0.8, y, z]);
    // fill and ejection adjusters on the front face: knurled wheels with a ring of ticks
    const wheels = [-14, 13].map((x) => {
      const F = FY([0, HO.y + HO.d, 15]);
      const ribs = G.ribsOf(F, 1.6, 4.8, 5.6, 22, P, { fade: [0.1, 0.55], seams: true });
      const ticks = G.spokesOf(F, 0.05, 6.9, 7.9, 20, P);
      const major = G.spokesOf(F, 0.05, 6.3, 7.9, 4, P);
      const Fx = FY([x, HO.y + HO.d, 15]);
      return {
        svg: use(def("adjuster",
          L(G.circleOf(F, 0.05, 7.9, P), { tone: "faint" }) +
          L(ticks, { tone: "lo" }) +
          L(major, { tone: "mid" }) +
          sol(G.disc(0, 1.6, 3.6, F, P), { tone: "mid" }) +
          sol(G.disc(1.6, 4.8, 5.6, F, P), { tone: "mid", crease: "lo" }) +
          k.fadedSvg(ribs, { tone: "lo" }) +
          sol(G.disc(4.8, 6, 2.2, F, P), { tone: "mid" }) +
          L(k.pathOf([at(G.pointOf(F, 4.8, 2.6, Math.PI / 2)), at(G.pointOf(F, 4.8, 5.0, Math.PI / 2))]), { tone: "mid" })), [x, 0, 0]),
        shapes: [sDisc(Fx, 0, 1.6, 3.6, { name: `press.adjboss${x}`, owner: "press" }), sDisc(Fx, 1.6, 4.8, 5.6, { name: `press.adj${x}`, owner: "press" }), sDisc(Fx, 4.8, 6, 2.2, { name: `press.adjcap${x}`, owner: "press" })],
      };
    });
    put(
      "press.housing",
      sol(slab(HO, 4, 30, 4, 0.8), { tone: "mid" }) + sol(slab(plate, pz[0], pz[1] - pz[0], 2), { tone: "mid", crease: "none" }) + D([fx(plate.y + 2, pz[0] + 2), fx(plate.y + plate.d - 2, pz[0] + 2), fx(plate.y + 2, pz[1] - 2), fx(plate.y + plate.d - 2, pz[1] - 2)], { size: 0.45 }),
      [sSlab(HO, 4, 30, { name: "press.housing" }), sSlab(plate, pz[0], pz[1] - pz[0], { name: "press.cover" })],
    );
    wheels.forEach((w, i) => put(`press.adjuster${i}`, w.svg, w.shapes));
    // die table, the die, its lock screws and the take-off channel
    const TA = S.TABLE;
    const die = [
      L(k.ring(0, 0, 7.6, TT, P, 40), { tone: "mid" }),
      L(k.ring(0, 0, 6.6, TT, P, 40), { tone: "faint" }),
      `<path class="rdd-void" d="${k.ring(0, 0, 3.05, TT, P, 28)}"/>`,
    ].join("");
    const lock = [[-5.2, 5.2], [5.2, -5.2]];
    put(
      "press.table",
      sol(slab(TA, 34, 6, 4, 0.8), { tone: "mid" }) + L(k.planOutline(k.insetPlan(TA, 3), TT, P, 3), { tone: "faint" }) + die + L(lock.map(([x, y]) => k.ring(x, y, 1.1, TT, P, 12)).join(""), { tone: "lo" }) + screwsAt(lock, TT),
      [sSlab(TA, 34, 6, { name: "press.table", owner: "press" })],
    );
  }

  {
    // the chute's gusset against the table edge, under everything that crosses that edge
    const f = CHUTE.from;
    const a = G.unit3(G.sub3(CHUTE.to, f));
    const gF = G.frameOf([0, f[1] - 3.4, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const edge = S.TABLE.x + S.TABLE.w;
    const under = (x) => f[2] + ((x - f[0]) * a[2]) / a[0] - 1 / Math.cos(Math.atan2(-a[2], a[0])) + 0.3; // just inside the floor's underside
    const gusset = [[edge, f[2] - 12], [edge, under(edge + 0.8)], [edge + 8.4, under(edge + 8.4)]];
    const mix = (w) => [0, 1].map((j) => gusset.reduce((sum, p, i) => sum + p[j] * w[i], 0));
    const screws = [mix([0.22, 0.56, 0.22]), mix([0.6, 0.28, 0.12])].map(([x, z]) => [x, f[1] + 3.4, z]);
    put(
      "chute.gusset",
      sol(G.prismOf(gF, gusset, 0, 6.8, P), { tone: "mid" }) + L(screws.map((p) => G.circleOf(FY(p), 0, 0.9, P, 12)).join(""), { tone: "lo" }) + D(screws.map(at), { size: 0.45 }),
      [(A) => A.prism(gF, gusset, 0, 6.8, { name: "chute.gusset", owner: "chute" })],
    );
  }

  // ============================================================ output, low parts: tray, the chute's floor and back wall
  // drawn before the feed so a tablet crossing the table edge lands on the chute, not under it
  const CH = (() => {
    const f = CHUTE.from;
    const a = G.unit3(G.sub3(CHUTE.to, f));
    const v = G.unit3(G.cross3(a, [0, 1, 0])); // up out of the floor
    const half = 4.6;
    return {
      F: G.frameOf(f, a, [0, 1, 0], v),
      len: G.len3(G.sub3(CHUTE.to, f)),
      TF: G.frameOf([0, 0, 0], v, [0, 1, 0], a),
      floor: [[-half, -1], [half, -1], [half, 0], [-half, 0]],
      wallB: [[-half, 0], [-half + 1, 0], [-half + 1, 3], [-half, 3]],
      wallF: [[half - 1, 0], [half, 0], [half, 3], [half - 1, 3]],
      lipB: [[-half - 1.6, 2.4], [-half, 2.4], [-half, 3], [-half - 1.6, 3]],
      lipF: [[half, 2.4], [half + 1.6, 2.4], [half + 1.6, 3], [half, 3]],
    };
  })();
  const chutePart = (name, poly) => [sol(G.prismOf(CH.F, poly, 0, CH.len, P), { tone: "mid" }), (A) => A.prism(CH.F, poly, 0, CH.len, { name, owner: "chute" })];
  const TR = S.TRAY;
  const trayWall = { back: { x: TR.x, y: TR.y, w: TR.w, d: 1.2, r: 0.4 }, left: { x: TR.x, y: TR.y, w: 1.2, d: TR.d, r: 0.4 }, front: { x: TR.x, y: TR.y + TR.d - 1.2, w: TR.w, d: 1.2, r: 0.4 }, right: { x: TR.x + TR.w - 1.2, y: TR.y, w: 1.2, d: TR.d, r: 0.4 } };
  const wallPair = (name, a, b) => put(name, sol(slab(trayWall[a], 1.2, 4.8, 2, 0.3), { tone: "mid" }) + sol(slab(trayWall[b], 1.2, 4.8, 2, 0.3), { tone: "mid" }), [sSlab(trayWall[a], 1.2, 4.8, { name: `tray.${a}`, owner: "tray" }), sSlab(trayWall[b], 1.2, 4.8, { name: `tray.${b}`, owner: "tray" })]);
  {
    put("tray.floor", sol(slab(TR, 0, 1.2, 4), { tone: "lo" }), [sSlab(TR, 0, 1.2, { name: "tray.floor", owner: "tray" })]);
    wallPair("tray.back", "back", "left");
    const shown = Math.round((TRAY_SLOTS.length * Math.min(pose.landed, STEPS)) / STEPS);
    const id = def("traytab", sol(cyl(0, 0, 2, 1.2, 1.2), { tone: "hi" }));
    const tabs = TRAY_SLOTS.map(([x, y], i) => use(id, [x, y, 0], ` data-tray="${i}" style="opacity:${i < shown ? 1 : 0}"`)).join("");
    put("tray.tablets", tabs, TRAY_SLOTS.filter((_, i) => i < shown).map(([x, y], i) => sCyl(x, y, 2, 1.2, 1.2, { name: `tray.tab${i}`, owner: "tray" })));
    const [floorSvg, floorShape] = chutePart("chute.floor", CH.floor);
    const [backSvg, backShape] = chutePart("chute.wallB", CH.wallB);
    const [lipB, lipBShape] = chutePart("chute.lipB", CH.lipB);
    put("chute.back", floorSvg + backSvg + lipB, [floorShape, backShape, lipBShape]);
  }

  // ============================================================ feed: hopper post, swing arm and shoe, hopper, screen
  // the take-off guide: two rails on the table that run on as the chute's walls
  const backWall = { x: CHANNEL.x0, y: CHANNEL.y - 4.6, w: CHANNEL.x1 - CHANNEL.x0, d: 1, r: 0.3 };
  const frontWall = { x: CHANNEL.x0, y: CHANNEL.y + 3.6, w: CHANNEL.x1 - CHANNEL.x0, d: 1, r: 0.3 };
  {
    const alpha = shoeAngle(phase);
    const shoe = M.shoeOf(alpha);
    put("feed.shoe", live(shoe.paths, { tone: "mid", crease: "lo", name: "shoe" }) + `<path class="rdd-void" data-live="mouth" d="${shoe.mouthD}"/>`, [(A) => A.extruded(shoe.body, TT, M.SHOE.h, { name: "feed.shoe", owner: "feed" })]);
    put("feed.arm", live(shoe.armPaths, { tone: "mid", name: "arm" }), [(A) => A.extruded(shoe.arm, TT + 1, 3, { name: "feed.arm", owner: "feed" })]);
    put("feed.ghost", ghostSvg("shoe"));
  }
  // tablets in flight: up out of the die, pushed along the channel, down the chute
  const flight = (where) => {
    const list = [];
    for (const k0 of pose.tablets) {
      const t = tabletAt(k0, pose.s);
      if (t && t.where === where) list.push(t.at);
    }
    return list;
  };
  const tabId = def("tab", sol(cyl(0, 0, 3, -TAB_H / 2, TAB_H), { tone: "hi" }) + L(k.lineOnTop([-2.4, 0], [2.4, 0], TAB_H / 2, P), { tone: "faint" }));
  {
    // the tablet rising out of the die: below the table top it shows only through the bore (the punch's clip)
    const [p] = flight("die");
    const foot = p ? Math.max(p[2] - TAB_H / 2, TT) : 0;
    const head = p ? p[2] + TAB_H / 2 : 0;
    put("feed.dietab", `<g clip-path="url(#rdd-die)"><g data-tab="die" data-i="0" transform="${p ? tr(p) : ""}" style="opacity:${p ? 1 : 0}">${use(tabId)}</g></g>`, p && head > TT + 0.05 ? [sCyl(0, 0, 3, foot, head - foot, { name: "tablet.die", owner: "press" })] : []);
  }
  put("feed.backwall", sol(slab(backWall, TT, 1.8, 3, 0.2), { tone: "mid" }), [sSlab(backWall, TT, 1.8, { name: "feed.backwall" })]);
  {
    const tablet = use(tabId);
    const here = flight("table");
    const svg = [0, 1, 2].map((i) => `<g data-tab="table" data-i="${i}" transform="${here[i] ? tr(here[i]) : ""}" style="opacity:${here[i] ? 1 : 0}">${tablet}</g>`).join("");
    put("feed.tablets", svg, here.map((p, i) => moved(sCyl(0, 0, 3, -TAB_H / 2, TAB_H, { name: `tablet${i}`, owner: "press" }), p)));
  }
  {
    const tablet = use(def("chutetab", sol(G.disc(-TAB_H / 2, TAB_H / 2, 3, CH.TF, P), { tone: "hi" })));
    const here = flight("chute");
    put("chute.tablets", [0, 1, 2].map((i) => `<g data-tab="chute" data-i="${i}" transform="${here[i] ? tr(here[i]) : ""}" style="opacity:${here[i] ? 1 : 0}">${tablet}</g>`).join(""), here.map((p, i) => moved(sDisc(CH.TF, -TAB_H / 2, TAB_H / 2, 3, { name: `chutetab${i}` }), p)));
  }
  put("feed.frontwall", sol(slab(frontWall, TT, 1.8, 3, 0.2), { tone: "mid" }), [sSlab(frontWall, TT, 1.8, { name: "feed.frontwall" })]);
  {
    const [frontSvg, frontShape] = chutePart("chute.wallF", CH.wallF);
    // flanges folded out along the tops of both walls
    const [lipF, lipFShape] = chutePart("chute.lipF", CH.lipF);
    put("chute.front", frontSvg + lipF, [frontShape, lipFShape]);
    wallPair("tray.front", "front", "right");
    const tab = { x: TR.x + TR.w / 2 - 4.5, y: TR.y + TR.d, w: 9, d: 2.2, r: 1 };
    const fy = (x, z) => at([x, TR.y + TR.d, z]);
    put(
      "tray.pull",
      sol(slab(tab, 3.6, 1.2, 3, 0.2), { tone: "mid" }) + D([fy(tab.x + 2, 2.4), fy(tab.x + tab.w - 2, 2.4)], { size: 0.4 }),
      [sSlab(tab, 3.6, 1.2, { name: "tray.pull", owner: "tray" })],
    );
  }
  put(
    "feed.hub",
    sol(cyl(Q[0], Q[1], 4.6, TT, 5, 28), { tone: "mid" }) + sol(cyl(Q[0], Q[1], 3, TT + 5, 1.6, 20), { tone: "mid", crease: "lo" }) + L(k.ring(Q[0], Q[1], 1.6, TT + 6.6, P, 12), { tone: "lo" }),
    [sCyl(Q[0], Q[1], 4.6, TT, 5, { name: "feed.hub", owner: "feed" }), sCyl(Q[0], Q[1], 3, TT + 5, 1.6, { name: "feed.cap", owner: "feed" })],
  );

  // hopper
  const HP = S.HOP;
  const [hx, hy] = HP.c;
  const HF = FZ([hx, hy, 0]);
  const SC = S.SCREEN;
  {
    // guide rods for the screen, behind the funnel, on lugs under the lip
    const rods = M.RODS;
    const lugs = rods.map(([x, y, r]) => {
      const n = [Math.cos(r), Math.sin(r)];
      const t = [-n[1], n[0]];
      const r0 = 12.2;
      const r1 = SC.rodR + 2.2;
      const ring = [[r0, -2], [r1, -2], [r1, 2], [r0, 2]].map(([u, v]) => [hx + u * n[0] + v * t[0], hy + u * n[1] + v * t[1]]);
      return ring;
    });
    const lift = SC.lift * (1 - pose.screen);
    const bushZ = [SC.z, SC.z + 3].map((z) => z + lift);
    put(
      "hopper.rods",
      lugs.map((ring) => sol(k.extrude(ring, 84.4, 1.6, P), { tone: "mid" })).join("") + rods.map(([x, y]) => sol(cyl(x, y, 1, 86, bushZ[0] - 86, 14), { tone: "mid", crease: "none" })).join(""),
      [...lugs.map((ring, i) => (A) => A.extruded(ring, 84.4, 1.6, { name: `hopper.lug${i}`, owner: "hopper" })), ...rods.map(([x, y], i) => sCyl(x, y, 1, 86, bushZ[0] - 86, { name: `hopper.rod${i}`, owner: "hopper" }))],
    );
    // the neck, its collar with the post arm, the funnel and its lip
    const collar = [54, 59];
    const toPost = G.unit3([S.HOP_POST[0] - hx, S.HOP_POST[1] - hy, 0]);
    const side = [-toPost[1], toPost[0]];
    const armRing = [[6.2, -1.6], [Math.hypot(S.HOP_POST[0] - hx, S.HOP_POST[1] - hy) - 1.4, -1.6], [Math.hypot(S.HOP_POST[0] - hx, S.HOP_POST[1] - hy) - 1.4, 1.6], [6.2, 1.6]].map(([u, v]) => [hx + u * toPost[0] + v * side[0], hy + u * toPost[1] + v * side[1]]);
    // the neck runs through the collar: drawn below it, then above it
    const neckPart = (name, z0, z1) => put(name, sol(cyl(hx, hy, HP.neckR, z0, z1 - z0), { tone: "mid", crease: "none" }), [sCyl(hx, hy, HP.neckR, z0, z1 - z0, { name, owner: "hopper" })]);
    neckPart("hopper.neck", HP.neck[0], collar[0]);
    put(
      "hopper.collar",
      sol(cyl(hx, hy, 6.4, collar[0], collar[1] - collar[0], 32), { tone: "mid", inner: L(k.sideArc(hx, hy, 6.4, (collar[0] + collar[1]) / 2, P, 24), { tone: "faint" }) }),
      [sCyl(hx, hy, 6.4, collar[0], collar[1] - collar[0], { name: "hopper.collar", owner: "hopper" })],
    );
    // the held lamp on the collar's front
    neckPart("hopper.neck#2", collar[1], HP.neck[1]);
    const funnel = [[HP.neck[1], HP.outR[0]], [HP.top, HP.outR[1]], [HP.top, HP.inR[1]], [HP.neck[1] + 0.6, HP.inR[0]], [HP.neck[1], HP.inR[0]]];
    const seam = G.arcOf(HF, 70, HP.outR[0] + ((HP.outR[1] - HP.outR[0]) * (70 - HP.neck[1])) / (HP.top - HP.neck[1]), P, { slope: (HP.outR[1] - HP.outR[0]) / (HP.top - HP.neck[1]) });
    put(
      "hopper.funnel",
      sol(G.lathe(funnel, HF, P, { hole: [HP.top, HP.inR[1]] }), { tone: "mid", crease: "lo", inner: L(seam, { tone: "faint" }) }),
      [(A) => A.lathe(HF, funnel, { name: "hopper.funnel", owner: "hopper" })],
    );
    const lip = G.ringBand(HP.top, HP.rimTop, HP.inR[1], HP.lipR, HF, P, { hole: [HP.rimTop, HP.inR[1]] });
    const lipDots = G.dotsOf(HF, HP.rimTop, (HP.inR[1] + HP.lipR) / 2, 12, P, { all: true, phase: 0.26 });
    put("hopper.lip", sol(lip, { tone: "mid", crease: "lo" }) + D(lipDots, { size: 0.4 }), [sRing(HF, HP.top, HP.rimTop, HP.inR[1], HP.lipR, { name: "hopper.lip", owner: "hopper" })]);
    // the fill and its granules, seen through the mouth
    const fillR = HP.inR[0] + ((HP.inR[1] - HP.inR[0]) * (HP.fill - HP.neck[1] - 0.6)) / (HP.top - HP.neck[1] - 0.6);
    const mouth = G.circleOf(HF, HP.rimTop, HP.inR[1], P);
    const grains = GRAINS.map(([x, y], i) => {
      const [sx, sy] = at([x, y, HP.fill]);
      return `<circle class="rdd-grain" data-g="" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.3"/>`;
    }).join("");
    put(
      "hopper.fill",
      `<clipPath id="rdd-mouth"><path d="${mouth}"/></clipPath><g clip-path="url(#rdd-mouth)"><path class="rdd-fill" d="${k.ring(hx, hy, fillR, HP.fill, P, 48)}"/>${grains}</g>`,
      [sCyl(hx, hy, fillR, HP.fill - 0.4, 0.4, { name: "hopper.fill", owner: "hopper" })],
    );
    put(
      "hopper.arm",
      sol(k.extrude(armRing, collar[0] + 1, 3, P), { tone: "mid" }),
      [(A) => A.extruded(armRing, collar[0] + 1, 3, { name: "hopper.arm", owner: "hopper" })],
    );
    const lampF = FY([hx, hy + 6.4, 56.5]);
    put("hopper.lamp", sol(G.disc(-0.3, 1.2, 2.2, lampF, P), { tone: "mid" }) + `<path class="rdd-lens" data-lamp="held" d="${G.circleOf(lampF, 1.2, 1.4, P)}"/>`, [sDisc(lampF, -0.3, 1.2, 2.2, { name: "hopper.lamp", owner: "hopper" })]);
    const [px, py] = S.HOP_POST;
    put(
      "hopper.post",
      sol(cyl(px, py, 4.2, TT, 1.6, 28), { tone: "mid" }) + sol(cyl(px, py, 2.6, TT + 1.6, 23, 20), { tone: "mid", crease: "none" }) + sol(cyl(px, py, 3.2, TT + 24.6, 1.6, 20), { tone: "mid" }) + D([at([px, py, TT + 26.2])], { size: 0.5 }),
      [sCyl(px, py, 4.2, TT, 1.6, { name: "hopper.postbase", owner: "hopper" }), sCyl(px, py, 2.6, TT + 1.6, 23, { name: "hopper.post", owner: "hopper" }), sCyl(px, py, 3.2, TT + 24.6, 1.6, { name: "hopper.postcap", owner: "hopper" })],
    );
    // the screen insert (D1): bushings on the rods, the flange, the mesh, specks it holds; then the rod tops
    const SF = FZ([hx, hy, 0]);
    const mesh = [];
    for (let i = -4; i <= 4; i++) {
      const c = i * 2.3;
      const h = Math.sqrt(Math.max(0, SC.rIn * SC.rIn - c * c));
      if (h < 0.5) continue;
      mesh.push(k.lineOnTop([hx + c, hy - h], [hx + c, hy + h], SC.z + 0.6, P), k.lineOnTop([hx - h, hy + c], [hx + h, hy + c], SC.z + 0.6, P));
    }
    const held = HELD.map(([dx, dy], i) => `<circle class="rdd-grain" data-held="${i}" data-state="trigger" cx="${at([hx + dx, hy + dy, SC.z + 0.9])[0].toFixed(1)}" cy="${at([hx + dx, hy + dy, SC.z + 0.9])[1].toFixed(1)}" r="1.8" style="opacity:0"/>`).join("");
    const bush = rods.map(([x, y]) => sol(cyl(x, y, 2.1, SC.z, 3, 18), { tone: "mid" })).join("");
    const ears = rods.map(([, , r]) => {
      const n = [Math.cos(r), Math.sin(r)];
      const t = [-n[1], n[0]];
      return [[SC.rOut - 1, -1.3], [SC.rodR - 1.6, -1.3], [SC.rodR - 1.6, 1.3], [SC.rOut - 1, 1.3]].map(([u, v]) => [hx + u * n[0] + v * t[0], hy + u * n[1] + v * t[1]]);
    });
    const flange = G.ringBand(SC.z, SC.z + SC.h, SC.rIn, SC.rOut, SF, P, { hole: [SC.z + SC.h, SC.rIn] });
    const off = [0, 0, lift];
    put(
      "hopper.screen",
      `<g data-part="screen" class="rdd-screen" transform="${tr(off)}">${bush}${ears.map((ring) => sol(k.extrude(ring, SC.z, SC.h, P), { tone: "mid" })).join("")}${sol(flange, { tone: "hi", crease: "lo" })}<clipPath id="rdd-mesh"><path d="${G.circleOf(SF, SC.z + 0.6, SC.rIn, P)}"/></clipPath><g clip-path="url(#rdd-mesh)">${L(mesh.join(""), { tone: "lo", className: "rdd-mesh" })}</g>${L(G.circleOf(SF, SC.z + 0.6, SC.rIn - 0.05, P), { tone: "lo" })}${held}</g>`,
      [
        ...rods.map(([x, y], i) => moved(sCyl(x, y, 2.1, SC.z, 3, { name: `hopper.bush${i}`, owner: "hopper" }), off)),
        ...ears.map((ring, i) => moved((A) => A.extruded(ring, SC.z, SC.h, { name: `hopper.ear${i}`, owner: "hopper" }), off)),
        moved(sRing(SF, SC.z, SC.z + SC.h, SC.rIn, SC.rOut, { name: "hopper.screen", owner: "hopper" }), off),
      ],
      { move: off },
    );
    put(
      "hopper.rodtops",
      rods.map(([x, y], i) => live(M.rodTopOf([x, y], lift), { tone: "mid", crease: "none", name: `rodtop${i}` }) + sol(cyl(x, y, 1.7, SC.rodTop, 1.2), { tone: "mid" })).join(""),
      rods.flatMap(([x, y], i) => [sCyl(x, y, 1, bushZ[1], SC.rodTop - bushZ[1], { name: `hopper.rodtop${i}`, owner: "hopper" }), sCyl(x, y, 1.7, SC.rodTop, 1.2, { name: `hopper.rodcap${i}`, owner: "hopper" })]),
    );
  }

  // ============================================================ upper punch: punch, holder, spring, ram, tension knob
  {
    const U = S.UP;
    const dz = ramAt(pose.s);
    const lift = yieldAt(pose.s, pose.anchor);
    const low = [0, 0, dz + lift];
    const ram = [0, 0, dz];
    const nutOff = [0, 0, dz - S.NUT_DOWN * pose.anchor];
    // the punch enters the die: below the table top it shows only through the bore
    const c = at([0, 0, TT]);
    const rim = Array.from({ length: 48 }, (_, i) => at([3.05 * Math.cos((i / 48) * 2 * Math.PI), 3.05 * Math.sin((i / 48) * 2 * Math.PI), TT]));
    const ax = Math.max(...rim.map((p) => Math.abs(p[0] - c[0])));
    const by = Math.max(...rim.map((p) => Math.abs(p[1] - c[1])));
    const lower = Array.from({ length: 17 }, (_, i) => [c[0] + ax * Math.cos((i / 16) * Math.PI), c[1] + by * Math.sin((i / 16) * Math.PI)]);
    const dieClip = k.pathOf([[c[0] - 120, c[1] - 400], [c[0] + 120, c[1] - 400], [c[0] + 120, c[1] - by], [c[0] + ax, c[1] - by], ...lower, [c[0] - ax, c[1] - by], [c[0] - 120, c[1] - by]], true);
    const punchFoot = Math.max(U.tip + low[2], TT);
    put(
      "upper.holder",
      `<clipPath id="rdd-die"><path d="${dieClip}"/></clipPath><g clip-path="url(#rdd-die)"><g data-part="punch" transform="${tr(low)}">${sol(cyl(0, 0, U.punch, U.tip, U.holder[0] - U.tip, 16), { tone: "hi", lit: true, crease: "none" })}</g></g><g data-part="holder" transform="${tr(low)}">${sol(cyl(0, 0, U.holderR, U.holder[0], U.holder[1] - U.holder[0], 28, 0.4), { tone: "hi", lit: true, inner: L(k.sideArc(0, 0, U.holderR, U.holder[0] + 1.2, P, 28), { tone: "lo" }) })}${sol(G.disc(0, 1.4, 1.2, FX([U.holderR - 0.2, 0, (U.holder[0] + U.holder[1]) / 2]), P), { tone: "mid" })}</g>`,
      [sCyl(0, 0, U.punch, punchFoot, U.holder[0] + low[2] - punchFoot, { name: "upper.punch", owner: "ram" }), moved(sCyl(0, 0, U.holderR, U.holder[0], U.holder[1] - U.holder[0], { name: "upper.holder", owner: "ram" }), low), moved(sDisc(FX([U.holderR - 0.2, 0, (U.holder[0] + U.holder[1]) / 2]), 0, 1.4, 1.2, { name: "upper.setscrew", owner: "ram" }), low)],
      { move: low },
    );
    const spring = M.springOf(dz, lift, pose.anchor);
    const ramLow = M.ramLowOf(dz, lift, pose.anchor);
    put(
      "upper.ram",
      L(spring.back, { tone: "lo", className: "rdd-coil" }).replace("<path", '<path data-part="coilback"') + live(ramLow.paths, { tone: "mid", crease: "none", name: "ramlow" }) + L(spring.front, { tone: "hi", className: "rdd-coil" }).replace("<path", '<path data-part="coilfront"'),
      [sCyl(0, 0, U.ram, ramLow.z0, ramLow.z1 - ramLow.z0, { name: "upper.ram", owner: "ram" }), sRing(FZ([0, 0, 0]), ...M.springSpan(dz, lift, pose.anchor), U.spring - 0.35, U.spring + 0.35, { name: "upper.spring", owner: "ram" })],
    );
    put(
      "upper.nut",
      `<g data-part="nut" transform="${tr(nutOff)}">${sol(cyl(0, 0, U.nutR, U.nut[0], U.nut[1] - U.nut[0], 32, 0.4), { tone: "mid", crease: "lo" })}${L(k.knurl(0, 0, U.nutR, U.nut[0] + 0.3, U.nut[1] - 0.3, 36, P), { tone: "lo" })}${L(k.ring(0, 0, U.nutR - 1.4, U.nut[1], P, 28), { tone: "faint" })}</g>`,
      [moved(sCyl(0, 0, U.nutR, U.nut[0], U.nut[1] - U.nut[0], { name: "upper.nut", owner: "ram" }), nutOff)],
      { move: nutOff },
    );
    // the ram above the nut: one rod sliding out of the guide bush
    const RF = G.frameOf([0, 0, U.bush[0]], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
    const to = U.bush[0] - U.nut[1];
    const stroke = 2 * ECC + S.NUT_DOWN + 1;
    const rod = G.rodOut(RF, 0, to, U.ram, P, { stroke });
    const hold = k.axisVector(P, nutOff);
    put(
      "upper.rod",
      `<g data-part="rod" transform="${tr(nutOff)}"><clipPath id="rdd-ram"><path data-hold="" d="${rod.clip}"${nutOff[2] ? ` transform="translate(${(-hold[0]).toFixed(2)} ${(-hold[1]).toFixed(2)})"` : ""}/></clipPath><g clip-path="url(#rdd-ram)">${sol(rod.paths, { tone: "mid", crease: "none" })}</g></g>`,
      [sDisc(RF, 0, to - nutOff[2], U.ram, { name: "upper.rod", owner: "ram" })],
      { move: nutOff, slide: true },
    );
    // below the table the punch's ghost shows only through the bore
    put("upper.ghost", `<g clip-path="url(#rdd-die)">${ghostSvg("punch")}</g>`);
  }

  // ============================================================ head: bush, counter, pillow blocks, eccentric, flywheel
  {
    const HE = S.HEAD;
    const [hz0, hz1] = S.HEAD_Z;
    const slot = { x: -2.6, y: -9.5, w: 5.2, d: 19, r: 2.6 };
    const [b0, b1] = S.UP.bush;
    put("head.bush", sol(cyl(0, 0, S.UP.bushR, b0, b1 - b0), { tone: "mid", inner: L(k.sideArc(0, 0, S.UP.bushR, b0 + 1.4, P, 24), { tone: "faint" }) }), [sCyl(0, 0, S.UP.bushR, b0, b1 - b0, { name: "head.bush", owner: "press" })]);
    put(
      "head.body",
      sol(slab(HE, hz0, hz1 - hz0, 4, 0.8), { tone: "mid" }) + `<path class="rdd-void" d="${k.planOutline(slot, hz1, P, 4)}"/>` + L(k.planOutline(k.insetPlan(slot, -1), hz1, P, 4), { tone: "faint" }) +
        L([hz0 + 3.4, hz1 - 3.4].map((z) => G.circleOf(FX([HE.x + HE.w, HE.y + 3.4, z]), 0, 1.1, P, 12)).join(""), { tone: "lo" }) +
        D([hz0 + 3.4, hz1 - 3.4].map((z) => at([HE.x + HE.w, HE.y + 3.4, z])), { size: 0.45 }),
      [sSlab(HE, hz0, hz1 - hz0, { name: "head.body", owner: "press" })],
    );
    // stroke counter on the front face: a dial whose hand turns once per 200 strokes, a tick per 10
    const { box: cbox, z: cz, r: cr } = S.COUNTER;
    const CF = M.COUNTER_F;
    const fp = (x, z) => at([x, cbox.y + cbox.d, z]);
    put(
      "head.counter",
      sol(slab(cbox, cz[0], cz[1] - cz[0], 2, 0.4), { tone: "mid" }) +
        sol(G.disc(0, 0.6, cr, CF, P), { tone: "mid", crease: "lo" }) +
        L(G.circleOf(CF, 0.6, cr - 0.8, P), { tone: "faint" }) +
        L(G.spokesOf(CF, 0.6, cr - 1.6, cr - 0.8, 20, P), { tone: "lo" }) +
        L(G.spokesOf(CF, 0.6, cr - 2.2, cr - 0.8, 4, P), { tone: "mid" }) +
        L(M.counterHandOf(Math.min(pose.s, STEPS)), { tone: "hi", free: "end" }).replace("<path", '<path data-part="counter"') +
        D([at(G.pointOf(CF, 0.7, 0, 0))], { size: 0.5, tone: "hi" }) +
        D([fp(cbox.x + 1.4, cz[0] + 1.4), fp(cbox.x + cbox.w - 1.4, cz[0] + 1.4), fp(cbox.x + 1.4, cz[1] - 1.4), fp(cbox.x + cbox.w - 1.4, cz[1] - 1.4)], { size: 0.4 }),
      [sSlab(cbox, cz[0], cz[1] - cz[0], { name: "head.counter", owner: "press" }), sDisc(CF, 0, 0.6, cr, { name: "head.counterdial", owner: "press" })],
    );
  }
  // pillow blocks and the shaft through them, the eccentric between them
  const block = (bx, name) => {
    const svg0 = blockAt(0);
    const base = { x: bx, y: -7, w: 8, d: 14, r: 1 };
    const cap = { x: bx, y: -6, w: 8, d: 12, r: 1.4 };
    const zc = S.SHAFT.z;
    const bolts = [-4, 4].map((y) => [bx + 4, y]);
    const svg = use(def("block", svg0), [bx, 0, 0]);
    return {
      svg,
      shapes: [sSlab(base, S.HEAD_Z[1], zc - S.HEAD_Z[1], { name: `${name}.base`, owner: "drive" }), sSlab(cap, zc, 6, { name: `${name}.cap`, owner: "drive" }), ...bolts.map(([x, y], i) => sCyl(x, y, 1.3, zc + 6, 1.2, { name: `${name}.bolt${i}`, owner: "drive" })), sCyl(bx + 4, 0, 1.2, zc + 6, 2.2, { name: `${name}.oil`, owner: "drive" }), sCyl(bx + 4, 0, 1.7, zc + 8.2, 0.9, { name: `${name}.oilcap`, owner: "drive" })],
    };
  };
  function blockAt(bx) {
    const base = { x: bx, y: -7, w: 8, d: 14, r: 1 };
    const cap = { x: bx, y: -6, w: 8, d: 12, r: 1.4 };
    const zc = S.SHAFT.z;
    const bolts = [-4, 4].map((y) => [bx + 4, y]);
    return (
      sol(slab(base, S.HEAD_Z[1], zc - S.HEAD_Z[1], 2), { tone: "mid" }) +
      sol(slab(cap, zc, 6, 3), { tone: "mid" }) +
      bolts.map(([x, y]) => sol(cyl(x, y, 1.3, zc + 6, 1.2, 6), { tone: "mid" })).join("") +
      sol(cyl(bx + 4, 0, 1.2, zc + 6, 2.2, 12), { tone: "mid" }) +
      sol(cyl(bx + 4, 0, 1.7, zc + 8.2, 0.9, 14), { tone: "mid" })
    );
  }
  const FS = M.FXC;
  const shaft = (s0, s1, name, r = S.SHAFT.r) => put(name, sol(G.disc(s0, s1, r, FS, P), { tone: "mid", crease: "none" }), [sDisc(FS, s0, s1, r, { name, owner: "drive" })]);
  {
    const b = block(S.BLOCKS[0], "drive.blockL");
    put("drive.blockL", b.svg, b.shapes);
  }
  shaft(S.BLOCKS[0] + 8, S.SHEAVE.x[0], "drive.shaftA");
  {
    const rod = M.conrodOf(psi);
    put("drive.conrod", live(rod.paths, { tone: "mid", name: "conrod" }), [(A) => A.prism(rod.F, rod.poly, 0, rod.len, { name: "drive.conrod", owner: "drive" })]);
    const c = M.eccentricOf(psi);
    const off = G.sub3(c, M.ECC_REST);
    const EF = FX(M.ECC_REST);
    const strap = G.ringBand(S.STRAP.x[0], S.STRAP.x[1], S.STRAP.r[0], S.STRAP.r[1], EF, P);
    const sheave = G.disc(S.SHEAVE.x[0], S.SHEAVE.x[1], S.SHEAVE.r, EF, P);
    const bolts = G.dotsOf(EF, S.STRAP.x[1], 8.25, 6, P, { all: true, phase: 0.3 });
    put(
      "drive.eccentric",
      `<g data-part="ecc" transform="${tr(off)}">${sol(strap, { tone: "mid" })}${D(bolts, { size: 0.4 })}${sol(sheave, { tone: "mid", crease: "lo" })}${L(G.circleOf(EF, S.SHEAVE.x[1], S.SHEAVE.r - 1.4, P), { tone: "faint" })}</g>`,
      [moved(sRing(EF, S.STRAP.x[0], S.STRAP.x[1], S.STRAP.r[0], S.STRAP.r[1], { name: "drive.strap", owner: "drive" }), off), moved(sDisc(EF, S.SHEAVE.x[0], S.SHEAVE.x[1], S.SHEAVE.r, { name: "drive.sheave", owner: "drive" }), off)],
      { move: off },
    );
    put("drive.ghost", ghostSvg("ecc"));
  }
  shaft(S.SHEAVE.x[1], S.BLOCKS[1], "drive.shaftB");
  {
    const b = block(S.BLOCKS[1], "drive.blockR");
    put("drive.blockR", b.svg, b.shapes);
  }
  put("drive.collar", sol(G.disc(S.BLOCKS[1] + 8, S.BLOCKS[1] + 10.6, 4.6, FS, P), { tone: "mid" }) + D([at(G.pointOf(FS, S.BLOCKS[1] + 9.3, 4.6, Math.PI * 0.62))], { size: 0.45 }), [sDisc(FS, S.BLOCKS[1] + 8, S.BLOCKS[1] + 10.6, 4.6, { name: "drive.collar", owner: "drive" })]);
  shaft(S.BLOCKS[1] + 10.6, S.FLY.hub[0], "drive.shaftC");
  put("drive.hubback", sol(G.disc(S.FLY.hub[0], S.FLY.x[0] + 1, S.FLY.hubR, FS, P), { tone: "mid", crease: "lo" }), [sDisc(FS, S.FLY.hub[0], S.FLY.x[0] + 1, S.FLY.hubR, { name: "drive.hubback", owner: "drive" })]);
  // flywheel: rim, spokes seen through the front opening, hub, handle
  {
    const FL = S.FLY;
    const rim = G.ringBand(FL.x[0], FL.x[1], FL.rIn, FL.rOut, FS, P, { hole: [FL.x[1], FL.rIn] });
    const seams = [FL.x[0] + 1.2, FL.x[1] - 1.2].map((s) => G.arcOf(FS, s, FL.rOut, P)).join("");
    put("drive.rim", sol(rim, { tone: "mid", crease: "lo", inner: L(seams, { tone: "faint" }) }) + L(G.circleOf(FS, FL.x[1], FL.rOut - 1.3, P), { tone: "faint" }), [sRing(FS, FL.x[0], FL.x[1], FL.rIn, FL.rOut, { name: "drive.rim", owner: "drive" })]);
    const opening = G.circleOf(FS, FL.x[1], FL.rIn, P);
    const spokes = M.spokesOf(psi);
    const blur = `${G.circleOf(FS, FL.x[1] - 1, FL.rIn, P)}${G.circleOf(FS, FL.x[1] - 1, FL.hubR, P)}`;
    // spokes facing away, the hub's middle, spokes facing the viewer: live.js moves a spoke across as it turns
    const front = spokes.map((_, i) => M.spokeFront(psi, i));
    const spokeSvg = (want) => spokes.map((sp, i) => (front[i] === want ? live(sp.paths, { tone: "mid", crease: "lo", name: `spoke${i}` }) : "")).join("");
    const spokeShapes = (want) => spokes.flatMap((sp, i) => (front[i] === want ? [(A) => A.prism(FS, sp.poly, FL.x[0] + 1, FL.x[1] - 1, { name: `drive.spoke${i}`, owner: "drive" })] : []));
    put(
      "drive.spokes.back",
      `<clipPath id="rdd-fly"><path d="${opening}"/></clipPath><g clip-path="url(#rdd-fly)"><path class="rdd-blur" data-part="blur" fill-rule="evenodd" d="${blur}" style="opacity:0"/><g data-part="spokes" data-side="back">${spokeSvg(false)}</g></g>`,
      spokeShapes(false),
    );
    put("drive.hubmid", sol(G.disc(FL.x[0] + 1, FL.x[1] - 1, FL.hubR, FS, P), { tone: "mid", crease: "lo" }), [sDisc(FS, FL.x[0] + 1, FL.x[1] - 1, FL.hubR, { name: "drive.hubmid", owner: "drive" })]);
    put("drive.spokes.front", `<g clip-path="url(#rdd-fly)"><g data-part="spokes" data-side="front">${spokeSvg(true)}</g></g>`, spokeShapes(true));
    const keyF = FS;
    put(
      "drive.hub",
      sol(G.disc(FL.x[1] - 1, FL.hub[1], FL.hubR, FS, P), { tone: "mid", crease: "lo" }) + sol(G.disc(FL.hub[1], FL.hub[1] + 1.4, 3.4, FS, P), { tone: "mid" }) + D(G.dotsOf(keyF, FL.hub[1], 4.4, 4, P, { all: true, phase: 0.125 }), { size: 0.4 }),
      [sDisc(FS, FL.x[1] - 1, FL.hub[1], FL.hubR, { name: "drive.hub", owner: "drive" }), sDisc(FS, FL.hub[1], FL.hub[1] + 1.4, 3.4, { name: "drive.nut", owner: "drive" })],
    );
    const h0 = M.handleAt(0);
    const HF2 = FX(h0);
    const grip = [[2, 1.5], [3, 2.4], [11.4, 2.4], [12.4, 1.7]];
    const off = M.handleOffset(psi);
    put(
      "drive.handle",
      `<g data-part="handle" transform="${tr(off)}">${sol(G.disc(0, 2, 1.5, HF2, P), { tone: "mid" })}${sol(G.solidOf(grip, HF2, P), { tone: "mid", crease: "lo" })}${sol(G.sphereOf(G.pointOf(HF2, 13.6, 0, 0), 1.9, P), { tone: "mid" })}</g>`,
      [moved(sDisc(HF2, 0, 2, 1.5, { name: "drive.pin", owner: "drive" }), off), moved((A) => A.solid(HF2, grip, { name: "drive.grip", owner: "drive" }), off), moved((A) => A.ball(G.pointOf(HF2, 13.6, 0, 0), 1.9, { name: "drive.knob", owner: "drive" }), off)],
      { move: off },
    );
    put("drive.handleghost", ghostSvg("handle", ' fill-rule="evenodd"'));
  }

  items.unshift({ name: "defs", svg: `<defs>${Object.entries(defs).map(([id, svg]) => `<g id="rdd-${id}">${svg}</g>`).join("")}</defs>`, shapes: [] });
  items.defs = defs;
  return items;
}

// every place a click lands, as screen polygons
export function hitsOf() {
  const box = (pts) => k.pathOf(G.hullOf(pts.map((p) => at(p))), true);
  const [hx, hy] = S.HOP.c;
  const corners = (plan, z0, z1) => k.boxCorners(plan, z0, z1);
  return {
    threat: box(corners({ x: S.SLIDE.x[0] - 3, y: S.SLIDE.y - 5, w: S.SLIDE.x[1] - S.SLIDE.x[0] + 6, d: 10 }, S.CON_H, S.CON_H + 4)),
    p: box(corners({ x: S.KNOB[0] - 9, y: S.KNOB[1] - 9, w: 18, d: 18 }, S.CON_H, S.CON_H + 6)),
    screen: box(corners({ x: hx - 20, y: hy - 16, w: 34, d: 32 }, 47, S.SCREEN.rodTop + 2)),
    anchor: box(corners({ x: -8, y: -8, w: 16, d: 16 }, 50, 82)),
    run: box(corners({ x: S.FLY.x[0] - 2, y: -S.FLY.rOut - 2, w: 22, d: 2 * S.FLY.rOut + 4 }, S.FLY.c[2] - S.FLY.rOut - 2, S.FLY.c[2] + S.FLY.rOut + 2)),
  };
}
