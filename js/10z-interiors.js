'use strict';
/* ---------- 7z. THE INTERIORS: hangars, warehouses, the storage yard (js/08zx runs them; numbers: js/01w; mode: interiors) ----------
   Ten buildings of the top-down kind, like the Pay 'n' Spray: the building's own box stops being solid, walls of their own with a
   roller door (and a side door) take its place, and the roof turns see-through while you are inside. The airport's three hangars
   (they replace the old closed ones), three port warehouses, three more in Dockside and Gravel Flats, and the storage yard in place of
   the office block at the port's south-west corner: eight lock-up units in two rows. Each site: { kind, name, cx, cy, a, ca, sa,
   hw, hd, H, dw (the roller door), px (the side door's x), ds / ps (their solids), spots (stashes), rare (a rare vehicle), lm }. */
let IXS = [], IXR = [];                    // the sites; the rare vehicles { id, S, lx, lz, car, takenAt }
const IX_WT = 5, IX_PD = 18;               // wall thickness, the side door's width
const IX_PLACES = [                         // [kind, BLD index, name, rare vehicle]
  ['port', 1022, 'PIER 4 WAREHOUSE', ''], ['port', 1023, 'BAYSIDE FREIGHT', 'armorvan'], ['port', 1020, 'HARBOR COLD STORE', ''],
  ['works', 1018, 'DOCKSIDE MOTOR WORKS', 'racebike'], ['works', 1021, 'ACME TOOL & DIE', ''], ['works', 471, 'FLATS MACHINE SHOP', '']];
function ixLocal(S, x, y, out) { const dx = x - S.cx, dy = y - S.cy; out = out || {}; out.x = dx * S.ca + dy * S.sa; out.z = -dx * S.sa + dy * S.ca; return out; }
function ixWorld(S, lx, lz, out) { out = out || {}; out.x = S.cx + S.ca * lx - S.sa * lz; out.y = S.cy + S.sa * lx + S.ca * lz; return out; }
const _ixq = {};
function ixIn(S, x, y, m) { ixLocal(S, x, y, _ixq); return Math.abs(_ixq.x) < S.hw - IX_WT - m && _ixq.z > -S.hd + IX_WT + m && _ixq.z < S.hd - IX_WT - m; }   // m > 0: that far from the walls

function genInteriors() {                   // js/04 genWorld, after the airport and before the stores: always the same buildings
  IXS = []; IXR = [];
  const H = typeof AIRF !== 'undefined' && AIRF && AIRF.hangars;
  if (H) for (let i = 0; i < 3; i++) {       // the three hangars side by side, doors to the south (the apron)
    const w = (H.w - 40) / 3, cx = H.x - H.w / 2 + 20 + (i + 0.5) * w;
    ixSite({ kind: 'hangar', name: 'HANGAR ' + (i + 1), cx, cy: H.y, A: 0, hw: w / 2 - 8, hd: H.h / 2 - 10, H: (w / 2 - 8) * 0.7, rare: i === 1 ? 'prototype' : '' });
  }
  for (const [kind, idx, name, rare] of IX_PLACES) { const r = BLD.find(b => b.idx === idx); if (r) bldSite(r, kind, name, rare); }
  const yard = BLD.find(b => b.idx === 1026); if (yard) storageYard(yard);
}
function frontOf(r) {                       // the side of a building that faces a street: its outward normal, and the half sizes across and deep
  let best = null;
  for (const [nx, ny, across, deep] of [[-r.sa, r.ca, r.lw, r.lh], [r.sa, -r.ca, r.lw, r.lh], [r.ca, r.sa, r.lh, r.lw], [-r.ca, -r.sa, r.lh, r.lw]]) {
    const ox = r.cx + nx * (deep / 2 + 30), oy = r.cy + ny * (deep / 2 + 30), rd = nearestRoad(ox, oy, 600);
    const d = rd ? rd.d : 1e9; if (!best || d < best.d) best = { d, A: Math.atan2(-nx, ny), hw: across / 2, hd: deep / 2 };
  }
  return best;
}
function bldSite(r, kind, name, rare) {
  const f = frontOf(r); if (!f) return;
  r.special = 'ix'; r.ix = true; r.shop = false; r.own = true; r.off = true;
  const S = ixSite({ kind, name, cx: r.cx, cy: r.cy, A: f.A, hw: f.hw, hd: f.hd, H: clamp(r.H || 50, 44, 66), rare, r });
  r.H = S.H + 3;
}
function storageYard(r) {                   // the office block's plot: paving, a gate sign, eight units back to back in two rows of four
  r.special = 'ix'; r.ix = true; r.shop = false; r.own = true; r.off = true; r.H = 40;
  const uw = Math.min(76, (r.lw - 24) / 4), ud = Math.min(110, r.lh / 2 - 40), classic = 5;
  const Y = { cx: r.cx, cy: r.cy, a: r.a, ca: r.ca, sa: r.sa, w: r.lw, h: r.lh, uw, ud, units: [] };
  for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) {
    const lx = (k - 1.5) * uw, lz = (row ? 1 : -1) * (ud / 2 + 3), A = r.a + (row ? 0 : Math.PI);
    const S = ixSite({ kind: 'unit', name: 'LOCK-UP ' + (row * 4 + k + 1), cx: r.cx + r.ca * lx - r.sa * lz, cy: r.cy + r.sa * lx + r.ca * lz, A, hw: uw / 2, hd: ud / 2, H: 36,
      rare: row * 4 + k === classic ? 'classic' : '', yard: Y });
    Y.units.push(S);
  }
  LM_CLEAR.push([r.cx, r.cy, r.w / 2 + 6, r.h / 2 + 6]);
  Y.lm = { cx: r.cx, cy: r.cy, a: r.a, rad: Math.hypot(r.lw, r.lh) / 2 + 40, make: () => makeYard(Y), mesh: null }; LMS.push(Y.lm);
  IXS.yard = Y;
}
function ixSite(o) {
  const S = Object.assign({ i: IXS.length, ca: Math.cos(o.A), sa: Math.sin(o.A), a: o.A, open: 0, pOpen: 0, roof: 1, broken: false, forced: false, alarm: false, spots: [], lm: null }, o);
  const { hw, hd } = S, W = IX_WT, unit = S.kind === 'unit';
  S.dw = unit ? hw * 2 - 2 * W - 6 : S.kind === 'hangar' ? hw * 1.4 : Math.min(96, hw * 0.55);
  S.DH = unit ? 28 : Math.min(S.H - 8, S.kind === 'hangar' ? S.H * 0.7 : 40);
  S.px = unit ? null : -hw + W + 14 + IX_PD / 2;                       // the side door: in the front wall, by the corner
  const sol = (lx, lz, w, h, extra) => { const p = ixWorld(S, lx, lz); return makeSolid(p.x, p.y, w, h, S.a, Object.assign({ bld: true, ixw: true }, extra)); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  let gaps = [[-S.dw / 2, S.dw / 2]]; if (S.px !== null) gaps.push([S.px - IX_PD / 2, S.px + IX_PD / 2]); gaps.sort((p, q) => p[0] - q[0]);
  let x = -hw; for (const [g0, g1] of gaps) { if (g0 - x > 1) sol((x + g0) / 2, hd - W / 2, g0 - x, W); x = g1; } if (hw - x > 1) sol((x + hw) / 2, hd - W / 2, hw - x, W);
  S.ds = sol(0, hd - W / 2, S.dw + 2, W + 2, { ixDoor: true });
  if (S.px !== null) S.ps = sol(S.px, hd - W / 2, IX_PD + 2, W + 2, { ixDoor: true });
  const dp = ixWorld(S, 0, hd); S.dx = dp.x; S.dy = dp.y;
  if (S.px !== null) { const pp = ixWorld(S, S.px, hd + 12); S.pdx = pp.x; S.pdy = pp.y; }
  S.racks = ixLayout(S); for (const k of S.racks) sol(k[0], k[1], k[2], k[3]);
  if (!S.yard) {
    LM_CLEAR.push([S.cx, S.cy, Math.abs(S.ca) * hw + Math.abs(S.sa) * hd + 8, Math.abs(S.sa) * hw + Math.abs(S.ca) * hd + 8]);
    const m = ixWorld(S, 0, hd + 40); LM_CLEAR.push([m.x, m.y, Math.abs(S.ca) * (S.dw / 2 + 30) + Math.abs(S.sa) * 40, Math.abs(S.sa) * (S.dw / 2 + 30) + Math.abs(S.ca) * 40]);
  }
  if (S.rare && CAR_TYPES[S.rare]) IXR.push({ id: S.rare, S, lx: 0, lz: unit ? 0 : -hd + 70, car: null, takenAt: null, paid: false });
  S.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 60, make: () => withSeed(9900 + S.i * 37, () => makeIx(S)), mesh: null };
  LMS.push(S.lm); IXS.push(S);
  return S;
}
function ixLayout(S) {                      // what stands inside, solid: [lx, lz, w, d] - racks, containers, machines; the middle aisle stays free
  const { hw, hd, kind } = S, W = IX_WT, out = [], x0 = -hw + W, x1 = hw - W, z0 = -hd + W, z1 = hd - W, aisle = Math.max(S.dw / 2 + 14, 46);
  if (kind === 'unit') return out;
  const side = x1 - aisle;                  // room on each side of the aisle
  if (kind === 'port') {                    // containers on the floor along both sides (20 ft: 6 m by 2.4 m)
    for (const s of [-1, 1]) if (side > 50) for (let z = z0 + 50; z < z1 - 110; z += 90) out.push([s * (x1 - 22), z + 37, 29, 74]);
  } else if (kind === 'works') {            // shelving along the sides, machines down the back
    for (const s of [-1, 1]) if (side > 30) out.push([s * (x1 - 11), (z0 + z1 - 90) / 2, 22, Math.max(20, z1 - z0 - 130)]);
    for (let x = x0 + 50; x < x1 - 40; x += 70) if (Math.abs(x) > aisle) out.push([x, z0 + 22, 30, 24]);
  } else if (kind === 'hangar') {           // workbenches and tool chests along the back
    for (let x = x0 + 30; x < x1 - 20; x += 60) if (Math.abs(x) > 40) out.push([x, z0 + 12, 34, 16]);
  }
  return out;
}

/* ---------- the models ---------- */
function makeIx(S) {
  const T = new GeoBuilder(), Gl = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), D = new GeoBuilder(), P = new GeoBuilder(), SH = new GeoBuilder();
  const { hw, hd, H, DH, dw, kind } = S, W = IX_WT, C = _C;
  const pal = { hangar: ['#c9ccd4', '#8f939d', '#6a6d78'], port: [pick(['#5a7fa8', '#a85a4a', '#5aa87f', '#a8915a']), '#d8d4cc', '#6d7078'], works: [pick(['#b8a58a', '#8a9aa8', '#a8a08a']), '#e0dcd2', '#646872'], unit: [pick(['#e07a3a', '#3a8ae0', '#e0c23a']), '#d8d8dc', '#5c5f68'] }[kind];
  const wallC = C(pal[0]), trimC = C(pal[1]), floorC = C(pal[2]), dark = C('#23252c'), yel = C('#ffd23f'), steel = C('#8a8f9c');
  const flat = (gb, a0, b0, a1, b1, y, col) => face(gb, [[a0, y, b0], [a1, y, b0], [a1, y, b1], [a0, y, b1]], [0, 1, 0], col);
  const x0 = -hw + W, x1 = hw - W, z0 = -hd + W, z1 = hd - W;
  flat(T, -hw, -hd, hw, hd, 0.4, floorC);
  if (kind !== 'unit') { for (const s of [-1, 1]) flat(T, s * (dw / 2 + 2) - 1.5, z0 + 6, s * (dw / 2 + 2) + 1.5, z1, 0.5, yel);   // the aisle's lines and an apron out front
    flat(T, -dw / 2 - 14, hd, dw / 2 + 14, hd + 34, 0.45, C('#7a7d88')); for (let k = 0, n = Math.round(dw / 7); k < n; k++) flat(T, -dw / 2 + k * dw / n, hd + 0.5, -dw / 2 + (k + 1) * dw / n, hd + 5, 0.5, k % 2 ? dark : yel); }

  /* the shell: walls with the doorways (a hangar: the arch's gable ends in strips), a band, the drum over the roller door */
  if (kind === 'hangar') {
    const top = x => H * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)), st = 6;
    for (let x = -hw; x < hw - 0.1; x += st) { const xm = x + st / 2, t = top(xm), inDoor = Math.abs(xm) < dw / 2, inP = S.px !== null && Math.abs(xm - S.px) < IX_PD / 2;
      box5(T, x, 0, -hd, x + st, t, -hd + W, wallC); box5(T, x, inDoor ? DH : inP ? 28 : 0, hd - W, x + st, Math.max(inDoor ? DH : 28, t), hd, wallC); }
    box5(T, -hw, 0, -hd, x0, 12, hd, trimC); box5(T, x1, 0, -hd, hw, 12, hd, trimC);
  } else {
    box5(T, -hw, 0, -hd, hw, H, z0, wallC); box5(T, -hw, 0, -hd, x0, H, hd, wallC); box5(T, x1, 0, -hd, hw, H, hd, wallC);
    const gaps = [[-dw / 2, dw / 2, DH]]; if (S.px !== null) gaps.push([S.px - IX_PD / 2, S.px + IX_PD / 2, 28]); gaps.sort((p, q) => p[0] - q[0]);
    let x = -hw; for (const [g0, g1, gh] of gaps) { if (g0 - x > 0.5) box5(T, x, 0, z1, g0, H, hd, wallC); box5(T, g0, gh, z1, g1, H, hd, wallC); x = g1; } if (hw - x > 0.5) box5(T, x, 0, z1, hw, H, hd, wallC);
    for (let k = -hw + 10; k < hw - 6; k += 10) { box5(T, k, 0, hd, k + 1.2, H - 4, hd + 0.8, trimC.clone().multiplyScalar(0.85)); box5(T, k, 0, -hd - 0.8, k + 1.2, H - 4, -hd, trimC.clone().multiplyScalar(0.85)); }   // corrugation ribs
    for (const [a0, b0, a1, b1] of [[-hw - 0.6, -hd - 0.6, hw + 0.6, -hd + 2], [-hw - 0.6, hd - 2, hw + 0.6, hd + 0.6], [-hw - 0.6, -hd, -hw + 2, hd], [hw - 2, -hd, hw + 0.6, hd]]) box5(T, a0, H - 6, b0, a1, H, b1, trimC);   // a band round the top
  }
  box5(T, -dw / 2 - 3, DH, hd - 1, dw / 2 + 3, DH + 5, hd + 3, dark);
  for (const s of [-1, 1]) for (let y = 0; y < DH; y += 4) box5(T, s > 0 ? dw / 2 : -dw / 2 - 2.5, y, hd, s > 0 ? dw / 2 + 2.5 : -dw / 2, Math.min(DH, y + 4), hd + 1.4, (y / 4) % 2 ? dark : yel);

  /* inside: by kind - the racks and containers are the solids of ixLayout */
  const crate = (gb, cx, cz, s, y0, col) => { box5(gb, cx - s, y0, cz - s, cx + s, y0 + 2 * s, cz + s, col); box5(gb, cx - s - 0.2, y0 + s - 0.6, cz - s - 0.2, cx + s + 0.2, y0 + s + 0.6, cz + s + 0.2, C('#6a4a2a')); };
  const wood = ['#b0885a', '#9a7448', '#c49a64'];
  for (const [lx, lz, w, d] of S.racks) {
    if (kind === 'port') { const cc = C(pick(['#c0392b', '#2a6fb0', '#2f8f4f', '#d08a1f', '#6d4fa0', '#8a8f9c'])); box5(T, lx - w / 2, 0, lz - d / 2, lx + w / 2, 31, lz + d / 2, cc);
      for (let z = lz - d / 2 + 3; z < lz + d / 2 - 2; z += 4) box5(T, lx - w / 2 - 0.5, 1, z, lx + w / 2 + 0.5, 30, z + 1.2, cc.clone().multiplyScalar(0.8));
      if (Math.random() < 0.6) box5(T, lx - w / 2, 31, lz - d / 2, lx + w / 2, 62, lz + d / 2, C(pick(['#c0392b', '#2a6fb0', '#e8e8ee', '#d08a1f']))); }
    else if (kind === 'works' && d > 30) {    // shelving: uprights, three shelves, boxes on them
      for (let z = lz - d / 2; z <= lz + d / 2; z += 30) box5(T, lx - w / 2, 0, z - 1, lx + w / 2, 34, z + 1, C('#2a6fb0'));
      for (const y of [1, 12, 23, 34]) box5(T, lx - w / 2, y, lz - d / 2, lx + w / 2, y + 1.4, lz + d / 2, C('#ff7a1a'));
      for (const y of [2.4, 13.4, 24.4]) for (let z = lz - d / 2 + 4; z < lz + d / 2 - 6; z += 9) if (Math.random() < 0.75) crate(T, lx + rand(-2, 2), z + 3, rand(2.6, 4), y, C(pick(wood)));
    } else if (kind === 'works') {            // a machine: lathe or press
      box5(T, lx - w / 2, 0, lz - d / 2, lx + w / 2, 18, lz + d / 2, C(pick(['#3f7a5a', '#5a6a7a', '#7a5a3f']))); box5(T, lx - w / 4, 18, lz - d / 3, lx + w / 4, 30, lz + d / 3, steel); box5(Gl, lx + w / 2 - 4, 12, lz + d / 2, lx + w / 2 - 1, 15, lz + d / 2 + 0.6, C('#3dff7a'));
    } else if (kind === 'hangar') {           // a workbench, a red tool chest beside it
      box5(T, lx - w / 2, 0, lz - d / 2, lx + w / 2, 12, lz + d / 2, C('#8a6a48')); box5(T, lx + w / 2 - 10, 12, lz - d / 2, lx + w / 2, 22, lz + d / 2 - 4, C('#d0323f'));
      for (let k = 0; k < 4; k++) box5(T, lx - w / 2 + 3 + k * 6, 12, lz - 3, lx - w / 2 + 6 + k * 6, 13, lz + 3, C(pick(['#c8ccd4', '#ffd23f', '#3a3d47'])));
    }
  }
  if (kind === 'hangar') {                  // spotlights on the floor, an engine on a stand, drums, a tug
    const sp = S.rare ? 0 : null;
    if (sp !== null) for (const a of [0.6, 2.5, 4.4]) { const r = 46; flat(Gl, Math.cos(a) * r - 3, -hd + 70 + Math.sin(a) * r - 3, Math.cos(a) * r + 3, -hd + 70 + Math.sin(a) * r + 3, 2, C('#fff4c8')); }
    if (sp !== null) for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; flat(Gl, Math.cos(a) * 40 - 1, -hd + 70 + Math.sin(a) * 40 - 1, Math.cos(a) * 40 + 1, -hd + 70 + Math.sin(a) * 40 + 1, 0.6, C('#ffd23f')); }
    const ex = hw * 0.55, ez = 10; box5(T, ex - 10, 0, ez - 6, ex + 10, 8, ez + 6, C('#ffd23f')); T.prism(ex, ez, 7, 8, 22, steel, 12, 7, true);
    for (let k = 0; k < 4; k++) T.prism(-hw * 0.6 + (k % 2) * 7, hd - 60 - Math.floor(k / 2) * 7, 3.2, 0, 10, C(k % 2 ? '#2a4aa8' : '#c0392b'), 10, 3.2, true);
  } else if (kind === 'port') {             // pallets of crates by the aisle
    for (let k = 0; k < 6; k++) { const s = k % 2 ? 1 : -1, cz = z0 + 40 + k * Math.max(20, (z1 - z0 - 120) / 6); if (Math.abs(cz - (-hd + 70)) < 40) continue; box5(T, s * (dw / 2 + 16) - 9, 0, cz - 9, s * (dw / 2 + 16) + 9, 2, cz + 9, C('#8a6a48')); crate(T, s * (dw / 2 + 16), cz, 7, 2, C(pick(wood))); }
  } else if (kind === 'unit') {             // a lock-up: junk along the walls
    for (let k = 0; k < 5; k++) crate(T, (k % 2 ? 1 : -1) * (hw - W - 7), z0 + 8 + k * 14, rand(4, 6), 0, C(pick([...wood, '#8a8f9c', '#5a6070'])));
    if (!S.rare) { box5(T, -10, 0, z0 + 4, 10, 14, z0 + 14, C(pick(['#3a3d47', '#6a4a2a']))); T.prism(8, 0, 4, 0, 8, C('#1c1c22'), 12, 4, true); }
  }
  for (const x of [-hw * 0.4, hw * 0.4]) for (let z = z0 + 20; z < z1 - 20; z += 60) box5(Gl, x - 1.2, H * (kind === 'hangar' ? 0.85 : 1) - 6, z, x + 1.2, H * (kind === 'hangar' ? 0.85 : 1) - 5, z + 24, C('#e8f6ff'));   // tube lights

  /* the roof (it fades while you are inside): a hangar's arch, a flat deck with skylights */
  if (kind === 'hangar') {
    const seg = 14; for (let k = 0; k < seg; k++) { const a0 = k / seg * Math.PI, a1 = (k + 1) / seg * Math.PI, p = (a, z) => [Math.cos(a) * hw, Math.sin(a) * H + 0.5, z], am = (a0 + a1) / 2;
      face(R, [p(a0, -hd), p(a1, -hd), p(a1, hd), p(a0, hd)], [Math.cos(am), Math.sin(am), 0], k % 2 ? C('#b9bcc4') : C('#a6a9b2')); }
    face(RG, [[-dw / 2, DH + 7, hd + 3.2], [dw / 2, DH + 7, hd + 3.2], [dw / 2, DH + 9, hd + 3.2], [-dw / 2, DH + 9, hd + 3.2]], [0, 0, 1], yel);
  } else {
    flat(R, -hw, -hd, hw, hd, H + 0.3, C(kind === 'unit' ? '#6a6d78' : '#8f939d'));
    if (kind !== 'unit') for (let z = -hd + 20; z < hd - 30; z += 44) flat(R, -hw + 20, z, hw - 20, z + 12, H + 0.7, C('#6d8fc9'));
    if (kind !== 'unit') { box5(R, hw - 30, H, -hd + 10, hw - 10, H + 9, -hd + 30, C('#9aa0ab')); R.prism(hw - 20, -hd + 20, 6, H + 9, H + 9.6, C('#555a66'), 10, 6, true); }
  }
  /* the doors: the roller door hangs down from y = 0 (rolled up by scaling), the side door a plain leaf */
  for (let y = 0; y < DH; y += 3) box5(D, -dw / 2, y - DH, hd - W / 2 - 1, dw / 2, Math.min(0, y - DH + 2.7), hd - W / 2 + 1, C((y / 3) % 2 ? '#8e95a3' : '#a9afbc'));
  if (S.px !== null) { box5(P, -IX_PD / 2, 0, -1, IX_PD / 2, 28, 1, C('#5a6070')); box5(P, IX_PD / 2 - 4, 13, 1, IX_PD / 2 - 2, 15, 1.8, steel); }
  const rr = IXR.find(q => q.S === S);
  if (rr && rr.id === 'classic') {          // the dust sheet over the classic
    const l = 30, w = 13, h = 13; box5(SH, -w, 0.5, -l, w, h, l, C('#d8d2c4')); box5(SH, -w + 2, h, -l + 6, w - 2, h + 4, l - 12, C('#cfc8b8'));
    for (let k = -l; k < l; k += 8) box5(SH, -w - 0.6, 0.5, k, w + 0.6, h * 0.7, k + 3, C('#c4bcac'));
  }

  const m = lmMesh(T, Gl), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof);
  const door = new THREE.Mesh(D.build(), LM_MAT[0]); door.position.y = DH; m.add(door);
  let pdoor = null; if (S.px !== null) { pdoor = new THREE.Mesh(P.build(), LM_MAT[0]); pdoor.position.set(S.px, 0, hd - W / 2); m.add(pdoor); }
  let sheet = null; if (rr && rr.id === 'classic') { sheet = new THREE.Mesh(SH.build(), LM_MAT[0]); sheet.position.set(rr.lx, 0, rr.lz); m.add(sheet); }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a }), lamp = new THREE.Mesh(GB, lampMat); lamp.scale.set(4, 4, 2); lamp.position.set(dw / 2 + 8, Math.min(30, DH - 4), hd + 1.2); m.add(lamp);
  const sign = fasciaSign(S.name, kind === 'unit' ? '#ffd23f' : '#2bf3ff', fasciaFit(S.name, 9, Math.min(2 * hw - 16, 260)), 9); sign.position.set(0, kind === 'hangar' ? DH + 16 : (DH + H) / 2, hd + (kind === 'hangar' ? 4 : 0.8)); m.add(sign);
  own.push(roofMat, roofGlow, lampMat, sign.material);
  S.pt = { roof, roofMat, roofGlow, door, pdoor, sheet, lamp, lampMat, sign, op: -1 };
  return m;
}
function makeYard(Y) {                      // the yard: paving round the units, a kerb, the company's sign on a post
  const T = new GeoBuilder(), Gl = new GeoBuilder(), C = _C, hw = Y.w / 2, hh = Y.h / 2;
  face(T, [[-hw, 0.3, -hh], [hw, 0.3, -hh], [hw, 0.3, hh], [-hw, 0.3, hh]], [0, 1, 0], C('#7d808a'));
  for (const s of [-1, 1]) for (let k = -hw + 8; k < hw - 8; k += 16) face(T, [[k, 0.35, s * (hh - 6)], [k + 8, 0.35, s * (hh - 6)], [k + 8, 0.35, s * (hh - 4)], [k, 0.35, s * (hh - 4)]], [0, 1, 0], C('#ffd23f'));
  box5(T, -hw + 6, 0, hh - 14, -hw + 9, 40, hh - 11, C('#3a3d47'));
  const m = lmMesh(T, Gl), sg = fasciaSign('LOCK-UP STORAGE', '#ffd23f', fasciaFit('LOCK-UP STORAGE', 10, 150), 10); sg.position.set(-hw + 60, 44, hh - 12); m.add(sg); m.userData.own.push(sg.material);
  return m;
}
