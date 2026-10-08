'use strict';
/* ---------- city edges: beach + lake, or a solid row of buildings ---------- */
let EDGEB = [], waterTex = null, waterMat = null, foamMat = null;
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
function buildEdges() {
  EDGEB = []; const shadow = [], slabs = [], trunks = [], crowns = [], lk = k => EDGE[k] === 'lake';
  const SL = 30;
  const Rx0 = lk('w') ? -BEACH : 0, Rx1 = lk('e') ? W + BEACH : W, Ry0 = lk('n') ? -BEACH : 0, Ry1 = lk('s') ? W + BEACH : W;
  const Fx0 = lk('w') ? Rx0 + SL : 0, Fx1 = lk('e') ? Rx1 - SL : W, Fy0 = lk('n') ? Ry0 + SL : 0, Fy1 = lk('s') ? Ry1 - SL : W;
  const SAND = '#3a2d63', WET = '#7a3cff';
  const box = (x0, x1, y0, y1, h, c) => { if (x1 - x0 > 0.5 && y1 - y0 > 0.5) slabs.push({ x: (x0 + x1) / 2, y: h / 2, z: (y0 + y1) / 2, sx: x1 - x0, sy: h, sz: y1 - y0, c }); };
  // flat sand
  if (lk('w')) box(Fx0, 0, Fy0, Fy1, SIDE_H, SAND);
  if (lk('e')) box(W, Fx1, Fy0, Fy1, SIDE_H, SAND);
  if (lk('n')) box(0, W, Fy0, 0, SIDE_H, SAND);
  if (lk('s')) box(0, W, W, Fy1, SIDE_H, SAND);
  // sloped shoreline (vertex-coloured, wet sand toward the water)
  const pos = [], col = [], nor = [], cs = new THREE.Color(SAND), cw = new THREE.Color(WET);
  const V = (x, y, h, c) => { pos.push(x, h, y); col.push(c.r, c.g, c.b); nor.push(0, 1, 0); };
  const slope = (A, B, C, D) => { const lo = 0.15; V(A[0], A[1], lo, cw); V(B[0], B[1], lo, cw); V(C[0], C[1], SIDE_H, cs); V(A[0], A[1], lo, cw); V(C[0], C[1], SIDE_H, cs); V(D[0], D[1], SIDE_H, cs); };
  if (lk('w')) slope([Rx0, Ry0], [Rx0, Ry1], [Fx0, Fy1], [Fx0, Fy0]);
  if (lk('e')) slope([Rx1, Ry1], [Rx1, Ry0], [Fx1, Fy0], [Fx1, Fy1]);
  if (lk('n')) slope([Rx1, Ry0], [Rx0, Ry0], [Fx0, Fy0], [Fx1, Fy0]);
  if (lk('s')) slope([Rx0, Ry1], [Rx1, Ry1], [Fx1, Fy1], [Fx0, Fy1]);
  if (pos.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    cityGroup.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }
  // water: frame strips outside the shore line
  if (!waterTex) waterTex = makeWaterTex();
  if (!waterMat) { waterMat = new THREE.MeshBasicMaterial({ color: 0x1d5fe0, map: waterTex, side: THREE.DoubleSide }); foamMat = new THREE.MeshBasicMaterial({ color: 0x2bf3ff, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); }
  const OUT = 3200, wp = [], wu = [], fp = [];
  const quadTo = (arr, uv, x0, x1, y0, y1, h) => {
    const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    for (const k of [0, 1, 2, 0, 2, 3]) { arr.push(P[k][0], h, P[k][1]); if (uv) uv.push(P[k][0] / 150, P[k][1] / 150); }
  };
  const wy0 = lk('n') ? -OUT : 0, wy1 = lk('s') ? W + OUT : W;
  if (lk('w')) quadTo(wp, wu, -OUT, Rx0, wy0, wy1, 0.05);
  if (lk('e')) quadTo(wp, wu, Rx1, W + OUT, wy0, wy1, 0.05);
  if (lk('n')) quadTo(wp, wu, Rx0, Rx1, -OUT, Ry0, 0.05);
  if (lk('s')) quadTo(wp, wu, Rx0, Rx1, Ry1, W + OUT, 0.05);
  const FW = 9;
  if (lk('w')) quadTo(fp, null, Rx0 - 2, Rx0 + FW, Ry0 - (lk('n') ? 2 : 0), Ry1 + (lk('s') ? 2 : 0), 0.2);
  if (lk('e')) quadTo(fp, null, Rx1 - FW, Rx1 + 2, Ry0 - (lk('n') ? 2 : 0), Ry1 + (lk('s') ? 2 : 0), 0.2);
  if (lk('n')) quadTo(fp, null, Rx0, Rx1, Ry0 - 2, Ry0 + FW, 0.2);
  if (lk('s')) quadTo(fp, null, Rx0, Rx1, Ry1 - FW, Ry1 + 2, 0.2);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2));
  const wm = new THREE.Mesh(wg, waterMat); wm.frustumCulled = false; cityGroup.add(wm);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  const fm = new THREE.Mesh(fg, foamMat); fm.frustumCulled = false; cityGroup.add(fm);
  // beach props: palms and striped umbrellas on the flat sand
  const sideInfo = { w: () => [rand(Fx0 + 14, -22), rand(Fy0, Fy1)], e: () => [rand(W + 22, Fx1 - 14), rand(Fy0, Fy1)], n: () => [rand(Fx0, Fx1), rand(Fy0 + 14, -22)], s: () => [rand(Fx0, Fx1), rand(W + 22, Fy1 - 14)] };
  for (const k of EDGE_KEYS) if (lk(k)) for (let n = 0; n < 16; n++) {
    const [px, py] = sideInfo[k](); if (px > -18 && px < W + 18 && py > -18 && py < W + 18) continue;
    if (n % 2 === 0) { trunks.push({ x: px, y: SIDE_H + 12, z: py, sx: 2.6, sy: 24, sz: 2.6, c: '#24143c' }); crowns.push({ x: px, y: SIDE_H + 26, z: py, sx: 13, sy: 5, sz: 13, c: pick(['#0f8f86', '#1ec9a6']) }); }
    else { trunks.push({ x: px, y: SIDE_H + 8, z: py, sx: 1.1, sy: 16, sz: 1.1, c: '#e8e8e8' }); crowns.push({ x: px, y: SIDE_H + 17, z: py, sx: 11, sy: 4, sz: 11, c: pick(['#ff2bd6', '#ffe14a', '#2bf3ff', '#a259ff']) }); slabs.push({ x: px + 14, y: SIDE_H + 0.4, z: py + 8, sx: 14, sy: 0.8, sz: 7, c: pick(['#ff2bd6', '#2bf3ff', '#ffe14a']) }); }
  }
  // wall rows: an unbroken line of tall buildings that nobody can get past
  const rows = [];
  if (EDGE.n === 'wall') rows.push(['n', EDGE.w === 'wall' ? -EDGE_D : Rx0, EDGE.e === 'wall' ? W + EDGE_D : Rx1]);
  if (EDGE.s === 'wall') rows.push(['s', EDGE.w === 'wall' ? -EDGE_D : Rx0, EDGE.e === 'wall' ? W + EDGE_D : Rx1]);
  if (EDGE.w === 'wall') rows.push(['w', EDGE.n === 'wall' ? 0 : Ry0, EDGE.s === 'wall' ? W : Ry1]);
  if (EDGE.e === 'wall') rows.push(['e', EDGE.n === 'wall' ? 0 : Ry0, EDGE.s === 'wall' ? W : Ry1]);
  for (const [k, a0, a1] of rows) {
    if (k === 'n') box(a0, a1, -EDGE_D, 0, SIDE_H, '#2a2147'); else if (k === 's') box(a0, a1, W, W + EDGE_D, SIDE_H, '#2a2147');
    else if (k === 'w') box(-EDGE_D, 0, a0, a1, SIDE_H, '#2a2147'); else box(W, W + EDGE_D, a0, a1, SIDE_H, '#2a2147');
    let p = a0;
    while (a1 - p > 60) {
      let w = rand(150, 230); if (a1 - p - w < 110) w = a1 - p;
      const d = rand(170, EDGE_D), c = pick(PALETTE), g = 3;
      const r = k === 'n' ? { x: p + g, y: -d, w: w - 2 * g, h: d } : k === 's' ? { x: p + g, y: W, w: w - 2 * g, h: d } : k === 'w' ? { x: -d, y: p + g, w: d, h: w - 2 * g } : { x: W, y: p + g, w: d, h: w - 2 * g };
      Object.assign(r, { c, roof: shade(c, 28), wall: shade(c, -60), dets: [], H: Math.random() < 0.3 ? rand(150, 260) : rand(60, 115) });
      cityGroup.add(makeBuilding(r)); r.mesh.userData.b = r; EDGEB.push(r);
      const ox = r.H * 0.38, oz = r.H * 0.5, x0 = r.x, x1 = r.x + r.w, z0 = r.y, z1 = r.y + r.h, yy = SIDE_H + 0.12;
      const PP = [[x0, z0], [x1, z0], [x1 + ox, z0 + oz], [x1 + ox, z1 + oz], [x0 + ox, z1 + oz], [x0, z1]];
      for (let q = 1; q < 5; q++) for (const v of [PP[0], PP[q], PP[q + 1]]) shadow.push(v[0], yy, v[1]);
      p += w;
    }
  }
  instanced(GB, M.instWhite, slabs); instanced(GCyl, M.instWhite, trunks); instanced(GSph, M.instWhite, crowns);
  return shadow;
}
function buildCity() {
  if (cityGroup) { cityGroup.traverse(o => { if (o.geometry && o.geometry !== GB && o.geometry !== GP) o.geometry.dispose(); if (o.userData && o.userData.own) o.userData.own.forEach(m => m.dispose()); }); scene.remove(cityGroup); }
  cityGroup = new THREE.Group(); scene.add(cityGroup);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, W).rotateX(-Math.PI / 2), M.asphalt); ground.position.set(W / 2, 0, W / 2); cityGroup.add(ground);
  const curbs = [], pave = [], grass = [], paths = [], ponds = [], trunks = [], crowns = [], poles = [], heads = [], stripes = [], lines = [], pools = [], shadowTris = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const lx = i * CELL + ROAD, ly = j * CELL + ROAD, cx = lx + LOT / 2, cz = ly + LOT / 2, L = LOTS[i][j];
    curbs.push({ x: cx, y: SIDE_H / 2, z: cz, sx: LOT, sy: SIDE_H, sz: LOT, c: '#3a2d63' });
    pave.push({ x: cx, y: (SIDE_H + 0.25) / 2, z: cz, sx: LOT - 6, sy: SIDE_H + 0.25, sz: LOT - 6, c: '#241c42' });
    poles.push({ x: lx + 6, y: SIDE_H + 31, z: ly + 6, sx: 1.4, sy: 62, sz: 1.4, c: '#14102a' }); const lc = (i + j) % 2 ? '#ff2bd6' : '#2bf3ff'; pools.push({ x: lx + 14, y: SIDE_H + 0.5, z: ly + 14, sx: 190, sy: 1, sz: 190, c: lc });
    heads.push({ x: lx + 9, y: SIDE_H + 62, z: ly + 6, sx: 8, sy: 2.6, sz: 4, c: lc });
    if (L.park) {
      grass.push({ x: cx, y: 1.75, z: cz, sx: LOT - 20, sy: 3.5, sz: LOT - 20, c: '#0b2f36' });
      paths.push({ x: cx, y: 1.9, z: cz, sx: 14, sy: 3.8, sz: LOT - 20, c: '#4b2f9a' }, { x: cx, y: 1.9, z: cz, sx: LOT - 20, sy: 3.8, sz: 14, c: '#4b2f9a' });
      if (L.pond) ponds.push({ x: cx, y: 3.9, z: cz, sx: 30, sy: 0.4, sz: 22, c: '#1ecbff' });
      for (const t of L.trees) {
        if (L.pond && Math.hypot(t.x - cx, t.y - cz) < 44) continue;
        trunks.push({ x: t.x, y: SIDE_H + 6, z: t.y, sx: 2.2, sy: 12, sz: 2.2, c: '#24143c' });
        crowns.push({ x: t.x, y: SIDE_H + 12 + t.r * 0.7, z: t.y, sx: t.r * 1.1, sy: t.r * 1.2, sz: t.r * 1.1, c: pick(['#0f8f86', '#1b6fd1', '#7a35d6', '#d11fa8']) });
      }
    } else {
      const r = B[i][j]; r.H = Math.random() < 0.34 ? rand(150, 290) : rand(38, 105);
      cityGroup.add(makeBuilding(r)); r.mesh.userData.b = r;
      const ox = r.H * 0.38, oz = r.H * 0.5, x0 = r.x, x1 = r.x + r.w, z0 = r.y, z1 = r.y + r.h, yy = SIDE_H + 0.12;
      const P = [[x0, z0], [x1, z0], [x1 + ox, z0 + oz], [x1 + ox, z1 + oz], [x0 + ox, z1 + oz], [x0, z1]];
      for (let k = 1; k < 5; k++) for (const q of [P[0], P[k], P[k + 1]]) shadowTris.push(q[0], yy, q[1]);
    }
  }
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const ox = i * CELL, oy = j * CELL;
    if (j < N) {
      const cx = ox + ROAD / 2, cz = oy + ROAD + LOT / 2;
      lines.push({ x: cx - 2, y: 0.2, z: cz, sx: 2, sy: 1, sz: LOT - 76, c: '#ff2bd6' }, { x: cx + 2, y: 0.2, z: cz, sx: 2, sy: 1, sz: LOT - 76, c: '#ff2bd6' });
      for (let s = 0; s < ROAD - 8; s += 14) for (const zz of [oy + ROAD + 20, oy + CELL - 20]) stripes.push({ x: ox + 10 + s, y: 0.2, z: zz, sx: 8, sy: 1, sz: 24, c: '#6fdcff' });
    }
    if (i < N) {
      const cz = oy + ROAD / 2, cx = ox + ROAD + LOT / 2;
      lines.push({ x: cx, y: 0.2, z: cz - 2, sx: LOT - 76, sy: 1, sz: 2, c: '#ff2bd6' }, { x: cx, y: 0.2, z: cz + 2, sx: LOT - 76, sy: 1, sz: 2, c: '#ff2bd6' });
      for (let s = 0; s < ROAD - 8; s += 14) for (const xx of [ox + ROAD + 20, ox + CELL - 20]) stripes.push({ x: xx, y: 0.2, z: oy + 10 + s, sx: 24, sy: 1, sz: 8, c: '#6fdcff' });
    }
  }
  instanced(GB, M.instWhite, curbs); instanced(GB, M.instWhite, pave); instanced(GB, M.instWhite, grass); instanced(GB, M.instWhite, paths);
  instanced(GCyl, M.instWhite, ponds); instanced(GCyl, M.instWhite, trunks); instanced(GSph, M.instBasic, crowns);
  instanced(GCyl, M.instWhite, poles); instanced(GB, M.instBasic, heads);
  const mk = instanced(GP, M.instBasic, lines.concat(stripes)); mk.material = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  { const pm = instanced(GP, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), pools); pm.frustumCulled = false; }
  const es = buildEdges(); for (let q = 0; q < es.length; q++) shadowTris.push(es[q]);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(shadowTris, 3));
  const sh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }));
  sh.frustumCulled = false; cityGroup.add(sh);
}
/* buildings between the camera and the player turn see-through so nobody gets hidden behind a roof */
function fadeBuildings() {
  const t = P.car || P, ci = Math.floor(t.x / CELL), cj = Math.floor(t.y / CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 2; j++) {
    if (i < 0 || j < 0 || i >= N || j >= N || !B[i][j]) continue;
    const r = B[i][j], reach = r.H * Math.tan(CAM_TILT_DEG * Math.PI / 180) * 1.25 + 24;
    const tol = 22 + r.H * 0.1, hide = t.x > r.x - tol && t.x < r.x + r.w + tol && t.y < r.y + 20 && r.y - t.y < reach;
    r.target = hide ? 0.2 : 1;
  }
  for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 3; j++) {
    if (i < 0 || j < 0 || i >= N || j >= N || !B[i][j] || !B[i][j].mesh) continue;
    const r = B[i][j], tg = r.target === undefined ? 1 : r.target;
    if (Math.abs(r.fade - tg) < 0.01) continue;
    r.fade += (tg - r.fade) * 0.18; const mats = r.mesh.userData.own, tr = r.fade < 0.99;
    for (const m of mats) { m.opacity = r.fade; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
    if (i < ci - 1 || i > ci + 1 || j < cj - 1 || j > cj + 2) r.target = 1;
  }
  for (const r of EDGEB) {
    const hide = Math.abs(t.x - r.x - r.w / 2) < r.w / 2 + 22 + r.H * 0.1 && t.y < r.y + 20 && r.y - t.y < r.H * Math.tan(CAM_TILT_DEG * Math.PI / 180) * 1.25 + 24, tg = hide ? 0.2 : 1;
    if (Math.abs(r.fade - tg) < 0.01) continue;
    r.fade += (tg - r.fade) * 0.18; const tr = r.fade < 0.99;
    for (const m of r.mesh.userData.own) { m.opacity = r.fade; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
  }
}

