// Invisible pointer targets. Each lever's target is a narrow hull round its stem, catch handle and grip at the lever's
// current angle (live.js moves it with the lever), plus its tappet's visible run and its repeater; then the commutator and
// the domain knob. Stems come last, in lever order, so where two overlap on screen the nearer lever takes the pointer.
import * as k from "../kit/iso-kit.mjs";
import { hullOf } from "../kit/lathe.mjs";
import { P, LX, PIVOT, FACE_Y, COMMUTATOR, DOMAIN_KNOB } from "./scene.mjs";
import { SLOT_LEVERS, thetaOf } from "./model.mjs";

const at = (p) => k.iso(p, P).map(Math.round); // invisible targets need no sub-pixel precision
const hull = (points) => k.pathOf(hullOf(points.map(at)), true);

export function leverHit(i, stroke) {
  const [s, c] = [Math.sin(thetaOf(stroke)), Math.cos(thetaOf(stroke))];
  const points = [];
  for (const t of [22, 101]) for (const w of [-4.4, 2]) for (const dx of [-1.6, 1.6]) points.push([LX[i] + dx, PIVOT[0] + t * s + w * c, PIVOT[1] + t * c - w * s]);
  return hull(points);
}

export function hitPolygons(strokes) {
  const out = [];
  const box = (key, x, w, z0, z1, y0, y1) => {
    const points = [];
    for (const dx of [-w, w]) for (const z of [z0, z1]) for (const y of [y0, y1]) points.push([x + dx, y, z]);
    out.push({ key, d: hull(points) });
  };
  LX.forEach((x, i) => box(`lever${i}`, x, 4.5, 3.4, 3.4, 6, 54)); // the tappet's run in the tray
  for (const i of SLOT_LEVERS) box(`lever${i}`, LX[i], 5, 126, 143.5, FACE_Y - 7, FACE_Y + 0.5);
  box("target", COMMUTATOR.x, 5, 126, 143.5, FACE_Y - 7, FACE_Y + 3);
  box("domain", DOMAIN_KNOB.x, 5, 126, 143.5, FACE_Y - 7, FACE_Y + 3);
  LX.forEach((_, i) => out.push({ key: `lever${i}`, stem: i, d: leverHit(i, strokes[i]) }));
  return out;
}
