'use strict';
/* ---------- 7j. THE LUNAPARK'S RIDES ----------
   Heron Key lunapark (MAP.lunapark, laid out by tools/remodel_city.py; the gate, stands and streets are js/10g): a Ferris wheel, a
   wooden out-and-back coaster, a steel coaster with two loops, a log flume, a drop tower, chair swings, a carousel, a swinging pirate
   ship, a sky ride across the park and a little train round it. Each is a landmark-style mesh built near the camera, with its moving
   parts animated from the clock (js/13); the trains run the track by their height (faster at the bottom). With the mode table's
   lunapark row off they stand still (js/01j). Speeds: js/01l. */
const ridesOn = () => feat('lunapark');
const RIDE_COLS = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff'];

/* ---------- tracks: a smooth curve through [x, h, z] points, with a frame that stays upright through hills and loops ---------- */
function trackOf(pts, step) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
  const L = curve.getLength(), n = Math.max(16, Math.ceil(L / step)), P = [], Tn = [], U = [], S = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); Tn.push(curve.getTangentAt(i / n).normalize()); }
  const up = new THREE.Vector3(0, 1, 0); up.sub(Tn[0].clone().multiplyScalar(up.dot(Tn[0]))).normalize();
  const ax = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    if (i > 0) { ax.crossVectors(Tn[i - 1], Tn[i]); const s = ax.length(); if (s > 1e-7) up.applyAxisAngle(ax.divideScalar(s), Math.atan2(s, Tn[i - 1].dot(Tn[i]))); up.sub(Tn[i].clone().multiplyScalar(up.dot(Tn[i]))).normalize(); }
    U.push(up.clone()); S.push(new THREE.Vector3().crossVectors(Tn[i], up).normalize());
  }
  return { L, n, P, T: Tn, U, S };
}
const v3 = v => [v.x, v.y, v.z];
function railsOf(T, tr, gauge, r, col, tieCol, tieEvery) {        // two tube rails and the ties between them
  const c = _C(col), tc = tieCol ? _C(tieCol) : null;
  for (let i = 0; i < tr.n; i++) {
    for (const s of [-1, 1]) {
      const cs = k => { const p = tr.P[k], u = tr.U[k], sd = tr.S[k], o = p.clone().addScaledVector(sd, s * gauge / 2); return [o.clone().addScaledVector(u, r).addScaledVector(sd, r), o.clone().addScaledVector(u, r).addScaledVector(sd, -r), o.clone().addScaledVector(u, -r).addScaledVector(sd, -r), o.clone().addScaledVector(u, -r).addScaledVector(sd, r)]; };
      const A = cs(i), B = cs(i + 1);
      for (let q = 0; q < 4; q++) { const j = (q + 1) % 4, n = A[q].clone().add(A[j]).multiplyScalar(0.5).sub(tr.P[i]).normalize(); face(T, [v3(A[q]), v3(A[j]), v3(B[j]), v3(B[q])], v3(n), c); }
    }
    if (tc && i % tieEvery === 0) { const p = tr.P[i], sd = tr.S[i], u = tr.U[i]; beam(T, v3(p.clone().addScaledVector(sd, -gauge / 2 - 2).addScaledVector(u, -r * 2)), v3(p.clone().addScaledVector(sd, gauge / 2 + 2).addScaledVector(u, -r * 2)), 1.2, tc); }
  }
}
function trainOf(m, n, col, len) {                                // n cars as meshes in the ride's group
  const cars = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.Group(), body = new THREE.Mesh(GB, mc(k === 0 ? '#f4f4f4' : col)); body.scale.set(len - 3, 7, 13); body.position.y = 5; g.add(body);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(GSph, mc(pick(['#f2c6a0', '#d9a074', '#7a4d30']))); h.scale.setScalar(2.4); h.position.set(s * 4, 11, 0); g.add(h); }
    m.add(g); cars.push(g);
  }
  return cars;
}
const _q = new THREE.Quaternion(), _mx = new THREE.Matrix4(), _xa = new THREE.Vector3(), _ya = new THREE.Vector3(), _za = new THREE.Vector3();
function placeOnTrack(tr, s, g) {                                 // a car at arc length s: on the rails, nose along the track, roof along the frame's up
  const f = ((s % tr.L) + tr.L) % tr.L / tr.L * tr.n, i = Math.min(tr.n - 1, Math.floor(f)), t = f - i;
  g.position.copy(tr.P[i]).lerp(tr.P[i + 1], t);
  _xa.copy(tr.T[i]).lerp(tr.T[i + 1], t).normalize(); _ya.copy(tr.U[i]).lerp(tr.U[i + 1], t).normalize(); _za.crossVectors(_xa, _ya).normalize(); _ya.crossVectors(_za, _xa);
  _mx.makeBasis(_xa, _ya, _za); g.quaternion.setFromRotationMatrix(_mx);
}
function speedOf(tr, lift, slow) {                                // speed at each sample: by the height below the lift top; slow up the lift and in the station and brakes
  const hs = tr.P.map(p => p.y), top = Math.max(...hs), low = Math.min(...hs.slice(lift[1], lift[1] + Math.floor(tr.n / 3))), k = PLC.coaster * PLC.coaster / Math.max(1, top - low);
  const v = hs.map((h, i) => i >= lift[0] && i <= lift[1] ? 2.2 * MPS : slow.some(([a, b]) => i >= a && i <= b) ? 2 * MPS : Math.max(3 * MPS, Math.sqrt(4 * MPS * 4 * MPS + k * (top - h))));
  for (let i = v.length - 2; i >= 0; i--) v[i] = Math.min(v[i], v[i + 1] + 1.2 * MPS);   // the brakes come on gently before a slow part
  return v;
}
function coasterAnim(m, tr, cars, gap, vs) {                      // the train runs the track; one lap after another
  let s = 0, last = null;
  m.userData.anim = t => {
    const dt = last === null ? 0 : clamp(t - last, 0, 0.1); last = t; if (!ridesOn()) return;
    const i = Math.floor(((s % tr.L) + tr.L) % tr.L / tr.L * tr.n); s += vs[i] * dt;
    cars.forEach((g, k) => placeOnTrack(tr, s - k * gap, g));
  };
  cars.forEach((g, k) => placeOnTrack(tr, -k * gap, g));
}

/* ---------- the rides ---------- */
function makeWoodie(r) {                                         // out and back along the west side: a long lift, three camel humps, a turn, humps back
  const T = new GeoBuilder(), G = new GeoBuilder(), cx = (r.x0 + r.x1) / 2, cz = (r.y0 + r.y1) / 2, w = r.x1 - r.x0, L = r.y1 - r.y0;
  const xe = w / 2 - 38, xw = -w / 2 + 38, z0 = -L / 2, Z = f => z0 + f * L;
  const pts = [[xe, 14, Z(0.05)], [xe, 14, Z(0.12)], [xe, 22, Z(0.17)], [xe, 230, Z(0.33)], [xe, 238, Z(0.37)], [xe, 22, Z(0.5)], [xe, 160, Z(0.6)], [xe, 30, Z(0.69)],
    [xe, 110, Z(0.77)], [xe, 34, Z(0.84)], [xe, 60, Z(0.92)], [(xe + xw) / 2, 70, Z(0.975)], [xw, 60, Z(0.92)], [xw, 130, Z(0.83)], [xw, 30, Z(0.74)], [xw, 100, Z(0.65)],
    [xw, 26, Z(0.56)], [xw, 70, Z(0.47)], [xw, 22, Z(0.38)], [xw, 40, Z(0.29)], [xw, 16, Z(0.2)], [xw, 14, Z(0.1)], [xw, 14, Z(0.04)], [(xe + xw) / 2, 14, Z(0.008)]];
  const tr = trackOf(pts, 6), wood = _C('#f1ead8'), brace = _C('#d8cfb8');
  railsOf(T, tr, 16, 1.4, '#6a4a32', '#4a3020', 2);
  for (let i = 0; i < tr.n; i += 4) {                              // the white lattice of posts under the track
    const p = tr.P[i]; if (p.y < 18) continue;
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(tr.S[i], s * 10); box5(T, q.x - 1.2, 0, q.z - 1.2, q.x + 1.2, p.y - 2, q.z + 1.2, wood); }
    for (let y = 24; y < p.y - 6; y += 26) { const a = p.clone().addScaledVector(tr.S[i], -10), b = p.clone().addScaledVector(tr.S[i], 10); beam(T, [a.x, y, a.z], [b.x, y, b.z], 0.8, brace); }
  }
  box5(T, xe - 22, 0, Z(0.03), xe + 22, 14, Z(0.13), _C('#8a5a3a')); box5(T, xe - 26, 30, Z(0.02), xe + 26, 34, Z(0.14), _C('#a83a2a'));   // the station
  const m = lmMesh(T, G), cars = trainOf(m, 5, '#e0364f', 24), lift = [Math.floor(tr.n * 0.06), Math.floor(tr.n * 0.15)];
  coasterAnim(m, tr, cars, 24, speedOf(tr, lift, [[0, Math.floor(tr.n * 0.04)], [Math.floor(tr.n * 0.94), tr.n]]));
  return m;
}
function makeLooper(r) {                                          // steel coaster: a lift, a big drop, two loops, a helix back to the station
  const T = new GeoBuilder(), G = new GeoBuilder(), w = r.x1 - r.x0, L = r.y1 - r.y0, X = f => -w / 2 + f * w, Z = f => -L / 2 + f * L;
  const R = 70, lx1 = X(0.25), lx2 = X(0.78), lz = Z(0.62);
  const loop = (cx) => { const out = []; for (let k = 1; k < 12; k++) { const a = -Math.PI / 2 + k / 12 * TAU; out.push([cx + Math.cos(a) * R + k * 1.2 - 7, 20 + R + Math.sin(a) * R, lz + (k / 12 - 0.5) * 34]); } return out; };
  const pts = [[X(0.1), 14, Z(0.92)], [X(0.1), 14, Z(0.75)], [X(0.1), 30, Z(0.62)], [X(0.1), 250, Z(0.2)], [X(0.16), 262, Z(0.1)], [X(0.3), 240, Z(0.06)], [X(0.42), 40, Z(0.12)], [X(0.32), 24, Z(0.4)], [X(0.2), 22, Z(0.6)],
    [lx1 - 90, 20, lz - 17], ...loop(lx1), [lx1 + 90, 20, lz + 17], [lx2 - 90, 22, lz + 17], ...loop(lx2).map(p => [p[0], p[1], p[2] + 34]), [lx2 + 80, 24, lz + 51],
    [X(0.92), 90, Z(0.55)], [X(0.9), 120, Z(0.3)], [X(0.7), 110, Z(0.18)], [X(0.55), 60, Z(0.3)], [X(0.62), 40, Z(0.5)], [X(0.8), 30, Z(0.8)], [X(0.55), 18, Z(0.95)], [X(0.25), 14, Z(0.96)]];
  const tr = trackOf(pts, 5), col = '#ff2bd6';
  railsOf(T, tr, 14, 1.6, col, '#2bf3ff', 3);
  for (let i = 0; i < tr.n; i += 10) {                             // steel columns under the track (not under the upside-down parts)
    const p = tr.P[i]; if (p.y < 20 || tr.U[i].y < 0.5) continue;
    T.prism(p.x, p.z, 2.4, 0, p.y - 3, _C('#2bf3ff'), 6);
  }
  box5(T, X(0.04), 0, Z(0.78), X(0.16), 14, Z(0.94), _C('#3a3f5c')); box5(T, X(0.02), 28, Z(0.76), X(0.18), 32, Z(0.96), _C('#2bf3ff'));
  const m = lmMesh(T, G), cars = trainOf(m, 6, '#2bf3ff', 22), lift = [Math.floor(tr.n * 0.06), Math.floor(tr.n * 0.17)];
  coasterAnim(m, tr, cars, 22, speedOf(tr, lift, [[0, Math.floor(tr.n * 0.04)], [Math.floor(tr.n * 0.94), tr.n]]));
  return withSign(m, 'LOCH NEON', '#ff2bd6', 90, 18, X(0.1), 60, Z(0.97));
}
function makeFlume(r) {                                           // a log flume: a channel on stilts, a lift, a steep drop into a splash pool
  const T = new GeoBuilder(), G = new GeoBuilder(), w = r.x1 - r.x0, L = r.y1 - r.y0, X = f => -w / 2 + f * w, Z = f => -L / 2 + f * L;
  const pts = [[X(0.15), 10, Z(0.85)], [X(0.15), 10, Z(0.4)], [X(0.25), 70, Z(0.12)], [X(0.6), 90, Z(0.12)], [X(0.85), 90, Z(0.3)], [X(0.85), 96, Z(0.5)], [X(0.7), 110, Z(0.62)], [X(0.5), 118, Z(0.55)],
    [X(0.42), 20, Z(0.86)], [X(0.35), 10, Z(0.92)]];
  const tr = trackOf(pts, 6), wood = _C('#8a6a44'), water = _C('#3fb8ff');
  for (let i = 0; i < tr.n; i++) {                                  // the trough and its water
    const a = tr.P[i], b = tr.P[i + 1], sa = tr.S[i], sb = tr.S[i + 1];
    face(T, [v3(a.clone().addScaledVector(sa, -12)), v3(a.clone().addScaledVector(sa, 12)), v3(b.clone().addScaledVector(sb, 12)), v3(b.clone().addScaledVector(sb, -12))], [0, 1, 0], wood);
    face(G, [v3(a.clone().addScaledVector(sa, -9).setY(a.y + 1)), v3(a.clone().addScaledVector(sa, 9).setY(a.y + 1)), v3(b.clone().addScaledVector(sb, 9).setY(b.y + 1)), v3(b.clone().addScaledVector(sb, -9).setY(b.y + 1))], [0, 1, 0], water);
    for (const s of [-1, 1]) { const p = a.clone().addScaledVector(sa, s * 12), q = b.clone().addScaledVector(sb, s * 12); face(T, [v3(p), v3(q), [q.x, q.y + 8, q.z], [p.x, p.y + 8, p.z]], v3(sa.clone().multiplyScalar(s)), wood); }
    if (i % 5 === 0 && a.y > 14) T.prism(a.x, a.z, 1.6, 0, a.y, _C('#5a4a3a'), 5);
  }
  disc(G, X(0.4), Z(0.88), 50, 1, _C('#2f9fe8'), 20);                  // the splash pool
  const m = lmMesh(T, G), logs = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.Group(), b = new THREE.Mesh(GB, mc('#7a5a3a')); b.scale.set(24, 7, 12); b.position.y = 5; g.add(b); for (const x of [-5, 5]) { const h = new THREE.Mesh(GSph, mc('#f2c6a0')); h.scale.setScalar(2.4); h.position.set(x, 11, 0); g.add(h); } m.add(g); logs.push(g); }
  const vs = tr.P.map((p, i) => i > tr.n * 0.12 && i < tr.n * 0.3 ? 1.6 * MPS : i > tr.n * 0.78 && i < tr.n * 0.92 ? 12 * MPS : 3 * MPS);
  let s = 0, last = null, wasLow = [];
  m.userData.anim = t => {
    const dt = last === null ? 0 : clamp(t - last, 0, 0.1); last = t; if (!ridesOn()) return;
    s += vs[Math.floor(((s % tr.L) + tr.L) % tr.L / tr.L * tr.n)] * dt;
    logs.forEach((g, k) => { const sk = s - k * tr.L / 3; placeOnTrack(tr, sk, g); const f = ((sk % tr.L) + tr.L) % tr.L / tr.L; const low = f > 0.9 && f < 0.95; if (low && !wasLow[k]) { const wp = g.getWorldPosition(new THREE.Vector3()); splashFx(wp.x, wp.z, 26); } wasLow[k] = low; });
  };
  return withSign(m, 'RHINE SPLASH', '#2bf3ff', 80, 16, X(0.6), 140, Z(0.6));
}
function makeLunaWheel(d) {                                       // the Ferris wheel: two A-frames, a neon rim, gondolas that stay upright
  const T = new GeoBuilder(), G = new GeoBuilder(), R = d / 2, HY = R + 24, steel = _C('#e8eaee'), N = 36;
  for (const z of [-24, 24]) { beam(T, [-R * 0.62, 0, z], [0, HY, z], 3.4, steel); beam(T, [R * 0.62, 0, z], [0, HY, z], 3.4, steel); }
  beam(T, [0, HY, -28], [0, HY, 28], 5, steel); box5(T, -60, 0, 18, 60, 6, 50, _C('#3a3f5c'));
  const m = lmMesh(T, G), wheel = new THREE.Group(); wheel.position.y = HY; m.add(wheel);
  const WB = new GeoBuilder(), WG = new GeoBuilder(), P = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r, z];
  for (let k = 0; k < N; k++) {
    const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, c = _C(RIDE_COLS[k % RIDE_COLS.length]);
    for (const z of [-16, 16]) face(WG, [P(a0, R - 2, z), P(a1, R - 2, z), P(a1, R + 2, z), P(a0, R + 2, z)], [0, 0, Math.sign(z)], c);
    if (k % 3 === 0) for (const z of [-16, 16]) beam(WB, [0, 0, z], P(a0, R, z), 1, steel);
  }
  const rim = new THREE.Mesh(mergeBuilders([WB, WG]), LM_MAT); wheel.add(rim);
  const gond = [];
  for (let k = 0; k < 12; k++) { const g = new THREE.Group(), cab = new THREE.Mesh(GB, mc(RIDE_COLS[k % RIDE_COLS.length])); cab.scale.set(18, 14, 18); cab.position.y = -12; g.add(cab); const roof = new THREE.Mesh(GB, mc('#f4f4f4')); roof.scale.set(20, 2, 20); roof.position.y = -4; g.add(roof); wheel.add(g); gond.push(g); }
  const place = a => gond.forEach((g, k) => { const b = a + k / gond.length * TAU; g.position.set(Math.cos(b) * R, Math.sin(b) * R, 0); g.rotation.z = -a; });
  place(0); let ang = 0, last = null;
  m.userData.anim = t => { const dt = last === null ? 0 : clamp(t - last, 0, 0.1); last = t; if (!ridesOn()) return; ang += PLC.wheelRpm / 60 * TAU * dt; wheel.rotation.z = ang; place(ang); };
  return m;
}
function makeCarousel(r) {
  const T = new GeoBuilder(), G = new GeoBuilder();
  T.prism(0, 0, r, 0, 5, _C('#f4e9d0'), 24, r, true); T.prism(0, 0, 5, 5, 44, _C('#ffe14a'), 10);
  const m = lmMesh(T, G), top = new THREE.Group(); m.add(top);
  const RB = new GeoBuilder(), RG = new GeoBuilder();
  for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU; face(RB, [[0, 60, 0], [Math.cos(a1) * (r + 4), 44, Math.sin(a1) * (r + 4)], [Math.cos(a0) * (r + 4), 44, Math.sin(a0) * (r + 4)], [0, 60, 0]], [Math.cos((a0 + a1) / 2), 1, Math.sin((a0 + a1) / 2)], _C(k % 2 ? '#e0364f' : '#f4f4f4')); box5(RG, Math.cos(a0) * (r + 4) - 1.5, 41, Math.sin(a0) * (r + 4) - 1.5, Math.cos(a0) * (r + 4) + 1.5, 44, Math.sin(a0) * (r + 4) + 1.5, _C('#ffe14a')); }
  top.add(new THREE.Mesh(mergeBuilders([RB, RG]), LM_MAT));
  const horses = [];
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, g = new THREE.Group(), pole = new THREE.Mesh(GB, mc('#ffe14a')); pole.scale.set(1, 38, 1); pole.position.y = 24; g.add(pole); const h = new THREE.Mesh(GB, mc(k % 2 ? '#f4f4f4' : '#d6a46a')); h.scale.set(14, 7, 4); g.add(h); g.position.set(Math.cos(a) * (r - 12), 0, Math.sin(a) * (r - 12)); g.rotation.y = -a + Math.PI / 2; top.add(g); horses.push([h, k]); }
  m.userData.anim = t => { if (!ridesOn()) return; top.rotation.y = t * 0.5; for (const [h, k] of horses) h.position.y = 18 + Math.sin(t * 2 + k) * 4; };
  return m;
}
function makeSwings(r) {                                          // the chair swings: a tower, a turning crown, chairs flying out as it spins
  const T = new GeoBuilder(), G = new GeoBuilder(); T.prism(0, 0, 8, 0, 110, _C('#f4f4f4'), 10, 6); T.prism(0, 0, 18, 0, 6, _C('#3a3f5c'), 12, 18, true);
  const m = lmMesh(T, G), crown = new THREE.Group(); crown.position.y = 112; m.add(crown);
  const top = new THREE.Mesh(GCyl, mc('#ff2bd6')); top.scale.set(r * 0.55, 8, r * 0.55); crown.add(top);
  const chairs = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, arm = new THREE.Group(); arm.rotation.y = -a; crown.add(arm); const hang = new THREE.Group(); hang.position.x = r * 0.5; arm.add(hang); const chain = new THREE.Mesh(GB, mc('#9aa0ab')); chain.scale.set(0.6, 60, 0.6); chain.position.y = -30; hang.add(chain); const seat = new THREE.Mesh(GB, mc(RIDE_COLS[k % RIDE_COLS.length])); seat.scale.set(7, 4, 7); seat.position.y = -62; hang.add(seat); chairs.push(hang); }
  m.userData.anim = t => {
    if (!ridesOn()) return;
    const c = t % 40, w = c < 6 ? c / 6 : c < 28 ? 1 : c < 34 ? (34 - c) / 6 : 0, spin = 2.4 * w;   // speed up, ride, slow down, stand
    crown.rotation.y += spin * 0.016; for (const h of chairs) h.rotation.z = w * 0.75;
  };
  return m;
}
function makeDropTower(h) {                                       // up slowly, a pause at the top, then the drop
  const T = new GeoBuilder(), G = new GeoBuilder(); box5(T, -10, 0, -10, 10, h, 10, _C('#e8eaee')); box5(T, -14, h, -14, 14, h + 16, 14, _C('#ff2bd6'));
  for (let y = 20; y < h; y += 40) box5(G, -10.5, y, 9.6, 10.5, y + 3, 10.6, _C(RIDE_COLS[(y / 40 | 0) % RIDE_COLS.length]));
  box5(G, -3, h + 16, -3, 3, h + 24, 3, _C('#ff3b5c'));
  const m = lmMesh(T, G), ring = new THREE.Group(); m.add(ring);
  const RB = new GeoBuilder(); RB.prism(0, 0, 26, 0, 10, _C('#ffe14a'), 12, 26, true); ring.add(new THREE.Mesh(mergeBuilders([RB]), LM_MAT[0]));
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, s = new THREE.Mesh(GSph, mc('#f2c6a0')); s.scale.setScalar(2.6); s.position.set(Math.cos(a) * 22, 12, Math.sin(a) * 22); ring.add(s); }
  m.userData.anim = t => {
    if (!ridesOn()) return; const c = t % 24;
    ring.position.y = c < 4 ? 6 : c < 14 ? 6 + (c - 4) / 10 * (h - 40) : c < 17 ? h - 34 : c < 18.2 ? h - 34 - Math.pow((c - 17) / 1.2, 2) * (h - 40) : 6;
  };
  return m;
}
function makePirate() {                                           // the swinging ship
  const T = new GeoBuilder(), G = new GeoBuilder(), HY = 80;
  for (const s of [-1, 1]) for (const x of [-40, 40]) beam(T, [x, 0, s * 26], [0, HY, s * 22], 2.6, _C('#5a3a24'));
  beam(T, [0, HY, -26], [0, HY, 26], 3.5, _C('#3a2a1e'));
  const m = lmMesh(T, G), piv = new THREE.Group(); piv.position.y = HY; m.add(piv);
  const SB = new GeoBuilder(), SG = new GeoBuilder(), hull = _C('#7a4a2a');
  box5(SB, -70, -66, -18, 70, -48, 18, hull); face(SB, [[-70, -48, 18], [-84, -40, 0], [-84, -40, 0], [-70, -48, -18]], [-1, 0.3, 0], hull); face(SB, [[70, -48, -18], [84, -40, 0], [84, -40, 0], [70, -48, 18]], [1, 0.3, 0], hull);
  box5(SB, -2, -48, -1.5, 2, -6, 1.5, _C('#3a2a1e')); face(SG, [[-1, -40, 2], [30, -40, 2], [30, -12, 2], [-1, -12, 2]], [0, 0, 1], _C('#f4f4f4'));
  for (let x = -60; x <= 60; x += 15) for (const s of [-1, 1]) box5(SG, x - 2, -46, s * 12 - 2, x + 2, -42, s * 12 + 2, _C(pick(['#f2c6a0', '#d9a074'])));
  for (const s of [-1, 1]) beam(SB, [s * 50, -48, 0], [0, 0, 0], 1.2, _C('#9aa0ab'));
  piv.add(new THREE.Mesh(mergeBuilders([SB, SG]), LM_MAT));
  m.userData.anim = t => { if (!ridesOn()) return; const c = t % 36, a = c < 30 ? Math.sin(c / 30 * Math.PI) : 0; piv.rotation.z = Math.sin(t * 1.25) * a * 1.15; };
  return m;
}
function makeSkyride(a, b, cx, cz) {                              // gondolas on a cable loop between two stations
  const T = new GeoBuilder(), G = new GeoBuilder(), ax = a[0] - cx, az = a[1] - cz, bx = b[0] - cx, bz = b[1] - cz, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, H = 110;
  for (const [x, z] of [[ax, az], [bx, bz]]) { box5(T, x - 22, 0, z - 22, x + 22, H, z + 22, _C('#3a3f5c')); box5(T, x - 30, H, z - 30, x + 30, H + 6, z + 30, _C('#ff2bd6')); }
  for (let k = 1; k < 4; k++) { const x = ax + (bx - ax) * k / 4, z = az + (bz - az) * k / 4; box5(T, x - 4, 0, z - 4, x + 4, H + 10, z + 4, _C('#e8eaee')); beam(T, [x - nx * 16, H + 8, z - nz * 16], [x + nx * 16, H + 8, z + nz * 16], 1.5, _C('#e8eaee')); }
  for (const s of [-1, 1]) beam(G, [ax + nx * s * 14, H + 6, az + nz * s * 14], [bx + nx * s * 14, H + 6, bz + nz * s * 14], 0.5, _C('#cfd3dd'));
  const m = lmMesh(T, G), gs = [];
  for (let k = 0; k < 10; k++) { const g = new THREE.Group(), c = new THREE.Mesh(GB, mc(RIDE_COLS[k % RIDE_COLS.length])); c.scale.set(12, 10, 10); c.position.y = -14; g.add(c); const rod = new THREE.Mesh(GB, mc('#9aa0ab')); rod.scale.set(0.6, 10, 0.6); rod.position.y = -5; g.add(rod); m.add(g); gs.push(g); }
  m.userData.anim = t => {
    if (!ridesOn()) return;
    gs.forEach((g, k) => { const u = ((t * 0.02 + k / gs.length) % 1) * 2, out = u < 1, f = out ? u : 2 - u, s = out ? 1 : -1; g.position.set(ax + (bx - ax) * f + nx * s * 14, H + 6, az + (bz - az) * f + nz * s * 14); g.rotation.y = -Math.atan2(uz, ux); });
  };
  return m;
}
function makeParkTrain(ring, cx, cz) {                            // a little steam train round the park
  const pts = ring.map(([x, y]) => [x - cx, y - cz]), cum = [0]; for (let k = 1; k <= pts.length; k++) { const a = pts[k - 1], b = pts[k % pts.length]; cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[pts.length], m = new THREE.Group(); m.userData.own = [];
  const at = s => { s = ((s % L) + L) % L; let k = 0; while (cum[k + 1] < s) k++; const a = pts[k], b = pts[(k + 1) % pts.length], f = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
  const cars = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(), b = new THREE.Mesh(GB, mc(k === 0 ? '#2a2d3a' : RIDE_COLS[k])); b.scale.set(k === 0 ? 26 : 22, k === 0 ? 14 : 9, 14); b.position.y = k === 0 ? 9 : 7; g.add(b);
    if (k === 0) { const ch = new THREE.Mesh(GCyl, mc('#14161d')); ch.scale.set(3, 10, 3); ch.position.set(9, 20, 0); g.add(ch); const cab = new THREE.Mesh(GB, mc('#e0364f')); cab.scale.set(9, 10, 14); cab.position.set(-8, 18, 0); g.add(cab); }
    else for (const x of [-6, 6]) { const h = new THREE.Mesh(GSph, mc(pick(['#f2c6a0', '#d9a074', '#7a4d30']))); h.scale.setScalar(2.4); h.position.set(x, 14, 0); g.add(h); }
    m.add(g); cars.push(g);
  }
  let s = 0, last = null;
  const place = () => cars.forEach((g, k) => { const [x, z, a] = at(s - k * 26); g.position.set(x, 1, z); g.rotation.y = -a; });
  place();
  m.userData.anim = t => { const dt = last === null ? 0 : clamp(t - last, 0, 0.1); last = t; if (!ridesOn()) return; s += 3 * MPS * dt; place(); if (Math.random() < 0.3) { const [x, z] = at(s); const wp = m.localToWorld(new THREE.Vector3(x, 0, z)); smokeFx(wp.x, wp.z, false); } };
  return m;
}
function genRide(r, add, solid) {                                 // js/10g genPlaces: a ride's collision box and builder
  const cx = r.x !== undefined ? r.x : (r.x0 + r.x1) / 2, cy = r.y !== undefined ? r.y : (r.y0 + r.y1) / 2;
  if (r.t === 'woodie') { solid(cx, cy, r.x1 - r.x0, r.y1 - r.y0); add(cx, cy, (r.x1 - r.x0) / 2, (r.y1 - r.y0) / 2, () => makeWoodie(r)); }
  else if (r.t === 'looper') { solid(cx, cy, r.x1 - r.x0, r.y1 - r.y0); add(cx, cy, (r.x1 - r.x0) / 2, (r.y1 - r.y0) / 2, () => makeLooper(r)); }
  else if (r.t === 'flume') { solid(cx, cy, r.x1 - r.x0, r.y1 - r.y0); add(cx, cy, (r.x1 - r.x0) / 2, (r.y1 - r.y0) / 2, () => makeFlume(r)); }
  else if (r.t === 'wheel') { for (const s of [-1, 1]) solid(cx + s * r.d * 0.31, cy, 40, 60); solid(cx, cy + 34, 120, 32); add(cx, cy, r.d / 2, 40, () => makeLunaWheel(r.d)); }
  else if (r.t === 'carousel') { solid(cx, cy, r.r * 1.6, r.r * 1.6); add(cx, cy, r.r, r.r, () => makeCarousel(r.r)); }
  else if (r.t === 'swings') { solid(cx, cy, r.r * 1.5, r.r * 1.5); add(cx, cy, r.r * 1.2, r.r * 1.2, () => makeSwings(r.r)); }
  else if (r.t === 'tower') { solid(cx, cy, 40, 40); add(cx, cy, 30, 30, () => makeDropTower(r.h)); }
  else if (r.t === 'pirate') { solid(cx, cy, 150, 70); add(cx, cy, 90, 40, makePirate, (r.a || 0) * Math.PI / 180); }
  else if (r.t === 'skyride') { const mx = (r.a[0] + r.b[0]) / 2, my = (r.a[1] + r.b[1]) / 2; for (const p of [r.a, r.b]) solid(p[0], p[1], 46, 46); add(mx, my, Math.abs(r.b[0] - r.a[0]) / 2 + 40, Math.abs(r.b[1] - r.a[1]) / 2 + 40, () => makeSkyride(r.a, r.b, mx, my)); }
  if (r.t === 'woodie' && LUNA.train) { const A = LUNA.area[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of A.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; LMS.push({ cx: mx, cy: my, a: 0, rad: Math.hypot(x1 - x0, y1 - y0) / 2, make: () => makeParkTrain(LUNA.train, mx, my), mesh: null }); }
}
