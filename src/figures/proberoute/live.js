// Fig 10 live: the operator's hands. Keys throw, the probe pass lights the lamps across depth, cords leave their seats
// for the jacks and come back, the comb bars come down from the cap for the dense mix, counterweights rise and fall, and
// the readout follows the board. A press takes over at once: the move under way finishes six times faster, the tour's
// later scenes are dropped, and the probe key and the listening keys work even while cords move.
import * as k from "../kit/iso-kit.mjs";
import D from "./data.mjs";
import * as W from "./world.mjs";
import { P, ease, r1 } from "./world.mjs";
import { cordOrder } from "./order.mjs";
import { PROBE, EMPTY, RANDOM, lampLevel, alphaLevel, headLit, readoutOf, plan, stepPose, FLIGHT, GAP } from "./model.mjs";

const shift = (d) => {
  const [x, y] = k.axisVector(P, d);
  return `translate(${r1(x)} ${r1(y)})`;
};

export function mount(root) {
  const q = (sel) => root.querySelector(sel);
  const all = (sel) => [...root.querySelectorAll(sel)];
  const stage = q(".pr-stage");
  const [ctx, val] = all("[data-readout] span");
  const status = q("[data-status]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const cordLayer = q(".pr-cords");
  const combLayer = q(".pr-combs");
  // the parts of one seat, indexed by seat whatever order they are painted in
  const bySeat = (name) => {
    const out = [];
    for (const el of all(`[data-${name}]`)) out[el.getAttribute(`data-${name}`)] = el;
    return out;
  };
  const groups = bySeat("cord");
  const tubes = groups.map((g) => g.querySelector("[data-tube]"));
  const strokes = tubes.map((g) => [...g.querySelectorAll("path")]);
  const plugs = groups.map((g) => g.querySelector("[data-plug]"));
  const blocks = bySeat("block");
  const falls = bySeat("strands");
  const lamps = all("[data-lamp]");
  const heads = all("[data-head-lamp]");
  const shelfLamps = bySeat("alpha");
  const combEls = bySeat("comb");
  const counter = q("[data-counter]");
  const keyEls = bySeat("key"); // by key name

  // The board as the static picture shows it: probed, patched with the final router's support, trained for 50M tokens.
  const S = {
    layers: [...PROBE],
    poses: PROBE.map((l, i) => W.jackPose(W.SEATS[i].head, l)),
    comb: [0, 0, 0, 0],
    sweep: 16, trained: 1, tokens: D.tokens.final, budget: D.tokens.final, mix: "sparse", init: "probe", phase: "final", head: 0, patch: null,
    keys: { probe: 1, init: -1, mix: -1 },
  };
  let order = cordOrder(S.poses);
  let pegs = W.pegsOf(S.poses);
  let stack = W.combOrder(S.comb);
  const moving = new Set();
  const dirty = new Set();
  const combsDirty = new Set();
  let keysDirty = false;
  const live = new Map(); // seat -> the plug's live solid paths, once it has left its resting shape
  let draws = 0; // which random draw the next random-init patch uses
  const nextRandom = () => RANDOM[draws++ % RANDOM.length];

  // ------------------------------------------------------------ drawing
  function plugEl(seat) {
    if (!live.has(seat)) {
      plugs[seat].innerHTML = `<g class="iso-solid"><path class="iso-fill"/>${[0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}"/>`).join("")}<path class="iso-top"/><path class="iso-line iso-crease" data-tone="faint"/><path class="iso-line iso-edge" data-tone="hi"/></g>`;
      live.set(seat, plugs[seat].firstChild);
    }
    return live.get(seat);
  }
  // a cord's line and its weight; every cord is redrawn when a plug leaves or reaches its seat, since cords ride over
  // the plugs standing in their seats
  function drawRoute(seat) {
    const route = W.cordRoute(seat, S.poses[seat], pegs);
    const d = W.cordD(route);
    for (const p of strokes[seat]) p.setAttribute("d", d);
    const lift = W.liftOf(route);
    blocks[seat].setAttribute("transform", shift([W.SEATS[seat].x, W.SEATS[seat].y, lift]));
    falls[seat].setAttribute("d", W.fallsD(seat, lift));
  }
  function drawCord(seat) {
    const pose = S.poses[seat];
    drawRoute(seat);
    const paths = W.plugPaths(pose);
    const g = plugEl(seat);
    g.style.display = paths ? "" : "none";
    if (paths) {
      const ds = [paths.fill, ...paths.shades, paths.top, paths.crease, paths.outline];
      [...g.children].forEach((p, i) => p.setAttribute("d", ds[i] || ""));
    }
    // the cord on its way is the one lit part
    g.toggleAttribute("data-lit", moving.has(seat));
    tubes[seat].toggleAttribute("data-lit", moving.has(seat));
    // a plug pointing its tail at the viewer lies under its cord, a plug standing in a seat over it
    const first = W.plugFirst(pose);
    const now = Boolean(plugs[seat].compareDocumentPosition(tubes[seat]) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (first !== now) groups[seat].insertBefore(first ? plugs[seat] : tubes[seat], first ? tubes[seat] : plugs[seat]);
  }
  const glow = (el, v) => {
    const s = v.toFixed(2);
    if (el.glow !== s) el.style.setProperty("--g", (el.glow = s));
  };
  let said = readoutOf(S).join("");
  function draw() {
    if (dirty.size) {
      const now = W.pegsOf(S.poses);
      const moved = now.join() !== pegs.join();
      pegs = now;
      for (const i of dirty) drawCord(i);
      if (moved) W.SEATS.forEach((_, i) => dirty.has(i) || drawRoute(i));
      dirty.clear();
      const next = cordOrder(S.poses);
      if (next.join() !== order.join()) for (const i of (order = next)) cordLayer.appendChild(groups[i]);
    }
    if (combsDirty.size) {
      for (const h of combsDirty) {
        const [y, z] = W.combAt(h, S.comb[h]);
        combEls[h].setAttribute("transform", shift([0, y, z]));
        combEls[h].setAttribute("href", S.comb[h] >= W.combTime(h) ? "#pr-comb-lit" : "#pr-comb");
      }
      combsDirty.clear();
      const next = W.combOrder(S.comb);
      if (next.join() !== stack.join()) for (const h of (stack = next)) combLayer.appendChild(combEls[h]);
    }
    // lamps are written only when their level changes
    lamps.forEach((el, n) => glow(el, lampLevel(S, n >> 4, n & 15)));
    shelfLamps.forEach((el, i) => glow(el, alphaLevel(S, i, moving.has(i))));
    heads.forEach((el, h) => glow(el, headLit(S, h, moving) ? 1 : 0));
    const digits = String(Math.round(S.tokens)).padStart(4, "0");
    if (counter.textContent !== digits) counter.textContent = digits;
    if (keysDirty) {
      keysDirty = false;
      for (const [id, el] of Object.entries(keyEls)) {
        const want = String(S.keys[id] ?? 0);
        for (const pos of el.querySelectorAll("[data-pos]")) pos.style.display = pos.dataset.pos === want ? "" : "none";
      }
    }
    const [a, b] = readoutOf(S);
    if (ctx.textContent !== a) ctx.textContent = a;
    if (val.textContent !== b) val.textContent = b;
    // the status line speaks for the visitor's own changes, once the board has come to rest
    if (!touring && !busy() && a + b !== said) status.textContent = (said = a + b) && `${a}. ${b}`;
  }

  // ------------------------------------------------------------ jobs: two lanes of timed steps
  // The main lane moves the board (cords, combs, training); the side lane runs the probe pass and the listening keys.
  const lane = () => ({ jobs: [], job: null, c: 0 });
  const main = lane();
  const side = lane();
  const busy = () => Boolean(main.job || main.jobs.length || side.job || side.jobs.length);
  const set = (fn) => ({ t: 0, start: fn });
  const wait = (t) => ({ t, pause: true });
  const later = (fn) => ({ t: 0, expand: fn });
  const keyTo = (id, pos) => set(() => ((S.keys[id] = pos), (keysDirty = true)));
  const phase = (name, head) => set(() => ((S.phase = name), head != null && (S.head = head)));
  // what the board shows when nothing is moving
  const rest = () =>
    S.mix === "dense" ? "dense" : S.layers.every((l) => l != null) && S.trained >= 1 ? (S.init === "random" ? "random" : "final") : S.sweep >= 16 ? "probed" : "idle";
  const settle = () => set(() => !main.jobs.length && !(main.job?.t > 0) && (S.phase = rest()));
  const train = (budget, done) => [
    set(() => ((S.budget = budget), (S.phase = "training"))),
    { t: 2.2, step: (u) => ((S.trained = ease(u)), (S.tokens = budget * ease(u))) },
    phase(done),
  ];
  // One head's cords in or out, in the order the plan gives.
  function flights(step) {
    const j = { t: FLIGHT + (step.seats.length - 1) * GAP };
    j.step = (u, c) => {
      step.seats.forEach((seat, n) => {
        S.poses[seat] = stepPose(step, n, c);
        const v = (c - n * GAP) / FLIGHT;
        if (v > 0 && v < 1) moving.add(seat);
        else moving.delete(seat);
        dirty.add(seat);
      });
      if (u >= 1) step.seats.forEach((seat) => (S.layers[seat] = step.kind === "in" ? step.layers[seat] : null));
    };
    return j;
  }
  // Move the cords to a new set of layers, head by head as the plan orders it.
  const cordsTo = (to) =>
    later(() =>
      plan([...S.layers], to).flatMap((step) => [
        set(() => {
          Object.assign(S, { phase: step.kind === "in" ? "patching" : "unpatching", head: step.head, patch: step.layers, trained: 0, tokens: 0 });
          S.keys[`ring-${step.head}`] = 1;
          keysDirty = true;
        }),
        flights(step),
        keyTo(`ring-${step.head}`, 0),
        wait(0), // the board is whole again: a press may stop here
      ]),
    );
  // The combs down into their rows (bottom row first) or back onto the tray (top row first), W.COMB_STAGGER apart.
  const combsTo = (on) =>
    later(() => {
      const hs = (on ? [3, 2, 1, 0] : [0, 1, 2, 3]).filter((h) => (on ? S.comb[h] < W.combTime(h) : S.comb[h] > 0));
      if (!hs.length) return [];
      const j = { t: Math.max(...hs.map((h, n) => n * W.COMB_STAGGER + W.combTime(h))), start: () => (S.phase = on ? "bussing" : "unbussing") };
      j.step = (u, c) =>
        hs.forEach((h, n) => {
          const t = Math.max(0, Math.min(W.combTime(h), c - n * W.COMB_STAGGER));
          S.comb[h] = on ? t : W.combTime(h) - t;
          if (t > 0 && t < W.combTime(h)) S.head = h;
          combsDirty.add(h);
        });
      return [j];
    });
  const sweepTo = (on) => [
    keyTo("probe", on ? 1 : 0),
    phase(on ? "probing" : "idle"),
    { t: on ? 2.6 : 0.6, start() { this.from = S.sweep; }, step(u) { S.sweep = this.from + ((on ? 16 : 0) - this.from) * u; } },
    phase(on ? "probed" : "idle"),
  ];
  const listen = (h, t) => [keyTo(`listen-${h}`, 1), phase("listen", h), wait(t), keyTo(`listen-${h}`, 0)];
  const priorFor = () => (S.init === "random" ? nextRandom() : PROBE);
  const trainFor = () => (S.init === "random" ? train(D.tokens.screen, "random") : train(D.tokens.final, "final"));
  // dense: every cord out, the combs down, the dense finalist (probe-init) trained for 50M tokens; the board counts as
  // dense once its combs set off, and from there it runs through to the trained result
  const toDense = () => [keyTo("mix", 1), keyTo("init", -1), set(() => (S.init = "probe")), cordsTo(EMPTY), set(() => Object.assign(S, { mix: "dense", trained: 0, tokens: 0 })), combsTo(true), ...train(D.tokens.final, "dense")];
  const toSparse = (init) => [
    keyTo("mix", -1),
    keyTo("init", init === "random" ? 1 : -1),
    set(() => ((S.mix = "sparse"), (S.init = init), (S.trained = 0), (S.tokens = 0))),
    combsTo(false),
    wait(0),
    later(() => [cordsTo(priorFor()), ...trainFor()]),
  ];

  // ------------------------------------------------------------ the keys
  const ACTIONS = {
    probe: () => [...sweepTo(S.sweep < 8), wait(2.4), settle()],
    listen: (h) => [...listen(h, 2.4), settle()],
    // The dense finalist is the probe-init run, so in dense mode the init key springs back.
    init: () =>
      S.mix === "dense"
        ? [keyTo("init", 0), wait(0.3), keyTo("init", -1)]
        : [keyTo("init", S.init === "probe" ? 1 : -1), set(() => (S.init = S.init === "probe" ? "random" : "probe")), later(() => [cordsTo(priorFor()), ...trainFor()])],
    mix: () => (S.mix === "sparse" ? toDense() : toSparse(S.init)),
    // a ring key patches its head from the current prior, or pulls it
    ring: (h) => {
      if (S.mix === "dense") return toSparse(S.init);
      const patched = W.seatsOf(h).some((i) => S.layers[i] != null);
      const prior = priorFor();
      const target = [...S.layers];
      for (const i of W.seatsOf(h)) target[i] = patched ? null : prior[i];
      return [cordsTo(target), later(() => (S.layers.every((l) => l != null) ? trainFor() : [settle()]))];
    },
  };
  // A visitor's press: the move under way finishes six times faster, the step it is on and the rest of it up to the
  // next pause, where the board is whole (no head half out, no comb half home, dense only once trained); whatever is
  // queued after that pause goes. A pause under way just ends.
  function cut(l) {
    const j = l.job;
    const end = l.jobs.findIndex((x) => x.pause);
    l.jobs = j?.pause ? [] : l.jobs.slice(0, end < 0 ? undefined : end);
    for (const x of [j, ...l.jobs]) if (x) x.speed = 6;
    if (j?.pause) l.job = null;
    // every key back where the board says it is (ring and listening keys home)
    S.keys = { init: S.init === "random" ? 1 : -1, mix: S.mix === "dense" ? 1 : -1, probe: S.sweep >= 8 ? 1 : 0 };
    keysDirty = true;
  }
  function act(id) {
    const [kind, h] = id.split("-");
    if (touring) (touring = false), cut(main);
    const l = kind === "probe" || kind === "listen" ? side : main;
    cut(l);
    l.jobs.push(later(() => ACTIONS[kind](h == null ? undefined : Number(h))));
    clearTimeout(idle);
    idle = setTimeout(resume, 12000);
    kick();
  }

  // ------------------------------------------------------------ the idle tour: the board's whole story, looped
  // ProbeRoute as the picture shows it, the dense baseline, the random-init ablation, then the board cleared and built
  // again in the paper's order: probe pass, the router's four cords per head, 50M tokens of training, listening on each head.
  function tour() {
    main.jobs.push(
      wait(3),
      ...toDense(),
      wait(3.4),
      ...toSparse("random"),
      wait(3.4),
      keyTo("init", -1),
      set(() => (S.init = "probe")),
      cordsTo(EMPTY),
      ...sweepTo(false),
      wait(1.6),
      ...sweepTo(true),
      wait(1.8),
      cordsTo(PROBE),
      ...train(D.tokens.final, "final"),
      wait(2.6),
      ...[0, 1, 2, 3].flatMap((h) => listen(h, 1.5)),
      phase("final"),
    );
  }
  let touring = !still.matches;
  let idle = 0;
  let quiet = 0; // when the board last stopped moving
  // the tour comes back once the visitor's last change has stood on the board for a while
  function resume() {
    if (still.matches) return;
    if (busy() || performance.now() - quiet < 8000) return void (idle = setTimeout(resume, 1000));
    touring = true;
    kick();
  }

  // ------------------------------------------------------------ the loop
  function run(l, budget) {
    while (budget > 0) {
      if (!l.job) {
        const j = l.jobs.shift();
        if (!j) {
          if (l !== main || !touring || still.matches) break;
          tour();
          continue;
        }
        if (j.expand) {
          l.jobs.unshift(...[j.expand()].flat().map((x) => ((x.speed = j.speed), x)));
          continue;
        }
        l.job = j;
        l.c = 0;
        j.start?.();
      }
      const j = l.job;
      const speed = j.speed || 1;
      const use = Math.min((j.t - l.c) / speed, budget);
      l.c += use * speed;
      budget -= use;
      j.step?.(j.t ? Math.min(1, l.c / j.t) : 1, l.c);
      if (l.c >= j.t - 1e-9) l.job = null;
      else break;
    }
  }
  let frame = 0;
  let last = 0;
  let visible = false;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    for (const l of [main, side]) run(l, still.matches ? Infinity : dt);
    draw();
    if (busy()) quiet = now;
    frame = visible && (busy() || (touring && !still.matches)) ? requestAnimationFrame(tick) : 0;
  }
  function kick() {
    if (!frame && visible) (last = 0), (frame = requestAnimationFrame(tick));
  }

  // ------------------------------------------------------------ input
  const KEYMAP = { p: "probe", r: "init", d: "mix" };
  let listenNext = 0;
  const onKey = (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "Escape") {
      clearTimeout(idle);
      touring = !still.matches;
      return kick();
    }
    const id = key === "l" ? `listen-${listenNext++ % 4}` : "1234".includes(key) ? `ring-${key - 1}` : KEYMAP[key];
    if (!id) return;
    event.preventDefault();
    act(id);
  };
  // a click, not a pointerdown: a scroll swipe that starts on a part never fires it
  const hitOf = (event) => {
    const hit = event.target.closest?.("[data-act]");
    return hit && root.contains(hit) ? hit.dataset.act : null;
  };
  const onClick = (event) => {
    const id = hitOf(event);
    if (id) act(id);
  };
  // pointing at a part lifts the lever it works
  let hovered = null;
  const onHover = (event) => {
    const id = event.type === "pointerleave" ? null : hitOf(event);
    if (id === hovered) return;
    keyEls[hovered]?.removeAttribute("data-hover");
    keyEls[(hovered = id)]?.setAttribute("data-hover", "");
  };
  const off = new AbortController();
  const opt = { signal: off.signal };
  for (const [type, fn] of [["click", onClick], ["keydown", onKey], ["pointerover", onHover], ["pointerleave", onHover]]) stage.addEventListener(type, fn, opt);
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) kick();
  }, { rootMargin: "120px 0px" });
  io.observe(root);
  // Reduced motion: no tour; the board rests as the static picture shows it, and keys settle at once.
  const onMotion = () => {
    touring = !still.matches;
    kick();
  };
  still.addEventListener("change", onMotion, opt);
  draw();
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    io.disconnect();
    off.abort();
  };
}
