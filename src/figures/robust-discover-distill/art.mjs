// Fig 19 static art: the press at rest in the first setting of the tour (random corruption, p = 0.3, D0).
// Pure ESM, no Node APIs: Astro calls render() at build time.
import * as k from "../kit/iso-kit.mjs";
import { W, H } from "./scene.mjs";
import { compose, hitsOf, REST } from "./parts.mjs";
import { conditionOf, readoutOf, grainStates, START } from "./model.mjs";

const SLUG = "robust-discover-distill";
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const CAPTION =
  "A small, fully reproducible benchmark for poisoned distillation data in a Discover→Distill loop, drawn as a tablet press whose 200 strokes are the 200 steps of Self-Distillation Fine-Tuning (SDFT). " +
  "The hopper holds 4,000 pairs from addition, sorting and string reversal, with a fraction p swapped for random-string or trigger-target demonstrations. " +
  "The screen is the format gate D1, which drops 0 of the 1,213 corrupted pairs at random p = 0.3 and 47 pairs at trigger p = 0.1, and the spring is Anchor-KL (D2), a trust-region penalty that keeps the student close to the frozen base model. " +
  "Over two seeds at random p = 0.3 the dial reads clean reward 0.002270 ± 0.001443 with D2 and 0.001803 ± 0.001077 without, and trigger success measures 0.000 in every tested condition, from no defence (D0) to both (D3).";

const LABEL =
  "A single-punch tablet press on a bench. A flywheel turns an eccentric that drives the upper punch into the die once per stroke. A hopper with a lift-out screen insert feeds a swinging feed shoe; pressed tablets slide down a chute into a tray, and a dial gauge beside it tests a sample. A console sets the poison type and fraction. The upper punch holder carries a spring under a tension knob; screwed down, it stops the punch short of full depth.";

// the drawing in painter's order; with { flat: true } every <use> is inlined, for the line check
export function svgOf(pose = REST, { flat = false } = {}) {
  const items = compose(pose);
  const hits = hitsOf();
  const hitSvg = Object.entries(hits).map(([name, d]) => `<path class="rdd-hit" data-hit="${name}" d="${d}"/>`).join("");
  let body = items.map((item) => item.svg);
  if (flat) {
    body = body.slice(1).map((svg) => svg.replace(/<use href="#rdd-([^"]+)"([^>]*)\/>/g, (_, id, rest) => `<g${rest}>${items.defs[id]}</g>`));
  }
  const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...body, hitSvg] });
  return flat ? svg : tight(svg);
}

// Path data on the same 0.1 px grid, smaller: outlines and lines lose the points that sit within 0.1 px of the chord
// they belong to (Douglas-Peucker; facets keep every corner so neighbours still meet), and every point after the
// first of a subpath is written relative to the one before it.
const num = (v) => String(Math.round(v * 10) / 10).replace(/^(-?)0\./, "$1.");
const join2 = (a, b) => a + (b[0] === "-" ? "" : " ") + b;
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let worst = tol;
    for (let m = i + 1; m < j; m++) {
      const [px, py] = pts[m];
      const dist = len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > worst) [worst, far] = [dist, m];
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([i, far], [far, j]);
    }
  }
  return pts.filter((_, m) => keep[m]);
}
export function tightD(d, tol = 0) {
  if (/[^MLZ\d\s.,-]/.test(d)) return d;
  const subs = [...d.matchAll(/M([^MZ]*)(Z?)/g)].map(([, body, z]) => {
    const v = (body.match(/-?\d*\.?\d+/g) || []).map(Number);
    let pts = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
    if (tol && pts.length > 3) {
      if (z) {
        const far = pts.reduce((best, p, i) => (Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) > Math.hypot(pts[best][0] - pts[0][0], pts[best][1] - pts[0][1]) ? i : best), 0);
        pts = [...simplify(pts.slice(0, far + 1), tol).slice(0, -1), ...simplify([...pts.slice(far), pts[0]], tol).slice(0, -1)];
      } else pts = simplify(pts, tol);
    }
    return { pts, z };
  });
  let out = "";
  for (const { pts, z } of subs) {
    if (!pts.length) continue;
    out += "M" + join2(num(pts[0][0]), num(pts[0][1]));
    for (let i = 1; i < pts.length; i++) {
      const pair = join2(num(pts[i][0] - pts[i - 1][0]), num(pts[i][1] - pts[i - 1][1]));
      out += i === 1 ? "l" + pair : join2("", pair);
    }
    if (z) out += "z";
  }
  return out;
}
const SMOOTH = /class="(iso-fill|iso-halo|iso-line[^"]*)"/;
const tight = (svg) => svg.replace(/<path((?: [^>]*?)?) d="([^"]*)"/g, (_, attrs, d) => `<path${attrs} d="${tightD(d, SMOOTH.test(attrs) ? 0.15 : 0)}"`);

export function render({ flat = false } = {}) {
  const c = conditionOf(START);
  let svg = svgOf(REST, { flat });
  const states = grainStates(c);
  let g = 0;
  svg = svg.replace(/<circle class="rdd-grain" data-g=""/g, () => `<circle class="rdd-grain" data-g="" data-state="${states[g++]}"`);
  const stage = `<div class="iso-stage rdd-stage" tabindex="0" role="group" aria-label="Tablet press for distillation poisoning. T switches the threat between random and trigger, P steps the poison fraction, S drops or lifts the screen (format gate D1), A tensions the anchor spring (Anchor-KL D2), Enter turns the flywheel through 200 strokes.">${svg}</div><span class="rdd-sr" role="status" aria-live="polite" data-status></span>`;
  const lines = readoutOf(c);
  let html = k.plateHtml({
    title: "Single-punch tablet press",
    hint: "Click a control · turn the flywheel",
    readout: "",
    keys: [
      { mark: "lit", label: "Upper punch: one SDFT step per stroke" },
      { mark: "raised", label: "Grains: ≈148 pairs each; bright = poisoned, ringed = trigger-target" },
      { mark: "dim", label: "Spring (D2): stops the punch short; stroke not to scale" },
      { mark: "red", label: "Pairs held by the screen (D1)" },
      { mark: "green", label: "Trigger test: success 0.000" },
      { mark: "edge", label: "Dial: clean mean reward ×10⁻³, limit hands ± std" },
    ],
    caption: CAPTION,
    body: stage,
  });
  html = html.replace(" data-readout></span>", ` data-readout>${lines.map((line, i) => `<span class="rdd-l${i + 1}">${escape(line)}</span>`).join("")}</span>`);
  return { html, slug: SLUG };
}
