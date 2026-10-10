'use strict';
/* ---------- 6c8. RACES ----------
   Street races, the NASCAR race and the drag strip (the numbers: js/01p; the speedway and the strip: js/10i).
   STREET RACES: now and then one of the phone booths near you rings (on the maps while it rings). On foot at the booth, ANSWER (or E)
   to hear the race: a fixed one (double ring; one of the five routes, best times kept) or a random one (fast trill; a new route each
   time). ACCEPT pays the fee - never while you are wanted, on a job or a rampage - and you have a minute to stop at the start in a car of
   your choice (not a public service vehicle). The start counts down, then it is a sprint through the checkpoints, every one in order,
   against fast cars that do not wait for you. From the countdown to the results the doors and FIRE are locked. Prizes by place.
   NASCAR: at the race booth in the speedway's paddock you are put in a NASCAR special on the grid; the start counts down; laps of the
   oval against the others; afterwards you are back at the booth. A NASCAR special also stands in the paddock to take.
   DRAG STRIP: stop in the left staging lane in an allowed car; a rival in a fast car waits in the right one. The lights: three ambers,
   then green - go. An eighth of a mile; the win pays.
   After a race the results show for a while (or close them); your car is held still meanwhile.
   Rivals drive their own route at their own pace (no catch-up): the fastest the corners and their brakes allow, round slower cars. */
const RACE = { on: null, ring: null, nextRing: 0, offer: null, card: null, res: null, lockT: 0, best: {}, nascar: 0, lap: 0, drag: 0, wins: 0, dirty: false };
const RACE_YEL = '#ffd23f', RACE_CYAN = '#2bf3ff', RACE_GREEN = '#3dffa6', RACE_PINK = '#ff2bd6', RACE_ORANGE = '#ff7a3d';
const BOOTH_R = 30, START_R = 42, RDS = 16, STRIP_MR = 40;
let BOOTHS = [], ROUTES = [], raceGroup = null;
const DRAG = { rival: null, filled: false, mark: false, shown: false };
const PIT = { filled: false };
const isService = t => t.cop || !!t.job || !!t.weapon || t.body === 'bus';
const raceTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
const racePrizes = g => [RC[g + 'Prize1'], RC[g + 'Prize2'], RC[g + 'Prize3']];
const fitsRace = c => !!c && !c.dead && c.hp > 0 && !c.sunk && !isService(c.t);

/* ---------- roads: distances along streets open to traffic, and the shortest way as a line of points ---------- */
function openRoad(x, y, maxD) {          // the nearest point on a street open to traffic: { e, s, d }
  let best = null; for (const r of nearRoads(x, y, maxD)) if (!RE[r.e].nt && (!best || r.d < best.d)) best = r; return best;
}
function fieldNT(x, y) {                 // like js/04 roadFieldTo, but not along driveways: { F: distance from every node, t: the road point }
  const t = openRoad(x, y, 900); if (!t) return null;
  const F = new Float64Array(RN.length).fill(Infinity), done = new Uint8Array(RN.length), E = RE[t.e];
  F[E.a] = t.s; F[E.b] = Math.min(F[E.b], E.len - t.s);
  for (;;) {
    let u = -1, b = Infinity; for (let k = 0; k < RN.length; k++) if (!done[k] && F[k] < b) { b = F[k]; u = k; }
    if (u < 0) break; done[u] = 1;
    for (const ei of RN[u].e) { const G = RE[ei]; if (G.nt) continue; const v = G.a === u ? G.b : G.a, nd = b + G.len; if (nd < F[v]) F[v] = nd; }
  }
  return { F, t };
}
function edgePts(e, s0, s1, out) {       // the centre line of edge e from arc length s0 to s1 (either way), added to out
  const E = RE[e], seg = subPoly(E, Math.min(s0, s1), Math.max(s0, s1)); if (s1 < s0) seg.reverse();
  for (const p of seg) { const l = out[out.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 0.5) out.push([p[0], p[1]]); }
}
function roadPath(e0, s0, fw0, G, out) { // from (e0, s0), going fw0 (0: whichever way is shorter), the shortest way to G's point; no turning back
  const T = G.t, F = G.F, E0 = RE[e0];
  if (e0 === T.e && (fw0 === 0 || (fw0 > 0) === (T.s >= s0))) { edgePts(e0, s0, T.s, out); return out; }
  const fw = fw0 || (s0 + F[E0.a] <= E0.len - s0 + F[E0.b] ? -1 : 1);
  edgePts(e0, s0, fw > 0 ? E0.len : 0, out);
  let node = fw > 0 ? E0.b : E0.a, prev = e0;
  for (let guard = 0; guard < 400; guard++) {
    let best = -1, bc = Infinity, toT = false;
    for (const ei of RN[node].e) {
      const Q = RE[ei]; if (Q.nt || ei === prev) continue; const fromA = Q.a === node;
      if (ei === T.e) { const c = fromA ? T.s : Q.len - T.s; if (c < bc) { bc = c; best = ei; toT = true; } }
      const c = Q.len + F[fromA ? Q.b : Q.a]; if (c < bc) { bc = c; best = ei; toT = false; }
    }
    if (best < 0 || !isFinite(bc)) return null;
    const Q = RE[best], fromA = Q.a === node;
    if (toT) { edgePts(best, fromA ? 0 : Q.len, T.s, out); return out; }
    edgePts(best, fromA ? 0 : Q.len, fromA ? Q.len : 0, out); node = fromA ? Q.b : Q.a; prev = best;
  }
  return null;
}

/* ---------- a route: points every RDS along a line, with the way it heads, its bends, and the lanes a racer may use ---------- */
function makeRoute(pts, lanes, d0) {
  const xs = [pts[0][0]], ys = [pts[0][1]]; let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-6) continue;
    let t = RDS - acc; while (t <= L) { xs.push(x1 + (x2 - x1) * t / L); ys.push(y1 + (y2 - y1) * t / L); t += RDS; }
    acc = L - (t - RDS);
  }
  const n = xs.length, R = { n, x: Float32Array.from(xs), y: Float32Array.from(ys), nx: new Float32Array(n), ny: new Float32Array(n), h: new Float32Array(n), kap: new Float32Array(n), lanes, d0: d0 || 0 };
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = R.x[b] - R.x[a], dy = R.y[b] - R.y[a], l = Math.hypot(dx, dy) || 1; R.nx[i] = -dy / l; R.ny[i] = dx / l; R.h[i] = Math.atan2(dy, dx); }
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3); R.kap[i] = b > a ? Math.abs(angDiff(R.h[a], R.h[b])) / ((b - a) * RDS) : 0; }
  return R;
}
const routeAt = (R, d) => clamp(Math.round((d - R.d0) / RDS), 0, R.n - 1);
function speedPlan(R, t, pace, grip) {   // the fastest a car may go at each point: its top speed, the corners, and braking for what comes
  const lat = ARCADE.lat * (0.6 + 0.4 * SKY.grip) * grip * pace, b = t.brake * ARCADE.brake * (0.55 + 0.45 * SKY.grip) * 0.6, top = t.max * pace, v = new Float32Array(R.n);
  for (let i = R.n - 1; i >= 0; i--) { const vc = Math.min(top, Math.sqrt(lat / Math.max(R.kap[i], 1e-5))); v[i] = i === R.n - 1 ? vc : Math.min(vc, Math.sqrt(v[i + 1] * v[i + 1] + 2 * b * RDS)); }
  return v;
}
function trackOn(K, x, y) {              // where along its route a car is now (K.i: the point, K.d: the distance), searched near where it was
  const R = K.R; let bi = K.i, bd = Infinity;
  const scan = (a, b) => { for (let j = Math.max(0, a); j <= Math.min(R.n - 1, b); j++) { const d = (R.x[j] - x) ** 2 + (R.y[j] - y) ** 2; if (d < bd) { bd = d; bi = j; } } };
  scan(K.i - 4, K.i + 14); if (bd > 160 * 160) scan(K.i - 40, K.i + 140);
  K.i = bi; const j = Math.min(R.n - 1, bi + 1), tx = R.x[j] - R.x[bi], ty = R.y[j] - R.y[bi], l = Math.hypot(tx, ty) || 1;
  K.d = R.d0 + bi * RDS + clamp(((x - R.x[bi]) * tx + (y - R.y[bi]) * ty) / l, -RDS / 2, RDS / 2); K.off = (x - R.x[bi]) * R.nx[bi] + (y - R.y[bi]) * R.ny[bi];
}

/* ---------- the fixed routes (js/01p) and the phone booths: once, on the first new game ---------- */
function buildFixed(r) {
  const pts = []; let at = null;
  for (let k = 0; k < r.via.length - 1; k++) {
    const G = fieldNT(r.via[k + 1][0], r.via[k + 1][1]); if (!G) return null;
    const from = at || openRoad(r.via[k][0], r.via[k][1], 300); if (!from) return null;
    if (!roadPath(from.e, from.s, 0, G, pts)) return null; at = { e: G.t.e, s: G.t.s };
  }
  return pts.length > 1 ? pts : null;
}
function freeAt(x, y, r) { nearBuildings(x, y, _nb); for (const rc of _nb) if (!rc.gate && circleSolid(x, y, r, rc)) return false; return true; }
function pickBooths() {
  const cand = [], away = [...(STORES || []), ...(CSHOPS || []), ...DISPATCH, ...RAMPAGES.filter(r => r.placed)];
  for (const E of RE) {
    if (E.nt || E.len < 260) continue;
    for (const fw of [1, -1]) {
      const s = E.len / 2, q = lanePoint(E.i, fw, s, ROAD_HALF + SW_W - 6, {}), st = lanePoint(E.i, fw, s, ROAD_HALF + 8, {});
      if (shoreDist(q.x, q.y) < 50 || inLandmark(q.x, q.y) || spwIn(q.x, q.y) || !freeAt(q.x, q.y, 2) || pedBlocked(st.x, st.y)) continue;
      const dn = districtAt(q.x, q.y); if (!dn || dn === 'OPEN WATER') continue;
      if (away.some(o => Math.abs(o.x - q.x) < 220 && Math.abs(o.y - q.y) < 220 && dist(o.x, o.y, q.x, q.y) < 180)) continue;
      cand.push({ x: q.x, y: q.y, ang: Math.atan2(q.ty, q.tx), e: E.i, fw, routes: [] });
    }
  }
  if (!cand.length) return [];
  const chosen = [];
  for (const r of ROUTES) {                                          // a booth near each fixed race's start
    let best = null, bd = Infinity;
    for (const c of cand) { const d = dist(c.x, c.y, r.R.x[0], r.R.y[0]); if (d > 250 && d < bd && !chosen.includes(c)) { bd = d; best = c; } }
    if (best && chosen.length < RC.booths) { best.routes.push(r); chosen.push(best); }
  }
  if (!chosen.length) { let f = cand[0]; for (const c of cand) if (dist(c.x, c.y, MAP.start[0], MAP.start[1]) < dist(f.x, f.y, MAP.start[0], MAP.start[1])) f = c; chosen.push(f); }
  while (chosen.length < RC.booths) {                                // the rest well spread
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.x, o.y, c.x, c.y))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 700) break; chosen.push(best);
  }
  for (const b of chosen) for (const r of b.routes) r.booth = b;
  return chosen;
}
function boothModel(b) {                 // a payphone booth: glass on three sides, open to the sidewalk, a lit band under the roof
  const g = new THREE.Group(); g.position.set(b.x, groundH(b.x, b.y), b.y); g.rotation.y = -b.ang;
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.38 });
  part(g, GB, mc('#2a2d3a'), 9, 1, 8, 0, 0.5, 0);
  for (const [x, z] of [[-4, -3.5], [4, -3.5], [-4, 3.5], [4, 3.5]]) part(g, GB, mc('#3a3f52'), 1, 24, 1, x, 12.5, z);
  part(g, GB, glass, 8, 17, 0.4, 0, 11, 3.5); part(g, GB, glass, 0.4, 17, 7, -4, 11, 0); part(g, GB, glass, 0.4, 17, 7, 4, 11, 0);
  part(g, GB, mc('#2a2d3a'), 10, 2, 9, 0, 25, 0);
  const band = part(g, GB, mBas(0x8a6a10), 10.2, 2.4, 9.2, 0, 22.6, 0);
  part(g, GB, mc('#c8ccd4'), 3, 4.5, 1.4, 0, 13, 2.6); part(g, GB, mc('#1a1c24'), 1.2, 3, 1.6, 1.8, 13, 2.4);   // the phone and its handset
  const halo = new THREE.Mesh(GP, glowMat('#ffd23f', 0.9)); halo.scale.set(70, 1, 70); halo.position.y = 1.2; halo.visible = false; g.add(halo);
  const ring = new THREE.Mesh(RAMP_RING, rampMat('#ffd23f', 0.9)); ring.scale.setScalar(BOOTH_R); ring.position.y = 1.5; ring.visible = false; g.add(ring);
  g.userData = { band, halo, ring }; return g;
}
function placeRaces() {                  // a new game (js/15): no race, no call; the first one builds the routes, the booths and their models
  raceAbort(true); RACE.ring = null; RACE.offer = null; RACE.card = null; DRAG.rival = null; DRAG.filled = false; DRAG.mark = false; DRAG.shown = false; PIT.filled = false;
  closeRaceRes(true); $('raceHud').hidden = true; $('raceCount').className = ''; if (typeof treeLights === 'function') treeLights(-1);
  if (raceGroup) return;
  ROUTES = [];
  for (const r of RACE_ROUTES) { const pts = buildFixed(r); if (!pts) continue; const R = makeRoute(pts, [-22, 0, 22]); if (R.n * RDS < 900) continue; ROUTES.push({ id: r.id, name: r.name, R }); }
  BOOTHS = pickBooths();
  raceGroup = new THREE.Group(); scene.add(raceGroup);
  for (const b of BOOTHS) {
    makeSolid(b.x, b.y, 8, 7, b.ang, {});
    b.g = boothModel(b); raceGroup.add(b.g);
    const sign = signMesh('PHONE', '#ffd23f', 24, 8); sign.position.set(b.x, groundH(b.x, b.y) + 36, b.y); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180); sign.visible = false; raceGroup.add(sign); b.sign = sign;
  }
}

/* ---------- the phone: one booth near you rings now and then ---------- */
function ringTick(dt) {
  const rg = RACE.ring, busy = RACE.on || JOB.on || RAMP.on || P.stars > 0 || P.dead || P.busted || !feat('streetRaces');
  if (rg) {
    rg.t -= dt;
    if (rg.t <= 0 || busy) { RACE.ring = null; RACE.nextRing = gameT + RC.ringEvery * rand(0.7, 1.3); return; }
    ringSound(rg, dt); return;
  }
  if (busy || gameT < RACE.nextRing || !BOOTHS.length) return;
  const near = BOOTHS.filter(b => { const d = dist(b.x, b.y, P.x, P.y); return d > 80 && d < RC.ringNear; });
  if (!near.length) { RACE.nextRing = gameT + 5; return; }
  const b = pick(near), fixed = b.routes.length > 0 && Math.random() < RC.fixedShare;
  RACE.ring = { b, fixed, route: fixed ? pick(b.routes) : null, t: RC.ringFor, ph: 0 };
  toast('A PHONE IS RINGING NEARBY - ANSWER IT (ON THE MAP)');
}
function ringSound(rg, dt) {             // a fixed race: the double ring; a random one: a fast trill. Louder the closer you are
  const cyc = rg.fixed ? 3 : 2, ev = rg.fixed ? [0, 0.6] : [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56], a = rg.ph % cyc; rg.ph += dt; const b = rg.ph % cyc;
  const d = dist(rg.b.x, rg.b.y, P.x, P.y), v = 0.16 * Math.pow(clamp(1 - d / (RC.ringNear * 0.85), 0, 1), 1.6); if (v < 0.004) return;
  for (const o of ev) if ((a < o && o <= b) || (b < a && (o > a || o <= b))) {
    if (rg.fixed) { Snd.tone(440, 440, 0.4, v, 'sine'); Snd.tone(480, 480, 0.4, v * 0.8, 'sine'); }
    else Snd.tone(1250, 1250, 0.045, v * 0.8, 'square');
  }
}
function nearRaceSpot() {                // on foot at the ringing booth, or at the speedway's race booth: { kind, b }
  if (P.car || P.dead || P.act || state !== 'play' || RACE.on) return null;
  const rg = RACE.ring; if (rg && Math.abs(rg.b.x - P.x) < BOOTH_R && Math.abs(rg.b.y - P.y) < BOOTH_R && dist(rg.b.x, rg.b.y, P.x, P.y) < BOOTH_R) return { kind: 'phone', b: rg.b };
  if (SPW && feat('speedway')) { const [x, y] = SPW.booth; if (dist(x, y, P.x, P.y) < 36) return { kind: 'nascar' }; }
  return null;
}
function raceKey() { const r = nearRaceSpot(); if (!r) return null; const c = nearestCar(); const at = r.b || { x: SPW.booth[0], y: SPW.booth[1] }; return c && dist(c.x, c.y, P.x, P.y) < dist(at.x, at.y, P.x, P.y) - 8 ? null : r; }
function raceUi() {                      // every frame (js/14): ANSWER at the ringing booth, RACE at the speedway's booth
  const r = nearRaceSpot(), bt = $('raceBtn');
  if (!r) { if (!bt.hidden) bt.hidden = true; return; }
  const k = r.kind;
  if (bt.hidden || bt.dataset.k !== k) { bt.hidden = false; bt.dataset.k = k; bt.querySelector('b').textContent = k === 'phone' ? 'STREET RACE' : 'NASCAR RACE'; bt.querySelector('.go').textContent = k === 'phone' ? 'ANSWER' : 'RACE'; }
  doorBtnAt(bt);
}
$('raceBtn').addEventListener('click', e => { e.stopPropagation(); const r = nearRaceSpot(); if (r) openRaceCard(r); });

/* ---------- a random race: the start a short drive from the booth, the finish further on ---------- */
function randomRace(b) {
  const Fb = fieldNT(b.x, b.y); if (!Fb) return null;
  const lo = 150 * UNITS_PER_M, hi = 450 * UNITS_PER_M, starts = [];
  for (const E of RE) {
    if (E.nt || E.len < 400) continue;
    for (const fw of [1, -1]) {
      const sAbs = fw > 0 ? 300 : E.len - 300, d = Math.min(Fb.F[E.a] + sAbs, Fb.F[E.b] + E.len - sAbs), q = edgeAt(E.i, sAbs, {});
      if (d < lo || d > hi || shoreDist(q.x, q.y) < 60 || districtAt(q.x, q.y) === 'OPEN WATER' || spwIn(q.x, q.y)) continue;
      starts.push({ E, fw });
    }
  }
  for (let tr = 0; tr < 12 && starts.length; tr++) {
    const { E, fw } = starts.splice(Math.floor(Math.random() * starts.length), 1)[0], n1 = fw > 0 ? E.b : E.a, F1 = fieldNT(RN[n1].x, RN[n1].y); if (!F1) continue;
    const ends = [];
    for (const G of RE) {
      if (G.nt || G.len < 200 || G === E) continue;
      const s = G.len / 2, d = (E.len - 300) + Math.min(F1.F[G.a] + s, F1.F[G.b] + G.len - s), q = edgeAt(G.i, s, {});
      if (d >= RC.randomNear && d <= RC.randomFar && shoreDist(q.x, q.y) > 40 && districtAt(q.x, q.y) !== 'OPEN WATER') ends.push({ G, q });
    }
    if (!ends.length) continue;
    const f = pick(ends), Gf = fieldNT(f.q.x, f.q.y); if (!Gf) continue;
    const pts = []; edgePts(E.i, fw > 0 ? 40 : E.len - 40, fw > 0 ? E.len : 0, pts);
    if (!roadPath(E.i, fw > 0 ? E.len : 0, fw, Gf, pts)) continue;
    const R = makeRoute(pts, [-22, 0, 22]); if (R.n * RDS < 260 + RC.randomNear * 0.8) continue;
    return { id: 'random', name: 'STREET RACE', R };
  }
  return null;
}

/* ---------- the card: what the race is, ACCEPT pays the fee ---------- */
function streetLine(rt) {
  const R = rt.R, a = districtAt(R.x[routeAt(R, 260)], R.y[routeAt(R, 260)]) || 'TOWN', b = districtAt(R.x[R.n - 1], R.y[R.n - 1]) || 'TOWN', m = Math.round((R.n * RDS - 260) / UNITS_PER_M);
  return (a === b ? 'IN ' + a : a + ' TO ' + b) + '  ·  ' + m + ' M  ·  ' + RC.rivals + ' RIVALS';
}
function openRaceCard(r) {
  let o = null;
  if (r.kind === 'phone') {
    const rg = RACE.ring; if (!rg) return;
    if (!rg.offer) rg.offer = rg.fixed ? rg.route : randomRace(rg.b);
    if (!rg.offer) { toast('THE LINE IS DEAD', true); RACE.ring = null; RACE.nextRing = gameT + 20; return; }
    const rt = rg.offer, g = rt.id === 'random' ? 'random' : rt.id;
    o = { kind: 'street', rt, tag: 'STREET RACE', name: rt.name, sub: streetLine(rt), fee: RC[g + 'Fee'], prizes: racePrizes(g), best: rt.id !== 'random' ? RACE.best[rt.id] : 0,
      rules: 'You have ' + Math.round(RC.reachStart) + ' s to stop at the start in a car of your choice - not a public service vehicle. Pass every checkpoint in order. From the countdown on you cannot get out or use weapons. The fee is not given back.' };
  } else if (r.kind === 'nascar') {
    o = { kind: 'nascar', tag: 'NASCAR RACE', name: 'PALM 200', sub: RC.nascarLaps + ' LAPS  ·  ' + RC.nascarCars + ' CARS  ·  ' + Math.round(OV.L / UNITS_PER_M) + ' M A LAP', fee: RC.nascarFee, prizes: racePrizes('nascar'), best: RACE.nascar,
      rules: 'You are put in a NASCAR special on the grid; the start counts down ' + Math.round(RC.nascarCount) + ' s. You cannot get out or use weapons. Afterwards you are back here at the booth.' };
  } else {
    o = { kind: 'drag', tag: 'DRAG RACE', name: 'EIGHTH MILE', sub: '201 M  ·  ONE RIVAL', fee: RC.dragFee, prizes: [RC.dragPrize], best: RACE.drag,
      rules: 'Three amber lights, then green: go. Wait for the green. A win pays; after the line a parachute stops you. You cannot get out or use weapons.' };
  }
  RACE.card = o; state = 'race'; toggleBigMap(false); toggleWheel(false); hush(); $('raceBtn').hidden = true;
  const cash = P.score >= o.fee, why = P.stars > 0 ? 'LOSE THE POLICE FIRST' : JOB.on ? 'FINISH THE JOB FIRST' : RAMP.on ? 'FINISH THE RAMPAGE FIRST' : !cash ? 'NOT ENOUGH CASH' : '';
  $('raceTag').textContent = o.tag; $('raceName').textContent = o.name; $('raceSub').textContent = o.sub;
  $('raceFee').textContent = money(o.fee);
  $('racePrize').textContent = o.prizes.length > 1 ? o.prizes.map((p, i) => ordinal(i + 1) + ' ' + money(p)).join('  ') : money(o.prizes[0]) + ' FOR A WIN';
  $('raceBest').textContent = o.best ? (o.kind === 'drag' ? o.best.toFixed(3) + ' S' : raceTime(o.best)) : 'NONE YET';
  $('raceRules').textContent = o.rules; $('raceWarn').textContent = why; $('raceWarn').hidden = !why;
  $('raceGo').hidden = !!why; $('raceGo').textContent = 'ACCEPT · ' + money(o.fee); $('raceNo').classList.toggle('pri', !!why);
  showCard('raceCard', true);
}
function closeRaceCard() { if (state !== 'race') return; state = 'play'; closeMenus(); }
$('raceGo').addEventListener('click', () => {
  const o = RACE.card; closeRaceCard(); RACE.card = null;
  if (!o || RACE.on || P.stars > 0 || JOB.on || RAMP.on || P.score < o.fee || P.dead) return;
  if (o.kind === 'street') { if (!RACE.ring || nearRaceSpot() === null) return; streetAccept(o); }
  else if (o.kind === 'nascar') { if (!P.car && nearRaceSpot()) nascarStart(o); }
  else if (P.car && fitsRace(P.car)) dragStart(o);
});

/* ---------- racers ---------- */
function rivalType() {
  const pool = Object.keys(CAR_TYPES).filter(k => { const t = CAR_TYPES[k]; return !isService(t) && !t.armored && t.max >= 170 * KMH && t.traffic > 0 && !['bike', 'truck', 'limo', 'pickup', 'nascar'].includes(t.body); });
  return CAR_TYPES.sports && (Math.random() < 0.55 || !pool.length) ? 'sports' : pick(pool);
}
function clearSpot(x, y, r) {            // cars standing where racers go are taken away (never yours, never a racer)
  cars = cars.filter(o => o === P.car || o.keep || o.hook || o.race || Math.abs(o.x - x) > r + 40 || Math.abs(o.y - y) > r + 40 || dist(o.x, o.y, x, y) > r + o.t.len / 2);
}
function addRival(R, type, d, off, pace, grip, col) {
  const i = routeAt(R, d), c = makeCar(type, R.x[i] + R.nx[i] * off, R.y[i] + R.ny[i] * off, R.h[i], 'race', col);
  c.keep = true; c.searched = true; c.radio = -1;
  c.race = { R, i, d, off, lo: off, aim: off, base: off, go: false, done: false, out: false, time: 0, v: speedPlan(R, c.t, pace, grip), laneT: 0, block: 999, blockV: 0, stuck: 0, jam: 0, rev: 0, hold: false };
  cars.push(c); return c;
}
function pickLane(c, K, spd) {           // the lane to drive in: the racer's own, unless a slower car is in the way and another is clear
  const R = K.R, i = K.i, tx = Math.cos(R.h[i]), ty = Math.sin(R.h[i]), reach = 60 + spd * 1.3, myV = c.vx * tx + c.vy * ty;
  let best = K.lo, bc = Infinity, bBlock = 999, bV = 0;
  for (const off of R.lanes) {
    let block = 999, bv = 0;
    for (const o of cars) {
      if (o === c || Math.abs(o.x - c.x) > reach + 60 || Math.abs(o.y - c.y) > reach + 60) continue;
      const rx = o.x - c.x, ry = o.y - c.y, along = rx * tx + ry * ty; if (along < 4 || along > reach) continue;
      const lat = (o.x - R.x[i]) * R.nx[i] + (o.y - R.y[i]) * R.ny[i];
      if (Math.abs(lat - off) > (o.t.wid + c.t.wid) / 2 + 6) continue;
      const ov = o.dead ? 0 : o.vx * tx + o.vy * ty; if (ov > myV - 4 * KMH && !o.dead) continue;     // pulling away: not in the way
      if (along < block) { block = along; bv = Math.max(0, ov); }
    }
    const cost = Math.abs(off - K.base) * 0.4 + Math.abs(off - K.lo) * 0.3 + (block < 999 ? 300 + (reach - block) * 3 : 0);
    if (cost < bc) { bc = cost; best = off; bBlock = block; bV = bv; }
  }
  K.block = bBlock; K.blockV = bV; return best;
}
function raceDrive(c, dt) {              // js/07 updateCars: a racer - along its route as fast as the corners allow, round slower cars
  const K = c.race; if (!K) { c.thr = 0; c.str = 0; return; }
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), vf = c.vx * fx + c.vy * fy;
  if (!K.go || K.hold) {                                           // on the grid, or past the finish of a drag (a parachute)
    c.str = 0; c.thr = vf > 6 ? -1 : 0; c.hb = !K.go;
    const k = Math.exp(-(K.go ? 0.6 : 5) * dt); c.vx *= k; c.vy *= k; c.av *= k; return;
  }
  c.hb = false; trackOn(K, c.x, c.y);
  const spd = Math.max(0, vf), R = K.R;
  if ((K.laneT -= dt) <= 0) { K.laneT = 0.2; K.lo = pickLane(c, K, spd); }
  if (K.i >= R.n - 3) { K.hold = true; return; }                  // the end of its route: it stops
  K.aim += clamp(K.lo - K.aim, -70 * dt, 70 * dt);                   // over to the chosen lane, not in one jerk
  const j = Math.min(R.n - 1, K.i + Math.max(2, Math.round((26 + spd * 0.22) / RDS))), off = K.aim;
  const da = angDiff(c.ang, Math.atan2(R.y[j] + R.ny[j] * off - c.y, R.x[j] + R.nx[j] * off - c.x));
  c.str = clamp(da * 2.6, -1, 1);
  let tgt = K.v[Math.min(R.n - 1, K.i + 1)] * (1 - 0.5 * Math.min(1, Math.abs(da) / 1.2));
  if (K.block < 999) tgt = Math.min(tgt, K.blockV + Math.max(0, K.block - 34) * 1.6);
  if (K.rev > 0) { K.rev -= dt; c.thr = vf > -60 ? -1 : 0; c.str = -c.str; return; }
  c.thr = vf < tgt - 2 ? 1 : vf > tgt + 6 ? -clamp((vf - tgt) / 60, 0.3, 1) : 0;
  if (spd < 14) { K.stuck += dt; K.jam += dt; if (K.stuck > 2.2) { K.stuck = 0; K.rev = 0.8; } } else { K.stuck = 0; K.jam = 0; }
  if (K.jam > 7 && offScreen(c.x, c.y)) {                          // hopelessly stuck, out of sight: back on its line a little further on
    const i = Math.min(R.n - 2, K.i + 4); c.x = R.x[i]; c.y = R.y[i]; c.ang = R.h[i]; c.vx = c.vy = c.av = 0; K.i = i; K.jam = 0; K.aim = K.lo = 0;
  }
}
function toTraffic(c) {                  // a street racer done (or the race off): back to town traffic
  c._race = c.race; c.race = null; c.keep = false; c.hb = false; c.nx = null; c.e = -1; c.cruise = 0;
  c.driver = !c.dead && c.hp > 0 && !c.sunk ? 'ai' : null;
}

/* ---------- street races ---------- */
function gridSpot(R, row, side, base) { const i = routeAt(R, base - 30 - row * 75), off = side * 22; return { x: R.x[i] + R.nx[i] * off, y: R.y[i] + R.ny[i] * off, ang: R.h[i], i }; }
function checkpoints(R, i0) {            // at every bend of the route and at least every cpEvery; the last one is the finish
  const out = [], n = R.n, turn = i => { const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3); return Math.abs(angDiff(R.h[a], R.h[b])); };
  for (let i = i0 + 6; i < n - 8; i++) if (turn(i) > 0.6 && turn(i) >= turn(i - 1) && turn(i) >= turn(i + 1) && (!out.length || i - out[out.length - 1] > 120 / RDS)) out.push(i);
  out.push(n - 1);
  const step = Math.max(4, Math.floor(RC.cpEvery / RDS)), full = []; let last = i0;
  for (const i of out) { const gaps = Math.floor((i - last) / step); for (let k = 1; k <= gaps; k++) { const j = last + Math.round((i - last) * k / (gaps + 1)); if (i - j > 4) full.push(j); } full.push(i); last = i; }
  return full;
}
function streetAccept(o) {
  const rt = o.rt, R = rt.R, b = RACE.ring.b;
  P.score -= o.fee; RACE.ring = null; RACE.nextRing = gameT + RC.ringEvery * rand(0.7, 1.3);
  const base = Math.min(260, R.n * RDS * 0.3), slot0 = gridSpot(R, 0, 1, base), rivals = [];
  for (let k = 1; k <= RC.rivals; k++) { const g = gridSpot(R, Math.floor(k / 2), k % 2 ? -1 : 1, base); clearSpot(g.x, g.y, 30); }
  clearSpot(slot0.x, slot0.y, 30);
  for (let k = 1; k <= RC.rivals; k++) { const row = Math.floor(k / 2), side = k % 2 ? -1 : 1; rivals.push(addRival(R, rivalType(), base - 30 - row * 75, side * 22, RC.rivalPace, 0.75)); }
  const cps = checkpoints(R, routeAt(R, base));
  RACE.on = { kind: 'street', id: rt.id, name: rt.name, R, base, cps, cp: 0, rivals, phase: 'toStart', t: RC.reachStart, T: 0, slot: slot0, car: null, me: { R, i: slot0.i, d: base - 30 },
    fee: o.fee, prizes: o.prizes, crash: 0, hp: 0, crashCd: 0, top: 0, lateT: 30, beep: 0, booth: b };
  raceHudOn(); toast('GET TO THE START IN ' + Math.round(RC.reachStart) + ' S - ANY CAR BUT A PUBLIC SERVICE ONE'); Snd.tone(523, 784, 0.2, 0.14, 'square');
}
function streetTick(dt, Ro) {
  const c = P.car;
  if (Ro.phase === 'toStart') {
    Ro.t -= dt;
    if (Ro.t <= 0) { raceFail('YOU DID NOT MAKE THE START'); return; }
    if (c && fitsRace(c) && P.stars <= 0 && carSpeed(c) < 8 * KMH && dist(c.x, c.y, Ro.slot.x, Ro.slot.y) < START_R) {
      Ro.phase = 'count'; Ro.t = RC.countStreet; Ro.car = c; Ro.hp = c.hp; Ro.beep = Math.ceil(Ro.t) + 1; c.keep = true;
    }
    return;
  }
  runTick(dt, Ro);
}

/* ---------- the NASCAR race ---------- */
function nascarRoute() {
  const pts = [], q = {}, d0 = -520, d1 = (RC.nascarLaps + 1) * OV.L + 300;
  for (let u = d0; u <= d1; u += RDS) { ovalAt(u, 0, q); pts.push([q.x, q.y]); }
  const k = Math.max(8, OV.w / 2 - 25); return makeRoute(pts, [-k, 0, k], d0);   // lanes clear of both walls
}
function nascarStart(o) {
  P.score -= o.fee; RACE.ring = null;
  const R = nascarRoute(), n = Math.max(2, Math.round(RC.nascarCars)), me = Math.min(2, n - 1), rivals = [], q = {};
  cars = cars.filter(c => c.keep || c.hook || !spwIn(c.x, c.y) || Math.abs(ovalU(c.x, c.y).off) > OV.w / 2 + 14 || c === P.car);   // the track clear
  const cols = CAR_TYPES.nascar.colors, spot = k => { const row = Math.floor(k / 2), off = (k % 2 ? -1 : 1) * Math.max(8, OV.w / 2 - 25), d = -(34 + row * 80); ovalAt(d, off, q); return { d, off, x: q.x, y: q.y, ang: q.ang }; };
  for (let k = 0; k < n; k++) if (k !== me) { const s = spot(k); rivals.push(addRival(R, 'nascar', s.d, s.off, RC.nascarPace, 0.7, cols[k % cols.length])); }
  const s = spot(me), c = makeCar('nascar', s.x, s.y, s.ang, 'player', cols[me % cols.length]);
  c.searched = true; c.keep = true; c.radio = -1; c.mode = 'player'; cars.push(c);
  P.act = null; P.car = c; P.x = c.x; P.y = c.y; P.ang = c.ang; P.vx = P.vy = 0; P.gear = 'D'; P.carSwap = null; updateGearUi(); cam.x = c.x; cam.y = c.y;
  RACE.on = { kind: 'nascar', name: 'PALM 200', R, rivals, phase: 'count', t: RC.nascarCount, T: 0, car: c, me: { R, i: routeAt(R, s.d), d: s.d }, laps: Math.round(RC.nascarLaps), lap: 0, lapT: 0, bestLap: 0,
    fee: o.fee, prizes: o.prizes, crash: 0, hp: c.hp, crashCd: 0, top: 0, lateT: 30, beep: Math.ceil(RC.nascarCount) + 1 };
  raceHudOn(); toast('THE NASCAR RACE: ' + RC.nascarLaps + ' LAPS'); Snd.tone(523, 784, 0.2, 0.14, 'square');
}
function boothSpot() { const [x, y] = SPW.booth; for (const [dx, dy] of [[0, 28], [-30, 0], [30, 0], [0, -28]]) if (!pedBlocked(x + dx, y + dy)) return { x: x + dx, y: y + dy }; return { x, y: y + 28 }; }
function backToBooth(Ro) {               // after the NASCAR race: out of the car, back on foot at the booth; the race cars go
  const gone = new Set([Ro.car, ...Ro.rivals]);
  if (P.car && gone.has(P.car)) { P.car.driver = null; P.car = null; }
  cars = cars.filter(c => !gone.has(c));
  const s = boothSpot(); P.x = s.x; P.y = s.y; P.vx = P.vy = 0; P.ang = Math.PI / 2; cam.x = P.x; cam.y = P.y; P.act = null;
}

/* ---------- the drag strip ---------- */
const stripSpot = (lane, len) => { const S = SPW_STRIP; return { x: S.lanes[lane], y: S.stage - S.dir * (len / 2 + 3), ang: S.dir < 0 ? -Math.PI / 2 : Math.PI / 2 }; };
const stripAlong = (S, y) => (y - S.stage) * S.dir;              // how far past the staging line, the way the run goes
function dragTick() {                    // a rival waits in the right lane while you are about (put there out of sight)
  if (!SPW_STRIP || !feat('dragStrip') || RACE.on) return;
  const S = SPW_STRIP, mx = S.lanes[1], my = S.stage, d = dist(mx, my, P.x, P.y);
  if (DRAG.filled) { if (d > 2400) { DRAG.filled = false; if (DRAG.rival) DRAG.rival.keep = false; DRAG.rival = null; } return; }
  if (d > 1500 || d < offDist() + 100) return;
  const type = CAR_TYPES.sports ? 'sports' : rivalType(), p = stripSpot(1, CAR_TYPES[type].len);
  if (cars.some(c => dist(c.x, c.y, p.x, p.y) < 40)) return;
  const c = makeCar(type, p.x, p.y, p.ang, null); c.keep = true; c.searched = true; c.lot = SPW_STRIP; cars.push(c); DRAG.rival = c; DRAG.filled = true;
}
function dragMarkTick() {                // in an allowed car, stopped in the left staging lane: the card (once per stop)
  if (!SPW_STRIP || !feat('dragStrip') || RACE.on || state !== 'play') { DRAG.mark = false; return; }
  const c = P.car, S = SPW_STRIP, m = stripSpot(0, 50);
  const inMark = !!c && Math.abs(c.x - m.x) < STRIP_MR && Math.abs(c.y - m.y) < STRIP_MR + 10;
  if (inMark !== DRAG.mark) { DRAG.mark = inMark; DRAG.shown = false; }
  if (inMark && !DRAG.shown && carSpeed(c) < 8 * KMH) { DRAG.shown = true; if (isService(c.t)) toast('NO PUBLIC SERVICE VEHICLES ON THE STRIP', true); else openRaceCard({ kind: 'drag' }); }
}
function dragStart(o) {
  const c = P.car, S = SPW_STRIP; P.score -= o.fee;
  let r = DRAG.rival; if (!r || !cars.includes(r) || r.dead || r.hp <= 0 || r.driver || P.car === r) r = null;
  const type = r ? r.type : (CAR_TYPES.sports ? 'sports' : rivalType()), col = r ? r.color : undefined, q = stripSpot(1, CAR_TYPES[type].len);
  clearSpot(q.x, q.y, 20); if (r && !cars.includes(r)) r = null;
  const pts = [[S.lanes[1], S.stage - S.dir * 200], [S.lanes[1], S.end]], R = makeRoute(pts, [0], -200);
  if (r) { cars.splice(cars.indexOf(r), 1); r = null; }
  const rv = addRival(R, type, -CAR_TYPES[type].len / 2 - 3, 0, 1, 1, col); rv.ang = q.ang; rv.x = q.x; rv.y = q.y;
  const p = stripSpot(0, c.t.len); c.x = p.x; c.y = p.y; c.ang = p.ang; c.vx = c.vy = c.av = 0; c.keep = true; DRAG.rival = null; DRAG.filled = false;
  RACE.on = { kind: 'drag', name: 'EIGHTH MILE', R, rivals: [rv], phase: 'count', t: 0, T: 0, car: c, me: null, tree: -1, green: 0, react: 0, moved: false, fee: o.fee, prizes: o.prizes,
    crash: 0, hp: c.hp, crashCd: 0, top: 0, lateT: 30, rivalGo: RC.dragReact * rand(0.7, 1.3), chute: false };
  treeLights(-1); raceHudOn();
}

/* ---------- running a race ---------- */
function raceTick(dt) {                  // js/15, every frame of play
  ringTick(dt); pitTick(); dragTick();
  if (RACE.res) { RACE.res.t -= dt; const b = $('rrBar'); if (b) b.style.width = Math.max(0, RACE.res.t / RC.resultsFor * 100) + '%'; if (RACE.res.t <= 0) closeRaceRes(); }
  const Ro = RACE.on;
  if (!Ro) { dragMarkTick(); return; }
  RACE.lockT -= dt;
  if (Ro.phase !== 'done' && (P.dead || P.busted)) { raceFail(P.busted ? 'BUSTED' : 'WASTED'); return; }
  if (Ro.kind === 'street') streetTick(dt, Ro); else runTick(dt, Ro);
}
function countTick(dt, Ro) {             // the countdown on the start: everyone held; GO
  if (Ro.kind === 'drag') {                                          // the tree: three ambers half a second apart, then green
    Ro.t += dt; const st = Ro.t < 1 ? -1 : Ro.t < 1.5 ? 0 : Ro.t < 2 ? 1 : Ro.t < 2.5 ? 2 : 3;
    if (st !== Ro.tree) { Ro.tree = st; treeLights(st); if (st >= 0 && st < 3) Snd.tone(660, 660, 0.12, 0.12, 'square'); }
    if (st === 3) { raceGo(Ro); Ro.green = 0; }
    return;
  }
  Ro.t -= dt; const n = Math.ceil(Ro.t);
  if (n < Ro.beep && n > 0) { Ro.beep = n; bigCount(String(n)); Snd.tone(440, 440, 0.15, 0.15, 'square'); }
  if (Ro.t <= 0) raceGo(Ro);
}
function raceGo(Ro) {
  Ro.phase = 'run'; Ro.T = 0; bigCount('GO!', true); Snd.tone(880, 880, 0.45, 0.18, 'square');
  if (Ro.kind !== 'drag') for (const c of Ro.rivals) if (c.race) c.race.go = true;
}
function runTick(dt, Ro) {
  if (Ro.phase === 'count') { countTick(dt, Ro); return; }
  if (Ro.phase === 'done') return;
  const c = Ro.car;
  if (!c || P.car !== c || c.dead || c.hp <= 0 || c.sunk || !cars.includes(c)) { raceFail('YOUR CAR IS WRECKED'); return; }
  Ro.T += dt; Ro.top = Math.max(Ro.top, carSpeed(c));
  Ro.crashCd -= dt; if (c.hp < Ro.hp - 2 && Ro.crashCd <= 0) { Ro.crashCd = 0.7; Ro.crash++; } Ro.hp = c.hp;
  let finD;                                                         // where the finish is, along the route
  if (Ro.kind === 'drag') {
    const S = SPW_STRIP; finD = (S.finish - S.stage) * S.dir;
    if (!Ro.moved && stripAlong(S, c.y) + c.t.len / 2 > 4) { Ro.moved = true; Ro.react = Ro.T; }
    const rv = Ro.rivals[0]; if (rv && rv.race && !rv.race.go && Ro.T >= Ro.rivalGo) rv.race.go = true;
    Ro.myD = stripAlong(S, c.y) + c.t.len / 2;
  } else {
    trackOn(Ro.me, c.x, c.y);
    if (Ro.kind === 'street') {
      const R = Ro.R, i = Ro.cps[Ro.cp];
      if (dist(c.x, c.y, R.x[i], R.y[i]) < RC.cpSize) {
        Ro.cp++; Snd.tone(990, 1320, 0.12, 0.12, 'square');
        if (Ro.cp < Ro.cps.length) popup(c.x, c.y - 24, 'CHECKPOINT ' + Ro.cp + ' / ' + Ro.cps.length, RACE_YEL);
      }
      finD = (R.n - 1) * RDS + R.d0;
      Ro.myD = Ro.cp >= Ro.cps.length ? finD : Math.min(Ro.me.d, R.d0 + Ro.cps[Ro.cp] * RDS - 1);
    } else {
      finD = Ro.laps * OV.L; Ro.myD = Ro.me.d;
      const lapNow = Math.floor(Ro.me.d / OV.L);
      if (lapNow > Ro.lap && Ro.me.d > 0) { Ro.lap = lapNow; const lt = Ro.T - Ro.lapT; Ro.lapT = Ro.T; if (!Ro.bestLap || lt < Ro.bestLap) Ro.bestLap = lt; if (Ro.lap < Ro.laps) { popup(c.x, c.y - 24, 'LAP ' + (Ro.lap + 1) + ' / ' + Ro.laps, RACE_YEL); Snd.tone(784, 1047, 0.15, 0.12, 'square'); } }
    }
  }
  let left = 0;                                                      // the others: finished, wrecked, still going
  for (const o of Ro.rivals) {
    const K = o.race; if (!K || K.out) continue;
    if (K.done) continue;
    if (o.dead || o.hp <= 0 || o.sunk || !cars.includes(o) || o.driver !== 'race') { K.out = true; continue; }
    const along = Ro.kind === 'drag' ? stripAlong(SPW_STRIP, o.y) + o.t.len / 2 : K.d;
    if (along >= finD) {
      K.done = true; K.time = Ro.T;
      if (Ro.kind === 'street') toTraffic(o); else if (Ro.kind === 'drag') K.hold = true; else { K.v = K.v.map(v => v * 0.55); }
      continue;
    }
    left++;
  }
  if (Ro.myD >= finD) { raceFinish(Ro); return; }
  if (!left && Ro.rivals.length) { Ro.lateT -= dt; if (Ro.lateT <= 0) { raceFail('TOO SLOW - EVERYONE ELSE FINISHED'); return; } }
  if (Ro.T > 900) raceFail('TOO SLOW');
}
function racePlace(Ro) {                 // your place now: the finished ahead of you, then by how far along
  let p = 1; for (const o of Ro.rivals) { const K = o.race || o._race; if (!K) continue; if (K.done || (!K.out && (Ro.kind === 'drag' ? stripAlong(SPW_STRIP, o.y) + o.t.len / 2 : K.d) > Ro.myD)) p++; }
  return p;
}
function raceFinish(Ro) {
  const place = racePlace(Ro), n = Ro.rivals.length + 1, time = Ro.T, c = Ro.car;
  let winner = Infinity; for (const o of Ro.rivals) { const K = o.race || o._race; if (K && K.done) winner = Math.min(winner, K.time); }
  const prize = Ro.kind === 'drag' ? (place === 1 ? Ro.prizes[0] : 0) : (Ro.prizes[place - 1] || 0);
  let record = false;
  if (Ro.kind === 'street' && Ro.id !== 'random') { if (!RACE.best[Ro.id] || time < RACE.best[Ro.id]) { record = true; RACE.best[Ro.id] = time; } }
  else if (Ro.kind === 'nascar') { if (!RACE.nascar || time < RACE.nascar) { record = true; RACE.nascar = time; } if (Ro.bestLap && (!RACE.lap || Ro.bestLap < RACE.lap)) RACE.lap = Ro.bestLap; }
  else if (Ro.kind === 'drag') { if (!RACE.drag || time < RACE.drag) { record = true; RACE.drag = time; } }
  if (place === 1) RACE.wins++;
  if (prize > 0) { P.score += prize; popup(c.x, c.y - 30, '+' + money(prize), RACE_GREEN); }
  RACE.dirty = true;
  const rows = [['PLACE', ordinal(place) + ' OF ' + n]];
  if (Ro.kind === 'drag') {
    const rv = Ro.rivals[0], K = rv && (rv.race || rv._race);
    rows.push(['TIME (ET)', time.toFixed(3) + ' S'], ['REACTION', Ro.react.toFixed(3) + ' S'], ['TRAP SPEED', Math.round(carSpeed(c) / KMH) + ' KM/H'], ['RIVAL', K && K.done ? K.time.toFixed(3) + ' S' : 'STILL GOING']);
  } else {
    rows.push(['TIME', raceTime(time)]);
    if (place > 1 && isFinite(winner)) rows.push(['BEHIND THE WINNER', '+' + (time - winner).toFixed(2) + ' S']);
    if (Ro.kind === 'nascar' && Ro.bestLap) rows.push(['BEST LAP', raceTime(Ro.bestLap)]);
    rows.push(['TOP SPEED', Math.round(Ro.top / KMH) + ' KM/H']);
  }
  rows.push(['CRASHES', String(Ro.crash)], ['PRIZE', prize > 0 ? money(prize) : 'NONE']);
  Ro.phase = 'done'; Ro.chute = Ro.kind === 'drag';
  showRaceRes(place === 1 ? (Ro.kind === 'drag' ? 'YOU WIN!' : '1ST PLACE!') : Ro.kind === 'drag' ? 'YOU LOSE' : ordinal(place) + ' PLACE', Ro.name, rows, record);
  if (place === 1) { Snd.tone(523, 1047, 0.18, 0.15, 'square'); setTimeout(() => Snd.tone(784, 1568, 0.3, 0.15, 'square'), 160); } else Snd.tone(440, 330, 0.3, 0.12, 'square');
}
function raceFail(why) {                 // the race is over for you: no results, no fee back
  const Ro = RACE.on; if (!Ro) return;
  toast('RACE OVER: ' + why, true); Snd.tone(330, 110, 0.6, 0.15, 'sawtooth');
  raceEnd(Ro);
}
function raceEnd(Ro) {                   // tidy up after a race (finished, failed or the results closed)
  RACE.on = null; $('raceHud').hidden = true; $('raceCount').className = '';
  if (Ro.kind === 'street') { for (const o of Ro.rivals) if (o.race) toTraffic(o); }
  else if (Ro.kind === 'nascar') { if (!P.dead && !P.busted) backToBooth(Ro); else { for (const o of Ro.rivals) { o.race = null; o.driver = null; o.keep = false; } } }
  else { treeLights(-1); for (const o of Ro.rivals) { o.race = null; o.driver = null; o.keep = false; } }
  if (Ro.car && cars.includes(Ro.car)) Ro.car.keep = false;
  if (RACE.dirty && !saveBlock()) putSave('auto', makeSave(lastThumb));   // the prize and the records are kept even if you close the game now
  RACE.dirty = false;
}
function raceAbort(quiet) { const Ro = RACE.on; if (!Ro) return; RACE.on = null; if (!quiet) raceEnd(Ro); }
function pitTick() {                     // a NASCAR special stands in the paddock while you are about; one taken is back once you have been away
  if (!SPW_PIT || !feat('speedway')) return;
  const d = dist(SPW_PIT.x, SPW_PIT.y, P.x, P.y);
  if (PIT.filled) { if (d > 2400) PIT.filled = false; return; }
  if (d > 1500 || d < offDist() + 100 || cars.some(c => dist(c.x, c.y, SPW_PIT.x, SPW_PIT.y) < 50)) return;
  const c = makeCar('nascar', SPW_PIT.x, SPW_PIT.y, SPW_PIT.ang, null); c.searched = true; c.free = true; c.lot = SPW_PIT; c.radio = -1; cars.push(c); PIT.filled = true;
}

/* ---------- locks: from the countdown to the results no getting out and no FIRE; held still on the start and after the finish ---------- */
function raceLocked(what) {
  const Ro = RACE.on; if (!Ro || Ro.phase === 'toStart' || !P.car || P.car !== Ro.car) return false;
  if (what && RACE.lockT <= 0) { RACE.lockT = 1.5; toast(what, true); }
  return true;
}
function raceHold(c, dt) {               // js/06 updatePlayer: the countdown and the results hold your car (after the drag strip's line: a parachute)
  const Ro = RACE.on; if (!Ro || c !== Ro.car || (Ro.phase !== 'count' && Ro.phase !== 'done')) return;
  const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang);
  c.thr = vf > 4 ? -1 : vf < -4 ? 1 : 0; c.hb = false;
  if (Ro.phase === 'count') { c.str = 0; const k = Math.exp(-6 * dt); c.vx *= k; c.vy *= k; c.av *= k; }
  else { const k = Math.exp(-(Ro.chute ? 0.6 : 0.25) * dt); c.vx *= k; c.vy *= k; }
}

/* ---------- HUD: the panel at the top, the big countdown, the results ---------- */
function raceHudOn() { $('raceHud').hidden = false; H.rcA = H.rcB = H.rcC = H.rcD = null; }
function bigCount(t, go) { const e = $('raceCount'); e.textContent = t; e.className = ''; void e.offsetWidth; e.className = go ? 'show go' : 'show'; }
function raceHudUpdate() {               // js/14
  const Ro = RACE.on; if (!Ro) return;
  let a = Ro.kind === 'street' ? 'STREET RACE' : Ro.kind === 'nascar' ? 'NASCAR' : 'DRAG', b = '', cc = '', d = '';
  if (Ro.phase === 'toStart') { b = 'TO THE START'; d = rampTimeText(Ro.t); }
  else {
    const n = Ro.rivals.length + 1, pos = Ro.phase === 'run' ? racePlace(Ro) : Ro.kind === 'nascar' ? Math.min(3, n) : 1;
    b = 'POS ' + pos + '/' + n;
    cc = Ro.kind === 'street' ? 'CP ' + Math.min(Ro.cp + 1, Ro.cps.length) + '/' + Ro.cps.length : Ro.kind === 'nascar' ? 'LAP ' + clamp(Ro.lap + 1, 1, Ro.laps) + '/' + Ro.laps : '';
    d = Ro.kind === 'drag' ? Ro.T.toFixed(2) : raceTime(Ro.T).slice(0, -1);
  }
  if (H.rcA !== a) { H.rcA = a; $('raceHudName').textContent = a; }
  if (H.rcB !== b) { H.rcB = b; $('racePos').textContent = b; }
  if (H.rcC !== cc) { H.rcC = cc; $('raceLap').textContent = cc; $('raceLap').hidden = !cc; }
  if (H.rcD !== d) { H.rcD = d; $('raceClock').textContent = d; $('raceHud').classList.toggle('late', Ro.phase === 'toStart' && Ro.t <= 10); }
}
function raceHint() {                    // js/14: what to do now
  const Ro = RACE.on, c = P.car;
  if (!Ro) {
    if (DRAG.mark && DRAG.shown && c && carSpeed(c) < 8 * KMH && !isService(c.t)) return 'DRIVE OUT AND STOP IN THE STAGING LANE AGAIN TO RACE';
    return '';
  }
  if (Ro.phase === 'toStart') {
    if (c && isService(c.t)) return 'NOT IN A PUBLIC SERVICE VEHICLE - FIND ANOTHER CAR';
    if (P.stars > 0) return 'LOSE THE POLICE FIRST, THEN STOP AT THE START';
    return c ? 'DRIVE TO THE START AND STOP IN THE MARKER' : 'GET A CAR AND DRIVE TO THE START';
  }
  if (Ro.phase === 'count') return Ro.kind === 'drag' ? 'WAIT FOR THE GREEN LIGHT' : 'GET READY';
  if (Ro.phase === 'done') return '';
  const left = Ro.rivals.every(o => { const K = o.race || o._race; return !K || K.done || K.out; });
  if (left && Ro.rivals.length) return 'FINISH IN ' + Math.ceil(Ro.lateT) + ' S!';
  if (Ro.kind === 'street') return Ro.cp === Ro.cps.length - 1 ? 'TO THE FINISH!' : 'THROUGH THE CHECKPOINTS IN ORDER';
  if (Ro.kind === 'nascar') return Ro.lap === Ro.laps - 1 ? 'LAST LAP!' : '';
  return '';
}
function showRaceRes(title, name, rows, record) {
  const e = $('raceRes'); $('rrTitle').textContent = title; $('rrName').textContent = name;
  const box = $('rrRows'); box.innerHTML = '';
  for (const [k, v] of rows) { const a = document.createElement('span'), b = document.createElement('b'); a.textContent = k; b.textContent = v; box.append(a, b); }
  $('rrRecord').hidden = !record; e.hidden = false; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  RACE.res = { t: RC.resultsFor };
}
function closeRaceRes(quiet) {           // the results go (CLOSE, E, Enter or the time): then the race is over - after the NASCAR race, back to the booth
  $('raceRes').hidden = true; const had = RACE.res; RACE.res = null;
  if (quiet || !had) return;
  const Ro = RACE.on; if (Ro && Ro.phase === 'done') raceEnd(Ro);
}
$('rrClose').addEventListener('click', e => { e.stopPropagation(); closeRaceRes(); });

/* ---------- the maps and the markers ---------- */
function raceTargets() {                 // for js/08n's markers and map blips: the start, the next checkpoints, the staging lane
  const out = [], Ro = RACE.on;
  if (Ro && Ro.kind === 'street') {
    if (Ro.phase === 'toStart') out.push({ x: Ro.slot.x, y: Ro.slot.y, col: RACE_YEL, ring: true, r: START_R });
    else if (Ro.phase === 'run' || Ro.phase === 'count') for (let k = Ro.cp; k < Math.min(Ro.cps.length, Ro.cp + 2); k++) { const i = Ro.cps[k], last = k === Ro.cps.length - 1; out.push({ x: Ro.R.x[i], y: Ro.R.y[i], col: last ? RACE_GREEN : k === Ro.cp ? RACE_YEL : '#ffffff', ring: true, r: k === Ro.cp ? RC.cpSize * 0.8 : RC.cpSize * 0.5, dim: k > Ro.cp }); }
  } else if (!Ro && SPW_STRIP && feat('dragStrip') && P.car && !isService(P.car.t) && dist(P.x, P.y, SPW_STRIP.lanes[0], SPW_STRIP.stage) < 900) {
    const m = stripSpot(0, 50); out.push({ x: m.x, y: m.y, col: RACE_CYAN, ring: true, r: STRIP_MR });
  }
  return out;
}
function raceBlips(g, X, Y, size, q, ph) {   // js/14: the route, the racers, then the targets (jobBlips draws them, an arrow at the edge when off the minimap)
  const Ro = RACE.on;
  if (Ro && Ro.kind === 'street' && Ro.phase !== 'done') {
    const R = Ro.R, i0 = Ro.phase === 'toStart' ? 0 : Ro.me.i; g.save(); g.strokeStyle = 'rgba(255,210,63,0.85)'; g.lineWidth = Math.max(2, q * 0.5); g.lineJoin = 'round'; g.beginPath();
    for (let i = i0; i < R.n; i += 2) i === i0 ? g.moveTo(X(R.x[i]), Y(R.y[i])) : g.lineTo(X(R.x[i]), Y(R.y[i])); g.lineTo(X(R.x[R.n - 1]), Y(R.y[R.n - 1])); g.stroke(); g.restore();
  }
  if (Ro) for (const o of Ro.rivals) if (o.race && !o.race.out && !o.dead) { const x = X(o.x), y = Y(o.y); if (size && (x < 0 || y < 0 || x > size || y > size)) continue; g.fillStyle = RACE_ORANGE; g.fillRect(x - q * 0.45, y - q * 0.45, q * 0.9, q * 0.9); }
  jobBlips(g, X, Y, size, q, ph, raceTargets());
}
function raceIcons(g, X, Y, q, inView) { // js/14 svcIcons: a ringing booth (a phone, blinking), the speedway's booth and the drag strip (a chequered flag)
  const rg = RACE.ring;
  if (rg && Math.floor(gameT * 3) % 2 === 0) { const x = X(rg.b.x), y = Y(rg.b.y); if (inView(x, y)) phoneIcon(g, x, y, q, rg.fixed ? RACE_YEL : RACE_CYAN); }
  const flag = (x, y, c2) => { g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#111118' : c2; g.fillRect(x - q + i * q / 2, y - q + j * q / 2, q / 2, q / 2); } };
  if (SPW && feat('speedway')) { const x = X(SPW.booth[0]), y = Y(SPW.booth[1]); if (inView(x, y)) flag(x, y, '#f4f4f4'); }
  if (SPW_STRIP && feat('dragStrip')) { const x = X(SPW_STRIP.lanes[0] + 30), y = Y(SPW_STRIP.stage); if (inView(x, y)) flag(x, y, RACE_CYAN); }
}
function phoneIcon(g, x, y, q, col) {
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = col; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = '#0b0614'; g.beginPath(); g.arc(x - q * 0.45, y - q * 0.15, q * 0.32, 0, TAU); g.arc(x + q * 0.45, y - q * 0.15, q * 0.32, 0, TAU); g.fill();
  g.fillRect(x - q * 0.5, y - q * 0.42, q, q * 0.3); g.fillRect(x - q * 0.35, y + q * 0.1, q * 0.7, q * 0.5);
}
function gfxRaces(time) {                // js/13: the ringing booth glows and blinks
  if (!raceGroup) return;
  const rg = RACE.ring;
  for (const b of BOOTHS) {
    const on = !!rg && rg.b === b, u = b.g.userData, blink = on && Math.floor(time * 4) % 2 === 0;
    if (u.halo.visible !== on) { u.halo.visible = on; u.ring.visible = on; b.sign.visible = on; }
    const col = !on ? 0x8a6a10 : blink ? (rg.fixed ? 0xffd23f : 0x2bf3ff) : 0x5a4a10;
    if (u.band.material.color.getHex() !== col) u.band.material.color.setHex(col);
    if (on) { u.ring.scale.setScalar(BOOTH_R + Math.sin(time * 6) * 2.5); const c = rg.fixed ? '#ffd23f' : '#2bf3ff'; u.ring.material = rampMat(c, 0.9); u.halo.material = glowMat(c, 0.9); }
  }
}

/* ---------- saved games ---------- */
const raceSave = () => ({ best: Object.assign({}, RACE.best), nascar: RACE.nascar, lap: RACE.lap, drag: RACE.drag, wins: RACE.wins });
function raceLoad(sv) {                  // js/15b applySave (and a new game: sv null)
  RACE.best = {}; RACE.nascar = 0; RACE.lap = 0; RACE.drag = 0; RACE.wins = 0; RACE.nextRing = gameT + RC.ringEvery * rand(0.25, 0.5);
  if (!sv || typeof sv !== 'object') return;
  const t = v => typeof v === 'number' && isFinite(v) && v > 0 && v < 1e5 ? v : 0;
  if (sv.best && typeof sv.best === 'object') for (const r of RACE_ROUTES) { const v = t(sv.best[r.id]); if (v) RACE.best[r.id] = v; }
  RACE.nascar = t(sv.nascar); RACE.lap = t(sv.lap); RACE.drag = t(sv.drag); RACE.wins = Math.round(t(sv.wins));
}
