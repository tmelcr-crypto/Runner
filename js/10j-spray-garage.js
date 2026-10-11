'use strict';
/* ---------- 7m. PAY 'N' SPRAY: the garages (js/08q runs them) ----------
   PLC.sprayCount street-front buildings, well spread, the first near the start, become paint shops: walls with a roller door to the
   street, a spray bay down the middle under a gantry of nozzles, paint on shelves, a workbench, a car lift, a painter. The building's
   own box stops being solid (it is left out of the merged fill chunks too); its walls are solids of their own, and so is the door
   while it is down. The roof turns see-through while you are inside: the first interior of the top-down kind (interiors in rooms
   of their own come later). Mode: sprayGarage (js/01j). */
let PNS = [];                             // the garages: { r: the building, cx, cy, a, ca, sa, hw, hd, dw: door width, apron, ds: the door's solid, lm: its drawable, ... }
const PNS_WT = 4, PNS_WH = 50, PNS_DH = 38, PNS_BAY = 72;   // wall thickness, wall height, door height, spray bay width
const PNS_PAINTS = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff', '#ff4d4d', '#6f86ff', '#f4f4f6', '#111114'];
// the garage's own frame: x along the street, z from the back (-) to the door (+)
function pnsLocal(G, x, y, out) { const dx = x - G.cx, dy = y - G.cy; out = out || {}; out.x = dx * G.ca + dy * G.sa; out.z = -dx * G.sa + dy * G.ca; return out; }
function pnsWorld(G, lx, lz, out) { out = out || {}; out.x = G.cx + G.ca * lx - G.sa * lz; out.y = G.cy + G.sa * lx + G.ca * lz; return out; }
const _pq = {};
function pnsIn(G, x, y, m) { pnsLocal(G, x, y, _pq); return Math.abs(_pq.x) < G.hw - PNS_WT - m && _pq.z > -G.hd + PNS_WT + m && _pq.z < G.hd - PNS_WT - m; }   // m > 0: that far from the walls
function pnsKerb(x, y) { return PNS.some(G => dist(x, y, G.kx, G.ky) < G.dw / 2 + 50); }   // js/08 kerbFits: no car parked across a garage's door

function pickSprays() {                   // js/04 genWorld, after the fire stations: always the same buildings
  PNS = []; const n = Math.round(PLC.sprayCount); if (n < 1) return;
  const svc = [...SVC.police, ...SVC.hospital, ...SVC.fire].map(s => s.r), q = {};
  let cand = [];
  for (const r of BLD) {
    if (!r.fill || !r.shop || r.special || r.lw < 110 || r.lw > 190 || r.lh < 135) continue;   // wide enough for the bay and a side, deep enough for a bus
    const fx = -r.sa, fy = r.ca, ox = r.cx + fx * r.lh / 2, oy = r.cy + fy * r.lh / 2;
    const rd = nearestRoad(ox, oy, ROAD_HALF + SW_W + 60); if (!rd || RE[rd.e].nt || rd.d < ROAD_HALF + SW_W - 2) continue;
    const E = RE[rd.e]; if (rd.s < 170 || rd.s > E.len - 170) continue;                // well clear of the junctions (and their traffic lights)
    edgeAt(rd.e, rd.s, q); if (Math.abs(q.tx * r.ca + q.ty * r.sa) < 0.94) continue;   // the street runs along the front
    if (nearRoads(ox + fx * 20, oy + fy * 20, ROAD_HALF + SW_W + 120).length > 1) continue;   // one street: not on a corner
    if (shoreDist(r.cx, r.cy) < 60 || inLandmark(r.cx, r.cy) || inLandmark(ox, oy) || svc.some(b => dist(b.cx, b.cy, r.cx, r.cy) < 450)) continue;
    if (LOTS.some(L => dist(L.cx, L.cy, ox, oy) < L.w / 2 + 90) || BRIDGES.some(b => b.e === rd.e)) continue;
    cand.push({ r, fx, fy, ox, oy, d: rd.d });
  }
  if (cand.filter(c => c.fy > -0.2).length >= n * 3) cand = cand.filter(c => c.fy > -0.2);   // the door toward the camera where there are enough
  const st = MAP.start; let first = null;
  for (const c of cand) { const d = dist(c.ox, c.oy, st[0], st[1]); if (d > 250 && (!first || d < dist(first.ox, first.oy, st[0], st[1]))) first = c; }
  if (!first) return;
  const chosen = [first];
  while (chosen.length < n) {
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.ox, o.oy, c.ox, c.oy))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 900) break; chosen.push(best);
  }
  chosen.forEach((c, i) => PNS.push(pnsSite(c, i)));
}
function pnsSite(c, i) {
  const r = c.r, W = PNS_WT, G = { i, r, cx: r.cx, cy: r.cy, a: r.a, ca: r.ca, sa: r.sa, hw: r.lw / 2, hd: r.lh / 2, fx: c.fx, fy: c.fy,
    dw: Math.min(74, r.lw - 44), apron: Math.max(0, c.d - ROAD_HALF - SW_W), open: 0, roof: 1, phase: 'idle', t: 0, seen: false, used: false, lm: null };
  r.special = 'spray'; r.shop = false; r.own = true; r.off = true; r.H = PNS_WH + 3;   // r.off: the building's box is no longer solid (js/04 Hash)
  const sol = (lx, lz, w, h, extra) => { const p = pnsWorld(G, lx, lz); return makeSolid(p.x, p.y, w, h, G.a, Object.assign({ bld: true, pns: true }, extra)); };
  const { hw, hd, dw } = G, fw = hw - dw / 2;
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  sol(-(hw + dw / 2) / 2, hd - W / 2, fw, W); sol((hw + dw / 2) / 2, hd - W / 2, fw, W);
  G.ds = sol(0, hd - W / 2, dw + 2, W + 2, { pnsDoor: true });                         // the roller door: solid while it is down
  const dp = pnsWorld(G, 0, hd); G.dx = dp.x; G.dy = dp.y;                              // the middle of the doorway
  const kp = pnsWorld(G, 0, hd + c.d - PARK_OFF); G.kx = kp.x; G.ky = kp.y;              // the parking lane in front of it
  LM_CLEAR.push([r.cx, r.cy, r.w / 2 + 8, r.h / 2 + 8]);                              // no junk, trees or lamps in it, at the door or on the kerb before it
  const ad = c.d - ROAD_HALF + 10, m = pnsWorld(G, 0, hd + ad / 2), aw = dw / 2 + 40;
  LM_CLEAR.push([m.x, m.y, Math.abs(G.ca) * aw + Math.abs(G.sa) * ad / 2, Math.abs(G.sa) * aw + Math.abs(G.ca) * ad / 2]);
  G.lm = { cx: r.cx, cy: r.cy, a: r.a, rad: Math.hypot(hw, hd) + 60, make: () => withSeed(9700 + i * 31, () => makePns(G)), mesh: null };
  LMS.push(G.lm);
  return G;
}

/* ---------- the model: shell, bay, workshop (merged), and the parts that move - roof, door, lamp, sign, painter ---------- */
function makePns(G) {
  const T = new GeoBuilder(), Gl = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), D = new GeoBuilder();
  const { hw, hd, dw } = G, W = PNS_WT, H = PNS_WH, DH = PNS_DH, B = PNS_BAY / 2, C = _C;
  const outC = C('#f0ebf6'), trim = C('#2b2e38'), steel = C('#8a8f9c'), mag = C('#ff2bd6'), cyan = C('#2bf3ff'), yel = C('#ffd23f'), blk = C('#16161c');
  const flat = (gb, x0, z0, x1, z1, y, col) => face(gb, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, 1, 0], col);
  const x0 = -hw + W, x1 = hw - W, z0 = -hd + W, z1 = hd - W;                           // the inside

  /* floor and apron: concrete, the bay down the middle between yellow lines, a drain, hazard dashes at the back, a striped threshold */
  flat(T, -hw, -hd, hw, hd, 0.4, C('#6a6d78'));
  flat(T, -B, z0, B, z1, 0.45, C('#585b66'));
  for (const s of [-1, 1]) flat(T, s * B - 1.5, z0 + 4, s * B + 1.5, z1 - 2, 0.5, yel);
  flat(T, -7, -9, 7, 9, 0.5, C('#2a2c33')); for (let k = -7; k < 7; k += 3) flat(T, k, -9, k + 1, 9, 0.55, C('#4a4d57'));
  for (let k = 0; k < 9; k++) flat(T, -B + 3 + k * (2 * B - 6) / 9, z0 + 6, -B + 3 + (k + 0.5) * (2 * B - 6) / 9, z0 + 12, 0.5, yel);
  flat(T, -dw / 2 - 16, hd, dw / 2 + 16, hd + G.apron + 3, 0.45, C('#7a7d88'));
  for (let k = 0, n = Math.round(dw / 6); k < n; k++) flat(T, -dw / 2 + k * dw / n, hd + 0.6, -dw / 2 + (k + 1) * dw / n, hd + 5, 0.5, k % 2 ? blk : yel);
  if (G.apron > 14) { const z = hd + G.apron * 0.55; face(T, [[-9, 0.55, z + 4], [9, 0.55, z + 4], [0, 0.55, z - 8], [0, 0.55, z - 8]], [0, 1, 0], C('#f4f4f6')); flat(T, -3, z + 4, 3, z + 14, 0.55, C('#f4f4f6')); }   // an arrow: in here

  /* the shell: walls with the doorway, a parapet, neon bands round the top, hazard posts and the drum over the door */
  box5(T, -hw, 0, -hd, hw, H, z0, outC); box5(T, -hw, 0, -hd, x0, H, hd, outC); box5(T, x1, 0, -hd, hw, H, hd, outC);
  box5(T, -hw, 0, z1, -dw / 2, H, hd, outC); box5(T, dw / 2, 0, z1, hw, H, hd, outC); box5(T, -dw / 2, DH, z1, dw / 2, H, hd, outC);
  for (const [a0, b0, a1, b1] of [[-hw, -hd, hw, -hd + 3], [-hw, hd - 3, hw, hd], [-hw, -hd, -hw + 3, hd], [hw - 3, -hd, hw, hd]]) box5(T, a0, H, b0, a1, H + 3, b1, C('#d8d2e0'));
  const band = (ya, yb, col) => { box5(Gl, -hw - 0.6, ya, hd - 1, hw + 0.6, yb, hd + 0.6, col); box5(Gl, -hw - 0.6, ya, -hd - 0.6, hw + 0.6, yb, -hd + 1, col); box5(Gl, -hw - 0.6, ya, -hd, -hw + 1, yb, hd, col); box5(Gl, hw - 1, ya, -hd, hw + 0.6, yb, hd, col); };
  band(H - 10, H - 7, mag); band(H - 5, H - 3, cyan);
  for (const s of [-1, 1]) for (let y = 0; y < DH; y += 4) box5(T, s > 0 ? dw / 2 : -dw / 2 - 3, y, hd, s > 0 ? dw / 2 + 3 : -dw / 2, Math.min(DH, y + 4), hd + 1.6, (y / 4) % 2 ? blk : yel);
  box5(T, -dw / 2 - 3, DH, hd, dw / 2 + 3, DH + 5, hd + 3, trim);
  box5(Gl, -dw / 2 - 3, DH + 5, hd + 2.4, dw / 2 + 3, DH + 6, hd + 3.2, cyan);

  /* the spray bay: a gantry of nozzles on two rails, hoses down the back wall, the extractor panel behind */
  const ry = H - 10;
  for (const s of [-1, 1]) {
    box5(T, s * (B + 3) - 1.2, ry - 1.2, z0 + 4, s * (B + 3) + 1.2, ry + 1.2, z1 - 6, steel);
    for (let z = z0 + 10; z < z1 - 8; z += 12) box5(T, s * (B + 3) - 1.6, ry - 4, z - 1, s * (B + 3) + 1.6, ry - 1.2, z + 1, trim);
    box5(T, s * (B + 3) - 1, 0, z0, s * (B + 3) + 1, ry, z0 + 2, C('#3a3d47'));
  }
  for (let z = z0 + 16; z < z1 - 8; z += 34) box5(T, -B - 4, ry + 1, z - 1.2, B + 4, ry + 3, z + 1.2, steel);
  box5(T, -B + 6, 2, z0, B - 6, 32, z0 + 1.4, C('#9aa3b5'));
  for (let x = -B + 10; x < B - 8; x += 6) box5(T, x, 3, z0 + 1.4, x + 1, 31, z0 + 2, C('#6a7286'));
  for (const x of [-B / 2, B / 2]) for (let z = z0 + 12; z < z1 - 24; z += 30) box5(Gl, x - 1.2, H - 6, z, x + 1.2, H - 5, z + 16, C('#e8f6ff'));   // tube lights over the bay

  /* the sides: paint on shelves and a workbench on the left; a car up on the lift, a tool chest, drums and tyres on the right */
  const sw = hw - W - B - 4;
  if (sw >= 8) {
    const dd = Math.min(10, sw - 2), sz1 = z1 - (sw >= 14 ? 40 : 6);
    box5(T, x0, 0, z0 + 4, x0 + dd, 26, sz1, C('#5a6070'));
    for (let z = z0 + 7; z < sz1 - 2; z += 4.2) for (let k = 0; k < (dd >= 8 ? 2 : 1); k++) T.prism(x0 + 2.6 + k * 4.6, z, 1.6, 26, 30, C(pick(PNS_PAINTS)), 7, 1.6, true);
    if (sw >= 14) {
      const bw = Math.min(12, sw - 2), zb = z1 - 36;
      box5(T, x0, 0, zb, x0 + bw, 11, zb + 28, C('#8a6a48')); box5(T, x0 + 1, 11, zb + 3, x0 + 5, 14, zb + 8, trim);
      for (let k = 0; k < 5; k++) box5(T, x0 + rand(2, bw - 4), 11, zb + 10 + k * 3.4, x0 + rand(5, bw - 1), 11.8, zb + 11.6 + k * 3.4, C(pick(['#c8ccd4', '#e0364f', '#ffd23f', '#3a3d47'])));
      T.prism(x0 + bw + 6, zb + 6, 4.5, 0, 16, C('#e0364f'), 10); box5(T, x0 + bw + 2, 16, zb + 2, x0 + bw + 10, 20, zb + 10, trim);   // the compressor
    }
  }
  if (sw >= 26) {                                                     // the lift: two posts, arms, a car up on it
    const xc = B + 4 + sw / 2, zc = z0 + Math.min(40, (z1 - z0) * 0.3);
    for (const s of [-1, 1]) box5(T, xc + s * 14 - 1.6, 0, zc - 1.6, xc + s * 14 + 1.6, 32, zc + 1.6, C('#d0323f'));
    box5(T, xc - 14, 16, zc - 18, xc + 14, 17.5, zc + 18, steel);
    const lc = C(pick(PNS_PAINTS.slice(0, 8)));
    box5(T, xc - 10, 18, zc - 23, xc + 10, 24, zc + 23, lc); box5(T, xc - 8.5, 24, zc - 8, xc + 8.5, 30, zc + 12, C('#1d2230'));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box5(T, xc + sx * 10.5 - 2, 16.5, zc + sz * 15 - 4, xc + sx * 10.5 + 2, 22, zc + sz * 15 + 4, blk);
  }
  if (sw >= 8) {                                                      // a red tool chest, drums, a stack of tyres
    const xr = x1 - Math.min(10, sw - 2);
    box5(T, xr, 0, z1 - 30, x1, 14, z1 - 14, C('#d0323f')); for (let y = 3; y < 14; y += 3) box5(T, xr - 0.4, y, z1 - 29, xr, y + 0.6, z1 - 15, C('#2b2e38'));
    for (let k = 0; k < 2; k++) T.prism(x1 - 4.5, z1 - 40 - k * 8, 3.4, 0, 11, C(k ? '#2a4aa8' : '#2fbf71'), 10, 3.4, true);
    for (let k = 0; k < 4; k++) { T.prism(x1 - 6, z0 + 10, 5.4, k * 3.6, k * 3.6 + 3.4, C('#1c1c22'), 12, 5.4, true); }
    T.prism(x1 - 6, z0 + 10, 2.6, 14.4, 14.9, C('#8a8f9c'), 10, 2.6, true);
  }

  /* the roof (it fades while you are inside): deck, skylights, an AC unit, a giant spray can on the corner */
  flat(R, -hw, -hd, hw, hd, H + 0.3, C('#4a4e5c'));
  for (let z = z0 + 14; z < z1 - 6; z += 36) box5(R, x0, H - 4, z - 1.5, x1, H - 1, z + 1.5, trim);   // the beams under it
  for (let z = -hd + 14; z < hd - 20; z += 30) flat(R, -B + 4, z, B - 4, z + 12, H + 0.6, C('#6d8fc9'));
  box5(R, hw - 26, H, -hd + 8, hw - 8, H + 9, -hd + 26, C('#9aa0ab')); R.prism(hw - 17, -hd + 17, 6, H + 9, H + 9.6, C('#555a66'), 10, 6, true);
  const cx = -hw + 16, cz = -hd + 16;
  R.prism(cx, cz, 8, H, H + 30, mag, 14, 8, true); R.prism(cx, cz, 8.4, H + 9, H + 13, C('#ffffff'), 14, 8.4, true);
  R.prism(cx, cz, 8, H + 30, H + 33, C('#c8ccd4'), 14, 5, true); R.prism(cx, cz, 4.6, H + 33, H + 38, C('#e8e8ee'), 12, 4.6, true);
  box5(R, cx - 1.5, H + 38, cz - 1.5, cx + 1.5, H + 40, cz + 1.5, trim);
  for (const s of [-1, 1]) box5(R, s * 30 - 1, H, hd - 34, s * 30 + 1, H + 14, hd - 32, trim);   // posts for the sign
  box5(RG, -hw - 0.2, H + 3, hd - 0.4, hw + 0.2, H + 4.2, hd + 0.2, mag);

  /* the door: slats in a frame of its own, rolled up by scaling toward the drum (geometry hangs down from y = 0) */
  for (let y = 0; y < DH; y += 3) box5(D, -dw / 2, y - DH, hd - W / 2 - 1, dw / 2, Math.min(0, y - DH + 2.7), hd - W / 2 + 1, C((y / 3) % 2 ? '#8e95a3' : '#a9afbc'));

  const m = lmMesh(T, Gl), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof);
  const door = new THREE.Mesh(D.build(), LM_MAT[0]); door.position.y = DH; m.add(door);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a }), lamp = new THREE.Mesh(GB, lampMat); lamp.scale.set(4, 4, 2); lamp.position.set(dw / 2 + 8, 30, hd + 1.2); m.add(lamp);
  const sign = signMesh("PAY 'N' SPRAY", '#ff2bd6', Math.min(2 * hw * 0.8, 150), 30); sign.material.transparent = true;
  sign.position.set(0, H + 26, hd - 33); sign.rotation.order = 'YXZ'; sign.rotation.set(-(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180), G.a, 0); m.add(sign);   // facing the camera whichever way the door does
  const pt = buildPerson('ped', 0xf2f2f2, '#d9a074');                    // the painter: white overalls, a mask, a spray gun
  part(pt.tilt, GB, mc(0x333840), 2.2, 2.4, 5.4, 3.4, 22.4, 0); pt.gun = part(pt.tilt, GB, E.black, 6, 2, 2, 7.5, 15, 3.6); part(pt.tilt, GB, mc(0xff2bd6), 2.6, 3.6, 2.6, 6, 12.6, 3.6);
  m.add(pt.g);
  own.push(roofMat, roofGlow, lampMat, sign.material);
  G.pt = { roof, roofMat, roofGlow, door, lamp, lampMat, sign, painter: pt, op: -1 };
  return m;
}
