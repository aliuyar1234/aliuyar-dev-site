// Fig 8 live: set the mode lever, pull the handle to cut a copy, toggle the one-feature pruning bolt.
// Every moving part is a pure function of the pass timeline in model.mjs and a few eased settings.
import { passAt, PASS_END, edgeOf, grade, readoutOf, MODES, STRICT, STATIONS, FEATURE } from "./model.mjs";
import { P, move, offsetOf, slotsOf, keyPaths, BLANK_SH, pinPaths, pinSlots, PIN, leverPaths, LEVER, coilOf, needleAt, stopPointer, adjusterPointer, ADJ_TOP, wheelTeeth, brushSpokes, bucketsOf, targetOf } from "./view.mjs";
import { translateAlong } from "../kit/iso-kit.mjs";

const TOUR = [[1, false], [2, false], [0, false], [0, true]]; // dense, steering, sparse, sparse pruned to one feature
const KEEP = STATIONS.indexOf(FEATURE);
const HOLD = 2.8; // the tour rests on each finished copy
const QUIET = 6; // after the last touch, before the tour resumes
const SETTLE = 0.55; // lever travel before a pass starts
const ABORT = 0.45; // a tour pass interrupted by the reader: the carriage eases home in this time
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const NAMES = ["sparse", "dense", "steering"];

export function mount(root) {
  const stage = root.querySelector(".sc-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const q = (sel) => svg.querySelector(sel);
  const qa = (sel) => [...svg.querySelectorAll(sel)];
  const paths = (g) => (g ? [...g.children].filter((el) => el.tagName === "path") : []);
  const parts = qa("g[data-part]");
  const blanks = qa("[data-blank]");
  const blankSlots = blanks.map((g) => paths(g.querySelector(".iso-solid")));
  const pins = qa("[data-pin]").map(paths);
  const lever = paths(q("[data-lever]"));
  const holds = qa("[data-hold]");
  const teeth = qa("[data-teeth]");
  const ctl = { lever: q('[data-ctl="lever"]'), bolt: q('[data-ctl="bolt"]'), handle: q('[data-ctl="handle"]') };
  const [needle, stop, adjust, back, front, spokes, red, green] = ["[data-needle]", "[data-stop]", "[data-adjust]", '[data-coil="back"]', '[data-coil="front"]', "[data-spokes]", '[data-lamp="red"]', '[data-lamp="green"]'].map(q);
  const readout = root.querySelector("[data-readout]");
  const status = root.querySelector(".sc-sr");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map();
  const set = (el, name, value) => {
    if (!el) return;
    const seen = cache.get(el) || {};
    if (seen[name] === value) return;
    seen[name] = value;
    cache.set(el, seen);
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };
  const write = (els, list) => list.forEach((d, i) => set(els[i], "d", d));

  let mode = 0; // what the lever asks for
  let pruned = false;
  let cut = [0, false, 0]; // what the blank carries: mode, pruned, cutter station (0: finished)
  let pass = null; // { start, mode, pruned, prev, tour }
  let abort = null; // { start, c, feed, spin }: an interrupted pass easing home
  let startAt = -1; // when the next pass starts (-1: none waiting)
  let waiting = false; // that pass belongs to the tour
  const eased = { lever: LEVER.angles[0], lift: 0, back: 0, prune: 0, stop: 0, value: grade("sparse", false) };
  let spun = 0;
  let clock = 0;
  let step = -1;
  let next = 1.4;
  let frame = 0;
  let prev = 0;
  let visible = false;
  let edgeKey = "";
  let leverAt = NaN;
  let pruneAt = 0;
  let lines = readoutOf("sparse", false, "done");
  let shownText = "";
  let s = { c: 0, feed: 0, lift: 0, back: 0, prune: 0, lever: eased.lever };

  const follow = (value, goal, dt, tau) => (still.matches || Math.abs(goal - value) < 1e-4 ? goal : value + (goal - value) * (1 - Math.exp(-dt / tau)));
  const say = (line) => status && (status.textContent = line);
  const done = ([m, p]) => readoutOf(MODES[m], p, "done");

  // a request always answers at once: a running pass gives way (the in-feed releases and the carriage eases home),
  // the lever swings, and the copy is cut once it has settled
  function go(m, p, run, tour = false) {
    let halted = false;
    if (pass && !tour) {
      const a = passAt(clock - pass.start, MODES[pass.mode], pass.pruned);
      abort = { start: clock, c: a.c, feed: a.feed, spin: a.spin };
      if (a.at !== -2) cut = [pass.mode, pass.pruned, Math.max(0, a.at)];
      pass = null;
      halted = true;
    }
    const changed = m !== mode || p !== pruned;
    if (!changed && !run && !halted) return;
    mode = m;
    pruned = p;
    waiting = tour;
    startAt = Math.max(abort ? abort.start + ABORT : clock, clock + (changed && !still.matches ? SETTLE : 0));
    const name = `${NAMES[m]}${p ? " pruned to one feature" : ""}`;
    lines = [readoutOf(MODES[m], p, "done")[0], changed ? `lever to ${NAMES[m]}${p ? " · pruned" : ""}` : "pulling the handle"];
    say(`${changed ? "mode" : "cutting"} ${name}`);
  }
  function begin() {
    startAt = -1;
    if (still.matches) {
      cut = [mode, pruned, 0];
      lines = done(cut);
      say(lines.join(". "));
    } else pass = { start: clock, mode, pruned, prev: cut, tour: waiting };
  }
  const prune = () => go(0, !(pruned && mode === 0), false);

  function draw(dt) {
    s = { c: 0, feed: 0 };
    let spin = 0;
    let swap = 1;
    let shown = cut;
    if (abort) {
      const t = ease((clock - abort.start) / ABORT);
      s = { c: abort.c * (1 - t), feed: abort.feed * (1 - t) };
      spin = abort.spin * (1 - t);
      if (t >= 1) abort = null;
    }
    if (pass) {
      const p = passAt(clock - pass.start, MODES[pass.mode], pass.pruned);
      s = { c: p.c, feed: p.feed };
      spin = p.spin;
      swap = p.swap;
      shown = p.at === -2 ? pass.prev : [pass.mode, pass.pruned, p.at];
      if (p.phase !== "swap") lines = readoutOf(MODES[pass.mode], pass.pruned, p.phase);
      if (p.done) {
        cut = [pass.mode, pass.pruned, 0];
        shown = cut;
        if (!pass.tour) next = clock + QUIET; // a copy someone asked for rests before the tour goes on
        pass = null;
        lines = done(cut);
        say(lines.join(". "));
      }
    }
    const key = shown.join();
    if (edgeKey !== key) {
      edgeKey = key;
      const list = slotsOf(keyPaths(BLANK_SH, edgeOf(MODES[shown[0]], shown[1], shown[2])));
      for (const els of blankSlots) write(els, list);
    }
    for (const g of blanks) set(g, "opacity", swap < 0.999 ? swap.toFixed(3) : "1");
    const text = lines.join("\n");
    if (readout && text !== shownText) {
      shownText = text;
      readout.replaceChildren(...lines.map((line) => Object.assign(document.createElement("span"), { textContent: line })));
    }

    const m = pass ? pass.mode : mode;
    const goals = { lever: LEVER.angles[mode], lift: m === 2 ? 1 : 0, back: m === 1 ? 1 : 0, prune: (pass ? pass.pruned : pruned && mode === 0) ? 1 : 0, stop: m === 2 ? 2.4 : 0 };
    goals.value = pass ? (clock - pass.start < PASS_END - 1.2 ? STRICT.base : grade(MODES[pass.mode], pass.pruned)) : grade(MODES[cut[0]], cut[1]);
    if (abort || (cut[2] && !pass)) goals.value = STRICT.base;
    for (const name in goals) eased[name] = follow(eased[name], goals[name], dt, name === "value" ? 0.3 : name === "stop" ? 0.25 : 0.18);
    spun = (spun + spin * dt * 7) % (Math.PI * 2);

    Object.assign(s, { lift: eased.lift, back: eased.back, prune: eased.prune, lever: eased.lever });
    for (const g of parts) set(g, "transform", move(g.dataset.part, s));
    for (const el of holds) {
      const name = el.dataset.hold;
      set(el, "transform", name[0] === "-" ? translateAlong(P, offsetOf(name.slice(1), s).map((v) => -v)) : move(name, s));
    }
    if (leverAt !== eased.lever) write(lever, slotsOf(leverPaths((leverAt = eased.lever))));
    if (pruneAt !== eased.prune) {
      pruneAt = eased.prune;
      pins.forEach((els, i) => write(els, pinSlots(pinPaths(i, i === KEEP ? PIN.h : PIN.h - (PIN.h - PIN.down) * pruneAt))));
    }
    const coil = coilOf(s.feed);
    set(back, "d", coil.back);
    set(front, "d", coil.front);
    set(needle, "d", needleAt(eased.value));
    set(stop, "d", stopPointer(eased.stop));
    set(adjust, "d", adjusterPointer(eased.back * 2.2, ADJ_TOP));
    set(red, "data-on", spin > 0.05 ? "red" : "off");
    set(green, "data-on", spin > 0.05 ? "off" : "green");
    if (spin > 0) {
      write(teeth, bucketsOf(wheelTeeth(spun)));
      set(spokes, "d", brushSpokes(spun * 0.8));
    }
    return Boolean(pass || abort) || startAt >= 0 || Object.keys(goals).some((name) => Math.abs(eased[name] - goals[name]) > 1e-4);
  }

  function tour() {
    if (still.matches || pass || abort || startAt >= 0 || clock < next) return;
    step = (step + 1) % TOUR.length;
    go(...TOUR[step], true, true);
    next = clock + SETTLE + PASS_END + HOLD;
  }
  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    clock += dt;
    if (startAt >= 0 && clock >= startAt) begin();
    tour();
    const moving = draw(dt);
    frame = visible && (moving || !still.matches) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (frame || !visible) return;
    prev = 0;
    frame = requestAnimationFrame(tick);
  };
  const touch = () => {
    next = clock + QUIET;
    run();
  };

  // the lever knob, the pruning bolt and the handle are the targets, each at least 22 css px around
  const hit = (event) => {
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const u = vb.width / box.width;
    const p = [(event.clientX - box.left) * u, (event.clientY - box.top) * u];
    const r = Math.max(16, 22 * u);
    let best = null;
    let near = r;
    for (const name of ["lever", "bolt", "handle"]) {
      const [x, y] = targetOf(name, s);
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < near) (near = d), (best = name);
    }
    return best;
  };
  let hot = null;
  const hover = (name) => {
    if (hot === name) return;
    if (hot) set(ctl[hot], "data-hot", null);
    hot = name;
    if (hot) set(ctl[hot], "data-hot", "");
    set(stage, "data-target", hot);
  };
  const onMove = (event) => event.pointerType !== "touch" && hover(hit(event));
  const onLeave = () => hover(null);
  const onClick = (event) => {
    const name = hit(event);
    if (!name) return;
    touch();
    if (name === "lever") go((mode + 1) % 3, false, false);
    else if (name === "bolt") prune();
    else go(mode, pruned, true);
  };
  const onKey = (event) => {
    const key = event.key;
    const m = "123".indexOf(key) + 1 || (/Right|Up/.test(key) ? Math.min(3, mode + 2) : /Left|Down/.test(key) ? Math.max(1, mode) : 0);
    if (m) go(m - 1, false, false);
    else if (key === " " || key === "Enter") go(mode, pruned, true);
    else if (key === "p" || key === "P") prune();
    else return;
    event.preventDefault();
    touch();
  };
  const onFocus = () => say(lines.join(". "));
  const on = [["click", onClick], ["keydown", onKey], ["focus", onFocus], ["pointermove", onMove], ["pointerleave", onLeave]];
  for (const [type, fn] of on) stage.addEventListener(type, fn);
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    run();
  }, { rootMargin: "120px 0px" });
  io.observe(stage);
  still.addEventListener?.("change", run);
  return () => {
    io.disconnect();
    if (frame) cancelAnimationFrame(frame);
    for (const [type, fn] of on) stage.removeEventListener(type, fn);
    still.removeEventListener?.("change", run);
  };
}
