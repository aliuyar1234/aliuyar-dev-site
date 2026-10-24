// Fig 19 world: plans, heights and the camera. World units are about 1 px; z up, table top at z = 40.
import { fitProjection, boxCorners } from "../kit/iso-kit.mjs";
import { TABLE_TOP, ECC, onArc, A_REST } from "./model.mjs";

export const W = 600;
export const H = 470;
export const BENCH = { x: -100, y: -64, w: 196, d: 118, r: 9 };
export const BENCH_H = 10;
export const FOOT_H = 5;

// press frame
export const PLINTH = { x: -36, y: -58, w: 64, d: 96, r: 4 }; // z 0..4
export const HOUSING = { x: -32, y: -34, w: 56, d: 64, r: 3 }; // z 4..34
export const COLUMN = { x: -15, y: -54, w: 30, d: 20, r: 3 }; // z 4..104
export const TABLE = { x: -54, y: -34, w: 82, d: 76, r: 4 }; // z 34..40
export const HEAD = { x: -15, y: -34, w: 30, d: 43, r: 3 }; // z 86..104
export const TT = TABLE_TOP;
export const HEAD_Z = [86, 104];
// stroke counter on the head's front: a box with a small dial, one turn of the hand per 200 strokes
export const COUNTER = { box: { x: -8, y: HEAD.y + HEAD.d, w: 16, d: 4, r: 0.8 }, z: [90, 102], c: [0, HEAD.y + HEAD.d + 4, 96], r: 4.6 };

// drive: shaft along x through two pillow blocks on the head
export const SHAFT = { y: 0, z: 121, r: 3 };
export const BLOCKS = [-14, 6]; // x of each pillow block, 8 wide
export const SHEAVE = { r: 7, x: [-4, 4] };
export const STRAP = { r: [7, 9.5], x: [-3, 3] };
export const ROD = 26; // eccentric centre to crosshead pin
export const FLY = { c: [27, 0, 121], x: [24, 30], rIn: 20, rOut: 24, hubR: 5.5, hub: [22, 32], spokes: 5 };
export const HANDLE_R = 22;

// upper punch assembly, drawn at top dead centre
export const UP = { tip: 50, punch: 2.9, holder: [56, 60], holderR: 6, ram: 2.6, nut: [72, 76], nutR: 6, spring: 4.5, free: 8, bush: [82, 86], bushR: 5.2 };
export const NUT_DOWN = 6; // the tension knob screws this far down for D2: the free spring (4 short of the nut) is caught and preloaded by 2
export const STROKE = 2 * ECC;

// feed: hopper over the shoe's rest position
export const HOP = (() => {
  const [x, y] = onArc(A_REST);
  return { c: [x, y], neck: [47, 62], neckR: 4.2, top: 86, rimTop: 87.6, outR: [4.6, 13.4], inR: [3.6, 12.4], lipR: 14.6, fill: 85 };
})();
export const HOP_POST = [-46, 18];
export const SCREEN = { rIn: 10.6, rOut: 14.4, z: 87.6, h: 1.2, lift: 14, rods: [150, -150], rodR: 16.5, rodTop: 106 };

// output
export const TRAY = { x: 36, y: 4, w: 34, d: 30, r: 2.5 };
export const TESTER = { x: 64, y: -50, w: 28, d: 30, r: 3 };
export const DIAL_AT = [77, -30];
export const PLUNGE = 2.4; // plunger travel: its tip comes down onto the sample
export const DIAL_R = 13;
export const DIAL_Z = [47, 53];
export const CONSOLE = { x: -96, y: 14, w: 36, d: 34, r: 3 };
export const CON_H = 12;
export const KNOB = [-84, 25];
export const SLIDE = { y: 40, x: [-90, -70], at: [-84.5, -75.5] };

const FIT = fitProjection(
  [
    ...boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [FLY.c[0], 0, FLY.c[2] + FLY.rOut],
    [FLY.c[0], -FLY.rOut, FLY.c[2]],
    [44, 0, FLY.c[2] + HANDLE_R + 3],
    [0, 0, SHAFT.z + ECC + STRAP.r[1]],
    [HOP.c[0] - SCREEN.rodR, HOP.c[1], SCREEN.rodTop + 2],
  ],
  W,
  H,
  { pad: 26 },
);
// the catalogue's world scale (the sibling plates sit at about 1.43 to 1.62), centred where the fit centres the press
export const SCALE = 1.56;
const mid = [(W / 2 - FIT.origin[0]) / FIT.scale, (H / 2 - FIT.origin[1]) / FIT.scale];
export const P = { ...FIT, scale: SCALE, origin: [W / 2 - mid[0] * SCALE, H / 2 - 6 - mid[1] * SCALE] };
