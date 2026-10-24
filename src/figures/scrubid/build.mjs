// Fig 17 build: settles the painter's order over every pose, writes order.mjs and the standalone previews,
// and with --audit proves the geometry in every pose the levers and the float can take.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + the kit audit in each pose
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { P, THROW, AGG_THROW } from "./world.mjs";
import { build, anglesOf } from "./geometry.mjs";
import { REST, FACTORS, RUNS, auditOf } from "./model.mjs";
import STORED from "./runs.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");

// ------------------------------------------------------------ the model reproduces every recorded run
for (const r of FACTORS)
  RUNS[r].forEach((_, i) => {
    const a = auditOf(r, i);
    const run = STORED.runs[r][i];
    const same = Math.abs(a.RR - run.RR) < 1e-9 && Math.abs(a.SSS - run.SSS) < 1e-9 && Math.abs(a.CC - run.CC) < 1e-9 && a.cert === run.cert;
    if (!same) throw new Error(`model disagrees with ${run.run}: RR ${a.RR} SSS ${a.SSS} CC ${a.CC} cert ${a.cert}`);
  });

// ------------------------------------------------------------ poses: every lever angle the page shows, float at both stops
// bank levers 0..7 and the aggregator's, each at one of its detents or part way between two (a lever swinging between
// live and ref passes the shut detent and level)
const mid = (a, b) => (a + b) / 2;
const bank = (a) => (b) => [...Array(8).fill(a), b];
const each = (states, agg) => [...states.map((s) => (s === "L" ? THROW.live : s === "F" ? THROW.ref : THROW.shut)), agg];
const POSES = [
  { name: "rest", angles: anglesOf(REST.valves), m: 1, r: 2 },
  { name: "all live", angles: bank(THROW.live)(AGG_THROW.live), m: 1.2, r: 8 },
  { name: "all ref", angles: bank(THROW.ref)(AGG_THROW.ref), m: 0, r: 8 },
  { name: "all shut", angles: bank(THROW.shut)(AGG_THROW.shut), m: 0, r: 1 },
  { name: "mixed", angles: each([..."LFHLFHLF"], AGG_THROW.ref), m: 0.9, r: 4 },
  { name: "mixed 2", angles: each([..."FLFLHHHH"], AGG_THROW.live), m: 1, r: 4 },
  { name: "mixed 3", angles: each([..."LLFHHHHH"], AGG_THROW.shut), m: 0.3, r: 3 },
  { name: "live-shut", angles: bank(mid(THROW.live, THROW.shut))(mid(AGG_THROW.live, AGG_THROW.shut)), m: 0.5, r: 4 },
  { name: "shut-ref", angles: bank(mid(THROW.shut, THROW.ref))(mid(AGG_THROW.shut, AGG_THROW.ref)), m: 1.1, r: 8 },
  { name: "level", angles: bank(0)(0), m: 0.7, r: 8 },
];
const glassFloat = (a, b) => (a.name === "float" && b.name.startsWith("meter.glass")) || (b.name === "float" && a.name.startsWith("meter.glass"));
const skip = (a, b) => A.sameRun(a, b) || glassFloat(a, b);

const builds = POSES.map((pose) => build(pose));
const names = builds[0].R.items.map((item) => item.name);
for (const b of builds) if (b.R.items.map((item) => item.name).join() !== names.join()) throw new Error("item lists differ between poses");
const merged = { pairs: [], least: 0, V: null, states: [0] };
for (const b of builds) {
  const ov = A.overlapsOf(b.R.items, P, { states: [0], skip });
  merged.pairs.push(...ov.pairs);
  merged.least = ov.least;
  merged.V = ov.V;
  merged.step = ov.step;
}
const solved = A.orderKeys(builds[0].R.items, merged);
const keys = solved.keys.slice();
const at = (name) => names.indexOf(name);
// the float rides inside the glass on its guide wire: back wall, wire, float, front wall
const inside = ["meter.glassBack", "meter.rod", "float", "meter.glassFront"].map(at);
for (let j = 1; j < inside.length; j++) if (keys[inside[j]] <= keys[inside[j - 1]]) keys[inside[j]] = keys[inside[j - 1]] + 0.001;
const ORDER = names.map((name, i) => [name, keys[i]]).sort((a, b) => a[1] - b[1]).map(([name]) => name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from every pose the levers and float take. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER)};\n`);
if (process.argv.includes("--cycles")) { const c = new Map(); for (const p of solved.cycles ?? []) { const k = [names[p.a], names[p.b]].sort().join(" x "); c.set(k, (c.get(k) || 0) + 1); } console.log([...c].map(([k, n]) => `${k} (${n})`).join("\n")); }
console.log(`order: ${ORDER.length} items · ${merged.pairs.length} overlapping pairs over ${POSES.length} poses · ${solved.dropped.length} dropped · ${solved.cycles?.length ?? 0} cycles`);

// ------------------------------------------------------------ previews
const { render, TWINS } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
// every copy drawn as a <use> must be its source moved: the same elements, every point within 0.15 px of the source
// shifted by one screen offset (rounding may drop a collinear point on one side, so points are matched to segments)
{
  const items = new Map(builds[0].R.items.map((item) => [item.name, item.svg]));
  const elements = (svg) => [...svg.matchAll(/<(path|circle|text|g)\b([^>]*)>/g)].map(([, tag, attrs]) => ({ tag, attrs: attrs.replace(/ (d|cx|cy|transform)="[^"]*"/g, ""), d: / d="([^"]*)"/.exec(attrs)?.[1], c: / cx="([^"]*)" cy="([^"]*)"/.exec(attrs) }));
  const subpaths = (d) =>
    [...d.matchAll(/M[^M]*/g)].map(([sub]) => {
      const points = (sub.match(/-?\d*\.?\d+/g) || []).map(Number).reduce((out, n, i, all) => (i % 2 ? out : [...out, [n, all[i + 1]]]), []);
      return /Z\s*$/.test(sub) ? [...points, points[0]] : points; // a closed outline may start at another corner
    });
  const toSeg = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const apart = (from, to) => Math.max(0, ...from.map((p) => (to.length === 1 ? Math.hypot(p[0] - to[0][0], p[1] - to[0][1]) : Math.min(...to.slice(1).map((q, i) => toSeg(p, to[i], q))))));
  let worst = 0;
  // the in-valve copies (upper neck, nut and nipple drawn from the lower ones) are checked the same way
  const inner = builds[0].twins.map(({ copy, source, by }, j) => {
    items.set(`inner.copy${j}`, copy);
    items.set(`inner.source${j}`, source);
    return [`inner.copy${j}`, [`inner.source${j}`, by]];
  });
  for (const [copy, [source, by]] of [...Object.entries(TWINS), ...inner]) {
    if (!items.has(copy)) continue;
    const [x0, y0] = k.iso([0, 0, 0], P);
    const [x1, y1] = k.iso(by, P);
    const [sx, sy] = [x1 - x0, y1 - y0];
    const a = elements(items.get(source));
    const b = elements(items.get(copy));
    if (a.length !== b.length || a.some((e, i) => e.tag !== b[i].tag || e.attrs !== b[i].attrs)) throw new Error(`${copy} is not ${source} moved`);
    a.forEach((e, i) => {
      if (e.c) worst = Math.max(worst, Math.hypot(Number(b[i].c[1]) - Number(e.c[1]) - sx, Number(b[i].c[2]) - Number(e.c[2]) - sy));
      if (!e.d) return;
      const pa = subpaths(e.d).map((sub) => sub.map(([x, y]) => [x + sx, y + sy]));
      const pb = subpaths(b[i].d);
      if (pa.length !== pb.length) throw new Error(`${copy} is not ${source} moved (subpaths)`);
      pa.forEach((sub, j) => (worst = Math.max(worst, apart(sub, pb[j]), apart(pb[j], sub))));
    });
  }
  if (worst > 0.15) throw new Error(`a copy drifts ${worst.toFixed(2)} px from its source`);
  console.log(`copies: ${Object.keys(TWINS).length + inner.length} parts drawn as moved sources, worst drift ${worst.toFixed(2)} px`);
}
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=ScrubLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
// what ships: live.js with world, lever, model and data bundled and minified as Vite does, before gzip, without the shared kit
const ownBundle = (...flags) => Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", ...flags, "--log-level=warning"], { encoding: "utf8" }));
const liveOwn = ownBundle("--minify");
const liveRaw = ownBundle();
const liveSrc = Buffer.byteLength(readFileSync(join(HERE, "live.js")));
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-scrubid" data-fig="scrubid" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="scrubid"]')) ScrubLive.mount(el);\n`;
  writeFileSync(join(HERE, "preview", theme === "light" ? "scrubid-light.html" : "scrubid.html"), k.pageHtml({ title: "Hydraulic test manifold", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const BUDGET = { art: 140 * 1024, live: 18 * 1024 };
if (art > BUDGET.art) throw new Error(`static markup ${art} B is over the ${BUDGET.art} B budget`);
if (liveOwn > BUDGET.live) console.warn(`live bundle ${liveOwn} B is over the ${BUDGET.live} B line`);
console.log(`wrote preview/scrubid.html, preview/scrubid-light.html · static ${art} B (${(art / 1024).toFixed(1)} KB) · ${(html.match(/<path/g) || []).length} paths · ${(html.match(/class="iso-solid/g) || []).length} solids · ${names.length} items · live ${(liveOwn / 1024).toFixed(1)} KB minified, ${(liveRaw / 1024).toFixed(1)} KB unminified (live.js ${(liveSrc / 1024).toFixed(1)} KB + world, lever, model, data; without kit)`);

// ------------------------------------------------------------ audit in every pose with the shipped order
// set by hand and looked at: the rotameter tube is one glass ring drawn as two halves, its back wall before the wire and
// float and its front wall after them, and both halves record the whole ring; the guide wire threads through the float,
// which is drawn over it (the wire's 1.5 px² where it leaves the float's head is hidden under the head)
const GLASS = [
  ["meter.glass*", "float"],
  ["meter.glass*", "meter.rod"],
  ["meter.rod", "float"],
];
if (auditing) {
  let failed = 0;
  builds.forEach((b, p) => {
    const R = b.R;
    R.items.forEach((item, i) => (item.key = keys[i]));
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false, allow: GLASS });
    const count = A.failures(result);
    failed += count;
    console.log(`\n== pose ${POSES[p].name}: ${count ? `failed ${count}` : "clean"}`);
    if (count || p === 0) console.log(A.report(result));
  });
  console.log(failed ? `\naudit failed: ${failed} problems` : `\naudit passed (${POSES.length} poses)`);
  if (failed) process.exitCode = 1;
}
