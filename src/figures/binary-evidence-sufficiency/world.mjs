// Fig 11 · world plan. Units are about 1 px, x and y on the bench, z up. The beam runs along +x at (YB, ZB),
// above the cuvette holders and below the meniscus, so it crosses clear glass and liquid only.
import * as k from "../kit/iso-kit.mjs";

export const WIDTH = 600;
export const HEIGHT = 400;

export const BENCH = { x: -128, y: -94, w: 248, d: 148, r: 8 };
export const BENCH_H = 12;
export const FOOT_H = 5;
export const YB = 7;
export const ZB = 30;

export const LAMP = { x: -118, y: -13, w: 40, d: 40, r: 3 };
export const LAMP_TOP = 58;
export const MONO = { x: -72, y: -17, w: 54, d: 48, r: 3 };
export const MONO_TOP = 46;
export const COMP = { x: -8, y: -36, w: 56, d: 56, r: 2 };
export const COMP_FLOOR = 4;
export const RIM = 10;
export const WALL = 3;
// the open lid stands on the deck behind the compartment; closed, it would cover the rim up to RIM + d = 62,
// its inner ceiling (59.5) clear of the turret knob (58)
export const HOOD = { x: -8, y: -88, w: 56, d: 52, z0: 10, z1: 66 };
export const DECK = { x: -8, y: -88, w: 56, d: 52, r: 2 };
// detector can: flange at x0, body radius r, carried by two clamp bands on saddle posts
export const DET = { x0: 70, r: 9.5, flange: 11.5, body: 34, len: 40, bands: [9, 27], band: 3, post: 2.6 };
export const PORT = { x0: 38 };
export const BOX = { x: 76, y: -32, w: 34, d: 24, r: 2 };
export const BOX_TOP = 44;
export const TRAY = { x: 6, y: 26, w: 40, d: 17, r: 2 };
export const TRAY_TOP = 5;
export const LABEL = { x: 66, y: 33, w: 46, d: 14, r: 1.5 };
export const RULER = { x: -118, y: 44, w: 100, d: 5, r: 1 };

// the turret: four cells at radius 15 round (T.x, T.y); cell i sits in the beam when the turret angle is -90 i degrees.
// Each cuvette stands in a holder sleeve and rises out of its top face. The mask spider rides the centre post:
// parked against the knob, or lowered LIFT so its four caps seat on the cuvettes.
export const T = {
  x: 20, y: -8, disc: 24, z0: 14, z1: 18, cell: 15, holder: 6, holderTop: 24,
  cuvette: 5, cuvetteTop: 44, meniscus: 37.5,
  cap: 5.3, capH: 2.4, arm: 1.1, armH: 1.4, collar: 4.2, collarH: 3, collar0: 45.6, lift: 5.4,
  post: 2.5, knob: 5.6, knob0: 54.4, knob1: 58, notch: 2, notchHalf: 10, plunger: 45,
};
// read-point detents on the wavelength drum (degrees) and on the scale (x of the index)
export const KNOB = { x: -32, y: 10, angles: [-50, 0, 50] };
export const SCALE = { x: -66, y: 24, w: 28, d: 5, r: 1, stops: [-60, -52, -44] };
// filter switch detents (x of the lever) on the detector box
export const SWITCH = { y: -24, stops: [85, 93, 101] };

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...k.boxCorners({ x: HOOD.x, y: HOOD.y, w: HOOD.w, d: HOOD.d }, HOOD.z0, HOOD.z1), [-98, 7, 70]],
  WIDTH,
  HEIGHT,
  { pad: 14 },
);
