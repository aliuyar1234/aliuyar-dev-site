// Fig 9 · live behaviour. The crank rocks the mirror between plate A and plate B, so the stars only one plate has flicker;
// a FullDelta film in register over plate A stills three of them. The meter reads KL to IT while the plates are registered.
import { translateAlong, fadedSvg, holdStill } from "../kit/iso-kit.mjs";
import {
  P, at, linkage, viewA, THETA_A, THETA_B, mirrorShape, prismPaths, linkagePaths, LINKAGE_SLOTS, camNotches, needleAt, klAngle,
  STOP_ANGLE, slideX, knurlX, knurlY, readoutOf, micOf, MIC, MID, AXLE_Z, WIDTH, HEIGHT, CY, OFF, LO, FRAME, FLAP, flapShape,
} from "./view.mjs";
import D from "./data.mjs";

const SLOTS = ["fill", 0, 1, 2, 3, "top", "crease", "outline"];
const TAU = Math.PI * 2;
const OMEGA = TAU / 2.6; // one blink, A to B and back, every 2.6 s
const START = { insert: 1, reg: [0, 0], blink: true }; // the still the page ships
const TOUR = [[5.2, { insert: 3 }], [9.8, { insert: 2 }], [14.4, { insert: 0 }], [18.8, { insert: 1 }], [21.4, { reg: OFF }], [23.8, { reg: [0, OFF[1]] }], [25.2, { reg: [0, 0] }]];
const CYCLE = [0, 1, 3, 2]; // a click steps PT, FullDelta, FullDelta - VMask, CapMask
const KL = D.inserts.map((v) => v.kl);
const follow = (v, to, dt, s) => v + (to - v) * (1 - Math.exp(-dt / s));
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const fwd = (a) => Math.max(0, wrap(a + 1e-6) - 1e-6); // how far ahead a dwell is, 0 when on it
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function mount(root) {
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const stage = q(".spd-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const readout = q("[data-readout]");
  const status = q("[data-status]");
  const slots = (id) => qa(`[data-live="${id}"] path`);
  const [mirror, flapEls] = [slots("mirror"), slots("flap")];
  const bars = LINKAGE_SLOTS.map((id) => [id, slots(id)]);
  const cam = q('[data-live="cam"]');
  const needle = q('[data-live="needle"]');
  const parts = (id) => qa(`[data-part="${id}"]`);
  const [slideEls, carrierEls] = [parts("slide"), parts("carrierA")];
  const thimbles = [parts("thimbleAX"), parts("thimbleAY")];
  const knurls = [q('[data-knurl="Ax"]'), q('[data-knurl="Ay"]')];
  const blink = ["A", "Am", "B", "Bs"].map((id) => [id, q(`[data-blink="${id}"]`)]);
  const [green, red] = [q('[data-lamp="green"]'), q('[data-lamp="red"]')];
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const setSlots = (list, paths) => list.forEach((el, i) => {
    const d = (typeof SLOTS[i] === "number" ? paths.shades[SLOTS[i]] : paths[SLOTS[i]]) || "";
    if (el.getAttribute("d") !== d) el.setAttribute("d", d);
  });

  let theta = THETA_A, omega = 0, want = { ...START }, slide = 1, flap = 0;
  let needleAngle = klAngle(KL[1]), needleRate = 0;
  let touring = !still.matches, clock = 0, frame = 0, last = 0, visible = false, idle = 0, lastText = "";
  const reg = [0, 0];
  const turned = [null, null];
  const off = () => Math.hypot(reg[0], reg[1]);
  const registered = () => off() < 0.06 && !want.reg[0] && !want.reg[1];
  // frames 0, 1, 2 hold PT, FullDelta and CapMask; the flap swung in over frame 1 makes FullDelta - VMask
  const klAt = (pos) => {
    const ends = [KL[0], KL[1] + (KL[3] - KL[1]) * flap, KL[2]];
    const f = Math.max(0, Math.min(2, pos));
    const i = Math.min(1, Math.floor(f));
    return ends[i] + (ends[i + 1] - ends[i]) * (f - i);
  };

  function draw() {
    const pose = linkage(theta);
    setSlots(mirror, prismPaths(mirrorShape(pose.phi)));
    const lp = linkagePaths(pose);
    for (const [id, list] of bars) setSlots(list, lp[id]);
    if (cam) cam.setAttribute("d", camNotches(pose.phi));
    // A, then B in the eyepiece: a star one plate lacks comes and goes; the film's marks mask two of A's and print one of B's
    const w = viewA(pose.phi);
    const cancel = clamp01(1 - Math.abs(slide - 1) * 5) * clamp01(1 - off() * 1.5);
    const pa = LO + (1 - LO) * w;
    const pb = LO + (1 - LO) * (1 - w);
    const op = { A: pa, Am: pa + (LO - pa) * cancel, B: pb, Bs: pb + (1 - pb) * cancel };
    for (const [id, el] of blink) if (el) el.setAttribute("opacity", op[id].toFixed(3));
    setSlots(flapEls, prismPaths(flapShape(flap)));
    const slideT = translateAlong(P, [slideX(slide), 0, 0]);
    slideEls.forEach((el) => el.setAttribute("transform", slideT));
    const carT = translateAlong(P, [reg[0], reg[1], 0]);
    carrierEls.forEach((el) => el.setAttribute("transform", carT));
    // the screws ride with the carrier, each spindle's clip held on its bracket bore; half a turn per division
    const o = at([0, 0, 0]);
    thimbles.forEach((list, axis) => {
      const v = axis ? [0, reg[1], 0] : [reg[0], 0, 0];
      const a = at(v);
      list.forEach((el) => (el.setAttribute("transform", translateAlong(P, v)), holdStill(el, [a[0] - o[0], a[1] - o[1]])));
      if (turned[axis] !== reg[axis] && knurls[axis]) {
        knurls[axis].innerHTML = fadedSvg(axis ? knurlY("A", -reg[1] * Math.PI) : knurlX("A", reg[0] * Math.PI), { tone: "lo" });
        turned[axis] = reg[axis];
      }
    });
    if (needle) needle.setAttribute("d", needleAt(needleAngle));
    const ok = registered();
    if (green) green.toggleAttribute("data-on", ok);
    if (red) red.toggleAttribute("data-on", !ok && off() > 0.3);
    const lines = readoutOf({ insert: Math.round(slide) === 1 && flap > 0.5 ? 3 : Math.round(slide), registered: ok });
    const text = lines.join("|");
    if (readout && text !== lastText) (readout.innerHTML = lines.map((l) => `<span>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`).join("")), (lastText = text);
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring && !calm) {
      clock = (clock + dt) % 29.4;
      want = TOUR.reduce((s, [t, change]) => (clock >= t ? { ...s, ...change } : s), { ...START });
    }
    // the crank spins up and down; held, it coasts on to the next dwell, where the detent holds the mirror
    if (calm) (omega = 0), (theta = THETA_A);
    else if (want.blink) (omega = follow(omega, OMEGA, dt, 0.45)), (theta = wrap(theta + omega * dt));
    else {
      omega = follow(omega, 0, dt, 0.35);
      const d = Math.min(fwd(THETA_A - theta), fwd(THETA_B - theta));
      theta = wrap(theta + Math.min(d, Math.max(omega * dt, d * (1 - Math.exp(-dt / 0.25)))));
    }
    // the slide travels first; the flap swings only over a frame at rest, and out again before the slide leaves
    const fT = FRAME[want.insert];
    const flapT = slide === fT ? FLAP[want.insert] : 0;
    flap = calm ? FLAP[want.insert] : follow(flap, flapT, dt, 0.18);
    if (Math.abs(flap - flapT) < 0.004) flap = flapT;
    if (calm || flap < 0.02) slide = calm ? fT : follow(slide, fT, dt, 0.42);
    if (Math.abs(slide - fT) < 0.002) slide = fT;
    for (const i of [0, 1]) {
      reg[i] = calm ? want.reg[i] : follow(reg[i], want.reg[i], dt, 0.32);
      if (Math.abs(reg[i] - want.reg[i]) < 0.004) reg[i] = want.reg[i];
    }
    // the meter reads while the plates are in register; off register the needle falls back onto its stop pin
    const target = registered() ? klAngle(klAt(slide)) : STOP_ANGLE;
    if (calm) (needleAngle = target), (needleRate = 0);
    else
      for (let s = 0; s < 4; s++) {
        needleRate += ((target - needleAngle) * 38 - needleRate * 9.5) * (dt / 4);
        needleAngle += needleRate * (dt / 4);
        if (needleAngle < STOP_ANGLE) (needleAngle = STOP_ANGLE), (needleRate = Math.max(0, -needleRate * 0.3));
      }
    draw();
    const settled = !touring && !want.blink && omega < 0.01 && slide === fT && flap === FLAP[want.insert] && reg[0] === want.reg[0] && reg[1] === want.reg[1] && Math.abs(needleRate) + Math.abs(target - needleAngle) < 1e-3;
    frame = visible && !settled && !calm ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) (last = 0), (frame = requestAnimationFrame(tick));
    if (still.matches) tick(performance.now());
  };
  const tour = () => {
    clearTimeout(idle);
    touring = !still.matches;
    clock = 0;
    run();
  };
  const act = (change) => {
    touring = false;
    want = { ...want, ...change };
    clearTimeout(idle);
    idle = setTimeout(tour, 9000);
    if (status) status.textContent = (want.blink || still.matches ? "" : "Blink held. ") + readoutOf({ insert: want.insert, registered: !want.reg[0] && !want.reg[1] }).join(". ");
    run();
  };
  const toggleAxis = (axis) => act({ reg: want.reg.map((v, i) => (i === axis ? (v ? 0 : OFF[i]) : v)) });
  const moveInsert = (step) => act({ insert: CYCLE[(CYCLE.indexOf(want.insert) + step + 4) % 4] });

  // a tap or click acts (a scroll that starts on the figure fires no click): the nearest control, else the slide steps
  const onClick = (event) => {
    const box = svg.getBoundingClientRect();
    const vx = ((event.clientX - box.left) / box.width) * WIDTH;
    const vy = ((event.clientY - box.top) / box.height) * HEIGHT;
    const mic = micOf("A");
    const tm = (MIC.thimble[0] + MIC.thimble[1]) / 2;
    const near = (p, r) => Math.hypot(p[0] - vx, p[1] - vy) < r;
    if (near(at([tm + reg[0], mic.x.y, mic.x.z]), 15)) toggleAxis(0);
    else if (near(at([mic.y.x, CY.A + tm + reg[1], mic.y.z]), 15)) toggleAxis(1);
    else if (near(at([4, MID - 8, AXLE_Z]), 42)) act({ blink: !want.blink });
    else moveInsert(1);
  };
  const KEYS = { " ": () => act({ blink: !want.blink }), b: () => act({ blink: !want.blink }), arrowright: () => moveInsert(1), arrowdown: () => moveInsert(1), arrowleft: () => moveInsert(-1), arrowup: () => moveInsert(-1), r: () => act({ reg: [0, 0] }), x: () => toggleAxis(0), y: () => toggleAxis(1), escape: tour };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key >= "1" && key <= "4" && key.length === 1) act({ insert: Number(key) - 1 });
    else if (KEYS[key]) KEYS[key]();
    else return;
    event.preventDefault();
  };
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  }, { rootMargin: "120px 0px" });
  io.observe(stage);
  const onMotion = () => ((touring = !still.matches), run());
  still.addEventListener("change", onMotion);
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
