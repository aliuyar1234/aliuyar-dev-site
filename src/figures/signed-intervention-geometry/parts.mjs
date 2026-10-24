// The drawing as a list of items in painter's order. Static parts are built here (build
// time only); the parts that move come from scene.mjs, which the page shares.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as S from "./scene.mjs";

const { P, at, depth, BENCH, BENCH_H, FOOT_H, R, TOP, TH, DEG, RELEASE, CARDS } = S;
const sol = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

export const ARMS = [225, 345, 105]; // tripod arms, floor angles: back, front-right, front-left
export const ARM_L = 46;
export const COUNTER = { x: 36, y: -72, w: 32, d: 16, r: 1.6, h: 13 };
export const DIGITS = { x: COUNTER.x + 7, z: 9.6, w: 15, h: 6.4 };
export const LAMP = [COUNTER.x + 25.5, COUNTER.y + 6];

// ——— static parts, each `{ name, svg, shapes }`
function bench(A) {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
  const shapes = [];
  for (const [x, y] of byDepth(k.corners(BENCH, 22)).slice(1)) {
    out.push(sol(S.drum(x, y, 7, -BENCH_H - FOOT_H, 1.6, 16), { tone: "lo" }), sol(S.drum(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, 16), { tone: "mid" }));
    if (A) shapes.push(A.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, { name: "stand.foot.flange" }), A.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: "stand.foot" }));
  }
  out.push(sol(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 6, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -4, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (A) shapes.push(A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench" }, 6));
  return { name: "stand.bench", svg: out.join(""), shapes };
}

function label(A) {
  const plan = { x: -52, y: 60, w: 46, d: 12.5, r: 1.4 };
  const z = 0.8;
  const x0 = plan.x + 10.5;
  const svg = [
    sol(k.slabOf(plan, 0, z, P, 4), { tone: "mid" }),
    L(k.planOutline(k.insetPlan(plan, 1.4), z, P, 4), { tone: "faint" }),
    k.faceTextSvg(k.topMatrix([x0, plan.y + 4.7], z, P, "x"), "AU-12", { size: 3.4, tone: "mid" }),
    ...[[6.9, 30], [8.9, 24], [10.7, 16]].map(([dy, w]) => L(k.lineOnTop([x0, plan.y + dy], [x0 + w, plan.y + dy], z, P), { tone: "lo", free: true })),
    D([at([plan.x + 3.2, plan.y + 3.2, z]), at([plan.x + 3.2, plan.y + plan.d - 3.2, z])], { size: 0.45 }),
  ].join("");
  return { name: "base.label", svg, shapes: A ? [A.slab(plan, 0, z, { name: "base.label" }, 4)] : [] };
}

// Case of spare slotted masses: six recesses, each with a mass sitting in it.
export const CASE = { x: -4, y: 49, w: 26.5, d: 22, r: 1.6, h: 4 };
function massCase(A) {
  const C = CASE;
  const out = [sol(k.slabOf(C, 0, C.h, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(C, 1.4, P, 4), { tone: "faint" }) }), L(k.planOutline(k.insetPlan(C, 1.2), C.h, P, 3), { tone: "faint" })];
  const shapes = A ? [A.slab(C, 0, C.h, { name: "base.case" }, 4)] : [];
  const spots = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) spots.push([C.x + 5.4 + 7.75 * i, C.y + 6.9 + 8.2 * j]);
  const open = [S.slideDir(0, 70)[0] * -1, S.slideDir(0, 70)[1] * -1];
  for (const [x, y] of byDepth(spots)) {
    out.push(L(k.ring(x, y, S.MASS.r + 0.3, C.h, P, 14), { tone: "lo" }), sol(S.drum(x, y, S.MASS.r, C.h, 0.4, 16), { tone: "mid", flat: true }), L(k.onTop(S.slotRing(x, y, open), C.h + 0.4, P, true), { tone: "lo" }));
    if (A) shapes.push(A.cylinder(x, y, S.MASS.r, C.h, 0.4, { name: "base.case.mass" }));
  }
  return { name: "base.case", svg: out.join(""), shapes };
}

// Spirit level lying on the bench, for the table top: a vial between two ferrules on a bar
// with rubber end caps.
function level(A) {
  const bar = { x: -75, y: 24, w: 8, d: 40, r: 1.4 };
  const cap = (y) => ({ x: -75.4, y, w: 8.8, d: 4, r: 1.6 });
  const H = 4.5;
  const [cx, cy] = [-71, 44];
  const VF = G.frameAlong([cx, cy - 6, H + 1.5], [0, 1, 0]);
  const grads = [4.6, 7.4].map((s) => G.arcOf(VF, s, 1.1, P)).join("");
  const bubble = k.onTop(Array.from({ length: 12 }, (_, i) => [cx + 0.5 * Math.cos((i / 12) * 2 * Math.PI), cy + 1.2 * Math.sin((i / 12) * 2 * Math.PI)]), H + 2.6, P, true);
  const svg = [
    sol(k.slabOf(bar, 0, H, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(bar, 1.6, P, 4), { tone: "faint" }) }),
    sol(k.slabOf(cap(bar.y - 0.4), 0, H + 0.4, P, 4, 0.5), { tone: "lo" }),
    sol(k.slabOf(cap(bar.y + bar.d - 3.6), 0, H + 0.4, P, 4, 0.5), { tone: "lo" }),
    sol(G.disc(0, 1, 1.5, VF, P, { steps: 12 }), { tone: "mid" }),
    sol(G.disc(1, 11, 1.1, VF, P, { steps: 12 }), { tone: "mid", inner: L(grads, { tone: "lo" }) }),
    L(bubble, { tone: "hi" }),
    sol(G.disc(11, 12, 1.5, VF, P, { steps: 12 }), { tone: "mid" }),
    D([at([cx, cy - 13, H]), at([cx, cy + 13, H])], { size: 0.42 }),
  ].join("");
  const shapes = A
    ? [
        A.slab(bar, 0, H, { name: "base.level" }, 4),
        A.slab(cap(bar.y - 0.4), 0, H + 0.4, { name: "base.level.cap", owner: "base.level" }, 4),
        A.slab(cap(bar.y + bar.d - 3.6), 0, H + 0.4, { name: "base.level.cap", owner: "base.level" }, 4),
        A.disc(VF, 0, 1, 1.5, { name: "base.level.ferrule" }),
        A.disc(VF, 1, 11, 1.1, { name: "base.level.vial" }),
        A.disc(VF, 11, 12, 1.5, { name: "base.level.ferrule" }),
      ]
    : [];
  return { name: "base.level", svg, shapes };
}

// Steel rule along the front-right edge: 2-unit ticks, every fifth long, hanging from its outer edge.
function ruler(A) {
  const plan = { x: 66, y: -46, w: 7, d: 92, r: 0.8 };
  const z = 0.7;
  const t = k.topTicks(-42, 42, 2, 5, plan.x + plan.w, z, [-1.5, -3], P, "y");
  const svg = [sol(k.slabOf(plan, 0, z, P, 3), { tone: "mid" }), L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }), L(k.ring(69.5, -44, 0.9, z, P, 10) + k.ring(69.5, 44, 0.9, z, P, 10), { tone: "lo" }), D([at([69.5, -44, z]), at([69.5, 44, z])], { size: 0.4 })].join("");
  return { name: "base.ruler", svg, shapes: A ? [A.slab(plan, 0, z, { name: "base.ruler" }, 3)] : [] };
}

// Resample counter: three digit wheels behind a window, a consensus lamp, a reset knob.
function counter(A) {
  const C = COUNTER;
  const face = C.y + C.d;
  const m = k.sideMatrix([C.x, face], C.h, P, "left");
  const win = { x: DIGITS.x - C.x, y: C.h - DIGITS.z - DIGITS.h / 2, w: DIGITS.w, h: DIGITS.h };
  const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const bezel = rr(win.x - 1.2, win.y - 1.2, win.w + 2.4, win.h + 2.4, 1.2);
  const glass = rr(win.x, win.y, win.w, win.h, 0.6);
  const ribs = [1, 2].map((i) => `M${win.x + (win.w * i) / 3} ${win.y}V${win.y + win.h}`).join("");
  const faceSvg = `<g transform="${m}"><path class="iso-line" data-tone="lo" d="${bezel}"/><path class="sig-window" d="${glass}"/><text class="iso-face-text sig-digits" x="${win.x + win.w / 2}" y="${win.y + win.h * 0.77}" font-size="${(win.h * 0.78).toFixed(2)}" text-anchor="middle">200</text><path class="iso-line" data-tone="faint" d="${ribs}"/><path class="iso-line" data-tone="lo" d="${glass}"/></g>`;
  const [lx, ly] = LAMP;
  const kx = C.x + 18.5;
  const ky = C.y + 11;
  const svg = [
    sol(k.slabOf(C, 0, C.h, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(C, 2.4, P, 4), { tone: "faint" }) }),
    faceSvg,
    L(k.planOutline(k.insetPlan(C, 1.6), C.h, P, 3), { tone: "faint" }),
    D([[C.x + 3, C.y + 3], [C.x + 3, C.y + C.d - 3], [C.x + C.w - 3, C.y + 3], [C.x + C.w - 3, C.y + C.d - 3]].map(([x, y]) => at([x, y, C.h])), { size: 0.42 }),
    L(k.ring(lx, ly, 2.4, C.h, P, 20), { tone: "lo" }),
    `<g data-lamp="green">${sol(S.drum(lx, ly, 1.7, C.h, 1.3, 18, 0.3), { tone: "mid" })}</g>`,
    sol(S.drum(kx, ky, 2.3, C.h, 3, 20), { tone: "mid" }),
    L(k.knurl(kx, ky, 2.3, C.h, C.h + 3, 24, P, 0.5), { tone: "lo" }),
    L(k.lineOnTop([kx - 1.4, ky], [kx + 1.6, ky], C.h + 3, P), { tone: "hi" }),
  ].join("");
  const shapes = A ? [A.slab(C, 0, C.h, { name: "base.counter" }, 4), A.cylinder(lx, ly, 1.7, C.h, 1.3, { name: "base.counter.lamp" }), A.cylinder(kx, ky, 2.3, C.h, 3, { name: "base.counter.knob" })] : [];
  return { name: "base.counter", svg, shapes };
}

// Spare string on a spool, the cord the pulleys carry.
function spool(A) {
  const [x, y] = [50, 24];
  const core = { r: 2.8, z0: 0.9, z1: 5.3 };
  const winds = Array.from({ length: 8 }, (_, i) => k.sideArc(x, y, core.r, core.z0 + 0.5 + i * 0.5, P, 12)).join("");
  const svg = [
    sol(S.drum(x, y, 4.4, 0, core.z0, 20, 0.3), { tone: "mid" }),
    sol(S.drum(x, y, core.r, core.z0, core.z1 - core.z0, 16), { tone: "mid", inner: L(winds, { tone: "lo" }) }),
    sol(S.drum(x, y, 4.4, core.z1, 0.9, 20, 0.3), { tone: "mid" }),
    L(k.ring(x, y, 1.1, core.z1 + 0.9, P, 14), { tone: "lo" }),
  ].join("");
  const shapes = A ? [A.cylinder(x, y, 4.4, 0, core.z0, { name: "base.spool.flange" }), A.cylinder(x, y, core.r, core.z0, core.z1 - core.z0, { name: "base.spool.core" }), A.cylinder(x, y, 4.4, core.z1, 0.9, { name: "base.spool.top" })] : [];
  return { name: "base.spool", svg, shapes };
}

// Gene card file: one card per gene in the tour, the one on the table lifted.
function cardTray(A) {
  const floor = { x: 35, y: 55.4, w: 36, d: 14.8, r: 1.2 };
  const wall = (y) => ({ x: 35.6, y, w: 34.8, d: 1.2, r: 0.4 });
  const WALL_H = 5;
  const back = wall(56.2);
  const front = wall(68.2);
  const top = 1.2 + WALL_H;
  const ends = (y) => D([36.4, 69.6].map((x) => at([x, y + 0.6, top])), { size: 0.4 });
  const pre = [sol(k.slabOf(floor, 0, 1.2, P, 3, 0.4), { tone: "mid" }), sol(k.slabOf(back, 1.2, WALL_H, P, 2), { tone: "mid" }), ends(back.y)];
  const post = [sol(k.slabOf(front, 1.2, WALL_H, P, 2), { tone: "mid" }), ends(front.y)];
  const shapes = A ? [A.slab(floor, 0, 1.2, { name: "base.tray" }, 3), A.slab(back, 1.2, WALL_H, { name: "base.tray.back" }, 2), A.slab(front, 1.2, WALL_H, { name: "base.tray.front" }, 2)] : [];
  const cards = [];
  for (let i = 0; i < 7; i++) {
    const C = CARDS;
    const x = C.x0 + i * C.pitch;
    const plan = { x, y: C.y, w: C.w, d: C.d, r: 0 };
    const tab = { x, y: C.y + 0.6 + (i % 3) * 3.1, w: C.w, d: 2.6, r: 0 };
    const face = x + C.w;
    const rules = [[C.z0 + C.h - 2.2, 6.2], [C.z0 + C.h - 3.8, 4.4]].map(([z, w]) => L(k.segment([face, C.y + 1.4, z], [face, C.y + 1.4 + w, z], P), { tone: "lo", free: true })).join("");
    const svg = sol(k.slabOf(plan, C.z0, C.h, P, 2), { tone: "mid" }) + rules + sol(k.slabOf(tab, C.z0 + C.h, 1.6, P, 2), { tone: "mid" });
    cards.push(`<g data-card="${i}"${i === 0 ? ` transform="${k.translateAlong(P, [0, 0, C.lift])}"` : ""}>${svg}</g>`);
    if (A) shapes.push(A.slab(plan, C.z0 + (i === 0 ? C.lift : 0), C.h + 1.6, { name: "base.card" }, 2));
  }
  return { name: "base.cards", svg: pre.join("") + cards.join("") + post.join(""), shapes };
}

// Tripod: a cast star of three arms round a flange, on levelling screws, with a hub on
// top, knurled levelling knobs at the arm ends and a bull's-eye level on the front-right arm.
const ARM = { w: 4, z0: 4, z1: 9 }; // half-width under the column radius, so the back arm hides behind the column
const FLANGE = 13;
const HUB = { r: 9.5, z0: ARM.z1, z1: 14 };
function starRing() {
  const out = [];
  const alpha = Math.asin(ARM.w / FLANGE);
  const sorted = [...ARMS].sort((x, y) => x - y);
  sorted.forEach((phi, index) => {
    const a = phi * DEG;
    const u = [Math.cos(a), Math.sin(a)];
    const v = [-u[1], u[0]];
    const P2 = (s, t) => [u[0] * s + v[0] * t, u[1] * s + v[1] * t];
    for (let i = 0; i <= 10; i++) {
      const t = -Math.PI / 2 + (i / 10) * Math.PI;
      out.push(P2(ARM_L + ARM.w * Math.cos(t), ARM.w * Math.sin(t)));
    }
    const from = a + alpha;
    const next = sorted[(index + 1) % sorted.length] * DEG + (index === sorted.length - 1 ? 2 * Math.PI : 0);
    const to = next - alpha;
    const steps = Math.max(2, Math.round(((to - from) / (2 * Math.PI)) * 40));
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      out.push([FLANGE * Math.cos(t), FLANGE * Math.sin(t)]);
    }
  });
  return out;
}
const endOf = (phi) => [Math.cos(phi * DEG) * ARM_L, Math.sin(phi * DEG) * ARM_L];
function feet(A) {
  const out = [];
  const shapes = [];
  for (const phi of byDepthAngle(ARMS)) {
    const [x, y] = endOf(phi);
    out.push(sol(S.drum(x, y, 3.4, 0, 1.4, 20, 0.3), { tone: "lo" }), sol(S.drum(x, y, 1.3, 1.4, ARM.z0 - 1.4, 12), { tone: "mid" }));
    if (A) shapes.push(A.cylinder(x, y, 3.4, 0, 1.4, { name: "tripod.pad" }), A.cylinder(x, y, 1.3, 1.4, ARM.z0 - 1.4, { name: "tripod.screw" }));
  }
  return { name: "tripod.feet", svg: out.join(""), shapes };
}
function star(A) {
  const ring = starRing();
  const svg = sol(k.extrude(ring, ARM.z0, ARM.z1 - ARM.z0, P, { convex: false, bevel: 0.5 }), { tone: "mid", inner: L(k.ringSeam(ring, ARM.z0 + 2.5, P), { tone: "faint" }) });
  return { name: "tripod.star", svg, shapes: A ? [A.extruded(ring, ARM.z0, ARM.z1 - ARM.z0, { name: "tripod.star" })] : [] };
}
function knobs(A) {
  const out = [];
  const shapes = [];
  for (const phi of byDepthAngle(ARMS)) {
    const [x, y] = endOf(phi);
    out.push(sol(S.drum(x, y, 3.2, ARM.z1, 3.4, 22), { tone: "mid" }), L(k.knurl(x, y, 3.2, ARM.z1, ARM.z1 + 3.4, 26, P, 0.5), { tone: "lo" }), D([at([x, y, ARM.z1 + 3.4])], { size: 0.5 }));
    if (A) shapes.push(A.cylinder(x, y, 3.2, ARM.z1, 3.4, { name: "tripod.knob" }));
    if (phi === 345) {
      const [lx, ly] = [Math.cos(phi * DEG) * 27, Math.sin(phi * DEG) * 27];
      out.push(sol(S.drum(lx, ly, 3.3, ARM.z1, 2, 22, 0.4), { tone: "mid" }), L(k.ring(lx, ly, 2.3, ARM.z1 + 2, P, 22), { tone: "lo" }), L(k.ring(lx, ly, 1, ARM.z1 + 2, P, 14), { tone: "faint" }), L(k.ring(lx + 0.15, ly - 0.1, 0.6, ARM.z1 + 2, P, 12), { tone: "hi" }));
      if (A) shapes.push(A.cylinder(lx, ly, 3.3, ARM.z1, 2, { name: "tripod.level" }));
    }
  }
  return { name: "tripod.knobs", svg: out.join(""), shapes };
}
const byDepthAngle = (list) => [...list].sort((a, b) => k.depthOf([...endOf(a), 0], P) - k.depthOf([...endOf(b), 0], P));
function hub(A) {
  const svg = sol(S.drum(0, 0, HUB.r, HUB.z0, HUB.z1 - HUB.z0, 40, 0.8), { tone: "mid", inner: L(k.sideArc(0, 0, HUB.r, HUB.z0 + 2.2, P, 28), { tone: "faint" }) });
  return { name: "tripod.hub", svg, shapes: A ? [A.cylinder(0, 0, HUB.r, HUB.z0, HUB.z1 - HUB.z0, { name: "tripod.hub" })] : [] };
}
const COL = { r: 4.4, z0: HUB.z1, z1: TOP - TH - 5 };
function column(A) {
  const boss = { r: 10, z0: COL.z1, z1: TOP - TH };
  const collar = { r: 6, z0: 25, z1: 31 };
  // release knob on the collar, pointing at the front-right: pulled out, it draws the
  // centre pin down into the table
  const F = G.frameAlong([RELEASE.dir[0] * collar.r * 0.92, RELEASE.dir[1] * collar.r * 0.92, (collar.z0 + collar.z1) / 2], RELEASE.dir);
  const out = [
    sol(S.drum(0, 0, COL.r, COL.z0, COL.z1 - COL.z0, 24), { tone: "mid", inner: L(k.sideArc(0, 0, COL.r, COL.z0 + 4, P, 16), { tone: "faint" }) }),
    sol(S.drum(0, 0, collar.r, collar.z0, collar.z1 - collar.z0, 32, 0.4), { tone: "mid", inner: L(k.sideArc(0, 0, collar.r, collar.z0 + 1.2, P, 24), { tone: "faint" }) }),
  ];
  const guide = G.disc(0, 1.6, 1.9, F, P, { steps: 12 });
  const rod = G.disc(1.6 - RELEASE.travel, 4, 0.9, F, P, { steps: 12 });
  const head = G.solidOf([[4, 2.6], [6.4, 2.6], [7.2, 1.8]], F, P, { steps: 20, smooth: false });
  const clipD = k.pathOf(G.hullOf([0, 1].flatMap((end) => Array.from({ length: 16 }, (_, i) => S.at(G.pointOf(F, end ? 9 : 1.6, 3.2, (i / 16) * Math.PI * 2))))), true);
  out.push(sol(guide, { tone: "mid" }));
  out.push(`<g data-part="release"><clipPath id="sig-release"><path data-hold d="${clipD}"/></clipPath><g clip-path="url(#sig-release)">${sol(rod, { tone: "mid" })}</g>${sol(head, { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 4, 6.4, 2.6, 20, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) })}</g>`);
  out.push(sol(S.drum(0, 0, boss.r, boss.z0, boss.z1 - boss.z0, 40, 0.5), { tone: "mid" }));
  const shapes = A
    ? [
        A.cylinder(0, 0, COL.r, COL.z0, COL.z1 - COL.z0, { name: "tripod.column" }),
        A.cylinder(0, 0, collar.r, collar.z0, collar.z1 - collar.z0, { name: "tripod.collar", owner: "tripod.column" }),
        A.disc(F, 0, 1.6, 1.9, { name: "tripod.release.guide" }),
        A.disc(F, 1.6, 4, 0.9, { name: "tripod.release.rod" }),
        A.solid(F, [[4, 2.6], [6.4, 2.6], [7.2, 1.8]], { name: "tripod.release.knob" }),
        A.cylinder(0, 0, boss.r, boss.z0, boss.z1 - boss.z0, { name: "tripod.boss" }),
      ]
    : [];
  return { name: "tripod.column", svg: out.join(""), shapes };
}

// Table: degree ruling at the rim (1° minor, 5° mid, 10° major, 0° toward the viewer),
// the same ruling down the side band, a protractor band at 40–43, cardinal lines, the
// engraved circle one asymmetry threshold out from the ring, the bore and the cord's eyelet.
function table(A) {
  const band = R - 3.4; // the degree band: every major tick and the zero mark start on it
  const circle = S.RING.rOut + 1.1;
  const rule = { minor: [], mid: [], major: [] };
  const side = { minor: [], major: [] };
  const inner = { minor: [], major: [] };
  for (let i = 0; i < 360; i++) {
    const a = (S.FRONT + i) * DEG;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const len = i % 10 === 0 ? 3.4 : i % 5 === 0 ? 2.2 : 1.3;
    if (i && (i % 2 === 0 || i % 5 === 0)) (i % 10 === 0 ? rule.major : i % 5 === 0 ? rule.mid : rule.minor).push(k.lineOnTop([c * (R - len), s * (R - len)], [c * R, s * R], TOP, P));
    if (i % 5 === 0) inner[i % 10 === 0 ? "major" : "minor"].push(k.lineOnTop([c * 40, s * 40], [c * (i % 10 === 0 ? 43 : 41.4), s * (i % 10 === 0 ? 43 : 41.4)], TOP, P));
    // the side band faces the viewer over the front half: 2° ticks hang from the bevel
    if (i % 2 === 0 && Math.cos(i * DEG) > 0.12) (i % 10 === 0 ? side.major : side.minor).push(k.segment([c * R, s * R, TOP - 0.8], [c * R, s * R, TOP - 0.8 - (i % 10 === 0 ? 1.9 : 1)], P));
  }
  const f = S.FRONT * DEG;
  const zero = k.lineOnTop([Math.cos(f) * band, Math.sin(f) * band], [Math.cos(f) * R, Math.sin(f) * R], TOP, P);
  const cardinals = [0, 90, 180, 270].map((a) => {
    const t = (S.FRONT + a) * DEG;
    return k.lineOnTop([Math.cos(t) * circle, Math.sin(t) * circle], [Math.cos(t) * 40, Math.sin(t) * 40], TOP, P) + k.lineOnTop([Math.cos(t) * 43, Math.sin(t) * 43], [Math.cos(t) * band, Math.sin(t) * band], TOP, P);
  });
  const svg = [
    sol(S.drum(0, 0, R, TOP - TH, TH, 96, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, R, TOP - TH + 1.1, P, 64), { tone: "faint" }) + L(side.minor.join(""), { tone: "lo" }) + L(side.major.join(""), { tone: "mid" }) }),
    L(k.ring(0, 0, band, TOP, P, 72), { tone: "faint" }),
    L(k.ring(0, 0, 20, TOP, P, 40) + k.ring(0, 0, 40, TOP, P, 64) + k.ring(0, 0, 43, TOP, P, 64), { tone: "faint" }),
    L(cardinals.join(""), { tone: "faint" }),
    L(inner.minor.join(""), { tone: "faint" }),
    L(inner.major.join(""), { tone: "lo" }),
    L(rule.minor.join(""), { tone: "lo" }),
    L(rule.mid.join(""), { tone: "lo" }),
    L(rule.major.join(""), { tone: "mid" }),
    L(zero, { tone: "hi" }),
    L(k.ring(0, 0, circle, TOP, P, 48), { tone: "lo" }),
    L(k.ring(0, 0, 2.1, TOP, P, 18), { tone: "faint" }),
    L(k.ring(0, 0, S.EYE, TOP, P, 10), { tone: "lo" }),
  ].join("");
  return { name: "stand.table", svg, shapes: A ? [A.cylinder(0, 0, R, TOP - TH, TH, { name: "stand.table" })] : [] };
}

// Audit shapes of the moving items (build only), from the specs scene.mjs drew them with.
export function shapesOf(A) {
  const prism = (F, b, name, extra = {}) => [A.prism(F, b.poly, b.z0, b.z1, { name, ...extra })];
  const pin = (z0, z1, r, name) => (z1 - z0 > 0.02 ? [A.cylinder(0, 0, r, z0, z1 - z0, { name })] : []);
  const cut = S.RING.z1;
  const RING_F = G.frameAlong([0, 0, 0], [0, 0, 1]);
  return (kind, c) => {
    if (kind === "ring") return [A.moved(A.ring(RING_F, S.RING.z0, S.RING.z1, S.RING.rIn, S.RING.rOut, { name: "ring" }), c)];
    if (kind === "pin-lo") return [...pin(TOP, Math.min(c.tip, cut), S.PIN.r, "stand.pin.lo"), ...pin(Math.max(TOP, c.tip), Math.min(c.capTop, cut), S.PIN.cap, "stand.pin.cap.lo")];
    if (kind === "pin-hi") return [...pin(Math.max(TOP, cut), c.tip, S.PIN.r, "stand.pin"), ...pin(Math.max(TOP, cut, c.tip), c.capTop, S.PIN.cap, "stand.pin.cap")];
    if (kind === "hanger") {
      const { h, st, tr, id } = c;
      const g = { ground: true };
      const out = [A.cylinder(h.x, h.y, S.HANGER_R, h.base, 1.2, { name: `${id}.hanger.base`, ...g }), A.cylinder(h.x, h.y, 0.5, h.top, st.hook - S.HOOK.r - h.top + 0.15, { name: `${id}.hanger.stem`, ...g })];
      if (h.list.length) out.push(A.cylinder(h.x, h.y, S.MASS.r, h.list[0].z, h.top - h.list[0].z, { name: `${id}.masses`, ...g }));
      // a mass on its way on or off is held by the hand that moves it; its slot takes the stem
      if (h.at) out.push(A.cylinder(h.at[0], h.at[1], S.MASS.r, h.at[2], tr.h, { name: `${id}.mass.moving`, owner: `${id}.hanger.stem`, ...g }));
      return out;
    }
    const { p, id: n } = c;
    const [x, y] = p.sc;
    if (kind === "head") return [A.cylinder(x, y, 2, TOP - 13.6, 3.6, { name: `${n}.screw.head` })];
    if (kind === "shank") return [A.cylinder(x, y, 0.75, TOP - 8, 3.7, { name: `${n}.screw.shank` })];
    if (kind === "index") return prism(p.F, p.index, `${n}.index`, { owner: `${n}.jaw` });
    // the axle runs through the wheel's bore and carries the nut: one turned assembly
    if (kind === "wheel") return [A.solid(p.WF, S.WHEEL_PROFILE, { name: `${n}.wheel` }), A.disc(p.WF, -1.9, 2.2, 0.6, { name: `${n}.axle`, owner: `${n}.wheel` }), A.disc(p.WF, -1.9, -S.WHEEL.half, 1.3, { name: `${n}.nut`, owner: `${n}.wheel` })];
    return prism(p.F, p[kind], `${n}.${kind}`);
  };
}

export function staticParts(A = null) {
  return {
    floor: [bench(A), { name: "halo.table", svg: `<path class="iso-halo" d="${k.cylinder(0, 0, R + 2, 0, 0.1, P, 48).fill}"/>`, shapes: [] }, level(A), counter(A), label(A), spool(A), ruler(A), massCase(A), cardTray(A)],
    under: [feet(A), star(A), knobs(A), hub(A), column(A)],
    table: [table(A)],
  };
}
