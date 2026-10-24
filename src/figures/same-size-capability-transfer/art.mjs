// Fig 8 static art: the key duplicating machine after a finished sparse copy. Pure ESM, runs at build time.
import * as k from "../kit/iso-kit.mjs";
import { build, OPENING } from "./geometry.mjs";
import { ORDER } from "./order.mjs";
import { WIDTH, HEIGHT } from "./view.mjs";
import { readoutOf } from "./model.mjs";

export const CAPTION =
  "The paper builds a locked, deterministic testbed for transferring single-turn function calling from a task-trained Gemma-family 1B donor into its untuned same-size base, scored by strict full-call success on 1,920 SchemaShift and NoCall stress prompts. The donor is the master key and the base is the blank: the carriage copies a module fitted to the donor-minus-base delta at the layer-12 MLP output, as a sparse TopK cut set, a parameter-matched dense module, or one steering offset. Strict success rises from 0.0375 for the base to 0.1658 sparse and 0.2177 dense (three-seed means), and to 0.1078 with one steering offset, against 0.1781 for the donor. Dense recovers the most performance; sparse localizes part of it, with one locked feature keeping 47.1% of the sparse gain, above random one-feature controls.";

export const LABEL =
  "A bench key duplicating machine: a tracer stylus reads the master key in the left vise while a cutter wheel cuts the blank in the right vise; a pin rail on the carriage sets which of 256 stations the sparse mode cuts, and a dial grades the copy.";

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const readoutHtml = (lines) => lines.map((line) => `<span>${escape(line)}</span>`).join("");

// the kit writes absolute M/L/Z paths on a 0.1 grid; the same grid in relative steps is about half the bytes
const num = (tenths) => {
  const sign = tenths < 0 ? "-" : "";
  const a = Math.abs(tenths);
  const whole = Math.floor(a / 10);
  const frac = a % 10;
  return sign + (frac ? `${whole || ""}.${frac}` : `${whole}`);
};
const pair = (a, b) => {
  const x = num(a);
  const y = num(b);
  return x + (y[0] === "-" ? "" : " ") + y;
};
// drop the points of a run that lie within 0.04 px of the chord their neighbours span (on the 0.1 grid);
// a run keeps its ends, so every line still ends where it did
const TOL = 0.4;
function thin(pts) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [a, b] = [pts[i0], pts[i1]];
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let far = -1;
    let worst = TOL;
    for (let i = i0 + 1; i < i1; i++) {
      const p = pts[i];
      const dist = span ? Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / span : Math.hypot(p[0] - a[0], p[1] - a[1]);
      if (dist > worst) (worst = dist), (far = i);
    }
    if (far > 0) (keep[far] = 1), stack.push([i0, far], [far, i1]);
  }
  return pts.filter((_, i) => keep[i]);
}
export function tight(d) {
  // gather each run's points on the 0.1 grid and thin them, then write them relative
  const runs = [];
  for (const [, letter, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (letter === "Z") {
      if (runs.length) runs[runs.length - 1].closed = true;
      continue;
    }
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map((t) => Math.round(Number(t) * 10));
    for (let i = 0; i + 1 < v.length; i += 2) {
      const last = runs[runs.length - 1];
      if (letter === "M" && i === 0) runs.push({ pts: [], closed: false });
      else if (last.closed) runs.push({ pts: [last.pts[0]], closed: false }); // a line after Z starts at the run's start
      runs[runs.length - 1].pts.push([v[i], v[i + 1]]);
    }
  }
  d = runs.map(({ pts, closed }) => "M" + thin(pts).map(([x, y]) => `${x / 10} ${y / 10}`).join("L") + (closed ? "Z" : "")).join("");
  let out = "";
  let at = [0, 0];
  let start = [0, 0];
  let cmd = ""; // the command the next bare numbers would repeat
  const emit = (letter, text) => {
    out += letter === cmd ? (text[0] === "-" ? text : " " + text) : letter + text;
    cmd = letter;
  };
  for (const [, letter, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (letter === "Z") {
      out += "z";
      at = start;
      cmd = "";
      continue;
    }
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map((t) => Math.round(Number(t) * 10));
    for (let i = 0; i + 1 < v.length; i += 2) {
      const p = [v[i], v[i + 1]];
      const [dx, dy] = [p[0] - at[0], p[1] - at[1]];
      if (letter === "M" && i === 0) {
        const absolute = pair(p[0], p[1]);
        const relative = pair(dx, dy);
        out += relative.length < absolute.length ? "m" + relative : "M" + absolute;
        cmd = "";
        start = p;
      } else if (dx === 0) emit("v", num(dy));
      else if (dy === 0) emit("h", num(dx));
      else emit("l", pair(dx, dy));
      at = p;
    }
  }
  return out;
}
// a shade path is a list of facet quads; neighbours in the same tone share an edge, so merge them into strips
export function merged(d) {
  const polys = [];
  for (const [, body] of d.matchAll(/M([^MZ]*)Z?/g)) {
    const v = body.trim().split(/[\sL,]+/).filter(Boolean).map((t) => Math.round(Number(t) * 10));
    const pts = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push(`${v[i]},${v[i + 1]}`);
    if (pts.length > 2) polys.push(pts);
  }
  const clean = (pts) => {
    let out = pts;
    for (let changed = true; changed && out.length > 2; ) {
      changed = false;
      const n = out.length;
      for (let i = 0; i < n; i++) {
        const [a, b, c] = [out[(i + n - 1) % n], out[i], out[(i + 1) % n]];
        if (a === b || a === c) {
          out = out.filter((_, j) => j !== i && !(a === c && j === (i + 1) % n));
          changed = true;
          break;
        }
      }
    }
    return out;
  };
  for (let again = true; again; ) {
    again = false;
    const edges = new Map();
    polys.forEach((pts, id) => pts && pts.forEach((p, i) => edges.set(`${p}|${pts[(i + 1) % pts.length]}`, id)));
    for (let id = 0; id < polys.length && !again; id++) {
      const A = polys[id];
      if (!A) continue;
      for (let i = 0; i < A.length; i++) {
        const [p, q] = [A[i], A[(i + 1) % A.length]];
        const other = edges.get(`${q}|${p}`);
        if (other === undefined || other === id || !polys[other]) continue;
        const B = polys[other];
        const j = B.findIndex((x, n) => x === q && B[(n + 1) % B.length] === p);
        const a = [...A.slice(i + 1), ...A.slice(0, i + 1)]; // q … p
        const b = [...B.slice(j + 1), ...B.slice(0, j + 1)]; // p … q
        polys[id] = clean([...a, ...b.slice(1, -1)]);
        polys[other] = null;
        again = true;
        break;
      }
    }
  }
  const out = polys.filter((pts) => pts && pts.length > 2);
  const fmt = (t) => (t / 10).toString();
  return out.map((pts) => "M" + pts.map((p) => p.split(",").map((n) => fmt(Number(n))).join(" ")).join("L") + "Z").join("");
}
export const tighten = (markup) =>
  markup
    .replace(/(<path class="iso-shade"[^>]*? d=")([^"]*)"/g, (whole, head, d) => (/^[MLZ\d\s.,-]*$/.test(d) && d ? `${head}${merged(d)}"` : whole))
    .replace(/ d="([^"]*)"/g, (whole, d) => (/^[MLZ\d\s.,-]*$/.test(d) ? ` d="${tight(d)}"` : whole));

export function render() {
  const { items, clips } = build();
  const byName = new Map(items.map((item) => [item.name, item]));
  // neighbours in the order that move together share one group; at rest every group sits at its drawn place
  const body = [];
  let open = "";
  for (const name of ORDER) {
    const item = byName.get(name);
    if (!item) throw new Error(`order names a missing item: ${name}`);
    if (item.part !== open) {
      if (open) body.push("</g>");
      if (item.part) body.push(`<g data-part="${item.part}">`);
      open = item.part;
    }
    body.push(item.svg);
  }
  if (open) body.push("</g>");
  if (ORDER.length !== items.length) throw new Error(`order has ${ORDER.length} items, the build ${items.length}`);
  const svg = tighten(k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [`<defs>${clips}</defs>`, ...body] }));
  const stage = `<div class="sc-stage" tabindex="0" role="group" aria-label="Key duplicating machine. 1, 2, 3 or the arrows set the lever to sparse, dense or steering; Space or Enter pulls the handle; P toggles the one-feature pruning bolt.">${svg}<span class="sc-sr" aria-live="polite"></span></div>`;
  const html = k
    .plateHtml({
      fig: "Fig 8",
      title: "Key duplicating machine",
      hint: "Set lever · pull handle · prune",
      readout: "",
      keys: [
        { mark: "lit", label: "Blank: the untuned base, same size as the master" },
        { mark: "raised", label: "Master: the task-trained donor" },
        { mark: "flat", label: "Pin rail: 256 features; TopK keeps the top 16 per token" },
        { mark: "edge", label: "Params: sparse 590,081 · dense 591,232 · steering 1,152" },
      ],
      caption: CAPTION,
      body: stage,
    })
    .replace(" data-readout></span>", ` data-readout>${readoutHtml(readoutOf(OPENING.mode, OPENING.pruned, "done"))}</span>`);
  return { html };
}
