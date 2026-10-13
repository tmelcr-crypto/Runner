'use strict';
/* ---------- 7v. IRON KEY: the prison island in the bay west of Heron Key (map remodel 13: MAP.prison; the runtime: js/08zp) ----------
   A rocky island with scrub on it, the prison filling most of it: a concrete wall with barbed wire on top, a watchtower at each corner
   (a searchlight on each sweeps the island and the water at night), two cell blocks - three floors of barred slits - the office by the
   gate, the yard with a basketball court, the gate in the south wall under IRON KEY STATE PRISON with a guard booth outside. A paved
   path runs from the gate down to a wooden pier at the island's south tip; across the bay a pier off the Palm Heights promenade, with
   a ticket kiosk and bollards that keep cars off, is the ferry's other end. The ferry (double-ended, so it never turns round) is built
   here too. Solid: the walls, the towers, the buildings, the booth, the gate while it is shut, the kiosk and the bollards. Mode: prison. */
const PRZ = MAP.prison || null;
const PRI = { lm: null, mlm: null, gateRc: null, parts: null, route: null, ferry: null };
const PRI_CONCRETE = '#b9b2a2', PRI_DARK = '#2a2d38', PRI_ORANGE = '#ff7a1a';
function priRoute() {                    // the ferry's route: the curve sampled, with its length so far at each point
  const P = PRZ.ferry.route, pts = [], cum = [0], n = 64;
  for (let k = 0; k <= n; k++) {
    const t = k / n, w = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
    pts.push([w[0] * P[0][0] + w[1] * P[1][0] + w[2] * P[2][0] + w[3] * P[3][0], w[0] * P[0][1] + w[1] * P[1][1] + w[2] * P[2][1] + w[3] * P[3][1]]);
    if (k) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  }
  return { pts, cum, L: cum[n] };
}
function ferryAt(s, out) {               // the point and heading s along the route (0: at the mainland pier)
  const R = PRI.route; s = clamp(s, 0, R.L); let k = 0; while (k < R.pts.length - 2 && R.cum[k + 1] < s) k++;
  const a = R.pts[k], b = R.pts[k + 1], f = (s - R.cum[k]) / Math.max(1e-6, R.cum[k + 1] - R.cum[k]);
  out.x = a[0] + (b[0] - a[0]) * f; out.y = a[1] + (b[1] - a[1]) * f; out.ang = Math.atan2(b[1] - a[1], b[0] - a[0]); return out;
}
function genPrison() {                   // js/04 genWorld: the solids, the drawables, the route
  if (!PRZ) return;
  const [x0, y0, x1, y1] = PRZ.walls, t = PRZ.wt, [gx, gy, gw] = PRZ.gate, solid = (x, y, w, h, o) => makeSolid(x, y, w, h, 0, Object.assign({ bld: true, prison: true }, o || {})), W = { pwall: true, ph: PRZ.wh };
  solid((x0 + x1) / 2, y0, x1 - x0 + t, t, W); solid(x0, (y0 + y1) / 2, t, y1 - y0 + t, W); solid(x1, (y0 + y1) / 2, t, y1 - y0 + t, W);
  solid((x0 + gx - gw / 2) / 2, y1, gx - gw / 2 - x0, t, W); solid((gx + gw / 2 + x1) / 2, y1, x1 - gx - gw / 2, t, W);
  PRI.gateRc = solid(gx, gy, gw + 2, t + 2, { pwall: true, ph: PRZ.wh - 14, prisonGate: true });      // the gate: off while it stands open (js/08zp)
  for (const [tx, ty] of PRZ.towers) solid(tx, ty, PRZ.ts, PRZ.ts);
  for (const [cx, cy, w, d] of PRZ.blocks) solid(cx, cy, w, d, { ph: 48 });
  { const [cx, cy, w, d] = PRZ.office; solid(cx, cy, w, d, { ph: 36 }); }
  { const [cx, cy, w, d] = PRZ.booth; solid(cx, cy, w, d, { ph: 28 }); }
  { const [cx, cy, w, d] = PRZ.kiosk; makeSolid(cx, cy, w, d, 0, {}); }
  { const [mx0, my0, , my1] = PRZ.mpier; for (const y of [my0 + 11, my1 - 11]) makeSolid(mx0 + 22, y, 6, 6, 0, {}); }   // bollards: people through, cars not
  const xs = PRZ.island.map(p => p[0]), ys = PRZ.island.map(p => p[1]), bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(PRZ.head[3], ...ys);
  LM_CLEAR.push([(bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) / 2 + 20, (by1 - by0) / 2 + 20]);
  { const [a0, b0, a1, b1] = PRZ.mpier; LM_CLEAR.push([(a0 + a1) / 2 - 30, (b0 + b1) / 2 + 20, (a1 - a0) / 2 + 60, 70]); }
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  LMS.push(PRI.lm = { cx, cy, a: 0, rad: Math.hypot(bx1 - bx0, by1 - by0) / 2 + 120, make: () => withSeed(7131, makePrison), mesh: null });
  { const [a0, b0, a1, b1] = PRZ.mpier, mx = (a0 + a1) / 2 - 30, my = (b0 + b1) / 2 + 20; LMS.push(PRI.mlm = { cx: mx, cy: my, a: 0, rad: 260, make: () => withSeed(7132, makeFerryPier), mesh: null }); }
  PRI.route = priRoute(); prisonPosts();                             // the guards (js/08zp)
}

/* ---------- the island and the prison ---------- */
function makePrison() {
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, cx0 = PRI.lm.cx, cy0 = PRI.lm.cy, X = x => x - cx0, Z = y => y - cy0, sub = [];
  const [x0, y0, x1, y1] = PRZ.walls, wt = PRZ.wt, wh = PRZ.wh, [gx, gy, gw] = PRZ.gate, con = C(PRI_CONCRETE), dark = C(PRI_DARK), steel = C('#8a8f9c');
  const fl = (gb, a0, b0, a1, b1, y, col) => flat(gb, X(a0), Z(b0), X(a1), Z(b1), y, col);
  const isl = PRZ.island, n = isl.length, icx = isl.reduce((a, p) => a + p[0], 0) / n, icy = isl.reduce((a, p) => a + p[1], 0) / n;
  // the island's ground: weathered rock and dirt, scrub over it, rocks all round the waterline
  { let a = 0; for (let k = 0; k < n; k++) { const [x1, y1] = isl[k], [x2, y2] = isl[(k + 1) % n]; a += x1 * y2 - x2 * y1; }
    const g = C('#6e6858'); for (let k = 0; k < n; k++) { const p = isl[k], q = isl[(k + 1) % n], A = [X(icx), 0.5, Z(icy)], B = [X(p[0]), 0.5, Z(p[1])], Q = [X(q[0]), 0.5, Z(q[1])];
      if (a > 0) T.tri(A, Q, B, [0, 1, 0], g); else T.tri(A, B, Q, [0, 1, 0], g); } }
  for (let k = 0; k < 46; k++) {
    const x = rand(icx - 260, icx + 260), y = rand(icy - 520, icy + 520); if (!inPoly(x, y, { o: isl, h: [] }) || (x > x0 - 30 && x < x1 + 30 && y > y0 - 30 && y < y1 + 40)) continue;
    const r = rand(14, 38); T.prism(X(x), Z(y), r, 0.6, 0.8, C(pick(['#5e7a46', '#6b8a4e', '#4f6a3e', '#7a7a5e', '#8a8070'])), 9, r, true);
  }
  for (let k = 0; k < n; k++) {
    const [x, y] = isl[k], d = Math.hypot(x - icx, y - icy) || 1, ix = (icx - x) / d, iy = (icy - y) / d;
    for (let j = 0; j < 2; j++) { const o = j ? rand(10, 24) : rand(-6, 6), r = rand(8, 18), h = rand(4, 14);
      T.prism(X(x + ix * o + rand(-8, 8)), Z(y + iy * o + rand(-8, 8)), r, 0, h, C(pick(['#5a5650', '#6a645c', '#4a4640', '#7a7268'])), 6 + j, r * rand(0.45, 0.75), true); }
  }
  // inside the walls: concrete; the yard's asphalt with a basketball court; the hoops, a weights bench, a bench by the wall
  fl(T, x0, y0, x1, y1, 0.9, C('#8e8a80'));
  { const [a0, b0, a1, b1] = PRZ.yard; fl(T, a0, b0, a1, b1, 1.0, C('#4a4d55')); }
  { const [a0, b0, a1, b1] = PRZ.court, w = C('#e8e4da'), L = (p0, q0, p1, q1) => fl(T, p0, q0, p1, q1, 1.1, w), m = (b0 + b1) / 2;
    fl(T, a0, b0, a1, b1, 1.05, C('#8a4a3a')); L(a0, b0, a1, b0 + 1.5); L(a0, b1 - 1.5, a1, b1); L(a0, b0, a0 + 1.5, b1); L(a1 - 1.5, b0, a1, b1); L((a0 + a1) / 2 - 0.75, b0, (a0 + a1) / 2 + 0.75, b1);
    for (const [hx, s] of [[a0 - 6, 1], [a1 + 6, -1]]) { T.prism(X(hx), Z(m), 1.2, 0, 30, steel, 6); box5(T, X(hx) + s * 0.5 - 0.5, 28, Z(m) - 7, X(hx) + s * 0.5 + 0.5, 37, Z(m) + 7, C('#f4f4f4'));
      box5(T, X(hx) + s * 2 - 1.5, 29, Z(m) - 2, X(hx) + s * 2 + 1.5, 29.6, Z(m) + 2, C('#ff5a1a')); } }
  { const [a0, , a1, b1] = PRZ.yard; box5(T, X(a1 - 40), 0, Z(b1 - 22), X(a1 - 14), 4, Z(b1 - 16), C('#3a3d47')); T.prism(X(a1 - 40), Z(b1 - 19), 4, 6, 7.5, dark, 10, 4, true); T.prism(X(a1 - 14), Z(b1 - 19), 4, 6, 7.5, dark, 10, 4, true);
    box5(T, X(a0 + 6), 0, Z(b1 - 6), X(a0 + 60), 4, Z(b1 - 2), C('#6a5a48')); }
  // the walls: concrete, a darker coping, coils of barbed wire on top; floodlights on the inner face
  const wall = (ax, ay, bx, by) => {
    const p0 = Math.min(ax, bx) - (ay === by ? 0 : wt / 2), p1 = Math.max(ax, bx) + (ay === by ? 0 : wt / 2), q0 = Math.min(ay, by) - (ay === by ? wt / 2 : 0), q1 = Math.max(ay, by) + (ay === by ? wt / 2 : 0);
    box5(T, X(p0), 0, Z(q0), X(p1), wh, Z(q1), con); box5(T, X(p0) - 1, wh, Z(q0) - 1, X(p1) + 1, wh + 3, Z(q1) + 1, C('#8a8478'));
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
    for (let k = 4; k < L - 2; k += 6) T.prism(X(ax + ux * k), Z(ay + uy * k), 2.2, wh + 3, wh + 6, C('#9aa0ab'), 5, 2.2, false);
    for (let k = 40; k < L - 20; k += 90) { const x = ax + ux * k, y = ay + uy * k; box5(T, X(x) - 2, wh - 6, Z(y) - 2, X(x) + 2, wh, Z(y) + 2, dark); }
  };
  wall(x0, y0, x1, y0); wall(x0, y0, x0, y1); wall(x1, y0, x1, y1); wall(x0, y1, gx - gw / 2, y1); wall(gx + gw / 2, y1, x1, y1);
  // the gate: an arch over the gap, the name over it outside, yellow and black at the sides (the sliding gate itself moves: below)
  box5(T, X(gx - gw / 2) - 4, wh - 12, Z(gy) - wt / 2 - 2, X(gx + gw / 2) + 4, wh + 4, Z(gy) + wt / 2 + 2, C('#8a8478'));
  for (const s of [-1, 1]) for (let y = 0; y < wh - 12; y += 6) box5(T, X(gx + s * (gw / 2 + 1)) - 3, y, Z(gy) + wt / 2, X(gx + s * (gw / 2 + 1)) + 3, Math.min(wh - 12, y + 6), Z(gy) + wt / 2 + 1, (y / 6) % 2 ? C('#16161c') : C('#ffd23f'));
  const sg = fasciaSign('IRON KEY STATE PRISON', PRI_ORANGE, gw + 120, 14); sg.position.set(X(gx), wh - 4, Z(gy) + wt / 2 + 2.5); sub.push(sg);
  fl(T, gx - gw / 2 - 30, gy + wt / 2, gx + gw / 2 + 110, gy + 70, 0.9, C('#9a968c'));       // the plaza outside the gate
  // the cell blocks: three floors of barred slits, flat roofs with vents; the block's letter on the roof
  PRZ.blocks.forEach(([cx, cy, w, d], i) => {
    const a0 = cx - w / 2, a1 = cx + w / 2, b0 = cy - d / 2, b1 = cy + d / 2, H = 46, along = w > d;
    box5(T, X(a0), 0, Z(b0), X(a1), H, Z(b1), C('#c9c2b0')); box5(T, X(a0) - 1.5, H, Z(b0) - 1.5, X(a1) + 1.5, H + 2, Z(b1) + 1.5, C('#9a958a'));
    for (let f = 0; f < 3; f++) { const y = 8 + f * 13;
      if (along) for (let x = a0 + 8; x < a1 - 6; x += 12) for (const z of [b0 - 0.4, b1 + 0.4]) box5(T, X(x), y, Z(z) - 0.3, X(x) + 3, y + 7, Z(z) + 0.3, dark);
      else for (let y2 = b0 + 8; y2 < b1 - 6; y2 += 12) for (const x of [a0 - 0.4, a1 + 0.4]) box5(T, X(x) - 0.3, y, Z(y2), X(x) + 0.3, y + 7, Z(y2) + 3, dark); }
    for (let k = 0; k < 4; k++) { const vx = along ? a0 + w * (k + 0.5) / 4 : cx + rand(-15, 15), vy = along ? cy + rand(-20, 20) : b0 + d * (k + 0.5) / 4; box5(T, X(vx) - 5, H + 2, Z(vy) - 4, X(vx) + 5, H + 8, Z(vy) + 4, C('#7a7f8c')); }
    const lt = signMesh('BLOCK ' + 'AB'[i], PRI_ORANGE, 46, 12); lt.rotation.x = -Math.PI / 2; if (!along) lt.rotation.z = Math.PI / 2; lt.position.set(X(cx), H + 2.3, Z(cy)); sub.push(lt);
  });
  { const [cx, cy, w, d] = PRZ.office, a0 = cx - w / 2, a1 = cx + w / 2, b0 = cy - d / 2, b1 = cy + d / 2;
    box5(T, X(a0), 0, Z(b0), X(a1), 34, Z(b1), C('#d8d2c2')); box5(T, X(a0) - 2, 34, Z(b0) - 2, X(a1) + 2, 36, Z(b1) + 2, C('#3a5070'));
    for (const y of [9, 22]) for (let x = a0 + 6; x < a1 - 6; x += 12) { box5(G, X(x), y, Z(b0) - 0.6, X(x) + 7, y + 7, Z(b0), C('#ffe6a8')); box5(G, X(x), y, Z(b1), X(x) + 7, y + 7, Z(b1) + 0.6, C('#ffe6a8')); }
    box5(T, X(cx) - 6, 0, Z(b0) - 1, X(cx) + 6, 14, Z(b0), C('#3a2a1a')); }
  // the watchtowers: a shaft, a glazed cabin with a walkway, a roof; the searchlight (moves: below)
  const ts = PRZ.ts, th = PRZ.th;
  for (const [tx, ty] of PRZ.towers) {
    box5(T, X(tx) - ts / 2, 0, Z(ty) - ts / 2, X(tx) + ts / 2, th - 30, Z(ty) + ts / 2, con);
    box5(T, X(tx) - ts / 2 - 5, th - 30, Z(ty) - ts / 2 - 5, X(tx) + ts / 2 + 5, th - 28, Z(ty) + ts / 2 + 5, C('#8a8478'));
    box5(T, X(tx) - ts / 2 + 2, th - 28, Z(ty) - ts / 2 + 2, X(tx) + ts / 2 - 2, th - 26, Z(ty) + ts / 2 - 2, con);
    box5(T, X(tx) - ts / 2 + 3, th - 26, Z(ty) - ts / 2 + 3, X(tx) + ts / 2 - 3, th - 8, Z(ty) + ts / 2 - 3, C('#1d2230'));
    box5(G, X(tx) - ts / 2 + 2.6, th - 20, Z(ty) - ts / 2 + 2.6, X(tx) + ts / 2 - 2.6, th - 18, Z(ty) + ts / 2 - 2.6, C('#6a5a2a'));
    box5(T, X(tx) - ts / 2 - 3, th - 8, Z(ty) - ts / 2 - 3, X(tx) + ts / 2 + 3, th - 4, Z(ty) + ts / 2 + 3, C('#5a6070'));
    for (const s of [-1, 1]) for (const r of [-1, 1]) T.prism(X(tx + s * (ts / 2 + 3)), Z(ty + r * (ts / 2 + 3)), 0.8, th - 28, th - 20, steel, 4);
  }
  // outside: the guard booth, the path down to the pier, the pier
  { const [cx, cy, w, d] = PRZ.booth; box5(T, X(cx - w / 2), 0, Z(cy - d / 2), X(cx + w / 2), 26, Z(cy + d / 2), C('#e8e4da')); box5(T, X(cx - w / 2) - 2, 26, Z(cy - d / 2) - 2, X(cx + w / 2) + 2, 28, Z(cy + d / 2) + 2, C('#2f5fae'));
    box5(G, X(cx - w / 2) + 4, 12, Z(cy + d / 2), X(cx + w / 2) - 4, 22, Z(cy + d / 2) + 0.6, C('#cfe8ff')); }
  const pw = PRZ.pw, pth = PRZ.path;
  for (let k = 0; k < pth.length - 1; k++) {
    const [ax, ay] = pth[k], [bx, by] = pth[k + 1], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L * pw / 2, ny = (bx - ax) / L * pw / 2;
    face(T, [[X(ax + nx), 0.85, Z(ay + ny)], [X(bx + nx), 0.85, Z(by + ny)], [X(bx - nx), 0.85, Z(by - ny)], [X(ax - nx), 0.85, Z(ay - ny)]], [0, 1, 0], C('#9a968c'));
    T.prism(X(bx), Z(by), pw / 2, 0.84, 0.86, C('#9a968c'), 10, pw / 2, true);
  }
  piBoards(T, G, X, Z, PRZ.pier, PRZ.head, 'v');
  for (const [lx, ly] of [[PRZ.path[1][0] + 30, PRZ.path[1][1]], [PRZ.path[2][0] - 30, PRZ.path[2][1]]]) piLamp(T, G, X(lx), Z(ly));
  const ps = fasciaSign('FERRY', '#2bf3ff', 40, 10); ps.position.set(X((PRZ.pier[0] + PRZ.pier[2]) / 2), 30, Z(PRZ.pier[1]) + 2); sub.push(ps);
  T.prism(X(PRZ.pier[0]) - 6, Z(PRZ.pier[1]) + 2, 1.2, 0, 26, steel, 6); T.prism(X(PRZ.pier[2]) + 6, Z(PRZ.pier[1]) + 2, 1.2, 0, 26, steel, 6);
  // moving parts: the sliding gate, the four searchlights
  const gate = new THREE.Group(), gm = new THREE.MeshLambertMaterial({ color: 0x4a4e58 });
  for (let x = -gw / 2 + 2; x <= gw / 2 - 2; x += 5) { const b = new THREE.Mesh(GB, gm); b.scale.set(1.6, wh - 14, 1.6); b.position.set(x, (wh - 14) / 2, 0); gate.add(b); }
  for (const y of [6, wh / 2 - 4, wh - 16]) { const b = new THREE.Mesh(GB, gm); b.scale.set(gw - 2, 2.4, 2.2); b.position.set(0, y, 0); gate.add(b); }
  gate.position.set(X(gx), 0, Z(gy));
  const beamM = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolM = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false });
  const headM = new THREE.MeshBasicMaterial({ color: 0xfff8e0 }), lights = [];
  for (const [tx, ty] of PRZ.towers) {
    const head = new THREE.Mesh(GB, headM); head.scale.set(5, 4, 5); head.position.set(X(tx), th - 1, Z(ty));
    const beam = new THREE.Mesh(PRI_BEAM, beamM), pool = new THREE.Mesh(GCirc, poolM); pool.scale.set(34, 1, 22);
    lights.push({ head, beam, pool, tx, ty, ph: rand(0, TAU) }); sub.push(head);
  }
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); } m.add(gate); m.userData.own.push(gm, beamM, poolM);
  for (const L of lights) m.add(L.beam, L.pool);
  PRI.parts = { gate, lights, beamM, poolM };
  return m;
}
const PRI_BEAM = new THREE.CylinderGeometry(2, 14, 1, 10, 1, true);   // a searchlight's beam: narrow at the lamp, wide on the ground
function piLamp(T, G, x, z) { T.prism(x, z, 1, 0, 30, _C('#3a3d47'), 6); box5(T, x - 3.5, 30, z - 2.5, x + 3.5, 33, z + 2.5, _C(PRI_DARK)); box5(G, x - 3, 29.5, z - 2, x + 3, 30, z + 2, _C('#fff0c8')); }
function piBoards(T, G, X, Z, deck, head, dir) {   // a wooden pier: planks across it, posts under the edge, a rail each side, lamps at the head
  const wood = _C('#8a6a48'), dark = _C('#5a4430'), [a0, b0, a1, b1] = deck, [h0, k0, h1, k1] = head;
  for (const [p0, q0, p1, q1] of [deck, head]) { box5(T, X(p0), 0, Z(q0), X(p1), 3, Z(q1), wood); }
  if (dir === 'v') { for (let y = b0 + 4; y < k1; y += 7) flat(T, X(a0) + 1, Z(y), X(a1) - 1, Z(y) + 0.8, 3.05, dark);
    for (const x of [a0 + 1, a1 - 1]) for (let y = b0 + 20; y < k0; y += 24) T.prism(X(x), Z(y), 1.6, 0, 12, dark, 6);
    for (const x of [a0 + 1, a1 - 1]) box5(T, X(x) - 0.6, 10, Z(b0 + 18), X(x) + 0.6, 11.4, Z(k0), dark);
    for (const x of [h0 + 4, h1 - 4]) piLamp(T, G, X(x), Z(k1 - 4)); }
  else { for (let x = a0 + 4; x < h1; x += 7) flat(T, X(x), Z(b0) + 1, X(x) + 0.8, Z(b1) - 1, 3.05, dark);
    for (const y of [b0 + 1, b1 - 1]) for (let x = a0 + 40; x < h0; x += 24) T.prism(X(x), Z(y), 1.6, 0, 12, dark, 6);
    for (const y of [b0 + 1, b1 - 1]) box5(T, X(a0 + 36), 10, Z(y) - 0.6, X(h0), 11.4, Z(y) + 0.6, dark);
    for (const y of [k0 + 4, k1 - 4]) piLamp(T, G, X(h1 - 4), Z(y)); }
  for (const [x, y] of dir === 'v' ? [[h0 + 2, k1 - 2], [h1 - 2, k1 - 2]] : [[h1 - 2, k0 + 2], [h1 - 2, k1 - 2]]) T.prism(X(x), Z(y), 2.4, 3, 6, _C('#2a2d38'), 8, 2, true);   // mooring bollards
}

/* ---------- the ferry pier on the Palm Heights shore ---------- */
function makeFerryPier() {
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, cx0 = PRI.mlm.cx, cy0 = PRI.mlm.cy, X = x => x - cx0, Z = y => y - cy0, sub = [];
  const [a0, b0, a1, b1] = PRZ.mpier, [kx, ky, kw, kd] = PRZ.kiosk;
  piBoards(T, G, X, Z, PRZ.mpier, PRZ.mhead, 'h');
  for (const y of [b0 + 11, b1 - 11]) { T.prism(X(a0 + 22), Z(y), 3, 0, 9, C('#ffd23f'), 8, 3, true); T.prism(X(a0 + 22), Z(y), 3.1, 5, 6.5, C('#16161c'), 8, 3.1, false); }
  box5(T, X(kx - kw / 2), 0, Z(ky - kd / 2), X(kx + kw / 2), 24, Z(ky + kd / 2), C('#e8e4da')); box5(T, X(kx - kw / 2) - 3, 24, Z(ky - kd / 2) - 3, X(kx + kw / 2) + 3, 27, Z(ky + kd / 2) + 3, C('#2f5fae'));
  box5(G, X(kx - kw / 2) + 5, 10, Z(ky + kd / 2), X(kx + kw / 2) - 5, 20, Z(ky + kd / 2) + 0.6, C('#cfe8ff'));
  box5(T, X(kx + kw / 2) + 6, 0, Z(ky) - 3, X(kx + kw / 2) + 30, 5, Z(ky) + 3, C('#6a5a48'));   // a bench
  { const sx = a0 - 14, sy = b0 - 16;                                 // a board on two posts by the pier's root, facing the street side
    for (const s of [-1, 1]) T.prism(X(sx + s * 30), Z(sy), 1.4, 0, 36, C('#3a3d47'), 6);
    box5(T, X(sx) - 34, 26, Z(sy) - 1.5, X(sx) + 34, 40, Z(sy) + 1, C('#2a2d38'));
    const sg = fasciaSign('FERRY TO IRON KEY', '#2bf3ff', 66, 12); sg.position.set(X(sx), 33, Z(sy) + 1.2); sub.push(sg); }
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); }
  return m;
}

/* ---------- the ferry: double-ended, so it sails either way without turning; a ramp at each end ---------- */
function ferryMesh() {
  const F = new GeoBuilder(), FG = new GeoBuilder(), C = _C, L = PRZ.ferry.len / 2, W = PRZ.ferry.wid / 2, white = C('#f2f0ea'), blue = C('#2f5fae'), dark = C('#1d2230');
  box5(F, -L + 6, -6, -W, L - 6, 9, W, white);
  for (const s of [-1, 1]) face(F, [[s * (L - 6), -6, -W], [s * (L - 6), -6, W], [s * L, 9, W], [s * L, 9, -W]], [s, 0.4, 0], white);
  box5(F, -L + 5, 2, -W - 0.4, L - 5, 5, W + 0.4, blue);
  box5(F, -L + 4, 9, -W + 2, L - 4, 9.6, W - 2, C('#7a7f8a'));
  for (const s of [-1, 1]) { box5(F, s > 0 ? L - 10 : -L, 9, -W + 10, s > 0 ? L : -L + 10, 10.4, W - 10, C('#ffd23f'));
    for (let z = -W + 12; z < W - 12; z += 8) box5(F, s > 0 ? L - 10 : -L, 10.4, z, s > 0 ? L : -L + 10, 10.6, z + 3, C('#16161c')); }
  for (const s of [-1, 1]) { box5(F, -L + 14, 15, s * (W - 2) - 0.5, L - 14, 16, s * (W - 2) + 0.5, C('#c8ccd4'));
    for (let x = -L + 14; x <= L - 14; x += 14) F.prism(x, s * (W - 2), 0.6, 9.6, 15, C('#c8ccd4'), 4); }
  box5(F, -40, 9.6, -W + 8, 40, 26, W - 8, white); box5(F, -40.4, 16, -W + 7.6, 40.4, 22, W - 7.6, dark);
  box5(F, -44, 26, -W + 6, 44, 27.5, W - 6, C('#d8d4c8')); box5(F, -14, 27.5, -14, 14, 38, 14, white); box5(F, -14.4, 31, -14.4, 14.4, 36, 14.4, dark);
  box5(F, -16, 38, -16, 16, 39.5, 16, blue); F.prism(0, 0, 0.9, 39.5, 54, C('#c8ccd4'), 6);
  for (const s of [-1, 1]) for (const x of [-L + 22, L - 22]) box5(F, x - 12, 9.6, s * (W - 9) - 2.5, x + 12, 13, s * (W - 9) + 2.5, C('#6a5a48'));   // benches on the open decks
  for (const x of [-30, 30]) { F.prism(x, -W + 4, 3.4, 18, 19.6, C('#ff5a1a'), 10, 3.4, true); F.prism(x, -W + 4, 2, 19.6, 19.8, white, 10, 2, true); }   // life rings
  box5(FG, -1.5, 37, -15.2, 1.5, 38, -14.4, C('#ff3b3b')); box5(FG, -1.5, 37, 14.4, 1.5, 38, 15.2, C('#3dff7a')); box5(FG, -1, 54, -1, 1, 56, 1, C('#fff8e0'));
  const m = lmMesh(F, FG), g = new THREE.Group(); g.add(m);
  const nm = signMesh('IRON KEY FERRY', '#2f5fae', 60, 10); nm.rotation.x = -Math.PI / 2; nm.position.set(0, 27.6, W - 13); g.add(nm); m.userData.own.push(nm.material);
  scene.add(g); return g;
}
