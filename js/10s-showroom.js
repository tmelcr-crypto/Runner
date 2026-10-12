'use strict';
/* ---------- 7t. THE SUNSTRIP SHOWROOM: SUNSTRIP MOTORS (js/08w sells the cars) ----------
   Map remodel 10 (MAP.showroom) gave a car dealer the block at the corner of the beach avenue and the street south of the big park:
   - the glass hall, its front to the south street: glass walls on the street sides, the entrance in the middle of the front and a side
     door to the avenue (bollards in them: people walk in, cars do not), a polished floor, eleven turntables each turning a car of its
     own - every car kind the showroom sells (vehicles table: price), the three rare ones sold only here at the front - a sales counter
     at the back, plants, a big SUNSTRIP MOTORS over the door and on a pylon at the corner. The roof turns see-through while you are
     inside (an interior of the top-down kind, like the Pay 'n' Spray).
   - the tuning workshop at the back, its roller door to the avenue (shut until the tuning comes, PLAN step 5).
   - the stock yard beside it: cars for sale parked in rows under strings of pennants.
   Turntables and the counter are solid; the cars on them are pictures only (they never drive). Mode: showroom (js/01j). */
const SHOWM = MAP.showroom || null;
const SHOW = { slots: [], roof: 1, pt: null, lm: null, cars: [], yard: [], built: false };
const SHOW_LAYOUT = [                     // where each car stands in the hall: [type, x, z] in the hall's frame (x east, z south, from its middle)
  ['super', -165, 112], ['bike', -84, 116], ['sedan', -165, 34], ['sports', -84, 38], ['pickup', -165, -44], ['taxi', -84, -42], ['estate', -165, -118],
  ['convertible', 86, 114], ['muscle', 166, 112], ['truck', 166, 26], ['limo', 120, -92]];
const showHall = () => { const [x0, y0, x1, y1] = SHOWM.hall; return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hd: (y1 - y0) / 2 }; };
function showIn(x, y, m) { const H = showHall(); return Math.abs(x - H.cx) < H.hw - (m || 0) && Math.abs(y - H.cy) < H.hd - (m || 0); }
function genShowroom() {                  // js/04 genWorld, after the cement works: walls, doors with bollards, turntables, counter, workshop, the drawables
  SHOW.slots = []; SHOW.built = false; if (!SHOWM) return;
  const H = showHall(), solid = (x, y, w, h, o) => makeSolid(x, y, w, h, 0, o || {}), [bx0, by0, bx1, by1] = SHOWM.block, wt = 4;
  const wallX = (y, x0, x1, gaps) => { let a = x0; for (const [gx, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gx - gw / 2 > a) solid((a + gx - gw / 2) / 2, y, gx - gw / 2 - a, wt); a = gx + gw / 2; } if (x1 > a) solid((a + x1) / 2, y, x1 - a, wt); };
  const wallY = (x, y0, y1, gaps) => { let a = y0; for (const [gy, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gy - gw / 2 > a) solid(x, (a + gy - gw / 2) / 2, wt, gy - gw / 2 - a); a = gy + gw / 2; } if (y1 > a) solid(x, (a + y1) / 2, wt, y1 - a); };
  const [dx, dy, dw] = SHOWM.door, [sx, sy, sw] = SHOWM.side;
  wallX(H.y1, H.x0, H.x1, [[dx, dw]]); wallX(H.y0, H.x0, H.x1, []); wallY(H.x0, H.y0, H.y1, []); wallY(H.x1, H.y0, H.y1, [[sy, sw]]);
  for (let k = -1; k <= 1; k++) { solid(dx + k * dw / 4, dy, 6, 10); solid(sx, sy + k * sw / 3, 10, 6); }   // bollards: people pass between them, cars do not
  { const px = SHOWM.block[2] - 8, py = (SHOWM.hall[1] + SHOWM.shop[3]) / 2; solid(px, py, 10, 10); }
  for (const [type, lx, lz] of SHOW_LAYOUT) {
    const t = CAR_TYPES[type]; if (!t || !(t.price > 0)) continue;
    const x = H.cx + lx, y = H.cy + lz, r = t.len / 2 + 6;
    SHOW.slots.push({ type, x, y, r, color: t.colors[0], spin: 0.25 + (SHOW.slots.length % 3) * 0.06, ang: SHOW.slots.length * 1.3 });
    solid(x, y, r * 1.4, r * 1.4, { soft: true });
  }
  solid(H.cx, H.y0 + 30, 90, 24);                                    // the sales counter
  const [wx0, wy0, wx1, wy1] = SHOWM.shop; wallX(wy0, wx0, wx1, []); wallX(wy1, wx0, wx1, []); wallY(wx0, wy0, wy1, []);   // the workshop: shut for now
  const [ex, ey, ew] = SHOWM.sdoor; wallY(wx1, wy0, wy1, [[ey, ew]]); SHOW.sdoor = solid(ex, ey, wt + 2, ew, { door: true });   // the roller door: a wall while it is down
  const [yx0, yy0, yx1, yy1] = SHOWM.yard; SHOW.yard = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { const x = yx0 + 50 + j * 64, y = yy0 + 70 + i * 120, type = ['sedan', 'estate', 'pickup', 'sports', 'taxi', 'sedan'][i * 3 + j];
    if (CAR_TYPES[type]) { SHOW.yard.push({ type, x, y, color: pick(CAR_TYPES[type].colors) }); makeSolid(x, y, CAR_TYPES[type].wid, CAR_TYPES[type].len, 0, {}); } }
  LM_CLEAR.push([(bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) / 2, (by1 - by0) / 2]);
  LMS.push(SHOW.lm = { cx: H.cx, cy: (by0 + by1) / 2, a: 0, rad: Math.hypot(bx1 - bx0, by1 - by0) / 2 + 60, make: () => makeShowroom(H.cx, (by0 + by1) / 2), mesh: null });
}

/* ---------- the model ---------- */
function makeShowroom(cx, cy) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), H = showHall(), X = x => x - cx, Z = y => y - cy;
  const glass = _C('#7fd8f0'), frame = _C('#e8ecf2'), dark = _C('#2a2d38'), floor = _C('#e9e6ee'), wall = _C('#f2efe8'), neon = _C('#ff2bd6'), HH = 52, sub = [];
  // the hall: floor, slim white frame, glass on the street sides, solid walls behind
  flat(T, X(H.x0), Z(H.y0), X(H.x1), Z(H.y1), 0.9, floor);
  for (let x = H.x0 + 40; x < H.x1; x += 80) flat(T, X(x) - 0.6, Z(H.y0), X(x) + 0.6, Z(H.y1), 0.95, _C('#d4d0dc'));   // floor tiles
  for (let y = H.y0 + 40; y < H.y1; y += 80) flat(T, X(H.x0), Z(y) - 0.6, X(H.x1), Z(y) + 0.6, 0.95, _C('#d4d0dc'));
  box5(T, X(H.x0), 0, Z(H.y0), X(H.x1), HH, Z(H.y0) + 4, wall); box5(T, X(H.x0), 0, Z(H.y0), X(H.x0) + 4, HH, Z(H.y1), wall);
  const [dx, , dw] = SHOWM.door, [, sy, sw] = SHOWM.side;
  const glassX = (z, x0, x1) => { if (x1 - x0 < 2) return; face(G, [[X(x0), 1, z], [X(x1), 1, z], [X(x1), HH - 4, z], [X(x0), HH - 4, z]], [0, 0, 1], glass); };
  glassX(Z(H.y1), H.x0, dx - dw / 2); glassX(Z(H.y1), dx + dw / 2, H.x1);
  const glassZ = (x, z0, z1) => face(G, [[x, 1, z0], [x, 1, z1], [x, HH - 4, z1], [x, HH - 4, z0]], [1, 0, 0], glass);
  glassZ(X(H.x1), Z(H.y0), Z(sy - sw / 2)); glassZ(X(H.x1), Z(sy + sw / 2), Z(H.y1));
  for (let x = H.x0; x <= H.x1 + 1; x += 53) box5(T, X(x) - 1.5, 0, Z(H.y1) - 1.5, X(x) + 1.5, HH, Z(H.y1) + 1.5, frame);   // mullions
  for (let y = H.y0; y <= H.y1 + 1; y += 53) box5(T, X(H.x1) - 1.5, 0, Z(y) - 1.5, X(H.x1) + 1.5, HH, Z(y) + 1.5, frame);
  box5(T, X(H.x0), HH - 4, Z(H.y1) - 2, X(H.x1), HH, Z(H.y1) + 2, frame); box5(T, X(H.x1) - 2, HH - 4, Z(H.y0), X(H.x1) + 2, HH, Z(H.y1), frame);
  box5(T, X(dx - dw / 2) - 2, 0, Z(H.y1) - 2, X(dx - dw / 2) + 2, HH, Z(H.y1) + 2, dark); box5(T, X(dx + dw / 2) - 2, 0, Z(H.y1) - 2, X(dx + dw / 2) + 2, HH, Z(H.y1) + 2, dark);
  box5(T, X(dx - dw / 2) - 10, HH - 6, Z(H.y1), X(dx + dw / 2) + 10, HH, Z(H.y1) + 26, frame);   // the canopy over the door
  for (let k = -1; k <= 1; k++) { T.prism(X(dx + k * dw / 4), Z(H.y1) + 0.5, 2.6, 0, 9, _C('#9aa0ab'), 8, 2.6, true); T.prism(X(SHOWM.side[0]), Z(sy + k * sw / 3), 2.6, 0, 9, _C('#9aa0ab'), 8, 2.6, true); }
  // turntables: a dark disc with a ring of lights, the car's name on a stand
  for (const S of SHOW.slots) {
    T.prism(X(S.x), Z(S.y), S.r, 0.9, 3, _C('#2a2d38'), 28, S.r, true); T.prism(X(S.x), Z(S.y), S.r + 1.5, 0.9, 2.2, _C('#c8ccd4'), 28, S.r + 1.5, false);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; box5(G, X(S.x) + Math.cos(a) * (S.r - 2) - 0.8, 3, Z(S.y) + Math.sin(a) * (S.r - 2) - 0.8, X(S.x) + Math.cos(a) * (S.r - 2) + 0.8, 3.4, Z(S.y) + Math.sin(a) * (S.r - 2) + 0.8, CAR_TYPES[S.type].traffic || CAR_TYPES[S.type].parked ? _C('#2bf3ff') : _C('#ffd23f')); }
  }
  // the counter, plants
  box5(T, X(H.cx) - 45, 0, Z(H.y0) + 18, X(H.cx) + 45, 11, Z(H.y0) + 42, _C('#1d1b24')); box5(G, X(H.cx) - 45, 11, Z(H.y0) + 40, X(H.cx) + 45, 12, Z(H.y0) + 42, neon);
  for (const [px, pz] of [[H.x0 + 14, H.y1 - 14], [H.x1 - 14, H.y1 - 14], [H.x0 + 14, H.y0 + 20], [H.x1 - 14, H.y0 + 20]]) { T.prism(X(px), Z(pz), 5, 0.9, 7, _C('#e8e4dc'), 10, 4.5, true); T.prism(X(px), Z(pz), 7, 7, 18, _C('#2f8f4e'), 9, 2, true); }
  // the roof: white, a band of neon along its edge (it fades while you are inside)
  box5(R, X(H.x0) - 2, HH, Z(H.y0) - 2, X(H.x1) + 2, HH + 5, Z(H.y1) + 2, _C('#f4f4f6')); box5(RG, X(H.x0) - 2, HH + 5, Z(H.y1) + 1, X(H.x1) + 2, HH + 7, Z(H.y1) + 2, neon);
  for (let k = 0; k < 4; k++) box5(R, X(H.x0) + 60 + k * 90, HH + 5, Z(H.y0) + 60, X(H.x0) + 100 + k * 90, HH + 11, Z(H.y0) + 90, _C('#c8ccd4'));   // AC units
  // the workshop: a plain block, a roller door to the avenue, TUNING over it
  { const [x0, y0, x1, y1] = SHOWM.shop, [, ey, ew] = SHOWM.sdoor, h = 46;
    box5(T, X(x0), 0, Z(y0), X(x1), h, Z(y1), _C('#3a3f4c')); box5(T, X(x0) - 1, h, Z(y0) - 1, X(x1) + 1, h + 3, Z(y1) + 1, _C('#2a2d38'));
    face(T, [[X(x1) + 0.6, 0.5, Z(ey - ew / 2)], [X(x1) + 0.6, 0.5, Z(ey + ew / 2)], [X(x1) + 0.6, 38, Z(ey + ew / 2)], [X(x1) + 0.6, 38, Z(ey - ew / 2)]], [1, 0, 0], _C('#9aa0ab'));
    for (let y = 4; y < 38; y += 4) face(T, [[X(x1) + 0.8, y, Z(ey - ew / 2)], [X(x1) + 0.8, y, Z(ey + ew / 2)], [X(x1) + 0.8, y + 0.6, Z(ey + ew / 2)], [X(x1) + 0.8, y + 0.6, Z(ey - ew / 2)]], [1, 0, 0], _C('#6a707c'));
    for (let x = x0 + 20; x < x1 - 20; x += 40) face(G, [[X(x), 26, Z(y1) + 0.6], [X(x) + 24, 26, Z(y1) + 0.6], [X(x) + 24, 34, Z(y1) + 0.6], [X(x), 34, Z(y1) + 0.6]], [0, 0, 1], _C('#ffd98a'));
    const ts = fasciaSign('TUNING', '#ffd23f', 50, 12); ts.position.set(X(x1) + 1.2, 44, Z(ey)); ts.rotation.y = Math.PI / 2; sub.push(ts);
    const tb = fasciaSign('TUNING', '#ffd23f', 50, 12); tb.position.set(X(x1) - 30, h + 12, Z(y1) + 1.2); sub.push(tb); }
  // the stock yard: pennant strings on poles
  { const [x0, y0, x1, y1] = SHOWM.yard, cols = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d'];
    for (const [px, py] of [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8]]) T.prism(X(px), Z(py), 1.2, 0, 34, _C('#d8dce4'), 6);
    for (const [ax, ay, bx, by] of [[x0 + 8, y0 + 8, x1 - 8, y1 - 8], [x1 - 8, y0 + 8, x0 + 8, y1 - 8]]) for (let k = 1; k < 14; k++) { const t = k / 14, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, sag = 34 - Math.sin(t * Math.PI) * 6;
      face(G, [[X(x) - 2, sag, Z(y)], [X(x) + 2, sag, Z(y)], [X(x), sag - 5, Z(y)], [X(x), sag - 5, Z(y)]], [0, 0, 1], _C(cols[k % cols.length])); } }
  // the name: over the door and on a pylon at the avenue corner, turned to the camera
  const sg = fasciaSign('SUNSTRIP MOTORS', '#ff2bd6', Math.min(220, dw + 150), 22); sg.position.set(X(dx), HH - 16, Z(H.y1) + 27); sub.push(sg);
  { const px = X(SHOWM.block[2]) - 8, pz = Z((SHOWM.hall[1] + SHOWM.shop[3]) / 2); box5(T, px - 4, 0, pz - 4, px + 4, 80, pz + 4, dark);   // the pylon by the avenue, between the hall and the workshop
    const ps = fasciaSign('SUNSTRIP MOTORS', '#2bf3ff', 90, 16); ps.position.set(px - 30, 92, pz + 5); sub.push(ps);
    const ps2 = fasciaSign('NEW · RARE · TUNED', '#ffe14a', 70, 10); ps2.position.set(px - 30, 78, pz + 5); sub.push(ps2); }
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); }
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof); m.userData.own.push(roofMat, roofGlow);
  SHOW.pt = { roof, roofMat, roofGlow, op: -1 };
  return m;
}

/* ---------- the cars on show: models of their own, only while the showroom is near (js/13) ---------- */
function showCar(type, color, x, y, ang, z) {
  const c = { t: CAR_TYPES[type], type, color, x, y, ang };
  buildCar(c); const m = c.m;
  if (m.drv) m.drv.visible = false; if (m.rider) m.rider.visible = false; if (m.hb) m.hb.visible = false;
  c.mesh.position.set(x, z || 0, y); c.mesh.rotation.y = -ang; return c;
}
function dropShowCars() { for (const c of SHOW.cars) { scene.remove(c.mesh); if (c.m && c.m.body) c.m.body.dispose(); } SHOW.cars = []; SHOW.built = false; }
let showT = 0;
function gfxShowroom(time) {
  const dt = Math.min(0.1, Math.max(0, time - showT)); showT = time;
  if (!SHOWM || !SHOW.lm) return;
  const near = !!SHOW.lm.mesh;
  if (near && !SHOW.built) {
    SHOW.built = true;
    for (const S of SHOW.slots) { S.car = showCar(S.type, S.color, S.x, S.y, S.ang, 3); SHOW.cars.push(S.car); }
    for (const Y of SHOW.yard) SHOW.cars.push(showCar(Y.type, Y.color, Y.x, Y.y, Math.PI / 2, 0));
  } else if (!near && SHOW.built) dropShowCars();
  if (SHOW.built) for (const S of SHOW.slots) { S.ang += S.spin * dt; if (S.car) S.car.mesh.rotation.y = -S.ang; }
  const pt = SHOW.pt; if (!near || !pt) return;
  const me = P.car || P, inside = !P.dead && showIn(me.x, me.y, -4);
  SHOW.roof += ((inside ? 0.08 : 1) - SHOW.roof) * Math.min(1, dt * 6);
  if (Math.abs(SHOW.roof - pt.op) > 0.003) { pt.op = SHOW.roof; pt.roofMat.opacity = pt.roofGlow.opacity = SHOW.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = SHOW.roof > 0.97; }
}
