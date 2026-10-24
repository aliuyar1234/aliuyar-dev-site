// Fig 19 build: standalone previews and the geometry audit.
//   node build.mjs           writes preview/robust-discover-distill.html and -light.html
//   node build.mjs --audit   also proves the geometry in every resting and moving pose
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import * as k from "../kit/iso-kit.mjs";
import { render } from "./art.mjs";
import { compose, REST, HELD } from "./parts.mjs";
import { P } from "./scene.mjs";
import { DATA, conditionOf, readoutOf, STEPS, RUN, TOUR, strokesAt, ramAt, poisonedGrains, heldGrains } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "robust-discover-distill";
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

// ---------------------------------------------------------------- truth: the model reproduces the paper's numbers
{
  const c = (threat, p, screen, anchor) => conditionOf({ threat, p, screen, anchor });
  const eq = (a, b, what) => {
    if (a !== b) throw new Error(`truth: ${what}: ${a} ≠ ${b}`);
  };
  eq(c("random", 0.3, true, false).dropped, 0, "D1 drops at random p = 0.3");
  eq(c("random", 0.3, true, false).final, 4000, "final N at random p = 0.3");
  eq(c("random", 0.3, false, false).poisoned, 1213, "poisoned at random p = 0.3");
  eq(c("trigger", 0.1, true, false).dropped, 47, "D1 drops at trigger p = 0.1");
  eq(c("trigger", 0.1, true, false).final, 3953, "final N at trigger p = 0.1");
  eq(c("trigger", 0.1, false, false).poisoned, 414, "poisoned at trigger p = 0.1");
  eq((c("random", 0.3, false, true).reward.mean / 1000).toFixed(6), "0.002270", "D2 reward");
  eq((c("random", 0.3, false, true).reward.std / 1000).toFixed(6), "0.001443", "D2 std");
  eq((c("random", 0.3, false, false).reward.mean / 1000).toFixed(6), "0.001803", "D0 reward");
  eq((c("random", 0.3, false, false).reward.std / 1000).toFixed(6), "0.001077", "D0 std");
  for (const [s, a] of [[false, false], [true, false], [false, true], [true, true]]) eq(c("trigger", 0.1, s, a).trigger, 0, "trigger success");
  // a screen that drops nothing reads the runs without it, and names them: no D1 or D3 seed is claimed
  for (const p of [0, 0.1, 0.3]) for (const a of [false, true]) {
    const [on, off] = [c("random", p, true, a).reward, c("random", p, false, a).reward];
    eq(on.mean, off.mean, "D1 that drops nothing reads as D0");
    eq(on.seeds === 2 ? on.from : null, on.seeds === 2 ? (a ? "D2" : "D0") : null, "two-seed reading names the runs it comes from");
  }
  eq(readoutOf(c("random", 0.3, true, false), { phase: "done" })[2], "clean 0.001803 ± 0.001077 (D0 runs, 2 seeds)", "D1 readout");
  eq(TOUR.findIndex((t) => t.threat === "trigger" && !t.screen && !t.anchor) === TOUR.findIndex((t) => t.threat === "trigger"), true, "the tour shows the trigger lamp under D0 first");
  eq(Math.abs(strokesAt(RUN) - STEPS) < 1e-9 && strokesAt(RUN / 2) < STEPS, true, "a run turns exactly 200 strokes");
  eq(STEPS, 200, "SDFT steps");
  eq(DATA.setup.eval, 800, "eval prompts");
  eq(-ramAt(0.5), 14, "punch stroke");
  eq(poisonedGrains(c("random", 0.3, false, false)), 8, "bright grains at random p = 0.3");
  eq(poisonedGrains(c("trigger", 0.1, false, false)), 3, "ringed grains at trigger p = 0.1");
  eq(heldGrains(c("trigger", 0.1, true, false)), 1, "grains held by D1 at trigger p = 0.1");
  eq(heldGrains(c("random", 0.3, true, false)), 0, "grains held by D1 at random p = 0.3");
  for (const [threat, p] of [["random", 0], ["random", 0.1], ["random", 0.3], ["trigger", 0.1]])
    for (const screen of [false, true]) if (heldGrains(c(threat, p, screen, false)) > HELD.length) throw new Error("truth: more held grains than places on the screen");
  console.log("truth: Table 1 counts, the §5.1 two-seed rewards, §5.2 trigger success and the §4 setup reproduce");
}

// ---------------------------------------------------------------- previews
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=RDD", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
// what ships: live.js with scene, model, moving and data bundled, the shared kit left out, minified as Vite does
const liveOf = (extra) => Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning", ...extra], { encoding: "utf8" }));
const [liveRaw, liveMin] = [liveOf([]), liveOf(["--minify"])];
const css = readFileSync(join(HERE, "figure.css"), "utf8");
const { html } = render();
const flat = render({ flat: true }).html;
mkdirSync(join(HERE, "preview"), { recursive: true });
for (const [markup, suffix] of [[html, ""], [flat, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}"${theme === "light" ? ' data-theme="light"' : ""}>${markup}</div>`;
    const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) RDD.mount(el);\n`;
    writeFileSync(join(HERE, "preview", `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Tablet press", theme, body, script }));
  }
const count = (re) => (html.match(re) || []).length;
const items = compose(REST);
console.log(`wrote preview/${SLUG}.html and -light.html (+ -flat for the line check) · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${count(/<path/g)} paths, ${count(/<use /g)} placements · ${count(/class="iso-solid/g)} solids · ${items.length} items · live ${(liveMin / 1024).toFixed(1)} KB minified (${(liveRaw / 1024).toFixed(1)} KB unminified), kit excluded`);

if (process.argv.includes("--audit")) {
  const { audit } = await import("./audit.mjs");
  process.exitCode = audit() ? 1 : 0;
}
