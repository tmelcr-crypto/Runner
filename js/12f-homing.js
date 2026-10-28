'use strict';
/* ---------- 7c3. THE AA LAUNCHER'S HOMING ROCKETS ----------
   (weapon table: fires homing) The AA launcher aims through the rocket launcher's sight, but only a helicopter (the police one, js/08u,
   or the army's on its pad, js/08j), a tank or an APC can be targeted. Keep one inside the sight's frame for the lock-on time and it locks
   (rising beeps, then a steady tone); let go while locked and the rocket is away - without a lock it does not fire (js/14b).
   The rocket leaves in a random direction, climbs, swerves about the sky and, when its flight time is up, strikes the target wherever
   it has gone: one hit destroys it. If the target is gone first, the rocket blows up where it was. */
let homing = [];
const _hQ = new THREE.Vector3();
const isArmour = c => c.t.body === 'tank' || c.t.body === 'apc';
function aaTargets() {                    // everything the AA launcher can lock onto: { kind, o }
  const out = [];
  if (heliLive()) out.push({ kind: 'heli', o: PH });
  if (HELI && !HELI.dead && !HELI.off) out.push({ kind: 'pad', o: HELI });
  if (CH5.heli && !CH5.heli.dead) out.push({ kind: 'ch5', o: CH5.heli });           // Crane's helicopter (M28, js/08zzp)
  for (const c of cars) if (!c.dead && !c.sunk && c !== P.car && isArmour(c)) out.push({ kind: 'car', o: c });
  return out;
}
function aaPos(t, out) {                  // where a target is: x, y on the map, h above the street
  if (t.kind === 'heli') { out.x = PH.x; out.y = PH.y; out.h = PH.h - 6; }
  else if (t.kind === 'pad') { out.x = t.o.x - 10; out.y = t.o.y; out.h = 22; }
  else if (t.kind === 'ch5') { out.x = t.o.x; out.y = t.o.y; out.h = t.o.h; }
  else { out.x = t.o.x; out.y = t.o.y; out.h = t.o.t.body === 'tank' ? 18 : 16; }
  return out;
}
const aaAlive = t => t.kind === 'heli' ? heliLive() : t.kind === 'pad' || t.kind === 'ch5' ? !t.o.dead : !t.o.dead && !t.o.sunk && cars.includes(t.o);
function aaPick(sx, sy, hw, hh) {         // the target inside the sight's frame nearest its centre (js/14b scopePick; the camera is placed), or null
  let best = null, bs = Infinity; const q = {};
  for (const t of aaTargets()) {
    aaPos(t, q); _hQ.set(q.x, q.h, q.y).project(camera); if (_hQ.z > 1) continue;     // behind the camera
    const dx = Math.abs((_hQ.x + 1) / 2 * VW - sx) / hw, dy = Math.abs((1 - _hQ.y) / 2 * VH - sy) / hh, s = dx * dx + dy * dy;
    if (dx < 0.92 && dy < 0.92 && s < bs) { bs = s; best = { x: q.x, y: q.y, hit: true, tgt: t }; }
  }
  return best;
}
function launchHoming(tgt, w) {
  const a0 = rand(0, TAU), r1 = rand(260, 420), a2 = rand(0, TAU), r2 = rand(240, 400);
  const p0 = { x: P.x + Math.cos(P.ang) * 14, y: P.y + Math.sin(P.ang) * 14, h: 18 };
  homing.push({ tgt, T: w.flight, t: 0, p0, c1: { x: p0.x + Math.cos(a0) * r1, y: p0.y + Math.sin(a0) * r1, h: p0.h + rand(150, 260) },   // off in a random direction, climbing
    o2: { x: Math.cos(a2) * r2, y: Math.sin(a2) * r2, h: rand(140, 240) }, last: aaPos(tgt, {}), x: p0.x, y: p0.y, h: p0.h, ang: a0, pitch: 0.5,
    ph: rand(0, TAU), puff: 0, dead: false, mesh: null, w });
  for (let k = 0; k < 12; k++) addP({ x: p0.x - Math.cos(P.ang) * 20 + rand(-4, 4), y: p0.y - Math.sin(P.ang) * 20 + rand(-4, 4), z: rand(10, 18), vz: rand(5, 25), grav: 0,   // the back-blast
    vx: -Math.cos(P.ang) * rand(60, 160) + rand(-30, 30), vy: -Math.sin(P.ang) * rand(60, 160) + rand(-30, 30), life: rand(0.6, 1.2), max: 1.2, s0: 10, s1: 26, col: '#d9dbe2', drag: 3, alpha: 0.7 });
}
function updateHoming(dt) {
  for (const m of homing) {
    if (m.dead) continue;
    m.t += dt; const u = Math.min(1, m.t / m.T), v = 1 - u;
    if (aaAlive(m.tgt)) aaPos(m.tgt, m.last);                       // a target that is gone: the rocket flies to where it was
    const e = m.last, c2x = e.x + m.o2.x * v, c2y = e.y + m.o2.y * v, c2h = e.h + m.o2.h * v;   // the last bend draws in as the end nears
    const b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
    const sw = Math.sin(u * Math.PI) * 46, s1 = Math.sin(m.t * 5.3 + m.ph), s2 = Math.cos(m.t * 3.9 + m.ph * 1.7);   // a swerve, gone again at both ends
    const nx = b0 * m.p0.x + b1 * m.c1.x + b2 * c2x + b3 * e.x + s1 * sw, ny = b0 * m.p0.y + b1 * m.c1.y + b2 * c2y + b3 * e.y + s2 * sw;
    const nh = Math.max(6, b0 * m.p0.h + b1 * m.c1.h + b2 * c2h + b3 * e.h + s1 * s2 * sw * 0.5);
    const dx = nx - m.x, dy = ny - m.y, dh = nh - m.h, step = Math.hypot(dx, dy, dh);
    if (step > 0.01) { m.ang = Math.atan2(dy, dx); m.pitch = Math.atan2(dh, Math.hypot(dx, dy)); }
    for (let s = Math.min(step, 60); (m.puff -= s) <= 0; s = 0) {    // the white trail, thick right behind the motor
      m.puff += 7; const k = rand(0, 1), px = m.x + dx * k, py = m.y + dy * k, pz = m.h + dh * k;
      addP({ x: px + rand(-1.5, 1.5), y: py + rand(-1.5, 1.5), z: pz, vz: rand(1, 5), grav: 0, vx: rand(-5, 5), vy: rand(-5, 5), life: rand(3.2, 3.8), max: 3.8, s0: 6, s1: 34, col: pick(['#ffffff', '#f1f2f6', '#e2e5ec']), drag: 1.4, alpha: 0.85 });
    }
    m.x = nx; m.y = ny; m.h = nh;
    addP({ x: m.x - Math.cos(m.ang) * 7, y: m.y - Math.sin(m.ang) * 7, z: m.h, vz: 0, grav: 0, vx: -Math.cos(m.ang) * 80, vy: -Math.sin(m.ang) * 80, life: 0.08, max: 0.08, s0: 8, s1: 3, col: pick(['#ffe27a', '#ffb347', '#fff3c4']), drag: 0, alpha: 1 });   // the motor
    if (u >= 1) homingStrike(m);
  }
  if (homing.some(m => m.dead)) { for (const m of homing) if (m.dead && m.mesh) scene.remove(m.mesh); homing = homing.filter(m => !m.dead); }
}
function homingStrike(m) {                // the flight time is up: it hits, and one hit is enough
  m.dead = true; const t = m.tgt, e = m.last;
  if (aaAlive(t)) {
    if (t.kind === 'heli') { airBurst(e.x, e.y, PH.h); heliDown(true); return; }
    if (t.kind === 'pad') { t.o.hit(1e9, true); return; }
    if (t.kind === 'ch5') { airBurst(e.x, e.y, t.o.h); ch5HeliHurt(1e9, true); return; }
    t.o.byPlayer = true; explodeCar(t.o); reportCrime(COP.crime.blast, COP.blastHear, e.x, e.y, true); return;
  }
  if (e.h > 40) airBurst(e.x, e.y, e.h); else { explosion(e.x, e.y, m.w.blast || RK_R, RK_SRC, m.w.blastThrow); reportCrime(COP.crime.blast, COP.blastHear, e.x, e.y, true); }
}
function airBurst(x, y, h) {              // a blast in the air: fire, smoke and a bang, nothing hurt below
  Snd.boom(); cam.shake = Math.max(cam.shake, 10 * (1 - Math.min(1, dist(x, y, cam.x, cam.y) / 900))); boomFlash = { x, y, t: 0.5 };
  for (let k = 0; k < 46; k++) { const a = rand(0, TAU), b = rand(-1, 1), s = rand(60, 260);
    addP({ x, y, z: h + rand(-6, 6), vz: b * s, grav: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.8), max: 0.8, s0: rand(14, 24), s1: 4, col: pick(['#fff3c4', '#ffe27a', '#ffb347', '#ff7a2b']), drag: 3.2, alpha: 1 }); }
  for (let k = 0; k < 22; k++) { const a = rand(0, TAU), s = rand(10, 70);
    addP({ x, y, z: h + rand(-8, 8), vz: rand(-10, 30), grav: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(2.5, 4.5), max: 4.5, s0: rand(18, 28), s1: rand(50, 80), col: pick(['#2a2830', '#3a3842', '#4c4a55']), drag: 0.9, alpha: 0.75 }); }
}
function clearHoming() { for (const m of homing) if (m.mesh) scene.remove(m.mesh); homing = []; }

/* the missile: a slim white body, a dark nose, four fins, the flame */
const HM_M = { body: mLam(0xe8ecf2), nose: mLam(0x3a3f48), fin: mLam(0x2b2e38), flame: mBas(0xffd36a) };
function gfxHoming(time) {
  for (const m of homing) {
    if (!m.mesh) {
      const g = new THREE.Group(), part = (geo, mat, sx, sy, sz, x, rz) => { const o = new THREE.Mesh(geo, mat); o.scale.set(sx, sy, sz); o.position.x = x; o.rotation.z = rz || 0; g.add(o); return o; };
      part(GCyl, HM_M.body, 1.5, 14, 1.5, 0, Math.PI / 2); part(GCone, HM_M.nose, 1.6, 4, 1.6, 9, -Math.PI / 2);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(GB, HM_M.fin); f.scale.set(3.4, 0.35, 2.8); f.position.set(-5.5, 0, 0); f.rotation.x = k * Math.PI / 2; f.translateZ(1.6); g.add(f); }
      g.userData.flame = part(GSph, HM_M.flame, 4, 1.8, 1.8, -9); g.rotation.order = 'YZX'; m.mesh = g; scene.add(g);
    }
    m.mesh.position.set(m.x, m.h, m.y); m.mesh.rotation.set(0, -m.ang, m.pitch);
    const f = 0.8 + 0.35 * Math.sin(time * 60 + m.ph); m.mesh.userData.flame.scale.set(4 * f, 1.8 * f, 1.8 * f);
  }
}
