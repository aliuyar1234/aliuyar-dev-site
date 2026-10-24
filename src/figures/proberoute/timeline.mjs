// Fig 10 timeline for the audit: every cord flight the live page can play, sampled every 0.1 s.
import { plan, stepTime, stepPose, posesOf, liftsOf, EMPTY, PROBE, RANDOM, FLIGHT, GAP } from "./model.mjs";
import { cordOrder } from "./order.mjs";
import { seatsOf } from "./world.mjs";

export function transitions() {
  const out = [["probe in", EMPTY, PROBE], ["probe out", PROBE, EMPTY]];
  RANDOM.forEach((R, n) => {
    out.push([`random#${n + 1} in`, EMPTY, R], [`random#${n + 1} to probe`, R, PROBE], [`probe to random#${n + 1}`, PROBE, R]);
  });
  // a ring key on the finished board: pull one head, then patch it again
  for (let h = 0; h < 4; h++) {
    const pulled = PROBE.map((l, i) => (seatsOf(h).includes(i) ? null : l));
    out.push([`pull h${h + 1}`, PROBE, pulled], [`repatch h${h + 1}`, pulled, PROBE]);
  }
  return out;
}

export function* frames(from, to, dt = 0.1) {
  let layers = [...from];
  for (const step of plan(from, to)) {
    const total = stepTime(step);
    for (let t = 0; t <= total + 1e-9; t += dt) {
      const poses = posesOf(step.kind === "in" ? layers.map((l, i) => (step.seats.includes(i) ? null : l)) : layers);
      const flying = [];
      step.seats.forEach((seat, n) => {
        poses[seat] = stepPose(step, n, t);
        const u = (t - n * GAP) / FLIGHT;
        if (u > 0 && u < 1) flying.push(seat);
      });
      if (!flying.length) continue;
      yield { label: `h${step.head + 1} ${step.kind} t=${t.toFixed(1)}`, state: { poses, order: cordOrder(poses), lift: liftsOf(poses), comb: [0, 0, 0, 0], keys: {}, flying } };
    }
    for (const seat of step.seats) layers[seat] = step.kind === "in" ? step.layers[seat] : null;
  }
}
