// Fig 6 rig: the world layout, the camera and the moving parts' geometry, shared by the build (art, audit) and live.js.
// World units are about 1 px of the real thing: x and y on the bench, z up. Pure ESM, imports only the kit.
import * as k from "../kit/iso-kit.mjs";

export const WIDTH = 600;
export const HEIGHT = 480;
// 50 rather than the family's 45: the data faces (the card faceplates and the meter panel) all face +y, and 50 opens them up
export const AZIMUTH = 50;

// ------------------------------------------------------------ bench
export const PLATE = { x: -146, y: -60, w: 282, d: 126, r: 10 };
export const PLATE_H = 12;
export const FOOT_H = 5;

// ------------------------------------------------------------ card cage: the transformer, one card per block
export const CAGE = { x0: -125, x1: -19, y0: -52, y1: 26 }; // plinth footprint
export const PLINTH_H = 6;
export const IN = { x0: -120, x1: -24 }; // card zone between the end plates
export const PITCH = 8;
export const CARD_X = (i) => IN.x0 + PITCH / 2 + i * PITCH; // card centre line
export const PANEL_Y = 12; // back face of the faceplates
export const FACE_Y = 15; // front face of the faceplates
export const CARD_TOP = 76; // faceplate top
export const STRIP = { y0: -44, y1: 12, z: 72, top: 76, w: 6.6 };
export const SOCKET_Y = [-36, -23, -10, 3]; // attn, post-attn, ffn, output: back to front, as the rows of paper Fig. 1
export const SOCKET_H = 1.6;
export const SOCKET_TOP = STRIP.top + SOCKET_H;
export const LAMP_DY = 5.6; // the two winner lamps sit in front of their socket, semantic left, auditory right
export const LAMP_DX = 1.65;
export const LAMP = { lens: 1.1, bezel: 1.45, h: 0.6 };
// the level window on each faceplate: four bars, one per state in socket order, mean Δz of the four encoding meters
export const LEVEL = { half: 3.1, z0: 21, z1: 61, bar: 1, gap: 0.5, pad: 0.35, max: 0.1, inset: 0.7 };
export const levelTop = (v) => LEVEL.z0 + LEVEL.inset + (LEVEL.z1 - LEVEL.z0 - 2 * LEVEL.inset) * Math.min(1, v / LEVEL.max);
export const levelX = (s) => -LEVEL.half + LEVEL.pad + s * (LEVEL.bar + LEVEL.gap); // left edge of bar s, from the card centre line

// the plug: nose collar, knurled grip, strain-relief boot; the cord leaves the boot top
export const PLUG = { nose: 1.4, grip: 7, boot: 4.6, rNose: 2.5, rGrip: 2.2, rBoot0: 1.75, rBoot1: 1.15 };
export const PLUG_H = PLUG.nose + PLUG.grip + PLUG.boot;
export const LIFT = 7; // how far the plug rises to clear the sockets when it moves
export const CORD_R = 1.0;

// ------------------------------------------------------------ meter bank: sloped console with four encoding meters and two contrast meters
export const MB = { x0: 4, x1: 128, cheek: 3 };
export const MB_FEET = 3;
// side profile (y, z) of the case body; the cheeks share it, the body between them is inset by 1
export const MB_PROFILE = [[-40, MB_FEET], [22, MB_FEET], [22, 17], [-8, 61], [-40, 61]];
export const MB_TOP = 61;
export const INPUT = { x: 14, y: -24 }; // patch input socket on the case top
// the sloped panel plane: origin at its top-left corner on the inset body, u along +x, v down the slope
const slope = [0, 22 - -8, 17 - 61];
const slopeLength = Math.hypot(slope[1], slope[2]);
export const PANEL = {
  o: [MB.x0 + MB.cheek, -8, 61],
  u: [1, 0, 0],
  v: [0, slope[1] / slopeLength, slope[2] / slopeLength],
  n: [0, -slope[2] / slopeLength, slope[1] / slopeLength],
  w: MB.x1 - MB.x0 - 2 * MB.cheek,
  h: slopeLength,
};
export const onPanel = (u, v, s = 0) => [0, 1, 2].map((i) => PANEL.o[i] + PANEL.u[i] * u + PANEL.v[i] * v + PANEL.n[i] * s);
// encoding meters (top row) and contrast meters (bottom row), in panel coordinates
export const METER_BOX = [
  { u: 4, v: 5, w: 24, h: 20 },
  { u: 31, v: 5, w: 24, h: 20 },
  { u: 63, v: 5, w: 24, h: 20 },
  { u: 90, v: 5, w: 24, h: 20 },
];
export const GALVO_BOX = [
  { u: 4, v: 29.5, w: 40, h: 17.5 },
  { u: 63, v: 29.5, w: 40, h: 17.5 },
];
export const GROOVE_U = 59; // the panel's centre rib between the semantic and auditory halves
// a lamp grid beside each centre-zero meter: rows XLM-R, NLLB; columns EN, FR, ZH
export const GRID_BOX = [
  { u: 46.2, v: 33.6, w: 10.6, h: 9.2 },
  { u: 105.2, v: 33.6, w: 10.6, h: 9.2 },
];
export const GRID_S = 0.9; // the grid plate stands this far off the panel
export const gridLamp = (box, model, lang) => [box.u + 2.2 + lang * 3.1, box.v + 2.75 + model * 3.7];
export const GRID_LENS = 1.05;
export const BEZEL_S = 1.6; // how far a meter bezel stands off the panel
export const meterGeometry = (box, kind) => {
  // an encoding meter pivots at the bottom of its window; a wide contrast meter pivots below its window, behind the bezel,
  // so its long needle sweeps a flatter arc across the whole window
  const pad = 2.2;
  const cx = box.u + box.w / 2;
  const window = { u: box.u + pad, v: box.v + pad, w: box.w - 2 * pad, h: box.h - 2 * pad };
  if (kind === "roi") return { pivot: [cx, box.v + box.h - pad - 1.2], radius: box.h - 2 * pad - 2.6, sweep: 45, window, hub: true };
  const radius = 30;
  return { pivot: [cx, window.v + 3.2 + radius], radius, sweep: 34, window, hub: false };
};

// ------------------------------------------------------------ brain model: AU-5's clear slice stack in miniature, on a base
export const BRAIN_BASE = { x: 58, y: 30, w: 46, d: 28, r: 3 };
export const BRAIN_BASE_H = 6;
// six clear acrylic plates on two back posts, one etched axial contour per plate, frontal pole toward +x
export const STACK = { cx: 73, cy: 42, w: 24, d: 17, r: 1.6, t: 0.8, count: 6, gap: 3.6, z0: 9.4, f: [0.7, 0.88, 1, 0.97, 0.85, 0.62], a: 9.4, b: 6.2 };
export const STACK_POSTS = [[STACK.cx - STACK.w / 2 + 3.2, STACK.cy - STACK.d / 2 + 3], [STACK.cx + STACK.w / 2 - 3.2, STACK.cy - STACK.d / 2 + 3]];
export const POST_R = 0.9;
export const COLLAR_R = 1.7;
export const plateZ = (j) => STACK.z0 + j * STACK.gap; // bottom face of plate j
export const KNOB = { x: 95.5, y: 49.5, r: 3.8, h: 4.4, dial: 6.6 };
// EN, FR, ZH and all: four detents on the camera side of the dial, degrees clockwise from −y as seen from above
export const KNOB_ANGLES = [82, 120, 158, 196];
export const KNOB_POOLED = 3;
export const REF = { x: 116, y: 22, z: 8 }; // reference input on the console's front lip (the observed BOLD from the brain model)
export const BOSS = { x: BRAIN_BASE.x + BRAIN_BASE.w, y: 37, z: 3 }; // the cable's connector on the base's +x face

// ------------------------------------------------------------ cell selector: a switch box on the apron in front of the cage, wired along the bench to the console's contrast section
export const SELECT = { x: -64, y: 30, w: 28, d: 18, r: 2 };
export const SELECT_H = 9;
export const TOGGLE = { x: SELECT.x + SELECT.w / 2, y: SELECT.y + SELECT.d / 2 - 1, z: SELECT_H + 1.4 + 1.6 + 1.0, length: 11, angle: 28 }; // the pivot ball rests in the bushing mouth
export const TOGGLE_ANGLES = [-TOGGLE.angle, TOGGLE.angle, 0]; // XLM-R left, NLLB right, centre: both encoders
export const SELECT_GLAND = { x: 30, y: 22, z: 7 }; // the selector's input on the console's front lip, under the semantic contrast meter

// a group transform that lays the panel plane's (u, v) coordinates on screen, at standoff s along its normal
export function panelMatrix(s = 0) {
  const o = k.iso(onPanel(0, 0, s), P);
  const a = k.iso(onPanel(1, 0, s), P);
  const b = k.iso(onPanel(0, 1, s), P);
  const f = (x) => Number(x.toFixed(4));
  return `matrix(${f(a[0] - o[0])} ${f(a[1] - o[1])} ${f(b[0] - o[0])} ${f(b[1] - o[1])} ${f(o[0])} ${f(o[1])})`;
}

// ------------------------------------------------------------ the moving parts
export const socketAt = (block, state) => [CARD_X(block), SOCKET_Y[state], SOCKET_TOP];
export const lampAt = (block, state, family) => [CARD_X(block) + (family ? LAMP_DX : -LAMP_DX), SOCKET_Y[state] + LAMP_DY, STRIP.top];
export const INPUT_TOP = [INPUT.x, INPUT.y, MB_TOP + SOCKET_H + PLUG_H]; // boot top of the parked plug on the meter bank
export const REST_PLUG = socketAt(9, 1);

// the plug's foot (bottom of the nose) at a pose: on a socket, or lifted and travelling between two
export function plugFoot(from, to, t) {
  // t 0..1: rise (0..0.25), travel (0.25..0.75), drop (0.75..1), each eased
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rise = ease(t / 0.25);
  const go = ease((t - 0.25) / 0.5);
  const drop = ease((t - 0.75) / 0.25);
  const lift = LIFT * (rise - drop);
  return [from[0] + (to[0] - from[0]) * go, from[1] + (to[1] - from[1]) * go, from[2] + lift];
}

// the cord from the plug's boot top to the parked plug on the meter bank: a stiff test lead that rises square out of the
// boot, bends over on a true circular arc, runs down toward the bank and bends again into the parked plug's boot
export const CORD_BEND = 6.5;
// the lead rises this far above the boot before it runs over to the bank, so on screen its run clears the socket field
export const CREST = 26;
export function cordRoute(foot) {
  const a = [foot[0], foot[1], foot[2] + PLUG_H];
  const b = INPUT_TOP;
  const flat = Math.hypot(b[0] - a[0], b[1] - a[1]);
  // the first corner turns from straight up to the run; its arc needs this much straight lead below it
  const top = a[2] + CREST;
  const over = b[2] + Math.max(CORD_BEND + 3, (top - b[2]) * 0.55);
  const turn = Math.PI / 2 + Math.atan2(top - over, flat);
  const cut = CORD_BEND * Math.tan(turn / 2);
  return arcs([a, [a[0], a[1], Math.max(top, a[2] + cut + 0.6)], [b[0], b[1], over], b], CORD_BEND);
}
// a polyline with every corner replaced by a circular arc of radius r (end legs must be longer than their cut)
function arcs(points, r, per = 12) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [p, h, n] = [points[i - 1], points[i], points[i + 1]];
    const into = unit(sub(h, p));
    const outOf = unit(sub(n, h));
    const c = Math.max(-1, Math.min(1, dot(into, outOf)));
    const turn = Math.acos(c);
    const cut = r * Math.tan(turn / 2);
    const start = sub(h, scale(into, cut));
    const normal = unit(sub(outOf, scale(into, c)));
    const centre = add(start, scale(normal, r));
    const count = Math.max(2, Math.ceil((per * turn) / (Math.PI / 2)));
    for (let j = 0; j <= count; j++) {
      const phi = (turn * j) / count;
      out.push(add(centre, add(scale(normal, -r * Math.cos(phi)), scale(into, r * Math.sin(phi)))));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

// the toggle lever's axis at an angle (degrees, + toward +x): it tilts in the x–z plane about its bushing
export function leverAxis(angle) {
  const r = (angle * Math.PI) / 180;
  return [Math.sin(r), 0, Math.cos(r)];
}

// ------------------------------------------------------------ camera
// fitted to the bench and the cord in every socket at rest; a lifted cord in flight may use the top padding
const fitPoints = [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [MB.x1, -40, MB_TOP + 12]];
for (let b = 0; b < 12; b++) for (const s of [0, 3]) fitPoints.push(...cordRoute(socketAt(b, s)));
export const P = k.fitProjection(fitPoints, WIDTH, HEIGHT, { pad: 22, azimuth: AZIMUTH });

