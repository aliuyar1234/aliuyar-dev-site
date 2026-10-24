// Fig 22 · every drawn item, with the shapes the audit checks. Items carry a depth `at`, an optional `bias`,
// a layer ("ext" outside, "int" seen through the window) and, for moving parts, the `part` live code drives.
import * as k from "../kit/iso-kit.mjs";
import * as G from "./round.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as W from "./world.mjs";
import D from "./data.mjs";

const { P, at, S, Ln, Dt, CH, AX, IN } = W;

// one well, a circle on the boards' front face, drawn once and placed with <use>
export function wellDef() {
  const o = at([0, 0, 0]);
  const pts = Array.from({ length: 16 }, (_, j) => {
    const a = (j / 16) * Math.PI * 2;
    const p = at([Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05]);
    return [p[0] - o[0], p[1] - o[1]];
  });
  return `<path id="cis-w" d="${k.pathOf(pts, true)}"/>`;
}

export function buildItems() {
  const items = [];
  // parts that sit wholly behind the chamber's lower panel keep their shapes for the audit but draw nothing
  const UNSEEN = new Set(["shelf.bracket24", "rail.post30"]);
  const put = (layer, name, where, svg, shapes = [], extra = {}) => items.push({ layer, name, at: where, svg: UNSEEN.has(name) ? "" : svg, shapes, ...extra });

  // ================================================================== ground: bench, feet, ruler, label plate
  {
    const B = W.BENCH;
    const z0 = -W.BENCH_H - W.FOOT_H;
    let svg = `<path class="iso-halo" d="${k.haloOf(B, z0, W.BENCH_H, P)}"/>`;
    // levelling feet near the corners, as on the family's other benches: a pad, a threaded stem, a hex nut under the bench.
    // The back foot is hidden behind the bench; the three that show are drawn
    const feet = k.corners(B, 11).sort((a, b) => W.depth([a[0], a[1], 0]) - W.depth([b[0], b[1], 0]));
    const nut = -W.BENCH_H - 3;
    feet.slice(1).forEach(([x, y], i) => {
      const threads = Ln(k.sideArc(x, y, 1.8, z0 + 4.4, P, 8) + k.sideArc(x, y, 1.8, z0 + 5.6, P, 8), { tone: "faint" });
      const foot = S(k.cylinder(x, y, 6.2, z0, 2.4, P, 24, 0.4), { tone: "lo" }) + S(k.cylinder(x, y, 1.8, z0 + 2.4, nut - z0 - 2.4, P, 12), { tone: "mid", crease: "none", inner: threads }) + S(k.cylinder(x, y, 4.2, nut, 3, P, 6, 0.3), { tone: "mid" });
      put("ground", `stand.foot${i}`, [x, y, z0], foot, [["cyl", x, y, 6.2, z0, 2.4, { ground: true }], ["cyl", x, y, 1.8, z0 + 2.4, nut - z0 - 2.4, { ground: true }], ["cyl", x, y, 4.2, nut, 3, { ground: true }]], { key: -2e4 + i });
    });
    svg += S(k.slabOf(B, -W.BENCH_H, W.BENCH_H, P, 8, 1.6), { tone: "mid" });
    svg += Ln(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "lo" });
    const screws = k.corners(B, 10);
    svg += Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" });
    svg += Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
    // ruler strip along the front edge
    const R = W.RULER;
    svg += S(k.slabOf(R, 0, 0.6, P, 3), { tone: "lo", crease: "none" });
    const t = k.topTicks(R.x + 4, R.x + R.w - 4, 4, 5, R.y + 0.8, 0.6, [2, 3.6], P);
    svg += Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
    svg += Dt([at([R.x + 2, R.y + 3.5, 0.6]), at([R.x + R.w - 2, R.y + 3.5, 0.6])], { size: 0.45 });
    // label plate with the maker's mark
    const L = W.LABEL;
    svg += S(k.slabOf(L, 0, 0.8, P, 4), { tone: "mid", crease: "none" });
    svg += Ln(k.planOutline(k.insetPlan(L, 1.6), 0.8, P), { tone: "faint" });
    svg += k.faceTextSvg(k.topMatrix([L.x + 4, L.y + 4.6], 0.8, P, "x"), "AU-22", { size: 3.4, tone: "mid" });
    svg += Ln(
      [
        [L.x + 4, L.x + 30, L.y + 7.4],
        [L.x + 4, L.x + 22, L.y + 9.2],
        [L.x + 18, L.x + 36, L.y + 4.6],
      ]
        .map(([a, b, y]) => k.lineOnTop([a, y], [b, y], 0.8, P))
        .join(""),
      { tone: "lo", free: true },
    );
    svg += Dt([at([L.x + 2.2, L.y + 2.2, 0.8]), at([L.x + L.w - 2.2, L.y + L.d - 2.2, 0.8])], { size: 0.45 });
    put("ground", "stand.bench", [0, 0, -100], svg, [["slab", B, -W.BENCH_H, W.BENCH_H, { ground: true }]], { key: -1e4 });
  }

  // ================================================================== plinth under the chamber
  {
    const Pl = W.PLINTH;
    let svg = S(k.slabOf(Pl, 0, W.PLINTH_H, P, 4, 0.8), { tone: "mid" });
    const sc = k.corners(Pl, 4.5);
    svg += Dt(sc.map(([x, y]) => at([x, y, W.PLINTH_H])), { size: 0.45 });
    put("ext", "stand.plinth", [Pl.x + Pl.w / 2, Pl.y + Pl.d / 2, 0], svg, [["slab", Pl, 0, W.PLINTH_H]], { key: -5000 });
  }

  // ================================================================== record unit, its slot, lock and card
  {
    const R = W.REC;
    const seam = k.sideSeam(R, R.h - 2.2, P, 4);
    let svg = S(k.slabOf(R, 0, R.h, P, 4, 0.7), { tone: "mid", inner: Ln(seam, { tone: "faint" }) });
    svg += Ln(k.planOutline({ ...W.SLOT, r: 0.5 }, R.h, P, 2), { tone: "lo" });
    svg += Dt([[R.x + 2.6, R.y + 2.6], [R.x + R.w - 2.6, R.y + 2.6], [R.x + 2.6, R.y + R.d - 2.6], [R.x + R.w - 2.6, R.y + R.d - 2.6]].map(([x, y]) => at([x, y, R.h])), { size: 0.42 });
    put("ext", "rec.box", [R.x + R.w / 2, R.y + R.d / 2, R.h / 2], svg, [["slab", R, 0, R.h]]);
    // key lock on the front face
    const FL = W.FY([R.x + 22, R.y + R.d, 5.2]);
    let lock = S(G.disc(0, 1.2, 2.6, FL, P), { tone: "mid" });
    lock += S(G.disc(1.2, 2, 1.8, FL, P), { tone: "mid", inner: Ln(k.pathOf([at(G.pointOf(FL, 2, 1.25, Math.PI / 2)), at(G.pointOf(FL, 2, 1.25, -Math.PI / 2))]), { tone: "lo" }) });
    put("ext", "rec.lock", [R.x + 22, R.y + R.d + 1, 5.2], lock, [["disc", FL, 0, 1.2, 2.6], ["disc", FL, 1.2, 2, 1.8]]);
    // cable gland on the top, back right
    const g = [W.FEED.x, W.REC.y + 4.5];
    let gland = S(k.cylinder(g[0], g[1], 2.4, R.h, 1.4, P, 20), { tone: "mid" });
    gland += S(k.cylinder(g[0], g[1], 1.6, R.h + 1.4, 1.6, P, 18), { tone: "mid" });
    put("ext", "rec.gland", [g[0], g[1], R.h + 1], gland, [["cyl", g[0], g[1], 2.4, R.h, 1.4], ["cyl", g[0], g[1], 1.6, R.h + 1.4, 1.6]]);
    // the run record card, rising out of the slot (live code rewrites it)
    const card = W.cardPaths(1);
    const marks = W.cardMarks(1);
    let csvg = `<clipPath id="cis-cardclip"><path d="${k.slabOf({ x: W.SLOT.x - 2, y: W.SLOT.y - 2, w: W.SLOT.w + 4, d: W.SLOT.d + 4, r: 0 }, R.h, 40, P, 2).fill}"/></clipPath>`;
    csvg += `<g clip-path="url(#cis-cardclip)">${W.fixedSolid(card, { tone: "hi", crease: "lo", part: "cardSolid" })}`;
    csvg += `<path class="iso-line" data-tone="lo" data-free="" data-part="cardRules" d="${marks.rules}"/>`;
    csvg += `<path class="cis-stamp" data-part="cardStamp" d="${marks.stripe}"/></g>`;
    put("ext", "rec.card", [W.CARD.x + 4.5, W.CARD.y, R.h + 6], csvg, [["slab", { x: W.CARD.x, y: W.CARD.y, w: W.CARD.w, d: W.CARD.d, r: 0.2 }, R.h, W.CARD.h]], { part: "card" });
  }

  // ================================================================== feedthrough connector on the lower front panel, cable to the record unit
  {
    const F = W.FY([W.FEED.x, CH.front, W.FEED.z]);
    let svg = S(G.disc(0, 1.4, 5.6, F, P), { tone: "mid" });
    svg += Dt(G.dotsOf(F, 1.4, 4.4, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.4 });
    put("ext", "feed.flange", [W.FEED.x, CH.front + 0.7, W.FEED.z], svg, [["disc", F, 0, 1.4, 5.6]]);
    let body = S(G.disc(1.4, 3, 3.4, F, P), { tone: "mid" });
    const nut = G.disc(3, 6, 4, F, P);
    const ribs = G.ribsOf(F, 3, 6, 4, 16, P, { fade: [0.1, 0.55] });
    body += S(nut, { tone: "mid", inner: k.fadedSvg(ribs, { tone: "lo" }) });
    body += S(G.disc(6, 8.4, 2.4, F, P), { tone: "mid" });
    put("ext", "feed.nut", [W.FEED.x, CH.front + 5, W.FEED.z], body, [["disc", F, 1.4, 3, 3.4], ["disc", F, 3, 6, 4], ["disc", F, 6, 8.4, 2.4]]);
    // cable: out of the strain relief, down into the gland
    const start = [W.FEED.x, CH.front + 8.4, W.FEED.z];
    const route = G.fillet([start, [W.FEED.x, W.REC.y + 4.5, W.FEED.z], [W.FEED.x, W.REC.y + 4.5, W.REC.h + 3]], 3.2, 9, { P, tube: 0.9 });
    const pieces = tubePieces(route, 0.9, P, { maxLength: 40 });
    pieces.forEach((piece, i) => put("ext", `feed.cable:${i}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [["tube", piece.points, piece.radii, { limp: true }]], { route: "feed.cable", chunk: i }));
    items.routes = items.routes || [];
    items.routes.push({ name: "feed.cable", points: route, r: 0.9, limp: true });
  }

  // ================================================================== chamber shell, top cap, seams, screws
  {
    const F = W.FX([CH.x0, 0, 0]);
    const shell = G.prismOf(F, W.PROFILE, 0, CH.x1 - CH.x0, P);
    // seams: the lower panel's top edge runs round the front and right; a band near the base
    const seam = (z) => k.pathOf([at([CH.x0, CH.front, z]), at([CH.x1, CH.front, z]), at([CH.x1, CH.back, z])]);
    const inner = Ln(seam(CH.base + 4), { tone: "faint" });
    let svg = S(shell, { tone: "mid", inner });
    // screws along the lower panel and up the right wall's edges
    const pts = [];
    for (let x = CH.x0 + 6; x <= CH.x1 - 5; x += 12) pts.push(at([x, CH.front, CH.low - 3]));
    for (let y = CH.back + 5; y <= CH.front - 5; y += 10) pts.push(at([CH.x1, y, CH.base + 7.5]));
    svg += Dt(pts, { size: 0.42 });
    put("ext", "ch.shell", [(CH.x0 + CH.x1) / 2, (CH.back + CH.front) / 2, 50], svg, [["prism", F, W.PROFILE, 0, CH.x1 - CH.x0]], { key: -4000 });
    // top cap slab with two lifting eyes
    const cap = { x: CH.x0 - 1.5, y: CH.back - 1.5, w: CH.x1 - CH.x0 + 3, d: CH.slopeTop - CH.back + 2.6, r: 1.5 };
    let csvg = S(k.slabOf(cap, CH.top, 3, P, 3, 0.6), { tone: "mid" });
    put("ext", "ch.cap", [(CH.x0 + CH.x1) / 2, (CH.back + CH.slopeTop) / 2, CH.top + 1.5], csvg, [["slab", cap, CH.top, 3]], { key: -3990 });
    // luminaire along the front edge of the top: housing, louvre slots, end caps
    const lum = { x: CH.x0 + 8, y: -15, w: CH.x1 - CH.x0 - 16, d: 11, r: 1.5 };
    const z1 = CH.top + 3;
    let lsvg = S(k.slabOf(lum, z1, 5, P, 3, 0.5), { tone: "mid", inner: Ln(k.sideSeam(lum, z1 + 1.6, P, 3), { tone: "faint" }) });
    let slots = "";
    for (let x = lum.x + 9; x <= lum.x + lum.w - 12; x += 8) slots += k.planOutline({ x, y: lum.y + 2.6, w: 3, d: lum.d - 5.2, r: 0 }, z1 + 5, P, 1);
    lsvg += Ln(slots, { tone: "lo" });
    for (const x of [lum.x - 1, lum.x + lum.w - 2]) lsvg += S(k.slabOf({ x, y: lum.y - 1, w: 3, d: lum.d + 2, r: 0.6 }, z1, 6, P, 2, 0.3), { tone: "mid" });
    put("ext", "ch.lamp", [lum.x + lum.w / 2, lum.y + lum.d / 2, z1 + 2.5], lsvg, [["slab", lum, z1, 5], ["slab", { x: lum.x - 1, y: lum.y - 1, w: 3, d: lum.d + 2, r: 0.6 }, z1, 6], ["slab", { x: lum.x + lum.w - 2, y: lum.y - 1, w: 3, d: lum.d + 2, r: 0.6 }, z1, 6]]);
    // the circulation filter on the roof's return port: base flange with bolts, canister with its band seam, cap and vent stub
    const [fx, fy] = [-46, -31];
    let f = S(k.cylinder(fx, fy, 7.6, z1, 1.2, P, 16), { tone: "mid" });
    f += Dt(G.dotsOf(W.FZ([fx, fy, 0]), z1 + 1.2, 6.8, 8, P, { all: true, phase: 0.2 }), { size: 0.42 });
    f += S(k.cylinder(fx, fy, 6, z1 + 1.2, 13, P, 16), { tone: "mid", crease: "none", inner: Ln(k.sideArc(fx, fy, 6, z1 + 10.6, P, 16), { tone: "faint" }) });
    f += S(k.cylinder(fx, fy, 1.4, z1 + 14.2, 2, P, 10), { tone: "mid" });
    put("ext", "ch.filter", [fx, fy, z1 + 8], f, [["cyl", fx, fy, 7.6, z1, 1.2], ["cyl", fx, fy, 6, z1 + 1.2, 13], ["cyl", fx, fy, 1.4, z1 + 14.2, 2]]);
  }

  // ================================================================== window: glass, frame bars, bolts
  {
    const { x0, x1, w0, w1 } = W.WIN;
    const b = W.FRAME.band;
    const t = W.FRAME.t;
    // glass: drawn over the interior; faint tint and two reflection streaks that end on the frame's inner edge
    const quad = [W.face(x0, w0, 0.2), W.face(x1, w0, 0.2), W.face(x1, w1, 0.2), W.face(x0, w1, 0.2)].map(at);
    let gsvg = `<path class="cis-glass" d="${k.pathOf(quad, true)}"/>`;
    const FG = G.frameOf(W.face(x0, w0, 0), [1, 0, 0], W.U, W.N);
    put("ext", "win.glass", W.face((x0 + x1) / 2, (w0 + w1) / 2, 0.2), gsvg, [["prism", FG, [[0, 0], [w1 - w0, 0], [w1 - w0, 0.4], [0, 0.4]], 0, x1 - x0]], { key: -3900 });
    // frame bars: bottom and top run along x, the sides run up the slope
    const bars = [];
    const along = (wA, len, x) => G.frameOf(W.face(x, wA, 0), [1, 0, 0], W.U, W.N);
    const up = (x) => G.frameOf(W.face(x, w0 - b, 0), W.U, [1, 0, 0], W.N);
    bars.push({ name: "win.bottom", F: along(w0 - b, 0, x0 - b), poly: [[0, 0], [b, 0], [b, t], [0, t]], s: [0, x1 - x0 + 2 * b] });
    bars.push({ name: "win.top", F: along(w1, 0, x0 - b), poly: [[0, 0], [b, 0], [b, t], [0, t]], s: [0, x1 - x0 + 2 * b] });
    bars.push({ name: "win.left", F: up(x0 - b), poly: [[0, 0], [b, 0], [b, t], [0, t]], s: [b, w1 - w0 + b] });
    bars.push({ name: "win.right", F: up(x1), poly: [[0, 0], [b, 0], [b, t], [0, t]], s: [b, w1 - w0 + b] });
    // bolts on each bar's face: along the bottom and top, and up the sides
    const bolts = { "win.bottom": [], "win.top": [], "win.left": [], "win.right": [] };
    for (let x = x0 + 2; x <= x1 - 1; x += 9.6) bolts["win.bottom"].push(at(W.face(x, w0 - b / 2, t))), bolts["win.top"].push(at(W.face(x, w1 + b / 2, t)));
    for (let w = w0 + 4; w <= w1 - 3; w += 9.4) bolts["win.left"].push(at(W.face(x0 - b / 2, w, t))), bolts["win.right"].push(at(W.face(x1 + b / 2, w, t)));
    for (const bar of bars) {
      const paths = G.prismOf(bar.F, bar.poly, bar.s[0], bar.s[1], P);
      const mid = G.pointOf(bar.F, (bar.s[0] + bar.s[1]) / 2, 0, 0);
      put("ext", bar.name, mid, S(paths, { tone: "mid" }) + Dt(bolts[bar.name], { size: 0.45, tone: "mid" }), [["prism", bar.F, bar.poly, bar.s[0], bar.s[1]]], { key: -3800 });
    }
  }

  // ================================================================== glove ports on the window: port ring, clamp ring, the glove's dark cuff
  for (const port of W.PORTS) {
    const F = W.FN(port.x, port.w, 0);
    let svg = S(G.ringBand(0, 2.2, port.rIn, port.rOut, F, P), { tone: "mid" });
    svg += S(G.ringBand(2.2, 3.6, port.rIn + 0.6, port.clamp, F, P), { tone: "mid" });
    svg += Dt(G.dotsOf(F, 3.6, (port.rIn + 0.6 + port.clamp) / 2, 6, P, { all: true, phase: 0.3 }), { size: 0.42 });
    // the glove's rolled cuff, seen inside the port: a dark opening with the cuff's rim
    svg += `<path style="fill:var(--anatomy-shade-0)" d="${G.circleOf(F, 3.6, port.rIn + 0.6, P)}"/>`;
    svg += Ln(G.circleOf(F, 1.2, port.rIn - 1.4, P), { tone: "lo" });
    // clamp screw lug at the bottom of the clamp ring
    const lugF = G.frameOf(G.pointOf(F, 2.9, port.clamp + 1.2, -Math.PI / 2), G.mul3(W.U, -1), [1, 0, 0], W.N);
    svg += S(G.disc(-1.2, 1.4, 1.2, lugF, P, { steps: 14 }), { tone: "mid" });
    put("ext", `port${port.x}`, W.face(port.x, port.w, 2), svg, [["ring", F, 0, 2.2, port.rIn, port.rOut], ["ring", F, 2.2, 3.6, port.rIn + 0.6, port.clamp], ["disc", lugF, -1.2, 1.4, 1.2]], { key: -3600 });
  }

  // ================================================================== antechamber: flanges, body pieces, bands, cradles
  {
    const F = W.FA;
    const L = AX.x1 - AX.x0;
    const bandS = W.BANDS.map((x) => x - AX.x0);
    put("ext", "ac.flangeWall", [AX.x0 + 1.5, AX.y, AX.z], S(G.disc(0, 3, AX.flange, F, P), { tone: "mid", inner: Dt(G.dotsOf(F, 3, AX.flange - 2, 12, P, { all: true, phase: 0.26 }), { size: 0.42 }) }), [["disc", F, 0, 3, AX.flange]]);
    const cuts = [3, bandS[0] - 1, bandS[0] + 1, bandS[1] - 1, bandS[1] + 1, L - 3];
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const s0 = cuts[i];
      const s1 = cuts[i + 1];
      put("ext", `ac.body${i / 2}`, G.pointOf(F, (s0 + s1) / 2, 0, 0), S(G.disc(s0, s1, AX.r, F, P, { rims: "none" }), { tone: "mid" }), [["disc", F, s0, s1, AX.r]]);
    }
    bandS.forEach((s, i) => {
      put("ext", `ac.band${i}`, G.pointOf(F, s, 0, 0), S(G.ringBand(s - 1, s + 1, AX.r - 0.01, AX.r + 1.2, F, P), { tone: "mid" }), [["ring", F, s - 1, s + 1, AX.r - 0.01, AX.r + 1.2]]);
    });
    put("ext", "ac.flangeEnd", [AX.x1 - 1.5, AX.y, AX.z], S(G.disc(L - 3, L, AX.flange, F, P), { tone: "mid" }), [["disc", F, L - 3, L, AX.flange]]);
    // the open mouth: dark bore, its inner arc and the inner tray, seen only when the door swings away
    let mouth = `<path class="cis-void" d="${G.circleOf(F, L + 0.05, AX.bore, P)}"/>`;
    mouth += Ln(G.arcOf(F, L - 9, AX.bore, P, { inward: true }), { tone: "faint" });
    mouth += Ln(G.ringBand(L, L + 0.05, AX.bore, AX.flange - 0.2, F, P).outline, { tone: "lo" });
    mouth += Dt(G.dotsOf(F, L + 0.05, AX.flange - 2.4, 12, P, { all: true, phase: 0.26 }), { size: 0.42 });
    put("ext", "ac.mouth", [AX.x1 + 0.1, AX.y, AX.z], mouth, [["disc", F, L, L + 0.05, AX.flange - 0.2]], { key: null, after: "ac.flangeEnd" });
    // cradles under the bands: a foot, a column, a saddle block whose top meets the band
    W.BANDS.forEach((x, i) => {
      const top = AX.z - AX.r - 1.2;
      const foot = { x: x - 7, y: AX.y - 10, w: 14, d: 20, r: 1.5 };
      const col = { x: x - 2.5, y: AX.y - 6, w: 5, d: 12, r: 0.8 };
      const block = { x: x - 4, y: AX.y - 9, w: 8, d: 18, r: 1 };
      let svg = S(k.slabOf(foot, 0, 2, P, 3, 0.4), { tone: "mid" });
      svg += Dt([at([foot.x + 2, foot.y + 2, 2]), at([foot.x + foot.w - 2, foot.y + foot.d - 2, 2]), at([foot.x + 2, foot.y + foot.d - 2, 2]), at([foot.x + foot.w - 2, foot.y + 2, 2])], { size: 0.42 });
      svg += S(k.slabOf(col, 2, top - 4 - 2, P, 2), { tone: "mid" });
      svg += S(k.slabOf(block, top - 4, 4, P, 2, 0.4), { tone: "mid" });
      put("ext", `ac.cradle${i}`, [x, AX.y, top / 2], svg, [["slab", foot, 0, 2], ["slab", col, 2, top - 6], ["slab", block, top - 4, 4]]);
    });
  }

  // ================================================================== valves on the antechamber: saddle pad, bulged body, stem, blank-off outlet
  for (const valve of W.VALVES) {
    const F = W.FZ([valve.x, AX.y, AX.z]);
    const pad = G.saddleOf(F, 3.6, AX.r, AX.r + 2.4, P);
    const body = G.solidOf(VALVE_BODY, F, P, { steps: 20 });
    const stem = G.disc(AX.r + 9.4, AX.r + 13.2, 1.1, F, P, { steps: 12 });
    let svg = S(pad, { tone: "mid" }) + S(body, { tone: "mid" }) + S(stem, { tone: "mid" });
    put("ext", `valve.${valve.name}`, [valve.x, AX.y, AX.z + AX.r + 5], svg, [["disc", F, AX.r - 0.6, AX.r + 2.4, 3.6, { seated: true, on: "ac.body1" }], ["solid", F, VALVE_BODY], ["disc", F, AX.r + 9.4, AX.r + 13.2, 1.1]]);
    // outlet stub toward the front, closed by a KF blank with a clamp ring
    const O = W.FY([valve.x, AX.y + 4, AX.z + AX.r + 6]);
    let out = S(G.disc(0, 2.6, 1.6, O, P, { steps: 12 }), { tone: "mid" });
    out += S(G.disc(2.6, 4, 2.8, O, P, { steps: 18 }), { tone: "mid" });
    put("ext", `valve.${valve.name}.out`, [valve.x, AX.y + 6, AX.z + AX.r + 6], out, [["disc", O, 0, 2.6, 1.6], ["disc", O, 2.6, 4, 2.8]]);
    // lever (live)
    const lv = W.leverPaths(valve.x, 0);
    const lsvg = W.fixedSolid(lv.bar, { tone: "mid", part: `lever.${valve.name}.bar` }) + W.fixedSolid(lv.grip, { tone: "mid", part: `lever.${valve.name}.grip` });
    const top = AX.z + AX.r + 13.2;
    put("ext", `lever.${valve.name}`, [valve.x, AX.y, top + 1], lsvg, [["prism", W.leverFrame(valve.x, 0), W.LEVER.bar, 0, 1.2], ["prism", W.leverFrame(valve.x, 0), W.LEVER.grip, 1.2, 2.2]], { part: `lever.${valve.name}` });
  }

  // ================================================================== antechamber gauge on the front: pad, stem, case, bezel, face, ticks, needle
  {
    const F = W.GAUGE_F;
    const pad = G.saddleOf(G.frameOf([W.GAUGE.x, AX.y, AX.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 2.6, AX.r, AX.r + 1.6, P);
    const PF = G.frameOf([W.GAUGE.x, AX.y, AX.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    let svg = S(pad, { tone: "mid" });
    svg += S(G.disc(1.6, 4, 1.5, F, P), { tone: "mid" });
    svg += S(G.disc(4, 8.4, W.GAUGE.r, F, P), { tone: "mid" });
    svg += S(G.ringBand(8.4, W.GAUGE_FACE + 0.6, W.GAUGE.r - 1.2, W.GAUGE.r, F, P), { tone: "mid" });
    svg += `<path class="cis-dial" d="${G.circleOf(F, W.GAUGE_FACE, W.GAUGE.r - 1.2, P)}"/>`;
    // ticks: 240° arc, 12 divisions, every 3rd long; zero mark hi
    const ticks = [];
    const major = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI / 2 - (-120 + 20 * i) * (Math.PI / 180);
      const r1 = W.GAUGE.r - 1.25;
      const r0 = r1 - (i % 3 === 0 ? 1.5 : 0.8);
      const seg = k.pathOf([at(G.pointOf(F, W.GAUGE_FACE, r0, a)), at(G.pointOf(F, W.GAUGE_FACE, r1, a))]);
      (i % 3 === 0 ? major : ticks).push(seg);
    }
    svg += Ln(ticks.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" });
    svg += `<path class="iso-line" data-tone="lit" data-free="start" data-part="needle" style="stroke-width:.9" d="${W.needlePath(0)}"/>`;
    svg += Dt([at(G.pointOf(F, W.GAUGE_FACE + 0.2, 0, 0))], { size: 0.7, tone: "hi" });
    put("ext", "gauge", [W.GAUGE.x, AX.y + AX.r + 6, AX.z], svg, [["disc", PF, AX.r - 0.5, AX.r + 1.6, 2.6, { seated: true, on: "ac.body1" }], ["disc", F, 1.6, 4, 1.5], ["disc", F, 4, 8.4, W.GAUGE.r], ["ring", F, 8.4, W.GAUGE_FACE + 0.6, W.GAUGE.r - 1.2, W.GAUGE.r]]);
  }

  // ================================================================== interlock: the inner door's handwheel on the wall, its sleeve, the rod, lugs on the bands
  {
    const LB = W.LOCKBAR;
    const F = W.IWF;
    const dir = [0, (LB.y - AX.y) / W.LOCK_R, (LB.z - AX.z) / W.LOCK_R];
    const lugPoly = [[-1.2, -1.6], [1.2, -1.6], [1.2, 1.6], [-1.2, 1.6]];
    // band0's lug carries the sleeve, band1's guides the rod
    W.BANDS.forEach((x, i) => {
      const LF = G.frameOf([x, AX.y + dir[1] * (AX.r + 1.2), AX.z + dir[2] * (AX.r + 1.2)], dir, [1, 0, 0], G.cross3(dir, [1, 0, 0]));
      const len = W.LOCK_R - AX.r - 1.2 - (i ? LB.r : W.IW.sleeve[2]);
      put("ext", `lock.lug${i}`, G.pointOf(LF, len / 2, 0, 0), S(G.prismOf(LF, lugPoly, -0.3, len, P), { tone: "mid" }), [["prism", LF, lugPoly, -0.3, len, { seated: true, on: `ac.band${i}` }]]);
    });
    // the inner door's handwheel: gland nut on the chamber wall, shaft, three spokes (live), hub, rim, and the sleeve it turns
    const [g0, g1, gr] = W.IW.gland;
    const [a0, a1, ar] = W.IW.shaft;
    const [h0, h1, hr] = W.IW.hub;
    const [r0, r1, ri, ro] = W.IW.rim;
    const [v0, v1, vr] = W.IW.sleeve;
    let svg = S(G.disc(g0, g1, gr, F, P, { steps: 6 }), { tone: "mid" });
    svg += S(G.disc(a0, a1, ar, F, P), { tone: "mid" });
    svg += W.innerSpokes(0).map((p, i) => W.fixedSolid(p, { tone: "mid", part: `iw.spoke${i}` })).join("");
    svg += S(G.disc(h0, h1, hr, F, P), { tone: "mid" });
    svg += `<g class="cis-ring">${S(G.ringBand(r0, r1, ri, ro, F, P, { hole: [r1, ri] }), { tone: "mid" })}</g>`;
    svg += S(G.disc(v0, v1, vr, F, P), { tone: "mid" });
    const spokes = [0, 1, 2].map((i) => ["prism", W.spokeFrame(F, W.innerTurn(0) + (i * 2 * Math.PI) / 3 + Math.PI / 2), W.spokePoly(W.IW.spoke), W.IW.spoke[0], W.IW.spoke[1]]);
    put("ext", "lock.wheel", G.pointOf(F, 5, 0, 0), svg, [["disc", F, g0, g1, gr], ["disc", F, a0, a1, ar], ["disc", F, h0, h1, hr], ["ring", F, r0, r1, ri, ro], ["disc", F, v0, v1, vr], ...spokes]);
    // the rod, screwed out of the sleeve's end (live: it grows toward the keeper on the outer door)
    put("ext", "lock.rod", G.pointOf(F, (W.ROD.from + W.ROD.to) / 2, 0, 0), W.fixedSolid(W.rodPaths(0), { tone: "mid", part: "rodSolid" }), [["disc", F, W.ROD.from, W.ROD.to, LB.r]]);
  }

  // ================================================================== door hinge: two arms off the end flange carry the pin; the door's own knuckle turns on it between them
  {
    const [hx, hy] = W.DOOR.hinge;
    let svg = "";
    const shapes = [];
    for (const [z0, z1] of [[AX.z - 11, AX.z - 6.5], [AX.z + 6.5, AX.z + 11]]) {
      // each arm ends on the flange rim where it comes nearest the axis, sunk no more than 0.35
      const near = Math.min(Math.abs(z0 - AX.z), Math.abs(z1 - AX.z));
      const yEnd = AX.y - Math.sqrt(AX.flange * AX.flange - near * near) + 0.35;
      const arm = { x: AX.x1 - 2.6, y: hy - 1.2, w: 2.6, d: yEnd - hy + 1.2, r: 0.4 };
      svg += S(k.slabOf(arm, z0, z1 - z0, P, 2), { tone: "mid" });
      shapes.push(["slab", arm, z0, z1 - z0]);
      svg += S(k.cylinder(hx, hy, 1.7, z0, z1 - z0, P, 10), { tone: "mid" });
      shapes.push(["cyl", hx, hy, 1.7, z0, z1 - z0]);
    }
    // the door's knuckle (round about the pin, so it looks the same at every angle) and the pin's caps
    svg += S(k.cylinder(hx, hy, 1.7, AX.z - 6.5, 13, P, 10), { tone: "mid" });
    shapes.push(["cyl", hx, hy, 1.7, AX.z - 6.5, 13]);
    for (const z of [AX.z - 12, AX.z + 11]) {
      svg += S(k.cylinder(hx, hy, 1, z, 1, P, 8), { tone: "mid" });
      shapes.push(["cyl", hx, hy, 1, z, 1]);
    }
    put("ext", "door.hinge", [hx, hy, AX.z], svg, shapes);
  }

  // ================================================================== outer door (live: swings on the hinge, the handwheel turns)
  {
    const d = W.doorParts(0, 0);
    let svg = W.fixedSolid(d.leaf, { tone: "mid", part: "door.leaf" });
    svg += W.fixedSolid(d.plate, { tone: "mid", part: "door.plate" });
    svg += `<path class="cis-faint" data-part="door.gasket" d=""/>`;
    for (const name of W.DOOR_PARTS.slice(2)) svg += W.fixedSolid(d[name], { tone: "mid", part: `door.${name}` });
    put("ext", "door", [AX.x1 + 3, AX.y, AX.z], svg, [["disc", d.F, 0, W.DOOR.t, W.DOOR.r]], { part: "door" });
  }

  // ================================================================== transfer table outside the door, and the cartridge waiting on it
  {
    const T = W.TRAY;
    const SL = W.SLIDE;
    const [px, py] = W.POST;
    const head = { x: px - 4, y: py - 4, w: 8, d: 8, r: 1 };
    let svg = S(k.cylinder(px, py, 5, 0, 1.6, P, 24), { tone: "mid" });
    svg += S(k.cylinder(px, py, 2.2, 1.6, SL.z - 2.4 - 1.6, P, 12), { tone: "mid", crease: "none" });
    svg += S(k.slabOf(head, SL.z - 2.4, 2.4, P, 2), { tone: "mid" });
    put("ext", "tray.post", [px, py, 10], svg, [["cyl", px, py, 5, 0, 1.6], ["cyl", px, py, 2.2, 1.6, SL.z - 4], ["slab", head, SL.z - 2.4, 2.4]]);
    // the slide's base plate, two rails and their end stops
    const top = SL.z + SL.t;
    let bsvg = S(k.slabOf(SL, SL.z, SL.t, P, 3, 0.4), { tone: "mid" });
    const bshapes = [["slab", SL, SL.z, SL.t]];
    for (const x of W.RAILS_X) {
      const rail = { x, y: SL.y + 2, w: SL.railW, d: SL.d - 4, r: 0 };
      bsvg += S(k.slabOf(rail, top, SL.railH, P, 2), { tone: "mid" });
      bshapes.push(["slab", rail, top, SL.railH]);
      for (const y of [SL.y + 0.6, SL.y + SL.d - 2]) {
        const stop = { x: x - 0.4, y, w: SL.railW + 0.8, d: 1.4, r: 0 };
        bsvg += S(k.slabOf(stop, top, SL.railH + 1, P, 2), { tone: "mid" });
        bshapes.push(["slab", stop, top, SL.railH + 1]);
      }
    }
    bsvg += Dt([SL.x + 1.6, SL.x + SL.w - 1.6].flatMap((x) => [at([x, SL.y + 1.2, top]), at([x, SL.y + SL.d - 1.2, top])]), { size: 0.45, tone: "mid" });
    put("ext", "tray.base", [px, py, SL.z], bsvg, bshapes);
    // the moving tray: a carriage block on each rail, the plate and its guide lips
    const cz = top + SL.railH;
    let tsvg = "";
    const tshapes = [];
    for (const x of W.RAILS_X) {
      const block = { x: x - 0.8, y: T.y + 2, w: SL.railW + 1.6, d: T.d - 4, r: 0 };
      tsvg += S(k.slabOf(block, cz, T.z - cz, P, 2), { tone: "mid" });
      tshapes.push(["slab", block, cz, T.z - cz]);
    }
    tsvg += S(k.slabOf(T, T.z, T.top - T.z, P, 3, 0.4), { tone: "mid" });
    tshapes.push(["slab", T, T.z, T.top - T.z]);
    // guide lips along the tray's long edges, for the run in along the bore
    const lips = [T.y + 0.6, T.y + T.d - 1.8].map((y) => ({ x: T.x + 1.5, y, w: T.w - 1.5, d: 1.2, r: 0 }));
    for (const lip of lips) tsvg += S(k.slabOf(lip, T.top, 1.4, P, 2), { tone: "mid" }), tshapes.push(["slab", lip, T.top, 1.4]);
    put("ext", "tray", [T.x + T.w / 2, T.y + T.d / 2, T.top], tsvg, tshapes, { part: "tray" });
    // exterior cartridge copy, clipped to what is outside the mouth (or seen through it)
    const F = W.FA;
    const L = AX.x1 - AX.x0;
    const ring = (s) => Array.from({ length: 48 }, (_, j) => at(G.pointOf(F, s, AX.bore, (j / 48) * Math.PI * 2)));
    // what the outside copy may show: the bore swept out past the mouth, and the slide across the table
    const across = [];
    for (const x of [T.x + 4, T.x + T.w - 4]) for (const y of [AX.y - W.CART.d / 2 - 1, T.y + T.d + 1]) for (const z of [T.top - 0.5, T.top + W.CART.h + 2]) across.push(at([x, y, z]));
    const csvg = `<clipPath id="cis-mouthclip"><path d="${k.pathOf(G.hullOf([...ring(L), ...ring(L + 80)]), true)}"/><path d="${k.pathOf(G.hullOf(across), true)}"/></clipPath><g clip-path="url(#cis-mouthclip)"><g data-part="cartExt" transform="${k.translateAlong(P, [W.STATION.tray, W.TABLE_DY, 0])}">${LITCART}</g></g>`;
    put("ext", "cart.ext", [W.STATION.tray, AX.y + W.TABLE_DY, T.top + 4], csvg, W.cartridgeParts().map((p) => p.shape), { part: "cartExt", move: [W.STATION.tray, W.TABLE_DY, 0] });
  }

  // ================================================================== bubbler on the right wall: plate, U-tube, oil, clips, inlet elbow, vent cap
  {
    const B = W.BUB;
    const plate = { x: B.x, y: B.plate.y, w: 1.4, d: B.plate.d, r: 0.4 };
    let svg = S(k.slabOf(plate, B.plate.z0, B.plate.z1 - B.plate.z0, P, 2), { tone: "mid" });
    svg += Dt([[B.plate.y + 1.6, B.plate.z0 + 2], [B.plate.y + B.plate.d - 1.6, B.plate.z0 + 2], [B.plate.y + 1.6, B.plate.z1 - 2], [B.plate.y + B.plate.d - 1.6, B.plate.z1 - 2]].map(([y, z]) => at([B.x + 1.4, y, z])), { size: 0.42 });
    put("ext", "bub.plate", [B.x + 0.7, B.plate.y + B.plate.d / 2, 60], svg, [["slab", plate, B.plate.z0, B.plate.z1 - B.plate.z0]]);
    // oil (live) inside the glass legs
    const oil = W.oilPaths(0);
    let osvg = W.fixedSolid(oil.a, { tone: "lo", crease: "none", part: "oil.a", cls: "cis-oil" }) + W.fixedSolid(oil.b, { tone: "lo", crease: "none", part: "oil.b", cls: "cis-oil" });
    // U-bend full of oil, a tube
    const bend = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      bend.push([B.legX, (B.legs[0] + B.legs[1]) / 2 + Math.cos(a) * B.bend, B.z0 + Math.sin(a) * B.bend]);
    }
    const bendRoute = [[B.legX, B.legs[0], B.z0 + 0.4], ...bend, [B.legX, B.legs[1], B.z0 + 0.4]];
    const bp = tubePieces(bendRoute, B.r, P, { maxLength: 60 });
    osvg += `<g class="cis-oilbend">${bp.map((p) => tubeSvg(p, { tone: "mid" })).join("")}</g>`;
    osvg += `<g class="iso-dots cis-bubbles" data-part="bubbles"></g>`;
    put("ext", "bub.oil", [B.legX, (B.legs[0] + B.legs[1]) / 2, B.z0 + 6], osvg, [["tube", bp[0].points, bp[0].radii], ["cyl", B.legX, B.legs[0], B.r - 0.55, B.z0, oil.zIn - B.z0], ["cyl", B.legX, B.legs[1], B.r - 0.55, B.z0, oil.zOut - B.z0]], { part: "oil" });
    // glass legs: outline only, with a highlight
    let gl = "";
    for (const y of B.legs) {
      const c = k.cylinder(B.legX, y, B.r, B.z0, B.z1 - B.z0, P, 18);
      gl += `<g class="iso-solid cis-tube"><path class="cis-glassfill" d="${c.fill}"/><path class="iso-line iso-edge" data-tone="mid" d="${c.outline}"/></g>`;
      gl += Ln(k.pathOf([at([B.legX + 0.6, y - 1.1, B.z0 + 1]), at([B.legX + 0.6, y - 1.1, B.z1 - 1])]), { tone: "faint", className: "cis-streak" });
    }
    put("ext", "bub.glass", [B.legX, (B.legs[0] + B.legs[1]) / 2, (B.z0 + B.z1) / 2], gl, B.legs.map((y) => ["cyl", B.legX, y, B.r, B.z0, B.z1 - B.z0]));
    // clips across both legs
    // clips: blocks from the plate to the back of the legs, each leg resting in its groove
    for (const z of [B.z0 + 4, B.z1 - 6]) {
      const clipPlan = { x: B.x + 1.4, y: B.legs[0] - 2.4, w: B.legX - B.r - B.x - 1.4, d: B.legs[1] - B.legs[0] + 4.8, r: 0.5 };
      put("ext", `bub.clip${z}`, [B.legX, (B.legs[0] + B.legs[1]) / 2, z], S(k.slabOf(clipPlan, z, 2.2, P, 2, 0.3), { tone: "mid" }), [["slab", clipPlan, z, 2.2]]);
    }
    // vent cap on the outlet leg, inlet elbow from the wall
    let cap = S(k.cylinder(B.legX, B.legs[1], B.r + 0.5, B.z1, 2.4, P, 18), { tone: "mid" });
    cap += S(k.cylinder(B.legX, B.legs[1], 0.9, B.z1 + 2.4, 1.6, P, 12), { tone: "mid" });
    put("ext", "bub.vent", [B.legX, B.legs[1], B.z1 + 2], cap, [["cyl", B.legX, B.legs[1], B.r + 0.5, B.z1, 2.4], ["cyl", B.legX, B.legs[1], 0.9, B.z1 + 2.4, 1.6]]);
    let col = S(k.cylinder(B.legX, B.legs[0], B.r + 0.5, B.z1, 2.4, P, 18), { tone: "mid" });
    put("ext", "bub.collar", [B.legX, B.legs[0], B.z1 + 1.2], col, [["cyl", B.legX, B.legs[0], B.r + 0.5, B.z1, 2.4]]);
    const wallF = W.FX([B.x + 1.4, B.legs[0], B.inletZ]);
    let fit = S(G.disc(0, 1.6, 2.8, wallF, P), { tone: "mid" });
    put("ext", "bub.fitting", [B.x + 2.2, B.legs[0], B.inletZ], fit, [["disc", wallF, 0, 1.6, 2.8]]);
    const inlet = G.fillet([[B.x + 3, B.legs[0], B.inletZ], [B.legX, B.legs[0], B.inletZ], [B.legX, B.legs[0], B.z1 + 2.4]], 2.6, 9, { P, tube: 1.2 });
    const ip = tubePieces(inlet, 1.2, P, { maxLength: 40 });
    ip.forEach((piece, i) => put("ext", `bub.inlet:${i}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [["tube", piece.points, piece.radii]], { route: "bub.inlet", chunk: i }));
    items.routes = items.routes || [];
    items.routes.push({ name: "bub.inlet", points: inlet, r: 1.2 });
  }

  // ================================================================== interior: cavity walls (back, left, floor)
  {
    const zTop = 90;
    const back = [at([IN.x0, IN.back, IN.floor]), at([IN.x1, IN.back, IN.floor]), at([IN.x1, IN.back, zTop]), at([IN.x0, IN.back, zTop])];
    const left = [at([IN.x0, IN.back, IN.floor]), at([IN.x0, CH.front - WALLF, IN.floor]), at([IN.x0, CH.front - WALLF, zTop]), at([IN.x0, IN.back, zTop])];
    const floor = [at([IN.x0, IN.back, IN.floor]), at([IN.x1, IN.back, IN.floor]), at([IN.x1, CH.front - WALLF, IN.floor]), at([IN.x0, CH.front - WALLF, IN.floor])];
    let svg = `<path class="cis-cav" data-face="back" d="${k.pathOf(back, true)}"/><path class="cis-cav" data-face="left" d="${k.pathOf(left, true)}"/><path class="cis-cav" data-face="floor" d="${k.pathOf(floor, true)}"/>`;
    svg += Ln(k.pathOf([at([IN.x0, IN.back, IN.floor]), at([IN.x0, IN.back, zTop])]) + k.pathOf([at([IN.x0, IN.back, IN.floor]), at([IN.x1, IN.back, IN.floor])]) + k.pathOf([at([IN.x0, IN.back, IN.floor]), at([IN.x0, CH.front - WALLF, IN.floor])]), { tone: "faint" });
    // panel seams on the back wall, floor to ceiling
    svg += Ln([-40, 4].map((x) => k.pathOf([at([x, IN.back, IN.floor]), at([x, IN.back, zTop])])).join(""), { tone: "faint" });
    put("int", "stand.cavity", [0, IN.back, 0], svg, [["box", [IN.x0 - 1, IN.back - 1, IN.floor - 1], [IN.x1, IN.back, zTop], { ground: true }], ["box", [IN.x0 - 1, IN.back - 1, IN.floor - 1], [IN.x0, CH.front - WALLF, zTop], { ground: true }], ["box", [IN.x0 - 1, IN.back - 1, IN.floor - 1], [IN.x1, CH.front - WALLF, IN.floor], { ground: true }]], { key: -1e4 });
  }

  // ================================================================== shelf on brackets, the locked compartment, the verifier boards in their rack
  {
    const sh = { x: IN.x0, y: IN.back, w: IN.x1 - IN.x0, d: W.SHELF.d, r: 0.5 };
    put("int", "shelf", [0, IN.back + W.SHELF.d / 2, W.SHELF.top], S(k.slabOf(sh, W.SHELF.z, W.SHELF.top - W.SHELF.z, P, 2, 0.4), { tone: "mid" }), [["slab", sh, W.SHELF.z, W.SHELF.top - W.SHELF.z]], { key: -9000 });
    for (const x of [-62, -22, 24]) {
      const br = { x: x - 1, y: IN.back, w: 2, d: W.SHELF.d - 3, r: 0.3 };
      put("int", `shelf.bracket${x}`, [x, IN.back + 4, W.SHELF.z - 4], S(k.slabOf(br, W.SHELF.z - 7, 7, P, 2), { tone: "mid" }), [["slab", br, W.SHELF.z - 7, 7]], { key: -9500 });
    }
    // locked compartment holding the hidden subset: box, lid line, hasp, key cylinder, status lamp
    const SF = W.SAFE;
    const plan = { x: SF.x, y: SF.y, w: SF.w, d: SF.d, r: 1 };
    const lid = k.sideSeam(plan, SF.z + SF.h - 4, P, 3);
    let svg = S(k.slabOf(plan, SF.z, SF.h, P, 3, 0.6), { tone: "mid", inner: Ln(lid, { tone: "lo" }) });
    svg += Dt([[SF.x + 2, SF.y + 2], [SF.x + SF.w - 2, SF.y + 2], [SF.x + 2, SF.y + SF.d - 2], [SF.x + SF.w - 2, SF.y + SF.d - 2]].map(([x, y]) => at([x, y, SF.z + SF.h])), { size: 0.4 });
    put("int", "safe", [SF.x + SF.w / 2, SF.y + SF.d / 2, SF.z + SF.h / 2], svg, [["slab", plan, SF.z, SF.h]]);
    const front = SF.y + SF.d;
    const hasp = { x: SF.x + SF.w / 2 - 2, y: front, w: 4, d: 1, r: 0.3 };
    const HF = W.FY([SF.x + SF.w / 2, front, SF.z + SF.h - 9]);
    let latch = `<g data-part="hasp">${S(k.slabOf(hasp, SF.z + SF.h - 7, 6, P, 2), { tone: "mid" })}</g>`;
    latch += S(G.disc(0, 1.6, 2.2, HF, P), { tone: "mid" });
    latch += S(G.disc(1.6, 2.4, 1.4, HF, P), { tone: "mid", inner: Ln(k.pathOf([at(G.pointOf(HF, 2.4, 0.9, Math.PI / 2)), at(G.pointOf(HF, 2.4, 0.9, -Math.PI / 2))]), { tone: "lo" }) });
    const LF = W.FY([SF.x + 4, front, SF.z + 4]);
    latch += `<g class="cis-lamp" data-part="safeLamp">${S(G.disc(0, 1.2, 1.3, LF, P), { tone: "mid" })}</g>`;
    put("int", "safe.latch", [SF.x + SF.w / 2, front + 1, SF.z + 8], latch, [["slab", hasp, SF.z + SF.h - 7, 6], ["disc", HF, 0, 1.6, 2.2], ["disc", HF, 1.6, 2.4, 1.4], ["disc", LF, 0, 1.2, 1.3]]);
    // the rack strip along the shelf, with one slot per board
    const boards = W.boardsLayout(D.suites);
    const rack = { x: boards[0].x - 1.5, y: W.BOARD.y - 1.6, w: boards[boards.length - 1].x + boards[boards.length - 1].w - boards[0].x + 3, d: 4.8, r: 0.5 };
    put("int", "rack", [rack.x + rack.w / 2, rack.y + rack.d / 2, W.SHELF.top + 1], S(k.slabOf(rack, W.SHELF.top, 2, P, 2, 0.3), { tone: "mid" }), [["slab", rack, W.SHELF.top, 2]]);
    // boards with their wells
    boards.forEach((b, bi) => {
      const plan = { x: b.x, y: W.BOARD.y, w: b.w, d: W.BOARD.t, r: 0.3 };
      let bsvg = S(k.slabOf(plan, W.BOARD.z0, W.BOARD.h, P, 2, 0.3), { tone: "hi", crease: "lo" });
      // pull tab at the top centre
      const tab = { x: b.x + b.w / 2 - 2.5, y: W.BOARD.y, w: 5, d: W.BOARD.t, r: 0.3 };
      bsvg += S(k.slabOf(tab, W.BOARD.z0 + W.BOARD.h, 1.8, P, 2), { tone: "hi", crease: "lo" });
      // wells: a dark ring and a status disc each
      let wells = "";
      for (let i = 0; i < b.visible; i++) {
        const [sx, sy] = at(W.wellCentre(b, i));
        wells += `<use href="#cis-w" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}"/>`;
      }
      bsvg += `<g class="cis-wells" data-board="${bi}">${wells}</g>`;
      put("int", `board${bi}`, [b.x + b.w / 2, W.BOARD.y + W.BOARD.t / 2, W.BOARD.z0 + 9], bsvg, [["slab", plan, W.BOARD.z0, W.BOARD.h], ["slab", tab, W.BOARD.z0 + W.BOARD.h, 1.8]]);
    });
  }

  // ================================================================== rail with posts, the seat hatch and its chute, lips, end stop, seat clamps; the verifier bridge
  {
    const R = W.RAIL;
    const H = W.HATCH;
    for (const x of [-16, 30]) {
      const post = { x: x - 2, y: AX.y - 2, w: 4, d: 4, r: 0.6 };
      const foot = { x: x - 4, y: AX.y - 4, w: 8, d: 8, r: 1 };
      let svg = S(k.slabOf(foot, IN.floor, 1.4, P, 2), { tone: "mid" }) + S(k.slabOf(post, IN.floor + 1.4, R.z - IN.floor - 1.4, P, 2), { tone: "mid" });
      put("int", `rail.post${x}`, [x, AX.y, 20], svg, [["slab", foot, IN.floor, 1.4], ["slab", post, IN.floor + 1.4, R.z - IN.floor - 1.4]]);
    }
    // the rail, cut round the hatch opening: behind it a back strip and the left core, beside it the right core, in front
    // of it the front bar under the front lip (the pieces meet under the lips and the end stop)
    const slab = (plan) => [S(k.slabOf(plan, R.z, R.top - R.z, P, 2, 0.3), { tone: "mid" }), ["slab", plan, R.z, R.top - R.z]];
    const backStrip = slab({ x: R.x, y: R.y, w: H.x + H.w - R.x, d: 1, r: 0.3 });
    const coreL = slab({ x: R.x, y: H.y, w: H.x - R.x, d: H.d, r: 0 });
    const coreR = slab({ x: H.x + H.w, y: R.y, w: R.x + R.w - H.x - H.w, d: R.d - 1, r: 0 });
    const frontBar = slab({ x: R.x, y: R.y + R.d - 1, w: R.w, d: 1, r: 0.3 });
    put("int", "rail.back", [R.x + 10, R.y + 0.5, R.z + 1], backStrip[0] + coreL[0], [backStrip[1], coreL[1]]);
    put("int", "rail.core", [H.x + H.w + 20, AX.y, R.z + 1], coreR[0], [coreR[1]]);
    put("int", "rail.front", [R.x + R.w / 2, R.y + R.d - 0.5, R.z + 1], frontBar[0], [frontBar[1]]);
    // the chute hung under the opening. Behind the champion: the dark well seen through the opening, its back and left
    // walls (shaded as the well) and the floor it lands on. In front of it: the right and front walls
    const C = W.CHUTE;
    const box = (plan, z0, z1, tone = "mid") => [S(k.slabOf(plan, z0, z1 - z0, P, 2), { tone }), ["slab", plan, z0, z1 - z0]];
    const floor = box({ x: H.x - 1, y: R.y, w: H.w + 2, d: R.d, r: 0.4 }, C.floor, C.z0);
    const backWall = box({ x: H.x, y: R.y, w: H.w, d: 1, r: 0 }, C.z0, R.z, "lo");
    const leftWall = box({ x: H.x - 1, y: R.y, w: 1, d: R.d - 1, r: 0 }, C.z0, R.z, "lo");
    const right = box({ x: H.x + H.w, y: R.y, w: 1, d: R.d - 1, r: 0 }, C.z0, R.z);
    const front = box({ x: H.x - 1, y: R.y + R.d - 1, w: H.w + 2, d: 1, r: 0 }, C.z0, R.z);
    put("int", "rail.chuteBack", [H.x + H.w / 2, R.y, 25], `<path class="cis-void" d="${W.holePath()}"/>${floor[0]}<g class="cis-well">${backWall[0]}${leftWall[0]}</g>`, [floor[1], backWall[1], leftWall[1]]);
    put("int", "rail.chuteFront", [H.x + H.w / 2, R.y + R.d - 0.5, 25], right[0] + front[0], [right[1], front[1]]);
    // the hatch leaf (live: drops open on its back hinge), seen only through the opening
    const leaf = `<clipPath id="cis-holeclip"><path d="${W.holePath()}"/></clipPath><g clip-path="url(#cis-holeclip)">${W.fixedSolid(W.leafPaths(0), { tone: "mid", part: "leafSolid" })}</g>`;
    put("int", "rail.leaf", [H.x + H.w / 2, H.y + H.d / 2, R.top - 0.4], leaf, [["prism", W.leafFrame(0), W.LEAF_POLY, 0, H.w - 0.2]]);
    // guide lips along both edges; the back one in two lengths that meet where the right core starts, since the sinking
    // champion passes in front of the one behind the opening and behind the core under the other
    const lip = (name, x0, x1, y) => {
      const plan = { x: x0, y, w: x1 - x0, d: 1, r: 0.2 };
      put("int", name, [(x0 + x1) / 2, y + 0.5, R.top + 0.7], S(k.slabOf(plan, R.top, 1.4, P, 2), { tone: "mid" }), [["slab", plan, R.top, 1.4]]);
    };
    lip("rail.lipBack", R.x + 3, H.x + H.w, R.y);
    lip("rail.lipBackR", H.x + H.w, R.x + R.w, R.y);
    lip("rail.lipFront", R.x + 3, R.x + R.w, R.y + R.d - 1);
    const stop = { x: R.x, y: R.y, w: 3, d: R.d - 1, r: 0.5 };
    put("int", "rail.stop", [R.x + 1.5, AX.y, R.top + 2.5], S(k.slabOf(stop, R.top, 5, P, 2, 0.3), { tone: "mid" }) + Dt([at([R.x + 1.5, R.y + 2, R.top + 5]), at([R.x + 1.5, R.y + R.d - 2, R.top + 5])], { size: 0.4 }), [["slab", stop, R.top, 5]]);
    // the verifier bridge over the challenger seat
    const B = W.BRIDGE;
    const posts = [R.y - 2.6, R.y + R.d].map((y) => ({ x: B.x, y, w: B.w, d: 2.6, r: 0.4 }));
    // the posts stand either side of the rail, so each is its own item: one is behind the rail, one in front
    posts.forEach((p, i) => put("int", `bridge.post${i}`, [B.x + B.w / 2, p.y + 1.3, (R.z + B.z) / 2], S(k.slabOf(p, R.z, B.z - R.z, P, 2), { tone: "mid" }), [["slab", p, R.z, B.z - R.z]]));
    const bar = { x: B.x, y: R.y - 2.6, w: B.w, d: R.d + 5.2, r: 0.6 };
    put("int", "bridge", [B.x + B.w / 2, AX.y, B.z], S(k.slabOf(bar, B.z, B.top - B.z, P, 2, 0.4), { tone: "mid" }), [["slab", bar, B.z, B.top - B.z]]);
    const lampC = [B.x + B.w / 2, AX.y, B.top];
    let lamp = S(k.cylinder(lampC[0], lampC[1], 2.2, B.top, 1, P, 18), { tone: "mid" });
    lamp += `<g class="cis-lamp" data-part="gateLamp">${S(k.cylinder(lampC[0], lampC[1], 1.6, B.top + 1, 1.6, P, 18), { tone: "mid" })}</g>`;
    put("int", "bridge.lamp", [lampC[0], lampC[1], B.top + 1.5], lamp, [["cyl", lampC[0], lampC[1], 2.2, B.top, 1], ["cyl", lampC[0], lampC[1], 1.6, B.top + 1, 1.6]]);
    // seat clamps either side of the champion seat
    for (const y of [AX.y - W.CART.d / 2 - 1.6, AX.y + W.CART.d / 2]) {
      const cl = { x: W.SEAT.champion - 1.5, y, w: 3, d: 1.6, r: 0.3 };
      put("int", `seat.clamp${y}`, [W.SEAT.champion, y + 0.8, R.top + 2], S(k.slabOf(cl, R.top + 1.4, 2.4, P, 2), { tone: "mid" }), [["slab", cl, R.top + 1.4, 2.4]]);
    }
  }

  // ================================================================== cartridges: the champion in its seat, the challenger seen inside
  {
    const R = W.RAIL;
    const champClip = k.slabOf({ x: W.SEAT.champion - 9.4, y: AX.y - 4.4, w: 17.2, d: 8.8, r: 0 }, R.top, 40, P, 2).fill;
    let svg = `<clipPath id="cis-seatclip"><path d="${champClip}"/><path d="${W.holePath()}"/></clipPath><g clip-path="url(#cis-seatclip)"><g data-part="champ" transform="${k.translateAlong(P, [W.SEAT.champion, 0, 0])}"><g id="cis-cart">${W.cartridgeSvg({ lit: false })}</g></g></g>`;
    put("int", "cart.champ", [W.SEAT.champion, AX.y, R.top + 3.5], svg, W.cartridgeParts().map((p) => p.shape), { part: "champ", move: [W.SEAT.champion, 0, 0] });
    const csvg = `<g data-part="cartInt" transform="${k.translateAlong(P, [W.STATION.ante, 0, 0])}">${LITCART}</g>`;
    put("int", "cart.int", [W.SEAT.challenger, AX.y, R.top + 3.5], csvg, W.cartridgeParts().map((p) => p.shape), { part: "cartInt", move: [W.SEAT.challenger, 0, 0] });
  }

  // ================================================================== inside the window: the ports' inner rings and the gloves hanging from them
  for (const port of W.PORTS) {
    const F = W.FN(port.x, port.w, 0);
    // the port's inner ring, closed by the glove's cuff clamped over it
    put("int", `port.in${port.x}`, W.face(port.x, port.w, -1.5), "", [["disc", F, -3, 0, port.rOut, { ground: true }]], { key: 1e4, mount: true });
    const c = W.face(port.x, port.w, -3);
    const a = G.add3(c, G.mul3(W.N, -7));
    const route = G.fillet([c, a, [port.x, 10, 15]], 12, 9, { P, tube: 6 });
    const pieces = tubePieces(route, (t) => 7.1 - 1.2 * t, P, { maxLength: 80, rings: { pitch: 2.6, fade: [0.1, 0.55], tone: "lo" }, caps: [false, false] });
    pieces.forEach((piece, i) => put("int", `glove${port.x}:${i}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [["tube", piece.points, piece.radii, { limp: true }]], { route: `glove${port.x}`, chunk: i, key: 2e4 + i }));
    items.routes = items.routes || [];
    items.routes.push({ name: `glove${port.x}`, points: route, r: 7.1, limp: true, layer: "int" });
  }

  return items;
}
const WALLF = W.WALL;
// the challenger is the champion's cartridge drawn lit: one definition (in the champion's seat), two lit uses
const LITCART = `<use href="#cis-cart" class="cis-lit" data-lit/>`;
const VALVE_BODY = [[AX.r + 2.4, 3.2], [AX.r + 3.6, 3.2], [AX.r + 4.6, 4.4], [AX.r + 7.4, 4.4], [AX.r + 8.4, 3.2], [AX.r + 9.4, 3.2]];
