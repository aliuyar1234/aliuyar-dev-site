import research from "../content/research.json";

export type ThemeKey = "evaluation" | "agents" | "repair" | "interpretability" | "beyond";

export interface Paper {
  slug: string;
  title: string;
  short: string;
  theme: ThemeKey;
  featured: boolean;
  finding: string;
  summary: string;
  abstract: string;
  whyItMatters: string;
  date: string;
  result: string;
  doi: string;
  pdfUrl: string;
  codeUrl: string;
  tags: string[];
  contribution?: string;
  headline?: string | null;
  methods?: string[];
  models?: string[];
  setup?: string;
}

export const THEMES: { key: ThemeKey; name: string; blurb: string }[] = [
  {
    key: "evaluation",
    name: "Evaluation and verification",
    blurb: "Tests for whether a judge, a verifier or an interpretability claim measures what it says it measures.",
  },
  {
    key: "agents",
    name: "Agent safety and security",
    blurb: "Agents that act, remember and learn from their own data, and how to recover when an attacker gets in.",
  },
  {
    key: "repair",
    name: "Repairing frozen models",
    blurb: "Changing what a deployed model does without retraining it, and showing that the change holds.",
  },
  {
    key: "interpretability",
    name: "Inside the model",
    blurb: "Probes, diffs and cascades: what the internals carry, and how much of the clean story survives a held-out test.",
  },
  {
    key: "beyond",
    name: "Beyond language models",
    blurb: "The same locked-analysis discipline, applied to cell biology.",
  },
];

export const papers = research as Paper[];

export const themeOf = (key: ThemeKey) => THEMES.find((t) => t.key === key)!;
export const byTheme = (key: ThemeKey) => papers.filter((p) => p.theme === key);
export const featured = papers.filter((p) => p.featured);
// Papers that have an anatomy figure in src/figures/<slug>/.
const FIGURES: Record<string, string> = {
  "criterion-fidelity-in-llm-judges": "criterion-fidelity",
  "selective-revocation-and-replay": "selective-revocation",
  certipatch: "certipatch",
};
// Method index: every method used in at least two papers, most-used first.
export function methodIndex() {
  const map = new Map<string, Paper[]>();
  for (const p of papers) for (const m of p.methods ?? []) {
    const key = m.trim();
    map.set(key, [...(map.get(key) ?? []), p]);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}
export const figureFor = (p: Paper) => FIGURES[p.slug];
export const doiUrl = (p: Paper) => (p.doi ? `https://doi.org/${p.doi}` : "");

export function bibtex(p: Paper) {
  const key = `uyar${p.date.slice(0, 4)}${p.slug.split("-")[0]}`;
  const lines = [
    `@misc{${key},`,
    `  title     = {${p.title}},`,
    `  author    = {Uyar, Ali},`,
    `  year      = {${p.date.slice(0, 4)}},`,
    p.doi ? `  doi       = {${p.doi}},` : "",
    p.doi ? `  publisher = {Zenodo},` : "",
    `  url       = {${p.doi ? doiUrl(p) : `https://aliuyar.dev/research/${p.slug}/`}}`,
    `}`,
  ];
  return lines.filter(Boolean).join("\n");
}
