// Fig 6 build: settles the painter's order (order.mjs), writes the standalone previews and, with --audit, proves the geometry.
//   node build.mjs           previews in preview/
//   node build.mjs --audit   + the kit audit with the plug in every one of the 48 sockets and in flight between them
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces } from "../kit/tube.mjs";
import * as R from "./rig.mjs";
import { build, plugSvg, cablePieces } from "./geometry.mjs";
import * as V from "./view.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "inside-the-multilingual-transformer";
const auditing = process.argv.includes("--audit");
const P = R.P;

// ------------------------------------------------------------ shapes
const shapeOf = (d, meta) => {
  const [kind, ...a] = d;
  const extra = typeof a[a.length - 1] === "object" && !Array.isArray(a[a.length - 1]) && kind === "ball" ? a.pop() : {};
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], { ...meta, ...extra }, a[3] ?? 8);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], meta);
  if (kind === "ext") return A.extruded(a[0], a[1], a[2], meta);
  if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], meta);
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], meta);
  if (kind === "solid") return A.solid(a[0], a[1], meta);
  if (kind === "ball") return A.ball(a[0], a[1], { ...meta, ...extra });
  throw new Error(kind);
};

// ------------------------------------------------------------ the static scene, recorded
function scene(pose) {
  const Rc = A.recorder(P);
  const { items, routes } = build();
  for (const item of items) {
    const shapes = item.shapes.map((d, j) => Rc.solid(shapeOf(d, { name: j ? `${item.name}#${j}` : item.name, ...(item.name.startsWith("stand.") ? { ground: true } : {}) })));
    Rc.put({ name: item.name, at: item.at, bias: item.bias, svg: item.svg, shapes });
  }
  for (const route of routes) {
    Rc.route(route.name, route.points, route.r, { limp: true });
    cablePieces(route).forEach((piece, index) => Rc.put({ name: `${route.name}:${index}`, at: piece.mid, svg: "", route: route.name, chunk: index, shapes: [A.tube(piece.points, piece.radii, { name: `${route.name}:${index}`, limp: true })] }));
  }
  const lever = V.lever(pose.lever);
  Rc.put({ name: "toggle.lever", at: [R.TOGGLE.x, R.TOGGLE.y, R.TOGGLE.z + 4], svg: lever.parts.map((p) => k.solidSvg(p.paths, p)).join(""), shapes: lever.shapes.map((d, j) => Rc.solid(shapeOf(d, { name: j ? `toggle.lever#${j}` : "toggle.lever" }))) });
  return Rc;
}

// the plug and cord, always drawn last
function addLive(Rc, foot) {
  const F = G.frameAlong(foot, [0, 0, 1]);
  const plug = plugSvg(F, true);
  const top = 1e6;
  Rc.put({ name: "plug", key: top, svg: plug.svg, shapes: plug.shapes.map((d, j) => Rc.solid(shapeOf(d, { name: j ? `plug#${j}` : "plug" }))) });
  // a stiff test lead: it holds the plug when the plug is lifted out of a socket
  const points = R.cordRoute(foot);
  Rc.route("cord", points, R.CORD_R);
  tubePieces(points, R.CORD_R, P, { maxLength: 14 }).forEach((piece, index) => Rc.put({ name: `cord:${index}`, key: top + 1 + index * 1e-3, svg: "", route: "cord", chunk: index, shapes: [A.tube(piece.points, piece.radii, { name: `cord:${index}` })] }));
}

// ------------------------------------------------------------ painter's order
const restLever = R.TOGGLE_ANGLES[0];
{
  const Rc = scene({ lever: restLever });
  A.settle(Rc, P);
  const ordered = Rc.items.slice().sort((a, b) => a.key - b.key).map((item) => item.name);
  writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from the settled keys. Back to front.\nexport const ORDER = ${JSON.stringify(ordered)};\n`);
  console.log(`settled ${ordered.length} items · ${Rc.settled.solved.dropped.length} dropped rules`);
}

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const { html: expanded } = render({ expand: true });
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=MtLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveOnly = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" });
for (const theme of ["dark", "light"]) for (const full of [false, true]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${full ? expanded : html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) MtLive.mount(el);\n`;
  const name = `${SLUG}${full ? "-full" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Transformer patch bay", theme, body, script, width: 650 }));
}
const bytes = Buffer.byteLength(html);
console.log(`wrote preview/${SLUG}.html, preview/${SLUG}-light.html · static ${(bytes / 1024).toFixed(1)} KB · ${(html.match(/<path/g) || []).length} paths · ${(html.match(/class="iso-solid/g) || []).length} solids · live ${(Buffer.byteLength(liveOnly) / 1024).toFixed(1)} KB (without kit)`);

// ------------------------------------------------------------ audit: the plug in every socket and in flight
if (auditing) {
  const { ORDER } = await import(pathToFileURL(join(HERE, "order.mjs")).href + `?v=${Date.now()}`);
  const poses = [];
  for (let b = 0; b < 12; b++) for (let s = 0; s < 4; s++) poses.push({ label: `b${b} s${s}`, foot: R.socketAt(b, s), lever: R.TOGGLE_ANGLES[(b + s) % 3] });
  // in flight: lifted over the far corners and across the cage
  const flights = [[[0, 0], [11, 3]], [[11, 0], [0, 3]], [[0, 3], [11, 0]], [[5, 1], [6, 2]], [[2, 0], [2, 3]]];
  for (const [[b0, s0], [b1, s1]] of flights) for (const t of [0.12, 0.25, 0.5, 0.75, 0.88]) poses.push({ label: `b${b0}s${s0}→b${b1}s${s1} t${t}`, foot: R.plugFoot(R.socketAt(b0, s0), R.socketAt(b1, s1), t), lever: 0, flying: true });
  let failed = 0;
  const failing = [];
  for (const pose of poses) {
    const Rc = scene(pose);
    const index = new Map(ORDER.map((name, i) => [name, i]));
    for (const item of Rc.items) item.key = index.has(item.name) ? index.get(item.name) : -1;
    addLive(Rc, pose.foot);
    const overlaps = A.overlapsOf(Rc.items, P, { states: [0], skip: A.sameRun });
    Rc.settled = { items: Rc.items, overlaps, solved: { keys: Rc.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    // at rest nothing is excused. In flight the lifted plug's boot (the cord's start) passes over the card strips it
    // crosses, 40 or more apart in depth and drawn on top; that one pair is the only thing excused, and only in the air
    const result = A.audit(Rc, P, { frames: [], apart: false, crowd: pose.flying ? [["cord", (name) => /^card\d+\.strip/.test(name)]] : [] });
    const count = A.failures(result);
    failed += count;
    if (count) {
      failing.push(pose.label);
      console.log(`\n== ${pose.label}: ${count} problems`);
      console.log(A.report(result));
    }
  }
  console.log(`\naudited ${poses.length} poses (48 sockets, ${poses.length - 48} in flight)`);
  console.log(failed ? `audit failed: ${failed} problems at ${failing.join(", ")}` : "audit passed");
  if (failed) process.exitCode = 1;
}
