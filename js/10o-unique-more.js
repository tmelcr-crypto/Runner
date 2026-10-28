'use strict';
/* ---------- 7p2. 40 MORE UNIQUE BUILDINGS: NEW KINDS ----------
   The unique buildings table (js/01r) has kinds beyond the Miami mix of js/10n: skyscrapers and condo towers (tall - what a flight
   has to clear), schools, an arena, parking garages, gas stations, museums, civic buildings (city hall, library, courthouse, post
   office), supermarkets, car washes and bowling alleys. js/10n places them like the others (a lot that suits the kind's size, in a
   district that suits it) and builds them with the models here, the name always on the building or on its own pylon.
   Each model is built in the lot's frame: x along the street (width W), z from the back to the front (depth D), the front at z = D/2. */
Object.assign(UQ_FIT, {
  sky: { w: [90, 300], d: 90, dist: ['PALM HEIGHTS', 'SUNSTRIP', 'SEAVIEW', 'MERCADO'] }, condo: { w: [80, 260], d: 80, beach: true },
  school: { w: [130, 420], d: 100 }, garage: { w: [90, 280], d: 90 }, gas: { w: [100, 300], d: 80 },
  museum: { w: [110, 320], d: 90 }, civic: { w: [100, 300], d: 80, dist: ['PALM HEIGHTS', 'MERCADO', 'SEAVIEW', 'SUNSTRIP', 'CORAL SHORE'] },
  market: { w: [130, 380], d: 100 }, carwash: { w: [110, 300], d: 70 }, bowling: { w: [90, 280], d: 80 } });
Object.assign(UQ_H, { sky: () => rand(260, 420), condo: () => rand(150, 250), school: () => 30, arena: () => 96, garage: () => rand(42, 70), gas: () => 24,
  museum: () => rand(40, 62), civic: () => rand(46, 60), market: () => 30, carwash: () => 22, bowling: () => 28 });
Object.assign(UQ_GROUND, { sky: '#7d7a8c', condo: '#cfc8b8', school: '#6f7a62', arena: '#9a96a8', garage: '#5a5d66', gas: '#3a3d47', museum: '#d8d2c4',
  civic: '#bdb8ac', market: '#3a3d47', carwash: '#3a3d47', bowling: '#3a3d47' });

/* a name on its own sign by the street: on two legs (or a solid wall when y0 is 0), facing the front - or turned to the camera's side
   when the front is seen side-on (js/10n uqSide) */
function uqPylon(T, U, x, z, y0, h, maxW, col, neon, text) {
  const t = text || U.row.name, sx = uqSide(U), s = uqFit(t, h, maxW), dark = _C('#2a2d3a'), y1 = y0 + s.h + 4;
  if (!sx) {
    if (y0 > 0) for (const k of [-1, 1]) box5(T, x + k * (s.w / 2 - 3) - 1.2, 0, z - 1.2, x + k * (s.w / 2 - 3) + 1.2, y0, z + 1.2, dark);
    box5(T, x - s.w / 2 - 2, y0, z - 1.6, x + s.w / 2 + 2, y1, z + 0.6, _C(col)); box5(T, x - s.w / 2 - 2.4, y1, z - 2, x + s.w / 2 + 2.4, y1 + 1.2, z + 1, _C(neon));
    return m => uqSign(m, U, t, neon, x, y0 + 2 + s.h / 2, z + 0.9, s.h, false, true);
  }
  if (y0 > 0) for (const k of [-1, 1]) box5(T, x - 1.2, 0, z + k * (s.w / 2 - 3) - 1.2, x + 1.2, y0, z + k * (s.w / 2 - 3) + 1.2, dark);
  box5(T, x - 1.1, y0, z - s.w / 2 - 2, x + 1.1, y1, z + s.w / 2 + 2, _C(col)); box5(T, x - 1.5, y1, z - s.w / 2 - 2.4, x + 1.5, y1 + 1.2, z + s.w / 2 + 2.4, _C(neon));
  return m => { const sg = uqSign(m, U, t, neon, x + sx * 1.4, y0 + 2 + s.h / 2, z, s.h, false, true); sg.rotation.y = sx * Math.PI / 2; };
}
const uqAll = (...f) => m => { for (const p of f) if (p) p(m); };
function uqTri(gb, a, b, c, n, col) {     // a triangle wound to face n (like face() for quads)
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) gb.tri(a, c, b, n, col); else gb.tri(a, b, c, n, col);
}
function uqDial(T, G, x, y, z, r) {        // a clock face on a wall facing +z: a dark rim, a lit face, two hands
  for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU, p = (a, rr, dz) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + dz];
    uqTri(T, p(a0, r, 0.2), p(a1, r, 0.2), [x, y, z + 0.2], [0, 0, 1], _C('#2a2d3a')); uqTri(G, p(a0, r * 0.82, 0.4), p(a1, r * 0.82, 0.4), [x, y, z + 0.4], [0, 0, 1], _C('#fff3c0')); }
  box5(T, x - 0.3, y - 0.3, z + 0.4, x + 0.3, y + r * 0.62, z + 0.7, _C('#2a2d3a')); box5(T, x - 0.3, y - 0.3, z + 0.4, x + r * 0.45, y + 0.3, z + 0.7, _C('#2a2d3a'));
}
function uqTowerSkin(T, G, x0, z0, x1, z1, y0, y1, glass, mull, lit, fl) {   // a glass shaft: the curtain wall, a band at every floor, lit windows on the front and the sides
  box5(T, x0, y0, z0, x1, y1, z1, _C(glass));
  for (let y = y0 + fl; y < y1 - 2; y += fl) {
    box5(T, x0 - 0.5, y, z0 - 0.5, x1 + 0.5, y + 1.3, z1 + 0.5, mull);
    for (let x = x0 + 5; x < x1 - 4; x += 9) if (Math.random() < lit) face(G, [[x - 3, y + 2.5, z1 + 0.3], [x + 3, y + 2.5, z1 + 0.3], [x + 3, y + fl - 2, z1 + 0.3], [x - 3, y + fl - 2, z1 + 0.3]], [0, 0, 1], _C('#ffd98a'));
    for (const [sx, xx] of [[-1, x0 - 0.3], [1, x1 + 0.3]]) for (let z = z0 + 5; z < z1 - 4; z += 9) if (Math.random() < lit * 0.7) face(G, [[xx, y + 2.5, z - 3], [xx, y + 2.5, z + 3], [xx, y + fl - 2, z + 3], [xx, y + fl - 2, z - 3]], [sx, 0, 0], _C('#ffd98a'));
  }
}
function uqCar(T, x, z, y, along) {       // a parked car seen from above (scenery: a garage deck, a forecourt)
  const col = _C(pick(['#e0364f', '#2a4aa8', '#f4f4f6', '#1d1d24', '#ffd23f', '#3dffa6', '#9aa0ab', '#ff7a3d'])), hl = along ? 10 : 5, hw2 = along ? 5 : 10;
  box5(T, x - hl, y, z - hw2, x + hl, y + 4.5, z + hw2, col); box5(T, x - hl * 0.55, y + 4.5, z - hw2 * 0.8, x + hl * 0.55, y + 7.5, z + hw2 * 0.8, _C('#1d2740'));
}

Object.assign(UQ_MODELS, {
  sky(T, G, U, hw, hd, H, c, neon) {       // a skyscraper: a podium with a glass lobby, a glass shaft banded floor by floor, and a top of its own
    const glass = pick(['#2a3f63', '#1f3552', '#33507a', '#2b4a5e', '#3a4d6b']), mull = _C(c), pz = hd - 4, tz0 = -hd + 6, tz1 = pz - 16;
    const tw = Math.min(hw - 8, 95), v = U.seed % 4, cz = (tz0 + tz1) / 2, td = (tz1 - tz0) / 2;
    box5(T, -hw + 2, 0, -hd + 2, hw - 2, 26, pz, _C(shade(c, -18))); box5(G, -hw + 10, 3, pz, hw - 10, 21, pz + 0.5, _C('#cfe6ff'));   // the podium and its lobby
    box5(T, -hw + 1, 26, -hd + 1, hw - 1, 28, pz + 1, mull);
    uqTowerSkin(T, G, -tw, tz0, tw, tz1, 28, H, glass, mull, 0.28, 12);
    let top = H;
    if (v === 0) { box5(T, -tw * 0.72, H, cz - td * 0.72, tw * 0.72, H + 26, cz + td * 0.72, _C(glass)); box5(T, -tw * 0.45, H + 26, cz - td * 0.45, tw * 0.45, H + 46, cz + td * 0.45, mull); T.prism(0, cz, 3, H + 46, H + 130, _C('#d8dce4'), 8, 0.6); top = H + 130; }   // setbacks and a spire
    else if (v === 1) { face(T, [[-tw, H, tz1], [tw, H, tz1], [tw, H + 60, tz0], [-tw, H + 60, tz0]], [0, 0.7, 0.7], _C(glass)); box5(T, -tw, H, tz0, tw, H + 60, tz0 + 1, _C(glass));   // a slanted top, lit along its edge
      for (const sx of [-1, 1]) uqTri(G, [sx * (tw + 0.3), H, tz1], [sx * (tw + 0.3), H, tz0], [sx * (tw + 0.3), H + 60, tz0], [sx, 0, 0], _C(neon)); top = H + 60; }
    else if (v === 2) { for (const [y, s] of [[H, 1], [H + 3, 0.98]]) box5(G, -tw * s - 0.6, y, cz - td * s - 0.6, tw * s + 0.6, y + 1.6, cz + td * s + 0.6, _C(neon));   // a lit crown and a helipad
      T.prism(0, cz, Math.min(tw, td) * 0.7, H + 4.6, H + 6, _C('#5a5f69'), 18, Math.min(tw, td) * 0.7, true); box5(G, -6, H + 6, cz - 1.2, 6, H + 6.3, cz + 1.2, _C('#f2f2ee')); for (const sx of [-1, 1]) box5(G, sx * 6 - 1.2, H + 6, cz - 7, sx * 6 + 1.2, H + 6.3, cz + 7, _C('#f2f2ee')); top = H + 6; }
    else { const ap = [0, H + 70, cz]; for (const [a, b, n] of [[[-tw, H, tz1], [tw, H, tz1], [0, 0.6, 0.8]], [[tw, H, tz1], [tw, H, tz0], [0.8, 0.6, 0]], [[-tw, H, tz0], [-tw, H, tz1], [-0.8, 0.6, 0]], [[tw, H, tz0], [-tw, H, tz0], [0, 0.6, -0.8]]]) uqTri(T, a, b, ap, n, _C(shade(glass, 25))); top = H + 70; }   // a glass pyramid
    box5(G, -1.5, top, cz - 1.5, 1.5, top + 3, cz + 1.5, _C('#ff3b5c'));            // the warning light
    return uqParapet(T, U, 0, pz, 28, 13, 2 * hw - 16, c, neon);                      // the name over the podium's front
  },
  condo(T, G, U, hw, hd, H, c, neon) {     // a condo tower: balconies with glass rails across the front on every floor, a pool deck on the podium, a crown
    const tw = Math.min(hw - 6, 75), z0 = -hd + 6, z1 = Math.max(z0 + 40, hd - 30), wall = _C(c), rail = _C('#9fd8ff'), slab = _C('#f4f4f6');
    box5(T, -hw + 2, 0, -hd + 2, hw - 2, 14, hd - 4, _C(shade(c, -15))); box5(G, -18, 2, hd - 4, 18, 12, hd - 3.6, _C('#ffe9b0'));   // the podium, its lit lobby
    box5(T, -tw, 14, z0, tw, H, z1, wall);
    for (let y = 26; y < H - 8; y += 12) {
      box5(T, -tw - 1, y, z1, tw + 1, y + 1.2, z1 + 7, slab); box5(T, -tw - 1, y + 1.2, z1 + 6.4, tw + 1, y + 4.6, z1 + 7, rail);
      uqWindows(T, G, -tw, tw, y + 2, y + 10, z1 + 0.3, 12, '#1d2f4a', 0.35);
    }
    for (const sx of [-1, 1]) uqSideWindows(T, G, sx * (tw + 0.3), z0 + 4, z1 - 2, 26, H - 10, 12, sx, '#1d2f4a', 0.25);
    if (hd - 4 - (z1 + 8) > 14) { const pz0 = z1 + 9, pz1 = hd - 8; box5(T, -tw * 0.6, 14, pz0, tw * 0.6, 14.6, pz1, _C('#e8e4d8')); flat(G, -tw * 0.6 + 3, pz0 + 2, tw * 0.6 - 3, pz1 - 2, 14.8, _C('#3fd0ff'));   // the pool deck
      for (let x = -tw * 0.6 + 6; x < tw * 0.6 - 8; x += 12) box5(T, x, 14.6, pz1 + 0.5, x + 7, 16, pz1 + 3.5, _C(pick(['#ff7ab6', '#ffe14a', '#f4f4f6']))); }
    box5(T, -tw + 4, H, z0 + 4, tw - 4, H + 16, z1 - 3, _C(shade(c, -12))); box5(G, -tw + 3.6, H + 16, z0 + 3.6, tw - 3.6, H + 17.4, z1 - 2.6, _C(neon));   // the crown
    const s = uqFit(U.row.name, 11, 2 * tw - 14); return m => uqSign(m, U, U.row.name, neon, 0, H + 8, z1 - 2.7, s.h, false, true);   // the name on the crown's front
  },
  school(T, G, U, hw, hd, H, c, neon) {    // a school: two floors of classrooms, an entrance with a clock, the gym, a flagpole, the yellow bus, a court in the yard
    const fz = hd - 34, gx = hw * 0.35, wall = _C(c), trim = _C('#f4efe6');
    box5(T, -hw + 4, 0, -hd + 4, gx, H, fz, wall); box5(T, -hw + 3, H, -hd + 3, gx + 1, H + 2, fz + 1, trim);
    for (const y of [5, 19]) uqWindows(T, G, -hw + 8, gx - 4, y, y + 7, fz + 0.3, 11, '#2a3550', 0.25);
    const ex = (-hw + 4 + gx) / 2; box5(T, ex - 16, 0, fz, ex + 16, H + 8, fz + 6, trim); box5(G, ex - 7, 0, fz + 6, ex + 7, 13, fz + 6.4, _C('#cfe6ff'));   // the entrance
    uqDial(T, G, ex, H - 1, fz + 6.1, 5);                                                // its clock
    box5(T, gx + 4, 0, -hd + 4, hw - 4, H + 8, fz - 8, _C(shade(c, -20)));                   // the gym, a curved roof
    for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI, a1 = (k + 1) / 6 * Math.PI, w2 = (hw - gx - 8) / 2, xm = (gx + hw) / 2, p = (a, z) => [xm - Math.cos(a) * w2, H + 8 + Math.sin(a) * 10, z]; face(T, [p(a0, fz - 8), p(a1, fz - 8), p(a1, -hd + 4), p(a0, -hd + 4)], [-Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], _C(k % 2 ? '#b8bcc6' : '#a9aebb')); }
    T.prism(-hw + 12, hd - 8, 0.8, 0, 50, _C('#d8dce4'), 6); box5(T, -hw + 12.8, 42, hd - 8.4, -hw + 26, 49, hd - 7.6, _C('#e0364f'));   // the flagpole
    const bx = gx + 10; box5(T, bx, 0, hd - 22, Math.min(hw - 6, bx + 60), 13, hd - 10, _C('#ffc21a')); box5(T, bx + 2, 7, hd - 22.3, Math.min(hw - 8, bx + 56), 11, hd - 9.7, _C('#2a2d3a'));   // the yellow bus
    const cx0 = -hw + 34, cx1 = Math.min(gx - 10, cx0 + 70); if (cx1 - cx0 > 40) { const line = _C('#f4f4f6'); flat(T, cx0, fz + 10, cx1, hd - 6, 0.4, _C('#c9653a')); for (const [a, b, p, q] of [[cx0, fz + 10, cx1, fz + 11], [cx0, hd - 7, cx1, hd - 6], [cx0, fz + 10, cx0 + 1, hd - 6], [cx1 - 1, fz + 10, cx1, hd - 6], [(cx0 + cx1) / 2 - 0.5, fz + 10, (cx0 + cx1) / 2 + 0.5, hd - 6]]) flat(T, a, b, p, q, 0.5, line); }   // the court
    return m => uqSign(m, U, U.row.name, neon, ex, H + 3, fz + 6.4, Math.min(5, uqFit(U.row.name, 5, 30).h), false, true);   // over the entrance
  },
  arena(T, G, U, hw, hd, H, c, neon) {     // an arena: a round drum ringed with a lit glass concourse, a shallow dome, piers, a marquee pylon on the plaza
    const R = Math.min(hw - 10, hd - 30), cz = -hd + 8 + R, wall = _C(c), dh = H * 0.55;
    T.prism(0, cz, R, 0, dh, wall, 40); G.prism(0, cz, R + 0.4, 8, dh * 0.6, _C('#cfe6ff'), 40);
    T.prism(0, cz, R + 3, dh, dh + 5, _C(shade(c, -22)), 40, R + 3, true); G.prism(0, cz, R + 3.4, dh + 1, dh + 3, _C(neon), 40);
    T.prism(0, cz, R, dh + 5, H - 8, _C('#d8dce4'), 40, R * 0.5); T.prism(0, cz, R * 0.5, H - 8, H, _C('#c8ccd6'), 40, R * 0.18, true);   // the dome
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, px = Math.cos(a) * (R + 1), pz = cz + Math.sin(a) * (R + 1); box5(T, px - 4, 0, pz - 4, px + 4, dh, pz + 4, _C(shade(c, -10))); }   // piers round it
    for (let x = -hw + 24; x < hw - 20; x += 46) { T.prism(x, hd - 24, 0.8, 0, 26, _C('#2a2d3a'), 6); box5(G, x - 2.6, 25, hd - 26.6, x + 2.6, 27.6, hd - 21.4, _C('#ffe9a8')); }   // plaza lamps
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) T.prism(sx * (R * 0.75 + k * 18), cz + R + 10, 6, 0, 4, _C('#7a8a6a'), 10, 6, true);   // planters
    return uqPylon(T, U, 0, hd - 10, 14, 24, Math.min(2 * hw - 30, 170), '#2a2d3a', neon);   // the marquee on the plaza
  },
  garage(T, G, U, hw, hd, H, c, neon) {    // a parking garage: open decks on columns, cars parked up there, a stair tower, the name over the way in
    const n = Math.max(3, Math.round(H / 14)), dh = H / n, x0 = -hw + 3, x1 = hw - 3, z0 = -hd + 3, z1 = hd - 3, conc = _C(c), edge = _C(shade(c, -14));
    for (let k = 1; k <= n; k++) {
      const y = k * dh; box5(T, x0, y - 2.2, z0, x1, y, z1, conc);
      for (const [a, b, p, q] of [[x0, z1 - 1.4, x1, z1], [x0, z0, x1, z0 + 1.4], [x0, z0, x0 + 1.4, z1], [x1 - 1.4, z0, x1, z1]]) box5(T, a, y, b, p, y + 4.4, q, edge);
      box5(G, x0 + 4, y - 2.6, z1 - 3, x1 - 4, y - 2.2, z1 - 2, _C('#fff3b0'));                    // lights under the deck
      for (let x = x0 + 14; x < x1 - 12; x += 22) for (const zz of [z1 - 16, z0 + 16]) if (Math.random() < (k === n ? 0.45 : 0.6)) uqCar(T, x, zz, y, false);
    }
    for (let x = x0 + 2; x <= x1 - 2; x += Math.max(30, (x1 - x0 - 4) / Math.max(1, Math.round((x1 - x0) / 40)))) for (const z of [z0 + 2, (z0 + z1) / 2, z1 - 2]) box5(T, x - 1.8, 0, z - 1.8, x + 1.8, H, z + 1.8, conc);   // columns
    box5(T, x1 - 18, 0, z0, x1, H + 14, z0 + 18, _C(shade(c, -24))); box5(G, x1 - 18.3, 6, z0 + 6, x1 - 18, H + 10, z0 + 12, _C('#cfe6ff'));   // the stair tower
    box5(T, -24, 0, z1 - 0.6, 24, 3, z1, _C('#ffd23f'));                              // the way in
    return uqParapet(T, U, 0, z1, H + 4.4, 11, 2 * hw - 30, c, neon);
  },
  gas(T, G, U, hw, hd, H, c, neon) {       // a gas station: the shop at the back, a canopy over the pumps out front, the price pylon at the corner
    const kz = -hd + Math.min(46, hd * 0.45), cw = Math.min(hw - 14, 72), cz0 = kz + 16, cz1 = hd - 12, white = _C('#f4f4f6');
    box5(T, -hw + 6, 0, -hd + 4, hw * 0.4, 18, kz, _C(c)); box5(G, -hw + 12, 3, kz, hw * 0.4 - 6, 13, kz + 0.4, _C('#ffe9b0')); box5(T, -hw + 5, 18, -hd + 3, hw * 0.4 + 1, 20, kz + 1, _C('#3a3d47')); box5(G, -hw + 4.6, 18.4, kz + 1, hw * 0.4 + 1.4, 19.6, kz + 1.4, _C(neon));   // the shop, a neon line along its roof
    box5(T, -cw, H - 4, cz0, cw, H, cz1, white); for (const [a, b, p, q] of [[-cw - 0.4, cz1, cw + 0.4, cz1 + 0.4], [-cw - 0.4, cz0 - 0.4, cw + 0.4, cz0], [-cw - 0.4, cz0, -cw, cz1], [cw, cz0, cw + 0.4, cz1]]) box5(G, a, H - 3.4, b, p, H - 0.6, q, _C(neon));   // the canopy, lit round its edge
    flat(G, -cw + 4, cz0 + 4, cw - 4, cz1 - 4, H - 4.2, _C('#fff6d8'));
    for (const z of [cz0 + 3, cz1 - 7]) flat(T, -cw, z, cw, z + 4, H + 0.1, _C(c));                         // the brand's stripes across the canopy's top
    for (const x of [-cw * 0.5, cw * 0.5]) { const mz = (cz0 + cz1) / 2; T.prism(x, mz, 2, 0, H - 4, white, 8); box5(T, x - 5, 0, mz - 14, x + 5, 1.2, mz + 14, _C('#c8ccd4'));
      for (const z of [mz - 8, mz + 8]) { box5(T, x - 2.4, 1.2, z - 3, x + 2.4, 10, z + 3, _C(c)); box5(G, x - 2.6, 6, z - 1.6, x + 2.6, 8.6, z + 1.6, _C('#9fd8ff')); } }   // pump islands
    return uqAll(uqPylon(T, U, hw - 18, hd - 6, 22, 8, 34, '#2a2d3a', neon), m => uqSign(m, U, U.row.name, neon, 0, H - 2, cz1 + 0.5, Math.min(3, uqFit(U.row.name, 3, 2 * cw - 10).h), false, true));
  },
  museum(T, G, U, hw, hd, H, c, neon) {    // a museum: white galleries stacked out over a glass hall, gardens hanging off them - or, for science, a planetarium dome and a rocket out front
    const fz = hd - 26, white = _C(c), green = _C('#3f8a4a');
    if (/SCIENCE/.test(U.row.name)) {
      box5(T, -hw + 4, 0, -hd + 4, hw - 4, H * 0.55, fz, white); box5(G, -hw + 10, 3, fz, hw - 10, H * 0.4, fz + 0.4, _C('#cfe6ff'));
      const R = Math.min(hw * 0.32, (fz + hd) * 0.32), dx = -hw * 0.35, dz = (-hd + fz) / 2;
      T.prism(dx, dz, R, H * 0.55, H * 0.55 + 8, _C('#e8e8ee'), 24); T.prism(dx, dz, R, H * 0.55 + 8, H * 0.55 + 8 + R * 0.45, _C('#d0d4dc'), 24, R * 0.75); T.prism(dx, dz, R * 0.75, H * 0.55 + 8 + R * 0.45, H * 0.55 + 8 + R * 0.75, _C('#c0c4ce'), 24, R * 0.3, true);
      const rx = hw - 20, rz = hd - 12; T.prism(rx, rz, 4, 0, 60, _C('#f4f4f6'), 12); T.prism(rx, rz, 4, 60, 74, _C('#e0364f'), 12, 0.4, true); for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; box5(T, rx + Math.cos(a) * 4 - 1, 0, rz + Math.sin(a) * 4 - 1, rx + Math.cos(a) * 9 + 1, 14, rz + Math.sin(a) * 9 + 1, _C('#2a2d3a')); }   // a rocket on its fins
      return uqPylon(T, U, -hw * 0.25, hd - 8, 0, 9, Math.min(2 * hw * 0.5, 90), '#f4f4f6', neon);
    }
    box5(G, -hw + 8, 0, -hd + 8, hw - 8, 14, fz - 4, _C('#cfe6ff'));                   // the glass hall
    const boxes = [[-hw + 4, -hd + 4, hw * 0.25, fz, 14, H * 0.55], [-hw * 0.35, -hd + 10, hw - 4, fz - 10, H * 0.55, H]];
    for (const [a, b, p, q, y0, y1] of boxes) { box5(T, a, y0, b, p, y1, q, white); for (let x = a + 3; x < p - 3; x += 7) if (Math.random() < 0.6) box5(T, x, y1 - 1, q, x + 4, y1 + 1.5, q + 2.5, green); flat(T, a + 3, b + 3, p - 3, q - 3, y1 + 0.3, green); }   // galleries, their roof gardens and hanging plants
    for (const sx of [-1, 1]) T.prism(sx * hw * 0.3, -hd + 30, 1.2, 0, 14, _C('#d8dce4'), 6);
    return uqPylon(T, U, 0, hd - 8, 0, 9, Math.min(2 * hw * 0.6, 110), '#f4f4f6', neon);   // the name on a low wall by the street
  },
  civic(T, G, U, hw, hd, H, c, neon) {     // a civic building: the bank's steps, columns and frieze, and the mark of what it is - a dome, a clock tower, flags, a reading lawn
    const post = UQ_MODELS.bank(T, G, U, hw, hd, H, c, neon), n = U.row.name, fz = hd - 18, stone = _C(c);
    if (/CITY HALL/.test(n)) { const R = Math.min(hw * 0.28, 30), z = -hd * 0.25; T.prism(0, z, R, H, H + 14, stone, 20); T.prism(0, z, R, H + 14, H + 14 + R * 0.7, _C('#c9b26a'), 20, R * 0.35); T.prism(0, z, R * 0.3, H + 14 + R * 0.7, H + 26 + R * 0.7, stone, 10, R * 0.3, true);
      T.prism(0, z, 0.6, H + 26 + R * 0.7, H + 46 + R * 0.7, _C('#d8dce4'), 6); box5(T, 0.6, H + 38 + R * 0.7, z - 0.4, 14, H + 45 + R * 0.7, z + 0.4, _C('#2a4aa8')); }   // the dome and its flag
    else if (/COURT/.test(n)) { const z = -hd * 0.2; box5(T, -14, H, z - 14, 14, H + 40, z + 14, stone); uqDial(T, G, 0, H + 28, z + 14, 9); T.prism(0, z, 16, H + 40, H + 54, _C(shade(c, -30)), 4, 0.5, true); }   // the clock tower
    else if (/FBI/.test(n)) { const y = H - 16, z = hd + 0.8; for (let k = 0; k < 20; k++) { const a0 = k / 20 * TAU, a1 = (k + 1) / 20 * TAU;   // the seal over the door: a blue disc in a gold ring
        face(G, [[0, y, z], [Math.cos(a0) * 9, y + Math.sin(a0) * 9, z], [Math.cos(a1) * 9, y + Math.sin(a1) * 9, z], [0, y, z]], [0, 0, 1], _C('#1a3a8a'));
        face(G, [[Math.cos(a0) * 9, y + Math.sin(a0) * 9, z + 0.1], [Math.cos(a0) * 11, y + Math.sin(a0) * 11, z + 0.1], [Math.cos(a1) * 11, y + Math.sin(a1) * 11, z + 0.1], [Math.cos(a1) * 9, y + Math.sin(a1) * 9, z + 0.1]], [0, 0, 1], _C('#d4a020')); }
      box5(G, -1.2, y - 5, z, 1.2, y + 5, z + 0.3, _C('#d4a020')); box5(G, -5, y - 1, z, 5, y + 1, z + 0.3, _C('#d4a020'));
      for (const sx of [-1, 1]) { T.prism(sx * (hw - 10), hd - 6, 0.7, 0, 50, _C('#d8dce4'), 6); box5(T, sx * (hw - 10) + 0.7, 42, hd - 6.4, sx * (hw - 10) + 14, 49, hd - 5.6, _C('#2a4aa8')); } }   // two flagpoles
    else if (/POST/.test(n)) { for (const sx of [-1, 1]) { T.prism(sx * (hw - 10), hd - 6, 0.7, 0, 46, _C('#d8dce4'), 6); box5(T, sx * (hw - 10) + 0.7, 38, hd - 6.4, sx * (hw - 10) + 14, 45, hd - 5.6, _C(sx < 0 ? '#2a4aa8' : '#e0364f')); }
      for (const x of [-hw * 0.5, hw * 0.5]) { box5(T, x - 3, 0, hd - 4, x + 3, 9, hd - 1, _C('#2a4aa8')); } }   // flags and mailboxes
    else { for (let k = 0; k < 4; k++) { const x = -hw + 20 + k * (2 * hw - 40) / 3; box5(T, x - 8, 0, fz + 18, x + 8, 3.4, fz + 21, _C('#7a5a3a')); } const v0 = T.pos.length / 3; const cy = pineCol('#2f7a4a'); T.prism(-hw * 0.4, -hd + 20, 12, 0, 38, _C(cy), 8, 2, true); treeNote(T, v0, { x: -hw * 0.4, z: -hd + 20, r: 12, th: 38, kind: 'cone', tc: cy, cc: cy }); }   // benches, a tree
    return post;
  },
  market(T, G, U, hw, hd, H, c, neon) {    // a supermarket: a big box at the back, a tall entrance with the name, stripes, cart corrals and its car park in front
    const bz = -hd + Math.max(60, (2 * hd) * 0.55), wall = _C(c), line = _C('#f4f4f6');
    box5(T, -hw + 4, 0, -hd + 4, hw - 4, H, bz, wall); for (const [y, col] of [[H - 8, neon], [H - 5, '#ffd23f']]) box5(T, -hw + 3.6, y, bz, hw - 3.6, y + 2, bz + 0.6, _C(col));
    box5(T, -34, 0, bz - 4, 34, H + 16, bz + 4, _C(shade(c, -24))); box5(G, -24, 0, bz + 4, 24, 14, bz + 4.4, _C('#cfe6ff'));   // the entrance
    for (let x = -hw + 14; x < hw - 14; x += 26) { flat(T, x, bz + 18, x + 1, hd - 8, 0.4, line); }
    for (const x of [-hw * 0.6, hw * 0.6]) { box5(T, x - 10, 0, bz + 30, x + 10, 6, bz + 32, _C('#9aa0ab')); for (let k = 0; k < 4; k++) box5(T, x - 8 + k * 4, 0, bz + 32.5, x - 5 + k * 4, 5, bz + 38, _C('#c8ccd4')); }   // cart corrals
    const s = uqFit(U.row.name, Math.min(14, H + 2), 64); return m => uqSign(m, U, U.row.name, neon, 0, 16 + s.h / 2, bz + 4.4, s.h, false, true);
  },
  carwash(T, G, U, hw, hd, H, c, neon) {   // a car wash: an open tunnel along the street with brushes inside, vacuum posts, its name on the roof's front
    const tl = Math.min(hw - 8, 90), tz0 = -hd + 6, tz1 = tz0 + 40, wall = _C(c);
    box5(T, -tl, 0, tz0, tl, H - 3, tz0 + 3, wall); box5(T, -tl - 2, H - 3, tz0 - 1, tl + 2, H, tz1 + 2, wall);   // back wall and roof
    for (let x = -tl; x <= tl; x += tl / 3) box5(T, x - 1.5, 0, tz1 - 1.5, x + 1.5, H - 3, tz1 + 1.5, _C(shade(c, -20)));
    for (const [x, col] of [[-tl * 0.5, '#2bf3ff'], [-tl * 0.15, '#ff2bd6'], [tl * 0.2, '#2bf3ff'], [tl * 0.55, '#ffe14a']]) for (const z of [tz0 + 9, tz1 - 9]) T.prism(x, z, 5, 1, H - 5, _C(col), 10);   // the brushes
    box5(G, -tl, H - 3.4, tz1 + 2, tl, H - 2.4, tz1 + 2.4, _C(neon));
    for (let k = 0; k < 9; k++) disc(T, -tl + 12 + (2 * tl - 24) * ((k * 0.37) % 1), tz0 + 6 + (tz1 - tz0 - 10) * ((k * 0.61) % 1), 4 + (k % 3) * 2.5, H + 0.1 + k * 0.02, _C(['#ffffff', '#bff6ff', '#ffc8f0'][k % 3]), 14);   // bubbles painted on the roof
    for (let x = -hw + 14; x < hw - 14; x += 24) { box5(T, x - 1.5, 0, hd - 14, x + 1.5, 14, hd - 11, _C('#ffd23f')); box5(T, x - 4, 12, hd - 15, x + 4, 15, hd - 10, _C('#2a2d3a')); }   // vacuum posts
    return uqParapet(T, U, 0, tz1 + 2, H, 10, 2 * tl - 10, c, neon);
  },
  bowling(T, G, U, hw, hd, H, c, neon) {   // a Googie bowling alley: a long hall with a zig-zag roof edge, a giant pin by the door, a starburst on its pylon
    const fz = hd - 22, wall = _C(c);
    box5(T, -hw + 4, 0, -hd + 4, hw - 4, H, fz, wall);
    for (let x = -hw + 4, k = 0; x < hw - 4; x += 16, k++) face(T, [[x, H, fz + 6], [Math.min(hw - 4, x + 16), H, fz + 6], [Math.min(hw - 4, x + 16), H + (k % 2 ? 10 : 2), fz - 4], [x, H + (k % 2 ? 2 : 10), fz - 4]], [0, 0.7, 0.7], _C(k % 2 ? '#f4f4f6' : neon));   // the zig-zag roof edge
    box5(G, -20, 0, fz, 20, 14, fz + 0.4, _C('#cfe6ff'));
    const px = -hw + 18, pz = fz + 10;                                                 // the giant pin
    for (const [y0, y1, r0, r1, col] of [[0, 6, 4, 7, '#f4f4f6'], [6, 18, 7, 7, '#f4f4f6'], [18, 21, 7, 5.5, '#e0364f'], [21, 26, 5.5, 3.6, '#f4f4f6'], [26, 30, 3.6, 4.6, '#f4f4f6'], [30, 34, 4.6, 0.5, '#f4f4f6']]) T.prism(px, pz, r0, y0, y1, _C(col), 12, r1, y1 === 34);
    const sx2 = hw - 26; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; box5(G, sx2 + Math.cos(a) * 2 - 0.6, 48 + Math.sin(a) * 2 - 0.6, hd - 7, sx2 + Math.cos(a) * 9 + 0.6, 48 + Math.sin(a) * 9 + 0.6, hd - 6, _C('#ffe14a')); }   // the starburst
    return uqPylon(T, U, sx2, hd - 6, 18, 12, 50, '#2a2d3a', neon);
  },
});

Object.assign(UQ_SOLIDS, {                // the new kinds that leave part of the lot open (lot frame: x0, z0, x1, z1)
  school(U, hw, hd) { const fz = hd - 34; return [[-hw + 4, -hd + 4, hw - 4, fz + 6], [-hw + 11, hd - 9, -hw + 13, hd - 7]]; },
  arena(U, hw, hd) { const R = Math.min(hw - 10, hd - 30), cz = -hd + 8 + R, s = uqFit(U.row.name, 24, Math.min(2 * hw - 30, 170)); return [[-R - 5, cz - R - 5, R + 5, cz + R + 5], [-s.w / 2 - 2, hd - 12, s.w / 2 + 2, hd - 8]]; },
  gas(U, hw, hd) { const kz = -hd + Math.min(46, hd * 0.45), cw = Math.min(hw - 14, 72), mz = (kz + 16 + hd - 12) / 2; return [[-hw + 6, -hd + 4, hw * 0.4, kz], [-cw * 0.5 - 5, mz - 14, -cw * 0.5 + 5, mz + 14], [cw * 0.5 - 5, mz - 14, cw * 0.5 + 5, mz + 14]]; },
  museum(U, hw, hd) { return [[-hw + 4, -hd + 4, hw - 4, hd - 26]]; },
  market(U, hw, hd) { const bz = -hd + Math.max(60, (2 * hd) * 0.55); return [[-hw + 4, -hd + 4, hw - 4, bz + 4]]; },
  carwash(U, hw, hd) { const tl = Math.min(hw - 8, 90), tz0 = -hd + 6, tz1 = tz0 + 40, o = [[-tl, tz0, tl, tz0 + 3]]; for (let x = -tl; x <= tl + 0.1; x += tl / 3) o.push([x - 1.5, tz1 - 1.5, x + 1.5, tz1 + 1.5]); return o; },
  bowling(U, hw, hd) { const fz = hd - 22; return [[-hw + 4, -hd + 4, hw - 4, fz], [-hw + 11, fz + 3, -hw + 25, fz + 17]]; },
});
Object.assign(UQ_FRONT, {                 // and where a side-on front gets its blade (js/10n uqBlade)
  sky: (hw, hd) => [hw - 6, hd - 4, 30], condo: (hw, hd) => [hw - 6, hd - 4, 16], school: (hw, hd) => [hw * 0.35 - 4, hd - 34, 14], garage: (hw, hd) => [hw - 5, hd - 3, 16],
  civic: (hw, hd) => [hw - 8, hd - 6, 22], market: (hw, hd) => [hw - 8, -hd + Math.max(60, (2 * hd) * 0.55), 14], carwash: (hw, hd) => [Math.min(hw - 8, 90), -hd + 48, 12] });

Object.assign(UQ_SITE, {                  // the arena takes a park of its own: the middle of a big park, its plaza toward the street it faces
  arena(row, used) {
    let best = null;
    for (const g of MAP.grass) {
      if (g.k === 'wood') continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (w < 420 || h < 420 || w > 900 || h > 900 || inLandmark(cx, cy) || UQ_NOT.includes(districtAt(cx, cy)) || used.some(u => dist(u.r.cx, u.r.cy, cx, cy) < 600)) continue;
      let S = 0;                                                                     // the biggest square in the middle that stays on the grass and off the streets
      for (let s = 320; s <= Math.min(w, h) - 30; s += 20) {
        let ok = true; for (let i = 0; i <= 6 && ok; i++) for (let j = 0; j <= 6 && ok; j++) { const x = cx - s / 2 + s * i / 6, y = cy - s / 2 + s * j / 6; ok = inPoly(x, y, g) && !nearestRoad(x, y, ROAD_HALF + SW_W + 6); }
        if (!ok) break; S = s;
      }
      if (S >= 360 && (!best || S > best.S)) best = { cx, cy, S };
    }
    if (!best) return null;
    const { cx, cy, S } = best; let door = null;
    for (const [fx, fy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {                   // it faces the nearest street (not one to the north if it can help it)
      const rd = nearestRoad(cx + fx * (S / 2 + 20), cy + fy * (S / 2 + 20), 400); if (!rd) continue;
      const d = rd.d + (fy < -0.5 ? 300 : 0); if (!door || d < door.d) door = { x: cx + fx * S / 2, y: cy + fy * S / 2, fx, fy, d };
    }
    if (!door) return null;
    const a = Math.atan2(-door.fx, door.fy), r = { cx, cy, lw: S, lh: S, a, ca: Math.cos(a), sa: Math.sin(a), H: 96, site: true };
    LM_CLEAR.push([cx, cy, S / 2 + 10, S / 2 + 10]);
    return { r, door, W: S, D: S, dname: districtAt(cx, cy) || '', beach: false };
  },
});
