// Fig 18 · the protocol as one timeline. Every part of the still is a pure function of tour time T.
// Interactions seek: a mode key plays that condition's run, S the consolidation, arrows one TTT step.
import D from "./data.mjs";

export const STEP = 0.5; // seconds per TTT step (8 rollouts)
const HEAT = 0.7;
const END = HEAT + D.steps * STEP;
const LINE1 = 1.7;
const VENT = 0.7;
export const RUN = END + 3.4 + VENT;
const FILTER = 2.8; // train-side discovery, funnel on reflux
const OPEN = 0.6;
const SDFT = 4.8; // funnel on take-off: the 300 steps fill the receiver
const PPL = 2.4;
const DISTILL = FILTER + OPEN + SDFT + PPL + 0.6;
const DRAIN = 1.6;

export const MODES = ["base", "ttt", "post"];
export const STARTS = { base: 0, ttt: RUN, distill: 2 * RUN, post: 2 * RUN + DISTILL, drain: 3 * RUN + DISTILL };
export const TOTAL = STARTS.drain + DRAIN;
export const COLD = 0.785; // mercury below the scale
export const stepStart = (mode, step) => STARTS[mode] + HEAT + step * STEP;
export const RESULT = (mode) => stepStart(mode, D.steps) + 0.6; // first readout line of a run
export const SPLIT = STARTS.distill + FILTER + OPEN + SDFT + 0.9; // the perplexity line
export const STILL = STARTS.distill + FILTER + OPEN + SDFT * 0.62; // the static art: mid-consolidation
export const runOf = (T) => MODES.find((m) => T >= STARTS[m] && T < STARTS[m] + RUN) || null;

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const em = (D.conditions.ttt.em - D.conditions.base.em).toFixed(1);
const LINE2 = {
  base: `${D.heldOut} held-out tasks · N ${D.N} each`,
  ttt: `EM +${em} pts vs base · N ${D.N} compute-matched`,
  post: `θ cont · retention PPL ${D.ppl.base} → ${D.ppl.updated}`,
};

function run(mode, t, p) {
  const c = D.conditions[mode];
  const s = clamp((t - HEAT) / (D.steps * STEP)) * D.steps; // steps elapsed, continuous
  const n = Math.min(D.N, Math.floor(s * D.rollouts + 1e-6));
  const step = Math.min(D.steps, Math.floor(s) + 1);
  const vent = ease((t - RUN + VENT) / VENT);
  p.knob = MODES.indexOf(mode);
  p.heat = t < END ? ease(t / HEAT) : 1 - ease((t - END) / 0.8);
  // TTT climbs one row of indentations per LoRA step; best-of-N samples the same 96 at once
  p.vapour = (mode === "ttt" ? (t < END ? Math.max(0.04 * ease(t / HEAT), (Math.floor(s) + ease(s % 1)) / D.steps) : 1) : ease(t / HEAT)) * (1 - vent);
  p.mercury = COLD + (c.reward - COLD) * (1 - (1 - (s * D.rollouts) / D.N) ** 2.4) * (1 - vent);
  p.drip = t >= HEAT && t < END ? (s * D.rollouts) % 1 : -1;
  p.level = mode === "post" ? 1 : 0;
  const tag = mode === "ttt" ? `TTT · step ${step}/${D.steps}` : c.label;
  p.readout =
    t < HEAT ? `${c.label} · heating · N ${D.N}` :
    t < END ? `${tag} · n ${n}/${D.N}` :
    t < END + LINE1 ? `${c.label} · best ${c.reward.toFixed(4)} · EM ${c.em.toFixed(1)}%` :
    t < RUN - VENT ? LINE2[mode] :
    mode === "ttt" ? "TTT · LoRA not merged · θ₀ unchanged" : `${c.label} · cooling`;
  p.status = t < END ? `${tag}, ${n} of ${D.N} rollouts` : `${c.label}: mean best reward ${c.reward.toFixed(4)}, exact match ${c.em.toFixed(1)}%`;
}

function distill(t, p) {
  const t1 = FILTER, t2 = t1 + OPEN, t3 = t2 + SDFT, t4 = t3 + PPL;
  const hot = D.minReward; // the mercury rises to the cut collar
  const done = Math.min(D.sdftSteps, Math.floor(clamp((t - t2) / SDFT) * D.sdftSteps) + 1);
  p.knob = 1 + ease((t - t3) / 1.2);
  p.heat = p.vapour = t < t3 ? ease(t / 0.6) : 1 - ease((t - t3) / 0.9);
  p.mercury = t < t3 ? COLD + (hot - COLD) * ease(t / 1.2) : hot + (COLD - hot) * ease((t - t3) / 0.9);
  p.funnel = t < t4 ? ease((t - t1) / OPEN) : 1 - ease((t - t4) / 0.6);
  p.stream = t < t3 ? ease((t - t2) / 0.5) : 1 - ease((t - t3) / 0.7);
  p.level = clamp((t - t2) / SDFT);
  p.drip = t > 0.6 && t < t3 ? (t * 2.6) % 1 : -1;
  p.drop = t > t2 + 0.4 && t < t3 + 0.3 ? (t * 2.2) % 1 : -1;
  p.readout =
    t < 1.4 ? `train-side discovery · ${D.train} tasks` :
    t < t1 ? `kept ${D.kept}/${D.train} · ${D.keepRate}% · reward ≥ ${D.minReward}` :
    t < t2 ? `splitter on take-off · ${D.kept} demonstrations` :
    t < t3 ? `SDFT · step ${done}/${D.sdftSteps} · replay ${D.replay}` :
    `PPL ${D.ppl.base} → ${D.ppl.updated} · Δ −${Math.abs(D.ppl.delta).toFixed(3)}`;
  p.status = t < t1 ? `kept ${D.kept} of ${D.train} train tasks at reward ${D.minReward} or more` : t < t3 ? `SDFT on take-off, ${D.sdftSteps} steps, replay ${D.replay}` : `validation perplexity ${D.ppl.base} to ${D.ppl.updated}`;
}

export function poseAt(T) {
  T = ((T % TOTAL) + TOTAL) % TOTAL;
  const p = { T, mode: "distill", knob: 0, heat: 0, vapour: 0, mercury: COLD, funnel: 0, stream: 0, level: 0, drip: -1, drop: -1, readout: "", status: "" };
  const m = runOf(T);
  if (m) run((p.mode = m), T - STARTS[m], p);
  else if (T < STARTS.post) distill(T - STARTS.distill, p);
  else {
    const t = T - STARTS.drain;
    p.mode = "base";
    p.knob = 2 - 2 * ease(t / DRAIN);
    p.level = 1 - ease(t / DRAIN);
    p.readout = "reset · receiver back to θ₀";
    p.status = "reset to the base checkpoint";
  }
  p.lamp = p.funnel > 0.5;
  return p;
}
