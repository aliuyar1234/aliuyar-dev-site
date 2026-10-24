// Shortens the kit's absolute M/L/Z path data to relative, implicit-lineto form, and drops points that lie within
// TOL px of the chord through their neighbours (long straight pipe edges), so no visible point moves more than TOL.
// Deltas are taken between the already-rounded 0.1 coordinates, so nothing drifts.
// A filled path made of closed facets (a cylinder's shade band is one quad per facet) is merged into its outline:
// every edge two facets share runs once each way, so dropping both leaves the same winding number everywhere,
// and the nonzero fill covers exactly what it covered before.
const TOL = 0.1;
function simplify(points, closed = false) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = len ? ((px - ax) * dx + (py - ay) * dy) / (len * len) : 0;
      const d = t < 0 || t > 1 || !len ? Math.hypot(px - (t < 0 || !len ? ax : bx), py - (t < 0 || !len ? ay : by)) : Math.abs((px - ax) * dy - (py - ay) * dx) / len;
      if (d > worst) (worst = d), (at = i);
    }
    if (worst > TOL) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out = points.filter((_, i) => keep[i]);
  // a closed loop whose first and last points coincide: the closing Z draws that edge
  if (closed && out.length > 2 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}
const num = (v) => {
  const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t.replace(/^(-?)0\./, "$1.");
};

function join(tokens) {
  let out = "";
  let prev = "";
  for (const t of tokens) {
    const letter = /^[A-Za-z]$/.test(t) || /^[A-Za-z]$/.test(prev);
    if (!prev || letter || t[0] === "-" || (t[0] === "." && prev.includes("."))) out += t;
    else out += " " + t;
    prev = t;
  }
  return out;
}

function parse(d) {
  const subpaths = [];
  let current = null;
  for (const [, cmd, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (cmd === "Z") {
      if (current) current.closed = true;
      current = null;
      continue;
    }
    const v = (args.match(/-?\d*\.?\d+/g) || []).map((n) => Math.round(Number(n) * 10));
    for (let i = 0; i + 1 < v.length; i += 2) {
      if (cmd === "M" && i === 0) subpaths.push((current = { points: [[v[0], v[1]]], closed: false }));
      else if (current) current.points.push([v[i], v[i + 1]]);
    }
  }
  return subpaths;
}

// closed facets -> the loops of their boundary (integer coordinates in tenths)
function merge(subpaths) {
  const count = new Map();
  const key = (a, b) => `${a[0]},${a[1]},${b[0]},${b[1]}`;
  for (const { points } of subpaths)
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      if (p[0] === q[0] && p[1] === q[1]) return;
      const back = key(q, p);
      if (count.get(back) > 0) count.set(back, count.get(back) - 1);
      else count.set(key(p, q), (count.get(key(p, q)) || 0) + 1);
    });
  const out = new Map();
  for (const [edge, n] of count) {
    if (!n) continue;
    const [ax, ay, bx, by] = edge.split(",").map(Number);
    const from = `${ax},${ay}`;
    if (!out.has(from)) out.set(from, []);
    for (let j = 0; j < n; j++) out.get(from).push([bx, by]);
  }
  const loops = [];
  for (const [start, list] of out) {
    while (list.length) {
      const [sx, sy] = start.split(",").map(Number);
      const loop = [[sx, sy]];
      let at = start;
      for (let guard = 0; guard < 100000; guard++) {
        const next = out.get(at);
        if (!next || !next.length) break;
        const q = next.pop();
        at = `${q[0]},${q[1]}`;
        if (at === start) break;
        loop.push(q);
      }
      if (loop.length > 2) loops.push({ points: loop, closed: true });
    }
  }
  return loops;
}

function encode(subpaths, simplifyIt = true) {
  const tokens = [];
  for (const sub of subpaths) {
    const { closed } = sub;
    const points = simplifyIt ? simplify(sub.points.map(([x, y]) => [x / 10, y / 10]), closed) : sub.points.map(([x, y]) => [x / 10, y / 10]);
    if (!points.length) continue;
    let [x, y] = points[0];
    tokens.push("M", num(x), num(y));
    let started = false;
    for (const [px, py] of points.slice(1)) {
      const dx = Math.round((px - x) * 10) / 10;
      const dy = Math.round((py - y) * 10) / 10;
      if (dx === 0 && dy === 0) continue;
      if (!started) tokens.push("l"), (started = true);
      tokens.push(num(dx), num(dy));
      x = px;
      y = py;
    }
    if (closed) tokens.push("Z");
  }
  return join(tokens);
}

export function minifyD(d, { fill = false } = {}) {
  if (/[^MLZ0-9.\s-]/.test(d)) return d;
  let subpaths = parse(d);
  if (fill && subpaths.length > 1 && subpaths.every((s) => s.closed)) subpaths = merge(subpaths);
  return encode(subpaths);
}

// filled, unstroked (or stroked in their own fill colour) classes whose closed facets can be merged
const FILLED = /^(iso-fill|iso-shade|iso-top|iso-halo|tb-body|tb-shine|tb-shade|su-glass-fill)$/;
export function minifyPaths(html) {
  return html.replace(/<path class="([^"]*)"([^>]*?) d="([^"]*)"/g, (_, cls, rest, d) => `<path class="${cls}"${rest} d="${minifyD(d, { fill: FILLED.test(cls) })}"`).replace(/<path((?: (?!class=)[a-z-]+="[^"]*")*) d="([^"]*)"/g, (_, rest, d) => `<path${rest} d="${minifyD(d)}"`);
}
