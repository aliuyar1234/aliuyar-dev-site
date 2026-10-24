// Fig 4 static art: the CertiPatch jig in its resting pose (patched, certified, replay passed).
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { build, cablePieces, WIDTH, HEIGHT } from "./geometry.mjs";
import { poseAt, STILL, PATCH_PARAMS, BASE_FAILS, DOMAIN, MIN_MARGIN, TAU, ROUNDS } from "./model.mjs";
import { viewOf } from "./view.mjs";
import { ORDER } from "./order.mjs";
import { minifyPaths } from "./minify.mjs";

const LABEL =
  "A bench test jig. A sealed, clamped block stands for a frozen language model, with 24 cooling fins for its 24 layers and four ports on its lid at layers 6, 12, 18 and 23. A spring probe on a rail sweeps its input strip and a dial reads failures out of 10,000 prompts. A handwheel on the press crown drives a patch plate down onto the four ports; each of its four taps has a trim knob whose pointer is re-set every round. On the right, cards feed from a magazine to a punch that records the certificate, then ride to a reader whose four check lamps and verdict lamp light when replay matches.";

export const TITLE = "Repair and certify jig";
export const HINT = "Click to step · nudge the patch";

export const KEYS = [
  { mark: "lit", label: "Certificate card: six recorded fields" },
  { mark: "raised", label: "Sealed block: Pythia-410M, 24 layers, frozen" },
  { mark: "flat", label: `Patch: rank-4 taps at layers 6, 12, 18, 23 (${PATCH_PARAMS.toLocaleString("en-US")} weights)` },
  { mark: "red", label: "Counterexample found, or a replay check failed" },
  { mark: "green", label: "Sweep clean, or a replay check matched" },
];

export const CAPTION =
  `CertiPatch repairs a frozen language model against a programmatic specification. It learns rank-4 corrections at four layers of Pythia-410M (${PATCH_PARAMS.toLocaleString("en-US")} weights), sweeps the specification's whole domain for counterexamples (prompts whose answer margin is below τ = ${TAU.toFixed(1)}), and adds the hardest to the next round. On COMPARE-2D ("Is 37 greater than 52?", all ${DOMAIN.toLocaleString("en-US")} pairs) the base model fails ${BASE_FAILS.toLocaleString("en-US")} prompts and the patched model none after ${ROUNDS} rounds, with every margin at least ${MIN_MARGIN.toFixed(2)}. The certificate records the model fingerprint, manifest and patch hashes, domain hash and metrics; replay recomputes each one and fails closed on any mismatch, such as a perturbed patch.`;

// put the cable chunks into the painter's order, then wrap each run of one moving part in its group
export function bodyOf(pose = poseAt(STILL)) {
  const { items, routes } = build();
  const byName = new Map(items.map((item) => [item.name, item]));
  for (const route of routes) cablePieces(route).forEach(({ svg }, index) => byName.set(`${route.name}:${index}`, { name: `${route.name}:${index}`, svg, part: "" }));
  const order = ORDER.filter((name) => byName.has(name));
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);
  const view = viewOf(pose);
  const out = [];
  let open = null;
  const close = () => {
    if (open) out.push(open.wrap ? "</g></g>" : "</g>");
    open = null;
  };
  for (const name of order) {
    const item = byName.get(name);
    const part = item.part || "";
    if ((open ? open.part : "") !== part || (open && open.wrap !== (item.wrap || ""))) {
      close();
      if (part) {
        open = { part, wrap: item.wrap || "" };
        const wrap = open.wrap === "data-cardclip" && view.cardClip ? `${open.wrap} clip-path="url(#cp-pit)"` : open.wrap;
        out.push((wrap ? `<g ${wrap}>` : "") + groupOpen(part, view));
      }
    }
    out.push(dress(item, view));
  }
  close();
  return out.join("");
}

function groupOpen(part, view) {
  const transform = part.startsWith("pin") ? view.pins[Number(part.slice(3))] : view[part];
  return `<g data-part="${part}" transform="${transform}">`;
}

// one item's markup in a pose: build.mjs's audit draws every frame through this too
export function dress(item, view) {
  let svg = item.svg;
  if (item.name === "card") {
    svg = svg.replace(/<g data-row="(\d)">/g, (_, r) => `<g data-row="${r}" opacity="${Number(r) < view.rows ? 1 : 0}">`);
    if (!view.cardLit) svg = svg.replace(" data-lit=\"\"", "");
  }
  svg = svg.replace(/data-lamp="(\w+)"/g, (_, id) => {
    const on = id === "probe" ? view.probeLamp : view.lamps[id];
    return `data-lamp="${id}"${on ? ` data-on="${on}"` : ""}`;
  });
  svg = svg.replace(/(data-part="needle"[^>]*?) d="[^"]*"/, `$1 d="${view.needle}"`);
  svg = svg.replace(/data-stripe="(\d)" d="[^"]*"/g, (_, i) => `data-stripe="${i}" d="${view.stripes[Number(i)]}"`);
  svg = svg.replace(/(data-(?:stripe|witness)="\d")/g, `$1 opacity="${view.witness}"`);
  svg = svg.replace(/data-spokes="" ([^>]*?)d="[^"]*"/, `data-spokes="" $1d="${view.spokes}"`);
  svg = svg.replace(/<g class="iso-solid" data-bar="(\d)">(.*?)<\/g>/g, (_, i, inner) => {
    let j = 0;
    return `<g class="iso-solid" data-bar="${i}">${inner.replace(/ d="[^"]*"/g, () => ` d="${view.bars[Number(i)][j++]}"`)}</g>`;
  });
  return svg;
}

export function render() {
  const pose = poseAt(STILL);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(pose)) });
  const stage = `<div class="iso-stage cp-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="CertiPatch jig. Click, Space or the right arrow steps through probe, patch, each repair round, certify and replay; the left arrow steps back; clicking the patch or pressing T nudges a trim so replay fails; Home starts over; Escape resumes the tour.">${svg}<span class="cp-sr" role="status" aria-live="polite" data-status></span></div>`;
  const html = k.plateHtml({ fig: "Fig 4", title: TITLE, hint: HINT, readout: pose.readout, keys: KEYS, caption: CAPTION, body: stage });
  return { html };
}
