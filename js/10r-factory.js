'use strict';
/* ---------- 7s. THE CEMENT WORKS (Gravel Flats) ----------
   Map remodel 7 (MAP.gravel.factory) gave the space center's empty south-east corner, between its fence and the shore, to a cement
   works: a long hall with a saw-tooth roof and GRAVEL FLATS CEMENT along its front; behind it three tall chimneys banded red and
   white at the top, smoke rising from them and drifting off on the wind (thicker in a storm), red lights blinking on their tops; a
   preheater tower of steel and cyclones, the long kiln on its piers, the cooler, three silos with a catwalk over their tops, piles of
   gravel and clinker with a conveyor up to the hall, a cement mixer with its drum turning, a tanker and a wheel loader, a gatehouse
   at the open gate in its fence and floodlights over the yard. East of it, up to the street corner, the yard kept for the junkyard
   (MAP.gravel.junk, PLAN step 6). The chimneys' height and the smoke are in the places table (Factory). Scenery, both modes: what
   stands is solid (the helicopter climbs over the chimneys); a heavy vehicle fast enough breaks through the fence (js/10f). */
const FACT = MAP.gravel ? MAP.gravel.factory : null;
const FACT_BOX = (() => { if (!FACT) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of FACT.area[0].o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; })();
const chimneyH = share => PLC.factoryChimney * share;         // a chimney's height (game units) from its share of the tallest
function genFactory() {                  // js/04 genWorld, after the places: the fence, the solids, the model
  if (!FACT) return;
  const F = FACT, [x0, y0, x1, y1] = FACT_BOX, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, solid = (x, y, w, h, o) => makeSolid(x, y, w, h, 0, o || {});
  addFence(F.fence, 'factory');
  const block = (b, H) => solid((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1], { H });
  block(F.hall, F.hall[4] + 14); block(F.tower, F.tower[4]); block(F.cooler, F.cooler[4]);
  const [[ka, kb], [kc, kd], kr] = F.kiln; makeSolid((ka + kc) / 2, (kb + kd) / 2, Math.hypot(kc - ka, kd - kb), kr * 2 + 6, Math.atan2(kd - kb, kc - ka), { H: 50 });
  for (const [x, y, r, h] of F.silos) solid(x, y, r * 1.8, r * 1.8, { H: h + 20 });
  for (const [x, y, s] of F.chimneys) solid(x, y, 30, 30, { H: chimneyH(s) });
  for (const [x, y, r] of F.piles) solid(x, y, r * 1.2, r * 1.2, { soft: true });
  for (const [x, y, a, k] of F.trucks) makeSolid(x, y, k === 'loader' ? 70 : 100, 30, a * Math.PI / 180, {});
  { const [gx, gy, gw, gd] = F.gatehouse; solid(gx, gy, gw, gd); }
  LM_CLEAR.push([cx, cy, (x1 - x0) / 2, (y1 - y0) / 2]);
  LMS.push({ cx, cy, a: 0, rad: Math.hypot(x1 - x0, y1 - y0) / 2 + PLC.factoryChimney * 0.5, make: () => makeFactory(cx, cy), mesh: null });
}
function drawFactory(poles, heads, pools) {   // js/10g drawPlaces: floodlights over the yard
  if (!FACT) return;
  for (const [x, y] of FACT.lamps) { poles.push({ x, y: 30, z: y, sx: 1.6, sy: 60, sz: 1.6, c: '#14102a' }); heads.push({ x, y: 60, z: y, sx: 10, sy: 3, sz: 6, c: '#fff1c0' }); pools.push({ x, y: 1.5, z: y, sx: 240, sy: 1, sz: 240, c: '#ffe0a8' }); }
}
function tube(gb, a, b, r, col, seg) {   // a round pipe from point a to point b ([x, y, z])
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
  let px = -uz, py = 0, pz = ux; const pm = Math.hypot(px, pz); if (pm < 1e-6) { px = 1; pz = 0; } else { px /= pm; pz /= pm; }
  const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;   // u x p
  const P = (o, t) => [o[0] + (px * Math.cos(t) + qx * Math.sin(t)) * r, o[1] + (py * Math.cos(t) + qy * Math.sin(t)) * r, o[2] + (pz * Math.cos(t) + qz * Math.sin(t)) * r];
  seg = seg || 12;
  for (let k = 0; k < seg; k++) {
    const t0 = k / seg * TAU, t1 = (k + 1) / seg * TAU, tm = (t0 + t1) / 2, n = [px * Math.cos(tm) + qx * Math.sin(tm), py * Math.cos(tm) + qy * Math.sin(tm), pz * Math.cos(tm) + qz * Math.sin(tm)];
    face(gb, [P(a, t0), P(b, t0), P(b, t1), P(a, t1)], n, col);
  }
}
function makeFactory(cx, cy) {           // the whole works in one model, built around (cx, cy)
  const F = FACT, T = new GeoBuilder(), G = new GeoBuilder(), X = x => x - cx, Z = y => y - cy;
  const conc = _C('#b9b2a4'), concD = _C('#8f897e'), steel = _C('#7d838e'), steelL = _C('#aab0ba'), rust = _C('#a0583a'), dark = _C('#3a3640'), glass = _C('#4a6a86');
  const lights = [], m0 = [];
  // the hall: concrete walls, a band of windows, roller doors, a saw-tooth roof whose glazing faces the street side
  { const [hx0, hy0, hx1, hy1, H] = F.hall, a = X(hx0), b = X(hx1), c = Z(hy0), d = Z(hy1);
    box5(T, a, 0, c, b, H, d, conc); box5(T, a - 0.5, 0, c - 0.5, b + 0.5, 6, d + 0.5, concD);
    for (let x = a + 14; x < b - 20; x += 26) face(T, [[x, H * 0.55, d + 0.6], [x + 16, H * 0.55, d + 0.6], [x + 16, H * 0.8, d + 0.6], [x, H * 0.8, d + 0.6]], [0, 0, 1], glass);
    for (const x of [a + 60, a + 150]) { face(T, [[x, 0.5, d + 0.7], [x + 44, 0.5, d + 0.7], [x + 44, 34, d + 0.7], [x, 34, d + 0.7]], [0, 0, 1], _C('#c9a640')); for (let y = 4; y < 34; y += 4) face(T, [[x, y, d + 0.8], [x + 44, y, d + 0.8], [x + 44, y + 0.6, d + 0.8], [x, y + 0.6, d + 0.8]], [0, 0, 1], _C('#8a7230')); box5(T, x - 4, 36, d, x + 48, 38, d + 12, steel); }
    const n = 4, tz = (d - c) / n;
    for (let i = 0; i < n; i++) {                                 // each tooth rises toward the front and drops behind a strip of glass
      const z0 = c + i * tz, z1 = z0 + tz;
      face(T, [[a, H, z0], [b, H, z0], [b, H + 16, z1], [a, H + 16, z1]], [0, tz, -16], _C(i % 2 ? '#8c8478' : '#958d80'));
      face(T, [[a, H, z1], [b, H, z1], [b, H + 16, z1], [a, H + 16, z1]], [0, 0, 1], _C('#7fb6d6'));
      face(T, [[a, H, z0], [a, H, z1], [a, H + 16, z1]].concat([[a, H, z1]]), [-1, 0, 0], conc); face(T, [[b, H, z0], [b, H, z1], [b, H + 16, z1]].concat([[b, H, z1]]), [1, 0, 0], conc);
    }
    const sg = fasciaSign('GRAVEL FLATS CEMENT', '#ffb02e', Math.min(b - a - 40, 200), 18); sg.position.set((a + b) / 2, H - 8, d + 1.2); m0.push(sg);
    for (const s of [0, 1]) { const x = a + 40 + s * (b - a - 80); box5(T, x - 10, H, c + 20, x + 10, H + 26, c + 40, steelL); }   // roof fans
  }
  // three chimneys behind the hall: concrete, red and white bands at the top, a gallery, a sooty rim, a red light; a flue to the hall
  for (const [x, y, s] of F.chimneys) {
    const h = chimneyH(s), px = X(x), pz = Z(y), r0 = 15, r1 = 9.5, rAt = t => r0 + (r1 - r0) * t, band = h * 0.3, nb = 6;
    T.prism(px, pz, r0 + 4, 0, 10, concD, 12, r0 + 3, false);
    T.prism(px, pz, r0, 10, h - band, _C('#a8a296'), 14, rAt((h - band) / h));
    for (let k = 0; k < nb; k++) { const ya = h - band + k * band / nb, yb = ya + band / nb; T.prism(px, pz, rAt(ya / h), ya, yb, _C(k % 2 ? '#eeeeea' : '#c8362a'), 14, rAt(yb / h)); }
    T.prism(px, pz, r1 + 0.6, h - 2, h, _C('#26232a'), 14, r1 + 0.6, true);
    T.prism(px, pz, rAt(0.78) + 5, h * 0.78, h * 0.78 + 2, steel, 14, rAt(0.78) + 5, true);
    beam(T, [px, 22, pz], [px, 22, Z(F.hall[1]) - 2], 5, steel);
    const L = new THREE.Mesh(GSph, mBas(0xff2030)); L.scale.set(2.6, 2.6, 2.6); L.position.set(px, h + 3, pz); lights.push(L); m0.push(L);
    const L2 = L.clone(); L2.position.y = h * 0.6; lights.push(L2); m0.push(L2);
  }
  // the preheater tower: a steel frame, floors, cyclones stacked down its front, a duct down to the kiln, a light on top
  { const [tx0, ty0, tx1, ty1, H] = F.tower, a = X(tx0), b = X(tx1), c = Z(ty0), d = Z(ty1);
    for (const [x, z] of [[a, c], [b, c], [a, d], [b, d]]) box5(T, x - 3, 0, z - 3, x + 3, H, z + 3, steel);
    for (let y = 30; y <= H; y += 40) box5(T, a - 2, y - 3, c - 2, b + 2, y, d + 2, steelL);
    box5(T, a + 6, 0, c + 6, b - 6, H - 10, d - 30, _C('#9a9ea8'));
    for (let k = 0; k < 4; k++) { const y = H - 40 - k * 46, x = (a + b) / 2 + (k % 2 ? 16 : -16); T.prism(x, d - 14, 13, y - 20, y, _C('#d0d4da'), 12); T.prism(x, d - 14, 13, y - 34, y - 20, _C('#c0c4ca'), 12, 3); }
    tube(T, [(a + b) / 2, 26, d - 6], [(a + b) / 2 + 20, 28, Z(F.kiln[0][1]) - 6], 7, rust, 8);
    const L = new THREE.Mesh(GSph, mBas(0xff2030)); L.scale.set(2.4, 2.4, 2.4); L.position.set((a + b) / 2, H + 3, (c + d) / 2); lights.push(L); m0.push(L);
  }
  // the kiln: a long tube falling gently toward the cooler, tyres on piers, a girth gear
  { const [[ka, kb], [kc, kd], r] = F.kiln, A = [X(ka), 34, Z(kb)], B = [X(kc), 24, Z(kd)];
    tube(T, A, B, r, _C('#9c5a3c'), 16);
    for (const t of [0.15, 0.5, 0.85]) { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
      tube(T, [p[0] - 3, p[1], p[2]], [p[0] + 3, p[1], p[2]], r + 2.4, dark, 16); box5(T, p[0] - 7, 0, p[2] - r, p[0] + 7, p[1] - r + 1, p[2] + r, concD); }
    { const t = 0.32, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; tube(T, [p[0] - 2, p[1], p[2]], [p[0] + 2, p[1], p[2]], r + 4, _C('#5a4e3a'), 20); }
  }
  // the cooler, three silos with a catwalk over them and a stair tower, the piles and the conveyor
  { const [ax, ay, bx, by, H] = F.cooler; box5(T, X(ax), 0, Z(ay), X(bx), H, Z(by), _C('#8d939c')); T.prism((X(ax) + X(bx)) / 2, (Z(ay) + Z(by)) / 2, 10, H, H + 10, steelL, 10); }
  F.silos.forEach(([x, y, r, h], i) => { const px = X(x), pz = Z(y);
    T.prism(px, pz, r + 2, 0, 8, concD, 16); T.prism(px, pz, r, 8, h, _C(i % 2 ? '#dcd8ce' : '#d4d0c4'), 16); T.prism(px, pz, r, h, h + 10, _C('#c4c0b4'), 16, 5, true);
    T.prism(px, pz, r + 0.5, h * 0.62, h * 0.66, _C('#2a6ab0'), 16); });
  { const s = F.silos, a = s[0], b = s[s.length - 1], h = Math.max(...s.map(q => q[3])) + 6;
    box5(T, X(a[0]), h, Z(a[1]) - 4, X(b[0]), h + 3, Z(a[1]) + 4, steel); box5(T, X(b[0]) + b[2], 0, Z(b[1]) - 8, X(b[0]) + b[2] + 14, h + 3, Z(b[1]) + 8, steelL); }
  const pileC = ['#8a8070', '#4e4a4c', '#a89a84'];
  F.piles.forEach(([x, y, r], i) => { T.prism(X(x), Z(y), r, 0, r * 0.62, _C(pileC[i % 3]), 12, 2, true); T.prism(X(x), Z(y), r + 2, 0, 1.2, _C(shade(pileC[i % 3], -20)), 12); });
  { const [[ax, ay], [bx, by]] = F.conveyor, A = [X(ax), 8, Z(ay)], B = [X(bx), F.hall[4] - 6, Z(by) + 2];
    beam(T, A, B, 4, steelL); beam(T, [A[0], A[1] + 6, A[2]], [B[0], B[1] + 6, B[2]], 1.5, _C('#3a3a40'));
    const m = [(A[0] + B[0]) / 2, 0, (A[2] + B[2]) / 2]; box5(T, m[0] - 2, 0, m[2] - 2, m[0] + 2, (A[1] + B[1]) / 2, m[2] + 2, steel); }
  // the trucks: a cement mixer (its drum turns), a tanker, a wheel loader
  const drums = [];
  for (const [x, y, a, k] of F.trucks) {
    const g = new THREE.Group(), V = new GeoBuilder(), cab = _C(k === 'loader' ? '#e8b020' : k === 'mixer' ? '#e8e4dc' : '#2a6ab0'), blk = _C('#1d1b24');
    for (const s of [-1, 1]) for (const wx of (k === 'loader' ? [-20, 20] : [-34, 6, 30])) V.prism(wx, s * 13, k === 'loader' ? 9 : 6.5, 0, 4, blk, 10);
    if (k === 'loader') { box5(V, -28, 6, -12, 24, 22, 12, cab); box5(V, -6, 22, -10, 14, 38, 10, _C('#3a4a5a')); box5(V, 30, 2, -16, 44, 16, 16, _C('#5a5a5a')); }
    else { box5(V, 28, 6, -13, 48, 30, 13, cab); box5(V, 40, 18, -12, 48.5, 28, 12, glass); box5(V, -46, 6, -12, 28, 10, 12, _C('#3a3a40'));
      if (k === 'tanker') tube(V, [-46, 22, 0], [24, 22, 0], 12, _C('#c8ccd4'), 14); }
    const vm = lmMesh(V, new GeoBuilder()); g.add(vm);
    if (k === 'mixer') { const D = new GeoBuilder(); tube(D, [-30, 0, 0], [0, 0, 0], 13, _C('#ff7a3d'), 12); tube(D, [0, 0, 0], [20, 0, 0], 13, _C('#e8e4dc'), 12); const dm = lmMesh(D, new GeoBuilder()); const piv = new THREE.Group(); piv.position.set(-10, 26, 0); piv.rotation.z = 0.25; piv.add(dm); g.add(piv); drums.push(dm); }
    g.position.set(X(x), 0, Z(y)); g.rotation.y = -a * Math.PI / 180; m0.push(g);
  }
  // the gatehouse by the open gate, a raised boom
  { const [gx, gy, gw, gd] = F.gatehouse, a = X(gx), c = Z(gy); box5(T, a - gw / 2, 0, c - gd / 2, a + gw / 2, 24, c + gd / 2, _C('#d8d2c4')); box5(T, a - gw / 2 - 2, 24, c - gd / 2 - 2, a + gw / 2 + 2, 27, c + gd / 2 + 2, dark);
    face(T, [[a - gw / 2 + 4, 10, c + gd / 2 + 0.5], [a + gw / 2 - 4, 10, c + gd / 2 + 0.5], [a + gw / 2 - 4, 20, c + gd / 2 + 0.5], [a - gw / 2 + 4, 20, c + gd / 2 + 0.5]], [0, 0, 1], glass);
    const g = F.gate, bx = X(g.x) - 8, bz = Z(g.y) - g.w / 2 - 6; box5(T, bx - 3, 0, bz - 3, bx + 3, 12, bz + 3, dark); beam(T, [bx, 12, bz], [bx, 70, bz + 10], 1.6, _C('#ff3b5c')); }
  const m = lmMesh(T, G); for (const o of m0) m.add(o); m.userData.own.push(...m0.filter(o => o.material && o.material.map).map(o => o.material));
  let last = -1, puff = Math.random();
  m.userData.anim = t => {                                        // lights blink, the drum turns, smoke puffs from the chimneys while the game runs
    const on = (t % 1.6) < 0.8; for (const L of lights) L.visible = on;
    for (const d of drums) d.rotation.x = t * 1.4;
    const dt = last < 0 ? 0 : gameT - last; last = gameT; if (dt <= 0 || dt > 0.5) return;
    const wind = 18 + (SKY.wind || 0) * 0.5; puff += PLC.factorySmoke * dt;
    for (; puff >= 1; puff--) for (const [x, y, s] of F.chimneys) {
      const h = chimneyH(s), dark = SKY.night > 0.5;
      addP({ x: x + rand(-3, 3), y: y + rand(-3, 3), z: h + 4, vz: rand(26, 40), grav: 0, vx: wind * rand(0.7, 1.2), vy: -wind * rand(0.3, 0.6), life: rand(5, 8), max: 8,
        s0: rand(8, 12), s1: rand(46, 70), col: pick(dark ? ['#4a4a52', '#585862', '#3e3e46'] : ['#d6d6da', '#c4c4ca', '#e2e2e6']), drag: 0.15, alpha: 0.55 });
    }
  };
  return m;
}
