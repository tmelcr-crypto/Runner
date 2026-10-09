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
function buildCar(c) {                       // parts that never move on their own are merged: one mesh per material
  const t = c.t, L = t.len, Wd = t.wid, g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const body = new THREE.MeshLambertMaterial({ color: c.color }), m = { body, tail: [], bar: [], cabin: null };
  const merged = (key, mat, parts) => { const o = new THREE.Mesh(mergedGeo(c.type + key, parts), mat); tilt.add(o); return o; };
  const wheels = [], wheel = (x, z, r) => wheels.push([GCylZ, r, r, 3.6, x, r, z]), lamp = (x, y, h) => [-1, 1].map(s => [GB, 1.4, h, 5, x, y, s * (Wd / 2 - (c.type === 'truck' ? 5 : 4))]);
  part(g, GCirc, E.shadow, L * 0.62, 1, Wd * 0.64, 0, 1.3, 0);
  if (c.type === 'truck') {
    merged('b', body, [[GB, L * 0.32, 13, Wd, L * 0.34, 9.5, 0]]);
    m.cabin = part(tilt, GB, E.glass, L * 0.1, 6, Wd - 4, L * 0.42, 16, 0);
    part(tilt, GB, E.cargo, L * 0.62, 20, Wd, -L * 0.19, 13, 0);
    for (const x of [L * 0.34, -L * 0.1, -L * 0.34]) for (const s of [-1, 1]) wheel(x, s * (Wd / 2 + 0.4), 5);
    m.tail.push(merged('t', E.tailOff, lamp(-L / 2, 7, 3))); merged('h', E.headL, lamp(L / 2, 8, 3));
  } else if (c.type === 'sports') {
    merged('b', body, [[GB, L, 6.5, Wd, 0, 6, 0], [GB, L * 0.24, 1.2, Wd - 9, -L * 0.06, 14.6, 0], [GB, 3, 1.2, Wd - 2, -L / 2 + 2, 12.5, 0]]);
    m.cabin = part(tilt, GB, E.glass, L * 0.3, 5, Wd - 6, -L * 0.06, 11.7, 0);
    part(tilt, GB, E.white, L * 0.98, 0.5, 4, 0, 9.5, 0);
    for (const x of [L * 0.3, -L * 0.3]) for (const s of [-1, 1]) wheel(x, s * (Wd / 2 + 0.3), 4.4);
    m.tail.push(merged('t', E.tailOff, lamp(-L / 2, 6.5, 2.4))); merged('h', E.headL, lamp(L / 2, 6.5, 2.2));
  } else {
    merged('b', body, [[GB, L, 8, Wd, 0, 7, 0], [GB, L * 0.34, 1.4, Wd - 8, -L * 0.04, 18.6, 0]]);
    m.cabin = part(tilt, GB, E.glass, L * 0.4, 7, Wd - 5, -L * 0.04, 14.5, 0);
    if (c.type === 'police') {
      part(tilt, GB, E.white, L * 0.3, 6.5, Wd + 0.8, -L * 0.04, 7, 0);
      m.bar.push(part(tilt, GB, E.redOff, 4, 2.6, Wd * 0.36, -L * 0.04, 20.2, -Wd * 0.2), part(tilt, GB, E.blueOff, 4, 2.6, Wd * 0.36, -L * 0.04, 20.2, Wd * 0.2));
    }
    for (const x of [L * 0.31, -L * 0.31]) for (const s of [-1, 1]) wheel(x, s * (Wd / 2 + 0.3), 4.6);
    m.tail.push(merged('t', E.tailOff, lamp(-L / 2, 8, 2.6))); merged('h', E.headL, lamp(L / 2, 8, 2.6));
  }
  merged('w', E.tire, wheels);
  { // the driver: a head and shoulders over the roof; only present while someone is at the wheel
    const hy = c.type === 'truck' ? 21 : c.type === 'sports' ? 17.5 : 22.5, hx = c.type === 'truck' ? L * 0.4 : c.type === 'sports' ? -L * 0.05 : -L * 0.02, hz = -Wd * 0.2;
    const dg = new THREE.Group(); dg.position.set(hx, hy, hz); tilt.add(dg);
    part(dg, GB, mc(c.type === 'police' ? 0x2a4aa8 : pick([0x6a8fd9, 0xd96a6a, 0x7acb8a, 0xd9c35a, 0xb8bcc8])), 4.6, 3, 7.4, 0, -1.6, 0);
    part(dg, GSph, mc(pick([0xf2c6a0, 0xd9a07a, 0x9a6a46, 0xffdcbc])), 3.3, 3.3, 3.3, 0.4, 1.4, 0);
    if (c.type === 'police') part(dg, GB, mc(0x1a2a6a), 4.6, 1.6, 5.6, 0.4, 3.2, 0);
    m.drv = dg;
  }
  { const ug = new THREE.Mesh(GP, glowMat(c.color, 0.9)); ug.scale.set(L * 1.5, 1, Wd * 2.1); ug.position.y = 1.4; g.add(ug); m.ug = ug;       // neon underglow
    const hb = new THREE.Mesh(GP, glowMat('#bfeeff', 0.38)); hb.scale.set(100, 1, 50); hb.position.set(L / 2 + 44, 1.45, 0); g.add(hb); m.hb = hb;       // headlight pool
    body.emissive = new THREE.Color(c.color).multiplyScalar(0.22); }
  c.mesh = g; c.tilt = tilt; c.m = m; c.roll = 0; c.baseCol = new THREE.Color(c.color); c.tailOn = false; c.dead3 = false; c.hpShown = -1; scene.add(g);
}
const _dark = new THREE.Color(0x1b1b1f), _tmp = new THREE.Color();
function syncCar(c, time, dt) {
  if (!c.mesh) buildCar(c); track(c);
  const gy = groundH(c.x, c.y); c.gy = c.gy === undefined ? gy : c.gy + (gy - c.gy) * Math.min(1, dt * 14);
  if (c.sunk) { c.mesh.visible = c.sinkT < 3; c.mesh.position.set(c.x, c.gy - Math.min(40, c.sinkT * c.sinkT * 9 + c.sinkT * 4), c.y); c.mesh.rotation.y = -c.ang; c.tilt.rotation.x = Math.min(0.5, c.sinkT * 0.3); return; }
  c.mesh.position.set(c.x, c.gy, c.y); c.mesh.rotation.y = -c.ang;
  const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang), want = -clamp(c.av * vf / 450, -0.12, 0.12);
  c.roll += (want - c.roll) * Math.min(1, dt * 8); c.tilt.rotation.x = c.roll;
  const f = c.hp / c.maxhp, m = c.m;
  m.ug.visible = !c.dead; m.hb.visible = !!c.driver && !c.dead;
  m.drv.visible = !!c.driver && !c.dead;
  if (c.dead && !c.dead3) { c.dead3 = true; m.body.emissive.setHex(0); m.body.color.copy(_dark); if (m.cabin) m.cabin.material = E.glassDead; }
  else if (!c.dead && Math.abs(f - c.hpShown) > 0.01) { c.hpShown = f; m.body.color.copy(c.baseCol).lerp(_tmp.set(0x1b1b1f), (1 - f) * 0.55); }
  const brake = !c.dead && c.driver && c.thr < 0; if (brake !== c.tailOn) { c.tailOn = brake; for (const l of m.tail) l.material = brake ? E.tailOn : E.tailOff; }
  if (m.bar.length) { const on = !c.dead && (c.driver === 'cop' || c.driver === 'ai'), ph = Math.floor(time * 6 + c.sirenT) % 2 === 0; m.bar[0].material = on && ph ? E.redOn : E.redOff; m.bar[1].material = on && !ph ? E.blueOn : E.blueOff; }
}

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
  return o;
}
function syncPerson(p, kind, time, dt) {
  if (!p.mesh) { const o = buildPerson(kind, kind === 'officer' ? 0x2a4aa8 : p.shirt, p.skin || '#f2c6a0'); p.mesh = o.g; p.pm = o; scene.add(o.g); p.h3 = 0; }
  track(p); const o = p.pm, g = p.mesh;
  const gy = groundH(p.x, p.y); p.gy = p.gy === undefined ? gy : p.gy + (gy - p.gy) * Math.min(1, dt * 12);
  g.position.set(p.x, p.gy, p.y);
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  if (kind === 'ped' && sp > 8) p.h3 = Math.atan2(p.vy, p.vx); else if (kind !== 'ped') p.h3 = p.ang || 0;
  g.rotation.y = -p.h3;
  if (p.dead) {
    o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; for (const l of o.legs) l.rotation.z = 0; for (const a of o.arms) a.rotation.z = 0;
    g.scale.setScalar(clamp((26 - p.deadT) / 6, 0.01, 1));
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
  P3.mesh.position.set(P.x, P3.gy - Math.min(8, Math.max(0, -shoreDist(P.x, P.y)) * 0.32), P.y); P3.mesh.rotation.y = -P.ang;
  const sp = Math.hypot(P.vx, P.vy), k = Math.sin(P.bob * 3) * Math.min(1, sp / 90) * 0.8;
  o.legs[0].rotation.z = k; o.legs[1].rotation.z = -k; o.arms[0].rotation.z = -k * 0.5; o.arms[1].rotation.z = 0; o.tilt.position.y = Math.abs(k) * 0.8;
  o.torso.material = P.hurtT > 0 ? P3.red : P3.yel;
  if (P.busted) { o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; } else o.tilt.rotation.z = 0;      // knocked flat
  const mg = P.weapon === 1; o.gun.scale.x = mg ? 18 : 10; o.gun.position.x = mg ? 12 : 8;
  P3.flash.visible = P.flash > 0; P3.flash.position.set(mg ? 23 : 16, 14, 3.6);
  flashLight.intensity = P.flash > 0 ? 1.6 : 0; flashLight.position.set(P.x + Math.cos(P.ang) * 20, P3.gy + 16, P.y + Math.sin(P.ang) * 20);
}
const PICK_COL = { health: 0xff6b86, pistol: 0x3fe0ff, mg: 0x3fe0ff, cash: 0x58e08a };
function syncPickup(p, time) {
  if (!p.mesh) {
    const g = new THREE.Group(), it = new THREE.Group(); g.add(it);
    if (p.type === 'health') { part(it, GB, E.white, 10, 10, 10, 0, 0, 0); part(it, GB, mBas(0xe0364f), 6.5, 1.2, 2.2, 0, 5.4, 0); part(it, GB, mBas(0xe0364f), 2.2, 1.2, 6.5, 0, 5.4, 0); }
    else if (p.type === 'cash') { part(it, GB, mc(0x58b36b), 13, 3.5, 8, 0, 0, 0); part(it, GB, mc(0xd6f5dc), 9, 0.6, 5, 0, 1.9, 0); }
    else { part(it, GB, mc(0x17304a), 11, 8, 9, 0, 0, 0); for (let k = 0; k < (p.type === 'mg' ? 3 : 1); k++) part(it, GB, mBas(0x3fe0ff), 1.8, 1, 5, (p.type === 'mg' ? (k - 1) * 3 : 0), 4.4, 0); }
    part(g, GCyl, new THREE.MeshBasicMaterial({ color: PICK_COL[p.type], transparent: true, opacity: 0.2, depthWrite: false }), 2.6, 60, 2.6, 0, 30, 0);
    g.userData.it = it; p.mesh = g; scene.add(g);
  }
  track(p); const it = p.mesh.userData.it;
  p.mesh.position.set(p.x, SIDE_H, p.y); it.position.y = 11 + Math.sin(p.bob) * 2; it.rotation.y = time * 1.6;
}

