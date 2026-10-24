// Static art for Fig 12: pure ESM, runs at build time. live.js moves it.
import * as k from "../kit/iso-kit.mjs";
import * as S from "./scene.mjs";
import { staticParts, DIGITS } from "./parts.mjs";
import { dynamicItems, ordered } from "./dyn.mjs";
import { GENES, LOCKED, TOTALS, angleOf, ringOf, massesOf, readoutOf } from "./model.mjs";

export const TITLE = "Gene force table";
export const HINT = "Step genes · drag a pulley · pull the pin";

const pct = (n) => `${((100 * n) / TOTALS.pairs).toFixed(1)}%`;
const R_ = TOTALS.regimes;
const fmt = (n) => n.toLocaleString("en-US");
export const KEYS = [
  { mark: "lit", label: "Ring: one same-gene ORF/CRISPR pair. With the pin pulled, a sprung cord down the bore holds it, and it settles along the loaded string, 1.1 table units per mass" },
  { mark: "raised", label: "Slotted masses: Δ activity, ORF minus CRISPR strength z, hung on the stronger modality's string, one mass per 1.0, the locked asymmetry threshold. The engraved circle round the bore marks |Δ| = 1.0" },
  { mark: "line", label: "Strings: their angle is the signed cosine's z against the activity-aware null, 90° at 0 and 20° per unit; the sign threshold ±1.96 falls at 51° and 129°" },
  { mark: "flat", label: `Counter: ${LOCKED.bootstraps} bootstrap resamples per gene` },
  { mark: "green", label: `Lamp: the bootstrap mode reached the ${LOCKED.consensus.toFixed(2)} consensus` },
  { mark: "dim", label: `Final labels, ${fmt(TOTALS.pairs)} pairs: ambiguous ${fmt(R_.ambiguous)} (${pct(R_.ambiguous)}) · asymmetric_CRISPR ${fmt(R_.asymmetric_CRISPR)} (${pct(R_.asymmetric_CRISPR)}) · asymmetric_ORF ${fmt(R_.asymmetric_ORF)} (${pct(R_.asymmetric_ORF)}) · inactive ${R_.inactive}` },
];

export const CAPTION =
  "The paper builds a locked, auditable pipeline over matched gain-of-function (ORF) and loss-of-function (CRISPR) Cell Painting profiles from the JUMP cpg0016 resource and labels each same-gene pair by its signed geometry: a signed cosine between the two profiles, scored against an activity-aware null, and the difference in their activity strengths. Each pair takes the mode label of 200 bootstrap resamples when the mode's share reaches the 0.70 consensus threshold, and is labelled ambiguous otherwise. Of 5,332 analysed pairs, 2,552 are active in both modalities and 2,724 carry a confident non-inactive label; the final map is 48.9% ambiguous, 30.3% asymmetric_CRISPR and 20.8% asymmetric_ORF, with 536 significant Reactome terms concentrated in the asymmetric regimes. Against the official run, primary-only label agreement is 0.951 for the no-final-centering run, 0.994 for the artifact-sensitivity run and 0.758 for the interpretable pipeline, and plate-holdout final-label agreement is 0.868.";

const LABEL =
  "A physics force table on a levelling tripod, standing on a bench. Two pulleys are clamped to the degree-ruled rim; a string from the central ring runs over each pulley to a weight hanger with slotted masses. The left string carries a gene's ORF profile, the right its CRISPR profile. The angle between the strings shows the signed-cosine z score and the masses show the difference in activity strength. When the centre pin is pulled, the ring is held only by a sprung cord down the bore and settles along the loaded string. A counter on the bench counts the 200 bootstrap resamples and a lamp shows whether the label reached the 0.70 consensus. A case of spare masses, a spirit level, a ruler, a card file of genes and a label plate marked AU-12 stand on the bench.";

// The pose a gene's weighing ends in: pin pulled, ring settled.
export function poseOf(gene, { drop = S.PIN.travel, settled = 1, theta = angleOf(gene.z), tr = [null, null], masses = massesOf(gene) } = {}) {
  const phi = [S.FRONT + theta / 2, S.FRONT - theta / 2];
  const r = ringOf(phi, masses);
  return { phi, masses, ring: [r[0] * settled, r[1] * settled], drop, tr };
}
export const REST = poseOf(GENES[0]);
const HOLE_D = k.pathOf(Array.from({ length: 24 }, (_, i) => S.at([S.RING.rIn * Math.cos((i / 24) * 2 * Math.PI), S.RING.rIn * Math.sin((i / 24) * 2 * Math.PI), S.RING.z1])), true);

// the ring's turned chamfers, drawn once in its own space (the page only moves the ring)
const CHAMFERS = k.ring(0, 0, S.RING.rOut - 0.45, S.RING.z1, S.P, 28) + k.ring(0, 0, S.RING.rIn + 0.35, S.RING.z1, S.P, 20);
export function partSvg(part) {
  if (part.halo !== undefined) return `<path class="iso-halo sig-shadow" d="${part.halo}"/>`;
  if (part.s === S.RING_PATHS) return S.dynSolid(part.s, { tone: part.tone, lit: true, inner: CHAMFERS });
  if (part.s) return S.dynSolid(part.s, { tone: part.tone, lit: part.lit, inner: part.inner ?? null });
  return `<path class="iso-line" data-tone="${part.tone}" d="${part.d || ""}"/>`;
}
export function itemSvg(item) {
  const move = item.move && (item.move[0] || item.move[1]) ? ` transform="${k.translateAlong(S.P, item.move)}"` : "";
  // The pin below the ring's top is seen only through the hole's opening: it is clipped to
  // it and drawn after the ring, in front of the hole's far wall. The clip follows the ring.
  const clip = item.name === "pin-lo" ? `<clipPath id="sig-hole"><path data-hole${move} d="${HOLE_D}"/></clipPath>` : "";
  return `${clip}<g data-item="${item.name}"${clip ? ' clip-path="url(#sig-hole)"' : ""}${move && !clip ? move : ""}>${item.parts.map(partSvg).join("")}</g>`;
}

// Every item in painter's order, with its svg and (given the audit module) its shapes.
export function compose(pose = REST, A = null) {
  const st = staticParts(A);
  const dyn = dynamicItems(pose, A);
  const out = [];
  const layer = (id) => {
    out.push({ name: `layer-${id}-open`, svg: `<g data-layer="${id}">`, shapes: [] });
    ordered(dyn, id).forEach((item) => out.push({ ...item, svg: itemSvg(item) }));
    out.push({ name: `layer-${id}-close`, svg: "</g>", shapes: [] });
  };
  st.floor.forEach((p) => out.push(p));
  layer("F");
  layer("A");
  st.under.forEach((p) => out.push(p));
  layer("U");
  st.table.forEach((p) => out.push(p));
  layer("B");
  return out;
}

// Rewrite absolute M/L/Z path data as relative moves at the same 0.1 precision (the kit
// rounds every point to a tenth, so the differences are exact).
const tenth = (value) => {
  const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(/^(-?)0\./, "$1.");
  return text === "-0" ? "0" : text;
};
function compact(d) {
  if (!d || /[^MLZ0-9.\-\s,]/.test(d)) return d;
  let out = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let run = false;
  for (const [, cmd, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (cmd === "Z") {
      out += "z";
      run = false;
      cx = sx;
      cy = sy;
      continue;
    }
    const nums = args.trim().split(/[\s,]+|(?=-)/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Math.round(nums[i] * 10) / 10;
      const y = Math.round(nums[i + 1] * 10) / 10;
      if (cmd === "M" && i === 0) {
        out += `M${tenth(x)} ${tenth(y)}`;
        sx = x;
        sy = y;
        run = false;
      } else if (Math.abs(x - cx) > 1e-9 || Math.abs(y - cy) > 1e-9) {
        const a = tenth(x - cx);
        const b = tenth(y - cy);
        const text = a + (b.startsWith("-") ? "" : " ") + b;
        out += run ? (text.startsWith("-") ? text : ` ${text}`) : `l${text}`;
        run = true;
      }
      cx = x;
      cy = y;
    }
  }
  return out;
}
export const compactSvg = (svg) => svg.replace(/ d="([^"]*)"/g, (_, d) => ` d="${compact(d)}"`);

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function render() {
  const items = compose(REST);
  const svg = k.figureSvg({ width: S.W_PX, height: S.H_PX, label: LABEL, body: items.map((item) => item.svg) });
  const lines = readoutOf(GENES[0], "done");
  const lampOn = compactSvg(svg).replace('data-lamp="green"', 'data-lamp="green" data-on=""');
  const stage = `<div class="iso-stage sig-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Gene force table. Left and right arrows or keys 1 to 7 step through genes; Space, or a tap on the pin or the release knob, pulls or seats the centre pin; drag a pulley around the rim to set the string angle by hand; a tap elsewhere steps to the next gene.">${lampOn}<span class="sig-live" aria-live="polite"></span></div>`;
  let html = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  html = html.replace(" data-readout></span>", ` data-readout>${lines.map((line, index) => `<span class="sig-l${index + 1}">${escape(line)}</span>`).join("")}</span>`);
  return { html };
}

export { DIGITS };
