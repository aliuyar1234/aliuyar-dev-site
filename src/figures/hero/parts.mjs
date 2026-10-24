// Parts that move, drawn by the same code at build time (art.mjs) and in the page (live.js).
import { slabOf, cylinder, solidSvg, lineSvg, iso, pathOf, ring, translateAlong } from "../kit/iso-kit.mjs";
import { frameOf, solidOf } from "../kit/lathe.mjs";
import { P, BELT, TRAY, HEAD, CAB, KNOB, STRIP } from "./world.mjs";
import { SLIP, curlOf, paperOf } from "./model.mjs";

const S = (paths, style) => solidSvg(paths, style);
const L2 = TRAY.l / 2;
const W2 = TRAY.w / 2;
const f2 = (v) => Math.round(v * 100) / 100;

// Evidence slips: a loose stack of cards, each one SLIP.t thick and set a little off the one below.
const JIT = [[0, 0], [0.5, -0.4], [-0.4, 0.5], [0.3, -0.3], [-0.5, 0.3], [0.4, -0.5]];
export function slipsSvg(n, lit = false) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const [dx, dy] = JIT[j % JIT.length];
    out.push(S(slabOf({ x: -0.2 + dx, y: -5.2 + dy, w: 8.4, d: 10.4, r: 0 }, TRAY.t + j * SLIP.t, SLIP.t, P, 1), { tone: "hi", lit, className: "hero-lit" }));
  }
  return out.join("");
}

// A clear tray: floor, the two far walls, the decision token and its slips, then the two near walls.
export function traySvg(n, lit = false) {
  const t = TRAY.t;
  const h = TRAY.h - t;
  const wall = { tone: "mid", lit, className: "hero-lit" };
  const slab = (x, y, w, d, z, height) => slabOf({ x, y, w, d, r: 0 }, z, height, P, 1);
  const out = [S(slab(-L2, -W2, TRAY.l, TRAY.w, 0, t), wall)];
  out.push(S(slab(-L2, -W2, TRAY.l, t, t, h), wall));
  out.push(S(slab(-L2, -W2 + t, t, TRAY.w - 2 * t, t, h), wall));
  out.push(S(cylinder(-5.2, 0, 3, t, 1.6, P, 16), { tone: "mid", lit, className: "hero-lit" }) + lineSvg(ring(-5.2, 0, 1.6, t + 1.6, P, 12), { tone: "lo" }));
  out.push(`<g class="hero-slips">${slipsSvg(n, lit)}</g>`);
  // the near walls are clear, so the evidence reads through them
  const clear = { ...wall, className: "hero-lit hero-clear" };
  out.push(S(slab(L2 - t, -W2 + t, t, TRAY.w - 2 * t, t, h), clear));
  out.push(S(slab(-L2, W2 - t, TRAY.l, t, t, h), clear));
  return out.join("");
}

export const placeAt = (p) => translateAlong(P, p);

// Module lines on a belt loop, wrapping its rollers; only the side of the loop that faces the viewer is drawn.
export function slatsD({ x0, x1 }, travel, spacing = 3) {
  const rr = BELT.rr;
  const xa = x0 + rr;
  const xb = x1 - rr;
  const zc = BELT.top - rr;
  const flat = xb - xa;
  const loop = 2 * flat + 2 * Math.PI * rr;
  const count = Math.round(loop / spacing);
  const step = loop / count;
  const parts = [];
  for (let j = 0; j < count; j++) {
    const s = (((j * step + travel) % loop) + loop) % loop;
    let x;
    let z;
    let nx;
    let nz;
    if (s < flat) [x, z, nx, nz] = [xa + s, zc + rr, 0, 1];
    else if (s < flat + Math.PI * rr) {
      const a = (s - flat) / rr;
      [x, z, nx, nz] = [xb + rr * Math.sin(a), zc + rr * Math.cos(a), Math.sin(a), Math.cos(a)];
    } else if (s < 2 * flat + Math.PI * rr) continue;
    else {
      const a = (s - 2 * flat - Math.PI * rr) / rr;
      [x, z, nx, nz] = [xa - rr * Math.sin(a), zc - rr * Math.cos(a), -Math.sin(a), -Math.cos(a)];
    }
    if (nx * 0.612 + nz * 0.5 < 0.04) continue;
    parts.push(pathOf([iso([x, BELT.y0, z], P), iso([x, BELT.y1, z], P)]));
  }
  return parts.join("");
}

// The journal strip, printed in the plane just in front of the cabinet face. Newest line at the top, one line per weighing:
// a passed line is a sequence mark and a bar as long as its evidence; a held line is a solid bar across the strip; a line with no reading is three blocks.
const SY = STRIP.y + 0.05;
const at3 = (x, z) => iso([x, SY, z], P);
const quad = (x0, x1, za, zb) => pathOf([at3(x0, za), at3(x1, za), at3(x1, zb), at3(x0, zb)], true);
export const LINE0 = 2.2;
export function journalSvg(lines) {
  const ink = [];
  const a = STRIP.x0 + 1;
  const b = STRIP.x1 - 1;
  const shown = lines.slice(-12);
  shown.forEach((line, index) => {
    const z = STRIP.top - LINE0 - STRIP.pitch * (shown.length - 1 - index);
    if (line.fault) {
      const w = (b - a - 2) / 3;
      for (let k = 0; k < 3; k++) ink.push(quad(a + k * (w + 1), a + k * (w + 1) + w, z + 0.6, z - 0.6));
    } else if (line.verdict === "held") ink.push(quad(a, b, z + 0.6, z - 0.6));
    else ink.push(quad(a, a + 1.6, z + 0.35, z - 0.35), quad(a + 2.8, a + 2.8 + 1.4 * line.n, z + 0.35, z - 0.35));
  });
  return ink.length ? `<path class="hero-ink" d="${ink.join("")}"/>` : "";
}

// The paper itself for `checked` weighings (fractional while a line feeds): the hanging sheet, then the curl it rolls into at the bottom.
export function stripOf(checked) {
  const out = paperOf(checked);
  const hang = Math.min(out, STRIP.drop);
  const r = curlOf(out);
  const bottom = STRIP.top - hang;
  return { out, hang, r, bottom };
}
export function sheetD(bottom) {
  return quad(STRIP.x0, STRIP.x1, STRIP.top, bottom);
}
// The curl: a roll of paper along x, its back tangent to the sheet where the sheet ends, with the spiral of its turns on the end that faces the viewer.
export function curlSvg(bottom, r) {
  const F = frameOf([STRIP.x0, STRIP.y + r, bottom], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const w = STRIP.x1 - STRIP.x0;
  const body = S(solidOf([[0, r], [w, r]], F, P, { steps: Math.max(14, Math.round(r * 9)), smooth: false }), { tone: "mid" });
  const turns = 2.4;
  const pts = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const a = Math.PI + s * turns * 2 * Math.PI;
    const rr = r * (1 - 0.72 * s);
    pts.push(iso([STRIP.x1, STRIP.y + r + rr * Math.cos(a), bottom + rr * Math.sin(a)], P));
  }
  const end = pts[pts.length - 1];
  return body + lineSvg(pathOf(pts), { tone: "lo" }) + `<circle class="hero-pip" cx="${f2(end[0])}" cy="${f2(end[1])}" r="0.3"/>`;
}

// The display window on the head, in the plane of its face: a digit for the slips just weighed, six cells and a tick under the cell the tolerance asks for.
export const SCREEN = { u0: HEAD.x0 + 3, v0: -(HEAD.z0 + 15), cell: 1.62 };
export const cellU = (i) => SCREEN.u0 + 7.6 + i * SCREEN.cell;
export const gateU = (T) => cellU(T - 1) + 0.65;

// The tolerance knob: τ = 1 at 22.5°, 45° per step, measured on the cabinet top from -y toward +x, so the scale sits on the side that faces the viewer.
export const KNOB_FROM = 22.5;
export const KNOB_STEP = 45;
export const KNOB_TOP = CAB.z1 + 1.6 + KNOB.h;
export const knobAngle = (T) => KNOB_FROM + (T - 1) * KNOB_STEP;
