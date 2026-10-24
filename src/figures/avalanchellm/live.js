// Fig 20 live: the hodoscope latches windows, the gain knob turns through its grid, the trimmers re-set, the null shuffles.
// Everything moves by writing attributes on elements found inside `root`; the numbers come from model.mjs and data.mjs.
import * as M from "./model.mjs";
import { GAINS, RATES } from "./data.mjs";

const STEP_PX = 22; // pointer travel per gain detent

// the tour: each step waits, then sets what a reader would set. It starts from rest, so a resumed tour always reads the same:
// the gain sweeps its grid while the meter and trimmers follow, the shuffle drops the needle onto b_perm, then r* and the definition
const TOUR = [
  [1.2, M.REST],
  ...[6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5].map((g) => [0.8, { gain: g }]),
  [1.6, { shuffled: true }],
  [3.6, { shuffled: false }],
  [1.4, { latch: 1 }],
  [2.6, { rate: 3 }],
  [2.6, { rate: 0 }],
  [2.6, { rate: 1 }],
  [2.6, { rate: 2 }],
  [1.6, { def: 1 }],
  [2.6, { latch: 1 }],
  [2.6, { def: 0 }],
];

export function mount(root) {
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const stage = q(".av-stage");
  if (!stage) return () => {};
  const lines = [q(".av-l1"), q(".av-l2")];
  const status = q("[data-status]");
  const lamps = qa(".av-lamps > use");
  const num = (el, key) => el.dataset[key].split(",").map(Number);
  const dial = (el) => el && { el, c: num(el, "c"), a: num(el, "a"), b: num(el, "b"), r: num(el, "r") };
  const trims = qa('[data-av="trim"]').map(dial);
  const gainP = dial(q('[data-av="gain"]'));
  const rateP = dial(q('[data-av="rate"]'));
  const meterP = dial(q('[data-av="meter"]'));
  const refP = dial(q('[data-av="ref"]'));
  const mark = q('[data-av="mark"]');
  const marks = mark ? mark.dataset.marks.split(" ").map((p) => p.split(",").map(Number)) : [];
  const markHome = mark ? [Number(mark.dataset.x), Number(mark.dataset.y)] : [0, 0];
  const poses = qa('[data-av="def"], [data-av="null"]');
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  const s = { ...M.REST };
  const pointAt = (d, t, k) => [d.c[0] + k * (Math.cos(t) * d.a[0] + Math.sin(t) * d.b[0]), d.c[1] + k * (Math.cos(t) * d.a[1] + Math.sin(t) * d.b[1])];
  const draw = (d, t) => {
    if (!d || d.at === t) return;
    d.at = t;
    const p = pointAt(d, t, d.r[0]);
    const e = pointAt(d, t, d.r[1]);
    d.el.setAttribute("d", `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${e[0].toFixed(2)} ${e[1].toFixed(2)}`);
  };

  // what the parts are doing now, eased toward the targets the state sets; a calm tick at mount puts them at rest
  const now = { swing: 0, trims: [], mark: [...markHome], lamps: Float32Array.from(M.windowOf(s)) };
  let target = now.lamps;
  let markAt = "";

  function retarget() {
    target = Float32Array.from(M.windowOf(s));
    M.readoutOf(s).forEach((t, i) => lines[i] && (lines[i].textContent = t));
    for (const g of poses) g.setAttribute("opacity", +g.dataset.pose === +s[g.dataset.av === "def" ? "def" : "shuffled"] ? "1" : "0");
  }

  function tick(dt, calm) {
    let moving = false;
    const ease = (x, to, tau) => {
      if (calm || Math.abs(to - x) < 1e-4) return to;
      moving = true;
      return x + (to - x) * (1 - Math.exp(-dt / tau));
    };
    now.gain = ease(now.gain, M.gainAngle(GAINS[s.gain]), 0.22);
    now.rate = ease(now.rate, M.RATE_ANGLES[s.rate], 0.2);
    // the meter reads b_tot (b_perm while shuffled) on a damped movement that swings a little past and settles, as a
    // moving-coil meter does; its reference pointer reads b_perm
    const row = M.condOf(s);
    const needle = M.meterAngle(s.shuffled ? row.bPerm : row.bTot);
    if (calm) (now.meter = needle), (now.swing = 0);
    else if (Math.abs(needle - now.meter) > 1e-4 || Math.abs(now.swing) > 1e-3) {
      now.swing += (30 * (needle - now.meter) - 8 * now.swing) * dt;
      now.meter += now.swing * dt;
      moving = true;
    }
    now.ref = ease(now.ref, M.meterAngle(row.bPerm), 0.6);
    // the discriminators follow the knob: each row's threshold is re-set a beat after the gain moves
    trims.forEach((d, r) => (now.trims[r] = ease(now.trims[r], M.trimAngle(s, r), 0.5 + r * 0.03)));
    const goal = marks[GAINS.indexOf(M.gstarOf(s))] || markHome;
    now.mark[0] = ease(now.mark[0], goal[0], 0.3);
    now.mark[1] = ease(now.mark[1], goal[1], 0.3);
    draw(gainP, now.gain);
    draw(rateP, now.rate);
    draw(meterP, now.meter);
    draw(refP, now.ref);
    trims.forEach((d, r) => draw(d, now.trims[r]));
    const shift = `translate(${(now.mark[0] - markHome[0]).toFixed(2)} ${(now.mark[1] - markHome[1]).toFixed(2)})`;
    if (mark && shift !== markAt) mark.setAttribute("transform", (markAt = shift));
    for (let i = 0; i < lamps.length; i++) {
      const before = now.lamps[i];
      const after = calm ? target[i] : target[i] > before ? Math.min(target[i], before + dt / 0.12) : Math.max(target[i], before - dt / 0.22);
      if (after !== before) {
        now.lamps[i] = after;
        lamps[i].setAttribute("opacity", after.toFixed(3));
        moving = moving || after !== target[i];
      }
    }
    return moving;
  }

  // ---------------------------------------------------------------- state changes
  // a change sets gain (a detent index), def, shuffled and window outright, steps the gain by `step`, wraps the rate
  function apply(change, fromTour = false) {
    for (const key of ["gain", "def", "shuffled", "window"]) if (change[key] !== undefined) s[key] = change[key];
    if (change.step) s.gain = Math.max(0, Math.min(GAINS.length - 1, s.gain + change.step));
    if (change.rate !== undefined) s.rate = (change.rate + RATES.length) % RATES.length;
    if (change.latch) s.window = (s.window + 1) % 4096;
    retarget();
    if (!fromTour) announce();
    run();
  }
  let announceTimer = 0;
  function announce() {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => status && (status.textContent = M.describe(s)), 700);
  }

  // the tour and the latch clock
  let touring = !still.matches;
  let tourAt = 0;
  let tourClock = 0;
  let quiet = 0;
  const resumeTour = () => {
    if (still.matches) return;
    if (press || hovering) return hold();
    touring = true;
    tourAt = 0;
    tourClock = 0;
  };
  const hold = () => {
    touring = false;
    clearTimeout(quiet);
    quiet = setTimeout(resumeTour, 7000);
  };

  let frame = 0;
  let last = 0;
  let visible = false;
  function loop(stamp) {
    const dt = last ? Math.min((stamp - last) / 1000, 1 / 30) : 1 / 60;
    last = stamp;
    const calm = still.matches;
    if (touring && !calm) {
      tourClock += dt;
      while (tourClock >= TOUR[tourAt][0]) {
        tourClock -= TOUR[tourAt][0];
        apply(TOUR[tourAt][1], true);
        tourAt = (tourAt + 1) % TOUR.length;
      }
    }
    const moving = tick(dt, calm);
    // the loop sleeps once everything has settled and no tour is running; any change wakes it
    frame = visible && (moving || (touring && !calm)) ? requestAnimationFrame(loop) : 0;
  }
  function run() {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(loop);
    }
  }
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
      else if (frame) cancelAnimationFrame(frame), (frame = 0);
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);

  // ---------------------------------------------------------------- input
  // a press is a tap (fired on release, on the part under it) until it travels 6 px; a sideways drag turns the gain,
  // and a vertical one, or a pointercancel when the page scrolls, is let go
  let press = null;
  let hovering = false;
  // keys and taps share one map: arrows turn the gain and step the rate, S shuffles, D flips the definition, Space latches
  const changeOf = (key, shift) =>
    ({
      ArrowRight: { step: shift ? 5 : 1 },
      ArrowLeft: { step: shift ? -5 : -1 },
      ArrowUp: { rate: s.rate + 1 },
      ArrowDown: { rate: s.rate - 1 },
      r: { rate: s.rate + 1 },
      s: { shuffled: !s.shuffled },
      d: { def: 1 - s.def },
      " ": { latch: 1 },
      Enter: { latch: 1 },
      Home: M.REST,
    })[key];
  const TAPS = { def: "d", null: "s", rate: "r", latch: " " };
  const onDown = (e) => {
    if (e.button > 0) return;
    const hit = e.target.closest && e.target.closest("[data-hit]");
    press = { x: e.clientX, y: e.clientY, id: e.pointerId, gain: s.gain, hit: hit && hit.dataset.hit, drag: false };
  };
  const onMove = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.drag) {
      if (Math.hypot(dx, dy) > 6) press.hit = null;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) return void (press = null);
      if (Math.abs(dx) < 6) return;
      press.drag = true;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {}
    }
    hold();
    const next = Math.max(0, Math.min(GAINS.length - 1, press.gain + Math.round(dx / STEP_PX)));
    if (next !== s.gain) apply({ gain: next });
  };
  const onUp = (e) => {
    if (stage.hasPointerCapture?.(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    const tap = e.type === "pointerup" && press && press.id === e.pointerId && press.hit;
    press = null;
    if (tap) hold(), apply(changeOf(TAPS[tap]));
  };
  // Home rests, Escape resumes the tour
  const onKey = (e) => {
    if (e.key === "Escape") return void (clearTimeout(quiet), resumeTour(), run());
    const change = changeOf(e.key.length === 1 ? e.key.toLowerCase() : e.key, e.shiftKey);
    if (!change) return;
    e.preventDefault();
    hold();
    apply(change);
  };
  const onMotion = () => {
    touring = !still.matches;
    retarget();
    run();
  };
  const listeners = [
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onUp],
    ["keydown", onKey],
    ["focus", () => status && !status.textContent && (status.textContent = M.describe(s))],
    ["pointerenter", (e) => e.pointerType === "mouse" && ((hovering = true), hold())],
    ["pointerleave", () => (hovering = false)],
  ];
  for (const [type, fn] of listeners) stage.addEventListener(type, fn);
  still.addEventListener?.("change", onMotion);
  retarget();
  tick(0, true);

  return () => {
    io.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(quiet);
    clearTimeout(announceTimer);
    still.removeEventListener?.("change", onMotion);
    for (const [type, fn] of listeners) stage.removeEventListener(type, fn);
  };
}
