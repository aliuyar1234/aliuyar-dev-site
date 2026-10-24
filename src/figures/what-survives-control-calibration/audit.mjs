// Fig 15 audit (run by `node build.mjs --audit`): replays the page's own planner through the tour and through
// every switch a reader can make, and runs the kit audit on each distinct pose it passes through.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./geometry.mjs";
import { P, offsetOf } from "./view.mjs";
import { dress } from "./art.mjs";
import { SETTINGS, EMPTIES, TOUR, REST_GOAL, restPose, advance } from "./model.mjs";

const items = build();
const step = Number((process.argv.find((a) => a.startsWith("--every=")) || "--every=12").slice(8));
const limit = Number((process.argv.find((a) => a.startsWith("--limit=")) || "--limit=0").slice(8));
const grid = Number((process.argv.find((a) => a.startsWith("--grid=")) || "--grid=2").slice(7));

// every pose the planner passes through: the tour twice, then every goal from every rest pose
function* poses() {
  const goals = [];
  for (let s = 0; s < SETTINGS.length; s++) for (const at of ["f", "c"]) for (const split of ["test", "shift"]) goals.push({ setting: s, at, split });
  const runs = [];
  runs.push([REST_GOAL, ...[...TOUR, ...TOUR].map(({ setting, at, split }) => ({ setting, at, split }))]);
  for (const from of goals) for (const to of goals) if (from !== to) runs.push([from, to]);
  for (const run of runs) {
    const pose = restPose(run[0]);
    const vel = { h: 0, gx: 0, lift: 0, knob: 0 };
    yield { ...pose };
    for (const goal of run.slice(1)) {
      for (let frame = 0; frame < 60 * 8; frame++) {
        const { resting } = advance(pose, vel, goal, 1 / 60);
        if (frame % step === 0) yield { ...pose };
        if (resting) break;
      }
      yield { ...pose };
    }
  }
}

const seen = new Set();
const list = [];
for (const pose of poses()) {
  const key = [pose.gx, pose.h, pose.lift].map((v) => Math.round(v / grid)).join(",") + `,${pose.variant},${pose.cased}`;
  if (seen.has(key)) continue;
  seen.add(key);
  list.push(pose);
}

const shapeOf = (d, meta) => {
  const [kind, ...a] = d;
  const m = { ...(a[a.length - 1] || {}), ...meta };
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], m, 3);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], m);
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], m);
  if (kind === "ring") return A.ring(a[0], a[1], a[2], a[3], a[4], m);
  if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], m);
  if (kind === "ext") return A.extruded(a[0], a[1], a[2], m);
  if (kind === "slide") return A.slide(a[0], a[1], a[2], a[3], m);
  throw new Error(kind);
};

let failed = 0;
const failing = [];
for (const pose of limit ? list.slice(0, limit) : list) {
  const R = A.recorder(P);
  items.forEach((item, index) => {
    if (!item.shapes.length) return;
    const v = /data-variant="(\d)"/.exec(item.attrs || "");
    if (v && Number(v[1]) !== pose.variant) return;
    const s = /data-slot="(\d+)"/.exec(item.attrs || "");
    if (s && EMPTIES[pose.cased].has(Number(s[1]))) return;
    const b = /data-bin="(\d)(\d)"/.exec(item.attrs || "");
    if (b && Number(b[2]) >= SETTINGS[pose.cased].bins[Number(b[1])]) return;
    const offset = offsetOf(item.move, pose);
    const shapes = item.shapes.map((d, j) => A.moved(shapeOf(d, { name: d[d.length - 1]?.name || (j ? `${item.name}#${j}` : item.name) }), offset));
    shapes.forEach((shape) => R.solid(shape));
    const drawn = dress(item, pose);
    const svg = item.move ? `<g transform="${k.translateAlong(P, offset)}">${drawn}</g>` : drawn;
    R.put({ name: item.name, key: index, svg, shapes });
  });
  const overlaps = A.overlapsOf(R.items, P, { states: [0] });
  R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
  const result = A.audit(R, P, { frames: [], apart: false });
  const count = A.failures(result);
  failed += count;
  if (count) {
    failing.push(pose);
    if (failing.length <= 6) {
      console.log(`\n== pose gx ${pose.gx.toFixed(2)} h ${pose.h.toFixed(2)} lift ${pose.lift.toFixed(2)} variant ${pose.variant} failed: ${count}`);
      console.log(A.report(result));
    }
  }
}
console.log(`\naudited ${list.length} distinct poses (the tour twice and all ${12 * 11} goal-to-goal switches, every ${step} frames at 60 fps)`);
console.log(failed ? `audit failed: ${failed} problems in ${failing.length} poses` : "audit passed");
if (failed) process.exitCode = 1;
