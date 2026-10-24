// Fig 21 static art: the proof press at rest (operator O4 set, carriage home, the O4 proof on the delivery board).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build } from "./parts.mjs";
import { WIDTH, HEIGHT } from "./rig.mjs";
import { REST, readoutOf } from "./model.mjs";
import D from "./data.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

const LABEL =
  "A cylinder proof press on a bench. The type bed holds a forme locked in a chase with wooden furniture and quoins: five lines of a multiple-choice question, a brass rule, four option lines. A carriage on the bed rails carries the impression cylinder with its gripper bar, an ink drum over two form rollers and a feed board; a crank turns the cylinder through a pinion and gear. In front, a sort tray has one compartment per formatting operator and a selector rider; the press cabinet has a canonicalize lever, the bed two gate lamps, and proofs land on a delivery board at the right.";

export const TITLE = "Cylinder proof press";
export const HINT = "Pick · crank · canonicalize";

export const KEYS = [
  { mark: "lit", label: "Lit sorts: the characters the selected operator swaps, all inside the question; its words, the option lines and their labels stay as set" },
  { mark: "raised", label: "Sort tray: O1 curly apostrophe, O2 curly double quote, O3 in-word hyphen to en dash, O4 30% of eligible spaces to NBSP, O5 10% to tab, O6 soft wrap at 80 columns" },
  { mark: "flat", label: `Proof: one mark per gated ${D.task} question (n = ${D.n}) for ${D.model}; the red marks, set in reading order, count the answers whose option letter changed against the clean forme` },
  { mark: "edge", label: "Lever: canon_full maps curly quotes, dashes, NBSP, tabs and newlines back, so every operator's forme returns to one canonical forme" },
];

export const CAPTION = `RIA is a deterministic audit of formatting edits that keep a prompt's words and can still change a model's multiple-choice answer. Six operators edit the item's own text (the question, plus the passage for BoolQ) and leave the options and the prompt scaffold unchanged. Every example must fit the context window and keep its meaning in all of its variants, and option letters are scored by log-probability, giving ${D.rows.toLocaleString("en-US")} gated rows over BoolQ, ARC-Challenge and an 8-subject MMLU slice for Gemma2-2B and Llama3-8B. In the top cell, NBSP injection (O4) changes Llama3-8B's letter on 47 of ${D.n} MMLU questions (9.18%) while accuracy moves +0.98 pp, and token divergence is positively associated with flips in all six model and task settings (Spearman ρ ${D.rhoRange[0].toFixed(3)} to ${D.rhoRange[1].toFixed(3)}).`;

// the drawing in painter's order; with { flat: true } every <use> is inlined, for the line check. A <use> that carries
// its own class (the lit and plain sorts, which CSS moves) keeps it on an inner group, so the placement survives.
export function bodyOf({ flat = false } = {}) {
  const { items, defs, hits } = build();
  const byName = new Map(items.map((item) => [item.name, item]));
  const order = ORDER.filter((name) => byName.has(name));
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);
  let body = order.map((name) => byName.get(name).svg).join("") + `<g class="ria-hits">${hits}</g>`;
  const symbols = defs.filter((d) => d.startsWith("<g id="));
  const other = defs.filter((d) => !d.startsWith("<g id="));
  if (flat) {
    const parts = new Map(symbols.map((d) => [d.match(/id="([^"]+)"/)[1], d.replace(/^<g id="[^"]+">/, "").replace(/<\/g>$/, "")]));
    // run symbols nest, so inline until no <use> is left
    const inline = (html) => html.replace(/<use href="#([^"]+)"(?: x="([^"]+)" y="([^"]+)")?([^>]*)\/>/g, (_, id, x = 0, y = 0, rest) => `<g transform="translate(${x} ${y})">${rest ? `<g${rest}>${parts.get(id)}</g>` : parts.get(id)}</g>`);
    while (body.includes("<use ")) body = inline(body);
    return `<defs>${other.join("")}</defs>${body}`;
  }
  return `<defs>${defs.join("")}</defs>${body}`;
}

export function render({ flat = false } = {}) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf({ flat })) });
  const stage = `<div class="iso-stage ria-stage" data-op="${REST.op}" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Cylinder proof press. Press 1 to 6 or click a tray compartment to pick an operator, Space or a click on the press to crank a proof, C or a click on the lever to canonicalize, Escape to resume the tour.">${svg}<span class="ria-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ title: TITLE, hint: HINT, readout: readoutOf(REST), keys: KEYS, caption: CAPTION, body: stage });
  return { html };
}
