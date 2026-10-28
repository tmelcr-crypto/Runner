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
    c.msDrive = (o, dt) => { const t = o.pw[o.pwi]; if (!t || (o.waitT || 0) > 0) { if (t) o.waitT -= dt; o.thr = 0; o.str = 0; o.hb = true; o.stuck = 0; return; } if (dist(o.x, o.y, t.x, t.y) < 70) { o.pwi++; return; } o.hb = false;   // waitT: held (the quest says when)
      if (o.rev > 0) { o.rev -= dt; o.thr = -1; o.str = -clamp(angDiff(o.ang, Math.atan2(t.y - o.y, t.x - o.x)) * 2, -1, 1); return; }   // backing off whatever held it up
      steerToward(o, t.x, t.y, (o.pwi === o.pw.length - 1 ? 0.6 : 1) * speed * KMH);
      if (carSpeed(o) < 8 * KMH) { o.stuck = (o.stuck || 0) + dt; if (o.stuck > 1.5) { o.stuck = 0; o.rev = 0.9; } } else o.stuck = 0; };
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

/* ================= S3 - CARGO ================= */
MSCRIPT.s3 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold();
    const [x0, , , y1] = AIRF.apron, q = S1.free(x0 + 420, y1 - 100, 20); A.unit = msCar('truck', q.x, q.y, 0, '#f4f6f8'); A.apron = q;
    A.dest = SPACE.vab.door; A.cond = 1; A.lastHp = A.unit.hp;
  }
  function knocks(A) {                      // every knock costs the guidance unit in proportion; a hard one says so
    const c = A.unit, dh = A.lastHp - c.hp; A.lastHp = c.hp;
    if (dh > 0) { A.cond -= dh / (c.maxhp * N().breakAt / 100); if (dh > N().knockHp) { toast('A HARD KNOCK!'); Snd.tone(220, 110, 0.2, 0.12, 'square'); } }
    msBar('THE GUIDANCE UNIT', clamp(A.cond, 0, 1), A.cond > 0.5 ? '#3dff7a' : A.cond > 0.25 ? '#ffd23f' : '#ff3b4a');
  }
  const steps = [
    KAHN.meet('CARGO'),
    { enter(A) { MS.mark = () => A.unit; MS.guide = () => A.unit; },                                  // GET IN the cargo truck on Skyport's apron
      tick(A) { knocks(A); return P.car === A.unit; },
      info: A => Math.round(dist(me4().x, me4().y, A.unit.x, A.unit.y) / M) + " M TO THE CARGO TRUCK",
      jump(A) { if (P.car) exitCar(true); P.x = A.unit.x; P.y = A.unit.y; enterCar(A.unit); } },
    { enter(A) { MS.mark = () => A.dest; MS.guide = A.dest; },                                         // DRIVE it to the clean room - no hard knocks; Crane's men ram
      tick(A) {
        knocks(A); const c = A.unit;
        if (!A.rams && dist(c.x, c.y, A.apron.x, A.apron.y) > N().ramFromM * M) { A.rams = true; msLive([6]);
          for (let k = 0; k < 2; k++) { const a = c.ang + Math.PI + (k ? 0.5 : -0.5), r = S1.road(c.x + Math.cos(a) * 900, c.y + Math.sin(a) * 900), q = kerbBy(r.x, r.y);
            const f = msFoeCar('muscle', q.x, q.y, q.ang, Object.assign({ mode: 'chase', crew: 1, gun: null, group: 'ram', speed: N().ramSpeed, color: '#14161d', crewHp: N().menHp, tough: 1.5 }, CH4.men)); f.fc.wait = k * 2; } }
        if (A.end) return A.end === 2;
        if (P.car !== c || dist(c.x, c.y, A.dest.x, A.dest.y) > N().parkM * M || carSpeed(c) > 12 * KMH) return false;
        A.end = 1; msBarOff(); msLive([7, 8], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(A.unit.x, A.unit.y, A.dest.x, A.dest.y) / M) + ' M TO THE CLEAN ROOM · THE UNIT ' + Math.max(0, Math.round(100 * A.cond)) + '%',
      jump(A) { const c = A.unit; if (P.car !== c) { if (P.car) exitCar(true); enterCar(c); } c.x = A.dest.x + 40; c.y = A.dest.y; c.vx = c.vy = 0; P.x = c.x; P.y = c.y; A.lastHp = c.hp; } }];
  function fail(A) { if (A.unit.dead || A.cond <= 0) return F().broken; return ''; }
  const cuts = {
    'CARGO': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3] },
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [4, 5], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); SPACE.ms = null; } };
})();

/* ================= S4 - PICKET LINE ================= */
MSCRIPT.s4 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const at = (x, y) => ({ x, y });
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); const g = SPACE.gate.g; Object.assign(A.iris, S1.free(g.x + 420, g.y - 100, 8)); A.iris.post.x = A.iris.x; A.iris.post.y = A.iris.y;
    KAHN.start(A); KAHN.hold({ in: false });
    const cols = ['#d0402a', '#2a4aa8', '#2a8a3a', '#ff7a1a'], shirts = ['#f4f4f0', '#ffd23f', '#3fd0ff', '#ff9ad0', '#7fd4a8', '#c8b89a', '#a259ff'];
    A.crowd = []; for (let k = 0; k < N().crowd; k++) { const q = S1.free(g.x + 50 + (k % 7) * 26, g.y - 70 + Math.floor(k / 7) * 46 + rand(-8, 8), 4);
      A.crowd.push(msPed(q.x, q.y, Math.PI, { shirt: pick(shirts), pants: pick(['#2a2d3a', '#3a5a8a', '#5a4a3a']), placard: cols[k % cols.length], step: S1.stay, spare: true })); }
    A.men = [[60, -30, 'bat'], [130, 40, 'fists'], [190, -50, 'fists'], [100, 70, 'fists']].map(([dx, dy, gun]) => { const q = S1.free(g.x + dx, g.y + dy, 4); const p = msFoe(q.x, q.y, Object.assign({ gun, hp: N().menHp, group: 'pick', a: Math.PI }, CH4.men)); p.calm = true; return p; });
    const rv = S1.road(g.x + 260, g.y + 140), kv = kerbBy(rv.x, rv.y); A.van = msCar('newsvan', kv.x, kv.y, kv.ang, null);   // Bay TV's cameras
    A.conv = [0, 1].map(k => msCar('truck', g.x + 470 + k * 120, g.y + 18, Math.PI, '#f4f6f8')); A.conv.forEach(c => { c.noEnter = true; c.hp = c.maxhp = c.maxhp * 3; });   // waiting on the gate's road, noses to the gate
  }
  const left = A => A.men.filter(p => !p.dead).length;
  const steps = [
    KAHN.meet('PICKET LINE'),
    { enter(A) { MS.mark = () => A.men.find(p => !p.dead); },                                         // TAKE OUT Crane's four men in the crowd - nobody else gets hurt
      tick(A) { if (A.men.some(p => p.alert || p.dead || p.hp < N().menHp)) for (const p of A.men) if (!p.dead && p.calm) { p.calm = false; foeAlert(p); }
        return left(A) === 0; },
      info: A => left(A) + " OF CRANE'S MEN IN THE CROWD",
      jump(A) { for (const p of A.men) if (!p.dead) killPed(p, 'fists', false); } },
    { enter(A) { const g = SPACE.gate.g; msLive([5, 6], { now: true });                               // LEAD THE CONVOY IN: the crowd goes home; the trucks follow you in
        for (const p of A.crowd) if (!p.dead) { const sd = p.y < g.y ? -1 : 1; p.placard = 0; p.post.step = KAHN.walker([at(p.x + rand(-40, 40), g.y + sd * 160), at(p.x + rand(100, 300), g.y + sd * 520)], 1.6, false); p.wi = 0; }   // off the road to either side, and away
        A.goT = gameT + N().clearT;
        SPACE.ms.in = true; SPACE.ms.gate = true; const V = SPACE.vab.door;
        A.conv.forEach((c, k) => KAHN.drive(c, [at(g.x + 160, g.y), at(g.x - 60, g.y), at(V.x + 140, V.y - 40 + k * 0), at(V.x + 60 + k * 110, V.y + 20)], N().convSpeed));
        MS.mark = () => A.conv[0]; MS.guide = () => SPACE.vab.door; },
      tick(A) {
        const lead = A.conv[0], near = dist(me4().x, me4().y, lead.x, lead.y) < N().leadM * M;
        for (const c of A.conv) if (!near || gameT < A.goT) c.waitT = 0.2;   // the trucks wait for the road to clear, and for you
        for (const p of A.crowd) if (!p.dead && p.wi >= 2 && peds.includes(p)) peds.splice(peds.indexOf(p), 1);
        if (A.end) return A.end === 2; if (lead.pwi < lead.pw.length) return false;
        A.end = 1; msLive([7, 8], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => dist(me4().x, me4().y, A.conv[0].x, A.conv[0].y) < N().leadM * M ? Math.round(dist(A.conv[0].x, A.conv[0].y, SPACE.vab.door.x, SPACE.vab.door.y) / M) + ' M TO THE CLEAN ROOM' : 'THE CONVOY WAITS FOR YOU',
      jump(A) { const V = SPACE.vab.door; A.conv.forEach((c, k) => { c.x = V.x + 60 + k * 110; c.y = V.y + 20; c.pwi = c.pw.length; }); P.x = V.x + 80; P.y = V.y + 120; } }];
  function fail(A) {
    if (A.crowd.some(p => p.dead)) return F().cameras;
    if (A.conv.some(c => c.dead)) return F().convoy;
    return '';
  }
  const cuts = {
    'PICKET LINE': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 5, cam: 'WIDE', at: () => SPACE.gate.g, line: [3] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [4], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); SPACE.ms = null; } };
})();

/* ================= S5 - THE MOLE ================= */
MSCRIPT.s5 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const at = (x, y) => ({ x, y });
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold({ doors: true });
    const [lx, ly] = SPACEM.lot, v = msWho('voss');
    A.car = msFoeCar('sedan', lx - 90, ly, 0, { mode: 'park', crew: 1, gun: null, group: 'mole', speed: N().carSpeed, color: '#f4f6fa', crewHp: N().vossHp, shirt: v.shirt, pants: v.pants, name: 'voss' });
    const g = SPACE.gate.g; A.out = [S1.road(g.x + 1400, g.y + 1300), S1.road(g.x + 2600, g.y + 2900), S1.road(g.x + 1200, g.y + 4200)];
  }
  const steps = [
    KAHN.meet('THE MOLE'),
    { enter(A) { const g = SPACE.gate.g, [vx, vy, vw, vh] = SPACEM.vab; SPACE.ms.gate = true; msLive([5]);   // STOP Dana Voss: out through the gate and away across Gravel Flats
        KAHN.drive(A.car, [at(vx - vw / 2 - 60, vy - vh / 2 - 60), at(vx + vw / 2 + 60, vy - vh / 2 - 60), at(4400, g.y), at(g.x + 120, g.y)], N().carSpeed * 0.6); A.inside = true;
        MS.mark = () => A.car.fc.out ? null : A.car; MS.guide = () => A.car; },
      tick(A) {
        const v = A.car;
        if (A.inside && v.pwi >= v.pw.length) { A.inside = false; v.fc.to = A.out; v.fc.ti = 0; foeCarGo(v, 'flee'); }
        if (!v.fc.out && !v.dead && v.hp < v.maxhp * N().bailAt / 100) { const men = foeBail(v); A.voss = men[0]; }
        if (v.dead && !v.fc.out) A.voss = null;
        return !!A.voss || (v.dead && !v.fc.out); },
      info: A => Math.round(dist(me4().x, me4().y, A.car.x, A.car.y) / M) + " M TO VOSS' CAR · " + Math.round(100 * A.car.hp / A.car.maxhp) + '%',
      jump(A) { const v = A.car; if (P.car) exitCar(true); P.x = v.x + 70; P.y = v.y + 50; const men = foeBail(v); A.voss = men[0]; } },
    { enter(A) { const p = A.voss; if (!p) { A.bag = S1.dryNear(A.car.x, A.car.y); return; }   // TAKE HER DOWN: she runs, the codes on her
        p.arm = -1; A.carry = p; const a = Math.atan2(p.y - me4().y, p.x - me4().x); p.post.step = KAHN.walker([at(p.x + Math.cos(a) * 900, p.y + Math.sin(a) * 900)], 3, false); p.wi = 0; MS.mark = () => A.voss; MS.guide = null; },
      tick(A) { const p = A.voss; if (!p) return true; if (p.dead || p.stunT > 0) { A.carry = null; A.bag = S1.dryNear(p.x, p.y); return true; } return false; },
      info: A => A.voss ? Math.round(dist(P.x, P.y, A.voss.x, A.voss.y) / M) + ' M TO VOSS' : '',
      jump(A) { if (A.voss) A.voss.stunT = 3; } },
    { enter(A) { MS.mark = () => A.bag; MS.guide = () => A.bag; if (A.voss && !A.voss.dead) msLive([6]); },   // PICK UP the launch codes
      tick(A) { if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > N().pickM * M) return false; A.bag = null; toast('THE LAUNCH CODES'); Snd.tone(660, 990, 0.2, 0.1, 'triangle'); return true; },
      info: A => A.bag ? Math.round(dist(me4().x, me4().y, A.bag.x, A.bag.y) / M) + ' M TO THE CODES' : '',
      jump(A) { if (P.car) exitCar(true); P.x = A.bag.x; P.y = A.bag.y; } },
    KAHN.back([7, 8])];
  function fail(A) {
    if (MS.k === 1 && !A.inside && !A.car.fc.out && !A.car.dead && (A.car.fc.gone || dist(me4().x, me4().y, A.car.x, A.car.y) > N().away * M)) return F().away;
    if (MS.k === 2 && A.voss && !A.voss.dead && !(A.voss.stunT > 0) && dist(P.x, P.y, A.voss.x, A.voss.y) > N().footAway * M) return F().away;
    return '';
  }
  const cuts = {
    'THE MOLE': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 4, cam: 'WIDE', at: () => A.car, line: [3] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [4], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); SPACE.ms = null; } };
})();

/* ================= S6 - TRACKING DISH ================= */
MSCRIPT.s6 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold({ doors: true });
    const q = S1.free(2950, 9400, 20); A.truck = msCar('truck', q.x, q.y, Math.PI, '#5f6b3a'); A.truck.dish = true; A.truck.hp = A.truck.maxhp = A.truck.maxhp * N().truckTough;   // the spare dish on an army truck by the motor pool's shed
    const g = BASEM.gate; A.bgate = { x: g.x, y: g.y }; A.start = { x: q.x, y: q.y };
    const L = SPACEM.lcc; A.site = S1.free(L[0] - 140, L[1] + L[3] / 2 + 70, 10);   // where the dish goes: beside launch control
  }
  const suit = () => P.outfit && P.outfit.top === 'flight_suit';
  const steps = [
    KAHN.meet('TRACKING DISH'),
    { enter(A) { A.lk = SPACE.vab.spots.lockers; MS.mark = () => A.lk; MS.guide = A.lk; },             // PUT ON the flight suit from the lockers in the clean room
      tick(A) { if (suit()) return true; if (!MS.start && !P.car && dist(P.x, P.y, A.lk.x, A.lk.y) < 4 * M) MS.start = { at: () => A.lk, label: 'THE LOCKERS', go2: 'PUT ON THE FLIGHT SUIT', go: () => { for (const id of ['flight_suit', 'flight_trousers']) if (!P.wardrobe.includes(id)) P.wardrobe.push(id); P.outfit.top = 'flight_suit'; P.outfit.bottoms = 'flight_trousers'; P.outfit.hat = null; Snd.tone(523, 784, 0.2, 0.1, 'triangle'); toast('THE FLIGHT SUIT'); } }; return false; },
      info: A => suit() ? 'WEARING THE FLIGHT SUIT' : Math.round(dist(me4().x, me4().y, A.lk.x, A.lk.y) / M) + ' M TO THE LOCKERS (THE CLEAN ROOM)',
      jump(A) { MS.start = null; for (const id of ['flight_suit', 'flight_trousers']) if (!P.wardrobe.includes(id)) P.wardrobe.push(id); P.outfit.top = 'flight_suit'; P.outfit.bottoms = 'flight_trousers'; } },
    { enter(A) { MS.mark = () => A.truck; MS.guide = () => A.truck; msLive([6]); },                    // GET IN the dish truck at the air base - the suit gets you past the guards
      tick(A) { return P.car === A.truck; },
      info: A => Math.round(dist(me4().x, me4().y, A.truck.x, A.truck.y) / M) + ' M TO THE DISH TRUCK (THE AIR BASE)',
      jump(A) { if (P.car) exitCar(true); P.x = A.truck.x; P.y = A.truck.y; enterCar(A.truck); } },
    { enter(A) { MS.mark = () => A.site; MS.guide = A.site; },                                          // DRIVE it out and to the space center; halfway out, the alarm
      tick(A) {
        const t = A.truck;
        if (!A.alarm && dist(t.x, t.y, A.bgate.x, A.bgate.y) < dist(A.start.x, A.start.y, A.bgate.x, A.bgate.y) * N().alarmAt / 100) {
          A.alarm = true; raiseAlarm(); msLive([7, 8], { now: true });
          for (let k = 0; k < N().jeeps; k++) { const q = S1.free(2240 + k * 90, 8980, 20);
            msFoeCar('pickup', q.x, q.y, Math.PI / 2, { mode: 'chase', crew: 2, gun: 'smg', group: 'army', speed: N().jeepSpeed, color: '#4f5a36', crewHp: N().menHp, shirt: '#4a5a32', pants: '#3a4228' }).fc.wait = k; }
        }
        if (A.end) return A.end === 2;
        if (P.car !== t || dist(t.x, t.y, A.site.x, A.site.y) > N().parkM * M || carSpeed(t) > 12 * KMH) return false;
        A.end = 1; msLive([9, 10], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => Math.round(dist(A.truck.x, A.truck.y, A.site.x, A.site.y) / M) + ' M TO LAUNCH CONTROL' + (A.alarm ? ' · THE BASE IS AFTER YOU' : ''),
      jump(A) { const t = A.truck; if (P.car !== t) { if (P.car) exitCar(true); enterCar(t); } if (!A.alarm) { t.x = lerp(A.start.x, A.bgate.x, 0.6); t.y = lerp(A.start.y, A.bgate.y, 0.6); } else { t.x = A.site.x + 30; t.y = A.site.y; } t.vx = t.vy = 0; P.x = t.x; P.y = t.y; } }];
  function fail(A) { if (A.truck.dead) return F().dish; return ''; }
  const cuts = {
    'TRACKING DISH': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [3, 4] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [5], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { msBarOff(); SPACE.ms = null; } };
})();

/* ================= S7 - COUNTDOWN ================= */
MSCRIPT.s7 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold();
    const [px, py] = SPACEM.pad; A.pad = { x: px, y: py };
    A.charges = [0.35, 1.6, 2.7, 3.75, 5.2].map(a => { const q = S1.free(px + Math.cos(a) * 125, py + Math.sin(a) * 125, 10);
      const m = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), new THREE.MeshBasicMaterial({ color: 0xff2030 })); m.position.set(q.x, groundH(q.x, q.y) + 3, q.y); scene.add(m); return { x: q.x, y: q.y, m, done: false, k: 0 }; });
    A.men = [[160, -40, 'smg'], [-150, 60, 'pistol'], [40, 170, 'pistol'], [-60, -170, 'smg']].map(([dx, dy, gun]) => { const q = S1.free(px + dx, py + dy, 10); return msFoe(q.x, q.y, Object.assign({ gun, hp: N().menHp, group: 'pad' }, CH4.men)); });
    A.fuse = N().fuse;
  }
  const left = A => A.charges.filter(c => !c.done).length;
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const steps = [
    KAHN.meet('COUNTDOWN'),
    { enter(A) { MS.mark = () => A.charges.find(c => !c.done); MS.guide = () => A.charges.find(c => !c.done); A.on = true; },   // PULL all five charges before the timer runs out
      tick(A, dt) {
        A.fuse -= dt; let pulling = null;
        for (const c of A.charges) {
          if (c.done) continue; c.m.material.color.setHex(Math.sin(gameT * 8) > 0 ? 0xff2030 : 0x401010);
          if (!P.car && dist(P.x, P.y, c.x, c.y) < N().pullM * M) { pulling = c; c.k += dt; if (c.k >= N().pullT) { c.done = true; c.m.visible = false; Snd.tone(660, 330, 0.2, 0.1, 'square'); toast(left(A) ? 'CHARGE PULLED - ' + left(A) + ' LEFT' : 'THE LAST CHARGE!'); } }
          else c.k = Math.max(0, c.k - dt);
        }
        if (pulling && !pulling.done) msBar('PULLING THE CHARGE', pulling.k / N().pullT, '#3dff7a'); else msBar('THE TIMER ' + clock(Math.max(0, A.fuse)), Math.max(0, A.fuse) / N().fuse, '#ff3b4a');
        if (A.end) return A.end === 2; if (left(A) > 0) return false;
        A.end = 1; msBarOff(); msLive([6, 7], { now: true, done: () => { A.end = 2; } }); return false; },
      info: A => left(A) + ' CHARGES · ' + clock(Math.max(0, A.fuse)) + ' · ' + msFoesLeft('pad') + " OF CRANE'S MEN",
      jump(A) { for (const c of A.charges) { c.done = true; c.m.visible = false; } } }];
  function fail(A) {
    if (A.on && !A.end && A.fuse <= 0 && left(A) > 0) { if (!A.boom) { A.boom = true; for (const c of A.charges) if (!c.done) explosion(c.x, c.y, 160, null); } return F().boom; }
    return '';
  }
  const cuts = {
    'COUNTDOWN': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 4, cam: 'WIDE', at: () => A.pad, line: [3] },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [4] },
      { dur: 3, cam: 'CLOSE', at: () => A.iris, line: [5], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { msBarOff(); SPACE.ms = null; if (A && A.charges) for (const c of A.charges) { scene.remove(c.m); c.m.geometry.dispose(); c.m.material.dispose(); } } };
})();

/* ================= S8 - LIFT-OFF ================= */
MSCRIPT.s8 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, M = UNITS_PER_M, face = S1.face, F = () => MS.m.fails;
  const at = (x, y) => ({ x, y });
  function setup(A) {
    SKY.hour = N().hour; KAHN.iris(A); KAHN.start(A); KAHN.hold({ doors: true });
    const [px, py] = SPACEM.pad; A.pad = { x: px, y: py }; A.T = 600; A.wave = 0; A.sab = 0;
  }
  const clock = s => 'T-' + Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const foes = () => msFoesLeft('lift');
  function wave(A, k) {                     // 0: cars at the gate; 1: men at launch control; 2: a boat lands by the pad; 3: cars and men together
    const g = SPACE.gate.g, L = SPACE.lcc;
    const cars2 = n => { SPACE.ms.gate = true; A.gateT = gameT + 12; for (let i = 0; i < n; i++) { const r = S1.road(g.x + 900 + i * 200, g.y), q = kerbBy(r.x, r.y);
      msFoeCar('sedan', q.x, q.y, q.ang, Object.assign({ mode: 'chase', crew: 2, gun: 'smg', group: 'lift', speed: N().carSpeed, color: '#14161d', crewHp: N().menHp }, CH4.men)).fc.wait = i; } };
    const men = n => { for (let i = 0; i < n; i++) { const q = S1.free(L.door.x + 40 + i * 14, L.door.y + (i % 2 ? 30 : -30), 6); msFoe(q.x, q.y, Object.assign({ gun: i % 2 ? 'smg' : 'pistol', hp: N().menHp, group: 'lift', alert: true }, CH4.men)); } };
    if (k === 0) { cars2(2); msLive([5]); }
    else if (k === 1) { men(4); msLive([6]); }
    else if (k === 2) {                      // a speedboat beached west of the pad; three men through the fence, for the pad
      A.boat = msCar('speedboat', A.pad.x - 470, A.pad.y, 0, '#14161d');
      for (let i = 0; i < 3; i++) { const q = S1.free(A.pad.x - N().landM * M, A.pad.y - 40 + i * 40, 6); const p = msFoe(q.x, q.y, Object.assign({ gun: 'pistol', hp: N().menHp, group: 'lift' }, CH4.men)); p.post.step = KAHN.walker([at(A.pad.x - 20 + i * 20, A.pad.y + 60)], 2.2, false); p.wi = 0; p.sapper = true; }
      msLive([7]);
    } else { cars2(2); men(3); msLive([8]); }
  }
  const steps = [
    KAHN.meet('GO FOR LAUNCH'),
    { enter(A) { const L = SPACE.lcc, s = L.spots.iris; Object.assign(A.iris, { x: s.x, y: s.y }); A.iris.post.x = s.x; A.iris.post.y = s.y; face(A.iris, L.spots.screen);   // HOLD launch control and the pad till T-0
        msAllyFrom(A.iris, { who: 'iris', calm: true, stay: true, near: true, hp: N().irisHp, fail: F().iris }); A.iris.shield = false; A.iris.post.step = S1.stay;
        MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'lift') || null; MS.guide = null; msObjective('HOLD LAUNCH CONTROL AND THE PAD - ' + clock(A.T)); },
      tick(A, dt) {
        if (A.launch) return !!A.done;
        if (A.gateT && gameT > A.gateT) { SPACE.ms.gate = false; A.gateT = 0; }
        const th = [540, 390, 240, 120]; while (A.wave < 4 && A.T <= th[A.wave]) wave(A, A.wave++);
        const near = peds.filter(p => p.sapper && !p.dead && dist(p.x, p.y, A.pad.x, A.pad.y) < N().padM * M).length;
        A.sab = near ? A.sab + dt : Math.max(0, A.sab - dt);
        if (A.T > 10 || foes() === 0) A.T = Math.max(0, A.T - dt * N().speed);          // at T-0:10 the clock holds till the center is clear
        msBar(A.T > 10 || foes() === 0 ? clock(A.T) : clock(A.T) + ' - HOLD: CLEAR THE CENTER', 1 - A.T / 600, near ? '#ff3b4a' : '#2bf3ff');
        if (A.T > 0) return false;
        A.launch = true; msBarOff(); msCut('LIFT-OFF', () => { A.done = true; }); return false; },
      info: A => clock(A.T) + ' · ' + foes() + ' ATTACKERS',
      jump(A) { for (const p of peds) if (p.foe && !p.dead && p.group === 'lift') killPed(p, 'gun', false); for (const c of MS_CAST.cars) if (c.fc.group === 'lift' && !c.fc.out) { c.fc.crew = 0; c.fc.out = true; } A.T = Math.min(A.T, [540, 390, 240, 120, 0][A.wave] + 0.01); } }];
  function fail(A) {
    const f = msCastFail(); if (f) return f;
    if (A.sab >= N().sabT) { if (!A.boom) { A.boom = true; explosion(A.pad.x, A.pad.y, 200, null); } return F().pad; }
    return '';
  }
  const cuts = {
    'GO FOR LAUNCH': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [1, 2], enter: () => { face(A.iris, P); } },
      { dur: 3, cam: 'CLOSE', at: () => P, line: [3] },
      { dur: 4, cam: 'CLOSE', at: () => A.iris, line: [4], fadeOut: true }],
    'LIFT-OFF': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.iris, line: [9], enter: () => { face(A.iris, SPACE.lcc.spots.screen); } },
      { dur: 7, cam: 'WIDE', at: () => A.pad, line: [10], enter: () => { SPACE.launch = { t: 0, h: 0 }; }, wait: () => SPACE.launch && SPACE.launch.t > 6, max: 8 },   // ignition, the hold-down, the first metres
      { dur: 6, cam: 'WIDE', at: () => A.pad, line: [11], wait: () => SPACE.launch && SPACE.launch.t > 10, max: 8 },   // up and away: it climbs out of the picture, the smoke stays
      { dur: 6, cam: 'CLOSE', at: () => A.iris, line: [12, 13], fadeOut: true }]
  };
  return { setup, steps, fail, cuts,
    cleanup() { msBarOff(); SPACE.ms = null; SPACE.launch = null; } };
})();
