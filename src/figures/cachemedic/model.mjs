// Fig 16 model: what the readout says for a setting. Every number comes from data.mjs.
import D from "./data.mjs";

const f4 = (x) => x.toFixed(4);
const fe = (x) => x.toFixed(2);
export const PIECES = 8; // the readout's second line is a fixed row of spans: [text, muted]

// s = { type, eps (index 0..2), brush (bool, in the groove), cued (bool, stylus in the groove) }
// Line 2 for the held-out type gives the pair the paper compares, no defense → CacheMedic++, at the current ε,
// with the side the cleaning arm selects in full tone and the other muted.
export function readoutOf(s) {
  const t = D.types[s.type];
  const held = s.type === D.heldOut;
  const l1 = `${t.id} · ${held ? "held out" : "train mix"} · ε ${fe(D.eps[s.eps])} · R_φ ${s.brush ? "on" : "off"}`;
  let l2;
  if (!s.cued) l2 = [["tonearm up", false]];
  else if (!held) l2 = [[t.spec, false]];
  else {
    const on = s.brush;
    l2 = [
      ["Score ", false], [f4(D.score.none[s.eps]), on], [" → ", false], [f4(D.score.medic[s.eps]), !on],
      [" · AUC ", false], [f4(D.auc.none), on], [" → ", false], [f4(D.auc.medic), !on],
    ];
  }
  while (l2.length < PIECES) l2.push(["", false]);
  return { l1, l2 };
}

export function describe(s) {
  const t = D.types[s.type];
  const held = s.type === D.heldOut;
  let text = `${t.id.replace(/_/g, " ")}, ${held ? "the held-out type" : "a training type"}, severity ${fe(D.eps[s.eps])}; cleaning arm ${s.brush ? "in the groove" : "lifted"}; tonearm ${s.cued ? "reading" : "up"}.`;
  if (s.cued && held) text += ` Score ${f4(D.score.none[s.eps])} with no defense, ${f4(D.score.medic[s.eps])} with CacheMedic++; robustness AUC ${f4(D.auc.none)} and ${f4(D.auc.medic)}.`;
  else if (s.cued) text += ` Operator setting ${t.spec}.`;
  return text;
}
