'use strict';
/* ---------- 7u. DOCKSIDE SALVAGE: the junkyard in the port's maintenance yard (map remodel 12: MAP.salvage; the runtime: js/08z) ----------
   A dirt yard behind a chain-link fence topped with barbed wire, its gateway to the shore street under a DOCKSIDE SALVAGE sign:
   stacks of flattened wrecks along the fences, a yellow-hatched spot inside the gate where you leave a car, a crawler crane with a
   magnet on its boom, the crusher with its press, the pile of cubes it makes, the office shack and the guard dog's kennel, two
   floodlights. The fence, the stacks, the crane's tracks, the crusher, the pile and the shack are solid. Mode: junkyard (js/01j). */
const SALV = MAP.salvage || null;
const JY = { lm: null, stacks: [], dogT: null, parts: null };
const JY_BOOM_H = 74;                                               // the boom tip's height
function salvStacks() {                   // the wreck stacks along the fences: { x, y, w, d, n (layers), cols }
  const [x0, y0, x1, y1] = SALV.area, out = [], cols = ['#7a6a5a', '#5a6a7a', '#7a5048', '#6a7a5a', '#8a8070', '#4a4e5c', '#8a5a3a', '#6a5a7a'];
  const add = (x, y, w, d) => out.push({ x, y, w, d, n: randi(2, 4), cols: Array.from({ length: 4 }, () => pick(cols)), off: Array.from({ length: 4 }, () => [rand(-2, 2), rand(-2, 2)]) });
  for (let x = x0 + 34; x < x1 - 30; x += 62) for (const y of [y0 + 30, y0 + 84]) add(x, y, 52, 34);   // two rows along the north fence
  for (let y = y0 + 146; y < y0 + 340; y += 50) add(x0 + 26, y, 34, 44);                                 // along the west fence
  for (let y = y0 + 268; y < y1 - 34; y += 50) add(x1 - 24, y, 34, 44);                                  // along the east fence
  return out;
}
function genSalvage() {                   // js/04 genWorld: the fence, the solids, the drawable
  JY.stacks = []; if (!SALV) return;
  const [x0, y0, x1, y1] = SALV.area, [gx, , gw] = SALV.gate, wt = 3, solid = (x, y, w, h) => makeSolid(x, y, w, h, 0, {});
  solid((x0 + x1) / 2, y0, x1 - x0, wt); solid(x0, (y0 + y1) / 2, wt, y1 - y0); solid(x1, (y0 + y1) / 2, wt, y1 - y0);
  solid((x0 + gx - gw / 2) / 2, y1, gx - gw / 2 - x0, wt); solid((gx + gw / 2 + x1) / 2, y1, x1 - gx - gw / 2, wt);
  JY.stacks = withSeed(6121, salvStacks); for (const s of JY.stacks) solid(s.x, s.y, s.w, s.d);
  const [kx, ky, kw, kd] = SALV.crusher, [cx, cy] = SALV.crane, [hx, hy, hw, hd] = SALV.shack, [px, py] = SALV.pile, [dx, dy] = SALV.kennel;
  solid(kx, ky, kw, kd); solid(cx, cy, 54, 50); solid(hx, hy, hw, hd); solid(px, py, 48, 60); solid(dx, dy, 18, 14);
  LM_CLEAR.push([(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 6, (y1 - y0) / 2 + 30]);
  LMS.push(JY.lm = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, a: 0, rad: Math.hypot(x1 - x0, y1 - y0) / 2 + 90, make: () => withSeed(6122, makeSalvage), mesh: null });
  jyDogMake();                                                     // the guard dog (js/08z)
}

/* ---------- the model ---------- */
function makeSalvage() {
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, cx0 = JY.lm.cx, cy0 = JY.lm.cy, X = x => x - cx0, Z = y => y - cy0, sub = [];
  const [x0, y0, x1, y1] = SALV.area, [gx, gy, gw] = SALV.gate, steel = C('#8a8f9c'), dark = C('#2a2d38'), yel = C('#ffd23f'), blk = C('#16161c'), rust = C('#8a4a2a');
  const fl = (gb, a0, b0, a1, b1, y, col) => face(gb, [[X(a0), y, Z(b0)], [X(a1), y, Z(b0)], [X(a1), y, Z(b1)], [X(a0), y, Z(b1)]], [0, 1, 0], col);
  // the ground: packed dirt, oil stains, a gravel apron at the gate
  fl(T, x0, y0, x1, y1, 0.9, C('#5c5448'));
  for (let k = 0; k < 26; k++) { const x = rand(x0 + 20, x1 - 20), y = rand(y0 + 20, y1 - 20), r = rand(6, 18); fl(T, x - r, y - r * 0.7, x + r, y + r * 0.7, 0.95, C(pick(['#3a3530', '#45403a', '#2e2a26']))); }
  fl(T, gx - gw / 2, y1 - 30, gx + gw / 2, y1 + 22, 0.95, C('#6e685c'));
  // the fence: posts, three rails, the wire mesh as a dark band, coils of barbed wire on top
  const run = (ax, ay, bx, by) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / 40)), ux = (bx - ax) / L, uy = (by - ay) / L;
    for (let k = 0; k <= n; k++) { const x = ax + ux * L * k / n, y = ay + uy * L * k / n; T.prism(X(x), Z(y), 1.3, 0, 27, steel, 6, 1.3, true); }
    const bar = (h, t, col) => box5(T, Math.min(X(ax), X(bx)) - (ux ? 0 : t), h, Math.min(Z(ay), Z(by)) - (uy ? 0 : t), Math.max(X(ax), X(bx)) + (ux ? 0 : t), h + t, Math.max(Z(ay), Z(by)) + (uy ? 0 : t), col);
    bar(2, 0.6, steel); bar(13, 0.6, steel); bar(24, 0.6, steel); bar(3, 0.2, C('#4a4e58'));
    for (let k = 0; k < L; k += 7) { const x = ax + ux * k, y = ay + uy * k; T.prism(X(x), Z(y), 1.6, 26.5, 28.5, C('#9aa0ab'), 5, 1.6, false); }
  };
  run(x0, y0, x1, y0); run(x0, y0, x0, y1); run(x1, y0, x1, y1); run(x0, y1, gx - gw / 2, y1); run(gx + gw / 2, y1, x1, y1);
  for (const s of [-1, 1]) { const x = gx + s * (gw / 2 + 3); for (let y = 0; y < 40; y += 5) box5(T, X(x) - 3, y, Z(y1) - 3, X(x) + 3, Math.min(40, y + 5), Z(y1) + 3, (y / 5) % 2 ? blk : yel); }   // the gateway's posts
  box5(T, X(gx - gw / 2) - 6, 40, Z(y1) - 2, X(gx + gw / 2) + 6, 44, Z(y1) + 2, dark);
  const sg = fasciaSign('DOCKSIDE SALVAGE', '#ffb02e', gw + 10, 14); sg.position.set(X(gx), 52, Z(y1) + 2.5); sub.push(sg);
  // the spot: a yellow-hatched box inside the gate, a magnet painted in it
  { const [sx, sy, sw, sl] = SALV.spot, a0 = sx - sw / 2, a1 = sx + sw / 2, b0 = sy - sl / 2, b1 = sy + sl / 2;
    for (const [p0, q0, p1, q1] of [[a0, b0, a1, b0 + 3], [a0, b1 - 3, a1, b1], [a0, b0, a0 + 3, b1], [a1 - 3, b0, a1, b1]]) fl(T, p0, q0, p1, q1, 1, yel);
    for (let y = b0 + 8; y < b1 - 6; y += 12) fl(T, a0 + 3, y, a1 - 3, y + 4, 1, C('#b89a2a'));
    T.prism(X(sx), Z(sy), 9, 1.05, 1.1, C('#d0323f'), 16, 9, true); T.prism(X(sx), Z(sy), 5, 1.1, 1.15, C('#5c5448'), 16, 5, true); }
  // the wreck stacks: flattened shells, each layer its own faded colour, a dark glass band, rust
  for (const s of JY.stacks) for (let k = 0; k < s.n; k++) {
    const [ox, oy] = s.off[k], h0 = k * 5.2, along = s.w > s.d, L = along ? s.w : s.d, W = along ? s.d : s.w;
    const xa = s.x + ox - (along ? L / 2 - 2 : W / 2 - 2), xb = s.x + ox + (along ? L / 2 - 2 : W / 2 - 2), ya = s.y + oy - (along ? W / 2 - 2 : L / 2 - 2), yb = s.y + oy + (along ? W / 2 - 2 : L / 2 - 2);
    box5(T, X(xa), h0, Z(ya), X(xb), h0 + 4.8, Z(yb), C(s.cols[k]));
    if (along) box5(T, X(s.x + ox - L * 0.15), h0 + 4.8, Z(ya + 3), X(s.x + ox + L * 0.12), h0 + 5.3, Z(yb - 3), C('#1d2230'));
    else box5(T, X(xa + 3), h0 + 4.8, Z(s.y + oy - L * 0.15), X(xb - 3), h0 + 5.3, Z(s.y + oy + L * 0.12), C('#1d2230'));
    if (Math.random() < 0.6) box5(T, X(xa) + rand(1, 6), h0 + 4.8, Z(ya) + rand(1, 6), X(xa) + rand(8, 14), h0 + 5.1, Z(ya) + rand(8, 14), rust);
  }
  // the crusher: a steel bed between two side frames, hydraulic rams on the top beam; the press (moves: js/08z)
  const [kx, ky, kw, kd] = SALV.crusher;
  box5(T, X(kx - kw / 2), 0, Z(ky - kd / 2), X(kx + kw / 2), 12, Z(ky + kd / 2), C('#4a4e5c'));
  box5(T, X(kx - kw / 2) + 8, 12, Z(ky - kd / 2) + 6, X(kx + kw / 2) - 8, 12.5, Z(ky + kd / 2) - 6, C('#2a2c33'));
  for (const s of [-1, 1]) { box5(T, X(kx + s * (kw / 2 - 5)) - 5, 0, Z(ky - kd / 2), X(kx + s * (kw / 2 - 5)) + 5, 50, Z(ky + kd / 2), C('#c9a227'));
    for (let y = 4; y < 50; y += 8) box5(T, X(kx + s * (kw / 2 - 5)) - 5.4, y, Z(ky - kd / 2) - 0.4, X(kx + s * (kw / 2 - 5)) + 5.4, y + 4, Z(ky - kd / 2) + 0.6, blk); }
  box5(T, X(kx - kw / 2), 50, Z(ky - kd / 2), X(kx + kw / 2), 56, Z(ky + kd / 2), C('#c9a227'));
  for (const s of [-1, 1]) for (const t of [-1, 1]) T.prism(X(kx + s * kw * 0.22), Z(ky + t * kd * 0.22), 3, 56, 64, steel, 8, 3, true);
  box5(T, X(kx + kw / 2) + 2, 0, Z(ky) - 10, X(kx + kw / 2) + 18, 16, Z(ky) + 10, C('#3a3d47'));          // the power pack
  box5(G, X(kx + kw / 2) + 6, 16, Z(ky) - 3, X(kx + kw / 2) + 10, 17, Z(ky) + 3, C('#ff3b3b'));
  const PR = new GeoBuilder(); box5(PR, -kw / 2 + 11, -8, -kd / 2 + 5, kw / 2 - 11, 0, kd / 2 - 5, C('#7a7f8c')); for (let x = -kw / 2 + 14; x < kw / 2 - 12; x += 10) box5(PR, x, 0, -kd / 2 + 6, x + 4, 0.6, kd / 2 - 6, blk);
  // the cube pile's pad, the office shack, the kennel, two floodlights
  { const [px, py] = SALV.pile; fl(T, px - 26, py - 32, px + 26, py + 32, 0.95, C('#4a463e')); }
  { const [hx, hy, hw, hd] = SALV.shack; box5(T, X(hx - hw / 2), 0, Z(hy - hd / 2), X(hx + hw / 2), 26, Z(hy + hd / 2), C('#5a7a6a'));
    box5(T, X(hx - hw / 2) - 3, 26, Z(hy - hd / 2) - 3, X(hx + hw / 2) + 3, 29, Z(hy + hd / 2) + 3, C('#8a8f9c'));
    for (let x = hx - hw / 2 + 4; x < hx + hw / 2 - 4; x += 8) box5(T, X(x), 29, Z(hy - hd / 2) - 3, X(x) + 1, 30, Z(hy + hd / 2) + 3, C('#6a6f7c'));
    box5(G, X(hx - 18), 12, Z(hy + hd / 2), X(hx + 6), 22, Z(hy + hd / 2) + 0.6, C('#ffd98a')); box5(T, X(hx + 12), 0, Z(hy + hd / 2), X(hx + 26), 22, Z(hy + hd / 2) + 0.6, C('#3a2a1a'));
    T.prism(X(hx - hw / 2 + 10), Z(hy - hd / 2 + 8), 4, 29, 33, C('#9aa0ab'), 8, 4, true);
    const os = fasciaSign('OFFICE · CASH FOR CARS', '#3dffa6', hw + 30, 9); os.position.set(X(hx), 36, Z(hy + hd / 2) + 1); sub.push(os); }
  { const [dx, dy] = SALV.kennel; box5(T, X(dx) - 9, 0, Z(dy) - 7, X(dx) + 9, 10, Z(dy) + 7, C('#8a6a48'));
    face(T, [[X(dx) - 10, 10, Z(dy) - 8], [X(dx) + 10, 10, Z(dy) - 8], [X(dx) + 10, 15, Z(dy)], [X(dx) - 10, 15, Z(dy)]], [0, 0.85, -0.5], C('#a0342a'));
    face(T, [[X(dx) - 10, 15, Z(dy)], [X(dx) + 10, 15, Z(dy)], [X(dx) + 10, 10, Z(dy) + 8], [X(dx) - 10, 10, Z(dy) + 8]], [0, 0.85, 0.5], C('#a0342a'));
    box5(T, X(dx) - 4, 0, Z(dy) + 7, X(dx) + 4, 7, Z(dy) + 7.5, blk); T.prism(X(dx) + 14, Z(dy) + 6, 3, 0.9, 2.4, C('#c8ccd4'), 10, 3, true); }
  for (const [lx, ly] of [[x0 + 14, y1 - 14], [x1 - 14, y0 + 140]]) { T.prism(X(lx), Z(ly), 1.4, 0, 64, steel, 6); box5(T, X(lx) - 6, 62, Z(ly) - 3, X(lx) + 6, 68, Z(ly) + 3, dark); box5(G, X(lx) - 5, 61.5, Z(ly) - 2.4, X(lx) + 5, 62, Z(ly) + 2.4, C('#fff4d8')); }
  // the crane: tracks and its yellow body (still), the cab and the boom on a turntable (turns), the cable and the magnet (go up and down)
  const [cx, cy, R] = SALV.crane;
  for (const s of [-1, 1]) { box5(T, X(cx) - 26, 0, Z(cy) + s * 18 - 6, X(cx) + 26, 9, Z(cy) + s * 18 + 6, C('#1c1c22')); for (let x = -24; x < 24; x += 4) box5(T, X(cx) + x, 9, Z(cy) + s * 18 - 6, X(cx) + x + 2, 9.4, Z(cy) + s * 18 + 6, C('#2e2e36')); }
  box5(T, X(cx) - 20, 9, Z(cy) - 13, X(cx) + 20, 13, Z(cy) + 13, C('#3a3d47'));
  const RB = new GeoBuilder(), ry = 13;                               // the turning part, in its own frame: the boom along +x
  RB.prism(0, 0, 15, ry, ry + 2, C('#2a2d38'), 16, 15, true);
  box5(RB, -22, ry + 2, -14, 10, ry + 20, 14, C('#f0b800')); box5(RB, -30, ry + 2, -12, -22, ry + 14, 12, C('#4a4e5c'));   // the house, the counterweight
  box5(RB, 2, ry + 6, -14.4, 10, ry + 18, -9, C('#1d2230')); box5(RB, 10, ry + 6, -14, 10.5, ry + 18, -9, C('#3a5070'));    // the cab's glass
  for (let k = 0; k < 4; k++) box5(RB, -28 + k * 6, ry + 20, -8, -25 + k * 6, ry + 22, 8, blk);
  const bx0 = 6, by0 = ry + 16, bL = Math.hypot(R - bx0, JY_BOOM_H - by0), ba = Math.atan2(JY_BOOM_H - by0, R - bx0);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(bL, 4, 6), new THREE.MeshLambertMaterial({ color: 0xf0b800 })); boom.position.set((bx0 + R) / 2, (by0 + JY_BOOM_H) / 2, 0); boom.rotation.z = ba;
  const lat = new THREE.Mesh(new THREE.BoxGeometry(bL, 1, 6.4), new THREE.MeshLambertMaterial({ color: 0x2a2d38 })); lat.position.copy(boom.position); lat.position.y += 2.2; lat.rotation.z = ba;
  const rot = new THREE.Group(); rot.position.set(X(cx), 0, Z(cy)); const rm = new THREE.Mesh(RB.build(), LM_MAT[0]); rot.add(rm, boom, lat);
  const cable = new THREE.Mesh(GB, new THREE.MeshLambertMaterial({ color: 0x1a1a1a })); cable.scale.set(0.6, 1, 0.6); rot.add(cable);
  const mag = new THREE.Group(); const md = new THREE.Mesh(GCyl, new THREE.MeshLambertMaterial({ color: 0x3a3d47 })); md.scale.set(10, 3, 10); md.position.y = -1.5;
  const mr = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: 0xd0323f })); mr.scale.set(10.4, 0.8, 10.4); mr.position.y = -0.3; mag.add(md, mr); rot.add(mag);
  const press = new THREE.Mesh(PR.build(), LM_MAT[0]); press.position.set(X(kx), 50, Z(ky));
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); } m.add(rot, press);
  m.userData.own.push(boom.material, lat.material, cable.material, md.material, mr.material);
  const cubes = new THREE.Group(); m.add(cubes);
  JY.parts = { rot, cable, mag, press, cubes, R, built: -1 };
  return m;
}
