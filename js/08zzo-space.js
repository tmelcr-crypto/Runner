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
