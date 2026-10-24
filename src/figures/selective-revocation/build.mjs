// Writes the standalone previews preview/selective-revocation.html and -light.html.
// node build.mjs            both themes
// node build.mjs --audit    also reports whether the kit audit applies (it needs lathe parts, pipes or cables)
// It also writes preview/*-flat*.html, the same figure with every <use> inlined, for scripts/lines.mjs.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { render } from "./art.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = "selective-revocation";
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
const bundle = execFileSync("npx", ["esbuild", join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=SRR", "--log-level=warning"], { cwd: HERE, encoding: "utf8" });
const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) SRR.mount(el);`;

mkdirSync(join(HERE, "preview"), { recursive: true });
const flat = render({ flat: true }).html;
for (const [markup, suffix] of [[html, ""], [flat, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="fig fig-${SLUG}" data-fig="${SLUG}">${markup}</div>`;
    const name = `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`;
    writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Card catalogue", theme, body, script }));
  }

const live = readFileSync(join(HERE, "live.js"), "utf8").length + readFileSync(join(HERE, "model.mjs"), "utf8").length;
const count = (markup, re) => (markup.match(re) || []).length;
console.log(`wrote preview/${SLUG}.html and -light.html (+ -flat for the line check) · static markup ${(html.length / 1024).toFixed(1)} KB · live ${(live / 1024).toFixed(1)} KB (live.js + model.mjs) · ${count(html, /<path/g)} paths and ${count(html, /<use /g)} placements, ${count(flat, /class="iso-solid/g)} solids once placed`);

if (process.argv.includes("--audit")) {
  console.log("audit: not applicable · the figure has no lathe parts, pipes or cables (prisms and z-axis cylinders only, as in the desk computer)");
}
