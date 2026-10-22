'use strict';
/* ---------- 8zzi. THE CASINO STORYLINE (Del Ramos - the Royal Flamingo's vault): the scripts of C1-C8 ----------
   Each mission's words, lines and numbers are in the missions table (js/01x); the engine and chapter 1's helpers (STORY1) in js/08zy,
   chapter 2's (STORY2) in js/08zzh; the enemies and friends in js/08zz; the strip itself (the Royal Flamingo, THE PULSE) in js/10w. */
const CASL = {
  door() { const d = CASM.door; return { x: d[0] + 34, y: d[1] }; },          // the sidewalk outside the Royal Flamingo's door (the avenue side)
  uniform: () => P.outfit && P.outfit.top === 'cas_guard' && P.outfit.bottoms === 'cas_guard_trousers',   // the guard's uniform on (C3)
  wear(A) { A.oldOutfit = Object.assign({}, P.outfit); for (const id of ['cas_guard', 'cas_guard_trousers']) if (!P.wardrobe.includes(id)) P.wardrobe.push(id); P.outfit.top = 'cas_guard'; P.outfit.bottoms = 'cas_guard_trousers'; P.outfit.hat = null; },
  unwear(A) { if (A && A.oldOutfit && msTest()) Object.assign(P.outfit, A.oldOutfit); },   // MISSIONS TEST: your own clothes back
  hideout() {                              // Del's lock-up: the storage yard's unit nearest the strip (C4, C6, C8)
    const d = CASM.door; let b = null; for (const S of IXS) if (S.kind === 'unit' && !S.rare && (!b || dist(S.cx, S.cy, d[0], d[1]) < dist(b.cx, b.cy, d[0], d[1]))) b = S;
    return b && { S: b, inside: ixWorld(b, 0, 0), door: ixWorld(b, 0, b.hd + 40), del: ixWorld(b, b.hw * 0.5, b.hd - 18) };
  },
  backDoor() { const H = casHall(), r = STORY1.road((H.x0 + H.x1) / 2, H.y0 - 60); return { x: r.x, y: r.y }; },   // the Royal Flamingo's back door: the street on the block's north side
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

/* ================= C3 - THE UNIFORM ================= */
MSCRIPT.c3 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.door = CASL.door(); const d = CASM.door;
    A.del = msPed(A.door.x + 8, A.door.y - 16, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const q = S1.free(A.del.x, A.del.y, 46); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: on the strip at 22:00, a car at the kerb
    const r = S1.road(A.door.x + 90, A.door.y + 120), k = kerbBy(r.x, r.y); A.mycar = msCar('estate', k.x, k.y, k.ang, '#3d6fa8');
    const vr = S1.road(d[0] + 60, d[1] - 260), vk = kerbBy(vr.x, vr.y); A.route = [S1.road(d[0] - 600, d[1] + 1500), S1.road(d[0] - 1400, d[1] + 2600), S1.road(d[0] - 2400, d[1] + 3200)];
    A.van = msFoeCar('truck', vk.x, vk.y, vk.ang, { mode: 'park', crew: 0, gun: null, group: 'van', speed: N().vanSpeed, to: A.route, color: '#f4f6fa' }); A.van.deco = 'laundry';
    const H = casHall(), L = casLayout(), cy = d[1];                                // what to mark: three cameras and the staff door behind the cage
    A.marks = [at(H.x0 + 110, H.y0 + 36), at(H.x1 - 60, H.y1 - 36), at(L.cage.win.x + 34, cy + 72), at(L.cage.x0 + 30, L.cage.y0 - 14)];
    A.marked = 0;
  }
  function stop(A) {                                                              // the back doors burst: the van stops, the driver runs, the bag falls out
    if (A.stopped) return; A.stopped = true;
    const v = A.van; v.driver = null; v.msDrive = null; v.thr = v.str = 0; v.fc.mode = 'park'; v.vx *= 0.3; v.vy *= 0.3;
    const sx = -Math.sin(v.ang), sy = Math.cos(v.ang), dr = msPed(v.x + sx * 26, v.y + sy * 26, v.ang, { shirt: '#e8e8ee', pants: '#2a5fc8', spare: true }); dr.state = 'flee';
    A.bag = S1.dryNear(v.x - Math.cos(v.ang) * 40, v.y - Math.sin(v.ang) * 40); popup(v.x, v.y - 20, 'THE BACK DOORS BURST', '#ffd23f');
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('BLACK AND GOLD', () => { A.go = true; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { MS.mark = () => A.van; MS.guide = () => A.van; if (A.van.fc.mode === 'park' && !A.stopped) { A.van.fc.wait = 0.6; foeCarGo(A.van, 'flee'); } },   // CHASE: ram the van
      tick(A) { const v = A.van; if (!A.stopped && (v.hp < v.maxhp * N().vanHp || v.dead)) stop(A); return A.stopped; },
      info: A => Math.round(dist(me().x, me().y, A.van.x, A.van.y) / UNITS_PER_M) + ' M TO THE VAN (GONE AT ' + N().away + ') · ' + Math.round(100 * A.van.hp / A.van.maxhp) + '%',
      jump(A) { stop(A); } },
    { enter(A) { if (!A.bag) stop(A); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); MS.guide = null; },   // COLLECT the uniform
      tick(A) { if (A.got) return true; if (P.car || !A.bag || dist(P.x, P.y, A.bag.x, A.bag.y) > N().bagR) return false; A.bag = null; A.got = true; Snd.pickup(); popup(P.x, P.y - 14, 'CASINO GUARD UNIFORM', '#b6ff3c'); return true; },
      jump(A) { A.bag = null; A.got = true; } },
    { enter(A) { MS.mark = null; MS.start = { at: () => P, label: 'THE GUARD\'S UNIFORM', go2: 'PUT IT ON', go: () => { CASL.wear(A); Snd.pickup(); msLive([4], { now: true }); A.worn = true; } }; },   // PUT ON the uniform
      tick(A) { if (!A.worn && !MS.start && !P.car) MS.start = { at: () => P, label: 'THE GUARD\'S UNIFORM', go2: 'PUT IT ON', go: () => { CASL.wear(A); Snd.pickup(); msLive([4], { now: true }); A.worn = true; } }; return !!A.worn; },
      info: () => P.car ? 'GET OUT OF THE CAR TO CHANGE' : 'THE BUTTON BY YOU',
      jump(A) { if (P.car) exitCar(true); CASL.wear(A); A.worn = true; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marks[A.marked]; },          // MARK the cameras and the staff door
      tick(A) {
        if (A.marked >= A.marks.length) return true;
        if (!A.nod && inCasino(P.x, P.y, 0) && CASL.uniform()) { A.nod = true; msLive([5], { now: true }); }
        const m = A.marks[A.marked], k = A.marked, near = !P.car && CASL.uniform() && dist(P.x, P.y, m.x, m.y) < N().markR;
        if (near && !MS.start) MS.start = { at: () => m, label: k < 3 ? 'CAMERA ' + (k + 1) + '/3' : 'THE STAFF DOOR', go2: 'MARK', go: () => { A.marked++; Snd.tone(880, 1320, 0.1, 0.07, 'square'); popup(P.x, P.y - 14, (k < 3 ? 'CAMERA ' + (k + 1) : 'THE STAFF DOOR') + ' MARKED', '#b6ff3c'); if (A.marked >= A.marks.length) msLive([6], { now: true }); } };
        if (!near && MS.start) MS.start = null;
        return false; },
      info: A => !CASL.uniform() ? 'PUT THE UNIFORM BACK ON' : A.marked + '/4 MARKED' + (inCasino(P.x, P.y, 0) ? '' : ' · INTO THE ROYAL FLAMINGO'),
      jump(A) { if (P.car) exitCar(true); A.marked = A.marks.length; } },
    { enter(A) { MS.start = null; MS.guide = A.door; MS.mark = () => A.del; },      // back to Del: the closing
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.del.x, A.del.y) > N().delR) return false; A.home = true; msCut('THE MAP', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.del.x, A.del.y) / UNITS_PER_M) + ' M TO DEL',
      jump(A) { if (P.car) exitCar(true); const q = S1.free(A.del.x, A.del.y, 30); P.x = q.x; P.y = q.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.del.dead) return F.delDead;
    if (MS.k === 1 && !A.stopped && (A.van.fc.gone || dist(me().x, me().y, A.van.x, A.van.y) > N().away * UNITS_PER_M)) return F.away;
    return '';
  }
  const cuts = {
    'BLACK AND GOLD': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'WIDE', at: () => A.van, line: 3 }],
    'THE MAP': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [7, 8], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 9, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { CASL.unwear(A); } };
})();

/* ================= C4 - THE CASH VAN ================= */
MSCRIPT.c4 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.door = CASL.door(); A.D = DEPOT.S; A.H = CASL.hideout();
    A.del = msPed(A.door.x + 8, A.door.y - 16, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const q = S1.free(A.del.x, A.del.y, 46); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: on the strip at 2:00
    A.H.S.ms = true;                                                                // Del's lock-up: its door up tonight
    DEPOT.ms = { gate: true, stars: N().stars, opened: () => { A.opened = true; for (const g of A.guards) foeAlert(g); msLive([4], { now: true }); } };
    const D = A.D, W = (lx, lz) => depotWorld(lx, lz);
    A.guards = [W(D.hut.x + 22, D.hd - 26), W(-D.hw * 0.7, -D.hd * 0.1), W(D.hw * 0.75, 0)].map((w, i) => msFoe(w.x, w.y, { gun: i ? 'smg' : 'pistol', hp: N().guardHp, group: 'depot', a: D.vanAng, shirt: '#16161c', pants: '#16161c' }));
    for (const v of DEPOT.vans) { if (v.car && cars.includes(v.car) && P.car !== v.car) cars.splice(cars.indexOf(v.car), 1); const w = W(v.lx, v.lz); v.car = depotVan(w.x, w.y, D.vanAng); v.takenAt = null; cars.push(v.car); MS.A.list.push(v.car); }
  }
  const myVan = () => P.car && P.car.depot ? P.car : null;
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('TWO VANS', () => { A.go = true; const d = A.H.del; A.del.x = d.x; A.del.y = d.y; A.del.post.x = d.x; A.del.post.y = d.y; }); } }; },   // TALK TO Del (then he goes ahead to the lock-up)
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.D.window; MS.mark = () => A.D.window; },              // GO TO the depot
      tick(A) { return dist(me().x, me().y, A.D.window.x, A.D.window.y) < N().depotR; },
      info: A => Math.round(dist(me().x, me().y, A.D.window.x, A.D.window.y) / UNITS_PER_M) + ' M TO THE DEPOT',
      jump(A) { if (P.car) exitCar(true); P.x = A.D.window.x; P.y = A.D.window.y; } },
    { enter(A) { MS.mark = () => A.D.window; MS.guide = null; },                     // OPEN the gate: the alarm
      tick(A) { return !!A.opened; },
      info: () => P.car ? 'ON FOOT, AT THE HUT\'S WINDOW' : 'THE BUTTON AT THE HUT\'S WINDOW',
      jump(A) { if (P.car) exitCar(true); P.x = A.D.window.x; P.y = A.D.window.y; depotUse(); } },
    { enter(A) { MS.mark = () => DEPOT.vans.map(v => v.car).find(c => c && !c.dead); MS.guide = null; },   // GET IN a van
      tick(A) { if (!myVan()) return false; msLive([5], { now: true }); return true; },
      jump(A) { const c = DEPOT.vans[0].car; if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); DEPOT.open = 1; DEPOT.want = 1; DEPOT.gate.off = true; } },
    { enter(A) { MS.guide = A.H.door; MS.mark = () => A.H.inside; },                // HIDE it in the lock-up, no police
      tick(A) {
        const v = myVan(); if (A.home || !v || P.stars > 0 || !ixIn(A.H.S, v.x, v.y, 0) || S1.kmh(v) > N().stopKmh) return false;
        A.home = true; A.van = v; msCut('THE LOCK-UP', () => msNext()); return false; },
      info: A => !myVan() ? 'GET BACK IN THE VAN' : P.stars > 0 ? 'LOSE THE POLICE FIRST' : Math.round(dist(me().x, me().y, A.H.inside.x, A.H.inside.y) / UNITS_PER_M) + " M TO DEL'S LOCK-UP",
      jump(A) { let v = myVan(); if (!v) { v = DEPOT.vans.map(q => q.car).find(c => c && !c.dead); if (P.car) exitCar(true); P.x = v.x; P.y = v.y; enterCar(v); }
        P.stars = 0; P.heat = 0; resetPolice(); v.x = A.H.inside.x; v.y = A.H.inside.y; v.ang = A.H.S.a - Math.PI / 2; v.vx = v.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.del.dead) return F.delDead;
    if (MS.k >= 3 && DEPOT.vans.every(v => !v.car || v.car.dead)) return F.wrecked;
    return '';
  }
  const cuts = {
    'TWO VANS': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 3 }],
    'THE LOCK-UP': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [6, 7], enter: () => { if (P.car) exitCar(true); const q = S1.free(A.del.x, A.del.y, 26); P.x = q.x; P.y = q.y; face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.van || A.del, line: 8, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { DEPOT.ms = null; if (A.H) A.H.S.ms = false; } };
})();

/* ================= C5 - FINGERS ================= */
MSCRIPT.c5 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.door = CASL.door(); A.F = FUN.S; A.H = CASL.hideout(); FUN.ms = true;
    A.del = msPed(A.door.x + 8, A.door.y - 16, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const q = S1.free(A.del.x, A.del.y, 46); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: on the strip at 22:00, a car at the kerb
    const r = S1.road(A.door.x + 90, A.door.y + 120), k = kerbBy(r.x, r.y); A.mycar = msCar('estate', k.x, k.y, k.ang, '#3d6fa8');
    const F = A.F, W = (lx, lz) => funWorld(lx, lz), M = F.maze;
    const fp = W(F.fay.x, F.fay.z); A.fay = msPed(fp.x, fp.y, Math.PI, Object.assign(S1.look('fay'), { msName: 'fay', step: S1.stay, spare: true })); A.fay.hp = N().fayHp;   // tied to a chair in the tilted room
    A.men = [[-20, F.hd + 30], [20, F.hd + 30], [-30, 76], [M.x0 + M.cw * 1.5, M.z0 + M.ch * 2.5], [M.x0 + M.cw * 2.5, M.z0 + M.ch * 0.5], [F.tilt.x0 + 22, -20]].map(([lx, lz], i) => {
      const w = W(lx, lz); return msFoe(w.x, w.y, { gun: i % 3 === 2 ? 'bat' : 'pistol', hp: N().menHp, group: 'fun', a: -Math.PI / 2, shirt: '#6b1426', pants: '#1a1a20' }); });
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('FINGERS', () => { A.go = true; const d = A.H.del; A.del.x = d.x; A.del.y = d.y; A.del.post.x = d.x; A.del.post.y = d.y; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.F.door; MS.mark = () => A.F.door; },                   // GO TO the funhouse
      tick(A) { if (dist(me().x, me().y, A.F.door.x, A.F.door.y) > N().funR) return false; msLive([4], { now: true }); return true; },
      info: A => Math.round(dist(me().x, me().y, A.F.door.x, A.F.door.y) / UNITS_PER_M) + ' M TO THE FUNHOUSE',
      jump(A) { if (P.car) exitCar(true); P.x = A.F.door.x; P.y = A.F.door.y + 30; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.men.find(m => !m.dead); },       // TAKE OUT Gold's men
      tick() { return msFoesLeft('fun') === 0; },
      info: () => msFoesLeft('fun') + ' LEFT',
      jump(A) { for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); } },
    { enter(A) { MS.mark = () => A.fay; MS.start = { at: () => A.fay, label: 'FAY', go2: 'UNTIE HER', go: () => msCut('FAY', () => { A.freed = true; }) }; },   // FREE Fay
      tick(A) { if (A.freed) return true; if (!MS.start && !CUT.on) MS.start = { at: () => A.fay, label: 'FAY', go2: 'UNTIE HER', go: () => msCut('FAY', () => { A.freed = true; }) }; return false; },
      info: A => funIn(P.x, P.y, 0) ? 'THE TILTED ROOM, AT THE BACK RIGHT' : 'INTO THE FUNHOUSE',
      jump(A) { A.freed = true; } },
    { enter(A) { if (!A.fay.ally) { const d = A.F.door; A.fay.x = d.x + 16; A.fay.y = d.y; msAllyFrom(A.fay, { who: 'fay', gun: 'pistol', hp: N().fayHp, fail: MS.m.fails.fayDead }); }   // BRING Fay to Del
        MS.guide = A.H.door; MS.mark = () => A.del; },
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.del.x, A.del.y) > N().delR || A.fay.aboard || dist(A.fay.x, A.fay.y, A.del.x, A.del.y) > N().delR * 3) return false; A.home = true; msCut('THE CREW', () => msNext()); return false; },
      info: A => A.fay.aboard || dist(A.fay.x, A.fay.y, me().x, me().y) < 120 ? Math.round(dist(me().x, me().y, A.del.x, A.del.y) / UNITS_PER_M) + " M TO DEL'S LOCK-UP" : 'FAY IS BEHIND YOU',
      jump(A) { if (P.car) exitCar(true); if (A.fay.aboard) allyAlight(A.fay); const q = S1.free(A.del.x, A.del.y, 30); P.x = q.x; P.y = q.y; const f = S1.free(A.del.x, A.del.y, 44); A.fay.x = f.x; A.fay.y = f.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    const f = msCastFail(); if (f) return f;
    if (A.fay.dead) return F.fayDead;
    if (A.del.dead) return F.delDead;
    return '';
  }
  const cuts = {
    'FINGERS': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 3 }],
    'FAY': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.fay, line: [5, 6], enter: () => { const q = S1.free(A.fay.x, A.fay.y, 22); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; face(A.fay, P); P.ang = Math.atan2(A.fay.y - P.y, A.fay.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.fay, line: 7, enter: () => { const d = A.F.door; P.x = d.x - 14; P.y = d.y + 6; A.fay.x = d.x + 14; A.fay.y = d.y + 6; A.fay.post.x = A.fay.x; A.fay.post.y = A.fay.y; face(A.fay, P); } }],
    'THE CREW': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [8, 9], enter: () => { face(A.del, A.fay); face(A.fay, A.del); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 10, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { FUN.ms = null; } };
})();

/* ================= C6 - DRY RUN ================= */
MSCRIPT.c6 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.H = CASL.hideout(); A.H.S.ms = true; A.back = CASL.backDoor();
    const S = A.H.S, v = A.H.inside; A.van = depotVan(v.x, v.y, S.a - Math.PI / 2); cars.push(A.van); A.list.push(A.van);   // the van in the lock-up, nose to the door
    const d = A.H.del; A.del = msPed(d.x, d.y, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const f = S1.free(A.H.door.x, A.H.door.y, 30); A.fay = msPed(f.x, f.y, 0, Object.assign(S1.look('fay'), { msName: 'fay', step: S1.stay, spare: true }));
    const q = ixWorld(S, -S.hw * 0.3, S.hd + 22); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P); face(A.fay, P);   // MISSIONS TEST: at the lock-up's door at 3:00
    const k = kerbBy(A.back.x + 90, A.back.y - 40); A.cop = msCar('police', k.x, k.y, k.ang); A.cop.free = true;   // the patrol car across the street from the back door
  }
  const inVan = A => P.car === A.van;
  const left = A => Math.max(0, N().timeLimit - (gameT - A.t0));
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('THE STOPWATCH', () => { A.go = true; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { MS.mark = () => A.van; },                                           // GET IN the van
      tick(A) { return inVan(A); },
      jump(A) { if (P.car) exitCar(true); P.x = A.van.x; P.y = A.van.y; enterCar(A.van); } },
    { enter(A) { MS.guide = A.back; MS.mark = () => A.back; },                       // GO TO the back door and stop: the clock starts
      tick(A) { if (!inVan(A) || dist(A.van.x, A.van.y, A.back.x, A.back.y) > N().backR || S1.kmh(A.van) > N().stopKmh) return false;
        A.t0 = gameT; msLive([4, 5], { now: true, phone: true }); P.heat = Math.max(P.heat, COP.lv.heat[N().stars] + 1); updateStars(); return true; },
      info: A => inVan(A) ? Math.round(dist(me().x, me().y, A.back.x, A.back.y) / UNITS_PER_M) + ' M TO THE BACK DOOR' : 'GET BACK IN THE VAN',
      jump(A) { const v = A.van; if (P.car !== v) { if (P.car) exitCar(true); P.x = v.x; P.y = v.y; enterCar(v); } v.x = A.back.x; v.y = A.back.y; v.vx = v.vy = 0; } },
    { enter(A) { MS.guide = A.H.door; MS.mark = () => A.H.inside; },                // BACK inside 2 minutes, no stars
      tick(A) {
        if (A.home || !inVan(A) || P.stars > 0 || !ixIn(A.H.S, A.van.x, A.van.y, 0) || S1.kmh(A.van) > N().stopKmh) return false;
        A.home = true; A.time = gameT - A.t0; msCut('THE TIME', () => msNext()); return false; },
      info: A => clock(left(A)) + ' LEFT · ' + (!inVan(A) ? 'GET BACK IN THE VAN' : P.stars > 0 ? 'LOSE THE POLICE' : Math.round(dist(me().x, me().y, A.H.inside.x, A.H.inside.y) / UNITS_PER_M) + ' M TO THE LOCK-UP'),
      jump(A) { const v = A.van; if (P.car !== v) { if (P.car) exitCar(true); P.x = v.x; P.y = v.y; enterCar(v); } P.stars = 0; P.heat = 0; resetPolice(); v.x = A.H.inside.x; v.y = A.H.inside.y; v.vx = v.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.van.dead) return F.wrecked;
    if (MS.k === 3 && !A.home && left(A) <= 0) return F.slow;
    return '';
  }
  const cuts = {
    'THE STOPWATCH': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => A.van, line: 3 }],
    'THE TIME': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [6, 7], cap: 'TIME ' + clock(A.time || 0), enter: () => { if (P.car) exitCar(true); face(A.del, P); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: 8, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A.H) A.H.S.ms = false; } };
})();

/* ================= C7 - LIGHTS OUT ================= */
MSCRIPT.c7 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.H = CASL.hideout(); A.Y = SUBST.S; SUBST.ms = { gate: true, blowable: false };   // tonight the gate stands open; nothing blows yet
    const d = A.H.del; A.del = msPed(d.x, d.y, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const f = S1.free(A.H.door.x, A.H.door.y, 30); A.fay = msPed(f.x, f.y, 0, Object.assign(S1.look('fay'), { msName: 'fay', step: S1.stay, spare: true }));
    const S = A.H.S, q = ixWorld(S, -S.hw * 0.3, S.hd + 22); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P);   // MISSIONS TEST: at the lock-up at 1:00
    const k = kerbBy(A.H.door.x + 60, A.H.door.y + 40); A.mycar = msCar('estate', k.x, k.y, k.ang, '#3d6fa8');
    const W = (lx, lz) => subWorld(lx, lz), loop = [W(-32, -27), W(30, -27), W(30, 27), W(-32, 27)];
    A.guards = [0, 2].map(i => { const w = loop[i], g = msPed(w.x, w.y, 0, { cguard: true, shirt: '#2a3a5c', pants: '#1a2236', spare: true });   // two night guards on their round, opposite sides
      g.ri = (i + 1) % 4; g.post.step = (p, dt) => { const t = loop[p.ri]; if (walkTo(p, t.x, t.y, WALK * 0.8, dt) < 6) p.ri = (p.ri + 1) % 4; return true; }; g.alertT = 0; return g; });
    A.spots = A.Y.units.map(u => W(u.lx + 20, u.lz)); A.set = 0;   // at each tank's east side
  }
  function sees(g) {                                                               // in his beam: near, ahead of him, nothing between
    if (P.dead || g.dead) return false; const d = dist(g.x, g.y, P.x, P.y); if (d > N().seeM * UNITS_PER_M) return false;
    return Math.abs(angDiff(g.ang, Math.atan2(P.y - g.y, P.x - g.x))) < N().cone * Math.PI / 180 && losClear(g.x, g.y, P.x, P.y);
  }
  function watch(A, dt) {                                                          // the guards: "!" and a rising tone; 2 seconds in sight and it's over
    for (const g of A.guards) {
      if (g.hp < g.hpMax0) { A.spotted = true; return; }
      if (sees(g)) { g.alertT += dt; g.stop = true; if ((g.toneT = (g.toneT || 0) - dt) <= 0) { g.toneT = 0.25; Snd.tone(500 + 900 * clamp(g.alertT / MSN.warnT, 0, 1), 520 + 900 * clamp(g.alertT / MSN.warnT, 0, 1), 0.12, 0.08, 'square'); popup(g.x, g.y - 18, '!', g.alertT > MSN.warnT * 0.6 ? '#ff3b4a' : '#ffd23f'); }
        if (g.alertT >= MSN.warnT) A.spotted = true; }
      else if (g.alertT > 0) { g.alertT = 0; popup(g.x, g.y - 18, '?', '#cfd3dc'); }
    }
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('LIGHTS OUT', () => { A.go = true; for (const g of A.guards) g.hpMax0 = g.hp; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.Y.outside; MS.mark = () => A.Y.outside; },              // GO TO the substation
      tick(A) { return dist(me().x, me().y, A.Y.outside.x, A.Y.outside.y) < N().subR; },
      info: A => Math.round(dist(me().x, me().y, A.Y.outside.x, A.Y.outside.y) / UNITS_PER_M) + ' M TO THE SUBSTATION',
      jump(A) { if (P.car) exitCar(true); P.x = A.Y.outside.x + 40; P.y = A.Y.outside.y; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.spots[A.set]; },                 // PLANT the charges, unseen
      tick(A, dt) {
        watch(A, dt); if (A.set >= A.spots.length) return true;
        const s = A.spots[A.set], k = A.set, near = !P.car && dist(P.x, P.y, s.x, s.y) < N().plantR;
        if (near && !MS.start) MS.start = { at: () => s, label: 'TRANSFORMER ' + (k + 1) + '/3', go2: 'PLANT', go: () => { A.set++; Snd.tone(1200, 1500, 0.08, 0.06, 'square'); popup(P.x, P.y - 14, 'CHARGE SET', '#ff3b4a'); if (A.set >= A.spots.length) msLive([4], { now: true }); } };
        if (!near && MS.start) MS.start = null;
        return false; },
      info: A => A.set + '/3 SET' + (A.guards.some(g => g.alertT > 0) ? ' · SEEN!' : ''),
      jump(A) { A.set = A.spots.length; } },
    { enter(A) { MS.start = null; MS.guide = null; MS.mark = null; },                // GET AWAY, unseen
      tick(A, dt) { watch(A, dt); if (A.away || dist(me().x, me().y, A.Y.cx, A.Y.cy) < N().awayM * UNITS_PER_M) return false; A.away = true; msCut('TOMORROW', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.Y.cx, A.Y.cy) / UNITS_PER_M) + ' / ' + N().awayM + ' M AWAY',
      jump(A) { if (P.car) exitCar(true); P.x = A.Y.cx + (N().awayM + 10) * UNITS_PER_M; P.y = A.Y.cy; } }];
  function fail(A) { return A.spotted ? MS.m.fails.spotted : ''; }
  const cuts = {
    'LIGHTS OUT': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.fay, line: [1, 2], enter: () => { face(A.fay, P); face(A.del, P); P.ang = Math.atan2(A.fay.y - P.y, A.fay.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: 3 }],
    'TOMORROW': A => [
      { dur: 6, cam: 'WIDE', at: () => at(A.Y.cx, A.Y.cy), line: [5, 6, 7], phone: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { SUBST.ms = null; } };
})();

/* ================= C8 - THE VAULT ================= */
MSCRIPT.c8 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.H = CASL.hideout(); A.H.S.ms = true; A.back = CASL.backDoor(); CASL.wear(A);   // MISSIONS TEST: in the guard's uniform from the start
    const S = A.H.S, v = A.H.inside; A.van = depotVan(v.x, v.y, S.a - Math.PI / 2); cars.push(A.van); A.list.push(A.van);
    const d = A.H.del; A.del = msPed(d.x, d.y, 0, Object.assign(S1.look('del'), { msName: 'del', step: S1.stay, spare: true }));
    const f = S1.free(A.H.door.x, A.H.door.y, 30); A.fay = msPed(f.x, f.y, 0, Object.assign(S1.look('fay'), { msName: 'fay', step: S1.stay, spare: true }));
    const q = ixWorld(S, -S.hw * 0.3, S.hd + 22); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.del, P); face(A.fay, P);
    SUBST.ms = { blowable: true, hold: true, dark: 9999 };                         // tonight's blast keeps the strip dark till the quest ends
    A.V = sbVault(); A.staff = at(A.V.door.x, A.V.door.y + 12);
    SB.ms = { for: 'vault', disguise: true, crackT: N().crackT, item: { fl: 3, room: 'THE VAULT', x: 520, label: 'TAKE THE MONEY', toast: 'THE BAGS - CRANE\'S MONEY' },
      guards: [sbGuard(1, 180, 960, 640, 1), sbGuard(2, 180, 960, 320, -1), sbGuard(3, 180, 760, 420, 1)],
      onCrack: () => msLive([7], { now: true }), onOpen: () => msLive([8], { now: true }) };
  }
  const inVan = A => P.car === A.van;
  function goDown(A) {                                                             // through the staff door: the side-on view, Fay with you
    const i = peds.indexOf(A.fay); if (i >= 0) peds.splice(i, 1); A.fayIn = true;
    if (P.car) exitCar(true); SB.ms.mate = { x: 40, fl: 0, face: 1 }; P.vx = P.vy = 0; openSide(A.V); SV.x = 140;
  }
  function comeOut(A) {                                                            // out of the count room: Fay beside you again, and the alarm
    if (!A.fayIn) return; A.fayIn = false; const q = S1.free(P.x, P.y, 20); A.fay.x = q.x; A.fay.y = q.y; if (!peds.includes(A.fay)) peds.push(A.fay);
    if (A.alarm) return; A.alarm = true;
    P.heat = Math.max(P.heat, COP.lv.heat[N().stars] + 1); updateStars(); msLive([9], { now: true });
    const c = casHall(); A.gold = [S1.road(c.x0 - 200, c.y1 + 260), S1.road(c.x1 + 260, c.y0 - 200)].map(r => { const k = kerbBy(r.x, r.y); return msFoeCar('sedan', k.x, k.y, k.ang, { crew: 2, gun: 'smg', group: 'gold', speed: 110, color: '#6b1426' }); });
  }
  const steps = [
    { enter(A) { MS.mark = () => A.del; MS.start = { at: () => A.del, label: 'START MISSION', go: () => { face(A.del, P); msCut('THE NIGHT', () => { A.go = true; }); } }; },   // TALK TO Del
      tick(A) { return !!A.go; } },
    { enter(A) { if (!A.fay.ally) msAllyFrom(A.fay, { who: 'fay', gun: 'pistol', hp: N().fayHp, fail: MS.m.fails.fayDead, stay: true }); MS.mark = () => A.van; },   // GET IN the van, Fay too
      tick(A) { return inVan(A) && A.fay.aboard === A.van; },
      info: A => !inVan(A) ? 'GET IN THE VAN' : 'WAIT FOR FAY',
      jump(A) { if (P.car) exitCar(true); P.x = A.van.x; P.y = A.van.y; enterCar(A.van); if (A.fay.aboard !== A.van) allyBoard(A.fay, A.van); } },
    { enter(A) { MS.guide = A.back; MS.mark = () => A.back; },                       // GO TO the back door
      tick(A) { if (!inVan(A) || dist(A.van.x, A.van.y, A.back.x, A.back.y) > N().backR || S1.kmh(A.van) > N().stopKmh) return false; msLive([4], { now: true }); return true; },
      info: A => inVan(A) ? Math.round(dist(me().x, me().y, A.back.x, A.back.y) / UNITS_PER_M) + ' M TO THE BACK DOOR' : 'GET BACK IN THE VAN',
      jump(A) { const v = A.van; if (P.car !== v) { if (P.car) exitCar(true); P.x = v.x; P.y = v.y; enterCar(v); } v.x = A.back.x; v.y = A.back.y; v.vx = v.vy = 0; } },
    { enter(A) { MS.mark = null; MS.guide = null; },                                // BLOW the substation
      tick(A) { if (A.blown) return true; if (!P.car && !MS.start) MS.start = { at: () => P, label: 'RADIO TRIGGER', go2: 'LIGHTS OUT', go: () => { A.blown = true; substBlow(9999); msLive([5, 6], { now: true }); } }; return false; },
      info: () => P.car ? 'GET OUT OF THE VAN' : 'THE BUTTON BY YOU',
      jump(A) { if (P.car) exitCar(true); A.blown = true; substBlow(9999); } },
    { enter(A) { MS.mark = () => A.staff; MS.guide = CASL.door(); },                 // to the STAFF DOOR, in the uniform
      tick(A) {
        if (SV.on && SV.h.id === 'vault') return true;
        const near = !P.car && dist(P.x, P.y, A.staff.x, A.staff.y) < N().doorR;
        if (near && !MS.start) MS.start = { at: () => A.staff, label: 'STAFF DOOR', go2: CASL.uniform() ? 'GO DOWN' : 'LOCKED - THE UNIFORM', go: () => { if (CASL.uniform()) goDown(A); else toast('STAFF ONLY - YOU NEED THE UNIFORM', true); } };
        if (!near && MS.start) MS.start = null;
        return false; },
      info: A => inCasino(P.x, P.y, 0) ? 'BEHIND THE CASHIER\'S CAGE' : 'INTO THE ROYAL FLAMINGO (THE FRONT DOOR)',
      jump(A) { if (P.car) exitCar(true); P.x = A.staff.x; P.y = A.staff.y; goDown(A); } },
    { enter(A) { MS.mark = null; MS.guide = null; },                                // DOWN to B3: Fay opens the vault
      tick() { return !!(SB.ms && SB.ms.cracked); },
      info: () => SV.on ? (SV.fl === 0 ? 'THE COUNT ROOM' : 'B' + SV.fl) + ' · THE VAULT IS ON B3' : 'BACK DOWN TO THE VAULT',
      jump() { if (!SV.on) return; SV.fl = 3; SV.x = 860; SB.ms.cracked = true; } },
    { tick() { return !!(SB.ms && SB.ms.item.got); },                                // TAKE the money
      jump() { SB.ms.item.got = true; } },
    { enter(A) { MS.mark = () => A.van; MS.guide = () => A.van; },                  // OUT to the van: the alarm
      tick(A) { if (SV.on) return false; comeOut(A); return inVan(A); },
      info: A => SV.on ? (SV.fl === 0 ? 'OUT ON THE LEFT' : 'UP THE STAIRS') : inVan(A) ? '' : Math.round(dist(P.x, P.y, A.van.x, A.van.y) / UNITS_PER_M) + ' M TO THE VAN',
      jump(A) { if (SV.on) closeSide(); comeOut(A); const v = A.van; P.x = v.x; P.y = v.y; enterCar(v); if (A.fay.aboard !== v) allyBoard(A.fay, v); } },
    { enter(A) { MS.guide = A.H.door; MS.mark = () => A.H.inside; },                // GETAWAY: lose them all, the lock-up
      tick(A) {
        const v = A.van; if (A.home || !inVan(A) || P.stars > 0 || !ixIn(A.H.S, v.x, v.y, 0) || S1.kmh(v) > N().stopKmh) return false;
        if ((A.gold || []).some(c => !c.dead && !c.fc.gone && dist(c.x, c.y, v.x, v.y) < N().goldR)) return false;
        A.home = true; msCut('THE TAKE', () => msNext()); return false; },
      info: A => !inVan(A) ? 'GET BACK IN THE VAN' : P.stars > 0 ? 'LOSE THE POLICE' : (A.gold || []).some(c => !c.dead && dist(c.x, c.y, A.van.x, A.van.y) < N().goldR) ? "LOSE GOLD'S MEN" : Math.round(dist(me().x, me().y, A.H.inside.x, A.H.inside.y) / UNITS_PER_M) + " M TO DEL'S LOCK-UP",
      jump(A) { const v = A.van; if (P.car !== v) { if (P.car) exitCar(true); P.x = v.x; P.y = v.y; enterCar(v); } P.stars = 0; P.heat = 0; resetPolice();
        for (const c of A.gold || []) { c.fc.crew = 0; c.fc.mode = 'park'; c.driver = null; c.msDrive = null; c.x += 3000; } for (const p of peds) if (p.foe && !p.dead && p.group === 'gold') killPed(p, 'gun', false);
        v.x = A.H.inside.x; v.y = A.H.inside.y; v.vx = v.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    const f = msCastFail(); if (f) return f;
    if (A.fay.dead) return F.fayDead;
    if (A.del.dead) return F.delDead;
    if (A.van.dead) return F.wrecked;
    if (SB.ms && SB.ms.spotted) return F.spotted;
    return '';
  }
  const cuts = {
    'THE NIGHT': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [1, 2], enter: () => { face(A.del, P); P.ang = Math.atan2(A.del.y - P.y, A.del.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: 3 }],
    'THE TAKE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [10, 11], enter: () => { if (P.car) exitCar(true); if (A.fay.aboard) allyAlight(A.fay); face(A.del, A.van); } },
      { dur: 5, cam: 'CLOSE', at: () => A.del, line: [12, 13], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { CASL.unwear(A); SB.ms = null; if (A.H) A.H.S.ms = false; SUBST.ms = null; if (SUBST.dark) SUBST.until = gameT; } };
})();
