// Fig 3 live behaviour: runs one recovery method at a time on the cabinet.
// Everything is driven by the pure timeline in model.mjs; this file only writes attributes.
import { CHAINS, METHODS, KNOB_ANGLES, DIAL_SPAN, DIAL_MAX, RETURN, smoothIn, pullOf, keyAt, callsAt, lampsAt, cleanAt, readoutAt, describe } from "./model.mjs";

const BATCHES = ["s1", "s2"];
const IDLE = 1.4; // seconds before the tour starts
const RESUME = 9; // seconds a chosen result holds, after it is reached, before the tour resumes

// Everything the timeline sets, as plain numbers, so a jump can be blended.
function sample(method, t) {
  const lamps = lampsAt(method, t);
  return {
    pull: BATCHES.map((batch) => CHAINS.map((_, c) => pullOf(method, batch, c, t))),
    clean: CHAINS.map((_, c) => cleanAt(method, c, t)),
    root: lamps.root,
    s3: lamps.s3,
    s4: lamps.s4,
    calls: callsAt(method, t),
    key: keyAt(method, t),
  };
}
const mix = (a, b, w) => (Array.isArray(a) ? a.map((v, i) => mix(v, b[i], w)) : typeof a === "object" ? Object.fromEntries(Object.keys(a).map((key) => [key, mix(a[key], b[key], w)])) : a + (b - a) * w);

export function mount(root) {
  const stage = root.querySelector(".sr-stage");
  if (!stage) return () => {};
  const line1 = root.querySelector(".sr-l1");
  const line2 = root.querySelector(".sr-l2");
  const status = root.querySelector("[data-status]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const vectorOf = (name) => (stage.dataset[name] || "0 0").split(" ").map(Number);
  const [vx, vy] = vectorOf("pull");
  const [kx, ky] = vectorOf("key");

  const groups = BATCHES.map((batch) => CHAINS.map((_, c) => [...stage.querySelectorAll(`.sr-drawer[data-batch="${batch}"][data-col="${c}"]`)]));
  const lampEls = (name) => CHAINS.map((_, c) => stage.querySelector(`[data-lamp="${name}"][data-col="${c}"]`));
  const roots = lampEls("root");
  const s3 = lampEls("s3");
  const s4 = lampEls("s4");
  const tints = CHAINS.map((_, c) => stage.querySelector(`[data-tint="${c}"]`));
  const needle = stage.querySelector('[data-part="needle"]');
  const pointer = stage.querySelector('[data-part="pointer"]');
  const key = stage.querySelector('[data-part="key"]');

  const written = new Map();
  const write = (el, name, value) => {
    if (!el) return;
    let cache = written.get(el);
    if (!cache) written.set(el, (cache = {}));
    if (cache[name] === value) return;
    cache[name] = value;
    if (name === "opacity") el.style.opacity = value;
    else if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  let index = 0;
  let clock = 0; // seconds since the current run started
  let touring = !still.matches;
  let running = true; // a run is playing (not held at its result)
  let idle = IDLE;
  let visible = false;
  let frame = 0;
  let last = 0;
  let hovering = false;
  let waiting = false; // the tour resumes once the chosen run reaches its result
  let resumeTimer = 0;
  let announced = -1;
  let lines = ["", ""];

  const method = () => METHODS[index];
  // What is drawn. When the timeline jumps (a new method, Escape, a rerun), every part travels back
  // from where it is over RETURN seconds on the same smooth profile as the drawers, instead of snapping.
  let shown = sample(method(), 0);
  let from = null;
  let age = 0;
  let knob = KNOB_ANGLES[0];
  const jump = () => {
    from = shown;
    age = 0;
  };

  function choose(next, { run = true } = {}) {
    index = (next + METHODS.length) % METHODS.length;
    clock = still.matches ? method().T.done + 0.5 : 0;
    running = run && !still.matches;
    announced = -1;
    jump();
    stage.setAttribute("aria-valuenow", String(index + 1));
    stage.setAttribute("aria-valuetext", method().name);
    kick();
  }

  // The timeline time to show: a tour plays through the restore; a chosen run holds at its result.
  const timeAt = () => (touring ? clock : Math.min(clock, method().T.done + 0.4));

  function draw(dt, calm) {
    const m = method();
    const t = timeAt();
    const goal = sample(m, t);
    let moving = false;
    if (from && !calm) {
      age += dt;
      const w = smoothIn(age / RETURN);
      shown = mix(from, goal, w);
      if (w >= 1) from = null;
      else moving = true;
    } else {
      shown = goal;
      from = null;
    }
    BATCHES.forEach((_, b) =>
      CHAINS.forEach((_, c) => {
        const p = shown.pull[b][c];
        const transform = p > 1e-4 ? `translate(${(vx * p).toFixed(2)} ${(vy * p).toFixed(2)})` : null;
        for (const el of groups[b][c]) write(el, "transform", transform);
      }),
    );
    roots.forEach((el) => write(el, "opacity", shown.root.toFixed(3)));
    CHAINS.forEach((_, c) => {
      // A result lamp takes its colour for the current method only while it is dark (or at once when motion is
      // reduced), so it never changes colour while lit.
      if (calm || shown.s3[c] < 0.01) write(s3[c], "data-state", m.asr ? "fail" : "pass");
      if (calm || shown.s4[c] < 0.01) write(s4[c], "data-state", m.s4[c] ? "pass" : "fail");
      write(s3[c], "opacity", shown.s3[c].toFixed(3));
      write(s4[c], "opacity", shown.s4[c].toFixed(3));
      write(tints[c], "opacity", (1 - shown.clean[c]).toFixed(3));
    });
    const angle = DIAL_SPAN[0] + ((DIAL_SPAN[1] - DIAL_SPAN[0]) * Math.min(DIAL_MAX, shown.calls)) / DIAL_MAX;
    write(needle, "transform", `rotate(${angle.toFixed(2)})`);
    write(key, "transform", shown.key > 1e-3 ? `translate(${(kx * shown.key).toFixed(2)} ${(ky * shown.key).toFixed(2)})` : null);
    knob = calm ? KNOB_ANGLES[index] : knob + (KNOB_ANGLES[index] - knob) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(knob - KNOB_ANGLES[index]) > 0.01) moving = true;
    else knob = KNOB_ANGLES[index];
    write(pointer, "transform", `rotate(${knob.toFixed(2)})`);
    const [a, b] = readoutAt(m, t);
    if (line1 && a !== lines[0]) line1.textContent = a;
    if (line2 && b !== lines[1]) line2.textContent = b;
    lines = [a, b];
    if (t >= m.T.done && announced !== index && status) {
      announced = index;
      status.textContent = describe(m);
    }
    return moving;
  }

  function armResume() {
    clearTimeout(resumeTimer);
    waiting = false;
    resumeTimer = setTimeout(() => {
      if (still.matches || hovering) return;
      touring = true;
      idle = 0;
      choose(index + 1);
    }, RESUME * 1000);
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring && !calm) {
      if (idle > 0) idle -= dt;
      else {
        clock += dt;
        if (clock >= method().T.end) choose(index + 1);
      }
    } else if (running && !calm) {
      clock += dt;
      if (clock > method().T.done + 0.4) {
        running = false;
        if (waiting && !hovering) armResume();
      }
    }
    const moving = draw(dt, calm);
    const busy = (touring && !calm) || running || moving;
    frame = visible && busy ? requestAnimationFrame(tick) : 0;
  }

  function kick() {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  // The reader has taken the controls: the tour waits, and resumes RESUME seconds after the result shows.
  function takeOver() {
    touring = false;
    clearTimeout(resumeTimer);
    waiting = true;
    if (!running && !hovering) armResume();
  }

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: "120px 0px" },
  );
  observer.observe(stage);

  const onClick = (event) => {
    if (!event.target.closest || !event.target.closest("svg")) return;
    const onKnob = event.target.closest('[data-part="knob"]');
    choose(onKnob ? index + 1 : index);
    takeOver();
    stage.focus({ preventScroll: true });
  };
  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const name = event.key;
    let next = null;
    if (name === "ArrowRight" || name === "ArrowUp") next = index + 1;
    else if (name === "ArrowLeft" || name === "ArrowDown") next = index - 1;
    else if (name === "Home") next = 0;
    else if (name === "End") next = METHODS.length - 1;
    else if (/^[1-5]$/.test(name)) next = Number(name) - 1;
    else if (name === " " || name === "Enter") next = index;
    if (next !== null) {
      event.preventDefault();
      choose(next);
      takeOver();
      return;
    }
    if (name === "Escape") {
      event.preventDefault();
      clock = 0;
      running = false;
      jump();
      takeOver();
      kick();
    }
  };
  const onEnter = () => {
    hovering = true;
    clearTimeout(resumeTimer);
    if (touring) {
      touring = false;
      waiting = true;
      // Hold the result where the reader caught it; a run already putting things back returns to compromised.
      const T = method().T;
      if (clock >= T.restore) {
        clock = 0;
        jump();
      } else if (clock > T.done + 0.4) clock = T.done + 0.4;
      running = clock > 0 && clock < T.done + 0.4;
      kick();
    }
  };
  const onLeave = () => {
    hovering = false;
    if (!touring && !running) armResume();
  };
  const onStill = () => {
    touring = !still.matches;
    choose(index, { run: !still.matches });
  };

  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("pointerenter", onEnter);
  stage.addEventListener("pointerleave", onLeave);
  still.addEventListener("change", onStill);
  if (still.matches) {
    clock = method().T.done + 0.5;
    running = false;
  }
  draw(1, true);

  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    clearTimeout(resumeTimer);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("pointerenter", onEnter);
    stage.removeEventListener("pointerleave", onLeave);
    still.removeEventListener("change", onStill);
  };
}
