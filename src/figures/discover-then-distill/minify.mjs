// Fig 18 · shortens the kit's absolute M/L/Z path data to relative, implicit-lineto form (after certipatch's minifier).
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

// drops points that sit within EPS of the chord between their neighbours (Ramer–Douglas–Peucker)
const EPS = 0.12;
function simplify(points, closed) {
  const pts = closed ? [...points, points[0]] : points;
  if (pts.length < 4) return points;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay);
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const dist = len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > worst) (worst = dist), (at = i);
    }
    if (worst > EPS) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out = pts.filter((_, i) => keep[i]);
  return closed ? out.slice(0, -1) : out;
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
    const { closed } = sub;
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

// facets of one tone that share an edge become one polygon (the kit emits one quad per facet)
function polygonsOf(d) {
  const out = [];
  for (const [, body] of d.matchAll(/M([^M]*)/g)) {
    if (!/Z\s*$/.test(body)) return null;
    const v = (body.match(/-?\d*\.?\d+/g) || []).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push([Math.round(v[i] * 10) / 10, Math.round(v[i + 1] * 10) / 10]);
    out.push(pts);
  }
  return out;
}
const key = ([x, y]) => `${x},${y}`;
function mergeOnce(polys) {
  for (let i = 0; i < polys.length; i++) {
    const A = polys[i];
    const edges = new Map();
    A.forEach((p, n) => edges.set(key(p) + ">" + key(A[(n + 1) % A.length]), n));
    for (let j = i + 1; j < polys.length; j++) {
      const B = polys[j];
      for (let m = 0; m < B.length; m++) {
        const q = B[m];
        const r = B[(m + 1) % B.length];
        const n = edges.get(key(r) + ">" + key(q));
        if (n === undefined) continue;
        // A: ... A[n]=r, A[n+1]=q ... ; B: ... B[m]=q, B[m+1]=r ...
        const merged = [];
        for (let t = 0; t <= n; t++) merged.push(A[t]);
        for (let t = 2; t < B.length; t++) merged.push(B[(m + t) % B.length]);
        for (let t = n + 1; t < A.length; t++) merged.push(A[t]);
        polys.splice(j, 1);
        polys[i] = merged.filter((p, t, all) => key(p) !== key(all[(t + 1) % all.length]));
        return true;
      }
    }
  }
  return false;
}
export function mergeFacets(d) {
  const polys = polygonsOf(d);
  if (!polys || polys.length < 2 || polys.length > 80) return d;
  while (mergeOnce(polys));
  return polys.map((pts) => "M" + pts.map(([x, y]) => `${x} ${y}`).join("L") + "Z").join("");
}

export function minifyPaths(html) {
  return html
    .replace(/(<path class="iso-shade" data-shade="\d") d="([^"]*)"/g, (_, head, d) => `${head} d="${mergeFacets(d)}"`)
    .replace(/ d="([^"]*)"/g, (_, d) => ` d="${minifyD(d)}"`);
}
