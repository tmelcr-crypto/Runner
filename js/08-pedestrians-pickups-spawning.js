'use strict';
/* ---------- 6c. PEDESTRIANS, OFFICERS, PICKUPS, SPAWNING ---------- */
function pedNext(p) {
  const k = p.tk, i = p.i, j = p.j;
  if (!p.justCrossed && Math.random() < 0.22) {
    const opts = k === 0 ? [[i - 1, j, 1], [i, j - 1, 3]] : k === 1 ? [[i + 1, j, 0], [i, j - 1, 2]] : k === 2 ? [[i + 1, j, 3], [i, j + 1, 1]] : [[i - 1, j, 2], [i, j + 1, 0]];
    const v = opts.filter(o => o[0] >= 0 && o[1] >= 0 && o[0] < N && o[1] < N);
    if (v.length) { const o = pick(v); p.i = o[0]; p.j = o[1]; p.tk = o[2]; p.justCrossed = true; return; }
  }
  p.justCrossed = false; p.tk = (k + p.dir + 4) % 4;
  if (Math.random() < 0.08) p.wait = rand(0.5, 2);
}
function snapPed(p) {
  const ci = Math.floor(p.x / CELL), cj = Math.floor(p.y / CELL); let bd = 1e9;
  for (let i = ci - 1; i <= ci; i++) for (let j = cj - 1; j <= cj; j++) {
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    for (let k = 0; k < 4; k++) { const c = cornerPos(i, j, k), d = dist(p.x, p.y, c[0], c[1]); if (d < bd) { bd = d; p.i = i; p.j = j; p.tk = k; } }
  }
  p.justCrossed = true;
}
function updatePeds(dt) {
  for (const p of peds) {
    if (p.dead) { p.deadT += dt; continue; }
    if (p.cop && P.stars > 0 && !P.dead && dist(p.x, p.y, P.x, P.y) < 700) { p.combat = true; p.state = 'walk'; copCombat(p, dt); continue; }
    if (p.combat) { p.combat = false; p.cv = null; snapPed(p); }
    let mx = 0, my = 0, sp = 0;
    if (p.state === 'flee') {
      const m = Math.hypot(p.fx, p.fy) || 1; mx = p.fx / m; my = p.fy / m; sp = 150 * SPEED_K; p.fl -= dt;
      if (p.fl <= 0) { p.state = 'walk'; snapPed(p); }
    } else if (p.wait > 0) p.wait -= dt;
    else {
      const c = cornerPos(p.i, p.j, p.tk), dx = c[0] - p.x, dy = c[1] - p.y, d = Math.hypot(dx, dy);
      if (d < 5) pedNext(p); else { mx = dx / d; my = dy / d; sp = p.speed; }
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
function spawnPickup() {
  const i = randi(0, N - 1), j = randi(0, N - 1), k = randi(0, 3), a = cornerPos(i, j, k), b = cornerPos(i, j, (k + 1) % 4), t = rand(0.15, 0.85);
  pickups.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), type: pick(['health', 'pistol', 'mg', 'mg', 'cash', 'cash']), bob: rand(0, 6) });
}
function updatePickups(dt) {
  for (let k = pickups.length - 1; k >= 0; k--) {
    const p = pickups[k]; p.bob += dt * 4;
    if (dist(P.x, P.y, p.x, p.y) > 26) continue;
    if (p.type === 'health') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 40); popup(p.x, p.y - 12, '+HEALTH', '#ff6b86'); }
    else if (p.type === 'pistol') { P.ammo[0] = Math.min(250, P.ammo[0] + 24); popup(p.x, p.y - 12, '+24 PISTOL', '#3fe0ff'); }
    else if (p.type === 'mg') { P.ammo[1] = Math.min(400, P.ammo[1] + 60); popup(p.x, p.y - 12, '+60 MG', '#3fe0ff'); }
    else addScore(500, p.x, p.y, 'CASH');
    Snd.pickup(); pickups.splice(k, 1); setTimeout(() => { if (state === 'play') spawnPickup(); }, 25000);
  }
}
function pedSpot(minD, maxD, tries) {
  for (let tr = 0; tr < tries; tr++) {
    const ci = clamp(Math.floor(P.x / CELL) + randi(-3, 3), 0, N - 1), cj = clamp(Math.floor(P.y / CELL) + randi(-3, 3), 0, N - 1);
    const k = randi(0, 3), dir = Math.random() < 0.5 ? 1 : -1, a = cornerPos(ci, cj, k), tk = (k + dir + 4) % 4, b = cornerPos(ci, cj, tk), t = rand(0.15, 0.85);
    const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), d = dist(x, y, P.x, P.y);
    if (d < minD || d > maxD) continue;
    return { x, y, i: ci, j: cj, tk, dir };
  }
  return null;
}
function spawnFootCop(initial) {
  const s = initial ? pedSpot(90, 1100, 30) : pedSpot(visRadius() + 30, 1250, 25); if (!s) return;
  peds.push(makeFootCop(s.x, s.y, s.i, s.j, s.tk, s.dir));
}
function spawnPedNear(initial) {
  const s = initial ? pedSpot(90, 1100, 30) : pedSpot(visRadius() + 30, 1250, 25); if (!s) return;
  peds.push(makePed(s.x, s.y, s.i, s.j, s.tk, s.dir));
}
function laneSpot(minD, maxD) {
  for (let tr = 0; tr < 40; tr++) {
    const x0 = clamp(P.x + rand(-maxD, maxD), 0, W), y0 = clamp(P.y + rand(-maxD, maxD), 0, W);
    let x, y, dir;
    if (Math.random() < 0.5) { if (Math.abs(x0 - roadC(nearestIx(x0))) < 80) continue; dir = Math.random() < 0.5 ? 0 : 2; x = x0; y = roadC(nearestIx(y0)) + (dir === 0 ? 18 : -18); }
    else { if (Math.abs(y0 - roadC(nearestIx(y0))) < 80) continue; dir = Math.random() < 0.5 ? 1 : 3; y = y0; x = roadC(nearestIx(x0)) + (dir === 1 ? -18 : 18); }
    x = clamp(x, 30, W - 30); y = clamp(y, 30, W - 30);
    const d = dist(x, y, P.x, P.y); if (d < minD || d > maxD) continue;
    if (cars.some(c => dist(c.x, c.y, x, y) < 90)) continue;
    return { x, y, dir };
  }
  return null;
}
function spawnTraffic(initial) {
  const s = laneSpot(initial ? 140 : offDist(), initial ? 1100 : 1500); if (!s) return;
  const r = Math.random(), type = r < 0.5 ? 'sedan' : r < 0.7 ? 'sports' : r < 0.9 ? 'truck' : 'police';
  const c = makeCar(type, s.x, s.y, DIR_ANG[s.dir], 'ai'); c.dir = s.dir; c.needDir = false;
  c.vx = Math.cos(c.ang) * 140 * SPEED_K; c.vy = Math.sin(c.ang) * 140 * SPEED_K; cars.push(c);
}
function spawnParked(initial) {
  const s = laneSpot(initial ? 130 : offDist(), initial ? 1300 : 1500); if (!s) return;
  if (s.dir % 2 === 0) s.y += s.dir === 0 ? 36 : -36; else s.x += s.dir === 1 ? -36 : 36;   // two wheels up on the kerb
  const c = makeCar(pick(['sedan', 'sedan', 'sports', 'truck']), s.x, s.y, DIR_ANG[s.dir] + rand(-0.05, 0.05), null);
  cars.push(c);
}
function spawnCop() {
  const s = laneSpot(offDist(), offDist() + 700); if (!s) return;
  const c = makeCar('police', s.x, s.y, DIR_ANG[s.dir], 'cop'); c.vx = Math.cos(c.ang) * 200 * SPEED_K; c.vy = Math.sin(c.ang) * 200 * SPEED_K; cars.push(c);
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
    offT = 3.5; const s = pedSpot(offDist(), offDist() + 500, 25); if (s) officers.push(makeOfficer(s.x, s.y));
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

