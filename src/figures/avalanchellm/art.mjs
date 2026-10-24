// Fig 20 static art: the hodoscope at rest (one-sided events, r* = 4e-5, g = 1.00, raw raster, first window).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build, cablePieces, WIDTH, HEIGHT } from "./parts.mjs";
import { REST, ROWS, COLS, readoutOf } from "./model.mjs";
import { GAINS, LAYERS, TOKENS, SEQUENCES, rowOf } from "./data.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

const LABEL =
  "A cosmic-ray hodoscope on a bench. A frame on a stand holds rows of Geiger-Mueller tubes: the top row lies open, each tube with an anode clip wired to a terminal strip, and every tube end carries a bezel cap and an indicator lamp on the front panel, 8 rows by 16 columns. Rows are layers of Qwen2.5-7B-Instruct and columns are token positions, so a lit lamp is an active site, where at least one gated-MLP unit crosses its layer's threshold. A discriminator rack at the end of the rows has one trimmer per row. A high-voltage supply on the right, with a mains rocker and a fuse holder on its front, carries the knurled gain knob with a detent for each gain in the grid and a marker at the calibrated g star, a target-rate selector, a coincidence meter whose needle reads total branching against a reference pointer at the shuffled baseline, a spike-definition toggle and a guarded shuffle toggle, and is cabled to the rack.";

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sci = (v) => {
  const [m, e] = v.toExponential(2).split("e");
  return `${m}×10${[...String(Number(e))].map((ch) => SUP[ch]).join("")}`;
};

export const TITLE = "Event cascade hodoscope";
export const HINT = "Turn the gain · flip the shuffle";

const r4 = rowOf(0, 2, 0);
const r4end = rowOf(0, 2, 10);
const maxErr = Math.max(...GAINS.map((_, g) => rowOf(0, 2, g).err));
export const KEYS = [
  { mark: "lit", label: `Lit lamp: an active site (layer ℓ, token t), where at least one unit of the standardized gated-MLP tensor crosses τ_ℓ; the full raster is ${LAYERS} layers × ${TOKENS} tokens, and aval. counts avalanches, 4-connected groups of active sites, over ${SEQUENCES} sequences` },
  { mark: "raised", label: "Gain knob: every block's MLP residual scaled by g, 11 detents from 0.70 to 1.30; the marker sits at g*, the gain whose b_tot is nearest 1" },
  { mark: "flat", label: "Trimmers: per-layer thresholds τ_ℓ(g) re-set at every gain so each layer's event rate stays on its target for r*" },
  { mark: "edge", label: "Coincidence meter: the needle reads b_tot from 0.25 to 1.75 with 1.00 straight up; the faint pointer reads b_perm, the shuffled baseline, so the gap between them is Δb" },
  { mark: "dim", label: "Shuffle: token order permuted within each layer, per-layer event counts kept exactly; with it on, the needle drops onto b_perm" },
];

export const CAPTION =
  `AvalancheLLM thresholds the gated-MLP activations of Qwen2.5-7B-Instruct into a token-by-layer event lattice and measures how events propagate: b_time is the fraction of active sites whose next token is also active, b_depth the fraction whose next layer is, and b_tot their sum. A gain g scales every block's MLP residual, per-layer thresholds keep each layer's event rate on its target for r* at every gain, and a within-layer token shuffle that keeps event counts exactly gives the baseline for Δb. One-sided at r* = 4×10⁻⁵, b_tot goes from ${r4.bTot.toFixed(3)} at g = ${GAINS[0].toFixed(2)} to ${r4end.bTot.toFixed(3)} at g = ${GAINS[10].toFixed(2)} and Δb from ${r4.dB.toFixed(3)} to ${r4end.dB.toFixed(3)}, with every layer's rate within ${sci(maxErr)} of target. The lamps show ${ROWS} of the ${LAYERS} layers and ${COLS} of the ${TOKENS} tokens, each window drawn to the measured b_time and b_depth of its setting.`;

// the drawing in painter's order; with { flat: true } every <use> is inlined, for the line check
export function bodyOf(state = REST, { flat = false } = {}) {
  const { items, routes, defs } = build(state);
  const byName = new Map(items.map((item) => [item.name, item]));
  for (const route of routes) cablePieces(route).forEach(({ svg }, index) => byName.set(`${route.name}:${index}`, { name: `${route.name}:${index}`, svg }));
  const order = ORDER.filter((name) => byName.has(name));
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);
  let body = order.map((name) => byName.get(name).svg).join("");
  if (flat) {
    const parts = new Map(defs.map((d) => [d.match(/id="([^"]+)"/)[1], d.replace(/^<g id="[^"]+">/, "").replace(/<\/g>$/, "").replace(/ id="[^"]+"/, "")]));
    body = body.replace(/<use href="#([^"]+)" x="([^"]+)" y="([^"]+)"([^>]*)\/>/g, (_, id, x, y, rest) => `<g transform="translate(${x} ${y})"${rest}>${parts.get(id)}</g>`);
    return body;
  }
  return `<defs>${defs.join("")}</defs>${body}`;
}

export function render({ flat = false } = {}) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(REST, { flat })) });
  const stage = `<div class="iso-stage av-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Event cascade hodoscope. Drag across the figure or press the left and right arrows to turn the gain through its grid; S or a tap on the guarded toggle flips the within-layer token shuffle; D or a tap on the other toggle flips the spike definition; R, the up and down arrows or a tap on the selector step the target rate; Space or a tap on the lamp panel latches another window; Escape resumes the tour.">${svg}<span class="av-sr" role="status" aria-live="polite" data-status></span></div>`;
  const [l1, l2] = readoutOf(REST);
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = k
    .plateHtml({ fig: "Fig 20", title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage })
    .replace(" data-readout></span>", ` data-readout><span class="av-l1">${esc(l1)}</span><span class="av-l2">${esc(l2)}</span></span>`);
  return { html };
}
