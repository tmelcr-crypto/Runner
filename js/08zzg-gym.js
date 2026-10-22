'use strict';
/* ---------- 8zzg. BULL'S GYM AT WORK: the door, the boxers at the bags, the ring fights (the building: js/10zb; numbers: js/01z; modes: gym, ringFights) ----------
   Open by day (GYMT.openFrom-openTo): the glass door swings open, boxers punch the heavy bags. At the ring's steps the RING button
   starts the next bout: you in the near corner, he in the far one, the steps shut behind you, a count-in and the bell. Fists only (the
   wheel stays shut); body armour does not count. Your jabs (FISTS) take his health; he blocks some, a jab staggers him; his punch lands
   GYMT.windup after he starts it if you are still in his reach. His health to nothing: KNOCKOUT - the pay, the next opponent waits.
   Yours down to GYMT.koHp: knocked out, thrown out of the door with GYMT.loseHp. Five opponents, each tougher and paying more; nobody
   panics, nobody calls the police. A mission can hold the gym (S.ms): the door open, no bouts; 'busy' keeps the boxers training (M07),
   true empties it (M12). */
const GYM = { S: null, won: 0, fight: null, champT: 0 };
const gymOn = () => !!GYM.S && feat('gym');
const gymOpen = () => SKY.hour >= GYMT.openFrom && SKY.hour < GYMT.openTo;
const gymFists = () => Math.max(0, WEAPONS.findIndex(w => w.id === 'fists'));
const _gq = {};
function gymIn(x, y, m) { const S = GYM.S; if (!S) return false; gymLocal(x, y, _gq); return Math.abs(_gq.x) < S.hw - GYM_WT - m && Math.abs(_gq.z) < S.hd - GYM_WT - m; }
function gymInRing(x, y, m) { const S = GYM.S, R = S.ring; gymLocal(x, y, _gq); return Math.abs(_gq.x - R.x) < R.rs - m && Math.abs(_gq.z - R.z) < R.rs - m; }

/* ---------- set up once (js/10z genGym): the boxers' places at the bags ---------- */
const GYM_KIT = [['#c8202c', '#1a1a24'], ['#f2f2f2', '#2048b0'], ['#ffd23f', '#1a1a24'], ['#1a1a20', '#c8202c'], ['#2bf3ff', '#2a2a30'], ['#3dffa6', '#1a1a24']];
function gymSetup() {
  const S = GYM.S, fists = gymFists();
  S.bags.slice(0, GYMT.trainers).forEach((b, k) => {
    const sx = b.x < 0 ? 1 : -1, w = gymWorld(b.x + sx * 14, b.z), t = gymWorld(b.x, b.z), face = Math.atan2(t.y - w.y, t.x - w.x);   // beside the bag, facing it
    addPost({ x: w.x, y: w.y, a: face, kind: 'gymboxer', back: 240, need: () => gymOn() && gymOpen() && (!S.ms || S.ms === 'busy'), step: trainStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { boxer: true, arm: fists, umb: false, shirt: GYM_KIT[k % GYM_KIT.length][0], pants: GYM_KIT[k % GYM_KIT.length][1], speed: 0, state: 'post' }); return p; } });
  });
}
function trainStep(p, dt) {                 // at the bag: a combination, a breather, another
  if (p.state === 'flee' || p.hostile) return false;
  const po = p.post; if (dist(p.x, p.y, po.x, po.y) > 5) { walkTo(p, po.x, po.y, WALK, dt); return true; }
  p.vx = p.vy = 0; p.ang = p.hd = po.a; p.swingT = Math.max(0, (p.swingT || 0) - dt);
  if ((p.punchT = (p.punchT === undefined ? rand(0.2, 1.2) : p.punchT) - dt) <= 0) {
    p.punchT = Math.random() < 0.15 ? rand(1.4, 3) : rand(0.32, 0.6); p.swingT = 0.25;
    const d = dist(P.x, P.y, p.x, p.y); if (d < 260) Snd.tone(110, 70, 0.05, 0.05 * (1 - d / 260), 'sine');   // the thump on the bag
  }
  return true;
}

/* ---------- js/15 update ---------- */
function gymTick(dt) {
  const S = GYM.S; if (!S) return;
  const on = gymOn(), me = P.car || P, inside = gymIn(me.x, me.y, -4);
  const want = on && (gymOpen() || S.ms || inside) ? 1 : 0;
  S.open = clamp(S.open + (want ? 1 : -1) * dt * 2, 0, 1); S.door.off = S.open > 0.5;
  if (GYM.champT > 0) GYM.champT -= dt;
  const F = GYM.fight; if (!F) return;
  F.t += dt;
  const R = S.ring, ctr = gymWorld(R.x, R.z);
  if (F.phase !== 'lost' && (P.dead || P.car || MS.on || !on || !gymInRing(P.x, P.y, -10))) { gymEnd(); return; }   // something else came first: the bout is off
  if (F.phase === 'count') {
    const n = Math.ceil(GYMT.countdown - F.t);
    if (n !== F.shown && n > 0) { F.shown = n; pops.push({ x: ctr.x, y: ctr.y, txt: String(n), col: '#ffd23f', life: 0.9 }); Snd.tone(660, 660, 0.12, 0.08, 'square'); }
    if (F.t >= GYMT.countdown) { F.phase = 'fight'; F.t = 0; pops.push({ x: ctr.x, y: ctr.y, txt: 'FIGHT!', col: '#ff3b4a', life: 1.2 }); gymBell(); }
  } else if (F.phase === 'won') {
    if (!F.paid && F.t > 1.2) {
      F.paid = true; GYM.won = Math.max(GYM.won, F.k); addScore(F.o.pay, P.x, P.y, 'BOUT ' + F.k);
      toast(F.k >= 5 ? "CHAMPION OF BULL'S GYM! NOBODY LEFT TO FIGHT" : 'YOU WIN BOUT ' + F.k + ' OF 5 - ' + GYM_FIGHTERS[F.k].name + ' IS NEXT');
      S.gate.off = true; $('gymBar').hidden = true;
    }
    if (F.paid && F.t > GYMT.koLie + 0.6) { gymLeave(F.foe); GYM.fight = null; }
  } else if (F.phase === 'lost') {
    P.vx = P.vy = 0;
    if (F.t > 1.6) {                                                // thrown out of the door
      if (P.car) exitCar(true);
      P.x = S.dx; P.y = S.dy; P.vx = P.vy = 0; P.hp = Math.max(1, Math.min(hpMax(), GYMT.loseHp)); P.armor = F.armor; cam.x = P.x; cam.y = P.y;
      toast("THROWN OUT OF BULL'S GYM - TRY AGAIN ANY TIME", true); gymEnd();
    }
  }
  if (GYM.fight && F.phase !== 'lost' && P.weapon !== gymFists()) { P.weapon = gymFists(); P.swing = null; }   // fists only
  if (GYM.fight && F.phase !== 'won') $('gymHp').style.width = Math.max(0, F.foe.hp / F.o.hp * 100) + '%';
}
function gymBell() { Snd.tone(1320, 1300, 0.6, 0.12, 'sine'); setTimeout(() => Snd.tone(1320, 1300, 0.6, 0.1, 'sine'), 260); }

/* ---------- a bout ---------- */
function gymStart(k) {
  const S = GYM.S, R = S.ring, o = gymFoe(k), who = GYM_FIGHTERS[k - 1], fists = gymFists();
  for (let i = peds.length - 1; i >= 0; i--) if (peds[i].ring) peds.splice(i, 1);   // the last one gone for good
  const me = gymWorld(R.x - R.rs + 14, R.z + R.rs - 14), them = gymWorld(R.x + R.rs - 14, R.z - R.rs + 14);
  if (P.car) exitCar(true); P.x = me.x; P.y = me.y; P.vx = P.vy = 0; P.swing = null; P.weapon = fists; P.ang = Math.atan2(them.y - me.y, them.x - me.x);
  if (typeof SCOPE !== 'undefined') SCOPE.on = false; if (typeof TA !== 'undefined') TA.on = TA.ok = false; toggleWheel(false);
  const p = makePed(them.x, them.y);
  Object.assign(p, { boxer: true, ring: true, arm: fists, umb: false, shirt: who.shirt, pants: who.pants, skin: who.skin, hp: o.hp, speed: 0, state: 'post', keep: true, cool: 1.2, sd: 1, sdT: 1, wind: 0, stag: 0, guard: 0, hits: [] });
  p.post = { x: them.x, y: them.y, a: P.ang + Math.PI, step: boxStep, i: 0 }; p.e = -1; p.ang = p.hd = P.ang + Math.PI; peds.push(p);
  S.gate.off = false;
  GYM.fight = { k, o, foe: p, phase: 'count', t: 0, shown: 0, paid: false, armor: P.armor };
  $('gymName').textContent = who.name; $('gymHp').style.width = '100%'; $('gymBar').hidden = false;
  toast('BOUT ' + k + ' OF 5: ' + who.name);
}
function boxStep(p, dt) {                   // the opponent: close in, circle, jab when you are in reach; a jab of yours staggers him
  const F = GYM.fight;
  if (!F || F.foe !== p || F.phase !== 'fight') { p.vx = p.vy = 0; if (F && F.foe === p && F.phase === 'count') { p.ang = p.hd = Math.atan2(P.y - p.y, P.x - p.x); } return true; }
  const o = F.o, S = GYM.S, R = S.ring;
  p.cool -= dt; p.stag = Math.max(0, p.stag - dt); p.swingT = Math.max(0, (p.swingT || 0) - dt);
  if (p.guard > 0 && (p.guard -= dt) <= 0) { p.cool = 0; p.stag = 0; }   // the guard comes down: straight into a counter
  const d = dist(p.x, p.y, P.x, P.y), a = Math.atan2(P.y - p.y, P.x - p.x), reach = GYMT.reach + BODY_R; p.ang = p.hd = a;
  if (p.wind > 0) {                                                 // his punch on its way
    p.wind -= dt; p.vx = p.vy = 0;
    if (p.wind <= 0) {
      if (d <= reach + 3) { damagePlayer(o.dmg); Snd.melee('punch', true); cam.shake = Math.max(cam.shake, 3); }
      else { pops.push({ x: p.x, y: p.y - 12, txt: 'MISS', col: '#cfd3dc', life: 0.6 }); Snd.melee('punch', false); }
    }
    return true;
  }
  let mx = 0, my = 0;
  if (p.stag > 0) { mx = -Math.cos(a) * 0.5; my = -Math.sin(a) * 0.5; }
  else {
    const want = reach * 0.85;
    if (d > want + 3) { mx = Math.cos(a); my = Math.sin(a); } else if (d < want - 8) { mx = -Math.cos(a) * 0.6; my = -Math.sin(a) * 0.6; }
    if ((p.sdT -= dt) <= 0) { p.sd = -p.sd; p.sdT = rand(0.7, 1.6); }
    mx += -Math.sin(a) * 0.5 * p.sd; my += Math.cos(a) * 0.5 * p.sd;
    if (d <= reach && p.cool <= 0) { p.cool = o.cool * rand(0.85, 1.2); p.wind = GYMT.windup; p.swingT = 0.25; Snd.tone(220, 160, 0.06, 0.04, 'square'); }
  }
  const m = Math.hypot(mx, my); if (m > 0.01) { const sp = o.speed * Math.min(1, m); p.vx = mx / m * sp; p.vy = my / m * sp; p.x += p.vx * dt; p.y += p.vy * dt; } else p.vx = p.vy = 0;
  gymLocal(p.x, p.y, _gq); const lim = R.rs - 7;                    // inside the ropes
  const lx = clamp(_gq.x, R.x - lim, R.x + lim), lz = clamp(_gq.z, R.z - lim, R.z + lim);
  if (lx !== _gq.x || lz !== _gq.z) { const w = gymWorld(lx, lz); p.x = w.x; p.y = w.y; }
  if (dist(p.x, p.y, P.x, P.y) < BODY_R * 1.6) { const b = Math.atan2(p.y - P.y, p.x - P.x); p.x = P.x + Math.cos(b) * BODY_R * 1.6; p.y = P.y + Math.sin(b) * BODY_R * 1.6; }
  return true;
}
function gymHit(p, w) {                     // js/06b hitPerson: your punch on someone in the ring
  const F = GYM.fight; if (!F || F.foe !== p || F.phase !== 'fight') return;
  if (p.guard > 0 || Math.random() < F.o.block) { pops.push({ x: p.x, y: p.y - 12, txt: 'BLOCKED', col: '#cfd3dc', life: 0.6 }); Snd.tone(180, 140, 0.05, 0.05, 'square'); return; }
  p.hits = (p.hits || []).filter(t => gameT - t < GYMT.guardIn); p.hits.push(gameT);
  if (p.hits.length >= GYMT.guardAfter) { p.guard = GYMT.guardFor; p.hits = []; }   // too many too fast: his guard goes up, then he hits back
  p.hp -= w.dmg; p.stag = GYMT.stagger; if (p.wind > GYMT.windup * 0.5) p.wind = 0; spark(p.x, p.y, 3);   // a punch half thrown is still coming
  const a = Math.atan2(p.y - P.y, p.x - P.x); p.x += Math.cos(a) * 3; p.y += Math.sin(a) * 3;
  if (p.hp <= 0) {                                                  // down and out: KNOCKOUT
    p.hp = 0; p.stunT = GYMT.koLie; p.vx = p.vy = 0; F.phase = 'won'; F.t = 0;
    const R = GYM.S.ring, c = gymWorld(R.x, R.z); pops.push({ x: c.x, y: c.y, txt: 'KNOCKOUT!', col: '#ffd23f', life: 1.6 }); gymBell(); cam.shake = Math.max(cam.shake, 5);
  }
}
function gymHurt(d) {                       // js/06 damagePlayer: a punch on you during a bout - never below GYMT.koHp; armour does not count
  const F = GYM.fight; if (!F || F.phase !== 'fight') return false;
  P.hp = Math.max(GYMT.koHp, P.hp - d); P.hurtT = 0.25; Snd.hurt(); cam.shake = Math.max(cam.shake, 4);
  if (P.hp <= GYMT.koHp) {                                          // knocked out
    F.phase = 'lost'; F.t = 0; F.foe.vx = F.foe.vy = 0; F.foe.wind = 0;
    const R = GYM.S.ring, c = gymWorld(R.x, R.z); pops.push({ x: c.x, y: c.y, txt: 'KNOCKED OUT!', col: '#ff3b4a', life: 1.6 }); gymBell();
  }
  return true;
}
function gymLeave(p) {                      // up again, out of the ring and out of the door, then gone
  if (!p || !peds.includes(p)) return;
  const S = GYM.S, out = gymWorld(0, S.hd + 10), steps = gymWorld(S.steps.x, S.steps.z); p.leaveT = 0; p.legs = 0;
  p.post.step = (q, dt) => {
    q.leaveT += dt; const t = q.legs ? out : steps;
    if (walkTo(q, t.x, t.y, WALK, dt) < 10) q.legs++;
    if (q.legs > 1 || q.leaveT > 9) { const i = peds.indexOf(q); if (i >= 0) peds.splice(i, 1); }
    return true;
  };
}
function gymEnd() {                         // the bout over (or off): the ring open again, the bar gone
  const F = GYM.fight; GYM.fight = null; $('gymBar').hidden = true;
  if (GYM.S) GYM.S.gate.off = true;
  if (F && F.foe) { const i = peds.indexOf(F.foe); if (i >= 0) peds.splice(i, 1); }
}

/* ---------- the RING button by the ring's steps ---------- */
function gymKey() {
  const S = GYM.S; if (!S || !gymOn() || !feat('ringFights') || GYM.fight || P.car || P.dead || P.act || state !== 'play' || CUT.on || S.ms || !gymOpen()) return null;
  const st = gymWorld(S.steps.x, S.steps.z); if (dist(P.x, P.y, st.x, st.y) > 28) return null;
  if (msShut()) return null;
  return GYM.won >= 5 ? { done: true } : { k: GYM.won + 1 };
}
function gymUse(k) { if (k.done) { if (GYM.champT <= 0) { GYM.champT = 3; toast("YOU'RE THE CHAMP - NOBODY LEFT WHO WILL FIGHT YOU"); } return; } gymStart(k.k); }
function gymUi() {                          // every frame (js/14): the button by you
  const k = gymKey(), b = $('gymBtn'); if (!b) return;
  if (!k) { if (!b.hidden) b.hidden = true; return; }
  const label = k.done ? "BULL'S GYM · CHAMPION" : 'RING · BOUT ' + k.k + '/5 · ' + GYM_FIGHTERS[k.k - 1].name, go = k.done ? '★' : 'FIGHT ' + money(gymFoe(k.k).pay), key = label + go;
  if (b.hidden || b.dataset.s !== key) { b.hidden = false; b.dataset.s = key; b.querySelector('b').textContent = label; b.querySelector('.go').textContent = go; b.style.setProperty('--sc', '#ff3b4a'); }
  doorBtnAt(b);
}
if ($('gymBtn')) $('gymBtn').addEventListener('click', e => { e.stopPropagation(); const k = gymKey(); if (k) gymUse(k); });

/* ---------- js/13: the roof fades over you, the door swings ---------- */
let gymT = 0;
function gfxGym(time) {
  const dt = Math.min(0.1, Math.max(0, time - gymT)); gymT = time;
  const S = GYM.S; if (!S || !S.lm.mesh || !S.pt) return;
  const pt = S.pt, me = P.car || P, inside = !P.dead && gymIn(me.x, me.y, -6);
  S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
  if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.roofGlow.opacity = S.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = S.roof > 0.97; pt.sign.material.opacity = pt.side.material.opacity = pt.top.material.opacity = S.roof; pt.sign.visible = pt.side.visible = pt.top.visible = S.roof > 0.15; }
  const th = S.open * 1.35; pt.doors[0].rotation.y = th; pt.doors[1].rotation.y = Math.PI - th;
  const lit = gymOn() && (gymOpen() || S.ms); pt.glove.material.color.setHex(lit ? (Math.floor(time * 1.5) % 2 ? 0xff3b4a : 0xd8202c) : 0x5a2a2e);
}

/* ---------- js/14: a red glove on the minimap and the city map, at the door ---------- */
function gymIcons(g, X, Y, q, inView) {
  if (!gymOn()) return;
  const S = GYM.S, x = X(S.dx), y = Y(S.dy); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.beginPath(); g.arc(x, y - q * 0.15, q * 1.05, 0, TAU); g.fill();
  g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(x, y - q * 0.25, q * 0.82, 0, TAU); g.fill();
  g.fillStyle = '#f2f2f2'; g.fillRect(x - q * 0.55, y + q * 0.35, q * 1.1, q * 0.45);
}

/* ---------- a new game, saved games ---------- */
function gymReset() { if (GYM.fight) gymEnd(); GYM.won = 0; GYM.champT = 0; if (GYM.S) { GYM.S.ms = false; GYM.S.open = 0; } }
function gymSave() { return { won: GYM.won }; }
function gymLoad(o) { if (o && typeof o.won === 'number' && isFinite(o.won)) GYM.won = clamp(Math.round(o.won), 0, 5); }
