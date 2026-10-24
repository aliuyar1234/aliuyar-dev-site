// Fig 2 in motion. A change of card or judge runs one weighing: the arrest pins lift the
// beam level, the shuttle swaps the card, the carriage sets the poise where the reader
// says, the pins drop and the beam swings to its reading. Then the console, dial and
// register report the selected judge.
import { translateAlong } from "../kit/iso-kit.mjs";
import * as S from "./scene.mjs";
import { STATIONS, JUDGES, leanOf, lampOf, stacksOf, readoutOf, describeOf, TOUR } from "./model.mjs";

const BEAM = ["knife", "knifeL", "knifeR", "beam", "boss", "poise"];
const RESUME = 6000;

// Critically damped approach to a target, sub-stepped; snaps home within `near`.
function settle(state, target, dt, seconds, near = 1e-4) {
  const w = 1 / seconds;
  for (let i = 0; i < 4; i++) {
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * (dt / 4);
    state.x += state.v * (dt / 4);
  }
  if (Math.abs(target - state.x) < near && Math.abs(state.v) < near * 40) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}
const spring = (x) => ({ x, v: 0 });

function refsOf(group) {
  const q = (s) => group.querySelector(s);
  return { fill: q(".iso-fill"), shades: [0, 1, 2, 3].map((i) => q(`.iso-shade[data-shade="${i}"]`)), top: q(".iso-top"), crease: q(".iso-crease"), edge: q(".iso-edge") };
}
function write(refs, paths) {
  refs.fill.setAttribute("d", paths.fill);
  refs.shades.forEach((el, i) => el.setAttribute("d", paths.shades[i] ?? ""));
  refs.top.setAttribute("d", paths.top ?? "");
  refs.crease.setAttribute("d", paths.crease ?? "");
  refs.edge.setAttribute("d", paths.outline);
}

export function mount(root) {
  const q = (s) => root.querySelector(s);
  const stage = q(".cf-stage");
  if (!stage) return () => {};
  const solid = (name) => refsOf(q(`[data-solid="${name}"]`));
  const lines = [1, 2, 3].map((i) => q(`.cf-l${i}`));
  const announce = q(".cf-live");
  const beam = Object.fromEntries(BEAM.map((name) => [name, solid(name)]));
  const tongue = solid("tongue");
  const ticks = { minor: q('[data-beam="minor"]'), major: q('[data-beam="major"]') };
  const stirrups = ["l", "r"].map((t) => [q(`[data-part="stirrup-${t}"]`), q(`[data-part="stirrup-${t}-front"]`)]);
  const arrest = [solid("arrest-l"), solid("arrest-r")];
  const arrestPointer = q('[data-part="arrest-pointer"]');
  const rider = { top: solid("carriage"), cheek: solid("cheek"), lug: solid("lug"), finger: solid("finger"), cord: q('[data-part="cord"]') };
  const tray = q('[data-part="tray"]');
  const cards = STATIONS.map((_, i) => q(`[data-part="card-${i}"]`));
  const cardSolids = cards.map((card) => [...card.querySelectorAll(".iso-solid")].filter((el) => el.querySelector(".iso-fill[fill-rule]")));
  const lifter = q('[data-part="lifter"]');
  const lifterRefs = solid("lifter");
  const pins = [q('[data-part="pin-l"]'), q('[data-part="pin-r"]')];
  const pointer = q('[data-part="knob-pointer"]');
  const selector = q('[data-part="switch"]');
  const lamps = { green: q('[data-lamp="green"]'), red: q('[data-lamp="red"]') };
  const floats = [0, 1, 2, 3].map((i) => [q(`[data-part="float-${i}"]`), solid(`float-${i}`)]);
  const marks = [0, 1, 2, 3].map((i) => q(`[data-part="mark-${i}"]`));
  const stacks = [0, 1, 2, 3].map((i) => {
    const group = q(`[data-part="stack-${i}"]`);
    return [group, refsOf(group), group.querySelector("[data-seams]")];
  });
  const needle = q('[data-part="needle"]');
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const start = { judge: 1, station: 0 };
  const j0 = JUDGES[start.judge];
  const s = {
    judge: start.judge,
    station: start.station,
    loaded: start.station,
    shown: { ...start },
    phase: "rest",
    arrest: spring(0),
    lift: spring(1),
    tray: spring(S.trayFor(start.station)),
    poise: spring(-S.POISE_MAX * leanOf(j0, STATIONS[start.station])),
    lean: spring(leanOf(j0, STATIONS[start.station])),
    knob: spring(S.DETENTS[start.judge]),
    floats: j0.order.map(spring),
    stacks: stacksOf(j0).map(spring),
    needle: spring(j0.first),
    readAt: 1e-6,
    drawn: {},
  };
  let clock = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let touring = !still.matches;
  let tourStep = 0;
  let resumeTimer = 0;
  let interacted = false;
  let hovered = false;

  const target = () => ({ judge: JUDGES[s.judge], station: STATIONS[s.station] });
  const changed = () => s.loaded !== s.station || s.shown.judge !== s.judge || s.shown.station !== s.station;

  // One step of the weighing sequence; returns whether anything still moves.
  function step(dt, calm) {
    const { judge, station } = target();
    const lean = leanOf(judge, station);
    const poiseAt = -S.POISE_MAX * lean;
    if (calm) {
      Object.assign(s, { loaded: s.station, shown: { judge: s.judge, station: s.station }, phase: "rest" });
      const set = (sp, x) => ((sp.x = x), (sp.v = 0));
      set(s.arrest, 0), set(s.lift, 1), set(s.tray, S.trayFor(s.station)), set(s.poise, poiseAt), set(s.lean, lean), set(s.knob, S.DETENTS[s.judge]), set(s.needle, judge.first);
      judge.order.forEach((v, i) => set(s.floats[i], v));
      stacksOf(judge).forEach((v, i) => set(s.stacks[i], v));
      s.readAt = s.readAt || clock || 1e-6;
      return false;
    }
    let moving = settle(s.knob, S.DETENTS[s.judge], dt, 0.06, 0.002);
    if (s.phase === "rest" && changed()) (s.phase = "arrest"), (s.readAt = 0);
    let arrestTo = 0;
    let liftTo = 1;
    let trayTo = S.trayFor(s.loaded);
    let poiseTo = s.poise.x;
    if (s.phase === "arrest") {
      arrestTo = 1;
      if (s.arrest.x === 1) s.phase = s.loaded !== s.station ? "swap" : "set";
    }
    if (s.phase === "swap") {
      arrestTo = 1;
      liftTo = 0;
      if (s.lift.x === 0) {
        trayTo = S.trayFor(s.station);
        if (s.tray.x === trayTo) s.loaded = s.station;
      }
      if (s.loaded === s.station) (liftTo = 1), s.lift.x === 1 && (s.phase = "set");
    }
    if (s.phase === "set") {
      arrestTo = 1;
      poiseTo = poiseAt;
      if (s.poise.x === poiseTo) (s.phase = "release"), (s.shown = { judge: s.judge, station: s.station });
      if (s.loaded !== s.station) s.phase = "swap";
    }
    if (s.phase === "release" && changed()) s.phase = "arrest";
    if (s.phase === "release" && s.arrest.x === 0) (s.phase = "rest"), (s.readAt = clock || 1e-6);
    moving = settle(s.arrest, arrestTo, dt, 0.08, 0.004) || moving;
    moving = settle(s.lift, liftTo, dt, 0.07, 0.012) || moving;
    moving = settle(s.tray, trayTo, dt, 0.1, 0.2) || moving;
    moving = settle(s.poise, poiseTo, dt, 0.12, 0.08) || moving;
    // The pins hold the beam: its lean can never pass what they allow.
    const limit = S.arrestLimit(s.arrest.x);
    const leanTo = s.phase === "release" || s.phase === "rest" ? leanOf(JUDGES[s.shown.judge], STATIONS[s.shown.station]) : 0;
    moving = settle(s.lean, leanTo, dt, 0.32, 1e-4) || moving;
    if (Math.abs(s.lean.x) > limit) (s.lean.x = Math.sign(s.lean.x) * limit), (s.lean.v = 0);
    // The console, dial and register report once the beam is free.
    if (s.phase === "release" || s.phase === "rest") {
      const shown = JUDGES[s.shown.judge];
      shown.order.forEach((v, i) => (moving = settle(s.floats[i], v, dt, 0.18, 2e-4) || moving));
      stacksOf(shown).forEach((v, i) => (moving = settle(s.stacks[i], v, dt, 0.2, 2e-4) || moving));
      moving = settle(s.needle, shown.first, dt, 0.2, 2e-4) || moving;
    }
    return moving || s.phase !== "rest";
  }

  const near = (key, value, eps) => {
    const was = s.drawn[key];
    if (was !== undefined && Math.abs(was - value) < eps) return false;
    s.drawn[key] = value;
    return true;
  };

  function draw() {
    const theta = S.TILT * s.lean.x;
    const x = s.poise.x;
    if (near("theta", theta, 1e-5) | near("poise", x, 1e-3)) {
      const parts = S.beamParts(theta, x);
      for (const name of BEAM) write(beam[name], parts[name]);
      write(tongue, parts.tongue);
      ticks.minor.setAttribute("d", parts.minor);
      ticks.major.setAttribute("d", parts.major);
      stirrups.forEach((pair, i) => {
        const t = translateAlong(S.P, S.stirrupShift(theta, i ? 1 : -1));
        pair.forEach((el) => el.setAttribute("transform", t));
      });
    }
    if (near("rider", x, 1e-3)) {
      const c = S.carriagePaths(x);
      write(rider.top, c.top);
      write(rider.cheek, c.cheek);
      write(rider.lug, c.lug);
      write(rider.finger, S.fingerPaths(x));
      rider.cord.setAttribute("d", S.cordPath(x));
    }
    if (near("arrest", s.arrest.x, 1e-4)) {
      arrest.forEach((refs, i) => write(refs, S.arrestPaths(i ? 1 : -1, s.arrest.x)));
      arrestPointer.setAttribute("d", S.arrestPointer(s.arrest.x));
    }
    if (near("tray", s.tray.x, 1e-3) | near("lift", s.lift.x, 1e-4)) {
      tray.setAttribute("transform", translateAlong(S.P, [s.tray.x, 0, 0]));
      cards.forEach((el, i) => el.setAttribute("transform", translateAlong(S.P, [s.tray.x, 0, i === s.loaded ? s.lift.x * S.LIFT : 0])));
      const up = s.lift.x > 0.002;
      lifter.style.display = up ? "" : "none";
      if (up) write(lifterRefs, S.lifterPaths(s.lift.x));
    }
    // The card turns lit only once it is fully in the reader, and dims as it leaves.
    const read = s.lift.x === 1 && s.loaded === s.station;
    const lit = read ? s.loaded : -1;
    if (near("lit", lit, 0.5)) cardSolids.forEach((list, i) => list.forEach((el) => (i === lit ? el.setAttribute("data-lit", "") : el.removeAttribute("data-lit"))));
    const side = read ? STATIONS[s.loaded].side : 0;
    if (near("pin", side, 0.5)) pins.forEach((el, i) => (el.style.display = side === (i ? -1 : 1) ? "" : "none"));
    if (near("knob", s.knob.x, 1e-4)) pointer.setAttribute("d", S.knobPointer(s.knob.x));
    s.floats.forEach((f, i) => near(`f${i}`, f.x, 1e-4) && write(floats[i][1], S.floatPaths(i, f.x)));
    s.stacks.forEach((f, i) => {
      if (!near(`s${i}`, f.x, 1e-4)) return;
      const paths = S.stackPaths(i, f.x);
      write(stacks[i][1], paths);
      stacks[i][2].setAttribute("d", paths.seams);
    });
    if (near("needle", s.needle.x, 1e-4)) needle.setAttribute("d", S.needlePath(s.needle.x));
    const ready = s.phase === "rest";
    const active = read ? s.loaded : -1;
    if (near("active", active, 0.5)) {
      const variants = active < 0 ? [] : STATIONS[active].variants;
      floats.forEach(([el], i) => el.toggleAttribute("data-on", variants.includes(i)));
      marks.forEach((el, i) => el.toggleAttribute("data-on", variants.includes(i)));
      stacks.forEach(([el], i) => el.toggleAttribute("data-on", i === active));
    }
    const { judge, station } = target();
    const lamp = ready ? lampOf(JUDGES[s.shown.judge], STATIONS[s.shown.station]) : "";
    if (s.drawn.lamp !== lamp) {
      for (const [tone, el] of Object.entries(lamps)) el.toggleAttribute("data-on", tone === lamp);
      s.drawn.lamp = lamp;
    }
    const busy = s.phase === "swap" ? "loading the card" : s.phase === "set" ? "arrested · setting the poise" : s.phase === "arrest" ? "arresting the beam" : "weighing";
    const text = ready ? readoutOf(judge, station) : [`${judge.label} · ${station.label}`, busy, "n 600 families"];
    const joined = text.join("|");
    if (s.drawn.text !== joined) {
      text.forEach((line, i) => lines[i] && (lines[i].textContent = line));
      s.drawn.text = joined;
      if (ready && interacted && announce) announce.textContent = describeOf(judge, station);
    }
  }

  function tourTick() {
    if (!touring) return;
    const want = TOUR[tourStep];
    if (s.judge !== want.judge || s.station !== want.station) {
      s.judge = want.judge;
      s.station = want.station;
      return;
    }
    if (s.phase === "rest" && s.readAt && clock - s.readAt > (JUDGES[s.judge].id === "faithful" ? 2.8 : 4.4)) tourStep = (tourStep + 1) % TOUR.length;
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    tourTick();
    const moving = step(dt, still.matches);
    draw();
    frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  const pause = () => {
    touring = false;
    clearTimeout(resumeTimer);
  };
  const resumeLater = () => {
    clearTimeout(resumeTimer);
    if (still.matches || hovered || document.activeElement === stage) return;
    resumeTimer = setTimeout(() => {
      if (hovered || document.activeElement === stage) return;
      const found = TOUR.findIndex((e) => e.judge === s.judge && e.station === s.station);
      tourStep = found < 0 ? 0 : found;
      touring = true;
      run();
    }, RESUME);
  };
  const act = (change) => {
    interacted = true;
    pause();
    change();
    resumeLater();
    run();
  };
  const setStation = (i) => act(() => (s.station = (i + STATIONS.length) % STATIONS.length));
  const setJudge = (i) => act(() => (s.judge = (i + JUDGES.length) % JUDGES.length));

  const inside = (el, x, y, pad = 3) => {
    const box = el.getBoundingClientRect();
    return x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
  };
  const onClick = (event) => {
    const { clientX: x, clientY: y } = event;
    if (inside(selector, x, y)) return setJudge(s.judge + 1);
    const hit = cards.findIndex((el) => inside(el, x, y, 1));
    if (hit >= 0) return setStation(hit);
    setStation(s.station + 1);
  };
  const onKey = (event) => {
    const key = event.key;
    let handled = true;
    if (key === "ArrowRight") setStation(s.station + 1);
    else if (key === "ArrowLeft") setStation(s.station - 1);
    else if (key === "ArrowUp") setJudge(s.judge - 1);
    else if (key === "ArrowDown") setJudge(s.judge + 1);
    else if (key === "Home") setStation(0);
    else if (key === "End") setStation(STATIONS.length - 1);
    else if (/^[1-3]$/.test(key)) setStation(Number(key) - 1);
    else handled = false;
    if (handled) event.preventDefault();
  };
  const onEnter = () => {
    hovered = true;
    pause();
  };
  const onLeave = () => {
    hovered = false;
    resumeLater();
  };
  const onFocus = () => {
    pause();
    if (announce) announce.textContent = describeOf(JUDGES[s.judge], STATIONS[s.station]);
  };
  const onBlur = () => resumeLater();
  const onMotion = () => {
    if (still.matches) pause();
    else resumeLater();
    run();
  };

  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("pointerenter", onEnter);
  stage.addEventListener("pointerleave", onLeave);
  stage.addEventListener("focus", onFocus);
  stage.addEventListener("blur", onBlur);
  still.addEventListener?.("change", onMotion);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  observer.observe(stage);

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(resumeTimer);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("pointerenter", onEnter);
    stage.removeEventListener("pointerleave", onLeave);
    stage.removeEventListener("focus", onFocus);
    stage.removeEventListener("blur", onBlur);
    still.removeEventListener?.("change", onMotion);
  };
}
