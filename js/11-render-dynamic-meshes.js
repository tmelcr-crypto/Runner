'use strict';
/* ---------- 7b. DYNAMIC MESHES: cars, people, pickups ---------- */
let frameId = 0, registry = [];
function track(o) { if (o._reg !== frameId) { o._reg = frameId; } if (!o._in) { o._in = true; registry.push(o); } }
function clearDynamic() { for (const o of registry) { if (o.mesh) scene.remove(o.mesh); if (o.m && o.m.body) o.m.body.dispose(); o.mesh = null; o._in = false; } registry = []; }
function sweepDynamic() {
  for (let k = registry.length - 1; k >= 0; k--) {
    const o = registry[k];
    if (o._reg !== frameId) { if (o.mesh) scene.remove(o.mesh); if (o.m && o.m.body) o.m.body.dispose(); o.mesh = null; o._in = false; registry.splice(k, 1); }
  }
}
function part(parent, geo, mat, sx, sy, sz, x, y, z) { const o = new THREE.Mesh(geo, mat); o.scale.set(sx, sy, sz); o.position.set(x, y, z); parent.add(o); return o; }

const _cg = {};
function mergedGeo(key, parts) {            // scaled, turned (rx, ry, rz: optional), moved copies of shared geometry as one geometry; cached, so every car of a type shares it
  if (_cg[key]) return _cg[key];
  const pos = [], nor = [], uv = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), t = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [geo, sx, sy, sz, x, y, z, ry, rx, rz] of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m4.compose(t.set(x, y, z), q.setFromEuler(eu.set(rx || 0, ry || 0, rz || 0)), sc.set(sx, sy, sz)));
    for (const v of g.attributes.position.array) pos.push(v); for (const v of g.attributes.normal.array) nor.push(v); for (const v of g.attributes.uv.array) uv.push(v); g.dispose();
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere(); return (_cg[key] = g);
}
/* Vehicle models, one per body (js/01c). Drivers sit inside, under the roof, seen through tinted glass; only the bike's rider is out in the open. */
const GLASS = new THREE.MeshLambertMaterial({ color: 0x2a3a5c, transparent: true, opacity: 0.55 });
/* The boats (js/08zv), made to be seen from above: the hull's outline curves in from the beam to a pointed bow, the transom a little
   narrower than the beam. Decks, the cockpit, cushions and cabins are regions of an outline (planShape: from u0 at the stern to u1
   toward the bow, ins in from its side) raised into slabs (slabGeo); a cabin's own outline has straight sides and a round front. */
const BOAT_PLAN = { speedboat: [0.84, 0.4, 2], jetski: [0.72, 0.45, 1.7], yacht: [0.86, 0.38, 2.2], fishboat: [0.9, 0.45, 1.6], policeboat: [0.88, 0.42, 1.8], tourboat: [0.92, 0.45, 1.5] };   // the transom's share of the beam, where the beam is widest (0 stern, 1 bow), the bow's curve
function boatHalf(B, W) { const [tr, mx, bp] = BOAT_PLAN[B]; return u => W / 2 * (u < mx ? lerp(tr, 1, Math.sin(u / mx * Math.PI / 2)) : 1 - Math.pow(Math.min(1, (u - mx) / (1 - mx)), bp)); }
const noseHalf = (m, b, half) => u => u < m ? half : half * Math.sqrt(Math.max(0, 1 - ((u - m) / (b - m)) ** 2));   // a cabin: straight sides, a round front from m to b
const padHalf = (c, len, half) => u => { const t = Math.abs(u - c) / (len / 2); return t >= 1 ? 0 : half * Math.pow(1 - t ** 4, 0.25); };   // a cushion: rounded at both ends
function planShape(hw, L, u0, u1, ins, n = 16) {
  const s = []; let t0 = null, t1 = null;
  for (let i = 0; i <= n; i++) { const u = lerp(u0, u1, i / n), w = hw(u) - ins, x = (u - 0.5) * L; if (w >= 0.3) s.push([x, w]); else if (s.length) { t1 = x; break; } else t0 = x; }
  const p = []; if (t0 !== null) p.push([t0, 0]); for (const q of s) p.push(q); if (t1 !== null) p.push([t1, 0]); for (let i = s.length - 1; i >= 0; i--) p.push([s[i][0], -s[i][1]]);
  const sh = new THREE.Shape(); sh.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) sh.lineTo(p[i][0], p[i][1]); return sh;
}
function slabGeo(sh, y, d, bev) {            // the shape raised from y, d high (bev: rounded edges)
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, curveSegments: 4, bevelEnabled: !!bev, bevelThickness: bev || 0, bevelSize: bev || 0, bevelSegments: 2 }).rotateX(-Math.PI / 2);
  return g.translate(0, y + (bev || 0), 0);
}
const GTor = new THREE.TorusGeometry(1, 0.3, 6, 14).rotateX(Math.PI / 2);   // a life ring, lying flat
const BAR = { police: [E.redOn, E.redOff, E.blueOn, E.blueOff], ambulance: [E.redOn, E.redOff, mBas(0xffffff), mBas(0x4a4a52)],
  fire: [E.redOn, E.redOff, mBas(0xffb02e), mBas(0x5a3f1f)], trash: [mBas(0xffb02e), mBas(0x5a3f1f), mBas(0xffb02e), mBas(0x5a3f1f)] };
const PLAYER_SHIRT = mc(0xffd23f);
/* Liveries painted on a truck's cargo box (a quest's vehicle): the roof, seen from above, and both sides. */
const DECO = {
  laundry: { bg: '#f4f6fa', fg: '#2a5fc8', top: 'SUDS & SONS', sub: 'LAUNDRY · 24 H', dots: '#9fd4ee' },
  flamingo: { bg: '#efe6cc', fg: '#b8860b', top: 'ROYAL FLAMINGO', sub: 'CASINO · CASH IN TRANSIT', bird: '#ff5fa2' },
  baytv: { bg: '#f4f6fa', fg: '#1f4fa8', top: 'BAY TV 7', sub: 'NEWS · LIVE · ON THE SPOT', dots: '#ff3b4a' },
  police: { bg: '#1d2a5a', fg: '#f4f6fa', top: 'POLICE', sub: 'VICE BAY P.D. · TO SERVE' }
};
const _deco = {};
function decoTex(kind, side) {
  const k = kind + side; if (_deco[k]) return _deco[k];
  const D = DECO[kind], c = document.createElement('canvas'); c.width = 512; c.height = side ? 128 : 320; const g = c.getContext('2d'), H = c.height;
  g.fillStyle = D.bg; g.fillRect(0, 0, 512, H); g.strokeStyle = D.fg; g.lineWidth = 10; g.strokeRect(8, 8, 496, H - 16);
  if (D.dots) { g.fillStyle = D.dots; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(40 + (i * 97) % 440, 30 + (i * 53) % (H - 60), 8 + (i % 4) * 5, 0, TAU); g.fill(); } }
  if (D.bird) {                                  // a pink flamingo on one leg
    const bx = side ? 70 : 110, by = side ? 64 : 150, sc = side ? 0.45 : 1; g.fillStyle = D.bird; g.strokeStyle = D.bird; g.lineWidth = 6 * sc;
    g.beginPath(); g.ellipse(bx, by, 46 * sc, 26 * sc, -0.3, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(bx + 30 * sc, by - 14 * sc); g.quadraticCurveTo(bx + 70 * sc, by - 60 * sc, bx + 40 * sc, by - 92 * sc); g.stroke();
    g.beginPath(); g.arc(bx + 40 * sc, by - 98 * sc, 10 * sc, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(bx, by + 24 * sc); g.lineTo(bx, by + 96 * sc); g.stroke();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = D.fg;
  const x0 = D.bird ? 300 : 256, w = D.bird ? 360 : 470, fit = (t, fs) => { g.font = 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; while (g.measureText(t).width > w && fs > 12) { fs -= 2; g.font = 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; } };
  if (side) { fit(D.top, 54); g.fillText(D.top, x0, 66); }
  else { fit(D.top, 64); g.fillText(D.top, x0, 130); fit(D.sub, 34); g.fillText(D.sub, x0, 210); }
  return (_deco[k] = finishTex(c));
}
function carDeco(kind, tilt, L, Wd) {
  if (!DECO[kind]) return;
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.6, Wd * 0.94), new THREE.MeshLambertMaterial({ map: decoTex(kind, false) }));
  roof.rotation.x = -Math.PI / 2; roof.position.set(-L * 0.19, 23.1, 0); tilt.add(roof);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.56, 12), new THREE.MeshLambertMaterial({ map: decoTex(kind, true) })); m.position.set(-L * 0.19, 13, s * (Wd / 2 + 0.08)); if (s < 0) m.rotation.y = Math.PI; tilt.add(m); }
}
function buildCar(c) {                       // parts that never move on their own are merged: one mesh per material
  const t = c.t, L = t.len, Wd = t.wid, B = t.body, g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const body = c.type === 'gold' ? new THREE.MeshPhongMaterial({ color: c.color, specular: 0xfff0c0, shininess: 38 }) : new THREE.MeshLambertMaterial({ color: c.color }),   // the gold car shines (js/08zs)
    m = { body, tail: [], bar: [], barM: null, cabin: null, drv: null, rider: null };
  const merged = (key, mat, parts) => { const o = new THREE.Mesh(mergedGeo(c.type + key, parts), mat); tilt.add(o); return o; };
  const wheels = [], wheel = (x, z, r, w) => wheels.push([GCylZ, r, r, w || 3.6, x, r, z]), axle = (x, r) => { for (const s of [-1, 1]) wheel(x, s * (Wd / 2 + 0.3), r); };
  const lamps = (yT, hT, yH, hH, inset) => { const lp = (x, y, h) => [-1, 1].map(s => [GB, 1.4, h, 5, x, y, s * (Wd / 2 - (inset || 4))]);
    m.tail.push(merged('t', E.tailOff, lp(-L / 2, yT, hT))); merged('h', E.headL, lp(L / 2, yH, hH)); };
  const bar = (x, y, kind) => { m.barM = BAR[kind]; m.bar.push(part(tilt, GB, m.barM[1], 4, 2.6, Wd * 0.36, x, y, -Wd * 0.2), part(tilt, GB, m.barM[3], 4, 2.6, Wd * 0.36, x, y, Wd * 0.2)); };
  const seat = (x, roofY, sc) => {           // a driver's head and shoulders, the top of the head just under the roof
    const s = sc || 1, cop = t.cop, dg = new THREE.Group(); dg.position.set(x, roofY - (cop ? 4.8 : 4.4) * s - 0.4, -Wd * 0.2); dg.scale.setScalar(s); tilt.add(dg);
    part(dg, GB, mc(cop ? 0x2a4aa8 : pick([0x6a8fd9, 0xd96a6a, 0x7acb8a, 0xd9c35a, 0xb8bcc8])), 4.2, 3, 6.6, 0, -1.4, 0);
    part(dg, GSph, mc(pick([0xf2c6a0, 0xd9a07a, 0x9a6a46, 0xffdcbc])), 2.8, 2.8, 2.8, 0.4, 1.6, 0);
    if (cop) part(dg, GB, mc(0x1a2a6a), 4.2, 1.6, 5.2, 0.4, 4, 0);
    m.drv = dg;
    const pg = dg.clone(); pg.position.z = Wd * 0.2; pg.visible = false; tilt.add(pg); m.pas = pg;   // a passenger beside you (a mission's friend, js/08zz)
  };
  part(g, GCirc, E.shadow, L * 0.62, 1, Wd * 0.64, 0, 1.3, 0);
  if (B === 'truck') {                       // cab with a glass band and a roof, cargo box behind
    merged('b', body, [[GB, L * 0.3, 12, Wd, L * 0.35, 9, 0], [GB, L * 0.3, 1.6, Wd, L * 0.35, 21.8, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.26, 6, Wd - 2, L * 0.36, 18, 0);
    part(tilt, GB, E.cargo, L * 0.62, 20, Wd, -L * 0.19, 13, 0);
    for (const x of [L * 0.34, -L * 0.1, -L * 0.34]) axle(x, 5);
    lamps(7, 3, 8, 3, 5); seat(L * 0.38, 21);
  } else if (B === 'sports') {
    merged('b', body, [[GB, L, 6.5, Wd, 0, 6, 0], [GB, L * 0.24, 1.2, Wd - 9, -L * 0.06, 14.6, 0], [GB, 3, 1.2, Wd - 2, -L / 2 + 2, 12.5, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.3, 5, Wd - 6, -L * 0.06, 11.7, 0);
    part(tilt, GB, E.white, L * 0.98, 0.5, 4, 0, 9.5, 0);
    for (const x of [L * 0.3, -L * 0.3]) axle(x, 4.4);
    lamps(6.5, 2.4, 6.5, 2.2); seat(-L * 0.06, 14, 0.85);
  } else if (B === 'estate') {               // a long roof down to the tailgate, roof rails
    merged('b', body, [[GB, L, 8, Wd, 0, 7, 0], [GB, L * 0.58, 1.4, Wd - 8, -L * 0.13, 18.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.62, 7, Wd - 5, -L * 0.12, 14.5, 0);
    merged('r', E.black, [[GB, L * 0.5, 0.8, 1, -L * 0.14, 19.8, Wd / 2 - 5], [GB, L * 0.5, 0.8, 1, -L * 0.14, 19.8, -(Wd / 2 - 5)]]);
    for (const x of [L * 0.32, -L * 0.32]) axle(x, 4.8);
    lamps(8, 2.6, 8, 2.6); seat(L * 0.05, 17.9);
  } else if (B === 'pickup') {               // a raised cab and an open bed with low walls
    merged('b', body, [[GB, L, 8, Wd, 0, 8, 0], [GB, L * 0.24, 1.4, Wd - 6, L * 0.12, 19.7, 0], [GB, L * 0.44, 4, 1.4, -L * 0.27, 14, Wd / 2 - 0.7], [GB, L * 0.44, 4, 1.4, -L * 0.27, 14, -(Wd / 2 - 0.7)],
      [GB, 1.4, 4, Wd, -L / 2 + 0.7, 14, 0], [GB, 1.4, 4, Wd, -L * 0.05, 14, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.24, 7, Wd - 5, L * 0.12, 15.5, 0);
    part(tilt, GB, E.black, L * 0.42, 0.6, Wd - 3, -L * 0.27, 12.3, 0);
    for (const x of [L * 0.32, -L * 0.32]) axle(x, 5.6);
    lamps(9, 2.6, 9, 2.6); seat(L * 0.14, 19);
  } else if (B === 'newsvan') {              // Bay TV's van: a cab, a tall box, the station's livery on it, a dish and a mast on the roof
    merged('b', body, [[GB, L * 0.3, 11, Wd, L * 0.35, 8.5, 0], [GB, L * 0.3, 1.4, Wd, L * 0.35, 18.7, 0], [GB, L * 0.68, 20, Wd, -L * 0.16, 12, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.26, 6, Wd - 2, L * 0.36, 15.5, 0);
    const D = DECO.baytv, roof = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.66, Wd * 0.94), new THREE.MeshLambertMaterial({ map: decoTex('baytv', false) })); roof.rotation.x = -Math.PI / 2; roof.position.set(-L * 0.16, 22.1, 0); tilt.add(roof);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.62, 12), new THREE.MeshLambertMaterial({ map: decoTex('baytv', true) })); sd.position.set(-L * 0.16, 12, s * (Wd / 2 + 0.08)); if (s < 0) sd.rotation.y = Math.PI; tilt.add(sd); }
    void D; part(tilt, GCyl, E.white, 1.2, 4, 1.2, -L * 0.3, 24, 0); part(tilt, GSph, E.white, 5, 1.6, 5, -L * 0.3, 26.5, 0);   // the dish on its stand
    part(tilt, GCyl, mc(0x9aa0ab), 0.5, 10, 0.5, -L * 0.02, 27, Wd * 0.3);                       // the mast
    for (const x of [L * 0.32, -L * 0.3]) axle(x, 5);
    lamps(7, 3, 8, 3, 5); seat(L * 0.38, 19);
  } else if (B === 'policevan') {            // the police van: a cab, a tall dark-blue box with POLICE on its roof and sides, a light bar over the cab, a white stripe
    merged('b', body, [[GB, L * 0.3, 11, Wd, L * 0.35, 8.5, 0], [GB, L * 0.3, 1.4, Wd, L * 0.35, 18.7, 0], [GB, L * 0.68, 19, Wd, -L * 0.16, 11.5, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.26, 6, Wd - 2, L * 0.36, 15.5, 0);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.66, Wd * 0.94), new THREE.MeshLambertMaterial({ map: decoTex('police', false) })); roof.rotation.x = -Math.PI / 2; roof.position.set(-L * 0.16, 21.1, 0); tilt.add(roof);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.62, 11), new THREE.MeshLambertMaterial({ map: decoTex('police', true) })); sd.position.set(-L * 0.16, 11.5, s * (Wd / 2 + 0.08)); if (s < 0) sd.rotation.y = Math.PI; tilt.add(sd); }
    part(tilt, GB, E.white, L * 0.3, 1.6, Wd + 0.2, L * 0.35, 9, 0);
    bar(L * 0.33, 20.4, 'police');
    for (const x of [L * 0.32, -L * 0.3]) axle(x, 5);
    lamps(7, 3, 8, 3, 5); seat(L * 0.38, 19);
  } else if (B === 'produce') {              // an open-back truck: the cab up front, a wooden bed with stake sides, eight crates of produce (they fall off when it is hit hard, js/06)
    merged('b', body, [[GB, L * 0.28, 12, Wd, L * 0.36, 9, 0], [GB, L * 0.28, 1.6, Wd, L * 0.36, 21.8, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.24, 6, Wd - 2, L * 0.37, 18, 0);
    merged('f', E.black, [[GB, L * 0.7, 2.4, Wd - 2, -L * 0.14, 5.6, 0]]);
    const bedL = L * 0.66, bx = -L * 0.155, stakes = [[GB, bedL, 1.2, Wd, bx, 7.8, 0]];
    for (let k = 0; k <= 4; k++) for (const s of [-1, 1]) stakes.push([GB, 1.3, 7, 1.3, bx - bedL / 2 + 0.7 + k * (bedL - 1.4) / 4, 11.5, s * (Wd / 2 - 0.7)]);
    for (const s of [-1, 1]) stakes.push([GB, bedL, 1, 0.9, bx, 14.4, s * (Wd / 2 - 0.7)], [GB, bedL, 1, 0.9, bx, 11, s * (Wd / 2 - 0.7)]);
    merged('w', mc(0x8a6a48), stakes);
    m.crates = []; const cw = bedL / 4 - 1.2, cd = Wd / 2 - 2.4, wood = mc(0xb48a58), fruit = [0xff8a1f, 0xe8262a, 0x3dbb4a, 0xffd23f, 0xff8a1f, 0x7a2a8a, 0xe8262a, 0x3dbb4a];
    for (let i = 0; i < 8; i++) {
      const cg = new THREE.Group(), x = bx - bedL / 2 + (3 - Math.floor(i / 2) + 0.5) * bedL / 4, z = (i % 2 ? 1 : -1) * (cd / 2 + 0.9);
      part(cg, GB, wood, cw, 5, cd, x, 11, z); part(cg, GB, mc(fruit[i]), cw - 1.2, 1.6, cd - 1.2, x, 14, z); tilt.add(cg); m.crates.push(cg);
    }
    const left = c.crates === undefined ? 8 : c.crates; m.crates.forEach((cg, i) => { cg.visible = i < left; });
    for (const x of [L * 0.34, -L * 0.12, -L * 0.36]) axle(x, 5);
    lamps(7, 3, 8, 3, 5); seat(L * 0.38, 21);
  } else if (B === 'limo') {                 // a long, low cabin and a chrome line
    merged('b', body, [[GB, L, 7.5, Wd, 0, 6.75, 0], [GB, L * 0.6, 1.3, Wd - 7, -L * 0.03, 17.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.64, 6.5, Wd - 5, -L * 0.03, 13.75, 0);
    part(tilt, GB, E.white, L * 0.98, 0.6, Wd + 0.3, 0, 9, 0);
    for (const x of [L * 0.38, -L * 0.38]) axle(x, 4.6);
    lamps(7.5, 2.4, 7.5, 2.4); seat(L * 0.22, 16.95);
  } else if (B === 'nascar') {              // a stock car: low and long, a big rear spoiler, number roundels, a sponsor stripe
    merged('b', body, [[GB, L, 7, Wd, 0, 6.5, 0], [GB, L * 0.36, 1.2, Wd - 6, -L * 0.04, 15.2, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.38, 5.4, Wd - 4, -L * 0.04, 12.4, 0);
    merged('s', mc(0x14161d), [[GB, L * 1.0, 1.8, Wd + 0.3, 0, 7.6, 0], [GB, 2.2, 3.5, Wd + 1, -L / 2 + 1.5, 12, 0]]);   // a dark band; the spoiler blade
    merged('r', E.white, [[GCirc, 7, 1, 7, -L * 0.04, 15.9, 0], [GB, L * 0.18, 4.4, 0.4, L * 0.05, 7.6, Wd / 2 + 0.25], [GB, L * 0.18, 4.4, 0.4, L * 0.05, 7.6, -(Wd / 2 + 0.25)]]);   // the roundels
    merged('n', mc(0x14161d), [[GB, 3, 0.6, 1.4, -L * 0.04, 16.1, -1.2], [GB, 3, 0.6, 1.4, -L * 0.04, 16.1, 1.2], [GB, L * 0.06, 2.6, 0.5, L * 0.05, 7.6, Wd / 2 + 0.3], [GB, L * 0.06, 2.6, 0.5, L * 0.05, 7.6, -(Wd / 2 + 0.3)]]);   // the numbers
    for (const x of [L * 0.31, -L * 0.31]) axle(x, 4.8);
    lamps(7, 2.2, 7, 2.2); seat(-L * 0.04, 15.2, 0.9);
  } else if (B === 'bus') {                  // a tall box with a window band, a destination sign and a roof unit
    merged('b', body, [[GB, L, 26, Wd, 0, 16, 0]]);
    m.cabin = merged('g', E.glass, [[GB, L * 0.78, 8, 0.6, -L * 0.06, 21, Wd / 2 + 0.05], [GB, L * 0.78, 8, 0.6, -L * 0.06, 21, -(Wd / 2 + 0.05)], [GB, 0.8, 14, Wd - 4, L / 2 + 0.1, 18, 0]]);
    merged('w2', E.white, [[GB, L + 0.2, 2, Wd + 0.3, 0, 12, 0], [GB, L * 0.22, 3, Wd * 0.55, -L * 0.1, 30.5, 0]]);
    part(tilt, GB, mBas(0xffb02e), 0.8, 2.5, Wd - 8, L / 2 + 0.2, 27, 0);
    axle(L * 0.3, 5.5); axle(-L * 0.32, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'trash') {                // white cab, the compactor body with ribs, the hopper at the back, an amber beacon
    merged('b', body, [[GB, L * 0.66, 21, Wd, -L * 0.165, 13.5, 0]]);
    merged('c', E.white, [[GB, L * 0.27, 15, Wd, L * 0.365, 10.5, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 13.5, 0], [GB, L * 0.12, 5, Wd + 0.2, L * 0.38, 13.5, 0]]);
    merged('k', E.black, [[GB, 1.6, 21.6, Wd + 0.6, -L * 0.05, 13.5, 0], [GB, 1.6, 21.6, Wd + 0.6, -L * 0.2, 13.5, 0], [GB, 1.6, 21.6, Wd + 0.6, -L * 0.35, 13.5, 0], [GB, 3, 14, Wd - 2, -L / 2 - 1, 10, 0]]);
    bar(L * 0.4, 19, 'trash');
    axle(L * 0.34, 5.5); axle(-L * 0.18, 5.5); axle(-L * 0.34, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'ambulance') {            // a low cab and a tall box with a red stripe, a cross on the roof
    merged('b', body, [[GB, L * 0.26, 12, Wd - 2, L * 0.36, 9, 0], [GB, L * 0.72, 24, Wd, -L * 0.13, 15, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 5, Wd - 6, L * 0.49, 12.5, 0]]);
    merged('s', mc(0xe0364f), [[GB, L * 0.73, 2.5, Wd + 0.3, -L * 0.13, 13, 0], [GB, L * 0.27, 2.5, Wd - 1.7, L * 0.36, 10, 0], [GB, 8, 0.6, 2.5, -L * 0.13, 27.4, 0], [GB, 2.5, 0.6, 8, -L * 0.13, 27.4, 0]]);
    bar(L * 0.2, 28.2, 'ambulance');
    axle(L * 0.32, 5); axle(-L * 0.3, 5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'fire') {                 // red cab and body, a white line, the ladder on top with its turntable
    merged('b', body, [[GB, L * 0.25, 16, Wd, L * 0.375, 11, 0], [GB, L * 0.74, 14, Wd, -L * 0.12, 10, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 14.5, 0], [GB, L * 0.14, 5, Wd + 0.2, L * 0.4, 14.5, 0]]);
    part(tilt, GB, E.white, L * 0.99, 1.6, Wd + 0.3, 0, 8, 0);
    const lad = [[GB, L * 0.8, 1.2, 1.2, -L * 0.08, 19.5, 6], [GB, L * 0.8, 1.2, 1.2, -L * 0.08, 19.5, -6]];
    for (let x = -L * 0.46; x < L * 0.3; x += 6) lad.push([GB, 0.8, 0.8, 12, x, 19.5, 0]);
    merged('l', mc(0xc8ccd6), lad); part(tilt, GB, mc(0x8a8f9c), 10, 2.5, 12, -L * 0.38, 18.2, 0);
    bar(L * 0.38, 20.2, 'fire');
    axle(L * 0.34, 5.5); axle(-L * 0.2, 5.5); axle(-L * 0.36, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'tank') {                 // tracks, a low hull, the turret and its long gun
    merged('b', body, [[GB, L * 0.9, 7, Wd - 12, 0, 9.5, 0], [GB, L * 0.12, 4, Wd - 12, L * 0.45, 10, 0]]);
    merged('k', E.tire, [[GB, L, 8, 7, 0, 5, Wd / 2 - 3.5], [GB, L, 8, 7, 0, 5, -(Wd / 2 - 3.5)]]);
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) wheels.push([GCylZ, 3, 3, 1, -L * 0.4 + k * L * 0.2, 3.5, s * (Wd / 2 + 0.2)]);
    const tur = new THREE.Group(); tur.position.x = -L * 0.06; tilt.add(tur); m.tur = tur;      // the turret turns (js/08r)
    part(tur, GB, body, L * 0.42, 6.5, Wd * 0.58, 0, 16.25, 0);
    const gun = part(tur, GCyl, mc(0x3a4428), 1.6, L * 0.6, 1.6, L * 0.51, 16.5, 0); gun.rotation.z = -Math.PI / 2;
    part(tur, GB, mc(0x2b3320), 3, 2.6, 2.6, L * 0.81, 16.5, 0); part(tur, GB, mc(0x2b3320), 5, 1, 5, -L * 0.06, 19.9, 0);
    merged('h', E.headL, [[GB, 1, 2, 3, L * 0.5, 11, Wd / 2 - 9], [GB, 1, 2, 3, L * 0.5, 11, -(Wd / 2 - 9)]]);
  } else if (B === 'apc') {                  // an armoured hull with a sloped nose, slit windows, a light bar
    merged('b', body, [[GB, L, 12, Wd, 0, 9, 0], [GB, L * 0.78, 8, Wd - 4, -L * 0.06, 19, 0]]);
    const nose = part(tilt, GB, body, L * 0.18, 7, Wd - 1, L * 0.41, 15.5, 0); nose.rotation.z = 0.6;
    m.cabin = merged('g', E.glass, [[GB, L * 0.05, 2.2, Wd - 8, L * 0.33, 20, 0], [GB, L * 0.2, 2, Wd - 3.6, L * 0.12, 20.5, 0]]);
    part(tilt, GB, E.white, L * 0.9, 2.2, Wd + 0.3, 0, 11, 0);
    bar(-L * 0.1, 24.2, 'police');
    const tur = new THREE.Group(); tur.position.set(L * 0.15, 0, 0); tilt.add(tur); m.tur = tur;   // the turret machine gun (js/08r)
    part(tur, GCyl, mc(0x2b2f3a), 4.2, 2.6, 4.2, 0, 24.3, 0); part(tur, GB, mc(0x3a3f4c), 3.4, 4, 6, 1.5, 26.6, 0);
    const mg = part(tur, GCyl, E.black, 0.8, 13, 0.8, 9, 26.4, 0); mg.rotation.z = -Math.PI / 2; part(tur, GB, E.black, 4, 2, 1.6, 4, 25.4, 0);
    for (const x of [L * 0.36, L * 0.12, -L * 0.12, -L * 0.36]) axle(x, 5.5);
    lamps(9, 2.6, 9, 2.6, 5);
  } else if (B === 'super') {               // a mid-engined supercar: a low wedge, a glass canopy, side intakes, an engine deck, a rear wing
    merged('b', body, [[GB, L, 5.4, Wd, 0, 5.2, 0], [GB, L * 0.24, 2.4, Wd - 3, L * 0.37, 3.6, 0], [GB, L * 0.3, 2.2, Wd - 4, -L * 0.3, 8.9, 0], [GB, L * 0.2, 1, Wd - 8, -L * 0.03, 12.9, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.34, 4.6, Wd - 5, -L * 0.03, 10.3, 0);
    merged('k', E.black, [[GB, L * 0.15, 3.2, 0.6, -L * 0.13, 6.4, Wd / 2 + 0.2], [GB, L * 0.15, 3.2, 0.6, -L * 0.13, 6.4, -(Wd / 2 + 0.2)], [GB, 3, 0.7, Wd + 1, -L / 2 + 2.5, 13.4, 0],
      [GB, 1.2, 3.4, 1.2, -L / 2 + 3, 11.5, Wd / 2 - 4], [GB, 1.2, 3.4, 1.2, -L / 2 + 3, 11.5, -(Wd / 2 - 4)], [GB, L * 0.12, 0.5, Wd - 6, L * 0.25, 6.6, 0]]);
    for (const x of [L * 0.32, -L * 0.3]) axle(x, 4.4);
    lamps(5.6, 1.6, 5.4, 1.4, 5); seat(-L * 0.03, 12.4, 0.8);
  } else if (B === 'convertible') {          // a 1950s convertible: long and low, the top down, chrome bumpers and side strip, tail fins, a red interior
    merged('b', body, [[GB, L, 6.6, Wd, 0, 6.6, 0], [GB, L * 0.24, 3.4, 1.6, -L * 0.38, 11.4, Wd / 2 - 1.6], [GB, L * 0.24, 3.4, 1.6, -L * 0.38, 11.4, -(Wd / 2 - 1.6)]]);
    merged('c', mc(0xd8dce4), [[GB, 1.8, 2.4, Wd + 0.8, L / 2 + 0.4, 4.6, 0], [GB, 1.8, 2.4, Wd + 0.8, -L / 2 - 0.4, 4.6, 0], [GB, L * 0.86, 0.6, Wd + 0.3, 0, 8.4, 0]]);
    merged('i', mc(0x9a2a2a), [[GB, L * 0.42, 2.4, Wd - 4.4, -L * 0.1, 10.6, 0], [GB, 2, 4.4, Wd - 4.4, -L * 0.2, 12.2, 0], [GB, 2, 4.4, Wd - 4.4, -L * 0.02, 12.2, 0]]);
    m.cabin = part(tilt, GB, GLASS, 1, 4.6, Wd - 3, L * 0.13, 12.2, 0);
    for (const x of [L * 0.33, -L * 0.3]) axle(x, 4.6);
    lamps(7.4, 2.4, 7.4, 2.4); seat(-L * 0.1, 16.4);
  } else if (B === 'muscle') {               // a muscle car: a long bonnet with a scoop, a short deck with a ducktail, twin stripes, fat rear tyres
    merged('b', body, [[GB, L, 7.6, Wd, 0, 7, 0], [GB, L * 0.28, 1.4, Wd - 8, -L * 0.12, 17.4, 0], [GB, 2, 1.6, Wd - 3, -L / 2 + 1, 11.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.32, 6, Wd - 5, -L * 0.12, 14, 0);
    merged('s', E.white, [[GB, L * 0.98, 0.3, 2.2, 0, 10.95, 3], [GB, L * 0.98, 0.3, 2.2, 0, 10.95, -3], [GB, L * 0.28, 0.3, 2.2, -L * 0.12, 18.2, 3], [GB, L * 0.28, 0.3, 2.2, -L * 0.12, 18.2, -3]]);
    merged('k', E.black, [[GB, L * 0.14, 2.2, Wd * 0.3, L * 0.24, 11.8, 0], [GB, 1.2, 2.6, Wd + 0.4, L / 2, 6, 0]]);
    axle(L * 0.31, 4.6); for (const s2 of [-1, 1]) wheel(-L * 0.31, s2 * (Wd / 2 + 0.6), 5, 5.2);
    lamps(7.6, 2.4, 7.6, 2.4); seat(-L * 0.08, 17.1);
  } else if (B === 'bike') {                 // a motorbike: wheels, engine, tank, seat, fairing - and its rider, out in the open
    merged('b', body, [[GB, L * 0.22, 4, 6, L * 0.08, 13.5, 0], [GB, L * 0.16, 7, 7.5, L * 0.3, 13, 0], [GB, L * 0.14, 3, 5, -L * 0.33, 13.5, 0]]);
    merged('k', E.black, [[GB, L * 0.4, 6, 5, 0, 9, 0], [GB, L * 0.25, 2, 5.5, -L * 0.15, 13.2, 0], [GB, 1.5, 1.2, 13, L * 0.24, 17, 0]]);
    part(tilt, GB, mc(0xb8bcc8), L * 0.3, 1.6, 1.6, -L * 0.15, 7, 3.5);
    for (const x of [L * 0.34, -L * 0.34]) wheel(x, 0, 6, 2.4);
    m.tail.push(part(tilt, GB, E.tailOff, 1, 1.6, 3, -L / 2, 14, 0)); part(tilt, GB, E.headL, 1, 2.4, 3, L / 2 - 1, 14, 0);
    const rg = new THREE.Group(); rg.position.set(-L * 0.08, 0, 0); tilt.add(rg);
    m.rider = part(rg, GB, mc(pick([0x6a8fd9, 0xd96a6a, 0x7acb8a, 0x2a2d3a])), 5.4, 9, 7.4, 0, 20.5, 0); m.rider.rotation.z = -0.5; m.riderM = m.rider.material;
    part(rg, GSph, mc(pick([0x14161d, 0xe0364f, 0xf1f1ee, 0x2bf3ff])), 3.3, 3.3, 3.3, 3.4, 26.4, 0);
    for (const s of [-1, 1]) { const a = part(rg, GB, mc(0x2a2d3a), 9, 2.2, 2.2, 5, 20.5, s * 4.6); a.rotation.z = -0.25; const lg = part(rg, GB, mc(0x2a2d3a), 8, 2.6, 2.8, 2, 13.5, s * 4.2); lg.rotation.z = 0.5; }
    m.drv = rg;
  } else if (B === 'mixer') {                // a cement mixer: a white cab, the chassis, the drum turning at the back (js/08zt), its chute
    merged('c', E.white, [[GB, L * 0.22, 15, Wd, L * 0.39, 11, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 13.5, 0], [GB, L * 0.1, 5, Wd + 0.2, L * 0.4, 13.5, 0]]);
    merged('k', E.black, [[GB, L * 0.74, 4, Wd - 6, -L * 0.12, 5, 0], [GB, L * 0.06, 9, Wd - 4, L * 0.24, 12, 0]]);
    const dt0 = new THREE.Group(); dt0.position.set(-L * 0.13, 17, 0); dt0.rotation.z = 0.2; tilt.add(dt0);
    const drum = new THREE.Group(); dt0.add(drum); m.drum = drum;
    const dm = part(drum, GCylZ, body, Wd * 0.44, Wd * 0.44, L * 0.5, 0, 0, 0); dm.rotation.y = Math.PI / 2;
    for (let k = 0; k < 4; k++) { const b = part(drum, GCylZ, mc(0xff7a1a), Wd * 0.46, Wd * 0.46, 2.4, -L * 0.18 + k * L * 0.12, 0, 0); b.rotation.y = Math.PI / 2; b.rotation.x = 0.4; }
    const cone = part(drum, GCylZ, body, Wd * 0.26, Wd * 0.26, L * 0.12, -L * 0.29, 0, 0); cone.rotation.y = Math.PI / 2;
    part(tilt, GB, mc(0x8a8f9c), L * 0.14, 1.6, 4, -L * 0.48, 10, 0);
    axle(L * 0.33, 5.5); axle(-L * 0.14, 5.5); axle(-L * 0.32, 5.5);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'dumper') {               // a dump truck: a short cab and a big tipper box with its sloped front
    merged('c', body, [[GB, L * 0.24, 16, Wd, L * 0.37, 12, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 15, 0], [GB, L * 0.1, 5, Wd + 0.2, L * 0.38, 15, 0]]);
    merged('k', E.black, [[GB, L * 0.7, 5, Wd - 6, -L * 0.1, 5, 0]]);
    merged('t', body, [[GB, L * 0.64, 13, Wd, -L * 0.17, 15.5, 0], [GB, L * 0.1, 4, Wd, L * 0.12, 23, 0]]);
    merged('d', mc(0x5a4a38), [[GB, L * 0.6, 0.6, Wd - 3, -L * 0.17, 22.2, 0]]);              // the load of dirt in it
    for (const x of [L * 0.32, -L * 0.12, -L * 0.33]) axle(x, 6);
    lamps(8, 3, 9, 3, 5);
  } else if (B === 'wrecker') {              // a wrecking crane: a yellow cab, the long chassis, the turning house, a lattice boom raised forward, the iron ball swinging on its cable (js/08zzn)
    merged('c', body, [[GB, L * 0.16, 14, Wd, L * 0.42, 11, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 6, Wd - 4, L / 2 + 0.05, 14, 0], [GB, L * 0.1, 5, Wd + 0.2, L * 0.42, 14, 0]]);
    merged('k', E.black, [[GB, L * 0.84, 4, Wd - 5, -L * 0.06, 5, 0]]);
    merged('h', body, [[GB, L * 0.34, 10, Wd - 2, -L * 0.18, 13, 0], [GB, L * 0.14, 6, Wd - 6, -L * 0.36, 21, 0]]);   // the house and its counterweight
    merged('w', mc(0x2a2d38), [[GB, L * 0.12, 8, Wd * 0.4, -L * 0.02, 22, -Wd * 0.2]]);                      // the operator's cab on the house
    for (const s of [-1, 1]) merged('st' + s, mc(0xff3b4a), [[GB, L * 0.8, 0.5, 0.6, -L * 0.04, 8.5, s * (Wd / 2 + 0.1)]]);   // red stripes
    const boom = new THREE.Group(); boom.position.set(-L * 0.12, 20, 0); boom.rotation.z = 0.62; tilt.add(boom);
    const BL = L * 1.05, lat = mc(0xffd23f);
    for (const s of [-1, 1]) { part(boom, GB, lat, BL, 1.2, 1.2, BL / 2, 1.6, s * 2.6); part(boom, GB, lat, BL, 1.2, 1.2, BL / 2, -1.6, s * 2.6); }   // the four chords
    for (let k = 1; k < 12; k++) { const x = k * BL / 12, d = part(boom, GB, lat, 0.6, 4.2, 0.6, x, 0, (k % 2 ? 2.6 : -2.6)); d.rotation.x = 0; part(boom, GB, lat, 0.6, 0.6, 5.8, x, k % 2 ? 1.6 : -1.6, 0); }   // the lacing
    const tip = new THREE.Group(); tip.position.set(BL, 0, 0); boom.add(tip);
    const swing = new THREE.Group(); tip.add(swing); swing.rotation.z = -0.62; m.swing = swing;   // hangs straight down whatever the boom's angle
    part(swing, GB, mc(0x2a2a30), 0.4, 26, 0.4, 0, -13, 0);                                        // the cable
    part(swing, GSph, mc(0x3a3d44), 6, 6, 6, 0, -30, 0);                                           // the iron ball
    for (const x of [L * 0.34, L * 0.14, -L * 0.2, -L * 0.36]) axle(x, 6);
    lamps(8, 3, 8, 3, 5);
  } else if (B === 'fueltruck') {            // the space center's tanker: a white cab, the long polished tank with a blue stripe, hazard diamonds, a catwalk on top (js/10zj)
    merged('c', body, [[GB, L * 0.2, 12, Wd, L * 0.39, 10, 0]]);
    m.cabin = merged('g', E.glass, [[GB, 0.6, 5.5, Wd - 4, L * 0.49 + 0.05, 12.5, 0], [GB, L * 0.12, 4.6, Wd + 0.2, L * 0.4, 12.5, 0]]);
    merged('k', E.black, [[GB, L * 0.92, 3, Wd - 5, -L * 0.04, 4, 0]]);
    merged('t', mc(0xe8ecf0), [[GB, L * 0.66, 10, Wd - 0.6, -L * 0.13, 12, 0], [GB, L * 0.64, 2.4, Wd - 3.4, -L * 0.13, 18, 0], [GB, L * 0.02, 8, Wd - 3, -L * 0.47, 12, 0], [GB, L * 0.02, 8, Wd - 3, L * 0.21, 12, 0]]);   // the tank, rounded by its top and its end caps
    for (const s of [-1, 1]) merged('st' + s, mc(0x2a5ad6), [[GB, L * 0.66, 1.6, 0.4, -L * 0.13, 12.5, s * (Wd / 2 - 0.1)]]);   // the blue stripe
    merged('hz', mc(0xff7a1a), [[GB, 0.4, 2.6, 2.6, -L * 0.47 - 0.3, 13, 0], [GB, 2.6, 2.6, 0.4, -L * 0.3, 14.5, Wd / 2 - 0.1], [GB, 2.6, 2.6, 0.4, -L * 0.3, 14.5, -(Wd / 2 - 0.1)]]);   // hazard diamonds
    merged('cw', mc(0x9aa0ab), [[GB, L * 0.5, 0.5, 2.4, -L * 0.13, 19.5, 0], [GB, 0.6, 9, 0.6, -L * 0.45, 14, Wd / 2 - 0.6]]);   // the catwalk and its ladder
    merged('tp', mc(0x2a5ad6), [[GB, L * 0.62, 0.3, 1.4, -L * 0.13, 19.3, Wd * 0.3], [GB, L * 0.62, 0.3, 1.4, -L * 0.13, 19.3, -Wd * 0.3]]);   // the blue stripes over the top
    merged('hc', mc(0x3a3d47), [[GB, 3, 0.5, 3, -L * 0.3, 19.6, 0], [GB, 3, 0.5, 3, L * 0.02, 19.6, 0]]); merged('hd', mc(0xff7a1a), [[GB, 3.2, 0.5, 3.2, -L * 0.42, 19.4, 0]]);   // the hatches, a hazard diamond on top
    for (const x of [L * 0.36, -L * 0.1, -L * 0.24, -L * 0.38]) axle(x, 5);
    lamps(8, 3, 8, 3, 4.5);
  } else if (B === 'digger') {               // a tracked excavator: tracks, the turning house with its cab, the boom, the stick and the bucket (move: js/08zt)
    merged('k', E.tire, [[GB, L * 0.82, 8, 9, -L * 0.04, 5, Wd / 2 - 4.5], [GB, L * 0.82, 8, 9, -L * 0.04, 5, -(Wd / 2 - 4.5)]]);
    merged('b', body, [[GB, L * 0.62, 11, Wd - 4, -L * 0.1, 14.5, 0], [GB, L * 0.22, 4, Wd - 8, -L * 0.3, 21.5, 0]]);
    merged('d', mc(0x2a2d38), [[GB, L * 0.12, 9, Wd - 6, -L * 0.42, 14, 0]]);
    merged('c', body, [[GB, L * 0.24, 13, Wd * 0.42, L * 0.08, 26, -Wd * 0.22]]);
    m.cabin = merged('g', E.glass, [[GB, L * 0.2, 8, Wd * 0.44, L * 0.08, 27, -Wd * 0.22], [GB, 0.6, 8, Wd * 0.38, L * 0.2 + 0.05, 27, -Wd * 0.22]]);
    const arm = new THREE.Group(); arm.position.set(L * 0.18, 20, Wd * 0.12); tilt.add(arm); arm.rotation.z = 0.35; m.arm = arm;
    part(arm, GB, body, L * 0.62, 5.5, 5, L * 0.31, 0, 0);
    const stick = new THREE.Group(); stick.position.set(L * 0.6, 0, 0); arm.add(stick); stick.rotation.z = 0.9; m.stick = stick;
    part(stick, GB, body, 4.5, L * 0.42, 4.5, 0, -L * 0.21, 0);
    part(stick, GB, mc(0x2a2d38), 9, 8, 11, 2.5, -L * 0.43, 0);
    lamps(9, 2, 9, 2, 5);
  } else if (t.boat) { buildBoat(c, B, L, Wd, tilt, body, m, seat);   // the boats: no wheels
  } else {                                   // sedan, police (and any body without a model yet)
    merged('b', body, [[GB, L, 8, Wd, 0, 7, 0], [GB, L * 0.34, 1.4, Wd - 8, -L * 0.04, 18.6, 0]]);
    m.cabin = part(tilt, GB, GLASS, L * 0.4, 7, Wd - 5, -L * 0.04, 14.5, 0);
    if (B === 'police') { part(tilt, GB, E.white, L * 0.3, 6.5, Wd + 0.8, -L * 0.04, 7, 0); bar(-L * 0.04, 20.2, 'police'); }
    if (B === 'taxi') {                     // a lit TAXI box on the roof and a checker band along the sides
      part(tilt, GB, mBas(0xfff1a8), 4.2, 3, Wd * 0.42, -L * 0.04, 21, 0); part(tilt, GB, E.black, 4.4, 0.6, Wd * 0.44, -L * 0.04, 19.5, 0);
      const ch = []; for (let i = 0, n = 10; i < n; i++) for (const s of [-1, 1]) ch.push([GB, L * 0.7 / n, 1.6, 0.4, -L * 0.35 + (i + 0.5) * L * 0.7 / n, i % 2 ? 9.2 : 7.6, s * (Wd / 2 + 0.1)]);
      merged('ck', E.black, ch);
    }
    for (const x of [L * 0.31, -L * 0.31]) axle(x, 4.6);
    lamps(8, 2.6, 8, 2.6); seat(L * 0.02, 17.9);
  }
  tuneParts(c, m, merged, wheels);                                   // the tuning workshop's roof, stripes, wing, scoop and rims (js/08y)
  if (c.deco && B === 'truck') carDeco(c.deco, tilt, L, Wd);           // a livery on the cargo box: the laundry van, the casino's armoured van (js/08zzi)
  merged('w', E.tire, wheels);
  { const ug = new THREE.Mesh(GP, glowMat((c.tune && c.tune.glow) || c.color, 0.9)); ug.scale.set(L * 1.5, 1, Wd * 2.1); ug.position.y = 1.4; g.add(ug); m.ug = ug;       // neon underglow
    const hb = new THREE.Mesh(GP, glowMat('#bfeeff', 0.38, true)); hb.scale.set(100, 1, 50); hb.position.set(L / 2 + 44, 1.45, 0); g.add(hb); m.hb = hb;       // headlight pool
    body.emissive = new THREE.Color(c.color).multiplyScalar(0.22); }
  if (t.boat) { m.ug.visible = false; m.hb.visible = false; }       // no glow or headlights on the water
  c.mesh = g; c.tilt = tilt; c.m = m; c.roll = 0; c.baseCol = new THREE.Color(c.color); c.tailOn = false; c.dead3 = false; c.hpShown = -1; scene.add(g);
}
function buildBoat(c, B, L, Wd, tilt, body, m, seat) {   // buildCar: a boat's parts, one mesh per material (the hull's bottom 2.4 under the water, js/08zv)
  const hw = boatHalf(B, Wd), X = u => (u - 0.5) * L, H = B === 'jetski' ? 5 : B === 'yacht' || B === 'tourboat' ? 9 : 7;
  const mg = (key, mat, fn) => { key = c.type + '~' + key; const o = new THREE.Mesh(_cg[key] || mergedGeo(key, fn()), mat); tilt.add(o); return o; };
  const S = (sh, y, d, bev) => [slabGeo(sh, y, d, bev), 1, 1, 1, 0, 0, 0];   // a slab as a part to merge
  const plan = (u0, u1, ins, f, n) => planShape(f || hw, L, u0, u1, ins, n);
  const ring = (ins, hole) => { const sh = plan(Math.min(0, ins / L), 1, ins); sh.holes.push(hole); return sh; };   // the outline with a hole (a cockpit, a well)
  const band = (o, i) => ring(o, plan((i - o) / L, 1, i));             // a band round the edge, o to i in from the side
  const rail = (out, f, u0, u1, ins, y0, y, n) => {                  // a rail on posts along an outline, both sides
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const ua = lerp(u0, u1, i / n), ub = lerp(u0, u1, (i + 1) / n), xa = X(ua), xb = X(ub), za = s * Math.max(0, f(ua) - ins), zb = s * Math.max(0, f(ub) - ins);
      out.push([GB, Math.hypot(xb - xa, zb - za) + 0.4, 0.45, 0.45, (xa + xb) / 2, y, (za + zb) / 2, -Math.atan2(zb - za, xb - xa)]);
      if (i % 2 === 0) out.push([GB, 0.45, y - y0, 0.45, xa, (y + y0) / 2, za]);
    }
    return out;
  };
  const wht = E.white, dark = mc(0x2a2d38), cream = mc(0xf0e4c8), chrome = mc(0xd0d4dc), teak = mc(0xb58a5c), floor = mc(0xc9ced6);
  const skin = () => mc(pick([0xf2c6a0, 0xd9a07a, 0x9a6a46, 0xffdcbc]));
  if (B === 'speedboat') {                   // a sports runabout: the coloured hull round a white foredeck with stripes and a bow rail, the windshield, two bucket seats and a bench in the cockpit, the outboard
    const fl = H - 2.4, wz = hw(0.62) - 1.4, wa = 0.3, wx = X(0.62) - 1.4;
    mg('h', body, () => [S(plan(0, 1, 0), 0, fl), S(ring(0, plan(0.1, 0.62, 2.2)), fl, 2.4), [GB, L * 0.26, 0.2, 1.1, X(0.8), H + 0.6, 2.2], [GB, L * 0.26, 0.2, 1.1, X(0.8), H + 0.6, -2.2],
      [GB, 1.7, 0.5, 5.7, X(0.47) - 3, fl + 5.85, Wd * 0.2], [GB, 1.7, 0.5, 5.7, X(0.47) - 3, fl + 5.85, -Wd * 0.2], [GB, 6.5, 0.4, 1.8, -L / 2 - 3.2, H + 2.9, 0]]);   // the hull, the deck stripes, the seat backs' tops, the engine's stripe
    mg('w', wht, () => [S(plan(0.62, 1, 1.4), H, 0.5), S(plan(0, 0.1, 1.4), H, 0.5)]);             // the foredeck and the stern deck
    mg('f', floor, () => [S(plan(0.1, 0.62, 2.2), fl, 0.2)]);                                     // the cockpit floor
    mg('c', cream, () => { const bw = 2 * (hw(0.17) - 2.2) - 1, o = [S(plan(0.015, 0.095, 3.4), H + 0.5, 0.8, 0.5), [GB, 5, 2.2, bw, X(0.17), fl + 1.3, 0], [GB, 1.6, 4, bw, X(0.1) + 2.4, fl + 3.2, 0]];
      for (const s of [-1, 1]) o.push([GB, 5, 2.2, 5.6, X(0.47), fl + 1.3, s * Wd * 0.2], [GB, 1.6, 4.4, 5.6, X(0.47) - 3, fl + 3.4, s * Wd * 0.2]); return o; });   // the sunpad, the bench, the bucket seats
    m.cabin = mg('g', GLASS, () => [-1, 1].map(s => [GB, 2.4, 3.6, wz, wx - Math.sin(wa) * wz / 2, H + 1.8, s * Math.cos(wa) * wz / 2, -s * wa]));   // the windshield in a shallow V
    mg('m', chrome, () => rail([...[-1, 1].map(s => [GB, 2.6, 0.5, wz + 0.2, wx - Math.sin(wa) * wz / 2, H + 3.8, s * Math.cos(wa) * wz / 2, -s * wa])], hw, 0.66, 0.985, 1, H + 0.5, H + 2.6, 5));
    mg('d', dark, () => [[GB, 3.2, 3.4, 6.5, X(0.56), fl + 1.7, -Wd * 0.2], [GCyl, 1.6, 0.4, 1.6, X(0.54), fl + 3.6, -Wd * 0.2], [GB, 6.4, 5, 5.6, -L / 2 - 3.2, H + 0.2, 0], [GB, 2.2, 7, 1.6, -L / 2 - 2.6, H - 5, 0],
      [GB, 2.4, 0.6, 1, X(0.06), H + 0.8, hw(0.06) - 2], [GB, 2.4, 0.6, 1, X(0.06), H + 0.8, -(hw(0.06) - 2)], [GB, 2.4, 0.6, 1, X(0.93), H + 0.8, 0]]);   // the console and wheel, the outboard, the cleats
    seat(X(0.47), H + 8.2, 0.8);
  } else if (B === 'jetski') {               // a sit-down jet ski: the coloured hull and hood in a dark bumper, the long saddle, the bars, the footwells, the jet at the stern
    mg('h', body, () => [S(plan(0, 1, 0), 0, H - 0.6), S(plan(0.56, 0.95, Wd * 0.16), H - 0.6, 1.6, 0.8)]);
    mg('k', dark, () => { const fz = hw(0.34) - 2.4, o = [S(band(0, 1.1), H - 1.4, 1.2), [GB, L * 0.4, 0.3, 2.2, X(0.34), H - 0.45, fz], [GB, L * 0.4, 0.3, 2.2, X(0.34), H - 0.45, -fz],
      [GB, 1.2, 1.2, Wd * 0.78, X(0.6), H + 4.4, 0], [GB, 1.4, 3.6, 1.4, X(0.61), H + 2.6, 0], [GB, 2.6, 2.2, 3.2, -L / 2 - 0.9, H - 2.6, 0], [GB, 1, 0.9, Wd * 0.36, X(0.06), H + 0.2, 0]];
      return o; });                                                                                // the bumper, the footwells, the bars, the jet, the grab handle
    mg('s', mc(0x1d1f26), () => [S(planShape(padHalf(0.33, 0.46, Wd * 0.17), L, 0.1, 0.56, 0, 24), H - 0.6, 1.6, 0.9), [GB, 1.6, 1.6, 2, X(0.6), H + 4.4, Wd * 0.4], [GB, 1.6, 1.6, 2, X(0.6), H + 4.4, -Wd * 0.4]]);   // the saddle, the grips
    mg('w', wht, () => [[GB, L * 0.2, 0.2, 0.9, X(0.78), H + 2.75, 0]]);
    m.cabin = mg('g', E.glass, () => [[GB, 2.2, 0.5, 3.6, X(0.67), H + 2.75, 0]]);                  // the display
    seat(X(0.4), H + 9, 0.85);
  } else if (B === 'yacht') {                // a motor yacht: a navy toe rail round a teak deck, the white deckhouse in a band of dark windows, the flybridge on top with the helm and a sofa under the radar arch, a sunpad on the foredeck, a sofa aft, the swim platform
    const dh = noseHalf(0.6, 0.75, Wd * 0.34), fb = noseHalf(0.5, 0.62, Wd * 0.3), top = H + 9.2, fw = 2 * fb(0.33) - 3;
    const fbr = plan(0.3, 0.62, 0, fb); fbr.holes.push(plan(0.306, 0.62, 1, fb));                     // the flybridge's low wall
    mg('h', body, () => [S(plan(0, 1, 0), 0, H)]);
    mg('n', mc(0x1f2a4a), () => [S(band(0, 1.2), H, 0.7)]);
    mg('t', teak, () => [S(plan(0.008, 0.99, 1.2), H, 0.3), S(plan(0.303, 0.616, 1.1, fb), top, 0.15), [GB, 9, 1.2, 2 * hw(0) - 6, -L / 2 - 4.5, H - 3.6, 0], [GB, 7, 0.6, 12, X(0.1), H + 2.8, 0]]);   // the deck, the swim platform, the table
    mg('p', mc(0x8a6640), () => { const o = []; for (let z = -hw(0.1) + 4; z < hw(0.1) - 3; z += 3.2) o.push([GB, X(0.16) - X(0.012), 0.08, 0.3, (X(0.16) + X(0.012)) / 2, H + 0.33, z]); return o; });   // the planks aft
    mg('w', wht, () => [S(plan(0.16, 0.75, 0, dh), H + 0.3, 7.7), S(plan(0.17, 0.74, 0.8, dh), H + 8, 1.2), S(fbr, top, 2.4),
      [GB, 2.4, 1.6, 2 * Wd * 0.3 - 2, X(0.33), top + 7, 0], [GB, 2, 7, 1.6, X(0.33), top + 3.5, Wd * 0.3 - 1.8], [GB, 2, 7, 1.6, X(0.33), top + 3.5, -(Wd * 0.3 - 1.8)], [GCyl, 2.6, 1.8, 2.6, X(0.33), top + 8.7, 0]]);
    m.cabin = mg('g', E.glass, () => [S(plan(0.155, 0.757, 0, noseHalf(0.6, 0.757, Wd * 0.34 + 1.4)), H + 5, 2.6), [GB, 2.4, 1.6, 5, X(0.565), top + 3.4, -Wd * 0.2]]);   // the windows, the helm's screen
    mg('c', cream, () => [S(planShape(padHalf(0.82, 0.12, Wd * 0.2), L, 0.76, 0.88, 0, 24), H + 0.3, 0.9, 0.5), [GB, 4.5, 2.2, 2 * hw(0.04) - 12, X(0.04), H + 1.4, 0], [GB, 1.4, 3, 2 * hw(0.04) - 12, X(0.025), H + 2.3, 0],
      [GB, 3.5, 1.6, fw, X(0.33), top + 0.8, 0], [GB, 1.4, 2.6, fw, X(0.315), top + 1.8, 0], [GB, L * 0.08, 1.6, 3.2, X(0.37), top + 0.8, fb(0.37) - 2.6], [GB, L * 0.08, 1.6, 3.2, X(0.37), top + 0.8, -(fb(0.37) - 2.6)],
      [GB, 4, 2, 5, X(0.5), top + 1, -Wd * 0.2]]);                                                // the sunpad, the sofas aft and on the flybridge, the helm seat
    mg('m', chrome, () => rail([], hw, 0.04, 0.985, 1.6, H + 0.3, H + 4.2, 14));
    mg('d', dark, () => [[GB, 3, 3, 6, X(0.545), top + 1.5, -Wd * 0.2], [GB, 3, 0.8, 2.2, X(0.975), H + 0.7, 0], [GCyl, 0.3, 8, 0.3, X(0.33), top + 11, 5]]);   // the helm, the anchor, the antenna
    seat(X(0.5), top + 7.5, 0.85);
  } else if (B === 'fishboat') {             // a trawler: a coloured hull with a white gunwale, the working deck aft with nets, floats, crates and the winch; the wheelhouse forward under a coloured roof; the mast, its boom and two outrigger poles
    const fl = H - 2.6, wh = noseHalf(0.68, 0.77, Wd * 0.3), mx = X(0.47), mt = fl + 26, a = Wd * 0.475, ph = 0.45;
    mg('h', body, () => [S(plan(0, 1, 0), 0, fl), S(ring(0, plan(0.04, 0.56, 2)), fl, 3.2), S(plan(0.495, 0.775, 0, noseHalf(0.68, 0.785, Wd * 0.33)), H + 9.6, 1)]);   // hull and bulwark, the wheelhouse roof
    mg('w', wht, () => [S(band(0, 0.9), H + 0.6, 0.4), S(plan(0.5, 0.77, 0, wh), fl, 9.6)]);           // the gunwale, the wheelhouse
    mg('f', mc(0xd9dcd6), () => [S(plan(0.56, 1, 1.6), H + 0.6, 0.4)]);                             // the foredeck
    mg('t', mc(0x9a8064), () => [S(plan(0.04, 0.56, 2), fl, 0.2)]);                                // the working deck
    m.cabin = mg('g', E.glass, () => [S(plan(0.497, 0.775, 0, noseHalf(0.68, 0.776, Wd * 0.3 + 1)), H + 7, 2.6)]);
    mg('m', mc(0xe2e4e8), () => [[GCyl, 0.7, mt - fl, 0.7, mx, (mt + fl) / 2, 0], [GB, L * 0.34, 0.8, 0.8, mx - L * 0.17 * Math.cos(0.35), mt - 2 - L * 0.17 * Math.sin(0.35), 0, 0, 0, 0.35],
      ...[-1, 1].map(s => [GB, 0.6, 0.6, a * 2, mx, mt - a * Math.sin(ph), s * a * Math.cos(ph), 0, s * ph, 0]), [GCyl, 1.1, 1.4, 1.1, X(0.72), H + 11.2, -4]]);   // the mast, the boom, the outriggers, the searchlight
    mg('n', mc(0x3a7a4a), () => [[GSph, 8, 2.4, 9, X(0.2), fl + 1, -5], [GSph, 6, 2, 7, X(0.11), fl + 1, 6]]);   // the nets
    mg('o', mc(0xff7a3d), () => [[GSph, 1.2, 1.2, 1.2, X(0.16), fl + 2.6, -10], [GSph, 1.2, 1.2, 1.2, X(0.24), fl + 2.6, -1], [GSph, 1.2, 1.2, 1.2, X(0.08), fl + 2.4, 2], [GSph, 1.2, 1.2, 1.2, X(0.14), fl + 2.4, 10]]);   // the floats
    mg('x', mc(0x2f6bff), () => [[GB, 4.4, 2.6, 3.4, X(0.36), fl + 1.5, 9], [GB, 4.4, 2.6, 3.4, X(0.36) - 4.8, fl + 1.5, 9], [GB, 4.4, 2.6, 3.4, X(0.36), fl + 4.1, 9], [GB, 4.4, 2.6, 3.4, X(0.36), fl + 1.5, -9]]);   // fish crates
    mg('d', dark, () => [[GCylZ, 2.4, 2.4, 9, X(0.44), fl + 2.6, 0], [GB, 1.4, 0.8, 9, X(0.64), H + 11.4, 0], [GB, 1, 1.2, 1, X(0.64), H + 10.8, 0]]);   // the winch, the radar
    seat(X(0.66), H + 9.4, 0.85);
  } else if (B === 'tourboat') {             // the sightseeing boat: a white hull with a blue rim, the glazed saloon, the open top deck with rows of blue benches full of tourists, a striped awning aft, the wheelhouse forward, life rings, a flag at the bow
    const cab = noseHalf(0.64, 0.82, Wd * 0.42), up = H + 8.6, wh = noseHalf(0.68, 0.745, Wd * 0.26), rows = [0.1, 0.165, 0.23, 0.295, 0.36, 0.425, 0.49, 0.555], ax = [X(0.06), X(0.3)];
    mg('h', body, () => [S(plan(0, 1, 0), 0, H)]);
    mg('b', mc(0x2f6bff), () => { const o = [S(band(0, 1.4), H, 0.5)]; for (const u of rows) for (const s of [-1, 1]) o.push([GB, 2.6, 1.8, Wd * 0.3, X(u), up + 1.5, s * Wd * 0.19], [GB, 0.8, 2.6, Wd * 0.3, X(u) - 1.6, up + 2.6, s * Wd * 0.19]);
      o.push([GB, 5, 3.4, 0.2, X(0.965) - 2.6, H + 10, 0]); return o; });                             // the rim, the benches, the flag
    mg('d', floor, () => [S(plan(0.01, 0.99, 1.4), H, 0.3)]);
    mg('u', mc(0xb9c6d6), () => [S(plan(0.055, 0.825, 0, noseHalf(0.64, 0.825, Wd * 0.42 + 0.3)), up, 0.6)]);   // the top deck
    mg('w', wht, () => { const o = [S(plan(0.06, 0.82, 0, cab), H + 0.3, 8.3), S(plan(0.6, 0.745, 0, wh), up + 0.6, 4.4), S(plan(0.595, 0.75, 0, noseHalf(0.68, 0.75, Wd * 0.28)), up + 7.6, 0.8),
      [GCyl, 0.35, 12, 0.35, X(0.965), H + 6, 0]];
      for (let k = 0; k < 7; k++) if (k % 2) o.push([GB, ax[1] - ax[0], 0.5, Wd * 0.84 / 7, (ax[0] + ax[1]) / 2, up + 9.5, (k - 3) * Wd * 0.12]);
      for (const x of ax) for (const s of [-1, 1]) o.push([GCyl, 0.5, 9, 0.5, x, up + 5, s * Wd * 0.38]); return o; });   // the saloon, the wheelhouse and its roof, the flagpole, the awning's white stripes and posts
    mg('r', mc(0xe0364f), () => { const o = []; for (let k = 0; k < 7; k += 2) o.push([GB, ax[1] - ax[0], 0.5, Wd * 0.84 / 7, (ax[0] + ax[1]) / 2, up + 9.5, (k - 3) * Wd * 0.12]); return o; });   // the awning's red stripes
    m.cabin = mg('g', E.glass, () => [S(plan(0.057, 0.823, 0, noseHalf(0.64, 0.823, Wd * 0.42 + 1)), H + 3, 3.2), S(plan(0.597, 0.748, 0, noseHalf(0.68, 0.748, Wd * 0.26 + 0.6)), up + 5, 2.6)]);
    mg('m', chrome, () => rail([[GB, 0.45, 0.45, 2 * Wd * 0.42, X(0.06), up + 4.2, 0]], noseHalf(0.64, 0.825, Wd * 0.42 + 0.3), 0.06, 0.6, 0.6, up + 0.6, up + 4.2, 10));
    mg('o', mc(0xff7a3d), () => [[GTor, 2.4, 2.4, 2.4, X(0.2), up + 0.9, Wd * 0.4 - 1.5], [GTor, 2.4, 2.4, 2.4, X(0.2), up + 0.9, -(Wd * 0.4 - 1.5)], [GTor, 2.4, 2.4, 2.4, X(0.52), up + 0.9, Wd * 0.4 - 1.5], [GTor, 2.4, 2.4, 2.4, X(0.52), up + 0.9, -(Wd * 0.4 - 1.5)]]);
    mg('k', dark, () => [[GCylZ, 1.6, 1.6, 6, X(0.88), H + 1.8, 0]]);                               // the mooring winch
    const sit = []; rows.forEach((u, i) => { for (const s of [-1, 1]) for (const e of [-1, 1]) if ((i * 4 + (s + 1) + (e + 1) / 2) % 3 !== 2) sit.push([X(u) - 0.3, s * Wd * 0.19 + e * Wd * 0.08]); });   // two seats on a bench, about two in three taken
    for (let g = 0; g < 4; g++) mg('s' + g, mc(pick([0xff2bd6, 0x2bf3ff, 0xffd23f, 0x3dffa6, 0xff7a3d, 0xf4f4f6, 0x6a8fd9])), () => sit.filter((p, i) => i % 4 === g).map(p => [GB, 3, 4, 3.6, p[0], up + 3.6, p[1]]));   // their shirts
    for (let g = 0; g < 2; g++) mg('f' + g, skin(), () => sit.filter((p, i) => i % 2 === g).map(p => [GSph, 1.9, 1.9, 1.9, p[0] + 0.1, up + 6.9, p[1]]));   // their heads
    seat(X(0.68), up + 7.2, 0.85);
  } else {                                   // the police boat: a dark blue hull in a grey fender collar, white chevrons on the foredeck, the white console cabin with the light bar and a searchlight, twin outboards
    const fl = H - 2.2, cb = noseHalf(0.56, 0.645, Wd * 0.28);
    mg('h', body, () => [S(plan(0, 1, 0), 0, fl), S(ring(0, plan(0.05, 0.6, 2.4)), fl, 2.2), S(plan(0.6, 1, 1.8), H, 0.4)]);   // hull, the foredeck
    mg('c', mc(0xc9ced6), () => [S(band(-0.4, 1.6), H - 1.4, 1.2, 0.5)]);                             // the fender collar
    mg('w', wht, () => { const o = [S(plan(0.36, 0.645, 0, cb), fl, 9.4), S(plan(0.35, 0.655, 0, noseHalf(0.56, 0.655, Wd * 0.3)), H + 7.2, 1), [GB, 6.5, 0.4, 5.1, -L / 2 - 3.2, H + 3.1, 6], [GB, 6.5, 0.4, 5.1, -L / 2 - 3.2, H + 3.1, -6]];
      for (const xf of [X(0.92), X(0.8)]) for (const s of [-1, 1]) { const l = 9, a = 0.55; o.push([GB, l, 0.2, 1.6, xf - l / 2 * Math.cos(a), H + 0.5, s * l / 2 * Math.sin(a), -Math.atan2(s * Math.sin(a), -Math.cos(a))]); }
      return o; });                                                                                  // the cabin and its roof, the engines' caps, the chevrons
    mg('f', mc(0x8c939e), () => [S(plan(0.05, 0.6, 2.4), fl, 0.2)]);
    m.cabin = mg('g', E.glass, () => [S(plan(0.357, 0.652, 0, noseHalf(0.56, 0.652, Wd * 0.28 + 0.8)), H + 4.6, 2.6)]);
    mg('d', dark, () => [[GB, 4, 2.4, 2 * (hw(0.15) - 2.4) - 2, X(0.15), fl + 1.4, 0], [GB, 6.4, 5.6, 5, -L / 2 - 3.2, H + 0.4, 6], [GB, 6.4, 5.6, 5, -L / 2 - 3.2, H + 0.4, -6],
      [GB, 2, 7, 1.4, -L / 2 - 2.6, H - 5, 6], [GB, 2, 7, 1.4, -L / 2 - 2.6, H - 5, -6], [GCyl, 0.25, 12, 0.25, X(0.4), H + 14, -Wd * 0.18]]);   // the bench, twin outboards, the antenna
    mg('m', chrome, () => [[GCyl, 1.3, 1.8, 1.3, X(0.6), H + 9.1, Wd * 0.18]]);                       // the searchlight
    m.barM = BAR.police; m.bar.push(part(tilt, GB, m.barM[1], 3.4, 2.2, Wd * 0.26, X(0.5), H + 9.3, -Wd * 0.14), part(tilt, GB, m.barM[3], 3.4, 2.2, Wd * 0.26, X(0.5), H + 9.3, Wd * 0.14));
    seat(X(0.5), H + 7.4, 0.85);
  }
}
const _dark = new THREE.Color(0x1b1b1f), _tmp = new THREE.Color();
function syncCar(c, time, dt) {
  if (!c.mesh) buildCar(c); track(c);
  const gy = groundH(c.x, c.y); c.gy = c.gy === undefined ? gy : c.gy + (gy - c.gy) * Math.min(1, dt * 14);
  if (c.sunk) { const st = c.sinkT * (c.slowSink ? 0.55 : 1); c.mesh.visible = st < 3; c.mesh.position.set(c.x, c.gy - Math.min(40, st * st * 9 + st * 4), c.y); c.mesh.rotation.y = -c.ang; c.tilt.rotation.x = Math.min(0.5, st * 0.3); return; }   // slowSink: you are inside, with seconds to get out (js/08zv)
  c.mesh.position.set(c.x, c.gy + (c.air || 0) + (c.z || 0) + (c.rz || 0), c.y); c.mesh.rotation.y = -c.ang;   // z: up a car park deck (js/10k); rz: on a site ramp or mound (js/08zt)
  if (c.t.boat) {                                                  // a boat rides the water; under a bridge it sits low, out of sight below the deck (js/08zv)
    c.dip = clamp((c.dip || 0) + (c.under ? 4 : -4) * dt, 0, 1);
    c.mesh.position.y = WATER_Y - 2.4 + Math.sin(time * 1.7 + c.x * 0.01) * 0.7 * (c.beached ? 0 : 1) - c.dip * 6; c.mesh.scale.y = 1 - 0.75 * c.dip;
  }
  c.tilt.rotation.z = c.rzp ? c.rzp : c.zg ? Math.atan(c.zg * Math.sin(c.ang)) : 0;   // nose up or down a ramp
  const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang), bike = c.t.body === 'bike';
  const want = c.air > 0 ? clamp(c.av * 0.07, -0.6, 0.6) : bike ? (c.driver ? clamp(c.av * vf / 260, -0.55, 0.55) : 0.22) : -clamp(c.av * vf / 450, -0.12, 0.12);   // rolls a little (in the air: a lot); a bike leans into the bend, parked it stands on its stand
  c.roll += (want - c.roll) * Math.min(1, dt * 8); c.tilt.rotation.x = c.roll;
  const f = c.hp / c.maxhp, m = c.m;
  m.ug.visible = !c.dead && !c.t.boat; m.hb.visible = !!c.driver && !c.dead && !c.t.boat;   // no glow or headlights on a boat
  if (m.drv) m.drv.visible = !!c.driver && !c.dead;
  if (m.pas) m.pas.visible = !!(c.mates && c.mates.length) && !c.dead;
  if (m.rider) m.rider.material = c.driver === 'player' ? playerTopMat() : m.riderM;   // you on the bike: in your top's colour
  if (c.dead && !c.dead3) { c.dead3 = true; m.body.emissive.setHex(0); m.body.color.copy(_dark); if (m.cabin) m.cabin.material = E.glassDead; if (m.tp) for (const o of m.tp) o.material = E.black; }
  else if (!c.dead) {                      // there is no health bar: the damage shows - the paint scorches darker, nearly done for it throbs dull red, on fire it flickers orange
    if (Math.abs(f - c.hpShown) > 0.01) { c.hpShown = f; m.body.color.copy(c.baseCol).lerp(_tmp.set(0x1b1b1f), (1 - f) * 0.8); }
    const glow = c.burn > 0 ? 0.5 + 0.3 * Math.sin(time * 31) * Math.sin(time * 17) : f < 0.3 ? 0.16 + 0.16 * Math.sin(time * 9) : -1;
    if (glow >= 0) { m.body.emissive.setRGB(glow, glow * (c.burn > 0 ? 0.38 : 0.06), 0); c.glowing = true; }
    else if (c.glowing) { c.glowing = false; m.body.emissive.copy(c.baseCol).multiplyScalar(0.22); }
  }
  if (m.tur) m.tur.rotation.y = -(c.turA || 0);                     // a tank's or an APC's turret (js/08r)
  const brake = !c.dead && c.driver && c.thr < 0; if (brake !== c.tailOn) { c.tailOn = brake; for (const l of m.tail) l.material = brake ? E.tailOn : E.tailOff; }
  if (m.bar.length) {                       // light bars: police while crewed, ambulance and fire engine on a call, the trash truck's beacon at a bin
    const on = !c.dead && (c.t.cop ? c.driver === 'cop' || c.driver === 'ai' || !!c.rb : c.t.job === 'trash' ? c.stopT > 0 : !!c.task || !!c.medics), ph = Math.floor(time * 6 + c.sirenT) % 2 === 0, M = m.barM;
    m.bar[0].material = on && ph ? M[0] : M[1]; m.bar[1].material = on && !ph ? M[2] : M[3];
  }
}

const GUmb = new THREE.ConeGeometry(1, 1, 8);
function buildPerson(kind, shirt, skin, pants) {
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const sm = mc(shirt), km = mc(skin), pm = mc(pants || (kind === 'officer' ? 0x1a2447 : 0x2a2d3a)), o = { g, tilt, legs: [], arms: [], torso: null };
  part(g, GCirc, E.shadow, 8, 1, 8, 0, 1.3, 0);
  o.torso = part(tilt, GB, sm, 5, 11, 9.4, 0, 14.5, 0);
  for (const s of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.set(0, 9, s * 2.5); part(lp, GB, pm, 3.2, 9, 3.4, 0, -4.5, 0); tilt.add(lp); o.legs.push(lp);
    const ap = new THREE.Group(); ap.position.set(0, 19.5, s * 5.8); part(ap, GB, sm, 3, 8.5, 2.8, 0, -4, 0); tilt.add(ap); o.arms.push(ap);
  }
  const hg = o.headG = new THREE.Group(); hg.position.set(0.5, 21.5, 0); tilt.add(hg);          // the head turns on the neck (hats and glasses with it, js/11c)
  o.head = part(hg, GSph, km, 3.9, 3.9, 3.9, 0, 1.5, 0);
  if (kind === 'officer') { part(hg, GB, mc(0x1a2a6a), 5.4, 2.2, 7.6, -0.1, 4.5, 0); part(hg, GB, mc(0x111111), 2.4, 0.8, 6, 2.7, 3.5, 0); }
  else o.hair = part(hg, GSph, mc(kind === 'player' ? 0x3a2a1a : 0x2a2018), 4.1, 3.3, 4.1, -0.9, 2.5, 0);
  if (kind !== 'ped') { o.gun = part(tilt, GB, E.black, kind === 'officer' ? 9 : 10, 2.4, 2.4, 8, 14, 3.6); }
  else {                                     // an umbrella, up when it rains
    const u = new THREE.Group(); u.position.set(1, 0, 3.5); u.visible = false; tilt.add(u);
    part(u, GCyl, E.black, 0.5, 16, 0.5, 0, 26, 0); part(u, GUmb, mc(pick([0xe0364f, 0x2a4aa8, 0x14161d, 0xffd23f, 0x3dffa6, 0xff2bd6])), 11, 4, 11, 0, 35, 0); o.umb = u;
  }
  return o;
}
function syncPerson(p, kind, time, dt) {
  if (p.gibbed || p.onStretcher) return;                             // torn apart (js/06), or under a sheet on a stretcher (js/08h): no figure (the mesh is swept)
  if (!p.mesh) { const o = buildPerson(kind, kind === 'officer' ? 0x2a4aa8 : p.shirt, p.skin || '#f2c6a0', p.pants); p.mesh = o.g; p.pm = o; scene.add(o.g); p.h3 = 0; p.held = null; p.heldId = null; if (p.soldier) part(o.headG, GSph, mc(0x3f4a2a), 4.6, 3.2, 4.6, -0.5, 3.9, 0);   // a soldier's helmet (js/08j)
    if (p.hardhat) { part(o.headG, GSph, mc(p.hardhat), 4.6, 2.6, 4.6, -0.2, 4.2, 0); part(o.headG, GB, mc(p.hardhat), 6.2, 0.5, 6, 0.2, 3.4, 0); }   // a site worker's hard hat (js/08zt)
    if (p.valet) { part(o.headG, GB, mc(0xb3122a), 5.6, 2.4, 6.8, -0.5, 5.3, 0); part(o.headG, GB, mc(0xffd23f), 5.7, 0.6, 6.9, -0.5, 4.4, 0); part(o.headG, GB, mc(0x111111), 2.6, 0.7, 6.2, 2.9, 4.1, 0); } }   // the valet's cap, gold band, peak
  track(p); const o = p.pm, g = p.mesh;
  if (o.umb) { const up = p.umb && !p.dead && SKY.rain > 0.25 && p.state !== 'flee'; if (o.umb.visible !== up) o.umb.visible = up; }
  const gy = groundH(p.x, p.y); p.gy = p.gy === undefined ? gy : p.gy + (gy - p.gy) * Math.min(1, dt * 12);
  g.position.set(p.x, p.gy + (p.air || 0) + (p.z || 0), p.y);       // z: a guard up a watchtower (js/08zp)
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  if (kind === 'ped' && (p.hostile || p.soldier || p.foe || p.ally || p.boxer || ((p.valet || p.post) && sp <= 8))) p.h3 = p.ang; else if (kind === 'ped' && sp > 8) p.h3 = Math.atan2(p.vy, p.vx); else if (kind !== 'ped') p.h3 = p.ang || 0;   // armed and after you: facing you (js/08g)
  g.rotation.y = -p.h3;
  if (p.dead || p.stunT > 0 || p.floor) {                          // dead, knocked down for a while by a melee hit (js/06b), or face down with the hands on the head (a hostage, js/08zzn)
    o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; for (const l of o.legs) l.rotation.z = 0; for (const a of o.arms) a.rotation.z = p.floor && !p.dead ? -2.9 : 0;
    g.scale.setScalar(p.dead ? clamp((bodyTime(p) + 1 - p.deadT) / 6, 0.01, 1) : 1);   // a body shrinks away at the end (later while an ambulance is coming)
  } else {
    const live = feat('liveWalk'), run = live ? clamp((sp - 30) / 45, 0, 1) : 0, k = Math.sin(p.bob * 3) * Math.min(1, sp / 60) * 0.8, ak = live ? 1.05 : 0.8;
    o.legs[0].rotation.z = k * (1 + 0.25 * run); o.legs[1].rotation.z = -k * (1 + 0.25 * run); o.arms[0].rotation.z = -k * ak; o.arms[1].rotation.z = k * ak;
    o.tilt.rotation.z = -0.2 * run; o.tilt.rotation.y = live ? k * 0.12 : 0;                    // liveWalk: a lean when running, a sway with each step
    for (const a of o.arms) a.rotation.x = -Math.sign(a.position.z) * 0.18 * run;              // the arms out a little when running
    o.tilt.position.y = Math.abs(k) * (0.8 + 1.2 * run);
    if (live) {                                                     // the head bobs with the step; it looks about, or glances at you close by
      p.hs = p.hs || rand(1, 20); const dP = dist(p.x, p.y, P.x, P.y);
      const look = dP < 140 && !P.dead && p.state !== 'flee' ? -clamp(angDiff(p.h3, Math.atan2(P.y - p.y, P.x - p.x)), -1, 1) : sp < 4 ? 0.75 * Math.sin(time * 0.5 + p.hs) * Math.sin(time * 0.23 + p.hs * 2) : 0.22 * Math.sin(time * 0.35 + p.hs);
      o.headG.rotation.y += (look - o.headG.rotation.y) * Math.min(1, dt * 4); o.headG.rotation.z = -Math.abs(k) * 0.1;
    } else if (o.headG.rotation.y || o.headG.rotation.z) o.headG.rotation.set(0, 0, 0);
    if (kind === 'ped' && p.state === 'flee') { o.arms[0].rotation.z = -2.4; o.arms[1].rotation.z = -2.4; }
    if (p.dance && p.state !== 'flee' && sp <= 8) {                // on THE PULSE's dance floor (js/08zu): bounce to the beat, arms up and down
      const u = time * 124 / 60 * Math.PI + (p.x + p.y) * 0.05, b = Math.abs(Math.sin(u));
      o.tilt.position.y = b * 1.6; o.tilt.rotation.z = 0.12 * Math.sin(u * 0.5); o.legs[0].rotation.z = 0.3 * Math.sin(u); o.legs[1].rotation.z = -0.3 * Math.sin(u);
      o.arms[0].rotation.z = p.dj ? -1.2 : -2.2 - 0.6 * b; o.arms[1].rotation.z = p.dj ? -1.2 + 0.3 * Math.sin(u * 2) : -1.4 + 0.9 * Math.sin(u);
    }
    if (p.valet) { const w = p.waveT > 0 && p.state !== 'flee'; o.arms[1].rotation.x = w ? -2.5 + 0.4 * Math.sin(time * 13) : 0; if (w) o.arms[1].rotation.z = 0; }   // the valet waves
    if (p.placard && p.state !== 'flee') {                          // a protester (S4): both arms up holding a placard on a stick, bobbing with the chant
      if (!o.plac) { o.plac = new THREE.Group(); part(o.plac, GB, mc(0xf4f0e0), 0.6, 7, 11, 0, 0, 0); part(o.plac, GB, mc(p.placard), 0.7, 1.8, 9, 0.05, 1, 0); part(o.plac, GB, mc(0x6a4a2a), 0.5, 9, 0.6, 0, -6, 0); o.tilt.add(o.plac); }
      const b = Math.sin(time * 4 + (p.x + p.y) * 0.03); o.plac.position.set(1, 33 + b, 0); o.plac.visible = true; o.arms[0].rotation.z = -2.9; o.arms[1].rotation.z = -2.9;
    } else if (o.plac) o.plac.visible = false;
  }
  const hid = kind === 'ped' && (p.hostile || p.soldier || p.foe || p.ally || p.boxer) && !p.dead && p.arm >= 0 ? WEAPONS[p.arm].id : null;   // the weapon out, in hand, while after you (a soldier always)
  if (p.heldId !== hid) { if (p.held) o.tilt.remove(p.held); p.held = null; p.heldId = hid; if (hid) { p.held = new THREE.Group(); p.held.add(weaponModel(hid)); p.held.position.set(5, 14, 3.6); o.tilt.add(p.held); } }
  if (p.held) {
    if (isMelee(WEAPONS[p.arm])) { const u = p.swingT > 0 ? 1 - p.swingT / 0.25 : 0; p.held.rotation.set(0, p.swingT > 0 ? lerp(1.3, -1.3, u) : 0.7, p.swingT > 0 ? lerp(0.9, 0.1, u) : 1.05); o.arms[1].rotation.z = p.swingT > 0 ? -1.4 * Math.sin(Math.PI * u) : -0.5; }
    else { p.held.rotation.set(0, 0, 0); o.arms[1].rotation.z = -1.45; }   // a gun held out at you
  }
}
const P3 = { mesh: null, pm: null, arrow: null, flash: null, yel: mc(0xffd23f), red: mc(0xff6b86), mgOn: false };
function syncPlayer(time, dt) {
  const ok = outfitKey(P.outfit); if (P3.mesh && P3.ok !== ok) { scene.remove(P3.mesh); P3.mesh = null; P3.heldId = null; }   // new clothes (js/08l): a new figure
  if (!P3.mesh) {
    const o = buildPerson('player', '#ffd23f', '#f2c6a0'); dressPerson(o, P.outfit); P3.ok = ok; P3.mesh = o.g; P3.pm = o; scene.add(o.g);
    P3.arrow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 8, 3).rotateZ(-Math.PI / 2), mBas(0xffffff)); P3.arrow.position.set(30, 5, 0); o.g.add(P3.arrow);
    P3.flash = new THREE.Mesh(GSph, mBas(0xfff0a0)); P3.flash.scale.set(4.5, 4.5, 4.5); o.g.add(P3.flash);
    P3.gy = 0; { const pg = new THREE.Mesh(GP, glowMat('#2bf3ff', 0.85)); pg.scale.set(52, 1, 52); pg.position.y = 1.4; o.g.add(pg); }
  }
  const vis = !P.car && !(P.act && P.act.occ) && state !== 'over' && !CUT.hideP; P3.mesh.visible = vis; if (!vis) return;   // CUT.hideP: on board a plane in a cutscene (js/15c)
  const o = P3.pm, gy = P.swim ? WATER_Y - 1.5 : groundH(P.x, P.y); P3.gy += (gy - P3.gy) * Math.min(1, dt * 12);
  P3.mesh.position.set(P.x, P3.gy + (P.air || 0) + (P.z || 0) - (P.ferry || P.swim ? 0 : Math.min(8, Math.max(0, -shoreDist(P.x, P.y)) * 0.32)), P.y); P3.mesh.rotation.y = -P.ang;
  const sp = Math.hypot(P.vx, P.vy), k = Math.sin(P.bob * 3) * Math.min(1, sp / 90) * 0.8, live = feat('liveWalk'), run = live ? clamp((sp - 30) / 50, 0, 1) : 0;
  o.legs[0].rotation.z = k * (1 + 0.25 * run); o.legs[1].rotation.z = -k * (1 + 0.25 * run); o.arms[0].rotation.z = -k * (live ? 0.9 : 0.5); o.arms[1].rotation.z = 0;
  o.arms[0].rotation.x = 0.18 * run; o.tilt.position.y = Math.abs(k) * (0.8 + 1.2 * run); o.tilt.rotation.y = live ? k * 0.1 : 0;
  if (live) { P3.hs = (P3.hs || 0) + dt; const look = sp < 4 && !P.swing ? 0.5 * Math.sin(P3.hs * 0.45) * Math.sin(P3.hs * 0.21 + 1) : 0; o.headG.rotation.y += (look - o.headG.rotation.y) * Math.min(1, dt * 3); o.headG.rotation.z = -Math.abs(k) * 0.1; }   // liveWalk: looking about while standing
  else if (o.headG.rotation.y || o.headG.rotation.z) o.headG.rotation.set(0, 0, 0);
  o.torso.material = P.hurtT > 0 ? P3.red : o.topMat;
  if (P.busted) { o.tilt.rotation.z = -Math.PI / 2; o.tilt.position.y = 3; } else o.tilt.rotation.z = -0.22 * run;      // knocked flat; a lean when running
  const w = WEAPONS[P.weapon];                                       // the weapon in your hand (js/11b); a melee weapon rests on the shoulder and swings
  if (P3.heldId !== w.id) {
    if (P3.held) o.tilt.remove(P3.held); P3.held = new THREE.Group(); P3.held.add(weaponModel(w.id)); P3.held.position.set(5, 14, 3.6); o.tilt.add(P3.held);
    P3.heldId = w.id; P3.gl = Math.max(4, new THREE.Box3().setFromObject(P3.held.children[0]).max.x); o.gun.visible = false;
  }
  const sw = P.swing, u = sw ? clamp(sw.t / SWING_T, 0, 1) : 0, e = u * u * (3 - 2 * u);
  if (isMelee(w)) { P3.held.rotation.set(0, sw ? lerp(1.3, -1.3, e) : 0.7, sw ? lerp(0.9, 0.1, e) : 1.05); o.arms[1].rotation.z = sw ? -1.4 * Math.sin(Math.PI * u) : -0.5; }
  else P3.held.rotation.set(0, 0, 0);
  P3.held.visible = !P.swim && !P.ferry; o.tilt.position.x = 0;
  if (P.ferry) {                                                     // seated on a bench on the ferry (js/08zp): hips on the seat, legs out, hands on the knees
    o.tilt.position.y = -5.6; o.tilt.rotation.set(0, 0, 0); o.legs[0].rotation.z = o.legs[1].rotation.z = 1.45; o.arms[0].rotation.set(0, 0, 0.7); o.arms[1].rotation.set(0, 0, 0.7);
  }
  if (P.swim && !P.ferry) {                                          // swimming (js/08zv): face down, a crawl stroke and a flutter kick
    const sp2 = Math.min(1, sp / 60), u = time * (3 + 4 * sp2);
    o.tilt.rotation.z = -1.42; o.tilt.position.set(-13, 0.5, 0); o.tilt.rotation.y = 0;
    o.arms[0].rotation.set(0, 0, sp2 > 0.1 ? u : -2.6 + 0.3 * Math.sin(u)); o.arms[1].rotation.set(0, 0, sp2 > 0.1 ? u + Math.PI : -2.6 - 0.3 * Math.sin(u));
    o.legs[0].rotation.z = 0.35 * Math.sin(u * 2); o.legs[1].rotation.z = -0.35 * Math.sin(u * 2); o.headG.rotation.set(0, 0.35 * Math.sin(u), 0);
  }
  P3.flash.visible = P.flash > 0; P3.flash.position.set(6 + P3.gl, 14, 3.6);
  flashLight.intensity = P.flash > 0 ? 1.6 : 0; flashLight.position.set(P.x + Math.cos(P.ang) * 20, P3.gy + 16, P.y + Math.sin(P.ang) * 20);
}
const PICK_COL = { health: 0xff6b86, pistol: 0x3fe0ff, mg: 0x3fe0ff, sniper: 0xffe14a, rocket: 0xff9d2b, cash: 0x58e08a };
function syncPickup(p, time) {
  if (!p.mesh) {
    const g = new THREE.Group(), it = new THREE.Group(); g.add(it);
    if (p.type === 'health') { part(it, GB, E.white, 10, 10, 10, 0, 0, 0); part(it, GB, mBas(0xe0364f), 6.5, 1.2, 2.2, 0, 5.4, 0); part(it, GB, mBas(0xe0364f), 2.2, 1.2, 6.5, 0, 5.4, 0); }
    else if (p.type === 'cash') { part(it, GB, mc(0x58b36b), 13, 3.5, 8, 0, 0, 0); part(it, GB, mc(0xd6f5dc), 9, 0.6, 5, 0, 1.9, 0); }
    else if (p.type === 'rocket') { part(it, GB, mc(0x3d4528), 18, 8, 10, 0, 0, 0); part(it, GB, mBas(0xff9d2b), 18.4, 1.6, 10.4, 0, 1, 0); part(it, GB, mBas(0xff9d2b), 2, 1, 8, -5, 4.5, 0); part(it, GB, mBas(0xff9d2b), 2, 1, 8, 5, 4.5, 0); }   // a crate with orange bands
    else if (p.type === 'sniper') { part(it, GB, mc(0x2a2410), 18, 6, 7, 0, 0, 0); part(it, GB, mBas(0xffe14a), 14, 1, 1.4, 0, 3.4, 0); }   // a long case with a yellow stripe
    else { part(it, GB, mc(0x17304a), 11, 8, 9, 0, 0, 0); for (let k = 0; k < (p.type === 'mg' ? 3 : 1); k++) part(it, GB, mBas(0x3fe0ff), 1.8, 1, 5, (p.type === 'mg' ? (k - 1) * 3 : 0), 4.4, 0); }
    if (p.drop) { g.scale.setScalar(0.7); const gl = new THREE.Mesh(GP, glowMat('#58e08a', 0.7)); gl.scale.set(34, 1, 34); gl.position.y = 1.4; g.add(gl); }   // dropped by the dead: smaller, a glow, no beam (js/08g)
    else part(g, GCyl, new THREE.MeshBasicMaterial({ color: PICK_COL[p.type] || 0x3fe0ff, transparent: true, opacity: 0.2, depthWrite: false }), 2.6, 60, 2.6, 0, 30, 0);
    g.userData.it = it; p.mesh = g; scene.add(g);
  }
  track(p); const it = p.mesh.userData.it;
  p.mesh.visible = !(p.until && p.until - gameT < 10 && Math.floor(gameT * 6) % 2);   // blinking: about to go
  p.mesh.position.set(p.x, (p.drop ? groundH(p.x, p.y) : SIDE_H) + (p.air || 0), p.y); it.position.y = (p.drop ? 8 : 11) + Math.sin(p.bob) * 2; it.rotation.y = time * 1.6;
}

