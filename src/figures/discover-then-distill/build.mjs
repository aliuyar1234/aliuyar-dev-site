// Fig 18 build: settles the painter's order from the recorded shapes, writes order.mjs and the standalone previews.
//   node build.mjs            previews in preview/
//   node build.mjs --audit    + the kit audit at rest and with the splitter on take-off
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./geometry.mjs";
import { P } from "./rig.mjs";
import { kitScript } from "/Users/user/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const auditing = process.argv.includes("--audit");

// ------------------------------------------------------------ painter's order from true depth
const { R } = build();
const t0 = Date.now();
A.settle(R, P, { states: [0] });
const ORDER = [...R.items].sort((a, b) => a.key - b.key).map((item) => item.name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from A.settle. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER).replace(/","/g, '",\n  "').replace("[", "[\n  ").replace(/]$/, ",\n]")};\n`);
console.log(`settled ${R.items.length} items in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const hasLive = existsSync(join(HERE, "live.js"));
const bundle = hasLive ? execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=DtdLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" }) : "";
const liveSize = hasLive ? Buffer.byteLength(execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning"], { encoding: "utf8" })) : 0;
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-discover-then-distill" data-fig="discover-then-distill" data-theme="${theme}">${html}</div>`;
  const script = hasLive ? `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="discover-then-distill"]')) DtdLive.mount(el);\n` : "";
  const name = theme === "light" ? "discover-then-distill-light.html" : "discover-then-distill.html";
  writeFileSync(join(HERE, "preview", name), k.pageHtml({ title: "Fractional still", theme, body, script, width: 650 }));
}
const art = Buffer.byteLength(html);
const paths = (html.match(/<path/g) || []).length;
const solids = (html.match(/class="iso-solid/g) || []).length;
console.log(`wrote preview/ · static ${(art / 1024).toFixed(1)} KB · ${paths} paths · ${solids} solid groups · ${R.items.length} items · live ${(liveSize / 1024).toFixed(1)} KB (without kit)`);

// ------------------------------------------------------------ audit
if (auditing) A.auditOrExit(R, P, { frames: [], apart: false });
