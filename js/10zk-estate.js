'use strict';
/* ---------- 7zk. CRANE'S ESTATE ON PEARL KEY (both modes; chapter 5: M25 the garden party, M29 the attack, M30 in the house) ----------
   The walled estate on Pearl Key's south peninsula (map remodel 19, lm estate): the iron gate on the causeway road (north), the fountain
   court, the MANSION, the pool terrace behind it, the helipad with Crane's helicopter (east), the garden with its hedges, a statue and the
   folly (west; Sal's tunnel comes up under it), the dock gate in the south wall with the jetty into the bay, and outside the west wall the
   OLD BOATHOUSE on the shore (the tunnel's other end). Guarded in both modes (modes: estate): walk in and the banner warns PRIVATE
   PROPERTY, then the guards draw (places table, Estate); a shot or a blast inside does it at once. They give up once you are well away.
   The mansion is the top-down kind (its roof and upper walls turn see-through while you are inside): the hall with its staircase, the
   study with Crane's desk and safe (west), the ballroom with its bar and piano (east). Its door is locked but in quests (modes:
   mansionInside: a quest opens it - ESTATE.ms.doors). A quest holds the estate with ESTATE.ms: { gate, dock, doors, hold (no guards of
   the estate's own: the quest brings its people) }. The mansion's frame: door +z = north; { cx, cy, a, ca, sa, hw, hd, H, door, inside,
   ds, spots }. */
const ESTATE = { L: null, lm: null, gate: null, dock: null, house: null, heli: null, ms: null, alarm: false, warnT: 0, outT: 0, sayT: 0 };
const EST_WT = 5, EST_DW = 30, EST_T = 9;
const estOn = () => feat('estate') && !!ESTATE.L;
function estIn(x, y, m) { const L = ESTATE.L; return !!L && Math.abs(x - L.x) < L.w / 2 - EST_T - (m || 0) && Math.abs(y - L.y) < L.h / 2 - EST_T - (m || 0); }   // inside the walls
const estWorld = (lx, lz, out) => ixWorld(ESTATE.house, lx, lz, out);
function estHouseIn(x, y, m) { const S = ESTATE.house; if (!S) return false; const q = ixLocal(S, x, y, {}); return Math.abs(q.x) < S.hw - EST_WT - (m || 0) && q.z > -S.hd + EST_WT + (m || 0) && q.z < S.hd - EST_WT - (m || 0); }

/* ---------- built with the city (js/10b genLandmarks: the estate's landmark) ---------- */
function genEstate(L) {
  ESTATE.L = L; const x0 = L.x - L.w / 2, x1 = L.x + L.w / 2, y0 = L.y - L.h / 2, y1 = L.y + L.h / 2, t = EST_T, gw = L.gw || 110, D = L.dock;
  const wall = (x, y, w, h) => makeSolid(x, y, w, h, 0, {});
  wall((x0 + L.x - gw / 2) / 2, y0 + t / 2, L.x - gw / 2 - x0, t); wall((L.x + gw / 2 + x1) / 2, y0 + t / 2, x1 - L.x - gw / 2, t);   // the north wall, the gate between
  wall((x0 + D.x - D.gw / 2) / 2, y1 - t / 2, D.x - D.gw / 2 - x0, t); wall((D.x + D.gw / 2 + x1) / 2, y1 - t / 2, x1 - D.x - D.gw / 2, t);   // the south wall, the dock gate in it
  wall(x0 + t / 2, L.y, t, L.h); wall(x1 - t / 2, L.y, t, L.h);
  ESTATE.gate = { x: L.x, y: y0 + t / 2, w: gw, open: 0, solid: Object.assign(wall(L.x, y0 + t / 2, gw, t), { opens: true }), out: { x: L.x, y: y0 - 50 }, in: { x: L.x, y: y0 + 50 } };
  ESTATE.dock = { x: D.x, y: y1 - t / 2, w: D.gw, open: 0, solid: Object.assign(wall(D.x, y1 - t / 2, D.gw, t), { opens: true }), out: { x: D.x, y: y1 + 50 }, in: { x: D.x, y: y1 - 50 }, end: { x: D.x, y: D.y1 - 20 } };
  const [fx, fy, fr] = L.fountain; for (let k = 0; k < 3; k++) makeSolid(fx, fy, fr * 1.7, fr * 1.7, k * Math.PI / 6, {});
  const [bx, by, bw, bd] = L.boathouse; makeSolid(bx, by, bw, bd, 0, {}); ESTATE.boathouse = { x: bx, y: by, door: { x: bx + bw / 2 + 16, y: by } };
  const [fox, foy] = L.folly; makeSolid(fox, foy, 30, 30, 0, {}); ESTATE.folly = { x: fox, y: foy, out: { x: fox + 30, y: foy - 6 } };
  const [hx, hy, hr] = L.heli; ESTATE.heli = { x: hx, y: hy, r: hr, spin: 0, rot: 0, solid: makeSolid(hx - 17, hy, 86, 20, 0, {}) };   // Crane's helicopter on its pad
  makeSolid(L.x - gw / 2 - 40, y0 + 34, 26, 22, 0, {});                                      // the guard booth inside the gate
  LMS.push(ESTATE.lm = { cx: L.x, cy: L.y + 60, a: 0, rad: Math.hypot(L.w, L.h + 240) / 2 + 40, make: () => withSeed(8017, () => makeEstate(L)), mesh: null });
  LM_CLEAR.push([L.x, L.y, L.w / 2 + 30, L.h / 2 + 30], [bx, by, bw / 2 + 20, bd / 2 + 20]);
  LMS.push({ cx: bx, cy: by, a: 0, rad: 70, make: () => makeOldBoathouse(bw, bd), mesh: null });
  genMansion(L);
}
function genMansion(L) {                  // the mansion: its own walls, the front door to the north, partitions into hall, study and ballroom
  const [hx, hy, hwx, hdy] = L.house, S = ESTATE.house = { kind: 'mansion', cx: hx, cy: hy, a: Math.PI, ca: -1, sa: 0, hw: hwx / 2, hd: hdy / 2, H: 58, roof: 1, open: 0, spots: {}, lm: null };
  const W = EST_WT, { hw, hd } = S, P2 = 84, dz0 = 18, dz1 = 62;                              // the partitions at x = +-P2, a doorway in each between dz0 and dz1
  const sol = (lx, lz, w, d, ex) => { const p = estWorld(lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, d), S.a, Object.assign({ bld: true, ixw: true }, ex || {})); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  for (const s of [-1, 1]) sol(s * (hw + EST_DW / 2) / 2, hd - W / 2, hw - EST_DW / 2, W);
  S.ds = sol(0, hd - W / 2, EST_DW + 2, W + 2, { ixDoor: true });
  for (const s of [-1, 1]) { sol(s * P2, (-hd + dz0) / 2, 4, dz0 + hd); sol(s * P2, (dz1 + hd) / 2, 4, hd - dz1); }
  S.P2 = P2; S.dz = [dz0, dz1];
  sol(0, -hd + 34, 70, 40);                                                                  // the staircase at the back of the hall
  sol(hw * 0.62, -36, 56, 22); sol(-hw + 18, -30, 14, 120); sol(-hw * 0.55, -hd + 40, 44, 26);   // the study's desk; the ballroom's bar; the piano
  for (const s of [-1, 1]) sol(s * 60, 95, 10, 10);                                            // the hall's two statues
  S.door = estWorld(0, hd + 18); S.inside = estWorld(0, hd - 24);
  S.spots = { hall: estWorld(0, 40), desk: estWorld(hw * 0.62, -60), chair: estWorld(hw * 0.62, -52), safe: estWorld(hw - 34, -hd + 40), study: estWorld(hw * 0.55, 30),
    ballroom: estWorld(-hw * 0.55, 10), bar: estWorld(-hw + 40, -30), piano: estWorld(-hw * 0.55, -hd + 70), stairs: estWorld(0, -hd + 70), studyDoor: estWorld(P2, (dz0 + dz1) / 2), ballDoor: estWorld(-P2, (dz0 + dz1) / 2) };
  S.dw = EST_DW; S.px = null; S.pOpen = 0;                                                   // castWay's door fields (js/08zz)
  S.lm = { cx: hx, cy: hy, a: S.a, rad: Math.hypot(hw, hd) + 60, make: () => withSeed(8023, () => makeMansion(S)), mesh: null };
  LMS.push(S.lm);
}
function estatePosts(L) {                 // the guards: two at the gate, two walking the grounds, one at the helipad, one at the dock gate
  const y0 = L.y - L.h / 2, y1 = L.y + L.h / 2, pistol = WEAPONS.findIndex(w => w.id === 'pistol'), smg = WEAPONS.findIndex(w => w.id === 'smg');
  const need = () => estOn() && !(ESTATE.ms && ESTATE.ms.hold);
  const guard = (x, y, a, arm, patrol) => addPost({ x, y, a, kind: 'eguard', back: 240, patrol, need, step: standStep,
    make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', ang: po.a, eguard: true, arm, hp: PLC.estateGuardHp, shirt: '#16161c', pants: '#16161c', shades: true }); return p; } });
  guard(L.x - 74, y0 + 30, -Math.PI / 2, smg); guard(L.x + 74, y0 + 30, -Math.PI / 2, pistol);
  guard(L.x - 300, y0 + 120, 0, pistol, [[L.x - 300, y0 + 120], [L.x - 420, y1 - 140], [L.x - 140, y1 - 60]]);
  guard(L.x + 300, y1 - 120, Math.PI, smg, [[L.x + 300, y1 - 120], [L.x + 480, y0 + 120], [L.x + 200, y0 + 90]]);
  guard(L.heli[0] - 90, L.heli[1] + 40, 0, smg); guard(L.dock.x - 40, y1 - 30, Math.PI / 2, pistol);
}

/* ---------- the models ---------- */
function makeEstate(L) {                  // the grounds (the landmark's frame: x east, z south, centred on the walls), the gates their own pieces
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, w = L.w, h = L.h, x0 = -w / 2, x1 = w / 2, z0 = -h / 2, z1 = h / 2, t = EST_T, gw = L.gw || 110, D = L.dock, oy = 60;
  const X = x => x - L.x, Z = y => y - L.y - oy;                                              // the mesh sits 60 south of the walls' centre (the jetty is in it)
  const cream = C('#efe2c8'), white = C('#f6f2ea'), pink = C('#ff6fae'), gravel = C('#d8cfb8'), hedge = C('#2a6a3a'), stone = C('#e4dccb');
  const zz0 = z0 - oy, zz1 = z1 - oy;
  flat(T, x0, zz0, x1, zz1, 0.6, C('#2f8f4e'));
  /* the walls with their pink coping, the gate pillars with lamps, the dock gate's posts */
  const wl = (a0, b0, a1, b1) => { box5(T, a0, 0, b0, a1, 16, b1, cream); flat(G, a0, b0, a1, b1, 16.3, pink); };
  wl(x0, zz0, -gw / 2, zz0 + t); wl(gw / 2, zz0, x1, zz0 + t); wl(x0, zz0, x0 + t, zz1); wl(x1 - t, zz0, x1, zz1);
  wl(x0, zz1 - t, X(D.x) - D.gw / 2, zz1); wl(X(D.x) + D.gw / 2, zz1 - t, x1, zz1);
  for (const sx of [-1, 1]) { box5(T, sx * gw / 2 - 9, 0, zz0 - 4, sx * gw / 2 + 9, 28, zz0 + t + 4, white); box5(G, sx * gw / 2 - 5, 28, zz0, sx * gw / 2 + 5, 33, zz0 + t, C('#fff3b0')); }
  for (const sx of [-1, 1]) box5(T, X(D.x) + sx * D.gw / 2 - 5, 0, zz1 - t - 2, X(D.x) + sx * D.gw / 2 + 5, 20, zz1 + 2, white);
  box5(T, X(L.x) - gw / 2 - 53, 0, zz0 + 23, X(L.x) - gw / 2 - 27, 18, zz0 + 45, white); box5(T, X(L.x) - gw / 2 - 55, 18, zz0 + 21, X(L.x) - gw / 2 - 25, 20, zz0 + 47, C('#c8664a'));   // the guard booth
  box5(G, X(L.x) - gw / 2 - 27.2, 8, zz0 + 28, X(L.x) - gw / 2 - 26.6, 14, zz0 + 40, C('#ffd98a'));
  /* the drive: from the gate round the fountain to the door; the court before the house */
  const [hx, hy, hwx, hdy] = L.house, hz0 = Z(hy - hdy / 2), [fx, fy, fr] = L.fountain;
  flat(T, -gw / 2 + 10, zz0 + t, gw / 2 - 10, Z(fy) - fr - 30, 0.75, gravel);
  for (let k = 0; k < 24; k++) { const a0 = k / 24 * TAU, a1 = (k + 1) / 24 * TAU, r0 = fr + 14, r1 = fr + 44;
    face(T, [[X(fx) + Math.cos(a0) * r0, 0.76, Z(fy) + Math.sin(a0) * r0], [X(fx) + Math.cos(a1) * r0, 0.76, Z(fy) + Math.sin(a1) * r0], [X(fx) + Math.cos(a1) * r1, 0.76, Z(fy) + Math.sin(a1) * r1], [X(fx) + Math.cos(a0) * r1, 0.76, Z(fy) + Math.sin(a0) * r1]], [0, 1, 0], gravel); }
  flat(T, X(hx) - 140, Z(fy) + fr + 30, X(hx) + 140, hz0, 0.74, stone);
  T.prism(X(fx), Z(fy), fr * 0.8, 0, 3, white, 16, fr * 0.8, true); disc(G, X(fx), Z(fy), fr * 0.66, 3.2, C('#3fe8ff'), 16); T.prism(X(fx), Z(fy), 2, 3, 14, white, 6); T.prism(X(fx), Z(fy), 7, 14, 16, white, 10, 5, true);
  for (const s of [-1, 1]) for (const z of [Z(fy) - 20, Z(fy) + 30]) { const x = X(fx) + s * (fr + 70); T.prism(x, z, 0.7, 0.8, 18, C('#1d1d24'), 6); box5(G, x - 2, 18, z - 2, x + 2, 21, z + 2, C('#fff3b0')); }   // lamps round the court
  /* the pool terrace behind the house */
  const [px, py, pw, ph] = L.pool, he = Z(hy + hdy / 2);
  flat(T, X(px) - pw / 2 - 30, he, X(px) + pw / 2 + 30, Z(py) + ph / 2 + 20, 0.8, stone); flat(G, X(px) - pw / 2, Z(py) - ph / 2, X(px) + pw / 2, Z(py) + ph / 2, 1.0, C('#3fe8ff'));
  for (let k = 0; k < 6; k++) { const x = X(px) - pw / 2 + 16 + k * (pw - 32) / 5; box5(T, x - 5, 0.8, Z(py) - ph / 2 - 22, x + 5, 3, Z(py) - ph / 2 - 6, white); if (k % 2) { T.prism(x, Z(py) - ph / 2 - 26, 0.6, 0.8, 18, white, 6); T.prism(x, Z(py) - ph / 2 - 26, 14, 16, 20, C(k % 4 === 1 ? '#ff6fae' : '#fff3b0'), 10, 0.5, true); } }
  /* the helipad: a concrete disc, the yellow ring and H, lights round its edge */
  const [cx, cy, cr] = L.heli; disc(T, X(cx), Z(cy), cr, 0.9, C('#9a9890'), 24); for (let k = 0; k < 24; k++) { const a0 = k / 24 * TAU, a1 = (k + 1) / 24 * TAU, r0 = cr - 9, r1 = cr - 5;
    face(G, [[X(cx) + Math.cos(a0) * r0, 1, Z(cy) + Math.sin(a0) * r0], [X(cx) + Math.cos(a1) * r0, 1, Z(cy) + Math.sin(a1) * r0], [X(cx) + Math.cos(a1) * r1, 1, Z(cy) + Math.sin(a1) * r1], [X(cx) + Math.cos(a0) * r1, 1, Z(cy) + Math.sin(a0) * r1]], [0, 1, 0], C('#ffd23f'));
    if (k % 3 === 0) box5(G, X(cx) + Math.cos(a0) * (cr - 2) - 1.5, 0.9, Z(cy) + Math.sin(a0) * (cr - 2) - 1.5, X(cx) + Math.cos(a0) * (cr - 2) + 1.5, 2.6, Z(cy) + Math.sin(a0) * (cr - 2) + 1.5, C('#7fdcff')); }
  /* the garden: a parterre of box hedges round a statue, rose beds, the folly (Sal's tunnel's hatch under it) */
  const gx0 = x0 + 30, gx1 = X(hx - hwx / 2) - 40, gz0 = zz0 + 80, gz1 = zz1 - 40, gcx = (gx0 + gx1) / 2, gcz = (gz0 + gz1) / 2 - 40;
  for (let k = 0; k < 3; k++) { const r = 30 + k * 34; box5(T, gcx - r, 0, gcz - r, gcx + r, 6, gcz - r + 5, hedge); box5(T, gcx - r, 0, gcz + r - 5, gcx + r, 6, gcz + r, hedge);
    box5(T, gcx - r, 0, gcz - r, gcx - r + 5, 6, gcz - 10, hedge); box5(T, gcx - r, 0, gcz + 10, gcx - r + 5, 6, gcz + r, hedge); box5(T, gcx + r - 5, 0, gcz - r, gcx + r, 6, gcz - 10, hedge); box5(T, gcx + r - 5, 0, gcz + 10, gcx + r, 6, gcz + r, hedge); }
  box5(T, gcx - 6, 0, gcz - 6, gcx + 6, 8, gcz + 6, stone); T.prism(gcx, gcz, 2.6, 8, 22, white, 8, 2, true); T.prism(gcx, gcz, 3.4, 22, 26, white, 8, 1, true);   // the statue on its plinth
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU, r = 112 + (k % 3) * 5; T.prism(gcx + Math.cos(a) * r, gcz + Math.sin(a) * r * 0.8, 3, 0.8, 5, C(k % 2 ? '#ff4d8d' : '#ff9ad0'), 7, 2, true); }
  const [fox, foy] = L.folly; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; T.prism(X(fox) + Math.cos(a) * 13, Z(foy) + Math.sin(a) * 13, 1.4, 1, 24, white, 8); }
  T.prism(X(fox), Z(foy), 16, 1, 3, stone, 12, 16, true); T.prism(X(fox), Z(foy), 17, 24, 28, white, 12, 17); T.prism(X(fox), Z(foy), 17, 28, 36, white, 12, 3, true);
  box5(T, X(fox) - 6, 3, Z(foy) - 6, X(fox) + 6, 3.4, Z(foy) + 6, C('#5a4a3a'));             // the iron hatch in the folly's floor
  for (let x = x0 + 40; x < x1 - 30; x += 110) { if (Math.abs(x) > gw / 2 + 60) palm(T, x, zz0 + 30, 26); if (Math.abs(x + 50 - X(D.x)) > 60 && Math.abs(x + 50 - X(px)) > pw / 2 + 50) palm(T, x + 50, zz1 - 30, 24); }
  for (let z = zz0 + 90; z < zz1 - 60; z += 100) { palm(T, x0 + 28, z, 24); palm(T, x1 - 28, z, 25); }
  /* the jetty into the bay, outside the dock gate; a light at its end */
  const jx = X(D.x), jw = D.w / 2, j0 = zz1, j1 = Z(D.y1), wood = C('#8a6a48'), woodD = C('#5a4430');
  box5(T, jx - jw, 0, j0, jx + jw, 2.2, j1, wood); for (let z = j0 + 4; z < j1; z += 6) box5(T, jx - jw, 2.2, z - 0.3, jx + jw, 2.3, z + 0.3, woodD);
  for (let z = j0 + 20; z < j1; z += 30) for (const s of [-1, 1]) T.prism(jx + s * jw, z, 1.3, -6, 4, woodD, 8, 1.3, true);
  T.prism(jx + jw - 3, j1 - 6, 0.6, 2.2, 16, C('#1d1d24'), 6); box5(G, jx + jw - 4.2, 16, j1 - 7.2, jx + jw - 1.8, 18, j1 - 4.8, C('#fff2c2'));
  const m = lmMesh(T, G);
  const sg = fasciaSign('CRANE', '#d4a020', 60, 10); sg.position.set(0, 22, zz0 - 4.6); sg.rotation.y = Math.PI; m.add(sg); m.userData.own.push(sg.material);
  /* the gate's two iron leaves (they swing in), the dock gate's leaf; Crane's helicopter, its rotor its own piece */
  const leaf = sx => { const B = new GeoBuilder(); for (let u = 4; u < gw / 2 - 2; u += 6) box5(B, sx * u - 0.8, 1, -1, sx * u + 0.8, 26, 1, C('#16161c')); box5(B, 0, 2, -1.2, sx * (gw / 2 - 2), 4, 1.2, C('#16161c')); box5(B, 0, 22, -1.2, sx * (gw / 2 - 2), 24, 1.2, C('#16161c'));
    for (let u = 4; u < gw / 2 - 2; u += 6) box5(B, sx * u - 1, 26, -1, sx * u + 1, 28, 1, C('#d4a020'));
    const g = new THREE.Group(), mm = new THREE.Mesh(mergeBuilders([B]), LM_MAT); g.add(mm); g.position.set(-sx * gw / 2, 0, zz0 + t / 2); return g; };
  m.userData.leaves = [leaf(1), leaf(-1)]; for (const l of m.userData.leaves) m.add(l);
  const DB = new GeoBuilder(); for (let u = -D.gw / 2 + 3; u < D.gw / 2 - 2; u += 5) box5(DB, u - 0.6, 1, -0.8, u + 0.6, 18, 0.8, C('#16161c')); box5(DB, -D.gw / 2, 15, -1, D.gw / 2, 17, 1, C('#16161c'));
  const dl = new THREE.Mesh(mergeBuilders([DB]), LM_MAT); dl.position.set(jx, 0, zz1 - t / 2); m.add(dl); m.userData.dockLeaf = dl;
  const heli = makeCraneHeli(); heli.position.set(X(cx), 1, Z(cy)); m.add(heli); m.userData.heli = heli;
  return m;
}
function makeCraneHeli() {                // Crane's helicopter: black with a gold stripe, skids, the rotor a piece of its own (M30: it won't start)
  const B = new GeoBuilder(), C = _C, blk = C('#16161c'), gold = C('#d4a020'), glass = C('#3a5a7a');
  box5(B, -20, 6, -9, 16, 20, 9, blk); box5(B, 16, 6, -7, 26, 17, 7, glass); box5(B, -20, 20, -5, 6, 23, 5, blk);
  box5(B, -20, 12, -9.3, 16, 14, 9.3, gold); box5(B, -56, 13, -2, -20, 17, 2, blk); box5(B, -60, 13, -0.6, -52, 26, 0.6, blk); box5(B, -59, 18, -6, -55, 20, 6, gold);
  for (const s of [-1, 1]) { box5(B, -18, 0, s * 10 - 1, 20, 1.6, s * 10 + 1, C('#3a3d47')); for (const x of [-10, 10]) box5(B, x - 0.6, 1.6, s * 9 - 0.6, x + 0.6, 6, s * 9 + 0.6, C('#3a3d47')); }
  const g = new THREE.Group(); g.add(new THREE.Mesh(mergeBuilders([B]), LM_MAT));
  const R = new GeoBuilder(); box5(R, -48, 0, -1.6, 48, 0.8, 1.6, C('#2a2d36')); box5(R, -1.6, 0, -48, 1.6, 0.8, 48, C('#2a2d36')); R.prism(0, 0, 2.4, -2, 1.4, C('#3a3d47'), 8);
  const rotor = new THREE.Mesh(mergeBuilders([R]), LM_MAT); rotor.position.set(-2, 24, 0); g.add(rotor); g.userData.rotor = rotor; return g;
}
function makeOldBoathouse(bw, bd) {       // weathered boards on stilts, a tin roof, the boat doors to the water (west), a plain door to the land (east)
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, hw = bw / 2, hd = bd / 2, wood = C('#7a6048'), woodD = C('#4a3a2a'), tin = C('#8a8f99');
  box5(T, -hw, 0, -hd, hw, 22, hd, wood); for (let x = -hw + 4; x < hw; x += 6) box5(T, x - 0.4, 0, -hd - 0.3, x + 0.4, 22, hd + 0.3, woodD);
  for (const s of [-1, 1]) face(T, [[-hw - 3, 22, s * (hd + 3)], [hw + 3, 22, s * (hd + 3)], [hw + 3, 32, 0], [-hw - 3, 32, 0]], [0, 0.7, s * 0.7], tin);
  box5(T, -hw - 0.6, 2, -hd + 8, -hw + 0.4, 18, hd - 8, C('#3a2a1e')); box5(T, hw - 0.4, 0, -6, hw + 0.6, 15, 6, C('#5a3a22'));   // the boat doors; the land door
  box5(G, hw + 0.6, 16, -2, hw + 1.2, 19, 2, C('#ffd98a'));
  for (const [x, z] of [[-hw, -hd], [-hw, hd], [0, -hd], [0, hd]]) T.prism(x, z, 1.4, -8, 0, woodD, 6, 1.4, true);
  return lmMesh(T, G);
}
function makeMansion(S) {                 // the frame's +z is the front (north); the upper shell and the roof fade while you are inside
  const T = new GeoBuilder(), G = new GeoBuilder(), U = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = EST_WT, low = 16, P2 = S.P2, [dz0, dz1] = S.dz;
  const white = C('#f6f2ea'), terra = C('#c8664a'), marble = C('#f0ece4'), marbleD = C('#d8d2c4'), oak = C('#9a6a3a'), oakD = C('#7a5028'), gold = C('#d4a020'), red = C('#8a2a2a'), dark = C('#2a2d36');
  for (let i = 0; i < 2 * P2 / 14; i++) for (let j = 0; j < 2 * hd / 14; j++) flat(T, -P2 + i * 14, -hd + j * 14, Math.min(P2, -P2 + i * 14 + 14), Math.min(hd, -hd + j * 14 + 14), 1.2, (i + j) % 2 ? marble : marbleD);   // the hall's marble
  flat(T, P2, -hd, hw, hd, 1.2, oak); for (let x = P2 + 6; x < hw; x += 8) flat(T, x, -hd, x + 0.6, hd, 1.25, oakD);   // the study's boards
  flat(T, -hw, -hd, -P2, hd, 1.2, C('#d8c8a8')); flat(G, -hw * 0.82, -hd * 0.55, -P2 - 24, hd * 0.55, 1.3, C('#f4e8c8'));   // the ballroom's floor and its polished dance floor
  flat(T, -EST_DW / 2 - 4, 10, EST_DW / 2 + 4, hd, 1.3, red);                                // the runner from the door
  const wall = (x0, z0, x1, z1) => { box5(T, x0, 0, z0, x1, low, z1, white); box5(U, x0, low, z0, x1, H, z1, white); };
  wall(-hw, -hd, hw, -hd + W); wall(-hw, -hd, -hw + W, hd); wall(hw - W, -hd, hw, hd); wall(-hw, hd - W, -EST_DW / 2, hd); wall(EST_DW / 2, hd - W, hw, hd);
  box5(U, -EST_DW / 2, 30, hd - W, EST_DW / 2, H, hd, white); box5(T, -EST_DW / 2, 26, hd - W, EST_DW / 2, 30, hd, white);
  for (const s of [-1, 1]) { box5(T, s * P2 - 2, 0, -hd, s * P2 + 2, low, dz0, white); box5(T, s * P2 - 2, 0, dz1, s * P2 + 2, low, hd, white); }   // the partitions (low: you see over them)
  for (const z of [-hd, hd - W]) for (let x = -hw + 30; x < hw - 30; x += 44) if (Math.abs(x) > EST_DW) box5(U, x - 9, 22, z - 0.4, x + 9, 44, z + W + 0.4, C('#ffd98a'));   // the tall windows, lit
  for (const x of [-hw, hw - W]) for (let z = -hd + 40; z < hd - 30; z += 50) box5(U, x - 0.4, 22, z - 9, x + W + 0.4, 44, z + 9, C('#ffd98a'));
  box5(U, -hw - 3, H, -hd - 3, hw + 3, H + 3, hd + 3, terra); box5(U, -hw * 0.6, H + 3, -hd * 0.55, hw * 0.6, H + 14, hd * 0.55, terra);   // the tiled roof
  /* the portico: four columns, the steps, the lanterns */
  for (const x of [-46, -20, 20, 46]) { T.prism(x, hd + 14, 3.2, 0, 40, white, 12); box5(T, x - 4.5, 0, hd + 9.5, x + 4.5, 2, hd + 18.5, marbleD); }
  box5(U, -54, 40, hd, 54, 46, hd + 22, white); for (let k = 0; k < 3; k++) box5(T, -40 + k * 3, 0, hd + 22 + k * 4, 40 - k * 3, 2 + k * 1.2, hd + 26 + k * 4, marble);
  for (const s of [-1, 1]) box5(G, s * 30 - 2, 30, hd + 0.4, s * 30 + 2, 36, hd + 1.2, C('#fff3b0'));
  /* the hall: the staircase up to a landing, the chandelier, two statues */
  for (let k = 0; k < 8; k++) box5(T, -34, 0, -hd + W + 30 - k * 3, 34, 3 + k * 3, -hd + W + 33 - k * 3, k % 2 ? marble : marbleD);
  box5(T, -36, 24, -hd + W, 36, 26, -hd + W + 10, marbleD); for (const s of [-1, 1]) box5(T, s * 36 - 1.5, 0, -hd + W, s * 36 + 1.5, 30, -hd + W + 34, gold);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; box5(G, Math.cos(a) * 14 - 1.4, 46, 30 + Math.sin(a) * 14 - 1.4, Math.cos(a) * 14 + 1.4, 49, 30 + Math.sin(a) * 14 + 1.4, C('#fff8d8')); }
  T.prism(0, 30, 2, 49, 54, gold, 8);
  for (const s of [-1, 1]) { box5(T, s * 60 - 5, 0, 90, s * 60 + 5, 8, 100, marbleD); T.prism(s * 60, 95, 2.4, 8, 24, white, 8, 1.6, true); T.prism(s * 60, 95, 3.2, 24, 28, white, 8, 1, true); }
  /* the study: the desk and chair, the bookshelves, the safe, a globe, the rug */
  const dx = hw * 0.62; flat(T, dx - 50, -90, dx + 50, 10, 1.3, red); box5(T, dx - 28, 0, -47, dx + 28, 12, -25, oakD); box5(T, dx - 29, 12, -48, dx + 29, 13, -24, C('#3a2a1a'));
  box5(G, dx - 10, 13, -40, dx - 2, 18, -36, C('#3aff9a')); box5(T, dx - 6, 0, -62, dx + 6, 14, -52, C('#5a2a1a'));
  for (let z = -hd + W + 6; z < hd - W - 20; z += 18) { box5(T, hw - W - 10, 0, z, hw - W, 34, z + 16, oakD); for (let y = 4; y < 34; y += 7) box5(G, hw - W - 10.4, y, z + 1, hw - W - 9.8, y + 5, z + 15, C(pick(['#8a2a2a', '#2a4aa8', '#2a6a3a', '#d4a020']))); }
  box5(T, hw - W - 24, 0, -hd + W, hw - W - 2, 26, -hd + W + 22, C('#5a606a')); box5(T, hw - W - 18, 10, -hd + W + 21.8, hw - W - 8, 16, -hd + W + 22.4, C('#9aa0ab'));   // the safe
  T.prism(P2 + 30, -hd + 30, 1, 0, 10, oakD, 6); T.prism(P2 + 30, -hd + 30, 7, 10, 22, C('#2a6aa8'), 10, 7);
  /* the ballroom: the bar with its bottles, the grand piano, round tables, a mirror wall */
  box5(T, -hw + 11, 0, -90, -hw + 25, 13, 30, C('#3a2a3a')); box5(T, -hw + 10, 13, -91, -hw + 26, 14, 31, gold);
  for (let z = -86; z < 26; z += 6) box5(G, -hw + W + 1, 18, z, -hw + W + 3, 26 + (z % 4), z + 3, C(pick(['#3aff9a', '#ffd23f', '#ff6fae', '#7fdcff'])));
  const px = -hw * 0.55, pz = -hd + 40; box5(T, px - 22, 9, pz - 13, px + 22, 13, pz + 13, C('#0c0c10')); for (const [a, b] of [[-18, -9], [18, -9], [0, 10]]) T.prism(px + a, pz + b, 1.2, 0, 9, C('#0c0c10'), 6);
  box5(T, px - 18, 13, pz + 8, px + 18, 14, pz + 13, C('#f4f4f4'));
  for (const [x, z] of [[-P2 - 50, 70], [-hw + 70, 100], [-P2 - 60, -100]]) { T.prism(x, z, 9, 0, 9, C('#f4f4f4'), 12); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; box5(T, x + Math.cos(a) * 14 - 3, 0, z + Math.sin(a) * 14 - 3, x + Math.cos(a) * 14 + 3, 7, z + Math.sin(a) * 14 + 3, gold); } }
  for (let k = 0; k < 3; k++) { const z = -60 + k * 60; for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; box5(G, -hw * 0.55 + Math.cos(a) * 10 - 1.2, 46, z + Math.sin(a) * 10 - 1.2, -hw * 0.55 + Math.cos(a) * 10 + 1.2, 48, z + Math.sin(a) * 10 + 1.2, C('#fff8d8')); } }
  for (const [x, z] of [[P2 + 10, hd - 20], [-P2 - 10, hd - 20], [hw - 20, hd - 20], [-hw + 20, hd - 20]]) { T.prism(x, z, 4, 0, 6, C('#c86a3a'), 8, 3, true); T.prism(x, z, 7, 6, 18, C('#2f9a5a'), 7, 2, true); }
  const m = lmMesh(T, G);
  const top = fasciaSign('CRANE', '#d4a020', 120, 22); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 15, 0);
  spaceFade(S, m, U, [top]); return m;
}

/* ---------- every frame of play (js/15): the gates, the door, the guards' patience ---------- */
function estateTick(dt) {
  const E = ESTATE; if (!E.L) return;
  const ms = E.ms, me = P.car || P;
  E.gate.open = clamp(E.gate.open + (ms && ms.gate ? 1 : -1) * dt * 0.7, 0, 1); E.gate.solid.off = E.gate.open > 0.8;
  E.dock.open = clamp(E.dock.open + (ms && ms.dock ? 1 : -1) * dt * 0.9, 0, 1); E.dock.solid.off = E.dock.open > 0.8;
  const S = E.house; if (S) { const o = !!(ms && ms.doors && feat('mansionInside')); S.open = o ? 1 : 0; S.ds.off = o; }
  if (!feat('estate') || (ms && ms.hold)) { warnOff('estate'); E.warnT = 0; return; }
  if (!ms && !P.dead && state === 'play' && dist(me.x, me.y, E.gate.out.x, E.gate.out.y) < 120 && gameT > E.sayT) { E.sayT = gameT + 10; toast('PRIVATE PROPERTY - CRANE DEVELOPMENT'); }
  const inside = !P.dead && state === 'play' && estIn(me.x, me.y, -4);
  if (inside) {
    E.outT = 0;
    if (RAMP.on || ms) { E.warnT = 0; warnOff('estate'); }
    else if (!E.alarm) { E.warnT += dt; const n = Math.max(0, Math.ceil(PLC.estateWarn - E.warnT)); warnSet('estate', 'PRIVATE PROPERTY<br><small>LEAVE NOW ' + n + '</small>'); if (E.warnT >= PLC.estateWarn) estateAlarm(); }
    else warnOff('estate');
  } else {
    E.warnT = 0; warnOff('estate');
    if (E.alarm && (E.outT += dt) > PLC.estateCalm) estateCalm();
  }
}
function estateAlarm() {                  // the guards draw: a shot or a blast inside, someone hurt there, or you stayed too long
  const E = ESTATE; if (!estOn() || RAMP.on || (E.ms && E.ms.hold)) return;
  if (!E.alarm) { toast("CRANE'S GUARDS ARE AFTER YOU", true); Snd.tone(440, 880, 0.5, 0.12, 'sawtooth'); if (PLC.estateStars > 0) forceWanted(PLC.estateStars); }
  E.alarm = true; E.outT = 0;
  for (const p of peds) if (p.eguard && !p.dead) provoke(p);
}
const estateHurt = (x, y) => { if (estIn(x, y, -2)) estateAlarm(); };
function estateCalm() { ESTATE.alarm = false; ESTATE.outT = 0; for (const p of peds) if (p.eguard && !p.dead && p.hostile) { p.hostile = false; p.hostT = 0; p.state = 'post'; } }
function estateReset() { const E = ESTATE; E.ms = null; E.alarm = false; E.warnT = 0; E.outT = 0; if (E.gate) E.gate.open = 0; if (E.dock) E.dock.open = 0; if (E.house) E.house.roof = 1; if (E.heli) { E.heli.spin = 0; E.heli.rot = 0; } }

/* ---------- js/13: the leaves swing, the mansion's shell fades, the rotor turns when it is told to ---------- */
let estT = 0;
function gfxEstate(time) {
  const dt = Math.min(0.1, Math.max(0, time - estT)); estT = time;
  const E = ESTATE; if (!E.L) return;
  const m = E.lm && E.lm.mesh;
  if (m && m.userData.leaves) {
    const a = E.gate.open * Math.PI / 2 * 0.95; m.userData.leaves[0].rotation.y = -a; m.userData.leaves[1].rotation.y = a;
    m.userData.dockLeaf.position.x = E.dock.x - E.L.x + E.dock.open * (E.dock.w + 4);
    const H = E.heli; H.rot += H.spin * dt * 24; m.userData.heli.userData.rotor.rotation.y = H.rot;
  }
  const S = E.house, me = P.car || P;
  if (S && S.fade && S.lm.mesh) {
    const inside = !P.dead && estHouseIn(me.x, me.y, -6); S.roof += ((inside ? 0.08 : 1) - S.roof) * Math.min(1, dt * 6);
    if (Math.abs(S.roof - S.fade.op) > 0.003) { S.fade.op = S.roof; for (const mm of S.fade.mats) { mm.transparent = true; mm.opacity = S.roof; mm.depthWrite = S.roof > 0.97; } for (const mm of S.fade.meshes) mm.visible = S.roof > 0.03; }
  }
}
