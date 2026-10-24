// Fig 9 build: settles the painter's order from the true shapes, writes order.mjs and the standalone previews.
//   node build.mjs           previews in preview/
//   node build.mjs --audit   + the kit audit over the slide's whole travel and the register stroke, and over a turn of the crank
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./geometry.mjs";
import { P, linkage, THETA_A } from "./view.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "surgical-post-training-diffing";
const auditing = process.argv.includes("--audit");
const ORDER_OF = ["slide", "reg"];
const SPRING = { stagger: 0.12, stiffness: 40, damping: 12.6 };

function record(rest, sweep = true) {
  const { items, routes } = build({ phi0: rest, sweep });
  const R = A.recorder(P, { order: ORDER_OF, spring: SPRING });
  for (const route of routes) R.route(route.name, route.points, route.r, { limp: true, touch: ["stand.bench"] });
  for (const item of items) {
    const ride = item.piece === "regx" || item.piece === "regy" ? "reg" : item.piece || "";
    const shapes = item.shapes.map((shape) => R.solid(item.name.startsWith("stand.") ? { ...shape, ground: true } : shape));
    if (item.tube) shapes.push(A.tube(item.tube.points, item.tube.radii, { name: item.name, limp: true }));
    R.put({ name: item.name, at: item.at, key: item.key, piece: item.piece || "", ride, move: item.move || [0, 0, 0], svg: item.svg, shapes, route: item.route, chunk: item.chunk });
  }
  return { R, items };
}

const rest = linkage(THETA_A);
const { R, items: drawn } = record(rest);
// the page paints in one fixed DOM order and moves parts by transform only, so the order must hold in every state as it
// is: settle with keys that do not lift as a part travels (view vector zeroed for the keys, not for the ray casts)
{
  const states = A.explodeStates(ORDER_OF, SPRING).depth;
  const overlaps = { ...A.overlapsOf(R.items, P, { states, skip: A.sameRun }), V: [0, 0, 0] };
  const solved = A.orderKeys(R.items, overlaps);
  R.items.forEach((item, index) => (item.key = solved.keys[index]));
  R.settled = { items: R.items, overlaps, solved, states };
  if (solved.dropped.length) console.log(`order: ${solved.dropped.length} rules dropped`, solved.dropped.map((r) => `${R.items[r.front].name}>${R.items[r.back].name}`).join(" "));
}
// back to front, keeping the settled order's rules but emitting the items of one moving part together where the rules
// allow, so the page wraps each run in one transformed group
const ORDER = (() => {
  const { overlaps, solved } = R.settled;
  const n = R.items.length;
  const dropped = new Set(solved.dropped.map((rule) => `${rule.front}|${rule.back}`));
  const after = Array.from({ length: n }, () => new Set());
  const needs = new Array(n).fill(0);
  for (const pair of overlaps.pairs) {
    const [fa, fb] = pair.front.map((f) => f.area >= overlaps.least);
    if (fa === fb) continue;
    const [front, back] = fa ? [pair.a, pair.b] : [pair.b, pair.a];
    if (dropped.has(`${front}|${back}`) || after[back].has(front)) continue;
    after[back].add(front);
    needs[front]++;
  }
  const part = new Map(drawn.map((item) => [item.name, item.part || ""]));
  const out = [];
  const ready = new Set(R.items.map((_, i) => i).filter((i) => !needs[i]));
  while (ready.size) {
    const last = out.length ? part.get(R.items[out[out.length - 1]].name) : "";
    const same = (i) => (last && part.get(R.items[i].name) === last ? 1 : 0);
    const pick = [...ready].sort((x, y) => same(y) - same(x) || R.items[x].key - R.items[y].key)[0];
    ready.delete(pick);
    out.push(pick);
    for (const next of after[pick]) if (!--needs[next]) ready.add(next);
  }
  if (out.length !== n) throw new Error("order: the settled rules have a cycle");
  return out.map((i) => R.items[i].name);
})();
// each plate's emulsion is a coat on its glass top: it goes straight after the glass (too thin for the settle to part them)
for (const s of ["A", "B"]) {
  const coat = ORDER.splice(ORDER.indexOf(`stage${s}.emulsion`), 1)[0];
  ORDER.splice(ORDER.indexOf(`stage${s}.glass`) + 1, 0, coat);
}
R.items.forEach((item) => (item.key = ORDER.indexOf(item.name)));
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from the settled keys. Back to front.\nexport const ORDER = [\n${ORDER.map((n) => `  ${JSON.stringify(n)},`).join("\n")}\n];\n`);

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=SPDLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveSize = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) SPDLive.mount(el);\n`;
  writeFileSync(join(HERE, "preview", `${SLUG}${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Blink comparator", theme, body, script, width: 650 }));
}
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/${SLUG}.html and -light.html · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${(html.match(/<path/g) || []).length} paths · ${solids} solid groups · ${R.items.length} items · live ${(liveSize / 1024).toFixed(1)} KB (live.js + view.mjs + data.mjs, without kit)`);

// ------------------------------------------------------------ audit
if (auditing) {
  // 1. rest crank pose, slide over its whole travel (share 0 = window 0, share 1 = window 3) and the register stroke, replayed
  console.log("\n== rest crank pose · slide travel and register stroke");
  A.auditOrExit(R, P, { frames: A.explodeStates(ORDER_OF, SPRING).frames, apart: true });
  // 2. the same fixed order over one turn of the crank: the rocker, link, pins and handle are re-posed
  const failedBefore = process.exitCode || 0;
  let bad = 0;
  for (let i = 0; i < 16; i++) {
    const pose = linkage((i / 16) * 2 * Math.PI);
    const { R: Rt } = record(pose, false);
    const key = new Map(ORDER.map((n, idx) => [n, idx]));
    Rt.items.forEach((item) => (item.key = key.get(item.name)));
    const near = Rt.items.filter((item) => item.name.startsWith("head.") || item.name.startsWith("pillar.") || item.name.startsWith("cable."));
    const overlaps = A.overlapsOf(near, P, { states: [0], skip: A.sameRun });
    const solved = { keys: near.map((item) => item.key), rules: 0, dropped: [] };
    const depth = A.depthOrder(near, P, { overlaps, solved, rest: [0] });
    const clear = A.solidClearances(Rt.solids.filter((s) => (s.name || "").startsWith("head.")), { state: 0 });
    const problems = depth.problems.length + clear.length;
    if (problems) {
      bad += problems;
      console.log(`crank ${(i * 22.5).toFixed(1)}°: ${depth.problems.length} depth, ${clear.length} solid`);
      for (const p of depth.problems.slice(0, 6)) console.log("  ", p.front ?? "", p.back ?? "", JSON.stringify(p).slice(0, 200));
      for (const c of clear.slice(0, 6)) console.log("  ", JSON.stringify(c).slice(0, 200));
    }
  }
  console.log(bad ? `crank turn: ${bad} problems` : "crank turn: 16 poses, depth order and solid clearance clean");
  if (bad) process.exitCode = 1;
  else if (!failedBefore) process.exitCode = 0;
}
