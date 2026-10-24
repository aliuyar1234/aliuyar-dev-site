// Fig 14 static art: the editing bench stopped on the last run's first unsafe step.
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import D from "./data.mjs";
import { build, LABEL } from "./parts.mjs";
import { poseAt, chipAfter, STILL } from "./model.mjs";
import { WIDTH, HEIGHT } from "./scene.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

export const TITLE = "Film editing bench";
export const HINT = "Click to step · drag to crank";

const S = D.sweep;

export const KEYS = [
  { mark: "lit", label: "Viewer screen: the frame in the gate" },
  { mark: "raised", label: "Film: a frame per agent step; on the held-out reels, a frame per run" },
  { mark: "flat", label: `Trim rack: a pin per train stem (${S.trainStems}), a card per ${D.pairsPerEvent} pairs` },
  { mark: "red", label: "Flag and cross: a step at severity ≥ 3" },
  { mark: "green", label: "Lamps: safe rewrite taped in (splicer), KPI met with no step at severity ≥ 3 (viewer)" },
];

export const CAPTION =
  `The paper builds a pipeline that finds the first executed step where an LLM agent's action on ODCV-Bench reaches severity 3 or higher, rewrites only that step into a minimal safe alternative, and trains LoRA-DPO and chosen-only SFT adapters for Qwen2.5-7B-Instruct on the resulting next-turn pairs. ` +
  `A complete ${S.runs}-run train sweep over ${S.trainStems} scenario stems has ${S.events} runs at severity 3 or higher (${S.severity[3]} at 3, ${S.severity[4]} at 4, ${S.severity[5]} at 5), and their first unsafe steps give ${S.pairs} pairs from ${S.stems} stems. ` +
  `Each method is then scored on ${D.heldOutRuns} held-out runs (final audited outputs) by HS-MR, the share of runs that reach severity 3 or higher, and by Safe-KPI-SR, the share that meet the KPI with no such step, and the viewer counts both run by run.`;

// the static items in the settled painter's order, with the pair card in the slot its pose needs
export function orderedItems(pose) {
  const all = build(pose);
  const rank = new Map(ORDER.map((name, index) => [name, index]));
  const chip = all.find((item) => item.chip);
  const rest = all
    .filter((item) => !item.chip)
    .map((item, index) => [item, rank.has(item.name) ? rank.get(item.name) : ORDER.length + index])
    .sort((a, b) => a[1] - b[1])
    .map(([item]) => item);
  const after = chipAfter(pose);
  const at = after ? rest.findIndex((item) => item.name === after) + 1 : rest.length;
  rest.splice(at, 0, chip);
  return rest;
}

export function render() {
  const pose = poseAt(STILL);
  const body = orderedItems(pose).map((item) => item.svg).join("");
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(body) });
  const stage = `<div class="iso-stage fs-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Film editing bench. Click, Space or the right arrow cranks to the next stop: a run's first unsafe step in the viewer, its cut and splice, then the pair card on its stem's pin; after the sweep, each held-out reel's HS-MR and Safe-KPI-SR. The left arrow steps back, dragging sideways cranks the film by hand, Home starts over and Escape resumes the tour.">${svg}<span class="fs-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ fig: "Fig 14", title: TITLE, hint: HINT, readout: pose.readout, keys: KEYS, caption: CAPTION, body: stage });
  return { html };
}
