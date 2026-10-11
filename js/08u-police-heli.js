'use strict';
/* ---------- 6u. THE POLICE HELICOPTER ----------
   (js/01j policeHeli; police table: Helicopter) There is one police helicopter. From 3 stars it flies in from the side of the nearest
   police station and looks for you with its searchlight: where you were last seen first, then sweeping the search area. Once the light
   finds you it follows you, but only so fast - drive faster and you slip out of it. While you are in the light every unit knows where
   you are; under a car park deck it cannot see you. From 4 stars it fires a short machine-gun burst at you every few seconds while the
   light is on you, and at 5 stars it also drops pipe bombs where you will be (their blasts are not your crime). When your stars drop
   below 3 it flies off. Only the sniper rifle (a few hits) and the AA launcher (one rocket, js/12f) bring it down: it spins down
   trailing smoke and blows up where it falls - a crime that always counts - and the next one comes only 10 minutes later.
   It flies above the roofs and climbs over anything taller. */
const PH = { mode: 'off', x: 0, y: 0, h: 0, vx: 0, vy: 0, ang: 0, roll: 0, pitch: 0, spin: 0, vh: 0, sx: 0, sy: 0, hp: 0, sees: false,
  gunT: 0, burst: 0, shotT: 0, bombT: 0, sweep: 0, orb: 0, next: 0, wreckT: 0, hurt: 0, mesh: null, beam: null, pool: null, shadow: null };
const heliLive = () => PH.mode === 'hunt' || PH.mode === 'leave';   // in the air and in one piece: it can be shot at
const HELI_ORBIT = 150;                                           // it circles its light at about this distance
function heliReset() { PH.mode = 'off'; PH.next = 0; PH.sees = false; heliHide(); }
function heliHide() { for (const o of [PH.mesh, PH.beam, PH.pool, PH.shadow]) if (o) o.visible = false; }
const _hb = [];
function roofAt(x, y, m) {               // the highest roof within m of a point (0: open ground)
  let top = 0; bHash.query(x - m, y - m, x + m, y + m, _hb);
  for (const s of _hb) if (s.H > top && inSolid(x, y, s, m)) top = s.H;
  return top;
}

/* ---------- every frame (js/15, after the police) ---------- */
function updateHeli(dt) {
  const want = feat('policeHeli') && feat('police') && !P.dead && P.stars >= COP.heliFrom;
  if (PH.mode === 'off') { PH.sees = false; if (want && gameT >= PH.next) heliSpawn(); else { Snd.setRotor(0); return; } }
  if (PH.mode === 'fall') { heliFall(dt); heliNoise(); return; }
  if (PH.mode === 'wreck') { PH.sees = false; Snd.setRotor(0); if ((PH.wreckT -= dt) <= 0) { PH.mode = 'off'; heliHide(); } else heliBurn(); return; }
  if (PH.mode === 'hunt' && !want) PH.mode = 'leave';
  else if (PH.mode === 'leave' && want) PH.mode = 'hunt';
  if (PH.mode === 'leave') {                                      // off back to base, out of sight
    PH.sees = false; let ax = PH.x - P.x, ay = PH.y - P.y; const d = Math.hypot(ax, ay) || 1; ax /= d; ay /= d;
    heliFly(PH.x + ax * 2000, PH.y + ay * 2000, dt); PH.sx = PH.x + Math.cos(PH.ang) * 60; PH.sy = PH.y + Math.sin(PH.ang) * 60;
    if (d > visRadius() * 1.6 + 500) { PH.mode = 'off'; PH.next = gameT + 15; heliHide(); }
  } else {
    PH.sees = heliSeesYou();
    let gx, gy;                                                    // where the light wants to be
    if (PH.sees || PS.seen) { gx = P.x; gy = P.y; }
    else { PH.sweep += dt; const a = PH.sweep * 0.8, r = Math.max(PS.r, 60) * (0.55 + 0.45 * Math.sin(PH.sweep * 0.43)); gx = PS.lx + Math.cos(a) * r; gy = PS.ly + Math.sin(a * 1.3) * r; }
    const dx = gx - PH.sx, dy = gy - PH.sy, d = Math.hypot(dx, dy), st = COP.heliLightSpeed * dt;
    if (d <= st) { PH.sx = gx; PH.sy = gy; } else { PH.sx += dx / d * st; PH.sy += dy / d * st; }
    PH.orb += dt * 0.3;
    heliFly(PH.sx + Math.cos(PH.orb) * HELI_ORBIT, PH.sy + Math.sin(PH.orb) * HELI_ORBIT * 0.6 + heliLift(), dt);   // circling south of the light, so on screen it hovers over it
    const lx = PH.sx - PH.x, ly = PH.sy - PH.y, ld = Math.hypot(lx, ly);   // the light reaches only so far from below the helicopter
    if (ld > COP.heliReach) { PH.sx = PH.x + lx / ld * COP.heliReach; PH.sy = PH.y + ly / ld * COP.heliReach; }
    heliGun(dt);
    if (P.stars >= COP.heliBombFrom && (PH.bombT -= dt) <= 0 && PH.sees) { PH.bombT = COP.heliBombEvery; heliBomb(); }
  }
  if (PH.hp < COP.heliSniper && Math.random() < 0.5) heliSmoke(PH.x, PH.y, PH.h + 30, false);   // hit: it smokes
  PH.hurt = Math.max(0, PH.hurt - dt * 3); heliNoise();
}
function heliLift() {                   // how far north of where it really is the tilted camera shows it: it keeps that far south of its light
  const D = camDist(), tl = CAM_TILT_DEG * Math.PI / 180, hc = D * Math.cos(tl); return clamp(PH.h / Math.max(60, hc - PH.h), 0, 1.2) * D * Math.sin(tl);
}
function heliNoise() { Snd.setRotor(clamp(1 - dist(PH.x, PH.y, cam.x, cam.y) / 1800, 0, 1)); }
function heliSeesYou() {                 // you are in the light, and not under a car park deck
  if (P.dead || zOf(P.car || P) > 15) return false;
  const tg = P.car || P; return dist(PH.sx, PH.sy, tg.x, tg.y) < COP.heliLight + (P.car ? P.car.t.len * 0.3 : 6);
}
function heliSpawn() {                   // in from the side of the nearest police station, from beyond the edge of the view
  let st = null, bd = Infinity; for (const s of SVC.police) { const d = dist(s.r.cx, s.r.cy, P.x, P.y); if (d < bd) { bd = d; st = s.r; } }
  const a = st && bd > 1 ? Math.atan2(st.cy - P.y, st.cx - P.x) : rand(0, TAU), R = visRadius() * 1.3 + 300, x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R;
  Object.assign(PH, { mode: 'hunt', x, y, h: Math.max(COP.heliHeight, roofAt(x, y, 90) + 8 * MPS), vx: 0, vy: 0, ang: a + Math.PI, roll: 0, pitch: 0, spin: 0, vh: 0,
    sx: x + Math.cos(a + Math.PI) * 60, sy: y + Math.sin(a + Math.PI) * 60, hp: Math.round(COP.heliSniper), sees: false, gunT: COP.heliBurstEvery * 0.5, burst: 0, shotT: 0,
    bombT: COP.heliBombEvery * 0.6, sweep: 0, orb: a, hurt: 0 });
  toast('POLICE HELICOPTER!', true);
}
function heliFly(gx, gy, dt) {           // toward a point: speed, acceleration, the nose into the way it goes, tilting with it; over the roofs
  const dx = gx - PH.x, dy = gy - PH.y, d = Math.hypot(dx, dy), want = Math.min(COP.heliSpeed, d * 1.1);
  const tvx = d > 1 ? dx / d * want : 0, tvy = d > 1 ? dy / d * want : 0, acc = 240 * dt;
  const ax = clamp(tvx - PH.vx, -acc, acc), ay = clamp(tvy - PH.vy, -acc, acc);
  PH.vx += ax; PH.vy += ay; PH.x += PH.vx * dt; PH.y += PH.vy * dt;
  const sp = Math.hypot(PH.vx, PH.vy), face = sp > 70 ? Math.atan2(PH.vy, PH.vx) : Math.atan2(PH.sy - PH.y, PH.sx - PH.x);
  PH.ang += clamp(angDiff(PH.ang, face), -1.1 * dt, 1.1 * dt);
  const ca = Math.cos(PH.ang), sa = Math.sin(PH.ang), fa = (ax * ca + ay * sa) / Math.max(dt, 1e-4), la = (-ax * sa + ay * ca) / Math.max(dt, 1e-4), e = 1 - Math.exp(-3 * dt);
  PH.pitch = lerp(PH.pitch, clamp(-fa / 1100 - sp / 2600, -0.32, 0.22), e); PH.roll = lerp(PH.roll, clamp(la / 1000, -0.35, 0.35), e);
  const alt = Math.max(COP.heliHeight, roofAt(PH.x + PH.vx * 0.8, PH.y + PH.vy * 0.8, 90) + 8 * MPS);   // climbs before a tall roof
  PH.h += clamp(alt - PH.h, -50 * dt, 140 * dt);
}

/* ---------- its guns ---------- */
function heliGun(dt) {                   // from 4 stars: a short burst every few seconds while the light is on you
  const w = apcGunW();
  if (PH.burst > 0) { if ((PH.shotT -= dt) <= 0) { PH.shotT = w.rate; PH.burst--; heliRound(w); } return; }
  PH.gunT = Math.max(0, PH.gunT - dt);
  if (PH.gunT <= 0 && PH.sees && P.stars >= COP.heliGunFrom) { PH.burst = Math.round(COP.heliBurst); PH.shotT = 0; PH.gunT = COP.heliBurstEvery; }
}
function heliRound(w) {
  const tg = P.car || P, hit = !P.dead && PH.sees && Math.random() < COP.heliHit, mx = PH.x + Math.cos(PH.ang) * 26, my = PH.y + Math.sin(PH.ang) * 26;
  const x2 = tg.x + (hit ? rand(-4, 4) : rand(-36, 36)), y2 = tg.y + (hit ? rand(-4, 4) : rand(-36, 36));
  tracers.push({ x1: mx, y1: my, z1: PH.h - 2, x2, y2, z2: hit ? 12 : 1, life: 0.06 });
  if (dist(PH.x, PH.y, cam.x, cam.y) < 1300) Snd.shot(w.sound);
  if (hit) { if (P.car) { damageCar(P.car, COP.heliCarDmg, false); spark(tg.x, tg.y, 3); } else damagePlayer(COP.heliDmg); }
  else { spark(x2, y2, 2, '#e8dcc0'); if (decals.length < 110 && Math.random() < 0.3) decals.push({ x: x2, y: y2, r: 1.6, life: 20, scorch: true }); }
}
function heliBomb() {                    // at 5 stars: a pipe bomb dropped where you will be when it lands (not your crime, js/06b)
  const pw = WEAPONS.find(w => w.id === 'pipebomb'); if (!pw) return;
  const tg = P.car || P, z0 = PH.h - 10, T = Math.sqrt(2 * z0 / GR_G), lx = tg.x + (tg.vx || 0) * T, ly = tg.y + (tg.vy || 0) * T;
  grenades.push({ x: PH.x, y: PH.y, z: z0, vx: (lx - PH.x) / T, vy: (ly - PH.y) / T, vz: 0, fuse: pw.fuse, w: pw, beep: 0.3, blink: 0, rest: false, hitP: false, spin: rand(-8, 8), rot: 0, cop: true });
}

/* ---------- brought down ---------- */
function heliShot() {                    // a sniper round: sparks and a clang; enough of them and it goes down
  if (!heliLive()) return;
  PH.hp--; PH.hurt = 1; Snd.metal(1300, 0.35, 0.14); addHeat(COP.crime.hurtCop);
  for (let k = 0; k < 10; k++) { const a = rand(0, TAU), s = rand(40, 200); addP({ x: PH.x, y: PH.y, z: PH.h + 20, vz: rand(-40, 80), grav: 220, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.15, 0.35), max: 0.35, s0: 2.6, s1: 0.6, col: '#ffe27a', drag: 4 }); }
  if (PH.hp <= 0) heliDown(false); else toast('HELICOPTER HIT ' + (Math.round(COP.heliSniper) - PH.hp) + ' / ' + Math.round(COP.heliSniper));
}
function heliDown(byAA) {                // it spins down; the next one comes only after a while
  if (!heliLive()) return;
  Object.assign(PH, { mode: 'fall', vh: byAA ? 20 : 0, spin: byAA ? 3 : 1.5, sees: false, burst: 0, next: gameT + COP.heliAgain * 60 });
  addHeat(COP.crime.heliDown); toast('POLICE HELICOPTER DOWN!');
}
function heliFall(dt) {
  PH.vh -= 150 * dt; PH.h += PH.vh * dt; PH.spin = Math.min(9, PH.spin + 3 * dt); PH.ang += PH.spin * dt;
  const f = Math.exp(-0.5 * dt); PH.vx *= f; PH.vy *= f; PH.x += PH.vx * dt; PH.y += PH.vy * dt; PH.roll = 0.35 * Math.sin(gameT * 4); PH.pitch = -0.25;
  heliSmoke(PH.x, PH.y, PH.h + 26, true); if (Math.random() < 0.7) heliFire(PH.x, PH.y, PH.h + 22);
  const floor = roofAt(PH.x, PH.y, 30);
  if (PH.h <= floor + 4) {                                        // down: in the water it sinks; on a roof it burns there; in the street it blows up
    if (!floor && shoreDist(PH.x, PH.y) < -4) { splashFx(PH.x, PH.y, 30); Snd.boom(); PH.mode = 'off'; heliHide(); return; }
    if (floor > 20) { airBurst(PH.x, PH.y, floor + 14); PH.h = floor; } else { PH.h = 0; explosion(PH.x, PH.y, 150, RK_SRC, 1); }
    alertPeds(PH.x, PH.y, 500); PH.mode = 'wreck'; PH.wreckT = 45; PH.spin = 0;
  }
}
function heliBurn() {                    // the wreck burns a while
  if (dist(PH.x, PH.y, cam.x, cam.y) > 1500) return;
  if (Math.random() < 0.6) heliFire(PH.x + rand(-30, 30), PH.y + rand(-12, 12), PH.h + rand(6, 18)); if (Math.random() < 0.35) heliSmoke(PH.x + rand(-20, 20), PH.y, PH.h + 20, true);
}
function heliSmoke(x, y, z, dark) { addP({ x: x + rand(-4, 4), y: y + rand(-4, 4), z, vz: rand(10, 40), grav: 0, vx: rand(-14, 14), vy: rand(-14, 14), life: rand(1.2, 2.2), max: 2.2, s0: 8, s1: 26, col: dark ? '#22232b' : '#8d8f9c', drag: 1, alpha: dark ? 0.7 : 0.5 }); }
function heliFire(x, y, z) { addP({ x: x + rand(-6, 6), y: y + rand(-6, 6), z, vz: rand(25, 60), grav: 0, vx: rand(-20, 20), vy: rand(-20, 20), life: rand(0.25, 0.55), max: 0.55, s0: 9, s1: 2, col: pick(['#ff9d2b', '#ffd23f', '#ff5a1f']), drag: 2, alpha: 0.9 }); }

/* ---------- the model: white and police blue, a spinning rotor, a searchlight under the nose, red and blue strobes ---------- */
const HELI_MATS = [new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ vertexColors: true })];
function makePoliceHeli() {
  const T = new GeoBuilder(), G = new GeoBuilder(), wh = _C('#eef1f6'), bl = _C('#1f3a8a'), dk = _C('#2a2d35'), gl = _C('#162238');
  for (const s of [-1, 1]) { box5(T, -22, 0, s * 13 - 1.2, 26, 2, s * 13 + 1.2, dk); for (const x of [-12, 12]) box5(T, x - 1, 1, s * 11 - 1, x + 1, 9, s * 11 + 1, dk); }   // the skids
  box5(T, -24, 8, -12, 22, 19, 12, bl); box5(T, -24, 19, -11.5, 16, 31, 11.5, wh); box5(T, 22, 8, -9, 31, 15, 9, bl);   // the cabin: blue below, white above
  box5(G, 16, 15, -10, 30, 29, 10, gl); box5(G, -6, 19.5, -11.8, 10, 29, 11.8, gl);                                         // the nose glass, the side windows
  box5(T, -18, 31, -7, 8, 38, 7, wh); box5(T, -2, 38, -2, 4, 42, 2, dk);                                                     // the engine, the mast
  box5(T, -96, 22, -3, -24, 29, 3, wh); box5(T, -96, 21.6, -3.3, -24, 24, 3.3, bl);                                          // the tail boom with its stripe
  box5(T, -101, 22, -1.5, -91, 47, 1.5, bl); box5(T, -94, 26, -12, -88, 28, 12, wh);                                         // the fin, the stabiliser
  box5(T, 20, 4, 4, 27, 8, 10, dk);                                                                                          // the searchlight's housing
  const m = new THREE.Mesh(mergeBuilders([T, G]), HELI_MATS), rot = new THREE.Group(), tail = new THREE.Group();   // its own materials: no see-through hole over you (js/10c xray) rot.position.set(1, 42, 0); tail.position.set(-96, 36, 4.5); m.add(rot); m.add(tail);
  const bladeM = mc('#1c1e24');
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(GB, bladeM), arm = new THREE.Group(); b.scale.set(64, 0.8, 4.5); b.position.x = 32; arm.rotation.y = k * Math.PI / 2; arm.add(b); rot.add(arm); }
  const disc = new THREE.Mesh(GCirc, new THREE.MeshBasicMaterial({ color: 0xcfd6e2, transparent: true, opacity: 0.22, depthWrite: false })); disc.scale.setScalar(64); disc.position.y = 0.3; rot.add(disc);
  const word = new THREE.Mesh(new THREE.PlaneGeometry(34, 9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: heliWordTex(), transparent: true })); word.position.set(-4, 31.3, 0); m.add(word);   // POLICE on the roof
  for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(GB, bladeM); b.scale.set(1.6, 18, 0.5); b.rotation.z = k * Math.PI / 2; tail.add(b); }
  const lens = new THREE.Mesh(GSph, mBas(0xfff6d8)); lens.scale.set(3, 1.6, 3); lens.position.set(24, 3.6, 7); m.add(lens);
  const red = new THREE.Mesh(GSph, mBas(0xff2a3a)), blue = new THREE.Mesh(GSph, mBas(0x3a6bff)), tip = new THREE.Mesh(GSph, mBas(0xff2a3a));
  red.scale.setScalar(2.2); red.position.set(-10, 32.5, -8); blue.scale.setScalar(2.2); blue.position.set(-10, 32.5, 8); tip.scale.setScalar(1.6); tip.position.set(-100, 48, 0); m.add(red); m.add(blue); m.add(tip);
  const halo = (on, col, s) => { const g = new THREE.Mesh(GP, glowMat(col, 1)); g.scale.setScalar(s); g.position.copy(on.position); g.position.y += 2; m.add(g); on.userData.halo = g; };   // the strobes light up the night
  halo(red, '#ff2a3a', 40); halo(blue, '#3a6bff', 40); halo(tip, '#ff2a3a', 20);
  const navs = [[-12.5, '#ff2a3a'], [12.5, '#2aff7a']].map(([z, col]) => { const n = new THREE.Mesh(GSph, mBas(col)); n.scale.setScalar(1.4); n.position.set(4, 20, z); halo(n, col, 10); m.add(n); return n; });   // navigation lights
  const orig = m.material; let wreck = false;
  m.rotation.order = 'YZX'; m.scale.setScalar(0.85); m.userData.lens = lens;
  m.userData.anim = (t, spin) => { if (!wreck) { rot.rotation.y = t * 9 * spin; tail.rotation.z = t * 22 * spin; } const ph = Math.floor(t * 4) % 2; red.visible = !wreck && ph === 0; blue.visible = !wreck && ph === 1; tip.visible = !wreck && Math.floor(t * 1.5) % 2 === 0; lens.visible = !wreck;
    for (const o of [red, blue, tip]) o.userData.halo.visible = o.visible; for (const o of navs) o.visible = o.userData.halo.visible = !wreck; };
  m.userData.wreck = on => { wreck = on; m.material = on ? [new THREE.MeshLambertMaterial({ color: 0x1c1a20 }), new THREE.MeshBasicMaterial({ color: 0x4a1c0c })] : orig; rot.visible = tail.visible = !on; };
  return m;
}
const HBEAM_GEO = new THREE.ConeGeometry(1, 1, 24, 1, true).translate(0, -0.5, 0), _hUp = new THREE.Vector3(0, -1, 0), _hDir = new THREE.Vector3(), _hLamp = new THREE.Vector3();
function gfxHeli(time) {
  if (PH.mode === 'off') return;
  if (!PH.mesh) {
    PH.mesh = makePoliceHeli(); scene.add(PH.mesh);
    PH.beam = new THREE.Mesh(HBEAM_GEO, new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(PH.beam);
    PH.pool = new THREE.Mesh(GP, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff1cc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(PH.pool);
    PH.shadow = new THREE.Mesh(GP, new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); scene.add(PH.shadow);
  }
  const m = PH.mesh, wreck = PH.mode === 'wreck', live = heliLive(), n = SKY.night;
  HELI_MATS[0].emissive.setScalar(wreck ? 0 : 0.16 * n);            // a little light of its own at night, so it never turns into a black shape
  m.visible = true; m.position.set(PH.x, PH.h + (wreck ? -2 : 0), PH.y); m.rotation.set(wreck ? 0.12 : PH.roll, -PH.ang, wreck ? -0.1 : PH.pitch);
  if (m.userData.wreck && (m.userData.isWreck !== wreck)) { m.userData.wreck(wreck); m.userData.isWreck = wreck; }
  m.userData.anim(time, PH.mode === 'fall' ? 0.6 : 1);
  const lit = live && PH.mode === 'hunt';                          // the searchlight: a cone from under the nose to its circle on the ground
  PH.beam.visible = PH.pool.visible = lit;
  if (lit) {
    m.updateMatrixWorld(); m.userData.lens.getWorldPosition(_hLamp); const lx = _hLamp.x, lh = _hLamp.y - 1, ly = _hLamp.z, g = groundH(PH.sx, PH.sy) + 1.2;
    _hDir.set(PH.sx - lx, g - lh, PH.sy - ly); const L = _hDir.length(); _hDir.multiplyScalar(1 / L);
    PH.beam.position.set(lx, lh, ly); PH.beam.quaternion.setFromUnitVectors(_hUp, _hDir); PH.beam.scale.set(COP.heliLight * 1.05, L, COP.heliLight * 1.05);
    PH.beam.material.opacity = lerp(0.035, 0.17, n) * (PH.sees ? 1.25 : 1);
    PH.pool.position.set(PH.sx, g, PH.sy); PH.pool.scale.setScalar(COP.heliLight * 2.6); PH.pool.material.opacity = lerp(0.32, 0.95, n);
  }
  const o = PH.h + 26; PH.shadow.visible = !wreck; PH.shadow.position.set(PH.x + o * 0.38, groundH(PH.x, PH.y) + 1, PH.y + o * 0.5); PH.shadow.scale.set(150, 1, 150);
  PH.shadow.material.opacity = lerp(0.42, 0.12, n) * clamp(1.4 - PH.h / 900, 0.3, 1);
}
function heliWordTex() {                 // POLICE in blue, to lie on the white roof
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 50px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1f3a8a'; g.fillText('POLICE', 128, 34);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function heliMapIcon(g, x, y, s, t) {   // the minimap and city map: a helicopter with a turning rotor, in police red and blue
  g.save(); g.translate(x, y); g.fillStyle = Math.floor(t * 4) % 2 ? '#ff3b5c' : '#3f6bff'; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, s * 0.25);
  g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.stroke();
  g.rotate(t * 9); g.beginPath(); g.moveTo(-s * 2, 0); g.lineTo(s * 2, 0); g.moveTo(0, -s * 2); g.lineTo(0, s * 2); g.stroke(); g.restore();
}
