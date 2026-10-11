'use strict';
/* ---------- 6c9. THE GUIDE LINE ----------
   While a route or an objective is on - a street race (the way to its start, then the race's own route), a vehicle job's nearest target,
   the wanted car on its way to the export bay - a faded lime line about a bike wide lies on the streets in the right-hand lane, along the
   shortest way by road (js/08o roadPath), and on the minimap and the city map. It follows you: worked out again as you go. Mode: guideLine.
   The edge glow: the screen edge toward the guide line's target (a race's next checkpoint) and toward a ringing phone booth glows in
   the same lime while they are off screen, pulsing, stronger the closer they are. Mode: edgeGlow. */
const GUIDE = { pts: null, key: '', t: -9, mesh: null, mx: 0, my: 0, ri: -99, G: null, gx: 0, gy: 0 };
const GUIDE_COL = '#b6ff3c', GUIDE_W = 9, GUIDE_FAR = 6500;
const guideMat = new THREE.MeshBasicMaterial({ color: GUIDE_COL, transparent: true, opacity: 0.36, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function guideTarget() {                 // where to: { x, y } or { route, i } (a race's own line); null: nothing to show
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
function guidePath(tg) {                 // the line's points, from you
  const out = []; let len = 0;
  if (tg.route) {                                                  // a race: its own route from where you are on it
    const R = tg.route; out.push([P.x, P.y]);
    for (let i = Math.max(0, tg.i + 2); i < R.n && len < GUIDE_FAR; i += 2) { out.push([R.x[i], R.y[i]]); len += 2 * RDS; }
    if (len < GUIDE_FAR) out.push([R.x[R.n - 1], R.y[R.n - 1]]);
    return out;
  }
  if (!GUIDE.G || Math.abs(GUIDE.gx - tg.x) + Math.abs(GUIDE.gy - tg.y) > 40) { GUIDE.G = fieldNT(tg.x, tg.y); GUIDE.gx = tg.x; GUIDE.gy = tg.y; }
  const r = openRoad(P.x, P.y, 400); if (!GUIDE.G || !r) return null;
  const pts = [[P.x, P.y]]; if (!roadPath(r.e, r.s, 0, GUIDE.G, pts)) return null;
  pts.push([tg.x, tg.y]);                                          // the last bit, off the street to the marker
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
function edgeSpot(x, y) {                // where the line from the middle of the screen to (x, y) leaves the screen; null: (x, y) is on screen
  _eg.set(x, 0, y).project(camera); let nx = _eg.x, ny = _eg.y;
  if (Math.abs(nx) < 0.96 && Math.abs(ny) < 0.96) return null;
  const s = 1 / Math.max(Math.abs(nx), Math.abs(ny), 1e-6); nx *= s; ny *= s;
  return [(nx + 1) * 50, (1 - ny) * 50];
}
function glowTargets() {                 // the guide line's target and the ringing booth, if any
  const out = [], tg = feat('guideLine') && !P.dead ? guideTarget() : null;
  if (tg) { if (tg.route) { const t = raceTargets()[0]; if (t) out.push(t); } else out.push(tg); }
  if (RACE.ring && RACE.ring.b) out.push(RACE.ring.b);
  return out;
}
function edgeGlow(time) {
  const els = [$('edgeA'), $('edgeB')], on = state === 'play' && feat('edgeGlow') && !P.dead, list = on ? glowTargets() : [], me = P.car || P;
  els.forEach((el, k) => {
    const t = list[k], at = t ? edgeSpot(t.x, t.y) : null;
    if (!at) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    const near = clamp(1 - dist(me.x, me.y, t.x, t.y) / 4000, 0.6, 1), a = (0.58 + 0.24 * Math.sin(time * 3.2 + k)) * near;
    el.style.background = 'radial-gradient(ellipse 34% 40% at ' + at[0].toFixed(1) + '% ' + at[1].toFixed(1) + '%, rgba(182,255,60,' + a.toFixed(2) + ') 0%, rgba(182,255,60,' + (a * 0.35).toFixed(2) + ') 45%, rgba(182,255,60,0) 100%)';
    el.style.opacity = '1';
  });
}
