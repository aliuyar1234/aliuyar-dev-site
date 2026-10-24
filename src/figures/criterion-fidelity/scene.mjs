// World layout, camera and every part that moves. Shared by parts.mjs (build time) and
// live.js (browser), so the static drawing and each frame agree exactly.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const W_PX = 600;
export const H_PX = 540;
export const DEG = Math.PI / 180;

export const PLATE = { x: -122, y: -76, w: 244, d: 162, r: 8 };
export const PLATE_H = 12;
export const FOOT_H = 5;

// The balance stands turned 22° on the bench. Local coordinates: p along the beam (E),
// q toward the viewer (N), z up.
export const BETA = 22 * DEG;
export const E = [Math.cos(BETA), -Math.sin(BETA), 0];
export const N = [Math.sin(BETA), Math.cos(BETA), 0];
export const O = [-24, -18];
export const W = (p, q, z) => [O[0] + p * E[0] + q * N[0], O[1] + p * E[1] + q * N[1], z];
export const LOCAL = { o: [O[0], O[1], 0], a: [0, 0, 1], u: E, v: N };

// Beam on the central knife edge; end knives carry the stirrups.
export const PIV_Z = 100;
export const PIV = W(0, 0, PIV_Z);
export const TILT = 14 * DEG;
export const ARM = 64;
export const KNIFE_V = 8.6;
export const BEAM_POLY = [[-68, 3.8], [-6, 1.6], [6, 1.6], [68, 3.8], [68, 6.6], [0, 11.5], [-68, 6.6]];
export const TOP_V = (x) => 11.5 - (4.9 * Math.abs(x)) / 68;
const BOTTOM_V = (x) => 1.6 + ((Math.abs(x) - 6) * 2.2) / 62;
export const POISE_MAX = 48;
export const TONGUE = 58.5;

// Stirrup: agate plane on the end knife, cheeks either side of the beam, a lower
// bridge, a hanger, a bent-wire bow and the pan. Built at rest (beam level).
export const AGATE_Z = PIV_Z + KNIFE_V;
export const BRIDGE_Z = AGATE_Z - 6.4;
export const BAR_Z = 32.4;
export const PAN_Z = 34;
export const PAN_R = 15;
export const APEX_Z = 72;
export const BOW = 17.8;

// Arrest: two pins rise from bushings on the column head and lift the beam level.
export const ARREST = { p: 24, r: 0.9, z0: 94.2, drop: 7 };
export const ARREST_TOP = PIV_Z + BOTTOM_V(ARREST.p);

// Rider carrier: a rail over the beam on two posts, and a carriage whose sprung finger
// sets the poise while the beam is arrested. The poise always rides the arm that goes
// down, so the beam swings away from the finger when the arrest lets go.
export const RAIL = { z: 131, r: 1.1, p: 90, block: 2.6 };
export const PULLEY = { r: 2.1, q0: -2.6, q1: -3.6 };
export const CORD_Q = -3.1;

// Card shuttle, reader gate and the criterion cards: three stations.
export const CARD = { w: 24, h: 22, t: 1.2, y: 52.3 };
export const PAIR = { dy: -1.9, dx: -0.9, dz: 1.6 };
export const PITCH = 34;
export const CARD_Z = 8;
export const LIFT = 13;
export const TRAY = { w: 112, d: 9, y: 48.5, z: 3, h: 5 };
export const cardX = (index) => (index - 1) * PITCH;
export const trayFor = (index) => -cardX(index);
export const HOLE = { x: 6.5, z: 17.2, r: 2.6 };
export const PIN = { y0: 49.5, r: 1.3 };

// Order console beside the reader: four sight gauges and the first-shown dial.
export const CONSOLE = { x: 23, y: 38.5, w: 37, d: 8, h: 58 };
export const FACE_Y = CONSOLE.y + CONSOLE.d;
export const GAUGE = { x: [29.5, 34.5, 39.5, 44.5], z0: 35, h: 18, w: 2.8 };
export const DIAL = { x: 53, z: 44, r: 5.2, span: 55 * DEG };

// Family register: four stacks of family cards in a box.
export const REG = { x: 70, y: -72, w: 46, d: 20 };
export const STACK = { h: 26, w: 8.2, gap: 2.2, y: REG.y + 4, d: 12 };
export const stackX = (index) => REG.x + 3.4 + index * (STACK.w + STACK.gap);

// Judge selector.
export const SWITCH = { x: 84, y: 8, w: 24, d: 24, r: 2 };
export const SWITCH_H = 9;
export const KNOB = [SWITCH.x + 12, SWITCH.y + 12];
export const KNOB_R = 5;
export const DETENTS = [-20, 12, 44, 76, 108].map((deg) => deg * DEG);

export const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), W(-72, 0, PIV_Z + 20), W(72, 0, PIV_Z + 20), W(-20, 2, PIV_Z + 61), W(20, 2, PIV_Z + 61), W(-RAIL.p, 0, RAIL.z + 4), W(RAIL.p, 0, RAIL.z + 4)],
  W_PX,
  H_PX,
  { pad: 20 },
);

export const at = (point) => k.iso(point, P);
export const VIEW = G.viewOf(P);
export const depth = (point) => G.dot3(point, VIEW);

export function beamFrame(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { o: PIV, a: [-N[0], -N[1], 0], u: [E[0] * c, E[1] * c, s], v: [-E[0] * s, -E[1] * s, c] };
}
export const onBeam = (F, s, x, v) => [0, 1, 2].map((i) => F.o[i] + F.a[i] * s + F.u[i] * x + F.v[i] * v);
export const pinAt = (theta, side) => onBeam(beamFrame(theta), 0, side * ARM, KNIFE_V);
export const stirrupShift = (theta, side) => G.sub3(pinAt(theta, side), pinAt(0, side));
// The winning pan's bar comes down onto its rest exactly at full deflection.
export const REST_TOP = BAR_Z + stirrupShift(TILT, -1)[2];

// Rounded rectangle in local balance coordinates, and a box standing on it.
export function rrect(p0, q0, p1, q1, r = 0.6, count = 2) {
  const out = [];
  for (const [cp, cq, from] of [[p1 - r, q1 - r, 0], [p0 + r, q1 - r, 90], [p0 + r, q0 + r, 180], [p1 - r, q0 + r, 270]])
    for (let i = 0; i <= count; i++) {
      const a = (from + (90 * i) / count) * DEG;
      out.push([cp + r * Math.cos(a), cq + r * Math.sin(a)]);
    }
  return out;
}
export const boxPaths = (p0, q0, p1, q1, z0, z1, r) => G.prismOf(LOCAL, rrect(p0, q0, p1, q1, r), z0, z1, P);
export const boxShape = (A, p0, q0, p1, q1, z0, z1, r, name, meta = {}) => A.prism(LOCAL, rrect(p0, q0, p1, q1, r), z0, z1, { name, ...meta });

// Stop pins on the scale: the tongue meets one exactly at full deflection.
export const STOP_R = 55;
export const STOP_PIN = 0.9;
const TONGUE_HALF = (v) => 1.1 - (0.85 * (v - 8)) / (TONGUE - 8);
export const STOP_PHI = TILT + Math.asin((TONGUE_HALF(STOP_R) + STOP_PIN) / STOP_R);

const ring = (cx, cy, r, count = 12) => Array.from({ length: count }, (_, i) => [cx + r * Math.cos((i / count) * 2 * Math.PI), cy + r * Math.sin((i / count) * 2 * Math.PI)]);

export function poisePoly(x) {
  const a = x - 4.2;
  const b = x + 4.2;
  const lo = (u) => (a < 0 && b > 0 ? Math.max(TOP_V(a), TOP_V(b)) : TOP_V(u));
  return [[a, lo(a)], [b, lo(b)], [b, lo(b) + 4.4], [a, lo(a) + 4.4]];
}
export const poiseTop = (x) => Math.max(...poisePoly(x).map(([, v]) => v));

// Rider notches: minor every 2.4, major every 12, so the majors sit at lean ¼, ½, ¾ and 1.
const TICKS = [-1, 1].flatMap((side) => Array.from({ length: 23 }, (_, i) => ({ x: side * (4.8 + i * 2.4), major: (i + 2) % 5 === 0 })));
const KNIFE_POLY = [[-2.2, 1.6], [2.2, 1.6], [0, 0]];
const endKnife = (side) => [side * ARM - 1.8, side * ARM + 1.8].map((x) => [x, TOP_V(x)]).concat([[side * ARM, KNIFE_V]]);
const TONGUE_POLY = [[-1.1, 8], [1.1, 8], [0.25, TONGUE], [-0.25, TONGUE]];

// Every beam part as [name, polygon, s0, s1] in the beam frame at angle theta.
export function beamPolys(poiseX) {
  return [
    ["knife", KNIFE_POLY, -3, 3],
    ["beam", BEAM_POLY, -1.5, 1.5],
    ["boss", ring(0, 6, 2.4), -3.5, -1.5],
    ["knifeL", endKnife(-1), -2.8, 2.8],
    ["knifeR", endKnife(1), -2.8, 2.8],
    ["poise", poisePoly(poiseX), -3, 3],
    ["tongue", TONGUE_POLY, -4.5, -3.5],
  ];
}

export function beamParts(theta, poiseX) {
  const F = beamFrame(theta);
  const out = {};
  for (const [name, polygon, s0, s1] of beamPolys(poiseX)) out[name] = G.prismOf(F, polygon, s0, s1, P);
  const minor = [];
  const major = [];
  for (const { x, major: big } of TICKS) {
    const top = TOP_V(x);
    (big ? major : minor).push(k.pathOf([at(onBeam(F, -1.5, x, top)), at(onBeam(F, -1.5, x, top - (big ? 2.3 : 1.3)))]));
  }
  out.minor = minor.join("");
  out.major = major.join("");
  return out;
}

// A solid whose paths are rewritten every frame: every sub-path is always present.
export function liveSolidSvg(name, paths, { tone = "hi", crease = "faint", lit = false } = {}) {
  const shades = [0, 1, 2, 3].map((index) => `<path class="iso-shade" data-shade="${index}" d="${paths.shades[index] ?? ""}"/>`).join("");
  return `<g class="iso-solid" data-solid="${name}"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top ?? ""}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease ?? ""}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}

export const BEAM_STYLE = { knife: { tone: "mid" }, beam: { tone: "mid" }, boss: { tone: "mid" }, knifeL: { tone: "mid" }, knifeR: { tone: "mid" }, poise: { tone: "hi", crease: "lo" }, tongue: { tone: "hi", crease: "lo" } };

export function beamSvg(theta, poiseX) {
  const parts = beamParts(theta, poiseX);
  const solid = (name) => liveSolidSvg(name, parts[name], BEAM_STYLE[name]);
  return [solid("knife"), solid("knifeL"), solid("knifeR"), solid("beam"), `<path class="iso-line" data-tone="lo" data-beam="minor" d="${parts.minor}"/>`, `<path class="iso-line" data-tone="mid" data-beam="major" d="${parts.major}"/>`, solid("boss"), solid("poise")].join("");
}

// Arrest pins: share 1 holds the beam level, 0 drops them clear of every lean.
export const arrestTip = (share) => ARREST_TOP - ARREST.drop * (1 - share);
export const arrestPaths = (side, share) => {
  const [x, y] = W(side * ARREST.p, 0, 0);
  return k.cylinder(x, y, ARREST.r, ARREST.z0, arrestTip(share) - ARREST.z0, P, 12);
};
// The largest lean the pins allow at this share: the beam's underside at the pin's
// outer edge must stay on or above the pin top.
export function arrestLimit(share) {
  const x = ARREST.p + ARREST.r;
  const a = BOTTOM_V(x);
  const rr = Math.hypot(a, x);
  const c = (arrestTip(share) - PIV_Z) / rr;
  if (c >= 1) return 0;
  return Math.max(0, Math.acos(Math.max(-1, c)) - Math.atan2(x, a)) / TILT;
}

// Carriage: a top plate riding on the rail and a front cheek hanging in front of it;
// the sprung finger drops from the cheek onto the poise, and a lug behind takes the cord.
export const CARRIAGE = { half: 4, back: -1.6, front: 2.4, cheek: 1.2, top: RAIL.z + RAIL.r, plate: 2, drop: RAIL.z - 2.6 };
export const FINGER = { q0: 1.3, q1: 2.3 };
export const LUG = { half: 1.6, q0: -3.8, z0: CARRIAGE.top + 0.2, z1: CARRIAGE.top + 1.8 };
export const carriagePaths = (x) => ({
  top: boxPaths(x - CARRIAGE.half, CARRIAGE.back, x + CARRIAGE.half, CARRIAGE.front, CARRIAGE.top, CARRIAGE.top + CARRIAGE.plate, 0.5),
  cheek: boxPaths(x - CARRIAGE.half, CARRIAGE.cheek, x + CARRIAGE.half, CARRIAGE.front, CARRIAGE.drop, CARRIAGE.top, 0.3),
  lug: boxPaths(x - LUG.half, LUG.q0, x + LUG.half, CARRIAGE.back, LUG.z0, LUG.z1, 0.3),
});
export function fingerTip(x) {
  const poly = poisePoly(x);
  const topAt = (u) => poly[3][1] + ((poly[2][1] - poly[3][1]) * (u - poly[3][0])) / (poly[2][0] - poly[3][0]);
  return PIV_Z + Math.max(topAt(x - 0.5), topAt(x + 0.5));
}
export const fingerPaths = (x) => boxPaths(x - 0.5, FINGER.q0, x + 0.5, FINGER.q1, fingerTip(x), CARRIAGE.drop, 0.2);
export function cordPath(x) {
  const z = RAIL.z + PULLEY.r;
  const lug = (side) => at(W(x + side * LUG.half, CORD_Q, z));
  return k.pathOf([at(W(-RAIL.p, CORD_Q, z)), lug(-1)]) + k.pathOf([lug(1), at(W(RAIL.p, CORD_Q, z))]);
}

// Knob pointers.
export function knobPointer(angle) {
  const top = SWITCH_H + 5;
  const [cx, cy] = KNOB;
  return k.lineOnTop([cx + Math.cos(angle) * 1.2, cy + Math.sin(angle) * 1.2], [cx + Math.cos(angle) * (KNOB_R - 0.8), cy + Math.sin(angle) * (KNOB_R - 0.8)], top, P);
}
export const ARREST_KNOB = { q: 15, z: 5, r: 2.3, s: 2.2 };
export function arrestPointer(share) {
  const F = G.frameOf(W(0, ARREST_KNOB.q, ARREST_KNOB.z), N, E, [0, 0, 1]);
  const a = (-90 + 90 * share) * DEG;
  return k.pathOf([at(G.pointOf(F, ARREST_KNOB.s, 0.5, a)), at(G.pointOf(F, ARREST_KNOB.s, ARREST_KNOB.r - 0.5, a))]);
}

// Gauge floats and the dial needle on the console face.
export const floatPlan = (index, share) => ({ x: GAUGE.x[index] - 1, y: FACE_Y - 0.3, w: 2, d: 1.1, r: 0.2, z: GAUGE.z0 + 0.3 + share * (GAUGE.h - 1.8) });
export const floatPaths = (index, share) => {
  const plan = floatPlan(index, share);
  return k.slabOf(plan, plan.z, 1.2, P, 2);
};
export function needlePath(share) {
  const a = (share * 2 - 1) * DIAL.span;
  const y = FACE_Y + 1.2;
  const tip = [DIAL.x + Math.sin(a) * (DIAL.r - 0.9), y, DIAL.z + Math.cos(a) * (DIAL.r - 0.9)];
  // The needle starts at the hub, under its cap dot.
  return k.pathOf([at([DIAL.x, y, DIAL.z]), at(tip)]);
}

// Register stacks: height in world units for a share of the 600 families.
export const stackPlan = (index) => ({ x: stackX(index), y: STACK.y, w: STACK.w, d: STACK.d, r: 0.3 });
export const stackPaths = (index, share) => {
  const h = Math.max(0.05, share * STACK.h);
  const plan = stackPlan(index);
  const paths = k.slabOf(plan, 0.8, h, P, 2);
  const seams = [];
  for (let z = 0.8 + STACK.h / 12; z < 0.8 + h - 0.4; z += STACK.h / 12) seams.push(k.sideSeam(plan, z, P, 2));
  return { ...paths, seams: seams.join("") };
};

// The lifter blade in the gate pushes the selected card up out of the shuttle.
export const LIFTER = { x: -1.2, y: 52.55, w: 2.4, d: 0.9, r: 0.3 };
export const lifterPaths = (share) => k.slabOf(LIFTER, CARD_Z, Math.max(0.01, share * LIFT), P, 2);
