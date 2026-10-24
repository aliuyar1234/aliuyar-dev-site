// Fig 6 live: moves the patch cord between taps, flips the encoder toggle, turns the cohort knob and lets the meters settle.
// Every moving part is redrawn from view.mjs, the same module the static art is drawn with; the numbers come from the
// compact tables art.mjs writes into data-rig.
import { iso } from "../kit/iso-kit.mjs";
// named imports, so the bundle keeps only the parts of the rig that move
import { BRAIN_BASE_H, CARD_X, KNOB as KNOB_AT, KNOB_ANGLES, P, PITCH, plateZ, plugFoot, SELECT_H, SOCKET_TOP, socketAt, STACK, STRIP, TOGGLE, TOGGLE_ANGLES } from "./rig.mjs";
const R = { BRAIN_BASE_H, CARD_X, KNOB: KNOB_AT, KNOB_ANGLES, P, PITCH, plateZ, plugFoot, SELECT_H, SOCKET_TOP, socketAt, STACK, STRIP, TOGGLE, TOGGLE_ANGLES };
import * as V from "./view.mjs";
import { tapReadout, seatingReadout, cellReadout, tapText, cellText, BLOCKS, POOLED } from "./labels.mjs";

const TOUR_DELAY = 1600; // ms before the tour starts
const IDLE_MS = 9000; // after the last touch, the tour resumes this long later
const NEEDLE = { w: 9, z: 0.55 }; // meter movements: a damped spring that overshoots a little
const LEVER = { w: 26, z: 0.8 };
const KNOB = { w: 13, z: 1 };

export function mount(root) {
  const stage = root.querySelector(".mt-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg || !stage.dataset.rig) return () => {};
  const data = JSON.parse(stage.dataset.rig);
  const q = (sel) => svg.querySelector(sel);
  const refs = {
    plug: q("[data-plug]"),
    cord: Object.fromEntries([...svg.querySelectorAll("[data-cord] [data-k]")].map((el) => [el.dataset.k, el])),
    roi: [0, 1, 2, 3].map((i) => q(`[data-needle="meter${i}"]`)),
    galvo: [0, 1].map((i) => q(`[data-needle="galvo${i}"]`)),
    band: [0, 1].map((i) => q(`[data-band="galvo${i}"]`)),
    grings: [...svg.querySelectorAll("[data-gring]")],
    lamps: [...svg.querySelectorAll("[data-lamp]")],
    lever: [...svg.querySelectorAll("[data-lever] [data-part]")].map((g) => Object.fromEntries([...g.children].map((el) => [el.dataset.k, el]))),
    pointer: q("[data-pointer]"),
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

  // ---------------------------------------------------------------- state
  const spring = (x) => ({ x, v: 0, to: x });
  const cells = data.cells;
  const rest = data.rest;
  const valuesAt = (b, s) => data.profile.map((m) => m[s][b]);
  const bandOf = (f) => f.ci || [f.value, f.value]; // the six-cell mean has no CI: its band closes on the needle
  const memo = { model: 0, lang: 0 }; // the last single cell, for leaving the pooled position
  const st = {
    block: rest.block,
    state: rest.state,
    cell: rest.cell,
    mode: "tap", // which readout: the last thing changed
    foot: R.socketAt(rest.block, rest.state),
    flight: null,
    roi: valuesAt(rest.block, rest.state).map(spring),
    galvo: [cells[rest.cell].semantic.value, cells[rest.cell].auditory.value].map(spring),
    band: [cells[rest.cell].semantic, cells[rest.cell].auditory].map((f) => bandOf(f).map(spring)),
    lever: spring(R.TOGGLE_ANGLES[cells[rest.cell].model]),
    knob: spring(R.KNOB_ANGLES[cells[rest.cell].lang]),
  };
  const springs = () => [...st.roi, ...st.galvo, ...st.band.flat(), st.lever, st.knob];
  const step = (s, { w, z }, dt) => {
    s.v += (w * w * (s.to - s.x) - 2 * z * w * s.v) * dt;
    s.x += s.v * dt;
  };
  const snap = () => springs().forEach((s) => ((s.x = s.to), (s.v = 0)));

  // ---------------------------------------------------------------- drawing
  let leverDrawn = null;
  let footDrawn = null;
  function draw() {
    if (footDrawn !== st.foot) {
      footDrawn = st.foot;
      set(refs.plug, "transform", V.plugOffset(st.foot));
      const [piece] = V.cordPieces(st.foot);
      set(refs.cord.body, "d", piece.body);
      set(refs.cord.shine, "d", piece.wide ? piece.shine : "");
      set(refs.cord.shade, "d", piece.wide ? piece.shade : "");
      set(refs.cord.edges, "d", piece.edges);
    }
    st.roi.forEach((s, i) => set(refs.roi[i], "d", V.roiNeedle(i, s.x)));
    st.galvo.forEach((s, i) => set(refs.galvo[i], "d", V.galvoNeedle(i, s.x)));
    st.band.forEach(([lo, hi], i) => set(refs.band[i], "d", V.galvoBand(i, [lo.x, hi.x])));
    const deg = Math.round(st.lever.x * 4) / 4;
    if (deg !== leverDrawn) {
      leverDrawn = deg;
      V.lever(deg).parts.forEach((part, i) => {
        const keys = refs.lever[i];
        if (keys) for (const key of V.SOLID_KEYS) set(keys[key], "d", V.solidD(part.paths, key));
      });
    }
    set(refs.pointer, "d", V.knobPointer(st.knob.x));
  }
  // the parts that switch rather than move: status lamps and the winners' card lamps
  function lamps() {
    const c = cells[st.cell];
    for (const el of refs.grings) set(el, "data-sel", Number(el.dataset.gring.split("-")[1]) === st.cell ? "" : null);
    for (const el of refs.lamps) {
      const [b, s, f] = el.dataset.lamp.split("-").map(Number);
      const list = f ? c.winners.auditory : c.winners.semantic;
      set(el, "data-on", list.some(([lb, ls]) => lb === b && ls === s) ? "" : null);
    }
  }
  function readout() {
    const text = st.mode === "cell" ? cellReadout(cells[st.cell]) : st.flight ? seatingReadout(st.block, st.state) : tapReadout(st.block, st.state, valuesAt(st.block, st.state));
    if (refs.readout && refs.readout.textContent !== text) refs.readout.textContent = text;
  }
  const announce = () => {
    if (refs.status) refs.status.textContent = st.mode === "cell" ? cellText(cells[st.cell]) : tapText(st.block, st.state, valuesAt(st.block, st.state));
  };

  // ---------------------------------------------------------------- motion
  let frame = 0;
  let prev = 0;
  let visible = false;
  function tick(now) {
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
    prev = now;
    const f = st.flight;
    if (f) {
      f.t = Math.min(1, f.t + dt / f.dur);
      const foot = R.plugFoot(f.from, f.to, f.t);
      // retargeted in the air: start from the height it was at
      if (f.h0) foot[2] = Math.max(foot[2], R.SOCKET_TOP + f.h0 * Math.max(0, 1 - f.t / 0.25));
      st.foot = foot;
      // unplugged, the meters fall back to zero; seated, they read the new tap
      if (f.t >= 1) {
        st.flight = null;
        st.foot = f.to;
        valuesAt(st.block, st.state).forEach((v, i) => (st.roi[i].to = v));
        readout();
        if (f.speak) announce();
      }
    }
    for (const s of st.roi) step(s, NEEDLE, dt);
    for (const s of st.galvo) step(s, NEEDLE, dt);
    for (const [lo, hi] of st.band) step(lo, KNOB, dt), step(hi, KNOB, dt);
    step(st.lever, LEVER, dt);
    step(st.knob, KNOB, dt);
    draw();
    const moving = st.flight || springs().some((s) => Math.abs(s.to - s.x) > 1e-5 || Math.abs(s.v) > 1e-4);
    if (!moving) snap(), draw();
    frame = visible && moving ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      prev = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // ---------------------------------------------------------------- commands
  let speak = false; // only what a person did is announced; the tour stays quiet
  function patch(block, state) {
    block = (block + BLOCKS) % BLOCKS;
    state = (state + 4) % 4;
    st.mode = "tap";
    if (block === st.block && state === st.state && !st.flight) return readout();
    const to = R.socketAt(block, state);
    st.block = block;
    st.state = state;
    if (still.matches) {
      st.flight = null;
      st.foot = to;
      valuesAt(block, state).forEach((v, i) => (st.roi[i].to = v));
      snap();
      draw();
      readout();
      if (speak) announce();
      return;
    }
    const from = [st.foot[0], st.foot[1], R.SOCKET_TOP];
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    st.flight = { from, to, t: 0, dur: 0.75 + dist / 140, h0: st.foot[2] - R.SOCKET_TOP, speak };
    st.roi.forEach((s) => (s.to = 0));
    readout();
    run();
  }
  function select(index) {
    st.cell = (index + cells.length) % cells.length;
    st.mode = "cell";
    const c = cells[st.cell];
    if (st.cell !== POOLED) (memo.model = c.model), (memo.lang = c.lang);
    st.galvo[0].to = c.semantic.value;
    st.galvo[1].to = c.auditory.value;
    [c.semantic, c.auditory].forEach((f, i) => {
      const [lo, hi] = bandOf(f);
      st.band[i][0].to = lo;
      st.band[i][1].to = hi;
    });
    st.lever.to = R.TOGGLE_ANGLES[c.model];
    st.knob.to = R.KNOB_ANGLES[c.lang];
    lamps();
    readout();
    if (speak) announce();
    if (still.matches) snap(), draw();
    else run();
  }
  // the toggle and the knob are ganged at the pooled position: centre and all go together
  const flipModel = () => {
    const c = cells[st.cell];
    select(st.cell === POOLED ? memo.lang : (1 - c.model) * 3 + c.lang);
  };
  const nextLang = () => {
    const c = cells[st.cell];
    select(st.cell === POOLED ? memo.model * 3 : c.lang === 2 ? POOLED : c.model * 3 + c.lang + 1);
  };

  // ---------------------------------------------------------------- the idle tour
  let tourAt = 0;
  let timer = 0;
  let touring = false;
  function tourStep() {
    if (!visible || still.matches) return;
    const item = data.tour[tourAt];
    tourAt = (tourAt + 1) % data.tour.length;
    let busy = 0.6;
    if (item.kind === "tap") {
      const to = R.socketAt(item.block, item.state);
      busy = 0.75 + Math.hypot(to[0] - st.foot[0], to[1] - st.foot[1]) / 140;
      patch(item.block, item.state);
    } else select(item.cell);
    timer = setTimeout(tourStep, (busy + item.hold) * 1000);
  }
  function startTour(delay) {
    clearTimeout(timer);
    touring = !still.matches;
    if (touring && visible) timer = setTimeout(tourStep, delay);
  }
  function touch() {
    clearTimeout(timer);
    touring = false;
    if (!still.matches) timer = setTimeout(() => startTour(0), IDLE_MS);
  }

  // ---------------------------------------------------------------- pointer and keyboard
  const sockets = [];
  for (let b = 0; b < BLOCKS; b++) for (let s = 0; s < 4; s++) sockets.push({ b, s, at: iso(R.socketAt(b, s), R.P) });
  const toggleAt = iso([R.TOGGLE.x, R.TOGGLE.y, R.SELECT_H], R.P);
  const knobAt = iso([R.KNOB.x, R.KNOB.y, R.BRAIN_BASE_H + 2], R.P);
  const brainAt = iso([R.STACK.cx, R.STACK.cy, R.plateZ(3)], R.P);
  // the socket field's outline on screen: a tap anywhere inside it takes the nearest socket, so a phone finger never misses
  const x0 = R.CARD_X(0) - R.PITCH / 2;
  const x1 = R.CARD_X(BLOCKS - 1) + R.PITCH / 2;
  const field = [[x0, R.STRIP.y0 - 2], [x1, R.STRIP.y0 - 2], [x1, R.STRIP.y1 + 2], [x0, R.STRIP.y1 + 2]].map(([x, y]) => iso([x, y, R.SOCKET_TOP], R.P));
  const side = (p) => field.map((a, i) => Math.sign((field[(i + 1) % 4][0] - a[0]) * (p.y - a[1]) - (field[(i + 1) % 4][1] - a[1]) * (p.x - a[0])));
  const inField = (p) => Math.abs(side(p).reduce((sum, v) => sum + v, 0)) === 4;
  function targetAt(event) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    const d = (a) => Math.hypot(p.x - a[0], p.y - a[1]);
    if (inField(p)) {
      let best = null;
      for (const socket of sockets) {
        const dist = d(socket.at);
        if (!best || dist < best.dist) best = { kind: "socket", socket, dist };
      }
      return best;
    }
    // controls keep at least about 14 CSS px of reach at any card width
    const reach = 14 / Math.max(1e-6, m.a);
    if (d(toggleAt) < Math.max(18, reach)) return { kind: "model" };
    if (d(knobAt) < Math.max(10, reach) || d(brainAt) < 18) return { kind: "lang" };
    return null;
  }
  const onClick = (event) => {
    if (event.button) return;
    const hit = targetAt(event);
    if (!hit) return;
    touch();
    speak = true;
    if (hit.kind === "socket") patch(hit.socket.b, hit.socket.s);
    else if (hit.kind === "model") flipModel();
    else nextLang();
    speak = false;
  };
  const onMove = (event) => {
    stage.style.cursor = targetAt(event) ? "pointer" : "";
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    speak = true;
    if (key === "ArrowLeft") patch(st.block - 1, st.state);
    else if (key === "ArrowRight") patch(st.block + 1, st.state);
    else if (key === "ArrowUp") patch(st.block, st.state - 1);
    else if (key === "ArrowDown") patch(st.block, st.state + 1);
    else if (key === "m" || key === "M") flipModel();
    else if (key === "l" || key === "L") nextLang();
    else if (key === "Home") patch(rest.block, rest.state), select(rest.cell);
    else if (key === "Escape") return (speak = false), startTour(0);
    else return (speak = false);
    speak = false;
    event.preventDefault();
    touch();
  };
  const onFocus = () => announce();
  stage.addEventListener("click", onClick);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("focus", onFocus);
  const onMotion = () => {
    if (still.matches) {
      clearTimeout(timer);
      touring = false;
      if (st.flight) (st.foot = st.flight.to), (st.flight = null), valuesAt(st.block, st.state).forEach((v, i) => (st.roi[i].to = v));
      snap();
      draw();
    } else startTour(TOUR_DELAY);
  };
  still.addEventListener?.("change", onMotion);

  const io = new IntersectionObserver(
    (entries) => {
      const was = visible;
      visible = entries[entries.length - 1].isIntersecting;
      if (visible && !was) {
        run();
        if (touring) startTour(tourAt ? 600 : TOUR_DELAY);
        else if (!still.matches) timer = setTimeout(() => startTour(0), IDLE_MS);
      } else if (!visible) clearTimeout(timer);
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  touring = !still.matches;
  lamps();
  draw();

  return () => {
    io.disconnect();
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("focus", onFocus);
    still.removeEventListener?.("change", onMotion);
  };
}
