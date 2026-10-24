// Fig 8 build: settles the painter's order from measured depth, writes order.mjs and the standalone previews,
// and with --audit proves the geometry in every pose the machine passes through.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + the kit audit at rest and over sampled frames of a pass in every mode
import { writeFileSync, readFileSync, mkdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build, OPENING, FX, halfRing, BLANK_JAW } from "./geometry.mjs";
import { P, offsetOf, move, keyRing, BODY_TOP, keyPaths, liveSolid, pinSolid, BLANK_SH, MASTER_SH, CUT_X, KEY_Z, KEY_T, PIN, RAIL_TOP, pinX, pinPaths, leverRing, leverPaths, LEVER, LEVER_Z, needleRing, needleAt, coilOf, DIAL_TOP, SPRING, SLEEVES, SHAFT } from "./view.mjs";
import { passAt, PASS_END, edgeOf, MODES, grade, STRICT, STATIONS, FEATURE, master, target, BLADE } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "same-size-capability-transfer";
const auditing = process.argv.includes("--audit");
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const shapeOf = (d, name) => {
  const [kind, ...a] = d;
  const meta = (extra) => ({ name, ...(extra || {}), ...(name.startsWith("stand.") ? { ground: true } : {}) });
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], meta(a[3]), 3);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], meta(a[5]));
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], meta(a[4]));
  if (kind === "ring") return A.ring(a[0], a[1], a[2], a[3], a[4], meta(a[5]));
  if (kind === "solid") return A.solid(a[0], a[1], meta(a[2]));
  if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], meta(a[4]));
  if (kind === "extruded") return A.extruded(a[0], a[1], a[2], meta(a[3]));
  if (kind === "ball") return A.ball(a[0], a[1], meta(a[2]));
  if (kind === "slide") return A.slide(a[0], a[1], a[2], a[3], meta(a[4]));
  throw new Error(kind);
};

// the parts whose shape changes: their recorded shape in a given state
function shapesIn(item, s) {
  if (item.name === "blank.key" || item.name === "blank.tip") {
    const ring = halfRing(keyRing(BLANK_SH, s.edge), CUT_X - s.c, item.name === "blank.key" ? -1 : 1);
    return ring.length > 2 && Math.max(...ring.map(([x]) => x)) - Math.min(...ring.map(([x]) => x)) > 0.05 ? [["extruded", ring, KEY_Z, KEY_T]] : [];
  }
  if (/^pin\d/.test(item.name)) {
    const i = Number(item.name.slice(3));
    const h = s.pins[i];
    return [["cyl", pinX(i), PIN.y, PIN.r, RAIL_TOP, h]];
  }
  if (item.name === "blank.jaw" || item.name === "blank.jaw.cut") {
    const plan = jawHalf(item.name === "blank.jaw" ? -1 : 1, s.c);
    return plan ? [["slab", plan, BODY_TOP, KEY_Z - BODY_TOP]] : [];
  }
  if (item.name === "lever.bar") return [["extruded", leverRing(s.lever), LEVER_Z, 1.6]];
  if (item.name === "needle") return [["extruded", needleRing(s.value), DIAL_TOP, 0.2]];
  if (item.name === "spring") return [["disc", item.shapes[0][1], -s.feed, item.shapes[0][3], SPRING.r, { owner: "spring" }]];
  if (item.name === "shaft.back") return [["disc", FX, item.shapes[0][2], SLEEVES[0] - 7 + s.c, SHAFT.r, { owner: "shaft" }]];
  if (item.name === "shaft.front") return [["disc", FX, SLEEVES[1] + 7 + s.c, item.shapes[0][3], SHAFT.r, { owner: "shaft" }]];
  return item.shapes;
}

// the part of the blank's jaw on one side of the wheel's plane, in the carriage's own coordinates
function jawHalf(side, c) {
  const at = CUT_X - c;
  const [x0, x1] = side < 0 ? [BLANK_JAW.x, Math.min(at, BLANK_JAW.x + BLANK_JAW.w)] : [Math.max(at, BLANK_JAW.x), BLANK_JAW.x + BLANK_JAW.w];
  return x1 - x0 > 0.05 ? { ...BLANK_JAW, x: x0, w: x1 - x0, r: Math.min(BLANK_JAW.r, (x1 - x0) / 2) } : null;
}

// the markup of the parts whose shape changes, as live.js draws it in that state
function svgIn(item, s) {
  if (item.name === "blank.jaw" || item.name === "blank.jaw.cut") {
    const plan = jawHalf(item.name === "blank.jaw" ? -1 : 1, s.c);
    return plan ? k.solidSvg(k.slabOf(plan, BODY_TOP, KEY_Z - BODY_TOP, P, 3, 0.5), { tone: "mid" }) : "";
  }
  // the audit reads a clip as its bounding box, so each copy of the blank is given as the half it shows
  if (item.name === "blank.key" || item.name === "blank.tip") {
    const ring = halfRing(keyRing(BLANK_SH, s.edge), CUT_X - s.c, item.name === "blank.key" ? -1 : 1);
    const half = ring.length > 2 ? liveSolid(k.extrude(ring, KEY_Z, KEY_T, P, { convex: false }), { tone: "hi", lit: true, crease: "lo" }) : "";
    return `<g data-blank>${half}</g>`; // the keyway and bow marks sit inside the half that carries them
  }
  if (/^pin\d/.test(item.name)) return pinSolid(pinPaths(Number(item.name.slice(3)), s.pins[Number(item.name.slice(3))]), "");
  if (item.name === "lever.bar") return liveSolid(leverPaths(s.lever), { tone: "mid" });
  if (item.name === "needle") return item.svg.replace(/ d="[^"]*"/, ` d="${needleAt(s.value)}"`);
  if (item.name === "spring") {
    const c = coilOf(s.feed);
    return `<path class="iso-line" data-tone="lo" d="${c.back}"/><path class="iso-line" data-tone="mid" d="${c.front}"/>`;
  }
  return item.svg;
}
// the clip paths in a given state: a held clip rides with its part, the stylus clip stays at the holder face
function clipsIn(clips, s) {
  return clips.replace(/data-hold="(-?)(\w+)"/g, (whole, back, part) => {
    const [dx, dy, dz] = offsetOf(part, s);
    return `${whole} transform="${back ? k.translateAlong(P, [-dx, -dy, -dz]) : move(part, s)}"`;
  });
}

// a full state of the machine (what live.js draws) for a mode at a pass age
function stateAt(mode, pruned, age) {
  const p = passAt(age, mode, pruned);
  const at = p.at === -2 ? 0 : p.at;
  return {
    c: p.c,
    feed: p.feed,
    lift: mode === "steering" ? 1 : 0,
    back: mode === "dense" ? 1 : 0,
    prune: pruned ? 1 : 0,
    lever: LEVER.angles[MODES.indexOf(mode)],
    edge: edgeOf(mode, pruned, at),
    pins: STATIONS.map((station) => (pruned && station !== FEATURE ? PIN.down : PIN.h)),
    value: p.done ? grade(mode, pruned) : STRICT.base,
  };
}
const REST_STATE = { ...stateAt(OPENING.mode, OPENING.pruned, PASS_END), value: grade(OPENING.mode, OPENING.pruned) };

function record(items, s, { key = null, skipEmpty = false } = {}) {
  const R = A.recorder(P);
  const defs = `<defs>${clipsIn(clips, s)}</defs>`;
  items.forEach((item, index) => {
    const offset = item.part ? offsetOf(item.part, s) : [0, 0, 0];
    const shapes = shapesIn(item, s).map((d, j) => A.moved(shapeOf(d, j ? `${item.name}#${j}` : item.name), offset));
    if (skipEmpty && (item.name === "blank.tip" || item.name === "blank.jaw.cut" || item.name === "blank.jaw") && !shapes.length) return; // before the carriage moves, nothing of the blank has passed the wheel: the copy draws nothing
    shapes.forEach((shape) => R.solid(shape));
    const own = svgIn(item, s);
    const body = own.includes("clip-path") ? defs + own : own;
    const svg = item.part ? `<g transform="${move(item.part, s)}">${body}</g>` : body;
    R.put({ name: item.name, key: key ? key(index) : 0, svg, shapes });
  });
  return R;
}

// ------------------------------------------------------------ painter's order: settle at rest and in mid-pass poses, then keep one order
const { items, clips } = build();
const poses = [REST_STATE];
for (const mode of MODES) for (const age of [1.6, 2.8, 4.0, 4.7]) poses.push(stateAt(mode, false, age));
poses.push(stateAt("sparse", true, 2.4));
// solve the keys over every pose at once: each pose's overlaps become rules on the same keys
const Rs = poses.map((s) => record(items, s));
const overlaps = Rs.map((R) => A.overlapsOf(R.items, P, { states: [0] }));
// neighbouring pins touch on screen by less than the measuring threshold: the one further along +x is nearer the camera
const pinIndex = (i) => items.findIndex((item) => item.name === `pin${i}`);
const pinRules = Array.from({ length: 15 }, (_, i) => ({ state: 0, a: pinIndex(i), b: pinIndex(i + 1), front: [{ area: 0 }, { area: 1 }] }));
const merged = { ...overlaps[0], pairs: [...overlaps.flatMap((o) => o.pairs), ...pinRules] };
const solved = A.orderKeys(Rs[0].items.map((item, index) => ({ ...item, key: index * 1e-3 })), merged);
const ranked = items.map((item, index) => ({ name: item.name, key: solved.keys[index], index })).sort((a, b) => a.key - b.key || a.index - b.index);
const ORDER = ranked.map((r) => r.name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from measured depth in the rest pose and mid-pass poses. Back to front.\nexport const ORDER = [\n${ORDER.map((n) => `  "${n}",`).join("\n")}\n];\n`);
if (solved.dropped?.length) console.log(`order: ${solved.dropped.length} rules dropped (${solved.dropped.map((r) => `${items[r.front].name} over ${items[r.back].name}`).join(", ")})`);

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=SCT", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const ownOf = (extra) => execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning", ...extra], { encoding: "utf8" });
const liveOwn = ownOf([]);
const liveMin = ownOf(["--minify"]);
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) SCT.mount(el);\n`;
  writeFileSync(join(HERE, "preview", `${SLUG}${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Key duplicating machine", theme, body, script, width: 650 }));
}
const count = (re) => (html.match(re) || []).length;
console.log(`wrote preview/${SLUG}.html and -light.html · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${count(/<path/g)} paths · ${count(/class="iso-solid/g)} solids · ${items.length} items · static ${Buffer.byteLength(html)} B · live without the kit ${Buffer.byteLength(liveOwn)} B bundled (${Buffer.byteLength(liveMin)} B minified; live.js alone ${statSync(join(HERE, "live.js")).size} B)`);

// ------------------------------------------------------------ key outlines: no subpath may cross another (kit outlines are not line-checked)
function crossingsOf(d) {
  const segs = [];
  for (const sub of d.split("M").filter(Boolean)) {
    const pts = sub.trim().split(/L/).map((t) => t.trim().split(/[\s,]+/).map(Number));
    for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i], pts[i + 1]]);
  }
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  let n = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const [p, q] = segs[i];
      const [r, t] = segs[j];
      const d1 = cross(r, t, p), d2 = cross(r, t, q), d3 = cross(p, q, r), d4 = cross(p, q, t);
      if (((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6))) n++;
    }
  return n;
}
{
  const cases = [["master", MASTER_SH, master]];
  for (const mode of MODES) for (const pruned of mode === "sparse" ? [false, true] : [false]) {
    cases.push([`blank ${mode}${pruned ? " pruned" : ""}`, BLANK_SH, target(mode, pruned)]);
    for (let at = 2; at < BLADE; at += 1.5) cases.push([`blank ${mode}${pruned ? " pruned" : ""} at ${at}`, BLANK_SH, edgeOf(mode, pruned, at)]);
  }
  const bad = cases.map(([name, sh, depth]) => [name, crossingsOf(keyPaths(sh, depth).outline)]).filter(([, n]) => n);
  console.log(`key outlines: ${cases.length} checked, ${bad.length ? bad.map(([n, c]) => `${n}: ${c} crossings`).join("; ") : "0 crossings"}`);
  if (bad.length) process.exitCode = 1;
}

// ------------------------------------------------------------ audit in every sampled pose, in the settled order
if (auditing) {
  const ordered = ORDER.map((name) => items.find((item) => item.name === name));
  const frames = [REST_STATE];
  for (const mode of MODES) for (const pruned of mode === "sparse" ? [false, true] : [false]) for (let age = 0; age <= PASS_END + 1e-9; age += 0.25) frames.push(stateAt(mode, pruned, age));
  let failed = 0;
  const failing = [];
  const seen = new Map();
  for (const [index, s] of frames.entries()) {
    const R = record(ordered, s, { key: (i) => i, skipEmpty: true });
    const overlapsHere = A.overlapsOf(R.items, P, { states: [0] });
    R.settled = { items: R.items, overlaps: overlapsHere, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
    const result = A.audit(R, P, { frames: [], apart: false });
    const n = A.failures(result);
    if (n) {
      failed += n;
      failing.push(index);
      for (const line of A.report(result).split("\n").filter((l) => l.startsWith("  "))) {
        const key = line.replace(/-?\d+(\.\d+)?/g, "#");
        const hit = seen.get(key) ?? { line, frames: [] };
        hit.frames.push(index);
        seen.set(key, hit);
      }
    }
    if (index === 0) console.log(A.report(result));
  }
  for (const { line, frames: where } of seen.values()) console.log(`${line}\n      in ${where.length} frames, first ${where[0]}`);
  console.log(`\naudited ${frames.length} frames (rest, and every 0.25 s of a pass in sparse, sparse pruned to one feature, dense and steering)`);
  console.log(failed ? `audit failed: ${failed} problems in ${failing.length} frames` : "audit passed");
  if (failed) process.exitCode = 1;
}
