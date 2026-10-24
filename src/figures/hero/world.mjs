// World layout for Fig 1, the checkweigher. One unit is about 1 cm of the real thing (so g = 981 units/s²), z up, bench top at z = 0.
import { fitProjection, boxCorners, iso } from "../kit/iso-kit.mjs";

export const PLATE = { x: -134, y: -74, w: 228, d: 118, r: 10 };
export const PLATE_H = 10;
export const FOOT_H = 5;

// One line along x at y = 0. Every belt runs at the same height and speed; the side plates sit at y ±12..±14.
export const BELT = { y0: -12, y1: 12, top: 28, rr: 2.6 };
export const FRAME = { y: 14, z0: 19.4, z1: 27.6 };
export const CONV = {
  infeed: { x0: -88, x1: -40 },
  weigh: { x0: -37, x1: -7 },
  outfeed: { x0: -4, x1: 56 },
};

export const HOUSING = { x0: -124, x1: -90, y0: -22, y1: 22, z0: 4, z1: 58 };
export const SLOT = { y0: -10, y1: 10, z0: BELT.top, z1: 42, depth: 16 };
export const DOWN = { x0: 58, x1: 84, y0: -20, y1: 20, z1: 48 };

// The control cabinet behind the weigh station carries the display head, the stack light, the knob and the journal printer.
export const CAB = { x0: -66, x1: -14, y0: -70, y1: -36, z1: 46 };
export const POST = { x: -40, y: -60, r: 2.4 };
export const HEAD = { x0: -56, x1: -24, y0: -63.5, y1: -56.5, z0: 72, z1: 90 };
export const LAMP = { x: -40, y: -60, z0: 90, r: 3.8, tier: 8.4 };
export const KNOB = { x: -54, y: -46.5, r: 6, h: 5, dial: 9.5 };
export const PRINTER = { x0: -36, x1: -15, y0: -48, y1: -36, z0: 46, z1: 53 };
// The printed strip hangs in front of the cabinet face and curls once it reaches the bottom of its drop.
export const STRIP = { x0: -33, x1: -18, y: -35.5, top: 51, drop: 21, pitch: 2.4 };

// The weigh station: a single-point load cell cantilevered from a pedestal, read through a junction box on the bench.
export const CELL = { x0: -36, x1: -8, y0: 4, y1: 13, z0: 12, z1: 20 };
export const PEDESTAL = { x0: -38, x1: -27, y0: 2, y1: 15, z1: 12 };
export const JBOX = { x0: -34.5, x1: -26.5, y0: 19, y1: 25, z1: 8 };
export const PLUG = { y: 22, z: 2.2, socket: -26.5, travel: 3.6 };

export const PUSH = { x: 24, z: 30.8, rodR: 1.4, glandY: -19, tipY: -10.4, stroke: 23, padT: 1.4 };
export const EYE = { x: -44 };

export const TRAY = { l: 20, w: 16, h: 4, t: 0.8 };

// The camera: azimuth 45, elevation 30, fitted to the width; the height follows the drawing.
const POINTS = [
  ...boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [LAMP.x - 6, LAMP.y - 6, 126],
  [LAMP.x + 6, LAMP.y + 6, 126],
  ...boxCorners({ x: HOUSING.x0, y: HOUSING.y0, w: HOUSING.x1 - HOUSING.x0, d: HOUSING.y1 - HOUSING.y0 }, 0, HOUSING.z1 + 8),
];
const PAD = 22;
export const W = 600;
const unit = POINTS.map((p) => iso(p, { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 }));
const spanX = Math.max(...unit.map((p) => p[0])) - Math.min(...unit.map((p) => p[0]));
const spanY = Math.max(...unit.map((p) => p[1])) - Math.min(...unit.map((p) => p[1]));
export const H = Math.ceil(Math.max(W * 0.75, (spanY * (W - PAD * 2)) / spanX + PAD * 2));
export const P = fitProjection(POINTS, W, H, { pad: PAD, azimuth: 45, elevation: 30 });
