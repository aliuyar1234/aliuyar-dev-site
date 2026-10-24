// The locked regime rule of the paper (src/siggeo/geometry/regimes.py) and how the force
// table shows its inputs. Pure: shared by the build, the audit and the page.
import DATA from "./data.mjs";

export const { genes: GENES, locked: LOCKED, totals: TOTALS } = DATA;

// Angle between the ORF and CRISPR strings: 90° at sign z = 0, 20° per unit of sign z,
// narrower for a positive (aligned) signed cosine, wider for a negative (inverse) one.
export const DEG_PER_Z = 20;
export const angleOf = (z) => Math.max(16, Math.min(164, 90 - DEG_PER_Z * z));
export const zOfAngle = (deg) => (90 - deg) / DEG_PER_Z;

// Slotted masses: one mass is one unit of strength z, the locked asymmetry threshold.
// The stronger modality's hanger carries the excess, Δ activity (ORF minus CRISPR strength
// z); a gene with neither modality active loads neither hanger.
export const massesOf = (gene) => (gene.label === "inactive" ? [0, 0] : [Math.max(0, gene.delta), Math.max(0, -gene.delta)]); // [ORF, CRISPR]

// With the pin pulled the ring hangs between the strings and the centring cord, a spring
// in the column, which gives RING_K table units per mass: it settles along the resultant
// of the hung masses, which for one loaded hanger is that hanger's string.
export const RING_K = 1.1;
export const RING_MAX = 10;
export function ringOf(phi, masses) {
  let x = 0;
  let y = 0;
  masses.forEach((m, i) => ((x += m * Math.cos((phi[i] * Math.PI) / 180)), (y += m * Math.sin((phi[i] * Math.PI) / 180))));
  const d = Math.hypot(x, y);
  const s = d > 1e-9 ? Math.min(RING_K * d, RING_MAX) / d : 0;
  return [x * s, y * s];
}

// regimes.py: whichever modality is active alone, or stronger by more than 1.0, decides
// before the angle is consulted. Build-only check: it assumes both modalities active, so it
// is never used to state a label on the page.
export function ruleOf(z, delta, inactive = false) {
  if (inactive) return "inactive";
  if (delta > LOCKED.asymmetry) return "asymmetric_ORF";
  if (delta < -LOCKED.asymmetry) return "asymmetric_CRISPR";
  if (z >= LOCKED.signZ) return "aligned";
  if (z <= -LOCKED.signZ) return "inverse";
  return "orthogonal";
}

// A final label other than ambiguous means the bootstrap mode reached the 0.70 consensus.
export const heldOf = (gene) => gene.label !== "ambiguous";

const num = (x, places = 2) => (x < 0 ? "−" : "+") + Math.abs(x).toFixed(places);
const share = (label) => {
  const n = TOTALS.regimes[label];
  return n >= 100 ? `${((100 * n) / TOTALS.pairs).toFixed(1)}% of pairs` : `${n} of ${TOTALS.pairs.toLocaleString("en-US")} pairs`;
};

// The threshold test the locked rule makes of a hand-set angle and the gene's Δ.
function testOf(gene, z) {
  const d = Math.abs(gene.delta);
  if (gene.label === "inactive") return "inactive · strengths not compared";
  if (d > LOCKED.asymmetry) return `|Δ| ${d.toFixed(2)} > 1.0 · angle not used`;
  const s = Math.abs(z) >= LOCKED.signZ ? `sign z ${z > 0 ? "≥ +" : "≤ −"}1.96` : "|sign z| < 1.96";
  return `${s} · |Δ| ${d.toFixed(2)} ≤ 1.0`;
}

const WORDS = { seat: "seating pin", unload: "masses off", swing: "setting strings", load: "hanging masses", ready: `${LOCKED.bootstraps} resamples set`, pull: "pulling pin" };

// Two readout lines for a phase of the weighing.
export function readoutOf(gene, phase, extra = {}) {
  const values = `sign z ${num(gene.z)} · Δ ${num(gene.delta)}`;
  if (phase === "hand") {
    const z = zOfAngle(extra.angle);
    return [`${gene.symbol} · strings at ${extra.angle.toFixed(1)}° = sign z ${num(z)}`, testOf(gene, z)];
  }
  if (phase === "count") return [`${gene.symbol} · resample ${String(extra.n).padStart(3, "0")} / ${LOCKED.bootstraps}`, values];
  if (phase === "done") return [`${gene.symbol} · ${gene.label} · ${share(gene.label)}`, `${values} · consensus ${heldOf(gene) ? "≥" : "<"} 0.70`];
  const words = WORDS[phase] || WORDS.ready;
  return [`${gene.symbol} · ${phase === "seat" || phase === "pull" ? "" : "pin in · "}${words}`, values];
}

export const describeOf = (gene) => `${gene.symbol}: sign z ${num(gene.z)}, delta activity ${num(gene.delta)}, final label ${gene.label}, a label shared by ${share(gene.label)}.`;
