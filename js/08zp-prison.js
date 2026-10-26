'use strict';
/* ---------- 6zp. IRON KEY: the prison and its ferry (js/01j prison; places table: Iron Key; the island and the models: js/10u) ----------
   Busted, you are let out of the prison gate on Iron Key (no longer at a police station) and walk down to the pier, where the ferry
   waits for you. The ferry - free, on foot only - shuttles all day between the island's pier and the ferry pier off the Palm Heights
   promenade, waiting at each end; walk aboard over its ramp and you sit on a bench on its open deck while it crosses (SKIP or E:
   straight across; E before it casts off: back ashore), stepping off onto the pier at the other end. While you are wanted it will not sail. Inside the walls is restricted like the military base: a warning
   counts down, then the alarm gives stars and the guards in the four watchtowers fire rifles from their posts at you anywhere on the
   island (so does shooting inside the walls, or at a guard). Prisoners in orange walk the yard; two guards stand at the gate. */
const PRX = { warnT: 0, alarm: false, outT: 0, freeT: -1e9, gate: 0, area: null, ball: 0, sayT: 0, visit: false, gateOpen: false, lock: false };   // visit, gateOpen, lock: a mission's (Quest 05: a visitor, the gate held open, a lockdown)
const FERRY = { s: 0, end: 0, state: 'dock', t: 0, v: 0, x: 0, y: 0, ang: 0, hold: false, rider: false, lx: 0, ly: 0, offT: 0, mesh: null };
const prisonOn = () => !!PRZ && feat('prison');
const inPrison = (x, y) => { const [x0, y0, x1, y1] = PRZ.walls, h = PRZ.wt / 2; return x > x0 + h && x < x1 - h && y > y0 + h && y < y1 - h; };
const prisonDisguise = () => feat('prisonUniform') && !!P.outfit && P.outfit.top === 'pri_guard' && P.outfit.bottoms === 'pri_guard_trousers';   // Dunn's uniform on (P5): the guards take you for one of them
const onIsland = (x, y) => !!PRZ && districtAt(x, y) === 'IRON KEY' && shoreDist(x, y) > -40;

/* ---------- the shared warning banner (the military base uses it too, js/08j) ---------- */
const WARN = { by: null };
function warnSet(by, html) { const el = $('warnBanner'); if (el.innerHTML !== html) el.innerHTML = html; el.hidden = false; WARN.by = by; }
function warnOff(by) { if (WARN.by === by) { $('warnBanner').hidden = true; WARN.by = null; } }

/* ---------- the guards and the prisoners ---------- */
function prisonPosts() {                  // js/10u genPrison: the tower guards on their walkways, the two at the gate
  const [x0, y0, x1, y1] = PRZ.walls, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, o = PRZ.ts / 2 + 3, [gx, gy] = PRZ.gate, rifle = () => WEAPONS.findIndex(w => w.id === 'sniper');
  for (const [tx, ty] of PRZ.towers) {
    const sx = Math.sign(mx - tx), sy = Math.sign(my - ty);
    addPost({ x: tx + sx * o, y: ty + sy * o, a: Math.atan2(my - ty, mx - tx), kind: 'tower', fixed: true, back: PLC.guardBack, need: prisonOn,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { pguard: true, arm: rifle(), hp: 60, shirt: '#2a3a5a', pants: '#1a2230', umb: false, z: PRZ.th - 26, speed: 0, cool: rand(0.5, 1.5), ang: po.a, state: 'post' }); return p; } });
  }
  for (const s of [-1, 1]) addPost({ x: gx + s * 46, y: gy + 34, a: Math.PI / 2, kind: 'cop', back: PLC.guardBack, need: prisonOn });
}
function towerStep(p, dt) {               // js/08j postStep: a tower guard stays up there; on the alarm he fires at you anywhere on the island
  const po = p.post; p.x = po.x; p.y = po.y; p.vx = p.vy = 0; p.cool -= dt;
  const tgt = P.car || P, d = dist(p.x, p.y, tgt.x, tgt.y);
  if (PRX.alarm && prisonOn() && !P.dead && onIsland(tgt.x, tgt.y) && d < PLC.towerRange * 1.4) {
    p.ang = p.hd = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    if (d < PLC.towerRange && p.cool <= 0 && prisonSees(p, tgt, d)) prisonShoot(p, tgt, d);
  } else p.ang = p.hd = po.a + 0.6 * Math.sin(gameT * 0.3 + po.x);
  return true;
}
function prisonSees(p, tgt, d) {          // from up in the tower: a wall or a block hides you only when it stands close enough to you to be in the way
  const dx = (tgt.x - p.x) / d, dy = (tgt.y - p.y) / d, eye = p.z || 1; let clear = true;
  buildingsAlong(p.x, p.y, tgt.x, tgt.y, rc => {
    if (!clear) return; const t = raySolid(p.x, p.y, dx, dy, rc); if (!(t < d - 10)) return;
    if (!rc.ph || t > d * (1 - Math.min(1, rc.ph / eye))) clear = false;    // rc.ph: its height (js/10u); the line of sight is that low there
  });
  return clear;
}
function prisonShoot(p, tgt, d) {
  p.cool = rand(1.4, 2.4); p.flash = 0.08;
  tracers.push({ x1: p.x + Math.cos(p.ang) * 14, y1: p.y + Math.sin(p.ang) * 14, x2: tgt.x + rand(-12, 12), y2: tgt.y + rand(-12, 12), life: 0.12 });
  const v = clamp(1 - dist(p.x, p.y, cam.x, cam.y) / 1400, 0.15, 1); Snd.burst(0.35, 2200, 90, 0.45 * v); Snd.tone(110, 34, 0.28, 0.22 * v, 'sawtooth');
  if (Math.random() < PLC.towerAcc * (1.3 - 0.6 * clamp(d / PLC.towerRange, 0, 1))) { if (P.car) damageCar(P.car, PLC.towerDmg * 4, false); else damagePlayer(PLC.towerDmg); }
}
function prisonYard() {                   // the prisoners: walking about the yard while you are near
  if (!PRX.area) { const [a0, b0, a1, b1] = PRZ.yard; PRX.area = { k: 'promenade', g: { o: [[a0, b0], [a1, b0], [a1, b1], [a0, b1]], h: [] }, bb: [a0, b0, a1, b1] }; }
  const A = PRX.area; if (dist(P.x, P.y, (A.bb[0] + A.bb[2]) / 2, (A.bb[1] + A.bb[3]) / 2) > 1300) return;
  let n = 0; for (const p of peds) if (!p.dead && p.area === A) n++;
  if (n >= PLC.prisoners) return;
  const q = randomIn(A.g, (x, y) => strollOk(A, x, y)); if (!q) return;
  const p = makePed(q[0], q[1]); Object.assign(p, { stroll: true, area: A, prisoner: true, shirt: PRI_ORANGE, pants: PRI_ORANGE, umb: false, arm: -1 }); strollTarget(p); peds.push(p);
}

/* ---------- the searchlights (both modes; mode searchlights): caught in a beam at night, the alarm; a tower's power box cut, its light is out till morning ---------- */
const PBOX = [];                           // { x, y, i (its tower), cut }
const searchOn = () => prisonOn() && feat('searchlights');
function prisonBoxes() {                   // one at each tower's foot, outside the walls
  if (PBOX.length || !PRZ) return PBOX; const [x0, y0, x1, y1] = PRZ.walls;
  PRZ.towers.forEach(([tx, ty], i) => PBOX.push({ x: tx + (tx < (x0 + x1) / 2 ? -1 : 1) * 30, y: ty + (ty < (y0 + y1) / 2 ? -1 : 1) * 30, i, cut: false }));
  return PBOX;
}
function prisonBoxKey() {                  // E by an uncut power box (on foot)
  if (!searchOn() || P.car || P.dead || P.act || state !== 'play') return null;
  let best = null; for (const b of prisonBoxes()) if (!b.cut && dist(b.x, b.y, P.x, P.y) < 22 && (!best || dist(b.x, b.y, P.x, P.y) < dist(best.x, best.y, P.x, P.y))) best = b;
  return best;
}
function prisonBoxUse(b) {
  b.cut = true; Snd.tone(220, 60, 0.5, 0.12, 'sawtooth'); popup(P.x, P.y - 14, 'POWER CUT', '#ffd23f');
  for (let k = 0; k < 16; k++) { const a = rand(0, TAU), v = rand(30, 110); addP({ x: b.x, y: b.y, z: rand(6, 10), vz: rand(20, 80), grav: 260, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.7), max: 0.7, s0: 1.8, s1: 0.4, col: pick(['#ffd23f', '#cfe6ff', '#ffffff']), drag: 1, hold: true }); }
}
function searchTick(dt) {                  // prisonTick: who the beams catch; the boxes back on in the morning
  const boxes = prisonBoxes(); if (SKY.hour >= 6 && SKY.hour < 20) for (const b of boxes) b.cut = false;
  const Pp = PRI.parts, me = P.car || P;
  if (!searchOn() || !Pp || SKY.night <= 0.3 || P.dead || state !== 'play' || PRX.alarm || PRX.visit || prisonDisguise() || !onIsland(me.x, me.y)) { PRX.litT = 0; return; }
  const lit = Pp.lights.some((L, k) => !boxes[k].cut && L.cx !== undefined && ((me.x - L.cx) / 34) ** 2 + ((me.y - L.cy) / 22) ** 2 < 1);
  PRX.litT = lit ? (PRX.litT || 0) + dt : 0;
  if (PRX.litT > PLC.searchCatch) { toast('CAUGHT IN THE SEARCHLIGHT', true); prisonAlarm(); }
  if (!PRX.boxHint && prisonBoxKey()) { PRX.boxHint = true; toast("THE TOWER'S POWER BOX - E: CUT IT"); } else if (!prisonBoxKey()) PRX.boxHint = false;
}

/* ---------- the restricted area and the alarm ---------- */
function prisonAlarm() {
  if (!prisonOn() || PRX.alarm || RAMP.on) return;
  PRX.alarm = true; PRX.outT = 0; forceWanted(PLC.prisonStars); toast('PRISON ALARM!', true); Snd.tone(440, 880, 0.6, 0.15, 'sawtooth');
}
const prisonHurt = (x, y) => { if (PRZ && inPrison(x, y)) prisonAlarm(); };   // js/06: a shot or a blast of yours inside the walls
function prisonRelease() {                // js/08b respawn: busted - let out of the gate, the ferry waiting at the island
  const [rx, ry] = PRZ.release; PRX.freeT = gameT; PRX.left = false; PRX.warnT = 0; PRX.alarm = false; warnOff('prison');
  FERRY.end = 1; FERRY.s = PRI.route.L; FERRY.state = 'dock'; FERRY.v = 0; FERRY.hold = true; FERRY.t = PLC.ferryWait; FERRY.rider = false; P.ferry = null;
  setTimeout(() => toast('LET OUT OF IRON KEY - THE FERRY WAITS AT THE PIER'), 1200);
  return { x: rx, y: ry, ang: Math.PI / 2 };
}
function prisonTick(dt) {                 // js/15 update
  if (!PRZ) return;
  const on = prisonOn(), me = P.car || P, inside = on && !P.dead && state === 'play' && inPrison(me.x, me.y), since = gameT - PRX.freeT;
  if (since < 30) { if (state === 'play' && !P.dead && !inside) PRX.left = true; } else PRX.left = false;
  const free = (since < 30 && !PRX.left) || PRX.visit || prisonDisguise();   // let out: no warning until you have left the walls (or for half a minute); a visitor, or one of the guards (the uniform): none
  if (inside && !free && !RAMP.on) {
    PRX.outT = 0;
    if (!PRX.alarm) { PRX.warnT += dt; warnSet('prison', 'RESTRICTED AREA<br><small>LEAVE NOW ' + Math.max(0, Math.ceil(PLC.prisonWarn - PRX.warnT)) + '</small>'); if (PRX.warnT >= PLC.prisonWarn) prisonAlarm(); }
    else warnOff('prison');
  } else {
    PRX.warnT = 0; warnOff('prison');
    if (PRX.alarm && !inside && (PRX.outT += dt) > PLC.prisonCalm) PRX.alarm = false;
  }
  // the gate: open while you are let out (and until you are clear of it)
  const [gx, gy] = PRZ.gate, near = dist(P.x, P.y, gx, gy) < 50, want = on && (PRX.gateOpen || gameT - PRX.freeT < 4 || (gameT - PRX.freeT < 40 && (inside || near)));
  PRX.gate = clamp(PRX.gate + (want || (PRX.gate > 0 && near) ? dt : -dt) * 0.7, 0, 1);
  if (PRI.gateRc) PRI.gateRc.off = PRX.gate > 0.6;
  if (on) prisonYard();
  searchTick(dt);
  ferryTick(dt, on);
}

/* ---------- the ferry ---------- */
const _fq = {};
function ferryTick(dt, on) {
  const F = FERRY, R = PRI.route; if (!R) return;
  if (P.ferry && (P.dead || P.car || !on)) { P.ferry = null; F.rider = false; P.z = 0; }
  if (!on) { F.state = 'dock'; F.hold = false; return; }
  if (F.state === 'dock') {
    if (!F.rider) ferryBoard();
    if (F.rider && F.fresh && F.t > PLC.ferryBoard) F.t = PLC.ferryBoard;   // just came aboard here: off soon
    if (F.rider && !F.fresh && (F.offT -= dt) <= 0) ferryOff();      // arrived: you get up and step off onto the pier
    if (F.hold) { if (F.rider) F.hold = false; }
    else F.t -= dt;
    if (F.t <= 0) {
      if (F.rider && ((P.stars > 0 && feat('police')) || PRX.lock)) { F.t = 1.5; if (gameT - (F.told || 0) > 4) { F.told = gameT; toast(PRX.lock ? 'LOCKDOWN - THE FERRY IS HELD' : 'THE FERRY WON\'T SAIL WHILE YOU ARE WANTED'); } }
      else { F.state = 'sail'; F.v = 0; F.fresh = false; if (dist(F.x, F.y, cam.x, cam.y) < 1400) Snd.tone(110, 98, 1.1, 0.16, 'sawtooth'); }   // the horn
    }
  }
  if (F.state === 'sail') {
    const dir = F.end ? -1 : 1, left = F.end ? F.s : R.L - F.s, vmax = PLC.ferrySpeed, acc = vmax / 4;
    F.v = Math.min(F.v + acc * dt, vmax, Math.sqrt(2 * acc * Math.max(0, left)) + 4);
    F.s = clamp(F.s + dir * F.v * dt, 0, R.L);
    if ((dir > 0 && F.s >= R.L) || (dir < 0 && F.s <= 0)) { F.end = 1 - F.end; F.state = 'dock'; F.v = 0; F.t = PLC.ferryWait; F.offT = 1; }
  }
  ferryAt(F.s, _fq); F.x = _fq.x; F.y = _fq.y; F.ang = _fq.ang;
  if (F.rider) ferryCarry();
  $('ferrySkip').hidden = !(F.rider && F.state === 'sail' && state === 'play');
}
function ferryLocal(x, y) { const F = FERRY, dx = x - F.x, dy = y - F.y, ca = Math.cos(F.ang), sa = Math.sin(F.ang); return [dx * ca + dy * sa, -dx * sa + dy * ca]; }
function ferryBoard() {                   // docked: walking over the ramp from the pier puts you aboard, on a bench by the ramp
  if (P.car || P.dead || P.knocked || state !== 'play') return;
  const L = PRZ.ferry.len / 2, W = PRZ.ferry.wid / 2, [lx, ly] = ferryLocal(P.x, P.y), side = FERRY.end ? 1 : -1;
  if (Math.abs(ly) < W - 6 && lx * side < L - 2 && lx * side > L - 40) {
    const s = Math.cos(FERRY.ang) >= 0 ? 1 : -1;                 // the bench on the side nearer the camera (seen from the south): you show on the deck, not over the rail
    Object.assign(FERRY, { rider: true, fresh: true, lx: side * (L - 22), ly: s * (W - 10), seatS: s }); P.ferry = FERRY; P.z = 9.6; P.vx = P.vy = 0; P.act = null; P.swing = null; P.swim = false;   // a swimmer can climb aboard too
    toast('ABOARD - TAKE A SEAT');
  }
}
function ferryCarry() {                   // you go where the ferry goes, seated on the bench by the rail, facing the deck
  const F = FERRY, ca = Math.cos(F.ang), sa = Math.sin(F.ang), dir = F.state === 'sail' ? (F.end ? -1 : 1) : 0;
  P.x = F.x + F.lx * ca - F.ly * sa; P.y = F.y + F.lx * sa + F.ly * ca; P.z = 9.6; P.ang = F.ang - (F.seatS || -1) * Math.PI / 2;
  if (dir) { const ux = Math.cos(_fq.ang), uy = Math.sin(_fq.ang); P.vx = ux * F.v * dir; P.vy = uy * F.v * dir; } else P.vx = P.vy = 0;
}
function ferryMove(dt) { ferryCarry(); }  // js/06 updatePlayer: aboard, you stay in your seat - the stick does nothing
function ferryOff() {                     // up from the bench and off over the ramp onto the pier the ferry lies at
  const F = FERRY, p = F.end ? [(PRZ.head[0] + PRZ.head[2]) / 2, PRZ.head[1] - 6] : [PRZ.mhead[0] - 10, (PRZ.mhead[1] + PRZ.mhead[3]) / 2];
  F.rider = false; F.fresh = false; P.ferry = null; P.swim = false; P.z = 0; P.x = p[0]; P.y = p[1]; P.vx = P.vy = 0;
  P.ang = F.end ? -Math.PI / 2 : Math.PI; cam.x = P.x; cam.y = P.y;
  toast(F.end ? 'IRON KEY' : 'PALM HEIGHTS FERRY PIER');
}
function ferryUse() {                     // E or the enter button aboard: sailing - straight across; still docked - back ashore
  if (!FERRY.rider) return;
  if (FERRY.state === 'sail') ferrySkip(); else ferryOff();
}
function ferrySkip() {                    // SKIP (or E): straight across, and off
  const F = FERRY; if (!F.rider || F.state !== 'sail') return;
  F.s = F.end ? 0 : PRI.route.L; F.end = 1 - F.end; F.state = 'dock'; F.v = 0; F.t = PLC.ferryWait; F.offT = 0.3; ferryAt(F.s, _fq); F.x = _fq.x; F.y = _fq.y; F.ang = _fq.ang; ferryCarry();
  cam.x = P.x; cam.y = P.y;
}
$('ferrySkip').addEventListener('click', ferrySkip);
function prisonReset() {                  // js/15 resetGame: the ferry at the Palm Heights pier, no alarm
  for (const b of PBOX) b.cut = false; PRX.litT = 0;                  // the power boxes back on
  Object.assign(PRX, { warnT: 0, alarm: false, outT: 0, freeT: -1e9, gate: 0, left: false, visit: false, gateOpen: false, lock: false }); warnOff('prison');
  Object.assign(FERRY, { s: 0, end: 0, state: 'dock', t: PLC.ferryWait, v: 0, hold: false, rider: false, lx: 0, ly: 0 }); P.ferry = null;
  if (PRI.route) { ferryAt(0, _fq); FERRY.x = _fq.x; FERRY.y = _fq.y; FERRY.ang = _fq.ang; }
  if (PRI.gateRc) PRI.gateRc.off = false; $('ferrySkip').hidden = true;
}

/* ---------- js/13: the gate, the searchlights, the ferry ---------- */
const _prv = new THREE.Vector3(), _pru = new THREE.Vector3(0, 1, 0);
function gfxPrison(time) {
  if (!PRZ) return;
  const on = prisonOn(), Pp = PRI.parts;
  if (Pp && PRI.lm && PRI.lm.mesh) {
    const [gx, , gw] = PRZ.gate; Pp.gate.position.x = gx - PRI.lm.cx - PRX.gate * (gw - 4);
    const night = SKY.night > 0.3 && on, me = P.car || P, hunt = on && (PRX.alarm || PRX.warnT > 0) && onIsland(me.x, me.y);
    Pp.lights.forEach((L, k) => {
      const lit = (night || hunt) && !(searchOn() && prisonBoxes()[k].cut);   // its power box cut: dark till morning
      L.beam.visible = L.pool.visible = lit; L.head.material.color.setHex(lit ? 0xfff8e0 : 0x8a8f9c);
      if (!L.beam.visible) return;
      let px, py;
      if (hunt && dist(me.x, me.y, L.tx, L.ty) < 420) { px = me.x; py = me.y; }
      else { const a = time * 0.32 + L.ph, r = 120 + 70 * Math.sin(time * 0.19 + L.ph * 2); px = L.tx + Math.cos(a) * r; py = L.ty + Math.sin(a) * r; }
      L.cx = L.cx === undefined ? px : L.cx + (px - L.cx) * Math.min(1, 0.08); L.cy = L.cy === undefined ? py : L.cy + (py - L.cy) * Math.min(1, 0.08);
      const hx = L.tx - PRI.lm.cx, hz = L.ty - PRI.lm.cy, hy = PRZ.th - 1, gx2 = L.cx - PRI.lm.cx, gz2 = L.cy - PRI.lm.cy;
      L.pool.position.set(gx2, 1.6, gz2);
      _prv.set(hx - gx2, hy - 1.6, hz - gz2); const len = _prv.length(); _prv.normalize();
      L.beam.position.set((hx + gx2) / 2, (hy + 1.6) / 2, (hz + gz2) / 2); L.beam.scale.set(1, len, 1); L.beam.quaternion.setFromUnitVectors(_pru, _prv);
    });
  }
  const F = FERRY, near = on && dist(F.x, F.y, cam.x, cam.y) < 2600;
  if (near && !F.mesh) F.mesh = ferryMesh();
  if (F.mesh) { F.mesh.visible = near; if (near) { F.mesh.position.set(F.x, Math.sin(time * 1.3) * 0.7, F.y); F.mesh.rotation.set(Math.sin(time * 0.9) * 0.015, -F.ang, 0); } }
  if (Pp && PRI.lm && PRI.lm.mesh) prisonBall(time);
}
let PRI_BALL = null;
function prisonBall(time) {               // a basketball going up at the hoop from the free-throw line, now and then, while a prisoner is near it
  const [a0, b0, a1, b1] = PRZ.court, sx = a1 - 30, sy = (b0 + b1) / 2, hx = a1 + 4, near = peds.some(p => p.prisoner && !p.dead && dist(p.x, p.y, sx, sy) < 90);
  if (!PRI_BALL) { PRI_BALL = new THREE.Mesh(GSph, new THREE.MeshLambertMaterial({ color: 0xe0601a })); PRI_BALL.scale.setScalar(2.2); }
  if (PRI_BALL.parent !== PRI.lm.mesh) PRI.lm.mesh.add(PRI_BALL);
  PRI_BALL.visible = near && prisonOn(); if (!PRI_BALL.visible) return;
  const t = (time % 2.6) / 2.6, f = Math.min(1, t / 0.55), x = lerp(sx, hx, f), y = t < 0.55 ? 10 + 30 * Math.sin(f * Math.PI) + f * 22 : Math.abs(Math.sin((t - 0.55) / 0.45 * Math.PI * 2.5)) * (32 - (t - 0.55) * 60) + 2.2;
  PRI_BALL.position.set((t < 0.55 ? x : lerp(hx, sx, (t - 0.55) / 0.45)) - PRI.lm.cx, Math.max(2.2, y), sy - PRI.lm.cy);
}

/* ---------- the maps: the prison (bars) at the gate, the ferry pier (a boat) ---------- */
function prisonIcons(g, X, Y, q, inView) {
  if (!prisonOn()) return;
  { const x = X(PRZ.gate[0]), y = Y(PRZ.gate[1] - 60); if (inView(x, y)) {
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = PRI_ORANGE; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.fillStyle = '#16161c'; for (let k = -2; k <= 2; k++) g.fillRect(x + k * q * 0.36 - q * 0.07, y - q * 0.8, q * 0.14, q * 1.6); g.fillRect(x - q * 0.8, y - q * 0.1, q * 1.6, q * 0.2); } }
  { const x = X(PRZ.mpier[0] + 40), y = Y((PRZ.mpier[1] + PRZ.mpier[3]) / 2); if (inView(x, y)) {
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#2bf3ff'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.fillStyle = '#16161c'; g.beginPath(); g.moveTo(x - q * 0.8, y + q * 0.1); g.lineTo(x + q * 0.8, y + q * 0.1); g.lineTo(x + q * 0.5, y + q * 0.6); g.lineTo(x - q * 0.5, y + q * 0.6); g.closePath(); g.fill();
    g.fillRect(x - q * 0.35, y - q * 0.4, q * 0.7, q * 0.42); } }
  { const x = X(FERRY.x), y = Y(FERRY.y); if (inView(x, y)) { g.fillStyle = '#f4f4f6'; g.fillRect(x - q * 0.45, y - q * 0.45, q * 0.9, q * 0.9); } }
}
