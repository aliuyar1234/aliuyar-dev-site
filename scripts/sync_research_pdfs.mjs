#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const RESEARCH_PATH = resolve("src/content/research.json");
const PAPERS_DIR = resolve("public/papers");

function runGhJson(args) {
  const raw = execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024
  });
  return JSON.parse(raw);
}

function parseRepo(url = "") {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function encodePath(path) {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function scorePdfPath(path) {
  const p = path.toLowerCase();
  const filename = p.split("/").pop() || "";
  let score = 0;
  if (filename === "main.pdf") score += 120;
  if (filename === "paper.pdf") score += 120;
  if (filename.includes("preprint")) score += 90;
  if (filename.includes("manuscript")) score += 80;
  if (filename.includes("camera-ready")) score += 60;
  if (p.includes("paper")) score += 45;
  if (p.includes("preprint")) score += 40;
  if (p.includes("manuscript")) score += 35;
  if (p.includes("arxiv")) score += 25;
  if (p.startsWith("docs/")) score += 10;
  if (p.startsWith("paper/")) score += 12;
  if (p.includes("/fig/") || p.includes("/figures/") || p.includes("/figs/") || p.includes("/figs_")) score -= 120;
  if (filename.startsWith("fig_") || filename.startsWith("figure_")) score -= 100;
  if (/^f\d+_/.test(filename)) score -= 90;
  if (p.includes("slides")) score -= 30;
  if (p.includes("poster")) score -= 25;
  return score;
}

function bestPdfFromTree(treeItems) {
  const pdfs = treeItems
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".pdf"))
    .map((item) => ({ ...item, score: scorePdfPath(item.path) }))
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length);

  if (!pdfs[0] || pdfs[0].score <= 0) return null;
  return pdfs[0];
}

function fetchRepoPdf(owner, repo) {
  const repoInfo = runGhJson(["api", `repos/${owner}/${repo}`]);
  const branch = repoInfo.default_branch || "main";

  const tree = runGhJson(["api", `repos/${owner}/${repo}/git/trees/${branch}?recursive=1`]);
  const candidate = bestPdfFromTree(tree.tree || []);
  if (!candidate) {
    return null;
  }

  const fileJson = runGhJson(["api", `repos/${owner}/${repo}/contents/${encodePath(candidate.path)}?ref=${encodeURIComponent(branch)}`]);
  if (!fileJson.content) {
    return null;
  }

  const rawBase64 = String(fileJson.content).replace(/\n/g, "");
  const bytes = Buffer.from(rawBase64, "base64");

  return {
    branch,
    path: candidate.path,
    bytes
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "paper";
}

function main() {
  const raw = readFileSync(RESEARCH_PATH, "utf8").replace(/^\uFEFF/, "");
  const research = JSON.parse(raw);
  mkdirSync(PAPERS_DIR, { recursive: true });

  let updatedCount = 0;

  const next = research.map((entry) => {
    const { pdfSourceRepoPath: _removed, ...baseEntry } = entry;
    const repo = parseRepo(entry.codeUrl) || parseRepo(entry.paperUrl);
    if (!repo) {
      console.log(`[skip] ${entry.title}: no GitHub repo URL`);
      return baseEntry;
    }

    try {
      const found = fetchRepoPdf(repo.owner, repo.repo);
      if (!found) {
        console.log(`[skip] ${entry.title}: no PDF found in ${repo.owner}/${repo.repo}`);
        return baseEntry;
      }

      const filename = `${slugify(entry.title)}.pdf`;
      const targetPath = resolve(PAPERS_DIR, filename);
      writeFileSync(targetPath, found.bytes);

      updatedCount += 1;
      console.log(`[ok] ${entry.title}: ${repo.owner}/${repo.repo}/${found.path} -> public/papers/${filename}`);

      return {
        ...baseEntry,
        pdfUrl: `/papers/${basename(targetPath)}`
      };
    } catch (error) {
      console.log(`[skip] ${entry.title}: ${String(error.message || error)}`);
      return baseEntry;
    }
  });

  writeFileSync(RESEARCH_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Updated ${updatedCount} paper PDF link(s).`);
}

main();
