// Upright round parts drawn with true ellipse arcs. At azimuth 45° a horizontal circle projects to an axis-aligned
// ellipse (rx = k·r, ry = k·r·sin e), so a cylinder is four arcs and two lines instead of a 120-point polygon.
// The side tones follow the kit's extrude rule exactly: shade = floor((n·l + 1) / 2 · 4), with the band edges solved.
import * as k from "../kit/iso-kit.mjs";

const n1 = (v) => {
  const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t;
};
const pt = ([x, y]) => `${n1(x)} ${n1(y)}`;

function ellipseOf(cx, cy, r, z, P) {
  if (Math.abs((P.azimuth ?? 45) - 45) > 1e-9) throw new Error("round.mjs needs azimuth 45");
  const { k: K, sinE } = k.cameraOf(P);
  const [sx, sy] = k.iso([cx, cy, z], P);
  const rx = K * r;
  const ry = K * r * sinE;
  // tau is the screen parameter: 0 right, 90 bottom (front), 180 left, 270 top (back)
  return { at: (tau) => [sx + rx * Math.cos(tau), sy + ry * Math.sin(tau)], rx, ry, arc: `A${n1(rx)} ${n1(ry)} 0 ` };
}
const DEG = Math.PI / 180;
// visible side: tau in (0, 180); the kit's tone bands change at world angles 15°, 45°, 75°, i.e. tau = 60°, 90°, 120°
const BANDS = [[0, 60], [60, 90], [90, 120], [120, 180]];

// full ellipse on a top face (grooves, bezels, screw rings)
export function ellipseRing(cx, cy, r, z, P) {
  const E = ellipseOf(cx, cy, r, z, P);
  return `M${pt(E.at(0))}${E.arc}1 1 ${pt(E.at(Math.PI))}${E.arc}1 1 ${pt(E.at(0))}Z`;
}
// the front half of a horizontal circle on a cylinder side (seams and bands), limb to limb
export function frontArc(cx, cy, r, z, P) {
  const E = ellipseOf(cx, cy, r, z, P);
  return `M${pt(E.at(0))}${E.arc}0 1 ${pt(E.at(Math.PI))}`;
}
// an arc of a ring on a top face between two world angles (radians), drawn the short way in increasing angle
export function arcOnTop(cx, cy, r, z, a0, a1, P) {
  const E = ellipseOf(cx, cy, r, z, P);
  const t0 = a0 + 45 * DEG;
  const t1 = a1 + 45 * DEG;
  return `M${pt(E.at(t0))}${E.arc}${t1 - t0 > Math.PI ? 1 : 0} 1 ${pt(E.at(t1))}`;
}

// an upright cylinder as SolidPaths: fill, four side tones, top, crease, bevel and outline
export function roundSolid(cx, cy, r, z, h, P, bevel = 0) {
  const T = ellipseOf(cx, cy, r, z + h, P);
  const B = ellipseOf(cx, cy, r, z, P);
  const top = `M${pt(T.at(0))}${T.arc}1 1 ${pt(T.at(Math.PI))}${T.arc}1 1 ${pt(T.at(0))}Z`;
  const outline = `M${pt(T.at(0))}${T.arc}0 0 ${pt(T.at(Math.PI))}L${pt(B.at(Math.PI))}${B.arc}0 0 ${pt(B.at(0))}Z`;
  const shades = ["", "", "", ""];
  if (h > 0)
    BANDS.forEach(([a, b], i) => {
      shades[i] = `M${pt(T.at(a * DEG))}${T.arc}0 1 ${pt(T.at(b * DEG))}L${pt(B.at(b * DEG))}${B.arc}0 0 ${pt(B.at(a * DEG))}Z`;
    });
  const crease = `M${pt(T.at(Math.PI))}${T.arc}0 0 ${pt(T.at(0))}`;
  let bev = "";
  if (bevel > 0 && r > bevel * 2) {
    const I = ellipseOf(cx, cy, r - bevel, z + h, P);
    const e = Math.min(0.5, Math.acos((r - bevel) / r) + 0.05);
    bev = `M${pt(T.at(0))}L${pt(I.at(e))}${I.arc}0 1 ${pt(I.at(Math.PI - e))}L${pt(T.at(Math.PI))}`;
  }
  return { fill: outline, outline, crease, top, shades, bevel: bev };
}

// the visible front of a thin band on a cylinder's side (a belt in its groove): limb to limb, with the kit's side tones
export function sideBand(cx, cy, r, z, h, P) {
  const T = ellipseOf(cx, cy, r, z + h, P);
  const B = ellipseOf(cx, cy, r, z, P);
  const outline = `M${pt(T.at(0))}${T.arc}0 1 ${pt(T.at(Math.PI))}L${pt(B.at(Math.PI))}${B.arc}0 0 ${pt(B.at(0))}Z`;
  const { shades } = roundSolid(cx, cy, r, z, h, P);
  return { fill: outline, outline, crease: "", top: "", shades, bevel: "" };
}
