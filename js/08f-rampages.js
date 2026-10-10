'use strict';
/* ---------- 6c4. RAMPAGES ----------
   Twenty rampages (js/01h) in hiding places near a street, spread over the city: a skull facing you over a red ring, the rampage's
   weapon circling it. Come near one and it is found: from then on it is on the minimap and the city map (a skull; green once passed).
   On foot at the skull a RAMPAGE button appears by you (or press E): it shows the goal, the weapon, the time and the reward, and
   START begins it - never while you are wanted. During a rampage the weapon is locked in your hand with endless spare ammo (reloads
   still take their time), you stay on foot, no other rampage or store opens, and the police look the other way: no heat at all.
   People or vehicles are brought in around you, out of sight, so there is always something to hit. Kill the people (police too) or
   wreck the vehicles (a car counts when it catches fire) with that weapon before the clock runs out. The first pass pays the reward
   and you keep the weapon with its basic load; a rampage passed before can be played again, without the reward. Dying fails it;
   failing (or a replay) gives you back the weapons you had. */
const RAMP = { on: null, t: 0, got: 0, keep: null, spawnT: 0, short: 0, beep: 0, lockT: 0 };
const RAMP_R = 24, RAMP_SEE = 320, RAMP_INF = 9999, RAMP_NEAR = 650, RAMP_PEOPLE = 18, RAMP_CARS = 10;
let rampFound = new Set(), rampDone = new Set(), rampAt = null;
function pickRampages() {               // once, when the hiding places are built (js/08d): one near the start, the rest as far apart as can be
  const svc = [...SVC.police, ...SVC.hospital, ...SVC.fire].map(s => s.r), sx = MAP.start[0], sy = MAP.start[1];   // clear of the police, hospitals and fire stations (js/08n)
  const cand = WSPOTS.filter(s => nearestRoad(s.x, s.y, 220) && !svc.some(b => dist(b.cx, b.cy, s.x, s.y) < 400));
  if (!cand.length) return;
  let first = null; for (const c of cand) { const d = dist(c.x, c.y, sx, sy); if (d > 250 && (!first || d < dist(first.x, first.y, sx, sy))) first = c; }
  const chosen = [first || cand[0]];
  while (chosen.length < RAMPAGES.length) {
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.x, o.y, c.x, c.y))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 400) break; chosen.push(best);
  }
  RAMPAGES.forEach((r, i) => { const s = chosen[i]; r.placed = !!s; if (s) { r.x = s.x; r.y = s.y; s.ramp = true; } });
}
const rampsHere = () => RAMPAGES.filter(r => r.placed);
function rampReset() {                  // a new game (js/15): nothing found, nothing passed, none running (a saved game fills them in again)
  RAMP.on = null; rampAt = null; rampFound = new Set(); rampDone = new Set(); $('rampHud').hidden = true; $('rampBtn').hidden = true;
}
const goalText = r => (r.target === 'cars' ? 'WRECK ' + r.count + ' VEHICLES' : 'KILL ' + r.count + ' PEOPLE');
const rampTimeText = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---------- finding them, the button by you, the screen before you start ---------- */
function nearRamp() {                    // the rampage whose skull you stand at, on foot
  if (RAMP.on || JOB.on || P.car || P.dead || P.act || state !== 'play' || !feat('rampages')) return null;   // not during a vehicle job (js/08n)
  for (const r of RAMPAGES) if (r.placed && Math.abs(r.x - P.x) < RAMP_R && Math.abs(r.y - P.y) < RAMP_R && dist(r.x, r.y, P.x, P.y) < RAMP_R) return r;
  return null;
}
function rampKey() { const r = nearRamp(); if (!r) return null; const c = nearestCar(); return c && dist(c.x, c.y, P.x, P.y) < dist(r.x, r.y, P.x, P.y) ? null : r; }
function rampUi() {                      // every frame (js/14): the RAMPAGE button next to you at a skull
  const r = nearRamp(), b = $('rampBtn');
  if (!r) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden || b.dataset.id !== r.id) { b.hidden = false; b.dataset.id = r.id; b.querySelector('b').textContent = goalText(r); }
  doorBtnAt(b);
}
$('rampBtn').addEventListener('click', e => { e.stopPropagation(); const r = nearRamp(); if (r) openRamp(r); });
function openRamp(r) {
  rampAt = r; state = 'ramp'; toggleBigMap(false); toggleWheel(false); hush(); $('rampBtn').hidden = true;
  const w = WEAPONS[r.wi], done = rampDone.has(r.id), wanted = P.stars > 0;
  $('rampName').textContent = r.name; $('rampSub').textContent = 'RAMPAGE ' + r.n + ' OF ' + RAMPAGES.length + '  ·  PASSED ' + rampDone.size;
  $('rampIco').innerHTML = wIcon(w); $('rampIco').style.color = w.color; $('rampWname').textContent = w.name; $('rampWname').style.color = w.color;
  $('rampGoal').textContent = goalText(r); $('rampTime').textContent = rampTimeText(r.time);
  $('rampReward').textContent = done ? 'NONE - PASSED BEFORE' : money(r.reward) + (w.start ? '' : ' + THE ' + w.name);
  $('rampRules').textContent = (isMelee(w) ? '' : 'Endless ammo (reloads still take time). ') + 'You stay on foot with the ' + w.name.toLowerCase() + ', and the police look the other way.'
    + (r.target === 'cars' ? ' A vehicle counts when it catches fire.' : ' Police officers count too.');
  $('rampWarn').textContent = wanted ? 'LOSE THE POLICE FIRST' : ''; $('rampWarn').hidden = !wanted;
  $('rampGo').hidden = wanted; $('rampNo').classList.toggle('pri', wanted);     // Enter: START, or NOT NOW while you are wanted
  showCard('rampCard', true);
}
function closeRamp() { if (state !== 'ramp') return; state = 'play'; rampAt = null; closeMenus(); }
$('rampGo').addEventListener('click', () => { const r = rampAt; closeRamp(); if (r && P.stars <= 0) rampStart(r); });

/* ---------- playing one ---------- */
function rampStart(r) {
  const w = WEAPONS[r.wi], i = r.wi;
  RAMP.on = r; RAMP.t = r.time; RAMP.got = 0; RAMP.spawnT = 0; RAMP.short = 0; RAMP.beep = 6;
  RAMP.keep = { weapon: P.weapon, has: P.has[i], mag: P.mag[i], ammo: P.ammo[i] };
  P.has[i] = true; P.weapon = i; P.mag[i] = w.mag; P.ammo[i] = RAMP_INF; P.relW = -1; P.swing = null; SCOPE.on = false; TA.on = TA.ok = false; P.heat = 0;
  $('rampHud').hidden = false; $('rampHud').style.setProperty('--wc', w.color); $('rampIcoHud').innerHTML = wIcon(w); H.rampN = H.rampT = null;
  toast('RAMPAGE! ' + goalText(r)); Snd.tone(220, 880, 0.35, 0.16, 'sawtooth');
}
function rampHit(kind, x, y) {           // a kill (js/06: killPed, killOfficer) or a wreck (damageCar) by you
  const r = RAMP.on; if (!r || r.target !== kind) return;
  RAMP.got++; popup(x, y - 26, RAMP.got + ' / ' + r.count, '#ff2a2a'); $('rampHud').classList.remove('bump'); void $('rampHud').offsetWidth; $('rampHud').classList.add('bump');
  if (RAMP.got >= r.count) rampEnd(true);
}
function rampWreck(c) { if (c.rampN) return; c.rampN = true; rampHit('cars', c.x, c.y); }
function rampEnd(ok, why) {
  const r = RAMP.on; if (!r) return;
  const w = WEAPONS[r.wi], i = r.wi, k = RAMP.keep, first = ok && !rampDone.has(r.id);
  RAMP.on = null; $('rampHud').hidden = true; P.relW = -1; SCOPE.on = false; TA.on = TA.ok = false;
  if (first) {                                                       // the reward: the cash, and the weapon with its basic load
    rampDone.add(r.id); P.score += r.reward; P.has[i] = true; P.mag[i] = Math.max(k.mag, w.mag); P.ammo[i] = Math.min(Math.max(w.maxAmmo, k.ammo), k.ammo + w.ammo); P.weapon = i;
    toast('RAMPAGE PASSED! +' + money(r.reward)); popup(P.x, P.y - 30, '+' + money(r.reward) + (w.start ? '' : ' + ' + w.name), '#3dffa6');
  } else {                                                           // failed, or passed again: your weapons as they were
    P.has[i] = k.has || !!w.start; P.mag[i] = k.mag; P.ammo[i] = k.ammo; P.weapon = P.has[k.weapon] ? k.weapon : P.has[i] ? i : Math.max(0, P.has.indexOf(true));
    toast(ok ? 'RAMPAGE PASSED AGAIN - NO REWARD' : 'RAMPAGE FAILED' + (why ? ': ' + why : ''), !ok);
  }
  if (ok) { Snd.tone(523, 1047, 0.18, 0.15, 'square'); setTimeout(() => Snd.tone(784, 1568, 0.3, 0.15, 'square'), 160); } else Snd.tone(330, 110, 0.6, 0.15, 'sawtooth');
  if (first && !saveBlock()) putSave('auto', makeSave(lastThumb));  // the reward is kept even if you close the game now
}
function rampTick(dt) {                  // every frame of play (js/15)
  if (!feat('rampages')) return;                                   // a mode without rampages (js/01j)
  for (const r of RAMPAGES) if (r.placed && !rampFound.has(r.id) && Math.abs(r.x - P.x) < RAMP_SEE && Math.abs(r.y - P.y) < RAMP_SEE && dist(r.x, r.y, P.x, P.y) < RAMP_SEE) {
    rampFound.add(r.id); if (!RAMP.on) toast('RAMPAGE FOUND!');
  }
  const r = RAMP.on; if (!r) return;
  P.weapon = r.wi; P.has[r.wi] = true; P.ammo[r.wi] = RAMP_INF;      // locked in your hand, endless spare rounds
  RAMP.t -= dt; RAMP.lockT -= dt;
  if (RAMP.t <= RAMP.beep - 1 && RAMP.t > 0) { RAMP.beep = Math.ceil(RAMP.t); Snd.tone(1200, 1200, 0.06, 0.1, 'square'); }   // the last five seconds
  if (RAMP.t <= 0) { rampEnd(false, 'OUT OF TIME'); return; }
  rampSpawn(dt);
}
function rampLocked(what) {              // what you cannot do during a rampage (js/06, js/15): a reminder, not too often
  if (!RAMP.on) return false;
  if (RAMP.lockT <= 0) { RAMP.lockT = 1.5; toast(what, true); }
  return true;
}
const offScreen = (x, y) => { const q = worldToScreen(x, y); return q.x < -40 || q.y < -40 || q.x > VW + 40 || q.y > VH + 40; };
function rampSpawn(dt) {                 // keep enough people or vehicles around you, brought in out of sight (in sight only if nothing else works)
  if ((RAMP.spawnT -= dt) > 0) return; RAMP.spawnT = 0.25;
  const r = RAMP.on; let n = 0;
  if (r.target === 'people') {
    for (const p of peds) if (!p.dead && Math.abs(p.x - P.x) < RAMP_NEAR && Math.abs(p.y - P.y) < RAMP_NEAR) n++;
    for (const o of officers) if (!o.dead && Math.abs(o.x - P.x) < RAMP_NEAR && Math.abs(o.y - P.y) < RAMP_NEAR) n++;
    const want = RAMP_PEOPLE - n; RAMP.short = want > 0 ? RAMP.short + 0.25 : 0;
    for (let k = 0; k < Math.min(3, want); k++) {
      for (let tr = 0; tr < 6; tr++) { const s = sidewalkSpot(150, RAMP_NEAR - 80, 8); if (!s || (!offScreen(s.x, s.y) && RAMP.short < 1.5)) continue; const q = makePed(s.x, s.y, s); q.arm = -1; peds.push(q); break; }   // rampage crowds carry nothing
    }
  } else {
    for (const c of cars) if (!c.dead && c.hp > 0 && !c.sunk && Math.abs(c.x - P.x) < RAMP_NEAR + 100 && Math.abs(c.y - P.y) < RAMP_NEAR + 100) n++;
    const want = RAMP_CARS - n; RAMP.short = want > 0 ? RAMP.short + 0.25 : 0;
    for (let k = 0; k < Math.min(2, want); k++) {
      for (let tr = 0; tr < 4; tr++) {
        const parked = Math.random() < 0.5, type = parked ? pickType('parked', t => t.wid <= KERB_W && !t.cop) : pickType('traffic', t => !t.cop); if (!type) continue;
        const s = parked ? laneSpot(180, RAMP_NEAR + 50, type) : laneSpot(180, RAMP_NEAR + 50, null, type); if (!s || (!offScreen(s.x, s.y) && RAMP.short < 1.5)) continue;
        const c = makeCar(type, s.x, s.y, s.ang, parked ? null : 'ai');
        if (!parked) { c.e = s.e; c.fw = s.fw; c.s = s.s; c.vx = Math.cos(c.ang) * 40 * KMH; c.vy = Math.sin(c.ang) * 40 * KMH; }
        cars.push(c); break;
      }
    }
  }
}
function rampHudUpdate() {               // js/14: the count and the clock at the top
  const r = RAMP.on; if (!r) return;
  const n = RAMP.got + ' / ' + r.count, t = rampTimeText(RAMP.t);
  if (H.rampN !== n) { H.rampN = n; $('rampCount').textContent = n; $('rampWhat').textContent = r.target === 'cars' ? 'VEHICLES' : 'PEOPLE'; }
  if (H.rampT !== t) { H.rampT = t; $('rampClock').textContent = t; $('rampHud').classList.toggle('late', RAMP.t <= 10); }
}

/* ---------- the skulls ---------- */
const RAMP_RED = '#ff2a2a', RAMP_GREEN = '#3dffa6', _rmat = {}, rampMat = (c, op) => _rmat[c + op] || (_rmat[c + op] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
const RAMP_RING = new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), RAMP_PAD = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const _rb = {}, rBas = c => _rb[c] || (_rb[c] = mBas(c));
function skullModel(bone) {              // facing +z: a round cranium, cheekbones, a jaw, dark eyes, a nose and teeth
  const g = new THREE.Group(), dark = '#1a0f1e';
  part(g, GSph, mc(bone), 6, 5.6, 5.4, 0, 2, 0); part(g, GB, mc(bone), 8.4, 3.4, 6.6, 0, -0.6, 0.6); part(g, GB, mc(bone), 5.6, 2.6, 4.8, 0, -3, 1.6);
  for (const s of [-1, 1]) part(g, GSph, rBas(dark), 1.6, 1.8, 1, s * 2.2, 0.6, 4.1);
  part(g, GB, rBas(dark), 1.2, 1.5, 1, 0, -1.4, 4.1);
  for (let k = -2; k <= 2; k++) part(g, GB, rBas(dark), 0.35, 1.4, 0.6, k * 1.05, -3.1, 4.05);
  return g;
}
function syncRampages(time) {            // js/13: the skulls near the camera (far ones are dropped by js/11 sweepDynamic); none during a rampage
  if (RAMP.on || !feat('rampages')) return;
  const R = visRadius() * 1.25, tilt = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180) * 0.75;
  for (const r of RAMPAGES) {
    if (!r.placed || Math.abs(r.x - cam.x) > R || Math.abs(r.y - cam.y) > R) continue;
    const done = rampDone.has(r.id);
    if (!r.mesh || r.mesh.userData.done !== done) {
      if (r.mesh) scene.remove(r.mesh);
      const g = new THREE.Group(), col = done ? RAMP_GREEN : RAMP_RED, w = WEAPONS[r.wi];
      const disc = new THREE.Mesh(RAMP_PAD, rampMat(col, 0.18)); disc.scale.setScalar(RAMP_R); disc.position.y = 1.4; g.add(disc);
      const ring = new THREE.Mesh(RAMP_RING, rampMat(col, 0.95)); ring.scale.setScalar(RAMP_R); ring.position.y = 1.6; g.add(ring);
      const glow = new THREE.Mesh(GP, glowMat(col, 0.8)); glow.scale.set(80, 1, 80); glow.position.y = 1.3; g.add(glow);
      const skull = new THREE.Group(), face = skullModel(done ? '#c9ffe6' : '#f1ead2'); face.rotation.x = tilt; skull.add(face); skull.scale.setScalar(2.2); skull.position.y = 26; g.add(skull);
      const orbit = new THREE.Group(), wm = weaponModel(w.id, w.color), b = new THREE.Box3().setFromObject(wm), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
      wm.position.sub(c); const hold = new THREE.Group(); hold.add(wm); hold.scale.setScalar(Math.min(2, 16 / Math.max(4, sz.x, sz.y, sz.z))); hold.position.set(24, 14, 0); orbit.add(hold); g.add(orbit);
      g.userData = { ring, skull, orbit, hold, done }; r.mesh = g; scene.add(g);
    }
    track(r); const u = r.mesh.userData;
    r.mesh.position.set(r.x, groundH(r.x, r.y), r.y);
    u.skull.position.y = 26 + Math.sin(time * 2.2 + r.n) * 1.5; u.skull.rotation.y = Math.sin(time * 1.3 + r.n) * 0.45;
    u.orbit.rotation.y = time * 1.6; u.hold.rotation.y = time * 2.5; u.ring.scale.setScalar(RAMP_R + Math.sin(time * 4) * 1.2);
  }
}
function skullIcon(g, x, y, q, done) {   // the map icon: a skull on red, on green once passed
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = done ? RAMP_GREEN : RAMP_RED; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = done ? '#0b0614' : '#ffffff'; g.beginPath(); g.arc(x, y - q * 0.18, q * 0.62, 0, TAU); g.fill(); g.fillRect(x - q * 0.36, y + q * 0.2, q * 0.72, q * 0.52);
  g.fillStyle = done ? RAMP_GREEN : RAMP_RED; g.beginPath(); g.arc(x - q * 0.25, y - q * 0.12, q * 0.17, 0, TAU); g.arc(x + q * 0.25, y - q * 0.12, q * 0.17, 0, TAU); g.fill();
}
