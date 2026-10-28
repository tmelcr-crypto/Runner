'use strict';
/* ---------- 8zzq. CHAPTER 5 - THE FALL (election night): M25-M30 ----------
   Crane in person, the proof, the brothers, the finale on Pearl Key (Choice 4: the tape to Bay TV or to the FBI). The estate is
   js/10zk (ESTATE.ms holds it for a quest), the shared pieces js/08zzp (Crane's helicopter, the credits, the side-line switches).
   Each quest's words, lines and numbers are in the missions table (js/01x). */
const FIN = {
  start(A, type) {                         // MISSIONS TEST: out of the Colony's door, a car on the ring drive
    const C = STORY1.colony(); P.x = C.door.x; P.y = C.door.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;
    A.mycar = msCar(type || 'sports', C.cab.x, C.cab.y, C.cab.a, '#3d6fa8');
  },
  hold(o) { ESTATE.ms = Object.assign({ hold: true }, o || {}); },
  garden() { const L = ESTATE.L; return { x: L.x - 410, y: L.y + 60 - 80 }; },   // the parterre's statue in the west garden (js/10zk makeEstate)
  guests(A, n) {                           // the party: guests in their best round the garden, two waiters
    const g = FIN.garden(), cols = ['#f4efe6', '#ff9ad0', '#6f86ff', '#ffd23f', '#c9b3ff', '#1a1a22', '#ff6fae', '#7fd4a8'];
    A.guests = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, q = STORY1.free(g.x + Math.cos(a) * rand(70, 130), g.y + Math.sin(a) * rand(60, 110), 6);
      A.guests.push(msPed(q.x, q.y, a + Math.PI, { shirt: cols[k % cols.length], pants: k % 3 ? '#2a2d3a' : '#f4efe6', step: STORY1.stay, spare: true })); }
    for (const dx of [-60, 60]) { const q = STORY1.free(g.x + dx, g.y - 120, 6); A.guests.push(msPed(q.x, q.y, Math.PI / 2, { shirt: '#f4f4f6', pants: '#16161c', step: STORY1.stay, spare: true })); }
  }
};

/* ================= M25 - GARDEN PARTY ================= */
MSCRIPT.m25 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, me = () => P.car || P;
  function setup(A) {
    SKY.hour = N().hour; FIN.start(A); FIN.hold(); const E = ESTATE, g = FIN.garden();
    A.crane = msPed(g.x, g.y - 46, Math.PI / 2, Object.assign(S1.look('crane'), { msName: 'crane', step: S1.stay, spare: true, shield: true }));
    A.guards = [-26, 26].map(dx => msPed(g.x + dx, g.y - 66, Math.PI / 2, Object.assign({ step: S1.stay, spare: true }, CH4.men)));
    FIN.guests(A, N().guests);
    A.gateMen = [-70, 70].map(dx => msPed(E.gate.x + dx, E.gate.in.y - 14, -Math.PI / 2, Object.assign({ step: S1.stay, spare: true }, CH4.men)));
  }
  const steps = [
    msPhone('crane', [1, 2]),                                                                     // Crane himself calls
    { enter(A) { MS.guide = ESTATE.gate.out; MS.mark = () => ESTATE.gate.out; },                 // GO TO the estate's gate, on foot to it: the weapons wait in the booth
      tick(A) { if (A.atGate) return true; if (P.car || dist(P.x, P.y, ESTATE.gate.out.x, ESTATE.gate.out.y) > N().gateR * M) return false;
        PRISONL.holdKit(A); ESTATE.ms.gate = A.atGate = true; popup(P.x, P.y - 14, 'WEAPONS LEFT AT THE GATE', '#ffd23f'); return true; },
      info: A => Math.round(dist(me().x, me().y, ESTATE.gate.out.x, ESTATE.gate.out.y) / M) + " M TO CRANE'S GATE (ON FOOT TO IT)",
      jump(A) { if (P.car) exitCar(true); PRISONL.holdKit(A); ESTATE.ms.gate = A.atGate = true; P.x = ESTATE.gate.in.x; P.y = ESTATE.gate.in.y; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.crane; },                                     // WALK to Crane in the garden: THE OFFER
      tick(A) { if (A.talked) return true; if (!MS.start && !P.car && dist(P.x, P.y, A.crane.x, A.crane.y) < 4 * M)
        MS.start = { at: () => A.crane, label: 'TALK TO CRANE', go: () => { face(A.crane, P); msCut('THE OFFER', () => { A.talked = true; }); } }; return false; },
      info: A => Math.round(dist(P.x, P.y, A.crane.x, A.crane.y) / M) + ' M TO VICTOR CRANE',
      jump(A) { MS.start = null; A.talked = true; } },
    { enter(A) { MS.mark = () => ESTATE.gate.out; MS.guide = ESTATE.gate.out; },                 // WALK OUT: the weapons back at the gate; his men are coming
      tick(A) { if (estIn(P.x, P.y, -10) || P.car) return false; PRISONL.kitBack(A); popup(P.x, P.y - 14, 'WEAPONS BACK', '#3dff7a'); return true; },
      info: () => 'LEAVE THE ESTATE',
      jump(A) { P.x = ESTATE.gate.out.x; P.y = ESTATE.gate.out.y - 20; PRISONL.kitBack(A); } },
    { enter(A) { MS.mark = () => A.mycar; MS.guide = () => A.mycar; const E = ESTATE, c = E.gate.in;   // GET IN your car - two carloads out of his court after you
        A.chase = [0, 1].map(k => { const f = msFoeCar('sedan', c.x + (k ? 40 : -40), c.y + 60 + k * 70, -Math.PI / 2, Object.assign({ mode: 'chase', crew: 3, gun: k ? 'smg' : 'pistol', group: 'chase', speed: N().carSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)); f.fc.wait = 1.5 + k * 1.5; return f; });
        msLive([10], { now: true }); },
      tick(A) { return !!P.car; },
      info: () => 'GET IN A CAR',
      jump(A) { if (!P.car) { P.x = A.mycar.x; P.y = A.mycar.y; enterCar(A.mycar); } } },
    { enter(A) { ESTATE.ms.gate = false; MS.mark = null; MS.guide = null; A.loseT = 0; },         // LOSE THEM: far from every car still after you, off Pearl Key
      tick(A, dt) {
        const near = A.chase.filter(c => !c.dead && !c.fc.out && dist(c.x, c.y, me().x, me().y) < N().loseM * M).length, off = dist(me().x, me().y, ESTATE.L.x, ESTATE.L.y) > N().offM * M;
        A.loseT = near || !off ? 0 : A.loseT + dt; if (A.end) return A.end === 2;
        if (A.loseT < 2.5) return false; A.end = 1; msLive([11], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => A.chase.filter(c => !c.dead && !c.fc.out).length + " OF CRANE'S CARS AFTER YOU",
      jump(A) { for (const c of A.chase) { c.fc.crew = 0; c.fc.out = true; c.x += 3000; } const c = P.car || A.mycar; c.x = ESTATE.L.x - 2600; c.y = ESTATE.L.y - 430; c.vx = c.vy = 0; } }];
  const cuts = {
    'THE OFFER': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.crane, line: [3, 4], enter: () => { face(A.crane, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.crane, line: [5] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [6] },
      { dur: 6, cam: 'CLOSE', at: () => A.crane, line: [7] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [8] },
      { dur: 6, cam: 'CLOSE', at: () => A.crane, line: [9], fadeOut: true }]
  };
  return { setup, steps, cuts, fail: () => '', cleanup(A) { if (A) PRISONL.kitBack(A); ESTATE.ms = null; } };
})();

/* ================= M26 - LOCKER 47 ================= */
MSCRIPT.m26 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, me = () => P.car || P;
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function setup(A) { SKY.hour = N().hour; FIN.start(A); A.L = LOCKERS.at; A.race = N().raceT; }
  const steps = [
    msPhone('mateo', [1, 2, 3]),                                                                  // a whisper on the phone
    { enter(A) { const f = A.L.front; MS.guide = f; MS.mark = () => f; LOCKERS.glow = true; A.on = true; },   // GO TO the lockers before Crane's men
      tick(A, dt) { A.race -= dt; msBar("CRANE'S MEN ARRIVE IN " + clock(Math.max(0, A.race)), Math.max(0, A.race) / N().raceT, '#ff3b4a');
        return !P.car && dist(P.x, P.y, A.L.front.x, A.L.front.y) < 3 * M; },
      info: A => Math.round(dist(me().x, me().y, A.L.front.x, A.L.front.y) / M) + ' M TO THE LUNAPARK LOCKERS · ' + clock(Math.max(0, A.race)),
      jump(A) { if (P.car) exitCar(true); P.x = A.L.front.x; P.y = A.L.front.y + 6; } },
    { enter(A) { MS.guide = null; },                                                               // OPEN locker 47: THE TAPE
      tick(A, dt) { if (A.taped) return true; A.race -= dt; msBar("CRANE'S MEN ARRIVE IN " + clock(Math.max(0, A.race)), Math.max(0, A.race) / N().raceT, '#ff3b4a');
        if (!MS.start && !P.car && dist(P.x, P.y, A.L.front.x, A.L.front.y) < 4 * M)
          MS.start = { at: () => A.L.front, label: 'LOCKER 47', go2: 'OPEN IT', go: () => { LOCKERS.glow = false; A.on = false; msBarOff(); Snd.tone(523, 784, 0.2, 0.1, 'triangle'); toast('THE TAPE'); msCut('THE TAPE', () => { A.taped = true; }); } };
        return false; },
      info: A => 'OPEN LOCKER 47 · ' + clock(Math.max(0, A.race)),
      jump(A) { MS.start = null; LOCKERS.glow = false; A.on = false; msBarOff(); A.taped = true; } },
    { enter(A) { const L = A.L, g = MAP.lunapark.gate;                                             // GET OUT of the lunapark alive: his men pour in
        A.men = []; for (let k = 0; k < N().men; k++) { const a = k / N().men * TAU, q = S1.free(L.x + Math.cos(a) * 170, L.y + 120 + Math.sin(a) * 90, 10);
          A.men.push(msFoe(q.x, q.y, Object.assign({ gun: k % 2 ? 'smg' : 'pistol', hp: N().menHp, group: 'luna', alert: true }, CH4.men))); }
        A.cars = [-1, 1].map(s => { const r = S1.road(g.x + s * 500, g.y - 80), k = kerbBy(r.x, r.y); return msFoeCar('sedan', k.x, k.y, k.ang, Object.assign({ mode: 'chase', crew: 2, gun: 'pistol', group: 'luna', speed: N().carSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)); });
        msLive([8], { now: true }); MS.mark = null; MS.guide = null; },
      tick(A) { if (A.end) return A.end === 2; if (dist(me().x, me().y, A.L.x, A.L.y) < N().outM * M) return false; A.end = 1; msLive([9], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.L.x, A.L.y) / M) + ' / ' + N().outM + ' M FROM THE LUNAPARK · ' + msFoesLeft('luna') + " OF CRANE'S MEN",
      jump(A) { for (const p of peds) if (p.foe && !p.dead && p.group === 'luna') killPed(p, 'gun', false); for (const c of A.cars) { c.fc.crew = 0; c.fc.out = true; } if (P.car) exitCar(true); P.x = A.L.x; P.y = A.L.y - N().outM * M - 400; } }];
  function fail(A) { return A.on && A.race <= 0 ? MS.m.fails.race : ''; }
  const cuts = {
    'THE TAPE': A => [
      { dur: 4, cam: 'CLOSE', at: () => P, line: [4] },
      { dur: 6, cam: 'CLOSE', at: () => P, line: [5, 6], phone: true },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [7], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { LOCKERS.glow = false; msBarOff(); } };
})();

/* ================= M27 - TAKEN ================= */
MSCRIPT.m27 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, me = () => P.car || P;
  function setup(A) {
    SKY.hour = N().hour; FIN.start(A); const [sx, sy] = SALV.spot, [cx, cy] = SALV.crane;
    if (JYR.car) salvReset();
    A.cab = msCar('taxi', sx, sy, Math.PI / 2, null); A.cab.noEnter = true; A.cab.hp = A.cab.maxhp * 0.5;   // Joe's cab on the crane's spot, Joe shut inside
    A.button = S1.free(cx, cy, 34); A.yard = { x: (SALV.area[0] + SALV.area[2]) / 2, y: (SALV.area[1] + SALV.area[3]) / 2 };
    A.men = []; for (let k = 0; k < N().men; k++) { const q = S1.free(A.yard.x + Math.cos(k * 1.7) * 140, A.yard.y + Math.sin(k * 1.7) * 120, 10);
      A.men.push(msFoe(q.x, q.y, Object.assign({ gun: k % 2 ? 'smg' : 'pistol', hp: N().menHp, group: 'yard' }, CH4.men))); }
    JYR.calmT = gameT + 1e6;                                                                       // the yard's dog is shut in tonight
  }
  const crushing = A => JYR.car === A.cab && (JYR.phase === 'drop' || JYR.phase === 'crush');
  const steps = [
    msPhone('rosa', [1, 2]),
    { enter(A) { msLive([MS_CHOICE.kessler === 'spared' ? 3 : 4], { phone: true }); MS.guide = A.yard; MS.mark = () => A.cab; },   // GO TO the junkyard: near it, the crane starts
      tick(A) { return dist(me().x, me().y, A.yard.x, A.yard.y) < N().yardR * M; },
      info: A => Math.round(dist(me().x, me().y, A.yard.x, A.yard.y) / M) + ' M TO THE JUNKYARD (DOCKSIDE)',
      jump(A) { const g = SALV.gate; if (P.car) { const c = P.car; c.x = g[0]; c.y = g[1] + 140; c.vx = c.vy = 0; } else { P.x = g[0]; P.y = g[1] + 100; } } },
    { enter(A) { JYR.rate = (PLC.junkLift + PLC.junkSwing + 1.5) / N().crushT; jyStart(A.cab); A.t0 = gameT; MS.mark = () => A.button; MS.guide = A.button;   // STOP THE CRANE: the button in its cab
        for (const p of A.men) foeAlert(p); msLive([5], { now: true }); },
      tick(A) { if (A.stopped) return true; msBar('THE CRUSHER', clamp((gameT - A.t0) / N().crushT, 0, 1), '#ff3b4a');
        if (!MS.start && !P.car && dist(P.x, P.y, A.button.x, A.button.y) < 4 * M) MS.start = { at: () => A.button, label: 'THE STOP BUTTON', go2: 'PRESS IT', go: () => {
          const k = JYR.car; JYR.stop = true; if (k) { k.hook = false; k.vz = 0; } JYR.car = null; JYR.phase = 'back'; JYR.t = 0; JYR.rate = 1; JYR.stop = false;
          Snd.tone(220, 110, 0.4, 0.12, 'square'); toast('THE CRANE STOPS'); msBarOff(); msLive([6], { now: true }); A.stopped = true; } };
        return false; },
      info: A => Math.round(dist(P.x, P.y, A.button.x, A.button.y) / M) + " M TO THE CRANE'S CAB · " + msFoesLeft('yard') + " OF CRANE'S MEN",
      jump(A) { if (P.car) exitCar(true); P.x = A.button.x; P.y = A.button.y; const k = JYR.car; if (k) { k.hook = false; k.vz = 0; } JYR.car = null; JYR.phase = 'back'; JYR.rate = 1; msBarOff(); A.stopped = true; } },
    { enter(A) { const c = A.cab, q = S1.free(c.x + 30, c.y, 8);                                    // Joe climbs out: TAKE HIM HOME to the Colony
        A.joe = msPed(q.x, q.y, 0, Object.assign(S1.look('joe'), { msName: 'joe', step: S1.stay, spare: true }));
        msAllyFrom(A.joe, { who: 'joe', calm: true, near: true, hp: N().joeHp }); msLive([7], { now: true });
        A.home = S1.colony().door; MS.guide = A.home; MS.mark = () => A.home; },
      tick(A) { if (A.end) return A.end === 2; const j = A.joe.aboard || A.joe;
        if (P.car && carSpeed(P.car) < 3 * KMH && dist(P.car.x, P.car.y, A.home.x, A.home.y) < N().homeR * M && A.joe.aboard === P.car) allyAlight(A.joe);
        if (A.joe.aboard || dist(j.x, j.y, A.home.x, A.home.y) > N().homeR * M || dist(me().x, me().y, A.home.x, A.home.y) > N().homeR * M) return false;
        A.end = 1; msLive([8, 9], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.home.x, A.home.y) / M) + ' M TO THE COLONY WITH PAPA JOE',
      jump(A) { if (A.joe.aboard) allyAlight(A.joe); if (P.car) exitCar(true); P.x = A.home.x + 20; P.y = A.home.y + 10; A.joe.x = A.home.x - 10; A.joe.y = A.home.y + 14; } }];
  function fail(A) { const f = msCastFail(); if (f) return f; return crushing(A) ? MS.m.fails.crushed : ''; }
  return { setup, steps, fail, cuts: {}, cleanup(A) { msBarOff(); JYR.rate = 1; JYR.stop = false; JYR.calmT = 0; if (A && A.cab && JYR.car === A.cab) { A.cab.hook = false; JYR.car = null; JYR.phase = 'back'; } } };
})();

/* ================= M28 - THE PROOF (Choice 4) ================= */
MSCRIPT.m28 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, me = () => P.car || P;
  function setup(A) {
    SKY.hour = N().hour; FIN.start(A); const C = S1.colony();
    A.nina = msPed(C.door.x - C.door.fx * 6 + 24, C.door.y + 26, Math.PI, Object.assign(S1.look('nina'), { msName: 'nina', step: S1.stay, spare: true, shield: true }));
    A.tv = NEWS.S ? NEWS.S.door : null; A.fbi = fbiDoor();
  }
  const dests = A => [A.tv && { k: 'BAY TV', at: A.tv }, A.fbi && { k: 'FBI', at: A.fbi }].filter(Boolean);
  const steps = [
    { enter(A) { MS.mark = () => A.nina; MS.start = { at: () => A.nina, label: 'START MISSION', go: () => { face(A.nina, P); msCut('THE PROOF', () => { A.go = true; }); } }; },   // TALK TO Nina at the Colony's door
      tick: A => !!A.go },
    { enter(A) { MS.mark = () => A.mycar; MS.guide = () => A.mycar; },                              // GET IN: his men are already on the street
      tick(A) { return !!P.car; }, info: () => 'GET IN A CAR',
      jump(A) { if (!P.car) { P.x = A.mycar.x; P.y = A.mycar.y; enterCar(A.mycar); } } },
    { enter(A) { MS.guide = null; A.t0 = gameT; const c = me();                                      // DRIVE the tape to Bay TV or the FBI: cars ram you, his helicopter overhead
        A.cars = [0, 1].map(k => { const r = CH4.near(c.x, c.y, 500 + k * 200, 800 + k * 200), kk = kerbBy(r.x, r.y);
          const f = msFoeCar('sedan', kk.x, kk.y, kk.ang, Object.assign({ mode: 'chase', crew: 2, gun: k ? 'smg' : 'pistol', group: 'proof', speed: N().carSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)); f.fc.wait = 1 + k * 2; return f; });
        msLive([6], { now: true });
        MS.mark = () => { const d = dests(A); return d.length ? d[Math.floor(gameT * 1.2) % d.length].at : null; }; },   // the marker blinks between the two
      tick(A) {
        if (!A.heli && gameT - A.t0 > N().heliAt) { const c = me(); A.heli = ch5HeliUp(c.x - 600, c.y - 500, N()); msLive([7]); }
        if (A.end) return A.end === 2;
        for (const d of dests(A)) if (dist(me().x, me().y, d.at.x, d.at.y) < N().reachR * M && (!P.car || carSpeed(P.car) < 15 * KMH)) {
          A.choice = d.k; A.end = 1; if (P.car) P.car.vx = P.car.vy = 0; if (CH5.heli && !CH5.heli.dead) ch5HeliOff();
          msLive(d.k === 'FBI' ? [10, 11] : [8, 9], { now: true, phone: d.k !== 'FBI', done: () => { A.end = 2; } }); break; }
        return false; },
      info: A => dests(A).map(d => Math.round(dist(me().x, me().y, d.at.x, d.at.y) / M) + ' M TO ' + d.k).join(' · ') + (CH5.heli && !CH5.heli.dead ? " · CRANE'S HELICOPTER" : ''),
      jump(A) { const d = dests(A)[MS_CHOICE.proof === 'fbi' ? 1 : 0] || dests(A)[0]; const c = P.car || A.mycar; if (P.car !== c) { P.x = c.x; P.y = c.y; enterCar(c); } c.x = d.at.x; c.y = d.at.y + 30; c.vx = c.vy = 0; } }];
  const cuts = {
    'THE PROOF': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); } },
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [3] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [4] },
      { dur: 4, cam: 'CLOSE', at: () => A.nina, line: [5], fadeOut: true }]
  };
  return { setup, steps, cuts, fail: () => '', cleanup() { ch5HeliOff(); } };
})();

/* ================= M29 - PEARL KEY ================= */
// The finale's way in follows the side lines (MS_CHOICE: their switches in MISSIONS TEST) and Choice 4:
// Varga done - Marco's boat to Crane's dock; else over the causeway through his roadblock. Prison done - Sal's tunnel from the old
// boathouse (Sal comes up under the folly in any case); else the front gate: Esther's laundry van crashes it (Colony done) or a charge.
// Space done - every guard on the map (Iris' satellite). FBI - agents at the gate. Bay TV - fewer guards. Rosa's two men always.
const FIN_CREW = [['rosa', 2, () => true], ['joe', 3, () => true], ['nina', 4, () => true], ['marco', 5, () => lineDone('varga')], ['sal', 6, () => lineDone('prison')],
  ['iris', 7, () => lineDone('space')], ['esther', 8, () => lineDone('colony')], ['del', 9, () => lineDone('casino')], ['agent', 10, () => MS_CHOICE.proof === 'fbi']];
MSCRIPT.m29 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, me = () => P.car || P, at = S1.at;
  const V = () => lineDone('varga'), PZ = () => lineDone('prison'), CO = () => lineDone('colony'), SP = () => lineDone('space'), FBI = () => MS_CHOICE.proof === 'fbi';
  function setup(A) {
    SKY.hour = N().hour; FIN.hold({ hold: true }); const E = ESTATE, L = E.L;
    const h = CO() ? SAFES.find(s => s.id === 'colony') : SAFES.find(s => s.id === 'loft'), d = h.door;   // the war room's door: the Colony's, or the loft's
    A.room = at(d.x + d.fx * 30, d.y + d.fy * 30); P.x = A.room.x; P.y = A.room.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;
    A.crew = FIN_CREW.filter(c => c[2]()).map((c, i) => { const a = Math.PI / 2 + (i - 4) * 0.42, q = S1.free(A.room.x + Math.cos(a) * 46, A.room.y + Math.sin(a) * 40, 6);
      const p = msPed(q.x, q.y, 0, Object.assign(S1.look(c[0]), { msName: c[0], step: S1.stay, spare: true, shield: true })); face(p, A.room); return { id: c[0], line: c[1], p }; });
    A.rosa = A.crew[0].p;
    const men = (k, n, x, y, r, gun) => { for (let i = 0; i < n; i++) { const q = S1.free(x + Math.cos(i * 2.1) * r, y + Math.sin(i * 2.1) * r * 0.7, 8); msFoe(q.x, q.y, Object.assign({ gun: i % 2 ? 'smg' : gun || 'pistol', hp: N().menHp, group: k }, CH4.men)); } };
    const fewer = MS_CHOICE.proof === 'bay tv' ? N().tvFewer : 0;                                   // Bay TV: the city turned on Crane, some of his men stayed home
    men('est', Math.max(1, N().gateMen - (CO() ? 2 : 0)), L.x, E.gate.in.y + 30, 60);
    men('est', Math.max(2, N().groundMen - fewer), L.x, L.y + 60, 300);
    if (V()) men('est', N().dockMen, E.dock.x, E.dock.in.y - 20, 40);
    if (!V()) { const bx = L.x - 560, by = 9900;                                                  // the roadblock on the causeway
      [-24, 24].forEach(dy => msFoeCar('sedan', bx, by + dy, Math.PI / 2, Object.assign({ mode: 'park', crew: 0, group: 'bridge', color: '#14161d' }, CH4.men)));
      men('bridge', N().bridgeMen, bx + 60, by, 50); }
    MS.radar = SP();
  }
  const inside = () => estIn(P.x, P.y, -6);
  const ally = (who, x, y, o) => { const q = STORY1.free(x, y, 6); const p = msPed(q.x, q.y, 0, Object.assign(who ? STORY1.look(who) : {}, who ? { msName: who } : {}, { step: STORY1.stay, spare: true }, o || {})); return msAllyFrom(p, Object.assign({ who, gun: 'smg', hp: N().crewHp, near: true }, o || {})); };
  const steps = [
    { enter(A) { MS.mark = () => A.rosa; MS.start = { at: () => A.rosa, label: 'START MISSION', go: () => { msCut('THE CREW', () => { A.go = true; }); } }; },   // TALK TO the crew: THE CREW
      tick: A => !!A.go },
    { enter(A) { const E = ESTATE;                                                                // the way to Pearl Key: Marco's boat, or by car over the causeway
        for (const c of A.crew) if (peds.includes(c.p)) { peds.splice(peds.indexOf(c.p), 1); }
        if (V()) { const x = E.dock.x, y = E.L.y + E.L.h / 2 + 330; A.boat = msCar('speedboat', x, y, -Math.PI / 2, '#f4f6fa'); P.x = x; P.y = y; enterCar(A.boat);
          A.marco = ally('marco', x + 20, y, { gun: 'smg' }); allyBoard(A.marco, A.boat); A.to = E.dock.out; }
        else { const r = S1.road(E.L.x - 1500, 9900), k = kerbBy(r.x, r.y); A.car = msCar('sports', k.x, k.y, 0, '#3d6fa8'); P.x = k.x; P.y = k.y; enterCar(A.car); A.to = E.gate.out; }
        cam.x = P.x; cam.y = P.y; MS.guide = A.to; MS.mark = () => A.to; },
      tick(A) { if (V()) return !P.car && dist(P.x, P.y, A.to.x, A.to.y) < N().reachM * M; return dist(me().x, me().y, A.to.x, A.to.y) < 30 * M; },
      info: A => (V() ? Math.round(dist(me().x, me().y, A.to.x, A.to.y) / M) + " M TO CRANE'S DOCK (LAND ON THE JETTY)" : Math.round(dist(me().x, me().y, A.to.x, A.to.y) / M) + " M TO CRANE'S GATE · " + msFoesLeft('bridge') + ' ON THE CAUSEWAY'),
      jump(A) { if (P.car) exitCar(true); P.x = A.to.x; P.y = A.to.y + (V() ? 30 : -20); } },
    { enter(A) { const E = ESTATE;                                                                // IN: the dock gate, Sal's tunnel, the van or a charge at the front gate
        if (V()) { E.ms.dock = true; if (A.marco.aboard) allyAlight(A.marco); msLive([12], { now: true }); A.way = 'dock'; MS.mark = () => E.dock.in; MS.guide = E.dock.in; }
        else if (PZ()) { A.way = 'tunnel'; MS.mark = () => E.boathouse.door; MS.guide = E.boathouse.door; }
        else if (CO()) { A.way = 'van'; E.ms.gate = true; A.van = msCar('truck', E.gate.in.x - 40, E.gate.in.y + 70, 2.4, '#f4f6fa'); A.van.deco = 'laundry'; A.van.hp = A.van.maxhp * 0.2; A.van.noEnter = true; msLive([14], { now: true }); MS.mark = () => E.gate.in; MS.guide = E.gate.in; }
        else { A.way = 'charge'; MS.mark = () => E.gate.out; MS.guide = E.gate.out; } },
      tick(A, dt) { const E = ESTATE;
        if (A.way === 'tunnel' && !MS.start && !P.car && dist(P.x, P.y, E.boathouse.door.x, E.boathouse.door.y) < N().reachM * M)
          MS.start = { at: () => E.boathouse.door, label: "SAL'S TUNNEL", go2: 'GO IN', go: () => { if (A.car && P.car === A.car) exitCar(true); P.x = E.folly.out.x; P.y = E.folly.out.y; cam.x = P.x; cam.y = P.y; Snd.tone(196, 147, 0.4, 0.08, 'triangle'); toast("UP UNDER THE FOLLY - BEHIND THEIR GUARDS"); } };
        if (A.way === 'charge') {
          if (!A.armed && !MS.start && !P.car && dist(P.x, P.y, E.gate.out.x, E.gate.out.y) < N().reachM * M)
            MS.start = { at: () => E.gate.out, label: 'THE GATE', go2: 'PLANT A CHARGE', go: () => { A.armed = gameT + N().charge; msLive([17], { now: true }); toast('STAND BACK!'); } };
          if (A.armed && gameT > A.armed && !A.blown) { A.blown = true; explosion(E.gate.x, E.gate.y, 70, null); E.ms.gate = true; for (const p of peds) if (p.foe && !p.dead && p.group === 'est' && dist(p.x, p.y, E.gate.x, E.gate.y) < 400) foeAlert(p); }
        }
        return inside(); },
      info: A => A.way === 'tunnel' ? Math.round(dist(P.x, P.y, ESTATE.boathouse.door.x, ESTATE.boathouse.door.y) / M) + ' M TO THE OLD BOATHOUSE (WEST SHORE)' : A.way === 'charge' ? (A.blown ? 'IN THROUGH THE GATE' : 'BLOW THE FRONT GATE') : 'INTO THE GROUNDS',
      jump(A) { if (P.car) exitCar(true); MS.start = null; const q = A.way === 'tunnel' ? ESTATE.folly.out : A.way === 'dock' ? ESTATE.dock.in : ESTATE.gate.in; ESTATE.ms.gate = A.way !== 'dock' && A.way !== 'tunnel' ? true : ESTATE.ms.gate; P.x = q.x; P.y = q.y; } },
    { enter(A) { const E = ESTATE;                                                                // CLEAR the grounds: his guards; your crew with you
        MS.start = null; for (const p of peds) if (p.foe && !p.dead && p.group === 'est') foeAlert(p);
        A.rosaMen = [0, 1].map(k => ally('rosaman', P.x + (k ? 24 : -24), P.y + 16, { gun: k ? 'smg' : 'pistol' }));
        if (PZ()) { A.sal = ally('sal', E.folly.out.x, E.folly.out.y + 10, { gun: 'pistol' }); msLive([13]); }
        if (FBI()) { E.ms.gate = true; A.agents = [0, 1].map(k => ally(k ? 'agent' : null, E.gate.out.x + (k ? 30 : -30), E.gate.out.y, k ? { gun: 'smg' } : { gun: 'pistol', shirt: '#2a3a6a', pants: '#3a3d47' })); msLive([15]); }
        if (SP()) msLive([16], { phone: true }); msLive([18]);
        MS.mark = () => { let b = null; for (const p of peds) if (p.foe && !p.dead && p.group === 'est' && (!b || dist(p.x, p.y, P.x, P.y) < dist(b.x, b.y, P.x, P.y))) b = p; return b; }; MS.guide = null; },
      tick: A => msFoesLeft('est') === 0,
      info: A => msFoesLeft('est') + " OF CRANE'S GUARDS IN THE GROUNDS",
      jump(A) { for (const p of peds) if (p.foe && !p.dead && p.group === 'est') killPed(p, 'gun', false); } },
    { enter(A) { const d = ESTATE.house.door; MS.mark = () => d; MS.guide = d; },                  // TO the mansion's door
      tick(A) { if (A.end) return A.end === 2; const d = ESTATE.house.door; if (P.car || dist(P.x, P.y, d.x, d.y) > N().reachM * M) return false; A.end = 1; msLive([19], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(P.x, P.y, ESTATE.house.door.x, ESTATE.house.door.y) / M) + " M TO THE MANSION'S DOOR",
      jump(A) { if (P.car) exitCar(true); const d = ESTATE.house.door; P.x = d.x; P.y = d.y - 10; } }];
  const cuts = {
    'THE CREW': A => [{ dur: 4, cam: 'CLOSE', at: () => P, line: [1] }]
      .concat(A.crew.map(c => ({ dur: 4, cam: 'CLOSE', at: () => c.p, line: [c.line], enter: () => { face(c.p, P); } })))
      .concat([{ dur: 4, cam: 'CLOSE', at: () => P, line: [11], fadeOut: true }])
  };
  return { setup, steps, cuts, fail: () => '', cleanup() { MS.radar = false; ESTATE.ms = null; } };
})();
