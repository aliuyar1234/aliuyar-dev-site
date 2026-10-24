// Fig 1 live layer: runs the checkweigher model and writes attributes on the refs the build drew.
import { iso, axisVector, translateAlong, holdStill } from "../kit/iso-kit.mjs";
import { P, PUSH, KNOB, CONV, PLUG, STRIP } from "./world.mjs";
import * as M from "./model.mjs";
import { traySvg, placeAt, slatsD, journalSvg, stripOf, sheetD, curlSvg, SCREEN, gateU, KNOB_TOP, knobAngle } from "./parts.mjs";

const IDLE = 8;
const TOUR = [
  [3, (api) => api.setT(4)],
  [9, (api) => api.tamper()],
  [16, (api) => api.setT(5)],
  [22, (api) => api.plug(false, "tour")],
  [29, (api) => api.plug(true)],
  [34, (api) => api.setT(3)],
];
const TOUR_LOOP = 40;
const FEED = 0.5;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const fix = (v) => Math.round(v * 100) / 100;
const pathD = (a, b) => `M${fix(a[0])} ${fix(a[1])}L${fix(b[0])} ${fix(b[1])}`;
const tauText = (T) => `τ ${T}: a decision needs ${T} evidence slip${T === 1 ? "" : "s"}; ${M.SEQ.filter((n) => n < T).length} of ${M.SEQ.length} in the sequence are held`;

export function mount(root) {
  const q = (sel) => root.querySelector(sel);
  const all = (sel) => [...root.querySelectorAll(sel)];
  const stage = q(".hero-stage");
  const svg = q("svg");
  if (!stage || !svg) return () => {};
  const readout = q("[data-readout]");
  const status = q("[data-status]");
  const knob = q('[data-part="knob"]');
  const pointer = q('[data-part="pointer"]');
  const plugEl = q('[data-part="plug"]');
  const plugMove = q('[data-part="plug-move"]');
  const layer = { belt: q('[data-layer="belt"]'), stack: q('[data-layer="stack"]'), reject: q('[data-layer="reject"]') };
  const rod = q('[data-part="rod"]');
  const slats = all("[data-slats]").map((el) => [el, CONV[el.getAttribute("data-slats")]]);
  const journal = q('[data-part="journal"]');
  const sheet = q('[data-part="sheet"]');
  const sheetClip = q('[data-part="sheet-clip"]');
  const edges = q(".hero-edges");
  const curl = q('[data-part="curl"]');
  const digit = q('[data-part="reading"]');
  const cells = all(".hero-cell");
  const gate = q('[data-part="gate"]');
  const glow = { green: q('[data-glow="green"]'), red: q('[data-glow="red"]') };
  const leds = all(".hero-led");
  const eye = q('[data-part="eye"]');
  const printerLed = q('[data-part="printer-led"]');
  const jboxLed = q('[data-part="jbox-led"]');

  const st = M.createLine();
  const trays = new Map();
  for (const name of ["belt", "reject"])
    for (const el of layer[name].querySelectorAll("[data-tray]")) trays.set(+el.getAttribute("data-tray"), { el, inner: el.firstElementChild, layer: name, lit: null, clip: el.hasAttribute("clip-path") });

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let shownAngle = knobAngle(st.T);
  let lamp = M.redOf(st) ? 1 : 0;
  let plugAt = 0;
  let printedAt = -99;
  let ledAt = [-9, -9, -9, -9, -9];
  let curlKey = "";
  let touched = -1e9;
  let tourPlug = false;
  let clock = 0;
  let tourAt = 0;
  let tourStep = 0;
  const watch = new Set();
  let raf = 0;
  let last = 0;
  let visible = false;

  const say = (text) => status && (status.textContent = text);
  const writeReadout = () => readout && (readout.textContent = M.readoutOf(st));
  const writeDisplay = () => {
    const r = st.reading;
    const n = st.signal && r && r.n != null ? r.n : 0;
    digit.textContent = st.signal && r && !r.fault ? String(r.n) : "–";
    cells.forEach((cell, i) => cell.toggleAttribute("data-on", i < n));
  };

  const api = {
    setT(T, by) {
      const next = Math.max(M.T_MIN, Math.min(M.T_MAX, T));
      if (next === st.T) return;
      st.T = next;
      gate.setAttribute("d", `M${fix(gateU(next) - 0.65)} ${fix(SCREEN.v0 + 7.6)}h1.3`);
      knob.setAttribute("aria-valuenow", next);
      knob.setAttribute("aria-valuetext", tauText(next));
      writeReadout();
      if (by) say(`Tolerance τ ${next}: a decision needs ${next} evidence slip${next === 1 ? "" : "s"} to pass.`);
      if (still.matches) render(0);
    },
    tamper(by) {
      const tray = M.tamper(st);
      if (!tray) return by && say("No decision on the infeed carries evidence to strip.");
      if (by) {
        watch.add(tray.i);
        say(`Decision ${tray.i + 1} lost its ${tray.n0} evidence slips on the infeed.`);
      }
      if (still.matches) {
        for (let guard = 0; guard < 600 && (!tray.verdict || (tray.verdict === "held" && !tray.landed)); guard++) step(0.05);
        render(0);
      }
    },
    plug(on, by) {
      if (on === st.signal) return;
      tourPlug = by === "tour";
      M.setSignal(st, on);
      plugEl.setAttribute("aria-checked", String(on));
      writeDisplay();
      writeReadout();
      if (by && by !== "tour") say(on ? "Load-cell plug reseated: weighings read again." : "Load-cell plug pulled: no reading, so every decision is held.");
      if (still.matches) render(0);
    },
  };

  function step(dt) {
    for (const e of M.advance(st, dt)) {
      if (e.type === "emit") ledAt[e.i % 5] = st.tau;
      if (e.type === "weigh") {
        printedAt = st.tau;
        journal.innerHTML = journalSvg(st.lines);
        writeDisplay();
        writeReadout();
        if (watch.has(e.i)) {
          say(`Journal line ${st.counts.checked}, ${e.verdict}: ${e.fault ? "no reading" : `${e.n} slips against τ ${e.T}`}. Journal head ${M.headOf(st)}.`);
          watch.delete(e.i);
        }
      }
      if (e.type === "land")
        layer.stack.innerHTML = st.stack
          .slice(0, 2)
          .map((h, j) => `<g data-stack="${j}" transform="${placeAt([M.LAND_X, M.Y_END, M.BIN_TOP - j * 4])}">${traySvg(h.n)}</g>`)
          .reverse()
          .join("");
    }
  }

  function syncTrays() {
    const alive = new Set();
    const litI = M.litOf(st);
    for (const tray of st.trays) {
      alive.add(tray.i);
      let t = trays.get(tray.i);
      if (!t) {
        layer.belt.insertAdjacentHTML("beforeend", `<g data-tray="${tray.i}"><g>${traySvg(tray.n)}</g></g>`);
        const el = layer.belt.lastElementChild;
        t = { el, inner: el.firstElementChild, layer: "belt", lit: null, clip: false };
        trays.set(tray.i, t);
      }
      const pose = M.poseOf(st, tray);
      if (pose.layer !== t.layer) {
        layer[pose.layer].appendChild(t.el);
        t.layer = pose.layer;
      }
      t.inner.setAttribute("transform", placeAt(pose.p));
      const clip = Boolean(pose.emerging);
      if (clip !== t.clip) {
        clip ? t.el.setAttribute("clip-path", "url(#hero-slot)") : t.el.removeAttribute("clip-path");
        t.clip = clip;
      }
      const lit = tray.i === litI;
      if (lit !== t.lit) {
        t.el.querySelectorAll(".hero-lit").forEach((part) => part.toggleAttribute("data-lit", lit));
        t.lit = lit;
      }
      // stripped evidence lifts off its tray and fades
      if (tray.strippedAt != null) {
        const slips = t.el.querySelector(".hero-slips");
        const f = (st.tau - tray.strippedAt) / M.STRIP_OFF;
        if (slips && f >= 1) slips.remove();
        else if (slips) {
          slips.setAttribute("transform", translateAlong(P, [0, 0, 12 * (1 - (1 - f) ** 2)]));
          slips.setAttribute("opacity", fix(1 - ease(f)));
        }
      }
    }
    for (const [i, t] of trays) if (!alive.has(i)) (t.el.remove(), trays.delete(i));
  }

  function drawStrip(f) {
    const s = stripOf(st.counts.checked - 1 + f);
    const d = sheetD(s.bottom);
    sheet.setAttribute("d", d);
    sheetClip.setAttribute("d", d);
    edges.setAttribute("d", pathD(iso([STRIP.x0, STRIP.y, STRIP.top], P), iso([STRIP.x0, STRIP.y, s.bottom], P)) + pathD(iso([STRIP.x1, STRIP.y, STRIP.top], P), iso([STRIP.x1, STRIP.y, s.bottom], P)));
    const key = `${fix(s.bottom)}|${fix(s.r)}`;
    if (key !== curlKey) (curl.innerHTML = curlSvg(s.bottom, s.r)), (curlKey = key);
    journal.setAttribute("transform", translateAlong(P, [0, 0, STRIP.pitch * (1 - f)]));
  }

  function render(dt) {
    const calm = !dt;
    syncTrays();
    const reach = M.rodOf(st) * PUSH.stroke;
    rod.setAttribute("transform", translateAlong(P, [0, reach, 0]));
    holdStill(rod, axisVector(P, [0, reach, 0]));
    layer.stack.setAttribute("transform", placeAt([0, 0, M.stackOffset(st)]));
    const travel = M.SPEED * st.tau;
    for (const [el, conv] of slats) el.setAttribute("d", slatsD(conv, travel));
    drawStrip(calm && still.matches ? 1 : ease((st.tau - printedAt) / FEED));
    const target = knobAngle(st.T);
    shownAngle = calm ? target : target + (shownAngle - target) * Math.exp(-dt / 0.09);
    pointer.setAttribute("transform", `rotate(${fix(shownAngle)})`);
    const goal = st.signal ? 0 : 1;
    plugAt = calm ? goal : goal + (plugAt - goal) * Math.exp(-dt / 0.1);
    plugMove.setAttribute("transform", translateAlong(P, [PLUG.travel * plugAt, 0, 0]));
    const red = M.redOf(st) ? 1 : 0;
    lamp = calm ? red : lamp + (red - lamp) * (1 - Math.exp(-dt / 0.12));
    glow.red.style.opacity = fix(lamp);
    glow.green.style.opacity = fix(1 - lamp);
    leds.forEach((el, i) => el.toggleAttribute("data-on", st.tau - ledAt[i] < 0.3));
    eye.toggleAttribute("data-on", M.eyeOf(st));
    printerLed.toggleAttribute("data-on", st.tau - printedAt < 0.3);
    jboxLed.toggleAttribute("data-on", st.signal);
  }

  function frame(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;
    if (clock - touched > IDLE) {
      tourAt += dt;
      while (tourStep < TOUR.length && tourAt >= TOUR[tourStep][0]) TOUR[tourStep++][1](api);
      if (tourAt >= TOUR_LOOP) (tourAt = 0), (tourStep = 0);
    }
    step(dt);
    render(dt || 1e-6);
    raf = visible && !still.matches ? requestAnimationFrame(frame) : 0;
  }
  function run() {
    if (!raf && visible && !still.matches) raf = requestAnimationFrame((now) => ((last = now), (raf = requestAnimationFrame(frame))));
  }
  function halt() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  const takeOver = () => {
    touched = clock;
    tourAt = 0;
    tourStep = 0;
    if (tourPlug && !st.signal) api.plug(true);
  };

  // hit tests in screen pixels, so the knob and the plug stay easy to hit on a phone
  const centreKnob = iso([KNOB.x, KNOB.y, KNOB_TOP], P);
  const centrePlug = iso([PLUG.socket + 3.4, PLUG.y, PLUG.z], P);
  const near = (event, c, units) => {
    const m = svg.getScreenCTM();
    if (!m) return false;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    const reach = Math.max(units, 22 / Math.hypot(m.a, m.b));
    return Math.hypot(p.x - c[0], p.y - c[1]) < reach;
  };
  const kScale = Math.hypot(...axisVector(P, [1, 0, 0]));
  let drag = null;
  const onDown = (event) => {
    const part = near(event, centreKnob, (KNOB.dial + 2) * kScale) ? "knob" : near(event, centrePlug, 6 * kScale) ? "plug" : "stage";
    drag = { id: event.pointerId, x: event.clientX, T: st.T, moved: false, part };
    if (part === "knob") {
      knob.setAttribute("data-turning", "");
      stage.setPointerCapture?.(event.pointerId);
    }
  };
  const onMove = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 5) drag.moved = true;
    if (drag.part === "knob" && drag.moved) {
      takeOver();
      api.setT(drag.T + Math.round(dx / 18), true);
    }
  };
  const onUp = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const { part, moved } = drag;
    drag = null;
    knob.removeAttribute("data-turning");
    if (moved) return takeOver();
    if (part === "plug") {
      const on = !st.signal;
      touched = clock;
      tourAt = 0;
      tourStep = 0;
      return api.plug(on, true);
    }
    takeOver();
    part === "knob" ? api.setT(st.T >= M.T_MAX ? M.T_MIN : st.T + 1, true) : api.tamper(true);
  };
  const onCancel = () => {
    knob.removeAttribute("data-turning");
    drag = null;
  };
  const onKey = (event) => {
    const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    const onPlug = event.target.closest?.('[data-part="plug"]');
    const key = event.key;
    if (onPlug && (key === " " || key === "Enter")) {
      touched = clock;
      api.plug(!st.signal, true);
      return event.preventDefault();
    }
    if (key in steps) api.setT(st.T + steps[key], true);
    else if (key === "Home") api.setT(M.T_MIN, true);
    else if (key === "End") api.setT(M.T_MAX, true);
    else if (key === "p" || key === "P") {
      touched = clock;
      api.plug(!st.signal, true);
      return event.preventDefault();
    } else if (key === " " || key === "Enter" || key === "t" || key === "T") {
      if (event.target.closest?.('[data-part="knob"]')) api.setT(st.T >= M.T_MAX ? M.T_MIN : st.T + 1, true);
      else api.tamper(true);
    } else return;
    event.preventDefault();
    takeOver();
  };
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onCancel);
  stage.addEventListener("keydown", onKey);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      visible ? run() : halt();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  const onMotion = () => (still.matches ? (halt(), render(0)) : run());
  still.addEventListener("change", onMotion);
  render(0);

  return () => {
    halt();
    io.disconnect();
    still.removeEventListener("change", onMotion);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onCancel);
    stage.removeEventListener("keydown", onKey);
  };
}
