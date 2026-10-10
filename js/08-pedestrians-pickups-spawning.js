'use strict';
/* ---------- 6c. PEDESTRIANS, OFFICERS, PICKUPS, SPAWNING ---------- */
/* people walk the sidewalks: along a road edge, SIDEWALK units to one side of the centre line, picking a new edge at each junction */
const _pw = {};
function walkOffset() { return SIDEWALK; }                        // every street has sidewalks, bridges too (inside the rails)
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
    if (p.knocked || p.medic) continue;                            // flying through the air (js/12c); a paramedic at work is moved by the team (js/08h)
    if (p.stunT > 0) { p.stunT -= dt; p.vx = p.vy = 0; continue; }   // knocked down by a melee hit (js/06b)
    if (p.hostile && fightBack(p, dt)) continue;                    // armed and provoked: after you (js/08g)
    if (p.cop && copEngaged(p)) { p.combat = true; p.state = 'walk'; copCombat(p, dt); continue; }   // a foot patrol on the case (js/08b)
    if (p.combat) { p.combat = false; p.cv = null; if (!p.stroll) snapPed(p); }
    if (p.e < 0 && !p.stroll) snapPed(p);
    let mx = 0, my = 0, sp = 0;
    if (p.state === 'flee') {
      const m = Math.hypot(p.fx, p.fy) || 1; mx = p.fx / m; my = p.fy / m; sp = 4.5 * MPS; p.fl -= dt;
      if (p.fl <= 0) { p.state = 'walk'; if (p.stroll) strollTarget(p); else snapPed(p); }
    } else if (p.wait > 0) p.wait -= dt;
    else if (p.stroll) {                                             // strolling about an alley, a park, a beach or a promenade
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d < 8 || (p.tt -= dt) <= 0) { strollTarget(p); if (Math.random() < 0.4) p.wait = rand(1, 5); }
      else { mx = dx / d; my = dy / d; sp = p.speed * 0.85; }
    }
    else if (p.e >= 0) {
      const c = sidewalkPoint(p, 14, _pw), dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
      if (d < 26) p.s += p.speed * (1 + 0.3 * SKY.rain) * dt;        // keep the carrot just ahead; it only moves on once we are close to it
      if (p.s >= RE[p.e].len) pedNext(p);
      if (d > 2) { mx = dx / d; my = dy / d; sp = p.speed * (1 + 0.3 * SKY.rain); }   // hurrying in the rain
    }
    p.vx = lerp(p.vx, mx * sp, 1 - Math.exp(-10 * dt)); p.vy = lerp(p.vy, my * sp, 1 - Math.exp(-10 * dt));
    p.x += p.vx * dt; p.y += p.vy * dt; p.bob += Math.hypot(p.vx, p.vy) * dt * 0.12;
    if (p.cop && Math.hypot(p.vx, p.vy) > 8) { p.hd = Math.atan2(p.vy, p.vx); p.ang = p.hd; }
    if (resolveCircle(p, 7) && p.state === 'flee') { p.fx = -p.fx + rand(-30, 30); p.fy = -p.fy + rand(-30, 30); }
  }
}
/* people off the sidewalks: some stroll about the back alleys, the parks, the beaches and the promenades, from one spot to the next */
let WALKA = null;
function walkAreas() {
  if (WALKA) return WALKA; WALKA = [];
  const poly = (k, g) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { k, g: { o: g.o, h: g.h || [] }, bb: [x0, y0, x1, y1] }; };
  for (const [cx, cy, L, w, deg] of MAP.alleys || []) { const a = deg * Math.PI / 180, r = L / 2 + w; WALKA.push({ k: 'alley', cx, cy, ca: Math.cos(a), sa: Math.sin(a), hl: L / 2 - 6, hw: Math.max(4, w / 2 - 14), bb: [cx - r, cy - r, cx + r, cy + r] }); }
  for (const g of MAP.grass) WALKA.push(poly('park', g));
  for (const g of MAP.sand) WALKA.push(poly('beach', g));
  for (const g of MAP.yards || []) if (g.k === 'p') WALKA.push(poly('promenade', g));
  return WALKA;
}
function inArea(A, x, y) {
  if (x < A.bb[0] || x > A.bb[2] || y < A.bb[1] || y > A.bb[3]) return false;
  if (A.k === 'alley') { const dx = x - A.cx, dy = y - A.cy; return Math.abs(dx * A.ca + dy * A.sa) < A.hl && Math.abs(-dx * A.sa + dy * A.ca) < A.hw; }
  return inPoly(x, y, A.g);
}
const strollOk = (A, x, y) => inArea(A, x, y) && !pedBlocked(x, y) && shoreDist(x, y) > (A.k === 'beach' ? 4 : 10);
function strollTarget(p) {                    // the next spot to walk to, somewhere nearby in the same place
  for (let t = 0; t < 12; t++) {
    const a = rand(0, TAU), d = rand(40, p.area.k === 'alley' ? 140 : 240), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (strollOk(p.area, x, y)) { p.tx = x; p.ty = y; p.tt = 20; return; }
  }
  p.tx = p.x; p.ty = p.y; p.tt = 3; p.wait = rand(1, 3);
}
function spawnStroller(initial) {
  const A = walkAreas();
  for (let tr = 0; tr < 25; tr++) {
    const a = rand(0, TAU), d0 = initial ? rand(90, 1100) : rand(visRadius() + 30, 1250), x = P.x + Math.cos(a) * d0, y = P.y + Math.sin(a) * d0;
    const ar = A.find(z => inArea(z, x, y)); if (!ar || !strollOk(ar, x, y)) continue;
    const p = makePed(x, y); p.stroll = true; p.area = ar; strollTarget(p); peds.push(p); return true;
  }
  return false;
}
/* nobody walks through anybody: people push each other apart and out of every car, parked or moving, and never into a wall doing it */
const _pp = [];
function separatePeople() {
  _pp.length = 0;
  for (const p of peds) if (!p.dead && !p.knocked && !p.medic) _pp.push(p);
  for (const o of officers) if (!o.dead && !o.knocked) _pp.push(o);
  if (!P.car && !P.dead && !P.knocked && !P.act) _pp.push(P);
  const n = _pp.length, D = 14;
  for (let i = 0; i < n; i++) {
    const a = _pp[i];
    for (let j = i + 1; j < n; j++) {
      const b = _pp[j], dx = b.x - a.x, dy = b.y - a.y; if (dx > D || dx < -D || dy > D || dy < -D) continue;
      const d = Math.hypot(dx, dy); if (d >= D) continue;
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0, k = (D - d) / 2;
      a.x -= ux * k; a.y -= uy * k; b.x += ux * k; b.y += uy * k;
    }
  }
  for (const p of _pp) { bumpCars(p, 7); resolveCircle(p, 7); }
}
function bumpCars(o, r, h) {                  // push o out of every car it overlaps; adds the push direction to h
  for (const c of cars) {
    if (c.sunk) continue; const reach = c.t.len / 2 + r + 2; if (Math.abs(c.x - o.x) > reach || Math.abs(c.y - o.y) > reach) continue;
    for (const q of carCircles(c)) {
      const dx = o.x - q[0], dy = o.y - q[1], d = Math.hypot(dx, dy), rr = q[2] + r;
      if (d < rr && d > 0.001) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); if (h) { h.nx += dx / d; h.ny += dy / d; } }
    }
  }
}
function bumpPeople(o, r, h) {                // push o (flying) out of the people standing about; adds the push direction to h
  const hit = q => { if (q === o || q.dead || q.knocked) return; const dx = o.x - q.x, dy = o.y - q.y; if (Math.abs(dx) > r + 7 || Math.abs(dy) > r + 7) return;
    const d = Math.hypot(dx, dy), rr = r + 7; if (d < rr && d > 0.001) { o.x += dx / d * (rr - d); o.y += dy / d * (rr - d); h.nx += dx / d; h.ny += dy / d; } };
  for (const q of peds) hit(q); for (const q of officers) hit(q); if (!P.car) hit(P);
}
let pickupQ = [];                            // game times at which a cash stack taken comes back somewhere else
const PICKUP_BACK = 25;
/* cash: ECO.townN stacks lie on sidewalks anywhere in town (not on the maps), each worth a random amount (js/01i); one taken comes back
   elsewhere. The dead drop smaller stacks by their bodies (js/08g: drop, until) that vanish after a while and do not come back. */
function spawnPickup() {                      // anywhere on the map: a random sidewalk spot, chosen by road length
  const total = RE.reduce((a, e) => a + e.len, 0);
  for (let tr = 0; tr < 30; tr++) {
    let r = Math.random() * total, e = 0; while (e < RE.length - 1 && r > RE[e].len) { r -= RE[e].len; e++; }
    const w = { e, fw: 1, s: r, side: Math.random() < 0.5 ? 1 : -1 }, q = sidewalkPoint(w, 0, {});
    if (shoreDist(q.x, q.y) < 12 || pedBlocked(q.x, q.y) || pickups.some(k => dist(k.x, k.y, q.x, q.y) < 200)) continue;
    pickups.push({ x: q.x, y: q.y, type: 'cash', amt: ecoRoll('townCash'), bob: rand(0, 6) }); return;
  }
}
function updatePickups(dt) {
  for (let k = pickups.length - 1; k >= 0; k--) {
    const p = pickups[k]; p.bob += dt * 4;
    if (p.until && gameT > p.until) { pickups.splice(k, 1); continue; }   // a dropped stack left lying too long
    if (dist(P.x, P.y, p.x, p.y) > 26) continue;
    if (p.type === 'health') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 40); popup(p.x, p.y - 12, '+HEALTH', '#ff6b86'); }
    else if (p.type === 'cash') addScore(p.amt || 0, p.x, p.y, 'CASH');
    else {                                                          // ammunition: as much as the weapon table says, up to what you can carry
      const wi = WEAPONS.findIndex(w => w.id === p.type), w = WEAPONS[wi]; if (!w) { pickups.splice(k, 1); continue; }
      P.ammo[wi] = Math.min(Math.max(w.maxAmmo, P.ammo[wi]), P.ammo[wi] + w.pickup); popup(p.x, p.y - 12, '+' + w.pickup + ' ' + w.short, w.blast ? '#ff9d2b' : '#3fe0ff');
    }
    Snd.pickup(); pickups.splice(k, 1); if (!p.drop) pickupQ.push(gameT + PICKUP_BACK);
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
function kerbFits(x, y, ang, type) {           // the whole car stands in the parking lane: on a bend it would poke into traffic or onto the sidewalk
  const t = CAR_TYPES[type], o = t.len * 0.5 - (t.wid * 0.5 + 1), fx = Math.cos(ang), fy = Math.sin(ang);
  for (const k of [-1, 0, 1]) { const r = nearestRoad(x + fx * o * k, y + fy * o * k, ROAD_HALF + 10); if (!r || Math.abs(r.d - PARK_OFF) > 2.5) return false; }
  return true;
}
function laneSpot(minD, maxD, kerb, type) {   // a point on a lane (kerb: a car type, in the parking lane) between minD and maxD from the player
  const half = (type || kerb) ? CAR_TYPES[type || kerb].len / 2 : 30;
  for (let tr = 0; tr < 40; tr++) {
    const a = rand(0, TAU), d0 = rand(minD, maxD), r = nearestRoad(P.x + Math.cos(a) * d0, P.y + Math.sin(a) * d0, 300); if (!r) continue;
    const E = RE[r.e], keep = kerb ? ROAD_HALF + SW_W + 60 : 30 + half; if (E.nt || r.s < keep || r.s > E.len - keep) continue;   // not in a junction; parked cars stay clear of the corners
    const fw = Math.random() < 0.5 ? 1 : -1, s = fw > 0 ? r.s : E.len - r.s, q = lanePoint(r.e, fw, s, kerb ? PARK_OFF : LANE, {});
    const d = dist(q.x, q.y, P.x, P.y); if (d < minD || d > maxD) continue;
    if (shoreDist(q.x, q.y) < (kerb ? 60 : 20) || cars.some(c => dist(c.x, c.y, q.x, q.y) < (kerb ? 36 : 60) + half + c.t.len / 2)) continue;
    if (kerb && !kerbFits(q.x, q.y, Math.atan2(q.ty, q.tx), kerb)) continue;
    return { x: q.x, y: q.y, ang: Math.atan2(q.ty, q.tx), e: r.e, fw, s };
  }
  return null;
}
function spawnTraffic(initial) {               // which vehicle: by the traffic weights of the vehicle table (js/01c), police patrols included
  const type = pickType('traffic'); if (!type) return;
  const s = laneSpot(initial ? 140 : offDist(), initial ? 1100 : 1500, null, type); if (!s) return;
  const c = makeCar(type, s.x, s.y, s.ang, 'ai'); c.e = s.e; c.fw = s.fw; c.s = s.s;
  c.vx = Math.cos(c.ang) * 40 * KMH; c.vy = Math.sin(c.ang) * 40 * KMH; cars.push(c);
}
function spawnParked(initial) {                                    // in the parking lane at the kerb (parking lots fill up on their own: fillLots)
  const minD = initial ? 130 : offDist(), maxD = initial ? 1300 : 1500, type = pickType('parked', t => t.wid <= KERB_W); if (!type) return;
  const s = laneSpot(minD, maxD, type); if (!s) return;
  cars.push(makeCar(type, s.x, s.y, s.ang, null));
}
/* parking lots near you are about half full - always while out of sight, so nothing pops up in view; a police station's lot holds its
   patrol cars. A lot is filled once while you are around and forgotten when you are far away (its cars are gone by then). */
function fillLots(initial) {
  for (const L of LOTS) {
    const d = dist(L.cx, L.cy, P.x, P.y);
    if (L.filled) { if (d > 2400) L.filled = false; continue; }
    if (d > 1500 || (!initial && d < offDist() + Math.hypot(L.w, L.d) / 2)) continue;
    L.filled = true; const cop = L.owner && L.owner.special === 'police';
    for (const p of L.stalls) {
      if (Math.random() > (cop ? 0.75 : 0.55) || cars.some(c => Math.abs(c.x - p.x) < 40 && Math.abs(c.y - p.y) < 40)) continue;
      const type = cop ? (pickType('chase', t => t.cop && t.chaseFrom <= 1 && t.wid <= STALL_W) || 'police') : pickType('parked', t => t.wid <= STALL_W); if (!type) continue;
      const c = makeCar(type, p.x, p.y, p.ang + rand(-0.04, 0.04), null); c.lot = L; cars.push(c);
    }
  }
}
function spawnCop() {                         // a police vehicle sent from further away (js/08b decides when): by chase weight, among those allowed at this level
  const type = pickType('chase', t => t.cop && t.chaseFrom <= Math.max(1, P.stars)); if (!type) return null;
  const s = laneSpot(offDist(), offDist() + 700, null, type); if (!s) return null;
  const c = makeCar(type, s.x, s.y, s.ang, 'cop'); c.vx = Math.cos(c.ang) * 60 * KMH; c.vy = Math.sin(c.ang) * 60 * KMH; cars.push(c); return c;
}
let spawnT = 0;
function manageSpawns(dt) {
  spawnT -= dt;
  for (let k = cars.length - 1; k >= 0; k--) { const c = cars[k]; if (P.car !== c && ((!c.keep && dist(c.x, c.y, P.x, P.y) > 2200) || (c.dead && c.deadT > 30) || (c.sunk && c.sinkT > 4))) cars.splice(k, 1); }
  for (let k = peds.length - 1; k >= 0; k--) { const p = peds[k]; if ((p.dead && p.deadT > bodyTime(p)) || dist(p.x, p.y, P.x, P.y) > 1500) peds.splice(k, 1); }
  if (spawnT <= 0) {
    spawnT = 0.3; let traffic = 0, parked = 0, live = 0;
    for (const c of cars) { if (c.driver === 'ai') traffic++; else if (!c.driver && !c.dead && !c.lot && !c.keep) parked++; }   // kerb parking only
    for (const p of peds) if (!p.dead) live++;
    const crowd = OPT.crowd;                                        // quieter or busier streets (New game options)
    if (traffic < 32 * crowd) spawnTraffic(false); else if (parked < 16 * crowd) spawnParked(false);
    fillLots(false);
    let fc = 0; for (const q of peds) if (q.cop && !q.dead) fc++;
    if (fc < COP.footPatrols) spawnFootCop(false); else if (live < 56 * crowd) { if (Math.random() > 0.35 * (1 - SKY.rain) || !spawnStroller(false)) spawnPedNear(false); }   // nobody strolls in the rain
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

