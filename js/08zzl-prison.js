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

/* ---------- OTTO'S PRINTING: old Otto's print shop in Mercado, its sign over a shop front for good (both modes; mode ottoShop) ----------
   Nothing to do inside; P3's forger works there. The building is kept from other quests' picks (r.own). */
const OTTO = { at: null, sign: null };
function ottoShop() {                      // the shop's front (the same one every game)
  if (OTTO.at === null) { const s = STORY1.shopFront(4400, 9400); OTTO.at = s || false; if (s && s.r) s.r.own = true; }
  return OTTO.at || null;
}
function ottoTick() {                      // js/15 update: the sign goes up once the city is there
  if (OTTO.sign || !feat('ottoShop')) return; const s = ottoShop(); if (s) OTTO.sign = STORY1.sign("OTTO'S PRINTING", '#f2e6c8', s);
}

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

/* ================= P3 - PAPERS ================= */
MSCRIPT.p3 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const crane = { shirt: '#3a3f4c', pants: '#2a2d36' };
  function setup(A) {
    prisonReset(); SKY.hour = N().hour;
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk (marker S)
    const dq = S1.free(st.x + 40, st.y, 6); A.dunn = msPed(dq.x, dq.y, 0, Object.assign(S1.look('guard'), { msName: 'guard', step: S1.stay, spare: true, shield: true })); face(A.dunn, P);
    const r0 = S1.road(st.x, st.y + 120), k0 = kerbBy(r0.x, r0.y); A.mycar = msCar('sedan', k0.x, k0.y, k0.ang, '#3d6fa8');
    const sf = A.shop = ottoShop(); A.otto = msPed(sf.x, sf.y, sf.a, Object.assign(S1.look('otto'), { msName: 'otto', step: S1.stay, spare: true, shield: true }));
  }
  function raid(A) {                        // Crane's men: two cars up the street, two more on foot round the corner
    if (A.raid) return; A.raid = true; const sf = A.shop;
    A.cars = [-1, 1].map(s => { const r = S1.road(sf.x + sf.fy * s * 700, sf.y - sf.fx * s * 700); return msFoeCar('sedan', r.x, r.y, r.a, Object.assign({ crew: 2, gun: 'pistol', group: 'raid', speed: N().raidSpeed, crewHp: N().menHp }, crane, { color: '#1c1c26' })); });
    A.foot = [-1, 1].map(s => { const q = S1.free(sf.x - sf.fy * s * 260 + sf.fx * 40, sf.y + sf.fx * s * 260 + sf.fy * 40, 10); return msFoe(q.x, q.y, Object.assign({ gun: 'smg', group: 'raid', hp: N().menHp, alert: true }, crane)); });
    msLive([7, 8], { now: true });
  }
  const steps = [
    { enter(A) { MS.mark = () => A.dunn; MS.start = { at: () => A.dunn, label: 'START MISSION', go: () => { face(A.dunn, P); msCut("SAL'S PICTURE", () => { A.go = true; }); } }; },   // TALK TO Dunn: Sal's photo
      tick: A => !!A.go },
    { enter(A) { MS.guide = A.shop; MS.mark = () => A.otto; },                                 // GO TO OTTO'S PRINTING
      tick(A) { return !P.car && dist(P.x, P.y, A.otto.x, A.otto.y) < N().talkM * M; },
      info: A => Math.round(dist(me().x, me().y, A.otto.x, A.otto.y) / M) + " M TO OTTO'S PRINTING",
      jump(A) { if (P.car) exitCar(true); const s = A.shop; P.x = s.x + s.fx * 40; P.y = s.y + s.fy * 40; } },
    { enter(A) { MS.guide = null; MS.start = { at: () => A.otto, label: msWho('otto').name, go: () => { face(A.otto, P); msCut('THE FORGER', () => { A.told = true; }); } }; },   // TALK TO Otto
      tick: A => !!A.told,
      jump(A) { MS.start = null; A.told = true; } },
    { enter(A) { raid(A); A.left = N().printT; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'raid') || A.cars.find(c => !c.dead && !c.fc.out); },   // TAKE OUT Crane's men while Otto prints
      tick(A, dt) { if (A.left > 0) A.left -= dt; msBar('PRINTING', 1 - Math.max(0, A.left) / N().printT, '#f2e6c8'); return msFoesLeft('raid') === 0 && A.left <= 0; },
      info: A => msFoesLeft('raid') + " OF CRANE'S MEN LEFT" + (A.left > 0 ? ' · THE PAPERS IN ' + Math.ceil(A.left) + ' S' : ' · THE PAPERS ARE READY'),
      jump(A) { A.left = 0; for (const p of peds) if (p.foe && !p.dead && p.group === 'raid') killPed(p, 'gun', false); for (const c of MS_CAST.cars) if (c.fc.group === 'raid' && !c.fc.out) { c.fc.crew = 0; c.driver = null; c.msDrive = null; } } },
    { enter(A) { msBarOff(); MS.mark = () => A.otto; MS.start = { at: () => A.otto, label: "SAL'S NEW PAPERS", go2: 'TAKE THEM', go: () => { Snd.pickup(); popup(P.x, P.y - 14, "SAL'S NEW PAPERS", '#b6ff3c'); msLive([9], { now: true }); A.got = true; } }; },   // COLLECT the papers
      tick(A) { if (!A.got && !MS.start && !P.car) MS.start = { at: () => A.otto, label: "SAL'S NEW PAPERS", go2: 'TAKE THEM', go: () => { Snd.pickup(); A.got = true; } }; return !!A.got; },
      jump(A) { MS.start = null; A.got = true; } },
    { enter(A) { MS.guide = A.kiosk; MS.mark = () => A.dunn; },                                 // DELIVER the papers to Dunn
      tick(A) { if (A.fin) return true; if (A.home || P.car || dist(P.x, P.y, A.dunn.x, A.dunn.y) > N().talkM * M) return false; A.home = true; msCut('NEW MAN', () => { A.fin = true; }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.dunn.x, A.dunn.y) / M) + ' M TO DUNN',
      jump(A) { if (P.car) exitCar(true); P.x = A.dunn.x - 24; P.y = A.dunn.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.dunn.dead) return F.dunnDead;
    if (A.otto.dead) return F.ottoDead;
    return '';
  }
  const cuts = {
    "SAL'S PICTURE": A => [
      { dur: 6, cam: 'CLOSE', at: () => A.dunn, line: [1, 2], enter: () => { face(A.dunn, P); P.ang = Math.atan2(A.dunn.y - P.y, A.dunn.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'THE FORGER': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.otto, line: [4, 5], enter: () => { face(A.otto, P); P.ang = Math.atan2(A.otto.y - P.y, A.otto.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [6] }],
    'NEW MAN': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.dunn, line: [10], enter: () => { face(A.dunn, P); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [11], fadeOut: true }]
  };
  return { setup, steps, fail, cuts };
})();

/* ================= P4 - THE BOAT ================= */
MSCRIPT.p4 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const crane = { shirt: '#3a3f4c', pants: '#2a2d36' };
  function setup(A) {
    SKY.hour = N().hour; const MR = MARINA, d = MR.door; A.door = at(d[0] + 22, d[1] + 4);
    const b = MR.berths[MR.berths.length - 1]; A.berth = at(b[0], b[1]);                        // Crane's own berth: the last one on the last pier
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].t.boat && dist(cars[i].x, cars[i].y, b[0], b[1]) < 60) cars.splice(i, 1);
    A.boat = msCar('speedboat', b[0], b[1], 0, '#f4f6fa');                                      // his racer: white, gold stripes
    A.men = [[50, 30], [70, -30]].map(([dx, dy]) => { const q = S1.free(A.door.x + dx, A.door.y + dy, 8); return msFoe(q.x, q.y, Object.assign({ gun: 'pistol', group: 'berth', hp: N().menHp }, crane)); });   // two of Crane's men on the quay
    const st = S1.road(d[0] + 500, d[1] + 300); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: a few blocks off, a car at the kerb
    const k0 = kerbBy(st.x + 50, st.y); A.mycar = msCar('sedan', k0.x, k0.y, k0.ang, '#3d6fa8');
    const J = JETTIES.reduce((best, j) => !best || dist(j.x, j.y, d[0], d[1]) > dist(best.x, best.y, d[0], d[1]) ? j : best, null), ja = J.a * Math.PI / 180;   // a quiet jetty: the furthest from Sunset Harbor
    A.dock = at(J.x + Math.cos(ja) * (J.len + 40), J.y + Math.sin(ja) * (J.len + 40));
  }
  const steps = [
    msPhone('guard', [1, 2, 3]),                                                                  // Dunn calls
    { enter(A) { MS.guide = A.door; MS.mark = () => A.door; },                                   // GO TO Sunset Harbor
      tick(A) { return dist(me().x, me().y, A.door.x, A.door.y) < N().harborM * M; },
      info: A => Math.round(dist(me().x, me().y, A.door.x, A.door.y) / M) + ' M TO SUNSET HARBOR',
      jump(A) { if (P.car) exitCar(true); P.x = A.door.x; P.y = A.door.y; } },
    { enter(A) { MS.guide = () => A.boat; MS.mark = () => A.boat; },                            // GET IN Crane's racer: the alarm
      tick(A) { if (P.car !== A.boat) return false;
        for (const m of A.men) if (!m.dead) foeAlert(m);
        const need = COP.lv.heat[N().stars]; if (P.heat < need && OPT.police > 0) addHeat((need - P.heat) / OPT.police);
        msLive([4], { now: true }); return true; },
      jump(A) { if (P.car) exitCar(true); P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } },
    { enter(A) { MS.mark = null; MS.guide = null; if (P.stars <= 0) $('msObj').hidden = true; },    // LOSE THE POLICE (the police boat behind)
      tick() { return P.stars <= 0; },
      info: () => P.stars > 0 ? 'THE POLICE BOAT IS BEHIND YOU' : '',
      jump() { P.heat = 0; P.stars = 0; } },
    { enter(A) { MS.guide = () => P.car === A.boat ? A.dock : A.boat; MS.mark = () => P.car === A.boat ? A.dock : A.boat; },   // DELIVER the boat to the quiet jetty
      tick(A) { if (A.fin) return true; if (A.home || P.car !== A.boat || dist(A.boat.x, A.boat.y, A.dock.x, A.dock.y) > N().dockM * M) return false;
        A.home = true; msLive([5, 6], { phone: true, done: () => { A.fin = true; } }); return false; },
      info: A => P.car === A.boat ? Math.round(dist(A.boat.x, A.boat.y, A.dock.x, A.dock.y) / M) + ' M TO THE JETTY' : 'GET BACK IN THE BOAT',
      jump(A) { const b = A.boat; if (P.car !== b) { if (P.car) exitCar(true); P.x = b.x; P.y = b.y; enterCar(b); } b.x = A.dock.x; b.y = A.dock.y; b.vx = b.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.boat.dead || A.boat.sunk) return F.sunk;
    return '';
  }
  return { setup, steps, fail, cuts: {} };
})();

/* ================= P5 - LAUNDRY DAY ================= */
MSCRIPT.p5 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const wearing = () => P.outfit && P.outfit.top === 'pri_guard' && P.outfit.bottoms === 'pri_guard_trousers';
  function wear(A) { A.old = A.old || Object.assign({}, P.outfit); for (const id of ['pri_guard', 'pri_guard_trousers']) if (!P.wardrobe.includes(id)) P.wardrobe.push(id); P.outfit.top = 'pri_guard'; P.outfit.bottoms = 'pri_guard_trousers'; P.outfit.hat = null; }
  function setup(A) {
    prisonReset(); PRX.visit = false; SKY.hour = N().hour;
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk (marker S)
    const dq = S1.free(st.x + 40, st.y, 6); A.dunn = msPed(dq.x, dq.y, 0, Object.assign(S1.look('guard'), { msName: 'guard', step: S1.stay, spare: true, shield: true })); face(A.dunn, P);
    const r0 = S1.road(st.x - 200, st.y + 150), k0 = kerbBy(r0.x, r0.y);                    // the prison's laundry truck at the kerb (Suds & Sons do Iron Key's washing)
    for (let i = cars.length - 1; i >= 0; i--) if (P.car !== cars[i] && dist(cars[i].x, cars[i].y, k0.x, k0.y) < 90) cars.splice(i, 1);
    A.truck = msCar('truck', k0.x, k0.y, k0.ang, '#f4f6fa'); A.truck.deco = 'laundry';
    const [mx0, my0, , my1] = PRZ.mpier; A.pier = at(mx0 - 10, (my0 + my1) / 2);                 // the mainland ferry pier's land end
    const pa = PRZ.path; A.isle = { x: pa[2][0], y: pa[2][1] - 20, a: Math.atan2(pa[1][1] - pa[2][1], pa[1][0] - pa[2][0]) };   // on the island's path above its pier
    const [gx, gy] = PRZ.gate; A.gate = at(gx, gy + 40); A.drop = S1.free(PRZ.release[0] - 20, PRZ.release[1] - 20, 10);
    const sq = S1.free(A.drop.x - 40, A.drop.y - 30, 6); A.sal = msPed(sq.x, sq.y, 0, Object.assign(S1.look('sal'), { msName: 'sal', step: S1.stay, spare: true, shield: true }));
  }
  const steps = [
    { enter(A) { MS.mark = () => A.dunn; MS.start = { at: () => A.dunn, label: 'START MISSION', go: () => { face(A.dunn, P); msCut('LAUNDRY DAY', () => { A.go = true; }); } }; },   // TALK TO Dunn
      tick: A => !!A.go },
    { enter(A) { MS.mark = null; if (wearing()) A.worn = true; },                                   // PUT ON Dunn's spare uniform
      tick(A) { if (!A.worn && !MS.start && !P.car) MS.start = { at: () => P, label: "DUNN'S SPARE UNIFORM", go2: 'PUT IT ON', go: () => { wear(A); Snd.pickup(); A.worn = true; } }; return !!A.worn; },
      jump(A) { MS.start = null; wear(A); A.worn = true; } },
    { enter(A) { MS.guide = () => A.truck; MS.mark = () => A.truck; },                              // GET IN the laundry truck
      tick: A => P.car === A.truck,
      jump(A) { if (P.car) exitCar(true); P.x = A.truck.x; P.y = A.truck.y; enterCar(A.truck); } },
    { enter(A) { MS.guide = () => P.car === A.truck ? A.pier : A.truck; MS.mark = () => P.car === A.truck ? A.pier : A.truck; },   // GO TO the ferry: the crossing
      tick(A) { if (A.crossed) return true; if (A.onFerry || P.car !== A.truck || dist(A.truck.x, A.truck.y, A.pier.x, A.pier.y) > N().pierM * M) return false;
        A.onFerry = true; msCut('THE CROSSING', () => { A.crossed = true; }); return false; },
      info: A => P.car === A.truck ? Math.round(dist(A.truck.x, A.truck.y, A.pier.x, A.pier.y) / M) + ' M TO THE FERRY' : 'GET BACK IN THE TRUCK',
      jump(A) { const c = A.truck; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } c.x = A.pier.x; c.y = A.pier.y; c.vx = c.vy = 0; } },
    { enter(A) { MS.guide = A.gate; MS.mark = () => A.gate; },                                      // GO TO the gate - slowly
      tick(A) { if (P.car !== A.truck) return false; const d = dist(A.truck.x, A.truck.y, A.gate.x, A.gate.y) / M;
        if (d < N().slowZone && carSpeed(A.truck) / KMH > N().slowKmh) A.rushed = true;
        if (d > N().gateM) return false; PRX.gateOpen = true; msLive([6], { now: true }); return true; },
      info: A => Math.round(dist(me().x, me().y, A.gate.x, A.gate.y) / M) + ' M TO THE GATE · SLOW (UNDER ' + N().slowKmh + ' KM/H)',
      jump(A) { const c = A.truck; c.x = A.gate.x; c.y = A.gate.y; c.vx = c.vy = 0; PRX.gateOpen = true; } },
    { enter(A) { PRX.gateOpen = true; MS.guide = A.drop; MS.mark = () => A.drop; },                 // DELIVER the baskets to the laundry door
      tick(A) { if (A.fin) return true; PRX.gateOpen = true;
        if (A.home || P.car !== A.truck || dist(A.truck.x, A.truck.y, A.drop.x, A.drop.y) > N().dropM * M || carSpeed(A.truck) / KMH > 6) return false;
        A.home = true; msCut('THE BASKETS', () => { A.fin = true; }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.drop.x, A.drop.y) / M) + ' M TO THE LAUNDRY DOOR · STOP THERE',
      jump(A) { const c = A.truck; c.x = A.drop.x; c.y = A.drop.y; c.vx = c.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.dunn.dead) return F.dunnDead;
    if (A.sal.dead) return F.salDead;
    if (A.truck.dead) return F.truck;
    if (A.rushed) return F.rushed;
    if (MS.k >= 4 && !wearing()) return F.uniform;
    return '';
  }
  const cuts = {
    'LAUNDRY DAY': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.dunn, line: [1, 2], enter: () => { face(A.dunn, P); P.ang = Math.atan2(A.dunn.y - P.y, A.dunn.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'THE CROSSING': A => [
      { dur: 4, cam: 'WIDE', at: () => A.pier, cap: 'THE IRON KEY FERRY', line: [4] },
      { dur: 6, cam: 'PAN', at: () => A.pier, to: () => A.isle, line: [5],
        enter: () => { const c = A.truck, i = A.isle; c.x = i.x; c.y = i.y; c.ang = i.a; c.vx = c.vy = 0; P.x = c.x; P.y = c.y; }, fadeOut: true }],
    'THE BASKETS': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.sal, line: [7, 8], enter: () => { face(A.sal, A.truck); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [9], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { prisonReset(); if (A && A.old && msTest()) Object.assign(P.outfit, A.old); } };
})();

/* ================= P6 - THE YARD ================= */
MSCRIPT.p6 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  function setup(A) {
    prisonReset(); PRX.visit = false; SKY.hour = N().hour; const orange = { shirt: PRI_ORANGE, pants: PRI_ORANGE };   // (js/10u loads after this file)
    const [gx, gy] = PRZ.gate; A.gateOut = at(gx, gy + 46); A.gateIn = at(gx, gy - 46);
    A.sal = msPed(8870, 3742, -Math.PI / 2, Object.assign(S1.look('sal'), { msName: 'sal', step: S1.stay, spare: true }));   // Sal in the yard
    A.cut = msFoe(8955, 3600, Object.assign({ gun: 'knife', group: 'yard', hp: N().bossHp, boss: true, name: 'craneman', a: Math.PI }, orange)); A.cut.calm = true;   // Crane's man inside
    A.men = [[8790, 3600, 'bat'], [8955, 3775, 'knife'], [8800, 3760, 'bat'], [8930, 3570, 'knife']].map(([x, y, g]) => Object.assign(msFoe(x, y, Object.assign({ gun: g, group: 'yard', hp: N().menHp, a: Math.atan2(3742 - y, 8870 - x) }, orange)), { calm: true }));
    A.ferryPier = at((PRZ.mhead[0] + PRZ.mhead[2]) / 2, (PRZ.mhead[1] + PRZ.mhead[3]) / 2);
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk
  }
  function riot(A) {                        // Crane's man goes for Sal; his friends for you; the siren
    if (A.riot) return; A.riot = true; PRX.lock = true;
    msAllyFrom(A.sal, { who: 'sal', calm: true, hp: N().salHp, fail: MS.m.fails.salDead });
    for (const m of [A.cut, ...A.men]) { m.calm = false; foeAlert(m); }
    A.cut.pref = 0.2;                       // he wants Sal more than you
    msLive([5, 6], { now: true }); toast('LOCKDOWN!', true);
  }
  const steps = [
    msPhone('guard', [1, 2]),                                                                     // Dunn calls: a hit on Sal
    { enter(A) { MS.mark = () => A.ferryPier; MS.guide = A.ferryPier; },                          // GO TO Iron Key
      tick: () => !P.ferry && onIsland(me().x, me().y),
      jump(A) { if (P.car) exitCar(true); P.x = PRZ.path[2][0]; P.y = PRZ.path[2][1]; P.swim = false; } },
    { enter(A) { MS.mark = () => A.gateOut; MS.guide = A.gateOut; },                              // GO TO the gate: the search
      tick(A) { if (A.kit) return true; if (P.car || dist(P.x, P.y, A.gateOut.x, A.gateOut.y) > N().gateR) return false; L.holdKit(A); PRX.visit = PRX.gateOpen = true; popup(P.x, P.y - 14, 'WEAPONS LEFT AT THE GATE', '#ffd23f'); return true; },
      jump(A) { if (P.car) exitCar(true); L.holdKit(A); PRX.visit = PRX.gateOpen = true; P.x = A.gateIn.x; P.y = A.gateIn.y; } },
    { enter(A) { MS.mark = () => A.sal; MS.guide = () => A.sal; MS.start = { at: () => A.sal, label: msWho('sal').name, go: () => { face(A.sal, P); msCut('THE HIT', () => { A.told = true; }); } }; },   // TALK TO Sal
      tick(A) { if ([A.cut, ...A.men].some(m => m.alert)) A.told = true; return !!A.told; },
      jump(A) { MS.start = null; A.told = true; } },
    { enter(A) { riot(A); MS.mark = () => !A.cut.dead ? A.cut : A.men.find(m => !m.dead); MS.guide = null; A.sirT = 0; },   // TAKE OUT Crane's man and his friends; keep Sal alive
      tick(A, dt) { if ((A.sirT -= dt) <= 0) { A.sirT = 1.2; Snd.tone(760, 540, 0.9, 0.05, 'sawtooth'); } return msFoesLeft('yard') === 0; },
      info: A => msFoesLeft('yard') + ' LEFT · SAL ' + Math.max(0, Math.round(100 * A.sal.hp / A.sal.hpMax)) + '%',
      jump(A) { riot(A); for (const m of [A.cut, ...A.men]) if (!m.dead) killPed(m, 'gun', false); } },
    { enter(A) { msLive([7, 8], { now: true }); MS.mark = () => A.gateOut; MS.guide = A.gateOut; PRX.lock = false; },   // GO TO the gate: your weapons back
      tick(A) { if (inPrison(me().x, me().y) || dist(me().x, me().y, A.gateOut.x, A.gateOut.y) > 160) return false; L.kitBack(A); Snd.pickup(); popup(P.x, P.y - 14, 'YOUR WEAPONS', '#b6ff3c'); return true; },
      jump(A) { L.kitBack(A); P.x = A.gateOut.x; P.y = A.gateOut.y; } }];
  function fail(A) { const F = MS.m.fails; if (A.sal.dead) return F.salDead; return ''; }
  const cuts = {
    'THE HIT': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.sal, line: [3], enter: () => { face(A.sal, P); P.ang = Math.atan2(A.sal.y - P.y, A.sal.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => A.cut, line: [4] }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A) PRISONL.kitBack(A); PRX.lock = false; prisonReset(); } };
})();
