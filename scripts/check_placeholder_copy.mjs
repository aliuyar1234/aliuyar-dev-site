import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SEARCH_ROOTS = ["src/pages", "src/components", "src/content"];
const ALLOWED_EXTENSIONS = new Set([".astro", ".json", ".md", ".mdx"]);
const BLOCKED_PHRASES = [
  "Place your final CV PDF",
  "Project details available in repository.",
  "Product and engineering projects only. Research work is now separated on the Research page."
];

const collectFiles = (root) => {
  const files = [];
  const entries = readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (!entry.isFile() || !ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
};

const findings = [];

for (const root of SEARCH_ROOTS) {
  const rootStats = statSync(root, { throwIfNoEntry: false });
  if (!rootStats || !rootStats.isDirectory()) {
    continue;
  }

  const files = collectFiles(root);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const phrase of BLOCKED_PHRASES) {
        if (!line.includes(phrase)) {
          continue;
        }

        findings.push({
          file: relative(process.cwd(), file),
          line: index + 1,
          phrase
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Blocked placeholder or dev-note copy detected:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} contains "${finding.phrase}"`);
  }
  process.exit(1);
}

console.log("Copy guard passed: no blocked placeholder/dev-note phrases found.");
