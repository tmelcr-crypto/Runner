'use strict';
/* ---------- 7p. 120 UNIQUE BUILDINGS ----------
   The unique buildings table (js/01r): each row takes the lot of an ordinary building that faces a street - its front not to the north,
   where the camera would see only its back, the right size for its kind, in a district that suits it, hotels, motels, clubs and diners
   near a sand beach first, never too close to another, at least one in every district with a lot that suits - and stands there as its own model in the building's footprint (solid as before,
   or only where it stands when it leaves part of the lot open: a diner's car park, a motel's pool court, a villa's courtyard, a church's lawn): Art Deco and Streamline hotels, MiMo motels,
   Mediterranean villas, diners, cinemas, banks, churches, nightclubs, shops and offices, each in its colours with its name in neon.
   The SEA BREEZE stands where its name was, by the old start. Picked once with the city (js/04 genWorld), always the same lots;
   streamed like the landmarks. Scenery: both modes.
   Each model is built in the lot's frame: x along the street (width W), z from the back to the front (depth D), the front at z = D/2. */
let UNIQUES = [];
const UQ_FIT = {                          // kind: front width and depth (game units, 12 to a metre), where it likes to stand
  deco: { w: [90, 230], d: 70, beach: true }, streamline: { w: [100, 250], d: 80, beach: true }, mimo: { w: [130, 320], d: 70, beach: true },
  med: { w: [80, 230], d: 70, dist: ['PEARL KEY', 'FAIRWAY ISLES', 'HERON KEY', 'GULL ROCKS', 'CORAL SHORE', 'THE SANDBAR', 'SEAVIEW'] },
  diner: { w: [50, 140], d: 40, beach: true }, cinema: { w: [70, 180], d: 80, dist: ['PALM HEIGHTS', 'MERCADO', 'SUNSTRIP', 'SEAVIEW', 'CORAL SHORE'] },
  bank: { w: [70, 180], d: 60, dist: ['PALM HEIGHTS', 'SEAVIEW', 'SUNSTRIP', 'MERCADO'] }, church: { w: [60, 160], d: 80 },
  club: { w: [60, 180], d: 60, beach: true }, shop: { w: [40, 120], d: 40 }, office: { w: [80, 220], d: 80, dist: ['PALM HEIGHTS', 'SEAVIEW', 'SUNSTRIP'] } };
const UQ_NOT = ['DOCKSIDE', 'GRAVEL FLATS', 'SKYPORT', 'OPEN WATER'];

function placeUniques() {                 // js/04 genWorld, after the safehouses
  UNIQUES = []; if (typeof UNIQUE_TABLE === 'undefined') return;
  withSeed(12012, () => {
    const cand = [], R = UNIQ.beach * 12, sand = [];                                 // the beachfront: this close to a sand beach (not just any shore)
    for (const g of MAP.sand) for (const ring of [g.o, ...(g.h || [])]) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of ring) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } sand.push({ ring, bb: [x0 - R, y0 - R, x1 + R, y1 + R] }); }
    const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const nearSand = (x, y) => sand.some(({ ring, bb }) => x > bb[0] && x < bb[2] && y > bb[1] && y < bb[3] && ring.some((a, k) => segD(x, y, a, ring[(k + 1) % ring.length]) < R));
    for (const r of BLD) {
      if (r.special || r.safe || r.own || r.off || inLandmark(r.cx, r.cy)) continue;
      const dname = districtAt(r.cx, r.cy); if (UQ_NOT.includes(dname)) continue;
      const door = uqDoor(r); if (!door || (door.fy < -0.6 && r.sign !== 'SEA BREEZE')) continue;   // a front facing north would show the camera only its back
      const alongU = Math.abs(door.fx * r.ca + door.fy * r.sa) > 0.7;              // the front is one of the box's x sides: the street runs along its depth
      cand.push({ r, door, W: alongU ? r.lh : r.lw, D: alongU ? r.lw : r.lh, dname, beach: nearSand(r.cx, r.cy), k: Math.random() });
    }
    cand.sort((a, b) => a.k - b.k);
    const used = [], far = UNIQ.spacing * 12, ok = c => !c.taken && used.every(u => dist(u.r.cx, u.r.cy, c.r.cx, c.r.cy) > far);
    const take = (row, c) => { c.taken = true; c.row = row; used.push(c); UNIQUES.push(uniqueSite(row, c)); };
    const rows = UNIQUE_TABLE.buildings, hotels = rows.filter(r => r.kind === 'deco' || r.kind === 'streamline' || r.kind === 'mimo');
    const nBeach = Math.round(hotels.length * UNIQ.beachFirst / 100); let hotelN = 0;
    for (const row of rows) {
      const F = UQ_FIT[row.kind] || UQ_FIT.shop;
      if (row.id === 'sea_breeze') { const c = cand.find(o => o.r.sign === 'SEA BREEZE'); if (c && !c.taken) { take(row, c); continue; } }
      const fits = c => c.W >= F.w[0] && c.W <= F.w[1] && c.D >= F.d && ok(c);
      const isHotel = hotels.includes(row), wantBeach = isHotel ? hotelN++ < nBeach : F.beach;
      let c = null;
      if (wantBeach) c = cand.find(o => o.beach && fits(o));
      if (!c && F.dist) c = cand.find(o => F.dist.includes(o.dname) && fits(o));
      if (!c) c = cand.find(fits);
      if (c) take(row, c);
    }
    const count = d => used.filter(u => u.dname === d).length;                        // every district with a lot that suits gets one, moved from the busiest
    for (const d of [...new Set(cand.map(c => c.dname))].sort()) {
      if (count(d) > 0) continue;
      const movers = used.filter(u => u.row.id !== 'sea_breeze' && count(u.dname) >= 3).sort((a, b) => count(b.dname) - count(a.dname) || (((UQ_FIT[b.row.kind] || {}).dist || []).includes(d) ? 1 : 0) - (((UQ_FIT[a.row.kind] || {}).dist || []).includes(d) ? 1 : 0));
      for (const u of movers) {
        const F = UQ_FIT[u.row.kind] || UQ_FIT.shop;
        const c = cand.find(o => o.dname === d && !o.taken && o.W >= F.w[0] && o.W <= F.w[1] && o.D >= F.d && used.every(v => v === u || dist(v.r.cx, v.r.cy, o.r.cx, o.r.cy) > far));
        if (!c) continue;
        const i = used.indexOf(u); u.taken = false; c.taken = true; c.row = u.row; used[i] = c; UNIQUES[i] = uniqueSite(u.row, c); break;
      }
    }
  });
  for (const U of UNIQUES) {
    const r = U.r; r.uniq = U.row.id; r.sign = null;
    if (r.fill) r.own = true;                                                         // out of the merged fill chunks (js/10c)
    LMS.push(U.lm = { cx: r.cx, cy: r.cy, a: U.a, rad: Math.hypot(U.W, U.D) / 2 + 80, make: () => withSeed(U.seed, () => makeUnique(U)), mesh: null });
    const S = UQ_SOLIDS[U.row.kind] && UQ_SOLIDS[U.row.kind](U, U.W / 2, U.D / 2);       // a model that leaves part of the lot open: solid only where it stands
    if (S) { r.off = true; const ca = Math.cos(U.a), sa = Math.sin(U.a); for (const [x0, z0, x1, z1] of S) { const lx = (x0 + x1) / 2, lz = (z0 + z1) / 2; makeSolid(r.cx + ca * lx - sa * lz, r.cy + sa * lx + ca * lz, x1 - x0, z1 - z0, U.a, {}); } }
  }
}
function uqDoor(r) {                     // the side that faces a street (js/10l); failing that - a villa or a hotel set back from the road - the side nearest one
  const d = towerDoor(r); if (d) return d;
  let best = null;
  for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const hx = u * r.lw / 2, hz = v * r.lh / 2, fx = r.ca * u - r.sa * v, fy = r.sa * u + r.ca * v;
    const x = r.cx + r.ca * hx - r.sa * hz + fx * 12, y = r.cy + r.sa * hx + r.ca * hz + fy * 12, rd = nearestRoad(x, y, 700);
    if (!rd || RE[rd.e].nt || pedBlocked(x, y) || inLandmark(x, y) || ((rd.x - x) * fx + (rd.y - y) * fy) / (rd.d || 1) < 0.5) continue;
    if (!best || rd.d < best.d) best = { x, y, fx, fy, e: rd.e, s: rd.s, d: rd.d, side: u ? r.lh : r.lw, setback: true };
  }
  return best;
}
function uniqueSite(row, c) {
  const { r, door } = c, a = Math.atan2(-door.fx, door.fy);                          // the mesh's +z is the front, toward the street
  const H = { deco: rand(50, 80), streamline: rand(60, 100), mimo: 34, med: rand(36, 60), diner: 20, cinema: rand(46, 62), bank: rand(40, 56), church: 40, club: rand(30, 42), shop: rand(24, 38), office: rand(120, 210) }[row.kind] || 40;
  r.H = row.kind === 'church' ? 90 : H;
  return { row, r, W: c.W, D: c.D, H, a, door, side: Math.random() < 0.5 ? -1 : 1, seed: 12100 + row.id.length * 31 + Math.round(r.cx) % 997, lm: null };
}

/* ---------- signs: neon letters on a dark panel, turned toward the camera ---------- */
const _uqt = {};
function uqTex(text, col, vertical) {
  const k = text + col + (vertical ? 'v' : ''); if (_uqt[k]) return _uqt[k];
  const n = text.length, c = document.createElement('canvas'); c.width = vertical ? 128 : Math.max(256, 74 * n); c.height = vertical ? 92 * n + 24 : 128;
  const g = c.getContext('2d'); g.fillStyle = '#0d0818'; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 14; g.strokeRect(6, 6, c.width - 12, c.height - 12);
  g.font = 'bold 76px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const put = (ch, x, y) => { g.shadowBlur = 22; g.fillStyle = col; g.fillText(ch, x, y); g.shadowBlur = 4; g.fillStyle = '#ffffff'; g.globalAlpha = 0.75; g.fillText(ch, x, y); g.globalAlpha = 1; };
  if (vertical) [...text].forEach((ch, i) => put(ch, 64, 58 + i * 92)); else { let fs = 76; while (g.measureText(text).width > c.width - 40 && fs > 30) { fs -= 4; g.font = 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; } put(text, c.width / 2, 68); }
  return (_uqt[k] = finishTex(c));
}
function uqSign(m, U, text, col, x, y, z, h, vertical, flat) {   // a sign h high; flat: on the facade (faces the front), else turned to the camera
  const t = uqTex(text, col, vertical), asp = t.image.width / t.image.height, maxW = U.W * 1.15; if (!vertical && h * asp > maxW) h = Math.max(9, maxW / asp); const w = h * asp;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true }));
  s.position.set(x, y, z); if (!flat) { s.rotation.order = 'YXZ'; s.rotation.set(-(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180) * 0.75, U.a, 0); }
  m.add(s); m.userData.own.push(s.material); return s;
}

/* ---------- helpers for the models ---------- */
function uqWindows(T, G, x0, x1, y0, y1, z, bay, col, lit) {      // a row of windows on the front face (z), some lit
  for (let x = x0 + bay / 2; x < x1 - bay / 3; x += bay) { const on = Math.random() < lit; face(on ? G : T, [[x - bay * 0.3, y0, z], [x + bay * 0.3, y0, z], [x + bay * 0.3, y1, z], [x - bay * 0.3, y1, z]], [0, 0, 1], _C(on ? '#ffd98a' : col)); }
}
function uqSideWindows(T, G, x, z0, z1, y0, y1, bay, sx, col, lit) {
  for (let z = z0 + bay / 2; z < z1 - bay / 3; z += bay) { const on = Math.random() < lit; face(on ? G : T, [[x, y0, z - bay * 0.3], [x, y0, z + bay * 0.3], [x, y1, z + bay * 0.3], [x, y1, z - bay * 0.3]], [sx, 0, 0], _C(on ? '#ffd98a' : col)); }
}
function uqBox(T, U, x0, z0, x1, z1, H, col) { box5(T, x0, 0, z0, x1, H, z1, _C(col)); }
function uqPalm(T, x, z, h) { palm(T, x, z, h); }

/* ---------- the models, one family each ---------- */
function makeUnique(U) {
  const T = new GeoBuilder(), G = new GeoBuilder(), W = U.W, D = U.D, H = U.H, row = U.row, f = UQ_MODELS[row.kind] || UQ_MODELS.shop;
  const post = f(T, G, U, W / 2, D / 2, H, row.c, row.neon);
  const m = lmMesh(T, G); if (post) post(m);
  const B = new GeoBuilder(); box5(B, -W / 2, 0, -D / 2, W / 2, SIDE_H + 0.2, D / 2, _C(UQ_GROUND[row.kind] || '#8a8494'));   // the lot: paving, a lawn, a car park...
  const base = lmMesh(B, new GeoBuilder()), g = new THREE.Group(); g.add(base, m); m.position.y = SIDE_H; g.userData.own = m.userData.own.concat(base.userData.own);
  return g;
}
const UQ_GROUND = { diner: '#3a3d47', church: '#2f7a4a', med: '#d8c4a0', mimo: '#cfc8b8' };
const UQ_SOLIDS = {                       // the boxes that stand (lot frame: x0, z0, x1, z1) for the models that leave part of the lot open
  mimo(U, hw, hd) { const bz = hd - Math.min(46, hd * 0.45), pz = (bz + hd) / 2, o = [[-hw, -hd, hw, bz]]; if (hd - bz > 16) o.push([-hw * 0.5, pz - 9, hw * 0.3, pz + 13]); o.push([hw - 18, hd - 10, hw - 14, hd - 6]); return o; },
  med(U, hw, hd) { const fz = hd - 16, cz = (fz + hd) / 2, tx = U.side * (hw - 14); return [[-hw, -hd, hw, fz + 1], [tx - 12, fz - 26, tx + 12, fz + 2], [-hw * 0.3 - 6, cz - 6, -hw * 0.3 + 6, cz + 6]]; },
  diner(U, hw, hd) { const L = Math.min(hw - 4, 64), dd = Math.min(hd - 4, 22); return [[-L, hd - dd * 2 - 6, L, hd - 6], [-6, hd - 6, 6, hd]]; },
  church(U, hw, hd) { const nw = Math.min(hw - 4, 40), fz = hd - 6, tx = U.side * (nw + 10), o = [[-nw, -hd, nw, fz + 1]]; if (Math.abs(tx) + 10 < hw) o.push([tx - 10, fz - 22, tx + 10, fz - 2]); return o; },
};
const UQ_MODELS = {
  deco(T, G, U, hw, hd, H, c, neon) {      // Art Deco hotel: a terrace at the front, eyebrows over the windows, a finned centre tower, a ziggurat top
    const fz = hd - 12, acc = shade(c, -28), trim = '#f4f4f6', side = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0, tw = Math.max(18, hw * 0.42), tx = side * (hw - tw / 2 - 6);
    box5(T, -hw, 0, -hd, hw, H, fz, _C(c));
    box5(T, -hw, 0, fz, hw, 3, hd, _C('#e8dcc6'));                                 // the terrace
    for (let x = -hw + 6; x < hw - 4; x += 10) box5(T, x, 3, hd - 1.4, x + 1, 9, hd - 0.4, _C(trim));
    box5(T, -hw, 8.4, hd - 1.6, hw, 9.6, hd - 0.2, _C(trim));
    for (let x = -hw + 14; x < hw - 10; x += 26) { T.prism(x, fz + 6, 0.5, 3, 15, _C('#e8e8ee'), 5); T.prism(x, fz + 6, 7, 14, 16, _C(pick(['#ff7ab6', '#2bf3ff', '#ffe14a', '#f4f4f6'])), 8, 0.4, true); }   // umbrellas over the terrace tables
    const floors = []; for (let y = 16; y < H - 8; y += 13) floors.push(y);
    for (const y of floors) {
      uqWindows(T, G, -hw + 4, hw - 4, y, y + 8, fz + 0.3, 14, '#1d2f4a', 0.3);
      box5(T, -hw, y + 9, fz, hw, y + 10.4, fz + 5, _C(trim));                    // the eyebrows
    }
    for (const sx of [-1, 1]) uqSideWindows(T, G, sx * (hw + 0.3), -hd + 6, fz - 4, 16, H - 10, 14, sx, '#1d2f4a', 0.2);
    box5(T, -hw, 3, fz - 0.6, hw, 6, fz + 0.4, _C(acc)); box5(T, -hw - 0.5, H - 6, -hd - 0.5, hw + 0.5, H - 3, fz + 0.5, _C(acc));   // bands
    for (const sx of [-1, 1]) box5(T, sx * hw - (sx > 0 ? 5 : 0), 0, fz - 1, sx * hw + (sx < 0 ? 5 : 0), H + 4, fz + 1.5, _C(trim));   // corner pilasters
    const TH = H + rand(16, 30);
    box5(T, tx - tw / 2, H, fz - 24, tx + tw / 2, TH, fz + 2, _C(c));                // the centre tower and its ziggurat top
    box5(T, tx - tw / 2 + 4, TH, fz - 20, tx + tw / 2 - 4, TH + 6, fz - 2, _C(acc)); box5(T, tx - tw / 2 + 8, TH + 6, fz - 16, tx + tw / 2 - 8, TH + 10, fz - 6, _C(c));
    const nf = Math.random() < 0.5 ? 3 : 5; for (let k = 0; k < nf; k++) { const x = tx - tw / 2 + (k + 1) * tw / (nf + 1); box5(T, x - 1.2, 18, fz + 1.5, x + 1.2, TH - 2, fz + 4, _C(trim)); }   // fins down the front
    box5(G, tx - tw / 2 + 2, 12, fz + 0.6, tx + tw / 2 - 2, 14, fz + 1.4, _C(neon));
    return m => { const vertical = U.row.name.length <= 9; if (vertical) uqSign(m, U, U.row.name, neon, tx, (TH + 18) / 2 + 6, fz + 6, Math.min(TH - 20, 10 * U.row.name.length + 8), true); else uqSign(m, U, U.row.name, neon, tx, TH + 20, fz - 8, 20); };
  },
  streamline(T, G, U, hw, hd, H, c, neon) { // Streamline Moderne: rounded front corners, racing bands, portholes, a pylon with the name
    const R = Math.min(22, hw * 0.3, hd * 0.3), fz = hd, acc = pick(['#35c9c0', '#ff7ab6', '#6f86ff', '#ffb02e']);
    box5(T, -hw, 0, -hd, hw, H, fz - R, _C(c)); box5(T, -hw + R, 0, fz - R, hw - R, H, fz, _C(c));
    for (const sx of [-1, 1]) T.prism(sx * (hw - R), fz - R, R, 0, H, _C(c), 14, R, true);
    for (let y = 16; y < H - 8; y += 14) {
      uqWindows(T, G, -hw + R, hw - R, y, y + 8, fz + 0.3, 16, '#1d2f4a', 0.3);
      box5(T, -hw + R, y - 3, fz, hw - R, y - 1.4, fz + 6, _C('#f4f4f6')); for (const sx of [-1, 1]) T.prism(sx * (hw - R), fz - R, R + 6, y - 3, y - 1.4, _C('#f4f4f6'), 14, R + 6, true);
      box5(G, -hw + R, y - 1.4, fz + 5.4, hw - R, y - 0.8, fz + 6.2, _C(neon));
    }
    for (const yb of [5, 7.5, 10]) box5(T, -hw + R, yb, fz + 0.2, hw - R, yb + 1, fz + 0.8, _C(acc));   // racing bands
    for (let y = 20; y < H - 10; y += 28) for (const sx of [-1, 1]) { const x = sx * (hw + 0.4); face(G, [[x, y, -6], [x, y, 6], [x, y + 8, 6], [x, y + 8, -6]], [sx, 0, 0], _C('#ffd98a')); }   // portholes / side lights
    box5(T, -16, 0, fz, 16, 24, fz + 2, _C('#9fd8ff')); box5(T, -22, 24, fz - 2, 22, 27, fz + 12, _C('#f4f4f6'));   // glass-block lobby, the curved canopy
    box5(T, -hw + 6, H, -hd + 10, hw - 6, H + 8, fz - R, _C(shade(c, -12)));
    const px = hw * 0.55; box5(T, px - 6, H, fz - 14, px + 6, H + 60, fz - 2, _C('#f4f4f6')); box5(G, px - 6.6, H + 58, fz - 14.6, px + 6.6, H + 60, fz - 1.4, _C(neon));
    const n = U.row.name.length; return m => n <= 8 ? uqSign(m, U, U.row.name, neon, px, H + 32, fz + 2, Math.min(56, 7 * n + 10), true) : uqSign(m, U, U.row.name, neon, 0, H + 22, fz - 6, 16);
  },
  mimo(T, G, U, hw, hd, H, c, neon) {      // a MiMo motel: two floors of rooms off open walkways, a cheese-hole screen, a boomerang sign, a pool
    const bz = hd - Math.min(46, hd * 0.45), back = -hd, rd = bz - back, acc = pick(['#ff7ab6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d']);
    box5(T, -hw, 0, back, hw, H, bz - 8, _C(c));
    box5(T, -hw, 15, bz - 8, hw, 17, bz, _C('#e8e4d8')); for (let x = -hw + 2; x < hw; x += 4) box5(T, x, 17, bz - 0.8, x + 0.6, 22, bz, _C('#2a2d3a')); box5(T, -hw, 22, bz - 1, hw, 23, bz, _C('#2a2d3a'));   // the upper walkway and its rail
    box5(T, -hw - 2, H, back - 2, hw + 2, H + 2, bz + 2, _C('#d8d0c4')); box5(T, -hw - 2.4, H, bz + 1.6, hw + 2.4, H + 2.6, bz + 2.6, _C(acc));   // the flat roof, overhanging, an accent fascia
    for (let k = 0; k < Math.max(2, Math.round(hw / 40)); k++) box5(T, -hw + 14 + k * 40, H + 2, back + 10, -hw + 24 + k * 40, H + 8, back + 18, _C('#9aa0ab'));   // AC units
    for (let x = -hw + 12; x < hw - 10; x += 22) for (const y0 of [0, 17]) { box5(T, x - 4, y0, bz - 8.6, x + 4, y0 + 12, bz - 8, _C(pick([acc, shade(acc, -20), '#f4f4f6']))); face(G, [[x + 6, y0 + 5, bz - 8.4], [x + 10, y0 + 5, bz - 8.4], [x + 10, y0 + 10, bz - 8.4], [x + 6, y0 + 10, bz - 8.4]], [0, 0, 1], _C(Math.random() < 0.4 ? '#ffd98a' : '#1d2f4a')); }   // doors and windows
    const sx = -hw + 4; box5(T, sx, 0, bz - 8, sx + 14, H, bz, _C('#f4f4f6')); for (let y = 4; y < H - 4; y += 7) for (let x = sx + 3; x < sx + 12; x += 5) disc(T, x, bz + 0.2, 1.8, y, _C('#2a2d3a'), 8);   // the cheese-hole screen
    if (hd - bz > 16) { const pz = (bz + hd) / 2; box5(T, -hw * 0.5, 0, pz - 9, hw * 0.3, 1.4, pz + 9, _C('#f4f4f6')); flat(G, -hw * 0.5 + 2, pz - 7, hw * 0.3 - 2, pz + 7, 1.5, _C('#3fd0ff')); for (let x = -hw * 0.5; x < hw * 0.3; x += 14) box5(T, x, 1.4, pz + 10, x + 8, 3, pz + 13, _C(acc)); }   // the pool and loungers
    const px = hw - 16; T.prism(px, hd - 8, 1.6, 0, 46, _C('#2a2d3a'), 6);
    face(T, [[px - 2, 40, hd - 8], [px + 22, 54, hd - 8], [px + 22, 58, hd - 8], [px - 2, 46, hd - 8]], [0, 0, 1], _C(acc)); face(T, [[px - 2, 40, hd - 8], [px - 26, 54, hd - 8], [px - 26, 58, hd - 8], [px - 2, 46, hd - 8]], [0, 0, 1], _C(acc));   // the boomerang
    box5(G, px - 3, 58, hd - 9, px + 3, 64, hd - 7, _C('#ffe14a'));
    return m => { uqSign(m, U, U.row.name, neon, px, 36, hd - 6, 15); uqSign(m, U, 'VACANCY', '#ff4d4d', px, 24, hd - 6, 7); };
  },
  med(T, G, U, hw, hd, H, c, neon) {       // Mediterranean Revival: stucco, red tile roofs, arches, a tower, a courtyard with a fountain
    const fz = hd - 16, tile = pick(['#c9773a', '#b8642e', '#d0864a']), arch = '#3a2a1e';
    box5(T, -hw, 0, -hd, hw, H, fz, _C(c));
    const roof = (x0, z0, x1, z1, y, rise, col) => { const xm = (x0 + x1) / 2; face(T, [[x0 - 2, y, z1 + 2], [x1 + 2, y, z1 + 2], [x1 + 2, y + rise, (z0 + z1) / 2], [x0 - 2, y + rise, (z0 + z1) / 2]], [0, 0.7, 0.7], _C(col)); face(T, [[x0 - 2, y, z0 - 2], [x1 + 2, y, z0 - 2], [x1 + 2, y + rise, (z0 + z1) / 2], [x0 - 2, y + rise, (z0 + z1) / 2]], [0, 0.7, -0.7], _C(shade(col, -15))); for (let x = x0; x < x1; x += 4) box5(T, x, y + 0.2, z1 + 1.6, x + 0.6, y + 0.8, z1 + 2.4, _C(shade(col, -30))); };
    roof(-hw, -hd, hw, fz, H, Math.min(16, hd * 0.3), tile);
    for (let x = -hw + 12; x < hw - 8; x += 20) for (const y of [4, H * 0.55]) { box5(T, x - 5, y, fz, x + 5, y + 14, fz + 0.4, _C(arch)); T.prism(x, fz + 0.2, 5, y + 14, y + 14.4, _C(arch), 8, 5, true); }   // arched windows
    const tx = U.side * (hw - 14), TH = H + rand(18, 30);
    box5(T, tx - 12, 0, fz - 26, tx + 12, TH, fz + 2, _C(shade(c, 6))); for (const sx of [-1, 1]) box5(T, tx - 5, TH - 14, fz + 2, tx + 5, TH - 4, fz + 2.4, _C(arch));
    T.prism(tx, fz - 12, 18, TH, TH + 12, _C(tile), 4, 0.5, true);
    if (hd - fz > 8) { const cz = (fz + hd) / 2; flat(T, -hw, fz, hw, hd, 0.6, _C('#d8c4a0')); T.prism(-hw * 0.3, cz, 6, 0, 3, _C('#e8dcc6'), 12, 6, true); flat(G, -hw * 0.3 - 4.5, cz - 4.5, -hw * 0.3 + 4.5, cz + 4.5, 3.2, _C('#3fd0ff')); T.prism(-hw * 0.3, cz, 1.2, 3, 8, _C('#e8dcc6'), 8, 0.6, true); uqPalm(T, hw * 0.45, cz, 40); uqPalm(T, -hw + 8, cz, 34); }
    box5(T, -12, 0, fz, 12, 20, fz + 1, _C(arch)); box5(T, -14, 22, fz, 14, 24, fz + 4, _C('#2a2d3a'));   // the door, a wrought-iron balcony over it
    return m => uqSign(m, U, U.row.name, neon, 0, H + 28, fz - 4, 16);
  },
  diner(T, G, U, hw, hd, H, c, neon) {     // a stainless-steel diner: rounded ends, chrome bands, the counter window, DINER on the roof
    const L = Math.min(hw - 4, 64), dd = Math.min(hd - 4, 22), z0 = hd - dd * 2 - 6, z1 = hd - 6, zc = (z0 + z1) / 2, steel = _C(c), stripe = pick(['#e0364f', '#2bf3ff', '#ff2bd6', '#2a4aa8']);
    box5(T, -L + dd, 0, z0, L - dd, H, z1, steel); for (const sx of [-1, 1]) T.prism(sx * (L - dd), zc, dd, 0, H, steel, 14, dd, true);
    box5(T, -L + dd, 4, z1, L - dd, 6, z1 + 0.6, _C(stripe)); box5(T, -L + dd, 15, z1, L - dd, 16.5, z1 + 0.6, _C(stripe));
    face(G, [[-L + dd, 7, z1 + 0.4], [L - dd, 7, z1 + 0.4], [L - dd, 14, z1 + 0.4], [-L + dd, 14, z1 + 0.4]], [0, 0, 1], _C('#ffe9a8'));   // the long window, lit
    for (let x = -L + dd + 4; x < L - dd; x += 6) box5(T, x, 7, z1 + 0.5, x + 0.6, 14, z1 + 0.9, _C('#c8ccd4'));
    box5(T, -6, 0, z1, 6, 18, z1 + 6, steel); box5(G, -4, 2, z1 + 6.1, 4, 14, z1 + 6.4, _C('#ffe9a8'));   // the vestibule
    box5(T, -L * 0.4, H, zc - 3, L * 0.4, H + 3, zc + 3, _C('#2a2d3a'));
    flat(T, -hw, z1 + 7, hw, hd, 0.5, _C('#3a3d47')); for (let x = -hw + 6; x < hw - 6; x += 14) flat(T, x, z1 + 8, x + 0.8, hd - 1, 0.6, _C('#f4f4f6'));   // its own little lot
    return m => { uqSign(m, U, U.row.name, neon, 0, H + 16, zc, 14); uqSign(m, U, 'OPEN 24H', '#ff4d4d', L * 0.6, H + 6, zc, 6); };
  },
  cinema(T, G, U, hw, hd, H, c, neon) {    // a movie palace: the marquee with chasing lights, a tall blade sign, the ticket booth, posters
    const fz = hd - 6, acc = shade(c, 40);
    box5(T, -hw, 0, -hd, hw, H, fz, _C(c)); box5(T, -hw, H, -hd, hw, H + 4, fz, _C(acc));
    for (let x = -hw + 8; x < hw - 6; x += 12) box5(T, x, 30, fz, x + 2, H - 2, fz + 1, _C(acc));   // vertical ribs
    const mw = Math.min(hw - 4, 46); box5(T, -mw, 22, fz, mw, 30, fz + 16, _C('#2a2d3a')); box5(G, -mw, 22.5, fz + 16, mw, 29.5, fz + 16.4, _C('#fff3c0'));   // the marquee
    for (let x = -mw + 2; x < mw; x += 4) box5(G, x, 30, fz + 15, x + 2, 31.4, fz + 16.4, _C((x / 4) % 2 ? '#ffe14a' : '#ff4d4d'));   // chasing lights
    box5(T, -6, 0, fz, 6, 14, fz + 8, _C('#7a5a3a')); box5(G, -4, 6, fz + 8.1, 4, 12, fz + 8.4, _C('#9fd8ff'));   // the ticket booth
    for (const sx of [-1, 1]) box5(G, sx * (mw - 12) - 6, 4, fz + 0.2, sx * (mw - 12) + 6, 18, fz + 0.6, _C(pick(['#ff7ab6', '#6f86ff', '#ffe14a'])));   // posters
    const bx = (Math.random() < 0.5 ? -1 : 1) * Math.min(hw - 10, 30);
    return m => { uqSign(m, U, U.row.name, neon, bx, H + 22, fz + 4, Math.min(56, U.row.name.length * 9 + 10), true); uqSign(m, U, 'NOW SHOWING', '#fff3c0', 0, 26, fz + 17, 6, false, true); };
  },
  bank(T, G, U, hw, hd, H, c, neon) {      // columns and steps, a pediment, bronze doors, the name over them
    const fz = hd - 18, stone = _C(c), dark = _C(shade(c, -30));
    box5(T, -hw, 0, -hd, hw, H, fz, stone);
    for (let k = 0; k < 3; k++) box5(T, -hw + 6 - k * 2, 0, fz + k * 5, hw - 6 + k * 2, 3 - k, fz + 5 + k * 5, _C(shade(c, -8 * k)));   // the steps
    const n = Math.max(4, Math.min(8, Math.round(hw / 14) * 2)); for (let k = 0; k < n; k++) { const x = -hw + 12 + k * (2 * hw - 24) / (n - 1); T.prism(x, fz + 6, 3, 3, H - 8, stone, 10, 2.6); box5(T, x - 4, H - 8, fz + 2, x + 4, H - 6, fz + 10, stone); }
    box5(T, -hw + 4, H - 6, fz, hw - 4, H, fz + 12, stone);                        // the entablature
    face(T, [[-hw + 4, H, fz + 12], [hw - 4, H, fz + 12], [0, H + 14, fz + 12], [0, H + 14, fz + 12]], [0, 0, 1], dark); box5(T, -hw + 4, H, fz, hw - 4, H + 1, fz + 12, stone);
    box5(T, -8, 0, fz - 0.5, 8, 20, fz + 0.5, _C('#8a6a2a')); box5(G, -hw + 10, H - 4.5, fz + 12.1, hw - 10, H - 1.5, fz + 12.4, _C('#ffd98a'));
    return m => uqSign(m, U, U.row.name, neon, 0, H + 24, fz + 6, 14);
  },
  church(T, G, U, hw, hd, H, c, neon) {    // a mission church: a curved gable, a bell tower, a rose window, doors, a cross
    const nw = Math.min(hw - 4, 40), fz = hd - 6, wall = _C(c), tile = _C('#b8642e');
    box5(T, -nw, 0, -hd, nw, H, fz, wall);
    face(T, [[-nw - 2, H, fz + 2], [nw + 2, H, fz + 2], [nw + 2, H + 16, (fz - hd) / 2], [-nw - 2, H + 16, (fz - hd) / 2]], [0, 0.7, 0.7], tile); face(T, [[-nw - 2, H, -hd - 2], [nw + 2, H, -hd - 2], [nw + 2, H + 16, (fz - hd) / 2], [-nw - 2, H + 16, (fz - hd) / 2]], [0, 0.7, -0.7], tile);
    for (const [x0, x1, top] of [[-nw, -nw * 0.5, H + 8], [-nw * 0.5, nw * 0.5, H + 22], [nw * 0.5, nw, H + 8]]) box5(T, x0, H, fz - 2, x1, top, fz, wall);   // the stepped mission gable
    T.prism(0, fz + 0.4, 7, H - 4, H - 3.6, _C('#2a2d3a'), 16, 7, true); disc(G, 0, fz + 0.6, 6, H - 3.4, _C(pick(['#ff7ab6', '#6f86ff', '#ffe14a'])), 16);
    box5(T, -7, 0, fz, 7, 20, fz + 1, _C('#5a3a2a')); T.prism(0, fz + 0.5, 7, 20, 20.4, _C('#5a3a2a'), 8, 7, true);
    const tx = U.side * (nw + 10); if (Math.abs(tx) + 10 < hw) {
      box5(T, tx - 10, 0, fz - 22, tx + 10, 70, fz - 2, wall); for (const sx of [-1, 1]) box5(T, tx - 5, 54, fz - 1.9, tx + 5, 66, fz - 1.6, _C('#2a2d3a'));
      T.prism(tx, fz - 12, 14, 70, 84, tile, 4, 0.5, true); box5(T, tx - 0.8, 84, fz - 12.8, tx + 0.8, 96, fz - 11.2, _C('#ffd23f')); box5(T, tx - 4, 90, fz - 12.8, tx + 4, 91.6, fz - 11.2, _C('#ffd23f'));
    } else { box5(T, -0.8, H + 22, fz - 1.6, 0.8, H + 34, fz, _C('#ffd23f')); box5(T, -4, H + 29, fz - 1.6, 4, H + 30.6, fz, _C('#ffd23f')); }
    return m => uqSign(m, U, U.row.name, neon, 0, H + 46, 0, 15);
  },
  club(T, G, U, hw, hd, H, c, neon) {      // a nightclub: a dark box striped with neon, the canopy, a velvet rope, searchlights
    const fz = hd - 10, alt = pick(['#ff2bd6', '#2bf3ff', '#3dffa6', '#ffe14a', '#a259ff']);
    box5(T, -hw, 0, -hd, hw, H, fz, _C(c));
    for (const y of [H - 4, H - 9, 6]) box5(G, -hw - 0.4, y, fz - 0.2, hw + 0.4, y + 1.4, fz + 0.6, _C(y > 10 ? neon : alt));
    for (let x = -hw + 10; x < hw - 8; x += 16) box5(G, x, 9, fz + 0.2, x + 1.2, H - 12, fz + 0.6, _C(alt));
    box5(T, -14, 22, fz, 14, 24, fz + 12, _C('#16161c')); for (let x = -13; x < 14; x += 3) box5(G, x, 21.4, fz + 11, x + 1.2, 22, fz + 12, _C('#fff3c0'));   // the canopy and its bulbs
    box5(G, -8, 0, fz, 8, 18, fz + 0.4, _C(shade(neon, -30)));
    for (const x of [-16, -8, 8, 16]) T.prism(x, fz + 16, 1, 0, 8, _C('#ffd23f'), 6, 1, true); box5(T, -16, 6.4, fz + 15.6, -8, 7.4, fz + 16.4, _C('#b3122a')); box5(T, 8, 6.4, fz + 15.6, 16, 7.4, fz + 16.4, _C('#b3122a'));   // the velvet rope
    for (const [x0, z0, x1, z1] of [[-hw + 2, -hd + 2, hw - 2, -hd + 3.4], [-hw + 2, fz - 3.4, hw - 2, fz - 2], [-hw + 2, -hd + 2, -hw + 3.4, fz - 2], [hw - 3.4, -hd + 2, hw - 2, fz - 2]]) box5(G, x0, H, z0, x1, H + 1.2, z1, _C(alt));   // a neon frame round the roof
    return m => uqSign(m, U, U.row.name, neon, 0, H + 16, fz - 2, 18);
  },
  shop(T, G, U, hw, hd, H, c, neon) {      // a shop: a striped awning, the display windows, a sign, and something to say what it sells
    const fz = hd - 4, n = U.row.name, s1 = pick(['#ff7ab6', '#2bf3ff', '#ffe14a', '#3dffa6', '#e0364f', '#6f86ff']), s2 = '#f4f4f6';
    box5(T, -hw, 0, -hd, hw, H, fz, _C(c)); box5(T, -hw - 0.5, H - 5, -hd - 0.5, hw + 0.5, H, fz + 0.5, _C(shade(c, -20)));
    face(G, [[-hw + 4, 2, fz + 0.3], [hw - 4, 2, fz + 0.3], [hw - 4, 15, fz + 0.3], [-hw + 4, 15, fz + 0.3]], [0, 0, 1], _C('#ffe9a8'));
    for (let x = -hw; x < hw; x += 6) face(T, [[x, 18, fz], [Math.min(hw, x + 6), 18, fz], [Math.min(hw, x + 6), 14, fz + 10], [x, 14, fz + 10]], [0, 0.7, 0.7], _C(((x + hw) / 6) % 2 < 1 ? s1 : s2));   // the awning
    if (H > 28) uqWindows(T, G, -hw + 4, hw - 4, 22, H - 8, fz + 0.3, 12, '#1d2f4a', 0.4);
    const y = H;
    if (/SURF/.test(n)) for (let k = 0; k < 4; k++) box5(T, -hw + 8 + k * 7, 0, fz + 11, -hw + 12 + k * 7, 22, fz + 12, _C(pick(['#ff7ab6', '#2bf3ff', '#ffe14a', '#3dffa6'])));
    else if (/ICE CREAM/.test(n)) { T.prism(0, -4, 6, y, y + 14, _C('#d9a074'), 10, 0.6, true); T.prism(0, -4, 8, y + 14, y + 22, _C('#ffb3c7'), 10, 3, true); }
    else if (/PHARMACY/.test(n)) { box5(G, -3, y + 2, -2, 3, y + 20, 2, _C('#3dffa6')); box5(G, -9, y + 8, -2, 9, y + 14, 2, _C('#3dffa6')); }
    else if (/FLORIST/.test(n)) for (let k = 0; k < 5; k++) T.prism(-hw + 10 + k * 8, fz + 9, 3, 0, 6, _C(pick(['#ff4d4d', '#ffe14a', '#ff7ab6', '#c9b3ff'])), 8, 3.4, true);
    else if (/CAFE|TAQUERIA|PIZZA/.test(n)) for (let k = 0; k < 2; k++) { const x = -hw * 0.5 + k * hw; T.prism(x, fz + 12, 0.5, 0, 16, _C('#e8e8ee'), 5); T.prism(x, fz + 12, 8, 14, 17, _C(s1), 8, 0.4, true); }
    else if (/JEWEL/.test(n)) { T.prism(0, -4, 8, y + 4, y + 10, _C('#bfe9ff'), 8, 5, true); T.prism(0, -4, 8, y - 2, y + 4, _C('#9fd8ff'), 8, 0.5, false); }
    else if (/ARCADE/.test(n)) for (let k = 0; k < 3; k++) box5(G, -hw + 8 + k * 10, 2, fz + 0.5, -hw + 14 + k * 10, 14, fz + 1, _C(pick(['#ff2bd6', '#2bf3ff', '#ffe14a'])));
    else if (/CAMERA/.test(n)) { box5(T, -10, y, -8, 10, y + 12, 4, _C('#2a2d3a')); T.prism(0, 4, 5, y + 2, y + 10, _C('#16161c'), 10, 5, true); }
    else if (/VINYL/.test(n)) { disc(T, 0, -4, 14, y + 1, _C('#16161c'), 20); disc(T, 0, -4, 4, y + 1.2, _C(s1), 12); }
    else if (/BOOK/.test(n)) for (let k = 0; k < 6; k++) box5(T, -hw + 8 + k * 4, 0, fz + 10, -hw + 11 + k * 4, 12 + (k % 3) * 2, fz + 14, _C(pick(['#e0364f', '#2a4aa8', '#ffe14a', '#3dffa6'])));
    return m => uqSign(m, U, n, neon, 0, H + 10, fz - 2, 12);
  },
  office(T, G, U, hw, hd, H, c, neon) {    // an office block: sun-shade fins, a glass lobby, the name on its crown
    const glass = pick(['#2a3a5a', '#1d2f4a', '#24405a']), fin = _C(c);
    box5(T, -hw, 0, -hd, hw, H, hd, _C(glass));
    for (let y = 26; y < H - 8; y += 12) { box5(T, -hw - 0.4, y, -hd - 0.4, hw + 0.4, y + 2, hd + 0.4, fin); uqWindows(T, G, -hw, hw, y + 3, y + 10, hd + 0.5, 10, glass, 0.35); }
    for (let x = -hw; x <= hw; x += 12) box5(T, x - 0.8, 24, hd, x + 0.8, H - 6, hd + 4, fin);
    box5(G, -hw + 6, 2, hd + 0.2, hw - 6, 20, hd + 0.6, _C('#cfe6ff')); box5(T, -hw, 20, -hd, hw, 24, hd + 8, fin);   // the lobby, a canopy
    box5(T, -hw + 6, H, -hd + 6, hw - 6, H + 14, hd - 6, fin);
    return m => uqSign(m, U, U.row.name, neon, 0, H + 28, hd - 8, 18);
  },
};
