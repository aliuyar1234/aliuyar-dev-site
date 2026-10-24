// Fig 15 build: writes the standalone previews and (with --audit) proves the geometry in every pose the gauge can rest in or pass through.
//   node build.mjs           previews in preview/
//   node build.mjs --audit   + kit audit over sampled poses of the planner (every setting, both stacks, both splits, mid-travel and mid-lift)
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "what-survives-control-calibration";
const auditing = process.argv.includes("--audit");

const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=WsLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveOwn = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--minify-syntax", "--log-level=warning"], { encoding: "utf8" });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) WsLive.mount(el);\n`;
  writeFileSync(join(HERE, "preview", theme === "light" ? `${SLUG}-light.html` : `${SLUG}.html`), k.pageHtml({ title: "Vernier height gauge", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/${SLUG}.html, preview/${SLUG}-light.html · static ${(art / 1024).toFixed(1)} KB · ${paths} paths · ${solids} solid groups · live ${(Buffer.byteLength(liveOwn) / 1024).toFixed(1)} KB (without kit)`);

if (auditing) await import(pathToFileURL(join(HERE, "audit.mjs")).href);
