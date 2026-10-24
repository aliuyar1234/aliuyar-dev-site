// Fig 12 in motion. A weighing seats the pin (the cord reels the ring in, then the pin
// rises through it), takes the last gene's masses off one at a time, swings the pulleys
// to the new string angle and hangs the new masses. Pulling the pin frees the ring on its
// sprung cord: it settles along the loaded string while the counter runs the 200
// resamples, and the lamp says whether the label held at 0.70 consensus.
import { translateAlong, holdStill } from "../kit/iso-kit.mjs";
import * as S from "./scene.mjs";
import { RELEASE, CARDS } from "./scene.mjs";
import { dynamicItems } from "./dyn.mjs";
import { GENES, LOCKED, angleOf, ringOf, massesOf, heldOf, readoutOf, describeOf } from "./model.mjs";

const RESUME = 6000;
const COUNT_S = 2.4;
const PIECE_S = 0.2;
const PIN_S = 0.4;
const TRAVEL = S.PIN.travel;
let uid = 0;

const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
const snap = (x) => (Math.abs(x - Math.round(x)) < 1e-6 ? Math.round(x) : x);
const topPiece = (c) => {
  const frac = snap(c - Math.floor(c + 1e-6));
  return frac > 0.04 ? frac : Math.min(1, c);
};
// a damped spring (critical at zeta 1); returns whether it still moves
function follow(p, target, dt, w, near, zeta = 1) {
  for (let i = 0; i < 4; i++) (p.v += (w * w * (target - p.x) - 2 * zeta * w * p.v) * (dt / 4)), (p.x += p.v * (dt / 4));
  if (Math.abs(target - p.x) < near && Math.abs(p.v) < near * 20) return (p.x = target), (p.v = 0), false;
  return true;
}
const sp = (x) => ({ x, v: 0 });

export function mount(root) {
  const q = (sel) => root.querySelector(sel);
  const stage = q(".sig-stage");
  const svg = stage && stage.querySelector("svg");
  if (!svg) return () => {};
  // clip ids are per instance, so a second copy of the figure on the page clips itself
  const n = ++uid;
  for (const el of root.querySelectorAll("clipPath[id]")) {
    const id = el.id;
    el.id = `${id}-${n}`;
    for (const user of root.querySelectorAll(`[clip-path="url(#${id})"]`)) user.setAttribute("clip-path", `url(#${id}-${n})`);
  }
  const layers = {};
  for (const el of root.querySelectorAll("[data-layer]")) layers[el.dataset.layer] = el;
  const hole = q("[data-hole]");
  const lines = [q(".sig-l1"), q(".sig-l2")];
  const announce = q(".sig-live");
  const digits = q(".sig-digits");
  const lamp = q("[data-lamp]");
  const release = q('[data-part="release"]');
  const cards = GENES.map((_, i) => q(`[data-card="${i}"]`));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = {};
  for (const el of root.querySelectorAll("[data-item]")) nodes[el.dataset.item] = el;
  const drawn = new WeakMap();
  const setD = (el, d) => el && drawn.get(el) !== d && (drawn.set(el, d), el.setAttribute("d", d));

  const home = (g) => [S.FRONT + angleOf(g.z) / 2, S.FRONT - angleOf(g.z) / 2];
  const g0 = GENES[0];
  const s = {
    gi: 0,
    want: 0,
    change: false,
    phase: "done",
    at: 0,
    auto: true,
    user: false,
    pullAfter: false,
    phi: home(g0).map(sp),
    phiT: home(g0),
    stack: massesOf(g0),
    queue: [],
    tr: null,
    ring: ringOf(home(g0), massesOf(g0)).map(sp),
    pinOut: true,
    pinT: 1,
    n: LOCKED.bootstraps,
    held: heldOf(g0),
    hand: -1,
    cards: GENES.map((_, i) => sp(i ? 0 : 1)),
  };
  let clock = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let touring = !still.matches;
  let resume = 0;
  let order = {};
  let was = true;

  const gene = () => GENES[s.gi];
  const go = (phase) => ((s.phase = phase), (s.at = clock));
  const target = () => ringOf(s.phi.map((p) => p.x), s.stack);

  function request(i, user) {
    if (s.phase === "hand") enter();
    s.want = ((i % GENES.length) + GENES.length) % GENES.length;
    s.change = true;
    s.user = user;
    s.auto = true;
    s.held = false;
    s.pullAfter = false;
    s.hand = -1;
    go("seat");
    kick();
  }
  const next = (by, user) => request((s.change ? s.want : s.gi) + by, user);
  function togglePin(user) {
    s.user = user;
    s.held = false;
    if (s.phase === "hand") s.pinOut = !s.pinOut;
    else if (s.pinOut) (s.auto = false), go("seat");
    else if (s.phase === "ready" || s.phase === "seat") (s.change = false), (s.want = s.gi), go("pull");
    else s.pullAfter = true;
    kick();
  }
  // by hand: whatever was on its way is finished, so the gene on the table is complete
  function enter() {
    if (s.tr) s.tr.on && (s.stack[s.tr.side] = snap(s.stack[s.tr.side] + s.tr.piece)), (s.tr = null);
    if (s.change && s.phase !== "seat") (s.gi = s.want), (s.change = false), (s.stack = massesOf(gene())), (s.queue = []);
    s.phase = "hand";
    s.held = false;
  }

  // the pin, the cord and the ring: pulled, the pin drops flush and the ring settles on its
  // sprung cord; seated, the cord reels the ring in and the pin rises through it
  const off = () => Math.hypot(s.ring[0].x, s.ring[1].x);
  function mechanism(dt) {
    let moving = false;
    const to = s.pinOut ? target() : [0, 0];
    if (!s.pinOut || s.pinT === 1) s.ring.forEach((c, i) => (moving = follow(c, to[i], dt, s.pinOut ? 4.6 : 9, 2e-3, s.pinOut ? 0.6 : 1) || moving));
    if (s.pinOut ? s.pinT < 1 : off() < 0.3 && s.pinT > 0) (s.pinT = clamp(s.pinT + (s.pinOut ? dt : -dt) / PIN_S)), (moving = true);
    return moving;
  }

  function step(dt) {
    const age = clock - s.at;
    const seated = !s.pinOut && s.pinT === 0;
    if (s.phase === "seat") {
      s.pinOut = false;
      if (seated) (s.n = 0), go(s.change ? "unload" : "ready");
    } else if (s.phase === "unload" && !s.tr) {
      const side = s.stack[0] > 1e-6 ? 0 : s.stack[1] > 1e-6 ? 1 : -1;
      if (side < 0) (s.gi = s.want), (s.change = false), (s.phiT = home(gene())), go("swing");
      else {
        const piece = topPiece(s.stack[side]);
        s.stack[side] = snap(Math.max(0, s.stack[side] - piece));
        s.tr = { side, piece, t: 0, on: false };
      }
    } else if (s.phase === "swing") {
      if (age > 0.25 && Math.abs(s.phi[0].x - s.phiT[0]) + Math.abs(s.phi[1].x - s.phiT[1]) < 3) {
        const m = massesOf(gene());
        const side = m[0] > 0 ? 0 : 1;
        s.queue = S.piecesOf(m[side]).map((piece) => ({ side, piece }));
        go("load");
      }
    } else if (s.phase === "load" && !s.tr) {
      if (s.queue.length) s.tr = { ...s.queue.shift(), t: 0, on: true };
      else go("ready");
    } else if (s.phase === "ready" && ((s.auto && age > 0.5) || s.pullAfter)) (s.pullAfter = false), go("pull");
    else if (s.phase === "pull") {
      s.pinOut = true;
      s.n = 0;
      if (s.pinT === 1) go("count");
    } else if (s.phase === "count") {
      s.n = Math.min(LOCKED.bootstraps, Math.floor((LOCKED.bootstraps * age) / COUNT_S));
      if (s.n === LOCKED.bootstraps) (s.held = heldOf(gene())), go("done"), s.user && (announce.textContent = describeOf(gene()));
    } else if (s.phase === "done" && touring && age > 3.4) next(1, false);
    if (s.tr && (s.tr.t += dt / PIECE_S) >= 1) s.tr.on && (s.stack[s.tr.side] = snap(s.stack[s.tr.side] + s.tr.piece)), (s.tr = null);

    let moving = !(s.phase === "done" || s.phase === "hand" || (s.phase === "ready" && !s.auto && !s.pullAfter)) || !!s.tr;
    s.phi.forEach((p, i) => (moving = follow(p, s.phiT[i], dt, s.hand === i ? 16 : 4.5, 0.01) || moving));
    moving = mechanism(dt) || moving;
    s.cards.forEach((c, i) => (moving = follow(c, i === s.gi ? 1 : 0, dt, 8, 2e-3) || moving));
    return moving;
  }

  // a mass on its way: lifted off the stack, slid out through its slot, gone from view
  const transit = (side) => {
    const t = s.tr;
    if (!t || t.side !== side) return null;
    const u = t.on ? 1 - t.t : t.t;
    return { h: S.heightOf(t.piece), lift: 0.35 * smooth(0, 0.25, u), slide: S.SLIDE * smooth(0.15, 1, u), alpha: 1 - smooth(0.6, 1, u) };
  };

  function draw() {
    const tr = [transit(0), transit(1)];
    const drop = TRAVEL * smooth(0, 1, s.pinT);
    const ring = s.ring.map((c) => c.x);
    const items = dynamicItems({ phi: s.phi.map((p) => p.x), masses: s.stack, ring, drop, tr });
    for (const item of items) {
      const node = nodes[item.name];
      if (!node) continue;
      if (item.move) {
        const t = translateAlong(S.P, item.move);
        node.setAttribute("transform", t);
        hole.setAttribute("transform", t);
      }
      item.parts.forEach((part, i) => {
        const el = node.children[i];
        if (!el) return;
        if (!part.s) return setD(el, part.halo ?? part.d ?? "");
        if (part.s === S.RING_PATHS) return;
        const [fill, s0, s1, s2, s3, top, crease, ...rest] = el.children;
        const p = part.s;
        setD(fill, p.fill), setD(s0, p.shades[0]), setD(s1, p.shades[1]), setD(s2, p.shades[2]), setD(s3, p.shades[3]), setD(top, p.top), setD(crease, p.crease);
        if (rest.length > 1) setD(rest[0], part.inner || "");
        setD(rest[rest.length - 1], p.outline);
      });
      if (item.name.endsWith("-hanger")) {
        const a = tr[item.name[0] === "o" ? 0 : 1];
        const o = a ? a.alpha.toFixed(3) : "1";
        node.children[4].setAttribute("opacity", o);
        node.children[5].setAttribute("opacity", o);
      }
    }
    for (const layer of Object.keys(layers)) {
      const list = items.filter((item) => item.layer === layer).sort((a, b) => a.key - b.key);
      const key = list.map((item) => item.name).join();
      if (key !== order[layer]) {
        order[layer] = key;
        const frag = document.createDocumentFragment();
        list.forEach((item) => nodes[item.name] && frag.appendChild(nodes[item.name]));
        layers[layer].appendChild(frag);
      }
    }
    const t = translateAlong(S.P, RELEASE.dir.map((c) => c * smooth(0, 1, s.pinT) * RELEASE.travel));
    release.setAttribute("transform", t);
    holdStill(release, t.match(/-?[\d.]+/g).map(Number));
    cards.forEach((el, i) => el && el.setAttribute("transform", translateAlong(S.P, [0, 0, s.cards[i].x * CARDS.lift])));
    digits.textContent = String(s.n).padStart(3, "0");
    lamp.toggleAttribute("data-on", s.held && s.phase === "done");
    const text = readoutOf(gene(), s.phase, { n: s.n, angle: Math.abs(wrap(s.phi[0].x - s.phi[1].x)) });
    text.forEach((line, i) => lines[i].textContent !== line && (lines[i].textContent = line));
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const phase = s.phase;
    // reduced motion: the same weighing, run ahead to where it rests, drawn once
    const calm = still.matches;
    let moving = false;
    for (let i = 0; i < (calm ? 900 : 1); i++) if (((clock += calm ? 0.05 : dt), !(moving = step(calm ? 0.05 : dt)))) break;
    if (calm) moving = false;
    if (moving || was || phase !== s.phase || s.phase === "count") draw();
    was = moving;
    frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
  }
  function kick() {
    was = true;
    if (!frame && visible) (last = 0), (frame = requestAnimationFrame(tick));
  }
  function hold() {
    touring = false;
    clearTimeout(resume);
    if (!still.matches)
      resume = setTimeout(() => {
        touring = true;
        if (s.phase === "done" || s.phase === "hand") next(1, false);
        else (s.auto = true), kick();
      }, RESUME);
  }

  // Pointer: a press near a wheel drags that pulley round the rim; a tap on the pin, the
  // ring or the release knob pulls or seats the pin; a tap elsewhere steps to the next gene.
  const toBox = (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };
  const floorAt = ([sx, sy], z) => {
    const o = S.at([0, 0, z]);
    const ex = S.at([1, 0, z]);
    const ey = S.at([0, 1, z]);
    const [ax, ay, bx, by] = [ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1]];
    const det = ax * by - ay * bx;
    const [dx, dy] = [sx - o[0], sy - o[1]];
    return [(dx * by - dy * bx) / det, (ax * dy - ay * dx) / det];
  };
  const near = (at, point, r) => {
    const c = S.at(point);
    return Math.hypot(c[0] - at[0], c[1] - at[1]) < r;
  };
  const pulleyAt = (at) => {
    let pick = -1;
    let best = 16;
    s.phi.forEach((p, i) => {
      const c = S.at(S.onRim(S.rimFrame(p.x), S.WHEEL.rho, 0, S.WZ));
      const d = Math.hypot(c[0] - at[0], c[1] - at[1]);
      if (d < best) (best = d), (pick = i);
    });
    return pick;
  };
  const pinAt = (at) => {
    const out = smooth(0, 1, s.pinT) * RELEASE.travel + 11;
    return near(at, [...RELEASE.dir.slice(0, 2).map((c) => c * out), 28], 10) || near(at, [s.ring[0].x, s.ring[1].x, S.SZ], 10) || near(at, [0, 0, S.TOP + 6 * (1 - s.pinT)], 9);
  };
  let press = null;
  function onDown(e) {
    const at = toBox(e);
    const pick = pulleyAt(at);
    press = { x: e.clientX, y: e.clientY, pick, pin: pick < 0 && pinAt(at), moved: false, id: e.pointerId };
    hold();
  }
  function onMove(e) {
    if (!press) {
      // a mouse over a wheel, the pin or the knob shows what it can do there
      if (e.pointerType === "mouse") stage.dataset.over = pulleyAt(toBox(e)) >= 0 ? "pulley" : pinAt(toBox(e)) ? "pin" : "";
      return;
    }
    if (e.pointerId !== press.id) return;
    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) {
      press.moved = true;
      if (press.pick >= 0) {
        stage.setPointerCapture(e.pointerId);
        stage.dataset.drag = "";
        if (s.phase !== "hand") enter();
        s.hand = press.pick;
        s.user = true;
      }
    }
    if (press.moved && press.pick >= 0) {
      const [x, y] = floorAt(toBox(e), S.TOP);
      const other = s.phi[1 - press.pick].x;
      let phi = other + wrap(Math.atan2(y, x) / S.DEG - other);
      const gap = wrap(phi - other);
      if (Math.abs(gap) < 14) phi = other + 14 * Math.sign(gap || 1);
      s.phiT[press.pick] = phi;
      kick();
    }
  }
  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    if (!press.moved) press.pin ? togglePin(true) : next(1, true);
    onCancel();
  }
  function onCancel() {
    delete stage.dataset.drag;
    press = null;
    hold();
  }
  function onKey(e) {
    const k = Number(e.key);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next(1, true);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next(-1, true);
    else if (k >= 1 && k <= GENES.length) request(k - 1, true);
    else if (e.key === " " || e.key === "Enter") togglePin(true);
    else return;
    e.preventDefault();
    hold();
  }
  const onFocus = () => (announce.textContent = describeOf(gene()));
  const on = [
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onCancel],
    ["keydown", onKey],
    ["focus", onFocus],
  ];
  on.forEach(([type, fn]) => stage.addEventListener(type, fn));
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(stage);
  const onStill = () => ((touring = !still.matches), kick());
  still.addEventListener("change", onStill);
  // the drawing starts on AKT3 weighed; the tour runs on from there
  if (touring) s.at = -1.6;
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(resume);
    io.disconnect();
    still.removeEventListener("change", onStill);
    on.forEach(([type, fn]) => stage.removeEventListener(type, fn));
  };
}
