// Fig 18 · world layout of the still and the parts that move. Shared by geometry (build time) and live (browser).
// Units are about 1 px of the real thing: x, y on the bench, z up. The glass train lies in the plane y = 0.
import * as k from "../kit/iso-kit.mjs";

export const WIDTH = 620;
export const HEIGHT = 600;

export const BENCH = { x: -106, y: -52, w: 184, d: 98, r: 8 };
export const BENCH_H = 12;
export const FOOT_H = 5;

export const STAND = { x: -102, y: -23, w: 80, d: 46, r: 4 }; // cast base of the retort stand
export const STAND_H = 5;
export const ROD = [-86, 0];
export const ROD_R = 2.2;
export const ROD_TOP = 152;

export const GX = -46; // axis of flask, column and still head
export const FLASK_R = 16.5;
export const FLASK_C = 36;
export const MANTLE = { r: 22, z0: STAND_H, z1: FLASK_C - 0.15 }; // the mantle cups the lower half of the flask
export const OPENING = Math.sqrt(FLASK_R ** 2 - (FLASK_C - MANTLE.z1) ** 2);
export const NECK_R = 4.6;
export const NECK_TOP = 60;
export const LIQUID = FLASK_C + 1.5; // level of the charge in the flask

export const COLUMN = { r: 6, z0: 66, z1: 116 };
export const ROWS = /* @__PURE__ */ Array.from({ length: 12 }, (_, i) => 70 + i * 3.8); // one row of indentations per TTT step
export const HEAD_SOCKET = [116, 122];
export const BULB = { c: [GX, 0, 136], r: 11 };
export const PIVOT = [GX, 0, 138.5]; // the swing funnel hangs from a pin across y
export const FUNNEL = [[-1.8, 4.1], [-1.4, 4.2], [2.9, 1.0], [7.2, 0.78]]; // [s down the funnel, r]
export const SWING = 32 * (Math.PI / 180); // open: the spout swings toward the take-off arm
export const THERMO = { r: 2, z0: 160, z1: 194, scale0: 163, scale1: 190, lo: 0.8, hi: 1.0 };
export const zOfReward = (value) => THERMO.scale0 + ((value - THERMO.lo) / (THERMO.hi - THERMO.lo)) * (THERMO.scale1 - THERMO.scale0);
export const CUT = zOfReward(0.95); // height of the cut collar: the take-off threshold

const DEG = Math.PI / 180;
export const ARM_DIR = [Math.cos(30 * DEG), 0, -Math.sin(30 * DEG)]; // take-off arm and condenser, 30° down toward +x
export const along = (s) => [BULB.c[0] + ARM_DIR[0] * s, 0, BULB.c[2] + ARM_DIR[2] * s];
export const COND = { inner: 2.6, jacket: 6.4, j0: 33, j1: 81, barbs: [36, 78] };

export const DROP_X = 48; // axis of the drip tip and the receiver
export const RECEIVER = { base: 27, r: 14, top: 52, neck: 4.2, mouth: 64 };
export const JACK = { x: DROP_X - 15, y: -15, w: 30, d: 30, top: RECEIVER.base };

export const S2 = 56; // where the condenser clamp holds the jacket
export const ROD2 = [along(S2)[0], -19];
export const HOSE_Y = -26; // the upper hose drops here, left of the second rod
export const OUTLET = [68, -40]; // the lower hose's bench fitting, out right beyond the receiver

export const CTRL = { x: -100, y: 27, w: 50, d: 17, r: 2, h: 13 };
export const HEAT_KNOB = [CTRL.x + 12, CTRL.y + 8.5];
export const MODE_KNOB = [CTRL.x + 29, CTRL.y + 8.5];
export const LAMP = [CTRL.x + 42, CTRL.y + 6];

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [GX, 0, THERMO.z1 + 2.5], [ROD[0], ROD[1], ROD_TOP + 2]],
  WIDTH,
  HEIGHT,
  { pad: 22, headroom: 4 },
);
export const at = (point) => k.iso(point, P);

// receiver liquid: a frustum of the cone, filled up to height h above the inner floor
export const RECEIVER_FLOOR = RECEIVER.base + 1.2;
export const FULL = 17; // the 300 SDFT steps raise the level this far
export const receiverRadius = (z) => RECEIVER.r - 1.1 - ((z - RECEIVER.base) / (RECEIVER.top - RECEIVER.base)) * (RECEIVER.r - RECEIVER.neck);
export const levelOf = (share) => RECEIVER_FLOOR + 0.3 + FULL * share;
