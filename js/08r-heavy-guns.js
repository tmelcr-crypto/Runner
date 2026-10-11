'use strict';
/* ---------- 6r. HEAVY GUNS: the police tank's rockets, the APC's turret machine gun ----------
   Both turn a turret toward their target (js/11 draws it). The tank at the top wanted level fires a rocket at you every few seconds
   - only with a clear line and within range, aimed a little ahead of a moving car (police table: Tank and APC); its blast is the
   rocket launcher's and hurts whoever is near, but it is not your crime. The APC's turret gun fires belt after belt (the machine
   gun's reload between them): driving one, FIRE shoots it at the nearest target ahead; a police APC fires bursts at you when its crew
   sees you. Modes: tankRockets, apcGun. */
const RK_COP = { byPlayer: false };                                 // a police rocket: nobody blames you for its blast
const apcGunW = () => WEAPONS.find(w => w.id === 'lmg') || WEAPONS.find(w => w.auto) || WEAPONS[0];
function turnTurret(c, a, rate, dt) {     // the turret toward the world angle a; how far it still is off
  const d = angDiff(c.ang + (c.turA || 0), a), st = rate * dt;
  c.turA = (c.turA || 0) + clamp(d, -st, st); return Math.abs(d) - Math.min(Math.abs(d), st);
}
function beltTick(c, dt) {                // a belt: empty, it takes the machine gun's reload time to load the next
  if (c.belt === undefined) c.belt = Math.round(COP.apcBelt);
  if (c.relT > 0 && (c.relT -= dt) <= 0) { c.belt = Math.round(COP.apcBelt); c.relT = 0; if (c.driver === 'player') Snd.tone(420, 300, 0.07, 0.12, 'square'); }
}
const muzzle = (c, k) => { const a = c.ang + (c.turA || 0); return { x: c.x + Math.cos(c.ang) * c.t.len * (c.t.weapon === 'mg' ? 0.15 : 0) + Math.cos(a) * k, y: c.y + Math.sin(c.ang) * c.t.len * (c.t.weapon === 'mg' ? 0.15 : 0) + Math.sin(a) * k, a }; };

/* ---------- you, driving an APC (js/08c vehicleGun) ---------- */
function apcPlayerGun(c, inp, dt) {
  beltTick(c, dt);
  const w = apcGunW(), R = w.range, fx = Math.cos(c.ang), fy = Math.sin(c.ang); let best = null, bs = Infinity;
  const consider = (x, y) => {                                    // the nearest target ahead (a wide arc: the turret turns)
    const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d < 24 || d > R) return;
    const cos = (dx * fx + dy * fy) / d; if (cos < 0.2) return;
    const sc = d * (2.2 - cos); if (sc < bs && losClear(c.x, c.y, x, y)) { bs = sc; best = { x, y }; }
  };
  if (inp.fire) {
    for (const p of peds) if (!p.dead && Math.abs(p.x - c.x) < R && Math.abs(p.y - c.y) < R) consider(p.x, p.y);
    for (const o of officers) if (!o.dead && Math.abs(o.x - c.x) < R && Math.abs(o.y - c.y) < R) consider(o.x, o.y);
    for (const o of cars) if (o !== c && !o.dead && !o.sunk && Math.abs(o.x - c.x) < R && Math.abs(o.y - c.y) < R) consider(o.x, o.y);
  }
  const want = best ? Math.atan2(best.y - c.y, best.x - c.x) : c.ang;
  const off = turnTurret(c, want, 6, dt);
  if (!inp.fire || c.relT > 0 || c.gunT > 0 || off > 0.35) return;
  if (c.belt <= 0) { c.relT = w.reload; Snd.tone(200, 120, 0.08, 0.1, 'square'); toast('TURRET RELOADING'); return; }
  c.gunT = w.rate; c.belt--;
  const m = muzzle(c, 14), a = m.a + rand(-1, 1) * w.spread, h = raycast(m.x, m.y, a, R);
  bulletHit(h, w, a); const tr = tracers[tracers.length - 1]; if (tr) { tr.x1 = m.x; tr.y1 = m.y; }   // from the turret, not the bonnet
  Snd.shot(w.sound); alertPeds(c.x, c.y, w.panic); reportCrime(w.heat * COP.crime.gunfire, w.hear, h.x, h.y, true);
  cam.shake = Math.max(cam.shake, w.shake * 0.6);
  if (c.belt <= 0) { c.relT = w.reload; toast('TURRET RELOADING'); }
}
const apcBeltText = c => c.relT > 0 ? 'RELOADING ' + Math.ceil(c.relT) + ' S' : 'BELT ' + (c.belt === undefined ? Math.round(COP.apcBelt) : c.belt);

/* ---------- the police (js/07 updateCars, after copDrive) ---------- */
function copHeavy(c, dt) {
  const kind = c.t.weapon; if (!kind || c.dead || c.burn > 0) return;
  c.gunT = (c.gunT || 0) - dt;
  const tgt = P.car || P, d = dist(c.x, c.y, tgt.x, tgt.y), on = !P.dead && P.stars >= c.t.chaseFrom;
  if (kind === 'rockets') {
    if (!on || !feat('tankRockets') || d > COP.tankRange * 1.6) { turnTurret(c, c.ang, 1, dt); return; }
    const rw = WEAPONS.find(q => q.rocket) || RK_DEF, t = d / (rw.speed || RK_V1) * COP.tankLead;
    const ax = tgt.x + (tgt.vx || 0) * t, ay = tgt.y + (tgt.vy || 0) * t, off = turnTurret(c, Math.atan2(ay - c.y, ax - c.x), 1.4, dt);
    if (c.gunT > 0 || off > 0.06 || d > COP.tankRange || d < 40 || !losClear(c.x, c.y, tgt.x, tgt.y) || waterBetween(c.x, c.y, tgt.x, tgt.y)) return;
    c.gunT = COP.tankEvery; launchRocket({ x: ax, y: ay }, rw, c, { ang: c.ang + c.turA, cop: true });
    const k = 1 - Math.min(1, d / 1200); Snd.burst(0.25, 900, 300, 0.6 * k); cam.shake = Math.max(cam.shake, 4 * k);
    c.vx -= Math.cos(c.ang + c.turA) * 20; c.vy -= Math.sin(c.ang + c.turA) * 20;   // the recoil
  } else if (kind === 'mg') {
    beltTick(c, dt);
    if (!on || !feat('apcGun') || d > COP.apcRange * 1.5) { turnTurret(c, c.ang, 2, dt); return; }
    const off = turnTurret(c, Math.atan2(tgt.y - c.y, tgt.x - c.x), 3, dt), w = apcGunW();
    if (c.relT > 0 || c.gunT > 0 || off > 0.2 || d > COP.apcRange || !c.sees || !losClear(c.x, c.y, tgt.x, tgt.y)) return;
    if (c.belt <= 0) { c.relT = w.reload; return; }
    if (!(c.burst > 0)) c.burst = Math.round(COP.apcBurst);
    c.belt--; c.burst--; c.gunT = c.burst > 0 ? w.rate : COP.apcPause;
    const m = muzzle(c, 14), hit = Math.random() < COP.apcHit * lerp(1, 0.5, clamp(d / COP.apcRange, 0, 1));
    tracers.push({ x1: m.x, y1: m.y, x2: tgt.x + (hit ? rand(-4, 4) : rand(-26, 26)), y2: tgt.y + (hit ? rand(-4, 4) : rand(-26, 26)), life: 0.06 });
    if (d < 900) Snd.shot(w.sound);
    if (hit) { if (P.car) { damageCar(P.car, COP.apcCarDmg, false); spark(tgt.x, tgt.y, 3); } else damagePlayer(COP.apcDmg); }
  }
}
