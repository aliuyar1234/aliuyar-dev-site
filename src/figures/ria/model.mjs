// Fig 21 model: the forme, the operators' swaps, the pull timeline and the readout. Pure ESM, shared by
// parts.mjs (geometry), art.mjs (the static pose) and live.js (every change).
import D from "./data.mjs";

// The question set in the forme: an illustrative MMLU-style item (the figure shows no dataset text). The event
// positions below are what ria/ops/operators.py returns for it with key mmlu_subset|figure-21 (see TRUTH.md).
export const TEXT = 'Which of the following best describes a "man-in-the-middle" attack on a client\'s TLS session key exchange?';
export const EVENTS = { O1: [78], O2: [40, 58], O3: [44, 47, 51], O4: [12, 69, 71, 92], O5: [96], O6: [80] };
export const OPTIONS = ["A) Replaying old tokens", "B) Relaying traffic between", "C) Flooding the handshake", "D) Guessing a weak key"];
export const OPS = D.ops.map((op) => op.id);

export const MEASURE = 28; // forme columns
export const SCOPE_ROWS = 5; // question rows the chase holds
export const RULE_ROW = SCOPE_ROWS; // the brass rule between scope and scaffold
export const ROWS = SCOPE_ROWS + 1 + OPTIONS.length;

// set the scope in lines of MEASURE columns, breaking at spaces; `hard` is the index O6 turns into a newline
export function setScope(hard = -1) {
  const lines = [];
  let line = [];
  let word = [];
  const flush = () => {
    if (line.length && line.length + word.length > MEASURE) lines.push(line), (line = []);
    line.push(...word);
    word = [];
  };
  for (let i = 0; i < TEXT.length; i++) {
    if (TEXT[i] !== " ") {
      word.push(i);
      continue;
    }
    flush();
    if (i === hard) {
      line.push(i);
      lines.push(line);
      line = [];
    } else if (line.length < MEASURE) line.push(i);
    else lines.push(line), (line = []);
  }
  flush();
  lines.push(line);
  return lines; // lines[row] = character indices; the rest of each row is quadded out
}

// every slot of the forme: { row, col, kind } with kind "sort", "space", "fill" (end-of-line quads), "label" or "opt"
export function formeOf(op) {
  const slots = [];
  setScope(op === "O6" ? EVENTS.O6[0] : -1).forEach((line, row) => {
    for (let col = 0; col < MEASURE; col++) {
      const i = line[col];
      if (i === undefined) slots.push({ row, col, kind: "fill" });
      else slots.push({ row, col, i, kind: TEXT[i] === " " ? "space" : "sort" });
    }
  });
  for (let row = slots.length / MEASURE; row < SCOPE_ROWS; row++) for (let col = 0; col < MEASURE; col++) slots.push({ row, col, kind: "fill" });
  OPTIONS.forEach((text, k) => {
    for (let col = 0; col < MEASURE; col++) {
      const ch = text[col];
      slots.push({ row: RULE_ROW + 1 + k, col, kind: ch === undefined ? "fill" : ch === " " ? "space" : col < 2 ? "label" : "opt" });
    }
  });
  return slots;
}

// the sorts an operator swaps: character indices in the scope
export const swapsOf = (op) => (op && EVENTS[op]) || [];

// ------------------------------------------------------------ the press
export const CYL_R = 13; // impression cylinder radius, world units
export const TRAVEL = 2 * Math.PI * CYL_R; // one turn of the cylinder per pull: the forme fits one circumference
export const GEAR_R = 12; // cylinder gear pitch radius
export const PINION_R = 5; // crank pinion pitch radius: the crank turns GEAR_R / PINION_R = 2.4 times per pull

// one pull, in seconds: trip lever to print, carriage out over the forme, proof delivered, lever back, carriage home
export const PULL = { lever: 0.5, out: 2.6, deliver: 0.9, back: 0.4, home: 2.0 };
export const PULL_T = PULL.lever + PULL.out + PULL.deliver + PULL.back + PULL.home;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeIO = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// the press at time t into a pull: carriage share (0 home .. 1 end of travel), trip lever (0 trip .. 1 print),
// sheet on the feed board (1 there .. 0 gone), proof (0 hidden .. 1 delivered), and whether the new proof is printed
export function pullAt(t) {
  const a = PULL.lever;
  const b = a + PULL.out;
  const c = b + PULL.deliver;
  const d = c + PULL.back;
  const car = t < a ? 0 : t < b ? easeIO((t - a) / PULL.out) : t < d ? 1 : 1 - easeIO((t - d) / PULL.home);
  const lever = t < a ? ease(t / a) : t < c ? 1 : t < d ? 1 - ease((t - c) / PULL.back) : 0;
  const sheet = t < a ? 1 : t < a + 0.6 ? 1 - ease((t - a) / 0.6) : t < d + PULL.home * 0.6 ? 0 : ease((t - d - PULL.home * 0.6) / (PULL.home * 0.4));
  const proof = t < b ? 0 : ease((t - b) / PULL.deliver);
  return { car, lever, sheet, proof, printed: t >= b };
}

// ------------------------------------------------------------ readout
const OP = Object.fromEntries(D.ops.map((op) => [op.id, op]));
const signed = (v, digits) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(digits);
export const opOf = (id) => OP[id];
export const flipText = (id) => {
  const op = OP[id];
  return op.flip == null ? `flip ≤ ${D.tableFloor.toFixed(2)}%` : `flip ${op.flip.toFixed(2)}% (${op.count}/${D.n})`;
};
// the readout scores the proof on the board; while the forme is set differently it names both
const nameOf = ({ op, canon }) => (canon ? "canon_full" : op);
const scoreOf = ({ op, canon }) => (canon ? "" : OP[op].flip == null ? ` ≤ ${D.tableFloor.toFixed(2)}%` : ` ${OP[op].count}/${D.n}`);
export function readoutOf(set, printed = set) {
  if (nameOf(set) !== nameOf(printed)) return `${nameOf(set)} set · last proof ${nameOf(printed)}${scoreOf(printed)}`;
  if (set.canon) return `canon_full · no-harm CI low ${signed(D.noHarm, 2)} pp`;
  const o = OP[set.op];
  return `${o.id} · ${flipText(set.op)} · ΔAcc ${signed(o.dAcc, o.flip == null ? 1 : 2)} pp`;
}
// what the proof shows: marks printed red for the answers whose letter changed against the clean forme (null: not listed)
export const redOf = ({ op, canon }) => (canon ? null : OP[op].flip == null ? null : OP[op].count);

export const REST = { op: "O4", canon: false };
