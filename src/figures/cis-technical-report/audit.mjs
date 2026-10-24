// Fig 22 audit: the kit checks over the outside (bench and everything on it) and over the inside seen through the
// window, at rest and in every 0.25 s of a promotion and a rollback. The painter's order is settled once over all
// those frames and written to order.mjs, so the static art and the live page draw in an order every frame accepts.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as A from "../kit/audit.mjs";
import * as W from "./world.mjs";
import * as G from "./round.mjs";
import * as k from "../kit/iso-kit.mjs";
import { poseAt, runSegment, latchSegment, IDLE } from "./model.mjs";

const STEP = 0.25;
// (a frame is a pose of the moving parts; frames that leave a layer's geometry as it was are skipped for that layer)

// parts of one assembly share an owner: a rod in its guides, a valve and its outlet, the glass legs in their clips
const OWNERS = [/^(valve\.\w+)/, /^(lock)\./, /^(door)/, /^(bub)\./, /^(ac)\./, /^(feed)\./, /^(rec)\./, /^(tray)/, /^(ch)\./, /^(win)\./, /^(rail|seat)/, /^(bridge)/, /^(shelf)/, /^(safe)/, /^(board|rack)/];
const ownerOf = (name) => {
  for (const re of OWNERS) {
    const m = name.match(re);
    if (m) return m[1] === "seat" ? "rail" : m[1] === "board" ? "rack" : m[1];
  }
  return name.replace(/#.*$/, "");
};
// a pad seated on its host carries the host as its cut
const HOSTS = new Map();
function shapeOf(d, meta) {
  const [kind, ...a] = d;
  const last = a[a.length - 1];
  const extra = last && typeof last === "object" && !Array.isArray(last) && !("x" in last) && !("o" in last) ? a.pop() : {};
  const m = { owner: ownerOf(meta.name), ...meta, ...extra };
  if (m.on) {
    m.cut = HOSTS.get(m.on);
    delete m.on;
  }
  if (kind === "slab") return A.slab({ r: 0, ...a[0] }, a[1], a[2], m, 3);
  if (kind === "cyl") return A.cylinder(a[0], a[1], a[2], a[3], a[4], m);
  if (kind === "disc") return A.disc(a[0], a[1], a[2], a[3], m);
  if (kind === "ring") return A.ring(a[0], a[1], a[2], a[3], a[4], m);
  if (kind === "solid") return A.solid(a[0], a[1], m);
  if (kind === "prism") return A.prism(a[0], a[1], a[2], a[3], m);
  if (kind === "box") return A.box(a[0], a[1], m);
  if (kind === "tube") return A.tube(a[0], a[1], m);
  throw new Error(`unknown shape ${kind}`);
}
const named = (descs, name) => descs.map((d, j) => shapeOf(d, { name: j ? `${name}#${j}` : name }));
const movedAll = (shapes, offset) => shapes.map((s) => A.moved(s, offset));
// a shape the clip takes away whole (every corner of its bounds inside the cut) is not drawn, so it is not recorded
const inside = (shape, cut) => {
  const b = A.boundsOf(shape);
  const lo = b.min ?? b[0], hi = b.max ?? b[1];
  for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) if (A.sdf(cut, [x, y, z]) > -1e-3) return false;
  return true;
};
const cutAll = (shapes, cut) => shapes.filter((s) => !inside(s, cut)).map((s) => ({ ...s, cut, _b: undefined }));

// what the drawing clips away, as solids: the antechamber's bore for the outside copy of the cartridge, the wall
// beyond the chamber for the inside copy, the record box for the card. (The champion keeps its whole shape: sunk
// into the chute it is hidden by the chute's walls and the rail, and the drawing shows it only through the opening.)
const ANTE = A.disc(W.FA, -400, W.AX.x1 - W.AX.x0, W.AX.r + 4, { name: "clip.ante" });
const BEYOND = A.box([W.IN.x1, -200, -200], [400, 200, 400], { name: "clip.beyond" });
const BELOW_SLOT = A.box([-400, -200, -200], [400, 200, W.REC.h], { name: "clip.slot" });
const spokeShapes = (F, spec, turn, name, meta) =>
  [0, 1, 2].map((i) => A.prism(W.spokeFrame(F, turn + (i * 2 * Math.PI) / 3 + Math.PI / 2), W.spokePoly(spec), spec[0], spec[1], { name: `${name}#spoke${i}`, ...meta }));

function doorShapes(theta, turn) {
  const d = W.doorParts(theta, turn);
  const F = d.F;
  const o = { owner: "door" };
  const H = W.WHEEL;
  // the keeper's blind bore, open toward the antechamber, on the rod's line
  const bore = A.disc(G.frameOf(G.pointOf(F, 0, W.LOCK_R, W.KEEPER.angle), F.a, F.u, F.v), -1, W.KEEPER.depth, W.KEEPER.bore, { name: "door#bore" });
  const [k0, k1, kr, ka] = H.knob;
  return [
    A.disc(F, 0, W.DOOR.t, W.DOOR.r, { name: "door", ...o }),
    { ...A.prism(W.keeperFrame(F), W.KEEPER_POLY, 0, W.DOOR.t, { name: "door#keeper", ...o }), cut: bore },
    A.disc(F, H.boss[0], H.boss[1], H.boss[2], { name: "door#boss", ...o }),
    A.disc(F, H.hub[0], H.hub[1], H.hub[2], { name: "door#hub", ...o }),
    A.ring(F, H.rim[0], H.rim[1], H.rim[2], H.rim[3], { name: "door#rim", ...o }),
    ...spokeShapes(F, H.spoke, turn, "door", o),
    A.disc(G.frameOf(G.pointOf(F, 0, ka, turn + 0.5), F.a, F.u, F.v), k0, k1, kr, { name: "door#knob", ...o }),
    A.prism(d.leafF, W.DOOR_LEAF, 0, W.DOOR_LEAF_S, { name: "door#leaf", ...o }),
  ];
}

// the shapes an item has in a pose, or null when it draws nothing there
function shapesIn(item, pose) {
  const base = named(item.shapes, item.name);
  const cart = (x) => movedAll(base, [x, 0, 0]);
  switch (item.name) {
    case "cart.ext":
      // wholly inside the antechamber, the outside copy is all clipped away
      return pose.vis < 0.05 || pose.cart + W.CART.w / 2 <= W.AX.x1 ? null : cutAll(movedAll(base, [pose.cart, pose.across, 0]), ANTE);
    case "tray":
      return movedAll(base, [0, pose.slide - W.TABLE_DY, 0]);
    case "cart.int":
      return pose.vis < 0.05 || pose.cart > W.IN.x1 + W.CART.w / 2 ? null : cutAll(cart(pose.cart), BEYOND);
    case "cart.champ":
      return pose.champ < 0.05 ? null : movedAll(base, [W.SEAT.champion, 0, -pose.sink * W.SINK]);
    case "lock.rod":
      return [A.disc(W.IWF, W.ROD.from, W.rodTip(pose.lock), W.LOCKBAR.r, { name: "lock.rod" })];
    case "lock.wheel":
      return [...base.filter((shape) => !/#[5-7]$/.test(shape.name)), ...spokeShapes(W.IWF, W.IW.spoke, W.innerTurn(pose.lock), "lock.wheel", {})];
    case "rail.leaf":
      return [A.prism(W.leafFrame(pose.hatch), W.LEAF_POLY, 0, W.HATCH.w - 0.2, { name: "rail.leaf" })];
    case "door":
      return doorShapes(pose.door, pose.wheel);
    case "rec.card": {
      if (pose.card < 0.05) return null;
      const c = W.CARD;
      return [{ ...A.slab({ x: c.x, y: c.y, w: c.w, d: c.d, r: 0 }, W.REC.h - c.h * (1 - pose.card), c.h, { name: "rec.card" }, 3), cut: BELOW_SLOT }];
    }
    default:
      if (item.name.startsWith("lever.")) {
        const x = W.VALVES.find((v) => item.name === `lever.${v.name}`).x;
        const v = item.name.endsWith("evac") ? pose.evac : pose.purge;
        const F = W.leverFrame(x, (v * Math.PI) / 2);
        return [A.prism(F, W.LEVER.bar, 0, 1.2, { name: item.name }), A.prism(F, W.LEVER.grip, 1.2, 2.2, { name: `${item.name}#1` })];
      }
      return base;
  }
}

// seen from inside, each glove port's ring, clamp and dark cuff are drawn over the interior (they are outside items):
// the inside layer gets them as covers, so a glove's bend behind the port is known to be hidden
const PORT_COVERS = W.PORTS.map((port) => {
  const F = W.FN(port.x, port.w, 0);
  const shape = A.disc(F, 0, 3.6, port.clamp, { name: `port.cover${port.x}`, owner: `port${port.x}`, ground: true });
  const rim = Array.from({ length: 24 }, (_, j) => W.at(G.pointOf(F, 3.6, port.clamp, (j / 24) * Math.PI * 2)));
  return { name: `port.cover${port.x}`, shape, svg: `<path d="M${rim.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L")}Z"/>` };
});

// the markup a moved part has in a pose: translated parts shifted on screen, turned parts redrawn
const shift = (svg, offset) => `<g transform="${k.translateAlong(W.P, offset)}">${svg}</g>`;
function svgIn(item, pose) {
  switch (item.name) {
    case "cart.ext":
      return shift(item.svg, [pose.cart - W.STATION.tray, pose.across - W.TABLE_DY, 0]);
    case "cart.int":
      return shift(item.svg, [pose.cart - W.STATION.ante, 0, 0]);
    case "cart.champ":
      return shift(item.svg, [0, 0, -pose.sink * W.SINK]);
    case "tray":
      return shift(item.svg, [0, pose.slide - W.TABLE_DY, 0]);
    case "lock.rod":
      return W.fixedSolid(W.rodPaths(pose.lock), {});
    case "rail.leaf":
      return W.fixedSolid(W.leafPaths(pose.hatch), {});
    case "rec.card":
      return W.fixedSolid(W.cardPaths(pose.card), {});
    case "door": {
      const d = W.doorParts(pose.door, pose.wheel);
      return W.DOOR_PARTS.map((name) => W.fixedSolid(d[name], {})).join("");
    }
    default:
      if (item.name.startsWith("lever.")) {
        const x = W.VALVES.find((v) => item.name === `lever.${v.name}`).x;
        const p = W.leverPaths(x, ((item.name.endsWith("evac") ? pose.evac : pose.purge) * Math.PI) / 2);
        return W.fixedSolid(p.bar, {}) + W.fixedSolid(p.grip, {});
      }
      return item.svg;
  }
}

function recordLayer(list, routes, pose, layer) {
  const R = A.recorder(W.P);
  if (layer === "int") for (const cover of PORT_COVERS) R.put({ name: cover.name, key: 1e9, svg: cover.svg, shapes: [cover.shape] });
  for (const route of routes) R.route(route.name, route.points, route.radius, route.options);
  list.forEach((item, index) => {
    if (!item.svg && !item.shapes.length) return;
    const shapes = shapesIn(item, pose);
    if (!shapes) return;
    if (!item.route) shapes.forEach((s) => R.solid(s));
    if (!item.svg) return; // drawn nowhere (hidden behind the panel), recorded for supports and clearance only
    R.put({ name: item.name, key: index, route: item.route, chunk: item.chunk, svg: svgIn(item, pose), shapes });
  });
  return R;
}

// tubes are recorded through their routes; their drawn chunks carry the tube shape for the order check only
function routesOf(items, layer) {
  return (items.routes || [])
    .filter((r) => (r.layer || "ext") === layer)
    .map((r) => ({
      name: r.name,
      points: r.points,
      radius: r.name.startsWith("glove") ? (t) => 7.1 - 1.2 * t : r.r,
      // a glove's far end is its closed hand hanging inside: no terminal there
      options: { limp: Boolean(r.limp), ends: r.name.startsWith("glove") ? [true, false] : [true, true] },
    }));
}

export async function runAudit(here) {
  const { sortedItems } = await import(join(here, "art.mjs") + `?audit=${Date.now()}`);
  // start from the unsettled order: keys by depth
  const { ground, ext, int, routes } = sortedItems({ unsettled: true });
  for (const item of [...ground, ...ext, ...int]) if (!item.route) named(item.shapes.filter((d) => !d.some((v) => v && v.on)), item.name).forEach((shape) => HOSTS.set(shape.name, { ...shape, piece: "", ride: "", move: [0, 0, 0] }));
  const items = { routes };
  const outside = [...ground, ...ext];
  const inside = int;

  // frames: rest, a promotion, a rollback, the latch
  const frames = [{ label: "rest", pose: { ...IDLE } }];
  for (const run of [0, 1]) {
    const seg = runSegment(run, "green");
    for (let t = 0; t <= seg.dur + 1e-9; t += STEP) frames.push({ label: `${run ? "rollback" : "promote"} t ${t.toFixed(2)}`, pose: poseAt(seg, t) });
  }
  const latch = latchSegment("iter-000149", "green");
  for (let t = 0; t <= 1.8; t += STEP) frames.push({ label: `latch t ${t.toFixed(2)}`, pose: poseAt(latch, t) });
  // frames that pose a layer's geometry the same way are audited once for that layer
  const r2 = (v) => (typeof v === "number" ? v.toFixed(2) : String(v));
  const SIGN = {
    ext: (p) => [p.vis > 0.05 && p.cart > W.AX.x1 - W.CART.w ? `${r2(p.cart)}:${r2(p.across)}` : "-", p.slide, p.door, p.wheel, p.lock, p.evac, p.purge, p.card].map(r2).join("|"),
    int: (p) => [p.vis > 0.05 && p.cart < W.IN.x1 + W.CART.w ? r2(p.cart) : "-", p.champ > 0.05 ? r2(p.sink) : "-", r2(p.hatch), r2(p.hasp)].join("|"),
  };
  const framesFor = (layer) => {
    const seen = new Set();
    const out = frames.filter((f) => {
      const key = SIGN[layer](f.pose);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (process.env.AUDIT_ONLY) return out.filter((f) => f.label === "rest" || process.env.AUDIT_ONLY.split(",").includes(f.label));
    return process.env.AUDIT_REST ? out.slice(0, 1) : out;
  };
  const started = Date.now();

  let ok = true;
  const order = {};
  for (const [layer, list] of [["ext", outside], ["int", inside]].filter(([l]) => !process.env.AUDIT_LAYER || process.env.AUDIT_LAYER === l)) {
    const layerRoutes = routesOf(items, layer);
    // 1. overlaps in every frame, one set of keys for all of them
    const mine = framesFor(layer);
    const recorded = mine.map((f) => ({ f, R: recordLayer(list, layerRoutes, f.pose, layer) }));
    const names = list.filter((i) => i.svg).map((i) => i.name);
    const index = new Map(names.map((n, i) => [n, i]));
    const all = names.map((name, i) => ({ name, key: i }));
    const pairs = [];
    let least = 0.25;
    let V;
    for (const rec of recorded) {
      const { R } = rec;
      const o = (rec.overlaps = A.overlapsOf(R.items, W.P, { states: [0], skip: A.sameRun }));
      least = o.least;
      V = o.V;
      for (const p of o.pairs) {
        const a = index.get(R.items[p.a].name);
        const b = index.get(R.items[p.b].name);
        if (a == null || b == null) continue; // the port covers are always drawn last
        pairs.push({ ...p, a, b, label: rec.f.label });
      }
    }
    const solved = A.orderKeys(all, { pairs, least, V });
    const keyOf = new Map(names.map((n, i) => [n, solved.keys[i]]));
    order[layer] = names.slice().sort((a, b) => keyOf.get(a) - keyOf.get(b) || index.get(a) - index.get(b));
    // 2. every check in every frame with that order
    const problems = new Map();
    let failed = 0;
    for (const { f, R, overlaps } of recorded) {
      R.items.forEach((item) => (item.key = keyOf.has(item.name) ? keyOf.get(item.name) : item.key));
      R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i) => i.key), rules: 0, dropped: [] }, states: [0] };
      const result = A.audit(R, W.P, { frames: [], apart: false, crowd: CROWD, cover: COVER });
      const count = A.failures(result);
      failed += count;
      if (!count) continue;
      if (process.env.AUDIT_FULL) console.log(A.report(result));
      for (const line of A.report(result).split("\n")) {
        if (!/^\s/.test(line) || !line.trim()) continue;
        const key = line.replace(/[-\d.]+ ?px².*$/, "").replace(/[-\d.]+/g, "#").trim();
        if (!problems.has(key)) problems.set(key, { line, frames: [] });
        problems.get(key).frames.push(f.label);
      }
    }
    for (const { line, frames: where } of problems.values()) console.log(`[${layer}] ${line.trim()}\n      in ${where.length} frames, first ${where[0]}`);
    console.log(`[${layer}] ${list.length} items · ${mine.length} frames · ${pairs.length} overlaps · ${solved.dropped.length} dropped order rules · ${failed} problems · ${((Date.now() - started) / 1000).toFixed(0)} s`);
    if (failed || solved.dropped.length) ok = false;
    for (const rule of solved.dropped) console.log(`[${layer}] dropped order rule: ${names[rule.front]} over ${names[rule.back]}`);
    if (process.env.AUDIT_CYCLES && solved.dropped.length) {
      // the chain of rules that forces each dropped rule's back after its front
      const edges = new Map();
      for (const p of pairs) {
        const aF = p.front[0].area >= least, bF = p.front[1].area >= least;
        if (aF === bF) continue;
        const [front, back] = aF ? [p.a, p.b] : [p.b, p.a];
        if (!edges.has(back)) edges.set(back, new Map());
        if (!edges.get(back).has(front)) edges.get(back).set(front, `${p.label} ${p.front[aF ? 0 : 1].area.toFixed(2)}px²`);
      }
      for (const rule of solved.dropped) {
        const prev = new Map([[rule.front, null]]);
        const queue = [rule.front];
        while (queue.length && !prev.has(rule.back)) {
          const n = queue.shift();
          for (const [m] of edges.get(n) ?? []) if (!prev.has(m)) prev.set(m, n), queue.push(m);
        }
        const path = [];
        for (let n = rule.back; n != null && prev.has(n); n = prev.get(n)) path.unshift(n);
        console.log(`[${layer}] cycle for ${names[rule.front]} over ${names[rule.back]}: ` + path.map((n, i) => (i ? ` -(${edges.get(path[i - 1]).get(n)})-> ` : "") + names[n]).join(""));
      }
    }
  }
  if (!process.env.AUDIT_REST && !process.env.AUDIT_LAYER) writeFileSync(
    join(here, "order.mjs"),
    `// Fig 22 · painter's order settled from geometry by \`node build.mjs --audit\` over the rest pose and every ${STEP} s of a promotion,\n// a rollback and the latch. Generated; do not edit.\nexport const ORDER_EXT = ${JSON.stringify(order.ext)};\nexport const ORDER_INT = ${JSON.stringify(order.int)};\n`,
  );
  console.log(ok ? "audit passed" : "audit failed");
  return ok;
}

// pairs looked at and judged clear (none yet)
const CROWD = [];
const COVER = [];
