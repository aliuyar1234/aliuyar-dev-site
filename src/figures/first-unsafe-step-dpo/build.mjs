// Fig 14 build: settles the painter's order (order.mjs), writes the standalone previews and (with --audit) proves the geometry.
//   node build.mjs                     previews in preview/
//   node build.mjs --order             re-settle the painter's order over sampled poses first
//   node build.mjs --audit             + kit audit and depth check over the timeline (every 0.5 s of one loop)
//   node build.mjs --audit --step=0.25 a finer sample
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./parts.mjs";
import { poseAt, EVENTS, TOTAL, STILL, CHIP_H, RACK, pinX } from "./model.mjs";
import { P, Y0, Y1, ZF, ROLL, CRANK, REWIND_X, SPINDLE_Z, packOf, crankOf, flagOf, armOf, stackOf, stemOf, chipPlan, PIN, spanOf } from "./scene.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "first-unsafe-step-dpo";
const auditing = process.argv.includes("--audit");
const settling = process.argv.includes("--order");
const STEP = Number((process.argv.find((a) => a.startsWith("--step=")) || "--step=0.5").slice(7));

// ------------------------------------------------------------ recorded shapes
const spanLine = (item, pose) => spanOf(item.name.startsWith("take") ? 1 : 0, pose.s)[item.name.endsWith("Far") ? "far" : "near"].line;
const ALONG_Y = { o: [0, 0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
const ALONG_Y_AT = (side) => ({ ...ALONG_Y, o: [REWIND_X[side], 0, SPINDLE_Z] });
function shapesOf(item, pose) {
  const out = [];
  const meta = (j, extra = {}) => ({ name: j ? `${item.name}#${j}` : item.name, ...(item.name.startsWith("stand.") ? { ground: true } : {}), ...(item.owner ? { owner: item.owner } : {}), ...extra });
  item.shapes.forEach((d, j) => {
    const [kind, ...a] = d;
    const m = meta(j);
    if (kind === "slab") out.push(A.slab({ r: 0, ...a[0] }, a[1], a[2], m, 3));
    else if (kind === "cyl") out.push(A.cylinder(a[0], a[1], a[2], a[3], a[4], m));
    else if (kind === "disc") out.push(A.disc(a[0], a[1], a[2], a[3], m));
    else if (kind === "ball") out.push(A.ball(a[0], a[1], m));
    else if (kind === "prism") out.push(A.prism(a[0], a[1], a[2], a[3], m));
    else if (kind === "box") out.push(A.box(a[0], a[1], m));
    else if (kind === "lathe") out.push(A.body(a[0], a[1], m));
    else if (kind === "film") {
      // the free film as thin quads along its line, lying on the outside of the roller it wraps
      const line = spanLine(item, pose);
      for (let i = 0; i + 1 < line.length; i++) {
        const [x0, z0] = line[i];
        const [x1, z1] = line[i + 1];
        const l = Math.hypot(x1 - x0, z1 - z0) || 1;
        let n = [-(z1 - z0) / l, (x1 - x0) / l];
        const mid = [(x0 + x1) / 2, (z0 + z1) / 2];
        const side = a[3];
        const toRoll = [mid[0] - ROLL.x[side], mid[1] - ROLL.z];
        if (n[0] * toRoll[0] + n[1] * toRoll[1] < 0) n = [-n[0], -n[1]];
        const t = 0.12;
        const poly = [[x0, z0], [x1, z1], [x1 + n[0] * t, z1 + n[1] * t], [x0 + n[0] * t, z0 + n[1] * t]];
        out.push(A.prism(ALONG_Y, poly, a[1], a[2], meta(j + i, { owner: "film" })));
      }
    } else if (kind === "filmbox") out.push(A.box([ROLL.x[0], Y0, ZF - 0.1], [ROLL.x[1], Y1, ZF], meta(j, { owner: "film" })));
    else if (kind === "crank") {
      const c = crankOf(a[0], pose.s);
      out.push(A.prism(c.F, c.poly, 0, CRANK.t, m));
    } else if (kind === "pack") {
      out.push(A.disc(ALONG_Y_AT(a[0]), Y0, Y1, packOf(a[0], pose.s), m));
    } else if (kind === "flag") {
      const f = flagOf(pose.flag);
      out.push(A.prism(f.F, f.armPoly, 0, 1, meta(j, { owner: "flag" })), A.prism(f.F, f.platePoly, 0.15, 0.85, meta(j + 1, { owner: "flag" })));
    } else if (kind === "arm") {
      const r = armOf(pose.arm);
      out.push(A.prism(r.F, r.poly, 0, r.W, meta(j, { owner: "arm" })), A.ball(r.c3, 2.1, meta(j + 1, { owner: "arm" })));
    } else if (kind === "stack") {
      const st = stackOf(a[0], pose.pairs[a[0]]);
      if (st.h > 0.05) out.push(A.slab(st.plan, RACK.top, st.h, m, 2));
    } else if (kind === "stem") {
      const rod = stemOf(a[0], pose.pairs[a[0]], pose.chip).below;
      if (rod) out.push(A.cylinder(pinX(a[0]), RACK.y, PIN.r, rod.z0, rod.z1 - rod.z0, meta(j)));
    } else if (kind === "chip") {
      const c = pose.chip;
      if (!c || c.a < 0.02) return;
      const [x, y, z] = c.at;
      // in the air the card is a free body; on its pin it rides the rod (which passes through its hole)
      out.push(A.slab(chipPlan(x, y), z, CHIP_H, meta(j, { owner: "chip", ground: !c.down || z > RACK.top + pose.pairs[c.pin] * 0.6 + 0.01 }), 1));
      const above = stemOf(c.pin, pose.pairs[c.pin], c).above;
      if (above) out.push(A.cylinder(x, RACK.y, PIN.r, above.z0, above.z1 - above.z0, meta(j + 1, { owner: "chip" })));
    } else throw new Error(`${item.name}: ${kind}`);
  });
  return out;
}

// pieces of one film strip meet edge to edge; which of two touching pieces is painted first never shows
const FILM = new Set(["feed.spanFar", "feed.span", "film", "take.span", "take.spanFar"]);
const sameStrip = (a, b) => FILM.has(a.name) && FILM.has(b.name);

// ------------------------------------------------------------ painter's order: settled over sampled poses
const SAMPLE_EVENTS = [0, 1, 6, 12, 20, 27, 32, 35];
function samplePoses() {
  const times = [STILL, 0, TOTAL - 0.01];
  for (const i of SAMPLE_EVENTS) {
    const e = EVENTS[i];
    times.push(e.t0, (e.t0 + e.tFlag) / 2, e.tFlag + 0.36, e.tAdv + 0.7, e.tCut + 0.2, e.tCut + 0.45, e.tCut + 0.9, e.tLift + 0.1);
  }
  for (let T = EVENTS.at(-1).tLand + 1; T < TOTAL; T += 1.7) times.push(T);
  return times.map((T) => poseAt(T));
}
function settleOrder() {
  const poses = samplePoses();
  const pairs = [];
  let items = null;
  let least = 0.25;
  let V = null;
  for (const pose of poses) {
    const R = A.recorder(P);
    for (const item of build(pose)) {
      if (item.chip) continue;
      R.put({ name: item.name, at: item.at, bias: item.bias || 0, svg: item.svg, shapes: shapesOf(item, pose) });
    }
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: sameStrip });
    pairs.push(...overlaps.pairs);
    items = items || R.items;
    least = overlaps.least;
    V = overlaps.V;
  }
  const solved = A.orderKeys(items, { pairs, least, V });
  const order = items.map((item, index) => [item.name, solved.keys[index], index]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([name]) => name);
  console.log(`order: ${poses.length} poses · ${pairs.length} overlaps · ${solved.rules} rules · ${solved.cycles.length} cycles · ${solved.dropped.length} dropped${solved.dropped.length ? ` (${solved.dropped.map((r) => `${items[r.front].name}>${items[r.back].name}`).join(", ")})` : ""}`);
  const cyc = [...new Set(solved.cycles.map((c) => `${items[c.a].name} <> ${items[c.b].name}`))];
  for (const c of cyc.slice(0, 20)) console.log(`  cycle ${c}`);
  writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs --order. Back to front.\nexport const ORDER = [\n${order.map((n) => `  "${n}",`).join("\n")}\n];\n`);
}
if (settling) settleOrder();

// ------------------------------------------------------------ previews
const { render, orderedItems } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=FusLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const live = (flags) => Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning", ...flags], { encoding: "utf8" }));
const liveRaw = live([]);
const liveMin = live(["--minify"]);
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) FusLive.mount(el);\n`;
  writeFileSync(join(HERE, "preview", theme === "light" ? `${SLUG}-light.html` : `${SLUG}.html`), k.pageHtml({ title: "Film editing bench", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/${SLUG}.html, preview/${SLUG}-light.html · static ${(art / 1024).toFixed(1)} KB · ${paths} paths · ${solids} solid groups · ${build(poseAt(STILL)).length} items · live ${(liveMin / 1024).toFixed(1)} KB minified (${(liveRaw / 1024).toFixed(1)} KB unminified), kit excluded`);

// ------------------------------------------------------------ audit over the timeline
if (auditing) {
  const only = process.argv.find((x) => x.startsWith("--at="));
  const times = [];
  if (only) times.push(...only.slice(5).split(",").map(Number));
  else {
    for (let t = 0; t < TOTAL; t += STEP) times.push(Math.round(t * 1000) / 1000);
    // the moments a sample could straddle: every blade at full stroke, every card at the top of its flight and seated
    for (const e of EVENTS) times.push(e.tCut + 0.55, e.tLift + 0.35, e.tLift + 1.15, e.tLand - 0.08, e.tLand);
    times.push(STILL);
  }
  times.sort((a, b) => a - b);
  let failed = 0;
  const failing = [];
  for (const T of times) {
    const pose = poseAt(T);
    const R = A.recorder(P);
    orderedItems(pose).forEach((item, index) => {
      const shapes = shapesOf(item, pose);
      if (!shapes.length) return; // draws nothing in this pose: an empty stack, an unused strip piece, the card between flights
      shapes.forEach((s) => R.solid(s));
      R.put({ name: item.name, key: index, svg: item.svg, shapes });
    });
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: sameStrip });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false });
    const count = A.failures(result);
    failed += count;
    if (count) {
      failing.push(T);
      console.log(`\n== T = ${T.toFixed(2)} s (${pose.phase}, run ${pose.event + 1}) failed: ${count}`);
      console.log(A.report(result));
    }
  }
  console.log(`\naudited ${times.length} timeline frames (every ${STEP} s of the loop, plus each blade stroke, card flight and landing)`);
  console.log(failed ? `audit failed: ${failed} problems at T = ${failing.map((t) => t.toFixed(2)).join(", ")}` : "audit passed");
  if (failed) process.exitCode = 1;
}
