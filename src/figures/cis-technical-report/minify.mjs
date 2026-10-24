// Shortens the kit's absolute M/L/Z path data to relative, implicit-lineto form.
// Deltas are taken between the already-rounded 0.1 coordinates, so nothing drifts.
// Fig 22 adds two lossless-to-the-eye steps: polylines are thinned where they deviate less than TOL px from
// a straight chord (the kit samples curves at 1.5 px), and a shade path's strip of edge-sharing quads becomes one polygon.
const TOL = 0.2;
const same = (a, b) => Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;
function thin(points, from, to, keep) {
  const [ax, ay] = points[from];
  const [bx, by] = points[to];
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-9;
  let worst = -1, at = -1;
  for (let i = from + 1; i < to; i++) {
    const [px, py] = points[i];
    const d = Math.abs((px - ax) * dy - (py - ay) * dx) / len;
    if (d > worst) (worst = d), (at = i);
  }
  if (worst > TOL) {
    keep[at] = true;
    thin(points, from, at, keep);
    thin(points, at, to, keep);
  }
}
function simplify(points, closed) {
  if (points.length < 4) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  if (closed) {
    let far = 0, best = -1;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
      if (d > best) (best = d), (far = i);
    }
    keep[far] = true;
    thin(points, 0, far, keep);
    const ring = [...points.slice(far), points[0]];
    const keep2 = new Array(ring.length).fill(false);
    thin(ring, 0, ring.length - 1, keep2);
    keep2.forEach((k, i) => k && (keep[far + i] = keep[far + i] || i < ring.length - 1));
    keep[points.length - 1] = true;
  } else thin(points, 0, points.length - 1, keep);
  return points.filter((_, i) => keep[i]);
}
// quads q (p0 p1 p2 p3) chain when the next one's left edge (p0, p3) is this one's right edge (p1, p2)
function mergeQuads(subpaths) {
  if (subpaths.length < 2 || !subpaths.every((s) => s.closed && s.points.length === 4)) return subpaths;
  const quads = subpaths.map((s) => s.points);
  const used = new Array(quads.length).fill(false);
  const next = quads.map((q) => quads.findIndex((r, j) => r !== q && same(r[0], q[1]) && same(r[3], q[2])));
  const hasPrev = new Array(quads.length).fill(false);
  next.forEach((j) => j >= 0 && (hasPrev[j] = true));
  const out = [];
  const chainFrom = (i) => {
    const chain = [];
    for (let j = i; j >= 0 && !used[j]; j = next[j]) (used[j] = true), chain.push(quads[j]);
    const bottom = [chain[0][0], ...chain.map((q) => q[1])];
    const top = [...chain.map((q) => q[2]).reverse(), chain[0][3]];
    out.push({ points: [...bottom, ...top], closed: true });
  };
  quads.forEach((_, i) => !hasPrev[i] && !used[i] && chainFrom(i));
  quads.forEach((_, i) => !used[i] && chainFrom(i));
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

export function minifyD(d, merge = false) {
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
  const list = (merge ? mergeQuads(subpaths) : subpaths).map(({ points, closed }) => ({ points: simplify(points, closed), closed }));
  for (const { points, closed } of list) {
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
  return html.replace(/<path([^>]*?) d="([^"]*)"/g, (_, attrs, d) => `<path${attrs} d="${minifyD(d, /iso-shade/.test(attrs))}"`);
}
