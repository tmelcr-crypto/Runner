'use strict';
/* ---------- 6c9. THE GUIDE LINE ----------
   While a route or an objective is on - a street race (the way to its start, then the race's own route), a vehicle job's nearest target,
   the wanted car on its way to the export bay - a faded lime line about a bike wide lies on the streets in the right-hand lane, along the
   shortest way by road (js/08o roadPath), and on the minimap and the city map. It follows you: worked out again as you go. Mode: guideLine.
   The edge glow: the screen edge toward the guide line's target (a race's next checkpoint) glows lime, and toward a ringing phone booth
   in the booth's own colour on the maps (yellow for a fixed race, cyan), while they are off screen - the way there on the map, wherever
   it is - pulsing, stronger the closer they are; once it is on screen the glow goes. Mode: edgeGlow. */
const GUIDE = { pts: null, key: '', t: -9, mesh: null, mx: 0, my: 0, ri: -99, G: null, gx: 0, gy: 0 };
const GUIDE_COL = '#b6ff3c', GUIDE_W = 9, GUIDE_FAR = 6500;
const guideMat = new THREE.MeshBasicMaterial({ color: GUIDE_COL, transparent: true, opacity: 0.36, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function guideTarget() {                 // where to: { x, y } or { route, i } (a race's own line); null: nothing to show
  const ms = msGuide(); if (ms) return ms;                         // a mission's target (js/08zy)
  const Ro = RACE.on;
  if (Ro) {
    if (Ro.kind !== 'street') return null;
    if (Ro.phase === 'toStart') return { x: Ro.slot.x, y: Ro.slot.y, key: 'start' };
    return Ro.phase === 'done' ? null : { route: Ro.R, i: Ro.me.i, key: 'route' };
  }
  if (JOB.on) { let b = null, bd = Infinity; for (const t of jobTargets()) { const d = dist(t.x, t.y, P.x, P.y); if (d < bd) { bd = d; b = t; } } return b ? { x: b.x, y: b.y, key: 'job' } : null; }
  if (P.car && feat('carDelivery') && dlvMatch(P.car) && !inBay(P.car)) return { x: DLV_BAY.x, y: DLV_BAY.y, key: 'dlv' };
  return null;
}
function guideEnd(x, y, far) {           // where the line leaves the roads for (x, y): { r: the nearest road point (a driveway too) with no fence or wall between, way: on foot from it } - or round by a gate (walkWay)
  const rs = nearRoads(x, y, far).sort((a, b) => a.d - b.d), q = {};
  for (const r of rs) { if (r.d < 1) return { r }; edgeAt(r.e, r.s, q); if (guideClear(q.x, q.y, x, y)) return { r }; }
  const w = walkWay(x, y, GUIDE_WALK); if (w) return w;
  const r = openRoad(x, y, far); return r ? { r } : null;        // nothing better: straight from the nearest street
}
function guideClear(x1, y1, x2, y2) {    // nothing you can't walk through between: no wall or fence (turnstiles, booms and gates let you by)
  const d = dist(x1, y1, x2, y2); if (d < 1) return true;
  const dx = (x2 - x1) / d, dy = (y2 - y1) / d; let ok = true;
  buildingsAlong(x1, y1, x2, y2, rc => { if (ok && !rc.walk && !rc.gate && !rc.opens && !softSolid(rc) && raySolid(x1, y1, dx, dy, rc) < d) ok = false; }, 0, true);
  return ok;
}
const GUIDE_CELL = 24, GUIDE_WALK = 1800, _gw = [];
function guideWalkable(x, y) {           // a person could stand here: on land, in no wall, fence or building
  if (shoreDist(x, y) < -4) return false;
  nearBuildings(x, y, _gw); for (const rc of _gw) if (!rc.walk && !rc.barrier && !rc.gate && !rc.opens && !softSolid(rc) && solidAt(rc, 0) && inSolid(x, y, rc, 6)) return false;
  return true;
}
function walkWay(x, y, far) {            // on foot from (x, y) to the nearest road, round fences and walls (out by a gate): { r, way: [road point ... (x, y)] } or null
  const n = 2 * Math.ceil(far / GUIDE_CELL) + 1, h = (n - 1) / 2, x0 = x - h * GUIDE_CELL, y0 = y - h * GUIDE_CELL;
  const from = new Int32Array(n * n).fill(-2), ok = new Uint8Array(n * n), cx = i => x0 + (i % n) * GUIDE_CELL, cy = i => y0 + Math.floor(i / n) * GUIDE_CELL;
  const s0 = h * n + h, Q = [s0]; from[s0] = -1;
  for (let qi = 0; qi < Q.length; qi++) {                        // breadth first from (x, y) - the first cell by a road wins
    const i = Q[qi], px = cx(i), py = cy(i);
    if (qi > 0) { const rs = nearRoads(px, py, GUIDE_CELL); if (rs.length) {
      const r = rs.sort((a, b) => a.d - b.d)[0], way = []; for (let k = i; k >= 0; k = from[k]) way.push([cx(k), cy(k)]);
      way[way.length - 1] = [x, y]; const q = edgeAt(r.e, r.s, {}); way.unshift([q.x, q.y]);
      const out = [way[0]]; for (let a = 0; a < way.length - 1;) { let b = way.length - 1; while (b > a + 1 && !guideClear(way[a][0], way[a][1], way[b][0], way[b][1])) b--; out.push(way[b]); a = b; }   // pulled tight
      return { r, way: out };
    } }
    const ix = i % n, iy = (i - ix) / n;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const jx = ix + dx, jy = iy + dy; if (jx < 0 || jy < 0 || jx >= n || jy >= n) continue;
      const j = jy * n + jx; if (from[j] !== -2 || ok[j] === 2) continue;
      if (!ok[j]) ok[j] = guideWalkable(cx(j), cy(j)) ? 1 : 2;
      if (ok[j] === 1 && guideClear(px, py, cx(j), cy(j))) { from[j] = i; Q.push(j); }   // not over a thin fence between two cells
    }
  }
  return null;
}
function guidePath(tg) {                 // the line's points, from you
  const out = []; let len = 0;
  if (tg.route) {                                                  // a race: its own route from where you are on it
    const R = tg.route; out.push([P.x, P.y]);
    for (let i = Math.max(0, tg.i + 2); i < R.n && len < GUIDE_FAR; i += 2) { out.push([R.x[i], R.y[i]]); len += 2 * RDS; }
    if (len < GUIDE_FAR) out.push([R.x[R.n - 1], R.y[R.n - 1]]);
    return out;
  }
  if (!GUIDE.G || Math.abs(GUIDE.gx - tg.x) + Math.abs(GUIDE.gy - tg.y) > 40) { const t = guideEnd(tg.x, tg.y, 900); GUIDE.G = t && fieldNT(tg.x, tg.y, t.r); GUIDE.end = t; GUIDE.gx = tg.x; GUIDE.gy = tg.y; }
  if (!GUIDE.start || dist(P.x, P.y, GUIDE.sx, GUIDE.sy) > 120) { GUIDE.start = guideEnd(P.x, P.y, 400); GUIDE.sx = P.x; GUIDE.sy = P.y; }   // where you join the roads (worked out again as you go)
  const st = GUIDE.start; if (!GUIDE.G || !st) return null;
  const pts = [[P.x, P.y]]; if (st.way) for (let k = st.way.length - 2; k >= 0; k--) pts.push(st.way[k]);   // inside a fence: out by its gate first
  if (!roadPath(st.r.e, st.r.s, 0, GUIDE.G, pts)) return null;
  if (GUIDE.end.way) pts.push(...GUIDE.end.way.slice(1)); else pts.push([tg.x, tg.y]);   // the last bit, off the street to the marker (by the gate, round the fence)
  out.push(pts[0]);
  for (let k = 1; k < pts.length && len < GUIDE_FAR; k++) { len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); out.push(pts[k]); }
  return out;
}
function guideBuild(pts) {
  if (GUIDE.mesh) { scene.remove(GUIDE.mesh); GUIDE.mesh.geometry.dispose(); GUIDE.mesh = null; }
  GUIDE.pts = pts && pts.length > 1 ? pts : null; if (!GUIDE.pts) return;
  const T = new Tris(); ribbon(T, pts, LANE - GUIDE_W, LANE + GUIDE_W, 1.3, new THREE.Color(GUIDE_COL));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3));
  GUIDE.mesh = new THREE.Mesh(g, guideMat); GUIDE.mesh.frustumCulled = false; GUIDE.mesh.renderOrder = 2; scene.add(GUIDE.mesh);
}
function gfxGuide(time) {                // js/13: worked out again now and then as you go (more often when the target moves)
  if (state === 'cut') { if (GUIDE.pts) guideBuild(null); GUIDE.key = ''; return; }   // a cutscene (a mission's too, js/08zy): no line
  if (state !== 'play' && state !== 'dying') return;               // a card is up: the line stays as it is
  const tg = feat('guideLine') && !P.dead ? guideTarget() : null;
  if (!tg) { if (GUIDE.pts) guideBuild(null); GUIDE.key = ''; return; }
  const moved = Math.abs(P.x - GUIDE.mx) + Math.abs(P.y - GUIDE.my) > 30, again = tg.route ? Math.abs(tg.i - GUIDE.ri) > 3 : time - GUIDE.t > 0.4 && (moved || GUIDE.G === null || Math.abs(GUIDE.gx - tg.x) + Math.abs(GUIDE.gy - tg.y) > 40);
  if (tg.key !== GUIDE.key || again) {
    GUIDE.key = tg.key; GUIDE.t = time; GUIDE.mx = P.x; GUIDE.my = P.y; GUIDE.ri = tg.route ? tg.i : -99; if (tg.key !== GUIDE.lastKey) { GUIDE.G = null; GUIDE.lastKey = tg.key; }
    guideBuild(guidePath(tg));
  }
  guideMat.opacity = 0.3 + 0.08 * Math.sin(time * 2.5);
}
function guideBlips(g, X, Y, lw) {       // js/14: the same line on the minimap and the city map
  const p = GUIDE.pts; if (!p) return;
  g.save(); g.strokeStyle = 'rgba(182,255,60,0.85)'; g.lineWidth = lw; g.lineJoin = g.lineCap = 'round'; g.beginPath();
  p.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); g.restore();
}

/* ---------- the edge glow (js/14 updateHud) ---------- */
const _eg = new THREE.Vector3();
function edgeSpot(x, y) {                // where on the screen's edge the way to (x, y) leaves it ([% across, % down]); null: (x, y) is on screen
  _eg.set(x, 0, y).applyMatrix4(camera.matrixWorldInverse);
  if (_eg.z < 0) { _eg.applyMatrix4(camera.projectionMatrix); if (Math.abs(_eg.x) < 0.96 && Math.abs(_eg.y) < 0.96) return null; }   // in front of the camera and in view
  // off screen: the way there on the map (north up), not the camera's projection - far behind the camera it would come out mirrored
  const dx = x - cam.x, dy = (y - cam.y) * Math.cos(CAM_TILT_DEG * Math.PI / 180), s = Math.min(VW / 2 / Math.max(Math.abs(dx), 1e-6), VH / 2 / Math.max(Math.abs(dy), 1e-6));
  return [50 + dx * s / VW * 100, 50 + dy * s / VH * 100];
}
const GLOW_LIME = [182, 255, 60];
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function glowTargets() {                 // the guide line's target (lime) and the ringing booth (its own colour on the maps: yellow or cyan)
  const out = [], tg = feat('guideLine') && !P.dead ? guideTarget() : null;
  if (tg) { if (tg.route) { const t = raceTargets()[0]; if (t) out.push({ x: t.x, y: t.y, rgb: GLOW_LIME }); } else out.push({ x: tg.x, y: tg.y, rgb: GLOW_LIME }); }
  if (RACE.ring && RACE.ring.b) out.push({ x: RACE.ring.b.x, y: RACE.ring.b.y, rgb: hexRgb(RACE.ring.fixed ? RACE_YEL : RACE_CYAN) });
  return out;
}
function edgeGlow(time) {
  const els = [$('edgeA'), $('edgeB')], on = state === 'play' && feat('edgeGlow') && !P.dead, list = on ? glowTargets() : [], me = P.car || P;
  els.forEach((el, k) => {
    const t = list[k], at = t ? edgeSpot(t.x, t.y) : null;
    if (!at) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }   // on screen: no glow
    const near = clamp(1 - dist(me.x, me.y, t.x, t.y) / 4000, 0.6, 1), a = (0.58 + 0.24 * Math.sin(time * 3.2 + k)) * near, c = t.rgb.join(',');
    el.style.background = 'radial-gradient(ellipse 34% 40% at ' + at[0].toFixed(1) + '% ' + at[1].toFixed(1) + '%, rgba(' + c + ',' + a.toFixed(2) + ') 0%, rgba(' + c + ',' + (a * 0.35).toFixed(2) + ') 45%, rgba(' + c + ',0) 100%)';
    el.style.opacity = '1';
  });
}

