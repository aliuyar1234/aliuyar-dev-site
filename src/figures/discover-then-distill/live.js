// Fig 18 live: plays the Discover-Then-Distill protocol on the still. Every part is a pure function of tour time T;
// the gauge-like quantities follow the model with a short time constant, so a seek eases instead of snapping.
import { poseAt, runOf, stepStart, RESULT, SPLIT, STARTS, STILL, TOTAL, MODES, STEP } from "./model.mjs";
import { viewOf } from "./view.mjs";
import { at, BULB, MODE_KNOB, CTRL } from "./rig.mjs";
import D from "./data.mjs";

const IDLE_MS = 8000; // a held moment waits this long, then the tour resumes
const TOUR_DELAY = 1.2;
const TAU = 0.14; // s, the follow of the eased quantities
const EASED = ["knob", "heat", "vapour", "mercury", "funnel", "stream", "level"];
const ATTRS = ["mercury", "mercury2", "drip", "drop", "stream", "beads", "lamp", "heat", "mode", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7"];

export function mount(root) {
  const stage = root.querySelector(".dtd-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const ref = (name) => svg.querySelector(`[data-ref="${name}"]`);
  const refs = Object.fromEntries(ATTRS.map((name) => [name, ref(name)]));
  const slots = Object.fromEntries(["vapour", "receiver", "funnel"].map((name) => [name, [...(ref(name)?.querySelectorAll("path") || [])]]));
  const readout = root.querySelector("[data-readout]");
  const status = root.querySelector("[data-status]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const last = new WeakMap();
  const set = (el, name, value) => {
    if (!el) return;
    let cache = last.get(el);
    if (!cache) last.set(el, (cache = {}));
    if (cache[name] === value) return;
    cache[name] = value;
    if (value === null || value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  let T = STILL; // the static art is this pose
  let goal = T;
  let mode = still.matches ? "hold" : "tour"; // tour | play | hold
  let wait = TOUR_DELAY;
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  let pose = poseAt(T);
  let shown = { ...pose };

  // returns true while an eased quantity is still on its way
  function draw(dt) {
    pose = poseAt(T);
    let busy = false;
    const f = still.matches || !dt ? 1 : 1 - Math.exp(-dt / TAU);
    for (const key of EASED) {
      const d = pose[key] - shown[key];
      if (Math.abs(d) > 1e-3 && f < 1) {
        shown[key] += d * f;
        busy = true;
      } else shown[key] = pose[key];
    }
    const v = viewOf({ ...pose, ...Object.fromEntries(EASED.map((key) => [key, shown[key]])) });
    for (const name of ATTRS) for (const key in v.attrs[name]) set(refs[name], key, v.attrs[name][key]);
    for (const name in slots) slots[name].forEach((el, i) => set(el, "d", v.ds[name][i]));
    if (readout && readout.textContent !== pose.readout) readout.textContent = pose.readout;
    return busy;
  }
  const announce = () => {
    if (status) status.textContent = pose.status;
  };

  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    let moving = false;
    if (mode === "tour") {
      if (wait > 0) wait -= dt;
      else T = (T + dt) % TOTAL;
      moving = true;
    } else if (mode === "play") {
      T = Math.min(goal, T + dt);
      if (T >= goal) arrive();
      else moving = true;
    }
    moving = draw(dt) || moving;
    frame = visible && moving ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      prev = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  function arrive() {
    mode = "hold";
    announce();
    clearTimeout(idle);
    if (still.matches) return draw(0);
    idle = setTimeout(() => {
      mode = "tour";
      wait = 0.4;
      run();
    }, IDLE_MS);
  }
  function playTo(target) {
    clearTimeout(idle);
    goal = target;
    if (still.matches) {
      T = goal;
      return arrive();
    }
    mode = "play";
    run();
  }
  // a seek moves T at once; the gauges, vapour, funnel and receiver ease to the new state
  function cutTo(target, then) {
    clearTimeout(idle);
    T = target;
    mode = "hold";
    then();
    run();
  }
  // play a segment: from inside it just continue, otherwise seek to its start first
  function segment(start, end) {
    if (T >= start - 1e-6 && T < end - 1e-6) playTo(end);
    else cutTo(start, () => playTo(end));
  }
  const heat = (m) => segment(STARTS[m], RESULT(m));
  const knobMode = () => (pose.mode === "distill" ? "post" : pose.mode);
  function step(dir) {
    const m = runOf(T) || "ttt";
    const begun = runOf(T) ? Math.floor((T - stepStart(m, 0)) / STEP + 1e-6) : -1;
    if (dir > 0) {
      if (begun < 0) cutTo(stepStart(m, 0), () => playTo(stepStart(m, 1)));
      else if (begun >= D.steps) playTo(Math.max(T, RESULT(m)));
      else playTo(stepStart(m, Math.max(0, begun + 1)));
    } else if (begun > 0) cutTo(stepStart(m, Math.min(D.steps, begun) - 1), arrive);
  }
  const cycleMode = () => heat(MODES[(MODES.indexOf(knobMode()) + 1) % MODES.length]);
  const split = () => segment(STARTS.distill, SPLIT);

  // the selector knob and the still head are their own targets (at least 22 CSS px round); anywhere else heats a task
  const near = (event, point, radius) => {
    const m = svg.getScreenCTM();
    if (!m) return false;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    const [x, y] = at(point);
    return Math.hypot(p.x - x, p.y - y) < Math.max(radius, 22 / Math.hypot(m.a, m.b));
  };
  const onClick = (event) => {
    if (event.button) return;
    if (near(event, [MODE_KNOB[0], MODE_KNOB[1], CTRL.h + 2], 10)) cycleMode();
    else if (near(event, BULB.c, 18)) split();
    else heat(knobMode());
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (key === " " || key === "Enter") heat(knobMode());
    else if (key === "ArrowRight") step(1);
    else if (key === "ArrowLeft") step(-1);
    else if (MODES[key - 1]) heat(MODES[key - 1]);
    else if (key === "s" || key === "S") split();
    else if (key === "Escape") {
      clearTimeout(idle);
      if (!still.matches) {
        mode = "tour";
        wait = 0;
        run();
      }
      return;
    } else return;
    event.preventDefault();
  };
  const on = [["click", onClick], ["keydown", onKey], ["focus", announce]];
  for (const [type, fn] of on) stage.addEventListener(type, fn);
  const onMotion = () => {
    clearTimeout(idle);
    if (still.matches) {
      T = goal = STILL;
      mode = "hold";
      draw(0);
    } else {
      mode = "tour";
      wait = TOUR_DELAY;
      run();
    }
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
  draw(0);

  return () => {
    io.disconnect();
    clearTimeout(idle);
    if (frame) cancelAnimationFrame(frame);
    for (const [type, fn] of on) stage.removeEventListener(type, fn);
    still.removeEventListener?.("change", onMotion);
  };
}
