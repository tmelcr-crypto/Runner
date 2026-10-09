'use strict';
/* ---------- 7b. DYNAMIC MESHES: cars, people, pickups ---------- */
let frameId = 0, registry = [];
function track(o) { if (o._reg !== frameId) { o._reg = frameId; } if (!o._in) { o._in = true; registry.push(o); } }
function clearDynamic() { for (const o of registry) { if (o.mesh) scene.remove(o.mesh); if (o.m && o.m.body) o.m.body.dispose(); o.mesh = null; o._in = false; } registry = []; }
function sweepDynamic() {
  for (let k = registry.length - 1; k >= 0; k--) {
    const o = registry[k];
    if (o._reg !== frameId) { if (o.mesh) scene.remove(o.mesh); if (o.m && o.m.body) o.m.body.dispose(); o.mesh = null; o._in = false; registry.splice(k, 1); }
  }
}
function part(parent, geo, mat, sx, sy, sz, x, y, z) { const o = new THREE.Mesh(geo, mat); o.scale.set(sx, sy, sz); o.position.set(x, y, z); parent.add(o); return o; }

const _cg = {};
function mergedGeo(key, parts) {            // scaled, moved copies of shared geometry as one geometry; cached, so every car of a type shares it
  if (_cg[key]) return _cg[key];
  const pos = [], nor = [], uv = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), t = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [geo, sx, sy, sz, x, y, z] of parts) {
    const g = geo.toNonIndexed(); g.applyMatrix4(m4.compose(t.set(x, y, z), q, sc.set(sx, sy, sz)));
    for (const v of g.attributes.position.array) pos.push(v); for (const v of g.attributes.normal.array) nor.push(v); for (const v of g.attributes.uv.array) uv.push(v); g.dispose();
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere(); return (_cg[key] = g);
}
/* Vehicle models, one per body (js/01c). Drivers sit inside, under the roof, seen through tinted glass; only the bike's rider is out in the open. */
const GLASS = new THREE.MeshLambertMaterial({ color: 0x2a3a5c, transparent: true, opacity: 0.55 });
const BAR = { police: [E.redOn, E.redOff, E.blueOn, E.blueOff], ambulance: [E.redOn, E.redOff, mBas(0xffffff), mBas(0x4a4a52)],
  fire: [E.redOn, E.redOff, mBas(0xffb02e), mBas(0x5a3f1f)], trash: [mBas(0xffb02e), mBas(0x5a3f1f), mBas(0xffb02e), mBas(0x5a3f1f)] };
const PLAYER_SHIRT = mc(0xffd23f);
function buildCar(c) {                       // parts that never move on their own are merged: one mesh per material
  const t = c.t, L = t.len, Wd = t.wid, B = t.body, g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const body = new THREE.MeshLambertMaterial({ color: c.color }), m = { body, tail: [], bar: [], barM: null, cabin: null, drv: null, rider: null };
  const merged = (key, mat, parts) => { const o = new THREE.Mesh(mergedGeo(c.type + key, parts), mat); tilt.add(o); return o; };
  const wheels = [], wheel = (x, z, r, w) => wheels.push([GCylZ, r, r, w || 3.6, x, r, z]), axle = (x, r) => { for (const s of [-1, 1]) wheel(x, s * (Wd / 2 + 0.3), r); };
  const lamps = (yT, hT, yH, hH, inset) => { const lp = (x, y, h) => [-1, 1].map(s => [GB, 1.4, h, 5, x, y, s * (Wd / 2 - (inset || 4))]);
    m.tail.push(merged('t', E.tailOff, lp(-L / 2, yT, hT))); merged('h', E.headL, lp(L / 2, yH, hH)); };
  const bar = (x, y, kind) => { m.barM = BAR[kind]; m.bar.push(part(tilt, GB, m.barM[1], 4, 2.6, Wd * 0.36, x, y, -Wd * 0.2), part(tilt, GB, m.barM[3], 4, 2.6, Wd * 0.36, x, y, Wd * 0.2)); };
  const seat = (x, roofY, sc) => {           // a driver's head and shoulders, the top of the head just under the roof
    const s = sc || 1, cop = t.cop, dg = new THREE.Group(); dg.position.set(x, roofY - (cop ? 4.8 : 4.4) * s - 0.4, -Wd * 0.2); dg.scale.setScalar(s); tilt.add(dg);
    part(dg, GB, mc(cop ? 0x2a4aa8 : pick([0x6a8fd9, 0xd96a6a, 0x7acb8a, 0xd9c35a, 0xb8bcc8])), 4.2, 3, 6.6, 0, -1.4, 0);
    part(dg, GSph, mc(pick([0xf2c6a0, 0xd9a07a, 0x9a6a46, 0xffdcbc])), 2.8, 2.8, 2.8, 0.4, 1.6, 0);
    if (cop) part(dg, GB, mc(0x1a2a6a), 4.2, 1.6, 5.2, 0.4, 4, 0);
    m.drv = dg;
  };
  part(g, GCirc, E.shadow, L * 0.62, 1, Wd * 0.64, 0, 1.3, 0);
  if (B === 'truck') {                       // cab with a glass band and a roof, cargo box behind
    merged('b', body, [[GB, L * 0.3, 12, Wd, L * 0.35, 9, 0], [GB, L * 0.3, 1.6, Wd, L * 0.35, 21.8, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.26, 6, Wd - 2, L * 0.36, 18, 0);
    part(tilt, GB, E.cargo, L * 0.62, 20, Wd, -L * 0.19, 13, 0);
    for (const x of [L * 0.34, -L * 0.1, -L * 0.34]) axle(x, 5);
    lamps(7, 3, 8, 3, 5); seat(L * 0.38, 21);
  } else if (B === 'sports') {
    merged('b', body, [[GB, L, 6.5, Wd, 0, 6, 0], [GB, L * 0.24, 1.2, Wd - 9, -L * 0.06, 14.6, 0], [GB, 3, 1.2, Wd - 2, -L / 2 + 2, 12.5, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.3, 5, Wd - 6, -L * 0.06, 11.7, 0);
    part(tilt, GB, E.white, L * 0.98, 0.5, 4, 0, 9.5, 0);
    for (const x of [L * 0.3, -L * 0.3]) axle(x, 4.4);
    lamps(6.5, 2.4, 6.5, 2.2); seat(-L * 0.06, 14, 0.85);
  } else if (B === 'estate') {               // a long roof down to the tailgate, roof rails
    merged('b', body, [[GB, L, 8, Wd, 0, 7, 0], [GB, L * 0.58, 1.4, Wd - 8, -L * 0.13, 18.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.62, 7, Wd - 5, -L * 0.12, 14.5, 0);
    merged('r', E.black, [[GB, L * 0.5, 0.8, 1, -L * 0.14, 19.8, Wd / 2 - 5], [GB, L * 0.5, 0.8, 1, -L * 0.14, 19.8, -(Wd / 2 - 5)]]);
    for (const x of [L * 0.32, -L * 0.32]) axle(x, 4.8);
    lamps(8, 2.6, 8, 2.6); seat(L * 0.05, 17.9);
  } else if (B === 'pickup') {               // a raised cab and an open bed with low walls
    merged('b', body, [[GB, L, 8, Wd, 0, 8, 0], [GB, L * 0.24, 1.4, Wd - 6, L * 0.12, 19.7, 0], [GB, L * 0.44, 4, 1.4, -L * 0.27, 14, Wd / 2 - 0.7], [GB, L * 0.44, 4, 1.4, -L * 0.27, 14, -(Wd / 2 - 0.7)],
      [GB, 1.4, 4, Wd, -L / 2 + 0.7, 14, 0], [GB, 1.4, 4, Wd, -L * 0.05, 14, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.24, 7, Wd - 5, L * 0.12, 15.5, 0);
    part(tilt, GB, E.black, L * 0.42, 0.6, Wd - 3, -L * 0.27, 12.3, 0);
    for (const x of [L * 0.32, -L * 0.32]) axle(x, 5.6);
    lamps(9, 2.6, 9, 2.6); seat(L * 0.14, 19);
  } else if (B === 'limo') {                 // a long, low cabin and a chrome line
    merged('b', body, [[GB, L, 7.5, Wd, 0, 6.75, 0], [GB, L * 0.6, 1.3, Wd - 7, -L * 0.03, 17.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.64, 6.5, Wd - 5, -L * 0.03, 13.75, 0);
    part(tilt, GB, E.white, L * 0.98, 0.6, Wd + 0.3, 0, 9, 0);
    for (const x of [L * 0.38, -L * 0.38]) axle(x, 4.6);
    lamps(7.5, 2.4, 7.5, 2.4); seat(L * 0.22, 16.95);
  } else if (B === 'bus') {                  // a tall box with a window band, a destination sign and a roof unit
    merged('b', body, [[GB, L, 26, Wd, 0, 16, 0]]);
    m.cabin = merged('g', E.glass, [[GB, L * 0.78, 8, 0.6, -L * 0.06, 21, Wd / 2 + 0.05], [GB, L * 0.78, 8, 0.6, -L * 0.06, 21, -(Wd / 2 + 0.05)], [GB, 0.8, 14, Wd - 4, L / 2 + 0.1, 18, 0]]);
    merged('w2', E.white, [[GB, L + 0.2, 2, Wd + 0.3, 0, 12, 0], [GB, L * 0.22, 3, Wd * 0.55, -L * 0.1, 30.5, 0]]);
    part(tilt, GB, mBas(0xffb02e), 0.8, 2.5, Wd - 8, L / 2 + 0.2, 27, 0);
    axle(L * 0.3, 5.5); axle(-L * 0.32, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'trash') {                // white cab, the compactor body with ribs, the hopper at the back, an amber beacon
    merged('b', body, [[GB, L * 0.66, 21, Wd, -L * 0.165, 13.5, 0]]);
    merged('c', E.white, [[GB, L * 0.27, 15, Wd, L * 0.365, 10.5, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 13.5, 0], [GB, L * 0.12, 5, Wd + 0.2, L * 0.38, 13.5, 0]]);
    merged('k', E.black, [[GB, 1.6, 21.6, Wd + 0.6, -L * 0.05, 13.5, 0], [GB, 1.6, 21.6, Wd + 0.6, -L * 0.2, 13.5, 0], [GB, 1.6, 21.6, Wd + 0.6, -L * 0.35, 13.5, 0], [GB, 3, 14, Wd - 2, -L / 2 - 1, 10, 0]]);
    bar(L * 0.4, 19, 'trash');
    axle(L * 0.34, 5.5); axle(-L * 0.18, 5.5); axle(-L * 0.34, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'ambulance') {            // a low cab and a tall box with a red stripe, a cross on the roof
    merged('b', body, [[GB, L * 0.26, 12, Wd - 2, L * 0.36, 9, 0], [GB, L * 0.72, 24, Wd, -L * 0.13, 15, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 5, Wd - 6, L * 0.49, 12.5, 0]]);
    merged('s', mc(0xe0364f), [[GB, L * 0.73, 2.5, Wd + 0.3, -L * 0.13, 13, 0], [GB, L * 0.27, 2.5, Wd - 1.7, L * 0.36, 10, 0], [GB, 8, 0.6, 2.5, -L * 0.13, 27.4, 0], [GB, 2.5, 0.6, 8, -L * 0.13, 27.4, 0]]);
    bar(L * 0.2, 28.2, 'ambulance');
    axle(L * 0.32, 5); axle(-L * 0.3, 5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'fire') {                 // red cab and body, a white line, the ladder on top with its turntable
    merged('b', body, [[GB, L * 0.25, 16, Wd, L * 0.375, 11, 0], [GB, L * 0.74, 14, Wd, -L * 0.12, 10, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 14.5, 0], [GB, L * 0.14, 5, Wd + 0.2, L * 0.4, 14.5, 0]]);
    part(tilt, GB, E.white, L * 0.99, 1.6, Wd + 0.3, 0, 8, 0);
    const lad = [[GB, L * 0.8, 1.2, 1.2, -L * 0.08, 19.5, 6], [GB, L * 0.8, 1.2, 1.2, -L * 0.08, 19.5, -6]];
    for (let x = -L * 0.46; x < L * 0.3; x += 6) lad.push([GB, 0.8, 0.8, 12, x, 19.5, 0]);
    merged('l', mc(0xc8ccd6), lad); part(tilt, GB, mc(0x8a8f9c), 10, 2.5, 12, -L * 0.38, 18.2, 0);
    bar(L * 0.38, 20.2, 'fire');
    axle(L * 0.34, 5.5); axle(-L * 0.2, 5.5); axle(-L * 0.36, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'tank') {                 // tracks, a low hull, the turret and its long gun
    merged('b', body, [[GB, L * 0.9, 7, Wd - 12, 0, 9.5, 0], [GB, L * 0.12, 4, Wd - 12, L * 0.45, 10, 0], [GB, L * 0.42, 6.5, Wd * 0.58, -L * 0.06, 16.25, 0]]);
    merged('k', E.tire, [[GB, L, 8, 7, 0, 5, Wd / 2 - 3.5], [GB, L, 8, 7, 0, 5, -(Wd / 2 - 3.5)]]);
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) wheels.push([GCylZ, 3, 3, 1, -L * 0.4 + k * L * 0.2, 3.5, s * (Wd / 2 + 0.2)]);
    const gun = part(tilt, GCyl, mc(0x3a4428), 1.6, L * 0.6, 1.6, L * 0.45, 16.5, 0); gun.rotation.z = -Math.PI / 2;
    part(tilt, GB, mc(0x2b3320), 3, 2.6, 2.6, L * 0.75, 16.5, 0); part(tilt, GB, mc(0x2b3320), 5, 1, 5, -L * 0.12, 19.9, 0);
    merged('h', E.headL, [[GB, 1, 2, 3, L * 0.5, 11, Wd / 2 - 9], [GB, 1, 2, 3, L * 0.5, 11, -(Wd / 2 - 9)]]);
  } else if (B === 'apc') {                  // an armoured hull with a sloped nose, slit windows, a light bar
    merged('b', body, [[GB, L, 12, Wd, 0, 9, 0], [GB, L * 0.78, 8, Wd - 4, -L * 0.06, 19, 0]]);
    const nose = part(tilt, GB, body, L * 0.18, 7, Wd - 1, L * 0.41, 15.5, 0); nose.rotation.z = 0.6;
    m.cabin = merged('g', E.glass, [[GB, L * 0.05, 2.2, Wd - 8, L * 0.33, 20, 0], [GB, L * 0.2, 2, Wd - 3.6, L * 0.12, 20.5, 0]]);
    part(tilt, GB, E.white, L * 0.9, 2.2, Wd + 0.3, 0, 11, 0);
    bar(-L * 0.1, 24.2, 'police');
    for (const x of [L * 0.36, L * 0.12, -L * 0.12, -L * 0.36]) axle(x, 5.5);
    lamps(9, 2.6, 9, 2.6, 5);
  } else if (B === 'bike') {                 // a motorbike: wheels, engine, tank, seat, fairing - and its rider, out in the open
    merged('b', body, [[GB, L * 0.22, 4, 6, L * 0.08, 13.5, 0], [GB, L * 0.16, 7, 7.5, L * 0.3, 13, 0], [GB, L * 0.14, 3, 5, -L * 0.33, 13.5, 0]]);
    merged('k', E.black, [[GB, L * 0.4, 6, 5, 0, 9, 0], [GB, L * 0.25, 2, 5.5, -L * 0.15, 13.2, 0], [GB, 1.5, 1.2, 13, L * 0.24, 17, 0]]);
    part(tilt, GB, mc(0xb8bcc8), L * 0.3, 1.6, 1.6, -L * 0.15, 7, 3.5);
    for (const x of [L * 0.34, -L * 0.34]) wheel(x, 0, 6, 2.4);
    m.tail.push(part(tilt, GB, E.tailOff, 1, 1.6, 3, -L / 2, 14, 0)); part(tilt, GB, E.headL, 1, 2.4, 3, L / 2 - 1, 14, 0);
    const rg = new THREE.Group(); rg.position.set(-L * 0.08, 0, 0); tilt.add(rg);
    m.rider = part(rg, GB, mc(pick([0x6a8fd9, 0xd96a6a, 0x7acb8a, 0x2a2d3a])), 5.4, 9, 7.4, 0, 20.5, 0); m.rider.rotation.z = -0.5; m.riderM = m.rider.material;
    part(rg, GSph, mc(pick([0x14161d, 0xe0364f, 0xf1f1ee, 0x2bf3ff])), 3.3, 3.3, 3.3, 3.4, 26.4, 0);
    for (const s of [-1, 1]) { const a = part(rg, GB, mc(0x2a2d3a), 9, 2.2, 2.2, 5, 20.5, s * 4.6); a.rotation.z = -0.25; const lg = part(rg, GB, mc(0x2a2d3a), 8, 2.6, 2.8, 2, 13.5, s * 4.2); lg.rotation.z = 0.5; }
    m.drv = rg;
  } else {                                   // sedan, police (and any body without a model yet)
    merged('b', body, [[GB, L, 8, Wd, 0, 7, 0], [GB, L * 0.34, 1.4, Wd - 8, -L * 0.04, 18.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.4, 7, Wd - 5, -L * 0.04, 14.5, 0);
    if (B === 'police') { part(tilt, GB, E.white, L * 0.3, 6.5, Wd + 0.8, -L * 0.04, 7, 0); bar(-L * 0.04, 20.2, 'police'); }
    for (const x of [L * 0.31, -L * 0.31]) axle(x, 4.6);
    lamps(8, 2.6, 8, 2.6); seat(L * 0.02, 17.9);
  }
  merged('w', E.tire, wheels);
  { const ug = new THREE.Mesh(GP, glowMat(c.color, 0.9)); ug.scale.set(L * 1.5, 1, Wd * 2.1); ug.position.y = 1.4; g.add(ug); m.ug = ug;       // neon underglow
    const hb = new THREE.Mesh(GP, glowMat('#bfeeff', 0.38, true)); hb.scale.set(100, 1, 50); hb.position.set(L / 2 + 44, 1.45, 0); g.add(hb); m.hb = hb;       // headlight pool
    body.emissive = new THREE.Color(c.color).multiplyScalar(0.22); }
  c.mesh = g; c.tilt = tilt; c.m = m; c.roll = 0; c.baseCol = new THREE.Color(c.color); c.tailOn = false; c.dead3 = false; c.hpShown = -1; scene.add(g);
}
const _dark = new THREE.Color(0x1b1b1f), _tmp = new THREE.Color();
function syncCar(c, time, dt) {
  if (!c.mesh) buildCar(c); track(c);
  const gy = groundH(c.x, c.y); c.gy = c.gy === undefined ? gy : c.gy + (gy - c.gy) * Math.min(1, dt * 14);
  if (c.sunk) { c.mesh.visible = c.sinkT < 3; c.mesh.position.set(c.x, c.gy - Math.min(40, c.sinkT * c.sinkT * 9 + c.sinkT * 4), c.y); c.mesh.rotation.y = -c.ang; c.tilt.rotation.x = Math.min(0.5, c.sinkT * 0.3); return; }
  c.mesh.position.set(c.x, c.gy + (c.air || 0), c.y); c.mesh.rotation.y = -c.ang;
  const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang), bike = c.t.body === 'bike';
  const want = c.air > 0 ? clamp(c.av * 0.07, -0.6, 0.6) : bike ? (c.driver ? clamp(c.av * vf / 260, -0.55, 0.55) : 0.22) : -clamp(c.av * vf / 450, -0.12, 0.12);   // rolls a little (in the air: a lot); a bike leans into the bend, parked it stands on its stand
  c.roll += (want - c.roll) * Math.min(1, dt * 8); c.tilt.rotation.x = c.roll;
  const f = c.hp / c.maxhp, m = c.m;
  m.ug.visible = !c.dead; m.hb.visible = !!c.driver && !c.dead;
  if (m.drv) m.drv.visible = !!c.driver && !c.dead;
  if (m.rider) m.rider.material = c.driver === 'player' ? PLAYER_SHIRT : m.riderM;   // you on the bike: in your yellow
  if (c.dead && !c.dead3) { c.dead3 = true; m.body.emissive.setHex(0); m.body.color.copy(_dark); if (m.cabin) m.cabin.material = E.glassDead; }
  else if (!c.dead && Math.abs(f - c.hpShown) > 0.01) { c.hpShown = f; m.body.color.copy(c.baseCol).lerp(_tmp.set(0x1b1b1f), (1 - f) * 0.55); }
  const brake = !c.dead && c.driver && c.thr < 0; if (brake !== c.tailOn) { c.tailOn = brake; for (const l of m.tail) l.material = brake ? E.tailOn : E.tailOff; }
  if (m.bar.length) {                       // light bars: police while crewed, ambulance and fire engine on a call, the trash truck's beacon at a bin
    const on = !c.dead && (c.t.cop ? c.driver === 'cop' || c.driver === 'ai' : c.t.job === 'trash' ? c.stopT > 0 : !!c.task), ph = Math.floor(time * 6 + c.sirenT) % 2 === 0, M = m.barM;
    m.bar[0].material = on && ph ? M[0] : M[1]; m.bar[1].material = on && !ph ? M[2] : M[3];
  }
}

const GUmb = new THREE.ConeGeometry(1, 1, 8);
function buildPerson(kind, shirt, skin) {
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const sm = mc(shirt), km = mc(skin), pm = mc(kind === 'officer' ? 0x1a2447 : 0x2a2d3a), o = { g, tilt, legs: [], arms: [], torso: null };
  part(g, GCirc, E.shadow, 8, 1, 8, 0, 1.3, 0);
  o.torso = part(tilt, GB, sm, 5, 11, 9.4, 0, 14.5, 0);
  for (const s of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.set(0, 9, s * 2.5); part(lp, GB, pm, 3.2, 9, 3.4, 0, -4.5, 0); tilt.add(lp); o.legs.push(lp);
    const ap = new THREE.Group(); ap.position.set(0, 19.5, s * 5.8); part(ap, GB, sm, 3, 8.5, 2.8, 0, -4, 0); tilt.add(ap); o.arms.push(ap);
  }
  part(tilt, GSph, km, 3.9, 3.9, 3.9, 0.5, 23, 0);
  if (kind === 'officer') { part(tilt, GB, mc(0x1a2a6a), 5.4, 2.2, 7.6, 0.4, 26, 0); part(tilt, GB, mc(0x111111), 2.4, 0.8, 6, 3.2, 25, 0); }
  else part(tilt, GSph, mc(kind === 'player' ? 0x3a2a1a : 0x2a2018), 4.1, 3.3, 4.1, -0.4, 24, 0);
  if (kind !== 'ped') { o.gun = part(tilt, GB, E.black, kind === 'officer' ? 9 : 10, 2.4, 2.4, 8, 14, 3.6); }
  else {                                     // an umbrella, up when it rains
    const u = new THREE.Group(); u.position.set(1, 0, 3.5); u.visible = false; tilt.add(u);
    part(u, GCyl, E.black, 0.5, 16, 0.5, 0, 26, 0); part(u, GUmb, mc(pick([0xe0364f, 0x2a4aa8, 0x14161d, 0xffd23f, 0x3dffa6, 0xff2bd6])), 11, 4, 11, 0, 35, 0); o.umb = u;
  }
  return o;
}
function syncPerson(p, kind, time, dt) {
  if (!p.mesh) { const o = buildPerson(kind, kind === 'officer' ? 0x2a4aa8 : p.shirt, p.skin || '#f2c6a0'); p.mesh = o.g; p.pm = o; scene.add(o.g); p.h3 = 0; }
  track(p); const o = p.pm, g = p.mesh;
  if (o.umb) { const up = p.umb && !p.dead && SKY.rain > 0.25 && p.state !== 'flee'; if (o.umb.visible !== up) o.umb.visible = up; }
  const gy = groundH(p.x, p.y); p.gy = p.gy === undefined ? gy : p.gy + (gy - p.gy) * Math.min(1, dt * 12);
  g.position.set(p.x, p.gy + (p.air || 0), p.y);
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  if (kind === 'ped' && sp > 8) p.h3 = Math.atan2(p.vy, p.vx); else if (kind !== 'ped') p.h3 = p.ang || 0;
  g.rotation.y = -p.h3;
  if (p.dead) {
    o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; for (const l of o.legs) l.rotation.z = 0; for (const a of o.arms) a.rotation.z = 0;
    g.scale.setScalar(clamp((bodyTime(p) + 1 - p.deadT) / 6, 0.01, 1));   // shrinks away at the end (later while an ambulance is coming)
  } else {
    const k = Math.sin(p.bob * 3) * Math.min(1, sp / 60) * 0.8;
    o.legs[0].rotation.z = k; o.legs[1].rotation.z = -k; o.arms[0].rotation.z = -k * 0.8; o.arms[1].rotation.z = k * 0.8;
    o.tilt.position.y = Math.abs(k) * 0.8;
    if (kind === 'ped' && p.state === 'flee') { o.arms[0].rotation.z = -2.4; o.arms[1].rotation.z = -2.4; }
  }
}
const P3 = { mesh: null, pm: null, arrow: null, flash: null, yel: mc(0xffd23f), red: mc(0xff6b86), mgOn: false };
function syncPlayer(time, dt) {
  if (!P3.mesh) {
    const o = buildPerson('player', '#ffd23f', '#f2c6a0'); P3.mesh = o.g; P3.pm = o; scene.add(o.g);
    P3.arrow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 8, 3).rotateZ(-Math.PI / 2), mBas(0xffffff)); P3.arrow.position.set(30, 5, 0); o.g.add(P3.arrow);
    P3.flash = new THREE.Mesh(GSph, mBas(0xfff0a0)); P3.flash.scale.set(4.5, 4.5, 4.5); o.g.add(P3.flash);
    P3.gy = 0; { const pg = new THREE.Mesh(GP, glowMat('#2bf3ff', 0.85)); pg.scale.set(52, 1, 52); pg.position.y = 1.4; o.g.add(pg); }
  }
  const vis = !P.car && !(P.act && P.act.occ) && state !== 'over'; P3.mesh.visible = vis; if (!vis) return;
  const o = P3.pm, gy = groundH(P.x, P.y); P3.gy += (gy - P3.gy) * Math.min(1, dt * 12);
  P3.mesh.position.set(P.x, P3.gy + (P.air || 0) - Math.min(8, Math.max(0, -shoreDist(P.x, P.y)) * 0.32), P.y); P3.mesh.rotation.y = -P.ang;
  const sp = Math.hypot(P.vx, P.vy), k = Math.sin(P.bob * 3) * Math.min(1, sp / 90) * 0.8;
  o.legs[0].rotation.z = k; o.legs[1].rotation.z = -k; o.arms[0].rotation.z = -k * 0.5; o.arms[1].rotation.z = 0; o.tilt.position.y = Math.abs(k) * 0.8;
  o.torso.material = P.hurtT > 0 ? P3.red : P3.yel;
  if (P.busted) { o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; } else o.tilt.rotation.z = 0;      // knocked flat
  const gl = [10, 18, 28, 26][P.weapon] || 10, gt = P.weapon === 3 ? 4.6 : 2.4; o.gun.scale.set(gl, gt, gt); o.gun.position.x = 3 + gl / 2;   // pistol, machine gun, rifle, rocket tube
  P3.flash.visible = P.flash > 0; P3.flash.position.set(6 + gl, 14, 3.6);
  flashLight.intensity = P.flash > 0 ? 1.6 : 0; flashLight.position.set(P.x + Math.cos(P.ang) * 20, P3.gy + 16, P.y + Math.sin(P.ang) * 20);
}
const PICK_COL = { health: 0xff6b86, pistol: 0x3fe0ff, mg: 0x3fe0ff, sniper: 0xffe14a, rocket: 0xff9d2b, cash: 0x58e08a };
function syncPickup(p, time) {
  if (!p.mesh) {
    const g = new THREE.Group(), it = new THREE.Group(); g.add(it);
    if (p.type === 'health') { part(it, GB, E.white, 10, 10, 10, 0, 0, 0); part(it, GB, mBas(0xe0364f), 6.5, 1.2, 2.2, 0, 5.4, 0); part(it, GB, mBas(0xe0364f), 2.2, 1.2, 6.5, 0, 5.4, 0); }
    else if (p.type === 'cash') { part(it, GB, mc(0x58b36b), 13, 3.5, 8, 0, 0, 0); part(it, GB, mc(0xd6f5dc), 9, 0.6, 5, 0, 1.9, 0); }
    else if (p.type === 'rocket') { part(it, GB, mc(0x3d4528), 18, 8, 10, 0, 0, 0); part(it, GB, mBas(0xff9d2b), 18.4, 1.6, 10.4, 0, 1, 0); part(it, GB, mBas(0xff9d2b), 2, 1, 8, -5, 4.5, 0); part(it, GB, mBas(0xff9d2b), 2, 1, 8, 5, 4.5, 0); }   // a crate with orange bands
    else if (p.type === 'sniper') { part(it, GB, mc(0x2a2410), 18, 6, 7, 0, 0, 0); part(it, GB, mBas(0xffe14a), 14, 1, 1.4, 0, 3.4, 0); }   // a long case with a yellow stripe
    else { part(it, GB, mc(0x17304a), 11, 8, 9, 0, 0, 0); for (let k = 0; k < (p.type === 'mg' ? 3 : 1); k++) part(it, GB, mBas(0x3fe0ff), 1.8, 1, 5, (p.type === 'mg' ? (k - 1) * 3 : 0), 4.4, 0); }
    part(g, GCyl, new THREE.MeshBasicMaterial({ color: PICK_COL[p.type] || 0x3fe0ff, transparent: true, opacity: 0.2, depthWrite: false }), 2.6, 60, 2.6, 0, 30, 0);
    g.userData.it = it; p.mesh = g; scene.add(g);
  }
  track(p); const it = p.mesh.userData.it;
  p.mesh.position.set(p.x, SIDE_H + (p.air || 0), p.y); it.position.y = 11 + Math.sin(p.bob) * 2; it.rotation.y = time * 1.6;
}

