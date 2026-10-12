'use strict';
/* ---------- 7t. THE SUNSTRIP SHOWROOM: SUNSTRIP MOTORS (js/08w sells the cars) ----------
   Map remodel 10 (MAP.showroom) gave a car dealer the block at the corner of the beach avenue and the street south of the big park:
   - the glass hall, its front to the south street: glass walls on the street sides, the entrance in the middle of the front and a side
     door to the avenue (bollards in them: people walk in, cars do not), a polished floor, eleven turntables each turning a car of its
     own - every car kind the showroom sells (vehicles table: price), the three rare ones sold only here at the front - a sales counter
     at the back, plants, a big SUNSTRIP MOTORS over the door and on a pylon at the corner. The roof turns see-through while you are
     inside (an interior of the top-down kind, like the Pay 'n' Spray).
   - the tuning workshop at the back, its roller door to the avenue (js/08y): a bay down the middle, tool chests, a workbench, tyres,
     a rack of rims, a car up on the lift, an engine on a stand, a mechanic; its roof turns see-through while you are inside.
   - the stock yard beside it: cars for sale parked in rows under strings of pennants.
   Turntables and the counter are solid; the cars on them are pictures only (they never drive). Mode: showroom (js/01j). */
const SHOWM = MAP.showroom || null;
const SHOW = { slots: [], roof: 1, pt: null, lm: null, cars: [], yard: [], built: false, wk: null };
function tnFurniture() {                  // the workshop's furniture, clear of the bay in front of the door: [x, y, w, h] (world, middles)
  const [x0, y0, x1, y1] = SHOWM.shop;
  return { chests: [x0 + 90, y0 + 10, 60, 14], bench: [x1 - 62, y0 + 10, 46, 14], tyres: [x0 + 12, y0 + 40, 14, 44], rims: [x0 + 14, y1 - 46, 16, 40], lift: [x0 + 70, y1 - 36, 60, 40], engine: [x1 - 60, y1 - 24, 18, 18] };
}
const SHOW_LAYOUT = [                     // where each car stands in the hall: [type, x, z] in the hall's frame (x east, z south, from its middle)
  ['super', -165, 112], ['bike', -84, 116], ['sedan', -165, 34], ['sports', -84, 38], ['pickup', -165, -44], ['taxi', -84, -42], ['estate', -165, -118],
  ['convertible', 86, 114], ['muscle', 166, 112], ['truck', 166, 26], ['limo', 120, -92]];
const showHall = () => { const [x0, y0, x1, y1] = SHOWM.hall; return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hd: (y1 - y0) / 2 }; };
function showIn(x, y, m) { const H = showHall(); return Math.abs(x - H.cx) < H.hw - (m || 0) && Math.abs(y - H.cy) < H.hd - (m || 0); }
function genShowroom() {                  // js/04 genWorld, after the cement works: walls, doors with bollards, turntables, counter, workshop, the drawables
  SHOW.slots = []; SHOW.built = false; if (!SHOWM) return;
  const H = showHall(), solid = (x, y, w, h, o) => makeSolid(x, y, w, h, 0, o || {}), [bx0, by0, bx1, by1] = SHOWM.block, wt = 4;
  const wallX = (y, x0, x1, gaps) => { let a = x0; for (const [gx, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gx - gw / 2 > a) solid((a + gx - gw / 2) / 2, y, gx - gw / 2 - a, wt); a = gx + gw / 2; } if (x1 > a) solid((a + x1) / 2, y, x1 - a, wt); };
  const wallY = (x, y0, y1, gaps) => { let a = y0; for (const [gy, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gy - gw / 2 > a) solid(x, (a + gy - gw / 2) / 2, wt, gy - gw / 2 - a); a = gy + gw / 2; } if (y1 > a) solid(x, (a + y1) / 2, wt, y1 - a); };
  const [dx, dy, dw] = SHOWM.door, [sx, sy, sw] = SHOWM.side;
  wallX(H.y1, H.x0, H.x1, [[dx, dw]]); wallX(H.y0, H.x0, H.x1, []); wallY(H.x0, H.y0, H.y1, []); wallY(H.x1, H.y0, H.y1, [[sy, sw]]);
  for (let k = -1; k <= 1; k++) { solid(dx + k * dw / 4, dy, 6, 10); solid(sx, sy + k * sw / 3, 10, 6); }   // bollards: people pass between them, cars do not
  { const px = SHOWM.block[2] - 8, py = (SHOWM.hall[1] + SHOWM.shop[3]) / 2; solid(px, py, 10, 10); }
  for (const [type, lx, lz] of SHOW_LAYOUT) {
    const t = CAR_TYPES[type]; if (!t || !(t.price > 0)) continue;
    const x = H.cx + lx, y = H.cy + lz, r = t.len / 2 + 6;
    SHOW.slots.push({ type, x, y, r, color: t.colors[0], spin: 0.25 + (SHOW.slots.length % 3) * 0.06, ang: SHOW.slots.length * 1.3 });
    solid(x, y, r * 1.4, r * 1.4, { soft: true });
  }
  solid(H.cx, H.y0 + 30, 90, 24);                                    // the sales counter
  const [wx0, wy0, wx1, wy1] = SHOWM.shop; wallX(wy0, wx0, wx1, []); wallX(wy1, wx0, wx1, []); wallY(wx0, wy0, wy1, []);   // the tuning workshop (js/08y)
  for (const [fx, fy, fw, fh] of Object.values(tnFurniture())) solid(fx, fy, fw, fh);
  const [ex, ey, ew] = SHOWM.sdoor; wallY(wx1, wy0, wy1, [[ey, ew]]); SHOW.sdoor = solid(ex, ey, wt + 2, ew, { door: true });   // the roller door: a wall while it is down
  const [yx0, yy0, yx1, yy1] = SHOWM.yard; SHOW.yard = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { const x = yx0 + 50 + j * 64, y = yy0 + 70 + i * 120, type = ['sedan', 'estate', 'pickup', 'sports', 'taxi', 'sedan'][i * 3 + j];
    if (CAR_TYPES[type]) { SHOW.yard.push({ type, x, y, color: pick(CAR_TYPES[type].colors) }); makeSolid(x, y, CAR_TYPES[type].wid, CAR_TYPES[type].len, 0, {}); } }
  LM_CLEAR.push([(bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) / 2, (by1 - by0) / 2]);
  LMS.push(SHOW.lm = { cx: H.cx, cy: (by0 + by1) / 2, a: 0, rad: Math.hypot(bx1 - bx0, by1 - by0) / 2 + 60, make: () => makeShowroom(H.cx, (by0 + by1) / 2), mesh: null });
}

/* ---------- the model ---------- */
function makeShowroom(cx, cy) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), H = showHall(), X = x => x - cx, Z = y => y - cy;
  const glass = _C('#7fd8f0'), frame = _C('#e8ecf2'), dark = _C('#2a2d38'), floor = _C('#e9e6ee'), wall = _C('#f2efe8'), neon = _C('#ff2bd6'), HH = 52, sub = [];
  // the hall: floor, slim white frame, glass on the street sides, solid walls behind
  flat(T, X(H.x0), Z(H.y0), X(H.x1), Z(H.y1), 0.9, floor);
  for (let x = H.x0 + 40; x < H.x1; x += 80) flat(T, X(x) - 0.6, Z(H.y0), X(x) + 0.6, Z(H.y1), 0.95, _C('#d4d0dc'));   // floor tiles
  for (let y = H.y0 + 40; y < H.y1; y += 80) flat(T, X(H.x0), Z(y) - 0.6, X(H.x1), Z(y) + 0.6, 0.95, _C('#d4d0dc'));
  box5(T, X(H.x0), 0, Z(H.y0), X(H.x1), HH, Z(H.y0) + 4, wall); box5(T, X(H.x0), 0, Z(H.y0), X(H.x0) + 4, HH, Z(H.y1), wall);
  const [dx, , dw] = SHOWM.door, [, sy, sw] = SHOWM.side;
  const glassX = (z, x0, x1) => { if (x1 - x0 < 2) return; face(G, [[X(x0), 1, z], [X(x1), 1, z], [X(x1), HH - 4, z], [X(x0), HH - 4, z]], [0, 0, 1], glass); };
  glassX(Z(H.y1), H.x0, dx - dw / 2); glassX(Z(H.y1), dx + dw / 2, H.x1);
  const glassZ = (x, z0, z1) => face(G, [[x, 1, z0], [x, 1, z1], [x, HH - 4, z1], [x, HH - 4, z0]], [1, 0, 0], glass);
  glassZ(X(H.x1), Z(H.y0), Z(sy - sw / 2)); glassZ(X(H.x1), Z(sy + sw / 2), Z(H.y1));
  for (let x = H.x0; x <= H.x1 + 1; x += 53) box5(T, X(x) - 1.5, 0, Z(H.y1) - 1.5, X(x) + 1.5, HH, Z(H.y1) + 1.5, frame);   // mullions
  for (let y = H.y0; y <= H.y1 + 1; y += 53) box5(T, X(H.x1) - 1.5, 0, Z(y) - 1.5, X(H.x1) + 1.5, HH, Z(y) + 1.5, frame);
  box5(T, X(H.x0), HH - 4, Z(H.y1) - 2, X(H.x1), HH, Z(H.y1) + 2, frame); box5(T, X(H.x1) - 2, HH - 4, Z(H.y0), X(H.x1) + 2, HH, Z(H.y1), frame);
  box5(T, X(dx - dw / 2) - 2, 0, Z(H.y1) - 2, X(dx - dw / 2) + 2, HH, Z(H.y1) + 2, dark); box5(T, X(dx + dw / 2) - 2, 0, Z(H.y1) - 2, X(dx + dw / 2) + 2, HH, Z(H.y1) + 2, dark);
  box5(T, X(dx - dw / 2) - 10, HH - 6, Z(H.y1), X(dx + dw / 2) + 10, HH, Z(H.y1) + 26, frame);   // the canopy over the door
  for (let k = -1; k <= 1; k++) { T.prism(X(dx + k * dw / 4), Z(H.y1) + 0.5, 2.6, 0, 9, _C('#9aa0ab'), 8, 2.6, true); T.prism(X(SHOWM.side[0]), Z(sy + k * sw / 3), 2.6, 0, 9, _C('#9aa0ab'), 8, 2.6, true); }
  // turntables: a dark disc with a ring of lights, the car's name on a stand
  for (const S of SHOW.slots) {
    T.prism(X(S.x), Z(S.y), S.r, 0.9, 3, _C('#2a2d38'), 28, S.r, true); T.prism(X(S.x), Z(S.y), S.r + 1.5, 0.9, 2.2, _C('#c8ccd4'), 28, S.r + 1.5, false);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; box5(G, X(S.x) + Math.cos(a) * (S.r - 2) - 0.8, 3, Z(S.y) + Math.sin(a) * (S.r - 2) - 0.8, X(S.x) + Math.cos(a) * (S.r - 2) + 0.8, 3.4, Z(S.y) + Math.sin(a) * (S.r - 2) + 0.8, CAR_TYPES[S.type].traffic || CAR_TYPES[S.type].parked ? _C('#2bf3ff') : _C('#ffd23f')); }
  }
  // the counter, plants
  box5(T, X(H.cx) - 45, 0, Z(H.y0) + 18, X(H.cx) + 45, 11, Z(H.y0) + 42, _C('#1d1b24')); box5(G, X(H.cx) - 45, 11, Z(H.y0) + 40, X(H.cx) + 45, 12, Z(H.y0) + 42, neon);
  for (const [px, pz] of [[H.x0 + 14, H.y1 - 14], [H.x1 - 14, H.y1 - 14], [H.x0 + 14, H.y0 + 20], [H.x1 - 14, H.y0 + 20]]) { T.prism(X(px), Z(pz), 5, 0.9, 7, _C('#e8e4dc'), 10, 4.5, true); T.prism(X(px), Z(pz), 7, 7, 18, _C('#2f8f4e'), 9, 2, true); }
  // the roof: white, a band of neon along its edge (it fades while you are inside)
  box5(R, X(H.x0) - 2, HH, Z(H.y0) - 2, X(H.x1) + 2, HH + 5, Z(H.y1) + 2, _C('#f4f4f6')); box5(RG, X(H.x0) - 2, HH + 5, Z(H.y1) + 1, X(H.x1) + 2, HH + 7, Z(H.y1) + 2, neon);
  for (let k = 0; k < 4; k++) box5(R, X(H.x0) + 60 + k * 90, HH + 5, Z(H.y0) + 60, X(H.x0) + 100 + k * 90, HH + 11, Z(H.y0) + 90, _C('#c8ccd4'));   // AC units
  // the tuning workshop: walls with the roller door to the avenue, a bay down the middle, the workshop round it, a roof that fades (js/08y)
  const WR = new GeoBuilder(), WRG = new GeoBuilder(), WD = new GeoBuilder();
  { const [x0, y0, x1, y1] = SHOWM.shop, [, ey, ew] = SHOWM.sdoor, h = 46, DH = 38, w = 2, F = tnFurniture(), C = _C;
    const wallC = C('#3a3f4c'), trim = C('#2a2d38'), yel = C('#ffd23f'), blk = C('#16161c'), steel = C('#8a8f9c'), red = C('#d0323f');
    const fl = (gb, a0, b0, a1, b1, y, col) => face(gb, [[X(a0), y, Z(b0)], [X(a1), y, Z(b0)], [X(a1), y, Z(b1)], [X(a0), y, Z(b1)]], [0, 1, 0], col);
    fl(T, x0, y0, x1, y1, 0.9, C('#2a2d38'));                                                   // the floor: dark epoxy, a checkered bay, yellow lines
    for (let x = x0 + 8, i = 0; x < x1 - 6; x += 16, i++) for (let y = ey - 48, k = 0; y < ey + 48; y += 16, k++) if ((i + k) % 2) fl(T, x, y, Math.min(x + 16, x1 - 6), Math.min(y + 16, ey + 48), 0.95, C('#3a3d52'));
    for (const s of [-1, 1]) fl(T, x0 + 6, ey + s * 50 - 1.5, x1 - 4, ey + s * 50 + 1.5, 1, yel);
    for (let k = 0, n = Math.round(ew / 6); k < n; k++) fl(T, x1 - 5, ey - ew / 2 + k * ew / n, x1 - 1, ey - ew / 2 + (k + 1) * ew / n, 1, k % 2 ? blk : yel);   // a striped threshold
    box5(T, X(x0), 0, Z(y0) - w, X(x1), h, Z(y0) + w, wallC); box5(T, X(x0), 0, Z(y1) - w, X(x1), h, Z(y1) + w, wallC); box5(T, X(x0) - w, 0, Z(y0), X(x0) + w, h, Z(y1), wallC);
    box5(T, X(x1) - w, 0, Z(y0), X(x1) + w, h, Z(ey - ew / 2), wallC); box5(T, X(x1) - w, 0, Z(ey + ew / 2), X(x1) + w, h, Z(y1), wallC); box5(T, X(x1) - w, DH, Z(ey - ew / 2), X(x1) + w, h, Z(ey + ew / 2), wallC);
    box5(T, X(x0) - 1, h, Z(y0) - 3, X(x1) + 3, h + 3, Z(y0) + 3, trim); box5(T, X(x0) - 1, h, Z(y1) - 3, X(x1) + 3, h + 3, Z(y1) + 3, trim); box5(T, X(x1) - 3, h, Z(y0), X(x1) + 3, h + 3, Z(y1), trim); box5(T, X(x0) - 3, h, Z(y0), X(x0) + 3, h + 3, Z(y1), trim);
    box5(G, X(x1) + 2, h - 9, Z(y0), X(x1) + 2.6, h - 6, Z(y1), yel); box5(G, X(x0), h - 9, Z(y1) + 2, X(x1), h - 6, Z(y1) + 2.6, yel);   // a yellow neon band on the street sides
    for (const s of [-1, 1]) for (let y = 0; y < DH; y += 4) box5(T, X(x1) + 2, y, Z(ey + s * (ew / 2 + 1.5)) - 1.5, X(x1) + 4, Math.min(DH, y + 4), Z(ey + s * (ew / 2 + 1.5)) + 1.5, (y / 4) % 2 ? blk : yel);   // hazard posts
    box5(T, X(x1) + 1, DH, Z(ey - ew / 2) - 3, X(x1) + 4, DH + 5, Z(ey + ew / 2) + 3, trim);          // the drum the door rolls onto
    // the workshop: tool chests and a bench along the back, tyres and a rack of rims on the far wall, a car up on the lift, an engine on a stand
    { const [cx, cy, cw, ch] = F.chests; box5(T, X(cx - cw / 2), 0, Z(cy - ch / 2), X(cx + cw / 2), 14, Z(cy + ch / 2), red);
      for (let y = 3; y < 14; y += 3) box5(T, X(cx - cw / 2) + 1, y, Z(cy + ch / 2), X(cx + cw / 2) - 1, y + 0.6, Z(cy + ch / 2) + 0.5, trim);
      for (let k = 0; k < 6; k++) box5(T, X(cx - cw / 2 + 4 + k * 9), 14, Z(cy - 4), X(cx - cw / 2 + 8 + k * 9), 15, Z(cy + 3), C(pick(['#c8ccd4', '#ffd23f', '#2bf3ff', '#3a3d47']))); }
    { const [bx, by, bw, bh] = F.bench; box5(T, X(bx - bw / 2), 0, Z(by - bh / 2), X(bx + bw / 2), 11, Z(by + bh / 2), C('#8a6a48')); box5(T, X(bx - bw / 2) + 3, 11, Z(by - 3), X(bx - bw / 2) + 9, 15, Z(by + 3), trim);
      box5(T, X(bx + 6), 11, Z(by - 4), X(bx + 16), 16, Z(by + 4), C('#5a6070')); }                // a vice, a parts washer
    { const [tx, ty, , th] = F.tyres; for (let k = 0; k < 4; k++) for (let n = 0; n < 3; n++) T.prism(X(tx), Z(ty - th / 2 + 6 + k * 11), 5.4, n * 3.6, n * 3.6 + 3.4, C('#1c1c22'), 12, 5.4, true); }
    { const [rx, ry, , rh] = F.rims, cols = ['#ff2bd6', '#2bf3ff', '#ffd23f', '#3dffa6', '#ff7a3d', '#f4f4f6'];
      box5(T, X(rx) - 7, 0, Z(ry - rh / 2), X(rx) + 7, 3, Z(ry + rh / 2), steel);
      for (let k = 0; k < 3; k++) for (let n = 0; n < 2; n++) { const cz = Z(ry - rh / 2 + 7 + k * 13), cx = X(rx) + (n ? 3.5 : -3.5); T.prism(cx, cz, 4.4, 3, 4, C(cols[k * 2 + n]), 12, 4.4, true); T.prism(cx, cz, 1.6, 4, 4.4, trim, 8, 1.6, true); } }
    { const [lx, ly] = F.lift, lc = C(pick(['#ff2bd6', '#2bf3ff', '#ffd23f', '#3dffa6']));
      for (const s of [-1, 1]) box5(T, X(lx) + s * 26 - 1.6, 0, Z(ly) - 1.6, X(lx) + s * 26 + 1.6, 32, Z(ly) + 1.6, C('#d0323f'));
      box5(T, X(lx) - 24, 16, Z(ly) - 14, X(lx) + 24, 17.5, Z(ly) + 14, steel);
      box5(T, X(lx) - 24, 18, Z(ly) - 11, X(lx) + 24, 24, Z(ly) + 11, lc); box5(T, X(lx) - 8, 24, Z(ly) - 8.5, X(lx) + 10, 30, Z(ly) + 8.5, C('#1d2230'));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box5(T, X(lx) + sx * 15 - 4, 16.5, Z(ly) + sz * 11 - 2, X(lx) + sx * 15 + 4, 22, Z(ly) + sz * 11 + 2, blk);
      box5(T, X(lx) - 26, 23.5, Z(ly) - 9, X(lx) - 23, 26, Z(ly) + 9, lc); }                       // a wing on it
    { const [ex2, ey2] = F.engine; box5(T, X(ex2) - 9, 0, Z(ey2) - 2, X(ex2) + 9, 8, Z(ey2) + 2, steel); box5(T, X(ex2) - 7, 8, Z(ey2) - 7, X(ex2) + 7, 18, Z(ey2) + 7, C('#5a6070'));
      box5(T, X(ex2) - 6, 18, Z(ey2) - 6, X(ex2) + 6, 20, Z(ey2) + 6, red); for (let k = -1; k <= 1; k++) T.prism(X(ex2) + 9, Z(ey2) + k * 4, 1.2, 12, 14, C('#c8ccd4'), 6, 1.2, true); }
    for (const s of [-1, 1]) box5(G, X(x0 + 30), h - 8, Z(ey + s * 60) - 1.2, X(x1 - 30), h - 7, Z(ey + s * 60) + 1.2, C('#e8f6ff'));   // tube lights along the sides of the bay
    // the roof (fades while you are inside): deck, skylights, AC units, a yellow edge to the street
    fl(WR, x0 - 1, y0 - 3, x1 + 3, y1 + 3, h + 3.2, C('#4a4e5c'));
    for (let x = x0 + 20; x < x1 - 30; x += 46) fl(WR, x, ey - 30, x + 26, ey + 30, h + 3.5, C('#6d8fc9'));
    box5(WR, X(x0) + 20, h + 3, Z(y0) + 14, X(x0) + 44, h + 12, Z(y0) + 38, C('#9aa0ab')); WR.prism(X(x0) + 32, Z(y0) + 26, 7, h + 12, h + 12.6, C('#555a66'), 10, 7, true);
    box5(WRG, X(x1) + 1.6, h + 3.2, Z(y0), X(x1) + 3.2, h + 4.6, Z(y1), yel);
    // the door: slats hanging from the drum, rolled up by scaling (geometry hangs down from y = 0)
    for (let y = 0; y < DH; y += 3) box5(WD, X(x1) - 1, y - DH, Z(ey - ew / 2), X(x1) + 1, Math.min(0, y - DH + 2.7), Z(ey + ew / 2), C((y / 3) % 2 ? '#8e95a3' : '#a9afbc'));
    const ts = fasciaSign('TUNING', '#ffd23f', 50, 12); ts.position.set(X(x1) + 4.2, 44, Z(ey)); ts.rotation.y = Math.PI / 2; sub.push(ts);
    const tb = fasciaSign('TUNING', '#ffd23f', 50, 12); tb.position.set(X(x1) - 30, h + 14, Z(y1) + 3.2); sub.push(tb); }
  // the stock yard: pennant strings on poles
  { const [x0, y0, x1, y1] = SHOWM.yard, cols = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d'];
    for (const [px, py] of [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8]]) T.prism(X(px), Z(py), 1.2, 0, 34, _C('#d8dce4'), 6);
    for (const [ax, ay, bx, by] of [[x0 + 8, y0 + 8, x1 - 8, y1 - 8], [x1 - 8, y0 + 8, x0 + 8, y1 - 8]]) for (let k = 1; k < 14; k++) { const t = k / 14, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, sag = 34 - Math.sin(t * Math.PI) * 6;
      face(G, [[X(x) - 2, sag, Z(y)], [X(x) + 2, sag, Z(y)], [X(x), sag - 5, Z(y)], [X(x), sag - 5, Z(y)]], [0, 0, 1], _C(cols[k % cols.length])); } }
  // the name: over the door and on a pylon at the avenue corner, turned to the camera
  const sg = fasciaSign('SUNSTRIP MOTORS', '#ff2bd6', Math.min(220, dw + 150), 22); sg.position.set(X(dx), HH - 16, Z(H.y1) + 27); sub.push(sg);
  { const px = X(SHOWM.block[2]) - 8, pz = Z((SHOWM.hall[1] + SHOWM.shop[3]) / 2); box5(T, px - 4, 0, pz - 4, px + 4, 80, pz + 4, dark);   // the pylon by the avenue, between the hall and the workshop
    const ps = fasciaSign('SUNSTRIP MOTORS', '#2bf3ff', 90, 16); ps.position.set(px - 30, 92, pz + 5); sub.push(ps);
    const ps2 = fasciaSign('NEW · RARE · TUNED', '#ffe14a', 70, 10); ps2.position.set(px - 30, 78, pz + 5); sub.push(ps2); }
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); }
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof); m.userData.own.push(roofMat, roofGlow);
  SHOW.pt = { roof, roofMat, roofGlow, op: -1 };
  { const wMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), wGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });   // the workshop's own roof, door, lamp and mechanic (js/08y)
    const wRoof = new THREE.Mesh(mergeBuilders([WR, WRG]), [wMat, wGlow]); m.add(wRoof);
    const door = new THREE.Mesh(WD.build(), LM_MAT[0]); door.position.y = 38; m.add(door);
    const [, ey, ew] = SHOWM.sdoor, lampMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a }), lamp = new THREE.Mesh(GB, lampMat);
    lamp.scale.set(2, 4, 4); lamp.position.set(X(SHOWM.shop[2]) + 4.4, 30, Z(ey - ew / 2 - 9)); m.add(lamp);
    const mech = buildPerson('ped', 0x2a4aa8, '#c98a5a'); part(mech.tilt, GB, mc(0xc8ccd4), 7, 1.4, 1.4, 7.5, 14, 3.6); m.add(mech.g);   // blue overalls, a wrench
    m.userData.own.push(wMat, wGlow, lampMat);
    SHOW.wk = { roofMat: wMat, roofGlow: wGlow, door, lampMat, mech, op: -1 }; }
  return m;
}

/* ---------- the cars on show: models of their own, only while the showroom is near (js/13) ---------- */
function showCar(type, color, x, y, ang, z) {
  const c = { t: CAR_TYPES[type], type, color, x, y, ang };
  buildCar(c); const m = c.m;
  if (m.drv) m.drv.visible = false; if (m.rider) m.rider.visible = false; if (m.hb) m.hb.visible = false;
  c.mesh.position.set(x, z || 0, y); c.mesh.rotation.y = -ang; return c;
}
function dropShowCars() { for (const c of SHOW.cars) { scene.remove(c.mesh); if (c.m && c.m.body) c.m.body.dispose(); } SHOW.cars = []; SHOW.built = false; }
let showT = 0;
function gfxShowroom(time) {
  const dt = Math.min(0.1, Math.max(0, time - showT)); showT = time;
  if (!SHOWM || !SHOW.lm) return;
  const near = !!SHOW.lm.mesh;
  if (near && !SHOW.built) {
    SHOW.built = true;
    for (const S of SHOW.slots) { S.car = showCar(S.type, S.color, S.x, S.y, S.ang, 3); SHOW.cars.push(S.car); }
    for (const Y of SHOW.yard) SHOW.cars.push(showCar(Y.type, Y.color, Y.x, Y.y, Math.PI / 2, 0));
  } else if (!near && SHOW.built) dropShowCars();
  if (SHOW.built) for (const S of SHOW.slots) { S.ang += S.spin * dt; if (S.car) S.car.mesh.rotation.y = -S.ang; }
  const pt = SHOW.pt; if (!near || !pt) return;
  const me = P.car || P, inside = !P.dead && showIn(me.x, me.y, -4);
  SHOW.roof += ((inside ? 0.08 : 1) - SHOW.roof) * Math.min(1, dt * 6);
  if (Math.abs(SHOW.roof - pt.op) > 0.003) { pt.op = SHOW.roof; pt.roofMat.opacity = pt.roofGlow.opacity = SHOW.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = SHOW.roof > 0.97; }
}
