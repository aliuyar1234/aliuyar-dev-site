// Fig 6 view: the markup of every part that moves, as a pure function of the pose. art.mjs draws the resting pose with it,
// live.js redraws the same parts each frame with it, so the static art and the live figure cannot drift apart.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces } from "../kit/tube.mjs";
// named imports, so the bundle keeps only the parts of the rig that move
import { BEZEL_S, BRAIN_BASE_H, CORD_R, cordRoute, GALVO_BOX, KNOB, leverAxis, METER_BOX, meterGeometry, onPanel, REST_PLUG, TOGGLE, P } from "./rig.mjs";
const R = { BEZEL_S, BRAIN_BASE_H, CORD_R, cordRoute, GALVO_BOX, KNOB, leverAxis, METER_BOX, meterGeometry, onPanel, REST_PLUG, TOGGLE, P };
import { METER_MAX, CONTRAST_MAX } from "./labels.mjs";

const pp = (u, v, s) => k.iso(R.onPanel(u, v, s), P);
const panelPath = (points, s, closed = false) => k.pathOf(points.map(([u, v]) => pp(u, v, s)), closed);

const ROI_G = R.METER_BOX.map((box) => R.meterGeometry(box, "roi"));
const GALVO_G = R.GALVO_BOX.map((box) => R.meterGeometry(box, "galvo"));
const angleOf = (g, frac) => ((-g.sweep + 2 * g.sweep * Math.max(-0.04, Math.min(1.04, frac))) * Math.PI) / 180;
const tipOf = (g, a, r) => [g.pivot[0] + r * Math.sin(a), g.pivot[1] - r * Math.cos(a)];

// a meter needle from its hub to just short of the scale arc
function needle(g, frac) {
  const a = angleOf(g, frac);
  return panelPath([tipOf(g, a, 0), tipOf(g, a, g.radius - 0.6)], R.BEZEL_S);
}
export const roiNeedle = (i, value) => needle(ROI_G[i], value / METER_MAX);
export const galvoNeedle = (i, value) => needle(GALVO_G[i], 0.5 + value / (2 * CONTRAST_MAX));

// the bootstrap 95% CI as a band just inside the arc, and the triangle marking the planned direction
export function galvoBand(i, ci) {
  // the six-cell mean carries no CI: the band closes to nothing
  if (!ci || Math.abs(ci[1] - ci[0]) < 2e-5) return "";
  const g = GALVO_G[i];
  const f0 = 0.5 + ci[0] / (2 * CONTRAST_MAX);
  const f1 = 0.5 + ci[1] / (2 * CONTRAST_MAX);
  const outer = [];
  const inner = [];
  for (let j = 0; j <= 12; j++) {
    const a = angleOf(g, f0 + ((f1 - f0) * j) / 12);
    outer.push(tipOf(g, a, g.radius - 0.35));
    inner.push(tipOf(g, a, g.radius - 1.9));
  }
  return panelPath([...outer, ...inner.reverse()], R.BEZEL_S, true);
}
export function galvoIndex(i, planned) {
  const g = GALVO_G[i];
  const a = angleOf(g, planned < 0 ? 0.06 : 0.94);
  const tip = tipOf(g, a, g.radius - 3.4);
  const b0 = tipOf(g, a - 0.07, g.radius - 5.6);
  const b1 = tipOf(g, a + 0.07, g.radius - 5.6);
  return panelPath([tip, b0, b1], R.BEZEL_S, true);
}

// the cohort knob's pointer on its top face
export function knobPointer(deg) {
  const a = (deg * Math.PI) / 180;
  const dir = [Math.sin(a), -Math.cos(a)];
  const z = R.BRAIN_BASE_H + 0.5 + R.KNOB.h;
  return k.lineOnTop([R.KNOB.x + dir[0] * 0.5, R.KNOB.y + dir[1] * 0.5], [R.KNOB.x + dir[0] * (R.KNOB.r - 0.25), R.KNOB.y + dir[1] * (R.KNOB.r - 0.25)], z, P);
}

// the model toggle's lever: a tapered bat handle from a pivot ball seated in the bushing, with a ball tip
export function lever(deg) {
  const T = R.TOGGLE;
  const pivot = [T.x, T.y, T.z];
  const axis = R.leverAxis(deg);
  const F = G.frameAlong(pivot, axis);
  const rod = [[0.95, 0.95], [T.length, 0.7]];
  const tip = G.add3(pivot, G.mul3(axis, T.length + Math.sqrt(1.35 ** 2 - 0.7 ** 2)));
  const parts = [
    { paths: G.sphereOf(pivot, 1.4, P, { steps: 28 }), tone: "mid", crease: "faint" },
    { paths: G.solidOf(rod, F, P, { steps: 24 }), tone: "hi", crease: "lo" },
    { paths: G.sphereOf(tip, 1.35, P, { steps: 28 }), tone: "hi", crease: "faint" },
  ];
  return { parts, shapes: [["ball", pivot, 1.4, { seated: true }], ["solid", F, rod], ["ball", tip, 1.35]] };
}

// a solid whose paths live code rewrites in place: always the same children, keyed by data-k
export const SOLID_KEYS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "outline"];
export const solidD = (paths, key) => (key[0] === "s" && key.length === 2 ? paths.shades[Number(key[1])] : paths[key]) || "";
export function fixedSolid(paths, { tone = "hi", crease = "faint", part }) {
  const cls = { fill: "iso-fill", top: "iso-top", crease: "iso-line iso-crease", outline: "iso-line iso-edge" };
  const kids = SOLID_KEYS.map((key) => {
    const extra = key[0] === "s" && key.length === 2 ? ` class="iso-shade" data-shade="${key[1]}"` : ` class="${cls[key]}"${key === "crease" ? ` data-tone="${crease}"` : key === "outline" ? ` data-tone="${tone}"` : ""}`;
    return `<path${extra} data-k="${key}" d="${solidD(paths, key)}"/>`;
  });
  return `<g class="iso-solid" data-part="${part}">${kids.join("")}</g>`;
}

// the patch cord: one piece from the plug's boot to the parked plug, always the top layer
export function cordPieces(foot) {
  return tubePieces(R.cordRoute(foot), R.CORD_R, P, { maxLength: 1000 });
}
// the plug group's screen offset from its resting socket
export function plugOffset(foot) {
  return k.translateAlong(P, [foot[0] - R.REST_PLUG[0], foot[1] - R.REST_PLUG[1], foot[2] - R.REST_PLUG[2]]);
}
