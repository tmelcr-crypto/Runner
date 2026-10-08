'use strict';
/* ---------- 7a. THE CITY: sea, land, roads, bridges, parks, beaches, street lights, buildings ---------- */
let waterTex = null, waterMat = null, foamMat = null;
function makeWaterTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * 128, y = Math.random() * 128, w = 8 + Math.random() * 18;
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.0)' : 'rgba(0,40,90,.16)'; g.lineWidth = 1.5;
    for (const ox of [-128, 0, 128]) { g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + w / 2, y - 3, x + ox + w, y); g.stroke(); }
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 128, y = Math.random() * 128, w = 6 + Math.random() * 12;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 2.5, x + w, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; return t;
}
const WATER_Y = -3, COL = { land: '#241c42', grass: '#0d3a3c', sand: '#5a4470', asphalt: '#1a1626', kerb: '#5a4a9a', line: '#ff2bd6', zebra: '#6fdcff', skirt: '#3a2d63', pad: '#2c2350', rail: '#2bf3ff' };

/* triangles in map coordinates (x, y) at a height h, each wound to face up; one vertex colour per triangle */
function Tris() { this.p = []; this.c = []; }
Tris.prototype.tri = function (a, b, c, h, col) {
  if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0) { const t = b; b = c; c = t; }
  this.p.push(a[0], h, a[1], b[0], h, b[1], c[0], h, c[1]); for (let k = 0; k < 3; k++) this.c.push(col.r, col.g, col.b);
};
Tris.prototype.quad = function (a, b, c, d, h, col) { this.tri(a, b, c, h, col); this.tri(a, c, d, h, col); };
Tris.prototype.wall = function (a, b, h0, h1, col) {             // vertical quad from map point a to b
  this.p.push(a[0], h0, a[1], b[0], h0, b[1], b[0], h1, b[1], a[0], h0, a[1], b[0], h1, b[1], a[0], h1, a[1]);
  for (let k = 0; k < 6; k++) this.c.push(col.r, col.g, col.b);
};
Tris.prototype.mesh = function (mat) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  const n = new Float32Array(this.p.length); for (let k = 1; k < n.length; k += 3) n[k] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); cityGroup.add(m); return m;
};
// a strip between lateral offsets o0..o1 (to the right of travel) along a polyline
function ribbon(T, pts, o0, o1, h, col) {
  const n = pts.length; if (n < 2) return; const L = [], R = [];
  for (let k = 0; k < n; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    let sc = 1;
    if (k > 0 && k < n - 1) {
      const p0 = pts[k - 1], p1 = pts[k], p2 = pts[k + 1], ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = p2[0] - p1[0], by = p2[1] - p1[1];
      const cos = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1); sc = 1 / Math.max(0.5, Math.sqrt((1 + cos) / 2));
    }
    const nx = -ty * sc, ny = tx * sc; L.push([pts[k][0] + nx * o0, pts[k][1] + ny * o0]); R.push([pts[k][0] + nx * o1, pts[k][1] + ny * o1]);
  }
  for (let k = 0; k < n - 1; k++) T.quad(L[k], R[k], R[k + 1], L[k + 1], h, col);
}
function subPoly(E, s0, s1) {                                    // the part of edge E between arc lengths s0 and s1
  if (s1 - s0 < 1) return [];
  const a = edgeAt(E.i, s0, {}), b = edgeAt(E.i, s1, {}), out = [[a.x, a.y]];
  for (let k = 1; k < E.p.length - 1; k++) if (E.cum[k] > s0 && E.cum[k] < s1) out.push(E.p[k]);
  out.push([b.x, b.y]); return out;
}
const CHUNK = 1600, chunkKey = (x, y) => Math.floor((x + SEA) / CHUNK) * 1024 + Math.floor((y + SEA) / CHUNK);
function chunked(geo, mat, items) {                              // instanced props split by map chunk, so chunks off screen are culled
  const groups = new Map();
  for (const it of items) { const k = chunkKey(it.x, it.z); let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(it); }
  for (const l of groups.values()) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const it of l) { x0 = Math.min(x0, it.x - it.sx); x1 = Math.max(x1, it.x + it.sx); y0 = Math.min(y0, it.y - it.sy); y1 = Math.max(y1, it.y + it.sy); z0 = Math.min(z0, it.z - it.sz); z1 = Math.max(z1, it.z + it.sz); }
    const g = geo.clone(); g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 1);
    instanced(g, mat, l).frustumCulled = true;
  }
}
function polyArea(r) { let a = 0; for (let k = 0; k < r.length; k++) { const p = r[k], q = r[(k + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function inRing(x, y, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > y) !== (r[j][1] > y) && x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) ins = !ins;
  return ins;
}
const inPoly = (x, y, p) => inRing(x, y, p.o) && !p.h.some(h => inRing(x, y, h));
function randomIn(p, ok) {                                       // a random point inside polygon p that passes ok(), or null
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of p.o) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let t = 0; t < 12; t++) { const x = rand(x0, x1), y = rand(y0, y1); if (inPoly(x, y, p) && ok(x, y)) return [x, y]; }
  return null;
}
function shapeMesh(polys, h, col) {
  const shapes = polys.map(p => { const s = new THREE.Shape(p.o.map(q => new THREE.Vector2(q[0], -q[1]))); for (const r of p.h) s.holes.push(new THREE.Path(r.map(q => new THREE.Vector2(q[0], -q[1])))); return s; });
  const g = new THREE.ShapeGeometry(shapes); g.rotateX(-Math.PI / 2); g.translate(0, h, 0);
  const m = new THREE.Mesh(g, mLam(col)); cityGroup.add(m); return m;
}

function buildCity() {
  if (cityGroup) return;                                         // the map never changes, so it is built once
  cityGroup = new THREE.Group(); scene.add(cityGroup);
  const C = h => new THREE.Color(h), q = {};
  // sea
  if (!waterTex) waterTex = makeWaterTex();
  if (!waterMat) { waterMat = new THREE.MeshBasicMaterial({ color: 0x1d5fe0, map: waterTex }); foamMat = new THREE.MeshBasicMaterial({ color: 0x2bf3ff, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); }
  const WS = Math.max(MW, MH) + 2 * SEA + 9000; waterTex.repeat.set(WS / 150, WS / 150);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(WS, WS).rotateX(-Math.PI / 2), waterMat); sea.position.set(MW / 2, WATER_Y, MH / 2); sea.frustumCulled = false; cityGroup.add(sea);
  // land, grass, beaches
  shapeMesh(MAP.land, 0, COL.land); shapeMesh(MAP.grass, 0.25, COL.grass); shapeMesh(MAP.sand, 0.25, COL.sand);
  // coast: a wall down to the water, and foam on the water side
  const skirt = new Tris(), foam = new Tris(), sk = C(COL.skirt);
  for (const p of MAP.land) for (const r of [p.o, ...p.h]) for (let k = 0; k < r.length; k++) {
    const a = r[k], b = r[(k + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue;
    skirt.wall(a, b, WATER_Y - 4, 0, sk);
    let nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l; if (shoreDist((a[0] + b[0]) / 2 + nx * 14, (a[1] + b[1]) / 2 + ny * 14) > 0) { nx = -nx; ny = -ny; }
    foam.quad(a, b, [b[0] + nx * 11, b[1] + ny * 11], [a[0] + nx * 11, a[1] + ny * 11], WATER_Y + 0.3, sk);
  }
  skirt.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })).frustumCulled = false;
  foam.mesh(foamMat).frustumCulled = false;
  // roads: asphalt, kerb lines, double centre line, zebra crossings at junctions; one mesh per map chunk
  const roadT = new Map(), markT = new Map(), tk = (m, x, y) => { const k = chunkKey(x, y); let t = m.get(k); if (!t) m.set(k, t = new Tris()); return t; };
  const asph = C(COL.asphalt), kerb = C(COL.kerb), line = C(COL.line), zebra = C(COL.zebra), deg = n => RN[n].e.length;
  for (const E of RE) {
    const mid = edgeAt(E.i, E.len / 2, q), R = tk(roadT, mid.x, mid.y), Mk = tk(markT, mid.x, mid.y);
    ribbon(R, E.p, -ROAD_HALF, ROAD_HALF, 0.6, asph);
    const ca = deg(E.a) >= 3 ? ROAD_HALF + 26 : 0, cb = deg(E.b) >= 3 ? ROAD_HALF + 26 : 0, ka = deg(E.a) >= 3 ? ROAD_HALF + 2 : 0, kb = deg(E.b) >= 3 ? ROAD_HALF + 2 : 0;
    const centre = subPoly(E, ca, E.len - cb); ribbon(Mk, centre, -3.5, -1.5, 0.9, line); ribbon(Mk, centre, 1.5, 3.5, 0.9, line);
    const side = subPoly(E, ka, E.len - kb); ribbon(Mk, side, -ROAD_HALF, -ROAD_HALF + 3, 0.9, kerb); ribbon(Mk, side, ROAD_HALF - 3, ROAD_HALF, 0.9, kerb);
    for (const [n, s] of [[E.a, ROAD_HALF + 12], [E.b, E.len - ROAD_HALF - 12]]) {
      if (deg(n) < 3 || E.len < 2 * ROAD_HALF + 60) continue;
      const c = edgeAt(E.i, s, {}), tx = c.tx, ty = c.ty, rx = -ty, ry = tx;
      for (let o = -ROAD_HALF + 9; o <= ROAD_HALF - 9; o += 12) {
        const cx = c.x + rx * o, cy = c.y + ry * o;
        Mk.quad([cx - rx * 3.5 - tx * 9, cy - ry * 3.5 - ty * 9], [cx + rx * 3.5 - tx * 9, cy + ry * 3.5 - ty * 9], [cx + rx * 3.5 + tx * 9, cy + ry * 3.5 + ty * 9], [cx - rx * 3.5 + tx * 9, cy - ry * 3.5 + ty * 9], 0.9, zebra);
      }
    }
  }
  for (const n of RN) {                                          // round junction pads so the strips meet cleanly
    const R = tk(roadT, n.x, n.y), seg = 18;
    for (let k = 0; k < seg; k++) { const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU; R.tri([n.x, n.y], [n.x + Math.cos(a0) * ROAD_HALF, n.y + Math.sin(a0) * ROAD_HALF], [n.x + Math.cos(a1) * ROAD_HALF, n.y + Math.sin(a1) * ROAD_HALF], 0.6, asph); }
  }
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true }), markMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const t of roadT.values()) t.mesh(roadMat);
  for (const t of markT.values()) t.mesh(markMat);
  // bridge rails: glowing low walls along the deck edges
  const rails = new Tris(), rc = C(COL.rail);
  for (const s of RAILS) { rails.wall([s.x1, s.y1], [s.x2, s.y2], 0.6, 6, rc); }
  if (RAILS.length) rails.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  // street lights along every road, alternating sides; inside the rail on bridges
  const poles = [], heads = [], pools = [];
  for (const E of RE) for (let s = 70; s < E.len - 70; s += 300) {
    const sd = Math.round(s / 300) % 2 ? 1 : -1, c = edgeAt(E.i, s, q);
    let off = (ROAD_HALF + 6) * sd, px = c.x - c.ty * off, py = c.y + c.tx * off;
    if (shoreDist(px, py) < 6) { off = (ROAD_HALF - 7) * sd; px = c.x - c.ty * off; py = c.y + c.tx * off; }
    if (groundH(px, py) > 0 || inLandmark(px, py)) continue;
    const lc = (E.i + Math.round(s / 300)) % 2 ? '#ff2bd6' : '#2bf3ff', ix = c.x - c.ty * off * 0.6, iy = c.y + c.tx * off * 0.6;
    poles.push({ x: px, y: 31, z: py, sx: 1.4, sy: 62, sz: 1.4, c: '#14102a' });
    heads.push({ x: ix * 0.1 + px * 0.9, y: 62, z: iy * 0.1 + py * 0.9, sx: 7, sy: 2.6, sz: 7, c: lc });
    pools.push({ x: ix, y: 1.5, z: iy, sx: 170, sy: 1, sz: 170, c: lc });
  }
  // parks: trees off the roads; beaches: palms, umbrellas and towels
  const trunks = [], crowns = [], slabs = [], clear = (x, y, m) => shoreDist(x, y) > m && !nearestRoad(x, y, ROAD_HALF + 14) && groundH(x, y) === 0 && !inLandmark(x, y);
  for (const p of MAP.grass) {
    const n = Math.min(70, Math.floor(Math.abs(polyArea(p.o)) / 9000));
    for (let k = 0; k < n && trunks.length < 1600; k++) {
      const pt = randomIn(p, (x, y) => clear(x, y, 14)); if (!pt) continue; const r = rand(9, 15);
      trunks.push({ x: pt[0], y: 6, z: pt[1], sx: 2.2, sy: 12, sz: 2.2, c: '#24143c' });
      crowns.push({ x: pt[0], y: 12 + r * 0.7, z: pt[1], sx: r * 1.1, sy: r * 1.2, sz: r * 1.1, c: pick(['#1f9e7a', '#178a6a', '#23b38a', '#2a7fb8', '#7a35d6']) });
    }
  }
  for (const p of MAP.sand) {
    const n = Math.min(260, Math.floor(Math.abs(polyArea(p.o)) / 26000));
    for (let k = 0; k < n; k++) {
      const pt = randomIn(p, (x, y) => clear(x, y, 30)); if (!pt) continue; const [px, py] = pt;
      if (k % 2 === 0) { trunks.push({ x: px, y: 12, z: py, sx: 2.6, sy: 24, sz: 2.6, c: '#24143c' }); crowns.push({ x: px, y: 26, z: py, sx: 13, sy: 5, sz: 13, c: pick(['#0f8f86', '#1ec9a6']) }); }
      else { trunks.push({ x: px, y: 8, z: py, sx: 1.1, sy: 16, sz: 1.1, c: '#e8e8e8' }); crowns.push({ x: px, y: 17, z: py, sx: 11, sy: 4, sz: 11, c: pick(['#ff2bd6', '#ffe14a', '#2bf3ff', '#a259ff']) }); slabs.push({ x: px + 14, y: 0.6, z: py + 8, sx: 14, sy: 0.8, sz: 7, c: pick(['#ff2bd6', '#2bf3ff', '#ffe14a']) }); }
    }
  }
  // buildings stand on raised pavement; pads and shadows are static, the buildings themselves stream in near the player
  const pads = [], shadowTris = [];
  for (const r of BLD) {
    pads.push({ x: r.cx, y: SIDE_H / 2, z: r.cy, sx: r.lw + 2 * PAD, sy: SIDE_H, sz: r.lh + 2 * PAD, ry: -r.a, c: COL.pad });
    const cs = solidCorners(r), ox = r.H * 0.38, oz = r.H * 0.5, hull = convexHull(cs.concat(cs.map(([x, y]) => [x + ox, y + oz])));
    for (let k = 1; k < hull.length - 1; k++) for (const v of [hull[0], hull[k], hull[k + 1]]) shadowTris.push(v[0], 1.2, v[1]);
  }
  chunked(GB, M.instWhite, pads); chunked(GB, M.instWhite, slabs);
  chunked(GCyl, M.instWhite, trunks); chunked(GSph, M.instWhite, crowns);
  chunked(GCyl, M.instWhite, poles); chunked(GB, M.instBasic, heads);
  chunked(GP, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), pools);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(shadowTris, 3));
  const sh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }));
  sh.frustumCulled = false; cityGroup.add(sh);
}
function solidCorners(r) { return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const lx = u * r.lw / 2, ly = v * r.lh / 2; return [r.cx + r.ca * lx - r.sa * ly, r.cy + r.sa * lx + r.ca * ly]; }); }
function convexHull(pts) {
  pts = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let k = pts.length - 1; k >= 0; k--) { const p = pts[k]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], pts[k]) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/* streaming: buildings, landmarks and props exist as meshes only near the camera (nothing farther than a few seconds' drive is drawn) */
const STREAM_IN = 2100, STREAM_OUT = 2700, SHARED_GEO = new Set([GB, GP, GCyl, GCylZ, GSph, GCirc]);
let streamTick = 0;
function buildDrawable(o) {
  if (o.bld) {
    const geo = { x: -o.lw / 2, y: -o.lh / 2, w: o.lw, h: o.lh, H: o.H, kind: o.kind, c: o.c, inner: o.inner, pastel: o.pastel };
    o.mesh = withSeed(o.seed, () => makeBuilding(geo)); o.H = geo.H; o.fade = 1;
    if (o.sign) { const sg = signMesh(o.sign, '#ffd23f', Math.min(o.lw * 0.9, 170), 34); sg.position.set(0, o.H + 22, o.lh * 0.25); o.mesh.add(sg); o.mesh.userData.own.push(sg.material); }
  } else o.mesh = o.make();
  o.mesh.position.set(o.cx, 0, o.cy); o.mesh.rotation.y = -(o.a || 0); cityGroup.add(o.mesh);
}
function dropDrawable(o) {
  cityGroup.remove(o.mesh);
  o.mesh.traverse(m => { if (m.geometry && !SHARED_GEO.has(m.geometry)) m.geometry.dispose(); });
  for (const m of o.mesh.userData.own || []) m.dispose();
  o.mesh = null; faded.delete(o);
}
function streamCity(all) {
  if (!all && ++streamTick % 4) return;
  const x = cam.x, y = cam.y, todo = [];
  for (const o of DRAW) {
    const d = Math.hypot(o.cx - x, o.cy - y) - o.rad;
    if (o.mesh) { if (d > STREAM_OUT) dropDrawable(o); } else if (d < STREAM_IN) todo.push([d, o]);
  }
  if (!todo.length) return;
  todo.sort((p, q) => p[0] - q[0]); const t0 = performance.now();
  for (const [, o] of todo) { buildDrawable(o); if (!all && performance.now() - t0 > 6) break; }
}
/* buildings between the camera and the player turn see-through so nobody gets hidden behind a roof */
const _fb = [], faded = new Set();
function fadeBuildings() {
  const t = P.car || P, tan = Math.tan(CAM_TILT_DEG * Math.PI / 180);
  bHash.query(t.x - 60, t.y - 30, t.x + 60, t.y + 240, _fb);
  for (const r of _fb) {
    if (!r.mesh) continue;
    const reach = r.H * tan * 1.25 + 24, tol = 22 + r.H * 0.1;
    if (t.x > r.x - tol && t.x < r.x + r.w + tol && t.y < r.y + 20 && r.y - t.y < reach) { r.hideF = frameId; faded.add(r); }
  }
  for (const r of faded) {
    const tg = r.hideF === frameId ? 0.2 : 1;
    r.fade += (tg - r.fade) * 0.18; if (tg === 1 && r.fade > 0.99) { r.fade = 1; faded.delete(r); }
    const tr = r.fade < 0.99;
    for (const m of r.mesh.userData.own) { m.opacity = r.fade; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
  }
}
