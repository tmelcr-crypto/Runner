'use strict';
/* ---------- 7zj. THE SPACE CENTER'S WAY IN, ITS INSIDES, THE FUEL TRUCK, THE ROCKET (the Space line's shared pieces) ----------
   The gate (modes: spaceEntry): its steel leaf slides open for you within a few metres when you may go in - wearing the LAB COAT or the
   FLIGHT SUIT, with Iris' pass (STORY / MISSIONS TEST after S1), or while a Space quest lets you in (SPACE.ms.in) - and shuts behind you.
   Otherwise the guards turn you away: AUTHORIZED PERSONNEL ONLY.
   The assembly building's CLEAN ROOM and LAUNCH CONTROL (modes: spaceInside) are the top-down kind: their own walls with a door to the
   road; the roof and the upper walls turn see-through while you are inside. Open by day with their staff (places table, Space center).
   Each site, in its own frame (front +z = the door, toward the road): { kind, cx, cy, a, ca, sa, hw, hd, H, door, inside, ds (the door's
   solid), spots, lm, fade }. The FUEL TRUCK (modes: fuelTruck) stands by launch control's road. The rocket on the pad is its own piece:
   hidden after the launch (modes: launchEmpty), lifted by the launch cutscene (S8: SPACE.launch). */
const SPACE = { gate: null, vab: null, lcc: null, fuel: { car: null, gone: -1e9 }, rocket: null, launch: null, ms: null, sayT: 0 };
const SPX_WT = 5, SPX_DW = 26;
const spaceWear = () => !!P.outfit && (P.outfit.top === 'lab_coat' || P.outfit.top === 'flight_suit');
const spaceAllowed = () => feat('spaceEntry') && (spaceWear() || !!MS_UNLOCK.spacePass || !!(SPACE.ms && SPACE.ms.in));
const spaceOpenHours = () => SKY.hour >= PLC.spaceOpen && SKY.hour < PLC.spaceClose;
const spaceWorld = (S, lx, lz, out) => ixWorld(S, lx, lz, out);
function spaceIn(S, x, y, m) { if (!S) return false; const q = ixLocal(S, x, y, {}); return Math.abs(q.x) < S.hw - SPX_WT - (m || 0) && q.z > -S.hd + SPX_WT + (m || 0) && q.z < S.hd - SPX_WT - (m || 0); }
const rocketGone = () => feat('launchEmpty') && !!MS_UNLOCK.launched;

/* ---------- built with the city (js/10g genPlaces, the space center's part) ---------- */
function genSpaceGate(g) {                // the gate's solid and its model (the leaf a piece of its own, to slide)
  const G = SPACE.gate = { g, open: 0, solid: makeSolid(g.x, g.y, 14, g.w, 0, { opens: true }), lm: null };   // opens: a gate (the guide line's way on foot goes through, js/08p)
  G.lm = { cx: g.x, cy: g.y, a: 0, rad: Math.hypot(30, g.w / 2), make: () => makeSpaceGate(), mesh: null }; LMS.push(G.lm); LM_CLEAR.push([g.x, g.y, 50, g.w / 2 + 20]);
}
function spaceSite(kind, cx, cy, wx, wy) {   // wx, wy: the building's size east-west and north-south; its door faces east (the road)
  const S = { kind, cx, cy, a: -Math.PI / 2, ca: 0, sa: -1, hw: wy / 2, hd: wx / 2, H: kind === 'vab' ? 210 : 36, roof: 1, open: 0, spots: {}, lm: null, i: kind === 'vab' ? 0 : 1 };
  const W = SPX_WT, { hw, hd } = S, sol = (lx, lz, w, d, ex) => { const p = spaceWorld(S, lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, d), S.a, Object.assign({ bld: true, ixw: true }, ex || {})); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  for (const s of [-1, 1]) sol(s * (hw + SPX_DW / 2) / 2, hd - W / 2, hw - SPX_DW / 2, W);
  S.ds = sol(0, hd - W / 2, SPX_DW + 2, W + 2, { ixDoor: true });
  S.door = spaceWorld(S, 0, hd + 16); S.inside = spaceWorld(S, 0, hd - 22);
  S.dw = SPX_DW; S.px = null; S.pOpen = 0;                         // castWay's door fields (js/08zz): the one door in the front wall
  const post = (lx, lz, a, shirt, pants) => { const w = spaceWorld(S, lx, lz);
    addPost({ x: w.x, y: w.y, a: S.a + a, kind: 'spacestaff', back: 200, need: () => feat('spaceInside') && spaceOpenHours() && !(SPACE.ms && SPACE.ms.hold), step: standStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt, pants, ang: po.a }); return p; } }); };
  if (kind === 'vab') {                                            // the clean room: the rocket stage on its cradles down the middle, scaffolds, benches, lockers by the door
    S.stage = { x0: -24, x1: 24, z0: -125, z1: 65 }; sol(0, -30, 48, 190);
    for (const s of [-1, 1]) { sol(s * 52, -60, 8, 70); sol(s * (hw - 14), -40, 20, 120); }   // the scaffolds; the benches along the walls
    sol(-hw + 10, hd - 50, 12, 60);                                // the lockers, left of the door
    S.spots = { bay: spaceWorld(S, 34, 74), panel: spaceWorld(S, 26, 66), lockers: spaceWorld(S, -hw + 26, hd - 50), engine: spaceWorld(S, 0, -140),
      benchL: spaceWorld(S, -(hw - 30), -40), benchR: spaceWorld(S, hw - 30, -40), mid: spaceWorld(S, 0, 100) };
    for (const [lx, lz, a] of [[-34, 20, Math.PI / 2], [34, -70, -Math.PI / 2], [-(hw - 30), -60, 0], [hw - 30, 0, Math.PI]]) post(lx, lz, a, '#f4f6f8', '#e8ecf0');   // workers in white suits
  } else {                                                         // launch control: three rows of consoles facing the windows (south), the big screen over them
    S.rows = [-22, -2, 18].map(lx => ({ lx, z0: -hd + 22, z1: hd - 50 }));
    for (const r of S.rows) { sol(r.lx, (r.z0 + r.z1) / 2 - 22, 6, (r.z1 - r.z0) / 2 - 18); sol(r.lx, r.z1 - (r.z1 - r.z0) / 4 + 6, 6, (r.z1 - r.z0) / 2 - 18); }   // each row in two runs, an aisle between
    S.spots = { iris: spaceWorld(S, -30, -10), screen: spaceWorld(S, -hw + 10, -10), back: spaceWorld(S, hw - 16, -hd + 30), mid: spaceWorld(S, 8, hd - 34) };
    for (const [lx, lz] of [[-28, -60], [-28, 40], [-8, -90], [-8, 10], [12, -40], [12, 60]]) post(lx, lz, Math.PI / 2, '#eef2f6', '#2a2d3a');   // the controllers at their consoles
  }
  S.lm = { cx, cy, a: S.a, rad: Math.hypot(hw, hd) + 60, make: () => withSeed(7000 + S.i * 31, () => kind === 'vab' ? makeCleanRoom(S) : makeLaunchControl(S)), mesh: null };
  LMS.push(S.lm); LM_CLEAR.push([cx, cy, wx / 2 + 8, wy / 2 + 8]);
  SPACE[kind] = S; return S;
}
function spaceFade(S, m, U, extra) {      // the upper shell and the roof as a mesh of their own that fades while you are inside
  const mat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), u = new THREE.Mesh(mergeBuilders([U]), [mat]); m.add(u);
  const own = m.userData.own; own.push(mat); for (const e of extra || []) { m.add(e); own.push(e.material); }
  S.fade = { mats: [mat, ...(extra || []).map(e => e.material)], meshes: [u, ...(extra || [])], op: -1 };
}
function makeCleanRoom(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), U = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = SPX_WT, low = 16;
  const white = C('#e4e6ea'), tile = C('#eef0f2'), tileD = C('#d8dce2'), steel = C('#9aa0ab'), blue = C('#2a4aa8'), dark = C('#2a2d36');
  for (let i = 0; i < 2 * hw / 20; i++) for (let j = 0; j < 2 * hd / 20; j++) flat(T, -hw + i * 20, -hd + j * 20, Math.min(hw, -hw + i * 20 + 20), Math.min(hd, -hd + j * 20 + 20), 1.2, (i + j) % 2 ? tile : tileD);   // over the space center's lawn
  const wall = (x0, z0, x1, z1) => { box5(T, x0, 0, z0, x1, low, z1, white); box5(U, x0, low, z0, x1, H, z1, white); };
  wall(-hw, -hd, hw, -hd + W); wall(-hw, -hd, -hw + W, hd); wall(hw - W, -hd, hw, hd); wall(-hw, hd - W, -SPX_DW / 2, hd); wall(SPX_DW / 2, hd - W, hw, hd);
  box5(U, -SPX_DW / 2, 30, hd - W, SPX_DW / 2, H, hd, white); box5(T, -SPX_DW / 2, 22, hd - W, SPX_DW / 2, 30, hd, white);   // over the door
  box5(G, -SPX_DW / 2 - 4, 22, hd + 0.2, SPX_DW / 2 + 4, 25, hd + 0.8, C('#2bf3ff'));
  for (const s of [-1, 1]) face(U, [[s * hw * 0.45 - 34, 0, -hd - 0.4], [s * hw * 0.45 + 34, 0, -hd - 0.4], [s * hw * 0.45 + 34, H * 0.9, -hd - 0.4], [s * hw * 0.45 - 34, H * 0.9, -hd - 0.4]], [0, 0, -1], C('#5a6070'));   // the tall doors toward the pad
  for (let x = -hw + 20; x < hw - 20; x += 14) face(U, [[x, low + 4, hd + 0.3], [x + 3, low + 4, hd + 0.3], [x + 3, H - 10, hd + 0.3], [x, H - 10, hd + 0.3]], [0, 0, 1], C('#c4c8d0'));   // panel lines
  flat(U, -hw - 2, -hd - 2, hw + 2, hd + 2, H + 0.4, C('#b8bcc6'));                          // the roof
  /* the rocket stage on its cradles, the engine bell at the back, the guidance bay open at the front */
  const st = S.stage, cyl = (z0, z1, r, col) => { for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU, y = 26; face(T, [[Math.cos(a0) * r, y + Math.sin(a0) * r, z0], [Math.cos(a1) * r, y + Math.sin(a1) * r, z0], [Math.cos(a1) * r, y + Math.sin(a1) * r, z1], [Math.cos(a0) * r, y + Math.sin(a0) * r, z1]], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], col); } };
  cyl(st.z0 + 10, st.z1, 20, C('#f4f4f4')); cyl(st.z0, st.z0 + 10, 15, dark); for (const z of [-60, 0, 40]) cyl(z, z + 3, 20.4, C('#1c1c22'));
  box5(G, -3, 44, 20, 3, 46.4, 40, blue);                                                   // the stage's blue band on top
  for (const z of [-95, -25, 35]) { box5(T, -26, 0, z - 4, 26, 10, z + 4, blue); box5(T, -22, 10, z - 3, 22, 12, z + 3, steel); }
  box5(T, 14, 18, 56, 28, 34, 68, C('#3a3d47')); box5(G, 16, 22, 67.8, 26, 32, 68.4, C('#3aff9a'));   // the guidance bay's open panel and its lit boards
  box5(T, 30, 0, 68, 46, 14, 82, steel); box5(G, 32, 14, 70, 44, 15, 80, C('#2bf3ff'));        // the workbench by it
  for (const s of [-1, 1]) for (let y = 0; y < 60; y += 15) { box5(T, s * 52 - 4, y, -95, s * 52 + 4, y + 2, -25, C('#ffd23f')); for (const z of [-95, -60, -25]) box5(T, s * 52 - 1, y, z - 1, s * 52 + 1, y + 15, z + 1, C('#c8a020')); }   // the yellow scaffolds
  for (const s of [-1, 1]) { box5(T, s * (hw - 14) - 10, 0, -100, s * (hw - 14) + 10, 12, 20, steel); for (let z = -95; z < 20; z += 20) box5(G, s * (hw - 14) - 6, 12, z, s * (hw - 14) + 6, 13, z + 8, C('#cfe6ff')); }   // the benches with their screens
  for (let z = hd - 78; z < hd - 22; z += 8) { box5(T, -hw + 4, 0, z, -hw + 16, 26, z + 7.4, C('#7a8aa0')); box5(G, -hw + 16, 18, z + 3, -hw + 16.4, 20, z + 4.4, C('#c8ccd4')); }   // the lockers
  for (let x = -hw + 30; x < hw - 20; x += 12) box5(G, x, 46, hd - 60, x + 6, 48, hd - 59, C('#d8f0ff'));   // the plastic curtain strips across the clean area
  for (let x = -hw + 40; x < hw - 30; x += 60) for (let z = -hd + 40; z < hd - 30; z += 60) box5(G, x - 8, 56, z - 1.5, x + 8, 57, z + 1.5, C('#fffbe0'));   // lamps
  const m = lmMesh(T, G);
  const sg = signMesh('BAY SPACE CENTER', '#2bf3ff', 230, 46); sg.position.set(0, H - 40, hd + 2); sg.rotation.y = 0;
  const top = fasciaSign('CLEAN ROOM', '#f4f6f8', 2 * hw - 60, 30); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 2, 0);
  spaceFade(S, m, U, [sg, top]); return m;
}
function makeLaunchControl(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), U = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = SPX_WT, low = 12;
  const white = C('#e8e8ec'), carpet = C('#2a3550'), dark = C('#1c1e26'), con = C('#3a3d47');
  flat(T, -hw, -hd, hw, hd, 1.2, carpet);
  const wall = (x0, z0, x1, z1) => { box5(T, x0, 0, z0, x1, low, z1, white); box5(U, x0, low, z0, x1, H, z1, white); };
  wall(-hw, -hd, hw, -hd + W); wall(hw - W, -hd, hw, hd); wall(-hw, hd - W, -SPX_DW / 2, hd); wall(SPX_DW / 2, hd - W, hw, hd);
  box5(T, -hw, 0, -hd, -hw + W, low, hd, white); box5(U, -hw, low, -hd, -hw + W, 18, hd, white); box5(G, -hw - 0.4, 18, -hd + 8, -hw + W, 30, hd - 8, C('#3fe0ff')); box5(U, -hw, 30, -hd, -hw + W, H, hd, white);   // the window band toward the pad
  box5(U, -SPX_DW / 2, 22, hd - W, SPX_DW / 2, H, hd, white);
  flat(U, -hw - 3, -hd - 3, hw + 3, hd + 3, H + 0.4, C('#9aa0ab'));
  for (const r of S.rows) for (const [z0, z1] of [[r.z0, (r.z0 + r.z1) / 2 - 22 + ((r.z1 - r.z0) / 2 - 18) / 2], [r.z1 - (r.z1 - r.z0) / 4 + 6 - ((r.z1 - r.z0) / 2 - 18) / 2, r.z1]]) {
    box5(T, r.lx - 3, 0, z0, r.lx + 3, 9, z1, con); box5(T, r.lx - 4, 9, z0, r.lx - 1, 13, z1, dark);
    for (let z = z0 + 3; z < z1 - 6; z += 11) { box5(G, r.lx - 3.6, 10, z, r.lx - 3.2, 13, z + 7, C(pick(['#3aff9a', '#2bf3ff', '#ffd23f']))); box5(T, r.lx + 4, 0, z + 2, r.lx + 8, 6, z + 6, C('#14161d')); }   // the screens; the chairs
  }
  box5(G, -hw + W + 0.4, 14, -hd + 30, -hw + W + 1, 30, hd - 60, C('#0f2a3a')); for (let k = 0; k < 6; k++) box5(G, -hw + W + 1.1, 18 + (k % 3) * 4, -hd + 40 + k * 26, -hw + W + 1.4, 20 + (k % 3) * 4, -hd + 60 + k * 26, C(['#3aff9a', '#ff3b4a', '#2bf3ff'][k % 3]));   // the big screen under the windows
  box5(T, hw - 30, 0, -hd + 14, hw - 8, 10, -hd + 46, C('#5a4a3a'));                          // the coffee bar at the back
  const m = lmMesh(T, G);
  const band = fasciaSign('LAUNCH CONTROL', '#2bf3ff', Math.min(2 * hd - 16, fasciaFit('LAUNCH CONTROL', 9, 999)), 9); band.position.set(-hw - 0.6, 6, 0); band.rotation.y = -Math.PI / 2;
  const top = fasciaSign('LAUNCH CONTROL', '#f4f6f8', 2 * hd - 40, 22); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 2, 0);
  spaceFade(S, m, U, [band, top]); return m;
}
function makeSpaceGate() {                // the pillars, the crossbar and the booth fixed; the steel leaf its own mesh (it slides along the fence)
  const T = new GeoBuilder(), G = new GeoBuilder(), L = new GeoBuilder();
  for (const s of [-1, 1]) box5(T, -6, 0, s * 70 - 6, 6, 40, s * 70 + 6, _C('#c8ccd4'));
  box5(L, -2, 2, -64, 2, 34, 64, _C('#7a808c')); for (let z = -60; z <= 60; z += 12) box5(L, -2.5, 2, z - 1, 2.5, 34, z + 1, _C('#5a606a'));
  box5(G, -8, 40, -72, 8, 43, -68, _C('#ff3b5c')); box5(G, -8, 40, 68, 8, 43, 72, _C('#ff3b5c'));
  box5(T, -3, 34, -64, 3, 44, 64, _C('#c8ccd4'));
  const m = withBand(lmMesh(T, G), 'AUTHORIZED PERSONNEL ONLY', '#ff3b5c', 120, 8, 3.3, 39, 0, Math.PI / 2);
  const leaf = new THREE.Mesh(mergeBuilders([L]), LM_MAT); m.add(leaf); m.userData.leaf = leaf; return m;
}

/* ---------- every frame of play (js/15): the gate, the doors, the fuel truck ---------- */
function spaceTick(dt) {
  const G = SPACE.gate; if (!G) return;
  const me = P.car || P, g = G.g, near = Math.abs(me.x - g.x) < PLC.gateReach + 40 && Math.abs(me.y - g.y) < g.w / 2 + 60;
  const want = !!(SPACE.ms && SPACE.ms.gate) || (near && spaceAllowed());
  G.open = clamp(G.open + (want ? 1 : -1) * dt * 0.8, 0, 1); G.solid.off = G.open > 0.8;
  if (near && !want && feat('spaceGuards') && gameT > SPACE.sayT && Math.abs(me.x - g.x) < 160) { SPACE.sayT = gameT + 8; toast('AUTHORIZED PERSONNEL ONLY - A PASS, A LAB COAT OR A FLIGHT SUIT'); }
  for (const S of [SPACE.vab, SPACE.lcc]) if (S) { const o = !!(SPACE.ms && SPACE.ms.doors) || (feat('spaceInside') && spaceOpenHours()); S.open = o ? 1 : 0; S.ds.off = o; }
  fuelTick();
}
function fuelTick() {                     // the FUEL TRUCK by launch control's road: taken or wrecked, another one later (out of sight)
  const F = SPACE.fuel; if (!feat('fuelTruck') || !CAR_TYPES.fueltruck || !SPACEM || (SPACE.ms && SPACE.ms.noFuel)) return;
  const [x, y] = SPACE.fuelAt, c = F.car;
  if (c && (c.dead || !cars.includes(c) || (c.driver && c.driver !== 'ai') || dist(c.x, c.y, x, y) > 400)) { F.gone = c.dead || cars.includes(c) ? gameT : -1e9; F.car = null; }
  if (F.car || dist(P.x, P.y, x, y) > 1900 || (F.gone > -1e8 && (gameT - F.gone < PLC.fuelBack || !offScreen(x, y)))) return;
  if (cars.some(o => dist(o.x, o.y, x, y) < 60)) return;
  const t = makeCar('fueltruck', x, y, -Math.PI / 2, null, '#f4f6f8'); t.searched = true; cars.push(t); F.car = t; F.gone = -1e9;
}
function spaceReset() { SPACE.ms = null; SPACE.fuel = { car: null, gone: -1e9 }; SPACE.launch = null; for (const S of [SPACE.vab, SPACE.lcc]) if (S) S.roof = 1; if (SPACE.gate) SPACE.gate.open = 0; }

/* ---------- js/13: the gate's leaf, the fading shells, the rocket ---------- */
let spaceT = 0;
function gfxSpace(time) {
  const dt = Math.min(0.1, Math.max(0, time - spaceT)); spaceT = time;
  const G = SPACE.gate; if (G && G.lm.mesh && G.lm.mesh.userData.leaf) G.lm.mesh.userData.leaf.position.z = G.open * 126;
  const me = P.car || P;
  for (const S of [SPACE.vab, SPACE.lcc]) {
    if (!S || !S.fade || !S.lm.mesh) continue;
    const inside = !P.dead && spaceIn(S, me.x, me.y, -6); S.roof += ((inside ? (S.kind === 'vab' ? 0 : 0.08) : 1) - S.roof) * Math.min(1, dt * 6);   // the assembly building's walls are tall: they go altogether
    if (Math.abs(S.roof - S.fade.op) > 0.003) { S.fade.op = S.roof; for (const m of S.fade.mats) { m.transparent = true; m.opacity = S.roof; m.depthWrite = S.roof > 0.97; } for (const m of S.fade.meshes) m.visible = S.roof > 0.03; }
  }
  for (const c of cars) if (c.dish && c.tilt && !c.dishM) {         // S6: the spare tracking dish on its truck's bed
    const L = c.t.len, g = c.dishM = new THREE.Group(); g.position.set(-L * 0.18, 20, 0); c.tilt.add(g);
    part(g, GB, mc(0x9aa0ab), 3, 6, 3, 0, 0, 0); const bowl = part(g, GSph, mc(0xeef0f2), 15, 5, 15, 0, 6, 0); bowl.rotation.z = 0.5; part(g, GB, mc(0x5a606a), 1, 10, 1, 4, 9, 0);
  }
  const R = SPACE.rocket; if (R && R.mesh) {
    const L = SPACE.launch, gone = rocketGone() && !L;
    R.mesh.visible = !gone; if (R.scorch) R.scorch.visible = gone || !!(L && L.h > 40);
    R.mesh.position.y = L ? L.h : 0; if (R.flame) { R.flame.visible = !!(L && L.fire); if (L && L.fire) R.flame.scale.set(1 + Math.sin(time * 40) * 0.08, 1 + Math.sin(time * 33) * 0.15 + (L.h > 0 ? 0.6 : 0), 1); }
  }
}
function launchTick(dt) {                 // the launch (S8's cutscene drives it): ignition, the hold-down, then up and away in smoke
  const L = SPACE.launch; if (!L) return;
  L.t += dt; const [px, py] = SPACEM.pad;
  if (L.t > 0.6) L.fire = true;
  if (L.t > 2.4) { L.v = (L.v || 0) + dt * 60; L.h += L.v * dt; }
  if (L.fire && (L.fx = (L.fx || 0) - dt) <= 0) { L.fx = 0.05; for (let k = 0; k < 3; k++) smokeFx(px + rand(-60, 60), py + rand(-40, 40), false, 3.2); if (L.h < 300) fireFx(px + rand(-20, 20), py + rand(-14, 14), 2.2); }
  if (L.t > 0.6 && L.t < 1) cam.shake = Math.max(cam.shake, 8);
}
