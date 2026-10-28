'use strict';
/* ---------- 8zzo. THE SPACE CENTER STORYLINE (Dr. Iris Kahn) - the last launch: S1-S8 ----------
   Iris' marker K stands outside the space center's gate. A quest holds the center (SPACE.ms, js/10zj): its gate open to you (in), the
   gate open to its own vehicles (gate), the clean room's and launch control's doors open (doors), their staff away (hold), the parked
   FUEL TRUCK away (noFuel). Each quest's words, lines and numbers are in the missions table (js/01x). */
const KAHN = {
  iris(A) { const g = SPACE.gate.g, q = STORY1.free(g.x + 110, g.y - 80, 8); A.iris = msPed(q.x, q.y, Math.PI, Object.assign(STORY1.look('iris'), { msName: 'iris', step: STORY1.stay, spare: true, shield: true })); return A.iris; },
  meet(cut) {                              // START MISSION by Iris at the gate
    return { enter(A) { MS.mark = () => A.iris; MS.start = { at: () => A.iris, label: 'START MISSION', go: () => { STORY1.face(A.iris, P); msCut(cut, () => { A.go = true; }); } }; },
      tick: A => !!A.go };
  },
  start(A, type) {                         // MISSIONS TEST: by Iris, a car on the road outside the gate
    P.x = A.iris.x + 30; P.y = A.iris.y + 24; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;
    const g = SPACE.gate.g, r = STORY1.road(g.x + 300, g.y), k = kerbBy(r.x, r.y); A.mycar = msCar(type || 'sedan', k.x, k.y, k.ang, '#3d6fa8');
  },
  hold(o) { SPACE.ms = Object.assign({ in: true }, o || {}); },
  back(nums) {                             // the last step: back to Iris at the gate, her lines, passed
    return { enter(A) { MS.guide = () => A.iris; MS.mark = () => A.iris; },
      tick(A) { if (A.fin) return A.fin === 2; if (dist(me4().x, me4().y, A.iris.x, A.iris.y) > 12 * UNITS_PER_M) return false; A.fin = 1; msLive(nums, { now: true, done: () => { A.fin = 2; } }); return false; },
      info: A => Math.round(dist(me4().x, me4().y, A.iris.x, A.iris.y) / UNITS_PER_M) + ' M TO IRIS',
      jump(A) { if (P.car) exitCar(true); P.x = A.iris.x + 20; P.y = A.iris.y + 10; } };
  },
  cone(p, deg) {                            // a sight cone on the ground before someone (js/08zzk's rally guards' kind), deg wide
    const n = 14, h = deg * Math.PI / 360, pos = [0, 0, 0]; for (let k = 0; k <= n; k++) { const a = -h + 2 * h * k / n; pos.push(Math.cos(a), 0, Math.sin(a)); }
    const idx = []; for (let k = 1; k <= n; k++) idx.push(0, k, k + 1);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx);
    p.cone = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); scene.add(p.cone);
  },
  sees(p, R, deg) {                         // the cone follows its owner's facing; true while you stand in it, in plain sight
    const half = deg * Math.PI / 360, a = p.ang || 0; p.cone.visible = !p.dead; if (p.dead) return false;
    p.cone.position.set(p.x, groundH(p.x, p.y) + 0.9, p.y); p.cone.rotation.y = -a; p.cone.scale.set(R, 1, R);
    const d = dist(p.x, p.y, P.x, P.y); return !P.car && d < R && Math.abs(angDiff(a, Math.atan2(P.y - p.y, P.x - p.x))) < half && losClear(p.x, p.y, P.x, P.y);
  },
  uncone(p) { if (p && p.cone) { scene.remove(p.cone); p.cone.geometry.dispose(); p.cone.material.dispose(); p.cone = null; } },
  walker(way, speed, loop) {                 // a post.step that walks a list of points (through the center's doors by castTo), round and round or once
    return (p, dt) => { if (p.state === 'flee') p.state = 'post'; const t = way[p.wi % way.length]; if (!loop && p.wi >= way.length) { stepCop(p, 0, 0, 0, dt); return true; }
      if ((p.waitT || 0) > 0) { p.waitT -= dt; stepCop(p, 0, 0, 0, dt); return true; }
      const w = castTo(p, t); if (castWalk(p, w.x, w.y, WALK * (speed || 1.3), dt) < 14 && w === t) { p.wi++; p.waitT = t.wait || 0; } return true; };
  },
  drive(c, way, speed) {                    // a vehicle driven along a list of points (the convoy, a getaway inside the fence); stops at the end
    c.driver = 'ai'; c.pw = way; c.pwi = 0;
    c.msDrive = (o, dt) => { const t = o.pw[o.pwi]; if (!t) { o.thr = 0; o.str = 0; o.hb = true; return; } if (dist(o.x, o.y, t.x, t.y) < 70) { o.pwi++; return; } o.hb = false; steerToward(o, t.x, t.y, (o.pwi === o.pw.length - 1 ? 0.6 : 1) * speed * KMH); };
  },
  dmg: c => 1 - c.hp / c.maxhp
};

/* ================= S1 - THE PASS ================= */
MSCRIPT.s1 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold({ noFuel: true });
    const f = SPACE.fuel.car; if (f && P.car !== f) { const i = cars.indexOf(f); if (i >= 0) cars.splice(i, 1); SPACE.fuel.car = null; }
    const r = S1.road(6274, 12700), k = kerbBy(r.x, r.y); A.truck = msCar('fueltruck', k.x, k.y, k.ang, '#f4f6f8'); A.dest = { x: SPACE.fuelAt[0], y: SPACE.fuelAt[1] };
    A.men = [[90, 50], [-70, 60], [30, -80]].map(([dx, dy]) => { const q = S1.free(k.x + dx, k.y + dy, 10); return msFoe(q.x, q.y, Object.assign({ gun: 'pistol', hp: N().menHp, group: 'port' }, CH4.men)); });
  }
  const dmgBar = A => { const d = KAHN.dmg(A.truck) / (N().maxDamage / 100); msBar('DAMAGE', clamp(d, 0, 1), d > 0.7 ? '#ff3b4a' : d > 0.35 ? '#ffd23f' : '#3dff7a'); };
  const steps = [
    KAHN.meet('THE PASS'),
    { enter(A) { MS.mark = () => A.truck; MS.guide = () => A.truck; },                                // GO TO the port
      tick(A) { if (dist(me4().x, me4().y, A.truck.x, A.truck.y) > N().nearM * M) return false; msLive([6]); return true; },
      info: A => Math.round(dist(me4().x, me4().y, A.truck.x, A.truck.y) / M) + ' M TO THE FUEL TRUCK',
      jump(A) { if (P.car) exitCar(true); P.x = A.truck.x + 80; P.y = A.truck.y + 60; } },
    { enter(A) { MS.mark = () => A.truck; },                                                           // GET IN the fuel truck
      tick(A) { dmgBar(A); return P.car === A.truck; },
      info: A => msFoesLeft('port') + " OF CRANE'S MEN · DAMAGE " + Math.round(100 * KAHN.dmg(A.truck)) + '%',
      jump(A) { for (const p of A.men) if (!p.dead) killPed(p, 'gun', false); if (P.car) exitCar(true); P.x = A.truck.x; P.y = A.truck.y; enterCar(A.truck); } },
    { enter(A) { MS.mark = () => A.dest; MS.guide = A.dest; A.chaseAt = gameT + N().chaseT; },          // DRIVE it to the space center, by launch control's road
      tick(A) {
        dmgBar(A);
        if (!A.chase && gameT > A.chaseAt) { A.chase = true; const me = me4(), a = me.ang + Math.PI, r = S1.road(me.x + Math.cos(a) * 900, me.y + Math.sin(a) * 900), k = kerbBy(r.x, r.y);
          msFoeCar('sedan', k.x, k.y, k.ang, Object.assign({ mode: 'chase', crew: 2, gun: 'pistol', group: 'chase', speed: N().carSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)); msLive([7]); }
        if (A.end) return A.end === 2;
        const t = A.truck; if (P.car !== t || dist(t.x, t.y, A.dest.x, A.dest.y) > N().parkM * M || carSpeed(t) > 12 * KMH) return false;
        A.end = 1; msBarOff(); msLive([8, 9], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(A.truck.x, A.truck.y, A.dest.x, A.dest.y) / M) + ' M TO LAUNCH CONTROL · DAMAGE ' + Math.round(100 * KAHN.dmg(A.truck)) + '% (' + N().maxDamage + '% IS TOO MUCH)',
      jump(A) { const t = A.truck; if (P.car !== t) { if (P.car) exitCar(true); enterCar(t); } t.x = A.dest.x + 30; t.y = A.dest.y; t.vx = t.vy = 0; P.x = t.x; P.y = t.y; } }];
  function fail(A) {
    if (A.truck.dead) return F().blown;
    if (MS.k >= 2 && KAHN.dmg(A.truck) * 100 >= N().maxDamage) return F().damaged;
    return '';
  }
  const cuts = {
    'THE PASS': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.iris, line: [1], enter: () => { face(A.iris, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [2] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3] },
      { dur: 5, cam: 'CLOSE', at: () => A.iris, line: [4, 5], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); SPACE.ms = null; } };
})();

/* ================= S2 - CLEAN ROOM ================= */
MSCRIPT.s2 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const at = (x, y, wait) => ({ x, y, wait: wait || 0 });
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold({ doors: true });
    const V = SPACE.vab, L = SPACE.lcc, vd = V.door, ld = L.door;
    if (!P.wardrobe.includes('lab_coat')) P.wardrobe.push('lab_coat'); A.old = Object.assign({}, P.outfit); P.outfit.top = 'lab_coat';   // Iris' spare coat, on from the start
    const mk = (id, x, y, way) => { const p = msPed(x, y, 0, Object.assign(S1.look(id), { msName: id, spare: true, shield: true })); p.post.step = KAHN.walker(way, 1.2, true); p.wi = 0; KAHN.cone(p, N().cone); return p; };
    const [vx, vy, vw, vh] = SPACEM.vab, nw = at(vx - vw / 2 - 40, vy - vh / 2 - 40), ne = at(vx + vw / 2 + 50, vy - vh / 2 - 40), sw = at(vx - vw / 2 - 40, vy + vh / 2 + 50);   // round the assembly building's corners
    A.mercer = mk('mercer', 3200, 1200, [at(3100, 1180, 3), at(3400, 1700), sw, at(SPACE.fuelAt[0] - 40, SPACE.fuelAt[1], 4), at(vd.x + 30, vd.y + 60, 2), ne, nw, at(3500, 1300, 2)]);
    A.voss = mk('voss', L.spots.mid.x, L.spots.mid.y, [at(L.spots.mid.x, L.spots.mid.y, 4), at(ld.x, ld.y), at(vd.x, vd.y), at(V.spots.mid.x, V.spots.mid.y, 4), at(vd.x, vd.y), at(ld.x, ld.y)]);
    A.tolan = mk('tolan', 3850, 1000, [at(3850, 1000, 3), at(3720, 1340, 2), nw, ne, at(vd.x, vd.y - 40), at(V.spots.benchR.x, V.spots.benchR.y, 3), at(vd.x, vd.y + 20), ne, nw]);
    A.sus = [A.mercer, A.voss, A.tolan]; A.seen = 0; A.watch = 0; A.t = 0;
  }
  function look(A, dt) {                     // the three look where they walk; standing in a cone in plain sight fills SPOTTED
    let s = false; for (const p of A.sus) if (KAHN.sees(p, N().seeM * M, N().cone)) s = true;
    A.seen = clamp(A.seen + (s ? dt : -dt * 0.5), 0, N().spotT); return s;
  }
  const steps = [
    KAHN.meet('CLEAN ROOM'),
    { enter(A) { MS.mark = () => A.sus.reduce((b, p) => dist(P.x, P.y, p.x, p.y) < dist(P.x, P.y, b.x, b.y) ? p : b); MS.guide = null; msObjective('FOLLOW THE THREE SUSPECTS - STAY OUT OF THEIR SIGHT'); },   // FOLLOW them, unseen
      tick(A, dt) { look(A, dt); msBar('SEEN', A.seen / N().spotT, '#ffd23f'); A.t += dt; return A.t >= N().tamperAt; },
      info: A => 'SUSPECTS: MERCER, VOSS, TOLAN · ' + Math.max(0, Math.round(N().tamperAt - A.t)) + ' S',
      jump(A) { A.t = N().tamperAt; } },
    { enter(A) { const V = SPACE.vab, t = A.tolan, [vx, vy, vw] = SPACEM.vab, way = t.x < vx ? [at(vx - vw / 2 - 40, vy - 190), at(vx + vw / 2 + 50, vy - 190)] : [];   // from the west side: round the north corners first way.push(at(V.door.x, V.door.y), at(V.spots.panel.x, V.spots.panel.y)); t.post.step = KAHN.walker(way, 1.4, false); t.wi = 0; A.panelI = way.length;   // WATCH: one of them slips into the clean room - see him at the stage
        msLive([6]); MS.mark = () => SPACE.vab.spots.bay; MS.guide = SPACE.vab.door; A.tamper = 0; },
      tick(A, dt) {
        look(A, dt); const t = A.tolan, V = SPACE.vab, d = dist(P.x, P.y, t.x, t.y);
        const atPanel = t.wi >= A.panelI; if (atPanel) { A.tamper += dt; face(t, V.spots.bay); if (Math.random() < 0.04) Snd.tone(1800, 2400, 0.03, 0.02, 'square'); }   // the click of his tools
        if (atPanel && d < N().watchM * M && !P.car && losClear(P.x, P.y, t.x, t.y)) A.watch += dt;
        msBar('WATCHING', A.watch / N().watchT, '#3dff7a');
        return A.watch >= N().watchT; },
      info: A => (A.tolan.wi >= A.panelI ? 'SOMEONE IS AT THE STAGE - ' + Math.round(dist(P.x, P.y, A.tolan.x, A.tolan.y) / M) + ' M' : 'THE CLEAN ROOM') + ' · WATCH ' + Math.round(100 * A.watch / N().watchT) + '%',
      jump(A) { A.watch = N().watchT; } },
    { enter(A) { msBarOff(); A.cut = true; msCut('CAUGHT IN THE ACT', () => { A.run = true; }); },     // TAKE DOWN Tolan: he runs for the gate
      tick(A) {
        if (!A.run) return false; const t = A.tolan;
        if (!A.ran) { A.ran = true; KAHN.uncone(t); const g = SPACE.gate.g; t.shield = false; Object.assign(t, { foe: true, crim: true, hp: N().tolanHp, arm: -1, group: 'tolan' });
          t.post.step = KAHN.walker([at(SPACE.vab.door.x, SPACE.vab.door.y), at(g.x - 60, g.y), at(g.x + 600, g.y + 300), at(g.x + 1400, g.y + 200)], 2.6, false); t.wi = 0; SPACE.ms.gate = true; MS.mark = () => A.tolan; }
        if (t.dead || t.stunT > 0) { if (!A.end) { A.end = 1; msLive([8, 9], { now: true, done: () => { A.end = 2; } }); } return A.end === 2; }
        return false; },
      info: A => A.run ? Math.round(dist(P.x, P.y, A.tolan.x, A.tolan.y) / M) + ' M TO TOLAN' : '',
      jump(A) { A.run = true; if (!A.ran) return; const t = A.tolan; t.stunT = 3; } }];
  function fail(A) {
    if (MS.k >= 1 && MS.k <= 2 && A.seen >= N().spotT) return F().spotted;
    if (MS.k === 2 && A.tamper >= N().tamperT && A.watch < N().watchT) return F().missed;
    if (MS.k === 3 && A.ran && !A.tolan.dead && !(A.tolan.stunT > 0) && A.tolan.wi >= 3) return F().escaped;
    return '';
  }
  const cuts = {
    'CLEAN ROOM': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1], enter: () => { face(A.iris, P); } },
      { dur: 7, cam: 'CLOSE', at: () => A.iris, line: [2, 3] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [4] },
      { dur: 4, cam: 'CLOSE', at: () => A.iris, line: [5], fadeOut: true }],
    'CAUGHT IN THE ACT': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.tolan, line: [7], enter: () => { face(A.tolan, P); } },
      { dur: 2, cam: 'CLOSE', at: () => P, fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { msBarOff(); SPACE.ms = null; if (A && A.sus) for (const p of A.sus) KAHN.uncone(p); } };
})();
