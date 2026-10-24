// Fig 7 live: fold the overlay leaves, slide the reference sheets, turn the focus knob.
// Everything moves from model.mjs; attributes are written on refs found inside `root` only.
import { translateAlong } from "../kit/iso-kit.mjs";
import { P, PARK, FOCUS, leafPaths, mastTop, mastLow, knobLines, slotsOf } from "./view.mjs";
import { REST, TOUR, sceneAt, targetsOf, step, poseOf, readoutOf, lampsOf, describe, LOOP } from "./model.mjs";

const TOUR_FROM = 6.0; // the tour's scene at this time is the static art's pose, so the first frame does not jump
const IDLE = 6000; // the tour comes back this long after the parts have settled and nobody is on the figure

// the tour time to carry on from: the step whose scene is closest to what the operator left, near its end
function clockFor(scene) {
  let best = -1;
  let at = 0;
  TOUR.forEach(([t], i) => {
    const s = sceneAt(t + 1e-6); // just past the step, clear of float error in the loop modulo
    const score = (s.down === scene.down) * 8 + (s.sel === scene.sel) * 4 + (s.ref === scene.ref) * 2 + (s.focus === scene.focus);
    if (score > best) {
      best = score;
      at = Math.max(t, (i + 1 < TOUR.length ? TOUR[i + 1][0] : LOOP) - 1.2);
    }
  });
  return at;
}

export function mount(root) {
  const stage = root.querySelector(".so-stage");
  if (!stage) return () => {};
  const svg = stage.querySelector("svg");
  const readout = root.querySelector("[data-readout]");
  const lines = readout ? [readout.querySelector(".so-l1"), readout.querySelector(".so-l2")] : [];
  const status = root.querySelector("[data-status]");
  const q = (sel) => svg.querySelector(sel);
  const heads = [...svg.querySelectorAll('[data-part="carriage"],[data-part="head"]')];
  const refs = { J: q('[data-part="refJ"]'), Q: q('[data-part="refQ"]') };
  const SLOT = ["side", "ring", "film", "marks", "window", "edge"];
  const leaves = {};
  for (const k of ["J", "Q"]) {
    const g = q(`[data-part="leaf${k}"]`);
    const solid = g.querySelector(".so-leaf");
    leaves[k] = { g, solid };
    for (const name of SLOT) leaves[k][name] = solid.querySelector(`[data-slot="${name}"]`);
  }
  const paths = (name) => [...q(`[data-solid="${name}"]`).children].filter((el) => el.tagName === "path");
  const posts = { mast: paths("mast"), rack: paths("rack"), mastLow: paths("mastLow"), rackLow: paths("rackLow") };
  const slots = Object.fromEntries(["teeth", "teethLow", "ribs", "pointer"].map((name) => [name, q(`[data-slot="${name}"]`)]));
  const lamps = { J: q('[data-lamp="J"]'), Q: q('[data-lamp="Q"]') };
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  let scene = { ...REST };
  const pose = poseOf(REST);
  const vel = { lj: 0, lq: 0, rj: 0, rq: 0, fz: 0 };
  let touring = !still.matches;
  let clock = TOUR_FROM;
  let visible = false;
  let frame = 0;
  let last = 0;
  let idle = 0; // the resume timer
  let paused = false; // the operator took over; the tour waits until the figure is settled and left alone
  let hover = false;
  let keyed = false; // keyboard focus inside the stage
  let said = "";
  let shown = "";
  const drawn = { lj: NaN, lq: NaN, rj: NaN, rq: NaN, fz: NaN, sel: "" };

  const setD = (el, d) => {
    if (el && el.getAttribute("d") !== d) el.setAttribute("d", d);
  };
  function drawLeaf(k, up, lit) {
    const L = leaves[k];
    const d = leafPaths(k, up);
    for (const name of SLOT) setD(L[name], d[name]);
    L.ring.setAttribute("class", d.face);
    if (d.shade) L.ring.setAttribute("data-shade", d.shade);
    else L.ring.removeAttribute("data-shade");
    L.solid.toggleAttribute("data-lit", lit);
    L.marks.setAttribute("data-tone", lit ? "lit" : "hi");
  }

  function draw() {
    const sel = scene.sel;
    if (pose.lj !== drawn.lj || sel !== drawn.sel) drawLeaf("J", pose.lj, sel === "J");
    if (pose.lq !== drawn.lq || sel !== drawn.sel) drawLeaf("Q", pose.lq, sel === "Q");
    // the leaf that is not standing up lies over the other one's hinge side
    const [back, front] = pose.lj < pose.lq ? ["Q", "J"] : pose.lq < pose.lj ? ["J", "Q"] : [null, null];
    if (back && leaves[front].g.compareDocumentPosition(leaves[back].g) & Node.DOCUMENT_POSITION_FOLLOWING) leaves[back].g.after(leaves[front].g);
    if (pose.rj !== drawn.rj) refs.J.setAttribute("transform", translateAlong(P, [PARK * pose.rj, 0, 0]));
    if (pose.rq !== drawn.rq) refs.Q.setAttribute("transform", translateAlong(P, [PARK * pose.rq, 0, 0]));
    if (pose.fz !== drawn.fz) {
      const t = translateAlong(P, [0, 0, pose.fz]);
      for (const g of heads) g.setAttribute("transform", t);
      const top = mastTop(pose.fz);
      const low = mastLow(pose.fz);
      const knob = knobLines(pose.fz);
      for (const [name, paths] of [["mast", top.mast], ["rack", top.rack], ["mastLow", low.mast], ["rackLow", low.rack]]) slotsOf(paths).forEach((d, i) => setD(posts[name][i], d));
      for (const [name, d] of [["teeth", top.teeth], ["teethLow", low.teeth], ["ribs", knob.ribs], ["pointer", knob.pointer]]) setD(slots[name], d);
    }
    Object.assign(drawn, pose, { sel });
    const on = lampsOf(pose, scene);
    for (const k of ["J", "Q"]) if ((lamps[k].getAttribute("data-on") || "") !== on[k]) on[k] ? lamps[k].setAttribute("data-on", on[k]) : lamps[k].removeAttribute("data-on");
    const text = readoutOf(pose, scene);
    const joined = text.join("\n");
    if (joined !== shown && lines[0]) {
      lines[0].textContent = text[0];
      lines[1].textContent = text[1];
      shown = joined;
    }
  }

  function announce() {
    const text = describe(poseOf(scene), scene);
    if (status && text !== said) {
      status.textContent = text;
      said = text;
    }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring && !calm) {
      clock += dt;
      if (clock >= LOOP) clock -= LOOP;
      const next = sceneAt(clock);
      if (next.sel !== scene.sel || next.down !== scene.down || next.ref !== scene.ref || next.focus !== scene.focus) scene = next;
    }
    const moving = step(pose, vel, targetsOf(scene, pose, vel), dt, calm);
    const goal = targetsOf(scene, pose, vel); // a leaf may wait for the other one, then needs one more step
    draw();
    const busy = touring || moving || goal.lj !== pose.lj || goal.lq !== pose.lq;
    frame = visible && busy ? requestAnimationFrame(tick) : 0;
    if (!busy) arm();
  }
  const run = () => {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // ------------------------------------------------------------ input
  // The countdown starts only once the parts have settled and the pointer and keyboard are elsewhere,
  // and the tour then carries on from the step that matches what the operator left.
  const disarm = () => {
    clearTimeout(idle);
    idle = 0;
  };
  const pause = () => {
    touring = false;
    paused = true;
    disarm();
  };
  function arm() {
    if (!paused || idle || hover || keyed || still.matches) return;
    idle = setTimeout(() => resume(), IDLE);
  }
  function resume(now = false) {
    idle = 0;
    if (!now && (hover || keyed)) return;
    paused = false;
    touring = !still.matches;
    clock = clockFor(scene);
    run();
  }
  const act = (change) => {
    pause();
    scene = { ...scene, ...change };
    announce();
    run();
  };
  const fold = (k) => act(scene.down === k ? { down: null, sel: k } : { down: k, sel: k });
  const slide = (k) => act({ ref: scene.ref === k ? null : k, sel: scene.down && scene.down !== k ? scene.sel : k });
  const focusBy = (dz) => act({ focus: Math.max(FOCUS[0], Math.min(FOCUS[1], Math.round((scene.focus + dz) * 10) / 10)) });

  const onClick = (event) => {
    const part = event.target.closest("[data-part]")?.getAttribute("data-part") || "";
    if (part === "leafJ") fold("J");
    else if (part === "leafQ") fold("Q");
    else if (part === "refJ") slide("J");
    else if (part === "refQ") slide("Q");
    else if (part === "carriage" || part === "head") focusBy(scene.focus >= FOCUS[1] - 0.5 ? -scene.focus : 2);
    // a click on the bench or the empty card changes nothing: focusing the figure or a stray tap is not an action
  };
  const onKey = (event) => {
    const key = event.key;
    keyed = true;
    if (key === "j" || key === "J" || key === "1") fold("J");
    else if (key === "q" || key === "Q" || key === "2") fold("Q");
    else if (key === "p" || key === "P" || key === "0") act({ down: null });
    else if (key === " " || key === "Enter") scene.down ? fold(scene.down) : fold(scene.sel);
    else if (key === "r" || key === "R") slide(scene.down || scene.sel);
    else if (key === "ArrowUp" || key === "ArrowRight") focusBy(event.shiftKey ? 3 : 1);
    else if (key === "ArrowDown" || key === "ArrowLeft") focusBy(event.shiftKey ? -3 : -1);
    else if (key === "Home") act({ ...REST });
    else if (key === "Escape") {
      disarm();
      resume(true);
      return;
    } else return;
    event.preventDefault();
  };
  // hovering or keyboard focus holds the tour where it is; leaving starts the countdown once everything has settled
  const hold = () => (touring ? pause() : disarm());
  const free = () => frame || arm();
  const handlers = {
    click: onClick,
    keydown: onKey,
    pointerenter: () => ((hover = true), hold()),
    pointerleave: () => ((hover = false), free()),
    // a mouse click focuses the stage too; only keyboard focus holds the tour
    focus: () => stage.matches(":focus-visible") && ((keyed = true), hold()),
    blur: () => ((keyed = false), free()),
  };
  for (const [type, fn] of Object.entries(handlers)) stage.addEventListener(type, fn);
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: "120px 0px" });
  io.observe(stage);
  const onMotion = () => {
    touring = !still.matches && !paused;
    run();
  };
  still.addEventListener?.("change", onMotion);

  return () => {
    io.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    still.removeEventListener?.("change", onMotion);
    for (const [type, fn] of Object.entries(handlers)) stage.removeEventListener(type, fn);
  };
}
