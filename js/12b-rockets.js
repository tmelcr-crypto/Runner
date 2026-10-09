'use strict';
/* ---------- 7c2. ROCKETS ----------
   A rocket leaves the tube slowly and its motor pushes it up to about 190 km/h. It flies straight at the point you aimed at when you
   let go - it does not follow a moving target - sinking gently from shoulder height to hit the ground there, and blows up on the
   first thing in its way: a building, a prop, a gate, a car, a person. One rocket in twenty is a dud that veers 40 degrees off and
   flies on level until it hits something or its motor runs out. In flight the motor glows and lights the street; the smoke is thick
   right behind it and thins out into a long white trail. */
let rockets = [];
const RK_V0 = 280, RK_V1 = 650, RK_ACC = 1100, RK_H0 = 15, RK_STEP = 5, RK_R = 130, RK_SRC = { byPlayer: true };
const _rkb = [];
function launchRocket(aim, w) {
  let ang = Math.atan2(aim.y - P.y, aim.x - P.x);
  const stray = Math.random() < w.stray;
  if (stray) ang += (Math.random() < 0.5 ? -1 : 1) * w.strayDeg * Math.PI / 180;      // the dud
  rockets.push({ x: P.x + Math.cos(ang) * 22, y: P.y + Math.sin(ang) * 22, ang, v: RK_V0, h: RK_H0, s: 22, D: Math.max(30, dist(P.x, P.y, aim.x, aim.y)),
    stray, max: w.range, puff: 0, mesh: null, glow: null, dead: false });
  for (let k = 0; k < 10; k++) addP({ x: P.x - Math.cos(ang) * 16 + rand(-4, 4), y: P.y - Math.sin(ang) * 16 + rand(-4, 4), z: rand(10, 16), vz: rand(5, 20), grav: 0,   // back-blast
    vx: -Math.cos(ang) * rand(60, 160) + rand(-30, 30), vy: -Math.sin(ang) * rand(60, 160) + rand(-30, 30), life: rand(0.6, 1.2), max: 1.2, s0: 10, s1: 26, col: '#d9dbe2', drag: 3, alpha: 0.7 });
}
function rocketHits(x, y) {             // anything solid at this point?
  nearBuildings(x, y, _rkb); for (const rc of _rkb) if (inSolid(x, y, rc, 1)) return true;
  for (const c of cars) { if (c.sunk || Math.abs(c.x - x) > 60 || Math.abs(c.y - y) > 60) continue; for (const q of carCircles(c)) if (Math.hypot(x - q[0], y - q[1]) < q[2]) return true; }
  for (const p of peds) if (!p.dead && Math.abs(p.x - x) < 9 && Math.abs(p.y - y) < 9 && Math.hypot(p.x - x, p.y - y) < 9) return true;
  for (const o of officers) if (!o.dead && Math.hypot(o.x - x, o.y - y) < 9) return true;
  return x < CX0 || x > CX1 || y < CY0 || y > CY1;
}
function rocketBoom(r, x, y) {
  r.dead = true; r.x = x; r.y = y;
  explosion(x, y, RK_R, RK_SRC); alertPeds(x, y, 500); reportCrime(30, BLAST_HEAR, x, y);
}
function updateRockets(dt) {
  for (const r of rockets) {
    if (r.dead) continue;
    r.v = Math.min(RK_V1, r.v + RK_ACC * dt);
    const dx = Math.cos(r.ang), dy = Math.sin(r.ang); let go = r.v * dt;
    while (go > 0 && !r.dead) {
      const st = Math.min(RK_STEP, go); go -= st;
      if (!r.stray && r.s + st >= r.D) { const left = r.D - r.s; rocketBoom(r, r.x + dx * left, r.y + dy * left); break; }   // down on the spot you aimed at
      r.x += dx * st; r.y += dy * st; r.s += st;
      r.h = r.stray ? RK_H0 : lerp(RK_H0, 1, clamp(r.s / r.D, 0, 1));
      if (rocketHits(r.x, r.y) || r.s >= r.max) { rocketBoom(r, r.x, r.y); break; }
      if ((r.puff -= st) <= 0) {                                  // smoke: a thick grey core right behind, a white trail that spreads and fades
        r.puff = 6;
        const bx = r.x - dx * 9, by = r.y - dy * 9;
        addP({ x: bx + rand(-1.5, 1.5), y: by + rand(-1.5, 1.5), z: r.h + rand(-1, 1), vz: rand(1, 6), grav: 0, vx: rand(-5, 5) - dx * 25, vy: rand(-5, 5) - dy * 25,
          life: rand(2.4, 3.2), max: 3.2, s0: 7, s1: 34, col: pick(['#ffffff', '#f1f2f6', '#e2e5ec']), drag: 1.4, alpha: 0.9 });
        addP({ x: bx + rand(-1, 1), y: by + rand(-1, 1), z: r.h, vz: 0, grav: 0, vx: -dx * 40, vy: -dy * 40, life: rand(0.35, 0.55), max: 0.55, s0: 10, s1: 15, col: '#b9bcc6', drag: 3, alpha: 0.95 });
      }
    }
    if (!r.dead) addP({ x: r.x - dx * 8, y: r.y - dy * 8, z: r.h, vz: 0, grav: 0, vx: -dx * 90, vy: -dy * 90, life: 0.09, max: 0.09, s0: 9, s1: 3, col: pick(['#ffe27a', '#ffb347', '#fff3c4']), drag: 0, alpha: 1 });   // the motor
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
    const f = 0.8 + 0.35 * Math.sin(time * 60 + r.s); r.flame.scale.set(5 * f, 2.2 * f, 2.2 * f);
    r.glow.position.set(r.x - Math.cos(r.ang) * 10, 1.6, r.y - Math.sin(r.ang) * 10); RK_M.glow.opacity = 0.7 + 0.2 * f;
    lit = lit || r;
  }
  if (lit) { rocketLight.position.set(lit.x, lit.h + 20, lit.y); rocketLight.intensity = 1.8; } else rocketLight.intensity = 0;
}
