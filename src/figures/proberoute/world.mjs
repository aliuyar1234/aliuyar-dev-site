// Fig 10 world: the cord switchboard's layout, its camera, and the poses of the cords.
// Pure ESM shared by art.mjs (static), live.js (browser) and build.mjs (audit).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import D from "./data.mjs";

export const WIDTH = 600;
export const HEIGHT = 540;

// x along the board, y toward the operator, z up; about 1 unit per px of the real thing.
export const BENCH = { x: -142, y: -64, w: 284, d: 146, r: 9 };
export const BENCH_H = 10;
export const FOOT_H = 6;
export const PLINTH = { x: -114, y: -48, w: 228, d: 94, r: 2 };
export const PLINTH_H = 5;
export const SHELF_Z = 58; // keyshelf top
export const SHELF = { x: -119, y: -48, w: 238, d: 96, r: 2.5 };
export const ARM = { x: -120, y: 48, w: 240, d: 8, r: 3.6 }; // the bullnose armrest along the shelf front
export const TOP_Z = 166; // top of the upper cabinet
export const FACE_Y = -2; // the recessed jack-field plate
export const STILE_Y = 2; // the stiles stand proud of the plate

// Jack field: one column per layer of the frozen Pythia-1B, one row per horizon h.
export const L = D.layers;
export const H = D.horizons;
export const colX = (layer) => -95 + 11 * layer;
export const HEAD_X = 92;
export const lampZ = (h) => 155 - 19 * h; // h = 0..3 for h = 1..4
export const jackZ = (h) => lampZ(h) - 8.6;
export const JACK_FRONT = 1; // jack strip face
export const BUSH = 1; // bushing proud of the strip
export const LAMP_FRONT = 0.2;

// Plug seats: four groups of four, one group per horizon head, h = 4 at the left and h = 1 at the right. Each group
// sits one step further out than the last, so the cords of each row run down in their own sheet, every sheet
// lying outside the rows below it: cords of different rows never meet.
export const CUP_R = 2.7;
export const CUP_TOP = SHELF_Z + 3.4;
export const seatY = (head) => 21 + 3.5 * (3 - head);
export const groupX = (head) => -27 + 26 * (3 - head); // left cup of the head's group
export const SEATS = [];
for (let g = 0; g < 4; g++) for (let j = 0; j < 4; j++) SEATS.push({ head: 3 - g, slot: j, x: groupX(3 - g) + j * 6, y: seatY(3 - g) });
export const seatsOf = (head) => SEATS.map((s, i) => (s.head === head ? i : -1)).filter((i) => i >= 0);

// The plug, tip at s = 0 and tail at s = PLUG_LEN: tip, ring, sleeve, collar, shell, strain relief.
export const PLUG = [
  [0, 0.5], [0.35, 0.92], [1.15, 0.92], [1.15, 0.55], [1.7, 0.55], [1.7, 0.98], [3.2, 0.98], [3.2, 0.66], [3.7, 0.66],
  [3.7, 1.22], [9, 1.22], [9, 1.92], [9.9, 1.92], [9.9, 2.05], [18.6, 2.05], [18.6, 1.45], [20.6, 1.18], [22.4, 0.98], [22.4, 0],
];
export const PLUG_LEN = 22.4;
export const SLEEVE = 9; // tip to collar: what the jack swallows
export const STOW_SHOW = 9.9; // plug length standing above the seat cup when stowed
export const CORD_R = 0.75;

// The plug's visible profile between s0 and s1 (the rest is inside a jack or a seat cup).
export function plugProfile(s0, s1) {
  const lo = Math.max(0, s0);
  const hi = Math.min(PLUG_LEN, s1);
  const rAt = (s) => {
    for (let i = 0; i < PLUG.length - 1; i++) {
      const [a, ra] = PLUG[i];
      const [b, rb] = PLUG[i + 1];
      if (s >= a && s <= b && b > a) return ra + ((rb - ra) * (s - a)) / (b - a);
    }
    return PLUG[PLUG.length - 2][1];
  };
  const out = [[lo, lo === 0 ? PLUG[0][1] : rAt(lo + 1e-6)]];
  for (const [s, r] of PLUG) if (s > lo && s < hi) out.push([s, r]);
  out.push([hi, rAt(hi - 1e-6)]);
  // steps keep both radii at one s: drop exact duplicates only
  return out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
}

// Poses. A pose is { tip, axis } with axis pointing from the tip to the tail, plus the visible span.
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export function stowPose(seat) {
  const s = SEATS[seat];
  return { tip: [s.x, s.y, CUP_TOP + STOW_SHOW], axis: [0, 0, -1] };
}
export function jackPose(head, layer, out = 0) {
  return { tip: [colX(layer), JACK_FRONT + BUSH - SLEEVE + out, jackZ(head)], axis: [0, 1, 0] };
}
const LIFT = 14; // out of the seat: the tail clears the cup rim
const APPROACH = 10; // in front of the jack before the sleeve goes in
const OVER = 8; // the plug crosses to its column this far above its row
const lerp3 = (a, b, t) => G.add3(a, G.mul3(G.sub3(b, a), t));
const span = (u, a, b) => ease((u - a) / (b - a));
// u in 0..1 from the seat into jack (head, layer): up out of the seat, up in front of the shelf with the tip turning
// toward the board, across above its own row to its column, down to the jack, in.
export function patchPose(seat, head, layer, u) {
  const stow = stowPose(seat);
  const z = jackZ(head);
  const A = G.add3(stow.tip, [0, 0, LIFT]);
  const B = [stow.tip[0], stow.tip[1], Math.max(z + OVER, A[2] + 10)];
  const C = [colX(layer), JACK_FRONT + BUSH - SLEEVE + APPROACH, z + OVER];
  const E = jackPose(head, layer).tip;
  const Dp = jackPose(head, layer, APPROACH).tip;
  // the tip turns only once the tail is high enough to swing out over the shelf furniture
  const turnFrom = (Math.max(A[2], 72 + PLUG_LEN) - A[2]) / Math.max(1e-6, B[2] - A[2]);
  // a quarter turn from down to toward the operator, at an even rate of angle
  const axisAt = (t) => {
    const a = (Math.PI / 2) * ease((t - turnFrom) / Math.max(0.15, 1 - turnFrom));
    return [0, Math.sin(a), -Math.cos(a)];
  };
  if (u <= 0.14) return { tip: lerp3(stow.tip, A, span(u, 0, 0.14)), axis: [0, 0, -1] };
  if (u <= 0.44) {
    const t = span(u, 0.14, 0.44);
    return { tip: lerp3(A, B, t), axis: axisAt(t) };
  }
  if (u <= 0.74) return { tip: lerp3(B, C, span(u, 0.44, 0.74)), axis: [0, 1, 0] };
  if (u <= 0.86) return { tip: lerp3(C, Dp, span(u, 0.74, 0.86)), axis: [0, 1, 0] };
  return { tip: lerp3(Dp, E, span(u, 0.86, 1)), axis: [0, 1, 0] };
}
// The order a head's cords go in: a cord that will lean over a neighbour's seat waits until that neighbour is out.
export function patchOrder(head, layers) {
  const seats = seatsOf(head).filter((i) => layers[i] != null);
  const over = (i, j) => {
    const a = Math.min(SEATS[i].x, colX(layers[i])) - 3;
    const b = Math.max(SEATS[i].x, colX(layers[i])) + 3;
    return SEATS[j].x >= a && SEATS[j].x <= b;
  };
  const out = [];
  const left = new Set(seats);
  while (left.size) {
    const next = [...left].find((i) => ![...left].some((j) => j !== i && over(i, j))) ?? [...left][0];
    out.push(next);
    left.delete(next);
  }
  return out;
}
// What of the plug shows: a jack hides the part behind its bushing, a cup the part below its rim.
export function visibleSpan(pose) {
  const { tip, axis } = pose;
  let s0 = 0;
  let s1 = PLUG_LEN;
  if (axis[1] > 0.999 && tip[1] < JACK_FRONT + BUSH) s0 = JACK_FRONT + BUSH - tip[1];
  if (axis[2] < -0.999 && tip[2] - PLUG_LEN < CUP_TOP) s1 = tip[2] - CUP_TOP;
  return [s0, s1];
}
export const tailOf = (pose) => G.add3(pose.tip, G.mul3(pose.axis, PLUG_LEN));

// The cord, held taut by its counterweight: out of the strain relief along the plug, one sweeping bend, a straight run
// to just above its seat cup, and a short bend down into the bore. Where the run would pass through a plug standing in
// another seat it rides over that plug's tip, a string over a peg.
export const PEG_TOP = CUP_TOP + STOW_SHOW;
export const pegsOf = (poses) => poses.flatMap((p, i) => (p.axis[2] < -0.999 && Math.abs(p.tip[2] - PEG_TOP) < 1e-6 ? [i] : []));
const RIDE = PEG_TOP + CORD_R + 0.35; // a cord over a stowed plug: its centre line this high
const REACH = 1.22 + CORD_R + 0.45; // and it keeps this far off the plug's axis wherever it is lower
function drape(run, seat, pegs) {
  for (let pass = 0; pass < 6; pass++) {
    let worst = null;
    for (const j of pegs)
      for (let i = 0; i < run.length - 1; i++) {
        // the run's closest approach in plan to the plug's axis; within REACH it lies flat over the plug's tip
        const [p, q] = [run[i], run[i + 1]];
        const { x, y } = SEATS[j];
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const t = ((x - p[0]) * (q[0] - p[0]) + (y - p[1]) * (q[1] - p[1])) / L / L;
        const at = (u) => G.add3(p, G.mul3(G.sub3(q, p), Math.max(0.02, Math.min(0.98, u))));
        const ends = [at(t - REACH / L), at(t + REACH / L)];
        const c = at(t);
        const under = RIDE - Math.min(ends[0][2], ends[1][2]);
        if (j !== seat && Math.hypot(c[0] - x, c[1] - y) < REACH && under > 0 && !(worst?.under > under)) worst = { under, i, c: ends.map(([x, y]) => [x, y, RIDE]) };
      }
    if (!worst) break;
    run.splice(worst.i + 1, 0, ...worst.c);
  }
  return run;
}
export function cordRoute(seat, pose, pegs = []) {
  const s = SEATS[seat];
  const tail = tailOf(pose);
  const bottom = [s.x, s.y, SHELF_Z - 1.5];
  if (tail[2] < CUP_TOP + 0.6) return null; // still in the cup
  if (Math.abs(tail[0] - s.x) < 0.05 && Math.abs(tail[1] - s.y) < 0.05) return [tail, bottom];
  const entry = [s.x, s.y, CUP_TOP + 2.4]; // the run aims here, just above the cup
  // the bend takes the room the cord has ahead of the plug before it must head for its seat
  const lead = Math.max(3.6, Math.min(9, 0.62 * G.dot3(G.sub3(entry, tail), pose.axis)));
  const C = G.add3(tail, G.mul3(pose.axis, lead));
  const run = drape([C, entry], seat, pegs);
  const dir = G.unit3(G.sub3(run[1], C));
  const turn = Math.acos(Math.max(-1, Math.min(1, G.dot3(pose.axis, dir))));
  const cut = Math.min(lead - 0.6, 7 * Math.tan(turn / 2), 0.45 * G.pathLength(run.slice(0, 2)));
  const a = G.sub3(C, G.mul3(pose.axis, cut));
  const b = G.add3(C, G.mul3(dir, cut));
  const lerp = (p, q, t) => G.add3(p, G.mul3(G.sub3(q, p), t));
  const bend = Array.from({ length: 9 }, (_, i) => lerp(lerp(a, C, i / 8), lerp(C, b, i / 8), i / 8));
  return [tail, ...bend, ...G.fillet([b, ...run.slice(1), bottom], 3, 5).slice(1)];
}
// How far the cord is drawn out of the shelf. Under the seat the cord runs as a tackle of eight falls (a double
// sheave on the weight, two grooves to each sheave), so the weight rises an eighth of the cord drawn.
export function drawnOut(route) {
  if (!route) return 0;
  return Math.max(0, G.pathLength(route) - (CUP_TOP - SHELF_Z + 1.5));
}
export const WEIGHT_REST = 10; // weight bottom at rest
export const FALLS = 8;
export const liftOf = (route) => drawnOut(route) / FALLS;

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), ...k.boxCorners({ x: -120, y: -48, w: 240, d: 52, r: 0 }, 0, TOP_Z + 10), ...k.boxCorners({ x: -101, y: -19, w: 199, d: 14, r: 0 }, 0, TOP_Z + 21)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 54, elevation: 30 },
);

// Drawn shapes of the moving parts, shared by the static art and the live page.
export function plugPaths(pose) {
  const [s0, s1] = visibleSpan(pose);
  if (s1 - s0 < 0.2) return null;
  return G.solidOf(plugProfile(s0, s1), G.frameAlong(pose.tip, pose.axis), P, { steps: 22 });
}
// A cord is drawn as two strokes on one screen polyline: an edge stroke and a body stroke inside it.
export const r1 = (v) => Math.round(v * 10) / 10;
const pathD = (pts) => pts.map((p, i) => {
  const [x, y] = k.iso(p, P);
  return `${i ? "L" : "M"}${r1(x)} ${r1(y)}`;
}).join("");
export const cordD = (route) => (route ? pathD(route) : "");
export const CORD_W = 2 * CORD_R * k.cameraOf(P).k;

// Counterweights under the shelf: a cast weight on a stirrup with a double sheave, hung in the falls of its cord.
export const BAY_TOP = SHELF_Z - 5;
export const WEIGHT = { r: 2.4, h: 6.2, neck: 0.6, bar: 0.6, cheek: 4.4, sheave: 2 };
export const axleOf = (bottom) => bottom + WEIGHT.h + WEIGHT.neck + WEIGHT.bar + WEIGHT.cheek / 2;
// The falls: each sheave hangs in two bights of cord, one in each of its grooves, whose legs rise to the block rail.
export const GROOVES = [-0.22, 0.22];
export function fallsOf(seat, lift, grooves = GROOVES) {
  const s = SEATS[seat];
  const axle = axleOf(WEIGHT_REST + lift);
  const r = WEIGHT.sheave;
  return [-0.75, 0.75].flatMap((dx) => grooves.map((g) => {
    const x = s.x + dx + g;
    const bight = Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI + (i * Math.PI) / 8;
      return [x, s.y + r * Math.cos(a), axle + r * Math.sin(a)];
    });
    return [[x, s.y - r, RAIL_Z], ...bight, [x, s.y + r, RAIL_Z]];
  }));
}
export const fallsD = (seat, lift) => fallsOf(seat, lift, [0]).map(pathD).join("");
export const RAIL = { x: -109, y: 17.4, w: 218, d: 17.7, r: 0.6 };
export const RAIL_Z = BAY_TOP - 2.2;

// Seen from above the cord leaves a plug standing in its seat downward and is hidden behind it; a plug in a jack points
// its tail at the viewer and the cord comes out in front of it.
export const plugFirst = (pose) => k.depthOf(tailOf(pose), P) > k.depthOf(pose.tip, P);

// The dense multiple: one comb bar per row, seventeen plugs ganged on a bus bar that reach every layer's jack and the
// head's. Off duty the four combs lie stacked on a tray on the cabinet cap, h = 1 at the bottom; in dense mode each comb
// lifts off the stack, comes forward over the cornice, drops down in front of the field and pushes home into its row.
export const COMB = { x0: colX(0) - 5, x1: HEAD_X + 5, h: 3, d: 2.6, reach: 8 };
export const COMB_XS = [...Array.from({ length: L }, (_, l) => colX(l)), HEAD_X];
export const COMB_IN = JACK_FRONT + BUSH + 7; // the bar's back face with the gang plugs home: collars on the bushings
export const COMB_LANE = 15; // the bar's back face on the way down: tips clear of the cornice and the lamps
export const COMB_STAGGER = 0.7; // seconds between one comb setting off and the next
export const RACK_Y = -8.5;
export const CAP_TOP = TOP_Z + 7.4;
export const TRAY_Z = CAP_TOP + 0.6;
export const rackZ = (h) => TRAY_Z + COMB.h / 2 + COMB.h * h;
// Gang plug, tip at s = 0: a short tip that goes into the jack (hidden behind the collar once home), a collar that
// lands on the jack's bushing, the shell, and a flange on the bar.
export const GANG = [[0, 0.5], [0.25, 0.8], [1, 0.8], [1, 1.3], [1.8, 1.3], [1.8, 1.05], [7.4, 1.05], [7.4, 1.25], [8, 1.25], [8, 0]];
// Comb h at time t of its trip from the tray (t = 0) to its row (t = combTime(h)): [y of the bar's back face, centre z].
const combLegs = (h) => {
  const up = rackZ(h) + 1.2;
  return [[RACK_Y, rackZ(h), 0], [RACK_Y, up, 0.2], [COMB_LANE, up, 0.45], [COMB_LANE, jackZ(h), 0.3 + (up - jackZ(h)) / 110], [COMB_IN, jackZ(h), 0.35]];
};
export const combTime = (h) => combLegs(h).reduce((sum, leg) => sum + leg[2], 0);
export function combAt(h, t) {
  const legs = combLegs(h);
  for (let i = 1; i < legs.length; i++) {
    const [y0, z0] = legs[i - 1];
    const [y1, z1, d] = legs[i];
    if (t <= d || i === legs.length - 1) {
      const u = ease(t / d);
      return [y0 + (y1 - y0) * u, z0 + (z1 - z0) * u];
    }
    t -= d;
  }
}
// Combs at rest first, lowest first (a comb on the stack covers the one under it), then the ones on their way.
export function combOrder(comb) {
  const key = (h) => (comb[h] > 0 && comb[h] < combTime(h) ? 1000 : 0) + combAt(h, comb[h])[1];
  return [0, 1, 2, 3].sort((a, b) => key(a) - key(b));
}
