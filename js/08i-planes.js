'use strict';
/* ---------- 6c7. PLANES ----------
   (js/01j planes, js/01k) Airliners at the Skyport (js/10f). Three or four stand at the gates, and about once a minute one of them
   moves - one at a time, so they never meet: a plane comes in low over the water from the south, touches down, brakes, turns off at
   the middle link, taxis across the apron and noses into a free gate; or a parked one is pushed back, taxis to the south end, lines
   up and takes off to the north, climbing away over the city. A moving plane runs over whatever is in its way; a parked one is solid.
   Gunfire wears one down and a blast close by blows it up: a huge explosion, two more at the wing tanks, and a wreck that burns
   until it is cleared away - the gate is then free for a new plane. One hit in the air falls and blows up where it comes down (in
   the water it just sinks). With the feature off the planes only stand at their gates. */
let PLANES = [], planeNext = 0, planeLast = 'dep', planeBooms = [];
const PL_CIRC = [];                                                  // the plane as circles [x along the nose, z to the right, radius]
for (let x = -112; x <= 100; x += 26.5) PL_CIRC.push([x, 0, 13]);
for (const s of [-1, 1]) PL_CIRC.push([5, s * 28, 18], [5, s * 58, 16], [5, s * 86, 13], [-114, s * 22, 11]);
const PL_R = 135, PL_GONE = 520, PL_FADE = 330, PL_HIT_H = 120, PL_GROUND = 25;   // reach; heights where it is gone / starts to fade / can still be shot / still hits things
const PL_ACC = 1.2 * MPS, PL_DEC = 1.5 * MPS, PL_TURN = 2.2 * MPS, PL_ROT = 300;   // taxi acceleration and braking, sideways acceleration in turns, the rotation at take-off
function planeCircles(pl) {
  const ca = Math.cos(pl.ang), sa = Math.sin(pl.ang), out = pl.cc || (pl.cc = PL_CIRC.map(() => [0, 0, 0]));
  PL_CIRC.forEach(([lx, lz, r], k) => { const o = out[k]; o[0] = pl.x + ca * lx - sa * lz; o[1] = pl.y + sa * lx + ca * lz; o[2] = r; });
  return out;
}

/* ---------- routes: legs along polylines with rounded corners ---------- */
function plPath(pts, R) {                    // waypoints -> points with round corners (radius up to R); each point carries the speed allowed on the stretch that ends there
  const p = [[pts[0][0], pts[0][1], Infinity]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const u1x = (b[0] - a[0]) / l1, u1y = (b[1] - a[1]) / l1, u2x = (c[0] - b[0]) / l2, u2y = (c[1] - b[1]) / l2, th = Math.acos(clamp(u1x * u2x + u1y * u2y, -1, 1));
    if (th < 0.02) { p.push([b[0], b[1], Infinity]); continue; }
    let r = R, t = r * Math.tan(th / 2); const tm = 0.48 * Math.min(l1, l2); if (t > tm) { t = tm; r = t / Math.tan(th / 2); }
    const sg = Math.sign(u1x * u2y - u1y * u2x), px = b[0] - u1x * t, py = b[1] - u1y * t, cx = px - u1y * sg * r, cy = py + u1x * sg * r;
    const a0 = Math.atan2(py - cy, px - cx), n = Math.max(2, Math.ceil(th * r / 12)), lim = Math.sqrt(PL_TURN * r);
    for (let k = 0; k <= n; k++) { const an = a0 + sg * th * k / n; p.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r, k ? lim : Infinity]); }
  }
  const e = pts[pts.length - 1]; p.push([e[0], e[1], Infinity]);
  const cum = [0]; for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  return { p, cum, len: cum[cum.length - 1] };
}
function leg(kind, pts, R, o) {              // one stretch of a movement; cap: the highest speed at each point that still brakes in time for what comes
  const L = Object.assign({ kind, path: plPath(pts, R), vmax: AIRP.taxi, acc: PL_ACC, dec: PL_DEC, endV: 0, wait: 0, back: false }, o);
  const { p, cum } = L.path, n = p.length, cap = L.cap = new Float64Array(n); cap[n - 1] = L.endV;
  for (let k = n - 2; k >= 0; k--) cap[k] = Math.min(p[k][2], p[k + 1][2], Math.sqrt(cap[k + 1] * cap[k + 1] + 2 * L.dec * (cum[k + 1] - cum[k])));
  return L;
}
const _lg = {};
function legAt(L, s) {                       // where on the leg arc length s is, which way it runs there, and how fast it may go
  const { p, cum, len } = L.path; s = clamp(s, 0, len); let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  _lg.x = a[0] + (b[0] - a[0]) * f; _lg.y = a[1] + (b[1] - a[1]) * f; _lg.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  _lg.cap = Math.min(b[2], Math.sqrt(L.cap[hi] * L.cap[hi] + 2 * L.dec * (cum[hi] - s))); return _lg;
}
function arrivalLegs(si) {                   // in over the water, touchdown, braking, off at the middle link, across the apron into gate si
  const A = AIRF, RX = A.runway.x, st = A.stands[si], ex = A.links[1], tan = Math.tan(AIRP.climb);
  const td = Math.min(A.runway.y1 - 150, ex + 340 + AIRP.landRoll), vEnd = Math.min(AIRP.taxi, Math.sqrt(PL_TURN * 160)), vL = AIRP.vLand;
  const inPts = Math.abs(st.y - ex) < 40 ? [[RX, ex + 340], [RX, ex], [st.x - 220, ex], [st.x, st.y]] : [[RX, ex + 340], [RX, ex], [A.lane, ex], [A.lane, st.y], [st.x, st.y]];
  return [leg('approach', [[RX, td + PL_GONE / tan], [RX, td]], 0, { vmax: vL, acc: 1e9, dec: 1e9, endV: vL, v0: vL }),
          leg('roll', [[RX, td], [RX, ex + 340]], 0, { vmax: vL, endV: vEnd, dec: Math.max(PL_DEC, (vL * vL - vEnd * vEnd) / (2 * Math.max(50, td - ex - 340))) }),
          leg('taxi', inPts, 160, {})];
}
function departureLegs(si) {                 // pushed back out of gate si, along the apron, down the taxiway to the south end, the take-off run to the north
  const A = AIRF, RX = A.runway.x, st = A.stands[si], lane = A.lane, TX = A.twx, out = A.apron[3] - 110, Ls = A.links[2], top = st.y - 180;
  return [leg('push', [[st.x, st.y], [lane, st.y], [lane, top]], 150, { back: true, vmax: AIRP.taxi * 0.3, acc: 0.4 * MPS, dec: 0.5 * MPS, wait: 3 }),
          leg('taxi', [[lane, top], [lane, out], [TX, out], [TX, Ls], [RX, Ls], [RX, Ls - 320]], 150, { wait: 2 }),
          leg('take', [[RX, Ls - 320], [RX, Ls - 320 - 60000]], 0, { vmax: AIRP.vTake * 1.4, acc: AIRP.vTake * AIRP.vTake / (2 * AIRP.takeRun), endV: 1e9, wait: 2.5 })];
}

/* ---------- the planes ---------- */
function newPlane(x, y, ang, si) {
  const pl = { x, y, ang, h: 0, pitch: 0, roll: 0, v: 0, hp: AIRP.hp, stand: si, mode: 'parked', legs: null, li: 0, s: 0, wait: 0, lift: null, dead: false, burnT: 0, alpha: 1, mesh: null, shadow: null };
  planeMesh(pl); PLANES.push(pl); return pl;
}
function dropPlane(pl) {
  for (const o of [pl.mesh, pl.shadow]) if (o) { scene.remove(o); o.traverse(m => { if (m.geometry && m.geometry !== GB && m.geometry !== PL_SHADOW) m.geometry.dispose(); }); }
  for (const m of (pl.mesh && pl.mesh.userData.own) || []) m.dispose();
  if (pl.shadow) pl.shadow.material.dispose();
  const i = PLANES.indexOf(pl); if (i >= 0) PLANES.splice(i, 1);
}
function resetPlanes() {                     // a new game: three or four at the gates, the first movement soon
  for (const pl of PLANES.slice()) dropPlane(pl); PLANES = []; planeBooms = [];
  if (!AIRF) return;
  const n = Math.min(AIRF.stands.length, randi(Math.min(AIRP.gatesMin, AIRP.gatesMax), Math.max(AIRP.gatesMin, AIRP.gatesMax))), free = AIRF.stands.map((s, i) => i);
  for (let k = 0; k < n; k++) { const si = free.splice(randi(0, free.length - 1), 1)[0], st = AIRF.stands[si]; newPlane(st.x, st.y, st.a * Math.PI / 180, si); }
  planeNext = gameT + Math.min(12, AIRP.every * 0.25); planeLast = Math.random() < 0.5 ? 'arr' : 'dep';
}
function startMovement() {                   // one movement a minute: a landing while few stand at the gates, a take-off while many do, otherwise in turn
  const parked = PLANES.filter(pl => pl.mode === 'parked'), free = AIRF.stands.map((s, i) => i).filter(i => !PLANES.some(pl => pl.stand === i));
  let kind = parked.length < AIRP.gatesMin ? 'arr' : parked.length > AIRP.gatesMax ? 'dep' : planeLast === 'arr' ? 'dep' : 'arr';
  if (kind === 'arr' && !free.length) kind = 'dep'; if (kind === 'dep' && !parked.length) kind = 'arr';
  if (kind === 'arr' && !free.length) { planeNext = gameT + 5; return; }
  let pl;
  if (kind === 'arr') { const si = pick(free); pl = newPlane(0, 0, -Math.PI / 2, si); pl.legs = arrivalLegs(si); }
  else { pl = pick(parked); pl.legs = departureLegs(pl.stand); }
  pl.mode = 'move'; pl.li = 0; pl.s = 0; pl.lift = null; startLeg(pl);
  planeLast = kind; planeNext = gameT + AIRP.every;
}
function startLeg(pl) {
  const L = pl.legs[pl.li]; pl.s = 0; pl.wait = L.wait; if (L.v0 !== undefined) pl.v = L.v0;
  if (L.kind === 'push') pl.stand = -1;                              // off the gate: a new plane may take it
  if (L.kind === 'take') planeRoar(pl, 7, 220, 1300, 0.45);
  if (L.kind === 'roll') { planeRoar(pl, 0.5, 2400, 900, 0.3); planeRoar(pl, 3.5, 700, 200, 0.35); for (const s of [-1, 1]) for (let k = 0; k < 6; k++) smokeFx(pl.x + s * 18, pl.y + rand(-10, 10)); }   // the tyres touch, reverse thrust
  const q = legAt(L, 0); pl.x = q.x; pl.y = q.y; if (L.kind !== 'push' || pl.li > 0) pl.ang = L.back ? q.ang + Math.PI : q.ang;
}
function planeRoar(pl, dur, f0, f1, vol) { const v = 1 - dist(pl.x, pl.y, cam.x, cam.y) / 2200; if (v > 0) Snd.burst(dur, f0, f1, vol * v, 'bandpass'); }
function movePlane(pl, dt) {                 // along its legs: speed, place, heading, height and pitch
  const L = pl.legs[pl.li];
  if (pl.wait > 0) { pl.wait -= dt; return; }
  let q = legAt(L, pl.s); const vt = Math.min(L.vmax, Math.max(L.endV > 0 ? 0 : 6, q.cap));
  pl.v = pl.v < vt ? Math.min(vt, pl.v + L.acc * dt) : Math.max(vt, pl.v - L.dec * dt);
  pl.s = Math.min(L.path.len, pl.s + pl.v * dt); q = legAt(L, pl.s);
  pl.x = q.x; pl.y = q.y; const ta = L.back ? q.ang + Math.PI : q.ang; pl.ang += angDiff(pl.ang, ta) * Math.min(1, dt * 10);
  const tan = Math.tan(AIRP.climb);
  if (L.kind === 'approach') { pl.h = (L.path.len - pl.s) * tan; pl.pitch = 0.06; }
  else if (L.kind === 'roll') { pl.h = 0; pl.pitch = 0.06 * Math.max(0, 1 - pl.s / 260); }
  else if (L.kind === 'take') {
    if (pl.lift === null && pl.v >= AIRP.vTake) pl.lift = pl.s;
    const d = pl.lift === null ? 0 : pl.s - pl.lift; pl.h = d < PL_ROT ? tan * d * d / (2 * PL_ROT) : tan * (d - PL_ROT / 2);
    pl.pitch = (AIRP.climb + 0.05) * Math.min(1, d / PL_ROT);
    if (pl.h >= PL_GONE) { dropPlane(pl); return; }                  // gone over the city
  } else { pl.h = 0; pl.pitch = 0; }
  if (pl.s >= L.path.len - 0.5) {
    if (++pl.li < pl.legs.length) startLeg(pl);
    else { const st = AIRF.stands[pl.stand]; pl.mode = 'parked'; pl.legs = null; pl.v = 0; pl.x = st.x; pl.y = st.y; pl.ang = st.a * Math.PI / 180; }   // at the gate
  }
}
function updatePlanes(dt) {                  // js/15, in the physics steps: movement, and what the planes run into
  if (!AIRF) return;
  for (const pl of PLANES.slice()) {
    if (pl.mode === 'move') movePlane(pl, dt);
    else if (pl.mode === 'fall') fallPlane(pl, dt);
    if (PLANES.includes(pl) && pl.h < PL_GROUND && pl.mode !== 'sunk') planeContacts(pl);
  }
}
function planesTick(dt) {                    // js/15, once a frame: the delayed booms, burning wrecks, the next movement
  if (!AIRF) return;
  for (let i = planeBooms.length - 1; i >= 0; i--) { const b = planeBooms[i]; if (gameT < b.t) continue; planeBooms.splice(i, 1); if (b.pl) crashPlane(b.pl); else { explosion(b.x, b.y, b.R, b.src, 1); alertPeds(b.x, b.y, 500); } }
  for (const pl of PLANES.slice()) {
    if (pl.mode === 'sunk') { pl.burnT -= dt; pl.h -= 6 * dt; if (pl.burnT <= 0) dropPlane(pl); continue; }
    if (pl.mode !== 'wreck') continue;
    pl.burnT -= dt; if (pl.burnT <= 0) { dropPlane(pl); continue; }   // cleared away; its gate is free again
    if (dist(pl.x, pl.y, cam.x, cam.y) < 1600) {
      const cc = planeCircles(pl), f = Math.min(1, pl.burnT / 8);
      for (let k = 0; k < 2; k++) if (Math.random() < f) { const c = pick(cc); fireFx(c[0] + rand(-6, 6), c[1] + rand(-6, 6)); }
      if (Math.random() < 0.5) { const c = pick(cc); smokeFx(c[0], c[1], true); }
    }
  }
  if (!feat('planes') || gameT < planeNext || PLANES.some(pl => pl.mode === 'move' || pl.mode === 'fall' || (pl.mode === 'wreck' && pl.stand < 0))) return;   // a wreck out on the field: nothing moves until it is cleared
  startMovement();
}

/* ---------- what they run into ---------- */
function planeContacts(pl) {                 // a moving plane runs over people and wrecks cars; a parked one (or a wreck) is solid
  const deadly = pl.mode === 'move' && pl.v > AIRP.deadly && pl.wait <= 0, cc = planeCircles(pl);
  const sg = pl.legs && pl.legs[pl.li] && pl.legs[pl.li].back ? -1 : 1, pvx = deadly ? Math.cos(pl.ang) * pl.v * sg : 0, pvy = deadly ? Math.sin(pl.ang) * pl.v * sg : 0;
  for (const c of cars) {
    if (c.sunk || Math.abs(c.x - pl.x) > PL_R + c.t.len / 2 || Math.abs(c.y - pl.y) > PL_R + c.t.len / 2) continue;
    let nx = 0, ny = 0, pen = 0;
    for (const q of carCircles(c)) for (const k of cc) { const dx = q[0] - k[0], dy = q[1] - k[1], d = Math.hypot(dx, dy); if (d < q[2] + k[2] && d > 0.001) { nx += dx / d; ny += dy / d; pen = Math.max(pen, q[2] + k[2] - d); } }
    if (!pen) continue;
    const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m; c.x += nx * pen; c.y += ny * pen;
    const rv = (c.vx - pvx) * nx + (c.vy - pvy) * ny;
    if (rv < 0) { c.vx -= 1.3 * rv * nx; c.vy -= 1.3 * rv * ny; c.av += rand(-2, 2) * (deadly ? 1 : 0.2); }
    if (c.hitCd > 0) continue;
    if (deadly) {                                                    // run over: a wreck, flung off to the side of the plane's way
      const ca = Math.cos(pl.ang), sa = Math.sin(pl.ang), side = Math.sign((c.x - pl.x) * -sa + (c.y - pl.y) * ca) || 1;
      c.vx += -sa * side * 160 + pvx * 0.4; c.vy += ca * side * 160 + pvy * 0.4; c.av += side * rand(2, 4);
      c.hitCd = 0.4; damageCar(c, c.hp + 50, false); spark(c.x - nx * 12, c.y - ny * 12, 10); thudNear(c.x, c.y, 260); if (P.car === c) cam.shake = Math.max(cam.shake, 12);
    }
    else if (-rv > 70) { c.hitCd = 0.2; damageCar(c, (-rv - 70) * 0.14, false); damagePlane(pl, (-rv - 70) * 0.3, c.driver === 'player'); spark(c.x - nx * 12, c.y - ny * 12, 6); if (c.driver === 'player') { cam.shake = Math.max(cam.shake, Math.min(12, -rv * 0.03)); Snd.thud(-rv); } }
  }
  const people = (list, r, hit) => { for (const p of list) {
    if (p.dead || Math.abs(p.x - pl.x) > PL_R || Math.abs(p.y - pl.y) > PL_R) continue;
    for (const k of cc) { const dx = p.x - k[0], dy = p.y - k[1], d = Math.hypot(dx, dy); if (d < k[2] + r) { if (deadly) { hit(p); break; } const e = (k[2] + r - d) / Math.max(d, 0.001); p.x += dx * e; p.y += dy * e; } }
  } };
  people(peds, 7, p => killPed(p, 'plane', false, pl.ang)); people(officers, 7, o => killOfficer(o, false, 'plane', pl.ang));
  if (!P.car && !P.dead && state === 'play') people([P], 7, () => { bloodMark(P.x, P.y, rand(9, 13), 50); $('wasted').textContent = 'WASTED'; killPlayer(); });
}
function thudNear(x, y, v) { if (dist(x, y, cam.x, cam.y) < 900) Snd.thud(v); }

/* ---------- damage, explosions, wrecks ---------- */
function damagePlane(pl, d, byPlayer) {
  if (pl.dead || !(d > 0) || pl.mode === 'sunk') return;
  pl.hp -= d; if (byPlayer) pl.byPlayer = true;
  if (pl.hp <= 0) destroyPlane(pl);
}
function destroyPlane(pl, delay) {           // hp gone or a blast at the tanks: on the ground it blows up (now or in a moment), in the air it falls first
  if (pl.dead) return; pl.dead = true; pl.hp = 0;
  if (pl.byPlayer) reportCrime(AIRP.heat, COP.blastHear, pl.x, pl.y, true);
  if (pl.legs) pl.stand = -1;                                       // it never got to its gate (or has left it)
  if (pl.h > PL_GROUND) { pl.mode = 'fall'; pl.vz = 0; pl.legs = null; return; }
  if (delay) planeBooms.push({ t: gameT + delay, pl }); else crashPlane(pl);
}
function fallPlane(pl, dt) {                 // shot down: it glides on, nose dropping, trailing smoke, and blows up where it comes down
  pl.vz += 0.6 * G_ACC * dt; pl.h -= pl.vz * dt; pl.v *= Math.exp(-0.15 * dt);
  pl.x += Math.cos(pl.ang) * pl.v * dt; pl.y += Math.sin(pl.ang) * pl.v * dt; pl.pitch = Math.max(-0.45, pl.pitch - 0.5 * dt); pl.roll += 0.7 * dt;
  addP({ x: pl.x + rand(-8, 8), y: pl.y + rand(-8, 8), z: pl.h + 20, vz: rand(5, 20), grav: 0, vx: rand(-14, 14), vy: rand(-14, 14), life: rand(1, 1.8), max: 1.8, s0: 8, s1: 26, col: '#22232b', drag: 1, alpha: 0.6 });
  if (Math.random() < 0.5) addP({ x: pl.x, y: pl.y, z: pl.h + 18, vz: 0, grav: 0, vx: 0, vy: 0, life: 0.3, max: 0.3, s0: 12, s1: 3, col: pick(['#ff9d2b', '#ffd23f', '#ff5a1f']), drag: 0, alpha: 0.9 });
  if (pl.h <= 0) { pl.h = 0; crashPlane(pl); }
}
function crashPlane(pl) {                    // the big explosion, two more at the wing tanks, then a burning wreck (or a splash and gone, in the water)
  if (pl.mode === 'wreck' || pl.mode === 'sunk') return;
  pl.v = 0; pl.h = 0; pl.legs = null; pl.dead = true;
  if (inWater(pl.x, pl.y)) { pl.mode = 'sunk'; pl.burnT = 3; splashFx(pl.x, pl.y, 70); cam.shake = Math.max(cam.shake, 8 * (1 - Math.min(1, dist(pl.x, pl.y, cam.x, cam.y) / 1200))); Snd.boom(); return; }
  pl.mode = 'wreck'; pl.burnT = AIRP.burn; pl.roll = rand(-0.08, 0.08); pl.pitch = rand(-0.04, 0.02);
  const src = { byPlayer: !!pl.byPlayer, plane: pl }, ca = Math.cos(pl.ang), sa = Math.sin(pl.ang);
  explosion(pl.x, pl.y, AIRP.boom, src, 1); alertPeds(pl.x, pl.y, 700);
  for (const [s, t] of [[-1, 0.35], [1, 0.7]]) planeBooms.push({ t: gameT + t, x: pl.x + ca * 5 - sa * s * 60, y: pl.y + sa * 5 + ca * s * 60, R: AIRP.boom * 0.55, src });
  if (pl.mesh) { pl.mesh.material = wreckMats(); for (const k of ['navR', 'navG', 'beacon', 'strobe']) if (pl[k]) pl[k].visible = false; }
}
function blastPlanes(x, y, R, src) {         // js/06 explosion(): a blast at a plane's tanks blows it up, one further off damages it
  for (const pl of PLANES) {
    if (pl.dead || pl.h > PL_HIT_H || (src && src.plane === pl) || Math.abs(pl.x - x) > R + PL_R || Math.abs(pl.y - y) > R + PL_R) continue;
    let d = 1e9; for (const k of planeCircles(pl)) d = Math.min(d, Math.hypot(k[0] - x, k[1] - y) - k[2]); d = Math.max(0, d);
    if (d >= R) continue;
    if (src && src.byPlayer) pl.byPlayer = true;
    if (d >= AIRP.blastKill) pl.hp -= AIRP.hp * 0.6 * (1 - d / R);
    if (d < AIRP.blastKill || pl.hp <= 0) destroyPlane(pl, rand(0.12, 0.35));            // a moment later: one blast sets off the next
  }
}
function planeRay(ox, oy, dx, dy, range) {   // js/06 bullets: the nearest plane low enough to be hit along the ray, { t, pl } or null
  let best = null;
  for (const pl of PLANES) {
    if (pl.h > PL_HIT_H || pl.mode === 'sunk' || Math.abs(pl.x - ox) > range + PL_R || Math.abs(pl.y - oy) > range + PL_R) continue;
    for (const k of planeCircles(pl)) { const t = rayCircle(ox, oy, dx, dy, k[0], k[1], k[2]); if (t < range && (!best || t < best.t)) best = { t, pl }; }
  }
  return best;
}
function planeAt(x, y) {                     // js/12b rockets: is a plane (low enough) right here?
  for (const pl of PLANES) {
    if (pl.h > 40 || pl.mode === 'sunk' || Math.abs(pl.x - x) > PL_R || Math.abs(pl.y - y) > PL_R) continue;
    for (const k of planeCircles(pl)) if (Math.hypot(x - k[0], y - k[1]) < k[2]) return pl;
  }
  return null;
}

/* ---------- drawing ---------- */
let PL_SHADOW = null, PL_LIGHTS = null, PL_WRECK = null;
function wreckMats() { return PL_WRECK || (PL_WRECK = [xray(new THREE.MeshLambertMaterial({ color: 0x1c1a20 })), xray(new THREE.MeshBasicMaterial({ color: 0x4a1c0c }))]); }
function planeMesh(pl) {
  if (!PL_SHADOW) {                                                   // the shadow: fuselage, wings and tail as one flat shape
    const T = new Tris(), k = new THREE.Color(0);
    const r = (x0, z0, x1, z1) => T.quad([x0, z0], [x1, z0], [x1, z1], [x0, z1], 0, k);
    r(-126, -12, 112, 12); r(-20, -100, 30, 100); r(-126, -36, -104, 36);
    PL_SHADOW = new THREE.BufferGeometry(); PL_SHADOW.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3));
    PL_LIGHTS = { r: mBas(0xff3b5c), g: mBas(0x3dffa6), w: mBas(0xffffff) };
  }
  const m = makePlane(); m.material = [xray(new THREE.MeshLambertMaterial({ vertexColors: true })), xray(new THREE.MeshBasicMaterial({ vertexColors: true }))]; m.userData.own.push(...m.material);
  const lt = (mat, x, y, z, s) => { const b = new THREE.Mesh(GB, mat); b.scale.set(s, s, s); b.position.set(x, y, z); m.add(b); return b; };
  pl.navR = lt(PL_LIGHTS.r, 6, 23, -101, 3); pl.navG = lt(PL_LIGHTS.g, 6, 23, 101, 3); pl.beacon = lt(PL_LIGHTS.r, -10, 39.5, 0, 3.4); pl.strobe = lt(PL_LIGHTS.w, -128, 42, 0, 3);
  m.rotation.order = 'YZX'; scene.add(m); pl.mesh = m;
  pl.shadow = new THREE.Mesh(PL_SHADOW, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })); scene.add(pl.shadow);
}
function gfxPlanes(time) {                   // js/13
  for (const pl of PLANES) {
    const m = pl.mesh; if (!m) continue;
    m.position.set(pl.x, pl.h + (pl.mode === 'wreck' ? -7 : 0), pl.y); m.rotation.set(pl.roll, -pl.ang, pl.pitch);
    const a = pl.h > PL_FADE ? clamp(1 - (pl.h - PL_FADE) / (PL_GONE - PL_FADE), 0, 1) : 1, tr = a < 0.99;
    if (pl.mode !== 'wreck') for (const mt of m.material) { mt.opacity = a; if (mt.transparent !== tr) { mt.transparent = tr; mt.needsUpdate = true; } }
    if (pl.mode !== 'wreck') { const blink = (time + pl.x * 0.001) % 1.2; pl.beacon.visible = blink < 0.12; pl.strobe.visible = blink > 0.5 && blink < 0.56; }
    const sh = pl.shadow, o = pl.h + 26; sh.visible = pl.mode !== 'sunk'; sh.position.set(pl.x + o * 0.38, 1.0, pl.y + o * 0.5); sh.rotation.y = -pl.ang; sh.material.opacity = 0.28 * a * (pl.mode === 'wreck' ? 0.5 : 1);
  }
}
function planeIcons(g, X, Y, k, inView) {    // js/14: white planes on the maps (k: map pixels per world unit)
  g.fillStyle = '#ffffff'; g.strokeStyle = '#0b0614'; g.lineWidth = 1;
  for (const pl of PLANES) {
    if (pl.mode === 'sunk' || pl.mode === 'wreck' && !pl.burnT) continue;
    const x = X(pl.x), y = Y(pl.y); if (!inView(x, y)) continue;
    const s = Math.max(5, 120 * k); g.save(); g.translate(x, y); g.rotate(pl.ang); g.globalAlpha = pl.mode === 'wreck' ? 0.45 : 1;
    g.beginPath(); g.moveTo(s, 0); g.lineTo(-s, -0.2 * s); g.lineTo(-s, 0.2 * s); g.closePath(); g.fill();
    g.fillRect(-0.15 * s, -0.8 * s, 0.35 * s, 1.6 * s); g.fillRect(-s, -0.35 * s, 0.2 * s, 0.7 * s); g.restore();
  }
}
