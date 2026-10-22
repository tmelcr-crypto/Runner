'use strict';
/* ---------- 8zzk. THE STORY, CHAPTER 3 - THE TRAIL (Nina Park): the scripts of M13-M18 ----------
   Each mission's words, lines and numbers are in the missions table (js/01x); the engine and chapter 1's helpers (STORY1) in js/08zy;
   the enemies and friends in js/08zz; BAY TV's newsroom in js/10zf; the story's choices as MISSIONS TEST plays them: MS_CHOICE (js/08zy). */
const STORY3 = {
  nina(A) {                                // Nina at her desk in the newsroom (held by the quest: the door open)
    NEWS.ms = true; const S = NEWS.S, n = S.ninaAt;
    A.nina = msPed(n.x, n.y, 0, Object.assign(STORY1.look('nina'), { msName: 'nina', step: STORY1.stay, spare: true, shield: true })); STORY1.face(A.nina, newsWorld(S.nina.x - 40, S.nina.z));
    return A.nina;
  },
  meet(cut) {                              // the TALK TO step at Nina's desk
    return { enter(A) { MS.mark = () => A.nina; MS.guide = NEWS.S.door; MS.start = { at: () => A.nina, label: 'START MISSION', go: () => { STORY1.face(A.nina, P); msCut(cut, () => { A.go = true; }); } }; },
      tick: A => !!A.go };
  },
  kessler: () => MS_CHOICE.kessler          // Choice 1 as this game has it: 'finished' or 'spared'
};

/* ================= M13 - BREAKING NEWS ================= */
MSCRIPT.m13 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.door.x + 40; P.y = S.door.y + 40; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;      // MISSIONS TEST: by the TV tower, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const r = S1.road(S.cx + 500, S.cy + 300), k = kerbBy(r.x, r.y);                          // the stolen van, a few blocks off, and where it runs to
    A.route = [S1.road(S.cx + 1400, S.cy + 900), S1.road(S.cx + 2400, S.cy + 600), S1.road(S.cx + 3200, S.cy + 1600)];
    A.van = msFoeCar('newsvan', k.x, k.y, k.ang, { mode: 'park', crew: 2, gun: 'pistol', group: 'crane', speed: N().vanSpeed, to: A.route, color: '#f4f6fa', crewHp: N().menHp, shirt: '#3a3f4c', pants: '#2a2d36' });
  }
  const steps = [
    msPhone('nina', [1, 2, 3]),                                                     // the call
    { enter(A) { MS.mark = () => A.van; MS.guide = () => A.van; if (A.van.fc.mode === 'park') { A.van.fc.wait = 0.5; foeCarGo(A.van, 'flee'); msLive([4]); } },   // CHASE the van
      tick(A) { const v = A.van; if (!v.fc.out && !v.dead && v.hp < v.maxhp * 0.45) foeBail(v); if (!v.fc.out && !v.dead) return false; msLive([5], { now: true }); return true; },
      info: A => Math.round(dist(me().x, me().y, A.van.x, A.van.y) / UNITS_PER_M) + ' M TO THE VAN (GONE AT ' + N().away + ') · ' + Math.round(100 * A.van.hp / A.van.maxhp) + '%',
      jump(A) { const v = A.van; if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; foeBail(v); } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'crane'); },   // TAKE OUT Crane's men
      tick() { return msFoesLeft('crane') === 0; },
      info: () => msFoesLeft('crane') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'crane') killPed(p, 'gun', false); } },
    { enter(A) { if (!A.bag) A.bag = S1.dryNear(A.van.x - Math.cos(A.van.ang) * 30, A.van.y - Math.sin(A.van.ang) * 30); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); },   // COLLECT the tapes
      tick(A) { if (A.got) return true; if (P.car || !A.bag || dist(P.x, P.y, A.bag.x, A.bag.y) > N().bagR) return false; A.got = true; A.bag = null; Snd.pickup(); popup(P.x, P.y - 14, "NINA'S TAPES", '#b6ff3c'); return true; },
      jump(A) { A.got = true; A.bag = null; } },
    { enter(A) { MS.guide = NEWS.S.door; MS.mark = () => A.nina; },                 // DELIVER the tapes to Nina: the closing
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.nina.x, A.nina.y) > N().ninaR) return false; A.home = true; msCut('THE PHOTO', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.nina.x, A.nina.y) / UNITS_PER_M) + ' M TO NINA',
      jump(A) { if (P.car) exitCar(true); const n = NEWS.S.ninaAt; P.x = n.x - 22; P.y = n.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina.dead) return F.ninaDead;
    if (MS.k === 1 && !A.van.fc.out && (A.van.fc.gone || dist(me().x, me().y, A.van.x, A.van.y) > N().away * UNITS_PER_M)) return F.away;
    return '';
  }
  const cuts = {
    'THE PHOTO': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [6, 7], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [8, 9], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();

/* ================= M14 - FOLLOW THE MONEY ================= */
MSCRIPT.m14 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const bank = () => BLD.find(r => r.uniq === 'first_coral_bank'), loft = () => SAFES.find(s => s.id === 'loft');
  const gasNorth = () => MAP.props.filter(p => p.t === 'gas').reduce((b, p) => (!b || p.y < b.y ? p : b), null);   // the gas station up north
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;        // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const b = bank(), rb = S1.road(b.cx, b.cy), kb = kerbBy(rb.x, rb.y);                      // the courier's car at the bank's kerb
    for (let i = cars.length - 1; i >= 0; i--) if (P.car !== cars[i] && dist(cars[i].x, cars[i].y, kb.x, kb.y) < 90) cars.splice(i, 1);
    A.car = msFoeCar('sedan', kb.x, kb.y, kb.ang, { mode: 'park', crew: 1, gun: null, group: 'courier', speed: N().carSpeed, color: '#2a2d36' });
    A.bankOut = S1.free(kb.x, kb.y, 34); A.wait = at(kb.x, kb.y);
    const g = gasNorth(), L = loft();
    A.gas = S1.road(g.x, g.y); A.home = S1.road(L.door.x + L.door.fx * 40, L.door.y + L.door.fy * 40);
    A.route1 = [S1.road(b.cx - 400, b.cy - 2600), S1.road(b.cx + 500, b.cy - 6600), A.gas];
    A.sus = 0;
  }
  function courierOut(A, from, to, then) {  // the courier walks from a car (or the bank) to a car (or the door)
    const p = A.walker = msPed(from.x, from.y, 0, { msName: 'courier', shirt: '#2a2d36', pants: '#2a2d36', step: S1.runStep(N().walk), spare: true });
    p.route = [to.t ? allyDoor(to, p) : to]; p.ri = 0; A.walkThen = then;                           // to a car: its door
  }
  function walkTick(A) { const p = A.walker; if (!p || p.ri < 1) return; const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); A.walker = null; const f = A.walkThen; A.walkThen = null; if (f) f(); }
  function drive(c, to) { c.fc.to = to; c.fc.ti = 0; c.fc.field = null; c.fc.gone = false; c.fc.wait = 0.6; foeCarGo(c, 'flee'); }
  function suspicion(A, dt) {               // close behind for long, or in his mirrors: it rises; back off and it falls
    const t = A.walker || A.car, o = me(), d = dist(o.x, o.y, t.x, t.y) / M;
    const rear = !A.walker && Math.abs(angDiff(t.ang + Math.PI, Math.atan2(o.y - t.y, o.x - t.x))) < N().mirrorCone * Math.PI / 180;
    const k = d < N().closeM ? N().closeRate : rear && d < N().mirrorM ? N().mirrorRate : -N().coolRate;
    A.sus = clamp(A.sus + k * dt, 0, 1); msBar('SUSPICION', A.sus); return d;
  }
  const steps = [
    S3.meet('THE COURIER'),
    { enter(A) { MS.guide = A.wait; MS.mark = () => A.wait; },                                  // GO TO the bank, in a car
      tick(A) { return !!P.car && dist(P.x, P.y, A.wait.x, A.wait.y) < N().waitM * M; },
      info: A => Math.round(dist(me().x, me().y, A.wait.x, A.wait.y) / M) + ' M TO THE BANK',
      jump(A) { const c = A.mycar, r = S1.road(A.wait.x + 500, A.wait.y + 300); if (P.car) exitCar(true); c.x = r.x; c.y = r.y; c.ang = r.a; c.vx = c.vy = 0; P.x = c.x; P.y = c.y; enterCar(c); } },
    { enter(A) {                                                                                 // FOLLOW the courier to Sachs' office
        MS.guide = null; MS.mark = () => A.walker || A.car; A.t = 0;
        courierOut(A, A.bankOut, A.car, () => drive(A.car, A.route1));
      },
      tick(A, dt) {
        walkTick(A); A.t += dt; A.d = suspicion(A, dt); const c = A.car;
        if (S3.kessler() === 'spared' && !A.tip && A.t > N().tipT) { A.tip = true; msLive([6, 7], { phone: true }); }
        if (S3.kessler() === 'finished' && !A.gang && A.t > N().gangT) {                        // Kessler's gang wants payback: two cars come up behind you
          const o = me(), ang = P.car ? P.car.ang : P.ang || 0;
          A.gang = [-1, 1].map(s => { const r = S1.road(o.x - Math.cos(ang) * 700 + Math.sin(ang) * s * 200, o.y - Math.sin(ang) * 700 - Math.cos(ang) * s * 200);
            return msFoeCar('muscle', r.x, r.y, r.a, { crew: 2, gun: 'pistol', group: 'kess', speed: N().gangSpeed, shirt: '#f0f0ea', pants: '#3a4a6a' }); });
          msLive([5], { now: true });
        }
        c.fc.speed = A.gang && msFoesLeft('kess') > 0 ? N().slowSpeed : N().carSpeed;          // the courier caught in traffic while they are at you
        if (c.fc.gone && !A.walker && !A.at) {
          if (!A.stop) A.stop = gameT + N().gasStop;
          else if (gameT > A.stop) {
            if (!A.left) { A.left = true;                                                         // at the gas station: fill up and go on - or, if Kessler's tip was true, change cars
              if (S3.kessler() === 'spared') {
                const k = kerbBy(A.gas.x + Math.cos(A.gas.a) * 70, A.gas.y + Math.sin(A.gas.a) * 70), n = msFoeCar('sedan', k.x, k.y, k.ang, { mode: 'park', crew: 1, gun: null, group: 'courier', speed: N().carSpeed, color: '#f4f6fa' });
                const old = c; old.fc.crew = 0; A.car = n; A.decoy = old; courierOut(A, S1.free(old.x, old.y, 24), n, () => { drive(n, [A.home]); A.at = 'home'; });
                const r = S1.road(old.x + 2600, old.y + 1400); old.fc.crew = 1; drive(old, [r]);
              } else { drive(c, [A.home]); A.at = 'home'; }
            }
          }
        }
        if (A.at === 'home' && A.car.fc.gone && !A.walker && !A.done) {                         // at Sachs' office: out with the case, Sachs at the door
          A.done = true; const L = loft(), dr = at(L.door.x + L.door.fx * 14, L.door.y + L.door.fy * 14);
          A.sachs = msPed(dr.x, dr.y, 0, Object.assign(S1.look('sachs'), { msName: 'sachs', step: S1.stay, spare: true }));
          courierOut(A, S1.free(A.car.x, A.car.y, 24), at(dr.x + L.door.fx * 16, dr.y + L.door.fy * 16), () => { A.inside = true; });
        }
        if (A.inside && !A.cut) { A.cut = true; msBarOff(); msCut('THE OFFICE', () => msNext()); }
        return false;
      },
      info: A => (A.d ? Math.round(A.d) : '-') + ' M TO THE COURIER (LOST AT ' + N().lostM + ')',
      jump(A) { A.sus = 0; A.inside = true; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (MS.k === 2 && !A.cut) {
      if (A.car.dead || A.car.fc.out) return F.wrecked;
      if (A.sus >= 1) return F.spotted;
      if (A.d > N().lostM) return F.lost;
    }
    return '';
  }
  const cuts = {
    'THE COURIER': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [3, 4], fadeOut: true }],
    'THE OFFICE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.sachs, line: [8], enter: () => { face(A.sachs, A.car); } },
      { dur: 6, cam: 'CLOSE', at: () => P, line: [9, 10], phone: true, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();
