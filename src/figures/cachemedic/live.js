// Fig 16 live: the platter turns, the arms cue, the knobs turn. Every moving part is rebuilt from world.mjs,
// the same module the static art was drawn with, and written into fixed paths; nothing is re-rendered.
import * as k from "../kit/iso-kit.mjs";
import D from "./data.mjs";
import {
  P, STILL, armPose, cleanPose, tonearmParts, cleanerParts, cueParts, selectorBar, epsPointer, SELECTOR, EPS_KNOB,
  grooveTraces, cuePath, strobeDots, LAYERS,
} from "./world.mjs";
import { readoutOf, describe } from "./model.mjs";

const IDLE_MS = 8000; // after the last change has settled, the tour resumes
const TOUR_DELAY = 1.4;
const REV = 16; // seconds per platter turn: 33⅓ rpm slowed so the pressed defect can be followed past the brush
const CUE_S = 2.6; // a full cue: lift, swing, lower
const BRUSH_S = 1.3;
const SWAP_S = 0.25; // the defect eases out and back in when the corruption type changes
// the idle tour: [seconds after the previous step, change]
const TOUR = [
  [3.2, { brush: 0 }],
  [3.6, { brush: 1 }],
  [3.2, { eps: 0 }],
  [2.8, { eps: 1 }],
  [2.8, { eps: 2 }],
  [3.2, { type: 0 }],
  [1.9, { type: 1 }],
  [1.9, { type: 2 }],
  [1.9, { type: 3 }],
  [1.9, { type: 4 }],
  [1.9, { type: 5 }],
  [3.4, { cue: 0 }],
  [3.8, { cue: 1 }],
];

export function mount(root) {
  const stage = root.querySelector(".cm-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const m = (name) => svg.querySelector(`[data-m="${name}"]`);
  const solid = (name) => {
    const g = m(name);
    return g ? Object.fromEntries([...g.querySelectorAll("[data-r]")].map((el) => [el.dataset.r, el])) : null;
  };
  const names = (parts) => parts.map((p) => solid(p.name));
  const refs = {
    arm: names(tonearmParts(armPose(1)).parts),
    clean: names(cleanerParts(cleanPose(1)).parts),
    lever: names(cueParts(1).parts),
    selector: solid("selector"),
    eps: m("epsPointer"),
    strobe: [...(m("strobe")?.children || [])],
    grooves: LAYERS.map((name) => [...(m(name)?.children || [])]),
    cue: m("cue"),
    stylus: m("stylus"),
    tip: m("tip")?.firstElementChild,
    pin: m("pin")?.firstElementChild,
    bristles: m("bristles"),
    axle: m("axle")?.firstElementChild,
    lamp: svg.querySelector("[data-lamp]"),
    l1: root.querySelector(".cm-l1"),
    l2: [...(root.querySelector(".cm-l2")?.children || [])],
    status: root.querySelector("[data-status]"),
  };
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map();
  const set = (el, name, value) => {
    if (!el) return;
    let c = cache.get(el);
    if (!c) cache.set(el, (c = {}));
    if (c[name] === value) return;
    c[name] = value;
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };
  const paint = (r, p) => {
    if (!r) return;
    set(r.fill, "d", p.fill);
    for (let i = 0; i < 4; i++) set(r[`s${i}`], "d", p.shades[i] || "");
    set(r.top, "d", p.top);
    set(r.crease, "d", p.crease || "");
    set(r.bevel, "d", p.bevel || "");
    set(r.edge, "d", p.outline);
  };
  const at = (p) => k.iso(p, P);
  const dot = (el, p) => {
    const [x, y] = at(p);
    set(el, "cx", x.toFixed(1));
    set(el, "cy", y.toFixed(1));
  };

  // goal: what the controls are set to; v: where the parts are
  const goal = { type: STILL.type, eps: STILL.eps, brush: STILL.b, cue: STILL.a };
  const v = { spin: STILL.spin, a: STILL.a, b: STILL.b, sel: SELECTOR.angles[STILL.type], knob: EPS_KNOB.angles[STILL.eps], amp: D.eps[STILL.eps], type: STILL.type, gate: 1 };
  let drawn = { a: NaN, b: NaN, sel: NaN, knob: NaN };
  let mode = still.matches ? "hold" : "tour"; // tour | hold
  let step = 0;
  let wait = TOUR_DELAY + TOUR[0][0]; // the opening picture is the static art; hold it before the first step
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  let settledAt = "";

  const toward = (x, target, rate, dt) => (x < target ? Math.min(target, x + rate * dt) : Math.max(target, x - rate * dt));
  const follow = (x, target, k, dt) => (Math.abs(target - x) < 1e-4 ? target : target + (x - target) * Math.exp(-k * dt));
  const shown = () => ({ type: goal.type, eps: goal.eps, brush: goal.brush === 1 && v.b >= 1, cued: goal.cue === 1 && v.a >= 1 });
  const settled = () => v.a === goal.cue && v.b === goal.brush && v.type === goal.type && v.gate === 1 && Math.abs(v.amp - D.eps[goal.eps]) < 1e-4 && v.sel === SELECTOR.angles[goal.type] && v.knob === EPS_KNOB.angles[goal.eps];

  function draw() {
    if (v.a !== drawn.a) {
      const { parts, stylus, pins } = tonearmParts(armPose(v.a));
      parts.forEach((p, i) => paint(refs.arm[i], p.paths));
      set(refs.stylus, "d", k.pathOf([at(stylus.root), at(stylus.tip)]));
      dot(refs.tip, stylus.tip);
      dot(refs.pin, pins[1]);
      cueParts(armPose(v.a).down).parts.forEach((p, i) => paint(refs.lever[i], p.paths));
      set(refs.lamp, "data-on", v.a >= 1 ? "green" : null);
    }
    if (v.b !== drawn.b) {
      const { parts, bristles, axles } = cleanerParts(cleanPose(v.b));
      parts.forEach((p, i) => paint(refs.clean[i], p.paths));
      set(refs.bristles, "d", bristles.map(([p, q]) => k.pathOf([at(p), at(q)])).join(""));
      dot(refs.axle, axles[1]);
    }
    if (v.sel !== drawn.sel) paint(refs.selector, selectorBar(v.sel).paths);
    if (v.knob !== drawn.knob) set(refs.eps, "d", epsPointer(v.knob));
    drawn = { a: v.a, b: v.b, sel: v.sel, knob: v.knob };
    strobeDots(v.spin).forEach((d, i) => set(refs.strobe[i], "d", d));
    set(refs.cue, "d", cuePath(v.spin));
    grooveTraces(v.spin, v.type, v.amp * v.gate, cleanPose(v.b).down).forEach((layer, L) => layer.forEach((d, i) => set(refs.grooves[L][i], "d", d)));
    const { l1, l2 } = readoutOf(shown());
    if (refs.l1 && refs.l1.textContent !== l1) refs.l1.textContent = l1;
    l2.forEach(([text, muted], i) => {
      const el = refs.l2[i];
      if (!el) return;
      if (el.textContent !== text) el.textContent = text;
      set(el, "data-mute", muted ? "" : null);
    });
  }
  const announce = () => {
    if (refs.status) refs.status.textContent = describe(shown());
  };

  function snap() {
    v.a = goal.cue;
    v.b = goal.brush;
    v.type = goal.type;
    v.gate = 1;
    v.amp = D.eps[goal.eps];
    v.sel = SELECTOR.angles[goal.type];
    v.knob = EPS_KNOB.angles[goal.eps];
  }

  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    if (mode === "tour") {
      wait -= dt;
      if (wait <= 0) {
        Object.assign(goal, TOUR[step][1]);
        step = (step + 1) % TOUR.length;
        wait = TOUR[step][0];
      }
    }
    v.spin = (v.spin + (2 * Math.PI * dt) / REV) % (2 * Math.PI);
    v.a = toward(v.a, goal.cue, 1 / CUE_S, dt);
    v.b = toward(v.b, goal.brush, 1 / BRUSH_S, dt);
    v.sel = follow(v.sel, SELECTOR.angles[goal.type], 9, dt);
    v.knob = follow(v.knob, EPS_KNOB.angles[goal.eps], 9, dt);
    v.amp = follow(v.amp, D.eps[goal.eps], 4, dt);
    if (v.type !== goal.type) {
      v.gate = toward(v.gate, 0, 1 / SWAP_S, dt);
      if (v.gate === 0) v.type = goal.type;
    } else v.gate = toward(v.gate, 1, 1 / SWAP_S, dt);
    draw();
    if (still.matches) {
      frame = 0;
      return;
    }
    // a change made by hand has settled: say so once, then start the idle timer
    const key = `${goal.type}${goal.eps}${goal.brush}${goal.cue}`;
    if (mode === "hold" && settled() && settledAt !== key) {
      settledAt = key;
      announce();
      clearTimeout(idle);
      idle = setTimeout(resume, IDLE_MS);
    }
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      prev = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  function resume() {
    if (still.matches) return;
    clearTimeout(idle);
    mode = "tour";
    wait = 0.6;
    run();
  }

  function change(patch) {
    clearTimeout(idle);
    mode = "hold";
    settledAt = "";
    Object.assign(goal, patch);
    if (still.matches) {
      snap();
      draw();
      announce();
    } else run();
  }
  const actions = {
    type: (d = 1) => change({ type: (goal.type + d + 6) % 6 }),
    eps: (d = 1) => change({ eps: (goal.eps + d + 3) % 3 }),
    brush: () => change({ brush: goal.brush ? 0 : 1 }),
    cue: () => change({ cue: goal.cue ? 0 : 1 }),
  };

  const onClick = (event) => {
    if (event.button) return;
    const hit = event.target.closest && event.target.closest("[data-hit]");
    if (hit && actions[hit.dataset.hit]) actions[hit.dataset.hit]();
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    const lower = key.toLowerCase();
    if (lower === "t") actions.type(event.shiftKey ? -1 : 1);
    else if (key === "ArrowRight") actions.type(1);
    else if (key === "ArrowLeft") actions.type(-1);
    else if (lower === "e" || key === "ArrowUp") actions.eps(event.shiftKey ? -1 : 1);
    else if (key === "ArrowDown") actions.eps(-1);
    else if (lower === "b") actions.brush();
    else if (lower === "c" || key === " " || key === "Enter") actions.cue();
    else if (key >= "1" && key <= "6") change({ type: Number(key) - 1 });
    else if (key === "Escape") resume();
    else return;
    event.preventDefault();
  };
  const onFocus = () => announce();
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("focus", onFocus);
  const onMotion = () => {
    if (still.matches) {
      clearTimeout(idle);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      mode = "hold";
      snap();
      draw();
    } else resume();
  };
  still.addEventListener?.("change", onMotion);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);

  return () => {
    io.disconnect();
    clearTimeout(idle);
    if (frame) cancelAnimationFrame(frame);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("focus", onFocus);
    still.removeEventListener?.("change", onMotion);
  };
}
