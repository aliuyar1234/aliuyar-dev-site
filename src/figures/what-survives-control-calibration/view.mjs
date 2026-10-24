// Fig 15 view: the camera and the per-pose transforms shared by the art, the page and the audit.
import { fitProjection, boxCorners, lineOnTop } from "../kit/iso-kit.mjs";
import { PLATE, FOOT_Z, GX, GY, COL, CASE, CASE_H, LID_H, FRONTIER_TOP, SELECT, KNOB } from "./model.mjs";

export const WIDTH = 600;
export const HEIGHT = 510;
export const GX0 = GX.f; // home: column over the frontier stack
export const H0 = FRONTIER_TOP; // home: scriber on the frontier top

export const P = fitProjection(
  [
    ...boxCorners(PLATE, FOOT_Z, 0),
    [GX.f - 6, GY - 4.6, COL.z1 + 4],
    [GX.c + 6, GY + 4.6, COL.z1 + 4],
    ...boxCorners({ x: CASE.x, y: CASE.y, w: CASE.w, d: 3 }, CASE_H, CASE_H + LID_H),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 45 },
);

// where each moving part sits in a pose, as a world offset from home
export function offsetOf(move, pose) {
  if (move === "gauge") return [pose.gx - GX0, 0, 0];
  if (move === "slider") return [pose.gx - GX0, 0, pose.h - H0];
  if (move === "lift") return [0, 0, pose.lift];
  return [0, 0, 0];
}

// the selector pointer at an angle (0 points to −y, clockwise seen from above)
export function pointerAt(angle) {
  const [kx, ky] = KNOB;
  const z = SELECT.h + 5.6;
  return lineOnTop([kx - Math.sin(angle) * 1.4, ky + Math.cos(angle) * 1.4], [kx + Math.sin(angle) * 4.1, ky - Math.cos(angle) * 4.1], z, P);
}
