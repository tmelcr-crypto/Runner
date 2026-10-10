'use strict';
/* ---------- 6c9. THE GUIDE LINE ----------
   While a route or an objective is on - a street race (the way to its start, then the race's own route), a vehicle job's nearest target,
   the wanted car on its way to the export bay - a faded lime line about a bike wide lies on the streets in the right-hand lane, along the
   shortest way by road (js/08o roadPath), and on the minimap and the city map. It follows you: worked out again as you go. Mode: guideLine. */
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
