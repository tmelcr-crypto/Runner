'use strict';
/* ---------- 7c3. BLASTS ----------
   An explosion - a rocket, or a car blowing up - shows a fireball that swells and rises, a burst of flame, flying debris and embers,
   a shock ring and a column of dark smoke that rolls up and hangs in the air for a few seconds. It throws everything it does not
   destroy: cars hop and spin, people go flying, dumpsters, crates, bags, bins, barrels, benches, hydrants and newspaper boxes tumble
   through the air and stay where they land (a new game puts them back). */

/* ---------- props that can be thrown: drawn as instances in the merged street-furniture meshes, registered while the city is built ---------- */
const THROW = [], TGRID = new Map(), TG = 240, FLY = [], KNOCK = [];
const tkey = (x, y) => Math.floor((x + SEA) / TG) * 1024 + Math.floor((y + SEA) / TG);
const partMark = lists => lists.map(l => l[0].length);             // lists: [[array of instance items, geometry, unlit?], ...]
function partsSince(lists, mark) { const out = []; lists.forEach(([arr, geo, basic], i) => { for (let k = mark[i]; k < arr.length; k++) out.push({ it: arr[k], geo, basic }); }); return out; }
function registerThrow(x, y, parts, solid, mass) {
  if (!parts.length) return;
  const o = { x, y, hx: x, hy: y, parts, solid, solid0: solid, mass: mass || 1, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, roll: 0, wy: 0, wr: 0, flying: false, gone: false, group: null, key: tkey(x, y) };
  o.hc = parts.reduce((a, p) => a + p.it.y, 0) / parts.length;      // turns about its middle, not its foot
  THROW.push(o); let l = TGRID.get(o.key); if (!l) TGRID.set(o.key, l = []); l.push(o);
}
const _hid = new THREE.Matrix4().makeScale(0, 0, 0), _bm = {}, basicMat = c => _bm[c] || (_bm[c] = mBas(c));
function liftProp(o) {                  // the first time it moves: hide it in the merged mesh and give it a mesh of its own
  for (const p of o.parts) {
    const it = p.it; if (!it._m) continue;
    if (!it._orig) { it._orig = new THREE.Matrix4(); it._m.getMatrixAt(it._k, it._orig); }
    it._m.setMatrixAt(it._k, _hid); it._m.instanceMatrix.needsUpdate = true;
  }
  const g = new THREE.Group(), inner = new THREE.Group(); g.rotation.order = 'YXZ'; inner.position.y = -o.hc; g.add(inner);
  for (const p of o.parts) {
    const it = p.it, m = new THREE.Mesh(p.geo, p.basic ? basicMat(it.c) : mc(it.c));
    m.position.set(it.x - o.hx, it.y, it.z - o.hy); m.scale.set(it.sx, it.sy, it.sz); m.rotation.y = it.ry || 0; inner.add(m);
  }
  scene.add(g); o.group = g; placeProp(o);
}
function placeProp(o) { o.group.position.set(o.x, o.z + o.hc, o.y); o.group.rotation.set(o.roll, -o.yaw, 0); }
function throwProp(o, nx, ny, f) {
  if (!o.group) liftProp(o);
  if (o.solid) o.solid.off = true;                                 // no longer in anybody's way while it flies
  const k = 1 / Math.sqrt(o.mass);
  o.vx = (nx * rand(360, 520) + rand(-60, 60)) * f * k; o.vy = (ny * rand(360, 520) + rand(-60, 60)) * f * k; o.vz = rand(200, 340) * f * k + 60;
  o.wy = rand(-9, 9) * f; o.wr = rand(-10, 10) * f;
  if (!o.flying) { o.flying = true; FLY.push(o); }
}
const _tb = [];
function wallAtPt(x, y) { nearBuildings(x, y, _tb); for (const rc of _tb) if (!rc.gate && !softSolid(rc) && inSolid(x, y, rc, 0)) return true; return false; }
function landProp(o) {
  o.flying = false; o.vx = o.vy = o.vz = 0; o.roll = Math.round(o.roll / (Math.PI / 2)) * (Math.PI / 2);   // comes to rest on a face
  const k = tkey(o.x, o.y);
  if (k !== o.key) { const l = TGRID.get(o.key); l.splice(l.indexOf(o), 1); let n = TGRID.get(k); if (!n) TGRID.set(k, n = []); n.push(o); o.key = k; }
  if (shoreDist(o.x, o.y) < -6) { splashFx(o.x, o.y, 14); scene.remove(o.group); o.gone = true; return; }   // into the water: gone
  if (o.solid0) { const s = o.solid0; o.solid = makeSolid(o.x, o.y, s.lw, s.lh, s.a + o.yaw, { clutter: true }); }   // solid again where it lies
  placeProp(o);
}
function propStep(o, dt) {
  o.vz -= 900 * dt; const nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
  if (wallAtPt(nx, ny)) { o.vx *= -0.35; o.vy *= -0.35; } else { o.x = nx; o.y = ny; }
  o.z += o.vz * dt; o.yaw += o.wy * dt; o.roll += o.wr * dt;
  if (o.z <= 0) {
    o.z = 0;
    if (o.vz < -140) { o.vz *= -0.32; o.vx *= 0.55; o.vy *= 0.55; o.wy *= 0.5; o.wr *= 0.5; }   // a bounce
    else landProp(o);
  }
}
function throwProps(x, y, reach) {
  const a0 = Math.floor((x - reach + SEA) / TG), a1 = Math.floor((x + reach + SEA) / TG), b0 = Math.floor((y - reach + SEA) / TG), b1 = Math.floor((y + reach + SEA) / TG);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const l = TGRID.get(a * 1024 + b); if (!l) continue;
    for (const o of l.slice()) {
      if (o.gone) continue; const d = dist(o.x, o.y, x, y); if (d >= reach) continue;
      const [nx, ny] = away(o.x, o.y, x, y, d); throwProp(o, nx, ny, 1 - d / reach);
    }
  }
}
function away(ox, oy, x, y, d) { if (d < 1) { const a = rand(0, TAU); return [Math.cos(a), Math.sin(a)]; } return [(ox - x) / d, (oy - y) / d]; }

/* ---------- people, bodies and pickups knocked through the air ---------- */
function knock(o, nx, ny, f, r) {
  o.kvx = nx * rand(380, 540) * f; o.kvy = ny * rand(380, 540) * f; o.kvz = rand(240, 340) * f + 60; o.air = o.air || 0; o.kr = r;
  if (!o.knocked) { o.knocked = true; KNOCK.push(o); }
}
function knockStep(o, dt) {             // in steps of at most 3 units, so nobody flies through a wall, a dumpster, a car or another person
  o.kvz -= 900 * dt; o.air = Math.max(0, o.air + o.kvz * dt);
  const n = Math.max(1, Math.ceil(Math.hypot(o.kvx, o.kvy) * dt / 3));
  for (let i = 0; i < n; i++) {
    o.x += o.kvx * dt / n; o.y += o.kvy * dt / n;
    const h = resolveCircle(o, o.kr) || { nx: 0, ny: 0 };
    if (o.air < 26) bumpCars(o, o.kr, h);                         // high enough, it sails over a car
    if (o.air < 18) bumpPeople(o, o.kr, h);
    const m = Math.hypot(h.nx, h.ny);
    if (m > 0) { const nx = h.nx / m, ny = h.ny / m, vn = o.kvx * nx + o.kvy * ny; if (vn < 0) { o.kvx = (o.kvx - 1.3 * vn * nx) * 0.6; o.kvy = (o.kvy - 1.3 * vn * ny) * 0.6; } }   // bounce off, losing speed
  }
  if (o.air === 0) { o.kvz = o.kvz < -160 ? -o.kvz * 0.25 : 0; const fr = Math.exp(-6 * dt); o.kvx *= fr; o.kvy *= fr; }
  if (o === P) { P.vx = o.kvx; P.vy = o.kvy; }
  if (o.air > 0 || o.kvz !== 0 || Math.hypot(o.kvx, o.kvy) > 8) return false;
  o.knocked = false;
  if (o.state !== undefined && !o.dead && !o.cop) { o.state = 'flee'; o.fl = 4; o.fx = o.x - o.kx0; o.fy = o.y - o.ky0; }   // gets up and runs
  return true;
}

/* ---------- the blast itself ---------- */
function blastPush(x, y, R, src) {       // throws whatever is left standing, out to 1.7 times the kill radius
  const reach = R * 1.7;
  for (const c of cars) {
    if (c.sunk) continue;
    if (c === src) { c.vz = 330; c.av += rand(-4, 4); continue; }  // the car that blew up jumps
    const d = dist(c.x, c.y, x, y); if (d >= reach) continue;
    const f = 1 - d / reach, k = 1 / Math.sqrt(c.t.mass), [nx, ny] = away(c.x, c.y, x, y, d);
    c.vx += nx * 560 * f * k; c.vy += ny * 560 * f * k; c.av += rand(-6, 6) * f; c.vz = Math.max(c.vz || 0, 300 * f * k);
  }
  const push = (o, r) => { const d = dist(o.x, o.y, x, y); if (d >= reach) return; const [nx, ny] = away(o.x, o.y, x, y, d); o.kx0 = x; o.ky0 = y; knock(o, nx, ny, 1 - d / reach, r); };
  for (const p of peds) push(p, 7);
  for (const o of officers) push(o, 7);
  for (const q of pickups) push(q, 6);
  if (!P.car) push(P, 7);
  throwProps(x, y, reach);
}
const FBALL = [];                       // the fireball: two soft glowing sprites, an orange ball and a white-hot core
for (let k = 0; k < 6; k++) {
  const mk = c => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); return m; };
  FBALL.push({ outer: mk(0xffa040), core: mk(0xfff2c0), t: 9, x: 0, y: 0, R: 0 });   // drawn twice over for a dense ball
}
let fbNext = 0;
function boomFx(x, y, R) {
  const f = FBALL[fbNext++ % FBALL.length]; f.t = 0; f.x = x; f.y = y; f.R = R;
  ringFx(x, y, R * 1.3);
  for (let k = 0; k < 64; k++) { const a = rand(0, TAU), s = rand(60, 340), d = rand(0, 18);       // flames bursting out
    addP({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: rand(6, 30), vz: rand(20, 180), grav: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.85), max: 0.85, s0: rand(16, 26), s1: 4, col: pick(['#fff3c4', '#ffe27a', '#ffb347', '#ff7a2b', '#ff4d1f']), drag: 3.2, alpha: 1 }); }
  for (let k = 0; k < 18; k++) { const a = rand(0, TAU), d = rand(0, R * 0.25);                    // the glowing heart, lingering a moment
    addP({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: rand(14, 34), vz: rand(30, 70), grav: 0, vx: rand(-20, 20), vy: rand(-20, 20), life: rand(0.7, 1.1), max: 1.1, s0: rand(26, 36), s1: 14, col: pick(['#ff9d2b', '#ff6a1f', '#e8461a']), drag: 1.5, alpha: 0.85 }); }
  for (let k = 0; k < 56; k++) { const a = rand(0, TAU), s = rand(10, 80), d = rand(0, R * 0.4);   // the smoke column, rolling up and hanging about
    addP({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: rand(10, 46), vz: rand(25, 80), grav: -6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(3, 6), max: 6, s0: rand(22, 36), s1: rand(64, 100), col: pick(['#1d1b22', '#2a2830', '#3a3842', '#4c4a55', '#605e6a', '#5a4a40']), drag: 0.9, alpha: 0.72 }); }
  for (let k = 0; k < 20; k++) { const a = rand(0, TAU), s = rand(150, 380);                        // debris
    addP({ x, y, z: rand(8, 20), vz: rand(120, 300), grav: 520, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.9, 1.6), max: 1.6, s0: 3.6, s1: 2, col: pick(['#2b2a30', '#45434c', '#6b5a48']), drag: 0.6 }); }
  for (let k = 0; k < 24; k++) { const a = rand(0, TAU), s = rand(80, 260);                         // embers
    addP({ x, y, z: rand(10, 30), vz: rand(60, 220), grav: 260, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(1.2, 2.2), max: 2.2, s0: 2.6, s1: 1, col: pick(['#ffd36a', '#ff9d2b', '#fff3c4']), drag: 1 }); }
}
function updateBlast(dt) {
  for (const f of FBALL) if (f.t < 1) f.t += dt;                    // the fireball runs on game time
  for (let k = FLY.length - 1; k >= 0; k--) { const o = FLY[k]; propStep(o, dt); if (!o.flying) FLY.splice(k, 1); }
  for (let k = KNOCK.length - 1; k >= 0; k--) if (knockStep(KNOCK[k], dt)) KNOCK.splice(k, 1);
}
function gfxBlast(dt) {
  for (const o of FLY) placeProp(o);
  for (const f of FBALL) {               // the fireball: swells, rises, cools from yellow to deep red and fades
    if (f.t > 0.7) { if (f.outer.visible) f.outer.visible = f.core.visible = false; continue; }
    const u = Math.min(1, f.t / 0.7), e = 1 - (1 - u) ** 3, r = f.R * (0.25 + 0.6 * e), rc = f.R * (0.12 + 0.3 * e);
    f.outer.visible = f.core.visible = true;
    f.outer.position.set(f.x, 14 + u * 44, f.y); f.outer.scale.set(r * 3, r * 2.6, 1);
    f.outer.material.opacity = Math.min(1, 1.6 * (1 - u) ** 1.2); f.outer.material.color.setRGB(1, 0.62 - 0.4 * u, 0.2 - 0.18 * u);
    f.core.position.copy(f.outer.position); f.core.scale.set(rc * 3, rc * 2.6, 1); f.core.material.opacity = Math.max(0, 1 - u * 1.5);
  }
}
function resetBlast() {                 // a new game: everything thrown goes back where it stood
  for (const o of THROW) {
    if (!o.group && !o.flying) continue;
    if (o.group) scene.remove(o.group); o.group = null;
    for (const p of o.parts) if (p.it._orig) { p.it._m.setMatrixAt(p.it._k, p.it._orig); p.it._m.instanceMatrix.needsUpdate = true; }
    if (o.solid && o.solid !== o.solid0) o.solid.off = true; if (o.solid0) o.solid0.off = false; o.solid = o.solid0;
    const l = TGRID.get(o.key); l.splice(l.indexOf(o), 1); o.key = tkey(o.hx, o.hy); let n = TGRID.get(o.key); if (!n) TGRID.set(o.key, n = []); n.push(o);
    Object.assign(o, { x: o.hx, y: o.hy, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, roll: 0, flying: false, gone: false });
  }
  FLY.length = 0; for (const o of KNOCK) o.knocked = false; KNOCK.length = 0; P.knocked = false; P.air = 0;
  for (const f of FBALL) { f.t = 9; f.outer.visible = f.core.visible = false; }
}
