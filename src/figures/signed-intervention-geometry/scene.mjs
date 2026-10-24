// World layout, camera and the parts that move. Shared by the build (parts.mjs, art.mjs,
// build.mjs) and the page (live.js), so the static drawing and every frame agree.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const W_PX = 600;
export const H_PX = 500;
export const DEG = Math.PI / 180;

// Bench, tripod and table. Units are about a pixel of the real thing; z is up.
export const BENCH = { x: -80, y: -80, w: 160, d: 160, r: 8 };
export const BENCH_H = 12;
export const FOOT_H = 5;
export const R = 60; // table radius
export const TOP = 78; // table top
export const TH = 4; // table thickness
export const FRONT = 45; // floor angle that faces the viewer: the table's 0° mark

// Ring, strings and pin. The ring rests on the table; strings leave its top rim.
export const RING = { rIn: 2.5, rOut: 4.2, z0: TOP + 0.1, z1: TOP + 1.3 };
export const SZ = RING.z1;
// The centre pin rises from a bore in the table; the release knob on the column pulls it
// down until its cap is flush with the top, and the ring is free.
export const PIN = { r: 1.1, tip: TOP + 10, cap: 1.8, capH: 1.6, travel: 11.6 };

// Pulley clamp, in a frame on the rim: rho out from the table centre, tau along the rim.
export const WHEEL = { rho: R + 6, groove: 3.5, flange: 4.2, half: 1.1 };
export const WZ = SZ - WHEEL.groove; // wheel centre height: the groove top carries the string level
export const DROP = WHEEL.rho + WHEEL.groove; // where the string leaves the wheel, going down
export const HOOK = { z: TOP - 17, r: 0.9 }; // hook loop centre with the ring on the pin
export const STEM = 18;
export const MASS = { r: 3.6, h: 1.3 };
export const HANGER_R = 3.4;

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...[0, 60, 120, 180, 240, 300].map((a) => [Math.cos(a * DEG) * (R + 12), Math.sin(a * DEG) * (R + 12), TOP + 2]), [0, 0, PIN.tip + PIN.capH + 2]],
  W_PX,
  H_PX,
  { pad: 22 },
);
export const at = (point) => k.iso(point, P);
export const VIEW = G.viewOf(P);
export const depth = (point) => G.dot3(point, VIEW);
export const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);

// A vertical cylinder whose side facets are merged into one polygon per run of a tone:
// the same picture as k.cylinder, at a fraction of the markup.
export function drum(cx, cy, r, z, h, steps = 24, bevel = 0) {
  const paths = k.cylinder(cx, cy, r, z, h, P, steps, bevel);
  if (h <= 0) return paths;
  const ring = k.circleRing(cx, cy, r, steps);
  const { cosA, sinA } = k.cameraOf(P);
  const n = ring.length;
  const top = ring.map(([x, y]) => at([x, y, z + h]));
  const bot = ring.map(([x, y]) => at([x, y, z]));
  const band = (i) => {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (by - ay) / len;
    const ny = -(bx - ax) / len;
    if (nx * cosA + ny * sinA <= 1e-9) return -1;
    return Math.min(3, Math.max(0, Math.floor(((nx * -sinA + ny * cosA + 1) / 2) * 4)));
  };
  const bands = ring.map((_, i) => band(i));
  let start = bands.findIndex((b, i) => b >= 0 && bands[(i + n - 1) % n] < 0);
  if (start < 0) start = 0;
  const shades = ["", "", "", ""];
  for (let step = 0; step < n; ) {
    const i = (start + step) % n;
    const b = bands[i];
    let j = step;
    while (j + 1 < n && bands[(start + j + 1) % n] === b) j++;
    if (b >= 0) {
      const idx = Array.from({ length: j - step + 2 }, (_, m) => (start + step + m) % n);
      shades[b] += k.pathOf([...idx.map((q) => top[q]), ...idx.reverse().map((q) => bot[q])], true);
    }
    step = j + 1;
  }
  return { ...paths, shades };
}

// A frame standing on the rim at floor angle phi (degrees): u out, v along the rim.
export function rimFrame(phi) {
  const a = phi * DEG;
  return { o: [0, 0, 0], a: [0, 0, 1], u: [Math.cos(a), Math.sin(a), 0], v: [-Math.sin(a), Math.cos(a), 0] };
}
export const onRim = (F, rho, tau, z) => [F.u[0] * rho + F.v[0] * tau, F.u[1] * rho + F.v[1] * tau, z];
export const facingOf = (phi) => Math.cos((phi - FRONT) * DEG); // > 0: the pulley is on the near half

// A rounded rectangle [u0, v0]–[u1, v1] as a polygon, for prisms in any frame.
export function rrect(u0, v0, u1, v1, r = 0.5, count = 2) {
  const out = [];
  for (const [cu, cv, from] of [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]])
    for (let i = 0; i <= count; i++) {
      const a = (from + (90 * i) / count) * DEG;
      out.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
    }
  return out;
}

// One solid with every path slot present, so the page can rewrite it in place.
const SLOTS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "edge"];
export function dynSolid(paths, { tone = "mid", lit = false, crease = "faint", inner = null } = {}) {
  const d = (key) => (key === "fill" ? paths.fill : key === "top" ? paths.top : key === "crease" ? paths.crease : key === "edge" ? paths.outline : paths.shades[Number(key[1])]) || "";
  const cls = { fill: "iso-fill", top: "iso-top", crease: "iso-line iso-crease", edge: "iso-line iso-edge" };
  const slot = (key) => (key[0] === "s" && key.length === 2 ? `<path class="iso-shade" data-shade="${key[1]}" d="${d(key)}"/>` : `<path class="${cls[key]}"${key === "crease" ? ` data-tone="${crease}"` : key === "edge" ? ` data-tone="${tone}"` : ""} d="${d(key)}"/>`);
  const seams = inner === null ? "" : `<path class="iso-line" data-tone="faint" d="${inner}"/>`;
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""}>${SLOTS.slice(0, 7).map(slot).join("")}${seams}${slot("edge")}</g>`;
}
export const EMPTY = { fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""] };

// Pulley assembly at floor angle phi. `side` puts the clamp on +tau (1) or −tau (−1),
// always behind its wheel. Paths for every part; parts.mjs builds the audit shapes from
// the same specs (build only).
const MEMO = new Map();
export function pulleyParts(phi, side) {
  const key = `${phi.toFixed(3)}|${side}`;
  if (!MEMO.has(key)) {
    if (MEMO.size > 8) MEMO.clear();
    MEMO.set(key, buildPulley(phi, side));
  }
  return MEMO.get(key);
}
export const WHEEL_PROFILE = [[-WHEEL.half, WHEEL.flange], [-0.45, WHEEL.flange], [0, WHEEL.groove], [0.45, WHEEL.flange], [WHEEL.half, WHEEL.flange]];
function buildPulley(phi, side) {
  const F = rimFrame(phi);
  const block = (rho0, tau0, rho1, tau1, z0, z1, r = 0.4) => {
    const [v0, v1] = side > 0 ? [tau0, tau1] : [-tau1, -tau0];
    const poly = rrect(rho0, v0, rho1, v1, r);
    return { paths: G.prismOf(F, poly, z0, z1, P), poly, z0, z1 };
  };
  // the index tongue reaches from the jaw to the string's plane over the degree band
  const index = (() => {
    const s = side;
    const poly = [[R - 4.6, 2.3 * s], [R - 0.2, 2.3 * s], [R - 0.2, 0.9 * s], [R - 1.4, 0], [R - 3.4, 0], [R - 4.6, 0.9 * s]];
    const ring = s > 0 ? poly.slice().reverse() : poly;
    return { paths: G.prismOf(F, ring, TOP, TOP + 0.5, P), poly: ring, z0: TOP, z1: TOP + 0.5 };
  })();
  const jaw = block(R - 6, 2.2, R + 0.4, 7.4, TOP, TOP + 1.8, 0.6);
  const spine = block(R + 0.4, 2.2, R + 2.8, 7.4, TOP - 10, TOP + 1.8, 0.5);
  const bjaw = block(R - 4, 2.2, R + 0.4, 7.4, TOP - 10, TOP - 8, 0.4);
  const plate = block(R + 2.8, 2.2, WHEEL.rho + 2.6, 3.4, WZ - 2.8, WZ + 2.4, 0.5);
  // thumb screw under the bottom jaw: knurled head, shank up to the table's underside
  const sc = onRim(F, R - 1.8, side * 4.8, 0);
  const head = drum(sc[0], sc[1], 2, TOP - 13.6, 3.6, 18);
  const shank = drum(sc[0], sc[1], 0.75, TOP - 8, 3.7, 12);
  const knurl = k.knurl(sc[0], sc[1], 2, TOP - 13.6, TOP - 10, 22, P, 0.5);
  // axle along the rim through the plate, the wheel, and a nut on the open side
  const axis = G.mul3(F.v, side);
  const WF = G.frameAlong(onRim(F, WHEEL.rho, 0, WZ), axis);
  const wheel = G.solidOf(WHEEL_PROFILE, WF, P, { steps: 28, smooth: false });
  const axle = G.disc(-1.9, 2.2, 0.6, WF, P, { steps: 12 });
  const nut = G.disc(-1.9, -WHEEL.half, 1.3, WF, P, { steps: 6 });
  const faceS = G.dot3(axis, VIEW) > 0 ? WHEEL.half : -WHEEL.half;
  const hub = G.circleOf(WF, faceS, 1.9, P) + G.circleOf(WF, faceS, 3.2, P);
  const nutFace = G.dot3(axis, VIEW) < 0 ? G.circleOf(WF, -1.9, 0.6, P) : "";
  return { F, WF, sc, jaw, spine, bjaw, plate, index, head, shank, knurl, wheel, axle, nut, hub, nutFace };
}

// The string from the ring over the wheel to the hook, and the hanger height it allows.
export function stringOf(phi, ring) {
  const F = rimFrame(phi);
  const top = onRim(F, WHEEL.rho, 0, SZ);
  const dx = top[0] - ring[0];
  const dy = top[1] - ring[1];
  const L = Math.hypot(dx, dy);
  const tie = [ring[0] + (dx / L) * (KNOT.c + KNOT.r), ring[1] + (dy / L) * (KNOT.c + KNOT.r), SZ];
  const slack = WHEEL.rho - RING.rOut - (L - RING.rOut); // string the ring has given up to this side
  const hook = HOOK.z - slack;
  const arc = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    arc.push(onRim(F, WHEEL.rho + WHEEL.groove * Math.sin(a), 0, WZ + WHEEL.groove * Math.cos(a)));
  }
  const bottom = onRim(F, DROP, 0, hook + HOOK.r);
  return { run: path3([tie, top]), drop: path3([...arc, bottom]), hook, tie, top, F };
}

// Where a string meets the ring it is tied round the ring's section: a wrap across the top,
// a wrap down the outer face where that face is seen, and a knot at the rim.
export const KNOT = { c: RING.rOut + 0.3, r: 0.4 };
export function tieOf(ring, toward) {
  const dx = toward[0] - ring[0];
  const dy = toward[1] - ring[1];
  const L = Math.hypot(dx, dy) || 1;
  const u = [dx / L, dy / L];
  const p = (r, z) => [ring[0] + u[0] * r, ring[1] + u[1] * r, z];
  const face = u[0] * VIEW[0] + u[1] * VIEW[1] > 0.15;
  const t = p(KNOT.c, SZ);
  return (
    path3([p(KNOT.c - KNOT.r, SZ), p(RING.rIn, RING.z1)]) +
    (face ? path3([p(RING.rOut, RING.z1), p(RING.rOut, RING.z0)]) : "") +
    k.ring(t[0], t[1], KNOT.r, SZ, P, 8)
  );
}
// With the pin pulled the ring is held only by the centring cord: it runs from an eyelet in
// the pin cap, across the table, to a knot on the ring's rim facing the bore.
export const EYE = 0.5;
export function cordOf(ring) {
  const d = Math.hypot(ring[0], ring[1]);
  if (d < KNOT.c + KNOT.r + EYE + 0.3) return "";
  const u = [ring[0] / d, ring[1] / d];
  const c = d - KNOT.c;
  const knot = [u[0] * c, u[1] * c];
  return path3([[u[0] * EYE, u[1] * EYE, TOP], [u[0] * (c - KNOT.r), u[1] * (c - KNOT.r), TOP + 0.7]]) + k.ring(knot[0], knot[1], KNOT.r, TOP + 0.7, P, 8);
}

// Masses as hung: whole ones first, the part mass (the fraction) on top.
export function piecesOf(count) {
  const full = Math.floor(count + 1e-6);
  const frac = count - full;
  return [...Array(full).fill(1), ...(frac > 0.04 ? [frac] : [])];
}
export const heightOf = (piece) => (piece >= 1 ? MASS.h : Math.max(0.35, MASS.h * piece));
// A slotted mass comes off sideways through its slot: sideways on screen, away from the table.
const SIDE = [-VIEW[1], VIEW[0]].map((c) => c / Math.hypot(VIEW[0], VIEW[1]));
export function slideDir(x, y) {
  const s = (at([x + SIDE[0], y + SIDE[1], 0])[0] - at([x, y, 0])[0]) * (at([x, y, 0])[0] - at([0, 0, 0])[0]) > 0 ? 1 : -1;
  return [SIDE[0] * s, SIDE[1] * s];
}
export const SLIDE = 2.4 * MASS.r;

// Hanger: hook loop, stem, base and a stack of slotted masses (count may be fractional:
// the top mass is that fraction of a full one). The stack is one turned body with a seam
// at every joint between masses, which is what a stack of equal discs looks like. `tr` is
// a mass on its way on or off: { h, slide (0 = on the stem), lift }.
export function hangerParts(phi, hook, count, tr = null) {
  const F = rimFrame(phi);
  const [x, y] = onRim(F, DROP, 0, 0);
  const base = hook - HOOK.r - STEM - 1.2;
  const z0 = base + 1.2;
  const list = [];
  let top = z0;
  for (const piece of piecesOf(count)) list.push({ z: top, h: heightOf(piece) }), (top += heightOf(piece));
  const dir = slideDir(x, y);
  const open = [-dir[0], -dir[1]];
  const stemTop = hook - HOOK.r + 0.15;
  const loopF = G.frameAlong([x, y, hook], F.v);
  const out = {
    x,
    y,
    base,
    top,
    list,
    dir,
    loop: G.circleOf(loopF, 0, HOOK.r, P),
    baseP: drum(x, y, HANGER_R, base, 1.2, 24, 0.4),
    stem: drum(x, y, 0.5, top, stemTop - top, 10),
    stack: list.length ? drum(x, y, MASS.r, z0, top - z0, 24) : EMPTY,
    seams: list.slice(1).map((m) => k.sideArc(x, y, MASS.r, m.z, P, 18)).join(""),
    slot: list.length ? k.onTop(slotRing(x, y, open), top, P, true) : "",
    moving: EMPTY,
    movingSlot: "",
    stemHi: EMPTY,
    shadow: k.cylinder(x, y, 4.6, 0, 0.1, P, 20).fill,
  };
  if (tr && tr.h > 0) {
    const [tx, ty] = [x + dir[0] * tr.slide, y + dir[1] * tr.slide];
    const tz = top + (tr.lift || 0);
    Object.assign(out, {
      moving: drum(tx, ty, MASS.r, tz, tr.h, 24),
      movingSlot: k.onTop(slotRing(tx, ty, open), tz + tr.h, P, true),
      // while the stem still runs through the mass's slot it shows above the mass
      stemHi: tr.slide < MASS.r ? drum(x, y, 0.5, tz + tr.h, stemTop - tz - tr.h, 10) : EMPTY,
      at: [tx, ty, tz],
    });
  }
  return out;
}
// The slot every slotted mass has, seen on the top one: from the stem out to the rim.
export function slotRing(x, y, [ux, uy]) {
  const w = 0.75;
  const end = Math.sqrt(MASS.r * MASS.r - w * w);
  const map = (a, b) => [x + ux * a - uy * b, y + uy * a + ux * b];
  const out = [];
  for (let i = 0; i <= 6; i++) {
    const t = Math.PI / 2 + (i / 6) * Math.PI;
    out.push(map(w * Math.cos(t), w * Math.sin(t)));
  }
  out.push(map(end, -w), map(end, w));
  return out;
}

// Pin, lowered by `drop`: what stands inside the ring's bore (drawn before the ring) and
// what stands above it. Below the table top nothing shows.
export function pinParts(drop) {
  const tip = PIN.tip - drop;
  const span = (z0, z1, r, steps, bevel = 0) => (z1 - z0 > 0.02 ? drum(0, 0, r, z0, z1 - z0, steps, bevel) : EMPTY);
  const capTop = tip + PIN.capH;
  const cut = RING.z1;
  return {
    lo: [span(TOP, Math.min(tip, cut), PIN.r, 16), span(Math.max(TOP, tip), Math.min(capTop, cut), PIN.cap, 20)],
    hi: [span(Math.max(TOP, cut), tip, PIN.r, 16), span(Math.max(TOP, cut, tip), capTop, PIN.cap, 20, 0.3)],
    knurl: capTop - Math.max(TOP, cut, tip) > 0.9 ? k.knurl(0, 0, PIN.cap, Math.max(TOP, cut, tip), capTop, 18, P, 0.35) : "",
    tip,
    capTop,
  };
}
export const RING_PATHS = G.ringBand(RING.z0, RING.z1, RING.rIn, RING.rOut, G.frameAlong([0, 0, 0], [0, 0, 1]), P, { hole: [RING.z1, RING.rIn] });

// Release knob on the column collar, and the gene card file on the bench.
export const RELEASE = { dir: [Math.cos(10 * DEG), Math.sin(10 * DEG), 0], travel: 2.6 };
// cards span the tray wall to wall, so a card drawn up stays gripped while its foot is below the walls' top
export const CARDS = { x0: 38.6, pitch: 4.4, y: 57.4, d: 10.8, w: 0.9, z0: 1.2, h: 12, lift: 4 };
