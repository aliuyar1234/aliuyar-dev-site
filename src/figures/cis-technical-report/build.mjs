// Fig 22 build: writes the standalone previews and (with --audit) proves the geometry in every pose the tour rests in or passes.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + kit audit of the outside and of the inside seen through the window, settling the painter's order
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");
const SLUG = "cis-technical-report";

if (auditing) {
  const { runAudit } = await import(pathToFileURL(join(HERE, "audit.mjs")).href);
  const ok = await runAudit(HERE);
  if (!ok) process.exitCode = 1;
}

// ------------------------------------------------------------ previews (re-import art after a possible order rewrite)
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = existsSync(join(HERE, "figure.css")) ? readFileSync(join(HERE, "figure.css"), "utf8") : "";
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=CisLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveSize = Buffer.byteLength(readFileSync(join(HERE, "live.js")));
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) CisLive.mount(el);\n`;
  const name = theme === "light" ? `${SLUG}-light.html` : `${SLUG}.html`;
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Glove box", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/${SLUG}.html, preview/${SLUG}-light.html · static ${art} B (${(art / 1024).toFixed(1)} KB) · ${paths} paths · ${solids} solid groups · live.js ${(liveSize / 1024).toFixed(1)} KB (source, without kit)`);
