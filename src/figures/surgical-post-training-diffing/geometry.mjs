// Fig 9 · every drawn item with its true shape, for art.mjs (static markup) and build.mjs (order and audit).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import D from "./data.mjs";
import {
  P, at, BENCH, CY, MID, CAR, OFF, PITCH, LO, slideX, flapShape, FLAP_PIN, FLAP_Z, AXLE_Z, LINK_X, ROCK, DIAL, DIAL_R, DIAL_TOP, SCALE_FROM, SCALE_SPAN, STOP_ANGLE, MIC, MIC_Z, micOf,
  linkage, mirrorShape, leverShape, linkShape, prismPaths, linkagePaths, LINKAGE_SLOTS, PIN, PIN_HEAD, HANDLE, CRANK_FACE, CAM, camNotches, needleAt, klAngle, knurlX, knurlY, MIRROR, LEVER,
} from "./view.mjs";

// layout the live code never needs
export const BENCH_H = 12;
export const FOOT_H = 5;
const HOUSE = 34; // half size of a lamp housing
const H_TOP = 22;
const WIN = 18; // half size of the carrier window
const CAR_TOP = 27;
const GLASS = 22;
const GLASS_TOP = 28.2;
const FIELD = 11; // half size of the emulsion field
const SLIDE_Z = 33;
const SLIDE_TOP = 35;
const WX = 12; // half window of the slide along x
const WY = 17; // and along y
const SLIDE_FROM = -16;
const SLIDE_TO = 74;
const COL_TOP = 100;
const BOX_Z = 108;
const BOX_TOP = 132;
const BOX = { x: -12, y: -19, w: 24, d: 30, r: 2 };
const UNIT = { x: 50, y: -22, w: 36, d: 38, r: 3 }; // control unit: blink meter and lamp supply
const UNIT_H = 20;
const GLAND_Z = 3.2;

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const fixed = (n) => Math.round(n * 10) / 10;
const KS = G.scaleOf(P);
const st = (r) => Math.max(10, Math.min(40, Math.round((2 * Math.PI * r * KS) / 4.4 / 2) * 2));
const cyl = (x, y, r, z, h, bevel = 0) => k.cylinder(x, y, r, z, h, P, st(r), bevel);
const disc = (s0, s1, r, F) => G.disc(s0, s1, r, F, P, { steps: st(r) });
const seg = (a, b) => k.pathOf([a, b].map(at));

// the parts that live code rewrites: fixed slots so a frame only sets `d`
export function slotSvg(id, paths, { tone = "hi" } = {}) {
  const d = (slot) => (typeof slot === "number" ? paths.shades[slot] || "" : paths[slot] || "");
  return `<g class="iso-solid" data-live="${id}"><path class="iso-fill" d="${d("fill")}"/>${[0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${d(i)}"/>`).join("")}<path class="iso-top" d="${d("top")}"/><path class="iso-line iso-crease" data-tone="faint" d="${d("crease")}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${d("outline")}"/></g>`;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
// seeded emulsion: stars on both plates, stars only on A, stars only on B, at least 2.6 apart
export const STARS = (() => {
  const r = rng(11);
  const all = [];
  const pick = (n) => {
    const out = [];
    while (out.length < n) {
      const p = [fixed((r() * 2 - 1) * (FIELD - 1.6)), fixed((r() * 2 - 1) * (FIELD - 1.6)), r() < 0.3 ? 0.8 : 0.55];
      if (all.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 2.6)) all.push(p), out.push(p);
    }
    return out;
  };
  const both = pick(13);
  const a = pick(6).map((p) => [p[0], p[1], 0.75]);
  const b = pick(4).map((p) => [p[0], p[1], 0.75]);
  // the FullDelta film masks the first two A-only stars and prints the first B-only one
  return { both, A: a.slice(2), Am: a.slice(0, 2), B: b.slice(1), Bs: b.slice(0, 1) };
})();

// a closed slot on a vertical face ("x": the face x = c, "y": the face y = c), centred at u along the face
function slot(face, c, u, z0, z1, w) {
  const pts = [];
  const rr = w / 2;
  for (let i = 0; i <= 4; i++) pts.push([u + rr * Math.cos(Math.PI + (i / 4) * Math.PI), z1 - rr - rr * Math.sin(Math.PI + (i / 4) * Math.PI)]);
  for (let i = 0; i <= 4; i++) pts.push([u + rr * Math.cos((i / 4) * Math.PI), z0 + rr - rr * Math.sin((i / 4) * Math.PI)]);
  return k.pathOf(pts.map(([v, z]) => at(face === "x" ? [c, v, z] : [v, c, z])), true);
}

export function build({ phi0 = linkage(Math.PI / 2), sweep = true } = {}) {
  const items = [];
  const routes = [];
  const put = (name, centre, svg, shapes = [], extra = {}) => items.push({ name, at: centre, svg, shapes, ...extra });
  const rest = phi0;

  // ------------------------------------------------------------ bench, label plate, ruler strip
  {
    put("stand.halo", [0, 0, -40], `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`, [A.slab(BENCH, -BENCH_H - FOOT_H - 0.2, 0.2, { name: "stand.halo" }, 6)], { key: -1e6 });
    k.corners(BENCH, 10).forEach(([x, y], i) => {
      if (x < 0 && y < 0) return; // the far foot is hidden behind the bench
      put(`stand.foot${i}`, [x, y, -14], S(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 20), { tone: "lo" }) + S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 16), { tone: "mid" }), [A.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, { name: `stand.foot${i}` }), A.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: `stand.foot${i}b` })]);
    });
    const screws = k.corners(BENCH, 10);
    const label = { x: -62, y: 82, w: 44, d: 12, r: 1.5 };
    const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
    const ruler = { x: -4, y: 86, w: 54, d: 5, r: 1 };
    const ticks = k.topTicks(0, 46.1, 2, 5, ruler.y + 0.8, 0.6, [1.5, 2.8], P);
    const bench = [
      S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 6, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4, P, 6), { tone: "faint" }) }),
      L(k.planOutline(k.insetPlan(BENCH, 5), 0, P, 6), { tone: "lo" }),
      L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 12)).join(""), { tone: "lo" }),
      Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
      S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }),
      L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }),
      k.faceTextSvg(k.topMatrix([label.x + 4.5, label.y + 8], 0.8, P, "x"), "AU-9", { size: 3.4, tone: "mid" }),
      rule(label.x + 19, label.x + 40, label.y + 3.8),
      rule(label.x + 19, label.x + 35, label.y + 6.2),
      rule(label.x + 19, label.x + 38, label.y + 8.6),
      Dt([at([label.x + 2.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d / 2, 0.8])], { size: 0.45 }),
      S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" }),
      L(ticks.minor, { tone: "lo" }),
      L(ticks.major, { tone: "mid" }),
      Dt([at([ruler.x + 1.8, ruler.y + 2.6, 0.6]), at([ruler.x + ruler.w - 1.8, ruler.y + 2.6, 0.6])], { size: 0.42 }),
    ];
    put("stand.bench", [0, 0, -6], bench.join(""), [A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench" }), A.slab(label, 0, 0.8, { name: "stand.label" }, 4), A.slab(ruler, 0, 0.6, { name: "stand.ruler" }, 3)], { key: -1e5 });
  }

  // ------------------------------------------------------------ the two stages
  for (const s of ["A", "B"]) stage(s);
  function stage(s) {
    const cy = CY[s];
    const own = `stage${s}`;
    const house = { x: -HOUSE, y: cy - HOUSE, w: 2 * HOUSE, d: 2 * HOUSE, r: 4 };
    const vents = [-16, -8, 0, 8, 16].map((u) => slot("x", HOUSE, cy + u, 6, 15, 2.6) + slot("y", cy + HOUSE, u, 6, 15, 2.6)).join("");
    put(`${own}.house`, [0, cy, 11], S(k.slabOf(house, 0, H_TOP, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(house, 3.5, P, 6) + k.sideSeam(house, H_TOP - 3.5, P, 6), { tone: "faint" }) }) + L(vents, { tone: "lo" }), [A.slab(house, 0, H_TOP, { name: `${own}.house` }, 6)]);
    const diff = { x: -20, y: cy - 20, w: 40, d: 40, r: 1 };
    put(`${own}.diffuser`, [0, cy, H_TOP + 0.1], S(k.slabOf(diff, H_TOP, 0.3, P, 3), { tone: "hi", flat: true, className: "spd-diffuser" }) + L(k.planOutline(k.insetPlan(diff, 3), H_TOP + 0.3, P, 3), { tone: "faint" }), [A.slab(diff, H_TOP, 0.3, { name: `${own}.diffuser` }, 3)]);
    // the lamp's supply gland on the housing's +x face
    const gy = s === "A" ? 18 : -22;
    const Fg = G.frameOf([HOUSE, gy, GLAND_Z], X, Y, Z);
    put(`${own}.gland`, [HOUSE + 1.2, gy, GLAND_Z], S(disc(0, 1, 2, Fg), { tone: "mid" }) + S(disc(1, 2.5, 1.5, Fg), { tone: "mid" }), [A.disc(Fg, 0, 1, 2, { name: `${own}.gland`, owner: `${own}.gland` }), A.disc(Fg, 1, 2.5, 1.5, { name: `${own}.glandnut`, owner: `${own}.gland` })]);

    const piece = s === "A" ? "reg" : "";
    const move = s === "A" ? [OFF[0], OFF[1], 0] : [0, 0, 0];
    const part = s === "A" ? "carrierA" : "";
    const bars = [
      ["bx0", { x: -CAR, y: cy - CAR, w: CAR - WIN, d: 2 * CAR, r: 2 }],
      ["by0", { x: -WIN, y: cy - CAR, w: 2 * WIN, d: CAR - WIN, r: 0.4 }],
      ["bx1", { x: WIN, y: cy - CAR, w: CAR - WIN, d: 2 * CAR, r: 2 }],
      ["by1", { x: -WIN, y: cy + WIN, w: 2 * WIN, d: CAR - WIN, r: 0.4 }],
    ];
    for (const [id, plan] of bars) put(`${own}.${id}`, [plan.x + plan.w / 2, plan.y + plan.d / 2, H_TOP + 2.5], S(k.slabOf(plan, H_TOP, CAR_TOP - H_TOP, P, 3, 0.5), { tone: "mid" }), [A.slab(plan, H_TOP, CAR_TOP - H_TOP, { name: `${own}.${id}`, owner: `${own}.frame` }, 3)], { piece, move, part });
    const glass = { x: -GLASS, y: cy - GLASS, w: 2 * GLASS, d: 2 * GLASS, r: 0.6 };
    const field = { x: -FIELD, y: cy - FIELD, w: 2 * FIELD, d: 2 * FIELD, r: 0.3 };
    put(`${own}.glass`, [0, cy, GLASS_TOP], S(k.slabOf(glass, CAR_TOP, GLASS_TOP - CAR_TOP, P, 2, 0.4), { tone: "mid", className: "spd-glass" }) + L(k.planOutline(field, GLASS_TOP, P, 2), { tone: "faint" }), [A.slab(glass, CAR_TOP, GLASS_TOP - CAR_TOP, { name: `${own}.glass`, owner: `${own}.glass` }, 2)], { piece, move, part });
    // the emulsion: shared stars, and the stars only this plate has, which flicker in the eyepiece
    const stars = (list, extra = "") => {
      const pts = (f) => list.filter(f).map(([u, v]) => at([u, cy + v, GLASS_TOP]));
      return `<g class="spd-stars"${extra}>${Dt(pts((p) => p[2] < 0.7), { size: 0.55, tone: "hi" })}${pts((p) => p[2] >= 0.7).length ? Dt(pts((p) => p[2] >= 0.7), { size: 0.85, tone: "hi" }) : ""}</g>`;
    };
    const own2 = s === "A" ? stars(STARS.A, ' data-blink="A"') + stars(STARS.Am, ` data-blink="Am" opacity="${LO}"`) : stars(STARS.B, ` data-blink="B" opacity="${LO}"`) + stars(STARS.Bs, ' data-blink="Bs"');
    put(`${own}.emulsion`, [0, cy, GLASS_TOP + 0.05], stars(STARS.both) + own2, [A.slab(field, GLASS_TOP, 0.05, { name: `${own}.emulsion` }, 2)], { piece, move, part });
    for (const v of [-12, 9]) {
      const spacer = { x: 22.6, y: cy + v, w: 3.6, d: 3.6, r: 0.5 };
      const leaf = { x: 18.4, y: cy + v + 0.5, w: 7.6, d: 2.6, r: 0.6 };
      put(`${own}.clip${v}`, [22, cy + v + 1.8, GLASS_TOP + 0.3], S(k.slabOf(spacer, CAR_TOP, GLASS_TOP - CAR_TOP, P, 2), { tone: "mid" }) + S(k.slabOf(leaf, GLASS_TOP, 0.6, P, 2, 0.2), { tone: "mid" }) + Dt([at([24.4, cy + v + 1.8, GLASS_TOP + 0.6])], { size: 0.5 }), [A.slab(spacer, CAR_TOP, GLASS_TOP - CAR_TOP, { name: `${own}.spacer${v}`, owner: `${own}.clip${v}` }, 2), A.slab(leaf, GLASS_TOP, 0.6, { name: `${own}.leaf${v}`, owner: `${own}.clip${v}` }, 2)], { piece, move, part });
    }
    for (const [x, y] of [[-GLASS - 1.2, cy - 12], [-GLASS - 1.2, cy + 12], [10, cy - GLASS - 1.2]]) put(`${own}.pin${x}${y}`, [x, y, CAR_TOP + 1.5], S(cyl(x, y, 1.2, CAR_TOP, 2.6, 0.3), { tone: "mid" }), [A.cylinder(x, y, 1.2, CAR_TOP, 2.6, { name: `${own}.pin${x}${y}` })], { piece, move, part });
    {
      const [x, y] = [14, cy + 31.6];
      put(`${own}.lock`, [x, y, H_TOP + 2], S(cyl(x, y, 1.9, H_TOP, 3, 0.3), { tone: "mid" }) + L(k.knurl(x, y, 1.9, H_TOP + 0.3, H_TOP + 2.7, 14, P, 0.3), { tone: "lo" }) + S(cyl(x, y, 0.9, H_TOP + 3, 1.2), { tone: "mid" }), [A.cylinder(x, y, 1.9, H_TOP, 3, { name: `${own}.lock` }), A.cylinder(x, y, 0.9, H_TOP + 3, 1.2, { name: `${own}.lockcap`, owner: `${own}.lock` })]);
    }
    // stage B is the fixed reference; only stage A has the X/Y micrometers that register it to B
    if (s === "A") {
      const mic = micOf(s);
      micro(s, "x", mic.x, cy, "regx", [OFF[0], 0, 0]);
      micro(s, "y", mic.y, cy, "regy", [0, OFF[1], 0]);
    }
  }

  // micrometer heads: an angle bracket screwed to the housing's face, barrel, thimble (turns and advances), ratchet cap, spindle
  function micro(s, axis, m, cy, piece, move) {
    const own = `stage${s}.mic${axis}`;
    const F = axis === "x" ? G.frameOf([0, m.y, m.z], X, Y, Z) : G.frameOf([m.x, cy, m.z], Y, [-1, 0, 0], Z);
    const [b0, b1] = MIC.bracket;
    const bracket = axis === "x" ? { x: b0, y: m.y - 4, w: b1 - b0, d: 8, r: 0.8 } : { x: m.x - 4, y: cy + b0, w: 8, d: b1 - b0, r: 0.8 };
    const top = m.z + 4;
    const face = (u, z) => (axis === "x" ? [b1, m.y + u, z] : [m.x + u, cy + b1, z]);
    put(`${own}.bracket`, G.pointOf(F, (b0 + b1) / 2, 0, 0).map((v, i) => (i === 2 ? 22 : v)), S(k.slabOf(bracket, 16, top - 16, P, 3, 0.4), { tone: "mid" }) + Dt([at(face(-2.6, 18.6)), at(face(2.6, 18.6))], { size: 0.45 }), [A.slab(bracket, 16, top - 16, { name: `${own}.bracket`, owner: own }, 3)]);
    const barrel = disc(MIC.barrel[0], MIC.barrel[1], MIC.rB, F);
    const ticks = [];
    for (let i = 1; i < 6; i++) {
      const sx = MIC.barrel[0] + i;
      ticks.push(seg(G.pointOf(F, sx, MIC.rB, Math.PI / 2 - 0.35), G.pointOf(F, sx, MIC.rB, Math.PI / 2 - 0.35 - (i % 5 === 0 ? 0.5 : 0.3))));
    }
    put(`${own}.barrel`, G.pointOf(F, (MIC.barrel[0] + MIC.barrel[1]) / 2, 0, 0), S(barrel, { tone: "mid", inner: L(seg(G.pointOf(F, MIC.barrel[0], MIC.rB, Math.PI / 2 - 0.35), G.pointOf(F, MIC.barrel[1], MIC.rB, Math.PI / 2 - 0.35)), { tone: "lo" }) + L(ticks.join(""), { tone: "lo" }) }), [A.disc(F, MIC.barrel[0], MIC.barrel[1], MIC.rB, { name: `${own}.barrel`, owner: own })]);
    const live = s === "A" ? `thimbleA${axis.toUpperCase()}` : "";
    // the spindle stands out of the bracket bore over the housing top to the carrier face (G.rodOut)
    if (piece) {
      const Fr = axis === "x" ? G.frameOf([0, m.y, m.z], [-1, 0, 0], [0, -1, 0], Z) : G.frameOf([m.x, cy, m.z], [0, -1, 0], X, Z);
      const rod = G.rodOut(Fr, -b0, -CAR, 1, P, { stroke: Math.hypot(...move) });
      const id = `spd-rod-${s}${axis}`;
      put(`${own}.spindle`, G.pointOf(F, CAR + 3, 0, 0), `<clipPath id="${id}"><path data-hold d="${rod.clip}"/></clipPath><g clip-path="url(#${id})">${S(rod.paths, { tone: "mid" })}</g>`, [A.slide(Fr, -b0, -CAR, 1, { name: `${own}.spindle`, owner: own })], { piece, move, part: live });
    } else put(`${own}.spindle`, G.pointOf(F, CAR + 3, 0, 0), S(disc(CAR, b0, 1, F), { tone: "mid" }), [A.disc(F, CAR, b0, 1, { name: `${own}.spindle`, owner: own })]);
    const rib = axis === "x" ? knurlX(s, 0) : knurlY(s, 0);
    const knurl = `<g data-knurl="${s}${axis}">${k.fadedSvg(rib, { tone: "lo" })}</g>`;
    put(`${own}.thimble`, G.pointOf(F, MIC.thimble[0] + 3.5, 0, 0), S(disc(MIC.thimble[0], MIC.thimble[1], MIC.rT, F), { tone: "mid", inner: knurl + L(G.arcOf(F, MIC.thimble[0] + 1.2, MIC.rT, P), { tone: "faint" }) }) + S(disc(MIC.cap[0], MIC.cap[1], MIC.rC, F), { tone: "mid", inner: L(G.circleOf(F, MIC.cap[1], MIC.rC - 0.7, P, 20), { tone: "faint" }) }), [A.body(F, [[MIC.thimble[0], MIC.rB], [MIC.thimble[0], MIC.rT], [MIC.thimble[1], MIC.rT], [MIC.thimble[1], 0], [MIC.thimble[0] + MIC.bore, 0], [MIC.thimble[0] + MIC.bore, MIC.rB]], { name: `${own}.thimble`, owner: own }), A.disc(F, MIC.cap[0], MIC.cap[1], MIC.rC, { name: `${own}.cap`, owner: own })], { piece, move, part: live });
  }

  // ------------------------------------------------------------ guide rails and posts over stage A
  {
    const cy = CY.A;
    for (const x of [-32, 32]) for (const y of [cy - 20.4, cy + 20.4]) put(`guide.post${x}${y}`, [x, y, 26], S(cyl(x, y, 1.2, H_TOP, 9), { tone: "mid" }), [A.cylinder(x, y, 1.2, H_TOP, 9, { name: `guide.post${x}${y}` })]);
    for (const side of [-1, 1]) {
      const inner = cy + side * 19;
      const outer = cy + side * 25;
      const lip = { x: -34, y: Math.min(inner, outer), w: 68, d: 6, r: 1 };
      const web = { x: -34, y: side < 0 ? cy - 25 : cy + 23, w: 68, d: 2, r: 0.5 };
      put(`guide.low${side}`, [0, (inner + outer) / 2, 32], S(k.slabOf(lip, 31, 2, P, 2, 0.4), { tone: "mid" }), [A.slab(lip, 31, 2, { name: `guide.low${side}`, owner: `guide${side}` }, 2)]);
      put(`guide.web${side}`, [0, web.y + 1, 34], S(k.slabOf(web, 33, 2, P, 1), { tone: "mid" }), [A.slab(web, 33, 2, { name: `guide.web${side}`, owner: `guide${side}` }, 1)]);
      const idx = side > 0 ? L(k.lineOnTop([0, cy + 19], [0, cy + 21.6], 37, P), { tone: "hi", free: "end" }) : "";
      const plunger = side > 0 ? S(cyl(-20, cy + 22, 1.5, 37, 1.8, 0.3), { tone: "mid" }) + Dt([at([-20, cy + 22, 38.8])], { size: 0.45 }) : "";
      const shapes = [A.slab(lip, 35, 2, { name: `guide.up${side}`, owner: `guide${side}` }, 3)];
      if (side > 0) shapes.push(A.cylinder(-20, cy + 22, 1.5, 37, 1.8, { name: "guide.plunger", owner: "guide1" }));
      put(`guide.up${side}`, [0, (inner + outer) / 2, 36], S(k.slabOf(lip, 35, 2, P, 3, 0.4), { tone: "mid" }) + Dt([-28, 28].map((x) => at([x, (inner + outer) / 2, 37])), { size: 0.45 }) + idx + plunger, shapes);
    }
  }

  // ------------------------------------------------------------ the insert slide (built with window 0 over plate A)
  {
    const cy = CY.A;
    const extra = { piece: "slide", move: [slideX(2), 0, 0], part: "slide" };
    const length = SLIDE_TO - SLIDE_FROM;
    const back = { x: SLIDE_FROM, y: cy - 22, w: length, d: 5, r: 1 };
    const front = { x: SLIDE_FROM, y: cy + WY, w: length, d: 5, r: 1 };
    const ticks = k.topTicks(0, 64.1, 4, 7, cy + WY, SLIDE_TOP, [1, 1.8], P);
    put("slide.back", [29, cy - 19.5, 34], S(k.slabOf(back, SLIDE_Z, SLIDE_TOP - SLIDE_Z, P, 3, 0.4), { tone: "hi", lit: true }), [A.slab(back, SLIDE_Z, SLIDE_TOP - SLIDE_Z, { name: "slide.back", owner: "slide" }, 3)], extra);
    [[SLIDE_FROM, 4], [WX, 4], [PITCH + WX, 4], [2 * PITCH + WX, 6]].forEach(([x0, w], i) => {
      const plan = { x: x0, y: cy - WY, w, d: 2 * WY, r: 0.3 };
      put(`slide.bar${i}`, [x0 + w / 2, cy, 34], S(k.slabOf(plan, SLIDE_Z, SLIDE_TOP - SLIDE_Z, P, 2, 0.3), { tone: "hi", lit: true }) + Dt([at([x0 + w / 2, cy - WY + 3, SLIDE_TOP]), at([x0 + w / 2, cy + WY - 3, SLIDE_TOP])], { size: 0.45 }), [A.slab(plan, SLIDE_Z, SLIDE_TOP - SLIDE_Z, { name: `slide.bar${i}`, owner: "slide" }, 2)], extra);
    });
    // inserts: the FullDelta film (window 1) and the CapMask film (window 2); window 0 is empty
    // each film carries two code bands at its margins (mid layer behind, late layer in front) over the picture field
    const zf = SLIDE_Z + 1.2;
    const band = { mid: cy - 14.2, late: cy + 14.2 };
    const codes = (() => {
      const r = rng(5);
      const pick = () => Array.from({ length: 7 }, () => fixed(-WX + 1.2 + r() * (2 * WX - 2.4))).sort((a, b) => a - b);
      return { mid: pick(), late: pick() };
    })();
    const bandLines = (wc, y) => {
      const out = [k.lineOnTop([wc - WX, y - 0.8], [wc + WX, y - 0.8], zf, P), k.lineOnTop([wc - WX, y + 0.8], [wc + WX, y + 0.8], zf, P)];
      for (let u = -WX + 0.6; u < WX; u += 1.2) out.push(k.lineOnTop([wc + u, y - 0.8], [wc + u, y + 0.8], zf, P));
      return out.join("");
    };
    const film = (wc) => ({ x: wc - WX, y: cy - WY, w: 2 * WX, d: 2 * WY, r: 0.2 });
    const strip = (wc, y) => ({ x: wc - WX, y: y - 1.4, w: 2 * WX, d: 2.8, r: 0.2 });
    const codeDots = (wc, which) => Dt(codes[which].map((u) => at([wc + u, band[which], zf])), { size: 0.5, tone: "hi" });
    // the decoded difference printed in the picture field: opaque spots over two A-only stars, one B-only star printed in
    const marks = (wc) => `<path class="spd-mark" d="${STARS.Am.map(([u, v]) => k.ring(wc + u, cy + v, 1.1, zf, P, 12) + "Z").join("")}"/>` + L(STARS.Am.map(([u, v]) => k.ring(wc + u, cy + v, 1.1, zf, P, 12)).join(""), { tone: "lo" }) + Dt(STARS.Bs.map(([u, v]) => at([wc + u, cy + v, zf])), { size: 0.75, tone: "hi" });
    for (const w of [1, 2]) {
      const wc = w * PITCH;
      const shapes = [A.slab(film(wc), SLIDE_Z + 0.4, 0.8, { name: `slide.insert${w}`, owner: "slide" }, 2)];
      let svg = S(k.slabOf(film(wc), SLIDE_Z + 0.4, 0.8, P, 2), { tone: "hi", className: "spd-film" }) + (w === 1 ? L(bandLines(wc, band.mid) + bandLines(wc, band.late), { tone: "faint" }) : "");
      if (w === 1) svg += codeDots(wc, "mid") + codeDots(wc, "late") + marks(wc);
      else {
        // CapMask: both bands masked off; the late band shows its five features through holes; the field carries no marks
        const holes = [-8.3, -3.9, 0.7, 4.6, 9.1].map((u) => [wc + u, band.late]);
        svg += S(k.slabOf(strip(wc, band.mid), zf, 0.4, P, 2), { tone: "mid", className: "spd-card", crease: "none" }) + S(k.slabOf(strip(wc, band.late), zf, 0.4, P, 2), { tone: "mid", className: "spd-card", crease: "none", inner: holes.map(([x, y]) => `<path class="spd-hole" d="${k.ring(x, y, 0.62, zf + 0.4, P, 12)}Z"/>`).join("") + L(holes.map(([x, y]) => k.ring(x, y, 0.62, zf + 0.4, P, 12)).join(""), { tone: "hi" }) });
        shapes.push(A.slab(strip(wc, band.mid), zf, 0.4, { name: "slide.capmid", owner: "slide" }, 2), A.slab(strip(wc, band.late), zf, 0.4, { name: "slide.caplate", owner: "slide" }, 2));
      }
      put(`slide.insert${w}`, [wc, cy, SLIDE_Z + 0.8], svg, shapes, extra);
    }
    // the VMask flap on the bar after window 1: swung over part of the late band it makes FullDelta - VMask
    const flapPoses = [0, 0.25, 0.5, 0.75, 1].map(flapShape);
    put("slide.flap", [FLAP_PIN[0] - 3, FLAP_PIN[1] - 3, FLAP_Z + 0.3], slotSvg("flap", prismPaths(flapPoses[0]), { tone: "mid" }) + S(cyl(FLAP_PIN[0], FLAP_PIN[1], 1.1, FLAP_Z + 0.5, 0.8), { tone: "mid" }) + Dt([at([FLAP_PIN[0], FLAP_PIN[1], FLAP_Z + 1.3])], { size: 0.45 }), [...flapPoses.map((f, i) => A.prism(f.F, f.poly, f.s0, f.s1, { name: i ? `slide.flap~${i}` : "slide.flap", owner: "slide" })), A.cylinder(FLAP_PIN[0], FLAP_PIN[1], 1.1, FLAP_Z + 0.5, 0.8, { name: "slide.flappin", owner: "slide" })], extra);
    put("slide.front", [29, cy + 19.5, 34], S(k.slabOf(front, SLIDE_Z, SLIDE_TOP - SLIDE_Z, P, 3, 0.4), { tone: "hi", lit: true }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }), [A.slab(front, SLIDE_Z, SLIDE_TOP - SLIDE_Z, { name: "slide.front", owner: "slide" }, 3)], extra);
    const kx = SLIDE_TO - 3;
    put("slide.knob", [kx, cy, SLIDE_TOP + 2.5], S(cyl(kx, cy, 2.4, SLIDE_TOP, 5, 0.4), { tone: "mid" }) + L(k.knurl(kx, cy, 2.4, SLIDE_TOP + 0.4, SLIDE_TOP + 4.6, 16, P), { tone: "lo" }), [A.cylinder(kx, cy, 2.4, SLIDE_TOP, 5, { name: "slide.knob", owner: "slide" })], extra);
  }

  // ------------------------------------------------------------ pillar
  {
    const own = "pillar";
    const screws = [0, 1, 2, 3].map((i) => [9 * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), MID + 9 * Math.sin(Math.PI / 4 + (i * Math.PI) / 2)]);
    const boss = { x: 11.75, y: MID - 2.2, w: 2.75, d: 4.4, r: 0.6 };
    put("pillar.flange", [0, MID, 2], S(k.cylinder(0, MID, 12, 0, 4, P, 24), { tone: "mid" }) + Dt(screws.map(([x, y]) => at([x, y, 4])), { size: 0.5 }) + S(k.slabOf(boss, 0, 4, P, 2, 0.3), { tone: "mid" }), [A.cylinder(0, MID, 12, 0, 4, { name: "pillar.flange", owner: own }), A.slab(boss, 0, 4, { name: "pillar.boss", owner: own }, 2)]);
    put("pillar.column", [0, MID, 50], S(cyl(0, MID, 6, 4, COL_TOP - 4), { tone: "mid", crease: "none", inner: L(k.sideArc(0, MID, 6, 38, P, 20) + k.sideArc(0, MID, 6, 72, P, 20), { tone: "faint" }) }), [A.cylinder(0, MID, 6, 4, COL_TOP - 4, { name: "pillar.column", owner: own })]);
    put("pillar.collar", [0, MID, COL_TOP + 4], S(cyl(0, MID, 8, COL_TOP, BOX_Z - COL_TOP, 0.5), { tone: "mid", inner: L(k.sideArc(0, MID, 8, COL_TOP + 2, P, 24), { tone: "faint" }) }), [A.cylinder(0, MID, 8, COL_TOP, BOX_Z - COL_TOP, { name: "pillar.collar", owner: own })]);
    const Fs = G.frameOf([0, MID + 8, COL_TOP + 4], Y, [-1, 0, 0], Z);
    put("pillar.screw", [0, MID + 11, COL_TOP + 4], S(disc(0, 1.6, 1, Fs), { tone: "mid" }) + S(disc(1.6, 4.6, 2.2, Fs), { tone: "mid", inner: k.fadedSvg(G.ribsOf(Fs, 1.6, 4.6, 2.2, 12, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }), [A.disc(Fs, -0.6, 1.6, 1, { name: "pillar.screwneck", owner: own }), A.disc(Fs, 1.6, 4.6, 2.2, { name: "pillar.screw", owner: own })]);
  }

  // ------------------------------------------------------------ the head: mirror box, arms, elbows, objectives, eyepiece
  {
    const own = "head";
    const sl = (name, plan, z0, z1, tone = "mid", extraSvg = "", steps = 3, bevel = 0.4) => put(`head.${name}`, [plan.x + plan.w / 2, plan.y + plan.d / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone }) + extraSvg, [A.slab(plan, z0, z1 - z0, { name: `head.${name}`, owner: own }, steps)]);
    sl("base", BOX, BOX_Z, BOX_Z + 3, "mid", "", 4, 0.5);
    sl("back", { x: BOX.x, y: BOX.y + 3, w: 3, d: BOX.d - 6, r: 0.3 }, BOX_Z + 3, BOX_TOP - 3);
    sl("wallB", { x: BOX.x, y: BOX.y, w: BOX.w, d: 3, r: 0.4 }, BOX_Z + 3, BOX_TOP - 3);
    const m = mirrorShape(rest.phi);
    // moving parts also record the poses of a whole crank turn, so the settled order holds at every angle
    const turn = sweep ? Array.from({ length: 12 }, (_, i) => linkage((i / 12) * 2 * Math.PI)) : [];
    put("head.mirror", [0, MID, AXLE_Z], slotSvg("mirror", prismPaths(m), { tone: "hi" }), [rest, ...turn].map((pose, i) => {
      const mm = mirrorShape(pose.phi);
      return A.prism(mm.F, mm.poly, mm.s0, mm.s1, { name: i ? `head.mirror~${i}` : "head.mirror", owner: "rocker" });
    }), { live: "mirror" });
    const Fa = G.frameOf([0, MID, AXLE_Z], X, Y, Z);
    sl("wallA", { x: BOX.x, y: BOX.y + BOX.d - 3, w: BOX.w, d: 3, r: 0.4 }, BOX_Z + 3, BOX_TOP - 3);
    // the bearing post under the axle at the open front, low enough that the mirror stays in view; the axle shows either side
    const brg = { x: 9.5, y: MID - 2.2, w: 2.5, d: 4.4, r: 0.6 };
    put("head.bearing", [10.75, MID, (BOX_Z + 3 + AXLE_Z + 2) / 2], S(disc(MIRROR.x1, brg.x, 0.9, Fa), { tone: "mid" }) + S(k.slabOf(brg, BOX_Z + 3, AXLE_Z + 2 - BOX_Z - 3, P, 3, 0.4), { tone: "mid" }) + Dt([at([10.75, MID, AXLE_Z + 2])], { size: 0.4 }) + S(disc(brg.x + brg.w, CAM.x0, 0.9, Fa), { tone: "mid" }), [A.slab(brg, BOX_Z + 3, AXLE_Z + 2 - BOX_Z - 3, { name: "head.bearing", owner: own }, 3), A.disc(Fa, MIRROR.x1, brg.x, 0.9, { name: "head.axleback", owner: own }), A.disc(Fa, brg.x + brg.w, CAM.x0, 0.9, { name: "head.axlefront", owner: own })]);
    sl("top", BOX, BOX_TOP - 3, BOX_TOP, "mid", Dt(k.corners(BOX, 3).map(([x, y]) => at([x, y, BOX_TOP])), { size: 0.45 }), 4, 0.5);

    for (const s of ["A", "B"]) {
      const cy = CY[s];
      const dir = s === "A" ? 1 : -1;
      const wallFace = s === "A" ? BOX.y + BOX.d : BOX.y;
      const F = G.frameOf([0, wallFace, AXLE_Z], [0, dir, 0], X, Z);
      const len = Math.abs(cy - dir * 8 - wallFace);
      put(`head.arm${s}`, G.pointOf(F, len / 2, 0, 0), S(disc(1.2, len - 1.2, 5, F), { tone: "mid", inner: L(G.arcOf(F, len / 2, 5, P), { tone: "faint" }) }), [A.disc(F, 1.2, len - 1.2, 5, { name: `head.arm${s}`, owner: own })]);
      for (const [s0, s1] of [[0, 1.2], [len - 1.2, len]]) put(`head.flange${s}${s0}`, G.pointOf(F, (s0 + s1) / 2, 0, 0), S(disc(s0, s1, 6.6, F), { tone: "mid" }) + Dt(G.dotsOf(F, s1, 5.6, 6, P, { fade: [0.04, 0.42], phase: 0.5 }), { size: 0.4 }), [A.disc(F, s0, s1, 6.6, { name: `head.flange${s}${s0}`, owner: own })]);
      const elbow = { x: -8, y: cy - 8, w: 16, d: 16, r: 2 };
      sl(`elbow${s}`, elbow, 112, 128, "mid", L(k.planOutline(k.insetPlan(elbow, 2.4), 128, P, 3), { tone: "faint" }) + Dt(k.corners(elbow, 2.4).map(([x, y]) => at([x, y, 128])), { size: 0.4 }));
      const part = (name, r, z0, z1, extraSvg = "") => put(`head.${name}${s}`, [0, cy, (z0 + z1) / 2], S(cyl(0, cy, r, z0, z1 - z0, 0.4), { tone: "mid", inner: extraSvg }), [A.cylinder(0, cy, r, z0, z1 - z0, { name: `head.${name}${s}`, owner: own })]);
      part("objtop", 8, 104, 112, L(k.sideArc(0, cy, 8, 106, P, 24), { tone: "faint" }));
      part("objup", 6, 95, 104);
      part("objring", 7.2, 88, 95, L(k.knurl(0, cy, 7.2, 88, 95, 32, P, 0.4), { tone: "lo" }));
      part("objlow", 6, 70, 88, L(k.sideArc(0, cy, 6, 78, P, 24), { tone: "faint" }));
      part("nose", 5.2, 65, 70);
      part("lens", 4.2, 61, 65, L(k.sideArc(0, cy, 4.2, 62.4, P, 20), { tone: "faint" }));
    }
    const ey = (name, r, z0, z1, extraSvg = "") => put(`head.eye${name}`, [0, MID, (z0 + z1) / 2], S(cyl(0, MID, r, z0, z1 - z0, 0.4), { tone: "mid", inner: extraSvg }), [A.cylinder(0, MID, r, z0, z1 - z0, { name: `head.eye${name}`, owner: own })]);
    ey("base", 7, BOX_TOP, BOX_TOP + 2);
    ey("tube", 4.6, BOX_TOP + 2, BOX_TOP + 16, L(k.sideArc(0, MID, 4.6, BOX_TOP + 8, P, 20), { tone: "faint" }));
    ey("focus", 6.2, BOX_TOP + 16, BOX_TOP + 22, L(k.knurl(0, MID, 6.2, BOX_TOP + 16, BOX_TOP + 22, 36, P, 0.4), { tone: "lo" }));
    ey("upper", 4.6, BOX_TOP + 22, BOX_TOP + 26);
    const lens = `<path class="spd-void" d="${k.ring(0, MID, 3.4, BOX_TOP + 30, P, 28)}Z"/>` + L(k.ring(0, MID, 3.4, BOX_TOP + 30, P, 28) + k.ring(0, MID, 4.4, BOX_TOP + 30, P, 28), { tone: "lo" });
    put("head.eyecup", [0, MID, BOX_TOP + 28], S(cyl(0, MID, 5.4, BOX_TOP + 26, 4, 0.4), { tone: "mid" }) + lens, [A.cylinder(0, MID, 5.4, BOX_TOP + 26, 4, { name: "head.eyecup", owner: own })]);

    // crank-rocker on the +x side: crank bracket and disc, detent cam, rocker lever, link, pins, handle, detent plunger
    const [cy0, cz0] = ROCK.C;
    const bracket = { x: 10.6, y: -31, w: 2, d: 12, r: 1 };
    put("head.crankbracket", [11.6, -25, 109], S(k.slabOf(bracket, 105, 8, P, 3, 0.3), { tone: "mid" }) + Dt([at([11.6, -21.5, 113]), at([11.6, -28.5, 113])], { size: 0.4 }), [A.slab(bracket, 105, 8, { name: "head.crankbracket", owner: own }, 3)]);
    const Fc = G.frameOf([0, cy0, cz0], X, Y, Z);
    put("head.crank", [13.3, cy0, cz0], S(disc(12.6, 14, ROCK.c + 1.6, Fc), { tone: "mid", inner: L(G.circleOf(Fc, 14, ROCK.c + 0.6, P, 28), { tone: "faint" }) }) + S(disc(14, 14.6, 1.5, Fc), { tone: "mid" }), [A.disc(Fc, 12.6, 14, ROCK.c + 1.6, { name: "head.crank", owner: "crank" }), A.disc(Fc, 14, 14.6, 1.5, { name: "head.crankhub", owner: "crank" })]);
    put("head.cam", [13.3, MID, AXLE_Z], S(disc(CAM.x0, CAM.x1, CAM.r, Fa), { tone: "mid" }) + `<path class="iso-line" data-tone="lo" data-live="cam" d="${camNotches(rest.phi)}"/>`, [A.disc(Fa, CAM.x0, CAM.x1, CAM.r, { name: "head.cam", owner: "rocker" })], { live: "cam" });
    const detent = { x: 12, y: MID - 2, w: CRANK_FACE - 12, d: 4, r: 0.5 };
    const dz = BOX_Z + 3;
    const tip = AXLE_Z - CAM.r;
    const px = (CAM.x0 + CAM.x1) / 2;
    put("head.detent", [13, MID, dz + 2], S(k.slabOf(detent, dz, 2, P, 2, 0.3), { tone: "mid" }) + S(cyl(px, MID, 0.6, dz + 2, tip - dz - 2), { tone: "mid" }), [A.slab(detent, dz, 2, { name: "head.detent", owner: own }, 2), A.cylinder(px, MID, 0.6, dz + 2, tip - dz - 2, { name: "head.plunger", owner: own })]);
    const lp = linkagePaths(rest);
    const shapesAt = (pose, i) => {
      const tag = i ? `~${i}` : "";
      const lev = leverShape(pose.phi);
      const lk = linkShape(pose.Q, pose.T);
      const fx = (p) => G.frameOf([0, p[0], p[1]], X, Y, Z);
      return [
        A.prism(lev.F, lev.poly, lev.s0, lev.s1, { name: `head.lever${tag}`, owner: "rocker" }),
        A.prism(lk.F, lk.poly, lk.s0, lk.s1, { name: `head.link${tag}`, owner: "rocker" }),
        A.disc(fx(pose.T), LEVER.x0, PIN_HEAD.x0, PIN.r, { name: `head.pinT${tag}`, owner: "rocker" }),
        A.disc(fx(pose.T), PIN_HEAD.x0, PIN_HEAD.x1, PIN_HEAD.r, { name: `head.pinThead${tag}`, owner: "rocker" }),
        A.disc(fx(pose.Q), CRANK_FACE, HANDLE.x0, PIN.r, { name: `head.pinQ${tag}`, owner: "rocker" }),
        A.disc(fx(pose.Q), HANDLE.x0, HANDLE.x1, HANDLE.r, { name: `head.handle${tag}`, owner: "rocker" }),
      ];
    };
    put("head.linkage", [16, rest.Q[0], rest.Q[1]], LINKAGE_SLOTS.map((id) => slotSvg(id, lp[id], { tone: "mid" })).join(""), [rest, ...turn].flatMap(shapesAt), { live: "linkage" });
  }

  // ------------------------------------------------------------ control unit: blink meter, register lamps, lamp switch and dimmer, glands
  {
    const own = "meter";
    const [x, y] = DIAL;
    const U = UNIT;
    let face = S(k.slabOf(U, 0, UNIT_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(U, UNIT_H - 3, P, 4) + k.sideSeam(U, 3, P, 4), { tone: "faint" }) });
    face += Dt(k.corners(U, 3).map(([cx, cy]) => at([cx, cy, UNIT_H])), { size: 0.45 });
    face += L([-13, -6.5, 0, 6.5, 13].map((u) => slot("x", U.x + U.w, U.y + U.d / 2 + u, 6.5, 13.5, 2.4)).join(""), { tone: "lo" });
    put("meter.box", [U.x + U.w / 2, U.y + U.d / 2, 10], face, [A.slab(U, 0, UNIT_H, { name: "meter.box", owner: own }, 4)]);
    const ticks = k.radialTicks(x, y, DIAL_R - 2.8, 30, 10, DIAL_TOP, [1.1, 2.2], P, SCALE_FROM, SCALE_SPAN);
    const pt = (a, r) => [x + Math.sin(a) * r, y - Math.cos(a) * r];
    const scaleArc = Array.from({ length: 37 }, (_, i) => [...pt(SCALE_FROM + (SCALE_SPAN * i) / 36, DIAL_R - 2.8), DIAL_TOP]);
    const [sx, sy] = pt(STOP_ANGLE - 0.095, DIAL_R - 3.6);
    const dial = [
      S(cyl(x, y, DIAL_R, UNIT_H, 5, 0.8), { tone: "mid", crease: "lo" }),
      L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 22, P, 0.3), { tone: "lo" }),
      L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 28), { tone: "faint" }),
      L(k.ring(x, y, DIAL_R - 1.6, DIAL_TOP, P, 44), { tone: "lo" }),
      L(k.pathOf(scaleArc.map(at)), { tone: "lo" }),
      L(ticks.minor, { tone: "lo" }),
      L(ticks.major, { tone: "mid" }),
      L(k.lineOnTop(pt(SCALE_FROM, DIAL_R - 2.8), pt(SCALE_FROM, DIAL_R - 5.6), DIAL_TOP, P), { tone: "hi" }),
      S(cyl(sx, sy, 0.5, DIAL_TOP, 1.6), { tone: "mid" }),
      `<path class="iso-line" data-tone="hi" data-live="needle" data-free="start" style="stroke-width:1.1" d="${needleAt(klAngle(D.inserts[1].kl))}"/>`,
      S(cyl(x, y, 1.5, DIAL_TOP, 0.8), { tone: "mid" }),
      Dt([at([x, y, DIAL_TOP + 0.8])], { size: 0.5, tone: "hi" }),
    ];
    put("meter.dial", [x, y, UNIT_H + 2.5], dial.join(""), [A.cylinder(x, y, DIAL_R, UNIT_H, 5, { name: "meter.dial", owner: own }), A.cylinder(sx, sy, 0.5, DIAL_TOP, 1.6, { name: "meter.stop", owner: own }), A.cylinder(x, y, 1.5, DIAL_TOP, 0.8, { name: "meter.hub", owner: own })]);
    // register lamps on a plate on the top, clear of the slide's sweep
    {
      const lx = 81.5;
      const plate = { x: lx - 3, y: -18.6, w: 6, d: 13.6, r: 1 };
      put("meter.lampplate", [lx, -11.8, UNIT_H + 0.3], S(k.slabOf(plate, UNIT_H, 0.6, P, 2), { tone: "mid" }) + Dt([at([lx, -17.4, UNIT_H + 0.6]), at([lx, -6.2, UNIT_H + 0.6])], { size: 0.4 }), [A.slab(plate, UNIT_H, 0.6, { name: "meter.lampplate", owner: own }, 2)]);
      for (const [tone, ly] of [["green", -14.6], ["red", -9]]) put(`meter.lamp${tone}`, [lx, ly, UNIT_H + 1.1], `<g data-lamp="${tone}"${tone === "green" ? " data-on" : ""}>${S(cyl(lx, ly, 1.5, UNIT_H + 0.6, 1, 0.3), { tone: "mid" })}</g>`, [A.cylinder(lx, ly, 1.5, UNIT_H + 0.6, 1, { name: `meter.lamp${tone}`, owner: own })]);
    }
    // the lamp switch: plate, bush and a lever thrown toward the back (on)
    {
      const [tx, ty] = [81.5, 6];
      const plate = { x: tx - 3, y: ty - 4, w: 6, d: 8, r: 0.8 };
      const Fl = G.frameOf([tx, ty, UNIT_H + 1.8], [0, -0.42, 0.91], X, [0, 0.91, 0.42]);
      put("meter.switch", [tx, ty, UNIT_H + 2], S(k.slabOf(plate, UNIT_H, 0.5, P, 2), { tone: "mid" }) + Dt([at([tx, ty - 2.9, UNIT_H + 0.5]), at([tx, ty + 2.9, UNIT_H + 0.5])], { size: 0.4 }) + S(cyl(tx, ty, 1.5, UNIT_H + 0.5, 1.3), { tone: "mid" }) + S(disc(0, 5, 0.6, Fl), { tone: "mid" }), [A.slab(plate, UNIT_H, 0.5, { name: "meter.switchplate", owner: "meter.switch" }, 2), A.cylinder(tx, ty, 1.5, UNIT_H + 0.5, 1.3, { name: "meter.switchbush", owner: "meter.switch" }), A.disc(Fl, 0, 5, 0.6, { name: "meter.lever", owner: "meter.switch" })]);
    }
    // the lamp dimmer knob on the front face
    {
      const kn = [60, U.y + U.d];
      const Fk = G.frameOf([kn[0], kn[1], 10], Y, [-1, 0, 0], Z);
      const kr = G.ribsOf(Fk, 1.2, 4, 2.8, 12, P, { fade: [0.1, 0.55] });
      put("meter.knob", [kn[0], kn[1] + 2, 10], S(disc(0, 1.2, 2, Fk), { tone: "mid" }) + S(disc(1.2, 4, 2.8, Fk), { tone: "mid", inner: k.fadedSvg(kr, { tone: "lo" }) }) + L(seg(G.pointOf(Fk, 4, 0.6, Math.PI / 2), G.pointOf(Fk, 4, 2.4, Math.PI / 2)), { tone: "hi", free: "end" }), [A.disc(Fk, 0, 1.2, 2, { name: "meter.knobneck", owner: own }), A.disc(Fk, 1.2, 4, 2.8, { name: "meter.knob", owner: own })]);
    }
    // cable glands on the back (-x) face: lamp B, pickoff from the pillar, lamp A
    for (const gy of [-18, MID, 12]) {
      const Fg = G.frameOf([U.x, gy, GLAND_Z], [-1, 0, 0], [0, -1, 0], Z);
      put(`meter.gland${gy}`, [U.x - 1.2, gy, GLAND_Z], S(disc(0, 1, 2, Fg), { tone: "mid" }) + S(disc(1, 2.5, 1.5, Fg), { tone: "mid" }), [A.disc(Fg, 0, 1, 2, { name: `meter.gland${gy}`, owner: `meter.gland${gy}` }), A.disc(Fg, 1, 2.5, 1.5, { name: `meter.glandnut${gy}`, owner: `meter.gland${gy}` })]);
    }
  }

  // ------------------------------------------------------------ cables on the bench: pillar pickoff to the unit, unit to each lamp house
  {
    const gx = UNIT.x - 2.5;
    const hx = HOUSE + 2.5;
    const cable = (name, pts) => {
      const route = G.fillet(pts, 2.6, 7);
      routes.push({ name, points: route, r: 0.7 });
      tubePieces(route, 0.7, P, { maxLength: 9 }).forEach((piece, index) => put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [], { route: name, chunk: index, tube: piece }));
    };
    cable("cable.meter", [[14.5, MID, 2.2], [19, MID, 2.2], [23, MID, 0.7], [40, MID, 0.7], [44.5, MID, GLAND_Z], [gx, MID, GLAND_Z]]);
    cable("cable.lampA", [[hx, 18, GLAND_Z], [hx + 3, 18, GLAND_Z], [gx - 3, 12, GLAND_Z], [gx, 12, GLAND_Z]]);
    cable("cable.lampB", [[hx, -22, GLAND_Z], [hx + 3, -22, GLAND_Z], [gx - 3, -18, GLAND_Z], [gx, -18, GLAND_Z]]);
  }

  // ------------------------------------------------------------ plate box (front right): body, lid, handle, hasp
  {
    const own = "box";
    const [bx, by, bw, bd] = [56, 64, 34, 24];
    const body = { x: bx, y: by, w: bw, d: bd, r: 1.2 };
    const lid = { x: bx - 0.6, y: by - 0.6, w: bw + 1.2, d: bd + 1.2, r: 1.6 };
    const [mx, my] = [bx + bw / 2, by + bd / 2];
    put("box.body", [mx, my, 5.5], S(k.slabOf(body, 0, 10, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(body, 2.4, P, 3), { tone: "faint" }) }), [A.slab(body, 0, 10, { name: "box.body", owner: own }, 3)]);
    put("box.lid", [mx, my, 11.5], S(k.slabOf(lid, 10, 3, P, 3, 0.6), { tone: "mid" }) + Dt(k.corners(lid, 2.4).map(([cx, cy]) => at([cx, cy, 13])), { size: 0.45 }) + L(k.planOutline(k.insetPlan(lid, 4), 13, P, 3), { tone: "faint" }), [A.slab(lid, 10, 3, { name: "box.lid", owner: own }, 3)]);
    const Fh = G.frameOf([0, my, 16.2], X, Y, Z);
    const posts = [mx - 8, mx + 8];
    put("box.handle", [mx, my, 15], posts.map((px) => S(cyl(px, my, 1, 13, 2.4), { tone: "mid" })).join("") + S(disc(mx - 9.4, mx + 9.4, 1.15, Fh), { tone: "mid", inner: L(G.arcOf(Fh, mx - 6, 1.15, P) + G.arcOf(Fh, mx + 6, 1.15, P), { tone: "faint" }) }), [...posts.map((px) => A.cylinder(px, my, 1, 13, 2.4, { name: `box.post${px}`, owner: "box.handle" })), A.disc(Fh, mx - 9.4, mx + 9.4, 1.15, { name: "box.grip", owner: "box.handle" })]);
  }

  // ------------------------------------------------------------ the matched baseline inserts in a slotted rack (back right)
  {
    const [rx, ry] = [48, -86];
    const block = { x: rx, y: ry, w: 34, d: 18, r: 1.2 };
    const slots = [ry + 5, ry + 9, ry + 13];
    put("rack.block", [rx + 17, ry + 9, 3.5], S(k.slabOf(block, 0, 7, P, 3, 0.6), { tone: "mid" }) + L(slots.map((sy) => k.lineOnTop([block.x, sy - 0.7], [block.x + block.w, sy - 0.7], 7, P) + k.lineOnTop([block.x, sy + 0.7], [block.x + block.w, sy + 0.7], 7, P)).join(""), { tone: "lo" }), [A.slab(block, 0, 7, { name: "rack.block", owner: "rack" }, 3)]);
    slots.forEach((sy, i) => {
      const card = { x: rx + 2, y: sy - 0.5, w: 30, d: 1, r: 0 };
      const tab = { x: rx + 4 + 9 * i, y: sy - 0.5, w: 7, d: 1, r: 0 };
      const fy = sy + 0.5;
      const [x0, x1] = [rx + 4.5, rx + 29.5];
      const frame = k.pathOf([[x0, fy, 27.5], [x1, fy, 27.5], [x1, fy, 9.5], [x0, fy, 9.5]].map(at), true);
      const lines = i === 2 ? L(frame + seg([x0, fy, 24.6], [x1, fy, 24.6]) + seg([x0, fy, 12.4], [x1, fy, 12.4]), { tone: "faint" }) : "";
      put(`rack.card${i}`, [rx + 17, sy, 18.5], S(k.slabOf(card, 7, 23, P, 1), { tone: "mid" }) + S(k.slabOf(tab, 30, 2.4, P, 1), { tone: "mid" }) + lines, [A.slab(card, 7, 23, { name: `rack.card${i}`, owner: "rack" }, 1), A.slab(tab, 30, 2.4, { name: `rack.tab${i}`, owner: "rack" }, 1)]);
    });
  }

  // twins: parts that are a rigid translation of a drawn source (art.mjs places them as <use>)
  const byName = new Map(items.map((item) => [item.name, item]));
  const twin = (name, source, shift) => {
    const item = byName.get(name);
    if (item && byName.has(source) && !byName.get(source).twin) Object.assign(item, { twin: source, shift });
  };
  const dB = [0, CY.B - CY.A, 0];
  for (const n of ["house", "diffuser", "glass", "bx0", "by0", "bx1", "by1", "clip-12", "lock"]) twin(`stageB.${n}`, `stageA.${n}`, dB);
  twin("stageB.gland", "stageA.gland", [0, -40, 0]);
  twin("stageA.clip9", "stageA.clip-12", [0, 21, 0]);
  twin("stageB.clip9", "stageA.clip-12", [0, 21 + dB[1], 0]);
  const pins = (s) => items.filter((item) => item.name.startsWith(`stage${s}.pin`));
  const [p0] = pins("A");
  for (const p of [...pins("A").slice(1), ...pins("B")]) twin(p.name, p0.name, [p.at[0] - p0.at[0], p.at[1] - p0.at[1], 0]);
  for (const n of ["elbow", "objtop", "objup", "objring", "objlow", "nose", "lens"]) twin(`head.${n}B`, `head.${n}A`, dB);
  const dArm = [0, CY.B + 8 - (BOX.y + BOX.d), 0]; // arm B starts at elbow B's face where arm A starts at the box face
  twin("head.armB", "head.armA", dArm);
  const flanges = items.filter((item) => /^head\.flange[AB]/.test(item.name));
  for (const f of flanges.filter((g) => g.name.startsWith("head.flangeB"))) {
    const source = flanges.find((g) => g.name.startsWith("head.flangeA") && Math.abs(g.at[1] + dArm[1] - f.at[1]) < 0.01);
    if (source) twin(f.name, source.name, dArm);
  }
  const group = (re) => items.filter((item) => re.test(item.name));
  for (const list of [group(/^stand\.foot/), group(/^guide\.post/), group(/^meter\.gland/)]) for (const f of list.slice(1)) twin(f.name, list[0].name, [f.at[0] - list[0].at[0], f.at[1] - list[0].at[1], 0]);
  twin("slide.bar0", "slide.bar1", [-PITCH, 0, 0]);
  twin("slide.bar2", "slide.bar1", [PITCH, 0, 0]);
  return { items, routes };
}
