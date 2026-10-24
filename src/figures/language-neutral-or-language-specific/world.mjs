// World layout for Fig 5, the slice model. Pure ESM, shared by the build (art.mjs) and the page (live.js).
// Units: about 1 px of the instrument, z up, bench top at z = 0, everything on the bench axes.
// Camera: azimuth 45, elevation 30; +x runs to the lower right, +y to the lower left, the viewer stands at +x +y.
import { fitProjection, boxCorners, iso } from "../kit/iso-kit.mjs";

export const W = 600;
const H2 = Math.SQRT1_2;
export const ACROSS = [H2, -H2, 0]; // screen right
export const TOWARD = [H2, H2, 0]; // toward the viewer, level

// The bench.
export const PLATE = { x: -150, y: -80, w: 300, d: 160, r: 10 };
export const PLATE_H = 12;
export const FOOT_H = 6;

// ---------------------------------------------------------------- the slice model
// Plates carry the brain in its own RAS frame: +x (subject right) along +x, +y (anterior) along +y, seen from above.
export const RC = [10, -10]; // plan centre of the plates
export const M = 0.42; // etch scale, units per mm
export const BRAIN_C = [0, -16]; // the brain point (mm) at the plate centre
export const brainUV = (x, y) => [(x - BRAIN_C[0]) * M, (y - BRAIN_C[1]) * M]; // plate-local, from RC
export const SLAB = { w: 68, d: 84, t: 2, r: 3, notch: 2.6 };
export const BASE = { u: 50, v: 58, z0: 3, z1: 20, r: 3 }; // half extents of the base block, about RC
export const PLINTH = { u: 53, v: 61, z1: 3, r: 4 };
// Two guide posts stand off the plates' left and right corners, along the screen's horizontal.
export const POST_E = 14;
export const POST_R = 1.9;
export const POSTS = [
  [-SLAB.w / 2 - POST_E * H2, SLAB.d / 2 + POST_E * H2],
  [SLAB.w / 2 + POST_E * H2, -SLAB.d / 2 - POST_E * H2],
];
export const postXY = (side) => [RC[0] + POSTS[side][0], RC[1] + POSTS[side][1]];
// Each plate is clamped by a tab to a hub that slides on its post; lazy tongs space the hubs.
export const HUB = { r: 4.2, h: 4.4 }; // the collar's front touches the tongs' back layer (TONG.off - TONG.t)
export const TAB = { w: 2.6, t: 0.8, over: 6 }; // half width, thickness, overlap onto the plate corner
export const ZB = 22.5; // bottom pivots of the lazy tongs
export const G_REST = 12 * M; // plate pitch at anatomical spacing, 12 mm between the sampled planes
export const G_FAN = 30; // plate pitch with the lever up
export const plateZ = (i, g) => ZB + (i + 0.5) * g; // mid-height of plate i
export const pitchOf = (fan) => G_REST + (G_FAN - G_REST) * fan;
export const TONG = { off: 5, half: 16.5, w: 1.05, t: 0.8 }; // plane in front of the post, half bar, bar half-width, layer thickness
export const tongHalf = (g) => Math.sqrt(Math.max(0, TONG.half * TONG.half - (g / 2) * (g / 2)));
export const POST_TOP = plateZ(9, G_FAN) + G_FAN / 2 + 3;
// The lever on the base's right face (+x), swinging in the y-z plane; the component selector on its left face (+y).
export const LEVER = { y: RC[1] - 10, z: 11.5, len: 17, rest: -15, pulled: 62, x: RC[0] + 50 }; // down (rest) stacks the plates
export const SELECT = { x: RC[0] + 22, z: 11.5, r: 4.2, y: RC[1] + 58 };

// ---------------------------------------------------------------- the decomposition bench (left)
export const BB = { x: -147, y: 14, w: 84, d: 62, r: 3, z0: 3, z1: 8 };
export const BEAM_Z = 24;
export const ROW_X = [-136, -122, -108]; // EN, FR, ZH lamp rows; light runs along -y, away from the viewer
export const LAMP_Y = 58; // lamp lens
export const SLIDE_Y = 51; // encoder slide plane
export const SLIDE_LIFT = 8; // the slide rises this far to put its NLLB row of windows in the beams
export const BUS_S = 27; // SHARED bus (y), light runs along +x
export const BUS_P = 42; // SPECIFIC bus (y), in front of the SHARED bus
export const PICK_X = -90; // pick-off splitter on the SHARED bus, feeding the analyser's reference port
export const COUPLER_X = -80; // coupler mouths; the couplers run along +x to COUPLER_X + 9
export const MIRROR = { r: 3.6, lift: 6 };
export const BRIDGE = { z0: 42, z1: 45, x0: ROW_X[0] - 7, x1: ROW_X[2] + 7 };
export const RODS = [ROW_X[0] - 7, ROW_X[2] + 7];

// ---------------------------------------------------------------- the X-Y recorder (right, back)
export const REC = { x0: 75, x1: 146, y0: -76, y1: -34, panel: 14, bed: 42 };
export const BED_DIR = [0, -0.5, Math.sqrt(3) / 2]; // up the bed
export const BED_N = [0, Math.sqrt(3) / 2, 0.5]; // out of the bed
export const BED_O = [REC.x0, REC.y1, REC.panel];
export const bedPt = (a, b, lift = 0) => [BED_O[0] + a, BED_O[1] + b * BED_DIR[1] + lift * BED_N[1], BED_O[2] + b * BED_DIR[2] + lift * BED_N[2]];
export const PAPER = { a0: 6, a1: 70, b0: 5, b1: 40 };
export const CHART = { a0: 13, a1: 65, b0: 10, b1: 36, top: 0.12 };

// ---------------------------------------------------------------- the meter desk (right, front)
export const DESK = { x0: 84, x1: 146, y0: 14, y1: 44, lip: 6, face: 28 };
export const FACE_DIR = [0, -0.5, Math.sqrt(3) / 2]; // up the face
export const FACE_N = [0, Math.sqrt(3) / 2, 0.5]; // out of the face
export const facePt = (a, b, lift = 0) => [DESK.x0 + a, DESK.y1 + b * FACE_DIR[1] + lift * FACE_N[1], DESK.lip + b * FACE_DIR[2] + lift * FACE_N[2]];
export const DESK_TOP = DESK.lip + DESK.face * FACE_DIR[2];
export const METER_R = 8.6;
export const METERS = [12, 31, 50].map((a) => ({ a, b: 13 }));

const POINTS = [
  ...boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...[0, 1].map((s) => [...postXY(s), POST_TOP + 4]),
];
const PAD = 18;
export const H = 640;
export const P = fitProjection(POINTS, W, H, { pad: PAD, azimuth: 45, elevation: 30 });

// Affine maps to the screen as SVG matrices: a plane given by its origin and two in-plane axes (world vectors).
const r4 = (n) => Math.round(n * 10000) / 10000;
export function planeMatrix(o, a, b) {
  const p = iso(o, P);
  const pa = iso([o[0] + a[0], o[1] + a[1], o[2] + a[2]], P);
  const pb = iso([o[0] + b[0], o[1] + b[1], o[2] + b[2]], P);
  return [pa[0] - p[0], pa[1] - p[1], pb[0] - p[0], pb[1] - p[1], p[0], p[1]].map(r4);
}
// Plate top at height z: (u, v) along x and y, from RC.
export const plateMatrix = (z) => planeMatrix([RC[0], RC[1], z], [1, 0, 0], [0, 1, 0]);
// A tong plane: (u, z) with u to screen right, z up, at the post, offset s toward the viewer.
export const tongMatrix = (side, s) => {
  const [x, y] = postXY(side);
  return planeMatrix([x + TOWARD[0] * s, y + TOWARD[1] * s, 0], ACROSS, [0, 0, 1]);
};
// The base's right face (+x): (w, z) with w along -y (screen right), z up.
export const leverMatrix = (x) => planeMatrix([x, LEVER.y, 0], [0, -1, 0], [0, 0, 1]);
// The meter face, lifted off the panel: (a, b) with b up the face.
export const deskFaceMatrix = (lift) => planeMatrix(facePt(0, 0, lift), [1, 0, 0], FACE_DIR);
// The recorder bed, lifted off it: (a, b) with b up the bed.
export const bedMatrix = (lift) => planeMatrix(bedPt(0, 0, lift), [1, 0, 0], BED_DIR);
