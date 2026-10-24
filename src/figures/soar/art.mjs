// Fig 7 static art: the overlay projector at rest (R_J folded onto S, the direct-adapter sheet F_J slid in beside it).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build } from "./geometry.mjs";
import { WIDTH, HEIGHT, viewOf } from "./view.mjs";
import { REST, poseOf, readoutOf, lampsOf } from "./model.mjs";
import { minifyPaths } from "./minify.mjs";
import D from "./data.mjs";

const LABEL =
  "An overhead projector on a bench, used as a model of SOAR. The lamp housing and the base transparency on registration pegs stay fixed: they stand for the frozen Qwen2.5-7B-Instruct and the plain-answer scaffold adapter S. Two overlay leaves on pin hinges, J for strict JSON and Q for exact quotation, fold down onto S one at a time; each carries only its operational residual R. A tray beside the stage holds the direct adapters' own sheets, F_J and F_Q, which slide in beside the stack to compare; a lamp at the end of each lane shows whether the stack matches. With both leaves raised back onto their stop posts the stack is the prompt-only control. A rack and pinion with a knurled knob focuses the projection head on its folding post.";

export const TITLE = "Overlay projector";
export const HINT = "Fold a leaf · slide a sheet · focus";

export const KEYS = [
  { mark: "lit", label: "Overlay leaf: residual ΔR = TSVD(ΔF − 1.0·ΔS), one at a time" },
  { mark: "raised", label: `Base sheet: scaffold S, LoRA rank ${D.lora.rank} on ${D.lora.modules.join(" and ")}` },
  { mark: "flat", label: "Reference sheets: direct adapters F_J, F_Q" },
  { mark: "green", label: "S + R beside its reference" },
  { mark: "red", label: "Prompt-only S beside its reference" },
];

export const CAPTION =
  `SOAR takes a scaffold adapter S trained for plain answers and a direct adapter F trained for each output contract on frozen ${D.model}, subtracts β·S from F in dense-delta space and recompresses the remainder with truncated SVD into a residual R. Stacked on the same scaffold, S + R reaches the direct adapter on the contract metric: strict schema validity ${D.overlays.J.soar.toFixed(4)} against ${D.overlays.J.direct.toFixed(4)}, and exact quotation ${D.overlays.Q.soar.toFixed(4)} against ${D.overlays.Q.direct.toFixed(4)}, with answer F1 within ${(D.overlays.J.directF1 - D.overlays.J.soarF1).toFixed(4)}. Prompting the contract on S alone scores ${D.overlays.J.prompt.toFixed(4)} on both metrics, so the recovered behaviour is not explained by prompting alone. Every number is a deterministic, parser-based score with greedy decoding on ${D.test.toLocaleString("en-US")} filtered SQuAD 1.1 test questions, with β = ${D.beta.toFixed(1)} selected on validation from {${D.betaGrid.map((b) => (b === 1 ? "1.0" : String(b))).join(", ")}}.`;

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// one item's markup in a pose: build.mjs's audit draws every frame through this too
export function dress(item, view, lamps) {
  return item.svg.replace(/data-lamp="(\w)"/g, (_, id) => `data-lamp="${id}"${lamps[id] ? ` data-on="${lamps[id]}"` : ""}`);
}

const GROUPS = { carriage: "head", head: "head", refJ: "refJ", refQ: "refQ" };

export function bodyOf(pose, scene) {
  const view = viewOf(pose);
  const lamps = lampsOf(pose, scene);
  const items = build(pose, scene.sel);
  // the leaf that is not standing up goes last, so it lies over the other leaf's hinge side
  const iJ = items.findIndex((item) => item.name === "leafJ");
  if (pose.lj < pose.lq) {
    const [leaf] = items.splice(iJ, 1);
    items.splice(iJ + 1, 0, leaf);
  }
  const out = [];
  let open = "";
  const close = () => {
    if (open) out.push("</g>");
    open = "";
  };
  for (const item of items) {
    const part = item.part || "";
    if (part !== open) {
      close();
      if (part) {
        open = part;
        const transform = GROUPS[part] ? ` transform="${view[GROUPS[part]]}"` : "";
        out.push(`<g data-part="${part}"${transform}>`);
      }
    }
    out.push(dress(item, view, lamps));
  }
  close();
  return out.join("");
}

export function readoutHtml(lines) {
  return lines.map((line, index) => `<span class="so-l${index + 1}">${escape(line)}</span>`).join("");
}

export function render() {
  const pose = poseOf(REST);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(pose, REST)) });
  const stage = `<div class="iso-stage so-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Overlay projector. J or Q folds that overlay leaf onto the base sheet and lifts the other first; P lifts both for the prompt-only control; R slides the direct-adapter sheet for the current overlay in or out; the up and down arrows turn the focus knob; Escape resumes the tour. Clicking a leaf, a reference sheet or the knob does the same.">${svg}<span class="so-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ fig: "Fig 7", title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  html = html.replace(" data-readout></span>", ` data-readout>${readoutHtml(readoutOf(pose, REST))}</span>`);
  return { html };
}
