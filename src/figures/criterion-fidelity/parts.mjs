// The drawing as a list of depth-ordered items. Each item carries its SVG and, when an
// audit shape factory `A` is passed, the true shapes of what it draws.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as S from "./scene.mjs";
import { STATIONS, JUDGES, leanOf, lampOf, stacksOf } from "./model.mjs";

const { P, at, depth, W, E, N, O, PLATE, PLATE_H, FOOT_H, PIV_Z, ARM, boxPaths, boxShape } = S;
const sol = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);

// The pose every frame is drawn from. REST is a measured state: Llama-8B, standard
// prompt, base card in the reader.
export function poseOf(judgeIndex, stationIndex, extra = {}) {
  const judge = JUDGES[judgeIndex];
  const station = STATIONS[stationIndex];
  const lean = leanOf(judge, station);
  const lift = [0, 0, 0];
  lift[stationIndex] = 1;
  return {
    judge: judgeIndex,
    station: stationIndex,
    theta: S.TILT * lean,
    poise: -S.POISE_MAX * lean,
    tray: S.trayFor(stationIndex),
    lift,
    arrest: 0,
    lamp: lampOf(judge, station),
    stacks: stacksOf(judge),
    floats: judge.order,
    first: judge.first,
    ...extra,
  };
}
export const REST = poseOf(1, 0);

// Printed words on each card, as rule lengths per line, and the candidates' biographies.
const WORDS = {
  base: [[5, 3, 5], [6, 4], [4, 4, 3, 2], [6]],
  lex: [[6, 3, 3], [4, 6], [4, 5, 2, 2], [7]],
  struct: [[4, 5, 3, 2], [6], [5, 3, 5], [6, 4]],
  cf: [[5, 3, 5], [6, 4], [4, 3, 4, 2], [6]],
};
const BIO = [[[4, 6, 3], [5, 2, 6]], [[4, 6, 3], [3, 7, 4]]];
const wordsOn = (lines, toPoint, gap) =>
  lines
    .map((words, row) => {
      let x = 0;
      return words.map((length) => {
        const d = k.pathOf([at(toPoint(x, row)), at(toPoint(x + length, row))]);
        x += length + gap;
        return d;
      }).join("");
    })
    .join("");
const ellipse = (point, r, count = 28) => k.pathOf(Array.from({ length: count }, (_, i) => at(point(r * Math.cos((i / count) * 2 * Math.PI), r * Math.sin((i / count) * 2 * Math.PI)))), true);

export function compose(pose = REST, A = null) {
  const items = [];
  const routes = [];
  const put = (layer, name, point, svg, shapes = [], bias = 0) => items.push({ layer, name, key: depth(point) + bias, svg, shapes });
  const rec = (make) => (A ? make(A) : []);
  const move = (shapes, offset) => (A ? shapes.map((shape) => A.moved(shape, offset)) : []);

  // Base plate on four feet.
  {
    const base = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(PLATE, 22)).slice(1)) {
      base.push(sol(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 16), { tone: "lo" }), sol(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 16), { tone: "mid" }));
      shapes.push(...rec((A) => [A.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, { name: "stand.foot.flange" }), A.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: "stand.foot" })]));
    }
    base.push(sol(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 6, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 6), { tone: "faint" }) }));
    base.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PLATE, 10);
    base.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    items.push({ layer: 0, name: "stand.base", key: -1e6, svg: base.join(""), shapes: [...shapes, ...rec((A) => [A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate" })])] });
  }

  // Ruler strip under the shuttle: a major tick under each station.
  {
    const strip = { x: -107, y: 61, w: 214, d: 5, r: 1 };
    const ticks = k.topTicks(-102, 102.1, S.PITCH / 10, 10, strip.y + 0.8, 0.6, [1.8, 3.4], P);
    const svg = sol(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 1.6, strip.y + 2.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 2.5, 0.6])], { size: 0.42 });
    put(1, "base.ruler", [0, 63.5, 0], svg, rec((A) => [A.slab(strip, 0, 0.6, { name: "base.ruler" }, 3)]));
  }

  // Label plate with the maker's mark and three rule lines.
  {
    const plan = { x: -103, y: 67.5, w: 46, d: 12.5, r: 1.4 };
    const z = 0.8;
    const svg = [
      sol(k.slabOf(plan, 0, z, P, 4), { tone: "mid" }),
      L(k.planOutline(k.insetPlan(plan, 1.4), z, P, 4), { tone: "faint" }),
      k.faceTextSvg(k.topMatrix([-91.5, 72.2], z, P, "x"), "AU-2", { size: 3.4, tone: "mid" }),
      ...[[74.4, 30], [76.4, 24], [78.2, 16]].map(([y, w]) => L(k.lineOnTop([-91.5, y], [-91.5 + w, y], z, P), { tone: "lo", free: true })),
      D([at([plan.x + 3.2, plan.y + 3.2, z]), at([plan.x + 3.2, plan.y + plan.d - 3.2, z])], { size: 0.45 }),
    ].join("");
    put(1, "base.label", [plan.x + plan.w / 2, plan.y + plan.d / 2, 0], svg, rec((A) => [A.slab(plan, 0, z, { name: "base.label" }, 4)]));
  }

  // Spirit level: a balance is levelled before it judges anything.
  {
    const [x, y] = [108, -27];
    const svg = [sol(k.cylinder(x, y, 6.4, 0, 2.6, P, 24, 0.5), { tone: "mid" }), L(k.ring(x, y, 5, 2.6, P, 24), { tone: "lo" }), L(k.ring(x, y, 1.9, 2.6, P, 16), { tone: "faint" }), L(k.ring(x + 0.2, y - 0.2, 1.15, 2.6, P, 14), { tone: "hi" })].join("");
    put(1, "base.level", [x, y, 1], svg, rec((A) => [A.cylinder(x, y, 6.4, 0, 2.6, { name: "base.level" })]));
  }

  // Weight box: the reference weights a balance is checked against.
  {
    const box = { x: -112, y: -70, w: 30, d: 20, r: 1.2 };
    const lid = { x: box.x + 1.2, y: box.y + 1.2, w: box.w - 2.4, d: box.d - 2.4, r: 0.8 };
    const wells = [[-105, -63.5, 3], [-97, -63.5, 2.3], [-104.5, -55.5, 2.3]];
    const svg = [
      sol(k.slabOf(box, 0, 5, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(box, 2.5, P, 4), { tone: "faint" }) }),
      L(k.planOutline(lid, 5, P, 3), { tone: "faint" }),
      ...wells.map(([x, y, r]) => L(k.ring(x, y, r + 0.6, 5, P, 16), { tone: "lo" }) + sol(k.cylinder(x, y, r, 5, r * 1.3, P, 14), { tone: "mid" }) + D([at([x, y, 5 + r * 1.3])], { size: 0.45 })),
      D([[box.x + 2.4, box.y + 2.4], [box.x + box.w - 2.4, box.y + 2.4], [box.x + 2.4, box.y + box.d - 2.4], [box.x + box.w - 2.4, box.y + box.d - 2.4]].map(([x, y]) => at([x, y, 5])), { size: 0.4 }),
    ].join("");
    put(1, "base.weights", [box.x + box.w / 2, box.y + box.d / 2, 2], svg, rec((A) => [A.slab(box, 0, 5, { name: "base.weights" }, 4), ...wells.map(([x, y, r]) => A.cylinder(x, y, r, 5, r * 1.3, { name: "base.weight" }))]));
  }

  // Family register: the 600 test families, filed into four stacks by what the judge
  // got right. A graduated back wall reads every stack against the same 600.
  {
    const { REG, STACK } = S;
    const t = 1.4;
    const back = { x: REG.x, y: REG.y, w: REG.w, d: t, r: 0.4 };
    const floor = { x: REG.x + t, y: REG.y + t, w: REG.w - 2 * t, d: REG.d - 2 * t, r: 0.3 };
    const side = (x) => ({ x, y: REG.y + t, w: t, d: REG.d - t, r: 0.4 });
    const lip = { x: REG.x + t, y: REG.y + REG.d - t, w: REG.w - 2 * t, d: t, r: 0.3 };
    const wallH = STACK.h + 2.6;
    const face = REG.y + t;
    // A raised index strip at the right edge of the wall; the rules run to it.
    const strip = { x: REG.x + REG.w - t - 1.4, y: face, w: 1.4, d: 0.5, r: 0.2 };
    const stripH = STACK.h + 0.8;
    const rules = [];
    for (let n = 1; n <= 12; n++) {
      const z = 0.8 + (n * STACK.h) / 12;
      rules.push([n % 6 === 0 ? "lo" : "faint", path3([[REG.x + 0.1, face, z], [strip.x, face, z]])]);
    }
    const stacks = [0, 1, 2, 3].map((index) => {
      const paths = S.stackPaths(index, pose.stacks[index]);
      return `<g data-part="stack-${index}"${index === pose.station ? " data-on" : ""}>${S.liveSolidSvg(`stack-${index}`, paths, { tone: "mid" }).replace('<path class="iso-line iso-edge"', `<path class="iso-line" data-tone="faint" data-seams="" d="${paths.seams}"/><path class="iso-line iso-edge"`)}</g>`;
    });
    const svg = [
      sol(k.slabOf(back, 0, wallH, P, 2), { tone: "mid" }),
      ...rules.map(([tone, d]) => L(d, { tone })),
      sol(k.slabOf(strip, 0.8, stripH, P, 2), { tone: "mid", crease: "none" }),
      sol(k.slabOf(side(REG.x), 0, 8, P, 2), { tone: "mid" }),
      sol(k.slabOf(floor, 0, 0.8, P, 2), { tone: "lo", crease: "none" }),
      ...stacks,
      sol(k.slabOf(side(REG.x + REG.w - t), 0, 8, P, 2), { tone: "mid" }),
      sol(k.slabOf(lip, 0, 4, P, 2), { tone: "mid" }),
      D([at([REG.x + 3, face - t / 2, wallH]), at([REG.x + REG.w - 3, face - t / 2, wallH])], { size: 0.45 }),
    ].join("");
    const shapes = rec((A) => [A.slab(back, 0, wallH, { name: "register.back" }, 2), A.slab(strip, 0.8, stripH, { name: "register.strip" }, 2), A.slab(side(REG.x), 0, 8, { name: "register.side" }, 2), A.slab(side(REG.x + REG.w - t), 0, 8, { name: "register.side" }, 2), A.slab(floor, 0, 0.8, { name: "register.floor" }, 2), A.slab(lip, 0, 4, { name: "register.lip" }, 2), ...[0, 1, 2, 3].map((index) => A.slab(S.stackPlan(index), 0.8, Math.max(0.05, pose.stacks[index] * STACK.h), { name: "register.stack" }, 2))]);
    put(1, "register", [REG.x + REG.w / 2, REG.y + REG.d / 2, 6], svg, shapes);
  }

  // Pan rests under both pans: each pan comes down onto its rest at full deflection.
  for (const side of [-1, 1]) {
    const [x, y] = W(side * ARM, 0, 0);
    const padZ = S.REST_TOP - 1.4;
    const svg = sol(k.cylinder(x, y, 4, 0, 1, P, 16), { tone: "mid" }) + sol(k.cylinder(x, y, 1.9, 1, padZ - 1, P, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 1.9, 6, P, 8), { tone: "faint" }) }) + sol(k.cylinder(x, y, 4.6, padZ, 1.4, P, 18, 0.4), { tone: "mid" }) + L(k.ring(x, y, 3, S.REST_TOP, P, 14), { tone: "faint" });
    put(1, `base.rest${side < 0 ? "L" : "R"}`, [x, y, 2], svg, rec((A) => [A.cylinder(x, y, 4, 0, 1, { name: "base.rest.foot" }), A.cylinder(x, y, 1.9, 1, padZ - 1, { name: "base.rest.post" }), A.cylinder(x, y, 4.6, padZ, 1.4, { name: "base.rest.pad" })]));
  }

  // Rider-carrier posts. The left one stands on a foot; the right one on the drive box
  // that the reader's cable runs to, and its cord climbs to the pulley on top.
  const { RAIL, PULLEY } = S;
  const postParts = (side) => {
    const p = side * RAIL.p;
    const [x, y] = W(p, 0, 0);
    const base = side < 0 ? 1.5 : 8;
    const top = RAIL.z - RAIL.block;
    const pulleyF = G.frameAlong(W(p, PULLEY.q0, RAIL.z), [-N[0], -N[1], 0]);
    const svg = [
      side < 0 ? sol(k.cylinder(x, y, 4, 0, 1.5, P, 16, 0.3), { tone: "mid" }) : "",
      sol(k.cylinder(x, y, 1.6, base, top - base, P, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 1.6, base + 3, P, 8), { tone: "faint" }) }),
      sol(G.disc(0, 1, PULLEY.r, pulleyF, P, { steps: 18 }), { tone: "mid" }) + D([at(G.pointOf(pulleyF, 1, 0, 0))], { size: 0.45 }),
      sol(boxPaths(p - RAIL.block, -RAIL.block, p + RAIL.block, RAIL.block, top, RAIL.z + RAIL.block, 0.5), { tone: "mid" }),
      D([at(W(p, RAIL.block, RAIL.z + 1.3)), at(W(p, RAIL.block, RAIL.z - 1.3))], { size: 0.45 }),
    ];
    if (side > 0) svg.splice(2, 0, L(path3([W(p + PULLEY.r, S.CORD_Q, RAIL.z), W(p + PULLEY.r, S.CORD_Q, 8)]), { tone: "mid" }) + D([at(W(p + PULLEY.r, S.CORD_Q, 8))], { size: 0.55, tone: "mid" }));
    const shapes = rec((A) => [
      ...(side < 0 ? [A.cylinder(x, y, 4, 0, 1.5, { name: "rider.foot" })] : []),
      A.cylinder(x, y, 1.6, base, top - base, { name: "rider.post" }),
      A.disc(pulleyF, 0, 1, PULLEY.r, { name: "rider.pulley" }),
      boxShape(A, p - RAIL.block, -RAIL.block, p + RAIL.block, RAIL.block, top, RAIL.z + RAIL.block, 0.5, "rider.block"),
    ]);
    return [svg.join(""), shapes];
  };
  {
    const [svg, shapes] = postParts(-1);
    put(2, "rider.postL", W(-RAIL.p, 0, 60), svg, shapes, -400);
    const p = RAIL.p;
    const drive = sol(boxPaths(p - 5, -5, p + 5, 5, 0, 8, 0.8), { tone: "mid", inner: L(k.ringSeam(S.rrect(p - 5, -5, p + 5, 5, 0.8).map(([u, v]) => W(u, v, 0).slice(0, 2)), 3.4, P), { tone: "faint" }) }) + D([W(p - 3.6, 3.6, 8), W(p + 3.6, 3.6, 8), W(p - 3.6, -3.6, 8), W(p + 3.6, -3.6, 8)].map(at), { size: 0.45 });
    put(1, "rider.drive", W(p, 0, 4), drive, rec((A) => [boxShape(A, p - 5, -5, p + 5, 5, 0, 8, 0.8, "rider.drive")]));
  }

  // Column: levelling screws, plinth with the arrest knob, flange, tube with a locking
  // collar, head with the agate plane and the arrest arms, scale post.
  const HZ = PIV_Z - 9;
  {
    const [x, y] = O;
    const C0 = 44;
    const screws = byDepth([-1, 1].flatMap((a) => [-1, 1].map((b) => W(a * 11, b * 11, 0))));
    const knobF = G.frameOf(W(0, S.ARREST_KNOB.q, S.ARREST_KNOB.z), N, E, [0, 0, 1]);
    const arm = (sign) => boxPaths(sign < 0 ? -26.4 : 9, -2, sign < 0 ? -9 : 26.4, 2, HZ, HZ + 2, 0.4);
    const bush = (sign) => {
      const [bx, by] = W(sign * S.ARREST.p, 0, 0);
      return sol(k.cylinder(bx, by, 1.8, HZ + 2, S.ARREST.z0 - HZ - 2, P, 12), { tone: "mid" });
    };
    const svg = [
      ...screws.map(([sx, sy]) => sol(k.cylinder(sx, sy, 2.4, 0, 2.5, P, 14), { tone: "mid", inner: L(k.knurl(sx, sy, 2.4, 0.4, 2.1, 10, P), { tone: "lo" }) })),
      sol(boxPaths(-15, -15, 15, 15, 2.5, 7.5, 3), { tone: "mid" }),
      D(screws.map(([sx, sy]) => at([sx, sy, 7.5])), { size: 0.5 }),
      sol(G.disc(0, S.ARREST_KNOB.s, S.ARREST_KNOB.r, knobF, P, { steps: 24 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(knobF, 0.2, S.ARREST_KNOB.s - 0.2, S.ARREST_KNOB.r, 14, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }),
      `<path class="iso-line" data-tone="hi" data-part="arrest-pointer" d="${S.arrestPointer(pose.arrest)}" style="stroke-width:.9"/>`,
      sol(k.cylinder(x, y, 9, 7.5, 3, P, 26, 0.5), { tone: "mid" }),
      sol(k.cylinder(x, y, 4.5, 10.5, C0 - 10.5, P, 16), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 4.5, 26, P, 10), { tone: "faint" }) }),
      sol(k.cylinder(x, y, 5.8, C0, 4, P, 20), { tone: "mid", inner: L(k.knurl(x, y, 5.8, C0 + 0.6, C0 + 3.4, 16, P), { tone: "lo" }) }),
      sol(k.cylinder(x, y, 4.5, C0 + 4, HZ - C0 - 4, P, 16), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 4.5, 70, P, 10), { tone: "faint" }) }),
      sol(arm(-1), { tone: "mid" }),
      bush(-1),
      sol(boxPaths(-9, -7.5, 9, 7.5, HZ, HZ + 8, 2), { tone: "mid" }),
      D([at(W(-6.4, 5.2, HZ + 8)), at(W(6.4, 5.2, HZ + 8))], { size: 0.45 }),
      sol(boxPaths(-4, -3.6, 4, 3.6, HZ + 8, PIV_Z, 0.5), { tone: "lo" }),
      sol(boxPaths(-2, -7.5, 2, -4, HZ + 8, HZ + 64, 0.6), { tone: "mid", crease: "none" }),
      sol(arm(1), { tone: "mid" }),
      bush(1),
    ].join("");
    put(
      2,
      "column",
      W(0, 0, 60),
      svg,
      rec((A) => [
        ...screws.map(([sx, sy]) => A.cylinder(sx, sy, 2.4, 0, 2.5, { name: "column.level-screw" })),
        boxShape(A, -15, -15, 15, 15, 2.5, 7.5, 3, "column.plinth"),
        A.disc(knobF, 0, S.ARREST_KNOB.s, S.ARREST_KNOB.r, { name: "column.arrest-knob" }),
        A.cylinder(x, y, 9, 7.5, 3, { name: "column.flange" }),
        A.cylinder(x, y, 4.5, 10.5, C0 - 10.5, { name: "column.tube" }),
        A.cylinder(x, y, 5.8, C0, 4, { name: "column.collar" }),
        A.cylinder(x, y, 4.5, C0 + 4, HZ - C0 - 4, { name: "column.upper" }),
        boxShape(A, -9, -7.5, 9, 7.5, HZ, HZ + 8, 2, "column.head"),
        boxShape(A, -4, -3.6, 4, 3.6, HZ + 8, PIV_Z, 0.5, "column.agate"),
        boxShape(A, -2, -7.5, 2, -4, HZ + 8, HZ + 64, 0.6, "column.post"),
        ...[-1, 1].flatMap((sign) => {
          const [bx, by] = W(sign * S.ARREST.p, 0, 0);
          return [boxShape(A, sign < 0 ? -26.4 : 9, -2, sign < 0 ? -9 : 26.4, 2, HZ, HZ + 2, 0.4, "column.arrest-arm"), A.cylinder(bx, by, 1.8, HZ + 2, S.ARREST.z0 - HZ - 2, { name: "column.bushing" })];
        }),
      ]),
    );
    // Locking screw on the collar, facing the viewer.
    const F = G.frameAlong(W(0, 5.8, C0 + 2), N);
    const screw = sol(G.disc(0, 1.6, 1, F, P), { tone: "mid" }) + sol(G.disc(1.6, 3.8, 2.1, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 1.6, 3.8, 2.1, 12, P, { fade: [0.1, 0.55] }), { tone: "lo" }) });
    put(2, "column.screw", W(0, 8, C0 + 2), screw, rec((A) => [A.disc(F, 0, 1.6, 1, { name: "column.screw.neck" }), A.disc(F, 1.6, 3.8, 2.1, { name: "column.screw.head" })]), 300);
  }

  // Arrest pins, rebuilt by live.js.
  {
    const pins = [-1, 1].map((side) => S.liveSolidSvg(`arrest-${side < 0 ? "l" : "r"}`, S.arrestPaths(side, pose.arrest), { tone: "mid" })).join("");
    const shapes = rec((A) => [-1, 1].map((side) => {
      const [x, y] = W(side * S.ARREST.p, 0, 0);
      return A.cylinder(x, y, S.ARREST.r, S.ARREST.z0, S.arrestTip(pose.arrest) - S.ARREST.z0, { name: "arrest.pin" });
    }));
    put(2, "arrest", W(0, 0, 96), `<g data-part="arrest">${pins}</g>`, shapes, 350);
  }

  // Scale plate on the post, behind the tongue, with stop pins at the ends of travel.
  {
    const F = { o: S.PIV, a: [-N[0], -N[1], 0], u: E, v: [0, 0, 1] };
    const arc = [];
    for (let deg = 17; deg >= -17; deg -= 1) arc.push([60 * Math.sin(deg * S.DEG), 60 * Math.cos(deg * S.DEG)]);
    const chord = 47 * Math.cos(17 * S.DEG);
    const half = 47 * Math.sin(17 * S.DEG);
    const poly = [[-half, chord], [half, chord], ...arc];
    const face = (u, v) => W(u, 2.5, PIV_Z + v);
    const tick = (phi, length) => k.pathOf([at(face(60 * Math.sin(phi), 60 * Math.cos(phi))), at(face((60 - length) * Math.sin(phi), (60 - length) * Math.cos(phi)))]);
    const minor = [];
    const major = [];
    for (let index = -10; index <= 10; index++) {
      if (index === 0) continue;
      // Ten divisions to each stop: one division is 5 points of rate.
      (index % 5 === 0 ? major : minor).push(tick((index * S.TILT) / 10, index % 5 === 0 ? 3.6 : 2));
    }
    put(2, "scale.standoff", W(0, -1, PIV_Z + 50), sol(boxPaths(-2, -4, 2, 1.5, PIV_Z + 46, PIV_Z + 54, 0.4), { tone: "mid", crease: "none" }), rec((A) => [boxShape(A, -2, -4, 2, 1.5, PIV_Z + 46, PIV_Z + 54, 0.4, "scale.standoff")]), 400);
    const plateSvg = sol(G.prismOf(F, poly, -2.5, -1.5, P), { tone: "hi", crease: "lo" }) + L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) + L(tick(0, 4.8), { tone: "hi" }) + D([at(face(0, 55.2))], { size: 0.5, tone: "hi" }) + D([at(face(-half + 2.4, chord + 2.2)), at(face(half - 2.4, chord + 2.2))], { size: 0.45 });
    put(2, "scale.plate", W(0, 2, PIV_Z + 52), plateSvg, rec((A) => [A.prism(F, poly, -2.5, -1.5, { name: "scale.plate" })]), 400);
    for (const sign of [-1, 1]) {
      const phi = sign * S.STOP_PHI;
      const centre = [S.STOP_R * Math.sin(phi), S.STOP_R * Math.cos(phi)];
      const ring = Array.from({ length: 16 }, (_, i) => [centre[0] + S.STOP_PIN * Math.cos((i / 16) * 2 * Math.PI), centre[1] + S.STOP_PIN * Math.sin((i / 16) * 2 * Math.PI)]);
      put(sign < 0 ? 2 : 4, `scale.stop${sign < 0 ? "L" : "R"}`, W(centre[0], 4, PIV_Z + centre[1]), sol(G.prismOf(F, ring, -5, -2.5, P), { tone: "mid" }), rec((A) => [A.prism(F, ring, -5, -2.5, { name: "scale.stop" })]), 500);
    }
  }

  // Rail over the beam, and the carriage, cord lug, cord and finger (live).
  {
    const F = G.frameAlong(W(-RAIL.p + RAIL.block, 0, RAIL.z), E);
    const length = 2 * (RAIL.p - RAIL.block);
    put(2, "rider.rail", W(0, 0, RAIL.z), sol(G.disc(0, length, RAIL.r, F, P, { steps: 16 }), { tone: "mid", crease: "none" }), rec((A) => [A.disc(F, 0, length, RAIL.r, { name: "rider.rail" })]), 600);
    const x = pose.poise;
    put(2, "rider.cord", W(0, S.CORD_Q, RAIL.z), `<path class="iso-line" data-tone="mid" data-part="cord" d="${S.cordPath(x)}"/>`, [], 550);
    const c = S.carriagePaths(x);
    const C = S.CARRIAGE;
    const svg = S.liveSolidSvg("lug", c.lug, { tone: "mid" }) + S.liveSolidSvg("carriage", c.top, { tone: "mid" }) + S.liveSolidSvg("cheek", c.cheek, { tone: "mid" });
    const shapes = rec((A) => [boxShape(A, x - C.half, C.back, x + C.half, C.front, C.top, C.top + C.plate, 0.5, "rider.carriage"), boxShape(A, x - C.half, C.cheek, x + C.half, C.front, C.drop, C.top, 0.3, "rider.cheek"), boxShape(A, x - S.LUG.half, S.LUG.q0, x + S.LUG.half, C.back, S.LUG.z0, S.LUG.z1, 0.3, "rider.lug")]);
    put(3, "rider.carriage", W(0, 0, RAIL.z), `<g data-part="carriage">${svg}</g>`, shapes, 150);
  }

  // Stirrups, back half: bar, pan with its candidate, bent-wire bow, hanger, lower
  // bridge and the back cheek. They hang from the end knives and only translate.
  const stirrupShapes = {};
  for (const side of [-1, 1]) {
    const p = side * ARM;
    const shift = S.stirrupShift(pose.theta, side);
    const [x, y] = W(p, 0, 0);
    const blockTop = S.PAN_Z + 1.6 + 7;
    const bow = G.fillet([W(p - S.BOW, 0, S.PAN_Z), W(p - S.BOW, 0, S.APEX_Z), W(p + S.BOW, 0, S.APEX_Z), W(p + S.BOW, 0, S.PAN_Z)], S.BOW - 0.8, 9, { P, tube: 0.8 });
    const bowPieces = tubePieces(bow, 0.8, P, { maxLength: 400, spacing: 1.8 });
    const svg = [
      sol(boxPaths(p - 19, -1.2, p + 19, 1.2, S.BAR_Z, S.PAN_Z, 0.5), { tone: "mid" }),
      sol(k.cylinder(x, y, S.PAN_R, S.PAN_Z, 1.6, P, 36, 0.4), { tone: "mid" }),
      L(k.ring(x, y, S.PAN_R - 2.2, S.PAN_Z + 1.6, P, 32), { tone: "faint" }),
      sol(boxPaths(p - 11, -6.5, p + 11, 6.5, S.PAN_Z + 1.6, blockTop, 1), { tone: "hi", crease: "lo" }),
      L(wordsOn(BIO[side < 0 ? 0 : 1], (u, row) => W(p - 8.6 + u, 2.4 - row * 4.8, blockTop), 1.1), { tone: "lo", free: true }),
      ...bowPieces.map((piece) => tubeSvg(piece, { tone: "mid" })),
      sol(k.cylinder(x, y, 0.7, S.APEX_Z + 0.8, S.BRIDGE_Z - 1.4 - S.APEX_Z - 0.8, P, 10), { tone: "mid", crease: "none" }),
      sol(boxPaths(p - 2.6, -4.6, p + 2.6, 4.6, S.BRIDGE_Z - 1.4, S.BRIDGE_Z, 0.4), { tone: "mid" }),
      sol(boxPaths(p - 2.2, -4.6, p + 2.2, -3.2, S.BRIDGE_Z, S.AGATE_Z, 0.3), { tone: "mid" }),
    ].join("");
    const shapes = rec((A) => [
      boxShape(A, p - 19, -1.2, p + 19, 1.2, S.BAR_Z, S.PAN_Z, 0.5, "stirrup.bar"),
      A.cylinder(x, y, S.PAN_R, S.PAN_Z, 1.6, { name: "stirrup.pan" }),
      boxShape(A, p - 11, -6.5, p + 11, 6.5, S.PAN_Z + 1.6, blockTop, 1, "stirrup.candidate"),
      ...bowPieces.map((piece) => A.tube(piece.points, piece.radii, { name: "stirrup.bow" })),
      A.cylinder(x, y, 0.7, S.APEX_Z + 0.8, S.BRIDGE_Z - 1.4 - S.APEX_Z - 0.8, { name: "stirrup.hanger" }),
      boxShape(A, p - 2.6, -4.6, p + 2.6, 4.6, S.BRIDGE_Z - 1.4, S.BRIDGE_Z, 0.4, "stirrup.bridge"),
      boxShape(A, p - 2.2, -4.6, p + 2.2, -3.2, S.BRIDGE_Z, S.AGATE_Z, 0.3, "stirrup.cheek"),
    ]);
    stirrupShapes[side] = { bow, shift };
    routes.push({ name: `stirrup.bow${side < 0 ? "L" : "R"}`, route: bow.map((point) => G.add3(point, shift)), r: 0.8, rigid: true, touch: ["stirrup.hanger"] });
    const tag = side < 0 ? "l" : "r";
    put(2, `stirrup${tag.toUpperCase()}`, W(p, 0, 70), `<g data-part="stirrup-${tag}" transform="${k.translateAlong(P, shift)}">${svg}</g>`, move(shapes, shift), 700);
  }

  // The beam assembly, rebuilt by live.js every frame.
  {
    const F = S.beamFrame(pose.theta);
    const shapes = rec((A) => S.beamPolys(pose.poise).filter(([name]) => name !== "tongue").map(([name, polygon, s0, s1]) => A.prism(F, polygon, s0, s1, { name: `beam.${name}` })));
    put(3, "beam", W(0, 0, PIV_Z + 7), `<g data-part="beam">${S.beamSvg(pose.theta, pose.poise)}</g>`, shapes);
  }
  {
    const x = pose.poise;
    const shapes = rec((A) => [boxShape(A, x - 0.5, S.FINGER.q0, x + 0.5, S.FINGER.q1, S.fingerTip(x), S.CARRIAGE.drop, 0.2, "rider.finger")]);
    put(3, "rider.finger", W(0, 0, RAIL.z - 8), `<g data-part="finger">${S.liveSolidSvg("finger", S.fingerPaths(x), { tone: "mid" })}</g>`, shapes, 100);
  }
  {
    const F = S.beamFrame(pose.theta);
    const tongue = S.beamPolys(pose.poise).find(([name]) => name === "tongue");
    put(3, "tongue", W(0, 4, PIV_Z + 30), `<g data-part="tongue">${S.liveSolidSvg("tongue", G.prismOf(F, tongue[1], tongue[2], tongue[3], P), S.BEAM_STYLE.tongue)}</g>`, rec((A) => [A.prism(F, tongue[1], tongue[2], tongue[3], { name: "beam.tongue" })]), 200);
  }

  // Stirrups, front half: front cheek and the agate plane resting on the end knife.
  for (const side of [-1, 1]) {
    const p = side * ARM;
    const { shift } = stirrupShapes[side];
    const svg = sol(boxPaths(p - 2.2, 3.2, p + 2.2, 4.6, S.BRIDGE_Z, S.AGATE_Z, 0.3), { tone: "mid" }) + sol(boxPaths(p - 3, -4.6, p + 3, 4.6, S.AGATE_Z, S.AGATE_Z + 1.4, 0.4), { tone: "mid" }) + D([at(W(p, 0, S.AGATE_Z + 1.4))], { size: 0.55, tone: "hi" });
    const shapes = rec((A) => [boxShape(A, p - 2.2, 3.2, p + 2.2, 4.6, S.BRIDGE_Z, S.AGATE_Z, 0.3, "stirrup.cheek"), boxShape(A, p - 3, -4.6, p + 3, 4.6, S.AGATE_Z, S.AGATE_Z + 1.4, 0.4, "stirrup.agate")]);
    const tag = side < 0 ? "l" : "r";
    put(4, `stirrup${tag.toUpperCase()}.front`, W(p, 0, 105), `<g data-part="stirrup-${tag}-front" transform="${k.translateAlong(P, shift)}">${svg}</g>`, move(shapes, shift));
  }
  {
    const [svg, shapes] = postParts(1);
    put(4, "rider.postR", W(RAIL.p, 0, 60), svg, shapes, 300);
  }

  // Cables: the judge selector feeds the reader; the reader drives the carriage.
  const cable = (name, points, r, layer, bias) => {
    const route = G.fillet(points, Math.max(3, r * 2.6), 6, { P, tube: r });
    const total = G.pathLength(route);
    const SHELL = 2.4;
    const gaps = [[0, SHELL], [total - SHELL, total]];
    routes.push({ name, route, r, gaps, rims: [r * 1.9, r * 1.9], touch: ["stand.plate"] });
    tubePieces(route, r, P, { maxLength: 24, spacing: 1.6, gaps }).forEach((piece, index) => put(layer, `${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), rec((A) => [A.tube(piece.points, piece.radii, { name, owner: name, limp: true })]), bias));
    [0, 1].forEach((index) => {
      const end = index ? route[route.length - 1] : route[0];
      const tangent = G.tangentAlong(route, index ? total : 0);
      const F = G.frameAlong(end, tangent);
      const [s0, s1] = index ? [-SHELL, 0] : [0, SHELL];
      put(layer, `${name}.shell${index}`, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), sol(G.disc(s0, s1, r * 1.9, F, P, { steps: 20, bevel: 0.2 }), { tone: "mid" }), rec((A) => [A.disc(F, s0, s1, r * 1.9, { name: `${name}.shell`, owner: name })]), bias + 0.1);
    });
  };
  const C = S.CONSOLE;
  cable("cable.judge", [[S.SWITCH.x, S.SWITCH.y + 18, 2.4], [S.SWITCH.x - 5, S.SWITCH.y + 18, 2.4], [S.SWITCH.x - 9, S.SWITCH.y + 18, 0.9], [C.x + C.w + 12, C.y + 4, 0.9], [C.x + C.w + 6, C.y + 4, 2.4], [C.x + C.w, C.y + 4, 2.4]], 0.9, 6, 0);
  cable("cable.drive", [[C.x + C.w - 6, C.y, 2.4], [C.x + C.w - 6, C.y - 5, 2.4], [C.x + C.w - 6, C.y - 9, 0.9], W(RAIL.p, 18, 0.9), W(RAIL.p, 10, 0.9), W(RAIL.p, 7, 2.4), W(RAIL.p, 5, 2.4)], 0.9, 1, 0);

  // Judge selector: a five-position rotary switch.
  {
    const top = S.SWITCH_H;
    const [cx, cy] = S.KNOB;
    const SW = S.SWITCH;
    const svg = [
      sol(k.slabOf(SW, 0, top, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(SW, 3, P, 4), { tone: "faint" }) }),
      L(k.ring(cx, cy, 7.4, top, P, 32), { tone: "faint" }),
      D(S.DETENTS.map((a) => at([cx + Math.cos(a) * 8.6, cy + Math.sin(a) * 8.6, top])), { size: 0.6, tone: "mid" }),
      D([[SW.x + 3, SW.y + 3], [SW.x + SW.w - 3, SW.y + 3], [SW.x + 3, SW.y + SW.d - 3], [SW.x + SW.w - 3, SW.y + SW.d - 3]].map(([x, y]) => at([x, y, top])), { size: 0.45 }),
      sol(k.cylinder(cx, cy, S.KNOB_R, top, 5, P, 28, 0.4), { tone: "mid", inner: L(k.knurl(cx, cy, S.KNOB_R, top + 0.6, top + 4.4, 22, P), { tone: "lo" }) }),
      L(k.ring(cx, cy, 3.2, top + 5, P, 20), { tone: "faint" }),
      `<path class="iso-line" data-tone="hi" data-part="knob-pointer" d="${S.knobPointer(S.DETENTS[pose.judge])}" style="stroke-width:1"/>`,
      D([at([cx, cy, top + 5])], { size: 0.55, tone: "hi" }),
    ].join("");
    put(6, "switch", [SW.x + 12, SW.y + 12, 4], `<g data-part="switch">${svg}</g>`, rec((A) => [A.slab(SW, 0, top, { name: "switch.box" }, 4), A.cylinder(cx, cy, S.KNOB_R, top, 5, { name: "switch.knob" })]));
  }

  // Order console beside the reader: four sight gauges (order disagreement per criterion
  // variant), the station index under them, and the first-shown dial.
  {
    const C = S.CONSOLE;
    const plan = { x: C.x, y: C.y, w: C.w, d: C.d, r: 1 };
    const fy = S.FACE_Y;
    const g = S.GAUGE;
    const onFace = (x, z, dy = 0) => at([x, fy + dy, z]);
    const slot = (x) => k.pathOf([onFace(x - g.w / 2, g.z0), onFace(x + g.w / 2, g.z0), onFace(x + g.w / 2, g.z0 + g.h), onFace(x - g.w / 2, g.z0 + g.h)], true);
    const wall = (x) => k.pathOf([onFace(x - g.w / 2, g.z0 + g.h), onFace(x - g.w / 2 + 0.5, g.z0 + g.h - 0.5, -0.6), onFace(x - g.w / 2 + 0.5, g.z0 + 0.5, -0.6), onFace(x + g.w / 2, g.z0 + 0.5, -0.6)]);
    const strip = { x: C.x + 2.2, y: fy, w: 1.6, d: 0.5, r: 0.2 };
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const z = g.z0 + 0.9 + (i * (g.h - 1.8)) / 10;
      ticks.push([i % 5 === 0 ? "mid" : "lo", k.pathOf([at([strip.x + strip.w, fy + 0.25, z]), at([strip.x + strip.w + (i % 5 === 0 ? 1.4 : 0.8), fy + 0.25, z])])]);
    }
    const dialF = G.frameAlong([S.DIAL.x, fy, S.DIAL.z], [0, 1, 0]);
    const dialTicks = [];
    for (let i = 0; i <= 10; i++) {
      const a = ((i / 10) * 2 - 1) * S.DIAL.span;
      const r0 = S.DIAL.r - (i % 5 === 0 ? 1.5 : 0.9);
      const y = fy + 1.2;
      dialTicks.push([i % 5 === 0 ? "mid" : "lo", k.pathOf([at([S.DIAL.x + Math.sin(a) * (S.DIAL.r - 0.25), y, S.DIAL.z + Math.cos(a) * (S.DIAL.r - 0.25)]), at([S.DIAL.x + Math.sin(a) * r0, y, S.DIAL.z + Math.cos(a) * r0])])]);
    }
    const floats = [0, 1, 2, 3].map((index) => `<g data-part="float-${index}"${STATIONS[pose.station].variants.includes(index) ? " data-on" : ""}>${S.liveSolidSvg(`float-${index}`, S.floatPaths(index, pose.floats[index]), { tone: "hi", crease: "lo" })}</g>`);
    const marks = [0, 1, 2, 3].map((index) => `<g data-part="mark-${index}"${STATIONS[pose.station].variants.includes(index) ? " data-on" : ""}>${D([onFace(g.x[index], g.z0 - 2.4)], { size: 0.7, tone: "lo" })}</g>`);
    const svg = [
      sol(k.slabOf(plan, 0, C.h, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 6, P, 3), { tone: "faint" }) }),
      sol(k.slabOf(strip, g.z0, g.h, P, 2), { tone: "lo", crease: "none" }),
      ...ticks.map(([tone, d]) => L(d, { tone })),
      ...g.x.map((x) => `<path class="cf-cavity" d="${slot(x)}"/>` + L(wall(x), { tone: "faint" }) + L(slot(x), { tone: "lo" })),
      ...floats,
      ...marks,
      sol(G.disc(0, 1.2, S.DIAL.r + 0.6, dialF, P, { steps: 28, bevel: 0.25 }), { tone: "mid" }),
      L(G.circleOf(dialF, 1.2, S.DIAL.r - 0.1, P, 28), { tone: "faint" }),
      ...dialTicks.map(([tone, d]) => L(d, { tone })),
      `<path class="iso-line" data-tone="hi" data-part="needle" d="${S.needlePath(pose.first)}" style="stroke-width:.9"/>`,
      D([at([S.DIAL.x, fy + 1.2, S.DIAL.z])], { size: 0.6, tone: "hi" }),
      D([at([C.x + 2.5, fy, C.h - 2.5]), at([C.x + C.w - 2.5, fy, C.h - 2.5]), at([C.x + 2.5, fy, 3.5]), at([C.x + C.w - 2.5, fy, 3.5])], { size: 0.45 }),
    ].join("");
    const shapes = rec((A) => [A.slab(plan, 0, C.h, { name: "console.body" }, 3), A.slab(strip, g.z0, g.h, { name: "console.strip" }, 2), A.disc(dialF, 0, 1.2, S.DIAL.r + 0.6, { name: "console.dial" }), ...[0, 1, 2, 3].map((index) => {
      const f = S.floatPlan(index, pose.floats[index]);
      return A.slab(f, f.z, 1.2, { name: "console.float" }, 2);
    })]);
    put(6, "console", [C.x + C.w / 2, C.y + C.d / 2, 25], svg, shapes, -60);
  }

  // Reader gate: back plate and a reading head with two sensing pins, one behind each
  // punch position. The pin behind the punched hole passes through the card.
  {
    const plate = { x: -23, y: 42.5, w: 46, d: 4, r: 1 };
    const head = { x: -13.2, y: 48, w: 26.4, d: 1.5, r: 0.3 };
    const pinZ = S.CARD_Z + S.LIFT + S.HOLE.z;
    const pins = [-1, 1].map((sign) => G.frameAlong([sign * S.HOLE.x, head.y + head.d, pinZ], [0, 1, 0]));
    const svg = [sol(k.slabOf(plate, 0, 54, P, 3, 0.5), { tone: "mid" }), D([at([-19.6, 46.5, 51]), at([19.6, 46.5, 51]), at([-19.6, 46.5, 40]), at([19.6, 46.5, 40])], { size: 0.45 })].join("");
    put(6, "gate.plate", [0, 44.5, 27], svg, rec((A) => [A.slab(plate, 0, 54, { name: "gate.plate" }, 3)]), -80);
    const headSvg = sol(k.slabOf(head, 34, 5.6, P, 2), { tone: "mid" }) + pins.map((F) => sol(G.disc(0, 0.8, S.PIN.r, F, P, { steps: 18 }), { tone: "mid" })).join("");
    put(7, "gate.head", [0, 48.75, 37], headSvg, rec((A) => [A.slab(head, 34, 5.6, { name: "gate.head" }, 2), ...pins.map((F) => A.disc(F, 0, 0.8, S.PIN.r, { name: "gate.pin" }))]), -150);
  }

  // Shuttle bed and its end stops.
  {
    const bed = { x: -110, y: 47, w: 220, d: 12, r: 1.5 };
    put(7, "gate.bed", [0, 53, 1], sol(k.slabOf(bed, 0, 3, P, 3, 0.4), { tone: "mid" }), rec((A) => [A.slab(bed, 0, 3, { name: "gate.bed" }, 3)]), -50);
    [-1, 1].forEach((sign, index) => {
      const plan = { x: sign < 0 ? -114 : 110, y: 46, w: 4, d: 14, r: 1 };
      const svg = sol(k.slabOf(plan, 0, 7, P, 3, 0.5), { tone: "mid" }) + D([at([plan.x + 2, plan.y + 3, 7]), at([plan.x + 2, plan.y + plan.d - 3, 7])], { size: 0.45 });
      put(7, `gate.stop${index ? "R" : "L"}`, [plan.x + 2, 53, 3], svg, rec((A) => [A.slab(plan, 0, 7, { name: "gate.stop" }, 3)]), index ? 200 : -45);
    });
  }

  // The shuttle tray with its three stations, index pointer and handle (moves along x).
  {
    const { TRAY, CARD, PAIR } = S;
    const tray = { x: -TRAY.w / 2, y: TRAY.y, w: TRAY.w, d: TRAY.d, r: 1.5 };
    const top = TRAY.z + TRAY.h;
    const slotAt = (x, y) => k.planOutline({ x: x - CARD.w / 2 - 0.5, y: y - 0.5, w: CARD.w + 1, d: CARD.t + 1, r: 0.3 }, top, P, 2);
    const slots = STATIONS.map((_, index) => slotAt(S.cardX(index), CARD.y) + (index === 1 ? slotAt(S.cardX(index) + PAIR.dx, CARD.y + PAIR.dy) : "")).join("");
    const index = { x: -1.2, y: TRAY.y + TRAY.d, w: 2.4, d: 5, r: 0.3 };
    const handle = [TRAY.w / 2 - 10, TRAY.y + TRAY.d + 3.2];
    const neck = { x: handle[0] - 1.4, y: TRAY.y + TRAY.d, w: 2.8, d: 1.2, r: 0.4 };
    const svg = [
      sol(k.slabOf(tray, TRAY.z, TRAY.h, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(tray, TRAY.z + 2.2, P, 4), { tone: "faint" }) }),
      L(slots, { tone: "faint" }),
      sol(k.slabOf(index, TRAY.z, 0.6, P, 2), { tone: "hi", crease: "lo" }),
      sol(k.slabOf(neck, TRAY.z + 1.2, 2.6, P, 2), { tone: "mid", crease: "none" }),
      sol(k.cylinder(handle[0], handle[1], 2.4, TRAY.z + 0.2, 5, P, 24), { tone: "mid", inner: L(k.knurl(handle[0], handle[1], 2.4, TRAY.z + 0.8, TRAY.z + 4.6, 18, P), { tone: "lo" }) }),
    ].join("");
    const shift = [pose.tray, 0, 0];
    const shapes = rec((A) => [A.slab(tray, TRAY.z, TRAY.h, { name: "tray.body" }, 4), A.slab(index, TRAY.z, 0.6, { name: "tray.index" }, 2), A.slab(neck, TRAY.z + 1.2, 2.6, { name: "tray.neck" }, 2), A.cylinder(handle[0], handle[1], 2.4, TRAY.z + 0.2, 5, { name: "tray.handle" })]);
    put(7, "tray", [0, 53, 5], `<g data-part="tray" transform="${k.translateAlong(P, shift)}">${svg}</g>`, move(shapes, shift), -40);
  }

  // Lifter blade in the gate.
  {
    const share = Math.max(...pose.lift);
    const lifted = share > 0.001;
    put(7, "gate.lifter", [0, 53, 12], `<g data-part="lifter"${lifted ? "" : ' style="display:none"'}>${S.liveSolidSvg("lifter", S.lifterPaths(share), { tone: "mid" })}</g>`, lifted ? rec((A) => [A.slab(S.LIFTER, S.CARD_Z, share * S.LIFT, { name: "gate.lifter" }, 2)]) : [], -30);
  }

  // The criterion cards. The punched hole is the meaning (which pan wins); the printed
  // lines are the wording. The paraphrase pair stands in one clip.
  STATIONS.forEach((station, index) => {
    const { CARD, HOLE, PAIR } = S;
    const cx = S.cardX(index);
    const holeU = station.side > 0 ? -HOLE.x : HOLE.x;
    const lit = pose.lift[index] > 0.5;
    const cardSvg = (words, dx, dy, dz) => {
      const plan = { x: cx + dx - CARD.w / 2, y: CARD.y + dy, w: CARD.w, d: CARD.t, r: 0.3 };
      const faceY = plan.y + CARD.t;
      const fp = (u, v) => [cx + dx + u, faceY, S.CARD_Z + dz + v];
      const hu = holeU - dx;
      const hv = HOLE.z - dz;
      const paths = k.slabOf(plan, S.CARD_Z + dz, CARD.h, P, 2);
      const cut = ellipse((u, v) => fp(hu + u, hv + v), HOLE.r);
      const wall = ellipse((u, v) => [cx + dx + hu + u, faceY - CARD.t, S.CARD_Z + dz + hv + v], HOLE.r);
      const border = k.pathOf([fp(-CARD.w / 2 + 1.3, 1.3), fp(CARD.w / 2 - 1.3, 1.3), fp(CARD.w / 2 - 1.3, CARD.h - 1.3), fp(-CARD.w / 2 + 1.3, CARD.h - 1.3)].map(at), true);
      return [
        sol(paths, { tone: "mid", crease: "faint", lit }),
        L(border, { tone: "faint" }),
        `<path class="cf-cavity" d="${cut}"/>`,
        L(wall, { tone: "lo" }),
        L(cut, { tone: "hi" }),
        L(ellipse((u, v) => fp(-hu + u, hv + v), HOLE.r - 0.4), { tone: "lo" }),
        D([at(fp(-hu, hv))], { size: 0.4, tone: "lo" }),
        L(wordsOn(words, (u, row) => fp(-CARD.w / 2 + 3 + u, 12.6 - row * 3), 1.1), { tone: "lo", free: true }),
      ].join("");
    };
    const shapes = [];
    const plans = [];
    let svg;
    if (station.id === "pair") {
      const clip = { x: cx - 2.4, y: CARD.y + PAIR.dy + CARD.t, w: 4.8, d: -PAIR.dy - CARD.t, r: 0 };
      svg = cardSvg(WORDS.struct, PAIR.dx, PAIR.dy, PAIR.dz) + sol(k.slabOf(clip, S.CARD_Z + CARD.h - 4, 4, P, 1), { tone: "mid" }) + cardSvg(WORDS.lex, 0, 0, 0);
      plans.push([{ x: cx + PAIR.dx - CARD.w / 2, y: CARD.y + PAIR.dy, w: CARD.w, d: CARD.t, r: 0.3 }, PAIR.dz], [{ x: cx - CARD.w / 2, y: CARD.y, w: CARD.w, d: CARD.t, r: 0.3 }, 0]);
      shapes.push(...rec((A) => [A.slab(clip, S.CARD_Z + CARD.h - 4, 4, { name: "card.clip" }, 1)]));
    } else {
      svg = cardSvg(WORDS[station.id], 0, 0, 0);
      plans.push([{ x: cx - CARD.w / 2, y: CARD.y, w: CARD.w, d: CARD.t, r: 0.3 }, 0]);
    }
    shapes.push(...rec((A) => plans.map(([plan, dz]) => A.slab(plan, S.CARD_Z + dz, CARD.h, { name: `card.${station.id}` }, 2))));
    svg = svg.replace(/<path class="iso-(fill|shade)"/g, '<path fill-rule="evenodd" class="iso-$1"');
    const shift = [pose.tray, 0, pose.lift[index] * S.LIFT];
    put(7, `card.${station.id}`, [cx, 53, 20], `<g data-part="card-${index}" transform="${k.translateAlong(P, shift)}">${svg}</g>`, move(shapes, shift), 0);
  });

  // Sensing pin tips: the pin behind the punched hole pokes through the loaded card.
  {
    const { CARD, HOLE, PIN } = S;
    const pinZ = S.CARD_Z + S.LIFT + HOLE.z;
    const tips = [-1, 1].map((sign) => {
      const F = G.frameAlong([sign * HOLE.x, CARD.y + CARD.t, pinZ], [0, 1, 0]);
      const on = pose.lift[pose.station] === 1 && (STATIONS[pose.station].side > 0 ? sign < 0 : sign > 0);
      return `<g data-part="pin-${sign < 0 ? "l" : "r"}"${on ? "" : ' style="display:none"'}>${sol(G.disc(0, 1, PIN.r, F, P, { steps: 18 }), { tone: "hi", crease: "lo" })}${D([at([sign * HOLE.x, CARD.y + CARD.t + 1, pinZ])], { size: 0.4, tone: "hi" })}</g>`;
    });
    put(7, "gate.pins", [0, 54, 38], tips.join(""), [], 5);
  }

  // Guides, bridge and the verdict lamps on top of the gate.
  {
    const guide = (sign) => ({ x: sign < 0 ? -16.2 : 13.2, y: 46.5, w: 3, d: 8.5, r: 0.6 });
    const bridge = { x: -16.2, y: 46.5, w: 32.4, d: 8.5, r: 0.8 };
    const lamps = [["green", -6.5], ["red", 6.5]];
    put(7, "gate.guideL", [-14.7, 50.75, 42], sol(k.slabOf(guide(-1), 34, 16, P, 3, 0.4), { tone: "mid" }), rec((A) => [A.slab(guide(-1), 34, 16, { name: "gate.guide" }, 3)]), -200);
    const svg = [
      sol(k.slabOf(guide(1), 34, 16, P, 3, 0.4), { tone: "mid" }),
      sol(k.slabOf(bridge, 50, 3, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(bridge, 51.5, P, 4), { tone: "faint" }) }),
      D([at([-14.7, 50.75, 53]), at([14.7, 50.75, 53])], { size: 0.45 }),
      ...lamps.map(([tone, x]) => sol(k.cylinder(x, 50.75, 2.3, 53, 1, P, 22), { tone: "mid" }) + `<g data-lamp="${tone}"${pose.lamp === tone ? " data-on" : ""}>${sol(k.cylinder(x, 50.75, 1.5, 54, 0.9, P, 18), { tone: "mid", crease: "none" })}</g>`),
    ].join("");
    put(7, "gate.bridge", [0, 51, 45], svg, rec((A) => [A.slab(guide(1), 34, 16, { name: "gate.guide" }, 3), A.slab(bridge, 50, 3, { name: "gate.bridge" }, 4), ...lamps.flatMap(([, x]) => [A.cylinder(x, 50.75, 2.3, 53, 1, { name: "gate.lamp.bezel" }), A.cylinder(x, 50.75, 1.5, 54, 0.9, { name: "gate.lamp" })])]), 60);
  }

  items.sort((a, b) => a.layer - b.layer || a.key - b.key);
  items.routes = routes;
  return items;
}
