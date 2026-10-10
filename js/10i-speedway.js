'use strict';
/* ---------- 7c3. THE SPEEDWAY (the Palm Heights beach) ----------
   MAP.speedway (tools/remodel_city.py version 3), a small one between the west shore and the backs of the beach-front row:
   - the oval: two straights joined by half circles, its long axis north-south. Cars run south down the west straight (the front stretch,
     the start and finish line in the middle of it) and north up the back. A concrete wall all round the outside, a low one round the
     inside (grass in the infield); a gap in the outer wall at the south turn lets you drive on from the paddock.
   - the grandstand outside the front stretch, full of people, a roof over its top rows.
   - the paddock between the oval and the shore street: the pit garages, the race booth (the NASCAR race, js/08o) and the NASCAR special.
   - the drag strip along the beach's east edge: two lanes, the staging line at the south end by the street, the run going north an
     eighth of a mile (201 m), then the braking stretch, a sand trap and a tyre wall. Fences both sides, the start lights (the tree) between
     the lanes, the timing boards at the finish.
   ovalAt / ovalU: a point on the oval from the distance along it and back - the races (js/08o) drive and count laps with them. */
const SPW = MAP.speedway || null;
const OV = SPW ? (() => { const o = Object.assign({}, SPW.oval); o.yn = o.cy - o.S / 2; o.ys = o.cy + o.S / 2; o.L = 2 * o.S + 2 * Math.PI * o.R;
  o.t1 = o.S / 2; o.t2 = o.t1 + Math.PI * o.R; o.t3 = o.t2 + o.S; o.t4 = o.t3 + Math.PI * o.R; return o; })() : null;
const SPW_STRIP = SPW ? SPW.strip : null;
function ovalAt(u, off, out) {            // u: the distance from the start line along the centre line (the way the cars run); off: outward from it
  const O = OV; u = ((u % O.L) + O.L) % O.L; out = out || {};
  let x, y, ang, nx, ny;
  if (u < O.t1) { x = O.cx - O.R; y = O.cy + u; ang = Math.PI / 2; nx = -1; ny = 0; }
  else if (u < O.t2) { const th = Math.PI - (u - O.t1) / O.R; nx = Math.cos(th); ny = Math.sin(th); x = O.cx + O.R * nx; y = O.ys + O.R * ny; ang = th - Math.PI / 2; }
  else if (u < O.t3) { x = O.cx + O.R; y = O.ys - (u - O.t2); ang = -Math.PI / 2; nx = 1; ny = 0; }
  else if (u < O.t4) { const th = -(u - O.t3) / O.R; nx = Math.cos(th); ny = Math.sin(th); x = O.cx + O.R * nx; y = O.yn + O.R * ny; ang = th - Math.PI / 2; }
  else { x = O.cx - O.R; y = O.yn + (u - O.t4); ang = Math.PI / 2; nx = -1; ny = 0; }
  out.x = x + nx * off; out.y = y + ny * off; out.ang = ang; out.nx = nx; out.ny = ny; return out;
}
function ovalU(x, y) {                    // the other way: { u, off } of the nearest point on the centre line
  const O = OV;
  if (y >= O.yn && y <= O.ys) {
    if (x < O.cx) return { u: y >= O.cy ? y - O.cy : O.t4 + (y - O.yn), off: (O.cx - O.R) - x };
    return { u: O.t2 + (O.ys - y), off: x - (O.cx + O.R) };
  }
  if (y > O.ys) { const th = Math.atan2(y - O.ys, x - O.cx); return { u: O.t1 + (Math.PI - Math.max(0, th)) * O.R, off: Math.hypot(x - O.cx, y - O.ys) - O.R }; }
  const th = Math.atan2(y - O.yn, x - O.cx); return { u: O.t3 + (-Math.min(0, th)) * O.R, off: Math.hypot(x - O.cx, y - O.yn) - O.R };
}
const spwIn = (x, y) => !!SPW && SPW.area.some(a => inPoly(x, y, a));
const onOval = (x, y) => !!OV && Math.abs(ovalU(x, y).off) < OV.w / 2 + 2;
const stripY = (S, d) => S.stage + S.dir * d;        // a point d along the drag strip's run from the staging line
let SPW_PIT = null;                       // where the NASCAR special stands in the paddock (js/08o keeps one there)

/* ---------- solids and models: once, with the city (js/04 genWorld) ---------- */
function genSpeedway() {
  if (!SPW) return;
  const O = OV, add = (cx, cy, hw, hh, make, a) => { LMS.push({ cx, cy, a: a || 0, rad: Math.hypot(hw, hh), make: () => withSeed(9301 + Math.round(cx + cy), make), mesh: null }); LM_CLEAR.push([cx, cy, hw + 20, hh + 20]); };
  const wall = (off, skip) => {                                     // a wall along the oval, off from the centre line, in pieces about 40 long
    const n = Math.ceil(O.L / 40), a = {}, b = {};
    for (let k = 0; k < n; k++) {
      ovalAt(O.L * k / n, off, a); ovalAt(O.L * (k + 1) / n, off, b);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; if (skip && skip(mx, my)) continue;
      makeSolid(mx, my, Math.hypot(b.x - a.x, b.y - a.y) + 2, 6, Math.atan2(b.y - a.y, b.x - a.x), { wall: true });
    }
  };
  wall(O.w / 2 + 5, spwGap); wall(-(O.w / 2 + 5));                 // the outer wall with the way on, the inner wall all round
  const [sx0, sy0, sx1, sy1] = SPW.stands, [gx0, gy0, gx1, gy1] = SPW.garages;
  makeSolid((sx0 + sx1) / 2, (sy0 + sy1) / 2, sx1 - sx0, sy1 - sy0, 0, {}); add((sx0 + sx1) / 2, (sy0 + sy1) / 2, (sx1 - sx0) / 2 + 10, (sy1 - sy0) / 2 + 10, () => makeGrandstand(sx1 - sx0, sy1 - sy0));
  makeSolid((gx0 + gx1) / 2, (gy0 + gy1) / 2, gx1 - gx0, gy1 - gy0, 0, {}); add((gx0 + gx1) / 2, (gy0 + gy1) / 2, (gx1 - gx0) / 2, (gy1 - gy0) / 2, () => makeGarages(gx1 - gx0, gy1 - gy0), Math.PI);   // doors to the paddock (east)
  const [bx, by] = SPW.booth; makeSolid(bx, by, 18, 22, 0, {}); add(bx, by, 30, 30, makeRaceBooth, -Math.PI / 2);   // its window to the street (south)
  const px = O.cx + 40, py = O.cy - O.S / 2 + 60; makeSolid(px, py, 16, 16, 0, {}); add(px, py, 20, 20, makePylon);
  add(O.cx, O.cy, O.R - O.w / 2, O.S / 2, makeInfieldSign);
  SPW_PIT = { x: SPW.car[0], y: SPW.car[1], ang: SPW.car[2] * Math.PI / 180 };
  const S = SPW_STRIP, mid = (S.lanes[0] + S.lanes[1]) / 2;          // the drag strip: fences, the tree, the timing boards, the tyre wall
  FENCE_STYLE.track = FENCE_STYLE.track || { h: 26, net: '#c8ccd4', op: 0.32, wire: '#ffd23f', post: '#9aa0ab', kg: () => Infinity };
  addFence([[[S.x0 - 8, S.stage], [S.x0 - 8, S.wall - 6]], [[S.x1 + 8, S.stage], [S.x1 + 8, S.wall - 6]], [[S.x0 - 8, S.wall - 6], [S.x1 + 8, S.wall - 6]]], 'track');
  const ty = stripY(S, 40); makeSolid(mid, ty, 6, 6, 0, {}); add(mid, ty, 12, 12, makeTree, S.dir < 0 ? Math.PI : 0);
  makeSolid(S.x0 - 50, S.finish, 8, 24, 0, {}); add(S.x0 - 50, S.finish, 20, 30, makeTimers);
}
const spwGap = (x, y) => { const [gx, gy, gw] = SPW.gap; return Math.abs(x - gx) < gw / 2 && Math.abs(y - gy) < 40; };

/* ---------- the ground: track, apron, lines, the paddock, the strip (js/10g drawPlaces) ---------- */
function drawSpeedway(R, Mk, rect, road, lamp, fb) {
  if (!SPW) return;
  const O = OV, C = h => new THREE.Color(h), pts = [], q = {};
  for (let k = 0, N = Math.ceil(O.L / 24); k <= N; k++) { ovalAt(O.L * k / N, 0, q); pts.push([q.x, q.y]); }   // back to the start: closed
  const band = (o0, o1, h, col, T) => ribbon(T || R, pts, o0, o1, h, col);   // the oval is closed: ribbon joins its ends
  // ribbon's offsets: positive is outward here (the infield is on the cars' left)
  band(-O.w / 2, O.w / 2, 0.46, C('#2c2a33'));                              // the racing surface
  band(-O.w / 2 - 6, -O.w / 2, 0.45, C('#4a4858'));                        // the apron inside
  band(O.w / 2 - 6, O.w / 2 - 3, 0.62, C('#f1f1ee'), Mk);                  // the white line at the wall
  band(-O.w / 2 + 4, -O.w / 2 + 7, 0.62, C('#ffd23f'), Mk); band(-O.w / 2 - 1, -O.w / 2 + 2, 0.62, C('#ffd23f'), Mk);   // the double yellow at the bottom
  for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) {                // the start and finish line: chequered across the front stretch
    const x0 = O.cx - O.R - O.w / 2 + i * O.w / 10, y0 = O.cy - 9 + j * 9; rect(Mk, x0, y0, x0 + O.w / 10, y0 + 9, 0.63, C((i + j) % 2 ? '#111118' : '#f4f4f4'));
  }
  const [px0, py0, px1, py1] = SPW.paddock;
  rect(R, px0, py0, px1, py1, 0.44, C('#3a3846'));                          // the paddock, bays painted along it
  for (let y = py0 + 90; y < py1 - 120; y += 60) rect(Mk, px0 + 100, y, px0 + 170, y + 3, 0.63, C('#f1f1ee'));
  const [gx, gy, gw] = SPW.gap; rect(R, gx - gw / 2, gy - 30, gx + gw / 2, py0 + 10, 0.45, C('#3a3846'));   // the way on through the wall
  const S = SPW_STRIP, mid = (S.lanes[0] + S.lanes[1]) / 2, y0 = Math.min(S.apron, S.wall), y1 = Math.max(S.apron, S.wall), yEnd = S.end, yWall = S.wall;
  rect(R, S.x0, Math.min(S.apron, S.end), S.x1, Math.max(S.apron, S.end), 0.46, C('#2a2830'));   // the strip
  rect(R, S.x0 - 4, Math.min(yEnd, yWall), S.x1 + 4, Math.max(yEnd, yWall), 0.45, C('#8a7a58'));   // the sand trap
  for (let d = 20; Math.abs(d) < Math.abs(S.end - S.stage); d += 60) { const y = stripY(S, d); rect(Mk, mid - 1.5, Math.min(y, y + S.dir * 30), mid + 1.5, Math.max(y, y + S.dir * 30), 0.63, C('#ffd23f')); }
  rect(Mk, S.x0, S.stage - 2, S.x1, S.stage + 2, 0.63, C('#f1f1ee'));     // the staging line
  for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) { const x0 = S.x0 + i * (S.x1 - S.x0) / 14, yy = S.finish - 8 + j * 8; rect(Mk, x0, yy, x0 + (S.x1 - S.x0) / 14, yy + 8, 0.63, C((i + j) % 2 ? '#111118' : '#f4f4f4')); }
  for (const ft of [60, 330]) { const y = stripY(S, ft * 0.3048 * UNITS_PER_M); for (const x of [S.x0 + 4, S.x1 - 10]) rect(Mk, x, y - 1, x + 6, y + 1, 0.63, C('#f1f1ee')); }   // the timing marks
  for (let k = 0; k < 8; k++) fb.push({ x: S.x0 + 10 + k * (S.x1 - S.x0 - 20) / 7, y: 4, z: yWall + S.dir * 6, sx: 14, sy: 8, sz: 14, c: '#16161a' });   // the tyre wall
  for (const off of [O.w / 2 + 5, -(O.w / 2 + 5)]) {                       // the walls: concrete, a coloured band on the outer one
    const n = Math.ceil(O.L / 40), a = {}, b = {}, outer = off > 0, hgt = outer ? 12 : 6;
    for (let k = 0; k < n; k++) {
      ovalAt(O.L * k / n, off, a); ovalAt(O.L * (k + 1) / n, off, b); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ry = -Math.atan2(b.y - a.y, b.x - a.x), L = Math.hypot(b.x - a.x, b.y - a.y) + 2;
      if (outer && spwGap(mx, my)) continue;
      fb.push({ x: mx, y: hgt / 2, z: my, sx: L, sy: hgt, sz: 6, ry, c: outer ? '#e8e8ee' : '#b8bcc8' });
      if (outer) fb.push({ x: mx, y: hgt - 2, z: my, sx: L, sy: 3, sz: 6.4, ry, c: k % 2 ? '#2bf3ff' : '#ff2bd6' });
    }
  }
  for (let u = 0; u < O.L; u += O.L / 10) { ovalAt(u, O.w / 2 + 30, q); if (q.x > O.cx + 20 || (q.x < O.cx - O.R && q.y > SPW.stands[1] - 20 && q.y < SPW.stands[3] + 20) || spwGap(q.x, q.y + 30)) continue; lamp(q.x, q.y, 70, '#fff3d0', 320); }   // floodlights round the outside (not on the strip's side)
  for (let d = 300; Math.abs(d) < Math.abs(S.end - S.stage); d += 520) lamp(S.x0 - 30, stripY(S, d), 60, '#fff3d0', 300);
}

/* ---------- models (streamed like landmarks; local x, z = world x - centre, world y - centre) ---------- */
function makeGrandstand(w, d) {           // tiers rising away from the track (west), seats in colours, a crowd, a roof over the top rows
  const T = new GeoBuilder(), G = new GeoBuilder(), hw = w / 2, hd = d / 2, n = 8, tw = w * 0.8 / n, conc = _C('#9a968c'), cols = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6'];
  for (let k = 0; k < n; k++) {
    const x1 = hw - k * tw, x0 = x1 - tw, y = 4 + k * 5;
    box5(T, x0, 0, -hd, x1, y, hd, conc); box5(T, x0 + 1, y, -hd, x1 - 4, y + 1.2, hd, _C(cols[k % cols.length]));
    for (let z = -hd + 6; z < hd - 6; z += 9) if (Math.random() < 0.8) {                // the crowd: a head and shoulders on each seat
      const c = _C(pick(['#e0554b', '#4f8fe0', '#e0c34a', '#58b36b', '#c97be0', '#f08a3a', '#e8e8e8', '#3fd0c0'])), sx = x0 + tw * 0.5;
      box5(T, sx - 2, y + 1.2, z - 2.4, sx + 2, y + 5.4, z + 2.4, c); box5(T, sx - 1.4, y + 5.4, z - 1.4, sx + 1.4, y + 8, z + 1.4, _C(pick(['#f2c6a0', '#d9a074', '#a8714a', '#7a4d30'])));
    }
  }
  box5(T, -hw, 0, -hd, -hw + w * 0.2, 4 + n * 5 + 10, hd, _C('#6a6876'));                // the back wall
  const rh = 4 + n * 5 + 24; box5(T, -hw - 4, rh, -hd - 4, hw * 0.1, rh + 3, hd + 4, _C('#e8e8ee'));   // the roof on posts
  for (let z = -hd; z <= hd; z += 160) box5(T, hw * 0.05 - 2, 0, z - 2, hw * 0.05 + 2, rh, z + 2, _C('#5a5f6a'));
  box5(G, hw * 0.1 - 3, rh, -hd - 4, hw * 0.1, rh + 4, hd + 4, _C('#ff2bd6'));               // a neon edge along the roof's front
  const m = lmMesh(T, G), sg = signMesh('PALM BEACH SPEEDWAY', '#ffd23f', Math.min(d * 0.85, 440), 40);
  sg.position.set(-hw * 0.4, rh + 5, 0); sg.rotation.set(-Math.PI / 2, 0, Math.PI / 2); m.add(sg); m.userData.own.push(sg.material); return m;
}
function makeGarages(w, d) {              // a long low block, roller doors toward the pit lane (west), team colours over them
  const T = new GeoBuilder(), G = new GeoBuilder(), hw = w / 2, hd = d / 2, H = 22, n = Math.floor(d / 90);
  box5(T, -hw, 0, -hd, hw, H, hd, _C('#d8d4cc')); box5(T, -hw - 1, H, -hd - 1, hw + 1, H + 2, hd + 1, _C('#8a8e98'));
  for (let i = 0; i < n; i++) {
    const z = -hd + (i + 0.5) * d / n;
    face(T, [[-hw - 0.3, 0, z - 30], [-hw - 0.3, 0, z + 30], [-hw - 0.3, 16, z + 30], [-hw - 0.3, 16, z - 30]], [-1, 0, 0], _C('#5a6070'));
    face(G, [[-hw - 0.4, 17, z - 30], [-hw - 0.4, 17, z + 30], [-hw - 0.4, 20, z + 30], [-hw - 0.4, 20, z - 30]], [-1, 0, 0], _C(['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d'][i % 5]));
  }
  const m = withSign(lmMesh(T, G), 'GARAGES', '#f1f1ee', Math.min(d * 0.5, 240), 24, 0, H + 2.5, 0);
  m.children[m.children.length - 1].rotation.set(-Math.PI / 2, 0, Math.PI / 2); return m;   // written on the roof, for the camera
}
function makeRaceBooth() {                // the race booth: a kiosk with a window, RACE in lights, a chequered flag
  const T = new GeoBuilder(), G = new GeoBuilder();
  box5(T, -11, 0, -9, 11, 22, 9, _C('#2a2d3a')); box5(T, -13, 22, -11, 13, 25, 11, _C('#ff2bd6'));
  face(G, [[-11.3, 8, -6], [-11.3, 8, 6], [-11.3, 17, 6], [-11.3, 17, -6]], [-1, 0, 0], _C('#ffe9a8'));
  box5(T, 13, 0, -1, 14.4, 46, 1, _C('#d8d8d8'));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box5(G, 14.4 + i * 4, 34 + j * 4, -0.3, 18.4 + i * 4, 38 + j * 4, 0.3, _C((i + j) % 2 ? '#111118' : '#f4f4f4'));
  return withSign(lmMesh(T, G), 'RACE', '#ffd23f', 34, 12, 0, 34, 0);
}
function makePylon() {                    // the scoring pylon: a tall column of lit positions
  const T = new GeoBuilder(), G = new GeoBuilder();
  box5(T, -6, 0, -6, 6, 110, 6, _C('#2a2d3a'));
  for (let k = 0; k < 8; k++) box5(G, -6.4, 18 + k * 11, -5, 6.4, 26 + k * 11, 5, _C(['#ffd23f', '#f4f4f4', '#2bf3ff', '#ff2bd6'][k % 4]));
  box5(G, -7, 110, -7, 7, 114, 7, _C('#3dffa6'));
  return lmMesh(T, G);
}
function makeInfieldSign() {              // the track's name painted big on the infield grass
  const g = new THREE.Group(), s = signMesh('PALM 200', '#ffffff', OV.S * 0.62, (OV.R - OV.w / 2) * 0.55);
  s.material.transparent = true; s.material.opacity = 0.55; s.material.depthWrite = false;
  s.rotation.set(-Math.PI / 2, 0, Math.PI / 2); s.position.set(-60, 0.9, 0); g.add(s); g.userData.own = [s.material]; return g;
}
function makeTree() {                     // the drag strip's start lights: a pole, three ambers, a green, a red on each side
  const T = new GeoBuilder(), G = new GeoBuilder();
  box5(T, -1.2, 0, -1.2, 1.2, 30, 1.2, _C('#2a2d3a')); box5(T, -5, 14, -2, 5, 36, 2, _C('#14141a'));
  const m = lmMesh(T, G), lights = [];
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {
    const l = new THREE.Mesh(GSph, mBas(k < 3 ? 0x3a2a10 : k === 3 ? 0x103a18 : 0x3a1010)); l.scale.setScalar(1.6); l.position.set(s * 2.6, 32 - k * 4, -2.4); m.add(l); lights.push(l);
  }
  m.userData.lights = lights; DRAG_TREE.mesh = m; return m;
}
const DRAG_TREE = { mesh: null, stage: -1 };       // js/08o lights it: 0..2 ambers, 3 green, 4 red
function treeLights(stage) {
  DRAG_TREE.stage = stage; const m = DRAG_TREE.mesh; if (!m) return;
  m.userData.lights.forEach((l, i) => { const k = Math.floor(i / 2), on = k < 3 ? stage === k || (stage > k && stage < 3) : k === 3 ? stage === 3 : stage === 4;
    l.material = mBas(on ? (k < 3 ? 0xffb02e : k === 3 ? 0x3dffa6 : 0xff2a2a) : (k < 3 ? 0x3a2a10 : k === 3 ? 0x103a18 : 0x3a1010)); });
}
function makeTimers() {                   // the timing boards at the finish: two lit panels on a frame
  const T = new GeoBuilder(), G = new GeoBuilder();
  for (const z of [-6, 6]) box5(T, -1, 0, z - 1, 1, 30, z + 1, _C('#5a5f6a'));
  box5(T, -2, 22, -10, 2, 44, 10, _C('#14141a'));
  box5(G, 2.1, 25, -8, 2.5, 32, 8, _C('#ffd23f')); box5(G, 2.1, 35, -8, 2.5, 42, 8, _C('#2bf3ff'));
  return lmMesh(T, G);
}

/* ---------- the minimap and the city map (js/14 buildMiniMap): the track and the strip on the map canvas ---------- */
function mapSpeedway(m, X, Y, k) {
  if (!SPW) return;
  const O = OV, q = {};
  m.lineWidth = O.w * k; m.strokeStyle = '#3a3448'; m.beginPath();
  for (let u = 0; u <= O.L; u += 30) { ovalAt(u, 0, q); u ? m.lineTo(X(q.x), Y(q.y)) : m.moveTo(X(q.x), Y(q.y)); } m.closePath(); m.stroke();
  m.lineWidth = Math.max(1, 3 * k); m.strokeStyle = '#ffd23f'; m.stroke();
  const S = SPW_STRIP, y0 = Math.min(S.apron, S.end), y1 = Math.max(S.apron, S.end); m.fillStyle = '#3a3448'; m.fillRect(X(S.x0), Y(y0), (S.x1 - S.x0) * k, (y1 - y0) * k);
  m.fillStyle = '#ffd23f'; m.fillRect(X(S.x0), Y(S.finish) - 1, (S.x1 - S.x0) * k, 2);
}
