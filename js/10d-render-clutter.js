'use strict';
/* ---------- 7g. BACK ALLEYS, YARDS AND THE REST OF THE OPEN GROUND ----------
   The map leaves an alley behind each row of buildings and a yard wherever a block has room left over. Here they are paved and filled:
   dumpsters, trash bags, crates, pallets, bins, barrels, AC units, puddles, graffiti, lamps over the back doors, washing lines across
   the narrow alleys. Promenades along the water get palms, benches and lamps; quays get bollards; the apron gets floodlights and carts;
   park paths get benches and lamps.
   The clutter is laid out once with a fixed seed (the same every game); dumpsters, crate stacks and AC units are solid. */
let CLUTTER = [];
const YARD_COL = { y: '#2b2442', p: '#4a4170', ap: '#393550', q: '#423c5c', pk: '#584c84' }, ALLEY_COL = '#211b30';
const GRAF = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff'], GSphLo = new THREE.SphereGeometry(1, 6, 4);   // trash bags are lumpy anyway
const _wallQ = [];
function wallAt(x, y) {                                           // is there a building wall right here?
  bHash.query(x - 6, y - 6, x + 6, y + 6, _wallQ);
  for (const r of _wallQ) if (r.bld && inSolid(x, y, r, 3)) return true;
  return false;
}
function edgesOf(poly, fn) {                                       // every edge of a polygon {o, h}, with its inward normal
  for (const ring of [poly.o, ...poly.h]) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 20) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; let nx = -uy, ny = ux;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (!inPoly(mx + nx * 6, my + ny * 6, poly)) { nx = -nx; ny = -ny; }
    fn(a, ux, uy, nx, ny, L);
  }
}
const lotAt = (x, y, m) => LOTS.some(L => { const dx = x - L.cx, dy = y - L.cy, ca = Math.cos(L.a), sa = Math.sin(L.a); return Math.abs(dx * ca + dy * sa) < L.w / 2 + m && Math.abs(-dx * sa + dy * ca) < L.d / 2 + m; });
function makeClutter() {
  const out = [], street = (x, y) => !!nearestRoad(x, y, ROAD_HALF + SW_W + 18);
  const solid = (x, y, w, h, a) => makeSolid(x, y, w, h, a, { clutter: true });
  function junk(x, y, yaw, ux, uy, nx, ny, wall) {                 // one heap of back-alley junk against a wall
    if (street(x, y) || inLandmark(x, y) || shoreDist(x, y) < 12 || wallAt(x, y) || lotAt(x, y, 8)) return;
    const r = Math.random();
    if (r < 0.18) { const o = { k: 'dump', x, y, yaw, c: pick(['#2f6f4f', '#2a4aa8', '#7a3b2a', '#3a3f5c', '#4f6f2f']) }; out.push(o); o.solid = solid(x, y, 26, 14, yaw); }
    else if (r < 0.34) out.push({ k: 'bags', x, y, n: randi(2, 5) });
    else if (r < 0.5) out.push({ k: 'boxes', x, y, yaw, ux, uy, n: randi(1, 4) });
    else if (r < 0.6) { const n = randi(1, 3), o = { k: 'crates', x, y, yaw, n }; out.push(o); if (n > 1) o.solid = solid(x, y, 11, 11, yaw); }
    else if (r < 0.66) out.push({ k: 'pallet', x, y, yaw, top: Math.random() < 0.4 });
    else if (r < 0.78) out.push({ k: 'bins', x, y, yaw, ux, uy });
    else if (r < 0.85) out.push({ k: 'barrel', x, y, c: pick(['#b8452f', '#3a5f9e', '#5f6b3a']) });
    else if (r < 0.94 && wall) { const o = { k: 'ac', x, y, yaw }; out.push(o); o.solid = solid(x, y, 12, 10, yaw); }
  }
  for (const a of MAP.alleys || []) {                              // back alleys: junk along both walls, puddles, lamps, graffiti, washing lines
    const ang = a[4] * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, L = a[2], W = a[3], yaw = ang;
    for (const sd of [-1, 1]) {
      const wx = a[0] + nx * sd * W / 2, wy = a[1] + ny * sd * W / 2, inx = -nx * sd, iny = -ny * sd;
      for (let t = -L / 2 + 14 + Math.random() * 30; t < L / 2 - 12; t += rand(28, 56)) {   // the middle stays clear to walk (or squeeze a car) through
        const px = wx + ux * t, py = wy + uy * t, wall = wallAt(px - inx * 2, py - iny * 2);
        if (Math.random() < (wall ? 0.85 : 0.35)) junk(px + inx * 9, py + iny * 9, yaw, ux, uy, inx, iny, wall);
        if (wall && Math.random() < 0.12 && !street(px, py)) out.push({ k: 'graf', x: px + inx * 0.6, y: py + iny * 0.6, yaw, w: rand(12, 28), h: rand(5, 10), c: pick(GRAF) });
        if (wall && Math.random() < 0.12 && !street(px, py)) out.push({ k: 'lamp', x: px + inx * 2, y: py + iny * 2, yaw, gx: px + inx * 18, gy: py + iny * 18 });
      }
    }
    for (let t = -L / 2 + rand(30, 90); t < L / 2 - 30; t += rand(70, 150)) {
      const px = a[0] + ux * t + nx * rand(-W / 5, W / 5), py = a[1] + uy * t + ny * rand(-W / 5, W / 5);
      if (!street(px, py)) out.push({ k: 'puddle', x: px, y: py, yaw: Math.random() * TAU, r: rand(6, 13) });
    }
    if (W <= 100) for (let t = -L / 2 + rand(40, 90); t < L / 2 - 40; t += rand(60, 120)) {   // washing lines between the two backs
      const cx = a[0] + ux * t, cy = a[1] + uy * t, x1 = cx - nx * W / 2, y1 = cy - ny * W / 2, x2 = cx + nx * W / 2, y2 = cy + ny * W / 2;
      if (wallAt(x1 + nx * 2, y1 + ny * 2) && wallAt(x2 - nx * 2, y2 - ny * 2) && !street(cx, cy)) out.push({ k: 'line', x: cx, y: cy, yaw: ang + Math.PI / 2, len: W, h: rand(25, 31) });
    }
  }
  for (const y of MAP.yards || []) {
    if (y.k === 'y') {                                             // service yards: junk round the edges, pallets and puddles in the middle
      edgesOf(y, (a, ux, uy, nx, ny, L) => {
        for (let t = 10 + Math.random() * 24; t < L - 10; t += rand(34, 70)) {
          const px = a[0] + ux * t, py = a[1] + uy * t, wall = wallAt(px - nx * 2, py - ny * 2);
          if (Math.random() < (wall ? 0.7 : 0.25)) junk(px + nx * 9, py + ny * 9, Math.atan2(uy, ux), ux, uy, nx, ny, wall);
          if (wall && Math.random() < 0.1) out.push({ k: 'graf', x: px + nx * 0.6, y: py + ny * 0.6, yaw: Math.atan2(uy, ux), w: rand(12, 28), h: rand(5, 10), c: pick(GRAF) });
          if (wall && Math.random() < 0.09) out.push({ k: 'lamp', x: px + nx * 2, y: py + ny * 2, yaw: Math.atan2(uy, ux), gx: px + nx * 18, gy: py + ny * 18 });
        }
      });
      const n = Math.min(14, Math.floor(Math.abs(polyArea(y.o)) / 9000));
      for (let k = 0; k < n; k++) { const p = randomIn(y, (x, yy) => !street(x, yy) && !wallAt(x, yy)); if (p) out.push(Math.random() < 0.5 ? { k: 'puddle', x: p[0], y: p[1], yaw: Math.random() * TAU, r: rand(6, 14) } : { k: 'pallet', x: p[0], y: p[1], yaw: Math.random() * TAU, top: Math.random() < 0.5 }); }
    } else if (y.k === 'p') {                                      // promenades and forecourts: palms, benches and lamps along the water, planters elsewhere
      edgesOf(y, (a, ux, uy, nx, ny, L) => {
        const wet = shoreDist(a[0] + ux * L / 2 - nx * 30, a[1] + uy * L / 2 - ny * 30) < 0;
        for (let t = 12 + Math.random() * 20; t < L - 12; t += wet ? rand(40, 60) : rand(110, 170)) {
          const px = a[0] + ux * t + nx * 14, py = a[1] + uy * t + ny * 14; if (street(px, py) || inLandmark(px, py) || wallAt(px, py)) continue;
          const r = Math.random(), yaw = Math.atan2(uy, ux);
          if (!wet) out.push({ k: 'planter', x: px, y: py, yaw });
          else if (r < 0.4) out.push({ k: 'palm', x: px, y: py });
          else if (r < 0.7) out.push({ k: 'bench', x: px, y: py, yaw, nx, ny });
          else out.push({ k: 'plamp', x: px, y: py });
        }
      });
    } else if (y.k === 'q') {                                      // quays: bollards on the water edge, crates and barrels behind
      edgesOf(y, (a, ux, uy, nx, ny, L) => {
        const wet = shoreDist(a[0] + ux * L / 2 - nx * 30, a[1] + uy * L / 2 - ny * 30) < 0;
        for (let t = 10; t < L - 10; t += wet ? 48 : rand(40, 80)) {
          const px = a[0] + ux * t + nx * (wet ? 8 : 16), py = a[1] + uy * t + ny * (wet ? 8 : 16); if (street(px, py)) continue;
          if (wet) out.push({ k: 'bollard', x: px, y: py }); else if (Math.random() < 0.5) junk(px, py, Math.atan2(uy, ux), ux, uy, nx, ny, false);
        }
      });
    } else if (y.k === 'ap') {                                     // the apron: floodlights round the edge, baggage carts
      edgesOf(y, (a, ux, uy, nx, ny, L) => {
        for (let t = 40; t < L - 40; t += 320) { const px = a[0] + ux * t + nx * 20, py = a[1] + uy * t + ny * 20; if (!street(px, py)) out.push({ k: 'flood', x: px, y: py }); }
      });
      const n = MAP.airport ? 0 : Math.min(10, Math.floor(Math.abs(polyArea(y.o)) / 60000));   // the Skyport's carts wait between the gates, off the planes' way (js/10f)
      for (let k = 0; k < n; k++) { const p = randomIn(y, (x, yy) => !street(x, yy)); if (p) out.push({ k: 'cart', x: p[0], y: p[1], yaw: Math.random() * TAU }); }
    } else if (y.k === 'pk') {                                     // park paths: benches and lamps along both edges, now one side, now the other
      let side = 0;
      edgesOf(y, (a, ux, uy, nx, ny, L) => {
        for (let t = 20 + Math.random() * 40; t < L - 20; t += rand(90, 150)) {
          const px = a[0] + ux * t - nx * 8, py = a[1] + uy * t - ny * 8; if (street(px, py) || inLandmark(px, py) || shoreDist(px, py) < 10) continue;   // just off the path, on the grass
          if (++side % 3) out.push({ k: 'bench', x: px - nx * 4, y: py - ny * 4, yaw: Math.atan2(uy, ux), nx, ny }); else out.push({ k: 'plamp', x: px, y: py });
        }
      });
    }
  }
  return out;
}

/* small junk shared with the sidewalks (js/10): a pile of cardboard boxes along a wall, a heap of garbage bags, a wheelie bin */
function boxPile(fb, x, y, yaw, ux, uy, n) {
  let h = 0;
  for (let i = 0; i < n; i++) {
    const s = rand(5.5, 9), stack = i > 0 && Math.random() < 0.35, along = stack ? 0 : (i - (n - 1) / 2) * 8.5 + rand(-1, 1), y0 = stack ? h : 0;
    const bx = x + ux * along + rand(-1, 1), by = y + uy * along + rand(-1, 1), r = yaw + rand(-0.35, 0.35), c = pick(['#a07a4c', '#b98d58', '#8a6a44', '#c9a676']);
    fb.push({ x: bx, y: y0 + s * 0.4, z: by, sx: s, sy: s * 0.8, sz: s * 0.85, ry: r, c });
    fb.push({ x: bx, y: y0 + s * 0.8 + 0.1, z: by, sx: s * 1.01, sy: 0.25, sz: 1.4, ry: r, c: '#d9c29a' });   // packing tape across the top
    h = stack ? h + s * 0.8 : s * 0.8;
  }
}
function bagHeap(fs, x, y, n) {
  for (let i = 0; i < n; i++) { const r = rand(3, 4.6); fs.push({ x: x + rand(-6, 6), y: r * 0.8, z: y + rand(-4, 4), sx: r, sy: r * 0.85, sz: r, c: pick(['#17151e', '#24222c', '#33303f', '#2a3a2a']) }); }
}
function wheelie(fb, x, y, yaw) {
  const c = pick(['#2f6f4f', '#2a4aa8', '#55586a', '#3a3f5c']);
  fb.push({ x, y: 5.2, z: y, sx: 7, sy: 10.4, sz: 7.4, ry: yaw, c }); fb.push({ x, y: 10.8, z: y, sx: 7.6, sy: 0.9, sz: 8, ry: yaw, c: shade(c, -25) });
}

/* ground: the yards as flat shapes, the alleys as dark asphalt strips with a gutter down the middle */
function drawYards() {
  for (const k of ['y', 'p', 'ap', 'q', 'pk']) { const ps = (MAP.yards || []).filter(y => y.k === k); if (ps.length) shapeMesh(ps, 0.3, YARD_COL[k]); }
  const T = new Tris(), c = new THREE.Color(ALLEY_COL), g = new THREE.Color('#15111f');
  for (const a of MAP.alleys || []) {
    const ang = a[4] * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), w = (x, z) => [a[0] + ca * x - sa * z, a[1] + sa * x + ca * z], L = a[2] / 2, W = a[3] / 2;
    T.quad(w(-L, -W), w(L, -W), w(L, W), w(-L, W), 0.35, c); T.quad(w(-L, -1.5), w(L, -1.5), w(L, 1.5), w(-L, 1.5), 0.4, g);
  }
  if ((MAP.alleys || []).length) T.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })).frustumCulled = false;
}
/* the clutter as instanced boxes, cylinders, spheres and flat discs, merged with the street furniture */
function drawClutter(fb, fg, fc, fs, fp, trunks, crowns, poles, heads, pools) {
  const off = (o, d, s) => [o.x + Math.cos(o.yaw) * d - Math.sin(o.yaw) * s, o.y + Math.sin(o.yaw) * d + Math.cos(o.yaw) * s];
  const lists = [[fb, GB, false], [fg, GB, true], [fc, GCyl, false], [fs, GSphLo, false], [crowns, GSph, false]];
  const MASS = { dump: 2.4, bags: 0.5, boxes: 0.4, crates: 1.1, pallet: 0.8, bins: 0.7, barrel: 1, ac: 1.2, bench: 1, planter: 1.8, cart: 1.4 };   // what a blast can throw, and how heavy
  const SMASHK = o => ({ bags: 'bag', boxes: 'box', crates: o.n === 1 ? 'crate' : null, pallet: 'pallet', bins: 'bin', barrel: 'bin' })[o.k] || null;   // what a car does to it (js/12e)
  for (const o of CLUTTER) {
    const ry = -(o.yaw || 0), mark = MASS[o.k] ? partMark(lists) : null;
    if (o.k === 'dump') { fb.push({ x: o.x, y: 7, z: o.y, sx: 26, sy: 14, sz: 14, ry, c: o.c }); fb.push({ x: o.x, y: 14.7, z: o.y, sx: 26.8, sy: 1.4, sz: 14.8, ry, c: shade(o.c, -30) }); }
    else if (o.k === 'boxes') boxPile(fb, o.x, o.y, ry, o.ux, o.uy, o.n);
    else if (o.k === 'bags') for (let i = 0; i < o.n; i++) { const r = rand(3, 4.6); fs.push({ x: o.x + rand(-7, 7), y: r * 0.8, z: o.y + rand(-5, 5), sx: r, sy: r * 0.85, sz: r, c: pick(['#17151e', '#24222c', '#33303f', '#2a3a2a']) }); }
    else if (o.k === 'crates') for (let i = 0; i < o.n; i++) fb.push({ x: o.x + rand(-1, 1), y: 5 + i * 10, z: o.y + rand(-1, 1), sx: 10, sy: 10, sz: 10, ry: ry + rand(-0.2, 0.2), c: pick(['#8a6a44', '#6e5236', '#9a7a50']) });
    else if (o.k === 'pallet') { fb.push({ x: o.x, y: 0.9, z: o.y, sx: 14, sy: 1.8, sz: 12, ry, c: '#9a7a50' }); if (o.top) fb.push({ x: o.x, y: 6.8, z: o.y, sx: 11, sy: 10, sz: 9, ry, c: pick(['#c9c4b0', '#6e5236', '#3a5f9e']) }); }
    else if (o.k === 'bins') for (let i = 0; i < 2; i++) { const [x, z] = off(o, (i - 0.5) * 8, 0), col = pick(['#2a4aa8', '#2f6f4f', '#55586a']); fc.push({ x, y: 5, z, sx: 3.6, sy: 10, sz: 3.6, c: col }); fb.push({ x, y: 10.4, z, sx: 7.4, sy: 0.9, sz: 7.4, ry, c: shade(col, -25) }); }
    else if (o.k === 'barrel') fc.push({ x: o.x, y: 5.5, z: o.y, sx: 4.2, sy: 11, sz: 4.2, c: o.c });
    else if (o.k === 'ac') { fb.push({ x: o.x, y: 4.5, z: o.y, sx: 12, sy: 9, sz: 10, ry, c: '#9aa0ab' }); fc.push({ x: o.x, y: 9.3, z: o.y, sx: 3.6, sy: 0.6, sz: 3.6, c: '#3a3d47' }); }
    else if (o.k === 'puddle') fp.push({ x: o.x, y: 0.5, z: o.y, sx: o.r, sy: 1, sz: o.r * 0.6, ry, c: pick(['#24346c', '#2a2f66', '#3a2a6a']) });
    else if (o.k === 'graf') fg.push({ x: o.x, y: 4 + o.h / 2 + rand(0, 4), z: o.y, sx: o.w, sy: o.h, sz: 0.4, ry, c: o.c });
    else if (o.k === 'lamp') { fg.push({ x: o.x, y: 22, z: o.y, sx: 4, sy: 2, sz: 3, ry, c: '#ffcf7a' }); pools.push({ x: o.gx, y: 1.5, z: o.gy, sx: 70, sy: 1, sz: 70, c: '#ffb85a' }); }
    else if (o.k === 'line') {
      fb.push({ x: o.x, y: o.h, z: o.y, sx: o.len, sy: 0.5, sz: 0.5, ry, c: '#cfc8e8' });
      for (let t = -o.len / 2 + 8; t < o.len / 2 - 8; t += rand(7, 12)) { const [x, z] = off(o, t, 0); fb.push({ x, y: o.h - 4.4, z, sx: rand(4, 7), sy: rand(6, 9), sz: 0.6, ry, c: pick(['#f1f1ee', '#ff6fae', '#6fb8ff', '#ffe14a', '#9be8c8', '#ff7a3d']) }); }
    }
    else if (o.k === 'palm') { trunks.push({ x: o.x, y: 16, z: o.y, sx: 2.4, sy: 32, sz: 2.4, c: '#3b2a1e' }); crowns.push({ x: o.x, y: 33, z: o.y, sx: 15, sy: 5, sz: 15, c: pick(['#14a37f', '#1ec9a6', '#0f8f86']) }); }
    else if (o.k === 'bench') { fb.push({ x: o.x, y: 5, z: o.y, sx: 16, sy: 1.4, sz: 5, ry, c: '#7a5a3a' }); fb.push({ x: o.x - o.nx * 2.5, y: 8, z: o.y - o.ny * 2.5, sx: 16, sy: 5, sz: 1, ry, c: '#7a5a3a' }); fb.push({ x: o.x, y: 2.2, z: o.y, sx: 14, sy: 4.4, sz: 3, ry, c: '#2b2e38' }); }
    else if (o.k === 'plamp') { poles.push({ x: o.x, y: 15, z: o.y, sx: 1.2, sy: 30, sz: 1.2, c: '#14102a' }); heads.push({ x: o.x, y: 31, z: o.y, sx: 5, sy: 3, sz: 5, c: '#fff3b0' }); pools.push({ x: o.x, y: 1.5, z: o.y, sx: 90, sy: 1, sz: 90, c: '#ffd98a' }); }
    else if (o.k === 'planter') { fb.push({ x: o.x, y: 2.5, z: o.y, sx: 12, sy: 5, sz: 12, ry, c: '#8d86a8' }); fs.push({ x: o.x, y: 7, z: o.y, sx: 6, sy: 4, sz: 6, c: pick(['#1f9e7a', '#23b38a', '#7a35d6']) }); }
    else if (o.k === 'bollard') { fc.push({ x: o.x, y: 3, z: o.y, sx: 2.6, sy: 6, sz: 2.6, c: '#2b2e38' }); fc.push({ x: o.x, y: 6.4, z: o.y, sx: 3.2, sy: 0.8, sz: 3.2, c: '#ffb02e' }); }
    else if (o.k === 'flood') { poles.push({ x: o.x, y: 35, z: o.y, sx: 2, sy: 70, sz: 2, c: '#14102a' }); heads.push({ x: o.x, y: 70, z: o.y, sx: 10, sy: 4, sz: 10, c: '#fff3b0' }); pools.push({ x: o.x, y: 1.5, z: o.y, sx: 220, sy: 1, sz: 220, c: '#fff1c0' }); }
    else if (o.k === 'cart') { fb.push({ x: o.x, y: 4, z: o.y, sx: 16, sy: 5, sz: 10, ry, c: '#d6d2c4' }); fb.push({ x: o.x, y: 8.5, z: o.y, sx: 12, sy: 4, sz: 8, ry, c: pick(['#2a4aa8', '#7a3b2a', '#4a4e5c']) }); }
    if (mark) registerThrow(o.x, o.y, partsSince(lists, mark), o.solid || null, MASS[o.k], SMASHK(o));
  }
  for (const L of LOTS) {                                         // a light on the lot's front corner and a P sign in the colour of the building it belongs to
    const o = L.owner, pc = !o ? '#3f6bff' : o.special === 'hospital' ? '#e0364f' : o.special === 'police' ? '#3f6bff' : o.c;
    const ca = Math.cos(L.a), sa = Math.sin(L.a), x = L.cx + ca * (L.w / 2 - 6) - sa * (L.d / 2 - 6), y = L.cy + sa * (L.w / 2 - 6) + ca * (L.d / 2 - 6);
    poles.push({ x, y: 15, z: y, sx: 1.2, sy: 30, sz: 1.2, c: '#14102a' }); fg.push({ x, y: 26, z: y, sx: 7, sy: 7, sz: 1, ry: -L.a, c: pc }); pools.push({ x: L.cx, y: 1.5, z: L.cy, sx: 140, sy: 1, sz: 140, c: '#9fc4ff' });
  }
}
