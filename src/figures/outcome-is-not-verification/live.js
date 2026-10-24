// Fig 13 live: works the lever frame. Every reading comes from model.mjs, every moving part from scene.mjs.
import { leverParts, commutatorHandle, needleTransform as turn, armTransform, vec, COMMUTATOR, DOMAIN_KNOB } from "./scene.mjs";
import { leverHit } from "./hits.mjs";
import * as M from "./model.mjs";

const IDLE_MS = 9000; // the tour resumes this long after the last action a person started has finished
const PAUSE = 1.3;
// p<i> pulls lever i, wc / wd throws the core / distractor world lever, t turns the commutator, l the domain knob.
// It tries C3, turns through the three targets, restores x1, throws d1, meets the cross-lock, does logic, and comes home.
const TOUR = "p4 t t t p6 wc p6 wd p6 wc l p6 t t t wd wc p3 l p2 p4 p8 p3".split(" ");

export function mount(root) {
  const stage = root.querySelector(".oi-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const all = (sel) => [...svg.querySelectorAll(sel)];
  const byIndex = (key) => all(`[data-${key}]`).reduce((out, el) => ((out[el.dataset[key]] = el), out), []);
  const [levers, tappets, needles, lamps, meters, stems] = ["lever", "tappet", "needle", "lamp", "meter", "stem"].map(byIndex);
  const [barB, barC, cross] = ["barB", "barC", "cross"].map((part) => all(`[data-part="${part}"]`));
  const knobEl = svg.querySelector("[data-knob]");
  const dialEl = svg.querySelector("[data-commutator]");
  const armEl = svg.querySelector("[data-arm]");
  const restingCollar = svg.querySelector("[data-collar-rest]");
  const [l1, l2] = [".oi-l1", ".oi-l2"].map((sel) => root.querySelector(sel));
  const status = root.querySelector("[data-status]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const memo = new WeakMap();
  const set = (el, name, value) => {
    const cache = memo.get(el) || {};
    memo.set(el, cache);
    if (cache[name] === value) return;
    cache[name] = value;
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  // ------------------------------------------------------------ state, starting from the static art's pose
  const { pair } = M.REST;
  const S = { ...M.REST, line: M.stepLine(M.REST.domain, M.REST.lever, M.REST.world) };
  const pose = [...Array(9)].map((_, i) => ({ stroke: i ? 0 : 1, lift: 0, squeeze: 0 }));
  const pulled = new Set(M.SLOT_LEVERS.filter((i) => M.isFlipSlot(i, S.world))); // locked levers tried in this world
  let collar = 0;
  let knob = DOMAIN_KNOB.angles[S.domain];
  let dial = COMMUTATOR.angles[S.target];
  let dialKey = dial.toFixed(3);
  // every pointer rides a lightly damped spring, like a moving-coil movement; the arm too
  const goals = () => {
    const g = {};
    for (const i of M.SLOT_LEVERS) g[`n${i}`] = M.needleOf(M.scoreOf(S.domain, S.target, pair, i, S.world));
    M.metersOf(S.domain, S.target).forEach((v, k) => (g[`m${k}`] = M.meterOf(v)));
    g.arm = M.armOf(S.world);
    return g;
  };
  const springs = {};
  const snap = () => Object.entries(goals()).forEach(([key, x]) => (springs[key] = { x, v: 0 }));
  snap();

  // ------------------------------------------------------------ drawing: attributes on refs; a lever is rebuilt only when it changed
  const leverKey = (i) => `${pose[i].stroke.toFixed(4)} ${pose[i].lift.toFixed(3)} ${pose[i].squeeze.toFixed(3)} ${S.lever === i} ${i === M.SPARE ? collar.toFixed(2) : ""}`;
  const drawn = levers.map((_, i) => leverKey(i));
  const swept = pose.map((p) => p.stroke);
  function draw() {
    levers.forEach((el, i) => {
      const key = leverKey(i);
      if (drawn[i] === key) return;
      el.innerHTML = leverParts(i, pose[i], { collar: i === M.SPARE ? collar : 0, lit: S.lever === i }).svg;
      drawn[i] = key;
      if (swept[i] !== pose[i].stroke) set(stems[i], "d", leverHit(i, (swept[i] = pose[i].stroke)));
    });
    const travel = pose.map((p) => M.tappetOf(p.stroke));
    tappets.forEach((el, i) => set(el, "transform", travel[i] > 1e-3 ? vec(0, travel[i], 0) : null));
    const [w1, w2] = travel;
    for (const el of barB) set(el, "transform", vec(-M.shiftOf(w1), 0, 0));
    for (const el of barC) set(el, "transform", vec(-M.shiftOf(w2), 0, 0));
    for (const el of cross) set(el, "transform", vec(M.crossOf(w1, w2), 0, 0));
    for (const i of M.SLOT_LEVERS) {
      set(needles[i], "transform", turn(springs[`n${i}`].x));
      set(lamps[i], "data-on", (pulled.has(i) && M.lampOf(S.domain, S.target, pair, i, S.world)) || null);
    }
    meters.forEach((el, k) => set(el, "transform", turn(springs[`m${k}`].x)));
    set(armEl, "transform", armTransform(springs.arm.x));
    set(knobEl, "transform", turn(knob));
    set(restingCollar, "opacity", collar ? (1 - collar).toFixed(2) : null); // the collar leaves its peg for lever 8
    if (dialKey !== dial.toFixed(3)) {
      dialEl.innerHTML = commutatorHandle(dial).svg;
      dialKey = dial.toFixed(3);
    }
    const line2 = M.scorerLine(S.domain, S.target);
    if (l1.textContent !== S.line) l1.textContent = S.line;
    if (l2.textContent !== line2) l2.textContent = line2;
  }
  const announce = () => (status.textContent = `${S.line}. ${M.scorerLine(S.domain, S.target)}.`);

  // ------------------------------------------------------------ actions: each is planned when it starts, from the state then
  const seg = (d, f) => ({ d, f });
  const now = (f) => ({ d: 0, f });
  const catchUp = (p, up) => seg(0.2, (u) => ((p.squeeze = up ? u : 1 - u), (p.lift = M.LIFT * (up ? u : 1 - u))));
  const swing = (p, from, to, d) => seg(d, (u) => (p.stroke = from + (to - from) * u));
  const dom = () => M.PAPER[S.domain].name;

  function pull(i) {
    if (!M.inUse(i, S.domain)) return [now(() => (S.line = `${dom()} · ${M.PAPER.logic.slots} slots · this lever is collared`))];
    const p = pose[i];
    const end = M.validIn(i, S.world) ? 1 : M.strokeLocked; // a locked lever stops when its tappet's notch meets the dog
    return [
      now(() => ((S.lever = i), (S.line = `${dom()} ${M.NAMES[S.domain][i]} · ${M.WORLD_LABEL[S.domain][S.world]} · pulling`))),
      catchUp(p, true),
      seg(0.7, (u) => (p.stroke = end < 1 ? end * Math.min(1, u * 3.2) : u)),
      now(() => (pulled.add(i), (S.line = M.stepLine(S.domain, i, S.world)))),
      seg(1.1, () => {}),
      seg(0.6, (u) => (p.stroke = end * (1 - u))),
      catchUp(p, false),
    ];
  }
  function throwWorld(w) {
    const i = w === "core" ? 0 : 1;
    const p = pose[i];
    const grab = now(() => (S.lever = i));
    const done = (world) => now(() => ((S.world = world), pulled.clear(), (S.line = M.worldLine(S.domain, world))));
    if (S.world === w) return [grab, catchUp(p, true), swing(p, 1, 0, 0.8), catchUp(p, false), done("source")];
    if (S.world === "source") return [grab, catchUp(p, true), swing(p, 0, 1, 0.9), catchUp(p, false), done(w)];
    const held = M.strokeLockedW; // the other world lever is reversed: the cross dog stops this one
    return [grab, now(() => (S.line = M.crossLine(S.domain, S.world))), catchUp(p, true), swing(p, 0, held, 0.15), seg(0.7, () => {}), swing(p, held, 0, 0.15), catchUp(p, false)];
  }
  function turnTarget() {
    const from = dial;
    S.target = M.TARGETS[(M.TARGETS.indexOf(S.target) + 1) % 3];
    S.line = M.worldLine(S.domain, S.world);
    return [seg(0.55, (u) => (dial = from + (COMMUTATOR.angles[S.target] - from) * u))];
  }
  function turnDomain() {
    const from = knob;
    S.domain = S.domain === "arith" ? "logic" : "arith";
    S.line = M.domainLine(S.domain);
    pulled.clear();
    return [seg(0.6, (u) => ((knob = from + (DOMAIN_KNOB.angles[S.domain] - from) * u), (collar = S.domain === "logic" ? u : 1 - u)))];
  }
  const planOf = (code) => () =>
    code[0] === "p" ? pull(Number(code.slice(1))) : code === "wc" ? throwWorld("core") : code === "wd" ? throwWorld("distractor") : code === "t" ? turnTarget() : turnDomain();

  // ------------------------------------------------------------ the runner
  let queue = []; // segments, and plans that expand into segments when they reach the front
  let current = null;
  let t = 0;
  let step = 0;
  let touring = !still.matches;
  let heard = false; // a person started the running actions, so the result is announced
  let wait = PAUSE;
  let visible = false;
  let frame = 0;
  let prev = 0;
  let idle = 0;

  function next() {
    while (queue.length) {
      const s = queue.shift();
      if (!s.plan) return s;
      queue.unshift(...s.plan());
    }
    return null;
  }
  function settle() {
    if (current) current.f(1);
    for (let s = next(); s; s = next()) s.f(1);
    current = null;
    snap();
    draw();
    announce();
  }
  function act(code) {
    clearTimeout(idle);
    touring = false;
    heard = true;
    if (queue.filter((s) => s.plan).length < 6) queue.push({ plan: planOf(code) }); // at most six actions waiting
    if (still.matches) settle();
    else run();
  }
  function tick(time) {
    const dt = prev ? Math.min((time - prev) / 1000, 1 / 30) : 1 / 60;
    prev = time;
    if (!current && (current = next())) t = 0;
    if (current) {
      t += dt;
      const u = current.d ? Math.min(1, t / current.d) : 1;
      current.f(M.smooth(u));
      if (u >= 1) (current = null), queue.length || arrived();
    } else if (touring && (wait -= dt) <= 0) {
      queue.push({ plan: planOf(TOUR[step]) });
      step = (step + 1) % TOUR.length;
      wait = PAUSE;
    }
    let moving = false;
    for (const [key, goal] of Object.entries(goals())) {
      const n = springs[key];
      const pull = goal - n.x;
      n.v += (90 * pull - 13 * n.v) * dt;
      n.x += n.v * dt;
      moving ||= Math.abs(pull) > 1e-3 || Math.abs(n.v) > 1e-3;
    }
    draw();
    frame = visible && (touring || current || queue.length || moving) ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (frame || !visible || still.matches) return;
    prev = 0;
    frame = requestAnimationFrame(tick);
  }
  function arrived() {
    if (touring) return;
    if (heard) announce(), (heard = false);
    idle = setTimeout(() => {
      queue.push(now(() => (S.line = M.stepLine(S.domain, S.lever, S.world))));
      touring = true;
      run();
    }, IDLE_MS);
  }

  // ------------------------------------------------------------ input
  const onClick = (event) => {
    const key = event.target.closest?.("[data-hit]")?.dataset.hit;
    if (!key) return;
    const i = Number(key.slice(5));
    act(key === "target" ? "t" : key === "domain" ? "l" : i === 0 ? "wc" : i === 1 ? "wd" : `p${i}`);
  };
  const KEYS = { c: "wc", d: "wd", t: "t", l: "l" };
  const onKey = (event) => {
    const key = event.key.toLowerCase();
    if (key >= "1" && key <= "7") act(`p${Number(key) + 1}`);
    else if (KEYS[key]) act(KEYS[key]);
    else if (key === "escape" && !still.matches) {
      clearTimeout(idle);
      touring = true;
      wait = 0.2;
      run();
    } else return;
    event.preventDefault();
  };
  const onMotion = () => {
    touring = !still.matches;
    if (touring) run();
    else settle();
  };
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  still.addEventListener("change", onMotion);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) run();
    else if (frame) cancelAnimationFrame(frame), (frame = 0);
  });
  io.observe(root);
  announce();

  return () => {
    io.disconnect();
    clearTimeout(idle);
    if (frame) cancelAnimationFrame(frame);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    still.removeEventListener("change", onMotion);
  };
}
