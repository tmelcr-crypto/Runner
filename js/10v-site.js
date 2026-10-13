'use strict';
/* ---------- 7w. SKYLINE ONE: the construction site (map remodel 14: MAP.site; the runtime: js/08zt) ----------
   A downtown Palm Heights block behind blue hoardings ('SKYLINE ONE - OPENING 1998'), its gate on the west street, a broken panel on
   the north street. The half-built tower fills the east of it: six concrete levels 36 apart - the ground, five decks, the open top -
   joined by ramps up its side strips (the east strip up from the ground and every other deck, rising north; the west strip up from the
   others, rising south), columns, temporary barriers round each deck's edge, scaffolding up two faces, rebar sticking out of the top.
   On the top deck a launch ramp at the south edge sends a car out over the avenue. In the yard: the site office (two stacked cabins),
   rebar, bricks, pipes and pallets, the dig pit, two dirt mounds and two plank ramps (one jumps the pit), two tower cranes whose jibs
   swing over the tower. Solid: the hoarding (and the gate at night), the cabins, the piles, the crane masts, and in the tower the deck
   edges, the ramps' walls and the columns, each at its own height (js/10k solidAt). Mode: site. */
const SITE = MAP.site || null;
const SK = { lm: null, T: null, ramps: [], jumps: [], cols: [], gateRc: null, parts: null, view: null };
const SK_COLS = ['#ffd23f', '#ff7a3d', '#2bf3ff', '#3dffa6', '#ff2bd6', '#a259ff'];
function genSite() {                      // js/04 genWorld: the hoarding, the tower's levels and walls, the yard's solids, the jumps, the drawable
  if (!SITE) return;
  const [a0, b0, a1, b1] = SITE.area, T = SK.T = Object.assign({}, SITE.tower), S = T.S, t = 4, dh = T.dh, NL = T.levels;
  const x0 = T.x0, y0 = T.y0, x1 = T.x1, y1 = T.y1, r0 = T.r0, r1 = T.r1, top = T.top = (NL - 1) * dh;
  const wall = (xa, ya, xb, yb, z0, z1, o) => makeSolid((xa + xb) / 2, (ya + yb) / 2, Math.max(1, xb - xa), Math.max(1, yb - ya), 0, Object.assign({ bld: true, site: true }, z0 === undefined ? {} : { z0, z1 }, o || {}));
  // the hoarding (28 high: a car flying higher clears it), the gate's gap on the west street, the broken panel's on the north street
  const hw = 4, [, gy, gw] = SITE.gate, [px, , pw] = SITE.panel, H = { h3: 30 };
  wall(a0, b0 - hw / 2, px - pw / 2, b0 + hw / 2, undefined, undefined, H); wall(px + pw / 2, b0 - hw / 2, a1, b0 + hw / 2, undefined, undefined, H);
  wall(a0, b1 - hw / 2, a1, b1 + hw / 2, undefined, undefined, H); wall(a1 - hw / 2, b0, a1 + hw / 2, b1, undefined, undefined, H);
  wall(a0 - hw / 2, b0, a0 + hw / 2, gy - gw / 2, undefined, undefined, H); wall(a0 - hw / 2, gy + gw / 2, a0 + hw / 2, b1, undefined, undefined, H);
  SK.gateRc = wall(a0 - 3, gy - gw / 2, a0 + 3, gy + gw / 2, undefined, undefined, { h3: 30, siteGate: true }); SK.gateRc.off = true;   // shut at night (js/08zt)
  // the tower: the ramps (each a wall on its inner side, a barrier over its low end on the deck above, one under its high end)
  SK.ramps = [];
  for (let k = 0; k < NL - 1; k++) { const east = k % 2 === 0; SK.ramps.push({ k, east, xa: east ? x1 - S : x0 + t, xb: east ? x1 - t : x0 + S }); }
  for (const R of SK.ramps) {
    const sx = R.east ? x1 - S - 6 : x0 + S, lowY = R.east ? y0 + r1 : y0 + r0, highY = R.east ? y0 + r0 : y0 + r1;
    wall(sx, y0 + r0, sx + 6, y0 + r1, R.k * dh - 5, (R.k + 1) * dh + 5);
    wall(R.xa, lowY - 3, R.xb, lowY + 3, (R.k + 1) * dh - 5, (R.k + 1) * dh + 5);
    wall(R.xa, highY - 3, R.xb, highY + 3, R.k * dh - 5, R.k * dh + 5);
  }
  const [k0, k1, ky0, ky1, kh] = SITE.kicker;
  for (let k = 1; k < NL; k++) {                                    // each deck's edge (the ground floor is open to the yard); the top's south edge open at the launch ramp
    const z0 = k * dh - 5, z1 = k * dh + 16;
    wall(x0, y0, x1, y0 + t, z0, z1); wall(x0, y0, x0 + t, y1, z0, z1); wall(x1 - t, y0, x1, y1, z0, z1);
    if (k < NL - 1) wall(x0, y1 - t, x1, y1, z0, z1); else { wall(x0, y1 - t, k0, y1, z0, z1); wall(k1, y1 - t, x1, y1, z0, z1); }
  }
  wall(k0, y1 - 3, k1, y1 + 3, top - 5, top + 30, { foot: true });   // a rail at the launch ramp's lip: people stop, cars go
  SK.cols = [];
  for (const x of [x0 + S + 12, x1 - S - 12]) for (const y of [y0 + r0, (y0 + y1) / 2, y0 + r1]) { SK.cols.push([x, y]); wall(x - 5, y - 5, x + 5, y + 5, -5, top - 3); }
  // the yard: the cabins, the piles, the crane masts
  { const [cx, cy, w, d] = SITE.office; wall(cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2); }
  for (const [cx, cy, w, d] of SITE.piles) wall(cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2, undefined, undefined, { h3: 18 });
  for (const [cx, cy] of SITE.cranes) wall(cx - 9, cy - 9, cx + 9, cy + 9);
  // the jumps: the plank ramps, the mounds, the launch ramp up top (js/08zt siteJump)
  SK.jumps = SITE.ramps.map(([x, y, deg, len, w, h]) => ({ kind: 'ramp', x, y, ux: Math.cos(deg * Math.PI / 180), uy: Math.sin(deg * Math.PI / 180), len, w, h, z: 0 }))
    .concat(SITE.mounds.map(([x, y, r, h]) => ({ kind: 'mound', x, y, r, h, z: 0 })))
    .concat([{ kind: 'ramp', x: (k0 + k1) / 2, y: ky0, ux: 0, uy: 1, len: ky1 - ky0, w: k1 - k0, h: kh, z: top, top: true }]);
  LM_CLEAR.push([(a0 + a1) / 2, (b0 + b1) / 2, (a1 - a0) / 2 + 6, (b1 - b0) / 2 + 6]);
  sitePosts();                                                     // the deck workers, the night guard (js/08zt)
  LMS.push(SK.lm = { cx: (a0 + a1) / 2, cy: (b0 + b1) / 2, a: 0, rad: Math.hypot(a1 - a0, b1 - b0) / 2 + 380, make: () => withSeed(8141, makeSite), mesh: null });
}
const inSite = (x, y, m) => !!SITE && x > SITE.area[0] - m && x < SITE.area[2] + m && y > SITE.area[1] - m && y < SITE.area[3] + m;
const inTower = (x, y, m) => !!SK.T && x > SK.T.x0 - m && x < SK.T.x1 + m && y > SK.T.y0 - m && y < SK.T.y1 + m;
function skRampH(R, y) {                  // a ramp's height at y: from its low end (level k) to its high end (k + 1)
  const T = SK.T, u = clamp((y - T.y0 - T.r0) / (T.r1 - T.r0), 0, 1);
  return (R.k + (R.east ? 1 - u : u)) * T.dh;
}
function jumpH(J, x, y) {                 // the height of a jump's surface at (x, y) above its base, or -1 off it
  const dx = x - J.x, dy = y - J.y;
  if (J.kind === 'mound') { const d = Math.hypot(dx, dy); return d < J.r ? J.h * (1 - d / J.r) : -1; }
  const u = dx * J.ux + dy * J.uy, v = -dx * J.uy + dy * J.ux; return u >= 0 && u <= J.len && Math.abs(v) <= J.w / 2 ? J.h * u / J.len : -1;
}

/* ---------- the model ---------- */
function makeSite() {
  const g = new THREE.Group(), T = SK.T, C = _C, cx0 = SK.lm.cx, cy0 = SK.lm.cy, X = x => x - cx0, Z = y => y - cy0;
  const [a0, b0, a1, b1] = SITE.area, Y = new GeoBuilder(), YG = new GeoBuilder(), sub = [], conc = C('#a8a49a'), dark = C('#2a2d38'), yel = C('#ffd23f'), blk = C('#16161c'), wood = C('#a0784a');
  const fl = (gb, p0, q0, p1, q1, y, col) => flat(gb, X(p0), Z(q0), X(p1), Z(q1), y, col);
  // the ground: packed dirt with tyre tracks, a gravel apron at the gate, concrete under the tower
  fl(Y, a0, b0, T.x0, b1, 0.7, C('#7a6a52'));
  for (let k = 0; k < 14; k++) { const x = rand(a0 + 20, T.x0 - 20), y = rand(b0 + 20, b1 - 20), L = rand(30, 90); fl(Y, x, y, x + L, y + 5, 0.75, C('#655742')); }
  fl(Y, a0, SITE.gate[1] - SITE.gate[2] / 2, a0 + 60, SITE.gate[1] + SITE.gate[2] / 2, 0.8, C('#8a8478'));
  fl(Y, T.x0, T.y0, T.x1, T.y1, 0.6, C('#8e8a82'));
  // the hoarding: blue plywood, a white top band, the name along the avenue side
  const hoard = (p0, q0, p1, q1) => { box5(Y, X(p0), 0, Z(q0), X(p1), 28, Z(q1), C('#1e3a6a')); box5(Y, X(p0) - 0.3, 22, Z(q0) - 0.3, X(p1) + 0.3, 25, Z(q1) + 0.3, C('#f4f4f4')); };
  const [, gy, gw] = SITE.gate, [px, , pw] = SITE.panel;
  hoard(a0, b0 - 2, px - pw / 2, b0 + 2); hoard(px + pw / 2, b0 - 2, a1, b0 + 2); hoard(a0, b1 - 2, a1, b1 + 2); hoard(a1 - 2, b0, a1 + 2, b1);
  hoard(a0 - 2, b0, a0 + 2, gy - gw / 2); hoard(a0 - 2, gy + gw / 2, a0 + 2, b1);
  for (let x = a0 + 70; x < a1 - 120; x += 220) { const s = fasciaSign('SKYLINE ONE · OPENING 1998', '#ffd23f', 160, 16); s.position.set(X(x + 80), 13, Z(b1) + 2.2); sub.push(s); }
  { const s = fasciaSign('SKYLINE ONE', '#ffd23f', 90, 14); s.position.set(X(a0 + 60), 13, Z(b1) - 2.2 - 180); sub.push(s); }
  // the broken panel: lying in the gap, propped on the stack
  face(Y, [[X(px - pw / 2 - 2), 0.9, Z(b0) + 4], [X(px + pw / 2 + 2), 0.9, Z(b0) + 4], [X(px + pw / 2 + 6), 10, Z(b0) + 22], [X(px - pw / 2 + 2), 10, Z(b0) + 22]], [0, 0.9, -0.4], C('#1e3a6a'));
  // the gate: posts in yellow and black (the leaves swing: below)
  for (const s of [-1, 1]) for (let y = 0; y < 34; y += 5) box5(Y, X(a0) - 3, y, Z(gy + s * (gw / 2 + 3)) - 3, X(a0) + 3, Math.min(34, y + 5), Z(gy + s * (gw / 2 + 3)) + 3, (y / 5) % 2 ? blk : yel);
  // the site office: two stacked cabins, steps up to the top one, lit windows
  { const [cx, cy, w, d] = SITE.office;
    for (const [lv, col] of [[0, '#e8e4da'], [1, '#d8d4c8']]) { const y = lv * 22; box5(Y, X(cx - w / 2), y, Z(cy - d / 2), X(cx + w / 2), y + 21, Z(cy + d / 2), C(col)); box5(Y, X(cx - w / 2) - 0.3, y + 15, Z(cy - d / 2) - 0.3, X(cx + w / 2) + 0.3, y + 17, Z(cy + d / 2) + 0.3, C('#2f5fae'));
      for (let x = cx - w / 2 + 8; x < cx + w / 2 - 8; x += 16) box5(YG, X(x), y + 7, Z(cy + d / 2), X(x) + 9, y + 13, Z(cy + d / 2) + 0.5, C('#ffe6a8')); }
    for (let s = 0; s < 6; s++) box5(Y, X(cx + w / 2) + 2, s * 3.6, Z(cy - d / 2) + 6 + s * 4, X(cx + w / 2) + 12, s * 3.6 + 1, Z(cy - d / 2) + 10 + s * 4, C('#6a6f7c'));
    const os = fasciaSign('SITE OFFICE', '#ffd23f', 50, 9); os.position.set(X(cx), 50, Z(cy + d / 2) + 0.8); sub.push(os); }
  // the piles: rebar, pallets of bricks, concrete pipes, wooden pallets
  for (const [cx, cy, w, d, kind] of SITE.piles) {
    const p0 = cx - w / 2, q0 = cy - d / 2;
    if (kind === 'rebar') for (let k = 0; k < 9; k++) box5(Y, X(p0), 1 + (k % 3) * 2.2, Z(q0 + 2 + Math.floor(k / 3) * 6 + (k % 3)), X(p0 + w), 2.6 + (k % 3) * 2.2, Z(q0 + 4 + Math.floor(k / 3) * 6 + (k % 3)), C('#7a4a2a'));
    else if (kind === 'bricks') for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = p0 + 2 + i * (w / 2), y = q0 + 2 + j * (d / 2); box5(Y, X(x), 0, Z(y), X(x + w / 2 - 4), 3, Z(y + d / 2 - 4), wood); box5(Y, X(x) + 1, 3, Z(y) + 1, X(x + w / 2 - 5), 13, Z(y + d / 2 - 5), C('#a8483a')); }
    else if (kind === 'pipes') for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(GCylZ, new THREE.MeshLambertMaterial({ color: 0x9a968c })); m.scale.set(5.5, 5.5, d * 0.9); m.position.set(X(cx) + (k === 2 ? 0 : k ? 5.6 : -5.6), k === 2 ? 15 : 5.5, Z(cy)); sub.push(m); }
    else for (let k = 0; k < 4; k++) box5(Y, X(p0) + 1, k * 3.2, Z(q0) + 1, X(p0 + w) - 1, k * 3.2 + 2.6, Z(q0 + d) - 1, wood);
  }
  // the dig pit, the mounds, the plank ramps
  { const [cx, cy, w, d] = SITE.pit; fl(Y, cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2, 0.8, C('#4a3e30')); fl(Y, cx - w / 2 + 8, cy - d / 2 + 8, cx + w / 2 - 8, cy + d / 2 - 8, 0.85, C('#3a3026')); fl(Y, cx - 8, cy, cx + 14, cy + 9, 0.9, C('#3a5070')); }
  for (const J of SK.jumps) {
    if (J.kind === 'mound') { Y.prism(X(J.x), Z(J.y), J.r, 0.5, J.h, C('#8a6a48'), 12, J.r * 0.12, true); continue; }
    if (J.top) continue;                                             // the launch ramp is the top deck's (below)
    const ex = J.x + J.ux * J.len, ey = J.y + J.uy * J.len, nx = -J.uy * J.w / 2, ny = J.ux * J.w / 2;
    face(Y, [[X(J.x + nx), 0.9, Z(J.y + ny)], [X(ex + nx), J.h, Z(ey + ny)], [X(ex - nx), J.h, Z(ey - ny)], [X(J.x - nx), 0.9, Z(J.y - ny)]], [-J.ux * 0.25, 1, -J.uy * 0.25], wood);
    for (const s of [1, -1]) face(Y, [[X(J.x + s * nx), 0, Z(J.y + s * ny)], [X(ex + s * nx), 0, Z(ey + s * ny)], [X(ex + s * nx), J.h, Z(ey + s * ny)], [X(J.x + s * nx), 0.9, Z(J.y + s * ny)]], [s * -J.uy, 0, s * J.ux], C('#6a4a2a'));
    face(Y, [[X(ex + nx), 0, Z(ey + ny)], [X(ex - nx), 0, Z(ey - ny)], [X(ex - nx), J.h, Z(ey - ny)], [X(ex + nx), J.h, Z(ey + ny)]], [J.ux, 0, J.uy], C('#6a4a2a'));
    for (let k = 0; k < 4; k++) { const f = (k + 0.5) / 4; box5(Y, X(J.x + J.ux * J.len * f + nx) - 1.5, J.h * f + 0.2, Z(J.y + J.uy * J.len * f + ny) - 1.5, X(J.x + J.ux * J.len * f + nx) + 1.5, J.h * f + 1, Z(J.y + J.uy * J.len * f + ny) + 1.5, k % 2 ? yel : blk); }
  }
  for (const [cx, cy] of SITE.cranes) { box5(Y, X(cx) - 14, 0, Z(cy) - 14, X(cx) + 14, 3, Z(cy) + 14, conc); }
  const ym = lmMesh(Y, YG); g.add(ym); for (const o of sub) { ym.add(o); ym.userData.own.push(o.material); }
  // the tower: a group per level, so the levels above you fade (js/08zt gfxSite)
  const view = { groups: [] }, dh = T.dh, NL = T.levels, S = T.S, x0 = T.x0, x1 = T.x1, y0 = T.y0, y1 = T.y1;
  const rsec = R => ({ xa: X(R.xa), xb: X(R.xb), za: Z(y0 + T.r0), zb: Z(y0 + T.r1) });
  const [k0, k1, ky0, ky1, kh] = SITE.kicker;
  for (let k = 0; k < NL; k++) {
    const TB = new GeoBuilder(), TG = new GeoBuilder(), y = k * dh, top = k === NL - 1, lc = C(SK_COLS[k % SK_COLS.length]);
    const holes = SK.ramps.filter(R => k > 0 && (R.k === k - 1 || R.k === k)).map(rsec), X0 = X(x0), X1 = X(x1), Z0 = Z(y0), Z1 = Z(y1);
    if (k > 0) {                                                    // the slab, minus the holes the ramps go through, in strips along x
      const xs = [X0, X1]; for (const h of holes) xs.push(h.xa, h.xb); xs.sort((a, b) => a - b);
      for (let i = 0; i < xs.length - 1; i++) {
        const xa = xs[i], xb = xs[i + 1]; if (xb - xa < 0.5) continue;
        const hz = holes.filter(h => xa >= h.xa - 0.5 && xb <= h.xb + 0.5); let zs = [[Z0, Z1]];
        for (const h of hz) zs = zs.flatMap(([a, b]) => [[a, Math.min(b, h.za)], [Math.max(a, h.zb), b]]).filter(([a, b]) => b - a > 0.5);
        for (const [za, zb] of zs) box5(TB, xa, y - 3, za, xb, y + 0.4, zb, top ? C('#9a968c') : conc);
      }
    }
    const R = SK.ramps[k];
    if (R) {                                                        // the ramp up from this level, dashes up it, its inner wall
      const r = rsec(R), lowZ = R.east ? r.zb : r.za, highZ = R.east ? r.za : r.zb;
      face(TB, [[r.xa, y + 0.7, lowZ], [r.xb, y + 0.7, lowZ], [r.xb, y + dh + 0.7, highZ], [r.xa, y + dh + 0.7, highZ]], [0, 1, 0], C('#8a8680'));
      for (let s = 0; s < 8; s++) { const f = (s + 0.5) / 8, zz = lowZ + (highZ - lowZ) * f; flat(TB, (r.xa + r.xb) / 2 - 2, zz - 6, (r.xa + r.xb) / 2 + 2, zz + 6, y + dh * f + 1, yel); }
      const sx = R.east ? r.xa - 6 : r.xb, sxo = 6;
      face(TB, [[sx, y, lowZ], [sx, y, highZ], [sx, y + dh + 8, highZ], [sx, y + 8, lowZ]], [R.east ? -1 : 1, 0, 0], conc);
      face(TB, [[sx, y + 8, lowZ], [sx, y + dh + 8, highZ], [sx + sxo, y + dh + 8, highZ], [sx + sxo, y + 8, lowZ]], [0, 1, 0], conc);
      box5(TG, sx, y + 8, Math.min(lowZ, highZ), sx + sxo, y + 9, Math.min(lowZ, highZ) + 4, lc);
    }
    if (!top) {                                                     // columns up to the next deck, and round the edge
      for (const [cx, cy] of SK.cols) box5(TB, X(cx) - 5, y, Z(cy) - 5, X(cx) + 5, y + dh - 3, Z(cy) + 5, conc);
      for (let x = x0; x <= x1 - 8; x += (x1 - x0 - 8) / 4) for (const zz of [y0, y1 - 8]) box5(TB, X(x), y, Z(zz), X(x) + 8, y + dh - 3, Z(zz) + 8, conc);
    }
    if (k > 0) {                                                    // temporary barriers round the edge: yellow and black boards on posts; the top's open at the launch ramp
      const bar = (p0, q0, p1, q1) => { box5(TB, X(p0), y + 9, Z(q0), X(p1), y + 13, Z(q1), yel); for (let x = p0; x < p1 - 1; x += 24) box5(TB, X(x), y, Z(q0), X(Math.min(p1, x + 2)), y + 13, Z(q1), blk); };
      bar(x0, y0, x1, y0 + 2); bar(x0, y0, x0 + 2, y1); bar(x1 - 2, y0, x1, y1);
      if (!top) bar(x0, y1 - 2, x1, y1); else { bar(x0, y1 - 2, k0, y1); bar(k1, y1 - 2, x1, y1); }
      box5(TG, X(x0) - 0.4, y - 3, Z(y1) - 0.2, X(x1) + 0.4, y - 1.5, Z(y1) + 0.4, lc);
    }
    if (top) {                                                      // the launch ramp, rebar out of the columns, formwork, a pallet stack, the developer's board
      face(TB, [[X(k0), y + 0.6, Z(ky0)], [X(k1), y + 0.6, Z(ky0)], [X(k1), y + kh, Z(ky1)], [X(k0), y + kh, Z(ky1)]], [0, 0.97, -0.24], wood);
      for (const s of [k0, k1]) face(TB, [[X(s), y, Z(ky0)], [X(s), y, Z(ky1)], [X(s), y + kh, Z(ky1)], [X(s), y + 0.6, Z(ky0)]], [s === k0 ? -1 : 1, 0, 0], C('#6a4a2a'));
      for (let x = k0; x < k1; x += 10) box5(TB, X(x), y + kh - 0.5, Z(ky1) - 3, X(Math.min(k1, x + 5)), y + kh + 0.5, Z(ky1), (x - k0) / 10 % 2 ? yel : blk);
      for (const [cx, cy] of SK.cols) for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) TB.prism(X(cx) + ox, Z(cy) + oz, 0.5, y, y + 12, C('#7a4a2a'), 4);
      box5(TB, X(x0 + 30), y, Z(y0 + 30), X(x0 + 70), y + 8, Z(y0 + 60), C('#c8a070')); box5(TB, X(x1 - 70), y, Z(y0 + 120), X(x1 - 40), y + 10, Z(y0 + 150), wood);
    }
    const mats = [xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true })];
    const mesh = new THREE.Mesh(mergeBuilders([TB, TG]), mats); g.add(mesh); view.groups.push({ mesh, mats, op: 1 });
  }
  { const SB = new GeoBuilder(), pipe = C('#9aa0ab'), plank = C('#b08a5a'), H = (NL - 1) * dh + 14;   // scaffolding up the north and east faces
    for (let x = x0; x <= x1; x += 34) { SB.prism(X(x), Z(y0) - 8, 0.8, 0, H, pipe, 4); SB.prism(X(x), Z(y0) - 16, 0.8, 0, H, pipe, 4); }
    for (let y = y0; y <= y1; y += 34) { SB.prism(X(x1) + 8, Z(y), 0.8, 0, H, pipe, 4); SB.prism(X(x1) + 16, Z(y), 0.8, 0, H, pipe, 4); }
    for (let k = 1; k < NL; k++) { const yy = k * dh - 2; box5(SB, X(x0), yy, Z(y0) - 17, X(x1), yy + 1.2, Z(y0) - 7, plank); box5(SB, X(x1) + 7, yy, Z(y0), X(x1) + 17, yy + 1.2, Z(y1), plank);
      box5(SB, X(x0), yy + 9, Z(y0) - 17, X(x1), yy + 10, Z(y0) - 16, pipe); box5(SB, X(x1) + 16, yy + 9, Z(y0), X(x1) + 17, yy + 10, Z(y1), pipe); }
    const mats = [xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }))], m = new THREE.Mesh(mergeBuilders([SB]), mats[0]); g.add(m); view.scaff = { mesh: m, mats, op: 1 }; }
  // the moving parts: the gate's two leaves, the two cranes
  const gateG = new THREE.Group(), gm = new THREE.MeshLambertMaterial({ color: 0x8a8f9c }), leaves = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(X(a0), 0, Z(gy + s * gw / 2)); gateG.add(pv);
    const fr = new THREE.Mesh(GB, gm); fr.scale.set(2, 30, gw / 2 - 2); fr.position.set(0, 15, -s * (gw / 4)); pv.add(fr);
    const mesh = new THREE.Mesh(GB, new THREE.MeshBasicMaterial({ color: 0x3a3d47, transparent: true, opacity: 0.55 })); mesh.scale.set(1, 26, gw / 2 - 6); mesh.position.set(0, 15, -s * (gw / 4)); pv.add(mesh);
    leaves.push({ pv, s });
  }
  g.add(gateG);
  const cranes = SITE.cranes.map(([cx, cy, jib, Hc], i) => {
    const mast = new THREE.Group(); mast.position.set(X(cx), 0, Z(cy)); g.add(mast);
    const lat = new THREE.MeshLambertMaterial({ color: 0xf0b800 }), dk = new THREE.MeshLambertMaterial({ color: 0x2a2d38 });
    for (const [ox, oz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { const p = new THREE.Mesh(GB, lat); p.scale.set(1.6, Hc, 1.6); p.position.set(ox, Hc / 2, oz); mast.add(p); }
    for (let y = 12; y < Hc; y += 24) { const b = new THREE.Mesh(GB, lat); b.scale.set(13, 1.2, 13); b.position.y = y; mast.add(b); }
    const rot = new THREE.Group(); rot.position.y = Hc; mast.add(rot);
    const jb = new THREE.Mesh(GB, lat); jb.scale.set(jib, 5, 6); jb.position.set(jib / 2, 4, 0); rot.add(jb);
    const cj = new THREE.Mesh(GB, lat); cj.scale.set(90, 4, 6); cj.position.set(-45, 4, 0); rot.add(cj);
    const cw = new THREE.Mesh(GB, dk); cw.scale.set(22, 12, 14); cw.position.set(-80, -2, 0); rot.add(cw);
    const cab = new THREE.Mesh(GB, new THREE.MeshLambertMaterial({ color: 0xe8e4da })); cab.scale.set(10, 10, 10); cab.position.set(6, -4, 8); rot.add(cab);
    const apex = new THREE.Mesh(GB, lat); apex.scale.set(3, 26, 3); apex.position.set(0, 17, 0); rot.add(apex);
    const sign = signMesh('SKYLINE ONE', '#1e3a6a', 70, 10); sign.rotation.x = -Math.PI / 2; sign.position.set(jib * 0.45, 6.6, 0); rot.add(sign);
    const trolley = new THREE.Group(); rot.add(trolley);
    const cable = new THREE.Mesh(GB, dk); cable.scale.set(0.6, 1, 0.6); trolley.add(cable);
    const load = new THREE.Group(); trolley.add(load);
    const beam = new THREE.Mesh(GB, new THREE.MeshLambertMaterial({ color: i ? 0xc0392b : 0x7a7f8c })); beam.scale.set(i ? 40 : 30, i ? 4 : 10, i ? 6 : 24); load.add(beam);
    return { rot, trolley, cable, load, jib, Hc, ph: i * 2.3, mats: [lat, dk, cab.material, beam.material, sign.material] };
  });
  g.userData.own = view.groups.flatMap(v => v.mats).concat(view.scaff.mats, ym.userData.own, [gm], ...cranes.map(c => c.mats), ...leaves.map(l => l.pv.children.map(o => o.material)));
  SK.view = view; SK.parts = { leaves, cranes };
  return g;
}
