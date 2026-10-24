// Fig 15 static art: the height-gauge bench at its rest pose (S3, candidate on the shift split).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build } from "./geometry.mjs";
import { P, WIDTH, HEIGHT, offsetOf, pointerAt } from "./view.mjs";
import { restPose, readoutOf, REST_GOAL, EMPTIES, SETTINGS, DATA } from "./model.mjs";
import { minifyPaths } from "./minify.mjs";

export const SLUG = "what-survives-control-calibration";
export const TITLE = "Vernier height gauge";
export const HINT = "Pick setting · slide · swap split";

const LABEL =
  "A vernier height gauge on a granite surface plate. Two gauge-block stacks stand in front of it: the candidate abstraction, a structural-bits block under a held-out residual-bits block, and the matched-control frontier stack built the same way. The gauge is zeroed on the frontier and its scriber is lowered onto the candidate, so the height difference it reads is the gap g = frontier − L_res. A screw riser lifts the same candidate stack, unchanged, for the shift split. A slotted case beside it holds one block per configured candidate cell, 120 per setting, with a slot left empty for each cell logged as unevaluable; a three-position selector picks the setting.";

export const KEYS = [
  { mark: "lit", label: "Candidate residual block: held-out residual bits L_res" },
  { mark: "raised", label: "Frontier residual block: 5th-percentile residual of matched controls in the same 2-bit structural bin" },
  { mark: "flat", label: "Case: 4 high-level models × 3 site budgets × 10 map cells = 120 slots; tray: valid bins, test row and shift row" },
  { mark: "dim", label: "Empty slot: cell logged as unevaluable; empty tray pocket: one fewer valid bin" },
];

export const CAPTION =
  "The paper fixes an acceptance rule for causal abstractions in advance and reruns its full configured pool of 120 cells in a planted symbolic generator (S1), a two-layer IOI transformer trained from scratch (S2) and GPT-2-small on IOI (S3), accounting for every cell as recorded or logged unevaluable. Each candidate is scored as structural bits plus held-out residual bits L_res and gauged against a frontier built from matched spurious controls, their 5th-percentile residual in the candidate's 2-bit structural bin, on the test split and again on a shift split without refitting. Calibrating against these controls changes the decision in every setting, and support needs three gates at once: within 0.01 bits/example of the best candidate, a grouped-bootstrap lower bound on g_test = frontier − L_res above zero, and g_shift above zero. The readout's Δ is how far, in bits/example, the closest frontier-defined candidate sits from the best one, and the gauge reads that candidate's g; in S1 that candidate and the planted oracle A★ each tie the frontier at g = 0 on both splits.";

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// put the items in painter's order, wrapping each run of one moving part in its group
export function bodyOf(pose, items = build()) {
  const out = [];
  let open = null;
  const close = () => {
    if (open !== null && open !== "") out.push("</g>");
    open = null;
  };
  for (const item of items) {
    const move = item.move || "";
    if (open !== move) {
      close();
      open = move;
      if (move) out.push(`<g data-move="${move}" transform="${k.translateAlong(P, offsetOf(move, pose))}">`);
    }
    out.push(dress(item, pose));
  }
  close();
  return out.join("");
}

// one item's markup in a pose: build.mjs's audit draws every pose through this too
export function dress(item, pose) {
  let svg = item.svg;
  if (item.move === "lift") {
    const [dx, dy] = screenOf(offsetOf("lift", pose));
    svg = svg.replace(/<path data-hold d=/g, `<path data-hold transform="translate(${r1(-dx)} ${r1(-dy)})" d=`);
  }
  if (item.name === "select.knob") svg = svg.replace(/(data-part="pointer"[^>]*?) d="[^"]*"/, `$1 d="${pointerAt(pose.knob)}"`);
  if (!item.attrs) return svg;
  let attrs = item.attrs;
  const variant = /data-variant="(\d)"/.exec(attrs);
  if (variant && Number(variant[1]) !== pose.variant) attrs += " data-off";
  const slot = /data-slot="(\d+)"/.exec(attrs);
  if (slot && EMPTIES[pose.cased].has(Number(slot[1]))) attrs += " data-out";
  const bin = /data-bin="(\d)(\d)"/.exec(attrs);
  if (bin && Number(bin[2]) >= SETTINGS[pose.cased].bins[Number(bin[1])]) attrs += " data-out";
  return `<g ${attrs}>${svg}</g>`;
}

const r1 = (v) => Math.round(v * 100) / 100;
function screenOf([x, y, z]) {
  const a = k.iso([x, y, z], P);
  const o = k.iso([0, 0, 0], P);
  return [a[0] - o[0], a[1] - o[1]];
}

export function readoutHtml(lines) {
  return lines.map((line, index) => `<span class="ws-l${index + 1}">${escape(line)}</span>`).join("");
}

export function render() {
  const pose = restPose(REST_GOAL);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(pose)) });
  const stage = `<div class="iso-stage ws-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Vernier height gauge. Click the selector or press 1, 2 or 3 to pick the setting; click a stack or press the left and right arrows to slide the scriber to the frontier or the candidate; click the riser or press Space to swap the test and shift splits; Escape resumes the tour.">${svg}<span class="ws-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  html = html.replace(" data-readout></span>", ` data-readout>${readoutHtml(readoutOf(pose, REST_GOAL, true))}</span>`);
  return { html };
}

export { DATA };
