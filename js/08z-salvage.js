'use strict';
/* ---------- 6z. DOCKSIDE SALVAGE: the crane, the crusher and the guard dog (the yard: js/10t; js/01j junkyard) ----------
   Drive a car onto the yellow-hatched spot inside the gate and get out: the crane turns, its magnet comes down and lifts the car,
   swings it over to the crusher and drops it in; the press comes down, a cube drops onto the pile and you are paid - the vehicle's
   scrap price (vehicles table: scrap), less for damage (places table: Junkyard). A car with no scrap price is left where it is.
   Crushing a police car is a crime when a cop sees it go in. Your own kept car, tuned or not, is crushed like any other.
   While the crane works on your car, and for a little while after you are paid, the dog is held back.
   The guard dog lies by its kennel; come into the yard on foot (or close to it) and it runs at you and bites until you are well away,
   it is killed (a gun, a swing, a car, a blast) - a new one comes later - or you get into a car. */
const JYR = { phase: 'idle', car: null, cand: null, t: 0, yaw: null, mag: 62, press: 0, cubes: [], dog: null, dogT: 0, hinted: null, crime: false, calmT: 0 };   // calmT: the dog is held back till then   // mag: the magnet's bottom, its height
const jyYaw = (x, y) => Math.atan2(y - SALV.crane[1], x - SALV.crane[0]);
function jyOnSpot(c) { const [sx, sy, sw, sl] = SALV.spot; return carCircles(c).every(q => Math.abs(q[0] - sx) < sw / 2 + 14 && Math.abs(q[1] - sy) < sl / 2 + 10); }
function jyPay(c) { const k = Math.max(0, Math.min(1, c.hp / c.maxhp)); return Math.round((c.t.scrap || 0) * (PLC.junkPayMin + (1 - PLC.junkPayMin) * k)); }
const jyIn = (x, y, m) => { const [x0, y0, x1, y1] = SALV.area; return x > x0 - (m || 0) && x < x1 + (m || 0) && y > y0 - (m || 0) && y < y1 + (m || 0); };
function salvTick(dt) {                   // js/15 update: the spot, the crane at work, the dog
  if (!SALV) return;
  if (!feat('junkyard')) { if (JYR.dog) JYR.dog.t.off = true; return; }
  const c = P.car;
  if (JYR.phase === 'idle') {
    if (c && !c.dead && jyOnSpot(c) && carSpeed(c) < 15) {            // on the spot: what the crane would pay
      JYR.cand = c;
      if (JYR.hinted !== c) { JYR.hinted = c; toast(c.t.scrap > 0 ? 'GET OUT AND THE CRANE TAKES IT: ' + money(jyPay(c)) + (c.tune ? ' - TUNING AND ALL' : '') : 'THE YARD DOES NOT TAKE A ' + c.t.name, !(c.t.scrap > 0)); }
    } else if (!c && JYR.cand) {                                      // you got out: if it still stands there, the crane takes it
      const k = JYR.cand; JYR.cand = null; JYR.hinted = null;
      if (cars.includes(k) && !k.dead && !k.driver && !k.hook && jyOnSpot(k) && k.t.scrap > 0 && carSpeed(k) < 15) jyStart(k);
    } else if (c !== JYR.cand) { JYR.cand = null; if (!c || !jyOnSpot(c)) JYR.hinted = null; }
  } else if (!JYR.stop) jyWork(dt * (JYR.rate || 1));             // M27: a quest can slow the crane (rate) or hold it (stop)
  jyDog(dt);
}
function jyStart(k) {
  JYR.car = k; JYR.phase = 'turn'; JYR.t = 0; k.hook = true; k.vx = k.vy = k.av = 0; k.thr = k.str = 0; k.air = 0;
  if (k.home) { const { h, k: i } = k.home; h.live[i] = null; h.keep[i] = null; k.home = null; k.keep = false; }   // a safehouse car: not kept any more
  JYR.crime = false; Snd.tone(330, 300, 0.25, 0.08, 'square');
}
function jyWork(dt) {
  const k = JYR.car, [cx, cy, R] = SALV.crane, [kx, ky] = SALV.crusher, ease = u => u * u * (3 - 2 * u);
  if (k && (k.dead || !cars.includes(k))) { if (cars.includes(k)) { k.hook = false; k.vz = 0; } JYR.car = null; JYR.phase = 'back'; JYR.t = 0; }   // blown up on the magnet: it drops
  const aS = jyYaw(SALV.spot[0], SALV.spot[1]), aK = jyYaw(kx, ky), turn = (to, rate) => { const d = angDiff(JYR.yaw, to), s = rate * dt; JYR.yaw += Math.abs(d) < s ? d : Math.sign(d) * s; return Math.abs(d) < s; };
  const hold = () => { k.x = cx + Math.cos(JYR.yaw) * R; k.y = cy + Math.sin(JYR.yaw) * R; };
  const half = PLC.junkLift / 2, top = JY_BOOM_H - 12, carry = () => { JYR.mag = k.air + 21; }; JYR.t += dt;
  if (JYR.phase === 'turn') { JYR.mag += (top - JYR.mag) * Math.min(1, dt * 3); if (turn(aS, 1.2)) { JYR.phase = 'lower'; JYR.t = 0; JYR.x0 = k.x; JYR.y0 = k.y; JYR.a0 = k.ang; } }
  else if (JYR.phase === 'lower') {                                   // the magnet comes down; the car is pulled under it
    const u = ease(Math.min(1, JYR.t / half)); JYR.mag = lerp(top, 21, u); k.x = lerp(JYR.x0, cx + Math.cos(JYR.yaw) * R, u * 0.6); k.y = lerp(JYR.y0, cy + Math.sin(JYR.yaw) * R, u * 0.6);
    if (JYR.t >= half) { JYR.phase = 'lift'; JYR.t = 0; Snd.metal(160, 0.5, 0.18); Snd.thud(60); JYR.x0 = k.x; JYR.y0 = k.y; }
  } else if (JYR.phase === 'lift') {                                  // up it goes, swinging in under the boom
    const u = ease(Math.min(1, JYR.t / half)); k.air = u * 46; carry(); k.x = lerp(JYR.x0, cx + Math.cos(JYR.yaw) * R, u); k.y = lerp(JYR.y0, cy + Math.sin(JYR.yaw) * R, u);
    if (JYR.t >= half) { JYR.phase = 'swing'; JYR.t = 0; JYR.ya = JYR.yaw; JYR.ka = k.ang; }
  } else if (JYR.phase === 'swing') {                                 // over to the crusher, turning with the boom
    const u = ease(Math.min(1, JYR.t / PLC.junkSwing)); JYR.yaw = JYR.ya + angDiff(JYR.ya, aK) * u; hold(); carry(); k.ang = JYR.ka + angDiff(JYR.ya, aK) * u;
    if (JYR.t >= PLC.junkSwing) { JYR.phase = 'drop'; JYR.t = 0; JYR.crime = !!k.t.cop && jyCopSees(kx, ky + SALV.crusher[3] / 2 + 14); }   // a cop who can see the crusher's mouth
  } else if (JYR.phase === 'drop') {                                  // down into the bed
    const u = ease(Math.min(1, JYR.t / 0.8)); k.air = lerp(46, 12.5, u); hold(); carry();
    if (JYR.t >= 0.8) { JYR.phase = 'crush'; JYR.t = 0; Snd.thud(120); Snd.metal(120, 0.8, 0.2); }
  } else if (JYR.phase === 'crush') {                                 // the press comes down: the car folds into a cube
    const u = Math.min(1, JYR.t / PLC.junkCrush); JYR.press = ease(u); JYR.mag += (top - JYR.mag) * Math.min(1, dt * 2);
    if (k.mesh) k.mesh.scale.set(lerp(1, 0.32, ease(u)), lerp(1, 0.4, ease(u)), lerp(1, 0.55, ease(u)));
    if (Math.random() < dt * 8) { Snd.metal(rand(150, 400), 0.3, 0.12); spark(kx + rand(-30, 30), ky + rand(-20, 20), 3); }
    if (JYR.t >= PLC.junkCrush) jyDone(k);
  } else if (JYR.phase === 'back') {                                  // the press goes up, the crane turns back to the spot
    JYR.press = Math.max(0, JYR.press - dt / 0.9); JYR.mag += (top - JYR.mag) * Math.min(1, dt * 2); if (turn(aS, 0.9) && JYR.press <= 0) JYR.phase = 'idle';
  }
}
function jyCopSees(x, y) { let seen = false; forCops((u, ex, ey) => { if (!seen && dist(ex, ey, x, y) < COP.sight * SKY.vis && losClear(ex, ey, x, y)) seen = true; }); return seen; }
function jyDone(k) {                      // a cube on the pile, the money in your pocket
  const pay = jyPay(k), [kx, ky] = SALV.crusher, i = cars.indexOf(k);
  if (i >= 0) cars.splice(i, 1); if (k.mesh) { scene.remove(k.mesh); if (k.m && k.m.body) k.m.body.dispose(); k.mesh = null; }
  JYR.cubes.push(k.color); while (JYR.cubes.length > PLC.junkCubes) JYR.cubes.shift();
  addScore(pay, kx, ky, 'SCRAP ' + k.t.name); Snd.pickup(); Snd.thud(90); STAT.crushed++;
  if (JYR.crime) addHeat(COP.crime.stealCop);                          // a cop saw the police car go in
  JYR.car = null; JYR.phase = 'back'; JYR.t = 0; JYR.calmT = gameT + 15;   // a paying customer: the dog is held back a while
}

/* ---------- the guard dog: a target for bullets, blasts and swings (js/08j TARGETS) ---------- */
function jyDogMake() {                    // js/10t genSalvage: the dog by its kennel
  const [dx, dy] = SALV.kennel, d = { x: dx + 16, y: dy - 14, ang: -Math.PI / 2, state: 'lie', biteT: 0, walk: 0, barkT: 0, mesh: null };
  d.t = addTarget({ x: d.x, y: d.y, reach: 20, hp: PLC.dogHp, maxhp: PLC.dogHp, melee: true, circles: () => [[d.x, d.y, 8]], hit: (n) => jyDogHurt(n) });
  JYR.dog = d; JYR.dogT = 0; return d;
}
function jyDogHurt(n) {
  const d = JYR.dog; if (!d || d.state === 'dead') return;
  d.t.hp -= n; bloodFx(d.x, d.y, 4, rand(0, TAU)); Snd.tone(900, 500, 0.12, 0.08, 'sawtooth');
  if (d.t.hp <= 0) { d.state = 'dead'; d.t.dead = d.t.off = true; JYR.dogT = PLC.dogBack; Snd.tone(600, 200, 0.3, 0.08, 'sawtooth'); }
  else d.state = 'chase';
}
function jyDog(dt) {
  const d = JYR.dog; if (!d) return;
  const [kx, ky] = SALV.kennel, home = [kx + 16, ky - 14], near = PLC.dogNear;
  if (d.state === 'dead') {                                         // a new dog after a while, once you are out of sight of the yard
    if ((JYR.dogT -= dt) <= 0 && dist(P.x, P.y, home[0], home[1]) > 900) { d.state = 'lie'; d.x = home[0]; d.y = home[1]; d.t.hp = PLC.dogHp; d.t.dead = d.t.off = false; }
    d.t.x = d.x; d.t.y = d.y; return;
  }
  for (const c of cars) if (!c.dead && carSpeed(c) > 25 * KMH && Math.abs(c.x - d.x) < 60 && Math.abs(c.y - d.y) < 60 && carCircles(c).some(q => Math.hypot(q[0] - d.x, q[1] - d.y) < q[2] + 6)) { jyDogHurt(1e9); return; }   // run over
  const calm = JYR.phase !== 'idle' || gameT < JYR.calmT;            // the crane is at work on your car, or you were just paid: the dog stays back
  const foot = !P.car && !P.dead && state === 'play', inRange = foot && !calm && jyIn(P.x, P.y, near), far = !foot || calm || !jyIn(P.x, P.y, near * 2);
  if (d.state !== 'chase' && inRange) { d.state = 'chase'; d.barkT = 0; }
  if (d.state === 'chase' && far) d.state = 'home';
  let tx = home[0], ty = home[1], spd = PLC.dogSpeed * MPS * 0.5;
  if (d.state === 'chase') { tx = P.x; ty = P.y; spd = PLC.dogSpeed * MPS; }
  const dd = dist(d.x, d.y, tx, ty);
  if (d.state === 'chase' && dd < 16) {                             // on you: it bites
    d.ang = Math.atan2(ty - d.y, tx - d.x); d.moving = false;
    if ((d.biteT -= dt) <= 0) { d.biteT = 1; damagePlayer(PLC.dogBite); bloodFx(P.x, P.y, 3, d.ang); Snd.tone(420, 180, 0.08, 0.1, 'square'); }
  } else if (dd > 2) {
    const ux = (tx - d.x) / dd, uy = (ty - d.y) / dd, st = Math.min(dd, spd * dt), nx = d.x + ux * st, ny = d.y + uy * st;
    if (!pedBlocked(nx, ny)) { d.x = nx; d.y = ny; } else if (!pedBlocked(nx, d.y)) d.x = nx; else if (!pedBlocked(d.x, ny)) d.y = ny;   // round what is in the way
    d.ang = Math.atan2(uy, ux); d.walk += st; d.moving = true;
  } else { d.moving = false; if (d.state === 'home') { d.state = 'lie'; d.ang = -Math.PI / 2; } }
  if (d.state === 'chase' && (d.barkT -= dt) <= 0) { d.barkT = rand(0.5, 1.1); const v = clamp(1 - dist(d.x, d.y, cam.x, cam.y) / 700, 0, 1); if (v > 0.05) { Snd.tone(330, 210, 0.11, 0.12 * v, 'square'); Snd.burst(0.08, 1100, 500, 0.08 * v, 'bandpass', 0, 1.5); } }
  d.t.x = d.x; d.t.y = d.y;
}
function salvReset() {                    // js/15 resetGame: the crane at rest, no cubes, the dog by its kennel
  if (JYR.car && JYR.car.mesh) JYR.car.mesh.scale.set(1, 1, 1);
  Object.assign(JYR, { rate: 1, stop: false, phase: 'idle', car: null, cand: null, t: 0, yaw: SALV ? jyYaw(SALV.spot[0], SALV.spot[1]) : 0, mag: JY_BOOM_H - 12, press: 0, cubes: [], hinted: null });
  if (JYR.dog) { const [kx, ky] = SALV.kennel; Object.assign(JYR.dog, { x: kx + 16, y: ky - 14, state: 'lie', biteT: 0 }); JYR.dog.t.hp = PLC.dogHp; JYR.dog.t.dead = JYR.dog.t.off = false; }
}

/* ---------- js/13: the crane, the press, the cubes, the dog ---------- */
const JY_CUBE = new THREE.BoxGeometry(14, 11, 14);
function gfxSalvage(time) {
  const J = JY.parts; if (!SALV || !JY.lm || !JY.lm.mesh || !J) { if (JYR.dog && JYR.dog.mesh) JYR.dog.mesh.visible = false; return; }
  if (JYR.yaw === null) JYR.yaw = jyYaw(SALV.spot[0], SALV.spot[1]);
  J.rot.rotation.y = -JYR.yaw;
  const tipY = JY_BOOM_H - 2, my = Math.min(tipY - 4, JYR.mag);
  J.mag.position.set(J.R, my, 0); J.cable.position.set(J.R, (tipY + my) / 2, 0); J.cable.scale.y = Math.max(1, tipY - my);
  J.press.position.y = lerp(50, 22, JYR.press);
  if (J.built !== JYR.cubes.join()) {                               // the pile: three by four, two high
    J.built = JYR.cubes.join(); for (const o of J.cubes.children.slice()) { J.cubes.remove(o); o.material.dispose(); }
    const [px, py] = SALV.pile;
    JYR.cubes.forEach((col, i) => { const l = Math.floor(i / 6), r = i % 6, m = new THREE.Mesh(JY_CUBE, new THREE.MeshLambertMaterial({ color: new THREE.Color(col).multiplyScalar(0.7) }));
      m.position.set(px - JY.lm.cx + (r % 2 ? 9 : -9), 5.5 + l * 11, py - JY.lm.cy - 22 + Math.floor(r / 2) * 18); m.rotation.y = (i * 0.37) % 0.4 - 0.2; J.cubes.add(m); });
  }
  const d = JYR.dog; if (!d) return;
  if (!d.mesh) d.mesh = jyDogMesh();
  d.mesh.visible = true; d.mesh.position.set(d.x, groundH(d.x, d.y), d.y); d.mesh.rotation.y = -d.ang;
  const dead = d.state === 'dead', lie = d.state === 'lie' && !d.moving, sw = d.moving ? Math.sin(d.walk * 0.45) * 0.7 : 0;
  d.mesh.rotation.z = dead ? Math.PI / 2 : 0; d.mesh.position.y += dead ? 3 : 0; d.mesh.userData.body.position.y = lie ? 3.4 : 6;
  d.mesh.userData.legs.forEach((l, i) => { l.rotation.z = (i % 2 ? sw : -sw); l.visible = !lie; });
}
function jyDogMesh() {                    // a German-shepherd-ish guard dog: tan and black, a red collar
  const g = new THREE.Group(), body = new THREE.Group(), tan = mc(0xb07a3a), blk = mc(0x2a2018); g.add(body);
  part(body, GB, tan, 12, 5, 5, 0, 0, 0); part(body, GB, blk, 9, 1.4, 5.2, -1, 2.6, 0);
  part(body, GB, tan, 5, 4.6, 4.4, 7.5, 2.6, 0); part(body, GB, blk, 3, 2.2, 2.6, 10.6, 2, 0); part(body, GB, mc(0xd0323f), 1, 1.2, 4.8, 5.4, 1.6, 0);
  for (const s of [-1, 1]) part(body, GB, blk, 1.2, 2.6, 1.2, 7.4, 5.6, s * 1.6);
  const tail = part(body, GB, tan, 6, 1.4, 1.4, -8, 1.6, 0); tail.rotation.z = 0.5;
  const legs = [];
  for (const [x, z] of [[4.5, 1.8], [4.5, -1.8], [-4.5, 1.8], [-4.5, -1.8]]) { const lp = new THREE.Group(); lp.position.set(x, 4, z); part(lp, GB, tan, 1.6, 6, 1.6, 0, -3, 0); g.add(lp); legs.push(lp); }
  part(g, GCirc, E.shadow, 8, 1, 4, 0, 0.6, 0);
  g.userData = { body, legs }; scene.add(g); return g;
}

/* ---------- js/14: a magnet over a cube at the gate on the maps ---------- */
function salvIcons(g, X, Y, q, inView) {
  if (!SALV || !feat('junkyard')) return;
  const x = X(SALV.gate[0]), y = Y(SALV.gate[1] - 40); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#ffb02e'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = '#16161c'; g.fillRect(x - q * 0.6, y - q * 0.75, q * 1.2, q * 0.35); g.fillRect(x - q * 0.1, y - q * 0.95, q * 0.2, q * 0.25);   // the magnet on its cable
  g.fillStyle = '#d0323f'; g.fillRect(x - q * 0.6, y - q * 0.45, q * 1.2, q * 0.12);
  g.fillStyle = '#4a4e5c'; g.fillRect(x - q * 0.45, y + q * 0.05, q * 0.9, q * 0.75);                                                       // the cube
}
