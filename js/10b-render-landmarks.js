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
  for (let t = ROAD_HALF + 40; t < 420; t += 6) { const o = nearestRoad(q.x + nx * t, q.y + ny * t, ROAD_HALF + 2); if (o && o.e !== r.e) { back = t - 18 - SW_W; break; } }
  const fr = ROAD_HALF + SW_W + 4 + COLONY_SIGN, D = clamp(back - fr, 70, 124), Wf = 156, off = fr + D / 2, a = Math.atan2(-ny, -nx);
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

/* ---------- street-front props from the fill pass: gas stations, plazas, basketball courts. Local +z faces the street ---------- */
function gasLayout(p) {                                          // shop at the back on one side, a canopy over two pump islands on the other
  const w = p.w, h = p.h, sx0 = -w / 2 + 8, sw = w * 0.38, cx = (sx0 + sw + w / 2) / 2 + 2, chw = Math.min(52, (w / 2 - sx0 - sw) / 2 - 6), zc = h * 0.06, chd = Math.min(42, h * 0.27);
  return { w, h, shop: [sx0, -h / 2 + 6, sx0 + sw, -h / 2 + 48], cx, chw, zc, chd, isl: [zc - chd * 0.5, zc + chd * 0.5] };
}
function makeGas(p) {
  const T = new GeoBuilder(), G = new GeoBuilder(), L = gasLayout(p), { w, h } = L, [a0, b0, a1, b1] = L.shop;
  const conc = _C('#3a3450'), white = _C('#eeeaf4'), neon = _C(pick(['#3dffa6', '#ff2bd6', '#2bf3ff', '#ffb02e'])), dark = _C('#22202e');
  flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, conc);
  for (let x = -w / 2 + 6; x < w / 2 - 6; x += 22) flat(G, x, h / 2 - 3, x + 11, h / 2 - 1.5, 0.8, _C('#ffe14a'));   // painted edge at the driveway
  box5(T, a0, 0, b0, a1, 22, b1, white); box5(T, a0 - 1, 22, b0 - 1, a1 + 1, 25, b1 + 1, _C('#d8d2ee'));        // the shop
  face(G, [[a0 + 6, 3, b1 + 0.3], [a1 - 6, 3, b1 + 0.3], [a1 - 6, 15, b1 + 0.3], [a0 + 6, 15, b1 + 0.3]], [0, 0, 1], _C('#ffe9b0'));   // lit windows
  box5(G, a0 - 1.2, 19, b1 + 0.6, a1 + 1.2, 21, b1 + 1.6, neon);
  for (const ax of [a0 + 10, a1 - 22]) box5(T, ax, 25, b0 + 8, ax + 12, 31, b0 + 18, _C('#9aa0ab'));               // AC on the shop roof
  const { cx, chw, zc, chd } = L;
  for (const z of L.isl) {
    box5(T, cx - 36, 0, z - 4, cx + 36, 1.6, z + 4, _C('#cfc8e8'));                                               // pump island
    for (const px of [cx - 18, cx + 18]) { box5(T, px - 3, 1.6, z - 2.5, px + 3, 13, z + 2.5, white); box5(G, px - 3.2, 9, z - 2.7, px + 3.2, 11.5, z + 2.7, neon); }
    for (const px of [cx - 34, cx + 34]) box5(T, px - 1.6, 1.6, z - 1.6, px + 1.6, 26, z + 1.6, dark);            // canopy posts
  }
  box5(T, cx - chw, 26, zc - chd, cx + chw, 30.5, zc + chd, white);                                                // canopy
  for (const [x0, z0, x1, z1] of [[cx - chw - 0.6, zc + chd - 1.4, cx + chw + 0.6, zc + chd + 0.6], [cx - chw - 0.6, zc - chd - 0.6, cx + chw + 0.6, zc - chd + 1.4],
    [cx - chw - 0.6, zc - chd, cx - chw + 1.4, zc + chd], [cx + chw - 1.4, zc - chd, cx + chw + 0.6, zc + chd]]) box5(G, x0, 27, z0, x1, 31.2, z1, neon);   // glowing fascia
  for (let k = 0; k < 3; k++) flat(G, cx - chw + 6, zc - chd + 8 + k * 6, cx + chw - 6, zc - chd + 10 + k * 6, 30.6, neon);              // brand stripes on the roof
  const px = w / 2 - 12, pz = h / 2 - 12;                                                                          // price pylon at the corner
  box5(T, px - 1.5, 0, pz - 1.5, px + 1.5, 30, pz + 1.5, dark); box5(T, px - 10, 30, pz - 2, px + 10, 48, pz + 2, dark);
  const m = lmMesh(T, G), sg = signMesh('FUEL', neon.getStyle(), 19, 7), sg2 = signMesh('GAS', neon.getStyle(), 2 * chw * 0.5, 4);
  sg.position.set(px, 41, pz + 2.2); sg2.position.set(cx, 29, zc + chd + 0.7); m.add(sg); m.add(sg2); m.userData.own.push(sg.material, sg2.material);
  const top = signMesh('FUEL', neon.getStyle(), chw * 1.3, chw * 0.33); top.rotation.x = -Math.PI / 2; top.position.set(cx, 30.7, zc + chd * 0.35); m.add(top); m.userData.own.push(top.material);   // name on the canopy roof
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(17, 6), new THREE.MeshBasicMaterial({ map: SIGNTEX })); pr.position.set(px, 33.5, pz + 2.2); m.add(pr); m.userData.own.push(pr.material);
  return m;
}
function makePlaza(p) {                                          // tiled square with a fountain, benches, palms and planters
  const T = new GeoBuilder(), G = new GeoBuilder(), w = p.w, h = p.h, t1 = _C('#5a4f86'), t2 = _C('#4a4174'), stone = _C('#e6e0f0'), wood = _C('#7a5a3a');
  const n = Math.max(2, Math.round(w / 14)), m2 = Math.max(2, Math.round(h / 14)), tw = w / n, td = h / m2;
  for (let i = 0; i < n; i++) for (let j = 0; j < m2; j++) flat(T, -w / 2 + i * tw, -h / 2 + j * td, -w / 2 + (i + 1) * tw, -h / 2 + (j + 1) * td, 0.8, (i + j) % 2 ? t1 : t2);
  T.prism(0, 0, 17, 0.8, 4.5, stone, 16, 17, true); disc(G, 0, 0, 14.5, 4.7, _C('#3fe8ff'), 16);
  T.prism(0, 0, 2.2, 4.5, 13, stone, 8); T.prism(0, 0, 6.5, 12, 13.4, stone, 12, 6.5, true); disc(G, 0, 0, 5.4, 13.5, _C('#3fe8ff'), 12);
  T.prism(0, 0, 1.2, 13.4, 19, _C('#bff6ff'), 6, 0.2, true);
  for (let k = 0; k < 4; k++) {                                                                  // benches facing the fountain
    const a = k * Math.PI / 2 + Math.PI / 4, bx = Math.cos(a) * 32, bz = Math.sin(a) * 32, ux = -Math.sin(a), uz = Math.cos(a), P = (u, v, y) => [bx + ux * u + Math.cos(a) * v, y, bz + uz * u + Math.sin(a) * v];
    face(T, [P(-8, -2.5, 4), P(8, -2.5, 4), P(8, 2.5, 4), P(-8, 2.5, 4)], [0, 1, 0], wood);
    face(T, [P(-8, 2.5, 4), P(8, 2.5, 4), P(8, 2.5, 9), P(-8, 2.5, 9)], [Math.cos(a), 0, Math.sin(a)], wood);
    face(T, [P(-8, 2.5, 9), P(8, 2.5, 9), P(8, 2.5, 4), P(-8, 2.5, 4)], [-Math.cos(a), 0, -Math.sin(a)], wood);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (w / 2 - 14), z = sz * (h / 2 - 14); box5(T, x - 7, 0, z - 7, x + 7, 4, z + 7, stone); flat(T, x - 6, z - 6, x + 6, z + 6, 4.2, _C('#2f8f4e')); palm(T, x, z, 30);
  }
  for (const sx of [-1, 1]) { const x = sx * (w / 2 - 34); T.prism(x, 0, 0.9, 0, 26, _C('#14102a'), 6); box5(G, x - 2.5, 26, -2.5, x + 2.5, 29, 2.5, _C('#fff3b0')); }
  return lmMesh(T, G);
}
function makeCourt() {                                           // outdoor basketball court with two hoops
  const T = new GeoBuilder(), G = new GeoBuilder(), Lw = 150, Ld = 84, line = _C('#f4efe6'), blue = _C('#2a5fb0'), rim = _C('#ff7a3d');
  flat(T, -Lw / 2 - 8, -Ld / 2 - 8, Lw / 2 + 8, Ld / 2 + 8, 0.5, _C('#b24a3a')); flat(T, -Lw / 2, -Ld / 2, Lw / 2, Ld / 2, 0.6, blue);
  const ln = (x0, z0, x1, z1) => flat(G, x0, z0, x1, z1, 0.7, line);
  ln(-Lw / 2, -Ld / 2, Lw / 2, -Ld / 2 + 1.4); ln(-Lw / 2, Ld / 2 - 1.4, Lw / 2, Ld / 2); ln(-Lw / 2, -Ld / 2, -Lw / 2 + 1.4, Ld / 2); ln(Lw / 2 - 1.4, -Ld / 2, Lw / 2, Ld / 2); ln(-0.7, -Ld / 2, 0.7, Ld / 2);
  for (let k = 0; k < 20; k++) { const a0 = k / 20 * TAU, a1 = (k + 1) / 20 * TAU; face(G, [[Math.cos(a0) * 11, 0.7, Math.sin(a0) * 11], [Math.cos(a1) * 11, 0.7, Math.sin(a1) * 11], [Math.cos(a1) * 12.4, 0.7, Math.sin(a1) * 12.4], [Math.cos(a0) * 12.4, 0.7, Math.sin(a0) * 12.4]], [0, 1, 0], line); }
  for (const s of [-1, 1]) {
    const xe = s * Lw / 2, xk = xe - s * 30; flat(T, Math.min(xe, xk), -9, Math.max(xe, xk), 9, 0.65, _C('#c4553a'));   // the key
    ln(Math.min(xk, xk + s * 1.4), -9, Math.max(xk, xk + s * 1.4), 9);
    box5(T, xe + s * 2 - 1.5, 0, -1.5, xe + s * 2 + 1.5, 24, 1.5, _C('#2b2e38'));                                      // pole, backboard, rim
    box5(T, xe - s * 1 - 0.6, 20, -7, xe - s * 1 + 0.6, 29, 7, line); box5(G, xe - s * 4 - 2.2, 21, -2.2, xe - s * 4 + 2.2, 21.6, 2.2, rim);
  }
  return lmMesh(T, G);
}

/* ---------- made-up landmarks, so the city has things to remember it by:
   Bayfront Park, the Bay TV tower, the Twist, the Crown, the Sail hotel and the big wheel on the beach; and the runways ---------- */
function nquad(gb, a, b, c, d, col, cx, cz) {                    // a quad facing away from the vertical axis through (cx, cz)
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const m = Math.hypot(nx, ny, nz) || 1; nx /= m; ny /= m; nz /= m;
  if (nx * ((a[0] + c[0]) / 2 - cx) + nz * ((a[2] + c[2]) / 2 - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
  face(gb, [a, b, c, d], [nx, ny, nz], col);
}
function lid(gb, pts, col) {                                      // flat top over a convex outline
  for (let i = 1; i < pts.length - 1; i++) {
    let a = pts[0], b = pts[i], c = pts[i + 1];
    if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) < 0) { const t = b; b = c; c = t; }
    gb.tri(a, b, c, [0, 1, 0], col);
  }
}
function loft(gb, rings, col, cx, cz) {                           // walls between horizontal outlines rings[k] = [[x, y, z], ...]
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; nquad(gb, A[i], A[j], B[j], B[i], typeof col === 'function' ? col(k, i) : col, cx, cz); }
  }
}
function beam(gb, a, b, r, col) {                                 // a square strut from point a to point b
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
  let px = -dz, pz = dx; const pm = Math.hypot(px, pz); if (pm < 1e-6) { px = 1; pz = 0; } else { px /= pm; pz /= pm; }
  const qx = (dy * pz) / L, qy = (dz * px - dx * pz) / L, qz = (-dy * px) / L;   // second axis, perpendicular to both
  const ring = (p, s) => [[p[0] + (px + qx) * s, p[1] + qy * s, p[2] + (pz + qz) * s], [p[0] + (px - qx) * s, p[1] - qy * s, p[2] + (pz - qz) * s],
    [p[0] + (-px - qx) * s, p[1] - qy * s, p[2] + (-pz - qz) * s], [p[0] + (-px + qx) * s, p[1] + qy * s, p[2] + (-pz + qz) * s]];
  const A = ring(a, r), B = ring(b, r), mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2;
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, n = [(A[i][0] + A[j][0]) / 2 - a[0], (A[i][1] + A[j][1]) / 2 - a[1], (A[i][2] + A[j][2]) / 2 - a[2]], m = Math.hypot(...n) || 1; face(gb, [A[i], A[j], B[j], B[i]], [n[0] / m, n[1] / m, n[2] / m], col); }
}
function makePark(L) {                                           // paths round the lake, a boathouse and pier, a fountain, a band shell, lamps, gates
  const T = new GeoBuilder(), G = new GeoBuilder(), w = L.w, h = L.h, lk = L.lake, lx = lk[0] - L.x, lz = lk[1] - L.y, rx = lk[2] + 140, rz = lk[3] + 110;
  const path = _C('#b9a37a'), stone = _C('#e6e0f0'), wood = _C('#7a5a3a'), white = _C('#f4f1ea'), red = _C('#c8464a'), lamp = _C('#fff3b0');
  const seg = 48, P = (a, r) => [lx + Math.cos(a) * (rx + r), 0.7, lz + Math.sin(a) * (rz + r)];
  for (let k = 0; k < seg; k++) { const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU; face(T, [P(a0, -9), P(a1, -9), P(a1, 9), P(a0, 9)], [0, 1, 0], path); }
  flat(T, lx - 9, -h / 2, lx + 9, lz - rz, 0.7, path); flat(T, lx - 9, lz + rz, lx + 9, h / 2, 0.7, path);
  flat(T, -w / 2, lz - 9, lx - rx, lz + 9, 0.7, path); flat(T, lx + rx, lz - 9, w / 2, lz + 9, 0.7, path);
  for (let k = 0; k < 14; k++) {                                  // lamps along the loop
    const a = k / 14 * TAU + 0.1, q = P(a, 14);
    T.prism(q[0], q[2], 1, 0, 26, _C('#14102a'), 5); box5(G, q[0] - 2.5, 26, q[2] - 2.5, q[0] + 2.5, 30, q[2] + 2.5, lamp);
    if (k % 2) { const b = P(a + 0.11, 14); box5(T, b[0] - 7, 3, b[2] - 2.5, b[0] + 7, 4.4, b[2] + 2.5, wood); }
  }
  const bz = lz + lk[3] + 34;                                     // the boathouse on the south shore, its pier out over the water
  box5(T, lx - 46, 0, bz - 20, lx + 46, 20, bz + 22, white); box5(T, lx - 50, 20, bz - 24, lx + 50, 24, bz + 26, red); box5(T, lx - 34, 24, bz - 12, lx + 34, 32, bz + 14, red);
  face(G, [[lx - 34, 5, bz + 22.3], [lx + 34, 5, bz + 22.3], [lx + 34, 15, bz + 22.3], [lx - 34, 15, bz + 22.3]], [0, 0, 1], _C('#ffd98a'));
  box5(T, lx - 9, 0, bz - 110, lx + 9, 2.6, bz - 20, wood);
  for (const [dx, dz, c] of [[-70, -40, '#ff2bd6'], [40, -80, '#ffe14a'], [-20, -140, '#2bf3ff'], [90, -30, '#3dffa6']]) {
    const x = lx + dx, z = lz + lk[3] + dz; box5(T, x - 7, 0, z - 4, x + 7, 3.2, z + 4, _C(c)); box5(T, x - 3, 3.2, z - 3, x + 3, 6, z + 3, white);
  }
  T.prism(lx, lz, 12, -2, 2, stone, 14, 12, true); G.prism(lx, lz, 4, 2, 46, _C('#bff6ff'), 8, 0.6, true); G.prism(lx, lz, 9, 2, 10, _C('#3fe8ff'), 10, 2, true);   // fountain jet
  const sz = lz - rz - 80;                                        // band shell to the north of the loop
  T.prism(lx, sz, 52, 0, 4, stone, 18, 52, true); T.prism(lx, sz, 44, 4, 26, white, 18, 40); T.prism(lx, sz, 40, 26, 40, white, 18, 26); T.prism(lx, sz, 26, 40, 48, white, 18, 4, true);
  G.prism(lx, sz, 44.5, 24, 26, _C('#ff2bd6'), 18);
  const gates = [[lx, -h / 2 + 6, 0], [lx, h / 2 - 6, 0], [-w / 2 + 6, lz, 1], [w / 2 - 6, lz, 1]];
  for (const [x, z, side] of gates) {                             // an arch over each entrance
    const ox = side ? 0 : 1, oz = side ? 1 : 0;
    for (const sg of [-1, 1]) box5(T, x + ox * sg * 30 - 6, 0, z + oz * sg * 30 - 6, x + ox * sg * 30 + 6, 40, z + oz * sg * 30 + 6, stone);
    box5(T, x - (ox * 36 + oz * 6), 40, z - (oz * 36 + ox * 6), x + (ox * 36 + oz * 6), 48, z + (oz * 36 + ox * 6), stone);
    box5(G, x - (ox * 34 + oz * 1), 48, z - (oz * 34 + ox * 1), x + (ox * 34 + oz * 1), 50, z + (oz * 34 + ox * 1), _C('#2bf3ff'));
  }
  const m = lmMesh(T, G), sg = signMesh('BAYFRONT PARK', '#3dffa6', 64, 13); sg.position.set(lx, 44, h / 2 - 6 + 6.5); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeTV() {                                              // Bay TV: a concrete needle on three legs, a pod with a glass band, a striped mast
  const T = new GeoBuilder(), G = new GeoBuilder(), conc = _C('#d9d4e6'), glass = _C('#1d2740'), neon = _C('#ff2bd6'), cyan = _C('#2bf3ff');
  box5(T, -80, 0, -80, 80, 12, 80, _C('#8d86a8')); box5(T, -48, 12, -48, 48, 32, 48, conc);
  face(G, [[-40, 15, 48.3], [40, 15, 48.3], [40, 28, 48.3], [-40, 28, 48.3]], [0, 0, 1], _C('#ffe9b0'));
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 2; beam(T, [Math.cos(a) * 70, 0, Math.sin(a) * 70], [Math.cos(a) * 10, 150, Math.sin(a) * 10], 5, conc); }
  T.prism(0, 0, 13, 32, 330, conc, 12, 9);
  for (let y = 60; y < 240; y += 45) { const r = 13 - 4 * (y - 32) / 298 + 0.5; G.prism(0, 0, r, y, y + 2.5, neon, 12); }
  T.prism(0, 0, 18, 246, 256, conc, 18, 50); T.prism(0, 0, 50, 256, 272, glass, 18); G.prism(0, 0, 50.6, 261, 266, cyan, 18);
  G.prism(0, 0, 51, 255, 257, neon, 18); T.prism(0, 0, 50, 272, 280, conc, 18, 32); T.prism(0, 0, 32, 280, 287, conc, 18, 10, true);
  T.prism(0, 0, 9, 326, 332, conc, 12, 18); T.prism(0, 0, 18, 332, 340, glass, 12); G.prism(0, 0, 18.5, 334, 337, neon, 12); T.prism(0, 0, 18, 340, 344, conc, 12, 5, true);
  for (let k = 0; k < 6; k++) T.prism(0, 0, 3 - k * 0.3, 344 + k * 14, 358 + k * 14, k % 2 ? _C('#f1f1ee') : _C('#e0364f'), 6, 2.7 - k * 0.3);
  const m = lmMesh(T, G), tip = new THREE.Mesh(GSph, mBas(0xff3b5c)); tip.scale.set(4, 4, 4); tip.position.set(0, 430, 0); m.add(tip); m.userData.own.push(tip.material);
  const sg = signMesh('BAY TV', '#2bf3ff', 60, 14); sg.position.set(0, 40, 49); m.add(sg); m.userData.own.push(sg.material);
  m.userData.anim = t => { tip.visible = (t % 1.4) < 0.7; };
  return m;
}
function makeTwist() {                                           // the Twist: 26 glass floors, each turned a little further, a quarter turn in all
  const T = new GeoBuilder(), G = new GeoBuilder(), N = 26, FH = 12, glassC = _C('#6f9be0'), plate = _C('#ffffff'), LIT = ['#2bf3ff', '#ff2bd6', '#ffe14a', '#a259ff'].map(_C);
  box5(T, -100, 0, -100, 100, 8, 100, _C('#8d86a8'));
  const sq = (r, y, s) => [0, 1, 2, 3].map(i => { const a = r + Math.PI / 4 + i * Math.PI / 2; return [Math.cos(a) * s * Math.SQRT2, y, Math.sin(a) * s * Math.SQRT2]; });
  let top = 0, rTop = 0;
  for (let k = 0; k < N; k++) {
    const r = k * (Math.PI / 2) / N, y0 = 8 + k * FH, y1 = y0 + FH - 1.6, s = 74 - k * 0.6; top = y1 + 1.6; rTop = r;
    loft(T, [sq(r, y0, s), sq(r, y1, s)], glassC, 0, 0); loft(T, [sq(r, y1, s + 2.5), sq(r, y1 + 1.6, s + 2.5)], plate, 0, 0);
    for (let i = 0; i < 4; i++) if (Math.random() < 0.6) {       // a lit floor on this side
      const A = sq(r, y0 + 3, s + 0.4), B = sq(r, y1 - 2, s + 0.4), j = (i + 1) % 4, f = Math.random() * 0.4;
      const l = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1], p[2] + (q[2] - p[2]) * t];
      nquad(G, l(A[i], A[j], f), l(A[i], A[j], f + 0.5), l(B[i], B[j], f + 0.5), l(B[i], B[j], f), pick(LIT), 0, 0);
    }
  }
  lid(T, sq(rTop, top, 74 - N * 0.6 + 2.5), plate);
  G.prism(0, 0, 40, top, top + 3, _C('#2bf3ff'), 4); T.prism(0, 0, 4, top, top + 70, _C('#c9ccd4'), 6, 0.6, true);
  box5(G, -2, top + 70, -2, 2, top + 74, 2, _C('#ff3b5c'));
  const m = lmMesh(T, G), sg = signMesh('THE TWIST', '#2bf3ff', 70, 14); sg.position.set(0, 20, 101); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeCrown() {                                           // the Crown: a stepped deco tower, piers up every face, a sunburst crown and a spire
  const T = new GeoBuilder(), G = new GeoBuilder(), cream = _C('#eadfc4'), pier = _C('#c7b48a'), gold = _C('#ffd23f'), LIT = ['#ffd98a', '#ffe14a', '#ff7a3d'].map(_C);
  const tiers = [[108, 0, 150], [84, 150, 232], [62, 232, 292], [44, 292, 330]];
  for (const [s, y0, y1] of tiers) {
    box5(T, -s, y0, -s, s, y1, s, cream);
    for (let x = -s + 9; x < s - 4; x += 15) { box5(T, x - 1.6, y0, s - 0.5, x + 1.6, y1, s + 1.2, pier); box5(T, x - 1.6, y0, -s - 1.2, x + 1.6, y1, -s + 0.5, pier); box5(T, s - 0.5, y0, x - 1.6, s + 1.2, y1, x + 1.6, pier); box5(T, -s - 1.2, y0, x - 1.6, -s + 0.5, y1, x + 1.6, pier); }
    for (let y = y0 + 8; y < y1 - 8; y += 14) for (let x = -s + 10; x < s - 10; x += 15) if (Math.random() < 0.18) {
      const c = pick(LIT); face(G, [[x, y, s + 0.3], [x + 11, y, s + 0.3], [x + 11, y + 8, s + 0.3], [x, y + 8, s + 0.3]], [0, 0, 1], c);
      if (Math.random() < 0.5) face(G, [[s + 0.3, y, x], [s + 0.3, y, x + 11], [s + 0.3, y + 8, x + 11], [s + 0.3, y + 8, x]], [1, 0, 0], c);
    }
    for (const [a0, b0, a1, b1] of [[-s - 1.6, s - 1, s + 1.6, s + 1.6], [-s - 1.6, -s - 1.6, s + 1.6, -s + 1], [-s - 1.6, -s, -s + 1, s], [s - 1, -s, s + 1.6, s]]) box5(G, a0, y1 - 2, b0, a1, y1, b1, gold);
  }
  for (let j = 0; j < 5; j++) {                                   // the sunburst crown: shrinking stages, a gold chevron on every face
    const s = 40 - j * 7, y = 330 + j * 15; box5(T, -s, y, -s, s, y + 13, s, cream);
    for (const [n, P] of [[[0, 0, 1], (u, v) => [u, y + v, s + 0.4]], [[0, 0, -1], (u, v) => [u, y + v, -s - 0.4]], [[1, 0, 0], (u, v) => [s + 0.4, y + v, u]], [[-1, 0, 0], (u, v) => [-s - 0.4, y + v, u]]]) {
      const a = P(-s * 0.8, 1), b = P(s * 0.8, 1), c = P(0, 12); let t = [a, b, c];
      const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) t = [a, c, b];
      G.tri(t[0], t[1], t[2], n, gold);
    }
  }
  T.prism(0, 0, 5, 405, 480, _C('#c9ccd4'), 6, 0.5, true); box5(G, -2, 476, -2, 2, 482, 2, _C('#ff3b5c'));
  const m = lmMesh(T, G), sg = signMesh('THE CROWN', '#ffd23f', 80, 16); sg.position.set(0, 24, 110); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeSail() {                                            // the Sail: a hotel shaped like a sail, its mast on the sea side, a helipad near the top
  const T = new GeoBuilder(), G = new GeoBuilder(), white = _C('#f4f6fb'), glass = _C('#5d86c4'), H = 300, L = 220, B = 92, K = 16, NP = 9;
  box5(T, -125, 0, -115, 125, 12, 115, _C('#d8c9a4')); flat(G, -60, 30, 40, 90, 12.3, _C('#3fe8ff'));   // podium with a pool
  const rings = [];
  for (let k = 0; k <= K; k++) {
    const y = 12 + k / K * (H - 12), f = k / K, zb = -L / 2, zf = -L / 2 + L * (1 - Math.pow(f, 1.25)) + 6, b = B * (1 - Math.pow(f, 1.6)) + 4, ring = [];
    for (let i = 0; i <= NP; i++) { const t = i / NP; ring.push([b * Math.pow(Math.sin(Math.PI * t), 0.7), y, zb + (zf - zb) * t]); }
    for (let i = NP - 1; i > 0; i--) { const t = i / NP; ring.push([-b * Math.pow(Math.sin(Math.PI * t), 0.7), y, zb + (zf - zb) * t]); }
    rings.push(ring);
  }
  loft(T, rings, (k, i) => i < NP ? white : glass, 0, -L * 0.1);
  for (let k = 0; k < K; k++) { const a = rings[k][NP], b = rings[k + 1][NP]; nquad(G, [a[0] - 1.5, a[1], a[2] + 0.6], [a[0] + 1.5, a[1], a[2] + 0.6], [b[0] + 1.5, b[1], b[2] + 0.6], [b[0] - 1.5, b[1], b[2] + 0.6], _C('#ff2bd6'), 0, -L); }
  T.prism(0, -L / 2, 7, 0, H + 70, white, 8, 3, true); box5(G, -2, H + 70, -L / 2 - 2, 2, H + 74, -L / 2 + 2, _C('#ff3b5c'));
  const hy = H * 0.78; beam(T, [0, hy - 10, -L / 2], [0, hy, -L / 2 - 36], 3, white); T.prism(0, -L / 2 - 46, 26, hy, hy + 2, _C('#5a5f69'), 16, 26, true); G.prism(0, -L / 2 - 46, 26.4, hy + 1, hy + 2.4, _C('#3dffa6'), 16);
  const m = lmMesh(T, G), sg = signMesh('THE SAIL', '#ff2bd6', 70, 15); sg.position.set(0, 26, 116); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeWheel() {                                           // the big wheel on the beach: two A-frames, a neon rim, sixteen gondolas
  const T = new GeoBuilder(), G = new GeoBuilder(), R = 118, HY = 150, steel = _C('#e8eaee'), N = 32, NC = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6'].map(_C);
  for (const z of [-20, 20]) { beam(T, [-72, 0, z], [0, HY, z], 3.2, steel); beam(T, [72, 0, z], [0, HY, z], 3.2, steel); }
  beam(T, [0, HY, -24], [0, HY, 24], 5, steel);
  const P = (a, r, z) => [Math.cos(a) * r, HY + Math.sin(a) * r, z];
  for (let k = 0; k < N; k++) {
    const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, c = NC[k % NC.length];
    for (const z of [-14, 14]) { face(G, [P(a0, R - 2, z), P(a1, R - 2, z), P(a1, R + 2, z), P(a0, R + 2, z)], [0, 0, Math.sign(z)], c); face(G, [P(a0, R + 2, -z), P(a1, R + 2, -z), P(a1, R + 2, z), P(a0, R + 2, z)], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], c); }
    if (k % 2 === 0) for (const z of [-14, 14]) beam(T, [0, HY, z], P(a0, R, z), 0.9, steel);
    if (k % 2 === 0) { const g = P(a0, R, 0); box5(T, g[0] - 7, g[1] - 18, -9, g[0] + 7, g[1] - 5, 9, NC[(k / 2) % NC.length]); beam(T, [g[0], g[1] - 5, 0], [g[0], g[1], 0], 0.8, steel); }
  }
  box5(T, -30, 0, 26, 30, 14, 46, _C('#ff7a3d')); box5(G, -30, 14, 26, 30, 16, 46, _C('#ffe14a'));
  const m = lmMesh(T, G), sg = signMesh('BAY WHEEL', '#ffe14a', 56, 12); sg.position.set(0, 22, 47); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
function makeRunway(p) {                                         // asphalt strip, dashed centre line, threshold bars, edge lights
  const T = new GeoBuilder(), G = new GeoBuilder(), L = p.w, Wd = p.h, white = _C('#e8e6f0');
  flat(T, -L / 2, -Wd / 2, L / 2, Wd / 2, 0.5, _C('#221d2e'));
  for (let x = -L / 2 + 140; x < L / 2 - 140; x += 90) flat(T, x, -2, x + 50, 2, 0.65, white);
  for (const s of [-1, 1]) for (let k = -5; k <= 5; k++) flat(T, s * (L / 2 - 70) - 26, k * 10 - 3, s * (L / 2 - 70) + 26, k * 10 + 3, 0.65, white);
  for (let x = -L / 2; x <= L / 2; x += 110) for (const s of [-1, 1]) box5(G, x - 2, 0, s * (Wd / 2 + 4) - 2, x + 2, 3, s * (Wd / 2 + 4) + 2, s > 0 ? _C('#ffe14a') : _C('#3fe0ff'));
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
    else if (L.t === 'park') {
      const lk = L.lake, bz = lk[1] + lk[3] + 34; makeSolid(lk[0], bz, 100, 50, 0, {});              // boathouse
      const rz = lk[3] + 110; makeSolid(lk[0], lk[1] - rz - 80, 100, 100, 0, {});                    // band shell
      LM_CLEAR.push([lk[0], bz, 60, 40], [lk[0], lk[1] - rz - 80, 60, 60]);
      LMS.push({ cx: L.x, cy: L.y, a: 0, rad: Math.hypot(L.w, L.h) / 2, make: () => makePark(L), mesh: null });
    }
    else if (L.t === 'tvtower') { makeSolid(L.x, L.y, 100, 100, 0, {}); add(L.x, L.y, 0, 700, makeTV, 90, 90); }
    else if (L.t === 'twist') { makeSolid(L.x, L.y, 200, 200, 0, {}); add(L.x, L.y, 0, 600, makeTwist, 105, 105); }
    else if (L.t === 'crown') { makeSolid(L.x, L.y, 220, 220, 0, {}); add(L.x, L.y, 0, 650, makeCrown, 115, 115); }
    else if (L.t === 'sail') { const a = (L.a || 0) * Math.PI / 180; solid(L.x, L.y, a, 0, -10, 190, 230); add(L.x, L.y, a, 600, makeSail, 130, 130); }
    else if (L.t === 'wheel') { const a = (L.a || 0) * Math.PI / 180; for (const sx of [-72, 72]) solid(L.x, L.y, a, sx, 0, 14, 50); solid(L.x, L.y, a, 0, 36, 60, 20); add(L.x, L.y, a, 400, makeWheel, 140, 50); }
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
    else if (p.t === 'runway') { LMS.push({ cx: p.x, cy: p.y, a, rad: p.w / 2, make: () => makeRunway(p), mesh: null }); LM_CLEAR.push([p.x, p.y, Math.abs(Math.cos(a)) * p.w / 2 + Math.abs(Math.sin(a)) * p.h / 2 + 20, Math.abs(Math.sin(a)) * p.w / 2 + Math.abs(Math.cos(a)) * p.h / 2 + 20]); }
    else if (p.t === 'gas' || p.t === 'plaza' || p.t === 'court') {
      const w = p.w || 166, h = p.h || 100, ex = Math.abs(Math.cos(a)) * w / 2 + Math.abs(Math.sin(a)) * h / 2, ey = Math.abs(Math.sin(a)) * w / 2 + Math.abs(Math.cos(a)) * h / 2;
      if (hitsColony(p.x, p.y, w, h, p.a)) continue;
      if (p.t === 'gas') {
        const L = gasLayout(p), [a0, b0, a1, b1] = L.shop; solid(p.x, p.y, a, (a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0);
        for (const z of L.isl) solid(p.x, p.y, a, L.cx, z, 72, 8);
        solid(p.x, p.y, a, w / 2 - 12, h / 2 - 12, 4, 4);
        add(p.x, p.y, a, Math.hypot(w, h) / 2, () => makeGas(p), ex - 20, ey - 20);
      } else if (p.t === 'plaza') { solid(p.x, p.y, a, 0, 0, 30, 30); add(p.x, p.y, a, Math.hypot(w, h) / 2, () => makePlaza(p), ex - 20, ey - 20); }
      else { for (const s of [-1, 1]) solid(p.x, p.y, a, s * 77, 0, 4, 4); add(p.x, p.y, a, 95, makeCourt, ex - 30, ey - 30); }
    }
  }
  // props are random-looking but must come back the same after streaming out and in
  LMS.forEach((o, i) => { const mk = o.make; o.make = () => withSeed(9001 + i * 31, mk); });
}
