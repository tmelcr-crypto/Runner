'use strict';
/* ---------- 6c9. THE PORT: CARGO SHIPS AND GANTRY CRANES ----------
   (js/01j ships, js/01l) Five berths along the straight quays of the port (MAP.port): three on the east quay, two on the south. Three
   or four ships lie moored; about every two minutes one moves - one at a time: a ship comes up from the sea, swings round and is pushed
   sideways onto a free berth; or one is pushed off and sails away to the south. Two gantry cranes work each berth: while a ship lies
   there they roll to it and lift containers between ship and quay. Ships are solid and nothing hurts them; bullets and rockets stop
   at their hulls. With the feature off the ships stay moored and the cranes still. */
let SHIPS = [], CRANES = [], shipNext = 0, shipLast = 'dep';
const SHIP_L = 720, SHIP_B = 120, SHIP_CRAB = 1.6 * MPS;
function shipCircles(sh) {                                        // the hull as circles along its length
  const ca = Math.cos(sh.ang), sa = Math.sin(sh.ang), out = sh.cc || (sh.cc = []); out.length = 0;
  for (let x = -SHIP_L / 2 + 50; x <= SHIP_L / 2 - 30; x += 70) out.push([sh.x + ca * x, sh.y + sa * x, SHIP_B / 2 + 4]);
  return out;
}
const BERTH_ANG = b => b.q === 'e' ? Math.PI / 2 : Math.PI;       // moored: bow south on the east quay, bow west on the south quay
function shipLegs(bi, arrive) {
  const P2 = PORTM, b = P2.berths[bi], sea = P2.sea, [lS, lN] = P2.lanes.e, ly = P2.lanes.s, a = BERTH_ANG(b), v = PLC.shipSpeed;
  const sail = (pts, o) => leg('sail', pts, 270, Object.assign({ vmax: v, acc: 0.25 * MPS, dec: 0.3 * MPS, endV: 0 }, o));
  const crab = (from, to) => Object.assign(leg('crab', [from, to], 0, { vmax: SHIP_CRAB, acc: 0.2 * MPS, dec: 0.2 * MPS, endV: 0, wait: 2 }), { heading: a });
  if (b.q === 'e') {
    const apex = Math.max(b.y - 500, 12350);
    return arrive ? [sail([[lN, sea], [lN, apex], [lS, apex], [lS, b.y]], { v0: v }), crab([lS, b.y], [b.x, b.y])]
                  : [crab([b.x, b.y], [lS, b.y]), sail([[lS, b.y], [lS, sea]], { endV: v, wait: 2 })];
  }
  return arrive ? [sail([[b.x + 1400, sea], [b.x + 1400, ly], [b.x, ly]], { v0: v }), crab([b.x, ly], [b.x, b.y])]
                : [crab([b.x, b.y], [b.x, ly]), sail([[b.x, ly], [b.x - 1400, ly], [b.x - 1400, sea]], { endV: v, wait: 2 })];
}
function newShip(x, y, ang, bi) {
  const sh = { x, y, ang, v: 0, berth: bi, mode: 'moored', legs: null, li: 0, s: 0, wait: 0, mesh: null, seed: randi(1, 1e6) };
  sh.t = addTarget({ x, y, reach: SHIP_L / 2 + 20, hp: Infinity, circles: () => shipCircles(sh) });
  SHIPS.push(sh); return sh;
}
function dropShip(sh) { if (sh.mesh) { scene.remove(sh.mesh); sh.mesh.traverse(m => { if (m.geometry && !SHARED_GEO.has(m.geometry)) m.geometry.dispose(); }); } const i = TARGETS.indexOf(sh.t); if (i >= 0) TARGETS.splice(i, 1); SHIPS.splice(SHIPS.indexOf(sh), 1); }
function resetShips() {                                           // a new game: three or four moored, the cranes at rest
  for (const sh of SHIPS.slice()) dropShip(sh); SHIPS = [];
  if (!PORTM) return;
  const n = randi(Math.min(PLC.shipsMin, PLC.shipsMax), Math.max(PLC.shipsMin, PLC.shipsMax)), free = PORTM.berths.map((b, i) => i);
  for (let k = 0; k < Math.min(n, free.length); k++) { const bi = free.splice(randi(0, free.length - 1), 1)[0], b = PORTM.berths[bi]; newShip(b.x, b.y, BERTH_ANG(b), bi); }
  for (const c of CRANES) { c.pos = c.home; c.t = rand(0, 20); }
  shipNext = gameT + Math.min(20, PLC.shipEvery * 0.2); shipLast = Math.random() < 0.5 ? 'arr' : 'dep';
}
function shipStart() {
  const moored = SHIPS.filter(s => s.mode === 'moored'), free = PORTM.berths.map((b, i) => i).filter(i => !SHIPS.some(s => s.berth === i));
  let kind = moored.length < PLC.shipsMin ? 'arr' : moored.length > PLC.shipsMax ? 'dep' : shipLast === 'arr' ? 'dep' : 'arr';
  if (kind === 'arr' && !free.length) kind = 'dep'; if (kind === 'dep' && !moored.length) kind = 'arr';
  if (kind === 'arr' && !free.length) { shipNext = gameT + 10; return; }
  let sh;
  if (kind === 'arr') { const bi = pick(free); sh = newShip(0, PORTM.sea, -Math.PI / 2, bi); sh.legs = shipLegs(bi, true); }
  else { sh = pick(moored); sh.legs = shipLegs(sh.berth, false); }
  sh.mode = 'move'; sh.li = 0; shipLeg(sh); shipLast = kind; shipNext = gameT + PLC.shipEvery;
}
function shipLeg(sh) { const L = sh.legs[sh.li]; sh.s = 0; sh.wait = L.wait; if (L.v0 !== undefined) sh.v = L.v0; const q = legAt(L, 0); sh.x = q.x; sh.y = q.y; if (L.heading === undefined) sh.ang = q.ang; }
function moveShip(sh, dt) {
  const L = sh.legs[sh.li]; if (sh.wait > 0) { sh.wait -= dt; return; }
  let q = legAt(L, sh.s); const vt = Math.min(L.vmax, Math.max(L.endV > 0 ? 0 : 3, q.cap));
  sh.v = sh.v < vt ? Math.min(vt, sh.v + L.acc * dt) : Math.max(vt, sh.v - L.dec * dt);
  sh.s = Math.min(L.path.len, sh.s + sh.v * dt); q = legAt(L, sh.s); sh.x = q.x; sh.y = q.y;
  sh.ang += angDiff(sh.ang, L.heading !== undefined ? L.heading : q.ang) * Math.min(1, dt * 1.5);
  if (sh.s >= L.path.len - 0.5) {
    if (++sh.li < sh.legs.length) shipLeg(sh);
    else if (sh.legs[0].kind === 'crab') { dropShip(sh); return; }   // gone out to sea
    else { const b = PORTM.berths[sh.berth]; sh.mode = 'moored'; sh.legs = null; sh.v = 0; sh.x = b.x; sh.y = b.y; sh.ang = BERTH_ANG(b); }
  }
  if (sh.mode === 'move' && sh.legs && sh.legs[0].kind === 'crab' && sh.li === 1) sh.berth = -1;   // left the berth: a new ship may take it
}
function shipContacts(sh) {                                       // solid: pushes people and cars aside
  const cc = shipCircles(sh), R = SHIP_L / 2 + 70;
  const push = (o, r) => { if (Math.abs(o.x - sh.x) > R || Math.abs(o.y - sh.y) > R) return; for (const k of cc) { const dx = o.x - k[0], dy = o.y - k[1], d = Math.hypot(dx, dy); if (d < k[2] + r && d > 0.01) { o.x += dx / d * (k[2] + r - d); o.y += dy / d * (k[2] + r - d); } } };
  for (const p of peds) if (!p.dead) push(p, 7);
  if (!P.car && !P.dead) push(P, 7);
  for (const c of cars) if (!c.sunk) push(c, c.t.wid / 2);
}
function updateShips(dt) {                                        // js/15, in the physics steps
  if (!PORTM) return;
  for (const sh of SHIPS.slice()) { if (sh.mode === 'move') moveShip(sh, dt); if (SHIPS.includes(sh)) { sh.t.x = sh.x; sh.t.y = sh.y; shipContacts(sh); } }
  for (const c of CRANES) craneContacts(c);
}
function shipsTick(dt) {                                          // js/15, once a frame: the next movement, the cranes' work
  if (!PORTM) return;
  for (const c of CRANES) craneStep(c, dt);
  if (!feat('ships') || gameT < shipNext || SHIPS.some(s => s.mode === 'move')) return;
  shipStart();
}

/* ---------- the gantry cranes ---------- */
function genCranes() {                                            // js/10g genPlaces: two per berth, on rails along the quay
  CRANES = []; if (!PORTM) return;
  for (const c of PORTM.cranes) CRANES.push({ berth: c.berth, x: c.x, y: c.y, a: c.a * Math.PI / 180, home: c.q === undefined ? (c.a ? c.x : c.y) : 0, pos: c.a ? c.x : c.y, lo: c.lo, hi: c.hi, t: 0, mesh: null, along: c.a ? 'x' : 'y', side: (c.a ? c.x : c.y) < (c.a ? PORTM.berths[c.berth].x : PORTM.berths[c.berth].y) ? -1 : 1 });
  for (const c of CRANES) c.home = c.pos;
}
const craneAt = c => c.along === 'x' ? [c.pos, c.y] : [c.x, c.pos];
function craneLegs(c) { const [x, y] = craneAt(c), ca = Math.cos(c.a), sa = Math.sin(c.a), out = []; for (const lx of [-80, 80]) for (const lz of [-46, 46]) out.push([x + ca * lx - sa * lz, y + sa * lx + ca * lz, 7]); return out; }
function craneContacts(c) {
  const [x, y] = craneAt(c), legs = craneLegs(c);
  const push = (o, r) => { if (Math.abs(o.x - x) > 140 || Math.abs(o.y - y) > 140) return; for (const k of legs) { const dx = o.x - k[0], dy = o.y - k[1], d = Math.hypot(dx, dy); if (d < k[2] + r && d > 0.01) { o.x += dx / d * (k[2] + r - d); o.y += dy / d * (k[2] + r - d); } } };
  for (const p of peds) if (!p.dead) push(p, 7);
  if (!P.car && !P.dead) push(P, 7);
  for (const q of cars) for (const cc of carCircles(q)) { const o = { x: cc[0], y: cc[1] }; push(o, cc[2]); if (o.x !== cc[0] || o.y !== cc[1]) { q.x += o.x - cc[0]; q.y += o.y - cc[1]; q.vx *= 0.5; q.vy *= 0.5; break; } }
}
function craneStep(c, dt) {                                       // to its place at a moored ship, then the lifting cycle; back home when the berth is empty
  const sh = SHIPS.find(s => s.berth === c.berth && s.mode === 'moored'), work = !!sh && feat('ships');
  const b = PORTM.berths[c.berth], centre = c.along === 'x' ? b.x : b.y, want = work ? centre + c.side * 170 : c.home;
  const d = want - c.pos; c.pos += Math.sign(d) * Math.min(Math.abs(d), 0.6 * MPS * dt);
  c.working = work && Math.abs(d) < 1; if (c.working) c.t += dt;
}
function makeCraneModel(col) {                                    // the frame: four legs on the rails, the cross beams, the boom out over the water, the machine house
  const T = new GeoBuilder(), G = new GeoBuilder(), k = _C(col), dk = _C('#2b2e38'), H = 190, steel = _C('#cfd3dd');
  for (const lx of [-80, 80]) for (const lz of [-46, 46]) { box5(T, lx - 4, 0, lz - 4, lx + 4, H, lz + 4, k); box5(T, lx - 7, 0, lz - 10, lx + 7, 8, lz + 10, dk); }
  for (const lz of [-46, 46]) { box5(T, -84, H - 14, lz - 4, 84, H, lz + 4, k); beam(T, [-80, 40, lz], [80, H - 20, lz], 2, k); }
  for (const lx of [-80, 80]) { box5(T, lx - 4, H - 14, -50, lx + 4, H, 50, k); box5(T, lx - 3, 50, -46, lx + 3, 58, 46, k); }
  box5(T, -170, H, -10, 380, H + 12, 10, k); box5(T, -150, H + 12, -24, -60, H + 46, 24, _C('#f4f4f4'));   // the boom, the machine house
  beam(T, [-40, H + 60, 0], [380, H + 12, 0], 1.4, steel); beam(T, [-40, H + 60, 0], [-170, H + 12, 0], 1.4, steel); box5(T, -44, H + 12, -6, -36, H + 64, 6, k);
  box5(G, 376, H + 12, -3, 382, H + 16, 3, _C('#ff3b5c')); box5(G, -42, H + 64, -2, -38, H + 68, 2, _C('#ff3b5c'));
  const m = new THREE.Mesh(mergeBuilders([T, G]), LM_MAT); m.userData.own = [];
  const trolley = new THREE.Group(); trolley.position.y = H; m.add(trolley);
  const tb = new THREE.Mesh(GB, mc('#3a3f5c')); tb.scale.set(24, 10, 26); tb.position.y = -6; trolley.add(tb);
  const hook = new THREE.Group(); trolley.add(hook);
  const ropes = new THREE.Mesh(GB, mc('#1c1c22')); ropes.scale.set(1, 1, 1); trolley.add(ropes);
  const spreader = new THREE.Mesh(GB, mc('#ffd23f')); spreader.scale.set(76, 4, 31); hook.add(spreader);
  const box = new THREE.Mesh(GB, mc(pick(BOXC))); box.scale.set(73, 31, 29); box.position.y = -18; hook.add(box);
  m.userData.parts = { trolley, hook, ropes, box, H };
  return m;
}
function gfxPort(time) {                                          // js/13: ships and cranes near the camera get meshes, far ones lose them
  if (!PORTM) return;
  const near = (x, y, r) => Math.abs(x - cam.x) < 2600 + r && Math.abs(y - cam.y) < 2600 + r;
  for (const sh of SHIPS) {
    if (!near(sh.x, sh.y, SHIP_L)) { if (sh.mesh) { scene.remove(sh.mesh); sh.mesh.traverse(m => { if (m.geometry && !SHARED_GEO.has(m.geometry)) m.geometry.dispose(); }); sh.mesh = null; } continue; }
    if (!sh.mesh) { sh.mesh = withSeed(sh.seed, makeShip); scene.add(sh.mesh); }
    sh.mesh.position.set(sh.x, WATER_Y + 1, sh.y); sh.mesh.rotation.set(0, -sh.ang, Math.sin(time * 0.6 + sh.seed) * 0.006);
    if (sh.mode === 'move' && sh.v > 5 && Math.random() < 0.5) { const ca = Math.cos(sh.ang), sa = Math.sin(sh.ang); addP({ x: sh.x - ca * SHIP_L / 2 + rand(-20, 20), y: sh.y - sa * SHIP_L / 2 + rand(-20, 20), z: 1, vz: 0, grav: 0, vx: rand(-10, 10), vy: rand(-10, 10), life: 2.4, max: 2.4, s0: 10, s1: 34, col: '#dff3ff', drag: 1, alpha: 0.5 }); }   // the wake
  }
  for (const c of CRANES) {
    const [x, y] = craneAt(c);
    if (!near(x, y, 400)) { if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; } continue; }
    if (!c.mesh) { c.mesh = makeCraneModel(['#2f6fd6', '#e0364f', '#ffb02e'][c.berth % 3]); scene.add(c.mesh); }
    c.mesh.position.set(x, 0, y); c.mesh.rotation.y = -c.a;
    const { trolley, hook, ropes, box, H } = c.mesh.userData.parts, sea = 202, land = -40, cyc = PLC.craneCycle, u = c.working ? (c.t % cyc) / cyc : 0;
    // the cycle: out over the ship, down, up, back over the quay, down, up (unloading); every other cycle loading
    const ph = u * 6, f = ph % 1, ease = t => t * t * (3 - 2 * t), unload = Math.floor(c.t / cyc) % 2 === 0, low = 40, top = H - 30;
    let tx, hy, carry;
    if (ph < 1) { tx = lerp(land, sea, ease(f)); hy = top; carry = !unload; }
    else if (ph < 2) { tx = sea; hy = lerp(top, low, ease(f)); carry = !unload; }
    else if (ph < 3) { tx = sea; hy = lerp(low, top, ease(f)); carry = unload; }
    else if (ph < 4) { tx = lerp(sea, land, ease(f)); hy = top; carry = unload; }
    else if (ph < 5) { tx = land; hy = lerp(top, low - 26, ease(f)); carry = unload; }
    else { tx = land; hy = lerp(low - 26, top, ease(f)); carry = !unload; }
    if (!c.working) { tx = land; hy = top; carry = false; }
    trolley.position.x = tx; hook.position.y = hy - H; box.visible = carry;
    ropes.scale.set(1, H - hy, 1); ropes.position.y = (hy - H) / 2;
  }
}
function makeShip() {                                             // a container ship: the hull, the bow, the white superstructure aft, containers on deck
  const T = new GeoBuilder(), G = new GeoBuilder(), Lh = SHIP_L / 2, B = SHIP_B / 2, hull = _C(pick(['#1c2a4a', '#7a1f1f', '#1c1c22', '#1f4a3a', '#2a4aa8'])), anti = _C('#8a2a2a'), deck = _C('#4a4e5c');
  box5(T, -Lh, -10, -B, Lh - 70, 30, B, hull); box5(T, -Lh, -10, -B - 0.4, Lh - 70, 0, B + 0.4, anti);
  face(T, [[Lh - 70, -10, -B], [Lh, 0, 0], [Lh, 34, 0], [Lh - 70, 30, -B]], [0.6, 0, -0.8], hull); face(T, [[Lh - 70, -10, B], [Lh - 70, 30, B], [Lh, 34, 0], [Lh, 0, 0]], [0.6, 0, 0.8], hull);
  T.tri([Lh - 70, 30, -B], [Lh, 34, 0], [Lh - 70, 30, B], [0, 1, 0], deck); flat(T, -Lh, -B, Lh - 70, B, 30.2, deck);
  const sx0 = -Lh + 10, sx1 = -Lh + 80, white = _C('#f2f2f4');                  // the accommodation block and bridge
  box5(T, sx0, 30, -B + 6, sx1, 118, B - 6, white); box5(T, sx1 - 18, 110, -B - 6, sx1, 124, B + 6, white);
  for (let y = 44; y < 112; y += 16) face(G, [[sx1 + 0.3, y, -B + 12], [sx1 + 0.3, y, B - 12], [sx1 + 0.3, y + 6, B - 12], [sx1 + 0.3, y + 6, -B + 12]], [1, 0, 0], _C('#ffe9b0'));
  box5(T, sx0 + 10, 118, -14, sx0 + 34, 150, 14, _C(pick(['#e0364f', '#ffb02e', '#2f6fd6']))); box5(T, sx0 + 10, 150, -15, sx0 + 34, 156, 15, _C('#1c1c22'));
  const cL = 73, cW = 29, cH = 31;                                 // containers: bays along the deck, three rows across, one to three high
  for (let x = sx1 + 16; x + cL < Lh - 80; x += cL + 4) for (let j = -1; j <= 1; j++) { const n = randi(1, 3); for (let l = 0; l < n; l++) box5(T, x, 30.5 + l * (cH + 0.4), j * (cW + 2) - cW / 2, x + cL, 30.5 + l * (cH + 0.4) + cH, j * (cW + 2) + cW / 2, _C(pick(BOXC))); }
  box5(G, Lh - 4, 36, -2, Lh, 40, 2, _C('#3dffa6')); box5(G, sx0 + 20, 156, -2, sx0 + 24, 162, 2, _C('#ff3b5c'));
  const m = lmMesh(T, G);
  return withSign(m, pick(['BAY STAR', 'NEON TRADER', 'CORAL EXPRESS', 'PELICAN', 'MARLIN', 'SEA RUNNER']), '#ffffff', 80, 14, sx1 - 10, 136, B + 8);
}
function shipIcons(g, X, Y, k, inView) {                          // js/14: the ships on the maps
  g.fillStyle = '#d8dcea';
  for (const sh of SHIPS) { const x = X(sh.x), y = Y(sh.y); if (!inView(x, y)) continue; const L = Math.max(8, SHIP_L * k), B = Math.max(3, SHIP_B * k); g.save(); g.translate(x, y); g.rotate(sh.ang); g.beginPath(); g.moveTo(L / 2, 0); g.lineTo(L / 2 - B, -B / 2); g.lineTo(-L / 2, -B / 2); g.lineTo(-L / 2, B / 2); g.lineTo(L / 2 - B, B / 2); g.closePath(); g.fill(); g.restore(); }
}
