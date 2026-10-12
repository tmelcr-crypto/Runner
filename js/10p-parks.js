'use strict';
/* ---------- 7q. 60 PARKS, SQUARES AND PLAZAS ----------
   The parks table (js/01s): every plaza on the streets, every sports court and 10 parks on the biggest open lawns get a design of their
   own - no two alike. A plaza or a court takes the row of its kind in a fixed shuffle of the sites; a park takes the biggest clear
   rectangle of a lawn (off the streets, clear of the landmarks and the unique buildings), the biggest lawns first, spread apart.
   Each design is built in its site's frame: x along the street (width w), z from the back to the front (depth h), the front (+z) toward
   the street. Its name stands on a sign at the front corner, turned to whichever side the camera sees. What stands in it is solid (the
   designs report their solids, js/04 genWorld registers them) but its trees, which fall when a vehicle drives into them (js/12g); the rest
   is walked on. Scenery: both modes. */
let PK_S = null;                          // while a design is being measured: the solids it reports, in its own frame
const pkS = (x0, z0, x1, z1, soft) => { if (PK_S) PK_S.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), soft !== false]); };
const PK_WOOD = '#7a5a3a', PK_IRON = '#2a2d3a', PK_STONE = '#e6e0f0', PK_GREEN = '#2f8f4e', PK_WATER = '#3fd0ff';
function pkFloor(T, x0, z0, x1, z1, col, y) { flat(T, x0, z0, x1, z1, y || 0.8, _C(col)); }
function pkChecker(T, x0, z0, x1, z1, c1, c2, n) {        // tiles in two colours, about n across
  const nx = Math.max(2, Math.round((x1 - x0) / n)), nz = Math.max(2, Math.round((z1 - z0) / n)), tw = (x1 - x0) / nx, td = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) flat(T, x0 + i * tw, z0 + j * td, x0 + (i + 1) * tw, z0 + (j + 1) * td, 0.8, _C((i + j) % 2 ? c1 : c2));
}
function pkBench(T, x, z, alongX, face) {                 // a park bench 16 long, its back away from where it faces (face: +1 toward +z or +x)
  const wood = _C(PK_WOOD), iron = _C(PK_IRON), L = 8;
  if (alongX) { box5(T, x - L, 3.4, z - 2.4, x + L, 4.4, z + 2.4, wood); box5(T, x - L, 4.4, z - face * 2.4 - 0.5, x + L, 9, z - face * 2.4 + 0.5, wood); for (const s of [-1, 1]) box5(T, x + s * (L - 1) - 0.5, 0.8, z - 2, x + s * (L - 1) + 0.5, 3.4, z + 2, iron); }
  else { box5(T, x - 2.4, 3.4, z - L, x + 2.4, 4.4, z + L, wood); box5(T, x - face * 2.4 - 0.5, 4.4, z - L, x - face * 2.4 + 0.5, 9, z + L, wood); for (const s of [-1, 1]) box5(T, x - 2, 0.8, z + s * (L - 1) - 0.5, x + 2, 3.4, z + s * (L - 1) + 0.5, iron); }
}
function pkLamp(T, G, x, z, h) { h = h || 26; T.prism(x, z, 0.8, 0, h, _C(PK_IRON), 6); box5(G, x - 2.4, h, z - 2.4, x + 2.4, h + 3, z + 2.4, _C('#fff3b0')); pkS(x - 1, z - 1, x + 1, z + 1); }
function pkTree(T, x, z, r, h, col) {                     // a round shade tree: trunk, a full crown (not solid: it falls, js/12g)
  const v0 = T.pos.length / 3; col = leafCol(col || pick(['#2f8f4e', '#3a9a52', '#2a7a46']));   // autumn colours (js/12g) T.prism(x, z, Math.max(1, r * 0.12), 0, h * 0.5, _C('#6b4a2e'), 6);
  T.prism(x, z, r * 0.7, h * 0.4, h * 0.62, _C(col), 9, r); T.prism(x, z, r, h * 0.62, h * 0.82, _C(col), 9, r * 0.75); T.prism(x, z, r * 0.75, h * 0.82, h, _C(shade(col, 14)), 9, r * 0.2, true);
  treeNote(T, v0, { x, z, r, th: h * 0.55, kind: 'leafy', tc: '#6b4a2e', cc: col });
}
function pkBush(T, x, z, r, col) { T.prism(x, z, r, 0.8, 0.8 + r * 0.9, _C(leafCol(col || '#2f7a3a')), 8, r * 0.55, true); }
function pkBed(T, x0, z0, x1, z1, cols, step) {           // a raised flower bed, dotted with flowers
  box5(T, x0, 0.8, z0, x1, 2.4, z1, _C('#5a3a26')); step = step || 3.4;
  for (let x = x0 + 2; x < x1 - 1; x += step) for (let z = z0 + 2; z < z1 - 1; z += step) box5(T, x - 1, 2.4, z - 1, x + 1, 3.4 + Math.random() * 1.6, z + 1, _C(pick(cols)));
}
function pkPond(T, G, cx, cz, r, rim, seg) {              // a round pond with a stone rim (solid: soft)
  seg = seg || 24; T.prism(cx, cz, r, 0.8, 3, _C(rim || PK_STONE), seg, r, true); disc(G, cx, cz, r - 2.2, 3.1, _C(PK_WATER), seg); pkS(cx - r * 0.75, cz - r * 0.75, cx + r * 0.75, cz + r * 0.75);
}
function pkPool(T, G, x0, z0, x1, z1, rim) {              // a rectangular pool with a rim (solid: soft)
  box5(T, x0, 0.8, z0, x1, 3, z1, _C(rim || PK_STONE)); flat(G, x0 + 2, z0 + 2, x1 - 2, z1 - 2, 3.1, _C(PK_WATER)); pkS(x0, z0, x1, z1);
}
function pkFence(T, x0, z0, x1, z1, h, col, gap) {        // a fence round a rectangle, a gate gap in the middle of the front (+z) side
  const c = _C(col || '#d8dce4'); gap = gap === undefined ? 20 : gap;
  const run = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 10));
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; box5(T, x - 0.6, 0.8, z - 0.6, x + 0.6, h, z + 0.6, c); }
    box5(T, Math.min(ax, bx) - 0.3, h - 1.6, Math.min(az, bz) - 0.3, Math.max(ax, bx) + 0.3, h - 0.8, Math.max(az, bz) + 0.3, c); box5(T, Math.min(ax, bx) - 0.3, h * 0.45, Math.min(az, bz) - 0.3, Math.max(ax, bx) + 0.3, h * 0.45 + 0.8, Math.max(az, bz) + 0.3, c);
    pkS(Math.min(ax, bx) - 0.8, Math.min(az, bz) - 0.8, Math.max(ax, bx) + 0.8, Math.max(az, bz) + 0.8); };
  run(x0, z0, x1, z0); run(x0, z0, x0, z1); run(x1, z0, x1, z1);
  if (gap > 0) { run(x0, z1, -gap / 2, z1); run(gap / 2, z1, x1, z1); } else run(x0, z1, x1, z1);
}
function pkPerson(T, x, z, col, sit) {                    // a little figure standing (or sitting) - for a stall keeper, a player
  const y0 = sit ? 3.6 : 0.8; box5(T, x - 1.6, y0, z - 1.2, x + 1.6, y0 + (sit ? 7 : 11), z + 1.2, _C(col)); box5(T, x - 1.2, y0 + (sit ? 7 : 11), z - 1.2, x + 1.2, y0 + (sit ? 9.6 : 13.6), z + 1.2, _C('#d9a074'));
}
function pkSign(T, s, x, z) {                             // the place's name on a pylon at the front corner, turned to the side the camera sees
  const w = Math.min(46, fasciaFit(s.name, 8, 46)), px = x === undefined ? s.w / 2 - w / 2 - 6 : x, pz = z === undefined ? s.h / 2 - 5 : z, ry = s.ry;
  const ax = Math.cos(ry), az = -Math.sin(ry);                                     // along the panel
  for (const k of [-1, 1]) box5(T, px + ax * k * (w / 2 - 2) - 1, 0, pz + az * k * (w / 2 - 2) - 1, px + ax * k * (w / 2 - 2) + 1, 10, pz + az * k * (w / 2 - 2) + 1, _C(PK_IRON));
  pkS(px - 3, pz - 3, px + 3, pz + 3);
  return m => { for (const back of [0, Math.PI]) { const sg = fasciaSign(s.name, s.c, w, 9); sg.position.set(px + Math.sin(ry + back) * 0.6, 14.5, pz + Math.cos(ry + back) * 0.6); sg.rotation.y = ry + back; m.add(sg); m.userData.own.push(sg.material); }
    const bd = new THREE.Mesh(GB, mc(0x2b2e38)); bd.scale.set(w + 2, 11, 1); bd.position.set(px, 14.5, pz); bd.rotation.y = ry; m.add(bd); };
}
const pkAnim = (m, f) => { const old = m.userData.anim; m.userData.anim = old ? t => { old(t); f(t); } : f; };

/* ---------- the designs: (T, G, s) with s = { w, h, c, name, ry }; each returns what to add once the mesh is made ---------- */
const PK = {
  fountain(T, G, s) {                     // a tiled square round a three-tier fountain
    const { w, h } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#5a4f86', '#4a4174', 14);
    T.prism(0, 0, 17, 0.8, 4.5, _C(PK_STONE), 16, 17, true); disc(G, 0, 0, 14.5, 4.7, _C(PK_WATER), 16); T.prism(0, 0, 2.2, 4.5, 13, _C(PK_STONE), 8); T.prism(0, 0, 6.5, 12, 13.4, _C(PK_STONE), 12, 6.5, true); disc(G, 0, 0, 5.4, 13.5, _C(PK_WATER), 12); T.prism(0, 0, 1.2, 13.4, 19, _C('#bff6ff'), 6, 0.2, true); pkS(-14, -14, 14, 14);
    for (const [x, z, ax, f] of [[0, -32, true, 1], [0, 32, true, -1], [-32, 0, false, 1], [32, 0, false, -1]]) pkBench(T, x, z, ax, f);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = sx * (w / 2 - 14), z = sz * (h / 2 - 14); box5(T, x - 7, 0.8, z - 7, x + 7, 4, z + 7, _C(PK_STONE)); flat(T, x - 6, z - 6, x + 6, z + 6, 4.2, _C(PK_GREEN)); palm(T, x, z, 30); pkS(x - 7, z - 7, x + 7, z + 7); }
    return pkSign(T, s, 0, h / 2 - 5);
  },
  splash(T, G, s) {                       // a splash pad: rings of jets on a soft blue floor, umbrellas round it
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0'); disc(T, 0, 0, Math.min(w, h) * 0.38, 0.9, _C('#4aa8e0'), 28); disc(T, 0, 0, Math.min(w, h) * 0.2, 1, _C('#7fd0ff'), 24);
    for (const [r, n] of [[8, 6], [Math.min(w, h) * 0.28, 12]]) for (let k = 0; k < n; k++) { const a = k / n * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; T.prism(x, z, 0.5, 1, 9 + (k % 3) * 4, _C('#cff6ff'), 6, 0.15); disc(G, x, z, 2.2, 1.1, _C('#bff6ff'), 8); }
    for (const [x, z] of [[-w / 2 + 14, -h / 2 + 14], [w / 2 - 14, -h / 2 + 14], [-w / 2 + 14, h / 2 - 22]]) { T.prism(x, z, 0.6, 0.8, 18, _C(PK_IRON), 6); T.prism(x, z, 12, 17, 20, _C(pick(['#ff7ab6', '#ffe14a', '#3dffa6'])), 8, 0.6, true); pkBench(T, x + 10, z, false, -1); }
    return pkSign(T, s);
  },
  sculpture(T, G, s) {                    // abstract sculptures on plinths, gravel and lawn
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#cfc8b8'); pkFloor(T, -w / 2 + 8, -h / 2 + 8, w / 2 - 8, 0, PK_GREEN, 0.9);
    const plinth = (x, z) => { box5(T, x - 8, 0.8, z - 8, x + 8, 6, z + 8, _C('#f4f4f6')); pkS(x - 8, z - 8, x + 8, z + 8); };
    const xs = [-w * 0.3, 0, w * 0.3], zs = [-h * 0.22, h * 0.18];
    plinth(xs[0], zs[0]); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, b = (k + 1) / 12 * TAU; beam(T, [xs[0] + Math.cos(a) * 10, 16 + Math.sin(a) * 10, zs[0]], [xs[0] + Math.cos(b) * 10, 16 + Math.sin(b) * 10, zs[0]], 1.6, _C(c)); }   // a ring standing on edge
    plinth(xs[1], zs[0]); for (let k = 0; k < 4; k++) { const sz = 6 - k; box5(T, xs[1] - sz + k * 1.4, 6 + k * 7, zs[0] - sz, xs[1] + sz + k * 1.4, 13 + k * 7, zs[0] + sz, _C(['#ffe14a', '#ff2bd6', '#2bf3ff', '#f4f4f6'][k])); }   // stacked cubes
    plinth(xs[2], zs[0]); for (let k = 0; k < 10; k++) { const a = k * 0.5; box5(T, xs[2] + Math.cos(a) * 3 - 2, 6 + k * 3, zs[0] + Math.sin(a) * 3 - 2, xs[2] + Math.cos(a) * 3 + 2, 9 + k * 3, zs[0] + Math.sin(a) * 3 + 2, _C('#c9b26a')); }   // a twisted column
    plinth(xs[0], zs[1]); T.prism(xs[0], zs[1], 6, 6, 12, _C('#d8dce4'), 12, 9); T.prism(xs[0], zs[1], 9, 12, 18, _C('#d8dce4'), 12, 6); T.prism(xs[0], zs[1], 6, 18, 21, _C('#d8dce4'), 12, 1, true);   // a polished sphere
    plinth(xs[2], zs[1]); face(T, [[xs[2] - 7, 6, zs[1]], [xs[2] + 7, 6, zs[1]], [xs[2] + 2, 30, zs[1]], [xs[2] - 1, 30, zs[1]]], [0, 0, 1], _C(c));   // a red blade
    pkBench(T, xs[1], zs[1], true, -1);
    return pkSign(T, s);
  },
  clock(T, G, s) {                        // a tall clock column in a ring of flower beds
    const { w, h, c } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0', '#c8c0b0', 18);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, x = Math.cos(a) * 26, z = Math.sin(a) * 26; pkBed(T, x - 6, z - 6, x + 6, z + 6, [c, '#ffffff', '#ff7ab6']); }
    box5(T, -6, 0.8, -6, 6, 4, 6, _C('#5a5f69')); T.prism(0, 0, 3, 4, 40, _C('#2f6a50'), 8); box5(T, -6, 40, -6, 6, 52, 6, _C('#2f6a50'));
    uqDial(T, G, 0, 46, 6.1, 4.6);                                                   // its face toward the street
    T.prism(0, 0, 7, 52, 58, _C('#2f6a50'), 4, 0.5, true); pkS(-6, -6, 6, 6, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pkLamp(T, G, sx * (w / 2 - 10), sz * (h / 2 - 10));
    return pkSign(T, s);
  },
  obelisk(T, G, s) {                      // a white obelisk on steps, flags, wreaths
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); flat(T, -10, -h / 2, 10, h / 2, 0.9, _C('#d8d0c0'));
    for (let k = 0; k < 3; k++) box5(T, -18 + k * 4, 0.8 + k * 2, -18 + k * 4, 18 - k * 4, 2.8 + k * 2, 18 - k * 4, _C('#d8d4cc'));
    T.prism(0, 0, 7.5, 6.8, 70, _C('#f4f4f6'), 4, 4.2); T.prism(0, 0, 4.2, 70, 78, _C('#f4f4f6'), 4, 0.3, true); pkS(-18, -18, 18, 18, false);
    for (const [x, col] of [[-16, '#e0364f'], [0, '#f4f4f6'], [16, '#2a4aa8']]) { T.prism(x, -h / 2 + 12, 0.6, 0.8, 48, _C('#d8dce4'), 6); box5(T, x + 0.6, 40, -h / 2 + 11.6, x + 12, 47, -h / 2 + 12.4, _C(col)); }
    for (const sx of [-1, 1]) { T.prism(sx * 14, 20, 4, 0.9, 2.2, _C('#2f7a3a'), 12, 4, true); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; box5(T, sx * 14 + Math.cos(a) * 3.4 - 0.7, 2.2, 20 + Math.sin(a) * 3.4 - 0.7, sx * 14 + Math.cos(a) * 3.4 + 0.7, 3, 20 + Math.sin(a) * 3.4 + 0.7, _C(c)); } }   // wreaths
    return pkSign(T, s);
  },
  bandstand(T, G, s) {                    // an octagonal bandstand with a striped roof, chairs in rows in front
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); const bz = -h * 0.18;
    T.prism(0, bz, 22, 0.8, 5, _C('#f4f4f6'), 8, 22, true); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.PI / 8; T.prism(Math.cos(a) * 19, bz + Math.sin(a) * 19, 0.9, 5, 22, _C('#f4f4f6'), 6); }
    for (let k = 0; k < 8; k++) { const a0 = k / 8 * TAU + Math.PI / 8, a1 = (k + 1) / 8 * TAU + Math.PI / 8, P = (a, r, y) => [Math.cos(a) * r, y, bz + Math.sin(a) * r]; uqTri(T, P(a0, 25, 22), P(a1, 25, 22), [0, 34, bz], [Math.cos((a0 + a1) / 2), 1.2, Math.sin((a0 + a1) / 2)], _C(k % 2 ? c : '#f4f4f6')); }
    T.prism(0, bz, 0.6, 34, 40, _C('#ffd23f'), 6, 0.2, true); pkS(-20, bz - 20, 20, bz + 20);
    for (let r = 0; r < 3; r++) for (let x = -w / 2 + 16; x < w / 2 - 12; x += 9) box5(T, x - 2.4, 0.8, bz + 34 + r * 10 - 2.4, x + 2.4, 4, bz + 34 + r * 10 + 2.4, _C(r % 2 ? '#c8ccd4' : '#d8dce4'));
    return pkSign(T, s);
  },
  chess(T, G, s) {                        // a giant chessboard with big pieces, stone tables with boards
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#cfc8b8'); const S = Math.min(w, h) * 0.5, q = S / 8, x0 = -S / 2 - w * 0.12, z0 = -S / 2;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) flat(T, x0 + i * q, z0 + j * q, x0 + (i + 1) * q, z0 + (j + 1) * q, 0.9, _C((i + j) % 2 ? '#2a2d3a' : '#f4f4f6'));
    const piece = (i, j, white, kind) => { const x = x0 + (i + 0.5) * q, z = z0 + (j + 0.5) * q, col = _C(white ? '#f4efe6' : '#1d1d24'); T.prism(x, z, q * 0.36, 0.9, 2.4, col, 10, q * 0.32, true); T.prism(x, z, q * 0.18, 2.4, 2.4 + kind * 2.2, col, 8, q * 0.14); T.prism(x, z, q * 0.24, 2.4 + kind * 2.2, 4 + kind * 2.2, col, 8, q * 0.1, true); };
    [[0, 0, 1, 4], [4, 0, 1, 6], [3, 1, 1, 2], [5, 2, 1, 2], [6, 0, 1, 3], [2, 7, 0, 4], [4, 7, 0, 6], [3, 5, 0, 2], [4, 4, 0, 2], [6, 6, 0, 3], [1, 6, 0, 2]].forEach(([i, j, wh, k]) => piece(i, j, wh, k));
    for (const [x, z] of [[w * 0.3, -h * 0.25], [w * 0.3, h * 0.05], [w * 0.3, h * 0.3]]) { T.prism(x, z, 6, 0.8, 7, _C(PK_STONE), 10, 6, true); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) flat(T, x - 3 + i * 1.5, z - 3 + j * 1.5, x - 1.5 + i * 1.5, z - 1.5 + j * 1.5, 7.1, _C(PK_IRON)); for (const sx of [-1, 1]) T.prism(x + sx * 10, z, 2.4, 0.8, 4.4, _C(PK_STONE), 8, 2.4, true); pkS(x - 6, z - 6, x + 6, z + 6); }
    return pkSign(T, s);
  },
  playground(T, G, s) {                   // a slide tower, swings, a climbing dome, a sandpit, a see-saw on soft red ground
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#c9563f'); const red = _C(c), yel = _C('#ffd23f'), blu = _C('#2a8ae0');
    const tx = -w * 0.25, tz = -h * 0.2; box5(T, tx - 8, 12, tz - 8, tx + 8, 13.4, tz + 8, yel); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.prism(tx + a * 7, tz + b * 7, 0.8, 0.8, 24, blu, 6); uqTri(T, [tx - 9, 24, tz - 9], [tx + 9, 24, tz - 9], [tx, 30, tz], [0, 1, -1], red); uqTri(T, [tx + 9, 24, tz + 9], [tx - 9, 24, tz + 9], [tx, 30, tz], [0, 1, 1], red); uqTri(T, [tx - 9, 24, tz + 9], [tx - 9, 24, tz - 9], [tx, 30, tz], [-1, 1, 0], red); uqTri(T, [tx + 9, 24, tz - 9], [tx + 9, 24, tz + 9], [tx, 30, tz], [1, 1, 0], red);
    face(T, [[tx + 8, 13, tz - 3], [tx + 8, 13, tz + 3], [tx + 30, 1.4, tz + 3], [tx + 30, 1.4, tz - 3]], [0.5, 1, 0], yel); pkS(tx - 8, tz - 8, tx + 8, tz + 8);   // the slide
    const sx0 = w * 0.05, sz = -h * 0.25; for (const x of [sx0, sx0 + 40]) { beam(T, [x, 0.8, sz - 8], [x, 22, sz], 0.9, blu); beam(T, [x, 0.8, sz + 8], [x, 22, sz], 0.9, blu); } box5(T, sx0, 21.4, sz - 0.8, sx0 + 40, 23, sz + 0.8, blu);   // swings
    for (const x of [sx0 + 12, sx0 + 28]) { for (const d of [-2, 2]) box5(T, x + d - 0.2, 7, sz - 0.2, x + d + 0.2, 22, sz + 0.2, _C(PK_IRON)); box5(T, x - 3, 6, sz - 1.5, x + 3, 7, sz + 1.5, red); }
    pkS(sx0, sz - 8, sx0 + 40, sz + 8);
    const dx = -w * 0.25, dz = h * 0.2; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI; for (let j = 0; j < 4; j++) { const b0 = j / 4 * Math.PI / 2, b1 = (j + 1) / 4 * Math.PI / 2; beam(T, [dx + Math.cos(a) * 14 * Math.cos(b0), 0.8 + 14 * Math.sin(b0), dz + Math.sin(a) * 14 * Math.cos(b0)], [dx + Math.cos(a) * 14 * Math.cos(b1), 0.8 + 14 * Math.sin(b1), dz + Math.sin(a) * 14 * Math.cos(b1)], 0.5, k % 2 ? yel : red); beam(T, [dx - Math.cos(a) * 14 * Math.cos(b0), 0.8 + 14 * Math.sin(b0), dz - Math.sin(a) * 14 * Math.cos(b0)], [dx - Math.cos(a) * 14 * Math.cos(b1), 0.8 + 14 * Math.sin(b1), dz - Math.sin(a) * 14 * Math.cos(b1)], 0.5, k % 2 ? yel : red); } } pkS(dx - 12, dz - 12, dx + 12, dz + 12);   // a climbing dome
    box5(T, w * 0.08, 0.8, h * 0.1, w * 0.3, 2.2, h * 0.32, _C('#a88a5a')); flat(T, w * 0.08 + 1.4, h * 0.1 + 1.4, w * 0.3 - 1.4, h * 0.32 - 1.4, 2.3, _C('#e8d0a0'));   // the sandpit
    beam(T, [w * 0.36, 2, h * 0.05], [w * 0.36, 5, h * 0.25], 0.9, red); box5(T, w * 0.36 - 1.2, 0.8, h * 0.15 - 1.2, w * 0.36 + 1.2, 4, h * 0.15 + 1.2, _C(PK_IRON));   // a see-saw
    pkBench(T, w / 2 - 12, -h / 2 + 14, false, -1);
    return pkSign(T, s);
  },
};

Object.assign(PK, {
  skate(T, G, s) {                        // quarter pipes, a funbox, a grind rail, ledges, graffiti
    const { w, h, c } = s, conc = _C('#b8b8c0'); pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#a8a8b0');
    const qp = (x0, x1, z, dir) => { for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI / 2, a1 = (k + 1) / 6 * Math.PI / 2, R = 14, zz = a => z - dir * (R - R * Math.cos(a)), yy = a => 0.8 + R * Math.sin(a) * 0.8;
      face(T, [[x0, yy(a0), zz(a0)], [x1, yy(a0), zz(a0)], [x1, yy(a1), zz(a1)], [x0, yy(a1), zz(a1)]], [0, Math.cos((a0 + a1) / 2), dir * Math.sin((a0 + a1) / 2)], conc); }
      box5(T, x0, 0.8, z - dir * 14 - (dir > 0 ? 4 : 0), x1, 12, z - dir * 14 + (dir > 0 ? 0 : 4), conc); box5(T, x0, 12, z - dir * 14 - 0.6, x1, 12.8, z - dir * 14 + 0.6, _C(PK_IRON)); pkS(x0, Math.min(z, z - dir * 18), x1, Math.max(z, z - dir * 18)); };
    qp(-w / 2 + 6, w / 2 - 6, -h / 2 + 20, 1);
    face(T, [[-20, 0.8, 4], [20, 0.8, 4], [12, 7, 12], [-12, 7, 12]], [0, 1, -1], conc); box5(T, -12, 0.8, 12, 12, 7, 24, conc); face(T, [[-12, 7, 24], [12, 7, 24], [20, 0.8, 32], [-20, 0.8, 32]], [0, 1, 1], conc); pkS(-12, 12, 12, 24);   // the funbox
    box5(T, w * 0.28 - 1, 0.8, -6, w * 0.28 + 1, 4, -4, _C(PK_IRON)); box5(T, w * 0.28 - 0.6, 4, -24, w * 0.28 + 0.6, 5, 14, _C('#d8dce4'));   // a rail
    box5(T, -w / 2 + 10, 0.8, 10, -w / 2 + 18, 5, 40, conc);                   // a ledge
    for (let k = 0; k < 7; k++) face(T, [[-w / 2 + 10 + k * 18, 2, -h / 2 + 2.1], [-w / 2 + 24 + k * 18, 2, -h / 2 + 2.1], [-w / 2 + 24 + k * 18, 11, -h / 2 + 2.1], [-w / 2 + 10 + k * 18, 11, -h / 2 + 2.1]], [0, 0, 1], _C(pick([c, '#ffe14a', '#2bf3ff', '#3dffa6', '#ff7a3d'])));   // graffiti
    return pkSign(T, s);
  },
  gym(T, G, s) {                          // an outdoor gym on rubber mats
    const { w, h, c } = s, steel = _C('#c8ccd4'), acc = _C(c); pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4a4e5c');
    for (const [x, z] of [[-w * 0.3, -h * 0.25], [0, -h * 0.25], [w * 0.3, -h * 0.25], [-w * 0.3, h * 0.12], [w * 0.05, h * 0.12]]) flat(T, x - 16, z - 12, x + 16, z + 12, 0.9, _C('#2f6a50'));
    let [x, z] = [-w * 0.3, -h * 0.25]; for (const d of [-10, 0, 10]) { box5(T, x + d - 0.8, 0.9, z - 0.8, x + d + 0.8, 22, z + 0.8, steel); } box5(T, x - 10, 21, z - 0.6, x + 10, 22, z + 0.6, acc); pkS(x - 11, z - 1, x + 11, z + 1);   // pull-up bars
    [x, z] = [0, -h * 0.25]; for (const sx of [-1, 1]) { box5(T, x - 10, 10, z + sx * 3 - 0.5, x + 10, 11, z + sx * 3 + 0.5, acc); for (const dx of [-9, 9]) box5(T, x + dx - 0.6, 0.9, z + sx * 3 - 0.6, x + dx + 0.6, 10, z + sx * 3 + 0.6, steel); } pkS(x - 10, z - 4, x + 10, z + 4);   // parallel bars
    [x, z] = [w * 0.3, -h * 0.25]; box5(T, x - 12, 0.9, z - 1, x + 12, 28, z + 1, _C('#8a8f9c')); for (let k = 0; k < 14; k++) box5(T, x - 11 + (k * 7.3) % 22, 3 + (k * 5.1) % 23, z + 1, x - 9.5 + (k * 7.3) % 22, 4.5 + (k * 5.1) % 23, z + 2.2, _C(pick([c, '#ffe14a', '#2bf3ff', '#ff7a3d']))); pkS(x - 12, z - 1, x + 12, z + 1);   // a climbing wall
    for (const [bx, bz] of [[-w * 0.3, h * 0.12], [w * 0.05, h * 0.12]]) { face(T, [[bx - 8, 2, bz - 3], [bx + 8, 7, bz - 3], [bx + 8, 7, bz + 3], [bx - 8, 2, bz + 3]], [-0.3, 1, 0], acc); box5(T, bx + 7, 0.9, bz - 1, bx + 9, 7, bz + 1, steel); }   // sit-up benches
    return pkSign(T, s);
  },
  dogs(T, G, s) {                         // a fenced dog run
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f'); pkFloor(T, -w / 2 + 4, h / 2 - 22, w / 2 - 4, h / 2 - 4, '#b8a888', 0.9);
    pkFence(T, -w / 2 + 3, -h / 2 + 3, w / 2 - 3, h / 2 - 3, 12, '#c8ccd4', 18);
    T.prism(-w * 0.2, -h * 0.1, 2.2, 0.8, 8, _C('#e0364f'), 8); T.prism(-w * 0.2, -h * 0.1, 2.8, 8, 9.4, _C('#e0364f'), 8, 1.4, true); box5(T, -w * 0.2 - 3.4, 4, -h * 0.1 - 0.8, -w * 0.2 + 3.4, 5.6, -h * 0.1 + 0.8, _C('#e0364f'));   // the hydrant
    for (const x of [0, w * 0.15, w * 0.3]) { for (const sz of [-1, 1]) box5(T, x - 0.5, 0.8, -h * 0.2 + sz * 6 - 0.5, x + 0.5, 7, -h * 0.2 + sz * 6 + 0.5, _C('#f4f4f6')); box5(T, x - 0.4, 5, -h * 0.2 - 6, x + 0.4, 6, -h * 0.2 + 6, _C(c)); }   // jumps
    for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI, a1 = (k + 1) / 6 * Math.PI; face(T, [[-w * 0.3, 0.8 + Math.sin(a0) * 6, -h * 0.3 + Math.cos(a0) * 6], [-w * 0.3 + 22, 0.8 + Math.sin(a0) * 6, -h * 0.3 + Math.cos(a0) * 6], [-w * 0.3 + 22, 0.8 + Math.sin(a1) * 6, -h * 0.3 + Math.cos(a1) * 6], [-w * 0.3, 0.8 + Math.sin(a1) * 6, -h * 0.3 + Math.cos(a1) * 6]], [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)], _C(c)); }   // a tunnel
    T.prism(w * 0.3, h * 0.1, 3, 0.8, 2, _C('#9aa0ab'), 10, 3, true); disc(G, w * 0.3, h * 0.1, 2.4, 2.1, _C(PK_WATER), 10);
    pkBench(T, 0, h / 2 - 13, true, 1);
    return pkSign(T, s, s.w / 2 - 30, s.h / 2 + 2);
  },
  roses(T, G, s) {                        // rings of rose beds round the centre, rose arches over the paths
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0'); const R = ['#e0364f', '#ff4d6d', '#ff7ab6', c, '#ffffff', '#b3122a'];
    for (const r of [18, 34]) { const n = r < 20 ? 6 : 10; for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; pkBed(T, x - 5, z - 5, x + 5, z + 5, R, 2.6); pkS(x - 5, z - 5, x + 5, z + 5); } }
    T.prism(0, 0, 5, 0.8, 4, _C(PK_STONE), 12, 5, true); pkBush(T, 0, 0, 3, '#e0364f');
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const x = Math.cos(a) * 26, z = Math.sin(a) * 26, ox = -Math.sin(a) * 5, oz = Math.cos(a) * 5; for (let k = 0; k < 6; k++) { const b0 = k / 6 * Math.PI, b1 = (k + 1) / 6 * Math.PI; beam(T, [x + ox * Math.cos(b0), 0.8 + 14 * Math.sin(b0), z + oz * Math.cos(b0)], [x + ox * Math.cos(b1), 0.8 + 14 * Math.sin(b1), z + oz * Math.cos(b1)], 0.7, _C(k % 2 ? '#2f7a3a' : '#ff4d6d')); } }
    for (const [x, z] of [[-w / 2 + 12, h / 2 - 12], [w / 2 - 12, -h / 2 + 12]]) pkBench(T, x, z, true, Math.sign(-z));
    return pkSign(T, s);
  },
  zen(T, G, s) {                          // raked white gravel round dark rocks, a stone lantern, a bamboo hedge
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#ece8de');
    for (let z = -h / 2 + 6; z < h / 2 - 4; z += 4) flat(T, -w / 2 + 6, z, w / 2 - 6, z + 0.8, 0.9, _C('#d8d2c4'));
    for (const [x, z, r] of [[-w * 0.2, -h * 0.1, 9], [w * 0.15, h * 0.12, 6], [w * 0.28, -h * 0.2, 4.5]]) { for (const rr of [r + 4, r + 8]) T.prism(x, z, rr + 0.4, 0.92, 0.96, _C('#ece8de'), 20, rr + 0.4, true); T.prism(x, z, r, 0.9, r * 0.9, _C('#4a4a52'), 7, r * 0.4, true); pkS(x - r, z - r, x + r, z + r); }
    const lx = -w * 0.35, lz = h * 0.25; box5(T, lx - 3, 0.8, lz - 3, lx + 3, 2.2, lz + 3, _C('#9a9890')); T.prism(lx, lz, 1, 2.2, 8, _C('#9a9890'), 6); box5(T, lx - 3, 8, lz - 3, lx + 3, 11, lz + 3, _C('#9a9890')); box5(G, lx - 2, 8.6, lz - 2.2, lx + 2, 10.4, lz + 2.2, _C('#ffd98a')); T.prism(lx, lz, 4.6, 11, 13.6, _C('#8a8880'), 4, 0.5, true); pkS(lx - 3, lz - 3, lx + 3, lz + 3);
    for (let x = -w / 2 + 3; x < w / 2 - 2; x += 4) T.prism(x, -h / 2 + 3, 0.8, 0.8, 22 + (x * 7 % 6), _C('#5f8a3a'), 6); pkS(-w / 2, -h / 2, w / 2, -h / 2 + 5);   // bamboo
    return pkSign(T, s);
  },
  palms(T, G, s) {                        // a grid of tall palms over pale paving, loungers in their shade
    const { w, h, c } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#f0e8d8', '#e4dac6', 20);
    for (let x = -w / 2 + 18; x < w / 2 - 10; x += 32) for (let z = -h / 2 + 18; z < h / 2 - 16; z += 30) { T.prism(x, z, 4, 0.8, 1.8, _C('#d8d0c0'), 8, 4, true); palm(T, x, z, 34 + ((x + z) % 7));
      const lx = x + 12; box5(T, lx - 2.6, 0.8, z - 6, lx + 2.6, 2.4, z + 4, _C(c)); face(T, [[lx - 2.6, 2.4, z + 4], [lx + 2.6, 2.4, z + 4], [lx + 2.6, 6, z + 8], [lx - 2.6, 6, z + 8]], [0, 1, -1], _C(c)); }
    return pkSign(T, s);
  },
  theatre(T, G, s) {                      // half-round stepped seats facing a small stage under a shell
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#cfc8b8'); const sz = -h / 2 + 18, R = Math.min(w / 2 - 6, h - 30);
    box5(T, -24, 0.8, sz - 10, 24, 4, sz + 8, _C('#8a6a48')); for (let k = 0; k < 8; k++) { const a0 = Math.PI + k / 8 * Math.PI, a1 = Math.PI + (k + 1) / 8 * Math.PI; uqTri(T, [Math.cos(a0) * 26, 4, sz - 10 + Math.sin(a0) * 2], [Math.cos(a1) * 26, 4, sz - 10 + Math.sin(a1) * 2], [0, 34, sz - 12], [0, 0.3, 1], _C(k % 2 ? '#f4f4f6' : c)); }   // the stage and its shell
    pkS(-24, sz - 12, 24, sz + 8);
    for (let r = 0; r < 5; r++) { const rr = 26 + r * 9; if (rr > R) break; for (let k = 0; k < 10; k++) { const a0 = k / 10 * Math.PI, a1 = (k + 1) / 10 * Math.PI, y = 0.8 + r * 2.2; face(T, [[Math.cos(a0) * rr, y + 2.2, sz + Math.sin(a0) * rr], [Math.cos(a1) * rr, y + 2.2, sz + Math.sin(a1) * rr], [Math.cos(a1) * (rr + 7), y + 2.2, sz + Math.sin(a1) * (rr + 7)], [Math.cos(a0) * (rr + 7), y + 2.2, sz + Math.sin(a0) * (rr + 7)]], [0, 1, 0], _C(r % 2 ? '#d8d0c0' : '#c8c0b0')); face(T, [[Math.cos(a0) * rr, y, sz + Math.sin(a0) * rr], [Math.cos(a1) * rr, y, sz + Math.sin(a1) * rr], [Math.cos(a1) * rr, y + 2.2, sz + Math.sin(a1) * rr], [Math.cos(a0) * rr, y + 2.2, sz + Math.sin(a0) * rr]], [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)], _C('#a8a090')); } }
    return pkSign(T, s);
  },
  trucks(T, G, s) {                       // three food trucks, picnic tables, string lights
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#5a5d66');
    [[c, -w * 0.3], ['#ffd23f', 0], ['#3dffa6', w * 0.3]].forEach(([col, x], i) => { const z = -h / 2 + 16; box5(T, x - 18, 2, z - 7, x + 18, 18, z + 7, _C(col)); box5(T, x + 10, 2, z - 7, x + 18, 14, z + 7, _C('#f4f4f6')); box5(G, x - 14, 9, z + 7, x + 6, 15, z + 7.4, _C('#ffe9b0')); face(T, [[x - 15, 15, z + 7], [x + 7, 15, z + 7], [x + 7, 13, z + 12], [x - 15, 13, z + 12]], [0, 0.6, 0.8], _C(pick(['#ff7ab6', '#f4f4f6', '#2bf3ff']))); for (const wx of [x - 12, x + 12]) T.prism(wx, z + 7.2, 3, 0.8, 3, _C('#1d1d24'), 8); pkS(x - 18, z - 7, x + 18, z + 7); });
    for (let k = 0; k < 4; k++) { const x = -w * 0.3 + k * w * 0.2, z = h * 0.15; box5(T, x - 8, 5.4, z - 4, x + 8, 6.4, z + 4, _C(PK_WOOD)); for (const sz of [-1, 1]) box5(T, x - 8, 3, z + sz * 7 - 1.4, x + 8, 3.8, z + sz * 7 + 1.4, _C(PK_WOOD)); box5(T, x - 1, 0.8, z - 1, x + 1, 5.4, z + 1, _C(PK_WOOD)); }
    for (const x of [-w / 2 + 6, w / 2 - 6]) T.prism(x, h * 0.15, 0.6, 0.8, 26, _C(PK_IRON), 6); for (let k = 0; k <= 24; k++) { const x = -w / 2 + 6 + (w - 12) * k / 24, y = 26 - Math.sin(k / 24 * Math.PI) * 6; box5(G, x - 0.8, y - 1.4, h * 0.15 - 0.8, x + 0.8, y, h * 0.15 + 0.8, _C(pick(['#ffe9a8', '#ff7ab6', '#2bf3ff']))); }   // string lights
    return pkSign(T, s);
  },
  market(T, G, s) {                       // rows of stalls under striped awnings, crates of fruit and vegetables
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#c8c0b0');
    for (const z of [-h * 0.22, h * 0.15]) for (let x = -w / 2 + 16; x < w / 2 - 12; x += 26) {
      box5(T, x - 10, 0.8, z - 5, x + 10, 7, z + 5, _C(PK_WOOD)); for (let k = 0; k < 4; k++) box5(T, x - 9 + k * 4.6, 7, z - 4, x - 5.4 + k * 4.6, 9, z + 4, _C(pick(['#ff4d4d', '#ffb02e', '#3dbf6a', '#ffe14a', '#a259ff'])));
      for (const sx of [-1, 1]) T.prism(x + sx * 10, z - 5, 0.5, 0.8, 16, _C(PK_IRON), 6);
      for (let k = 0; k < 5; k++) face(T, [[x - 11 + k * 4.4, 17, z - 7], [x - 6.6 + k * 4.4, 17, z - 7], [x - 6.6 + k * 4.4, 13, z + 7], [x - 11 + k * 4.4, 13, z + 7]], [0, 1, 0.3], _C(k % 2 ? '#f4f4f6' : c));
      pkPerson(T, x, z - 8, pick(['#2a4aa8', '#e0364f', '#3dbf6a'])); pkS(x - 10, z - 5, x + 10, z + 5);
    }
    return pkSign(T, s);
  },
  mirror(T, G, s) {                       // a long shallow pool of still water, lamps along both sides, a bench at each end
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d4cc'); const L = w / 2 - 22, D = Math.min(18, h / 4);
    box5(T, -L, 0.8, -D, L, 2, D, _C('#bdb8ac')); flat(G, -L + 1.6, -D + 1.6, L - 1.6, D - 1.6, 2.05, _C('#7fb0e8')); pkS(-L, -D, L, D);
    for (let x = -L + 10; x < L; x += 26) for (const sz of [-1, 1]) pkLamp(T, G, x, sz * (D + 8), 22);
    pkBench(T, -L - 10, 0, false, 1); pkBench(T, L + 10, 0, false, -1);
    for (const sz of [-1, 1]) for (let x = -w / 2 + 6; x < w / 2 - 4; x += 12) pkBush(T, x, sz * (h / 2 - 6), 4, '#2f6a40');
    return pkSign(T, s, s.w / 2 - 30, s.h / 2 - 14);
  },
  maze(T, G, s) {                         // a square hedge maze, a little statue in the middle
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#cfc8b8'); const N = 7, S = Math.min(w, h) - 16, q = S / N, x0 = -S / 2, z0 = -S / 2, hedge = _C('#2f7a3a');
    const wall = (ax, az, bx, bz) => { box5(T, Math.min(ax, bx) - 1.5, 0.8, Math.min(az, bz) - 1.5, Math.max(ax, bx) + 1.5, 9, Math.max(az, bz) + 1.5, hedge); pkS(Math.min(ax, bx) - 1.5, Math.min(az, bz) - 1.5, Math.max(ax, bx) + 1.5, Math.max(az, bz) + 1.5); };
    wall(x0, z0, x0 + S, z0); wall(x0, z0, x0, z0 + S); wall(x0 + S, z0, x0 + S, z0 + S); wall(x0, z0 + S, x0 + 3 * q, z0 + S); wall(x0 + 4 * q, z0 + S, x0 + S, z0 + S);   // the outside, a way in at the front
    const segs = [[1, 1, 3, 1], [4, 1, 6, 1], [1, 1, 1, 3], [2, 2, 5, 2], [5, 2, 5, 4], [6, 1, 6, 5], [1, 4, 3, 4], [3, 3, 3, 5], [4, 3, 4, 6], [2, 5, 2, 7], [5, 5, 6, 5], [1, 6, 3, 6], [5, 6, 7, 6], [0, 3, 1, 3]];
    for (const [a, b, c2, d] of segs) wall(x0 + a * q, z0 + b * q, x0 + c2 * q, z0 + d * q);
    const mx = x0 + 3.5 * q, mz = z0 + 3.5 * q; box5(T, mx - 2, 0.8, mz - 2, mx + 2, 4, mz + 2, _C(PK_STONE)); pkPerson(T, mx, mz, c); 
    return pkSign(T, s);
  },
  minigolf(T, G, s) {                     // putting greens with holes and flags, a pirate ship, a skull rock, a waterfall pool
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8c8a0'); const green = _C('#3dbf6a');
    for (const [x0, z0, x1, z1] of [[-w / 2 + 8, -h / 2 + 8, -w * 0.1, -h / 2 + 26], [-w / 2 + 8, -h / 2 + 30, -w / 2 + 26, h / 2 - 8], [-w * 0.05, h * 0.05, w / 2 - 8, h * 0.05 + 18], [w * 0.15, -h / 2 + 8, w * 0.33, -h * 0.05]]) {
      box5(T, x0, 0.8, z0, x1, 2, z1, _C(PK_WOOD)); flat(T, x0 + 1.2, z0 + 1.2, x1 - 1.2, z1 - 1.2, 2.1, green); const hx = x1 - 5, hz = (z0 + z1) / 2; disc(T, hx, hz, 1.4, 2.2, _C('#1d1d24'), 8); T.prism(hx, hz, 0.3, 2.2, 12, _C('#f4f4f6'), 4); box5(T, hx + 0.3, 9, hz - 0.2, hx + 5, 12, hz + 0.2, _C(c)); }
    const sx = w * 0.05, sz = -h * 0.15; face(T, [[sx - 20, 2, sz - 6], [sx + 20, 2, sz - 6], [sx + 14, 9, sz - 8], [sx - 14, 9, sz - 8]], [0, -0.3, -1], _C('#6b4a2e')); box5(T, sx - 16, 0.8, sz - 6, sx + 16, 9, sz + 6, _C('#7a5a3a')); T.prism(sx, sz, 0.8, 9, 34, _C('#5a3a26'), 6); face(T, [[sx, 14, sz], [sx, 32, sz], [sx + 12, 23, sz], [sx + 12, 23, sz]], [0, 0, 1], _C('#f4efe6')); box5(T, sx - 0.3, 32, sz - 0.2, sx + 6, 36, sz + 0.2, _C('#1d1d24')); pkS(sx - 16, sz - 6, sx + 16, sz + 6);   // the pirate ship
    T.prism(-w * 0.2, h * 0.25, 8, 0.8, 12, _C('#8a8880'), 8, 5, true); box5(T, -w * 0.2 - 3, 7, h * 0.25 + 5.6, -w * 0.2 - 1, 9, h * 0.25 + 6.6, _C('#1d1d24')); box5(T, -w * 0.2 + 1, 7, h * 0.25 + 5.6, -w * 0.2 + 3, 9, h * 0.25 + 6.6, _C('#1d1d24')); pkS(-w * 0.2 - 7, h * 0.25 - 7, -w * 0.2 + 7, h * 0.25 + 7);   // skull rock
    pkPond(T, G, w * 0.32, h * 0.32, 10, '#8a8880', 14); box5(G, w * 0.32 + 6, 3, h * 0.32 - 3, w * 0.32 + 7, 12, h * 0.32 + 3, _C('#bff6ff'));
    return pkSign(T, s);
  },
  carousel(T, G, s) {                     // a small carousel with horses under a striped canopy, turning
    const { w, h, c } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#e8dcc6', '#d8cab0', 16); T.prism(0, 0, 24, 0.8, 3, _C('#c9a24a'), 20, 24, true); pkS(-22, -22, 22, 22);
    T.prism(0, 0, 3, 3, 22, _C('#ffd23f'), 10); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { pkLamp(T, G, sx * (w / 2 - 12), sz * (h / 2 - 12), 22); pkBench(T, sx * (w / 2 - 26), sz * (h / 2 - 12), true, -sz); }
    return uqAll(pkSign(T, s), m => {
      const g = new THREE.Group(), RT = new GeoBuilder(), RG = new GeoBuilder();
      for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU; uqTri(RT, [Math.cos(a0) * 26, 22, Math.sin(a0) * 26], [Math.cos(a1) * 26, 22, Math.sin(a1) * 26], [0, 32, 0], [Math.cos((a0 + a1) / 2), 1.4, Math.sin((a0 + a1) / 2)], _C(k % 2 ? c : '#f4f4f6')); box5(RG, Math.cos(a0) * 26 - 0.7, 20.4, Math.sin(a0) * 26 - 0.7, Math.cos(a0) * 26 + 0.7, 22, Math.sin(a0) * 26 + 0.7, _C('#fff3b0')); }
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, x = Math.cos(a) * 18, z = Math.sin(a) * 18, y = 7 + (k % 2) * 3; RT.prism(x, z, 0.4, 3, 22, _C('#ffd23f'), 4); box5(RT, x - 2.4 * Math.sin(a) - 1, y, z + 2.4 * Math.cos(a) - 1, x + 2.4 * Math.sin(a) + 1, y + 4, z - 2.4 * Math.cos(a) + 1, _C(k % 2 ? '#f4f4f6' : '#8a5a3a')); }
      const mm = lmMesh(RT, RG); g.add(mm); m.add(g); m.userData.own.push(...mm.userData.own); pkAnim(m, t => { g.rotation.y = t * 0.6; });
    });
  },
  pergola(T, G, s) {                      // white pergolas under purple bougainvillea over a path, benches beneath
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); flat(T, -w / 2, -9, w / 2, 9, 0.9, _C('#d8d0c0'));
    for (let x = -w / 2 + 12; x < w / 2 - 6; x += 22) { for (const sz of [-1, 1]) { box5(T, x - 1.2, 0.8, sz * 10 - 1.2, x + 1.2, 20, sz * 10 + 1.2, _C('#f4f4f6')); pkS(x - 1.2, sz * 10 - 1.2, x + 1.2, sz * 10 + 1.2); } box5(T, x - 1, 20, -12, x + 1, 21.4, 12, _C('#f4f4f6'));
      for (const sz of [-1, 1]) pkBush(T, x, sz * 13, 3.4, '#3f8a4a');
      pkVines(T, x, c); }
    for (let x = -w / 2 + 6; x < w / 2; x += 22) for (const sz of [-1, 1]) box5(T, x - 11, 20, sz * 10 - 1, x + 11, 21, sz * 10 + 1, _C('#f4f4f6'));
    for (let x = -w / 2 + 23; x < w / 2 - 6; x += 44) { pkBench(T, x, -14, true, 1); pkBench(T, x, 14, true, -1); }
    return pkSign(T, s);
  },
});
function pkVines(T, x, c) { for (let k = 0; k < 8; k++) T.prism(x - 9 + (k * 13 % 18), -8 + (k * 7 % 16), 3.2, 20.5, 23, _C(k % 3 ? c : '#3f8a4a'), 7, 1.6, true); }   // flowers spilling over a pergola's top

Object.assign(PK, {
  butterflies(T, G, s) {                  // wavy beds of bright flowers, a mesh butterfly house, stepping stones
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f'); const F = [c, '#ff7a3d', '#ff2bd6', '#ffffff', '#a259ff', '#ffe14a'];
    for (let k = 0; k < 5; k++) { const z = -h / 2 + 12 + k * (h - 24) / 4, x = Math.sin(k * 1.3) * w * 0.12; pkBed(T, x - w * 0.3, z - 4, x + w * 0.3 - 30, z + 4, F, 2.8); }
    const hx = w * 0.28, hz = -h * 0.12, R = Math.min(18, h * 0.22); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; for (let j = 0; j < 4; j++) { const b0 = j / 4 * Math.PI / 2, b1 = (j + 1) / 4 * Math.PI / 2; beam(T, [hx + Math.cos(a) * R * Math.cos(b0), 0.8 + R * Math.sin(b0), hz + Math.sin(a) * R * Math.cos(b0)], [hx + Math.cos(a) * R * Math.cos(b1), 0.8 + R * Math.sin(b1), hz + Math.sin(a) * R * Math.cos(b1)], 0.4, _C('#d8dce4')); } }
    T.prism(hx, hz, R * 0.92, 0.8, R * 0.5, _C('#cfe6ff'), 10, R * 0.6); T.prism(hx, hz, R * 0.6, R * 0.5, R * 0.95, _C('#cfe6ff'), 10, R * 0.1, true); pkS(hx - R, hz - R, hx + R, hz + R);   // the mesh dome
    for (let k = 0; k < 14; k++) { const x = -w / 2 + 10 + (k * 37) % (w - 20), z = -h / 2 + 10 + (k * 23) % (h - 20), y = 6 + (k % 4) * 3; for (const sx of [-1, 1]) face(T, [[x, y, z], [x + sx * 2.4, y + 1.2, z - 1.6], [x + sx * 2.4, y + 1.2, z + 1.6], [x, y, z]], [0, 1, 0], _C(pick(F))); }   // butterflies
    for (let k = 0; k < 7; k++) T.prism(-w * 0.1 + k * 7, h * 0.3 - k * 2, 2.4, 0.8, 1.3, _C('#c8c0b0'), 8, 2.4, true);
    return pkSign(T, s);
  },
  bocce(T, G, s) {                        // two bocce lanes of gravel with wooden edges, balls in play, a shade roof
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#c8c0b0'); const L = w / 2 - 14;
    for (const z of [-h * 0.18, h * 0.08]) { box5(T, -L, 0.8, z - 8, L, 2.4, z + 8, _C(PK_WOOD)); flat(T, -L + 1.4, z - 6.6, L - 1.4, z + 6.6, 2.5, _C('#e0d0a8')); pkS(-L, z - 8, L, z + 8);
      for (const [x, col] of [[L * 0.6, '#e0364f'], [L * 0.7, '#2a4aa8'], [L * 0.66, '#e0364f'], [L * 0.75, '#ffffff']]) T.prism(x, z + ((x * 13) % 5) - 2, col === '#ffffff' ? 0.7 : 1.4, 2.5, col === '#ffffff' ? 3.6 : 4.6, _C(col), 8, 0.4, true); }
    const sz = h / 2 - 16; for (const x of [-L + 4, 0, L - 4]) T.prism(x, sz, 0.8, 0.8, 18, _C(PK_IRON), 6); box5(T, -L, 18, sz - 7, L, 19.4, sz + 5, _C(c));   // the shade roof
    for (let x = -L + 16; x < L - 10; x += 26) pkBench(T, x, sz, true, -1);
    return pkSign(T, s, -s.w / 2 + 30, s.h / 2 - 3);
  },
  sundial(T, G, s) {                      // a great sundial: a bronze gnomon over a disc ringed with hour stones
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); const R = Math.min(w, h) * 0.38;
    T.prism(0, 0, R, 0.8, 2, _C('#e8e0c8'), 32, R, true); T.prism(0, 0, R - 6, 2, 2.1, _C('#d8d0b8'), 32, R - 6, true);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, x = Math.cos(a) * (R - 3), z = Math.sin(a) * (R - 3); box5(T, x - 1.6, 2, z - 1.6, x + 1.6, k % 3 ? 4 : 6, z + 1.6, _C('#9a9890')); }
    face(T, [[0, 2, -R * 0.6], [0, 2, R * 0.2], [0, 2 + R * 0.55, -R * 0.6], [0, 2 + R * 0.55, -R * 0.6]], [1, 0, 0], _C('#b8862a')); face(T, [[0, 2, R * 0.2], [0, 2, -R * 0.6], [0, 2 + R * 0.55, -R * 0.6], [0, 2 + R * 0.55, -R * 0.6]], [-1, 0, 0], _C('#a8761a')); pkS(-2, -R * 0.6, 2, R * 0.2);
    face(T, [[0, 2.2, R * 0.2], [R * 0.7, 2.2, -R * 0.1], [R * 0.7, 2.2, -R * 0.05], [0, 2.2, R * 0.24]], [0, 1, 0], _C('#5a5f69'));   // its shadow
    for (const [x, z] of [[-w / 2 + 12, h / 2 - 10], [w / 2 - 34, h / 2 - 10]]) pkBench(T, x + 12, z, true, -1);
    return pkSign(T, s);
  },
  labyrinth(T, G, s) {                    // a round stone labyrinth path in the lawn, a stone seat at its heart
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); const R = Math.min(w, h) * 0.42, path = _C('#d8d0c0');
    for (let r = 6; r < R; r += 6) { const gap = (r / 6) % 2 ? 0.3 : Math.PI + 0.3; for (let k = 0; k < 36; k++) { const a0 = k / 36 * TAU, a1 = (k + 1) / 36 * TAU; if (Math.abs(angDiff((a0 + a1) / 2, gap)) < 0.18) continue; face(T, [[Math.cos(a0) * r, 0.9, Math.sin(a0) * r], [Math.cos(a1) * r, 0.9, Math.sin(a1) * r], [Math.cos(a1) * (r + 3), 0.9, Math.sin(a1) * (r + 3)], [Math.cos(a0) * (r + 3), 0.9, Math.sin(a0) * (r + 3)]], [0, 1, 0], path); } }
    T.prism(0, 0, 3.4, 0.8, 4.4, _C('#9a9890'), 10, 3.4, true);
    for (const a of [0.6, 2.2, 3.8, 5.2]) pkTree(T, Math.cos(a) * (R + 8), Math.sin(a) * (R + 8), 8, 30);
    return pkSign(T, s);
  },
  flamingos(T, G, s) {                    // a pond with pink flamingo statues standing in it, reeds and lilies round it
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f'); const R = Math.min(w, h) * 0.36;
    pkPond(T, G, 0, -h * 0.05, R, '#8a8880', 28);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.4, x = Math.cos(a) * R * 0.5, z = -h * 0.05 + Math.sin(a) * R * 0.5, pk = _C(c);
      box5(T, x - 0.2, 3, z - 0.2, x + 0.2, 10, z + 0.2, _C('#e8a0b0')); box5(T, x - 3, 10, z - 1.6, x + 3, 13.6, z + 1.6, pk); beam(T, [x + 2, 13, z], [x + 2.6, 19, z], 0.5, pk); box5(T, x + 2, 18.4, z - 1, x + 4.6, 20, z + 1, pk); box5(T, x + 4.6, 18.6, z - 0.4, x + 6, 19.4, z + 0.4, _C('#1d1d24')); }
    for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, x = Math.cos(a) * (R + 2), z = -h * 0.05 + Math.sin(a) * (R + 2); T.prism(x, z, 0.4, 0.8, 10 + (k % 3) * 3, _C('#6a8a3a'), 4); }
    for (let k = 0; k < 8; k++) { const a = k * 0.8, x = Math.cos(a) * R * 0.75, z = -h * 0.05 + Math.sin(a) * R * 0.75; disc(T, x, z, 2.6, 3.2, _C('#3f8a4a'), 8); }
    pkBench(T, 0, h / 2 - 10, true, -1);
    return pkSign(T, s);
  },
  desert(T, G, s) {                       // sand and gravel, tall cacti, agaves, boulders, an old wagon wheel
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#e0c89a'); for (let k = 0; k < 10; k++) disc(T, -w / 2 + 12 + (k * 31) % (w - 24), -h / 2 + 12 + (k * 19) % (h - 24), 6 + k % 4, 0.85, _C('#c8b080'), 10);
    const cactus = (x, z, H) => { const g = _C('#3f7a3a'); T.prism(x, z, 2.6, 0.8, H, g, 8, 2.2, true); for (const [sx, y] of [[-1, H * 0.45], [1, H * 0.6]]) { box5(T, x + sx * 2.4, y - 1.2, z - 1.2, x + sx * 7, y + 1.2, z + 1.2, g); T.prism(x + sx * 6, z, 1.6, y, y + H * 0.3, g, 6, 1.2, true); } pkS(x - 2.6, z - 2.6, x + 2.6, z + 2.6); };
    cactus(-w * 0.3, -h * 0.2, 30); cactus(w * 0.1, -h * 0.25, 36); cactus(w * 0.32, h * 0.1, 24); cactus(-w * 0.05, h * 0.18, 20);
    for (const [x, z] of [[-w * 0.15, h * 0.05], [w * 0.22, -h * 0.05], [-w * 0.38, h * 0.25]]) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; face(T, [[x, 1, z], [x + Math.cos(a) * 6, 4, z + Math.sin(a) * 6], [x + Math.cos(a + 0.3) * 6, 4.4, z + Math.sin(a + 0.3) * 6], [x, 1, z]], [Math.cos(a), 0.8, Math.sin(a)], _C('#6a9a8a')); }   // agaves
    for (const [x, z, r] of [[w * 0.35, -h * 0.3, 6], [-w * 0.4, -h * 0.05, 5]]) { T.prism(x, z, r, 0.8, r, _C('#b8987a'), 7, r * 0.5, true); pkS(x - r, z - r, x + r, z + r); }
    const wx = w * 0.05, wz = h * 0.35; for (let k = 0; k < 12; k++) { const a0 = k / 12 * TAU, a1 = (k + 1) / 12 * TAU; beam(T, [wx + Math.cos(a0) * 7, 7 + Math.sin(a0) * 7, wz], [wx + Math.cos(a1) * 7, 7 + Math.sin(a1) * 7, wz], 0.6, _C('#6b4a2e')); } for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; beam(T, [wx - Math.cos(a) * 7, 7 - Math.sin(a) * 7, wz], [wx + Math.cos(a) * 7, 7 + Math.sin(a) * 7, wz], 0.4, _C('#6b4a2e')); }
    return pkSign(T, s);
  },
  topiary(T, G, s) {                      // hedges clipped into animals and balls on stems
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0'); const hg = _C('#3f8a4a'), dk = _C('#2f7a3a');
    for (const sz of [-1, 1]) box5(T, -w / 2 + 4, 0.8, sz * (h / 2 - 5) - 2, w / 2 - 4, 7, sz * (h / 2 - 5) + 2, dk);
    let x = -w * 0.28, z = -h * 0.05; box5(T, x - 9, 8, z - 6, x + 9, 20, z + 6, hg); for (const [a, b] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) box5(T, x + a - 2, 0.8, z + b - 2, x + a + 2, 8, z + b + 2, hg); box5(T, x + 9, 12, z - 4, x + 15, 22, z + 4, hg); box5(T, x + 14, 2, z - 1.2, x + 16, 12, z + 1.2, hg); pkS(x - 9, z - 6, x + 16, z + 6);   // an elephant
    x = 0; box5(T, x - 5, 8, z - 3, x + 5, 16, z + 3, hg); for (const [a, b] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) box5(T, x + a - 1, 0.8, z + b - 1, x + a + 1, 8, z + b + 1, hg); box5(T, x + 3, 16, z - 1.4, x + 6, 34, z + 1.4, hg); box5(T, x + 4, 32, z - 2, x + 10, 36, z + 2, hg); pkS(x - 5, z - 3, x + 6, z + 3);   // a giraffe
    x = w * 0.25; box5(T, x - 5, 0.8, z - 4, x + 5, 8, z + 4, hg); box5(T, x + 3, 6, z - 3, x + 8, 12, z + 3, hg); for (const sz of [-1, 1]) box5(T, x + 4, 12, z + sz * 1.6 - 0.8, x + 6, 20, z + sz * 1.6 + 0.8, hg); pkS(x - 5, z - 4, x + 8, z + 4);   // a rabbit
    for (let k = 0; k < 6; k++) { const bx = -w / 2 + 16 + k * (w - 32) / 5, bz = h * 0.3; T.prism(bx, bz, 1, 0.8, 8, _C('#6b4a2e'), 6); T.prism(bx, bz, 4.6, 8, 12, hg, 8, 4.6); T.prism(bx, bz, 4.6, 12, 15, hg, 8, 1, true); }
    return pkSign(T, s);
  },
  arches(T, G, s) {                       // a row of arches in every colour of the rainbow over a white path
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, PK_GREEN); flat(T, -w / 2, -10, w / 2, 10, 0.9, _C('#f4f4f6'));
    const RB = ['#e0364f', '#ff7a3d', '#ffd23f', '#3dbf6a', '#2bf3ff', '#2a4aa8', '#a259ff'];
    RB.forEach((col, i) => { const x = -w * 0.36 + i * w * 0.72 / 6; for (let k = 0; k < 10; k++) { const a0 = k / 10 * Math.PI, a1 = (k + 1) / 10 * Math.PI; face(T, [[x - 1.6, 0.8 + Math.sin(a0) * 26, Math.cos(a0) * 14], [x + 1.6, 0.8 + Math.sin(a0) * 26, Math.cos(a0) * 14], [x + 1.6, 0.8 + Math.sin(a1) * 26, Math.cos(a1) * 14], [x - 1.6, 0.8 + Math.sin(a1) * 26, Math.cos(a1) * 14]], [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)], _C(col)); } for (const sz of [-1, 1]) pkS(x - 1.6, sz * 14 - 1.6, x + 1.6, sz * 14 + 1.6); });
    return pkSign(T, s);
  },
  picnic(T, G, s) {                       // shady trees over picnic tables with checked cloths, grills, bins
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f');
    for (const [x, z] of [[-w * 0.3, -h * 0.25], [w * 0.05, -h * 0.3], [w * 0.32, -h * 0.05], [-w * 0.12, h * 0.15]]) pkTree(T, x, z, 14, 40);
    for (const [x, z] of [[-w * 0.3, -h * 0.02], [w * 0.05, -h * 0.08], [w * 0.15, h * 0.25], [-w * 0.32, h * 0.3]]) { box5(T, x - 8, 5.4, z - 4, x + 8, 6.4, z + 4, _C(PK_WOOD)); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) flat(T, x - 8 + i * 4, z - 4 + j * 4, x - 4 + i * 4, z + j * 4, 6.5, _C(c)); for (const sz of [-1, 1]) box5(T, x - 8, 3, z + sz * 7 - 1.4, x + 8, 3.8, z + sz * 7 + 1.4, _C(PK_WOOD)); box5(T, x - 1, 0.8, z - 1, x + 1, 5.4, z + 1, _C(PK_WOOD)); pkS(x - 8, z - 4, x + 8, z + 4); }
    for (const [x, z] of [[w * 0.36, h * 0.28], [-w * 0.05, h * 0.36]]) { T.prism(x, z, 0.6, 0.8, 7, _C(PK_IRON), 6); box5(T, x - 3, 7, z - 2, x + 3, 9, z + 2, _C('#1d1d24')); box5(G, x - 2.4, 9, z - 1.4, x + 2.4, 9.3, z + 1.4, _C('#ff7a3d')); }   // grills
    return pkSign(T, s);
  },
  lilies(T, G, s) {                       // a round pond under lily pads and pink flowers, a frog fountain, a little wooden bridge
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f'); const R = Math.min(w, h) * 0.38;
    T.prism(0, 0, R, 0.8, 2.4, _C('#6b5a46'), 28, R, true); disc(G, 0, 0, R - 2, 2.5, _C('#3a9ac0'), 28); pkS(-R * 0.7, -R * 0.7, R * 0.7, R * 0.7);
    for (let k = 0; k < 26; k++) { const a = k * 2.4, r = R * (0.25 + (k * 0.37) % 0.65), x = Math.cos(a) * r, z = Math.sin(a) * r; disc(T, x, z, 2.4 + (k % 3), 2.6 + k * 0.002, _C(k % 2 ? '#3f8a4a' : '#4f9a52'), 9); if (k % 4 === 0) T.prism(x + 1, z, 1, 2.6, 4, _C(c), 6, 0.4, true); }
    box5(T, -4, 2.4, -4, 4, 7, 4, _C('#3f8a4a')); for (const sx of [-1, 1]) box5(T, sx * 2.4 - 1, 7, 2, sx * 2.4 + 1, 9, 4, _C('#3f8a4a')); box5(G, -0.4, 5, 4, 0.4, 5.8, 9, _C('#bff6ff'));   // the frog
    const bx = R * 0.6; for (let k = 0; k < 5; k++) { const z0 = R * 0.55 - k * 4, y = 3 + Math.sin(k / 4 * Math.PI) * 4; box5(T, bx - 4, y, z0 - 4, bx + 4, y + 1, z0, _C(PK_WOOD)); }
    return pkSign(T, s);
  },
  palmhouse(T, G, s) {                    // a Victorian glass palm house with a curved roof, palms inside, beds round it
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0'); const L = w / 2 - 18, D = Math.min(h / 2 - 16, 34);
    for (const sx of [-1, 1]) pkBed(T, -L, sx * (D + 4) - 3, L, sx * (D + 4) + 3, [c, '#ff7ab6', '#ffffff', '#ffe14a']);
    for (const x of [-L * 0.4, L * 0.35]) palm(T, x, 0, 44);
    const glass = _C('#bff6ff'), iron = _C('#f4f4f6'); box5(T, -L, 0.8, -D, L, 14, D, glass);
    for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI, a1 = (k + 1) / 8 * Math.PI; face(T, [[-L, 14 + Math.sin(a0) * D * 0.9, Math.cos(a0) * D], [L, 14 + Math.sin(a0) * D * 0.9, Math.cos(a0) * D], [L, 14 + Math.sin(a1) * D * 0.9, Math.cos(a1) * D], [-L, 14 + Math.sin(a1) * D * 0.9, Math.cos(a1) * D]], [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)], glass); }
    for (let x = -L; x <= L + 0.1; x += L / 4) for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI, a1 = (k + 1) / 8 * Math.PI; beam(T, [x, 14 + Math.sin(a0) * D * 0.9, Math.cos(a0) * D], [x, 14 + Math.sin(a1) * D * 0.9, Math.cos(a1) * D], 0.5, iron); }
    T.prism(0, 0, 8, 14 + D * 0.9, 18 + D * 0.9, glass, 12, 3, true); pkS(-L, -D, L, D);
    return pkSign(T, s);
  },
  jets(T, G, s) {                         // rows of jets in a dark pool, lit in colours, rising and falling in turn
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4a4e5c'); const L = w / 2 - 14, D = h / 2 - 22;
    box5(T, -L, 0.8, -D, L, 2.2, D, _C('#2a2d3a')); flat(G, -L + 2, -D + 2, L - 2, D - 2, 2.3, _C('#1a4a7a')); pkS(-L, -D, L, D);
    for (const sz of [-1, 1]) for (let x = -L + 10; x < L - 6; x += 26) pkBench(T, x, sz * (D + 9), true, -sz);
    return uqAll(pkSign(T, s), m => { const jets = [], n = Math.max(4, Math.round(2 * L / 14));
      for (let k = 0; k < n; k++) for (const z of [-D * 0.4, D * 0.4]) { const j = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: ['#2bf3ff', '#ff2bd6', '#ffe14a', '#3dffa6'][k % 4], transparent: true, opacity: 0.75 })); j.position.set(-L + 8 + k * (2 * L - 16) / (n - 1), 2.3, z); j.scale.set(1.4, 1, 1.4); m.add(j); m.userData.own.push(j.material); jets.push(j); }
      pkAnim(m, t => jets.forEach((j, i) => { const hgt = 4 + 22 * Math.max(0, Math.sin(t * 2 + i * 0.6)); j.scale.y = hgt; j.position.y = 2.3 + hgt / 2; })); });
  },
  statue(T, G, s) {                       // a bronze rider on a tall plinth, lamp posts, flower urns
    const { w, h, c } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d4cc', '#c8c4bc', 24); const br = _C('#8a6a3a');
    box5(T, -12, 0.8, -8, 12, 4, 8, _C('#bdb8ac')); box5(T, -9, 4, -6, 9, 22, 6, _C('#d8d4cc')); pkS(-12, -8, 12, 8);
    box5(T, -7, 30, -2.4, 7, 37, 2.4, br); for (const [a, b] of [[-5, -1.6], [5, -1.6], [-5, 1.6], [5, 1.6]]) box5(T, a - 0.8, 22, b - 0.8, a + 0.8, 30, b + 0.8, br); box5(T, 6, 34, -1.6, 10, 42, 1.6, br); box5(T, 8, 40, -1.2, 12, 43, 1.2, br);   // the horse
    box5(T, -2, 37, -1.8, 2, 46, 1.8, br); box5(T, -1.4, 46, -1.4, 1.4, 49, 1.4, br); beam(T, [1, 44, 0], [6, 52, 0], 0.5, br);   // the rider, a raised sword
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { pkLamp(T, G, sx * (w / 2 - 10), sz * (h / 2 - 10), 24); const ux = sx * 24, uz = sz * 18; T.prism(ux, uz, 3, 0.8, 7, _C('#d8d4cc'), 10, 4.4); pkBush(T, ux, uz + 0, 4, c); }
    return pkSign(T, s);
  },
  bell(T, G, s) {                         // a bronze bell in a timber frame, a ring of stones, olive trees
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d0c0'); disc(T, 0, 0, Math.min(w, h) * 0.34, 0.9, _C('#4f8a3f'), 24);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r = Math.min(w, h) * 0.3; T.prism(Math.cos(a) * r, Math.sin(a) * r, 2.6, 0.8, 4.6, _C('#9a9890'), 7, 1.6, true); }
    for (const sx of [-1, 1]) box5(T, sx * 9 - 1.6, 0.8, -1.6, sx * 9 + 1.6, 26, 1.6, _C('#6b4a2e')); box5(T, -12, 26, -2, 12, 29, 2, _C('#6b4a2e')); face(T, [[-14, 29, -3], [14, 29, -3], [12, 33, 0], [-12, 33, 0]], [0, 1, -1], _C('#4a3a2a')); face(T, [[14, 29, 3], [-14, 29, 3], [-12, 33, 0], [12, 33, 0]], [0, 1, 1], _C('#4a3a2a')); pkS(-11, -2, 11, 2);
    T.prism(0, 0, 4.6, 12, 22, _C('#8a6a3a'), 14, 3); T.prism(0, 0, 3, 22, 25, _C('#8a6a3a'), 14, 1, true); T.prism(0, 0, 5.2, 11, 12, _C('#7a5a2a'), 14, 4.6);   // the bell
    for (const [x, z] of [[-w * 0.35, -h * 0.3], [w * 0.35, -h * 0.25], [-w * 0.3, h * 0.3]]) pkTree(T, x, z, 10, 26, '#7a8a5a');
    return pkSign(T, s);
  },
  waterwall(T, G, s) {                    // a long stone wall with water sheeting down into a basin, benches facing it
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#d8d4cc'); const L = w / 2 - 12, z0 = -h / 2 + 8;
    box5(T, -L, 0.8, z0, L, 30, z0 + 6, _C('#8a8478')); face(G, [[-L + 4, 4, z0 + 6.3], [L - 4, 4, z0 + 6.3], [L - 4, 29, z0 + 6.3], [-L + 4, 29, z0 + 6.3]], [0, 0, 1], _C('#9fe0ff'));
    pkPool(T, G, -L, z0 + 6, L, z0 + 18, '#8a8478'); pkS(-L, z0, L, z0 + 18);
    for (let x = -L + 4; x < L - 4; x += 6) box5(G, x, 4, z0 + 6.4, x + 0.6, 29, z0 + 6.8, _C('#e8faff'));   // the sheets of water catching the light
    for (let x = -L + 20; x < L - 10; x += 34) pkBench(T, x, h * 0.15, true, -1);
    for (const sx of [-1, 1]) pkTree(T, sx * (w / 2 - 14), h / 2 - 16, 10, 32);
    return pkSign(T, s);
  },
  mosaic(T, G, s) {                       // broken-tile mosaic ground, a wavy mosaic bench, a mosaic lizard
    const { w, h, c } = s; const M = [c, '#2bf3ff', '#ffe14a', '#ff2bd6', '#3dbf6a', '#f4f4f6', '#2a4aa8'];
    for (let x = -w / 2; x < w / 2 - 0.1; x += 8) for (let z = -h / 2; z < h / 2 - 0.1; z += 8) flat(T, x, z, Math.min(w / 2, x + 8), Math.min(h / 2, z + 8), 0.8, _C(Math.random() < 0.7 ? '#f0e8d8' : pick(M)));
    for (let k = 0; k < 24; k++) { const x0 = -w * 0.4 + k * w * 0.8 / 24, z = -h * 0.2 + Math.sin(k * 0.5) * 10; box5(T, x0, 0.8, z - 3, x0 + w * 0.8 / 24 + 0.2, 6, z + 3, _C(pick(M))); }   // the wavy bench
    pkS(-w * 0.4, -h * 0.2 - 13, w * 0.4, -h * 0.2 + 13);
    const lx = 0, lz = h * 0.2; for (let k = 0; k < 9; k++) { const x = lx - 16 + k * 4, z = lz + Math.sin(k * 0.8) * 3, r = k < 2 ? 1.6 : k < 7 ? 3 : 2; box5(T, x - 2, 0.8, z - r, x + 2, 4, z + r, _C(M[k % M.length])); } for (const [a, b] of [[-6, -1], [-6, 1], [6, -1], [6, 1]]) box5(T, lx + a * 1.4 - 1, 0.8, lz + b * 6 - 1, lx + a * 1.4 + 1, 2.6, lz + b * 6 + 1, _C('#3dbf6a'));   // the lizard
    pkS(lx - 16, lz - 4, lx + 20, lz + 4);
    return pkSign(T, s);
  },
  pinwheels(T, G, s) {                    // tall poles with turning pinwheels in bright colours
    const { w, h } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#4f8a3f'); const pos = [];
    for (let k = 0; k < 9; k++) { const x = -w * 0.36 + (k % 3) * w * 0.36 + ((k * 7) % 5) - 2, z = -h * 0.3 + Math.floor(k / 3) * h * 0.3, hh = 22 + (k * 5) % 14; T.prism(x, z, 0.7, 0.8, hh, _C('#d8dce4'), 6); pkS(x - 1, z - 1, x + 1, z + 1); pos.push([x, hh, z]); }
    return uqAll(pkSign(T, s), m => { const ws = [];
      pos.forEach(([x, y, z], i) => { const g = new THREE.Group(), B = new GeoBuilder(), cols = ['#e0364f', '#ffd23f', '#2bf3ff', '#3dffa6', '#ff2bd6', '#2a4aa8'];
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; uqTri(B, [0, 0, 0], [Math.cos(a) * 8, Math.sin(a) * 8, 0], [Math.cos(a + 0.6) * 5, Math.sin(a + 0.6) * 5, 0], [0, 0, 1], _C(cols[(i + k) % 6])); uqTri(B, [0, 0, -0.1], [Math.cos(a + 0.6) * 5, Math.sin(a + 0.6) * 5, -0.1], [Math.cos(a) * 8, Math.sin(a) * 8, -0.1], [0, 0, -1], _C(cols[(i + k + 2) % 6])); }
        const mm = lmMesh(B, new GeoBuilder()); g.add(mm); g.position.set(x, y, z + 1); m.add(g); m.userData.own.push(...mm.userData.own); ws.push(g); });
      pkAnim(m, t => ws.forEach((g, i) => { g.rotation.z = t * (1.5 + i * 0.2); })); });
  },
  anchor(T, G, s) {                       // a huge anchor, a ship's wheel, a mast with signal flags, rope bollards
    const { w, h, c } = s; pkChecker(T, -w / 2, -h / 2, w / 2, h / 2, '#e8e0d0', '#c8d4e4', 24); const ir = _C('#2a2d3a');
    const ax = -w * 0.2; box5(T, ax - 2, 0.8, -2, ax + 2, 30, 2, ir); box5(T, ax - 10, 26, -1.4, ax + 10, 28, 1.4, ir); T.prism(ax, 0, 3.4, 30, 33, ir, 10, 3.4); for (let k = 0; k < 8; k++) { const a0 = Math.PI + k / 8 * Math.PI, a1 = Math.PI + (k + 1) / 8 * Math.PI; beam(T, [ax + Math.cos(a0) * 12, 10 - Math.sin(a0) * -8 - 8, 0], [ax + Math.cos(a1) * 12, 10 - Math.sin(a1) * -8 - 8, 0], 1.6, ir); } pkS(ax - 12, -3, ax + 12, 3);   // the anchor
    const wx = w * 0.18; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; beam(T, [wx, 12, 0], [wx + Math.cos(a) * 11, 12 + Math.sin(a) * 11, 0], 0.7, _C(PK_WOOD)); } for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU; beam(T, [wx + Math.cos(a0) * 8, 12 + Math.sin(a0) * 8, 0], [wx + Math.cos(a1) * 8, 12 + Math.sin(a1) * 8, 0], 0.8, _C('#8a6a3a')); } box5(T, wx - 1.4, 0.8, -1.4, wx + 1.4, 12, 1.4, _C(PK_WOOD)); pkS(wx - 2, -2, wx + 2, 2);   // the wheel
    const mx = w * 0.38, mz = -h * 0.3; T.prism(mx, mz, 1, 0.8, 50, _C('#f4f4f6'), 6); box5(T, mx - 10, 40, mz - 0.4, mx + 10, 41, mz + 0.4, _C('#f4f4f6')); for (let k = 0; k < 6; k++) { const y = 38 - k * 5; face(T, [[mx - 9, y, mz + 0.2], [mx - 3, y, mz + 0.2], [mx - 3, y - 4, mz + 0.2], [mx - 9, y - 4, mz + 0.2]], [0, 0, 1], _C(pick(['#e0364f', '#ffd23f', '#2a4aa8', '#f4f4f6']))); } pkS(mx - 1, mz - 1, mx + 1, mz + 1);
    for (let x = -w / 2 + 10; x < w / 2 - 6; x += 22) { T.prism(x, h / 2 - 12, 2.4, 0.8, 7, ir, 8); T.prism(x, h / 2 - 12, 3, 7, 8, ir, 8, 3, true); }   // bollards
    return pkSign(T, s);
  },
  dominoes(T, G, s) {                     // tables under a pergola where the old men play dominoes, a mural on the wall
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#e0d4bc'); const z0 = -h / 2 + 6;
    box5(T, -w / 2 + 6, 0.8, z0, w / 2 - 6, 24, z0 + 3, _C('#f0e8d8')); pkS(-w / 2 + 6, z0, w / 2 - 6, z0 + 3);
    for (let k = 0; k < 6; k++) face(T, [[-w / 2 + 10 + k * (w - 20) / 6, 3, z0 + 3.1], [-w / 2 + 10 + (k + 1) * (w - 20) / 6, 3, z0 + 3.1], [-w / 2 + 10 + (k + 1) * (w - 20) / 6, 21, z0 + 3.1], [-w / 2 + 10 + k * (w - 20) / 6, 21, z0 + 3.1]], [0, 0, 1], _C(pick([c, '#ff7a3d', '#2bf3ff', '#ffd23f', '#3dbf6a', '#ff2bd6'])));   // the mural
    for (let x = -w / 2 + 14; x < w / 2 - 8; x += 22) { T.prism(x, -h * 0.12, 0.8, 0.8, 20, _C('#f4f4f6'), 6); T.prism(x, h * 0.25, 0.8, 0.8, 20, _C('#f4f4f6'), 6); box5(T, x - 1, 20, -h * 0.12, x + 1, 21, h * 0.25, _C('#f4f4f6')); }   // the pergola
    for (let k = 0; k < 4; k++) { const x = -w * 0.3 + k * w * 0.2, z = h * 0.06; box5(T, x - 5, 6, z - 5, x + 5, 7, z + 5, _C('#2a6a4a')); box5(T, x - 1, 0.8, z - 1, x + 1, 6, z + 1, _C(PK_IRON)); for (let d = 0; d < 6; d++) box5(T, x - 3 + d * 1.2, 7, z - 1 + (d % 2), x - 2.2 + d * 1.2, 7.5, z + 0.6 + (d % 2), _C('#f4f4f6'));
      for (const [px, pz] of [[x - 8, z], [x + 8, z], [x, z - 8], [x, z + 8]]) pkPerson(T, px, pz, pick(['#f4f4f6', '#e8d8a8', '#9fb8d8', '#c8a888']), true); pkS(x - 9, z - 9, x + 9, z + 9); }
    return pkSign(T, s);
  },
  pingpong(T, G, s) {                     // concrete ping pong tables with nets, benches, a scoreboard
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#9aa0ab');
    for (const [x, z] of [[-w * 0.25, -h * 0.15], [w * 0.2, -h * 0.15], [-w * 0.25, h * 0.2], [w * 0.2, h * 0.2]]) { box5(T, x - 13, 0.8, z - 7, x + 13, 7.4, z + 7, _C('#5a8a6a')); flat(T, x - 12.6, z - 0.2, x + 12.6, z + 0.2, 7.5, _C('#f4f4f6')); box5(T, x - 0.4, 7.4, z - 7.4, x + 0.4, 9.4, z + 7.4, _C('#2a2d3a')); pkS(x - 13, z - 7, x + 13, z + 7); }
    box5(T, -14, 0.8, -h / 2 + 4, 14, 22, -h / 2 + 6, _C(PK_IRON)); box5(G, -12, 12, -h / 2 + 6, -2, 20, -h / 2 + 6.4, _C(c)); box5(G, 2, 12, -h / 2 + 6, 12, 20, -h / 2 + 6.4, _C('#ffd23f'));
    for (const sx of [-1, 1]) pkBench(T, sx * (w / 2 - 10), 0, false, -sx);
    return pkSign(T, s);
  },
  stage(T, G, s) {                        // a stage with a lighting truss and speakers, a standing area in front
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#5a5d66'); const L = Math.min(w / 2 - 12, 50), z0 = -h / 2 + 6, z1 = z0 + 30;
    box5(T, -L, 0.8, z0, L, 8, z1, _C('#2a2d3a')); box5(T, -L, 8, z0, L, 38, z0 + 2, _C('#1d1d24')); pkS(-L, z0, L, z1);
    for (const sx of [-1, 1]) { beam(T, [sx * L, 8, z1 - 2], [sx * L, 40, z1 - 2], 1.2, _C('#c8ccd4')); box5(T, sx * (L + 4) - 4, 0.8, z1 - 8, sx * (L + 4) + 4, 22, z1, _C('#1d1d24')); disc(G, sx * (L + 4), z1 + 0.1, 2.4, 12, _C('#5a5f69'), 10); }
    beam(T, [-L, 40, z1 - 2], [L, 40, z1 - 2], 1.2, _C('#c8ccd4')); for (let x = -L + 8; x < L - 4; x += 12) box5(G, x - 1.6, 36, z1 - 3.6, x + 1.6, 39, z1 - 0.4, _C(pick([c, '#2bf3ff', '#ffe14a'])));
    return pkSign(T, s);
  },
  hopscotch(T, G, s) {                    // games painted on the ground: hopscotch, four square, snakes and ladders, chalk drawings
    const { w, h, c } = s; pkFloor(T, -w / 2, -h / 2, w / 2, h / 2, '#8a8f9c'); const P = [c, '#ffffff', '#ff7ab6', '#2bf3ff', '#3dffa6'];
    const sq = (x, z, a, col) => { for (const [x0, z0, x1, z1] of [[x - a, z - a, x + a, z - a + 0.8], [x - a, z + a - 0.8, x + a, z + a], [x - a, z - a, x - a + 0.8, z + a], [x + a - 0.8, z - a, x + a, z + a]]) flat(T, x0, z0, x1, z1, 0.9, _C(col)); };
    [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]].forEach(([i, j]) => sq(-w * 0.3 + i * 8, h * 0.3 - j * 8, 4, '#ffffff'));
    sq(0, -h * 0.1, 14, c); flat(T, -14, -h * 0.1 - 0.4, 14, -h * 0.1 + 0.4, 0.9, _C(c)); flat(T, -0.4, -h * 0.1 - 14, 0.4, -h * 0.1 + 14, 0.9, _C(c));   // four square
    const gx = w * 0.18, gz = -h * 0.3; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) flat(T, gx + i * 7, gz + j * 7, gx + i * 7 + 7, gz + j * 7 + 7, 0.88, _C((i + j) % 2 ? '#ffd23f' : '#ff7a3d'));
    beam(T, [gx + 4, 0.95, gz + 3], [gx + 26, 0.95, gz + 24], 0.6, _C('#3dbf6a')); for (let k = 0; k < 4; k++) flat(T, gx + 30, gz + 2 + k * 6, gx + 33, gz + 3 + k * 6, 0.95, _C('#7a5a3a'));
    for (let k = 0; k < 8; k++) { const x = -w * 0.4 + (k * 29) % (w * 0.8), z = -h * 0.4 + (k * 17) % (h * 0.3); disc(T, x, z, 3 + k % 3, 0.86, _C(pick(P)), 10); }   // chalk drawings
    return pkSign(T, s);
  },
});

/* ---------- the courts (about 166 x 100) ---------- */
function pkLines(G, x0, z0, x1, z1, col, t) { t = t || 0.8; for (const [a, b, c2, d] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) flat(G, a, b, c2, d, 0.75, _C(col || '#f4efe6')); }
function pkCage(T, x0, z0, x1, z1, hgt) { pkFence(T, x0, z0, x1, z1, hgt, '#5a6070', 16); }
Object.assign(PK, {
  basketball(T, G, s) {                   // an outdoor court, two hoops
    const L = 75, D = 42, line = _C('#f4efe6'), rim = _C('#ff7a3d'); flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#b24a3a')); flat(T, -L, -D, L, D, 0.6, _C(s.c)); pkLines(G, -L, -D, L, D);
    flat(G, -0.4, -D, 0.4, D, 0.7, line); for (let k = 0; k < 24; k++) { const a0 = k / 24 * TAU, a1 = (k + 1) / 24 * TAU; flat(G, Math.cos(a0) * 12 - 0.4, Math.sin(a0) * 12 - 0.4, Math.cos(a1) * 12 + 0.4, Math.sin(a1) * 12 + 0.4, 0.7, line); }
    for (const sx of [-1, 1]) { pkLines(G, sx * L - (sx > 0 ? 28 : 0), -12, sx * L + (sx < 0 ? 28 : 0), 12); box5(T, sx * (L + 2) - 1.2, 0.6, -1.2, sx * (L + 2) + 1.2, 20, 1.2, _C(PK_IRON)); box5(T, sx * (L - 1) - 0.4, 17, -7, sx * (L - 1) + 0.4, 26, 7, _C('#f4f4f6')); T.prism(sx * (L - 5), 0, 3, 18, 18.6, rim, 10, 3); pkS(sx * (L + 2) - 1.5, -1.5, sx * (L + 2) + 1.5, 1.5); }
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 - 2);
  },
  tennis(T, G, s) {                       // a tennis court, its net, a high fence, the umpire's chair
    const L = 70, D = 34; flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#3f7a5a')); flat(T, -L, -D, L, D, 0.6, _C(s.c)); pkLines(G, -L, -D, L, D); pkLines(G, -L, -D + 7, L, D - 7); pkLines(G, -L * 0.55, -D + 7, L * 0.55, D - 7); flat(G, -L * 0.55, -0.4, L * 0.55, 0.4, 0.75, _C('#f4efe6'));
    box5(T, -0.5, 0.6, -D - 4, 0.5, 5, D + 4, _C('#1d1d24')); box5(T, -0.6, 4.4, -D - 4, 0.6, 5.2, D + 4, _C('#f4f4f6')); pkS(-0.6, -D - 4, 0.6, D + 4);
    box5(T, 2, 0.6, D + 6, 6, 12, D + 10, _C('#2a5a8a')); pkCage(T, -s.w / 2 + 3, -s.h / 2 + 3, s.w / 2 - 3, s.h / 2 - 3, 20);
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 + 3);
  },
  volleyball(T, G, s) {                   // a sand court, its net and a ball, ropes for the lines
    flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#4f8a3f')); box5(T, -64, 0.5, -36, 64, 1.4, 36, _C(s.c)); pkLines(G, -48, -24, 48, 24, '#2a6ae0', 0.7);
    for (const sz of [-1, 1]) { box5(T, -0.8, 1.4, sz * 30 - 0.8, 0.8, 22, sz * 30 + 0.8, _C('#f4f4f6')); pkS(-1, sz * 30 - 1, 1, sz * 30 + 1); } box5(T, -0.3, 15, -30, 0.3, 21, 30, _C('#1d1d24')); box5(T, -0.4, 20.4, -30, 0.4, 21.4, 30, _C('#f4f4f6'));
    T.prism(20, 8, 1.6, 1.4, 4.6, _C('#ffd23f'), 10, 0.4, true);
    for (const x of [-56, 56]) pkBench(T, x, -s.h / 2 + 8, true, 1);
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 - 3);
  },
  handball(T, G, s) {                     // two handball walls back to back, painted lines on concrete
    flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#a8a8b0')); box5(T, -24, 0.5, -2, 24, 32, 2, _C(s.c)); pkS(-24, -2, 24, 2);
    for (const sz of [-1, 1]) { pkLines(G, -24, sz > 0 ? 2 : -38, 24, sz > 0 ? 38 : -2); flat(G, -24, sz * 18 - 0.4, 24, sz * 18 + 0.4, 0.75, _C('#f4efe6')); face(G, [[-24, 9, sz * 2.1], [24, 9, sz * 2.1], [24, 10, sz * 2.1], [-24, 10, sz * 2.1]], [0, 0, sz], _C('#f4efe6')); }
    for (const sx of [-1, 1]) pkBench(T, sx * 62, 0, false, -sx);
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 - 3);
  },
  pickleball(T, G, s) {                   // two small courts side by side, low nets, a fence
    flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#3a5a7a'));
    for (const cx of [-38, 38]) { flat(T, cx - 32, -22, cx + 32, 22, 0.6, _C(s.c)); pkLines(G, cx - 32, -22, cx + 32, 22); flat(G, cx - 0.4, -22, cx + 0.4, 22, 0.7, _C('#f4efe6')); for (const sx of [-1, 1]) flat(G, cx + sx * 9 - 0.4, -22, cx + sx * 9 + 0.4, 22, 0.7, _C('#f4efe6'));
      box5(T, cx - 0.4, 0.6, -25, cx + 0.4, 4, 25, _C('#1d1d24')); pkS(cx - 0.5, -25, cx + 0.5, 25); }
    pkCage(T, -s.w / 2 + 3, -s.h / 2 + 3, s.w / 2 - 3, s.h / 2 - 3, 12);
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 + 3);
  },
  futsal(T, G, s) {                       // a small football pitch with goals, a cage round it
    flat(T, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, 0.5, _C('#3a3d47')); flat(T, -72, -40, 72, 40, 0.6, _C(s.c)); for (let x = -72; x < 72; x += 16) flat(T, x, -40, x + 8, 40, 0.62, _C(shade(s.c, 10))); pkLines(G, -72, -40, 72, 40); flat(G, -0.4, -40, 0.4, 40, 0.75, _C('#f4efe6'));
    for (let k = 0; k < 24; k++) { const a0 = k / 24 * TAU, a1 = (k + 1) / 24 * TAU; flat(G, Math.cos(a0) * 12 - 0.4, Math.sin(a0) * 12 - 0.4, Math.cos(a1) * 12 + 0.4, Math.sin(a1) * 12 + 0.4, 0.75, _C('#f4efe6')); }
    for (const sx of [-1, 1]) { pkLines(G, sx > 0 ? 54 : -72, -16, sx > 0 ? 72 : -54, 16); const gx = sx * 72; box5(T, gx - 0.6, 0.6, -10, gx + 0.6, 12, -8.8, _C('#f4f4f6')); box5(T, gx - 0.6, 0.6, 8.8, gx + 0.6, 12, 10, _C('#f4f4f6')); box5(T, gx - 0.6, 11, -10, gx + 0.6, 12, 10, _C('#f4f4f6')); box5(T, gx + sx * 6 - 0.3, 0.6, -10, gx + sx * 6 + 0.3, 10, 10, _C('#d8dce4')); pkS(Math.min(gx, gx + sx * 6), -10, Math.max(gx, gx + sx * 6), 10); }
    pkCage(T, -s.w / 2 + 2, -s.h / 2 + 2, s.w / 2 - 2, s.h / 2 - 2, 22);
    return pkSign(T, s, s.w / 2 - 28, s.h / 2 + 4);
  },
});

/* ---------- the parks: a lawn's clear rectangle, w x h (anything from about 150 x 120 to 700 x 400) ---------- */
Object.assign(PK, {
  lake(T, G, s) {                         // a lake with an island, a footbridge to it, swan boats, paths and benches round it
    const { w, h, c } = s, R = Math.min(w, h) * 0.36, cx = -w * 0.05, cz = -h * 0.05; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f8a3f'));
    T.prism(cx, cz, R + 8, 0.7, 0.9, _C('#d8d0c0'), 32, R + 8, true); pkPond(T, G, cx, cz, R, '#8a8478', 32);
    const ix = cx + R * 0.3, iz = cz - R * 0.2, ir = R * 0.3; T.prism(ix, iz, ir, 3, 5, _C('#4f8a3f'), 16, ir * 0.9, true); pkTree(T, ix, iz, ir * 0.6, 30);
    const bz0 = iz + ir * 0.8; for (let k = 0; k < 6; k++) { const z = bz0 + k * (cz + R - bz0) / 6, y = 4 + Math.sin(k / 5 * Math.PI) * 3; box5(T, ix - 4, y, z, ix + 4, y + 1, z + (cz + R - bz0) / 6, _C(PK_WOOD)); }   // the footbridge
    for (const [a, col] of [[2.4, '#f4f4f6'], [3.6, c], [4.4, '#f4f4f6']]) { const x = cx + Math.cos(a) * R * 0.6, z = cz + Math.sin(a) * R * 0.6; box5(T, x - 4, 3, z - 3, x + 4, 6, z + 3, _C(col)); beam(T, [x + 3, 6, z], [x + 4, 12, z], 1, _C(col)); box5(T, x + 3.4, 11, z - 0.8, x + 6, 12.4, z + 0.8, _C('#ff9f2e')); }   // swan boats
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3; pkBench(T, cx + Math.cos(a) * (R + 14), cz + Math.sin(a) * (R + 14), Math.abs(Math.sin(a)) > 0.7, Math.abs(Math.sin(a)) > 0.7 ? -Math.sign(Math.sin(a)) : -Math.sign(Math.cos(a))); }
    for (const [x, z] of [[-w / 2 + 16, -h / 2 + 16], [w / 2 - 16, -h / 2 + 16], [w / 2 - 16, h / 2 - 24], [-w / 2 + 16, h / 2 - 24]]) pkTree(T, x, z, 12, 38);
    return pkSign(T, s);
  },
  botanic(T, G, s) {                      // themed beds, a glasshouse, a pond with a fountain, paths between
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f8a3f')); flat(T, -w / 2, -6, w / 2, 6, 0.85, _C('#d8d0c0')); flat(T, -6, -h / 2, 6, h / 2, 0.85, _C('#d8d0c0'));
    const qs = [[-1, -1], [1, -1], [-1, 1], [1, 1]], sets = [[c, '#ff7ab6', '#ffffff'], ['#ffe14a', '#ff7a3d', '#e0364f'], ['#a259ff', '#2bf3ff', '#ffffff'], ['#ff2bd6', '#ffd23f', '#3dffa6']];
    qs.forEach(([sx, sz], i) => { const x0 = sx > 0 ? 12 : -w / 2 + 8, x1 = sx > 0 ? w / 2 - 8 : -12, z0 = sz > 0 ? 12 : -h / 2 + 8, z1 = sz > 0 ? h / 2 - 8 : -12;
      if (i === 1) { const gx = (x0 + x1) / 2, gz = (z0 + z1) / 2, L = Math.min(40, (x1 - x0) / 2 - 4), D = Math.min(24, (z1 - z0) / 2 - 4); box5(T, gx - L, 0.8, gz - D, gx + L, 12, gz + D, _C('#bff6ff')); face(T, [[gx - L, 12, gz - D], [gx + L, 12, gz - D], [gx + L, 22, gz], [gx - L, 22, gz]], [0, 1, -1], _C('#cff6ff')); face(T, [[gx + L, 12, gz + D], [gx - L, 12, gz + D], [gx - L, 22, gz], [gx + L, 22, gz]], [0, 1, 1], _C('#cff6ff')); palm(T, gx, gz, 20); pkS(gx - L, gz - D, gx + L, gz + D); return; }
      if (i === 2) { pkPond(T, G, (x0 + x1) / 2, (z0 + z1) / 2, Math.min(x1 - x0, z1 - z0) * 0.35, PK_STONE, 20); T.prism((x0 + x1) / 2, (z0 + z1) / 2, 0.8, 3, 12, _C('#bff6ff'), 6, 0.2, true); return; }
      for (let z = z0; z < z1 - 6; z += 12) pkBed(T, x0, z, x1, z + 7, sets[i], 3.6); });
    for (const [x, z] of [[-w / 2 + 6, -h / 2 + 6], [w / 2 - 6, h / 2 - 6]]) pkTree(T, x, z, 10, 34);
    return pkSign(T, s, 18 + 24, s.h / 2 - 4);
  },
  fort(T, G, s) {                         // a wooden fort with towers and bridges, a zip line, a climbing net, a sandpit - as big as the lawn allows
    const { w, h, c } = s, k = clamp(Math.min(w, h) / 150, 1, 2), wood = _C('#8a6a48'), dark = _C('#6b4a2e');
    flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f8a3f')); flat(T, -w * 0.38, -h * 0.4, w * 0.38, h * 0.42, 0.75, _C('#c8a878'));
    for (const [x, z] of [[-w / 2 + 14, -h / 2 + 14], [w / 2 - 14, -h / 2 + 14], [-w / 2 + 14, h / 2 - 14]]) pkTree(T, x, z, 10 * k, 32 * k);
    const tower = (x, z, H) => { const q = 6 * k, r = 7 * k;
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box5(T, x + a * (q - 1) - 1, 0.7, z + b * (q - 1) - 1, x + a * (q - 1) + 1, H + 10 * k, z + b * (q - 1) + 1, dark);
      box5(T, x - q, H, z - q, x + q, H + 1.2, z + q, wood); for (const [a, b, p, qq] of [[-q, -q, q, -q + 1], [-q, q - 1, q, q], [-q, -q, -q + 1, q], [q - 1, -q, q, q]]) box5(T, x + a, H + 1.2, z + b, x + p, H + 5, z + qq, wood);
      const top = H + 10 * k, ap = [x, top + 8 * k, z]; uqTri(T, [x - r, top, z - r], [x + r, top, z - r], ap, [0, 1, -1], _C(c)); uqTri(T, [x + r, top, z + r], [x - r, top, z + r], ap, [0, 1, 1], _C(c)); uqTri(T, [x - r, top, z + r], [x - r, top, z - r], ap, [-1, 1, 0], _C(c)); uqTri(T, [x + r, top, z - r], [x + r, top, z + r], ap, [1, 1, 0], _C(c));
      pkS(x - q, z - q, x + q, z + q); };
    const t1 = [-w * 0.25, -h * 0.15], t2 = [w * 0.05, -h * 0.25], t3 = [w * 0.25, h * 0.05], H1 = 16 * k, H2 = 22 * k; tower(...t1, H1); tower(...t2, H2); tower(...t3, H1);
    for (const [a, b, y0, y1] of [[t1, t2, H1, H2], [t2, t3, H2, H1]]) for (let i = 0; i < 10; i++) { const f = (i + 0.5) / 10, x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f, y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 2; box5(T, x - 3, y, z - 3, x + 3, y + 0.8, z + 3, wood); }   // rope bridges
    const zx = -w * 0.32, zz = h * 0.34; box5(T, zx - 1, 0.7, zz - 1, zx + 1, 16, zz + 1, dark); beam(T, [t1[0], H1 + 10 * k, t1[1]], [zx, 15, zz], 0.3, _C('#2a2d3a'));   // the zip line
    const nx = w * 0.3, nz = -h * 0.3; for (let i = 0; i < 6; i++) { beam(T, [nx - 10 + i * 4, 0.7, nz + 6], [nx - 10 + i * 4, 18, nz], 0.3, _C('#d8c8a0')); beam(T, [nx - 10, 3 + i * 3, nz + 6 - i], [nx + 10, 3 + i * 3, nz + 6 - i], 0.3, _C('#d8c8a0')); }   // the climbing net
    box5(T, -w * 0.1, 0.7, h * 0.15, w * 0.12, 1.8, h * 0.35, _C('#a88a5a')); flat(T, -w * 0.1 + 1.4, h * 0.15 + 1.4, w * 0.12 - 1.4, h * 0.35 - 1.4, 1.9, _C('#e8d0a0'));   // the sandpit
    return pkSign(T, s);
  },
  allotments(T, G, s) {                   // vegetable beds in rows, a shed, water butts, a scarecrow, compost bins
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#7a6a4a')); const veg = ['#3f8a3a', '#5aa04a', '#e0364f', '#ff9f2e', '#ffd23f', '#7a3a8a'];
    for (let x = -w / 2 + 10; x < w / 2 - 34; x += 20) for (let z = -h / 2 + 10; z < h / 2 - 16; z += 26) { box5(T, x, 0.7, z, x + 14, 2.4, z + 20, _C(PK_WOOD)); flat(T, x + 1, z + 1, x + 13, z + 19, 2.5, _C('#4a3a26')); const col = veg[((x * 3 + z) >>> 0) % veg.length]; for (let k = 0; k < 6; k++) T.prism(x + 4 + (k % 2) * 6, z + 4 + Math.floor(k / 2) * 6, 2.2, 2.5, 5, _C(col === '#4a3a26' ? '#3f8a3a' : col), 6, 1, true); }
    const sx = w / 2 - 22, sz = -h / 2 + 18; box5(T, sx - 10, 0.7, sz - 8, sx + 10, 14, sz + 8, _C('#5a7a5a')); face(T, [[sx - 11, 14, sz - 9], [sx + 11, 14, sz - 9], [sx + 11, 18, sz], [sx - 11, 18, sz]], [0, 1, -1], _C('#6b4a2e')); face(T, [[sx + 11, 14, sz + 9], [sx - 11, 14, sz + 9], [sx - 11, 18, sz], [sx + 11, 18, sz]], [0, 1, 1], _C('#6b4a2e')); pkS(sx - 10, sz - 8, sx + 10, sz + 8);   // the shed
    for (const z of [sz + 14, sz + 22]) T.prism(sx - 4, z, 3, 0.7, 8, _C('#2a4a3a'), 10, 3, true);
    const cx = w / 2 - 20, cz = h * 0.1; box5(T, cx - 1, 0.7, cz - 1, cx + 1, 20, cz + 1, _C(PK_WOOD)); box5(T, cx - 8, 14, cz - 0.8, cx + 8, 16, cz + 0.8, _C(PK_WOOD)); box5(T, cx - 3, 10, cz - 2, cx + 3, 18, cz + 2, _C(c)); box5(T, cx - 2.4, 18, cz - 2.4, cx + 2.4, 22, cz + 2.4, _C('#e8c870')); T.prism(cx, cz, 4.6, 22, 24, _C('#c8a050'), 8, 1, true);   // a scarecrow
    for (let k = 0; k < 3; k++) box5(T, w / 2 - 30 + k * 9, 0.7, h / 2 - 16, w / 2 - 23 + k * 9, 7, h / 2 - 9, _C('#3a5a2a'));
    return pkSign(T, s, -s.w / 2 + 30, s.h / 2 - 4);
  },
  japanese(T, G, s) {                     // a koi pond with a red arched bridge, a pagoda, stone lanterns, maples and raked gravel
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f8a3f')); const R = Math.min(w, h) * 0.28, px = -w * 0.12, pz = 0;
    disc(T, px + R * 1.8, -h * 0.25, R * 0.6, 0.8, _C('#ece8de'), 20); for (const rr of [R * 0.2, R * 0.35, R * 0.5]) T.prism(px + R * 1.8, -h * 0.25, rr, 0.82, 0.86, _C('#d8d2c4'), 20, rr, true);
    pkPond(T, G, px, pz, R, '#6b6a60', 26); for (let k = 0; k < 7; k++) { const a = k * 1.7, r = R * 0.55; box5(T, px + Math.cos(a) * r - 2, 3.1, pz + Math.sin(a) * r - 1, px + Math.cos(a) * r + 2, 3.4, pz + Math.sin(a) * r + 1, _C(k % 2 ? '#ff7a3d' : '#f4f4f6')); }   // koi
    for (let k = 0; k < 10; k++) { const a0 = k / 10 * Math.PI, a1 = (k + 1) / 10 * Math.PI, P = (a, y) => [px + Math.cos(a) * (R + 4), y, pz]; box5(T, Math.min(P(a0)[0], P(a1)[0]), 3 + Math.sin(a0) * 8, pz - 4, Math.max(P(a0)[0], P(a1)[0]), 4.2 + Math.sin(a0) * 8, pz + 4, _C(c)); }   // the red bridge
    const gx = w * 0.3, gz = h * 0.15; for (let k = 0; k < 3; k++) { const s2 = 12 - k * 3, y = 0.7 + k * 12; box5(T, gx - s2 * 0.7, y, gz - s2 * 0.7, gx + s2 * 0.7, y + 9, gz + s2 * 0.7, _C('#5a2a1a')); T.prism(gx, gz, s2 * 1.5, y + 9, y + 12, _C('#2a2d3a'), 4, s2 * 0.7); } T.prism(gx, gz, 0.6, 36.7, 46, _C('#c9a24a'), 6, 0.2, true); pkS(gx - 9, gz - 9, gx + 9, gz + 9);   // the pagoda
    for (const [x, z] of [[-w * 0.4, -h * 0.3], [w * 0.1, h * 0.35], [-w * 0.35, h * 0.3]]) { box5(T, x - 2, 0.7, z - 2, x + 2, 8, z + 2, _C('#9a9890')); box5(G, x - 1.4, 8, z - 1.6, x + 1.4, 10.4, z + 1.6, _C('#ffd98a')); T.prism(x, z, 4.4, 10.4, 12.6, _C('#8a8880'), 4, 0.5, true); pkS(x - 2, z - 2, x + 2, z + 2); }
    for (const [x, z] of [[w * 0.42, -h * 0.35], [-w * 0.42, 0], [w * 0.15, -h * 0.4]]) pkTree(T, x, z, 10, 28, '#c8402a');
    return pkSign(T, s);
  },
  ballfield(T, G, s) {                    // a baseball diamond: bases, a backstop, dugouts, bleachers
    const { w, h, c } = s, S = Math.min(w, h) * 0.7, hx = 0, hz = h / 2 - 20; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f9a42'));
    for (let k = 0; k < 12; k++) { const a0 = -Math.PI * 0.75 + k / 12 * Math.PI / 2, a1 = -Math.PI * 0.75 + (k + 1) / 12 * Math.PI / 2; uqTri(T, [hx, 0.8, hz], [hx + Math.cos(a0) * S * 0.62, 0.8, hz + Math.sin(a0) * S * 0.62], [hx + Math.cos(a1) * S * 0.62, 0.8, hz + Math.sin(a1) * S * 0.62], [0, 1, 0], _C(c)); }   // the infield dirt
    const b = S * 0.32, P = [[hx, hz], [hx + b * 0.707, hz - b * 0.707], [hx, hz - b * 1.414], [hx - b * 0.707, hz - b * 0.707]];
    for (let k = 0; k < 4; k++) { const [x0, z0] = P[k], [x1, z1] = P[(k + 1) % 4]; beam(T, [x0, 0.9, z0], [x1, 0.9, z1], 0.5, _C('#f4f4f6')); box5(T, x0 - 1.6, 0.8, z0 - 1.6, x0 + 1.6, 1.6, z0 + 1.6, _C('#f4f4f6')); }
    disc(T, hx, hz - b * 0.707, 4, 1.2, _C('#c9865a'), 12);   // the mound
    for (let k = 0; k < 7; k++) { const a = Math.PI / 2 + (k - 3) * 0.22; box5(T, hx + Math.cos(a) * 14 - 2, 0.8, hz + Math.sin(a) * 14 - 0.4, hx + Math.cos(a) * 14 + 2, 20, hz + Math.sin(a) * 14 + 0.4, _C('#5a6070')); }   // the backstop
    for (const sx of [-1, 1]) { const dx = hx + sx * S * 0.36, dz = hz - 4; box5(T, dx - 10, 0.8, dz - 3, dx + 10, 8, dz + 3, _C('#2a4aa8')); pkS(dx - 10, dz - 3, dx + 10, dz + 3); for (let r = 0; r < 4; r++) box5(T, dx - 12, 0.8 + r * 2.4, dz + 6 + r * 3, dx + 12, 3.2 + r * 2.4, dz + 9 + r * 3, _C('#c8ccd4')); pkS(dx - 12, dz + 6, dx + 12, dz + 18); }   // dugouts and bleachers
    return pkSign(T, s, s.w / 2 - 30, s.h / 2 - 4);
  },
  meadow(T, G, s) {                       // long grass full of wild flowers, a mown path through it, beehives, a bench
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#5a8a3a')); const F = [c, '#ffffff', '#a259ff', '#ff4d4d', '#2a8ae0'];
    for (let k = 0; k < 9; k++) { const z = -h / 2 + (k + 0.5) * h / 9; face(T, [[-w / 2 + 4, 0.75, z - 4 + Math.sin(k) * 3], [w / 2 - 4, 0.75, z - 4 + Math.cos(k) * 3], [w / 2 - 4, 0.75, z + 4 + Math.cos(k) * 3], [-w / 2 + 4, 0.75, z + 4 + Math.sin(k) * 3]], [0, 1, 0], _C(k % 2 ? '#6a9a42' : '#5a8a3a')); }
    for (let k = 0; k < Math.min(220, w * h / 260); k++) { const x = -w / 2 + 4 + Math.random() * (w - 8), z = -h / 2 + 4 + Math.random() * (h - 8); if (Math.abs(x - Math.sin(z / 40) * 30) < 6) continue; T.prism(x, z, 0.3, 0.7, 4 + Math.random() * 3, _C('#4a7a2a'), 3); box5(T, x - 0.9, 4 + Math.random() * 3, z - 0.9, x + 0.9, 7.6, z + 0.9, _C(pick(F))); }
    for (let z = -h / 2; z < h / 2; z += 6) { const x = Math.sin(z / 40) * 30; flat(T, x - 4, z, x + 4, z + 6.2, 0.8, _C('#8aaa5a')); }   // the mown path
    for (let k = 0; k < 3; k++) { const x = w * 0.3 + k * 9, z = -h * 0.3; box5(T, x - 3, 0.7, z - 3, x + 3, 3, z + 3, _C('#6b4a2e')); box5(T, x - 3.4, 3, z - 3.4, x + 3.4, 9, z + 3.4, _C('#f4f0e0')); box5(T, x - 3.8, 9, z - 3.8, x + 3.8, 10.4, z + 3.8, _C('#c9a24a')); pkS(x - 3, z - 3, x + 3, z + 3); }   // beehives
    pkBench(T, Math.sin(0) * 30 + 12, 0, false, -1);
    return pkSign(T, s);
  },
  orchard(T, G, s) {                      // rows of mango trees with fruit, a farm stand, crates
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#5a8a3a'));
    for (let x = -w / 2 + 16; x < w / 2 - 14; x += 26) for (let z = -h / 2 + 16; z < h / 2 - 30; z += 26) { pkTree(T, x, z, 9, 24, '#2f7a3a'); for (let k = 0; k < 5; k++) { const a = k * 1.3; box5(T, x + Math.cos(a) * 7 - 1, 11 + (k % 3) * 3, z + Math.sin(a) * 7 - 1, x + Math.cos(a) * 7 + 1, 13 + (k % 3) * 3, z + Math.sin(a) * 7 + 1, _C(c)); } }
    const fx = 0, fz = h / 2 - 16; box5(T, fx - 16, 0.7, fz - 6, fx + 16, 7, fz + 6, _C(PK_WOOD)); for (const sx of [-1, 1]) T.prism(fx + sx * 15, fz - 5, 0.6, 0.7, 16, _C(PK_WOOD), 6); face(T, [[fx - 18, 16, fz - 8], [fx + 18, 16, fz - 8], [fx + 18, 13, fz + 8], [fx - 18, 13, fz + 8]], [0, 1, 0.2], _C('#e0364f')); for (let k = 0; k < 6; k++) box5(T, fx - 14 + k * 5, 7, fz - 4, fx - 10 + k * 5, 9.4, fz + 4, _C(k % 2 ? c : '#ffd23f')); pkS(fx - 16, fz - 6, fx + 16, fz + 6);   // the farm stand
    for (let k = 0; k < 5; k++) box5(T, fx + 22 + (k % 2) * 7, 0.7 + Math.floor(k / 2) * 5, fz - 3, fx + 28 + (k % 2) * 7, 5.7 + Math.floor(k / 2) * 5, fz + 3, _C(PK_WOOD));
    return pkSign(T, s, -s.w / 2 + 30, s.h / 2 - 4);
  },
  bmx(T, G, s) {                          // a dirt track of jumps and berms with a start ramp
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#5a8a3a')); const dirt = _C('#a87a4a'), L = w / 2 - 20, D = h / 2 - 22;
    for (const z of [-D * 0.6, 0, D * 0.6]) { flat(T, -L, z - 8, L, z + 8, 0.8, dirt); for (let x = -L + 24; x < L - 20; x += 34) { face(T, [[x - 8, 0.8, z - 8], [x - 8, 0.8, z + 8], [x, 7, z + 8], [x, 7, z - 8]], [-0.6, 1, 0], _C('#b88a5a')); face(T, [[x, 7, z - 8], [x, 7, z + 8], [x + 8, 0.8, z + 8], [x + 8, 0.8, z - 8]], [0.6, 1, 0], _C('#98703a')); } }
    for (const [sx, z0, z1] of [[1, -D * 0.6, 0], [-1, 0, D * 0.6]]) for (let k = 0; k < 8; k++) { const a0 = -Math.PI / 2 + k / 8 * Math.PI, a1 = -Math.PI / 2 + (k + 1) / 8 * Math.PI, r = (z1 - z0) / 2, cz = (z0 + z1) / 2, cx = sx * L; face(T, [[cx + sx * Math.cos(a0) * (r - 8), 0.8, cz + Math.sin(a0) * (r - 8)], [cx + sx * Math.cos(a1) * (r - 8), 0.8, cz + Math.sin(a1) * (r - 8)], [cx + sx * Math.cos(a1) * (r + 8), 4, cz + Math.sin(a1) * (r + 8)], [cx + sx * Math.cos(a0) * (r + 8), 4, cz + Math.sin(a0) * (r + 8)]], [0, 1, 0], dirt); }   // berms
    box5(T, -L - 4, 0.8, D * 0.6 - 10, -L + 16, 14, D * 0.6 + 10, _C('#8a8f9c')); face(T, [[-L + 16, 14, D * 0.6 - 8], [-L + 16, 14, D * 0.6 + 8], [-L + 40, 0.8, D * 0.6 + 8], [-L + 40, 0.8, D * 0.6 - 8]], [0.5, 1, 0], _C(c)); pkS(-L - 4, D * 0.6 - 10, -L + 16, D * 0.6 + 10);   // the start ramp
    return pkSign(T, s);
  },
  lookout(T, G, s) {                      // a grassy hill with a wooden lookout tower, a winding path up, benches at the top
    const { w, h, c } = s; flat(T, -w / 2, -h / 2, w / 2, h / 2, 0.7, _C('#4f8a3f')); const R = Math.min(w, h) * 0.42;
    for (let k = 0; k < 5; k++) T.prism(0, 0, R * (1 - k * 0.18), 0.7 + k * 4, 4.7 + k * 4, _C(k % 2 ? '#4f8a3f' : '#5a9a48'), 20, R * (1 - (k + 1) * 0.18), k === 4);
    const top = 20.7; for (let k = 0; k < 40; k++) { const a = k * 0.32, r = R * (1 - k / 44), y = 0.8 + k / 40 * (top - 0.8); flat(T, Math.cos(a) * r - 2, Math.sin(a) * r - 2, Math.cos(a) * r + 2, Math.sin(a) * r + 2, y + 0.4, _C('#c8b08a')); }   // the path up
    for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) box5(T, a - 1, top, b - 1, a + 1, top + 40, b + 1, _C('#6b4a2e')); for (const y of [top + 14, top + 28]) box5(T, -7, y, -7, 7, y + 1.2, 7, _C('#8a6a48')); box5(T, -8, top + 40, -8, 8, top + 41.2, 8, _C('#8a6a48'));
    for (const [a, b, p, q] of [[-8, -8, 8, -7], [-8, 7, 8, 8], [-8, -8, -7, 8], [7, -8, 8, 8]]) box5(T, a, top + 41.2, b, p, top + 45, q, _C('#8a6a48')); uqTri(T, [-9, top + 52, -9], [9, top + 52, -9], [0, top + 60, 0], [0, 1, -1], _C(c)); uqTri(T, [9, top + 52, 9], [-9, top + 52, 9], [0, top + 60, 0], [0, 1, 1], _C(c)); uqTri(T, [-9, top + 52, 9], [-9, top + 52, -9], [0, top + 60, 0], [-1, 1, 0], _C(c)); uqTri(T, [9, top + 52, -9], [9, top + 52, 9], [0, top + 60, 0], [1, 1, 0], _C(c));
    for (const [a, b] of [[-7, 7], [7, 7], [-7, -7], [7, -7]]) box5(T, a - 0.6, top + 45, b - 0.6, a + 0.6, top + 52, b + 0.6, _C('#6b4a2e')); pkS(-8, -8, 8, 8);
    for (const a of [1.2, 1.9]) pkBench(T, Math.cos(a) * (R + 8), Math.sin(a) * (R + 8), true, -1);   // benches at the foot of the hill
    for (const [x, z] of [[-w / 2 + 14, -h / 2 + 14], [w / 2 - 14, -h / 2 + 14]]) pkTree(T, x, z, 12, 36);
    return pkSign(T, s);
  },
});

/* ---------- where they go ---------- */
const PK_COURTS = ['basketball', 'tennis', 'volleyball', 'handball', 'pickleball', 'futsal'], PK_PARKS = ['lake', 'botanic', 'fort', 'allotments', 'japanese', 'ballfield', 'meadow', 'orchard', 'bmx', 'lookout'];
const pkSiteOf = k => PK_COURTS.includes(k) ? 'court' : PK_PARKS.includes(k) ? 'park' : 'plaza';
let PARKS_AT = [], PK_PLAN = null;        // the places as built: { row, x, y, a, w, h, site }; the plazas' and courts' rows by prop
function pkMesh(kind, s) { const T = new GeoBuilder(), G = new GeoBuilder(), post = (PK[kind] || PK.fountain)(T, G, s), m = lmMesh(T, G); if (post) post(m); return m; }
function pkPlace(row, x, y, a, w, h, site, clear) {      // measure the design's solids, register them, stream the model
  const s = { w, h, c: row.c, name: row.name, ry: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) }, seed = 9301 + Math.round(x * 3 + y);   // ry: the sign's quarter turn that faces the camera
  PK_S = []; withSeed(seed, () => (PK[row.kind] || PK.fountain)(new GeoBuilder(), new GeoBuilder(), s)); const S = PK_S; PK_S = null;
  const ca = Math.cos(a), sa = Math.sin(a);
  for (const [x0, z0, x1, z1, soft] of S) { const lx = (x0 + x1) / 2, lz = (z0 + z1) / 2; makeSolid(x + ca * lx - sa * lz, y + sa * lx + ca * lz, Math.max(1, x1 - x0), Math.max(1, z1 - z0), a, soft ? { soft: true } : {}); }
  LMS.push({ cx: x, cy: y, a, rad: Math.hypot(w, h) / 2 + 40, make: () => withSeed(seed, () => pkMesh(row.kind, s)), mesh: null }); LM_CLEAR.push(clear);
  PARKS_AT.push({ row, x, y, a, w, h, site });
}
function pkProp(p, a, w, h, ex, ey) {     // js/10b genLandmarks: a plaza or a court of the map takes its row of the table (false: none, the old model stays)
  if (typeof PARKS_TABLE === 'undefined') return false;
  if (!PK_PLAN) {
    PK_PLAN = new Map(); PARKS_AT = PARKS_AT.filter(q => q.site === 'park');
    for (const site of ['plaza', 'court']) {
      const props = MAP.props.filter(q => q.t === site && !hitsColony(q.x, q.y, q.w || 166, q.h || 100, q.a)), rows = PARKS_TABLE.places.filter(r => pkSiteOf(r.kind) === site);
      withSeed(site === 'plaza' ? 4471 : 4472, () => { for (let i = props.length - 1; i > 0; i--) { const j = randi(0, i); [props[i], props[j]] = [props[j], props[i]]; } });
      props.forEach((q, i) => { if (rows[i]) PK_PLAN.set(q, rows[i]); });
    }
  }
  const row = PK_PLAN.get(p); if (!row) return false;
  pkPlace(row, p.x, p.y, a, w, h, p.t, [p.x, p.y, ex - 20, ey - 20]); return true;
}
function genParks() {                     // js/04 genWorld, after the unique buildings: the parks take the biggest clear rectangles of the lawns
  PK_PLAN = null; PARKS_AT = PARKS_AT.filter(q => q.site !== 'park'); if (typeof PARKS_TABLE === 'undefined') return;
  const rows = PARKS_TABLE.places.filter(r => pkSiteOf(r.kind) === 'park'); if (!rows.length) return;
  const min = PARKS.parkMin * 12, far = PARKS.parkSpacing * 12, C = 30, cand = [];
  for (const g of MAP.grass) {
    if (g.k === 'wood') continue;                                   // the woods by the Sandbar strip (map remodel 9)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 - x0 < min || y1 - y0 < min || Math.max(x1 - x0, y1 - y0) > 1000) continue;   // golf links and the big landmark parks keep their own look
    const nx = Math.floor((x1 - x0) / C), ny = Math.floor((y1 - y0) / C), ok = [];
    for (let j = 0; j < ny; j++) { ok.push([]); for (let i = 0; i < nx; i++) { const x = x0 + (i + 0.5) * C, y = y0 + (j + 0.5) * C; ok[j].push(inPoly(x, y, g) && !nearestRoad(x, y, ROAD_HALF + SW_W + 8) && !inLandmark(x, y) && shoreDist(x, y) > 20 && !pedBlocked(x, y)); } }
    let best = null; const hgt = new Array(nx).fill(0);                               // the biggest rectangle of clear cells (not too long and thin)
    for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) hgt[i] = ok[j][i] ? hgt[i] + 1 : 0;
      for (let i = 0; i < nx; i++) { let mh = 1e9; for (let k = i; k < nx && hgt[k] > 0; k++) { mh = Math.min(mh, hgt[k]); const W = (k - i + 1) * C, H = mh * C; if (W < min || H < min || Math.max(W, H) > 2.6 * Math.min(W, H)) continue; if (!best || W * H > best.W * best.H) best = { W, H, x: x0 + (i + (k - i + 1) / 2) * C, y: y0 + (j + 1 - mh / 2) * C }; } } }
    if (best) cand.push(best);
  }
  cand.sort((p, q) => q.W * q.H - p.W * p.H || p.x - q.x);
  const used = [];
  for (const c of cand) {
    if (used.length >= rows.length) break;
    if (used.some(u => dist(u.x, u.y, c.x, c.y) < far) || UNIQUES.some(U => dist(U.r.cx, U.r.cy, c.x, c.y) < Math.max(c.W, c.H) / 2 + 60)) continue;
    let door = null;                                                                  // it faces the nearest street (not one to the north if it can help it)
    for (const [fx, fy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const half = fx ? c.W / 2 : c.H / 2, rd = nearestRoad(c.x + fx * (half + 20), c.y + fy * (half + 20), 500); if (!rd) continue; const d = rd.d + (fy < -0.5 ? 250 : 0); if (!door || d < door.d) door = { fx, fy, d }; }
    const fx = door ? door.fx : 0, fy = door ? door.fy : 1, a = Math.atan2(-fx, fy), w = fx ? c.H : c.W, h = fx ? c.W : c.H;
    used.push(c); pkPlace(rows[used.length - 1], c.x, c.y, a, w, h, 'park', [c.x, c.y, c.W / 2, c.H / 2]);
  }
}
