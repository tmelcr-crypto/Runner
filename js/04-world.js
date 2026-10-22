'use strict';
/* ---------- 4. WORLD (bay map, collision helpers, water, road graph) ---------- */
const PALETTE = ['#ff3fb4', '#35d8ff', '#8a5cff', '#ffb02e', '#3dffa6', '#ff4d6d', '#4d7aff', '#b79cff', '#ff7a3d'];
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
const WADE = 26, SEA = 1400;                                  // how deep you may wade; open sea kept around the map
const BX0 = -SEA, BX1 = MW + SEA, BY0 = -SEA, BY1 = MH + SEA; // hard limits for people
const CX0 = BX0, CX1 = BX1, CY0 = BY0, CY1 = BY1;             // and for cars (they sink long before)

/* ---------- spatial hash: buildings, bridge rails, road segments ---------- */
const HS = 320;
let _qs = 0;
function Hash() { this.m = new Map(); }
Hash.prototype.add = function (o, x0, y0, x1, y1) {
  const a0 = Math.floor((x0 + SEA) / HS), a1 = Math.floor((x1 + SEA) / HS), b0 = Math.floor((y0 + SEA) / HS), b1 = Math.floor((y1 + SEA) / HS);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) { const k = a * 1024 + b; let l = this.m.get(k); if (!l) this.m.set(k, l = []); l.push(o); }
};
Hash.prototype.query = function (x0, y0, x1, y1, out) {
  out.length = 0; const q = ++_qs;
  const a0 = Math.floor((x0 + SEA) / HS), a1 = Math.floor((x1 + SEA) / HS), b0 = Math.floor((y0 + SEA) / HS), b1 = Math.floor((y1 + SEA) / HS);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const l = this.m.get(a * 1024 + b); if (!l) continue;
    for (const o of l) if (o._q !== q && !o.off) { o._q = q; out.push(o); }     // off: a prop thrown away from here
  }
  return out;
};
// Solids are boxes that may be turned by angle a: centre (cx, cy), size lw x lh; x, y, w, h hold their axis-aligned bounds.
let BLD = [], SOLIDS = [], DRAW = [];                          // buildings; everything solid; everything the streamer builds near the player
const bHash = new Hash(), rHash = new Hash(), sHash = new Hash();
function makeSolid(cx, cy, w, h, a, extra) {
  const ca = Math.cos(a), sa = Math.sin(a), ex = Math.abs(ca) * w / 2 + Math.abs(sa) * h / 2, ey = Math.abs(sa) * w / 2 + Math.abs(ca) * h / 2;
  const s = Object.assign({ cx, cy, lw: w, lh: h, a, ca, sa, loc: { x: -w / 2, y: -h / 2, w, h }, x: cx - ex, y: cy - ey, w: 2 * ex, h: 2 * ey }, extra);
  SOLIDS.push(s); bHash.add(s, s.x, s.y, s.x + s.w, s.y + s.h); return s;
}
const RAILS = [], BRIDGES = [];                                // rail segments {x1, y1, x2, y2}; bridge spans {e, s0, s1}

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
const RAIL_T = 3;
function circleSeg(cx, cy, r, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy || 1, t = clamp(((cx - s.x1) * dx + (cy - s.y1) * dy) / l2, 0, 1);
  const px = s.x1 + dx * t, py = s.y1 + dy * t, ex = cx - px, ey = cy - py, d = Math.hypot(ex, ey), rr = r + RAIL_T;
  if (d >= rr) return null;
  if (d > 0.001) return { nx: ex / d, ny: ey / d, pen: rr - d };
  return { nx: -dy / Math.sqrt(l2), ny: dx / Math.sqrt(l2), pen: rr };
}
function circleSolid(px, py, r, s) {                            // circleRect in the box's own frame
  const dx = px - s.cx, dy = py - s.cy, h = circleRect(dx * s.ca + dy * s.sa, -dx * s.sa + dy * s.ca, r, s.loc);
  if (!h) return null; const nx = h.nx * s.ca - h.ny * s.sa, ny = h.nx * s.sa + h.ny * s.ca; h.nx = nx; h.ny = ny; return h;
}
function raySolid(ox, oy, dx, dy, s) {
  const lx = ox - s.cx, ly = oy - s.cy;
  return rayRect(lx * s.ca + ly * s.sa, -lx * s.sa + ly * s.ca, dx * s.ca + dy * s.sa, -dx * s.sa + dy * s.ca, s.loc);
}
function inSolid(px, py, s, m) { const dx = px - s.cx, dy = py - s.cy; return Math.abs(dx * s.ca + dy * s.sa) < s.lw / 2 + m && Math.abs(-dx * s.sa + dy * s.ca) < s.lh / 2 + m; }
const _nb = [], _nr = [];
function nearBuildings(x, y, out) { return bHash.query(x - 40, y - 40, x + 40, y + 40, out); }
function nearRails(x, y, out) { return rHash.query(x - 40, y - 40, x + 40, y + 40, out); }
// Push a circle {x,y} out of buildings, bridge rails, deep water and the world bounds. Returns summed hit normal or null.
function resolveCircle(o, r) {
  let hit = null;
  const push = h => { o.x += h.nx * h.pen; o.y += h.ny * h.pen; hit = hit || { nx: 0, ny: 0 }; hit.nx += h.nx; hit.ny += h.ny; };
  nearBuildings(o.x, o.y, _nb); for (const rc of _nb) { if (rc.gate || rc.walk || rc.barrier || !solidAt(rc, zOf(o)) || (rc.bld && rc.H && zOf(o) > rc.H - 1)) continue; const h = circleSolid(o.x, o.y, r, rc); if (h) push(h); }   // solidAt: a car park wall at another height (js/10k)   // people duck under gates and barriers, through turnstiles
  if (!o.swim) { nearRails(o.x, o.y, _nr); for (const s of _nr) { const h = circleSeg(o.x, o.y, r, s); if (h) push(h); } }   // swimming: under the bridges, out to sea (js/08zv)
  const sd = shoreDist(o.x, o.y);
  if (sd < -WADE && !o.swim) { const g = shoreGrad(o.x, o.y); push({ nx: g[0], ny: g[1], pen: -WADE - sd }); }
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
const _ba = [];
function buildingsAlong(x1, y1, x2, y2, fn) {
  bHash.query(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), _ba);
  for (const rc of _ba) if (!rc.gate && !rc.fence) fn(rc);       // a gate's boom and the airport fence stop cars, not bullets or eyes
}
function losClear(x1, y1, x2, y2, hardOnly) {                 // hardOnly: only buildings and landmarks block, not the props a rifle round goes through
  const d = dist(x1, y1, x2, y2); if (d < 1) return true;
  const dx = (x2 - x1) / d, dy = (y2 - y1) / d; let clear = true;
  buildingsAlong(x1, y1, x2, y2, rc => { if (hardOnly && softSolid(rc)) return; const t = raySolid(x1, y1, dx, dy, rc); if (t < d) clear = false; });
  return clear;
}
const softSolid = rc => !!(rc.clutter || rc.soft);             // dumpsters, crates, AC units, pumps, fountains, cranes, containers, planes, sign posts

/* ---------- water: signed distance to the shore, sampled from a field built from the land polygons ---------- */
const FR = 14;                                                 // field cell size in world units
let FW = 0, FH = 0, FIELD = null, BFIELD = null, SHORE_LAND = null;   // BFIELD: the water for boats and swimmers (bridges open)
function traceRing(g, ring) { g.moveTo(ring[0][0], ring[0][1]); for (let k = 1; k < ring.length; k++) g.lineTo(ring[k][0], ring[k][1]); g.closePath(); }
function buildShoreField() {
  FW = Math.ceil((MW + 2 * SEA) / FR); FH = Math.ceil((MH + 2 * SEA) / FR);
  const c = document.createElement('canvas'); c.width = FW; c.height = FH; const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, FW, FH); g.setTransform(1 / FR, 0, 0, 1 / FR, SEA / FR, SEA / FR); g.fillStyle = '#fff';
  for (const p of MAP.land) { g.beginPath(); traceRing(g, p.o); for (const h of p.h) traceRing(g, h); g.fill('evenodd'); }
  for (const s of Object.values(MAP.safe || {})) for (const b of [s.deck, s.plank]) if (b) g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);   // the houseboat's deck and gangplank: walked on like land (js/10l)
  const gv = MAP.lunapark && MAP.lunapark.grove; if (gv) for (const b of [gv.pier, gv.head]) g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);   // the grove's pier: walked on like land (js/10m)
  const pz = MAP.prison; if (pz) for (const b of [pz.pier, pz.head, pz.mpier, pz.mhead]) g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);   // Iron Key's piers (js/10u)
  if (MAP.marina) for (const b of MAP.marina.piers) g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);   // Sunset Harbor's piers and fuel dock (js/08zv)
  for (const j of MAP.jetties || []) {                            // the small jetties round the coast (js/10x): the walkway and its T
    g.save(); g.translate(j.x, j.y); g.rotate(j.a * Math.PI / 180); g.fillRect(-24, -j.w / 2, j.len + 24, j.w); g.fillRect(j.len - j.head[1], -j.head[0] / 2, j.head[1], j.head[0]); g.restore();
  }
  const px = g.getImageData(0, 0, FW, FH).data, n = FW * FH, land = SHORE_LAND = new Uint8Array(n);
  for (let i = 0; i < n; i++) land[i] = px[i * 4] > 127 ? 1 : 0;
  FIELD = fieldOf(land);
}
function fieldOf(land) {                                       // signed distance (world units) from each cell to the shore
  const n = FW * FH;
  const toOther = cls => {                                     // chamfer distance (cells) from each cell to the nearest cell not of class cls
    const d = new Float32Array(n), D = Math.SQRT2;
    for (let i = 0; i < n; i++) d[i] = land[i] === cls ? 1e6 : 0;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = y * FW + x; let v = d[i]; if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - FW] + 1); if (x > 0) v = Math.min(v, d[i - FW - 1] + D); if (x < FW - 1) v = Math.min(v, d[i - FW + 1] + D); }
      d[i] = v;
    }
    for (let y = FH - 1; y >= 0; y--) for (let x = FW - 1; x >= 0; x--) {
      const i = y * FW + x; let v = d[i]; if (v === 0) continue;
      if (x < FW - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < FH - 1) { v = Math.min(v, d[i + FW] + 1); if (x < FW - 1) v = Math.min(v, d[i + FW + 1] + D); if (x > 0) v = Math.min(v, d[i + FW - 1] + D); }
      d[i] = v;
    }
    return d;
  };
  const dw = toOther(1), dl = toOther(0), F = new Float32Array(n);
  for (let i = 0; i < n; i++) F[i] = (land[i] ? dw[i] - 0.5 : -(dl[i] - 0.5)) * FR;
  return F;
}
/* the water as a boat or a swimmer sees it: the decks of the bridges are open water, so they pass under (js/08zv) */
function buildBoatField() {
  const land = SHORE_LAND.slice(), q = {}, hw = ROAD_HALF + SW_W + 4;
  for (const b of BRIDGES) {
    const E = RE[b.e], n = Math.max(2, Math.ceil((b.s1 - b.s0) / 8));
    for (let k = 0; k <= n; k++) {
      edgeAt(E.i, b.s0 + (b.s1 - b.s0) * k / n, q); const ox = -q.ty, oy = q.tx;
      if (shoreDist(q.x + ox * (hw + 20), q.y + oy * (hw + 20)) >= 0 || shoreDist(q.x - ox * (hw + 20), q.y - oy * (hw + 20)) >= 0) continue;   // water on both sides only: the abutments stay land
      for (let o = -hw - 20; o <= hw + 20; o += FR * 0.5) {   // the deck, and any land left along its sides
        const ix = Math.round((q.x + ox * o + SEA) / FR - 0.5), iy = Math.round((q.y + oy * o + SEA) / FR - 0.5);
        if (ix >= 0 && iy >= 0 && ix < FW && iy < FH) land[iy * FW + ix] = 0;
      }
    }
  }
  BFIELD = fieldOf(land);
}
function sampleField(F, x, y) {
  const fx = (x + SEA) / FR - 0.5, fy = (y + SEA) / FR - 0.5;
  if (!(fx >= 0 && fy >= 0 && fx < FW - 1 && fy < FH - 1)) return -1e4;
  const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, k = iy * FW + ix;
  return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - ty) + (F[k + FW] * (1 - tx) + F[k + FW + 1] * tx) * ty;
}
function boatDist(x, y) { return sampleField(BFIELD || FIELD, x, y); }   // like shoreDist, with the bridges' decks as water
function onDeck(x, y) { return shoreDist(x, y) > 0 && boatDist(x, y) < 0; }   // up on a bridge, over the water
function boatGrad(x, y) {
  const gx = boatDist(x + FR, y) - boatDist(x - FR, y), gy = boatDist(x, y + FR) - boatDist(x, y - FR), m = Math.hypot(gx, gy) || 1;
  return [gx / m, gy / m];
}
function shoreDist(x, y) { return sampleField(FIELD, x, y); }   // > 0 on land, < 0 in the water
function shoreGrad(x, y) {                                     // unit vector toward land
  const gx = shoreDist(x + FR, y) - shoreDist(x - FR, y), gy = shoreDist(x, y + FR) - shoreDist(x, y - FR), m = Math.hypot(gx, gy) || 1;
  return [gx / m, gy / m];
}
const inWater = (x, y) => shoreDist(x, y) < 0;
function waterBetween(x1, y1, x2, y2) {
  const n = Math.ceil(dist(x1, y1, x2, y2) / 40);
  for (let k = 1; k < n; k++) if (shoreDist(lerp(x1, x2, k / n), lerp(y1, y2, k / n)) < 0) return true;
  return false;
}

/* ---------- road graph: nodes, edges with centre-line polylines ---------- */
const RN = MAP.nodes.map(([x, y]) => ({ x, y, e: [] }));
const RE = MAP.edges.map((d, i) => {
  const p = d.p, cum = [0];
  for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  return { i, a: d.a, b: d.b, p, cum, len: cum[cum.length - 1], nt: !!d.nt, v: d.v || '' };   // v: a street for visitors only (js/08x)
});
for (const e of RE) { RN[e.a].e.push(e.i); if (e.b !== e.a) RN[e.b].e.push(e.i); }
for (const e of RE) for (let k = 0; k < e.p.length - 1; k++) {
  const [x1, y1] = e.p[k], [x2, y2] = e.p[k + 1], m = ROAD_HALF + 30;
  sHash.add({ e: e.i, k }, Math.min(x1, x2) - m, Math.min(y1, y2) - m, Math.max(x1, x2) + m, Math.max(y1, y2) + m);
}
// point and unit tangent (a -> b) at arc length s along edge e
function edgeAt(e, s, out) {
  const E = RE[e], p = E.p, c = E.cum; s = clamp(s, 0, E.len);
  let k = 0; while (k < p.length - 2 && c[k + 1] < s) k++;
  const l = c[k + 1] - c[k] || 1, t = (s - c[k]) / l, dx = (p[k + 1][0] - p[k][0]) / l, dy = (p[k + 1][1] - p[k][1]) / l;
  out = out || {}; out.x = p[k][0] + (p[k + 1][0] - p[k][0]) * t; out.y = p[k][1] + (p[k + 1][1] - p[k][1]) * t; out.tx = dx; out.ty = dy; return out;
}
// travelling along e in direction fw (1 = a->b, -1 = b->a), s units from the start: point offset `off` to the right of travel
function lanePoint(e, fw, s, off, out) {
  out = edgeAt(e, fw > 0 ? s : RE[e].len - s, out); out.tx *= fw; out.ty *= fw;
  out.x += -out.ty * off; out.y += out.tx * off; return out;
}
const _sq = [];
// nearest point on any road centre line within maxD: { e, s, x, y, d }
function nearestRoad(x, y, maxD) {
  sHash.query(x - maxD, y - maxD, x + maxD, y + maxD, _sq); let best = null, bd = maxD;
  for (const q of _sq) {
    const E = RE[q.e], [x1, y1] = E.p[q.k], [x2, y2] = E.p[q.k + 1], dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1), px = x1 + dx * t, py = y1 + dy * t, d = Math.hypot(x - px, y - py);
    if (d < bd) { bd = d; best = { e: q.e, s: E.cum[q.k] + t * Math.sqrt(l2), x: px, y: py, d }; }
  }
  return best;
}
// nearest point on every road edge within maxD (one per edge)
function nearRoads(x, y, maxD) {
  sHash.query(x - maxD, y - maxD, x + maxD, y + maxD, _sq); const best = new Map();
  for (const q of _sq) {
    const E = RE[q.e], [x1, y1] = E.p[q.k], [x2, y2] = E.p[q.k + 1], dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1), d = Math.hypot(x - x1 - dx * t, y - y1 - dy * t);
    if (d < maxD) { const o = best.get(q.e); if (!o || d < o.d) best.set(q.e, { e: q.e, s: E.cum[q.k] + t * Math.sqrt(l2), d }); }
  }
  return [...best.values()];
}
// shortest road distance from every node to the point (x, y) into RD (or into `out`); Infinity where unreachable. Returns the road point.
const RD = new Float64Array(RN.length);
function roadFieldTo(x, y, out = RD) {
  const D = out; D.fill(Infinity); const t = nearestRoad(x, y, 900); if (!t) return null;
  const E = RE[t.e], done = new Uint8Array(RN.length); D[E.a] = Math.min(D[E.a], t.s); D[E.b] = Math.min(D[E.b], E.len - t.s);
  for (;;) {
    let u = -1, best = Infinity;
    for (let k = 0; k < RN.length; k++) if (!done[k] && D[k] < best) { best = D[k]; u = k; }
    if (u < 0) break; done[u] = 1;
    for (const ei of RN[u].e) { const F = RE[ei], v = F.a === u ? F.b : F.a, nd = best + F.len; if (nd < D[v]) D[v] = nd; }
  }
  return t;
}
function districtAt(x, y) {
  for (const [name, r] of MAP.districts) if (x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) return name;
  return 'OPEN WATER';
}

/* ---------- world build (once) ---------- */
const PASTEL = ['#9be8c8', '#ffb3c7', '#ffe08a', '#a8e6ff', '#c9b3ff', '#ffc49b', '#f4efe6'];
const CARIB = ['#ffb02e', '#3dffa6', '#ff7a3d', '#35d8ff', '#ff3fb4', '#ffe14a', '#8a5cff'];
// one style per block (all pieces of a white area on the map share it): kind, colour, base height
function blockStyle(cx, cy, big) {
  const d = districtAt(cx, cy), o = { kind: 'apartment', pal: PASTEL, H: rand(28, 48), pastel: false };
  if (d === 'PALM HEIGHTS') { if (big && Math.random() < 0.55) Object.assign(o, { H: rand(150, 320), kind: pick(['glass', 'glass', 'deco']), pal: PALETTE }); else Object.assign(o, { H: rand(50, 120), kind: pick(['office', 'office', 'apartment', 'brick']), pal: PALETTE }); }
  else if (d === 'MERCADO') Object.assign(o, { H: rand(24, 52), kind: pick(['apartment', 'brick', 'brick']), pal: CARIB });
  else if (d === 'DOCKSIDE' || d === 'GRAVEL FLATS') Object.assign(o, Math.random() < 0.75 ? { H: rand(34, 54), kind: 'warehouse', pal: PALETTE } : { H: rand(30, 60), kind: 'brick', pal: PALETTE });
  else if (d === 'SKYPORT') Object.assign(o, { H: rand(30, 50), kind: pick(['warehouse', 'office']), pal: PALETTE });
  else if (d === 'SEAVIEW') Object.assign(o, big && Math.random() < 0.6 ? { H: rand(110, 220), kind: 'condo', pal: PASTEL } : { H: rand(40, 90), kind: pick(['apartment', 'office']), pal: PALETTE });
  else if (d === 'SUNSTRIP') Object.assign(o, big && Math.random() < 0.25 ? { H: rand(110, 180), kind: 'glass', pal: PALETTE } : Math.random() < 0.5 ? { H: rand(48, 90), kind: 'deco', pal: PASTEL, pastel: true } : { H: rand(48, 110), kind: pick(['office', 'apartment']), pal: PALETTE });
  else if (d === 'CORAL SHORE') Object.assign(o, { H: rand(34, 62), kind: 'deco', pal: PASTEL, pastel: true });
  else if (d === 'PEARL KEY' || d === 'FAIRWAY ISLES' || d === 'HERON KEY') Object.assign(o, { H: rand(24, 36), kind: 'deco', pal: PASTEL, pastel: true });
  o.c = pick(o.pal); return o;
}
const TOWER_D = ['PALM HEIGHTS', 'SUNSTRIP', 'SEAVIEW'];   // the downtown districts where towers rise behind the street fronts
function fillStyle(cx, cy, w, h) {                               // style of one street-front or interior building
  const d = districtAt(cx, cy), o = blockStyle(cx, cy, false), cap = Math.min(w, h) < 70 ? 40 : 52;
  if (d === 'MERCADO') o.H = rand(22, 36);
  else if (d === 'PEARL KEY' || d === 'HERON KEY' || d === 'FAIRWAY ISLES' || d === 'GULL ROCKS') o.H = rand(22, 32);
  o.H = Math.min(o.H, cap); if (o.kind === 'condo' || o.kind === 'glass') o.kind = 'office';
  return o;
}
let LOTS = [], PARK_SPOTS = [], GATES = [];                                   // parking lots { ..., owner: the building it belongs to, stalls }; stalls { x, y, ang, lot }
const SVC = { police: [], hospital: [], fire: [] };               // police stations, hospitals, fire stations (js/08n): { r: the building, lot: its parking lot or null }
let worldReady = false;
function genWorld() {
  if (worldReady) return;
  buildShoreField();
  const blocks = {}; colonySpot();                               // the Colony takes its real lot on Ocean Drive; map buildings there make way
  BLD = MAP.bld.map((b, i) => [b, i]).filter(([b]) => !hitsColony(b[0], b[1], b[2], b[3], b[4])).map(([[cx, cy, w, h, ang, grp, inner, fill, kind, H0], idx]) => {
    if (fill) {                                                   // street-front and block-interior buildings: drawn merged per chunk, kept low enough
      const g = fillStyle(cx, cy, w, h), a = ang * Math.PI / 180, fx = cx - Math.sin(a) * h / 2, fy = cy + Math.cos(a) * h / 2;   // that nobody on the sidewalk disappears behind them
      const shop = !!nearestRoad(fx, fy, ROAD_HALF + SW_W + 24);                                       // a shop if its front is on a street
      if (!shop && Math.min(w, h) >= 70 && TOWER_D.includes(districtAt(cx, cy)) && Math.random() < PLC.towerShare) {   // a tower behind the street fronts (places table: City)
        g.H = GFH + randi(Math.min(PLC.towerFloorsMin, PLC.towerFloorsMax), Math.max(PLC.towerFloorsMin, PLC.towerFloorsMax)) * FLOOR; g.kind = pick(['office', 'office', 'apartment']); g.c = pick(PALETTE); g.pastel = false; }
      const H = GFH + Math.max(1, Math.round((g.H - GFH) / FLOOR)) * FLOOR;
      return makeSolid(cx, cy, w, h, a, { idx, seed: cx * 7 + cy * 13 + 1, inner: 0, back: !!(inner & 16), pad: true, bld: true, fill: true, shop, rad: Math.hypot(w, h) / 2, H, kind: g.kind, c: g.c, pastel: g.pastel });
    }
    const g = blocks[grp] || (blocks[grp] = kind ? { kind, H: H0, c: pick(PALETTE), pastel: false } : blockStyle(cx, cy, Math.max(w, h) >= 90)), tiny = Math.min(w, h) < 45;   // kind, H0: set by the map (the port's warehouses)
    let H = kind ? H0 : g.H * rand(0.8, 1.15); if (tiny) H = Math.min(H, 36); else if (Math.min(w, h) < 90) H = Math.min(H, 130);
    return makeSolid(cx, cy, w, h, ang * Math.PI / 180, { idx, seed: cx * 7 + cy * 13 + 1, grp, inner, pad: true, bld: true, rad: Math.hypot(w, h) / 2, H, kind: g.kind, c: g.c, pastel: g.pastel, roof: shade(g.c, 28), wall: shade(g.c, -60) });
  });
  const byIdx = new Map(BLD.map(r => [r.idx, r]));
  LOTS = (MAP.lots || []).filter(l => !hitsColony(l[0], l[1], l[2], l[3], l[4])).map(([cx, cy, w, d, ang, rows, owner, fill]) => ({ cx, cy, w, d, a: ang * Math.PI / 180, rows: rows || 1, owner: byIdx.get(owner) || null, fill: fill || 0, stalls: [] }));   // fill: share of stalls taken (0: the usual)
  SVC.police = []; SVC.hospital = []; SVC.fire = [];
  for (const k of ['police', 'hospital']) for (const [bi] of (MAP.services || {})[k] || []) {   // police stations: blue; hospitals: white (js/10e adds the signs and the cross)
    const r = byIdx.get(bi); if (!r) continue;
    r.special = k; r.kind = 'office'; r.pastel = false; r.c = k === 'hospital' ? '#eef1f5' : '#2f55c4'; r.H = GFH + (k === 'hospital' ? 2 : 1) * FLOOR;
    SVC[k].push({ r, lot: LOTS.find(L => L.owner === r) || null });
  }
  PARK_SPOTS = [];
  for (const L of LOTS) {                                         // nose-in stalls along the back of each lot (and along the front of a deep one); the aisle stays open
    const ca = Math.cos(L.a), sa = Math.sin(L.a), n = Math.floor((L.w - 20) / 30);
    for (const s of L.rows === 2 ? [-1, 1] : [-1]) {
      const z = s * (L.d / 2 - 36), ang = s < 0 ? Math.atan2(-ca, sa) : Math.atan2(ca, -sa);
      for (let k = 0; k < n; k++) { const x = -L.w / 2 + 25 + k * 30, p = { x: L.cx + ca * x - sa * z, y: L.cy + sa * x + ca * z, ang, lot: L }; PARK_SPOTS.push(p); L.stalls.push(p); }
    }
  }
  { // the hotel next to where the player starts gets its name in lights
    const se = RE[startSpot()], sp = edgeAt(se.i, se.len / 2, {});
    let best = null, bd = 1e9; for (const r of BLD) { if (r.fill) continue; const d = dist(r.cx, r.cy, sp.x, sp.y) + (r.kind === 'deco' ? 0 : 400); if (Math.min(r.lw, r.lh) >= 56 && d < bd) { bd = d; best = r; } }
    if (best) { best.kind = 'deco'; best.pastel = true; }
    if (best) { best.sign = 'SEA BREEZE'; best.H = Math.max(best.H, 60); best.c = '#9be8c8'; }
  }
  GATES = [];
  for (const E of RE) if (E.nt && !E.v) {                         // a boom across each driveway, just past the sidewalk of the street it leaves (not the visitors' streets, js/08x)
    const atA = RN[E.a].e.length > 1, s = ROAD_HALF + SW_W + 40, q = edgeAt(E.i, atA ? s : E.len - s, {}), a = Math.atan2(q.ty, q.tx);
    GATES.push(makeSolid(q.x, q.y, 8, ROAD_W, a, { gate: true, a, open: 0 }));
  }
  genLandmarks(); genAirport(); genPlaces(); genFactory(); genShowroom(); genSalvage(); genPrison(); genSite(); genCasino(); genMarina(); genStunts(); genInteriors(); ixSetup(); genGym(); genSpeedway(); genCarpark(); placeGrove(); pickFireStations(); pickSprays(); placeSafes(); placeUniques(); genParks(); serviceDecor(); genVisitors();              // landmarks; the cement works (js/10r); the palm grove by the car park (js/10m); the fire stations (js/08n); the Pay 'n' Spray garages (js/10j); the safehouses (js/10l); the 160 unique buildings (js/10n); the parks (js/10p); the signs, the cross and the lamps of the hospitals, police and fire stations (js/10e)
  CLUTTER = withSeed(4242, makeClutter);                          // after the landmarks: clutter keeps out of them
  DRAW = BLD.filter(b => !b.fill && !b.uniq && !b.ix).concat(LMS, fillChunks());   // fill buildings stream as merged chunks; a unique building is its own drawable (js/10n)
  // bridges: wherever both sides of the road are water, put a rail along each edge of the deck
  const q = {};
  for (const E of RE) {
    const n = Math.max(2, Math.ceil(E.len / 26)), wet = [];
    for (let k = 0; k <= n; k++) {
      edgeAt(E.i, E.len * k / n, q); const ox = -q.ty * (ROAD_HALF + SW_W + 24), oy = q.tx * (ROAD_HALF + SW_W + 24);   // beyond the sidewalk
      wet.push(shoreDist(q.x + ox, q.y + oy) < 0 && shoreDist(q.x - ox, q.y - oy) < 0);
    }
    for (let k = 0; k <= n; k++) {
      if (!wet[k] || (k > 0 && wet[k - 1])) continue;
      let j = k; while (j < n && wet[j + 1]) j++;
      const k0 = Math.max(0, k - 1), k1 = Math.min(n, j + 1); if (k1 - k0 < 2) continue;
      BRIDGES.push({ e: E.i, s0: E.len * k0 / n, s1: E.len * k1 / n });
      for (const sd of [-1, 1]) for (let m = k0; m < k1; m++) {
        const a = edgeAt(E.i, E.len * m / n, {}), b = edgeAt(E.i, E.len * (m + 1) / n, {}), off = sd * (ROAD_HALF + SW_W - 2);   // rails at the outer edge of the sidewalk
        const s = { x1: a.x - a.ty * off, y1: a.y + a.tx * off, x2: b.x - b.ty * off, y2: b.y + b.tx * off };
        RAILS.push(s); rHash.add(s, Math.min(s.x1, s.x2) - 4, Math.min(s.y1, s.y2) - 4, Math.max(s.x1, s.x2) + 4, Math.max(s.y1, s.y2) + 4);
      }
    }
  }
  buildBoatField();
  worldReady = true;
}
