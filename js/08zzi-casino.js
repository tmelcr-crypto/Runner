'use strict';
/* ---------- 8zzi. THE CASINO STORYLINE (Del Ramos - the Royal Flamingo's vault): the scripts of C1-C8 ----------
   Each mission's words, lines and numbers are in the missions table (js/01x); the engine and chapter 1's helpers (STORY1) in js/08zy,
   chapter 2's (STORY2) in js/08zzh; the enemies and friends in js/08zz; the strip itself (the Royal Flamingo, THE PULSE) in js/10w. */
const CASL = {
  door() { const d = CASM.door; return { x: d[0] + 34, y: d[1] }; },          // the sidewalk outside the Royal Flamingo's door (the avenue side)
  delHome() {                              // Del's place: a street door a few blocks south of the strip whose front the camera sees
    const d = CASM.door, s = STORY2.shops(d[0] - 260, d[1] + 1300, 1)[0];
    return s || Object.assign(STORY1.sidewalk(d[0], d[1] + 1300), { fx: 0, fy: 1, wx: d[0], wy: d[1] + 1284, a: Math.PI / 2 });
  }
};

/* ================= C1 - DEALER'S CHOICE ================= */
MSCRIPT.c1 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.door = CASL.door(); A.home = CASL.delHome();
    A.del = msPed(A.door.x + 8, A.door.y - 16, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const q = S1.free(A.del.x, A.del.y, 46); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: on the strip at 3:00
  }
  const delAt = A => A.del.aboard ? A.del.aboard : A.del;
  function attack(A) {                                                             // Gold's crew: three on foot ahead, a car with two more behind
    if (A.att) return; A.att = true;
    const m = me(), a = m === P ? (P.ang || 0) : m.ang, ahead = S1.road(m.x + Math.cos(a) * 260, m.y + Math.sin(a) * 260);
    A.men = [-1, 0, 1].map(s => { const q = S1.free(ahead.x + s * 30, ahead.y + s * 18, 8); return msFoe(q.x, q.y, { gun: s ? 'pistol' : 'bat', hp: N().menHp, group: 'gold', a: Math.atan2(m.y - q.y, m.x - q.x), alert: true, shirt: '#6b1426', pants: '#1a1a20' }); });
    const back = S1.road(m.x - Math.cos(a) * 520, m.y - Math.sin(a) * 520), k = kerbBy(back.x, back.y);
    A.car = msFoeCar('sedan', k.x, k.y, k.ang, { crew: 2, gun: 'pistol', group: 'gold', speed: 90, color: '#6b1426' });
    msLive([5, 6], { now: true });
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('THE COUNT', () => { A.go = true; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { if (!A.del.ally) msAllyFrom(A.del, { who: 'del', calm: true, near: true, hp: N().delHp, fail: MS.m.fails.delDead }); A.t2 = gameT; MS.guide = A.home; MS.mark = () => A.home; },   // FOLLOW: walk Del home
      tick(A) { if (gameT - A.t2 < N().attackT && dist(me().x, me().y, A.home.x, A.home.y) > 420) return false; attack(A); return true; },
      info: A => Math.round(dist(me().x, me().y, A.home.x, A.home.y) / UNITS_PER_M) + " M TO DEL'S PLACE",
      jump(A) { const h = A.home, w = S1.road((h.x + A.door.x) / 2, (h.y + A.door.y) / 2), q = S1.sidewalk(w.x, w.y);
        if (P.car) exitCar(true); P.x = q.x; P.y = q.y; const d = S1.free(q.x, q.y, 24); if (A.del.aboard) allyAlight(A.del); A.del.x = d.x; A.del.y = d.y; A.t2 = -1e9; } },
    { enter(A) { MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'gold') || (A.car && !A.car.dead && !A.car.fc.out ? A.car : null); MS.guide = null; },   // TAKE OUT Gold's crew
      tick(A) { if (msFoesLeft('gold') > 0) return false; msLive([7], { now: true }); return true; },
      info: () => msFoesLeft('gold') + ' LEFT',
      jump(A) { if (A.car) { const c = A.car; c.fc.crew = 0; c.fc.mode = 'park'; c.driver = null; c.msDrive = null; c.thr = c.str = 0; } for (const p of peds) if (p.foe && !p.dead && p.group === 'gold') killPed(p, 'gun', false); } },
    { enter(A) { MS.guide = A.home; MS.mark = () => A.home; },                       // DELIVER: get Del to his door
      tick(A) {
        if (A.cut4 || P.car || dist(P.x, P.y, A.home.x, A.home.y) > N().homeR || dist(A.del.x, A.del.y, A.home.x, A.home.y) > N().homeR * 2.5 || A.del.aboard) return false;
        A.cut4 = true; msCut("DEL'S DOOR", () => msNext()); return false; },
      info: A => { const d = delAt(A); return P.car || dist(d.x, d.y, A.home.x, A.home.y) < N().homeR * 2.5 || dist(P.x, P.y, A.home.x, A.home.y) > N().homeR * 3 ? Math.round(dist(me().x, me().y, A.home.x, A.home.y) / UNITS_PER_M) + " M TO DEL'S DOOR" : 'WAIT FOR DEL'; },
      jump(A) { if (P.car) exitCar(true); if (A.del.aboard) allyAlight(A.del); const h = A.home; P.x = h.x + h.fx * 18; P.y = h.y + h.fy * 18; A.del.x = h.x - h.fy * 14; A.del.y = h.y + h.fx * 14; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.del.dead) return F.delDead;
    if (MS.k >= 1 && MS.k <= 3 && !A.del.aboard && dist(A.del.x, A.del.y, me().x, me().y) > N().farR * UNITS_PER_M) return F.lost;
    return '';
  }
  const cuts = {
    'THE COUNT': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [3, 4], enter: () => { A.del.ang = A.del.hd = Math.atan2(A.door.y - 40 - A.del.y, A.door.x - 40 - A.del.x); } }],
    "DEL'S DOOR": A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [8, 9], enter: () => { const h = A.home; A.del.x = h.x; A.del.y = h.y; A.del.vx = A.del.vy = 0; A.del.post.step = S1.stay; A.del.state = 'post'; face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 10, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() {} };
})();

/* ================= C2 - BLUEPRINTS ================= */
MSCRIPT.c2 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.door = CASL.door();
    A.del = msPed(A.door.x + 8, A.door.y - 16, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const q = S1.free(A.del.x, A.del.y, 46); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: on the strip at 1:00, a car at the kerb
    const r = S1.road(A.door.x + 90, A.door.y + 120), k = kerbBy(r.x, r.y); A.mycar = msCar('estate', k.x, k.y, k.ang, '#3d6fa8');
    A.crown = sbCrown(); A.at = at(A.crown.door.x, A.crown.door.y + 24);
    SB.ms = { open: true, liftTop: N().liftTop, spotted: false,              // the Crown held tonight: the offices open, three guards on the top floors
      guards: [sbGuard(8, 190, 1230, 980, -1), sbGuard(9, 170, 1240, 360, 1), sbGuard(10, 170, 1200, 560, 1)],
      item: { fl: 10, room: 'CRANE DEVELOPMENT', x: 620, label: 'TAKE THE PLANS', toast: 'THE VAULT PLANS', got: false } };
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('THE PLANS', () => { A.go = true; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.at; MS.mark = () => A.at; },                           // GO INTO the Crown
      tick(A) { if (!SV.on || SV.h.id !== 'crown') return false; msLive([5], { now: true }); return true; },
      info: A => SV.on ? 'INSIDE' : Math.round(dist(me().x, me().y, A.at.x, A.at.y) / UNITS_PER_M) + ' M TO THE CROWN',
      jump(A) { if (P.car) exitCar(true); P.x = A.at.x; P.y = A.at.y - 6; P.vx = P.vy = 0; if (!SV.on) sbUse(A.crown); } },
    { enter(A) { MS.guide = A.at; MS.mark = () => A.at; SB.ms.item.done = () => msLive([6], { now: true }); },   // STEAL the plans, unseen
      tick() { return SB.ms.item.got; },
      info: () => SV.on ? (SV.room ? SV.room.door.name : SV.fl === 0 ? 'LOBBY' : 'FLOOR ' + SV.fl) + ' · CRANE DEVELOPMENT IS ON 10' : 'BACK INTO THE CROWN',
      jump() { SB.ms.item.got = true; } },
    { enter(A) { MS.guide = A.at; MS.mark = () => A.at; },                           // GET OUT, unseen
      tick() { return !SV.on; },
      info: () => SV.on ? (SV.fl === 0 ? 'LOBBY - THE DOOR IS ON THE LEFT' : 'FLOOR ' + SV.fl) : 'OUT',
      jump() { if (SV.on) closeSide(); } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.del; },                       // DELIVER the plans to Del: the closing
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.del.x, A.del.y) > N().delR) return false; A.home = true; msCut('THE PLANS READ', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.del.x, A.del.y) / UNITS_PER_M) + ' M TO DEL',
      jump(A) { if (SV.on) closeSide(); if (P.car) exitCar(true); const q = S1.free(A.del.x, A.del.y, 30); P.x = q.x; P.y = q.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (SB.ms && SB.ms.spotted) return F.spotted;
    if (A.del.dead) return F.delDead;
    return '';
  }
  const cuts = {
    'THE PLANS': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [3, 4] }],
    'THE PLANS READ': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [7, 8], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [9, 10], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { SB.ms = null; } };
})();
