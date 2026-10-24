// Fig 22 live: the glove box runs its gated loop. Every pose comes from model.mjs (a pure function of segment and time);
// this file only writes attributes on the parts the static art already drew.
import { translateAlong } from "../kit/iso-kit.mjs";
import * as W from "./world.mjs";
import { TOUR, CHAMP_RECORD, poseAt, runSegment, recordSegment, latchSegment, tourIndexFor } from "./model.mjs";

const { SLOTS, DOOR_PARTS } = W;

export function mount(root) {
  const stage = root.querySelector(".cis-stage");
  if (!stage) return () => {};
  const q = (sel) => root.querySelector(sel);
  const part = (name) => q(`[data-part="${name}"]`);
  const solid = (name) => {
    const g = part(name);
    return g && Object.fromEntries(SLOTS.map((slot, i) => [slot, g.children[i]]));
  };
  const cartExt = part("cartExt");
  const tray = part("tray");
  const cartInt = part("cartInt");
  const champ = part("champ");
  const rod = solid("rodSolid");
  const innerSpokes = [0, 1, 2].map((i) => solid(`iw.spoke${i}`));
  const leaf = solid("leafSolid");
  const hatchLeaf = part("leafSolid");
  const hasp = part("hasp");
  const safeLamp = part("safeLamp");
  const gateLamp = part("gateLamp");
  const needle = part("needle");
  const bubbles = part("bubbles");
  const cardSolid = solid("cardSolid");
  const cardRules = part("cardRules");
  const cardStamp = part("cardStamp");
  const oilA = solid("oil.a");
  const oilB = solid("oil.b");
  const door = part("door");
  const doorSolids = DOOR_PARTS.map((name) => solid(`door.${name}`));
  const leafG = part("door.leaf");
  const plateG = part("door.plate");
  const gasket = part("door.gasket");
  const levers = W.VALVES.map((valve) => ({ x: valve.x, evac: valve.name === "evac", bar: solid(`lever.${valve.name}.bar`), grip: solid(`lever.${valve.name}.grip`) }));
  const readout = [q(".cis-l1"), q(".cis-l2"), q(".cis-l3")];
  const status = q("[data-status]");
  // the wells, board by board in the order they were drawn
  const wells = [...root.querySelectorAll(".cis-wells")].flatMap((board) => {
    const b = Number(board.getAttribute("data-board"));
    return [...board.children].map((el, i) => ({ el, b, i, s: el.getAttribute("data-s") }));
  });
  const bubbleEls = [];
  for (let i = 0; bubbles && i < 4; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "0.6");
    c.setAttribute("opacity", "0");
    bubbles.appendChild(c);
    bubbleEls.push(c);
  }

  // ------------------------------------------------------------ attribute writers that skip unchanged values
  const last = new Map();
  const set = (el, attr, value) => {
    if (!el) return;
    let memo = last.get(el);
    if (!memo) last.set(el, (memo = {}));
    if (memo[attr] === value) return;
    memo[attr] = value;
    if (value == null) el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  };
  const setSolid = (slots, paths) => {
    if (!slots) return;
    const d = W.slotPaths(paths);
    for (const slot of SLOTS) set(slots[slot], "d", d[slot]);
  };
  const move = (el, offset) => set(el, "transform", translateAlong(W.P, offset));
  const fade = (el, v) => set(el, "style", `opacity:${v.toFixed(3)}`);
  // each rebuilt part redraws only when its inputs change
  const keys = {};
  const changed = (name, ...values) => {
    const key = values.map((v) => Math.round(v * 1000)).join(":");
    if (keys[name] === key) return false;
    keys[name] = key;
    return true;
  };

  let doorFront = true;
  let zOut = W.oilPaths(0).zOut;
  let spoken = "";
  function draw(pose, time) {
    if (changed("levers", pose.evac, pose.purge))
      for (const lever of levers) {
        const p = W.leverPaths(lever.x, ((lever.evac ? pose.evac : pose.purge) * Math.PI) / 2);
        setSolid(lever.bar, p.bar);
        setSolid(lever.grip, p.grip);
      }
    if (changed("oil", pose.oil)) {
      const o = W.oilPaths(pose.oil);
      setSolid(oilA, o.a);
      setSolid(oilB, o.b);
      zOut = o.zOut;
    }
    const dots = W.bubbleDots(time * 0.9, pose.oil, zOut);
    bubbleEls.forEach((c, i) => {
      const dot = dots[i];
      if (!dot) return set(c, "opacity", "0");
      set(c, "cx", dot[0].toFixed(1));
      set(c, "cy", dot[1].toFixed(1));
      set(c, "opacity", dot[2].toFixed(2));
    });
    if (changed("card", pose.card)) {
      setSolid(cardSolid, W.cardPaths(pose.card));
      const marks = W.cardMarks(pose.card);
      set(cardRules, "d", marks.rules);
      set(cardStamp, "d", marks.stripe);
    }
    if (changed("door", pose.door, pose.wheel)) {
      const d = W.doorParts(pose.door, pose.wheel);
      DOOR_PARTS.forEach((name, i) => setSolid(doorSolids[i], d[name]));
      set(gasket, "d", d.front ? "" : d.gasket);
      // seen from behind, the handwheel sits behind the plate: move the leaf, the plate and its gasket to the top of the door group
      if (d.front !== doorFront && door) {
        doorFront = d.front;
        if (doorFront) {
          door.prepend(leafG, plateG);
          plateG.after(gasket);
        } else door.append(leafG, plateG, gasket);
      }
    }
    if (changed("lock", pose.lock)) {
      setSolid(rod, W.rodPaths(pose.lock));
      W.innerSpokes(pose.lock).forEach((p, i) => setSolid(innerSpokes[i], p));
    }
    if (changed("hatch", pose.hatch)) {
      setSolid(leaf, W.leafPaths(pose.hatch));
      // swung down into the chute, the leaf is in the well's shadow
      set(hatchLeaf, "data-open", pose.hatch > 0.02 ? "" : null);
    }
    move(cartExt, [pose.cart, pose.across, 0]);
    move(tray, [0, pose.slide - W.TABLE_DY, 0]);
    move(cartInt, [pose.cart, 0, 0]);
    move(champ, [W.SEAT.champion, 0, -pose.sink * W.SINK]);
    move(hasp, [0, 0, pose.hasp * 0.7]);
    fade(cartExt, pose.vis);
    fade(cartInt, pose.vis);
    fade(champ, pose.champ);
    set(safeLamp, "data-on", pose.safe || null);
    set(gateLamp, "data-on", pose.lamp || null);
    set(cardStamp, "data-on", pose.stamp);
    set(needle, "d", W.needlePath(pose.gauge));
    for (const w of wells) {
      const s = pose.wells[w.b][w.i];
      if (s !== w.s) w.el.setAttribute("data-s", (w.s = s));
    }
    readout.forEach((el, i) => {
      const line = pose.lines[i] || "";
      if (el && el.textContent !== line) el.textContent = line;
    });
    // the live region speaks the readout's first line only for what the reader asked for, never during the tour
    if (status && (mode === "queue" || mode === "hold") && pose.lines[0] !== spoken) status.textContent = spoken = pose.lines[0];
  }

  // ------------------------------------------------------------ the clock: the tour, or the reader's queue
  // modes: "wait" (before the tour starts), "tour", "lead" (a record change leading back into the tour),
  // "queue" (the reader's requests), "hold" (a request finished; the tour resumes after a quiet spell)
  const still = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let mode = "wait";
  let tourIndex = 0;
  let queue = [];
  let seg = TOUR[0];
  let t = 0;
  let record = seg.record;
  let stamp = seg.stamp;
  let nextRun = 0;
  let resume = false;
  let now = 0;
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let timer = 0;
  const moving = () => mode !== "hold" && mode !== "wait";

  // how long a segment needs before it can hand over to a request without a jump
  const settleOf = (s) => (s.kind === "run" ? s.dur : s.kind === "record" ? 1.7 : s.kind === "latch" ? 2.7 : 0);
  const cutShort = () => {
    const cut = Math.max(t, settleOf(seg));
    if (cut < seg.dur) seg = { ...seg, dur: cut };
  };
  const endOf = (s) => {
    record = s.record || record;
    stamp = poseAt(s, s.dur).stamp;
  };
  // the record and card on display once everything moving and queued has played
  const tail = () => {
    const was = [record, stamp];
    if (moving()) endOf(seg);
    queue.forEach(endOf);
    const out = { record, stamp };
    [record, stamp] = was;
    return out;
  };
  function startTour(index) {
    mode = "tour";
    tourIndex = index;
    seg = TOUR[index];
    t = 0;
  }
  function resumeTour() {
    clearTimeout(timer);
    queue = [];
    resume = false;
    const at = tourIndexFor(record, stamp);
    if (at != null) startTour(at);
    else {
      mode = "lead";
      seg = recordSegment(record, CHAMP_RECORD, stamp);
      t = 0;
      tourIndex = tourIndexFor(CHAMP_RECORD, stamp);
    }
    kick();
  }
  function hold() {
    mode = "hold";
    clearTimeout(timer);
    timer = setTimeout(() => visible && !still.matches && resumeTour(), 3600);
  }
  function startNext() {
    const s = queue.shift();
    if (!s) return resume ? resumeTour() : hold();
    mode = "queue";
    seg = s;
    t = 0;
  }
  function enqueue(build) {
    clearTimeout(timer);
    if (still.matches) {
      // no motion: show where each request ends
      for (const s of build(tail())) {
        endOf(s);
        draw(poseAt(s, s.dur), 0);
      }
      return;
    }
    const was = moving();
    if (was) {
      // what is moving finishes first; a tour segment that is only holding hands over at once
      cutShort();
      if (mode !== "queue") queue = [];
      mode = "queue";
    }
    resume = false;
    queue.push(...build(tail()));
    if (!was) startNext();
    kick();
  }
  function requestRun(run) {
    nextRun = (run + 1) % 3;
    enqueue((at) => {
      const into = run === 0 ? "iter-000148" : CHAMP_RECORD;
      return [...(at.record !== into ? [recordSegment(at.record, into, at.stamp)] : []), runSegment(run, at.stamp)];
    });
  }
  const toggleBaseline = () => enqueue((at) => [recordSegment(at.record, at.record === "iter-000021" ? CHAMP_RECORD : "iter-000021", at.stamp)]);
  const tryLatch = () => enqueue((at) => [latchSegment(at.record, at.stamp)]);
  function escape() {
    if (mode === "queue") {
      queue = [];
      resume = true;
      cutShort();
    } else if (mode === "hold") resumeTour();
  }

  function tick(time) {
    frame = 0;
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    now += dt;
    if (still.matches || !moving()) return;
    t += dt;
    if (t >= seg.dur) {
      const done = seg;
      endOf(done);
      if (mode === "queue") {
        startNext();
        if (mode === "hold") draw(poseAt(done, done.dur), now);
      } else startTour(mode === "lead" ? tourIndex : (tourIndex + 1) % TOUR.length);
    }
    if (moving()) {
      draw(poseAt(seg, Math.min(t, seg.dur)), now);
      kick();
    }
  }
  function kick() {
    if (!frame && visible && !still.matches && moving()) frame = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------ input
  const onKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === "1" || key === "2" || key === "3") requestRun(Number(key) - 1);
    else if (key === " " || key === "enter") requestRun(nextRun);
    else if (key === "b") toggleBaseline();
    else if (key === "h") tryLatch();
    else if (key === "escape") escape();
    else return;
    event.preventDefault();
  };
  const onClick = (event) => {
    const hit = event.target.closest && event.target.closest("[data-hit]");
    const what = hit && hit.getAttribute("data-hit");
    if (what === "latch") tryLatch();
    else if (what === "record") toggleBaseline();
    else requestRun(nextRun);
  };
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("click", onClick);

  let started = false;
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) {
        lastTime = 0;
        if (!started && !still.matches) {
          // the tour starts a moment after the figure first comes into view
          started = true;
          clearTimeout(timer);
          timer = setTimeout(() => mode === "wait" && resumeTour(), 1400);
        }
        if (mode === "hold" && !still.matches) hold();
        kick();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  const onMotion = () => {
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (still.matches) {
      // still: the rest pose, and requests jump to where they end
      mode = "hold";
      queue = [];
      seg = TOUR[0];
      record = seg.record;
      stamp = seg.stamp;
      draw(poseAt(seg, 0), 0);
    } else resumeTour();
  };
  if (still.addEventListener) still.addEventListener("change", onMotion);
  if (still.matches) onMotion();

  return () => {
    if (frame) cancelAnimationFrame(frame);
    clearTimeout(timer);
    io.disconnect();
    stage.removeEventListener("keydown", onKey);
    stage.removeEventListener("click", onClick);
    if (still.removeEventListener) still.removeEventListener("change", onMotion);
    for (const c of bubbleEls) c.remove();
  };
}
