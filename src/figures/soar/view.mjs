// Fig 7 · camera, the moving parts' geometry and every attribute a pose sets.
// Shared by geometry.mjs and art.mjs (static pose), build.mjs (audit) and live.js (every frame).
import { fitProjection, boxCorners, iso, pathOf, slabOf, translateAlong } from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export const WIDTH = 600;
export const HEIGHT = 520;

// ------------------------------------------------------------ world (1 unit ≈ 1 px of the real thing, z up)
export const BENCH = { x: -104, y: -80, w: 260, d: 166, r: 10 };
export const BENCH_H = 12;
export const FOOT_H = 5;
export const BODY = { x: -62, y: -62, w: 124, d: 124, r: 9 };
export const FEET_TOP = 3;
export const SHELL_TOP = 34;
export const DECK_TOP = 40;
export const FRAME_TOP = 41.2; // overlay mount frame on the Fresnel glass
export const SHEET_TOP = 41.5; // base transparency S
export const ZH = 42.3; // hinge axis of both leaves
export const KR = 1.1; // knuckle radius
// u0 sits 2 in from the knuckle row's end, so a raised leaf's inner edge clears the head on screen at every focus
export const LEAF = { u0: -31, u1: 39, w0: 1.15, w1: 79, border: 3.5, t: 0.7 };
export const HINGES = {
  J: { o: [-42, 0, ZH], a: [0, 1, 0], b: [1, 0, 0] }, // hinged on the far-left edge, folds toward +x
  Q: { o: [0, -42, ZH], a: [1, 0, 0], b: [0, 1, 0] }, // hinged on the far-right edge, folds toward +y
};

// the folding post, its carriage (slider, pinion knob) and the head, built at focus 0
export const POST = [-76, -10];
export const POST_BOTTOM = 49.6;
export const POST_TOP = 166;
export const SLIDER = { x: -82, y: -16, w: 12, d: 12, r: 1.5 };
export const SLIDER_Z = [131, 149];
export const RACK = { x: -72.5, y: -12, w: 1.2, d: 4, r: 0.3 };
export const RACK_Z = [56, 164];
export const KNOB = { y: [-2.8, 2.2], z: 140, r: 5, pinion: 2 };
export const FOCUS = [-5, 6];

// the reference tray beside the stage: two lanes, F_J behind, F_Q in front
export const LANES = { J: -23, Q: 23 };
export const CARRIER = { x: 66, w: 40, half: 21.5 };
export const PARK = 30;

export const P = fitProjection(
  [...boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [POST[0] - 4, POST[1] - 4, POST_TOP + 3], [0, -14, 175 + FOCUS[1]], [14, 14, 147 + FOCUS[1]]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 45 },
);

export const V = G.viewOf(P);
const at = (p) => iso(p, P);
const { add3, mul3, dot3, cross3 } = G;

// ------------------------------------------------------------ the overlay leaves
// marks on the films, in sheet (world x, y) coordinates of the folded-down pose: they register over S's marks
export const MARKS = {
  S: [
    [[-19.5, -12], [20.5, -12]],
    [[-19.5, -6], [6.5, -6]],
  ],
  J: [
    [[-22.5, -17], [-25.5, -17], [-25.5, -1], [-22.5, -1]],
    [[25.5, -17], [28.5, -17], [28.5, -1], [25.5, -1]],
    [[-22.5, -12], [-21.1, -12]],
  ],
  Q: [
    [[-26.5, -12], [-22.5, -12]],
    [[-26.5, 5], [-22.5, 5]],
    [[-19.5, 5], [26.5, 5]],
    [[-19.5, 11], [12.5, 11]],
  ],
};
// sheet point → leaf coordinates (u along the hinge, w out from it)
const toLeaf = (which, [x, y]) => (which === "J" ? [y, x + 42] : [x, y + 42]);

export function leafFrame(which, up) {
  const { o, a, b } = HINGES[which];
  const th = (up * Math.PI) / 2;
  const bb = add3(mul3(b, Math.cos(th)), mul3([0, 0, 1], Math.sin(th)));
  const n = add3(mul3(b, -Math.sin(th)), mul3([0, 0, 1], Math.cos(th)));
  return { o, a, b: bb, n };
}
const leafPoint = (F, u, w, s) => add3(add3(F.o, mul3(F.a, u)), add3(mul3(F.b, w), mul3(F.n, s)));

const quad = (F, u0, u1, w0, w1, s) => [leafPoint(F, u0, w0, s), leafPoint(F, u1, w0, s), leafPoint(F, u1, w1, s), leafPoint(F, u0, w1, s)];

// every path of one leaf in a pose, in fixed slots so live code rewrites them in place
export function leafPaths(which, up) {
  const F = leafFrame(which, up);
  const { u0, u1, w0, w1, border, t } = LEAF;
  const side = dot3(F.n, V) >= 0 ? 1 : -1;
  const face = side * t * 0.5;
  const outer = [quad(F, u0, u1, w0, w1, t / 2), quad(F, u0, u1, w0, w1, -t / 2)];
  const hull = G.hullOf(outer.flat().map(at));
  const ring = quad(F, u0, u1, w0, w1, face).map(at);
  const inner = quad(F, u0 + border, u1 - border, w0 + border, w1 - border, face).map(at);
  const normal = mul3(F.n, side);
  const top = normal[2] > 0.8;
  const marks = MARKS[which].map((line) => pathOf(line.map((p) => {
    const [u, w] = toLeaf(which, p);
    return at(leafPoint(F, u, w, face));
  }))).join("");
  return {
    face: top ? "iso-top" : "iso-shade",
    shade: top ? "" : String(Math.min(3, G.toneOf(normal, P))), // the kit has four side tones; a leaf leaning back toward the light takes the brightest
    side: pathOf(hull, true) + pathOf(inner, true),
    ring: pathOf(ring, true) + pathOf(inner, true),
    film: pathOf(inner, true),
    marks,
    window: pathOf(inner, true),
    edge: pathOf(hull, true),
  };
}

export function leafSvg(which, up, lit) {
  const d = leafPaths(which, up);
  return `<g class="iso-solid so-leaf" data-leaf="${which}"${lit ? ' data-lit=""' : ""}>` +
    `<path class="iso-shade" data-shade="0" data-slot="side" fill-rule="evenodd" d="${d.side}"/>` +
    `<path class="${d.face}" data-slot="ring"${d.shade ? ` data-shade="${d.shade}"` : ""} fill-rule="evenodd" d="${d.ring}"/>` +
    `<path class="so-film" data-slot="film" d="${d.film}"/>` +
    `<path class="iso-line so-mark" data-slot="marks" data-tone="${lit ? "lit" : "hi"}" data-free="" d="${d.marks}"/>` +
    `<path class="iso-line" data-slot="window" data-tone="lo" d="${d.window}"/>` +
    `<path class="iso-line iso-edge" data-slot="edge" data-tone="hi" d="${d.edge}"/>` +
    `</g>`;
}

// the leaf as the audit sees it
export function leafBox(which, up) {
  const F = leafFrame(which, up);
  const { u0, u1, w0, w1, t } = LEAF;
  return { centre: leafPoint(F, (u0 + u1) / 2, (w0 + w1) / 2, 0), axes: [F.a, F.b, F.n], half: [(u1 - u0) / 2, (w1 - w0) / 2, t / 2] };
}

// ------------------------------------------------------------ solids with fixed path slots
export const SLOTS = ["fill", 0, 1, 2, 3, "top", "crease", "bevel", "outline"];
export const slotsOf = (paths) => SLOTS.map((slot) => (typeof slot === "number" ? paths.shades[slot] || "" : paths[slot] || ""));
export function slotSvg(paths, { tone = "mid", crease = "faint", name, inner = "" }) {
  const d = slotsOf(paths);
  const cls = ["iso-fill", "iso-shade", "iso-shade", "iso-shade", "iso-shade", "iso-top", "iso-line iso-crease", "iso-line iso-bevel", "iso-line iso-edge"];
  return `<g class="iso-solid" data-solid="${name}">` + d.map((path, i) => {
    const extra = i >= 1 && i <= 4 ? ` data-shade="${i - 1}"` : i === 6 || i === 7 ? ` data-tone="${crease}"` : i === 8 ? ` data-tone="${tone}"` : "";
    return (i === 8 ? inner : "") + `<path class="${cls[i]}"${extra} d="${path}"/>`;
  }).join("") + `</g>`;
}

// the mast below and above the carriage: both rebuilt when focus moves the carriage, so each ends flush on the slider
export const MAST = { x: POST[0] - 3.5, y: POST[1] - 3.5, w: 7, d: 7, r: 0.8 };
const teethIn = (z0, z1) => {
  let teeth = "";
  for (let z = RACK_Z[0] + 1; z < RACK_Z[1] - 0.5; z += 2) if (z > z0 + 0.4 && z < z1 - 0.4) teeth += pathOf([at([RACK.x + RACK.w, RACK.y, z]), at([RACK.x + RACK.w, RACK.y + RACK.d, z])]);
  return teeth;
};
export function mastTop(fz) {
  const z0 = SLIDER_Z[1] + fz;
  return { mast: slabOf(MAST, z0, POST_TOP - z0, P, 3, 0), rack: slabOf(RACK, z0, RACK_Z[1] - z0, P, 2, 0), teeth: teethIn(z0, RACK_Z[1]) };
}
export function mastLow(fz) {
  const z1 = SLIDER_Z[0] + fz;
  return { mast: slabOf(MAST, POST_BOTTOM, z1 - POST_BOTTOM, P, 3, 0), rack: slabOf(RACK, RACK_Z[0], z1 - RACK_Z[0], P, 2, 0), teeth: teethIn(RACK_Z[0], z1) };
}

// the pinion knob: knurl and pointer turn with the carriage travel
// built at focus 0: the carriage group carries it up and down
export const KNOB_F = G.frameOf([POST[0], KNOB.y[0], KNOB.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
export const knobAngle = (fz) => 0.4 + fz / KNOB.pinion;
export function knobLines(fz) {
  const F = KNOB_F;
  const s1 = KNOB.y[1] - KNOB.y[0];
  const phase = knobAngle(fz);
  const ribs = G.ribsOf(F, 0.5, s1 - 0.5, KNOB.r, 30, P, { phase });
  const tip = G.pointOf(F, s1, 3.6, phase);
  const tail = G.pointOf(F, s1, 1.2, phase);
  return { ribs, pointer: pathOf([at(tail), at(tip)]) };
}

// ------------------------------------------------------------ a pose's attributes
export function viewOf(pose) {
  const head = translateAlong(P, [0, 0, pose.fz]);
  return {
    head,
    refJ: translateAlong(P, [PARK * pose.rj, 0, 0]),
    refQ: translateAlong(P, [PARK * pose.rq, 0, 0]),
    leafJ: leafPaths("J", pose.lj),
    leafQ: leafPaths("Q", pose.lq),
    mast: mastTop(pose.fz),
    low: mastLow(pose.fz),
    knob: knobLines(pose.fz),
  };
}
