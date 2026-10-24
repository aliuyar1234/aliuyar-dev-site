// Fig 18 static art: the fractional still mid-consolidation (splitter on take-off, SDFT step 186 of 300).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build } from "./geometry.mjs";
import { WIDTH, HEIGHT } from "./rig.mjs";
import { ORDER } from "./order.mjs";
import { STILL, poseAt } from "./model.mjs";
import { viewOf } from "./view.mjs";
import DATA from "./data.mjs";
import { minifyPaths } from "./minify.mjs";

const LABEL =
  "A laboratory fractional distillation rig on a bench. A heating mantle on a retort stand heats a round-bottom flask; above it rise a Vigreux column with twelve rows of indentations and a still head whose bulb holds a thermometer and a swing funnel on a pin, tipped by an electromagnet clamped beside it. A take-off arm runs into a water-cooled Liebig condenser, a vacuum adapter and a conical receiver on a lab jack. A controller in front carries the heat dial, a three-position selector and a green take-off lamp.";

export const TITLE = "Fractional still";
export const HINT = "Click to heat · knob switches · head splits";

const c = DATA.conditions;
export const KEYS = [
  { mark: "lit", label: `Vapour: the task's ${DATA.N} rollouts. Under TTT it climbs one row of indentations per LoRA step and is vented after the task` },
  { mark: "raised", label: `Receiver: the persistent checkpoint, filled by take-off alone over the ${DATA.sdftSteps} SDFT steps` },
  { mark: "flat", label: `Thermometer: each condition's mean best reward on ${DATA.heldOut} held-out tasks. The collar marks the ${DATA.minReward} demonstration filter` },
  { mark: "green", label: `Splitter on take-off: SDFT on the ${DATA.kept} train-side demonstrations above the collar` },
];

export const CAPTION =
  `Discover-Then-Distill builds a compute-matched protocol with a strict update policy: test-time training on each held-out task is confined to an ephemeral LoRA adapter (${DATA.steps} steps × ${DATA.rollouts} rollouts, N = ${DATA.N}), and updates to the persistent checkpoint are reserved for self-distillation (SDFT, ${DATA.sdftSteps} steps, replay ${DATA.replay}) on train-side demonstrations that reach reward ${DATA.minReward}, ${DATA.kept} of ${DATA.train} tasks. ` +
  `On ${DATA.heldOut} held-out tasks with an ${DATA.backbone} backbone, mean best reward is ${c.base.reward.toFixed(4)} for base best-of-N, ${c.ttt.reward.toFixed(4)} for TTT and ${c.post.reward.toFixed(4)} after SDFT, with exact match ${c.base.em}%, ${c.ttt.em}% and ${c.post.em}%. ` +
  `Validation perplexity moves from ${DATA.ppl.base} to ${DATA.ppl.updated} after consolidation (ΔPPL ${DATA.ppl.delta.toFixed(3).replace("-", "−")}).`;

export function bodyOf(pose = poseAt(STILL)) {
  const { R, back } = build();
  const view = viewOf(pose);
  const byName = new Map(R.items.map((item) => [item.name, item]));
  const order = ORDER.length ? ORDER.filter((name) => byName.has(name)) : [...R.items].sort((a, b) => a.key - b.key).map((item) => item.name);
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);
  const items = order.map((name) => dress(byName.get(name).svg, view)).join("");
  return back.join("") + items;
}

// write a pose into the static markup: the same attributes live.js writes
export function dress(svg, view) {
  return svg.replace(/<g data-ref="(\w+)"([^>]*)>(<\/g>)?/g, (all, ref, rest, closed) => {
    const fill = view.inner[ref];
    const set = Object.entries(view.attrs[ref] || {});
    for (const [key] of set) rest = rest.replace(new RegExp(` ${key}="[^"]*"`), "");
    const attrs = set.map(([key, value]) => (value === null ? "" : ` ${key}="${value}"`)).join("");
    if (closed && fill !== undefined) return `<g data-ref="${ref}"${rest}${attrs}>${fill}</g>`;
    return `<g data-ref="${ref}"${rest}${attrs}>${closed || ""}`;
  }).replace(/<(path|circle) data-ref="(\w+)"([^>]*?)\/>/g, (all, tag, ref, rest) => {
    const attrs = view.attrs[ref];
    if (!attrs) return all;
    let out = rest;
    for (const [key, value] of Object.entries(attrs)) {
      const re = new RegExp(` ${key}="[^"]*"`);
      out = re.test(out) ? out.replace(re, value === null ? "" : ` ${key}="${value}"`) : out + (value === null ? "" : ` ${key}="${value}"`);
    }
    return `<${tag} data-ref="${ref}"${out}/>`;
  });
}

export function render() {
  const pose = poseAt(STILL);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(pose)) });
  const stage = `<div class="iso-stage dtd-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Fractional still for Discover-Then-Distill. Click, Space or Enter heats a held-out task through ${DATA.steps} steps of ${DATA.rollouts} rollouts; the right and left arrows step one TTT step; 1, 2 and 3 or the selector knob switch between base best-of-N, TTT and post-SDFT best-of-N; S or the still head puts the splitter on take-off and runs the consolidation; Escape resumes the tour.">${svg}<span class="dtd-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ fig: "Fig 18", title: TITLE, hint: HINT, readout: pose.readout, keys: KEYS, caption: CAPTION, body: stage });
  return { html };
}
