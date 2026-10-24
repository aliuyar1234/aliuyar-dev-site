// Fig 5 build: settles the painter's order (order.mjs), writes preview/<slug>.html and its -light twin,
// and with --audit proves the geometry at rest, stacked and through the fan transition.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { buildSync } from "esbuild";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build, render } from "./art.mjs";
import { selfCheck } from "./model.mjs";

const SLUG = "language-neutral-or-language-specific";
const HERE = dirname(fileURLToPath(import.meta.url));
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const problems = selfCheck();
if (problems.length) {
  console.error("model check failed:\n" + problems.join("\n"));
  process.exit(1);
}
// The painter's order: settle the keys over every fan state, then write the names back to front for render().
const { R, P, cables } = build({ settle: true });
const ordered = R.items.map((item) => item.name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from the settled keys. Back to front.\nexport const ORDER = ${JSON.stringify(ordered)};\n`);
const { html } = render({ order: ordered });

const bundle = buildSync({
  stdin: { contents: `import { mount } from "./live.js"; for (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) mount(el);`, resolveDir: HERE, loader: "js" },
  bundle: true,
  format: "iife",
  write: false,
  target: "es2020",
}).outputFiles[0].text;
const css = readFileSync(join(HERE, "figure.css"), "utf8");

mkdirSync(join(HERE, "preview"), { recursive: true });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${html}</div>`;
  const page = k.pageHtml({ title: "Acrylic slice model", theme, body, script: kitScript() + "\n" + bundle, width: 650 });
  writeFileSync(join(HERE, "preview", theme === "light" ? `${SLUG}-light.html` : `${SLUG}.html`), page);
}
// What ships: the live layer as Vite bundles it, with the shared kit left out.
const live = buildSync({ entryPoints: [join(HERE, "live.js")], bundle: true, format: "esm", write: false, external: ["../kit/*"] }).outputFiles[0].text.length;
const shipped = buildSync({ entryPoints: [join(HERE, "live.js")], bundle: true, format: "esm", minify: true, write: false, external: ["../kit/*"] }).outputFiles[0].text.length;
const own = ["live.js", "parts.mjs", "world.mjs"].map((f) => readFileSync(join(HERE, f), "utf8").length).reduce((a, b) => a + b, 0);
const solids = R.items.filter((item) => !item.route).length;
console.log(`wrote preview/${SLUG}.html, preview/${SLUG}-light.html · static ${(html.length / 1024).toFixed(1)} KB · live ${(live / 1024).toFixed(1)} KB bundled without the kit (${(shipped / 1024).toFixed(1)} KB minified; own sources ${(own / 1024).toFixed(1)} KB) · ${solids} items, ${R.solids.length} recorded solids · ${cables} cables and fibres · ${R.settled.states.length} depth states · ${R.settled.solved.dropped.length} dropped rules`);

// The posts are drawn whole behind their hubs; each hub carries a stub of post above it, so the picture is right where the
// post rises out of a hub. The ray-caster sees the post in front of the hub's back rim there, so those pairs are excused.
// A plate's tabs end on its collars' round faces, edge to edge at one depth, so the ray-caster finds under a pixel either way
// along that seam; those pairs are excused too.
const hubOf = (side) => (name) => new RegExp(`^stack\\.hub\\d\\.${side}$`).test(name);
const plate = (name) => /^stack\.plate\d$/.test(name);
const hub = (name) => /^stack\.hub\d\.\d$/.test(name);
A.auditOrExit(R, P, { allow: [["stack.post0", hubOf(0)], ["stack.post1", hubOf(1)], [plate, hub]] });
