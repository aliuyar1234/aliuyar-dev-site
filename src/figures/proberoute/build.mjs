// Fig 10 build: writes the standalone previews and, with --audit, proves the geometry.
//   node build.mjs            preview/proberoute.html and -light.html (+ -flat for the line check)
//   node build.mjs --audit    also the kit audit over the board's resting poses
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "proberoute";
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href);

const { html } = render();
const flat = render({ flat: true }).html;
const css = readFileSync(join(HERE, "figure.css"), "utf8");
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
let script = "";
try {
  const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=ProbeRouteLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
  script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) ProbeRouteLive.mount(el);`;
} catch (error) {
  console.log("live.js not bundled:", String(error.message).split("\n")[0]);
}
mkdirSync(join(HERE, "preview"), { recursive: true });
const still = process.argv.includes("--still");
for (const [markup, suffix] of [[html, ""], [flat, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${markup}</div>`;
    const name = `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`;
    writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Cord switchboard", theme, body, script: still ? "" : script }));
  }
const count = (markup, re) => (markup.match(re) || []).length;
let live = 0;
try {
  live = Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--minify", "--log-level=warning"], { encoding: "utf8" }));
} catch {}
console.log(`wrote preview/${SLUG}.html and -light.html (+ -flat) · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${count(html, /<path/g)} paths, ${count(html, /<use /g)} placements, ${count(flat, /class="iso-solid/g)} solids placed · live ${(live / 1024).toFixed(1)} KB`);

// ------------------------------------------------------------ audit over the board's resting poses and its flights
if (process.argv.includes("--audit")) {
  const A = await import("../kit/audit.mjs");
  const { record } = await import("./proof.mjs");
  const { stateOf, RANDOM } = await import("./model.mjs");
  const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
  const rest = [
    { label: "final", state: stateOf("final") },
    { label: "idle", state: stateOf("idle") },
    { label: "dense", state: stateOf("dense") },
    ...RANDOM.map((_, n) => ({ label: `random#${n + 1}`, state: stateOf("random", n) })),
  ].filter((f) => !only || f.label.startsWith(only));
  let failed = 0;
  const bad = [];
  for (const { label, state } of rest) {
    const R = record(state);
    const overlaps = A.overlapsOf(R.items, R.P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, R.P, { frames: [], apart: false });
    // every recorded part has its drawn markup, and every drawn part is recorded, so the stand-in check sees them all
    const names = new Set(R.items.map((it) => it.name));
    const unmatched = [...R.items.filter((it) => !it.svg).map((it) => `recorded, not drawn: ${it.name}`), ...[...R.drawn.keys()].filter((n) => !names.has(n)).map((n) => `drawn, not recorded: ${n}`)];
    for (const line of unmatched) console.log(`${label}: ${line}`);
    const count = A.failures(result) + unmatched.length;
    if (count) {
      failed += count;
      bad.push(label);
      console.log(`\n== ${label}: ${count} problems`);
      console.log(A.report(result));
    } else console.log(`${label}: ${R.tubes.length} tubes · ${R.solids.length} solids · ${R.items.length} items (${R.items.filter((it) => it.svg).length} with markup) · ${overlaps.pairs.length} overlaps · clean`);
  }
  console.log(failed ? `audit failed: ${failed} problems in ${bad.join(", ")}` : "audit passed");
  if (failed) process.exitCode = 1;
}

// ------------------------------------------------------------ flights: every cord move the page plays, every 0.1 s
// Each frame is checked where something moves: nothing passes through anything (cords, plugs, weights), and every
// overlap that involves a moving part is drawn in depth order (the page re-sorts the cords per frame as here).
if (process.argv.includes("--audit") && !process.argv.includes("--rest")) {
  const A = await import("../kit/audit.mjs");
  const G = await import("../kit/lathe.mjs");
  const Wd = await import("./world.mjs");
  const ART = await import("./art.mjs");
  const { record } = await import("./proof.mjs");
  const T = await import("./timeline.mjs");
  const only = (process.argv.find((a) => a.startsWith("--flights=")) || "").slice(10);
  const travel = ART.RAIL_Z - 0.5 - (Wd.WEIGHT_REST + ART.WEIGHT.h + ART.WEIGHT.neck + ART.WEIGHT.bar + ART.WEIGHT.cheek);
  const corners = (b) => [0, 1, 2, 3, 4, 5, 6, 7].map((n) => [n & 1 ? b.max[0] : b.min[0], n & 2 ? b.max[1] : b.min[1], n & 4 ? b.max[2] : b.min[2]]);
  const screenOf = (shapes) => {
    let box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const s of shapes) for (const c of corners(A.boundsOf(s))) {
      const [x, y] = k.iso(c, Wd.P);
      box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
    }
    return box;
  };
  const meets = (a, b, pad = 0) => a.min.every((v, i) => v <= b.max[i] + pad && b.min[i] <= a.max[i] + pad);
  const meets2 = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  let problems = 0;
  let count = 0;
  const seen = new Set();
  for (const [label, from, to] of T.transitions()) {
    if (only && !label.startsWith(only)) continue;
    for (const { label: at, state } of T.frames(from, to)) {
      count++;
      const R = record(state, { svg: false });
      const names = new Set(state.flying.flatMap((i) => [`plug${i}`, `cord${i}`]));
      const movers = R.items.filter((it) => names.has(it.name));
      const moverShapes = movers.flatMap((it) => it.shapes);
      const boxes = moverShapes.map((s) => A.boundsOf(s));
      const nearSolids = R.solids.filter((s) => boxes.some((b) => meets(A.boundsOf(s), b, 3)));
      const nearTubes = R.tubes.filter((t) => boxes.some((b) => meets(A.boundsOf(t), b, 3)));
      const out = [];
      // cords against everything near them
      const mounts = A.mountsOf(nearTubes, nearSolids);
      for (const c of A.clearances(nearTubes, nearSolids, { only: "through", mounts })) if (names.has(c.tube.split("#")[0]) || names.has(c.other.split("#")[0])) out.push(`through ${c.tube} × ${c.other} ${c.clearance.toFixed(2)} at [${c.at.map((v) => v.toFixed(1))}]`);
      // flying plugs against the solids near them: surface samples of the plug inside another solid
      for (const i of state.flying) {
        const plug = R.solids.find((s) => s.name === `plug${i}`);
        if (!plug) continue;
        const pts = [];
        const F = plug.F;
        const pf = plug.poly;
        const s0 = Math.min(...pf.map((p) => p[0]));
        const s1 = Math.max(...pf.map((p) => p[0]));
        const help = Math.abs(F.a[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
        const u = G.unit3(G.cross3(F.a, help));
        const v = G.cross3(F.a, u);
        for (let s = s0; s <= s1; s += 0.5) {
          const r = Math.max(...pf.filter((p, j) => j > 0 && Math.abs(p[0] - s) < 0.5).map((p) => p[1]), 0.5);
          for (let n = 0; n < 12; n++) pts.push(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(u, r * Math.cos((n * Math.PI) / 6)), G.mul3(v, r * Math.sin((n * Math.PI) / 6)))));
        }
        const pb = A.boundsOf(plug);
        for (const other of nearSolids) {
          if (other === plug || !meets(A.boundsOf(other), pb, 0)) continue;
          let worst = 0;
          for (const p of pts) worst = Math.min(worst, A.sdf(other, p));
          if (worst < -0.15) out.push(`through plug${i} × ${other.name} ${worst.toFixed(2)}`);
        }
      }
      // the weights stay inside the bay
      for (const i of state.flying) if (state.lift[i] > travel) out.push(`weight${i} lifted ${state.lift[i].toFixed(1)} > ${travel.toFixed(1)}`);
      // draw order wherever a moving part overlaps something on screen
      const moverBoxes = movers.map((it) => screenOf(it.shapes));
      const subset = R.items.filter((it) => it.shapes.length && moverBoxes.some((b) => meets2(screenOf(it.shapes), b)));
      const overlaps = A.overlapsOf(subset, Wd.P, { states: [0], skip: (a, b) => A.sameRun(a, b) || (!names.has(a.name) && !names.has(b.name)) });
      const depth = A.depthOrder(subset, Wd.P, { overlaps, solved: { dropped: [] } });
      for (const d of depth.problems) if (names.has(d.front.split("#")[0]) || names.has(d.back.split("#")[0])) out.push(`order ${d.front} in front of ${d.back} drawn first ${d.area?.toFixed?.(2) ?? ""}`);
      if (out.length) {
        problems += out.length;
        for (const line of out) {
          const key = `${label}|${line.replace(/-?[0-9]+\.[0-9]+/g, "")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          console.log(`${label} · ${at} · ${line}`);
        }
      }
    }
  }
  console.log(`flights: ${count} frames`);
  console.log(problems ? `flight audit failed: ${problems} problems` : "flight audit passed");
  if (problems) process.exitCode = 1;

  // ---------------------------------------------------------- comb trips: down into the rows and back, every 0.05 s
  // The cords are all in their seats whenever the combs move. Each moving comb is checked against every solid near it
  // (nothing passes through anything) and for draw order wherever it overlaps something on screen.
  const { stateOf } = await import("./model.mjs");
  const { combShapes } = await import("./proof.mjs");
  const T_ = (h) => Wd.combTime(h);
  const bar = (shape) => {
    const b = A.boundsOf(shape);
    const pts = [];
    for (let x = b.min[0]; x <= b.max[0] + 1e-9; x += 0.8)
      for (let y = b.min[1]; y <= b.max[1] + 1e-9; y += (b.max[1] - b.min[1]) / 3)
        for (let z = b.min[2]; z <= b.max[2] + 1e-9; z += (b.max[2] - b.min[2]) / 3) pts.push([x, y, z]);
    return pts;
  };
  const ringOf = (shape) => {
    const pts = [];
    const { F, poly } = shape;
    const u = G.unit3(G.cross3(F.a, [0, 0, 1]));
    const v = G.cross3(F.a, u);
    for (const [s, r] of poly) if (r > 0) for (let n = 0; n < 12; n++) pts.push(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(u, r * Math.cos((n * Math.PI) / 6)), G.mul3(v, r * Math.sin((n * Math.PI) / 6)))));
    return pts;
  };
  let combFrames = 0;
  let combProblems = 0;
  const combSeen = new Set();
  for (const on of [true, false]) {
    const hs = on ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const total = Math.max(...hs.map((h, n) => n * Wd.COMB_STAGGER + T_(h)));
    for (let c = 0; c <= total + 1e-9; c += 0.05) {
      const comb = [0, 0, 0, 0];
      hs.forEach((h, n) => {
        const t = Math.max(0, Math.min(T_(h), c - n * Wd.COMB_STAGGER));
        comb[h] = on ? t : T_(h) - t;
      });
      const flying = hs.filter((h) => comb[h] > 0 && comb[h] < T_(h));
      if (!flying.length) continue;
      combFrames++;
      const state = { ...stateOf("idle"), comb };
      const R = record(state, { svg: false });
      const out = [];
      for (const h of flying) {
        const mine = combShapes(h, comb[h]);
        const pts = mine.flatMap((shape) => (shape.kind === "body" ? ringOf(shape) : bar(shape)));
        const box = pts.reduce((b, p) => ({ min: b.min.map((v, i) => Math.min(v, p[i])), max: b.max.map((v, i) => Math.max(v, p[i])) }), { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
        for (const other of R.solids) {
          if ((other.owner ?? other.name).startsWith(`comb${h}`)) continue;
          if (!meets(A.boundsOf(other), box, 0)) continue;
          let worst = 0;
          for (const p of pts) worst = Math.min(worst, A.sdf(other, p));
          if (worst < -0.15) out.push(`through comb${h} × ${other.name} ${worst.toFixed(2)}`);
        }
      }
      const names = new Set(flying.map((h) => `comb${h}`));
      const movers = R.items.filter((it) => names.has(it.name));
      const moverBoxes = movers.map((it) => screenOf(it.shapes));
      const subset = R.items.filter((it) => it.shapes.length && moverBoxes.some((b) => meets2(screenOf(it.shapes), b)));
      const overlaps = A.overlapsOf(subset, Wd.P, { states: [0], skip: (a, b) => !names.has(a.name) && !names.has(b.name) });
      const depth = A.depthOrder(subset, Wd.P, { overlaps, solved: { dropped: [] } });
      for (const d of depth.problems) out.push(`order ${d.front} in front of ${d.back} drawn first`);
      if (out.length) {
        combProblems += out.length;
        for (const line of out) {
          const key = line.replace(/-?[0-9]+\.[0-9]+/g, "");
          if (combSeen.has(key)) continue;
          combSeen.add(key);
          console.log(`combs ${on ? "in" : "out"} · t=${c.toFixed(2)} · ${line}`);
        }
      }
    }
  }
  console.log(`comb trips: ${combFrames} frames`);
  console.log(combProblems ? `comb audit failed: ${combProblems} problems` : "comb audit passed");
  if (combProblems) process.exitCode = 1;
}
