// Fig 19 live: set the threat, p, the screen (D1) and the anchor spring (D2), then turn the flywheel through 200
// strokes and read the tablet on the dial. Every moving part comes from moving.mjs, every number from model.mjs.
import * as k from "../kit/iso-kit.mjs";
import * as M from "./moving.mjs";
import { P, SCREEN, NUT_DOWN, SLIDE, PLUNGE } from "./scene.mjs";
import { STEPS, P_SET, RUN, TOUR, START, conditionOf, readoutOf, spoken, grainStates, heldGrains, strokesAt, rateAt, blurAt, smooth as ease, ramAt, yieldAt, shoeAngle, tabletAt, landedAt } from "./model.mjs";

const TEST = 1.5; // seconds from the last stroke to the needle at rest
const HOLD = 3.6; // seconds a result stays up in the tour
const SETTLE = 0.8; // seconds between a setting and the tour's run
const CLEAR = 0.45; // seconds to lift the last tablets out and zero the counter
const IDLE = 9; // seconds after the last input before the tour resumes
const GHOST = 0.24; // how dense a part's swept ghost is at full speed

export function mount(root) {
  const stage = root.querySelector(".rdd-stage");
  if (!stage) return () => {};
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const solid = (name) => $(`[data-live="${name}"]`);
  const part = (name) => $(`[data-part="${name}"]`);
  const setSolid = (g, paths) => {
    const d = M.solidD(paths);
    [...g.children].forEach((el, i) => {
      if (!el.hasAttribute("data-off") && el.getAttribute("d") !== d[i]) el.setAttribute("d", d[i]);
    });
  };
  const attr = (el, name, value) => el && el.getAttribute(name) !== value && el.setAttribute(name, value);
  const opacity = (el, v) => el && attr(el, "style", `opacity:${Math.round(v * 100) / 100}`);
  const flag = (el, on) => el && (on ? attr(el, "data-on", "") : el.removeAttribute("data-on"));
  const move = (el, off) => attr(el, "transform", k.translateAlong(P, off));

  const ref = {
    arm: solid("arm"),
    shoe: solid("shoe"),
    mouth: solid("mouth"),
    conrod: solid("conrod"),
    spokes: [0, 1, 2, 3, 4].map((i) => solid(`spoke${i}`)),
    spokeSide: { back: $('[data-side="back"]'), front: $('[data-side="front"]') },
    blur: part("blur"),
    ecc: part("ecc"),
    handle: part("handle"),
    holder: part("holder"),
    punch: part("punch"),
    ramLow: solid("ramlow"),
    nut: part("nut"),
    rod: part("rod"),
    coilBack: part("coilback"),
    coilFront: part("coilfront"),
    tabs: Object.fromEntries(["die", "table", "chute"].map((w) => [w, $$(`[data-tab="${w}"]`)])),
    tray: $$("[data-tray]"),
    counter: part("counter"),
    screen: part("screen"),
    rodTops: [0, 1].map((i) => solid(`rodtop${i}`)),
    held: $("[data-held]"),
    lampHeld: $('[data-lamp="held"]'),
    lampTrigger: $('[data-lamp="trigger"]'),
    grains: $$("[data-g]"),
    slide: part("slide"),
    pointer: part("pointer"),
    sample: part("sample"),
    plunger: part("plunger"),
    needle: part("needle"),
    limits: part("limits"),
    hands: [$('[data-hand="lo"]'), $('[data-hand="hi"]')],
    lines: [1, 2, 3].map((i) => root.querySelector(`.rdd-l${i}`)),
    status: root.querySelector("[data-status]"),
    ghosts: $$("[data-ghost]"),
  };
  // the swept shapes are built here, not shipped in the static markup
  const ghostD = M.ghostsOf();
  ref.ghosts.forEach((el) => attr(el, "d", ghostD[el.getAttribute("data-ghost")] || ""));
  // what fades to a ghost at speed
  const sharp = [ref.arm, ref.shoe, ref.mouth, ref.conrod, ref.ecc, ref.handle, ref.holder, ref.punch, ref.ramLow, ref.nut, ref.rod, ref.coilBack, ref.coilFront];

  // ------------------------------------------------------------ state
  const set = { ...START };
  // where the controls are going: screen in, spring set, slide on trigger, knob at p
  const controls = () => ({ screen: +set.screen, anchor: +set.anchor, slide: +(set.threat === "trigger"), knob: M.KNOB_ANGLE[set.p] });
  const shown = { ...controls(), value: 0, sample: 0, plunger: 0, limits: 0, count: 0, trayN: 0, trayA: 1 };
  let phase = "idle"; // idle → run → test → done; a change while turning: stop (coast to top dead centre) → clear → idle
  let t = 0; // seconds into the current phase
  let s = 0; // strokes turned
  let rate = 0; // strokes a second
  let coast = null; // the spin-down: s = s0 + r0 τ + a τ² + b τ³, ending at rest on a whole stroke
  let clear0 = 0; // counter reading when the clear began
  let queued = false; // a run asked for while stopping or clearing
  let userRun = false; // only a run someone started is announced
  let tour = 0;
  let tourAt = 0;
  let lastInput = -1e9;
  let clock = 0;
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cond = () => conditionOf(set);
  const say = (text) => ref.status && (ref.status.textContent = text);

  const startRun = () => {
    [phase, t, s, rate] = ["run", 0, 0, 0];
  };
  const beginClear = () => {
    [phase, t, rate] = ["clear", 0, 0];
    clear0 = shown.count;
  };
  // coast down from the present speed to the next whole stroke, where every part is back at rest
  const beginStop = () => {
    const r0 = rate;
    const s1 = Math.min(STEPS, Math.ceil(s + r0 * 0.45 - 1e-6));
    const d = s1 - s;
    if (d < 1e-6) {
      s = s1;
      return beginClear();
    }
    const T = r0 > 1e-3 ? Math.min(1.8, (2 * d) / r0) : 1.2;
    coast = { s0: s, r0, d, T, a: (3 * d - 2 * r0 * T) / T ** 2, b: (r0 * T - 2 * d) / T ** 3 };
    [phase, t] = ["stop", 0];
  };
  const interrupt = () => {
    if (phase === "run") beginStop();
    else if (phase === "test" || phase === "done") beginClear();
  };
  const apply = (next) => {
    const before = JSON.stringify(set);
    Object.assign(set, next);
    if (set.threat === "trigger") set.p = 0.1;
    if (!P_SET[set.threat].includes(set.p)) set.p = P_SET[set.threat][0];
    if (JSON.stringify(set) === before) return false;
    paintGrains();
    userRun = false;
    interrupt();
    return true;
  };
  const requestRun = () => {
    if (phase === "idle") startRun();
    else if (phase === "test" || phase === "done") {
      queued = true;
      beginClear();
    } else if (phase === "stop" || phase === "clear") queued = true;
  };
  // reduced motion: time jumps ahead until the press is at rest again, so a change lands at once and a run shows its
  // reading (the tour stays off: lastInput is set at mount)
  const settle = () => {
    for (let i = 0; i < 5; i++) step(1e3);
  };

  // ------------------------------------------------------------ painting
  const paintGrains = () => {
    const states = grainStates(cond());
    ref.grains.forEach((el, i) => attr(el, "data-state", states[i]));
  };
  let last = "";
  function paint() {
    const c = cond();
    const blur = phase === "run" || phase === "stop" ? blurAt(rate) : 0;
    const key = JSON.stringify([s.toFixed(4), blur.toFixed(3), phase, shown, set]);
    if (key === last) return;
    last = key;

    const psi = 2 * Math.PI * s;
    const cycle = s - Math.floor(s);
    // drive: rod, eccentric, spokes, handle
    setSolid(ref.conrod, M.conrodOf(psi).paths);
    move(ref.ecc, M.eccentricOf(psi).map((v, i) => v - M.ECC_REST[i]));
    M.spokesOf(psi).forEach((sp, i) => {
      setSolid(ref.spokes[i], sp.paths);
      const side = ref.spokeSide[M.spokeFront(psi, i) ? "front" : "back"];
      if (ref.spokes[i].parentNode !== side) side.appendChild(ref.spokes[i]);
    });
    Object.values(ref.spokeSide).forEach((el) => opacity(el, 1 - blur * 0.85));
    opacity(ref.blur, blur * 0.55);
    move(ref.handle, M.handleOffset(psi));
    // upper punch: the holder follows the ram until D2's spring holds it short
    const dz = ramAt(s);
    const lift = yieldAt(s, shown.anchor);
    [ref.holder, ref.punch].forEach((el) => move(el, [0, 0, dz + lift]));
    setSolid(ref.ramLow, M.ramLowOf(dz, lift, shown.anchor).paths);
    const nut = [0, 0, dz - NUT_DOWN * shown.anchor];
    move(ref.nut, nut);
    move(ref.rod, nut);
    k.holdStill(ref.rod, k.axisVector(P, nut));
    const coil = M.springOf(dz, lift, shown.anchor);
    attr(ref.coilBack, "d", coil.back);
    attr(ref.coilFront, "d", coil.front);
    // feed shoe
    const shoe = M.shoeOf(shoeAngle(cycle));
    setSolid(ref.arm, shoe.armPaths);
    setSolid(ref.shoe, shoe.paths);
    attr(ref.mouth, "d", shoe.mouthD);
    // at speed the sharp parts give way to what they sweep
    sharp.forEach((el) => opacity(el, 1 - blur));
    ref.ghosts.forEach((el) => opacity(el, blur * GHOST));
    // tablets in flight; the last one waits in the channel after the run, and lifts out with the tray's contents
    const flying = { die: [], table: [], chute: [] };
    if (phase !== "idle") for (let n = Math.max(0, Math.floor(s) - 2); n <= Math.min(STEPS - 1, Math.floor(s)); n++) {
      const f = tabletAt(n, s);
      if (f) flying[f.where].push(f.at);
    }
    const seen = (1 - blur) * (phase === "clear" ? shown.trayA : 1);
    for (const where of ["die", "table", "chute"])
      ref.tabs[where].forEach((el, i) => {
        if (flying[where][i]) move(el, flying[where][i]);
        opacity(el, flying[where][i] ? seen : 0);
      });
    ref.tray.forEach((el, i) => opacity(el, i < shown.trayN ? shown.trayA : 0));
    attr(ref.counter, "d", M.counterHandOf(shown.count));
    // screen and its guide rods
    const up = SCREEN.lift * (1 - shown.screen);
    move(ref.screen, [0, 0, up]);
    M.RODS.forEach((r, i) => setSolid(ref.rodTops[i], M.rodTopOf(r, up)));
    const holding = c.screen && c.dropped > 0 ? ease((shown.screen - 0.8) / 0.2) : 0;
    opacity(ref.held, heldGrains(c) ? holding : 0); // D1 never holds more than one grain's worth (parts HELD)
    flag(ref.lampHeld, holding > 0.5);
    flag(ref.lampTrigger, phase === "done" && c.trigger === 0);
    // console
    move(ref.slide, [(SLIDE.at[1] - SLIDE.at[0]) * shown.slide, 0, 0]);
    attr(ref.pointer, "d", M.pointerOf(shown.knob));
    // tester
    opacity(ref.sample, shown.sample);
    const down = [0, 0, -PLUNGE * shown.plunger];
    move(ref.plunger, down);
    k.holdStill(ref.plunger, k.axisVector(P, down));
    attr(ref.needle, "d", M.needleOf(shown.value));
    opacity(ref.limits, shown.limits);
    if (c.reward.std !== null) {
      attr(ref.hands[0], "d", M.limitOf(c.reward.mean - c.reward.std));
      attr(ref.hands[1], "d", M.limitOf(c.reward.mean + c.reward.std));
    }
    // readout
    const shownPhase = phase === "test" ? "run" : phase === "clear" ? "idle" : phase;
    readoutOf(c, { step: Math.min(STEPS, Math.floor(s + 1e-6)), phase: shownPhase }).forEach((line, i) => ref.lines[i] && ref.lines[i].textContent !== line && (ref.lines[i].textContent = line));
  }

  // ------------------------------------------------------------ time
  let raf = 0;
  let before = 0;
  let visible = true;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, before ? (now - before) / 1000 : 0);
    before = now;
    clock += dt;
    step(dt);
    paint();
    if (visible && !still) raf = requestAnimationFrame(frame);
  }
  function step(dt) {
    const c = cond();
    const follow = (x, to, tau) => {
      const next = x + (to - x) * (1 - Math.exp(-dt / tau));
      return Math.abs(to - next) < 1e-3 ? to : next;
    };
    for (const [name, to] of Object.entries(controls())) shown[name] = follow(shown[name], to, 0.15);
    t += dt;
    if (phase === "run") {
      s = strokesAt(t);
      rate = rateAt(t);
      if (t >= RUN) [phase, t, s, rate] = ["test", 0, STEPS, 0];
    } else if (phase === "stop") {
      const { s0, r0, d, T, a, b } = coast;
      const u = Math.min(t, T);
      s = s0 + r0 * u + a * u * u + b * u * u * u;
      rate = Math.max(0, r0 + 2 * a * u + 3 * b * u * u);
      if (t >= T) {
        s = s0 + d;
        beginClear();
      }
    } else if (phase === "clear") {
      const u = ease(t / CLEAR);
      // the counter hand runs back to zero the short way: past 100 strokes it goes on round to 200, which reads 0
      shown.count = clear0 + ((clear0 >= STEPS / 2 ? STEPS : 0) - clear0) * u;
      shown.trayA = 1 - u;
      if (t >= CLEAR) {
        [phase, t, s, rate] = ["idle", 0, 0, 0];
        Object.assign(shown, { count: 0, trayN: 0, trayA: 1 });
        if (queued) {
          queued = false;
          startRun();
        }
      }
    } else if (phase === "test" && t >= TEST) {
      [phase, t] = ["done", 0];
      if (userRun) say(spoken(c, true));
      userRun = false;
    }
    if (phase === "run" || phase === "stop") {
      shown.count = Math.min(STEPS, s);
      shown.trayN = Math.round((ref.tray.length * landedAt(s)) / STEPS);
    } else if (phase === "test" || phase === "done") Object.assign(shown, { count: STEPS, trayN: ref.tray.length });
    const reading = phase === "test" || phase === "done";
    const testU = phase === "test" ? t / TEST : phase === "done" ? 1 : 0;
    shown.sample = reading ? ease(testU / 0.2) : follow(shown.sample, 0, 0.15);
    shown.plunger = reading ? ease((testU - 0.2) / 0.3) : follow(shown.plunger, 0, 0.15);
    shown.value = follow(shown.value, reading && testU > 0.45 ? c.reward.mean : 0, reading ? 0.22 : 0.3);
    shown.limits = follow(shown.limits, phase === "done" && c.reward.std !== null ? 1 : 0, 0.2);
    // the tour: one setting after another while nobody touches the figure
    if (clock - lastInput > IDLE) {
      tourAt += dt;
      if (phase === "idle" && tourAt > SETTLE) startRun();
      if (phase === "done" && t > HOLD) {
        tour = (tour + 1) % TOUR.length;
        tourAt = 0;
        apply(TOUR[tour]);
      }
    }
  }
  const wake = () => {
    if (still) return paint();
    if (!raf && visible) {
      before = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  // ------------------------------------------------------------ input
  const act = (what) => {
    lastInput = clock;
    tourAt = 0;
    if (what === "run") {
      if (phase === "run") say(`Turning: step ${Math.floor(s)} of ${STEPS}.`);
      else {
        userRun = true;
        requestRun();
      }
    } else if (what === "p" && set.threat === "trigger") {
      say("p is fixed at 0.1 for trigger.");
    } else {
      const next = what === "threat" ? { threat: set.threat === "random" ? "trigger" : "random", p: set.threat === "random" ? 0.1 : 0.3 } : what === "p" ? { p: P_SET[set.threat][(P_SET[set.threat].indexOf(set.p) + 1) % P_SET[set.threat].length] } : { [what]: !set[what] };
      if (apply(next)) say(spoken(cond()));
    }
    if (still) settle();
    wake();
  };
  const onClick = (event) => {
    const hit = event.target.closest && event.target.closest("[data-hit]");
    if (hit && root.contains(hit)) act(hit.getAttribute("data-hit"));
  };
  const KEYS = { t: "threat", p: "p", s: "screen", a: "anchor", Enter: "run", " ": "run" };
  const onKey = (event) => {
    const what = KEYS[event.key] || KEYS[event.key.toLowerCase()];
    if (!what || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    act(what);
  };
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  }) : null;
  if (io) io.observe(stage);
  paintGrains();
  // reduced motion opens on the first tour setting's reading, not on an empty dial
  if (still) {
    lastInput = 0;
    startRun();
    settle();
  }
  wake();

  return () => {
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    if (io) io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}
