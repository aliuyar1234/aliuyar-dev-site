// Fig 14 live: plays the editing-bench timeline. Every part is a pure function of tour time T (model.mjs).
import { translateAlong } from "../kit/iso-kit.mjs";
import { poseAt, cellOf, chipAfter, STOPS, STILL, TOTAL, PRODUCTIVE } from "./model.mjs";
import { P, CELL_MARKS, rulesAt, CELL, cellShift, periodShift, windowsOf, packSolid, crankOf, spanOf, SCREEN_X, screenY, screenLine, screenFrame, flagOf, armOf, stackOf, stemOf, chipMarks, chipShift } from "./scene.mjs";

const IDLE_MS = 8000; // a held stop waits this long, then the tour resumes
const TOUR_DELAY = 1.4;
const RATE = 1.5; // a click plays its segment at most this fast
const DIP = 180; // ms each way when a jump cuts instead of playing
const CRANK_PX = 0.016; // seconds of tour per pixel of sideways drag
const KEYS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "outline"];

export function mount(root) {
  const stage = root.querySelector(".fs-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const q = (sel) => svg.querySelector(sel);
  const qa = (sel) => [...svg.querySelectorAll(sel)];
  const kids = (el) => {
    const out = {};
    if (el) for (const node of el.querySelectorAll("[data-p]")) out[node.dataset.p] = node;
    return out;
  };
  // the static art leaves out empty child paths; live adds each one once, in paint order, before `next`
  const add = (parent, p, key, cls, attr, value, next) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("class", cls);
    el.setAttribute(attr, value);
    el.setAttribute("data-p", key);
    parent.insertBefore(el, next || null);
    return (p[key] = el);
  };
  const CHILD = { s0: ["iso-shade", "data-shade", "0"], s1: ["iso-shade", "data-shade", "1"], s2: ["iso-shade", "data-shade", "2"], s3: ["iso-shade", "data-shade", "3"], crease: ["iso-line iso-crease", "data-tone", "faint"] };
  const solid = (id) => {
    const g = q(`[data-d="${id}"]`);
    const p = kids(g);
    let prev = p.fill;
    if (g) for (const key of KEYS) prev = p[key] || (CHILD[key] ? add(g, p, key, ...CHILD[key], prev.nextSibling) : prev);
    return p;
  };
  const byKey = (sel, key) => {
    const out = [];
    for (const el of qa(sel)) out[Number(el.dataset[key])] = { el, p: kids(el) };
    return out;
  };
  const refs = {
    period: q("[data-period]"),
    cells: byKey("[data-cell]", "cell").map((c) => {
      // the static art carries only the marks its frame shows: add the rest, in paint order
      CELL_MARKS.forEach(([key, cls, tone, free], index) => {
        if (!c.p[key]) add(c.el, c.p, key, cls, "data-tone", tone, CELL_MARKS.slice(index + 1).map(([k2]) => c.p[k2]).find(Boolean));
        if (free) c.p[key].setAttribute("data-free", "");
      });
      return c;
    }),
    screens: byKey("[data-scr]", "scr"),
    spans: Object.fromEntries(qa("[data-span]").map((el) => [el.dataset.span, { el, p: kids(el) }])),
    wins: byKey("[data-win]", "win"),
    cranks: [solid("crank0"), solid("crank1")],
    packs: [solid("pack0"), solid("pack1")],
    grips: [q('[data-grip="0"]'), q('[data-grip="1"]')],
    counter: q("[data-counter]"),
    flagArm: solid("flagArm"),
    flagPlate: q('[data-d="flagPlate"]'),
    flagPlateP: solid("flagPlate"),
    arm: solid("arm"),
    knob: solid("knob"),
    lamp: q('[data-lamp="green"]'),
    kpi: q('[data-lamp="kpi"]'),
    stacks: PRODUCTIVE.map((i) => ({ i, stack: solid(`stack${i}`), stem: solid(`stem${i}`), anchor: q(`[data-d="stem${i}"]`) })),
    chip: q("[data-chip]"),
    chipBody: q("[data-chipbody]"),
    marks: q("[data-marks]"),
    chipPin: solid("chipPin"),
    readout: root.querySelector("[data-readout]"),
    status: root.querySelector("[data-status]"),
  };
  refs.markRules = refs.marks && refs.marks.querySelector("[data-tone='lo']");
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
  const paint = (p, paths) => {
    for (const key of KEYS) {
      const value = !paths ? "" : key[0] === "s" && key.length === 2 ? paths.shades[Number(key[1])] || "" : paths[key] || "";
      set(p[key], "d", value);
    }
  };
  const op = (v) => (v >= 0.995 ? null : v.toFixed(2));

  let T = STILL;
  let goal = T;
  let mode = still.matches ? "hold" : "tour"; // tour | play | hold
  let wait = TOUR_DELAY;
  let cutting = false;
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  let dip = 0;
  let lastS = NaN;
  let lastStacks = "";
  let lastStems = "";

  function draw() {
    const pose = poseAt(T);
    const s = pose.s;
    // film on the bench line: the frame-line pattern slides one pitch and repeats; each frame cell is one step
    set(refs.period, "transform", periodShift(s));
    const lo = Math.floor(s) - 19;
    refs.cells.forEach((c, j) => {
      if (!c) return;
      const n = lo + ((((j - lo) % 26) + 26) % 26);
      const v = cellOf(n, pose);
      set(c.el, "transform", cellShift(s, n));
      const o = { r: v.rules, s: v.safe, t: v.tape, x: v.x };
      for (const key in o) {
        set(c.p[key], "d", o[key] > 0.005 ? (key === "r" ? rulesAt(n) : key === "s" ? rulesAt(n + 7919) : CELL[key === "t" ? "tape" : "x"]) : "");
        set(c.p[key], "opacity", op(o[key]));
      }
    });
    // the viewer screen: the frame in the gate, enlarged, with its neighbours sliding past
    const r = Math.round(s);
    for (let k = -1; k <= 1; k++) {
      const n = r + k;
      const slot = refs.screens[((n % 3) + 3) % 3];
      if (!slot) continue;
      if (slot.el.dataset.n !== String(n)) {
        slot.el.dataset.n = String(n);
        const f = screenFrame(n);
        set(slot.p.perf, "d", f.perf);
        set(slot.p.text, "d", f.text);
      }
      set(slot.el, "transform", `translate(0 ${screenY(s, n).toFixed(2)})`);
      set(slot.p.line, "d", screenLine(s, n));
      const x = cellOf(n, pose).x;
      set(slot.p.x, "d", x > 0.005 ? SCREEN_X : "");
      set(slot.p.x, "opacity", op(x));
    }
    // reels, cranks and the free film between each pack and its roller
    if (s !== lastS) {
      lastS = s;
      for (const side of [0, 1]) {
        const spans = spanOf(side, s);
        for (const piece of ["far", "near"]) {
          const sp = refs.spans[`${side}${piece[0]}`];
          if (sp) set(sp.p.fill, "d", spans[piece].fill), set(sp.p.edges, "d", spans[piece].edges);
        }
        const w = windowsOf(side, s);
        const wp = refs.wins[side];
        if (wp) set(wp.p.holes, "d", w.holes), set(wp.p.pack, "d", w.pack), set(wp.p.edge, "d", w.edge);
        paint(refs.packs[side], packSolid(side, s));
        const crank = crankOf(side, s);
        paint(refs.cranks[side], crank.arm);
        set(refs.grips[side], "transform", translateAlong(P, crank.at));
      }
    }
    if (refs.counter && refs.counter.textContent !== pose.counter) refs.counter.textContent = pose.counter;
    // the severity flag, the splicer's blade arm and the splice lamp
    const flag = flagOf(pose.flag);
    paint(refs.flagArm, flag.arm);
    paint(refs.flagPlateP, flag.plate);
    set(refs.flagPlate, "data-on", pose.flag > 0.5 ? "red" : null);
    const arm = armOf(pose.arm);
    paint(refs.arm, arm.solid);
    set(refs.arm.blades, "d", arm.blades);
    paint(refs.knob, arm.ball);
    set(refs.lamp, "data-on", pose.lamp ? "green" : null);
    set(refs.kpi, "data-on", pose.kpi ? "green" : null);
    // the stacks of pair cards on their stems' pins
    const key = pose.pairs.join(",");
    if (key !== lastStacks) {
      lastStacks = key;
      for (const { i, stack } of refs.stacks) {
        const st = stackOf(i, pose.pairs[i]);
        paint(stack, st.solid);
        set(stack.seams, "d", st.seams);
      }
    }
    // each pin's rod: split round a card coming down onto it, so the card hides the part inside its hole
    const c = pose.chip;
    const stemKey = `${key}|${c && c.down ? `${c.pin}:${c.at[2].toFixed(2)}` : ""}`;
    if (stemKey !== lastStems) {
      lastStems = stemKey;
      for (const { i, stem } of refs.stacks) {
        const rods = stemOf(i, pose.pairs[i], c);
        paint(stem, rods.below && rods.below.paths);
        if (c && c.pin === i) paint(refs.chipPin, rods.above && rods.above.paths);
      }
      if (!c || !c.down) paint(refs.chipPin, null);
    }
    // the cut frame in flight: drawn last in the air, just after its pin's stem once it is coming down onto it
    set(refs.chip, "opacity", c ? c.a.toFixed(2) : "0");
    if (c && refs.chip) {
      set(refs.chipBody, "transform", chipShift(c.at));
      set(refs.marks, "opacity", c.marks.toFixed(2));
      set(refs.markRules, "d", chipMarks(c.n).rules);
      const after = chipAfter(pose);
      const anchor = after ? refs.stacks.find((x) => x.i === c.pin).anchor : null;
      if (anchor && refs.chip.previousElementSibling !== anchor) anchor.after(refs.chip);
      else if (!anchor && refs.chip !== svg.lastElementChild) svg.appendChild(refs.chip);
    }
    if (refs.readout && refs.readout.textContent !== pose.readout) refs.readout.textContent = pose.readout;
  }
  const announce = () => {
    if (refs.status) refs.status.textContent = poseAt(T).readout;
  };

  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    let moving = false;
    if (!cutting && mode === "tour") {
      if (wait > 0) wait -= dt;
      else T += dt;
      moving = true;
      if (T >= TOTAL) cutTo(0, () => ((mode = "tour"), (wait = 0.6), run()));
    } else if (!cutting && mode === "play") {
      T = Math.min(goal, T + RATE * dt);
      if (T >= goal) arrive();
      else moving = true;
    }
    draw();
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
    if (still.matches) return;
    idle = setTimeout(() => {
      mode = "tour";
      wait = 0.4;
      run();
    }, IDLE_MS);
  }
  function takeOver() {
    clearTimeout(idle);
    if (mode === "tour") mode = "hold";
  }
  function playTo(target) {
    goal = target;
    if (still.matches) {
      T = goal;
      draw();
      arrive();
      return;
    }
    mode = "play";
    run();
  }
  // a jump that would skip motion is a short dip to the paper and back, never a raw snap
  function cutTo(target, then) {
    mode = "hold";
    if (still.matches) {
      T = target;
      draw();
      then();
      return;
    }
    cutting = true;
    svg.style.opacity = "0";
    clearTimeout(dip);
    dip = setTimeout(() => {
      T = target;
      draw();
      svg.style.opacity = "";
      cutting = false;
      then();
    }, DIP);
  }
  function step(dir) {
    if (cutting) return;
    takeOver();
    const from = mode === "play" ? goal : T;
    if (dir > 0) {
      const target = STOPS.find((x) => x > from + 1e-6);
      if (target === undefined) return cutTo(0, () => playTo(STOPS[0]));
      const before = [...STOPS].reverse().find((x) => x < target - 1e-6);
      if (before !== undefined && before > T + 1e-6) cutTo(before, () => playTo(target));
      else playTo(target);
    } else {
      const target = [...STOPS].reverse().find((x) => x < T - 1e-6);
      cutTo(target === undefined ? 0 : target, arrive);
    }
  }

  // drag sideways to crank the film by hand; vertical swipes stay with the page
  let press = null;
  let dragged = false;
  const onDown = (event) => {
    if (event.button && event.button !== 0) return;
    press = { x: event.clientX, y: event.clientY, T, id: event.pointerId, on: false };
    dragged = false;
  };
  const onMove = (event) => {
    if (!press || event.pointerId !== press.id || cutting) return;
    const dx = event.clientX - press.x;
    if (!press.on) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - press.y)) return;
      press.on = true;
      dragged = true;
      takeOver();
      mode = "hold";
      stage.setPointerCapture?.(event.pointerId);
      stage.dataset.drag = "";
    }
    T = Math.max(0, Math.min(TOTAL - 1e-3, press.T + dx * CRANK_PX));
    draw();
  };
  const onUp = (event) => {
    if (!press || event.pointerId !== press.id) return;
    if (press.on) {
      delete stage.dataset.drag;
      arrive();
    }
    press = null;
  };
  const onClick = (event) => {
    if (dragged) return void (dragged = false);
    if (event.button && event.button !== 0) return;
    step(1);
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (key === "ArrowRight" || key === " " || key === "Enter") step(1);
    else if (key === "ArrowLeft") step(-1);
    else if (key === "Home") {
      if (cutting) return;
      takeOver();
      cutTo(0, arrive);
    } else if (key === "Escape") {
      clearTimeout(idle);
      if (!still.matches && !cutting) {
        mode = "tour";
        wait = 0;
        run();
      }
    } else return;
    event.preventDefault();
  };
  const off = new AbortController();
  const on = (el, type, fn) => el.addEventListener?.(type, fn, { signal: off.signal });
  on(stage, "pointerdown", onDown);
  on(stage, "pointermove", onMove);
  on(stage, "pointerup", onUp);
  on(stage, "pointercancel", onUp);
  on(stage, "click", onClick);
  on(stage, "keydown", onKey);
  on(stage, "focus", announce);
  const onMotion = () => {
    if (still.matches) {
      clearTimeout(idle);
      T = goal = STILL;
      mode = "hold";
      draw();
    } else if (mode === "hold") arrive();
  };
  on(still, "change", onMotion);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  draw();

  return () => {
    io.disconnect();
    clearTimeout(idle);
    clearTimeout(dip);
    if (frame) cancelAnimationFrame(frame);
    off.abort();
  };
}
