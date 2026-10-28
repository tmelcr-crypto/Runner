'use strict';
/* ---------- 7zi. FIRST CORAL BANK, the top-down kind (both modes; the Colony line's H5) ----------
   The unique building FIRST CORAL BANK (js/10n, its lot picked big enough) becomes a bank you walk into: a portico of four columns
   and steps out front, the bronze doors, inside a marble banking hall - the tellers' long counter with glass screens and three tellers
   behind it, benches and a queue rope for the customers, the manager's desk, a guard by the door - and at the back the vault: a steel
   room behind a round door, its walls lined with deposit boxes. Its roof turns see-through while you are inside. Open by day (places
   table, Bank): staff and customers; at night the doors are locked. A quest can hold it (BANK.ms: the doors open, the quest's people
   only - H5). Mode: bank. BANK.S: { cx, cy, a, ca, sa, hw, hd, H, z1 (the front wall), door (outside), inside, hall, vault, boxes }. */
const BANK = { S: null, ms: null };
const BANK_WT = 4, BANK_DW = 24, BANK_PORCH = 14;
const bankOn = () => feat('bank') && !!BANK.S;
const bankOpen = () => SKY.hour >= PLC.bankOpen && SKY.hour < PLC.bankClose;
function bankWorld(lx, lz, out) { return ixWorld(BANK.S, lx, lz, out); }
const _bkq = {};
function bankIn(x, y, m) { const S = BANK.S; if (!S) return false; ixLocal(S, x, y, _bkq); return Math.abs(_bkq.x) < S.hw - BANK_WT - (m || 0) && _bkq.z > -S.hd + BANK_WT + (m || 0) && _bkq.z < S.z1 - BANK_WT - (m || 0); }
function genBank() {                       // js/04 genWorld: after the unique buildings (it takes over FIRST CORAL BANK's)
  BANK.S = null; const U = UNIQUES.find(u => u.row.id === 'first_coral_bank'); if (!U || U.W < 120 || U.D < 90) return;
  const r = U.r, hw = U.W / 2, hd = U.D / 2, W = BANK_WT, z1 = hd - BANK_PORCH;
  const S = BANK.S = { cx: r.cx, cy: r.cy, a: U.a, ca: Math.cos(U.a), sa: Math.sin(U.a), hw, hd, z1, H: 50, roof: 1, U };
  r.off = true; r.H = S.H + 3;                                           // its own walls take the box's place (js/04 Hash)
  const sol = (lx, lz, w, h, ex) => { const p = bankWorld(lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, h), S.a, Object.assign({ bld: true, ixw: true }, ex || {})); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, (z1 - hd) / 2, W, z1 + hd); sol(hw - W / 2, (z1 - hd) / 2, W, z1 + hd);
  for (const s of [-1, 1]) sol(s * (hw + BANK_DW / 2) / 2, z1 - W / 2, hw - BANK_DW / 2, W);
  S.doorSolid = sol(0, z1 - W / 2, BANK_DW + 2, W + 2, { ixDoor: true });
  for (const x of [-hw + 16, -hw + 40, hw - 40, hw - 16]) sol(x, z1 + 7, 7, 7);           // the portico's columns
  const cz = -8; S.counter = { x0: -hw + W, x1: hw * 0.42, z: cz }; sol((S.counter.x0 + S.counter.x1) / 2, cz, S.counter.x1 - S.counter.x0, 8);   // the tellers' counter
  const V = S.vaultRoom = { x0: hw * 0.36, x1: hw - W, z0: -hd + W, z1: -hd + W + 44, door: [hw * 0.36 + 16, hw * 0.36 + 34] };   // the vault at the back right
  sol(V.x0, (V.z0 + V.z1) / 2, 4, V.z1 - V.z0); sol((V.x0 + V.door[0]) / 2, V.z1, V.door[0] - V.x0, 4); sol((V.door[1] + V.x1) / 2, V.z1, V.x1 - V.door[1], 4);
  sol(hw - 26, z1 - 30, 26, 14); sol(-hw + 34, z1 - 18, 30, 6); sol(-hw + 34, z1 - 36, 30, 6);   // the manager's desk; two benches
  S.door = bankWorld(0, hd + 16); S.inside = bankWorld(0, z1 - 16); S.hall = bankWorld(-hw * 0.05, cz + 22);
  S.vault = bankWorld((V.door[0] + V.door[1]) / 2, V.z0 + 16); S.vaultDoor = bankWorld((V.door[0] + V.door[1]) / 2, V.z1 + 12);
  S.tellers = [-0.75, -0.4, -0.05].map(k => ({ x: hw * k, z: cz - 16 }));
  U.lm.make = () => withSeed(6131, () => makeBank(S)); U.lm.rad = Math.hypot(hw, hd) + 60;   // the unique building's drawable shows the bank instead
  const post = (lx, lz, a, shirt, pants, kind) => { const w = bankWorld(lx, lz);
    addPost({ x: w.x, y: w.y, a: S.a + a, kind: kind || 'banker', back: 200, need: () => bankOn() && bankOpen() && !BANK.ms, step: standStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt, pants, ang: po.a }); return p; } }); };
  for (const t of S.tellers) post(t.x, t.z, Math.PI / 2, '#e8e8ee', '#2a2d3a');          // three tellers behind the counter, facing the hall
  post(-hw * 0.6, cz + 12, -Math.PI / 2, '#ff9ad0', '#3a3a44'); post(-hw * 0.2, cz + 12, -Math.PI / 2, '#7fd4a8', '#d8c8a0');   // customers at the counter
  post(hw - 26, z1 - 42, Math.PI / 2, '#1a1a20', '#1a1a20');                              // the manager at his desk
  post(BANK_DW / 2 + 10, z1 - 12, Math.PI, '#4a5a6a', '#2a2d36', 'bankguard');            // the guard by the door
}
function makeBank(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), C = _C, { hw, hd, H, z1 } = S, W = BANK_WT, V = S.vaultRoom;
  const stone = C('#e8e4d8'), stoneD = C('#cfc8b4'), marble = C('#f0ece4'), marbleD = C('#d8d2c4'), wood = C('#6a4a2a'), brass = C('#d4a020'), steel = C('#9aa0ab'), dark = C('#2a2d36');
  for (let i = 0; i < 2 * hw / 16; i++) for (let j = 0; j < (z1 + hd) / 16; j++) flat(T, -hw + i * 16, -hd + j * 16, Math.min(hw, -hw + i * 16 + 16), Math.min(z1, -hd + j * 16 + 16), 0.4, (i + j) % 2 ? marble : marbleD);   // the marble floor
  flat(T, -hw, z1, hw, hd, 0.5, stoneD); for (let k = 0; k < 3; k++) box5(T, -hw + 8 + k * 2, 0, hd - 4 - k * 3, hw - 8 - k * 2, 1 + k, hd - 1 - k * 3, stone);   // the porch and its steps
  flat(T, -BANK_DW / 2 - 6, z1 - 36, BANK_DW / 2 + 6, z1, 0.45, C('#8a2a2a'));                // a red runner in from the door
  /* the shell: pale stone, tall windows, the bronze doors; the portico's columns and the pediment band over them */
  const wall = (x0, z0, x1, z1_) => { box5(T, x0, 0, z0, x1, 6, z1_, stone); box5(G, x0, 6, z0, x1, H - 12, z1_, C('#9fc4d8')); box5(T, x0, H - 12, z0, x1, H, z1_, stone); };
  wall(-hw, -hd, hw, -hd + W); wall(-hw, -hd, -hw + W, z1); wall(hw - W, -hd, hw, z1);
  wall(-hw, z1 - W, -BANK_DW / 2, z1); wall(BANK_DW / 2, z1 - W, hw, z1); box5(T, -BANK_DW / 2, 30, z1 - W, BANK_DW / 2, H, z1, stone);
  for (let x = -hw; x <= hw; x += 18) for (const z of [-hd, z1 - W]) box5(T, x - 1.5, 0, z - 0.4, x + 1.5, H, z + W + 0.4, stoneD);   // pilasters
  for (const x of [-hw + 16, -hw + 40, hw - 40, hw - 16]) { T.prism(x, z1 + 7, 3.4, 0, H - 4, stone, 12); box5(T, x - 4.5, 0, z1 + 2.5, x + 4.5, 2, z1 + 11.5, stoneD); box5(T, x - 4.5, H - 6, z1 + 2.5, x + 4.5, H - 4, z1 + 11.5, stoneD); }
  box5(T, -hw, H - 4, z1, hw, H, hd - 2, stone); box5(G, -BANK_DW / 2 + 1, 0.5, z1 - 0.6, BANK_DW / 2 - 1, 28, z1 + 0.2, C('#b08a3a'));   // the band over the columns; the bronze doors' glow
  /* inside: the counter with its glass screens and teller lamps, the vault room and its round door, the boxes, benches, plants, the manager's desk */
  const cz = S.counter.z, cx0 = S.counter.x0, cx1 = S.counter.x1;
  box5(T, cx0, 0, cz - 4, cx1, 12, cz + 4, wood); box5(T, cx0, 12, cz - 5, cx1, 13, cz + 5, C('#3a2a1a')); box5(G, cx0, 13, cz - 0.6, cx1, 26, cz + 0.6, C('#cfe6ff'));
  for (const t of S.tellers) { box5(T, t.x - 7, 0, t.z - 4, t.x + 7, 9, t.z + 4, C('#3a3d47')); box5(G, t.x + 3, 13, cz - 3, t.x + 6, 17, cz - 1, C('#3aff9a')); }   // stools and the green lamps
  box5(T, V.x0, 0, V.z0, V.x0 + 4, H - 6, V.z1 + 2, steel); box5(T, V.x0, 0, V.z1, V.door[0], H - 6, V.z1 + 4, steel); box5(T, V.door[1], 0, V.z1, V.x1, H - 6, V.z1 + 4, steel);
  for (let x = V.x0 + 6; x < V.x1 - 2; x += 7) for (let y = 6; y < 36; y += 6) box5(T, x, y, V.z0 + 0.4, x + 6, y + 5, V.z0 + 2, (x + y) % 3 ? C('#c8b070') : brass);   // the deposit boxes along the back
  for (let z = V.z0 + 8; z < V.z1 - 2; z += 7) for (let y = 6; y < 36; y += 6) box5(T, V.x1 - 2, y, z, V.x1 - 0.4, y + 5, z + 6, C('#c8b070'));
  box5(T, (V.x0 + V.x1) / 2 - 10, 0, V.z0 + 18, (V.x0 + V.x1) / 2 + 10, 9, V.z0 + 28, steel);  // the table in the middle
  const vd = (V.door[0] + V.door[1]) / 2; T.prism(V.door[0] - 2, V.z1 + 14, 13, 0, 3, steel, 20, 13, true); box5(T, V.door[0] - 3, 0, V.z1 + 1, V.door[0] - 1, 26, V.z1 + 27, C('#6a707c'));   // the round door, swung open
  for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; box5(T, V.door[0] - 3.4, 13 + Math.sin(an) * 8 - 1, V.z1 + 14 + Math.cos(an) * 8 - 1, V.door[0] - 1, 13 + Math.sin(an) * 8 + 1, V.z1 + 14 + Math.cos(an) * 8 + 1, brass); }
  box5(G, vd - 9, H - 10, V.z1 + 3.8, vd + 9, H - 7, V.z1 + 4.2, C('#ff3b4a'));                 // the red lamp over it
  box5(T, hw - 39, 0, z1 - 37, hw - 13, 10, z1 - 23, wood); box5(G, hw - 18, 10, z1 - 34, hw - 15, 15, z1 - 31, C('#3aff9a'));   // the manager's desk
  for (const zz of [z1 - 18, z1 - 36]) { box5(T, -hw + 19, 0, zz - 3, -hw + 49, 6, zz + 3, wood); box5(T, -hw + 19, 6, zz + 2, -hw + 49, 12, zz + 3, wood); }   // benches
  for (let x = -hw * 0.75; x < cx1 - 8; x += 14) { T.prism(x, cz + 18, 1.2, 0, 10, brass, 6); if (x + 14 < cx1 - 8) box5(G, x, 8, cz + 17.6, x + 14, 9, cz + 18.4, C('#a8202c')); }   // the queue rope
  for (const [x, z] of [[-hw + 9, z1 - 9], [hw - 9, z1 - 9], [-hw + 9, cz + 8]]) { T.prism(x, z, 4, 0, 6, C('#c86a3a'), 8, 3, true); T.prism(x, z, 7, 6, 18, C('#2f9a5a'), 7, 2, true); }
  /* the roof (it fades while you are inside): grey, a stone edge, the bank's name painted on it */
  flat(R, -hw - 1, -hd - 1, hw + 1, z1 + 1, H + 0.5, C('#8a8f9c')); box5(R, -hw - 1, H, -hd - 1, hw + 1, H + 2, -hd + 2, stone); box5(R, -hw - 1, H, z1 - 2, hw + 1, H + 2, hd, stone);
  const m = lmMesh(T, G), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
  const roof = new THREE.Mesh(mergeBuilders([R]), [roofMat]); m.add(roof);
  const sign = fasciaSign('FIRST CORAL BANK', '#d4a020', 90, 9); sign.position.set(0, H - 2, hd - 1.2); m.add(sign);
  const top = fasciaSign('FIRST CORAL BANK', '#f4f1ea', 2 * hw - 30, 20); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 2.2, (z1 - hd) / 2); m.add(top);   // upright from the camera
  own.push(roofMat, sign.material, top.material);
  S.pt = { roofMat, top, op: -1 }; return m;
}
function bankReset() { BANK.ms = null; if (BANK.S) BANK.S.roof = 1; }
function bankTick() { const S = BANK.S; if (!S) return; S.doorSolid.off = !!BANK.ms || (bankOn() && bankOpen()); }   // js/15 update: locked at night
let bankT = 0;
function gfxBank(time) {                    // js/13: the roof fades over you
  const dt = Math.min(0.1, Math.max(0, time - bankT)); bankT = time;
  const S = BANK.S; if (!S || !S.U.lm.mesh || !S.pt) return;
  const pt = S.pt, me = P.car || P, inside = !P.dead && bankIn(me.x, me.y, -6);
  S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
  if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.top.material.opacity = S.roof; pt.roofMat.depthWrite = S.roof > 0.97; pt.top.material.transparent = true; }
}
