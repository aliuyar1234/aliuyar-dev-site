// Fig 11 · the live spectrophotometer: turret and detent plunger, beam shutter, drum and scale index (read point),
// subset lever, mask spider, target lamps and readout.
import * as k from "../kit/iso-kit.mjs";
import { P, SCALE, SWITCH } from "./world.mjs";
import { turretFrame, knobPointer, inBeam, PLUNGER_U } from "./moving.mjs";
import { readoutOf, describe } from "./model.mjs";
import D from "./data.mjs";

const MASK_TIME = 0.75; // s, the spider's stroke; one stroke caps all four cuvettes
const IDLE_MS = 8000; // the tour resumes after this quiet spell

function settle(s, target, dt, seconds, calm) {
  if (calm) return (s.x = target), (s.v = 0), false;
  const w = 1 / seconds;
  for (let i = 0; i < 4; i++) {
    s.v += (w * w * (target - s.x) - 2 * w * s.v) * (dt / 4);
    s.x += s.v * (dt / 4);
  }
  if (Math.abs(target - s.x) < 1e-3 && Math.abs(s.v) < 1e-3) return (s.x = target), (s.v = 0), false;
  return true;
}
const lerpStops = (stops, x) => {
  const i = Math.max(0, Math.min(stops.length - 1.0001, x));
  const n = Math.floor(i);
  return stops[n] + (stops[n + 1] - stops[n]) * (i - n);
};
const ease = (t) => t * t * (3 - 2 * t);

export function mount(root) {
  const q = (s) => root.querySelector(s);
  const stage = q(".bs-stage");
  const l1 = q(".bs-l1");
  const l2 = q(".bs-l2");
  const status = q("[data-status]");
  const stacks = q("[data-stacks]");
  const discG = q("[data-turret]").firstElementChild;
  const dots = [...discG.querySelectorAll(".iso-dots circle")];
  const cells = [0, 1, 2, 3].map((i) => {
    const g = q(`[data-stack="${i}"]`);
    const [holder, glass, cap, arm] = g.querySelectorAll(":scope > .iso-solid");
    return { g, holder, glass, cap, arm, m: glass.querySelector("[data-m]"), screw: g.querySelector(":scope > .iso-dots circle") };
  });
  const hub = q('[data-stack="hub"]');
  const top = q('[data-stack="top"]');
  const post0 = q('[data-post="0"]');
  const post1 = q('[data-post="1"]');
  const collar = q("[data-collar]");
  const knurl = collar.querySelector("[data-k]");
  const plungerStack = q('[data-stack="plunger"]');
  const beamStack = q('[data-stack="beam"]');
  const beams = [q('[data-beam="in"]'), q('[data-beam="out"]')];
  const pointerT = q('[data-part="turret-pointer"]');
  const pointerK = q('[data-part="knob-pointer"]');
  const plunger = q('[data-part="plunger"]');
  const index = q('[data-part="index"]');
  const lever = q('[data-part="lever"]');
  const lamps = { green: q('[data-lamp="green"]'), red: q('[data-lamp="red"]') };
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  // targets, and the parts that follow them
  const goal = { n: 0, anchor: 0, subset: 0, masked: 0 };
  const th = { x: 0, v: 0 };
  const rho = { x: 0, v: 0 };
  const phi = { x: 0, v: 0 };
  let stroke = 0; // 0 parked to 1 seated, linear in time, drawn eased
  let queued = null;
  let lastTheta = NaN;
  let lastMask = NaN;
  let lastOrder = "";
  let lastText = "";
  let litCell = -2;
  let beamOn = null;

  const setSolid = (g, p) => {
    const c = g.children;
    c[0].setAttribute("d", p.fill);
    for (let i = 0; i < 4; i++) c[1 + i].setAttribute("d", p.shades[i] || "");
    c[5].setAttribute("d", p.top);
    c[6].setAttribute("d", p.crease || "");
    c[c.length - 1].setAttribute("d", p.outline);
  };
  const masking = () => stroke !== goal.masked;
  const turning = () => Math.abs(th.x + goal.n * 90) > 0.05 || Math.abs(th.v) > 0.05;

  // ---- actions, shared by reader and tour; the turret and the spider never move together
  const step = (by) => {
    if (masking()) return void (queued = () => step(by));
    goal.n += by;
  };
  const toCell = (c) => step((((c - (((goal.n % 4) + 4) % 4)) % 4) + 4) % 4);
  const setAnchor = (a) => (goal.anchor = Math.max(0, Math.min(2, a)));
  const setSubset = (s) => (goal.subset = ((s % 3) + 3) % 3);
  const setMasks = (m) => {
    if (turning()) return void (queued = () => setMasks(m));
    goal.masked = m;
  };
  const home = () => {
    toCell(0);
    setAnchor(0);
    setSubset(0);
    setMasks(0);
  };

  // ---- draw: only what changed
  function drawTurret() {
    const theta = th.x;
    const m = ease(stroke);
    if (theta === lastTheta && m === lastMask) return;
    const f = turretFrame(theta, m);
    if (theta !== lastTheta) {
      setSolid(discG, f.disc);
      f.dots.forEach(([x, y], i) => (dots[i].setAttribute("cx", x.toFixed(1)), dots[i].setAttribute("cy", y.toFixed(1))));
      f.cells.forEach((c) => {
        setSolid(cells[c.i].holder, c.holder);
        setSolid(cells[c.i].glass, c.cuvette);
        cells[c.i].m.setAttribute("d", c.meniscus);
      });
      pointerT.setAttribute("d", f.pointer);
      plunger.setAttribute("transform", k.translateAlong(P, [-PLUNGER_U[0] * f.plunger, -PLUNGER_U[1] * f.plunger, 0]));
    }
    // the spider rides the turret and slides on the post
    f.cells.forEach((c) => {
      setSolid(cells[c.i].cap, c.cap);
      setSolid(cells[c.i].arm, c.arm);
      cells[c.i].screw.setAttribute("cx", c.screw[0].toFixed(1));
      cells[c.i].screw.setAttribute("cy", c.screw[1].toFixed(1));
    });
    if (m !== lastMask) {
      setSolid(collar, f.collar);
      knurl.setAttribute("d", f.collarKnurl);
      setSolid(post0, f.post0);
      setSolid(post1, f.post1);
    }
    // depth order of the stacks, far to near
    const list = f.cells
      .map((c) => [c.depth, cells[c.i].g])
      .concat([[f.hubDepth, hub], [f.plungerDepth, plungerStack], [f.beamDepth, beamStack], [Infinity, top]])
      .sort((a, b) => a[0] - b[0]);
    const key = list.map(([, g]) => g.dataset.stack).join();
    if (key !== lastOrder) {
      list.forEach(([, g]) => stacks.appendChild(g));
      lastOrder = key;
    }
    lastTheta = theta;
    lastMask = m;
  }

  let lastRho = NaN;
  let lastPhi = NaN;
  function draw() {
    drawTurret();
    if (rho.x !== lastRho) {
      pointerK.setAttribute("d", knobPointer(rho.x));
      index.setAttribute("transform", k.translateAlong(P, [lerpStops(SCALE.stops, rho.x) - SCALE.stops[0], 0, 0]));
      lastRho = rho.x;
    }
    if (phi.x !== lastPhi) {
      lever.setAttribute("transform", k.translateAlong(P, [lerpStops(SWITCH.stops, phi.x) - SWITCH.stops[0], 0, 0]));
      lastPhi = phi.x;
    }
    const cell = inBeam(th.x);
    if (cell !== litCell) {
      cells.forEach((c, i) => c.glass.toggleAttribute("data-lit", i === cell));
      const on = cell < 0 ? "" : D.cells[cell].suff ? "green" : "red";
      for (const id in lamps) on === id ? lamps[id].setAttribute("data-on", id) : lamps[id].removeAttribute("data-on");
      litCell = cell;
    }
    // the shutter opens once a cuvette is seated in the detent
    const open = Math.abs(th.x - Math.round(th.x / 90) * 90) < 0.3 && Math.abs(th.v) < 2;
    if (open !== beamOn) {
      beams.forEach((g) => g.toggleAttribute("data-on", open));
      beamOn = open;
    }
    const [a, b] = readoutOf(
      { cell, anchor: Math.round(rho.x), subset: Math.round(phi.x), masked: stroke === 1 },
      { turning: cell < 0, masking: masking() ? (goal.masked ? "lowering" : "lifting") : "" },
    );
    const text = a + "\n" + b;
    if (text !== lastText) {
      l1.textContent = a;
      l2.textContent = b;
      lastText = text;
    }
  }

  // ---- the loop
  let frame = 0;
  let last = 0;
  let visible = false;
  let touring = !still.matches;
  let tourAt = 0;
  let tourStep = -1;
  let quiet = 0;
  const TOUR = [
    [1.4, home], [1.6, () => step(1)], [2.6, () => step(1)], [2.6, () => step(1)], [2.6, () => step(1)],
    [2.4, () => setAnchor(1)], [2.2, () => setAnchor(2)],
    [2.6, () => setSubset(1)], [2.6, () => setSubset(2)], [2.6, () => setSubset(0)],
    [2.4, () => setMasks(1)], [3.0, () => step(1)], [2.6, () => step(1)],
    [2.6, () => setMasks(0)], [3.0, () => step(1)], [2.6, () => step(1)], [2.4, () => setAnchor(0)], [2.6, null],
  ];

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring) {
      tourAt += dt;
      while (tourStep + 1 < TOUR.length && tourAt >= TOUR[tourStep + 1][0]) {
        tourAt -= TOUR[tourStep + 1][0];
        tourStep++;
        TOUR[tourStep][1]?.();
        if (tourStep === TOUR.length - 1) tourStep = 0;
      }
    }
    let moving = settle(th, -goal.n * 90, dt, 0.17, calm);
    moving = settle(rho, goal.anchor, dt, 0.16, calm) || moving;
    moving = settle(phi, goal.subset, dt, 0.12, calm) || moving;
    if (masking()) {
      stroke = calm ? goal.masked : Math.max(0, Math.min(1, stroke + ((goal.masked ? 1 : -1) * dt) / MASK_TIME));
      moving = true;
    }
    if (queued && !masking() && !turning()) {
      const run = queued;
      queued = null;
      run();
      moving = true;
    }
    draw();
    const rest = Math.abs(th.x + goal.n * 90) < 1.5 && Math.abs(rho.x - goal.anchor) < 0.04 && Math.abs(phi.x - goal.subset) < 0.04;
    if (tell && rest && !masking() && !queued) (tell = false), announce();
    frame = visible && (moving || touring || queued) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  // the status line speaks once the moved parts rest
  let said = "";
  let tell = false;
  function announce() {
    const text = describe({ cell: Math.max(0, inBeam(th.x)), anchor: goal.anchor, subset: goal.subset, masked: !!goal.masked });
    if (document.activeElement === stage && text !== said) status.textContent = said = text;
  }

  // ---- input: the reader takes over from the tour
  let resume = 0;
  const takeOver = () => {
    if (touring) {
      touring = false;
      queued = null;
    }
    clearTimeout(resume);
    quiet = 1;
    tell = true;
    resume = setTimeout(() => {
      quiet = 0;
      if (!still.matches) {
        touring = true;
        tourAt = 0;
        tourStep = -1;
      }
      run();
    }, IDLE_MS);
  };
  const act = (name, by = 1) => {
    takeOver();
    if (name === "turret") step(by);
    else if (name === "cell") toCell(by);
    else if (name === "home") home();
    else if (name === "drum") setAnchor(goal.anchor + by > 2 || goal.anchor + by < 0 ? (by > 0 ? 0 : 2) : goal.anchor + by);
    else if (name === "switch") setSubset(goal.subset + 1);
    else if (name === "mask") setMasks(goal.masked ? 0 : 1);
    run();
  };
  // a click, not a pointerdown: a scroll swipe that starts on a control never fires it
  const onClick = (event) => {
    const hit = event.target.closest?.("[data-act]");
    if (hit) act(hit.dataset.act);
  };
  const KEYS = { ArrowRight: ["turret", 1], ArrowLeft: ["turret", -1], ArrowUp: ["drum", 1], ArrowDown: ["drum", -1], f: ["switch"], F: ["switch"], m: ["mask"], M: ["mask"], Home: ["home"], 1: ["cell", 0], 2: ["cell", 1], 3: ["cell", 2], 4: ["cell", 3] };
  const onKey = (event) => {
    const hit = KEYS[event.key];
    if (hit) {
      event.preventDefault();
      act(...hit);
    } else if (event.key === "Escape") {
      clearTimeout(resume);
      quiet = 0;
      if (!still.matches) (touring = true), (tourAt = 0), (tourStep = -1);
      run();
    }
  };
  const onFocus = () => announce();
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("focus", onFocus);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  observer.observe(stage);
  const onMotion = () => {
    touring = !still.matches && quiet === 0;
    run();
  };
  still.addEventListener?.("change", onMotion);
  draw();
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(resume);
    observer.disconnect();
    still.removeEventListener?.("change", onMotion);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("focus", onFocus);
  };
}
