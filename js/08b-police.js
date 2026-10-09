'use strict';
/* ---------- 6d. POLICE ----------
   The police only know what they see or hear. A cop sees you inside a cone in front of them, within sight range, with nothing in between;
   once they have you they keep watching all round for a moment. Crimes they see or hear add heat (js/06); enough heat is a wanted level.
   Whoever sees you puts it on the radio, so every unit knows the spot where you were last seen. While nobody sees you they search: the
   search area (the red circle on the map) grows around that spot, police cars cruise its streets and cops on foot walk to it and look
   round. Stay out of sight long enough (it takes longer inside the area) and they give up.
   Only a few cars come: patrol cars near the spot join, more are sent from further away after a delay, up to the level's number.
   What they do when they have you depends on the level: a stop order (stand still for a fine, keep going and it gets worse), a chase
   that ends in an arrest, shooting only where the level allows it, after a warning and never with a passer-by in the line of fire.
   Busted or wasted, you start again at a police station or a hospital and lose some score.
   Every number comes from the police table in js/01b-police-data.js (COP). */
const PS = { seen: false, lx: 0, ly: 0, r: 0, lose: 0, seenT: -99, stopOn: false, holdT: 0, ignT: 0, armedT: -99, warned: false, fireAt: 0, dispT: 0, offT: 0, grab: 0, bustT: 0 };
function resetPolice() {
  Object.assign(PS, { seen: false, r: COP.searchStart, lose: 0, seenT: -99, stopOn: false, holdT: 0, ignT: 0, armedT: -99, warned: false, fireAt: 0, dispT: 0, offT: 0, grab: 0, bustT: 0 });
}

/* ---------- seeing and hearing ---------- */
function copSees(ex, ey, face, px, py, wide) {
  const d = dist(ex, ey, px, py); if (d > COP.sight * SKY.vis) return false;   // less far at night, in rain and fog (js/12d)
  if (!wide && d > 1 && Math.abs(angDiff(face, Math.atan2(py - ey, px - ex))) > COP.fov / 2) return false;
  return losClear(ex, ey, px, py);
}
const isPatrolCar = c => c.t.cop && (c.driver === 'ai' || c.driver === 'cop') && !c.dead;
function forCops(fn) {                   // every cop who can look: police cars with a crew inside (eyes at the windscreen), foot patrols, officers
  for (const c of cars) if (isPatrolCar(c)) fn(c, c.x + Math.cos(c.ang) * c.t.len * 0.3, c.y + Math.sin(c.ang) * c.t.len * 0.3, c.ang);
  for (const q of peds) if (q.cop && !q.dead && !q.knocked) fn(q, q.x, q.y, q.hd || 0);
  for (const o of officers) if (!o.dead && !o.knocked) fn(o, o.x, o.y, o.ang);
}
function unitSees(u, ex, ey, face) {     // a cop who has just seen you keeps watching all round (COP.track)
  u.sees = copSees(ex, ey, face, P.x, P.y, gameT - (u.seenT === undefined ? -99 : u.seenT) < COP.track);
  if (u.sees) u.seenT = gameT;
  return u.sees;
}
function policeKnow(x, y) { PS.lx = x; PS.ly = y; PS.r = COP.searchStart; PS.lose = 0; PS.seenT = gameT; }
/* a crime: it only counts when a cop sees it, hears it (hear: radius around you) or a bullet lands near one (ix, iy); armed: a gun or a blast */
function reportCrime(n, hear, ix, iy, armed) {
  if (RAMP.on || !feat('police')) return;                         // a rampage: the police look the other way (js/08f); a mode without police (js/01j)
  let w = false;
  forCops((u, x, y, face) => {
    if (w) return;
    if (hear && dist(x, y, P.x, P.y) < hear) w = true;
    else if (ix !== undefined && dist(x, y, ix, iy) < COP.impactHear) w = true;
    else if (unitSees(u, x, y, face)) w = true;
  });
  if (w) { addHeat(n); if (armed) PS.armedT = gameT; }
  return w;
}
function policeAlert(from, to) {         // a new wanted level: when the next car is sent
  const dl = COP.lv.delay[to] / OPT.police; PS.dispT = from === 0 ? dl : Math.min(PS.dispT, dl);   // tougher police (OPT) come sooner
  if (from === 0) { PS.lose = 0; PS.warned = false; PS.stopOn = false; PS.holdT = PS.ignT = 0; }
}
function clearWanted(msg) {              // they gave up, or you paid: the cars go back to patrolling and the crews back to their cars
  P.heat = 0; P.stars = 0; toast(msg);
  const armed = PS.armedT; resetPolice(); PS.armedT = armed;
  for (const c of cars) if (c.driver === 'cop') { c.driver = 'ai'; c.e = -1; c.searching = false; }
}

/* ---------- every frame ---------- */
function updatePolice(dt) {
  if (P.dead) { PS.grab = 0; return; }
  const lv = P.stars;
  if (lv === 0) {
    if (P.heat > 0 && P.sinceCrime > 5) { P.heat = Math.max(0, P.heat - COP.coolBelow * dt); updateStars(); }
    PS.grab = 0; PS.bustT = 0; return;
  }
  let seen = false; forCops((u, x, y, face) => { if (unitSees(u, x, y, face)) seen = true; });
  if (seen) { PS.seen = true; policeKnow(P.x, P.y); }
  else {
    PS.seen = false; PS.r = Math.min(COP.lv.searchMax[lv], PS.r + COP.searchGrow * dt);
    PS.lose += dt * (dist(P.x, P.y, PS.lx, PS.ly) < PS.r ? COP.insideRate : 1);
    if (PS.lose >= COP.lv.lose[lv] * OPT.police) { clearWanted('YOU LOST THEM'); return; }
  }
  if (COP.lv.stop[lv]) stopOrder(dt); else PS.stopOn = false;
  if (PS.grab) { PS.bustT += dt; if (PS.bustT >= COP.bustTime) { bustPlayer(); return; } }   // a cop has hold of you
  else PS.bustT = Math.max(0, PS.bustT - dt * 2);
  PS.grab = 0;
  dispatch(dt);
}

/* ---------- the stop order (levels with "stop"): stand still with a cop near and you get a fine; keep going and it gets worse ---------- */
function stopOrder(dt) {
  let near = false; forCops((u, x, y) => { if (u.sees && dist(x, y, P.x, P.y) < COP.stopRange) near = true; });
  const still = (P.car ? carSpeed(P.car) : Math.hypot(P.vx, P.vy)) < COP.still;
  if (near && !PS.stopOn) { PS.stopOn = true; PS.holdT = PS.ignT = 0; toast('POLICE! STOP RIGHT THERE!', true); Snd.tone(700, 1100, 0.25, 0.12, 'square'); }
  if (!PS.stopOn) return;
  if (still) { if (near) { PS.holdT += dt; if (PS.holdT >= COP.stopHold) payFine(); } }
  else { PS.holdT = 0; if (PS.seen && (PS.ignT += dt) >= COP.stopIgnore) resist(); }
}
function payFine() {
  const f = Math.min(P.score, Math.round(COP.fine)); P.score -= f;
  if (f > 0) popup(P.x, P.y - 14, '-' + f + ' FINE', '#ff3b5c');
  clearWanted(f > 0 ? 'FINED ' + f + '. ON YOUR WAY' : 'LET OFF WITH A WARNING');
}
function resist() {
  PS.stopOn = false; P.heat = Math.max(P.heat, COP.lv.heat[Math.min(5, P.stars + 1)]); updateStars();
  toast('RESISTING! WANTED LEVEL ' + P.stars, true);
}

/* ---------- sending cars and officers ---------- */
function chasingCars() {
  let n = 0; for (const c of cars) if (c.t.cop && !c.dead && c.burn <= 0 && (c.driver === 'cop' || c.crewOut > 0)) n++; return n;
}
function dispatch(dt) {
  const lv = P.stars, cap = lv ? Math.max(1, Math.round(COP.lv.cars[lv] * OPT.police)) : 0; let n = chasingCars();
  for (const c of cars) {                // patrol cars that see you, or are near where you were last seen, join first
    if (n >= cap) break;
    if (c.t.cop && c.t.chaseFrom <= lv && c.driver === 'ai' && !c.dead && c.burn <= 0 && (c.sees || dist(c.x, c.y, PS.lx, PS.ly) < COP.lv.respond[lv])) { c.driver = 'cop'; c.e = -1; n++; }
  }
  if (n < cap && (PS.dispT -= dt) <= 0) PS.dispT = spawnCop() ? COP.lv.every[lv] : 0.5;   // then cars from further away
  let foot = 0; for (const o of officers) if (!o.dead && !o.car) foot++;
  if ((PS.offT -= dt) <= 0 && !P.car && foot < COP.lv.officers[lv]) {
    PS.offT = 3.5; const s = sidewalkSpot(offDist(), offDist() + 500, 25); if (s) officers.push(makeOfficer(s.x, s.y));
  }
}

/* ---------- police cars ---------- */
function copDrive(c, dt) {
  const tgt = P.car || P, lv = P.stars, d = dist(c.x, c.y, tgt.x, tgt.y), spd = carSpeed(c);
  const vmax = Math.min(c.t.max * 0.92, COP.lv.speed[lv] || 50 * KMH);
  c.hb = false;
  if (!PS.seen && dist(c.x, c.y, PS.lx, PS.ly) < PS.r * 0.8 + 60) {     // nobody sees you and this car is at the search area: cruise its streets
    if (!c.searching) { c.searching = true; c.e = -1; c.cruise = COP.searchSpeed; }
    aiDrive(c, dt); return;
  }
  c.searching = false;
  let tx = PS.lx, ty = PS.ly, direct = false;
  if (PS.seen) {
    tx = tgt.x + (tgt.vx || 0) * 0.35; ty = tgt.y + (tgt.vy || 0) * 0.35;
    const stopAt = COP.pullUp + c.t.len * 0.5 + (P.car ? P.car.t.len * 0.5 : 0) + spd * 0.3, heavy = c.t.mass >= 10;   // heavy: the tank - no crew gets out, it just rolls at you
    if (!heavy && (!P.car || !COP.lv.ram[lv]) && d < stopAt) {        // pull up near you; once you are stopped (or on foot) the crew gets out
      c.str = 0; c.thr = spd > 30 ? -1 : 0; c.hb = c.thr === 0;
      if (spd < 30 && c.sees && (!P.car || carSpeed(P.car) < COP.bustCarSpeed * 2)) copsExit(c);
      return;
    }
    direct = d < 650 && losClear(c.x, c.y, tgt.x, tgt.y) && !waterBetween(c.x, c.y, tgt.x, tgt.y);
  }
  if (!direct) { const w = copRoadTarget(c, _cw); if (w) { tx = w.x; ty = w.y; } }   // by road to you, or to where you were last seen
  if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.str = -clamp(angDiff(c.ang, Math.atan2(ty - c.y, tx - c.x)) * 2, -1, 1); return; }
  if (spd < 22 && d > 70) { c.stuck += dt; if (c.stuck > 1.1) { c.rev = 0.9; c.stuck = 0; } } else c.stuck = 0;
  steerToward(c, tx, ty, PS.seen && d < 130 ? 50 * KMH : vmax);
  if (PS.seen && d < 55 && spd < 60) c.thr = 0;
}
function copsExit(c) {
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang); c.crewOut = c.crewIn = 0;
  for (const sd of [-1, 1]) { const o = makeOfficer(c.x - fy * sd * 24, c.y + fx * sd * 24); o.ang = c.ang; o.car = c; o.seenT = gameT; officers.push(o); c.crewOut++; }
  c.driver = null; c.thr = 0; c.str = 0; c.hb = true; c.searching = false; Snd.tone(500, 400, 0.05, 0.1, 'square');
}
function crewBack(o) { const c = o.car; o.car = null; if (c) { c.crewIn = (c.crewIn || 0) + 1; crewLeft(c); } }   // back in the car
function crewLost(o) { const c = o.car; o.car = null; if (c) crewLeft(c); }                                         // killed, or the car is gone
function crewLeft(c) {                   // one officer fewer outside; when none are, whoever got back in drives off
  c.crewOut = Math.max(0, (c.crewOut || 1) - 1);
  if (c.crewOut === 0 && c.crewIn > 0 && !c.driver && !c.dead) { c.driver = P.stars > 0 ? 'cop' : 'ai'; c.e = -1; c.hb = false; }
}

/* ---------- cops on foot: foot patrols and officers ---------- */
function stepCop(q, mx, my, sp, dt) {
  const kk = 1 - Math.exp(-8 * dt);
  q.vx = lerp(q.vx, mx * sp, kk); q.vy = lerp(q.vy, my * sp, kk);
  q.x += q.vx * dt; q.y += q.vy * dt; resolveCircle(q, 7); q.bob += Math.hypot(q.vx, q.vy) * dt * 0.12;
}
function walkTo(q, x, y, sp, dt) {
  const dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
  if (d > 4) { q.ang = q.hd = Math.atan2(dy, dx); stepCop(q, dx / d, dy / d, sp, dt); } else stepCop(q, 0, 0, 0, dt);
  return d;
}
const copArmed = () => COP.lv.shoot[P.stars] || (COP.lv.shootBack[P.stars] && gameT - PS.armedT < COP.armedFor);
function clearShot(q, tgt, d) {          // nobody else in the line of fire
  if (!COP.bystanders || d < 1) return true;
  const dx = (tgt.x - q.x) / d, dy = (tgt.y - q.y) / d;
  for (const p of peds) {
    if (p.dead || p.cop || Math.abs(p.x - q.x) > d + 12 || Math.abs(p.y - q.y) > d + 12) continue;
    const rx = p.x - q.x, ry = p.y - q.y, t = rx * dx + ry * dy;
    if (t > 0 && t < d && Math.abs(rx * dy - ry * dx) < 12) return false;
  }
  return true;
}
function copShoot(q, tgt, d) {
  q.cool = rand(COP.gapMin, Math.max(COP.gapMin, COP.gapMax));
  tracers.push({ x1: q.x + Math.cos(q.ang) * 14, y1: q.y + Math.sin(q.ang) * 14, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: 0.07 });
  Snd.tone(900, 200, 0.05, 0.06, 'square');
  if (Math.random() < lerp(COP.accNear, COP.accFar, clamp(d / COP.fireRange, 0, 1))) { if (P.car) damageCar(P.car, COP.dmgCar, false); else damagePlayer(COP.dmgFoot); }
}
const copEngaged = q => P.stars > 0 && !P.dead && (q.sees || dist(q.x, q.y, PS.lx, PS.ly) < 600);
function copCombat(q, dt) {
  const tgt = P.car || P, lv = P.stars, d = dist(q.x, q.y, tgt.x, tgt.y), run = COP.footSpeed;
  q.cool = (q.cool === undefined ? 0.5 : q.cool) - dt;
  if (!q.sees || P.dead) {               // no sight of you: to where you were last seen, then look round the search area
    if (q.lookAt !== PS.seenT) { q.lookAt = PS.seenT; q.look = { x: PS.lx, y: PS.ly }; q.lookT = 12; }
    else if ((q.lookT -= dt) <= 0 || dist(q.x, q.y, q.look.x, q.look.y) < 20) {
      const a = rand(0, TAU), r = rand(0.3, 1) * PS.r; q.look = { x: PS.lx + Math.cos(a) * r, y: PS.ly + Math.sin(a) * r }; q.lookT = rand(4, 7);
    }
    walkTo(q, q.look.x, q.look.y, run * 0.75, dt); return;
  }
  q.ang = q.hd = Math.atan2(tgt.y - q.y, tgt.x - q.x);
  const reach = P.car ? P.car.t.len / 2 + 16 : COP.bustReach, stop = COP.lv.stop[lv];
  let sp = 0;
  if (copArmed()) {                      // armed response: a warning first, then they shoot from cover distance
    if (!PS.warned) { PS.warned = true; PS.fireAt = gameT + COP.warn; toast('POLICE! DROP YOUR WEAPON!', true); Snd.tone(600, 1000, 0.3, 0.12, 'square'); }
    if (d > 120) sp = run;
    if (d < COP.fireRange && q.cool <= 0 && gameT >= PS.fireAt && clearShot(q, tgt, d)) copShoot(q, tgt, d);
  } else if (stop) { if (d > reach + 24) sp = run * 0.6; }             // a stop order: walk up to you and wait
  else if (d > reach - 4) sp = run;                                   // an arrest: run you down
  if (!stop && d < reach && (!P.car || carSpeed(P.car) < COP.bustCarSpeed)) PS.grab++;
  stepCop(q, Math.cos(q.ang), Math.sin(q.ang), sp, dt);
}
function updateOfficers(dt) {
  for (let k = officers.length - 1; k >= 0; k--) {
    const o = officers[k];
    if (o.dead) { o.deadT += dt; if (o.deadT > bodyTime(o)) officers.splice(k, 1); continue; }
    if (o.knocked) continue;
    if (o.stunT > 0) { o.stunT -= dt; continue; }                   // knocked down by a melee hit (js/06b)
    const c = o.car;
    if (c && (c.dead || c.sunk || c.driver || !cars.includes(c))) crewLost(o);      // their car is gone, or someone drove off in it
    const tgt = P.car || P, d = dist(o.x, o.y, tgt.x, tgt.y);
    if (P.stars === 0 || P.dead || (o.car && P.car && d > 260)) {     // done here, or you drove off: back to the car (or away)
      if (o.car) { if (walkTo(o, o.car.x, o.car.y, COP.footSpeed, dt) < 26) { crewBack(o); officers.splice(k, 1); } }
      else {
        o.gone = (o.gone || 0) + dt; walkTo(o, o.x + (o.x - tgt.x), o.y + (o.y - tgt.y), WALK, dt);
        if (d > visRadius() + 80 || o.gone > 25) officers.splice(k, 1);
      }
      continue;
    }
    o.gone = 0;
    if (!o.car && d > 1700) { officers.splice(k, 1); continue; }
    copCombat(o, dt);
  }
}

/* ---------- busted, wasted, and back on the street ---------- */
function bustPlayer() {
  if (P.dead || state !== 'play') return;
  if (P.car) exitCar(true);
  P.busted = true; P.dead = true; P.hp = 0; P.vx = P.vy = 0; deadTimer = 0; state = 'dying'; cam.shake = Math.max(cam.shake, 6);
  Snd.tone(300, 80, 0.3, 0.2, 'square');
  $('wasted').textContent = 'BUSTED'; $('wasted').style.display = 'flex';
}
let refuges = null;
function refugeSpot(x, y) {              // the police station or hospital of the nearest district: a sidewalk near the middle of it
  if (!refuges) {
    refuges = [];
    for (const [, r] of MAP.districts) {
      const rd = nearestRoad((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 8000); if (!rd) continue;
      for (const side of [1, -1]) { const q = sidewalkPoint({ e: rd.e, fw: 1, s: rd.s, side }, 0, {}); if (!pedBlocked(q.x, q.y) && shoreDist(q.x, q.y) > 8) { refuges.push(q); break; } }
    }
  }
  let best = null, bd = Infinity; for (const q of refuges) { const d = dist(q.x, q.y, x, y); if (d < bd) { bd = d; best = q; } }
  return best || { x, y };
}
function serviceDoor(kind, x, y) {        // the nearest hospital (or police station): a spot on the pavement in front of its door
  let best = null, bd = Infinity;
  for (const s of SVC[kind]) { const d = dist(s.r.cx, s.r.cy, x, y); if (d < bd) { bd = d; best = s.r; } }
  if (best) {
    const zx = -best.sa, zy = best.ca;
    for (const off of [22, 34, 48, 64]) {
      const px = best.cx + zx * (best.lh / 2 + off), py = best.cy + zy * (best.lh / 2 + off);
      if (!pedBlocked(px, py) && shoreDist(px, py) > 8) return { x: px, y: py, ang: Math.atan2(zy, zx) };
    }
  }
  return refugeSpot(x, y);
}
function respawn() {
  const busted = P.busted, lose = Math.round(P.score * (busted ? COP.bustedCash : COP.wastedCash));
  if (P.score > best) { best = P.score; try { localStorage.setItem('blockrunner.best', String(best)); } catch (e) { } }
  const sp = serviceDoor(busted ? 'police' : 'hospital', P.x, P.y), strip = busted ? COP.bustedWeapons : COP.wastedWeapons;
  Object.assign(P, { x: sp.x, y: sp.y, ang: sp.ang || 0, vx: 0, vy: 0, hp: 100, armor: 0, car: null, act: null, dead: false, busted: false, heat: 0, stars: 0, sinceCrime: 99,
    rel: 0, relW: -1, cool: 0, hurtT: 0, trig: false, dry: false, score: P.score - lose });
  if (P.knocked) { P.knocked = false; P.air = 0; P.kvx = P.kvy = P.kvz = 0; const i = KNOCK.indexOf(P); if (i >= 0) KNOCK.splice(i, 1); }
  if (strip) {                                                    // they take your weapons, except the ones the weapon table lets you keep
    P.has = WEAPONS.map((w, i) => w.keep && P.has[i]); P.ammo = WEAPONS.map((w, i) => w.keep ? P.ammo[i] : 0); P.mag = WEAPONS.map((w, i) => w.keep ? P.mag[i] : 0);
    P.weapon = Math.max(0, P.has.indexOf(true)); P.swing = null;
  }
  clearRockets(); officers = []; resetPolice();
  for (const c of cars) if (c.driver === 'cop' || c.crewOut) { c.driver = 'ai'; c.crewOut = c.crewIn = 0; c.e = -1; c.searching = false; }
  cars = cars.filter(c => c.keep || dist(c.x, c.y, P.x, P.y) < 2200); CALLS = []; peds = peds.filter(p => !p.dead && dist(p.x, p.y, P.x, P.y) < 1500);
  let traffic = 0, parked = 0, foot = 0; for (const c of cars) { if (c.driver === 'ai') traffic++; else if (!c.driver && !c.dead && !c.lot && !c.keep) parked++; }
  for (const p of peds) if (p.cop) foot++;
  for (; traffic < 32; traffic++) spawnTraffic(true);
  for (; parked < 14; parked++) spawnParked(true);
  for (const L of LOTS) L.filled = cars.some(c => c.lot === L); fillLots(true);
  for (let k = peds.length; k < 50; k++) if (k % 3 || !spawnStroller(true)) spawnPedNear(true);
  for (const c of cars) if (c.task) endCall(c);
  for (; foot < COP.footPatrols; foot++) spawnFootCop(true);
  cam.x = P.x; cam.y = P.y; cam.zoom = ZOOM_BASE; cam.shake = 0; streamCity(true);
  state = 'play'; deadTimer = 0; $('wasted').style.display = 'none'; $('wasted').textContent = 'WASTED'; updateGearUi();
  toast((busted ? 'OUT ON BAIL' : 'OUT OF HOSPITAL') + (lose > 0 ? ' -' + lose : ''));
}
