'use strict';
/* ---------- 7zb. BULL'S GYM: Bull Kessler's boxing gym in a Dockside warehouse (js/08zzg at work; numbers: js/01z; mode: gym) ----------
   The top-down kind, like the Pay 'n' Spray: the warehouse's own box stops being solid, brick walls of the gym's own take its place
   with a glass door in the short side facing the street, and the roof turns see-through while you are inside. From the door in: the
   front desk and a trophy case on the near side, Kessler's office on the far one (a desk, a safe, a filing cabinet, glass walls),
   lockers, two rows of heavy bags and the speed bags, the weights, and at the back the ring - a raised canvas, corner posts and pads,
   three ropes a side, the steps in at the near corner. GYM.S: { cx, cy, a, ca, sa, hw, hd, H, ring: { x, z, rs, gapX0, gapX1 },
   door, gate, bags, office, desk, steps, lm, pt } (local x across, z from the back wall to the door). */
const GYM_WT = 5, GYM_DW = 26;              // wall thickness, the door's width
function gymLocal(x, y, out) { return ixLocal(GYM.S, x, y, out); }
function gymWorld(lx, lz, out) { return ixWorld(GYM.S, lx, lz, out); }
function genGym() {                         // js/04 genWorld, after the interiors: always the same warehouse at Dockside
  GYM.S = null;
  const r = BLD.find(b => b.idx === 1019); if (!r || r.special) return;
  const f = frontOf(r); if (!f) return;
  r.special = 'gym'; r.ix = true; r.shop = false; r.own = true; r.off = true;   // r.off: the warehouse's box is no longer solid (js/04 Hash); r.ix: not drawn (js/04 DRAW)
  const hw = f.hw, hd = f.hd, W = GYM_WT, S = GYM.S = { cx: r.cx, cy: r.cy, a: f.A, ca: Math.cos(f.A), sa: Math.sin(f.A), hw, hd, H: clamp(r.H || 50, 44, 60), r, ms: false, roof: 1, open: 0 };
  r.H = S.H + 3;
  const rs = 42, rz = -hd + W + 22 + rs; S.ring = { x: 0, z: rz, rs, gapX0: -rs, gapX1: -rs + 20 };
  S.office = { x0: -hw + W, x1: -hw + W + 72, z0: hd - W - 104, z1: hd - W, door: [hd - W - 92, hd - W - 66] };   // on the far side, so no wall hides it from the camera
  S.desk = { x: S.office.x0 + 32, z: S.office.z0 + 58 }; S.desk.kx = S.desk.x - 13; S.desk.fx = S.desk.x + 22;   // Kessler behind it, a visitor in front
  S.bags = []; for (const s of [-1, 1]) for (const z of [-10, 52, 114]) S.bags.push({ x: s * 56, z });
  S.steps = { x: S.ring.gapX0 + 10, z: rz + rs + 18 };              // where you stand to climb in (the RING button)
  const sol = (lx, lz, w, h, extra) => { const p = ixWorld(S, lx, lz); return makeSolid(p.x, p.y, w, h, S.a, Object.assign({ bld: true, ixw: true }, extra)); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);   // the back and the sides
  for (const s of [-1, 1]) sol(s * (hw + GYM_DW / 2) / 2, hd - W / 2, hw - GYM_DW / 2, W);       // the front, either side of the door
  S.door = sol(0, hd - W / 2, GYM_DW + 2, W + 2, { ixDoor: true });
  const R = S.ring;                                                  // the ring: its ropes are solid, the steps' gap shut during a bout
  sol(R.x, R.z - rs, 2 * rs + 6, 3); sol(R.x - rs, R.z, 3, 2 * rs + 6); sol(R.x + rs, R.z, 3, 2 * rs + 6);
  sol((R.gapX1 + rs) / 2, R.z + rs, rs - R.gapX1 + 3, 3);
  S.gate = sol((R.gapX0 + R.gapX1) / 2, R.z + rs, R.gapX1 - R.gapX0 + 2, 3, { ixDoor: true }); S.gate.off = true;
  const O = S.office;                                                // the office: glass walls to the floor, a door in the side
  sol(O.x1, (O.z0 + O.door[0]) / 2, 3, O.door[0] - O.z0); sol(O.x1, (O.door[1] + O.z1) / 2, 3, O.z1 - O.door[1]); sol((O.x0 + O.x1) / 2, O.z0, O.x1 - O.x0, 3);
  sol(S.desk.x, S.desk.z, 14, 30); sol(O.x0 + 9, O.z1 - 12, 14, 14); sol(O.x0 + 8, O.z0 + 16, 12, 20);   // the desk, the safe, the filing cabinet
  sol(hw - W - 16, hd - W - 62, 22, 40);                             // the front desk
  sol(-hw + W + 5, 150, 10, 110);                                    // the lockers
  for (const b of S.bags) sol(b.x, b.z, 9, 9);
  sol(hw - W - 6, -128, 10, 120); sol(70, -170, 12, 28); sol(70, -112, 12, 28); sol(-78, -150, 30, 18);   // the dumbbell rack, two benches, the squat rack
  LM_CLEAR.push([S.cx, S.cy, Math.abs(S.ca) * hw + Math.abs(S.sa) * hd + 8, Math.abs(S.sa) * hw + Math.abs(S.ca) * hd + 8]);
  const m = ixWorld(S, 0, hd + 30); LM_CLEAR.push([m.x, m.y, 30, 30]);
  const dp = ixWorld(S, 0, hd + 14); S.dx = dp.x; S.dy = dp.y;      // outside the door
  S.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 60, make: () => withSeed(9311, () => makeGym(S)), mesh: null }; LMS.push(S.lm);
  gymSetup();
}

/* ---------- the model ---------- */
function makeGym(S) {
  const T = new GeoBuilder(), Gl = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), D = new GeoBuilder();
  const { hw, hd, H } = S, W = GYM_WT, C = _C, x0 = -hw + W, x1 = hw - W, z0 = -hd + W, z1 = hd - W;
  const brick = C('#8a3a30'), brickD = C('#6e2c25'), trim = C('#e8e2d6'), dark = C('#1c1c22'), red = C('#c8202c'), blue = C('#2048b0'), wood = C('#8a6a48'), steel = C('#8a8f9c'), gold = C('#ffd23f');
  const flat = (gb, a0, b0, a1, b1, y, col) => face(gb, [[a0, y, b0], [a1, y, b0], [a1, y, b1], [a0, y, b1]], [0, 1, 0], col);
  flat(T, -hw, -hd, hw, hd, 0.4, C('#55585f'));                     // the concrete floor, rubber by the weights, mats, a red line to the ring
  flat(T, 40, -200, x1, -50, 0.5, C('#26272c')); flat(T, -105, -112, -50, -66, 0.5, C('#2a5ab8'));
  flat(T, -3, -200, 3, hd - 20, 0.45, C('#a8323a'));
  flat(T, -GYM_DW / 2 - 10, hd, GYM_DW / 2 + 10, hd + 26, 0.45, C('#7a7d88'));   // a step out front

  /* the shell: brick walls with a white band at the top, the glass door, high windows along the sides */
  box5(T, -hw, 0, -hd, hw, H, z0, brick); box5(T, -hw, 0, -hd, x0, H, hd, brick); box5(T, x1, 0, -hd, hw, H, hd, brick);
  box5(T, -hw, 0, z1, -GYM_DW / 2, H, hd, brick); box5(T, GYM_DW / 2, 0, z1, hw, H, hd, brick); box5(T, -GYM_DW / 2, 32, z1, GYM_DW / 2, H, hd, brick);
  for (let y = 4; y < H - 6; y += 6) for (const s of [-1, 1]) { box5(T, s > 0 ? hw : -hw - 0.6, y, -hd, s > 0 ? hw + 0.6 : -hw, y + 0.7, hd, brickD); }   // mortar courses
  for (const [a0, b0, a1, b1] of [[-hw - 0.6, -hd - 0.6, hw + 0.6, -hd + 2], [-hw - 0.6, hd - 2, hw + 0.6, hd + 0.6], [-hw - 0.6, -hd, -hw + 2, hd], [hw - 2, -hd, hw + 0.6, hd]]) box5(T, a0, H - 6, b0, a1, H, b1, trim);
  for (let z = -hd + 40; z < hd - 40; z += 60) for (const s of [-1, 1]) box5(Gl, s > 0 ? hw : -hw - 0.7, H - 16, z, s > 0 ? hw + 0.7 : -hw, H - 9, z + 34, C('#ffe9a8'));   // the high windows, lit
  box5(T, -GYM_DW / 2 - 2, 32, hd - 1, GYM_DW / 2 + 2, 35, hd + 1.5, dark);

  /* the ring at the back: the raised canvas, the apron, the posts and pads, three ropes a side, the steps */
  const Rg = S.ring, rs = Rg.rs, rx = Rg.x, rz = Rg.z, ap = rs + 6;
  box5(T, rx - ap, 0, rz - ap, rx + ap, 3, rz + ap, C('#2a2a30'));
  flat(T, rx - rs, rz - rs, rx + rs, rz + rs, 3.1, C('#dcd6c8'));
  T.prism(rx, rz, 14, 3.15, 3.25, red, 20, 14, true); T.prism(rx, rz, 11, 3.25, 3.35, C('#dcd6c8'), 20, 11, true);   // the gym's ring on the canvas
  const corners = [[-1, -1, red], [1, -1, trim], [1, 1, blue], [-1, 1, trim]];
  for (const [sx, sz, col] of corners) { const cx = rx + sx * rs, cz = rz + sz * rs; T.prism(cx, cz, 2, 3, 22, steel, 8); box5(T, cx - 2.6, 8, cz - 2.6, cx + 2.6, 20, cz + 2.6, col); }
  const ropeC = [red, trim, blue];
  for (let k = 0; k < 3; k++) {
    const y = 9 + k * 4.5, c = ropeC[k];
    box5(T, rx - rs, y, rz - rs - 0.6, rx + rs, y + 1.2, rz - rs + 0.6, c); box5(T, rx - rs - 0.6, y, rz - rs, rx - rs + 0.6, y + 1.2, rz + rs, c); box5(T, rx + rs - 0.6, y, rz - rs, rx + rs + 0.6, y + 1.2, rz + rs, c);
    box5(T, rx + Rg.gapX1, y, rz + rs - 0.6, rx + rs, y + 1.2, rz + rs + 0.6, c);
  }
  for (let k = 0; k < 3; k++) box5(T, rx + Rg.gapX0 + 2, 0, rz + rs + 6 + k * 5, rx + Rg.gapX1 - 2, 3 - k, rz + rs + 11 + k * 5, C('#3a3a42'));   // the steps
  for (const [sx, sz] of [[-1, -1], [1, 1]]) { const cx = rx + sx * (rs + 14), cz = rz + sz * (rs - 8); T.prism(cx, cz, 3, 0, 9, dark, 8, 3, true); }   // a stool by two corners
  for (let k = 0; k < 6; k++) box5(T, rx + rs + 18, 0, rz - 40 + k * 14, rx + rs + 30, 9, rz - 30 + k * 14, C(k % 2 ? '#3a3d47' : '#4a4d57'));   // folding chairs along the side
  for (let k = 0; k < 4; k++) box5(Gl, rx - rs + 10 + k * 22, H - 7, rz - 2, rx - rs + 22 + k * 22, H - 6, rz + 2, C('#fff4d8'));   // the lights over the ring

  /* the heavy bags (hung from a beam), the speed bags on the wall */
  for (const b of S.bags) { T.prism(b.x, b.z, 4.6, 6, 30, b.x < 0 ? red : dark, 10, 4.6, true); T.prism(b.x, b.z, 4.8, 26, 28, C('#d8d8dc'), 10); T.prism(b.x, b.z, 0.5, 30, H - 4, steel, 4); }
  for (const s of [-1, 1]) box5(T, s * 56 - 3, H - 5, -20, s * 56 + 3, H - 2, 124, steel);
  for (const z of [30, 90]) { box5(T, x1 - 4, 24, z - 9, x1, 26, z + 9, wood); T.prism(x1 - 9, z, 3, 17, 23, red, 8, 2, true); }

  /* the weights: a dumbbell rack along the wall, benches, the squat rack with its bar, plates */
  box5(T, x1 - 10, 0, -188, x1 - 2, 10, -68, C('#3a3d47'));
  for (let z = -184; z < -72; z += 8) { const c = C(pick(['#1c1c22', '#2a2a30', '#3a3a40'])); T.prism(x1 - 6, z, 2.4, 10, 13, c, 8, 2.4, true); }
  for (const z of [-170, -112]) { box5(T, 66, 0, z - 14, 74, 7, z + 14, steel); box5(T, 65, 7, z - 13, 75, 9, z + 13, red); box5(T, 60, 13, z - 12, 80, 14, z - 11, steel); T.prism(60, z - 11.5, 4, 11, 16, dark, 10, 4, true); T.prism(80, z - 11.5, 4, 11, 16, dark, 10, 4, true); }
  box5(T, -94, 0, -160, -90, 26, -140, steel); box5(T, -66, 0, -160, -62, 26, -140, steel); box5(T, -100, 20, -152, -56, 21.4, -148, C('#c8ccd4'));
  for (const x of [-100, -56]) T.prism(x, -150, 6, 15, 26, dark, 12, 6, true);
  for (let k = 0; k < 4; k++) T.prism(-110 + W, -60 + k * 9, 6, 0, 2 + k, dark, 12, 6, true);

  /* the front: the desk with a till, the trophy case, the lockers, fight posters on the walls */
  box5(T, hw - W - 27, 0, hd - W - 82, hw - W - 5, 13, hd - W - 42, wood); box5(T, hw - W - 16, 13, hd - W - 72, hw - W - 8, 18, hd - W - 64, dark);
  box5(T, hw - W - 8, 0, hd - W - 30, hw - W, 30, hd - W - 6, C('#4a3a2a'));
  for (let k = 0; k < 4; k++) T.prism(hw - W - 4, hd - W - 26 + k * 6, 1.6, 14 + (k % 2) * 6, 20 + (k % 2) * 6, gold, 6, 1, true);
  for (let z = 98; z < 202; z += 10) box5(T, -hw + W, 0, z, -hw + W + 10, 32, z + 9.2, C(z % 20 ? '#2a5ab8' : '#24509f'));
  const poster = (z, col) => { box5(T, x1 - 0.8, 20, z, x1, 34, z + 10, C(col)); box5(T, x1 - 0.9, 26, z + 2, x1 - 0.1, 28, z + 8, trim); };
  [[150, '#c8202c'], [200, '#ffd23f'], [-30, '#2bf3ff'], [-250, '#c8202c']].forEach(([z, c]) => poster(z, c));
  for (const [z, c] of [[-60, '#ffd23f'], [20, '#c8202c'], [240, '#2bf3ff']]) { box5(T, x0, 20, z, x0 + 0.8, 34, z + 10, C(c)); box5(T, x0 + 0.1, 26, z + 2, x0 + 0.9, 28, z + 8, trim); }

  /* Kessler's office: glass walls, a desk with a lamp and a phone, his chair, the safe, a filing cabinet, a rug */
  const O = S.office, glass = C('#9fc4d8');
  box5(T, O.x1 - 1.5, 0, O.z0, O.x1 + 1.5, 3, O.door[0], C('#5a5d66')); box5(T, O.x1 - 1.5, 0, O.door[1], O.x1 + 1.5, 3, O.z1, C('#5a5d66')); box5(T, O.x0, 0, O.z0 - 1.5, O.x1, 3, O.z0 + 1.5, C('#5a5d66'));
  box5(T, O.x1 - 1, 3, O.z0, O.x1 + 1, 30, O.door[0], glass); box5(T, O.x1 - 1, 3, O.door[1], O.x1 + 1, 30, O.z1, glass); box5(T, O.x0, 3, O.z0 - 1, O.x1, 30, O.z0 + 1, glass);
  flat(T, O.x0 + 10, O.z0 + 28, O.x1 - 8, O.z1 - 14, 0.5, C('#7a1a22'));
  const dk = S.desk; box5(T, dk.x - 7, 0, dk.z - 15, dk.x + 7, 12, dk.z + 15, C('#5a3a22')); box5(T, dk.x + 1, 12, dk.z + 6, dk.x + 4, 13.4, dk.z + 11, dark); T.prism(dk.x - 2, dk.z - 10, 1.6, 12, 17, gold, 6, 2.6, true);
  box5(T, dk.x - 20, 0, dk.z - 6, dk.x - 10, 16, dk.z + 6, C('#2a1a14'));
  box5(T, O.x0 + 2, 0, O.z1 - 19, O.x0 + 16, 18, O.z1 - 5, C('#3a3d47')); T.prism(O.x0 + 16.6, O.z1 - 12, 2, 8, 12, steel, 8);
  box5(T, O.x0 + 2, 0, O.z0 + 6, O.x0 + 14, 22, O.z0 + 26, C('#6a6d78'));
  /* tube lights down the hall */
  for (const x of [-hw * 0.45, hw * 0.45]) for (let z = -120; z < hd - 30; z += 58) box5(Gl, x - 1.2, H - 6, z, x + 1.2, H - 5, z + 26, C('#e8f6ff'));

  /* the roof (it fades while you are inside): flat, skylights, an air unit */
  flat(R, -hw, -hd, hw, hd, H + 0.3, C('#7d7f86'));
  for (let z = -hd + 30; z < hd - 30; z += 70) flat(R, -hw + 20, z, hw - 20, z + 14, H + 0.7, C('#6d8fc9'));
  box5(R, hw - 40, H, -hd + 30, hw - 14, H + 10, -hd + 60, C('#9aa0ab')); R.prism(hw - 27, -hd + 45, 7, H + 10, H + 10.6, C('#555a66'), 10, 7, true);
  /* the glass door (two leaves that swing in) */
  box5(D, 0, 0, -1, GYM_DW / 2, 30, 1, C('#9fc4d8')); box5(D, 0, 0, -1.4, 1.6, 30, 1.4, steel); box5(D, GYM_DW / 2 - 2.6, 12, -1.6, GYM_DW / 2 - 1.2, 18, 1.6, steel);
  const m = lmMesh(T, Gl), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof);
  const dg = D.build(), doors = [-1, 1].map(s => { const d = new THREE.Mesh(dg, LM_MAT[0]); d.position.set(s * GYM_DW / 2, 0, hd - W / 2); d.rotation.y = s > 0 ? Math.PI : 0; m.add(d); return d; });   // hinged at the jambs
  const sign = fasciaSign("BULL'S GYM", '#ff3b4a', fasciaFit("BULL'S GYM", 11, Math.min(2 * hw - 30, 150)), 11); sign.position.set(0, 42, hd + 0.9); m.add(sign);
  const glove = new THREE.Mesh(new THREE.CircleGeometry(6, 16), new THREE.MeshBasicMaterial({ color: 0xff3b4a, transparent: true })); glove.position.set(-GYM_DW / 2 - 18, 24, hd + 1); m.add(glove);
  const cuff = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ color: 0xf2f2f2, transparent: true })); cuff.position.set(-GYM_DW / 2 - 18, 16.5, hd + 1); m.add(cuff);
  const side = fasciaSign("BULL'S GYM", '#ff3b4a', fasciaFit("BULL'S GYM", 16, 220), 16); side.position.set(hw + 0.9, H - 20, hd - 150); side.rotation.y = Math.PI / 2; m.add(side);   // big on the side wall the camera sees
  const glove2 = new THREE.Mesh(new THREE.CircleGeometry(9, 16), glove.material); glove2.position.set(hw + 1, H - 20, hd - 280); glove2.rotation.y = Math.PI / 2; m.add(glove2);
  const cuff2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), cuff.material); cuff2.position.set(hw + 1, H - 31, hd - 280); cuff2.rotation.y = Math.PI / 2; m.add(cuff2);
  const top = fasciaSign("BULL'S GYM", '#ff3b4a', 300, 44); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 1.2, 0); m.add(top);   // painted big on the roof, upright from the camera
  own.push(roofMat, roofGlow, sign.material, side.material, top.material, glove.material, cuff.material);
  S.pt = { roof, roofMat, roofGlow, doors, sign, side, top, glove, op: -1 };
  return m;
}
