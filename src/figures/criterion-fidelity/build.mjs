// Standalone preview pages for Fig 2, the truth check and the geometry audit.
//   node build.mjs            writes preview/criterion-fidelity.html and -light.html
//   node build.mjs --audit    also proves the geometry in every resting and moving pose
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { render } from "./art.mjs";
import { compose, poseOf, REST } from "./parts.mjs";
import { P, TILT, trayFor, POISE_MAX } from "./scene.mjs";
import { STATIONS, JUDGES, PRINTED, N, rateOf, leanOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

// Truth: every count must be the one integer that reproduces the paper's printed value.
{
  const r3 = (x) => Math.round(x * 1000 + 1e-9) / 1000;
  const only = (want, of, test) => {
    const hits = [];
    for (let n = 0; n <= of; n++) if (test(n)) hits.push(n);
    if (hits.length !== 1 || hits[0] !== want) throw new Error(`truth: expected ${want}, the paper allows ${hits.join(", ") || "none"}`);
  };
  for (const [id, p] of Object.entries(PRINTED)) {
    const c = JUDGES.find((j) => j.id === id).count;
    only(c.base, N, (n) => r3(n / N) === p.base);
    only(c.gcf, N, (n) => r3(n / N) === p.gcf);
    if (p.of) {
      const s = JUDGES.find((j) => j.id === p.of).count;
      // strict = standard + delta, with the delta printed to three decimals
      const within = (n, std, d) => Math.abs(n / c.base - std - d) <= 0.0005 + 1e-9;
      only(c.sens, c.base, (n) => within(n, s.sens / s.base, p.dSens));
      only(c.inv, c.base, (n) => within(n, s.inv / s.base, p.dInv));
    } else {
      only(c.sens, c.base, (n) => r3(n / c.base) === p.sens);
      only(c.inv, c.base, (n) => r3(n / c.base) === p.inv);
    }
  }
  // Gaps quoted in the text: 0.285 / 0.510 standard, 0.193 strict Qwen.
  const gap = (id) => r3((JUDGES.find((j) => j.id === id).count.base - JUDGES.find((j) => j.id === id).count.gcf) / N);
  if (gap("qwen-standard") !== 0.285 || gap("llama-standard") !== 0.51 || gap("qwen-strict") !== 0.193) throw new Error("truth: gaps drift from the paper");
  // Every lean is on the scale, so nothing is ever clamped at a stop.
  for (const judge of JUDGES) for (const station of STATIONS) if (Math.abs(leanOf(judge, station)) > 1 + 1e-12) throw new Error(`truth: ${judge.id} ${station.id} is off the scale`);
  console.log(`truth: ${Object.keys(PRINTED).length * 4} counts re-derived from the paper, each the only integer that fits; no reading past a stop`);
}

const live = (() => {
  const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
  const out = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=CriterionFidelity", "--log-level=warning"], { encoding: "utf8" });
  return `${out}\nfor (const el of document.querySelectorAll('[data-fig="criterion-fidelity"]')) CriterionFidelity.mount(el);\n`;
})();

const css = existsSync(join(HERE, "figure.css")) ? readFileSync(join(HERE, "figure.css"), "utf8") : "";
const { html } = render();
mkdirSync(join(HERE, "preview"), { recursive: true });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-criterion-fidelity" data-fig="criterion-fidelity"${theme === "light" ? ' data-theme="light"' : ""}>${html}</div>`;
  const page = k.pageHtml({ title: "Criterion balance", theme, body, script: kitScript() + "\n" + live });
  writeFileSync(join(HERE, "preview", theme === "light" ? "criterion-fidelity-light.html" : "criterion-fidelity.html"), page);
}
const liveSize = (() => {
  const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
  const out = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" });
  return out.length;
})();
console.log(`wrote preview pages · static markup ${html.length} chars (${(html.length / 1024).toFixed(1)} KB) · live code without the kit ${(liveSize / 1024).toFixed(1)} KB · ${compose(REST).length} items`);

if (process.argv.includes("--audit")) {
  const at = (judge, station, extra = {}) => poseOf(judge, station, extra);
  const full = (sign) => ({ theta: sign * TILT, poise: -POISE_MAX * sign });
  const poses = [
    ["rest: llama standard · base", REST],
    ["faithful · base, full left", at(0, 0)],
    ["faithful · counterfactual, full right", at(0, 2)],
    ["llama strict · pair", at(3, 1)],
    ["qwen standard · counterfactual", at(2, 2)],
    ["arrested level, poise crossing the centre", at(2, 0, { theta: 0, poise: 0, arrest: 1 })],
    ["arrested, poise at the far right", at(1, 2, { theta: 0, poise: POISE_MAX, arrest: 1 })],
    ["pins half up under a full right lean", at(0, 2, { arrest: 0.5, theta: -TILT * 0.57 })],
    ["card down, shuttle between stations", { ...at(4, 1, { theta: 0, arrest: 1 }), lift: [0, 0, 0], tray: (trayFor(0) + trayFor(1)) / 2 }],
    ["shuttle at the far left stop", { ...at(4, 2, { theta: 0, arrest: 1 }), lift: [0, 0, 0] }],
    ["pair half lifted", { ...at(3, 1, { theta: 0, arrest: 1 }), lift: [0, 0.5, 0] }],
    ["full left, poise far left", at(1, 0, full(1))],
    ["full right, poise far right", at(1, 0, full(-1))],
    ["register empty and full", at(0, 0, { stacks: [0.001, 1, 0.001, 1], floats: [0, 1, 0, 1], first: 1 })],
  ];
  let total = 0;
  for (const [label, pose] of poses) {
    const items = compose(pose, A);
    const R = A.recorder(P);
    items.filter((item) => item.shapes.length).forEach((item, index) => R.put({ name: item.name, key: index, svg: item.svg, shapes: item.shapes.map((shape) => (shape.kind === "tube" ? shape : R.solid(shape))) }));
    for (const route of items.routes) R.route(route.name, route.route, route.r, route.rigid ? { touch: route.touch } : { gaps: route.gaps, rims: route.rims, limp: true, touch: route.touch });
    const overlaps = A.overlapsOf(R.items, P);
    const mounts = A.mountsOf(R.tubes, R.solids);
    const result = {
      clearance: A.clearances(R.tubes, R.solids, { mounts }),
      self: A.selfOverlaps(R.items, P),
      depth: A.depthOrder(R.items, P, { overlaps }),
      terminals: A.terminals(R.tubes, R.solids, { mounts }),
      loose: A.looseEnds(R.tubes, R.solids, { state: 0 }),
      folds: A.folds(R.routes, P, { items: R.items }),
      crowding: A.crowding(R.routes, P, { items: R.items, links: A.linksOf(R.tubes, mounts), rods: A.slenderOf(R.solids) }),
      supports: A.supports(R.solids, R.tubes),
      cover: A.coverage(R.items, P),
      wobble: A.wobble(R.solids),
    };
    const count = A.failures(result);
    total += count;
    console.log(`\n— pose: ${label}`);
    console.log(A.report(result));
    console.log(`${R.solids.length} solids · ${R.tubes.length} tube runs · ${R.items.length} items · ${overlaps.pairs.length} overlaps · ${count ? `${count} problem${count === 1 ? "" : "s"}` : "clean"}`);
  }
  console.log(total ? `\naudit failed: ${total} problem${total === 1 ? "" : "s"}` : "\naudit passed");
  if (total) process.exitCode = 1;
}
