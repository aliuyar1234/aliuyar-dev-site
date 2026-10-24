// Fig 17 static art: the test manifold in its resting pose (r = 2, full model, float at S0).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build, anglesOf } from "./geometry.mjs";
import { WIDTH, HEIGHT, P, XB, POSTS, PEDS, SUP, REF, YB, YC, COL, METER, VALVE, PAD, AGG, PUMP } from "./world.mjs";
import { REST, S0, EPS, GPT2 } from "./model.mjs";
import RUNS from "./runs.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

const f2 = (v) => v.toFixed(2);
const T1 = RUNS.T1;

const LABEL =
  "A hydraulic test manifold on a reservoir bench. A pump feeds a supply header; eight branch lines, each with a three-way ball valve, can draw either from the supply header or from a reference header below it, and all of them rejoin in a collecting header. A series three-way valve under a glass rotameter selects between the collected flow and the reference header, and the float in the tapered tube reads the mean absolute task metric of the scrubbed model against an epsilon band. A console carries the redundancy selector and two status lamps.";

export const TITLE = "Hydraulic test manifold";
export const HINT = "Turn knob · run discovery · flip lever";

export const KEYS = [
  { mark: "lit", label: `Float: |m|, the mean absolute task metric of the scrubbed model, read against the ε band S0 ± ${f2(EPS)}` },
  { mark: "raised", label: "Valves r0–r7: lever up keeps the node on the supply header, lever down resamples it from the reference header, lever level to the right is shut (not in the planted model)" },
  { mark: "flat", label: "aggr, the valve under the meter: up passes the collected flow, middle shuts the meter off while the GPT-2 rows are read" },
  { mark: "green", label: "Within ε, or every diagnostic passes" },
  { mark: "red", label: "Outside ε, or a certificate is issued" },
];

export const CAPTION =
  `ScrubID audits a circuit explanation by scrubbing: the circuit's components stay on the live model (the supply header), every other component is resampled from a reference distribution (the reference header), and the circuit is ε-faithful when the scrubbed model's task metric differs from the full model's by at most ε = 0.10·S0 on average. ` +
  `Across the near-optimal faithful circuits it finds, it measures how far apart they lie (RR), how stable 5 replicate discovery runs are (SSS) and what share of components are necessary in one of those circuits but not in another (CC), and it issues a certificate when any of them crosses its threshold. ` +
  `On the synthetic suite, planted redundancy factor 1 gives RR ${T1[1].RR.toFixed(0)} and CC ${T1[1].CC.toFixed(0)}, and factors 2, 4 and 8 give RR ${f2(T1[2].RR)}, CC ${f2(T1[2].CC)} to ${f2(T1[8].CC)} and a certificate in every run. ` +
  `On GPT-2 small (${GPT2.heads} heads, ${GPT2.mlps} MLPs), with activation patching, the attribution-patching generator and in-distribution prompts, the IOI circuit keeps ${GPT2.ioi.size.toFixed(1)} of ${GPT2.components} components (RR ${f2(GPT2.ioi.RR)}, SSS ${f2(GPT2.ioi.SSS)}, CC ${f2(GPT2.ioi.CC)}) and the induction circuit ${GPT2.induction.size.toFixed(1)} (RR ${f2(GPT2.induction.RR)}, SSS ${f2(GPT2.induction.SSS)}), mean of 5 seeds.`;

export const READOUT = `r ${REST.r} · full model · |m| ${f2(REST.m)} · S0 ${f2(S0)}`;

export const restPose = () => ({ angles: anglesOf(REST.valves), m: REST.m, r: REST.r });

// Parts that are the same part moved are drawn once. The camera is affine, so a copy moved in the world is the same
// picture moved on screen: branch b0 stands for b1..b7, the left post and pedestal for the right ones, the reference
// clamp band for the other bands, the bottom block and gland for the top ones. Each copy keeps its own painter's slot.
// build.mjs checks every pair against the full drawing. Levers, float, pointer and lamps move and stay apart.
const POST = ["flange", "post", "cap", "arm.sup", "arm.ref", "band.sup", "band.ref"];
const BANK = ["column", "nut", "padC", "union", "line:0", "line:1", "line:2"];
const bankSource = (part, dx) => [`b0.${part}`, [dx, 0, 0]];
export const TWINS = Object.fromEntries([
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((i) => BANK.map((part) => [`b${i}.${part}`, bankSource(part, XB[i] - XB[0])])),
  ...POST.map((part) => [`postR.${part}`, [`postL.${part}`, [POSTS[1] - POSTS[0], 0, 0]]]),
  ["postL.band.sup", ["postL.band.ref", [0, 0, SUP.z - REF.z]]],
  ["postL.arm.sup", ["postL.arm.ref", [0, 0, SUP.z - REF.z]]],
  ["postR.band.sup", ["postL.band.ref", [POSTS[1] - POSTS[0], 0, SUP.z - REF.z]]],
  ["postR.arm.sup", ["postL.arm.ref", [POSTS[1] - POSTS[0], 0, SUP.z - REF.z]]],
  ["postR.band.ref", ["postL.band.ref", [POSTS[1] - POSTS[0], 0, 0]]],
  ["postR.arm.ref", ["postL.arm.ref", [POSTS[1] - POSTS[0], 0, 0]]],
  ["pedL.band", ["postL.band.ref", [PEDS[0] - POSTS[0], YC - YB, COL.z - REF.z]]],
  ["pedR.band", ["postL.band.ref", [PEDS[1] - POSTS[0], YC - YB, COL.z - REF.z]]],
  ["pedR.flange", ["pedL.flange", [PEDS[1] - PEDS[0], 0, 0]]],
  ["pedR.post", ["pedL.post", [PEDS[1] - PEDS[0], 0, 0]]],
  ["meter.gland1", ["meter.gland0", [0, 0, METER.glass1 - METER.z1]]],
  ["meter.top", ["meter.bottom", [0, 0, METER.top0 - METER.z0]]],
  ["agg.end1", ["agg.end0", [5.6 + AGG.half, 0, 0]]],
  ["lamp.cert.bezel", ["lamp.eps.bezel", [0, 12, 0]]],
]);
for (const [copy, [source]] of Object.entries(TWINS)) if (TWINS[source]) throw new Error(`${copy}: its source ${source} is itself a copy`);
// short ids for the drawn sources (several figures share a page, so every id carries the figure's prefix)
const SOURCE_IDS = new Map([...new Set(Object.values(TWINS).map(([source]) => source))].sort().map((name, i) => [name, `su${i}`]));
const idOf = (name) => SOURCE_IDS.get(name);
const shiftOf = (by) => {
  const [x0, y0] = k.iso([0, 0, 0], P);
  const [x1, y1] = k.iso(by, P);
  return `x="${(x1 - x0).toFixed(2)}" y="${(y1 - y0).toFixed(2)}"`;
};

// the items in the settled painter's order, after the base
export function bodyOf(pose = restPose(), { twins = true } = {}) {
  const { R, base } = build(pose);
  const byName = new Map(R.items.map((item) => [item.name, item]));
  const order = ORDER.filter((name) => byName.has(name));
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);
  const sources = new Set(Object.values(TWINS).map(([source]) => source));
  const out = order.map((name) => {
    const svg = byName.get(name).svg;
    if (!twins) return svg;
    const twin = TWINS[name];
    if (twin && byName.has(twin[0])) return `<use href="#${idOf(twin[0])}" ${shiftOf(twin[1])}/>`;
    if (sources.has(name)) return `<g id="${idOf(name)}">${svg}</g>`;
    return svg;
  });
  return base + out.join("");
}

export function render() {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf()) });
  const stage = `<div class="iso-stage su-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="ScrubID test manifold. The knob or the up and down arrows set the planted redundancy factor r to 1, 2, 4 or 8. Space, Enter or a click runs discovery, which sets each near-optimal faithful valve pattern in turn and reports RR, SSS and CC. Clicking a lever, or keys 0 to 7 and A, flips that valve between the supply and reference headers to test necessity. Home restores the full model; Escape resumes the tour.">${svg}<span class="su-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ fig: "Fig 17", title: TITLE, hint: HINT, readout: READOUT, keys: KEYS, caption: CAPTION, body: stage });
  return { html };
}
