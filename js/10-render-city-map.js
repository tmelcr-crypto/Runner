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
const WATER_Y = -3, COL = { walk: '#3a3060', joint: '#2a2348', parkline: '#cfc8e8', lot: '#221c34', stall: '#d8d2ee', land: '#241c42', grass: '#0d3a3c', sand: '#5a4470', asphalt: '#1a1626', kerb: '#5a4a9a', line: '#ff2bd6', zebra: '#6fdcff', skirt: '#3a2d63', pad: '#2c2350', rail: '#2bf3ff' };

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
  // streets: paved sidewalks with joints, asphalt, kerbs, the parking-lane line, double centre line, zebra crossings; one mesh per map chunk
  const roadT = new Map(), markT = new Map(), tk = (m, x, y) => { const k = chunkKey(x, y); let t = m.get(k); if (!t) m.set(k, t = new Tris()); return t; };
  const asph = C(COL.asphalt), walk = C(COL.walk), joint = C(COL.joint), kerb = C(COL.kerb), line = C(COL.line), zebra = C(COL.zebra), pline = C(COL.parkline), deg = n => RN[n].e.length, SWO = ROAD_HALF + SW_W;
  const across = (Mk, c, o0, o1, half, h, col) => { const tx = c.tx, ty = c.ty, rx = -ty, ry = tx; Mk.quad([c.x + rx * o0 - tx * half, c.y + ry * o0 - ty * half], [c.x + rx * o1 - tx * half, c.y + ry * o1 - ty * half], [c.x + rx * o1 + tx * half, c.y + ry * o1 + ty * half], [c.x + rx * o0 + tx * half, c.y + ry * o0 + ty * half], h, col); };
  for (const E of RE) {
    const mid = edgeAt(E.i, E.len / 2, q), R = tk(roadT, mid.x, mid.y), Mk = tk(markT, mid.x, mid.y);
    ribbon(R, E.p, -SWO, SWO, 0.45, walk);                                  // sidewalks; the carriageway is drawn over the middle
    ribbon(R, E.p, -ROAD_HALF, ROAD_HALF, 0.6, asph);
    const j3 = n => deg(n) >= 3, ca = j3(E.a) ? SWO + 26 : 0, cb = j3(E.b) ? SWO + 26 : 0, ka = j3(E.a) ? SWO + 2 : 0, kb = j3(E.b) ? SWO + 2 : 0;
    const centre = subPoly(E, ca, E.len - cb); ribbon(Mk, centre, -3.5, -1.5, 0.9, line); ribbon(Mk, centre, 1.5, 3.5, 0.9, line);
    const side = subPoly(E, ka, E.len - kb); ribbon(Mk, side, -ROAD_HALF, -ROAD_HALF + 3, 0.9, kerb); ribbon(Mk, side, ROAD_HALF - 3, ROAD_HALF, 0.9, kerb);
    for (let s = ka + 12; s < E.len - kb - 12; s += 28) { const c = edgeAt(E.i, s, q); across(Mk, c, ROAD_HALF + 1, SWO - 1, 0.6, 0.55, joint); across(Mk, c, -SWO + 1, -ROAD_HALF - 1, 0.6, 0.55, joint); }
    for (let s = ca + 6; s < E.len - cb - 14; s += 32) { const c = edgeAt(E.i, s, q); for (const o of [PARK_OFF - 13, -PARK_OFF + 13]) across(Mk, c, o - 0.8, o + 0.8, 7, 0.9, pline); }   // parking lanes
    for (const [n, s] of [[E.a, SWO + 12], [E.b, E.len - SWO - 12]]) {
      if (!j3(n) || E.len < 2 * SWO + 60) continue;
      const c = edgeAt(E.i, s, {});
      for (let o = -ROAD_HALF + 9; o <= ROAD_HALF - 9; o += 12) { const cc = { x: c.x - c.ty * o, y: c.y + c.tx * o, tx: c.tx, ty: c.ty }; across(Mk, cc, -3.5, 3.5, 9, 0.9, zebra); }
    }
  }
  for (const n of RN) {                                          // round junctions: a sidewalk disc with the carriageway disc over it
    const R = tk(roadT, n.x, n.y), seg = 20, disc = (r, h, col) => { for (let k = 0; k < seg; k++) { const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU; R.tri([n.x, n.y], [n.x + Math.cos(a0) * r, n.y + Math.sin(a0) * r], [n.x + Math.cos(a1) * r, n.y + Math.sin(a1) * r], h, col); } };
    disc(SWO, 0.45, walk); disc(ROAD_HALF, 0.6, asph);
  }
  // parking lots: asphalt, a kerb along the back (and the front of a two-row lot), stall lines facing the aisle
  const lotC = C(COL.lot), stall = C(COL.stall), padC = C(COL.pad);
  for (const L of LOTS) {
    const R = tk(roadT, L.cx, L.cy), Mk = tk(markT, L.cx, L.cy), ca = Math.cos(L.a), sa = Math.sin(L.a), w = (x, z) => [L.cx + ca * x - sa * z, L.cy + sa * x + ca * z];
    const box = (T, x0, z0, x1, z1, h, col) => T.quad(w(x0, Math.min(z0, z1)), w(x1, Math.min(z0, z1)), w(x1, Math.max(z0, z1)), w(x0, Math.max(z0, z1)), h, col);
    box(R, -L.w / 2, -L.d / 2, L.w / 2, L.d / 2, 0.55, lotC);
    const n = Math.floor((L.w - 20) / 30);
    for (const s of L.rows === 2 ? [-1, 1] : [-1]) {
      const e = s * L.d / 2;
      box(Mk, -L.w / 2, e, L.w / 2, e - 4 * s, 0.95, padC);
      for (let k = 0; k <= n; k++) { const x = -L.w / 2 + 10 + k * 30; box(Mk, x - 0.8, e - 4 * s, x + 0.8, e - 66 * s, 0.9, stall); }
      box(Mk, -L.w / 2 + 10, e - 65 * s, -L.w / 2 + 10 + n * 30, e - 66.6 * s, 0.9, stall);
    }
  }
  const roadMat = ROAD_M = new THREE.MeshLambertMaterial({ vertexColors: true }), markMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const t of roadT.values()) t.mesh(roadMat);
  for (const t of markT.values()) t.mesh(markMat);
  // bridge rails: glowing low walls along the outer edge of the bridge sidewalks
  const rails = new Tris(), rc = C(COL.rail);
  for (const s of RAILS) { rails.wall([s.x1, s.y1], [s.x2, s.y2], 0.6, 6, rc); }
  if (RAILS.length) rails.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  // street lights at the kerb, alternating sides
  const poles = [], heads = [], pools = [], nearLot = (x, y) => LOTS.some(L => Math.abs(x - L.cx) < L.w / 2 + L.d / 2 && Math.abs(y - L.cy) < L.w / 2 + L.d / 2);
  for (const E of RE) for (let s = SWO + 30; s < E.len - SWO - 30; s += 300) {
    const sd = Math.round(s / 300) % 2 ? 1 : -1, c = edgeAt(E.i, s, q), off = (ROAD_HALF + 5) * sd, px = c.x - c.ty * off, py = c.y + c.tx * off;
    if (inLandmark(px, py)) continue;
    const lc = (E.i + Math.round(s / 300)) % 2 ? '#ff2bd6' : '#2bf3ff', ix = c.x - c.ty * off * 0.55, iy = c.y + c.tx * off * 0.55;
    poles.push({ x: px, y: 31, z: py, sx: 1.4, sy: 62, sz: 1.4, c: '#14102a' });
    heads.push({ x: ix * 0.1 + px * 0.9, y: 62, z: iy * 0.1 + py * 0.9, sx: 7, sy: 2.6, sz: 7, c: lc });
    pools.push({ x: ix, y: 1.5, z: iy, sx: 170, sy: 1, sz: 170, c: lc });
  }
  // street furniture along the sidewalks: palms at the kerb, benches, bins, hydrants, phone booths, newspaper boxes, bus shelters
  const fb = [], fg = [], fc = [], fs = [], fp = [], trunks = [], crowns = [], furn = [[fb, GB, false], [fc, GCyl, false], [fs, GSphLo, false]];
  const PALMY = { 'CORAL SHORE': 0.45, 'SUNSTRIP': 0.4, 'SEAVIEW': 0.4, 'PEARL KEY': 0.5, 'HERON KEY': 0.4, 'FAIRWAY ISLES': 0.4, 'MERCADO': 0.2, 'PALM HEIGHTS': 0.22, 'DOCKSIDE': 0.06, 'SKYPORT': 0.15 };
  for (const E of RE) for (const sd of [-1, 1]) {
    let nextStop = rand(200, 600);
    for (let s = SWO + 16 + rand(0, 30); s < E.len - SWO - 16; s += rand(44, 76)) {
      const c = edgeAt(E.i, s, q), rx = -c.ty * sd, ry = c.tx * sd, yaw = -Math.atan2(c.ty, c.tx);
      const kx = c.x + rx * (ROAD_HALF + 5), ky = c.y + ry * (ROAD_HALF + 5), bx = c.x + rx * (SWO - 5), by = c.y + ry * (SWO - 5);
      if (shoreDist(bx, by) < 24 || inLandmark(bx, by) || nearLot(bx, by)) continue;
      const pr = PALMY[districtAt(c.x, c.y)] || 0.15, r = Math.random(), mark = partMark(furn); let thr = null;   // thr: [x, y, mass, what a car does to it (js/12e)] of a piece a blast can throw
      if (s > nextStop) {                                        // bus shelter: roof, glass back, two posts, a lit sign
        nextStop = s + rand(700, 1100); const ox = rx * 3, oy = ry * 3;
        fb.push({ x: bx + ox, y: 24, z: by + oy, sx: 44, sy: 2, sz: 13, ry: yaw, c: '#3a3f5c' }); fg.push({ x: bx + ox * 2.6, y: 13, z: by + oy * 2.6, sx: 40, sy: 18, sz: 1, ry: yaw, c: '#2bd8ff' });
        for (const e of [-20, 20]) fb.push({ x: bx + c.tx * e, y: 12, z: by + c.ty * e, sx: 1.6, sy: 24, sz: 1.6, ry: yaw, c: '#2b2e38' });
        fg.push({ x: bx - c.tx * 26, y: 22, z: by - c.ty * 26, sx: 2, sy: 10, sz: 8, ry: yaw, c: '#ffe14a' });
      } else if (r < pr) { trunks.push({ x: kx, y: 16, z: ky, sx: 2.4, sy: 32, sz: 2.4, c: '#3b2a1e' }); crowns.push({ x: kx, y: 33, z: ky, sx: 15, sy: 5, sz: 15, c: pick(['#14a37f', '#1ec9a6', '#0f8f86']) }); }
      else if (r < pr + 0.12) { fb.push({ x: bx, y: 5, z: by, sx: 16, sy: 1.4, sz: 5, ry: yaw, c: '#7a5a3a' }); fb.push({ x: bx + rx * 2.5, y: 8, z: by + ry * 2.5, sx: 16, sy: 5, sz: 1, ry: yaw, c: '#7a5a3a' }); fb.push({ x: bx, y: 2.2, z: by, sx: 14, sy: 4.4, sz: 3, ry: yaw, c: '#2b2e38' }); thr = [bx, by, 1]; }
      else if (r < pr + 0.2) { fc.push({ x: bx, y: 4.5, z: by, sx: 3.2, sy: 9, sz: 3.2, c: pick(['#2f6f4f', '#3a3f5c']) }); thr = [bx, by, 0.6, 'bin']; BINS.push({ x: bx, y: by, t: -999 }); }   // a bin: the trash truck stops here (js/08c)
      else if (r < pr + 0.25) { fc.push({ x: kx, y: 3.5, z: ky, sx: 2.4, sy: 7, sz: 2.4, c: '#e0364f' }); thr = [kx, ky, 1.6, 'hydrant']; }
      else if (r < pr + 0.28) { fb.push({ x: bx, y: 11, z: by, sx: 8, sy: 22, sz: 8, ry: yaw, c: '#2a4aa8' }); fg.push({ x: bx, y: 23, z: by, sx: 8.4, sy: 2, sz: 8.4, ry: yaw, c: '#3fe0ff' }); }
      else if (r < pr + 0.31) { fb.push({ x: bx, y: 4, z: by, sx: 5, sy: 8, sz: 5, ry: yaw, c: pick(['#e0364f', '#2f6fd6', '#ffb02e', '#2fbf71']) }); thr = [bx, by, 0.8, 'bin']; }
      else if (r < pr + 0.45) { const px = bx - rx * 2, py = by - ry * 2; boxPile(fb, px, py, yaw, c.tx, c.ty, randi(1, 4)); thr = [px, py, 0.4, 'box']; }   // cardboard boxes put out by the shops
      else if (r < pr + 0.56) { const px = bx - rx * 2, py = by - ry * 2; bagHeap(fs, px, py, randi(2, 4)); thr = [px, py, 0.5, 'bag']; }               // garbage bags
      else if (r < pr + 0.63) { wheelie(fb, bx, by, yaw); thr = [bx, by, 0.8, 'bin']; BINS.push({ x: bx, y: by, t: -999 }); }                         // a wheelie bin
      if (thr) registerThrow(thr[0], thr[1], partsSince(furn, mark), null, thr[2], thr[3]);
    }
  }
  // traffic lights on the near right corner of every approach to a junction
  RN.forEach((n, ni) => {
    if (n.e.length < 3) return;
    n.e.forEach((ei, k) => {
      const F = RE[ei], fromA = F.a === ni, c = edgeAt(ei, fromA ? SWO + 8 : F.len - SWO - 8, {}), tx = fromA ? c.tx : -c.tx, ty = fromA ? c.ty : -c.ty;
      const rx = ty, ry = -tx, px = c.x + rx * (ROAD_HALF + 5), py = c.y + ry * (ROAD_HALF + 5), yaw = -Math.atan2(ry, rx);
      if (inLandmark(px, py) || shoreDist(px, py) < 10) return;
      poles.push({ x: px, y: 26, z: py, sx: 1.6, sy: 52, sz: 1.6, c: '#14102a' });
      fb.push({ x: px - rx * 17, y: 51, z: py - ry * 17, sx: 34, sy: 1.6, sz: 1.6, ry: yaw, c: '#14102a' }); fb.push({ x: px - rx * 32, y: 45, z: py - ry * 32, sx: 4, sy: 12, sz: 4, ry: yaw, c: '#14102a' });
      fg.push({ x: px - rx * 32 + tx * 2.1, y: k % 2 ? 49 : 41, z: py - ry * 32 + ty * 2.1, sx: 3, sy: 3, sz: 1, ry: yaw, c: k % 2 ? '#ff3b5c' : '#3dffa6' });
    });
  });
  // boom gates across the driveways to landmarks: posts at the kerbs, a striped boom, a POLICE ONLY board
  for (const g of GATES) {
    const rx = -g.sa, ry = g.ca, yaw = -g.a, n = 10, seg = (ROAD_W - 8) / n;
    for (const sd of [-1, 1]) fb.push({ x: g.cx + rx * sd * (ROAD_HALF - 3), y: 10, z: g.cy + ry * sd * (ROAD_HALF - 3), sx: 5, sy: 20, sz: 5, ry: yaw, c: '#2b2e38' });
    for (let k = 0; k < n; k++) { const o = -ROAD_HALF + 4 + (k + 0.5) * seg; (k % 2 ? fb : fg).push({ x: g.cx + rx * o, y: 16, z: g.cy + ry * o, sx: 2.6, sy: 2.6, sz: seg, ry: yaw, c: k % 2 ? '#f1f1ee' : '#ff3b5c' }); }
    const sg = signMesh('POLICE ONLY', '#ff3b5c', 64, 13), x = g.cx + rx * (ROAD_HALF + 16), y = g.cy + ry * (ROAD_HALF + 16);
    sg.position.set(x, 30, y); cityGroup.add(sg);   // faces the camera
    fb.push({ x, y: 12, z: y, sx: 2, sy: 24, sz: 2, c: '#2b2e38' });
  }
  // parks: trees off the roads; beaches: palms, umbrellas and towels
  const paths = (MAP.yards || []).filter(y => y.k === 'pk'), onPath = (x, y) => paths.some(p => inPoly(x, y, p));   // park paths (js/10d) stay clear
  const slabs = [], clear = (x, y, m) => shoreDist(x, y) > m && !nearestRoad(x, y, SWO + 8) && groundH(x, y) === 0 && !inLandmark(x, y) && !nearLot(x, y) && !onPath(x, y);
  let parkTrees = 0;                                               // counted apart from the palms along the streets
  for (const p of MAP.grass) {
    const n = Math.min(150, Math.floor(Math.abs(polyArea(p.o)) / 9000));
    for (let k = 0; k < n && parkTrees++ < 1600; k++) {
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
  drawYards(); drawClutter(fb, fg, fc, fs, fp, trunks, crowns, poles, heads, pools);   // back alleys, yards and what lies about in them
  drawAirport(fb, fg, fc, poles, heads, pools);                    // the airfield: runway, taxiways, markings, lights (js/10f)
  drawPlaces(fb, fg, fc, fs, poles, heads, pools);                 // the base, the port, the lunapark, the space center: ground, roads, markings (js/10g)
  drawFences(fc);                                                  // every fence (js/10f)
  chunked(GB, M.instWhite, pads); chunked(GB, M.instWhite, slabs);
  chunked(GSphLo, M.instWhite, fs); chunked(GCirc, M.instBasic, fp);
  chunked(GCyl, M.instWhite, trunks); chunked(GSph, M.instWhite, crowns);
  chunked(GCyl, M.instWhite, poles); chunked(GB, M.instBasic, heads);
  chunked(GB, M.instWhite, fb); chunked(GB, M.instBasic, fg); chunked(GCyl, M.instWhite, fc);
  chunked(GP, LIGHT_POOL_M = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), pools);   // lit at night only (js/12d)
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
  if (!o.world) { o.mesh.position.set(o.cx, 0, o.cy); o.mesh.rotation.y = -(o.a || 0); }
  cityGroup.add(o.mesh);
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
  XRAY.value.set(t.x, 8, t.y); XRAY_CAM.value.copy(camera.position);   // fill buildings and landmarks cut a hole over this point instead
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
