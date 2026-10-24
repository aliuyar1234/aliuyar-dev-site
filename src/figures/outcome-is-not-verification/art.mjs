// Fig 13 static art: the lever frame in its resting pose (arithmetic, LocalValidity, x1 changed, C2 just tried and held).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build, WIDTH, HEIGHT, LX, needleTransform, vec, screenOf } from "./scene.mjs";
import { ORDER } from "./order.mjs";
import { hitPolygons } from "./hits.mjs";
import { REST, SLOT_LEVERS, PAPER, scoreOf, needleOf, lampOf, meterOf, metersOf, armOf, scorerLine, stepLine, tappetOf, shiftOf, crossOf } from "./model.mjs";

export const TITLE = "Signal-box lever frame";
export const HINT = "Throw world · pull a lever · set target";

export const KEYS = [
  { mark: "lit", label: "Lever in hand: one step, its text held fixed" },
  { mark: "raised", label: `Levers: two world levers change x1 or d1, never both; ${PAPER.arith.slots} slot levers C1–C3, D1–D3, Ans (logic: ${PAPER.logic.slots} slots, one lever collared)` },
  { mark: "bar", label: "Lock bars: a changed input drives dogs into the tappets of the steps it invalidates" },
  { mark: "dim", label: "Arm repeater: the trace's final outcome o, level for a doomed splice" },
  { mark: "needle", label: "Meters, left to right: FlipAcc and PVS of the selected scorer, 0.5 to 1.0 (Table 2)" },
  { mark: "green", label: "Flip lamp, on a pulled locked lever: its valid twin scored above it" },
  { mark: "red", label: "Flip lamp: the twin scored below it" },
];

export const CAPTION = `An audit of hidden-state verifiers centred on counterfactual local validity: paired worlds differ in one branch-local input (arithmetic) or fact family (logic), and a strict same-step flip is the same step text, valid in one world and invalid in the other. Each slot lever is one schema slot, the tappet locking computes its local validity against the gold pre-step state, the arm repeater shows the trace's final outcome, and each repeater reads a linear scorer on pooled ${PAPER.model} hidden states. With extractor, scorer class and step pool held fixed, moving the supervision target from PrefixOutcome to LocalValidity takes strict same-step FlipAcc from 0.845 to 0.864 and PVS from 0.679 to 0.730 in arithmetic (${PAPER.arith.flips} test flips), and from 0.995 to 1.000 and 0.697 to 0.975 in logic (${PAPER.logic.flips}), as the two meters show. Repeater needles and flip lamps come from a score model fitted to those measured rates.`;

const LABEL = `A railway signal-box lever frame on a bench, standing for an audit of hidden-state verifiers. Two world levers on the left change one branch-local input; seven slot levers stand for the schema slots of an arithmetic trace. Beneath them a locking tray of sliding tappets and lock bars computes each step's local validity: when the x1 lever is reversed, its lock bar drives dogs into the tappets of C1 to C3 and Ans, so those levers cannot be pulled. On the shelf above, a repeater behind each slot lever shows a linear scorer's reading for that step, a commutator selects the scorer's supervision target and a knob selects the domain. At the shelf's far end an arm repeater shows whether the trace's final answer is correct, and two meters show the selected scorer's measured FlipAcc and PVS.`;

// the resting pose: x1 lever reversed, every slot read in both worlds of pair REST.pair
export function restState() {
  const { domain, target, world, pair, lever } = REST;
  const levers = LX.map(() => ({ stroke: 0, lift: 0, squeeze: 0 }));
  levers[0] = { stroke: 1, lift: 0, squeeze: 0 };
  const needles = {};
  const lamps = {};
  for (const i of SLOT_LEVERS) {
    needles[i] = needleOf(scoreOf(domain, target, pair, i, world));
    lamps[i] = lampOf(domain, target, pair, i, world); // every locked slot lever has been tried once in this world
  }
  return { domain, target, world, pair, lever, levers, needles, lamps, meters: metersOf(domain, target).map(meterOf), arm: armOf(world) };
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function bodyOf(state = restState(), { flat = false } = {}) {
  const items = build({ levers: state.levers, target: state.target, collar: state.domain === "logic", lit: state.lever, meters: state.meters, arm: state.arm });
  const byName = new Map(items.map((item) => [item.name, item]));
  const order = ORDER.filter((name) => byName.has(name));
  for (const item of items) if (!order.includes(item.name)) order.push(item.name);
  const travelW1 = tappetOf(state.levers[0].stroke);
  const travelW2 = tappetOf(state.levers[1].stroke);
  const move = {
    barB: vec(-shiftOf(travelW1), 0, 0),
    barC: vec(-shiftOf(travelW2), 0, 0),
    cross: vec(crossOf(travelW1, travelW2), 0, 0),
  };
  // repeated parts are drawn once in <defs> and placed: an offset on the floor is a fixed offset on screen
  const defs = new Map();
  const markup = (item) => {
    if (flat || !item.family) return item.svg;
    if (!defs.has(item.family)) defs.set(item.family, { x: item.fx, y: item.fy ?? 0, svg: `<g id="oi-${item.family}">${item.inner ?? item.svg}</g>` });
    const def = defs.get(item.family);
    const [sx, sy] = screenOf([item.fx - def.x, (item.fy ?? 0) - def.y, 0]);
    const use = `<use href="#oi-${item.family}"${Math.abs(sx) + Math.abs(sy) > 0.01 ? ` transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})"` : ""}/>`;
    return item.wrap ? item.wrap[0] + use + item.wrap[1] : use;
  };
  let svg = order.map((name) => markup(byName.get(name))).join("");
  if (defs.size) svg = `<defs>${[...defs.values()].map((d) => d.svg).join("")}</defs>` + svg;
  svg = svg.replace(/data-part="(barB|barC|cross)"/g, (all, part) => `${all} transform="${move[part]}"`);
  svg = svg.replace(/data-tappet="(\d)"/g, (all, i) => {
    const travel = tappetOf(state.levers[Number(i)].stroke);
    return travel > 1e-3 ? `${all} transform="${vec(0, travel, 0)}"` : all;
  });
  svg = svg.replace(/(data-needle="(\d)") transform="[^"]*"/g, (_, attr, i) => `${attr} transform="${needleTransform(state.needles[Number(i)] ?? -1.047)}"`);
  if (state.domain === "logic") svg = svg.replace("<g data-collar-rest>", '<g data-collar-rest opacity="0">');
  svg = svg.replace(/data-lamp="(\d)"/g, (all, i) => (state.lamps[Number(i)] ? `${all} data-on="${state.lamps[Number(i)]}"` : all));
  return svg;
}

export function render({ flat = false } = {}) {
  const state = restState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: bodyOf(state, { flat }) + hitAreas(state.levers.map((l) => l.stroke)) });
  const stage = `<div class="iso-stage oi-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Signal-box lever frame. Click a slot lever, or press 1 to 7, to pull it; click a world lever, or press C or D, to change the core or distractor input; click the commutator or press T to switch the scorer's supervision target; click the knob or press L to switch between arithmetic and logic, where slot lever 6 is collared; Escape resumes the tour.">${svg}<span class="oi-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  const lines = [stepLine(state.domain, state.lever, state.world), scorerLine(state.domain, state.target)];
  html = html.replace(" data-readout></span>", ` data-readout>${lines.map((line, i) => `<span class="oi-l${i + 1}">${escape(line)}</span>`).join("")}</span>`);
  return { html };
}

// invisible hit areas over each lever's stem, its tappet and its repeater; drawn last so they take the pointer
function hitAreas(strokes) {
  return `<g class="oi-hits">${hitPolygons(strokes).map(({ key, d, stem }) => `<path data-hit="${key}"${stem === undefined ? "" : ` data-stem="${stem}"`} d="${d}"/>`).join("")}</g>`;
}
