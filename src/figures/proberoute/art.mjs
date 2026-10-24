// Fig 10: a cord switchboard that routes a frozen Pythia-1B's layers into four horizon heads.
// Pure ESM, no Node APIs: runs at build time in Astro's frontmatter and in build.mjs.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import D from "./data.mjs";
import * as W from "./world.mjs";
import { stateOf, lampLevel, alphaLevel, headLit, readoutOf } from "./model.mjs";

const { P } = W;
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const r2 = (v) => Math.round(v * 100) / 100;
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const r1 = (v) => Math.round(v * 10) / 10;
const shift = (d) => {
  const [sx, sy] = k.axisVector(P, d);
  return `translate(${r1(sx)} ${r1(sy)})`;
};
const alongY = (o) => G.frameAlong(o, [0, 1, 0]);
const alongZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

// Parts inside <defs> are styled inline: a <use> copy does not match selectors that reach outside it, but it inherits variables.
const HOLE = "fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)";
const RING = "fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)";
const GLOW = "fill:var(--anatomy-lit);stroke:none;opacity:var(--g,0)";
// a lit lamp on paper keeps a pale core, so it reads as light and not as a hole (none in dark)
const CORE = "fill:var(--pr-core,none);stroke:none;opacity:var(--g,0)";

// Repeated parts are drawn once in <defs> and placed with <use>; the flat build inlines them for the line check.
let DEFS = new Map();
let FLAT = false;
const def = (id, svg) => (DEFS.set(id, svg), id);
const place = (id, d, attrs = "") => (FLAT ? `<g transform="${shift(d)}"${attrs}>${DEFS.get(id)}</g>` : `<use href="#${id}" transform="${shift(d)}"${attrs}/>`);
// The flat build also keeps each part's markup under the name proof.mjs records it by, so the audit's stand-in check
// compares what is drawn with the shape that is recorded.
let PARTS = new Map();
const part = (name, svg) => (FLAT && PARTS.set(name, (PARTS.get(name) ?? "") + svg), svg);

// ------------------------------------------------------------------ bench
export const RULER = { x: -106, y: 64, w: 186, d: 6, r: 1 };
export const MAKER = { x: 84, y: 60, w: 42, d: 15, r: 1.4 };
function bench() {
  const { BENCH, BENCH_H, FOOT_H } = W;
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
  def("pr-foot", S(k.cylinder(0, 0, 6, -BENCH_H - FOOT_H, 1.6, P, 22), { tone: "lo" }) + S(k.cylinder(0, 0, 4.7, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 22), { tone: "mid" }));
  for (const [x, y] of byDepth(k.corners(BENCH, 9))) out.push(part(`stand.foot@${x},${y}`, place("pr-foot", [x, y, 0])));
  const screws = k.corners(BENCH, 10.5);
  out.push(part("stand.bench", [
    S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(BENCH, -4.6, P, 8), { tone: "faint" }) }),
    Ln(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }),
    Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }),
    Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  ].join("")));

  // Ruler along the front: a major tick under every layer column, a mid one between.
  const ruler = RULER;
  const mark = [S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const ticks = { minor: [], mid: [], major: [] };
  for (let i = 0; i <= 15 * 4; i++) {
    const x = W.colX(0) + i * 2.75;
    const kind = i % 4 === 0 ? "major" : i % 2 === 0 ? "mid" : "minor";
    const length = { major: 3.6, mid: 2.4, minor: 1.5 }[kind];
    ticks[kind].push(k.lineOnTop([x, ruler.y + 0.3], [x, ruler.y + 0.3 + length], 0.6, P));
  }
  mark.push(Ln(ticks.minor.join("") + ticks.mid.join(""), { tone: "lo" }), Ln(ticks.major.join(""), { tone: "mid" }));
  mark.push(Dt([at([ruler.x + 2.4, ruler.y + 3.6, 0.6]), at([ruler.x + ruler.w - 2.4, ruler.y + 3.6, 0.6])], { size: 0.42 }));
  out.push(part("bench.ruler", mark.join("")));

  // The maker's plate, clear of the bench's corner screw: the mark and three rule lines standing for the engraving.
  const plate = MAKER;
  const pz = 0.8;
  const rules = [[7.6, 26], [10, 20], [12.4, 13]].map(([dy, w]) => k.lineOnTop([plate.x + 8.5, plate.y + dy], [plate.x + 8.5 + w, plate.y + dy], pz, P));
  out.push(part("bench.plate", [
    S(k.slabOf(plate, 0, pz, P, 4), { tone: "mid" }),
    Ln(k.planOutline(k.insetPlan(plate, 1.4), pz, P, 4), { tone: "faint" }),
    k.faceTextSvg(k.topMatrix([plate.x + 8.5, plate.y + 5.2], pz, P, "x"), "AU-10", { size: 3.4, tone: "mid" }),
    Ln(rules.join(""), { tone: "lo", free: true }),
    Dt([at([plate.x + 3.4, plate.y + 3.6, pz]), at([plate.x + 3.4, plate.y + plate.d - 3.6, pz])], { size: 0.45 }),
  ].join("")));
  return out.join("");
}

// ------------------------------------------------------------------ lower cabinet and the counterweights
const BAY_TOP = W.BAY_TOP;
export const { WEIGHT, axleOf, fallsOf, RAIL, RAIL_Z, plugFirst } = W;
export function weightParts() {
  // a cast weight, a neck, a stirrup bar with two cheeks, a double sheave on an axle; the falls rise to the block rail
  const w = W.WEIGHT;
  const b = W.WEIGHT_REST;
  const top = b + w.h;
  const bar = top + w.neck;
  const axle = W.axleOf(b);
  const out = [];
  out.push(S(k.cylinder(0, 0, w.r, b, w.h, P, 18, 0.3), { tone: "mid", inner: Ln(k.sideArc(0, 0, w.r, b + 1.2, P, 12), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, 0.9, top, w.neck, P, 10), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -1.9, y: -1.1, w: 3.8, d: 2.2, r: 0.3 }, bar, w.bar, P, 2), { tone: "lo" }));
  for (const dx of [-1.9, 1.3]) out.push(S(k.slabOf({ x: dx, y: -1.1, w: 0.6, d: 2.2, r: 0.2 }, bar + w.bar, w.cheek, P, 2), { tone: "lo" }));
  for (const dx of [-0.75, 0.75]) out.push(S(G.disc(-0.45, 0.45, w.sheave, G.frameAlong([dx, 0, axle], [1, 0, 0]), P, { steps: 20 }), { tone: "hi" }));
  out.push(Dt([at([1.9, 0, axle])], { size: 0.5, tone: "hi" }));
  return out.join("");
}
function lowerCabinet(state) {
  const out = [];
  out.push(part("cab.plinth", S(k.slabOf({ x: -115, y: -47, w: 230, d: 89, r: 1.5 }, 0, W.PLINTH_H, P, 3, 0.4), { tone: "lo" })));
  out.push(`<g class="pr-bay">`);
  out.push(part("cab.cheekL", S(k.slabOf({ x: -117, y: -48, w: 8, d: 92, r: 1 }, W.PLINTH_H, BAY_TOP - W.PLINTH_H, P, 3, 0.5), { tone: "mid" })));
  out.push(part("cab.back", S(k.slabOf({ x: -109, y: -48, w: 218, d: 5, r: 0.5 }, W.PLINTH_H, BAY_TOP - W.PLINTH_H, P, 2), { tone: "lo" })));
  // the block rail under the shelf that the falls hang from
  const order = W.SEATS.map((s, i) => i).sort((a, b) => k.depthOf([W.SEATS[a].x, W.SEATS[a].y, 0], P) - k.depthOf([W.SEATS[b].x, W.SEATS[b].y, 0], P));
  def("pr-weight", weightParts());
  for (const i of order) {
    const lift = state.lift[i];
    out.push(part(`weight${i}`, `<g data-weight="${i}"><path class="pr-strand" data-strands="${i}" d="${W.fallsD(i, lift)}"/>${place("pr-weight", [W.SEATS[i].x, W.SEATS[i].y, lift], ` data-block="${i}"`)}</g>`));
  }
  out.push(part("cab.rail", S(k.slabOf(W.RAIL, W.RAIL_Z, 2.2, P, 2), { tone: "lo" })));
  out.push(`</g>`);
  out.push(part("cab.kick", S(k.slabOf({ x: -109, y: 40, w: 218, d: 4, r: 0.6 }, W.PLINTH_H, 5.4, P, 2, 0.4), { tone: "mid" }) + Dt([at([-104, 44, 8]), at([104, 44, 8])], { size: 0.45 })));
  out.push(part("cab.cheekR", [
    S(k.slabOf({ x: 109, y: -48, w: 8, d: 92, r: 1 }, W.PLINTH_H, BAY_TOP - W.PLINTH_H, P, 3, 0.5), { tone: "mid" }),
    `<g transform="${k.sideMatrix([117, 0], 0, P, "right")}">${Ln(k.pathOf(k.roundedPlan({ x: -40, y: 10, w: 84, d: 30, r: 2 }, 4).map(([u, v]) => [u, -v]), true), { tone: "faint" })}</g>`,
    Dt([[-43, 13], [41, 13], [-43, 37], [41, 37]].map(([y, z]) => at([117, y, z])), { size: 0.45 }),
  ].join("")));
  return out.join("");
}

// ------------------------------------------------------------------ keyshelf
function shelf() {
  const out = [];
  out.push(S(k.slabOf(W.SHELF, W.SHELF_Z - 5, 5, P, 3, 0.6), { tone: "mid" }));
  // one inlaid position plate per horizon head, carrying its four seats, their lamps and its two keys
  for (const h of [3, 2, 1, 0]) {
    const pl = plateOf(h);
    out.push(Ln(k.planOutline(pl, W.SHELF_Z, P, 3), { tone: "lo" }));
    out.push(Dt(k.corners(pl, 1.6).map(([x, y]) => at([x, y, W.SHELF_Z])), { size: 0.42 }));
  }
  return part("shelf", out.join(""));
}
export const plateOf = (h) => ({ x: W.groupX(h) - 3.6, y: W.seatY(h) - 4.4, w: 25.2, d: 21.4, r: 1.2 });
function armrest() {
  return part("shelf.arm", S(k.slabOf(W.ARM, W.SHELF_Z - 5.4, 6.8, P, 8, 1.4), { tone: "mid", inner: Ln(k.sideSeam(W.ARM, W.SHELF_Z - 2.6, P, 8), { tone: "faint" }) }));
}

// ------------------------------------------------------------------ upper cabinet and the jack field
function jackDef() {
  const F = alongY([0, W.JACK_FRONT, 0]);
  const hole = G.circleOf(F, W.BUSH, 1.1, P, 28);
  return [
    S(G.disc(0, W.BUSH, 2.05, F, P, { steps: 36 }), { tone: "mid" }),
    `<path style="${RING}" d="${G.circleOf(F, W.BUSH, 1.62, P, 32)}"/>`,
    `<path style="${HOLE}" d="${hole}"/>`,
  ].join("");
}
function lampDef(r = 2.3) {
  // a bezel ring and a domed lens; the lens is a ball whose outline lies inside the bezel face
  const F = alongY([0, W.LAMP_FRONT, 0]);
  const lens = 0.66 * r;
  // the lens outline stays dim; the glow alone carries the level
  const V = G.frameAlong([0, W.LAMP_FRONT + 0.8, 0], G.viewOf(P));
  return [
    S(G.disc(0, 0.8, r, F, P, { steps: 36 }), { tone: "mid" }),
    S(G.sphereOf([0, W.LAMP_FRONT + 0.8, 0], lens, P, { steps: 32 }), { tone: "lo" }),
    `<path style="${GLOW}" d="${G.circleOf(V, 0.2 * lens, 0.86 * lens, P, 28)}"/>`,
    `<path style="${CORE}" d="${G.circleOf(V, 0.3 * lens, 0.3 * lens, P, 16)}"/>`,
  ].join("");
}
export const DESIG = [-6.9, -4.9];
export const FASCIA_Z = 65;
export const DIVIDER = { x: 78.2, y: W.FACE_Y, w: 3.6, d: W.JACK_FRONT + 0.6 - W.FACE_Y, r: 0.6 };
function upperCabinet(state) {
  const out = [];
  const z0 = W.SHELF_Z;
  const H = W.TOP_Z - z0;
  out.push(part("cab.stileL", S(k.slabOf({ x: -116, y: -44, w: 12, d: 42, r: 0 }, z0, H, P, 2), { tone: "mid" })));
  out.push(part("cab.plate", S(k.slabOf({ x: -104, y: -44, w: 208, d: 42, r: 0 }, z0, H, P, 2), { tone: "lo" })));
  // fascia under the field: a long designation rail with its card slots
  const rail = { x: -101, y: W.FACE_Y, w: 202, d: 1.2, r: 0.4 };
  const fascia = [S(k.slabOf(rail, FASCIA_Z, 5, P, 2, 0.3), { tone: "mid" })];
  for (const [x0, x1] of [[-99, -27], [-25, 47], [49, 99]]) {
    fascia.push(`<g transform="${k.sideMatrix([0, W.FACE_Y + 1.2], 0, P, "left")}">${Ln(`M${x0} ${-(FASCIA_Z + 1.4)}H${x1}V${-(FASCIA_Z + 3.6)}H${x0}Z`, { tone: "faint" })}</g>`);
  }
  fascia.push(Dt([at([-100, W.FACE_Y + 1.2, FASCIA_Z + 2.5]), at([100, W.FACE_Y + 1.2, FASCIA_Z + 2.5])], { size: 0.42 }));
  out.push(part("cab.fascia", fascia.join("")));
  // the stiles stand 4 proud of the plate; behind the plate's face only their outer sides show, so the left stile's
  // inner cheek is drawn for the proud part alone, before the strips that sit to its right
  const left = { x: -116, y: W.FACE_Y, w: 12, d: W.STILE_Y - W.FACE_Y, r: 0 };
  out.push(part("cab.stileLfront", S(k.slabOf(left, z0, H, P, 2, 0.4), { tone: "mid" }) + Dt([at([-110, W.STILE_Y, z0 + 14]), at([-110, W.STILE_Y, W.TOP_Z - 10])], { size: 0.45 })));

  // jack and lamp strips, one pair per horizon row, the head column beside them behind a divider: one row drawn once
  const row = [];
  const head = [];
  for (const [x0, x1, into] of [[-102, 77, row], [83, 101, head]]) {
    into.push(S(k.slabOf({ x: x0, y: W.FACE_Y, w: x1 - x0, d: W.LAMP_FRONT - W.FACE_Y, r: 0.4 }, 8.6 - 3.5, 7, P, 2, 0.3), { tone: "mid" }));
    into.push(S(k.slabOf({ x: x0, y: W.FACE_Y, w: x1 - x0, d: W.JACK_FRONT - W.FACE_Y, r: 0.4 }, -4.1, 8.2, P, 2, 0.3), { tone: "mid" }));
    into.push(Dt([at([x0 + 2, W.LAMP_FRONT, 8.6]), at([x1 - 2, W.LAMP_FRONT, 8.6]), at([x0 + 2, W.JACK_FRONT, 0]), at([x1 - 2, W.JACK_FRONT, 0])], { size: 0.42 }));
  }
  // designation strip under the jacks: a card holder ruled into one cell per layer
  row.push(S(k.slabOf({ x: -101, y: W.FACE_Y, w: 177, d: 0.9, r: 0.3 }, DESIG[0], DESIG[1] - DESIG[0], P, 2), { tone: "lo" }));
  const cells = [];
  for (let l = 1; l < W.L; l++) cells.push(k.segment([W.colX(l) - 5.5, W.FACE_Y + 0.9, DESIG[0]], [W.colX(l) - 5.5, W.FACE_Y + 0.9, DESIG[1]], P));
  row.push(Ln(cells.join(""), { tone: "faint" }));
  def("pr-jack", jackDef());
  for (let l = 0; l < W.L; l++) row.push(place("pr-jack", [W.colX(l), 0, 0]));
  head.push(place("pr-jack", [W.HEAD_X, 0, 0]));
  def("pr-row", row.join(""));
  def("pr-headrow", head.join(""));
  for (let h = 0; h < W.H; h++) out.push(part(`field.row${h}`, place("pr-row", [0, 0, W.jackZ(h)])));
  out.push(part("field.divider", S(k.slabOf(DIVIDER, W.jackZ(3) - 7.8, W.lampZ(0) + 4.6 - (W.jackZ(3) - 7.8), P, 2, 0.4), { tone: "mid" })));
  for (let h = 0; h < W.H; h++) out.push(part(`field.head${h}`, place("pr-headrow", [0, 0, W.jackZ(h)])));

  // lamps
  def("pr-lamp", lampDef());
  const lamps = [];
  for (let h = 0; h < W.H; h++) {
    for (let l = 0; l < W.L; l++) {
      lamps.push(part(`lamp${h}@${W.colX(l)}`, place("pr-lamp", [W.colX(l), 0, W.lampZ(h)], ` data-lamp="${h * W.L + l}" style="--g:${r2(lampLevel(state, h, l))}"`)));
    }
    lamps.push(part(`lamp${h}@${W.HEAD_X}`, place("pr-lamp", [W.HEAD_X, 0, W.lampZ(h)], ` data-head-lamp="${h}" style="--g:${headLit(state, h) ? 1 : 0}"`)));
  }
  out.push(`<g class="pr-field">${lamps.join("")}</g>`);

  // right stile, cornice
  const right = { x: 104, y: -44, w: 12, d: 46, r: 1.2 };
  // the right cheek of the upper cabinet: an inset access panel with four screws
  const side = (x, y0, y1, z0, z1) => `<g transform="${k.sideMatrix([x, 0], 0, P, "right")}">${Ln(k.pathOf(k.roundedPlan({ x: -y1, y: z0, w: y1 - y0, d: z1 - z0, r: 2 }, 4).map(([u, v]) => [u, -v]), true), { tone: "faint" })}</g>`;
  out.push(part("cab.stileR", [
    S(k.slabOf(right, z0, H, P, 3, 0.6), { tone: "mid", inner: Ln(k.sideSeam(right, z0 + 6, P, 3), { tone: "faint" }) }),
    Dt([at([110, W.STILE_Y, z0 + 14]), at([110, W.STILE_Y, W.TOP_Z - 10])], { size: 0.45 }),
    side(116, -40, -2, 64, 160),
    Dt([[-37, 67], [-5, 67], [-37, 157], [-5, 157]].map(([y, z]) => at([116, y, z])), { size: 0.45 }),
  ].join("")));
  const cornice = { x: -119, y: -47, w: 238, d: 52, r: 1.6 };
  out.push(part("cab.cornice", S(k.slabOf(cornice, W.TOP_Z, 5, P, 3, 0.8), { tone: "mid", inner: Ln(k.sideSeam(cornice, W.TOP_Z + 1.6, P, 3), { tone: "faint" }) })));
  const cap = { x: -114, y: -42, w: 228, d: 42, r: 1.2 };
  const capZ = W.CAP_TOP;
  // vent slots along the back of the cap, behind the comb tray, and the cap's corner screws
  const slots = [];
  for (let i = 0; i < 24; i++) slots.push(k.planOutline({ x: -104 + i * 8.7, y: -36.5, w: 1.6, d: 14, r: 0.8 }, capZ, P, 3));
  out.push(part("cab.cap", [
    S(k.slabOf(cap, W.TOP_Z + 5, 2.4, P, 3, 0.5), { tone: "mid" }),
    Ln(slots.join(""), { tone: "lo" }),
    Ln(k.planOutline(k.insetPlan(cap, 4), capZ, P, 3), { tone: "faint" }),
    Dt(k.corners(cap, 2.2).map(([x, y]) => at([x, y, capZ])), { size: 0.45 }),
  ].join("")));
  return out.join("");
}

// ------------------------------------------------------------------ the cords
export function plugSvg(pose, lit = false) {
  const paths = W.plugPaths(pose);
  return paths ? S(paths, { tone: "hi", lit }) : "";
}
// The two resting shapes of a plug, seated in a jack and standing in its cup, are drawn once.
const PLUG_IN = W.jackPose(0, 0);
const PLUG_OUT = W.stowPose(0);
function plugPlaced(seat, pose) {
  const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-6;
  if (same(pose.axis, PLUG_IN.axis) && Math.abs(pose.tip[1] - PLUG_IN.tip[1]) < 1e-6) return place("pr-plug-in", G.sub3(pose.tip, PLUG_IN.tip));
  if (same(pose.axis, PLUG_OUT.axis) && same(pose.tip, W.stowPose(seat).tip)) return place("pr-plug-out", G.sub3(pose.tip, PLUG_OUT.tip));
  // anything else is in the air: drawn in place
  return plugSvg(pose);
}
// A cord is one centre line drawn twice, a wide edge stroke and a narrower body stroke inside it; the page moves the line.
export const CORD_STYLE = "fill:none;vector-effect:none;stroke-linejoin:round;stroke-linecap:butt";
export function cordSvg(route) {
  const d = W.cordD(route);
  return `<path class="pr-cord-edge" stroke-width="${r2(W.CORD_W)}" style="${CORD_STYLE}" d="${d}"/><path class="pr-cord-body" stroke-width="${r2(W.CORD_W - 1.2)}" style="${CORD_STYLE}" d="${d}"/>`;
}
// Seat cups: the whole cup with its bore cut out is drawn before the cords, and its front half again right after its
// own cord, so a cord going down into the bore passes in front of the far wall and behind the near one.
function cupSvg() {
  const c = k.cylinder(0, 0, W.CUP_R, W.SHELF_Z, W.CUP_TOP - W.SHELF_Z, P, 28, 0.3);
  const bore = k.ring(0, 0, BORE, W.CUP_TOP, P, 28);
  return [
    `<path class="iso-fill" fill-rule="evenodd" d="${c.fill}${bore}"/>`,
    ...c.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")),
    `<path class="iso-top" fill-rule="evenodd" d="${c.top}${bore}"/>`,
    `<path class="iso-line iso-crease" data-tone="faint" d="${c.crease}"/>`,
    `<path class="iso-line" data-tone="lo" d="${bore}"/>`,
    `<path class="iso-line iso-edge" data-tone="mid" d="${c.outline}"/>`,
  ].join("");
}
export const BORE = 2.15;
function cupDefs() {
  const [cx, cy] = at([0, 0, W.CUP_TOP]);
  def("pr-cup", `<g class="iso-solid"><path style="${HOLE}" d="${k.ring(0, 0, BORE, W.CUP_TOP, P, 28)}"/>${cupSvg()}</g>`);
  def("pr-cupfront", `<clipPath id="pr-cupclip"><rect x="${r1(cx - 9)}" y="${r1(cy)}" width="18" height="14"/></clipPath><g class="iso-solid" clip-path="url(#pr-cupclip)">${cupSvg()}</g>`);
}
function cordLayer(state) {
  cupDefs();
  def("pr-plug-in", plugSvg(PLUG_IN));
  def("pr-plug-out", plugSvg(PLUG_OUT));
  const pegs = W.pegsOf(state.poses);
  const items = W.SEATS.map((s, i) => {
    const pose = state.poses[i];
    const route = W.cordRoute(i, pose, pegs);
    const cord = `<g class="pr-cord" data-tube>${route ? part(`cord${i}`, cordSvg(route)) : cordSvg(route)}</g>`;
    const plug = `<g data-plug>${part(`plug${i}`, plugPlaced(i, pose))}</g>`;
    const at0 = [W.SEATS[i].x, W.SEATS[i].y, 0];
    return `<g data-cord="${i}">${part(`cup${i}`, place("pr-cup", at0))}${W.plugFirst(pose) ? plug + cord : cord + plug}${part(`cupfront${i}`, place("pr-cupfront", at0))}</g>`;
  });
  return `<g class="pr-cords">${state.order.map((i) => items[i]).join("")}</g>`;
}

// ------------------------------------------------------------------ the dense combs and their tray on the cap
export const TRAY = { x: W.COMB.x0 - 2.5, y: W.RACK_Y - 11.5, w: W.COMB.x1 - W.COMB.x0 + 5, d: 15.2, r: 1.2 };
export const BAR = { x: W.COMB.x0, y: 0, w: W.COMB.x1 - W.COMB.x0, d: W.COMB.d, r: 0.6 };
function combDef(lit) {
  // drawn with the bar's back face at y = 0 and its centre at z = 0: the gang plugs behind the bar, left to right, then
  // the bar with its inlaid bus strip and two screws
  const C = W.COMB;
  const gangs = W.COMB_XS.map((x) => place(lit ? "pr-gang-lit" : "pr-gang", [x, 0, 0])).join("");
  const z = C.h / 2;
  const bar = S(k.slabOf(BAR, -z, C.h, P, 2, 0.4), { tone: lit ? "hi" : "mid", lit });
  const strip = Ln(k.planOutline({ x: C.x0 + 4.5, y: 0.75, w: C.x1 - C.x0 - 9, d: 1.1, r: 0.5 }, z, P, 2), { tone: lit ? "mid" : "lo" });
  const screws = Dt([at([C.x0 + 2.2, C.d / 2, z]), at([C.x1 - 2.2, C.d / 2, z])], { size: 0.42 });
  return gangs + bar + strip + screws;
}
function combs(state) {
  def("pr-gang", S(G.solidOf(W.GANG, G.frameAlong([0, -W.COMB.reach, 0], [0, 1, 0]), P, { steps: 18 }), { tone: "hi" }));
  def("pr-gang-lit", S(G.solidOf(W.GANG, G.frameAlong([0, -W.COMB.reach, 0], [0, 1, 0]), P, { steps: 18 }), { tone: "hi", lit: true }));
  def("pr-comb", combDef(false));
  def("pr-comb-lit", combDef(true));
  const tz = W.CAP_TOP;
  const tray = [
    S(k.slabOf(TRAY, tz, W.TRAY_Z - tz, P, 3, 0.2), { tone: "lo" }),
    Dt(k.corners(TRAY, 1.6).map(([x, y]) => at([x, y, W.TRAY_Z])), { size: 0.42 }),
  ].join("");
  const items = W.combOrder(state.comb).map((h) => {
    const [y, z] = W.combAt(h, state.comb[h]);
    const home = state.comb[h] >= W.combTime(h);
    return part(`comb${h}`, place(home ? "pr-comb-lit" : "pr-comb", [0, y, z], ` data-comb="${h}"`));
  });
  return `<g class="pr-combs">${part("comb.tray", tray)}${items.join("")}</g>`;
}
// ------------------------------------------------------------------ shelf furniture in front of the seats
function cordLampDef() {
  const F = alongZ([0, 0, W.SHELF_Z]);
  return [
    S(G.disc(0, 0.9, 1.75, F, P, { steps: 28 }), { tone: "mid" }),
    S(G.sphereOf([0, 0, W.SHELF_Z + 0.9], 1.1, P, { steps: 24 }), { tone: "hi" }),
    `<path style="${GLOW}" d="${G.circleOf(G.frameAlong([0, 0, W.SHELF_Z + 0.9], G.viewOf(P)), 0.2, 0.95, P, 24)}"/>`,
  ].join("");
}
export const LAMP_DY = 5.5; // a seat's lamp stands this far in front of it
function cordLamps(state) {
  def("pr-clamp", cordLampDef());
  const items = W.SEATS.map((s, i) => i).sort((a, b) => k.depthOf([W.SEATS[a].x, W.SEATS[a].y, 0], P) - k.depthOf([W.SEATS[b].x, W.SEATS[b].y, 0], P));
  return items.map((i) => part(`clamp${i}`, place("pr-clamp", [W.SEATS[i].x, W.SEATS[i].y + LAMP_DY, 0], ` class="pr-lamp" data-alpha="${i}" style="--g:${r2(alphaLevel(state, i))}"`))).join("");
}
// Lever keys: an escutcheon plate and a lever with a flat handle, thrown back, upright or forward.
export const KEY_Y = 42; // the three board keys
export const KEY_DY = 12; // a head's keys stand this far in front of its seats
export const KEYS = [
  ...[3, 2, 1, 0].flatMap((h) => {
    const cx = W.groupX(h) + 9;
    const y = W.seatY(h) + KEY_DY;
    return [
      { id: `listen-${h}`, x: cx - 4.2, y, head: h, kind: "listen" },
      { id: `ring-${h}`, x: cx + 4.2, y, head: h, kind: "ring" },
    ];
  }),
  { id: "probe", x: -77, y: KEY_Y, kind: "probe" },
  { id: "init", x: -62, y: KEY_Y, kind: "init" },
  { id: "mix", x: -47, y: KEY_Y, kind: "mix" },
];
export const KEY_PLATE = { x: -2.4, y: -3.5, w: 4.8, d: 7, r: 0.8 };
export const leverAxis = (throw_) => [0, Math.sin((throw_ * 24 * Math.PI) / 180), Math.cos((throw_ * 24 * Math.PI) / 180)];
export function leverSvg(x, throw_) {
  const angle = (throw_ * 24 * Math.PI) / 180;
  const base = [x, 0, W.SHELF_Z + 1.6];
  const a = [0, Math.sin(angle), Math.cos(angle)];
  const F = G.frameOf(base, a, [1, 0, 0], G.cross3(a, [1, 0, 0]));
  const stem = G.disc(0, 6.4, 0.5, F, P, { steps: 14 });
  const grip = G.sphereOf(G.add3(base, G.mul3(a, 7.3)), 1.25, P, { steps: 20 });
  return S(stem, { tone: "mid" }) + S(grip, { tone: "hi" });
}
// The token counter: how many training tokens the router has seen, in millions.
export const COUNTER = { x: -108, y: 23, w: 25, d: 13, r: 1.2, h: 9.5 };
export const COUNTER_WIN = { x0: -104.6, x1: -86.4, z0: W.SHELF_Z + 2.6, z1: W.SHELF_Z + 7.2 };
function counter(state) {
  const c = COUNTER;
  const front = c.y + c.d;
  const w = COUNTER_WIN;
  const out = [S(k.slabOf(c, W.SHELF_Z, c.h, P, 3, 0.6), { tone: "mid", inner: Ln(k.sideSeam(c, W.SHELF_Z + 1.4, P, 3), { tone: "faint" }) })];
  const plane = k.sideMatrix([0, front], 0, P, "left");
  const box = k.pathOf(k.roundedPlan({ x: w.x0, y: w.z0, w: w.x1 - w.x0, d: w.z1 - w.z0, r: 0.8 }, 3).map(([u, v]) => [u, -v]), true);
  // four drums, one digit on each, the count in millions of tokens
  const pitch = (w.x1 - w.x0) / 4;
  const cells = [1, 2, 3].map((i) => `M${(w.x0 + i * pitch).toFixed(1)} ${-w.z0}V${-w.z1}`).join("");
  const xs = [0, 1, 2, 3].map((i) => (w.x0 + (i + 0.5) * pitch).toFixed(1)).join(" ");
  out.push(`<g transform="${plane}"><path style="fill:var(--anatomy-shade-0)" d="${box}"/>${Ln(cells, { tone: "faint" })}<text class="pr-digits" data-counter x="${xs}" y="${(-w.z0 - 1.05).toFixed(1)}" text-anchor="middle" font-size="3.4">${counterText(state)}</text>${Ln(box, { tone: "lo" })}</g>`);
  out.push(Dt([at([c.x + 3, c.y + 3, W.SHELF_Z + c.h]), at([c.x + c.w - 3, c.y + 3, W.SHELF_Z + c.h]), at([c.x + 3, c.y + c.d - 3, W.SHELF_Z + c.h]), at([c.x + c.w - 3, c.y + c.d - 3, W.SHELF_Z + c.h])], { size: 0.45 }));
  // a knurled reset knob on the counter's side
  const KF = G.frameAlong([c.x + c.w, c.y + c.d / 2, W.SHELF_Z + 5], [1, 0, 0]);
  out.push(S(G.disc(0, 2.2, 2.2, KF, P, { steps: 28 }), { tone: "mid", inner: Ln(G.ribsOf(KF, 0.35, 1.85, 2.2, 28, P, { seams: true }), { tone: "lo" }) }));
  return part("counter", out.join(""));
}
export const counterText = (state) => String(Math.round(state.tokens ?? 0)).padStart(4, "0");

function keys(state) {
  def("pr-keyplate", [
    S(k.slabOf(KEY_PLATE, W.SHELF_Z, 0.8, P, 3, 0.3), { tone: "lo" }),
    Dt([at([0, -2.5, W.SHELF_Z + 0.8]), at([0, 2.5, W.SHELF_Z + 0.8])], { size: 0.42 }),
    S(k.cylinder(0, 0, 1.2, W.SHELF_Z + 0.8, 0.8, P, 16), { tone: "mid" }),
  ].join(""));
  for (const t of [-1, 0, 1]) def(`pr-lever${t}`, leverSvg(0, t));
  const out = [];
  const order = [...KEYS].sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P));
  for (const key of order) {
    const positions = [-1, 0, 1].map((t) => place(`pr-lever${t}`, [key.x, key.y, 0], ` data-pos="${t}"${t === (state.keys[key.id] ?? 0) ? "" : ' style="display:none"'}`));
    out.push(part(`key.${key.id}`, place("pr-keyplate", [key.x, key.y, 0]) + `<g class="pr-key" data-key="${key.id}"><g class="pr-lever">${positions.join("")}</g></g>`));
  }
  return out.join("");
}

// ------------------------------------------------------------------ the plate
export const TITLE = "Cord switchboard";
export const HINT = "Probe · patch a head · bus the rows";
export const LABEL =
  "A cord switchboard on a bench: a jack field of sixteen columns, one per layer of a frozen Pythia-1B, and four rows, one per prediction horizon, with a lamp over each jack and a head jack at the end of each row. Each horizon head has four cords on its own position plate, patched into the layers its router reads; counterweights hang under the shelf. Four comb bars lie on a tray on the cabinet cap: in dense mode each one drops into a row and plugs every jack in it to the head. Lever keys run the probe pass, the router initialisation and the dense or sparse changeover.";
export const CAPTION =
  "ProbeRoute keeps Pythia-1B frozen, probes each of its 16 layers for how well it predicts the token h steps ahead, and uses those probe scores to initialise a sparse router that reads four layers for each horizon head. On this board each column of jacks is a layer and each row a horizon: the lamps show probe top-1, which peaks at layer 13 for h = 1 and moves earlier, to layers 10, 9 and 9, as the horizon grows, and the cords are the four layers each head's trained router reads. After 50M training tokens the sparse router reaches a mean top-1 of 0.1172 over horizons 2 to 4 and a mean accepted-prefix length of 1.1188, against 0.1162 and 1.1110 for the strongest selected dense baseline, which mixes all 16 layers and appears on the board as the comb bars.";
export const KEYS_LEGEND = [
  { mark: "lit", label: "lamp: probe top-1, scaled within each horizon" },
  { mark: "raised", label: "cord: a layer the trained router reads, m = 4 per head" },
  { mark: "flat", label: "shelf lamp: learned router weight" },
  { mark: "dim", label: "comb bar: dense mix over all 16 layers" },
];
export const ARIA =
  "Cord switchboard. P, or a click on the jack field, runs the probe pass. 1 to 4, or a head's position plate, patch or pull that head's cords. L, or a head's column in the field, listens on a head. R, or the token counter, switches probe-init and random-init. D, the comb tray or the lower bay switches dense and sparse. Escape resumes the tour.";

// Hit areas, drawn last and transparent: each lever key gets a pad, and the big parts act as keys too.
function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => list.reduce((out, p) => {
    while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
    return [...out, p];
  }, []);
  const lower = half(pts);
  const upper = half([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const hitPath = (points) => `M${hull(points.map(at)).map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L")}Z`;
const boxHit = (plan, z0, z1) => hitPath(k.boxCorners(plan, z0, z1));
const faceHit = (x0, x1, z0, z1, y = W.JACK_FRONT) => hitPath([[x0, y, z0], [x1, y, z0], [x0, y, z1], [x1, y, z1]]);
function hits() {
  const out = [];
  const add = (act, d) => out.push(`<path class="pr-hit" data-act="${act}" d="${d}"/>`);
  add("mix", boxHit({ x: -120, y: 40, w: 240, d: 16, r: 0 }, -2, W.SHELF_Z + 1.4)); // the lower bay and the armrest
  add("mix", boxHit(TRAY, W.CAP_TOP, W.rackZ(3) + 1.5)); // the comb tray
  add("probe", faceHit(-102, 77, W.jackZ(3) - 6, W.lampZ(0) + 4.5)); // the jack field
  for (let h = 0; h < W.H; h++) add(`listen-${h}`, faceHit(83, 101, W.jackZ(h) - 5.2, W.lampZ(h) + 4.6)); // a head's column
  const C = COUNTER;
  add("init", boxHit({ x: C.x - 1, y: C.y - 1, w: C.w + 4, d: C.d + 2, r: 0 }, W.SHELF_Z, W.SHELF_Z + C.h)); // the counter
  for (const h of [3, 2, 1, 0]) add(`ring-${h}`, boxHit(plateOf(h), W.SHELF_Z, W.SHELF_Z + 4)); // a head's position plate
  // the lever keys themselves, on top
  for (const key of KEYS) {
    const pad = key.kind === "listen" || key.kind === "ring" ? { x: key.x - 3.8, y: key.y - 4.5, w: 7.6, d: 9 } : { x: key.x - 7, y: key.y - 6.5, w: 14, d: 13 };
    add(key.id, boxHit({ ...pad, r: 0 }, W.SHELF_Z, W.SHELF_Z + 9));
  }
  return out.join("");
}

// Path data in relative steps between the same tenth-unit points (exact, no drift): the page's markup budget.
const num = (t) => {
  const neg = t < 0;
  const a = Math.abs(t);
  const str = a % 10 === 0 ? String(a / 10) : (a < 10 ? "." + a : String(Math.floor(a / 10)) + "." + (a % 10));
  return (neg ? "-" : "") + str;
};
export function minifyD(d) {
  if (/[^MLZ0-9.\-\s,]/.test(d)) return d;
  const tokens = d.match(/[MLZ]|-?[0-9]*\.?[0-9]+/g) || [];
  let out = "";
  let cur = [0, 0];
  let start = [0, 0];
  let cmd = "";
  let last = "";
  let sub = null; // the subpath being written: [head, segments, had]
  const flush = () => {
    if (!sub) return;
    out += sub.head + (sub.segs.length ? "l" + sub.segs.join("") : sub.had ? "l0 0" : "") + (sub.closed ? "z" : "");
    sub = null;
  };
  const pair = (dx, dy) => {
    const a = num(dx);
    const b = num(dy);
    return (b.startsWith("-") ? a + b : a + " " + b);
  };
  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i];
    if (t === "M" || t === "L") { cmd = t; i++; continue; }
    if (t === "Z") { if (sub) sub.closed = true; cur = start; i++; continue; }
    const x = Math.round(Number(t) * 10);
    const y = Math.round(Number(tokens[i + 1]) * 10);
    i += 2;
    if (cmd === "M") {
      flush();
      sub = { head: "m" + pair(x - cur[0], y - cur[1]), segs: [], had: false, closed: false };
      cur = [x, y];
      start = [x, y];
      cmd = "L";
      continue;
    }
    sub.had = true;
    if (x === cur[0] && y === cur[1]) continue;
    const step = pair(x - cur[0], y - cur[1]);
    sub.segs.push((sub.segs.length && !step.startsWith("-") ? " " : "") + step);
    cur = [x, y];
  }
  flush();
  // the first move is absolute
  return out.replace(/^m/, "M");
}

const esc = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const readoutHtml = ([l1, l2]) => `<span class="pr-l1">${esc(l1)}</span><span class="pr-l2">${esc(l2)}</span>`;

export function render({ flat = false, state = stateOf("final"), minify = true } = {}) {
  FLAT = flat;
  DEFS = new Map();
  PARTS = new Map();
  const body = [bench(), lowerCabinet(state), shelf(), upperCabinet(state), combs(state), cordLayer(state), cordLamps(state), counter(state), keys(state), armrest(), flat ? "" : hits()];
  const defs = FLAT ? "" : `<defs>${[...DEFS].map(([id, svg]) => `<g id="${id}">${svg}</g>`).join("")}</defs>`;
  const svg = k.figureSvg({ width: W.WIDTH, height: W.HEIGHT, label: LABEL, body: [defs, ...body] });
  const stage = `<div class="iso-stage pr-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="${ARIA}">${svg}<span class="pr-sr" role="status" aria-live="polite" data-status></span></div>`;
  const plate = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS_LEGEND, caption: CAPTION, body: stage });
  const html = plate.replace(" data-readout></span>", ` data-readout>${readoutHtml(readoutOf(state))}</span>`);
  if (html === plate) throw new Error("readout slot not found in plateHtml markup");
  return { html: FLAT || !minify ? html : html.replace(/ d="([^"]*)"/g, (m, d) => ` d="${minifyD(d)}"`) };
}
// Each part's flat markup by the name proof.mjs records it under, for the audit's stand-in check.
export function partsOf(state) {
  render({ flat: true, state });
  return PARTS;
}
