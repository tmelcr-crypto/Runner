'use strict';
/* ---------- 6zzm. THE STORY'S CHAPTER 4 - THE WAR (M19-M24): the crew's war room and each quest's script ----------
   The war room (modes: warRoom; M19's reward): a room behind a red door on the Palm Heights loft's top floor, in the side-on view
   (js/08t) - a cork board with the photos of Crane's people and red string between them (UP: what the crew knows), the map table
   under a lamp, the crew's chairs round it, a window on the city. Later it moves to the Colony's top floor (the Colony line).
   Choice 2 still counts here: Sachs' files taken to the police mean Holloway buried them - every quest from M19 to M22 starts with a
   star. Choice 3 is made in M22 by where you drive (MS_CHOICE.tip). */
const warRoomAt = h => feat('warRoom') && (MS_UNLOCK.colonyWar ? h.id === 'colony' : h.id === 'loft' && MS_UNLOCK.warRoom);   // js/08t svLayout: the red door on the top floor - the loft's (M19), the Colony's once H8 is passed
function warBoard() {                     // UP at the board: who is on it
  const ch = MS_CHOICE;
  return 'CRANE - HOLLOWAY (POLICE CHIEF) - PRATT (COUNCILMAN) - SACHS' + (ch.files === 'kept' ? ' (HIS FILES: OURS)' : ' (HIS FILES: BURIED)') + ' - MATEO?';
}
function warRoomDraw(g, X, Y, s, time) {  // js/08t drawSide, a room's things: x along the room (0-820), y up from the floor
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(X(x), Y(y + h), w * s, h * s); };
  svWindow(g, X(690), Y(132), 100 * s, 66 * s, s, time);
  R(140, 46, 190, 90, '#5a3a22'); R(146, 52, 178, 78, '#b88a58');                       // the cork board in its frame
  const pins = [[235, 114, 'CRANE', '#d8c8a0', '#e8e4dc'], [168, 82, 'HOLLOWAY', '#a8714a', '#2a3a6a'], [212, 70, 'PRATT', '#f2c6a0', '#3a3a44'],
    [268, 84, 'SACHS', '#d9a074', '#2a2a30'], [304, 108, 'MATEO ?', '#d9a074', '#f4f6fa']];
  g.strokeStyle = '#e0283c'; g.lineWidth = 1.6 * s; g.beginPath();
  for (const [a, b] of [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3]]) { g.moveTo(X(pins[a][0]), Y(pins[a][1])); g.lineTo(X(pins[b][0]), Y(pins[b][1])); }
  g.stroke();
  g.textAlign = 'center'; g.font = 'bold ' + Math.round(6 * s) + 'px Arial';
  for (const [x, y, name, skin, shirt] of pins) {                                         // a photo: a face over a collar, the name under it
    R(x - 13, y - 26, 26, 30, '#f4f1ea'); R(x - 11, y - 14, 22, 16, '#6a7a8a');
    g.fillStyle = shirt; g.fillRect(X(x - 8), Y(y - 12), 16 * s, 6 * s); g.fillStyle = skin; g.beginPath(); g.arc(X(x), Y(y - 4), 5 * s, 0, TAU); g.fill();
    if (name === 'MATEO ?') { g.fillStyle = '#e0283c'; g.font = 'bold ' + Math.round(14 * s) + 'px Arial'; g.fillText('?', X(x), Y(y - 9)); g.font = 'bold ' + Math.round(6 * s) + 'px Arial'; }
    g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(X(x), Y(y + 2), 2 * s, 0, TAU); g.fill();
    g.fillStyle = '#1a1a22'; g.fillText(name, X(x), Y(y - 22));
  }
  const chair = (x, back) => { R(x - 12, 22, 24, 4, '#3a2a1e'); R(x - 11, 0, 3, 22, '#2a1e14'); R(x + 8, 0, 3, 22, '#2a1e14'); R(back > 0 ? x + 9 : x - 12, 22, 3, 30, '#3a2a1e'); };
  chair(440, -1); chair(560, 1);                                                           // two behind the table
  g.strokeStyle = '#8a8070'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(X(500), Y(150)); g.lineTo(X(500), Y(118)); g.stroke();   // the lamp over the table
  R(484, 112, 32, 8, '#2a2a30'); g.fillStyle = 'rgba(255,230,160,.10)'; g.beginPath(); g.moveTo(X(486), Y(112)); g.lineTo(X(410), Y(40)); g.lineTo(X(590), Y(40)); g.lineTo(X(514), Y(112)); g.fill();
  R(400, 34, 200, 6, '#4a3020'); R(406, 0, 8, 34, '#3a2418'); R(586, 0, 8, 34, '#3a2418');          // the map table
  g.fillStyle = '#2a6ab0'; g.beginPath(); g.moveTo(X(404), Y(40)); g.lineTo(X(420), Y(52)); g.lineTo(X(580), Y(52)); g.lineTo(X(596), Y(40)); g.fill();   // the city map on it, seen from the side
  g.fillStyle = '#3f9a5a'; g.beginPath(); g.moveTo(X(440), Y(40)); g.lineTo(X(452), Y(50)); g.lineTo(X(520), Y(51)); g.lineTo(X(548), Y(40)); g.fill();
  R(470, 40, 4, 8, '#e0283c'); R(530, 40, 4, 6, '#ffd23f');                                // pins on the map
  chair(375, 1); chair(625, -1);                                                           // and one at each end
  R(330, 0, 40, 10, '#2a2a30'); R(334, 10, 32, 6, '#7a8a9a');                               // a crate of radios
  g.fillStyle = '#ff3b4a'; g.font = 'bold ' + Math.round(9 * s) + 'px "Arial Black",Arial'; g.fillText('THE CREW', X(235), Y(140));
}

const CH4 = {
  heat() { if (MS_CHOICE.files === 'police') forceWanted(1); },   // Choice 2: Holloway buried Sachs' files - M19 to M22 start with a star
  drop(p) {                                // a friend stays behind here (no longer follows you)
    if (!p || p.dead) return; if (p.aboard) allyAlight(p);
    MS_CAST.allies = MS_CAST.allies.filter(q => q !== p); Object.assign(p, { ally: false, calm: true, arm: -1 }); p.post.step = STORY1.stay; p.state = 'post';
  },
  near(x, y, d0, d1) {                      // a road point between d0 and d1 from (x, y), trying round the compass
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, r = STORY1.road(x + Math.cos(a) * (d0 + d1) / 2, y + Math.sin(a) * (d0 + d1) / 2), d = dist(r.x, r.y, x, y); if (d > d0 && d < d1) return r; }
    return STORY1.road(x + d1, y);
  },
  men: { shirt: '#3a3f4c', pants: '#2a2d36', name: 'craneman' }   // Crane's men's grey suits
};

/* ================= M19 - FIRST STRIKE ================= */
MSCRIPT.m19 = (() => {
  const S1 = STORY1, S2 = STORY2, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  function setup(A) {
    SKY.hour = N().hour; A.mk = S2.market();
    const C = S1.colony(); P.x = C.door.x; P.y = C.door.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;    // MISSIONS TEST: out of the Colony's door at night
    A.mycar = msCar('sports', C.cab.x, C.cab.y, C.cab.a, '#3d6fa8');
    A.rosa = msPed(A.mk.back.x, A.mk.back.y, 0, Object.assign(S1.look('rosa'), { msName: 'rosa', step: S1.stay, spare: true }));
    A.mates = [A.mk.a, A.mk.b].map(q => msPed(q.x, q.y, 0, Object.assign(S1.look('rosaman'), { msName: 'rosaman', step: S1.stay, spare: true })));
    let rk = null; for (const r of RANKS) { const d = dist(r.x, r.y, A.mk.c.x, A.mk.c.y); if (d > 700 && (!rk || d < dist(rk.x, rk.y, A.mk.c.x, A.mk.c.y))) rk = r; }   // Joe's rank: the nearest one a fair drive from the market
    A.rank = rk || RANKS[0]; const j = S1.free(A.rank.x, A.rank.y, 16);
    A.joe = msPed(j.x, j.y, 0, Object.assign(S1.look('joe'), { msName: 'joe', step: S1.stay, spare: true, shield: true }));
    A.cab = msCar('taxi', A.rank.x + 30, A.rank.y + 10, 0, null); A.cab.hp = A.cab.maxhp * 0.25;   // his cab, shot up again
    const S = NEWS.S, rv = CH4.near(S.cx, S.cy, 500, 900), kv = kerbBy(rv.x, rv.y);              // Nina's van against a wall, the car circling it
    A.van = msCar('newsvan', kv.x, kv.y, kv.ang + 0.5, '#f4f6fa'); A.van.hp = A.van.maxhp * 0.4; A.van.noEnter = true;
    const n = S1.free(kv.x, kv.y, 26); A.nina = msPed(n.x, n.y, 0, Object.assign(S1.look('nina'), { msName: 'nina', step: S1.stay, spare: true, shield: true }));
    const ra = S1.road(kv.x + Math.cos(kv.ang) * 160, kv.y + Math.sin(kv.ang) * 160), kc = kerbBy(ra.x, ra.y);
    A.route = [CH4.near(kv.x, kv.y, 1400, 2000), CH4.near(kv.x, kv.y, 2600, 3400)];
    A.car = msFoeCar('sedan', kc.x, kc.y, kc.ang, Object.assign({ mode: 'park', crew: 3, gun: 'pistol', group: 'ninacar', speed: N().carSpeed, to: A.route, color: '#14161d', crewHp: N().menHp }, CH4.men));
    A.wave = 0;
  }
  function wave(A) {                        // a black car pulls up at the market's street and three men get out
    A.wave++; A.waveT = 0; const c0 = A.mk.c, r = CH4.near(c0.x, c0.y, 320, 480);
    A.wcar = msFoeCar('sedan', r.x, r.y, r.a, Object.assign({ mode: 'flee', crew: N().waveMen, gun: A.wave === 3 ? 'smg' : 'pistol', group: 'w', speed: N().carSpeed, to: [A.mk.street], color: '#14161d', crewHp: N().menHp }, CH4.men));
    msLive([A.wave === 1 ? 3 : 4]);
  }
  const fallen = () => { MS_CAST.allies = MS_CAST.allies.filter(q => !(q.dead && q.msName === 'rosaman')); };   // her men may fall
  const steps = [
    msPhone('rosa', [1, 2]),                                                                     // the call
    { enter(A) { CH4.heat(); MS.guide = A.mk.street; MS.mark = () => A.mk.c; },                  // GO TO the market
      tick(A) { return dist(me().x, me().y, A.mk.c.x, A.mk.c.y) < N().marketR * M; },
      info: A => Math.round(dist(me().x, me().y, A.mk.c.x, A.mk.c.y) / M) + " M TO ROSA'S MARKET",
      jump(A) { const c = P.car || A.mycar; if (P.car !== c) { P.x = c.x; P.y = c.y; enterCar(c); } c.x = A.mk.street.x; c.y = A.mk.street.y; c.vx = c.vy = 0; } },
    { enter(A) { MS.guide = null; msAllyFrom(A.rosa, { who: 'rosa', gun: 'smg', hp: N().rosaHp, near: true }); A.mates.forEach(m => msAllyFrom(m, { who: 'rosaman', gun: 'pistol', hp: 220, near: true })); wave(A); },   // HOLD the market
      tick(A, dt) { fallen(); const c = A.wcar; A.waveT += dt;
        if (c && !c.fc.out && !c.dead && (c.fc.gone || A.waveT > 25)) foeBail(c);
        MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'w') || (A.wcar && !A.wcar.fc.out ? A.wcar : null);
        if (msFoesLeft('w') > 0) { A.calm = 0; return false; }
        if ((A.calm = (A.calm || 0) + dt) < N().nextT) return false;
        if (A.wave < N().waves) { wave(A); return false; }
        msLive([5], { now: true }); return true; },
      info: A => 'WAVE ' + A.wave + '/' + N().waves + ' · ' + msFoesLeft('w') + ' LEFT',
      jump(A) { A.wave = N().waves; for (const c of MS_CAST.cars) if (c.fc.group === 'w') { c.fc.crew = 0; c.fc.out = true; } for (const p of peds) if (p.foe && !p.dead && p.group === 'w') killPed(p, 'gun', false); } },
    { enter(A) { CH4.drop(A.rosa); A.mates.forEach(m => CH4.drop(m)); MS.guide = at(A.rank.x, A.rank.y); MS.mark = () => A.joe;   // GO TO Joe's rank before he runs out of shells
        A.joeLeft = N().joeT; msLive([6], { phone: true });
        A.men = [0, 1, 2].map(k => { const q = S1.free(A.joe.x + Math.cos(k * 2.1) * 120, A.joe.y + Math.sin(k * 2.1) * 120, 10); return msFoe(q.x, q.y, Object.assign({ gun: k ? 'pistol' : 'smg', hp: N().menHp, group: 'rank', name: 'craneman' }, CH4.men)); }); },
      tick(A, dt) { A.joeLeft -= dt; msBar('JOE HOLDS OUT', A.joeLeft / N().joeT, '#e6b980'); return dist(me().x, me().y, A.joe.x, A.joe.y) < N().rankM * M; },
      info: A => Math.round(dist(me().x, me().y, A.joe.x, A.joe.y) / M) + " M TO JOE'S RANK · " + Math.max(0, Math.ceil(A.joeLeft)) + ' S',
      jump(A) { const c = P.car || A.mycar; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } const r = S1.road(A.rank.x + 160, A.rank.y); c.x = r.x; c.y = r.y; c.vx = c.vy = 0; } },
    { enter(A) { msBarOff(); MS.guide = null; msAllyFrom(A.joe, { who: 'joe', gun: 'shotgun', hp: N().joeHp, near: true }); for (const m of A.men) foeAlert(m); },   // TAKE OUT Crane's men at the rank
      tick: A => A.men.every(m => m.dead),
      info: A => A.men.filter(m => !m.dead).length + ' LEFT',
      jump(A) { for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); } },
    { enter(A) { CH4.drop(A.joe); msLive([7, 8]); msLive([9], { phone: true }); MS.guide = () => A.car; MS.mark = () => A.car; },   // CHASE the car that ran Nina off the road
      tick(A) { const v = A.car; if (v.fc.mode === 'park' && dist(me().x, me().y, v.x, v.y) < N().spotM * M) { v.fc.wait = 0.5; foeCarGo(v, 'flee'); }
        if (!v.fc.out && !v.dead && v.fc.mode !== 'park' && v.hp < v.maxhp * 0.5) foeBail(v);
        return v.fc.out || v.dead; },
      info: A => Math.round(dist(me().x, me().y, A.car.x, A.car.y) / M) + ' M TO THE CAR · ' + Math.round(100 * A.car.hp / A.car.maxhp) + '%',
      jump(A) { const v = A.car; if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; foeBail(v); } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'ninacar'); },   // TAKE OUT its crew
      tick: () => msFoesLeft('ninacar') === 0,
      info: () => msFoesLeft('ninacar') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'ninacar') killPed(p, 'gun', false); } },
    { enter(A) { MS.guide = () => A.nina; MS.mark = () => A.nina; },                               // CHECK ON Nina: the closing
      tick(A) { if (A.cut || dist(me().x, me().y, A.nina.x, A.nina.y) > N().ninaR * M) return false; A.cut = true; if (P.car) { P.car.vx = P.car.vy = 0; } msCut('THE CREW', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.nina.x, A.nina.y) / M) + ' M TO NINA',
      jump(A) { if (P.car) exitCar(true); P.x = A.nina.x + 20; P.y = A.nina.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.rosa.dead) return F.rosaDead; if (A.joe.dead) return F.joeDead; if (A.nina.dead) return F.ninaDead;
    if (MS.k === 3 && A.joeLeft <= 0) return F.rank;
    if (MS.k === 5 && !A.car.fc.out && !A.car.dead && (A.car.fc.gone || dist(me().x, me().y, A.car.x, A.car.y) > N().away * M)) return F.away;
    return '';
  }
  const cuts = {
    'THE CREW': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [10], enter: () => { face(A.nina, me()); } },
      { dur: 7, cam: 'CLOSE', at: () => me(), line: [11, 12], fadeOut: true }]
  };
  return { setup, steps, fail, cuts };
})();

/* ================= M20 - THE TAPE ================= */
MSCRIPT.m20 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const cop = { shirt: '#1e2a4a', pants: '#141a2a' };                                           // Holloway's crooked cops, in uniform
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;               // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('sports', k0.x, k0.y, k0.ang, '#3d6fa8');
    const C = S1.colony(); A.door = C.door;
    A.esther = msPed(C.door.x - C.door.fx * 6, C.door.y + 22, Math.PI, Object.assign(S1.look('esther'), { msName: 'esther', step: S1.stay, spare: true, shield: true }));
    const pm = MAP.port, x0 = pm ? Math.min(...pm.quays.flat().map(q => q[0])) : P.x, x1 = pm ? Math.max(...pm.quays.flat().map(q => q[0])) : P.x, y0 = pm ? Math.min(...pm.quays.flat().map(q => q[1])) : P.y;
    const g = S1.road((x0 + x1) / 2, y0 - 160), kv = kerbBy(g.x, g.y); A.gate = at(kv.x, kv.y);      // the port's north gate: the van, the patrol car behind it
    A.route = [CH4.near(kv.x, kv.y, 1600, 2200), CH4.near(kv.x, kv.y, 3200, 4200)];
    A.van = msFoeCar('policevan', kv.x, kv.y, kv.ang, Object.assign({ mode: 'park', crew: 2, gun: 'pistol', group: 'cops', speed: N().vanSpeed, to: A.route, color: '#1d2a5a', crewHp: N().menHp }, cop));
    const kp = kerbBy(kv.x - Math.cos(kv.ang) * 70, kv.y - Math.sin(kv.ang) * 70);
    A.patrol = msFoeCar('police', kp.x, kp.y, kv.ang, Object.assign({ mode: 'park', crew: 2, gun: 'pistol', group: 'cops', speed: N().vanSpeed + 15, crewHp: N().menHp }, cop));
    const L = SAFES.find(s => s.id === 'loft'); A.home = at(L.door.x + L.door.fx * 30, L.door.y + L.door.fy * 30);
  }
  const steps = [
    S3.meet('THE PARCEL'),
    { enter(A) { CH4.heat(); MS.guide = A.door; MS.mark = () => A.esther; },                     // GO TO the Colony: Esther and the parcel
      tick(A) { if (A.cut || dist(me().x, me().y, A.esther.x, A.esther.y) > N().colonyR * M) return false; A.cut = true; if (P.car) P.car.vx = P.car.vy = 0;
        msCut('THE TAPE', () => { msLive([6], { phone: true }); msNext(); }); return false; },
      info: A => Math.round(dist(me().x, me().y, A.esther.x, A.esther.y) / M) + ' M TO THE COLONY',
      jump(A) { if (P.car) exitCar(true); P.x = A.esther.x + 20; P.y = A.esther.y + 10; } },
    { enter(A) { MS.guide = A.gate; MS.mark = () => A.van; },                                     // GO TO the port: the van
      tick(A) { return dist(me().x, me().y, A.van.x, A.van.y) < N().portR * M; },
      info: A => Math.round(dist(me().x, me().y, A.van.x, A.van.y) / M) + ' M TO THE POLICE VAN',
      jump(A) { const c = A.mycar; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } const r = S1.road(A.gate.x + 600, A.gate.y - 300); c.x = r.x; c.y = r.y; c.ang = r.a; c.vx = c.vy = 0; } },
    { enter(A) { MS.guide = () => A.van; A.van.fc.wait = 0.6; foeCarGo(A.van, 'flee'); A.patrol.fc.wait = 1.2; foeCarGo(A.patrol, 'chase'); },   // STOP the van
      tick(A) { const v = A.van; if (!v.fc.out && !v.dead && v.hp < v.maxhp * N().bailHp / 100) foeBail(v); return v.fc.out && !v.dead; },
      info: A => Math.round(dist(me().x, me().y, A.van.x, A.van.y) / M) + ' M · THE VAN ' + Math.round(100 * A.van.hp / A.van.maxhp) + '%',
      jump(A) { const v = A.van; if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; foeBail(v); } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'cops') || (A.patrol.fc.out ? null : A.patrol); },   // TAKE OUT the crooked cops
      tick: () => msFoesLeft('cops') === 0,
      info: () => msFoesLeft('cops') + ' LEFT',
      jump() { for (const c of MS_CAST.cars) if (c.fc.group === 'cops') { c.fc.crew = 0; c.fc.out = true; } for (const p of peds) if (p.foe && !p.dead && p.group === 'cops') killPed(p, 'gun', false); } },
    { enter(A) { const v = A.van; v.msDrive = null; v.driver = null; v.thr = v.str = 0; v.noEnter = false; MS.mark = () => A.van; },   // GET IN the van: they called it in
      tick(A) { if (P.car !== A.van) return false; forceWanted(N().stars); msLive([7], { now: true }); return true; },
      info: () => 'GET IN',
      jump(A) { if (P.car) exitCar(true); P.x = A.van.x; P.y = A.van.y; enterCar(A.van); } },
    { enter(A) { MS.mark = () => P.car === A.van ? null : A.van; },                              // LOSE the police, in the van
      tick: A => P.car === A.van && P.stars === 0,
      info: A => P.car === A.van ? P.stars + (P.stars === 1 ? ' STAR' : ' STARS') : 'BACK IN THE VAN',
      jump(A) { clearWanted('YOU LOST THEM'); if (P.car !== A.van) { if (P.car) exitCar(true); P.x = A.van.x; P.y = A.van.y; enterCar(A.van); } } },
    { enter(A) { MS.guide = A.home; MS.mark = () => P.car === A.van ? A.home : A.van; },          // DELIVER the van to the loft
      tick(A) { if (A.fin) return A.fin === 2; if (P.car !== A.van || dist(A.van.x, A.van.y, A.home.x, A.home.y) > N().doorM * M) return false;
        A.fin = 1; A.van.vx = A.van.vy = 0; msLive([8], { now: true, done: () => { A.fin = 2; } }); return false; },
      info: A => P.car === A.van ? Math.round(dist(A.van.x, A.van.y, A.home.x, A.home.y) / M) + ' M TO THE LOFT' : 'BACK IN THE VAN',
      jump(A) { if (P.car !== A.van) { if (P.car) exitCar(true); P.x = A.van.x; P.y = A.van.y; enterCar(A.van); } A.van.x = A.home.x; A.van.y = A.home.y; A.van.vx = A.van.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (MS.k >= 3 && A.van.dead) return F.vanDead;
    if (MS.k === 3 && !A.van.fc.out && (A.van.fc.gone || dist(me().x, me().y, A.van.x, A.van.y) > N().away * M)) return F.away;
    return '';
  }
  const cuts = {
    'THE PARCEL': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [1], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [2], fadeOut: true }],
    'THE TAPE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.esther, line: [3], enter: () => { face(A.esther, me()); } },
      { dur: 6, cam: 'CLOSE', at: () => me(), line: [4], phone: true },
      { dur: 4, cam: 'CLOSE', at: () => me(), line: [5], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();

/* ================= M21 - THE COUNCILMAN ================= */
MSCRIPT.m21 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const kept = () => MS_CHOICE.files === 'kept';
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;               // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('sports', k0.x, k0.y, k0.ang, '#3d6fa8');
    const G = GOLF.S; GOLF.ms = true; A.G = G;                                                   // the quest holds the clubhouse: the door open, only Pratt's party inside
    A.pratt = msPed(G.table.x, G.table.y, 0, Object.assign(S1.look('pratt'), { msName: 'pratt', step: S1.stay, spare: true, shield: true }));
    const b1 = golfWorld(-G.hw + 40, -G.hd + 34), b2 = golfWorld(G.hw - 30, G.hd - 22);
    A.guards = [b1, b2].map((q, k) => msFoe(q.x, q.y, Object.assign({ gun: k ? 'smg' : 'pistol', hp: N().menHp, group: 'pratt', a: G.a }, CH4.men)));
    const pc = golfWorld(-40, G.hd + 40); A.carAt = pc;
    A.car = msFoeCar('sedan', pc.x, pc.y, G.a + Math.PI / 2, { mode: 'park', crew: 0, gun: null, group: 'prattcar', speed: N().carSpeed, color: '#f4f6fa' });
    A.route = [CH4.near(G.cx, G.cy, 1500, 2100), CH4.near(G.cx, G.cy, 3000, 3800)];
  }
  function run(A) {                         // the call made: his men fight, Pratt runs for his car, Holloway's cops are on the way
    if (A.ran) return; A.ran = true; forceWanted(N().stars); for (const g of A.guards) foeAlert(g); msLive([10], { now: true });
    const p = A.pratt; p.shield = false; p.way = [golfWorld(0, -10), golfWorld(0, A.G.hd - 16), golfWorld(0, A.G.hd + 22), allyDoor(A.car, p)]; p.wi = 0;   // round the tables, out of the door
    p.post.step = (q, dt) => { if (q.state === 'flee') q.state = 'post'; if (q.wi >= q.way.length) return S1.stay(q, dt);   // the shots don't scare him off his way
      const t = q.way[q.wi]; if (walkTo(q, t.x, t.y, NPC_RUN * 0.9, dt) < 14) q.wi++; return true; };
  }
  const steps = [
    S3.meet('THE COUNCILMAN'),
    { enter(A) { CH4.heat(); MS.guide = A.G.door; MS.mark = () => A.pratt; },                    // GO TO the golf club
      tick(A) { return dist(me().x, me().y, A.G.inside.x, A.G.inside.y) < N().clubR * M && !P.car; },
      info: A => P.car && dist(P.car.x, P.car.y, A.G.door.x, A.G.door.y) < 40 * M ? 'ON FOOT, IN AT THE DOOR' : Math.round(dist(me().x, me().y, A.G.door.x, A.G.door.y) / M) + ' M TO THE GOLF CLUB',
      jump(A) { if (P.car) exitCar(true); P.x = A.G.inside.x; P.y = A.G.inside.y; } },
    { enter(A) { MS.guide = null; MS.mark = () => A.pratt; },                                     // TALK TO Pratt: the files decide
      tick(A) {
        if (A.fin) return true;
        if (A.cut || P.car || dist(P.x, P.y, A.pratt.x, A.pratt.y) > N().prattR * M) return false;
        A.cut = true; face(A.pratt, P); P.ang = Math.atan2(A.pratt.y - P.y, A.pratt.x - P.x);
        if (kept()) msCut('THE FILES', () => { A.choice = null; msLive([13], { phone: true, done: () => { A.fin = true; } }); });
        else msCut('THE CALL', () => { run(A); A.fin = true; });
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.pratt.x, A.pratt.y) / M) + ' M TO PRATT',
      jump(A) { if (P.car) exitCar(true); P.x = A.pratt.x + 20; P.y = A.pratt.y; } },
    { enter(A) { MS.mark = () => A.guards.find(g => !g.dead); },                                  // TAKE OUT his bodyguards (files to the police)
      tick(A) { if (kept()) return true; walkOff(A); if (A.drove) A.car.fc.speed = N().carSpeed * N().slowK; return A.guards.every(g => g.dead); },   // he takes it easy while his men have you
      info: A => A.guards.filter(g => !g.dead).length + ' LEFT',
      jump(A) { for (const g of A.guards) if (!g.dead) killPed(g, 'gun', false); } },
    { enter(A) { MS.mark = () => A.drove ? A.car : A.pratt; MS.guide = () => A.drove ? A.car : A.pratt; A.car.fc.speed = N().carSpeed; },   // STOP his car - he must live
      tick(A) { if (kept()) return true; walkOff(A); const v = A.car;
        if (!A.drove || A.caught) return !!A.done;
        if (v.dead || v.hp > v.maxhp * N().bailHp / 100) return false;
        A.caught = true; v.msDrive = null; v.driver = null; v.thr = v.str = 0; v.hb = true;
        const q = S1.free(v.x, v.y, 30); A.pratt = msPed(q.x, q.y, 0, Object.assign(S1.look('pratt'), { msName: 'pratt', step: S1.stay, spare: true, shield: true }));
        msCut('CAUGHT', () => { msLive([13], { phone: true, done: () => { A.done = true; } }); }); return false; },
      info: A => A.drove ? Math.round(dist(me().x, me().y, A.car.x, A.car.y) / M) + " M · PRATT'S CAR " + Math.round(100 * A.car.hp / A.car.maxhp) + '%' : 'PRATT IS RUNNING FOR HIS CAR',
      jump(A) { walkOff(A, true); const v = A.car; v.hp = v.maxhp * 0.3; } }];
  function walkOff(A, now) {                // Pratt at his car's door: in, and away
    const p = A.pratt; if (A.drove || !A.ran) return;
    if (!now && (p.dead || p.wi < p.way.length && !(p.wi === p.way.length - 1 && dist(p.x, p.y, A.car.x, A.car.y) < 36))) return;   // at its door - or right by the car
    A.drove = true; const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1);
    const v = A.car; v.fc.to = A.route; v.fc.ti = 0; v.fc.wait = 0.6; foeCarGo(v, 'flee');
  }
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (A.pratt && A.pratt.dead && !A.drove) return F.prattDead;
    if (A.drove && !A.caught) { if (A.car.dead) return F.prattDead; if (MS.k === 4 && (A.car.fc.gone || dist(me().x, me().y, A.car.x, A.car.y) > N().away * M)) return F.away; }
    return '';
  }
  const cuts = {
    'THE COUNCILMAN': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'THE FILES': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.pratt, line: [4] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [5] },
      { dur: 7, cam: 'CLOSE', at: () => A.pratt, line: [6, 7], fadeOut: true }],
    'THE CALL': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.pratt, line: [4] },
      { dur: 5, cam: 'CLOSE', at: () => A.pratt, line: [8] },
      { dur: 4, cam: 'CLOSE', at: () => A.pratt, line: [9], fadeOut: true }],
    'CAUGHT': A => [
      { dur: 6, cam: 'CLOSE', at: () => A.pratt, line: [11], enter: () => { face(A.pratt, me()); } },
      { dur: 4, cam: 'CLOSE', at: () => me(), line: [12], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; GOLF.ms = null; } };
})();

/* ================= M22 - THE TIP ================= */
MSCRIPT.m22 = (() => {
  const S1 = STORY1, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const cop = { shirt: '#1e2a4a', pants: '#141a2a' };
  function setup(A) {
    SKY.hour = N().hour; const L = SAFES.find(s => s.id === 'loft');
    P.x = L.door.x + L.door.fx * 30; P.y = L.door.y + L.door.fy * 30; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: at the loft's door, a car at the kerb
    const k0 = kerbBy(P.x + 40, P.y); A.mycar = msCar('sports', k0.x, k0.y, k0.ang, '#3d6fa8');
    const F = FACT, s0 = F.silos[0]; A.silo = S1.free(s0[0], s0[1] + s0[2] * 1.8, 14);            // the foot of the first silo, looking down on the yard
    A.yard = F.vlot ? at(F.vlot[0], F.vlot[1]) : S1.free(F.gate.x + 90, F.gate.y + 60, 10); A.road = S1.road(F.gate.x + 60, F.gate.y);   // the works' car park by the gate, below the silos
    A.pol = serviceDoor('police', P.x, P.y); A.sus = 0;
  }
  function meeting(A, own) {                // the yard: Holloway, Crane's men and their car; his cruiser
    const y = A.yard;
    if (!A.cruiser) A.cruiser = msFoeCar('police', y.x + 40, y.y - 30, Math.PI / 2, { mode: 'park', crew: 0, gun: null, group: 'hol', speed: 120, tough: 50 });
    A.crane = msCar('sedan', y.x - 40, y.y - 30, Math.PI / 2, '#14161d');
    const c = A.cruiser, h = S1.free(c.x - 20, c.y + 26, 8);
    A.hol = msPed(h.x, h.y, 0, Object.assign(S1.look('holloway'), { msName: 'holloway', step: S1.stay, spare: true, shield: true })); A.hol.hp = 1e5;
    A.men = [0, 1, 2, 3].map(k => { const q = S1.free(y.x - 50 + (k % 2) * 20, y.y + 14 + (k >> 1) * 18, 6); return msFoe(q.x, q.y, Object.assign({ gun: k === 0 ? 'smg' : 'pistol', hp: N().menHp, group: 'meet', a: 0 }, CH4.men)); });
    if (!own) A.men.push(...[0, 1].map(k => { const q = S1.free(c.x + 24 + k * 18, c.y + 30, 6); return msFoe(q.x, q.y, Object.assign({ gun: 'pistol', hp: N().menHp, group: 'meet', a: Math.PI }, cop)); }));
    face(A.hol, A.men[0]); face(A.men[0], A.hol);
  }
  function getAway(A) {                     // Holloway into his cruiser and gone (he can't be stopped tonight)
    if (A.gone) return; A.gone = true; msLive([8], { now: true });
    const i = peds.indexOf(A.hol); if (i >= 0) peds.splice(i, 1);
    const c = A.cruiser; c.fc.to = [A.road, CH4.near(A.road.x, A.road.y, 2600, 3400)]; c.fc.ti = 0; c.fc.wait = 0.8; c.fc.speed = 120; foeCarGo(c, 'flee');
  }
  function suspicion(A, dt) {               // your own way: close behind him for long and he notices
    const c = A.cruiser, d = dist(me().x, me().y, c.x, c.y) / M;
    A.sus = clamp(A.sus + (d < N().closeM ? N().closeRate : -N().coolRate) * dt, 0, 1); msBar('SUSPICION', A.sus); A.d = d;
  }
  const steps = [
    msPhone('anon', [1, 2, 3]),                                                                     // the call
    { enter(A) { CH4.heat(); msLive([4], { phone: true }); MS.mark = () => Math.floor(gameT / 2) % 2 ? A.pol : A.silo; },   // CHOOSE: the silos, or the police station
      tick(A) { const o = me();
        if (dist(o.x, o.y, A.silo.x, A.silo.y) < N().siloR * M) { A.way = 'told'; A.choice = 'TIP TRUSTED'; return true; }
        if (dist(o.x, o.y, A.pol.x, A.pol.y) < N().stationR * M) { A.way = 'own'; A.choice = 'OWN WAY'; return true; }
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.silo.x, A.silo.y) / M) + ' M TO THE SILOS · ' + Math.round(dist(me().x, me().y, A.pol.x, A.pol.y) / M) + ' M TO THE POLICE',
      jump(A) { const t = MS_CHOICE.tip === 'own way' ? A.pol : A.silo; if (P.car) exitCar(true); P.x = t.x; P.y = t.y; } },
    { enter(A) {                                                                                   // THE MEETING: wait at the silos - or tail Holloway
        MS.guide = null; A.t = 0;
        if (A.way === 'told') { msObjective('WAIT BY THE SILOS - THE MEETING IS AT MIDNIGHT'); MS.mark = () => A.silo; return; }
        msObjective("TAIL HOLLOWAY'S CRUISER - STAY WELL BACK"); msLive([5], { phone: true });
        const k = kerbBy(A.pol.x + 40, A.pol.y + 30), route = [A.road, A.yard];
        A.cruiser = msFoeCar('police', k.x, k.y, k.ang, { mode: 'flee', crew: 0, gun: null, group: 'hol', speed: N().carSpeed, to: route, tough: 50 }); A.cruiser.fc.wait = 3;
        A.escort = [1, 2].map(n => { const q = kerbBy(k.x - Math.cos(k.ang) * 80 * n, k.y - Math.sin(k.ang) * 80 * n);
          const e = msFoeCar('police', q.x, q.y, k.ang, Object.assign({ mode: 'flee', crew: 2, gun: null, group: 'meet', speed: N().carSpeed, to: [A.road, S1.free(A.yard.x + 40 * n, A.yard.y - 60, 12)], crewHp: N().menHp }, cop)); e.fc.wait = 3 + n; return e; });
        MS.mark = () => A.cruiser; },
      tick(A, dt) {
        if (A.cut) return !!A.met;
        if (A.way === 'told') { if (dist(me().x, me().y, A.silo.x, A.silo.y) < N().siloR * M) A.t += dt; if (A.t < N().waitT) return false; meeting(A, false); }
        else { suspicion(A, dt); if (!A.cruiser.fc.gone) return false; msBarOff(); meeting(A, true); for (const e of A.escort) if (!e.fc.out && !e.dead) foeBail(e); }
        A.cut = true; msCut('THE MEETING', () => { A.met = true; }); return false; },
      info: A => A.way === 'told' ? (A.t > 0 ? 'MIDNIGHT IN ' + Math.max(0, Math.ceil(N().waitT - A.t)) + ' S' : Math.round(dist(me().x, me().y, A.silo.x, A.silo.y) / M) + ' M TO THE SILOS') : Math.round(A.d || 0) + ' M BEHIND HIM (LOST AT ' + N().lostM + ')',
      jump(A) { if (A.way === 'told') { if (P.car) exitCar(true); P.x = A.silo.x; P.y = A.silo.y; A.t = N().waitT; } else { A.sus = 0; const c = A.cruiser; c.x = A.yard.x; c.y = A.yard.y; c.fc.gone = true; for (const e of A.escort) { e.x = A.yard.x + 60; e.y = A.yard.y - 60; } if (P.car) exitCar(true); P.x = A.yard.x + 200; P.y = A.yard.y; } } },
    { enter(A) { msBarOff(); for (const m of A.men) foeAlert(m); A.runT = 1.2; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'meet'); },   // TAKE OUT Crane's men and his cops
      tick(A, dt) { if ((A.runT -= dt) <= 0) getAway(A);
        if (msFoesLeft('meet') > 0) return false;
        if (!A.end) { A.end = true; msLive([9], { phone: true, done: () => { A.fin = true; } }); }
        return !!A.fin; },
      info: () => msFoesLeft('meet') + ' LEFT',
      jump() { for (const c of MS_CAST.cars) if (c.fc.group === 'meet') { c.fc.crew = 0; c.fc.out = true; } for (const p of peds) if (p.foe && !p.dead && p.group === 'meet') killPed(p, 'gun', false); } }];
  function fail(A) {
    const F = MS.m.fails;
    if (MS.k === 2 && A.way === 'own' && !A.cut) { if (A.sus >= 1) return F.spotted; if ((A.d || 0) > N().lostM) return F.lost; }
    return '';
  }
  const cuts = {
    'THE MEETING': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.hol, line: [6] },
      { dur: 6, cam: 'CLOSE', at: () => A.men[0], line: [7], fadeOut: true }]
  };
  return { setup, steps, fail, cuts };
})();

/* ================= M23 - BADGE ================= */
MSCRIPT.m23 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  const cop = { shirt: '#1e2a4a', pants: '#141a2a' };
  function bridge() {                       // the long bridge from Mercado to Fairway Isles (the longest span): its west end and the middle
    let best = null, bl = 0;
    for (const b of BRIDGES) { const a = edgeAt(b.e, b.s0, {}), c = edgeAt(b.e, b.s1, {}), l = dist(a.x, a.y, c.x, c.y); if (l > bl) { bl = l; best = { a, c }; } }
    const { a, c } = best, d = dist(a.x, a.y, c.x, c.y), ux = (c.x - a.x) / d, uy = (c.y - a.y) / d;
    return { a: at(a.x, a.y), mid: at(a.x + ux * d * 0.45, a.y + uy * d * 0.45), block: at(a.x + ux * d * 0.52, a.y + uy * d * 0.52), ux, uy };
  }
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;               // MISSIONS TEST: in the newsroom, a sports car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('sports', k0.x, k0.y, k0.ang, '#3d6fa8');
    A.B = bridge(); const B = A.B, side = { x: -B.uy, y: B.ux };                                  // the honest cops' roadblock across the bridge
    A.block = [-1, 1].map(s => msCar('police', B.block.x + side.x * s * 22, B.block.y + side.y * s * 22, Math.atan2(side.y, side.x), null));
    A.honest = [-1, 1].map(s => msPed(B.block.x + B.ux * 24 + side.x * s * 30, B.block.y + B.uy * 24 + side.y * s * 30, Math.atan2(-B.uy, -B.ux), Object.assign({ step: S1.stay, spare: true, shield: true }, cop)));
    A.ninaAt = at(B.block.x + B.ux * 40, B.block.y + B.uy * 40);
  }
  function wreck(A) {                       // your car is done for; round the corner a black town car waits, the keys in it
    A.wrecked = true; const c = P.car;
    if (c) { exitCar(true); c.hp = c.maxhp * 0.06; c.noEnter = true; c.vx *= 0.2; c.vy *= 0.2; }
    toast('YOUR CAR IS WRECKED', true); Snd.smash && Snd.smash('booth', 1);
    const h = A.hol, d = Math.max(1, dist(P.x, P.y, h.x, h.y)), r = S1.road(P.x + (h.x - P.x) / d * N().keysM, P.y + (h.y - P.y) / d * N().keysM), k = kerbBy(r.x, r.y);
    for (let i = cars.length - 1; i >= 0; i--) if (!cars[i].ms && cars[i] !== P.car && !stMine(cars[i]) && dist(cars[i].x, cars[i].y, k.x, k.y) < 40) cars.splice(i, 1);
    A.town = msCar('sedan', k.x, k.y, k.ang, '#14161d'); popup(k.x, k.y - 14, 'A BLACK TOWN CAR - THE KEYS IN IT', '#b6ff3c');
    h.fc.speed = N().carSpeed * N().slowK;
  }
  const lost = A => dist(me().x, me().y, A.hol.x, A.hol.y) > N().lostM * M;
  const steps = [
    S3.meet('BADGE'),
    { enter(A) {                                                                                   // CHASE him: his loyal cops come for you
        const S = NEWS.S, r = CH4.near(S.cx, S.cy, 300, 520), k = kerbBy(r.x, r.y), B = A.B;
        A.route = [CH4.near(B.a.x, B.a.y, 1400, 2000), B.a, B.mid];
        A.hol = msFoeCar('police', k.x, k.y, k.ang, { mode: 'flee', crew: 0, gun: null, group: 'hol', speed: N().carSpeed, to: A.route, tough: N().tough }); A.hol.fc.wait = 1.5;
        const n = A.nina; n.x = n.post.x = A.ninaAt.x; n.y = n.post.y = A.ninaAt.y; face(n, B.a);    // Nina is off to the bridge
        forceWanted(N().stars); msLive([4]); A.t = 0; MS.guide = () => A.hol; MS.mark = () => A.hol;
        const v = CH4.near(S.cx, S.cy, 700, 1000); A.van = msFoeCar('policevan', v.x, v.y, v.a, Object.assign({ mode: 'chase', crew: 2, gun: 'pistol', group: 'loyal', speed: 105 }, cop)); },
      tick(A, dt) { if (P.car) A.t += dt; if (A.t < N().wreckT) return false; wreck(A); return true; },
      info: A => Math.round(dist(me().x, me().y, A.hol.x, A.hol.y) / M) + ' M BEHIND HOLLOWAY (LOST AT ' + N().lostM + ')',
      jump(A) { const c = P.car || A.mycar; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } A.t = N().wreckT; } },
    { enter(A) { MS.guide = () => A.town; MS.mark = () => A.town; },                              // GET IN the town car
      tick(A) { if (P.car !== A.town) return false; A.hol.fc.speed = N().carSpeed; msLive([5], { now: true }); return true; },
      info: A => Math.round(dist(P.x, P.y, A.town.x, A.town.y) / M) + ' M TO THE TOWN CAR',
      jump(A) { if (P.car) exitCar(true); P.x = A.town.x; P.y = A.town.y; enterCar(A.town); } },
    { enter(A) { MS.guide = () => A.hol; MS.mark = () => A.hol; },                                // CATCH UP: on to the bridge
      tick(A) { if (A.cut) return !!A.done;
        if (!A.hol.fc.gone || dist(me().x, me().y, A.hol.x, A.hol.y) > N().arriveM * M) return false;
        A.cut = true; clearWanted('HOLLOWAY IS UNDER ARREST'); if (P.car) P.car.vx = P.car.vy = 0;
        const h = S1.free(A.hol.x + A.B.ux * 30, A.hol.y + A.B.uy * 30, 10); A.chief = msPed(h.x, h.y, 0, Object.assign(S1.look('holloway'), { msName: 'holloway', step: S1.stay, spare: true, shield: true }));
        msCut('THE BRIDGE', () => { A.done = true; }); return false; },
      info: A => A.hol.fc.gone ? Math.round(dist(me().x, me().y, A.hol.x, A.hol.y) / M) + ' M - HE IS STUCK AT THE ROADBLOCK' : Math.round(dist(me().x, me().y, A.hol.x, A.hol.y) / M) + ' M BEHIND HOLLOWAY',
      jump(A) { const h = A.hol, B = A.B; h.x = B.mid.x; h.y = B.mid.y; h.vx = h.vy = 0; h.fc.gone = true; const c = P.car || A.town; if (P.car !== c) { if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); } c.x = B.mid.x - B.ux * 400; c.y = B.mid.y - B.uy * 400; c.vx = c.vy = 0; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (MS.k >= 1 && A.hol && !A.cut) { if (A.hol.dead) return F.dead; if (lost(A)) return F.lost; }
    return '';
  }
  const cuts = {
    'BADGE': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }],
    'THE BRIDGE': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [6], enter: () => { face(A.nina, A.chief); } },
      { dur: 5, cam: 'CLOSE', at: () => A.chief, line: [7], enter: () => { A.honest.forEach((c, i) => { c.x = c.post.x = A.chief.x + (i ? 14 : -14); c.y = c.post.y = A.chief.y + 6; face(c, A.chief); }); face(A.chief, A.nina); } },
      { dur: 4, cam: 'CLOSE', at: () => A.nina, line: [8], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();

/* ---------- the PENTHOUSE tower as a quest's side-on building (M24): flats on every floor, Pratt's party on the top one ---------- */
function sbParty() {
  const L = SAFES.find(s => s.id === 'penthouse'); if (!L) return null;
  return { id: 'party', kind: 'party', name: 'PENTHOUSE TOWER', floors: L.floors, home: -1, door: L.door };
}
function partyLayout(h) {                 // js/08zzj sbLayout: the flats locked; floor 20's wide door is the penthouse
  const doors = [];
  for (let f = 1; f <= h.floors; f++) {
    if (f === h.floors) doors.push({ f, x: 300, n: f * 100 + 1, name: 'APT ' + (f * 100 + 1), shut: true }, { f, x: 1010, n: f * 100 + 9, name: 'THE PENTHOUSE', crane: true, party: true, wide: true });
    else [240, 520, 820, 1110].forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, name: 'APT ' + (f * 100 + k + 1), shut: true }));
  }
  return { W: 1400, doors, plants: [380, 680, 960], up: f => f % 2 === 0 ? 1290 : 110, tint: '#1f2238', carpet: '#3a2050', lobby: 'THE PENTHOUSE' };
}
function partyDraw(g, X, Y, s, time, M) { // js/08zzj sbDraw, the penthouse: the glass wall on the city, the bar, the disco ball, the guests, Pratt, Nina's camera
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(X(x), Y(y + h), w * s, h * s); };
  svWindow(g, X(240), Y(140), 620 * s, 96 * s, s, time);
  g.textAlign = 'center'; g.fillStyle = '#ff2bd6'; g.font = 'bold ' + Math.round(11 * s) + 'px "Arial Black",Arial'; g.fillText('THE PENTHOUSE', X(160), Y(118));
  R(110, 0, 100, 34, '#3a2a3a'); R(106, 34, 108, 5, '#c8a040'); for (let k = 0; k < 6; k++) R(118 + k * 14, 39, 5, 10 + (k % 3) * 3, ['#3dff7a', '#ffd23f', '#2bf3ff'][k % 3]);   // the bar
  const bx = 470, by = 126; g.strokeStyle = '#8a8a96'; g.lineWidth = s; g.beginPath(); g.moveTo(X(bx), Y(150)); g.lineTo(X(bx), Y(by + 8)); g.stroke();
  for (let k = 0; k < 5; k++) { const a = time * 0.9 + k * 1.26, ex = bx + Math.cos(a) * 260;   // the disco ball's beams sweeping the floor
    g.fillStyle = ['rgba(255,43,214,.13)', 'rgba(43,243,255,.13)', 'rgba(255,210,63,.12)', 'rgba(61,255,122,.12)', 'rgba(162,89,255,.13)'][k];
    g.beginPath(); g.moveTo(X(bx), Y(by)); g.lineTo(X(ex - 30), Y(0)); g.lineTo(X(ex + 30), Y(0)); g.closePath(); g.fill(); }
  g.fillStyle = '#d8dce8'; g.beginPath(); g.arc(X(bx), Y(by), 8 * s, 0, TAU); g.fill();
  for (let k = 0; k < 8; k++) R(250 + k * 40, -2, 40, 4, (Math.floor(time * 4) + k) % 2 ? '#ff2bd6' : '#2bf3ff');   // the dance floor
  [[270, '#ff7ab6', '#1a1a20'], [330, '#2bf3ff', '#2a2a3a'], [395, '#ffd23f', '#3a2a1a'], [450, '#e8e8ee', '#1d2230'], [700, '#a259ff', '#1a1a20'], [770, '#3dffa6', '#2a3a5a']].forEach(([x, sh, lg], i) =>
    svPerson(g, X(x + Math.sin(time * 2 + i) * 6), Y(Math.abs(Math.sin(time * 4 + i)) * 3), s, sh, lg, ['#f2c6a0', '#d9a074', '#a8714a'][i % 3], i % 2 ? 1 : -1, time * 6 + i, ['#2a1a12', '#e8c070', '#1a1a1a'][i % 3]));
  const it = M && M.item, px = it ? it.x : 600;                                           // Pratt by the glass, a drink in his hand
  svPerson(g, X(px), Y(0), s, '#9ab8dc', '#9ab8dc', '#eac6a8', -1, 0, '#f0eeea'); R(px - 15, 36, 3, 6, '#ffd98a');
  if (it && !it.got) { g.strokeStyle = 'rgba(182,255,60,' + (0.5 + 0.5 * Math.sin(time * 5)).toFixed(2) + ')'; g.lineWidth = 3 * s; g.strokeRect(X(px - 18), Y(70), 36 * s, 72 * s); }
  if (M && M.mate) { const nx = clamp(SV.x - 40, 100, 840), m = M.mate;                  // Nina, her camera on her shoulder
    svPerson(g, X(nx), Y(0), s, m.shirt || '#d4a020', m.legs || '#1a1a20', '#f2c6a0', 1, 0, m.hair || '#141418'); R(nx + 4, 46, 12, 8, '#1a1a20');
    if (it && it.got && Math.floor(time * 2) % 2) { g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(X(nx + 12), Y(57), 2 * s, 0, TAU); g.fill(); } }
}

/* ================= M24 - PENTHOUSE PARTY ================= */
MSCRIPT.m24 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face, M = UNITS_PER_M;
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.inside.x; P.y = S.inside.y; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;               // MISSIONS TEST: in the newsroom, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('sports', k0.x, k0.y, k0.ang, '#3d6fa8');
    A.h = sbParty(); const d = A.h.door; A.at = at(d.x + d.fx * 12, d.y + d.fy * 12);
    SB.ms = { for: 'party', open: true, liftTop: N().liftTop, spotted: false,                    // the lift to 16 tonight; his bodyguards on 17, 18 and 19
      guards: [sbGuard(17, 170, 1240, 700, 1), sbGuard(18, 170, 1240, 400, -1), sbGuard(19, 420, 1240, 900, -1)],
      item: { fl: A.h.floors, room: 'THE PENTHOUSE', x: 600, label: 'PRATT  ·  ▲ ROLL THE CAMERA', toast: "NINA'S CAMERA IS ROLLING", got: false } };
  }
  function goIn(A) {                        // in at the tower's door with Nina (she walks a few steps behind you in there)
    const n = A.nina; if (!n.hidden) { if (n.aboard) allyAlight(n); MS_CAST.allies = MS_CAST.allies.filter(q => q !== n); const i = peds.indexOf(n); if (i >= 0) peds.splice(i, 1); n.hidden = true; }
    if (!SB.ms.mate) SB.ms.mate = { x: 40, fl: 0, face: 1, shirt: CHARS.nina.shirt, legs: CHARS.nina.pants, hair: '#141418' };
    sbUse(A.h);
  }
  const ninaNear = A => A.nina.hidden || A.nina.aboard === P.car && P.car || dist(A.nina.x, A.nina.y, P.x, P.y) < N().ninaR * M;
  const steps = [
    S3.meet('THE PARTY'),
    { enter(A) { msAllyFrom(A.nina, { who: 'nina', calm: true, hp: 400 }); MS.guide = A.at; MS.mark = () => A.at; },   // GO TO the tower with Nina
      tick(A) { if (SV.on && SV.h.id === 'party') { msLive([4], { now: true }); return true; }
        if (!MS.start && !P.car && dist(P.x, P.y, A.at.x, A.at.y) < N().doorM * M) { if (ninaNear(A)) MS.start = { at: () => A.at, label: 'THE PENTHOUSE', go2: 'GO IN', go: () => goIn(A) }; }
        else if (MS.start && (P.car || !ninaNear(A))) MS.start = null;
        return false; },
      info: A => SV.on ? 'INSIDE' : !ninaNear(A) && dist(P.x, P.y, A.at.x, A.at.y) < N().doorM * M ? 'WAIT FOR NINA' : Math.round(dist(me().x, me().y, A.at.x, A.at.y) / M) + ' M TO THE PENTHOUSE TOWER',
      jump(A) { if (P.car) exitCar(true); P.x = A.at.x; P.y = A.at.y; P.vx = P.vy = 0; MS.start = null; if (!SV.on) goIn(A); } },
    { enter(A) { MS.guide = null; MS.mark = null; },                                             // SNEAK up to the party
      tick(A) { if (!SV.on) { if (!MS.start && !P.car && dist(P.x, P.y, A.at.x, A.at.y) < N().doorM * M) MS.start = { at: () => A.at, label: 'THE PENTHOUSE', go2: 'GO IN', go: () => goIn(A) }; return false; }
        return SV.fl === A.h.floors && !SV.lift; },
      info: A => SV.on ? (SV.fl >= A.h.floors ? 'THE PENTHOUSE: THE WIDE DOOR' : 'FLOOR ' + SV.fl + ' - THE PARTY IS ON ' + A.h.floors) : 'BACK IN AT THE DOOR',
      jump(A) { if (!SV.on) goIn(A); SV.fl = A.h.floors; SV.x = 900; SV.fade = 0; } },
    { enter(A) { },                                                                               // TALK TO Pratt: the confession on camera
      tick(A) { const it = SB.ms && SB.ms.item;
        if (!SV.on && !(it && it.got) && !MS.start && !P.car && dist(P.x, P.y, A.at.x, A.at.y) < N().doorM * M) MS.start = { at: () => A.at, label: 'THE PENTHOUSE', go2: 'GO IN', go: () => goIn(A) };   // out before the confession: back in at the door
        if (!it || !it.got) return false;
        if (!A.said) { A.said = true; msSay([5, 6, 7, 8, 9], () => { A.fin = true; }); } return !!A.fin; },
      info: () => SV.on && SV.room && SV.room.party ? 'PRATT, BY THE GLASS' : 'THE WIDE DOOR ON FLOOR 20',
      jump(A) { if (!SV.on) goIn(A); SV.fl = A.h.floors; const d = SV.B.doors.find(o => o.party); SV.room = { door: d, crane: true, party: true, W: 900 }; SV.x = 560; SB.ms.item.got = true; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina && A.nina.dead) return F.ninaDead;
    if (SB.ms && SB.ms.spotted) return F.spotted;
    return '';
  }
  const cuts = {
    'THE PARTY': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.nina, line: [1, 2], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [3], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();
