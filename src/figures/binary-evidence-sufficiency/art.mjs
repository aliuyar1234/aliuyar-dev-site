// Fig 11 static art: the turret spectrophotometer at rest (cell 1 in the beam, prompt end, CBN, spider parked).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { build } from "./parts.mjs";
import { ORDER } from "./order.mjs";
import { P, WIDTH, HEIGHT, T, BOX, BOX_TOP, MONO_TOP, KNOB, SCALE } from "./world.mjs";
import { readoutOf } from "./model.mjs";
import D from "./data.mjs";
import { minifyPaths } from "./minify.mjs";

export const REST = { cell: 0, anchor: 0, subset: 0, masked: false };

const LABEL =
  "A single-beam spectrophotometer on a bench: lamp housing, grating monochromator, an open sample compartment and a detector can on two clamped posts. The fixed beam stands for one HotpotQA question. A four-position turret holds four cuvettes, the question's four contexts (sufficient, sufficient with harder distractors, missing, misleading), and indexes one at a time into the beam. The detector stands for a linear probe on Qwen2.5-7B-Instruct hidden states; its green or red lamp shows the target label of the cell in the beam. The drum selects the read point, a lever the test subset, and a mask spider on the turret post caps all four cuvettes to mask page titles. The readout gives the paper's AUROC for that setting.";

export const TITLE = "Turret spectrophotometer";
export const HINT = "Index · tune · filter · mask";

export const KEYS = [
  { mark: "lit", label: "Cuvette in the beam: one context of the question" },
  { mark: "edge", label: "Beam: the HotpotQA question, held fixed" },
  { mark: "green", label: "Target sufficient: cells 1, 2 (clean, harder distractors)" },
  { mark: "red", label: "Target insufficient: cells 3, 4 (missing, misleading)" },
  { mark: "raised", label: `Detector: linear probe on ${D.model} hidden states` },
  { mark: "dim", label: "Drum: read point · lever: CBN, correct-only, wrong-only (n/r: not reported)" },
  { mark: "flat", label: "Mask spider: page titles masked in all four contexts" },
];

const f3 = (v) => v.toFixed(3);
const A = D.auroc.open;
export const CAPTION =
  `The paper holds each HotpotQA question fixed and swaps its context among four variants: sufficient, sufficient with harder distractors, one supporting paragraph removed, or one replaced by a high-overlap near-miss. ` +
  `On closed-book-negative (CBN) test questions, which the model cannot answer from the question alone, a linear probe on ${D.model} hidden states separates sufficient from insufficient context with AUROC ${f3(A[0][0])} at prompt end and ${f3(A[2][0])} after a two-step reasoning prefix, against ${f3(D.baselines.tfidf)} for a TF-IDF lexical baseline, ${f3(D.baselines.correctness)} for a correctness probe and ${f3(D.baselines.questionOnly)} for a question-only control. ` +
  `The separation holds with answer correctness fixed (${f3(A[2][1])} correct-only, ${f3(A[2][2])} wrong-only at step 2) and with page titles masked (${f3(D.auroc.masked[2][0])} at step 2).`;

const hull = (points) => k.pathOf(G.hullOf(points.map((p) => k.iso(p, P))), true);
const round = (cx, cy, r, z0, z1) => Array.from({ length: 24 }, (_, i) => [cx + r * Math.cos((i / 24) * 2 * Math.PI), cy + r * Math.sin((i / 24) * 2 * Math.PI)]).flatMap(([x, y]) => [[x, y, z0], [x, y, z1]]);
// later areas win where they overlap: the spider band sits over the cuvettes, the knob over the spider
const HITS = [
  ["turret", hull(round(T.x, T.y, 25, T.z0, T.cuvetteTop))],
  ["mask", hull(round(T.x, T.y, 21.5, T.cuvetteTop, T.knob0))],
  ["turret", hull(round(T.x, T.y, T.knob + 1.5, T.knob0, T.knob1 + 1))],
  ["drum", hull([...round(KNOB.x, KNOB.y, 11, MONO_TOP, MONO_TOP + 8), ...k.boxCorners({ x: SCALE.x - 2, y: SCALE.y - 2, w: SCALE.w + 4, d: SCALE.d + 4 }, MONO_TOP, MONO_TOP + 3)])],
  ["switch", hull(k.boxCorners(BOX, 0, BOX_TOP + 7))],
];

// the items in painter's order, the moving ones in their groups, the beam's second leg right after the turret
// (build.mjs checks that nothing that overlaps it is ordered between them), the hit areas last
export function bodyOf(items) {
  const byName = new Map(items.map((item) => [item.name, item]));
  const names = ORDER.filter((name) => byName.has(name) && name !== "beam");
  for (const name of byName.keys()) if (!names.includes(name) && name !== "beam") names.push(name);
  names.splice(names.indexOf("turret") + 1, 0, "beam");
  const out = names.map((name) => {
    const item = byName.get(name);
    return item.part ? `<g data-part="${item.part}">${item.svg}</g>` : item.svg;
  });
  return out.join("") + HITS.map(([act, d]) => `<path class="bs-hit" data-act="${act}" d="${d}"/>`).join("");
}

const esc = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const readoutHtml = ([l1, l2]) => `<span class="bs-l1">${esc(l1)}</span><span class="bs-l2">${esc(l2)}</span>`;

export function render() {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(build())) });
  const stage = `<div class="iso-stage bs-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Turret spectrophotometer. Left and right arrows index the turret through the four contexts, 1 to 4 pick a cell, up and down arrows set the read point, F steps the test subset, M lowers or lifts the title masks; click the turret, the drum, the detector box or the mask spider to do the same. Escape resumes the tour.">${svg}<span class="bs-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k
    .plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage })
    .replace(" data-readout></span>", ` data-readout>${readoutHtml(readoutOf(REST))}</span>`);
  if (!html.includes('class="bs-l1"')) throw new Error("readout slot not found in plateHtml markup");
  return { html };
}
