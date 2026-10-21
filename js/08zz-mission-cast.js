'use strict';
/* ---------- 6zz. A MISSION'S CAST: enemies who shoot at you and your friends, the friends who help you, the enemies' cars ----------
   Missions only (modes: msFoes, msAllies; the numbers: the missions table, Fights).
   A foe (msFoe) keeps its post till it sees one of you near, hears shooting close by or is hit - then it fights the nearest of you it
   can see: it closes in, keeps a little way off and side-steps, its shots the armed people's (js/08g), rolled against whoever it aims at.
   A friend (msAlly) follows you on foot a few steps behind, fights the foes it can see, gets into your car when you stop for it and
   shoots from the passenger seat; hurt, it heals slowly when nobody has hit it for a while; left far behind out of sight, it catches up;
   killed, the mission fails (msCastFail). Nothing in the street turns it against you, scares it off, runs it over or blows it apart at once.
   A foes' car (msFoeCar) chases you (by road when it cannot see you, like the police) or flees to a place, its gunner firing; badly hit,
   or pulled up beside you, its crew gets out and fights on foot. A foes' boat chases you over the water (round the land when it must), its crew staying aboard.
   On Skyline One's tower they all stand on the decks and walk the ramps like you; nobody sees anyone a deck or more away; a foe told to
   hold (a gunman up on a deck) keeps his spot. */
const MS_CAST = { allies: [], cars: [], field: null, fieldT: 0, fieldTo: null };
const gunIdx = id => Math.max(0, WEAPONS.findIndex(w => w.id === id));
const castK = w => Math.min(4, w.dmg / WEAPONS[gunIdx('pistol')].dmg);   // a weapon's hit against the pistol's (the roadblock gunners' rule, js/08zr)

/* ---------- making them ---------- */
function msFoe(x, y, o = {}) {              // o: { gun, hp, a (facing), alert (fights at once), group, boss, shirt, pants, name }
  const p = msPed(x, y, o.a || 0, { arm: gunIdx(o.gun || 'pistol'), shirt: o.shirt || '#2a2d3a', pants: o.pants || '#14121c', speed: 1, msName: o.name, step: foeStep });
  return Object.assign(p, { foe: true, crim: true, hp: o.hp || MSN.foeHp, alert: !!o.alert, group: o.group || 'foes', boss: !!o.boss, cool: rand(0.5, 1.2), tgT: 0, sd: Math.random() < 0.5 ? 1 : -1, sdT: rand(1, 2), pref: rand(0.55, 1.3) });   // pref < 1: it rather goes for your friend
}
function msAlly(x, y, o) {                  // o: { who (a character of the mission), gun, hp, a, fail (the words when killed), hurtLine, calm (never fights), stay (stays in the car when you get out) }
  const ch = msWho(o.who) || {};
  return msAllyFrom(msPed(x, y, o.a || 0, { shirt: ch.shirt, pants: ch.pants, msName: o.who, speed: 1 }), o);
}
function msAllyFrom(p, o) {                 // someone of the mission (standing at their place so far) becomes your friend now
  const ch = msWho(o.who) || {}, hp = o.hp || MSN.allyHp;
  p.arm = o.calm ? -1 : gunIdx(o.gun || 'pistol'); p.post.step = allyStep; p.state = 'post';
  Object.assign(p, { ally: true, calm: !!o.calm, stay: !!o.stay, hp, hpMax: hp, hurtT: 99, cool: 0, tgT: 0, fail: o.fail || (ch.name || 'YOUR FRIEND') + ' IS DEAD', hurtLine: o.hurtLine, saidT: -99, col: ch.bubble || '#b6ff3c' });
  MS_CAST.allies.push(p); return p;
}
function msFoeCar(type, x, y, ang, o = {}) {   // o: { crew, gun, mode: 'chase' | 'flee' | 'park', to (fleeing: where), speed (km/h), group, tough, color }
  const c = msCar(type, x, y, ang, o.color || '#1c1c26');
  c.fc = Object.assign({ crew: 2, mode: 'chase', speed: 95, group: 'cars', cool: rand(0.6, 1.4), tgT: 0, out: false, gone: false }, o, { gun: o.gun === null ? -1 : gunIdx(o.gun || 'pistol') });
  c.noEnter = true; c.hp = c.maxhp = c.maxhp * (o.tough || 1);
  if (c.fc.mode !== 'park') foeCarGo(c);
  MS_CAST.cars.push(c); return c;
}
function foeCarGo(c, mode) { if (mode) c.fc.mode = mode; c.driver = 'ai'; c.msDrive = foeDrive; }
function msFoesLeft(group) {                 // foes still up in a group (on foot, and the crews still inside their cars)
  let n = 0;
  for (const p of peds) if (p.foe && !p.dead && (!group || p.group === group)) n++;
  for (const c of MS_CAST.cars) if (!c.dead && !c.fc.out && !c.fc.gone && (!group || c.fc.group === group)) n += c.fc.crew;
  return n;
}
function msCastFail() { const a = MS_CAST.allies.find(p => p.dead); return a ? a.fail : ''; }   // a mission's fail(): a friend killed
function msCastClear() {                      // msClear: friends riding with you go too
  for (const p of MS_CAST.allies) if (p.aboard && p.aboard.mates) p.aboard.mates = p.aboard.mates.filter(q => q !== p);
  MS_CAST.allies = []; MS_CAST.cars = []; MS_CAST.field = null;
}

/* ---------- shooting: a roll against the target, like the armed people's (js/08g), whoever fires at whoever ---------- */
function castShot(s, t, w, aim) {           // s: the shooter {x, y}; t: { o, kind: 'P' | 'ally' | 'foe' | 'car', d }; aim: a factor on the hit chance
  const o = t.o, a = Math.atan2(o.y - s.y, o.x - s.x);
  tracers.push({ x1: s.x + Math.cos(a) * 12, y1: s.y + Math.sin(a) * 12, x2: o.x + rand(-12, 12), y2: o.y + rand(-12, 12), life: 0.07 });
  Snd.tone(900, 200, 0.05, 0.06 * clamp(1 - dist(s.x, s.y, P.x, P.y) / 1400, 0.15, 1), 'square');
  if (Math.random() >= lerp(COP.accNear, COP.accFar, clamp(t.d / COP.fireRange, 0, 1)) * aim) return;
  const k = castK(w);
  if (t.kind === 'P') { if (P.car) damageCar(P.car, COP.dmgCar * k, false); else damagePlayer(COP.dmgFoot * k); }
  else if (t.kind === 'ally') allyHurt(o, COP.dmgFoot * k * MSN.allyTake);
  else if (t.kind === 'foe') { o.hp -= w.dmg; if (o.hp <= 0) killPed(o, 'gun', false, a); else o.alert = true; }
  else if (t.kind === 'car') damageCar(o, w.dmg * (w.carDmg || 1) * 0.5, false);
}
function castMelee(t, w) {                  // a foe's swing that lands
  if (t.kind === 'P') { if (P.car) damageCar(P.car, w.dmg * w.carDmg, false); else damagePlayer(Math.min(15, w.dmg * 0.3)); }
  else if (t.kind === 'ally') allyHurt(t.o, Math.min(15, w.dmg * 0.3) * MSN.allyTake);
}
function castPick(s, list, far) {           // the nearest it can see within far (else the nearest at all, unseen); s.pref: a foe's leaning to your friends
  let best = null, bd = Infinity, any = null, ad = Infinity;
  for (const t of list) {
    const d = dist(s.x, s.y, t.o.x, t.o.y) * (t.kind === 'ally' ? s.pref || 1 : 1); if (d > far || Math.abs(zOf(s) - zOf(t.o)) > 40) continue;   // a deck or more apart (Skyline One's tower): neither sees the other
    if (d < ad) { ad = d; any = t; }
    if (d < bd && losClear(s.x, s.y, t.o.x, t.o.y, true)) { bd = d; best = t; }
  }
  if (best) return Object.assign(best, { d: bd, see: true });
  return any ? Object.assign(any, { d: ad, see: false }) : null;
}
function foeTargets() {                      // you (in your car, the car - friends riding with you are in it), and your friends on foot
  const out = P.dead ? [] : [{ o: P.car || P, kind: 'P' }];
  for (const a of MS_CAST.allies) if (!a.dead && !a.aboard) out.push({ o: a, kind: 'ally' });
  return out;
}
function allyTargets() {                     // the foes on foot, and the foes' cars with a crew still in them
  const out = [];
  for (const p of peds) if (p.foe && !p.dead) out.push({ o: p, kind: 'foe' });
  for (const c of MS_CAST.cars) if (!c.dead && !c.fc.out && c.fc.crew > 0) out.push({ o: c, kind: 'car' });
  return out;
}

/* ---------- the way in or out of a top-down place (js/10z): through an open door (the roller door, or the side door by day) when one is inside and the other is not; Skyline One's gate likewise ---------- */
function castWay(p, x, y) {
  for (const S of IXS) {
    if (S.kind === 'unit' || dist(p.x, p.y, S.cx, S.cy) > S.hw + S.hd + 300) continue;
    const a = ixIn(S, p.x, p.y, -8); if (a === ixIn(S, x, y, -8)) continue;
    const doors = []; if (S.open > 0.85) doors.push([0, S.dw / 2 - 8]); if (S.px !== null && S.pOpen > 0.5) doors.push([S.px, IX_PD / 2 - 3]);   // [its x, half its lane]
    if (!doors.length) return null;
    const l = ixLocal(S, p.x, p.y, {}), t = ixLocal(S, x, y, {}), via = d => Math.hypot(l.x - d[0], l.z - S.hd) + Math.hypot(t.x - d[0], t.z - S.hd);
    const [dx, half] = doors.reduce((b, d) => via(d) < via(b) ? d : b), lane = Math.abs(l.x - dx) < half;
    if (a) return lane && l.z > S.hd - 44 ? ixWorld(S, dx, S.hd + 40, {}) : ixWorld(S, dx, S.hd - 40, {});   // inside: to the door, then out
    return lane && l.z > S.hd - 12 && l.z < S.hd + 44 ? ixWorld(S, dx, S.hd - 40, {}) : ixWorld(S, dx, S.hd + 40, {});   // outside: to the door, then in
  }
  if (SITE && SKX.gate > 0.5) {                                     // Skyline One's hoarding: in or out by its gate on the west street
    const a = inSite(p.x, p.y, -6); if (a === inSite(x, y, -6)) return null;
    const [gx, gy, gw] = SITE.gate, lane = Math.abs(p.y - gy) < gw / 2 - 10;
    if (a) return lane && p.x < gx + 56 ? { x: gx - 46, y: gy } : { x: gx + 46, y: gy };   // its waypoints (46 either side) inside the lanes' reach (56)
    return lane && p.x > gx - 56 ? { x: gx + 46, y: gy } : { x: gx - 46, y: gy };
  }
  return null;
}
/* ---------- walking with a way round: held up against something a moment (a parked digger, a pile), it steps aside for a second ---------- */
function castWalk(p, x, y, sp, dt) {
  const S = p.wk || (p.wk = { t: 0, x: p.x, y: p.y, dt: 0, side: 1 });
  if (S.dt > 0) { S.dt -= dt; const a = Math.atan2(y - p.y, x - p.x) + S.side * 1.25; walkTo(p, p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, sp, dt); return dist(p.x, p.y, x, y); }
  const d = walkTo(p, x, y, sp, dt);
  if ((S.t += dt) > 0.7) { if (d > 24 && dist(p.x, p.y, S.x, S.y) < sp * 0.7 * 0.15) { S.dt = 0.9; S.side = -S.side; } S.t = 0; S.x = p.x; S.y = p.y; }
  return d;
}
/* ---------- up or down Skyline One's tower (js/10v): deck by deck by the ramps (each ramp's foot, along it, off its top) ---------- */
function towerWay(p, x, y, tz) {
  const T = SK.T; if (!T || (tz < 10 && !zOf(p))) return null;
  const dh = T.dh, pz = zOf(p), lt = Math.round(tz / dh), lv = pz / dh;
  const ends = R => { const cx = (R.xa + R.xb) / 2, s = R.east ? 1 : -1, lo = R.east ? T.y0 + T.r1 : T.y0 + T.r0, hi = R.east ? T.y0 + T.r0 : T.y0 + T.r1;
    return { lo, hi, s, foot: { x: cx, y: lo + s * 34 }, head: { x: cx, y: hi - s * 34 }, on: y2 => ({ x: cx, y: y2 }) }; };
  const ly = p.y - T.y0, on = ly > T.r0 && ly < T.r1 && SK.ramps.find(R => p.x > R.xa && p.x < R.xb && Math.abs(skRampH(R, p.y) - pz) < 3);
  if (on) { const e = ends(on); return lt > on.k + 0.5 ? e.head : e.foot; }   // on a ramp: on along it, up or down
  const lp = Math.round(lv); if (lp === lt) return null;
  const lane = R => p.x > R.xa && p.x < R.xb;                      // in the ramp's side strip
  const via = (R, q) => {                                           // into the deck's middle lane (clear of the columns), along it to the line of the ramp's end, then across to it
    if (Math.abs(p.y - q.y) < 16 || lane(R)) return q;
    const mx = clamp(p.x, T.x0 + T.S + 30, T.x1 - T.S - 30); return Math.abs(p.x - mx) > 8 ? { x: mx, y: p.y } : { x: mx, y: q.y };
  };
  if (lt > lp) { const R = SK.ramps[lp], e = ends(R), u = (p.y - e.lo) * e.s; return lane(R) && u > -30 && u < 44 ? e.on(e.lo - e.s * 22) : via(R, e.foot); }   // up: to the ramp's foot, then onto it
  const R = SK.ramps[lp - 1], e = ends(R), u = (e.hi - p.y) * e.s; return lane(R) && u > -30 && u < 44 ? e.on(e.hi + e.s * 22) : via(R, e.head);   // down: to the ramp's top, then down it
}
const castTo = (p, o) => castWay(p, o.x, o.y) || towerWay(p, o.x, o.y, zOf(o)) || o;
const castLift = p => { if (p.z || (SK.T && inTower(p.x, p.y, 40))) cpLift(p); };   // on the tower's decks and ramps (js/08zt siteLift)

/* ---------- a foe on foot ---------- */
function foeAlert(p) {                      // it fights now, and so do the others of its group near it, a moment later
  if (p.alert) return; p.alert = true; p.calm = false; p.cool = rand(0.3, 0.9);
  for (const q of peds) if (q.foe && !q.alert && !q.dead && q.group === p.group && dist(q.x, q.y, p.x, p.y) < 420) q.alertIn = rand(0.3, 1.1);
}
function foeStep(p, dt) {                   // its post.step (js/08j postStep): always in charge of it
  if (p.state === 'flee') p.state = 'post';                         // never runs (alertPeds, a knock)
  const po = p.post;
  const back = () => { if (p.hold) { p.vx = p.vy = 0; return; } const w = castWay(p, po.x, po.y); if (w) castWalk(p, w.x, w.y, WALK, dt); else if (castWalk(p, po.x, po.y, WALK, dt) < 4) { p.vx = p.vy = 0; p.ang = p.hd = po.a; } castLift(p); };   // hold: a gunman who keeps his spot (up on a deck)
  if (!feat('msFoes') || p.calm) { back(); return true; }             // calm: waiting for a cutscene (a shot near, and it fights anyway)
  if (p.alertIn !== undefined && (p.alertIn -= dt) <= 0) { delete p.alertIn; foeAlert(p); }
  if ((p.tgT -= dt) <= 0) { p.tgT = 0.3; p.tg = castPick(p, foeTargets(), p.alert ? MSN.foeLeash * UNITS_PER_M : MSN.foeSee * UNITS_PER_M); }
  const t = p.tg;
  if (!p.alert) { if (t && t.see) foeAlert(p); else { back(); return true; } }
  if (!t) { back(); return true; }                                  // you are all far off: back to its post, still on edge
  const o = t.o, d = dist(p.x, p.y, o.x, o.y), w = WEAPONS[p.arm], face = () => { p.ang = p.hd = Math.atan2(o.y - p.y, o.x - p.x); };
  if (isMelee(w)) {                                                 // a bat, a knife: at you
    const reach = (w.reach || 20) + 16 + (t.kind === 'P' && P.car ? P.car.t.wid / 2 : 0);
    if (d > reach) { const w = castTo(p, o); castWalk(p, w.x, w.y, NPC_RUN, dt); castLift(p); } else { stepCop(p, 0, 0, 0, dt); face(); if ((p.cool -= dt) <= 0) { p.cool = w.rate * 2.6 + rand(0, 0.4); p.swingT = 0.25; castMelee(t, w); } }
    return true;
  }
  const range = Math.min(w.range || 300, COP.fireRange);
  if (p.hold) { p.vx = p.vy = 0; }
  else if (!t.see || d > range * 0.85) { const w = castTo(p, o); castWalk(p, w.x, w.y, NPC_RUN * (p.boss ? 0.85 : 1), dt); }   // closing in (by a door, or the tower's ramps, if it must)
  else if (d < 70) { const a = Math.atan2(p.y - o.y, p.x - o.x); stepCop(p, Math.cos(a), Math.sin(a), NPC_RUN * 0.5, dt); }   // too close: a step back
  else { if ((p.sdT -= dt) < 0) { p.sdT = rand(1.2, 2.6); p.sd = -p.sd; } const a = Math.atan2(o.y - p.y, o.x - p.x) + p.sd * Math.PI / 2; stepCop(p, Math.cos(a), Math.sin(a), WALK * 1.3, dt); }   // side-stepping
  castLift(p); face();
  if (t.see && d < range && (p.cool -= dt) <= 0) {
    if (w.id === 'smg' || w.auto) { if (!p.burst) p.burst = randi(COP.pplBurstMin, COP.pplBurstMax); p.burst--; p.cool = p.burst > 0 ? w.rate * 1.4 : rand(COP.pplGapMin, COP.pplGapMax); }
    else p.cool = rand(COP.pplGapMin, COP.pplGapMax) * (w.id === 'revolver' ? 1.4 : 1) * (p.boss ? 0.8 : 1);
    castShot(p, t, w, MSN.foeAim);
  }
  return true;
}

/* ---------- a friend ---------- */
function allyHurt(p, d) {
  if (p.dead || !(d > 0)) return; p.hp -= d; p.hurtT = 0;
  if (p.hp <= 0) { if (p.aboard) allyAlight(p); killPed(p, 'gun', false); return; }
  if (p.hurtLine && p.hp < p.hpMax * 0.5 && gameT - p.saidT > 25) { p.saidT = gameT; msLive([p.hurtLine], { now: true }); }
}
const allyRides = c => c && !c.dead && c.t.len > 44 && (c.mates || []).length < 3;   // not on a bike or a jet ski; three at most
function allyDoor(c, p) {                   // the passenger side of the car (or the other one if that is blocked)
  const rx = -Math.sin(c.ang), ry = Math.cos(c.ang), s = c.t.wid / 2 + 12;
  for (const sd of [1, -1]) { const x = c.x + rx * s * sd, y = c.y + ry * s * sd; if (!pedBlocked(x, y) && shoreDist(x, y) > 2) return { x, y }; }
  return { x: c.x + rx * s, y: c.y + ry * s };
}
function allyBoard(p, c) {
  const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1);
  p.aboard = c; (c.mates = c.mates || []).push(p); p.vx = p.vy = 0; p.x = c.x; p.y = c.y;
}
function allyAlight(p) {                    // out beside the car (or where it stood)
  const c = p.aboard; if (!c) return;
  if (c.mates) c.mates = c.mates.filter(q => q !== p);
  const d = allyDoor(c, p); p.x = d.x; p.y = d.y; p.z = zOf(c); p.aboard = null; p.vx = p.vy = 0;
  if (!peds.includes(p)) peds.push(p);
}
function allyStep(p, dt) {                  // its post.step: following you, fighting, getting in
  if (p.state === 'flee') p.state = 'post';
  if (p.hurtT > MSN.allyRest) p.hp = Math.min(p.hpMax, p.hp + MSN.allyRegen * dt); p.hurtT += dt;
  if (!feat('msAllies') || P.dead) { stepCop(p, 0, 0, 0, dt); return true; }
  const me = P.car || P, dP = dist(p.x, p.y, me.x, me.y), keep = MSN.allyKeep * UNITS_PER_M;
  if (P.car && allyRides(P.car) && carSpeed(P.car) < MSN.allyBoard * KMH) {   // you stopped in a car: in with you
    const dr = Object.assign(allyDoor(P.car, p), { z: zOf(P.car) });
    if (dP > MSN.allyCatch * UNITS_PER_M && dist(p.x, p.y, cam.x, cam.y) > 700) { allyBoard(p, P.car); return true; }   // far behind, out of sight: it caught up
    if (dP < 300) { const w = castTo(p, dr); if (castWalk(p, w.x, w.y, dP > 90 ? SPRINT : RUN, dt) < 16 && w === dr) allyBoard(p, P.car); castLift(p); return true; }
  }
  if ((p.tgT -= dt) <= 0) { p.tgT = 0.3; p.tg = p.calm ? null : castPick(p, allyTargets(), MSN.allyRange * UNITS_PER_M); }
  const t = p.tg && p.tg.see ? p.tg : null, w = WEAPONS[p.arm];
  const i = MS_CAST.allies.indexOf(p), side = i % 2 ? 1 : -1, ma = P.car ? P.car.ang : (P.ang || 0);
  const fx = me.x - Math.cos(ma) * keep * 0.6 + Math.cos(ma + Math.PI / 2) * side * keep * 0.6, fy = me.y - Math.sin(ma) * keep * 0.6 + Math.sin(ma + Math.PI / 2) * side * keep * 0.6;
  const df = dist(p.x, p.y, fx, fy);
  if (!P.car && dP > MSN.allyCatch * UNITS_PER_M && dist(p.x, p.y, cam.x, cam.y) > 700 && dist(fx, fy, cam.x, cam.y) > 420 && !pedBlocked(fx, fy) && shoreDist(fx, fy) > 2) { p.x = fx; p.y = fy; p.z = zOf(me); p.vx = p.vy = 0; return true; }   // far behind and out of sight: it caught up
  if (t && dP < keep * 4) {                                         // a foe in sight and you not far off: hold and shoot
    const range = Math.min(w.range || 300, COP.fireRange);
    if (t.d > range * 0.9) castWalk(p, t.o.x, t.o.y, RUN, dt); else stepCop(p, 0, 0, 0, dt);
    p.ang = p.hd = Math.atan2(t.o.y - p.y, t.o.x - p.x);
    if (t.d < range && (p.cool -= dt) <= 0) { p.cool = rand(0.55, 1.05); castShot(p, t, w, MSN.allyAim); }
  } else if (df > keep * 0.45 || Math.abs(zOf(p) - zOf(me)) > 20) { const w = castWay(p, fx, fy) || towerWay(p, fx, fy, zOf(me)) || { x: fx, y: fy }; castWalk(p, w.x, w.y, df > keep * 3 ? SPRINT : df > keep ? RUN : WALK * 1.6, dt); }
  else { stepCop(p, 0, 0, 0, dt); if (t) p.ang = p.hd = Math.atan2(t.o.y - p.y, t.o.x - p.x); }
  castLift(p); return true;
}

/* ---------- the foes' cars ---------- */
function foeBail(c) {                       // the crew out, on foot, fighting
  const F = c.fc; if (F.out) return F.men; F.out = true; F.men = [];
  c.driver = null; c.msDrive = null; c.thr = 0; c.str = 0; c.hb = true;
  const rx = -Math.sin(c.ang), ry = Math.cos(c.ang), s = c.t.wid / 2 + 12;
  for (let i = 0; i < F.crew; i++) {
    let x = c.x + rx * s * (i % 2 ? 1 : -1) - Math.cos(c.ang) * (i > 1 ? 18 : 0), y = c.y + ry * s * (i % 2 ? 1 : -1) - Math.sin(c.ang) * (i > 1 ? 18 : 0);
    if (pedBlocked(x, y)) { x = c.x - rx * s * (i % 2 ? 1 : -1); y = c.y - ry * s * (i % 2 ? 1 : -1); }
    F.men.push(Object.assign(msFoe(x, y, { gun: F.gun >= 0 ? WEAPONS[F.gun].id : 'pistol', alert: true, group: F.group, a: c.ang, hp: F.crewHp, boss: F.boss, shirt: F.shirt, pants: F.pants, name: F.name }), { z: zOf(c) }));
  }
  F.crew = 0; return F.men;
}
function foeRoad(c, x, y, slot) {           // the next point by road toward x, y (the police's way, js/07; one map per place, made again now and then)
  const R = slot || MS_CAST;
  if (!R.field || gameT > R.fieldT || dist(x, y, R.fx || 0, R.fy || 0) > 300) {
    R.field = R.field || new Float64Array(RN.length); R.fieldTo = roadFieldTo(x, y, R.field); R.fieldT = gameT + (slot ? 1e9 : 0.8); R.fx = x; R.fy = y;
  }
  return R.fieldTo ? copRoadTarget(c, _cw, R.field, R.fieldTo) : null;
}
function foeWater(c, t) {                   // a foes' boat: straight at you while the water between is open, else along a way round the land (js/08zy msWaterPath)
  const F = c.fc, open = (x1, y1, x2, y2) => { const n = Math.ceil(dist(x1, y1, x2, y2) / 40); for (let k = 1; k < n; k++) if (boatDist(lerp(x1, x2, k / n), lerp(y1, y2, k / n)) > -25) return false; return true; };
  if (open(c.x, c.y, t.x, t.y)) { F.wp = null; return { x: t.x + (t.vx || 0) * 0.35, y: t.y + (t.vy || 0) * 0.35 }; }
  if (!F.wp || gameT > F.wpT) { F.wp = msWaterPath([c.x, c.y], [t.x, t.y]); F.wpI = 1; F.wpT = gameT + 2.5; }
  while (F.wpI < F.wp.length - 1 && dist(c.x, c.y, F.wp[F.wpI][0], F.wp[F.wpI][1]) < 80) F.wpI++;
  const w = F.wp[Math.min(F.wpI, F.wp.length - 1)]; return { x: w[0], y: w[1] };
}
function foeDrive(c, dt) {                  // js/07 updateCars: c.msDrive
  const F = c.fc; if (!F || !MS.on || !feat('msFoes')) { c.thr = 0; c.str = 0; return; }
  if (F.crew > 0 && !c.t.boat && c.hp < c.maxhp * MSN.carBail / 100) { foeBail(c); return; }   // a boat's crew stays aboard (nobody jumps into the sea)
  if (F.wait > 0) { F.wait -= dt; c.thr = 0; c.str = 0; c.hb = true; return; }   // starting it up
  const tgt = P.car || P, d = dist(c.x, c.y, tgt.x, tgt.y), spd = carSpeed(c);
  let tx = tgt.x, ty = tgt.y, vmax = F.speed * KMH;
  if (F.mode === 'flee') {                                          // to: one place, or a list one after another (the last: gone)
    const list = Array.isArray(F.to) ? F.to : [F.to], to = list[F.ti || 0];
    if (dist(c.x, c.y, to.x, to.y) < 140) { if ((F.ti || 0) < list.length - 1) { F.ti = (F.ti || 0) + 1; F.field = null; } else { F.gone = true; c.thr = 0; c.hb = true; return; } }
    const w = foeRoad(c, to.x, to.y, F); if (w) { tx = w.x; ty = w.y; } else { tx = to.x; ty = to.y; }
  } else {
    if (F.crew > 0 && !c.t.boat && d < 150 && (!P.car || carSpeed(P.car) < 25 * KMH)) { c.str = 0; c.thr = spd > 30 ? -1 : 0; if (spd < 40) foeBail(c); return; }   // pulled up by you: out and at you
    if (c.t.boat) { const w = foeWater(c, tgt); tx = w.x; ty = w.y; }   // a boat: over the water
    else {
      const direct = d < 650 && losClear(c.x, c.y, tgt.x, tgt.y) && !waterBetween(c.x, c.y, tgt.x, tgt.y);
      if (direct) { tx = tgt.x + (tgt.vx || 0) * 0.35; ty = tgt.y + (tgt.vy || 0) * 0.35; }
      else { const w = foeRoad(c, tgt.x, tgt.y); if (w) { tx = w.x; ty = w.y; } }
    }
    if (d < 130) vmax = 50 * KMH;
  }
  if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.str = -clamp(angDiff(c.ang, Math.atan2(ty - c.y, tx - c.x)) * 2, -1, 1); }
  else {
    if (spd < 22 && d > 70) { c.stuck = (c.stuck || 0) + dt; if (c.stuck > 1.1) { c.rev = 0.9; c.stuck = 0; } } else c.stuck = 0;
    steerToward(c, tx, ty, vmax); c.hb = false;
  }
  if (F.crew > 0 && F.gun >= 0 && (F.cool -= dt) <= 0) {           // the gunner, out of the window
    if ((F.tgT -= dt) <= 0) { F.tgT = 0.3; F.tg = castPick(c, foeTargets(), COP.fireRange); }
    const t = F.tg; if (t && t.see && t.d < COP.fireRange) { const w = WEAPONS[F.gun]; F.cool = w.id === 'smg' ? rand(0.25, 0.45) : rand(COP.pplGapMin, COP.pplGapMax); castShot(c, t, w, MSN.foeAim * MSN.foeCarAim); }
    else F.cool = 0.3;
  }
}

/* ---------- every frame of a mission (msTick): friends riding with you ---------- */
function msCastTick(dt) {
  for (const p of MS_CAST.allies) {
    if (!p.aboard || p.dead) continue;
    const c = p.aboard; p.x = c.x; p.y = c.y;
    if ((P.car !== c && !p.stay) || c.dead || c.burn > 0 || c.sunk) { allyAlight(p); continue; }   // you got out (or it is on fire): out too - one who stays, stays in it
    if (p.hurtT > MSN.allyRest) p.hp = Math.min(p.hpMax, p.hp + MSN.allyRegen * dt); p.hurtT += dt;
    if (!feat('msAllies') || p.calm) continue;
    if ((p.tgT -= dt) <= 0) { p.tgT = 0.3; p.tg = castPick(c, allyTargets(), MSN.allyRange * UNITS_PER_M); }
    if (p.tg && p.tg.see && (p.cool -= dt) <= 0) { p.cool = rand(0.6, 1.1); castShot(c, p.tg, WEAPONS[p.arm], MSN.allyAim * 0.8); }   // from the passenger seat
  }
}

/* ---------- on screen: a bar over each friend (and a boss), the maps' dots ---------- */
const CAST_BARS = new Map();
function gfxCast() {                        // js/13 via gfxMs
  const want = new Set();
  if (MS.on && !CUT.on) {
    for (const p of MS_CAST.allies) if (!p.dead && !p.aboard) want.add(p);
    for (const p of peds) if (p.foe && p.boss && !p.dead) want.add(p);
  }
  for (const [p, b] of CAST_BARS) if (!want.has(p)) { scene.remove(b.g); CAST_BARS.delete(p); }
  for (const p of want) {
    let b = CAST_BARS.get(p);
    if (!b) {
      const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.6), new THREE.MeshBasicMaterial({ color: 0x07060c, depthTest: false, transparent: true, opacity: 0.8 }));
      const fg = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.ally ? p.col : '#ff3b4a'), depthTest: false }));
      fg.position.z = 0.1; g.add(bg, fg); g.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180); g.renderOrder = 9; bg.renderOrder = 9; fg.renderOrder = 10;
      scene.add(g); b = { g, fg, max: p.hpMax || p.hp }; CAST_BARS.set(p, b);
    }
    const f = clamp(p.hp / b.max, 0, 1); b.fg.scale.x = Math.max(0.01, f); b.fg.position.x = -11 * (1 - f);
    b.g.position.set(p.x, groundH(p.x, p.y) + 40, p.y);
  }
}
function msCastBlips(g, X, Y, q, inView) {   // js/14 maps: a foe a red dot, a friend a dot in its colour
  if (!MS.on) return;
  const dot = (x, y, col, r) => { if (!inView(x, y)) return; g.fillStyle = '#000'; g.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2); g.fillStyle = col; g.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const p of peds) if (p.foe && !p.dead && p.alert) dot(X(p.x), Y(p.y), '#ff3b4a', 1.6 * q);
  for (const c of MS_CAST.cars) if (!c.dead && !c.fc.out && !c.fc.gone && c.fc.mode !== 'park') dot(X(c.x), Y(c.y), '#ff3b4a', 2.4 * q);
  for (const p of MS_CAST.allies) if (!p.dead && !p.aboard) dot(X(p.x), Y(p.y), p.col, 1.8 * q);
}
