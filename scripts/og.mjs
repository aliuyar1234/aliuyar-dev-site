#!/usr/bin/env node
// Renders the 1200x630 Open Graph images into public/og/ with headless Chrome.
// Run after content or figure changes: npm run og
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "og");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONT = pathToFileURL(join(ROOT, "node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2"));
const ISO_CSS = readFileSync(join(ROOT, "src/figures/kit/iso.css"), "utf8");

const research = JSON.parse(readFileSync(join(ROOT, "src/content/research.json"), "utf8"));
const writing = JSON.parse(readFileSync(join(ROOT, "src/content/writing.json"), "utf8"));
const THEMES = { evaluation: "Evaluation and verification", agents: "Agent safety and security", repair: "Repairing frozen models", interpretability: "Inside the model", beyond: "Beyond language models" };
const FOLDERS = { "criterion-fidelity-in-llm-judges": "criterion-fidelity", "selective-revocation-and-replay": "selective-revocation" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function figureSvg(slug) {
  if (!slug) return "";
  const art = join(ROOT, "src/figures", slug, "art.mjs");
  if (!existsSync(art)) return "";
  const { render } = await import(pathToFileURL(art));
  const html = render().html;
  return html.match(/<svg[\s\S]*<\/svg>/)?.[0] ?? "";
}

function page({ kicker, title, foot, figure, size }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Mona;src:url(${FONT}) format("woff2");font-weight:200 900;font-stretch:75% 125%}
${ISO_CSS}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;background:#0b0b0b;overflow:hidden}
body{font-family:Mona,sans-serif;color:#a6a6a6;display:grid;grid-template-columns:${figure ? "640px 1fr" : "1fr"};padding:64px 72px;gap:24px}
.text{display:flex;flex-direction:column;justify-content:space-between;height:100%}
.mark{color:#ededed;font-size:28px;font-weight:680;font-stretch:118%}
.kicker{font-size:24px;margin-bottom:22px}
h1{color:#ededed;font-size:${size}px;line-height:1.04;font-weight:620;font-stretch:110%;letter-spacing:-0.025em}
.foot{font-size:24px}
.fig{display:grid;place-items:center;margin:-40px -48px -40px 0}
.fig svg{width:520px;height:auto}
</style></head><body class="iso"><div class="text"><div class="mark">Ali Uyar</div><div><p class="kicker">${esc(kicker)}</p><h1>${esc(title)}</h1></div><p class="foot">${esc(foot)}</p></div>${figure ? `<div class="fig">${figure}</div>` : ""}</body></html>`;
}

const fit = (title, figure) => {
  const n = title.length;
  if (figure) return n > 90 ? 40 : n > 60 ? 46 : 56;
  return n > 110 ? 50 : n > 70 ? 58 : 72;
};

const jobs = [];
const hero = await figureSvg("hero");
jobs.push({ out: "default.png", kicker: "AI alignment, security and evaluation", title: "I make AI decisions auditable.", foot: "aliuyar.dev", figure: hero });
jobs.push({ out: "research.png", kicker: `${research.length} papers`, title: "Research on when an AI system's decisions can be trusted.", foot: "aliuyar.dev/research", figure: "" });
for (const p of research) {
  const figure = await figureSvg(FOLDERS[p.slug] ?? p.slug);
  jobs.push({ out: `research/${p.slug}.png`, kicker: THEMES[p.theme], title: p.title, foot: "aliuyar.dev/research", figure });
}
for (const a of writing) jobs.push({ out: `articles/${a.slug}.png`, kicker: "Writing", title: a.title, foot: "aliuyar.dev/articles", figure: "" });

const tmp = mkdtempSync(join(tmpdir(), "og-"));
for (const job of jobs) {
  const html = join(tmp, "page.html");
  writeFileSync(html, page({ ...job, size: fit(job.title, job.figure) }));
  const out = join(OUT, job.out);
  mkdirSync(join(out, ".."), { recursive: true });
  execFileSync(CHROME, ["--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=1500", `--screenshot=${out}`, pathToFileURL(html).href], { stdio: "ignore" });
  console.log("og", job.out);
}
rmSync(tmp, { recursive: true, force: true });
