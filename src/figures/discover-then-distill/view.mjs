// Fig 18 · a pose turned into the attributes and paths of the moving parts. Used by art.mjs (static) and live.js.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { P, at, COLUMN, ROWS, CTRL, CUT, DROP_X, FLASK_C, FLASK_R, FUNNEL, GX, HEAT_KNOB, LIQUID, MODE_KNOB, PIVOT, RECEIVER, RECEIVER_FLOOR, SWING, levelOf, receiverRadius, zOfReward } from "./rig.mjs";

const fx = (n) => Math.round(n * 10) / 10;
const TV = k.towardViewer(P);
const tvA = Math.atan2(TV[1], TV[0]);
const RF = G.frameOf([DROP_X, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
export const HEAT_FROM = -tvA - 2.2; // dial scales centred away from the viewer, gap toward the front
export const MODE_FROM = -tvA - 0.7;

// a solid as fixed slots, so live code only rewrites `d`
const SLOT = ["iso-fill", "iso-shade", "iso-shade", "iso-shade", "iso-shade", "iso-top", "iso-line iso-edge"];
const dsOf = (p) => (p ? [p.fill, ...p.shades, p.top, p.outline].map((d) => d || "") : SLOT.map(() => ""));
const slots = (ds, tone) => ds.map((d, i) => `<path class="${SLOT[i]}"${i && i < 5 ? ` data-shade="${i - 1}"` : ""}${i > 5 ? ` data-tone="${tone}"` : ""} d="${d}"/>`).join("");

// after k of the 12 steps the vapour covers exactly k rows of indentations; the last step fills the column into the head
const TOPS = [COLUMN.z0 + 0.4, ...ROWS.slice(0, -1).map((z) => z + 1.9), COLUMN.z1 + 2.4];
const vapourTop = (share) => {
  const s = share * ROWS.length;
  const i = Math.min(ROWS.length - 1, Math.floor(s));
  return TOPS[i] + (TOPS[i + 1] - TOPS[i]) * (s - i);
};
const vapourOf = (share) => (share < 0.01 ? null : k.cylinder(GX, 0, COLUMN.r - 0.9, COLUMN.z0 + 0.4, vapourTop(share) - COLUMN.z0 - 0.4, P, 28));
const receiverOf = (share) => {
  if (share < 0.004) return null;
  const z0 = RECEIVER_FLOOR;
  const z1 = levelOf(share);
  return G.solidOf([[z0, receiverRadius(z0)], [z1, receiverRadius(z1)]], RF, P, { steps: 40 });
};
// the swing funnel on its pin: its axis tilts from straight down toward the take-off arm
const funnelFrame = (open) => {
  const a = SWING * open;
  return G.frameOf(PIVOT, [Math.sin(a), 0, -Math.cos(a)], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0]);
};
const pointer = (cx, cy, angle, length, z) => k.lineOnTop([cx, cy], [cx + Math.sin(angle) * length, cy - Math.cos(angle) * length], z, P);

// bubble i in the flask: rises from the mantle rim to the surface
const bubbleAt = (i, t, heat) => {
  const p = (t * (0.9 + (i % 3) * 0.17) + i * 0.377) % 1;
  const a = tvA + (i - 3.5) * 0.27;
  const z = FLASK_C - 9 + p * (LIQUID - FLASK_C + 9.6);
  const r = Math.sqrt(Math.max(0, (FLASK_R - 1.6) ** 2 - (z - FLASK_C) ** 2)) * (0.55 + (0.35 * ((i * 7) % 5)) / 4);
  const [sx, sy] = at([GX + r * Math.cos(a) + Math.sin(t * 7 + i) * 0.35, r * Math.sin(a), z]);
  return { cx: fx(sx), cy: fx(sy), opacity: (heat * Math.min(1, p * 6, (1 - p) * 5)).toFixed(2) };
};

export function viewOf(pose) {
  const F = funnelFrame(pose.funnel);
  const funnel = G.solidOf(FUNNEL, F, P, { steps: 24 });
  const ds = { vapour: dsOf(vapourOf(pose.vapour)), receiver: dsOf(receiverOf(pose.level)), funnel: [...dsOf(funnel), G.circleOf(F, FUNNEL[0][0], FUNNEL[0][1] - 0.6, P, 24)] };
  const inner = {
    vapour: `<g class="iso-solid" data-lit="">${slots(ds.vapour, "lit")}</g>`,
    receiver: slots(ds.receiver, "mid"),
    funnel: slots(ds.funnel.slice(0, 7), "mid") + `<path class="iso-line" data-tone="lo" d="${ds.funnel[7]}"/>`,
  };
  const attrs = {};
  // the column of mercury, hidden where it passes the cut collar
  const zm = Math.max(161.5, zOfReward(pose.mercury));
  const front = (z) => at([GX + 2 * TV[0], 2 * TV[1], z]); // on the capillary line, front of the stem
  attrs.mercury = { d: k.pathOf([front(161), front(Math.min(zm, CUT - 0.8))]) };
  attrs.mercury2 = { d: zm > CUT + 0.9 ? k.pathOf([front(CUT + 0.8), front(zm)]) : "" };
  // a drop leaving the spout, and one falling from the adapter's drip tip into the receiver
  const tip = G.pointOf(F, FUNNEL[FUNNEL.length - 1][0] + 0.6, 0, 0);
  const dz = pose.drip < 0 ? 0 : pose.drip * pose.drip * 5;
  const [dx, dy] = at([tip[0], 0, tip[2] - dz]);
  attrs.drip = { cx: fx(dx), cy: fx(dy), opacity: pose.drip < 0 ? "0" : Math.min(1, (1 - pose.drip) * 4).toFixed(2) };
  const top = RECEIVER.mouth - 7.5;
  const zl = levelOf(pose.level);
  const [ox, oy] = at([DROP_X, 0, top - Math.max(0, pose.drop) ** 2 * (top - zl)]);
  attrs.drop = { cx: fx(ox), cy: fx(oy), opacity: pose.drop < 0 ? "0" : Math.min(1, (1 - pose.drop) * 6).toFixed(2) };
  attrs.stream = { opacity: pose.stream.toFixed(2) };
  attrs.beads = { "stroke-dashoffset": fx(-((pose.T * 9) % 6)) };
  attrs.lamp = { "data-on": pose.lamp ? "green" : null };
  attrs.heat = { d: pointer(HEAT_KNOB[0], HEAT_KNOB[1], HEAT_FROM + pose.heat * 4.4 * 0.86, 3.6, CTRL.h + 4.2) };
  attrs.mode = { d: pointer(MODE_KNOB[0], MODE_KNOB[1], MODE_FROM + pose.knob * 0.7, 3.2, CTRL.h + 4) };
  for (let i = 0; i < 8; i++) attrs[`b${i}`] = bubbleAt(i, pose.T, pose.heat);
  return { attrs, inner, ds };
}
