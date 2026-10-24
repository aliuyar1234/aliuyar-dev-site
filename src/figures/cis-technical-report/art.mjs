// Fig 22 static art: the glove box at rest, champion adapter-000075 seated, the record of iter-000149 lit.
// Pure ESM, no Node APIs: runs inside Astro's frontmatter at build time.
import * as k from "../kit/iso-kit.mjs";
import { buildItems, wellDef } from "./parts.mjs";
import * as W from "./world.mjs";
import { restPose, HIDDEN, TOTAL, VISIBLE } from "./model.mjs";
import { ORDER_EXT, ORDER_INT } from "./order.mjs";
import D from "./data.mjs";
import { minifyPaths } from "./minify.mjs";

const LABEL =
  "A laboratory glove box on a bench, a model of CIS. The sealed chamber is the offline sandbox. A challenger adapter cartridge enters through an antechamber: the outer door is clamped, the antechamber is evacuated and purged, and a handwheel on the chamber wall opens the inner door while it screws an interlock rod into a keeper on the outer door, so both doors are never open together. Four verifier boards hold one well per visible task (7, 8, 52 and 26), lit for the tasks the record on display passes; a locked compartment holds the 21 hidden tasks. A well that turns red is a regression, and the challenger goes back out. With none, a hatch opens under the champion's seat, the old champion drops into the chute, and the challenger takes the seat. Each decision prints a run record card into a sealed slot on the bench.";

export const TITLE = "Glove box";
export const HINT = "Load a challenger · tap latch · B baseline";

export const KEYS = [
  { mark: "lit", label: "Challenger adapter cartridge (DoRA adapter on qwen2_5_coder_7b_instruct)" },
  { mark: "raised", label: "Verifier boards: one well per visible task" },
  { mark: "green", label: "Passed by the record on display" },
  { mark: "red", label: "Regression: passed before, failed now" },
];

const sumVisible = VISIBLE.reduce((a, b) => a + b, 0);
export const CAPTION = `CIS is an offline-by-default sandbox that trains PEFT adapters on ${D.model} and lets a never-worse gate of deterministic verifiers decide each one: a challenger that regresses on any previously passed task is rolled back, and each decision is kept in iteration reports and immutable run records. On the ${sumVisible} visible tasks of four suite snapshots (${HIDDEN} more are held back for sealed evaluation), PASS@1 rose from the baseline iter-000021 to the champion iter-000149: core_code 0.0000 to 1.0000, core_math 0.1250 to 1.0000, core_logic 0.5000 to 0.8077 and concept_understanding 0.0000 to 1.0000, with ${D.champion} (${D.peft.method}, rank ${D.peft.rank}). The next two challengers were rolled back for regressing on logic_sat_48, and on logic_sat_10 and logic_sat_44.`;

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const HITS = [
  [/^(door|tray|cart\.ext|ac\.|valve|lever|gauge|lock\.)/, "load"],
  [/^safe/, "latch"],
  [/^(board|rack)/, "record"],
];
const hitOf = (name) => (HITS.find(([re]) => re.test(name)) || [])[1];

export function sortedItems({ unsettled = false } = {}) {
  const items = buildItems();
  const keyOf = (item, list) => {
    const i = list ? list.indexOf(item.name) : -1;
    if (i >= 0) return i;
    return item.key != null ? item.key : W.depth(item.at) + (item.bias || 0);
  };
  const ground = items.filter((i) => i.layer === "ground").sort((a, b) => a.key - b.key);
  const ext = items.filter((i) => i.layer === "ext");
  const int = items.filter((i) => i.layer === "int");
  const useExt = ORDER_EXT.length && !unsettled ? ORDER_EXT : null;
  const useInt = ORDER_INT.length && !unsettled ? ORDER_INT : null;
  const sortBy = (list, order) => {
    const plain = list.filter((i) => !i.after);
    plain.sort((a, b) => keyOf(a, order) - keyOf(b, order));
    for (const item of list.filter((i) => i.after)) {
      const at = plain.findIndex((p) => p.name === item.after);
      plain.splice(at + 1, 0, item);
    }
    return plain;
  };
  return { ground, ext: sortBy(ext, useExt), int: sortBy(int, useInt), routes: items.routes || [] };
}

export function windowClip() {
  const { x0, x1, w0, w1 } = W.WIN;
  return k.pathOf([W.face(x0, w0), W.face(x1, w0), W.face(x1, w1), W.face(x0, w1)].map(W.at), true);
}

// Parts built twice at positions that differ only by a translation (the two ports, gloves, valves, cradles, bands)
// are drawn once and repeated with <use>. Each pair is checked point by point, so a twin that drifts falls back to its own markup.
// The feet are exact translations of one another, but the kit drops a sliver-thin shade band on one and not the
// others (screen rounding), so their skeletons differ by that band: they are shared without the check.
const LOOSE = new Set(["stand.foot0"]);
const TWINS = [
  ["stand.foot0", "stand.foot1", "stand.foot2"],
  ["port-46", "port10"],
  ["glove-46:0", "glove10:0"],
  ["valve.evac", "valve.purge"],
  ["valve.evac.out", "valve.purge.out"],
  ["ac.cradle0", "ac.cradle1"],
  ["ac.band0", "ac.band1"],
];
// the offset is the projection of the world translation between the two parts' anchors; the markup must have the same skeleton
export function shareTwinsFor(items) { return shareTwins(items); }
function shareTwins(items) {
  const by = new Map(items.map((i) => [i.name, i]));
  const skeleton = (svg) => svg.replace(/"[^"]*"/g, '""');
  for (const [first, ...rest] of TWINS) {
    const a = by.get(first);
    if (!a) continue;
    const id = `cis-t-${first.replace(/[^a-z0-9]/gi, "")}`;
    let used = false;
    for (const name of rest) {
      const b = by.get(name);
      if (!b || (!LOOSE.has(first) && skeleton(a.svg) !== skeleton(b.svg))) continue;
      const [ax, ay] = W.at(a.at), [bx, by2] = W.at(b.at);
      b.svg = `<use href="#${id}" transform="translate(${(bx - ax).toFixed(1)} ${(by2 - ay).toFixed(1)})"/>`;
      used = true;
    }
    if (used) a.svg = `<g id="${id}">${a.svg}</g>`;
  }
}

// Plain solids (no lit, seamless or live-rewritten group) carry short slot classes styled in figure.css with the same
// tokens and stroke as the kit's. Twins keep the kit's classes (figure.css is scoped, and scoped rules do not reach into
// <use> copies), so does any group a <use> repeats (the cartridge), and so do the oil and the lamps, which figure.css
// restyles by the kit's classes.
const TWINNED = new Set(TWINS.flat());
const compact = (svg) =>
  /cis-oil|cis-lamp|<g id="/.test(svg)
    ? svg
    : svg.replace(/<g class="iso-solid">((?:<path [^>]*\/>)*)<\/g>/g, (m, inner) =>
        `<g>${inner
          .replace(/class="iso-shade" data-shade="(\d)"/g, 'class="cis-s$1"')
          .replace(/class="iso-fill"/g, 'class="cis-f"')
          .replace(/class="iso-top"/g, 'class="cis-t"')
          .replace(/class="iso-line iso-(?:edge|crease|bevel)" data-tone="(hi|mid|lo|faint)"/g, 'class="cis-$1"')}</g>`,
      );

// A kit dot row (one circle per screw) becomes one path of zero-length round-capped strokes: the same dots, a third the
// bytes. Kept as circles inside twins and shared groups, where the scoped rule would not reach.
const n1 = (v) => {
  const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t.replace(/^(-?)0\./, "$1.");
};
const compactDots = (svg) =>
  /<g id="/.test(svg)
    ? svg
    : svg.replace(/<g class="iso-dots" data-tone="(\w+)">((?:<circle [^>]*\/>)+)<\/g>/g, (m, tone, inner) => {
        const dots = [...inner.matchAll(/cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map(([, x, y, r]) => [+x, +y, +r]);
        if (!dots.length || dots.some((d) => d[2] !== dots[0][2])) return m;
        let d = "";
        let at = null;
        for (const [x, y] of dots) {
          d += at ? `m${n1(x - at[0])} ${n1(y - at[1])}h0` : `M${n1(x)} ${n1(y)}h0`;
          at = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
        }
        return `<path class="cis-dot" data-tone="${tone}" style="stroke-width:${n1(dots[0][2] * 2)}" d="${d.replace(/ -/g, "-")}"/>`;
      });

export function bodyOf() {
  const { ground, ext, int } = sortedItems();
  shareTwins([...ground, ...ext, ...int]);
  const wrap = (item) => {
    const hit = hitOf(item.name);
    let svg = TWINNED.has(item.name) ? item.svg : compactDots(compact(item.svg));
    // a moving part gets one group the live code can move, unless its markup already carries the name
    if (item.part && svg && !svg.includes(`data-part="${item.part}"`)) svg = `<g data-part="${item.part}">${svg}</g>`;
    return hit ? `<g data-hit="${hit}">${svg}</g>` : svg;
  };
  const interior = `<defs>${wellDef()}</defs><clipPath id="cis-winclip"><path d="${windowClip()}"/></clipPath><g class="cis-interior" clip-path="url(#cis-winclip)">${int.map(wrap).join("")}</g>`;
  const out = [...ground.map(wrap)];
  for (const item of ext) {
    if (item.name === "win.glass") out.push(interior);
    out.push(wrap(item));
  }
  return out.join("");
}

// the rest pose written into the static markup
export function dressed(svg, pose) {
  svg = svg.replace(/(<g class="cis-wells" data-board="(\d+)">)(.*?)<\/g>/g, (m, head, b, inner) => {
    let i = 0;
    return `${head}${inner.replace(/<use /g, () => `<use data-s="${pose.wells[+b][i++]}" `)}</g>`;
  });
  svg = svg.replace(/<g data-part="cartExt"/, `<g data-part="cartExt" style="opacity:${pose.vis}"`);
  svg = svg.replace(/<g data-part="cartInt" transform="[^"]*"/, (m) => `${m} style="opacity:${pose.vis}"`);
  svg = svg.replace(/data-part="cardStamp"/, `data-part="cardStamp" data-on="${pose.stamp}"`);
  return svg;
}

export function readoutHtml(lines) {
  return [0, 1, 2].map((index) => `<span class="cis-l${index + 1}">${escape(lines[index] || "")}</span>`).join("");
}

export function render() {
  const pose = restPose();
  const svg = k.figureSvg({ width: W.WIDTH, height: W.HEIGHT, label: LABEL, body: dressed(bodyOf(), pose) });
  const stage = `<div class="iso-stage cis-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Glove box. Press 1, 2 or 3 to load one of the three recorded challengers (iter-000149 promoted, iter-000150 and iter-000151 rolled back), Space for the next one, B to compare the baseline record, H to try the hidden-subset latch, Escape to resume the tour. Clicking the antechamber, the boards or the latch does the same.">${svg}<span class="cis-sr" role="status" aria-live="polite" data-status></span></div>`;
  let html = k.plateHtml({ fig: "Fig 22", title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  html = html.replace(" data-readout></span>", ` data-readout>${readoutHtml(pose.lines)}</span>`);
  // the site and the previews ship the same markup: path data shortened here, once
  return { html: minifyPaths(html) };
}
