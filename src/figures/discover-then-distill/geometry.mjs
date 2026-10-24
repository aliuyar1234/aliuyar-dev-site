// Fig 18 · static geometry of the fractional still. Every drawn item records its true shape for the audit.
// Pure ESM: imported by art.mjs at build time and by build.mjs for previews and the audit.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import * as W from "./rig.mjs";
import { HEAT_FROM, MODE_FROM } from "./view.mjs";

const { P, at, along } = W;
const KS = G.scaleOf(P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const TV = [...k.towardViewer(P), 0];
const V3 = G.viewOf(P);
const ACROSS = [-TV[1], TV[0], 0];
const UP = [0, 0, 1];
const vert = (x, y) => G.frameOf([x, y, 0], UP, [1, 0, 0], [0, 1, 0]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const fx = (n) => Math.round(n * 10) / 10;
const tvA = Math.atan2(TV[1], TV[0]);
const GLASS = { tone: "mid", className: "dtd-glass" };

// glass contents are clipped to the glass they sit in
const clipped = (outline, inner, id) => `<clipPath id="${id}"><path d="${outline}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;

export function build() {
  const R = A.recorder(P);
  const back = [];
  const routes = [];
  const put = (name, ref, svg, shapes = [], { bias = 0 } = {}) => R.put({ name, at: ref, bias, svg, shapes: shapes.map((s) => R.solid({ ...s, name: s.name ?? name })) });
  const stepsOf = (r) => Math.max(10, Math.min(36, Math.ceil((2 * Math.PI * r * KS) / 10)));

  const turned = (name, F, profile, style = {}, extra = "", meta = {}) => {
    const paths = G.solidOf(profile, F, P, { steps: stepsOf(Math.max(...profile.map(([, r]) => r))) });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style }) + extra, [A.solid(F, profile, meta)]);
    return paths;
  };
  const discAt = (name, F, s0, s1, r, style = {}, extra = "", meta = {}) => {
    const paths = G.disc(s0, s1, r, F, P, { steps: stepsOf(r) });
    put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(paths, { tone: "mid", ...(r < 2.2 ? { crease: "none" } : {}), ...style }) + extra, [A.disc(F, s0, s1, r, meta)], { bias: style.bias ?? 0 });
    return paths;
  };
  const slab = (name, plan, z, h, style = {}, extra = "", meta = {}) => {
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, style.steps ?? 3, style.bevel ?? 0.4), { tone: "mid", ...style }) + extra, [A.slab(plan, z, h, meta, style.steps ?? 3)], { bias: style.bias ?? 0 });
  };
  const cyl = (name, cx, cy, r, z, h, style = {}, extra = "", meta = {}) => {
    put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, style.steps ?? 28, style.bevel ?? 0), { tone: "mid", ...style }) + extra, [A.cylinder(cx, cy, r, z, h, meta)], { bias: style.bias ?? 0 });
  };
  const prism = (name, F, poly, s0, s1, style = {}, extra = "", meta = {}) => {
    put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style }) + extra, [A.prism(F, poly, s0, s1, meta)]);
  };
  const box = (u, v) => [[-u, -v], [u, -v], [u, v], [-u, v]];
  // a flat bar between two points: w across (in `side`), t thick
  const bar = (name, p0, p1, w, t, side, style = {}, extra = "", meta = {}) => {
    const a = G.unit3(G.sub3(p1, p0));
    const v = G.unit3(side);
    prism(name, G.frameOf(p0, a, G.cross3(v, a), v), box(t / 2, w / 2), 0, G.len3(G.sub3(p1, p0)), style, extra, meta);
  };
  const tube = (name, points, r, { bend = 5, tone = "mid", limp = false, maxLength = 16, rims, rings, owner = name } = {}) => {
    const line = G.fillet(points, bend, 8, { P, tube: r });
    R.route(name, line, r, { owner, limp, rims });
    tubePieces(line, r, P, { maxLength, spacing: 2.6, rings }).forEach((piece, index) =>
      R.put({ name: `${name}:${index}`, at: piece.mid, svg: tubeSvg(piece, { tone }), route: name, chunk: index, shapes: [A.tube(piece.points, piece.radii, { name: `${name}:${index}`, owner, limp })] }),
    );
    routes.push({ name, line, r });
    return line;
  };
  // a highlight on the glass, faded out at both ends along its chord
  let glints = 0;
  const glint = (points) => {
    const pts = points.map(at);
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const id = `dtd-g${glints++}`;
    return `<linearGradient id="${id}" class="dtd-gl" gradientUnits="userSpaceOnUse" x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}"><stop offset="0" stop-opacity="0"/><stop offset=".3"/><stop offset=".7"/><stop offset="1" stop-opacity="0"/></linearGradient><path class="iso-line dtd-glint" data-free="" d="${k.pathOf(pts)}" style="stroke:url(#${id})"/>`;
  };
  // a glint down the lit flank of a vertical body of radius r
  const flank = (x, r, z0, z1, turn = 1.0) => glint([z0, z1].map((z) => [x + (r - 0.4) * Math.cos(tvA + turn), (r - 0.4) * Math.sin(tvA + turn), z]));

  // ------------------------------------------------------------ bench (unsorted back layer)
  const B = W.BENCH;
  back.push(`<path class="iso-halo" d="${k.haloOf(B, -W.BENCH_H - W.FOOT_H, W.BENCH_H, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(B, 11)).slice(1)) back.push(S(k.cylinder(x, y, 6.4, -W.BENCH_H - W.FOOT_H, W.FOOT_H, P, 20), { tone: "lo" }));
  back.push(S(k.slabOf(B, -W.BENCH_H, W.BENCH_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(B, -W.BENCH_H + 4, P, 8), { tone: "faint" }) }));
  R.solid(A.slab(B, -W.BENCH_H, W.BENCH_H, { name: "stand.bench" }, 8));
  back.push(Ln(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(B, 10);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge, label plate at its right end
  const strip = { x: W.CTRL.x + W.CTRL.w + 6, y: B.y + B.d - 12.5, w: 58, d: 6, r: 1 };
  back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 3.5, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Dots([at([strip.x + 1.6, strip.y + 3, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3, 0.6])], { size: 0.4 }));
  const label = { x: strip.x + strip.w + 7, y: B.y + B.d - 16, w: 40, d: 10.5, r: 1.5 };
  back.push(S(k.slabOf(label, 0, 0.9, P, 3), { tone: "mid" }));
  back.push(Ln(k.planOutline(k.insetPlan(label, 1.4), 0.9, P), { tone: "faint" }));
  back.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 7.3], 0.9, P, "x"), "AU-18", { size: 4.2, tone: "lo" }));
  back.push(Ln([0, 1, 2].map((row) => k.onTop([[label.x + 21, label.y + 3 + row * 2.25], [label.x + (row === 1 ? 33 : 36), label.y + 3 + row * 2.25]], 0.9, P)).join(""), { tone: "lo", free: true }));
  back.push(Dots([at([label.x + 2.2, label.y + label.d / 2, 0.9]), at([label.x + label.w - 2.2, label.y + label.d / 2, 0.9])], { size: 0.4 }));

  // ------------------------------------------------------------ retort stand
  const ST = W.STAND;
  back.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(ST, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  slab("stand.base", ST, 0, W.STAND_H, { steps: 6, bevel: 0.9 },
    Ln(k.planOutline(k.insetPlan(ST, 3), W.STAND_H, P, 6), { tone: "faint" }) + Dots(k.corners(ST, 5).map(([x, y]) => at([x, y, W.STAND_H])), { size: 0.45 }));
  const [rx, ry] = W.ROD;
  cyl("stand.boss", rx, ry, 4.4, W.STAND_H, 4, { bevel: 0.5 });
  // a rod drawn in pieces between the boss heads it passes through, so each piece sorts against its bosses
  const rodPieces = (name, x, y, r, z0, z1, bosses) => {
    const cuts = [z0, ...bosses.flatMap((z) => [z - 4.5, z + 4.5]).sort((a, b) => a - b), z1];
    for (let i = 0; i < cuts.length; i += 2) if (cuts[i + 1] - cuts[i] > 0.05) cyl(`${name}.${i / 2}`, x, y, r, cuts[i], cuts[i + 1] - cuts[i], { crease: "none", steps: 16 });
  };
  const NECK_Z = 56;
  const HEAD_Z = (W.ROWS[9] + W.ROWS[10]) / 2; // the upper clamp holds the column between two rows
  const COIL_Z = W.PIVOT[2];
  rodPieces("stand.rod", rx, ry, W.ROD_R, W.STAND_H + 4, W.ROD_TOP, [NECK_Z, HEAD_Z, COIL_Z]);
  cyl("stand.cap", rx, ry, 2.7, W.ROD_TOP, 1.6, { bevel: 0.3 });

  // boss head + arm along armAxis, at height z, ending at `end` along the arm
  const bossHead = (name, x, y, z, end, armAxis = [1, 0, 0]) => {
    const plan = { x: x - 3.6, y: y - 3.6, w: 7.2, d: 7.2, r: 1 };
    slab(`${name}.boss`, plan, z - 4.5, 9, { bevel: 0.4 }, Ln(k.planOutline(k.insetPlan(plan, 1.2), z + 4.5, P, 3), { tone: "faint" }));
    // thumbscrew on the face toward the viewer's left, pressing the rod
    const face = armAxis[1] ? [1, 0, 0] : [0, 1, 0];
    const TF = G.frameAlong([x + face[0] * 3.6, y + face[1] * 3.6, z + 1.6], face);
    turned(`${name}.screw`, TF, [[0, 0.9], [1.2, 0.9], [1.2, 1.9], [3.4, 1.9]], {}, k.fadedSvg(G.ribsOf(TF, 1.2, 3.4, 1.9, 9, P, { fade: [0.1, 0.55], seams: "first" }), { tone: "lo" }));
    const AF = G.frameAlong([x, y, z], armAxis);
    discAt(`${name}.arm`, AF, 3.6, end, 1.25, { crease: "none" });
    return AF;
  };

  // three-finger clamp: crosshead behind the glass, two fingers on +X and one on -X that run past the glass
  // and bend in to press its sides; a knurled jaw screw on the +X end. Glass of radius rg at d along the arm.
  const FR = 0.75; // vinyl-coated finger wire
  const clamp = (name, AF, d, rg, X, glass) => {
    const Wd = G.unit3(G.cross3(AF.a, X)); // the glass axis
    const L = rg + 3.4; // finger offset from the glass axis
    const hw = L + FR + 0.7;
    const f0 = d - rg - 2.4; // crosshead front face
    const XF = G.frameOf(G.add3(AF.o, G.mul3(AF.a, f0 - 2.2)), AF.a, X, Wd);
    prism(`${name}.cross`, XF, box(hw, 2.9), 0, 2.2, {}, Dots([G.pointOf(XF, 2.2, 0, 0)].map(at), { size: 0.4 }));
    const p = (s, x, w) => G.add3(G.add3(G.add3(AF.o, G.mul3(AF.a, s)), G.mul3(X, x)), G.mul3(Wd, w));
    [[1, 1.5], [1, -1.5], [-1, 0]].forEach(([side, w], i) =>
      tube(`${name}.finger${i}`, [p(f0, side * L, w), p(d, side * L, w), p(d, side * rg, w)], FR, { bend: 1.8, tone: "lo", maxLength: 10, owner: `${name}.finger${i}` }));
    // jaw screw on the +X end of the crosshead
    const JF = G.frameAlong(p(f0 - 1.1, hw, 0), X);
    turned(`${name}.jaw`, JF, [[0, 0.7], [1.0, 0.7], [1.0, 1.7], [2.6, 1.7]], {}, k.fadedSvg(G.ribsOf(JF, 1.0, 2.6, 1.7, 9, P, { fade: [0.1, 0.55], seams: "first" }), { tone: "lo" }));
    return glass;
  };

  // ------------------------------------------------------------ heating mantle, split round the flask
  const MF = vert(W.GX, 0);
  const mantle = k.cylinder(W.GX, 0, W.MANTLE.r, W.MANTLE.z0, W.MANTLE.z1 - W.MANTLE.z0, P, 36, 1.0);
  const rimL = at([W.GX + W.MANTLE.r * Math.cos(tvA + Math.PI / 2), W.MANTLE.r * Math.sin(tvA + Math.PI / 2), W.MANTLE.z1]);
  const rimR = at([W.GX + W.MANTLE.r * Math.cos(tvA - Math.PI / 2), W.MANTLE.r * Math.sin(tvA - Math.PI / 2), W.MANTLE.z1]);
  const opening = k.ring(W.GX, 0, W.OPENING, W.MANTLE.z1, P, 36);
  const ventSlots = [];
  for (let i = -3; i <= 3; i++) {
    const a = tvA + i * 0.19;
    ventSlots.push(k.pathOf([[10, -0.025], [10, 0.025], [26, 0.025], [26, -0.025]].map(([z, da]) => at([W.GX + W.MANTLE.r * Math.cos(a + da), W.MANTLE.r * Math.sin(a + da), z])), true));
  }
  // the front lip: everything below the rim's centre line except the front half of the opening
  const frontHalf = (inner) => {
    const arc = Array.from({ length: 25 }, (_, i) => {
      const a = tvA + Math.PI / 2 - (Math.PI * i) / 24;
      return at([W.GX + W.OPENING * Math.cos(a), W.OPENING * Math.sin(a), W.MANTLE.z1]);
    });
    const lip = [[rimL[0] - 60, rimL[1]], ...arc, [rimR[0] + 60, rimR[1]], [rimR[0] + 60, rimR[1] + 200], [rimL[0] - 60, rimL[1] + 200]];
    return `<clipPath id="dtd-lip"><path d="${k.pathOf(lip, true)}"/></clipPath><g clip-path="url(#dtd-lip)">${inner}</g>`;
  };
  const mantleShape = (half) => {
    const cut = A.orientedBox([W.GX + TV[0] * 30 * half, TV[1] * 30 * half, 15], [TV, ACROSS, UP], [30, 40, 30]);
    return A.ring(MF, W.MANTLE.z0, W.MANTLE.z1, W.OPENING, W.MANTLE.r, { cut });
  };
  put("mantle.back", [W.GX, 0, 12], S(mantle, { tone: "mid" }) + `<path class="dtd-void" d="${opening}"/>` + Ln(opening, { tone: "lo" }), [mantleShape(1)]);
  const mantleFront =
    S(mantle, { tone: "mid", inner: Ln(k.sideArc(W.GX, 0, W.MANTLE.r, W.MANTLE.z0 + 3, P, 36), { tone: "faint" }) }) +
    ventSlots.map((d) => Ln(d, { tone: "lo" })).join("") +
    Ln(k.sideArc(W.GX, 0, W.OPENING, W.MANTLE.z1, P, 36), { tone: "lo" });
  put("mantle.front", [W.GX + TV[0] * 10, TV[1] * 10, 12], frontHalf(mantleFront), [mantleShape(-1)]);

  // ------------------------------------------------------------ boiling flask with its charge
  const FC = [W.GX, 0, W.FLASK_C];
  const zNeck = W.FLASK_C + Math.sqrt(W.FLASK_R ** 2 - W.NECK_R ** 2);
  const ball = G.sphereOf(FC, W.FLASK_R, P, { steps: 36 });
  const neck = G.disc(zNeck, W.NECK_TOP, W.NECK_R, MF, P, { steps: stepsOf(W.NECK_R) });
  const rIn = W.FLASK_R - 0.8;
  const capR = (z) => Math.sqrt(Math.max(0, rIn ** 2 - (z - W.FLASK_C) ** 2));
  const z0 = W.FLASK_C - rIn + 0.05;
  const liquidPaths = G.solidOf([0, 0.35, 0.7, 1].map((u) => { const z = z0 + (W.LIQUID - z0) * (1 - Math.cos((u * Math.PI) / 2)); return [z, capR(z)]; }), MF, P, { steps: 32 });
  const liquid = { ...liquidPaths, shades: ["", "", "", ""], crease: "" };
  const bubbles = Array.from({ length: 8 }, (_, i) => `<circle data-ref="b${i}" class="dtd-bubble" r="1" cx="0" cy="0" opacity="0"/>`).join("");
  const flaskSvg = S(ball, GLASS) + clipped(ball.outline, S(liquid, { tone: "lo", className: "dtd-liq" }) + bubbles, "dtd-flask") + S(neck, GLASS);
  const gl = Array.from({ length: 11 }, (_, i) => {
    const t = -0.55 + i * 0.09;
    const a = tvA + Math.PI / 2 - 0.55;
    return [W.GX + (W.FLASK_R - 0.6) * Math.cos(a) * Math.cos(t), (W.FLASK_R - 0.6) * Math.sin(a) * Math.cos(t), W.FLASK_C + (W.FLASK_R - 0.6) * Math.sin(t) + 3];
  });
  put("flask", [W.GX, 0, W.FLASK_C + 4], flaskSvg + glint(gl), [A.ball(FC, W.FLASK_R, { owner: "flask" }), A.disc(MF, zNeck, W.NECK_TOP, W.NECK_R, { owner: "flask" })]);

  // a Keck clip: a thin plastic plate tangent to a ground joint of radius r, from s0 to s1 along F
  const keck = (name, F, s0, s1, r, angle) => {
    const u = G.radialOf(F, angle);
    const KF = G.frameOf(F.o, F.a, u, G.cross3(F.a, u));
    prism(name, KF, [[r, -1.7], [r + 0.9, -1.7], [r + 0.9, 1.7], [r, 1.7]], s0, s1, { tone: "lo" }, Dots([at(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(u, r + 0.9)))], { size: 0.4 }));
  };

  // ------------------------------------------------------------ Vigreux column (the per-task adapter)
  const C = W.COLUMN;
  put("column.socket", [W.GX, 0, (W.NECK_TOP + C.z0) / 2], S(G.disc(W.NECK_TOP, C.z0, 7, MF, P, { steps: stepsOf(7) }), { tone: "mid", className: "dtd-ground" }), [A.disc(MF, W.NECK_TOP, C.z0, 7)]);
  keck("column.keck", MF, W.NECK_TOP - 0.2, C.z0 + 0.2, 7, G.angleToward(MF, [1, 0.05, 0]));
  const colTube = G.disc(C.z0, C.z1, C.r, MF, P, { steps: stepsOf(C.r) });
  // indentations: three dimples per row, rows turned 60° from each other
  const dimples = [];
  W.ROWS.forEach((z, row) => {
    for (let j = 0; j < 3; j++) {
      const a = (j * 2 * Math.PI) / 3 + (row % 2) * (Math.PI / 3) + 0.25;
      const facing = Math.cos(a - tvA);
      if (facing < 0.05) continue;
      const pts = Array.from({ length: 10 }, (_, q) => {
        const t = (q / 10) * Math.PI * 2;
        return [W.GX + (C.r - 0.05) * Math.cos(a + Math.cos(t) * 0.24), (C.r - 0.05) * Math.sin(a + Math.cos(t) * 0.24), z + Math.sin(t) * 1.3];
      });
      dimples.push({ d: k.pathOf(pts.map(at), true), alpha: G.fadeOf(facing, [0.05, 0.5]) });
    }
  });
  put("column", [W.GX, 0, (C.z0 + C.z1) / 2],
    S(colTube, GLASS) + clipped(colTube.outline, `<g data-ref="vapour" class="dtd-vapour"></g>`, "dtd-col") + k.fadedSvg(dimples, { tone: "lo" }) + flank(W.GX, C.r, C.z0 + 3, C.z1 - 3),
    [A.disc(MF, C.z0, C.z1, C.r)]);

  // ------------------------------------------------------------ still head: socket, body, bulb with funnel, neck, thermometer adapter
  const BC = W.BULB.c;
  const [hs0, hs1] = W.HEAD_SOCKET;
  const zBodyTop = BC[2] - Math.sqrt(W.BULB.r ** 2 - C.r ** 2);
  const zNeckBot = BC[2] + Math.sqrt(W.BULB.r ** 2 - W.NECK_R ** 2);
  const zNeckTop = zNeckBot + 3;
  put("head.socket", [W.GX, 0, (hs0 + hs1) / 2], S(G.disc(hs0, hs1, 7, MF, P, { steps: stepsOf(7) }), { tone: "mid", className: "dtd-ground" }), [A.disc(MF, hs0, hs1, 7)]);
  const body = G.disc(hs1, zBodyTop, C.r, MF, P, { steps: stepsOf(C.r) });
  const bulb = G.sphereOf(BC, W.BULB.r, P, { steps: 32 });
  const hneck = G.disc(zNeckBot, zNeckTop, W.NECK_R, MF, P, { steps: stepsOf(W.NECK_R) });
  // inside: the thermometer's lower stem and bulb, the funnel (rebuilt live) on its pin, the drip
  const stemIn = G.disc(144.5, 160, 1.0, MF, P, { steps: 12 });
  const mercBulb = G.sphereOf([W.GX, 0, 143.2], 1.6, P, { steps: 16 });
  const headInner =
    S(stemIn, { tone: "mid", crease: "none", className: "dtd-stem" }) + `<path class="dtd-mbulb" d="${mercBulb.outline}"/>` +
    `<g data-ref="funnel" class="iso-solid dtd-funnel"></g>` + Dots([at(W.PIVOT)], { size: 0.55, tone: "hi" }) +
    `<circle data-ref="drip" class="dtd-drip" cx="0" cy="0" r="0.9" opacity="0"/>`;
  const bulbGl = Array.from({ length: 9 }, (_, i) => {
    const t = -0.5 + i * 0.12;
    const a = tvA + Math.PI / 2 - 0.6;
    return [BC[0] + (W.BULB.r - 0.5) * Math.cos(a) * Math.cos(t), (W.BULB.r - 0.5) * Math.sin(a) * Math.cos(t), BC[2] + (W.BULB.r - 0.5) * Math.sin(t) + 1.5];
  });
  put("head", [W.GX, 0, BC[2]],
    S(body, GLASS) + S(bulb, GLASS) + S(hneck, GLASS) + clipped(bulb.outline + hneck.outline, headInner, "dtd-bulb") + glint(bulbGl),
    [A.disc(MF, hs1, zBodyTop, C.r, { owner: "head" }), A.ball(BC, W.BULB.r, { owner: "head" }), A.disc(MF, zNeckBot, zNeckTop, W.NECK_R, { owner: "head" })]);
  put("head.thread", [W.GX, 0, zNeckTop + 2], S(G.disc(zNeckTop, zNeckTop + 4, 5.4, MF, P, { steps: stepsOf(5.4) }), { tone: "mid", className: "dtd-ground" }), [A.disc(MF, zNeckTop, zNeckTop + 4, 5.4)]);
  const capZ = zNeckTop + 4;
  put("head.cap", [W.GX, 0, capZ + 2.5], S(G.disc(capZ, capZ + 5, 6.4, MF, P, { steps: stepsOf(6.4) }), { tone: "mid", inner: Ln(k.sideArc(W.GX, 0, 6.4, capZ + 1.4, P, 40), { tone: "faint" }) }) + Ln(k.knurl(W.GX, 0, 6.4, capZ + 1.4, capZ + 5, 22, P), { tone: "lo" }) + Ln(k.ring(W.GX, 0, 4.4, capZ + 5, P, 32), { tone: "faint" }), [A.disc(MF, capZ, capZ + 5, 6.4)]);
  put("head.seal", [W.GX, 0, capZ + 6], S(G.disc(capZ + 5, W.THERMO.z0, 2.8, MF, P, { steps: stepsOf(2.8) }), { tone: "lo" }), [A.disc(MF, capZ + 5, W.THERMO.z0, 2.8)]);

  // ------------------------------------------------------------ thermometer above the adapter: stem, scale, mercury, cut collar
  const T = W.THERMO;
  const left = tvA + Math.PI / 2; // the limb on the left of the screen
  const tickArc = (z, span) => k.pathOf(Array.from({ length: 7 }, (_, i) => { const a = left - 0.1 - (span * i) / 6; return at([W.GX + T.r * Math.cos(a), T.r * Math.sin(a), z]); }));
  const minor = [];
  const major = [];
  for (let i = 0; i <= 20; i++) {
    const z = T.scale0 + (i / 20) * (T.scale1 - T.scale0);
    (i % 5 ? minor : major).push([z, tickArc(z, i % 5 ? 0.9 : Math.PI / 2 - 0.1)]); // minors end on the scale rule, majors on the capillary
  }
  const zc = W.CUT;
  const stemPiece = (name, z0, z1, ref) => {
    const scale = (list) => list.filter(([z]) => z > z0 + 0.4 && z < z1 - 0.4).map(([, d]) => d).join("");
    const onStem = (a) => k.pathOf([z0, z1].map((z) => at([W.GX + T.r * Math.cos(a), T.r * Math.sin(a), z])));
    const lo = scale(minor);
    const hi = scale(major);
    const rule = Ln(onStem(left - 1.0) + onStem(tvA), { tone: "faint" }); // scale rule and the empty capillary
    put(name, [W.GX, 0, (z0 + z1) / 2], S(G.disc(z0, z1, T.r, MF, P, { steps: stepsOf(T.r) }), { ...GLASS, crease: "none", inner: rule + (lo ? Ln(lo, { tone: "lo" }) : "") + (hi ? Ln(hi, { tone: "mid" }) : "") }) + `<path data-ref="${ref}" class="dtd-mercury" d=""/>`, [A.disc(MF, z0, z1, T.r)]);
  };
  stemPiece("thermo", T.z0, zc - 0.8, "mercury");
  stemPiece("thermo.upper", zc + 0.8, T.z1, "mercury2");
  put("thermo.top", [W.GX, 0, T.z1 + 1], S(G.disc(T.z1, T.z1 + 2, 2.4, MF, P, { steps: stepsOf(2.4) }), { tone: "mid" }), [A.disc(MF, T.z1, T.z1 + 2, 2.4)]);
  put("thermo.cut", [W.GX, 0, zc], S(G.disc(zc - 0.8, zc + 0.8, 2.8, MF, P, { steps: stepsOf(2.8) }), { tone: "hi" }) + Dots([at([W.GX + 2.8 * TV[0], 2.8 * TV[1], zc])], { size: 0.4, tone: "mid" }), [A.disc(MF, zc - 0.8, zc + 0.8, 2.8)]);

  // ------------------------------------------------------------ take-off arm, condenser, adapter
  const AFr = G.frameAlong(BC, W.ARM_DIR);
  const D = W.COND;
  discAt("arm", AFr, Math.sqrt(W.BULB.r ** 2 - 3 ** 2), 20, 3, GLASS, "", { owner: "head" });
  discAt("cond.socket", AFr, 20, 27, 4.4, { className: "dtd-ground" });
  discAt("cond.inlet", AFr, 27, D.j0 - 2, D.inner, GLASS);
  const jacket = [[D.j0 - 2, D.inner], [D.j0 - 2, D.jacket - 1.2], [D.j0, D.jacket], [D.j1, D.jacket], [D.j1 + 2, D.jacket - 1.2], [D.j1 + 2, D.inner]];
  const jacketPaths = G.solidOf(jacket, AFr, P, { steps: stepsOf(D.jacket) });
  // the inner tube seen through the jacket, and the take-off stream running down its floor
  const side = G.unit3(G.cross3(W.ARM_DIR, V3));
  const innerLines = [1, -1].map((sg) => k.pathOf([D.j0 - 2, D.j1 + 2].map((s) => at(G.add3(along(s), G.mul3(side, sg * D.inner)))))).join("");
  const floor = G.mul3([-W.ARM_DIR[2], 0, W.ARM_DIR[0]], -(D.inner - 0.9)); // toward the low side of the inner tube
  const [sa, sb] = [D.j0 - 1, D.j1 + 1].map((s) => at(G.add3(along(s), floor)));
  const stream = `<linearGradient id="dtd-sg" class="dtd-gl" gradientUnits="userSpaceOnUse" x1="${fx(sa[0])}" y1="${fx(sa[1])}" x2="${fx(sb[0])}" y2="${fx(sb[1])}"><stop offset="0" stop-opacity="0"/><stop offset=".12"/><stop offset=".88"/><stop offset="1" stop-opacity="0"/></linearGradient><g data-ref="stream" opacity="0"><path class="dtd-film" data-free="" d="${k.pathOf([sa, sb])}"/><path data-ref="beads" class="dtd-beads" data-free="" d="${k.pathOf([sa, sb])}"/></g>`;
  put("cond.jacket", along((D.j0 + D.j1) / 2), S(jacketPaths, { ...GLASS, inner: Ln(G.arcOf(AFr, D.j0, D.jacket, P) + G.arcOf(AFr, D.j1, D.jacket, P), { tone: "faint" }) + Ln(innerLines, { tone: "lo" }) + stream }), [A.solid(AFr, jacket)]);
  discAt("cond.outlet", AFr, D.j1 + 2, 90, D.inner, GLASS);
  discAt("adapter.socket", AFr, 90, 97, 4.2, { className: "dtd-ground" });
  keck("cond.keck", AFr, 89.8, 97.2, 4.2, G.angleToward(AFr, G.unit3([V3[0] - 0.4, V3[1], V3[2] + 0.5])));
  // hose barbs on the jacket, pointing back: glass olive with a rubber ferrule
  const barbs = D.barbs.map((s, i) => {
    const F = G.frameAlong(along(s), [0, -1, 0]);
    const s0 = Math.sqrt(D.jacket ** 2 - 1.3 ** 2);
    turned(`cond.barb${i}`, F, [[s0, 1.3], [9, 1.3], [9, 1.9], [10.4, 1.9]], {});
    return G.pointOf(F, 10.4, 0, 0);
  });

  // vacuum adapter: from the condenser joint, bent down to the receiver
  const a97 = along(97);
  const corner = [W.DROP_X, 0, a97[2] - (W.DROP_X - a97[0]) * Math.tan((30 * Math.PI) / 180)];
  const adapterLine = G.fillet([a97, corner, [W.DROP_X, 0, 70]], 6, 16);
  R.route("adapter", adapterLine, 2.6, { owner: "adapter" });
  tubePieces(adapterLine, 2.6, P, { maxLength: 12, spacing: 1.2 }).forEach((piece, index) =>
    R.put({ name: `adapter:${index}`, at: piece.mid, svg: tubeSvg(piece, { tone: "mid" }).replace('class="tb"', 'class="tb dtd-glass"'), route: "adapter", chunk: index, shapes: [A.tube(piece.points, piece.radii, { name: `adapter:${index}` })] }),
  );
  routes.push({ name: "adapter", line: adapterLine, r: 2.6 });
  // vacuum nipple on the bend, pointing +x
  const NF = G.frameAlong(G.pointAlong(adapterLine, G.pathLength(adapterLine) - 5), [1, 0, 0]);
  turned("adapter.nipple", NF, [[Math.sqrt(2.6 ** 2 - 1) , 1], [7, 1], [7, 1.4], [8, 1.4]], GLASS, "", { owner: "adapter" });

  // ------------------------------------------------------------ receiver on the lab jack
  const RF = vert(W.DROP_X, 0);
  const RC = W.RECEIVER;
  const conical = [[RC.base, 0.001], [RC.base, RC.r - 1.2], [RC.base + 1.2, RC.r], [RC.top, RC.neck], [RC.mouth - 7, RC.neck]];
  const recvPaths = G.solidOf(conical, RF, P, { steps: stepsOf(RC.r) });
  const recvInner = `<g data-ref="receiver" class="iso-solid dtd-dist"></g><circle data-ref="drop" class="dtd-drip" cx="0" cy="0" r="1" opacity="0"/>`;
  put("receiver", [W.DROP_X, 0, 40], S(recvPaths, GLASS) + clipped(recvPaths.outline, recvInner, "dtd-recv") +
    glint([[RC.base + 3, RC.r - 2.4], [RC.top - 3, RC.neck + 1.6]].map(([z, r]) => [W.DROP_X + r * Math.cos(tvA + 1.0), r * Math.sin(tvA + 1.0), z])),
    [A.solid(RF, conical)]);
  discAt("receiver.socket", RF, RC.mouth - 7, RC.mouth, 4.6, { className: "dtd-ground" });
  discAt("adapter.cone", RF, RC.mouth, 70, 2.6, GLASS);

  const J = W.JACK;
  const jackTop = { x: J.x, y: J.y, w: J.w, d: J.d, r: 1.5 };
  slab("jack.base", jackTop, 0, 2.6, { bevel: 0.5 }, Dots(k.corners(jackTop, 2.5).map(([x, y]) => at([x, y, 2.6])), { size: 0.4 }));
  slab("jack.top", jackTop, J.top - 2.6, 2.6, { bevel: 0.5 }, Ln(k.planOutline(k.insetPlan(jackTop, 2.2), J.top, P, 3), { tone: "faint" }));
  // scissor links on both sides, crossing at mid height
  const zLo = 2.6 + 1.3 - 0.3; // link edges sit 0.3 into their pivot plates
  const zHi = J.top - 2.6 - 1.3 + 0.3;
  const jack = { owner: "jack" };
  const xm = J.x + J.w / 2;
  const zMid = (zLo + zHi) / 2;
  for (const y of [J.y + 2.4, J.y + J.d - 2.4]) {
    const [xa, xb] = [J.x + 3.5, J.x + J.w - 3.5];
    const sd = y > 0 ? "front" : "back";
    const o = y > 0 ? 0.9 : -0.9;
    bar(`jack.${sd}.a`, [xa, y + o, zLo], [xb, y + o, zHi], 2.6, 1.2, UP, {}, Dots([at([xm, y + o + Math.sign(o) * 0.6, zMid])], { size: 0.5 }), jack);
    bar(`jack.${sd}.b`, [xa, y - o, zHi], [xb, y - o, zLo], 2.6, 1.2, UP, {}, "", jack);
  }
  const XF = G.frameAlong([xm, 0, zMid], [0, 1, 0]);
  const inner = J.d / 2 - 2.4 - 0.9 - 0.6;
  discAt("jack.axle.0", XF, -inner, -2, 0.8, { crease: "none" }, "", jack);
  discAt("jack.axle.1", XF, 2, inner, 0.8, { crease: "none" }, "", jack);
  slab("jack.trunnion", { x: xm - 1.6, y: -2, w: 3.2, d: 4, r: 0.4 }, zMid - 1.6, 3.2, { bevel: 0.3, steps: 2 }, "", jack);
  const LF = G.frameAlong([J.x + J.w, 0, zMid], [1, 0, 0]);
  discAt("jack.screw", LF, -J.w / 2 + 1.6, 4, 1.0, { crease: "none" }, "", jack);
  discAt("jack.knob", LF, 4, 8.5, 3.4, {}, k.fadedSvg(G.ribsOf(LF, 4, 8.5, 3.4, 22, P, { fade: [0.1, 0.55] }), { tone: "lo" }), jack);

  // ------------------------------------------------------------ second stand holding the condenser
  const [r2x, r2y] = W.ROD2;
  const base2 = { x: r2x - 10, y: r2y - 10, w: 20, d: 20, r: 3 };
  slab("stand2.base", base2, 0, 4, { steps: 5, bevel: 0.7 }, Dots(k.corners(base2, 3.5).map(([x, y]) => at([x, y, 4])), { size: 0.4 }));
  const condMid = along(W.S2);
  rodPieces("stand2.rod", r2x, r2y, 1.9, 4, condMid[2] + 8, [condMid[2]]);
  cyl("stand2.cap", r2x, r2y, 2.4, condMid[2] + 8, 1.4, { bevel: 0.3 });

  // ------------------------------------------------------------ clamps and the splitter's electromagnet on the main rod
  const clampArm = (rg) => W.GX - rx - rg - 2.4 - 2.2;
  clamp("clampA", bossHead("clampA", rx, ry, NECK_Z, clampArm(W.NECK_R)), W.GX - rx, W.NECK_R, [0, 1, 0]);
  clamp("clampB", bossHead("clampB", rx, ry, HEAD_Z, clampArm(C.r)), W.GX - rx, C.r, [0, 1, 0]);
  const c30 = Math.cos(Math.PI / 6);
  clamp("clampC", bossHead("clampC", r2x, r2y, condMid[2], -r2y - D.jacket - 2.4 - 2.2, [0, 1, 0]), -r2y, D.jacket, [0.5, 0, c30]);

  // electromagnet beside the bulb: boss head, arm, bobbin with circumferential windings, pole facing the bulb
  const coilEnd = BC[0] - W.BULB.r - 0.9;
  const CF = G.frameAlong([coilEnd - 12, 0, COIL_Z], [1, 0, 0]);
  bossHead("coil", rx, ry, COIL_Z, coilEnd - 12 - rx);
  const coil = [[0, 4.8], [1, 4.8], [1, 4.1], [9, 4.1], [9, 4.8], [10, 4.8], [10, 2.2], [12, 2.2]];
  const windings = Array.from({ length: 9 }, (_, i) => G.arcOf(CF, 1.8 + i * 0.8, 4.1, P)).join("");
  put("coil", [coilEnd - 6, 0, COIL_Z], S(G.solidOf(coil, CF, P, { steps: stepsOf(4.8) }), { tone: "mid", inner: Ln(windings, { tone: "lo" }) }), [A.solid(CF, coil)]);
  const tb = { x: coilEnd - 9, y: -6.6, w: 5, d: 2.8, r: 0.6 };
  slab("coil.terminal", tb, COIL_Z - 1.8, 3.6, { bevel: 0.3 }, Dots([at([tb.x + 1.4, tb.y + 1.4, COIL_Z + 1.8]), at([tb.x + 3.6, tb.y + 1.4, COIL_Z + 1.8])], { size: 0.45 }));

  // ------------------------------------------------------------ controller: heat dial, condition selector, take-off lamp
  const CT = W.CTRL;
  const ctrlPlan = { x: CT.x, y: CT.y, w: CT.w, d: CT.d, r: CT.r };
  const vents = [0, 1, 2, 3].map((i) => {
    const y0 = CT.y + 4 + i * 3.2;
    return k.pathOf([[CT.x + CT.w, y0, 3], [CT.x + CT.w, y0 + 1.4, 3], [CT.x + CT.w, y0 + 1.4, 9.4], [CT.x + CT.w, y0, 9.4]].map(at), true);
  });
  back.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(ctrlPlan, 1.5), 0, 0.1, P)}" style="filter:blur(2.5px)"/>`);
  slab("ctrl", ctrlPlan, 0, CT.h, { steps: 4, bevel: 0.6, inner: Ln(k.sideSeam(ctrlPlan, 2.4, P, 4), { tone: "faint" }) },
    Ln(k.planOutline(k.insetPlan(ctrlPlan, 1.6), CT.h, P, 3), { tone: "faint" }) + vents.map((d) => Ln(d, { tone: "lo" })).join("") +
    Dots(k.corners(ctrlPlan, 3).map(([x, y]) => at([x, y, CT.h])), { size: 0.42 }));
  const [hx, hy] = W.HEAT_KNOB;
  const heatDial = k.radialTicks(hx, hy, 8.2, 16, 4, CT.h + 0.4, [0.9, 1.7], P, HEAT_FROM, 4.4);
  cyl("ctrl.heat.plate", hx, hy, 8.6, CT.h, 0.4, { tone: "lo", steps: 32, flat: true }, Ln(heatDial.minor, { tone: "lo" }) + Ln(heatDial.major, { tone: "mid" }));
  cyl("ctrl.heat", hx, hy, 4.6, CT.h + 0.4, 3.8, { steps: 24 }, Ln(k.knurl(hx, hy, 4.6, CT.h + 0.6, CT.h + 4.2, 30, P), { tone: "lo" }) +
    `<path data-ref="heat" class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([hx, hy], [hx, hy + 3.4], CT.h + 4.2, P)}"/>` + Dots([at([hx, hy, CT.h + 4.2])], { size: 0.45, tone: "hi" }), [], { bias: 0.2 });
  const [mx, my] = W.MODE_KNOB;
  const modeMarks = k.radialTicks(mx, my, 6.6, 2, 1, CT.h + 0.4, [1.6, 1.6], P, MODE_FROM, 1.4);
  cyl("ctrl.mode.plate", mx, my, 7, CT.h, 0.4, { tone: "lo", steps: 24, flat: true }, Ln(modeMarks.major, { tone: "mid" }));
  cyl("ctrl.mode", mx, my, 4, CT.h + 0.4, 3.6, { steps: 22 }, Ln(k.knurl(mx, my, 4, CT.h + 0.6, CT.h + 4, 24, P), { tone: "lo" }) +
    `<path data-ref="mode" class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([mx, my], [mx, my + 3.2], CT.h + 4, P)}"/>`, [], { bias: 0.2 });
  const [lx, ly] = W.LAMP;
  cyl("ctrl.lamp.bezel", lx, ly, 2.6, CT.h, 1.2, { steps: 28 });
  put("ctrl.lamp", [lx, ly, CT.h + 1.8], `<g data-ref="lamp" class="dtd-lamp">${S(k.cylinder(lx, ly, 1.7, CT.h + 1.2, 1.2, P, 24), { tone: "mid" })}</g>`, [A.cylinder(lx, ly, 1.7, CT.h + 1.2, 1.2)], { bias: 0.2 });

  // ------------------------------------------------------------ cooling water: bench fittings and hoses
  const fitting = (i, x, y) => {
    const plan = { x: x - 4, y: y - 3.5, w: 8, d: 7, r: 1.2 };
    slab(`water.block${i}`, plan, 0, 5, { bevel: 0.4 }, Dots([at([plan.x + 1.6, plan.y + 1.6, 5]), at([plan.x + plan.w - 1.6, plan.y + plan.d - 1.6, 5])], { size: 0.4 }));
    turned(`water.nozzle${i}`, vert(x, y), [[5, 1.3], [9, 1.3], [9, 1.9], [10.4, 1.9]], {});
    return [x, y, 10.4];
  };
  const [b0, b1] = barbs;
  tube("hose0", [b0, [b0[0], W.HOSE_Y, b0[2]], fitting(0, b0[0], W.HOSE_Y)], 1.5, { bend: 10, limp: true, maxLength: 22, rims: [1.9, 1.9] });
  const out = fitting(1, ...W.OUTLET);
  tube("hose1", [b1, [b1[0], b1[1] - 6.5, b1[2]], [44, -31, 63], [out[0], out[1], 32], out], 1.5, { bend: 14, limp: true, maxLength: 22, rims: [1.9, 1.9] });

  // ------------------------------------------------------------ cables: mantle to controller; coil down behind the rod, over the stand to the controller
  const grommet = (x, z) => [x, CT.y, z]; // cables enter the back of the case
  const sockA = Math.acos((-54 - W.GX) / W.MANTLE.r);
  const sockDir = [Math.cos(sockA), Math.sin(sockA), 0];
  const sock = G.add3([W.GX, 0, 10], G.mul3(sockDir, W.MANTLE.r - 0.05));
  discAt("mantle.socket", G.frameAlong(sock, sockDir), -0.2, 2.2, 2.1);
  const sockEnd = G.add3(sock, G.mul3(sockDir, 2.2));
  const sockOut = G.add3(sockEnd, G.mul3(sockDir, 1.0));
  tube("cable.mantle", [sockEnd, sockOut, grommet(sockOut[0] - 0.25, 10)], 0.7, { bend: 2, tone: "lo", limp: true, maxLength: 10 });
  const yc = -14; // the coil cable's run behind the bosses; it drops exactly behind the rod on screen
  const xc = rx + yc * (TV[0] / TV[1]);
  const zc0 = W.STAND_H + 1.1;
  tube("cable.coil", [[tb.x + 2.5, tb.y, COIL_Z], [tb.x + 2.5, yc, COIL_Z], [xc, yc, COIL_Z], [xc, yc, zc0], [xc, 12, zc0], [CT.x + 7, CT.y - 3, zc0], grommet(CT.x + 7, zc0)], 0.7, { bend: 3, tone: "lo", limp: true, maxLength: 26 });

  return { R, back, routes };
}
