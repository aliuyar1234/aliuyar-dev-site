// Fig 17 world: the camera and every dimension of the test manifold, in world units (about 1 px), z up.
// Pure ESM: shared by the build, the static art and the live page.
import * as k from "../kit/iso-kit.mjs";

export const WIDTH = 600;
export const HEIGHT = 450;

// bench base (the reservoir) on four feet, set in from the corners so the near ones show under the front edge
export const BASE = { x: -146, y: -64, w: 296, d: 76, r: 8 };
export const BASE_H = 12;
export const FOOT_H = 7;
export const FOOT = { inset: 13, r: 7, r1: 5.4, plinth: 1.8 };

// the bank: eight three-way ball valves r0..r7 standing between the supply header (top) and the reference header (below).
// Inlets top and bottom, outlet to the back, stem and lever to the front.
export const N = 8;
export const XB = Array.from({ length: N }, (_, i) => -63 + 18 * i);
export const YB = -22;
export const SUP = { y: YB, z: 122, r: 4.5, x1: 86 };
export const REF = { y: YB, z: 52, r: 4.5, x0: -92, x1: 92 };
export const PAD = { a: 2.8, s: 7.5 }; // weld pads on the headers: radius, face distance from the header axis
export const VALVE = { z: 87, nip: 2.2, nut: 4.3, nutH: 3.4, neck: 3.7, neckH: 8.6, bulge: 7, half: 7, port: 2.6, portH: 10, stem: 2.2, stemH: 10.6 };
// the lever: a flat steel bar and a vinyl grip. With valves 18 apart, a lever that swings between up and down passes
// level, where any lever much longer than this would meet the neighbouring hub; its three positions are what read.
export const LEVER = { len: 14, grip: 6, w: 3, t: 1.3, gripR: 1.9 };
// the stop plate behind each bank hub, a detent mark at each lever position
export const STOP = { r: 4.6, t: 0.7 };

// branch line: outlet back to the collecting header's plane, then down onto it
export const YC = -49;
export const COL = { y: YC, z: 22, r: 4.5, x0: -76 };
export const LINE_R = 2;
export const PEDS = [-40, 40]; // pedestals under the collecting header

// aggregator: the series three-way valve under the meter, in line with the collecting header. Collected flow in
// at its -x end, reference feed in at its front (+y) boss, outlet up into the meter, stem and lever out of its +x end.
export const AGG = { x: 112, y: YC, z: 22, half: 9, bulge: 7, end: 4.8 };

// rotameter
export const METER = { x: 112, y: YC, block: 18, z0: 32, z1: 41, glass0: 43, glass1: 127, top0: 129, top1: 138, r: 5.4 };
export const SCALE = { z0: 51, per: 60, max: 1.2 }; // reading m maps to z = z0 + m * per
export const zOf = (m) => SCALE.z0 + Math.max(0, Math.min(SCALE.max, m)) * SCALE.per;

// stand posts behind the headers, pump at the left, console front left, maker's plate front right
export const POSTS = [-72, 72];
export const GAUGE = { x: -92, z: 146, r: 7.5, t: 3.6 }; // supply pressure gauge on the header crown
export const POST_Y = -36;
export const PUMP = { x: -118, y: YB, z: 17, volute: 11 };
export const CONSOLE = { x: -110, y: -13, w: 36, d: 22, r: 3 };
export const CONSOLE_H = 14;
export const KNOB = [-95, -1];
export const LABEL = { x: 98, y: -7, w: 40, d: 10, r: 1 };
export const RULE = { x: -60, w: 148 };

// lever angles in each lever's swing plane. Bank levers (x-z plane, 0 = +x): up toward the supply header keeps the node
// live, down toward the reference header resamples it, and the middle position, level across the card to the right,
// is shut (the node is not in the planted model). Each angle is where the grip ends clear of every outline near it.
// The aggregator's lever (y-z plane, 0 = toward the viewer): up for the collected flow, down for the reference feed,
// the middle position for shut.
export const DEG = Math.PI / 180;
export const THROW = { live: 94 * DEG, ref: -105 * DEG, shut: 24 * DEG };
export const AGG_THROW = { live: 68 * DEG, ref: -42 * DEG, shut: 12 * DEG };

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [POSTS[0], POST_Y, SUP.z + 12],
    [POSTS[1], POST_Y, SUP.z + 12],
    [METER.x, METER.y, METER.top1 + 2],
    [PUMP.x, YB, SUP.z + 6],
    [GAUGE.x, YB, GAUGE.z + GAUGE.r + 1],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 45 },
);

// the redundancy selector: one detent per planted factor r = 1, 2, 4, 8 (angle 0 points to -y, clockwise from above)
export const KNOB_ANGLES = [-60, -20, 20, 60].map((a) => a * DEG);
export const knobAngleOf = (r) => KNOB_ANGLES[[1, 2, 4, 8].indexOf(r)];
export function pointerOf(r, angle = knobAngleOf(r)) {
  const [x, y] = KNOB;
  return k.lineOnTop([x - Math.sin(angle) * 1.4, y + Math.cos(angle) * 1.4], [x + Math.sin(angle) * 4.6, y - Math.cos(angle) * 4.6], CONSOLE_H + 5.2, P);
}
