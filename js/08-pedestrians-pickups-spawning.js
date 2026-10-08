'use strict';
/* ---------- 6c. PEDESTRIANS, OFFICERS, PICKUPS, SPAWNING ---------- */
/* people walk the sidewalks: along a road edge, SIDEWALK units to one side of the centre line, picking a new edge at each junction */
const _pw = {};
function walkOffset(x, y) { return shoreDist(x, y) < 10 ? ROAD_HALF - 12 : SIDEWALK; }   // on bridges and at the water's edge, keep to the deck
function sidewalkPoint(p, ahead, out) {
  const E = RE[p.e], s = clamp(p.s + ahead, 0, E.len);
  lanePoint(p.e, p.fw, s, 0, out); const cx = out.x, cy = out.y, off = walkOffset(cx - out.ty * p.side * SIDEWALK, cy + out.tx * p.side * SIDEWALK) * p.side;
  out.x = cx - out.ty * off; out.y = cy + out.tx * off; return out;
}
function pedNext(p) {                         // reached the end of the edge: choose the next one, sometimes cross the road
  const E = RE[p.e], node = p.fw > 0 ? E.b : E.a, opts = RN[node].e.filter(ei => ei !== p.e);
  const ne = opts.length ? pick(opts) : p.e, F = RE[ne];
  if (ne === p.e) { p.fw = -p.fw; p.side = -p.side; }
  else { p.e = ne; p.fw = F.a === node ? 1 : -1; if (Math.random() < 0.15) p.side = -p.side; }
  p.s = 0; if (Math.random() < 0.08) p.wait = rand(0.5, 2);
}
function snapPed(p) {                         // after fleeing or fighting: rejoin the nearest sidewalk, keeping to the side the person is on
  const r = nearestRoad(p.x, p.y, 700); if (!r) { p.e = -1; return; }
  const t = edgeAt(r.e, r.s, _pw), side = (p.x - r.x) * -t.ty + (p.y - r.y) * t.tx >= 0 ? 1 : -1, fw = Math.random() < 0.5 ? 1 : -1;
  p.e = r.e; p.fw = fw; p.s = fw > 0 ? r.s : RE[r.e].len - r.s; p.side = side * fw;
}
function updatePeds(dt) {
  for (const p of peds) {
    if (p.dead) { p.deadT += dt; continue; }
    if (p.cop && P.stars > 0 && !P.dead && dist(p.x, p.y, P.x, P.y) < 700) { p.combat = true; p.state = 'walk'; copCombat(p, dt); continue; }
    if (p.combat) { p.combat = false; p.cv = null; snapPed(p); }
    if (p.e < 0) snapPed(p);
    let mx = 0, my = 0, sp = 0;
    if (p.state === 'flee') {
      const m = Math.hypot(p.fx, p.fy) || 1; mx = p.fx / m; my = p.fy / m; sp = 150 * SPEED_K; p.fl -= dt;
      if (p.fl <= 0) { p.state = 'walk'; snapPed(p); }
    } else if (p.wait > 0) p.wait -= dt;
    else if (p.e >= 0) {
      const c = sidewalkPoint(p, 14, _pw), dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
      if (d < 26) p.s += p.speed * dt;        // keep the carrot just ahead; it only moves on once we are close to it
      if (p.s >= RE[p.e].len) pedNext(p);
      if (d > 2) { mx = dx / d; my = dy / d; sp = p.speed; }
    }
    p.vx = lerp(p.vx, mx * sp, 1 - Math.exp(-10 * dt)); p.vy = lerp(p.vy, my * sp, 1 - Math.exp(-10 * dt));
    p.x += p.vx * dt; p.y += p.vy * dt; p.bob += Math.hypot(p.vx, p.vy) * dt * 0.12;
    if (p.cop && Math.hypot(p.vx, p.vy) > 8) { p.hd = Math.atan2(p.vy, p.vx); p.ang = p.hd; }
    if (resolveCircle(p, 7) && p.state === 'flee') { p.fx = -p.fx + rand(-30, 30); p.fy = -p.fy + rand(-30, 30); }
  }
}
/* Foot cops: with 2+ stars they close in and shoot (only 20% of shots land); with 1 star they run you down and bust you on contact. */
const COP_ACCURACY = 0.2, COP_FIRE_RANGE = 320;
function bustPlayer() {
  if (P.dead || state !== 'play') return;
  if (P.car) exitCar(true);
  P.busted = true; P.dead = true; P.hp = 0; P.vx = P.vy = 0; deadTimer = 0; state = 'dying'; cam.shake = Math.max(cam.shake, 6);
  Snd.tone(300, 80, 0.3, 0.2, 'square');
  $('wasted').textContent = 'BUSTED'; $('wasted').style.display = 'flex';
}
function copCombat(q, dt) {
  const tgt = P.car || P, d = dist(q.x, q.y, tgt.x, tgt.y), los = losClear(q.x, q.y, tgt.x, tgt.y);
  q.ang = Math.atan2(tgt.y - q.y, tgt.x - q.x); q.hd = q.ang;
  let mx = 0, my = 0, sp = 0; q.cool = (q.cool === undefined ? 0.5 : q.cool) - dt;
  if (P.stars >= 2) {
    q.cv = null;
    if (d > 180 || !los) { mx = Math.cos(q.ang); my = Math.sin(q.ang); sp = 118 * SPEED_K; }
    if (los && d < COP_FIRE_RANGE && q.cool <= 0 && !P.dead) {
      q.cool = rand(0.6, 1.1);
      tracers.push({ x1: q.x + Math.cos(q.ang) * 14, y1: q.y + Math.sin(q.ang) * 14, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: 0.07 });
      Snd.tone(900, 200, 0.05, 0.06, 'square');
      if (Math.random() < COP_ACCURACY) { if (P.car) damageCar(P.car, 5, false); else damagePlayer(6); }
    }
  } else if (P.stars === 1) {                         // one star: no shooting, they just want to catch you
    q.cv = null; mx = Math.cos(q.ang); my = Math.sin(q.ang); sp = 118 * SPEED_K;
    const reach = P.car ? P.car.t.len / 2 + 16 : 19;
    if (!P.dead && d < reach && (!P.car || carSpeed(P.car) < 40)) bustPlayer();
    if (d < reach - 4) sp = 0;
  }
  const kk = 1 - Math.exp(-8 * dt);
  q.vx = lerp(q.vx, mx * sp, kk); q.vy = lerp(q.vy, my * sp, kk);
  q.x += q.vx * dt; q.y += q.vy * dt; resolveCircle(q, 7); q.bob += Math.hypot(q.vx, q.vy) * dt * 0.12;
}
function updateOfficers(dt) {
  for (let k = officers.length - 1; k >= 0; k--) {
    const o = officers[k];
    if (o.dead) { o.deadT += dt; if (o.deadT > 20) officers.splice(k, 1); continue; }
    const tgt = P.car || P, d = dist(o.x, o.y, tgt.x, tgt.y), los = losClear(o.x, o.y, tgt.x, tgt.y);
    o.away = (P.stars === 0 || d > 1500 || (!los && d > 400)) ? (o.away || 0) + dt : 0;
    if (o.away > 8 || d > 1700) { officers.splice(k, 1); continue; }
    copCombat(o, dt);
  }
}
let pickupQ = [];                            // game times at which a picked-up item comes back somewhere else
const PICKUP_N = 60, PICKUP_BACK = 25;
function spawnPickup() {                      // anywhere on the map: a random sidewalk spot, chosen by road length
  const total = RE.reduce((a, e) => a + e.len, 0);
  for (let tr = 0; tr < 30; tr++) {
    let r = Math.random() * total, e = 0; while (e < RE.length - 1 && r > RE[e].len) { r -= RE[e].len; e++; }
    const w = { e, fw: 1, s: r, side: Math.random() < 0.5 ? 1 : -1 }, q = sidewalkPoint(w, 0, {});
    if (shoreDist(q.x, q.y) < 12 || pedBlocked(q.x, q.y) || pickups.some(k => dist(k.x, k.y, q.x, q.y) < 200)) continue;
    pickups.push({ x: q.x, y: q.y, type: pick(['health', 'pistol', 'mg', 'mg', 'cash', 'cash']), bob: rand(0, 6) }); return;
  }
}
function updatePickups(dt) {
  for (let k = pickups.length - 1; k >= 0; k--) {
    const p = pickups[k]; p.bob += dt * 4;
    if (dist(P.x, P.y, p.x, p.y) > 26) continue;
    if (p.type === 'health') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 40); popup(p.x, p.y - 12, '+HEALTH', '#ff6b86'); }
    else if (p.type === 'pistol') { P.ammo[0] = Math.min(250, P.ammo[0] + 24); popup(p.x, p.y - 12, '+24 PISTOL', '#3fe0ff'); }
    else if (p.type === 'mg') { P.ammo[1] = Math.min(400, P.ammo[1] + 60); popup(p.x, p.y - 12, '+60 MG', '#3fe0ff'); }
    else addScore(500, p.x, p.y, 'CASH');
    Snd.pickup(); pickups.splice(k, 1); pickupQ.push(gameT + PICKUP_BACK);
  }
  while (pickupQ.length && pickupQ[0] <= gameT) { pickupQ.shift(); spawnPickup(); }
}
function sidewalkSpot(minD, maxD, tries) {   // a sidewalk point between minD and maxD from the player
  for (let tr = 0; tr < tries; tr++) {
    const a = rand(0, TAU), d0 = rand(minD, maxD), r = nearestRoad(P.x + Math.cos(a) * d0, P.y + Math.sin(a) * d0, 260); if (!r) continue;
    const fw = Math.random() < 0.5 ? 1 : -1, w = { e: r.e, fw, s: fw > 0 ? r.s : RE[r.e].len - r.s, side: Math.random() < 0.5 ? 1 : -1 }, q = sidewalkPoint(w, 0, {});
    const d = dist(q.x, q.y, P.x, P.y); if (d < minD || d > maxD || shoreDist(q.x, q.y) < 6 || pedBlocked(q.x, q.y)) continue;
    w.x = q.x; w.y = q.y; return w;
  }
  return null;
}
function spawnFootCop(initial) {
  const s = initial ? sidewalkSpot(90, 1100, 30) : sidewalkSpot(visRadius() + 30, 1250, 25); if (!s) return;
  peds.push(makeFootCop(s.x, s.y, s));
}
function spawnPedNear(initial) {
  const s = initial ? sidewalkSpot(90, 1100, 30) : sidewalkSpot(visRadius() + 30, 1250, 25); if (!s) return;
  peds.push(makePed(s.x, s.y, s));
}
function laneSpot(minD, maxD, kerb) {         // a point on a lane (or at the kerb) between minD and maxD from the player
  for (let tr = 0; tr < 40; tr++) {
    const a = rand(0, TAU), d0 = rand(minD, maxD), r = nearestRoad(P.x + Math.cos(a) * d0, P.y + Math.sin(a) * d0, 300); if (!r) continue;
    const E = RE[r.e]; if (r.s < 60 || r.s > E.len - 60) continue;          // not in the middle of a junction
    const fw = Math.random() < 0.5 ? 1 : -1, s = fw > 0 ? r.s : E.len - r.s, q = lanePoint(r.e, fw, s, kerb ? ROAD_HALF - 15 : LANE, {});
    const d = dist(q.x, q.y, P.x, P.y); if (d < minD || d > maxD) continue;
    if (shoreDist(q.x, q.y) < (kerb ? 60 : 20) || cars.some(c => dist(c.x, c.y, q.x, q.y) < 90)) continue;
    return { x: q.x, y: q.y, ang: Math.atan2(q.ty, q.tx), e: r.e, fw, s };
  }
  return null;
}
function spawnTraffic(initial) {
  const s = laneSpot(initial ? 140 : offDist(), initial ? 1100 : 1500); if (!s) return;
  const r = Math.random(), type = r < 0.5 ? 'sedan' : r < 0.7 ? 'sports' : r < 0.9 ? 'truck' : 'police';
  const c = makeCar(type, s.x, s.y, s.ang, 'ai'); c.e = s.e; c.fw = s.fw; c.s = s.s;
  c.vx = Math.cos(c.ang) * 140 * SPEED_K; c.vy = Math.sin(c.ang) * 140 * SPEED_K; cars.push(c);
}
function spawnParked(initial) {
  const s = laneSpot(initial ? 130 : offDist(), initial ? 1300 : 1500, true); if (!s) return;   // two wheels up on the kerb
  cars.push(makeCar(pick(['sedan', 'sedan', 'sports', 'truck']), s.x, s.y, s.ang + rand(-0.05, 0.05), null));
}
function spawnCop() {
  const s = laneSpot(offDist(), offDist() + 700); if (!s) return;
  const c = makeCar('police', s.x, s.y, s.ang, 'cop'); c.vx = Math.cos(c.ang) * 200 * SPEED_K; c.vy = Math.sin(c.ang) * 200 * SPEED_K; cars.push(c);
}
let spawnT = 0, copT = 0, offT = 0;
function manageSpawns(dt) {
  spawnT -= dt; copT -= dt; offT -= dt;
  for (let k = cars.length - 1; k >= 0; k--) { const c = cars[k]; if (P.car !== c && (dist(c.x, c.y, P.x, P.y) > 2200 || (c.dead && c.deadT > 30) || (c.sunk && c.sinkT > 4))) cars.splice(k, 1); }
  for (let k = peds.length - 1; k >= 0; k--) { const p = peds[k]; if (p.dead ? p.deadT > 25 : dist(p.x, p.y, P.x, P.y) > 1500) peds.splice(k, 1); }
  if (spawnT <= 0) {
    spawnT = 0.3; let traffic = 0, parked = 0, live = 0;
    for (const c of cars) { if (c.driver === 'ai') traffic++; else if (!c.driver && !c.dead) parked++; }
    for (const p of peds) if (!p.dead) live++;
    if (traffic < 32) spawnTraffic(false); else if (parked < 16) spawnParked(false);
    let fc = 0; for (const q of peds) if (q.cop && !q.dead) fc++;
    if (fc < 6) spawnFootCop(false); else if (live < 56) spawnPedNear(false);
  }
  let copsN = 0; for (const c of cars) if (c.driver === 'cop' && !c.dead && c.burn <= 0) copsN++;
  if (P.stars === 1) { let fo = 0; for (const o of officers) if (!o.dead) fo++; copsN += Math.ceil(fo / 2); }
  if (copT <= 0 && copsN < [0, 1, 2, 3, 5, 7][P.stars]) { copT = 1.6; spawnCop(); }
  if (offT <= 0 && P.stars >= 2 && !P.car && officers.filter(o => !o.dead).length < P.stars * 2 - 2) {
    offT = 3.5; const s = sidewalkSpot(offDist(), offDist() + 500, 25); if (s) officers.push(makeOfficer(s.x, s.y));
  }
}
function updateParticles(dt) {
  for (let k = parts.length - 1; k >= 0; k--) {
    const p = parts[k]; p.life -= dt; if (p.life <= 0) { parts.splice(k, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
    if (p.vz !== undefined) { p.z += p.vz * dt; p.vz -= (p.grav || 0) * dt; if (p.z < 1) { p.z = 1; p.vz = 0; } }
  }
  for (let k = tracers.length - 1; k >= 0; k--) if ((tracers[k].life -= dt) <= 0) tracers.splice(k, 1);
  for (let k = pops.length - 1; k >= 0; k--) { pops[k].life -= dt; pops[k].h = (pops[k].h || 18) + 34 * dt; if (pops[k].life <= 0) pops.splice(k, 1); }
  for (let k = decals.length - 1; k >= 0; k--) if ((decals[k].life -= dt) <= 0) decals.splice(k, 1);
  for (let k = skids.length - 1; k >= 0; k--) if ((skids[k].a -= dt * 0.03) <= 0) skids.splice(k, 1);
}

