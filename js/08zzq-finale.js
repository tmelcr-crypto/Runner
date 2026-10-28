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
