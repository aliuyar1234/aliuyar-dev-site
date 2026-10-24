// Camera and the moving parts' attributes. Shared by geometry.mjs and art.mjs (static pose) and live.js (every frame).
import { fitProjection, boxCorners, iso, pathOf, lineOnTop, translateAlong, extrude } from "../kit/iso-kit.mjs";
import { FINS, PORT_LAYERS, READ, HOLES, CARD_COLS } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 480;

export const BENCH = { x: -150, y: -84, w: 300, d: 136, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 5;
export const BODY = { x: -126, y: -54, w: 140, d: 62, r: 5 };
export const FIN_X = (i) => BODY.x + 8 + i * (124 / (FINS - 1));
export const PORTS = PORT_LAYERS.map((layer) => [FIN_X(layer), -38]);
export const POSTS = [-103, 24];
export const POST_Y = -67;
export const POST_TOP = 106;
export const CROWN_TOP = POST_TOP + 7;
export const PROBE_HOME = -119;
export const PROBE_END = 7;
export const DIAL = [50, 26];
export const DIAL_R = 14;
export const DIAL_Z = 30;
export const DIAL_TOP = DIAL_Z + 8;

// the yoke, built raised; live moves it down by YOKE_LIFT
export const YOKE_SEAT = 49.5;
export const YOKE_LIFT = 20;
export const Y_RAISED = YOKE_SEAT + YOKE_LIFT;
export const PLATE_Z = Y_RAISED + 10;
export const PLATE_TOP = PLATE_Z + 6;
export const PATCH_TOP = PLATE_TOP + 2.4;
export const HOUSING_TOP = PATCH_TOP + 5;
export const KNOB_Y = -38;
export const KNOB_R = 2.6;
export const BAR_Z = HOUSING_TOP + 1.2;
export const BAR_TOP = BAR_Z + 1.8;
export const STRIPE = { bar: [2.3, 4.7], body: [5.6, 6.9] }; // witness lacquer: on the pointer, and on the housing past its tip

// the press drive: a non-rising handwheel turns the nut; the lead screw rides down with the yoke
export const SCREW = [-39.5, -55];
export const BEARING_TOP = PLATE_TOP + 3;
export const WHEEL = { z: 118.2, h: 2, rIn: 10.6, rOut: 12.6, hub: 3, turns: 1.5 };

export const P = fitProjection(
  [...boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [POSTS[0] - 7, POST_Y - 6.5, CROWN_TOP], [POSTS[1] + 7, POST_Y - 6.5, CROWN_TOP], [SCREW[0], SCREW[1] - WHEEL.rOut, WHEEL.z + 8.5]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 45 },
);

const at = (p) => iso(p, P);
const dirOf = (a) => [Math.sin(a), -Math.cos(a)];

export function needleAt(angle) {
  const [x, y] = DIAL;
  return lineOnTop([x - Math.sin(angle) * 2.8, y + Math.cos(angle) * 2.8], [x + Math.sin(angle) * (DIAL_R - 2.2), y - Math.cos(angle) * (DIAL_R - 2.2)], DIAL_TOP + 0.2, P); // the tip runs out to the scale ring
}

// a trim knob's pointer bar: a pentagon turned to `angle` about the knob axis, in the yoke's raised frame
const BAR = [[-1.8, -1.1], [3.9, -1.1], [5.3, 0], [3.9, 1.1], [-1.8, 1.1]];
export function barRing(index, angle) {
  const [cx] = PORTS[index];
  const [dx, dy] = dirOf(angle);
  return BAR.map(([u, v]) => [cx + dx * u - dy * v, KNOB_Y + dy * u + dx * v]);
}
export const barPaths = (index, angle) => extrude(barRing(index, angle), BAR_Z, BAR_TOP - BAR_Z, P);
export function barStripe(index, angle) {
  const [cx] = PORTS[index];
  const [dx, dy] = dirOf(angle);
  return lineOnTop([cx + dx * STRIPE.bar[0], KNOB_Y + dy * STRIPE.bar[0]], [cx + dx * STRIPE.bar[1], KNOB_Y + dy * STRIPE.bar[1]], BAR_TOP, P);
}
export function bodyStripe(index, angle) {
  const [cx] = PORTS[index];
  const [dx, dy] = dirOf(angle);
  return lineOnTop([cx + dx * STRIPE.body[0], KNOB_Y + dy * STRIPE.body[0]], [cx + dx * STRIPE.body[1], KNOB_Y + dy * STRIPE.body[1]], HOUSING_TOP, P);
}
// the bar's paths in a fixed slot order, so live code can rewrite them in place
export const BAR_SLOTS = ["fill", 0, 1, 2, 3, "top", "crease", "outline"];
export const slotsOf = (paths) => BAR_SLOTS.map((slot) => (typeof slot === "number" ? paths.shades[slot] || "" : paths[slot] || ""));

// three spokes on the handwheel's top plane, hub to rim
export function spokesAt(angle) {
  const [cx, cy] = SCREW;
  const z = WHEEL.z + WHEEL.h;
  let d = "";
  for (let k = 0; k < 3; k++) {
    const [dx, dy] = dirOf(angle + (k * 2 * Math.PI) / 3);
    d += lineOnTop([cx + dx * WHEEL.hub, cy + dy * WHEEL.hub], [cx + dx * WHEEL.rIn, cy + dy * WHEEL.rIn], z, P);
  }
  return d;
}

export const wheelAngle = (yoke) => 0.35 - yoke * WHEEL.turns * 2 * Math.PI;

// every attribute the pose sets
export function viewOf(pose) {
  const ram = translateAlong(P, [0, 0, -1.6 * pose.ram]); // punches stop on the die
  return {
    probe: translateAlong(P, [(PROBE_END - PROBE_HOME) * pose.probe, 0, 0]),
    yoke: translateAlong(P, [0, 0, -YOKE_LIFT * pose.yoke]),
    hold: translateAlong(P, [0, 0, YOKE_LIFT * pose.yoke]),
    card: translateAlong(P, [pose.card.dx, pose.card.dy, pose.card.dz]),
    cardClip: pose.card.dz < -0.01,
    cardLit: pose.card.lit,
    rows: pose.card.rows,
    ram,
    // only the punches whose hole is set in this row ride the ram down; the rest stay up in its bores
    pins: Array.from({ length: CARD_COLS }, (_, col) => (pose.punchRow >= 0 && HOLES[pose.punchRow][col] ? ram : "translate(0 0)")),
    ledgeL: translateAlong(P, [-1.8 * pose.ledge, 0, 0]),
    ledgeR: translateAlong(P, [1.8 * pose.ledge, 0, 0]),
    bridge: translateAlong(P, [0, READ.span * pose.bridge, 0]),
    needle: needleAt(pose.needle),
    bars: pose.trim.map((angle, index) => slotsOf(barPaths(index, angle))),
    stripes: pose.trim.map((angle, index) => barStripe(index, angle)),
    witness: pose.witness,
    spokes: spokesAt(wheelAngle(pose.yoke)),
    probeLamp: pose.probeLamp,
    lamps: pose.lamps,
  };
}
