'use strict';
/* ---------- 6m. CAR DELIVERY AT THE DOCKS ----------
   The export bay on the south-east corner of the port quay (js/01j carDelivery): a board there says which car is wanted - one at a
   time, a kind and a colour from its usual paints (the vehicle table's Delivery price; never a colour only a car salon would paint).
   Coming near with a new request, you are told it. Park the wanted car in the marked bay and get out: the slewing crane on the quay
   edge lifts it - you are paid as it rises: the car's price, less for damage (js/01l Car delivery) - swings it over the little car
   carrier moored alongside and lowers it into the hold. Not while the police are after you. The next car is wanted a while later.
   While a car is wanted, more cars of that kind come in its colour, so one can be found. Not shown on the maps. */
const DLV_BAY = { x: 6860, y: 14720, hl: 48, hw: 26 }, DLV_CRANE = { x: 6965, y: 14660 }, DLV_SHIP = { x: 7045, y: 14675, L: 230, B: 56 };
const DLV_R = Math.hypot(DLV_BAY.x - DLV_CRANE.x, DLV_BAY.y - DLV_CRANE.y);
const DLV = { req: null, next: 0, done: 0, id: 0, told: -1, g: null, crane: null, st: 'idle', t: 0, car: null, th: 0, h: 60, pay: 0 };
const TH_BAY = Math.atan2(DLV_BAY.y - DLV_CRANE.y, DLV_BAY.x - DLV_CRANE.x);
const TH_HOLD = Math.atan2(Math.sqrt(Math.max(0, DLV_R * DLV_R - (DLV_SHIP.x - DLV_CRANE.x) ** 2)), DLV_SHIP.x - DLV_CRANE.x);
const COLOUR_NAMES = [['RED', '#e0364f'], ['PINK', '#ff3fb4'], ['MAGENTA', '#ff2bd6'], ['ORANGE', '#ff7a3d'], ['YELLOW', '#ffe14a'], ['GOLD', '#d4a017'], ['GREEN', '#3dffa6'],
  ['DARK GREEN', '#2f6b3a'], ['CYAN', '#2bf3ff'], ['BLUE', '#3f6bff'], ['NAVY', '#1c2a5a'], ['PURPLE', '#a259ff'], ['WHITE', '#f4f4f4'], ['SILVER', '#a8adbd'],
  ['GREY', '#5f6475'], ['BLACK', '#18181e'], ['BROWN', '#7a4a22'], ['CREAM', '#f2e6c9'], ['OLIVE', '#5b6a2e']];
function colourName(hex) {               // the nearest plain name for a paint colour
  const c = new THREE.Color(hex); let best = 'GREY', bd = 1e9;
  for (const [n, h] of COLOUR_NAMES) { const q = new THREE.Color(h), d = (c.r - q.r) ** 2 * 0.3 + (c.g - q.g) ** 2 * 0.59 + (c.b - q.b) ** 2 * 0.11; if (d < bd) { bd = d; best = n; } }
  return best;
}
const dlvTypes = () => Object.keys(CAR_TYPES).filter(k => CAR_TYPES[k].delivery > 0 && (CAR_TYPES[k].traffic > 0 || CAR_TYPES[k].parked > 0));
function newRequest() {                  // the next wanted car: a kind and one of its usual colours, not the same as the last one
  const ks = dlvTypes(); if (!ks.length) return;
  for (let tr = 0; tr < 10; tr++) {
    const type = pick(ks), color = pick(CAR_TYPES[type].colors), name = colourName(color);
    if (DLV.last && DLV.last.type === type && DLV.last.name === name && tr < 9) continue;
    DLV.req = { id: ++DLV.id, type, color, name }; break;
  }
  paintBoard();
}
const reqText = r => r.name + ' ' + CAR_TYPES[r.type].name;
const dlvMatch = c => DLV.req && c.type === DLV.req.type && colourName(c.color) === DLV.req.name;
const inBay = c => Math.abs(c.x - DLV_BAY.x) < DLV_BAY.hl + 6 && Math.abs(c.y - DLV_BAY.y) < DLV_BAY.hw + 8;
function resetDelivery(sv) {             // a new game (or a loaded one: sv, the saved state)
  dlvInit(); if (DLV.car) { DLV.car.hook = false; DLV.car = null; }
  DLV.st = 'idle'; DLV.th = TH_BAY; DLV.h = 60; DLV.told = -1; DLV.last = null; DLV.req = null; DLV.done = 0; DLV.next = 0;
  if (sv && sv.req && CAR_TYPES[sv.req.type]) { DLV.req = { id: ++DLV.id, type: sv.req.type, color: sv.req.color, name: sv.req.name || colourName(sv.req.color) }; DLV.done = sv.done || 0; }
  else if (sv) { DLV.done = sv.done || 0; DLV.next = gameT + (sv.wait || 0); }
  else newRequest();
  if (DLV.g) DLV.g.visible = feat('carDelivery');
  paintBoard();
}
const dlvSave = () => ({ req: DLV.req ? { type: DLV.req.type, color: DLV.req.color, name: DLV.req.name } : null, wait: DLV.req ? 0 : Math.max(0, DLV.next - gameT), done: DLV.done });

/* ---------- every step: the request, the hints, the crane at work ---------- */
function deliveryTick(dt) {
  if (!DLV.g || !feat('carDelivery')) return;
  if (!DLV.req && DLV.st === 'idle' && gameT >= DLV.next) newRequest();
  const near = dist(P.x, P.y, DLV_BAY.x, DLV_BAY.y);
  if (DLV.req && near < 420 && DLV.told !== DLV.req.id && !P.dead) { DLV.told = DLV.req.id; toast('WANTED AT THE DOCKS: ' + reqText(DLV.req)); }
  if (DLV.st === 'idle') {
    if (!DLV.req || P.car || P.dead || P.stars > 0 || near > 320) return;
    const c = cars.find(o => !o.dead && !o.hook && !o.driver && !o.sunk && inBay(o) && carSpeed(o) < 20 && dlvMatch(o));
    if (c) { DLV.car = c; c.hook = true; c.vx = c.vy = c.av = 0; DLV.st = 'align'; DLV.t = 0; DLV.x0 = c.x; DLV.y0 = c.y; DLV.a0 = c.ang; }
    return;
  }
  const c = DLV.car, ph = (T) => Math.min(1, (DLV.t += dt) / T), ease = u => u * u * (3 - 2 * u), toward = (a, b, u) => a + angDiff(a, b) * u;
  if (c && (c.dead || !cars.includes(c))) { if (cars.includes(c)) { c.hook = false; c.vz = 0; } DLV.car = null; DLV.st = 'up'; DLV.t = 0; }   // blown up on the hook: it drops
  const hookAt = () => { c.x = DLV_CRANE.x + Math.cos(DLV.th) * DLV_R; c.y = DLV_CRANE.y + Math.sin(DLV.th) * DLV_R; c.air = Math.max(0, DLV.h - 24); };
  if (DLV.st === 'align') {               // the dockers line it up under the hook
    const u = ease(ph(0.8)); c.x = lerp(DLV.x0, DLV_BAY.x, u); c.y = lerp(DLV.y0, DLV_BAY.y, u); c.ang = toward(DLV.a0, 0, u); DLV.th = toward(DLV.th, TH_BAY, u);
    if (u >= 1) { DLV.st = 'down'; DLV.t = 0; DLV.ang0 = c.ang; }
  } else if (DLV.st === 'down') {         // the hook comes down onto it
    DLV.h = lerp(60, 24, ease(ph(1.8))); if (DLV.t >= 1.8) { DLV.st = 'lift'; DLV.t = 0; payDelivery(c); }
  } else if (DLV.st === 'lift') { DLV.h = lerp(24, 74, ease(ph(2.2))); hookAt(); if (DLV.t >= 2.2) { DLV.st = 'swing'; DLV.t = 0; } }
  else if (DLV.st === 'swing') {          // over the ship, turning with the jib
    const u = ease(ph(3)); DLV.th = TH_BAY + angDiff(TH_BAY, TH_HOLD) * u; hookAt(); c.ang = DLV.ang0 + angDiff(TH_BAY, TH_HOLD) * u;
    if (DLV.t >= 3) { DLV.st = 'lower'; DLV.t = 0; }
  } else if (DLV.st === 'lower') {        // into the hold
    DLV.h = lerp(74, 30, ease(ph(2))); hookAt();
    if (DLV.t >= 2) { const k = cars.indexOf(c); if (k >= 0) cars.splice(k, 1); DLV.car = null; DLV.st = 'up'; DLV.t = 0; Snd.thud(80); }
  } else if (DLV.st === 'up') { DLV.h = lerp(DLV.h, 60, ph(1.5)); if (DLV.t >= 1.5) { DLV.st = 'back'; DLV.t = 0; DLV.thB = DLV.th; } }
  else if (DLV.st === 'back') { DLV.th = DLV.thB + angDiff(DLV.thB, TH_BAY) * ease(ph(2.5)); if (DLV.t >= 2.5) DLV.st = 'idle'; }
}
function payDelivery(c) {                // paid as it rises: the car's price, less for damage; the next car is wanted later
  const t = c.t, f = clamp(c.hp / c.maxhp, 0, 1), pay = Math.round(t.delivery * (1 - PLC.deliveryDamage * (1 - f)));
  addScore(pay, c.x, c.y, 'DELIVERED'); toast('DELIVERED: ' + reqText(DLV.req) + ' ' + money(pay)); Snd.tone(880, 1320, 0.1, 0.14, 'square');
  DLV.last = DLV.req; DLV.req = null; DLV.done++; DLV.next = gameT + PLC.deliveryNext; paintBoard();
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
function deliveryHint() {                // js/14: what to do at the bay
  if (!DLV.g || !feat('carDelivery') || dist(P.x, P.y, DLV_BAY.x, DLV_BAY.y) > 260) return '';
  if (DLV.st !== 'idle') return DLV.car ? 'THE CRANE LOADS IT ON THE SHIP' : '';
  if (!DLV.req) return 'NOTHING WANTED - COME BACK LATER';
  const c = P.car || cars.find(o => !o.dead && !o.driver && inBay(o));
  if (!c || !inBay(c)) return P.car && dlvMatch(P.car) ? 'PARK IT IN THE EXPORT BAY' : '';
  if (!dlvMatch(c)) return 'NOT THE WANTED CAR - THEY WANT A ' + reqText(DLV.req);
  if (P.stars > 0) return 'LOSE THE POLICE FIRST';
  return P.car ? 'GET OUT - THE CRANE TAKES IT' : '';
}
function deliveryBias(type) {            // js/05 makeCar: a car of the wanted kind comes in the wanted colour now and then
  return DLV.req && type === DLV.req.type && feat('carDelivery') && Math.random() < PLC.deliveryBias ? DLV.req.color : null;
}

/* ---------- the bay, the board, the crane and the little car carrier: built once, they stay ---------- */
function dlvInit() {
  if (DLV.g || !PORTM) return;
  const g = new THREE.Group(); DLV.g = g; scene.add(g);
  const box = (col, sx, sy, sz, x, y, z, basic) => { const m = new THREE.Mesh(GB, basic ? mBas(col) : mc(col)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
  const B = DLV_BAY;                                                // the bay: yellow lines and EXPORT painted on the quay
  for (const s of [-1, 1]) { box('#ffd23f', B.hl * 2, 0.5, 2.4, B.x, 0.8, B.y + s * B.hw, true); box('#ffd23f', 2.4, 0.5, B.hw * 2, B.x + s * B.hl, 0.8, B.y, true); }
  const txt = signMesh('EXPORT', '#ffd23f', 60, 12); txt.rotation.x = -Math.PI / 2; txt.position.set(B.x, 0.9, B.y); txt.material.transparent = true; txt.material.opacity = 0.75; g.add(txt);
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 320; DLV.bc = bc; DLV.btex = new THREE.CanvasTexture(bc);   // the board
  const board = new THREE.Mesh(new THREE.PlaneGeometry(72, 45), new THREE.MeshBasicMaterial({ map: DLV.btex, side: THREE.DoubleSide }));
  const bx = B.x - 70, by = B.y - 64; board.position.set(bx, 48, by); board.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180) * 0.6; g.add(board);
  for (const s of [-1, 1]) box('#2b2e38', 2.4, 30, 2.4, bx + s * 30, 15, by);
  makeSolid(bx - 30, by, 6, 6, 0, {}); makeSolid(bx + 30, by, 6, 6, 0, {});
  const C = DLV_CRANE, cr = new THREE.Group(); cr.position.set(C.x, 0, C.y); g.add(cr);   // the crane: a pedestal, the slewing house, the jib
  const pm = (col, sx, sy, sz, x, y, z, par) => { const m = new THREE.Mesh(GB, mc(col)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); (par || cr).add(m); return m; };
  const ped = new THREE.Mesh(GCyl, mc('#ffb02e')); ped.scale.set(9, 36, 9); ped.position.y = 18; cr.add(ped);
  const sl = new THREE.Group(); sl.position.y = 36; cr.add(sl); DLV.sl = sl;
  pm('#ffb02e', 26, 16, 20, -2, 8, 0, sl); pm('#2b2e38', 12, 14, 18, -18, 7, 0, sl); pm('#1d2740', 1, 7, 12, 11.2, 10, 0, sl);   // cab, counterweight, window
  const tipY = 42, L = Math.hypot(DLV_R - 8, tipY - 10), a = Math.atan2(tipY - 10, DLV_R - 8);
  for (const z of [-3, 3]) { const j = pm('#ffb02e', L, 2.6, 2.6, (8 + DLV_R) / 2, (10 + tipY) / 2, z, sl); j.rotation.z = a; }
  pm('#ffb02e', 6, 6, 9, DLV_R, tipY, 0, sl);
  DLV.cable = pm('#14141a', 0.9, 1, 0.9, DLV_R, 0, 0, sl); DLV.hook = pm('#ffd23f', 6, 4, 6, DLV_R, 0, 0, sl);
  DLV.frame = pm('#3a3f4a', 40, 1.6, 24, DLV_R, 0, 0, sl);             // the lifting frame over the car
  DLV.tipY = tipY + 36;
  makeSolid(C.x, C.y, 20, 20, 0, {});
  const S = DLV_SHIP, sh = new THREE.Group(); sh.position.set(S.x, 0, S.y); g.add(sh);   // the car carrier: bow north, the bridge forward, the hold aft
  const sm = (col, sx, sy, sz, x, y, z) => pm(col, sx, sy, sz, x, y, z, sh);
  sm('#7a1f1f', S.B, 34, S.L, 0, 3, 0); sm('#8a2a2a', S.B + 0.6, 6, S.L + 0.6, 0, -11, 0); sm('#4a4e5c', S.B - 4, 0.6, S.L - 6, 0, 20.4, 0);
  sm('#f2f2f4', S.B - 10, 30, 40, 0, 36, -S.L / 2 + 34); sm('#1d2740', S.B - 9, 4, 1, 0, 44, -S.L / 2 + 13.6); sm('#2f6fd6', 10, 14, 10, 0, 58, -S.L / 2 + 30);
  sm('#0c0d14', S.B - 16, 1, 120, 0, 20.8, 40); for (const x of [-S.B / 2 + 6, S.B / 2 - 6]) sm('#ffd23f', 2, 4, 124, x, 22, 40);   // the hold, its coaming
  for (let k = 0; k < 2; k++) sm(pick(['#e0364f', '#2bf3ff', '#a259ff', '#3dffa6']), 22, 14, 44, (k ? 1 : -1) * 13, 28, 46 + k * 30);   // cars already aboard
  const nm = signMesh('ROLLING STAR', '#ffffff', 60, 11); nm.position.set(S.B / 2 + 0.8, 10, 0); nm.rotation.y = Math.PI / 2; sh.add(nm);
  g.visible = feat('carDelivery'); paintBoard();
}
function paintBoard() {                  // WANTED: the kind, its colour (a swatch and the name), what it pays
  if (!DLV.bc) return;
  const g = DLV.bc.getContext('2d'), W = 512, H = 320;
  g.fillStyle = '#0b0a18'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 54px "Arial Black",Impact,sans-serif';
  if (DLV.req) {
    const r = DLV.req, t = CAR_TYPES[r.type];
    g.fillStyle = '#ffd23f'; g.fillText('WANTED', W / 2, 62);
    g.fillStyle = '#ffffff'; g.font = 'bold 50px "Arial Black",Impact,sans-serif'; g.fillText(t.name, W / 2, 132);
    g.fillStyle = r.color; g.fillRect(70, 172, 90, 60); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(70, 172, 90, 60);
    g.textAlign = 'left'; g.font = 'bold 46px "Arial Black",Impact,sans-serif'; g.fillStyle = r.color; g.fillText(r.name, 182, 204);
    g.textAlign = 'center'; g.font = 'bold 32px Arial'; g.fillStyle = '#3dffa6'; g.fillText('PAYS UP TO ' + money(t.delivery), W / 2, 272);
  } else { g.fillStyle = '#ffd23f'; g.fillText('NOTHING', W / 2, 110); g.fillText('WANTED', W / 2, 172); g.font = 'bold 30px Arial'; g.fillStyle = '#ffffff'; g.fillText('COME BACK LATER', W / 2, 250); }
  DLV.btex.needsUpdate = true;
}
function gfxDelivery() {                 // js/13: the jib turned, the hook and cable at their height
  if (!DLV.g) return;
  DLV.g.visible = feat('carDelivery'); if (!DLV.g.visible) return;
  DLV.sl.rotation.y = -DLV.th;
  const hy = DLV.h - 36, top = DLV.tipY - 36, len = Math.max(1, top - hy);   // in the slewing house's frame (it sits 36 up)
  DLV.cable.scale.y = len; DLV.cable.position.y = hy + len / 2; DLV.hook.position.y = hy + 2; DLV.frame.position.y = hy - 1;
  DLV.frame.rotation.y = DLV.car ? -(DLV.car.ang - DLV.th) : 0;
}
