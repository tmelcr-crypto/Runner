'use strict';
/* ---------- 7h. THE AIRPORT ----------
   The Skyport airfield laid out by tools/remodel_city.py (MAP.airport): short grass, the runway with its markings, edge and approach
   lights, the taxiways, yellow lines on the apron to the five gates, the terminal hall with a jet bridge at every gate, three hangars,
   the control tower, a windsock, booths at the two gates and the fence round the airside. The fence stops people and cars but not
   bullets or eyes; a heavy vehicle going fast enough breaks through a panel (js/01k). The planes are js/08i. */
const AIRF = MAP.airport || null;
const FENCE_PANEL = 40;
let FENCE = [];                                                   // fence panels (every place's): their solids and their two instances (net, top wire)
const FENCE_STYLE = {                                             // h: height; net, op: the mesh's colour and opacity; wire: the top; kg: what breaks through
  airport: { h: 28, net: '#aab4c4', op: 0.3, wire: '#2bf3ff', post: '#5d6273', kg: () => AIRP.fenceKg },
  base: { h: 34, net: '#8a9070', op: 0.38, wire: '#d8d8c8', post: '#4a4f3a', kg: () => AIRP.fenceKg, barbed: true },
  compound: { h: 30, net: '#9a9a80', op: 0.38, wire: '#ffb02e', post: '#4a4f3a', kg: () => AIRP.fenceKg, barbed: true },
  lunapark: { h: 22, net: '#20182c', op: 0.6, wire: '#ffd23f', post: '#20182c', kg: () => Infinity },
  space: { h: 36, net: '#c8ccd4', op: 0.3, wire: '#ff3b5c', post: '#9aa0ab', kg: () => Infinity },
};
function addFence(lines, style) {                                 // fence panels of at most FENCE_PANEL along polylines; solids that stop people and cars
  for (const line of lines) for (let k = 0; k < line.length - 1; k++) {
    const [ax, ay] = line[k], [bx, by] = line[k + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / FENCE_PANEL)), a = Math.atan2(by - ay, bx - ax);
    if (L < 1) continue;
    for (let i = 0; i < n; i++) {
      const cx = ax + (bx - ax) * (i + 0.5) / n, cy = ay + (by - ay) * (i + 0.5) / n;
      FENCE.push({ s: makeSolid(cx, cy, L / n, 4, a, { fence: true }), x: cx, y: cy, len: L / n, a, style, end: i === n - 1 && k === line.length - 2 });
    }
  }
}
function obox(gb, ax, az, bx, bz, w, y0, y1, col) {               // a box from (ax, az) to (bx, bz), w wide, between heights y0 and y1, any direction
  const L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, px = -uz * w / 2, pz = ux * w / 2, mx = (ax + bx) / 2, mz = (az + bz) / 2;
  const c = [[ax + px, az + pz], [bx + px, bz + pz], [bx - px, bz - pz], [ax - px, az - pz]];
  face(gb, c.map(([x, z]) => [x, y1, z]), [0, 1, 0], col);
  for (let k = 0; k < 4; k++) {
    const p = c[k], q = c[(k + 1) % 4], nx = (p[0] + q[0]) / 2 - mx, nz = (p[1] + q[1]) / 2 - mz, m = Math.hypot(nx, nz) || 1;
    face(gb, [[p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]], [nx / m, 0, nz / m], col);
  }
}
function makeTerminalHall() {                                    // a long glass hall facing the apron, a canopy over the drop-off, a jet bridge to every gate
  const [x0, z0, x1, z1] = AIRF.terminal, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hh = (z1 - z0) / 2;
  const T = new GeoBuilder(), G = new GeoBuilder(), wall = _C('#cfd3dd'), trim = _C('#b8bdc9'), glass = _C('#3fe0ff'), dark = _C('#2a2348'), steel = _C('#9aa0ab');
  box5(T, -hw, 0, -hh, hw, 34, hh, wall); box5(T, -hw - 6, 34, -hh - 6, hw + 6, 38, hh + 6, trim);
  box5(T, -130, 38, -hh + 30, 130, 48, hh - 30, _C('#a9aebb'));                                  // the raised roof with skylights
  for (let z = -hh + 60; z < hh - 90; z += 130) flat(G, -100, z, 100, z + 60, 48.3, _C('#7fe8ff'));
  for (const [sx, n] of [[-1, [-1, 0, 0]], [1, [1, 0, 0]]]) face(G, [[sx * (hw + 0.3), 8, -hh + 10], [sx * (hw + 0.3), 8, hh - 10], [sx * (hw + 0.3), 28, hh - 10], [sx * (hw + 0.3), 28, -hh + 10]], n, glass);
  face(G, [[-hw + 10, 8, hh + 0.3], [hw - 10, 8, hh + 0.3], [hw - 10, 28, hh + 0.3], [-hw + 10, 28, hh + 0.3]], [0, 0, 1], glass);
  face(G, [[-hw - 6, 34.5, hh + 6.3], [hw + 6, 34.5, hh + 6.3], [hw + 6, 37.5, hh + 6.3], [-hw - 6, 37.5, hh + 6.3]], [0, 0, 1], _C('#ff2bd6'));
  box5(T, hw, 24, -hh + 120, hw + 46, 27, hh - 120, trim);                                       // the canopy over the forecourt, on posts
  face(G, [[hw + 46.3, 24, -hh + 120], [hw + 46.3, 24, hh - 120], [hw + 46.3, 27, hh - 120], [hw + 46.3, 27, -hh + 120]], [1, 0, 0], _C('#2bf3ff'));
  for (let z = -hh + 130; z <= hh - 130; z += 120) box5(T, hw + 38, 0, z - 1.5, hw + 41, 24, z + 1.5, dark);
  for (let z = -hh + 180; z < hh - 150; z += 240) face(G, [[hw + 0.4, 0, z - 14], [hw + 0.4, 0, z + 14], [hw + 0.4, 13, z + 14], [hw + 0.4, 13, z - 14]], [1, 0, 0], _C('#ffe9b0'));   // doors
  for (const [ax, az] of [[-60, -hh + 200], [60, -200], [-40, 300], [70, hh - 260]]) box5(T, ax - 14, 48, az - 10, ax + 14, 56, az + 10, steel);   // plant on the roof
  const m = lmMesh(T, G), own = m.userData.own;
  AIRF.stands.forEach((st, i) => {                                // the bridge: a corridor from the wall, a rotunda on a column, a tunnel to the front door
    const rx = x0 - 34 - cx, rz = st.y - 60 - cz, ex = st.x + 80 - cx, ez = st.y - 15 - cz;
    const B = new GeoBuilder(); obox(B, -hw, rz, rx, rz, 11, 13, 22, steel); B.prism(rx, rz, 8, 0, 23, dark, 10, 8, true);
    obox(B, rx, rz, ex, ez, 10, 13, 22, steel); box5(B, ex - 2, 0, ez - 2, ex + 2, 13, ez + 2, dark);
    const bm = new THREE.Mesh(mergeBuilders([B]), LM_MAT[0]); m.add(bm);
    const sg = signMesh('GATE ' + (i + 1), '#ffe14a', 40, 9); sg.position.set(rx, 32, rz + 10); m.add(sg); own.push(sg.material);
  });
  const sg = signMesh('SKYPORT', '#2bf3ff', 300, 60); sg.position.set(0, 76, hh - 40); m.add(sg); own.push(sg.material);
  return m;
}
function makeBooth() {                                           // a guard booth with the boom raised
  const T = new GeoBuilder(), G = new GeoBuilder();
  box5(T, -10, 0, -8, 10, 22, 8, _C('#d8d2ee')); box5(T, -12, 22, -10, 12, 25, 10, _C('#3a3f5c'));
  face(G, [[-8, 9, 8.3], [8, 9, 8.3], [8, 18, 8.3], [-8, 18, 8.3]], [0, 0, 1], _C('#ffe9b0'));
  box5(G, -12, 25, -10, 12, 26, 10, _C('#ff3b5c'));
  return lmMesh(T, G);
}
function genAirport() {                                          // js/04 genWorld, after the landmarks: collision boxes, the buildings' builders, the fence
  FENCE = []; if (!AIRF) return;
  const add = (cx, cy, hw, hh, make) => { LMS.push({ cx, cy, a: 0, rad: Math.hypot(hw, hh), make: () => withSeed(7001 + Math.round(cx + cy), make), mesh: null }); LM_CLEAR.push([cx, cy, hw + 30, hh + 30]); };
  const [x0, y0, x1, y1] = AIRF.terminal; makeSolid((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0, {}); add((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, makeTerminalHall);
  const H = AIRF.hangars; makeSolid(H.x, H.y, H.w - 40, H.h - 20, 0, {}); add(H.x, H.y, H.w / 2, H.h / 2, () => makeHangars(H));
  const [tx, ty] = AIRF.tower; makeSolid(tx, ty, 50, 50, 0, {}); add(tx, ty, 30, 30, makeTower);
  for (const g of AIRF.gates) {                                  // a booth just inside each gate
    const a = g.a * Math.PI / 180, bx = g.x + Math.cos(a) * (g.w / 2 + 16) - Math.sin(a) * 20, by = g.y + Math.sin(a) * (g.w / 2 + 16) + Math.cos(a) * 20;
    makeSolid(bx, by, 20, 16, 0, {}); add(bx, by, 14, 12, makeBooth);
  }
  addFence(AIRF.fence, 'airport');
}
const onRunway = (x, y, m) => !!AIRF && Math.abs(x - AIRF.runway.x) < AIRF.runway.w / 2 + m && y > AIRF.runway.y0 - m && y < AIRF.runway.y1 + m;
function fenceBreak(rc, c) {                                     // js/07: a vehicle against a fence panel - true when it goes straight through
  const p = FENCE.find(f => f.s === rc); if (!p) return false;
  if (Math.round(c.t.mass * 1400) < FENCE_STYLE[p.style].kg() || carSpeed(c) < AIRP.fenceKmh) return false;
  rc.off = true; p.gone = true; showPanel(p, false);
  for (let k = 0; k < 14; k++) { const a = c.ang + rand(-0.9, 0.9), s = carSpeed(c) * rand(0.4, 0.9); addP({ x: p.x, y: p.y, z: rand(6, 24), vz: rand(30, 120), grav: 300, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.5, 1.1), max: 1.1, s0: rand(2, 4), s1: 1.5, col: pick(['#aab4c4', '#7c8494', '#2bf3ff']), drag: 2 }); }
  spark(p.x, p.y, 8); c.vx *= 0.9; c.vy *= 0.9;
  if (c.driver === 'player') { Snd.thud(260); cam.shake = Math.max(cam.shake, 6); }
  return true;
}
const _fo = new THREE.Object3D();
function showPanel(p, on) {
  for (const it of [p.net, p.wire, p.barb]) {
    const m = it && it._m; if (!m) continue;
    _fo.position.set(it.x, it.y, it.z); _fo.scale.set(on ? it.sx : 0, on ? it.sy : 0, on ? it.sz : 0); _fo.rotation.set(0, it.ry, 0); _fo.updateMatrix();
    m.setMatrixAt(it._k, _fo.matrix); m.instanceMatrix.needsUpdate = true;
  }
}
function resetFence() { for (const p of FENCE) if (p.gone) { p.gone = false; p.s.off = false; showPanel(p, true); } }   // a new game: the fence is whole again

/* ---------- the ground, the markings, the lights: built once with the city (js/10) ---------- */
function drawAirport(fb, fg, fc, poles, heads, pools) {
  if (!AIRF) return;
  shapeMesh(AIRF.field, 0.2, '#123f3a');
  const R = new Tris(), Mk = new Tris(), C = h => new THREE.Color(h), asph = C('#221d2e'), twy = C('#262033'), white = C('#e8e6f0'), yellow = C('#ffd23f'), red = C('#e0364f');
  const rect = (T, x0, y0, x1, y1, h, col) => T.quad([x0, y0], [x1, y0], [x1, y1], [x0, y1], h, col);
  const rw = AIRF.runway, RX = rw.x, hw = rw.w / 2;
  rect(R, RX - hw, rw.y0, RX + hw, rw.y1, 0.5, asph);              // the runway: edge stripes, centre line, thresholds, touchdown zones, aiming points
  for (const s of [-1, 1]) rect(Mk, RX + s * (hw - 4) - 1.5, rw.y0 + 10, RX + s * (hw - 4) + 1.5, rw.y1 - 10, 0.7, white);
  for (let y = rw.y0 + 260; y < rw.y1 - 260; y += 100) rect(Mk, RX - 2, y, RX + 2, y + 55, 0.7, white);
  for (const [e, d] of [[rw.y0, 1], [rw.y1, -1]]) {
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) { const x = RX + s * (12 + k * 7.5); rect(Mk, x - 2.5, e + d * 20, x + 2.5, e + d * 110, 0.7, white); }
    rect(Mk, RX - hw + 6, e + d * 8, RX + hw - 6, e + d * 13, 0.7, white);
    for (const t of [330, 480, 630]) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = RX + s * (22 + k * 8); rect(Mk, x - 2, e + d * t, x + 2, e + d * (t + 40), 0.7, white); }
    for (const s of [-1, 1]) rect(Mk, RX + s * 34 - 8, e + d * 420, RX + s * 34 + 8, e + d * 560, 0.7, white);
  }
  for (let y = rw.y0; y <= rw.y1; y += 110) for (const s of [-1, 1]) {   // edge lights: white, red at the far end, green at the near end
    const c = y - rw.y0 < 300 ? '#ff3b5c' : rw.y1 - y < 300 ? '#3dffa6' : '#fff3b0';
    fg.push({ x: RX + s * (hw + 6), y: 1.5, z: y, sx: 3, sy: 3, sz: 3, c });
  }
  for (let y = rw.y1 + 70, k = 0; k < 9; y += 70, k++) {            // approach lights on posts out over the water
    poles.push({ x: RX, y: 6, z: y, sx: 1.2, sy: 12, sz: 1.2, c: '#14102a' });
    for (let i = -2; i <= 2; i++) heads.push({ x: RX + i * 8, y: 12, z: y, sx: 3, sy: 2, sz: 3, c: k % 3 === 2 ? '#ff3b5c' : '#fff3b0' });
  }
  const TW = AIRF.tw / 2;                                         // taxiways: asphalt, a yellow centre line, blue edge lights; a hold line before the runway
  for (const t of AIRF.taxiways) for (let k = 0; k < t.length - 1; k++) {
    const [ax, ay] = t[k], [bx, by] = t[k + 1], x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    if (y0 === y1) { rect(R, Math.max(x0, RX + hw), y0 - TW, x1 + TW, y1 + TW, 0.45, twy); rect(Mk, Math.max(x0, RX), y0 - 1.5, x1, y1 + 1.5, 0.62, yellow); }
    else { rect(R, x0 - TW, y0 - TW, x1 + TW, y1 + TW, 0.45, twy); rect(Mk, x0 - 1.5, y0, x1 + 1.5, y1, 0.62, yellow); }
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
    for (let s = 40; s < L - 40; s += 90) for (const sd of [-1, 1]) { const x = ax + ux * s - uy * sd * (TW + 4), y = ay + uy * s + ux * sd * (TW + 4); if (!onRunway(x, y, 8)) fg.push({ x, y: 1.5, z: y, sx: 2.6, sy: 2.6, sz: 2.6, c: '#3f6bff' }); }
  }
  for (const y of AIRF.links) for (const o of [0, 7]) rect(Mk, RX + hw + 30 + o, y - TW + 4, RX + hw + 33 + o, y + TW - 4, 0.62, yellow);
  const [ax0, ay0, ax1, ay1] = AIRF.apron, lane = AIRF.lane, dep = ay1 - 110;  // apron lines: the lane past the gates, the way in from the middle link and the way out
  rect(Mk, lane - 1.5, ay0 + 40, lane + 1.5, ay1 - 40, 0.62, yellow);
  rect(Mk, ax0, AIRF.links[1] - 1.5, lane, AIRF.links[1] + 1.5, 0.62, yellow);
  rect(Mk, ax0, dep - 1.5, lane, dep + 1.5, 0.62, yellow);
  for (const st of AIRF.stands) {                                   // each gate: the lead-in line, a stop bar, a red box round the stand
    rect(Mk, lane, st.y - 1.5, st.x + 4, st.y + 1.5, 0.62, yellow); rect(Mk, st.x + 96, st.y - 18, st.x + 100, st.y + 18, 0.62, yellow);
    const bx0 = st.x - 140, bx1 = ax1 - 6, by0 = st.y - 115, by1 = st.y + 115;
    for (let x = bx0; x < bx1; x += 24) for (const y of [by0, by1]) rect(Mk, x, y - 1, Math.min(x + 14, bx1), y + 1, 0.62, red);
    for (let y = by0; y < by1; y += 24) rect(Mk, bx0 - 1, y, bx0 + 1, Math.min(y + 14, by1), 0.62, red);
  }
  for (const st of AIRF.stands.slice(1)) {                          // baggage carts and a tug waiting between the gates
    const y = st.y - 162, x = ax1 - 30;
    for (let k = 0; k < 3; k++) { fb.push({ x, y: 4, z: y - 26 + k * 18, sx: 10, sy: 5, sz: 14, c: '#d6d2c4' }); fb.push({ x, y: 8.5, z: y - 26 + k * 18, sx: 8, sy: 4, sz: 11, c: pick(['#2a4aa8', '#7a3b2a', '#4a4e5c']) }); }
    fb.push({ x, y: 5, z: y + 32, sx: 12, sy: 8, sz: 14, c: '#ffb02e' });
  }
  { const wx = RX + hw + 160, wy = rw.y0 + 500;                     // the windsock
    poles.push({ x: wx, y: 14, z: wy, sx: 1.2, sy: 28, sz: 1.2, c: '#d8d2ee' });
    for (let k = 0; k < 4; k++) fc.push({ x: wx + 4 + k * 5, y: 27, z: wy + k * 2, sx: 3.2 - k * 0.5, sy: 5, sz: 3.2 - k * 0.5, c: k % 2 ? '#f1f1ee' : '#ff7a3d' }); }
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true }), markMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  R.mesh(roadMat).frustumCulled = false; Mk.mesh(markMat).frustumCulled = false;
}
function drawFences(fc) {                                         // js/10, once: every place's fence - posts, a see-through net (or railings), a top wire, barbed wire
  const by = {};
  for (const p of FENCE) {
    const st = FENCE_STYLE[p.style], g = by[p.style] || (by[p.style] = { nets: [], wires: [], barbs: [] }), ry = -p.a, ca = Math.cos(p.a), sa = Math.sin(p.a), H = st.h;
    for (const e of p.end ? [-1, 1] : [-1]) fc.push({ x: p.x + e * ca * p.len / 2, y: H / 2, z: p.y + e * sa * p.len / 2, sx: 1.4, sy: H, sz: 1.4, c: st.post });
    g.nets.push(p.net = { x: p.x, y: H / 2, z: p.y, sx: p.len, sy: H - 2, sz: 0.6, ry, c: st.net });
    g.wires.push(p.wire = { x: p.x, y: H, z: p.y, sx: p.len, sy: 1, sz: 1, ry, c: st.wire });
    if (st.barbed) g.barbs.push(p.barb = { x: p.x, y: H + 3, z: p.y, sx: p.len, sy: 4, sz: 5, ry, c: '#7a7a70' });   // a coil of razor wire on top
  }
  for (const k in by) {
    const st = FENCE_STYLE[k], g = by[k];
    instanced(GB, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: st.op, depthWrite: false, side: THREE.DoubleSide }), g.nets);
    instanced(GB, M.instBasic, g.wires); if (g.barbs.length) instanced(GB, M.instWhite, g.barbs);
  }
}
