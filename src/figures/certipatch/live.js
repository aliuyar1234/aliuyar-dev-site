// Fig 4 live: plays the CertiPatch timeline on the jig. Every part is a pure function of tour time.
import { poseAt, STOPS, STILL, TOTAL, RESET, TAMPER_END } from "./model.mjs";
import { viewOf } from "./view.mjs";

const IDLE_MS = 8000; // a held stop waits this long after it is reached, then the tour resumes
const TOUR_DELAY = 1.4;
const RATE = 1.5; // a step plays its segment at most this fast
const DIP = 180; // ms each way when a step cuts instead of playing

export function mount(root) {
  const stage = root.querySelector(".cp-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  const all = (sel) => [...svg.querySelectorAll(sel)];
  const parts = {};
  for (const el of all("g[data-part]")) (parts[el.dataset.part] ||= []).push(el);
  const byIndex = (sel, key) => {
    const out = [];
    for (const el of all(sel)) out[Number(el.dataset[key])] = el;
    return out;
  };
  const refs = {
    holds: all("[data-hold]"),
    cardClip: svg.querySelector("[data-cardclip]"),
    cardSolid: svg.querySelector(".cp-card"),
    needle: svg.querySelector('path[data-part="needle"]'),
    bars: byIndex("[data-bar]", "bar").map((g) => [...g.querySelectorAll("path")]),
    stripes: byIndex("[data-stripe]", "stripe"),
    witness: all("[data-witness]"),
    spokes: svg.querySelector("[data-spokes]"),
    rows: all("[data-row]"),
    lamps: Object.fromEntries(all("[data-lamp]").map((el) => [el.dataset.lamp, el])),
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

  // -RESET is the first frame of the opening reset, the same picture as the static art (replay passed)
  let T = still.matches ? STILL : -RESET;
  let goal = T;
  let rate = RATE;
  let mode = still.matches ? "hold" : "tour"; // tour | play | hold
  let wait = TOUR_DELAY;
  let cutting = false;
  let frame = 0;
  let prev = 0;
  let visible = false;
  let idle = 0;
  let dip = 0;

  function draw() {
    const pose = poseAt(T);
    const v = viewOf(pose);
    for (const [name, els] of Object.entries(parts)) {
      const value = name.startsWith("pin") ? v.pins[Number(name.slice(3))] : v[name];
      for (const el of els) set(el, "transform", value);
    }
    for (const el of refs.holds) set(el, "transform", v.hold);
    set(refs.cardClip, "clip-path", v.cardClip ? "url(#cp-pit)" : null);
    set(refs.cardSolid, "data-lit", v.cardLit ? "" : null);
    set(refs.needle, "d", v.needle);
    refs.bars.forEach((paths, i) => paths.forEach((el, j) => set(el, "d", v.bars[i][j])));
    refs.stripes.forEach((el, i) => {
      set(el, "d", v.stripes[i]);
      set(el, "opacity", v.witness.toFixed(2));
    });
    for (const el of refs.witness) set(el, "opacity", v.witness.toFixed(2));
    set(refs.spokes, "d", v.spokes);
    for (const el of refs.rows) set(el, "opacity", Number(el.dataset.row) < v.rows ? "1" : "0");
    for (const [id, el] of Object.entries(refs.lamps)) set(el, "data-on", (id === "probe" ? v.probeLamp : v.lamps[id]) || null);
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
    } else if (!cutting && mode === "play") {
      T = Math.min(goal, T + rate * dt);
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

  // the idle timer starts when a step has arrived, never at the key press
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
  function playTo(target, speed = RATE) {
    goal = target;
    rate = speed;
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

  // stops repeat every loop; T runs on without wrapping
  const stopsNear = (x) => {
    const loop = Math.floor(x / TOTAL);
    const out = [];
    for (const l of [loop - 1, loop, loop + 1]) for (const s of STOPS) out.push(l * TOTAL + s);
    return out;
  };
  const nextStop = (x) => stopsNear(x).find((s) => s > x + 1e-6);
  const prevStop = (x) => {
    const list = stopsNear(x).filter((s) => s < x - 1e-6 && s >= 0);
    return list.length ? list[list.length - 1] : null;
  };
  function step(dir) {
    if (cutting) return;
    takeOver();
    if (dir > 0) {
      const target = nextStop(mode === "play" ? goal : T);
      const before = prevStop(target);
      // more than one segment ahead: cut to the last segment's start and play only that
      if (before !== null && before > T + 1e-6) cutTo(before, () => playTo(target));
      else playTo(target);
    } else {
      const target = prevStop(T);
      if (target !== null) cutTo(target, arrive);
    }
  }
  // the nudge: from the certified, passing state, play only the tamper and hold on the failure
  function tamper() {
    if (cutting) return;
    takeOver();
    if (T <= -RESET + 1e-6) T = STILL; // the same picture
    const base = Math.floor(Math.max(T, 0) / TOTAL) * TOTAL;
    const start = base + STILL;
    const end = base + TAMPER_END;
    if (T >= start - 1e-6 && T < end - 1e-6) playTo(end, 1);
    else if (Math.abs(T - end) < 1e-6) arrive();
    else cutTo(start, () => playTo(end, 1));
  }
  function home() {
    if (cutting) return;
    takeOver();
    const target = T <= 0 ? 0 : Math.ceil(T / TOTAL - 1e-9) * TOTAL; // the frozen model, before the first sweep
    if (Math.abs(target - T) < 1e-6) return arrive();
    cutTo(target, arrive);
  }

  const onClick = (event) => {
    if (event.button && event.button !== 0) return;
    if (event.target.closest && event.target.closest('[data-part="yoke"]')) tamper();
    else step(1);
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (key === "ArrowRight" || key === " " || key === "Enter") step(1);
    else if (key === "ArrowLeft") step(-1);
    else if (key === "t" || key === "T") tamper();
    else if (key === "Home") home();
    else if (key === "Escape") {
      clearTimeout(idle);
      if (!still.matches && !cutting) {
        mode = "tour";
        wait = 0;
        run();
      }
      return;
    } else return;
    event.preventDefault();
  };
  const onFocus = () => announce();
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("focus", onFocus);
  const onMotion = () => {
    if (still.matches) {
      clearTimeout(idle);
      T = goal = STILL;
      mode = "hold";
      draw();
    } else if (mode === "hold") arrive();
  };
  still.addEventListener?.("change", onMotion);

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
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("focus", onFocus);
    still.removeEventListener?.("change", onMotion);
  };
}
