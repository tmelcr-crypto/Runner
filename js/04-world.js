'use strict';
/* ---------- 4. WORLD (grid city, collision helpers, raycast) ---------- */
const B = [];      // B[i][j]: building rect or null (park)
const LOTS = [];   // LOTS[i][j]: { park, trees, pond }
const PALETTE = ['#ff3fb4', '#35d8ff', '#8a5cff', '#ffb02e', '#3dffa6', '#ff4d6d', '#4d7aff', '#b79cff', '#ff7a3d'];
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
/* ---------- city edges: each side is either a solid row of buildings or a lake with a beach ---------- */
const BEACH = 170, WADE = 26, EDGE_D = 240, MM = 260;     // beach width, how deep you may wade, edge building depth, minimap margin
const EDGE = { n: 'wall', s: 'wall', w: 'wall', e: 'wall' }, EDGE_KEYS = ['n', 's', 'w', 'e'];
let BX0 = 0, BX1 = W, BY0 = 0, BY1 = W, CX0 = 0, CX1 = W, CY0 = 0, CY1 = W;   // foot limits and car limits
function genEdges() {
  for (const k of EDGE_KEYS) EDGE[k] = Math.random() < 0.5 ? 'lake' : 'wall';
  if (!EDGE_KEYS.some(k => EDGE[k] === 'lake')) EDGE[pick(EDGE_KEYS)] = 'lake';
  const L = BEACH + WADE + 7, C = BEACH + 70;
  BX0 = EDGE.w === 'lake' ? -L : 0; BX1 = EDGE.e === 'lake' ? W + L : W; BY0 = EDGE.n === 'lake' ? -L : 0; BY1 = EDGE.s === 'lake' ? W + L : W;
  CX0 = EDGE.w === 'lake' ? -C : 0; CX1 = EDGE.e === 'lake' ? W + C : W; CY0 = EDGE.n === 'lake' ? -C : 0; CY1 = EDGE.s === 'lake' ? W + C : W;
}
function shoreDist(x, y) {                     // > 0 on land, < 0 in the water (only lake sides count)
  let d = 1e9;
  if (EDGE.w === 'lake') d = Math.min(d, x + BEACH); if (EDGE.e === 'lake') d = Math.min(d, W + BEACH - x);
  if (EDGE.n === 'lake') d = Math.min(d, y + BEACH); if (EDGE.s === 'lake') d = Math.min(d, W + BEACH - y);
  return d;
}
const inWater = (x, y) => shoreDist(x, y) < 0;
function genWorld() {
  genEdges();
  for (let i = 0; i < N; i++) {
    B[i] = []; LOTS[i] = [];
    for (let j = 0; j < N; j++) {
      const lx = i * CELL + ROAD, ly = j * CELL + ROAD;
      if (Math.random() < 0.13) {
        const trees = [];
        for (let k = 0; k < 9; k++) trees.push({ x: lx + rand(48, LOT - 48), y: ly + rand(48, LOT - 48), r: rand(9, 15) });
        B[i][j] = null; LOTS[i][j] = { park: true, trees, pond: Math.random() < 0.4 };
      } else {
        const c = pick(PALETTE);
        const r = { x: lx + SW, y: ly + SW, w: LOT - 2 * SW, h: LOT - 2 * SW, c, roof: shade(c, 28), wall: shade(c, -60), dets: [] };
        const n = randi(1, 4);
        for (let k = 0; k < n; k++) r.dets.push({ x: rand(8, r.w - 44), y: rand(8, r.h - 40), w: rand(18, 36), h: rand(14, 30), k: randi(0, 1) });
        B[i][j] = r; LOTS[i][j] = { park: false };
      }
    }
  }
}
function cornerPos(i, j, k) {
  const lx = i * CELL + ROAD, ly = j * CELL + ROAD;
  return k === 0 ? [lx + RING, ly + RING] : k === 1 ? [lx + LOT - RING, ly + RING] : k === 2 ? [lx + LOT - RING, ly + LOT - RING] : [lx + RING, ly + LOT - RING];
}

function circleRect(cx, cy, r, rc) {
  const px = clamp(cx, rc.x, rc.x + rc.w), py = clamp(cy, rc.y, rc.y + rc.h);
  const dx = cx - px, dy = cy - py, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 0.0001) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d }; }
  const l = cx - rc.x, rr = rc.x + rc.w - cx, t = cy - rc.y, b = rc.y + rc.h - cy, m = Math.min(l, rr, t, b);
  if (m === l) return { nx: -1, ny: 0, pen: r + l };
  if (m === rr) return { nx: 1, ny: 0, pen: r + rr };
  if (m === t) return { nx: 0, ny: -1, pen: r + t };
  return { nx: 0, ny: 1, pen: r + b };
}
const _nb = [];
function nearBuildings(x, y, out) {
  out.length = 0;
  const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++)
    if (i >= 0 && j >= 0 && i < N && j < N && B[i][j]) out.push(B[i][j]);
  return out;
}
// Push a circle {x,y} out of buildings and world bounds. Returns summed hit normal or null.
function resolveCircle(o, r) {
  let hit = null; nearBuildings(o.x, o.y, _nb);
  for (const rc of _nb) {
    const h = circleRect(o.x, o.y, r, rc);
    if (h) { o.x += h.nx * h.pen; o.y += h.ny * h.pen; hit = hit || { nx: 0, ny: 0 }; hit.nx += h.nx; hit.ny += h.ny; }
  }
  if (o.x < BX0 + r) { o.x = BX0 + r; hit = hit || { nx: 0, ny: 0 }; hit.nx += 1; } else if (o.x > BX1 - r) { o.x = BX1 - r; hit = hit || { nx: 0, ny: 0 }; hit.nx -= 1; }
  if (o.y < BY0 + r) { o.y = BY0 + r; hit = hit || { nx: 0, ny: 0 }; hit.ny += 1; } else if (o.y > BY1 - r) { o.y = BY1 - r; hit = hit || { nx: 0, ny: 0 }; hit.ny -= 1; }
  return hit;
}
function rayRect(ox, oy, dx, dy, rc) {
  let t0 = 0, t1 = Infinity;
  for (let a = 0; a < 2; a++) {
    const o = a ? oy : ox, d = a ? dy : dx, mn = a ? rc.y : rc.x, mx = mn + (a ? rc.h : rc.w);
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return Infinity; }
    else { let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return Infinity; }
  }
  return t0;
}
function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const tca = (cx - ox) * dx + (cy - oy) * dy; if (tca < 0) return Infinity;
  const d2 = (cx - ox) * (cx - ox) + (cy - oy) * (cy - oy) - tca * tca; if (d2 > r * r) return Infinity;
  return tca - Math.sqrt(r * r - d2);
}
function buildingsAlong(x1, y1, x2, y2, fn) {
  const i0 = Math.floor(Math.min(x1, x2) / CELL), i1 = Math.floor(Math.max(x1, x2) / CELL);
  const j0 = Math.floor(Math.min(y1, y2) / CELL), j1 = Math.floor(Math.max(y1, y2) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (i >= 0 && j >= 0 && i < N && j < N && B[i][j]) fn(B[i][j]);
}
function losClear(x1, y1, x2, y2) {
  const d = dist(x1, y1, x2, y2); if (d < 1) return true;
  const dx = (x2 - x1) / d, dy = (y2 - y1) / d; let clear = true;
  buildingsAlong(x1, y1, x2, y2, rc => { const t = rayRect(x1, y1, dx, dy, rc); if (t < d) clear = false; });
  return clear;
}

