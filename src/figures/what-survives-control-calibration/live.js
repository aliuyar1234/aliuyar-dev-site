// Fig 15 live: runs the height gauge. The planner in model.mjs raises the scriber before anything moves under it,
// then slides the gauge, swaps the candidate or lifts the riser, then lowers the scriber onto the stack it is over.
import { translateAlong, iso } from "../kit/iso-kit.mjs";
import { P, offsetOf, pointerAt } from "./view.mjs";
import { SETTINGS, EMPTIES, TOUR, REST_GOAL, restPose, advance, readoutOf, FRONTIER_X, CANDIDATE_X, STACK_Y, KNOB, SELECT, BASE_TOP, STRUCT_H } from "./model.mjs";

const IDLE_MS = 6000; // the tour resumes this long after a steered gauge comes to rest

export function mount(root) {
  const stage = root.querySelector(".ws-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const moves = [...svg.querySelectorAll("g[data-move]")];
  const holds = [...svg.querySelectorAll('g[data-move="lift"] [data-hold]')];
  const variants = [...svg.querySelectorAll("g[data-variant]")];
  const slots = [...svg.querySelectorAll("g[data-slot]")];
  const bins = [...svg.querySelectorAll("g[data-bin]")];
  const pointer = svg.querySelector('[data-part="pointer"]');
  const readout = root.querySelector("[data-readout]");
  const status = root.querySelector("[data-status]");
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

  let goal = { ...REST_GOAL };
  const pose = restPose(goal);
  const vel = { h: 0, gx: 0, lift: 0, knob: 0 };
  let touring = !still.matches;
  let step = 0;
  let dwell = 0;
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  let waiting = false; // a reader steered: the tour resumes IDLE_MS after the gauge comes to rest
  let resting = true;
  let said = "";

  const screen = (offset) => {
    const a = iso(offset, P);
    const o = iso([0, 0, 0], P);
    return [a[0] - o[0], a[1] - o[1]];
  };

  function draw() {
    for (const el of moves) set(el, "transform", translateAlong(P, offsetOf(el.dataset.move, pose)));
    const [dx, dy] = screen(offsetOf("lift", pose));
    for (const el of holds) set(el, "transform", `translate(${(-dx).toFixed(2)} ${(-dy).toFixed(2)})`);
    for (const el of variants) set(el, "data-off", Number(el.dataset.variant) === pose.variant ? null : "");
    const empty = EMPTIES[pose.cased];
    for (const el of slots) set(el, "data-out", empty.has(Number(el.dataset.slot)) ? "" : null);
    for (const el of bins) set(el, "data-out", Number(el.dataset.bin[1]) >= SETTINGS[pose.cased].bins[Number(el.dataset.bin[0])] ? "" : null);
    set(pointer, "d", pointerAt(pose.knob));
    const lines = readoutOf(pose, goal, resting);
    const spans = readout ? readout.children : [];
    lines.forEach((line, i) => {
      if (spans[i] && spans[i].textContent !== line) spans[i].textContent = line;
    });
    if (resting) {
      const text = `${SETTINGS[pose.cased].name}, ${goal.split} split. ${lines[2]}.`;
      if (text !== said && status && document.activeElement === stage) status.textContent = text;
      said = text;
    }
  }

  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    if (still.matches) {
      Object.assign(pose, restPose(goal));
      for (const key in vel) vel[key] = 0;
      resting = true;
      draw();
      frame = 0;
      return;
    }
    const step1 = advance(pose, vel, goal, dt);
    const busy = step1.busy;
    resting = step1.resting;
    if (waiting && resting) {
      waiting = false;
      idle = setTimeout(resume, IDLE_MS);
    }
    if (touring && resting) {
      dwell += dt;
      if (dwell >= TOUR[step].dwell) {
        step = (step + 1) % TOUR.length;
        goal = { setting: TOUR[step].setting, at: TOUR[step].at, split: TOUR[step].split };
        dwell = 0;
        resting = false;
      }
    }
    draw();
    frame = visible && (busy || touring) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      prev = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  function resume() {
    touring = true;
    step = (step + 1) % TOUR.length;
    goal = { setting: TOUR[step].setting, at: TOUR[step].at, split: TOUR[step].split };
    resting = false;
    run();
  }
  function steer(change) {
    touring = false;
    dwell = 0;
    goal = { ...goal, ...change };
    resting = false;
    clearTimeout(idle);
    waiting = !still.matches;
    run();
  }

  // what a click lands on, in viewBox units
  const spots = () => [
    { name: "select", at: iso([KNOB[0], KNOB[1], SELECT.h + 3], P), r: 26 },
    { name: "riser", at: iso([CANDIDATE_X, STACK_Y, 4], P), r: 14 },
    { name: "f", at: iso([FRONTIER_X, STACK_Y, BASE_TOP + STRUCT_H], P), r: 34 },
    { name: "c", at: iso([CANDIDATE_X, STACK_Y, BASE_TOP + STRUCT_H + pose.lift], P), r: 34 },
  ];
  function onClick(event) {
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    let best = null;
    for (const spot of spots()) {
      const d = Math.hypot(pt.x - spot.at[0], pt.y - spot.at[1]);
      if (d < spot.r && (!best || d < best.d)) best = { ...spot, d };
    }
    if (best && best.name === "select") steer({ setting: (goal.setting + 1) % SETTINGS.length });
    else if (best && best.name === "riser") steer({ split: goal.split === "test" ? "shift" : "test" });
    else if (best) steer({ at: best.name });
    else steer({ at: goal.at === "f" ? "c" : "f" });
  }
  function onKey(event) {
    const key = event.key;
    let change = null;
    if (key === "ArrowLeft") change = { at: "f" };
    else if (key === "ArrowRight") change = { at: "c" };
    else if (key === "ArrowUp") change = { split: "shift" };
    else if (key === "ArrowDown") change = { split: "test" };
    else if (key === " " || key === "Enter" || key === "t" || key === "T") change = { split: goal.split === "test" ? "shift" : "test" };
    else if (key === "1" || key === "2" || key === "3") change = { setting: Number(key) - 1 };
    else if (key === "s" || key === "S") change = { setting: (goal.setting + 1) % SETTINGS.length };
    else if (key === "Home") change = { setting: 0, at: "f", split: "test" };
    else if (key === "Escape") {
      clearTimeout(idle);
      waiting = false;
      touring = !still.matches;
      dwell = 0;
      run();
      return;
    }
    if (!change) return;
    event.preventDefault();
    steer(change);
  }
  const onFocus = () => {
    if (status) status.textContent = `${SETTINGS[goal.setting].name}, ${goal.split} split.`;
  };

  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("focus", onFocus);
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  const onMotion = () => {
    touring = !still.matches;
    run();
  };
  still.addEventListener?.("change", onMotion);
  draw();

  return () => {
    io.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(idle);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("focus", onFocus);
    still.removeEventListener?.("change", onMotion);
  };
}
