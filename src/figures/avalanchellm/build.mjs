// Fig 20 build: settles the painter's order (order.mjs), writes the standalone previews and, with --audit, proves the geometry.
//   node build.mjs           previews in preview/ (+ -flat pages with every <use> inlined, for scripts/lines.mjs)
//   node build.mjs --audit   + the kit audit at rest and with both toggles thrown
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build, cablePieces, P } from "./parts.mjs";
import { REST } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "avalanchellm";
const auditing = process.argv.includes("--audit");
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const shapeOf = (d, meta) => {
  const [kind, ...a] = d;
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], meta, 3);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], meta);
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], meta);
  if (kind === "ring") return A.ring(a[0], a[1], a[2], a[3], a[4], meta);
  if (kind === "ball") return A.ball(a[0], a[1], meta);
  if (kind === "box") return A.box(a[0], a[1], meta);
  if (kind === "solid") return A.solid(a[0], a[1], meta);
  if (kind === "tube") return A.tube(a[0], a[1], meta);
  throw new Error(kind);
};

// record one pose into a recorder: every item with its true shapes, every cable chunk as its own item
function record(state) {
  const { items, routes } = build(state);
  const R = A.recorder(P);
  const V = G_view(P);
  for (const item of items) {
    // shapes of one item share an owner, so a part's own collar or bezel may overlap its body
    const shapes = item.shapes.map((d, j) => R.solid(shapeOf(d, { name: j ? `${item.name}#${j}` : item.name, owner: item.name, ...(item.name.startsWith("stand.") ? { ground: true } : {}) })));
    R.put({ name: item.name, at: item.at, svg: item.svg, shapes });
  }
  for (const route of routes) {
    R.route(route.name, route.points, route.r, { limp: true, bundle: "harness", gaps: route.gaps || [], touch: ["harness.stand*", `${route.name}.*`] });
    cablePieces(route).forEach(({ piece, svg }, index) => {
      const name = `${route.name}:${index}`;
      R.put({ name, route: route.name, chunk: index, key: dotV(piece.mid, V), svg, shapes: [A.tube(piece.points, piece.radii, { name, limp: true, bundle: "harness" })] });
    });
  }
  return R;
}
function G_view(P) {
  return A.cameraBasis(P).V;
}
const dotV = (p, V) => p[0] * V[0] + p[1] * V[1] + p[2] * V[2];

// ------------------------------------------------------------ painter's order
const R = record(REST);
A.settle(R, P);
const ORDER = [...R.items].sort((a, b) => a.key - b.key).map((item) => item.name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from the audit's measured depths. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER)};\n`);

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const flat = render({ flat: true }).html;
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=AvalancheLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveSize = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
const liveMin = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--minify", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
for (const [markup, suffix] of [[html, ""], [flat, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${markup}</div>`;
    const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) AvalancheLive.mount(el);\n`;
    writeFileSync(join(HERE, "preview", `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Event cascade hodoscope", theme, body, script, width: 650 }));
  }
const count = (markup, re) => (markup.match(re) || []).length;
console.log(
  `wrote preview/${SLUG}.html and -light.html (+ -flat) · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${count(html, /<path/g)} paths, ${count(html, /<use /g)} placements · ${count(flat, /class="iso-solid/g)} solids placed · ${R.items.length} items · live ${(liveSize / 1024).toFixed(1)} KB (${(liveMin / 1024).toFixed(1)} KB minified)`,
);

// ------------------------------------------------------------ audit: at rest, and with both toggles thrown
if (auditing) {
  let failed = 0;
  for (const state of [REST, { ...REST, def: 1, shuffled: true }]) {
    const Q = state === REST ? R : record(state);
    if (Q !== R) {
      // the order is the one the page draws: the settled rest order
      const rank = new Map(ORDER.map((name, i) => [name, i]));
      for (const item of Q.items) item.key = rank.get(item.name) ?? 0;
      const overlaps = A.overlapsOf(Q.items, P, { states: [0], skip: A.sameRun });
      Q.settled = { items: Q.items, overlaps, solved: { keys: Q.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    } else {
      const rank = new Map(ORDER.map((name, i) => [name, i]));
      for (const item of R.items) item.key = rank.get(item.name);
      R.settled.solved.keys = R.settled.items.map((i) => i.key);
    }
    const result = A.audit(Q, P, { frames: [], apart: false });
    const n = A.failures(result);
    console.log(`\n== ${state === REST ? "rest" : "toggles thrown"}: ${n} problems`);
    console.log(A.report(result));
    failed += n;
  }
  console.log(failed ? `audit failed: ${failed} problems` : "audit passed");
  if (failed) process.exitCode = 1;
}
