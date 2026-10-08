'use strict';
/* ---------- 10. OCTAGRID MAP PREVIEW ----------
   Loads a file exported from the Octagrid city builder and shows it in the neon 3D style.
   Preview only: no driving or people yet. File format: format 'octagrid-city', units are grid cells (1 cell = 10 m). */
const PV_U = 90;                       // game units per Octagrid cell
let pv = null;
const pvPtrs = new Map();
const VCOL = ['#ff3fb4', '#35d8ff', '#8a5cff', '#ffb02e', '#3dffa6', '#ff4d6d', '#4d7aff', '#b79cff', '#ff7a3d', '#2bf3ff', '#ffe14a', '#ff2bd6', '#6f86ff', '#ffd0a0', '#9fb8d8'];
function withSeed(seed, fn) {           // same seed, same building: the map file recreates exactly what the editor placed
  const keep = Math.random; let a = (seed >>> 0) || 1;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = keep; }
}
function pvPolyBuilding(P, H, kind, colHex) {      // an extruded outline with the same facade textures as the rectangular buildings
  const style = { glass: 0, office: 0, apartment: 1, deco: 1, brick: 2, warehouse: 3 }[kind], tex = FAC[style];
  const base = new THREE.Color(colHex), C = h => new THREE.Color(h);
  const tint = kind === 'glass' ? base.clone().lerp(C(0x9fb8d8), 0.65) : kind === 'brick' ? base.clone().multiplyScalar(0.85).lerp(C(0xb5654a), 0.5)
    : kind === 'warehouse' ? base.clone().lerp(C(0xb9bcc4), 0.7) : base.clone().lerp(C(0xffffff), 0.35);
  let A = 0; for (let i = 0; i < P.length; i++) { const q = P[(i + 1) % P.length]; A += P[i][0] * q[1] - q[0] * P[i][1]; }
  const pos = [], nor = [], uv = [], y0 = SIDE_H, y1 = SIDE_H + H;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    let nx = dz / L, nz = -dx / L; if (A < 0) { nx = -nx; nz = -nz; }
    const u = Math.max(1, Math.round(L / BAY)) / 4, v = (y1 - y0) / FLOOR / 4, ou = (i % 4) / 4;
    const q = [[a[0], y0, a[1], ou, 0], [b[0], y0, b[1], ou + u, 0], [b[0], y1, b[1], ou + u, v], [a[0], y1, a[1], ou, v]];
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], q[k][1], q[k][2]); nor.push(nx, 0, nz); uv.push(q[k][3], q[k][4]); }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const wm = new THREE.MeshLambertMaterial({ map: tex.map, emissive: 0xffffff, emissiveMap: tex.emi, color: tint, side: THREE.DoubleSide });
  const rs = new THREE.Shape(P.map(q => new THREE.Vector2(q[0], -q[1]))), rg = new THREE.ShapeGeometry(rs); rg.rotateX(-Math.PI / 2);
  const rm = new THREE.MeshLambertMaterial({ color: new THREE.Color(0x8a8d97).lerp(base, 0.12).multiplyScalar(0.42), side: THREE.DoubleSide });
  const g = new THREE.Group(), roof = new THREE.Mesh(rg, rm); roof.position.y = y1 + 0.2; g.add(new THREE.Mesh(wg, wm), roof);
  const ln = P.map(q => new THREE.Vector3(q[0], y1 + 0.6, q[1])), neon = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ln), new THREE.LineBasicMaterial({ color: pick([0xff2bd6, 0x2bf3ff, 0xffd23f]) })); g.add(neon);
  return g;
}
function loadMsg(t, bad) { const e = $('loadMsg'); e.textContent = t; e.style.color = bad ? '#ff4d6d' : ''; }
function pvLoad(text) {
  let m; try { m = JSON.parse(text); } catch (e) { return loadMsg('THAT IS NOT A MAP FILE', true); }
  if (!m || m.format !== 'octagrid-city' || !Array.isArray(m.roads) || !Array.isArray(m.buildings)) return loadMsg('THAT IS NOT AN OCTAGRID CITY FILE', true);
  try { pvOpen(m); loadMsg(''); } catch (e) { console.error(e); if (pv) pvClose(); loadMsg('COULD NOT BUILD THAT MAP', true); }
}
function pvOpen(m) {
  if (pv) pvClose();
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : 0, arr = a => Array.isArray(a) ? a : [];
  const roads = arr(m.roads).filter(r => r && r.a && r.b), blds = arr(m.buildings), parks = arr(m.parks), water = arr(m.water), trees = arr(m.trees);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const ext = (x, y, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
  roads.forEach(r => { ext(num(r.a[0]), num(r.a[1]), 1); ext(num(r.b[0]), num(r.b[1]), 1); if (r.control) ext(num(r.control[0]), num(r.control[1]), 1); });
  for (const b of blds.concat(parks, water)) ext(num(b.x), num(b.y), (num(b.w) + num(b.d)) / 2 * 0.75);
  const areas = arr(m.areas).filter(a => a && Array.isArray(a.points) && a.points.length >= 3), props = arr(m.props);
  areas.forEach(a => a.points.forEach(q => ext(num(q[0]), num(q[1]), .2)));
  props.forEach(q => ext(num(q.x), num(q.y), .5));
  trees.forEach(t => ext(num(t.x), num(t.y), .5));
  if (x0 > x1) throw new Error('empty');
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, X = x => (x - cx) * PV_U, Z = y => (y - cy) * PV_U;
  const group = new THREE.Group(), saved = cityGroup; cityGroup = group;
  const pos = [], colr = [], col = new THREE.Color();
  const quad = (p, y, c) => { col.set(c); for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(p[i][0], y, p[i][1]); colr.push(col.r, col.g, col.b); } };
  const RW = { lane: 0.6, street: 1, avenue: 1.7 }, nodes = new Map();
  const rect = (A, d, L, hw, e, off0, off1, y, c) => {        // strip along a road: from off0 to off1 along it, half width hw
    const n = [-d[1], d[0]], s0 = off0, s1 = off1;
    quad([[A[0] + d[0] * s0 + n[0] * hw, A[1] + d[1] * s0 + n[1] * hw], [A[0] + d[0] * s1 + n[0] * hw, A[1] + d[1] * s1 + n[1] * hw],
      [A[0] + d[0] * s1 - n[0] * hw, A[1] + d[1] * s1 - n[1] * hw], [A[0] + d[0] * s0 - n[0] * hw, A[1] + d[1] * s0 - n[1] * hw]], y, c);
  };
  const segs = [], paths = [];
  roads.forEach((r, ri) => {
    const raw = Array.isArray(r.points) && r.points.length >= 2 ? r.points : [r.a, r.b];
    const pts = raw.map(q => [X(num(q[0])), Z(num(q[1]))]), hw = (RW[r.type] || num(r.width) || 1) * PV_U / 2;
    paths.push({ pts, hw, type: r.type });
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L > 0.01) segs.push({ A, B, L, d: [(B[0] - A[0]) / L, (B[1] - A[1]) / L], hw, type: r.type, ri, first: i === 0, last: i === pts.length - 2 });
    }
  });
  for (const s of segs) rect(s.A, s.d, s.L, s.hw + 26, 0, s.first ? -(s.hw + 26) : -1, s.last ? s.L + s.hw + 26 : s.L + 1, 2.0, '#33285a');
  for (const s of segs) rect(s.A, s.d, s.L, s.hw, 0, s.first ? -s.hw : -1, s.last ? s.L + s.hw : s.L + 1, 2.4, '#1a1626');
  for (const s of segs) {
    const n = [-s.d[1], s.d[0]];
    for (const sd of [-1, 1]) {                                  // neon kerb lines
      const off = sd * (s.hw - 4), A = [s.A[0] + n[0] * off, s.A[1] + n[1] * off];
      rect(A, s.d, s.L, 1.2, 0, 0, s.L, 2.8, '#1a9cb8');
    }
    if (s.type === 'avenue') for (const sd of [-1, 1]) { const A = [s.A[0] + n[0] * sd * 3, s.A[1] + n[1] * sd * 3]; rect(A, s.d, s.L, 1.1, 0, 0, s.L, 2.8, '#ff2bd6'); }
  }
  for (const pa of paths) {                                       // dashed centre lines run along the whole path, bends included
    if (pa.type === 'avenue') continue;
    const cum = [0]; for (let i = 1; i < pa.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pa.pts[i][0] - pa.pts[i - 1][0], pa.pts[i][1] - pa.pts[i - 1][1]));
    const total = cum[cum.length - 1], at = t => { let i = 1; while (i < cum.length - 1 && cum[i] < t) i++; const k = (t - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [pa.pts[i - 1][0] + (pa.pts[i][0] - pa.pts[i - 1][0]) * k, pa.pts[i - 1][1] + (pa.pts[i][1] - pa.pts[i - 1][1]) * k]; };
    for (let t = 16; t + 12 < total - 8; t += 26) {
      const P1 = at(t), P2 = at(t + 12), dl = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) || 1;
      rect(P1, [(P2[0] - P1[0]) / dl, (P2[1] - P1[1]) / dl], dl, pa.type === 'lane' ? 1.5 : 2.2, 0, 0, dl, 2.8, '#6fdcff');
    }
  }
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {        // junction patches hide the markings
    const a = segs[i], b = segs[j]; if (a.ri === b.ri) continue;
    const den = (a.A[0] - a.B[0]) * (b.A[1] - b.B[1]) - (a.A[1] - a.B[1]) * (b.A[0] - b.B[0]);
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.A[0] - b.A[0]) * (b.A[1] - b.B[1]) - (a.A[1] - b.A[1]) * (b.A[0] - b.B[0])) / den;
    const u = -((a.A[0] - a.B[0]) * (a.A[1] - b.A[1]) - (a.A[1] - a.B[1]) * (a.A[0] - b.A[0])) / den;
    if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) continue;
    const px = a.A[0] + t * (a.B[0] - a.A[0]), pz = a.A[1] + t * (a.B[1] - a.A[1]), k = Math.round(px / 8) + ',' + Math.round(pz / 8), r = Math.max(a.hw, b.hw), o = nodes.get(k);
    if (!o) nodes.set(k, { x: px, z: pz, r }); else o.r = Math.max(o.r, r);
  }
  for (const n of nodes.values()) for (let k = 0; k < 12; k++) {
    const a0 = k / 12 * TAU, a1 = (k + 1) / 12 * TAU;
    quad([[n.x, n.z], [n.x + Math.cos(a0) * n.r * 1.03, n.z + Math.sin(a0) * n.r * 1.03], [n.x + Math.cos(a1) * n.r * 1.03, n.z + Math.sin(a1) * n.r * 1.03], [n.x, n.z]], 3.2, '#1a1626');
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  group.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  const span = Math.ceil(Math.max(x1 - x0, y1 - y0) / 2 + 12) * 2;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x120a22 })); group.add(ground);
  const grid = new THREE.GridHelper(span * PV_U, span, 0x2a1b4d, 0x1d1238); grid.position.y = 0.3; group.add(grid);
  const slab = (x, y, w, d, rot, h, color, basic, grow) => {
    const mt = basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }), me = new THREE.Mesh(GB, mt);
    me.scale.set(w * PV_U + (grow || 0), h, d * PV_U + (grow || 0)); me.position.set(X(x), h / 2, Z(y)); me.rotation.y = -rot * Math.PI / 180; group.add(me); return me;
  };
  for (const p of parks) { slab(num(p.x), num(p.y), num(p.w) || 4, num(p.d) || 4, num(p.rot), 1.7, '#0b2f36', false, 0); }
  for (const w of water) { slab(num(w.x), num(w.y), num(w.w) || 4, num(w.d) || 3, num(w.rot), 1.6, '#5a3f8f', false, 18); slab(num(w.x), num(w.y), num(w.w) || 4, num(w.d) || 3, num(w.rot), 1.9, 0x17b8ee, true, 0); }
  const KIND = { brick: 'brick', apartment: 'apartment', office: 'office', shop: 'office', warehouse: 'warehouse', glass: 'glass', deco: 'deco', house: 'brick', tower: 'glass', factory: 'warehouse' };
  let nb = 0;
  for (const b of blds) {
    const w = clamp(num(b.w) || 2, 1, 14), d = clamp(num(b.d) || 2, 1, 14), kind = KIND[b.type] || 'office';
    const fl = clamp(Math.round(num(b.floors) || 3), 1, 40), vi = Math.abs(Math.round(num(b.variant))) % 15;
    const r = { x: -w * PV_U / 2, y: -d * PV_U / 2, w: w * PV_U, h: d * PV_U, H: Math.min(560, GFH + fl * FLOOR), c: VCOL[vi], kind };
    const mesh = withSeed(num(b.seed) || (vi * 7919 + 13), () => makeBuilding(r)); mesh.position.set(X(num(b.x)), 0, Z(num(b.y))); mesh.rotation.y = -num(b.rot) * Math.PI / 180; group.add(mesh);
    slab(num(b.x), num(b.y), w, d, num(b.rot), SIDE_H, '#241c42', false, 10); nb++;
  }
  /* free-form shapes: ponds, parks, beaches, and buildings that fill odd gaps */
  const flat = (pts, h, color, basic, y0) => {
    const sh = new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], -q[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const me = new THREE.Mesh(g, basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color })); me.position.y = y0 || 0; group.add(me); return me;
  };
  const grow = (pts, k) => { const c = pts.reduce((p, q) => [p[0] + q[0] / pts.length, p[1] + q[1] / pts.length], [0, 0]); return pts.map(q => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]); };
  for (const a of areas) {
    const P = a.points.map(q => [X(num(q[0])), Z(num(q[1]))]);
    if (a.kind === 'water') { flat(grow(P, 1.07), 1.5, '#5a3f8f', false); flat(P, 1.9, 0x17b8ee, true); }
    else if (a.kind === 'park') flat(P, 1.7, '#0b2f36', false);
    else if (a.kind === 'sand') flat(P, 1.5, '#9a8468', false);
    else if (a.kind === 'building') {
      const kind = KIND[a.type] || 'office', fl = clamp(Math.round(num(a.floors) || 4), 1, 40), vi = Math.abs(Math.round(num(a.variant))) % 15;
      flat(P, SIDE_H, '#241c42', false);
      group.add(withSeed(num(a.seed) || (vi * 104729 + 7), () => pvPolyBuilding(P, Math.min(560, GFH + fl * FLOOR), kind, VCOL[vi]))); nb++;
    }
  }
  const trunks = [], crowns = [];
  for (const t of trees) {
    const x = X(num(t.x)), z = Z(num(t.y)), pine = t.kind === 'pine';
    trunks.push({ x, y: 2.4 + 6, z, sx: 2.2, sy: 12, sz: 2.2, c: '#24143c' });
    crowns.push(pine ? { x, y: 2.4 + 20, z, sx: 6.5, sy: 20, sz: 6.5, c: pick(['#0f8f86', '#0b6f6a', '#1b6fd1']) } : { x, y: 2.4 + 19, z, sx: 12, sy: 13, sz: 12, c: pick(['#0f8f86', '#1b6fd1', '#7a35d6', '#d11fa8']) });
  }
  if (trees.length) { instanced(GCyl, M.instWhite, trunks); instanced(GSph, M.instBasic, crowns); }
  /* props: lamps, parked cars, pickups, people, the start point */
  const poles = [], heads = [], pools = [], anim = [];
  for (const q of props) {
    const x = X(num(q.x)), z = Z(num(q.y)), ang = num(q.rot) * Math.PI / 180, k = q.kind;
    if (k === 'lamp') {
      const lc = (Math.round(num(q.x)) + Math.round(num(q.y))) % 2 ? '#ff2bd6' : '#2bf3ff';
      poles.push({ x, y: 2.4 + 31, z, sx: 1.4, sy: 62, sz: 1.4, c: '#14102a' }); heads.push({ x: x + 3, y: 2.4 + 62, z, sx: 8, sy: 2.6, sz: 4, c: lc });
      pools.push({ x, y: SIDE_H + 0.5, z, sx: 150, sy: 1, sz: 150, c: lc });
    } else if (CAR_TYPES[k]) {
      const c = makeCar(k, x, z, ang, null, /^#[0-9a-f]{6}$/i.test(q.color || '') ? q.color : undefined);
      buildCar(c); if (c.m && c.m.drv) c.m.drv.visible = false; group.add(c.mesh); c.mesh.position.set(x, 2.4, z); c.mesh.rotation.y = -ang;
    } else if (k === 'health' || k === 'pistol' || k === 'mg' || k === 'cash') {
      const p = { type: k, x, y: z, bob: 0 }; syncPickup(p, 0); group.add(p.mesh); p.mesh.position.set(x, 2.4, z); anim.push(p);
    } else if (k === 'ped' || k === 'cop') {
      const o = buildPerson(k === 'cop' ? 'officer' : 'ped', k === 'cop' ? 0x2a4aa8 : (/^#[0-9a-f]{6}$/i.test(q.color || '') ? q.color : '#e0554b'), pick(['#f2c6a0', '#d9a074', '#a8714a']));
      o.g.position.set(x, 2.4, z); o.g.rotation.y = -ang; group.add(o.g);
    } else if (k === 'start') {
      const ring = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: 0xffd23f })); ring.scale.set(16, 0.8, 16); ring.position.set(x, 3, z); group.add(ring);
      const beam = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false })); beam.scale.set(7, 120, 7); beam.position.set(x, 62, z); group.add(beam);
    }
  }
  if (poles.length) { instanced(GCyl, M.instWhite, poles); instanced(GB, M.instBasic, heads);
    const pm = instanced(GP, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), pools); pm.frustumCulled = false; }
  cityGroup = saved; scene.add(group);
  const hidden = []; for (const o of scene.children) if (o !== group && !o.isLight && o.visible) { o.visible = false; hidden.push(o); }
  const fog = [scene.fog.near, scene.fog.far], far = camera.far; scene.fog.near = 20000; scene.fog.far = 60000; camera.far = 60000; camera.updateProjectionMatrix();
  let km = 0; for (const s of segs) km += s.L / PV_U * (m.cellMeters || 10) / 1000;
  const ex = (x1 - x0 + 4) * PV_U, ez = (y1 - y0 + 4) * PV_U;
  pv = { group, anim, hidden, fog, far, tx: 0, tz: 0, yaw: 0, tilt: 50 * Math.PI / 180, ex, ez, D: 1000, info: nb + ' BUILDINGS · ' + km.toFixed(1) + ' KM ROADS · ' + trees.length + ' TREES · ' + props.length + ' PROPS' };
  pvFit();
  $('pvInfo').textContent = pv.info;
  state = 'preview'; $('overlay').hidden = true; $('pv').hidden = false; document.documentElement.classList.add('pv'); Snd.setEngine && Snd.setEngine(false, 0, 0);
}
function pvFit() { const asp = VW / VH, t = Math.tan(CAM_FOV * Math.PI / 360); pv.D = Math.max(pv.ez * 0.62, pv.ex * 0.62 / asp) / t * 1.1; pv.tx = pv.tz = 0; }
function pvClose() {
  if (!pv) return;
  scene.remove(pv.group);
  pv.group.traverse(o => { if (o.geometry && o.geometry !== GB && o.geometry !== GP && o.geometry !== GCyl && o.geometry !== GSph) o.geometry.dispose(); if (o.userData && o.userData.own) o.userData.own.forEach(m => m.dispose()); });
  for (const o of pv.hidden) o.visible = true;
  scene.fog.near = pv.fog[0]; scene.fog.far = pv.fog[1]; camera.far = pv.far; camera.updateProjectionMatrix();
  pv = null; pvPtrs.clear(); state = 'menu';
  $('pv').hidden = true; $('overlay').hidden = false; document.documentElement.classList.remove('pv');
}
function pvFrame() {
  const D = pv.D, st = Math.sin(pv.tilt), ct = Math.cos(pv.tilt);
  camera.position.set(pv.tx + D * st * Math.sin(pv.yaw), D * ct, pv.tz + D * st * Math.cos(pv.yaw));
  const tt = performance.now() / 1000; for (const p of pv.anim) { const it = p.mesh.userData.it; it.position.y = 11 + Math.sin(tt * 2 + p.x) * 2; it.rotation.y = tt * 1.6; }
  camera.lookAt(pv.tx, 0, pv.tz); camera.updateMatrixWorld(); renderer.render(scene, camera);
}
function pvMove(dx, dy) {
  const k = 2 * pv.D * Math.tan(CAM_FOV * Math.PI / 360) / VH, ct = Math.cos(pv.tilt), cy = Math.cos(pv.yaw), sy = Math.sin(pv.yaw);
  pv.tx += -(cy * dx) * k + (-sy) * dy * k / ct; pv.tz += (sy * dx) * k + (-cy) * dy * k / ct;
}
cv.addEventListener('pointerdown', e => { if (state !== 'preview') return; cv.setPointerCapture(e.pointerId); pvPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); pv.g = null; });
cv.addEventListener('pointermove', e => {
  if (state !== 'preview' || !pvPtrs.has(e.pointerId)) return;
  const p = pvPtrs.get(e.pointerId), nx = e.clientX, ny = e.clientY;
  if (pvPtrs.size === 1) { if (p.b === 2 || e.shiftKey) pv.yaw += (nx - p.x) * 0.006; else pvMove(nx - p.x, ny - p.y); p.x = nx; p.y = ny; }
  else if (pvPtrs.size === 2) {
    const o = [...pvPtrs.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(p.x - o.x, p.y - o.y), a0 = Math.atan2(p.y - o.y, p.x - o.x), m0x = (p.x + o.x) / 2, m0y = (p.y + o.y) / 2;
    p.x = nx; p.y = ny;
    const d1 = Math.hypot(p.x - o.x, p.y - o.y), a1 = Math.atan2(p.y - o.y, p.x - o.x), m1x = (p.x + o.x) / 2, m1y = (p.y + o.y) / 2;
    if (d0 > 8 && d1 > 8) pv.D = clamp(pv.D * d0 / d1, 250, 40000);
    let da = a1 - a0; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; pv.yaw += da;
    pvMove(m1x - m0x, m1y - m0y);
  }
});
for (const t of ['pointerup', 'pointercancel']) cv.addEventListener(t, e => pvPtrs.delete(e.pointerId));
cv.addEventListener('wheel', e => { if (state !== 'preview') return; e.preventDefault(); pv.D = clamp(pv.D * Math.exp(e.deltaY * 0.0012), 250, 40000); }, { passive: false });
cv.addEventListener('contextmenu', e => { if (state === 'preview') e.preventDefault(); });
$('loadMap').addEventListener('click', () => $('mapFile').click());
$('mapFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
  const rd = new FileReader(); rd.onload = () => pvLoad(String(rd.result)); rd.onerror = () => loadMsg('COULD NOT READ THAT FILE', true); rd.readAsText(f);
});
$('pvBack').addEventListener('click', pvClose);
$('pvView').addEventListener('click', () => { pv.tilt = pv.tilt > 0.7 ? 25 * Math.PI / 180 : 55 * Math.PI / 180; });
$('pvL').addEventListener('click', () => { pv.yaw -= Math.PI / 4; });
$('pvR').addEventListener('click', () => { pv.yaw += Math.PI / 4; });
addEventListener('keydown', e => { if (state === 'preview' && e.code === 'Escape') pvClose(); });
