// Fig 9 · static markup for the site (runs at build time in Astro's frontmatter). Pure ESM: no fs, no Node APIs.
import * as k from "../kit/iso-kit.mjs";
import { build } from "./geometry.mjs";
import { minifyPaths } from "./minify.mjs";
import { ORDER } from "./order.mjs";
import { P, WIDTH, HEIGHT, slideX, linkage, THETA_A, readoutOf } from "./view.mjs";

export const TITLE = "Blink comparator";
export const HINT = "Slide · blink · turn the screws";
export const LABEL =
  "A blink comparator. Plate A, Gemma 3 4B PT, and plate B, its instruction-tuned sibling, lie on two lit stages; a crank rocks a mirror that shows them in turn in one eyepiece, so the stars only one plate has flicker. A slide over plate A holds an empty frame, the FullDelta film with a verbosity-mask flap, and the CapMask film. A meter reads answer-token KL to IT; a rack holds the matched baselines.";
export const KEYS = [
  { mark: "lit", label: "Insert slide over plate A: empty, FullDelta, CapMask, FullDelta − VMask" },
  { mark: "raised", label: "Plate A, Gemma 3 4B PT · plate B, Gemma 3 4B IT, one neutral template" },
  { mark: "dotted", label: "Stars only one plate has: they flicker in the eyepiece, the blink" },
  { mark: "dashed", label: "Code bands on each film: sparse codes at L16 (back) and L28 (front)" },
  { mark: "edge", label: "Meter: answer-token KL to IT on the 600 test prompts" },
  { mark: "dim", label: "Rack: the matched baselines MeanDiff, RandomMask, ActivationMassMask" },
  { mark: "green", label: "Register lamp: the plates are aligned on the answer tokens" },
];
export const CAPTION =
  "The paper fits a sparse surrogate to the residual-stream differences between Gemma 3 4B PT and its instruction-tuned sibling at a mid and a late layer, under one neutral template, and adds the decoded difference back into the PT forward pass. Here plate A is PT, plate B is IT, and the slide lays that surrogate over plate A, which stills part of the blink. On 600 held-out prompts it lowers answer-token KL to IT from 1.256 to 0.901 (−28.3%), raises the capability composite from 0 to 0.070 (0.186 of the PT-to-IT gap) and shortens answers from 47.38 to 16.65 tokens, against 11.92 for IT. The slide also holds the frozen 5-feature CapMask, which reads 1.255, and a verbosity-mask flap that makes FullDelta − VMask, which reads 0.903.";

// drop the attributes figure.css supplies as defaults: faint creases and bevels, mid outlines
// and merge a solid's bevel into its crease, and runs of plain lines of one tone, into one path each
const compact = (svg) =>
  svg
    .replace(/<path class="iso-line iso-crease"( data-tone="[a-z]+") d="([^"]*)"\/><path class="iso-line iso-bevel"\1 d="([^"]*)"\/>/g, '<path class="iso-line iso-crease"$1 d="$2$3"/>')
    .replace(/<path class="iso-line" data-tone="([a-z]+)" d="[^"]*"\/>(?:<path class="iso-line" data-tone="\1" d="[^"]*"\/>)+/g, (run, tone) => `<path class="iso-line" data-tone="${tone}" d="${[...run.matchAll(/ d="([^"]*)"/g)].map((m) => m[1]).join("")}"/>`)
    .replace(/(<path class="iso-line iso-(?:crease|bevel)") data-tone="faint"/g, "$1")
    .replace(/(<path class="iso-line iso-edge") data-tone="mid"/g, "$1")
    .replace(/<path class="iso-line" data-tone="lo" d=/g, '<path class="iso-line" d=')
    .replace(/<g class="iso-dots" data-tone="mid">/g, '<g class="iso-dots">')
    .replace(/ r="0\./g, ' r=".');
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const STILL = { insert: 1, registered: true };

// parts that are rigid translations of another part are placed as <use> of one drawn source
export function render({ flat = false } = {}) {
  const rest = linkage(THETA_A);
  const { items } = build({ phi0: rest });
  const rank = new Map(ORDER.map((name, index) => [name, index]));
  const sorted = items.filter((item) => rank.has(item.name)).sort((a, b) => rank.get(a.name) - rank.get(b.name));
  const ids = new Map();
  if (!flat) for (const item of sorted) if (item.twin && !ids.has(item.twin)) ids.set(item.twin, `spd-${ids.size.toString(36)}`);
  const offsets = { slide: [slideX(STILL.insert), 0, 0], carrierA: [0, 0, 0], thimbleAX: [0, 0, 0], thimbleAY: [0, 0, 0] };
  // consecutive items of one moving part share one transformed group
  const runs = [];
  for (const item of sorted) {
    let svg = item.svg;
    if (!flat && item.twin) svg = `<use href="#${ids.get(item.twin)}" transform="${k.translateAlong(P, item.shift)}"/>`;
    else if (ids.has(item.name)) svg = `<g id="${ids.get(item.name)}">${svg}</g>`;
    const part = item.part || "";
    if (runs.length && runs[runs.length - 1][0] === part) runs[runs.length - 1][1] += svg;
    else runs.push([part, svg]);
  }
  const body = runs.map(([part, svg]) => (part ? `<g data-part="${part}" transform="${k.translateAlong(P, offsets[part] || [0, 0, 0])}">${svg}</g>` : svg)).join("");
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: compact(minifyPaths(body)) });
  const stage = `<div class="iso-stage spd-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Blink comparator. Click or tap to step the insert slide; click the mirror head, or press Space or B, to hold and restart the blink; click a stage screw, or press X or Y, to turn plate A off or back on register; the arrows or 1 to 4 move the slide; R registers the plates; Escape resumes the tour.">${svg}<span class="spd-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  const lines = readoutOf(STILL);
  html = html.replace(" data-readout></span>", ` data-readout>${lines.map((line) => `<span>${escape(line)}</span>`).join("")}</span>`);
  return { html };
}
