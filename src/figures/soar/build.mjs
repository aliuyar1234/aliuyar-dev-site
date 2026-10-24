// Fig 7 build: writes the standalone previews and (with --audit) proves the geometry over the tour.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + kit audit and painter's-order check in every sampled frame of one tour loop
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { P, leafBox } from "./view.mjs";
import { build, CORD, CORD_R, cordPieces } from "./geometry.mjs";
import { sceneAt, targetsOf, step, poseOf, LOOP, REST, UP } from "./model.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");
const STEP = Number((process.argv.find((a) => a.startsWith("--step=")) || "--step=0.25").slice(7));

// ------------------------------------------------------------ previews
const { render, bodyOf } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = existsSync(join(HERE, "figure.css")) ? readFileSync(join(HERE, "figure.css"), "utf8") : "";
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
let bundle = "";
let liveSize = 0;
if (existsSync(join(HERE, "live.js"))) {
  bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=SoarLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
  liveSize = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
}
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-soar" data-fig="soar" data-theme="${theme}">${html}</div>`;
  const script = bundle ? `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="soar"]')) SoarLive.mount(el);\n` : "";
  const name = theme === "light" ? "soar-light.html" : "soar.html";
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Overlay projector", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
const items = build(poseOf(REST));
console.log(`wrote preview/soar.html, preview/soar-light.html · static ${art} B (${(art / 1024).toFixed(1)} KB) · ${paths} paths · ${solids} solid groups · ${items.length} items · live ${(liveSize / 1024).toFixed(1)} KB (without kit)`);

// ------------------------------------------------------------ audit over the tour
if (auditing) {
  const offsetOf = (part, pose) => {
    if (part === "carriage" || part === "head") return [0, 0, pose.fz];
    if (part === "refJ") return [30 * pose.rj, 0, 0];
    if (part === "refQ") return [30 * pose.rq, 0, 0];
    return [0, 0, 0];
  };
  const shapeOf = (d, meta) => {
    const [kind, ...a] = d;
    const extra = typeof a[a.length - 1] === "object" && !Array.isArray(a[a.length - 1]) && !("x" in a[a.length - 1]) && !("o" in a[a.length - 1]) ? a.pop() : {};
    const m = { ...meta, ...extra };
    if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], m, 3);
    if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], m);
    if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], m);
    if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], m);
    if (kind === "ext") return A.extruded(a[0], a[1], a[2], m);
    if (kind === "solid") return A.solid(a[0], a[1], m);
    if (kind === "ball") return A.ball(a[0], a[1], m);
    if (kind === "leaf") {
      const b = leafBox(a[0], a[1]);
      return A.orientedBox(b.centre, b.axes, b.half, m);
    }
    throw new Error(kind);
  };
  // replay one loop of the tour with the live page's own dynamics
  const frames = [];
  {
    const pose = poseOf(sceneAt(0));
    const vel = { lj: 0, lq: 0, rj: 0, rq: 0, fz: 0 };
    const dt = 1 / 60;
    let next = 0;
    for (let t = 0; t < LOOP + 1e-9; t += dt) {
      const scene = sceneAt(t);
      step(pose, vel, targetsOf(scene, pose, vel), dt, false);
      if (t >= next - 1e-9) {
        frames.push({ t, pose: { ...pose }, scene });
        next += STEP;
      }
    }
    // the extremes of focus travel, both with a leaf down and with both leaves leaning on their stops
    for (const fz of [-5, 6]) {
      frames.push({ t: -1, pose: { lj: 0, lq: UP, rj: 0, rq: 1, fz }, scene: { sel: "J", down: "J", ref: "J" } });
      frames.push({ t: -1, pose: { lj: UP, lq: UP, rj: 1, rq: 0, fz }, scene: { sel: "Q", down: null, ref: "Q" } });
    }
    // every leaf angle in eighths from flat to its stop
    for (let i = 1; i < 8; i++) {
      const u = (UP * i) / 8;
      frames.push({ t: -2, pose: { lj: u, lq: UP, rj: 0.5, rq: 1, fz: 0 }, scene: { sel: "J", down: "J", ref: "J" } });
      frames.push({ t: -2, pose: { lj: UP, lq: u, rj: 1, rq: 0.5, fz: 0 }, scene: { sel: "Q", down: "Q", ref: "Q" } });
    }
    // a leaf switch, where both leaves move at once: J to Q and back, replayed with the live dynamics
    for (const [from, to] of [["J", "Q"], ["Q", "J"]]) {
      const scene = { sel: to, down: to, ref: from, focus: 0 };
      const pose = poseOf({ sel: from, down: from, ref: from, focus: 0 });
      const vel = { lj: 0, lq: 0, rj: 0, rq: 0, fz: 0 };
      const dt = 1 / 60;
      for (let t = 0, next = 0; t < 3.5; t += dt) {
        step(pose, vel, targetsOf(scene, pose, vel), dt, false);
        if (t >= next - 1e-9) {
          frames.push({ t: -3, pose: { ...pose }, scene });
          next += 0.1;
        }
      }
    }
  }
  // --quick: every 8th frame, for iterating; the full run proves the figure
  if (process.argv.includes("--quick")) frames.splice(0, frames.length, ...frames.filter((_, i) => i % 8 === 0));
  let failed = 0;
  const failing = [];
  const problems = new Map();
  const { dress } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
  const { viewOf } = await import(pathToFileURL(join(HERE, "view.mjs")).href);
  const { lampsOf } = await import(pathToFileURL(join(HERE, "model.mjs")).href);
  const pieces = cordPieces();
  for (const { t, pose, scene } of frames) {
    const list = build(pose, scene.sel);
    const iJ = list.findIndex((item) => item.name === "leafJ");
    if (pose.lj < pose.lq) list.splice(iJ + 1, 0, ...list.splice(iJ, 1));
    const view = viewOf(pose);
    const lamps = lampsOf(pose, scene);
    const R = A.recorder(P);
    R.route("cord", CORD, CORD_R, { limp: true, touch: ["stand.bench"] });
    list.forEach((item, index) => {
      if (item.piece) {
        const piece = pieces[item.chunk];
        R.put({ name: item.name, key: index, route: "cord", chunk: item.chunk, svg: item.svg, shapes: [A.tube(piece.points, piece.radii, { name: item.name, limp: true })] });
        return;
      }
      const offset = offsetOf(item.part || "", pose);
      const descs = typeof item.shapes === "function" ? item.shapes(pose) : item.shapes;
      const shapes = descs.map((d, j) => A.moved(shapeOf(d, { name: j ? `${item.name}#${j}` : item.name }), offset));
      shapes.forEach((s) => R.solid(s));
      const drawn = dress(item, view, lamps);
      const svg = item.part && offset.some((v) => v) ? `<g transform="${k.translateAlong(P, offset)}">${drawn}</g>` : drawn;
      R.put({ name: item.name, key: index, svg, shapes });
    });
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false });
    const count = A.failures(result);
    failed += count;
    if (count) {
      failing.push(t);
      const label = `t ${t.toFixed(2)} · J ${pose.lj.toFixed(2)} Q ${pose.lq.toFixed(2)} refs ${pose.rj.toFixed(2)}/${pose.rq.toFixed(2)} focus ${pose.fz.toFixed(2)}`;
      for (const line of A.report(result).split("\n")) {
        if (!/^\s/.test(line)) continue;
        const key = line.replace(/[\d.]+ px².*$/, "").replace(/\(k [\d.]+\)/g, "").trim();
        if (!problems.has(key)) problems.set(key, { line, frames: [] });
        problems.get(key).frames.push(label);
      }
    }
  }
  for (const { line, frames: where } of problems.values()) console.log(`${line}\n      in ${where.length} frames, first ${where[0]}`);
  console.log(`\naudited ${frames.length} frames (every ${STEP} s of one ${LOOP} s tour loop, both focus extremes, leaf angles in eighths, J↔Q switches every 0.1 s)`);
  console.log(failed ? `audit failed: ${failed} problems in ${failing.length} frames` : "audit passed");
  if (failed) process.exitCode = 1;
}
