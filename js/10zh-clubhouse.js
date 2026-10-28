'use strict';
/* ---------- 7zh. THE FAIRWAY ISLES GOLF CLUB's clubhouse on the golf links, the top-down kind (both modes) ----------
   A low white clubhouse with a green roof by the road on the first of Fairway Isles' links: a paved car park in front, the glass door,
   inside a long bar with stools, lounge chairs round low tables, trophy cases, a fireplace; at the back a terrace over the course with
   umbrellas and a putting green. Its roof turns see-through while you are inside. Open by day (places table, Clubhouse): a barman and
   golfers; at night the door is locked. A quest can hold it (GOLF.ms): the door open, the quest's people only (M21). Mode: golfClub.
   GOLF.S: { cx, cy, a, ca, sa, hw, hd, H, door (outside), inside, bar, table, terrace } (local x across, z from the terrace to the door). */
const GOLF = { S: null, ms: null };
const GOLF_WT = 3, GOLF_DW = 24;
const golfOn = () => feat('golfClub') && !!GOLF.S;
const golfOpen = () => SKY.hour >= PLC.golfOpen && SKY.hour < PLC.golfClose;
function golfWorld(lx, lz, out) { return ixWorld(GOLF.S, lx, lz, out); }
const _clq = {};
function golfIn(x, y, m) { const S = GOLF.S; if (!S) return false; ixLocal(S, x, y, _clq); return Math.abs(_clq.x) < S.hw - GOLF_WT - (m || 0) && Math.abs(_clq.z) < S.hd - GOLF_WT - (m || 0); }
function golfSpot() {                       // by the road on the first links lawn: the building facing the road, clear of the mansion
  const lawns = MAP.grass.filter(g => g.k !== 'wood' && g.k !== 'lawn').map(g => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { g, x0, y0, x1, y1 }; })
    .filter(q => Math.max(q.x1 - q.x0, q.y1 - q.y0) > 1000 && districtAt((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2) === 'FAIRWAY ISLES').sort((p, q) => p.x0 - q.x0);
  const m = typeof SAFES !== 'undefined' && SAFES.find(s => s.id === 'mansion');
  const ramp = (x, y) => STUNTS.some(s => { const J = s.J, t = clamp((x - J.x) * J.ux + (y - J.y) * J.uy, -120, 520); return dist(x, y, J.x + J.ux * t, J.y + J.uy * t) < 90; });   // a stunt ramp's run-up and landing
  for (const q of lawns) for (let y = q.y0 + 120; y < q.y1 - 120; y += 40) for (let x = q.x0 + 120; x < q.x1 - 120; x += 40) {
    if (!inPoly(x, y, q.g) || (m && dist(x, y, m.door.x, m.door.y) < 700)) continue;
    const r = nearestRoad(x, y, 320); if (!r) continue;
    const t = edgeAt(r.e, r.s, {}), dx = t.x - x, dy = t.y - y, d = Math.hypot(dx, dy); if (d < 190 || d > 300) continue;
    const a = Math.round(Math.atan2(-dx, dy) / (Math.PI / 2)) * (Math.PI / 2), ca = Math.cos(a), sa = Math.sin(a);
    const S = { cx: x, cy: y, a, ca, sa, hw: 70, hd: 50 }; let ok = true;
    for (let lz = -S.hd - 40; lz <= S.hd + 70 && ok; lz += 20) for (let lx = -S.hw - 10; lx <= S.hw + 10 && ok; lx += 20) { const w = ixWorld(S, lx, lz); if (!inPoly(w.x, w.y, q.g) || pedBlocked(w.x, w.y) || ramp(w.x, w.y) || nearestRoad(w.x, w.y, ROAD_HALF + 10)) ok = false; }
    if (ok) return S;
  }
  return null;
}
function genGolfClub() {                   // js/04 genWorld: after the places (its staff are posts)
  GOLF.S = null; const S0 = golfSpot(); if (!S0) return;
  const S = GOLF.S = Object.assign(S0, { H: 28, roof: 1 }), { hw, hd } = S, W = GOLF_WT;
  const sol = (lx, lz, w, h, ex) => { const p = golfWorld(lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, h), S.a, Object.assign({ bld: true }, ex || {})); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  for (const s of [-1, 1]) sol(s * (hw + GOLF_DW / 2) / 2, hd - W / 2, hw - GOLF_DW / 2, W);
  S.doorSolid = sol(0, hd - W / 2, GOLF_DW + 2, W + 2, { ixDoor: true });
  sol(-hw + 34, -hd + 12, 56, 10);                                  // the bar along the back wall
  S.tables = [[-20, 4], [16, 4], [40, -20], [-40, 22]]; for (const [x, z] of S.tables) sol(x, z, 10, 10);
  sol(hw - 10, 10, 8, 30);                                          // the trophy cases on the east wall
  S.door = golfWorld(0, hd + 22); S.inside = golfWorld(0, hd - 16); S.bar = golfWorld(-hw + 34, -hd + 24); S.table = golfWorld(16, -10);
  S.terrace = golfWorld(0, -hd - 26);
  LM_CLEAR.push([S.cx, S.cy, hw + 70, hd + 80]);
  S.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 80, make: () => withSeed(5831, () => makeGolfClub(S)), mesh: null }; LMS.push(S.lm);
  const post = (lx, lz, a, shirt, pants) => { const w = golfWorld(lx, lz);
    addPost({ x: w.x, y: w.y, a: S.a + a, kind: 'golfer', back: 200, need: () => golfOn() && golfOpen() && !GOLF.ms, step: standStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt, pants, ang: po.a }); return p; } }); };
  post(-hw + 34, -hd + 4, Math.PI / 2, '#f4f6fa', '#1a1a20');       // the barman behind the bar
  post(-20, 14, -Math.PI / 2, '#ff9ad0', '#f2e6c8'); post(28, -6, Math.PI, '#7fd4a8', '#d8c8a0'); post(10, -hd - 30, Math.PI / 2, '#ffd23f', '#3a4a6a');   // golfers at a table, and on the terrace
}
function makeGolfClub(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = GOLF_WT;
  const white = C('#f4f1ea'), green = C('#2f6a4a'), wood = C('#8a5a3a'), brass = C('#d4a020');
  flat(T, -hw, -hd, hw, hd, 0.4, C('#7a2a2a')); for (let x = -hw + 8; x < hw; x += 16) flat(T, x, -hd + 4, x + 0.8, hd - 4, 0.45, C('#8a3a32'));   // a red carpet with lines
  flat(T, -hw - 10, hd, hw + 10, hd + 64, 0.42, C('#9a9aa0')); for (let x = -hw; x <= hw; x += 22) flat(T, x - 0.6, hd + 20, x + 0.6, hd + 60, 0.46, white);   // the car park in front
  flat(T, -hw + 10, -hd - 50, hw - 10, -hd, 0.44, C('#c8b89a'));     // the stone terrace at the back
  flat(T, -40, -hd - 110, 40, -hd - 60, 0.43, C('#3dbb4a')); T.prism(18, -hd - 88, 1.2, 0.4, 0.5, C('#14141a'), 10); box5(T, 17.6, 0, -hd - 88.4, 18.4, 14, -hd - 87.6, white); box5(G, 18.4, 10, -hd - 88.2, 24, 13.5, -hd - 87.8, C('#ff3b4a'));   // the putting green and its flag
  for (const [x, z] of [[-40, -hd - 26], [0, -hd - 30], [40, -hd - 26]]) { box5(T, x - 4, 0, z - 4, x + 4, 6, z + 4, white); T.prism(x, z, 0.6, 6, 18, C('#3a3d47'), 6); T.prism(x, z, 12, 18, 20, C(x ? '#2f6a4a' : '#f4f1ea'), 10, 1); }   // tables under umbrellas
  /* the walls: white, big windows onto the course, the door's glass */
  const wall = (x0, z0, x1, z1) => { box5(T, x0, 0, z0, x1, 4, z1, white); box5(G, x0, 4, z0, x1, H - 6, z1, C('#8ac8e8')); box5(T, x0, H - 6, z0, x1, H, z1, white); };
  wall(-hw, -hd, hw, -hd + W); wall(-hw, -hd, -hw + W, hd); wall(hw - W, -hd, hw, hd); wall(-hw, hd - W, -GOLF_DW / 2, hd); wall(GOLF_DW / 2, hd - W, hw, hd);
  box5(T, -GOLF_DW / 2, H - 8, hd - W, GOLF_DW / 2, H, hd, white);
  for (let x = -hw; x <= hw; x += 20) for (const z of [-hd, hd - W]) box5(T, x - 1, 0, z - 0.3, x + 1, H, z + W + 0.3, white);
  /* inside: the bar and its stools, lounge tables and chairs, the trophy cases, the fireplace */
  box5(T, -hw + 6, 0, -hd + 7, -hw + 62, 11, -hd + 17, wood); box5(T, -hw + 5, 11, -hd + 6, -hw + 63, 12, -hd + 18, C('#5a3a22'));
  for (let x = -hw + 12; x < -hw + 62; x += 10) T.prism(x, -hd + 22, 2.2, 0, 8, C('#2a2d3a'), 8);
  for (let x = -hw + 8; x < -hw + 60; x += 4) box5(G, x, 14, -hd + W + 0.3, x + 2, 20, -hd + W + 1.2, C(pick(['#d4a020', '#3dbb4a', '#a8323a', '#2bf3ff'])));   // the bottles behind the bar
  for (const [x, z] of S.tables) { T.prism(x, z, 4.5, 0, 7, wood, 12); for (const [dx, dz] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) box5(T, x + dx - 3, 0, z + dz - 3, x + dx + 3, 6, z + dz + 3, green); }
  box5(T, hw - 14, 0, -6, hw - 6, 20, 26, wood); for (let z = -2; z < 24; z += 6) box5(G, hw - 13.6, 6, z, hw - 13, 18, z + 4, C('#bfe6ff')); for (let z = -1; z < 24; z += 6) T.prism(hw - 10, z + 1.5, 1.2, 8, 12, brass, 8);   // the trophy cases
  box5(T, -hw + 6, 0, 30, -hw + 12, 18, 44, C('#6a6f7a')); box5(G, -hw + 12, 2, 33, -hw + 12.6, 8, 41, C('#ff7a1a'));   // the fireplace
  /* the roof (it fades while you are inside): green tiles, white edges, the club's name painted on it */
  flat(R, -hw - 2, -hd - 2, hw + 2, hd + 2, H + 0.5, green); box5(R, -hw - 2, H, -hd - 2, hw + 2, H + 1.4, -hd + 1, white); box5(R, -hw - 2, H, hd - 1, hw + 2, H + 1.4, hd + 2, white);
  const m = lmMesh(T, G), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
  const roof = new THREE.Mesh(mergeBuilders([R]), [roofMat]); m.add(roof);
  const sign = fasciaSign('FAIRWAY ISLES GOLF CLUB', '#d4a020', 66, 8); sign.position.set(0, H - 4, hd + 0.9); m.add(sign);
  const top = fasciaSign('GOLF CLUB', '#f4f1ea', 80, 18); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 1.2, 0); m.add(top);   // upright from the camera whichever way it faces
  own.push(roofMat, sign.material, top.material);
  S.pt = { roofMat, top, op: -1 }; return m;
}
function golfReset() { GOLF.ms = null; if (GOLF.S) GOLF.S.roof = 1; }
function golfTick() { const S = GOLF.S; if (!S) return; S.doorSolid.off = !!GOLF.ms || (golfOn() && golfOpen()); }   // js/15 update: locked at night
let clubT = 0;
function gfxGolf(time) {                    // js/13: the roof fades over you
  const dt = Math.min(0.1, Math.max(0, time - clubT)); clubT = time;
  const S = GOLF.S; if (!S || !S.lm.mesh || !S.pt) return;
  const pt = S.pt, me = P.car || P, inside = !P.dead && golfIn(me.x, me.y, -6);
  S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
  if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.top.material.opacity = S.roof; pt.roofMat.depthWrite = S.roof > 0.97; pt.top.material.transparent = true; }
}
