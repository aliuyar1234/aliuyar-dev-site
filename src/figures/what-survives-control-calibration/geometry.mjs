// Fig 15 geometry: every part of the height-gauge bench, built once at the home pose
// (gauge over the frontier stack, scriber on its top, riser down). Pure ESM: art.mjs runs it inside Astro.
// Each item carries its svg, the part that moves it, and the true shapes the build's audit checks.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as M from "./model.mjs";
import { P, GX0, H0, pointerAt } from "./view.mjs";

export { P, WIDTH, HEIGHT, offsetOf } from "./view.mjs";

const { PLATE, PLATE_H, GY, ARM_DX, COL, FRONTIER_X: FX, CANDIDATE_X: CX, STACK_Y: SY, BLOCK, BASE_TOP, STRUCT_H, RES_H, RISER_Z, CASE, CASE_H, LID_H, SLOT, SELECT, KNOB, DETENT, RISER } = M;

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const face = (points) => k.pathOf(points.map(at), true); // a closed outline on any face
const seg = (a, b) => k.segment(a, b, P);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const frameZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const frameY = (x, y, z) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const frameX = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const screw = (x, y, z, r = 1.5) => L(k.ring(x, y, r, z, P, 12), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });

// slider spans at scriber height h: the slider body and, below it, the fine-adjust clamp
export const sliderSpan = (h) => [h - 5, h + 24];
export const clampSpan = (h) => [h - 18, h - 10];
export const VZ = 5; // vernier zero line above the scriber's contact face

// descriptors the build turns into audit shapes
const dSlab = (plan, z, h, meta) => ["slab", plan, z, h, meta];
const dCyl = (x, y, r, z, h, meta) => ["cyl", x, y, r, z, h, meta];
const dDisc = (F, s0, s1, r, meta) => ["disc", F, s0, s1, r, meta];
const dRing = (F, s0, s1, a, b, meta) => ["ring", F, s0, s1, a, b, meta];
const dPrism = (F, poly, s0, s1, meta) => ["prism", F, poly, s0, s1, meta];
const dExt = (ring, z, h, meta) => ["ext", ring, z, h, meta];
const dSlide = (F, from, to, r, meta) => ["slide", F, from, to, r, meta];
const owned = (list, owner) => list.map((d) => [...d.slice(0, -1), { ...(d[d.length - 1] || {}), owner }]);

// a knurled thumb screw on a vertical face, axis along +y: neck, knurled head, end ring
function thumbY(x, y, z, r, len) {
  const F = frameY(x, y, z);
  const neck = S(G.disc(0, 0.9, r * 0.55, F, P), { tone: "mid" });
  const head = G.disc(0.9, len, r, F, P);
  const ribs = G.ribsOf(F, 0.9, len, r, 16, P, { fade: [0.1, 0.5] });
  const svg = neck + S(head, { tone: "mid", inner: k.fadedSvg(ribs, { tone: "lo" }) }) + L(G.circleOf(F, len, r * 0.45, P, 16), { tone: "faint" });
  return { svg, shapes: [dDisc(F, 0, 0.9, r * 0.55), dDisc(F, 0.9, len, r)] };
}

// one gauge block: lapped faces, an engraved size field on its front face and a serial field on its side
function gaugeBlock(cx, cy, z, h, style) {
  const plan = { x: cx - BLOCK.w / 2, y: cy - BLOCK.d / 2, w: BLOCK.w, d: BLOCK.d, r: 0.5 };
  const yf = cy + BLOCK.d / 2;
  const field = face([[cx - 4.2, yf, z + h - 5.8], [cx + 1.6, yf, z + h - 5.8], [cx + 1.6, yf, z + h - 3.2], [cx - 4.2, yf, z + h - 3.2]]);
  const xf = cx + BLOCK.w / 2;
  const side = face([[xf, cy - 2.4, z + 2.2], [xf, cy + 2.4, z + 2.2], [xf, cy + 2.4, z + 4.2], [xf, cy - 2.4, z + 4.2]]);
  const svg = S(slab(plan, z, h, 2, 0.5), { ...style, inner: L(field + side, { tone: "faint" }) }) + L(k.planOutline(k.insetPlan(plan, 1.6), z + h, P, 2), { tone: "faint" });
  return { svg, shapes: [dSlab(plan, z, h)] };
}

export function build() {
  const items = [];
  const put = (name, svg, shapes, extra = {}) => items.push({ name, svg, shapes, move: "", ...extra });

  // ============================ stand: steel frame on four levelling feet, under the granite
  const FR = { x: PLATE.x + 4, y: PLATE.y + 4, w: PLATE.w - 8, d: PLATE.d - 8 }; // small overhang: the front and right beams show under the slab
  const beams = [
    { name: "stand.beam-back", plan: { x: FR.x, y: FR.y, w: FR.w, d: 9, r: 0.8 } },
    { name: "stand.beam-left", plan: { x: FR.x, y: FR.y + 9, w: 9, d: FR.d - 18, r: 0.8 } },
    { name: "stand.beam-right", plan: { x: FR.x + FR.w - 9, y: FR.y + 9, w: 9, d: FR.d - 18, r: 0.8 } },
    { name: "stand.beam-front", plan: { x: FR.x, y: FR.y + FR.d - 9, w: FR.w, d: 9, r: 0.8 } },
  ];
  const [z0, z1] = M.BEAM_Z;
  const feet = byDepth([
    [FR.x + 4.5, FR.y + 4.5],
    [FR.x + FR.w - 4.5, FR.y + 4.5],
    [FR.x + 4.5, FR.y + FR.d - 4.5],
    [FR.x + FR.w - 4.5, FR.y + FR.d - 4.5],
  ]);
  put("halo", `<path class="iso-halo" d="${k.haloOf(k.insetPlan(PLATE, 10), M.FOOT_Z, 4, P)}"/>`, []);
  feet.forEach(([x, y], index) => {
    const fz = M.FOOT_Z;
    const svg =
      S(k.cylinder(x, y, 6.2, fz, 2.4, P, 24, 0.4), { tone: "lo" }) +
      S(k.cylinder(x, y, 1.8, fz + 2.4, 6.6, P, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 1.8, fz + 5.4, P, 8) + k.sideArc(x, y, 1.8, fz + 6.6, P, 8), { tone: "faint" }) }) +
      S(k.cylinder(x, y, 4.2, z0 - 3, 3, P, 6, 0.3), { tone: "mid" });
    put(`stand.foot${index}`, svg, [dCyl(x, y, 6.2, fz, 2.4), dCyl(x, y, 1.8, fz + 2.4, 6.6), dCyl(x, y, 4.2, z0 - 3, 3)]);
  });
  for (const beam of beams) {
    const svg = S(slab(beam.plan, z0, z1 - z0, 2, 0.4), { tone: "lo", inner: L(k.sideSeam(beam.plan, z0 + 3, P, 2), { tone: "faint" }) });
    put(beam.name, svg, [dSlab(beam.plan, z0, z1 - z0)]);
  }

  // ============================ granite surface plate
  {
    const svg = S(slab(PLATE, -PLATE_H, PLATE_H, 3, 1.2), { tone: "lo", inner: L(k.sideSeam(PLATE, -2.2, P, 3), { tone: "faint" }) }) + L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 3), { tone: "faint" });
    put("stand.plate", svg, [dSlab(PLATE, -PLATE_H, PLATE_H)]);
  }
  // grade tag riveted to the slab's front face (blank: three rule lines stand for its print), round calibration seal on the right face
  {
    const yf = PLATE.y + PLATE.d;
    const tag = { x: 46, y: yf, w: 26, d: 0.5, r: 0.3 };
    const [tz0, tz1] = [-13.6, -5.2];
    const ty = yf + tag.d;
    const border = face([[tag.x + 1.1, ty, tz0 + 1.1], [tag.x + tag.w - 1.1, ty, tz0 + 1.1], [tag.x + tag.w - 1.1, ty, tz1 - 1.1], [tag.x + 1.1, ty, tz1 - 1.1]]);
    const rules = [15, 11, 7].map((w, i) => seg([tag.x + 5.4, ty, tz1 - 2.6 - i * 1.6], [tag.x + 5.4 + w, ty, tz1 - 2.6 - i * 1.6])).join("");
    const zm = (tz0 + tz1) / 2;
    const rivets = [tag.x + 2.9, tag.x + tag.w - 2.9];
    const heads = rivets.map((x) => G.circleOf(frameY(x, ty, zm), 0, 0.9, P, 12)).join("");
    const svg =
      S(slab(tag, tz0, tz1 - tz0, 1, 0.2), { tone: "mid", crease: "none", inner: L(border, { tone: "faint" }) }) +
      L(rules, { tone: "lo", free: true }) +
      L(heads, { tone: "lo" }) +
      D(rivets.map((x) => at([x, ty, zm])), { size: 0.45 });
    put("stand.tag", svg, [dSlab(tag, tz0, tz1 - tz0)]);
    const xr = PLATE.x + PLATE.w;
    const F = frameX(xr, -30, -9.4);
    const seal = S(G.disc(0, 0.4, 3.4, F, P), { tone: "mid", inner: L(G.circleOf(F, 0.4, 2.5, P, 28) + G.circleOf(F, 0.4, 1.3, P, 20), { tone: "faint" }) });
    put("stand.seal", seal, [dDisc(F, 0, 0.4, 3.4)]);
  }

  // ============================ slotted block case, lid open (back right)
  {
    const zt = CASE_H;
    const inner = k.insetPlan(CASE, 2.6);
    const slots = Array.from({ length: M.SLOTS }, (_, i) => {
      const [x, y] = M.slotCentre(i);
      return k.onTop([[x - SLOT.w / 2, y - SLOT.d / 2], [x + SLOT.w / 2, y - SLOT.d / 2], [x + SLOT.w / 2, y + SLOT.d / 2], [x - SLOT.w / 2, y + SLOT.d / 2]], zt, P, true);
    }).join("");
    const rowX = (row) => M.slotCentre(row * 10)[0];
    const colY = (c) => M.slotCentre(c)[1];
    const dividers = [
      ...[3.5, 7.5].map((r) => {
        const x = (rowX(Math.floor(r)) + rowX(Math.ceil(r))) / 2;
        return k.lineOnTop([x, inner.y], [x, inner.y + inner.d], zt, P);
      }),
      ...[0.5, 3.5, 6.5].map((c) => {
        const y = (colY(Math.floor(c)) + colY(Math.ceil(c))) / 2;
        return k.lineOnTop([inner.x, y], [inner.x + inner.w, y], zt, P);
      }),
    ].join("");
    const body =
      S(slab(CASE, 0, zt, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(CASE, 2.2, P, 4), { tone: "faint" }) }) +
      L(k.planOutline(inner, zt, P, 3), { tone: "lo" }) +
      L(dividers, { tone: "faint" }) +
      `<path class="ws-slot" d="${slots}"/>` +
      D([at([CASE.x + CASE.w - 1.4, CASE.y + CASE.d - 1.4, zt]), at([CASE.x + 1.4, CASE.y + CASE.d - 1.4, zt]), at([CASE.x + CASE.w - 1.4, CASE.y + 3.8, zt])], { size: 0.4 });
    put("case.body", body, [dSlab(CASE, 0, zt, { owner: "case" })]);

    // the lid stands open on the back rim, held by a folding stay on the right end
    const lid = { x: CASE.x, y: CASE.y, w: CASE.w, d: 2.6, r: 1 };
    const felt = { x: CASE.x + 4, y: CASE.y + 2.6, w: CASE.w - 8, d: 0.6, r: 0 };
    const yi = CASE.y + 2.6;
    const keepers = [CASE.x + 14, CASE.x + CASE.w - 21].map((x) => face([[x, yi, zt + LID_H - 6], [x + 7, yi, zt + LID_H - 6], [x + 7, yi, zt + LID_H - 2.6], [x, yi, zt + LID_H - 2.6]])).join("");
    put("case.lid", S(slab(lid, zt, LID_H, 3, 0.6), { tone: "mid", inner: L(keepers, { tone: "faint" }) }), [dSlab(lid, zt, LID_H, { owner: "case" })]);
    put("case.felt", S(slab(felt, zt + 5, LID_H - 13, 1), { tone: "lo", crease: "none" }), [dSlab(felt, zt + 5, LID_H - 13, { owner: "case" })]);
    {
      // the set's calibration card, tucked against the felt: a ruled table, one row per budget, a column per model
      const card = { x: CASE.x + 12, y: CASE.y + 3.2, w: CASE.w - 24, d: 0.3, r: 0 };
      const yc = card.y + card.d;
      const cz0 = zt + 11;
      const cz1 = zt + LID_H - 13;
      const fx0 = card.x + 2.2;
      const fx1 = card.x + card.w - 2.2;
      const fz0 = cz0 + 2.2;
      const fz1 = cz1 - 2.2;
      const frame = face([[fx0, yc, fz0], [fx1, yc, fz0], [fx1, yc, fz1], [fx0, yc, fz1]]);
      const head = fz1 - 4.2;
      const rows = [head, ...[1, 2, 3].map((i) => head - (i * (head - fz0)) / 4)].map((z) => seg([fx0, yc, z], [fx1, yc, z])).join("");
      const cols = [0.28, 0.46, 0.64, 0.82].map((f) => seg([fx0 + f * (fx1 - fx0), yc, fz0], [fx0 + f * (fx1 - fx0), yc, head])).join("");
      const svg = S(slab(card, cz0, cz1 - cz0, 1), { tone: "mid", crease: "none", inner: L(frame, { tone: "lo" }) + L(rows + cols, { tone: "faint" }) });
      put("case.card", svg, [dSlab(card, cz0, cz1 - cz0, { owner: "case" })]);
    }
    // the blocks: one per recorded cell. The 28 that a setting can log as unevaluable are their own groups
    const blockPlan = (i) => {
      const [x, y] = M.slotCentre(i);
      return { x: x - SLOT.bw / 2, y: y - SLOT.bd / 2, w: SLOT.bw, d: SLOT.bd, r: 0 };
    };
    const blockPaths = (i) => k.slabOf(blockPlan(i), zt, 1.6, P, 1);
    const merge = (list) => ({
      fill: "",
      shades: [0, 1, 2, 3].map((s) => list.map((p) => p.shades[s] || "").join("")),
      top: list.map((p) => p.top).join(""),
      crease: "",
      outline: list.map((p) => p.outline).join(""),
    });
    const order = Array.from({ length: M.SLOTS }, (_, i) => i).sort((a, b) => k.depthOf([...M.slotCentre(a), 0], P) - k.depthOf([...M.slotCentre(b), 0], P));
    const fixed = order.filter((i) => !M.MAY_EMPTY.has(i));
    const blockShape = (i) => dSlab(blockPlan(i), zt, 1.6, { owner: "case", name: `case.block${i}` });
    const block = (list) => S(merge(list.map(blockPaths)), { tone: "mid" }).replace('<path class="iso-fill" d=""/>', "");
    put("case.blocks", block(fixed), fixed.map(blockShape));
    for (const i of order.filter((j) => M.MAY_EMPTY.has(j))) put(`case.block${i}`, block([i]), [blockShape(i)], { attrs: `data-slot="${i}"` });

    // the stay is outside the right end, so it is drawn after every block it overlaps
    {
      const xs = CASE.x + CASE.w;
      const A = [CASE.y + 1.3, zt + 20];
      const B = [CASE.y + 15, zt - 2.6];
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const n = [(-(B[1] - A[1]) / len) * 0.8, ((B[0] - A[0]) / len) * 0.8];
      const poly = [[A[0] + n[0], A[1] + n[1]], [B[0] + n[0], B[1] + n[1]], [B[0] - n[0], B[1] - n[1]], [A[0] - n[0], A[1] - n[1]]];
      const F = frameX(xs, 0, 0);
      const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      const pins = [A, B, mid].map(([y, z]) => at([xs + 0.6, y, z]));
      put("case.stay", S(G.prismOf(F, poly, 0, 0.6, P), { tone: "mid" }) + D(pins, { size: 0.5, tone: "hi" }), [dPrism(F, poly, 0, 0.6, { owner: "case" })]);
    }

    // latches on the front face
    for (const lx of [CASE.x + 14, CASE.x + CASE.w - 21]) {
      const plan = { x: lx, y: CASE.y + CASE.d, w: 7, d: 1.1, r: 0.4 };
      put(`case.latch${lx}`, S(slab(plan, 2.2, 5, 1, 0.2), { tone: "mid" }) + D([at([lx + 3.5, CASE.y + CASE.d + 1.1, 4.7])], { size: 0.45 }), [dSlab(plan, 2.2, 5, { owner: "case" })]);
    }
  }

  // ============================ steel rule and label plate on the front of the granite
  {
    const rule = { x: PLATE.x + 10, y: PLATE.y + PLATE.d - 14, w: 62, d: 6.5, r: 0.5 };
    const t = k.topTicks(rule.x + 3, rule.x + rule.w - 3, 2, 5, rule.y + 0.3, 0.6, [1.6, 3], P);
    const svg = S(slab(rule, 0, 0.6, 1), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    put("rule", svg, [dSlab(rule, 0, 0.6)]);
    const plate = { x: PLATE.x + 10, y: PLATE.y + PLATE.d - 33, w: 46, d: 14, r: 1 };
    const z = 0.8;
    const rules = [22, 17, 11].map((w, i) => k.lineOnTop([plate.x + 19, plate.y + 4 + i * 3], [plate.x + 19 + w, plate.y + 4 + i * 3], z, P)).join("");
    const svgL =
      S(slab(plate, 0, z, 2), { tone: "lo", crease: "none" }) +
      L(k.planOutline(k.insetPlan(plate, 1.4), z, P, 2) + k.lineOnTop([plate.x + 16.5, plate.y + 1.4], [plate.x + 16.5, plate.y + plate.d - 1.4], z, P), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([plate.x + 3.2, plate.y + 8.6], z, P, "x"), "AU-15", { size: 3.6, tone: "mid" }) +
      L(rules, { tone: "lo", free: true }) +
      D([at([plate.x + plate.w - 3, plate.y + 3, z]), at([plate.x + plate.w - 3, plate.y + plate.d - 3, z])], { size: 0.45 });
    put("label", svgL, [dSlab(plate, 0, z)]);
  }


  // ============================ frontier tray: a reference block per valid structural bin, test row and shift row
  {
    const { TRAY, TRAY_SLOT: T } = M;
    const zt = TRAY.h;
    const cells = [0, 1].flatMap((row) => Array.from({ length: M.MAX_BINS }, (_, bin) => M.traySlot(row, bin)));
    const pockets = cells.map(([x, y]) => k.onTop([[x - T.w / 2, y - T.d / 2], [x + T.w / 2, y - T.d / 2], [x + T.w / 2, y + T.d / 2], [x - T.w / 2, y + T.d / 2]], zt, P, true)).join("");
    const svg =
      S(slab(TRAY, 0, zt, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(TRAY, 1.4, P, 3), { tone: "faint" }) }) +
      `<path class="ws-slot" d="${pockets}"/>` +
      D([at([TRAY.x + 1.6, TRAY.y + TRAY.d - 1.6, zt]), at([TRAY.x + TRAY.w - 1.6, TRAY.y + TRAY.d - 1.6, zt]), at([TRAY.x + TRAY.w - 1.6, TRAY.y + 1.6, zt])], { size: 0.4 });
    put("tray", svg, [dSlab(TRAY, 0, zt, { owner: "tray" })]);
    const order = [0, 1].flatMap((row) => Array.from({ length: M.MAX_BINS }, (_, bin) => [row, bin])).sort((a, b) => k.depthOf([...M.traySlot(...a), 0], P) - k.depthOf([...M.traySlot(...b), 0], P));
    for (const [row, bin] of order) {
      const [x, y] = M.traySlot(row, bin);
      const plan = { x: x - T.bw / 2, y: y - T.bd / 2, w: T.bw, d: T.bd, r: 0.4 };
      const field = k.onTop([[x - 3.4, y - 1.2], [x + 1.2, y - 1.2], [x + 1.2, y + 1.2], [x - 3.4, y + 1.2]], zt + T.bh, P, true);
      put(`tray.bin${row}${bin}`, S(slab(plan, zt, T.bh, 2, 0.3), { tone: "mid" }) + L(field, { tone: "faint" }), [dSlab(plan, zt, T.bh, { owner: "tray" })], { attrs: `data-bin="${row}${bin}"` });
    }
  }

  // ============================ precision level: the plate is levelled before anything is measured
  {
    const plan = { x: 38, y: 14, w: 8, d: 24, r: 1 };
    const z = 4.6;
    const win = { x: plan.x + 2, y: plan.y + 5, w: plan.w - 4, d: plan.d - 10, r: 1.6 };
    const vial = { x: win.x + 1.1, y: win.y + 1.4, w: win.w - 2.2, d: win.d - 2.8, r: 0.9 };
    const cy = vial.y + vial.d / 2;
    const ticks = [-3.2, -1.6, 1.6, 3.2].map((dy) => k.lineOnTop([vial.x, cy + dy], [vial.x + vial.w, cy + dy], z, P)).join("");
    const svg =
      S(slab(plan, 0, z, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 1.6, P, 3), { tone: "faint" }) }) +
      L(k.planOutline(win, z, P, 3), { tone: "lo" }) +
      L(k.planOutline(vial, z, P, 3), { tone: "mid" }) +
      L(ticks, { tone: "lo" }) +
      L(k.ring(vial.x + vial.w / 2, cy, 0.9, z, P, 16), { tone: "hi" }) +
      D([at([plan.x + plan.w / 2, plan.y + 2.4, z]), at([plan.x + plan.w / 2, plan.y + plan.d - 2.4, z])], { size: 0.45 });
    put("level", svg, [dSlab(plan, 0, z)]);
  }

  // ============================ setting selector: a three-detent rotary switch (front right)
  {
    const z = SELECT.h;
    const [kx, ky] = KNOB;
    const ringR = 8;
    const marks = DETENT.map((a) => k.lineOnTop([kx + Math.sin(a) * ringR, ky - Math.cos(a) * ringR], [kx + Math.sin(a) * (ringR + 2.6), ky - Math.cos(a) * (ringR + 2.6)], z, P)).join("");
    const box =
      S(slab(SELECT, 0, z, 3, 0.7), { tone: "mid", inner: L(k.sideSeam(SELECT, 2, P, 3), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(SELECT, 2.2), z, P, 3), { tone: "faint" }) +
      L(k.ring(kx, ky, ringR, z, P, 40), { tone: "lo" }) +
      L(marks, { tone: "mid" }) +
      screw(SELECT.x + 4.6, SELECT.y + 4.6, z, 1.3) +
      screw(SELECT.x + SELECT.w - 4.6, SELECT.y + SELECT.d - 4.6, z, 1.3);
    put("select.box", box, [dSlab(SELECT, 0, z)]);
    const knob =
      S(k.cylinder(kx, ky, 6, z, 1.2, P, 32), { tone: "lo" }) +
      S(k.cylinder(kx, ky, 4.8, z + 1.2, 4.4, P, 28, 0.5), { tone: "mid", inner: L(k.knurl(kx, ky, 4.8, z + 1.2, z + 5.6, 24, P), { tone: "lo" }) }) +
      `<path class="iso-line" data-tone="hi" data-part="pointer" data-free="" d="${pointerAt(DETENT[0])}" style="stroke-width:1"/>`;
    put("select.knob", knob, [dCyl(kx, ky, 6, z, 1.2, { owner: "select" }), dCyl(kx, ky, 4.8, z + 1.2, 4.4, { owner: "select" })]);
  }

  // ============================ height gauge: base, column and scale (moves along x)
  const gx = GX0;
  {
    const base = { x: gx - 17, y: GY - 15, w: 34, d: 30, r: 2 };
    const boss = { x: gx - 11, y: GY - 9, w: 22, d: 18, r: 1.5 };
    const svg =
      S(slab(base, 0, 8, 3, 0.7), { tone: "mid", inner: L(k.sideSeam(base, 2.6, P, 3), { tone: "faint" }) }) +
      screw(base.x + 4, base.y + base.d - 4, 8, 1.4) +
      screw(base.x + base.w - 4, base.y + base.d - 4, 8, 1.4) +
      screw(base.x + base.w - 4, base.y + 4, 8, 1.4) +
      S(slab(boss, 8, 4, 3, 0.5), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(boss, 1.6), 12, P, 3), { tone: "faint" });
    put("gauge.base", svg, owned([dSlab(base, 0, 8), dSlab(boss, 8, 4)], "gauge"), { move: "gauge" });
  }
  // the slider and the fine-adjust clamp wrap the column: their back L is drawn before it, the right cheek after
  const ringL = (x) => [
    [x - 8.5, GY - 6],
    [x + 5, GY - 6],
    [x + 5, GY - COL.hd],
    [x - 5, GY - COL.hd],
    [x - 5, GY + COL.hd],
    [x - 8.5, GY + COL.hd],
  ];
  const [s0, s1] = sliderSpan(H0);
  const [c0, c1] = clampSpan(H0);
  put("slider.clampL", S(k.extrude(ringL(gx), c0, c1 - c0, P, { convex: false, bevel: 0.4 }), { tone: "mid" }), [dExt(ringL(gx), c0, c1 - c0, { owner: "slider" })], { move: "slider" });
  put("slider.bodyL", S(k.extrude(ringL(gx), s0, s1 - s0, P, { convex: false, bevel: 0.4 }), { tone: "mid" }), [dExt(ringL(gx), s0, s1 - s0, { owner: "slider" })], { move: "slider" });
  // main scale: zero is the frontier reading; one division is 2 bits, a long one every 10
  {
    const col = { x: gx - COL.hw, y: GY - COL.hd, w: COL.hw * 2, d: COL.hd * 2, r: 0.5 };
    const cap = { x: gx - 6, y: GY - 4.6, w: 12, d: 9.2, r: 1 };
    const strip = { x: gx - 4.4, y: GY + COL.hd, w: 9, d: 0.5, r: 0 };
    const sTop = COL.z1 - 3;
    const yf = GY + COL.hd + 0.5;
    const zero = H0 + VZ;
    const minor = [];
    const major = [];
    let zeroTick = "";
    for (let n = -40; n <= 60; n++) {
      const z = zero + 2 * n;
      if (z < 16.5 || z > sTop - 1.5) continue;
      const long = n % 5 === 0;
      const d = seg([gx + 4.6, yf, z], [gx + 4.6 - (n === 0 ? 9 : long ? 3.4 : 1.8), yf, z]);
      if (n === 0) zeroTick = d;
      else (long ? major : minor).push(d);
    }
    const svg =
      S(slab(col, COL.z0, COL.z1 - COL.z0, 2, 0), { tone: "mid" }) +
      S(slab(strip, 15, sTop - 15, 1), { tone: "lo", crease: "none" }) +
      L(minor.join(""), { tone: "lo" }) +
      L(major.join(""), { tone: "mid" }) +
      L(zeroTick, { tone: "hi" }) +
      S(slab(cap, COL.z1, 3.6, 3, 0.6), { tone: "mid" }) +
      D([at([gx, GY, COL.z1 + 3.6])], { size: 0.45 });
    put("gauge.column", svg, owned([dSlab(col, COL.z0, COL.z1 - COL.z0), dSlab(strip, 15, sTop - 15), dSlab(cap, COL.z1, 3.6)], "gauge"), { move: "gauge" });
  }
  {
    const cheek = { x: gx + 5, y: GY - 6, w: 3.5, d: 6 + COL.hd, r: 0.4 };
    const lug = { x: gx + 8.5, y: GY - 3, w: 5.6, d: 6, r: 0.9 };
    // fine-adjust clamp: right cheek, lug, lock screw
    const lock = thumbY(gx - 6.75, GY + COL.hd, (c0 + c1) / 2, 1.8, 3);
    put("slider.clampR", S(slab(cheek, c0, c1 - c0, 2, 0.4), { tone: "mid" }) + S(slab(lug, c1 - 3, 3, 2, 0.3), { tone: "mid" }), owned([dSlab(cheek, c0, c1 - c0), dSlab(lug, c1 - 3, 3)], "slider"), { move: "slider" });
    put("slider.clampLock", lock.svg, owned(lock.shapes, "slider"), { move: "slider" });
    // fine-adjust screw and its knurled nut between the two lugs
    const rx = gx + 11.3;
    const nz = (c1 + s0) / 2 - 1.2;
    const rodPart = (name, za, zb) => {
      const svg = S(k.cylinder(rx, GY, 1, za, zb - za, P, 12), { tone: "lo", crease: "none", inner: L(k.sideArc(rx, GY, 1, (za + zb) / 2, P, 8), { tone: "faint" }) });
      put(name, svg, [dCyl(rx, GY, 1, za, zb - za, { owner: "slider" })], { move: "slider" });
    };
    rodPart("slider.rodLo", c1, nz);
    const nut = S(k.cylinder(rx, GY, 2.8, nz, 2.4, P, 24, 0.3), { tone: "mid", inner: L(k.knurl(rx, GY, 2.8, nz, nz + 2.4, 18, P), { tone: "lo" }) });
    put("slider.nut", nut, [dRing(frameZ(rx, GY), nz, nz + 2.4, 1, 2.8, { owner: "slider" })], { move: "slider" });
    rodPart("slider.rodHi", nz + 2.4, s0);
    // slider: right cheek with the vernier plate, its lug and lock screw
    const vern = { x: gx + 5.2, y: GY + COL.hd, w: 3.1, d: 0.5, r: 0 };
    const yf = GY + COL.hd + 0.5;
    const ticks = [[], []];
    for (let i = 0; i <= 10; i++) {
      const z = H0 + VZ + i * 1.8;
      ticks[i % 5 === 0 ? 1 : 0].push(seg([gx + 5.2, yf, z], [gx + 5.2 + (i % 5 === 0 ? 2.4 : 1.4), yf, z]));
    }
    const lockS = thumbY(gx - 6.75, GY + COL.hd, s1 - 5.5, 1.8, 3);
    const right =
      S(slab(cheek, s0, s1 - s0, 2, 0.4), { tone: "mid" }) +
      S(slab(lug, s0, 3, 2, 0.3), { tone: "mid" }) +
      S(slab(vern, H0 + VZ - 1.5, 20.3, 1), { tone: "lo", crease: "none" }) +
      L(ticks[0].join(""), { tone: "lo" }) +
      L(ticks[1].join(""), { tone: "mid" }) +
      D([at([gx + 6.75, GY - 4.4, s1])], { size: 0.45 });
    put("slider.bodyR", right, owned([dSlab(cheek, s0, s1 - s0), dSlab(lug, s0, 3), dSlab(vern, H0 + VZ - 1.5, 20.3)], "slider"), { move: "slider" });
    put("slider.lock", lockS.svg, owned(lockS.shapes, "slider"), { move: "slider" });
    // scriber arm under the clamp
    const arm = { x: gx + 5, y: GY + COL.hd, w: 3.5, d: 9.5, r: 0.5 };
    put("slider.arm", S(slab(arm, H0 - 4, 4, 2, 0.3), { tone: "mid" }), [dSlab(arm, H0 - 4, 4, { owner: "slider" })], { move: "slider" });
  }

  // ============================ the frontier stack: fixed parallel, structural block, residual block
  {
    const par = { x: FX - 9, y: SY - 7, w: 18, d: 14, r: 1 };
    const svg = S(slab(par, 0, BASE_TOP, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(par, 2.4, P, 3), { tone: "faint" }) }) + L(k.planOutline(k.insetPlan(par, 1.4), BASE_TOP, P, 3), { tone: "faint" });
    put("frontier.parallel", svg, [dSlab(par, 0, BASE_TOP)]);
    const a = gaugeBlock(FX, SY, BASE_TOP, STRUCT_H, { tone: "mid" });
    put("frontier.struct", a.svg, a.shapes);
    const b = gaugeBlock(FX, SY, BASE_TOP + STRUCT_H, RES_H, { tone: "mid" });
    put("frontier.res", b.svg, b.shapes);
  }

  // ============================ the candidate on a screw riser (the riser lifts it for the shift split)
  {
    const zh = RISER_Z.housing;
    const zr = RISER_Z.ring;
    const zp = RISER_Z.plate;
    const svg = S(slab(RISER, 0, zh, 3, 0.5), { tone: "mid" }) + screw(RISER.x + 2.6, RISER.y + RISER.d - 2.6, zh, 1.1) + screw(RISER.x + RISER.w - 2.6, RISER.y + RISER.d - 2.6, zh, 1.1) + screw(RISER.x + RISER.w - 2.6, RISER.y + 2.6, zh, 1.1);
    put("riser.housing", svg, [dSlab(RISER, 0, zh, { owner: "riser" })]);
    const ring = S(k.cylinder(CX, SY, 5.6, zh, zr - zh, P, 32, 0.4), { tone: "mid", inner: L(k.knurl(CX, SY, 5.6, zh, zr, 26, P), { tone: "lo" }) });
    put("riser.ring", ring, [dCyl(CX, SY, 5.6, zh, zr - zh, { owner: "riser" })]);
    const stroke = M.LIFT_MAX + 1;
    const rod = (name, x, y, from, r, threads) => {
      const F = frameZ(x, y);
      const R = G.rodOut(F, from, zp, r, P, { stroke });
      const id = `ws-clip-${name}`;
      const count = threads ? Math.floor((zp - from + stroke) / 1.6) : 0;
      const lines = Array.from({ length: count }, (_, i) => G.arcOf(F, zp - 0.8 - i * 1.6, r, P)).join("");
      const svgR = `<clipPath id="${id}"><path data-hold d="${R.clip}"/></clipPath><g clip-path="url(#${id})">${S(R.paths, { tone: "lo", crease: "none", inner: lines ? L(lines, { tone: "faint" }) : "" })}</g>`;
      put(`riser.${name}`, svgR, [dSlide(F, from, zp, r, { owner: "riser" })], { move: "lift" });
    };
    rod("pinL", CX - 6.6, SY + 5, zh, 1, false);
    rod("screw", CX, SY, zr, 2, true);
    rod("pinR", CX + 6.6, SY - 5, zh, 1, false);
    const plate = { x: CX - 9, y: SY - 7, w: 18, d: 14, r: 1 };
    put("riser.plate", S(slab(plate, zp, BASE_TOP - zp, 3, 0.5), { tone: "mid" }) + L(k.planOutline(k.insetPlan(plate, 1.4), BASE_TOP, P, 3), { tone: "faint" }), [dSlab(plate, zp, BASE_TOP - zp, { owner: "riser" })], { move: "lift" });
    const a = gaugeBlock(CX, SY, BASE_TOP, STRUCT_H, { tone: "mid" });
    put("cand.struct", a.svg, a.shapes, { move: "lift" });
    M.SETTINGS.forEach((s, index) => {
      const b = gaugeBlock(CX, SY, BASE_TOP + STRUCT_H, RES_H - s.gTest, { tone: "hi", lit: true });
      put(`cand.res${index}`, b.svg, b.shapes, { move: "lift", attrs: `data-variant="${index}"` });
    });
  }

  // ============================ scriber: blade on the arm, clamp plate and screw (moves with the slider)
  {
    const x0 = gx + ARM_DX - 1.5;
    const y0 = GY + COL.hd;
    const tip = SY + 2.6;
    const F = frameX(x0, 0, 0);
    const poly = [[y0, H0], [tip, H0], [tip - 0.6, H0 + 0.6], [tip - 4, H0 + 1.4], [y0, H0 + 1.4]];
    const carbide = seg([x0, tip - 4, H0 + 1.4], [x0 + 3, tip - 4, H0 + 1.4]);
    put("slider.blade", S(G.prismOf(F, poly, 0, 3, P), { tone: "mid", inner: L(carbide, { tone: "faint" }) }), [dPrism(F, poly, 0, 3, { owner: "slider" })], { move: "slider" });
    const plate = { x: gx + 4.5, y: GY + COL.hd + 1.4, w: 4.5, d: 6.4, r: 0.6 };
    const sx = gx + ARM_DX;
    const sy = plate.y + 3.2;
    const svg =
      S(slab(plate, H0 + 1.4, 1.2, 2, 0.3), { tone: "mid" }) +
      S(k.cylinder(sx, sy, 1.6, H0 + 2.6, 2.4, P, 20, 0.3), { tone: "mid", inner: L(k.knurl(sx, sy, 1.6, H0 + 2.6, H0 + 5, 12, P), { tone: "lo" }) });
    put("slider.clamp", svg, owned([dSlab(plate, H0 + 1.4, 1.2), dCyl(sx, sy, 1.6, H0 + 2.6, 2.4)], "slider"), { move: "slider" });
  }
  return items;
}
