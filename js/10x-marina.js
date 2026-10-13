'use strict';
/* ---------- 7y. SUNSET HARBOR: the marina's model (map remodel 16: MAP.marina; the runtime: js/08zv) ----------
   On the paved quay south of Iron Key's ferry pier: the harbour office (white walls, a blue roof, a little lighthouse on its corner and
   SUNSET HARBOR under an orange neon sunset on its roof edge), the boat shop at its door; three wooden finger piers on piles with
   cleats and lamp posts, the berths marked on the water; the fuel dock at the quay's south end with two pumps and a FUEL sign.
   Solid: the office and the pumps; the piers are walked on like land (js/04 buildShoreField). Mode: marina. */
const MZ = { lm: null, view: null };
const JETTIES = MAP.jetties || [];          // eight small jetties round the coast by the streets (map remodel 17)
function genMarina() {                    // js/04 genWorld: the office's and the pumps' solids, the drawables (the jetties too)
  for (const j of JETTIES) LMS.push({ cx: j.x, cy: j.y, a: j.a * Math.PI / 180, rad: j.len + 70, make: () => makeJetty(j), mesh: null });
  if (!MARINA) return;
  const [ox, oy, ow, od] = MARINA.office;
  makeSolid(ox, oy, ow, od, 0, {});
  for (const [px, py] of MARINA.pumps) makeSolid(px, py, 6, 6, 0, {});
  const xs = MARINA.piers.flatMap(b => [b[0], b[2]]).concat([ox - ow / 2]), ys = MARINA.piers.flatMap(b => [b[1], b[3]]).concat([oy - od / 2, oy + od / 2]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  LMS.push(MZ.lm = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, a: 0, rad: Math.hypot(x1 - x0, y1 - y0) / 2 + 160, make: () => withSeed(8161, makeMarina), mesh: null });
}
function makeMarina() {
  const T = new GeoBuilder(), G = new GeoBuilder(), cx = MZ.lm.cx, cy = MZ.lm.cy, X = x => x - cx, Z = y => y - cy, sub = [];
  const wood = _C('#8a6a48'), woodD = _C('#5a4430'), wht = _C('#f4f4f6'), blue = _C('#2f6bff'), dark = _C('#2a2d38'), orange = _C('#ff7a3d');
  // the piers: planks on piles, cleats, lamp posts
  for (const [a0, b0, a1, b1] of MARINA.piers) {
    box5(T, X(a0), 0, Z(b0), X(a1), 2.2, Z(b1), wood);
    for (let x = a0 + 4; x < a1; x += 6) box5(T, X(x) - 0.3, 2.2, Z(b0), X(x) + 0.3, 2.3, Z(b1), woodD);
    for (let x = a0 + 10; x <= a1; x += 30) for (const y of [b0, b1]) T.prism(X(x), Z(y), 1.2, -6, 3, woodD, 8, 1.2, true);
    for (let x = a0 + 30; x < a1; x += 46) for (const y of [b0 + 2, b1 - 2]) box5(T, X(x) - 1.6, 2.2, Z(y) - 0.6, X(x) + 1.6, 3.4, Z(y) + 0.6, dark);
    for (let x = a0 + 40; x < a1; x += 80) { T.prism(X(x), Z((b0 + b1) / 2), 0.6, 2.2, 16, dark, 6, 0.6, true); box5(G, X(x) - 1.2, 16, Z((b0 + b1) / 2) - 1.2, X(x) + 1.2, 18, Z((b0 + b1) / 2) + 1.2, _C('#fff2c2')); }
  }
  // the berths' lines on the water; your own ones in yellow
  MARINA.berths.forEach(([bx, by, side], i) => { const own = MARINA.own.includes(i), c = own ? _C('#ffd23f') : _C('#e8f6ff');
    for (const dx of [-40, 40]) box5(own ? G : T, X(bx + dx) - 0.6, -2.4, Z(by) - 12 * side + (side > 0 ? -12 : 0), X(bx + dx) + 0.6, -2.2, Z(by) - 12 * side + (side > 0 ? 0 : 12), c); });
  // the harbour office: white walls, a blue roof, windows, the door to the piers, a lighthouse on its north-east corner
  const [ox, oy, ow, od] = MARINA.office, a0 = X(ox - ow / 2), a1 = X(ox + ow / 2), b0 = Z(oy - od / 2), b1 = Z(oy + od / 2), H = 30;
  box5(T, a0, 0, b0, a1, H, b1, wht); box5(T, a0 - 3, H, b0 - 3, a1 + 3, H + 3, b1 + 3, blue);
  for (let x = a0 + 8; x < a1 - 6; x += 16) for (const z of [b0 - 0.3, b1 + 0.3]) box5(G, x, 10, z - 0.3, x + 9, 20, z + 0.3, _C('#9fd8ff'));
  box5(T, a1 - 0.4, 0, Z(MARINA.door[1]) - 8, a1 + 0.6, 22, Z(MARINA.door[1]) + 8, _C('#2a4a8a'));
  box5(T, a1, 22, Z(MARINA.door[1]) - 12, a1 + 10, 24, Z(MARINA.door[1]) + 12, blue);
  { const lx = a1 - 8, lz = b0 + 8; T.prism(lx, lz, 7, H, H + 34, wht, 12, 5, false); for (let k = 0; k < 3; k++) T.prism(lx, lz, 6.6 - k * 0.5, H + 6 + k * 10, H + 11 + k * 10, _C('#e0364f'), 12, 6.2 - k * 0.5, false);
    T.prism(lx, lz, 5.6, H + 34, H + 36, dark, 12, 5.6, true); }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c2 }), lamp = new THREE.Mesh(GSph, lampMat); lamp.scale.setScalar(4); lamp.position.set(a1 - 8, H + 40, b0 + 8);
  // the sunset on the roof edge: half a sun in bands, SUNSET HARBOR under it
  const sx = (a0 + a1) / 2, sz = b1 + 3.6, sy = H + 4, sun = [];
  for (let k = 0; k < 5; k++) { const r = 22 - k * 0.2, y0 = sy + k * 4.4, y1 = y0 + 3.2, w0 = Math.sqrt(Math.max(0, r * r - (k * 4.4) ** 2)), w1 = Math.sqrt(Math.max(0, r * r - (k * 4.4 + 3.2) ** 2));
    face(G, [[sx - w0, y0, sz], [sx + w0, y0, sz], [sx + w1, y1, sz], [sx - w1, y1, sz]], [0, 0, 1], _C(['#ff2bd6', '#ff4f8a', '#ff7a3d', '#ffa23d', '#ffd23f'][k])); }
  box5(T, sx - 46, H, sz - 3, sx + 46, sy + 24, sz - 1.5, dark);
  const nm = fasciaSign('SUNSET HARBOR', '#ff7a3d', 92, 13); nm.position.set(sx, H - 8, b1 + 0.8); sub.push(nm);
  // the fuel dock: a jetty, two pumps, a FUEL sign
  for (const [px, py] of MARINA.pumps) { box5(T, X(px) - 3, 2.2, Z(py) - 3, X(px) + 3, 14, Z(py) + 3, _C('#e0364f')); box5(G, X(px) - 2, 9, Z(py) + 3, X(px) + 2, 12, Z(py) + 3.4, _C('#fff2c2')); }
  const fs = fasciaSign('FUEL', '#ffd23f', 24, 8); fs.position.set(X(MARINA.pumps[0][0]) + 13, 20, Z(MARINA.pumps[0][1]) + 6); sub.push(fs);
  const m = lmMesh(T, G); for (const o of sub) { m.add(o); m.userData.own.push(o.material); } m.add(lamp); m.userData.own.push(lampMat);
  MZ.view = { lampMat }; return m;
}

/* a jetty (js/04 paints it as land): planks on piles from just up the shore out to a T, cleats along the T, a lamp, and a post at the
   shore end with a life ring and the blue anchor sign - the same anchor as on the maps */
function makeJetty(j) {
  const T = new GeoBuilder(), G = new GeoBuilder(), L = j.len, w = j.w / 2, [hw, hd] = j.head, wood = _C('#8a6a48'), woodD = _C('#5a4430'), dark = _C('#2a2d38');
  const deck = (u0, u1, v0, v1) => { box5(T, u0, 0, v0, u1, 2.2, v1, wood); for (let u = u0 + 3; u < u1; u += 6) box5(T, u - 0.3, 2.2, v0, u + 0.3, 2.3, v1, woodD); };
  deck(-24, L - hd, -w, w); deck(L - hd, L, -hw / 2, hw / 2);
  for (let u = 6; u < L - hd; u += 28) for (const v of [-w, w]) T.prism(u, v, 1.2, -6, 3, woodD, 8, 1.2, true);
  for (const v of [-hw / 2, -hw / 6, hw / 6, hw / 2]) for (const u of [L - hd, L]) T.prism(u, v, 1.3, -6, 3, woodD, 8, 1.3, true);
  for (const v of [-hw / 2 + 6, hw / 2 - 6]) for (const u of [L - hd + 2, L - 2]) box5(T, u - 0.8, 2.2, v - 1.6, u + 0.8, 3.4, v + 1.6, dark);   // cleats
  T.prism(L - hd / 2, 0, 0.6, 2.2, 16, dark, 6, 0.6, true); box5(G, L - hd / 2 - 1.2, 16, -1.2, L - hd / 2 + 1.2, 18, 1.2, _C('#fff2c2'));   // the lamp
  T.prism(-14, w + 4, 0.6, 0, 18, dark, 6, 0.6, true);             // the post: a life ring, the anchor sign on top
  for (let k = 0; k < 8; k++) { const a0 = k / 8 * TAU, a1 = (k + 1) / 8 * TAU; box5(T, -14.6, 9 + Math.sin(a0) * 3.4 - 0.8, w + 4 + Math.cos(a0) * 3.4 - 0.8, -13.4, 9 + Math.sin(a0) * 3.4 + 0.8, w + 4 + Math.cos(a0) * 3.4 + 0.8, _C(k % 2 ? '#ffffff' : '#ff7a3d')); }
  box5(G, -18, 18, w + 0.5, -10, 26, w + 7.5, _C('#2f6bff'));
  box5(G, -14.3, 25.9, w + 2.4, -13.7, 26.2, w + 5.6, _C('#ffffff')); box5(G, -16.2, 25.9, w + 3.7, -11.8, 26.2, w + 4.3, _C('#ffffff')); box5(G, -16.4, 25.9, w + 1.6, -11.6, 26.2, w + 2.4, _C('#ffffff'));
  return lmMesh(T, G);
}
