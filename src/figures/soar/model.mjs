// Fig 7 · the projector's state, its motion and its readout. Pure: shared by art, build (audit) and live.
import D from "./data.mjs";

const f4 = (v) => v.toFixed(4);
const n = D.test.toLocaleString("en-US");

// a scene is what the operator has asked for; the sim moves the parts there in a safe order
//   sel   the overlay contract on test (J or Q)
//   down  the leaf folded onto S (J, Q or null: both lifted, prompt-only)
//   ref   the direct-adapter sheet slid in beside the stack (J, Q or null)
//   focus head travel on the rack, in units
export const REST = { sel: "J", down: "J", ref: "J", focus: 0 };

export const TOUR = [
  [0.0, { sel: "J", down: null, ref: null, focus: 0 }],
  [1.0, { ref: "J" }],
  [3.6, { down: "J" }],
  [8.6, { focus: 4 }],
  [10.6, { focus: 0, ref: null }],
  [12.6, { down: null }],
  [14.6, { sel: "Q", ref: "Q" }],
  [17.2, { down: "Q" }],
  [22.2, { focus: -3 }],
  [24.2, { focus: 0, ref: null }],
  [26.2, { down: null }],
];
export const LOOP = 28.4;

export function sceneAt(t) {
  const clock = ((t % LOOP) + LOOP) % LOOP;
  let scene = {};
  for (const [at, step] of TOUR) if (at <= clock) scene = { ...scene, ...step };
  return scene;
}

// a raised leaf swings past vertical and leans back 110° onto its stop posts, clear of the head
export const UP = 11 / 9;
// at or past this a leaf stands out of the other leaf's sweep (they would meet below about 0.91)
const CLEAR = 0.95;

// targets for one frame: one overlay at a time, never both. The leaf asked down swings to vertical at once
// and goes on down as soon as the other leaf has risen past CLEAR, so a switch runs as one movement.
export function targetsOf(scene, pose, vel) {
  const leaf = (k, other) => (scene.down !== k ? UP : pose[other] >= CLEAR && !(vel && vel[other] < -1e-3) ? 0 : 1);
  return {
    lj: leaf("J", "lq"),
    lq: leaf("Q", "lj"),
    rj: scene.ref === "J" ? 0 : 1,
    rq: scene.ref === "Q" ? 0 : 1,
    fz: scene.focus,
  };
}

// critically damped follow: no overshoot, velocity continuous
const TAU = { lj: 0.24, lq: 0.24, rj: 0.26, rq: 0.26, fz: 0.34 };
export function step(pose, vel, target, dt, calm) {
  let moving = false;
  for (const key of Object.keys(TAU)) {
    if (calm) {
      pose[key] = target[key];
      vel[key] = 0;
      continue;
    }
    const w = 1 / TAU[key];
    for (let i = 0; i < 4; i++) {
      vel[key] += (w * w * (target[key] - pose[key]) - 2 * w * vel[key]) * (dt / 4);
      pose[key] += vel[key] * (dt / 4);
    }
    if (Math.abs(target[key] - pose[key]) < 1e-4 && Math.abs(vel[key]) < 1e-4) {
      pose[key] = target[key];
      vel[key] = 0;
    } else moving = true;
  }
  return moving;
}

export const poseOf = (scene) => {
  const pose = { lj: UP, lq: UP, rj: 1, rq: 1, fz: 0 };
  for (let i = 0; i < 2; i++) Object.assign(pose, targetsOf(scene, pose));
  return pose;
};

// what the stack holds right now, read from where the parts are
const raised = (v) => v > UP - 0.02;
export function stackOf(pose) {
  if (pose.lj < 0.02) return "J";
  if (pose.lq < 0.02) return "Q";
  if (raised(pose.lj) && raised(pose.lq)) return "prompt";
  return "moving";
}

// a lane's lamp lights once its reference sheet is in: green over its own residual, red over the prompt-only stack
export function lampsOf(pose, scene) {
  const up = raised(pose.lj) && raised(pose.lq);
  const lamp = (k, r, l) => (pose[r] > 0.02 ? "" : pose[l] < 0.02 ? "green" : up && scene.sel === k ? "red" : "");
  return { J: lamp("J", "rj", "lj"), Q: lamp("Q", "rq", "lq") };
}

export function readoutOf(pose, scene) {
  const stack = stackOf(pose);
  if (stack === "moving") {
    // name the movement the operator asked for: the leaf going down, else the one still rising
    const k = scene.down && pose["l" + scene.down.toLowerCase()] >= 0.02 ? scene.down : raised(pose.lj) ? "Q" : "J";
    return [scene.down === k ? `folding R_${k} onto S` : `lifting R_${k} off S`, `ΔR_${k} = TSVD(ΔF_${k} − ${D.beta.toFixed(1)}·ΔS)`];
  }
  const k = stack === "prompt" ? scene.sel : stack;
  const o = D.overlays[k];
  const vs = (k === "J" ? pose.rj : pose.rq) < 0.02;
  if (stack === "prompt") {
    return vs
      ? [`prompt vs F_${k} · ${o.metric} ${f4(o.prompt)} / ${f4(o.direct)}`, `answer F1 ${f4(o.promptF1)} / ${f4(o.directF1)} · prompt-only S`]
      : [`prompt-only S · ${o.metric} ${f4(o.prompt)}`, `answer F1 ${f4(o.promptF1)} · ${o.contract} in prompt`];
  }
  return vs
    ? [`S + R_${k} vs F_${k} · ${o.metric} ${f4(o.soar)} / ${f4(o.direct)}`, `answer F1 ${f4(o.soarF1)} / ${f4(o.directF1)} · recovery ${f4(o.recovery)}`]
    : [`S + R_${k} · ${o.metric} ${f4(o.soar)}`, `answer F1 ${f4(o.soarF1)} · β ${D.beta.toFixed(1)} · n ${n}`];
}

// the accessible value: written when the state changes, not every frame
export function describe(pose, scene) {
  return readoutOf(pose, scene).join(", ").replace(/·/g, ",").replace(/_/g, " ");
}
