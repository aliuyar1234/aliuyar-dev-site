// Fig 11 build: settles the painter's order (order.mjs), writes the standalone previews, and with --audit
// proves the geometry in every pose the page can show (turret angles over a quarter turn with the mask spider
// parked, seated and in between, the beam at every detent, the plunger in and out of its notch).
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + the kit audit over the poses
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./parts.mjs";
import { P } from "./world.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");

// descriptor -> audit shape. A plan without a radius is a bug (the kit's slabOf turns it into NaN paths), so it throws.
function shapeOf(d, name) {
  const [kind, ...a] = d;
  const extra = d.meta || {};
  // a cut names the recorded host shapes; resolveCuts swaps the names for those shapes once everything is recorded
  const meta = { name, ...(name.startsWith("stand.") ? { ground: true } : {}), ...extra };
  let s;
  if (kind === "slab") {
    if (typeof a[0].r !== "number") throw new Error(`${name}: plan has no radius`);
    s = A.slab(a[0], a[1], a[2], meta, a[3] ?? 3);
  } else if (kind === "cyl") s = A.cylinder(a[0], a[1], a[2], a[3], a[4], meta);
  else if (kind === "disc") s = A.disc(a[0], a[1], a[2], a[3], meta);
  else if (kind === "ring") s = A.ring(a[0], a[1], a[2], a[3], a[4], meta);
  else if (kind === "solid") s = A.solid(a[0], a[1], meta);
  else if (kind === "ball") s = A.ball(a[0], a[1], meta);
  else if (kind === "ext") s = A.extruded(a[0], a[1], a[2], meta);
  else throw new Error(kind);
  return d.move ? A.moved(s, d.move) : s;
}
const shapesOf = (name, list) => list.map((d, j) => shapeOf(d, j ? `${name}#${j}` : name));
function resolveCuts(R) {
  const byName = new Map(R.solids.map((shape) => [shape.name, shape]));
  for (const shape of R.solids)
    if (shape.cut)
      shape.cut = shape.cut.map((host) => {
        if (typeof host !== "string") return host;
        if (!byName.has(host)) throw new Error(`${shape.name}: cut host ${host} not recorded`);
        return byName.get(host);
      });
}

// ------------------------------------------------------------ painter's order, settled from true depth at rest
{
  const R = A.recorder(P);
  build().forEach((item, index) => R.put({ name: item.name, key: index * 0.001, svg: item.svg, shapes: shapesOf(item.name, item.shapes).map(R.solid) }));
  resolveCuts(R);
  A.settle(R, P, { states: [0] });
  const order = [...R.items].sort((a, b) => a.key - b.key).map((item) => item.name);
  writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from measured depth. Back to front.\nexport const ORDER = ${JSON.stringify(order)};\n`);
}

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const bad = html.match(/NaN|undefined|Infinity/g);
if (bad) throw new Error(`static markup holds ${bad.length} NaN/undefined/Infinity tokens`);
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=BsLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const live = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" });
const liveMin = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--minify", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-binary-evidence-sufficiency" data-fig="binary-evidence-sufficiency" data-theme="${theme}">${html}</div>`;
  const script = `${bundle}\nfor (const el of document.querySelectorAll('[data-fig="binary-evidence-sufficiency"]')) BsLive.mount(el);\n`;
  const name = theme === "light" ? "binary-evidence-sufficiency-light.html" : "binary-evidence-sufficiency.html";
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Turret spectrophotometer", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
const fine = [...html.matchAll(/ (?:d|points)="([^"]*)"/g)].flatMap(([, d]) => d.match(/\d\.\d\d/g) || []).length;
console.log(`static ${art} B (${(art / 1024).toFixed(1)} KB) · ${paths} paths · ${solids} solids · ${fine} path numbers over 1 decimal · live.js ${Buffer.byteLength(live)} B (${Buffer.byteLength(liveMin)} B minified) without the kit`);

// ------------------------------------------------------------ audit over the poses the page can show
if (auditing) {
  const poses = [];
  for (const mask of [0, 1]) for (const theta of [0, -6, -15, -30, -45, -60, -75, -84]) poses.push({ theta, mask, label: `turret ${theta}°, spider ${mask ? "seated" : "parked"}` });
  // the spider moves only while the turret rests in a detent
  for (const theta of [-90, -180, -270]) for (const mask of [0, 1]) poses.push({ theta, mask, label: `turret ${theta}°, spider ${mask ? "seated" : "parked"}` });
  for (const theta of [0, -90]) for (const mask of [0.2, 0.5, 0.8, 0.97]) poses.push({ theta, mask, label: `turret ${theta}°, spider at ${mask}` });
  const { ORDER } = await import(pathToFileURL(join(HERE, "order.mjs")).href + `?v=${Date.now()}`);
  let failed = 0;
  for (const pose of poses) {
    const items = build(pose);
    const R = A.recorder(P);
    const byName = new Map(items.map((item) => [item.name, item]));
    // the order the page draws: art.mjs bodyOf puts the beam's second leg right after the turret
    const names = ORDER.filter((n) => n !== "beam");
    names.splice(names.indexOf("turret") + 1, 0, "beam");
    let index = 0;
    for (const name of names) {
      const item = byName.get(name);
      if (!item) continue;
      // the turret is drawn as its own stacks in the order the page sorts them, each stack as its pieces
      // (holder, cuvette, cap, arm), so the depth check sees the cuvette against its own holder
      const pieces = item.group ? item.group.flatMap((stack) => stack.pieces) : [item];
      for (const piece of pieces) {
        if (!piece.shapes.length) continue; // an empty layer draws nothing
        const shapes = shapesOf(piece.name, piece.shapes).map(R.solid);
        R.put({ name: piece.name, key: index++, svg: piece.svg, shapes });
      }
    }
    resolveCuts(R);
    const overlaps = A.overlapsOf(R.items, P, { states: [0] });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false });
    const count = A.failures(result);
    failed += count;
    if (count) console.log(`\n== ${pose.label}: ${count} problems\n${A.report(result)}`);
  }
  console.log(`\naudited ${poses.length} poses`);
  console.log(failed ? `audit failed: ${failed} problems` : "audit passed");
  if (failed) process.exitCode = 1;
}
