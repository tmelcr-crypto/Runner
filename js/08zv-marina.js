'use strict';
/* ---------- 6zv. SUNSET HARBOR and the boats (map remodel 16: MAP.marina; boats: the vehicles table's boat bodies, js/01c) ----------
   Boats are vehicles that stay on the water: they drive like cars with little grip (they slide through turns), water drag slows them
   when you let go, and the shore and the piers push them back (a hard hit damages them). A wrecked boat burns and sinks.
   (Work in progress: the marina's moored boats, the shop, boat traffic, swimming and the police boat come next.) */
const MARINA = MAP.marina || null;
const SWIM_IN = 18, SWIM_OUT = 12;                                    // deeper than this you swim; shallower again, you wade out

/* ---------- swimming (modes: swim) ---------- */
function swimCheck() {                     // js/06 on foot: in deep water you swim (under the bridges too: their decks are water for a swimmer)
  if (!feat('swim')) { P.swim = false; return; }
  P.swim = P.swim ? boatDist(P.x, P.y) < -SWIM_OUT : shoreDist(P.x, P.y) < -SWIM_IN;
}
function drownTick(dt) {                   // js/06 in a car gone into the water: get out before it is under
  const c = P.car; if (!c || !P.drown) return;
  const was = Math.ceil(P.drown); P.drown = Math.max(0, P.drown - dt);
  if (Math.ceil(P.drown) !== was && P.drown > 0) { toast('THE CAR IS SINKING - GET OUT! ' + Math.ceil(P.drown), true); Snd.tone(330, 220, 0.08, 0.1, 'square'); }
  if (P.drown <= 0) { P.drown = 0; c.driver = null; $('wasted').textContent = 'DROWNED'; killPlayer(); }
}
function boatWreck(c) {                   // js/07: a boat that has burned out does not blow up: a burning wreck, and you go over the side
  c.burn = 0; c.dead = true; c.deadT = 0; c.hp = 0; c.wreckT = 0; c.wreckFire = true;
  if (P.car === c) { exitCar(true); splashFx(P.x, P.y, 14); toast('OVER THE SIDE - SWIM!', true); }
  if (c.byPlayer && c.t.cop) { addScore(ECO.copCarBoom, c.x, c.y, 'COP ' + c.t.name); reportCrime(COP.crime.copCarBoom, COP.blastHear, undefined, undefined, true); }
  else if (c.byPlayer) addScore(ECO.carBoom, c.x, c.y, 'WRECKED');
  c.vx *= 0.4; c.vy *= 0.4; c.driver = null; Snd.thud(140);
}
function ferryBox() {                    // the Iron Key ferry as a box: centre, axes, half length and width, velocity (js/08zp)
  if (!PRZ || !feat('prison') || !PRI.route) return null;
  const F = FERRY, ca = Math.cos(F.ang), sa = Math.sin(F.ang), v = F.state === 'sail' ? F.v * (F.end ? -1 : 1) : 0;
  return { x: F.x, y: F.y, ca, sa, L: PRZ.ferry.len / 2, W: PRZ.ferry.wid / 2, vx: ca * v, vy: sa * v };
}
function pushOffFerry(o, r, B) {          // o {x, y, vx, vy} as a circle of radius r: out of the ferry's box; returns the impact speed
  const dx = o.x - B.x, dy = o.y - B.y, lx = dx * B.ca + dy * B.sa, ly = -dx * B.sa + dy * B.ca;
  const px = B.L + r - Math.abs(lx), py = B.W + r - Math.abs(ly); if (px <= 0 || py <= 0) return 0;
  const n = px < py ? [B.ca * Math.sign(lx || 1), B.sa * Math.sign(lx || 1)] : [-B.sa * Math.sign(ly || 1), B.ca * Math.sign(ly || 1)], pen = Math.min(px, py);
  o.x += n[0] * pen; o.y += n[1] * pen;
  const vn = ((o.vx || 0) - B.vx) * n[0] + ((o.vy || 0) - B.vy) * n[1];
  if (vn < 0 && o.vx !== undefined) { o.vx -= 1.3 * vn * n[0]; o.vy -= 1.3 * vn * n[1]; }
  return Math.max(0, -vn);
}
function boatFerry(c) {                   // js/07: a boat cannot pass through the ferry - it is pushed off and bumps
  const B = ferryBox(); if (!B || c.sunk || Math.abs(c.x - B.x) > B.L + 80 || Math.abs(c.y - B.y) > B.L + 80) return;
  for (const q of carCircles(c)) {
    const o = { x: q[0], y: q[1], vx: c.vx, vy: c.vy }, imp = pushOffFerry(o, q[2], B); if (o.x === q[0] && o.y === q[1]) continue;
    c.x += o.x - q[0]; c.y += o.y - q[1]; c.vx = o.vx; c.vy = o.vy;
    if (imp > 140 && c.hitCd <= 0) { c.hitCd = 0.25; damageCar(c, (imp - 140) * 0.12, false); splashFx(q[0], q[1], 6); if (P.car === c) { cam.shake = Math.max(cam.shake, 6); Snd.thud(imp); } }
  }
}
function boatSpray(c, dt) {               // js/07: at speed the bow throws water up and aside, more the faster it goes and the harder it turns (js/01l In the water; the wake: js/12)
  if (!feat('boatWake') || PLC.spray <= 0 || c.dead || c.sunk || c.beached || c.under || c.air > 0) return;
  const spd = carSpeed(c); if (spd < PLC.sprayFrom || dist(c.x, c.y, cam.x, cam.y) > 1600) return;
  const f = Math.min(1, (spd - PLC.sprayFrom) / Math.max(1, c.t.max - PLC.sprayFrom)), turn = Math.min(1, Math.abs(c.av) * 0.6), ca = Math.cos(c.ang), sa = Math.sin(c.ang), L = c.t.len;
  c.sprayN = (c.sprayN || 0) + dt * PLC.spray * (12 + 50 * f + 40 * turn) * Math.sqrt(c.t.wid / 29);
  while (c.sprayN >= 1) {
    c.sprayN--; const s = Math.random() < 0.5 ? -1 : 1, u = rand(0.6, 0.8) - 0.5, w = c.t.wid * 0.5 * rand(0.6, 0.9), out = rand(40, 120) * (0.5 + f), fwd = spd * rand(0.3, 0.7);
    addP({ x: c.x + ca * u * L - sa * s * w, y: c.y + sa * u * L + ca * s * w, z: rand(3, 6), vz: rand(40, 100) * (0.6 + 0.6 * f), grav: 300, vx: -sa * s * out + ca * fwd, vy: ca * s * out + sa * fwd,
      life: rand(0.35, 0.6), max: 0.6, s0: rand(1.3, 2.3) * (0.7 + 0.5 * f), s1: 0.6, col: pick(['#ffffff', '#e6f6ff', '#bfe6ff']), drag: 2.5, alpha: 0.85 });
  }
}
function boatShore(c) {                   // js/07 after collideCarWorld: a boat is held on the water; a hard knock against the shore hurts it
  if (c.sunk) return;
  if (c.dead) {                                                       // wrecked: it burns a while, then goes under (you are thrown in the water)
    c.wreckT = (c.wreckT || 0) + 1 / 60;
    if (c.wreckFire && Math.random() < 0.6) { const o = rand(-0.4, 0.4) * c.t.len; fireFx(c.x + Math.cos(c.ang) * o, c.y + Math.sin(c.ang) * o, 1.3); if (Math.random() < 0.4) smokeFx(c.x, c.y, true, 1.4); }
    if (c.wreckT > 5) { c.sunk = true; c.sinkT = 0; c.burn = 0; splashFx(c.x, c.y, 30); if (P.car === c) exitCar(true); c.driver = null; }
    return;
  }
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), m = c.t.wid * 0.45 + 2;
  c.under = shoreDist(c.x, c.y) > -m * 0.5;                           // under a bridge: drawn low, out of sight below the deck (js/11)
  for (const k of [0, 0.42, -0.42]) {                                 // its middle, bow and stern
    const x = c.x + fx * c.t.len * k, y = c.y + fy * c.t.len * k, sd = boatDist(x, y);   // the bridges' decks count as water: under them (js/04)
    if (sd > 60) { c.beached = true; continue; }                      // well up on land (dropped there): it does not move
    if (sd <= -m) continue;
    const g = boatGrad(x, y), pen = sd + m, vin = c.vx * g[0] + c.vy * g[1];
    c.x -= g[0] * pen; c.y -= g[1] * pen;
    if (vin > 0) { c.vx -= vin * g[0] * 1.4; c.vy -= vin * g[1] * 1.4; if (vin > 140 && c.hitCd <= 0) { c.hitCd = 0.2; damageCar(c, (vin - 140) * 0.12, false); splashFx(x, y, 6); } }
  }
}

/* the maps (js/14): an anchor at Sunset Harbor (on its sunset orange) and at the end of each jetty (on blue) */
function anchorIcon(g, x, y, q, bg) {
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = bg; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.1, q * 0.2); g.beginPath();
  g.arc(x, y - q * 0.58, q * 0.16, 0, TAU); g.moveTo(x, y - q * 0.42); g.lineTo(x, y + q * 0.62);
  g.moveTo(x - q * 0.36, y - q * 0.2); g.lineTo(x + q * 0.36, y - q * 0.2);
  g.moveTo(x - q * 0.62, y + q * 0.08); g.quadraticCurveTo(x - q * 0.5, y + q * 0.62, x, y + q * 0.62); g.quadraticCurveTo(x + q * 0.5, y + q * 0.62, x + q * 0.62, y + q * 0.08); g.stroke();
}
function marinaIcons(g, X, Y, q, inView) {
  if (!feat('marina')) return;
  if (MARINA) { const x = X(MARINA.door[0] + 60), y = Y(MARINA.door[1]); if (inView(x, y)) anchorIcon(g, x, y, q, '#ff7a3d'); }
  for (const j of MAP.jetties || []) { const a = j.a * Math.PI / 180, x = X(j.x + Math.cos(a) * j.len), y = Y(j.y + Math.sin(a) * j.len); if (inView(x, y)) anchorIcon(g, x, y, q * 0.8, '#2f6bff'); }
}

/* ---------- the harbour (modes: marina): moored boats and their owners, your berths, the boat shop ---------- */
const marinaOn = () => !!MARINA && feat('marina');
const MB = { boats: [], moored: [], away: true, groveAway: true, lost: new Set(), told: 0, copT: 0 };   // boats: yours [{type, color, berth}]; moored: [{c, i, post}] while you are about
const SHOP_BOATS = ['speedboat', 'jetski', 'yacht'];
const MCX = () => MARINA ? [(MARINA.office[0] + MARINA.piers[0][2]) / 2, MARINA.office[1]] : [0, 0];
function berthSpot(i) {                   // where a boat lies: berth i along its pier, bow out to sea; -1: the yacht's spot off the middle pier's head
  if (i < 0) return [MARINA.yacht[0], MARINA.yacht[1], 0];
  const [bx, by] = MARINA.berths[i]; return [bx, by, 0];
}
function berthBoat(i, type, color) { const [x, y, a] = berthSpot(i); const c = makeCar(type, x, y, a, null, color); c.berth = i; cars.push(c); return c; }
function marinaPosts() {                  // js/10x genMarina: an owner on the pier by every other moored boat
  if (!MARINA) return;
  MARINA.berths.forEach(([bx, by, side, k], i) => {
    if (MARINA.own.includes(i) || i % 2) return;
    const p = MARINA.piers[k], y = side < 0 ? p[1] + 3 : p[3] - 3;
    addPost({ x: bx + 10, y, a: side < 0 ? -Math.PI / 2 : Math.PI / 2, kind: 'boatOwner', back: 300, step: standStep,
      need: () => marinaOn() && MB.moored.some(m => m.i === i && cars.includes(m.c) && !m.c.dead),
      make: po => { const q = makePed(po.x, po.y); Object.assign(q, { arm: -1, umb: false, speed: 0, state: 'post', boatOwner: i, shirt: pick(['#f4f4f6', '#ffd23f', '#6fdcff', '#ff7a3d']), pants: pick(['#f4efe6', '#2a4a8a']) }); return q; } });
  });
}
function marinaReset() { MB.boats = []; MB.moored = []; MB.away = MB.groveAway = true; MB.lost.clear(); MB.copT = 0; if (MARINA) warnOff('marina'); }
function marinaSave() { return { boats: MB.boats.map(b => ({ type: b.type, color: b.color, berth: b.berth })) }; }
function marinaLoad(s) {
  MB.boats = [];
  if (!MARINA || !s || !Array.isArray(s.boats)) return;
  for (const b of s.boats) if (b && SHOP_BOATS.includes(b.type) && MARINA.own.includes(b.berth) && !MB.boats.some(o => o.berth === b.berth)) MB.boats.push({ type: b.type, color: typeof b.color === 'string' ? b.color : CAR_TYPES[b.type].colors[0], berth: b.berth });
}
function marinaTick(dt) {                 // js/15 every frame
  if (!marinaOn()) return;
  const [mx, my] = MCX(), d = dist(P.x, P.y, mx, my);
  if (d > 2600) { MB.away = true; MB.moored = MB.moored.filter(m => cars.includes(m.c)); }
  if (d < 1700) {
    if (MB.away) {                                                   // back at the harbour: the moored boats are in again
      MB.away = false; MB.moored = MB.moored.filter(m => cars.includes(m.c));
      const free = MARINA.berths.map((b, i) => i).filter(i => !MARINA.own.includes(i) && !MB.moored.some(m => m.i === i) && !cars.some(c => c.t.boat && dist(c.x, c.y, MARINA.berths[i][0], MARINA.berths[i][1]) < 40));   // not where a boat already lies (a mission's, js/08zy)
      const n = Math.max(0, Math.round(PLC.moored) - MB.moored.length);
      if (n > 0 && !MB.moored.some(m => m.i < 0)) { MB.moored.push({ c: berthBoat(-1, 'yacht'), i: -1 }); }
      for (const i of free.slice(0, Math.max(0, n - 1))) MB.moored.push({ c: berthBoat(i, i % 3 === 2 ? 'jetski' : 'speedboat'), i });
    }
    for (const b of MB.boats) if (!cars.some(c => c.mine === b)) { const c = berthBoat(b.berth, b.type, b.color); c.mine = b; c.searched = true; c.free = true; }   // yours, back at your berth
  }
  for (const m of MB.moored) if (!m.mad && m.c.driver === 'player') {   // the owner sees you take it
    m.mad = true; const po = POSTS.find(o => o.kind === 'boatOwner' && o.ped && o.ped.boatOwner === m.i), q = po && po.ped;
    if (q && !q.dead && dist(q.x, q.y, m.c.x, m.c.y) < 400) { q.post = null; popup(q.x, q.y - 20, 'HEY! MY BOAT!', '#ff7a3d'); if (!provoke(q)) { q.state = 'flee'; q.fl = 5; q.fx = q.x - P.x; q.fy = q.y - P.y; } }
  }
  for (const c of cars) if (c.mine && (c.dead || c.sunk) && !MB.lost.has(c)) {   // yours wrecked: gone for good
    MB.lost.add(c); const i = MB.boats.indexOf(c.mine); if (i >= 0) { MB.boats.splice(i, 1); toast('YOUR ' + c.t.name + ' IS LOST', true); }
  }
  groveBoats(); boatTraffic(dt); policeBoat(dt);
  if (P.swim && !P.ferry) { const B = ferryBox(); if (B) pushOffFerry(P, 7, B); }   // a swimmer is pushed aside by the ferry too
}
function groveBoats() {                   // the boats tied up at the grove's pier by the lunapark car park (js/10m): real ones while you are near
  if (!GROVE || !feat('groveBoats')) return;
  const g = MAP.lunapark.grove.pier, d = dist(P.x, P.y, (g[0] + g[2]) / 2, (g[1] + g[3]) / 2);
  if (d > 2600) MB.groveAway = true;
  if (d > 1700 || MB.groveAway === false) return;
  MB.groveAway = false;
  for (const b of GROVE.boats) { const type = { speed: 'speedboat', fish: 'fishboat', yacht: 'yacht' }[b.k]; if (type && !cars.some(c => c.grove === b)) { const c = makeCar(type, b.x, b.y, b.a, null); c.grove = b; cars.push(c); } }
}

/* the boat shop at the harbour office's door */
function boatKey() { return marinaOn() && !P.car && !P.dead && !P.act && state === 'play' && dist(P.x, P.y, MARINA.door[0] + 16, MARINA.door[1]) < 30 && !(nearestCar() || {}).ms ? 'shop' : null; }   // a mission's boat in reach (js/08zy): E gets you in it instead
function boatUi() {                       // every frame (js/14): the button by you
  const b = $('boatBtn'); if (!b) return;
  if (!boatKey()) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden) { b.hidden = false; b.querySelector('b').textContent = 'BOAT SHOP'; }
  doorBtnAt(b);
}
function openBoatShop() {
  state = 'marina'; toggleBigMap(false); toggleWheel(false); hush(); $('boatBtn').hidden = true; $('bsMsg').textContent = ''; $('bsMsg').className = 'warn';
  paintBoatShop(); showCard('boatCard', true);
}
function closeBoatShop() { if (state !== 'marina') return; closeMenus(); state = 'play'; }
function paintBoatShop() {
  const freeB = MARINA.own.filter(i => !MB.boats.some(b => b.berth === i));
  $('bsCash').textContent = 'YOUR CASH ' + money(P.score) + ' · YOUR BERTHS ' + MB.boats.length + '/' + MARINA.own.length;
  $('bsList').innerHTML = SHOP_BOATS.map(id => { const t = CAR_TYPES[id], own = MB.boats.filter(b => b.type === id).length;
    return '<div class="bsRow"><span><b>' + t.name + '</b><small>' + Math.round(t.max / KMH) + ' KM/H' + (own ? ' · YOU HAVE ' + own : '') + '</small></span><button type="button" data-b="' + id + '"' + (P.score < t.price || !freeB.length ? ' disabled' : '') + '>BUY ' + money(t.price) + '</button></div>'; }).join('');
  for (const btn of $('bsList').querySelectorAll('button')) btn.addEventListener('click', () => buyBoat(btn.dataset.b));
  $('bsOwn').textContent = MB.boats.length ? 'AT YOUR BERTHS: ' + MB.boats.map(b => CAR_TYPES[b.type].name).join(', ') : 'YOURS WAIT AT YOUR BERTHS (THE YELLOW LINES), UP TO THREE';
}
function marinaGive(id, color) {          // STORY: a boat given to you (Q01: Marco's speedboat) - at your first free berth, there when you are next by the harbour
  const i = MARINA ? MARINA.own.find(k => !MB.boats.some(b => b.berth === k)) : undefined; if (i === undefined) return false;
  MB.boats.push({ type: id, color: color || CAR_TYPES[id].colors[0], berth: i });
  for (const c of cars.filter(c => c.berth === i && !c.mine && c.driver !== 'player')) cars.splice(cars.indexOf(c), 1);   // anything lying in your berth is moved off
  return true;
}
function buyBoat(id) {
  const t = CAR_TYPES[id], i = MARINA.own.find(k => !MB.boats.some(b => b.berth === k));
  if (i === undefined) { $('bsMsg').textContent = 'YOUR BERTHS ARE FULL'; return; }
  if (P.score < t.price) { $('bsMsg').textContent = 'NOT ENOUGH CASH'; return; }
  P.score -= t.price; const b = { type: id, color: pick(t.colors), berth: i }; MB.boats.push(b);
  for (const c of cars.filter(c => c.berth === i && !c.mine && c.driver !== 'player')) cars.splice(cars.indexOf(c), 1);   // anything lying in your berth is moved off
  const c = berthBoat(i, id, b.color); c.mine = b; c.searched = true; c.free = true;
  $('bsMsg').textContent = 'YOUR ' + t.name + ' IS AT BERTH ' + (MARINA.own.indexOf(i) + 1); $('bsMsg').className = 'warn ok'; Snd.tone(660, 990, 0.08, 0.12, 'square');
  paintBoatShop();
}

/* ---------- out on the water: speedboats and jet skis round the bay, fishing boats off the port, the tour boat round Iron Key ---------- */
function boatTraffic(dt) {
  for (let k = cars.length - 1; k >= 0; k--) if (cars[k].gone && P.car !== cars[k]) cars.splice(k, 1);
  if ((MB.trafT = (MB.trafT || 0) - dt) > 0) return; MB.trafT = 1;
  const R = MARINA.routes, want = { bay: Math.round(PLC.boatsOut), docks: Math.round(PLC.fishBoats), tour: PLC.tourBoat ? 1 : 0 };
  for (const k of ['bay', 'docks', 'tour']) {
    const pts = R[k]; if (!pts || !want[k]) continue;
    let near = 1e9; for (const q of pts) near = Math.min(near, dist(q[0], q[1], P.x, P.y)); if (near > 2000) continue;
    let n = 0; for (const c of cars) if (c.boatAI === k && !c.dead && c.driver === 'ai') n++;
    if (n >= want[k]) continue;
    const ok = pts.map((q, i) => i).filter(i => { const d = dist(pts[i][0], pts[i][1], P.x, P.y); return d > 800 && d < 2000 && !cars.some(c => dist(c.x, c.y, pts[i][0], pts[i][1]) < 150); });
    if (!ok.length) continue;
    const i = pick(ok), dir = Math.random() < 0.5 ? 1 : -1, j = (i + dir + pts.length) % pts.length;
    const type = k === 'docks' ? 'fishboat' : k === 'tour' ? 'tourboat' : Math.random() < 0.35 ? 'jetski' : 'speedboat';
    const c = makeCar(type, pts[i][0], pts[i][1], Math.atan2(pts[j][1] - pts[i][1], pts[j][0] - pts[i][0]), 'ai'); c.boatAI = k; c.wi = j; c.dir = dir;
    c.cruise = (type === 'fishboat' ? rand(14, 20) : type === 'tourboat' ? 16 : type === 'jetski' ? rand(45, 65) : rand(35, 60)) * KMH; c.searched = Math.random() < 0.5;
    cars.push(c);
  }
}
function boatDrive(c, dt) {               // js/07 for a boat with a computer at the helm
  if (c.gone) { c.thr = 0; return; }
  if (c.boatAI === 'police' && c.driver === 'cop') { copBoatDrive(c, dt); return; }
  const pts = MARINA.routes[c.boatAI] || MARINA.routes.bay, n = pts.length;
  if (c.wi === undefined || c.wi >= n) { c.wi = 0; c.dir = 1; c.cruise = c.cruise || 30 * KMH; }
  const lane = (k, j) => { const a = pts[k], b = pts[(k + j + n) % n], L = dist(a[0], a[1], b[0], b[1]) || 1; return [a[0] - (b[1] - a[1]) / L * 45, a[1] + (b[0] - a[0]) / L * 45]; };   // keep to starboard: the loop run 45 to your right
  let q = lane(c.wi, c.dir); if (dist(c.x, c.y, q[0], q[1]) < 140) { c.wi = (c.wi + c.dir + n) % n; q = lane(c.wi, c.dir); }
  let want = Math.atan2(q[1] - c.y, q[0] - c.x), cruise = c.cruise;
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
  const obst = [];                                                  // what is in the way: boats (a moored or empty one stands still), the ferry along its length
  for (const o of cars) if (o !== c && !o.sunk && o.t.boat && Math.abs(o.x - c.x) < 260 && Math.abs(o.y - c.y) < 260) obst.push([o.x, o.y, o.t.wid, carSpeed(o) > 10 * KMH]);
  const B = ferryBox(); if (B && Math.abs(B.x - c.x) < B.L + 300 && Math.abs(B.y - c.y) < B.L + 300) for (let k = -1; k <= 1; k += 0.5) obst.push([B.x + B.ca * B.L * k, B.y + B.sa * B.L * k, B.W * 2, FERRY.state === 'sail']);
  for (const [ox, oy, ow, moving] of obst) {                        // ease off; pass a moving one to starboard (both turn right), steer away from one standing still
    const dx = ox - c.x, dy = oy - c.y, ah = dx * fx + dy * fy, sd = -dx * fy + dy * fx;
    if (ah > -10 && ah < 90 + c.t.len + carSpeed(c) * 0.6 && Math.abs(sd) < (c.t.wid + ow) * 0.6 + 24) { cruise *= 0.35; want += moving ? 0.7 : sd > 0 ? -0.9 : 0.9; }
  }
  if (P.swim) { const dx = P.x - c.x, dy = P.y - c.y, ah = dx * fx + dy * fy; if (ah > 0 && ah < 160 && Math.abs(-dx * fy + dy * fx) < c.t.wid * 0.6 + 20) cruise *= 0.2; }   // a swimmer ahead
  const spd = carSpeed(c), look = 50 + spd * 0.9, hx = c.x + fx * look, hy = c.y + fy * look;
  if (boatDist(hx, hy) > -70) { const g = boatGrad(hx, hy), away = Math.atan2(-g[1], -g[0]); want = away + clamp(angDiff(away, want), -1.2, 1.2); cruise *= 0.5; }   // the shore ahead: turn off it
  c.str = clamp(angDiff(c.ang, want) * 2.2, -1, 1); c.thr = spd < cruise ? 1 : spd > cruise * 1.2 ? -0.6 : 0.01; c.hb = false;
  if (c.backT > 0) { c.backT -= dt; c.thr = -1; c.str = c.backS; return; }   // stuck: astern a moment, swinging the bow away
  c.stuckT = spd < 6 * KMH && c.thr > 0.5 ? (c.stuckT || 0) + dt : 0;
  if (c.stuckT > 1.5) {
    c.stuckT = 0; c.stuckN = (c.stuckN || 0) + 1;
    if (c.stuckN > 3 && dist(c.x, c.y, P.x, P.y) > 700) { c.gone = true; return; }   // hopeless and out of sight: taken away (boatTraffic)
    c.backT = 1.6; c.backS = c.str >= 0 ? -1 : 1; c.wi = (c.wi + c.dir + pts.length) % pts.length;
  }
}

/* ---------- the police boat: on the water and wanted enough, it comes for you; the helicopter's light shows it where you are ---------- */
const onWater = () => P.swim || (P.car && P.car.t.boat);
function policeBoat(dt) {
  const cop = cars.find(c => c.boatAI === 'police' && c.driver === 'cop' && !c.dead);
  if (P.stars < PLC.boatPolice || P.dead) { if (cop) { cop.driver = 'ai'; cop.boatAI = 'bay'; cop.wi = undefined; } return; }
  if (cop || !onWater() || (MB.copT -= dt) > 0) return;
  MB.copT = 6;
  for (let k = 0; k < 24; k++) {                                     // out of sight on open water a way off
    const a = rand(0, TAU), r = rand(900, 1400), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (boatDist(x, y) > -90) continue;
    const c = makeCar('policeboat', x, y, Math.atan2(P.y - y, P.x - x), 'cop'); c.boatAI = 'police'; c.boatCrime = { cool: 2 }; cars.push(c);
    toast('POLICE BOAT!', true); return;
  }
}
function copBoatDrive(c, dt) {
  const tgt = P.car || P, seen = PS.seen;                         // what the police know - the helicopter's light among them (js/08u)
  const tx = seen ? tgt.x + (tgt.vx || 0) * 0.5 : PS.lx, ty = seen ? tgt.y + (tgt.vy || 0) * 0.5 : PS.ly, d = dist(c.x, c.y, tgt.x, tgt.y);
  c.str = clamp(angDiff(c.ang, Math.atan2(ty - c.y, tx - c.x)) * 2.4, -1, 1); c.hb = false;
  c.thr = !onWater() && d < 200 ? 0.01 : 1;                         // you are ashore: it waits off the shore
  const K = c.boatCrime; if ((K.cool -= dt) > 0 || P.dead || d > COP.fireRange || !shotClear(c.x, c.y, tgt.x, tgt.y)) return;
  K.cool = rand(0.8, 1.5); const a = Math.atan2(tgt.y - c.y, tgt.x - c.x);   // the cop on deck fires at you
  tracers.push({ x1: c.x + Math.cos(a) * 16, y1: c.y + Math.sin(a) * 16, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: 0.07 });
  Snd.tone(900, 200, 0.05, 0.06, 'square');
  if (Math.random() < lerp(COP.accNear, COP.accFar, clamp(d / COP.fireRange, 0, 1)) * 0.8) { if (P.car) damageCar(P.car, COP.dmgCar, false); else damagePlayer(COP.dmgFoot); }
}
$('boatBtn').addEventListener('click', e => { e.stopPropagation(); if (boatKey()) openBoatShop(); });
