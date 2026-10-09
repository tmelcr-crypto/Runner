'use strict';
/* ---------- 7c2. ROCKETS ----------
   A rocket leaves the tube slowly and its motor pushes it up to about 190 km/h. It flies level, straight at the point you aimed at when
   you let go - it does not follow a moving target - and blows up on the first thing it touches: a building, a prop, a gate, a car, a
   person. If it gets past that point without touching anything it keeps going, and from there on it wanders: its heading swings in
   slow waves that change at random but never turn sharply, until it hits something or its motor burns out and it falls.
   One rocket in twenty is a dud that leaves the tube 40 degrees off; it too wanders once it has flown as far as the target was.
   In flight the motor glows and lights the street; the smoke is thick right behind it and spreads into a white trail that takes
   about five seconds to fade. */
let rockets = [];
const RK_V0 = 280, RK_V1 = 650, RK_ACC = 1100, RK_H0 = 12, RK_STEP = 5, RK_R = 130, RK_BURN = 3600, RK_SRC = { byPlayer: true };
const _rkb = [];
function launchRocket(aim, w, car) {    // car: fired from a vehicle (the tank's gun): leaves from the muzzle and never hits that vehicle
  const ox = car ? car.x : P.x, oy = car ? car.y : P.y, off = car ? car.t.len / 2 + 18 : 22;
  let ang = car ? car.ang : Math.atan2(aim.y - oy, aim.x - ox);
  const stray = Math.random() < w.stray;
  if (stray) ang += (Math.random() < 0.5 ? -1 : 1) * w.strayDeg * Math.PI / 180;      // the dud
  rockets.push({ x: ox + Math.cos(ang) * off, y: oy + Math.sin(ang) * off, ang, v: car ? RK_V1 * 0.8 : RK_V0, h: car ? 17 : RK_H0, vh: 0, s: off, D: Math.max(30, dist(ox, oy, aim.x, aim.y)),
    stray, wander: false, wt: 0, wa: 0, wA: 0, wf: 0, wp: 0, wNext: 0, burnt: false, puff: 0, mesh: null, glow: null, dead: false, src: car || null });
  const bx = car ? ox + Math.cos(ang) * off : ox - Math.cos(ang) * 16, by = car ? oy + Math.sin(ang) * off : oy - Math.sin(ang) * 16, bk = car ? -0.3 : 1;   // back-blast, or the muzzle smoke
  for (let k = 0; k < 10; k++) addP({ x: bx + rand(-4, 4), y: by + rand(-4, 4), z: rand(10, 16), vz: rand(5, 20), grav: 0,
    vx: -Math.cos(ang) * rand(60, 160) * bk + rand(-30, 30), vy: -Math.sin(ang) * rand(60, 160) * bk + rand(-30, 30), life: rand(0.6, 1.2), max: 1.2, s0: 10, s1: 26, col: '#d9dbe2', drag: 3, alpha: 0.7 });
}
function rocketHits(x, y, src) {        // anything solid at this point? (never the vehicle that fired it)
  nearBuildings(x, y, _rkb); for (const rc of _rkb) if (inSolid(x, y, rc, 1)) return true;
  for (const c of cars) { if (c.sunk || c === src || Math.abs(c.x - x) > c.t.len / 2 + 20 || Math.abs(c.y - y) > c.t.len / 2 + 20) continue; for (const q of carCircles(c)) if (Math.hypot(x - q[0], y - q[1]) < q[2]) return true; }
  for (const p of peds) if (!p.dead && Math.abs(p.x - x) < 9 && Math.abs(p.y - y) < 9 && Math.hypot(p.x - x, p.y - y) < 9) return true;
  for (const o of officers) if (!o.dead && Math.hypot(o.x - x, o.y - y) < 9) return true;
  return x < CX0 || x > CX1 || y < CY0 || y > CY1;
}
function rocketBoom(r, x, y) {
  r.dead = true; r.x = x; r.y = y;
  explosion(x, y, RK_R, RK_SRC); alertPeds(x, y, 500); reportCrime(COP.crime.blast, COP.blastHear, x, y, true);
}
function wanderTurn(r, dt) {            // past the target: the heading swings in waves whose size and pace drift at random - never a sharp turn
  if (!r.wander) { r.wander = true; r.ph = Math.random() < 0.5 ? 0 : Math.PI; r.wa = 0; r.wA = rand(0.7, 1.5); r.wf = r.wF = rand(2, 3.4); r.wNext = rand(0.6, 1.2); }
  if ((r.wNext -= dt) <= 0) { r.wA = rand(0.5, 1.7); r.wF = clamp(r.wF + rand(-0.6, 0.6), 1.6, 3.8); r.wNext = rand(0.6, 1.4); }
  const e = 1 - Math.exp(-2 * dt); r.wa = lerp(r.wa, r.wA, e); r.wf = lerp(r.wf, r.wF, e);   // size and pace ease toward new values
  r.ph += r.wf * dt; r.ang += r.wa * Math.sin(r.ph) * dt;         // the phase only ever advances, so the swing never jumps
}
function updateRockets(dt) {
  for (const r of rockets) {
    if (r.dead) continue;
    if (!r.burnt) r.v = Math.min(RK_V1, r.v + RK_ACC * dt);
    if (r.s >= r.D) wanderTurn(r, dt);                              // keeps swinging after burn-out too, so the path never kinks
    if (r.burnt) { r.vh -= 500 * dt; r.h += r.vh * dt; }          // motor out: it drops
    const dx = Math.cos(r.ang), dy = Math.sin(r.ang); let go = r.v * dt;
    while (go > 0 && !r.dead) {
      const st = Math.min(RK_STEP, go); go -= st;
      r.x += dx * st; r.y += dy * st; r.s += st;
      if (rocketHits(r.x, r.y, r.src) || r.h <= 0) { rocketBoom(r, r.x, r.y); break; }
      if (r.s >= RK_BURN) r.burnt = true;
      if (!r.burnt && (r.puff -= st) <= 0) {                     // smoke: a thick grey core right behind, a white trail that spreads and takes 5 s to fade
        r.puff = 6;
        const bx = r.x - dx * 9, by = r.y - dy * 9;
        addP({ x: bx + rand(-1.5, 1.5), y: by + rand(-1.5, 1.5), z: r.h + rand(-1, 1), vz: rand(1, 5), grav: 0, vx: rand(-5, 5) - dx * 25, vy: rand(-5, 5) - dy * 25,
          life: rand(4.6, 5), max: 5, s0: 7, s1: 40, col: pick(['#ffffff', '#f1f2f6', '#e2e5ec']), drag: 1.4, alpha: 0.9 });
        addP({ x: bx + rand(-1, 1), y: by + rand(-1, 1), z: r.h, vz: 0, grav: 0, vx: -dx * 40, vy: -dy * 40, life: rand(0.35, 0.55), max: 0.55, s0: 10, s1: 15, col: '#b9bcc6', drag: 3, alpha: 0.95 });
      }
    }
    if (!r.dead && !r.burnt) addP({ x: r.x - dx * 8, y: r.y - dy * 8, z: r.h, vz: 0, grav: 0, vx: -dx * 90, vy: -dy * 90, life: 0.09, max: 0.09, s0: 9, s1: 3, col: pick(['#ffe27a', '#ffb347', '#fff3c4']), drag: 0, alpha: 1 });   // the motor
  }
  for (let k = rockets.length - 1; k >= 0; k--) if (rockets[k].dead) { dropRocketMesh(rockets[k]); rockets.splice(k, 1); }
}

/* the rocket: an olive tube, a grey warhead, four fins, a flame at the back, a glow on the ground below and an orange light */
const RK_M = { body: mLam(0x55603a), nose: mLam(0x9aa08a), fin: mLam(0x2b2e38), flame: mBas(0xffd36a),
  glow: new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff9d2b, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }) }, GCone = new THREE.ConeGeometry(1, 1, 10);
const rocketLight = new THREE.PointLight(0xff9a3a, 0, 320); scene.add(rocketLight);
function buildRocketMesh(r) {
  const g = new THREE.Group(), part = (geo, m, sx, sy, sz, x, rz, rx) => { const o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.x = x; o.rotation.z = rz || 0; if (rx) o.rotation.x = rx; g.add(o); return o; };
  part(GCyl, RK_M.body, 1.8, 15, 1.8, 0, Math.PI / 2);
  part(GCone, RK_M.nose, 2, 6, 2, 10.4, -Math.PI / 2);
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(GB, RK_M.fin); f.scale.set(4, 0.4, 3.4); f.position.set(-6, 0, 0); f.rotation.x = k * Math.PI / 2; f.translateZ(2); g.add(f); }
  r.flame = part(GSph, RK_M.flame, 5, 2.2, 2.2, -10);
  r.mesh = g; scene.add(g);
  r.glow = new THREE.Mesh(GP, RK_M.glow); r.glow.scale.set(110, 1, 110); scene.add(r.glow);
}
function dropRocketMesh(r) { if (r.mesh) { scene.remove(r.mesh); scene.remove(r.glow); r.mesh = r.glow = null; } }
function clearRockets() { for (const r of rockets) dropRocketMesh(r); rockets = []; }
function gfxRockets(time) {
  let lit = null;
  for (const r of rockets) {
    if (!r.mesh) buildRocketMesh(r);
    r.mesh.position.set(r.x, r.h, r.y); r.mesh.rotation.y = -r.ang;
    const f = r.burnt ? 0 : 0.8 + 0.35 * Math.sin(time * 60 + r.s); r.flame.visible = !r.burnt; r.flame.scale.set(5 * f, 2.2 * f, 2.2 * f); r.glow.visible = !r.burnt;
    r.glow.position.set(r.x - Math.cos(r.ang) * 10, 1.6, r.y - Math.sin(r.ang) * 10); RK_M.glow.opacity = 0.7 + 0.2 * f;
    if (!r.burnt) lit = lit || r;
  }
  if (lit) { rocketLight.position.set(lit.x, lit.h + 20, lit.y); rocketLight.intensity = 1.8; } else rocketLight.intensity = 0;
}
