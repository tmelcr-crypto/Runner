'use strict';
/* ---------- 8zzh. THE STORY, CHAPTER 2 - THE STREET (Bull Kessler, then Rosa Ortega): the scripts of M07-M12 ----------
   Each mission's words, lines and numbers are in the missions table (js/01x); the engine and chapter 1's helpers (STORY1) in js/08zy;
   the enemies and friends in js/08zz; BULL'S GYM in js/08zzg. */
const STORY2 = {
  shops(x, y, n) {                         // n street-front shops near a point whose fronts the camera sees, each at least 90 apart
    const out = [];
    const list = BLD.filter(r => r.fill && r.shop && !r.uniq && !r.special && !r.safe && !r.ix && !r.own && dist(r.cx, r.cy, x, y) < 1400)
      .map(r => ({ r, d: dist(r.cx, r.cy, x, y), f: adFront(r) })).filter(q => q.f && q.f.fy > 0.3).sort((p, q) => p.d - q.d);
    for (const q of list) {
      const f = q.f, s = { x: f.x + f.fx * 16, y: f.y + f.fy * 16, wx: f.x, wy: f.y, fx: f.fx, fy: f.fy, a: Math.atan2(f.fy, f.fx) };
      if (out.every(o => dist(o.x, o.y, s.x, s.y) > 90)) out.push(s); if (out.length >= n) break;
    }
    return out;
  },
  gym() {                                  // BULL'S GYM's spots: outside the door, Kessler behind his desk, the office's door, the ring
    const S = GYM.S, w = (x, z) => gymWorld(x, z), O = S.office;
    return { S, door: w(0, S.hd + 26), inside: w(0, S.hd - 40), kess: w(S.desk.kx, S.desk.z), front: w(S.desk.fx, S.desk.z), office: w(O.x1 + 18, (O.door[0] + O.door[1]) / 2), ring: w(S.ring.x, S.ring.z) };
  },
  hold(how) { if (GYM.S) { GYM.S.ms = how; if (how) for (let i = peds.length - 1; i >= 0; i--) if (peds[i].ring) peds.splice(i, 1); } },   // a quest holds the gym ('busy': boxers stay; true: empty)
  market() {                               // ROSA'S MARKET (the FARMERS MARKET, js/10p): its stalls' fronts, the aisle, the back, the street
    const q = PARKS_AT.find(o => o.row.name === 'FARMERS MARKET'); if (!q) return null;
    const ca = Math.cos(q.a), sa = Math.sin(q.a), w = (lx, lz) => ({ x: q.x + ca * lx - sa * lz, y: q.y + sa * lx + ca * lz });
    let last = -q.w / 2 + 16; while (last + 26 < q.w / 2 - 12) last += 26;
    const aisle = -q.h * 0.03;                                     // between the two rows: the second row's stalls face it
    return { q, c: w(0, 0), a: w(-q.w / 2 + 16, q.h * 0.15 - 16), b: w(last, q.h * 0.15 - 16), endA: w(-q.w / 2 - 6, aisle), endB: w(q.w / 2 + 6, aisle), aisle: w(0, aisle), back: w(q.w / 2 - 24, q.h * 0.36), street: STORY1.road(q.x, q.y) };
  },
  shards(x, y) {                           // a window bursting: glass everywhere
    for (let i = 0; i < 26; i++) { const a = rand(0, TAU), s = rand(30, 150); addP({ x, y, z: rand(6, 22), vz: rand(20, 90), grav: 380, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.8, 1.8), max: 1.8, s0: rand(1.4, 2.6), s1: 1, col: pick(['#cfefff', '#9fd4ee', '#e8f8ff']), drag: 1.6, hold: true }); }
    Snd.smash('booth', clamp(1 - dist(x, y, P.x, P.y) / 600, 0.3, 1));
  }
};

/* ================= M07 - BULL'S OFFER ================= */
MSCRIPT.m07 = (() => {
  const S1 = STORY1, S2 = STORY2, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; S2.hold('busy');
    const C = S1.colony(); P.x = C.door.x; P.y = C.door.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: out of the Colony's door
    A.mycar = msCar('estate', C.cab.x, C.cab.y, C.cab.a, '#3d6fa8');
    const kp = S1.free(C.door.x, C.door.y, 46); A.man = msPed(kp.x, kp.y, 0, Object.assign(S1.look('bull'), { msName: 'bull', step: S1.stay })); face(A.man, P);
    A.g = S2.gym();
    A.kess = msPed(A.g.kess.x, A.g.kess.y, 0, Object.assign(S1.look('kessler'), { msName: 'kessler', step: S1.stay, spare: true, shield: true })); A.kess.hp = N().kessHp; face(A.kess, A.g.front);
    const sh = S2.shops(4700, 10760, 3); A.shops = sh;
    A.keep = sh.map((s, i) => msPed(s.x, s.y, s.a, Object.assign(i === 2 ? S1.look('gus') : { shirt: pick(['#e8e2d6', '#7aa8d8', '#d8c07a']), pants: '#3a3a44' }, { msName: i === 2 ? 'gus' : undefined, step: S1.stay, spare: true })));
    A.gus = A.keep[2]; A.signM = sh[2] ? S1.sign('DELGADO HARDWARE', '#ffd23f', sh[2]) : null;
    A.window = sh[2] ? at(sh[2].wx + sh[2].fx * 10 - sh[2].fy * 22, sh[2].wy + sh[2].fy * 10 + sh[2].fx * 22) : null;   // beside the door
  }
  const take = (A, i, amt) => { Snd.pickup(); popup(P.x, P.y - 14, "KESSLER'S RENT " + money(amt), '#ffd23f'); A.got = (A.got || 0) + 1; };
  const collect = i => ({                                                          // COLLECT the rent: stop by the shopkeeper on foot
    enter(A) { MS.mark = () => A.keep[i]; MS.guide = () => A.shops[i]; },
    tick(A) { if (P.car || dist(P.x, P.y, A.keep[i].x, A.keep[i].y) > N().shopR) return false; face(A.keep[i], P); take(A, i, N().rent); return true; },
    info: A => Math.round(dist(me().x, me().y, A.shops[i].x, A.shops[i].y) / UNITS_PER_M) + ' M TO THE SHOP',
    jump(A) { if (P.car) exitCar(true); P.x = A.shops[i].x + A.shops[i].fx * 20; P.y = A.shops[i].y + A.shops[i].fy * 20; take(A, i, N().rent); } });
  const steps = [
    { enter(A) { MS.mark = () => A.man; MS.start = { at: () => A.man, label: 'START MISSION', go: () => { face(A.man, P); msCut('A WORD', () => { A.go = true; }); } }; },   // TALK TO Kessler's man
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.g.door; MS.mark = () => A.kess; },                    // GO TO the gym, into Kessler's office: his offer
      tick(A) {
        if (P.car || dist(P.x, P.y, A.kess.x, A.kess.y) > N().gymR || A.cut2) return false;
        A.cut2 = true; msCut("BULL'S OFFER", () => { popup(P.x, P.y - 14, 'BRICK PHONE', '#b6ff3c'); msNext(); }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.kess.x, A.kess.y) / UNITS_PER_M) + " M TO KESSLER'S OFFICE",
      jump(A) { if (P.car) exitCar(true); P.x = A.g.front.x; P.y = A.g.front.y; } },
    collect(0), collect(1),
    { enter(A) { MS.mark = () => A.gus; MS.guide = () => A.shops[2]; },              // COLLECT at Delgado Hardware: Gus says no
      tick(A) { if (A.cut5 || P.car || dist(P.x, P.y, A.gus.x, A.gus.y) > N().shopR * 1.4) return false; A.cut5 = true; msCut('DELGADO HARDWARE', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.shops[2].x, A.shops[2].y) / UNITS_PER_M) + ' M TO DELGADO HARDWARE',
      jump(A) { if (P.car) exitCar(true); P.x = A.shops[2].x + A.shops[2].fx * 30; P.y = A.shops[2].y + A.shops[2].fy * 30; } },
    { enter(A) {                                                                     // SMASH the window: Gus pays
        MS.mark = () => A.window; MS.guide = null;
        MS.start = { at: () => A.window, label: 'SMASH THE WINDOW', go: () => { S2.shards(A.window.x, A.window.y); cam.shake = Math.max(cam.shake, 4); A.smashed = true; face(A.gus, P); msLive([13, 14], { now: true }); take(A, 2, N().gusRent); } }; },
      tick(A) { return !!A.smashed; },
      jump(A) { A.smashed = true; } },
    { enter(A) { MS.guide = A.g.door; MS.mark = () => A.kess; },                    // DELIVER the rent to Kessler: the closing
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.kess.x, A.kess.y) > N().kessR) return false; A.home = true; msCut('RENT DAY', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.kess.x, A.kess.y) / UNITS_PER_M) + ' M TO KESSLER',
      jump(A) { if (P.car) exitCar(true); P.x = A.g.front.x; P.y = A.g.front.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.kess.dead) return F.kesslerDead;
    if (A.gus && A.gus.dead) return F.gusDead;
    if (A.keep.some(p => p !== A.gus && p.dead)) return F.shopDead;
    return '';
  }
  const cuts = {
    'A WORD': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.man, line: [1, 2], enter: () => { face(A.man, P); P.ang = Math.atan2(A.man.y - P.y, A.man.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => A.man, line: 3 }],
    "BULL'S OFFER": A => [
      { dur: 5, cam: 'CLOSE', at: () => A.kess, line: [4, 5], enter: () => { P.x = A.g.front.x; P.y = A.g.front.y; P.vx = P.vy = 0; face(A.kess, P); P.ang = Math.atan2(A.kess.y - P.y, A.kess.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.kess, line: [6, 7] },
      { dur: 5, cam: 'WIDE', at: () => at((A.kess.x + A.g.ring.x) / 2, (A.kess.y + A.g.ring.y) / 2), line: [8, 9] }],
    'DELGADO HARDWARE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.gus, line: [10, 11], enter: () => { const s = A.shops[2]; P.x = s.x + s.fx * 26; P.y = s.y + s.fy * 26; P.vx = P.vy = 0; face(A.gus, P); P.ang = Math.atan2(A.gus.y - P.y, A.gus.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => A.gus, line: 12 }],
    'RENT DAY': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.kess, line: [15, 16], enter: () => { P.x = A.g.front.x; P.y = A.g.front.y; P.vx = P.vy = 0; face(A.kess, P); P.ang = Math.atan2(A.kess.y - P.y, A.kess.x - P.x); } },
      { dur: 4, cam: 'WIDE', at: () => A.g.inside, line: 17 }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A.signM) scene.remove(A.signM); S2.hold(false); } };
})();

/* ================= M08 - VALET PARKING ================= */
MSCRIPT.m08 = (() => {
  const S1 = STORY1, S2 = STORY2, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.g = S2.gym();
    P.x = A.g.door.x; P.y = A.g.door.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by Bull's Gym at night, a car at the kerb
    const k0 = kerbBy(P.x + 40, P.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const d = CASM.door, r = S1.road(d[0] + 90, d[1]), k = kerbBy(r.x, r.y); A.bay = at(k.x, k.y); A.bayA = k.ang;   // the valet bay: the kerb by the Royal Flamingo's door
    for (let i = cars.length - 1; i >= 0; i--) if (P.car !== cars[i] && dist(cars[i].x, cars[i].y, k.x, k.y) < 70) cars.splice(i, 1);
    A.car = msCar('sedan', k.x, k.y, k.ang, '#15161c'); A.car.free = true;      // Crane's town car: the valet is paid, no crime
    const vp = S1.sidewalk(k.x, k.y); A.valet = msPed(vp.x, vp.y, 0, { valet: true, shirt: '#b3122a', pants: '#1a1a20', step: S1.stay, spare: true });
    const [x0, y0, x1, y1] = SALV.area; A.junk = at((x0 + x1) / 2, (y0 + y1) / 2);   // Kessler's chop shop: the junkyard, his man waiting
    A.man = msPed(A.junk.x + 30, A.junk.y + 20, 0, Object.assign(S1.look('bull'), { msName: 'bull', step: S1.stay, spare: true }));
  }
  const inCar = A => P.car === A.car;
  const steps = [
    msPhone('kessler', [1, 2, 3]),                                                // the call
    { enter(A) { MS.guide = A.bay; MS.mark = () => A.car; },                       // GO TO the valet bay
      tick(A) { return dist(me().x, me().y, A.car.x, A.car.y) < N().carR * 2; },
      info: A => Math.round(dist(me().x, me().y, A.bay.x, A.bay.y) / UNITS_PER_M) + ' M TO THE ROYAL FLAMINGO',
      jump(A) { if (P.car) exitCar(true); const v = S1.sidewalk(A.car.x, A.car.y); P.x = v.x + 20; P.y = v.y; } },
    { enter(A) { MS.mark = () => A.car; MS.guide = null; },                         // GET IN the town car
      tick(A) { if (!inCar(A)) return false; face(A.valet, A.car); popup(A.valet.x, A.valet.y - 14, 'THE VALET LOOKS AT HIS SHOES', '#cfd3dc'); return true; },
      jump(A) { if (P.car) exitCar(true); P.x = A.car.x; P.y = A.car.y; enterCar(A.car); } },
    { enter(A) { MS.guide = A.junk; MS.mark = () => A.junk; },                      // DELIVER it to the chop shop: the glovebox
      tick(A) {
        if (A.cut4 || !inCar(A) || !jyIn(A.car.x, A.car.y) || S1.kmh(A.car) > N().stopKmh) return false;
        A.cut4 = true; msCut('THE GLOVEBOX', () => { popup(P.x, P.y - 14, "MATEO'S CAP", '#b6ff3c'); msNext(); }); return false; },
      info: A => inCar(A) ? Math.round(dist(me().x, me().y, A.junk.x, A.junk.y) / UNITS_PER_M) + ' M TO THE JUNKYARD' : 'GET BACK IN THE CAR',
      jump(A) { const c = A.car; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } c.x = A.junk.x; c.y = A.junk.y; c.vx = c.vy = 0; } },
    { enter(A) { MS.guide = A.bay; MS.mark = () => inCar(A) ? A.bay : A.car; A.t5 = gameT; A.hp5 = A.car.hp; },   // DELIVER it back, in time, in one piece
      tick(A) {
        MS.mark = inCar(A) ? () => A.bay : () => A.car;
        if (A.home || !inCar(A) || dist(A.car.x, A.car.y, A.bay.x, A.bay.y) > N().bayR || S1.kmh(A.car) > N().stopKmh) return false;
        A.home = true; msCut('THE CAP', () => msNext()); return false; },
      info: A => Math.max(0, Math.ceil(N().backT - (gameT - A.t5))) + ' S LEFT · ' + Math.round(dist(me().x, me().y, A.bay.x, A.bay.y) / UNITS_PER_M) + ' M',
      jump(A) { const c = A.car; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } c.x = A.bay.x; c.y = A.bay.y; c.ang = A.bayA; c.vx = c.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.car.dead || A.car.burn > 0) return F.car;
    if (MS.k === 4 && !A.home && A.car.hp < A.hp5 - (1 - N().dent) * A.car.maxhp) return F.dent;
    if (MS.k === 4 && !A.home && gameT - A.t5 > N().backT) return F.late;
    return '';
  }
  const cuts = {
    'THE GLOVEBOX': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.man, line: [4, 5], enter: () => { const c = A.car; c.vx = c.vy = 0; if (P.car) exitCar(true); const q = S1.free(c.x, c.y, 34); P.x = q.x; P.y = q.y; A.man.x = c.x + 26; A.man.y = c.y - 14; A.man.post.x = A.man.x; A.man.post.y = A.man.y; face(A.man, P); P.ang = Math.atan2(A.man.y - P.y, A.man.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => A.man, line: 6 },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [7, 8], phone: true }],
    'THE CAP': A => [
      { dur: 5, cam: 'CLOSE', at: () => P, line: 9, enter: () => { const c = A.car; c.vx = c.vy = 0; if (P.car) exitCar(true); } },
      { dur: 5, cam: 'WIDE', at: () => at(CASM.door[0], CASM.door[1]), line: 10, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { } };
})();

/* ================= M09 - MARKET FIRE ================= */
MSCRIPT.m09 = (() => {
  const S1 = STORY1, S2 = STORY2, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.g = S2.gym(); A.mk = S2.market();
    P.x = A.g.door.x; P.y = A.g.door.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by Bull's Gym at night, Kessler's two men by a car
    const k0 = kerbBy(P.x + 40, P.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    A.men = [-1, 1].map(s => { const q = S1.free(A.g.door.x + s * 26, A.g.door.y + 30, 10); return msPed(q.x, q.y, 0, Object.assign(S1.look('bull'), { msName: 'bull', step: S1.stay, spare: true })); });
    A.boy = msPed(A.mk.aisle.x, A.mk.aisle.y, 0, { shirt: '#3dbf6a', pants: '#2a3a6a', step: S1.stay, spare: true });
    A.rosa = msPed(A.mk.back.x, A.mk.back.y, 0, Object.assign(S1.look('rosa'), { msName: 'rosa', step: S1.stay, spare: true, shield: true }));
  }
  const aboard = A => !!P.car && A.men.every(m => m.aboard === P.car);
  function pourStep(p, dt) {                                                       // to his stall, then pouring - 6 seconds and it goes up
    if (p.state === 'flee') p.state = 'post';
    const t = p.way[0]; if (castWalk(p, t.x, t.y, NPC_RUN * 0.95, dt) > 16) return true;   // round to the end of the aisle, then along it
    if (p.way.length > 1) { p.way.shift(); return true; }
    p.vx = p.vy = 0; const was = Math.floor(p.pourT || 0); p.pourT = (p.pourT || 0) + dt;
    if (Math.floor(p.pourT) !== was) pops.push({ x: p.x, y: p.y - 16, txt: 'POURING ' + Math.min(N().pourT, Math.ceil(p.pourT)) + '/' + N().pourT, col: '#ff7a1a', life: 0.9 });
    return true;
  }
  function turn(A) {                                                               // they turn on the stalls: enemies now, a can each, a stall each
    if (A.turned) return; A.turned = true;
    A.men.forEach((m, i) => { if (m.aboard) allyAlight(m); MS_CAST.allies = MS_CAST.allies.filter(q => q !== m);
      Object.assign(m, { ally: false, foe: true, crim: true, calm: false, arm: -1, hp: N().menHp, pourT: 0, stall: i ? A.mk.b : A.mk.a }); m.way = dist(m.x, m.y, A.mk.aisle.x, A.mk.aisle.y) < 70 ? [m.stall] : [i ? A.mk.endB : A.mk.endA, m.stall]; m.post.step = pourStep; m.state = 'post'; });
    msLive([8], { now: true });
  }
  const steps = [
    msPhone('kessler', [1, 2, 3]),                                                // the call
    { enter(A) { A.men.forEach(m => { if (!m.ally) msAllyFrom(m, { who: 'bull', calm: true, hp: 300, fail: MS.m.fails.wasted }); }); MS.mark = () => P.car ? A.men.find(m => m.aboard !== P.car) : A.mycar; },   // GET IN with the two men
      tick(A) { MS.mark = P.car ? () => A.men.find(m => m.aboard !== P.car) || A.men[0] : () => A.mycar; return aboard(A); },
      info: A => P.car ? A.men.filter(m => m.aboard === P.car).length + '/2 IN' : 'GET IN A CAR',
      jump(A) { const c = A.mycar; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } A.men.forEach(m => { if (!m.ally) msAllyFrom(m, { who: 'bull', calm: true, hp: 300 }); if (m.aboard !== c) allyBoard(m, c); }); } },
    { enter(A) { MS.guide = A.mk.street; MS.mark = () => A.mk.c; },              // GO TO the market: the boy
      tick(A) {
        if (A.cut3 || dist(me().x, me().y, A.mk.c.x, A.mk.c.y) > N().marketR) return false;
        A.cut3 = true; msCut('THE BOY', () => msNext()); return false; },
      info: A => aboard(A) ? Math.round(dist(me().x, me().y, A.mk.c.x, A.mk.c.y) / UNITS_PER_M) + " M TO ROSA'S MARKET" : 'PICK THEM UP',
      jump(A) { const c = P.car || A.mycar; c.x = A.mk.street.x; c.y = A.mk.street.y; c.vx = c.vy = 0; } },
    { enter(A) { turn(A); MS.mark = () => A.men.filter(m => !m.dead)[0]; MS.guide = null; },   // TAKE OUT both before a stall goes up
      tick(A) { return A.men.every(m => m.dead); },
      info: A => A.men.filter(m => !m.dead).map(m => (m.pourT ? Math.max(0, Math.ceil(N().pourT - m.pourT)) + ' S' : 'RUNNING')).join(' · ') || 'DONE',
      jump(A) { turn(A); for (const m of A.men) if (!m.dead) killPed(m, 'gun', true); } },
    { enter(A) { MS.mark = () => A.rosa; MS.guide = null; face(A.rosa, P); },       // TALK TO Rosa: the closing
      tick(A) {
        if (A.done) return !MS_LIVE.cur && !MS_LIVE.q.length;                         // Kessler's call over: passed
        if (A.home || P.car || dist(P.x, P.y, A.rosa.x, A.rosa.y) > N().rosaR) return false; A.home = true; msCut('ROSA', () => { msLive([13], { phone: true }); A.done = true; }); return false; },
      jump(A) { if (P.car) exitCar(true); const q = S1.free(A.rosa.x, A.rosa.y, 30); P.x = q.x; P.y = q.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.boy.dead) return F.boyDead;
    if (A.rosa.dead) return F.rosaDead;
    if (A.men.some(m => !m.dead && m.pourT >= N().pourT)) return F.fire;
    return '';
  }
  const cuts = {
    'THE BOY': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.boy, line: [4, 5], enter: () => {
          const c = P.car; if (c) { c.vx = c.vy = 0; exitCar(true); } A.men.forEach(m => { if (m.aboard) allyAlight(m); });
          A.men[0].x = A.boy.x - 16; A.men[0].y = A.boy.y; A.men[1].x = A.boy.x + 14; A.men[1].y = A.boy.y + 8; A.men.forEach(m => face(m, A.boy));
          const q = S1.free(A.boy.x, A.boy.y, 60); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; face(A.boy, A.men[0]); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [6, 7], enter: () => { P.ang = Math.atan2(A.men[0].y - P.y, A.men[0].x - P.x); A.men.forEach(m => face(m, P)); } }],
    'ROSA': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: [9, 10], enter: () => { face(A.rosa, P); P.ang = Math.atan2(A.rosa.y - P.y, A.rosa.x - P.x); const q = S1.free(A.rosa.x, A.rosa.y, 22); A.boy.x = q.x; A.boy.y = q.y; } },
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: [11, 12], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { } };
})();

/* ================= M10 - THE PRODUCE RUN ================= */
MSCRIPT.m10 = (() => {
  const S1 = STORY1, S2 = STORY2, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; A.mk = S2.market();
    A.rosa = msPed(A.mk.back.x, A.mk.back.y, 0, Object.assign(S1.look('rosa'), { msName: 'rosa', step: S1.stay, spare: true, shield: true }));
    const q = S1.free(A.rosa.x, A.rosa.y, 50); P.x = q.x; P.y = q.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; face(A.rosa, P);   // MISSIONS TEST: in the market, a car at the kerb
    const k0 = kerbBy(A.mk.street.x, A.mk.street.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const cs = IXS.find(S => S.name === 'HARBOR COLD STORE') || IXS[0], r = S1.road(cs.dx, cs.dy + 60), k = kerbBy(r.x, r.y);   // the truck by the cold store's door
    for (let i = cars.length - 1; i >= 0; i--) if (P.car !== cars[i] && dist(cars[i].x, cars[i].y, k.x, k.y) < 90) cars.splice(i, 1);
    A.store = at(cs.dx, cs.dy); A.truck = msCar('produce', k.x, k.y, k.ang, '#2f8f4f'); A.truck.free = true; A.truck.crates = 8;
  }
  const left = A => A.truck.crates === undefined ? 8 : A.truck.crates, inTruck = A => P.car === A.truck;
  function chasers(A, n, ahead) {                                                  // Kessler's cars: from behind you (or ahead, coming at you)
    const c = A.truck, ca = Math.cos(c.ang), sa = Math.sin(c.ang), out = [];
    for (let i = 0; i < n; i++) { const d = ahead ? 900 + i * 120 : -(520 + i * 140), r = S1.road(c.x + ca * d + (i ? -sa : sa) * 60, c.y + sa * d + (i ? ca : -ca) * 60);
      out.push(msFoeCar('muscle', r.x, r.y, ahead ? r.a + Math.PI : r.a, { crew: 2, gun: 'bat', group: 'kess', speed: N().kessSpeed, shirt: '#f0f0ea', pants: '#3a4a6a' })); }
    return out;
  }
  const steps = [
    { enter(A) { MS.mark = () => A.rosa; MS.start = { at: () => A.rosa, label: 'START MISSION', go: () => { face(A.rosa, P); msCut('THE TEST', () => { A.go = true; }); } }; },   // TALK TO Rosa
      tick(A) { return !!A.go; } },
    { enter(A) { MS.guide = A.truck; MS.mark = () => A.truck; },                     // GO TO the cold store
      tick(A) { return dist(me().x, me().y, A.truck.x, A.truck.y) < N().truckR * 2; },
      info: A => Math.round(dist(me().x, me().y, A.truck.x, A.truck.y) / UNITS_PER_M) + ' M TO THE COLD STORE',
      jump(A) { if (P.car) exitCar(true); const v = S1.sidewalk(A.truck.x, A.truck.y); P.x = v.x; P.y = v.y; } },
    { enter(A) { MS.mark = () => A.truck; MS.guide = null; },                         // GET IN the truck: Kessler's cars come
      tick(A) { if (!inTruck(A)) return false; A.kc = chasers(A, 2, false); msLive([5], { now: true }); return true; },
      jump(A) { if (P.car) exitCar(true); P.x = A.truck.x; P.y = A.truck.y; enterCar(A.truck); if (!A.kc) A.kc = chasers(A, 2, false); } },
    { enter(A) { MS.guide = A.mk.street; MS.mark = () => inTruck(A) ? A.mk.c : A.truck; A.t4 = gameT; },   // DELIVER the truck: the closing
      tick(A) {
        MS.mark = inTruck(A) ? () => A.mk.c : () => A.truck;
        if (!A.wave2 && gameT - A.t4 > N().wave2) { A.wave2 = true; A.kc = A.kc.concat(chasers(A, 1, true)); msLive([6]); }
        if (A.home || !inTruck(A) || dist(A.truck.x, A.truck.y, A.mk.street.x, A.mk.street.y) > N().marketR || S1.kmh(A.truck) > N().stopKmh) return false;
        A.home = true; msCut('FRESH', () => msNext()); return false; },
      info: A => 'CRATES ' + left(A) + '/8 · ' + (inTruck(A) ? Math.round(dist(me().x, me().y, A.mk.street.x, A.mk.street.y) / UNITS_PER_M) + ' M' : 'GET IN THE TRUCK'),
      jump(A) { const c = A.truck; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } c.x = A.mk.street.x; c.y = A.mk.street.y; c.vx = c.vy = 0;
        for (const k of A.kc || []) if (cars.includes(k) && !k.dead) cars.splice(cars.indexOf(k), 1); } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.rosa.dead) return F.rosaDead;
    if (A.truck.dead || A.truck.burn > 0) return F.truck;
    if (left(A) < N().minCrates) return F.crates;
    return '';
  }
  const cuts = {
    'THE TEST': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: [1, 2], enter: () => { face(A.rosa, P); P.ang = Math.atan2(A.rosa.y - P.y, A.rosa.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: [3, 4] }],
    'FRESH': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: [7, 8], enter: () => { const c = A.truck; c.vx = c.vy = 0; if (P.car) exitCar(true); for (const k of A.kc || []) if (cars.includes(k) && P.car !== k) cars.splice(cars.indexOf(k), 1);
          for (let i = peds.length - 1; i >= 0; i--) if (peds[i].foe && !peds[i].dead) peds.splice(i, 1);
          const q = S1.free(c.x, c.y, 40); A.rosa.x = q.x; A.rosa.y = q.y; A.rosa.post.x = q.x; A.rosa.post.y = q.y; face(A.rosa, P); P.ang = Math.atan2(A.rosa.y - P.y, A.rosa.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => A.rosa, line: 9, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { } };
})();
