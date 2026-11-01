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
  function meetMen(A) {                                               // Crane's man at the meeting and his minder (once)
    if (A.man) return; A.man = msPed(A.meet.x, A.meet.y, 0, Object.assign(S1.look('craneman'), { msName: 'craneman', step: S1.stay, spare: true }));
    A.man2 = msFoe(A.meet.x + 40, A.meet.y + 10, Object.assign({ gun: 'pistol', hp: N().menHp, group: 'h2' }, CH4.men));
  }
  const steps = [
    HOTEL.meet('THE INSPECTOR'),
    { enter(A) {                                                                                 // TAIL the inspector to Crane's man
        MS.mark = () => A.walking || !A.inCar ? A.insp : A.car; A.insp.post.step = walkStep(0.7); A.insp.way = [allyDoor(A.car, A.insp)]; A.insp.wi = 0; A.insp.shield = false;
        meetMen(A); },
      tick(A, dt) {
        const p = A.insp;
        if (!A.inCar && (p.wi >= 1 || dist(p.x, p.y, A.car.x, A.car.y) < 30)) { A.inCar = true; const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); A.car.fc.to = [A.stop]; A.car.fc.ti = 0; A.car.fc.wait = 1; foeCarGo(A.car, 'flee'); }
        if (!A.inCar) return false;
        suspicion(A, dt);
        if (A.car.fc.gone && !A.walking) { A.walking = true; const q = S1.free(A.car.x, A.car.y, 24); p.x = q.x; p.y = q.y; peds.push(p); p.way = [S1.free(A.meet.x + 14, A.meet.y, 6)]; p.wi = 0; }
        return A.walking && p.wi >= 1; },
      info: A => A.inCar ? Math.round(A.d || 0) + ' M BEHIND HIM (LOST AT ' + N().lostM + ')' : 'HE IS GOING TO HIS CAR',
      jump(A) { meetMen(A); A.inCar = true; A.walking = true; const p = A.insp; if (!peds.includes(p)) peds.push(p); p.x = A.meet.x + 14; p.y = A.meet.y; p.wi = 1; A.car.x = A.stop.x; A.car.y = A.stop.y; A.car.fc.gone = true; A.sus = 0;
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

/* ================= H4 - THE BAND ================= */
MSCRIPT.h4 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const goIn = (A, p) => {                  // a musician home: out of the car, in at the door, gone
    if (p.aboard) allyAlight(p); MS_CAST.allies = MS_CAST.allies.filter(q => q !== p); Object.assign(p, { ally: false, calm: true, arm: -1, shield: true });
    const d = A.C.door; p.post.step = (q, dt) => { if (q.state === 'flee') q.state = 'post'; if (walkTo(q, d.x, d.y, RUN, dt) < 10) { const i = peds.indexOf(q); if (i >= 0) peds.splice(i, 1); } return true; };
    A.home++; Snd.tone(523, 784, 0.25, 0.1, 'triangle'); toast(A.home < 3 ? A.home + ' OF THE BAND HOME' : 'THE WHOLE BAND IS HOME');
  };
  const atDoor = (A, o) => dist(o.x, o.y, A.C.door.x, A.C.door.y) < N().homeM * M;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A, 'convertible'); A.home = 0; const C = A.C;
    // THE DRUMMER: Vinnie and Sammy in the speedway's paddock; the race on the oval from the east straight
    const pit = SPW_PIT || { x: SPW.booth[0], y: SPW.booth[1] - 200 }, v = S1.free(pit.x - 70, pit.y + 20, 8), s = S1.free(pit.x - 110, pit.y + 30, 8);
    A.vin = msPed(v.x, v.y, 0, Object.assign(S1.look('vinnie'), { msName: 'vinnie', step: S1.stay, spare: true, shield: true }));
    A.sam = msPed(s.x, s.y, 0, Object.assign(S1.look('sticks'), { msName: 'sticks', step: S1.stay, spare: true, shield: true }));
    const u0 = OV.t2 + 80, k = Math.max(8, OV.w / 2 - 25);
    A.D = { ph: 'go', u0, k, end: u0 + N().laps * OV.L, cp: 0, n: Math.round(N().laps * 4) };
    // THE SINGER: Lola at THE PULSE's door, three doormen Crane pays to keep her there
    const [kx, ky] = CASM.cdoor; A.S = { ph: 'go', at: S1.at(kx, ky + 60) };
    A.lola = msPed(kx + 34, ky + 44, Math.PI / 2, Object.assign(S1.look('lola'), { msName: 'lola', step: S1.stay, spare: true, shield: true }));
    A.door = [[0, 40, 'bat', N().bouncerHp], [-46, 58, 'fists', N().doorHp], [74, 54, 'fists', N().doorHp]].map(([dx, dy, gun, hp]) => {
      const p = msFoe(kx + dx, ky + dy, { gun, hp, group: 'door', a: Math.PI / 2, shirt: '#141418', pants: '#26262e' }); p.calm = true; return p; });
    // THE TRUMPET: Teddy on a jet ski off the Colony's beach; a speedboat at the water's edge behind the hotel
    const d = C.door; let w = null;
    for (let r = 0; r < 4000 && !w; r += 20) { const x = d.x - d.fx * r, y = d.y - d.fy * r; if (boatDist(x, y) < -60) w = S1.at(x, y); }
    w = w || S1.at(d.x - d.fx * 1900, d.y - d.fy * 1900);
    const out = Math.atan2(-d.fy, -d.fx);
    A.boat = msCar('speedboat', w.x - d.fx * 30, w.y - d.fy * 30, out, '#f4f6fa');
    A.land = S1.at(w.x + d.fy * 160, w.y - d.fx * 160);
    const R0 = N().skiR * M; let cx = w.x - d.fx * (R0 + 500), cy = w.y - d.fy * (R0 + 500), way = [];
    for (let tries = 0; tries < 6 && way.length < 5; tries++) {
      way = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = cx + Math.cos(a) * R0, y = cy + Math.sin(a) * R0; if (boatDist(x, y) < -80) way.push(S1.at(x, y)); }
      cx -= d.fx * 300; cy -= d.fy * 300;
    }
    A.T = { ph: 'go', way, wi: 0, k: 0 };
    const w0 = way[0] || S1.at(cx, cy); A.ski = msCar('jetski', w0.x, w0.y, 0, '#ffd23f'); A.ski.noEnter = true; A.ski.hp = A.ski.maxhp = A.ski.maxhp * N().skiTough;
    A.ski.driver = 'ai'; A.ski.msDrive = (c, dt) => skiDrive(A, c, dt);
  }
  function skiDrive(A, c, dt) {             // Teddy on his jet ski: round and round off the beach, away from a boat that comes close; caught, in to the beach
    const T = A.T; if (c.dead || c.sunk || T.ph === 'done') { c.thr = 0; c.str = 0; return; }
    if (T.ph === 'home') { if (dist(c.x, c.y, A.land.x, A.land.y) < 70) { c.thr = 0; c.str = 0; c.hb = true; return; } steerToward(c, A.land.x, A.land.y, 30 * KMH); return; }
    let t = T.way[T.wi % T.way.length]; if (!t) { c.thr = 0; return; }
    if (dist(c.x, c.y, t.x, t.y) < 110) { T.wi++; t = T.way[T.wi % T.way.length]; }
    const me = P.car || P, dP = dist(c.x, c.y, me.x, me.y);
    if (P.car && P.car.t.boat && dP < N().dodgeM * M) {     // a boat on him: away from it, while the water allows
      const a = Math.atan2(c.y - me.y, c.x - me.x) + Math.sin(gameT * 1.7) * 0.6, x = c.x + Math.cos(a) * 300, y = c.y + Math.sin(a) * 300;
      if (boatDist(x, y) < -60) t = S1.at(x, y);
    }
    steerToward(c, t.x, t.y, N().skiSpeed * KMH);
  }
  // ---- the drummer: the race ----
  function raceSet(A) {                     // the track cleared; Vinnie's BRUISER and his spare on the grid
    const D = A.D, q = {}, pts = [], d0 = D.u0 - 400;
    for (let u = d0; u <= D.end + 300; u += RDS) { ovalAt(u, 0, q); pts.push([q.x, q.y]); }
    const R = D.R = makeRoute(pts, [-D.k, 0, D.k], d0);
    cars = cars.filter(c => c.keep || c.hook || c === P.car || !spwIn(c.x, c.y) || Math.abs(ovalU(c.x, c.y).off) > OV.w / 2 + 14);
    ovalAt(D.u0 - 34, D.k, q); D.slot = { x: q.x, y: q.y, ang: q.ang };
    A.spare = msCar('muscle', q.x, q.y, q.ang, '#f4f6fa');
    const r = A.rival = addRival(R, 'muscle', D.u0 - 34, -D.k, N().vPace / 100, 0.75, '#ff8a2a'); MS.A.list.push(r);
    const i = peds.indexOf(A.vin); if (i >= 0) peds.splice(i, 1);   // Vinnie at his wheel
  }
  const cpAt = (A, j) => ovalAt(A.D.u0 + (j + 1) * OV.L / 4, 0, {});
  function raceTick(A, dt) {
    const D = A.D, c = A.spare;
    if (D.ph === 'car') { if (P.car === c) { D.ph = 'count'; D.t = N().count; D.beep = Math.ceil(D.t) + 1; msObjective('WIN THE RACE - ' + N().laps + ' LAPS'); } return; }
    if (D.ph === 'count') {
      Object.assign(c, { x: D.slot.x, y: D.slot.y, ang: D.slot.ang, vx: 0, vy: 0, av: 0 });
      D.t -= dt; const n = Math.ceil(D.t);
      if (n < D.beep && n > 0) { D.beep = n; bigCount(String(n)); Snd.tone(440, 440, 0.15, 0.1, 'square'); }
      if (D.t <= 0) { D.ph = 'race'; A.rival.race.go = true; bigCount('GO', true); Snd.tone(880, 880, 0.35, 0.12, 'square'); }
      return;
    }
    if (D.ph !== 'race') return;
    const p = cpAt(A, D.cp);
    if (dist(c.x, c.y, p.x, p.y) < OV.w / 2 + 40) { D.cp++; Snd.tone(660, 990, 0.12, 0.08, 'triangle'); }
    if (D.cp < D.n) return;
    D.ph = 'won'; A.rival.race.hold = true; msLive([7, 8], { now: true });
    msAllyFrom(A.sam, { who: 'sticks', calm: true, fail: F().sticks }); A.sam.shield = false;
    D.ph = 'bring';
  }
  const rivalD = A => { const K = A.rival && A.rival.race; return K ? K.d : 0; };
  // ---- which of the three is on now, and where to go for it ----
  function active(A) {
    const on = [['D', A.D], ['S', A.S], ['T', A.T]].filter(([, s]) => s.ph !== 'go' && s.ph !== 'done');
    if (on.length) return on[on.length - 1][0];
    const me = P.car || P, left = [['D', A.vin], ['S', A.lola], ['T', A.ski]].filter(([k]) => A[k].ph === 'go');
    if (!left.length) return null;
    left.sort((a, b) => dist(me.x, me.y, a[1].x, a[1].y) - dist(me.x, me.y, b[1].x, b[1].y)); return left[0][0];
  }
  function target(A, k) {
    if (k === 'D') { const D = A.D; return D.ph === 'go' || D.ph === 'cut' ? A.vin : D.ph === 'car' ? A.spare : D.ph === 'count' ? D.slot : D.ph === 'race' ? cpAt(A, D.cp) : A.C.door; }
    if (k === 'S') return A.S.ph === 'go' || A.S.ph === 'cut' ? A.lola : A.S.ph === 'fight' ? A.door.find(p => !p.dead) || A.lola : A.C.door;
    if (k === 'T') return A.T.ph === 'go' ? (P.car && P.car.t.boat ? A.ski : A.boat) : A.T.ph === 'catch' ? A.ski : A.land;
    return A.esther;
  }
  const OBJ = { D: { go: 'THE DRUMMER: SAMMY AT THE SPEEDWAY', car: "GET IN VINNIE'S SPARE ON THE TRACK", bring: 'BRING SAMMY BACK TO THE COLONY' },
    S: { go: 'THE SINGER: LOLA AT THE PULSE', fight: 'TAKE OUT THE DOORMEN', bring: 'BRING LOLA BACK TO THE COLONY' },
    T: { go: 'THE TRUMPET: TEDDY ON A JET SKI OFF THE BEACH - GET A BOAT', catch: "CATCH TEDDY - STAY ON HIS JET SKI'S TAIL", home: 'TEDDY RIDES IN TO THE BEACH' } };
  function band(A, dt) {                    // every frame of the step: the three at once, any order
    const me = P.car || P, D = A.D, S = A.S, T = A.T;
    // the drummer
    if (D.ph === 'go' && !CUT.on && dist(me.x, me.y, A.vin.x, A.vin.y) < N().nearM * M) { D.ph = 'cut'; msCut('DOUBLE OR NOTHING', () => { raceSet(A); D.ph = 'car'; }); }
    raceTick(A, dt);
    if (D.ph === 'bring' && !A.sam.dead && atDoor(A, A.sam.aboard || A.sam)) { goIn(A, A.sam); D.ph = 'done'; }
    // the singer
    if (S.ph === 'go' && !CUT.on && dist(me.x, me.y, A.lola.x, A.lola.y) < N().nearM * M) { S.ph = 'cut'; msCut('THE DOOR', () => { S.ph = 'fight'; for (const p of A.door) if (!p.dead) { p.calm = false; foeAlert(p); } }); }
    if (S.ph === 'go' && A.door.some(p => p.dead || p.alert)) { S.ph = 'fight'; for (const p of A.door) if (!p.dead) { p.calm = false; foeAlert(p); } }   // started it yourself
    if (S.ph === 'fight' && A.door.every(p => p.dead)) { S.ph = 'bring'; msLive([11], { now: true }); msAllyFrom(A.lola, { who: 'lola', calm: true, fail: F().lola }); A.lola.shield = false; }
    if (S.ph === 'bring' && !A.lola.dead && atDoor(A, A.lola.aboard || A.lola)) { goIn(A, A.lola); S.ph = 'done'; }
    // the trumpet
    const ski = A.ski;
    if (T.ph === 'go' && P.car && P.car.t.boat) T.ph = 'catch';
    if (T.ph === 'catch') {
      const close = P.car && P.car.t.boat && dist(P.car.x, P.car.y, ski.x, ski.y) < N().catchM * M;
      if (!T.said && P.car && P.car.t.boat && dist(P.car.x, P.car.y, ski.x, ski.y) < 60 * M) { T.said = true; msLive([12]); }
      T.k = clamp(T.k + (close ? dt : -dt * 0.5) / N().catchT, 0, 1); msBar('CATCHING TEDDY', T.k, '#ffc83a');
      if (T.k >= 1 || T.caught) { T.ph = 'home'; msBarOff(); msLive([13], { now: true }); }
    } else if (T.ph === 'home' && dist(ski.x, ski.y, A.land.x, A.land.y) < 90) {   // on the beach: he walks up to the hotel
      T.ph = 'done'; ski.driver = null; ski.msDrive = null; ski.vx = ski.vy = 0;
      const q = S1.dryNear(ski.x + A.C.door.fx * 60, ski.y + A.C.door.fy * 60), t = A.ted = msPed(q.x, q.y, 0, Object.assign(S1.look('teddy'), { msName: 'teddy', spare: true, shield: true }));
      A.home++; const d = A.C.door; t.post.step = (o, dt) => { if (o.state === 'flee') o.state = 'post'; if (walkTo(o, d.x, d.y, WALK * 1.6, dt) < 10) { const i = peds.indexOf(o); if (i >= 0) peds.splice(i, 1); } return true; };
      Snd.tone(523, 784, 0.25, 0.1, 'triangle'); toast(A.home < 3 ? A.home + ' OF THE BAND HOME' : 'THE WHOLE BAND IS HOME');
    }
    // the marker, the line on the streets, the words
    const k = active(A); A.act = k;
    MS.mark = () => A.act ? target(A, A.act) : null; MS.guide = () => A.act ? target(A, A.act) : null;
    const ph = k && A[k].ph, key = k + ph;
    if (k && OBJ[k][ph] && A.objKey !== key) { A.objKey = key; msObjective(OBJ[k][ph]); }
    return A.home >= 3;
  }
  const info = A => {
    const tag = (k, n) => n + (A[k].ph === 'done' ? ' HOME' : A[k].ph === 'go' ? '' : ' ...');
    let s = [tag('D', 'DRUMS'), tag('S', 'VOICE'), tag('T', 'TRUMPET')].join(' · ');
    const D = A.D;
    if (A.act === 'D' && D.ph === 'race') { const lap = Math.min(N().laps, Math.floor(D.cp / 4) + 1), mine = D.u0 + D.cp * OV.L / 4; s = 'LAP ' + lap + '/' + N().laps + ' · ' + (mine >= rivalD(A) ? '1ST' : '2ND'); }
    if (A.act === 'D' && D.ph === 'count') s = 'GET READY';
    return s;
  };
  function jump(A) {                        // one push further for the one on now (MISSIONS TEST and the test bot)
    const k = A.act || active(A); if (!k) return; const s = A[k];
    const put = (x, y) => { if (P.car) exitCar(true); P.x = x; P.y = y; P.vx = P.vy = 0; };
    const ride = (x, y) => { if (P.car) { P.car.x = x; P.car.y = y; P.car.vx = P.car.vy = 0; P.x = x; P.y = y; } else put(x, y); };
    const home = p => { const d = A.C.door; if (p.aboard) ride(d.x + 30, d.y + 20); else { put(d.x + 30, d.y + 20); p.x = d.x + 20; p.y = d.y + 40; } };
    if (k === 'D') {
      if (s.ph === 'go') put(A.vin.x + 40, A.vin.y + 30);
      else if (s.ph === 'car') { put(A.spare.x, A.spare.y); enterCar(A.spare); }
      else if (s.ph === 'count') s.t = 0;
      else if (s.ph === 'race') { s.cp = s.n; }
      else if (s.ph === 'bring') home(A.sam);
    } else if (k === 'S') {
      if (s.ph === 'go') put(A.lola.x - 30, A.lola.y + 120);
      else if (s.ph === 'fight') { for (const p of A.door) if (!p.dead) killPed(p, 'fists', false); }
      else if (s.ph === 'bring') home(A.lola);
    } else if (k === 'T') {
      if (s.ph === 'go') { put(A.boat.x, A.boat.y); enterCar(A.boat); }
      else if (s.ph === 'catch') s.caught = true;
      else if (s.ph === 'home') { A.ski.x = A.land.x + 20; A.ski.y = A.land.y; }
    }
  }
  const steps = [
    HOTEL.meet('THE BAND'),
    { enter(A) { MS.mark = () => A.vin; },
      tick: (A, dt) => band(A, dt), info, jump },
    HOTEL.back(null, [14, 15])];
  function fail(A) {
    const f = msCastFail(); if (f) return f;
    const D = A.D;
    if ((D.ph === 'count' || D.ph === 'race') && P.car !== A.spare) return F().quit;
    if (D.ph === 'race' && rivalD(A) >= D.end) return F().lost;
    if (A.T.ph !== 'done' && (A.ski.dead || A.ski.sunk)) return F().sank;
    if (A.S.ph !== 'done' && A.lola.dead) return F().lola;
    if (A.D.ph !== 'done' && A.sam.dead) return F().sticks;
    return '';
  }
  const cuts = {
    'THE BAND': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [2] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'DOUBLE OR NOTHING': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.vin, line: [4], enter: () => { face(A.vin, P); face(A.sam, P); P.ang = Math.atan2(A.vin.y - P.y, A.vin.x - P.x); } },
      { dur: 3, cam: 'CLOSE', at: () => A.sam, line: [5] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [6], fadeOut: true }],
    'THE DOOR': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.lola, line: [9], enter: () => { face(A.lola, P); for (const p of A.door) face(p, P); } },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [10], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { msBarOff(); if (A && A.rival) { A.rival.race = null; A.rival.driver = null; } } };
})();

/* ================= H5 - THE DEED ================= */
MSCRIPT.h5 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A); BANK.ms = { quest: 'h5' };
    const S = A.S = BANK.S, hw = S.hw, z1 = S.z1, cz = S.counter.z, w = (lx, lz) => bankWorld(lx, lz), fa = a => S.a + a;
    A.hostages = [];
    const lie = (lx, lz, a, shirt, pants) => { const q = w(lx, lz); const p = msPed(q.x, q.y, fa(a), { shirt, pants, step: S1.stay, spare: true, shield: true, floor: true }); A.hostages.push(p); return p; };
    for (const t of S.tellers) lie(t.x, t.z, 0.3, '#e8e8ee', '#2a2d3a');                 // the tellers, down behind the counter
    lie(-hw * 0.6, cz + 26, 2.6, '#ff9ad0', '#3a3a44'); lie(-hw * 0.2, cz + 30, 0.4, '#7fd4a8', '#d8c8a0'); lie(hw * 0.05, z1 - 30, 1.2, '#d8b060', '#4a3a2a');   // customers on the marble
    lie(hw - 30, z1 - 26, 2.0, '#1a1a20', '#1a1a20'); lie(BANK_DW / 2 + 14, z1 - 16, -0.4, '#4a5a6a', '#2a2d36');   // the manager; the guard
    const men = [[-hw * 0.4, cz + 40, 'smg'], [hw * 0.12, cz + 48, 'shotgun'], [-BANK_DW / 2 - 16, z1 - 22, 'pistol']];
    A.men = men.map(([lx, lz, gun]) => { const q = w(lx, lz); return msFoe(q.x, q.y, Object.assign({ gun, hp: N().menHp, group: 'rob', a: fa(Math.PI / 2) }, CH4.men)); });
    const v = S.vault; A.boxman = msFoe(v.x, v.y, Object.assign({ gun: 'pistol', hp: N().boxHp, group: 'box', a: fa(-Math.PI / 2) }, CH4.men)); A.boxman.calm = true; A.carry = A.boxman;
    const k = kerbBy(S.door.x + S.ca * 90, S.door.y + S.sa * 90);                      // the getaway car at the kerb out front, its driver waiting
    const r1 = S1.road(S.door.x + 1800, S.door.y + 2400), r2 = S1.road(S.door.x - 1200, S.door.y + 4200), r3 = S1.road(S.door.x + 600, S.door.y + 6400);
    A.car = msFoeCar('sedan', k.x, k.y, k.ang, Object.assign({ mode: 'park', crew: 1, gun: 'smg', group: 'getaway', speed: N().carSpeed, to: [r1, r2, r3], color: '#14161d', crewHp: N().menHp }, CH4.men));
  }
  const hallLeft = A => A.men.filter(p => !p.dead).length;
  function runFor(A) {                       // the man with the box: out of the vault, through the hall, out of the doors, to the car
    const S = A.S, p = A.boxman; p.calm = false; p.alert = true; p.arm = -1;
    p.way = [S.vaultDoor, S.hall, S.inside, S.door, allyDoor(A.car, p)]; p.wi = 0;
    p.post.step = (q, dt) => { if (q.state === 'flee') q.state = 'post'; const t = q.way[q.wi]; if (!t) return true; if (walkTo(q, t.x, t.y, NPC_RUN * N().boxRun, dt) < 12) q.wi++; return true; };
  }
  function dropBox(A, p) { A.carry = null; A.bag = S1.dryNear(p.x, p.y); }
  const steps = [
    HOTEL.meet('THE DEED'),
    { enter(A) { MS.mark = () => A.S.door; MS.guide = A.S.door; },                                 // GO TO the bank
      tick(A) { if (dist(me4().x, me4().y, A.S.door.x, A.S.door.y) > N().nearM * M) return false; msLive([4]); return true; },
      info: A => Math.round(dist(me4().x, me4().y, A.S.door.x, A.S.door.y) / M) + ' M TO FIRST CORAL BANK',
      jump(A) { if (P.car) exitCar(true); P.x = A.S.door.x; P.y = A.S.door.y; P.vx = P.vy = 0; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.men.find(p => !p.dead); },                    // TAKE OUT the robbers in the hall
      tick(A) { if (hallLeft(A)) return false; runFor(A); msLive([5, 6], { now: true }); return true; },
      info: A => hallLeft(A) + ' LEFT IN THE HALL',
      jump(A) { for (const p of A.men) if (!p.dead) killPed(p, 'gun', false); if (!A.boxman.way) runFor(A); } },   // (a step jumped to: he is off with the box)
    { enter(A) { MS.mark = () => A.boxman.dead ? null : A.boxman; for (const h of A.hostages) if (!h.dead) h.floor = false; },   // STOP the man with the box (or he is off in the car)
      tick(A) {
        const p = A.boxman;
        if (p.dead) { if (!A.bag && A.carry === p) dropBox(A, p); return true; }
        if (p.wi >= p.way.length) { const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); A.carry = null; A.boxIn = true; A.car.fc.crew++; A.car.fc.wait = 0.4; foeCarGo(A.car, 'flee'); return true; }
        return false; },
      info: A => A.boxman.dead ? '' : Math.round(dist(P.x, P.y, A.boxman.x, A.boxman.y) / M) + ' M TO THE MAN WITH THE BOX',
      jump(A) { const p = A.boxman; p.x = A.car.x + 20; p.y = A.car.y + 20; p.wi = p.way.length; } },
    { enter(A) { MS.mark = () => A.carry || A.bag || (A.car.fc.out ? null : A.car); MS.guide = () => A.carry || A.bag || A.car; },   // CHASE the getaway car, ram it, take them out (skipped if the box is down already)
      tick(A) {
        if (!A.boxIn) return true;
        const v = A.car;
        if (!v.fc.out && !v.dead && v.hp < v.maxhp * N().bailAt / 100) { const men = foeBail(v); A.carry = men[men.length - 1]; }
        if (A.carry && A.carry.dead) dropBox(A, A.carry);
        return !!A.bag && msFoesLeft('getaway') === 0; },
      info: A => A.car.fc.out ? msFoesLeft('getaway') + ' LEFT' : Math.round(dist(me4().x, me4().y, A.car.x, A.car.y) / M) + ' M TO THE GETAWAY CAR · ' + Math.round(100 * A.car.hp / A.car.maxhp) + '%',
      jump(A) { const v = A.car; if (!v.fc.out) { if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; const men = foeBail(v); A.carry = men[men.length - 1]; } else for (const p of peds) if (p.foe && !p.dead && p.group === 'getaway') killPed(p, 'gun', false);
        if (!A.bag) { const c = A.carry && !A.carry.dead ? A.carry : null; if (c) killPed(c, 'gun', false); dropBox(A, c || v); } } },   // (a step jumped to: the box on the ground)
    { enter(A) { if (!A.bag) dropBox(A, A.carry || A.boxman); MS.mark = () => A.bag; MS.guide = () => A.bag; },   // PICK UP the deed box (always somewhere on the ground by now)
      tick(A) { if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > N().pickM * M) return false; A.bag = null; Snd.tone(660, 990, 0.2, 0.1, 'triangle'); toast('THE DEED BOX'); msLive([7], { now: true }); return true; },
      info: A => A.bag ? Math.round(dist(me4().x, me4().y, A.bag.x, A.bag.y) / M) + ' M TO THE BOX' : '',
      jump(A) { if (P.car) exitCar(true); P.x = A.bag.x; P.y = A.bag.y; } },
    HOTEL.back(null, [8, 9])];
  function fail(A) {
    const f = F();
    if (A.hostages.some(h => h.dead)) return f.hostage;
    if (A.boxIn && !A.bag && A.car.dead && !A.car.fc.out) return f.burnt;
    if (MS.k === 4 && A.boxIn && !A.car.fc.out && !A.car.dead && (A.car.fc.gone || dist(me4().x, me4().y, A.car.x, A.car.y) > N().away * M)) return f.away;
    return '';
  }
  const cuts = {
    'THE DEED': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 5, cam: 'CLOSE', at: () => A.esther, line: [2] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { BANK.ms = null; msBarOff(); } };
})();

/* ================= H6 - POOL PARTY ================= */
MSCRIPT.h6 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const H = () => COLONY.H, hut = () => HOTEL.wx(-56, 170);
  const onRoof = o => zOf(o) > H() - 2;
  const local = o => { const c = COLONY, dx = o.x - c.cx, dy = o.y - c.cy; return { x: dx * c.ca + dy * c.sa, z: -dx * c.sa + dy * c.ca }; };
  const up = (p, lx, lz) => { const w = HOTEL.wx(lx, lz); p.x = w.x; p.y = w.y; p.z = H(); p.roof = COLONY.solid; if (p.post) { p.post.x = w.x; p.post.y = w.y; } return p; };   // someone put up on the roof
  const roofPed = (lx, lz, a, o) => up(msPed(0, 0, a, Object.assign({ step: S1.stay, spare: true, shield: true }, o)), lx, lz);
  function toRoof(A) {                      // you, up the stairs and out of the hut onto the terrace
    if (P.car) exitCar(true); const w = hut(); P.x = w.x; P.y = w.y; P.vx = P.vy = 0; P.z = H(); P.roof = COLONY.solid; cam.x = P.x; cam.y = P.y; A.upT = gameT;
  }
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A); A.wave = 0; A.party = 1; A.queue = []; A.cars = [];
    const rd = openRoad(A.C.door.x, A.C.door.y, 3000), q = rd ? edgeAt(rd.e, rd.s, {}) : HOTEL.inland(A, 300, 0);
    A.drop = { x: q.x, y: q.y };             // they pull up on the open street nearest the door (the ring drive is a driveway, off the roads)
    A.guests = [];                           // dancers on the dance floor, the band at its end
    const cols = [['#ff2bd6', '#1a1a20'], ['#2bf3ff', '#f2f2ee'], ['#ffe14a', '#3a3a44'], ['#3dffa6', '#2a2d3a'], ['#ff7a3d', '#1a1a20'], ['#a259ff', '#e8e0c8'], ['#f4f6fa', '#1d2f4a'], ['#ff9ad0', '#3a2a1a']];
    cols.forEach(([shirt, pants], i) => { const p = roofPed(-58 + (i % 4) * 14, -10 + Math.floor(i / 4) * 24, rand(0, TAU), { shirt, pants, dance: true }); A.guests.push(p); });
    A.band = [['sticks', -28], ['lola', -42], ['teddy', -56]].map(([id, lx]) => roofPed(lx, 58, 0, Object.assign(S1.look(id), { msName: id, dance: id !== 'sticks' })));
  }
  function wave(A) {                        // the next wave: its cars come in from town and up the ring drive to the door
    const n = [N().wave1, N().wave2, N().wave3][A.wave]; A.wave++; let left = n, k = 0;
    while (left > 0) {
      const crew = Math.min(3, left); left -= crew;
      const r = HOTEL.inland(A, N().fromM * M + k * 160, (k % 2 ? 1 : -1) * 500), q = kerbBy(r.x, r.y);
      const c = msFoeCar('sedan', q.x, q.y, q.ang, Object.assign({ mode: 'flee', crew, gun: 'pistol', group: 'crew', speed: N().carSpeed, to: [A.drop], color: '#14161d', crewHp: N().menHp }, CH4.men));
      c.fc.wait = k * 1.2; A.cars.push(c); k++;
    }
    msLive([[4, 6, 7][A.wave - 1]], { now: true });
  }
  function arrive(A) {                      // a car at the door: out they get, in at the door, up the stairs (a while), out of the hut
    for (const c of A.cars) {
      if (c.dead || c.fc.out || !c.fc.gone) continue;
      const R = COLONY.ring, k = (R.ri + R.ro) / 2, inQ = q => { const i = peds.indexOf(q); if (i >= 0) peds.splice(i, 1); A.queue.push({ t: gameT + N().climbT * rand(0.8, 1.3), hp: q.hp }); };
      for (const p of foeBail(c)) {                                 // up the ring drive by the nearer lane, to the door (held up long behind something: in anyway)
        const sd = Math.sign((p.x - R.x) * R.vx + (p.y - R.y) * R.vy) || 1;
        p.way = [{ x: R.x + R.vx * k * sd, y: R.y + R.vy * k * sd }, A.C.door]; p.wi = 0; p.held = 0; p.from = { x: p.x, y: p.y };
        p.post.step = (q, dt) => { if (q.state === 'flee') q.state = 'post'; const t = q.way[q.wi];
          if (castWalk(q, t.x, t.y, NPC_RUN, dt) < 16) { if (q.wi < q.way.length - 1) q.wi++; else inQ(q); return true; }
          if ((q.held += dt) > 3) { if (dist(q.x, q.y, q.from.x, q.from.y) < 40) { inQ(q); return true; } q.held = 0; q.from = { x: q.x, y: q.y }; }
          return true; };
      }
    }
    for (let i = A.queue.length - 1; i >= 0; i--) {
      const e = A.queue[i]; if (gameT < e.t) continue; A.queue.splice(i, 1);
      const w = hut(), p = msFoe(w.x, w.y, Object.assign({ gun: Math.random() < 0.3 ? 'smg' : 'pistol', hp: e.hp, group: 'crew', alert: true, a: Math.PI }, CH4.men)); p.z = H(); p.roof = COLONY.solid;   // up there (js/10k cpLift leaves someone on a roof be)
      if (!A.said5) { A.said5 = true; msLive([5]); }
    }
  }
  const roofFoes = () => peds.filter(p => p.foe && !p.dead && p.group === 'crew' && onRoof(p));
  const crewLeft = A => msFoesLeft('crew') + A.queue.length;
  function keep(A) {                        // on the roof they stay on the roof (no one walks off the edge); the guests dance on
    const c = COLONY, mx = c.lw / 2 - 6, mz = c.lh / 2 - 6;
    for (const p of roofFoes()) { const q = local(p); if (Math.abs(q.x) > mx || Math.abs(q.z) > mz) { const w = HOTEL.wx(clamp(q.x, -mx, mx), clamp(q.z, -mz, mz)); p.x = w.x; p.y = w.y; } }
    for (const p of A.guests.concat(A.band, [A.esther])) if (!p.dead) { p.z = H(); p.vx = p.vy = 0; }
  }
  const startUp = A => { if (!onRoof(P) && !SV.on && !MS.start && !P.car && dist(P.x, P.y, A.C.door.x, A.C.door.y) < 14 * M) MS.start = { at: () => A.C.door, label: 'COLONY HOTEL', go2: 'UP TO THE ROOF', go: () => toRoof(A) }; };
  const steps = [
    HOTEL.meet('POOL PARTY'),
    { enter(A) { up(A.esther, -76, 4); face(A.esther, HOTEL.wx(-30, 4)); MS.guide = A.C.door; MS.mark = () => A.C.door; },   // GO UP to the roof (Esther went up ahead)
      tick(A) { if (onRoof(P)) return true; startUp(A); return false; },
      info: A => onRoof(P) ? 'ON THE ROOF' : Math.round(dist(me4().x, me4().y, A.C.door.x, A.C.door.y) / M) + ' M TO THE DOOR',
      jump(A) { MS.start = null; toRoof(A); } },
    { enter(A) { MS.guide = null; MS.mark = () => roofFoes()[0] || null; A.nextT = gameT + N().firstT; },   // HOLD the roof: three waves up the ring drive and the stairs
      tick(A, dt) {
        if (A.end) return A.end === 2;
        keep(A); arrive(A); startUp(A);
        const on = roofFoes().length; A.party = clamp(A.party - on * N().partyDrop * dt + (on ? 0 : N().partyBack * dt), 0, 1); msBar('THE PARTY', A.party, A.party > 0.5 ? '#3dff7a' : A.party > 0.25 ? '#ffd23f' : '#ff3b4a');
        if (crewLeft(A) > 0) { A.nextT = gameT + N().gapT; return false; }
        if (A.wave < 3) { if (gameT >= A.nextT) wave(A); return false; }
        A.end = 1; msBarOff(); for (const g of A.guests) g.dance = true; msLive([8, 9], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => 'WAVE ' + Math.max(1, A.wave) + '/3 · ' + crewLeft(A) + ' COMING · ' + roofFoes().length + ' ON THE ROOF',
      jump(A) { A.nextT = 0; for (const c of A.cars) if (!c.fc.out) { c.fc.crew = 0; c.fc.out = true; } A.queue.length = 0; for (const p of peds) if (p.foe && !p.dead && p.group === 'crew') killPed(p, 'gun', false); if (!onRoof(P)) toRoof(A); } }];
  function fail(A) {
    if (A.esther.dead) return F().esther;
    if (A.band.some(p => p.dead)) return F().band;
    if (MS.k === 2 && A.party <= 0) return F().ruined;
    return '';
  }
  const cuts = {
    'POOL PARTY': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 5, cam: 'CLOSE', at: () => A.esther, line: [2] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); } };
})();

/* ================= H7 - WRECKING CREW ================= */
MSCRIPT.h7 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A, 'muscle');
    const Mw = SKX.mach && SKX.mach.wrecker; if (Mw) { if (Mw.car) { const i = cars.indexOf(Mw.car); if (i >= 0 && P.car !== Mw.car) cars.splice(i, 1); } SKX.mach.wrecker = { car: null, gone: gameT + 1e6 }; }   // the site's own crane rolls out as the convoy's
    const rd = openRoad(A.C.door.x, A.C.door.y, 3000), q = rd ? edgeAt(rd.e, rd.s, {}) : HOTEL.inland(A, 300, 0); A.drop = { x: q.x, y: q.y };
    const [gx, gy] = SITE.gate, r = S1.road(gx - 160, gy), fx = Math.cos(r.a), fy = Math.sin(r.a);
    const toC = (fx * (A.drop.x - r.x) + fy * (A.drop.y - r.y)) > 0 ? 1 : -1, ang = r.a + (toC > 0 ? 0 : Math.PI), at = k => ({ x: r.x - fx * toC * k, y: r.y - fy * toC * k });   // nose toward the Colony, the rest behind
    const go = (type, k, o) => { const p = at(k); return msFoeCar(type, p.x, p.y, ang, Object.assign({ mode: 'flee', group: 'wreck', to: [A.drop], gun: 'pistol', crewHp: N().menHp }, CH4.men, o)); };
    A.wrecker = go('wrecker', 0, { crew: 1, speed: N().crawl, tough: N().wTough, color: '#ffc81e' });
    A.dumper = go('dumper', 150, { crew: 3, speed: N().crawl, tough: 1.4 }); A.dumper.fc.wait = 0.8;
    A.digger = go('digger', 260, { crew: 1, speed: 20, gun: null, group: 'dig' }); A.digger.fc.wait = 1.6;   // the digger trails far behind (not one you must stop)
    A.convoy = [A.wrecker, A.dumper];
  }
  const left = A => Math.round(dist(A.wrecker.x, A.wrecker.y, A.C.door.x, A.C.door.y) / M);
  function stop(A) {                        // the crane stopped: the whole convoy pulls up and its men pile out to fight
    if (A.stopped) return; A.stopped = true;
    for (const c of A.convoy) if (!c.dead && !c.fc.out) foeBail(c);
    if (!A.digger.dead) { A.digger.fc.mode = 'park'; A.digger.driver = null; A.digger.msDrive = null; A.digger.thr = 0; }   // the digger pulls over where it is
    msLive([5], { now: true });
  }
  const steps = [
    HOTEL.meet('WRECKING CREW'),
    { enter(A) { MS.mark = () => A.wrecker; MS.guide = () => A.wrecker; },                           // STOP the wrecking crane before it reaches the Colony
      tick(A) {
        const w = A.wrecker, me = me4();
        if (!A.said && dist(me.x, me.y, w.x, w.y) < N().spotM * M) { A.said = true; msLive([4]); }
        msBar('THE CRANE ' + left(A) + ' M FROM THE COLONY', w.hp / w.maxhp, '#ffc81e');
        if (w.dead || w.fc.out || w.hp < w.maxhp * N().bailAt / 100) { msBarOff(); stop(A); return true; }
        return false; },
      info: A => left(A) + ' M FROM THE COLONY · ' + Math.round(100 * A.wrecker.hp / A.wrecker.maxhp) + '% (STOPS UNDER ' + N().bailAt + '%)',
      jump(A) { const w = A.wrecker; if (P.car) exitCar(true); P.x = w.x + 90; P.y = w.y + 60; w.hp = w.maxhp * (N().bailAt - 5) / 100; } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'wreck'); },   // TAKE OUT the crew
      tick(A) { if (A.end) return A.end === 2; if (msFoesLeft('wreck') > 0) return false; A.end = 1; msLive([6, 7, 8], { phone: true, done: () => { A.end = 2; } }); return false; },
      info: () => msFoesLeft('wreck') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'wreck') killPed(p, 'gun', false); for (const c of MS_CAST.cars) if (c.fc.group === 'wreck' && !c.fc.out) { c.fc.crew = 0; c.fc.out = true; } } }];
  function fail(A) {
    if (MS.k === 1 && !A.stopped && (A.wrecker.fc.gone || left(A) < N().reachM)) return F().reached;
    return '';
  }
  const cuts = {
    'WRECKING CREW': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [2] },
      { dur: 4, cam: 'WIDE', at: () => A.wrecker, line: [3], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); if (SKX.mach && SKX.mach.wrecker) SKX.mach.wrecker.gone = gameT; } };
})();

/* ================= H8 - THE HEARING ================= */
MSCRIPT.h8 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; HOTEL.esther(A); HOTEL.start(A, 'sedan'); const C = A.C;
    const U = UNIQUES.find(u => u.row.id === 'courthouse'), d = U ? U.door : { x: C.door.x + 3000, y: C.door.y, fx: 0, fy: 1 };
    A.court = { x: d.x + d.fx * 20, y: d.y + d.fy * 20 }; A.steps = { x: d.x - d.fx * 4, y: d.y - d.fy * 4 }; A.hits = [];
    const away = Math.atan2(A.court.y - C.door.y, A.court.x - C.door.x), far = N().officeM * M;   // Finch's office: a long drive from the courthouse, on the far side from the Colony
    let o = null; for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, Math.PI]) { const x = A.court.x + Math.cos(away + da) * far, y = A.court.y + Math.sin(away + da) * far; if (x > 300 && x < MW - 300 && y > 300 && y < MH - 300 && shoreDist(x, y) > 60) { o = S1.road(x, y); break; } }
    o = o || S1.road(C.door.x - 2000, C.door.y); const w = S1.sidewalk(o.x, o.y); A.office = S1.at(w.x, w.y);
    A.finch = msPed(w.x, w.y, 0, Object.assign(S1.look('finch'), { msName: 'finch', step: S1.stay, spare: true, shield: true }));
    A.total = dist(A.office.x, A.office.y, A.court.x, A.court.y);
  }
  function hitSquad(A, ahead) {             // two black cars, out of sight: behind you, or between you and the courthouse
    const me = me4(), a = Math.atan2(A.court.y - me.y, A.court.x - me.x) + (ahead ? 0 : Math.PI);
    for (let k = 0; k < N().cars; k++) {
      const s = a + (k ? 0.5 : -0.5), r = S1.road(me.x + Math.cos(s) * N().spawnM * M, me.y + Math.sin(s) * N().spawnM * M), q = kerbBy(r.x, r.y);
      A.hits.push(msFoeCar('sedan', q.x, q.y, q.ang, Object.assign({ mode: 'chase', crew: 2, gun: 'smg', group: 'hit', speed: N().huntSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)));
    }
  }
  const toCourt = () => Math.round(dist(me4().x, me4().y, MS.A.court.x, MS.A.court.y) / M);
  const steps = [
    HOTEL.meet('THE NOTARY'),
    { enter(A) { MS.mark = () => A.finch; MS.guide = A.office; },                                   // PICK UP Finch at his office: he comes out when you pull up
      tick(A) {
        if (!A.met && dist(me4().x, me4().y, A.office.x, A.office.y) < N().pickM * M) { A.met = true; msAllyFrom(A.finch, { who: 'finch', calm: true, hp: N().finchHp, fail: F().finch }); A.finch.shield = false; msLive([4]); }
        return A.met && !!A.finch.aboard && P.car === A.finch.aboard; },
      info: A => !A.met ? Math.round(dist(me4().x, me4().y, A.office.x, A.office.y) / M) + " M TO FINCH'S OFFICE" : A.finch.aboard ? 'FINCH IS IN' : P.car ? 'STOP - FINCH GETS IN' : 'GET IN A CAR',
      jump(A) { if (!A.met) { const c = P.car || A.mycar; if (!P.car) enterCar(c); c.x = A.office.x + 40; c.y = A.office.y + 40; c.vx = c.vy = 0; P.x = c.x; P.y = c.y; return; } if (!P.car) { P.x = A.mycar.x; P.y = A.mycar.y; enterCar(A.mycar); } if (!A.finch.aboard) allyBoard(A.finch, P.car); } },
    { enter(A) { MS.mark = () => A.court; MS.guide = A.court; hitSquad(A, false); msLive([5]); },     // ESCORT him to the COURTHOUSE; Crane's hit squads
      tick(A) {
        const d = dist(me4().x, me4().y, A.court.x, A.court.y);
        if (!A.second && d < A.total * N().secondAt) { A.second = true; hitSquad(A, true); msLive([6, 7]); }
        const f = A.finch; return d < N().courtM * M && (f.aboard ? f.aboard === P.car : dist(f.x, f.y, A.court.x, A.court.y) < N().courtM * M) && !P.dead; },
      info: A => toCourt() + ' M TO THE COURTHOUSE · FINCH ' + Math.max(0, Math.round(100 * A.finch.hp / A.finch.hpMax)) + '%',
      jump(A) { const c = P.car; if (c) { c.x = A.court.x + 30; c.y = A.court.y + 30; c.vx = c.vy = 0; P.x = c.x; P.y = c.y; } else { P.x = A.court.x; P.y = A.court.y; A.finch.x = A.court.x + 20; A.finch.y = A.court.y; } } },
    { enter(A) {                                                                                     // THE CONFESSION on the courthouse steps
        const f = A.finch; if (f.aboard) allyAlight(f); MS_CAST.allies = MS_CAST.allies.filter(q => q !== f); Object.assign(f, { ally: false, calm: true, shield: true }); f.post.step = S1.stay; f.post.x = A.steps.x; f.post.y = A.steps.y;
        f.x = A.steps.x; f.y = A.steps.y; const e = A.esther; e.x = A.steps.x + 26; e.y = A.steps.y + 10; e.post.x = e.x; e.post.y = e.y;
        for (const c of A.hits) if (!c.dead && !c.fc.out) { c.fc.mode = 'flee'; c.fc.to = [S1.road(c.x + (c.x - A.court.x) * 3, c.y + (c.y - A.court.y) * 3)]; }   // the squads give up
        for (const p of peds) if (p.foe && !p.dead && p.group === 'hit') { p.calm = true; p.alert = false; }
        MS.mark = null; MS.guide = null; if (P.car) exitCar(true); msCut('THE CONFESSION', () => { A.done = true; }); },
      tick: A => !!A.done,
      info: () => 'THE HEARING',
      jump(A) { A.done = true; } }];
  const cuts = {
    'THE NOTARY': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [1], enter: () => { face(A.esther, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [2] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'THE CONFESSION': A => [
      { dur: 4, cam: 'WIDE', at: () => A.steps, cap: 'THE COURTHOUSE, FOUR O\'CLOCK', enter: () => { face(A.finch, A.court); face(A.esther, A.finch); } },
      { dur: 9, cam: 'CLOSE', at: () => A.finch, line: [8] },
      { dur: 5, cam: 'CLOSE', at: () => A.esther, line: [9], enter: () => { face(A.esther, P); } },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [10] },
      { dur: 6, cam: 'CLOSE', at: () => A.esther, line: [11], fadeOut: true }]
  };
  return { setup, steps, fail: () => msCastFail() || '', cuts };
})();
