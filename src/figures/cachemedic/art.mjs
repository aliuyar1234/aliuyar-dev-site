// Fig 16 static art: the transcription turntable at rest, reading the held-out defect with the cleaning arm in the groove.
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import D from "./data.mjs";
import { scene } from "./scene.mjs";
import {
  WIDTH, HEIGHT, P, armPose, cleanPose, tonearmParts, cleanerParts, cueParts, selectorBar, epsPointer, SELECTOR, EPS_KNOB, KNOB_TOP,
  grooveTraces, cuePath, strobeDots, LAYERS, BUCKETS, solidFixed, T, ZP, PC, ZC, TOP, CLEAN, HEAD, ARM, STILL,
} from "./world.mjs";
import * as G from "../kit/lathe.mjs";
import { readoutOf } from "./model.mjs";
import { minifyPaths } from "./minify.mjs";
export { STILL };

export const TITLE = "Transcription turntable";
export const HINT = "Turn the knobs · move the arms";

const LABEL =
  "A broadcast transcription turntable standing on a low bench. The record stands for the stored key/value cache of a frozen gpt2-medium and the tonearm for the attention that reads it. A defect of one of six corruption types, set by a six-position selector, is pressed into the older part of the groove at a severity set by a three-detent knob, while the newest 32 tokens, marked by a cue bracket on the lead-in, stay clean. A light cleaning arm whose brush and roller span every groove ring, the learned rank-4 repair, rides the groove ahead of the stylus and restores it before it is read.";

export const KEYS = [
  { mark: "lit", label: "Cleaning head: R_φ, rank 4 on V in layers 10–11, self-distilled" },
  { mark: "raised", label: "Record: the stored KV cache, read by the frozen tonearm" },
  { mark: "flat", label: "Defect: pressed at ε, restored under the head before the stylus" },
  { mark: "edge", label: "Cue bracket: the newest 32 tokens, left clean" },
];

export const CAPTION =
  "CacheMedic++ adds a small learned repair to the key/value cache of a frozen gpt2-medium: a rank-4, query-conditioned correction to the values in layers 10 and 11, trained by self-distillation to match the model's own clean-cache outputs. In this model of it the record is the stored cache, the tonearm is the attention that reads it, and the cleaning arm is the repair, restoring the groove just before the stylus while the stored record stays as pressed. The selector picks one of six corruption types, pressed into the older tokens, all but the newest 32 (the overwrite into positions 16–47), and the severity knob steps ε through the paper's evaluation grid of 0, 0.08 and 0.16. Trained on five types and tested on the held-out sixth, contiguous overwrite, it lifts clean score from 0.2373 to 0.2466 and robustness AUC from 0.0390 for the best heuristic to 0.0401, and on gpt2-large clean score goes from 0.2974 to 0.3001.";

const L = (d, style) => k.lineSvg(d, style);
const named = (svg, name) => svg.replace(/^<(\w+)/, `<$1 data-m="${name}"`);

// one slot's parts in a state, each { name, svg, shapes }; build.mjs's audit and previews use the same function
const partOf = (p) => ({ name: p.name, svg: solidFixed(p.paths, { tone: p.tone, crease: p.crease, lit: p.lit, name: p.name }), shapes: p.shapes || (p.shape ? [p.shape] : []) });
const at = (p) => k.iso(p, P);
const dot = (p, name, r = 0.55, tone = "hi") => `<g class="iso-dots" data-tone="${tone}" data-m="${name}"><circle cx="${at(p)[0].toFixed(1)}" cy="${at(p)[1].toFixed(1)}" r="${r}"/></g>`;
export function slotParts(name, s) {
  switch (name) {
    case "selector": {
      const bar = selectorBar(SELECTOR.angles[s.type]);
      return [{ name: "selector", svg: solidFixed(bar.paths, { tone: "hi", name: "selector" }), shapes: [bar.shape] }];
    }
    case "eps":
      return [{ name: "epsPointer", svg: named(L(epsPointer(EPS_KNOB.angles[s.eps]), { tone: "hi" }), "epsPointer") + k.dotsSvg([at([EPS_KNOB.x, EPS_KNOB.y, KNOB_TOP.eps])], { size: 0.6, tone: "hi" }), shapes: [] }];
    case "strobe":
      return [{ name: "strobe", svg: `<g class="cm-dots" data-m="strobe">${strobeDots(s.spin).map((d, i) => `<path opacity="${(BUCKETS[i] * 0.55).toFixed(2)}" d="${d}"/>`).join("")}</g>`, shapes: [] }];
    case "record": {
      // the four defect rings in three layers of five opacity buckets, then the cue bracket on the lead-in
      const layers = grooveTraces(s.spin, s.type, D.eps[s.eps], cleanPose(s.b).down);
      const tone = { plain: "faint", bad: "hi", fixed: "mid" };
      const svg = LAYERS.map((name, L) => `<g data-m="${name}">${layers[L].map((d, i) => `<path class="iso-line cm-${name}" data-tone="${tone[name]}"${BUCKETS[i] < 1 ? ` opacity="${BUCKETS[i]}"` : ""} d="${d}"/>`).join("")}</g>`).join("");
      return [{ name: "grooves", svg: svg + `<path class="iso-line cm-cue" data-tone="mid" data-m="cue" d="${cuePath(s.spin)}"/>`, shapes: [] }];
    }
    case "cue":
      return cueParts(armPose(s.a).down).parts.map(partOf);
    case "tonearm": {
      const { parts, stylus, pins } = tonearmParts(armPose(s.a));
      const out = parts.map(partOf);
      // the pin head on the near cheek; the stylus goes under the cartridge so its root lands on the body
      out.splice(out.findIndex((p) => p.name === "arm.cheekNear") + 1, 0, { name: "pin", svg: dot(pins[1], "pin", 0.5, "mid"), shapes: [] });
      const line = `<path class="iso-line" data-tone="hi" data-m="stylus" d="${k.pathOf([at(stylus.root), at(stylus.tip)])}"/>`;
      out.splice(out.findIndex((p) => p.name === "arm.cartridge"), 0, { name: "stylus", svg: line + dot(stylus.tip, "tip"), shapes: [] });
      return out;
    }
    case "cleaner": {
      const { parts, bristles, axles } = cleanerParts(cleanPose(s.b));
      const out = parts.map(partOf);
      const d = bristles.map(([p, q]) => k.pathOf([at(p), at(q)])).join("");
      out.splice(out.findIndex((p) => p.name === "clean.tufts") + 1, 0, { name: "bristles", svg: `<path class="iso-line" data-tone="mid" data-m="bristles" d="${d}"/>`, shapes: [] });
      out.push({ name: "axle", svg: dot(axles[1], "axle", 0.5, "mid"), shapes: [] });
      return out;
    }
    default:
      return [];
  }
}
export function slotSvg(name, s) {
  const svg = slotParts(name, s).map((p) => p.svg).join("");
  return name === "tonearm" || name === "cleaner" ? `<g data-m="${name}">${svg}</g>` : svg;
}

export function bodyOf(s = STILL) {
  return scene().map((item) => (item.slot ? slotSvg(item.name, s) : item.svg)).join("");
}

// the cleaning arm's hit region: the screen hull of a box round the whole arm, from the hinge to the head's inner end, record to spine
function headHit() {
  const d = [Math.cos(CLEAN.theta), Math.sin(CLEAN.theta)];
  const n = [-d[1], d[0]];
  const pts = [];
  for (const u of [-12, HEAD.u[1] + 4]) for (const v of [-8, 5]) for (const z of [TOP, ZC + 4]) pts.push(at([PC[0] + d[0] * u + n[0] * v, PC[1] + d[1] * u + n[1] * v, z]));
  return k.pathOf(G.hullOf(pts), true);
}
// transparent hit regions over each control, drawn last
export function hitsSvg() {
  const disc = (x, y, z, r) => k.pathOf(Array.from({ length: 24 }, (_, i) => at([x + r * Math.cos((i / 24) * Math.PI * 2), y + r * Math.sin((i / 24) * Math.PI * 2), z])), true);
  const sector = (o, z, r1, a0, a1) => {
    const pts = [at([o[0], o[1], z])];
    for (let i = 0; i <= 16; i++) pts.push(at([o[0] + r1 * Math.cos(a0 + ((a1 - a0) * i) / 16), o[1] + r1 * Math.sin(a0 + ((a1 - a0) * i) / 16), z]));
    return k.pathOf(pts, true);
  };
  const lo = Math.min(ARM.theta, ARM.park) - 0.1;
  const hi = Math.max(ARM.theta, ARM.park) + 0.1;
  return `<g class="cm-hits">` +
    `<path data-hit="cue" d="${sector(T, ZP, 114, lo, hi)}"/>` +
    `<path data-hit="brush" d="${headHit()}"/>` +
    `<path data-hit="type" d="${disc(SELECTOR.x, SELECTOR.y, KNOB_TOP.selector, SELECTOR.r + 6)}"/>` +
    `<path data-hit="eps" d="${disc(EPS_KNOB.x, EPS_KNOB.y, KNOB_TOP.eps, EPS_KNOB.r + 6)}"/>` +
    `</g>`;
}

export function render() {
  const s = STILL;
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: minifyPaths(bodyOf(s) + hitsSvg()) });
  const stage = `<div class="iso-stage cm-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Transcription turntable. Click the selector or press T to pick a corruption type, click the severity knob or press E to step ε through 0, 0.08 and 0.16, click the cleaning arm or press B to lower or lift it, click the tonearm or press C to cue it. Escape resumes the tour.">${svg}<span class="cm-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ fig: "Fig 16", title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  const { l1, l2 } = readoutOf({ type: s.type, eps: s.eps, brush: s.b > 0.5, cued: s.a > 0.5 });
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const pieces = l2.map(([text, muted]) => `<span${muted ? " data-mute" : ""}>${esc(text)}</span>`).join("");
  html = html.replace(" data-readout></span>", ` data-readout><span class="cm-l1">${esc(l1)}</span><span class="cm-l2">${pieces}</span></span>`);
  return { html };
}
