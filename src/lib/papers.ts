import research from "../content/research.json";

export type ThemeKey = "evaluation" | "agents" | "repair" | "interpretability" | "beyond";

export interface Paper {
  slug: string;
  title: string;
  short: string;
  theme: ThemeKey;
  featured: boolean;
  date: string;
  finding: string;
  contribution: string;
  headline?: string;
  abstract: string;
  whyItMatters: string;
  setup: string;
  methods: string[];
  models: string[];
  doi: string;
  pdfUrl: string;
  codeUrl: string;
  tags: string[];
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
// Method families that recur across papers, curated from each paper's methods.
export const METHODS: { name: string; slugs: string[] }[] = [
  { name: "Counterfactual tests", slugs: ["criterion-fidelity-in-llm-judges", "outcome-is-not-verification", "binary-evidence-sufficiency", "first-unsafe-step-dpo"] },
  { name: "Linear and low-rank probes", slugs: ["binary-evidence-sufficiency", "outcome-is-not-verification", "proberoute"] },
  { name: "Causal interventions and patching", slugs: ["scrubid", "what-survives-control-calibration", "same-size-capability-transfer", "surgical-post-training-diffing"] },
  { name: "Sparse modules and masks", slugs: ["same-size-capability-transfer", "surgical-post-training-diffing", "proberoute"] },
  { name: "Low-rank adapters", slugs: ["soar", "certipatch", "discover-then-distill", "first-unsafe-step-dpo", "cis-technical-report"] },
  { name: "Self-distillation", slugs: ["cachemedic", "discover-then-distill", "robust-discover-distill", "cis-technical-report"] },
  { name: "Preference and reward learning", slugs: ["first-unsafe-step-dpo", "discover-then-distill", "cis-technical-report"] },
  { name: "Attacks and corruption", slugs: ["selective-revocation-and-replay", "robust-discover-distill", "cachemedic", "ria"] },
  { name: "Provenance, replay and certificates", slugs: ["selective-revocation-and-replay", "certipatch", "ria", "cis-technical-report"] },
  { name: "Null calibration and resampling", slugs: ["language-neutral-or-language-specific", "surgical-post-training-diffing", "what-survives-control-calibration", "discover-then-distill", "signed-intervention-geometry", "avalanchellm"] },
  { name: "Brain encoding models", slugs: ["inside-the-multilingual-transformer", "language-neutral-or-language-specific"] },
];
export const paperBySlug = (slug: string) => papers.find((p) => p.slug === slug)!;
export const methodsOf = (p: Paper) => METHODS.filter((m) => m.slugs.includes(p.slug));
// Anatomy plates live in src/figures/<paper slug>/; two use shorter folder names.
const PLATES = new Set(Object.keys(import.meta.glob("../figures/*/Figure.astro")).map((k) => k.split("/")[2]));
const FOLDERS: Record<string, string> = {
  "criterion-fidelity-in-llm-judges": "criterion-fidelity",
  "selective-revocation-and-replay": "selective-revocation",
};
export const figureFor = (p: Paper) => {
  const folder = FOLDERS[p.slug] ?? p.slug;
  return PLATES.has(folder) ? folder : undefined;
};
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
