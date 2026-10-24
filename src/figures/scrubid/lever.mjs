// Fig 17 levers: the flat steel lever and vinyl grip of each three-way ball valve, at any angle.
// Shared by the static art (rest pose), the audit (every pose) and the live page (rebuilt per frame).
import * as G from "../kit/lathe.mjs";
import { P, XB, YB, VALVE, AGG, LEVER, THROW, AGG_THROW } from "./world.mjs";

export const HUB = { len: 1.4, r: 2.6, boss: 2 }; // hub on the stem face; the aggregator's stem boss stands this far off its end face
export const AGG_INDEX = 8;

// the angle of each valve state (LIVE 1, REF -1, SHUT 0) for lever i
export const throwOf = (index) => (index === AGG_INDEX ? AGG_THROW : THROW);
export const angleOf = (index, state) => {
  const t = throwOf(index);
  return state === 1 ? t.live : state === -1 ? t.ref : t.shut;
};
// the state a lever at this angle selects: the port of the nearest detent is open once the lever is past half way to it
export function stateAt(index, angle) {
  const t = throwOf(index);
  let best = 0;
  let dist = Infinity;
  for (const [state, a] of [
    [1, t.live],
    [-1, t.ref],
    [0, t.shut],
  ]) {
    const d = Math.abs(angle - a);
    if (d < dist) (dist = d), (best = state);
  }
  return best;
}

// where each lever's hub face is: bank stems come out of the body's front boss, the aggregator's out of its +x end
export function hubOf(index) {
  if (index === AGG_INDEX) return [AGG.x + AGG.half + HUB.boss, AGG.y, AGG.z];
  return [XB[index], YB + VALVE.stemH, VALVE.z];
}

// the lever's frame: origin on the hub's outer face, axis along the lever, u across its thickness (along the stem).
// Bank levers swing in their x-z plane (0 points +x); the aggregator's in its y-z plane (0 points +y).
export function leverFrame(index, angle) {
  const h = hubOf(index);
  if (index === AGG_INDEX) {
    const a = [0, Math.cos(angle), Math.sin(angle)];
    const u = [1, 0, 0];
    return G.frameOf([h[0] + HUB.len, h[1], h[2]], a, u, G.cross3(a, u));
  }
  const a = [Math.cos(angle), 0, Math.sin(angle)];
  const u = [0, 1, 0];
  return G.frameOf([h[0], h[1] + HUB.len, h[2]], a, u, G.cross3(a, u));
}

const BAR = [
  [0, -LEVER.w / 2],
  [LEVER.t, -LEVER.w / 2],
  [LEVER.t, LEVER.w / 2],
  [0, LEVER.w / 2],
];

// the vinyl grip: a six-sided sleeve centred in the bar's thickness (about 5 px across: reads round)
const GRIP = Array.from({ length: 6 }, (_, j) => [LEVER.gripR * Math.cos((j * Math.PI) / 3), LEVER.gripR * Math.sin((j * Math.PI) / 3)]);
const gripFrameOf = (F) => G.frameOf(G.add3(F.o, G.mul3(F.u, LEVER.t / 2)), F.a, F.u, F.v);
const BAR_END = LEVER.len - LEVER.grip + 0.6;

export function leverPaths(index, angle) {
  const F = leverFrame(index, angle);
  const bar = G.prismOf(F, BAR, -HUB.r * 0.6, BAR_END, P);
  const grip = G.prismOf(gripFrameOf(F), GRIP, LEVER.len - LEVER.grip, LEVER.len, P);
  return { bar, grip };
}

// shapes for the audit, in the same frames
export function leverShapes(A, index, angle, name) {
  const F = leverFrame(index, angle);
  return [
    A.prism(F, BAR, -HUB.r * 0.6, BAR_END, { name: `${name}.bar`, owner: name }),
    A.prism(gripFrameOf(F), GRIP, LEVER.len - LEVER.grip, LEVER.len, { name: `${name}.grip`, owner: name }),
  ];
}

// fixed markup: every solid always writes the same eight paths in KEYS order, so the live page only sets d
export const KEYS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "outline"];
export const dOf = (paths, key) => (key[0] === "s" && key.length === 2 ? paths.shades[Number(key[1])] : paths[key]) || "";

export function solidMarkup(paths, tone = "hi") {
  const cls = { fill: "iso-fill", top: "iso-top", crease: "iso-line iso-crease", outline: "iso-line iso-edge" };
  const out = KEYS.map((key) => {
    const d = dOf(paths, key);
    if (key[0] === "s" && key.length === 2) return `<path class="iso-shade" data-shade="${key[1]}" d="${d}"/>`;
    const tone_ = key === "crease" ? ` data-tone="lo"` : key === "outline" ? ` data-tone="${tone}"` : "";
    return `<path class="${cls[key]}"${tone_} d="${d}"/>`;
  });
  return `<g class="iso-solid">${out.join("")}</g>`;
}

export function leverMarkup(index, angle) {
  const { bar, grip } = leverPaths(index, angle);
  return solidMarkup(bar) + solidMarkup(grip);
}
