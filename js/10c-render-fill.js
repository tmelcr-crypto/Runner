'use strict';
/* ---------- 7f. FILL BUILDINGS: the low shops, apartments and sheds that line every street and fill the blocks ----------
   There are well over a thousand, so they are not meshes of their own: every fill building in one FILL_CHUNK square is merged
   into a single mesh (one draw call per material) that streams in and out like a landmark. They cannot fade one by one, so
   their materials (and the landmarks') cut a dithered hole along the line from the player to the camera instead. */
// XRAY: the point that must stay visible; XRAY_CAM: the camera (three.js gives Lambert and Basic shaders no camera position). Both set every frame.
const FILL_CHUNK = 800, XRAY = { value: new THREE.Vector3(0, -1e5, 0) }, XRAY_CAM = { value: new THREE.Vector3() };
function xray(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uXT = XRAY; sh.uniforms.uXC = XRAY_CAM;
    sh.vertexShader = 'varying vec3 vXw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vXw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vXw;\nuniform vec3 uXT, uXC;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
      '  { vec3 D = normalize(uXC - uXT); float s = dot(vXw - uXT, D);\n' +
      '    if (s > 10.0) { float d = length(vXw - uXT - D * s); vec2 f = mod(floor(gl_FragCoord.xy), 2.0);\n' +
      '      if (d < 20.0 ? f.x + f.y > 0.5 : d < 28.0 && f.x != f.y) discard; } }');
  };
  return m;
}
LM_MAT.forEach(xray);

// materials shared by every chunk: 0-3 facades, 4 shopfront, 5 trim, 6 glow, 7-9 roofs, 10 signs
const FM_SHOP = 4, FM_TRIM = 5, FM_GLOW = 6, FM_ROOF = 7, FM_SIGN = 10;
let FILL_M = null;
function fillMats() {
  if (FILL_M) return FILL_M;
  const lam = o => xray(new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)));
  FILL_M = FAC.map(t => lam({ map: t.map, emissive: 0xffffff, emissiveMap: t.emi }));
  FILL_M.push(lam({ map: SHOPTEX.map, emissive: 0xffffff, emissiveMap: SHOPTEX.emi }), lam({}), xray(new THREE.MeshBasicMaterial({ vertexColors: true })));
  for (const t of ROOFTEX) FILL_M.push(lam({ map: t }));
  FILL_M.push(xray(new THREE.MeshBasicMaterial({ map: SIGNTEX, vertexColors: true })));
  FILL_M.forEach((m, i) => { if (m.emissiveMap) EMI_MATS.add(m); else if (i === FM_GLOW || i === FM_SIGN) NEON_MATS.add(m); });   // dimmed by day (js/12d)
  return FILL_M;
}
function fillChunks() {                                          // one drawable per chunk square that holds fill buildings
  const groups = new Map();
  for (const r of BLD) if (r.fill) { const k = Math.floor((r.cx + SEA) / FILL_CHUNK) * 1024 + Math.floor((r.cy + SEA) / FILL_CHUNK); let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(r); }
  return [...groups.values()].map(list => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const r of list) { x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x + r.w); y0 = Math.min(y0, r.y); y1 = Math.max(y1, r.y + r.h); }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rad: Math.hypot(x1 - x0, y1 - y0) / 2, world: true, mesh: null, make: () => makeFillChunk(list) };
  });
}
function makeFillChunk(list) {
  const B = fillMats().map(() => new GeoBuilder());
  for (const r of list) withSeed(r.seed, () => fillBuilding(B, r));
  const m = new THREE.Mesh(mergeBuilders(B), FILL_M); m.userData.own = []; return m;
}

/* one building, written straight into world space. Its own frame: x along the street, z from the back (-) to the front (+), y up */
function fillBuilding(B, r) {
  const ca = r.ca, sa = r.sa, X = r.cx, Z = r.cy, hw = r.lw / 2, hd = r.lh / 2, y0 = SIDE_H, e = 1.5, kind = r.kind;
  const P = p => [X + ca * p[0] - sa * p[2], p[1], Z + sa * p[0] + ca * p[2]];
  const quad = (gb, a, b, c, d, nx, ny, nz, col, uv) => gb.quad(P(a), P(b), P(c), P(d), [ca * nx - sa * nz, ny, sa * nx + ca * nz], col, uv || Z4);
  const wall = (gb, ax, az, bx, bz, ya, yb, col, uv) => {        // vertical quad from A to B, facing to the right of A -> B
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    quad(gb, [ax, ya, az], [bx, ya, bz], [bx, yb, bz], [ax, yb, az], -dz / l, 0, dx / l, col, uv);
  };
  const flat = (gb, x0, z0, x1, z1, y, col, uv) => quad(gb, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0, 1, 0, col, uv);
  const sides = (gb, x0, z0, x1, z1, ya, yb, col, uvf) => {      // front, east, back, west
    wall(gb, x0, z1, x1, z1, ya, yb, col, uvf && uvf(x1 - x0)); wall(gb, x1, z1, x1, z0, ya, yb, col, uvf && uvf(z1 - z0));
    wall(gb, x1, z0, x0, z0, ya, yb, col, uvf && uvf(x1 - x0)); wall(gb, x0, z0, x0, z1, ya, yb, col, uvf && uvf(z1 - z0));
  };
  const box = (gb, x0, ya, z0, x1, yb, z1, col) => { sides(gb, x0, z0, x1, z1, ya, yb, col); flat(gb, x0, z0, x1, z1, yb, col); };
  const ledge = (gb, x0, z0, x1, z1, ya, yb, wd, col, inner) => {   // a frame round the building: outside, top strips, inside if it stands free
    sides(gb, x0, z0, x1, z1, ya, yb, col);
    flat(gb, x0, z1 - wd, x1, z1, yb, col); flat(gb, x0, z0, x1, z0 + wd, yb, col); flat(gb, x0, z0 + wd, x0 + wd, z1 - wd, yb, col); flat(gb, x1 - wd, z0 + wd, x1, z1 - wd, yb, col);
    if (inner) { const a0 = x0 + wd, a1 = x1 - wd, b0 = z0 + wd, b1 = z1 - wd; wall(gb, a1, b1, a0, b1, ya, yb, col); wall(gb, a0, b1, a0, b0, ya, yb, col); wall(gb, a0, b0, a1, b0, ya, yb, col); wall(gb, a1, b0, a1, b1, ya, yb, col); }
  };
  const prism = (lx, lz, rr, ya, yb, col, seg, rTop, cap) => { const w = P([lx, 0, lz]); B[FM_TRIM].prism(w[0], w[2], rr, ya, yb, col, seg, rTop, cap); };

  const C = h => new THREE.Color(h), base = C(r.c), style = { office: 0, apartment: 1, deco: 1, brick: 2, warehouse: 3 }[kind] ?? 1;
  const tint = r.pastel ? base.clone().lerp(C(0xffffff), 0.15) : kind === 'brick' ? base.clone().multiplyScalar(0.85).lerp(C(0xb5654a), 0.5)
    : kind === 'warehouse' ? base.clone().lerp(C(0xb9bcc4), 0.7) : r.special ? base.clone() : base.clone().lerp(C(0xffffff), 0.35);   // hospital white, police station blue
  const trimC = r.pastel ? C(0xf4efe6).multiplyScalar(0.8) : (kind === 'deco' ? C(0xd9c27a) : tint.clone().lerp(C(0xf0ece0), 0.7)).multiplyScalar(0.55);
  const gfC = tint.clone().lerp(C(0xdad5c9), 0.55).multiplyScalar(0.7), W1 = C(0xffffff), iron = C(0x2b2e38), acC = C(0x9aa0ab), fanC = C(0x555a66);
  const roofC = r.special === 'hospital' ? C(0xdfe4ea) : r.special === 'police' ? C(0x2a4aa8).multiplyScalar(0.7) : r.special === 'fire' ? C(0x7a1a22) : r.pastel ? tint.clone().lerp(C(0xffffff), 0.45).multiplyScalar(0.8) : (kind === 'warehouse' ? C(0xc2c6d0) : kind === 'deco' ? C(0xcfcbc0) : C(0x8a8d97).lerp(base, 0.12)).multiplyScalar(0.42);
  const roofK = kind === 'warehouse' ? 1 : kind === 'deco' ? 2 : 0, NEO = C(pick(GLOW));
  const nF = Math.max(1, Math.round((r.H - GFH) / FLOOR)), yG = y0 + GFH, yT = yG + nF * FLOOR;
  const facUV = (floors) => { const ov = randi(0, 3) / 4, v = floors / 4; return len => { const u = Math.max(1, Math.round(len / BAY)) / 4, ou = randi(0, 3) / 4; return [[ou, ov], [ou + u, ov], [ou + u, ov + v], [ou, ov + v]]; }; };
  const x0 = -hw, x1 = hw, z0 = -hd, z1 = hd, ix0 = x0 + e, ix1 = x1 - e, iz0 = z0 + e, iz1 = z1 - e, F = B[style], T = B[FM_TRIM], G = B[FM_GLOW], S = B[FM_SIGN];

  /* ground floor: plinth, shopfront (street side of shops) or plain windows, a stone ledge on top */
  sides(T, x0, z0, x1, z1, y0, y0 + 2.5, tint.clone().multiplyScalar(0.55));
  const gUV = facUV(1);
  if (r.shop && kind !== 'warehouse') {
    const nb = Math.max(1, Math.round((ix1 - ix0) / BAY)), ou = randi(0, 3) / 4;
    wall(B[FM_SHOP], ix0, iz1, ix1, iz1, y0 + 2.5, yG, gfC, [[ou, 0], [ou + nb / 4, 0], [ou + nb / 4, 1], [ou, 1]]);
  } else wall(F, ix0, iz1, ix1, iz1, y0 + 2.5, yG, gfC, gUV(ix1 - ix0));
  wall(F, ix1, iz1, ix1, iz0, y0 + 2.5, yG, gfC, gUV(iz1 - iz0)); wall(F, ix1, iz0, ix0, iz0, y0 + 2.5, yG, gfC, gUV(ix1 - ix0)); wall(F, ix0, iz0, ix0, iz1, y0 + 2.5, yG, gfC, gUV(iz1 - iz0));
  if (kind === 'warehouse') {                                     // loading door on the street side, with a light over it
    const dw = Math.min(34, (ix1 - ix0) * 0.5), dx = rand(-1, 1) * ((ix1 - ix0) / 2 - dw / 2 - 4);
    box(T, dx - dw / 2, y0, iz1 - 0.5, dx + dw / 2, y0 + 16, iz1 + 0.6, C(0x5c6170));
    for (let y = y0 + 3; y < y0 + 16; y += 3) wall(T, dx - dw / 2, iz1 + 0.7, dx + dw / 2, iz1 + 0.7, y, y + 0.6, C(0x41454f));
    box(G, dx - 3, y0 + 17, iz1, dx + 3, y0 + 18.4, iz1 + 2, C('#ffe9a8'));
  }
  ledge(T, x0, z0, x1, z1, yG - 1.2, yG + 1.2, e + 1.4, trimC);
  for (const [px, pz] of [[x0, z0], [x1 - 4, z0], [x0, z1 - 4], [x1 - 4, z1 - 4]]) sides(T, px, pz, px + 4, pz + 4, y0 + 2.5, yT - 2.6, trimC);

  /* upper floors, cornice, roof deck, parapet, neon crown */
  sides(F, ix0, iz0, ix1, iz1, yG + 1.2, yT, tint, facUV(nF));
  if (kind === 'deco' || kind === 'brick') for (let f = 1; f < nF; f++) ledge(T, x0 + 0.6, z0 + 0.6, x1 - 0.6, z1 - 0.6, yG + f * FLOOR - 0.8, yG + f * FLOOR + 0.8, e + 0.8, trimC);
  ledge(T, x0, z0, x1, z1, yT - 2.6, yT, e + 1.6, trimC.clone().multiplyScalar(0.92));
  flat(B[FM_ROOF + roofK], x0, z0, x1, z1, yT, roofC, [[0, 0], [2 * hw / 48, 0], [2 * hw / 48, 2 * hd / 48], [0, 2 * hd / 48]]);
  ledge(T, x0, z0, x1, z1, yT, yT + 3.2, 2.4, trimC.clone().multiplyScalar(0.85), true);
  if (Math.random() < (r.pastel ? 0.85 : 0.6)) sides(G, x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, yT + 3.2, yT + 4.4, NEO);

  /* the street side of a shop: awnings, a name board over the windows, a blade sign */
  if (r.shop && kind !== 'warehouse') {
    const nb = Math.max(1, Math.round((ix1 - ix0) / BAY)), bw = (ix1 - ix0) / nb, ac1 = C(pick(AWN)), ac2 = C(0xf4efe6), yH = yG - 3, yL = yG - 8.5, zF = z1 + 4.6, nl = Math.hypot(5.5, zF - iz1);
    if (kind !== 'office' || Math.random() < 0.4) for (let k = 0; k < nb; k++) {
      if (nb > 3 && Math.random() < 0.15) continue;
      const a = ix0 + k * bw + 0.8, b = ix0 + (k + 1) * bw - 0.8, c = k % 2 ? ac2 : ac1;
      quad(T, [a, yL, zF], [b, yL, zF], [b, yH, iz1], [a, yH, iz1], 0, (zF - iz1) / nl, 5.5 / nl, c);
      wall(T, a, zF, b, zF, yL - 2.4, yL, c);
    }
    if (Math.random() < 0.55 && ix1 - ix0 > 30) {                // name board across the front, just above the ground floor
      const bw2 = Math.min(64, ix1 - ix0 - 12), bx = rand(-1, 1) * ((ix1 - ix0) / 2 - bw2 / 2 - 4), k = randi(0, 15);
      box(T, bx - bw2 / 2 - 1, yG + 1.4, z1 - 0.2, bx + bw2 / 2 + 1, yG + 11.4, z1 + 0.6, iron);
      wall(S, bx - bw2 / 2, z1 + 0.7, bx + bw2 / 2, z1 + 0.7, yG + 2, yG + 10.8, W1, signUV(k));
    }
    if (Math.random() < 0.4 && nF >= 1) {                         // blade sign sticking out over the sidewalk
      const bx = rand(ix0 + 8, ix1 - 8), ya = yG + 2, yb = ya + 11, uv = signUV(randi(0, 15)), zo = z1 + 13;
      box(T, bx - 1.1, ya, z1, bx + 1.1, yb, zo, iron);
      wall(S, bx + 1.2, zo, bx + 1.2, z1, ya, yb, W1, uv); wall(S, bx - 1.2, z1, bx - 1.2, zo, ya, yb, W1, uv);
      box(G, bx - 1.5, ya - 0.6, zo - 0.6, bx + 1.5, yb + 0.6, zo + 0.6, C(pick(GLOW)));
    }
  }
  if (kind === 'apartment' && nF >= 2) {                           // balconies on the upper floors of the street side
    const nb = Math.max(1, Math.round((ix1 - ix0) / BAY)), bw = (ix1 - ix0) / nb;
    for (let f = 1; f < nF; f++) for (let k = 0; k < nb; k++) if (Math.random() < 0.3) {
      const bx = ix0 + (k + 0.5) * bw, yf = yG + f * FLOOR + 0.5;
      box(T, bx - 5.5, yf, iz1, bx + 5.5, yf + 0.9, z1 + 4, trimC); wall(T, bx - 5.5, z1 + 4, bx + 5.5, z1 + 4, yf + 0.9, yf + 3.8, C(0x4a4e5c));
    }
  }

  /* the back, where it opens on an alley or a yard: a back door under a lamp, a drainpipe, AC boxes, a fire escape, graffiti */
  if (r.back && 2 * hw >= 26) {
    const zw = iz0, zb = zw - 0.3, used = [];                     // zw: the wall itself, inside the corner piers
    const free = (a, b) => used.every(([u, v]) => b < u - 2 || a > v + 2) && (used.push([a, b]), true);
    const back = (gb, xa, xb, ya, yb, col, uv) => wall(gb, Math.max(xa, xb), zb, Math.min(xa, xb), zb, ya, yb, col, uv);   // a flat panel on the back wall
    if (kind === 'warehouse') {                                    // a roller door and a dock plate
      const dw = Math.min(28, (ix1 - ix0) * 0.45), dx = rand(-1, 1) * ((ix1 - ix0) / 2 - dw / 2 - 4); free(dx - dw / 2, dx + dw / 2);
      box(T, dx - dw / 2, y0, zw - 0.6, dx + dw / 2, y0 + 15, zw + 0.2, C(0x5c6170));
      for (let y = y0 + 3; y < y0 + 15; y += 3) back(T, dx - dw / 2, dx + dw / 2, y, y + 0.6, C(0x41454f));
      box(T, dx - dw / 2 - 2, y0, z0 - 8, dx + dw / 2 + 2, y0 + 4, zw, C(0x4a4e5c));
      box(G, dx - 3, y0 + 16, zw - 2, dx + 3, y0 + 17.4, zw, C('#ffe9a8'));
    } else {                                                       // a steel door with a step, and a caged lamp over it
      const dx = rand(ix0 + 7, ix1 - 7); free(dx - 7, dx + 7);
      box(T, dx - 4.5, y0, zw - 0.7, dx + 4.5, y0 + 13, zw + 0.2, C(pick([0x3a4a5c, 0x5c3a3a, 0x3a5c4a, 0x55586a])));
      box(T, dx - 6, y0, z0 - 4, dx + 6, y0 + 1.2, zw, gfC.clone().multiplyScalar(0.8));
      box(G, dx - 1.6, y0 + 15, zw - 2.2, dx + 1.6, y0 + 16.6, zw, C('#ffcf7a'));
    }
    const px = Math.random() < 0.5 ? x0 + 3 : x1 - 3;               // drainpipe down the back corner, with a shoe at the bottom
    prism(px, z0 - 1.4, 0.9, y0, yT + 2, iron, 6); box(T, px - 1.6, y0, z0 - 3.6, px + 1.6, y0 + 1.6, z0, iron);
    if (nF >= 2 && kind !== 'warehouse' && 2 * hw >= 40 && Math.random() < (kind === 'office' ? 0.35 : 0.8)) {
      const fw = Math.min(42, 2 * hw - 18), fx = rand(x0 + 9 + fw / 2, x1 - 9 - fw / 2), fa = fx - fw / 2, fb = fx + fw / 2, zo = z0 - 8;
      free(fa - 2, fb + 2);
      for (let f = 1; f <= nF; f++) {                              // a landing at every upper floor: grating, toe board, rail and posts
        const yl = yG + (f - 1) * FLOOR + 0.6;
        box(T, fa, yl - 0.7, zo, fb, yl, zw, iron);
        for (let gx = fa + 3; gx < fb - 1; gx += 3) flat(T, gx, zo + 0.6, gx + 0.8, zw - 0.6, yl + 0.05, C(0x4a4e5c));
        box(T, fa, yl + 3.6, zo, fb, yl + 4.2, zo + 0.6, iron); box(T, fa, yl + 3.6, zo, fa + 0.6, yl + 4.2, zw, iron); box(T, fb - 0.6, yl + 3.6, zo, fb, yl + 4.2, zw, iron);
        for (const tx of [fa, fx - 0.3, fb - 0.6]) box(T, tx, yl, zo, tx + 0.6, yl + 3.6, zo + 0.6, iron);
        back(G, fx - 4, fx + 4, yl + 1, yl + 7.5, C(Math.random() < 0.5 ? 0x3a3550 : 0xffd98a));   // the window it serves, lit or dark
        if (f < nF) {                                              // a stair flight up to the next landing, alternating sides
          const up = f % 2 ? 1 : -1, xa = up > 0 ? fa + 2 : fb - 2, xb = up > 0 ? fb - 10 : fa + 10, ya = yl, yb = yl + FLOOR, za = zo + 0.8, zc = zo + 4.2;
          const l = Math.hypot(xb - xa, yb - ya), nx = -(yb - ya) / l * up, ny = Math.abs(xb - xa) / l;
          const lo = Math.min(xa, xb), hi = Math.max(xa, xb), ylo = up > 0 ? ya : yb, yhi = up > 0 ? yb : ya;
          quad(T, [lo, ylo, zc], [hi, yhi, zc], [hi, yhi, za], [lo, ylo, za], nx, ny, 0, C(0x3a3d47));
          for (let k = 1; k < 8; k++) { const t = k / 8, sx = lo + (hi - lo) * t, sy = ylo + (yhi - ylo) * t; flat(T, sx - 0.4, za, sx + 0.4, zc, sy + 0.15, C(0x5a5e6a)); }
          quad(T, [hi, yhi + 3, za - 0.1], [lo, ylo + 3, za - 0.1], [lo, ylo + 3.6, za - 0.1], [hi, yhi + 3.6, za - 0.1], 0, 0, -1, iron);   // hand rail
        }
      }
      const lx = Math.random() < 0.5 ? fa + 3 : fb - 7, yl = yG + 0.6;   // the drop ladder hangs from the lowest landing, short of the ground
      for (const rx of [lx, lx + 4]) box(T, rx, y0 + 7, zo + 0.2, rx + 0.5, yl, zo + 0.7, iron);
      for (let y = y0 + 8; y < yl; y += 2.2) box(T, lx, y, zo + 0.2, lx + 4.5, y + 0.4, zo + 0.7, iron);
      const top = yG + (nF - 1) * FLOOR + 0.6, gx = fb - 4;          // and a gooseneck ladder from the top landing over the parapet
      for (const rx of [gx, gx + 3]) box(T, rx, top, z0 - 1.2, rx + 0.5, yT + 6, z0 - 0.6, iron);
    }
    for (let f = 1; f <= nF; f++) for (let k = 0; k < 2; k++) if (Math.random() < 0.3) {   // window AC boxes, dripping on the alley
      const ax = rand(ix0 + 6, ix1 - 6); if (!free(ax - 5, ax + 5)) continue;
      const ay = yG + (f - 1) * FLOOR + 3; box(T, ax - 4.5, ay, zw - 5, ax + 4.5, ay + 5, zw, acC); back(T, ax - 3.5, ax + 3.5, ay + 0.8, ay + 4.2, fanC);
    }
    if (Math.random() < 0.55) {                                    // graffiti low on the wall: a few overlapping tags
      const gw = Math.min(ix1 - ix0 - 4, rand(14, 34)), gx = rand(ix0 + 2 + gw / 2, ix1 - 2 - gw / 2);
      if (free(gx - gw / 2, gx + gw / 2)) for (let k = 0; k < randi(2, 3); k++) {
        const a = gx + rand(-gw / 2, gw / 4), b = Math.min(gx + gw / 2, a + rand(gw / 3, gw / 2 + 4)), ya = y0 + rand(3, 6);
        wall(G, b, zb - 0.1 * k, a, zb - 0.1 * k, ya, ya + rand(4, 8), C(pick(GLOW)).multiplyScalar(0.75));
      }
    }
  }

  /* roof kit (not on a hospital, a police or a fire station: their roofs carry the cross and the lettering, js/10e) */
  if (r.special) return;
  const taken = [];
  const spot = (w, d) => {
    if (2 * hw < w + 14 || 2 * hd < d + 14) return null;
    for (let t = 0; t < 16; t++) {
      const px = rand(x0 + 7, x1 - 7 - w), pz = rand(z0 + 7, z1 - 7 - d);
      if (taken.every(q => px > q[2] + 3 || px + w < q[0] - 3 || pz > q[3] + 3 || pz + d < q[1] - 3)) { taken.push([px, pz, px + w, pz + d]); return [px, pz]; }
    }
    return null;
  };
  const faceZ = ca > 0 ? 1 : -1;                                   // roof boards face whichever way the camera sees them
  for (let i = randi(1, 3); i > 0; i--) { const s = spot(9, 9); if (s) { box(T, s[0], yT, s[1], s[0] + 8, yT + 5, s[1] + 8, acC); flat(T, s[0] + 1.5, s[1] + 1.5, s[0] + 6.5, s[1] + 6.5, yT + 5.3, fanC); } }
  if (Math.random() < 0.45) { const s = spot(12, 10); if (s) { box(T, s[0], yT, s[1], s[0] + 12, yT + 9, s[1] + 10, tint.clone().lerp(C(0xcfcfd4), 0.5)); box(T, s[0] - 0.5, yT + 9, s[1] - 0.5, s[0] + 12.5, yT + 10, s[1] + 10.5, trimC); } }
  if (kind === 'warehouse') {
    for (let k = 0, n = Math.max(1, Math.floor((2 * hd - 20) / 22)); k < n; k++) {   // skylight strips
      const zc = z0 + 14 + k * 22; if (zc > z1 - 12) break;
      box(T, x0 + 10, yT, zc, x1 - 10, yT + 2.4, zc + 7, C(0x4d6aa8));
    }
    for (let i = 0; i < 2; i++) { const v = spot(6, 6); if (v) { prism(v[0] + 3, v[1] + 3, 2.4, yT, yT + 6, iron, 6); prism(v[0] + 3, v[1] + 3, 3.4, yT + 6, yT + 8, C(0x353841), 6, 0.3, true); } }
  } else if ((kind === 'apartment' || kind === 'brick') && Math.random() < 0.35) {
    const s = spot(12, 12); if (s) { const cx = s[0] + 6, cz = s[1] + 6;
      for (const [dx, dz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) box(T, cx + dx - 0.5, yT, cz + dz - 0.5, cx + dx + 0.5, yT + 7, cz + dz + 0.5, iron);
      prism(cx, cz, 5.2, yT + 7, yT + 15, C(0x8a6a48), 8); prism(cx, cz, 5.8, yT + 15, yT + 19.5, C(0x353841), 8, 0.4, true); }
  } else if (kind === 'deco' && 2 * hw > 40) {                     // stepped fin over the entrance
    const fx = rand(-0.2, 0.2) * hw; box(T, fx - 5, yT, z1 - 8, fx + 5, yT + 12, z1, trimC); box(T, fx - 3, yT + 12, z1 - 6, fx + 3, yT + 18, z1 - 1, trimC);
    box(G, fx - 0.8, yT + 1, z1 - 0.3, fx + 0.8, yT + 17, z1 + 0.5, NEO);
  }
  if (Math.random() < 0.2) { const s = spot(6, 6); if (s) { prism(s[0] + 3, s[1] + 3, 0.5, yT, yT + 3, iron, 5); prism(s[0] + 3, s[1] + 3, 3.2, yT + 3, yT + 5.6, C(0xe8eaee), 10, 0.8, true); } }
  if ((kind === 'brick' || kind === 'office') && Math.random() < 0.18) {   // a lit board on the roof
    const s = spot(30, 4); if (s) {
      const bx = s[0], bz = s[1] + 2, uv = signUV(randi(0, 15));
      box(T, bx + 3, yT, bz - 0.6, bx + 4.2, yT + 10, bz + 0.6, iron); box(T, bx + 25.8, yT, bz - 0.6, bx + 27, yT + 10, bz + 0.6, iron);
      box(T, bx, yT + 10, bz - 0.6, bx + 30, yT + 22, bz + 0.6, iron);
      if (faceZ > 0) wall(S, bx + 1, bz + 0.7, bx + 29, bz + 0.7, yT + 10.6, yT + 21.4, W1, uv); else wall(S, bx + 29, bz - 0.7, bx + 1, bz - 0.7, yT + 10.6, yT + 21.4, W1, uv);
    }
  }
}
