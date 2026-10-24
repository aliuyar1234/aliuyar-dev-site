// Fig 14: shortens the kit's absolute M/L/Z path data to relative, implicit-lineto form,
// dropping points that lie within TOL of the line through their neighbours (Douglas-Peucker; end points always stay).
// Deltas are taken between the already-rounded 0.1 coordinates, so nothing drifts.
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

const TOL = 0.12;
function simplify(points, closed) {
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
    const l = Math.hypot(dx, dy);
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dist = l < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((px - ax) * dy - (py - ay) * dx) / l;
      if (dist > worst) (worst = dist), (at = i);
    }
    if (worst > TOL) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out = points.filter((_, i) => keep[i]);
  return closed && out.length < 3 ? points : out;
}

export function minifyD(d) {
  if (/[^MLZ0-9.\s-]/.test(d)) return d;
  const subpaths = [];
  let current = null;
  for (const [, cmd, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (cmd === "Z") {
      if (current) current.closed = true;
      current = null;
      continue;
    }
    const v = (args.match(/-?\d*\.?\d+/g) || []).map((n) => Math.round(Number(n) * 10) / 10);
    for (let i = 0; i + 1 < v.length; i += 2) {
      if (cmd === "M" && i === 0) subpaths.push((current = { points: [[v[0], v[1]]], closed: false }));
      else if (current) current.points.push([v[i], v[i + 1]]);
    }
  }
  const tokens = [];
  for (const sub of subpaths) {
    const closed = sub.closed;
    const points = simplify(sub.points, closed);
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

export function minifyPaths(html) {
  return html.replace(/ d="([^"]*)"/g, (_, d) => ` d="${minifyD(d)}"`);
}
