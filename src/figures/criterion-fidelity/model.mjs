// The measured behaviour behind Fig 2. Every number is from "When Accuracy Hides Path
// Dependence: Criterion Fidelity in LLM Judges", BioRubric frozen test split, n = 600
// criterion families. TRUTH.md lists the source of each value; build.mjs re-derives
// every count from the paper's printed three-decimal values and fails if one drifts.

export const N = 600;

// The shuttle's three stations. The two paraphrases ride in one holder because the
// paper reports them jointly (Inv@BC needs both right). side: the pan the card names
// as the winner (+1 = left pan, candidate c1; -1 = right pan, c2). variants index the
// order-disagreement columns below.
export const STATIONS = [
  { id: "base", label: "base card", side: 1, variants: [0] },
  { id: "pair", label: "paraphrase pair", side: 1, variants: [1, 2] },
  { id: "cf", label: "counterfactual", side: -1, variants: [3] },
];

// count: families out of 600. base = right on the base card (BaseAcc × 600); inv = right
// on base and both paraphrases (Inv@BC × base); sens = right on base and counterfactual
// (Sens@BC × base); gcf = right on all four (GCF × 600).
// order: variant-level OrderDisagreement for base, para 1 (lexical), para 2 (structural),
// counterfactual (tab:variant-order). first: share of order-specific verdicts that pick
// the first-shown candidate (tab:variant-order, First-pos).
export const JUDGES = [
  { id: "faithful", label: "Faithful reference", count: { base: 600, inv: 600, sens: 600, gcf: 600 }, order: [0, 0, 0, 0], first: 0.5 },
  { id: "llama-standard", label: "Llama-8B · standard", count: { base: 436, inv: 338, sens: 187, gcf: 130 }, order: [0.945, 0.932, 0.945, 0.958], first: 0.922 },
  { id: "qwen-standard", label: "Qwen-14B · standard", count: { base: 470, inv: 421, sens: 348, gcf: 299 }, order: [0.293, 0.158, 0.327, 0.388], first: 0.612 },
  { id: "llama-strict", label: "Llama-8B · strict", count: { base: 346, inv: 234, sens: 138, gcf: 79 }, order: [1, 0.997, 0.995, 0.998], first: 0.994 },
  { id: "qwen-strict", label: "Qwen-14B · strict", count: { base: 518, inv: 480, sens: 440, gcf: 402 }, order: [0.218, 0.145, 0.202, 0.247], first: 0.506 },
];

// The paper's rate for a station: BaseAcc over all 600 families; Inv@BC and Sens@BC over
// the families the judge gets right on the base card.
export function rateOf(judge, station) {
  const c = judge.count;
  return station.id === "base" ? c.base / N : (station.id === "pair" ? c.inv : c.sens) / c.base;
}

// Tongue rest, in units of full deflection (+1 = on the left stop): the station's rate on
// a scale whose centre is 50% and whose stop is 100%, toward the pan the card names.
export const leanOf = (judge, station) => station.side * (2 * rateOf(judge, station) - 1);

// The family register: four stacks, as shares of the 600 families.
export const stacksOf = (judge) => ["base", "inv", "sens", "gcf"].map((key) => judge.count[key] / N);

// Green while the station's rate is above 50%, red once it is not.
export const lampOf = (judge, station) => (rateOf(judge, station) > 0.5 ? "green" : "red");

const pct = (value) => (Math.abs(value - Math.round(value * 100) / 100) < 1e-9 ? `${Math.round(value * 100)}%` : `${(value * 100).toFixed(1)}%`);
const bare = (value) => pct(value).replace("%", "");

export function readoutOf(judge, station) {
  const c = judge.count;
  const head = `${judge.label} · ${station.label}`;
  const order = station.variants.map((v) => bare(judge.order[v])).join(" / ");
  const path = `OrderDis ${order}% · First-pos ${pct(judge.first)}`;
  if (station.id === "base") return [head, `BaseAcc ${pct(c.base / N)} · ${c.base} of ${N} · GCF ${c.gcf}`, path];
  const [name, hit] = station.id === "pair" ? ["Inv@BC", c.inv] : ["Sens@BC", c.sens];
  return [head, `${name} ${pct(hit / c.base)} · ${hit} of ${c.base} base-right`, path];
}

export const describeOf = (judge, station) => readoutOf(judge, station).join(". ").replace(/ · /g, ", ") + ".";

// The idle tour: every station for every measured judge, then the faithful reference.
export const TOUR = [1, 2, 3, 4, 0].flatMap((judge) => STATIONS.map((_, station) => ({ judge, station })));

// The paper's printed values, for build.mjs to re-derive the counts from.
export const PRINTED = {
  "llama-standard": { base: 0.727, gcf: 0.217, sens: 0.429, inv: 0.775 },
  "qwen-standard": { base: 0.783, gcf: 0.498, sens: 0.74, inv: 0.896 },
  "llama-strict": { base: 0.577, gcf: 0.132, dSens: -0.03, dInv: -0.099, of: "llama-standard" },
  "qwen-strict": { base: 0.863, gcf: 0.67, dSens: 0.109, dInv: 0.031, of: "qwen-standard" },
};
