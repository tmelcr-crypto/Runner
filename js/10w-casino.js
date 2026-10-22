'use strict';
/* ---------- 7x. THE CASINO STRIP: the ROYAL FLAMINGO and THE PULSE (map remodel 15: MAP.casino; the runtime: js/08zu) ----------
   The block at the north end of the Sunstrip beach avenue holds two buildings, both of the top-down kind inside (their roofs and street
   walls turn see-through while you are in, like the Pay 'n' Spray):
   - the ROYAL FLAMINGO casino on the avenue side: cream walls with gold trim, a pink neon flamingo on the roof (it kicks a leg), the name in
     gold over the south edge and on the bulb-lit canopy over its door to the avenue. Inside, a red carpet with gold lines, a row of slot
     machines along the north and the south wall, two dice tables with their croupiers, the cashier's cage on the west wall (a counter with
     gold bars; the cashier behind it), velvet ropes and plants by the door.
   - THE PULSE nightclub beside it, its door to the south street: dark walls striped with neon, the name and a neon heartbeat line over
     the door, a velvet rope along the sidewalk for the queue. Inside, a dance floor of lit tiles, the DJ on a booth between speaker
     stacks, a bar with shelves of bottles along the west wall, sofas along the east, a light rig with moving spots and a mirror ball.
   - the bars and small clubs: the beachfront row across the avenue keeps its buildings, each with a neon blade sign, a neon band and a
     lit door (the ones that are not already something else - a unique building, a shop).
   Solid: the walls (the doors are open, or shut by the bouncers - js/08zu), bollards in the doorways, the slot rows, the tables, the
   cage, the DJ booth, the bar, the sofas. Modes: casino, club. */
const CASM = MAP.casino || null;
const CZ = { lm: null, clm: null, slm: null, door: null, cdoor: null, slots: [], tables: [], cage: null, djs: null, bar: null, floor: null, bars: [], view: null, cview: null };
const BAR_NAMES = ['TIKI TIKI', 'CLUB 84', 'NEON RAIN', 'VELVET ROOM', 'PALM LOUNGE', 'MIAMI NIGHTS', 'COCO BAR', 'DISCO INFERNO', 'SUNSET SALOON', 'BLUE MOON', 'STARDUST', 'LAST CALL'];
const BAR_COLS = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff'];
const rectOf = r => ({ x0: r[0], y0: r[1], x1: r[2], y1: r[3], cx: (r[0] + r[2]) / 2, cy: (r[1] + r[3]) / 2 });
const casHall = () => rectOf(CASM.hall), casClub = () => rectOf(CASM.club);
function inCasino(x, y, m) { if (!CASM) return false; const H = casHall(), k = m || 0; return x > H.x0 + k && x < H.x1 - k && y > H.y0 + k && y < H.y1 - k; }
function inClub(x, y, m) { if (!CASM) return false; const H = casClub(), k = m || 0; return x > H.x0 + k && x < H.x1 - k && y > H.y0 + k && y < H.y1 - k; }
function casLayout() {                    // where everything stands inside, in world units (js/08zu uses it too)
  const H = casHall(), C = casClub(), cy = CASM.door[1];
  const slots = []; for (let i = 0; i < 13; i++) { const x = H.x0 + 104 + i * 22; slots.push({ x, y: H.y0 + 11, f: 1 }, { x, y: H.y1 - 11, f: -1 }); }   // f: the way it faces (+1 south)
  return {
    slots, slotRows: [[H.x0 + 92, H.y0 + 4, H.x0 + 92 + 13 * 22, H.y0 + 18], [H.x0 + 92, H.y1 - 18, H.x0 + 92 + 13 * 22, H.y1 - 4]],
    tables: [{ x: H.x0 + 180, y: cy - 76, w: 96, d: 48, f: 1 }, { x: H.x0 + 180, y: cy + 76, w: 96, d: 48, f: -1 }],   // f: the side you play from (+1 south)
    cage: { x0: H.x0 + 4, y0: cy - 50, x1: H.x0 + 64, y1: cy + 50, win: { x: H.x0 + 82, y: cy }, cashier: { x: H.x0 + 34, y: cy } },
    dj: { x0: C.cx - 68, y0: C.y0 + 4, x1: C.cx + 68, y1: C.y0 + 60, at: { x: C.cx, y: C.y0 + 26 } },
    bar: { x0: C.x0 + 4, y0: C.y0 + 90, x1: C.x0 + 54, y1: C.y1 - 54, at: { x: C.x0 + 24, y: C.cy + 20 } },
    floor: { x0: C.x0 + 98, y0: C.y0 + 84, x1: C.x0 + 288, y1: C.y0 + 254 },
    sofas: [[C.x1 - 34, C.y0 + 64, C.x1 - 6, C.y0 + 154], [C.x1 - 34, C.y0 + 184, C.x1 - 6, C.y0 + 274]]
  };
}
function genCasino() {                    // js/04 genWorld: walls, doors, bollards, the furniture's solids, the drawables
  CZ.bars = []; if (!CASM) return;
  const H = casHall(), C = casClub(), L = casLayout(), wt = 4;
  const solid = (x0, y0, x1, y1, o) => makeSolid((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, x1 - x0), Math.max(1, y1 - y0), 0, o || {});
  const walls = (R, gaps) => {            // a building's four walls; gaps: { s|n|e|w: [middle, width] }
    const side = (horiz, at, a0, a1, g) => { const seg = (p, q) => q - p > 0.5 && (horiz ? solid(p, at - wt / 2, q, at + wt / 2) : solid(at - wt / 2, p, at + wt / 2, q));
      if (g) { seg(a0, g[0] - g[1] / 2); seg(g[0] + g[1] / 2, a1); } else seg(a0, a1); };
    side(true, R.y0, R.x0, R.x1, gaps.n); side(true, R.y1, R.x0, R.x1, gaps.s); side(false, R.x0, R.y0, R.y1, gaps.w); side(false, R.x1, R.y0, R.y1, gaps.e);
  };
  const [, dy, dw] = CASM.door, [cdx, , cdw] = CASM.cdoor;
  walls(H, { e: [dy, dw] }); walls(C, { s: [cdx, cdw] });
  CZ.door = solid(H.x1 - 3, dy - dw / 2, H.x1 + 3, dy + dw / 2, { cdoor: 'casino' }); CZ.door.off = true;   // the bouncers' doors: shut to you when they turn you away (js/08zu)
  CZ.cdoor = solid(cdx - cdw / 2, C.y1 - 3, cdx + cdw / 2, C.y1 + 3, { cdoor: 'club' }); CZ.cdoor.off = true;
  for (const s of [-1, 1]) { solid(H.x1 - 3, dy + s * 11 - 3, H.x1 + 3, dy + s * 11 + 3); solid(cdx + s * 11 - 3, C.y1 - 3, cdx + s * 11 + 3, C.y1 + 3); }   // bollards: people pass between them, cars do not
  for (const r of L.slotRows) solid(r[0], r[1], r[2], r[3]);
  for (const t of L.tables) solid(t.x - t.w / 2, t.y - t.d / 2, t.x + t.w / 2, t.y + t.d / 2);
  const G = L.cage; solid(G.x1 - 6, G.y0, G.x1, G.y1); solid(H.x0, G.y0 - 4, G.x1, G.y0); solid(H.x0, G.y1, G.x1, G.y1 + 4);   // the cage: a counter, its two ends to the wall
  const D = L.dj; solid(D.x0, D.y0, D.x0 + 20, D.y1); solid(D.x1 - 20, D.y0, D.x1, D.y1); solid(D.x0 + 20, D.y1 - 12, D.x1 - 20, D.y1);   // speaker stacks, the booth
  const B = L.bar; solid(B.x1 - 10, B.y0, B.x1, B.y1); solid(C.x0, B.y0 - 4, B.x1, B.y0); solid(C.x0, B.y1, B.x1, B.y1 + 4);
  for (const s of L.sofas) solid(s[0], s[1], s[2], s[3]);
  CZ.slots = L.slots; CZ.tables = L.tables; CZ.cage = L.cage; CZ.djs = L.dj; CZ.bar = L.bar; CZ.floor = L.floor;
  const [bx0, by0, bx1, by1] = CASM.block;
  LM_CLEAR.push([(bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) / 2 + 4, (by1 - by0) / 2 + 4]);
  LMS.push(CZ.lm = { cx: H.cx, cy: H.cy, a: 0, rad: Math.hypot(H.x1 - H.x0, H.y1 - H.y0) / 2 + 160, make: () => withSeed(8151, makeCasino), mesh: null });
  LMS.push(CZ.clm = { cx: C.cx, cy: C.cy, a: 0, rad: Math.hypot(C.x1 - C.x0, C.y1 - C.y0) / 2 + 120, make: () => withSeed(8152, makeClub), mesh: null });
  LMS.push(CZ.slm = { cx: 12554, cy: 6980, a: 0, rad: 1000, make: () => withSeed(8153, makeStrip), mesh: null });
  withSeed(8154, casinoPosts);                                       // the people (js/08zu)
}

/* ---------- drawing helpers ---------- */
function neonLine(gb, pts, z, w, col) {   // a neon tube along a polyline [x, y] in a vertical plane at z, facing south (+z)
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l * w / 2, ny = (bx - ax) / l * w / 2;
    face(gb, [[ax + nx, ay + ny, z], [bx + nx, by + ny, z], [bx - nx, by - ny, z], [ax - nx, ay - ny, z]], [0, 0, 1], col);
  }
}
function flatLine(gb, pts, y, w, col) {   // a neon tube lying flat along a polyline [x, z] at height y (read from above)
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l * w / 2, nz = (bx - ax) / l * w / 2;
    face(gb, [[ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz]], [0, 1, 0], col);
  }
}
function roofSign(text, col, w, h, x, y, z) { const s = signMesh(text, col, w, h); s.rotation.x = -Math.PI / 2; s.position.set(x, y, z); return s; }   // lying on a roof, its top to the north
const fadeMats = () => [xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true })];

/* ---------- the ROYAL FLAMINGO ---------- */
function makeCasino() {
  const H = casHall(), L = casLayout(), T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), X = x => x - H.cx, Z = y => y - H.cy, sub = [];
  const cream = _C('#f4ead8'), gold = _C('#d4a52a'), pink = _C('#ff5fa2'), neon = _C('#ff3fb4'), dark = _C('#241826'), wood = _C('#4a2a1a'), HH = 60;
  const x0 = X(H.x0), x1 = X(H.x1), z0 = Z(H.y0), z1 = Z(H.y1), [, dy, dw] = CASM.door, dz0 = Z(dy - dw / 2), dz1 = Z(dy + dw / 2);
  // the floor: red carpet, gold lines, marble by the door, a medallion
  flat(T, x0, z0, x1, z1, 0.9, _C('#7a1230'));
  for (let x = H.x0 + 30; x < H.x1; x += 30) flat(T, X(x) - 0.5, z0, X(x) + 0.5, z1, 0.95, _C('#a8323f'));
  for (let y = H.y0 + 30; y < H.y1; y += 30) flat(T, x0, Z(y) - 0.5, x1, Z(y) + 0.5, 0.95, _C('#a8323f'));
  flat(T, X(H.x1 - 74), dz0 - 20, x1, dz1 + 20, 1, _C('#efe6da')); disc(T, X(H.x1 - 110), Z(dy), 26, 1.05, gold, 24); disc(T, X(H.x1 - 110), Z(dy), 20, 1.1, _C('#7a1230'), 24);
  // the walls: cream, a pink base, gold trim, a pink neon band (the south wall and the roof fade while you are inside: R)
  const wallZ = (gb, z, xa, xb) => { box5(gb, X(xa), 0, z - 2, X(xb), HH, z + 2, cream); box5(gb, X(xa), 0, z - 2.4, X(xb), 6, z + 2.4, pink); box5(gb, X(xa), HH - 6, z - 2.6, X(xb), HH, z + 2.6, gold); };
  const wallX = (gb, x, za, zb) => { box5(gb, x - 2, 0, za, x + 2, HH, zb, cream); box5(gb, x - 2.4, 0, za, x + 2.4, 6, zb, pink); box5(gb, x - 2.6, HH - 6, za, x + 2.6, HH, zb, gold); };
  wallZ(T, z0, H.x0, H.x1); wallX(T, x0, z0, z1); wallX(T, x1, z0, dz0); wallX(T, x1, dz1, z1); box5(T, x1 - 2, 40, dz0, x1 + 2, HH, dz1, cream);
  wallZ(R, z1, H.x0, H.x1); box5(RG, x0, 30, z1 + 2.6, x1, 32, z1 + 3.2, neon);
  box5(G, x1 + 2.6, 30, z0, x1 + 3.2, 32, dz0, neon); box5(G, x1 + 2.6, 30, dz1, x1 + 3.2, 32, z1, neon);
  for (let z = z0 + 30; z < z1 - 10; z += 50) if (z < dz0 - 8 || z > dz1 + 8) box5(G, x1 + 2.6, 6, z - 1, x1 + 3.4, 28, z + 1, neon);   // pilasters of neon along the avenue
  // the door: gold frame, a red carpet out to the kerb, a canopy of bulbs, the name over it
  box5(T, x1 - 3, 0, dz0 - 3, x1 + 3, 40, dz0, gold); box5(T, x1 - 3, 0, dz1, x1 + 3, 40, dz1 + 3, gold); box5(T, x1 - 3, 37, dz0, x1 + 3, 40, dz1, gold);
  flat(T, x1, dz0 + 6, x1 + 28, dz1 - 6, 1.2, _C('#b3122a'));
  box5(T, x1, 36, dz0 - 10, x1 + 30, 40, dz1 + 10, _C('#2a1a2a')); box5(G, x1 + 29, 36, dz0 - 10, x1 + 30.5, 40, dz1 + 10, gold);
  for (let z = dz0 - 8; z <= dz1 + 8; z += 6) box5(G, x1 + 30, 34.5, z - 0.8, x1 + 31.6, 36, z + 0.8, _C('#fff4c2'));
  for (let x = x1 + 4; x <= x1 + 28; x += 6) for (const z of [dz0 - 10, dz1 + 10]) box5(G, x - 0.8, 34.5, z - 0.8, x + 0.8, 36, z + 0.8, _C('#fff4c2'));
  for (const s of [-1, 1]) { const z = Z(dy) + s * (dw / 2 + 18); T.prism(x1 + 22, z, 6, 0, 8, _C('#e8e4dc'), 10, 5, true); T.prism(x1 + 22, z, 8, 8, 20, _C('#2f8f4e'), 9, 2, true); }   // potted palms
  for (const s of [-1, 1]) T.prism(x1, Z(dy) + s * 11, 2.6, 0, 9, gold, 8, 2.6, true);
  const cs = fasciaSign('ROYAL FLAMINGO', '#ffd23f', 76, 12); cs.position.set(x1 + 31, 44, Z(dy)); cs.rotation.y = Math.PI / 2; sub.push(cs);
  // the slot machines: a cabinet, a lit screen and topper, a gold lever, a stool
  const scr = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff'];
  for (const s of L.slots) {
    const x = X(s.x), z = Z(s.y), f = s.f, zb = z - f * 7, zf = z + f * 7;
    box5(T, x - 9, 0, Math.min(zb, zf), x + 9, 24, Math.max(zb, zf), _C('#2a1a3a'));
    box5(G, x - 7, 10, f > 0 ? zf : zf - 0.6, x + 7, 20, f > 0 ? zf + 0.6 : zf, _C(pick(scr)));
    box5(G, x - 8, 24, Math.min(zb, zf) + 2, x + 8, 28, Math.max(zb, zf) - 2, _C(pick(scr)));
    box5(T, x + 9, 14, z - 1, x + 10.4, 24, z + 1, gold); T.prism(x + 9.7, z, 1.6, 24, 26.4, _C('#e0364f'), 8, 1.6, true);
    T.prism(x, z + f * 18, 3.6, 0, 7, _C('#3a2a2a'), 8, 3.6, true); T.prism(x, z + f * 18, 4.4, 7, 8.6, _C('#b3122a'), 10, 4.4, true);
  }
  // the dice tables: a dark base, green felt, a gold rail, the pass line, chips
  for (const t of L.tables) {
    const x = X(t.x), z = Z(t.y), hw = t.w / 2, hd = t.d / 2;
    box5(T, x - hw, 0, z - hd, x + hw, 10, z + hd, wood);
    box5(G, x - hw + 3, 10, z - hd + 3, x + hw - 3, 10.6, z + hd - 3, _C('#0d5a32'));
    for (const [a0, b0, a1, b1] of [[-hw, -hd, hw, -hd + 3], [-hw, hd - 3, hw, hd], [-hw, -hd, -hw + 3, hd], [hw - 3, -hd, hw, hd]]) box5(T, x + a0, 10, z + b0, x + a1, 13, z + b1, gold);
    box5(G, x - hw + 10, 10.7, z + t.f * (hd - 10) - 0.6, x + hw - 10, 10.8, z + t.f * (hd - 10) + 0.6, _C('#f4f4f6'));
    for (let k = 0; k < 6; k++) T.prism(x - 18 + k * 7, z - t.f * (hd - 8), 2.2, 10.6, 12 + (k % 3) * 1.5, _C(['#e0364f', '#2f6bff', '#f4f4f6', '#111111', '#3dffa6', '#ffd23f'][k]), 8, 2.2, true);
    box5(G, x - 4, 10.6, z - 3, x, 14.6, z + 1, _C('#f4f4f6')); box5(G, x + 2, 10.6, z - 1, x + 6, 14.6, z + 3, _C('#f4f4f6'));   // a pair of dice
  }
  // the cashier's cage: a counter with gold bars, CASHIER over it, safes and money behind
  { const g = L.cage, cx1 = X(g.x1), zc0 = Z(g.y0), zc1 = Z(g.y1);
    box5(T, cx1 - 6, 0, zc0, cx1, 12, zc1, wood); box5(T, X(H.x0), 0, zc0 - 4, cx1, 40, zc0, cream); box5(T, X(H.x0), 0, zc1, cx1, 40, zc1 + 4, cream);
    for (let z = zc0 + 2; z < zc1; z += 5) box5(T, cx1 - 3.6, 12, z - 0.5, cx1 - 2.4, 36, z + 0.5, gold);
    box5(T, cx1 - 6, 36, zc0, cx1, 40, zc1, gold); box5(G, cx1 - 2.4, 12, Z(g.win.y) - 8, cx1 - 2.2, 26, Z(g.win.y) + 8, _C('#ffe9a8'));   // the window
    flat(T, X(H.x0), zc0, cx1 - 6, zc1, 1.1, _C('#5a4a3a'));
    for (let k = 0; k < 3; k++) { box5(T, X(H.x0) + 4, 0, zc0 + 8 + k * 28, X(H.x0) + 18, 20, zc0 + 28 + k * 28, _C('#6d727e')); disc(T, X(H.x0) + 18.2, zc0 + 18 + k * 28, 3, 12, _C('#c8ccd4'), 10); }
    for (let k = 0; k < 4; k++) box5(T, cx1 - 18, 12, zc0 + 12 + k * 20, cx1 - 10, 14 + k % 2, zc0 + 20 + k * 20, _C('#3a8a4a'));
    const cg = fasciaSign('CASHIER', '#ffd23f', 44, 9); cg.position.set(cx1 + 2, 46, zc0 - 6); sub.push(cg); }
  // velvet ropes by the door, plants in the corners
  for (const s of [-1, 1]) { const z = Z(dy) + s * 46; for (let k = 0; k < 4; k++) T.prism(x1 - 20 - k * 20, z, 1.2, 0, 10, gold, 8, 1.2, true); box5(T, x1 - 80, 8.5, z - 0.6, x1 - 20, 9.5, z + 0.6, _C('#b3122a')); }
  for (const [px, pz] of [[x0 + 12, z0 + 14], [x0 + 12, z1 - 14], [x1 - 12, z0 + 14], [x1 - 12, z1 - 14]]) { T.prism(px, pz, 5, 0.9, 7, _C('#e8e4dc'), 10, 4.5, true); T.prism(px, pz, 7, 7, 18, _C('#2f8f4e'), 9, 2, true); }
  // the roof (fades while you are inside): a deck, AC units, a gold edge; the name over the south edge; the neon flamingo (js/08zu kicks its legs)
  flat(R, x0 - 2, z0 - 2, x1 + 2, z1 + 2, HH + 0.4, _C('#e8dcc8'));
  for (const [a, b] of [[0.25, 0.3], [0.55, 0.3], [0.25, 0.65]]) box5(R, x0 + (x1 - x0) * a, HH, z0 + (z1 - z0) * b, x0 + (x1 - x0) * a + 30, HH + 8, z0 + (z1 - z0) * b + 24, _C('#b8b2a6'));
  box5(R, x0 - 3, HH, z0 - 3, x1 + 3, HH + 3, z0 + 1, gold); box5(R, x0 - 3, HH, z1 - 1, x1 + 3, HH + 3, z1 + 3, gold); box5(R, x0 - 3, HH, z0, x0 + 1, HH + 3, z1, gold); box5(R, x1 - 1, HH, z0, x1 + 3, HH + 3, z1, gold);
  const nm = fasciaSign('ROYAL FLAMINGO', '#ffd23f', 240, 30); nm.position.set(X(H.cx) - 40, HH + 20, z1 + 3.4); sub.push(nm);
  box5(T, X(H.cx) - 164, HH, z1 - 2, X(H.cx) + 84, HH + 36, z1 + 3, _C('#1a1220'));   // the sign's frame, fixed (it stays when the roof fades)
  const fl = new GeoBuilder(), FA = new GeoBuilder(), FB = new GeoBuilder(), fx = x1 - 110, fz = z1 - 44, fy = HH + 4, pk = _C('#ff4fa8'), P = (a, b) => [fx + a * 2.1, fy + b * 2.1];
  const body = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU; body.push(P(Math.cos(a) * 22, 46 + Math.sin(a) * 12)); }
  neonLine(fl, body, fz, 5, pk); neonLine(fl, [P(20, 50), P(28, 60), P(24, 72), P(16, 80), P(20, 92), P(30, 96), P(36, 92)], fz, 5, pk);   // the S of the neck, the head
  neonLine(fl, [P(36, 92), P(42, 86), P(40, 82)], fz, 5, _C('#1a1a1a')); neonLine(fl, [P(30, 94), P(31.5, 95.5)], fz, 3.4, _C('#ffffff'));
  neonLine(fl, [P(-20, 50), P(-34, 44), P(-26, 42)], fz, 4.6, pk);                                  // the tail
  neonLine(FA, [P(-2, 34), P(-2, 0)], fz, 4.2, pk); neonLine(FA, [P(4, 34), P(10, 20), P(-2, 16)], fz, 4.2, pk);   // one leg up, then the other
  neonLine(FB, [P(4, 34), P(4, 0)], fz, 4.2, pk); neonLine(FB, [P(-2, 34), P(-10, 20), P(2, 16)], fz, 4.2, pk);
  box5(T, fx - 80, fy - 4, fz - 6, fx + 92, fy, fz + 3, _C('#1a1220'));                          // its stand on the roof
  for (let x = x0 + 6; x < x1; x += 12) box5(RG, x - 1, HH + 3, z1 + 1.4, x + 1, HH + 5, z1 + 3.4, _C('#fff4c2'));   // bulbs along the roof's street edges
  for (let z = z0 + 6; z < z1; z += 12) box5(RG, x1 + 1.4, HH + 3, z - 1, x1 + 3.4, HH + 5, z + 1, _C('#fff4c2'));
  const rs = roofSign('ROYAL FLAMINGO', '#ffd23f', 230, 46, X(H.cx) - 30, HH + 1.2, z0 + 70); sub.push(rs);
  const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }), flm = new THREE.Mesh(fl.build(), neonMat), legA = new THREE.Mesh(FA.build(), neonMat), legB = new THREE.Mesh(FB.build(), neonMat);
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); }
  m.add(flm, legA, legB); m.userData.own.push(neonMat);
  const mats = fadeMats(), roof = new THREE.Mesh(mergeBuilders([R, RG]), mats); m.add(roof); m.userData.own.push(...mats);
  rs.material.transparent = true; mats.push(rs.material, neonMat);   // the roof's sign and the flamingo fade with the roof
  CZ.view = { roof, mats, op: -1, legA, legB, neonMat };
  return m;
}

/* ---------- THE PULSE ---------- */
function makeClub() {
  const H = casClub(), L = casLayout(), T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), X = x => x - H.cx, Z = y => y - H.cy, sub = [];
  const wallC = _C('#16121f'), mag = _C('#ff2bd6'), cyan = _C('#2bf3ff'), blk = _C('#0c0a12'), HH = 48;
  const x0 = X(H.x0), x1 = X(H.x1), z0 = Z(H.y0), z1 = Z(H.y1), [cdx, , cdw] = CASM.cdoor, dx0 = X(cdx - cdw / 2), dx1 = X(cdx + cdw / 2);
  flat(T, x0, z0, x1, z1, 0.9, blk);
  // the walls: dark, neon stripes; the south wall and the roof fade while you are inside (R)
  box5(T, x0, 0, z0 - 2, x1, HH, z0 + 2, wallC); box5(T, x0 - 2, 0, z0, x0 + 2, HH, z1, wallC); box5(T, x1 - 2, 0, z0, x1 + 2, HH, z1, wallC);
  box5(G, x0 - 2.6, 12, z0, x0 - 2, 13.4, z1, mag); box5(G, x0 - 2.6, 17, z0, x0 - 2, 18, z1, cyan);
  box5(R, x0, 0, z1 - 2, dx0, HH, z1 + 2, wallC); box5(R, dx1, 0, z1 - 2, x1, HH, z1 + 2, wallC); box5(R, dx0, 34, z1 - 2, dx1, HH, z1 + 2, wallC);
  box5(RG, x0, 12, z1 + 2, x1, 13.4, z1 + 2.6, mag); box5(RG, x0, 17, z1 + 2, x1, 18, z1 + 2.6, cyan);
  // the door: a canopy edged in neon, THE PULSE and its heartbeat over it, a velvet rope along the sidewalk for the queue
  box5(T, dx0 - 8, 32, z1, dx1 + 8, 35, z1 + 16, _C('#0a0812')); box5(G, dx0 - 8, 31.4, z1 + 15, dx1 + 8, 32.4, z1 + 16, mag);
  for (const s of [-1, 1]) T.prism(X(cdx) + s * 11, z1, 2.6, 0, 9, _C('#d4a52a'), 8, 2.6, true);
  const ps = fasciaSign('THE PULSE', '#ff2bd6', 96, 18); ps.position.set(X(cdx) - 30, 42, z1 + 2.8); sub.push(ps);
  const ecg = new GeoBuilder(), ez = z1 + 3, ey = 42, ex = X(cdx) + 24;
  neonLine(ecg, [[ex, ey], [ex + 10, ey], [ex + 13, ey + 3], [ex + 16, ey], [ex + 19, ey], [ex + 22, ey - 5], [ex + 26, ey + 12], [ex + 30, ey - 8], [ex + 33, ey], [ex + 46, ey]], ez, 1.6, cyan);
  const [qa, qyw, qb] = CASM.queue, qy = Z(qyw) + 9;                   // queue: [head x, y, tail x]
  for (let x = X(qb); x <= X(qa) + 6; x += 24) T.prism(x, qy, 1.2, 0, 10, _C('#d4a52a'), 8, 1.2, true);
  box5(T, X(qb), 8.4, qy - 0.6, X(qa) + 6, 9.4, qy + 0.6, _C('#b3122a'));
  // the DJ: speaker stacks, the booth with two turntables, the DJ's light bar
  { const D = L.dj, a0 = X(D.x0), a1 = X(D.x1), b0 = Z(D.y0), b1 = Z(D.y1);
    for (const sx of [a0, a1 - 20]) { box5(T, sx, 0, b0, sx + 20, 34, b1, _C('#111116')); for (let k = 0; k < 3; k++) box5(T, sx + 4, 4 + k * 10, b1, sx + 16, 12 + k * 10, b1 + 0.6, _C('#3a3d47')); }   // the speakers' cones
    box5(T, a0 + 20, 0, b1 - 12, a1 - 20, 14, b1, _C('#111116')); box5(G, a0 + 20, 3, b1, a1 - 20, 5, b1 + 0.6, mag);
    for (const tx of [X(D.at.x) - 18, X(D.at.x) + 18]) { disc(T, tx, b1 - 6, 6, 14.2, _C('#2a2d38'), 16); disc(G, tx, b1 - 6, 2.4, 14.4, cyan, 10); }
    box5(T, X(D.at.x) - 6, 14, b1 - 10, X(D.at.x) + 6, 15.6, b1 - 2, _C('#3a3d47')); }
  // the dance floor: lit tiles (their colours change with the beat: js/08zu)
  const F = L.floor, n = 10, mz = 8, tw = (F.x1 - F.x0) / n, td = (F.y1 - F.y0) / mz, FL = new GeoBuilder();
  for (let i = 0; i < n; i++) for (let k = 0; k < mz; k++) flat(FL, X(F.x0 + i * tw) + 0.6, Z(F.y0 + k * td) + 0.6, X(F.x0 + (i + 1) * tw) - 0.6, Z(F.y0 + (k + 1) * td) - 0.6, 1.2, _C(BAR_COLS[(i + k) % BAR_COLS.length]));
  const floorGeo = FL.build(), floorMat = new THREE.MeshBasicMaterial({ vertexColors: true }), floor = new THREE.Mesh(floorGeo, floorMat);
  // the bar: counter with a neon strip, shelves of bottles behind, stools
  { const B = L.bar, a1 = X(B.x1), b0 = Z(B.y0), b1 = Z(B.y1);
    box5(T, a1 - 10, 0, b0, a1, 14, b1, _C('#2a1a2a')); box5(G, a1, 4, b0, a1 + 0.6, 6, b1, cyan);
    box5(T, x0 + 2, 0, b0, x0 + 8, 34, b1, _C('#3a2a2a'));
    for (let s = 0; s < 3; s++) for (let z = b0 + 4; z < b1 - 4; z += 6) box5(G, x0 + 8, 14 + s * 7, z - 1.2, x0 + 10.4, 19 + s * 7, z + 1.2, _C(pick(['#3dffa6', '#ffe14a', '#ff7a3d', '#2bf3ff', '#f4f4f6', '#a259ff'])));
    for (let z = b0 + 14; z < b1 - 8; z += 22) { T.prism(a1 + 9, z, 1.2, 0, 10, _C('#9aa0ab'), 6, 1.2, true); T.prism(a1 + 9, z, 4, 10, 11.6, mag, 10, 4, true); } }
  // sofas, tables with candles
  for (const s of L.sofas) { box5(T, X(s[0]), 0, Z(s[1]), X(s[2]), 8, Z(s[3]), _C('#5a1a6a')); box5(T, X(s[2]) - 6, 8, Z(s[1]), X(s[2]), 18, Z(s[3]), _C('#4a1258'));
    for (let z = Z(s[1]) + 22; z < Z(s[3]) - 10; z += 44) { T.prism(X(s[0]) - 12, z, 6, 0, 9, _C('#2a2d38'), 10, 6, true); disc(G, X(s[0]) - 12, z, 1.4, 9.2, _C('#ffcf7a'), 8); } }
  // the light rig over the floor, the mirror ball
  const rigY = 40; for (const z of [Z(F.y0) - 4, Z(F.y1) + 4]) box5(T, X(F.x0) - 4, rigY, z - 1.2, X(F.x1) + 4, rigY + 2.4, z + 1.2, _C('#6d727e'));
  for (const x of [X(F.x0) - 4, X(F.x1) + 4]) box5(T, x - 1.2, rigY, Z(F.y0) - 4, x + 1.2, rigY + 2.4, Z(F.y1) + 4, _C('#6d727e'));
  const ballMat = new THREE.MeshBasicMaterial({ color: 0xe8f6ff }), ball = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), ballMat); ball.position.set(X((F.x0 + F.x1) / 2), 34, Z((F.y0 + F.y1) / 2));
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), spots = [];
  for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.CircleGeometry(14, 18).rotateX(-Math.PI / 2), spotMat.clone()); sp.material.color.set(BAR_COLS[k]); sp.position.y = 1.6; spots.push(sp); }
  // the roof (fades while you are inside): dark, a neon edge
  flat(R, x0 - 2, z0 - 2, x1 + 2, z1 + 2, HH + 0.4, _C('#1d1a26'));
  box5(RG, x0 - 2, HH, z1, x1 + 2, HH + 1.6, z1 + 2.4, mag); box5(RG, x0 - 2.4, HH, z0, x0, HH + 1.6, z1, cyan); box5(RG, x0 - 2, HH, z0 - 2.4, x1 + 2, HH + 1.6, z0, mag); box5(RG, x1, HH, z0, x1 + 2.4, HH + 1.6, z1, cyan);
  const hx = x0 + 40, hz = (z0 + z1) / 2 + 60, hb = [[hx, hz], [hx + 60, hz], [hx + 76, hz - 14], [hx + 92, hz], [hx + 110, hz], [hx + 124, hz + 26], [hx + 146, hz - 60], [hx + 168, hz + 40], [hx + 184, hz], [hx + 280, hz]];
  flatLine(RG, hb, HH + 1, 4, cyan);
  for (const [a, b] of [[0.3, 0.3], [0.6, 0.55]]) box5(R, x0 + (x1 - x0) * a, HH, z0 + (z1 - z0) * b, x0 + (x1 - x0) * a + 26, HH + 7, z0 + (z1 - z0) * b + 22, _C('#3a3d47'));
  const prs = roofSign('THE PULSE', '#ff2bd6', 190, 42, (x0 + x1) / 2, HH + 1.2, z0 + 70); sub.push(prs);
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); }
  const ecgMat = new THREE.MeshBasicMaterial({ vertexColors: true }), ecgM = new THREE.Mesh(ecg.build(), ecgMat);
  m.add(floor, ball, ecgM, ...spots); m.userData.own.push(floorMat, ballMat, ecgMat, ...spots.map(s => s.material));
  const mats = fadeMats(), roof = new THREE.Mesh(mergeBuilders([R, RG]), mats); m.add(roof); m.userData.own.push(...mats);
  prs.material.transparent = true; mats.push(prs.material);
  CZ.cview = { roof, mats, op: -1, floor, floorGeo, n, mz, spots, ball, ecgMat, F: { x0: X(F.x0), x1: X(F.x1), z0: Z(F.y0), z1: Z(F.y1) } };
  return m;
}

/* ---------- the bars across the avenue: a blade sign, a neon band, a lit door ---------- */
function stripBars() {                    // the beachfront buildings across the avenue that become bars (once the city's own picks are made)
  if (CZ.bars.length || !CASM) return CZ.bars;
  const taken = r => r.uniq || r.special || r.safe || r.own || r.sign || r.off || (typeof STORES !== 'undefined' && STORES && STORES.some(s => s.r === r)) || (typeof CSHOPS !== 'undefined' && CSHOPS && CSHOPS.some(s => s.r === r));
  const row = BLD.filter(r => r.cx > 12470 && r.cx < 12640 && r.cy > CASM.block[1] + 100 && r.cy < 7900 && !taken(r)).sort((a, b) => a.cy - b.cy);
  row.forEach((r, i) => CZ.bars.push({ r, name: BAR_NAMES[i % BAR_NAMES.length], col: BAR_COLS[i % BAR_COLS.length], x: r.x, y: r.cy }));
  return CZ.bars;
}
function makeStrip() {
  const g = new THREE.Group(), T = new GeoBuilder(), G = new GeoBuilder(), cx = CZ.slm.cx, cy = CZ.slm.cy, X = x => x - cx, Z = y => y - cy, own = [], signs = [];
  for (const b of stripBars()) {
    const r = b.r, x = X(r.x), z = Z(r.cy), c = _C(b.col), half = Math.min(r.h / 2 - 6, 40), xa = X(r.x), xb = X(r.x + r.w), za = Z(r.y), zb = Z(r.y + r.h), top = SIDE_H + Math.max(r.H || 40, GFH + Math.max(1, Math.round(((r.H || 40) - GFH) / FLOOR)) * FLOOR) + 1.6;   // the roof as the city draws it (whole floors)
    box5(G, x - 0.8, 15, z - half, x - 0.2, 16.4, z + half, c);                                    // the neon band along the front
    box5(G, x - 0.7, 0.5, z - 6, x - 0.1, 13, z + 6, _C('#ffe9a8'));                              // the lit door
    box5(T, x - 9, 13, z - 10, x, 14.4, z + 10, c);                                                 // an awning over it
    box5(T, x - 34, 30, z + 10, x, 31.4, z + 11, _C('#2a2d38'));                                    // the blade sign's bracket
    for (const [a0, b0, a1, b1] of [[xa, za, xb, za + 2], [xa, zb - 2, xb, zb], [xa, za, xa + 2, zb], [xb - 2, za, xb, zb]]) box5(G, a0, top, b0, a1, top + 1.4, b1, c);   // neon round the roof
    const s = fasciaSign(b.name, b.col, 56, 15); s.position.set(x - 26, 26, z + 11.2); g.add(s); own.push(s.material); signs.push(s.material);
    const w = Math.min(r.w - 14, 120), rs = roofSign(b.name, b.col, w, w / 4.2, (xa + xb) / 2, top + 0.6, (za + zb) / 2); g.add(rs); own.push(rs.material); signs.push(rs.material);
  }
  const m = new THREE.Mesh(T.build(), LM_MAT[0]); m.userData.own = []; g.add(m); m.userData.own.push(...own);
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true }); g.add(new THREE.Mesh(G.build(), glow)); m.userData.own.push(glow);   // the neon on its own, so the substation can put it out (js/10ze)
  CZ.stripLit = { glow, signs, dark: false };
  g.userData.own = m.userData.own; return g;
}
