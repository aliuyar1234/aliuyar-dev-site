// Parts whose shape changes while the press runs. art.mjs draws them at rest, live.js redraws them each frame,
// build.mjs records them in every audited pose: one source for all three.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { P, SHAFT, ROD, FLY, HANDLE_R, HEAD_Z, TT, UP, NUT_DOWN, KNOB, DIAL_AT, DIAL_R, DIAL_Z, HOP, SCREEN, COUNTER, STRAP } from "./scene.mjs";
import { ECC, STROKE, Q, RHO, onArc, DIAL, STEPS, A_REST, A_FWD } from "./model.mjs";

const deg = Math.PI / 180;
export const FXC = G.frameOf([0, SHAFT.y, SHAFT.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]); // s = world x

// A solid with a fixed set of paths, so a frame only rewrites d attributes.
export const solidD = (p) => [p.fill, ...p.shades.map((d) => d || ""), p.top || "", p.crease || "", p.outline];
export function liveSolid(paths, { tone = "hi", crease = "faint", lit = false, name = "" } = {}) {
  const d = solidD(paths);
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${d[1 + i]}"/>`).join("");
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""}${name ? ` data-live="${name}"` : ""}><path class="iso-fill" d="${d[0]}"/>${shades}<path class="iso-top" d="${d[5]}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${crease === "none" ? "" : d[6]}"${crease === "none" ? ' data-off=""' : ""}/><path class="iso-line iso-edge" data-tone="${tone}" d="${d[7]}"/></g>`;
}

// ---------------------------------------------------------------- the screen's guide rods: the length above the bushings changes
export const RODS = SCREEN.rods.map((a) => [HOP.c[0] + SCREEN.rodR * Math.cos(a * deg), HOP.c[1] + SCREEN.rodR * Math.sin(a * deg), a * deg]);
export function rodTopOf([x, y], lift) {
  const z = SCREEN.z + 3 + lift;
  return k.cylinder(x, y, 1, z, SCREEN.rodTop - z, P, 10);
}

// ---------------------------------------------------------------- eccentric and rod
// shaft angle psi: the eccentric centre goes from the top (TDC) toward +y
export const eccentricOf = (psi) => [0, ECC * Math.sin(psi), SHAFT.z + ECC * Math.cos(psi)];
export const ECC_REST = eccentricOf(0);
export function conrodOf(psi) {
  const c = eccentricOf(psi);
  const pin = [0, 0, c[2] - Math.sqrt(ROD * ROD - c[1] * c[1])];
  const t = (c[2] - HEAD_Z[1]) / (c[2] - pin[2]);
  const b = [0, c[1] + (pin[1] - c[1]) * t, HEAD_Z[1]];
  const a = G.unit3(G.sub3(c, b));
  const F = G.frameOf(b, a, [1, 0, 0], G.unit3(G.cross3(a, [1, 0, 0])));
  const poly = [[-1.8, -1.4], [1.8, -1.4], [1.8, 1.4], [-1.8, 1.4]];
  const len = G.len3(G.sub3(c, b));
  return { F, poly, len, paths: G.prismOf(F, poly, 0, len, P) };
}

// ---------------------------------------------------------------- flywheel spokes and handle
const spokeAngle = (psi, i) => Math.PI / 2 - psi + (i * 2 * Math.PI) / FLY.spokes;
export function spokesOf(psi) {
  return Array.from({ length: FLY.spokes }, (_, i) => {
    const a = spokeAngle(psi, i);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const r0 = FLY.hubR - 0.6;
    const r1 = FLY.rIn + 0.6;
    const w0 = 1.9;
    const w1 = 1.4;
    const poly = [[r0 * c + w0 * s, r0 * s - w0 * c], [r1 * c + w1 * s, r1 * s - w1 * c], [r1 * c - w1 * s, r1 * s + w1 * c], [r0 * c - w0 * s, r0 * s + w0 * c]];
    return { poly, paths: G.prismOf(FXC, poly, FLY.x[0] + 1, FLY.x[1] - 1, P) };
  });
}
// a spoke that points toward the viewer is drawn after the hub's middle, one that points away before it
export const spokeFront = (psi, i) => k.depthOf([0, Math.cos(spokeAngle(psi, i)), Math.sin(spokeAngle(psi, i))], P) > 0;
export const handleAngle = (psi) => spokeAngle(psi, 0) + Math.PI / FLY.spokes;
export const handleOffset = (psi) => {
  const a = handleAngle(psi);
  const a0 = handleAngle(0);
  return [0, HANDLE_R * (Math.cos(a) - Math.cos(a0)), HANDLE_R * (Math.sin(a) - Math.sin(a0))];
};
export const handleAt = (psi) => {
  const a = handleAngle(psi);
  return [FLY.x[1], FLY.c[1] + HANDLE_R * Math.cos(a), FLY.c[2] + HANDLE_R * Math.sin(a)];
};

// ---------------------------------------------------------------- feed shoe on its swing arm
export const SHOE = { half: 7, wide: 6, h: 6, r: 1.6 };
export function shoeOf(alpha) {
  const a = alpha * deg;
  const t = [-Math.sin(a), Math.cos(a)];
  const n = [Math.cos(a), Math.sin(a)];
  const c = onArc(alpha);
  const place = (ring, o, sx = 1) => ring.map(([x, y]) => [o[0] + x * t[0] + y * n[0], o[1] + x * t[1] + y * n[1]]);
  const local = (hl, hw, r) => k.roundedPlan({ x: -hl, y: -hw, w: 2 * hl, d: 2 * hw, r }, 4);
  const body = place(local(SHOE.half, SHOE.wide, SHOE.r), c);
  const mouth = place(local(4.4, 3.3, 1.2), [c[0] - 0.6 * n[0], c[1] - 0.6 * n[1]]);
  const r0 = 4; // the arm's corners meet the hub's surface
  const r1 = RHO - SHOE.wide;
  const armMid = [Q[0] + ((r0 + r1) / 2) * n[0], Q[1] + ((r0 + r1) / 2) * n[1]];
  const arm = place(k.roundedPlan({ x: -2.2, y: -(r1 - r0) / 2, w: 4.4, d: r1 - r0, r: 0.8 }, 3), armMid);
  const top = TT + SHOE.h;
  return {
    c,
    body,
    arm,
    mouth,
    paths: k.extrude(body, TT, SHOE.h, P, { bevel: 0.5 }),
    armPaths: k.extrude(arm, TT + 1, 3, P),
    mouthD: k.onTop(mouth, top, P, true),
  };
}

// ---------------------------------------------------------------- the anchor spring (vertical coil)
export function coilZ(cx, cy, r, z0, z1, turns, perTurn = 18) {
  const count = Math.max(2, Math.round(turns * perTurn));
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let i = 0; i <= count; i++) {
    const share = i / count;
    const angle = share * turns * 2 * Math.PI + Math.PI * 0.25;
    const point = [cx + r * Math.cos(angle), cy + r * Math.sin(angle), z0 + (z1 - z0) * share];
    const facing = k.depthOf([Math.cos(angle), Math.sin(angle), 0], P) > 0;
    const flat = k.iso(point, P);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(k.pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
// spring between the holder top and either its free length or the nut, at ram offset dz
export function springSpan(dz, lift, anchor) {
  const bottom = UP.holder[1] + dz + lift;
  const nutBottom = UP.nut[0] - NUT_DOWN * anchor + dz;
  return [bottom, anchor > 0 ? Math.min(bottom + UP.free, nutBottom) : bottom + UP.free];
}
export const springOf = (dz, lift, anchor) => coilZ(0, 0, UP.spring, ...springSpan(dz, lift, anchor), 3.5);

// the ram between the holder and the tension knob: it slides into both, so its visible length changes
export function ramLowOf(dz, lift, anchor) {
  const z0 = UP.holder[1] + dz + lift;
  const z1 = UP.nut[0] - NUT_DOWN * anchor + dz + 1;
  return { z0, z1, paths: k.cylinder(0, 0, UP.ram, z0, z1 - z0, P, 12) };
}

// ---------------------------------------------------------------- pointers
// the counter dial on the head's front face: angle 0 straight up, turning toward +x
export const COUNTER_F = G.frameOf(COUNTER.c, [0, 1, 0], [0, 0, 1], [1, 0, 0]);
export const counterHandOf = (strokes) => {
  const a = (2 * Math.PI * strokes) / STEPS;
  return k.pathOf([k.iso(G.pointOf(COUNTER_F, 0.7, 0.6, a + Math.PI), P), k.iso(G.pointOf(COUNTER_F, 0.7, 3.2, a), P)]);
};
export const KNOB_ANGLE = { 0: -60, 0.1: 0, 0.3: 60 }; // degrees on the selector plate, 0 = toward −y
export function pointerOf(angle) {
  const a = angle * deg;
  const z = 17;
  return k.lineOnTop([KNOB[0] - Math.sin(a) * 1.2, KNOB[1] + Math.cos(a) * 1.2], [KNOB[0] + Math.sin(a) * 4.4, KNOB[1] - Math.cos(a) * 4.4], z, P);
}
export const dialAngle = (value) => -DIAL.sweep / 2 + (DIAL.sweep * Math.max(0, Math.min(DIAL.max, value))) / DIAL.max;
export function needleOf(value) {
  const a = dialAngle(value) * deg;
  const [x, y] = DIAL_AT;
  const z = DIAL_Z[1] + 0.2;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIAL_R - 3.6), y - Math.cos(a) * (DIAL_R - 3.6)], z, P);
}
// limit hands on the bezel at mean − std and mean + std
export function limitOf(value) {
  const a = dialAngle(value) * deg;
  const [x, y] = DIAL_AT;
  const z = DIAL_Z[1];
  const r0 = DIAL_R - 2.2;
  const r1 = DIAL_R - 0.4;
  const side = 0.9;
  const tip = [x + Math.sin(a) * r0, y - Math.cos(a) * r0];
  const l = [x + Math.sin(a) * r1 + Math.cos(a) * side, y - Math.cos(a) * r1 + Math.sin(a) * side];
  const r = [x + Math.sin(a) * r1 - Math.cos(a) * side, y - Math.cos(a) * r1 - Math.sin(a) * side];
  return k.onTop([tip, l, r], z, P, true);
}

// ---------------------------------------------------------------- ghosts: what the moving parts sweep at speed
// Screen polygons joined into one fill per part: every ring is wound the same way, so the nonzero rule paints their
// union once. live.js writes them into the empty placeholders parts.mjs leaves in each part's painter's slot.
const at = (p) => k.iso(p, P);
const ringsOf = (d) => [...d.matchAll(/M([^MZ]*)Z/g)].map(([, body]) => {
  const v = body.match(/-?\d*\.?\d+/g).map(Number);
  return Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]]);
});
const wound = (ring) => (ring.reduce((sum, [x, y], i) => sum + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * y, 0) < 0 ? [...ring].reverse() : ring);
const fillOf = (rings) => rings.map((ring) => k.pathOf(wound(ring), true)).join("");
export function ghostsOf() {
  // the column the punch, holder, spring and knob sweep, from the holder at the bottom of the stroke to the bush
  const punch = [[UP.punch, TT - 1, UP.holder[0] - STROKE], [UP.holderR, UP.holder[0] - STROKE, UP.nut[1]], [UP.ram, UP.nut[1], UP.bush[0]]].flatMap(([r, z0, z1]) => ringsOf(k.cylinder(0, 0, r, z0, z1 - z0, P, 20).fill));
  // the shoe and its arm, between the hopper and just past the die: the union of 13 positions 6.5° apart (the shoe is
  // 21° long on its arc, so they overlap into one smooth sector)
  const shoe = Array.from({ length: 13 }, (_, i) => shoeOf(A_REST + ((A_FWD - A_REST) * i) / 12)).flatMap((p) => [...ringsOf(p.paths.fill), ...ringsOf(p.armPaths.fill)]);
  // the disc the strap sweeps round the shaft and the fan the rod sweeps under it
  const fan = G.hullOf(Array.from({ length: 12 }, (_, i) => ringsOf(conrodOf((i / 12) * 2 * Math.PI).paths.fill).flat()).flat());
  const strap = ringsOf(G.disc(STRAP.x[0], STRAP.x[1], ECC + STRAP.r[1], FXC, P, { steps: 32 }).fill);
  // the ring the handle sweeps in front of the rim (evenodd: the hole stays open)
  const ring = (r) => G.circleOf(FXC, FLY.x[1] + 8, r, P, 40);
  return { punch: fillOf(punch), shoe: fillOf(shoe), ecc: fillOf([...strap, fan]), handle: ring(HANDLE_R + 2.6) + ring(HANDLE_R - 2.6) };
}
