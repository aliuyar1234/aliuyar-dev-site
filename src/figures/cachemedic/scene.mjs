// Fig 16 static scene: every part that does not move, in painter's order, with slots where the moving parts go.
// Pure ESM: imported by art.mjs at build time and by build.mjs for previews and the audit.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import D from "./data.mjs";
import { roundSolid, ellipseRing, frontArc, sideBand } from "./round.mjs";
import {
  P, PLINTH, PLINTH_H, FOOT_H, DECK, DZ, FRONT, C, PLATTER_R, PLATTER_Z, PLATTER_TOP, MAT_R, REC_R, REC_Z, TOP, LABEL_R, RINGS, HIT,
  T, ZP, PC, ZC, ARM, CONSOLE, CON_Z, SELECTOR, EPS_KNOB, KNOB_TOP, STROBE, CUE, toward, BENCH, BENCH_Z, BENCH_H, BENCH_FOOT,
} from "./world.mjs";

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const cyl = (x, y, r, z, h, steps = 24, bevel = 0) => roundSolid(x, y, r, z, h, P, bevel);
const ring = (x, y, r, z) => ellipseRing(x, y, r, z, P);
const arcS = (x, y, r, z) => frontArc(x, y, r, z, P);
const ball = (c, r) => G.sphereOf(c, r, P, { steps: 20 });
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// shape descriptors, turned into audit shapes by build.mjs
const sSlab = (plan, z, h) => ["slab", plan, z, h];
const sCyl = (x, y, r, z, h) => ["cyl", x, y, r, z, h];

// start and speed levers on the console: name, x, thrown forward
const LEVERS = [["start", C[0] + 30, true], ["speed", C[0] + 44, false]];
// the drive: a motor behind the platter at 7 o'clock-back, its belt round the platter's outer rim
const M = [C[0] + 105 * Math.cos((-125 * Math.PI) / 180), C[1] + 105 * Math.sin((-125 * Math.PI) / 180)];
const PULLEY_R = 3.2;

export function scene() {
  const items = [];
  const put = (name, svg, shapes = []) => items.push({ name, svg, shapes });
  const slot = (name) => items.push({ name, slot: true });

  // ============================ the family bench: a low plate on feet, a ruler strip and the maker's plate on its front edge
  {
    const z0 = BENCH_Z - BENCH_H;
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, z0 - BENCH_FOOT, BENCH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(BENCH, 11)).slice(1)) {
      feet.push(S(cyl(x, y, 6.4, z0 - BENCH_FOOT, 1.6, 24), { tone: "lo" }) + S(cyl(x, y, 5, z0 - BENCH_FOOT + 1.6, BENCH_FOOT - 1.6, 24), { tone: "mid" }));
      shapes.push(sCyl(x, y, 6.4, z0 - BENCH_FOOT, 1.6), sCyl(x, y, 5, z0 - BENCH_FOOT + 1.6, BENCH_FOOT - 1.6));
    }
    put("stand.feet", halo + feet.join(""), shapes);
    const screws = k.corners(BENCH, 8.5);
    const svg = S(k.slabOf(BENCH, z0, BENCH_H, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(BENCH, z0 + 3.4, P, 8), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(BENCH, 4.4), BENCH_Z, P), { tone: "lo" }) +
      L(screws.map(([x, y]) => ring(x, y, 2, BENCH_Z)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, BENCH_Z])), { size: 0.5 });
    put("stand.bench", svg, [sSlab(BENCH, z0, BENCH_H)]);
  }
  // ruler strip along the front edge: a minor tick every 4 units, a major every 5th
  {
    const ruler = { x: BENCH.x + 14, y: FRONT + 8.4, w: 132, d: 5, r: 0.8 };
    const z = BENCH_Z + 0.6;
    const minor = [];
    const major = [];
    for (let i = 0; i <= 31; i++) {
      const x = ruler.x + 4 + i * 4;
      (i % 5 === 0 ? major : minor).push(k.lineOnTop([x, ruler.y], [x, ruler.y + (i % 5 === 0 ? 2.8 : 1.6)], z, P));
    }
    put("bench.ruler", S(k.slabOf(ruler, BENCH_Z, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) +
      Dots([at([ruler.x + 1.8, ruler.y + 3.6, z]), at([ruler.x + ruler.w - 1.8, ruler.y + 3.6, z])], { size: 0.42 }), [sSlab(ruler, BENCH_Z, 0.6)]);
  }
  // the maker's plate, lying on the bench: the mark and three rule lines standing for the engraving
  {
    const plate = { x: BENCH.x + BENCH.w - 62, y: FRONT + 4.2, w: 44, d: 11.4, r: 1.3 };
    const z = BENCH_Z + 0.8;
    const rules = [[6.4, 26], [8.0, 20], [9.6, 13]].map(([dy, w]) => k.lineOnTop([plate.x + 9.5, plate.y + dy], [plate.x + 9.5 + w, plate.y + dy], z, P));
    put("plate.label", S(k.slabOf(plate, BENCH_Z, 0.8, P, 4), { tone: "mid" }) + L(k.planOutline(k.insetPlan(plate, 1.3), z, P, 4), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([plate.x + 9.5, plate.y + 4.4], z, P, "x"), "AU-16", { size: 3.2, tone: "mid" }) + L(rules.join(""), { tone: "lo", free: true }) +
      Dots([at([plate.x + 3.3, plate.y + 3.2, z]), at([plate.x + 3.3, plate.y + plate.d - 3.2, z])], { size: 0.45 }), [sSlab(plate, BENCH_Z, 0.8)]);
  }

  // ============================ the turntable's plinth on four feet
  {
    const z0 = -PLINTH_H - FOOT_H;
    const halo = `<path class="iso-halo" d="${k.haloOf(PLINTH, z0, PLINTH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    for (const [x, y] of byDepth(k.corners(PLINTH, 13)).slice(1)) {
      feet.push(S(cyl(x, y, 9, z0, 1.6, 32), { tone: "lo" }) + S(cyl(x, y, 7, z0 + 1.6, FOOT_H - 1.6, 32), { tone: "mid" }));
      shapes.push(sCyl(x, y, 9, z0, 1.6), sCyl(x, y, 7, z0 + 1.6, FOOT_H - 1.6));
    }
    put("tt.feet", halo + feet.join(""), shapes);
    const seam = L(k.sideSeam(PLINTH, -6.4, P, 8), { tone: "faint" });
    // the cue speaker on the operator's face: a recessed panel with nine slots, every outline closed
    const fp = (x, z) => at([x, FRONT, z]);
    const box = (x0, z0, x1, z1) => k.pathOf([fp(x0, z0), fp(x1, z0), fp(x1, z1), fp(x0, z1)], true);
    const gx = C[0] + 34;
    let grille = box(gx, -17.4, gx + 44, -8.6);
    for (let i = 0; i < 9; i++) grille += box(gx + 4 + i * 4.3, -15.6, gx + 5.4 + i * 4.3, -10.4);
    const screws = Dots([fp(gx - 3, -13), fp(gx + 47, -13)], { size: 0.45 });
    // a recessed hand-hold on the right face, for lifting the deck off the bench
    const X = PLINTH.x + PLINTH.w;
    const sp = (y, z) => at([X, y, z]);
    const slotOf = (y0, y1, z0, z1, r) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(sp(y1 - r + r * Math.sin((i / 8) * Math.PI), (z0 + z1) / 2 + r * Math.cos((i / 8) * Math.PI)));
      for (let i = 0; i <= 8; i++) pts.push(sp(y0 + r - r * Math.sin((i / 8) * Math.PI), (z0 + z1) / 2 - r * Math.cos((i / 8) * Math.PI)));
      return k.pathOf(pts, true);
    };
    const handle = slotOf(-6, 46, -15.6, -10.4, 2.6) + slotOf(-4.4, 44.4, -14.8, -11.2, 1.8);
    const fq = (x, z) => at([x, FRONT, z]);
    const slotFront = (x0, x1, z0, z1, r) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(fq(x1 - r + r * Math.sin((i / 8) * Math.PI), (z0 + z1) / 2 + r * Math.cos((i / 8) * Math.PI)));
      for (let i = 0; i <= 8; i++) pts.push(fq(x0 + r - r * Math.sin((i / 8) * Math.PI), (z0 + z1) / 2 - r * Math.cos((i / 8) * Math.PI)));
      return k.pathOf(pts, true);
    };
    grille += slotFront(C[0] - 30, C[0] + 22, -15.6, -10.4, 2.6) + slotFront(C[0] - 28.4, C[0] + 20.4, -14.8, -11.2, 1.8);
    put("stand.plinth", S(k.slabOf(PLINTH, -PLINTH_H, PLINTH_H, P, 8, 1.6), { tone: "mid", inner: seam + L(grille, { tone: "lo" }) + L(handle, { tone: "lo" }) }) + screws, [sSlab(PLINTH, -PLINTH_H, PLINTH_H)]);
  }
  // cue monitor on the operator's face: a phone jack and a level pot
  {
    const F = (x, z) => G.frameOf([x, FRONT, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const Fj = F(C[0] - 60, -12.6);
    const Fk = F(C[0] - 44, -12.6);
    put("cue.monitor",
      S(G.disc(0, 1.6, 3.4, Fj, P, { steps: 20 }), { tone: "mid" }) + L(G.circleOf(Fj, 1.6, 1.6, P), { tone: "lo" }) + Dots([at(G.pointOf(Fj, 1.6, 0, 0))], { size: 0.7, tone: "hi" }) +
      S(G.disc(0, 1.2, 4.4, Fk, P, { steps: 20 }), { tone: "lo" }) + S(G.disc(1.2, 3.8, 3.2, Fk, P, { steps: 20 }), { tone: "mid" }) + L(G.circleOf(Fk, 3.8, 2.2, P), { tone: "faint" }) +
      Dots([at(G.pointOf(Fk, 3.8, 1.6, Math.PI / 2))], { size: 0.45, tone: "hi" }),
      [["disc", Fj, 0, 1.6, 3.4], ["disc", Fk, 0, 1.2, 4.4], ["disc", Fk, 1.2, 3.8, 3.2]]);
  }

  // right face: mains inlet and fuse at the back, the output panel, a serial plate at the front
  {
    const X = PLINTH.x + PLINTH.w;
    const face = X + 0.8;
    const fp = (y, z) => at([face, y, z]);
    const F = (y, z) => G.frameOf([face, y, z], [1, 0, 0], [0, 0, 1], [0, -1, 0]);
    const panel = (plate, z0, h) => S(k.slabOf(plate, z0, h, P, 2), { tone: "lo", crease: "none" });
    // output panel: two balanced sockets for the cartridge signal and a ground post
    const out = { x: X, y: T[1] - 14, w: 0.8, d: 30, r: 0.3 };
    let svg = panel(out, -17.6, 10.4) + Dots([fp(out.y + 2.4, -15.2), fp(out.y + out.d - 2.4, -9.6)], { size: 0.42 });
    const shapes = [sSlab(out, -17.6, 10.4)];
    for (const y of [out.y + 8, out.y + 18]) {
      const Fs = F(y, -12.4);
      svg += S(G.disc(0, 2.2, 3.6, Fs, P, { steps: 20 }), { tone: "mid" }) + L(G.circleOf(Fs, 2.2, 2.4, P), { tone: "lo" }) + Dots([0.6, 2.7, 4.8].map((a) => at(G.pointOf(Fs, 2.2, 1.3, a))), { size: 0.42, tone: "hi" });
      shapes.push(["disc", Fs, 0, 2.2, 3.6]);
    }
    const Fg = F(out.y + 26, -12.4);
    svg += S(G.disc(0, 3.4, 1.4, Fg, P, { steps: 20 }), { tone: "mid" });
    shapes.push(["disc", Fg, 0, 3.4, 1.4]);
    // mains inlet: a plate with the keyed socket recess and its three pins, the fuse holder beside it
    const inlet = { x: X, y: PLINTH.y + 14, w: 0.8, d: 15, r: 0.3 };
    const keyed = k.pathOf([fp(inlet.y + 3, -15.4), fp(inlet.y + 12, -15.4), fp(inlet.y + 12, -10.6), fp(inlet.y + 10.6, -9.6), fp(inlet.y + 4.4, -9.6), fp(inlet.y + 3, -10.6)], true);
    svg += panel(inlet, -17.4, 10) + L(keyed, { tone: "mid" }) + Dots([fp(inlet.y + 5, -12.2), fp(inlet.y + 7.5, -12.2), fp(inlet.y + 10, -12.2)], { size: 0.5, tone: "hi" }) +
      Dots([fp(inlet.y + 1.4, -12.4), fp(inlet.y + inlet.d - 1.4, -12.4)], { size: 0.4 });
    shapes.push(sSlab(inlet, -17.4, 10));
    const Ff = G.frameOf([X, inlet.y + 20.5, -12.4], [1, 0, 0], [0, 0, 1], [0, -1, 0]); // the fuse holder screws into the plinth face itself
    svg += S(G.disc(0, 1.2, 3.4, Ff, P, { steps: 20 }), { tone: "lo" }) + S(G.disc(1.2, 3.6, 2.4, Ff, P, { steps: 20 }), { tone: "mid" }) + L(k.pathOf([at(G.pointOf(Ff, 3.6, 1.6, 0.7)), at(G.pointOf(Ff, 3.6, 1.6, 0.7 + Math.PI))]), { tone: "lo" });
    shapes.push(["disc", Ff, 0, 1.2, 3.4], ["disc", Ff, 1.2, 3.6, 2.4]);
    // serial plate near the front corner: three rule lines, two rivets
    const serial = { x: X, y: FRONT - 44, w: 0.6, d: 22, r: 0.3 };
    const rules = [[-9.4, 15], [-11.4, 12], [-13.4, 8]].map(([z, w]) => k.pathOf([fp(serial.y + 4, z), fp(serial.y + 4 + w, z)])).join("");
    svg += S(k.slabOf(serial, -16, 8.4, P, 2), { tone: "mid", crease: "none" }) + L(rules, { tone: "lo", free: true }) + Dots([fp(serial.y + 2, -11.8), fp(serial.y + 20, -11.8)], { size: 0.42 });
    shapes.push(sSlab(serial, -16, 8.4));
    put("io", svg, shapes);
  }

  // ============================ top plate
  {
    const screws = k.corners(DECK, 7);
    const groove = L(k.planOutline(k.insetPlan(DECK, 4), DZ, P), { tone: "lo" });
    const rings = L(screws.map(([x, y]) => ring(x, y, 2, DZ)).join(""), { tone: "lo" });
    put("stand.deck", S(k.slabOf(DECK, 0, DZ, P, 6, 0.6), { tone: "mid" }) + groove + rings + Dots(screws.map(([x, y]) => at([x, y, DZ])), { size: 0.5 }), [sSlab(DECK, 0, DZ)]);
  }

  // ============================ behind the platter: the drive motor and its belt, the cleaning arm's post, the strobe lamp
  {
    put("motor.mount", S(cyl(M[0], M[1], 12.4, DZ, 1.4, 48, 0.3), { tone: "mid" }) + Dots([0.4, 2.5, 4.6].map((a) => at([M[0] + 10.6 * Math.cos(a), M[1] + 10.6 * Math.sin(a), DZ + 1.4])), { size: 0.45 }), [sCyl(M[0], M[1], 12.4, DZ, 1.4)]);
    put("motor.can", S(cyl(M[0], M[1], 9, DZ + 1.4, 5.6, 40, 0.5), { tone: "mid", inner: L(arcS(M[0], M[1], 9, DZ + 4.4), { tone: "faint" }) }) + L(ring(M[0], M[1], 6.2, DZ + 7), { tone: "faint" }), [sCyl(M[0], M[1], 9, DZ + 1.4, 5.6)]);
    // the belt leaves the platter rim along the two outer tangents and wraps the far side of the pulley
    const [zb0, zb1] = STROBE.belt;
    const dx = M[0] - C[0];
    const dy = M[1] - C[1];
    const dist = Math.hypot(dx, dy);
    const psi = Math.atan2(dy, dx);
    const spread = Math.acos((PLATTER_R - PULLEY_R) / dist);
    const runs = [];
    const shapes = [];
    for (const sgn of [-1, 1]) {
      const a = psi + sgn * spread;
      const n = [Math.cos(a), Math.sin(a)];
      const p0 = [C[0] + n[0] * PLATTER_R, C[1] + n[1] * PLATTER_R];
      const p1 = [M[0] + n[0] * PULLEY_R, M[1] + n[1] * PULLEY_R];
      const ringPts = [p0, p1, [p1[0] + n[0] * 0.6, p1[1] + n[1] * 0.6], [p0[0] + n[0] * 0.6, p0[1] + n[1] * 0.6]];
      runs.push(S(k.extrude(ringPts, zb0, zb1 - zb0, P), { tone: "mid", crease: "none" }));
      shapes.push(["prism", ringPts, zb0, zb1 - zb0]);
    }
    put("belt.runs", runs.join(""), shapes);
    const z = DZ + 7;
    put("motor.pulley",
      S(cyl(M[0], M[1], 2, z, zb0 - 0.6 - z, 16), { tone: "mid", crease: "none" }) + S(cyl(M[0], M[1], 4.2, zb0 - 0.6, 0.6, 28), { tone: "mid" }) +
      S(cyl(M[0], M[1], PULLEY_R, zb0, zb1 - zb0, 24), { tone: "mid", crease: "none" }) + S(cyl(M[0], M[1], 4.2, zb1, 0.6, 28), { tone: "mid" }) + L(ring(M[0], M[1], 1.3, zb1 + 0.6), { tone: "mid" }),
      [sCyl(M[0], M[1], 2, z, zb0 - 0.6 - z), sCyl(M[0], M[1], 4.2, zb0 - 0.6, 0.6), sCyl(M[0], M[1], PULLEY_R, zb0, zb1 - zb0), sCyl(M[0], M[1], 4.2, zb1, 0.6)]);
  }
  {
    const [x, y] = PC;
    const zTop = ZC - 2.4;
    put("clean.base", S(cyl(x, y, 5.6, DZ, 2.2, 36, 0.4), { tone: "mid" }) + Dots([at([x - 3.9, y, DZ + 2.2]), at([x + 3.9, y, DZ + 2.2])], { size: 0.42 }), [sCyl(x, y, 5.6, DZ, 2.2)]);
    put("clean.post", S(cyl(x, y, 1.8, DZ + 2.2, zTop - 2 - DZ - 2.2, 16), { tone: "mid", crease: "none" }) + S(cyl(x, y, 3, zTop - 2, 2, 24), { tone: "mid" }),
      [sCyl(x, y, 1.8, DZ + 2.2, zTop - 2 - DZ - 2.2), sCyl(x, y, 3, zTop - 2, 2)]);
  }
  {
    const a = (140 * Math.PI) / 180;
    const L0 = [C[0] + 91 * Math.cos(a), C[1] + 91 * Math.sin(a)];
    const box = { x: L0[0] - 4.5, y: L0[1] - 4.5, w: 9, d: 9, r: 1.4 };
    put("lamp.strobe", S(k.slabOf(box, DZ, 8, P, 3, 0.4), { tone: "mid" }) + L(k.planOutline(k.insetPlan(box, 1.8), DZ + 8, P, 3), { tone: "faint" }) + Dots([at([box.x + 2.2, box.y + 2.2, DZ + 8])], { size: 0.4 }), [sSlab(box, DZ, 8)]);
  }

  // ============================ platter with its belt and strobe band, mat, record
  {
    const seams = STROBE.seams.map((z) => arcS(C[0], C[1], PLATTER_R, z)).join("");
    put("platter", S(cyl(C[0], C[1], PLATTER_R, PLATTER_Z, PLATTER_TOP - PLATTER_Z, 128, 0.8), { tone: "mid", inner: L(seams, { tone: "lo" }) }), [sCyl(C[0], C[1], PLATTER_R, PLATTER_Z, PLATTER_TOP - PLATTER_Z), sCyl(C[0], C[1], 22, DZ, PLATTER_Z - DZ)]); // the main bearing housing, hidden under the platter
    const [zb0, zb1] = STROBE.belt;
    put("belt.band", S(sideBand(C[0], C[1], PLATTER_R + 0.6, zb0, zb1 - zb0, P), { tone: "mid", crease: "none" }));
  }
  slot("strobe");
  put("mat", S(cyl(C[0], C[1], MAT_R, PLATTER_TOP, REC_Z - PLATTER_TOP, 120), { tone: "lo", crease: "none" }), [sCyl(C[0], C[1], MAT_R, PLATTER_TOP, REC_Z - PLATTER_TOP)]);
  {
    // the twelve clean rings; the four that carry the defect are drawn live in the record slot
    const grooves = RINGS.filter((_, i) => !HIT.includes(i)).map((r) => ring(C[0], C[1], r, TOP)).join("");
    const lead = ring(C[0], C[1], REC_R - 1.6, TOP) + ring(C[0], C[1], RINGS[0] - 2.4, TOP);
    put("record", S(cyl(C[0], C[1], REC_R, REC_Z, TOP - REC_Z, 120, 0.5), { tone: "hi", crease: "lo" }) + L(grooves, { tone: "faint" }) + L(lead, { tone: "lo" }), [sCyl(C[0], C[1], REC_R, REC_Z, TOP - REC_Z)]);
  }
  put("record.label", S(cyl(C[0], C[1], LABEL_R, TOP, 0.3, 72), { tone: "mid", crease: "none" }) + L(ring(C[0], C[1], LABEL_R - 3, TOP + 0.3), { tone: "faint" }), [sCyl(C[0], C[1], LABEL_R, TOP, 0.3)]);
  slot("record");
  put("spindle", S(cyl(C[0], C[1], 1.7, TOP + 0.3, 5.4, 16), { tone: "mid", crease: "none" }) + S(ball([C[0], C[1], TOP + 5.7], 1.7), { tone: "mid" }), [sCyl(C[0], C[1], 1.7, TOP + 0.3, 5.4), ["ball", [C[0], C[1], TOP + 5.7], 1.7]]);
  slot("cleaner");

  // ============================ tonearm base (static), anti-skate, cue lever, arm rest
  {
    const [x, y] = T;
    put("arm.boss", S(cyl(x, y, 15, DZ, 3, 64, 0.6), { tone: "mid" }) + L(ring(x, y, 12.4, DZ + 3), { tone: "faint" }) + Dots([0.9, 3, 5.1].map((a) => at([x + 13.7 * Math.cos(a), y + 13.7 * Math.sin(a), DZ + 3])), { size: 0.45 }), [sCyl(x, y, 15, DZ, 3)]);
    put("arm.pillar", S(cyl(x, y, 5, DZ + 3, ZP - 11.4 - DZ - 3, 32), { tone: "mid", crease: "none", inner: L(arcS(x, y, 5, DZ + 8), { tone: "faint" }) }), [sCyl(x, y, 5, DZ + 3, ZP - 11.4 - DZ - 3)]);
    // anti-skate: an outrigger on the bearing housing with a weight on a thread
    put("arm.bearing", S(cyl(x, y, 7.4, ZP - 11.4, 4.4, 40, 0.5), { tone: "mid" }), [sCyl(x, y, 7.4, ZP - 11.4, 4.4)]);
    put("arm.turret", S(cyl(x, y, 5.8, ZP - 7, 2.4, 32, 0.3), { tone: "mid" }) + L(ring(x, y, 4, ZP - 4.6), { tone: "faint" }), [sCyl(x, y, 5.8, ZP - 7, 2.4)]);
    const wx = x + 16.6;
    put("arm.skateWeight", L(k.segment([wx, y, ZP - 9.6], [wx, y, DZ + 10.2], P), { tone: "lo" }) + S(cyl(wx, y, 1.8, DZ + 6.4, 3.8, 16), { tone: "mid" }), [sCyl(wx, y, 1.8, DZ + 6.4, 3.8), sCyl(wx, y, 0.2, DZ + 10.2, ZP - 9.6 - DZ - 10.2)]);
    const out = { x: x + 7.3, y: y - 1, w: 10.7, d: 2, r: 0.6 };
    put("arm.skateArm", S(k.slabOf(out, ZP - 9.6, 1.6, P, 2), { tone: "mid" }), [sSlab(out, ZP - 9.6, 1.6)]);
    const cq = { x: CUE[0] - 3, y: CUE[1] - 3, w: 6, d: 6, r: 1 };
    put("arm.cueBox", S(k.slabOf(cq, DZ + 3, 5, P, 2, 0.4), { tone: "mid" }), [sSlab(cq, DZ + 3, 5)]);
  }
  slot("cue");
  {
    const R = [T[0] + 66 * Math.cos(ARM.park), T[1] + 66 * Math.sin(ARM.park)];
    const zTop = ZP - 1.8;
    put("arm.restPost", S(cyl(R[0], R[1], 4.4, DZ, 2.4, 28, 0.4), { tone: "mid" }) + S(cyl(R[0], R[1], 1.8, DZ + 2.4, zTop - 3 - DZ - 2.4, 16), { tone: "mid", crease: "none" }), [sCyl(R[0], R[1], 4.4, DZ, 2.4), sCyl(R[0], R[1], 1.8, DZ + 2.4, zTop - 3 - DZ - 2.4)]);
    const cradle = { x: R[0] - 3.4, y: R[1] - 3, w: 6.8, d: 6, r: 1 };
    put("arm.rest", S(k.slabOf(cradle, zTop - 3, 3, P, 2, 0.3), { tone: "mid" }) + L(k.lineOnTop([R[0], cradle.y], [R[0], cradle.y + cradle.d], zTop, P), { tone: "lo" }), [sSlab(cradle, zTop - 3, 3)]);
  }
  {
    const V = [T[0] + 4, T[1] - 40];
    put("level", S(cyl(V[0], V[1], 6, DZ, 2.6, 36, 0.4), { tone: "mid" }) + L(ring(V[0], V[1], 4.2, DZ + 2.6) + ring(V[0], V[1], 1.6, DZ + 2.6), { tone: "lo" }) + Dots([at([V[0] + 0.5, V[1] - 0.3, DZ + 2.6])], { size: 0.8, tone: "hi" }), [sCyl(V[0], V[1], 6, DZ, 2.6)]);
  }

  // a spare headshell in its holder, in the strip between the platter and the parked arm
  {
    const hb = { x: C[0] + 80, y: C[1] + 31, w: 15, d: 9, r: 1.2 };
    const z1 = DZ + 3.6;
    const plate = [[hb.x + 1.2, hb.y + 1.6], [hb.x + 12.4, hb.y + 1.2], [hb.x + 13.8, hb.y + 2.4], [hb.x + 13.8, hb.y + 6.6], [hb.x + 12.4, hb.y + 7.8], [hb.x + 1.2, hb.y + 7.4]];
    const lift = [[hb.x + 4, hb.y + 7.4], [hb.x + 7, hb.y + 7.5], [hb.x + 7.6, hb.y + 10.6], [hb.x + 4.6, hb.y + 10.6]];
    put("spare.holder", S(k.slabOf(hb, DZ, z1 - DZ, P, 2, 0.4), { tone: "mid" }) + Dots([at([hb.x + hb.w - 1.4, hb.y + 1.4, z1]), at([hb.x + hb.w - 1.4, hb.y + hb.d - 1.4, z1])], { size: 0.4 }), [sSlab(hb, DZ, z1 - DZ)]);
    put("spare.headshell", S(k.extrude(plate, z1, 1.2, P, { bevel: 0.2 }), { tone: "mid" }) + S(k.extrude(lift, z1 + 0.3, 0.8, P), { tone: "mid" }) +
      Dots([at([hb.x + 6, hb.y + 4.5, z1 + 1.2]), at([hb.x + 9.4, hb.y + 4.5, z1 + 1.2])], { size: 0.45, tone: "hi" }), [["prism", plate, z1, 1.2], ["prism", lift, z1 + 0.3, 0.8]]);
  }

  // a 45 rpm adapter parked on its peg beside the arm rest
  {
    const [x, y] = [C[0] + 74, C[1] + 62];
    put("adapter",
      S(cyl(x, y, 7, DZ, 1.8, 48, 0.4), { tone: "mid" }) + L(ring(x, y, 5.2, DZ + 1.8) + ring(x, y, 2.2, DZ + 1.8), { tone: "lo" }) +
      S(cyl(x, y, 1.2, DZ + 1.8, 2.2, 16), { tone: "mid", crease: "none" }),
      [sCyl(x, y, 7, DZ, 1.8), sCyl(x, y, 1.2, DZ, 4)]);
  }

  // ============================ console on the operator's edge: type selector, eps knob, start and speed levers, pilot lamp
  {
    const top = L(k.planOutline(k.insetPlan(CONSOLE, 2.4), CON_Z, P, 3), { tone: "faint" });
    const screws = [[CONSOLE.x + 4, CONSOLE.y + 4], [CONSOLE.x + 4, CONSOLE.y + CONSOLE.d - 4], [CONSOLE.x + CONSOLE.w - 4, CONSOLE.y + 4], [CONSOLE.x + CONSOLE.w - 4, CONSOLE.y + CONSOLE.d - 4]];
    const gateOf = (x) => ({ x: x - 2, y: CONSOLE.y + CONSOLE.d / 2 - 6.5, w: 4, d: 13, r: 2 });
    const gates = L(LEVERS.map(([, x]) => k.planOutline(gateOf(x), CON_Z, P, 4)).join(""), { tone: "lo" });
    put("console", S(k.slabOf(CONSOLE, DZ, CON_Z - DZ, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(CONSOLE, DZ + 2.4, P, 4), { tone: "faint" }) }) + top + gates + Dots(screws.map(([x, y]) => at([x, y, CON_Z])), { size: 0.45 }), [sSlab(CONSOLE, DZ, CON_Z - DZ)]);
  }
  // a dial plate under each knob: the detent arc and one tick per detent, all in front of the knob
  const plate = (name, knob, n, longAt, grow = 6) => {
    const R = knob.r + grow;
    const r0 = knob.r + 1.2;
    const ticks = knob.angles.map((a, i) => k.lineOnTop(toward(knob.x, knob.y, a, r0), toward(knob.x, knob.y, a, knob.r + (i === longAt ? grow - 1 : grow - 2.4)), CON_Z + 0.6, P)).join("");
    const arc = k.onTop(Array.from({ length: 33 }, (_, j) => toward(knob.x, knob.y, knob.angles[0] + ((knob.angles[n - 1] - knob.angles[0]) * j) / 32, r0)), CON_Z + 0.6, P);
    put(`${name}.plate`, S(cyl(knob.x, knob.y, R, CON_Z, 0.6, 48, 0.3), { tone: "mid", crease: "none" }) + L(arc, { tone: "lo" }) + L(ticks, { tone: "mid" }) + L(ring(knob.x, knob.y, R - 0.6, CON_Z + 0.6), { tone: "faint" }), [sCyl(knob.x, knob.y, R, CON_Z, 0.6)]);
  };
  plate("selector", SELECTOR, 6, D.heldOut);
  put("selector.knob", S(cyl(SELECTOR.x, SELECTOR.y, SELECTOR.r, CON_Z + 0.6, KNOB_TOP.selector - CON_Z - 0.6, 40, 0.4), { tone: "mid" }) + L(k.knurl(SELECTOR.x, SELECTOR.y, SELECTOR.r, CON_Z + 0.6, KNOB_TOP.selector, 36, P), { tone: "lo" }), [sCyl(SELECTOR.x, SELECTOR.y, SELECTOR.r, CON_Z + 0.6, KNOB_TOP.selector - CON_Z - 0.6)]);
  slot("selector");
  plate("eps", EPS_KNOB, 3, 0);
  put("eps.knob", S(cyl(EPS_KNOB.x, EPS_KNOB.y, EPS_KNOB.r, CON_Z + 0.6, KNOB_TOP.eps - CON_Z - 0.6, 40, 0.4), { tone: "mid" }) + L(k.knurl(EPS_KNOB.x, EPS_KNOB.y, EPS_KNOB.r, CON_Z + 0.6, KNOB_TOP.eps, 32, P), { tone: "lo" }) + L(ring(EPS_KNOB.x, EPS_KNOB.y, EPS_KNOB.r - 1.4, KNOB_TOP.eps), { tone: "faint" }), [sCyl(EPS_KNOB.x, EPS_KNOB.y, EPS_KNOB.r, CON_Z + 0.6, KNOB_TOP.eps - CON_Z - 0.6)]);
  slot("eps");
  {
    const lever = (name, x, on) => {
      const y = CONSOLE.y + CONSOLE.d / 2;
      const hy = y + (on ? -4.4 : 4.4);
      put(`lever.${name}`,
        S(cyl(x, hy, 1, CON_Z, 5, 12), { tone: "mid", crease: "none" }) +
        S(ball([x, hy, CON_Z + 6.9], 2), { tone: "mid" }),
        [sCyl(x, hy, 1, CON_Z, 5), ["ball", [x, hy, CON_Z + 6.9], 2]]);
    };
    for (const [name, x, on] of LEVERS) lever(name, x, on);
    const lamp = [C[0] + 62, CONSOLE.y + CONSOLE.d / 2];
    put("lamp.pilot", S(cyl(lamp[0], lamp[1], 3.4, CON_Z, 1.4, 28), { tone: "mid" }) + S(ball([lamp[0], lamp[1], CON_Z + 1.8], 2), { tone: "hi" }).replace('<g class="iso-solid"', '<g class="iso-solid" data-lamp="pilot" data-on="green"'), [sCyl(lamp[0], lamp[1], 3.4, CON_Z, 1.4), ["ball", [lamp[0], lamp[1], CON_Z + 1.8], 2]]);
  }

  // speed vernier at the console's right end: a small knob over a scale of seven ticks, the centre one long
  {
    const V = { x: C[0] + 84, y: CONSOLE.y + CONSOLE.d / 2, r: 3.4, angles: [-60, -40, -20, 0, 20, 40, 60].map((a) => (a * Math.PI) / 180) };
    plate("vernier", V, 7, 3, 4.6);
    const top = CON_Z + 0.6 + 3.4;
    put("vernier.knob", S(cyl(V.x, V.y, V.r, CON_Z + 0.6, 3.4, 32, 0.3), { tone: "mid" }) + L(k.knurl(V.x, V.y, V.r, CON_Z + 0.6, top, 24, P), { tone: "lo" }) + L(k.lineOnTop(toward(V.x, V.y, 0, 0.8), toward(V.x, V.y, 0, V.r - 0.7), top, P), { tone: "hi" }), [sCyl(V.x, V.y, V.r, CON_Z + 0.6, 3.4)]);
  }

  slot("tonearm");
  return items;
}

// the poses the figure rests in or passes through, for the audit
export const POSES = [
  { name: "parked", a: 0, b: 0 },
  { name: "lifting", a: 0.12, b: 0.3 },
  { name: "swing 1/3", a: 0.32, b: 0.45 },
  { name: "swinging", a: 0.5, b: 0.6 },
  { name: "swing 2/3", a: 0.7, b: 0.75 },
  { name: "lowering", a: 0.9, b: 0.9 },
  { name: "playing", a: 1, b: 1 },
  { name: "brush up", a: 1, b: 0 },
  { name: "arm up", a: 0, b: 1 },
];
