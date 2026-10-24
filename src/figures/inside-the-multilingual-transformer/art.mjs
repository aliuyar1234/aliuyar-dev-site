// Fig 6 static art: the transformer patch bay in its resting pose (plug in block 9 post-attn, XLM-R with the English cohort).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubeSvg } from "../kit/tube.mjs";
import * as R from "./rig.mjs";
import { build, plugSvg, cablePieces } from "./geometry.mjs";
import { CELLS, METERS, REST, deltaAt, tapReadout, tapText, liveTables, FACTS } from "./model.mjs";
import * as V from "./view.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

export const SLUG = "inside-the-multilingual-transformer";
export const TITLE = "Transformer patch bay";
export const HINT = "Click a socket, toggle, knob";

export const LABEL =
  "A rack-mounted test bench. On the left a card cage holds twelve plug-in cards, one per encoder block. The test strip on each card's top edge has four sockets of different shapes for the attention output, post-attention, feed-forward and block output states, each with two small lamps, and each card's faceplate carries a window of four level bars, one per state. A patch cord runs from one socket to a sloped meter console with four encoding meters, two centre-zero meters and two small lamp grids. A three-position toggle on a switch box, cabled along the bench to the console, selects the encoder or both; a knob on the base of a small clear slice-stack brain model selects the listener cohort or all of them, and a cable carries the brain model's signal to the console.";

const W = FACTS.winnerStates;
const attnSide = W.SEMANTIC.ATTN + W.SEMANTIC.POST_ATTN + W.AUDITORY.ATTN + W.AUDITORY.POST_ATTN;
const outputs = W.SEMANTIC.OUTPUT + W.AUDITORY.OUTPUT;
const ffns = W.SEMANTIC.FFN + W.AUDITORY.FFN;

export const KEYS = [
  { mark: "lit", label: "Plug: the tapped state. Cards: blocks 0–11. Sockets, back to front: attn (round), post-attn (square), ffn (hex), output (oval)" },
  { mark: "raised", label: "Encoding meters, AG IFGtri | pSTG HG (Heschl): Δz at the tap, 0–0.10, pooled (paper Fig. 3)" },
  { mark: "dim", label: "Level windows: mean Δz of the four meters at each of the card's taps" },
  { mark: "flat", label: "Centre-zero meters, ±0.015: attention-side (attn + post-attn) minus FFN-side (ffn + output) Δz, 95% CI; ▲ pre-specified direction" },
  { mark: "edge", label: "Toggle and knob: encoder and cohort; centre and all give the six-cell mean" },
  { mark: "dotted", label: "Card lamps: the cell's winning taps, semantic left, auditory right" },
  { mark: "green", label: "Lamp grids, Holm p < 0.05: auditory, the pre-specified test; semantic, the post hoc reverse-direction test (exploratory)" },
];

export const CAPTION = `Shared multilingual brain alignment in XLM-R and the NLLB-200 encoder is organized primarily around attention-side computations. The paper splits each sentence vector into a leave-target-out shared part (the mean of the other two languages' vectors) and an orthogonalized residual, then scores the shared part's encoding advantage Δz on fMRI from ${FACTS.participants} listeners of Le Petit Prince at 12 blocks × 4 states. Attention-side minus FFN-side Δz is positive for the semantic regions in all 6 encoder × cohort cells, where the pre-specified hypothesis predicted the FFN side, and for the auditory regions in ${FACTS.h2Positive} of 6, ${FACTS.h2HolmSig} of them Holm-significant. Of the 12 winning taps, the highest-Δz block and state for each cell and region family, ${attnSide} are attn or post-attn, ${outputs} are output and ${ffns ? ffns : "none"} ${ffns === 1 ? "is" : ffns ? "are" : "is"} ffn.`;

// the pose the art is drawn in, and the markup of each moving part in it
export function restPose() {
  const cell = CELLS[REST.cell];
  return {
    foot: R.socketAt(REST.block, REST.state),
    block: REST.block,
    state: REST.state,
    values: METERS.map((_, i) => deltaAt(i, REST.block, REST.state)),
    cell,
    lever: R.TOGGLE_ANGLES[cell.model],
    knob: R.KNOB_ANGLES[cell.lang],
  };
}

export function bodyOf(pose = restPose(), { expand = false } = {}) {
  const { items, routes, symbols } = build();
  const byName = new Map(items.map((item) => [item.name, item]));
  for (const route of routes) cablePieces(route).forEach((piece, index) => byName.set(`${route.name}:${index}`, { name: `${route.name}:${index}`, svg: tubeSvg(piece, { tone: "mid" }), at: piece.mid, bias: 0 }));
  byName.set("toggle.lever", { name: "toggle.lever", svg: leverMarkup(pose.lever), at: [R.TOGGLE.x, R.TOGGLE.y, R.TOGGLE.z + 4], bias: 0 });
  const V3 = G.viewOf(R.P);
  const order = ORDER.filter((name) => byName.has(name));
  const rest = [...byName.keys()].filter((name) => !order.includes(name));
  rest.sort((a, b) => keyOf(byName.get(a), V3) - keyOf(byName.get(b), V3));
  const names = order.length ? [...order, ...rest] : rest;
  // repeated card parts are drawn once in defs and placed with <use>; expand draws every copy in full (for the line check)
  const defs = expand ? "" : `<defs>${Object.entries(symbols).map(([id, svg]) => `<g id="mt-${id}">${svg}</g>`).join("")}</defs>`;
  const out = [defs, ...names.map((name) => {
    const item = byName.get(name);
    if (item.use && !expand) return `<use href="#mt-${item.use.id}" transform="${item.use.transform}"/>` + dress({ ...item, svg: item.extra }, pose);
    if (item.compact && !expand) return dress({ ...item, svg: item.compact }, pose);
    return dress(item, pose);
  })];
  // the live layer, always on top: the plug and its cord
  const up = G.frameAlong(R.REST_PLUG, [0, 0, 1]);
  out.push(`<g data-plug="" transform="${V.plugOffset(pose.foot)}">${plugSvg(up, true).svg}</g>`);
  out.push(`<g data-cord="">${cordMarkup(pose.foot)}</g>`);
  return out.join("");
}
const keyOf = (item, V3) => G.dot3(item.at, V3) + (item.bias || 0);

export function leverMarkup(deg) {
  return `<g data-lever="">${V.lever(deg).parts.map((part, i) => V.fixedSolid(part.paths, { tone: part.tone, crease: part.crease, part: i })).join("")}</g>`;
}
export function cordMarkup(foot) {
  const [piece] = V.cordPieces(foot);
  return `<g class="tb"><path class="tb-body" data-k="body" d="${piece.body}"/><path class="tb-shine" data-k="shine" d="${piece.shine}"/><path class="tb-shade" data-k="shade" d="${piece.shade}"/><path class="iso-line tb-edge" data-tone="hi" data-k="edges" d="${piece.edges}"/></g>`;
}

// one static item's markup in a pose: needles, bands, lamps and the knob pointer take the pose's values
export function dress(item, pose) {
  let svg = item.svg;
  svg = svg.replace(/data-needle="meter(\d)" ([^>]*?)d=""/g, (_, i, rest) => `data-needle="meter${i}" ${rest}d="${V.roiNeedle(Number(i), pose.values[Number(i)])}"`);
  const fam = [pose.cell.semantic, pose.cell.auditory];
  svg = svg.replace(/data-needle="galvo(\d)" ([^>]*?)d=""/g, (_, i, rest) => `data-needle="galvo${i}" ${rest}d="${V.galvoNeedle(Number(i), fam[Number(i)].value)}"`);
  svg = svg.replace(/data-band="galvo(\d)" d=""/g, (_, i) => `data-band="galvo${i}" d="${V.galvoBand(Number(i), fam[Number(i)].ci)}"`);
  svg = svg.replace(/data-index="galvo(\d)" d=""/g, (_, i) => `data-index="galvo${i}" d="${V.galvoIndex(Number(i), fam[Number(i)].planned)}"`);
  // the lamp grids: green is fixed by each cell's test, the ring marks the selected cell
  const selected = CELLS.indexOf(pose.cell);
  svg = svg.replace(/data-glamp="(\d)-(\d)"/g, (match, f, c) => (CELLS[Number(c)].lamps[Number(f) ? "auditory" : "semantic"] ? `${match} data-on=""` : match));
  svg = svg.replace(/data-gring="(\d)-(\d)"/g, (match, f, c) => (Number(c) === selected ? `${match} data-sel=""` : match));
  svg = svg.replace(/data-pointer="" ([^>]*?)d=""/, (_, rest) => `data-pointer="" ${rest}d="${V.knobPointer(pose.knob)}"`);
  const w = pose.cell.winners;
  svg = svg.replace(/data-lamp="(\d+)-(\d)-(\d)"/g, (match, b, s, f) => {
    const list = Number(f) ? w.auditory : w.semantic;
    return list.some(([lb, ls]) => lb === Number(b) && ls === Number(s)) ? `${match} data-on=""` : match;
  });
  return svg;
}

export function render({ expand = false } = {}) {
  const pose = restPose();
  const svg = k.figureSvg({ width: R.WIDTH, height: R.HEIGHT, label: LABEL, body: minifyPaths(bodyOf(pose, { expand })) });
  const tables = JSON.stringify(liveTables()).replace(/'/g, "&#39;");
  const readout = tapReadout(pose.block, pose.state, pose.values);
  const aria = "Transformer patch bay. Arrow keys move the patch cord: left and right change the block, up and down the state. M switches the encoder, L steps the listener cohort through EN, FR, ZH and all; all shows the mean of the six cells.";
  const body = `<div class="iso-stage mt-stage" tabindex="0" role="group" aria-label="${aria}" aria-description="${tapText(pose.block, pose.state, pose.values)}" data-rig='${tables}'>${svg}<span class="mt-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ fig: "Fig 6", title: TITLE, hint: HINT, readout, keys: KEYS, caption: CAPTION, body });
  return { html };
}
