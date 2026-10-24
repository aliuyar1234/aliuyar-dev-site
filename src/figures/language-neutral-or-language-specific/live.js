// Fig 5 live layer: the knobs pick a model, a language and a component; the lever fans the plates on their lazy tongs.
// It writes attributes on the parts the build drew; the numbers come from the table the build wrote into the stage.
import { axisVector } from "../kit/iso-kit.mjs";
import { P, G_FAN, plateZ, pitchOf, SLIDE_LIFT, BED_DIR, CHART } from "./world.mjs";
import * as Pt from "./parts.mjs";

const IDLE = 8000; // ms without a touch before the tour resumes
const STEP = 3400; // ms per tour step
const SWEEP = 2600; // ms for the recorder's gantry to cross the chart
const FAN = { stiffness: 40, damping: 12.65 }; // the fan's spring, the same one the audit replays (art.mjs FAN_SPRING)
const TOUR = [
  (s) => (s.c = 1),
  (s) => (s.c = 2),
  (s) => (s.t = 1),
  (s) => (s.t = 2),
  (s) => (s.m = 1),
  (s) => (s.t = 0),
  (s) => (s.c = 0),
  (s) => (s.fan = 0),
  (s) => ((s.fan = 1), (s.m = 0)),
];
const fix = (v) => Math.round(v * 100) / 100;
const shift = (v) => `translate(${fix(v[0])} ${fix(v[1])})`;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function mount(root) {
  const q = (sel) => root.querySelector(sel);
  const all = (sel) => [...root.querySelectorAll(sel)];
  const stage = q(".ls-stage");
  if (!stage) return () => {};
  const table = JSON.parse(stage.getAttribute("data-table"));
  const readout = q("[data-readout]");
  const status = q("[data-status]");

  const plates = all("[data-plate]").map((el) => {
    const cells = el.querySelector(".ls-cells");
    return { el, i: +el.getAttribute("data-plate"), geo: cells.getAttribute("data-geo"), lv: Pt.unpack(cells.getAttribute("data-lv")), layers: [...cells.querySelectorAll("[data-layer]")], front: 0 };
  });
  const hubs = all("[data-hub]").map((el) => ({ el, i: +el.getAttribute("data-hub") }));
  const tongs = [0, 1].map((side) => {
    const g = q(`[data-tong="${side}"]`);
    const part = (name) => g.querySelector(`[data-part="${name}"]`);
    return { side, back: part("tong-back"), front: part("tong-front"), feet: part("tong-feet"), ends: part("tong-ends"), pins: part("tong-pins") };
  });
  const lever = { el: q('[data-part="lever"]'), arm: q('[data-part="lever-arm"]'), ball: q('[data-part="lever-ball"]') };
  const selector = { el: q('[data-part="select"]'), pointer: q('[data-part="select-pointer"]') };
  const lang = { el: q('[data-part="lang"]'), pointer: q('[data-part="lang-pointer"]') };
  const slide = { el: q('[data-part="slide"]'), move: q('[data-move="slide"]') };
  const mirrors = all("[data-mirror]").map((el) => {
    const id = el.getAttribute("data-mirror");
    return { id, bus: id[0], row: +id[1], el };
  });
  const beams = all("[data-beam]").map((el) => ({ el, rule: Pt.BEAMS.find((b) => b.id === el.getAttribute("data-beam")) }));
  const rec = {
    shared: q('[data-part="trace-shared"]'),
    specific: q('[data-part="trace-specific"]'),
    reveal: q('[data-part="reveal"]'),
    rep: q('[data-part="rep"]'),
    gantry: q('[data-part="gantry"]'),
    pen: q('[data-part="pen"]'),
    pen2: q('[data-part="pen2"]'),
  };
  const needles = [0, 1, 2].map((j) => q(`[data-part="needle${j}"]`));

  const zv = axisVector(P, [0, 0, 1]);
  const xv = axisVector(P, [1, 0, 0]);
  const bv = axisVector(P, BED_DIR);
  const scaled = (v, s) => [v[0] * s, v[1] * s];
  const a1 = Pt.chartA(1);

  // what is asked, and what is shown
  const want = { m: 0, t: 0, c: 0, fan: 1 };
  const row0 = table[0];
  const shown = {
    share: 0, // 0 fanned, 1 stacked, as in the audit
    speed: 0,
    slide: 0,
    sel: Pt.SELECT_ANGLES[0],
    lang: Pt.LANG_ANGLES[0],
    lift: Object.fromEntries(mirrors.map((m) => [m.id, Pt.liftOf(m.bus, m.row, 0)])),
    needle: [row0.sem, row0.aud, row0.ctl],
  };
  let drawnShare = -1;
  let view = 0;
  let pair = 0;
  let sweep = { start: -1, row: row0 };

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  let raf = 0;
  let last = 0;
  let touched = -Infinity;
  let tourTimer = 0;
  let tourStep = 0;
  let drag = null;

  const rowOf = () => table[want.m * 3 + want.t];

  function writeCells() {
    const next = (want.m * 3 + want.t) * 3 + want.c;
    if (next === view) return;
    view = next;
    for (const p of plates) {
      const back = p.layers[1 - p.front];
      back.innerHTML = Pt.cellPaths(p.geo, p.lv, view);
      back.setAttribute("data-show", "");
      p.layers[p.front].removeAttribute("data-show");
      p.front = 1 - p.front;
    }
  }
  function writeReadout() {
    if (readout) readout.textContent = Pt.readoutOf(rowOf(), stage.clientWidth < 520);
  }
  function startSweep(now) {
    const row = rowOf();
    sweep = { start: now, row };
    rec.shared.setAttribute("d", Pt.curveD(row.depth, row.shared));
    rec.specific.setAttribute("d", Pt.curveD(row.depth, row.specific));
    rec.rep.setAttribute("d", `M${fix(Pt.chartA(row.layer / 12))} ${CHART.b1}v2.4`);
  }
  function apply() {
    for (const b of beams) b.rule.on(want.t) ? b.el.removeAttribute("data-off") : b.el.setAttribute("data-off", "");
    writeCells();
    const nextPair = want.m * 3 + want.t;
    if (nextPair !== pair) {
      pair = nextPair;
      startSweep(performance.now());
    }
    writeReadout();
    kick();
  }

  // the fan: plates, hubs, tongs and lever, drawn only when the share has moved
  function drawFan() {
    if (Math.abs(shown.share - drawnShare) < 1e-5) return;
    drawnShare = shown.share;
    const fan = 1 - shown.share;
    const g = pitchOf(fan);
    const offset = (i) => shift(scaled(zv, plateZ(i, g) - plateZ(i, G_FAN)));
    for (const p of plates) p.el.setAttribute("transform", offset(p.i));
    for (const h of hubs) h.el.setAttribute("transform", offset(h.i));
    for (const t of tongs) {
      Pt.writeSolid(t.back, Pt.tongLayer(t.side, g, "back"));
      Pt.writeSolid(t.front, Pt.tongLayer(t.side, g, "front"));
      Pt.writeSolid(t.feet, Pt.footBlocks(t.side, g));
      const pins = Pt.tongPins(t.side, g);
      t.ends.setAttribute("d", Pt.dotsD(pins.ends, 0.5 * K));
      t.pins.setAttribute("d", Pt.dotsD(pins.centres, 0.75 * K));
    }
    const lv = Pt.leverOf(Pt.leverAngle(fan));
    Pt.writeSolid(lever.arm, lv.arm);
    Pt.writeSolid(lever.ball, lv.ball);
  }
  const K = Math.hypot(...axisVector(P, [0, 0, 1])) / Math.cos(Math.PI / 6);

  // everything else, written every frame something moves
  function draw(now) {
    drawFan();
    selector.pointer.setAttribute("d", Pt.selectorPointer(shown.sel));
    lang.pointer.setAttribute("d", Pt.langPointer(shown.lang));
    slide.move.setAttribute("transform", shift(scaled(zv, shown.slide)));
    for (const m of mirrors) m.el.setAttribute("transform", shift(scaled(zv, shown.lift[m.id])));
    needles.forEach((el, j) => el.setAttribute("d", Pt.needleD(j, shown.needle[j])));
    // the gantry crosses the chart while the pens redraw
    const row = sweep.row;
    const p = sweep.start < 0 ? 1 : Math.min(1, (now - sweep.start) / SWEEP);
    const along = ease(p);
    const a = Pt.chartA(along);
    rec.reveal.setAttribute("d", Pt.revealD(a));
    rec.gantry.setAttribute("transform", shift(scaled(xv, a - a1)));
    const b0 = Pt.chartB(row0.shared[row0.shared.length - 1]);
    const b1 = Pt.chartB(row0.specific[row0.specific.length - 1]);
    rec.pen.setAttribute("transform", shift(scaled(bv, Pt.chartB(Pt.valueAt(row.depth, row.shared, along)) - b0)));
    rec.pen2.setAttribute("transform", shift(scaled(bv, Pt.chartB(Pt.valueAt(row.depth, row.specific, along)) - b1)));
    return p < 1;
  }

  // calm motion toward what is asked: the fan on its spring, the rest on exponential follows
  function step(dt, now) {
    const instant = still.matches;
    const follow = (from, to, tau) => (instant ? to : from + (to - from) * (1 - Math.exp(-dt / tau)));
    const row = rowOf();
    const goal = 1 - want.fan;
    if (instant) (shown.share = goal), (shown.speed = 0);
    else {
      const h = dt / 1000 / 4;
      for (let j = 0; j < 4; j++) {
        shown.speed += ((goal - shown.share) * FAN.stiffness - shown.speed * FAN.damping) * h;
        shown.share = Math.min(1, Math.max(0, shown.share + shown.speed * h));
      }
    }
    shown.slide = follow(shown.slide, want.m * SLIDE_LIFT, 300);
    shown.sel = follow(shown.sel, Pt.SELECT_ANGLES[want.c], 220);
    shown.lang = follow(shown.lang, Pt.LANG_ANGLES[want.t], 220);
    for (const m of mirrors) shown.lift[m.id] = follow(shown.lift[m.id], Pt.liftOf(m.bus, m.row, want.t), 260);
    const target = [row.sem, row.aud, row.ctl];
    shown.needle = shown.needle.map((v, j) => follow(v, target[j], 600));
    if (instant && sweep.start >= 0) sweep.start = now - SWEEP;
    const sweeping = draw(now);
    const moving =
      Math.abs(shown.share - goal) > 1e-4 ||
      Math.abs(shown.speed) > 1e-3 ||
      Math.abs(shown.slide - want.m * SLIDE_LIFT) > 1e-2 ||
      Math.abs(shown.sel - Pt.SELECT_ANGLES[want.c]) > 0.05 ||
      Math.abs(shown.lang - Pt.LANG_ANGLES[want.t]) > 0.05 ||
      mirrors.some((m) => Math.abs(shown.lift[m.id] - Pt.liftOf(m.bus, m.row, want.t)) > 1e-2) ||
      shown.needle.some((v, j) => Math.abs(v - target[j]) > 2e-4);
    if (!moving) {
      // settle exactly on the asked pose, then the frame loop stops
      shown.share = goal;
      shown.speed = 0;
      shown.slide = want.m * SLIDE_LIFT;
      shown.sel = Pt.SELECT_ANGLES[want.c];
      shown.lang = Pt.LANG_ANGLES[want.t];
      for (const m of mirrors) shown.lift[m.id] = Pt.liftOf(m.bus, m.row, want.t);
      shown.needle = target;
      draw(now);
    }
    return moving || sweeping;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(64, last ? now - last : 16);
    last = now;
    const busy = step(dt, now);
    if (busy && visible) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      if (!busy) drawFan();
      schedule();
    }
  }
  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  // the idle tour: one step every STEP ms once nobody has touched the figure for IDLE ms, timed without a frame loop
  function schedule() {
    clearTimeout(tourTimer);
    tourTimer = 0;
    if (!visible || still.matches || raf) return;
    const wait = Math.max(STEP, touched + IDLE - performance.now());
    tourTimer = setTimeout(() => {
      tourTimer = 0;
      if (!visible || still.matches) return;
      if (performance.now() - touched < IDLE) return schedule();
      TOUR[tourStep % TOUR.length](want);
      tourStep++;
      apply();
    }, wait);
  }
  function touch() {
    touched = performance.now();
    kick();
    schedule();
  }

  // controls
  const act = {
    model: () => (want.m = 1 - want.m),
    langNext: () => (want.t = (want.t + 1) % 3),
    langPrev: () => (want.t = (want.t + 2) % 3),
    compNext: () => (want.c = (want.c + 1) % 3),
    compPrev: () => (want.c = (want.c + 2) % 3),
    fan: () => (want.fan = want.fan > 0.5 ? 0 : 1),
  };
  // a user's action, and only that, is announced to screen readers
  const announce = () => status && (status.textContent = Pt.describe(rowOf(), want.c, want.fan));
  const run = (name) => {
    act[name]();
    touch();
    apply();
    announce();
  };
  const clicks = [
    [slide.el, "model"],
    [lang.el, "langNext"],
    [selector.el, "compNext"],
    [lever.el, "fan"],
  ];
  const handlers = [];
  const on = (el, type, fn, opts) => {
    if (!el) return;
    el.addEventListener(type, fn, opts);
    handlers.push(() => el.removeEventListener(type, fn, opts));
  };
  for (const [el, name] of clicks) {
    on(el, "click", (e) => {
      e.stopPropagation();
      if (name === "fan" && drag && drag.moved) return;
      run(name);
    });
    on(el, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        run(name);
      }
    });
  }
  on(stage, "keydown", (e) => {
    const keys = { m: "model", M: "model", ArrowRight: "langNext", ArrowLeft: "langPrev", ArrowDown: "compNext", ArrowUp: "compPrev", f: "fan", F: "fan", " ": "fan" };
    const name = keys[e.key];
    if (!name) return;
    e.preventDefault();
    run(name);
  });
  // the lever can be dragged with a mouse or pen; a tap toggles it, so touch scrolling stays free
  on(lever.el, "pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    drag = { y: e.clientY, from: want.fan, moved: false, id: e.pointerId };
    lever.el.setPointerCapture(e.pointerId);
    lever.el.setAttribute("data-dragging", "");
  });
  on(lever.el, "pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    want.fan = Math.max(0, Math.min(1, drag.from - dy / 40));
    touch();
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    lever.el.removeAttribute("data-dragging");
    if (drag.moved) {
      want.fan = want.fan > 0.5 ? 1 : 0;
      apply();
      announce();
    }
    setTimeout(() => (drag = null), 0);
  };
  on(lever.el, "pointerup", release);
  on(lever.el, "pointercancel", release);
  on(stage, "pointerdown", touch);
  // a click near a small control counts as a click on it (the knobs are a few px across on a phone)
  on(stage, "click", (e) => {
    let best = null;
    for (const [el, name] of clicks) {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < 18 && (!best || d < best.d)) best = { d, name };
    }
    if (best) run(best.name);
  });

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) {
      kick();
      schedule();
    } else {
      clearTimeout(tourTimer);
      tourTimer = 0;
    }
  });
  io.observe(stage);
  const onMotion = () => {
    kick();
    schedule();
  };
  still.addEventListener("change", onMotion);
  addEventListener("resize", writeReadout);

  writeReadout();
  draw(performance.now());
  // the tour starts at once on a fresh page: the first step comes after STEP
  touched = performance.now() - IDLE;
  schedule();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(tourTimer);
    io.disconnect();
    still.removeEventListener("change", onMotion);
    removeEventListener("resize", writeReadout);
    for (const off of handlers) off();
  };
}
