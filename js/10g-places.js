'use strict';
/* ---------- 7i. PLACES: the military base, the space center, the port's yards, the lunapark's streets ----------
   Laid out by tools/remodel_city.py (MAP.base, MAP.space, MAP.port, MAP.lunapark). genPlaces() (js/04 genWorld) puts in the collision
   boxes, the fences, the guard posts, the barriers, the armoury's racks and the builders of the buildings (streamed like landmarks);
   drawPlaces() (js/10 buildCity) the ground, the roads and markings, and the small things. The rides are js/10h, ships and cranes js/08k. */
const SPACEM = MAP.space || null, PORTM = MAP.port || null, LUNA = MAP.lunapark || null;
const LCOL = { khaki: '#b8b08a', olive: '#4f5a36', roofG: '#3f4a2c', conc: '#8d8a80', dark: '#2b2e38', white: '#eceef2', steel: '#9aa0ab', red: '#e0364f' };

/* ---------- small model helpers ---------- */
function gable(T, x0, z0, x1, z1, y0, rise, col, along) {        // a pitched roof over a box: the ridge along x (along true) or z
  const c = _C(col), c2 = c.clone().multiplyScalar(0.82);
  if (along) {
    const zm = (z0 + z1) / 2, yt = y0 + rise;
    face(T, [[x0, y0, z1], [x1, y0, z1], [x1, yt, zm], [x0, yt, zm]], [0, 0.7, 0.7], c); face(T, [[x0, y0, z0], [x1, y0, z0], [x1, yt, zm], [x0, yt, zm]], [0, 0.7, -0.7], c2);
    T.tri([x0, y0, z0], [x0, y0, z1], [x0, yt, zm], [-1, 0, 0], c2); T.tri([x1, y0, z1], [x1, y0, z0], [x1, yt, zm], [1, 0, 0], c2);
  } else {
    const xm = (x0 + x1) / 2, yt = y0 + rise;
    face(T, [[x1, y0, z0], [x1, y0, z1], [xm, yt, z1], [xm, yt, z0]], [0.7, 0.7, 0], c); face(T, [[x0, y0, z0], [x0, y0, z1], [xm, yt, z1], [xm, yt, z0]], [-0.7, 0.7, 0], c2);
    T.tri([x0, y0, z1], [x1, y0, z1], [xm, yt, z1], [0, 0, 1], c2); T.tri([x1, y0, z0], [x0, y0, z0], [xm, yt, z0], [0, 0, -1], c2);
  }
}
function windows(G, x0, x1, z, y0, y1, step, col, n) {            // a row of lit windows on a south (+z) face
  for (let x = x0 + step / 2; x < x1 - step / 2; x += step) face(G, [[x - step * 0.3, y0, z + 0.3], [x + step * 0.3, y0, z + 0.3], [x + step * 0.3, y1, z + 0.3], [x - step * 0.3, y1, z + 0.3]], n || [0, 0, 1], _C(col));
}
function withSign(m, text, col, w, h, x, y, z) { const sg = signMesh(text, col, w, h); sg.position.set(x, y, z); m.add(sg); m.userData.own.push(sg.material); return m; }

/* ---------- the military base ---------- */
function makeBaseBuilding(b) {
  const T = new GeoBuilder(), G = new GeoBuilder(), w = b.w / 2, h = b.h / 2, win = '#ffe9b0';
  if (b.t === 'barracks' || b.t === 'mess') {
    box5(T, -w, 0, -h, w, 22, h, _C(LCOL.khaki)); gable(T, -w - 4, -h - 4, w + 4, h + 4, 22, 14, LCOL.roofG, true);
    windows(G, -w + 10, w - 10, h, 8, 16, 24, win); face(G, [[-8, 0, h + 0.4], [8, 0, h + 0.4], [8, 15, h + 0.4], [-8, 15, h + 0.4]], [0, 0, 1], _C('#3a2a1e'));
    if (b.t === 'mess') box5(T, w - 30, 30, -6, w - 18, 46, 6, _C('#6a6a60'));
    return lmMesh(T, G);
  }
  if (b.t === 'hq') {
    box5(T, -w, 0, -h, w, 40, h, _C('#c8c0a0')); box5(T, -w - 3, 40, -h - 3, w + 3, 43, h + 3, _C(LCOL.olive));
    for (const y of [8, 26]) windows(G, -w + 10, w - 10, h, y, y + 9, 22, win);
    box5(T, -20, 0, h, 20, 26, h + 22, _C('#d8d0b0')); box5(T, -22, 26, h - 2, 22, 29, h + 24, _C(LCOL.olive));      // the entrance porch
    T.prism(w - 30, -h + 30, 1.2, 43, 110, _C(LCOL.dark), 5); box5(G, w - 32, 108, -h + 28, w - 28, 112, -h + 32, _C('#ff3b5c'));   // radio mast
    return withSign(lmMesh(T, G), 'COMMAND', '#3dffa6', 90, 18, 0, 52, h + 4);
  }
  if (b.t === 'garage') {                                           // a long open shed: roof on posts, a back wall
    box5(T, -w, 0, h - 6, w, 30, h, _C(LCOL.khaki)); box5(T, -w - 4, 30, -h - 6, w + 4, 34, h + 2, _C(LCOL.roofG));
    for (let x = -w; x <= w; x += 95) box5(T, x - 2, 0, -h - 4, x + 2, 30, -h, _C(LCOL.dark));
    return lmMesh(T, G);
  }
  if (b.t === 'guard') {
    box5(T, -w, 0, -h, w, 24, h, _C('#d8d0b0')); box5(T, -w - 5, 24, -h - 5, w + 5, 28, h + 5, _C(LCOL.olive));
    face(G, [[-w + 5, 10, h + 0.3], [w - 5, 10, h + 0.3], [w - 5, 20, h + 0.3], [-w + 5, 20, h + 0.3]], [0, 0, 1], _C(win));
    return withSign(lmMesh(T, G), 'STOP - MILITARY AREA', '#ff3b5c', 70, 12, 0, 40, h + 4);
  }
  if (b.t === 'fuel') {
    for (const s of [-1, 1]) { T.prism(s * 22, 0, 16, 0, 34, _C('#6a7048'), 12, 16, true); }
    box5(T, -6, 0, 26, 6, 14, 34, _C(LCOL.red));
    return lmMesh(T, G);
  }
  return lmMesh(T, G);
}
function makeTower2() {                                           // a watchtower: four legs, a cabin, a searchlight sweeping round
  const T = new GeoBuilder(), G = new GeoBuilder(), leg = _C(LCOL.dark);
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) box5(T, x - 1.5, 0, z - 1.5, x + 1.5, 60, z + 1.5, leg);
  box5(T, -16, 60, -16, 16, 64, 16, _C(LCOL.olive)); box5(T, -15, 64, -15, 15, 72, 15, _C(LCOL.khaki)); box5(T, -18, 82, -18, 18, 86, 18, _C(LCOL.roofG));
  for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) box5(T, x - 1, 72, z - 1, x + 1, 82, z + 1, leg);
  const m = lmMesh(T, G), piv = new THREE.Group(); piv.position.y = 80; m.add(piv);
  const beam = new THREE.Mesh(GP, glowMat('#fff3b0', 0.5, true)); beam.scale.set(260, 1, 50); beam.position.set(140, -78, 0); piv.add(beam);
  const lamp = new THREE.Mesh(GB, mBas(0xfff3b0)); lamp.scale.set(6, 4, 6); lamp.position.set(10, 0, 0); piv.add(lamp);
  const ph = Math.random() * TAU; m.userData.anim = t => { piv.rotation.y = ph + Math.sin(t * 0.35 + ph) * 1.6; };
  return m;
}
function makeBunker(w, h) {                                       // an ammo magazine: an earth mound with a concrete front and a steel door
  const T = new GeoBuilder(), G = new GeoBuilder(), seg = 10, R = h / 2;
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI, a1 = (k + 1) / seg * Math.PI, p = (a, x) => [x, Math.sin(a) * 26, Math.cos(a) * R];
    face(T, [p(a0, -w / 2), p(a1, -w / 2), p(a1, w / 2), p(a0, w / 2)], [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)], _C(k % 2 ? '#3f5a34' : '#46623a'));
  }
  box5(T, w / 2 - 4, 0, -R, w / 2 + 6, 24, R, _C(LCOL.conc)); face(G, [[w / 2 + 6.3, 0, -10], [w / 2 + 6.3, 0, 10], [w / 2 + 6.3, 17, 10], [w / 2 + 6.3, 17, -10]], [1, 0, 0], _C('#5a5f50'));
  return withSign(lmMesh(T, G), 'DANGER - EXPLOSIVES', '#ffb02e', 70, 12, 0, 40, R);
}
function makeRack() {                                             // a weapon rack in the armoury yard
  const T = new GeoBuilder(), G = new GeoBuilder();
  box5(T, -16, 0, -4, 16, 3, 4, _C(LCOL.dark)); for (const s of [-1, 1]) box5(T, s * 14 - 1, 0, -1, s * 14 + 1, 16, 1, _C(LCOL.dark)); box5(T, -16, 14, -2, 16, 16, 2, _C(LCOL.olive));
  return lmMesh(T, G);
}
function makeHeli() {                                             // a military helicopter on the pad; slowly turning rotor; a burnt wreck when blown up
  const T = new GeoBuilder(), G = new GeoBuilder(), body = _C('#4a5a32'), dk = _C('#2a3020');
  box5(T, -30, 6, -12, 34, 30, 12, body); box5(T, 34, 8, -9, 46, 24, 9, body); box5(G, 36, 14, -8, 46.5, 24, 8, _C('#1d2740'));   // the cabin and the nose glass
  box5(T, -95, 18, -3, -30, 26, 3, body); box5(T, -98, 18, -2, -90, 42, 2, body); box5(T, -96, 30, -10, -90, 33, 10, body);      // the tail boom, fin, stabiliser
  for (const s of [-1, 1]) { box5(T, -24, 0, s * 15 - 1.5, 30, 3, s * 15 + 1.5, dk); box5(T, -8, 0, s * 13 - 1, -6, 7, s * 13 + 1, dk); box5(T, 18, 0, s * 13 - 1, 20, 7, s * 13 + 1, dk); }
  box5(T, -6, 30, -5, 10, 36, 5, dk);
  const m = lmMesh(T, G), rot = new THREE.Group(); rot.position.set(2, 38, 0); m.add(rot);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(GB, mc('#1e2216')); b.scale.set(130, 1.2, 6); b.position.x = 65; const arm = new THREE.Group(); arm.rotation.y = k * Math.PI / 2; arm.add(b); rot.add(arm); }
  const orig = m.material; let wreck = false;
  m.userData.anim = t => { if (!wreck) rot.rotation.y = t * 0.6; };
  m.userData.wreck = on => { wreck = on; m.material = on ? [new THREE.MeshLambertMaterial({ color: 0x1c1a20 }), new THREE.MeshBasicMaterial({ color: 0x4a1c0c })] : orig; rot.visible = !on; m.rotation.z = on ? 0.06 : 0; };
  return m;
}

/* ---------- the space center ---------- */
function makeVAB(w, d) {                                          // the assembly hall: a huge box, tall doors, a flag and the sign
  const T = new GeoBuilder(), G = new GeoBuilder(), H = 210, hw = w / 2, hd = d / 2;
  box5(T, -hw, 0, -hd, hw, H, hd, _C('#e4e6ea')); box5(T, -hw - 2, H, -hd - 2, hw + 2, H + 4, hd + 2, _C('#b8bcc6'));
  for (const z of [-hd * 0.45, hd * 0.45]) face(G, [[-hw - 0.4, 0, z - 34], [-hw - 0.4, 0, z + 34], [-hw - 0.4, H * 0.9, z + 34], [-hw - 0.4, H * 0.9, z - 34]], [-1, 0, 0], _C('#5a6070'));   // the doors facing the pad
  for (let x = -hw + 20; x < hw - 20; x += 14) face(G, [[x, 4, hd + 0.3], [x + 3, 4, hd + 0.3], [x + 3, H - 10, hd + 0.3], [x, H - 10, hd + 0.3]], [0, 0, 1], _C('#c4c8d0'));   // panel lines
  const fx = -hw + 30, fw = 120, fh = 70, fy = H - 100;           // a flag: stripes and a star field
  for (let k = 0; k < 7; k++) face(G, [[fx, fy + k * 10, hd + 0.6], [fx + fw, fy + k * 10, hd + 0.6], [fx + fw, fy + k * 10 + 5, hd + 0.6], [fx, fy + k * 10 + 5, hd + 0.6]], [0, 0, 1], _C(LCOL.red));
  face(G, [[fx, fy + 35, hd + 0.8], [fx + 50, fy + 35, hd + 0.8], [fx + 50, fy + 70, hd + 0.8], [fx, fy + 70, hd + 0.8]], [0, 0, 1], _C('#2a4aa8'));
  return withSign(lmMesh(T, G), 'BAY SPACE CENTER', '#2bf3ff', 230, 46, 40, H - 40, hd + 2);
}
function makeLaunchPad(r) {                                       // the pad, the tower and the rocket on its launcher
  const T = new GeoBuilder(), G = new GeoBuilder(), conc = _C('#9a968c'), red = _C('#d0402a'), white = _C('#f4f4f4'), dk = _C('#1c1c22');
  T.prism(0, 0, r, 0, 4, conc, 8, r, true); box5(T, -r * 0.9, 0.5, -16, r * 0.9, 4.5, 16, dk);   // the hardstand, the flame trench
  box5(T, -46, 4, -46, 46, 24, 46, _C('#5a5f6a'));                // the mobile launcher platform
  const tz = -110;                                                // the tower beside it, red and white, with access arms
  for (const [x, z] of [[-14, tz - 14], [14, tz - 14], [-14, tz + 14], [14, tz + 14]]) box5(T, x - 2.5, 4, z - 2.5, x + 2.5, 300, z + 2.5, red);
  for (let y = 30; y < 300; y += 30) { box5(T, -15, y, tz - 15, 15, y + 3, tz + 15, y % 60 ? red : white); }
  for (const y of [150, 220, 262]) box5(T, -4, y, tz + 14, 4, y + 5, -18, _C('#6a6a74'));
  box5(G, -3, 300, tz - 3, 3, 312, tz + 3, _C('#ff3b5c'));
  T.prism(0, 0, 17, 24, 230, white, 16, 17); for (const y of [70, 150, 200]) T.prism(0, 0, 17.4, y, y + 6, dk, 16, 17.4);   // the rocket
  T.prism(0, 0, 17, 230, 262, white, 16, 6); T.prism(0, 0, 6, 262, 286, white, 12, 0.5);
  for (const s of [-1, 1]) { T.prism(s * 26, 0, 8, 24, 150, white, 10, 8); T.prism(s * 26, 0, 8, 150, 168, white, 10, 1); }   // two boosters
  box5(G, -2, 236, 16.8, 2, 252, 17.6, _C('#2a4aa8'));
  return lmMesh(T, G);
}
function makeSpaceBits(kind) {
  const T = new GeoBuilder(), G = new GeoBuilder();
  if (kind === 'lcc') {                                            // launch control: a low hall with its slanted window band toward the pad
    const S = SPACEM.lcc, w = S[2] / 2, h = S[3] / 2;
    box5(T, -w, 0, -h, w, 36, h, _C('#e8e8ec')); box5(T, -w - 3, 36, -h - 3, w + 3, 39, h + 3, _C('#9aa0ab'));
    face(G, [[-w + 8, 18, h + 0.4], [w - 8, 18, h + 0.4], [w - 8, 30, h + 0.4], [-w + 8, 30, h + 0.4]], [0, 0, 1], _C('#3fe0ff'));
    return withSign(lmMesh(T, G), 'LAUNCH CONTROL', '#2bf3ff', 110, 20, 0, 52, h + 4);
  }
  if (kind === 'office') {
    const S = SPACEM.office, w = S[2] / 2, h = S[3] / 2;
    box5(T, -w, 0, -h, w, 50, h, _C('#d8dce4')); for (const y of [8, 22, 36]) windows(G, -w + 8, w - 8, h, y, y + 8, 18, '#cfe9ff');
    return lmMesh(T, G);
  }
  if (kind === 'tank') { T.prism(0, 0, 3, 0, 40, _C(LCOL.dark), 6); const s = new THREE.Mesh(GSph, mc('#f2f2f4')); const m = lmMesh(T, G); s.scale.setScalar(40); s.position.y = 56; m.add(s); return m; }
  if (kind === 'water') { for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) box5(T, x - 2, 0, z - 2, x + 2, 70, z + 2, _C(LCOL.dark)); T.prism(0, 0, 24, 70, 100, _C('#f2f2f4'), 14, 24, true); return lmMesh(T, G); }
  if (kind === 'mast') { T.prism(0, 0, 2, 0, 330, _C('#c8ccd4'), 6, 1); box5(G, -2, 330, -2, 2, 334, 2, _C('#ff3b5c')); return lmMesh(T, G); }
  if (kind === 'crawler') {                                        // the crawler-transporter, parked on the crawlerway
    box5(T, -60, 14, -50, 60, 34, 50, _C('#9aa0ab')); for (const [x, z] of [[-44, -40], [44, -40], [-44, 40], [44, 40]]) box5(T, x - 16, 0, z - 10, x + 16, 14, z + 10, _C(LCOL.dark));
    box5(T, -60, 34, -50, -40, 46, -30, _C('#ececf0')); box5(T, 40, 34, 30, 60, 46, 50, _C('#ececf0'));
    return lmMesh(T, G);
  }
  if (kind === 'garden') {                                         // the rocket garden by the gate
    for (const [x, z, r, h] of [[-30, -20, 6, 90], [0, 10, 9, 120], [30, -18, 5, 70], [-8, -40, 4, 55]]) { T.prism(x, z, r, 0, h, _C('#f4f4f4'), 10, r); T.prism(x, z, r, h, h + r * 3, _C('#f4f4f4'), 10, 0.5); for (const y of [h * 0.3, h * 0.7]) T.prism(x, z, r + 0.3, y, y + 4, _C(LCOL.dark), 10, r + 0.3); }
    return lmMesh(T, G);
  }
  return lmMesh(T, G);
}
function makeSpaceGate() {                                        // a sliding steel gate between two pillars, shut, with a booth
  const T = new GeoBuilder(), G = new GeoBuilder();
  for (const s of [-1, 1]) box5(T, -6, 0, s * 70 - 6, 6, 40, s * 70 + 6, _C('#c8ccd4'));
  box5(T, -2, 2, -64, 2, 34, 64, _C('#7a808c')); for (let z = -60; z <= 60; z += 12) box5(T, -2.5, 2, z - 1, 2.5, 34, z + 1, _C('#5a606a'));
  box5(G, -8, 40, -72, 8, 43, -68, _C('#ff3b5c')); box5(G, -8, 40, 68, 8, 43, 72, _C('#ff3b5c'));
  return withSign(lmMesh(T, G), 'AUTHORIZED PERSONNEL ONLY', '#ff3b5c', 90, 13, 30, 50, 0);
}

/* ---------- the port ---------- */
const BOXC = ['#c0392b', '#2f6fd6', '#2fbf71', '#e0912f', '#22a6b3', '#8e5bd6', '#cfcfcf', '#d6c94a', '#4a4e5c'];
function makeStack(s) {                                           // a block of 20 ft containers, one to four high
  const [x0, y0, x1, y1, alongX] = s, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, T = new GeoBuilder(), G = new GeoBuilder();
  const L = 73, W = 29, H = 31, nl = Math.floor(((alongX ? x1 - x0 : y1 - y0)) / (L + 3)), nw = Math.floor(((alongX ? y1 - y0 : x1 - x0)) / (W + 2));
  for (let i = 0; i < nl; i++) for (let j = 0; j < nw; j++) {
    const n = Math.random() < 0.08 ? 0 : randi(1, 4), u = -nl * (L + 3) / 2 + i * (L + 3), v = -nw * (W + 2) / 2 + j * (W + 2);
    for (let l = 0; l < n; l++) {
      const c = _C(pick(BOXC)), y = l * (H + 0.5);
      if (alongX) box5(T, u, y, v, u + L, y + H, v + W, c); else box5(T, v, y, u, v + W, y + H, u + L, c);
    }
  }
  const m = lmMesh(T, G); m.userData.at = [cx, cy]; return m;
}
function makeTug() {
  const T = new GeoBuilder(), G = new GeoBuilder(), hull = _C('#c0392b');
  box5(T, -42, -4, -14, 34, 8, 14, hull); T.prism(34, 0, 14, -4, 8, hull, 10, 14, true); box5(T, -42, 8, -15, 48, 11, 15, _C('#1c1c22'));
  box5(T, -18, 11, -10, 16, 30, 10, _C('#f2f2f4')); box5(G, -14, 22, -10.3, 12, 28, -10.3 + 0.1, _C('#1d2740')); box5(T, -8, 30, -6, 2, 44, 6, _C('#e0912f'));
  for (let x = -38; x < 46; x += 10) for (const s of [-1, 1]) box5(T, x, 0, s * 15 - 1.5, x + 6, 7, s * 15 + 1.5, _C('#1c1c22'));   // tyre fenders
  return lmMesh(T, G);
}

/* ---------- the lunapark: the entrance, stands, the village, the piazza, booths ---------- */
function makeLunaGate(w) {                                        // the grand entrance: an arch with the park's name, ticket booths, turnstiles
  const T = new GeoBuilder(), G = new GeoBuilder(), pink = _C('#ff6fae'), cream = _C('#f4e9d0');
  for (const s of [-1, 1]) { box5(T, s * (w / 2 + 6) - 10, 0, -10, s * (w / 2 + 6) + 10, 70, 10, cream); T.prism(s * (w / 2 + 6), 0, 12, 70, 96, pink, 8, 1); }
  box5(T, -w / 2 - 16, 60, -6, w / 2 + 16, 74, 6, pink);
  for (const s of [-1, 1]) { box5(T, s * (w / 2 + 50) - 18, 0, -12, s * (w / 2 + 50) + 18, 26, 12, cream); box5(T, s * (w / 2 + 50) - 22, 26, -16, s * (w / 2 + 50) + 22, 30, 16, pink); face(G, [[s * (w / 2 + 50) - 14, 10, 12.3], [s * (w / 2 + 50) + 14, 10, 12.3], [s * (w / 2 + 50) + 14, 20, 12.3], [s * (w / 2 + 50) - 14, 20, 12.3]], [0, 0, 1], _C('#ffe9b0')); }
  for (let x = -w / 2 + 14; x < w / 2 - 6; x += 22) { box5(T, x - 1, 0, -6, x + 1, 12, 6, _C(LCOL.steel)); box5(T, x + 4, 9, -0.5, x + 14, 10, 0.5, _C(LCOL.steel)); }   // turnstiles
  for (let k = 0; k < 12; k++) { const x = -w / 2 - 12 + k * (w + 24) / 11; box5(G, x - 2, 74, -6.4, x + 2, 78, -6, _C(pick(['#ffe14a', '#2bf3ff', '#ff2bd6']))); }   // bulbs along the arch
  return withSign(lmMesh(T, G), 'HERON KEY LUNAPARK', '#ffe14a', w + 30, 26, 0, 88, 8);
}
function makeStand(seed) {                                        // a food stand with a striped awning, tables and umbrellas
  const T = new GeoBuilder(), G = new GeoBuilder(), cols = [['#ff2bd6', '#fff'], ['#2bf3ff', '#fff'], ['#ffb02e', '#fff'], ['#3dffa6', '#fff'], ['#e0364f', '#ffe14a']][seed % 5];
  box5(T, -18, 0, -12, 18, 18, 12, _C('#f4e9d0')); face(G, [[-14, 8, 12.3], [14, 8, 12.3], [14, 15, 12.3], [-14, 15, 12.3]], [0, 0, 1], _C('#ffe9b0'));
  for (let k = 0; k < 6; k++) face(T, [[-20 + k * 6.66, 22, 12], [-20 + (k + 1) * 6.66, 22, 12], [-20 + (k + 1) * 6.66, 18, 22], [-20 + k * 6.66, 18, 22]], [0, 0.7, 0.7], _C(cols[k % 2]));
  box5(T, -20, 18, -14, 20, 22, 12, _C(cols[0])); box5(G, -12, 24, -2, 12, 32, 0, _C(cols[0]));
  for (const [x, z] of [[-30, 36], [0, 44], [30, 36]]) { box5(T, x - 5, 0, z - 5, x + 5, 7, z + 5, _C('#7a5a3a')); T.prism(x, z, 0.6, 0, 22, _C(LCOL.dark), 4); T.prism(x, z, 12, 20, 25, _C(pick(['#ff2bd6', '#ffe14a', '#2bf3ff', '#3dffa6'])), 8, 1, true); }
  const words = ['HOT DOGS', 'ICE CREAM', 'PRETZELS', 'PIZZA', 'FUNNEL CAKE', 'TACOS', 'LEMONADE'];
  return withSign(lmMesh(T, G), words[seed % words.length], cols[0], 34, 7, 0, 36, 1);
}
function makeVillage(r) {                                         // half-timbered houses round a square, a beer hall and a clock tower
  const T = new GeoBuilder(), G = new GeoBuilder(), w = r.x1 - r.x0, h = r.y1 - r.y0, wall = _C('#f2ead8'), beam = _C('#4a3020');
  const house = (x, z, hw, hd, H, roof) => {
    box5(T, x - hw, 0, z - hd, x + hw, H, z + hd, wall);
    for (let k = -hw; k <= hw; k += hw / 2) box5(T, x + k - 1, 0, z + hd, x + k + 1, H, z + hd + 0.6, beam);   // timber frame on the front
    box5(T, x - hw, H * 0.5 - 1, z + hd, x + hw, H * 0.5 + 1, z + hd + 0.6, beam); gable(T, x - hw - 3, z - hd - 3, x + hw + 3, z + hd + 3, H, H * 0.8, roof, false);
    windows(G, x - hw + 4, x + hw - 4, z + hd + 0.6, H * 0.6, H * 0.8, 14, '#ffe9b0');
  };
  const roofs = ['#a83a2a', '#8a4a2a', '#6a2a3a', '#9a5a2a'];
  for (let k = 0; k < 4; k++) house(-w / 2 + 40, -h / 2 + 50 + k * 80, 32, 26, 32, roofs[k % 4]);
  for (let k = 0; k < 3; k++) house(w / 2 - 40, -h / 2 + 50 + k * 90, 32, 30, 34, roofs[(k + 1) % 4]);
  box5(T, -60, 0, h / 2 - 90, 70, 34, h / 2 - 10, wall); gable(T, -64, h / 2 - 94, 74, h / 2 - 6, 34, 26, '#7a2a1a', true);   // the beer hall
  for (let x = -55; x < 65; x += 20) box5(T, x - 1, 0, h / 2 - 10, x + 1, 34, h / 2 - 9.4, beam);
  T.prism(0, -40, 10, 0, 90, wall, 4, 10); T.prism(0, -40, 12, 90, 120, _C('#5a2a1a'), 4, 1);   // the clock tower in the square
  box5(G, -6, 70, -40 + 9.2, 6, 82, -40 + 9.8, _C('#ffe9b0'));
  return withSign(lmMesh(T, G), 'FESTHAUS', '#ffb02e', 70, 14, 5, 76, h / 2 - 8);
}
function makePiazza(rad) {                                        // the Italian piazza: a fountain, a ring of cafe umbrellas
  const T = new GeoBuilder(), G = new GeoBuilder(), stone = _C('#d8cfb8');
  disc(T, 0, 0, rad, 0.9, _C('#c9b48a'), 24); T.prism(0, 0, 34, 0, 8, stone, 18, 34, true); disc(G, 0, 0, 30, 8.3, _C('#3fb8ff'), 18);
  T.prism(0, 0, 6, 8, 26, stone, 8, 4); T.prism(0, 0, 14, 26, 30, stone, 10, 14, true); disc(G, 0, 0, 12, 30.3, _C('#7fe8ff'), 12);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3, x = Math.cos(a) * (rad - 16), z = Math.sin(a) * (rad - 16); T.prism(x, z, 0.6, 0, 20, _C(LCOL.dark), 4); T.prism(x, z, 11, 18, 23, _C(k % 2 ? '#2fbf71' : '#f4f4f4'), 8, 1, true); }
  const m = lmMesh(T, G), jet = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.6 })); jet.scale.set(2, 20, 2); jet.position.y = 40; m.add(jet); m.userData.own.push(jet.material);
  m.userData.anim = t => { jet.scale.y = 18 + Math.sin(t * 5) * 3; jet.position.y = 30 + jet.scale.y / 2; };
  return m;
}
function makeBooths(r) {                                          // a row of game booths: striped awnings, prizes on the shelves
  const T = new GeoBuilder(), G = new GeoBuilder(), h = r.y1 - r.y0, n = Math.floor(h / 40);
  for (let k = 0; k < n; k++) {
    const z = -h / 2 + 20 + k * 40, c = pick(['#ff2bd6', '#2bf3ff', '#ffb02e', '#3dffa6', '#a259ff']);
    box5(T, -18, 0, z - 18, 10, 20, z + 18, _C('#f4e9d0')); for (let i = 0; i < 4; i++) face(T, [[10, 24, z - 18 + i * 9], [10, 24, z - 9 + i * 9], [22, 19, z - 9 + i * 9], [22, 19, z - 18 + i * 9]], [0.4, 1, 0], _C(i % 2 ? c : '#ffffff'));
    for (let i = 0; i < 4; i++) box5(G, 10, 10, z - 14 + i * 8, 11, 15, z - 9 + i * 8, _C(pick(['#ffe14a', '#ff6fae', '#7fe8ff'])));
  }
  return lmMesh(T, G);
}

/* ---------- registration ---------- */
function genPlaces() {                                            // js/04 genWorld, after the landmarks and the airport
  POSTS = []; BARRIERS = []; TARGETS = []; ARMS = []; BASEV = []; HELI = null;
  const add = (cx, cy, hw, hh, make, a) => { LMS.push({ cx, cy, a: a || 0, rad: Math.hypot(hw, hh), make: () => withSeed(8101 + Math.round(cx * 3 + cy), make), mesh: null }); LM_CLEAR.push([cx, cy, hw + 20, hh + 20]); };
  const solid = (cx, cy, w, h, a, x) => makeSolid(cx, cy, w, h, a || 0, x || {});
  if (AIRF) {                                                       // the airport gates: a barrier across each road, two officers by each booth
    for (const g of AIRF.gates) {
      const a = g.a * Math.PI / 180, b = addBarrier({ x: g.x, y: g.y, a: g.a, w: g.w - 20, mode: 'stop' });
      for (let k = 0; k < PLC.gateGuards; k++) {
        const s = k % 2 ? 1 : -1, x = g.x + Math.cos(a) * (g.w / 2 + 34) - Math.sin(a) * s * 26, y = g.y + Math.sin(a) * (g.w / 2 + 34) + Math.cos(a) * s * 26;
        addPost({ x, y, a: Math.atan2(g.y - y, g.x - x), kind: 'cop', gate: b, need: () => feat('airportGates') });
      }
    }
  }
  if (BASEM) {
    const B = BASEM;
    addFence(B.fence, 'base'); addFence(B.armoury.fence, 'compound'); addFence(B.ammo.fence, 'compound');
    const g = B.gate; addBarrier({ x: g.x, y: g.y, a: 0, w: g.w - 10, mode: 'shut' });
    for (const b of B.buildings) { solid(b.x, b.y, b.w, b.h); add(b.x, b.y, b.w / 2, b.h / 2, () => makeBaseBuilding(b)); }
    for (const [x, y] of B.towers) { for (const [dx, dy] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) solid(x + dx, y + dy, 4, 4, 0, { soft: true }); add(x, y, 22, 22, makeTower2); }
    const [bx, by, bw, bh] = B.bunker; solid(bx, by, bw, bh); add(bx, by, bw / 2, bh / 2, () => makeBunker(bw, bh));
    const SM = WEAPONS.findIndex(w => w.id === 'smg'), MG = WEAPONS.findIndex(w => w.id === 'lmg');   // soldiers: at the gate, the armoury, the towers, on patrol
    const arms = k => k % 2 ? MG : SM, spots = [[g.x - 50, g.y - 40, -Math.PI / 2, true], [g.x + 50, g.y - 40, -Math.PI / 2, true], [B.armoury.gate.x - 40, B.armoury.gate.y + 30, Math.PI / 2, true], [B.armoury.gate.x + 40, B.armoury.gate.y + 30, Math.PI / 2, true]];
    for (const [x, y] of B.towers) { const cx = 2400, cy = 8900, d = Math.hypot(cx - x, cy - y); spots.push([x + (cx - x) / d * 30, y + (cy - y) / d * 30, Math.atan2(y - cy, x - cx), true]); }
    const routes = [[[1500, 9000], [3600, 9000]], [[2000, 9450], [2000, 8600], [2600, 8600], [2600, 9000]], [[1500, 8700], [1900, 8650], [1900, 9000]], [[3100, 9000], [3400, 8750], [2950, 8700]]];
    for (let k = 0; k < PLC.soldiers; k++) {
      const s = spots[k], need = () => feat('base');
      if (s) addPost({ x: s[0], y: s[1], a: s[2], fixed: s[3], kind: 'soldier', arm: arms(k), need });
      else { const r = routes[k % routes.length], q = r[0]; addPost({ x: q[0], y: q[1], a: 0, kind: 'soldier', arm: arms(k), patrol: r.concat(r.slice(1, -1).reverse()), need }); }
    }
    const SA = B.armoury.ring, ax0 = Math.min(...SA.map(p => p[0])), ax1 = Math.max(...SA.map(p => p[0])), ay0 = Math.min(...SA.map(p => p[1])), ay1 = Math.max(...SA.map(p => p[1]));
    const am = B.ammo.ring, mx0 = Math.min(...am.map(p => p[0])), mx1 = Math.max(...am.map(p => p[0])), my0 = Math.min(...am.map(p => p[1])), my1 = Math.max(...am.map(p => p[1]));
    const heavy = ['rocket', 'lmg', 'sniper', 'shotgun', 'smg', 'grenade', 'pipebomb'].map(id => WEAPONS.findIndex(w => w.id === id)).filter(i => i >= 0);
    const guns = WEAPONS.map((w, i) => i).filter(i => !isMelee(WEAPONS[i]) && WEAPONS[i].maxAmmo > 0);
    const wsp = []; for (let x = ax0 + 50; x <= ax1 - 40; x += 58) wsp.push([x, ay0 + 45]); for (let y = ay0 + 110; y <= ay1 - 60; y += 70) { wsp.push([ax0 + 50, y]); wsp.push([ax1 - 50, y]); }
    for (let k = 0; k < Math.min(PLC.armWeapons, wsp.length); k++) { const [x, y] = wsp[k]; ARMS.push({ x, y, wi: heavy[k % heavy.length], ammo: false }); add(x, y - 18, 18, 6, makeRack); }
    const asp = []; for (let y = my0 + 30; y <= my1 - 25; y += 36) for (let x = mx0 + 28; x <= mx1 - 25; x += 36) if (Math.abs(x - bx) > bw / 2 + 14 || Math.abs(y - by) > bh / 2 + 14) asp.push([x, y]);
    for (let k = 0; k < Math.min(PLC.armAmmo, asp.length); k++) { const [x, y] = asp[k]; ARMS.push({ x, y, wi: guns[k % guns.length], ammo: true }); }
    for (const [type, x, y, a] of B.vehicles) if (CAR_TYPES[type]) BASEV.push({ type, x, y, a: a * Math.PI / 180, car: null, taken: 0 });
    const [hx, hy] = B.helipad;
    HELI = addTarget({ x: hx, y: hy, reach: 110, hp: PLC.heliHp, maxhp: PLC.heliHp, burn: 0, deadAt: 0, mesh: null, circles: () => [[hx - 10, hy, 22], [hx + 30, hy, 16], [hx - 60, hy, 8]], hit: (d, bp) => heliHit(d, bp) });
    solid(hx + 5, hy, 80, 26, 0, { soft: true }); solid(hx - 62, hy, 70, 8, 0, { soft: true });
    LMS.push({ cx: hx, cy: hy, a: 0, rad: 120, make: () => { const m = makeHeli(); HELI.mesh = m; if (HELI.dead) m.userData.wreck(true); return m; }, mesh: null });
  }
  if (SPACEM) {
    const S = SPACEM; addFence(S.fence, 'space');
    const g = S.gate; solid(g.x, g.y, 14, g.w); add(g.x, g.y, 30, g.w / 2, makeSpaceGate);   // shut: nobody gets in until the story says so
    for (let k = 0; k < PLC.spaceGuards; k++) addPost({ x: g.x + 40, y: g.y + (k % 2 ? 50 : -50), a: 0, kind: 'cop', need: () => feat('spaceGuards') });
    const [vx, vy, vw, vh] = S.vab; solid(vx, vy, vw, vh); add(vx, vy, vw / 2, vh / 2, () => makeVAB(vw, vh));
    for (const k of ['lcc', 'office']) { const [x, y, w, h] = S[k]; solid(x, y, w, h); add(x, y, w / 2, h / 2, () => makeSpaceBits(k)); }
    const [px, py, pr] = S.pad; solid(px, py, 92, 92); solid(px, py - 110, 34, 34); add(px, py, pr, pr, () => makeLaunchPad(pr));
    for (const [x, y, r] of S.tanks) { solid(x, y, r * 1.6, r * 1.6, 0, { soft: true }); add(x, y, r, r, () => { const m = makeSpaceBits('tank'); m.scale.setScalar(r / 40); return m; }); }
    { const [x, y] = S.water; solid(x, y, 34, 34, 0, { soft: true }); add(x, y, 26, 26, () => makeSpaceBits('water')); }
    for (const [x, y] of S.masts) { solid(x, y, 6, 6, 0, { soft: true }); add(x, y, 10, 10, () => makeSpaceBits('mast')); }
    { const [x, y] = S.crawler; solid(x, y, 120, 100); add(x, y, 60, 50, () => makeSpaceBits('crawler')); }
    { const [x, y] = S.garden; solid(x, y, 80, 70, 0, { soft: true }); add(x, y, 40, 40, () => makeSpaceBits('garden')); }
  }
  if (PORTM) {
    genCranes();
    for (const s of PORTM.stacks) { const [x0, y0, x1, y1] = s; solid((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0); add((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, () => makeStack(s)); }
    for (const [x, y, a] of PORTM.tugs) add(x, y, 50, 20, makeTug, a * Math.PI / 180);
  }
  if (LUNA) {
    const L = LUNA; addFence(L.fence, 'lunapark');
    const g = L.gate; for (let x = g.x - g.w / 2 + 14; x < g.x + g.w / 2 - 6; x += 22) solid(x, g.y, 4, 12, 0, { walk: true });   // turnstiles: people pass, cars do not
    for (const s of [-1, 1]) { solid(g.x + s * (g.w / 2 + 6), g.y, 20, 20); solid(g.x + s * (g.w / 2 + 50), g.y, 36, 24); }
    add(g.x, g.y, g.w / 2 + 70, 20, () => makeLunaGate(g.w));
    L.stands.forEach(([x, y], i) => { solid(x, y, 36, 24); add(x, y, 40, 46, () => makeStand(i)); });
    for (const r of L.rides) {
      const cx = r.x !== undefined ? r.x : (r.x0 + r.x1) / 2, cy = r.y !== undefined ? r.y : (r.y0 + r.y1) / 2;
      if (r.t === 'village') { const w = r.x1 - r.x0, h = r.y1 - r.y0; for (let k = 0; k < 4; k++) solid(r.x0 + 40, r.y0 + 50 + k * 80, 64, 52); for (let k = 0; k < 3; k++) solid(r.x1 - 40, r.y0 + 50 + k * 90, 64, 60); solid(cx + 5, r.y1 - 50, 130, 80); solid(cx, cy - 40, 20, 20); add(cx, cy, w / 2, h / 2, () => makeVillage(r)); }
      else if (r.t === 'piazza') { solid(cx, cy, 60, 60, 0, { soft: true }); add(cx, cy, r.r, r.r, () => makePiazza(r.r)); }
      else if (r.t === 'booths') { solid(cx - 4, cy, 28, r.y1 - r.y0); add(cx, cy, 30, (r.y1 - r.y0) / 2, () => makeBooths(r)); }
      else genRide(r, add, solid);                                  // the rides (js/10h)
    }
  }
}

/* ---------- ground, roads, markings: once, with the city (js/10) ---------- */
function drawPlaces(fb, fg, fc, fs, poles, heads, pools) {
  const R = new Tris(), Mk = new Tris(), C = h => new THREE.Color(h);
  const rect = (T, x0, y0, x1, y1, h, col) => T.quad([x0, y0], [x1, y0], [x1, y1], [x0, y1], h, col);
  const road = (pts, w, h, col, line) => { ribbon(R, pts, -w / 2, w / 2, h, C(col)); if (line) for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1], L = Math.hypot(bx - ax, by - ay); for (let s = 10; s < L - 20; s += 40) { const t0 = s / L, t1 = (s + 20) / L; ribbon(Mk, [[ax + (bx - ax) * t0, ay + (by - ay) * t0], [ax + (bx - ax) * t1, ay + (by - ay) * t1]], -1.5, 1.5, h + 0.1, C(line)); } } };
  const lamp = (x, y, h, col, pool) => { poles.push({ x, y: h / 2, z: y, sx: 1.4, sy: h, sz: 1.4, c: '#14102a' }); heads.push({ x, y: h, z: y, sx: 6, sy: 3, sz: 6, c: col }); pools.push({ x, y: 1.5, z: y, sx: pool, sy: 1, sz: pool, c: col }); };
  if (AIRF && AIRF.roads) for (const r of AIRF.roads) road(r, AIRF.rw, 0.5, '#26222f', '#ffd23f');   // the roads from the airport gates
  if (BASEM) {
    const B = BASEM;
    for (const r of B.roads) road(r, B.rw, 0.5, '#2a2a26', '#e8e6d0');
    rect(R, ...B.motor, 0.45, C('#5a5a50')); rect(R, ...B.parade, 0.45, C('#6a6858'));
    for (let x = B.motor[0] + 80; x < B.motor[2]; x += 160) rect(Mk, x - 1.5, B.motor[1] + 10, x + 1.5, B.motor[3] - 10, 0.6, C('#e8e6d0'));
    const [hx, hy, hr] = B.helipad; R.quad([hx - hr, hy - hr], [hx + hr, hy - hr], [hx + hr, hy + hr], [hx - hr, hy + hr], 0.45, C('#4a4a46'));
    for (let k = 0; k < 32; k++) { const a0 = k / 32 * TAU, a1 = (k + 1) / 32 * TAU, r0 = hr - 12, r1 = hr - 6; Mk.quad([hx + Math.cos(a0) * r0, hy + Math.sin(a0) * r0], [hx + Math.cos(a1) * r0, hy + Math.sin(a1) * r0], [hx + Math.cos(a1) * r1, hy + Math.sin(a1) * r1], [hx + Math.cos(a0) * r1, hy + Math.sin(a0) * r1], 0.6, C('#ffd23f')); }
    rect(Mk, hx - 40, hy - 45, hx - 26, hy + 45, 0.6, C('#f1f1ee')); rect(Mk, hx + 26, hy - 45, hx + 40, hy + 45, 0.6, C('#f1f1ee')); rect(Mk, hx - 26, hy - 7, hx + 26, hy + 7, 0.6, C('#f1f1ee'));   // H
    const [fx, fy] = B.flag; poles.push({ x: fx, y: 45, z: fy, sx: 1.4, sy: 90, sz: 1.4, c: '#d8d8d8' }); fg.push({ x: fx + 16, y: 82, z: fy, sx: 30, sy: 18, sz: 0.6, c: '#3a5a2a' });
    for (const [x, y] of B.towers) pools.push({ x, y: 1.5, z: y, sx: 200, sy: 1, sz: 200, c: '#fff3b0' });
    for (let x = B.motor[0]; x <= B.motor[2]; x += 220) lamp(x, B.motor[1] - 30, 60, '#fff1c0', 260);
  }
  if (SPACEM) {
    const S = SPACEM;
    shapeMesh(S.area, 0.15, '#143e36');
    for (const s of [-1, 1]) road(S.crawlerway.map(([x, y]) => [x, y + s * S.cw * 0.28]), S.cw * 0.36, 0.45, '#8a8070');   // the crawlerway: two gravel lanes
    road(S.road, 90, 0.5, '#26222f', '#ffd23f');
    const [lx, ly, lw, lh] = S.lot; rect(R, lx - lw / 2 - 20, ly - lh / 2 - 20, lx + lw / 2 + 20, ly + lh / 2 + 20, 0.4, C('#3a3450'));
    rect(R, S.vab[0] - S.vab[2] / 2 - 60, S.vab[1] - S.vab[3] / 2 - 40, S.vab[0] + S.vab[2] / 2 + 40, S.vab[1] + S.vab[3] / 2 + 40, 0.4, C('#7a786e'));
    for (const [x, y] of S.masts) lamp(x + 20, y, 50, '#fff1c0', 200);
  }
  if (PORTM) {                                                      // crane rails, a yellow safety line and fenders along the quay, floodlight masts
    const P2 = PORTM;
    for (const [[ax, ay], [bx, by]] of P2.quays) {
      const vert = ax === bx;
      for (const o of [50, 210]) { if (vert) rect(Mk, ax - o - 2, ay + 10, ax - o + 2, by - 10, 0.62, C('#9aa0ab')); else rect(Mk, ax + 10, ay - o - 2, bx - 10, ay - o + 2, 0.62, C('#9aa0ab')); }
      if (vert) rect(Mk, ax - 16, ay, ax - 13, by, 0.62, C('#ffd23f')); else rect(Mk, ax, ay - 16, bx, ay - 13, 0.62, C('#ffd23f'));
      for (let t = 30; t < (vert ? by - ay : bx - ax); t += 64) { if (vert) fb.push({ x: ax + 2, y: -2, z: ay + t, sx: 4, sy: 8, sz: 16, c: '#16161a' }); else fb.push({ x: ax + t, y: -2, z: ay + 2, sx: 16, sy: 8, sz: 4, c: '#16161a' }); }
    }
    for (const s of P2.stacks) { const [x0, y0, x1, y1] = s; R.quad([x0 - 6, y0 - 6], [x1 + 6, y0 - 6], [x1 + 6, y1 + 6], [x0 - 6, y1 + 6], 0.4, C('#5a5468')); }
    const masts = [[6720, 12300], [6720, 12900], [6720, 13500], [6720, 14100], [5300, 14560], [6000, 14560], [6700, 14560]];
    for (const [x, y] of masts) { poles.push({ x, y: 45, z: y, sx: 2, sy: 90, sz: 2, c: '#14102a' }); heads.push({ x, y: 90, z: y, sx: 14, sy: 4, sz: 14, c: '#fff3b0' }); pools.push({ x, y: 1.5, z: y, sx: 420, sy: 1, sz: 420, c: '#fff1c0' }); }
    const [px0, py0, px1, py1] = P2.pier; for (let y = py0 + 40; y < py1; y += 60) for (const x of [px0 + 6, px1 - 6]) fc.push({ x, y: 3, z: y, sx: 2.6, sy: 6, sz: 2.6, c: '#2b2e38' });
  }
  if (LUNA) {                                                       // lamps in rows, flower-bed borders, the train's track
    const tr = LUNA.train.concat([LUNA.train[0]]);
    for (let k = 0; k < tr.length - 1; k++) { const [ax, ay] = tr[k], [bx, by] = tr[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1) continue; ribbon(Mk, [tr[k], tr[k + 1]], -9, -7, 0.62, C('#9aa0ab')); ribbon(Mk, [tr[k], tr[k + 1]], 7, 9, 0.62, C('#9aa0ab')); for (let s = 0; s < L; s += 10) { const t = s / L, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; fb.push({ x, y: 0.5, z: y, sx: 3, sy: 0.8, sz: 22, ry: -Math.atan2(by - ay, bx - ax) + Math.PI / 2, c: '#5a3a24' }); } }
    const A = LUNA.area[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of A.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    for (let x = x0 + 120; x < x1; x += 240) for (let y = y0 + 120; y < y1; y += 240) if (inPoly(x, y, A) && !pedBlocked(x, y) && !inLandmark(x, y)) lamp(x, y, 34, pick(['#ff2bd6', '#2bf3ff', '#ffe14a']), 160);
  }
  drawSpeedway(R, Mk, rect, road, lamp, fb);                       // the oval, the pit lane, the drag strip (js/10i)
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true }), markMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  R.mesh(roadMat).frustumCulled = false; Mk.mesh(markMat).frustumCulled = false;
}

/* ---------- moving bits: the barriers' booms ---------- */
let barrierMeshes = null;
function gfxPlaces() {                                            // js/13
  if (!barrierMeshes) {
    barrierMeshes = BARRIERS.map(b => {
      const g = new THREE.Group(), piv = new THREE.Group(), n = 8, seg = b.w / n; g.position.set(b.x - Math.cos(b.ar) * b.w / 2, 0, b.y - Math.sin(b.ar) * b.w / 2); g.rotation.y = -b.ar; g.add(piv);
      const post = new THREE.Mesh(GB, mc('#2b2e38')); post.scale.set(6, 18, 6); post.position.y = 9; g.add(post); piv.position.y = 15;
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(GB, k % 2 ? mc('#f1f1ee') : mBas(0xff3b5c)); m.scale.set(seg, 3, 3); m.position.x = (k + 0.5) * seg; piv.add(m); }
      scene.add(g); return { g, piv };
    });
  }
  BARRIERS.forEach((b, i) => { const o = barrierMeshes[i]; o.piv.rotation.z = b.open * 1.35; o.g.visible = b.broken <= 0 || Math.floor(b.broken * 4) % 2 === 0 && b.broken > 28; });
}
