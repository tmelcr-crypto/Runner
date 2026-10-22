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

/* ================= M15 - PRESS PASS ================= */
MSCRIPT.m15 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const smart = () => CL_SLOTS.some(sl => P.outfit && P.outfit[sl] && CLOTH[P.outfit[sl]] && CLOTH[P.outfit[sl]].smart);
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;        // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const sh = A.shell = rallyUp(true), L = MAP.lm.find(l => l.t === 'park');
    A.gate = at(sh.x, L.y - L.h / 2 + 40);                                                   // the press gate: the park's north gate, nearest the stage
    A.crane = msPed(sh.x, sh.front - 4, 0, Object.assign(S1.look('crane'), { msName: 'crane', step: S1.stay, spare: true, shield: true })); A.crane.ang = A.crane.hd = Math.PI / 2;
    const sp = S1.free(sh.x + 120, sh.front + 20, 4); A.sachs = msPed(sp.x, sp.y, 0, Object.assign(S1.look('sachs'), { msName: 'sachs', step: S1.stay, spare: true, shield: true }));
    face(A.sachs, at(sh.x, sh.front));
    A.case = S1.free(sp.x + 12, sp.y + 8, 2);
    const cm = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 2), new THREE.MeshLambertMaterial({ color: '#5a3a22' })); cm.position.set(A.case.x, groundH(A.case.x, A.case.y) + 2.5, A.case.y); scene.add(cm); A.caseMesh = cm;
    A.guards = [[150, -2, 0], [92, 70, 2.1], [40, 96, 4.2]].map(([dx, dy, ph]) => { const q = S1.free(sh.x + dx, sh.front + dy, 4);
      const g = msPed(q.x, q.y, 0, Object.assign(S1.look('craneman'), { msName: 'craneman', step: S1.stay, spare: true }));
      g.base = Math.atan2(A.case.y - g.y, A.case.x - g.x); g.ph = ph;
      const n = 14, h = N().cone * Math.PI / 360, pos = [0, 0, 0]; for (let k = 0; k <= n; k++) { const a = -h + 2 * h * k / n; pos.push(Math.cos(a), 0, Math.sin(a)); }
      const idx = []; for (let k = 1; k <= n; k++) idx.push(0, k, k + 1);
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx);
      g.cone = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })); scene.add(g.cone);
      return g; });
    A.seenT = 0;
  }
  function look(A, dt) {                    // the guards sweep their eyes over the briefcase; when the crowd cheers they look at the stage
    A.lt = (A.lt || 0) + dt; const sh = A.shell, cheer = gameT - RALLY.cheerAt < N().cheerLook, half = N().cone * Math.PI / 360, R = N().seeM * M;
    let seen = false;
    for (const g of A.guards) {
      if (g.dead) { g.cone.visible = false; continue; }
      const a = cheer ? Math.atan2(sh.front - g.y, sh.x - g.x) : g.base + Math.sin(A.lt * TAU / N().sweepT + g.ph) * N().sweep * Math.PI / 180;
      g.ang = g.hd = a; if (g.post) g.post.a = a;
      g.cone.position.set(g.x, groundH(g.x, g.y) + 0.8, g.y); g.cone.rotation.y = -a; g.cone.scale.set(R, 1, R);
      const d = dist(g.x, g.y, P.x, P.y);
      if (!P.car && d < R && Math.abs(angDiff(a, Math.atan2(P.y - g.y, P.x - g.x))) < half && losClear(g.x, g.y, P.x, P.y)) seen = g;
    }
    return seen;
  }
  const steps = [
    S3.meet('PRESS PASS'),
    { enter(A) { MS.mark = null; MS.guide = null; if (smart()) { A.worn = true; return; } },   // PUT ON smart clothes (Nina's jacket, if you have none on)
      tick(A) { if (!A.worn && !MS.start && !P.car) MS.start = { at: () => P, label: "NINA'S JACKET", go2: 'PUT IT ON', go: () => { A.old = Object.assign({}, P.outfit); if (!P.wardrobe.includes('velvet_suit_b')) P.wardrobe.push('velvet_suit_b'); P.outfit.top = 'velvet_suit_b'; P.outfit.hat = null; Snd.pickup(); A.worn = true; } }; return !!A.worn; },
      jump(A) { if (!A.worn) { MS.start = null; A.old = Object.assign({}, P.outfit); P.outfit.top = 'velvet_suit_b'; A.worn = true; } } },
    { enter(A) { MS.guide = A.gate; MS.mark = () => A.gate; },                                   // GO TO the press gate (on foot, in smart clothes)
      tick(A) { if (A.in) return !!A.go2; if (P.car || dist(P.x, P.y, A.gate.x, A.gate.y) > N().gateM * M) return false; A.in = true; msCut('THE RALLY', () => { A.go2 = true; }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.gate.x, A.gate.y) / M) + ' M TO THE PRESS GATE',
      jump(A) { if (P.car) exitCar(true); P.x = A.gate.x; P.y = A.gate.y + 10; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.case; },                                     // PLANT the bug in Sachs' briefcase, unseen
      tick(A, dt) {
        const g = look(A, dt), near = dist(P.x, P.y, A.case.x, A.case.y) < N().nearM * M;
        if (g && near) { if (A.seenT === 0) { popup(g.x, g.y - 20, '!', '#ff3b4a'); Snd.tone(600, 900, 0.3, 0.06, 'square'); } A.seenT += dt; } else A.seenT = Math.max(0, A.seenT - dt);
        if (!A.planted && !MS.start && !P.car) MS.start = { at: () => A.case, label: "SACHS' BRIEFCASE", go2: 'PLANT THE BUG', go: () => { if (look(A, 0)) A.caught = true; else { A.planted = true; Snd.pickup(); popup(P.x, P.y - 14, 'BUG PLANTED', '#b6ff3c'); } } };
        return !!A.planted;
      },
      info: A => A.seenT > 0 ? 'THEY ARE LOOKING!' : 'WAIT FOR THE GUARDS TO LOOK AWAY - OR FOR A CHEER',
      jump(A) { MS.start = null; A.planted = true; } },
    { enter(A) { MS.mark = null; MS.guide = A.gate; for (const g of A.guards) g.cone.visible = false; },   // GET AWAY from the rally: Nina listens in
      tick(A) { if (!A.call && dist(P.x, P.y, A.case.x, A.case.y) > N().leaveM * M) { A.call = true; msLive([9, 10, 11], { phone: true, done: () => { A.fin = true; } }); } return !!A.fin; },
      info: A => A.call ? '' : Math.round(Math.max(0, N().leaveM - dist(P.x, P.y, A.case.x, A.case.y) / M)) + ' M MORE',
      jump(A) { A.call = true; A.fin = true; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (A.sachs.dead || A.guards.some(g => g.dead) || RALLY.crowd.some(p => p.dead || p.state === 'flee')) return F.scene;
    if (MS.k === 3 && (A.caught || A.seenT > N().warnT)) return F.seen;
    return '';
  }
  const cuts = {
    'PRESS PASS': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [3, 4], fadeOut: true }],
    'THE RALLY': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.crane, line: [5, 6], enter: () => { rallyCheer(); } },
      { dur: 5, cam: 'CLOSE', at: () => A.sachs, line: [7] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [8], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) {
    NEWS.ms = null; rallyDown();
    if (A && A.caseMesh) { scene.remove(A.caseMesh); A.caseMesh.geometry.dispose(); A.caseMesh.material.dispose(); }
    if (A && A.guards) for (const g of A.guards) { scene.remove(g.cone); g.cone.geometry.dispose(); g.cone.material.dispose(); }
    if (A && A.old && msTest()) Object.assign(P.outfit, A.old);
  } };
})();

/* ================= M16 - COLD STORAGE ================= */
MSCRIPT.m16 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const look = { shirt: '#3a3f4c', pants: '#2a2d36' };
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;        // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const Y = A.Y = IXS.yard, rd = S1.road(Y.cx, Y.cy), fx = rd.x - Y.cx, fy = rd.y - Y.cy, fl = Math.hypot(fx, fy) || 1;
    A.front = at(Y.cx + fx / fl * (Math.min(Y.w, Y.h) / 2 + 10), Y.cy + fy / fl * (Math.min(Y.w, Y.h) / 2 + 10));
    A.back = S1.free(Y.cx - fx / fl * (Math.min(Y.w, Y.h) / 2 + 30), Y.cy - fy / fl * (Math.min(Y.w, Y.h) / 2 + 30), 10);
    const del = CASL.hideout(); let U = null;                                                   // Sachs' lock-up: the unit on the street side, furthest from Del's
    for (const u of Y.units) { const d = ixWorld(u, 0, u.hd + 40); if (dist(d.x, d.y, rd.x, rd.y) > dist(Y.cx, Y.cy, rd.x, rd.y) + 20) continue; if (!U || dist(u.cx, u.cy, del.S.cx, del.S.cy) > dist(U.cx, U.cy, del.S.cx, del.S.cy)) U = u; }
    U = A.U = U || Y.units[0]; U.ms = true;
    const vp = ixWorld(U, 0, U.hd + 34), va = Math.atan2(vp.y - U.cy, vp.x - U.cx) + Math.PI / 2;
    for (let i = cars.length - 1; i >= 0; i--) if (P.car !== cars[i] && dist(cars[i].x, cars[i].y, vp.x, vp.y) < 120) cars.splice(i, 1);
    A.van = msFoeCar('truck', vp.x, vp.y, va, { mode: 'park', crew: 1, gun: 'pistol', group: 'sachs', speed: N().vanSpeed, color: '#2a2a32', crewHp: N().menHp, shirt: look.shirt, pants: look.pants });
    A.men = [[-24, 20], [22, 22], [0, 52]].map(([x, z]) => { const q = ixWorld(U, x, U.hd + z); return msFoe(q.x, q.y, Object.assign({ gun: 'pistol', group: 'sachs', hp: N().menHp, name: 'craneman' }, look)); });
    for (const s of [-1, 1]) { const q = S1.free(A.front.x + s * 30, A.front.y, 6); A.men.push(msFoe(q.x, q.y, Object.assign({ gun: 'smg', group: 'sachs', hp: N().menHp, name: 'craneman', a: Math.atan2(fy, fx) }, look))); }   // the lookouts at the street side
    A.route = [S1.road(Y.cx + fx / fl * 2400, Y.cy + fy / fl * 2400), S1.road(Y.cx + fx / fl * 2400 + 2000, Y.cy + fy / fl * 2400 + 1200)];
  }
  const steps = [
    S3.meet('COLD STORAGE'),
    { enter(A) { A.left = N().loadT; const sp = S3.kessler() === 'spared'; A.to = sp ? A.back : A.front; MS.guide = A.to; MS.mark = () => A.to;   // GO TO the storage yard (spared: Kessler's back gate)
        if (sp) msLive([5, 6], { phone: true }); },
      tick(A, dt) { A.left -= dt; msBar('LOADING', 1 - A.left / N().loadT, '#ffd23f'); return dist(me().x, me().y, A.to.x, A.to.y) < N().yardM * M || A.men.some(p => p.alert) || A.left <= 0; },
      info: A => Math.round(dist(me().x, me().y, A.to.x, A.to.y) / M) + ' M TO THE STORAGE YARD',
      jump(A) { if (P.car) exitCar(true); P.x = A.to.x; P.y = A.to.y; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.van.fc.out || A.van.dead ? peds.find(p => p.foe && !p.dead && p.group === 'sachs') : A.van;   // TAKE OUT Sachs' men before the van leaves
        if (S3.kessler() === 'finished') A.kessT = N().kessT; },
      tick(A, dt) {
        const v = A.van;
        if (!A.gone && !v.fc.out && !v.dead) { A.left -= dt; msBar('LOADING', 1 - A.left / N().loadT, '#ffd23f'); if (A.left <= 0) { A.gone = true; msBarOff(); foeCarGo(v, 'flee'); v.fc.to = A.route; msLive([7], { now: true }); } }
        if (A.gone && !v.fc.out && !v.dead && v.hp < v.maxhp * 0.45) foeBail(v);
        if (A.kessT > 0 && (A.kessT -= dt) <= 0) {                                               // Kessler finished: his gang storms the yard too - a three-way fight
          MS_CAST.feud = ['sachs', 'kess'];
          A.kess = [-1, 1].map(s => { const r = S1.road(A.front.x + s * 500, A.front.y + s * 300); return msFoeCar('muscle', r.x, r.y, r.a, { mode: 'flee', to: [S1.free(A.front.x + s * 40, A.front.y, 8)], crew: 2, gun: 'pistol', group: 'kess', speed: 90, shirt: '#f0f0ea', pants: '#3a4a6a' }); });
          msLive([8], { now: true });
        }
        if (A.kess) for (const c of A.kess) if (!c.fc.out && !c.dead && (c.fc.gone || c.hp < c.maxhp * 0.45)) { for (const q of foeBail(c)) q.alert = true; }   // they pull up at the gate and pile out
        return msFoesLeft('sachs') === 0;
      },
      info: A => msFoesLeft('sachs') + " OF SACHS' MEN LEFT" + (A.kess ? ' · ' + msFoesLeft('kess') + " OF KESSLER'S" : '') + (A.gone ? ' · THE VAN IS LEAVING!' : ''),
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'sachs') killPed(p, 'gun', false); for (const c of MS_CAST.cars) if (c.fc.group === 'sachs' && !c.fc.out) foeBail(c); } },
    { enter(A) { msBarOff(); const v = A.van; if (!A.box) A.box = S1.dryNear(v.x - Math.cos(v.ang) * 34, v.y - Math.sin(v.ang) * 34); MS.mark = () => A.box && at(A.box.x, A.box.y); },   // COLLECT the box of files
      tick(A) { if (A.got) return !!A.fin; if (P.car || dist(P.x, P.y, A.box.x, A.box.y) > N().boxR) return false; A.got = true; Snd.pickup(); msCut('COPIES', () => { A.fin = true; }); return false; },
      jump(A) { if (P.car) exitCar(true); P.x = A.box.x + 10; P.y = A.box.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (A.gone && !A.van.fc.out && !A.van.dead && (A.van.fc.gone || dist(me().x, me().y, A.van.x, A.van.y) > N().away * M)) return F.away;
    return '';
  }
  const cuts = {
    'COLD STORAGE': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [3, 4], fadeOut: true }],
    'COPIES': A => [
      { dur: 5, cam: 'CLOSE', at: () => P, line: [9] },
      { dur: 6, cam: 'CLOSE', at: () => P, line: [10, 11], phone: true, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { NEWS.ms = null; if (A && A.U) A.U.ms = false; MS_CAST.feud = null; } };
})();

/* ================= M17 - THE SAFE ================= */
MSCRIPT.m17 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;        // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    A.h = sbLoft(); const d = A.h.door; A.at = at(d.x + d.fx * 12, d.y + d.fy * 12);
    SB.ms = { for: 'loft', open: true, liftTop: N().liftTop, spotted: false,                // the helper's work: the alarm cut, Sachs' door left open; his bodyguards on 3, 4 and 5
      guards: [sbGuard(3, 170, 1240, 700, 1), sbGuard(4, 170, 1240, 400, -1), sbGuard(5, 420, 1240, 900, -1)],
      item: { fl: 5, room: 'SACHS & PARTNERS', x: 788, safe: true, label: 'OPEN THE SAFE', toast: "SACHS' FILES - THE ORIGINALS", got: false } };
  }
  const steps = [
    S3.meet('THE SAFE'),
    { enter(A) { MS.guide = A.at; MS.mark = () => A.at; },                                     // GO INTO the loft building
      tick(A) { if (SV.on && SV.h.id === 'loftq') { svToast('THE ALARM IS OFF'); msLive([5], { now: true }); return true; }
        if (!MS.start && !P.car) MS.start = { at: () => A.at, label: 'PALM HEIGHTS LOFT', go2: 'GO IN', go: () => sbUse(A.h) }; return false; },
      info: A => SV.on ? 'INSIDE' : Math.round(dist(me().x, me().y, A.at.x, A.at.y) / M) + ' M TO THE LOFT',
      jump(A) { if (P.car) exitCar(true); P.x = A.at.x; P.y = A.at.y; P.vx = P.vy = 0; MS.start = null; if (!SV.on) sbUse(A.h); } },
    { enter(A) { MS.guide = null; MS.mark = null; },                                            // OPEN Sachs' safe on floor 5, unseen
      tick: () => { if (SB.ms.item.got && !SB.ms.said) { SB.ms.said = true; msLive([6], { now: true }); } return SB.ms.item.got; },
      info: () => SV.on ? (SV.fl === 5 ? "SACHS' OFFICE: THE WIDE DOOR" : 'FLOOR ' + SV.fl + ' - SACHS IS ON 5') : 'GO BACK IN',
      jump() { SB.ms.item.got = true; } },
    { enter(A) { MS.mark = null; },                                                             // GET OUT: Sachs, warned, runs for his car
      tick(A) { if (SV.on || A.out) return !!A.fin; A.out = true;
        const d = A.h.door, r = S1.road(d.x + d.fx * 80, d.y + d.fy * 80), k = kerbBy(r.x + 40, r.y);
        A.car = msCar('limo', k.x, k.y, k.ang, '#14161d'); A.sachs = msPed(d.x + d.fx * 20 + 30, d.y + d.fy * 20, 0, Object.assign(S1.look('sachs'), { msName: 'sachs', step: S1.runStep(0.7), spare: true, shield: true }));
        A.sachs.route = [allyDoor(A.car, A.sachs)]; A.sachs.ri = 0;
        msCut('HE RUNS', () => { A.fin = true; }); return false; },
      info: () => SV.on ? 'OUT TO THE STREET' : '',
      jump(A) { if (SV.on) closeSide(); } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (SB.ms && SB.ms.spotted) return F.spotted;
    return '';
  }
  const cuts = {
    'THE SAFE': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [3, 4], fadeOut: true }],
    'HE RUNS': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.sachs, line: [7], enter: () => { face(A.sachs, A.car); },
        tick: () => { const p = A.sachs; if (p.ri >= 1 && peds.includes(p)) { peds.splice(peds.indexOf(p), 1); A.car.driver = 'ai'; foeless(A); } } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [8], fadeOut: true }]
  };
  function foeless(A) { const c = A.car, r = S1.road(c.x + Math.cos(c.ang) * 900, c.y + Math.sin(c.ang) * 900); c.fc = { mode: 'flee', to: [r], speed: 120, crew: 0, gun: -1, group: 'sachs', cool: 9, tgT: 0, out: false, gone: false }; foeCarGo(c); }
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; SB.ms = null; } };
})();
