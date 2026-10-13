'use strict';
/* ---------- 6zt. SKYLINE ONE: the construction site at work (js/01j site; places table: Construction site; the site and the tower: js/10v) ----------
   Drive or walk up the half-built tower deck by deck (its ramps up the side strips) and off the launch ramp on the top deck, out over
   the avenue: a car that leaves a deck's edge high up flies (js/07 stepCar) and a hard landing damages it. The plank ramps and the dirt
   mounds in the yard throw a fast car into the air the same way: it follows their surface, and where the ground drops away faster than
   it can fall, it takes off. By day the gate is open, workers in hi-vis walk the yard and stand on the decks, the cement mixer's drum
   turns, the digger digs at the pit and a dump truck shuttles across the yard - all three yours to take. At night the gate is shut; a
   guard with a torch walks the yard, and if he sees you inside (in through the broken panel on the north street) you get a star.
   A weapon waits on the top deck and health or armour three decks up; taken, they come back a while after you have gone.
   A car flying high over a building clears it and comes down on its roof (the roofs across the avenue, off the launch ramp); it drives
   about up there, you can get out and walk, and off the edge the car falls and you drop (a drop from high up hurts). */
const SKX = { caught: false, gate: 0, picks: [], mach: {}, dumpI: 0, dumpT: 0 };
const siteOn = () => !!SITE && feat('site');
const siteNight = () => SKY.hour < PLC.siteOpen || SKY.hour >= PLC.siteClose;

/* ---------- the tower's decks and ramps (js/10k cpLift hands over here) ---------- */
function siteLift(o) {
  const T = SK.T, z = o.z || 0;
  if (!inTower(o.x, o.y, 0)) {                                       // off the tower
    if (z > 4 && o.ang !== undefined && o.t) { o.air = (o.air || 0) + z + (o.rz || 0); o.vz = Math.max(o.vz || 0, (o.rzv || 0) * PLC.jumpLift); o.rz = o.rzv = o.rzp = 0; }   // a car off an edge high up: it flies
    o.z = 0; o.zg = 0; return;
  }
  o.zg = 0;
  const ly = o.y - T.y0;
  if (ly > T.r0 && ly < T.r1) for (const R of SK.ramps) if (o.x > R.xa && o.x < R.xb) {
    const h = skRampH(R, o.y); if (Math.abs(z - h) < 10) { o.z = h; o.zg = (R.east ? -1 : 1) * T.dh / (T.r1 - T.r0); return; }
  }
  o.z = clamp(Math.round(z / T.dh), 0, T.levels - 1) * T.dh;
}
/* ---------- the jumps: a car follows a ramp's or a mound's surface, and takes off where it drops away faster than it can fall ---------- */
function siteJump(c, dt) {                // js/07, each car near the site
  if (c.air > 0 || c.vz > 0 || dt <= 0) { c.rz = c.rzv = c.rzp = 0; return; }
  const z = zOf(c), sp = Math.hypot(c.vx, c.vy), ax = c.x + c.vx * dt, ay = c.y + c.vy * dt; let s = 0, s1 = 0, J0 = null;
  for (const J of SK.jumps) { if (Math.abs(z - J.z) > 10 || (J.stunt && !J.top && !stuntOn())) continue; const h = jumpH(J, c.x, c.y); if (h > s) { s = h; J0 = J; } s1 = Math.max(s1, jumpH(J, ax, ay)); }   // the stunt ramps (js/10y) only with their mode on
  const prev = c.rz || 0, vprev = c.rzv || 0, vnew = (s1 - s) / dt;   // the rise rate the way it moves (the surface just ahead): no spike when it lands on a ramp half-way up
  if (prev > 1.5 && vprev > 15 && sp > 0.75 * (c.rzs || 0) && ((vnew < 0 && (vnew - vprev) / dt < -1100) || !J0)) {   // over the lip or the crest, fast (not stopped by a wall) - or already past it this step: off it goes
    const Jl = J0 || c.rzJ; c.air = J0 ? s : prev; c.vz = vprev * PLC.jumpLift; c.rz = c.rzv = 0; c.rzJ = null; c.rzp = Math.atan(vprev / Math.max(60, sp)); if (Jl && Jl.stunt) stuntLaunch(c, Jl, sp); return;   // a stunt jump (js/08zw)
  }
  c.rz = s; c.rzv = vnew; c.rzs = sp; c.rzJ = J0;
  c.rzp = J0 ? Math.atan((Math.max(0, jumpH(J0, c.x + Math.cos(c.ang) * 6, c.y + Math.sin(c.ang) * 6)) - s) / 6) : 0;
}
function landHard(c) {                    // js/07 stepCar: back on the ground from high up
  const v = -c.vz, thr = Math.sqrt(2 * 900 * PLC.dropSafe); if (v <= thr) return;   // a fall from dropSafe high: the game's cars fall at 900 units/s²
  damageCar(c, (v - thr) * 0.09, false);
  if (c === P.car) { cam.shake = Math.max(cam.shake, Math.min(14, (v - thr) / 25)); Snd.thud && Snd.thud(70); }
}

/* ---------- the roofs across the avenue: a car flown off the tower comes down on them, drives about up there and drops off the edge ---------- */
const _rfb = [];
function roofUnder(x, y, h) {             // the highest building roof under (x, y) no higher than h (null: the ground)
  let best = null; bHash.query(x - 2, y - 2, x + 2, y + 2, _rfb);
  for (const s of _rfb) if (s.bld && !s.off && s.H && s.H <= h + 0.5 && (!best || s.H > best.H) && inSolid(x, y, s, 0)) best = s;
  return best;
}
function roofTick(o) {                    // js/06, js/07: a car high in the air, or a car or you up on a roof - its base follows the roof under it
  if ((CPK && inCarpark(o.x, o.y, 2)) || (SK.T && inTower(o.x, o.y, 0))) { o.roof = null; return; }   // the decks have their own heights (js/10k, siteLift)
  if (o.roof && inSolid(o.x, o.y, o.roof, 0)) return;                 // still over its roof
  if (o.roof && !inSolid(o.x, o.y, o.roof, 30)) { o.roof = null; o.z = 0; return; }   // nowhere near it any more (respawned, put somewhere): back on the ground
  const h = zOf(o) + (o.air || 0), r = roofUnder(o.x, o.y, h), z = r ? r.H : 0;
  if (r === (o.roof || null) && z === zOf(o)) return;
  if (o.t) { o.air = h - z; o.z = z; o.roof = r; return; }           // a car: off the edge it falls (js/07 stepCar), onto a roof it lands
  const fall = h - z; o.z = z; o.roof = r;                            // on foot off the edge: down you drop
  if (o === P && fall > PLC.footDrop) { damagePlayer((fall - PLC.footDrop) / UNITS_PER_M * PLC.footDropHurt); Snd.thud && Snd.thud(40); }
}

/* ---------- the people: workers by day, the guard at night ---------- */
function sitePosts() {                    // js/10v genSite: deck workers, the night guard's round
  const T = SK.T, hat = '#ffd23f';
  const deck = [[T.x0 + T.S + 40, T.y0 + 120, 1], [T.x1 - T.S - 40, T.y0 + 260, 2], [T.x0 + T.S + 60, T.y0 + 300, 4]];
  deck.forEach(([x, y, k], i) => addPost({ x, y, a: i * 2, kind: 'worker', back: 120, need: () => siteOn() && !siteNight(),
    make: po => { const p = makePed(po.x, po.y); Object.assign(p, { worker: true, arm: -1, umb: false, shirt: i % 2 ? '#ff7a1a' : '#e8ff3a', pants: '#2a3a6a', hardhat: hat, z: k * T.dh, speed: 0, state: 'post' }); return p; },
    step: (p, dt) => { const po = p.post; p.x = po.x; p.y = po.y; p.vx = p.vy = 0; p.ang = p.hd = po.a + 0.8 * Math.sin(gameT * 0.4 + i); return true; } }));
  const [a0, b0, , b1] = SITE.area, xr = T.x0 - 20, round = [[a0 + 30, b0 + 60], [xr, b0 + 40], [xr, b1 - 30], [a0 + 30, b1 - 40]];
  addPost({ x: round[0][0], y: round[0][1], a: 0, kind: 'siteguard', back: 300, patrol: round, need: () => siteOn() && siteNight(),
    make: po => { const p = makePed(po.x, po.y); Object.assign(p, { siteguard: true, arm: -1, umb: false, shirt: '#2a3a5a', pants: '#1a2230', speed: 1.1 * MPS, state: 'post' }); return p; },
    step: siteGuardStep });
}
function siteGuardStep(p, dt) {           // walks the yard's round with his torch; sees you inside at night: a star
  if (p.state === 'flee') return false;
  const po = p.post, w = po.patrol[po.i % po.patrol.length];
  if (walkTo(p, w[0], w[1], WALK * 0.8, dt) < 10) po.i++;
  const me = P.car || P, d = dist(p.x, p.y, me.x, me.y);
  if (!SKX.caught && !P.dead && inSite(me.x, me.y, -6) && d < PLC.guardSight && Math.abs(angDiff(p.ang, Math.atan2(me.y - p.y, me.x - p.x))) < 1.2 && losClear(p.x, p.y, me.x, me.y, true)) {
    SKX.caught = true; pops.push({ x: p.x, y: p.y, txt: 'HEY! TRESPASSER!', col: '#ffd23f', life: 2 }); toast('TRESPASSING - THE GUARD SAW YOU', true);
    if (feat('police')) { forceWanted(PLC.guardStars); reportCrime(0, 0, p.x, p.y, true); }
  }
  return true;
}
function siteYard() {                     // workers walking the yard by day (as many as the table says)
  if (!SKX.area) { const [a0, b0, , b1] = SITE.area; SKX.area = { k: 'promenade', g: { o: [[a0 + 12, b0 + 12], [SK.T.x0 - 14, b0 + 12], [SK.T.x0 - 14, b1 - 12], [a0 + 12, b1 - 12]], h: [] }, bb: [a0 + 12, b0 + 12, SK.T.x0 - 14, b1 - 12] }; }
  const A = SKX.area, day = !siteNight(); let n = 0;
  for (const p of peds) if (!p.dead && p.area === A) { if (!day && offScreen(p.x, p.y)) p.vanish = true; else n++; }
  if (!day || n >= PLC.siteWorkers || dist(P.x, P.y, (A.bb[0] + A.bb[2]) / 2, (A.bb[1] + A.bb[3]) / 2) > 1300) return;
  const q = randomIn(A.g, (x, y) => strollOk(A, x, y) && !SK.jumps.some(J => J.z === 0 && jumpH(J, x, y) >= 0)); if (!q) return;
  const p = makePed(q[0], q[1]); Object.assign(p, { stroll: true, area: A, worker: true, arm: -1, umb: false, shirt: pick(['#e8ff3a', '#ff7a1a']), pants: '#2a3a6a', hardhat: '#ffd23f' }); strollTarget(p); peds.push(p);
}

/* ---------- the machines: the mixer, the digger, the dump truck - by day at work, at night parked; take them ---------- */
function siteMachines(dt) {
  const near = dist(P.x, P.y, (SITE.area[0] + SITE.area[2]) / 2, (SITE.area[1] + SITE.area[3]) / 2) < 1500, day = !siteNight();
  const want = { mixer: [SITE.mixer[0], SITE.mixer[1], SITE.mixer[2]], digger: [SITE.digger[0], SITE.digger[1], SITE.digger[2]], dumper: [SITE.dumper[0][0], SITE.dumper[0][1], 0] };
  for (const type in want) {
    const M = SKX.mach[type] = SKX.mach[type] || { car: null, gone: -1e9 };
    if (M.car && (!cars.includes(M.car) || M.car.dead || (M.car.driver && M.car.driver !== 'ai') || dist(M.car.x, M.car.y, want[type][0], want[type][1]) > 400)) { if (M.car.siteAI) M.car.siteAI = false; M.car = null; M.gone = gameT; }
    if (M.car || !near || !CAR_TYPES[type] || gameT - M.gone < PLC.siteRestock && M.gone > -1e8 || !offScreen(want[type][0], want[type][1])) continue;
    if (cars.some(o => dist(o.x, o.y, want[type][0], want[type][1]) < 50)) continue;
    const [x, y, deg] = want[type], c = makeCar(type, x, y, deg * Math.PI / 180, null); c.searched = true; c.siteM = type; cars.push(c); M.car = c;
  }
  for (const type in SKX.mach) {                                     // by day the digger and the dump truck have their drivers (take them like any car), the mixer stands
    const c = SKX.mach[type].car; if (!c) continue;
    if (type !== 'mixer') { if (day && !c.driver) { c.driver = 'ai'; c.siteAI = true; } else if (!day && c.siteAI && c.driver === 'ai') { c.driver = null; c.siteAI = false; c.thr = 0; c.str = 0; } }
  }
}
function siteDrive(c, dt) {               // js/07: a site machine's driver
  if (c.siteM !== 'dumper') { c.thr = 0; c.str = 0; c.hb = true; return; }
  const W = SITE.dumper, w = W[SKX.dumpI % W.length], d = dist(c.x, c.y, w[0], w[1]);
  if (SKX.dumpT > 0) { SKX.dumpT -= dt; c.thr = carSpeed(c) > 4 ? -0.6 : 0; c.str = 0; return; }
  if (d < 22) { SKX.dumpI++; SKX.dumpT = 4; return; }
  const want = Math.atan2(w[1] - c.y, w[0] - c.x), diff = angDiff(c.ang, want);
  c.str = clamp(diff * 2.4, -1, 1); c.thr = carSpeed(c) < PLC.dumperSpeed * (Math.abs(diff) > 0.6 ? 0.5 : 1) ? 0.5 : 0; c.hb = false;
}

/* ---------- the pickups up on the decks ---------- */
function sitePicks() {                    // js/15 resetGame after the hidden weapons: a gun on the top deck, health or armour three decks up
  SKX.picks = []; if (!siteOn()) return;
  const T = SK.T, guns = WEAPONS.map((w, i) => i).filter(i => !WEAPONS[i].start && !isMelee(WEAPONS[i]) && WEAPONS[i].onMap > 0 && WEAPONS[i].id !== 'aa');
  SKX.picks.push({ x: (T.x0 + T.x1) / 2, y: T.y0 + 150, z: T.top, gun: guns, takenAt: 0, p: null }, { x: T.x0 + T.S + 34, y: T.y1 - 110, z: 3 * T.dh, item: ['health', 'armor'], takenAt: 0, p: null });
  for (const s of SKX.picks) sitePut(s);
}
function sitePut(s) {
  const wi = s.gun ? pick(s.gun) : -1, item = s.item ? pick(s.item) : null; if (s.gun && wi < 0) return;
  s.p = { x: s.x, y: s.y, z: s.z, wi, ammo: false, item, key: item ? 'i' + item : 'w' + wi, fixed: false, site: s, spot: null, bob: Math.random() * 6, mesh: null }; s.takenAt = 0; WPICKS.push(s.p);
}
function siteTaken(p) { p.site.p = null; p.site.takenAt = gameT; }   // js/08d

/* ---------- js/15 update ---------- */
function siteTick(dt) {
  if (!SITE) return;
  const on = siteOn(), night = on && siteNight();
  if (SK.gateRc) SK.gateRc.off = !night || SKX.gate > 0.5;           // shut at night (it swings shut over a few seconds)
  SKX.gate = clamp(SKX.gate + (night ? -dt : dt) * 0.5, 0, 1);
  if (!inSite(P.x, P.y, 10)) SKX.caught = false;
  if (!on) return;
  siteYard(); siteMachines(dt);
  const away = dist(P.x, P.y, SK.lm.cx, SK.lm.cy) > 1500;
  for (const s of SKX.picks) if (!s.p && s.takenAt && away && gameT - s.takenAt > PLC.siteRestock) sitePut(s);
}
function siteReset() { Object.assign(SKX, { caught: false, gate: siteOn() && siteNight() ? 0 : 1, dumpI: 0, dumpT: 0 }); for (const k in SKX.mach) SKX.mach[k] = { car: null, gone: -1e9 }; sitePicks(); }

/* ---------- js/13: the levels above you fade, the cranes swing, the gate, the machines' moving parts, the guard's torch ---------- */
let SK_TORCH = null;
function gfxSite(time) {
  if (!SITE || !SK.lm || !SK.lm.mesh || !SK.view) { if (SK_TORCH) SK_TORCH.visible = false; return; }
  const T = SK.T, me = P.car || P, inside = !P.dead && inTower(me.x, me.y, -2), top = inside ? Math.ceil(zOf(me) / T.dh - 0.05) : 99;
  SK.view.groups.forEach((v, k) => {
    const want = k <= top ? 1 : 0.1; v.op += (want - v.op) * 0.2; if (Math.abs(v.op - want) < 0.01) v.op = want;
    for (const m of v.mats) { m.opacity = v.op; m.depthWrite = v.op > 0.97; }
  });
  { const v = SK.view.scaff, want = inside && top > 0 ? 0.2 : 1; v.op += (want - v.op) * 0.2; for (const m of v.mats) { m.opacity = v.op; m.depthWrite = v.op > 0.97; } }
  for (const c of cars) if (c.mesh && inTower(c.x, c.y, 0) && zOf(c) > 0) c.mesh.visible = !inside || zOf(c) <= zOf(me) + 12;
  const day = siteOn() && !siteNight();
  for (const C of SK.parts.cranes) {
    const w = day ? time : 0;
    C.rot.rotation.y = -(Math.PI * 0.05 + Math.sin(w * 0.05 + C.ph) * 0.6);
    const tx = C.jib * (0.45 + 0.35 * Math.sin(w * 0.13 + C.ph)), ly = -C.Hc + 14 + (T.top + 40) * (0.5 + 0.5 * Math.sin(w * 0.09 + C.ph * 1.7));
    C.trolley.position.set(tx, 0, 0); C.load.position.y = ly; C.cable.position.y = ly / 2; C.cable.scale.y = Math.max(1, -ly);
  }
  for (const L of SK.parts.leaves) L.pv.rotation.y = L.s * SKX.gate * Math.PI * 0.5;
  for (const type in SKX.mach) { const c = SKX.mach[type].car; if (!c || !c.m) continue;
    if (c.m.drum && day) c.m.drum.rotation.x = time * 1.4;
    if (c.m.arm && day && c.siteAI) { c.m.arm.rotation.z = -0.35 + 0.3 * Math.sin(time * 0.8); if (c.m.stick) c.m.stick.rotation.z = 0.8 + 0.5 * Math.sin(time * 0.8 + 1.2); } }
  const gd = peds.find(p => p.siteguard && !p.dead);
  if (gd && siteOn() && siteNight()) {
    if (!SK_TORCH) { SK_TORCH = new THREE.Mesh(new THREE.CircleGeometry(90, 12, -0.45, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })); SK_TORCH.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(SK_TORCH); scene.add(g); SK_TORCH.userData.g = g; }
    const g = SK_TORCH.userData.g; g.visible = true; SK_TORCH.visible = true; g.position.set(gd.x, groundH(gd.x, gd.y) + 1.5, gd.y); g.rotation.y = -gd.ang;
  } else if (SK_TORCH) SK_TORCH.userData.g.visible = false;
}

/* ---------- js/14: a crane on the maps, at the gate ---------- */
function siteIcons(g, X, Y, q, inView) {
  if (!siteOn()) return;
  const x = X(SITE.gate[0] + 40), y = Y(SITE.gate[1]); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#ffd23f'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = '#16161c'; g.fillRect(x - q * 0.45, y - q * 0.75, q * 0.2, q * 1.5); g.fillRect(x - q * 0.75, y - q * 0.75, q * 1.5, q * 0.2);   // the mast and the jib
  g.fillRect(x + q * 0.45, y - q * 0.55, q * 0.08, q * 0.6); g.fillRect(x + q * 0.3, y + q * 0.05, q * 0.38, q * 0.25);                        // the cable and the load
  g.fillRect(x - q * 0.75, y + q * 0.55, q * 1.5, q * 0.2);
}
