// CertiPatch jig: every static path and every moving part, built once.
// Pure ESM (no fs): imported by art.mjs at build time and by build.mjs for previews and the audit.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import { FINS, PORT_LAYERS, CARD_ROWS, CARD_COLS, GAUGE, READ, HOLES, KNOB, CARD_TRAVEL, FEED, DROP } from "./model.mjs";
import {
  WIDTH, HEIGHT, BENCH, BENCH_H, FOOT_H, BODY, FIN_X, PORTS, POSTS, POST_Y, POST_TOP, CROWN_TOP, YOKE_SEAT, Y_RAISED, PLATE_Z, PLATE_TOP, PATCH_TOP, HOUSING_TOP,
  KNOB_Y, KNOB_R, BAR_Z, BAR_TOP, SCREW, BEARING_TOP, WHEEL, PROBE_HOME, DIAL, DIAL_R, DIAL_Z, DIAL_TOP, P, needleAt, barPaths, barRing, barStripe, bodyStripe, slotsOf, BAR_SLOTS, spokesAt, wheelAngle, YOKE_LIFT,
} from "./view.mjs";
export { WIDTH, HEIGHT, P };

// sealed model block
const FLANGE = { x: -130, y: -58, w: 148, d: 70, r: 4 };
const BODY_Z = 4;
const BODY_TOP = 44;
const LID = { x: -125, y: -53, w: 138, d: 60, r: 4.5 };
const TOP = 48;
const FRONT = BODY.y + BODY.d; // 8
const RIGHT = BODY.x + BODY.w; // 14
const PORT_R = 4;
const PORT_TOP = TOP + 2.5;
const RAIL_FRONT = -60.4;
const PIN_LEN = 9;

// probe
const RAIL = { x: -128, y: 26, w: 144, d: 7, r: 1 };
const RAIL_H = 4;
const PIN_Z = 11;
const STRIP_FACE = FRONT + 1.6;

// certificate unit
const UNIT = { x: 74, y: -80, w: 68, d: 128, r: 4 };
const UNIT_Z = 4;
const DECK = 13; // card track height
const TRACK_X = [94.5, 121.5];
export const CARD = { x: 93.5, y: -78, w: 29, d: 40, r: 1.2 };
const ROW_PITCH = 5.2;
const PUNCH_Y = CARD.y + CARD.d - 6; // the punches sit over the card's front row at home
const colX = (col) => CARD.x + 3 + col * ((CARD.w - 6) / (CARD_COLS - 1));
const READER = { x: 82, y: -2, w: 52, d: 46, r: 3 };
const PIT = { x: CARD.x - 0.8, y: READER.y + 0.6, w: CARD.w + 1.6, d: CARD.d + 1, r: 0 }; // the stacker under the reading deck
const HOPPER = { x: 40, y: -80, w: 34, d: 44, r: 1.6 };
const STACK_Z = DECK - 0.8; // two blanks under the one that feeds
export const LAMP_IDS = ["identity", "artifacts", "scope", "metrics", "verdict"];

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
// small plans with a hairline radius are drawn square: the rounding is invisible and costs four shade slivers
const slab = (plan, z, h, steps = 3, bevel = 0) => (plan.r < 0.45 ? k.slabOf({ ...plan, r: 0 }, z, h, P, 1, bevel) : k.slabOf(plan, z, h, P, steps, bevel));
const cyl = (x, y, r, z, h, steps = 16, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const UP = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
// several solids that never overlap on screen, drawn as one: every fill, then every shade, top and line
const join = (list) => list.filter(Boolean).join("");
const merge = (list) => ({
  fill: join(list.map((p) => p.fill)),
  shades: [0, 1, 2, 3].map((i) => join(list.map((p) => p.shades[i]))),
  top: join(list.map((p) => p.top)),
  crease: join(list.map((p) => p.crease)),
  bevel: join(list.map((p) => p.bevel)),
  outline: join(list.map((p) => p.outline)),
});
const poly = (points, cls, extra = "") => `<path class="${cls}"${extra} d="${k.pathOf(points.map(at), true)}"/>`;

// shape descriptors (turned into audit shapes by build.mjs)
const sSlab = (plan, z, h) => ["slab", plan, z, h];
const sCyl = (x, y, r, z, h) => ["cyl", x, y, r, z, h];
const sDisc = (F, s0, s1, r) => ["disc", F, s0, s1, r];
const sRing = (F, s0, s1, rIn, rOut) => ["ring", F, s0, s1, rIn, rOut];
const sBall = (c, r) => ["ball", c, r];
const sPrism = (ring, z, h) => ["prism", ring, z, h];
const sSlide = (F, from, to, r) => ["slide", F, from, to, r];
const sOwned = (desc, owner) => Object.assign(desc, { meta: { owner } }); // a part that runs in its owner's bore

// ---------------------------------------------------------------- items
// Painter's order is the order of put(). `part` names the moving group an item rides with; `wrap` wraps its group.
export function build() {
  const items = [];
  const routes = [];
  const put = (name, svg, shapes, part = "", wrap = "") => items.push({ name, svg, shapes, part, wrap });

  // ============================ bench
  {
    const halo = `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`;
    const feet = [];
    const shapes = [];
    // the back foot is hidden under the bench; the three that show stand out at the corners
    for (const [x, y] of byDepth(k.corners(BENCH, 11)).slice(1)) {
      feet.push(cyl(x, y, 6.4, -BENCH_H - FOOT_H, FOOT_H, 10));
      shapes.push(sCyl(x, y, 6.4, -BENCH_H - FOOT_H, FOOT_H));
    }
    put("stand.feet", halo + S(merge(feet), { tone: "lo" }), shapes);
    const screws = k.corners(BENCH, 10);
    const groove = L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" });
    const rings = L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" });
    put("stand.bench", S(slab(BENCH, -BENCH_H, BENCH_H, 8, 1.6), { tone: "mid", inner: "" }) + groove + rings + D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }), [sSlab(BENCH, -BENCH_H, BENCH_H)]);
  }

  // label plate on the bench's front face: the maker's mark and three rule lines
  {
    const y = BENCH.y + BENCH.d;
    const plate = { x: -66, y, w: 48, d: 0.8, r: 0.3 };
    const z0 = -9.6;
    const h = 7.6;
    const face = y + 0.8;
    const fp = (x, z) => at([x, face, z]);
    const rules = [26, 21, 14].map((w, i) => k.pathOf([fp(plate.x + 17, z0 + h - 2 - i * 1.8), fp(plate.x + 17 + w, z0 + h - 2 - i * 1.8)])).join("");
    const inset = k.pathOf([fp(plate.x + 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + 1.2), fp(plate.x + plate.w - 1.2, z0 + h - 1.2), fp(plate.x + 1.2, z0 + h - 1.2)], true);
    const divider = k.pathOf([fp(plate.x + 14.6, z0 + 1.2), fp(plate.x + 14.6, z0 + h - 1.2)]);
    const mark = k.faceTextSvg(k.sideMatrix([plate.x + 7.8, face], z0 + h / 2 - 1.1, P, "left"), "AU-4", { size: 2.9, tone: "mid", anchor: "middle" });
    const svg = S(slab(plate, z0, h, 2), { tone: "lo", crease: "none" }) + L(inset + divider, { tone: "faint" }) + mark + L(rules, { tone: "lo", free: true }) + D([fp(plate.x + plate.w - 3.2, z0 + h / 2)], { size: 0.45 });
    put("label", svg, [sSlab(plate, z0, h)]);
  }

  // ============================ patch press: posts with depth stops, and the crown (behind the block)
  const postPlan = (px) => ({ x: px - 5, y: POST_Y - 5, w: 10, d: 10, r: 1.4 });
  for (const [index, px] of POSTS.entries()) {
    const foot = { x: px - 8.5, y: POST_Y - 8.5, w: 17, d: 17, r: 2 };
    const plan = postPlan(px);
    const rail = { x: px - 2.5, y: POST_Y + 5, w: 5, d: 1.6, r: 0.5 };
    // the depth stop: a clamp block on the rail whose top is the seat height, with its locking screw
    const stop = { x: px - 4, y: RAIL_FRONT, w: 8, d: 4, r: 0.6 };
    const stopZ = YOKE_SEAT - 4;
    const footSvg = S(slab(foot, 0, 3, 3, 0.5), { tone: "mid" }) + D(k.corners(foot, 3).map(([x, y]) => at([x, y, 3])), { size: 0.45 });
    const postSvg = S(slab(plan, 3, POST_TOP - 3, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 54, P, 3), { tone: "faint" }) });
    const railSvg = S(slab(rail, 8, POST_TOP - 14, 2), { tone: "lo", crease: "none" }) + D([at([px, rail.y + 1.6, 14]), at([px, rail.y + 1.6, 90])], { size: 0.4, tone: "lo" });
    const stopSvg = S(slab(stop, stopZ, 4, 2, 0.3), { tone: "mid" }) + L(k.sideRing([px, RAIL_FRONT + 4, stopZ + 2], 1.1, "y", P), { tone: "lo" }) + D([at([px, RAIL_FRONT + 4, stopZ + 2])], { size: 0.4 });
    put(`press.post${index}`, footSvg + postSvg + railSvg + stopSvg, [sSlab(foot, 0, 3), sSlab(plan, 3, POST_TOP - 3), sSlab(rail, 8, POST_TOP - 14), sSlab(stop, stopZ, 4)]);
  }
  const CROWN = { x: POSTS[0] - 7, y: POST_Y - 6.5, w: POSTS[1] - POSTS[0] + 14, d: 13, r: 2 };
  put(
    "press.crown",
    S(slab(CROWN, POST_TOP, 7, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CROWN, POST_TOP + 3.5, P, 4), { tone: "faint" }) }) + D(POSTS.flatMap((px) => [at([px - 3, POST_Y - 2, CROWN_TOP]), at([px + 3, POST_Y - 2, CROWN_TOP])]), { size: 0.5 }),
    [sSlab(CROWN, POST_TOP, 7)],
  );

  // ============================ sealed model block
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(FLANGE, 0, 6, P)}"/>`];
    out.push(S(slab(FLANGE, 0, BODY_Z, 4, 0.6), { tone: "lo" }));
    out.push(D([[-125, 7], [-125, -53], [13, -53], [13, 7]].map(([x, y]) => at([x, y, BODY_Z])), { size: 0.45 }));
    put("block.flange", out.join(""), [sSlab(FLANGE, 0, BODY_Z)]);
  }
  // strap clamps on the flange ends
  function clamp(index) {
    const side = index ? 1 : -1;
    const edge = side < 0 ? FLANGE.x : FLANGE.x + FLANGE.w;
    const heel = side < 0 ? { x: edge - 16, y: -9, w: 6, d: 11, r: 1 } : { x: edge + 10, y: -9, w: 6, d: 11, r: 1 };
    const bar = side < 0 ? { x: edge - 16, y: -6.5, w: 18.5, d: 6, r: 1.2 } : { x: edge - 2.5, y: -6.5, w: 18.5, d: 6, r: 1.2 };
    const pad = side < 0 ? { x: edge + 0.5, y: -5.5, w: 3, d: 4, r: 0.6 } : { x: edge - 3.5, y: -5.5, w: 3, d: 4, r: 0.6 };
    const stud = [side < 0 ? edge - 6 : edge + 6, -3.5];
    const svg =
      S(slab(heel, 0, 8, 3, 0.4), { tone: "mid" }) +
      S(slab(pad, BODY_Z, 4, 2), { tone: "lo" }) +
      S(slab(bar, 8, 3, 3, 0.4), { tone: "mid" }) +
      S(cyl(stud[0], stud[1], 2.9, 11, 0.8, 10), { tone: "lo" }) +
      S(cyl(stud[0], stud[1], 2.4, 11.8, 2.6, 6), { tone: "mid" }) +
      D([at([stud[0], stud[1], 14.4])], { size: 0.6, tone: "lo" });
    put(`block.clamp${index}`, svg, [sSlab(heel, 0, 8), sSlab(pad, BODY_Z, 4), sSlab(bar, 8, 3), sCyl(stud[0], stud[1], 2.9, 11, 0.8), sCyl(stud[0], stud[1], 2.4, 11.8, 2.6)]);
  }

  clamp(0);
  let sealItem;
  {
    // the cast body: lid seam and a parting line wrap the corners
    const parting = k.sideSeam(BODY, 15, P, 6);
    const body = S(slab(BODY, BODY_Z, BODY_TOP - BODY_Z, 6, 0), { tone: "mid", inner: L(parting, { tone: "faint" }) });
    // fingerprint tag on the right face: two rule lines and two rivets
    const tagY0 = -14;
    const tagY1 = 2;
    const tag = S(slab({ x: RIGHT, y: tagY0, w: 0.7, d: tagY1 - tagY0, r: 0.3 }, 27, 10, 2), { tone: "lo", crease: "none" });
    const tagRules = k.pathOf([at([RIGHT + 0.7, tagY0 + 4, 33.6]), at([RIGHT + 0.7, tagY1 - 2.5, 33.6])]) + k.pathOf([at([RIGHT + 0.7, tagY0 + 4, 30.6]), at([RIGHT + 0.7, tagY1 - 6.5, 30.6])]);
    const tagRivets = D([at([RIGHT + 0.7, tagY0 + 1.8, 32]), at([RIGHT + 0.7, tagY1 - 1.2, 35.3])], { size: 0.42 });
    // two seal straps across the lid joint, each crimped into a lead seal on the right face
    const seals = [];
    const sealShapes = [];
    for (const sy of [-45, -22]) {
      const strap = { x: RIGHT, y: sy - 1.1, w: 0.5, d: 2.2, r: 0.2 };
      const tab = { x: RIGHT - 3.5, y: sy - 1.1, w: 4, d: 2.2, r: 0.2 };
      const seal = { x: RIGHT + 0.5, y: sy - 1.9, w: 1.3, d: 3.8, r: 0.4 };
      seals.push(
        S(slab(strap, 37, TOP + 0.4 - 37, 2), { tone: "lo", crease: "none" }) +
          S(slab(tab, TOP, 0.4, 2), { tone: "lo", crease: "none" }) +
          S(slab(seal, 34.4, 3.8, 2), { tone: "mid", inner: L(k.pathOf([at([RIGHT + 1.8, sy - 1.3, 36.3]), at([RIGHT + 1.8, sy + 1.3, 36.3])]), { tone: "lo" }) }) +
          D([at([RIGHT + 1.8, sy, 37.4])], { size: 0.35, tone: "lo" }),
      );
      sealShapes.push(sSlab(strap, 37, TOP + 0.4 - 37), sSlab(tab, TOP, 0.4), sSlab(seal, 34.4, 3.8));
    }
    put("block.body", body + tag + L(tagRules, { tone: "lo", free: true }) + tagRivets, [sSlab(BODY, BODY_Z, BODY_TOP - BODY_Z), sSlab({ x: RIGHT, y: tagY0, w: 0.7, d: tagY1 - tagY0 }, 27, 10)]);
    sealItem = [seals.join(""), sealShapes];
  }
  {
    // cooling fins on the front face: one fin per transformer layer (24), the four hookpoint layers marked
    const sets = { hi: [], mid: [] };
    const shapes = [];
    for (let i = 0; i < FINS; i++) {
      const plan = { x: FIN_X(i) - 0.8, y: FRONT, w: 1.6, d: 3, r: 0 };
      sets[PORT_LAYERS.includes(i) ? "hi" : "mid"].push(slab(plan, 17, 23, 1));
      shapes.push(sSlab(plan, 17, 23));
    }
    put("block.fins", S(merge(sets.mid), { tone: "mid", crease: "none" }) + S(merge(sets.hi), { tone: "hi", crease: "none" }), shapes);
  }
  {
    // input strip: the contacts the probe presses
    const strip = { x: -121, y: FRONT, w: 130, d: 1.6, r: 0.5 };
    const pads = [];
    for (let x = strip.x + 2.5; x <= strip.x + strip.w - 2.4; x += 3.1) pads.push(at([x, STRIP_FACE, 9.5]));
    put("block.strip", S(slab(strip, 6, 7, 2), { tone: "lo", crease: "none" }) + D(pads, { size: 0.38, tone: "lo" }), [sSlab(strip, 6, 7)]);
  }
  {
    // lid and its screws
    const lid = S(slab(LID, BODY_TOP, TOP - BODY_TOP, 6, 1), { tone: "mid" });
    const screws = [[-119, 2], [-111, 2], [-53, 2], [-1, 2], [7, 2], [-119, -47], [-53, -47], [7, -47]];
    const rings = L(screws.map(([x, y]) => k.ring(x, y, 1.7, TOP, P, 14)).join(""), { tone: "lo" });
    const dots = D(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.5 });
    put("block.lid", lid + rings + dots, [sSlab(LID, BODY_TOP, TOP - BODY_TOP)]);
    put("block.seals", ...sealItem); // the strap tabs lie on the lid
  }
  {
    // hookpoint ports on the lid: layers 6, 12, 18 and 23
    const out = [];
    const shapes = [];
    for (const [x, y] of PORTS) {
      out.push(S(cyl(x, y, PORT_R, TOP, PORT_TOP - TOP, 12, 0.4), { tone: "mid" }));
      out.push(`<path class="cp-bore" d="${k.pathOf(k.circleRing(x, y, 1.9, 12).map(([u, v]) => at([u, v, PORT_TOP])), true)}"/>`);
      out.push(L(k.ring(x, y, 1.9, PORT_TOP, P, 12), { tone: "lo" }));
      shapes.push(sCyl(x, y, PORT_R, TOP, PORT_TOP - TOP));
    }
    put("block.ports", out.join(""), shapes);
  }
  {
    // output socket on the right face
    const F = G.frameAlong([RIGHT, -34, 23], [1, 0, 0]);
    const boss = S(G.disc(0, 2.4, 4.4, F, P, { steps: 20 }), { tone: "mid" });
    const face = L(G.circleOf(F, 2.4, 2.6, P), { tone: "lo" });
    const bolts = D(G.dotsOf(F, 2.4, 3.6, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.35 });
    put("block.socket", boss + face + bolts, [sDisc(F, 0, 2.4, 4.4)]);
  }

  clamp(1);

  // ============================ the patch on its yoke (driven down onto the ports by the lead screw)
  {
    const Y = Y_RAISED; // built raised; live moves it
    const plateZ = PLATE_Z;
    const plateTop = PLATE_TOP;
    // pins first (they hang below the yoke)
    const pins = [];
    const collars = [];
    const pinShapes = [];
    for (const [x, y] of PORTS) {
      pins.push(cyl(x, y, 1.3, plateZ - PIN_LEN, PIN_LEN - 1.6, 6));
      collars.push(cyl(x, y, 2.3, plateZ - 1.6, 1.6, 8));
      pinShapes.push(sCyl(x, y, 1.3, plateZ - PIN_LEN, PIN_LEN - 1.6), sCyl(x, y, 2.3, plateZ - 1.6, 1.6));
    }
    put("yoke.pins", S(merge(pins), { tone: "mid", crease: "none" }) + S(merge(collars), { tone: "mid" }), pinShapes, "yoke");
    // carriage blocks on the post rails
    for (const [index, px] of POSTS.entries()) {
      const block = { x: px - 5.5, y: RAIL_FRONT, w: 11, d: 7, r: 1 };
      put(`yoke.block${index}`, S(slab(block, Y, 10, 3, 0.4), { tone: "mid" }) + D([at([px - 3, block.y + 7, Y + 3]), at([px + 3, block.y + 7, Y + 7])], { size: 0.4 }), [sSlab(block, Y, 10)], "yoke");
    }
    // yoke plate
    const plate = { x: POSTS[0] - 6, y: RAIL_FRONT + 0.01, w: POSTS[1] - POSTS[0] + 12, d: 31, r: 2 };
    const slots = [];
    for (const [x] of PORTS) slots.push(k.planOutline({ x: x - 3.4, y: plate.y + 4, w: 6.8, d: 3, r: 1.5 }, plateTop, P, 3));
    put(
      "yoke.plate",
      `<path class="iso-halo" d="${k.haloOf(k.insetPlan(plate, 4), plateZ - 10, 0.1, P)}" style="filter:blur(3px);opacity:.35"/>` +
        S(slab(plate, plateZ, 6, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(plate, plateZ + 2.4, P, 4), { tone: "faint" }) }) +
        L(slots.join(""), { tone: "faint" }) +
        D([[plate.x + 4, plate.y + 27], [plate.x + plate.w - 4, plate.y + 27], [plate.x + 4, plate.y + 4], [plate.x + plate.w - 4, plate.y + 4]].map(([x, y]) => at([x, y, plateTop])), { size: 0.45 }),
      [sSlab(plate, plateZ, 6)],
      "yoke",
    );
    // thrust bearing on the plate, where the lead screw pushes
    const [sx, sy] = SCREW;
    put(
      "yoke.bearing",
      S(cyl(sx, sy, 3.6, plateTop, 1.2, 16), { tone: "mid" }) + D(G.dotsOf(UP(sx, sy), plateTop + 1.2, 3, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.35 }) + S(cyl(sx, sy, 2.4, plateTop + 1.2, BEARING_TOP - plateTop - 1.2, 14), { tone: "mid" }),
      [sCyl(sx, sy, 3.6, plateTop, 1.2), sCyl(sx, sy, 2.4, plateTop + 1.2, BEARING_TOP - plateTop - 1.2)],
      "yoke",
    );
    // the lead screw: out of the crown nut, down to the bearing; it slides through the nut as the yoke drops
    {
      const F = G.frameOf([sx, sy, POST_TOP], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
      const to = POST_TOP - BEARING_TOP;
      const ROD = G.rodOut(F, 0, to, 1.5, P, { stroke: YOKE_LIFT, steps: 16 });
      const threads = [];
      for (let s = -YOKE_LIFT + 0.6; s < to - 0.4; s += 1.3) threads.push(G.arcOf(F, s, 1.5, P));
      const svg = `<clipPath id="cp-screw"><path data-hold d="${ROD.clip}"/></clipPath><g clip-path="url(#cp-screw)">${S(ROD.paths, { tone: "mid", inner: L(threads.join(""), { tone: "lo" }) })}</g>`;
      put("yoke.screw", svg, [sSlide(F, 0, to, 1.5)], "yoke");
    }
    // the patch: one plate, four rank-4 taps, a gate switch
    const patch = { x: PORTS[0][0] - 16, y: -48, w: PORTS[3][0] - PORTS[0][0] + 25, d: 18, r: 1.6 };
    const patchTop = PATCH_TOP;
    const trace = PORTS.slice(0, 3).map(([x], i) => k.lineOnTop([x + 7, -39], [PORTS[i + 1][0] - 7, -39], patchTop, P)).join("");
    put(
      "yoke.patch",
      S(slab(patch, plateTop, 2.4, 3, 0.5), { tone: "hi", crease: "lo" }) + L(trace, { tone: "mid" }) + D([[patch.x + 2.4, patch.y + 2.4], [patch.x + 2.4, patch.y + patch.d - 2.4], [patch.x + patch.w - 2.4, patch.y + 2.4], [patch.x + patch.w - 2.4, patch.y + patch.d - 2.4]].map(([x, y]) => at([x, y, patchTop])), { size: 0.42 }),
      [sSlab(patch, plateTop, 2.4)],
      "yoke",
    );
    // gate switch at the left end of the patch
    {
      const gx = patch.x + 4.6;
      const base = { x: gx - 3, y: -42, w: 6, d: 7, r: 1 };
      const svg = S(slab(base, patchTop, 2.4, 2), { tone: "mid" }) + S(cyl(gx, -38.5, 1.6, patchTop + 2.4, 1, 10), { tone: "lo" }) + S(cyl(gx + 0.6, -37.8, 0.7, patchTop + 3.4, 3.6, 8), { tone: "mid", crease: "none" });
      put("yoke.gate", svg, [sSlab(base, patchTop, 2.4), sCyl(gx, -38.5, 1.6, patchTop + 2.4, 1), sCyl(gx + 0.6, -37.8, 0.7, patchTop + 3.4, 3.6)], "yoke");
    }
    // four taps: a housing, a rank-4 laminated core, and a trim knob whose pointer is re-set every round;
    // at issue a witness stripe is laid across pointer and housing, so a later nudge shows as a broken mark
    for (const [index, [x]] of PORTS.entries()) {
      const box = { x: x - 7, y: -47, w: 14, d: 16, r: 1.2 };
      const core = { x: x - 6, y: -46, w: 12, d: 3.6, r: 0.5 };
      const seams = [1, 2, 3].map((dz) => k.sideSeam(core, HOUSING_TOP + dz, P, 2)).join("");
      const ticks = k.radialTicks(x, KNOB_Y, 6.6, 8, 4, HOUSING_TOP, [0.6, 1.1], P, Math.PI / 2, Math.PI);
      // the scale line the ticks stand on, end to end between the two outer major ticks
      const scale = k.pathOf(Array.from({ length: 17 }, (_, n) => Math.PI / 2 + (n * Math.PI) / 16).map((t) => at([x + Math.sin(t) * 6.6, KNOB_Y - Math.cos(t) * 6.6, HOUSING_TOP])));
      const angle = KNOB.final[index];
      const bar = slotsOf(barPaths(index, angle));
      const barSvg = `<g class="iso-solid" data-bar="${index}">${BAR_SLOTS.map((slot, j) => {
        const cls = slot === "fill" ? "iso-fill" : slot === "top" ? "iso-top" : slot === "crease" ? "iso-line iso-crease" : slot === "outline" ? "iso-line iso-edge" : "iso-shade";
        const extra = typeof slot === "number" ? ` data-shade="${slot}"` : slot === "crease" ? ` data-tone="lo"` : slot === "outline" ? ` data-tone="hi"` : "";
        return `<path class="${cls}"${extra} d="${bar[j]}"/>`;
      }).join("")}</g>`;
      const svg =
        S(slab(box, patchTop, HOUSING_TOP - patchTop, 2), { tone: "mid" }) +
        S(slab(core, HOUSING_TOP, 4, 2), { tone: "hi", crease: "faint", inner: L(seams, { tone: "faint" }) }) +
        L(ticks.minor + scale, { tone: "lo" }) +
        L(ticks.major, { tone: "mid" }) +
        `<path class="iso-line cp-stripe" data-tone="hi" data-free="" data-witness="${index}" d="${bodyStripe(index, angle)}"/>` +
        S(cyl(x, KNOB_Y, KNOB_R, HOUSING_TOP, BAR_Z - HOUSING_TOP, 12), { tone: "mid", inner: L(k.knurl(x, KNOB_Y, KNOB_R, HOUSING_TOP + 0.15, BAR_Z - 0.15, 12, P, 0.3), { tone: "lo" }) }) +
        barSvg +
        `<path class="iso-line cp-stripe" data-tone="hi" data-free="" data-stripe="${index}" d="${barStripe(index, angle)}"/>` +
        D([at([x, KNOB_Y, BAR_TOP])], { size: 0.45, tone: "lo" });
      put(
        `yoke.tap${index}`,
        svg,
        (pose) => [sSlab(box, patchTop, HOUSING_TOP - patchTop), sSlab(core, HOUSING_TOP, 4), sCyl(x, KNOB_Y, KNOB_R, HOUSING_TOP, BAR_Z - HOUSING_TOP), sPrism(barRing(index, pose ? pose.trim[index] : angle), BAR_Z, BAR_TOP - BAR_Z)],
        "yoke",
      );
    }
    // handle on the yoke front edge
    {
      const hx = -40;
      const y0 = plate.y + plate.d;
      const posts = [hx - 8, hx + 8].map((px) => ({ x: px - 1.5, y: y0, w: 3, d: 4, r: 0.8 }));
      const bar = { x: hx - 10, y: y0 + 4, w: 20, d: 3, r: 1.4 };
      const svg = S(merge(posts.map((p) => slab(p, plateZ + 1.5, 3, 2))), { tone: "mid" }) + S(slab(bar, plateZ + 1, 4, 3, 0.3), { tone: "mid" });
      put("yoke.handle", svg, [...posts.map((p) => sSlab(p, plateZ + 1.5, 3)), sSlab(bar, plateZ + 1, 4)], "yoke");
    }
  }

  // the drive on the crown: a nose block carrying the nut, the handwheel that turns it, and the screw's cover tube
  {
    const [sx, sy] = SCREW;
    const nose = { x: sx - 9, y: POST_Y + 6.5, w: 18, d: 12.5, r: 1.2 };
    const bossTop = CROWN_TOP + 3;
    const hubTop = WHEEL.z + WHEEL.h + 1.2;
    const F = UP(sx, sy);
    const svg =
      S(slab(nose, POST_TOP, 7, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(nose, POST_TOP + 3.5, P, 3), { tone: "faint" }) }) +
      D([at([nose.x + 2.4, nose.y + nose.d - 2.4, CROWN_TOP]), at([nose.x + nose.w - 2.4, nose.y + nose.d - 2.4, CROWN_TOP])], { size: 0.45 }) +
      S(cyl(sx, sy, 5.5, CROWN_TOP, 3, 16, 0.4), { tone: "mid" }) +
      D(G.dotsOf(F, bossTop, 4.4, 6, P, { all: true, phase: 0.3 }), { size: 0.35 }) +
      S(G.ringBand(WHEEL.z, WHEEL.z + WHEEL.h, WHEEL.rIn, WHEEL.rOut, F, P, { steps: 32, hole: [WHEEL.z + WHEEL.h, WHEEL.rIn] }), { tone: "mid", inner: L(G.arcOf(F, WHEEL.z + WHEEL.h / 2, WHEEL.rOut, P), { tone: "faint" }) }) +
      `<path class="iso-line" data-tone="mid" data-spokes="" style="stroke-width:1.5px" d="${spokesAt(wheelAngle(1))}"/>` +
      S(cyl(sx, sy, WHEEL.hub, bossTop, hubTop - bossTop, 12, 0.3), { tone: "mid" }) +
      S(cyl(sx, sy, 1.8, hubTop, 5, 10), { tone: "mid" }) +
      D([at([sx, sy, hubTop + 5])], { size: 0.45, tone: "lo" });
    const fixed = [sSlab(nose, POST_TOP, 7), sCyl(sx, sy, 5.5, CROWN_TOP, 3), sRing(F, WHEEL.z, WHEEL.z + WHEEL.h, WHEEL.rIn, WHEEL.rOut), sCyl(sx, sy, WHEEL.hub, bossTop, hubTop - bossTop), sCyl(sx, sy, 1.8, hubTop, 5)];
    // three spokes join hub and rim, flush with the rim's top
    const spokes = (angle) =>
      [0, 1, 2].map((n) => {
        const b = angle + (n * 2 * Math.PI) / 3;
        const d = [Math.sin(b), -Math.cos(b), 0];
        const mid = (WHEEL.hub + WHEEL.rIn) / 2;
        return ["obox", [sx + d[0] * mid, sy + d[1] * mid, WHEEL.z + WHEEL.h - 0.4], [d, [-d[1], d[0], 0], [0, 0, 1]], [(WHEEL.rIn - WHEEL.hub) / 2 + 0.1, 0.4, 0.4]];
      });
    put("press.drive", svg, (pose) => [...fixed, ...spokes(wheelAngle(pose ? pose.yoke : 1))]);
  }

  // ============================ probe rail and carriage
  {
    const stop = { x: RAIL.x - 6, y: 22, w: 6, d: 15, r: 1.2 };
    put("probe.stopL", S(slab(stop, 0, 10, 3, 0.5), { tone: "mid" }) + D([at([stop.x + 3, 25, 10]), at([stop.x + 3, 34, 10])], { size: 0.45 }), [sSlab(stop, 0, 10)]);
    const svg =
      S(slab(RAIL, 0, RAIL_H, 3, 0.5), { tone: "mid" }) +
      L(k.lineOnTop([RAIL.x, RAIL.y + RAIL.d / 2], [RAIL.x + RAIL.w, RAIL.y + RAIL.d / 2], RAIL_H, P), { tone: "faint" }) +
      D([RAIL.x + 8, RAIL.x + 72, RAIL.x + RAIL.w - 8].map((x) => at([x, RAIL.y + 1.8, RAIL_H])), { size: 0.4 });
    put("probe.rail", svg, [sSlab(RAIL, 0, RAIL_H)]);
  }
  {
    // ruler strip: 10,000 prompts, a minor tick per 200, a major per 1,000
    const strip = { x: -126, y: 35, w: 140, d: 4.6, r: 0.8 };
    const x0 = -122;
    const span = 132;
    const minor = [];
    const major = [];
    for (let i = 0; i <= 50; i++) {
      const x = x0 + (span * i) / 50;
      (i % 5 === 0 ? major : minor).push(k.lineOnTop([x, strip.y + 0.01], [x, strip.y + (i % 5 === 0 ? 3.2 : 1.7)], 0.6, P));
    }
    const svg = S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }) + L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) + D([at([strip.x + 1.8, strip.y + 2.3, 0.6]), at([strip.x + strip.w - 1.8, strip.y + 2.3, 0.6])], { size: 0.4 });
    put("probe.ruler", svg, [sSlab(strip, 0, 0.6)]);
  }
  {
    // the carriage, built at the left stop
    const cx = PROBE_HOME;
    const car = { x: cx - 9, y: 22, w: 18, d: 15, r: 2 };
    const carTop = RAIL_H + 7;
    const head = { x: cx - 5, y: 17.4, w: 10, d: 7.2, r: 1.2 };
    const headTop = 17;
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(car, 2), RAIL_H, 0.1, P)}" style="filter:blur(3px);opacity:.5"/>`];
    const shapes = [];
    // pin: barrel, spring, plunger (pointing back at the block)
    const F = G.frameAlong([cx, head.y, PIN_Z], [0, -1, 0]);
    const reach = head.y - STRIP_FACE;
    out.push(S(G.solidOf([[0, 2.1], [3.2, 2.1], [3.2, 1.5], [4.2, 1.5]], F, P, { steps: 16 }), { tone: "mid" }));
    const spring = k.coil(head.y - 4.2, head.y - 6.8, [cx, PIN_Z], 1.25, 3.5, "y", P);
    out.push(L(spring.back, { tone: "lo" }));
    out.push(S(G.solidOf([[4.2, 0.75], [reach - 0.9, 0.75], [reach, 0.25]], F, P, { steps: 12 }), { tone: "mid", crease: "none" }));
    out.push(L(spring.front, { tone: "mid" }));
    shapes.push(sDisc(F, 0, 4.2, 2.1), sDisc(F, 4.2, reach, 0.75));
    out.push(S(slab(car, RAIL_H, 7, 4, 0.6), { tone: "mid" }));
    out.push(D([[car.x + 2.5, car.y + 2.5], [car.x + car.w - 2.5, car.y + 2.5], [car.x + 2.5, car.y + car.d - 2.5], [car.x + car.w - 2.5, car.y + car.d - 2.5]].map(([x, y]) => at([x, y, carTop])), { size: 0.42 }));
    out.push(S(slab(head, carTop, headTop - carTop, 3, 0.5), { tone: "mid" }));
    shapes.push(sSlab(car, RAIL_H, 7), sSlab(head, carTop, headTop - carTop));
    // index pointer on the carriage front edge, over the ruler
    out.push(L(k.lineOnTop([cx, car.y + car.d - 0.01], [cx, car.y + car.d - 3.6], carTop, P), { tone: "hi" }));
    // thumb knob on the front face
    const KF = G.frameAlong([cx + 4.5, car.y + car.d, RAIL_H + 3.5], [0, 1, 0]);
    out.push(S(G.disc(0, 3, 2.5, KF, P, { steps: 16 }), { tone: "mid" }));
    out.push(G.ribsOf(KF, 0, 3, 2.5, 12, P, { fade: [0.1, 0.55] }).map(({ d, alpha }) => `<path class="iso-line" data-tone="lo" d="${d}" opacity="${alpha.toFixed(2)}"/>`).join(""));
    shapes.push(sDisc(KF, 0, 3, 2.5));
    put("probe.carriage", out.join(""), shapes, "probe");
    // counterexample lamp on the head
    const lamp = S(cyl(cx, head.y + 3.6, 2.4, headTop, 0.9, 14), { tone: "mid" }) + `<g data-lamp="probe">${S(cyl(cx, head.y + 3.6, 1.6, headTop + 0.9, 1.1, 12), { tone: "mid", crease: "none", className: "cp-lens" })}</g>`;
    put("probe.lamp", lamp, [sCyl(cx, head.y + 3.6, 2.4, headTop, 0.9), sCyl(cx, head.y + 3.6, 1.6, headTop + 0.9, 1.1)], "probe");
  }
  {
    const stop = { x: RAIL.x + RAIL.w, y: 22, w: 6, d: 15, r: 1.2 };
    put("probe.stopR", S(slab(stop, 0, 10, 3, 0.5), { tone: "mid" }) + D([at([stop.x + 3, 25, 10]), at([stop.x + 3, 34, 10])], { size: 0.45 }), [sSlab(stop, 0, 10)]);
  }

  // a blank card: the same look as the moving card before it is punched
  const cardOf = (plan, z, holes) => {
    const corner = `<path class="iso-line cp-corner" data-tone="lo" d="${k.lineOnTop([plan.x + plan.w - 4, plan.y], [plan.x + plan.w, plan.y + 4], z + 0.4, P)}"/>`;
    return S(slab(plan, z, 0.4, 2), { tone: "lo", crease: "none", inner: corner }) + (holes || "");
  };
  const holesOf = (plan, z, rows) => {
    const out = [];
    for (let r = 0; r < CARD_ROWS; r++) {
      const holes = [];
      for (let col = 0; col < CARD_COLS; col++) {
        if (!HOLES[r][col]) continue;
        const hx = plan.x + 3 + col * ((plan.w - 6) / (CARD_COLS - 1));
        const hy = plan.y + plan.d - 6 - r * ROW_PITCH;
        holes.push(k.planOutline({ x: hx - 0.9, y: hy - 1.4, w: 1.8, d: 2.8, r: 0.5 }, z + 0.4, P, 2));
      }
      out.push(rows ? `<g data-row="${r}"><path class="cp-hole" d="${holes.join("")}"/></g>` : holes.join(""));
    }
    return rows ? out.join("") : `<path class="cp-hole" d="${out.join("")}"/>`;
  };

  {
    // magazine of blank cards beside the unit: a pedestal at deck height, back and side guides, the stack
    const out = [`<path class="iso-halo" d="${k.haloOf(HOPPER, 0, 6, P)}"/>`];
    out.push(S(slab(HOPPER, 0, STACK_Z, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(HOPPER, 4, P, 4), { tone: "faint" }) }));
    out.push(D(k.corners(HOPPER, 2.2).map(([x, y]) => at([x, y, STACK_Z])).slice(1), { size: 0.42 }));
    const guides = [
      { x: 47, y: HOPPER.y, w: 2, d: 1.4, r: 0.3 },
      { x: 64, y: HOPPER.y, w: 2, d: 1.4, r: 0.3 },
      { x: HOPPER.x, y: -69, w: 1.4, d: 2, r: 0.3 },
      { x: HOPPER.x, y: -49, w: 1.4, d: 2, r: 0.3 },
    ];
    out.push(S(merge(guides.map((g) => slab(g, STACK_Z, 4.2, 2))), { tone: "mid" }));
    const blank = { ...CARD, x: CARD.x - FEED };
    out.push(S(slab(blank, STACK_Z, 0.8, 2), { tone: "lo", crease: "none", inner: L(k.sideSeam(blank, STACK_Z + 0.4, P, 2), { tone: "faint" }) }));
    out.push(cardOf(blank, DECK));
    put("unit.stock", out.join(""), [sSlab(HOPPER, 0, STACK_Z), ...guides.map((g) => sSlab(g, STACK_Z, 4.2)), sSlab(blank, STACK_Z, 0.8)]);
  }

  // ============================ gauge: failures over the certified scope
  {
    const [x, y] = DIAL;
    const base = { x: x - 11, y: y - 11, w: 22, d: 22, r: 2.4 };
    // cable gland on the base's right face, with an elbow so the cable turns inside the fitting
    const GF = G.frameAlong([base.x + base.w, 26, 2.6], [1, 0, 0]);
    const GLAND = 1.65;
    const elbow = [base.x + base.w + GLAND + 1.6 - 0.45, 26, 2.6]; // the elbow nut sits 0.45 onto the gland
    const svg =
      `<path class="iso-halo" d="${k.haloOf(base, 0, 4, P)}"/>` +
      S(slab(base, 0, 5, 4, 0.6), { tone: "mid" }) +
      D(k.corners(base, 3).map(([px, py]) => at([px, py, 5])), { size: 0.45 }) +
      S(cyl(x, y, 4, 5, 3, 14), { tone: "mid" }) +
      S(cyl(x, y, 2.6, 8, DIAL_Z - 8, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 2.6, 18, P, 12), { tone: "faint" }) });
    put("gauge.stand", svg, [sSlab(base, 0, 5), sCyl(x, y, 4, 5, 3), sCyl(x, y, 2.6, 8, DIAL_Z - 8)]);
    // the gland is nearer than the cable's last run, so it is drawn after it (build.mjs splices the cable in after the stand)
    put("gauge.gland", S(G.disc(0, GLAND, 1.5, GF, P, { steps: 10 }), { tone: "mid" }) + S(G.sphereOf(elbow, 1.6, P, { steps: 12 }), { tone: "mid" }), [sDisc(GF, 0, GLAND, 1.5), sBall(elbow, 1.6)]);
    // cable: block output socket -> gauge gland; out of the socket, down to the bench clear of the clamp,
    // across the bench, along the base's right side and into the elbow from behind
    const start = [RIGHT + 2.4, -34, 23];
    const end = [elbow[0], elbow[1] - 1.6 + 0.07, elbow[2]]; // square into the nut, just inside its skin
    const route = G.fillet([start, [25, -34, 23], [32, -34, 0.7], [50, -26, 0.7], [elbow[0], -12, 0.7], [elbow[0], 8, 0.7], [elbow[0], 15, elbow[2]], end], 4, 6, { P, tube: 0.7 });
    routes.push({ name: "cable.gauge", points: route, r: 0.7 });

    const ticks = k.radialTicks(x, y, DIAL_R - 2.6, GAUGE.ticks, 5, DIAL_TOP, [1.1, 2.3], P, GAUGE.from, GAUGE.span);
    const zeroA = GAUGE.from;
    const zero = k.lineOnTop([x + Math.sin(zeroA) * (DIAL_R - 5.6), y - Math.cos(zeroA) * (DIAL_R - 5.6)], [x + Math.sin(zeroA) * (DIAL_R - 2.6), y - Math.cos(zeroA) * (DIAL_R - 2.6)], DIAL_TOP, P);
    // the rest stop: a pin well below zero, so a reading of 0 is clearly a reading
    const pinA = GAUGE.rest - 0.13;
    const pinAt = [x + Math.sin(pinA) * (DIAL_R - 4.4), y - Math.cos(pinA) * (DIAL_R - 4.4)];
    const crown = { x: x + DIAL_R - 0.3, y: y - 2.2, w: 3.4, d: 4.4, r: 1.1 };
    const dial =
      S(cyl(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, 32, 0.8), { tone: "mid", crease: "lo" }) +
      L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 36, P, 0.3), { tone: "lo" }) +
      L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 32), { tone: "faint" }) +
      L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 32), { tone: "lo" }) +
      L(ticks.minor, { tone: "lo" }) +
      L(ticks.major, { tone: "mid" }) +
      L(zero, { tone: "hi" }) +
      S(slab(crown, DIAL_Z + 2, 4, 2), { tone: "mid" });
    put("gauge.dial", dial, [sCyl(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z), sSlab(crown, DIAL_Z + 2, 4)]);
    const a = GAUGE.rest;
    const tail = 2.8;
    const tip = DIAL_R - 2.2;
    const needleShape = (pose) => {
      const b = pose ? pose.needle : a;
      const d = [Math.sin(b), -Math.cos(b), 0];
      return ["obox", [x + (d[0] * (tip - tail)) / 2, y + (d[1] * (tip - tail)) / 2, DIAL_TOP + 0.2], [d, [-d[1], d[0], 0], [0, 0, 1]], [(tip + tail) / 2, 0.25, 0.1]];
    };
    put("gauge.needle", `<path class="iso-line" data-tone="hi" data-part="needle" data-free="start" style="stroke-width:1.1px" d="${needleAt(GAUGE.rest)}"/>` + L(k.ring(x, y, 1.3, DIAL_TOP + 0.2, P, 14), { tone: "mid" }), (pose) => [sCyl(x, y, 1.3, DIAL_TOP, 0.2), needleShape(pose)]);
    // the rest stop stands taller than the needle and on its near side, so it is drawn after it
    put("gauge.stop", S(cyl(pinAt[0], pinAt[1], 0.55, DIAL_TOP, 1, 8), { tone: "mid", crease: "none" }), [sCyl(pinAt[0], pinAt[1], 0.55, DIAL_TOP, 1)]);
  }

  // ============================ certificate unit: feed table, punch, track, reader with its stacker and lamps
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(UNIT, 0, 6, P)}"/>`];
    out.push(S(slab(UNIT, 0, UNIT_Z, 4, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(UNIT, 3), UNIT_Z, P, 4), { tone: "faint" }));
    out.push(D(k.corners(UNIT, 5).map(([x, y]) => at([x, y, UNIT_Z])), { size: 0.45 }));
    put("unit.base", out.join(""), [sSlab(UNIT, 0, UNIT_Z)]);
    // feed table between the magazine and the track, flush with the deck
    const table = { x: UNIT.x, y: HOPPER.y, w: TRACK_X[0] - 1.5 - UNIT.x, d: HOPPER.d, r: 0.6 };
    put("unit.table", S(slab(table, UNIT_Z, DECK - UNIT_Z, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(table, 8.5, P, 2), { tone: "faint" }) }) + D([at([table.x + 3, table.y + 3, DECK]), at([table.x + table.w - 3, table.y + table.d - 3, DECK])], { size: 0.42 }), [sSlab(table, UNIT_Z, DECK - UNIT_Z)]);
  }
  {
    // track rails the card rides on, with the die bed between them under the punch
    const railOf = (x) => {
      const plan = { x: x - 1.5, y: -79, w: 3, d: 77, r: 0.6 };
      return [S(slab(plan, UNIT_Z, DECK - UNIT_Z, 2, 0.3), { tone: "mid" }) + D([at([x, -76, DECK]), at([x, -30, DECK]), at([x, -6, DECK])], { size: 0.38 }), [sSlab(plan, UNIT_Z, DECK - UNIT_Z)]];
    };
    put("unit.track0", ...railOf(TRACK_X[0]));
    const die = { x: TRACK_X[0] + 1.7, y: -53, w: TRACK_X[1] - TRACK_X[0] - 3.4, d: 18, r: 0.6 };
    const dieHoles = [];
    for (let col = 0; col < CARD_COLS; col++) dieHoles.push(k.planOutline({ x: colX(col) - 0.9, y: PUNCH_Y - 1.4, w: 1.8, d: 2.8, r: 0.5 }, DECK, P, 2));
    put("unit.die", S(slab(die, UNIT_Z, DECK - UNIT_Z, 2, 0.3), { tone: "lo" }) + `<path class="cp-bore" d="${dieHoles.join("")}" style="opacity:.6"/>`, [sSlab(die, UNIT_Z, DECK - UNIT_Z)]);
    put("unit.track1", ...railOf(TRACK_X[1]));
    // reader bed with the stacker pit under the reading deck; recorded as the frame round the pit
    const bed = READER;
    const frame = [
      { x: bed.x, y: bed.y, w: bed.w, d: PIT.y - bed.y, r: 0 },
      { x: bed.x, y: PIT.y + PIT.d, w: bed.w, d: bed.y + bed.d - PIT.y - PIT.d, r: 0 },
      { x: bed.x, y: PIT.y, w: PIT.x - bed.x, d: PIT.d, r: 0 },
      { x: PIT.x + PIT.w, y: PIT.y, w: bed.x + bed.w - PIT.x - PIT.w, d: PIT.d, r: 0 },
    ];
    // the two side walls carry slots at the top for the drop ledges
    const slotted = (plan, side) => [sSlab(plan, UNIT_Z, DECK - UNIT_Z - 0.7), sSlab(side < 0 ? { ...plan, w: plan.w - 2 } : { ...plan, x: plan.x + 2, w: plan.w - 2 }, DECK - 0.7, 0.7)];
    put(
      "unit.reader",
      S(slab(bed, UNIT_Z, DECK - UNIT_Z, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(bed, 7, P, 4), { tone: "faint" }) }) +
        D([[bed.x + 4, bed.y + bed.d - 3], [bed.x + bed.w - 4, bed.y + bed.d - 3]].map(([x, y]) => at([x, y, DECK])), { size: 0.45 }),
      [sSlab(frame[0], UNIT_Z, DECK - UNIT_Z), sSlab(frame[1], UNIT_Z, DECK - UNIT_Z), ...slotted(frame[2], -1), ...slotted(frame[3], 1)],
    );
    // inside the pit: its floor, the two far walls, and the filed certificates (the top one shows its holes)
    const corners = [[PIT.x, PIT.y], [PIT.x + PIT.w, PIT.y], [PIT.x + PIT.w, PIT.y + PIT.d], [PIT.x, PIT.y + PIT.d]];
    const clip = `<clipPath id="cp-pit"><path d="${k.pathOf(corners.map(([x, y]) => at([x, y, DECK])), true)}"/></clipPath>`;
    const filed = { ...CARD, y: CARD.y + CARD_TRAVEL };
    const inside =
      poly(corners.map(([x, y]) => [x, y, UNIT_Z]), "cp-bore") +
      poly([[PIT.x, PIT.y, DECK], [PIT.x + PIT.w, PIT.y, DECK], [PIT.x + PIT.w, PIT.y, UNIT_Z], [PIT.x, PIT.y, UNIT_Z]], "iso-shade cp-wall", ' data-shade="3"') +
      poly([[PIT.x, PIT.y, DECK], [PIT.x, PIT.y + PIT.d, DECK], [PIT.x, PIT.y + PIT.d, UNIT_Z], [PIT.x, PIT.y, UNIT_Z]], "iso-shade cp-wall", ' data-shade="0"') +
      L(k.pathOf([at([PIT.x, PIT.y, DECK]), at([PIT.x, PIT.y, UNIT_Z])]), { tone: "lo" }) +
      cardOf(filed, UNIT_Z) +
      cardOf(filed, UNIT_Z + 0.4, holesOf(filed, UNIT_Z + 0.4, false));
    put("unit.pit", `${clip}<g clip-path="url(#cp-pit)">${inside}</g>`, [sSlab(filed, UNIT_Z, 0.4)]);
    // the drop ledges the card rests on; they draw back into the walls to let it fall
    const ledgeL = { x: PIT.x, y: PIT.y + 1.5, w: 1.6, d: PIT.d - 3, r: 0.3 };
    const ledgeR = { x: PIT.x + PIT.w - 1.6, y: PIT.y + 1.5, w: 1.6, d: PIT.d - 3, r: 0.3 };
    put("unit.ledgeL", S(slab(ledgeL, DECK - 0.7, 0.7, 2), { tone: "lo", crease: "none" }), [sSlab(ledgeL, DECK - 0.7, 0.7)], "ledgeL", 'clip-path="url(#cp-pit)"');
    put("unit.ledgeR", S(slab(ledgeR, DECK - 0.7, 0.7, 2), { tone: "lo", crease: "none" }), [sSlab(ledgeR, DECK - 0.7, 0.7)], "ledgeR", 'clip-path="url(#cp-pit)"');
    // lamps on the reader's front face: four replay checks, then the verdict
    const bezels = [];
    const lenses = [];
    const lampShapes = [];
    const front = bed.y + bed.d;
    LAMP_IDS.forEach((id, i) => {
      const big = id === "verdict";
      const r = big ? 2.5 : 1.8;
      const x = big ? bed.x + bed.w - 8 : bed.x + 8 + i * 8.4;
      const F = G.frameAlong([x, front, (UNIT_Z + DECK) / 2], [0, 1, 0]);
      bezels.push(G.disc(0, 0.6, r + 0.9, F, P, { steps: 8 }));
      lenses.push(`<g data-lamp="${id}">${S(G.disc(0.6, 1.3, r, F, P, { steps: 8 }), { tone: "mid", crease: "none", className: "cp-lens" })}</g>`);
      lampShapes.push(sDisc(F, 0, 0.6, r + 0.9), sDisc(F, 0.6, 1.3, r));
    });
    put("unit.lamps", S(merge(bezels), { tone: "lo" }) + lenses.join(""), lampShapes);
    // bridge rails on the bed sides
    const brShapes = [];
    const brRails = [bed.x + 2, bed.x + bed.w - 5].map((x) => {
      const plan = { x, y: bed.y + 3, w: 3, d: bed.d - 6, r: 0.6 };
      brShapes.push(sSlab(plan, DECK, 1.4));
      return S(slab(plan, DECK, 1.4, 2), { tone: "lo", crease: "none" }) + D([at([x + 1.5, plan.y + plan.d - 2, DECK + 1.4])], { size: 0.35, tone: "lo" });
    });
    put("unit.bridgeRails", brRails.join(""), brShapes);
  }
  {
    // the certificate card, built at home on the track; a row of holes appears per punch stroke
    const c = CARD;
    const corner = `<path class="iso-line cp-corner" data-tone="lo" d="${k.lineOnTop([c.x + c.w - 4, c.y], [c.x + c.w, c.y + 4], DECK + 0.4, P)}"/>`;
    const svg = S(slab(c, DECK, 0.4, 2), { tone: "lo", lit: true, crease: "none", inner: corner, className: "cp-card" }) + holesOf(c, DECK, true);
    put("card", svg, [sSlab(c, DECK, 0.4)], "card", "data-cardclip");
  }
  {
    // the punch: hand lever, guide head, eight punches (each rides the ram only when its hole is set), ram, column, arm
    const arm = { x: 88, y: -55, w: 52, d: 9, r: 1.6 };
    const LF = G.frameAlong([arm.x, -50.5, DECK + 18.5], [-1, 0, 0]);
    const stem = { x: arm.x - 4, y: -51.5, w: 2, d: 2, r: 0.5 };
    const ballAt = [arm.x - 3, -50.5, DECK + 30.5];
    put(
      "unit.lever",
      S(slab(stem, DECK + 18.5, 10, 2), { tone: "mid" }) + S(G.sphereOf(ballAt, 2.2, P, { steps: 20 }), { tone: "mid" }) + S(G.disc(0, 2, 3, LF, P, { steps: 14 }), { tone: "mid" }),
      [sSlab(stem, DECK + 18.5, 10), sBall(ballAt, 2.2), sDisc(LF, 0, 2, 3)],
    );
    const head = { x: 92, y: -56, w: 32, d: 9, r: 1.2 };
    const PUNCH_LEN = 4; // long enough that the comb shows under the ram's face
    put("unit.head", S(slab(head, DECK + 7, 8, 3, 0.5), { tone: "mid" }) + D([at([head.x + 3, head.y + head.d, DECK + 12]), at([head.x + head.w - 3, head.y + head.d, DECK + 12])], { size: 0.42 }), [sSlab(head, DECK + 7, 8)]);
    for (let col = 0; col < CARD_COLS; col++) put(`unit.pin${col}`, S(cyl(colX(col), PUNCH_Y, 0.6, DECK + 1.6, PUNCH_LEN, 6), { tone: "mid", crease: "none" }), [sOwned(sCyl(colX(col), PUNCH_Y, 0.6, DECK + 1.6, PUNCH_LEN), "unit.ram")], `pin${col}`);
    const ram = { x: 93.5, y: PUNCH_Y - 3, w: 29, d: 6, r: 0.8 };
    const ramZ = DECK + 1.6 + PUNCH_LEN;
    const ramH = DECK + 14 - ramZ;
    const face = ram.y + ram.d;
    put(
      "unit.ram",
      S(slab(ram, ramZ, ramH, 2, 0.4), { tone: "mid", inner: L(k.pathOf([at([ram.x + 0.6, face, ramZ + 3]), at([ram.x + ram.w - 0.6, face, ramZ + 3])]), { tone: "faint" }) }) + D([at([ram.x + 3, face, ramZ + ramH - 2.4]), at([ram.x + ram.w - 3, face, ramZ + ramH - 2.4])], { size: 0.42 }),
      [sSlab(ram, ramZ, ramH)],
      "ram",
    );
    const column = { x: 129, y: -56, w: 11, d: 14, r: 1.4 };
    put("unit.column", S(slab(column, UNIT_Z, DECK + 15 - UNIT_Z, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(column, 14, P, 3), { tone: "faint" }) }), [sSlab(column, UNIT_Z, DECK + 15 - UNIT_Z)]);
    put(
      "unit.punch",
      S(slab(arm, DECK + 15, 7, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(arm, DECK + 18.5, P, 4), { tone: "faint" }) }) + D([at([arm.x + 4, -50.5, DECK + 22]), at([arm.x + arm.w - 6, -50.5, DECK + 22])], { size: 0.45 }),
      [sSlab(arm, DECK + 15, 7)],
    );
  }
  {
    // the read bridge: parked at the back of the bed, sweeps the card toward the front
    const y = READ.home;
    const ends = [READER.x + 1.5, READER.x + READER.w - 5.5].map((x) => ({ x, y: y - 3, w: 4, d: 6, r: 0.8 }));
    const beam = { x: READER.x + 5.5, y: y - 2.5, w: READER.w - 11, d: 5, r: 1 };
    const fingers = [];
    const fingerShapes = [];
    for (let col = 0; col < CARD_COLS; col++) {
      fingers.push(cyl(colX(col), y, 0.55, DECK + 1.4, 6.6, 6));
      fingerShapes.push(sCyl(colX(col), y, 0.55, DECK + 1.4, 6.6));
    }
    const svg = S(merge(fingers), { tone: "mid", crease: "none" }) + ends.map((e) => S(slab(e, DECK + 1.4, 12.6, 2, 0.3), { tone: "mid" })).join("") + S(slab(beam, DECK + 8, 5, 3, 0.5), { tone: "mid" }) + D([at([beam.x + 4, y, DECK + 13]), at([beam.x + beam.w - 4, y, DECK + 13])], { size: 0.42 });
    put("unit.bridge", svg, [...ends.map((e) => sSlab(e, DECK + 1.4, 12.6)), sSlab(beam, DECK + 8, 5), ...fingerShapes], "bridge");
  }

  return { items, routes };
}

// cable pieces, depth-sorted into the item list by build.mjs / art.mjs
export function cablePieces(route) {
  return tubePieces(route.points, route.r, P, { maxLength: 14 }).map((piece) => ({ piece, svg: tubeSvg(piece, { tone: "mid" }) }));
}
export { DECK, UNIT_Z, PIT, DROP, CARD_TRAVEL };
