// Fig 11 · the parts that move, built from the kit the same way at build time (art.mjs) and in the page (live.js).
import * as k from "../kit/iso-kit.mjs";
import { P, T, KNOB, YB, ZB } from "./world.mjs";

const RAD = Math.PI / 180;
const wrap = (a, m) => ((a % m) + m) % m;

// a solid whose markup always has the same children, so live code can rewrite its paths in place
export function S(paths, { tone = "hi", crease = "faint", lit = false, cls = "", inner = "", attr = "" } = {}) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid${cls ? ` ${cls}` : ""}"${lit ? ' data-lit=""' : ""}${attr}><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease || ""}"/>${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}

const turn = (points, cx, cy, a) => {
  const c = Math.cos(a * RAD);
  const s = Math.sin(a * RAD);
  return points.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
export const square = (cx, cy, half, a, r = 0.7) => turn(k.roundedPlan({ x: cx - half, y: cy - half, w: half * 2, d: half * 2, r }, 2), cx, cy, a);

// where cell i stands at turret angle theta (degrees); the beam position is +y of the centre
export const cellAt = (theta, i, radius = T.cell) => {
  const phi = (theta + 90 + 90 * i) * RAD;
  return [T.x + radius * Math.cos(phi), T.y + radius * Math.sin(phi)];
};
export const inBeam = (theta) => {
  const near = Math.round(theta / 90) * 90;
  return Math.abs(theta - near) < 6 ? wrap(-near / 90, 4) : -1;
};
// the detent plunger rides the rim: how far its ball sits into a V notch
export function plungerIn(theta) {
  const off = wrap(T.plunger - theta, 90) - 45;
  return T.notch * Math.max(0, 1 - Math.abs(off) / T.notchHalf);
}
export const PLUNGER_U = [Math.cos(T.plunger * RAD), Math.sin(T.plunger * RAD), 0];

// the turret disc with four V notches between the cells, and the engraved index dots (1 to 4 by each cell)
// per quarter: the V notch at 0 (its tip and both shoulders) and the plain rim every 11.7 degrees
const OFFS = [-10, 0, 10, 21.7, 33.3, 45, 56.7, 68.3];
export function discRing(theta) {
  const out = [];
  for (let q = 0; q < 4; q++)
    for (const off of OFFS) {
      const a = (theta + 45 + q * 90 + off) * RAD;
      const r = T.disc - T.notch * Math.max(0, 1 - Math.abs(off) / T.notchHalf);
      out.push([T.x + r * Math.cos(a), T.y + r * Math.sin(a)]);
    }
  return out;
}
function dotsAt(theta) {
  const out = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j <= i; j++) {
      const a = (theta + 90 + 90 * i) * RAD + ((j - i / 2) * 1.9) / 22.3;
      out.push(k.iso([T.x + 22.3 * Math.cos(a), T.y + 22.3 * Math.sin(a), T.z1], P));
    }
  return out;
}

// the mask spider at m (0 parked against the knob, 1 lowered with its caps seated on the cuvettes)
export const spiderLift = (m) => (1 - Math.max(0, Math.min(1, m))) * T.lift;
// one arm of the spider: a bar from the collar wall to the middle of cap i, lying on the cap
export function armRing(theta, i) {
  const phi = (theta + 90 + 90 * i) * RAD;
  const r0 = Math.sqrt(T.collar * T.collar - T.arm * T.arm) - 0.05;
  const r1 = T.cell + 1.6;
  const [c, s] = [Math.cos(phi), Math.sin(phi)];
  const [nx, ny] = [-s * T.arm, c * T.arm];
  const p = (r, side) => [T.x + r * c + side * nx, T.y + r * s + side * ny];
  return [p(r0, -1), p(r1, -1), p(r1, 1), p(r0, 1)];
}

// one frame of the turret: paths for every rotating part and the depth of each stack, far to near.
// beamDepth: the first beam leg runs from the monochromator lens into the cuvette in the beam; it paints after the
// cell to its left (it passes in front of that holder) and before the cell in the beam (whose glass hides its end).
export function turretFrame(theta, m = 0) {
  const dz = spiderLift(m);
  const cap0 = T.cuvetteTop + dz;
  const arm0 = cap0 + T.capH;
  const cells = [0, 1, 2, 3].map((i) => {
    const [x, y] = cellAt(theta, i);
    const glass = square(x, y, T.cuvette, theta, 0.6);
    const [sx, sy] = cellAt(theta, i, T.cell + 0.4);
    return {
      i,
      x,
      y,
      depth: k.depthOf([x, y, 30], P),
      holder: k.extrude(square(x, y, T.holder, theta, 0.9), T.z1, T.holderTop - T.z1, P, { bevel: 0.4 }),
      cuvette: k.extrude(glass, T.holderTop, T.cuvetteTop - T.holderTop, P),
      meniscus: k.ringSeam(glass, T.meniscus, P),
      cap: k.extrude(square(x, y, T.cap, theta, 0.9), cap0, T.capH, P, { bevel: 0.3 }),
      arm: k.extrude(armRing(theta, i), arm0, T.armH, P),
      screw: k.iso([sx, sy, arm0 + T.armH], P),
    };
  });
  const a = (theta + 90) * RAD;
  const c0 = T.collar0 + dz;
  return {
    disc: k.extrude(discRing(theta), T.z0, T.z1 - T.z0, P, { convex: false }),
    dots: dotsAt(theta),
    pointer: k.lineOnTop([T.x + 1.2 * Math.cos(a), T.y + 1.2 * Math.sin(a)], [T.x + 4.4 * Math.cos(a), T.y + 4.4 * Math.sin(a)], T.knob1, P),
    post0: k.cylinder(T.x, T.y, T.post, T.z1, c0 - T.z1, P, 20),
    collar: k.cylinder(T.x, T.y, T.collar, c0, T.collarH, P, 22, 0.3),
    post1: k.cylinder(T.x, T.y, T.post, c0 + T.collarH, T.knob0 - c0 - T.collarH, P, 20),
    collarKnurl: k.knurl(T.x, T.y, T.collar, c0 + 0.5, c0 + T.collarH - 0.5, 16, P),
    cells,
    hubDepth: k.depthOf([T.x, T.y, 30], P),
    plungerDepth: k.depthOf([T.x + 29 * PLUNGER_U[0], T.y + 29 * PLUNGER_U[1], 30], P),
    beamDepth: k.depthOf([T.x - 10, YB, ZB], P),
    plunger: plungerIn(theta),
    lift: dz,
  };
}

// the wavelength drum's pointer at read-point position rho (0, 1, 2; fractional while turning)
export function knobPointer(rho) {
  const i = Math.max(0, Math.min(1.999, rho));
  const n = Math.floor(i);
  const a = (KNOB.angles[n] + (KNOB.angles[n + 1] - KNOB.angles[n]) * (i - n) + 90) * RAD;
  return k.lineOnTop([KNOB.x + 1.4 * Math.cos(a), KNOB.y + 1.4 * Math.sin(a)], [KNOB.x + 5.6 * Math.cos(a), KNOB.y + 5.6 * Math.sin(a)], 53.6, P);
}
