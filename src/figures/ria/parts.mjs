// Fig 21 geometry: a cylinder proof press on a bench. Pure ESM (no Node APIs): art.mjs and build.mjs both call build().
// Every item carries shape descriptors for the audit; carriage items carry piece "car" and move with it.
import * as k from "../kit/iso-kit.mjs";
import * as Lathe from "../kit/lathe.mjs";
import * as W from "./rig.mjs";
import { TRAVEL, CYL_R, MEASURE, SCOPE_ROWS, RULE_ROW, ROWS, OPS, EVENTS, formeOf, redOf, REST } from "./model.mjs";

const { P } = W;
// turned parts get about one facet per 7 px of rim (the kit's floor of 32 facets is for large bodies)
const facets = (r) => Math.max(r * Lathe.scaleOf(P) < 2 ? 8 : 12, Math.min(40, 4 * Math.ceil((2 * Math.PI * r * Lathe.scaleOf(P)) / 28)));
const G = {
  ...Lathe,
  disc: (s0, s1, r, F, P_, o = {}) => Lathe.disc(s0, s1, r, F, P_, { steps: facets(r), ...o }),
  solidOf: (profile, F, P_, o = {}) => Lathe.solidOf(profile, F, P_, { steps: facets(Math.max(...profile.map(([, r]) => r))), ...o }),
};
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
// rounded corners get no more facets than their screen radius can show
const slabOf = (plan, z, h, _P, steps = 3, bevel = 0) => k.slabOf({ r: 0, ...plan }, z, h, P, Math.max(1, Math.min(steps, Math.round(((plan.r || 0) * Lathe.scaleOf(P)) / 0.9))), bevel);
const f1 = (v) => Math.round(v * 10) / 10;
const f2 = (v) => Math.round(v * 100) / 100;
const pt = (p) => `${f2(p[0])},${f2(p[1])}`;
const Y = [0, 1, 0];
// frames: a vertical plate in the xz plane extruded along y (polygon in (x, z)), and a turned part along y
const plateF = (x0 = 0, z0 = 0) => G.frameOf([x0, 0, z0], Y, [1, 0, 0], [0, 0, 1]);
const alongY = (x, z) => G.frameAlong([x, 0, z], Y);

// shape descriptors, turned into audit shapes by build.mjs
const sSlab = (plan, z, h) => ["slab", { r: 0, ...plan }, z, h];
const sPrism = (F, poly, s0, s1) => ["prism", F, poly, s0, s1];
const sDisc = (F, s0, s1, r) => ["disc", F, s0, s1, r];
const sSolid = (F, profile) => ["solid", F, profile];
const sBall = (c, r) => ["ball", c, r];

// paths of a part built at a reference world point, shifted so the reference lands on 0,0: reused with <use x y>
function local(ref) {
  const s = at(ref);
  return { P0: { ...P, origin: [P.origin[0] - s[0], P.origin[1] - s[1]] }, s };
}
const useAt = (id, s, extra = "") => `<use href="#${id}" x="${f1(s[0])}" y="${f1(s[1])}"${extra}/>`;

// a convex plate in an xz face, from y0 to y1
const plate = (poly, y0, y1, x0 = 0, z0 = 0) => G.prismOf(plateF(x0, z0), poly, y0, y1, P);
const roundPoly = (cx, cz, r, n = 28, from = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(from + (i / n) * 2 * Math.PI), cz + r * Math.sin(from + (i / n) * 2 * Math.PI)]);
// a bar in an xz face from (x0, z0) to (x1, z1), half-width w0 at the start and w1 at the end, rounded ends
const barPoly = ([x0, z0], [x1, z1], w0, w1 = w0) => {
  const a = Math.atan2(z1 - z0, x1 - x0);
  const pts = [];
  // each rounded end gets about one facet per 1.5 px of its radius on screen
  const end = (x, z, w, from) => {
    const n = Math.max(4, Math.min(12, Math.round((w * Lathe.scaleOf(P)) / 0.5)));
    for (let i = 0; i <= n; i++) {
      const t = from + (i / n) * Math.PI;
      pts.push([x + w * Math.cos(t), z + w * Math.sin(t)]);
    }
  };
  end(x0, z0, w0, a + Math.PI / 2);
  end(x1, z1, w1, a - Math.PI / 2);
  return G.hullOf(pts);
};
// the screen outline of a polygon in an xz face at y
const facePath = (poly, y, x0 = 0, z0 = 0) => k.pathOf(poly.map(([x, z]) => at([x0 + x, y, z0 + z])), true);
// a closed slot outline on an xz face: a stadium from (x0, z) to (x1, z) of half-height h
const slotPath = (x0, x1, z, h, y) => facePath(barPoly([x0, z], [x1, z], h), y);

export function build({ car = 0 } = {}) {
  const items = [];
  const defs = [];
  const put = (name, at3, svg, shapes, extra = {}) => items.push({ name, at: at3, svg, shapes, ...extra });
  const moveCar = [TRAVEL, 0, 0];
  const carShift = k.axisVector(P, [TRAVEL * car, 0, 0]);
  const carT = car ? ` transform="translate(${f2(carShift[0])} ${f2(carShift[1])})"` : "";
  const putCar = (name, at3, svg, shapes, extra = {}) => put(name, [at3[0] + TRAVEL * car, at3[1], at3[2]], `<g data-car${carT}>${svg}</g>`, shapes, { piece: "car", move: moveCar, ...extra });

  // ============================ bench
  const { BENCH, BENCH_H, FOOT_H } = W;
  {
    let svg = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = k.corners(BENCH, 10.5).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    const shapes = [];
    feet.forEach(([x, y], i) => {
      // the farthest foot is wholly behind the bench: recorded, not drawn
      // a turned foot: a rubber pad under a short post (the post's top hides under the bench)
      if (i) svg += S(k.cylinder(x, y, 6.6, -BENCH_H - FOOT_H, 1.6, P, 12), { tone: "lo", crease: "none" }) + S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 12), { tone: "mid", crease: "none" });
      shapes.push(["cyl", x, y, 7, -BENCH_H - FOOT_H, FOOT_H]);
    });
    put("stand.feet", [0, 0, -14], svg, shapes);
    const screws = k.corners(BENCH, 9);
    const inner = L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }) + L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" });
    put("stand.bench", [0, 0, -6], S(slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4, P, 8), { tone: "faint" }) }) + inner + Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }), [sSlab(BENCH, -BENCH_H, BENCH_H)]);
  }
  // ruler strip and label plate on the bench front
  {
    const strip = { x: -36, y: 39.5, w: 150, d: 5.5, r: 1 };
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    put("bench.ruler", [strip.x + strip.w / 2, strip.y + 3, 0.3], S(slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + Dt([at([strip.x + 1.6, strip.y + 4.2, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 4.2, 0.6])], { size: 0.45 }), [sSlab(strip, 0, 0.6)]);
    const lp = { x: 40, y: 24, w: 52, d: 12, r: 1 };
    const rule = (x0, len, y) => L(k.lineOnTop([x0, y], [x0 + len, y], 0.8, P), { tone: "lo", free: true });
    const text = k.faceTextSvg(k.topMatrix([lp.x + 4, lp.y + 5.6], 0.8, P, "x"), "AU-21", { size: 3.1, tone: "mid" });
    put(
      "bench.label",
      [lp.x + lp.w / 2, lp.y + lp.d / 2, 0.4],
      S(slabOf(lp, 0, 0.8, P, 4), { tone: "mid" }) +
        L(k.planOutline(k.insetPlan(lp, 1.6), 0.8, P, 4), { tone: "faint" }) +
        text +
        rule(lp.x + 18, 26, lp.y + 3.6) +
        rule(lp.x + 18, 20, lp.y + 6) +
        rule(lp.x + 18, 23, lp.y + 8.4) +
        Dt([at([lp.x + 2.6, lp.y + lp.d / 2, 0.8]), at([lp.x + lp.w - 2.6, lp.y + lp.d / 2, 0.8])], { size: 0.45 }),
      [sSlab(lp, 0, 0.8)],
    );
  }

  // ============================ quoin key, lying on the bench: a T handle on a square shank
  {
    const bar = { x: 98, y: 15.5, w: 2.4, d: 12, r: 0.6 };
    const stem = { x: 100.4, y: 20.8, w: 12, d: 1.4, r: 0 };
    put("bench.key", [105, 21.5, 0.9], S(slabOf(bar, 0, 2, P, 2, 0.3), { tone: "mid" }) + S(slabOf(stem, 0, 1.4, P, 1), { tone: "mid" }), [sSlab(bar, 0, 2), sSlab(stem, 0, 1.4)]);
  }

  // ============================ press base: a cabinet of galley drawers on a plinth, the bed on top
  const { BED, BED_Z, BT, PLATE_TOP, TH, CABINET: CAB } = W;
  {
    const kick = k.insetPlan(CAB, 3);
    put("stand.kick", [CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 1], S(slabOf(kick, 0, 2.2, P, 3), { tone: "lo" }), [sSlab(kick, 0, 2.2)]);
    const yF = CAB.y + CAB.d;
    const seam = L(k.sideSeam(CAB, BED_Z - 2.4, P, 4), { tone: "faint" });
    put("cabinet", [CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 13], S(slabOf(CAB, 2.2, BED_Z - 2.2, P, 4, 0.8), { tone: "mid", inner: seam }), [sSlab(CAB, 2.2, BED_Z - 2.2)]);
    // three drawer fronts, each with a pull and a card holder; the lever's panel sits between the second and third
    const fronts = [[CAB.x + 4, CAB.x + 48], [CAB.x + 52, CAB.x + 79], [CAB.x + 109, CAB.x + 166]];
    fronts.forEach(([x0, x1], i) => {
      const df = [[x0, 4.4], [x1, 4.4], [x1, BED_Z - 4.4], [x0, BED_Z - 4.4]];
      const mid = (x0 + x1) / 2;
      const holder = facePath([[mid - 5, BED_Z - 8.6], [mid + 5, BED_Z - 8.6], [mid + 5, BED_Z - 6.2], [mid - 5, BED_Z - 6.2]], yF + 0.8);
      const card = facePath([[mid - 4.2, BED_Z - 8.2], [mid + 4.2, BED_Z - 8.2], [mid + 4.2, BED_Z - 6.6], [mid - 4.2, BED_Z - 6.6]], yF + 0.8);
      const pull = barPoly([mid - 6, 11.6], [mid + 6, 11.6], 0.9);
      const posts = [mid - 5, mid + 5].map((x) => G.disc(yF + 0.8, yF + 2, 0.7, alongY(x, 11.6), P));
      put(
        `cabinet.drawer${i}`,
        [mid, yF + 1, 13],
        S(plate(df, yF, yF + 0.8), { tone: "mid", inner: L(holder, { tone: "lo" }) + L(card, { tone: "faint" }) }) + Dt([at([mid - 5.6, yF + 0.8, BED_Z - 7.4]), at([mid + 5.6, yF + 0.8, BED_Z - 7.4])], { size: 0.35 }) + posts.map((d) => S(d, { tone: "mid" })).join("") + S(plate(pull, yF + 2, yF + 3.2), { tone: "mid", crease: "lo" }),
        [sPrism(plateF(), df, yF, yF + 0.8), sPrism(plateF(), pull, yF + 2, yF + 3.2), ...[mid - 5, mid + 5].map((x) => sDisc(alongY(x, 11.6), yF + 0.8, yF + 2, 0.7))],
      );
    });
  }
  {
    const seam = L(k.sideSeam(BED, BT - 4.5, P, 4), { tone: "faint" });
    const yF = BED.y + BED.d;
    const panel = { x: -40, w: 86, z0: BED_Z + 4, z1: BED_Z + 15.5 };
    const panelD = facePath([[panel.x, panel.z0], [panel.x + panel.w, panel.z0], [panel.x + panel.w, panel.z1], [panel.x, panel.z1]], yF);
    const screws = [[panel.x + 3, panel.z0 + 2.4], [panel.x + 3, panel.z1 - 2.4], [panel.x + panel.w - 3, panel.z0 + 2.4], [panel.x + panel.w - 3, panel.z1 - 2.4]].map(([x, z]) => at([x, yF, z]));
    // end caps: a vertical joint line at each end of the front face, edge to edge
    const joints = [BED.x + 9, BED.x + BED.w - 9].map((x) => k.segment([x, yF, BED_Z], [x, yF, BT], P)).join("");
    put("bed", [BED.x + BED.w / 2, -12, (BED_Z + BT) / 2], S(slabOf(BED, BED_Z, BT - BED_Z, P, 4, 1), { tone: "mid", inner: seam + L(panelD, { tone: "faint" }) + L(joints, { tone: "faint" }) }) + Dt(screws, { size: 0.45 }), [sSlab(BED, BED_Z, BT - BED_Z)]);
  }
  // bearer rails with end stops at both ends of the carriage's travel
  W.RAILS.forEach((y, i) => {
    const plan = { x: BED.x + 1, y, w: BED.w - 2, d: W.RAIL_D, r: 0.6 };
    const dots = [BED.x + 5, -60, 0, 40, BED.x + BED.w - 5].map((x) => at([x, y + W.RAIL_D / 2, TH]));
    put(`bed.rail${i}`, [BED.x + BED.w / 2, y + 2, (BT + TH) / 2], S(slabOf(plan, BT, TH - BT, P, 3, 0.4), { tone: "mid" }) + Dt(dots, { size: 0.4, tone: "lo" }), [sSlab(plan, BT, TH - BT)]);
    // a stop meets its bearer 2 units above the rail, low enough that the roller journals pass over it
    const reach = Math.sqrt(CYL_R * CYL_R - (CYL_R - 2) ** 2) + 0.5;
    for (const x of [W.XC - reach - 4.6, W.XC + TRAVEL + reach]) {
      const stop = { x, y: y + 0.2, w: 4.6, d: W.RAIL_D - 0.4, r: 0.8 };
      const left = x < W.XC;
      const pad = { x: left ? x + 4.6 : x - 0.6, y: y + 0.7, w: 0.6, d: W.RAIL_D - 1.4, r: 0.2 };
      put(`bed.stop${i}${left ? "l" : "r"}`, [x + 2.3, y + 2, TH + 1], S(slabOf(stop, TH, 2, P, 3, 0.4), { tone: "mid" }) + S(slabOf(pad, TH + 0.4, 1.4, P, 2), { tone: "lo", crease: "none" }), [sSlab(stop, TH, 2), sSlab(pad, TH + 0.4, 1.4)]);
    }
  });
  // type bed plate
  const BEDPLATE = { x: W.CHASE.x - 4, y: -34, w: W.CHASE.w + 8, d: 43, r: 1 };
  put("bed.plate", [BEDPLATE.x + BEDPLATE.w / 2, -12.5, BT + 0.5], S(slabOf(BEDPLATE, BT, PLATE_TOP - BT, P, 3), { tone: "lo", crease: "none" }) + Dt(k.corners(BEDPLATE, 2.2).map(([x, y]) => at([x, y, PLATE_TOP])), { size: 0.4 }), [sSlab(BEDPLATE, BT, PLATE_TOP - BT)]);

  // ============================ chase, furniture, quoins
  const { CHASE, CHASE_BAR: CB, CHASE_H } = W;
  const Z0 = PLATE_TOP;
  {
    const bars = [
      ["far", { x: CHASE.x, y: CHASE.y, w: CHASE.w, d: CB }],
      ["left", { x: CHASE.x, y: CHASE.y + CB, w: CB, d: CHASE.d - 2 * CB }],
      ["right", { x: CHASE.x + CHASE.w - CB, y: CHASE.y + CB, w: CB, d: CHASE.d - 2 * CB }],
      ["near", { x: CHASE.x, y: CHASE.y + CHASE.d - CB, w: CHASE.w, d: CB }],
    ];
    for (const [side, plan] of bars) {
      const dots = side === "near" || side === "far" ? [at([plan.x + 1.3, plan.y + CB / 2, Z0 + CHASE_H]), at([plan.x + plan.w - 1.3, plan.y + CB / 2, Z0 + CHASE_H])] : [];
      put(`chase.${side}`, [plan.x + plan.w / 2, plan.y + plan.d / 2, Z0 + CHASE_H / 2], S(slabOf(plan, Z0, CHASE_H, P, 2, 0.3), { tone: "mid" }) + Dt(dots, { size: 0.4 }), [sSlab(plan, Z0, CHASE_H)]);
    }
  }
  const IN = { x: CHASE.x + CB, y: CHASE.y + CB, x1: CHASE.x + CHASE.w - CB, y1: CHASE.y + CHASE.d - CB };
  const F0 = W.FORME;
  const FX1 = F0.x + F0.w;
  const FY1 = F0.y + F0.d;
  const WOOD_H = 2.4;
  const wood = (name, plan) => {
    // grain: two lines running the piece's length, end to end
    const long = plan.w >= plan.d;
    const grain = [0.33, 0.66]
      .map((t) => (long ? k.lineOnTop([plan.x, plan.y + plan.d * t], [plan.x + plan.w, plan.y + plan.d * t], Z0 + WOOD_H, P) : k.lineOnTop([plan.x + plan.w * t, plan.y], [plan.x + plan.w * t, plan.y + plan.d], Z0 + WOOD_H, P)))
      .join("");
    put(`chase.wood.${name}`, [plan.x + plan.w / 2, plan.y + plan.d / 2, Z0 + WOOD_H / 2], S(slabOf(plan, Z0, WOOD_H, P, 2), { tone: "lo", inner: L(grain, { tone: "faint" }) }), [sSlab(plan, Z0, WOOD_H)]);
  };
  wood("left", { x: IN.x, y: IN.y, w: F0.x - IN.x, d: IN.y1 - IN.y });
  wood("far", { x: F0.x, y: IN.y, w: FX1 - F0.x, d: F0.y - IN.y });
  wood("near", { x: F0.x, y: FY1, w: FX1 - F0.x, d: IN.y1 - FY1 });
  wood("right", { x: FX1, y: IN.y, w: 2.6, d: IN.y1 - IN.y });
  // quoins: wedge pairs between the right furniture and the chase, each with a key hole
  {
    const qx = FX1 + 2.6;
    const qw = IN.x1 - qx;
    const spans = [[IN.y, IN.y + 11], [IN.y + 11, IN.y + 21.8], [IN.y + 21.8, IN.y1]];
    spans.forEach(([y0, y1], i) => {
      const plan = { x: qx, y: y0, w: qw, d: y1 - y0 };
      if (i === 1) return wood("mid", plan);
      const diag = k.segment([qx, y0, Z0 + WOOD_H], [qx + qw, y1, Z0 + WOOD_H], P);
      const hole = k.ring(qx + qw / 2, (y0 + y1) / 2, 0.7, Z0 + WOOD_H, P, 12);
      put(`chase.quoin${i}`, [qx + qw / 2, (y0 + y1) / 2, Z0 + 1.2], S(slabOf(plan, Z0, WOOD_H, P, 2), { tone: "mid", inner: L(diag, { tone: "lo" }) }) + L(hole, { tone: "lo" }), [sSlab(plan, Z0, WOOD_H)]);
    });
  }

  // ============================ forme: sorts, quads, the brass rule and the scaffold
  {
    const ref = [0, 0, Z0];
    const { P0 } = local(ref);
    const sw = W.PITCH.x;
    const sd = W.PITCH.y;
    const sortPlan = { x: 0, y: 0, w: sw, d: sd, r: 0 };
    // a sort's face, the raised character on its top: a filled patch, its tone inline so it reaches into the <use> tree
    const faceOf = (z, tone, i) => `<path style="fill:var(--anatomy-${tone})" d="${k.planOutline({ x: i, y: i + 0.1, w: sw - 2 * i, d: sd - 2 * i - 0.2, r: 0.2 }, z, P0, 2)}"/>`;
    const sym = (id, h, style, face, i = 0.5) => defs.push(`<g id="${id}">${k.solidSvg(k.slabOf(sortPlan, Z0, h, P0, 1), style)}${face ? faceOf(Z0 + h, face, i) : ""}</g>`);
    sym("ria-s", W.TYPE_H, { tone: "mid", crease: "faint" }, "mid");
    sym("ria-o", W.TYPE_H, { tone: "lo", crease: "faint" }, "lo");
    sym("ria-q", W.QUAD_H, { tone: "lo" });
    // 2-, 3- and 4-em quads fill out the line ends
    for (const n of [2, 3, 4]) defs.push(`<g id="ria-q${n}">${k.solidSvg(k.slabOf({ x: 0, y: 0, w: n * sw, d: sd, r: 0 }, Z0, W.QUAD_H, P0, 1), { tone: "lo" })}</g>`);
    sym("ria-sl", W.TYPE_H, { tone: "lit", lit: true, crease: "lo" }, "lit", 0.3);
    sym("ria-ql", W.QUAD_H + 0.8, { tone: "lit", lit: true, crease: "lo" }, "lit", 0.3);
    const slotScreen = (row, col) => at([F0.x + col * sw, F0.y + row * sd, Z0]);
    const SW = new Map(); // character index -> operator that swaps it (base layout)
    for (const op of ["O1", "O2", "O3", "O4", "O5"]) for (const i of EVENTS[op]) SW.set(i, op);
    const plainOf = (s) => (s.kind === "sort" ? "ria-s" : s.kind === "label" || s.kind === "opt" ? "ria-o" : "ria-q");
    const longest = { "ria-s": 1, "ria-o": 1 }; // the longest run of each kind of sort, set as one placement
    // one row of the forme as placements, in depth order
    const rowsOf = (op) => {
      const rows = [];
      const slots = formeOf(op).sort((a, b) => a.row - b.row || a.col - b.col);
      const swapOf = (s) => (op === "O6" ? (s.i === EVENTS.O6[0] ? "O6" : null) : SW.get(s.i));
      for (let j = 0; j < slots.length; j++) {
        const s = slots[j];
        const p = slotScreen(s.row, s.col);
        if (s.kind === "fill") {
          // a run of line-end fill, set as the widest quads that fit
          let n = 1;
          while (n < 4 && slots[j + n] && slots[j + n].kind === "fill" && slots[j + n].row === s.row) n++;
          rows[s.row] = (rows[s.row] || "") + useAt(n > 1 ? `ria-q${n}` : "ria-q", p);
          j += n - 1;
          continue;
        }
        const plain = plainOf(s);
        const swap = swapOf(s);
        let out;
        if (!swap && plain !== "ria-q") {
          // a word: a run of plain sorts of one kind, placed as one run symbol
          let n = 1;
          for (let t = slots[j + 1]; t && t.row === s.row && plainOf(t) === plain && !swapOf(t); t = slots[j + ++n]);
          longest[plain] = Math.max(longest[plain], n);
          out = useAt(n > 1 ? plain + n : plain, p);
          j += n - 1;
        } else if (!swap) out = useAt(plain, p);
        else if (op === "O6") out = useAt("ria-ql", p);
        else out = `<g class="ria-sw" data-op="${swap}">${useAt(plain, p, ` class="ria-plain"`)}${useAt(plain === "ria-s" ? "ria-sl" : "ria-ql", p, ` class="ria-lit"`)}</g>`;
        rows[s.row] = (rows[s.row] || "") + out;
      }
      return rows;
    };
    // the rule row: a lead (low) carrying a brass rule, between the question and the options block
    const ry = F0.y + RULE_ROW * sd;
    const lead = { x: F0.x, y: ry, w: F0.w, d: sd };
    const rule = { x: F0.x, y: ry + sd / 2 - 0.4, w: F0.w, d: 0.8 };
    const ruleSvg = S(slabOf(lead, Z0, W.QUAD_H, P, 1), { tone: "lo" }) + S(slabOf(rule, Z0 + W.QUAD_H, W.TYPE_H - W.QUAD_H - 0.3, P, 1), { tone: "hi", crease: "lo" });
    // the soft wrap only resets the question rows from the first one it changes: rows before it and the
    // options block are shared by both layouts; rows paint back to front, the rule between scope and options
    const base = rowsOf(null);
    const wrap = rowsOf("O6");
    // run symbols, each the run one shorter plus one sort at its end: ria-s2 .. ria-s<longest>, the same for ria-o
    const step = (n) => k.axisVector(P, [n * sw, 0, 0]);
    for (const id of ["ria-s", "ria-o"])
      for (let n = 2; n <= longest[id]; n++) defs.push(`<g id="${id}${n}"><use href="#${n > 2 ? id + (n - 1) : id}"/>${useAt(id, step(n - 1))}</g>`);
    let first = 0;
    while (first < SCOPE_ROWS && base[first] === wrap[first]) first++;
    const span = (rows) => rows.slice(first, SCOPE_ROWS).join("");
    const svg = base.slice(0, first).join("") + `<g class="ria-forme" data-layout="base">${span(base)}</g><g class="ria-forme" data-layout="O6">${span(wrap)}</g>` + ruleSvg + base.slice(RULE_ROW + 1).join("");
    put("forme", [F0.x + F0.w / 2, F0.y + F0.d / 2, Z0 + 2], svg, [sSlab({ x: F0.x, y: F0.y, w: F0.w, d: F0.d }, Z0, W.TYPE_H)]);
  }

  // ============================ delivery board and the proof
  {
    const { DELIVERY: DB, SHEET: SH } = W;
    const pins = [[DB.x + 6, DB.y + DB.d - 2.2], [DB.x + DB.w - 6, DB.y + DB.d - 2.2]];
    put(
      "delivery.board",
      [DB.x + DB.w / 2, DB.y + DB.d / 2, BT + 0.8],
      S(slabOf(DB, BT, 1.6, P, 4, 0.5), { tone: "mid" }) + L(k.planOutline(k.insetPlan(DB, 1.4), BT + 1.6, P, 4), { tone: "faint" }) + Dt(k.corners(DB, 2.6).slice(0, 2).map(([x, y]) => at([x, y, BT + 1.6])), { size: 0.4 }),
      [sSlab(DB, BT, 1.6)],
    );
    // two older proofs under the live one
    const stack = [0, 1].map((i) => S(slabOf({ x: SH.x - 0.8 + i * 0.6, y: SH.y + 0.5 - i * 0.4, w: SH.w, d: SH.d }, BT + 1.6 + i * 0.3, 0.3, P, 1), { tone: "lo", crease: "none" })).join("");
    put("delivery.stack", [SH.x + SH.w / 2, SH.y + SH.d / 2, BT + 1.9], stack, [sSlab({ x: SH.x - 0.8, y: SH.y + 0.1, w: SH.w + 0.6, d: SH.d + 0.4 }, BT + 1.6, 0.6)]);
    // the live proof: printed question lines, the options block and one mark per example
    const z = BT + 2.2;
    const M = k.topMatrix([SH.x, SH.y], z + 0.3, P, "x");
    const lines = [26, 11, 27, 13, 24].map((len, i) => `M3 ${3 + i * 1.5}h${len}`).join("");
    const opts = [21, 25, 23, 20].map((len, i) => `M3 ${f2(11.6 + i * 1.3)}h${len}`).join("");
    const grid = { x: 2.2, y: 17.2, pitch: 1.05, cols: 32, rows: 16 }; // 512 marks, one per gated question
    const red = redOf(REST); // the resting proof: O4's flipped answers, in reading order
    const redRows = Math.floor(red / grid.cols);
    const proof =
      `<g data-proof>` +
      S(slabOf({ x: SH.x, y: SH.y, w: SH.w, d: SH.d }, z, 0.3, P, 1), { tone: "hi", crease: "none" }) +
      `<g transform="${M}" class="ria-print">` +
      `<path class="iso-line" data-tone="lo" data-free="" d="${lines}${opts}"/><rect class="ria-ink" x="3" y="10" width="32" height=".5"/>` +
      `<g data-marks data-x="${grid.x}" data-y="${grid.y}" data-pitch="${grid.pitch}" data-cols="${grid.cols}"><rect x="${grid.x}" y="${grid.y}" width="${f2(grid.cols * grid.pitch)}" height="${f2(grid.rows * grid.pitch)}" fill="url(#ria-mark)"/>` +
      `<g clip-path="url(#ria-red)"><rect x="${grid.x}" y="${grid.y}" width="${f2(grid.cols * grid.pitch)}" height="${f2(grid.rows * grid.pitch)}" fill="url(#ria-mark-red)"/></g></g>` +
      `</g></g>`;
    defs.push(
      `<pattern id="ria-mark" patternUnits="userSpaceOnUse" x="${grid.x}" y="${grid.y}" width="${grid.pitch}" height="${grid.pitch}"><rect class="ria-mk" x=".22" y=".22" width=".6" height=".6"/></pattern>`,
      `<pattern id="ria-mark-red" patternUnits="userSpaceOnUse" x="${grid.x}" y="${grid.y}" width="${grid.pitch}" height="${grid.pitch}"><rect class="ria-mk-red" x=".12" y=".12" width=".8" height=".8"/></pattern>`,
      `<clipPath id="ria-red"><rect data-red-rows x="${grid.x}" y="${grid.y}" width="${f2(grid.cols * grid.pitch)}" height="${f2(redRows * grid.pitch)}"/><rect data-red-tail x="${grid.x}" y="${f2(grid.y + redRows * grid.pitch)}" width="${f2((red % grid.cols) * grid.pitch)}" height="${f2(grid.pitch)}"/></clipPath>`,
    );
    put("delivery.proof", [SH.x + SH.w / 2, SH.y + SH.d / 2, z + 0.15], proof, [sSlab({ x: SH.x, y: SH.y, w: SH.w, d: SH.d }, z, 0.3)], { grid });
  }

  // ============================ canonicalize lever on the cabinet face, between the drawers
  {
    const { LEVER: LV } = W;
    const yF = CAB.y + CAB.d;
    const quad = [[LV.x - 8, LV.z - 4.5], [LV.x + 8, LV.z - 4.5], [LV.x + 8, LV.z + 6.5], [LV.x, LV.z + 9.5], [LV.x - 8, LV.z + 6.5]];
    const slot = facePath(
      Array.from({ length: 25 }, (_, i) => {
        const a = LV.off + ((LV.on - LV.off) * i) / 24;
        return [LV.x + 7.2 * Math.sin(a), LV.z + 7.2 * Math.cos(a)];
      }).concat(
        Array.from({ length: 25 }, (_, i) => {
          const a = LV.on - ((LV.on - LV.off) * i) / 24;
          return [LV.x + 5.6 * Math.sin(a), LV.z + 5.6 * Math.cos(a)];
        }),
      ),
      yF + 1,
    );
    const detents = [LV.off, LV.on].map((a) => at([LV.x + 8.4 * Math.sin(a), yF + 1, LV.z + 8.4 * Math.cos(a)]));
    put("lever.quadrant", [LV.x, yF + 0.5, LV.z + 2], S(plate(quad, yF, yF + 1), { tone: "mid", inner: L(slot, { tone: "lo" }) }) + Dt(detents, { size: 0.5, tone: "hi" }) + Dt([at([LV.x - 6.4, yF + 1, LV.z - 3]), at([LV.x + 6.4, yF + 1, LV.z - 3])], { size: 0.4 }), [sPrism(plateF(), quad, yF, yF + 1)]);
    const FB = alongY(LV.x, LV.z);
    put("lever.boss", [LV.x, yF + 2, LV.z], S(G.disc(yF + 1, LV.y[0], 2.4, FB, P), { tone: "mid" }), [sDisc(FB, yF + 1, LV.y[0], 2.4)]);
    // the arm: drawn at rest (off) and turned in its face plane by live.js
    const tip = [LV.x + LV.len * Math.sin(LV.off), LV.z + LV.len * Math.cos(LV.off)];
    const arm = barPoly([LV.x, LV.z], tip, 1.5, 0.9);
    const armSvg = S(plate(arm, LV.y[0], LV.y[1]), { tone: "mid" }) + S(G.disc(LV.y[1], LV.y[1] + 0.6, 1.1, FB, P), { tone: "hi" });
    const knob = [tip[0], LV.y[1] + 1, tip[1]];
    const knobSvg = S(G.sphereOf(knob, 1.9, P), { tone: "hi" });
    put("lever.arm", [LV.x, LV.y[1], LV.z + 3], `<g data-lever data-c="${pt(at([LV.x, LV.y[0], LV.z]))}">${armSvg}${knobSvg}</g>`, [sPrism(plateF(), arm, LV.y[0], LV.y[1]), sBall(knob, 1.9)]);
  }

  // ============================ gate lamps on the bed front face
  {
    const { LAMPS: LP } = W;
    const yF = BED.y + BED.d;
    const pl = [[LP.x, LP.z[0]], [LP.x + LP.w, LP.z[0]], [LP.x + LP.w, LP.z[1]], [LP.x, LP.z[1]]];
    put("lamps.plate", [LP.x + LP.w / 2, yF + 0.4, 15], S(plate(pl, yF, yF + 0.8), { tone: "mid" }) + Dt([[LP.x + 2, LP.z[0] + 2], [LP.x + 2, LP.z[1] - 2], [LP.x + LP.w - 2, LP.z[0] + 2], [LP.x + LP.w - 2, LP.z[1] - 2]].map(([x, z]) => at([x, yF + 0.8, z])), { size: 0.4 }), [sPrism(plateF(), pl, yF, yF + 0.8)]);
    [LP.x + 8, LP.x + 18].forEach((x, i) => {
      const F = alongY(x, (LP.z[0] + LP.z[1]) / 2);
      const lens = G.circleOf(F, yF + 2.4, 1.6, P);
      put(`lamps.lamp${i}`, [x, yF + 1.6, (LP.z[0] + LP.z[1]) / 2], S(G.disc(yF + 0.8, yF + 2.4, 2.6, F, P), { tone: "mid" }) + `<path class="ria-lamp" d="${lens}"/>` + L(lens, { tone: "mid" }), [sDisc(F, yF + 0.8, yF + 2.4, 2.6)]);
    });
  }

  // ============================ sort tray on the bench, with its selector
  {
    const { TRAY: T, TRAY_H, TRAY_WALL: TW, DIVIDER: DV, cellW, cellX } = W;
    put("tray.base", [T.x + T.w / 2, T.y + T.d / 2, 0.6], S(slabOf(T, 0, 1.2, P, 3, 0.4), { tone: "lo" }), [sSlab(T, 0, 1.2)]);
    const wall = (name, plan, h = TRAY_H) => put(`tray.${name}`, [plan.x + plan.w / 2, plan.y + plan.d / 2, 1.2 + h / 2], S(slabOf(plan, 1.2, h - 1.2, P, 2, 0.3), { tone: "mid" }), [sSlab(plan, 1.2, h - 1.2)]);
    wall("far", { x: T.x, y: T.y, w: T.w, d: TW });
    wall("left", { x: T.x, y: T.y + TW, w: TW, d: T.d - 2 * TW });
    wall("right", { x: T.x + T.w - TW, y: T.y + TW, w: TW, d: T.d - 2 * TW });
    for (let i = 1; i < 6; i++) wall(`div${i}`, { x: T.x + TW + i * (cellW + DV) - DV, y: T.y + TW, w: DV, d: T.d - 2 * TW }, TRAY_H - 0.8);
    // sorts standing in each compartment, two rows: type sorts for O1-O3, spaces (quads) for O4-O6
    for (let i = 0; i < 6; i++) {
      const cx = cellX(i);
      let svg = "";
      const shapes = [];
      const h = i < 3 ? W.TYPE_H : W.QUAD_H;
      for (const [dx, dy] of [[-2.3, 9.4], [0.1, 9.4], [2.5, 9.4], [-3.4, 4.6], [-1.2, 4.6], [1.0, 4.6]].sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
        const plan = { x: cx + dx - 1, y: T.y + TW + dy - 1.3, w: 2, d: 2.6 };
        svg += useAt(i < 3 ? "ria-s" : "ria-q", at([plan.x, plan.y, 1.2]));
        shapes.push(sSlab(plan, 1.2, h));
      }
      put(`tray.sorts${i}`, [cx, T.y + T.d / 2 - 2, 1.2 + h / 2], svg, shapes);
    }
    // the near wall carries the selector strip with a tick at each compartment
    const near = { x: T.x, y: T.y + T.d - TW, w: T.w, d: TW };
    const strip = { x: T.x + 1, y: near.y - 1.6, w: T.w - 2, d: 1.6 };
    put("tray.near", [near.x + near.w / 2, near.y + TW / 2, TRAY_H / 2 + 0.6], S(slabOf(near, 1.2, TRAY_H - 1.2, P, 2, 0.3), { tone: "mid" }), [sSlab(near, 1.2, TRAY_H - 1.2)]);
    const ticks = Array.from({ length: 6 }, (_, i) => k.segment([cellX(i), near.y + TW, TRAY_H - 0.2], [cellX(i), near.y + TW, TRAY_H - 2.2], P)).join("");
    put("tray.ticks", [T.x + T.w / 2, near.y + TW, TRAY_H - 1], L(ticks, { tone: "mid" }), [sSlab({ x: near.x, y: near.y + TW - 0.05, w: near.w, d: 0.1 }, TRAY_H - 2.2, 2)]);
    // the selector: a rider on the near wall's top with a tongue over the chosen compartment, moved along x by live.js
    const sx = cellX(3);
    const slide = { x: sx - 2.8, y: near.y - 0.3, w: 5.6, d: TW + 0.6, r: 0.5 };
    const tongue = { x: sx - 0.9, y: near.y - 2.6, w: 1.8, d: 2.3, r: 0.3 };
    const pointer = k.lineOnTop([sx, near.y - 0.3], [sx, near.y + TW + 0.3], TRAY_H + 1.1, P);
    put(
      "tray.selector",
      [sx, near.y + TW / 2, TRAY_H + 0.6],
      `<g data-selector data-x="${f2(sx)}">${S(slabOf(tongue, TRAY_H + 0.5, 0.6, P, 2), { tone: "mid" })}${S(slabOf(slide, TRAY_H, 1.1, P, 2, 0.3), { tone: "mid" })}${L(pointer, { tone: "hi" })}</g>`,
      [sSlab(slide, TRAY_H, 1.1), sSlab(tongue, TRAY_H + 0.5, 0.6)],
    );
  }

  // ============================ carriage
  const { XC, AXIS_Z, CHEEK_Y, CHEEK, DRUM, ROLLERS, GEAR, PINION, CRANK, TRIP, GRIPPER, FEED } = W;
  const cx = (x) => XC + x;
  // cheeks
  {
    const far = CHEEK_Y.far;
    // the inner face carries the far bearing bosses of the ink drum and both form rollers, and its screws
    const bosses = [[DRUM.x, DRUM.z, 2.6], ...ROLLERS.map((ro) => [ro.x, ro.z, 2])].map(([x, z, r]) => [alongY(cx(x), z), r]);
    const fScrews = [[1, TH + 32.4], [26, TH + 15], [26, TH - 4]].map(([x, z]) => at([cx(x), far[1], z]));
    putCar(
      "car.cheek.far",
      [cx(6), far[0] + 2, 45],
      S(plate(CHEEK, far[0], far[1], XC), { tone: "mid" }) + Dt(fScrews, { size: 0.45 }) + bosses.map(([F, r]) => S(G.disc(far[1], far[1] + 0.8, r, F, P), { tone: "mid" })).join(""),
      [sPrism(plateF(XC), CHEEK, far[0], far[1]), ...bosses.map(([F, r]) => sDisc(F, far[1], far[1] + 0.8, r))],
    );
    const near = CHEEK_Y.near;
    const yF = near[1];
    // the ink drum's adjustment slot, round its bearing boss
    const slot = slotPath(cx(DRUM.x - 4), cx(DRUM.x + 4), DRUM.z, 3.3, yF);
    const screws = [[26, TH - 4], [-14, TH - 4], [-14, TH + 19], [1, TH + 32.4], [26, TH + 15]].map(([x, z]) => at([cx(x), yF, z]));
    putCar("car.cheek.near", [cx(6), near[0] + 2, 45], S(plate(CHEEK, near[0], near[1], XC), { tone: "mid", inner: L(slot, { tone: "lo" }) }) + Dt(screws, { size: 0.45 }), [sPrism(plateF(XC), CHEEK, near[0], near[1])]);
  }
  // impression cylinder: axle stubs, bearers at the rails, the packed body
  {
    const F = alongY(cx(0), AXIS_Z);
    const y0 = CHEEK_Y.far[1];
    const R = CYL_R;
    // bearers at both ends, parted from the packed body by a turned groove (two seams each)
    const profile = [[-39, R - 0.6], [-38.4, R], [13.4, R], [14, R - 0.6]];
    const seams = [-34.6, -33.6, 8.6, 9.6].map((y) => G.arcOf(F, y, R, P)).join("");
    const stubs = [[y0, -39], [14, CHEEK_Y.near[0]]];
    putCar(
      "car.cylinder",
      [cx(0), -12, AXIS_Z],
      // the far stub sits wholly behind the body's end face: recorded, not drawn
      S(G.solidOf(profile, F, P), { tone: "mid", crease: "faint", inner: L(seams, { tone: "faint" }) }) + S(G.disc(stubs[1][0], stubs[1][1], 2.6, F, P), { tone: "mid" }),
      [sSolid(F, profile), ...stubs.map(([a, b]) => sDisc(F, a, b, 2.6))],
    );
  }
  // ink drum and form rollers, on journals from cheek to cheek
  {
    const F = alongY(cx(DRUM.x), DRUM.z);
    const turned = (name, F, r0, rj, y0, y1, tone, at3) => {
      const body = [[y0, r0 - 0.5], [y0 + 0.5, r0], [y1 - 0.5, r0], [y1, r0 - 0.5]];
      // journals from the far boss to the body and from the body to the near cheek; the far one shows below the body's end
      const js = [[CHEEK_Y.far[1] + 0.8, y0], [y1, CHEEK_Y.near[0]]];
      const [jf, jn] = js.map(([a, b]) => S(G.disc(a, b, rj, F, P), { tone: "mid" }));
      putCar(name, at3, jf + S(G.solidOf(body, F, P), { tone, crease: "faint" }) + jn, [sSolid(F, body), ...js.map(([a, b]) => sDisc(F, a, b, rj))]);
    };
    turned("car.drum", F, DRUM.r, 1.5, -33, 8, "mid", [cx(DRUM.x), -12, DRUM.z]);
    ROLLERS.forEach((ro, i) => turned(`car.roller${i}`, alongY(cx(ro.x), ro.z), ro.r, 1.1, -32, 7, "lo", [cx(ro.x), -12, ro.z]));
  }
  // tie rod across the top, between the cheeks' inner faces, with a nut on each outer face
  {
    const T = { x: 6, z: TH + 31.4 };
    const F = alongY(cx(T.x), T.z);
    const prof = [[CHEEK_Y.far[1], 1.3], [CHEEK_Y.near[0], 1.3]];
    const nuts = [[CHEEK_Y.far[0] - 1.6, CHEEK_Y.far[0]], [CHEEK_Y.near[1], CHEEK_Y.near[1] + 1.6]];
    putCar("car.tie", [cx(T.x), -12, T.z], S(G.solidOf(prof, F, P), { tone: "mid" }), [sSolid(F, prof)]);
    nuts.forEach(([y0, y1], i) => putCar(`car.tie.nut${i}`, [cx(T.x), (y0 + y1) / 2, T.z], S(G.disc(y0, y1, 2, F, P), { tone: "mid" }), [sDisc(F, y0, y1, 2)]));
  }
  // feed board on the trailing side, its brackets, the side lay and a sheet
  {
    const [a, b] = [FEED.from, FEED.to];
    const d = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(d[0], d[1]);
    const u = [d[0] / len, d[1] / len];
    const n = u[0] < 0 ? [u[1], -u[0]] : [-u[1], u[0]]; // the board's upward normal
    const off = (p, t) => [p[0] + n[0] * t, p[1] + n[1] * t];
    const board = [a, b, off(b, -FEED.t), off(a, -FEED.t)];
    putCar("car.feed", [cx(-27), -12, TH + 18], S(plate(board, FEED.y[0], FEED.y[1], XC), { tone: "mid", crease: "faint" }) + Dt([0.15, 0.85].map((t) => at([cx(a[0] + d[0] * t), FEED.y[1] - 1.5, a[1] + d[1] * t])), { size: 0.4 }), [sPrism(plateF(XC), board, FEED.y[0], FEED.y[1])]);
    // brackets under the board, against each cheek's inner face
    // the board's underside line, z at x
    const ua = off(a, -FEED.t);
    const under = (x) => ua[1] + (x - ua[0]) * (d[1] / d[0]);
    const br = [[-16, under(-16) - 0.05], [-36, under(-36) - 0.05], [-16, TH + 9]];
    for (const [name, y0, y1] of [["far", CHEEK_Y.far[1], CHEEK_Y.far[1] + 1.6], ["near", CHEEK_Y.near[0] - 1.6, CHEEK_Y.near[0]]]) putCar(`car.bracket.${name}`, [cx(-22), (y0 + y1) / 2, TH + 15], S(plate(br, y0, y1, XC), { tone: "mid" }), [sPrism(plateF(XC), br, y0, y1)]);
    // the side lay: a fence on the board's far edge
    const lay = [off(lerp2(a, b, 0.1), 0), off(lerp2(a, b, 0.9), 0), off(lerp2(a, b, 0.9), 1.4), off(lerp2(a, b, 0.1), 1.4)];
    const layY = [-35.4, -34];
    putCar("car.lay", [cx(-27), layY[0] + 0.7, TH + 19], S(plate(lay, layY[0], layY[1], XC), { tone: "mid" }), [sPrism(plateF(XC), lay, layY[0], layY[1])]);
    // the blank sheet, lifted 0.1 off the board
    const sh = [off(lerp2(a, b, 0.06), 0.1), off(lerp2(a, b, 0.94), 0.1), off(lerp2(a, b, 0.94), 0.35), off(lerp2(a, b, 0.06), 0.35)];
    putCar("car.sheet", [cx(-27), -12, TH + 19.4], `<g data-sheet>${S(plate(sh, -33.6, 8, XC), { tone: "hi", crease: "none" })}</g>`, [sPrism(plateF(XC), sh, -33.6, 8)]);
  }
  // near side: bearing bosses, cylinder gear, crank pinion, crank arm and grip, trip lever
  {
    const yO = CHEEK_Y.near[1];
    const bosses = [
      [GEAR.x, GEAR.z, 3.8],
      [PINION.x, PINION.z, 3],
      [DRUM.x, DRUM.z, 2.6],
      [ROLLERS[0].x, ROLLERS[0].z, 2.2],
      [ROLLERS[1].x, ROLLERS[1].z, 2.2],
    ];
    bosses.forEach(([x, z, r], i) => {
      const F = alongY(cx(x), z);
      const yb = i < 2 ? GEAR.y[0] : yO + 1;
      putCar(`car.boss${i}`, [cx(x), yO + 0.5, z], S(G.disc(yO, yb, r, F, P), { tone: "mid" }) + (i >= 2 ? Dt([at([cx(x), yb, z])], { size: 0.5, tone: "hi" }) : ""), [sDisc(F, yO, yb, r)]);
    });
    // gear and pinion: smooth discs at the tooth tips; teeth, holes and spokes are live (rotating) detail on top
    const gearItem = (name, g, holes, hubR) => {
      const F = alongY(cx(g.x), g.z);
      const yf = g.y[1];
      const c = at([cx(g.x), yf, g.z]);
      const face = G.circleOf(F, yf, g.r - 0.9, P);
      const hub = S(G.disc(yf, yf + 0.8, hubR, F, P), { tone: "mid" });
      const holePath = holes.n ? Array.from({ length: holes.n }, (_, i) => G.circleOf(alongY(cx(g.x) + holes.at * Math.cos((i / holes.n) * 2 * Math.PI), g.z + holes.at * Math.sin((i / holes.n) * 2 * Math.PI)), yf, holes.r, P)).join("") : "";
      const rot = `<g data-rot="${name}" data-c="${pt(c)}">${holePath ? `<path class="iso-line ria-void" data-tone="lo" d="${holePath}"/>` : ""}</g>`;
      const teeth = `<path class="iso-line" data-tone="lo" data-teeth="${name}" d="${W.teethAt(g, W.TEETH[name], 0)}"/>`;
      putCar(`car.${name}`, [cx(g.x), (g.y[0] + yf) / 2, g.z], S(G.disc(g.y[0], yf, g.tip, F, P), { tone: "mid", inner: L(face, { tone: "faint" }) }) + teeth + rot + hub, [sDisc(F, g.y[0], yf, g.r), sDisc(F, yf, yf + 0.8, hubR)]);
    };
    gearItem("gear", GEAR, { n: 5, at: 7.4, r: 2.1 }, 3.2);
    gearItem("pinion", PINION, { n: 0 }, 2.4);
    // crank arm on the pinion shaft, and its grip; live.js turns the arm and carries the grip round
    const FP = alongY(cx(PINION.x), PINION.z);
    const end = [PINION.x + CRANK.len * Math.cos(CRANK.rest), PINION.z + CRANK.len * Math.sin(CRANK.rest)];
    const arm = barPoly([PINION.x, PINION.z], end, 2.2, 1.6);
    const armSvg = S(plate(arm, CRANK.y[0], CRANK.y[1], XC), { tone: "mid" }) + S(G.disc(CRANK.y[1], CRANK.y[1] + 0.6, 1.4, FP, P), { tone: "hi" });
    putCar("car.crank", [cx(PINION.x + 3), CRANK.y[1], PINION.z], `<g data-crank data-c="${pt(at([cx(PINION.x), CRANK.y[0], PINION.z]))}">${armSvg}</g>`, [sPrism(plateF(XC), arm, CRANK.y[0], CRANK.y[1])]);
    const FG = alongY(cx(end[0]), end[1]);
    const gripProf = [[CRANK.y[1], 1.1], [CRANK.y[1] + 0.8, 1.1], [CRANK.y[1] + 0.8, 1.55], [CRANK.grip[1] - 0.8, 1.55, 1], [CRANK.grip[1], 1.2, 1], [CRANK.grip[1] + 0.3, 0.6, 1]];
    const knurl = G.ribsOf(FG, CRANK.y[1] + 1.4, CRANK.grip[1] - 1.4, 1.55, 18, P, { fade: [0.1, 0.55], seams: true });
    putCar("car.grip", [cx(end[0]), (CRANK.grip[0] + CRANK.grip[1]) / 2, end[1]], `<g data-grip>${S(G.solidOf(gripProf, FG, P), { tone: "hi", crease: "lo" })}${k.fadedSvg(knurl, { tone: "lo" })}</g>`, [sSolid(FG, gripProf)]);
    // trip lever on the cheek's outer face
    const FT = alongY(cx(TRIP.x), TRIP.z);
    const tip = [TRIP.x + TRIP.len * Math.sin(TRIP.trip), TRIP.z + TRIP.len * Math.cos(TRIP.trip)];
    const lever = barPoly([TRIP.x, TRIP.z], tip, 1.3, 0.8);
    putCar("car.trip.boss", [cx(TRIP.x), yO + 0.8, TRIP.z], S(G.disc(yO, TRIP.y[0], 2.1, FT, P), { tone: "mid" }), [sDisc(FT, yO, TRIP.y[0], 2.1)]);
    const knob = [cx(tip[0]), TRIP.y[1] + 0.7, tip[1]];
    putCar(
      "car.trip",
      [cx(TRIP.x), TRIP.y[1], TRIP.z + 3],
      `<g data-trip data-c="${pt(at([cx(TRIP.x), TRIP.y[0], TRIP.z]))}">${S(plate(lever, TRIP.y[0], TRIP.y[1], XC), { tone: "mid" })}${S(G.disc(TRIP.y[1], TRIP.y[1] + 0.5, 0.9, FT, P), { tone: "hi" })}${S(G.sphereOf(knob, 1.5, P), { tone: "hi" })}</g>`,
      [sPrism(plateF(XC), lever, TRIP.y[0], TRIP.y[1]), sBall(knob, 1.5)],
    );
  }
  // the gripper bar on the cylinder: one path behind the body and one in front, re-drawn by live.js as it turns
  {
    const g = W.gripperAt(GRIPPER.rest);
    const paint = (side) => `<g data-gripper="${side}"${g.front === (side === "front") ? "" : ' style="display:none"'}><path class="iso-fill" d="${g.fill}"/><path class="iso-line" data-tone="hi" d="${g.edge}"/></g>`;
    // each copy is recorded where it faces straight away from or toward the viewer, so the order puts one under the body and one over it
    putCar("car.gripper.back", [cx(0), -12, AXIS_Z - 2], paint("back"), [W.gripperShape(W.GRIP_AWAY)]);
    putCar("car.gripper.front", [cx(0), -12, AXIS_Z + 2], paint("front"), [W.gripperShape(W.GRIP_AWAY + Math.PI)]);
  }

  // hit areas, painted last and invisible: a compartment picks its operator, the lever canonicalizes
  const hull2 = (pts3) => k.pathOf(G.hullOf(pts3.map(at)), true);
  const { TRAY: T, TRAY_H, cellW, cellX, LEVER: LV } = W;
  // a compartment's region: its opening, swept down the tray's near wall and the bench's front face; neighbours share
  // their boundaries, so the regions tile the screen without overlapping
  const yB = W.BENCH.y + W.BENCH.d;
  const wall = (x) => [[x, T.y, TRAY_H], [x, T.y + T.d, TRAY_H], [x, yB, 0], [x, yB, -W.BENCH_H]];
  const edge = (i) => (i === 0 ? T.x : i === 6 ? T.x + T.w : cellX(i) - cellW / 2 - W.DIVIDER / 2);
  let hits = OPS.map((op, i) => `<path class="ria-hit" data-hit="op" data-op="${op}" d="${k.pathOf([...wall(edge(i + 1)), ...wall(edge(i)).reverse()].map(at), true)}"/>`).join("");
  const yL = W.CABINET.y + W.CABINET.d;
  hits += `<path class="ria-hit" data-hit="canon" d="${hull2(k.boxCorners({ x: LV.x - 14, y: yL, w: 28, d: 8 }, 2, W.BED_Z + 1))}"/>`;
  return { items, defs: defs.filter(Boolean), hits };
}

const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
