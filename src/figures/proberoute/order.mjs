// Painter's order of the sixteen cords: wherever two cords or plugs overlap on screen, the nearer one is drawn later.
// Used by the static art, the live page (every frame a cord moves) and the build's audit.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as W from "./world.mjs";
import { P } from "./world.mjs";
const K = k.cameraOf(P).k;

function samplesOf(seat, pose, pegs) {
  const out = [];
  const [s0, s1] = W.visibleSpan(pose);
  for (let s = s0; s <= s1; s += 1.2) {
    const p = G.add3(pose.tip, G.mul3(pose.axis, s));
    out.push({ q: k.iso(p, P), d: k.depthOf(p, P), r: s < W.SLEEVE ? 1.1 : 2 });
  }
  // the seat cup travels with its cord in the drawing order
  const c = W.SEATS[seat];
  for (const z of [W.SHELF_Z + 0.5, W.CUP_TOP]) out.push({ q: k.iso([c.x, c.y, z], P), d: k.depthOf([c.x, c.y, z], P), r: W.CUP_R });
  const route = W.cordRoute(seat, pose, pegs);
  if (route) for (const p of G.resample(route, 1.4)) if (p[2] > W.CUP_TOP) out.push({ q: k.iso(p, P), d: k.depthOf(p, P), r: W.CORD_R });
  return out;
}
const boxOf = (list) => list.reduce((b, { q, r }) => [Math.min(b[0], q[0] - r * K), Math.min(b[1], q[1] - r * K), Math.max(b[2], q[0] + r * K), Math.max(b[3], q[1] + r * K)], [Infinity, Infinity, -Infinity, -Infinity]);

// +1 when a is in front of b where they overlap, -1 when behind, 0 when they do not overlap.
function facing(a, b) {
  let vote = 0;
  for (const p of a) for (const q of b) {
    const reach = (p.r + q.r) * K;
    const dx = p.q[0] - q.q[0];
    const dy = p.q[1] - q.q[1];
    if (dx * dx + dy * dy < reach * reach) vote += p.d > q.d ? 1 : -1;
  }
  return Math.sign(vote);
}

export function cordOrder(poses) {
  const n = poses.length;
  const pegs = W.pegsOf(poses);
  const samples = poses.map((pose, seat) => samplesOf(seat, pose, pegs));
  const boxes = samples.map(boxOf);
  const mean = samples.map((list) => list.reduce((sum, s) => sum + s.d, 0) / (list.length || 1));
  const after = Array.from({ length: n }, () => []);
  const before = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[0] > b[2] || b[0] > a[2] || a[1] > b[3] || b[1] > a[3]) continue;
      const f = facing(samples[i], samples[j]);
      if (f > 0) (after[j].push(i), before[i]++);
      else if (f < 0) (after[i].push(j), before[j]++);
    }
  const out = [];
  const done = new Array(n).fill(false);
  while (out.length < n) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && before[i] === 0 && (pick < 0 || mean[i] < mean[pick])) pick = i;
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || mean[i] < mean[pick])) pick = i; // a cycle: nearest-last
    done[pick] = true;
    out.push(pick);
    for (const j of after[pick]) before[j]--;
  }
  return out;
}
