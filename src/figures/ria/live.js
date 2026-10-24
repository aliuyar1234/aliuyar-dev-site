// Fig 21 live: pick an operator (its sorts drop into the forme), crank the carriage to pull a proof, throw the
// canonicalize lever. Everything moves by writing attributes on elements found inside `root`; the numbers come
// from model.mjs and data.mjs, the screen geometry from rig.mjs.
import { at, unitX, faceMatrix, gripperAt, teethAt, TEETH, GEAR, PINION, CRANK, TRIP, LEVER, GRIPPER, XC, cellX } from "./rig.mjs";
import { TRAVEL, CYL_R, GEAR_R, PINION_R, PULL_T, pullAt, readoutOf, redOf, opOf, OPS, REST } from "./model.mjs";

const IDLE = 9000; // ms without input before the tour resumes
// the tour: [seconds to wait, what to set]; it starts from rest, so a resumed tour always reads the same
const TOUR = [
  [1.4, { pull: 1 }],
  [PULL_T + 1.6, { op: "O6" }],
  [1.8, { pull: 1 }],
  [PULL_T + 1.6, { op: "O1" }],
  [2.2, { op: "O2" }],
  [2.2, { op: "O3" }],
  [2.2, { op: "O5" }],
  [1.8, { pull: 1 }],
  [PULL_T + 1.6, { canon: true }],
  [1.8, { pull: 1 }],
  [PULL_T + 2.0, { canon: false, op: "O4" }],
  [1.8, { pull: 1 }],
  [PULL_T + 1.6, {}],
];

const n2 = (v) => Math.round(v * 100) / 100;

export function mount(root) {
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const stage = q(".ria-stage");
  if (!stage) return () => {};
  const readout = q("[data-readout]");
  const status = q("[data-status]");
  const cars = qa("[data-car]");
  const crank = q("[data-crank]");
  const grip = q("[data-grip]");
  const rot = { gear: q('[data-rot="gear"]'), pinion: q('[data-rot="pinion"]') };
  const teeth = { gear: q('[data-teeth="gear"]'), pinion: q('[data-teeth="pinion"]') };
  const grippers = ["back", "front"].map((side) => {
    const g = q(`[data-gripper="${side}"]`);
    return g && { g, fill: g.children[0], edge: g.children[1] };
  });
  const trip = q("[data-trip]");
  const lever = q("[data-lever]");
  const sheet = q("[data-sheet]");
  const proof = q("[data-proof]");
  const marks = q("[data-marks]");
  const redRows = q("[data-red-rows]");
  const redTail = q("[data-red-tail]");
  const selector = q("[data-selector]");
  const grid = marks && { x: +marks.dataset.x, y: +marks.dataset.y, pitch: +marks.dataset.pitch, cols: +marks.dataset.cols };
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ------------------------------------------------------------ state
  const s = { ...REST };
  let printed = { ...REST }; // what the proof on the delivery board shows
  let pullT = -1; // seconds into the current pull, -1 when idle
  const now = { car: 0, trip: 0, sheet: 1, proof: 1, canon: 0, sel: OPS.indexOf(REST.op) };
  const set = (el, name, value) => el && el.getAttribute(name) !== value && el.setAttribute(name, value);
  const shift = (dx) => `translate(${n2(dx * unitX[0])} ${n2(dx * unitX[1])})`;

  function showReadout() {
    const text = readoutOf(s, printed);
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function showProof(state) {
    printed = { ...state };
    showReadout();
    const red = redOf(state);
    if (!marks) return;
    marks.style.display = state.canon || opOf(state.op).flip == null ? "none" : "";
    if (red == null || !grid) return;
    const rows = Math.floor(red / grid.cols);
    set(redRows, "height", String(n2(rows * grid.pitch)));
    set(redTail, "y", String(n2(grid.y + rows * grid.pitch)));
    set(redTail, "width", String(n2((red % grid.cols) * grid.pitch)));
  }
  function say(text) {
    if (status && status.textContent !== text) status.textContent = text;
  }
  function apply() {
    stage.dataset.op = s.op;
    if (s.canon) stage.dataset.canon = "";
    else delete stage.dataset.canon;
    showReadout();
  }

  // ------------------------------------------------------------ drawing
  function draw() {
    const d = now.car * TRAVEL; // carriage travel, world units toward +x
    const t = shift(d);
    for (const el of cars) set(el, "transform", t);
    const turn = -d / CYL_R; // the cylinder rolls toward +x: x-toward-z angle falls
    const spin = -turn * (GEAR_R / PINION_R); // the pinion turns the other way
    if (rot.gear) set(rot.gear, "transform", faceMatrix([XC + GEAR.x, GEAR.y[1], GEAR.z], turn));
    if (rot.pinion) set(rot.pinion, "transform", faceMatrix([XC + PINION.x, PINION.y[1], PINION.z], spin));
    set(teeth.gear, "d", teethAt(GEAR, TEETH.gear, turn));
    set(teeth.pinion, "d", teethAt(PINION, TEETH.pinion, spin + Math.PI / TEETH.pinion));
    if (crank) set(crank, "transform", faceMatrix([XC + PINION.x, CRANK.y[0], PINION.z], spin));
    if (grip) {
      const a0 = CRANK.rest;
      const end = (a) => at([XC + PINION.x + CRANK.len * Math.cos(a), CRANK.y[1], PINION.z + CRANK.len * Math.sin(a)]);
      const p0 = end(a0);
      const p1 = end(a0 + spin);
      set(grip, "transform", `translate(${n2(p1[0] - p0[0])} ${n2(p1[1] - p0[1])})`);
    }
    const g = gripperAt(GRIPPER.rest + turn);
    grippers.forEach((part, i) => {
      if (!part) return;
      const on = g.front === (i === 1);
      part.g.style.display = on ? "" : "none";
      if (on) set(part.fill, "d", g.fill), set(part.edge, "d", g.edge);
    });
    if (trip) set(trip, "transform", faceMatrix([XC + TRIP.x, TRIP.y[0], TRIP.z], -now.trip * (TRIP.print - TRIP.trip)));
    if (lever) set(lever, "transform", faceMatrix([LEVER.x, LEVER.y[0], LEVER.z], -now.canon * (LEVER.on - LEVER.off)));
    if (sheet) set(sheet, "opacity", String(n2(now.sheet)));
    if (proof) {
      set(proof, "opacity", String(n2(now.proof)));
      set(proof, "transform", shift(-(1 - now.proof) * 14));
    }
    if (selector) {
      const i0 = Math.floor(now.sel);
      const x = cellX(i0) + (cellX(Math.min(5, i0 + 1)) - cellX(i0)) * (now.sel - i0);
      set(selector, "transform", shift(x - Number(selector.dataset.x)));
    }
  }

  // ------------------------------------------------------------ actions
  function pick(op) {
    if (!OPS.includes(op) || (op === s.op && !s.canon)) return;
    s.op = op;
    s.canon = false;
    apply();
    const o = opOf(op);
    say(`${o.id} ${o.name} set: crank to pull its proof`);
  }
  function canon(on = !s.canon) {
    s.canon = on;
    apply();
    say(on ? "canon_full set: every operator's forme returns to one canonical forme" : `${s.op} set again`);
  }
  function pull() {
    if (pullT >= 0) return;
    if (still.matches) {
      showProof(s);
      now.proof = 1;
      draw();
      say(`proof pulled: ${readoutOf(s)}`);
      return;
    }
    pullT = 0;
    run();
  }

  // ------------------------------------------------------------ loop
  let frame = 0;
  let last = 0;
  let visible = false;
  let touring = !still.matches;
  let tourStep = 0;
  let tourWait = TOUR[0][0];
  let idle = 0;
  const ease = (x, to, dt, tau) => (Math.abs(to - x) < 1e-3 ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));

  function step(dt) {
    let moving = false;
    if (touring) {
      tourWait -= dt;
      if (tourWait <= 0) {
        const [, act] = TOUR[tourStep];
        if (act.canon !== undefined) canon(act.canon);
        if (act.op) pick(act.op);
        if (act.pull) pull();
        tourStep = (tourStep + 1) % TOUR.length;
        tourWait = TOUR[tourStep][0];
      }
      moving = true;
    }
    if (pullT >= 0) {
      const before = pullAt(pullT);
      pullT += dt;
      const p = pullAt(pullT);
      if (p.printed && !before.printed) showProof(s);
      now.car = p.car;
      now.trip = p.lever;
      now.sheet = p.sheet;
      now.proof = p.printed ? p.proof : before.printed ? 1 : now.proof;
      if (p.printed && !before.printed) now.proof = 0;
      if (pullT >= PULL_T) {
        pullT = -1;
        Object.assign(now, { car: 0, trip: 0, sheet: 1, proof: 1 });
        say(`proof pulled: ${readoutOf(printed)}`);
      }
      moving = true;
    }
    const want = { canon: s.canon ? 1 : 0, sel: OPS.indexOf(s.op) };
    for (const key of ["canon", "sel"]) {
      const to = still.matches ? want[key] : ease(now[key], want[key], dt, key === "sel" ? 0.22 : 0.18);
      if (to !== now[key]) moving = true;
      now[key] = to;
    }
    draw();
    return moving;
  }
  function tick(time) {
    const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60;
    last = time;
    const moving = step(dt);
    frame = visible && moving ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  // back to the resting state and the start of the tour
  function resume() {
    clearTimeout(idle);
    Object.assign(s, REST);
    apply();
    touring = !still.matches;
    tourStep = 0;
    tourWait = TOUR[0][0];
    run();
  }
  function touch() {
    touring = false;
    clearTimeout(idle);
    idle = setTimeout(() => !still.matches && resume(), IDLE); // under reduced motion the figure keeps what was set
    run();
  }

  // ------------------------------------------------------------ input
  const onClick = (event) => {
    const hit = event.target.closest && event.target.closest("[data-hit]");
    touch();
    if (hit && hit.dataset.hit === "op") pick(hit.dataset.op);
    else if (hit && hit.dataset.hit === "canon") canon();
    else pull();
  };
  const onKey = (event) => {
    const k = event.key;
    let used = true;
    if (k >= "1" && k <= "6") pick(OPS[Number(k) - 1]);
    else if (k === "ArrowRight" || k === "ArrowLeft") pick(OPS[(OPS.indexOf(s.op) + (k === "ArrowRight" ? 1 : 5)) % 6]);
    else if (k === " " || k === "Enter") pull();
    else if (k === "c" || k === "C") canon();
    else if (k === "Escape") {
      event.preventDefault();
      resume();
      return;
    } else used = false;
    if (used) {
      event.preventDefault();
      touch();
    }
  };
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
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
    if (still.matches && pullT >= 0) {
      // finish a pull in progress at once
      if (!pullAt(pullT).printed) showProof(s);
      pullT = -1;
      Object.assign(now, { car: 0, trip: 0, sheet: 1, proof: 1 });
    }
    run();
  };
  still.addEventListener("change", onMotion);
  apply();
  showProof(s);
  draw();

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    io.disconnect();
    still.removeEventListener("change", onMotion);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
  };
}
