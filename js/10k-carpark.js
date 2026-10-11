'use strict';
/* ---------- 7n. THE LUNAPARK CAR PARK (map remodel 4: MAP.lunapark.carpark) ----------
   A concrete car park beside the lunapark gate: the ground floor, decks above it and an open roof deck (levels, deck height dh).
   The way in is at its south-east corner from the road, through a barrier by a pay booth that lifts when you stop at it (or breaks).
   Inside, ramps climb along the side strips - the west strip up at the even ramps (south to north), the east strip at the odd ones
   (north to south) - so you drive round and up deck by deck. Everything in the game has a height z (0 on the ground); in here it follows
   the decks and ramps (cpLift), solids can belong to some heights only (z0..z1: the walls round each ramp, the barriers at its ends), cars
   only meet cars at their own height, and the police on the ground do not see you up on a deck. The decks above you turn see-through,
   and the cars parked up there are hidden, so you always see your own floor. Parked cars stand in about half the stalls of every deck. */
let CPK = null;
const CP_LEVEL_COL = ['#2bf3ff', '#ff2bd6', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff'];
function genCarpark() {                   // js/04 genWorld: solids, the barrier, the stalls, the drawable
  CPK = null; const d = MAP.lunapark && MAP.lunapark.carpark; if (!d) return;
  const W = d.w, Hh = d.h, x0 = d.x - W / 2, y0 = d.y - Hh / 2, S = 90, t = 5, r0 = 60, r1 = Hh - 70, dh = d.dh, NL = d.levels;
  const K = CPK = { d, x0, y0, x1: x0 + W, y1: y0 + Hh, W, Hh, S, t, r0, r1, dh, NL, ramps: [], stalls: [], filled: false, view: null };
  for (let k = 0; k < NL - 1; k++) { const west = k % 2 === 0; K.ramps.push({ k, west, xa: west ? x0 + t : K.x1 - S, xb: west ? x0 + S : K.x1 - t }); }
  const wall = (xa, ya, xb, yb, z0, z1) => makeSolid((xa + xb) / 2, (ya + yb) / 2, xb - xa, yb - ya, 0, z0 === undefined ? { bld: true, cp: true } : { bld: true, cp: true, z0, z1 });
  wall(x0, y0, K.x1, y0 + t); wall(x0, y0, x0 + t, K.y1); wall(K.x1 - t, y0, K.x1, K.y1);            // the outer walls (open above each parapet, but nobody climbs out)
  wall(x0, K.y1 - t, K.x1 - S, K.y1); wall(K.x1 - S, K.y1 - t, K.x1 - t, K.y1, 6, 1e4); wall(K.x1 - t, K.y1 - t, K.x1, K.y1);   // the south wall: the way in on the ground only
  for (const R of K.ramps) {                                                                          // each ramp: a wall along its inner side, and at its ends
    const sx = R.west ? x0 + S : K.x1 - S - 6, lowY = R.west ? y0 + r1 : y0 + r0, highY = R.west ? y0 + r0 : y0 + r1;
    wall(sx, y0 + r0, sx + 6, y0 + r1, R.k * dh - 5, (R.k + 1) * dh + 5);                             // you cannot drive off it, nor into the hole it leaves
    wall(R.xa, lowY - 3, R.xb, lowY + 3, (R.k + 1) * dh - 5, (R.k + 1) * dh + 5);                    // the deck above its low end has a hole: a barrier there
    wall(R.xa, highY - 3, R.xb, highY + 3, R.k * dh - 5, R.k * dh + 5);                              // and nobody drives in under its high end
  }
  const xm0 = x0 + S + 6, xm1 = K.x1 - S - 6, n = Math.floor((xm1 - xm0) / 30), sw = (xm1 - xm0) / n;
  for (let i = 0; i <= n; i += 2) for (const yy of [y0 + r0, y0 + r1]) wall(xm0 + i * sw - 3, yy - 3, xm0 + i * sw + 3, yy + 3);   // pillars
  for (let k = 0; k < NL; k++) for (let i = 0; i < n; i++) {                                          // the stalls, nose to the pillars
    const x = xm0 + (i + 0.5) * sw; K.stalls.push({ x, y: y0 + r0 + 33, ang: -Math.PI / 2, k }, { x, y: y0 + r1 - 33, ang: Math.PI / 2, k });
  }
  K.sw = sw; K.xm0 = xm0; K.xm1 = xm1; K.n = n;
  K.booth = { x: K.x1 - S - 18, y: K.y1 + 16 }; makeSolid(K.booth.x, K.booth.y, 20, 18, 0, {});
  K.bar = addBarrier({ x: K.x1 - (S + t) / 2, y: K.y1 + 14, a: 0, w: S - t - 8, mode: 'ticket' });
  LM_CLEAR.push([d.x, d.y + 10, W / 2 + 20, Hh / 2 + 40]);
  LMS.push(K.lm = { cx: d.x, cy: d.y, a: 0, rad: Math.hypot(W, Hh) / 2 + 40, make: () => withSeed(5260, makeCarpark), mesh: null });
}
const inCarpark = (x, y, m) => !!CPK && x > CPK.x0 - m && x < CPK.x1 + m && y > CPK.y0 - m && y < CPK.y1 + m;
function rampH(R, y) {                    // a ramp's height at y: low end k, high end k + 1
  const K = CPK, u = clamp((y - K.y0 - K.r0) / (K.r1 - K.r0), 0, 1);
  return (R.k + (R.west ? 1 - u : u)) * K.dh;
}
function cpLift(o) {                      // js/06, js/07: an entity's height - the deck or ramp it is on - and the slope under it
  if (!CPK) return;
  if (!inCarpark(o.x, o.y, 2)) { if (o.z) { o.z = 0; o.zg = 0; } return; }   // out of it (or thrown out): back on the ground
  const K = CPK, z = o.z || 0, ly = o.y - K.y0; o.zg = 0;
  if (ly > K.r0 && ly < K.r1) for (const R of K.ramps) if (o.x > R.xa && o.x < R.xb) {
    const h = rampH(R, o.y); if (Math.abs(z - h) < 10) { o.z = h; o.zg = (R.west ? -1 : 1) * K.dh / (K.r1 - K.r0); return; }
  }
  o.z = clamp(Math.round(z / K.dh), 0, K.NL - 1) * K.dh;
}
const zOf = o => (o && o.z) || 0;
const solidAt = (rc, z) => rc.z0 === undefined || (z >= rc.z0 && z <= rc.z1);   // js/04, js/07: does this solid stand at height z?

/* ---------- parked cars: about half the stalls of every deck, while you are near (js/08 manageSpawns) ---------- */
function cpFill() {
  const K = CPK; if (!K) return;
  const d = dist(K.d.x, K.d.y, P.x, P.y);
  if (K.filled) { if (d > 2400) K.filled = false; return; }
  if (d > 1400) return;
  K.filled = true;
  for (const s of K.stalls) {
    if (Math.random() > 0.55 || cars.some(c => Math.abs(c.x - s.x) < 30 && Math.abs(c.y - s.y) < 30 && Math.abs(zOf(c) - s.k * K.dh) < 10)) continue;
    const type = pickType('parked', t => t.wid <= STALL_W && t.len <= 60); if (!type) continue;
    const c = makeCar(type, s.x, s.y, s.ang + rand(-0.04, 0.04), null); c.lot = K; c.z = s.k * K.dh; cars.push(c);
  }
}

/* ---------- the model: a group per level (its floor, the ramp up from it, pillars, parapet), so the ones above you can fade ---------- */
function makeCarpark() {
  const K = CPK, g = new THREE.Group(), view = { groups: [], op: [] }, C = _C, conc = C('#9a98a4'), dark = C('#6e6c7a'), line = C('#f1f1ee'), yel = C('#ffd23f');
  const lx = x => x - K.d.x, lz = y => y - K.d.y, X0 = lx(K.x0), X1 = lx(K.x1), Z0 = lz(K.y0), Z1 = lz(K.y1);
  const flatQ = (gb, xa, za, xb, zb, y, col) => face(gb, [[xa, y, za], [xb, y, za], [xb, y, zb], [xa, y, zb]], [0, 1, 0], col);
  const rampSec = R => ({ xa: lx(R.xa), xb: lx(R.xb), za: lz(K.y0 + K.r0), zb: lz(K.y0 + K.r1) });
  for (let k = 0; k < K.NL; k++) {
    const T = new GeoBuilder(), G = new GeoBuilder(), y = k * K.dh, top = k === K.NL - 1, lc = C(CP_LEVEL_COL[k % CP_LEVEL_COL.length]);
    const holes = K.ramps.filter(R => k > 0 && (R.k === k - 1 || R.k === k)).map(rampSec);
    // the floor: the footprint minus the ramp holes, in strips along x
    const xs = [X0, X1]; for (const h of holes) xs.push(h.xa, h.xb); xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1]; if (xb - xa < 0.5) continue;
      const hz = holes.filter(h => xa >= h.xa - 0.5 && xb <= h.xb + 0.5); let zs = [[Z0, Z1]];
      for (const h of hz) zs = zs.flatMap(([a, b]) => [[a, Math.min(b, h.za)], [Math.max(a, h.zb), b]]).filter(([a, b]) => b - a > 0.5);
      for (const [za, zb] of zs) { if (k > 0) box5(T, xa, y - 2.5, za, xb, y + 0.4, zb, conc); else flatQ(T, xa, za, xb, zb, 0.5, dark); }
    }
    for (let i = 0; i <= K.n; i++) for (const zz of [K.y0 + K.r0, K.y0 + K.r1]) { const sx = lx(K.xm0 + i * K.sw); flatQ(T, sx - 0.8, lz(zz), sx + 0.8, lz(zz) + (zz === K.y0 + K.r0 ? 62 : -62), y + 0.6, line); }   // stall lines
    flatQ(T, lx(K.xm0), lz(K.y0 + K.r0) - 1, lx(K.xm1), lz(K.y0 + K.r0) + 1, y + 0.6, line); flatQ(T, lx(K.xm0), lz(K.y0 + K.r1) - 1, lx(K.xm1), lz(K.y0 + K.r1) + 1, y + 0.6, line);
    for (let i = 0; i < 6; i++) { const ax = lx(K.xm0) + 30 + i * (lx(K.xm1) - lx(K.xm0) - 60) / 5, az = lz(K.d.y); flatQ(T, ax - 10, az - 1.5, ax + 6, az + 1.5, y + 0.6, yel); face(T, [[ax + 6, y + 0.6, az - 5], [ax + 14, y + 0.6, az], [ax + 14, y + 0.6, az], [ax + 6, y + 0.6, az + 5]], [0, 1, 0], yel); }   // arrows along the aisle
    // the ramp up from this level
    const R = K.ramps[k];
    if (R) {
      const r = rampSec(R), lowZ = R.west ? r.zb : r.za, highZ = R.west ? r.za : r.zb;
      face(T, [[r.xa, y + 0.6, lowZ], [r.xb, y + 0.6, lowZ], [r.xb, y + K.dh + 0.6, highZ], [r.xa, y + K.dh + 0.6, highZ]], [0, 1, 0], C('#7c7a88'));
      for (let s = 0; s < 8; s++) { const f = (s + 0.5) / 8, zz = lowZ + (highZ - lowZ) * f; flatQ(T, (r.xa + r.xb) / 2 - 2, zz - 6, (r.xa + r.xb) / 2 + 2, zz + 6, y + K.dh * f + 0.9, yel); }   // dashes up the middle
      const sx = R.west ? r.xb : r.xa, sxo = R.west ? 6 : -6;
      face(T, [[sx, y, lowZ], [sx, y, highZ], [sx, y + K.dh + 8, highZ], [sx, y + 8, lowZ]], [R.west ? 1 : -1, 0, 0], conc);   // its inner wall
      face(T, [[sx + sxo, y + 8, lowZ], [sx + sxo, y + K.dh + 8, highZ], [sx, y + K.dh + 8, highZ], [sx, y + 8, lowZ]], [0, 1, 0], conc);
      box5(G, Math.min(sx, sx + sxo), y + 8, Math.min(lowZ, highZ), Math.max(sx, sx + sxo), y + 9, Math.min(lowZ, highZ) + 4, lc);
    }
    // pillars up to the next deck, the parapet round this one, a neon band in its colour
    if (!top) for (let i = 0; i <= K.n; i += 2) for (const zz of [K.y0 + K.r0, K.y0 + K.r1]) { const sx = lx(K.xm0 + i * K.sw); box5(T, sx - 3, y, lz(zz) - 3, sx + 3, y + K.dh - 2.5, lz(zz) + 3, conc); }
    if (!top) for (const [px, pz] of [[X0, Z0], [X1 - 6, Z0], [X0, Z1 - 6], [X1 - 6, Z1 - 6]]) box5(T, px, y, pz, px + 6, y + K.dh - 2.5, pz + 6, conc);
    const ph = 12, gapA = lx(K.x1 - K.S), gapB = lx(K.x1 - K.t);
    box5(T, X0, y, Z0, X1, y + ph, Z0 + K.t, conc); box5(T, X0, y, Z0, X0 + K.t, y + ph, Z1, conc); box5(T, X1 - K.t, y, Z0, X1, y + ph, Z1, conc);
    if (k === 0) { box5(T, X0, y, Z1 - K.t, gapA, y + ph, Z1, conc); box5(T, gapB, y, Z1 - K.t, X1, y + ph, Z1, conc); box5(T, gapA, K.dh - 8, Z1 - K.t, gapB, K.dh - 2.5, Z1, conc); }   // the way in
    else box5(T, X0, y, Z1 - K.t, X1, y + ph, Z1, conc);
    box5(G, X0 - 0.4, y + ph - 3, Z1 - 0.4, X1 + 0.4, y + ph - 1.5, Z1 + 0.4, lc); box5(G, X0 - 0.4, y + ph - 3, Z0 - 0.4, X1 + 0.4, y + ph - 1.5, Z0 + 0.6, lc);
    if (k === 0) {                                                                                      // the pay booth and an IN arrow on the apron
      const bx = lx(K.booth.x), bz = lz(K.booth.y); box5(T, bx - 10, 0, bz - 9, bx + 10, 18, bz + 9, C('#e8e8ee')); box5(G, bx - 10.4, 9, bz - 6, bx + 10.4, 15, bz + 6, C('#7fd6ff'));
      box5(T, bx - 12, 18, bz - 11, bx + 12, 21, bz + 11, C('#ff2bd6'));
      const ax = (gapA + gapB) / 2, az = Z1 + 20; flatQ(T, ax - 4, az - 4, ax + 4, az + 14, 0.6, line); face(T, [[ax - 11, 0.6, az - 4], [ax + 11, 0.6, az - 4], [ax, 0.6, az - 18], [ax, 0.6, az - 18]], [0, 1, 0], line);
    }
    if (top) for (const [px, pz] of [[X0 + 30, Z0 + 30], [X1 - 30, Z0 + 30], [X0 + 30, Z1 - 30], [X1 - 30, Z1 - 30]]) { T.prism(px, pz, 1.2, y, y + 34, C('#14102a'), 6); box5(G, px - 3, y + 34, pz - 3, px + 3, y + 37, pz + 3, C('#fff3b0')); }   // floodlights on the roof
    const mats = [xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true })];
    const mesh = new THREE.Mesh(mergeBuilders([T, G]), mats); g.add(mesh); view.groups.push({ mesh, mats, op: 1 });
    if (top) {                                                                                          // the name over the roof, facing the camera
      const sign = signMesh('LUNAPARK PARKING', '#ffd23f', 260, 36); sign.material.transparent = true; sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180);
      sign.position.set(0, y + 50, Z1 - 20); mesh.add(sign); mats.push(sign.material); view.sign = sign;
    }
  }
  g.userData.own = view.groups.flatMap(v => v.mats); K.view = view;
  return g;
}

/* ---------- js/13: the decks above you fade, the cars parked up there hide ---------- */
function gfxCarpark() {
  const K = CPK; if (!K || !K.lm.mesh || !K.view) return;
  const me = P.car || P, inside = !P.dead && inCarpark(me.x, me.y, -2), top = inside ? Math.ceil(zOf(me) / K.dh - 0.05) : 99;
  K.view.groups.forEach((v, k) => {
    const want = k <= top ? 1 : 0.1; v.op += (want - v.op) * 0.2; if (Math.abs(v.op - want) < 0.01) v.op = want;
    for (const m of v.mats) { m.opacity = v.op; m.depthWrite = v.op > 0.97; }
  });
  for (const c of cars) if (c.lot === K && c.mesh) c.mesh.visible = !inside || zOf(c) <= zOf(me) + 12;
}

/* ---------- js/14: a P on the minimap and the city map, at the way in ---------- */
function cpIcons(g, X, Y, q, inView) {
  const K = CPK; if (!K) return; const x = X(K.x1 - K.S / 2), y = Y(K.y1); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#2f6fd6'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + Math.round(q * 1.6) + 'px Arial'; g.fillText('P', x, y + q * 0.08);
}
