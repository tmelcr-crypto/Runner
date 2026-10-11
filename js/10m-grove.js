'use strict';
/* ---------- 7o. THE PALM GROVE BY THE LUNAPARK CAR PARK ----------
   Map remodel 6 (MAP.lunapark.grove) made the rest of the car park's knob of land a palm grove: lawn, a sandy strip along the shore,
   rocks all along the waterline and a wooden pier off the north shore with a few boats tied up - scenery now; the boats you can
   drive, when they come, moor here. The palms and rocks are solid (a car stops at a trunk); the pier is walked on like land (js/04).
   Built once with the city (js/04 genWorld), streamed in pieces like the landmarks; the boats bob on the water (js/13; mode: groveBoats). Scenery: both modes. */
let GROVE = null;                           // { palms: [[x, y, h, lean, ang]], rocks: [[x, y, r, h]], boats: [...], meshes }
const GROVE_CHUNK = 320;
function inRing(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function placeGrove() {                     // js/04 genWorld, after the car park
  GROVE = null; const G = MAP.lunapark && MAP.lunapark.grove; if (!G) return;
  GROVE = withSeed(7311, () => {
    const inArea = (x, y) => G.area.some(r => inRing(x, y, r.o) && !(r.h || []).some(h => inRing(x, y, h)));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of G.area) for (const [x, y] of r.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const palms = [], rocks = [], S = 34;
    for (let y = y0 + S / 2; y < y1; y += S) for (let x = x0 + S / 2; x < x1; x += S) {     // a jittered grid: a grove, not an orchard
      const px = x + rand(-12, 12), py = y + rand(-12, 12); if (Math.random() < 0.18 || !inArea(px, py) || shoreDist(px, py) < 14) continue;
      palms.push([px, py, rand(34, 58), rand(0.05, 0.22), rand(0, TAU)]);
    }
    const [pq0, , pq2] = G.pier;
    for (const line of G.coast) for (let k = 0; k < line.length - 1; k++) {          // rocks all along the waterline, none where the pier starts
      const [ax, ay] = line[k], [bx, by] = line[k + 1], L = Math.hypot(bx - ax, by - ay);
      for (let t = 0; t < L; t += rand(9, 16)) {
        const x = ax + (bx - ax) * t / L, y = ay + (by - ay) * t / L; if (x > pq0 - 22 && x < pq2 + 22 && y < G.pier[3] + 30) continue;
        const g = shoreGrad(x, y), o = rand(-10, 4);                                 // a little out into the water, some up the beach
        rocks.push([x - g[0] * o, y - g[1] * o, rand(5, 13), rand(4, 12)]);
      }
    }
    return { palms, rocks, boats: G.boats.map(b => ({ x: b[0], y: b[1], a: b[2] * Math.PI / 180, k: b[3], ph: rand(0, TAU) })), meshes: [] };
  });
  for (const [x, y] of GROVE.palms) makeSolid(x, y, 6, 6, 0, { soft: true });         // trunks
  for (const [x, y, r] of GROVE.rocks) if (r > 8) makeSolid(x, y, r * 1.3, r * 1.3, rand(0, 1), { soft: true });
  const [hx0, hy0, hx1, hy1] = G.head, [px0, py0, px1, py1] = G.pier;                  // the pier's rails, open at the shore end and along the head where boats tie up
  for (const x of [px0 - 1, px1 + 1]) makeSolid(x, (py0 + py1) / 2 + 1, 2, py1 - py0 - 38, 0, { soft: true });
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const r of G.area) for (const [x, y] of r.o) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  LM_CLEAR.push([(bx0 + bx1) / 2, (by0 + by1) / 2 - 20, (bx1 - bx0) / 2, (by1 - by0) / 2 - 10]);   // no park trees or junk of the city's own in the grove
  const chunks = new Map();                                                            // palms and rocks streamed in pieces
  const key = (x, y) => Math.floor(x / GROVE_CHUNK) + ',' + Math.floor(y / GROVE_CHUNK);
  for (const p of GROVE.palms) { const k = key(p[0], p[1]); if (!chunks.has(k)) chunks.set(k, { palms: [], rocks: [] }); chunks.get(k).palms.push(p); }
  for (const r of GROVE.rocks) { const k = key(r[0], r[1]); if (!chunks.has(k)) chunks.set(k, { palms: [], rocks: [] }); chunks.get(k).rocks.push(r); }
  let n = 0;
  for (const [k, c] of chunks) {
    const [ix, iy] = k.split(',').map(Number), cx = (ix + 0.5) * GROVE_CHUNK, cy = (iy + 0.5) * GROVE_CHUNK, seed = 7400 + n++;
    LMS.push({ cx, cy, a: 0, rad: GROVE_CHUNK * 0.75 + 60, make: () => withSeed(seed, () => makeGroveChunk(c, cx, cy)), mesh: null });
  }
  LMS.push({ cx: (px0 + px1) / 2, cy: (hy0 + py1) / 2, a: 0, rad: Math.hypot(hx1 - hx0, py1 - hy0) / 2 + 80, make: () => withSeed(7390, () => makePier(G)), mesh: null });
}

/* ---------- models ---------- */
function grovePalm(T, x, z, h, lean, ang) {   // a curved trunk in rings, a crown of drooping fronds, coconuts
  const n = 7, lx = Math.cos(ang) * lean, lz = Math.sin(ang) * lean, bark = ['#6b4a2e', '#7a5636', '#5e4026'];
  let px = x, pz = z;
  for (let k = 0; k < n; k++) {
    const y0 = h * k / n, y1 = h * (k + 1) / n, b = (k + 1) / n, nx = x + lx * h * b * b, nz = z + lz * h * b * b;
    T.prism((px + nx) / 2, (pz + nz) / 2, 2.6 - k * 0.18, y0, y1 + 0.4, _C(bark[k % 3]), 6, 2.4 - k * 0.18); px = nx; pz = nz;
  }
  const top = h, greens = ['#1f9e5a', '#2bb36b', '#178a4a', '#3dbf6a'];
  for (let f = 0; f < 8; f++) {
    const a = f / 8 * TAU + rand(-0.2, 0.2), L = rand(15, 22), ca = Math.cos(a), sa = Math.sin(a), w = 3.2, col = _C(pick(greens));
    const mid = [px + ca * L * 0.55, top + rand(1, 3), pz + sa * L * 0.55], tip = [px + ca * L, top - rand(5, 9), pz + sa * L];
    const sx = -sa * w, sz = ca * w;
    face(T, [[px, top + 1, pz], [mid[0] + sx, mid[1], mid[2] + sz], [mid[0], mid[1] + 0.6, mid[2]], [mid[0] - sx, mid[1], mid[2] - sz]], [0, 1, 0], col);
    face(T, [[mid[0] + sx, mid[1], mid[2] + sz], [tip[0], tip[1], tip[2]], [tip[0], tip[1], tip[2]], [mid[0] - sx, mid[1], mid[2] - sz]], [0, 1, 0], col);
  }
  for (let c = 0; c < 3; c++) { const a = c * 2.1; T.prism(px + Math.cos(a) * 1.8, pz + Math.sin(a) * 1.8, 1.3, top - 2.6, top - 0.4, _C('#6b4a1e'), 5, 1.3, true); }
}
function groveRock(T, x, z, r, h) {           // a weathered boulder: two squat prisms, a lighter top
  const g = ['#6e6a72', '#7d7884', '#5e5a63', '#8a8478'][Math.floor(Math.random() * 4)], c = _C(g);
  T.prism(x, z, r, -2, h * 0.6, c, 6, r * 0.82, false);
  T.prism(x + rand(-1.5, 1.5), z + rand(-1.5, 1.5), r * 0.82, h * 0.6, h, _C(shade(g, 18)), 6, r * 0.4, true);
}
function makeGroveChunk(c, cx, cy) {
  const T = new GeoBuilder(), G = new GeoBuilder();
  for (const [x, y, h, lean, ang] of c.palms) grovePalm(T, x - cx, y - cy, h, lean, ang);
  for (const [x, y, r, h] of c.rocks) groveRock(T, x - cx, y - cy, r, h);
  for (let k = 0; k < c.palms.length / 6; k++) { const p = pick(c.palms); flat(G, p[0] - cx - 3, p[1] - cy - 3, p[0] - cx + 3, p[1] - cy + 3, 0.5, _C('#3a5a2a')); }   // a little shade of undergrowth
  return lmMesh(T, G);
}
function makePier(G) {                       // planks on pilings, the T-head with bollards, lamps and a bench; the boats tied up beside it
  const T = new GeoBuilder(), Gl = new GeoBuilder(), [px0, py0, px1, py1] = G.pier, [hx0, hy0, hx1, hy1] = G.head;
  const cx = (px0 + px1) / 2, cy = (hy0 + py1) / 2, X = x => x - cx, Z = y => y - cy, wood = ['#9a7a52', '#8a6a48', '#a98a5e'];
  const deck = (x0, y0, x1, y1, along) => {
    box5(T, X(x0), -6, Z(y0), X(x1), 1.2, Z(y1), _C('#6b4a2e'));
    if (along) for (let y = y0; y < y1; y += 5) box5(T, X(x0) + 0.4, 1.2, Z(y), X(x1) - 0.4, 1.6, Z(Math.min(y1, y + 4.4)), _C(pick(wood)));
    else for (let x = x0; x < x1; x += 5) box5(T, X(x), 1.2, Z(y0) + 0.4, X(Math.min(x1, x + 4.4)), 1.6, Z(y1) - 0.4, _C(pick(wood)));
    for (let y = y0 + 4; y < y1; y += 22) for (const x of [x0 + 2, x1 - 2]) T.prism(X(x), Z(y), 1.6, -12, 3, _C('#4e3a26'), 6, 1.6, true);   // pilings
  };
  deck(px0, py0, px1, py1, true); deck(hx0, hy0, hx1, hy1, false);
  for (const x of [px0, px1]) for (let y = py0 + 20; y < py1 - 18; y += 3) if (y % 24 < 3) box5(T, X(x) - 0.6, 1.6, Z(y) - 0.6, X(x) + 0.6, 9, Z(y) + 0.6, _C('#e8e4d8'));   // rail posts
  for (const x of [px0, px1]) box5(T, X(x) - 0.7, 8.4, Z(py0 + 20), X(x) + 0.7, 9.6, Z(py1 - 18), _C('#e8e4d8'));
  for (let x = hx0 + 10; x < hx1; x += 34) { T.prism(X(x), Z(hy0 + 3), 1.4, 1.6, 4, _C('#2a2d3a'), 8, 1.1, true); T.prism(X(x), Z(hy1 - 3), 1.4, 1.6, 4, _C('#2a2d3a'), 8, 1.1, true); }   // bollards
  for (const x of [hx0 + 6, hx1 - 6]) { T.prism(X(x), Z((hy0 + hy1) / 2), 0.7, 1.6, 26, _C('#2a2d3a'), 6); box5(Gl, X(x) - 2, 25, Z((hy0 + hy1) / 2) - 2, X(x) + 2, 28, Z((hy0 + hy1) / 2) + 2, _C('#ffe9a8')); }   // lamps
  box5(T, X(cx) - 12, 1.6, Z(hy0 + 6), X(cx) + 12, 4.6, Z(hy0 + 10), _C('#7a5a3a')); box5(T, X(cx) - 12, 4.6, Z(hy0 + 4), X(cx) + 12, 9, Z(hy0 + 5.4), _C('#7a5a3a'));   // a bench facing the sea
  T.prism(X(px1) + 2, Z(py1 - 14), 2.8, 4, 6, _C('#ff4d4d'), 10, 2.8, true); T.prism(X(px1) + 2, Z(py1 - 14), 1.6, 4, 6.2, _C('#f4f4f6'), 8, 1.6, true);   // a lifebuoy
  const m = lmMesh(T, Gl), sign = signMesh('GROVE DOCK', '#2bf3ff', 60, 14); sign.position.set(X(cx), 20, Z(py1) - 4); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180) * 0.6; m.add(sign); m.userData.own.push(sign.material);
  for (const b of GROVE.boats) { const bm = makeBoat(b.k); bm.position.set(X(b.x), 0, Z(b.y)); bm.rotation.y = -b.a; m.add(bm); b.mesh = bm; }
  return m;
}
function makeBoat(k) {                      // moored boats, pointing along +x: speedboat, fishing boat, sailboat, yacht
  const T = new GeoBuilder(), Gl = new GeoBuilder(), hull = (L, W, H, col, deckCol) => {
    box5(T, -L / 2, -3, -W / 2, L / 2 - W * 0.6, H, W / 2, _C(col));
    face(T, [[L / 2 - W * 0.6, -3, -W / 2], [L / 2, -2, 0], [L / 2, H, 0], [L / 2 - W * 0.6, H, -W / 2]], [0.7, 0, -0.7], _C(col));
    face(T, [[L / 2 - W * 0.6, -3, W / 2], [L / 2, -2, 0], [L / 2, H, 0], [L / 2 - W * 0.6, H, W / 2]], [0.7, 0, 0.7], _C(col));
    face(T, [[-L / 2 + 1, H + 0.1, -W / 2 + 1], [L / 2 - W * 0.6, H + 0.1, -W / 2 + 1], [L / 2 - 2, H + 0.1, 0], [-L / 2 + 1, H + 0.1, W / 2 - 1]], [0, 1, 0], _C(deckCol));
    face(T, [[L / 2 - W * 0.6, H + 0.1, -W / 2 + 1], [L / 2 - 2, H + 0.1, 0], [L / 2 - W * 0.6, H + 0.1, W / 2 - 1], [-L / 2 + 1, H + 0.1, W / 2 - 1]], [0, 1, 0], _C(deckCol));
  };
  if (k === 'speed') { const c = pick(['#f4f4f6', '#ff2bd6', '#2bf3ff', '#ffe14a']); hull(46, 16, 3.5, c, '#e8e4d8'); box5(T, -22, 2, -8.2, 12, 3, 8.2, _C(pick(['#e0364f', '#2a4aa8', '#16161c']))); box5(Gl, 0, 3.5, -6, 3, 8, 6, _C('#9fd8ff')); box5(T, -10, 3.6, -5, -2, 6, 5, _C('#2a2d3a')); box5(T, -24, 0, -2, -21, 5, 2, _C('#2a2d3a')); }
  else if (k === 'fish') { hull(56, 20, 5, '#2a4aa8', '#b08a5a'); box5(T, -8, 5, -7, 10, 17, 7, _C('#f4f4f6')); box5(Gl, 8, 9, -6, 10.2, 14, 6, _C('#9fd8ff')); box5(T, -24, 5, -0.6, -22, 30, 0.6, _C('#e8e8ee')); box5(T, -24, 28, -9, -22, 29, 9, _C('#e8e8ee')); }
  else if (k === 'sail') { hull(50, 16, 4, '#f4f4f6', '#b08a5a'); box5(T, -6, 4, -5, 8, 9, 5, _C('#e8e4d8')); T.prism(10, 0, 0.9, 4, 72, _C('#d8d4c8'), 6); box5(T, -14, 10, -0.8, 10, 12, 0.8, _C('#c8ccd4')); box5(T, -13, 12, -1.6, 9, 15, 1.6, _C('#2a4aa8')); }
  else { hull(80, 24, 7, '#f4f4f6', '#e8e4d8'); box5(T, -24, 7, -9, 18, 17, 9, _C('#f4f4f6')); box5(Gl, -20, 11, -9.2, 16, 15, 9.2, _C('#1d2f4a')); box5(T, -14, 17, -7, 8, 22, 7, _C('#e8e8ee')); box5(Gl, -12, 19, -7.2, 6, 21, 7.2, _C('#1d2f4a')); box5(T, -38, 3, -12.2, 30, 4.4, 12.2, _C('#2bf3ff')); }
  return lmMesh(T, Gl);
}
function gfxGrove(time) {                  // js/13: the boats bob and roll a little
  if (!GROVE) return; const on = feat('groveBoats');
  for (const b of GROVE.boats) if (b.mesh) { b.mesh.visible = on; b.mesh.position.y = Math.sin(time * 1.3 + b.ph) * 0.9 - 0.4; b.mesh.rotation.x = Math.sin(time * 1.1 + b.ph) * 0.03; b.mesh.rotation.z = Math.sin(time * 0.9 + b.ph * 1.7) * 0.025; }
}
