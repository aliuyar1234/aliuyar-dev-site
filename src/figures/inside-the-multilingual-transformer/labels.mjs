// Fig 6 labels and readout text: shared by model.mjs (build) and live.js (browser). No data, no Node APIs.
// the four retained states of every encoder block, in signal order (paper §5.2)
export const STATES = ["ATTN", "POST_ATTN", "FFN", "OUTPUT"];
export const STATE_LABEL = { ATTN: "attn", POST_ATTN: "post-attn", FFN: "ffn", OUTPUT: "output" };
export const BLOCKS = 12;

// the four encoding meters: the representative ROIs of paper Fig. 3, semantic pair then auditory pair
export const METERS = [
  { roi: "AG", short: "AG", family: "SEMANTIC" },
  { roi: "IFGtri", short: "IFGtri", family: "SEMANTIC" },
  { roi: "pSTG", short: "pSTG", family: "AUDITORY" },
  { roi: "Heschl", short: "HG", family: "AUDITORY" },
];

export const METER_MAX = 0.1; // meter scale 0 … 0.10 Δz
export const CONTRAST_MAX = 0.015; // centre-zero scale −0.015 … +0.015 Δz
export const POOLED = 6; // the seventh selector position: the mean of the six encoder × cohort cells

// readouts: short, from the same instant as the parts
const dz = (v) => v.toFixed(3).replace(/^0\./, ".").replace(/^-0\./, "−.");
const signed = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(4);
const pText = (p) => (p >= 1 ? "1" : String(p).replace(/^0\./, "."));
const tapName = (block, state) => `b${block} ${STATE_LABEL[STATES[state]]}`;
export function tapReadout(block, state, values) {
  return `${tapName(block, state)} · Δz ${METERS.map((m, i) => `${m.short} ${dz(values[i])}`).join(" ")}`;
}
// while the plug is in the air: the target tap, values pending
export const seatingReadout = (block, state) => `${tapName(block, state)} · Δz …`;
// the cell readout states what the centre-zero meters show: attention-side minus FFN-side Δz per family. "attn−FFN"
// abbreviates the paper's own label (Table B.4 "Attention-FFN effect"); capital FFN is the family, lowercase ffn the state
export function cellReadout(cell) {
  return `${cell.name} · attn−FFN Δz sem ${signed(cell.semantic.value)} aud ${signed(cell.auditory.value)}`;
}
const winnerText = (list) => list.map(([b, s]) => `block ${b} ${STATE_LABEL[STATES[s]]}`).join(", ");
export function tapText(block, state, values) {
  return `Patch cord in block ${block}, ${STATE_LABEL[STATES[state]]} state. Shared minus specific encoding advantage, pooled over both encoders and all three cohorts: ${METERS.map((m, i) => `${m.roi} ${values[i].toFixed(4)}`).join(", ")} Fisher-z.`;
}
export function cellText(cell) {
  const s = cell.semantic;
  const a = cell.auditory;
  if (!s.ci) return `Mean of the six encoder and cohort cells. Attention-side minus FFN-side: semantic ${s.value.toFixed(4)}, auditory ${a.value.toFixed(4)}. Winning taps: semantic ${winnerText(cell.winners.semantic)}; auditory ${winnerText(cell.winners.auditory)}.`;
  return `${cell.name} (n ${cell.n}). Semantic, attention-side minus FFN-side: ${s.value.toFixed(4)}, 95% CI ${s.ci[0].toFixed(4)} to ${s.ci[1].toFixed(4)}; pre-specified FFN-side test Holm p ${pText(s.pHolm)}, post hoc attention-side test Holm p ${s.reverseP}. Auditory, attention-side minus FFN-side: ${a.value.toFixed(4)}, 95% CI ${a.ci[0].toFixed(4)} to ${a.ci[1].toFixed(4)}, pre-specified test Holm p ${pText(a.pHolm)}. Winning taps: semantic ${winnerText(cell.winners.semantic)}, auditory ${winnerText(cell.winners.auditory)}.`;
}
