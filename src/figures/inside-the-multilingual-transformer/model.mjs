// Fig 6 model: every number the patch bay shows, taken from data.mjs (the paper's tables and its vector figures).
// Pure ESM, no Node APIs. art.mjs reads it at build time and hands the compact tables to live.js in a data attribute.
import { paper, tests, reverseTests, winners, decoded, headline, cohorts } from "./data.mjs";
import { STATES, METERS, POOLED } from "./labels.mjs";
export * from "./labels.mjs";

// Δz = z(shared) − z(specific) at one tap, mean over both encoders, all three cohorts and both hemispheres (paper Fig. 3)
export const PROFILE = METERS.map(({ roi }) => STATES.map((state) => decoded.depthProfiles[roi][state].slice()));
export const deltaAt = (meter, block, state) => PROFILE[meter][state][block];

// the six model × cohort cells the selector picks
export const MODELS = [
  { id: "xlmr", name: "XLM-R" },
  { id: "nllb", name: "NLLB" },
];
export const LANGS = ["EN", "FR", "ZH"];
const testOf = (model, lang, hyp) => tests.find((t) => t.model === model && t.lang === lang && t.hyp === hyp);
const winnerOf = (model, lang, family) => winners.find((w) => w.model === model && w.lang === lang && w.family === family);
const tapOf = (w) => [w.block, STATES.indexOf(w.state)];
const CELL6 = MODELS.flatMap((m, mi) =>
  LANGS.map((lang, li) => {
    const h1 = testOf(m.id, lang, "H1");
    const h2 = testOf(m.id, lang, "H2");
    const rev = reverseTests.find((t) => t.model === m.id && t.lang === lang);
    return {
      model: mi,
      lang: li,
      name: `${m.name} ${lang}`,
      n: h1.n,
      // the centre-zero meters read attention-side minus FFN-side Δz (12 blocks, family mean, subject mean):
      // semantic = −H1 (H1 is planned FFN-side minus attention-side), auditory = H2 (planned attention-side minus FFN-side)
      semantic: { value: -h1.effect, ci: [-h1.ci[1], -h1.ci[0]], planned: -1, effect: h1.effect, pHolm: h1.pHolm, reverseP: rev.pHolm },
      auditory: { value: h2.effect, ci: h2.ci, planned: 1, effect: h2.effect, pHolm: h2.pHolm },
      // the lamp grids: auditory lights for the pre-specified H2 test (Holm over 12), semantic for the post hoc
      // attention-side test (paper Table B.4, Holm over the 6 semantic cells)
      lamps: { semantic: rev.pHolm < 0.05, auditory: h2.holmSig },
      // representative winners (Table B.5): the tap with the largest family-mean Δz in this cell
      winners: { semantic: [tapOf(winnerOf(m.id, lang, "SEMANTIC"))], auditory: [tapOf(winnerOf(m.id, lang, "AUDITORY"))] },
    };
  }),
);
// the seventh position (toggle centred, knob on all): the paper's six-cell means, which carry no CI, and every cell's winners
const union = (family) => [...new Map(CELL6.flatMap((c) => c.winners[family]).map((t) => [t.join("-"), t])).values()];
const POOLED_CELL = {
  model: 2,
  lang: 3,
  name: "6-cell mean",
  n: paper.participants,
  semantic: { value: -headline.h1.meanEffect, ci: null, planned: -1 },
  auditory: { value: headline.h2.meanEffect, ci: null, planned: 1 },
  winners: { semantic: union("semantic"), auditory: union("auditory") },
};
export const CELLS = [...CELL6, POOLED_CELL];

// the card level windows: per block and state, the mean Δz of the four encoding meters (paper Fig. 3 curves, pooled)
export const LEVELS = Array.from({ length: 12 }, (_, b) => STATES.map((_, s) => PROFILE.reduce((sum, m) => sum + m[s][b], 0) / PROFILE.length));

// the idle tour: from the pooled position the cord walks taps that show depth and state, then the selector steps
// through the six cells and back to the mean
const tap = (block, state) => ({ kind: "tap", block, state: STATES.indexOf(state) });
const cell = (index) => ({ kind: "cell", cell: index });
export const TOUR = [
  { ...cell(POOLED), hold: 1.2 },
  { ...tap(2, "POST_ATTN"), hold: 2.4 },
  { ...tap(5, "POST_ATTN"), hold: 2.2 },
  { ...tap(8, "POST_ATTN"), hold: 2.2 },
  { ...tap(8, "FFN"), hold: 2.6 },
  { ...tap(8, "ATTN"), hold: 2.6 },
  { ...tap(10, "OUTPUT"), hold: 2.2 },
  { ...tap(10, "FFN"), hold: 2.6 },
  { ...tap(10, "POST_ATTN"), hold: 2.4 },
  { ...tap(11, "ATTN"), hold: 2.6 },
  { ...cell(0), hold: 2.8 },
  { ...cell(1), hold: 2.8 },
  { ...cell(2), hold: 2.8 },
  { ...cell(5), hold: 2.8 },
  { ...cell(4), hold: 2.8 },
  { ...cell(3), hold: 2.8 },
  { ...cell(POOLED), hold: 2.6 },
  { ...tap(9, "POST_ATTN"), hold: 2.4 },
];
export const REST = { block: 9, state: 1, cell: POOLED };

// counts the caption and TRUTH.md quote
export const FACTS = {
  participants: paper.participants,
  cohorts: Object.fromEntries(cohorts.map((c) => [c.lang, c.n])),
  runs: paper.runsPerCohort,
  triplets: paper.alignedTriplets,
  h1Mean: headline.h1.meanEffect,
  h2Mean: headline.h2.meanEffect,
  h2Positive: headline.h2.positive,
  h2HolmSig: headline.h2.holmSig,
  winnerStates: headline.winners,
};

// the compact tables live.js needs, in one JSON attribute
export function liveTables() {
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const fam = (f) => ({ ...f, value: round(f.value), ci: f.ci && f.ci.map(round), effect: f.effect === undefined ? undefined : round(f.effect) });
  return {
    profile: PROFILE.map((m) => m.map((row) => row.map(round))),
    cells: CELLS.map((c) => ({ model: c.model, lang: c.lang, name: c.name, n: c.n, semantic: fam(c.semantic), auditory: fam(c.auditory), winners: c.winners })),
    tour: TOUR,
    rest: REST,
  };
}
