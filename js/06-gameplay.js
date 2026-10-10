'use strict';
/* ---------- 6. GAMEPLAY: state, wanted level, combat, vehicles in/out ---------- */
let state = 'menu', gameT = 0, deadTimer = 0, best = 0;   // state: menu | play | pause | dying | over (| preview, js/16)
/* OPT: the choices on the New game screen (js/15b), saved with the game. time: the hour it starts; weather: 'change', or one kind for the
   whole game; clock: how fast the day goes (1 = as in the sky table, 0 = stopped); police: more or less heat per crime, cars sent, time to
   lose them (1 = as in the police table); crowd: traffic and people (1 = normal); start: 'usual', 'random' or a district name */
const OPT_DEF = { time: SKYP.startHour, weather: 'change', clock: 1, police: 1, crowd: 1, start: 'usual' }, OPT = Object.assign({}, OPT_DEF);
try { best = +localStorage.getItem('blockrunner.best') || 0; } catch (e) { }
const P = { x: 0, y: 0, ang: 0, vx: 0, vy: 0, hp: 100, armor: 0, car: null, weapon: 0, has: startHas(), ammo: startAmmo(), mag: startMag(), rel: 0, relW: -1, trig: false, act: null, cool: 0, flash: 0, score: 0, kills: 0,
  heat: 0, stars: 0, maxStars: 0, sinceCrime: 99, dead: false, dry: false, bob: 0, hurtT: 0, mouseOn: false, gear: 'D' };
const cam = { x: MW / 2, y: MH / 2, zoom: 1, shake: 0 };
let boomFlash = null;
const offDist = () => visRadius() + 80;   // visRadius() comes from the renderer
cv.addEventListener('mousemove', () => { if (!touchMode) P.mouseOn = true; });

function addHeat(n) { if (RAMP.on || !feat('police')) return; P.heat = Math.min(9999, P.heat + n * OPT.police); P.sinceCrime = 0; policeKnow(P.x, P.y); updateStars(); }   // the police know where it happened (js/08b)
function updateStars() {
  let s = 0; for (let k = 1; k <= 5; k++) if (P.heat >= COP.lv.heat[k]) s = k;   // heat needed per level: the police table (js/01b)
  if (s > P.stars) { toast('WANTED LEVEL ' + s, true); policeAlert(P.stars, s); } else if (s === 0 && P.stars > 0) toast('WANTED LEVEL CLEARED');
  P.stars = s; P.maxStars = Math.max(P.maxStars, s);
}
function addScore(n, x, y, label) { if (!(n > 0)) return; P.score += n; if (x !== undefined) popup(x, y - 14, '+' + n + (label ? ' ' + label : '')); }   // n: what the deed pays (js/01i)
function alertPeds(x, y, r, notMe, provokeR) {   // people near trouble run away; armed ones who saw you hurt someone close to them (within provokeR) fight back (js/08g)
  for (const p of peds) if (!p.dead && !p.cop && dist(p.x, p.y, x, y) < r) {
    if (!notMe && provokeR && dist(p.x, p.y, x, y) < provokeR && dist(p.x, p.y, P.x, P.y) < 450 && provoke(p)) continue;
    if (p.hostile) continue; p.state = 'flee'; p.fl = rand(3, 6); p.fx = p.x - x; p.fy = p.y - y;
  }
}
function killPed(p, how, byPlayer, ang) {
  if (p.dead) return; p.dead = true; p.deadT = 0; if (p.soldier && byPlayer) raiseAlarm();   // a soldier killed: the base is on alert (js/08j)
  if (how === 'blast' && feat('gibs')) gibPerson(p, ang); else { bloodFx(p.x, p.y, 14, ang); if (decals.length < 120) bloodMark(p.x, p.y, rand(8, 13), 50); }
  if (byPlayer) { P.kills++; if (p.cop) { addHeat(COP.crime.killCop); PS.armedT = gameT; } else reportCrime(how === 'car' ? COP.crime.runOver : COP.crime.kill, 0); rampHit('people', p.x, p.y); }
  dropLoot(p, p.cop);                                              // a cash stack and the weapon they carried (js/08g); killing pays nothing itself
  alertPeds(p.x, p.y, 300, !byPlayer, 160); if (!p.gibbed) callFor('ambulance', p.x, p.y, p);   // an ambulance comes for the body (js/08c)
}
function killOfficer(o, byPlayer, how, ang) {
  if (o.dead) return; o.dead = true; o.deadT = 0;
  if (how === 'blast' && feat('gibs')) gibPerson(o, ang); else bloodFx(o.x, o.y, 16);
  crewLost(o); if (!o.gibbed) callFor('ambulance', o.x, o.y, o);
  dropLoot(o, true);                                               // cash and the officer's pistol (js/08g)
  if (byPlayer) { P.kills++; popup(o.x, o.y - 14, 'COP DOWN', '#3f6bff'); addHeat(COP.crime.killCop); PS.armedT = gameT; rampHit('people', o.x, o.y); }
}
function gibPerson(p, ang) {             // torn apart by a blast (js/01j gibs): no body - a burst of blood, pieces flung out that lie a while and fade, a big mark
  p.gibbed = true; if (ang === undefined) ang = rand(0, TAU);
  const cols = [p.shirt || '#2a4aa8', p.skin || '#f2c6a0', '#7d0c1e', '#5c0714', '#2a2d3a'];
  for (let k = 0; k < 46; k++) { const a = ang + rand(-1.3, 1.3), s = rand(80, 340); addP({ x: p.x, y: p.y, z: rand(8, 20), vz: rand(30, 160), grav: 300, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.9), max: 0.9, s0: rand(2.5, 4.5), s1: 1, col: pick(['#b3122a', '#8e1124', '#d0213c']), drag: 4 }); }
  for (let k = 0; k < 12; k++) { const a = ang + rand(-1, 1), s = rand(110, 300), l = rand(4, 6.5); addP({ x: p.x, y: p.y, z: rand(10, 22), vz: rand(120, 260), grav: 560, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, s0: rand(2.8, 4.6), s1: 2, col: pick(cols), drag: 1.6, hold: true }); }
  bloodMark(p.x + Math.cos(ang) * 6, p.y + Math.sin(ang) * 6, rand(11, 16), 60);
  for (let k = 0, n = 2 + Math.floor(rand(0, 3)); k < n; k++) { const a = ang + rand(-0.9, 0.9), d = rand(20, 55); bloodMark(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, rand(3, 7), 55); }
}
function damagePlayer(d) {
  if (P.dead || state === 'over') return;
  const a = Math.min(P.armor, d); P.armor -= a; d -= a;              // body armor takes it first (js/01g)
  P.hp -= d; P.hurtT = 0.25; Snd.hurt(); cam.shake = Math.max(cam.shake, 4);
  if (P.hp <= 0) killPlayer();
}
function killPlayer() {
  P.hp = 0; P.dead = true; deadTimer = 0; state = 'dying'; bloodFx(P.x, P.y, 30); rampEnd(false, 'WASTED');
  if (P.car) { P.car.driver = null; P.car.thr = 0; P.car.str = 0; P.car = null; }
  $('wasted').style.display = 'flex';
}
function damageCar(c, d, byPlayer) {
  if (c.dead || d <= 0) return;
  c.hp -= d; if (byPlayer) c.byPlayer = true;
  if (byPlayer && c.t.cop) reportCrime(Math.min(COP.crime.ramCopMax, d * COP.crime.ramCop / 10), 0, undefined, undefined, true);
  if (c.hp <= 0 && c.burn <= 0) {
    c.hp = 0; c.burn = 2.4 + Math.random() * 0.8;
    if (c.driver === 'ai' || c.driver === 'cop') c.driver = null;
    if (c.byPlayer) rampWreck(c);                                   // a wreck for the rampage (js/08f)
  }
}
function explosion(x, y, R, src, throwK) {   // throwK: how hard it throws things (the weapon table's Blast throw; 1 = full); the damage is the same
  boomFlash = { x, y, t: 0.6 };
  Snd.boom(); cam.shake = Math.max(cam.shake, 16 * (1 - Math.min(1, dist(x, y, cam.x, cam.y) / 900)));
  boomFx(x, y, R);                                               // fireball, flames, smoke column, debris, embers (js/12c)
  if (decals.length < 110 && shoreDist(x, y) > 0) {             // a ragged scorch mark: a few overlapping blotches, not one disc
    decals.push({ x, y, r: R * 0.24, life: 70, scorch: true });
    for (let k = 0; k < 5; k++) { const a = rand(0, TAU), d = rand(0.1, 0.24) * R; decals.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: rand(0.09, 0.16) * R, life: 70, scorch: true }); }
  }
  const byP = src && src.byPlayer;
  for (const p of peds) if (!p.dead && dist(p.x, p.y, x, y) < R) killPed(p, 'blast', byP, Math.atan2(p.y - y, p.x - x));
  for (const o of officers) if (!o.dead && dist(o.x, o.y, x, y) < R) killOfficer(o, byP, 'blast', Math.atan2(o.y - y, o.x - x));
  for (const c of cars) {
    if (c === src || c.dead) continue; const d = dist(c.x, c.y, x, y);
    if (d < R + 20) damageCar(c, 110 * (1 - d / (R + 20)), byP);
  }
  if (!P.car && !P.dead) { const d = dist(P.x, P.y, x, y); if (d < R) damagePlayer(70 * (1 - d / R)); }
  blastPlanes(x, y, R, src);                                      // close to a plane's tanks it goes up too (js/08i)
  blastTargets(x, y, R, src); if (byP) baseHurt(x, y);             // the helicopter; a blast you set off inside the base (js/08j)
  blastPush(x, y, R, src, throwK === undefined ? 1 : throwK);   // and throws everything still in one piece
  callFor('fire', x, y);                                          // a fire engine comes (js/08c)
}
function explodeCar(c) {
  c.burn = 0; c.dead = true; c.deadT = 0; c.hp = 0;
  const wasPlayer = P.car === c;
  if (wasPlayer) exitCar(true);
  explosion(c.x, c.y, 130, c);
  if (wasPlayer) damagePlayer(45);
  if (c.byPlayer && c.t.cop) { addScore(ECO.copCarBoom, c.x, c.y, 'COP ' + c.t.name); reportCrime(COP.crime.copCarBoom, COP.blastHear, undefined, undefined, true); }
  else if (c.byPlayer) addScore(ECO.carBoom, c.x, c.y, 'BOOM');
  c.vx *= 0.2; c.vy *= 0.2; c.driver = null;
}

function raycast(ox, oy, ang, range) {
  const dx = Math.cos(ang), dy = Math.sin(ang); let bt = range, type = null, obj = null;
  buildingsAlong(ox, oy, ox + dx * range, oy + dy * range, rc => { const t = raySolid(ox, oy, dx, dy, rc); if (t < bt) { bt = t; type = 'wall'; obj = rc; } });
  for (const p of peds) { if (p.dead || Math.abs(p.x - ox) > range + 20 || Math.abs(p.y - oy) > range + 20) continue; const t = rayCircle(ox, oy, dx, dy, p.x, p.y, 8); if (t < bt) { bt = t; type = 'ped'; obj = p; } }
  for (const o of officers) { if (o.dead) continue; const t = rayCircle(ox, oy, dx, dy, o.x, o.y, 8); if (t < bt) { bt = t; type = 'officer'; obj = o; } }
  for (const c of cars) {
    if (P.car === c || Math.abs(c.x - ox) > range + 60 || Math.abs(c.y - oy) > range + 60) continue;
    for (const q of carCircles(c)) { const t = rayCircle(ox, oy, dx, dy, q[0], q[1], q[2]); if (t < bt) { bt = t; type = 'car'; obj = c; } }
  }
  const pr = planeRay(ox, oy, dx, dy, bt); if (pr) { bt = pr.t; type = 'plane'; obj = pr.pl; }   // a plane on the ground or low in the air (js/08i)
  const tg = targetRay(ox, oy, dx, dy, bt); if (tg) { bt = tg.t; type = 'target'; obj = tg.o; }   // the helicopter, a ship's hull (js/08j)
  return { x: ox + dx * bt, y: oy + dy * bt, type, obj, t: bt, dx, dy };
}
function rifleRay(ox, oy, ang, w) {     // a rifle round goes through props and one unarmoured car; a building, the first person, an armoured or a second car stops it
  const dx = Math.cos(ang), dy = Math.sin(ang), R = w.range, hits = [];
  buildingsAlong(ox, oy, ox + dx * R, oy + dy * R, rc => { const t = raySolid(ox, oy, dx, dy, rc); if (t < R) hits.push({ t, type: softSolid(rc) ? 'soft' : 'wall', obj: rc }); });
  for (const p of peds) if (!p.dead) { const t = rayCircle(ox, oy, dx, dy, p.x, p.y, 8); if (t < R) hits.push({ t, type: 'ped', obj: p }); }
  for (const o of officers) if (!o.dead) { const t = rayCircle(ox, oy, dx, dy, o.x, o.y, 8); if (t < R) hits.push({ t, type: 'officer', obj: o }); }
  for (const c of cars) {
    if (c === P.car || c.sunk) continue; let t = Infinity;
    for (const q of carCircles(c)) t = Math.min(t, rayCircle(ox, oy, dx, dy, q[0], q[1], q[2]));
    if (t < R) hits.push({ t, type: 'car', obj: c });
  }
  const pr = planeRay(ox, oy, dx, dy, R); if (pr) hits.push({ t: pr.t, type: 'plane', obj: pr.pl });
  const tg = targetRay(ox, oy, dx, dy, R); if (tg) hits.push({ t: tg.t, type: 'target', obj: tg.o });
  hits.sort((u, v) => u.t - v.t);
  let through = 0;
  for (const h of hits) {
    const x = ox + dx * h.t, y = oy + dy * h.t;
    if (h.type === 'soft') { spark(x, y, 3); continue; }                                  // straight through the dumpster
    if (h.type === 'car' && !h.obj.t.armored && through < 1) { through++; spark(x, y, 5); damageCar(h.obj, w.dmg * w.carDmg, true); continue; }   // and through one car
    return { x, y, type: h.type, obj: h.obj, t: h.t, dx, dy };
  }
  return { x: ox + dx * R, y: oy + dy * R, type: null, obj: null, t: R, dx, dy };
}
function startReload(wi) {
  const w = WEAPONS[wi]; if (P.relW >= 0 || P.mag[wi] >= w.mag || P.ammo[wi] <= 0) return false;
  P.relW = wi; P.rel = 0; Snd.tone(200, 120, 0.08, 0.1, 'square'); return true;
}
function updateReload(dt) {
  if (P.relW >= 0) {
    if (P.relW !== P.weapon || P.dead) { P.relW = -1; return; }          // switching weapons throws the reload away
    P.rel += dt;
    if (P.rel >= WEAPONS[P.relW].reload) {
      const wi = P.relW, take = Math.min(WEAPONS[wi].mag - P.mag[wi], P.ammo[wi]);
      P.mag[wi] += take; P.ammo[wi] -= take; P.relW = -1; Snd.tone(420, 300, 0.07, 0.12, 'square');
    }
  } else if (!P.dead && P.mag[P.weapon] <= 0) startReload(P.weapon);
}
function fireWeapon(aim) {                                      // aim: a point on the map for the scoped rifle; otherwise you shoot the way you face
  const w = WEAPONS[P.weapon]; if (P.cool > 0 || P.relW >= 0 || !P.has[P.weapon]) return;
  if (P.mag[P.weapon] <= 0) { if (!P.dry) { Snd.tone(120, 90, 0.06, 0.12, 'square'); P.dry = true; } P.cool = 0.3; return; }
  P.dry = false; P.cool = w.rate; P.mag[P.weapon]--; P.flash = 0.06;
  const a = aim ? Math.atan2(aim.y - P.y, aim.x - P.x) : P.ang + rand(-w.spread, w.spread);
  if (aim) P.ang = a;
  if (w.rocket) {                                                // a rocket: it flies on its own (js/12b) and blows up on whatever it hits
    launchRocket(aim || { x: P.x + Math.cos(a) * 400, y: P.y + Math.sin(a) * 400 }, w); Snd.rocket();
    alertPeds(P.x, P.y, w.panic); reportCrime(w.heat * COP.crime.gunfire, w.hear, undefined, undefined, true); cam.shake = Math.max(cam.shake, w.shake); return;
  }
  let h = null;
  for (let k = 0; k < w.pellets; k++) {                          // a shotgun fires several pellets at once, each with its own spread
    const pa = k ? P.ang + rand(-w.spread, w.spread) : a;
    h = w.pierce ? rifleRay(P.x, P.y, pa, w) : raycast(P.x, P.y, pa, w.range); bulletHit(h, w, pa);
  }
  Snd.shot(w.sound); alertPeds(P.x, P.y, w.panic); reportCrime(w.heat * COP.crime.gunfire, w.hear, h.x, h.y, true); baseHurt(P.x, P.y);   // shooting inside the base sets off the alarm (js/08j)
  cam.shake = Math.max(cam.shake, w.shake);
}
function bulletHit(h, w, a) {                                   // one bullet: the tracer, and what it hit
  const mx = P.x + Math.cos(P.ang) * 18, my = P.y + Math.sin(P.ang) * 18;
  tracers.push({ x1: mx, y1: my, x2: h.x, y2: h.y, life: w.scope ? 0.2 : 0.06 });
  if (h.type === 'ped') { const p = h.obj; bloodFx(h.x, h.y, 6, a); p.hp -= w.dmg; if (p.hp <= 0) killPed(p, 'gun', true, a); else if (p.cop) { addHeat(COP.crime.hurtCop); PS.armedT = gameT; } else if (!provoke(p)) { p.state = 'flee'; p.fl = 5; p.fx = p.x - P.x; p.fy = p.y - P.y; } }
  else if (h.type === 'officer') { const o = h.obj; bloodFx(h.x, h.y, 5, a); o.hp -= w.dmg; if (o.hp <= 0) killOfficer(o, true); else { addHeat(COP.crime.hurtCop); PS.armedT = gameT; } }
  else if (h.type === 'car') { spark(h.x, h.y, 5); damageCar(h.obj, w.dmg * w.carDmg, true); }
  else if (h.type === 'plane') { spark(h.x, h.y, 5); damagePlane(h.obj, w.dmg * w.carDmg, true); }   // js/08i
  else if (h.type === 'target') { spark(h.x, h.y, 5); damageTarget(h.obj, w.dmg * w.carDmg, true); }   // js/08j
  if (h.type === 'ped' && h.obj.soldier) raiseAlarm();               // a soldier hit: the base is on alert (js/08j)
  else if (h.type === 'wall') spark(h.x, h.y, 4);
}

function pedBlocked(x, y) {
  nearBuildings(x, y, _nb); for (const rc of _nb) if (!rc.gate && circleSolid(x, y, 9, rc)) return true; return false;
}
function exitCar(forced) {
  const c = P.car; if (!c) return;
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), rx = -fy, ry = fx, s = c.t.wid / 2 + 14, l = c.t.len / 2 + 14;
  const spots = [[rx * s, ry * s], [-rx * s, -ry * s], [-fx * l, -fy * l], [fx * l, fy * l]];
  let sp = spots[0];
  for (const o of spots) { if (!pedBlocked(c.x + o[0], c.y + o[1]) && shoreDist(c.x + o[0], c.y + o[1]) > 4) { sp = o; break; } }
  P.x = clamp(c.x + sp[0], BX0 + 10, BX1 - 10); P.y = clamp(c.y + sp[1], BY0 + 10, BY1 - 10); P.vx = c.vx * 0.3; P.vy = c.vy * 0.3;
  c.driver = null; c.thr = 0; c.str = 0; c.hb = false; P.car = null;
}
function enterCar(c) {
  if (c.driver === 'ai' || c.driver === 'cop') {
    const cop = c.driver === 'cop' || c.t.cop;
    const ped = makePed(c.x + Math.cos(c.ang + 1.6) * 30, c.y + Math.sin(c.ang + 1.6) * 30);
    if (cop) ped.arm = -1;
    if (!provoke(ped)) { ped.state = 'flee'; ped.fl = 6; ped.fx = ped.x - c.x; ped.fy = ped.y - c.y; }   // an armed driver comes back at you (js/08g)
    if (!pedBlocked(ped.x, ped.y)) peds.push(ped);
    reportCrime(cop ? COP.crime.carjackCop : COP.crime.carjack, 0);
  } else if (c.t.cop) reportCrime(COP.crime.stealCop, 0);
  else reportCrime(COP.crime.steal, 0);
  if (!c.searched) { c.searched = true; if (feat('carCash')) addScore(ecoRoll('carCash'), c.x, c.y, 'IN THE CAR'); }   // cash in the glovebox, once per car (js/01i)
  c.driver = 'player'; c.mode = 'player'; P.gear = 'D'; updateGearUi(); P.car = c; P.x = c.x; P.y = c.y; P.vx = 0; P.vy = 0;
}
function letGo(c) {                                              // a carjacking given up or lost: you drop off beside the car
  const rx = -Math.sin(c.ang), ry = Math.cos(c.ang), s = c.t.wid / 2 + 14;
  for (const sd of [1, -1]) { const x = c.x + rx * s * sd, y = c.y + ry * s * sd; if (!pedBlocked(x, y) && shoreDist(x, y) > 4) { P.x = x; P.y = y; break; } }
  P.vx = c.vx * 0.3; P.vy = c.vy * 0.3;
}
function tryEnterExit() {
  if (P.act) { const a = P.act; P.act = null; if (a.occ) letGo(a.c); return; }   // tap again to give up
  if (P.car) { exitCar(); return; }
  const c = nearestCar(); if (!c || rampLocked('ON FOOT DURING A RAMPAGE')) return;
  const occ = c.driver === 'ai' || c.driver === 'cop';
  P.act = { k: 'steal', c, t: 0, dur: occ ? 3 : 1, occ }; P.vx = P.vy = 0;       // an empty car takes a second; pulling a driver out takes three
}
function updateAct(dt) {                                         // stealing: when the time is up you are in and can drive off at once
  const a = P.act, c = a.c;
  if (P.dead || c.dead || c.sunk || P.car) { P.act = null; if (a.occ && !P.dead && !P.car) letGo(c); return; }
  a.t += dt;
  if (a.occ) { P.x = c.x; P.y = c.y; P.vx = c.vx; P.vy = c.vy; cam.shake = Math.max(cam.shake, 1.5); }   // hanging on at the door, fighting for the wheel
  else if (c.driver === 'ai' || c.driver === 'cop') { P.act = null; return; }
  if (a.t >= a.dur) { P.act = null; enterCar(c); }
}
function nearestCar() {
  let best = null, bd = 1e9;
  for (const c of cars) {
    if (c.dead) continue; const d = dist(P.x, P.y, c.x, c.y);
    if (d < 48 + c.t.len * 0.25 && d < bd) { best = c; bd = d; }
  }
  return best;
}

function updatePlayer(dt, inp) {
  P.cool -= dt; P.flash -= dt; P.hurtT -= dt; P.sinceCrime += dt;
  if (P.act) updateAct(dt);
  if (P.act) { if (!P.act.occ) { P.vx = P.vy = 0; } P.cool = Math.max(P.cool, 0.1); return; }
  if (P.car) {
    const c = P.car, sm = Math.hypot(TS.mx, TS.my);
    if (touchMode && sm > 0.12) {          // joystick = where you want to go; gear D drives that way, gear R backs toward it
      const mag = Math.min(1, sm), want = Math.atan2(TS.my, TS.mx), rev = P.gear === 'R';
      const diff = angDiff(c.ang, rev ? want + Math.PI : want), turn = clamp(diff * 3.2, -1, 1);
      c.str = rev ? -turn : turn; c.assist = true; c.fs = rev ? -1 : 1;
      const gas = clamp(Math.max(0.4, mag) * (1 - 0.4 * Math.min(1, Math.abs(diff) / Math.PI)), 0, 1);
      c.thr = rev ? -gas : gas;
    } else if (touchMode) { c.thr = 0; c.str = 0; c.assist = false; c.fs = 0; }
    else { c.assist = false; c.fs = 0; let thr = -inp.iy; if (Math.abs(thr) < 0.12) thr = 0; c.thr = clamp(thr, -1, 1); c.str = Math.abs(inp.ix) < 0.1 ? 0 : inp.ix; }
    c.hb = inp.sprint;
    P.x = c.x; P.y = c.y; P.ang = c.ang; P.vx = c.vx; P.vy = c.vy;
    if (c.t.weapon) vehicleGun(c, inp, dt);                       // the tank: FIRE launches rockets (js/08c)
    else carDrop(c, inp);                                          // a bomb in hand: FIRE drops it out of the window (js/06b)
    return;
  }
  const orig = inp; if (SCOPE.on && SCOPE.by === 'key') inp = { ix: 0, iy: 0, mag: 0, sprint: false, fire: inp.fire, held: inp.held };   // J held: the arrow keys move the scope, not you
  if (P.knocked) { updateReload(dt); P.trig = inp.fire; return; }   // thrown by a blast: no control until you land
  const mg = inp.mag === undefined ? Math.min(1, Math.hypot(inp.ix, inp.iy)) : inp.mag;
  if (mg > 0.06) P.ang = Math.atan2(inp.iy, inp.ix);        // any stick offset turns you; you only shoot the way you face
  const dep = Math.max(0, -shoreDist(P.x, P.y)), wk = 1 - 0.6 * Math.min(1, dep / WADE);
  // stick offset: up to 40% only turns you, 40-80% walks, 80-100% runs; the dash button is a sprint on top
  const gait = mg <= 0.4 ? 0 : mg <= 0.8 ? lerp(WALK, 2.4 * MPS, (mg - 0.4) / 0.4) : lerp(3.5 * MPS, RUN, (mg - 0.8) / 0.2);
  const sp = (inp.sprint && mg > 0.4 ? SPRINT : gait) * wk * FOOT, m = Math.hypot(inp.ix, inp.iy) || 1;
  const k = 1 - Math.exp(-14 * dt);
  P.vx = lerp(P.vx, inp.ix / m * sp, k); P.vy = lerp(P.vy, inp.iy / m * sp, k);
  P.x += P.vx * dt; P.y += P.vy * dt; P.bob += Math.hypot(P.vx, P.vy) * dt * 0.1;
  resolveCircle(P, 7);
  { const d2 = Math.max(0, -shoreDist(P.x, P.y));
    if (d2 > 0 && Math.hypot(P.vx, P.vy) > 30 && Math.random() < dt * 14) splashFx(P.x, P.y, 2);
    if (d2 > 0 && !P.wet) splashFx(P.x, P.y, 8); P.wet = d2 > 0;
    if (d2 > WADE - 12 && Math.hypot(inp.ix, inp.iy) > 0.2 && (P.deepT = (P.deepT || 0) - dt) <= 0) { P.deepT = 2.5; toast('TOO DEEP TO SWIM'); } }
  for (const c of cars) {
    if (Math.abs(c.x - P.x) > 90 || Math.abs(c.y - P.y) > 90) continue;
    for (const q of carCircles(c)) {
      const dx = P.x - q[0], dy = P.y - q[1], d = Math.hypot(dx, dy), rr = q[2] + 7;
      if (d < rr && d > 0.001) {
        P.x += dx / d * (rr - d); P.y += dy / d * (rr - d);
        const s2 = carSpeed(c); if (s2 > 130 && !c.dead) { damagePlayer((s2 - 90) * 0.12); P.vx += c.vx * 0.4; P.vy += c.vy * 0.4; }
      }
    }
  }
  updateReload(dt); updateSwing(dt);
  const w = WEAPONS[P.weapon]; if (!isThrown(w)) TA.on = TA.ok = false;   // switched away mid-aim
  if (w.scope) updateScope(orig, dt);                              // the rifle: aim in the scope while FIRE is held, shoot on letting go
  else if (isThrown(w)) updateThrowAim(orig, dt);                   // a bomb: drag back like a slingshot, let go to throw (js/06b)
  else if (isMelee(w)) { if (inp.fire && !P.dead && P.cool <= 0 && !P.swing) swingWeapon(w); }   // held, it keeps swinging
  else if (inp.fire && !P.dead && (w.auto || !P.trig)) fireWeapon();
  if (!inp.fire) P.dry = false; P.trig = inp.fire;
}

