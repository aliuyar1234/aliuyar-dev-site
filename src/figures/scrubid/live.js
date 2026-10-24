// Fig 17 live: plays ScrubID's discovery and necessity tests on the manifold.
// The levers follow their valve states and the float follows the metric those states give on a spring. Every number
// in the readout and the ε lamp come from the model, taken on the pattern the levers have reached (a valve's port is
// open on a side once its lever is past half way there), so words, numbers and lamps always describe one instant.
import * as k from "../kit/iso-kit.mjs";
import { P, XB, YB, VALVE, AGG, KNOB, LEVER, CONSOLE_H, SUP, REF as REFH, zOf, knobAngleOf, pointerOf } from "./world.mjs";
import { leverPaths, leverFrame, KEYS, dOf, AGG_INDEX, angleOf, stateAt } from "./lever.mjs";
import { add3, mul3 } from "../kit/lathe.mjs";
import { S0, EPS, TAU, FACTORS, LIVE, REF, SHUT, AGGR, metric, deltaOf, fullModel, discovery, flipTest, tour, handoff, nameOf, REST, RUNS } from "./model.mjs";

const IDLE_MS = 9000; // after a step the reader started has played, the tour resumes this long later
const LEVER_TAU = 0.13; // s, exponential follow of a thrown lever
const KNOB_TAU = 0.12;
const SPRING = { k: 38, c: 7.4 }; // float: slightly underdamped
const f2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const cmp = (d, bound) => (d <= bound + 1e-9 ? "≤" : ">");
const setName = (valves) => `{${["aggr", ...valves.map((s, i) => (i < AGGR && s === LIVE ? `r${i}` : null)).filter(Boolean)].join(", ")}}`;

export function mount(root) {
  const stage = root.querySelector(".su-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  // each lever group holds two solids of eight paths in KEYS order: the bar, then the grip
  const levers = [];
  for (const g of svg.querySelectorAll("[data-lever]")) {
    const paths = [...g.querySelectorAll("path")];
    levers[Number(g.dataset.lever)] = { g, bar: paths.slice(0, KEYS.length), grip: paths.slice(KEYS.length, 2 * KEYS.length), drawn: NaN };
  }
  const refs = {
    float: svg.querySelector('g[data-part="float"]'),
    pointer: svg.querySelector('path[data-part="pointer"]'),
    lamps: Object.fromEntries([...svg.querySelectorAll("[data-lamp]")].map((el) => [el.dataset.lamp, el])),
    readout: root.querySelector("[data-readout]"),
    status: root.querySelector("[data-status]"),
  };
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const last = new Map();
  const set = (el, name, value) => {
    if (!el) return;
    let cache = last.get(el);
    if (!cache) last.set(el, (cache = {}));
    if (cache[name] === value) return;
    cache[name] = value;
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  // ------------------------------------------------------------ state
  let r = REST.r;
  let valves = REST.valves.slice();
  const angles = valves.map((s, i) => angleOf(i, s));
  let m = REST.m;
  let mv = 0;
  let knob = knobAngleOf(r);
  let knobDrawn = NaN;
  let program = [];
  let at = 0;
  let clock = 0;
  let mode = still.matches ? "hold" : "tour"; // tour | play | hold
  let wait = 1.2;
  let step = { phase: "full", valves, r, hold: 0 };
  let cert = null; // last audit's verdict, shown until the model changes
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  const runIndex = Object.fromEntries(FACTORS.map((f) => [f, 0]));
  const reached = () => angles.map((a, i) => stateAt(i, a));

  function enter(next) {
    step = next;
    clock = 0;
    if (next.r !== r) (r = next.r), (cert = null);
    if (next.phase === "full" || next.phase === "make") cert = null;
    if (next.phase === "summary") cert = next.audit.cert ? "red" : "green";
    if (next.phase === "paper") cert = next.cert;
    valves = next.valves.slice();
  }

  function readout(now = reached()) {
    const d = deltaOf(now, r);
    const eps = `Δ ${f2(d)} ${cmp(d, EPS)} ε ${f2(EPS)}`;
    // while levers are still on their way, a pattern step names where it is going and prints its numbers on arrival
    const set_ = now.every((s, i) => s === valves[i]);
    if (!set_ && step.phase === "full") return `r ${r} → full model`;
    if (!set_ && step.phase === "circuit") return `→ C ${step.k + 1}/${step.n} ${setName(step.valves)}`;
    if (!set_ && step.phase === "switch") return `C ${step.k}/${step.n} → ${step.k + 1}/${step.n}`;
    if (!set_ && step.phase === "make") return `r ${step.from === step.to ? r : `${step.from} → ${step.to}`}`;
    switch (step.phase) {
      case "summary": {
        const a = step.audit;
        return `|S_near| ${a.n} · RR ${f2(a.RR)} · SSS ${f2(a.SSS)} · CC ${f2(a.CC)}`;
      }
      case "switch":
        return `C ${step.k}/${step.n} → ${step.k + 1}/${step.n} · ${eps}`;
      case "circuit":
        return `C ${step.k + 1}/${step.n} ${setName(step.valves)} · ${eps}`;
      case "flip":
      case "restore": {
        const v = step.flip;
        const to = valves[v] === LIVE ? "live" : "ref";
        if (now[v] !== valves[v]) return `${nameOf(v)} → ${to}`; // the numbers follow once the lever has got there
        if (to === "live") return `${nameOf(v)} → live · ${eps}`;
        const rise = d - deltaOf(step.before, r);
        const needed = rise >= TAU - 1e-9;
        return `${nameOf(v)} → ref · +Δ ${f2(Math.max(0, rise))} ${needed ? "≥" : "<"} τ ${f2(TAU)} · ${needed ? "necessary" : "not necessary"}`;
      }
      case "paper":
        return step.text;
      case "outside":
        return `${nameOf(step.v)} is outside the r ${r} model`;
      case "make":
        return `r ${step.from === step.to ? r : `${step.from} → ${step.to}`} · |m| ${f2(metric(now, r))} · S0 ${f2(S0)}`;
      default:
        return `r ${r} · full model · |m| ${f2(metric(now, r))} · S0 ${f2(S0)}`;
    }
  }

  function draw() {
    for (let i = 0; i < 9; i++) {
      const L = levers[i];
      if (!L || L.drawn === angles[i]) continue;
      L.drawn = angles[i];
      const { bar, grip } = leverPaths(i, angles[i]);
      KEYS.forEach((key, j) => {
        set(L.bar[j], "d", dOf(bar, key));
        set(L.grip[j], "d", dOf(grip, key));
      });
    }
    if (knobDrawn !== knob) set(refs.pointer, "d", pointerOf(r, (knobDrawn = knob)));
    set(refs.float, "transform", k.translateAlong(P, [0, 0, zOf(m) - zOf(0)]));
    const now = reached();
    // the ε lamp is dark while the meter is isolated (aggregator shut), and only then
    const isolated = step.phase === "paper" || (now[AGGR] === SHUT && valves[AGGR] !== REF);
    set(refs.lamps.eps, "data-on", isolated ? null : deltaOf(now, r) <= EPS + 1e-9 ? "green" : "red");
    set(refs.lamps.cert, "data-on", cert);
    const text = readout(now);
    if (refs.readout && refs.readout.textContent !== text) refs.readout.textContent = text;
  }
  const announce = () => {
    if (refs.status) refs.status.textContent = readout().replace(/·/g, ",");
  };

  // ------------------------------------------------------------ motion
  function physics(dt) {
    const leverK = 1 - Math.exp(-dt / LEVER_TAU);
    let moving = false;
    for (let i = 0; i < 9; i++) {
      const delta = angleOf(i, valves[i]) - angles[i];
      if (Math.abs(delta) < 2e-4) angles[i] += delta;
      else (angles[i] += delta * leverK), (moving = true);
    }
    const kg = knobAngleOf(step.dial ?? r);
    if (Math.abs(kg - knob) < 2e-4) knob = kg;
    else (knob += (kg - knob) * (1 - Math.exp(-dt / KNOB_TAU))), (moving = true);
    const target = metric(reached(), r);
    for (let n = 0; n < 4; n++) {
      const h = dt / 4;
      mv += (-SPRING.k * (m - target) - SPRING.c * mv) * h;
      m += mv * h;
      if (m < 0) (m = 0), (mv = Math.max(0, mv)); // the float lands on its bottom stop
      if (m > 1.2) (m = 1.2), (mv = Math.min(0, mv));
    }
    if (Math.abs(m - target) < 5e-4 && Math.abs(mv) < 5e-3) (m = target), (mv = 0);
    else moving = true;
    return moving;
  }
  function snap() {
    for (let i = 0; i < 9; i++) angles[i] = angleOf(i, valves[i]);
    knob = knobAngleOf(step.dial ?? r);
    m = metric(valves, r);
    mv = 0;
  }

  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    let busy = physics(dt);
    if (mode === "tour" && wait > 0) {
      wait -= dt;
      busy = true;
    } else if (mode !== "hold") {
      clock += dt;
      busy = true;
      if (clock >= step.hold) {
        if (at < program.length) enter(program[at++]);
        else if (mode === "tour") startTour();
        else arrive();
      }
    }
    draw();
    frame = visible && busy ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      prev = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  // a program starts from whatever the valves show now: open what it needs before it shuts anything
  function begin(steps) {
    program = [...handoff(valves, r, steps[0]), ...steps];
    at = 1;
    enter(program[0]);
  }
  function startTour(delay = 0) {
    clearTimeout(idle);
    if (still.matches) return;
    mode = "tour";
    wait = delay;
    begin(tour());
    run();
  }
  function arrive() {
    mode = "hold";
    announce();
    clearTimeout(idle);
    if (!still.matches) idle = setTimeout(() => startTour(0.6), IDLE_MS);
  }
  // play a short program the reader asked for; under reduced motion jump to its last step
  function play(steps) {
    clearTimeout(idle);
    if (still.matches) {
      enter(steps[steps.length - 1]);
      snap();
      draw();
      return arrive();
    }
    begin(steps);
    mode = "play";
    run();
  }

  // ------------------------------------------------------------ the reader's controls
  const setFactor = (dir) => {
    const next = FACTORS[(FACTORS.indexOf(r) + dir + FACTORS.length) % FACTORS.length];
    play([{ phase: "full", valves: fullModel(next), hold: 1.6, r: next }]);
  };
  function runDiscovery() {
    const index = runIndex[r];
    runIndex[r] = (index + 1) % RUNS[r].length;
    play(discovery(r, index));
  }
  function flip(v) {
    if (valves[v] === SHUT && v !== AGGR) return play([{ phase: "outside", valves, hold: 1.6, r, v }]);
    const from = valves.slice();
    from[AGGR] = from[AGGR] === SHUT ? LIVE : from[AGGR];
    const open = from[AGGR] === valves[AGGR] ? [] : [{ phase: "make", valves: from, r, hold: 0.6, from: r, to: r }]; // after the paper rows: open the meter first
    play([...open, flipTest(from, r, v)[0]]);
  }
  const home = () => play([{ phase: "full", valves: fullModel(r), hold: 1.6, r }]);

  // pointer: the knob, a lever along its drawn bar and grip or on its valve body; on touch, anywhere in a valve's column
  const screen = (p) => k.iso(p, P);
  const toSegment = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const BODY_AT = [...XB.map((x) => [x, YB, VALVE.z]), [AGG.x, AGG.y, AGG.z]];
  const KNOB_AT = screen([KNOB[0], KNOB[1], CONSOLE_H + 3]);
  const COLUMN = XB.map((x) => [screen([x, YB, SUP.z + 6]), screen([x, YB + 12, REFH.z - 6])]);
  function hit(event, touch) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const q = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const p = [q.x, q.y];
    if (Math.hypot(p[0] - KNOB_AT[0], p[1] - KNOB_AT[1]) < (touch ? 24 : 18)) return { knob: true };
    let best = null;
    let dist = 9;
    for (let i = 0; i < 9; i++) {
      const F = leverFrame(i, angles[i]);
      const body = screen(BODY_AT[i]);
      const d = Math.min(toSegment(p, screen(F.o), screen(add3(F.o, mul3(F.a, LEVER.len)))) - 2.5, Math.hypot(p[0] - body[0], p[1] - body[1]) - 6);
      if (d < dist) (dist = d), (best = i);
    }
    if (best === null && touch) {
      let gap = 13;
      COLUMN.forEach(([top, low], i) => {
        if (p[1] < top[1] || p[1] > low[1]) return;
        const x = top[0] + ((low[0] - top[0]) * (p[1] - top[1])) / (low[1] - top[1]);
        if (Math.abs(p[0] - x) < gap) (gap = Math.abs(p[0] - x)), (best = i);
      });
    }
    return best === null ? null : { lever: best };
  }
  let touching = false;
  const onDown = (event) => (touching = event.pointerType === "touch" || event.pointerType === "pen");
  const onClick = (event) => {
    const target = hit(event, touching);
    if (target?.knob) setFactor(1);
    else if (target) flip(target.lever);
    else runDiscovery();
  };
  const onKey = (event) => {
    const key = event.key;
    if (key === "ArrowUp" || key === "ArrowRight") setFactor(1);
    else if (key === "ArrowDown" || key === "ArrowLeft") setFactor(-1);
    else if (key === " " || key === "Enter") runDiscovery();
    else if (/^[0-7]$/.test(key)) flip(Number(key));
    else if (key === "a" || key === "A") flip(AGG_INDEX);
    else if (key === "Home") home();
    else if (key === "Escape") startTour(0.3);
    else return;
    event.preventDefault();
  };
  let hot = null;
  const hover = (target) => {
    const lever = target?.lever ?? null;
    if (lever !== hot) {
      if (hot !== null) set(levers[hot]?.g, "data-hot", null);
      if (lever !== null) set(levers[lever]?.g, "data-hot", "");
      hot = lever;
    }
    set(stage, "data-over", target ? (target.knob ? "knob" : "lever") : null);
  };
  const onMove = (event) => event.pointerType === "mouse" && hover(hit(event, false));
  const onLeave = () => hover(null);

  let inView = false;
  const io = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    onVisibility();
  });
  const onVisibility = () => {
    visible = inView && !document.hidden;
    if (visible && !still.matches) run();
  };
  const onMotion = () => {
    if (!still.matches) return startTour(0.3);
    clearTimeout(idle);
    mode = "hold";
    program = [];
    enter({ phase: "full", valves: REST.valves, r: REST.r, hold: 0 });
    snap();
    draw();
  };

  const on = [
    [stage, "pointerdown", onDown],
    [stage, "click", onClick],
    [stage, "keydown", onKey],
    [stage, "pointermove", onMove],
    [stage, "pointerleave", onLeave],
    [document, "visibilitychange", onVisibility],
    [still, "change", onMotion],
  ];
  for (const [el, type, fn] of on) el.addEventListener(type, fn);
  io.observe(stage);
  draw();

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    io.disconnect();
    for (const [el, type, fn] of on) el.removeEventListener(type, fn);
  };
}
