// Standalone preview pages for Fig 12, the truth check and the geometry audit.
//   node build.mjs            writes preview/signed-intervention-geometry.html and -light.html
//   node build.mjs --audit    also proves the geometry in every resting and moving pose
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { render, compose, poseOf, REST } from "./art.mjs";
import { shapesOf } from "./parts.mjs";
import * as S from "./scene.mjs";
import { GENES, TOTALS, LOCKED, angleOf, ruleOf, ringOf, massesOf, RING_K } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..", "..");
const SLUG = "signed-intervention-geometry";
const { kitScript } = await import(join(homedir(), ".claude/skills/anatomy/scripts/inline-kit.mjs"));

// Truth: the totals reproduce every printed share, and every gene's printed label is the
// one its row carries (the rule's own verdict where the bootstrap kept it).
{
  const r = TOTALS.regimes;
  const sum = r.ambiguous + r.asymmetric_CRISPR + r.asymmetric_ORF + r.inactive;
  if (sum !== TOTALS.pairs) throw new Error(`truth: regimes sum to ${sum}, not ${TOTALS.pairs}`);
  const pct = (n) => Math.round((1000 * n) / TOTALS.pairs) / 10;
  if (pct(r.ambiguous) !== 48.9 || pct(r.asymmetric_CRISPR) !== 30.3 || pct(r.asymmetric_ORF) !== 20.8) throw new Error("truth: shares drift from §3.1");
  for (const g of GENES) {
    if (g.label === "inactive" || g.label === "ambiguous") continue;
    if (ruleOf(g.z, g.delta) !== g.label) throw new Error(`truth: ${g.symbol} rule ${ruleOf(g.z, g.delta)} vs label ${g.label}`);
  }
  for (const g of GENES) if (Math.abs(angleOf(g.z) - (90 - 20 * g.z)) > 1e-9) throw new Error(`truth: ${g.symbol} angle clamped`);
  // the settled ring lies on the loaded string, RING_K units per mass, inside the cap
  for (const g of GENES) {
    const phi = [S.FRONT + angleOf(g.z) / 2, S.FRONT - angleOf(g.z) / 2];
    const m = massesOf(g);
    const [x, y] = ringOf(phi, m);
    const side = m[0] > 0 ? 0 : 1;
    const along = x * Math.cos(phi[side] * S.DEG) + y * Math.sin(phi[side] * S.DEG);
    const across = -x * Math.sin(phi[side] * S.DEG) + y * Math.cos(phi[side] * S.DEG);
    const want = g.label === "inactive" ? 0 : Math.min(10, RING_K * Math.abs(g.delta));
    if (Math.abs(along - want) > 1e-9 || Math.abs(across) > 1e-9) throw new Error(`truth: ${g.symbol} ring off its string`);
  }
  if (LOCKED.bootstraps !== 200 || LOCKED.consensus !== 0.7 || LOCKED.signZ !== 1.96 || LOCKED.asymmetry !== 1) throw new Error("truth: locked thresholds drift");
  console.log(`truth: ${GENES.length} genes from figure2_regime_map.csv, totals sum to ${TOTALS.pairs}, shares 48.9/30.3/20.8, no angle clamped`);
}

const esbuild = join(SITE, "node_modules", ".bin", "esbuild");
const live = `${execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=iife", "--global-name=SignedGeometry", "--log-level=warning"], { encoding: "utf8" })}\nfor (const el of document.querySelectorAll('[data-fig="${SLUG}"]')) SignedGeometry.mount(el);\n`;
const css = existsSync(join(HERE, "figure.css")) ? readFileSync(join(HERE, "figure.css"), "utf8") : "";
const { html } = render();
mkdirSync(join(HERE, "preview"), { recursive: true });
for (const theme of ["dark", "light"]) {
  const body = `<style>${css}</style><div class="iso fig fig-${SLUG}" data-fig="${SLUG}"${theme === "light" ? ' data-theme="light"' : ""}>${html}</div>`;
  const page = k.pageHtml({ title: "Gene force table", theme, body, script: kitScript() + "\n" + live });
  writeFileSync(join(HERE, "preview", theme === "light" ? `${SLUG}-light.html` : `${SLUG}.html`), page);
}
const size = (args) => execFileSync(esbuild, [join(HERE, "live.js"), "--bundle", "--format=esm", "--external:../kit/*", "--log-level=warning", ...args], { encoding: "utf8" }).length;
const solids = (html.match(/class="iso-solid"/g) || []).length;
console.log(`wrote preview pages · static markup ${(html.length / 1024).toFixed(1)} KB · live code without the kit ${(size([]) / 1024).toFixed(1)} KB (${(size(["--minify"]) / 1024).toFixed(1)} KB minified) · ${solids} solids in the rest pose`);

if (process.argv.includes("--audit")) {
  const AUDIT = { ...A, shapes: shapesOf(A) };
  const g = (symbol) => GENES.find((gene) => gene.symbol === symbol);
  // a pulley moved by hand with the pin out: the ring follows the loaded string
  const hand = (gene, phi, out = true) => ({ ...poseOf(gene, { drop: out ? S.PIN.travel : 0, settled: 0 }), phi, ring: out ? ringOf(phi, massesOf(gene)) : [0, 0] });
  const poses = [
    ["rest: AKT3 settled", REST],
    ["AKT3, pin in", poseOf(g("AKT3"), { drop: 0, settled: 0 })],
    ["AKT3, pin cap passing the ring", poseOf(g("AKT3"), { drop: S.PIN.travel - 0.8, settled: 0 })],
    ["AKT3, pin halfway down", poseOf(g("AKT3"), { drop: S.PIN.travel / 2, settled: 0 })],
    ["FOS settled", poseOf(g("FOS"))],
    ["NAT2 settled", poseOf(g("NAT2"))],
    ["CCND1 settled (narrowest strings)", poseOf(g("CCND1"))],
    ["KRAS settled", poseOf(g("KRAS"))],
    ["DHFR settled (widest strings)", poseOf(g("DHFR"))],
    ["ASGR1, empty hangers", poseOf(g("ASGR1"))],
    ["by hand: ORF pulley dragged to the back", hand(g("NAT2"), [S.FRONT + 160, S.FRONT - 51])],
    ["by hand: ORF pulley at the left side", hand(g("FOS"), [S.FRONT + 92, S.FRONT - 37])],
    ["by hand: both pulleys near the front", hand(g("KRAS"), [S.FRONT + 6, S.FRONT - 8], false)],
    ["by hand: CRISPR pulley at the right side", hand(g("AKT3"), [S.FRONT + 57, S.FRONT - 95])],
    ["AKT3 overshooting while it settles", poseOf(g("AKT3"), { settled: 1.1 })],
    ["AKT3, ring reeled halfway in", poseOf(g("AKT3"), { settled: 0.5 })],
    ["AKT3, pin rising through the ring", poseOf(g("AKT3"), { drop: S.PIN.travel / 2, settled: 0.03 })],
    ["CCND1, a mass sliding on, still on the stem", poseOf(g("CCND1"), { drop: 0, settled: 0, masses: [3, 0], tr: [{ h: S.MASS.h, slide: 2.4, lift: 0.3 }, null] })],
    ["CCND1, a mass sliding on, clear of the stem", poseOf(g("CCND1"), { drop: 0, settled: 0, masses: [3, 0], tr: [{ h: S.MASS.h, slide: 6.5, lift: 0.3 }, null] })],
    ["AKT3, the part mass coming off", poseOf(g("AKT3"), { drop: 0, settled: 0, masses: [0, 8], tr: [null, { h: S.heightOf(0.246), slide: 1.2, lift: 0.3 }] })],
    ["DHFR, a mass coming off", poseOf(g("DHFR"), { drop: 0, settled: 0, masses: [0, 2], tr: [null, { h: S.MASS.h, slide: 4, lift: 0.3 }] })],
  ];
  // by hand: each pulley dragged all the way round the rim, the other one held, pin out
  for (let step = 0; step < 24; step++) {
    const sweep = S.FRONT + 15 * step;
    poses.push([`by hand: ORF pulley at ${15 * step}° round the rim`, hand(g(step % 2 ? "CCND1" : "AKT3"), [sweep, S.FRONT - 150 + 15 * step + (step % 2 ? 0 : 7)])]);
  }
  let total = 0;
  for (const [label, pose] of poses) {
    const items = compose(pose, AUDIT);
    const R = A.recorder(S.P);
    items.filter((item) => item.shapes && item.shapes.length).forEach((item, index) => R.put({ name: item.name, key: index, svg: item.svg, shapes: item.shapes.map((shape) => R.solid(shape)) }));
    const overlaps = A.overlapsOf(R.items, S.P, { states: [0] });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((item) => item.key), rules: 0, dropped: [] }, states: [0] };
    // pin-lo is clipped to the ring's hole opening, which hides exactly what the ring's body
    // hides; the audit cannot see a clip
    const result = A.audit(R, S.P, { frames: [], apart: false, allow: [["pin-lo", "ring"]] });
    const count = A.failures(result);
    total += count;
    console.log(`\n— pose: ${label}`);
    console.log(A.report(result));
    console.log(`${R.solids.length} solids · ${R.items.length} items · ${overlaps.pairs.length} overlaps · ${count ? `${count} problem${count === 1 ? "" : "s"}` : "clean"}`);
  }
  console.log(total ? `\naudit failed: ${total} problem${total === 1 ? "" : "s"}` : "\naudit passed");
  if (total) process.exitCode = 1;
}
