'use strict';
/* ---------- 8zzl. THE PRISON STORYLINE (Sal Moretti, the breakout): the scripts of P1-P8 ----------
   Each quest's words, lines and numbers are in the missions table (js/01x); Iron Key and its ferry in js/08zp; the visit's search at
   the gate as in Quest 05 (weapons wait in the booth). The line opens at the start of chapter 3 with Sal's letter at the Colony's desk;
   his marker S stands by the Iron Key ferry's kiosk on the promenade. */
const PRISONL = {
  holdKit(A) {                             // searched at the gate: every weapon but your fists waits in the booth
    if (A.kit) return; A.kit = { has: P.has.slice(), ammo: P.ammo.slice(), mag: P.mag.slice(), weapon: P.weapon };
    P.has = WEAPONS.map(w => !!w.start); P.weapon = Math.max(0, P.has.indexOf(true)); P.swing = null;
  },
  kitBack(A) {                             // back on the way out (and whatever happens, at the end)
    const k = A.kit; if (!k || A.kitBack) return; A.kitBack = true;
    for (let i = 0; i < WEAPONS.length; i++) { P.has[i] = P.has[i] || k.has[i]; P.ammo[i] = Math.max(P.ammo[i], k.ammo[i]); P.mag[i] = Math.max(P.mag[i], k.mag[i]); }
    if (P.has[k.weapon]) P.weapon = k.weapon;
  },
  kiosk() {                                // a free spot by the ferry kiosk on the promenade (marker S)
    const [kx, ky] = PRZ.kiosk; return [[-60, 0], [-50, 40], [0, 50], [-70, -30]].map(([dx, dy]) => ({ x: kx + dx, y: ky + dy })).find(q => !pedBlocked(q.x, q.y) && shoreDist(q.x, q.y) > 6) || { x: kx - 60, y: ky };
  }
};

/* ================= P1 - VISITING HOURS ================= */
MSCRIPT.p1 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    prisonReset(); PRX.visit = false;
    const [gx, gy] = PRZ.gate; A.gateOut = at(gx, gy + 46); A.gateIn = at(gx, gy - 46);
    A.sal = msPed(8870, 3742, -Math.PI / 2, Object.assign(S1.look('sal'), { msName: 'sal', step: S1.stay, spare: true, shield: true }));   // Sal in the yard, by the chess tables
    A.ferryPier = at((PRZ.mhead[0] + PRZ.mhead[2]) / 2, (PRZ.mhead[1] + PRZ.mhead[3]) / 2);
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk (marker S)
  }
  const steps = [
    { enter(A) { MS.mark = () => A.ferryPier; MS.start = { at: () => P, label: "SAL'S LETTER", go2: 'READ IT', go: () => msCut('THE LETTER', () => { A.read = true; MS.guide = A.ferryPier; }) }; },   // the letter; GO TO Iron Key
      tick(A) { return !!A.read && !P.ferry && onIsland(me().x, me().y); },
      info: A => A.read ? 'THE FERRY TO IRON KEY' : '',
      jump(A) { MS.start = null; A.read = true; if (P.car) exitCar(true); P.x = PRZ.path[2][0]; P.y = PRZ.path[2][1]; P.swim = false; } },
    { enter(A) { MS.mark = () => A.gateOut; MS.guide = A.gateOut; },                            // GO TO the gate: the search
      tick(A) { if (A.kit) return true; if (P.car || dist(P.x, P.y, A.gateOut.x, A.gateOut.y) > N().gateR) return false; L.holdKit(A); PRX.visit = PRX.gateOpen = true; popup(P.x, P.y - 14, 'WEAPONS LEFT AT THE GATE', '#ffd23f'); return true; },
      jump(A) { if (P.car) exitCar(true); L.holdKit(A); PRX.visit = PRX.gateOpen = true; P.x = A.gateIn.x; P.y = A.gateIn.y; } },
    { enter(A) { MS.mark = () => A.sal; MS.guide = () => A.sal; MS.start = { at: () => A.sal, label: msWho('sal').name, go: () => { face(A.sal, P); msCut('1975', () => { A.told = true; }); } }; },   // TALK TO Sal over chess
      tick: A => !!A.told,
      jump(A) { P.x = A.sal.x + 30; P.y = A.sal.y + 10; } },
    { enter(A) { MS.mark = () => A.gateOut; MS.guide = A.gateOut; },                            // GO TO the gate: your weapons back
      tick(A) { if (inPrison(me().x, me().y) || dist(me().x, me().y, A.gateOut.x, A.gateOut.y) > 160) return false; L.kitBack(A); Snd.pickup(); popup(P.x, P.y - 14, 'YOUR WEAPONS', '#b6ff3c'); return true; },
      jump(A) { L.kitBack(A); P.x = A.gateOut.x; P.y = A.gateOut.y; } },
    { enter(A) { MS.mark = () => A.ferryPier; MS.guide = null; },                               // GO TO the mainland: back on the ferry
      tick(A) { if (P.ferry || onIsland(me().x, me().y)) return false;
        const o = me(); A.men = [[60, 40], [-50, 50], [10, 80]].map(([dx, dy]) => { const q = S1.free(o.x + dx, o.y + dy, 10);   // Holloway's men waiting on the quay
          return msFoe(q.x, q.y, { gun: 'pistol', group: 'holl', hp: N().menHp, alert: true, shirt: '#3a4a6a', pants: '#2a2d36', a: Math.atan2(o.y - q.y, o.x - q.x) }); });
        msLive([7, 8], { now: true }); return true; },
      jump(A) { const k = A.kiosk; if (P.car) exitCar(true); P.x = k.x; P.y = k.y; P.swim = false; } },
    { enter(A) { MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'holl'); },     // TAKE OUT Holloway's men
      tick(A) { if (msFoesLeft('holl') > 0) return false; if (!A.fin0) { A.fin0 = true; msLive([9], { now: true, done: () => { A.fin = true; } }); } return !!A.fin; },
      info: () => msFoesLeft('holl') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'holl') killPed(p, 'gun', false); } }];
  function fail(A) { const F = MS.m.fails; if (A.sal.dead) return F.salDead; return ''; }
  const cuts = {
    'THE LETTER': A => [
      { dur: 6, cam: 'CLOSE', at: () => P, line: [1, 2], fadeOut: true }],
    '1975': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.sal, line: [3, 4], enter: () => { face(A.sal, P); P.ang = Math.atan2(A.sal.y - P.y, A.sal.x - P.x); } },
      { dur: 6, cam: 'CLOSE', at: () => A.sal, line: [5] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [6], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A) PRISONL.kitBack(A); prisonReset(); } };
})();

/* ================= P2 - DUNN'S DEBT ================= */
MSCRIPT.p2 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const heavy = { shirt: '#2a2d3a', pants: '#1a1a22' };
  function setup(A) {
    prisonReset(); SKY.hour = N().hour;
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk (marker S)
    const dq = S1.free(st.x + 40, st.y, 6); A.dunn = msPed(dq.x, dq.y, 0, Object.assign(S1.look('guard'), { msName: 'guard', step: S1.stay, spare: true, shield: true })); face(A.dunn, P);   // Officer Dunn, off duty
    const k0 = kerbBy(S1.road(st.x, st.y + 120).x, S1.road(st.x, st.y + 120).y); A.mycar = msCar('sedan', k0.x, k0.y, k0.ang, '#3d6fa8');
    const sf = A.shop = S1.shopFront(N().shopX, N().shopY); A.sign = S1.sign("SHARKEY'S PAWN & LOAN", '#4ab8c8', sf);   // the pawn-and-loan in Mercado
    A.shark = msPed(sf.x, sf.y, sf.a, Object.assign(S1.look('sharkey'), { msName: 'sharkey', step: S1.stay, spare: true, shield: true }));
    A.men = [-1, 1].map(s => { const q = S1.free(sf.x - sf.fy * s * 26, sf.y + sf.fx * s * 26, 6);   // the two heavies either side of the door
      return msFoe(q.x, q.y, Object.assign({ gun: s < 0 ? 'bat' : 'pistol', group: 'shark', hp: N().menHp, a: sf.a }, heavy)); });
    const r = S1.road(sf.x + sf.fx * 60, sf.y + sf.fy * 60), k = kerbBy(r.x + 50, r.y);   // his car at the kerb
    A.car = msFoeCar('muscle', k.x, k.y, k.ang, { mode: 'park', crew: 1, gun: null, group: 'sharkcar', speed: N().carSpeed, color: '#6a1a2a' });
    A.route = [S1.road(sf.x + 1800, sf.y + 900), S1.road(sf.x + 3200, sf.y - 600), S1.road(sf.x + 4400, sf.y + 1400)];
  }
  const steps = [
    { enter(A) { MS.mark = () => A.dunn; MS.start = { at: () => A.dunn, label: 'START MISSION', go: () => { face(A.dunn, P); msCut('THE GUARD', () => { A.go = true; }); } }; },   // TALK TO Dunn
      tick: A => !!A.go },
    { enter(A) { MS.guide = A.shop; MS.mark = () => A.shark; },                                // GO TO Sharkey's pawn-and-loan
      tick(A) { return !P.car && dist(P.x, P.y, A.shark.x, A.shark.y) < N().talkM * M; },
      info: A => Math.round(dist(me().x, me().y, A.shark.x, A.shark.y) / M) + " M TO SHARKEY'S",
      jump(A) { if (P.car) exitCar(true); const s = A.shop; P.x = s.x + s.fx * 50; P.y = s.y + s.fy * 50; } },
    { enter(A) { MS.guide = null; MS.start = { at: () => A.shark, label: msWho('sharkey').name, go: () => { face(A.shark, P); msCut('THE PAPER', () => { A.told = true; }); } }; },   // TALK TO Sharkey
      tick(A) { if (A.men.some(m => m.alert)) A.told = true; return !!A.told; },
      jump(A) { MS.start = null; A.told = true; } },
    { enter(A) { for (const m of A.men) foeAlert(m); MS.mark = () => A.men.find(m => !m.dead);      // TAKE OUT the heavies; Sharkey runs for his car
        const p = A.shark; p.post.step = S1.runStep(0.8); p.route = [allyDoor(A.car, p)]; p.ri = 0; },
      tick(A) { const p = A.shark; if (p.ri >= 1 && peds.includes(p)) { peds.splice(peds.indexOf(p), 1); A.inCar = true; A.car.fc.wait = 0.5; foeCarGo(A.car, 'flee'); A.car.fc.to = A.route; msLive([7], { now: true }); }
        return msFoesLeft('shark') === 0 && !!A.inCar; },
      info: A => msFoesLeft('shark') + ' LEFT',
      jump(A) { for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); const p = A.shark; if (!A.inCar) p.ri = 1; } },
    { enter(A) { MS.mark = () => A.car; MS.guide = () => A.car; },                            // CHASE Sharkey: ram his car till it stops
      tick(A) { const v = A.car; if (v.dead || v.hp > v.maxhp * N().stopHp / 100) return false;
        if (!A.caught) { A.caught = true; v.msDrive = null; v.driver = null; v.thr = 0; v.str = 0; v.hb = true; v.fc.crew = 0;
          const q = S1.free(v.x, v.y, 30); A.shark2 = msPed(q.x, q.y, 0, Object.assign(S1.look('sharkey'), { msName: 'sharkey', step: S1.stay, spare: true, shield: true }));
          msCut('THE IOU', () => { A.done = true; }); }
        return !!A.done; },
      info: A => Math.round(dist(me().x, me().y, A.car.x, A.car.y) / M) + ' M (GONE AT ' + N().away + ') · ' + Math.round(100 * A.car.hp / A.car.maxhp) + '%',
      jump(A) { A.inCar = true; A.car.hp = A.car.maxhp * 0.3; } },
    { enter(A) { MS.mark = null; MS.guide = null; msLive([11, 12], { phone: true, done: () => { A.fin = true; } }); },   // the call to Dunn
      tick: A => !!A.fin,
      jump(A) { A.fin = true; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.dunn.dead) return F.dunnDead;
    if (A.inCar && !A.caught && A.car.dead) return F.burnt;
    if (A.inCar && !A.caught && (A.car.fc.gone || dist(me().x, me().y, A.car.x, A.car.y) > N().away * M)) return F.away;
    return '';
  }
  const cuts = {
    'THE GUARD': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.dunn, line: [1, 2], enter: () => { face(A.dunn, P); P.ang = Math.atan2(A.dunn.y - P.y, A.dunn.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [3, 4], fadeOut: true }],
    'THE PAPER': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.shark, line: [5, 6], enter: () => { face(A.shark, P); P.ang = Math.atan2(A.shark.y - P.y, A.shark.x - P.x); } }],
    'THE IOU': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.shark2, line: [8, 9], enter: () => { face(A.shark2, P); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [10], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A && A.sign) { scene.remove(A.sign); A.sign.material.dispose(); } } };
})();
