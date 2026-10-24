// Fig 16 build: standalone previews in preview/ and, with --audit, the kit audit over every pose the arms pass through.
//   node build.mjs           previews
//   node build.mjs --audit   + audit
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");

const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
let bundle = "";
let liveSize = 0;
let liveRaw = 0;
try {
  bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=CacheMedicLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
  // what ships: live.js with world, model and data bundled and minified as Vite does, before gzip, without the shared kit
  liveSize = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--minify", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
  liveRaw = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" }));
} catch (e) {
  console.log("no live.js bundle:", String(e.message).split("\n")[0]);
}
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-cachemedic" data-fig="cachemedic" data-theme="${theme}">${html}</div>`;
  const script = bundle ? `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="cachemedic"]')) CacheMedicLive.mount(el);\n` : "";
  const name = theme === "light" ? "cachemedic-light.html" : "cachemedic.html";
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Transcription turntable", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/cachemedic.html, preview/cachemedic-light.html · static ${art} B (${(art / 1024).toFixed(1)} KB) · ${paths} paths · ${solids} solid groups · live ${(liveSize / 1024).toFixed(1)} KB minified, ${(liveRaw / 1024).toFixed(1)} KB unminified (live.js + world + model + data, without kit)`);

// ------------------------------------------------------------ audit: the fixed painter's order, in every pose the arms rest in or pass through
if (auditing) {
  const A = await import("../kit/audit.mjs");
  const { scene, POSES } = await import("./scene.mjs");
  const { slotParts } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
  const { P, STILL } = await import("./world.mjs");
  const ARITY = { slab: 3, cyl: 5, disc: 4, prism: 4, ring: 3, ball: 2 };
  // descriptors from scene.mjs and world.mjs → audit shapes; shapes of one drawn item share an owner
  const shapeOf = (d, item, i) => {
    let kind = d[0];
    if (kind === "prism" && Array.isArray(d[1])) kind = "ring";
    const args = d.slice(1, 1 + ARITY[kind]);
    const meta = { name: i ? `${item}#${i + 1}` : item, owner: item, ...(d[1 + ARITY[kind]] || {}) };
    if (item.startsWith("stand.")) meta.ground = true;
    if (kind === "slab") return A.slab(args[0], args[1], args[2], meta);
    if (kind === "cyl") return A.cylinder(...args, meta);
    if (kind === "disc") return A.disc(...args, meta);
    if (kind === "prism") return A.prism(...args, meta);
    if (kind === "ring") return A.extruded(...args, meta);
    return A.ball(args[0], args[1], meta);
  };
  let bad = 0;
  for (const [n, pose] of POSES.entries()) {
    const s = { ...STILL, a: pose.a, b: pose.b, type: n % 6, eps: n % 3 };
    const R = A.recorder(P);
    const list = scene().flatMap((it) => (it.slot ? slotParts(it.name, s) : [it])).filter((it) => it.shapes.length);
    list.forEach((it, key) => R.put({ name: it.name, key, svg: it.svg, shapes: it.shapes.map((d, i) => R.solid(shapeOf(d, it.name, i))) }));
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((it) => it.key), rules: 0, dropped: [], cycles: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false });
    const count = A.failures(result);
    console.log(`\n== ${pose.name} (cue ${pose.a}, cleaning arm ${pose.b}) · ${R.solids.length} solids · ${R.items.length} items · ${overlaps.pairs.length} overlaps`);
    console.log(A.report(result));
    bad += count;
  }
  console.log(bad ? `audit failed: ${bad} problem${bad === 1 ? "" : "s"}` : "audit passed");
  if (bad) process.exitCode = 1;
}
