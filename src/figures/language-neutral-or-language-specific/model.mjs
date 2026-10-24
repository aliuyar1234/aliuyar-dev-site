// Build-side model for Fig 5: reads data.mjs (the paper repo's results) and derives what the figure shows.
// Nothing here runs in the page; the page reads the compact table and levels this module writes into the markup.
import * as D from "./data.mjs";

export const MODELS = ["xlmr", "nllb_encoder"];
export const LANGS = ["en", "fr", "zh"];
export const COMPS = ["shared", "specific", "delta"];
export const mapIndex = (model, lang) => MODELS.indexOf(model) * 3 + LANGS.indexOf(lang);

// Luminance scale of the etched cells: SHARED and SPECIFIC share one scale (as in the paper's Fig. 8),
// SHARED - SPECIFIC has its own. A level is round(30 * value / full), clipped to -30..30.
export const FULL = { shared: 0.17, specific: 0.17, delta: 0.12 };
export const LEVELS = 30;
export const ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const enc = (v, full) => ALPHA[Math.max(-LEVELS, Math.min(LEVELS, Math.round((v / full) * LEVELS))) + 31];

export const slices = D.slices;
export const rois = D.rois;

// One string per plate: 18 runs (6 maps x 3 components) of one character per cell.
export function levelsOf(sliceIndex) {
  const out = [];
  for (const map of D.maps) {
    for (const key of COMPS) {
      out.push(map[key][sliceIndex].map((q) => enc(q * D.grid.scale[key], FULL[key])).join(""));
    }
  }
  return out.join("");
}

// Family Δz averaged over the middle-late layers (0.33 <= depth <= 0.83), the paper's confirmatory window.
const [MID0, MID1] = D.confirmatory.midLayerDepth;
function midDelta(curve, family) {
  const f = curve.family[family];
  const picks = curve.depth.map((d, i) => [d, i]).filter(([d]) => d >= MID0 - 1e-9 && d <= MID1 + 1e-9).map(([, i]) => f.shared[i] - f.specific[i]);
  return picks.reduce((a, b) => a + b, 0) / picks.length;
}

const find = (list, model, lang) => list.find((row) => row.model === model && row.lang === lang);

// The table the page reads: one entry per model x language, in mapIndex order.
export const table = MODELS.flatMap((model) =>
  LANGS.map((lang) => {
    const h1 = find(D.confirmatory.h1, model, lang);
    const aud = find(D.confirmatory.auditory, model, lang);
    const curve = find(D.layerCurves, model, lang);
    const map = D.maps[mapIndex(model, lang)];
    const r4 = (v) => Math.round(v * 1e6) / 1e6;
    return {
      model,
      lang,
      layer: map.layer,
      n: h1.n,
      effect: h1.effect,
      ciLow: h1.ciLow,
      ciHigh: h1.ciHigh,
      pPerm: h1.pPerm,
      pHolm: h1.pHolm,
      dz: h1.dz,
      sem: r4(midDelta(curve, "semantic")),
      aud: aud.effect,
      ctl: r4(midDelta(curve, "control")),
      depth: curve.depth.map((d) => Math.round(d * 1e4) / 1e4),
      shared: curve.family.semantic.shared.map(r4),
      specific: curve.family.semantic.specific.map(r4),
    };
  }),
);

// Checks against the paper's printed numbers, run by build.mjs.
export function selfCheck() {
  const problems = [];
  for (const row of table) {
    if (Math.abs(row.sem - row.effect) > 2e-6) problems.push(`${row.model}/${row.lang}: mid-layer semantic Δz ${row.sem} != H1 ${row.effect}`);
  }
  const want = { "xlmr/en": 0.0609, "xlmr/fr": 0.0589, "xlmr/zh": 0.0324, "nllb_encoder/en": 0.0415, "nllb_encoder/fr": 0.0429, "nllb_encoder/zh": 0.0194 };
  for (const row of table) if (row.effect.toFixed(4) !== want[`${row.model}/${row.lang}`].toFixed(4)) problems.push(`${row.model}/${row.lang} effect ${row.effect}`);
  return problems;
}
