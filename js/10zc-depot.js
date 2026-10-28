'use strict';
/* ---------- 7zc. THE ARMOURED-CAR DEPOT: the Royal Flamingo's cash vans, round the corner from the casino strip (both modes) ----------
   The parking lot north of the casino block, fenced: chain-link on posts with barbed wire along the top, a sliding gate in the front
   beside a guard hut (its window to the street), floodlights at the corners, the casino's sign on the fence. Two ARMOURED VANs in the
   casino's colours (cream and gold, a pink flamingo, ROYAL FLAMINGO on the roof and the sides) stand nose-out at the back; a guard
   stands by the hut. To take one, open the gate at the hut's window (the DEPOT GATE button, or E) - a break-in: the police come (2
   stars; places table, Armoured-car depot). The gate slides shut again a while after; a van driven off is back a game day later if it
   was lost or left. A quest can hold the depot (DEPOT.ms): then it says what the gate and the vans do. Mode: depot. */
const DEPOT = { S: null, gate: null, open: 0, want: 0, openT: 0, vans: [], clock: 0, lastH: null, ms: null, lm: null, pt: null };
const DEPOT_GATE = 66, DEPOT_FH = 18;       // the gate's width, the fence's height
const depotOn = () => feat('depot') && !!DEPOT.S;
function depotWorld(lx, lz, out) { return ixWorld(DEPOT.S, lx, lz, out); }
function genDepot() {                       // js/04 genWorld: the lot nearest the casino's north side
  DEPOT.S = null; DEPOT.vans = []; if (!CASM) return;
  let L = null, bd = 400; for (const l of LOTS) { const d = dist(l.cx, l.cy, 11908, 5519); if (d < bd && l.w >= 140 && l.d >= 120) { bd = d; L = l; } }
  if (!L) return;
  for (const p of L.stalls) { const i = PARK_SPOTS.indexOf(p); if (i >= 0) PARK_SPOTS.splice(i, 1); } L.stalls = []; L.depot = true;   // no ordinary cars park in it
  const S = DEPOT.S = { cx: L.cx, cy: L.cy, a: L.a, ca: Math.cos(L.a), sa: Math.sin(L.a), hw: L.w / 2, hd: L.d / 2, L };
  S.gx = -S.hw * 0.3; S.hut = { x: S.gx + DEPOT_GATE / 2 + 22, z: S.hd - 16 };   // the gate left of the middle, the hut just right of it
  const sol = (lx, lz, w, h, extra) => { const p = depotWorld(lx, lz); return makeSolid(p.x, p.y, w, h, S.a, Object.assign({ bld: true }, extra || {})); };
  const { hw, hd } = S, g0 = S.gx - DEPOT_GATE / 2, g1 = S.gx + DEPOT_GATE / 2;
  sol(0, -hd, 2 * hw, 3); sol(-hw, 0, 3, 2 * hd); sol(hw, 0, 3, 2 * hd);                     // the back and the sides
  sol((-hw + g0) / 2, hd, g0 + hw, 3); sol((g1 + hw) / 2, hd, hw - g1, 3);                    // the front, either side of the gate
  DEPOT.gate = sol(S.gx, hd, DEPOT_GATE, 4, { gate: true });                                  // the sliding gate: solid while shut
  sol(S.hut.x, S.hut.z, 26, 22);                                                              // the guard hut
  S.vanSpots = [-hw * 0.45, hw * 0.45].map(x => ({ lx: x, lz: -hd + 44 }));
  DEPOT.vans = S.vanSpots.map(v => ({ lx: v.lx, lz: v.lz, car: null, takenAt: null }));
  const w = depotWorld(S.hut.x, hd + 18); S.window = { x: w.x, y: w.y };                       // where you stand at the hut's window, on the sidewalk
  const gi = depotWorld(S.gx, hd - 30), go = depotWorld(S.gx, hd + 40); S.inGate = { x: gi.x, y: gi.y }; S.outGate = { x: go.x, y: go.y };
  S.vanAng = Math.atan2(S.ca, -S.sa);                                                         // nose to the gate (local +z)
  LM_CLEAR.push([S.cx, S.cy, Math.abs(S.ca) * hw + Math.abs(S.sa) * hd + 10, Math.abs(S.sa) * hw + Math.abs(S.ca) * hd + 10]);
  DEPOT.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 40, make: () => withSeed(7340, () => makeDepot(S)), mesh: null }; LMS.push(DEPOT.lm);
  const ga = Math.atan2(-S.ca, S.sa), gp = depotWorld(S.hut.x + 22, hd - 22);                 // the guard by the hut, looking out at the street
  addPost({ x: gp.x, y: gp.y, a: Math.atan2(S.ca, -S.sa), kind: 'dguard', back: 260, need: () => depotOn() && !DEPOT.ms, step: standStep,
    make: po => { const p = makePed(po.x, po.y); Object.assign(p, { cguard: true, arm: WEAPONS.findIndex(w => w.id === 'pistol'), hp: 120, shirt: '#16161c', pants: '#16161c', umb: false, speed: 0, state: 'post', ang: po.a }); return p; } });
  void ga;
}

/* ---------- the model ---------- */
function makeDepot(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, { hw, hd } = S, g0 = S.gx - DEPOT_GATE / 2, g1 = S.gx + DEPOT_GATE / 2, H = DEPOT_FH;
  const post = C('#8a8f9c'), mesh = C('#5a5f6a'), wire = C('#b8bcc8'), hutC = C('#efe6cc'), gold = C('#c9a227'), roofC = C('#3a3f4c'), glass = C('#9fd4ee');
  const fence = (ax, az, bx, bz) => {                    // posts every 20, a mesh of thin rails, barbed wire on top
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 20)), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let k = 0; k <= n; k++) { const x = ax + ux * L * k / n, z = az + uz * L * k / n; box5(T, x - 0.8, 0, z - 0.8, x + 0.8, H + 3, z + 0.8, post); }
    for (let y = 2; y <= H; y += 2.2) { const t = 0.25; box5(T, Math.min(ax, bx) - t, y, Math.min(az, bz) - t, Math.max(ax, bx) + t, y + 0.35, Math.max(az, bz) + t, mesh); }
    for (const y of [H + 1.2, H + 2.6]) box5(T, Math.min(ax, bx) - 0.3, y, Math.min(az, bz) - 0.3, Math.max(ax, bx) + 0.3, y + 0.5, Math.max(az, bz) + 0.3, wire);
  };
  fence(-hw, -hd, hw, -hd); fence(-hw, -hd, -hw, hd); fence(hw, -hd, hw, hd); fence(-hw, hd, g0, hd); fence(g1, hd, hw, hd);
  const hx = S.hut.x, hz = S.hut.z;                       // the hut: cream walls, a flat roof, a window to the street and one to the gate
  box5(T, hx - 13, 0, hz - 11, hx + 13, 20, hz + 11, hutC); box5(T, hx - 15, 20, hz - 13, hx + 15, 22, hz + 13, roofC);
  box5(G, hx - 9, 9, hz + 11, hx + 9, 16, hz + 11.6, glass); box5(G, hx - 13.6, 9, hz - 6, hx - 13, 16, hz + 6, glass);
  box5(T, hx - 15, 22, hz - 13, hx + 15, 23, hz - 11, gold);
  for (const [cx, cz] of [[-hw + 6, -hd + 6], [hw - 6, -hd + 6], [-hw + 6, hd - 6], [hw - 6, hd - 6]]) {   // floodlights at the corners
    box5(T, cx - 1, 0, cz - 1, cx + 1, 34, cz + 1, post); box5(G, cx - 3, 32, cz - 3, cx + 3, 35, cz + 3, C('#fff3c0'));
  }
  for (const v of S.vanSpots) { flat(T, v.lx - 16, v.lz - 30, v.lx + 16, v.lz + 34, 0.7, C('#c9a227')); flat(T, v.lx - 14, v.lz - 28, v.lx + 14, v.lz + 32, 0.75, C('#2a2d36')); }   // gold-lined bays
  const m = lmMesh(T, G), own = m.userData.own;
  const gm = new THREE.Group(); m.add(gm);                // the sliding gate: a steel frame with mesh, slides along the inside of the fence
  const gT = new GeoBuilder(); box5(gT, -DEPOT_GATE / 2, 0, -1.2, DEPOT_GATE / 2, H, 1.2, C('#c9a227')); for (let x = -DEPOT_GATE / 2 + 6; x < DEPOT_GATE / 2; x += 6) box5(gT, x - 0.4, 0, -0.5, x + 0.4, H, 0.5, C('#3a3f4c'));
  const gate = new THREE.Mesh(gT.build(), LM_MAT[0]); gate.position.set(S.gx, 0, hd); gm.add(gate);
  const sign = fasciaSign('ROYAL FLAMINGO · SECURE TRANSPORT', '#ffd23f', fasciaFit('ROYAL FLAMINGO · SECURE TRANSPORT', 9, 130), 9); sign.position.set(g1 + 74, H - 3, hd + 1.4); m.add(sign);
  const top = fasciaSign('CASH DEPOT', '#ffd23f', 120, 22); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(hx, 23.4, hz); m.add(top);
  own.push(sign.material, top.material);
  S.pt = { gate }; return m;
}

/* ---------- at work ---------- */
function depotReset() { DEPOT.open = 0; DEPOT.want = 0; DEPOT.openT = 0; DEPOT.ms = null; DEPOT.clock = 0; DEPOT.lastH = null; if (DEPOT.gate) DEPOT.gate.off = false;
  for (const v of DEPOT.vans) { if (v.car && cars.includes(v.car) && P.car !== v.car) cars.splice(cars.indexOf(v.car), 1); v.car = null; v.takenAt = null; } }
function depotOpen(on) { DEPOT.want = on ? 1 : 0; if (on) DEPOT.openT = PLC.depotGate; Snd.tone(on ? 180 : 140, on ? 120 : 100, 0.4, 0.06, 'sawtooth'); }
function depotVan(x, y, ang) {              // a cash van in the casino's colours
  const c = makeCar('armorvan', x, y, ang, null, '#efe6cc'); c.deco = 'flamingo'; c.searched = true; c.depot = true; return c;
}
function depotTick(dt) {                    // js/15 update
  const S = DEPOT.S; if (!S) return;
  if (DEPOT.lastH !== null) DEPOT.clock += (SKY.hour - DEPOT.lastH + 24) % 24; DEPOT.lastH = SKY.hour;
  if (DEPOT.want && !DEPOT.ms && (DEPOT.openT -= dt) <= 0) {          // shut again after a while, when nothing stands in the gateway
    const busy = [P.car || P, ...cars].some(o => o && dist(o.x, o.y, (S.inGate.x + S.outGate.x) / 2, (S.inGate.y + S.outGate.y) / 2) < 50);
    if (!busy) depotOpen(false); else DEPOT.openT = 2;
  }
  DEPOT.open = clamp(DEPOT.open + (DEPOT.want ? 1 : -1) * dt / 2.5, 0, 1);
  if (DEPOT.gate) DEPOT.gate.off = DEPOT.open > 0.85;
  if (!depotOn()) return;
  for (const v of DEPOT.vans) {
    const c = v.car, w = depotWorld(v.lx, v.lz);
    if (c && (!cars.includes(c) || c.dead || c.sunk)) { v.car = null; if (v.takenAt === null) v.takenAt = DEPOT.clock; }
    if (v.car && v.takenAt === null && (P.car === v.car || dist(v.car.x, v.car.y, w.x, w.y) > 60)) v.takenAt = DEPOT.clock;   // driven off
    if (v.takenAt !== null && DEPOT.clock - v.takenAt >= PLC.depotVanBack && !DEPOT.ms) {           // a game day on, lost or left: a new one
      const k = v.car; if (k && (k.home || P.car === k || dist(k.x, k.y, P.x, P.y) < 2000)) continue;
      if (k && cars.includes(k)) cars.splice(cars.indexOf(k), 1); v.car = null; v.takenAt = null;
    }
    if (v.car || v.takenAt !== null || dist(P.x, P.y, w.x, w.y) > 1500 || cars.some(o => dist(o.x, o.y, w.x, w.y) < 30)) continue;
    v.car = depotVan(w.x, w.y, S.vanAng); cars.push(v.car);
  }
}
function depotKey() {                       // the DEPOT GATE button at the hut's window
  const S = DEPOT.S; if (!depotOn() || DEPOT.want || P.car || P.dead || P.act || state !== 'play' || CUT.on) return null;
  if (DEPOT.ms && !DEPOT.ms.gate) return null;
  return dist(P.x, P.y, S.window.x, S.window.y) < 28 ? { label: 'DEPOT GATE', go: 'OPEN IT' } : null;
}
function depotUse() {
  depotOpen(true); popup(P.x, P.y - 14, 'THE GATE SLIDES OPEN', '#ffd23f');
  const stars = DEPOT.ms ? DEPOT.ms.stars : PLC.depotStars;              // a break-in: the alarm calls the police
  if (stars > 0) { P.heat = Math.max(P.heat, COP.lv.heat[Math.min(5, stars)] + 1); updateStars(); toast('ALARM! BREAK-IN AT THE CASH DEPOT', true); }
  if (DEPOT.ms && DEPOT.ms.opened) DEPOT.ms.opened();
}
function depotUi() {                        // every frame (js/14)
  const k = depotKey(), b = $('depotBtn'); if (!b) return;
  if (!k) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden) { b.hidden = false; b.querySelector('b').textContent = k.label; b.querySelector('.go').textContent = k.go; b.style.setProperty('--sc', '#ffd23f'); }
  doorBtnAt(b);
}
if ($('depotBtn')) $('depotBtn').addEventListener('click', e => { e.stopPropagation(); if (depotKey()) depotUse(); });
function gfxDepot() {                       // js/13: the gate slides along the fence
  const S = DEPOT.S; if (!S || !S.pt || !DEPOT.lm.mesh) return;
  S.pt.gate.position.x = S.gx - DEPOT.open * (DEPOT_GATE + 4);
}
