// Fig 13 build: settles the painter's order (order.mjs), writes the standalone previews and, with --audit, proves the geometry.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + the kit audit at rest and in every pose a lever, bar or dog can take
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build, P, LX, vec } from "./scene.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";
import { strokeLocked, strokeLockedW, tappetOf, shiftOf, crossOf, LIFT, SPARE } from "./model.mjs";
import { checkFit } from "./fit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "outcome-is-not-verification";
const auditing = process.argv.includes("--audit");

// the stored score model must reproduce the paper's measured rates
const fitProblems = checkFit();
if (fitProblems.length) {
  console.error(`fit check failed:\n  ${fitProblems.join("\n  ")}`);
  process.exit(1);
}

// ------------------------------------------------------------ poses
const still = () => LX.map(() => ({ stroke: 0, lift: 0, squeeze: 0 }));
const rest = () => {
  const levers = still();
  levers[0] = { stroke: 1, lift: 0, squeeze: 0 };
  return levers;
};
// where every moving part sits for a set of lever poses
function offsets(levers) {
  const [t0, t1] = [0, 1].map((w) => tappetOf(levers[w].stroke));
  const map = { barB: [-shiftOf(t0), 0, 0], barC: [-shiftOf(t1), 0, 0], cross: [crossOf(t0, t1), 0, 0] };
  LX.forEach((_, i) => (map[`tappet${i}`] = [0, tappetOf(levers[i].stroke), 0]));
  return map;
}

function record(levers, { collar = false } = {}) {
  const items = build({ levers, collar, lit: 3 });
  const R = A.recorder(P);
  const move = offsets(levers);
  items.forEach((item, index) => {
    const offset = (item.part && move[item.part]) || [0, 0, 0];
    const shapes = item.shapes.map((shape) => {
      let s = A.moved(shape, offset);
      // a tappet is drawn only where it has left the girder (y >= 4 in the world): record that part of it
      if (item.part && item.part.startsWith("tappet") && offset[1]) s = { ...s, poly: s.poly.map(([x, y]) => [x, Math.max(y, 4 - s.F.o[1])]), _b: undefined };
      if (item.name.startsWith("stand.") || item.name === "frame.back" || item.name === "frame.front" || item.name.startsWith("frame.std")) s.ground = true;
      return R.solid(s);
    });
    // draw the moving parts where the page puts them, so the drawing and the recorded shapes agree
    const svg = item.svg
      .replace(/data-part="(barB|barC|cross)"/g, (all, part) => `${all} transform="${vec(...move[part])}"`)
      .replace(/data-tappet="(\d)"/g, (all, i) => `${all} transform="${vec(...move[`tappet${i}`])}"`);
    R.put({ name: item.name, key: index, svg, shapes });
  });
  return { R, items };
}

// ------------------------------------------------------------ settle the order at rest and in the poses that change overlaps
const { R: R0, items } = record(rest());
A.settle(R0, P, { states: [0] });
const keyed = R0.items.map((item) => ({ name: item.name, key: item.key })).sort((a, b) => a.key - b.key);
const ORDER = keyed.map((item) => item.name);
const orderText = `// Painter's order, written by build.mjs. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER, null, 0).replace(/","/g, '",\n  "').replace("[", "[\n  ").replace(/]$/, ",\n]")};\n`;
const previous = (() => {
  try {
    return readFileSync(join(HERE, "order.mjs"), "utf8");
  } catch {
    return "";
  }
})();
if (previous !== orderText) writeFileSync(join(HERE, "order.mjs"), orderText);
const moved = R0.items.filter((item, index) => item.key !== index).length;

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const flatHtml = render({ flat: true }).html;
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=LeverFrameLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const ownOf = (...flags) => Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning", ...flags], { encoding: "utf8" }));
const [liveOwn, liveMin] = [ownOf(), ownOf("--minify")];
for (const [markup, suffix] of [[html, ""], [flatHtml, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${markup}</div>`;
    const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) LeverFrameLive.mount(el);\n`;
    const name = `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`;
    writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Lever frame", theme, body, script, width: 650 }));
  }
const bytes = Buffer.byteLength(html);
const count = (re) => (html.match(re) || []).length;
console.log(`wrote preview/${SLUG}.html and -light.html · static ${bytes} B · ${count(/<path/g)} paths · ${count(/class="iso-solid/g)} solids · ${items.length} items (${moved} re-keyed by settle) · live without kit ${(liveOwn / 1024).toFixed(1)} KB raw, ${(liveMin / 1024).toFixed(1)} KB minified · fit check passed`);

// ------------------------------------------------------------ audit
if (auditing) {
  const keyOf = new Map(R0.items.map((item) => [item.name, item.key]));
  const poses = [];
  const add = (label, edit, opts = {}) => {
    const levers = rest();
    edit(levers);
    poses.push({ label, levers, ...opts });
  };
  add("rest: x1 reversed", () => {});
  add("source world", (l) => (l[0].stroke = 0));
  add("d1 reversed", (l) => ((l[0].stroke = 0), (l[1].stroke = 1)));
  add("x1 mid-throw", (l) => (l[0] = { stroke: 0.5, lift: LIFT, squeeze: 1 }));
  add("d1 mid-throw", (l) => ((l[0].stroke = 0), (l[1] = { stroke: 0.5, lift: LIFT, squeeze: 1 })));
  // through the part of a throw where a V-notch drives its dogs
  for (const travel of [0.45, 0.75, 1.05, 1.35, 1.65, 1.95, 2.25]) {
    add(`x1 throw at travel ${travel}`, (l) => (l[0] = { stroke: travel / 9, lift: LIFT, squeeze: 1 }));
    add(`d1 throw at travel ${travel}`, (l) => ((l[0].stroke = 0), (l[1] = { stroke: travel / 9, lift: LIFT, squeeze: 1 })));
  }
  add("x1 pressed on the cross-lock", (l) => ((l[0] = { stroke: strokeLockedW, lift: LIFT, squeeze: 1 }), (l[1].stroke = 1)));
  add("d1 pressed on the cross-lock", (l) => (l[1] = { stroke: strokeLockedW, lift: LIFT, squeeze: 1 }));
  for (const i of [5, 6, 7]) add(`d1 reversed, lever ${i + 1} held by its dog`, (l) => ((l[0].stroke = 0), (l[1].stroke = 1), (l[i] = { stroke: strokeLocked, lift: LIFT, squeeze: 1 })));
  add("collar on lever 8", (l) => (l[0].stroke = 0), { collar: true });
  for (let i = 2; i < LX.length; i++) {
    add(`lever ${i + 1} pulled, catch up`, (l) => ((l[0].stroke = 0), (l[i] = { stroke: 1, lift: LIFT, squeeze: 1 })));
    add(`lever ${i + 1} pulled, catch down`, (l) => ((l[0].stroke = 0), (l[i] = { stroke: 1, lift: 0, squeeze: 0 })));
    add(`lever ${i + 1} mid-stroke`, (l) => ((l[0].stroke = 0), (l[i] = { stroke: 0.5, lift: LIFT, squeeze: 1 })));
    add(`lever ${i + 1} held by its dog`, (l) => (l[i] = { stroke: strokeLocked, lift: LIFT, squeeze: 1 }));
  }
  let failed = 0;
  for (const pose of poses) {
    const { R } = record(pose.levers, { collar: pose.collar });
    for (const item of R.items) item.key = keyOf.get(item.name);
    const overlaps = A.overlapsOf(R.items, P, { states: [0] });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false, cover: ["stand.halo", "shelf.*"] });
    const n = A.failures(result);
    failed += n;
    if (n) console.log(`\n== ${pose.label}: ${n} problems\n${A.report(result)}`);
  }
  console.log(`\naudited ${poses.length} poses (rest, both worlds and seven points of each throw, each world lever on the cross-lock, each slot lever pulled, mid-stroke and held by its dog, the collar)`);
  console.log(failed ? `audit failed: ${failed} problems` : "audit passed");
  if (failed) process.exitCode = 1;
}
