// Fig 10 proof: records the true shape of every drawn part, in the order art.mjs paints it, for the kit audit.
// Node only (build.mjs --audit). A state is { poses, order, keys, lift }.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import * as W from "./world.mjs";
import * as ART from "./art.mjs";

const { P } = W;
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const up = (x, y) => ({ o: [x, y, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] });
const depth = (x, y) => k.depthOf([x, y, 0], P);

const LENS = 0.66 * 2.3;
const DOME = Array.from({ length: 9 }, (_, i) => {
  const a = (i * Math.PI) / 16;
  return [LENS * Math.sin(a), LENS * Math.cos(a)];
});

// Every item carries the flat markup art.mjs draws for it under the same name, so the audit's stand-in check compares
// the drawing with the recorded shape; build.mjs fails on a recorded part with no markup or a drawn part with no record.
export function record(state, { svg = true } = {}) {
  const R = A.recorder(P);
  const PARTS = svg ? ART.partsOf(state) : new Map();
  R.drawn = PARTS;
  let key = 0;
  const put = (name, shapes, extra = {}) => {
    const list = shapes.map((s, j) => R.solid({ owner: name, ...s, name: j ? `${name}#${j}` : name, ...(name.startsWith("stand.") ? { ground: true } : {}) }));
    return R.put({ name, key: key++, svg: PARTS.get(name) ?? "", shapes: list, ...extra });
  };
  const sorted = (list, xy) => [...list].sort((a, b) => depth(...xy(a)) - depth(...xy(b)));

  // bench
  for (const [x, y] of sorted(k.corners(W.BENCH, 9), (p) => p)) put(`stand.foot@${x},${y}`, [A.cylinder(x, y, 6, -W.BENCH_H - W.FOOT_H, 1.6), A.cylinder(x, y, 4.7, -W.BENCH_H - W.FOOT_H + 1.6, W.FOOT_H - 1.6)]);
  put("stand.bench", [A.slab(W.BENCH, -W.BENCH_H, W.BENCH_H)]);
  put("bench.ruler", [A.slab(ART.RULER, 0, 0.6)]);
  put("bench.plate", [A.slab(ART.MAKER, 0, 0.8)]);

  // lower cabinet, the weights on their falls
  const BAY = W.SHELF_Z - 5;
  put("cab.plinth", [A.slab({ x: -115, y: -47, w: 230, d: 89, r: 1.5 }, 0, W.PLINTH_H, {}, 3)]);
  put("cab.cheekL", [A.slab({ x: -117, y: -48, w: 8, d: 92, r: 1 }, W.PLINTH_H, BAY - W.PLINTH_H, {}, 3)]);
  put("cab.back", [A.slab({ x: -109, y: -48, w: 218, d: 5, r: 0.5 }, W.PLINTH_H, BAY - W.PLINTH_H, {}, 2)]);
  const w = ART.WEIGHT;
  for (const i of sorted(W.SEATS.map((_, i) => i), (i) => [W.SEATS[i].x, W.SEATS[i].y])) {
    const { x, y } = W.SEATS[i];
    const b = W.WEIGHT_REST + state.lift[i];
    const bar = b + w.h + w.neck;
    const axle = ART.axleOf(b);
    const falls = ART.fallsOf(i, state.lift[i]).flatMap((pts, j) => R.route(`fall${i}.${j}`, pts, 0.22, { owner: `weight${i}`, touch: ["cab.rail", `weight${i}*`] }));
    // the weight's drawing is its falls and the weight on them, so its record is both
    const item = put(`weight${i}`, [
      A.cylinder(x, y, w.r, b, w.h),
      A.cylinder(x, y, 0.9, b + w.h, w.neck),
      A.slab({ x: x - 1.9, y: y - 1.1, w: 3.8, d: 2.2, r: 0.3 }, bar, w.bar, {}, 2),
      ...[-1.9, 1.3].map((dx) => A.slab({ x: x + dx, y: y - 1.1, w: 0.6, d: 2.2, r: 0.2 }, bar + w.bar, w.cheek, {}, 2)),
      ...[-0.75, 0.75].map((dx) => A.disc(G.frameAlong([x + dx, y, axle], [1, 0, 0]), -0.45, 0.45, w.sheave)),
    ], { tubes: falls });
    item.shapes.push(...falls);
  }
  put("cab.rail", [A.slab(ART.RAIL, ART.RAIL_Z, 2.2, {}, 2)]);
  put("cab.kick", [A.slab({ x: -109, y: 40, w: 218, d: 4, r: 0.6 }, W.PLINTH_H, 5.4, {}, 2)]);
  put("cab.cheekR", [A.slab({ x: 109, y: -48, w: 8, d: 92, r: 1 }, W.PLINTH_H, BAY - W.PLINTH_H, {}, 3)]);

  // keyshelf
  put("shelf", [A.slab(W.SHELF, W.SHELF_Z - 5, 5, {}, 3)]);

  // upper cabinet and the field
  const z0 = W.SHELF_Z;
  const Hc = W.TOP_Z - z0;
  put("cab.stileL", [A.slab({ x: -116, y: -44, w: 12, d: 42, r: 0 }, z0, Hc, {}, 2)]);
  put("cab.plate", [A.slab({ x: -104, y: -44, w: 208, d: 42, r: 0 }, z0, Hc, {}, 2)]);
  put("cab.fascia", [A.slab({ x: -101, y: W.FACE_Y, w: 202, d: 1.2, r: 0.4 }, ART.FASCIA_Z, 5, {}, 2)]);
  put("cab.stileLfront", [A.slab({ x: -116, y: W.FACE_Y, w: 12, d: W.STILE_Y - W.FACE_Y, r: 0 }, z0, Hc, {}, 2)]);
  const heads = [];
  for (let h = 0; h < W.H; h++) {
    const jz = W.jackZ(h);
    const shapes = [];
    const head = [];
    for (const [x0, x1, into] of [[-102, 77, shapes], [83, 101, head]]) {
      into.push(A.slab({ x: x0, y: W.FACE_Y, w: x1 - x0, d: W.LAMP_FRONT - W.FACE_Y, r: 0.4 }, jz + 8.6 - 3.5, 7, { fitting: true }, 2));
      into.push(A.slab({ x: x0, y: W.FACE_Y, w: x1 - x0, d: W.JACK_FRONT - W.FACE_Y, r: 0.4 }, jz - 4.1, 8.2, { fitting: true }, 2));
    }
    shapes.push(A.slab({ x: -101, y: W.FACE_Y, w: 177, d: 0.9, r: 0.3 }, jz + ART.DESIG[0], ART.DESIG[1] - ART.DESIG[0], { fitting: true }, 2));
    for (const x of Array.from({ length: W.L }, (_, l) => W.colX(l))) shapes.push(A.disc(G.frameAlong([x, W.JACK_FRONT, jz], Y), 0, W.BUSH, 2.05));
    head.push(A.disc(G.frameAlong([W.HEAD_X, W.JACK_FRONT, jz], Y), 0, W.BUSH, 2.05));
    put(`field.row${h}`, shapes);
    heads.push([`field.head${h}`, head]);
  }
  put("field.divider", [A.slab(ART.DIVIDER, W.jackZ(3) - 7.8, W.lampZ(0) + 4.6 - (W.jackZ(3) - 7.8), {}, 2)]);
  for (const [name, shapes] of heads) put(name, shapes);
  for (let h = 0; h < W.H; h++)
    for (const x of [...Array.from({ length: W.L }, (_, l) => W.colX(l)), W.HEAD_X]) {
      const c = [x, W.LAMP_FRONT, W.lampZ(h)];
      put(`lamp${h}@${x}`, [A.disc(G.frameAlong(c, Y), 0, 0.8, 2.3), A.solid(G.frameAlong(G.add3(c, [0, 0.8, 0]), Y), DOME)]);
    }
  put("cab.stileR", [A.slab({ x: 104, y: -44, w: 12, d: 46, r: 1.2 }, z0, Hc, {}, 3)]);
  put("cab.cornice", [A.slab({ x: -119, y: -47, w: 238, d: 52, r: 1.6 }, W.TOP_Z, 5, {}, 3)]);
  put("cab.cap", [A.slab({ x: -114, y: -42, w: 228, d: 42, r: 1.2 }, W.TOP_Z + 5, 2.4, {}, 3)]);

  // the comb tray on the cap, then the combs in the order the page paints them
  put("comb.tray", [A.slab(ART.TRAY, W.CAP_TOP, W.TRAY_Z - W.CAP_TOP, {}, 3)]);
  for (const h of W.combOrder(state.comb)) put(`comb${h}`, combShapes(h, state.comb[h]));

  // seat cups, then each cord with its plug and the near half of its cup
  const toward = [Math.cos((P.azimuth * Math.PI) / 180), Math.sin((P.azimuth * Math.PI) / 180), 0];
  const pegs = W.pegsOf(state.poses);
  for (const i of state.order) {
    const s = W.SEATS[i];
    const pose = state.poses[i];
    const parts = [];
    const route = W.cordRoute(i, pose, pegs);
    if (route) {
      // the cord ends on the floor of the seat's bore, the shelf top
      const cut = route.findIndex((p) => p[2] < W.SHELF_Z);
      const shown = cut > 0 ? [...route.slice(0, cut), [s.x, s.y, W.SHELF_Z]] : route;
      parts.push(() => {
        const tubes = R.route(`cord${i}`, shown, W.CORD_R, { limp: true, touch: [`cup${i}`, `cupfront${i}`] });
        R.put({ name: `cord${i}`, key: key++, svg: PARTS.get(`cord${i}`) ?? "", route: `cord${i}`, shapes: tubes });
      });
    }
    put(`cup${i}`, [A.prism(up(s.x, s.y), halfRing(toward, -1), W.SHELF_Z, W.CUP_TOP, { owner: `cup${i}` })]);
    const [s0, s1] = W.visibleSpan(pose);
    // a plug standing in its seat is recorded a little way into the bore, where its shell rests against the cup
    const seated = pose.axis[2] < -0.999 && s1 < W.PLUG_LEN;
    const plug = () => s1 - s0 > 0.2 && put(`plug${i}`, [A.solid(G.frameAlong(pose.tip, pose.axis), W.plugProfile(s0, seated ? Math.min(W.PLUG_LEN, s1 + 1.2) : s1), { owner: null })]);
    if (ART.plugFirst(pose)) parts.unshift(plug);
    else parts.push(plug);
    parts.forEach((f) => f());
    // the near half of the cup: the half of the ring that faces the viewer
    put(`cupfront${i}`, [A.prism(up(s.x, s.y), halfRing(toward, 1), W.SHELF_Z, W.CUP_TOP, { owner: `cup${i}` })]);
  }

  // shelf furniture
  for (const i of sorted(W.SEATS.map((_, i) => i), (i) => [W.SEATS[i].x, W.SEATS[i].y])) {
    const { x, y } = W.SEATS[i];
    const ly = y + ART.LAMP_DY;
    put(`clamp${i}`, [A.disc(up(x, ly), W.SHELF_Z, W.SHELF_Z + 0.9, 1.75), A.ball([x, ly, W.SHELF_Z + 0.9], 1.1)]);
  }
  const C = ART.COUNTER;
  put("counter", [A.slab(C, W.SHELF_Z, C.h, {}, 3), A.disc(G.frameAlong([C.x + C.w, C.y + C.d / 2, W.SHELF_Z + 5], [1, 0, 0]), 0, 2.2, 2.2)]);
  for (const kk of sorted(ART.KEYS, (kk) => [kk.x, kk.y])) {
    const a = ART.leverAxis(state.keys?.[kk.id] ?? 0);
    const base = [kk.x, kk.y, W.SHELF_Z + 1.6];
    const pl = ART.KEY_PLATE;
    put(`key.${kk.id}`, [
      A.slab({ ...pl, x: kk.x + pl.x, y: kk.y + pl.y }, W.SHELF_Z, 0.8, {}, 3),
      A.cylinder(kk.x, kk.y, 1.2, W.SHELF_Z + 0.8, 0.8),
      A.disc(G.frameAlong(base, a), 0, 6.4, 0.5),
      A.ball(G.add3(base, G.mul3(a, 7.3)), 1.25),
    ]);
  }
  put("shelf.arm", [A.slab(W.ARM, W.SHELF_Z - 5.4, 6.8)]);
  return R;
}
// The near (side 1) or far (side -1) half of a seat cup's wall as a plan ring: split across the line of sight.
function halfRing(toward, side) {
  const a0 = Math.atan2(toward[1], toward[0]) + (side > 0 ? 0 : Math.PI);
  const at = (t, r) => [r * Math.cos(a0 - Math.PI / 2 + t * Math.PI), r * Math.sin(a0 - Math.PI / 2 + t * Math.PI)];
  const out = [];
  for (let i = 0; i <= 16; i++) out.push(at(i / 16, W.CUP_R));
  for (let i = 16; i >= 0; i--) out.push(at(i / 16, ART.BORE));
  return out;
}
// Comb h at time t of its trip: the bus bar and its seventeen gang plugs. Home in a row, a gang plug is recorded from
// the jack's bushing face out, as the cord plugs are: its tip is inside the jack.
const rAt = (prof, s) => {
  for (let i = 0; i < prof.length - 1; i++) {
    const [a, ra] = prof[i];
    const [b, rb] = prof[i + 1];
    if (s >= a && s <= b && b > a) return ra + ((rb - ra) * (s - a)) / (b - a);
  }
  return 0;
};
export function combShapes(h, t) {
  const [y, z] = W.combAt(h, t);
  const C = W.COMB;
  const tip = y - C.reach;
  const s0 = Math.abs(z - W.jackZ(h)) < 1e-6 ? Math.max(0, W.JACK_FRONT + W.BUSH - tip) : 0;
  const gang = s0 > 0 ? [[s0, rAt(W.GANG, s0 + 1e-6)], ...W.GANG.filter(([s]) => s > s0)] : W.GANG;
  return [
    ...W.COMB_XS.map((x) => A.solid(G.frameAlong([x, tip, z], Y), gang)),
    A.slab({ ...ART.BAR, y }, z - C.h / 2, C.h, {}, 2),
  ];
}
