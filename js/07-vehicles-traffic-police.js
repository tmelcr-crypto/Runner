'use strict';
/* ---------- 6b. GAMEPLAY: vehicles, traffic & police AI ---------- */
function stepCar(c, dt) {
  const t = c.t, fx = Math.cos(c.ang), fy = Math.sin(c.ang), rx = -fy, ry = fx;
  if (c.dead || c.burn > 0 && !c.driver) { c.thr = 0; c.str = 0; }
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * rx + c.vy * ry;
  c.slip = Math.abs(vl);
  if (c.thr !== 0) {
    const braking = c.thr * vf < 0;
    const a = braking ? t.acc * 1.7 : t.acc * (1 - Math.min(1, Math.abs(vf) / (c.thr > 0 ? t.max : t.max * 0.45)));
    vf += c.thr * a * dt;
  }
  vf *= Math.exp(-(c.thr === 0 ? (c.driver ? 0.7 : 1.8) : 0.25) * dt);
  vl *= Math.exp(-(c.hb ? t.grip * 0.28 : t.grip) * dt);
  if (c.hb) vf *= Math.exp(-0.9 * dt);
  c.vx = fx * vf + rx * vl; c.vy = fy * vf + ry * vl;            // velocity keeps its direction while the nose turns: that is the drift
  const sp = Math.max(c.assist ? 0.5 : 0, Math.min(1, Math.abs(vf) / (140 * SPEED_K))), hi = 1 - 0.35 * Math.min(1, Math.abs(vf) / t.max), sgn = c.fs || (vf >= 0 ? 1 : -1);
  c.av = lerp(c.av, c.str * t.turn * sp * hi * sgn * (c.hb ? 1.25 : 1), Math.min(1, dt * 10));
  c.ang += c.av * dt;
  c.x += c.vx * dt; c.y += c.vy * dt;
  // skid marks from the rear wheels
  const spd = Math.hypot(c.vx, c.vy);
  if (c.slip > 85 && spd > 90 && !c.dead) {
    const ex = Math.cos(c.ang), ey = Math.sin(c.ang), qx = -ey, qy = ex, bx = c.x - ex * t.len * 0.32, by = c.y - ey * t.len * 0.32, w = t.wid * 0.38;
    const nw = [[bx + qx * w, by + qy * w], [bx - qx * w, by - qy * w]];
    if (c.sk) for (let k = 0; k < 2; k++) skids.push({ x1: c.sk[k][0], y1: c.sk[k][1], x2: nw[k][0], y2: nw[k][1], a: 0.55 });
    c.sk = nw; if (skids.length > 420) skids.splice(0, skids.length - 420);
  } else c.sk = null;
  if (c.hitCd > 0) c.hitCd -= dt;
}
function collideCarWorld(c) {
  let nx = 0, ny = 0, hit = false;
  for (let it = 0; it < 2; it++) {
    for (const q of carCircles(c)) {
      nearBuildings(q[0], q[1], _nb);
      for (const rc of _nb) { const h = circleRect(q[0], q[1], q[2], rc); if (h) { c.x += h.nx * h.pen; c.y += h.ny * h.pen; q[0] += h.nx * h.pen; q[1] += h.ny * h.pen; nx += h.nx; ny += h.ny; hit = true; } }
      nearRails(q[0], q[1], _nr);
      for (const sg of _nr) { const h = circleSeg(q[0], q[1], q[2], sg); if (h) { c.x += h.nx * h.pen; c.y += h.ny * h.pen; q[0] += h.nx * h.pen; q[1] += h.ny * h.pen; nx += h.nx; ny += h.ny; hit = true; } }
      if (q[0] < CX0 + q[2]) { c.x += CX0 + q[2] - q[0]; nx += 1; hit = true; } else if (q[0] > CX1 - q[2]) { c.x -= q[0] - (CX1 - q[2]); nx -= 1; hit = true; }
      if (q[1] < CY0 + q[2]) { c.y += CY0 + q[2] - q[1]; ny += 1; hit = true; } else if (q[1] > CY1 - q[2]) { c.y -= q[1] - (CY1 - q[2]); ny -= 1; hit = true; }
    }
  }
  if (!hit) return;
  const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
  const vn = c.vx * nx + c.vy * ny;
  if (vn < 0) {
    c.vx -= 1.35 * vn * nx; c.vy -= 1.35 * vn * ny; c.vx *= 0.95; c.vy *= 0.95; c.av *= 0.6;
    const imp = -vn;
    if (imp > 70 && c.hitCd <= 0) {
      c.hitCd = 0.15; damageCar(c, (imp - 70) * 0.14, false); spark(c.x - nx * 12, c.y - ny * 12, 5);
      if (c.driver === 'player') { cam.shake = Math.max(cam.shake, Math.min(12, imp * 0.03)); Snd.thud(imp); }
    }
  }
}
function collideCars() {
  for (let a = 0; a < cars.length; a++) {
    const A = cars[a];
    for (let b = a + 1; b < cars.length; b++) {
      const Bc = cars[b];
      if (Math.abs(A.x - Bc.x) > 100 || Math.abs(A.y - Bc.y) > 100) continue;
      let hit = false, nx = 0, ny = 0, pen = 0;
      for (const p of carCircles(A)) for (const q of carCircles(Bc)) {
        const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), rr = p[2] + q[2];
        if (d < rr && d > 0.001) { nx += dx / d; ny += dy / d; pen = Math.max(pen, rr - d); hit = true; }
      }
      if (!hit) continue;
      const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
      const ma = A.t.mass * (A.dead ? 3 : 1), mb = Bc.t.mass * (Bc.dead ? 3 : 1), tot = ma + mb;
      A.x -= nx * pen * (mb / tot); A.y -= ny * pen * (mb / tot); Bc.x += nx * pen * (ma / tot); Bc.y += ny * pen * (ma / tot);
      const rv = (Bc.vx - A.vx) * nx + (Bc.vy - A.vy) * ny;
      if (rv < 0) {
        const j = -1.4 * rv / (1 / ma + 1 / mb);
        A.vx -= j * nx / ma; A.vy -= j * ny / ma; Bc.vx += j * nx / mb; Bc.vy += j * ny / mb;
        const imp = -rv;
        if (imp > 60 && A.hitCd <= 0) {
          A.hitCd = Bc.hitCd = 0.2;
          damageCar(A, (imp - 60) * 0.1 * Math.sqrt(mb / ma), Bc.driver === 'player');
          damageCar(Bc, (imp - 60) * 0.1 * Math.sqrt(ma / mb), A.driver === 'player');
          spark((A.x + Bc.x) / 2, (A.y + Bc.y) / 2, 6);
          if (A.driver === 'player' || Bc.driver === 'player') { cam.shake = Math.max(cam.shake, Math.min(12, imp * 0.03)); Snd.thud(imp); }
        }
      }
    }
  }
}
function carHitsPeds(c) {
  const spd = carSpeed(c); if (spd < 40 || c.dead) return;
  const cc = carCircles(c);
  for (const p of peds) {
    if (p.dead || Math.abs(p.x - c.x) > 70 || Math.abs(p.y - c.y) > 70) continue;
    for (const q of cc) {
      const d = Math.hypot(p.x - q[0], p.y - q[1]);
      if (d < q[2] + 6) {
        if (spd > 100) { killPed(p, 'car', c.driver === 'player'); Snd.thud(120); c.vx *= 0.98; c.vy *= 0.98; }
        else { p.x += (p.x - q[0]) / Math.max(d, 1) * 3; p.y += (p.y - q[1]) / Math.max(d, 1) * 3; }
        break;
      }
    }
  }
  for (const o of officers) {
    if (o.dead) continue;
    for (const q of cc) if (Math.hypot(o.x - q[0], o.y - q[1]) < q[2] + 6 && spd > 100) { killOfficer(o, c.driver === 'player'); break; }
  }
}

/* ---------- driving on the road graph ---------- */
const _lp = {}, _lq = {}, _cw = {};
function projEdge(e, x, y) {                 // arc length (a -> b) of the point on edge e closest to (x, y), and its distance
  const E = RE[e]; let bs = 0, bd = Infinity;
  for (let k = 0; k < E.p.length - 1; k++) {
    const [x1, y1] = E.p[k], [x2, y2] = E.p[k + 1], dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1), d = Math.hypot(x - x1 - dx * t, y - y1 - dy * t);
    if (d < bd) { bd = d; bs = E.cum[k] + t * Math.sqrt(l2); }
  }
  _lp.d = bd; return bs;
}
function nextEdge(e, fw) {                   // at the end of edge e (travelling fw) pick where to go next; going straight on is likeliest
  const E = RE[e], node = fw > 0 ? E.b : E.a, arr = edgeAt(e, fw > 0 ? E.len : 0, _lq), ax = arr.tx * fw, ay = arr.ty * fw, opts = [];
  for (const ei of RN[node].e) {
    if (ei === e) continue;
    const F = RE[ei], nfw = F.a === node ? 1 : -1, d = edgeAt(ei, nfw > 0 ? 0 : F.len, _lq), cos = ax * d.tx * nfw + ay * d.ty * nfw;
    opts.push([ei, nfw, 0.12 + Math.max(0, cos + 0.4) ** 2]);
  }
  if (!opts.length) return { e, fw: -fw };   // dead end: turn round
  let r = Math.random() * opts.reduce((a, o) => a + o[2], 0);
  for (const o of opts) { r -= o[2]; if (r <= 0) return { e: o[0], fw: o[1] }; }
  return { e: opts[0][0], fw: opts[0][1] };
}
function laneAhead(c, ahead, out) {          // point on the car's lane `ahead` units further on, running into the next edge if needed
  const E = RE[c.e], s = c.s + ahead;
  if (s <= E.len) return lanePoint(c.e, c.fw, s, LANE, out);
  if (!c.nx) c.nx = nextEdge(c.e, c.fw);
  return lanePoint(c.nx.e, c.nx.fw, Math.min(RE[c.nx.e].len, s - E.len), LANE, out);
}
function snapToRoad(c) {                     // (re)join the nearest road, heading the way the car already points
  const r = nearestRoad(c.x, c.y, 500); if (!r) return false;
  const t = edgeAt(r.e, r.s, _lq), fw = Math.cos(c.ang) * t.tx + Math.sin(c.ang) * t.ty >= 0 ? 1 : -1;
  c.e = r.e; c.fw = fw; c.s = fw > 0 ? r.s : RE[r.e].len - r.s; c.nx = null; return true;
}
function steerToward(c, tx, ty, speedTarget) {
  const d = angDiff(c.ang, Math.atan2(ty - c.y, tx - c.x));
  c.str = clamp(d * 2.2, -1, 1);
  const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang), tgt = speedTarget * (1 - 0.55 * Math.min(1, Math.abs(d) / 1.2));
  c.thr = vf < tgt ? 1 : (vf > tgt + 60 * SPEED_K ? -0.6 : 0);
}
/* police route: the next point to drive to along the shortest road route toward the player (RD from roadFieldTo) */
let copFieldT = 0, copTarget = null;
function copRoadTarget(c, out) {
  const rs = nearRoads(c.x, c.y, 170); if (!rs.length) return null;
  let best = null, bc = Infinity;
  for (const r of rs) {
    const E = RE[r.e], pen = r.d * 2;
    if (copTarget && r.e === copTarget.e) { const cost = Math.abs(r.s - copTarget.s) + pen; if (cost < bc) { bc = cost; best = { e: r.e, s: r.s, dir: copTarget.s >= r.s ? 1 : -1, toT: true }; } }
    const ca = r.s + RD[E.a] + pen, cb = E.len - r.s + RD[E.b] + pen;
    if (ca < bc) { bc = ca; best = { e: r.e, s: r.s, dir: -1 }; }
    if (cb < bc) { bc = cb; best = { e: r.e, s: r.s, dir: 1 }; }
  }
  if (!best || !isFinite(bc)) return null;
  const E = RE[best.e], s = best.s + best.dir * (90 + carSpeed(c) * 0.3);
  if (best.toT) return edgeAt(best.e, best.dir > 0 ? Math.min(s, copTarget.s) : Math.max(s, copTarget.s), out);
  if (s >= 0 && s <= E.len) return edgeAt(best.e, s, out);
  const node = best.dir > 0 ? E.b : E.a, over = s < 0 ? -s : s - E.len;   // past the junction: carry on along the best next edge
  let ne = -1, nc = Infinity;
  for (const ei of RN[node].e) {
    if (ei === best.e) continue;
    const F = RE[ei], fromA = F.a === node;
    const cost = copTarget && ei === copTarget.e ? (fromA ? copTarget.s : F.len - copTarget.s) : F.len + RD[fromA ? F.b : F.a];
    if (cost < nc) { nc = cost; ne = ei; }
  }
  if (ne < 0) return edgeAt(best.e, best.dir > 0 ? E.len : 0, out);
  const F = RE[ne]; return edgeAt(ne, F.a === node ? Math.min(F.len, over) : Math.max(0, F.len - over), out);
}
function copDrive(c, dt) {
  const tgt = P.car || P; let tx = tgt.x + (tgt.vx || 0) * 0.35, ty = tgt.y + (tgt.vy || 0) * 0.35;
  const d = dist(c.x, c.y, tgt.x, tgt.y), spd = carSpeed(c);
  if (P.stars === 1 && d < 70 + spd * 0.3) {          // one star: pull up about 70 units from the player, then two cops get out on foot
    c.str = 0; c.thr = carSpeed(c) > 30 ? -1 : 0; c.hb = c.thr === 0;
    if (spd < 30 && d < 120) copsExit(c);
    return;
  }
  c.hb = false;
  if (!(d < 650 && losClear(c.x, c.y, tgt.x, tgt.y) && !waterBetween(c.x, c.y, tgt.x, tgt.y))) {
    const w = copRoadTarget(c, _cw); if (w) { tx = w.x; ty = w.y; }
  }
  if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.str = -clamp(angDiff(c.ang, Math.atan2(ty - c.y, tx - c.x)) * 2, -1, 1); return; }
  if (spd < 22 && d > 70) { c.stuck += dt; if (c.stuck > 1.1) { c.rev = 0.9; c.stuck = 0; } } else c.stuck = 0;
  steerToward(c, tx, ty, d < 130 ? 260 * SPEED_K : c.t.max * 0.92);
  if (d < 55 && spd < 60) c.thr = 0;
}
function copsExit(c) {
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
  for (const sd of [-1, 1]) { const o = makeOfficer(c.x - fy * sd * 24, c.y + fx * sd * 24); o.ang = c.ang; officers.push(o); }
  c.driver = null; c.thr = 0; c.str = 0; c.hb = true; Snd.tone(500, 400, 0.05, 0.1, 'square');
}
function aiDrive(c, dt) {
  if (c.e < 0 && !snapToRoad(c)) { c.thr = 0; c.str = 0; return; }
  let sa = projEdge(c.e, c.x, c.y);
  if (_lp.d > 160) { if (!snapToRoad(c)) { c.thr = 0; c.str = 0; return; } sa = projEdge(c.e, c.x, c.y); }   // knocked far off its road
  c.s = c.fw > 0 ? sa : RE[c.e].len - sa;
  if (c.s >= RE[c.e].len - 4) {
    const n = c.nx || nextEdge(c.e, c.fw); c.e = n.e; c.fw = n.fw; c.nx = null;
    const s2 = projEdge(c.e, c.x, c.y); c.s = c.fw > 0 ? s2 : RE[c.e].len - s2;
  }
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), vf = c.vx * fx + c.vy * fy, spd = carSpeed(c);
  const near = laneAhead(c, 40 + Math.max(0, vf) * 0.3, _lq), d = angDiff(c.ang, Math.atan2(near.y - c.y, near.x - c.x));
  c.str = clamp(d * 2.4, -1, 1);
  const far = laneAhead(c, 120 + Math.max(0, vf) * 0.6, _cw), dfar = Math.abs(angDiff(c.ang, Math.atan2(far.y - c.y, far.x - c.x)));
  if (!c.cruise) c.cruise = rand(170, 250) * SPEED_K;
  let tgt = c.cruise * (1 - 0.5 * Math.min(1, Math.abs(d))) * (1 - 0.45 * Math.min(1, dfar / 1.1)), block = 999;
  const look = (ox, oy, lw) => { const rx = ox - c.x, ry = oy - c.y, al = rx * fx + ry * fy, lat = Math.abs(-rx * fy + ry * fx); if (al > 18 && al < 150 && lat < lw && al < block) block = al; };
  for (const o of cars) if (o !== c && Math.abs(o.x - c.x) < 170 && Math.abs(o.y - c.y) < 170) look(o.x, o.y, 32);
  if (!P.car) look(P.x, P.y, 24);
  for (const p of peds) if (!p.dead && Math.abs(p.x - c.x) < 170 && Math.abs(p.y - c.y) < 170) look(p.x, p.y, 20);
  if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.str = 0; return; }
  if (block < 70) { c.thr = vf > 25 ? -1 : 0; } else { if (block < 150) tgt = Math.min(tgt, Math.max(0, vf * 0.7)); c.thr = vf < tgt ? 0.8 : (vf > tgt + 50 * SPEED_K ? -0.5 : 0); }
  if (spd < 10 && block > 150) { c.stuck += dt; if (c.stuck > 2) { c.rev = 1; c.stuck = 0; } } else c.stuck = 0;
}

function updateCars(dt) {
  if (gameT > copFieldT && cars.some(c => c.driver === 'cop')) { copFieldT = gameT + 0.5; const t = P.car || P; copTarget = roadFieldTo(t.x, t.y); }
  for (const c of cars) {
    if (c.type === 'police') {
      if (c.driver === 'ai' && P.stars > 0 && !c.dead) { c.driver = 'cop'; c.way = null; }
      else if (c.driver === 'cop' && P.stars === 0) { c.driver = 'ai'; c.e = -1; }
    }
    if (c.dead) { c.deadT += dt; c.thr = 0; c.str = 0; }
    else if (c.driver === 'ai') aiDrive(c, dt);
    else if (c.driver === 'cop') copDrive(c, dt);
    else if (c.driver !== 'player') { c.thr = 0; c.str = 0; c.hb = false; }
    if (c.sunk) { c.sinkT += dt; c.vx *= Math.exp(-2.5 * dt); c.vy *= Math.exp(-2.5 * dt); c.av *= 0.9; }
    stepCar(c, dt);
    collideCarWorld(c);
    if (!c.sunk && shoreDist(c.x, c.y) < -8) sinkCar(c);
    if (c.sunk && c.sinkT < 1.4 && Math.random() < 0.3) splashFx(c.x + rand(-14, 14), c.y + rand(-14, 14), 3);
    carHitsPeds(c);
    // damage effects
    const f = c.hp / c.maxhp; c.smokeT -= dt;
    if (!c.dead && c.smokeT <= 0 && (f < 0.4 || c.burn > 0)) { c.smokeT = f < 0.2 || c.burn > 0 ? 0.05 : 0.14; smokeFx(c.x, c.y, f < 0.2); if (f < 0.2 || c.burn > 0) fireFx(c.x + Math.cos(c.ang) * 12, c.y + Math.sin(c.ang) * 12); }
    if (c.dead && !c.sunk && c.deadT < 25 && c.smokeT <= 0) { c.smokeT = 0.18; smokeFx(c.x, c.y, true); if (Math.random() < 0.4) fireFx(c.x, c.y); }
    if (c.burn > 0 && !c.dead) { c.burn -= dt; if (c.burn <= 0) explodeCar(c); }
  }
  collideCars();
}

