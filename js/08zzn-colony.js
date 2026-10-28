'use strict';
/* ---------- 8zzn. THE COLONY STORYLINE (Esther Bloom) - save the hotel: H1-H8, and the pieces it needs ----------
   Esther's marker E stands outside the Colony's front door on the ring drive. The roof terrace (modes: colonyRoof) is built with the
   hotel (js/10b colonyTerrace); here it is shown or hidden by the mode. Each quest's words, lines and numbers are in the missions table
   (js/01x); the engine in js/08zy, the enemies and friends in js/08zz. */
function gfxWrecker(time) { for (const c of cars) if (c.m && c.m.swing) c.m.swing.rotation.x = Math.sin(time * 1.3 + c.x * 0.01) * (0.12 + Math.min(0.5, carSpeed(c) * 0.004)); }   // js/13: the iron ball swings (more on the move)
function gfxColonyRoof() { const r = COLONY && COLONY.roofMesh; if (r) { const on = feat('colonyRoof'); if (r.visible !== on) r.visible = on; } }   // js/13

/* ---------- the Colony's halls as a quest's side-on building (H1): Crane's men in the corridors, thrown out in a scuffle ----------
   SB.ms.thugs: [{ fl, x, x0, x1, dir, out, fall }]; SB.ms.scuffle: { t, k } - walk into one and tap UP fast: the bar fills as you push,
   he pushes back; full, he goes flying down the stairs; empty, he shoves you off (it hurts). The numbers are the quest's (H1). */
function sbColony() {
  const h = SAFES.find(s => s.id === 'colony'); if (!h || !h.door) return null;
  return { id: 'colonyq', kind: 'hotel', name: 'COLONY HOTEL', floors: h.floors, home: -1, door: h.door };
}
function hotelLayout(h) {                 // js/08zzj sbLayout: the guests' rooms along each hall, palms in pots, the stairs switching ends
  const doors = [];
  for (let f = 1; f <= h.floors; f++) [200, 340, 760, 900, 1040].forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, name: 'ROOM ' + (f * 100 + k + 1), shut: true }));
  return { W: 1300, doors, plants: [270, 690, 1110], up: f => f % 2 === 0 ? 1190 : 110, tint: '#1e3a3c', carpet: '#5a1f3a', lobby: 'COLONY HOTEL' };
}
const scufN = () => (MS.on && MS.m.numbers) || {};
function thugNear() {                     // the one you are at (or holding)
  const M = SB.ms; if (M.scuffle) return M.scuffle.t;
  return M.thugs.find(t => !t.out && t.fl === SV.fl && Math.abs(t.x - SV.x) < 34) || null;
}
function scuffleTap(t) {                  // UP: start the scuffle, or push harder
  const M = SB.ms;
  if (!M.scuffle) { M.scuffle = { t, k: 0.45 }; SV.face = Math.sign(t.x - SV.x) || 1; Snd.tone(220, 180, 0.08, 0.08, 'square'); return; }
  M.scuffle.k += scufN().tapK || 0.1; Snd.tone(300 + 400 * M.scuffle.k, 260 + 400 * M.scuffle.k, 0.04, 0.05, 'square');
}
function thugsTick(dt) {                  // js/08zzj sbTick: they walk their halls; a scuffle runs; the thrown ones tumble away
  const M = SB.ms, sc = M.scuffle;
  for (const t of M.thugs) {
    if (t.out) { if (t.fall < 1) t.fall = Math.min(1, t.fall + dt * 1.6); continue; }
    if (sc && sc.t === t) continue;
    if ((t.wait -= dt) > 0) continue;
    t.x += t.dir * 36 * dt; if (t.x < t.x0 || t.x > t.x1) { t.x = clamp(t.x, t.x0, t.x1); t.dir *= -1; t.wait = rand(1, 2.5); }
  }
  if (!sc) return;
  if (sc.t.fl !== SV.fl) { M.scuffle = null; return; }
  sc.k -= (scufN().pushK || 0.22) * dt; SV.x = sc.t.x - (SV.face || 1) * 22;
  if (sc.k >= 1) {                        // he goes flying, down the stairs and out
    sc.t.out = true; sc.t.fall = 0; sc.t.flyDir = SV.face || 1; M.scuffle = null; M.thrown = (M.thrown || 0) + 1;
    Snd.tone(520, 180, 0.3, 0.1, 'sawtooth'); const left = M.thugs.filter(q => !q.out).length; svToast(left ? 'THROWN OUT!  ' + left + ' LEFT' : 'THE LAST OF THEM IS OUT!');
  } else if (sc.k <= 0) {                 // he shoves you off
    M.scuffle = null; damagePlayer(scufN().hurt || 8); SV.x = clamp(SV.x - (SV.face || 1) * 60, 40, SV.B.W - 40); SV.fade = 0.3; svToast('HE SHOVED YOU OFF - TAP FASTER');
  }
}
function thugsDraw(g, X, f, y0, s, time) { // js/08zzj sbDraw: grey suits; the scuffle's bar over the two of you; the thrown one flying
  const M = SB.ms, sc = M.scuffle;
  for (const t of M.thugs) {
    if (t.fl !== f) continue;
    if (t.out) { if (t.fall >= 1) continue; g.globalAlpha = 1 - t.fall; const dx = t.flyDir * t.fall * 160, dy = -Math.sin(t.fall * Math.PI) * 50; g.save(); g.translate(X(t.x + dx), y0 - 4 * s + dy * s); g.rotate(t.flyDir * t.fall * 5); svPerson(g, 0, 0, s, '#3a3f4c', '#2a2d36', '#d9a074', t.flyDir, 0, '#1a1a1a'); g.restore(); g.globalAlpha = 1; continue; }
    const fighting = sc && sc.t === t, wob = fighting ? Math.sin(time * 30) * 2 : 0;
    svPerson(g, X(t.x + wob), y0 - 4 * s, s, '#3a3f4c', '#2a2d36', '#d9a074', fighting ? -(SV.face || 1) : t.dir, fighting || t.wait > 0 ? 0 : gameT * 7 + t.x * 0.1, '#1a1a1a');
    if (fighting) { const bx = X(t.x - (SV.face || 1) * 11) - 30 * s, by = y0 - 96 * s; g.fillStyle = '#111'; g.fillRect(bx, by, 60 * s, 8 * s); g.fillStyle = sc.k > 0.7 ? '#3dff7a' : sc.k > 0.35 ? '#ffd23f' : '#ff3b4a'; g.fillRect(bx + 1 * s, by + 1 * s, 58 * s * clamp(sc.k, 0, 1), 6 * s); }
  }
}

/* ---------- the quests' shared bits: Esther at the door (marker E), a quest's fires the water cannon puts out ---------- */
const WATER_FIRES = [];                    // { x, y, lit, wet } - js/08c waterCannon wets the lit ones in its jet (H3)
const HOTEL = {
  esther(A) { const C = A.C = STORY1.colony(); A.esther = msPed(C.door.x - C.door.fx * 6, C.door.y + 22, Math.PI, Object.assign(STORY1.look('esther'), { msName: 'esther', step: STORY1.stay, spare: true, shield: true })); return A.esther; },
  meet(cut) {                              // START MISSION by Esther at the door
    return { enter(A) { MS.mark = () => A.esther; MS.guide = A.C.door; MS.start = { at: () => A.esther, label: 'START MISSION', go: () => { STORY1.face(A.esther, P); msCut(cut, () => { A.go = true; }); } }; },
      tick: A => !!A.go };
  },
  start(A, type) {                         // MISSIONS TEST: out on the ring drive, a car by the door
    const C = A.C; P.x = C.door.x + C.door.fx * 14; P.y = C.door.y + C.door.fy * 14 + 16; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;
    A.mycar = msCar(type || 'sports', C.cab.x, C.cab.y, C.cab.a, '#3d6fa8');
  },
  back(A, nums) {                          // the last step: back to Esther at the door, her lines, passed
    return { enter(A) { MS.guide = A.C.door; MS.mark = () => A.esther; },
      tick(A) { if (A.fin) return A.fin === 2; if (SV.on || dist(me4().x, me4().y, A.esther.x, A.esther.y) > 10 * UNITS_PER_M) return false; A.fin = 1; msLive(nums, { now: true, done: () => { A.fin = 2; } }); return false; },
      info: A => Math.round(dist(me4().x, me4().y, A.esther.x, A.esther.y) / UNITS_PER_M) + ' M TO ESTHER',
      jump(A) { if (SV.on) closeSide(); if (P.car) exitCar(true); P.x = A.esther.x + 20; P.y = A.esther.y + 10; } };
  },
  inland(A, d, side) { const C = A.C; return STORY1.road(C.door.x + C.door.fx * d - C.door.fy * (side || 0), C.door.y + C.door.fy * d + C.door.fx * (side || 0)); },   // a road d out from the front door, into town (the beach is behind the hotel)
  wx(lx, lz) { const c = COLONY; return { x: c.cx + c.ca * lx - c.sa * lz, y: c.cy + c.sa * lx + c.ca * lz }; }   // the hotel's frame: x toward the avenue, z along it
};
const me4 = () => P.car || P;

/* ================= H1 - NO VACANCY ================= */
MSCRIPT.h1 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A); A.h = sbColony(); const d = A.h.door; A.at = S1.at(d.x + d.fx * 12, d.y + d.fy * 12);
    const T = (fl, x, x0, x1) => ({ fl, x, x0, x1, dir: x % 2 ? 1 : -1, out: false, fall: 0, wait: 0 });
    SB.ms = { for: 'colony', open: false, spotted: false, thugs: [T(2, 500, 160, 1100), T(3, 301, 160, 640), T(3, 900, 640, 1150), T(4, 701, 160, 1150), T(5, 260, 160, 600), T(5, 981, 700, 1150), T(6, 600, 160, 1150)] };
  }
  const goIn = A => { if (!MS.start && !SV.on && !P.car && dist(P.x, P.y, A.at.x, A.at.y) < 12 * M) MS.start = { at: () => A.at, label: 'COLONY HOTEL', go2: 'GO IN', go: () => sbUse(A.h) }; };
  const left = () => SB.ms.thugs.filter(t => !t.out).length;
  const steps = [
    HOTEL.meet('NO VACANCY'),
    { enter(A) { MS.guide = A.at; MS.mark = () => A.at; },                                     // GO IN
      tick(A) { if (SV.on && SV.h.id === 'colonyq') { msLive([4], { now: true }); return true; } goIn(A); return false; },
      info: A => SV.on ? 'INSIDE' : Math.round(dist(me4().x, me4().y, A.at.x, A.at.y) / M) + ' M TO THE DOOR',
      jump(A) { if (P.car) exitCar(true); P.x = A.at.x; P.y = A.at.y; P.vx = P.vy = 0; MS.start = null; if (!SV.on) sbUse(A.h); } },
    { enter(A) { MS.guide = null; MS.mark = null; },                                           // THROW OUT all of Crane's men
      tick(A) { if (!SV.on) goIn(A); return left() === 0; },
      info: () => left() + ' LEFT' + (SV.on ? ' · FLOOR ' + SV.fl : ' · GO BACK IN'),
      jump() { for (const t of SB.ms.thugs) { t.out = true; t.fall = 1; } SB.ms.scuffle = null; } },
    HOTEL.back(null, [5, 6])];
  return { setup, steps, fail: () => '', cuts: {
    'NO VACANCY': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.esther, line: [1, 2], enter: () => { S1.face(A.esther, P); P.ang = Math.atan2(A.esther.y - P.y, A.esther.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }] } };
})();

/* ================= H2 - THE INSPECTOR ================= */
MSCRIPT.h2 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A); const C = A.C;
    const r0 = HOTEL.inland(A, 110, 40), k0 = kerbBy(r0.x, r0.y);   // the inspector's white car on the avenue
    A.car = msFoeCar('sedan', k0.x, k0.y, k0.ang, { mode: 'park', crew: 0, gun: null, group: 'insp', speed: N().carSpeed, color: '#f4f6fa' });
    A.insp = msPed(C.door.x + C.door.fx * 10 + 30, C.door.y + C.door.fy * 10, 0, { shirt: '#c8b89a', pants: '#5a4a3a', msName: 'inspector', step: S1.stay, spare: true, shield: true });
    const r = HOTEL.inland(A, 2600, 700), k = kerbBy(r.x, r.y); A.stop = S1.at(k.x, k.y);   // the meeting: a street a long drive into town
    A.meet = S1.sidewalk(k.x + 40, k.y + 30); A.sus = 0; A.watch = 0;
  }
  function suspicion(A, dt) {
    const o = P.car || P, t = A.walking ? A.insp : A.car, d = dist(o.x, o.y, t.x, t.y) / M;
    A.sus = clamp(A.sus + (d < N().closeM ? N().closeRate : -N().coolRate) * dt, 0, 1); msBar('SUSPICION', A.sus); A.d = d;
  }
  const walkStep = speed => (p, dt) => { if (p.state === 'flee') p.state = 'post'; const q = p.way && p.way[p.wi]; if (!q) return S1.stay(p, dt); if (walkTo(p, q.x, q.y, NPC_RUN * speed, dt) < 12) p.wi++; return true; };
  const steps = [
    HOTEL.meet('THE INSPECTOR'),
    { enter(A) {                                                                                 // TAIL the inspector to Crane's man
        MS.mark = () => A.walking || !A.inCar ? A.insp : A.car; A.insp.post.step = walkStep(0.7); A.insp.way = [allyDoor(A.car, A.insp)]; A.insp.wi = 0; A.insp.shield = false;
        const m = A.man = msPed(A.meet.x, A.meet.y, 0, Object.assign(S1.look('craneman'), { msName: 'craneman', step: S1.stay, spare: true }));
        A.man2 = msFoe(A.meet.x + 40, A.meet.y + 10, Object.assign({ gun: 'pistol', hp: N().menHp, group: 'h2' }, CH4.men)); void m; },
      tick(A, dt) {
        const p = A.insp;
        if (!A.inCar && (p.wi >= 1 || dist(p.x, p.y, A.car.x, A.car.y) < 30)) { A.inCar = true; const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); A.car.fc.to = [A.stop]; A.car.fc.ti = 0; A.car.fc.wait = 1; foeCarGo(A.car, 'flee'); }
        if (!A.inCar) return false;
        suspicion(A, dt);
        if (A.car.fc.gone && !A.walking) { A.walking = true; const q = S1.free(A.car.x, A.car.y, 24); p.x = q.x; p.y = q.y; peds.push(p); p.way = [S1.free(A.meet.x + 14, A.meet.y, 6)]; p.wi = 0; }
        return A.walking && p.wi >= 1; },
      info: A => A.inCar ? Math.round(A.d || 0) + ' M BEHIND HIM (LOST AT ' + N().lostM + ')' : 'HE IS GOING TO HIS CAR',
      jump(A) { A.inCar = true; A.walking = true; const p = A.insp; if (!peds.includes(p)) peds.push(p); p.x = A.meet.x + 14; p.y = A.meet.y; p.wi = 1; A.car.x = A.stop.x; A.car.y = A.stop.y; A.car.fc.gone = true; A.sus = 0;
        if (P.car) exitCar(true); P.x = A.meet.x + 200; P.y = A.meet.y + 100; } },
    { enter(A) { MS.mark = () => A.insp; face(A.insp, A.man); face(A.man, A.insp); msBarOff(); },  // WATCH the envelope change hands - close, but not too close
      tick(A, dt) {
        const d = dist(P.x, P.y, A.insp.x, A.insp.y) / M; A.d2 = d;
        if (A.cut) return !!A.done;
        if (d < N().seeM) { A.watch += dt; msBar('WATCHING', A.watch / N().watchT, '#3dff7a'); } else msBar('WATCHING', A.watch / N().watchT, '#8a8f9c');
        if (A.watch < N().watchT) return false;
        A.cut = true; msBarOff(); msCut('THE ENVELOPE', () => { A.done = true; }); return false; },
      info: A => (A.d2 ? Math.round(A.d2) : '-') + ' M - WITHIN ' + N().seeM + ' TO SEE (NOT ' + N().tooM + ')',
      jump(A) { A.watch = N().watchT; } },
    { enter(A) { foeAlert(A.man2); Object.assign(A.man, { foe: true, crim: true, hp: N().menHp, alert: true, group: 'h2', arm: gunIdx('pistol'), cool: 1, tgT: 0, sd: 1, sdT: 1, pref: 1 }); A.man.post.step = foeStep;   // TAKE OUT Crane's men; the inspector runs
        const p = A.insp; p.way = [S1.free(p.x + 400, p.y + 200, 20)]; p.wi = 0; p.post.step = walkStep(1.1); MS.mark = () => [A.man, A.man2].find(m => !m.dead); },
      tick(A) { if (A.end) return A.end === 2; if (!A.man.dead || !A.man2.dead) return false; A.end = 1; msLive([7, 8], { phone: true, done: () => { A.end = 2; } }); return false; },
      info: A => [A.man, A.man2].filter(m => !m.dead).length + ' LEFT',
      jump(A) { for (const m of [A.man, A.man2]) if (!m.dead) killPed(m, 'gun', false); } }];
  function fail(A) {
    const F = MS.m.fails;
    if (MS.k === 1 && A.inCar && !A.walking) { if (A.sus >= 1) return F.spotted; if ((A.d || 0) > N().lostM) return F.lost; if (A.car.dead) return F.wrecked; }
    if (MS.k === 2 && !A.cut && (A.d2 || 99) < N().tooM) return F.seen;
    return '';
  }
  const cuts = {
    'THE INSPECTOR': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.esther, line: [1, 2], enter: () => { face(A.esther, P); } },
      { dur: 4, cam: 'CLOSE', at: () => A.insp, line: [3], fadeOut: true }],
    'THE ENVELOPE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.man, line: [4] },
      { dur: 5, cam: 'CLOSE', at: () => A.insp, line: [5] },
      { dur: 3, cam: 'CLOSE', at: () => A.man, line: [6], enter: () => { face(A.man, P); }, fadeOut: true }]
  };
  return { setup, steps, fail, cuts };
})();

/* ================= H3 - KITCHEN FIRE ================= */
MSCRIPT.h3 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A, 'estate');
    const c = COLONY; WATER_FIRES.length = 0;                                                  // the kitchen's back windows and the service yard behind the hotel
    for (const z of [-140, -60, 30, 110]) { const w = HOTEL.wx(-c.lw / 2 - 18, z); WATER_FIRES.push({ x: w.x, y: w.y, lit: false, wet: 0, fx: 0 }); }
    const r = HOTEL.inland(A, 170, -150), k = kerbBy(r.x, r.y); A.engine = msCar('fire', k.x, k.y, k.ang, null);   // a fire engine on the avenue
    const ra = HOTEL.inland(A, 700, 500), ka = kerbBy(ra.x, ra.y);                              // the arsonists' black car, waiting to see it burn
    A.ars = msFoeCar('sedan', ka.x, ka.y, ka.ang, Object.assign({ mode: 'park', crew: 2, gun: 'pistol', group: 'ars', speed: N().carSpeed, to: [HOTEL.inland(A, 2400, -900), HOTEL.inland(A, 3800, 600)], color: '#14161d', crewHp: N().menHp }, CH4.men));
    A.burn = 0;
  }
  const lit = () => WATER_FIRES.filter(f => f.lit).length;
  function fires(A, dt) {                   // flames and smoke at each lit spot; the jet puts each out; the kitchen burns while any is lit
    for (const f of WATER_FIRES) {
      if (!f.lit) continue;
      if ((f.fx -= dt) <= 0) { f.fx = 0.07; fireFx(f.x + rand(-10, 10), f.y + rand(-10, 10), 1.7); if (Math.random() < 0.5) smokeFx(f.x, f.y, true, 2); }
      if (f.wet >= N().sprayT) { f.lit = false; Snd.tone(300, 120, 0.4, 0.08, 'sine'); smokeFx(f.x, f.y, false, 2.4, true); popup(f.x, f.y - 14, 'OUT!', '#9fd4ff'); }
    }
    A.burn = clamp(A.burn + lit() * N().burnRate * dt, 0, 1); msBar('THE KITCHEN BURNS', A.burn, '#ff7a1a');
  }
  const steps = [
    HOTEL.meet('FIRE!'),
    { enter(A) { for (const f of WATER_FIRES) f.lit = true; MS.mark = () => A.engine; MS.guide = () => A.engine; },   // GET IN the fire engine
      tick(A, dt) { fires(A, dt); return P.car === A.engine; },
      info: A => Math.round(dist(me4().x, me4().y, A.engine.x, A.engine.y) / M) + ' M TO THE FIRE ENGINE',
      jump(A) { if (P.car) exitCar(true); P.x = A.engine.x; P.y = A.engine.y; enterCar(A.engine); } },
    { enter(A) { MS.guide = () => WATER_FIRES.find(f => f.lit); MS.mark = () => WATER_FIRES.find(f => f.lit); msLive([4]); },   // PUT OUT the fires
      tick(A, dt) { fires(A, dt); if (lit() > 0) return false; msBarOff(); msLive([5, 6], { now: true }); return true; },
      info: A => lit() + ' FIRES · THE KITCHEN ' + Math.round(A.burn * 100) + '%',
      jump(A) { for (const f of WATER_FIRES) f.lit = false; } },
    { enter(A) { MS.guide = () => A.ars; MS.mark = () => A.ars; },                                  // CHASE the arsonists' car
      tick(A) { const v = A.ars; if (v.fc.mode === 'park' && dist(me4().x, me4().y, v.x, v.y) < N().spotM * M) { v.fc.wait = 0.5; foeCarGo(v, 'flee'); }
        if (!v.fc.out && !v.dead && v.fc.mode !== 'park' && v.hp < v.maxhp * 0.5) foeBail(v); return v.fc.out || v.dead; },
      info: A => Math.round(dist(me4().x, me4().y, A.ars.x, A.ars.y) / M) + ' M TO THE BLACK CAR · ' + Math.round(100 * A.ars.hp / A.ars.maxhp) + '%',
      jump(A) { const v = A.ars; if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; foeBail(v); } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'ars'); },   // TAKE OUT the arsonists
      tick(A) { if (A.end) return A.end === 2; if (msFoesLeft('ars') > 0) return false; A.end = 1; msLive([7], { phone: true, done: () => { A.end = 2; } }); return false; },
      info: () => msFoesLeft('ars') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'ars') killPed(p, 'gun', false); } }];
  function fail(A) {
    const F = MS.m.fails;
    if (MS.k >= 1 && MS.k <= 2 && A.burn >= 1) return F.burnt;
    if (MS.k === 3 && !A.ars.fc.out && !A.ars.dead && (A.ars.fc.gone || dist(me4().x, me4().y, A.ars.x, A.ars.y) > N().away * M)) return F.away;
    return '';
  }
  const cuts = {
    'FIRE!': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 5, cam: 'WIDE', at: () => WATER_FIRES[1], line: [2, 3], enter: () => { for (const f of WATER_FIRES) f.lit = true; }, tick: () => { for (const f of WATER_FIRES) { if (Math.random() < 0.6) fireFx(f.x + rand(-10, 10), f.y + rand(-10, 10), 1.7); if (Math.random() < 0.3) smokeFx(f.x, f.y, true, 2); } }, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { WATER_FIRES.length = 0; msBarOff(); } };
})();
