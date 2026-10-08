'use strict';
/* ---------- 7e. LANDMARKS AND PROPS: stadium, estate, mall, lighthouse, airport, film studio, dock cranes, containers, planes ----------
   Each one is built in its own frame (x east, z south, y up) as one merged mesh, and streamed like the buildings.
   genLandmarks() adds their collision boxes to the world and their builders to LMS. */
let LMS = [], LM_CLEAR = [];                                    // drawables; areas [x, y, half width, half height] kept free of trees and street furniture
const inLandmark = (x, y) => LM_CLEAR.some(c => Math.abs(x - c[0]) < c[2] && Math.abs(y - c[1]) < c[3]);
const LM_MAT = [new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ vertexColors: true })];
const _C = h => new THREE.Color(h);
function lmMesh(T, G) { const m = new THREE.Mesh(mergeBuilders([T, G]), LM_MAT); m.userData.own = []; return m; }
function face(gb, pts, n, col) {                                 // quad of four [x, y, z] points, wound so it faces n
  const [a, b, c] = pts, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) pts = [pts[0], pts[3], pts[2], pts[1]];
  gb.quad(pts[0], pts[1], pts[2], pts[3], n, col, Z4);
}
function box5(gb, x0, y0, z0, x1, y1, z1, col) {                 // a box with all sides but the bottom (props can face any way)
  face(gb, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], col);
  face(gb, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], col);
  face(gb, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], col);
  face(gb, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0], col);
  face(gb, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], col);
}
const flat = (gb, x0, z0, x1, z1, y, col) => face(gb, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, 1, 0], col);
function disc(gb, cx, cz, r, y, col, seg) {
  for (let k = 0; k < seg; k++) { const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU; gb.tri([cx, y, cz], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [0, 1, 0], col); }
}
const _txt = {};
function textTex(text, col) {
  const k = text + col; if (_txt[k]) return _txt[k];
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0a0614'; g.fillRect(0, 0, 512, 128); g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 16; g.strokeRect(10, 10, 492, 108);
  let fs = 76; const font = () => 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; g.font = font(); while (g.measureText(text).width > 450 && fs > 20) { fs -= 4; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, 256, 68); g.shadowBlur = 4; g.globalAlpha = 0.85; g.fillStyle = '#ffffff'; g.fillText(text, 256, 68);
  return (_txt[k] = finishTex(c));
}
function signMesh(text, col, w, h) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, col), side: THREE.DoubleSide })); }
function palm(T, x, z, h) {
  T.prism(x, z, 2.4, 0, h, _C('#3b2a1e'), 5);
  T.prism(x, z, 14, h - 2, h + 3, _C(pick(['#0f8f86', '#1ec9a6', '#14a37f'])), 7, 2, true);
}

/* ---------- landmarks ---------- */
function makeStadium(L) {                                        // a bowl of stepped stands around a dirt oval and an infield; entrance tunnel to the south
  const T = new GeoBuilder(), G = new GeoBuilder(), R = L.r, seg = 56, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
  disc(T, 0, 0, R - 62, 0.7, _C('#6b4636'), 48); disc(T, 0, 0, R - 118, 1.0, _C('#1f7a46'), 48);
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; face(G, [P(a, R - 121, 1.2), P(a + 0.12, R - 121, 1.2), P(a + 0.12, R - 117, 1.2), P(a, R - 117, 1.2)], [0, 1, 0], _C('#f1ead2')); }
  const rows = [[R - 62, R - 46, 7, '#2bf3ff'], [R - 46, R - 31, 15, '#ff2bd6'], [R - 31, R - 16, 23, '#ffe14a'], [R - 16, R, 34, '#3a2f66']], cw = _C('#2a2348'), neon = _C('#ff2bd6');
  rows.forEach(([r0, r1, h, col], ri) => {
    const c = _C(col), c2 = c.clone().multiplyScalar(0.8), last = ri === rows.length - 1;
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, am = (a0 + a1) / 2; if (stadiumGap(am)) continue;
      face(T, [P(a0, r0, h), P(a1, r0, h), P(a1, r1, h), P(a0, r1, h)], [0, 1, 0], k % 2 ? c : c2);
      face(T, [P(a0, r0, 0), P(a1, r0, 0), P(a1, r0, h), P(a0, r0, h)], [-Math.cos(am), 0, -Math.sin(am)], cw);
      if (last) { face(T, [P(a0, r1, 0), P(a1, r1, 0), P(a1, r1, h), P(a0, r1, h)], [Math.cos(am), 0, Math.sin(am)], cw); face(G, [P(a0, r1 - 3, h + 0.4), P(a1, r1 - 3, h + 0.4), P(a1, r1, h + 0.4), P(a0, r1, h + 0.4)], [0, 1, 0], neon); }
    }
  });
  for (const a of [0.8, 2.35, 3.95, 5.5]) { const x = Math.cos(a) * (R + 14), z = Math.sin(a) * (R + 14); T.prism(x, z, 2.6, 0, 96, _C('#14102a'), 6); box5(G, x - 11, 94, z - 4, x + 11, 102, z + 4, _C('#fff3b0')); }
  const m = lmMesh(T, G), sg = signMesh('NEON BOWL', '#2bf3ff', 230, 44); sg.position.set(0, 58, R - 4); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
const stadiumGap = a => Math.abs(angDiff(a, Math.PI / 2)) < 0.2;
function makeEstate(L) {                                         // walled mansion: gate to the road in the north, pool terrace to the south
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, x0 = -w / 2, x1 = w / 2, z0 = -h / 2, z1 = h / 2, t = 9, gate = 110;
  const cream = _C('#efe2c8'), white = _C('#f6f2ea'), pink = _C('#ff6fae');
  flat(T, x0, z0, x1, z1, 0.6, _C('#2f8f4e'));
  box5(T, x0, 0, z0, -gate / 2, 16, z0 + t, cream); box5(T, gate / 2, 0, z0, x1, 16, z0 + t, cream);
  box5(T, x0, 0, z1 - t, x1, 16, z1, cream); box5(T, x0, 0, z0, x0 + t, 16, z1, cream); box5(T, x1 - t, 0, z0, x1, 16, z1, cream);
  for (const [a0, a1, b0, b1] of [[x0, -gate / 2, z0, z0 + t], [gate / 2, x1, z0, z0 + t], [x0, x1, z1 - t, z1], [x0, x0 + t, z0, z1], [x1 - t, x1, z0, z1]]) flat(G, a0, b0, a1, b1, 16.3, pink);
  for (const sx of [-1, 1]) { box5(T, sx * gate / 2 - 9, 0, z0 - 4, sx * gate / 2 + 9, 28, z0 + t + 4, white); box5(G, sx * gate / 2 - 5, 28, z0, sx * gate / 2 + 5, 33, z0 + t, _C('#fff3b0')); }
  const [hx, hz, hw, hd] = [L.house[0] - L.x, L.house[1] - L.y, L.house[2], L.house[3]], ha = hx - hw / 2, hb = hx + hw / 2, hc = hz - hd / 2, he = hz + hd / 2;
  box5(T, ha, 0, hc, hb, 30, he, white); box5(T, ha + 40, 30, hc + 26, hb - 40, 50, he - 26, white);
  const terra = _C('#c8664a'); box5(T, ha - 3, 30, hc - 3, hb + 3, 33, he + 3, terra); box5(T, ha + 37, 50, hc + 23, hb - 37, 53, he - 23, terra);   // tiled roofs
  for (let x = ha + hw * 0.25; x <= hb - hw * 0.25 + 1; x += hw * 0.1) T.prism(x, hc - 16, 3.4, 0, 30, white, 8);
  box5(T, ha + hw * 0.22, 30, hc - 22, hb - hw * 0.22, 34, hc, white);
  for (const y of [9, 21]) { face(G, [[ha + 8, y, he + 0.3], [hb - 8, y, he + 0.3], [hb - 8, y + 5, he + 0.3], [ha + 8, y + 5, he + 0.3]], [0, 0, 1], _C('#ffd98a')); }
  face(G, [[ha + 46, 38, he - 26 + 0.3], [hb - 46, 38, he - 26 + 0.3], [hb - 46, 44, he - 26 + 0.3], [ha + 46, 44, he - 26 + 0.3]], [0, 0, 1], _C('#ffd98a'));
  const pz = he + 18; flat(T, hx - 120, pz, hx + 120, pz + 100, 0.9, _C('#e9e2d4')); flat(G, hx - 100, pz + 12, hx + 100, pz + 88, 1.1, _C('#3fe8ff'));
  const fz = (z0 + t + hc) / 2; T.prism(0, fz, 24, 0, 3, white, 16, 24, true); disc(G, 0, fz, 19, 3.2, _C('#3fe8ff'), 16); T.prism(0, fz, 2, 3, 12, white, 6);
  for (let x = x0 + 40; x < x1 - 30; x += 110) { palm(T, x, z0 + 30, 26); palm(T, x + 50, z1 - 30, 24); }
  return lmMesh(T, G);
}
function makeMall(L) {                                           // H-shaped two-storey mall around a glass atrium, car parks in the courtyards
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, ww = w * 0.3, ch = h * 0.13, wall = _C('#d9d2ea'), glass = _C('#3fe0ff'), line = _C('#f1ead2');
  const blocks = [[-w / 2, -h / 2, -w / 2 + ww, h / 2, 38], [w / 2 - ww, -h / 2, w / 2, h / 2, 38], [-w / 2 + ww, -ch, w / 2 - ww, ch, 44]];
  for (const [a, b, c, d, H] of blocks) {
    box5(T, a, 0, b, c, H, d, wall); box5(T, a - 2, H, b - 2, c + 2, H + 3, d + 2, _C('#b7aed0'));
    for (const y of [10, 27]) { face(G, [[a + 6, y, d + 0.3], [c - 6, y, d + 0.3], [c - 6, y + 5, d + 0.3], [a + 6, y + 5, d + 0.3]], [0, 0, 1], glass); face(G, [[c + 0.3, y, b + 6], [c + 0.3, y, d - 6], [c + 0.3, y + 5, d - 6], [c + 0.3, y + 5, b + 6]], [1, 0, 0], glass); face(G, [[a - 0.3, y, b + 6], [a - 0.3, y, d - 6], [a - 0.3, y + 5, d - 6], [a - 0.3, y + 5, b + 6]], [-1, 0, 0], glass); }
  }
  for (const sx of [-1, 1]) flat(G, sx * (w / 2 - ww / 2) - 8, -h / 2 + 20, sx * (w / 2 - ww / 2) + 8, h / 2 - 20, 41.2, glass);
  flat(G, -w / 2 + ww + 10, -ch + 10, w / 2 - ww - 10, ch - 10, 47.2, _C('#7fe8ff'));
  for (const sz of [-1, 1]) for (let k = 0; k < 5; k++) {
    const z = sz * (ch + 30 + k * 60); if (Math.abs(z) > h / 2 - 20) continue;
    for (let x = -w / 2 + ww + 14; x < w / 2 - ww - 14; x += 26) flat(G, x, z - 0.8, x + 2, z + 22, 0.9, line);
  }
  const m = lmMesh(T, G), sg = signMesh('BAYSIDE MALL', '#ff2bd6', 150, 32); sg.position.set(0, 64, ch + 2); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeLighthouse() {                                      // striped tower on the rocks with a turning beam
  const T = new GeoBuilder(), G = new GeoBuilder(), red = _C('#e0364f'), white = _C('#f4f4f4');
  T.prism(0, 0, 46, 0, 6, _C('#5a5468'), 12, 40, true);
  for (let k = 0; k < 6; k++) { const y0 = 6 + k * 21, r0 = 15 - k * 0.8; T.prism(0, 0, r0, y0, y0 + 21, k % 2 ? red : white, 14, r0 - 0.8); }
  T.prism(0, 0, 17, 132, 134, _C('#2a2348'), 14, 17, true); G.prism(0, 0, 8, 134, 148, _C('#fff3b0'), 12, 8); T.prism(0, 0, 11, 148, 160, red, 12, 1, true);
  box5(T, 20, 6, -14, 52, 22, 14, white); box5(T, 18, 22, -16, 54, 25, 16, red);
  const m = lmMesh(T, G), beam = new THREE.Mesh(GP, glowMat('#fff3b0', 0.55)); beam.scale.set(520, 1, 70); beam.position.set(260, 0, 0);
  const pivot = new THREE.Group(); pivot.position.y = 141; pivot.add(beam); m.add(pivot);
  m.userData.anim = t => { pivot.rotation.y = t * 0.9; }; return m;
}
function makeTerminal(L) {                                       // airport terminal hall with two piers and jet bridges
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, hall = _C('#cfd3dd'), glass = _C('#3fe0ff');
  const hz0 = -h * 0.45, hz1 = h * 0.05; box5(T, -w * 0.45, 0, hz0, w * 0.45, 34, hz1, hall); box5(T, -w * 0.3, 34, hz0 + 20, w * 0.3, 46, hz1 - 30, _C('#b8bdc9'));
  face(G, [[-w * 0.43, 8, hz1 + 0.3], [w * 0.43, 8, hz1 + 0.3], [w * 0.43, 28, hz1 + 0.3], [-w * 0.43, 28, hz1 + 0.3]], [0, 0, 1], glass);
  flat(G, -w * 0.3, hz0 + 20, w * 0.3, hz0 + 26, 46.2, _C('#ff2bd6'));
  for (const sx of [-1, 1]) {
    const px = sx * w * 0.3; box5(T, px - 30, 0, hz1, px + 30, 20, h * 0.45, hall); face(G, [[px - 28, 6, h * 0.45 + 0.3], [px + 28, 6, h * 0.45 + 0.3], [px + 28, 15, h * 0.45 + 0.3], [px - 28, 15, h * 0.45 + 0.3]], [0, 0, 1], glass);
    for (let z = hz1 + 40; z < h * 0.42; z += 70) { const xa = px - sx * 30, xb = px - sx * 78; box5(T, Math.min(xa, xb), 12, z - 3, Math.max(xa, xb), 18, z + 3, _C('#9aa0ab')); }   // jet bridges
  }
  const m = lmMesh(T, G), sg = signMesh('SKYPORT', '#2bf3ff', 200, 40); sg.position.set(0, 66, hz1 - 30); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeTower() {                                           // air traffic control tower
  const T = new GeoBuilder(), G = new GeoBuilder(), c = _C('#cfd3dd');
  box5(T, -25, 0, -25, 25, 16, 25, c); T.prism(0, 0, 9, 16, 112, c, 10); G.prism(0, 0, 18, 112, 126, _C('#3fe0ff'), 12, 20);
  T.prism(0, 0, 21, 126, 129, _C('#2a2348'), 12, 21, true); T.prism(0, 0, 1, 129, 150, _C('#14102a'), 4); box5(G, -2, 150, -2, 2, 154, 2, _C('#ff3b5c'));
  return lmMesh(T, G);
}
function makeHangars(L) {                                        // three arched hangars, doors to the south
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, n = 3, hw = (w - 40) / n / 2 - 8, roof = _C('#b9bcc4'), dark = _C('#2a2d38');
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + 20 + (i + 0.5) * (w - 40) / n, seg = 12, H = hw * 0.7, z0 = -h / 2 + 10, z1 = h / 2 - 10;
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI, a1 = (k + 1) / seg * Math.PI, p = (a, z) => [cx + Math.cos(a) * hw, Math.sin(a) * H, z], am = (a0 + a1) / 2;
      face(T, [p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1)], [Math.cos(am), Math.sin(am), 0], k % 2 ? roof : roof.clone().multiplyScalar(0.9));
      T.tri([cx, 0, z1], p(a0, z1), p(a1, z1), [0, 0, 1], _C('#8f939d'));
    }
    face(G, [[cx - hw * 0.7, 0, z1 + 0.4], [cx + hw * 0.7, 0, z1 + 0.4], [cx + hw * 0.7, H * 0.7, z1 + 0.4], [cx - hw * 0.7, H * 0.7, z1 + 0.4]], [0, 0, 1], dark);
    face(G, [[cx - 12, H * 0.74, z1 + 0.5], [cx + 12, H * 0.74, z1 + 0.5], [cx + 12, H * 0.74 + 6, z1 + 0.5], [cx - 12, H * 0.74 + 6, z1 + 0.5]], [0, 0, 1], _C('#ffe14a'));
  }
  return lmMesh(T, G);
}
function makeStudio(L) {                                         // three sound stages, a water tower and the gate sign
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, wall = _C('#c9c4d6');
  for (const [a, b, c, d] of studioStages(L)) {
    box5(T, a, 0, b, c, 54, d, wall); box5(T, a - 2, 54, b - 2, c + 2, 57, d + 2, _C('#9a95ab'));
    for (let x = a + 24; x < c - 20; x += 46) for (let z = b + 24; z < d - 20; z += 54) { box5(T, x, 57, z, x + 14, 63, z + 14, _C('#9aa0ab')); T.prism(x + 7, z + 7, 4, 63, 64, _C('#555a66'), 8, 4, true); }
    flat(G, a + 4, d - 6, c - 4, d - 3, 57.3, _C('#ffe14a'));
    face(G, [[a + 10, 4, d + 0.3], [a + 34, 4, d + 0.3], [a + 34, 30, d + 0.3], [a + 10, 30, d + 0.3]], [0, 0, 1], _C('#2a2d38'));
  }
  const tx = w / 2 - 40, tz = -h / 2 + 40; for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) T.lbox(tx + dx - 0.6, 0, tz + dz - 0.6, tx + dx + 0.6, 40, tz + dz + 0.6, _C('#2b2e38'), false);
  T.prism(tx, tz, 11, 40, 56, _C('#d9d2ea'), 12); T.prism(tx, tz, 12, 56, 62, _C('#2a2348'), 12, 1, true);
  const mesh = lmMesh(T, G);
  studioStages(L).forEach(([a, b, c, d], i) => { const sg = signMesh('STAGE ' + (i + 1), '#ffe14a', 70, 18); sg.position.set((a + c) / 2 + 20, 42, d + 0.6); mesh.add(sg); mesh.userData.own.push(sg.material); });
  const gs = signMesh('HERON STUDIOS', '#ff2bd6', 150, 32); gs.position.set(0, 40, h / 2 + 4); mesh.add(gs); mesh.userData.own.push(gs.material);
  return mesh;
}
function studioStages(L) { const w = L.w, h = L.h; return [[-w / 2 + 14, -h / 2 + 14, -14, -16], [14, -h / 2 + 90, w / 2 - 14, 30], [-w / 2 + 14, 14, w * 0.15, h / 2 - 50]]; }

/* ---------- the Colony Hotel, 736 Ocean Drive (1935, Henry Hohauser) ----------
   White three-storey Streamline Moderne front: turquoise bands, eyebrow ledges over the windows wrapping round the rounded street corners,
   a stepped parapet, and the inverted-T neon sign: COLONY down a pylon in the middle, HOTEL across the bar over the door, all in blue.
   The building stands on the west side of the beach road and faces it (local +x points at the road). */
let COLONY = null;
const COLONY_SIGN = 14;                                          // how far the sign stands out from the front
function colonySpot() {
  COLONY = null; const L = MAP.lm.find(l => l.t === 'colony'); if (!L) return null;
  const r = nearestRoad(L.x, L.y, 500); if (!r) return null;
  const q = edgeAt(r.e, r.s, {}); let nx = -q.ty, ny = q.tx; if (nx > 0) { nx = -nx; ny = -ny; }   // the side away from the beach
  let back = 260;                                                 // the lot runs back until the sidewalk of the next street
  for (let t = ROAD_HALF + 40; t < 420; t += 6) { const o = nearestRoad(q.x + nx * t, q.y + ny * t, ROAD_HALF + 2); if (o && o.e !== r.e) { back = t - 18; break; } }
  const fr = ROAD_HALF + 16 + COLONY_SIGN, D = clamp(back - fr, 70, 124), Wf = 156, off = fr + D / 2, a = Math.atan2(-ny, -nx);
  return (COLONY = { cx: q.x + nx * off, cy: q.y + ny * off, a, ca: Math.cos(a), sa: Math.sin(a), lw: D, lh: Wf });
}
function hitsColony(cx, cy, w, h, angDeg) {                      // does a map building overlap the Colony's lot?
  if (!COLONY) return false;
  const a = angDeg * Math.PI / 180, b = { cx, cy, lw: w, lh: h, ca: Math.cos(a), sa: Math.sin(a) };
  const pts = o => [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([u, v]) => [o.cx + o.ca * u * o.lw / 2 - o.sa * v * o.lh / 2, o.cy + o.sa * u * o.lw / 2 + o.ca * v * o.lh / 2]);
  return pts(b).some(([x, y]) => inSolid(x, y, COLONY, 16)) || pts(COLONY).some(([x, y]) => inSolid(x, y, b, 16));
}
const _ntx = {};
function neonTex(text, vertical) {                               // blue neon letters on the white sign panel
  const k = text + vertical; if (_ntx[k]) return _ntx[k];
  const n = text.length, c = document.createElement('canvas'); c.width = vertical ? 128 : 96 * n; c.height = vertical ? 96 * n : 128; const g = c.getContext('2d');
  g.fillStyle = '#e9edf3'; g.fillRect(0, 0, c.width, c.height);
  g.font = 'bold 84px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...text].forEach((ch, i) => {
    const x = vertical ? 64 : 48 + i * 96, y = vertical ? 48 + i * 96 + 4 : 68;
    g.shadowColor = '#2f9bff'; g.shadowBlur = 22; g.fillStyle = '#1e7bff'; g.fillText(ch, x, y);
    g.shadowBlur = 6; g.fillStyle = '#9fd4ff'; g.fillText(ch, x, y);
  });
  return (_ntx[k] = finishTex(c));
}
function neonSign(text, vertical, w, h) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonTex(text, vertical) })); }
function makeColony() {
  const T = new GeoBuilder(), G = new GeoBuilder(), D = COLONY.lw, W = COLONY.lh, x0 = -D / 2, x1 = D / 2, z0 = -W / 2, z1 = W / 2, H = 50;
  const white = _C('#f2efe6'), turq = _C('#35c9c0'), glass = _C('#1d2f4a'), blue = _C('#2f9bff'), warm = _C('#ffd98a');
  const front = (gb, y0, y1, za, zb, col, dx) => face(gb, [[x1 + (dx || 0.3), y0, za], [x1 + (dx || 0.3), y0, zb], [x1 + (dx || 0.3), y1, zb], [x1 + (dx || 0.3), y1, za]], [1, 0, 0], col);
  box5(T, x0 - 6, 0, z0 - 6, x1 + 4, 2.5, z1 + 6, _C('#2c2350'));                                     // pavement
  box5(T, x0, 2.5, z0, x1 - 8, H, z1, white); box5(T, x1 - 8, 2.5, z0 + 8, x1, H, z1 - 8, white);     // the block, front corners rounded off
  for (const sz of [-1, 1]) T.prism(x1 - 8, sz * (W / 2 - 8), 8, 2.5, H, white, 10);
  front(T, 2.5, 5, z0 + 8, z1 - 8, turq);                                                              // turquoise base band
  front(G, 6, 16, -34, 34, warm);                                                                      // lit lobby behind the glass
  for (const zc of [-60, -46, 46, 60]) front(T, 6, 15, zc - 5, zc + 5, glass);
  for (const y of [20, 35]) {
    for (const zc of [-60, -44, -28, 28, 44, 60]) front(T, y, y + 9, zc - 6, zc + 6, glass);
    for (const sz of [-1, 1]) face(T, [[x1 - 36, y, sz * (z1 + 0.3)], [x1 - 12, y, sz * (z1 + 0.3)], [x1 - 12, y + 9, sz * (z1 + 0.3)], [x1 - 36, y + 9, sz * (z1 + 0.3)]], [0, 0, sz], glass);   // steel corner windows
  }
  for (const y of [18, 31, 46]) {                                                                      // eyebrows over each window row, wrapping the corners
    box5(T, x1, y, z0 + 8, x1 + 6, y + 1.6, z1 - 8, white);
    for (const sz of [-1, 1]) { box5(T, x1 - 40, y, sz > 0 ? z1 : z0 - 6, x1 - 8, y + 1.6, sz > 0 ? z1 + 6 : z0, white); T.prism(x1 - 8, sz * (W / 2 - 8), 14, y, y + 1.6, white, 12, 14, true); }
    front(T, y - 2.4, y, z0 + 8, z1 - 8, turq);
    box5(G, x1 + 5.4, y - 0.7, z0 + 10, x1 + 6.2, y - 0.1, z1 - 10, blue);                            // blue neon under the ledge
  }
  front(T, H - 4.5, H - 2, z0 + 8, z1 - 8, turq);                                                      // the painted band under the roofline
  box5(T, x1 - 34, H, -40, x1, H + 6, 40, white); box5(T, x1 - 24, H + 6, -26, x1, H + 11, 26, white); // stepped parapet
  front(T, H + 4, H + 6, -40, 40, turq, 0.4); front(T, H + 9, H + 11, -26, 26, turq, 0.4);
  const F = x1 + COLONY_SIGN;
  box5(T, x1 + 2, 14, -48, F, 22, 48, white);                                                          // the bar of the T, over the door
  for (const [a, b] of [[14, 14.8], [21.2, 22]]) box5(G, F - 0.4, a, -48, F + 0.4, b, 48, blue);
  box5(T, x1 - 2, 22, -11, F, 92, 11, white);                                                          // the stem: a pylon standing out from the front
  for (const sz of [-1, 1]) box5(G, F - 0.4, 22, sz * 11 - 0.4, F + 0.4, 92, sz * 11 + 0.4, blue);
  box5(G, x1 - 2, 92, -11.4, F + 0.4, 93, 11.4, blue);
  for (const [ax, az] of [[x0 + 24, z0 + 26], [x0 + 24, z1 - 40], [x0 + 52, 0]]) box5(T, ax, H, az, ax + 14, H + 6, az + 14, _C('#9aa0ab'));
  const m = lmMesh(T, G), sign = (mesh, x, y, z, ry) => { mesh.position.set(x, y, z); mesh.rotation.y = ry; m.add(mesh); m.userData.own.push(mesh.material); };
  sign(neonSign('COLONY', true, 18, 64), F + 0.5, 58, 0, Math.PI / 2);                                  // COLONY down the face of the pylon, to the street
  sign(neonSign('COLONY', true, 14, 64), (x1 - 2 + F) / 2, 58, 11.5, 0);                                 // and on its sides, for anyone driving along Ocean Drive
  sign(neonSign('COLONY', true, 14, 64), (x1 - 2 + F) / 2, 58, -11.5, Math.PI);
  sign(neonSign('HOTEL', false, 70, 6.4), F + 0.5, 18, 0, Math.PI / 2);                                 // HOTEL across the bar
  return m;
}

/* ---------- props ---------- */
function makeCrane() {                                           // gantry crane; the boom (+x) reaches out over the water
  const T = new GeoBuilder(), G = new GeoBuilder(), yel = _C('#ffb02e'), red = _C('#ff4d4d'), dark = _C('#2b2e38');
  for (const [lx, lz] of CRANE_LEGS) box5(T, lx - 3, 0, lz - 3, lx + 3, 66, lz + 3, yel);
  box5(T, -29, 60, -37, 23, 66, -31, yel); box5(T, -29, 60, 31, 23, 66, 37, yel); box5(T, -29, 60, -37, -23, 66, 37, yel); box5(T, 17, 60, -37, 23, 66, 37, yel);
  box5(T, -64, 66, -5, 172, 72, 5, yel); box5(T, -76, 58, -11, -54, 72, 11, dark); box5(T, -12, 72, -14, 20, 88, 14, red);
  box5(T, 110, 58, -8, 126, 66, 8, dark); box5(T, 117, 26, -1, 119, 58, 1, dark); box5(T, 108, 20, -10, 128, 26, 10, _C('#2f6fd6'));
  box5(G, 168, 72, -3, 174, 76, 3, _C('#ff3b5c')); box5(G, -2, 88, -2, 2, 92, 2, _C('#ff3b5c'));
  return lmMesh(T, G);
}
const CRANE_LEGS = [[-26, -34], [-26, 34], [20, -34], [20, 34]];
const BOX_COLS = ['#d64545', '#2f6fd6', '#2fbf71', '#e0912f', '#22a6b3', '#8e5bd6', '#cfcfcf'];
function makeContainers() {                                      // 4 x 3 container yard, stacked up to three high
  const T = new GeoBuilder(), G = new GeoBuilder();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = -94 + i * 47, z = -31 + j * 21, n = randi(1, 3);
    for (let l = 0; l < n; l++) { const c = _C(pick(BOX_COLS)); box5(T, x, l * 17, z, x + 44, l * 17 + 16.5, z + 18, c); }
  }
  return lmMesh(T, G);
}
function makePlane() {                                           // parked airliner, nose along +x
  const T = new GeoBuilder(), G = new GeoBuilder(), white = _C('#eef0f4'), grey = _C('#9aa0ab'), liv = _C(pick(['#ff2bd6', '#2bf3ff', '#ffb02e', '#3dffa6']));
  box5(T, -100, 14, -12, 90, 38, 12, white); box5(T, 90, 18, -9, 112, 34, 9, white); box5(T, -126, 22, -7, -100, 36, 7, white);
  box5(T, -20, 20, -100, 30, 24, 100, white); for (const s of [-1, 1]) box5(T, 0, 10, s * 46 - 7, 30, 22, s * 46 + 7, grey);
  box5(T, -126, 36, -2, -100, 72, 2, liv); box5(T, -126, 34, -36, -104, 37, 36, white);
  for (const s of [-1, 1]) face(G, [[-98, 25, s * 12.3], [88, 25, s * 12.3], [88, 29, s * 12.3], [-98, 29, s * 12.3]], [0, 0, s], liv);
  face(G, [[96, 30, -6], [110, 30, -6], [110, 30, 6], [96, 30, 6]], [0, 1, 0], _C('#1d2740'));
  for (const [x, z] of [[70, 0], [-10, -18], [-10, 18]]) box5(T, x - 2, 0, z - 2, x + 2, 14, z + 2, _C('#2b2e38'));
  return lmMesh(T, G);
}

/* ---------- registration: collision boxes into the world, builders into LMS ---------- */
function genLandmarks() {
  LMS = []; LM_CLEAR = [];
  const add = (cx, cy, a, rad, make, hw, hh) => { LMS.push({ cx, cy, a, rad, make, mesh: null }); LM_CLEAR.push([cx, cy, (hw || Math.min(rad, 300)) + 30, (hh || Math.min(rad, 300)) + 30]); };
  const solid = (x, y, a, lx, lz, w, h) => { const ca = Math.cos(a), sa = Math.sin(a); makeSolid(x + ca * lx - sa * lz, y + sa * lx + ca * lz, w, h, a, {}); };
  for (const L of MAP.lm) {
    if (L.t === 'stadium') {
      const R = L.r, seg = 56;
      for (let k = 0; k < seg; k++) { const am = (k + 0.5) / seg * TAU; if (stadiumGap(am)) continue; solid(L.x + Math.cos(am) * (R - 31), L.y + Math.sin(am) * (R - 31), am + Math.PI / 2, 0, 0, TAU * R / seg * 1.08, 62); }
      add(L.x, L.y, 0, R + 20, () => makeStadium(L));
    } else if (L.t === 'estate') {
      const x0 = L.x - L.w / 2, x1 = L.x + L.w / 2, y0 = L.y - L.h / 2, y1 = L.y + L.h / 2, t = 9, g = 110, sw = (L.w - g) / 2;
      makeSolid(x0 + sw / 2, y0 + t / 2, sw, t, 0, {}); makeSolid(x1 - sw / 2, y0 + t / 2, sw, t, 0, {}); makeSolid(L.x, y1 - t / 2, L.w, t, 0, {});
      makeSolid(x0 + t / 2, L.y, t, L.h, 0, {}); makeSolid(x1 - t / 2, L.y, t, L.h, 0, {});
      makeSolid(L.house[0], L.house[1], L.house[2], L.house[3], 0, {});
      add(L.x, L.y, 0, Math.hypot(L.w, L.h) / 2, () => makeEstate(L), L.w / 2, L.h / 2);
    } else if (L.t === 'mall') {
      const ww = L.w * 0.3, ch = L.h * 0.13;
      makeSolid(L.x - L.w / 2 + ww / 2, L.y, ww, L.h, 0, {}); makeSolid(L.x + L.w / 2 - ww / 2, L.y, ww, L.h, 0, {}); makeSolid(L.x, L.y, L.w - 2 * ww, 2 * ch, 0, {});
      add(L.x, L.y, 0, Math.hypot(L.w, L.h) / 2, () => makeMall(L), L.w / 2, L.h / 2);
    } else if (L.t === 'lighthouse') { makeSolid(L.x, L.y, 36, 36, 0, {}); makeSolid(L.x + 36, L.y, 32, 28, 0, {}); add(L.x, L.y, 0, 600, makeLighthouse, 60, 60); }
    else if (L.t === 'terminal') {
      makeSolid(L.x, L.y - L.h * 0.2, L.w * 0.9, L.h * 0.5, 0, {});
      for (const sx of [-1, 1]) makeSolid(L.x + sx * L.w * 0.3, L.y + L.h * 0.25, 60, L.h * 0.4, 0, {});
      add(L.x, L.y, 0, Math.hypot(L.w, L.h) / 2, () => makeTerminal(L), L.w / 2, L.h / 2);
    } else if (L.t === 'tower') { makeSolid(L.x, L.y, 50, 50, 0, {}); add(L.x, L.y, 0, 60, makeTower); }
    else if (L.t === 'hangars') { makeSolid(L.x, L.y, L.w - 40, L.h - 20, 0, {}); add(L.x, L.y, 0, Math.hypot(L.w, L.h) / 2, () => makeHangars(L), L.w / 2, L.h / 2); }
    else if (L.t === 'colony' && COLONY) {
      const c = COLONY; makeSolid(c.cx, c.cy, c.lw, c.lh, c.a, {});
      solid(c.cx, c.cy, c.a, c.lw / 2 + COLONY_SIGN / 2, 0, COLONY_SIGN + 2, 22);                        // the sign pylon
      add(c.cx, c.cy, c.a, 120, makeColony, 90, 90);
    }
    else if (L.t === 'studio') {
      for (const [a, b, c, d] of studioStages(L)) makeSolid(L.x + (a + c) / 2, L.y + (b + d) / 2, c - a, d - b, 0, {});
      add(L.x, L.y, 0, Math.hypot(L.w, L.h) / 2, () => makeStudio(L), L.w / 2, L.h / 2);
    }
  }
  for (const p of MAP.props) {
    const a = p.a * Math.PI / 180;
    if (p.t === 'crane') { for (const [lx, lz] of CRANE_LEGS) solid(p.x, p.y, a, lx, lz, 7, 7); add(p.x, p.y, a, 180, makeCrane); }
    else if (p.t === 'containers') { solid(p.x, p.y, a, 0, 0, 190, 66); add(p.x, p.y, a, 110, makeContainers); }
    else if (p.t === 'plane') { solid(p.x, p.y, a, -5, 0, 236, 26); solid(p.x, p.y, a, 5, 0, 50, 200); add(p.x, p.y, a, 130, makePlane); }
  }
  // props are random-looking but must come back the same after streaming out and in
  LMS.forEach((o, i) => { const mk = o.make; o.make = () => withSeed(9001 + i * 31, mk); });
}
