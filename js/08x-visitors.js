'use strict';
/* ---------- 6x. VISITORS AT THE COLONY AND THE CEMENT WORKS ----------
   (js/01j visitors; streets table: Visitors) Map remodel 11 gave the Colony and the cement works dead-end streets of their own (edges
   v: colony / factory), closed to ordinary traffic. While you are near one, now and then (visitEvery) a car in the traffic just before
   its junction turns in instead: it drives to the site's car park - the Colony's beside the ring drive, the works' staff bays by the
   gate - pulls into a free bay and stops, and its driver gets out and walks in (to the hotel's doors, through the works' gate). After a
   while (visitStayMin to visitStayMax) someone walks out to the car, gets in, backs out and drives off into the traffic. Up to visitMax
   visitors' cars at a site. A visitor's car is a car like any other: take it, ram it or blow it up and the visit is over. */
const VISIT = [];
function genVisitors() {                 // js/04 genWorld, after the lots: the two sites, their bays and the way in and out
  VISIT.length = 0;
  for (const E of RE) {
    if (!E.v) continue;
    const atA = RN[E.a].e.length > 1, node = atA ? E.a : E.b, end = edgeAt(E.i, atA ? E.len : 0, {});
    const S = { id: E.v, e: E.i, node, fwIn: atA ? 1 : -1, end: { x: end.x, y: end.y }, t: rand(4, 10), lot: null, door: null, bays: [], via: [], out: [] };   // via: off the street to the bays; out: back to it
    const near = (x, y) => LOTS.reduce((b, L) => !b || dist(L.cx, L.cy, x, y) < dist(b.cx, b.cy, x, y) ? L : b, null);
    if (E.v === 'colony') {
      const L = MAP.lm.find(q => q.t === 'colony'); if (!L || !L.vlot || !COLONY) continue;
      S.lot = near(L.vlot[0], L.vlot[1]); const R = colonyRing(L), lane = (R.ri + R.ro) / 2;
      const side = Math.sign((S.lot.cx - R.x) * R.vx + (S.lot.cy - R.y) * R.vy) || 1;         // the ring's lane on the car park's side
      const at = u => ({ x: R.x + R.ux * u + R.vx * side * lane, y: R.y + R.uy * u + R.vy * side * lane });
      const far = at(R.hl), nearEnd = at(-R.hl), d0 = dist(far.x, far.y, S.end.x, S.end.y), d1 = dist(nearEnd.x, nearEnd.y, S.end.x, S.end.y);
      const sg = d0 < d1 ? 1 : -1; S.via = [sg > 0 ? far : nearEnd]; S.out = [S.via[0], S.end];      // from the street's end onto the lane, and back
      const [dx, dy] = colonyAt(COLONY.lw / 2 + 16, 0); S.door = { x: dx, y: dy };
      for (const p of S.lot.stalls) {                                                         // the row facing the drive: driven into nose first from it
        const tx = R.x - p.x, ty = R.y - p.y, tl = Math.hypot(tx, ty) || 1; if ((tx * Math.cos(p.ang) + ty * Math.sin(p.ang)) / tl < 0.3) continue;
        const nose = p.ang + Math.PI, o = { x: p.x, y: p.y, ang: nose }; o.a = { x: p.x - Math.cos(nose) * 70, y: p.y - Math.sin(nose) * 70 };
        o.b = { x: o.a.x - R.ux * 34 * sg, y: o.a.y - R.uy * 34 * sg }; S.bays.push(o);                // backing out, the rear swings away from the street
      }
    } else if (E.v === 'factory') {
      const F = MAP.gravel && MAP.gravel.factory; if (!F || !F.vlot) continue;
      S.lot = near(F.vlot[0], F.vlot[1]); S.door = { x: F.gate.x - 24, y: F.gate.y };
      for (const p of S.lot.stalls) {                                                         // the bays beside the road, driven into nose first from it
        const o = { x: p.x, y: p.y, ang: p.ang }; o.a = { x: p.x - Math.cos(p.ang) * 80, y: p.y - Math.sin(p.ang) * 80 };
        const s = projEdge(S.e, o.a.x, o.a.y), inw = RE[S.e].a === S.node ? 1 : -1, q = edgeAt(S.e, clamp(s + inw * 40, 0, RE[S.e].len), {});
        o.b = { x: q.x, y: q.y }; S.bays.push(o);                                                    // back out onto the road, the rear toward the gate: then off toward the corner
      }
    }
    if (S.lot && S.bays.length) VISIT.push(S);
  }
}
const visitOn = () => feat('visitors') && VISIT.length > 0;
const bayFree = B => !(B.car && cars.includes(B.car) && B.car.visit && B.car.visit.bay === B) && !cars.some(c => Math.abs(c.x - B.x) < 30 && Math.abs(c.y - B.y) < 30);
function visitNext(c) {                  // js/07 nextFor: a car on its way in turns into the site's street at its junction
  const V = c.visit, E = RE[c.e]; if (!V || V.phase !== 'in') return null;
  return (c.fw > 0 ? E.b : E.a) === V.S.node ? { e: V.S.e, fw: V.S.fwIn } : null;
}
function visitTick(dt) {                 // js/15 update: send cars in, call drivers out
  if (!visitOn()) return;
  for (const S of VISIT) {
    const near = dist(S.lot.cx, S.lot.cy, P.x, P.y) < STR.visitNear;
    for (const c of cars) if (c.visit && c.visit.S === S && (P.car === c || c.dead || c.driver === 'player')) visitEnd(c);   // taken or wrecked: the visit is over
    if (!near || (S.t -= dt) > 0) continue;
    S.t = STR.visitEvery * rand(0.6, 1.4);
    const here = cars.filter(c => c.visit && c.visit.S === S).length; if (here >= STR.visitMax) continue;
    const B = S.bays.filter(bayFree); if (!B.length) continue;
    const c = cars.find(c => c.driver === 'ai' && !c.visit && !c.task && !c.crim && !c.t.cop && !isService(c.t) && c.t.wid <= STALL_W && c.t.len < 70 && c.e >= 0 &&
      (c.fw > 0 ? RE[c.e].b : RE[c.e].a) === S.node && RE[c.e].len - c.s > 60 && RE[c.e].len - c.s < 900);
    if (!c) { S.t = 2; continue; }                                                            // nobody on the way just now: look again soon
    const b = pick(B); b.car = c; c.visit = { S, bay: b, phase: 'in', t: 0, w: 0 }; c.nx = null;
  }
  for (const c of cars) {                                                                     // a parked visitor's time is up: someone comes out for the car
    const V = c.visit; if (!V || V.phase !== 'parked' || gameT < V.until) continue;
    if (dist(c.x, c.y, P.x, P.y) > STR.visitNear) continue;
    const p = makePed(V.S.door.x, V.S.door.y); p.go = { car: c, via: [V.bay.a] }; p.state = 'walk'; peds.push(p); V.phase = 'called';   // out of the door, round to the front of the bay, to the car
  }
}
function visitEnd(c) { if (c.visit && c.visit.bay.car === c) c.visit.bay.car = null; c.visit = null; }
function visitPark(c) {                  // in the bay: stop, the driver gets out and walks in
  const V = c.visit, S = V.S; c.vx = c.vy = c.av = 0; c.thr = 0; c.str = 0; c.driver = null; c.lot = S.lot; c.searched = true;
  V.phase = 'parked'; V.until = gameT + rand(STR.visitStayMin, Math.max(STR.visitStayMin, STR.visitStayMax));
  const sx = -Math.sin(c.ang), sy = Math.cos(c.ang), off = c.t.wid / 2 + 9, p = makePed(c.x + sx * off, c.y + sy * off);
  p.go = { x: S.door.x, y: S.door.y, vanish: true, via: [V.bay.a] }; p.state = 'walk'; peds.push(p);   // out of the bay, then to the door
}
function visitSteer(c, x, y, spd) { steerToward(c, x, y, spd); c.hb = false; }
function visitDrive(c, dt) {             // js/07 updateCars, for a visitor on its own (off the street): true when it drove the car
  const V = c.visit; if (!V || c.driver !== 'ai') return false;
  const S = V.S, B = V.bay; V.t += dt;
  if (V.phase === 'in') {                                                                    // on the street: leave it near the end for the bay
    if (c.e !== S.e) return false;
    const toEnd = RE[c.e].len - c.s; if (toEnd > 70 && dist(c.x, c.y, B.a.x, B.a.y) > 140) return false;
    V.phase = 'park'; V.w = 0; V.t = 0;
  }
  if (V.phase === 'park') {
    const pts = [...S.via, B.a, B], i = Math.min(V.w, pts.length - 1), T = pts[i], d = dist(c.x, c.y, T.x, T.y);
    if (i < pts.length - 1) { visitSteer(c, T.x, T.y, 22 * KMH); if (d < (i === pts.length - 2 ? 16 : 34)) V.w++; }
    else {                                                                                   // the last stretch: line up with the bay as it rolls in
      visitSteer(c, T.x, T.y, Math.min(10 * KMH, d * 2));
      if (d < 60) c.ang += clamp(angDiff(c.ang, B.ang), -1.4 * dt, 1.4 * dt);
      if (d < 9 || V.t > 25) { if (d < 14) { c.x = lerp(c.x, B.x, 0.7); c.y = lerp(c.y, B.y, 0.7); c.ang = B.ang; } visitPark(c); }
    }
    if (V.phase === 'park' && V.t > 40) {                                                     // blocked on the way: it parks if it is nearly there, or gives up and drives off
      if (dist(c.x, c.y, B.x, B.y) < 24) visitPark(c); else { V.phase = 'away'; V.w = 0; V.t = 0; if (B.car === c) B.car = null; }
    }
    return true;
  }
  if (V.phase === 'out') {                                                                   // backing out of the bay
    const T = B.b, d = dist(c.x, c.y, T.x, T.y), fx = Math.cos(c.ang), fy = Math.sin(c.ang), vf = c.vx * fx + c.vy * fy;
    const want = Math.atan2(T.y - c.y, T.x - c.x), dr = angDiff(c.ang + Math.PI, want);
    c.str = clamp(-dr * 2, -1, 1); c.thr = vf < -9 * KMH ? 0 : -0.6; c.hb = false;
    if (d < 16 || V.t > 6) { V.phase = 'away'; V.w = 0; V.t = 0; }
    return true;
  }
  if (V.phase === 'away') {                                                                  // out to the street, then off into the traffic
    const pts = S.out, T = pts[Math.min(V.w, pts.length - 1)];
    if (T) { visitSteer(c, T.x, T.y, 22 * KMH); if (dist(c.x, c.y, T.x, T.y) < 30) V.w++; }
    if (V.w >= pts.length || V.t > 30) {
      const s = projEdge(S.e, c.x, c.y); c.e = S.e; c.fw = -S.fwIn; c.s = c.fw > 0 ? s : RE[S.e].len - s; c.nx = null; visitEnd(c);
    }
    return true;
  }
  c.thr = 0; c.str = 0; return true;                                                         // parked or waiting for its driver
}
function visitWalk(p, dt) {              // js/08 updatePeds: a visitor walking between a car and a door
  const G = p.go; if (p.state === 'flee') { p.go = null; return false; }
  let tx = G.x, ty = G.y, reach = 10;
  if (G.via && G.via.length) { tx = G.via[0].x; ty = G.via[0].y; if (dist(p.x, p.y, tx, ty) < 14) G.via.shift(); }
  else if (G.car) {
    const c = G.car; if (!cars.includes(c) || c.dead || c.driver || P.car === c || !c.visit) { p.go = null; return false; }   // the car is gone: just a passer-by now
    tx = c.x - Math.sin(c.ang) * (c.t.wid / 2 + 8); ty = c.y + Math.cos(c.ang) * (c.t.wid / 2 + 8); reach = 12;
  }
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp = d > 2 ? p.speed : 0;
  p.vx = lerp(p.vx, dx / (d || 1) * sp, 1 - Math.exp(-10 * dt)); p.vy = lerp(p.vy, dy / (d || 1) * sp, 1 - Math.exp(-10 * dt));
  p.x += p.vx * dt; p.y += p.vy * dt; p.bob += Math.hypot(p.vx, p.vy) * dt * 0.12; resolveCircle(p, 7);
  G.t = (G.t || 0) + dt;
  if ((d < reach && !(G.via && G.via.length)) || G.t > 50) {
    const c = G.car;
    if (c && G.t <= 50) { c.driver = 'ai'; c.lot = null; c.visit.phase = 'out'; c.visit.t = 0; }   // in, and off
    else if (c && c.visit) { c.visit.phase = 'parked'; c.visit.until = gameT + 8; }             // never got there: someone else tries in a moment
    p.vanish = true;                                                                          // through the doors, or into the car
  }
  return true;
}
