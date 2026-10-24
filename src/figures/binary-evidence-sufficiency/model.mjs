// Fig 11 · what the instrument reads in a state. Pure: art.mjs, live.js and build.mjs all call it.
import D from "./data.mjs";

export const valueOf = ({ anchor, subset, masked }) => D.auroc[masked ? "masked" : "open"][anchor][subset];

// the card readout, two lines. Line 1 is the measured quantity with its scope (read point, title masking, test subset);
// it is the AUROC over the whole CBN test subset, never a per-cell score. Line 2 is the cell in the beam and its target.
export function readoutOf({ cell, anchor, subset, masked }, { turning = false, masking = "" } = {}) {
  const v = valueOf({ anchor, subset, masked });
  const l1 = `${D.anchors[anchor]} · ${masked ? "masked " : ""}${D.subsets[subset]} · ${v == null ? "n/r" : `AUROC ${v.toFixed(3)}`}`;
  let l2;
  if (masking) l2 = `${masking} title masks`;
  else if (turning || cell < 0) l2 = "turret indexing";
  else l2 = `cell ${cell + 1} · ${D.cells[cell].name} · target ${D.cells[cell].suff ? "sufficient" : "insufficient"}`;
  return [l1, l2];
}

// the screen-reader sentence for a settled state
export function describe({ cell, anchor, subset, masked }) {
  const c = D.cells[cell];
  const v = valueOf({ anchor, subset, masked });
  const set = `${subset ? `${D.subsets[subset]} ` : ""}closed-book-negative test questions`;
  return `Cell ${cell + 1} in the beam: ${c.long} context, target label ${c.suff ? "sufficient" : "insufficient"}. Probe AUROC at ${D.anchors[anchor]}${masked ? " with page titles masked" : ""}, over ${set}: ${v == null ? "not reported in the paper" : v.toFixed(3)}.`;
}
