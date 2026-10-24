// Fig 15 model: where every part of the height-gauge bench sits, and what the gauge reads.
// Pure ESM. Heights are world units; one unit of stack height is one residual bit, so the gap the gauge
// reads between the two stack tops is g = frontier − L_res exactly (Table 1). The absolute stack heights are
// schematic: the paper reports gaps, not the frontier or L_res on their own.
import DATA from "./data.mjs";

export { DATA };
export const SETTINGS = DATA.settings;

// ------------------------------------------------------------ the bench
export const PLATE = { x: -98, y: -72, w: 206, d: 118, r: 3 };
export const PLATE_H = 18; // granite slab, z −18 … 0
export const BEAM_Z = [-30, -18];
export const FOOT_Z = -42;

// height gauge: column centre (gx, GY); the scriber clamp sits on the right cheek, ARM_DX from the column centre
export const GY = -40;
export const ARM_DX = 6.75;
export const COL = { hw: 5, hd: 3.5, z0: 12, z1: 114 };

// the two stacks stand side by side in front of the gauge
export const STACK_Y = 0;
export const FRONTIER_X = -52;
export const CANDIDATE_X = 0;
export const GX = { f: FRONTIER_X - ARM_DX, c: CANDIDATE_X - ARM_DX };
export const BLOCK = { w: 12, d: 9 };
export const BASE_TOP = 7; // top of the fixed parallel and of the riser plate at rest
export const RISER_Z = { housing: 3, ring: 5, plate: 5.6 }; // screw riser: housing top, drive ring top, plate underside at rest
export const STRUCT_H = 20; // structural-bits block (the same 2-bit bin on both stacks)
export const RES_H = 15; // the frontier's residual block
export const FRONTIER_TOP = BASE_TOP + STRUCT_H + RES_H;
export const CLEAR = 6; // scriber lift above the taller stack while it travels

// slotted block case, one slot per configured cell: rows along x are (budget, model), columns along y are map cells
export const CASE = { x: 26, y: -68, w: 76, d: 58, r: 2.4 };
export const CASE_H = 9;
export const LID_H = 52;
export const SLOT = { pitchX: 5.4, pitchY: 4.6, gapX: 2.4, gapY: 1.8, w: 3.8, d: 3.2, bw: 2.8, bd: 2.2 };

export const fmt = (value, digits = 3) => {
  const text = Math.abs(value).toFixed(digits);
  return (value < 0 && Number(text) !== 0 ? "−" : "") + text;
};

// ------------------------------------------------------------ the measured quantities
export const candidateTop = (setting, lift) => FRONTIER_TOP - SETTINGS[setting].gTest + lift;
export const liftFor = (setting, split) => (split === "shift" ? SETTINGS[setting].gTest - SETTINGS[setting].gShift : 0);
export const LIFT_MAX = Math.max(...SETTINGS.map((_, s) => liftFor(s, "shift")));
export const H_MAX = Math.max(...SETTINGS.map((_, s) => candidateTop(s, liftFor(s, "shift")))) + CLEAR;
export const H_MIN = FRONTIER_TOP;

// slot index in the case: budget-major, then model, then map cell (0 dense, 1–3 sparse, 4–6 low-rank, 7–9 MLP)
export const CELL_FAMILY = DATA.families.flatMap((family, index) => Array.from({ length: family.cells }, () => index));
export const slotIndex = (b, m, c) => (b * DATA.models.length + m) * CELL_FAMILY.length + c;
export const SLOTS = DATA.budgets.length * DATA.models.length * CELL_FAMILY.length;

// which slots are empty in a setting. The paper logs unevaluable counts per (budget, family); within a family
// group the empties are laid out cell by cell, model by model, which is a layout choice, not a reported identity.
export function emptiesOf(setting) {
  const out = new Set();
  for (const [key, count] of Object.entries(SETTINGS[setting].uneval)) {
    const [budget, family] = key.split(":");
    const b = DATA.budgets.indexOf(Number(budget));
    const f = DATA.families.findIndex((item) => item.id === family);
    const cells = CELL_FAMILY.map((fam, c) => (fam === f ? c : -1)).filter((c) => c >= 0);
    let left = count;
    for (const c of cells) for (let m = 0; m < DATA.models.length; m++) if (left > 0) (out.add(slotIndex(b, m, c)), left--);
  }
  return out;
}
export const EMPTIES = SETTINGS.map((_, s) => emptiesOf(s));
export const MAY_EMPTY = new Set(EMPTIES.flatMap((set) => [...set]));

export function slotCentre(index) {
  const c = index % CELL_FAMILY.length;
  const row = Math.floor(index / CELL_FAMILY.length);
  const b = Math.floor(row / DATA.models.length);
  const x = CASE.x + 4 + SLOT.w / 2 + row * SLOT.pitchX + b * SLOT.gapX;
  const y = CASE.y + 4 + SLOT.d / 2 + c * SLOT.pitchY + CELL_FAMILY[c] * SLOT.gapY;
  return [x, y];
}

// frontier tray: one reference block per valid structural bin, a row for test and a row for shift (Table 1 "Valid bins")
export const TRAY = { x: -24, y: 14, w: 44, d: 22, r: 1.6, h: 4 };
export const TRAY_SLOT = { pitch: 12.5, row: 9.4, w: 10.4, d: 6.4, bw: 9.2, bd: 5.2, bh: 2.6 };
export const MAX_BINS = Math.max(...SETTINGS.flatMap((s) => s.bins));
export const traySlot = (row, bin) => [TRAY.x + 3.2 + TRAY_SLOT.w / 2 + bin * TRAY_SLOT.pitch, TRAY.y + 3.6 + TRAY_SLOT.d / 2 + row * TRAY_SLOT.row];

// ------------------------------------------------------------ the selector: three detents
export const SELECT = { x: 64, y: 15, w: 32, d: 22, r: 2, h: 7 };
export const KNOB = [SELECT.x + 16, SELECT.y + 11];
export const DETENT = [0.82, 1.57, 2.32]; // radians, 0 points to −y: S1 screen right, S2 along +x, S3 toward the viewer
export const RISER = { x: CANDIDATE_X - 10, y: STACK_Y - 8, w: 20, d: 16, r: 1.5 };

// ------------------------------------------------------------ poses
// a pose is where the parts physically are: gauge x, scriber contact height h, riser lift,
// the candidate block on the stack (variant), the knob angle and the setting the case shows
export function restPose(goal) {
  const lift = liftFor(goal.setting, goal.split);
  return {
    gx: GX[goal.at],
    h: goal.at === "f" ? FRONTIER_TOP : candidateTop(goal.setting, lift),
    lift,
    variant: goal.setting,
    knob: DETENT[goal.setting],
    cased: goal.setting,
  };
}

// the planner the page runs every frame: raise the scriber clear of every stack it will pass over or that changes
// under it, then travel, swap or lift, then lower. A lift or swap beside the frontier leaves the scriber where it rests.
export function planOf(pose, goal) {
  const lift = liftFor(goal.setting, goal.split);
  const gx = GX[goal.at];
  const travel = pose.gx !== gx;
  const moving = travel || pose.lift !== lift || pose.variant !== goal.setting;
  if (!moving) return { moving, h: goal.at === "f" ? FRONTIER_TOP : candidateTop(goal.setting, lift), up: true, gx, lift };
  if (!travel && goal.at === "f") return { moving, h: FRONTIER_TOP, up: true, gx, lift };
  const high = Math.max(pose.lift, lift); // the candidate's top over its whole travel
  const cand = Math.max(candidateTop(pose.variant, high), candidateTop(goal.setting, high));
  const clear = (travel ? Math.max(FRONTIER_TOP, cand) : cand) + CLEAR;
  return { moving, h: clear, up: pose.h >= clear - 0.25, gx, lift };
}

// one frame of the mechanism: every value follows its target on a critically damped spring (sub-stepped),
// and the gauge and riser only move once the scriber is clear. Returns whether anything is still moving.
export const TAU = { h: 0.1, gx: 0.18, lift: 0.18, knob: 0.12 };
export function advance(pose, vel, goal, dt) {
  const follow = (key, target) => {
    const w = 1 / TAU[key];
    for (let i = 0; i < 4; i++) {
      vel[key] += (w * w * (target - pose[key]) - 2 * w * vel[key]) * (dt / 4);
      pose[key] += vel[key] * (dt / 4);
    }
    if (Math.abs(target - pose[key]) < 0.03 && Math.abs(vel[key]) < 0.3) {
      pose[key] = target;
      vel[key] = 0;
    }
    return pose[key] !== target;
  };
  pose.cased = goal.setting;
  let busy = follow("knob", DETENT[goal.setting]);
  const plan = planOf(pose, goal);
  if (plan.moving && plan.up) {
    pose.variant = goal.setting;
    busy = follow("gx", plan.gx) || busy;
    busy = follow("lift", plan.lift) || busy;
  }
  busy = follow("h", plan.h) || busy;
  if (!plan.moving && overOf(pose)) pose.h = Math.max(pose.h, plan.h); // never dips into the stack it is over
  const resting = !plan.moving && pose.h === plan.h && vel.h === 0;
  return { busy: busy || plan.moving, resting };
}

// which stack the scriber is over, if any
export function overOf(pose) {
  if (Math.abs(pose.gx - GX.f) < 0.05) return "f";
  if (Math.abs(pose.gx - GX.c) < 0.05) return "c";
  return null;
}

// the readout: three lines, from where the parts are
export function readoutOf(pose, goal, resting) {
  const s = SETTINGS[pose.cased];
  const l1 = `${s.name} · cells ${s.recorded}/${s.unevaluable} · bins ${s.bins[0]}/${s.bins[1]}`;
  const l2 = `Δ ${s.delta.toFixed(3)} bits/ex · supported classes ${s.supported}`;
  const over = overOf(pose);
  let l3 = "scriber raised";
  if (resting && over === "f") l3 = "frontier \u00b7 gauge zeroed \u00b7 0.000";
  else if (resting && over === "c") {
    const S = SETTINGS[pose.variant];
    l3 = goal.split === "shift" ? `shift \u00b7 g_shift ${fmt(S.gShift)} bits` : `test \u00b7 g_test ${fmt(S.gTest)} bits`;
  } else if (Math.abs(pose.lift - liftFor(goal.setting, goal.split)) > 0.02) l3 = goal.split === "shift" ? "riser up \u00b7 shift split" : "riser down \u00b7 test split";
  else if (over === null) l3 = "scriber travelling";
  else if (!planOf(pose, goal).moving) l3 = over === "f" ? "lowering onto frontier" : "lowering onto candidate";
  return [l1, l2, l3];
}

// the tour: each setting zeroes on the frontier, reads the candidate on test, then on shift; it starts on the rest pose
export const TOUR = [
  { setting: 2, at: "c", split: "shift", dwell: 3.2 },
  { setting: 0, at: "f", split: "test", dwell: 1.6 },
  { setting: 0, at: "c", split: "test", dwell: 2.2 },
  { setting: 0, at: "c", split: "shift", dwell: 2.2 },
  { setting: 1, at: "f", split: "test", dwell: 1.6 },
  { setting: 1, at: "c", split: "test", dwell: 2.4 },
  { setting: 1, at: "c", split: "shift", dwell: 2.6 },
  { setting: 2, at: "f", split: "test", dwell: 1.6 },
  { setting: 2, at: "c", split: "test", dwell: 2.4 },
];
export const REST_GOAL = { setting: TOUR[0].setting, at: TOUR[0].at, split: TOUR[0].split };
