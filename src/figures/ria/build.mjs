// Fig 21 build: settles the painter's order over the carriage's whole travel (order.mjs), writes the standalone
// previews and, with --audit, proves the geometry.
//   node build.mjs           previews in preview/ (+ -flat pages with every <use> inlined, for scripts/lines.mjs)
//   node build.mjs --audit   + the kit audit with the carriage at nine points of its travel
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { build } from "./parts.mjs";
import { P } from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "ria";
const auditing = process.argv.includes("--audit");
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

const shapeOf = (d, meta) => {
  const [kind, ...a] = d;
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], meta, 3);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], meta);
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], meta);
  if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], meta);
  if (kind === "solid") return A.solid(a[0], a[1], meta);
  if (kind === "ball") return A.ball(a[0], a[1], meta);
  throw new Error(kind);
};

// every item with its true shapes; carriage items carry piece "car" and its travel as their move
function record() {
  const { items } = build();
  const R = A.recorder(P);
  for (const item of items) {
    const shapes = item.shapes.map((d, j) => R.solid(shapeOf(d, { name: j ? `${item.name}#${j}` : item.name, owner: item.name })));
    R.put({ name: item.name, at: item.at, svg: item.svg, shapes, piece: item.piece || "", move: item.move || [0, 0, 0] });
  }
  return R;
}

// ------------------------------------------------------------ painter's order, one order for every carriage position
const R = record();
const STATES = Array.from({ length: 9 }, (_, i) => ({ label: `carriage ${(i / 8).toFixed(3)}`, shares: { car: i / 8 } }));
const overlaps = A.overlapsOf(R.items, P, { states: STATES, skip: A.sameRun });
for (const item of R.items) item.move = [0, 0, 0]; // keys stay fixed as the carriage moves (shapes keep their move)
const solved = A.orderKeys(R.items, overlaps);
R.items.forEach((item, i) => (item.key = solved.keys[i]));
R.settled = { items: R.items, overlaps, solved, states: STATES };
const ORDER = [...R.items].sort((a, b) => a.key - b.key).map((item) => item.name);
writeFileSync(join(HERE, "order.mjs"), `// Painter's order, written by build.mjs from the audit's measured depths over the carriage's travel. Back to front.\nexport const ORDER = ${JSON.stringify(ORDER)};\n`);

// ------------------------------------------------------------ previews
const { render } = await import(pathToFileURL(join(HERE, "art.mjs")).href + `?v=${Date.now()}`);
const { html } = render();
const flat = render({ flat: true }).html;
const css = readFileSync(join(HERE, "figure.css"), "utf8");
mkdirSync(join(HERE, "preview"), { recursive: true });
const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const bundle = execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=RiaLive", "--target=es2020", "--log-level=warning"], { encoding: "utf8" });
const liveSize = Buffer.byteLength(readFileSync(join(HERE, "live.js")));
const ownSize = ["live.js", "model.mjs", "rig.mjs", "data.mjs"].reduce((sum, f) => sum + Buffer.byteLength(readFileSync(join(HERE, f))), 0);
for (const [markup, suffix] of [[html, ""], [flat, "-flat"]])
  for (const theme of ["dark", "light"]) {
    const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}" data-theme="${theme}">${markup}</div>`;
    const script = `${kitScript()}\n${bundle}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) RiaLive.mount(el);\n`;
    writeFileSync(join(HERE, "preview", `${SLUG}${suffix}${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Cylinder proof press", theme, body, script, width: 650 }));
  }
const count = (markup, re) => (markup.match(re) || []).length;
console.log(
  `wrote preview/${SLUG}.html and -light.html (+ -flat) · static ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB · ${count(html, /<path/g)} paths, ${count(html, /<use /g)} placements · ${count(flat, /class="iso-solid/g)} solids placed · ${R.items.length} items · live.js ${(liveSize / 1024).toFixed(1)} KB (with model, rig, data ${(ownSize / 1024).toFixed(1)} KB)`,
);

// ------------------------------------------------------------ audit over the carriage's travel
if (auditing) {
  const result = A.audit(R, P, { frames: STATES, apart: false, cover: ["car.gripper.back", "car.gripper.front"] });
  result.depth = A.depthOrder(R.items, P, { overlaps, solved, rest: STATES });
  console.log(A.report(result));
  console.log(`audit · ${R.solids.length} solids · ${R.items.length} items · ${STATES.length} carriage states · ${overlaps.pairs.length} overlaps · ${solved.rules} order rules`);
  const n = A.failures(result);
  console.log(n ? `audit failed: ${n} problem${n === 1 ? "" : "s"}` : "audit passed");
  if (n) process.exitCode = 1;
}
