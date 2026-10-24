// The parts that move, as items of fixed structure: every item is a list of solids and
// lines whose count never changes, so the page rewrites path data in place. Shared by
// the build (static art, audit) and the page. `A` (build only) gives each item's audit
// shapes: A.shapes(kind, context).
import * as S from "./scene.mjs";
import { depth, onRim, R, TOP, WZ } from "./scene.mjs";
export const PULLEYS = [
  { id: "orf", side: 1 },
  { id: "crispr", side: -1 },
];

const solid = (paths, tone = "mid", lit = false) => ({ s: paths, tone, lit });
const line = (d, tone = "lo") => ({ d, tone });

// pose: { phi: [orf, crispr] floor angles, masses: [orf, crispr], ring: [x, y], drop,
// tr: [orf, crispr] mass in transit or null }
export function dynamicItems(pose, A = null) {
  const items = [];
  const ring = [pose.ring[0], pose.ring[1], 0];
  const put = (name, layer, key, parts, kind, ctx) => items.push({ name, layer, key, parts, shapes: A && kind ? A.shapes(kind, ctx) : [] });
  PULLEYS.forEach(({ id, side }, index) => {
    const phi = pose.phi[index];
    const p = S.pulleyParts(phi, side);
    const st = S.stringOf(phi, ring);
    const tr = pose.tr && pose.tr[index];
    const h = S.hangerParts(phi, st.hook, pose.masses[index], tr);
    const back = S.facingOf(phi) < 0 ? "A" : "B";
    // Clamp parts are blocks side by side round the rim: order them by where they stand on
    // the rim (one reference height), and parts stacked at one spot by their height.
    const ZREF = TOP - 4;
    const k = (rho, tau, z) => depth(onRim(p.F, rho, side * tau, ZREF)) + 0.01 * (z - ZREF);
    const wheel = k(S.WHEEL.rho, 0, WZ);
    const n = (part) => `${id}-${part}`;
    // Under the rim, a front clamp's bottom jaw and thumb screw sit in front of the column
    // and behind the table's edge (which hides the shank's tip): layer U, between them.
    const under = back === "A" ? "A" : "U";
    put(n("shadow"), "F", depth([h.x, h.y, 0]), [{ halo: h.shadow }]);
    put(n("spine"), back, k(R + 1.6, 4.8, TOP - 4), [solid(p.spine.paths)], "spine", { p, id });
    put(n("head"), under, k(R - 1.8, 4.8, TOP - 12), [solid(p.head), line(p.knurl)], "head", { p, id });
    put(n("bjaw"), under, k(R - 1.8, 4.8, TOP - 9), [solid(p.bjaw.paths)], "bjaw", { p, id });
    put(n("shank"), under, k(R - 1.8, 4.8, TOP - 6), [solid(p.shank)], "shank", { p, id });
    put(n("plate"), back, k(R + 5.7, 2.8, WZ), [solid(p.plate.paths)], "plate", { p, id });
    put(n("drop"), back, wheel - 0.03, [line(st.drop, "hi")]);
    put(n("wheel"), back, wheel, [solid(p.axle), solid(p.wheel, "hi"), line(p.hub, "faint"), solid(p.nut), line(p.nutFace, "faint")], "wheel", { p, id });
    put(n("hanger"), back, depth([h.x, h.y, (h.base + st.hook) / 2]), [solid(h.baseP), { s: h.stack, tone: "hi", inner: h.seams }, line(h.slot), solid(h.stem), solid(h.moving, "hi"), line(h.movingSlot), solid(h.stemHi), line(h.loop, "mid")], "hanger", { h, st, tr, id });
    put(n("index"), "B", k(R - 2.4, 1.2, TOP + 0.25), [solid(p.index.paths)], "index", { p, id });
    put(n("jaw"), "B", k(R - 2.8, 4.8, TOP + 0.9), [solid(p.jaw.paths)], "jaw", { p, id });
    put(n("run"), "B", back === "B" ? wheel - 0.05 : (depth(st.tie) + depth(st.top)) / 2, [line(st.run, "hi")]);
  });
  const rk = depth([ring[0], ring[1], TOP + 0.7]);
  PULLEYS.forEach(({ id }, index) => put(`${id}-tie`, "B", rk + 0.002 + index * 1e-4, [line(S.tieOf(ring, S.stringOf(pose.phi[index], ring).top), "hi")]));
  put("cord", "B", rk - 0.004, [line(S.cordOf(ring), "hi")]);
  const pin = S.pinParts(pose.drop);
  put("pin-lo", "B", rk + 0.005, pin.lo.map((paths) => solid(paths)), "pin-lo", pin);
  items.push({ name: "ring", layer: "B", key: rk, parts: [solid(S.RING_PATHS, "hi", true)], shapes: A ? A.shapes("ring", ring) : [], move: ring });
  put("pin-hi", "B", rk + 0.01, [...pin.hi.map((paths) => solid(paths)), line(pin.knurl)], "pin-hi", pin);
  return items;
}

// Painter's order: layer F (shadows on the bench), A (behind everything on the stand), U
// (under the rim, in front of the column), B (in front of the table), each by key.
export const ordered = (items, layer) => items.filter((item) => item.layer === layer).sort((a, b) => a.key - b.key);
