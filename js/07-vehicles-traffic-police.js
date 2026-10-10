'use strict';
/* ---------- 6b. GAMEPLAY: vehicles, traffic & police AI ---------- */
// the player's car handles arcade style: livelier pickup, harder brakes, tyres that stick unless you pull the handbrake, a tight turn at any speed.
// Traffic and police keep the real-world numbers their driving is tuned to.
const ARCADE = { acc: 1.7, brake: 1.5, grip: 2.2, hbGrip: 0.3, turn: 1.15, lat: 4.5 * G_ACC, full: 8 * KMH, steer: 16, coast: 0.35 };
const REAL = { acc: 1, brake: 1, grip: 1, hbGrip: 0.28, turn: 1, lat: LAT_GRIP, full: 18 * KMH, steer: 10, coast: 0.12 };
function stepCar(c, dt) {
  const t = c.t, fx = Math.cos(c.ang), fy = Math.sin(c.ang), rx = -fy, ry = fx, H = c.driver === 'player' ? ARCADE : REAL;
  if (c.air > 0 || c.vz > 0) {                                    // thrown by a blast: no grip in the air - it flies, spins and comes down (with a small bounce)
    c.vz -= 900 * dt; c.air = Math.max(0, (c.air || 0) + c.vz * dt); if (c.air === 0) c.vz = c.vz < -200 ? -c.vz * 0.25 : 0;
    c.x += c.vx * dt; c.y += c.vy * dt; c.ang += c.av * dt; c.av *= Math.exp(-0.4 * dt); if (c.hitCd > 0) c.hitCd -= dt; return;
  }
  if (c.dead || c.burn > 0 && !c.driver) { c.thr = 0; c.str = 0; }
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * rx + c.vy * ry;
  c.slip = Math.abs(vl);
  if (c.thr !== 0) {
    const braking = c.thr * vf < 0;
    const a = braking ? t.brake * H.brake * (0.55 + 0.45 * SKY.grip) : t.acc * H.acc * (1 - Math.min(1, Math.abs(vf) / (c.thr > 0 ? t.max : Math.min(t.max * 0.45, 35 * KMH))));
    vf += c.thr * a * dt;
  }
  vf *= Math.exp(-(c.thr === 0 ? (c.driver ? H.coast : 0.6) : 0.02) * dt);   // rolling and air drag; off the throttle the engine slows you a little
  vl *= Math.exp(-(c.hb ? t.grip * H.hbGrip : t.grip * H.grip) * SKY.grip * dt);   // wet roads: less grip (js/12d)
  if (c.hb) vf *= Math.exp(-0.9 * dt);
  c.vx = fx * vf + rx * vl; c.vy = fy * vf + ry * vl;            // velocity keeps its direction while the nose turns: that is the drift
  const sp = Math.max(c.assist ? 0.5 : 0, Math.min(1, Math.abs(vf) / H.full)), sgn = c.fs || (vf >= 0 ? 1 : -1);
  const yaw = Math.min(t.turn * H.turn * sp, H.lat * (0.6 + 0.4 * SKY.grip) / Math.max(1, Math.abs(vf)));   // the faster you go, the wider you must turn
  c.av = lerp(c.av, c.str * yaw * sgn * (c.hb ? 1.25 : 1), Math.min(1, dt * H.steer));
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
      for (const rc of _nb) { if (rc.gate && c.t.cop) continue; const h = circleSolid(q[0], q[1], q[2], rc); if (h && ((rc.fence && fenceBreak(rc, c)) || (rc.barrier && barrierHit(rc, c)))) continue; if (h) { c.x += h.nx * h.pen; c.y += h.ny * h.pen; q[0] += h.nx * h.pen; q[1] += h.ny * h.pen; nx += h.nx; ny += h.ny; hit = true; } }
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
      const Bc = cars[b]; if (A.hook || Bc.hook) continue;
      const reach = (A.t.len + Bc.t.len) / 2 + 4; if (Math.abs(A.x - Bc.x) > reach || Math.abs(A.y - Bc.y) > reach) continue;
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
    if (p.dead || Math.abs(p.x - c.x) > c.t.len / 2 + 30 || Math.abs(p.y - c.y) > c.t.len / 2 + 30) continue;
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
    if (ei === e || RE[ei].nt) continue;                      // driveways to landmarks are closed to traffic
    const F = RE[ei], nfw = F.a === node ? 1 : -1, d = edgeAt(ei, nfw > 0 ? 0 : F.len, _lq), cos = ax * d.tx * nfw + ay * d.ty * nfw;
    opts.push([ei, nfw, 0.12 + Math.max(0, cos + 0.4) ** 2]);
  }
  if (!opts.length) return { e, fw: -fw };   // dead end: turn round
  let r = Math.random() * opts.reduce((a, o) => a + o[2], 0);
  for (const o of opts) { r -= o[2]; if (r <= 0) return { e: o[0], fw: o[1] }; }
  return { e: opts[0][0], fw: opts[0][1] };
}
function routeEdge(c) {                      // a vehicle on a call (js/08c): at the junction take the street that gets it to the scene soonest
  const E = RE[c.e], node = c.fw > 0 ? E.b : E.a, T = c.task; let best = null, bc = Infinity;
  for (const ei of RN[node].e) {
    if (ei === c.e || RE[ei].nt) continue;
    const F = RE[ei], fromA = F.a === node, cost = ei === T.r.e ? (fromA ? T.r.s : F.len - T.r.s) : F.len + T.field[fromA ? F.b : F.a];
    if (cost < bc) { bc = cost; best = { e: ei, fw: fromA ? 1 : -1 }; }
  }
  return best || { e: c.e, fw: -c.fw };
}
const nextFor = c => c.task ? routeEdge(c) : nextEdge(c.e, c.fw);
function laneAhead(c, ahead, out) {          // point on the car's lane `ahead` units further on, running into the next edge if needed
  const E = RE[c.e], s = c.s + ahead;
  if (s <= E.len) return lanePoint(c.e, c.fw, s, c.lo || LANE, out);
  if (!c.nx) c.nx = nextFor(c);
  return lanePoint(c.nx.e, c.nx.fw, Math.min(RE[c.nx.e].len, s - E.len), c.lo || LANE, out);
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
  c.thr = vf < tgt ? 1 : (vf > tgt + 18 * KMH ? -0.6 : 0);
}
/* police route: the next point to drive to along the shortest road route to you, or to where you were last seen (RD from roadFieldTo) */
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
function aiDrive(c, dt) {
  if (c.e < 0 && !snapToRoad(c)) { c.thr = 0; c.str = 0; return; }
  let sa = projEdge(c.e, c.x, c.y);
  if (_lp.d > 160) { if (!snapToRoad(c)) { c.thr = 0; c.str = 0; return; } sa = projEdge(c.e, c.x, c.y); }   // knocked far off its road
  c.s = c.fw > 0 ? sa : RE[c.e].len - sa;
  if (c.s >= RE[c.e].len - 4) {
    const n = c.nx || nextFor(c); c.e = n.e; c.fw = n.fw; c.nx = null;
    const s2 = projEdge(c.e, c.x, c.y); c.s = c.fw > 0 ? s2 : RE[c.e].len - s2;
  }
  if (c.t.job && serviceStop(c, dt)) return;                        // at the scene of a call, or stopped at a bin (js/08c)
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), vf = c.vx * fx + c.vy * fy, spd = carSpeed(c), F = Math.max(0, c.t.len / 2 - 27);   // F: how much further a long vehicle's nose is
  const sir = feat('sirens') && isSiren(c), pulled = feat('sirens') && pullOver(c);   // lights and siren: down the middle; a siren near: keep right (js/07b)
  c.lo = lerp(c.lo || LANE, pulled ? LANE + STR.pullSide : sir ? 4 : LANE, 1 - Math.exp(-2.5 * dt));
  const far = laneAhead(c, 120 + Math.max(0, vf) * 0.6, _cw), dfar = Math.abs(angDiff(c.ang, Math.atan2(far.y - c.y, far.x - c.x)));
  const near = laneAhead(c, (40 + Math.max(0, vf) * 0.3) * (1 - 0.45 * Math.min(1, dfar / 1.2)), _lq), d = angDiff(c.ang, Math.atan2(near.y - c.y, near.x - c.x));   // aim closer in a bend, so the corner is not cut into the other lane
  c.str = clamp(d * 4.5, -1, 1);                                    // firm steering keeps cars in their lane, clear of parked ones
  if (!c.cruise) c.cruise = Math.min(c.t.max * 0.9, rand(40, 55) * KMH);   // town traffic: 40-55 km/h
  let tgt = (c.task ? Math.min(c.t.max * 0.9, 65 * KMH) : c.cruise) * (1 - SKYP.aiSlow * SKY.wet) * (1 - 0.5 * Math.min(1, Math.abs(d))) * (1 - 0.68 * Math.min(1, dfar / 1.2)), block = 999;   // slow right down for a sharp turn
  const stop = vf > 0 ? vf * vf / (2 * c.t.brake * (0.55 + 0.45 * SKY.grip)) : 0, reach = 70 + stop * 1.6 + Math.max(0, vf) * 0.4;   // look far enough ahead to stop in time
  const look = (ox, oy, lw, back) => { const rx = ox - c.x, ry = oy - c.y, ah = rx * fx + ry * fy, al = ah - F - (back || 0), lat = Math.abs(-rx * fy + ry * fx); if (ah > 18 && al < reach && lat < lw && al < block) block = al; };
  const R = reach + 30 + F;
  for (const o of cars) if (o !== c && Math.abs(o.x - c.x) < R + o.t.len / 2 && Math.abs(o.y - c.y) < R + o.t.len / 2) look(o.x, o.y, sir && o.pullT > gameT ? 14 : 24, Math.max(0, o.t.len / 2 - 27) + 14);   // a bus ahead ends further back; stop a little short of its bumper   // cars in the parking lane (33 to the side) are not in the way
  if (!P.car) look(P.x, P.y, 24);
  for (const p of peds) if (!p.dead && Math.abs(p.x - c.x) < R && Math.abs(p.y - c.y) < R) look(p.x, p.y, 20);
  block = Math.min(block, roadRules(c, vf, stop, F)); tgt = Math.min(tgt, _tr.cap);   // traffic lights, giving way, people crossing (js/07b)
  if (pulled) tgt = Math.min(tgt, Math.max(c.cruise * STR.pullSlow, _tr.cap < 1e9 ? 12 * KMH : 0));   // slow down for the siren (rolling over a red light: at a crawl)
  if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.str = 0; return; }
  if (block < 48 + stop) { c.thr = vf > 8 ? -1 : 0; if (vf <= 8) { const k = Math.exp(-6 * dt); c.vx *= k; c.vy *= k; } }   // too close to stop gently: full brake, and hold it once stopped
  else { if (block < reach) tgt = Math.min(tgt, Math.max(0, (block - 48) * 1.1)); c.thr = vf < tgt ? 0.8 : (vf > tgt + 15 * KMH ? -0.6 : 0); }
  if (spd < 10 && block > 150) { c.stuck += dt; if (c.stuck > 2) { c.rev = 1; c.stuck = 0; } } else c.stuck = 0;
}

function wrestle(c, dt) {                                        // a carjacking: the driver and you fight over the wheel, the car lurches and swerves
  if ((c.wt = (c.wt || 0) - dt) <= 0) {
    c.wt = rand(0.15, 0.4); c.ws = rand(0.55, 1) * (c.ws > 0 ? -1 : 1);
    c.wg = Math.random() < 0.75 ? rand(0.4, 1) : -0.5;               // mostly the driver floors it to shake you off, now and then someone hits the brake
    if (Math.random() < 0.5) Snd.thud(rand(60, 110));
  }
  c.wst = lerp(c.wst || 0, c.ws, Math.min(1, dt * 14)); c.str = c.wst; c.thr = c.wg; c.hb = false;
}
function updateCars(dt) {
  trafficTick();                                                   // sirens about, people on the crossings (js/07b)
  if (gameT > copFieldT && cars.some(c => c.driver === 'cop')) { copFieldT = gameT + 0.5; copTarget = roadFieldTo(PS.lx, PS.ly); }   // police drive to what they know (js/08b)
  for (const c of cars) {
    if (c.hook) continue;                                          // on the crane at the docks (js/08m): it moves with the hook
    if (c.dead) { c.deadT += dt; c.thr = 0; c.str = 0; }
    else if (c.driver === 'ai') aiDrive(c, dt);
    else if (c.driver === 'cop') copDrive(c, dt);
    else if (c.driver !== 'player') { c.thr = 0; c.str = 0; c.hb = !!c.medics; }   // an ambulance whose paramedics are out stays put (js/08h)
    if (P.act && P.act.occ && P.act.c === c && !c.dead) wrestle(c, dt);
    if ((c.driver === 'ai' || c.driver === 'cop') && !c.dead) {   // computer drivers do not drive into the sea or a lake, forwards or backing up
      const spd = carSpeed(c), fx = Math.cos(c.ang), fy = Math.sin(c.ang), vf = c.vx * fx + c.vy * fy, back = c.thr < 0 && vf < 25 ? -1 : 1;
      const ahead = (30 + spd * 0.5) * back, hx = c.x + fx * ahead, hy = c.y + fy * ahead;
      if (shoreDist(hx, hy) < 6) {
        if (back < 0) { c.thr = vf < -10 ? 1 : 0; c.rev = 0; }                // backing toward the water: stop
        else { const g = shoreGrad(hx, hy); c.thr = vf > 30 ? -1 : 0; c.hb = false; c.str = clamp(angDiff(c.ang, Math.atan2(g[1], g[0])) * 2, -1, 1); }
      }
    }
    if (c.sunk) { c.sinkT += dt; c.vx *= Math.exp(-2.5 * dt); c.vy *= Math.exp(-2.5 * dt); c.av *= 0.9; }
    stepCar(c, dt);
    collideCarWorld(c);
    if ((c.driver === 'ai' || c.driver === 'cop') && !c.dead && !c.sunk) {   // and nobody shoves them in: the shore holds them like a kerb
      const sd = shoreDist(c.x, c.y);
      if (sd < 0) { const g = shoreGrad(c.x, c.y), vin = c.vx * g[0] + c.vy * g[1]; c.x -= g[0] * sd; c.y -= g[1] * sd; if (vin < 0) { c.vx -= vin * g[0]; c.vy -= vin * g[1]; } }
    }
    if (!c.sunk && shoreDist(c.x, c.y) < -8) sinkCar(c);
    if (c.sunk && c.sinkT < 1.4 && Math.random() < 0.3) splashFx(c.x + rand(-14, 14), c.y + rand(-14, 14), 3);
    carHitsPeds(c);
    // damage you can see (there is no health bar): thin white wisps from the bonnet, then thick grey smoke and sparks, then black smoke
    // and flames; on fire it burns all over until it blows (js/11 scorches and lights up the paint)
    const f = c.hp / c.maxhp; c.smokeT -= dt;
    if (!c.dead && c.smokeT <= 0 && (f < 0.75 || c.burn > 0)) {
      const ca = Math.cos(c.ang), sa = Math.sin(c.ang), bx = c.x + ca * c.t.len * 0.3, by = c.y + sa * c.t.len * 0.3;
      if (c.burn > 0) { c.smokeT = 0.035; smokeFx(c.x, c.y, true, 1.7); for (let k = 0; k < 3; k++) { const o = rand(-0.45, 0.45) * c.t.len; fireFx(c.x + ca * o, c.y + sa * o, 1.6); } }
      else if (f < 0.3) { c.smokeT = 0.05; smokeFx(bx, by, true, 1.3); fireFx(bx, by); if (Math.random() < 0.25) spark(bx, by, 2); }
      else if (f < 0.5) { c.smokeT = 0.09; smokeFx(bx, by, false, 1.2); if (Math.random() < 0.12) spark(bx, by, 2); }
      else { c.smokeT = 0.22; smokeFx(bx, by, false, 0.8, true); }
    }
    if (c.dead && !c.sunk && !c.doused && c.deadT < 25 && c.smokeT <= 0) { c.smokeT = 0.18; smokeFx(c.x, c.y, true); if (Math.random() < 0.4) fireFx(c.x, c.y); }
    if (c.burn > 0 && !c.dead) { c.burn -= dt; if (c.burn <= 0) explodeCar(c); }
  }
  collideCars();
}

