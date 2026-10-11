'use strict';
/* ---------- 7n. SAFEHOUSES: where they are and what they look like (js/08s runs them, js/08t is the side-on view) ----------
   The safehouse table (js/01q) lists ten places. Towers - the Colony room, the flat, the loft, the condo, the deco apartment and the
   penthouse - are buildings of the city: the Colony hotel itself, the others picked here by their district and footprint (the city's
   own looks are not the same every visit, so the building chosen is then given the look it should have: old brick, a pastel deco
   block, a condo by the sea, the tallest glass tower). Their door is the middle of the side that faces a street; reserved spaces are
   painted in the parking lane before it (the Colony room's in the hotel's own lot). Houses - the trailer, the bungalow, the mansion
   and the houseboat - stand on plots of their own (MAP.safe, map remodel 5), built from a plan below in the plot's own frame
   (x along the street, z from the back to the front): walls and doors that are solid, rooms with furniture, a garage with a roller
   door, a roof that turns see-through while you are inside. Mode: safehouses. */
let SAFES = [];                           // the table's rows, each with where it is: door, spots for cars, a house's plot and plan
const SH_WT = 3, SH_STALL = 76;           // wall thickness; a reserved space's length at the kerb
const TOWER_LOOK = {                      // the building each tower takes: its district (the table's where), the look it is given
  flat: { kind: 'brick', c: '#a8553a' }, loft: { kind: 'brick', c: '#8a4a3a' }, condo: { kind: 'condo', c: '#f4efe6', sea: true },
  deco: { kind: 'deco', c: '#ffb3c7', pastel: true }, penthouse: { kind: 'glass', c: '#6f86ff', top: true } };

function placeSafes() {                   // js/04 genWorld, after the Pay 'n' Spray garages
  SAFES = SAFE_HOUSES.map(h => Object.assign({}, h, { own: false, door: null, spots: [], keep: [], live: [], site: null, plan: null, doors: [], uses: [], lm: null }));
  withSeed(8800, () => { for (const h of SAFES) if (h.kind === 'tower') placeTower(h); else placeHouse(h); });
  SAFES = SAFES.filter(h => h.door);                                  // a place with no room for it on this map is left out
  for (const h of SAFES) { h.keep = h.spots.map(() => null); h.live = h.spots.map(() => null); }
}
const safeKerb = (x, y) => SAFES.some(h => h.spots.some(p => p.kerb && dist(x, y, p.x, p.y) < SH_STALL / 2 + 40));   // js/08 kerbFits: nobody else parks there

/* ---------- towers ---------- */
function towerDoor(r) {                   // the middle of the building's side that faces a street, just out on the sidewalk
  let best = null;
  for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const hx = u * r.lw / 2, hz = v * r.lh / 2, fx = r.ca * u - r.sa * v, fy = r.sa * u + r.ca * v;
    const x = r.cx + r.ca * hx - r.sa * hz + fx * 12, y = r.cy + r.sa * hx + r.ca * hz + fy * 12, rd = nearestRoad(x, y, ROAD_HALF + SW_W + 30);
    if (!rd || RE[rd.e].nt || pedBlocked(x, y) || inLandmark(x, y) || shoreDist(x, y) < 20) continue;
    const q = edgeAt(rd.e, rd.s, {}); if (Math.abs(q.tx * fx + q.ty * fy) > 0.3) continue;   // the street runs along this side
    if (!best || rd.d < best.d) best = { x, y, fx, fy, e: rd.e, s: rd.s, d: rd.d, side: (u ? r.lh : r.lw) };
  }
  return best;
}
function kerbStalls(door, n) {            // n reserved spaces in the parking lane before the door, shifted along the street to fit (null: no room)
  const E = RE[door.e], q = {}, keep = ROAD_HALF + SW_W + 70; edgeAt(door.e, door.s, q);
  const side = Math.sign((door.x - q.x) * -q.ty + (door.y - q.y) * q.tx) || 1, tx0 = q.tx, ty0 = q.ty;
  for (const shift of [0, 40, -40, 80, -80, 130, -130, 180, -180, 240, -240]) {
    const s0 = door.s + shift - (n - 1) * SH_STALL / 2, out = [];
    for (let k = 0; k < n; k++) {
      const s = s0 + k * SH_STALL; if (s < keep || s > E.len - keep) break;
      edgeAt(door.e, s, q); const nx = -q.ty * side, ny = q.tx * side, x = q.x + nx * PARK_OFF, y = q.y + ny * PARK_OFF, ang = Math.atan2(q.ty, q.tx);
      let ok = Math.abs(q.tx * tx0 + q.ty * ty0) > 0.995 && !pnsKerb(x, y) && shoreDist(x, y) > 40 && !SAFES.some(o => o.spots.some(p => dist(p.x, p.y, x, y) < SH_STALL + 20));
      for (const ds of [-SH_STALL / 2, SH_STALL / 2]) { if (!ok) break; const e = edgeAt(door.e, clamp(s + ds, 0, E.len), {}); ok = Math.abs(e.tx * tx0 + e.ty * ty0) > 0.995; }
      for (const o of [-0.42, 0, 0.42]) { if (!ok) break; const r = nearestRoad(x + Math.cos(ang) * o * SH_STALL, y + Math.sin(ang) * o * SH_STALL, ROAD_HALF + 10); ok = !!r && Math.abs(r.d - PARK_OFF) < 3; }
      if (!ok) break;
      out.push({ x, y, ang, w: KERB_W + 6, l: SH_STALL - 8, kerb: true });
    }
    if (out.length === n) return out;
  }
  return null;
}
function placeTower(h) {
  if (h.id === 'colony') { placeColonyRoom(h); return; }
  const look = TOWER_LOOK[h.id] || { kind: 'apartment', c: '#c9b3ff' }, dr = MAP.districts.find(d => d[0] === h.where); if (!dr) return;
  const R = dr[1], ax = (R[0] + R[2]) / 2, ay = (R[1] + R[3]) / 2, taken = new Set(SAFES.filter(o => o.r).map(o => o.r));
  let best = null, bs = Infinity;
  for (const r of BLD) {
    if (r.fill || r.special || r.sign || r.off || r.own || taken.has(r) || Math.min(r.lw, r.lh) < 60 || districtAt(r.cx, r.cy) !== h.where || inLandmark(r.cx, r.cy)) continue;
    const sc = look.sea ? shoreDist(r.cx, r.cy) * 2 + dist(r.cx, r.cy, ax, ay) * 0.25 : look.top ? dist(r.cx, r.cy, ax, ay) - r.lw * r.lh * 0.03 : dist(r.cx, r.cy, ax, ay);
    if (sc >= bs) continue;
    const door = towerDoor(r); if (!door) continue;
    const spots = kerbStalls(door, h.cars); if (!spots) continue;
    best = { r, door, spots }; bs = sc;
  }
  if (!best) return;
  const r = best.r, d = best.door; h.r = r; h.spots = best.spots;
  h.door = { x: d.x, y: d.y, fx: d.fx, fy: d.fy };
  r.safe = h.id; r.kind = look.kind; r.c = look.c; r.pastel = !!look.pastel; r.roof = shade(look.c, 28); r.wall = shade(look.c, -60);   // the look it should have
  r.H = look.top ? Math.max(GFH + h.floors * FLOOR, ...BLD.filter(o => !o.fill).map(o => o.H)) + 40 : GFH + h.floors * FLOOR;
  LM_CLEAR.push([d.x, d.y, 26, 26]);                                  // no lamp or bench in front of the door
}
function placeColonyRoom(h) {             // the Colony hotel (js/10b): its front door, and the space nearest it in the guests' lot
  const c = COLONY; if (!c || !c.big) return;
  const L = c.big, w = (lx, lz) => ({ x: c.cx + c.ca * lx - c.sa * lz, y: c.cy + c.sa * lx + c.ca * lz }), d = w(c.lw / 2 + COLONY_BIG_SIGN + 16, 52);   // out past the sign's bar over the door
  h.door = { x: d.x, y: d.y, fx: c.ca, fy: c.sa }; h.hotel = true;
  const lot = LOTS.filter(o => !o.owner && dist(o.cx, o.cy, d.x, d.y) < 700).sort((a, b) => dist(a.cx, a.cy, d.x, d.y) - dist(b.cx, b.cy, d.x, d.y))[0];   // the guests' lot
  if (lot) for (const p of lot.stalls.slice().sort((a, b) => dist(a.x, a.y, d.x, d.y) - dist(b.x, b.y, d.x, d.y)).slice(0, h.cars)) {
    p.reserved = h; h.spots.push({ x: p.x, y: p.y, ang: p.ang, w: STALL_W + 6, l: 60, stall: p });
  }
}

/* ---------- houses: the plot's frame (like a Pay 'n' Spray's: pnsLocal / pnsWorld), the plan, solids ---------- */
function placeHouse(h) {
  const m = (MAP.safe || {})[h.id], plan = SH_PLANS[h.id]; if (!m || !plan) return;
  const A = m.a * Math.PI / 180, a = A - Math.PI / 2, G = { cx: m.x, cy: m.y, a, ca: Math.cos(a), sa: Math.sin(a), hw: m.w / 2, hd: m.d / 2 };
  const S = plan(G.hw, G.hd); h.site = G; h.plan = S;
  const W = (lx, lz) => pnsWorld(G, lx, lz, {});
  const sol = (x0, z0, x1, z1, extra) => { const p = W((x0 + x1) / 2, (z0 + z1) / 2); return makeSolid(p.x, p.y, Math.abs(x1 - x0), Math.abs(z1 - z0), a, Object.assign({ bld: true, safe: h.id }, extra)); };
  for (const w of S.walls) sol(w[0], w[1], w[2], w[3]);
  for (const w of S.low) sol(w[0], w[1], w[2], w[3], { soft: true });
  for (const f of S.furn) { const r = furnRect(f); if (r) sol(r[0], r[1], r[2], r[3], { clutter: true }); }
  h.doors = S.doors.map(d => {
    const t = d.k === 'front' ? 3 : 4, hw = d.w / 2, r = d.ax === 'x' ? [d.x - hw, d.z - t / 2, d.x + hw, d.z + t / 2] : [d.x - t / 2, d.z - hw, d.x + t / 2, d.z + hw];
    const p = W(d.x, d.z); return Object.assign({}, d, { ds: sol(r[0], r[1], r[2], r[3], { safeDoor: true }), open: 0, wx: p.x, wy: p.y });
  });
  h.spots = S.bays.map(([x, z, th]) => { const p = W(x, z); return { x: p.x, y: p.y, ang: a + th, w: 38, l: 80, bay: true }; });
  h.uses = S.use.map(u => Object.assign({}, u, W(u.x, u.z)));
  const at = W(S.at[0], S.at[1]), out = W(S.at[0], S.at[1] + 10); h.door = { x: at.x, y: at.y, fx: (out.x - at.x) / 10, fy: (out.y - at.y) / 10 };
  const ex = Math.abs(G.ca) * G.hw + Math.abs(G.sa) * G.hd, ey = Math.abs(G.sa) * G.hw + Math.abs(G.ca) * G.hd;
  LM_CLEAR.push([m.x, m.y, ex + 8, ey + 8]);                          // no trees, lamps or junk on the plot
  if (m.drive) { const [dx, dy, dl, dw] = m.drive; LM_CLEAR.push([dx, dy, (Math.abs(G.ca) * dw + Math.abs(G.sa) * dl) / 2 + 8, (Math.abs(G.sa) * dw + Math.abs(G.ca) * dl) / 2 + 8]); }
  h.lm = { cx: m.x, cy: m.y, a, rad: Math.hypot(G.hw, G.hd) + 60, make: () => withSeed(6100 + h.id.length * 17, () => makeSafeHouse(h)), mesh: null };
  LMS.push(h.lm);
}
const shIn = (h, x, y, m) => {           // inside one of the house's rooms or its garage (m > 0: that far from the walls)
  if (!h.site) return false; const q = pnsLocal(h.site, x, y, {});
  return h.plan.inside.some(r => q.x > r[0] + m && q.x < r[2] - m && q.z > r[1] + m && q.z < r[3] - m);
};

/* the plan: everything in the plot's frame. walls / low: [x0, z0, x1, z1, height, colour]; doors: { k: front | garage | gate | open, x, z, w,
   ax: x (the door spans along x) or z }; furn: [kind, x, z, turn] (turn 0: facing the front, 1: +x, 2: the back, 3: -x); use: where you
   SLEEP, change clothes, open the stash; bays: [x, z, angle] a kept car's place; sign / at: the FOR SALE sign and where you stand to buy. */
function shPlan() { return { ground: [], walls: [], low: [], floors: [], inside: [], roofs: [], doors: [], lintels: [], furn: [], use: [], bays: [], palms: [], wins: [], sign: [0, 0], at: [0, 0] }; }
function shWallX(S, z, x0, x1, gaps, H, col, low) {   // a wall along x at depth z, with doorways [centre, width]
  const cuts = (gaps || []).map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]); let x = x0;
  for (const [a, b] of cuts.concat([[x1, x1]])) { if (a > x + 0.5) (low ? S.low : S.walls).push([x, z - SH_WT / 2, a, z + SH_WT / 2, H, col]); x = Math.max(x, b); }
  if (!low) for (const [a, b] of cuts) S.lintels.push([a, z - SH_WT / 2, b, z + SH_WT / 2, H, col]);
}
function shWallZ(S, x, z0, z1, gaps, H, col, low) {   // a wall along z at x
  const cuts = (gaps || []).map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]); let z = z0;
  for (const [a, b] of cuts.concat([[z1, z1]])) { if (a > z + 0.5) (low ? S.low : S.walls).push([x - SH_WT / 2, z, x + SH_WT / 2, a, H, col]); z = Math.max(z, b); }
  if (!low) for (const [a, b] of cuts) S.lintels.push([x - SH_WT / 2, a, x + SH_WT / 2, b, H, col]);
}
function shBox(S, x0, z0, x1, z1, H, col, floor, roof, doors) {   // a building: four walls with their doors, a floor, a roof; doors [side f|b|l|r, at, width, kind]
  const t = SH_WT / 2, g = { f: [], b: [], l: [], r: [] };
  for (const [side, at, w, k] of doors || []) {
    g[side].push([at, w]); if (k === 'open') continue;
    const dz = side === 'f' ? z1 - t : side === 'b' ? z0 + t : at, dx = side === 'l' ? x0 + t : side === 'r' ? x1 - t : at;
    S.doors.push({ k, x: dx, z: dz, w, ax: side === 'f' || side === 'b' ? 'x' : 'z', H: k === 'garage' ? Math.min(H - 5, 30) : Math.min(H - 4, 26), side });
  }
  shWallX(S, z1 - t, x0, x1, g.f, H, col); shWallX(S, z0 + t, x0, x1, g.b, H, col);
  shWallZ(S, x0 + t, z0 + SH_WT, z1 - SH_WT, g.l, H, col); shWallZ(S, x1 - t, z0 + SH_WT, z1 - SH_WT, g.r, H, col);
  S.floors.push([x0, z0, x1, z1, floor]); S.inside.push([x0 + SH_WT, z0 + SH_WT, x1 - SH_WT, z1 - SH_WT]); S.roofs.push([x0 - 3, z0 - 3, x1 + 3, z1 + 3, H, roof]);
}
function shRing(S, hw, hd, gaps, H, col) {   // a fence or garden wall round the plot, the gaps in its front
  shWallX(S, hd - 2, -hw, hw, gaps, H, col, true); shWallX(S, -hd + 2, -hw, hw, [], H, col, true);
  shWallZ(S, -hw + 2, -hd + 4, hd - 4, [], H, col, true); shWallZ(S, hw - 2, -hd + 4, hd - 4, [], H, col, true);
}
const SH_PLANS = {
  trailer: (hw, hd) => {                  // a silver trailer on a fenced gravel yard; a metal garage for one car beside it
    const S = shPlan(), steel = '#c4c8d2';
    S.ground.push([-hw, -hd, hw, hd, '#8f877a'], [-80, 18, -6, hd, '#a3a3ab'], [29, 30, 51, hd, '#b5ab98'], [0, -26, 29, 40, '#b5ab98']);
    shRing(S, hw, hd, [[-43, 68], [40, 22]], 14, '#9aa0ab');
    shBox(S, -80, 20, -6, 124, 36, steel, '#6a6d78', '#8a8f9c', [['f', -43, 60, 'garage']]);
    S.bays.push([-43, 70, -Math.PI / 2]);
    shBox(S, 14, -130, 70, 30, 30, '#e2e6ee', '#c9a27a', '#b8bdc8', [['l', -12, 14, 'front']]);
    shWallX(S, -75, 14 + SH_WT, 70 - SH_WT, [[58, 14]], 30, '#e2e6ee');
    S.furn.push(['bed', 35, -114, 1], ['wardrobe', 30, -81.5, 2], ['safe', 62.5, -92, 3], ['kitchen', 37, 22, 2], ['fridge', 62, 22, 2], ['table', 45, -2, 0],
      ['sofa', 61, -45, 3], ['tv', 20, -45, 1], ['rug', 40, -45, 0], ['steps', 9, -12, 1], ['grill', -20, -60, 0], ['picnic', -40, -100, 0], ['flamingo', 0, 60, 0], ['flamingo', 8, 70, 1]);
    S.use.push({ k: 'sleep', x: 58, z: -113 }, { k: 'wardrobe', x: 30, z: -93 }, { k: 'stash', x: 50, z: -92 });
    S.wins.push(['l', 14, -100, 16], ['l', 14, -50, 16], ['r', 70, -100, 16], ['r', 70, -40, 20], ['r', 70, 5, 16]);
    S.sign = [60, 134]; S.at = [40, 152];
    return S;
  },
  bungalow: (hw, hd) => {                 // a pastel bungalow on a lawn with a beach behind it; a garage for two, a terrace to the sea
    const S = shPlan(), wall = '#f6e8d6', roof = '#e98a6a';
    S.ground.push([28, 75, 112, hd, '#c9c2b5'], [-68, 55, -52, hd, '#e8e0d0'], [-140, -110, 22, -75, '#b08a5a']);
    shWallX(S, hd - 2, -hw, hw, [[70, 86], [-60, 20]], 10, '#fbf6ec', true);
    shWallZ(S, -hw + 3, -60, hd - 4, [], 14, '#2f8f4e', true); shWallZ(S, hw - 3, -60, hd - 4, [], 14, '#2f8f4e', true);
    shBox(S, -138, -75, 22, 55, 32, wall, '#d8c8a8', roof, [['f', -60, 16, 'front']]);
    shBox(S, 26, -55, 122, 75, 30, wall, '#8a8d98', roof, [['f', 74, 88, 'garage']]);
    S.bays.push([51, 12, -Math.PI / 2], [97, 12, -Math.PI / 2]);
    shWallX(S, -10, -138 + SH_WT, 22 - SH_WT, [[-98, 16], [-22, 16]], 32, wall); shWallZ(S, -60, -75 + SH_WT, -10 - SH_WT / 2, [], 32, wall);
    S.floors.push([-138, -75, -60, -10, '#7a5a8a'], [-60, -75, 22, -10, '#e8e8ee']);
    S.furn.push(['dbl', -118, -53, 0], ['wardrobe', -80, -66.5, 0], ['safe', -68, -20, 3], ['kitchen', -20, -66, 0], ['fridge', 8, -66, 0], ['table', -25, -35, 0],
      ['tv', -100, 48, 2], ['sofa', -100, 15, 0], ['rug', -100, 31, 0], ['plant', -128, 45, 0], ['plant', 10, 45, 0], ['plant', -128, -2, 0],
      ['lounger', -110, -95, 2], ['lounger', -85, -95, 2], ['parasol', -60, -95, 0]);
    S.use.push({ k: 'sleep', x: -118, z: -26 }, { k: 'wardrobe', x: -80, z: -52 }, { k: 'stash', x: -80, z: -22 });
    S.wins.push(['f', 55, -110, 22], ['f', 55, 0, 22], ['b', -75, -110, 20], ['b', -75, -20, 20], ['l', -138, 20, 22], ['l', -138, -45, 22]);
    S.palms.push([-140, 96, 46], [138, 96, 50], [-142, -100, 52], [6, -102, 44], [134, -96, 48]);
    S.sign = [-84, 100]; S.at = [-60, 120];
    return S;
  },
  mansion: (hw, hd) => {                  // a white villa behind a wall and a gate: a pool in the front garden, a garage for four
    const S = shPlan(), wall = '#fbf6ec', roof = '#c9773a';
    S.ground.push([-42, 60, 42, hd, '#d8cfc0'], [-42, 66, 205, 140, '#d8cfc0'], [-202, 74, -50, 176, '#e8dcc6']);
    shRing(S, hw, hd, [[0, 84]], 16, '#f2ece0');
    S.doors.push({ k: 'gate', x: 0, z: hd - 2, w: 84, ax: 'x', H: 16 });
    shBox(S, 55, -70, 205, 66, 34, wall, '#8a8d98', roof, [['f', 130, 136, 'garage'], ['l', 20, 18, 'open']]);
    S.bays.push([76, 0, -Math.PI / 2], [112, 0, -Math.PI / 2], [148, 0, -Math.PI / 2], [184, 0, -Math.PI / 2]);
    shBox(S, -202, -175, 55, 60, 40, wall, '#e8e0d0', roof, [['f', -40, 22, 'front'], ['r', 20, 18, 'open']]);
    shWallZ(S, -95, -60, 60 - SH_WT, [[0, 22]], 40, wall); shWallX(S, -60, -202 + SH_WT, -80, [[-140, 20]], 40, wall);
    shWallZ(S, -80, -175 + SH_WT, -60, [], 40, wall); shWallX(S, -20, -95, 55 - SH_WT, [[-20, 22]], 40, wall);
    S.floors.push([-202, -175, -80, -60, '#5a3a6a'], [-202, -60, -95, 60, '#c8b89a'], [-95, -175, 55, -20, '#f2f2f6']);
    S.furn.push(['dbl', -150, -150, 0], ['wardrobe', -194.5, -110, 1], ['safe', -86, -150, 3], ['plant', -195, -168, 0],
      ['tv', -196.5, 0, 1], ['sofa', -150, 0, 3], ['rug', -170, 0, 0], ['piano', -128, 38, 2], ['plant', -195, 52, 0], ['plant', -195, -52, 0],
      ['kitchen', -30, -166, 0], ['kitchen', 15, -166, 0], ['fridge', 42, -166, 0], ['island', -10, -118, 0], ['table', -30, -45, 0], ['table', 10, -45, 0],
      ['stairs', 32, 18, 0], ['plant', -85, 50, 0], ['rug', -30, 20, 0],
      ['lounger', -190, 115, 1], ['lounger', -190, 140, 1], ['parasol', -195, 165, 0], ['lounger', -55, 115, 3]);
    S.use.push({ k: 'sleep', x: -150, z: -120 }, { k: 'wardrobe', x: -178, z: -110 }, { k: 'stash', x: -102, z: -150 });
    S.wins.push(['f', 60, -150, 30], ['f', 60, 20, 26], ['b', -175, -150, 30], ['b', -175, -40, 30], ['b', -175, 20, 30], ['l', -202, -110, 30], ['l', -202, 0, 30]);
    S.palms.push([-70, 176, 56], [70, 176, 60], [-196, 178, 52], [196, 178, 58], [-196, -182, 50], [196, -182, 56], [-40, -184, 48], [196, 100, 54]);
    S.pool = [-185, 90, -65, 160];
    S.sign = [56, 178]; S.at = [0, hd + 14];
    return S;
  },
  houseboat: (hw, hd) => {                // a cabin on a pontoon at the quay; railings round the deck, a gangplank to the quay
    const S = shPlan(), wall = '#e8f0f2';
    for (const [x0, z0, x1, z1] of [[-hw, -hd, hw, -hd + 2], [-hw, -hd, -hw + 2, hd], [hw - 2, -hd, hw, hd], [-hw, hd - 2, -10, hd], [10, hd - 2, hw, hd]]) S.low.push([x0, z0, x1, z1, 8, '#f4f4f6']);
    shBox(S, -72, -22, 62, 20, 28, wall, '#b08a5a', '#2f6bff', [['f', 0, 14, 'front']]);
    shWallZ(S, -22, -22 + SH_WT, 20 - SH_WT, [[0, 12]], 28, wall);
    S.furn.push(['bed', -52, -2, 0], ['kitchen', 10, -14, 0], ['fridge', 37, -14, 0], ['wardrobe', 22, 12.5, 2], ['safe', 54.5, -14, 3], ['tv', -12, 14.5, 2],
      ['lounger', 78, -12, 1], ['lounger', 78, 10, 1], ['plant', -90, 20, 0], ['plant', -90, -20, 0], ['buoy', 96, 0, 0]);
    S.use.push({ k: 'sleep', x: -30, z: -5 }, { k: 'wardrobe', x: 22, z: 0 }, { k: 'stash', x: 46, z: -2 });
    S.wins.push(['b', -22, -50, 16], ['b', -22, 20, 20], ['l', -72, 0, 14], ['r', 62, 0, 14], ['f', 20, -50, 16]);
    S.sign = [18, 62]; S.at = [0, 64]; S.boat = true;
    return S;
  }
};

/* ---------- furniture: footprints (u across, v front to back) and how each looks ---------- */
const SH_FURN = { bed: [26, 34], dbl: [34, 36], wardrobe: [26, 9], safe: [9, 9], sofa: [32, 12], tv: [22, 5], kitchen: [40, 10], fridge: [10, 10], table: [18, 18],
  island: [30, 14], piano: [22, 18], stairs: [20, 46], steps: [16, 8], grill: [8, 8], picnic: [22, 26] };
const shTurn = (t, u, v) => t === 1 ? [v, -u] : t === 2 ? [-u, -v] : t === 3 ? [-v, u] : [u, v];
function furnRect(f) {                    // the solid part of a piece of furniture in the plan's frame
  const [kind, x, z, t] = f, s = SH_FURN[kind]; if (!s) return null;
  const a = shTurn(t, -s[0] / 2, -s[1] / 2), b = shTurn(t, s[0] / 2, s[1] / 2);
  return [x + Math.min(a[0], b[0]), z + Math.min(a[1], b[1]), x + Math.max(a[0], b[0]), z + Math.max(a[1], b[1])];
}
function shFurn(T, Gl, f) {
  const [kind, x, z, t] = f, B = (u0, y0, v0, u1, y1, v1, col, gb) => { const a = shTurn(t, u0, v0), b = shTurn(t, u1, v1); box5(gb || T, x + Math.min(a[0], b[0]), y0, z + Math.min(a[1], b[1]), x + Math.max(a[0], b[0]), y1, z + Math.max(a[1], b[1]), _C(col)); };
  const wood = '#7a5a3a', dark = '#2a2d3a';
  if (kind === 'bed' || kind === 'dbl') {
    const w = SH_FURN[kind][0] / 2, l = SH_FURN[kind][1] / 2, sheet = pick(['#ff7ab6', '#6f86ff', '#3dffa6', '#ffd23f', '#c9b3ff']);
    B(-w, 0, -l, w, 5, l, wood); B(-w + 1, 5, -l + 1, w - 1, 8, l - 1, '#f4f2f8'); B(-w + 1, 8, -l + 9, w - 1, 9, l - 1, sheet);
    B(-w + 2, 8, -l + 2, kind === 'dbl' ? -1 : w - 2, 10, -l + 7, '#ffffff'); if (kind === 'dbl') B(1, 8, -l + 2, w - 2, 10, -l + 7, '#ffffff');
    B(-w, 0, -l - 1.5, w, 16, -l, wood);
  } else if (kind === 'wardrobe') { B(-13, 0, -4.5, 13, 30, 4.5, '#5a3a2a'); B(-12, 2, 4.5, -0.5, 28, 5.2, '#7a5a3a'); B(0.5, 2, 4.5, 12, 28, 5.2, '#7a5a3a'); B(-2, 14, 5.2, -0.8, 18, 5.8, '#ffd23f'); B(0.8, 14, 5.2, 2, 18, 5.8, '#ffd23f'); }
  else if (kind === 'safe') { B(-4.5, 0, -4.5, 4.5, 10, 4.5, '#3a3f4c'); B(-2, 3, 4.5, 2, 7, 5.3, '#9aa0ab'); }
  else if (kind === 'sofa') { const c = pick(['#4a2a5a', '#2a4a7a', '#7a2a3a', '#2f6a5a']); B(-16, 0, -6, 16, 6, 6, c); B(-16, 6, -6, 16, 13, -3, c); B(-16, 6, -6, -13, 9, 6, c); B(13, 6, -6, 16, 9, 6, c); }
  else if (kind === 'tv') { B(-11, 0, -2.5, 11, 7, 2.5, '#1d1a2c'); B(-10, 7, -0.6, 10, 19, 0.6, '#111111'); B(-9, 8, 0.6, 9, 18, 1.1, '#2bf3ff', Gl); }
  else if (kind === 'kitchen') { B(-20, 0, -5, 20, 9, 5, '#e8e8ee'); B(-20, 9, -5, 20, 10, 5, '#3a3d47'); B(-14, 10, -3, -6, 10.4, 3, '#9aa0ab'); B(6, 10, -3, 14, 10.3, 3, '#16161c'); }
  else if (kind === 'fridge') { B(-5, 0, -5, 5, 21, 5, '#f4f4f6'); B(3, 8, 5, 4, 16, 5.6, '#9aa0ab'); }
  else if (kind === 'table') { B(-9, 6, -9, 9, 7.5, 9, wood); B(-1, 0, -1, 1, 6, 1, dark); for (const [u, v] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) B(u - 3, 0, v - 3, u + 3, 5, v + 3, '#c97b3a'); }
  else if (kind === 'island') { B(-15, 0, -7, 15, 9, 7, '#e8e8ee'); B(-15, 9, -7, 15, 10, 7, '#16161c'); }
  else if (kind === 'piano') { B(-11, 0, -9, 11, 10, 9, '#111114'); B(-11, 10, -9, 11, 11, -2, '#111114'); B(-10, 10, 2, 10, 10.6, 5, '#f4f4f6'); }
  else if (kind === 'stairs') { for (let k = 0; k < 8; k++) B(-10, 0, -23 + k * 5.75, 10, 3 + k * 4.4, -23 + (k + 1) * 5.75, k % 2 ? '#c8b89a' : '#b8a88a'); }
  else if (kind === 'steps') { B(-8, 0, -4, 8, 2, 4, '#9aa0ab'); B(-8, 2, -4, 8, 4, 0, '#9aa0ab'); }
  else if (kind === 'grill') { T.prism(x, z, 4, 4, 9, _C('#16161c'), 10, 4, true); B(-0.6, 0, -0.6, 0.6, 4, 0.6, dark); }
  else if (kind === 'picnic') { B(-11, 6, -8, 11, 7.2, 8, '#8a6a48'); B(-11, 3, -13, 11, 4, -10, '#8a6a48'); B(-11, 3, 10, 11, 4, 13, '#8a6a48'); }
  else if (kind === 'rug') flat(T, ...(() => { const a = shTurn(t, -15, -11), b = shTurn(t, 15, 11); return [x + Math.min(a[0], b[0]), z + Math.min(a[1], b[1]), x + Math.max(a[0], b[0]), z + Math.max(a[1], b[1])]; })(), 0.9, _C(pick(['#ff7ab6', '#2bf3ff', '#ffd23f', '#a259ff'])));
  else if (kind === 'plant') { T.prism(x, z, 3.4, 0, 6, _C('#c97b3a'), 8, 2.8, true); T.prism(x, z, 6, 6, 15, _C('#2f8f4e'), 7, 1, true); }
  else if (kind === 'lounger') { B(-4, 0, -10, 4, 3, 10, '#f4f4f6'); B(-4, 3, -10, 4, 7, -5, pick(['#ff7ab6', '#ffd23f', '#2bf3ff'])); }
  else if (kind === 'parasol') { T.prism(x, z, 0.6, 0, 18, _C('#e8e8ee'), 6); T.prism(x, z, 14, 16, 20, _C(pick(['#ff3fb4', '#ffe14a', '#2bf3ff'])), 10, 0.5, true); }
  else if (kind === 'flamingo') { T.prism(x, z, 0.4, 0, 8, _C('#ff6fae'), 4); B(-1.5, 8, -3, 1.5, 12, 3, '#ff6fae'); B(-0.8, 12, 2, 0.8, 16, 3.4, '#ff6fae'); }
  else if (kind === 'buoy') { T.prism(x, z, 5, 6, 8, _C('#ff4d4d'), 10, 5, true); T.prism(x, z, 2.4, 6, 8.2, _C('#2a4aa8'), 8, 2.4, true); }
}

/* ---------- the house's model: ground, walls with windows and doors, rooms and furniture; roof, doors and the gate move ---------- */
function makeSafeHouse(h) {
  const S = h.plan, G = h.site, T = new GeoBuilder(), Gl = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder();
  S.ground.forEach((g, i) => flat(T, g[0], g[1], g[2], g[3], 0.35 + i * 0.03, _C(g[4])));
  if (S.boat) {                                                         // the pontoon: a dark hull in the water, a planked deck, the gangplank
    box5(T, -G.hw, -9, -G.hd, G.hw, 0.8, G.hd, _C('#1d2a4a')); box5(T, -G.hw, 0.8, -G.hd, G.hw, 1.2, G.hd, _C('#b08a5a'));
    for (let x = -G.hw + 6; x < G.hw; x += 8) box5(T, x, 1.2, -G.hd + 1, x + 0.6, 1.35, G.hd - 1, _C('#8a6a48'));
    box5(T, -G.hw - 1, -3, -G.hd - 1, G.hw + 1, 0, G.hd + 1, _C('#f4f4f6')); box5(Gl, -G.hw - 1.2, -1.6, -G.hd - 1.2, G.hw + 1.2, -0.6, G.hd + 1.2, _C('#2bf3ff'));
    box5(T, -10, 0.6, G.hd, 10, 1.6, G.hd + 30, _C('#9a7a52')); for (let z = G.hd + 3; z < G.hd + 30; z += 5) box5(T, -10, 1.6, z, 10, 2, z + 1, _C('#7a5a3a'));
    for (const s of [-1, 1]) box5(T, s * 10 - 0.6, 1.6, G.hd, s * 10 + 0.6, 9, G.hd + 30, _C('#f4f4f6'));
  }
  if (S.pool) { const [x0, z0, x1, z1] = S.pool; box5(T, x0 - 3, 0, z0 - 3, x1 + 3, 1.2, z1 + 3, _C('#f4f4f6')); flat(Gl, x0, z0, x1, z1, 1.3, _C('#3fd0ff')); for (let k = 0; k < 3; k++) flat(Gl, x0 + 8 + k * 30, z0 + 10, x0 + 20 + k * 30, z0 + 12, 1.35, _C('#c8f6ff')); }
  for (const f of S.floors) flat(T, f[0] + SH_WT, f[1] + SH_WT, f[2] - SH_WT, f[3] - SH_WT, 0.6, _C(f[4]));
  for (const w of S.walls) box5(T, w[0], 0, w[1], w[2], w[4], w[3], _C(w[5]));
  for (const w of S.low) { box5(T, w[0], 0, w[1], w[2], w[4], w[3], _C(w[5])); if (w[4] >= 12) box5(T, w[0] - 0.5, w[4], w[1] - 0.5, w[2] + 0.5, w[4] + 1.2, w[3] + 0.5, _C(shade(w[5], -30))); }
  for (const l of S.lintels) box5(T, l[0], Math.min(26, l[4] - 4), l[1], l[2], l[4], l[3], _C(l[5]));   // over each doorway
  for (const [side, at, c, w] of S.wins) {                              // windows: dark glass by day, lit at night
    const a = c - w / 2, b = c + w / 2, y0 = 10, y1 = 22;
    if (side === 'f' || side === 'b') { const z = at + (side === 'f' ? 0.3 : -0.3); face(Gl, [[a, y0, z], [b, y0, z], [b, y1, z], [a, y1, z]], [0, 0, side === 'f' ? 1 : -1], _C('#ffd98a')); }
    else { const x = at + (side === 'r' ? 0.3 : -0.3); face(Gl, [[x, y0, a], [x, y0, b], [x, y1, b], [x, y1, a]], [side === 'r' ? 1 : -1, 0, 0], _C('#ffd98a')); }
  }
  for (const f of S.furn) shFurn(T, Gl, f);
  for (const [x, z, ht] of S.palms) palm(T, x, z, ht);
  for (const r of S.roofs) {                                            // the roof: a slab with a rim and a few things on top
    flat(R, r[0], r[1], r[2], r[3], r[4] + 0.4, _C(r[5])); box5(R, r[0], r[4] - 2, r[1], r[2], r[4] + 0.4, r[1] + 2, _C(shade(r[5], -30)));
    box5(R, r[0], r[4] - 2, r[3] - 2, r[2], r[4] + 0.4, r[3], _C(shade(r[5], -30)));
    if (r[2] - r[0] > 60 && r[3] - r[1] > 60) box5(R, r[0] + 10, r[4], r[1] + 10, r[0] + 24, r[4] + 7, r[1] + 22, _C('#9aa0ab'));   // an AC unit
  }
  if (h.id === 'trailer') { box5(R, 16, 30, 20, 30, 38, 34, _C('#e8e8ee')); R.prism(23, 27, 6, 38, 40, _C('#c8ccd4'), 12, 6, true); box5(T, 2, 22, -24, 14, 23, 0, _C('#2bf3ff')); }   // a dish; an awning over the door
  const m = lmMesh(T, Gl), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof); own.push(roofMat, roofGlow);
  const doors = h.doors.map(d => {                                      // each door its own mesh: the roller door rolls up into its drum, the others slide aside
    const half = d.w / 2, gs = [], leaf = (fn, x, y, z) => { const D = new GeoBuilder(), g = new THREE.Group(); fn(D); g.add(new THREE.Mesh(D.build(), LM_MAT[0])); g.position.set(x, y, z); m.add(g); gs.push(g); };
    if (d.k === 'garage') leaf(D => { for (let y = 0; y < d.H; y += 3) { const y0 = y - d.H, y1 = Math.min(0, y - d.H + 2.7), col = _C((y / 3) % 2 ? '#c8ccd4' : '#e0e3ea');
      if (d.ax === 'x') box5(D, -half, y0, -1, half, y1, 1, col); else box5(D, -1, y0, -half, 1, y1, half, col); } }, d.x, d.H, d.z);
    else if (d.k === 'gate') for (const s of [-1, 1]) leaf(D => {                // two leaves, each sliding back to its post
      for (let u = 2; u < half; u += 5) box5(D, -s * u - 0.8, 0, -0.8, -s * u + 0.8, d.H, 0.8, _C('#2a2d3a'));
      box5(D, Math.min(0, -s * half), d.H - 2, -1, Math.max(0, -s * half), d.H, 1, _C('#d8b04a')); box5(D, Math.min(0, -s * half), 3, -1, Math.max(0, -s * half), 5, 1, _C('#2a2d3a')); }, d.x + s * half, 0, d.z);
    else leaf(D => { if (d.ax === 'x') box5(D, 0, 0, -1, d.w, d.H, 1, _C('#8a5a3a')); else box5(D, -1, 0, 0, 1, d.H, d.w, _C('#8a5a3a')); },
      d.ax === 'x' ? d.x - half : d.x, 0, d.ax === 'x' ? d.z : d.z - half);
    return { gs, d };
  });
  h.pt = { roof, roofMat, roofGlow, doors, op: -1 };
  return m;
}

/* ---------- the FOR SALE signs, the door rings and the painted spaces: one group, built with the first game (js/15 resetGame) ---------- */
let safeGroup = null;
function forSaleTex(h) {                  // the board: FOR SALE and the price
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#f4f4f6'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#e0364f'; g.fillRect(0, 0, 256, 64); g.fillRect(0, 150, 256, 10);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = 'bold 46px "Arial Black",Impact,sans-serif'; g.fillText('FOR SALE', 128, 34);
  g.fillStyle = '#16161c'; g.font = 'bold 44px Arial'; g.fillText(money(h.price), 128, 104); g.font = 'bold 18px Arial'; g.fillText(h.name.length > 22 ? h.name.split(' ').slice(-2).join(' ') : h.name, 128, 138);
  return finishTex(c);
}
function stallTex(h) {                    // a reserved space: RESERVED and the place's name
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 256); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 244);
  g.save(); g.translate(64, 128); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f';
  g.font = 'bold 34px "Arial Black",Impact,sans-serif'; g.fillText('RESERVED', 0, -18); g.font = 'bold 20px Arial'; g.fillText(h.name.split(' ')[0], 0, 22); g.restore();
  return finishTex(c);
}
function safeMarkers() {                  // the first game: the group; every game after only shows or hides it (js/08s gfxSafes)
  if (safeGroup) return;
  safeGroup = new THREE.Group(); scene.add(safeGroup);
  for (const h of SAFES) {
    const g = new THREE.Group(); g.position.set(h.door.x, groundH(h.door.x, h.door.y), h.door.y); safeGroup.add(g);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), ringMat); ring.scale.setScalar(16); ring.position.y = 1.5; g.add(ring);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), padMat); pad.scale.setScalar(15); pad.position.y = 1.3; g.add(pad);
    const icon = new THREE.Group(), im = new THREE.MeshBasicMaterial({ color: 0xffffff });               // a little house over the ring
    part(icon, GB, im, 9, 7, 9, 0, 3.5, 0); const rf = new THREE.Mesh(new THREE.ConeGeometry(8.5, 6, 4), im); rf.rotation.y = Math.PI / 4; rf.position.y = 10; icon.add(rf);
    icon.position.y = 22; g.add(icon);
    let sign = null;
    { const s = new THREE.Group(), ox = h.site ? null : -h.door.fy * 28, oy = h.site ? null : h.door.fx * 28;   // the sign: by a tower's door; at a house, where the plan puts it
      const sp = h.site ? pnsWorld(h.site, h.plan.sign[0], h.plan.sign[1], {}) : { x: h.door.x + ox - h.door.fx * 6, y: h.door.y + oy - h.door.fy * 6 };
      s.position.set(sp.x - h.door.x, 0, sp.y - h.door.y);
      part(s, GB, mc(0xf4f4f6), 1.6, 26, 1.6, -9, 13, 0); part(s, GB, mc(0xf4f4f6), 1.6, 26, 1.6, 9, 13, 0);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshBasicMaterial({ map: forSaleTex(h), side: THREE.DoubleSide }));
      board.position.y = 26; board.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180) * 0.6; s.add(board);
      g.add(s); sign = s; }
    for (const p of h.spots) if (!p.bay) {                               // the painted spaces
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.l).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: stallTex(h), transparent: true, depthWrite: false }));
      pm.position.set(p.x - h.door.x, 0.8, p.y - h.door.y); pm.rotation.y = -p.ang + Math.PI / 2; g.add(pm);
    }
    h.mk = { g, ring, ringMat, pad, padMat, icon, im, sign };
  }
}
