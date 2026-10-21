'use strict';
/* ---------- 8zx. THE INTERIORS AT WORK: doors, workers and guards, loot, the rare vehicles (models: js/10z; numbers: js/01w; mode: interiors) ----------
   By day (IXT.openFrom-openTo) the roller doors are up and workers stand at work inside: take a stash in front of one and you are
   wanted. At night the doors are down and a guard with a torch and a pistol walks the aisle: ram the roller door (the alarm goes off)
   or force the side door on foot; if the guard sees you, the alarm brings IXT.alarmStars and he shoots. The storage yard's lock-ups
   open any time - force the lock. Stashes (cash, a gun, ammo) refill a game day after you empty them. The rare vehicles: yours once
   you drive off; lost or left, a new one is back at its place a game day later (one kept in a garage stays yours).
   S.ms: a mission holds the place (Quest 04's cold store) - the roller door stays up, no workers, no guard, no alarm. */
const IX = { clock: 0, lastH: null, prevSpd: 0, force: null, bellT: 0, bellS: null, warnT: 0 };
const ixOn = () => IXS.length > 0 && feat('interiors');
const ixDay = () => SKY.hour >= IXT.openFrom && SKY.hour < IXT.openTo;
const IX_HIVIS = ['#e8ff3a', '#ff7a1a'];

/* ---------- set up once (js/10z genInteriors): where the stashes go, the workers' and guards' posts ---------- */
function ixSetup() {
  for (const S of IXS) {
    S.spots = []; const { hw, hd } = S, W = IX_WT, z0 = -hd + W, z1 = hd - W, rr = IXR.find(q => q.S === S);
    const cand = [];
    if (S.kind === 'unit') { if (!rr) cand.push([0, -hd / 3]); }
    else {
      const ax = Math.max(S.dw / 2 + 14, 46) + 6;
      for (const s of [-1, 1]) for (let z = z0 + 30; z < z1 - 60; z += 40) cand.push([s * ax, z]);
      for (let x = -hw + 40; x < hw - 40; x += 50) cand.push([x, z0 + 40]);
    }
    const ok = ([x, z]) => !S.racks.some(([rx, rz, w, d]) => Math.abs(x - rx) < w / 2 + 10 && Math.abs(z - rz) < d / 2 + 10) && (!rr || Math.hypot(x - rr.lx, z - rr.lz) > 50) && Math.abs(x) < hw - W - 8;
    const good = cand.filter(ok), n = S.kind === 'unit' ? Math.min(1, good.length) : Math.min(IXT.stashes, good.length);
    withSeed(7700 + S.i * 13, () => { for (let k = 0; k < n; k++) { const q = good.splice(Math.floor(Math.random() * good.length), 1)[0], w = ixWorld(S, q[0], q[1]); S.spots.push({ S, x: w.x, y: w.y, p: null, takenAt: -1e9 }); } });
    if (S.kind === 'unit') continue;
    const ax = Math.max(S.dw / 2 + 14, 46), pistol = WEAPONS.findIndex(w => w.id === 'pistol');
    for (let k = 0; k < IXT.workers; k++) {    // the day shift: beside the aisle, facing it
      const s = k % 2 ? 1 : -1, lz = z1 - 70 - Math.floor(k / 2) * 70, w = ixWorld(S, s * (ax + 14), lz);
      addPost({ x: w.x, y: w.y, a: S.a + (s > 0 ? Math.PI : 0), kind: 'ixworker', back: 240, need: () => ixOn() && ixDay() && !S.ms, step: standStep,
        make: po => { const p = makePed(po.x, po.y); Object.assign(p, { ixworker: S.i, arm: -1, umb: false, shirt: IX_HIVIS[k % 2], pants: '#2a3a6a', hardhat: S.kind === 'hangar' ? undefined : '#ffd23f', speed: 0, state: 'post' }); return p; } });
    }
    const gx = ax - 10, round = [[-gx, z1 - 40], [-gx, z0 + 40], [gx, z0 + 40], [gx, z1 - 40]].map(([x, z]) => { const w = ixWorld(S, x, z); return [w.x, w.y]; });
    addPost({ x: round[0][0], y: round[0][1], a: 0, kind: 'ixguard', back: 300, patrol: round, need: () => ixOn() && !ixDay() && !S.ms, step: ixGuardStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { ixguard: S.i, arm: pistol, hp: IXT.guardHp, umb: false, shirt: '#2a3a5a', pants: '#1a2230', speed: 1.1 * MPS, state: 'post' }); return p; } });
  }
}
function ixGuardStep(p, dt) {             // walks the aisle with his torch; sees you in his building at night: the alarm
  if (p.state === 'flee' || p.hostile) return false;
  const po = p.post, w = po.patrol[po.i % po.patrol.length];
  if (walkTo(p, w[0], w[1], WALK * 0.8, dt) < 10) po.i++;
  const S = IXS[p.ixguard], me = P.car || P, d = dist(p.x, p.y, me.x, me.y);
  if (S && !S.alarm && !P.dead && (ixIn(S, me.x, me.y, -20) || dist(me.x, me.y, S.dx, S.dy) < 60) && d < IXT.guardSight
    && Math.abs(angDiff(p.ang, Math.atan2(me.y - p.y, me.x - p.x))) < 1.2 && losClear(p.x, p.y, me.x, me.y, true)) ixAlarm(S, 'THE GUARD SAW YOU');
  return true;
}
function ixAlarm(S, why) {
  if (S.alarm) return;
  S.alarm = true; IX.bellT = 8; IX.bellS = S;
  toast('ALARM! ' + S.name + ' - ' + why, true); pops.push({ x: S.dx, y: S.dy, txt: 'ALARM!', col: '#ff3b4a', life: 2 });
  if (feat('police') && IXT.alarmStars > 0) { forceWanted(IXT.alarmStars); reportCrime(0, 0, S.dx, S.dy, true); }
  for (const p of peds) if (p.ixguard === S.i && !p.dead) provoke(p);
}
function ixSeen(S) {                      // a worker of this place sees you (by day)
  const me = P.car || P;
  return peds.some(p => p.ixworker === S.i && !p.dead && p.state !== 'flee' && dist(p.x, p.y, me.x, me.y) < 320 && losClear(p.x, p.y, me.x, me.y, true));
}
function ixTaken(st) {                    // js/08, js/08d: a stash emptied
  st.p = null; st.takenAt = IX.clock; const S = st.S;
  if (ixDay() && ixSeen(S) && feat('police')) { pops.push({ x: st.x, y: st.y, txt: 'HEY! THIEF!', col: '#ffd23f', life: 2 }); forceWanted(1); }
}

/* ---------- the stashes: cash, a gun, or ammo ---------- */
function ixPut(st) {
  const S = st.S, r = Math.random(), guns = WEAPONS.map((w, i) => i).filter(i => !WEAPONS[i].start && !isMelee(WEAPONS[i]) && WEAPONS[i].onMap > 0 && WEAPONS[i].id !== 'aa');
  if (r < IXT.cashShare || !guns.length) { st.p = { x: st.x, y: st.y, type: 'cash', amt: Math.round(rand(IXT.cashMin, Math.max(IXT.cashMin, IXT.cashMax)) / 10) * 10, bob: rand(0, 6), drop: true, ix: st }; pickups.push(st.p); }
  else if (r < IXT.cashShare + (1 - IXT.cashShare) / 2) { const wi = pick(guns); st.p = { x: st.x, y: st.y, z: 0, wi, ammo: false, item: null, key: 'w' + wi, fixed: false, ix: st, spot: null, bob: Math.random() * 6, mesh: null }; WPICKS.push(st.p); }
  else { const w = WEAPONS[pick(guns.filter(i => WEAPONS[i].pickup > 0)) ?? guns[0]]; st.p = { x: st.x, y: st.y, type: w.id, bob: rand(0, 6), drop: true, ix: st }; pickups.push(st.p); }
  st.takenAt = -1e9; void S;
}
function ixReset() {                      // js/15 resetGame: doors by the clock, every stash full, the rare vehicles in their places
  IX.clock = 0; IX.lastH = null; IX.force = null; IX.bellT = 0;
  for (const S of IXS) { S.open = S.pOpen = 0; S.broken = S.forced = S.alarm = S.ms = false; S.forcedAt = 0; if (S.ds) S.ds.off = false; if (S.ps) S.ps.off = false;
    for (const st of S.spots) { st.p = null; st.takenAt = -1e9; if (ixOn()) ixPut(st); } }
  for (const R of IXR) { if (R.car && cars.includes(R.car) && P.car !== R.car) cars.splice(cars.indexOf(R.car), 1); R.car = null; R.takenAt = null; R.paid = false; }
}

/* ---------- js/15 update ---------- */
function ixTick(dt) {
  if (!IXS.length) return;
  if (IX.lastH !== null) IX.clock += (SKY.hour - IX.lastH + 24) % 24; IX.lastH = SKY.hour;
  const on = ixOn(), day = ixDay(), me = P.car || P, q = {};
  IX.warnT -= dt;
  for (const S of IXS) {
    ixLocal(S, me.x, me.y, q);
    const near = Math.abs(q.x) < S.hw + 200 && Math.abs(q.z) < S.hd + 200;
    if (S.kind !== 'unit') {
      if (day && (S.broken || S.forced || S.alarm)) { S.broken = S.forced = S.alarm = false; }   // morning: mended, locked, quiet
    } else if (S.forced && IX.clock - S.forcedAt > IXT.restock && !near) S.forced = false;     // a lock-up shut again later
    if (on && P.car && !S.ms && !S.broken && S.open < 0.2 && (S.kind === 'unit' ? !S.forced : !day) && Math.abs(q.x) < S.dw / 2 && q.z > S.hd - 4 && q.z < S.hd + 45 && IX.prevSpd > IXT.ramSpeed) {
      S.broken = true; S.open = 1; if (S.kind === 'unit') { S.forced = true; S.forcedAt = IX.clock; }   // rammed: the door bursts in
      P.car.hp -= 15; Snd.crash && Snd.crash(0.8); if (S.kind !== 'unit') ixAlarm(S, 'A DOOR WAS RAMMED');
    }
    const want = S.ms ? 1 : !on ? 0 : S.kind === 'unit' ? (S.forced || S.broken ? 1 : 0) : day || S.broken ? 1 : 0, pwant = on && (day || S.forced) ? 1 : 0;
    const blocked = () => [P.car || P, ...cars].some(o => { const l = ixLocal(S, o.x, o.y, {}); return Math.abs(l.x) < S.dw / 2 + 8 && l.z > S.hd - 26 && l.z < S.hd + 20; });
    if (want > S.open) S.open = Math.min(1, S.open + dt / 1.6); else if (want < S.open && !(S.open > 0.15 && blocked())) S.open = Math.max(0, S.open - dt / 1.6);
    S.pOpen = clamp(S.pOpen + (pwant ? 1 : -1) * dt * 2, 0, 1);
    S.ds.off = S.open > 0.85; if (S.ps) S.ps.off = S.pOpen > 0.5;
    if (on && near) for (const st of S.spots) if (!st.p && IX.clock - st.takenAt >= IXT.restock && dist(me.x, me.y, st.x, st.y) > 500) ixPut(st);
  }
  if (IX.bellT > 0) { IX.bellT -= dt; const S = IX.bellS, d = S ? dist(me.x, me.y, S.dx, S.dy) : 1e9; if (d < 900 && Math.floor(IX.bellT * 4) !== Math.floor((IX.bellT + dt) * 4)) Snd.tone(1240, 980, 0.12, 0.07 * (1 - d / 900), 'square'); }
  ixForceTick(dt);
  ixRare();
  IX.prevSpd = P.car ? carSpeed(P.car) : 0;
}

/* ---------- forcing a lock: the side door at night, a lock-up any time ---------- */
function ixKey() {
  if (!ixOn() || P.car || P.dead || P.act || state !== 'play' || IX.force) return null;
  const k = ixSpot(); return k && msShut() ? null : k;
}
function ixSpot() {
  const day = ixDay(), q = {};
  for (const S of IXS) {
    if (S.kind === 'unit') { if (S.forced || S.broken) continue; ixLocal(S, P.x, P.y, q); if (Math.abs(q.x) < S.dw / 2 && q.z > S.hd - 2 && q.z < S.hd + 34) return { kind: 'lock', S }; }
    else if (!day && !S.forced && S.ps && dist(P.x, P.y, S.pdx, S.pdy) < 26) return { kind: 'side', S };
  }
  return null;
}
function ixUse(k) { IX.force = { k, t: 0, x: P.x, y: P.y }; toast(k.kind === 'lock' ? 'FORCING THE LOCK...' : 'PICKING THE SIDE DOOR...'); }
function ixForceTick(dt) {
  const F = IX.force; if (!F) return;
  if (P.car || P.dead || dist(P.x, P.y, F.x, F.y) > 8) { IX.force = null; toast('YOU LET GO OF THE LOCK'); return; }
  F.t += dt; if (Math.floor(F.t * 3) !== Math.floor((F.t - dt) * 3)) Snd.tone(320, 260, 0.05, 0.06, 'square');
  if (F.t < IXT.lockTime) return;
  const S = F.k.S; IX.force = null; S.forced = true; S.forcedAt = IX.clock; Snd.tone(520, 780, 0.1, 0.1, 'square');
  toast(F.k.kind === 'lock' ? S.name + ' - OPEN' : 'THE SIDE DOOR IS OPEN - MIND THE GUARD');
}
function ixUi() {                          // every frame (js/14): the button by you
  const k = ixKey(), b = $('ixBtn'); if (!b) return;
  if (!k) { if (!b.hidden) b.hidden = true; return; }
  const label = k.kind === 'lock' ? k.S.name + ' · LOCKED' : k.S.name + ' · SIDE DOOR', go = k.kind === 'lock' ? 'FORCE' : 'SLIP IN', key = label + go;
  if (b.hidden || b.dataset.s !== key) { b.hidden = false; b.dataset.s = key; b.querySelector('b').textContent = label; b.querySelector('.go').textContent = go; b.style.setProperty('--sc', '#ffd23f'); }
  doorBtnAt(b);
}
if ($('ixBtn')) $('ixBtn').addEventListener('click', e => { e.stopPropagation(); const k = ixKey(); if (k) ixUse(k); });

/* ---------- the rare vehicles ---------- */
const ixKept = id => typeof SAFES !== 'undefined' && SAFES.some(h => h.keep && h.keep.some(s => s && s.type === id));
function ixRare() {
  const on = ixOn();
  for (const R of IXR) {
    const c = R.car, w = ixWorld(R.S, R.lx, R.lz);
    if (c && (!cars.includes(c) || c.dead || c.sunk)) { R.car = null; if (R.takenAt === null && c.dead) R.takenAt = IX.clock; }   // wrecked where it stood: as good as taken
    if (R.car && R.takenAt === null && (P.car === R.car || dist(R.car.x, R.car.y, w.x, w.y) > 60)) {          // driven off: yours
      R.takenAt = IX.clock; R.car.ixRare = R;
      if (P.car === R.car) toast(R.car.t.name + ' - YOURS NOW. KEEP IT IN A GARAGE');
      if (R.id === 'armorvan' && !R.paid && P.car === R.car && IXT.vanCash > 0) { R.paid = true; addScore(IXT.vanCash, R.car.x, R.car.y, 'IN THE BACK'); Snd.pickup(); }
    }
    if (R.takenAt !== null && IX.clock - R.takenAt >= IXT.rareBack && !ixKept(R.id)) {                       // a game day on, lost or left: a new one
      const k = R.car; if (k && (k.home || P.car === k || dist(k.x, k.y, P.x, P.y) < 2000)) continue;
      if (k) cars.splice(cars.indexOf(k), 1);
      R.car = null; R.takenAt = null; R.paid = false;
    }
    if (!on || R.car || R.takenAt !== null || dist(P.x, P.y, w.x, w.y) > 1500 || cars.some(o => dist(o.x, o.y, w.x, w.y) < 40)) continue;
    const c2 = makeCar(R.id, w.x, w.y, R.S.a + (R.S.kind === 'unit' ? -Math.PI / 2 : Math.PI / 2), null); c2.searched = true; c2.ixRare = R; cars.push(c2); R.car = c2;
  }
}

/* ---------- js/13: roofs fade over you, the doors move, the lamps, the dust sheet, the guards' torches ---------- */
let ixT = 0; const IX_TORCH = [];
function gfxIx(time) {
  const dt = Math.min(0.1, Math.max(0, time - ixT)); ixT = time;
  const me = P.car || P, on = ixOn(), day = on && ixDay();
  for (const S of IXS) {
    const pt = S.pt; if (!S.lm.mesh || !pt) continue;
    const inside = !P.dead && ixIn(S, me.x, me.y, -6);
    S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
    if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.roofGlow.opacity = S.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = S.roof > 0.97; pt.sign.material.opacity = S.roof; pt.sign.visible = S.roof > 0.15; }
    pt.door.scale.y = Math.max(0.03, 1 - S.open); pt.door.visible = S.open < 0.99;
    if (pt.pdoor) pt.pdoor.rotation.y = S.pOpen * 1.6;
    pt.lampMat.color.setHex(!on ? 0x3a3d47 : S.alarm ? (Math.floor(time * 4) % 2 ? 0xff3b4a : 0x3a0a0a) : S.open > 0.5 || S.pOpen > 0.5 ? 0x3dff7a : 0xff3b4a);
    if (pt.sheet) { const R = IXR.find(q => q.S === S); pt.sheet.visible = !!(R && R.car && R.takenAt === null); }
  }
  let k = 0;
  if (on && !day) for (const p of peds) {
    if (p.ixguard === undefined || p.dead) continue;
    let t = IX_TORCH[k]; if (!t) { const m = new THREE.Mesh(new THREE.CircleGeometry(80, 12, -0.45, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; t = new THREE.Group(); t.add(m); scene.add(t); IX_TORCH[k] = t; }
    t.visible = true; t.position.set(p.x, groundH(p.x, p.y) + 1.5, p.y); t.rotation.y = -p.ang; k++;
  }
  for (; k < IX_TORCH.length; k++) IX_TORCH[k].visible = false;
}

/* ---------- js/14: a crate on the minimap and the city map, at each door ---------- */
function ixIcons(g, X, Y, q, inView) {
  if (!ixOn()) return;
  const done = new Set();
  for (const S of IXS) {
    const key = S.yard ? 'yard' : S.i; if (done.has(key)) continue; done.add(key);
    const cx = S.yard ? S.yard.cx : S.dx, cy = S.yard ? S.yard.cy : S.dy, x = X(cx), y = Y(cy); if (!inView(x, y)) continue;
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#c49a64'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.strokeStyle = '#4a2f14'; g.lineWidth = Math.max(1, q * 0.22); g.strokeRect(x - q * 0.62, y - q * 0.62, q * 1.24, q * 1.24);
    g.beginPath(); g.moveTo(x - q * 0.62, y - q * 0.62); g.lineTo(x + q * 0.62, y + q * 0.62); g.moveTo(x + q * 0.62, y - q * 0.62); g.lineTo(x - q * 0.62, y + q * 0.62); g.stroke();
  }
}

/* ---------- saved games: the clock, the rare vehicles taken, the lock-ups open ---------- */
function ixSave() { return { clock: Math.round(IX.clock * 100) / 100, rare: IXR.map(R => R.takenAt), paid: IXR.map(R => R.paid), units: IXS.map(S => S.kind === 'unit' && S.forced ? Math.round(S.forcedAt * 100) / 100 : null) }; }
function ixLoad(o) {
  if (!o || typeof o !== 'object') return;
  if (typeof o.clock === 'number' && isFinite(o.clock)) IX.clock = Math.max(0, o.clock);
  IXR.forEach((R, i) => { const t = o.rare && o.rare[i]; R.takenAt = typeof t === 'number' && isFinite(t) ? t : null; R.paid = !!(o.paid && o.paid[i]); if (R.takenAt !== null && R.car && P.car !== R.car && cars.includes(R.car)) { cars.splice(cars.indexOf(R.car), 1); R.car = null; } });
  IXS.forEach((S, i) => { const t = o.units && o.units[i]; if (S.kind === 'unit' && typeof t === 'number' && isFinite(t)) { S.forced = true; S.forcedAt = t; } });
}
