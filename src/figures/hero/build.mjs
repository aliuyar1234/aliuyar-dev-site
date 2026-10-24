// Writes preview/hero.html and preview/hero-light.html; `node build.mjs --audit` also proves the geometry.
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { buildSync } from "esbuild";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { scene } from "./art.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const { R, P, html, cables } = scene();
const bundle = buildSync({
  stdin: { contents: `import { mount } from "./live.js"; for (const el of document.querySelectorAll('[data-fig="hero"]')) mount(el);`, resolveDir: HERE, loader: "js" },
  bundle: true,
  format: "iife",
  write: false,
  target: "es2020",
}).outputFiles[0].text;
const css = readFileSync(join(HERE, "figure.css"), "utf8");

mkdirSync(join(HERE, "preview"), { recursive: true });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="fig fig-hero" data-fig="hero">${html}</div>`;
  const page = k.pageHtml({ title: "Decision checkweigher", theme, body, script: kitScript() + "\n" + bundle, width: 650 });
  writeFileSync(join(HERE, "preview", theme === "light" ? "hero-light.html" : "hero.html"), page);
}
const liveBytes = ["live.js", "parts.mjs", "model.mjs", "world.mjs"].reduce((sum, file) => sum + statSync(join(HERE, file)).size, 0);
// What ships: the live layer bundled and minified as Vite does for production, with the shared kit left out.
const shipped = buildSync({ entryPoints: [join(HERE, "live.js")], bundle: true, format: "esm", minify: true, write: false, external: ["../kit/*"] }).outputFiles[0].text.length;
const solids = R.items.filter((item) => !item.route && !item.name.startsWith("live.")).length;
console.log(`wrote preview/hero.html, preview/hero-light.html · static ${(html.length / 1024).toFixed(1)} KB · live ${(liveBytes / 1024).toFixed(1)} KB source, ${(shipped / 1024).toFixed(1)} KB bundled and minified without the kit · ${solids} solid items · ${cables} cables and hoses · ${R.items.length} items`);

A.auditOrExit(R, P, {});
