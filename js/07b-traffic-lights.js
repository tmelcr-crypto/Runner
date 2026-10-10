'use strict';
/* ---------- 5b. TRAFFIC LIGHTS AND THE RULES OF THE ROAD ----------
   Every junction of three or more streets has lights (timings: js/01m streets table). Opposite approaches go together, one without an
   opposite has a turn of its own: green, amber, then all red before the next group gets green. Junctions are not in step.
   Drivers (js/07 aiDrive): stop at the line on red, and on amber when there is room to stop; turning across the oncoming lane they give
   way to oncoming cars; they stop for people on the crossing of the street they turn into, and wait while someone is still crossing
   the junction from another direction. Vehicles with lights and siren - an ambulance or fire engine on a call, the police after you -
   go through red slowly and carefully; cars ahead of them keep right and slow down, and one waiting at a red light rolls over to make
   room. People (js/08) go round the corners and cross at the zebras: at the kerb they wait for the walk signal, which is green while
   the traffic over that crossing has red with enough of it left. You may run red lights: it is not a crime.
   Modes: trafficLights, sirens (js/01j). */
const SW_OUT = ROAD_HALF + SW_W, ZEBRA = SW_OUT + 12, STOP_LINE = SW_OUT + 51;   // from a junction's centre: the sidewalk's outer edge, the middle of a zebra, where a waiting car's centre stops

/* JN[node]: a junction (three streets or more): its arms sorted round it, each { e: the edge, ux, uy: the way out, g: its light group,
   pair: the arm opposite (same group) }, the corners between neighbouring arms, how many groups, whether it has lights */
const JN = RN.map((n, ni) => {
  if (n.e.length < 3) return null;
  const arms = n.e.map(ei => { const F = RE[ei], k = F.a === ni ? 1 : -1, t = edgeAt(ei, k > 0 ? 0 : F.len, {});
    return { e: ei, ux: t.tx * k, uy: t.ty * k, ang: Math.atan2(t.ty * k, t.tx * k), nt: F.nt, g: -1, pair: -1 }; });
  arms.sort((a, b) => a.ang - b.ang);
  const open = arms.filter(a => !a.nt), pairs = []; let ng = 0;                // driveways closed to traffic get no light
  for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) { const d = open[i].ux * open[j].ux + open[i].uy * open[j].uy; if (d < -0.7) pairs.push([d, open[i], open[j]]); }
  pairs.sort((a, b) => a[0] - b[0]);
  for (const [, a, b] of pairs) if (a.g < 0 && b.g < 0) { a.g = b.g = ng++; a.pair = arms.indexOf(b); b.pair = arms.indexOf(a); }
  for (const a of open) if (a.g < 0) a.g = ng++;
  const corners = arms.map((a, k) => {                                      // where the sidewalks of two neighbouring arms meet
    const b = arms[(k + 1) % arms.length]; let gap = b.ang - a.ang; if (gap <= 0) gap += TAU;
    const mid = a.ang + gap / 2, r = clamp(SIDEWALK / Math.max(0.05, Math.sin(gap / 2)), SIDEWALK, SIDEWALK * 2.2);
    return { x: n.x + Math.cos(mid) * r, y: n.y + Math.sin(mid) * r };
  });
  const h = Math.abs(Math.sin(ni * 12.9898 + 4.1) * 43758.5453);
  return { ni, x: n.x, y: n.y, arms, corners, ng, sig: open.length >= 3 && ng >= 2, off: h - Math.floor(h) };
});
const armIdx = (J, e) => { for (let k = 0; k < J.arms.length; k++) if (J.arms[k].e === e) return k; return -1; };
const JGRID = new Map(), JG = 600;
for (const J of JN) if (J) { const key = Math.floor(J.x / JG) + ',' + Math.floor(J.y / JG); if (!JGRID.has(key)) JGRID.set(key, []); JGRID.get(key).push(J); }
function nearJunction(x, y, r) {         // the nearest junction within r
  let best = null, bd = r; const gx = Math.floor(x / JG), gy = Math.floor(y / JG);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const J of JGRID.get((gx + i) + ',' + (gy + j)) || []) { const d = Math.hypot(J.x - x, J.y - y); if (d < bd) { bd = d; best = J; } }
  return best;
}

/* the lights: _sg.st 'g', 'a' or 'r' for approach k; wait: seconds until it next turns green; own: red in its own group's all-red */
const _sg = { st: 'g', wait: 0, own: false };
function sigAt(J, k) {
  const A = J.arms[k]; _sg.wait = 0; _sg.own = false;
  if (!J.sig || A.g < 0 || !feat('trafficLights')) { _sg.st = A.nt && J.sig ? 'r' : 'g'; return _sg; }
  const G = STR.green, Am = STR.amber, slot = G + Am + STR.allRed, cyc = slot * J.ng, t = ((gameT + J.off * cyc) % cyc + cyc) % cyc, gi = Math.floor(t / slot), lt = t - gi * slot;
  if (gi === A.g && lt < G + Am) { _sg.st = lt < G ? 'g' : 'a'; return _sg; }
  _sg.st = 'r'; _sg.own = gi === A.g; _sg.wait = ((A.g * slot - t) % cyc + cyc) % cyc; return _sg;
}
function walkOk(J, k) {                  // may people start over the crossing of arm k: the traffic over it has red, with enough of it left
  const A = J.arms[k]; if (A.nt || !J.sig || A.g < 0 || !feat('trafficLights')) return true;
  sigAt(J, k); return _sg.st === 'r' && !_sg.own && _sg.wait >= STR.walkMin;
}
function farTurn(J, k, out) {            // coming in on arm k and leaving on arm out: does it cross the oncoming lane (traffic keeps right)
  if (out < 0 || out === k) return false;
  const A = J.arms[k], B = J.arms[out], tx = -A.ux, ty = -A.uy;
  if (B.ux * tx + B.uy * ty > 0.7) return false;                             // straight on
  return B.ux * A.uy - B.uy * A.ux < 0;                                      // the far side, away from its own kerb
}

/* who is about: vehicles with lights and siren, people on a crossing (once a step, js/07 updateCars) */
const SIRENS = [], XING = [];
const isSiren = c => !c.dead && ((c.driver === 'ai' && !!c.task) || (c.driver === 'cop' && c.t.cop));
function trafficTick() {
  SIRENS.length = 0; XING.length = 0;
  if (feat('sirens')) for (const c of cars) if (isSiren(c)) SIRENS.push(c);
  for (const p of peds) if (p.xing && p.jw && !p.dead && !p.knocked && p.state !== 'flee') XING.push(p);
}
const crossingBusy = (ni, e) => { for (const p of XING) if (p.xing.n === ni && p.xing.e === e) return true; return false; };
function pullOver(c) {                   // a siren close behind, or coming the other way: true while this car keeps right and slows down for it
  if (!SIRENS.length || isSiren(c)) return c.pullT > gameT;
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), R = STR.pullDist + 80;
  for (const s of SIRENS) {
    if (s === c || Math.abs(s.x - c.x) > R || Math.abs(s.y - c.y) > R) continue;
    const sx = Math.cos(s.ang), sy = Math.sin(s.ang), rx = c.x - s.x, ry = c.y - s.y, al = rx * sx + ry * sy, lat = Math.abs(-rx * sy + ry * sx);
    if (al > 0 && al < STR.pullDist + (s.t.len + c.t.len) / 2 && lat < 70 && Math.abs(fx * sx + fy * sy) > 0.5) { c.pullT = gameT + 1.2; c.pullBy = s; return true; }
  }
  return c.pullT > gameT;
}
function oncoming(J, k) {                // a car coming the other way that would reach the junction before the gap a turn across it needs
  const p = J.arms[k].pair; if (p < 0) return false;
  const A = J.arms[p], ux = A.ux, uy = A.uy;
  const near = (o, you) => {
    const dx = o.x - J.x, dy = o.y - J.y, al = dx * ux + dy * uy;
    if (al < -ROAD_HALF * 0.3 || al > STOP_LINE + 500 || Math.abs(-dx * uy + dy * ux) > ROAD_HALF) return false;
    const vin = -(o.vx * ux + o.vy * uy); if (vin < 3 * KMH) return false;   // standing, or going away
    if (!you && o.nx && o.e === A.e && farTurn(J, p, armIdx(J, o.nx.e))) return false;   // turning across as well: both may go
    return (al - ROAD_HALF) / vin < STR.turnGap;
  };
  for (const o of cars) if (o.driver && o.driver !== 'player' && !o.dead && near(o, false)) return true;
  return !!(P.car && !P.car.dead && near(P.car, true));
}
/* js/07 aiDrive: how far ahead this car has to stop for the lights, oncoming traffic or people crossing (999: it need not);
   _tr.cap: the most it may go (a siren crossing red) */
const _tr = { cap: 1e9 };
function roadRules(c, vf, stop, F) {
  _tr.cap = 1e9; let b = 999;
  const Ec = RE[c.e], ni = c.fw > 0 ? Ec.b : Ec.a, n0 = c.fw > 0 ? Ec.a : Ec.b, J = JN[ni], toEnd = Ec.len - c.s - F;
  if (XING.length && JN[n0] && c.s + F + 27 < SW_OUT + 5 && crossingBusy(n0, c.e)) b = SW_OUT + 3 - c.s - F;   // just turned in: people on this street's crossing
  if (!J || toEnd > STOP_LINE + 420) return b;
  const k = armIdx(J, c.e); if (k < 0) return b;
  const Ls = Math.max(ROAD_HALF + 31, Math.min(STOP_LINE, Ec.len - 40)), past = toEnd < Ls - 30, dStop = toEnd - Ls + 42;   // past: its nose is over the crossing already
  if (!c.nx && toEnd < Ls + 220) c.nx = nextFor(c);
  const out = c.nx ? armIdx(J, c.nx.e) : -1;
  if (XING.length && out >= 0 && crossingBusy(ni, J.arms[out].e)) b = Math.min(b, past ? toEnd + SW_OUT - 27 : dStop);   // people on the crossing of the street it turns into
  if (!J.sig || !feat('trafficLights')) {                                    // no lights: wait at the junction while it is busy
    const box = ROAD_HALF + SW_W + 20;
    if (toEnd > box && toEnd < box + stop + 60)
      for (const o of cars) if (o !== c && o.driver && !o.dead && Math.abs(o.x - J.x) < box && Math.abs(o.y - J.y) < box && o.e !== c.e && carSpeed(o) > 5) { b = Math.min(b, toEnd - box + 48); break; }
    return b;
  }
  const st = sigAt(J, k).st, key = c.e * 2 + (c.fw > 0 ? 1 : 0), siren = isSiren(c) && feat('sirens');
  const roll = !siren && c.pullT > gameT && c.pullBy && dist(c.pullBy.x, c.pullBy.y, c.x, c.y) < 300;   // a siren behind it at the red light: roll over to make room
  if (toEnd > Ls + 300 || (c.amb === key && vf < 3 && toEnd > Ls)) c.amb = -1;   // went on at amber, but held up before the line after all: wait for green
  if (st !== 'g' && (siren || roll) && toEnd > -ROAD_HALF) {               // through the red light, slowly
    const v = c.driver === 'cop' ? STR.copRed : STR.sirenRed; _tr.cap = Math.sqrt(v * v + 2 * 90 * Math.max(0, toEnd - Ls));
  }
  if (past) return b;
  if (!siren && !roll) {
    if (st === 'r' && c.amb !== key) b = Math.min(b, dStop);
    else if (st === 'a' && c.amb !== key) { if (vf < 30 || stop + 12 < toEnd - Ls) b = Math.min(b, dStop); else c.amb = key; }   // amber: stop if there is room, else carry on
    if (st !== 'r' && farTurn(J, k, out) && oncoming(J, k)) b = Math.min(b, dStop);   // turning across: give way to oncoming cars
  }
  if (toEnd < Ls + stop + 80) {                                              // somebody still crossing from another way (late on amber, a siren, you): wait
    const box = ROAD_HALF + 24, g = J.arms[k].g;
    for (const o of cars) {
      if (o === c || o.dead || !o.driver) continue;
      const dx = o.x - J.x, dy = o.y - J.y; if (Math.abs(dx) > box || Math.abs(dy) > box || carSpeed(o) < 8) continue;
      if (o.driver !== 'player' && o.e >= 0) { const ka = armIdx(J, o.e); if (ka >= 0 && J.arms[ka].g === g) continue; }   // its own direction, or the one opposite
      if (o.vx * dx + o.vy * dy > 0 && dx * dx + dy * dy > (ROAD_HALF * 0.6) ** 2) continue;   // on its way out
      b = Math.min(b, dStop); break;
    }
  }
  return b;
}
function copCareful(c, vmax) {           // js/08b copDrive: a police car after you slows down at a junction where its light is not green
  if (!feat('trafficLights') || !feat('sirens')) return vmax;
  const spd = carSpeed(c), J = nearJunction(c.x, c.y, SW_OUT + 60 + spd * 0.9); if (!J || !J.sig) return vmax;
  const dx = c.x - J.x, dy = c.y - J.y, d = Math.hypot(dx, dy); if (d < 1 || c.vx * dx + c.vy * dy > 0) return vmax;   // going away from it
  let bk = 0, bq = -2; for (let k = 0; k < J.arms.length; k++) { const q = (dx * J.arms[k].ux + dy * J.arms[k].uy) / d; if (q > bq) { bq = q; bk = k; } }
  if (sigAt(J, bk).st === 'g') return vmax;
  return Math.min(vmax, Math.sqrt(STR.copRed * STR.copRed + 2 * 90 * Math.max(0, d - SW_OUT - 20)));
}

/* ---------- people at a junction: round the corners and over the zebras, on the walk signal ---------- */
function pedEnd(p) {                     // how far along its street a person follows the sidewalk: to just before the crossing at a junction
  const E = RE[p.e], ni = p.fw > 0 ? E.b : E.a;
  return JN[ni] ? Math.max(E.len - SW_OUT - 30, E.len * 0.55) : E.len;
}
const pedStart = (e, ni) => JN[ni] ? Math.min(SW_OUT + 30, RE[e].len * 0.45) : 0;
const kerbPt = (J, k, sg) => { const A = J.arms[k], o = ROAD_HALF + 5; return { x: J.x + A.ux * ZEBRA - sg * A.uy * o, y: J.y + A.uy * ZEBRA + sg * A.ux * o }; };   // sg 1: the kerb anticlockwise of the arm
function pedPlan(p) {                    // at the junction: the street to go on along, and the way there round the corners and over the crossings
  const E = RE[p.e], ni = p.fw > 0 ? E.b : E.a, J = JN[ni], n = J.arms.length, k = armIdx(J, p.e);
  if (k < 0) { pedNext(p); return; }
  const j = (k + 1 + Math.floor(Math.random() * (n - 1))) % n, ca = p.side > 0 ? (k - 1 + n) % n : k;   // ca: the corner it is at
  const route = sd => { const cb = sd > 0 ? j : (j - 1 + n) % n, ccw = (cb - ca + n) % n, cw = (ca - cb + n) % n; return { sd, dir: ccw < cw || (ccw === cw && Math.random() < 0.5) ? 1 : -1, steps: Math.min(ccw, cw) }; };
  const r1 = route(1), r2 = route(-1); let R = r1.steps < r2.steps ? r1 : r2.steps < r1.steps ? r2 : Math.random() < 0.5 ? r1 : r2;
  if (Math.random() < 0.15) R = R === r1 ? r2 : r1;                          // now and then the other side of the street
  const W = [{ x: J.corners[ca].x, y: J.corners[ca].y }]; let c0 = ca, first = -1, last = -1;
  for (let s = 0; s < R.steps; s++) {
    const X = R.dir > 0 ? (c0 + 1) % n : c0, c1 = (c0 + R.dir + n) % n, a = kerbPt(J, X, -R.dir), b = kerbPt(J, X, R.dir);
    a.cross = X; b.over = X; W.push(a, b, { x: J.corners[c1].x, y: J.corners[c1].y });
    if (first < 0) first = X; last = X; c0 = c1;
  }
  if (first === k) W.shift();                                                // straight over the street it came along
  if (last === j && W.length > 1) W.pop();                                   // ... or over the one it goes on along: no need for the corner
  p.jw = W; p.jn = { ni, e: J.arms[j].e, fw: RE[J.arms[j].e].a === ni ? 1 : -1, side: R.sd }; p.jt = 0; p.xing = null;
}
const _pm = { x: 0, y: 0, s: 0 };
function pedJunction(p, dt) {            // js/08 updatePeds: a step round the junction; _pm: which way and how fast
  _pm.x = _pm.y = _pm.s = 0;
  const J = JN[p.jn.ni]; p.jt += dt;
  while (p.jw.length) {
    const w = p.jw[0], dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
    if (w.cross !== undefined) {                                             // at the kerb: over on the walk signal
      if (d < 10 || p.jt > 20) {
        if (!walkOk(J, w.cross) && p.jt < 70) return _pm;
        p.jw.shift(); p.xing = { n: J.ni, e: J.arms[w.cross].e }; p.jt = 0; continue;
      }
    } else if (d < 9 || p.jt > 20) { if (w.over !== undefined) p.xing = null; p.jw.shift(); p.jt = 0; continue; }
    _pm.x = dx / d; _pm.y = dy / d; _pm.s = p.speed * (p.xing ? 1.25 : 1) * (1 + 0.3 * SKY.rain); return _pm;   // a little quicker over the road
  }
  const q = p.jn; p.e = q.e; p.fw = q.fw; p.side = q.side; p.s = pedStart(q.e, q.ni); p.jw = p.jn = p.xing = null;   // round: on along the next street
  if (Math.random() < 0.08) p.wait = rand(0.5, 2);
  return _pm;
}

/* ---------- the signal heads: a pole on the near right of every approach, an arm over the road, red, amber and green facing the
   traffic, and the walk lamp on the pole for the crossing. The lamps are one instanced mesh, recoloured when a light changes ---------- */
let SIGM = null; const SIGH = [];
const LAMP = { r: new THREE.Color('#ff2a4a'), a: new THREE.Color('#ffb21e'), g: new THREE.Color('#2dff9a'), r0: new THREE.Color('#2c0b13'), a0: new THREE.Color('#2c2108'), g0: new THREE.Color('#08291c') };
function drawSignals(fb, poles) {        // js/10 buildCity
  const items = [];
  for (const J of JN) {
    if (!J || !J.sig) continue;
    J.arms.forEach((A, k) => {
      if (A.nt) return;
      const F = RE[A.e], fromA = F.a === J.ni, c = edgeAt(A.e, fromA ? Math.min(F.len * 0.45, SW_OUT + 28) : Math.max(F.len * 0.55, F.len - SW_OUT - 28), {}), tx = fromA ? c.tx : -c.tx, ty = fromA ? c.ty : -c.ty;
      const rx = ty, ry = -tx, px = c.x + rx * (ROAD_HALF + 5), py = c.y + ry * (ROAD_HALF + 5), yaw = -Math.atan2(ry, rx), hx = px - rx * 32, hy = py - ry * 32;
      if (inLandmark(px, py) || shoreDist(px, py) < 10) return;
      poles.push({ x: px, y: 26, z: py, sx: 1.6, sy: 52, sz: 1.6, c: '#14102a' });
      fb.push({ x: px - rx * 17, y: 51, z: py - ry * 17, sx: 34, sy: 1.6, sz: 1.6, ry: yaw, c: '#14102a' }); fb.push({ x: hx, y: 45, z: hy, sx: 6, sy: 18, sz: 4.4, ry: yaw, c: '#14102a' });
      SIGH.push({ J, k, i: items.length, code: '' });
      for (const [y, col] of [[50.6, '#2c0b13'], [45, '#2c2108'], [39.4, '#08291c']]) items.push({ x: hx + tx * 2.3, y, z: hy + ty * 2.3, sx: 4.4, sy: 4.4, sz: 0.8, ry: yaw, c: col });
      items.push({ x: px, y: 22, z: py, sx: 3, sy: 4.4, sz: 3, ry: yaw, c: '#2c0b13' });   // the walk lamp
    });
  }
  SIGM = instanced(GB, new THREE.MeshBasicMaterial({ color: 0xffffff }), items);
}
function gfxSignals(time) {              // js/13: recolour the lamps whose light changed
  if (!SIGM) return;
  const on = feat('trafficLights'), blink = Math.floor(time * 1.6) % 2 === 0; let ch = false;
  for (const h of SIGH) {
    const code = on ? sigAt(h.J, h.k).st + (walkOk(h.J, h.k) ? 'w' : 'd') : blink ? 'x1' : 'x0';   // lights off: flashing amber
    if (code === h.code) continue; h.code = code; ch = true;
    const st = code[0];
    SIGM.setColorAt(h.i, st === 'r' ? LAMP.r : LAMP.r0); SIGM.setColorAt(h.i + 1, st === 'a' || code === 'x1' ? LAMP.a : LAMP.a0); SIGM.setColorAt(h.i + 2, st === 'g' ? LAMP.g : LAMP.g0);
    SIGM.setColorAt(h.i + 3, !on ? LAMP.r0 : code[1] === 'w' ? LAMP.g : LAMP.r);
  }
  if (ch) SIGM.instanceColor.needsUpdate = true;
}
