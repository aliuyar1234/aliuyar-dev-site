// Fig 4 build: writes order.mjs, the standalone previews and (with --audit) proves the geometry.
//   node build.mjs                     previews in preview/
//   node build.mjs --audit             + kit audit and painter's-order check over the timeline (every 0.5 s of one loop and the opening reset)
//   node build.mjs --audit --step=0.25 a finer sample
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { tubePieces } from "../kit/tube.mjs";
import { build, P } from "./geometry.mjs";
import { poseAt, TOTAL, RESET, STILL, STARTS, HOLES, READ, DROP } from "./model.mjs";
import { viewOf } from "./view.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");
const STEP = Number((process.argv.find((a) => a.startsWith("--step=")) || "--step=0.5").slice(7));

// ------------------------------------------------------------ painter's order
const { items, routes } = build();
const ORDER_AFTER = { "cable.gauge": "gauge.stand" };
function orderNames() {
  const names = items.map((item) => item.name);
  for (const route of routes) {
    const count = tubePieces(route.points, route.r, P, { maxLength: 14 }).length;
    const chunks = Array.from({ length: count }, (_, i) => `${route.name}:${i}`);
    const after = names.indexOf(ORDER_AFTER[route.name]);
    names.splice(after + 1, 0, ...chunks);
  }
  return names;
}
const ORDER = orderNames();
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER, null, 0).replace(/","/g, '",\n  "').replace("[", "[\n  ").replace(/]$/, ",\n]")};\n`);

// ------------------------------------------------------------ previews
const { render, dress } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=CertiPatchLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveSize = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-certipatch" data-fig="certipatch" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="certipatch"]')) CertiPatchLive.mount(el);\n`;
  const name = theme === "light" ? "certipatch-light.html" : "certipatch.html";
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "CertiPatch jig", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/certipatch.html, preview/certipatch-light.html · static ${art} B (${(art / 1024).toFixed(1)} KB) · ${paths} paths · ${solids} solid groups · ${items.length} items · live ${(liveSize / 1024).toFixed(1)} KB (without kit)`);

// ------------------------------------------------------------ audit over the timeline
if (auditing) {
  // where every moving part sits in a pose: the same numbers view.mjs turns into transforms
  const offsetOf = (part, pose) => {
    if (part === "probe") return [126 * pose.probe, 0, 0];
    if (part === "yoke") return [0, 0, -20 * pose.yoke];
    if (part === "card") return [pose.card.dx, pose.card.dy, pose.card.dz];
    if (part === "ram") return [0, 0, -1.6 * pose.ram];
    if (part === "bridge") return [0, READ.span * pose.bridge, 0];
    if (part === "ledgeL") return [-1.8 * pose.ledge, 0, 0];
    if (part === "ledgeR") return [1.8 * pose.ledge, 0, 0];
    if (part.startsWith("pin")) return pose.punchRow >= 0 && HOLES[pose.punchRow][Number(part.slice(3))] ? [0, 0, -1.6 * pose.ram] : [0, 0, 0];
    throw new Error(part);
  };
  const shapeOf = (d, meta) => {
    const [kind, ...a] = d;
    if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], meta, 3);
    if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], meta);
    if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], meta);
    if (kind === "ring") return A.ring(a[0], a[1], a[2], a[3], a[4], meta);
    if (kind === "ball") return A.ball(a[0], a[1], meta);
    if (kind === "obox") return A.orientedBox(a[0], a[1], a[2], meta);
    if (kind === "prism") return A.extruded(a[0], a[1], a[2], meta);
    if (kind === "slide") return A.slide(a[0], a[1], a[2], a[3], meta);
    throw new Error(kind);
  };
  const times = [];
  for (let t = -RESET; t < 0; t += STEP) times.push(t);
  for (let t = 0; t < TOTAL; t += STEP) times.push(Math.round(t * 1000) / 1000);
  // and the moments a sample could straddle: each punch stroke at full depth, the card landing, the yoke seated mid-round
  for (let r = 0; r < 6; r++) times.push(STARTS.certify + 2.0 + r * 0.3 + 0.11);
  times.push(STARTS.reset + 0.85, STARTS.reset + 1.5, STILL, STARTS.tamper + 0.6);
  times.sort((a, b) => a - b);
  let failed = 0;
  const failing = [];
  const byName = new Map(items.map((item) => [item.name, item]));
  for (const T of times) {
    const pose = poseAt(T);
    const view = viewOf(pose);
    const R = A.recorder(P);
    const chunkOf = new Map();
    for (const route of routes) {
      R.route(route.name, route.points, route.r, { limp: true, touch: ["stand.bench"] });
      tubePieces(route.points, route.r, P, { maxLength: 14 }).forEach((piece, index) => chunkOf.set(`${route.name}:${index}`, { piece, route: route.name, index }));
    }
    ORDER.forEach((name, index) => {
      const item = byName.get(name);
      if (item) {
        const offset = item.part ? offsetOf(item.part, pose) : [0, 0, 0];
        const list = typeof item.shapes === "function" ? item.shapes(pose) : item.shapes;
        const shapes = list.map((d, j) => A.moved(shapeOf(d, { name: j ? `${name}#${j}` : name, ...(name.startsWith("stand.") ? { ground: true } : {}), ...(d.meta || {}) }), offset));
        shapes.forEach((s) => R.solid(s));
        const drawn = dress(item, view);
        const svg = item.part ? `<g transform="${k.translateAlong(P, offset)}">${drawn}</g>` : drawn;
        R.put({ name, key: index, svg, shapes });
      } else {
        const c = chunkOf.get(name);
        R.put({ name, key: index, route: c.route, chunk: c.index, svg: "", shapes: [A.tube(c.piece.points, c.piece.radii, { name, limp: true })] });
      }
    });
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    // the stacker pit, its ledges and a card dropping into it are clipped to the pit's mouth at deck height,
    // which hides exactly what the reader's walls and front fittings hide; the audit cannot see a clip
    const inPit = pose.card.dz < -0.01;
    const allow = [["unit.reader", "unit.pit"], ...(inPit ? ["unit.reader", "unit.ledgeL", "unit.ledgeR", "unit.lamps", "unit.bridgeRails"].map((n) => [n, "card"]) : [])];
    // between the ledges drawing back and the landing the card is a free body
    const falling = pose.ledge > 0.5 && pose.card.dz > -DROP + 1e-3;
    const ground = (shape) => A.grounded(shape) || (falling && shape.name === "card");
    const result = A.audit(R, P, { frames: [], apart: false, allow, ground });
    const count = A.failures(result);
    failed += count;
    if (count) {
      failing.push(T);
      console.log(`\n== T = ${T.toFixed(2)} s (${pose.phase}) failed: ${count}`);
      console.log(A.report(result));
    }
  }
  console.log(`\naudited ${times.length} timeline frames (every ${STEP} s of the loop and the opening reset, plus each punch stroke, the card drop and the tamper)`);
  console.log(failed ? `audit failed: ${failed} problems at T = ${failing.map((t) => t.toFixed(2)).join(", ")}` : "audit passed");
  if (failed) process.exitCode = 1;
}
