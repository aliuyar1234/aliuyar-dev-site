// Fig 14 parts: every drawn item with its recorded shapes, in a pose. Build time only (art.mjs, build.mjs).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { PRODUCTIVE, CHIP_H, CUT_AT, RACK, PIN_TOP, pinX, EVENTS, cellOf } from "./model.mjs";
import {
  P, at, BENCH, BENCH_H, FOOT_H, PITCH, YF, Y0, Y1, ZF, GATE_X, CUT_X, ROLL, REWIND_X, SPINDLE_Z, REEL_R, HUB_R, REEL_Y, CRANK, HEAD, HEAD_Z, SCREEN, FLAG, HINGE,
  rulesAt, CELL, CELL_MARKS, cellShift, periodShift, periodic, windowsOf, packSolid, packOf, crankOf, spanOf, SCREEN_M, SCREEN_X, screenY, screenLine, screenFrame, flagOf, armOf, CHIP, chipPlan, PIN, stackOf, stemOf, chipSolid, chipMarks, chipShift,
} from "./scene.mjs";

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
// corner facets by radius: a 1-unit round is under 1.5 px, so it gets one chamfer
const slab = (plan, z, h, steps = 3, bevel = 0) => (plan.r < 0.45 ? k.slabOf({ ...plan, r: 0 }, z, h, P, 1, bevel) : k.slabOf(plan, z, h, P, plan.r <= 1.2 ? 1 : plan.r <= 3 ? Math.min(steps, 2) : steps, bevel));
const cyl = (x, y, r, z, h, steps = 16, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const alongY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (y, z) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const stepsOf = (r) => 2 * Math.max(5, Math.min(30, Math.ceil(r * 1.9)));
const discY = (x, z, y0, y1, r, opts) => G.disc(y0, y1, r, alongY(x, z), P, { steps: stepsOf(r), ...opts });
const discX = (y, z, x0, x1, r, opts) => G.disc(x0, x1, r, alongX(y, z), P, { steps: stepsOf(r), ...opts });
const alongZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
// one turned part from a stepped profile [[s, r], ...]: one outline, a crease at each step
const turned = (F, profile) => G.lathe(profile, F, P, { steps: stepsOf(Math.max(...profile.map(([, r]) => r))) });
const sTurned = (F, profile) => ["lathe", F, profile];
const stepped = (s0, pairs) => {
  const out = [[s0, 0]];
  let s = s0;
  for (const [r, s1] of pairs) out.push([s, r], [s1, r]), (s = s1);
  out.push([s, 0]);
  return out;
};
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const join = (list) => list.filter(Boolean).join("");
const poly = (pts, cls, extra = "") => `<path class="${cls}"${extra} d="${k.pathOf(pts.map(at), true)}"/>`;
const centre = (plan, z0, z1) => [plan.x + plan.w / 2, plan.y + plan.d / 2, (z0 + z1) / 2];

// shape descriptors, turned into audit shapes by build.mjs
const sSlab = (plan, z, h) => ["slab", plan, z, h];
const sCyl = (x, y, r, z, h) => ["cyl", x, y, r, z, h];
const sDiscY = (x, z, y0, y1, r) => ["disc", alongY(x, z), y0, y1, r];
const sDiscX = (y, z, x0, x1, r) => ["disc", alongX(y, z), x0, x1, r];
const sBall = (c, r) => ["ball", c, r];
const sPrism = (F, polygon, s0, s1) => ["prism", F, polygon, s0, s1];
const sBox = (min, max) => ["box", min, max];

// a solid whose paths live code rewrites: every child is always present and keyed
export function dyn(id, paths, { tone = "hi", crease = "faint", lit = false, inner = "", cls = "", seamless = false, extra = "" } = {}) {
  const p = paths || { fill: "", shades: ["", "", "", ""], top: "", crease: "", outline: "" };
  // empty shade and crease paths are left out of the static art; live adds them on mount
  const kids = [`<path class="iso-fill" data-p="fill" d="${p.fill}"/>`, ...p.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" data-p="s${i}" d="${d}"/>` : "")), `<path class="iso-top" data-p="top" d="${p.top}"/>`];
  if (crease !== "none" && p.crease) kids.push(`<path class="iso-line iso-crease" data-tone="${crease}" data-p="crease" d="${p.crease}"/>`);
  kids.push(inner, `<path class="iso-line iso-edge" data-tone="${tone}" data-p="outline" d="${p.outline}"/>`);
  return `<g class="iso-solid${cls ? ` ${cls}` : ""}" data-d="${id}"${lit ? ' data-lit=""' : ""}${seamless || p.seamless ? ' data-seamless=""' : ""}${extra}>${kids.join("")}</g>`;
}

export const LABEL =
  "A 16 mm film editing bench. Each agent run is a strip of film with one frame per executed step, wound from the left rewind through a lit viewer to the right rewind. A flag lever on the viewer rises when the frame in the gate is the run's first step whose action reaches severity 3 or more; a counter under the screen latches that step's number. A tape splicer further along cuts out only that frame and tapes in a minimal safe rewrite, and the cut frame rides to a trim rack in front, where 24 pins stand for the 24 train stems and each stack holds the preference pairs that stem produced: 72 pairs on 9 pins.";

// ---------------------------------------------------------------- items in a pose
export function build(pose) {
  const items = [];
  const put = (name, atPoint, svg, shapes, opts = {}) => items.push({ name, at: atPoint, svg, shapes, ...opts });

  // ============================ bench
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = byDepth(k.corners(BENCH, 11)).slice(1);
    put("stand.feet", [0, 0, -15], halo + feet.map(([x, y]) => S(cyl(x, y, 6.4, -BENCH_H - FOOT_H, FOOT_H, 10), { tone: "lo" })).join(""), feet.map(([x, y]) => sCyl(x, y, 6.4, -BENCH_H - FOOT_H, FOOT_H)), { bias: -400 });
    const screws = k.corners(BENCH, 10);
    const groove = L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" });
    const rings = L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" });
    put("stand.bench", [0, 0, -6], S(slab(BENCH, -BENCH_H, BENCH_H, 6, 1.6), { tone: "mid" }) + groove + rings + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }), [sSlab(BENCH, -BENCH_H, BENCH_H)], { bias: -300 });
  }
  // label plate on the bench's near face: the maker's mark and three rule lines
  {
    const y = BENCH.y + BENCH.d;
    const plate = { x: -110, y, w: 48, d: 0.8, r: 0.3 };
    const z0 = -9.6;
    const h = 7.6;
    const face = y + 0.8;
    const fp = (x, z) => at([x, face, z]);
    const rules = [26, 21, 14].map((w, i) => k.pathOf([fp(plate.x + 17, z0 + h - 2 - i * 1.8), fp(plate.x + 17 + w, z0 + h - 2 - i * 1.8)])).join("");
    const inset = k.pathOf([fp(plate.x + 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + h - 1.2), fp(plate.x + 1.2, z0 + h - 1.2)], true);
    const divider = k.pathOf([fp(plate.x + 14.6, z0 + 1.2), fp(plate.x + 14.6, z0 + h - 1.2)]);
    const mark = k.faceTextSvg(k.sideMatrix([plate.x + 7.8, face], z0 + h / 2 - 1.1, P, "left"), "AU-14", { size: 2.7, tone: "mid", anchor: "middle" });
    put("label", centre(plate, z0, z0 + h), S(slab(plate, z0, h, 2), { tone: "lo", crease: "none" }) + L(inset + divider, { tone: "faint" }) + mark + L(rules, { tone: "lo", free: true }) + Dots([fp(plate.x + plate.w - 3.2, z0 + h / 2)], { size: 0.45 }), [sSlab(plate, z0, h)]);
  }
  // frame ruler along the near edge: a tick per frame pitch, a long one every fifth
  {
    const strip = { x: -132, y: 33, w: 264, d: 6, r: 1 };
    const t = k.topTicks(-126, 126, PITCH, 5, strip.y, 0.6, [2.2, 3.8], P);
    put("ruler", centre(strip, 0, 0.6), S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + Dots([at([strip.x + 2.6, strip.y + 3, 0.6]), at([strip.x + strip.w - 2.6, strip.y + 3, 0.6])], { size: 0.45 }), [sSlab(strip, 0, 0.6)]);
  }

  // ============================ rewinds
  for (const side of [0, 1]) {
    const X = REWIND_X[side];
    const tag = side ? "take" : "feed";
    const plate = { x: X - 12, y: -47, w: 24, d: 30, r: 2 };
    put(`${tag}.plate`, centre(plate, 0, 3), S(slab(plate, 0, 3, 3, 0.5), { tone: "mid" }) + Dots(k.corners(plate, 3).map(([x, y]) => at([x, y, 3])), { size: 0.45 }), [sSlab(plate, 0, 3)]);
    const ped = { x: X - 5, y: -40, w: 10, d: 10, r: 1.5 };
    put(`${tag}.pedestal`, centre(ped, 3, 37), S(slab(ped, 3, 34, 3), { tone: "mid", inner: L(k.sideSeam(ped, 9, P, 3), { tone: "faint" }) }), [sSlab(ped, 3, 34)]);
    const box = { x: X - 9, y: -42, w: 18, d: 14, r: 3 };
    put(`${tag}.gearbox`, centre(box, 37, 55), S(slab(box, 37, 18, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 47.5, P, 4), { tone: "faint" }) }) + Dots([at([X - 6, -39, 55]), at([X - 6, -31, 55]), at([X + 6, -31, 55])], { size: 0.45 }), [sSlab(box, 37, 18)]);
    // friction brake: a knurled knob on its collar, the pointer on its cap
    const bx = X + (side ? -4 : 4);
    const brake = stepped(55, [[3.8, 56.2], [3, 59.8]]);
    put(`${tag}.brake`, [bx, -35, 57], S(turned(alongZ(bx, -35), brake), { tone: "mid", inner: L(k.knurl(bx, -35, 3, 56.2, 59.8, 22, P), { tone: "lo" }) }) + L(k.lineOnTop([bx - 1, -35], [bx + 2.2, -35], 59.8, P), { tone: "hi" }), [sTurned(alongZ(bx, -35), brake)]);
    put(`${tag}.flangeB`, [X, -55.9, SPINDLE_Z], S(discY(X, SPINDLE_Z, ...REEL_Y.back, REEL_R), { tone: "mid" }), [sDiscY(X, SPINDLE_Z, ...REEL_Y.back, REEL_R)]);
    put(`${tag}.pack`, [X, YF, SPINDLE_Z], dyn(`pack${side}`, packSolid(side, pose.s), { tone: "lo", crease: "none", cls: "fs-reelpack" }), [["pack", side]], { dynamic: true });
    // the free film between the pack and its guide roller
    const spans = spanOf(side, pose.s);
    for (const piece of ["far", "near"]) {
      const sp = spans[piece];
      const mid = sp.line.length ? sp.line[sp.line.length >> 1] : [ROLL.x[side], ROLL.z];
      put(`${tag}.${piece === "far" ? "spanFar" : "span"}`, [mid[0], YF, mid[1]], `<g data-span="${side}${piece[0]}"><path class="fs-film" data-p="fill" d="${sp.fill}"/><path class="iso-line" data-tone="hi" data-p="edges" d="${sp.edges}"/></g>`, sp.line.length ? [["film", sp.line, Y0, Y1, side]] : [], { dynamic: true });
    }
    // the near flange with its three windows onto the pack
    const w = windowsOf(side, pose.s);
    const face = REEL_Y.front[1];
    const F = alongY(X, SPINDLE_Z);
    const flange = discY(X, SPINDLE_Z, ...REEL_Y.front, REEL_R, { bevel: 0 });
    const hubRing = L(G.circleOf(F, face, 7.6, P) + G.circleOf(F, face, 29.4, P), { tone: "faint" });
    const windows = `<g data-win="${side}"><path class="iso-line fs-hole" data-tone="mid" data-p="holes" d="${w.holes}"/><path class="fs-pack" data-p="pack" d="${w.pack}"/><path class="iso-line" data-tone="lo" data-p="edge" d="${w.edge}"/></g>`;
    put(`${tag}.flangeF`, [X, -44.1, SPINDLE_Z], S(flange, { tone: "mid", inner: hubRing + windows }) + Dots(G.dotsOf(F, face, 4.2, 3, P, { all: true, phase: 0.4 }), { size: 0.45 }), [sDiscY(X, SPINDLE_Z, ...REEL_Y.front, REEL_R)]);
    // the spindle between the near flange and the gearbox it turns in
    put(`${tag}.spindle`, [X, -42.8, SPINDLE_Z], S(discY(X, SPINDLE_Z, REEL_Y.front[1], -42, 2.2), { tone: "mid" }), [sDiscY(X, SPINDLE_Z, REEL_Y.front[1], -42, 2.2)]);
    put(`${tag}.crankhub`, [X, -27, SPINDLE_Z], S(discY(X, SPINDLE_Z, -28, -26, 3.8), { tone: "mid" }), [sDiscY(X, SPINDLE_Z, -28, -26, 3.8)]);
    const crank = crankOf(side, pose.s);
    put(`${tag}.crank`, [X, -25.3, SPINDLE_Z], dyn(`crank${side}`, crank.arm, { tone: "mid" }) + S(discY(X, SPINDLE_Z, -24.6, -24, 1.7), { tone: "mid" }), [["crank", side], sDiscY(X, SPINDLE_Z, -24.6, -24, 1.7)], { dynamic: true });
    // the handle: a grip on a pin, carried round by the arm
    const hx = X + crank.at[0];
    const hz = SPINDLE_Z + crank.at[2];
    const gp = stepped(-24.6, [[1.1, -23.6], [1.7, -17.4], [2.2, -16.6]]);
    const grip = S(turned(alongY(X, SPINDLE_Z), gp), { tone: "mid", inner: L(G.arcOf(alongY(X, SPINDLE_Z), -20.5, 1.7, P), { tone: "faint" }) });
    put(`${tag}.grip`, [hx, -20.5, hz], `<g data-grip="${side}" transform="${k.translateAlong(P, crank.at)}">${grip}</g>`, [sTurned(alongY(hx, hz), gp)], { dynamic: true });
  }

  // ============================ guide rollers (split round the film: back half, film, near flange)
  for (const side of [0, 1]) {
    const X = ROLL.x[side];
    const tag = side ? "rollB" : "rollA";
    const foot = { x: X - 5, y: -65, w: 10, d: 9, r: 1 };
    const post = { x: X - 2.5, y: -62, w: 5, d: 5, r: 0.8 };
    put(`${tag}.foot`, centre(foot, 0, 1.6), S(slab(foot, 0, 1.6, 3, 0.4), { tone: "mid" }) + Dots([at([X - 3.4, -63.4, 1.6]), at([X + 3.4, -58, 1.6])], { size: 0.4 }), [sSlab(foot, 0, 1.6)]);
    put(`${tag}.post`, centre(post, 1.6, 16.5), S(slab(post, 1.6, 14.9, 3), { tone: "mid" }), [sSlab(post, 1.6, 14.9)]);
    const RF = alongY(X, ROLL.z);
    const back = stepped(-57, [[1, -56.4], [4.2, -55.8], [ROLL.r, Y1]]);
    const front = stepped(Y1, [[ROLL.r, -44.2], [4.2, -43.6], [1.5, -42.8]]);
    put(`${tag}.body`, [X, -50, ROLL.z], S(turned(RF, back), { tone: "mid" }), [sTurned(RF, back)], { owner: tag });
    put(`${tag}.near`, [X, -43.6, ROLL.z], S(turned(RF, front), { tone: "mid" }) + Dots([at([X, -42.8, ROLL.z])], { size: 0.4 }), [sTurned(RF, front)], { owner: tag });
  }

  // ============================ viewer
  {
    const VB = { x: -76, y: -74, w: 56, d: 46, r: 3 };
    const feet = byDepth(k.corners(VB, 5)).slice(1);
    put("viewer.feet", [-48, -51, 1], feet.map(([x, y]) => S(cyl(x, y, 2.4, 0, 2, 8), { tone: "lo" })).join(""), feet.map(([x, y]) => sCyl(x, y, 2.4, 0, 2)));
    // vents on the near end face: closed slots
    const vents = [0, 1, 2, 3].map((i) => k.pathOf([[-20, -70 + i * 3.4, 4.5], [-20, -70 + i * 3.4 + 1.4, 4.5], [-20, -70 + i * 3.4 + 1.4, 10], [-20, -70 + i * 3.4, 10]].map(at), true)).join("");
    put("viewer.base", centre(VB, 2, 13), S(slab(VB, 2, 11, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(VB, 4.2, P, 4), { tone: "faint" }) }) + L(vents, { tone: "lo" }) + Dots([at([-73, -71, 13]), at([-23, -71, 13]), at([-73, -31, 13]), at([-23, -31, 13])], { size: 0.45 }), [sSlab(VB, 2, 11)]);
    const track = { x: -76, y: -58, w: 56, d: 16, r: 1 };
    put("viewer.track", centre(track, 13, 15.6), S(slab(track, 13, 2.6, 3), { tone: "mid" }), [sSlab(track, 13, 2.6)]);
    const lipB = { x: -76, y: -57, w: 56, d: 1.8, r: 0 };
    put("viewer.lipB", centre(lipB, 15.6, 17.4), S(slab(lipB, 15.6, 1.8), { tone: "mid" }), [sSlab(lipB, 15.6, 1.8)]);
    const lipF = { x: -76, y: -44.8, w: 56, d: 1.8, r: 0 };
    put("viewer.lipF", centre(lipF, 15.6, 17.4), S(slab(lipF, 15.6, 1.8), { tone: "mid" }), [sSlab(lipF, 15.6, 1.8)]);
    for (const [i, x0] of [GATE_X - 8.5, GATE_X + 4.5].entries()) {
      const shoe = { x: x0, y: -57, w: 4, d: 14, r: 0.5 };
      put(`viewer.shoe${i}`, centre(shoe, 17.4, 20.2), S(slab(shoe, 17.4, 2.8, 2, 0.3), { tone: "mid" }) + Dots([at([x0 + 2, -54.5, 20.2]), at([x0 + 2, -45.5, 20.2])], { size: 0.4 }), [sSlab(shoe, 17.4, 2.8)]);
    }
    const column = { x: -56, y: -74, w: 14, d: 10, r: 2 };
    put("viewer.column", centre(column, 13, 30), S(slab(column, 13, 17, 3), { tone: "mid" }), [sSlab(column, 13, 17)]);
    // lamp housing on the near face: a finned can with a vented cap
    const LF = alongY(-31, 7.5);
    const fins = [-26.8, -25.2, -23.6, -22].map((s) => G.arcOf(LF, s, 5, P)).join("");
    const can = stepped(-28, [[5, -21], [5.6, -19.8]]);
    put("viewer.lamp", [-31, -24, 7.5], S(turned(LF, can), { tone: "mid", inner: L(fins, { tone: "lo" }) }) + L(G.circleOf(LF, -19.8, 3.6, P), { tone: "faint" }) + Dots(G.dotsOf(LF, -19.8, 2.2, 6, P, { all: true }).concat([at([-31, -19.8, 7.5])]), { size: 0.45, tone: "lo" }), [sTurned(LF, can)]);
    // step counter: a bezel with a two-digit window, latched by the flag lever
    const bez = { x: -72, y: -28, w: 14, d: 0.8, r: 0.4 };
    const fy = -27.2;
    const win = k.pathOf([[-70, fy, 5.2], [-60, fy, 5.2], [-60, fy, 10.2], [-70, fy, 10.2]].map(at), true);
    const digits = `<text class="iso-face-text fs-digits" data-tone="hi" data-counter="" transform="${k.sideMatrix([-65, fy], 6.3, P, "left")}" font-size="3.9" text-anchor="middle">${pose.counter}</text>`;
    put("viewer.counter", centre(bez, 4.2, 11.2), S(slab(bez, 4.2, 7, 2), { tone: "mid" }) + `<path class="fs-window" d="${win}"/>` + digits + L(win, { tone: "lo" }), [sSlab(bez, 4.2, 7)]);
    const sw = { x: -47, y: -28, w: 6, d: 0.8, r: 0.3 };
    put("viewer.switch", centre(sw, 5, 10), S(slab(sw, 5, 5, 2), { tone: "mid" }) + S(discY(-44, 7.5, -27.2, -25.4, 0.8), { tone: "hi" }), [sSlab(sw, 5, 5), sDiscY(-44, 7.5, -27.2, -25.4, 0.8)]);
    // the judge's KPI lamp: green while the run in the gate met its KPI with no step at severity 3 or more
    const kpiF = alongY(-53, 7.7);
    put("viewer.kpi", [-53, -27.4, 7.7], S(discY(-53, 7.7, -28, -27.2, 2.4), { tone: "mid" }) + `<g data-lamp="kpi"${pose.kpi ? ' data-on="green"' : ""}>${S(discY(-53, 7.7, -27.2, -26.6, 1.5), { tone: "mid" })}</g>` + L(G.circleOf(kpiF, -26.6, 0.8, P), { tone: "faint" }), [sDiscY(-53, 7.7, -28, -27.2, 2.4), sDiscY(-53, 7.7, -27.2, -26.6, 1.5)]);
    // head: lens over the gate, lit screen in its hood, focus knob, flag bracket
    const lens = stepped(22.2, [[4.2, 23.8], [3.4, 30]]);
    put("viewer.lens", [GATE_X, YF, 26], S(turned(alongZ(GATE_X, YF), lens), { tone: "mid", inner: L(k.sideArc(GATE_X, YF, 3.4, 27, P, 16), { tone: "faint" }) }), [sTurned(alongZ(GATE_X, YF), lens)]);
    // lamp-house vents on the head's end face, between the focus knob and the hood
    const hv = [0, 1, 2, 3, 4].map((i) => k.pathOf([[-30, -55 + i * 1.7, 37.5], [-30, -54.2 + i * 1.7, 37.5], [-30, -54.2 + i * 1.7, 51], [-30, -55 + i * 1.7, 51]].map(at), true)).join("");
    put("viewer.head", centre(HEAD, ...HEAD_Z), S(slab(HEAD, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], 4, 1), { tone: "mid", inner: L(k.sideSeam(HEAD, 33.5, P, 4), { tone: "faint" }) + L(hv, { tone: "lo" }) }) + Dots([at([-65, -71, 56]), at([-33, -71, 56]), at([-65, -45, 56])], { size: 0.45 }), [sSlab(HEAD, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0])]);
    const KF = alongX(-62, 46);
    const knob = stepped(-30, [[4.6, -29], [3.8, -25.6]]);
    put("viewer.focus", [-28, -62, 46], S(turned(KF, knob), { tone: "mid", inner: k.fadedSvg(G.ribsOf(KF, -29, -25.6, 3.8, 24, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }) + L(G.circleOf(KF, -25.6, 2.2, P), { tone: "faint" }), [sTurned(KF, knob)]);
    // screen glass with the gate's frame projected on it, in its own plane
    const glass = { x: -64, y: -42, w: 28, d: 0.8, r: 0 };
    const clip = `<clipPath id="fs-screen"><path d="M${SCREEN.x0} ${-SCREEN.z1}H${SCREEN.x1}V${-SCREEN.z0}H${SCREEN.x0}Z"/></clipPath>`;
    const xs = (n) => {
      const v = cellOf(n, pose).x;
      return `<path class="iso-line" data-tone="red" data-p="x" d="${v > 0.005 ? SCREEN_X : ""}"${v > 0.005 && v < 0.995 ? ` opacity="${v.toFixed(2)}"` : ""}/>`;
    };
    const slots = [-1, 0, 1].map((j) => {
      const n = Math.round(pose.s) + j;
      const f = screenFrame(n);
      return `<g data-scr="${((n % 3) + 3) % 3}" data-n="${n}" transform="translate(0 ${screenY(pose.s, n).toFixed(2)})"><path class="iso-line" data-tone="hi" data-p="line" d="${screenLine(pose.s, n)}"/><path class="iso-line" data-tone="hi" data-p="perf" d="${f.perf}"/><path class="iso-line" data-tone="hi" data-free="" data-p="text" d="${f.text}"/>${xs(n)}</g>`;
    });
    const edgeLine = `<path class="iso-line" data-tone="hi" d="M-40.6 ${-SCREEN.z1}V${-SCREEN.z0}"/>`;
    const frameOut = `<path class="iso-line" data-tone="hi" d="M${SCREEN.x0} ${-SCREEN.z1}H${SCREEN.x1}V${-SCREEN.z0}H${SCREEN.x0}Z"/>`;
    const content = `<g class="fs-screen" transform="${SCREEN_M}">${clip}<g clip-path="url(#fs-screen)">${slots.join("")}${edgeLine}</g>${frameOut}</g>`;
    put("viewer.screen", centre(glass, 34, 53), `<g class="fs-glass">${S(slab(glass, 34, 19, 1), { tone: "hi", lit: true, inner: content })}</g>`, [sSlab(glass, 34, 19)]);
    const hoodT = { x: -66, y: -42, w: 32, d: 5, r: 0.5 };
    const hoodL = { x: -66, y: -42, w: 1.4, d: 5, r: 0 };
    const hoodR = { x: -35.4, y: -42, w: 1.4, d: 5, r: 0 };
    put("viewer.hoodL", centre(hoodL, 33, 53.2), `<g class="fs-hood">${S(slab(hoodL, 33, 20.2), { tone: "mid" })}</g>`, [sSlab(hoodL, 33, 20.2)]);
    put("viewer.hoodR", centre(hoodR, 33, 53.2), `<g class="fs-hood">${S(slab(hoodR, 33, 20.2), { tone: "mid" })}</g>`, [sSlab(hoodR, 33, 20.2)]);
    put("viewer.hoodT", centre(hoodT, 53.2, 54.6), `<g class="fs-hood">${S(slab(hoodT, 53.2, 1.4, 2), { tone: "mid" })}</g>`, [sSlab(hoodT, 53.2, 1.4)]);
    const bracket = { x: FLAG.x - 4.5, y: -48.2, w: 7, d: 4.6, r: 0.6 };
    put("viewer.bracket", centre(bracket, 56, 61.6), S(slab(bracket, 56, 5.6, 2, 0.3), { tone: "mid" }), [sSlab(bracket, 56, 5.6)]);
    put("viewer.rest", [FLAG.x - 10.5, FLAG.y + 0.5, 57.5], S(cyl(FLAG.x - 10.5, FLAG.y + 0.5, 0.8, 56, 3.1, 12), { tone: "mid" }), [sCyl(FLAG.x - 10.5, FLAG.y + 0.5, 0.8, 56, 3.1)]);
    const flag = flagOf(pose.flag);
    put("viewer.flag", [FLAG.x - 4, FLAG.y + 0.5, FLAG.z + 4], dyn("flagArm", flag.arm, { tone: "mid" }) + dyn("flagPlate", flag.plate, { tone: "mid", cls: "fs-flag", extra: pose.flag > 0.5 ? ' data-on="red"' : "" }) + S(discY(FLAG.x, FLAG.z, FLAG.y - 0.4, FLAG.y + 1.6, 1), { tone: "mid" }) + Dots([at([FLAG.x, FLAG.y + 1.6, FLAG.z])], { size: 0.4 }), [["flag"], sDiscY(FLAG.x, FLAG.z, FLAG.y - 0.4, FLAG.y + 1.6, 1)], { dynamic: true, owner: "flag" });
  }

  // ============================ splicer
  {
    const SB = { x: 10, y: -68, w: 52, d: 36, r: 2.5 };
    put("splicer.base", centre(SB, 0, 10), S(slab(SB, 0, 10, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(SB, 3, P, 4), { tone: "faint" }) }) + Dots([at([11.2, -33.2, 10]), at([60.8, -33.2, 10]), at([60.8, -66.8, 10])], { size: 0.4 }), [sSlab(SB, 0, 10)]);
    const lampF = alongY(20, 5);
    put("splicer.lamp", [20, -31, 5], S(discY(20, 5, -32, -31.2, 2.4), { tone: "mid" }) + `<g data-lamp="green"${pose.lamp ? ' data-on="green"' : ""}>${S(discY(20, 5, -31.2, -30.6, 1.5), { tone: "mid" })}</g>` + L(G.circleOf(lampF, -30.6, 0.8, P), { tone: "faint" }), [sDiscY(20, 5, -32, -31.2, 2.4), sDiscY(20, 5, -31.2, -30.6, 1.5)]);
    const bed = { x: 12, y: -66, w: 48, d: 32, r: 1.6 };
    put("splicer.bed", centre(bed, 10, 15.6), S(slab(bed, 10, 5.6, 3, 0.5), { tone: "mid" }), [sSlab(bed, 10, 5.6)]);
    const lipB = { x: 12, y: -57, w: 48, d: 1.8, r: 0 };
    put("splicer.lipB", centre(lipB, 15.6, 17.4), S(slab(lipB, 15.6, 1.8), { tone: "mid" }), [sSlab(lipB, 15.6, 1.8)]);
    const lipF = { x: 12, y: -44.8, w: 48, d: 1.8, r: 0 };
    put("splicer.lipF", centre(lipF, 15.6, 17.4), S(slab(lipF, 15.6, 1.8), { tone: "mid" }), [sSlab(lipF, 15.6, 1.8)]);
    for (const [i, dx] of [-17.5, -10.5, 10.5, 17.5].entries()) {
      const x = CUT_X + dx;
      put(`splicer.pin${i}`, [x, Y1 - 1.25, 16.6], S(cyl(x, Y1 - 1.25, 0.5, 15.6, 1.6, 10), { tone: "hi" }), [sCyl(x, Y1 - 1.25, 0.5, 15.6, 1.6)]);
    }
    // hinge: a low block level with the lips, two ears carrying the pin, the arm between them
    const hinge = { x: 23, y: -66, w: 26, d: 5, r: 0.8 };
    put("splicer.hinge", centre(hinge, 15.6, 17.4), S(slab(hinge, 15.6, 1.8, 2), { tone: "mid" }), [sSlab(hinge, 15.6, 1.8)]);
    const earL = { x: 23, y: -64.5, w: 1, d: 4, r: 0.3 };
    put("splicer.earL", centre(earL, 17.4, 21.8), S(slab(earL, 17.4, 4.4, 2), { tone: "mid" }), [sSlab(earL, 17.4, 4.4)]);
    const arm = armOf(pose.arm);
    put("splicer.arm", [36, HINGE.y + 8, HINGE.z + 6], dyn("arm", arm.solid, { tone: "mid", inner: L(arm.blades, { tone: "lo" }).replace("<path", '<path data-p="blades"') }) + dyn("knob", arm.ball, { tone: "mid", crease: "none", seamless: true }), [["arm"]], { dynamic: true });
    const earR = { x: 48, y: -64.5, w: 1, d: 4, r: 0.3 };
    put("splicer.earR", centre(earR, 17.4, 21.8), S(slab(earR, 17.4, 4.4, 2), { tone: "mid" }) + S(discX(HINGE.y, HINGE.z, 49, 49.6, 1.1), { tone: "mid" }) + Dots([at([49.6, HINGE.y, HINGE.z])], { size: 0.4 }), [sSlab(earR, 17.4, 4.4), sDiscX(HINGE.y, HINGE.z, 49, 49.6, 1.1)]);
    // tape: a roll on its spindle and the cutter bar it tears against
    const RX = 54;
    const RY = -37.6;
    const core = L(k.ring(RX, RY, 2.4, 19, P, 28), { tone: "lo" });
    put("splicer.roll", [RX, RY, 17.5], S(cyl(RX, RY, 5, 16, 3, 24), { tone: "hi", inner: L(k.sideArc(RX, RY, 5, 17.5, P, 24), { tone: "faint" }) }) + core + S(cyl(RX, RY, 1.2, 15.6, 4.4, 12), { tone: "mid" }), [sCyl(RX, RY, 5, 16, 3), sCyl(RX, RY, 1.2, 15.6, 4.4)], { owner: "roll" });
    const cutter = { x: 42, y: -39, w: 4.6, d: 3, r: 0.4 };
    put("splicer.cutter", centre(cutter, 15.6, 17.6), S(slab(cutter, 15.6, 2, 2, 0.3), { tone: "mid" }), [sSlab(cutter, 15.6, 2)]);
  }

  // ============================ film on the bench line: ribbon, frame lines and perforations, one frame per step
  {
    const x0 = ROLL.x[0];
    const x1 = ROLL.x[1];
    const rib = [[x0, Y0, ZF], [x1, Y0, ZF], [x1, Y1, ZF], [x0, Y1, ZF]];
    const ribD = k.pathOf(rib.map(at), true);
    const per = periodic();
    const lo = Math.floor(pose.s) - 19;
    const cells = [];
    for (let j = 0; j < 26; j++) cells.push(cellSvg(lo + j, pose));
    const clip = `<clipPath id="fs-film"><path d="${ribD}"/></clipPath>`;
    const moving = `<g clip-path="url(#fs-film)"><g data-period="" transform="${periodShift(pose.s)}">${L(per.lines, { tone: "lo" })}${L(per.perfs, { tone: "lo" })}</g>${cells.join("")}</g>`;
    const edges = L(k.pathOf([at(rib[0]), at(rib[1])]) + k.pathOf([at(rib[3]), at(rib[2])]), { tone: "hi" });
    put("film", [0, YF, ZF], `${clip}<path class="fs-film" d="${ribD}"/>${moving}${edges}`, [["filmbox"]], { dynamic: true });
  }

  // ============================ trim rack: 24 pins for the 24 train stems, a stack of pair cards on each productive one
  {
    const tray = { x: -134, y: -2, w: 268, d: 26, r: 3 };
    put("rack.tray", centre(tray, 0, 2.4), S(slab(tray, 0, 2.4, 4, 0.5), { tone: "mid" }), [sSlab(tray, 0, 2.4)]);
    const walls = [
      ["rack.wallB", { x: -134, y: -2, w: 268, d: 2.2, r: 0 }],
      ["rack.wallL", { x: -134, y: 0.2, w: 2.2, d: 20.8, r: 0 }],
      ["rack.wallR", { x: 131.8, y: 0.2, w: 2.2, d: 20.8, r: 0 }],
      ["rack.wallF", { x: -134, y: 21, w: 268, d: 3, r: 0 }],
    ];
    for (const [name, plan] of walls) put(name, centre(plan, 2.4, 6), S(slab(plan, 2.4, 3.6), { tone: "mid" }) + (name === "rack.wallF" ? Dots([at([-130, 22.5, 6]), at([130, 22.5, 6])], { size: 0.45 }) : ""), [sSlab(plan, 2.4, 3.6)]);
    const bar = { x: -127, y: 6, w: 254, d: 8, r: 1.2 };
    const ticks = k.sideTicks(pinX(0), pinX(23) + 0.01, 10.4, 4, bar.y + bar.d, RACK.top, [1.3, 2.6], P);
    put("rack.bar", centre(bar, 2.4, RACK.top), S(slab(bar, 2.4, RACK.top - 2.4, 3, 0.5), { tone: "mid" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }), [sSlab(bar, 2.4, RACK.top - 2.4)]);
    // the pair gauge at the end: a tick per event (two pairs), a long one every ten pairs
    const gauge = { x: 127.4, y: 7, w: 3, d: 6, r: 0 };
    const GZ = PIN_TOP + 0.6;
    let gt = "";
    let gT = "";
    for (let i = 0, z = RACK.top; z <= PIN_TOP + 1e-6; i++, z += CHIP_H) (i % 5 === 0 ? (gT += k.segment([127.4, 13, z], [127.4 + 2.2, 13, z], P)) : (gt += k.segment([127.4, 13, z], [127.4 + 1.2, 13, z], P)));
    put("rack.gauge", centre(gauge, 2.4, GZ), S(slab(gauge, 2.4, GZ - 2.4), { tone: "mid" }) + L(gt, { tone: "lo" }) + L(gT, { tone: "mid" }), [sSlab(gauge, 2.4, GZ - 2.4)]);
    for (let i = 0; i < 24; i++) {
      const x = pinX(i);
      if (!PRODUCTIVE.includes(i)) {
        put(`rack.pin${i}`, [x, RACK.y, (RACK.top + PIN.top) / 2], S(cyl(x, RACK.y, PIN.r, RACK.top, PIN.top - RACK.top, 4), { tone: "mid" }), [sCyl(x, RACK.y, PIN.r, RACK.top, PIN.top - RACK.top)]);
        continue;
      }
      const st = stackOf(i, pose.pairs[i]);
      const plan = chipPlan(x, RACK.y);
      const stack = dyn(`stack${i}`, st.solid, { tone: "hi", inner: L(st.seams, { tone: "lo" }).replace("<path", '<path data-p="seams"') });
      put(`rack.stack${i}`, [x, RACK.y, RACK.top + 1], stack, [["stack", i]], { dynamic: true });
      const rod = stemOf(i, pose.pairs[i], pose.chip).below;
      put(`rack.stem${i}`, [x, RACK.y, 25], dyn(`stem${i}`, rod && rod.paths, { tone: "mid" }), [["stem", i]], { dynamic: true });
    }
    // the pair card in flight: the cut frame with its cross, two pairs thick; on its pin the pin shows above it
    const c = pose.chip;
    const m = chipMarks(c ? c.n : EVENTS.at(-1).F);
    const body = S(chipSolid(), { tone: "hi", inner: `<g data-marks=""${c ? ` opacity="${c.marks.toFixed(2)}"` : ""}>${L(m.rules, { tone: "lo", free: true })}${L(m.x, { tone: "red" })}</g>` });
    const above = c && stemOf(c.pin, pose.pairs[c.pin], c).above;
    const chip = `<g data-chip="" opacity="${c ? c.a.toFixed(2) : 0}"><g data-chipbody=""${c ? ` transform="${chipShift(c.at)}"` : ""}>${body}</g>${dyn("chipPin", above && above.paths, { tone: "mid" })}</g>`;
    put("chip", [CUT_AT[0], CUT_AT[1], CUT_AT[2]], chip, [["chip"]], { dynamic: true, chip: true });
  }
  return items;
}

// one frame of film at the gate position; live code moves it and swaps its marks
export function cellSvg(n, pose) {
  const c = cellOf(n, pose);
  const d = { r: c.rules > 0.005 && rulesAt(n), s: c.safe > 0.005 && rulesAt(n + 7919), t: c.tape > 0.005 && CELL.tape, x: c.x > 0.005 && CELL.x };
  const v = { r: c.rules, s: c.safe, t: c.tape, x: c.x };
  // only the marks a frame shows are in the static markup; live adds the rest once, on mount
  const marks = CELL_MARKS.filter(([key]) => d[key]).map(([key, cls, tone, free]) => `<path class="${cls}" data-tone="${tone}"${free ? ' data-free=""' : ""} data-p="${key}" d="${d[key]}"${v[key] < 0.995 ? ` opacity="${v[key].toFixed(2)}"` : ""}/>`);
  return `<g data-cell="${((n % 26) + 26) % 26}" transform="${cellShift(pose.s, n)}">${marks.join("")}</g>`;
}
