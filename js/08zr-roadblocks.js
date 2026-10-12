'use strict';
/* ---------- 6zr. POLICE ROADBLOCKS (js/01j roadblocks; police table: Roadblocks, and per wanted level: Roadblock ...) ----------
   While you drive with enough stars, about once a minute the police set up a roadblock 300-500 m ahead on the road you are on - out of
   sight, carried straight on through the junctions, never in a junction: police cars across the street with their lights going, at
   5 stars the APC in the middle, and cops behind them who hold their places and shoot when they see you - pistols at 3 stars, SMGs
   in bursts at 4, rifles at 5 (far, slow, hard). Ram through (the cars are parked, heavy but they move), turn off or shoot your way
   past. It is taken down once you are far from it and it is out of sight, or your stars drop below the roadblock levels. */
const RB = { list: [], next: 20, low: 0 };
const RB_GUNS = ['pistol', 'pistol', 'smg', 'sniper'];
function rbFind(c) {                      // the spot ahead: { x, y, tx, ty } on a street, clear of junctions, or null
  const r = nearestRoad(c.x, c.y, 140); if (!r || RE[r.e].nt) return null;
  const t0 = edgeAt(r.e, r.s, {}); let e = r.e, dir = (c.vx * t0.tx + c.vy * t0.ty) >= 0 ? 1 : -1, s = dir > 0 ? r.s : RE[e].len - r.s;
  let left = rand(COP.rbAheadMin, Math.max(COP.rbAheadMin, COP.rbAheadMax)); const keep = ROAD_HALF + 70;
  for (let hop = 0; hop < 14; hop++) {
    const L = RE[e].len;
    if (left <= L - s) {                                             // it lands on this street: keep it out of the junctions
      let at = s + left; if (L < 2 * keep + 20) { left = 0; } else { at = clamp(at, keep, L - keep); const q = lanePoint(e, dir, at, 0, {}); return { x: q.x, y: q.y, tx: q.tx, ty: q.ty, e }; }
    } else left -= L - s;
    const node = dir > 0 ? RE[e].b : RE[e].a, end = lanePoint(e, dir, L - 1, 0, {}); let best = null, bd = 0.3;   // on through the junction, as straight as it goes
    for (const ei of RN[node].e) { if (ei === e || RE[ei].nt) continue; const d2 = RE[ei].a === node ? 1 : -1, q = lanePoint(ei, d2, 1, 0, {}), dot = q.tx * end.tx + q.ty * end.ty; if (dot > bd) { bd = dot; best = [ei, d2]; } }
    if (!best) return null;                                          // a dead end or only sharp turns: not this time
    [e, dir] = best; s = 0; if (left <= 0) left = RE[e].len / 2;
  }
  return null;
}
function rbSetUp(q) {                     // the cars across the street, the cops behind them
  const lv = P.stars, n = COP.lv.rbCars[lv], m = COP.lv.rbCops[lv], apc = COP.lv.rbApc[lv], W = ROAD_HALF * 2, nx = -q.ty, ny = q.tx, a = Math.atan2(q.ty, q.tx);
  const R = { x: q.x, y: q.y, tx: q.tx, ty: q.ty, cars: [], cops: [], t: 0 };
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * W / n * 0.98, type = apc && i === Math.floor(n / 2) && CAR_TYPES.apc ? 'apc' : 'police';
    const c = makeCar(type, q.x + nx * o, q.y + ny * o, a + Math.PI / 2 + (i % 2 ? 0.35 : -0.35), null);
    c.rb = R; c.keep = true; c.searched = true; c.sirenT = rand(0, 3); cars.push(c); R.cars.push(c);   // keep: the spawner leaves it, far ahead as it is (js/08)
  }
  const gun = WEAPONS.findIndex(w => w.id === RB_GUNS[clamp(Math.round(COP.lv.rbGun[lv]), 0, 3)]);
  for (let j = 0; j < m; j++) {
    const o = (j - (m - 1) / 2) * W / Math.max(2, m), x = q.x + q.tx * 46 + nx * o, y = q.y + q.ty * 46 + ny * o;
    const f = makeOfficer(x, y); f.rb = R; f.post = { x, y }; f.gun = gun >= 0 ? gun : 0; f.ang = a + Math.PI; f.seenT = -99; officers.push(f); R.cops.push(f);
  }
  RB.list.push(R); return R;
}
function rbDown(R) {                      // taken down: the cars nobody took and the cops still standing go
  for (const c of R.cars) if (c.rb === R && c !== P.car && !c.driver) { const k = cars.indexOf(c); if (k >= 0) cars.splice(k, 1); }
  for (const f of R.cops) if (f.rb === R && !f.dead) { const k = officers.indexOf(f); if (k >= 0) officers.splice(k, 1); }
  RB.list.splice(RB.list.indexOf(R), 1);
}
function rbTick(dt) {                     // js/15 update
  const on = feat('roadblocks') && feat('police'), lvOk = on && P.stars > 0 && COP.lv.rbCars[P.stars] > 0;
  RB.low = lvOk ? 0 : RB.low + dt;
  for (const R of RB.list.slice()) {
    R.t += dt;
    for (const c of R.cars) if (c.rb === R && (c.driver || c.dead)) { c.rb = null; c.keep = false; }   // someone drove off in it, or it blew up: not part of it any more
    const far = dist(P.x, P.y, R.x, R.y) > COP.rbGone;
    if ((far || RB.low > 15 || !on) && offScreen(R.x, R.y)) rbDown(R);
  }
  const c = P.car;
  if (!lvOk || !c || P.dead || RB.list.length || gameT < RB.next || carSpeed(c) < 35 * KMH) return;
  const q = rbFind(c); RB.next = gameT + (q ? COP.rbEvery * rand(0.8, 1.2) : 4);
  if (q && offScreen(q.x, q.y)) rbSetUp(q);
}
function rbReset() { for (const R of RB.list.slice()) rbDown(R); RB.list = []; RB.next = gameT + 20; RB.low = 0; }   // js/15 resetGame

/* ---------- js/08b updateOfficers: a roadblock cop holds the place and shoots ---------- */
function rbCop(o, dt) {                   // true: handled here
  const R = o.rb; if (!R || !RB.list.includes(R)) { o.rb = null; return false; }
  if (P.stars === 0 || P.dead) return false;
  const tgt = P.car || P, d = dist(o.x, o.y, tgt.x, tgt.y), w = WEAPONS[o.gun] || WEAPONS[0];
  o.cool = (o.cool === undefined ? 0.5 : o.cool) - dt;
  if (dist(o.x, o.y, o.post.x, o.post.y) > 8) walkTo(o, o.post.x, o.post.y, COP.footSpeed, dt);
  o.ang = Math.atan2(tgt.y - o.y, tgt.x - o.x);
  const range = COP.fireRange * (w.id === 'sniper' ? 3 : w.auto ? 1.3 : 1);
  if (o.sees && d < range && o.cool <= 0 && clearShot(o, tgt, d)) rbShoot(o, tgt, d, w, range);
  return true;
}
function rbShoot(o, tgt, d, w, range) {
  const pw = WEAPONS.find(q => q.id === 'pistol') || w, k = Math.min(4, w.dmg / pw.dmg), gap = () => rand(COP.gapMin, Math.max(COP.gapMin, COP.gapMax));
  if (w.auto) { if (!(o.burst > 0)) o.burst = randi(3, 5); o.cool = --o.burst > 0 ? w.rate * 1.4 : gap() * 1.3; }   // an SMG: bursts
  else o.cool = w.id === 'sniper' ? rand(2.4, 3.6) : gap();
  tracers.push({ x1: o.x + Math.cos(o.ang) * 14, y1: o.y + Math.sin(o.ang) * 14, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: w.id === 'sniper' ? 0.12 : 0.07 });
  const v = clamp(1 - dist(o.x, o.y, cam.x, cam.y) / 1400, 0.15, 1);
  if (w.id === 'sniper') { Snd.burst(0.4, 2200, 90, 0.5 * v); Snd.tone(110, 34, 0.3, 0.25 * v, 'sawtooth'); }
  else Snd.tone(w.auto ? 1100 : 900, 200, w.auto ? 0.035 : 0.05, (w.auto ? 0.045 : 0.06) * v, 'square');
  const acc = w.id === 'sniper' ? lerp(COP.accNear, COP.accFar, clamp(d / range, 0, 1) * 0.5) : lerp(COP.accNear, COP.accFar, clamp(d / COP.fireRange, 0, 1));
  if (Math.random() < acc) { if (P.car) damageCar(P.car, COP.dmgCar * k, false); else damagePlayer(COP.dmgFoot * k); }
}
