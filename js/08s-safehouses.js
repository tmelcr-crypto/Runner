'use strict';
/* ---------- 6s. SAFEHOUSES ----------
   Ten places to own (safehouse table, js/01q; where they are and how they look: js/10l). The Colony room is yours from the start; the
   others carry a FOR SALE sign and a white house on the maps - walk up to the door and BUY. Yours show a green house.
   Towers: at the door you go in, and the side-on view (js/08t) shows the building inside. Houses: the doors open for you, the roof
   turns see-through inside. Inside: SLEEP (a slot save, full health and armour, morning or evening), the WARDROBE (any clothes you
   own) and the weapon STASH (shared by every safehouse; busted or wasted, what is in it stays). Garages and reserved spaces keep
   your cars: leave one standing in a garage bay or a painted space and it is there next time, with its colour and its damage.
   Going in unseen loses the police (up to the table's stars). Mode: safehouses. */
const SAFEST = { stash: {}, at: null, ret: 'play', warnT: 0, sleeping: null, slotRet: null, kept: null };
const safeOn = () => feat('safehouses');

function safeReset() {                    // js/15 resetGame: only what the table gives you free; nothing stashed, no cars kept
  for (const h of SAFES) {
    h.own = h.price <= 0; h.keep = h.spots.map(() => null); h.live = h.spots.map(() => null); h.wasIn = false;
    for (const d of h.doors) { d.open = 0; if (d.ds) d.ds.off = false; }
  }
  SAFEST.stash = {}; SAFEST.at = null; SAFEST.sleeping = null; SAFEST.slotRet = null; SAFEST.kept = null;
  safeMarkers(); $('sleepFx').hidden = true; $('safeBtn').hidden = true;
}
const safeHome = () => SAFES.find(h => h.id === 'colony' && h.own) || SAFES.find(h => h.own && h.kind === 'tower');
function safeStart() {                    // a new game starts at the Colony's door, a car waiting in its space (js/15)
  const h = safeOn() && safeHome(); if (!h) return null;
  return { x: h.door.x + h.door.fx * 10, y: h.door.y + h.door.fy * 10, ang: Math.atan2(h.door.fy, h.door.fx), h };
}

/* ---------- at a door, at the bed, the wardrobe, the safe ---------- */
function safeKey() {                      // what E does here: { h, k: buy | in | sleep | wardrobe | stash } or null
  if (!safeOn() || P.car || P.dead || P.act || RAMP.on || state !== 'play') return null;
  for (const h of SAFES) {
    if (dist(h.door.x, h.door.y, P.x, P.y) < 20 && (!h.own || !h.site)) {
      const c = nearestCar(); if (c && dist(c.x, c.y, P.x, P.y) < dist(h.door.x, h.door.y, P.x, P.y)) return null;
      return { h, k: h.own ? 'in' : 'buy' };
    }
    if (h.own && h.site && dist(h.site.cx, h.site.cy, P.x, P.y) < 300) { let best = null, bd = 22; for (const u of h.uses) { const d = dist(u.x, u.y, P.x, P.y); if (d < bd) { bd = d; best = u; } } if (best) return { h, k: best.k }; }
  }
  return null;
}
const SAFE_GO = { buy: 'BUY', in: 'GO IN', sleep: 'SLEEP', wardrobe: 'WARDROBE', stash: 'STASH' };
function safeUi() {                       // every frame (js/14): the button by you
  const s = safeKey(), b = $('safeBtn');
  if (!s) { if (!b.hidden) b.hidden = true; return; }
  const key = s.h.id + s.k;
  if (b.hidden || b.dataset.s !== key) { b.hidden = false; b.dataset.s = key; b.style.setProperty('--sc', s.h.own ? '#3dffa6' : '#f4f4f6'); b.querySelector('b').textContent = s.k === 'buy' ? s.h.name + ' · ' + money(s.h.price) : s.h.name; b.querySelector('.go').textContent = SAFE_GO[s.k]; }
  doorBtnAt(b);
}
$('safeBtn').addEventListener('click', e => { e.stopPropagation(); const s = safeKey(); if (s) safeUse(s); });
function safeUse(s) {
  if (s.k === 'buy') openBuy(s.h);
  else if (s.k === 'in') goInTower(s.h);
  else safeAction(s.k, s.h);
}
function safeLosePolice(h) {              // going in: unseen, they lose you (the message, for the side-on view)
  if (P.stars <= 0 || !feat('police')) return '';
  if (!PS.seen && P.stars <= SAFE.loseUpTo) { clearWanted('SAFE INSIDE - THEY LOST YOU'); return 'SAFE INSIDE - THEY LOST YOU'; }
  const m = PS.seen ? 'THEY SAW YOU GO IN' : 'STILL WANTED'; toast(m, true); return m;
}
const safeSay = t => SV.on ? svToast(t) : toast(t);
function goInTower(h) { $('safeBtn').hidden = true; const m = safeLosePolice(h); P.vx = P.vy = 0; openSide(h); if (m) svToast(m); }
function safeLeft(h) { if (!saveBlock()) putSave('auto', makeSave(lastThumb)); }   // js/08t closeSide: out in the street again
function safeAction(k, h) {               // js/08t (in a tower) or E inside a house
  SAFEST.ret = state === 'side' ? 'side' : 'play';
  if (k === 'sleep') safeSleep(h);
  else if (k === 'wardrobe') openClothes({ id: 'home', home: true, name: 'WARDROBE', color: '#3dffa6', where: h.name, theme: 'WHAT YOU OWN: PUT IT ON FOR FREE' });
  else if (k === 'stash') openStash(h);
}

/* ---------- buying: a card with a picture of the place ---------- */
const buyCv = document.createElement('canvas'); buyCv.width = 360; buyCv.height = 200;
function openBuy(h) {
  SAFEST.at = h; SAFEST.ret = 'play'; state = 'safe'; toggleBigMap(false); toggleWheel(false); hush(); $('safeBtn').hidden = true;
  $('sfName').textContent = h.name; $('sfSub').textContent = h.where + '  ·  YOUR CASH ' + money(P.score);
  $('sfPrice').textContent = money(h.price); $('sfCars').textContent = h.cars ? h.cars + (h.site ? ' IN THE GARAGE' : ' RESERVED SPACE' + (h.cars > 1 ? 'S' : '')) : 'NONE';
  $('sfIn').textContent = h.site ? (h.kind === 'boat' ? 'A CABIN ON THE WATER' : 'A HOUSE, ONE FLOOR') : 'FLOOR ' + h.home + ' OF ' + h.floors;
  $('sfNote').textContent = h.note || ''; $('sfMsg').textContent = ''; $('sfBuy').textContent = 'BUY ' + money(h.price);
  $('sfPic').removeAttribute('src');
  snapReq.push(() => { try { const g = buyCv.getContext('2d'), W = cv.width, H = cv.height, sh = Math.min(H, W / 1.8), sw = sh * 1.8; g.drawImage(cv, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 360, 200); $('sfPic').src = buyCv.toDataURL('image/jpeg', 0.8); } catch (e) { } });
  showCard('safeCard', true); Snd.tone(523, 659, 0.12, 0.1, 'square');
}
function buySafe() {
  const h = SAFEST.at; if (!h || state !== 'safe') return;
  if (P.score < h.price) { $('sfMsg').textContent = 'NOT ENOUGH CASH - ' + money(h.price - P.score) + ' SHORT'; Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
  P.score -= h.price; h.own = true; closeSafeCard();
  toast(h.name + ' IS YOURS' + (h.cars ? ' · ' + (h.site ? 'GARAGE FOR ' + h.cars : h.cars + ' RESERVED SPACE' + (h.cars > 1 ? 'S' : '')) : ''));
  Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.1, 0.12, 'square'), 110);
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
function closeSafeCard() {                // NOT NOW, Esc, E (also the stash's DONE)
  if (state !== 'safe') return;
  const was = curCard(); state = SAFEST.ret; SAFEST.at = null; closeMenus();
  if (was === 'stashCard' && !saveBlock()) putSave('auto', makeSave(lastThumb));
}
$('sfBuy').addEventListener('click', buySafe);

/* ---------- the weapon stash: tap a weapon to put it away, or to take it ---------- */
function openStash(h) {
  state = 'safe'; $('stName').textContent = h.name; $('stMsg').textContent = ''; showCard('stashCard', true); paintStash();
}
function paintStash() {
  const row = (w, txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'stRow'; b.style.setProperty('--wc', w.color);
    b.innerHTML = '<i></i><b></b><small></small>'; b.querySelector('b').textContent = w.name; b.querySelector('small').textContent = txt; b.addEventListener('click', fn); return b; };
  const ammo = (w, n) => w.mag || w.maxAmmo ? n + ' ROUNDS' : isThrown(w) ? n + ' LEFT' : '';
  const on = $('stOn'), inn = $('stIn'); on.innerHTML = ''; inn.innerHTML = '';
  WEAPONS.forEach((w, i) => { if (P.has[i] && !w.start) on.appendChild(row(w, ammo(w, P.mag[i] + P.ammo[i]), () => stashPut(i))); });
  for (const id in SAFEST.stash) { const i = WEAPONS.findIndex(w => w.id === id); if (i >= 0) { const s = SAFEST.stash[id]; inn.appendChild(row(WEAPONS[i], ammo(WEAPONS[i], s[0] + s[1]), () => stashTake(i))); } }
  if (!on.children.length) on.innerHTML = '<p class="small">NOTHING TO PUT AWAY</p>';
  if (!inn.children.length) inn.innerHTML = '<p class="small">EMPTY</p>';
}
function stashPut(i) {
  const w = WEAPONS[i], s = SAFEST.stash[w.id] || [0, 0];
  SAFEST.stash[w.id] = [s[0] + P.mag[i], s[1] + P.ammo[i]]; P.has[i] = false; P.mag[i] = 0; P.ammo[i] = 0;
  if (P.weapon === i) { P.weapon = Math.max(0, P.has.indexOf(true)); P.swing = null; }
  $('stMsg').textContent = w.name + ' PUT AWAY'; Snd.tone(300, 220, 0.08, 0.1, 'square'); paintStash();
}
function stashTake(i) {
  const w = WEAPONS[i], s = SAFEST.stash[w.id]; if (!s) return;
  const tot = s[0] + s[1] + (P.has[i] ? P.mag[i] + P.ammo[i] : 0);
  P.has[i] = true; P.mag[i] = Math.min(w.mag || 0, tot); P.ammo[i] = tot - P.mag[i]; delete SAFEST.stash[w.id];
  $('stMsg').textContent = 'TAKEN: ' + w.name; Snd.tone(600, 900, 0.06, 0.1, 'square'); paintStash();
}

/* ---------- sleep: the night (or the day) goes by, then a save slot ---------- */
const sleepTo = hr => hr >= SAFE.wakeEvening || hr < SAFE.wakeMorning ? SAFE.wakeMorning : SAFE.wakeEvening;   // at night you wake in the morning, by day in the evening
function safeSleep(h) {
  const why = saveBlock(); if (why) { safeSay(why === 'LOSE THE POLICE FIRST' ? 'NO SLEEP WITH THE POLICE AFTER YOU' : why); return; }
  if (SV.on) lastThumb = svThumb(); else snapReq.push(t => { lastThumb = t; });
  SAFEST.sleeping = { h, t: 0, from: SKY.hour, to: sleepTo(SKY.hour) }; state = 'sleep'; toggleBigMap(false); toggleWheel(false); hush(); $('safeBtn').hidden = true;
  $('sleepFx').hidden = false; $('sleepFx').style.opacity = '0'; Snd.tone(392, 262, 0.4, 0.08, 'sine');
}
function sleepTick(dt) {                  // js/15 frame while state is sleep: fade out, the clock runs on, fade in, then the save slots
  const S = SAFEST.sleeping; if (!S) return;
  S.t += dt; const T = 2.6, k = clamp(S.t / T, 0, 1), span = (S.to - S.from + 24) % 24 || 24;
  $('sleepFx').style.opacity = String(Math.min(1, S.t * 3, (T + 0.4 - S.t) * 3));
  $('sleepClock').textContent = hhmm((S.from + span * clamp((S.t - 0.3) / (T - 0.8), 0, 1)) % 24);
  if (S.t < T + 0.4) return;
  SAFEST.sleeping = null; $('sleepFx').hidden = true;
  SKY.hour = S.to; P.boostH = Math.max(0, (P.boostH || 0) - span); P.hp = Math.max(P.hp, hpMax()); P.armor = Math.max(P.armor, armorMax()); P.hurtT = 0;
  SAFEST.slotRet = SAFEST.ret; state = 'sleep'; openSlots('save');
  $('slotMsg').textContent = (S.to === SAFE.wakeMorning ? 'GOOD MORNING' : 'GOOD EVENING') + ' - PICK A SLOT TO SAVE IN, OR GO BACK';
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
function closeSleepSave() {               // the slot card's BACK after sleeping: on with the game
  const r = SAFEST.slotRet || 'play'; SAFEST.slotRet = null; closeMenus(); state = r;
  safeSay(hhmm(SKY.hour) + ' - RESTED');
}

/* ---------- houses: the doors open for you, the roof fades while you are inside ---------- */
const _shq = {};
function doorBusy(h, d) {                 // something standing in the doorway: the door waits
  const lim = (x, y, r) => { pnsLocal(h.site, x, y, _shq); const a = d.ax === 'x' ? _shq.x - d.x : _shq.z - d.z, b = d.ax === 'x' ? _shq.z - d.z : _shq.x - d.x; return Math.abs(a) < d.w / 2 + r && Math.abs(b) < 3 + r; };
  for (const c of cars) { if (dist(c.x, c.y, d.wx, d.wy) > 120) continue; for (const q of carCircles(c)) if (lim(q[0], q[1], q[2])) return true; }
  for (const list of [peds, officers]) for (const p of list) if (!p.dead && dist(p.x, p.y, d.wx, d.wy) < 60 && lim(p.x, p.y, 8)) return true;
  return !P.car && !P.dead && lim(P.x, P.y, 8);
}
function safeTick(dt) {                   // js/15 update: the doors, coming in, the cars kept
  if (!SAFES.length) return;
  const on = safeOn() && !P.dead, me = P.car || P;
  for (const h of SAFES) {
    if (!h.site) continue;
    const near = dist(h.site.cx, h.site.cy, me.x, me.y) < Math.hypot(h.site.hw, h.site.hd) + 220;
    for (const d of h.doors) {
      let want = false;
      if (on && h.own && near) { const dd = dist(d.wx, d.wy, me.x, me.y); want = d.k === 'front' ? !P.car && dd < 34 : d.k === 'garage' ? dd < (P.car ? 130 : 40) || shIn(h, me.x, me.y, 0) && dd < 90 : dd < (P.car ? 170 : 70); }
      const was = d.open, rate = dt / (d.k === 'garage' ? 1.4 : d.k === 'gate' ? 1.6 : 0.4);
      if (want) d.open = Math.min(1, d.open + rate); else if (d.open > 0 && !(d.open > 0.15 && doorBusy(h, d))) d.open = Math.max(0, d.open - rate);
      if (d.k !== 'front' && ((was === 0 && d.open > 0) || (was === 1 && d.open < 1))) { const dd = dist(me.x, me.y, d.wx, d.wy); if (dd < 400) Snd.burst(1.2, 240, 100, 0.12 * (1 - dd / 400)); }
      if (d.ds) d.ds.off = d.open > 0.85;
    }
    const inn = near && on && shIn(h, me.x, me.y, 0);
    if (inn && !h.wasIn && h.own) safeLosePolice(h);
    h.wasIn = inn;
  }
  safeCars(dt);
}

/* ---------- kept cars: in a garage bay or a reserved space ---------- */
const carState = c => ({ type: c.type, color: c.color, hp: Math.round(c.hp), radio: c.radio, tune: c.tune || undefined });
function inSpot(c, p) { const dx = c.x - p.x, dy = c.y - p.y, ca = Math.cos(p.ang), sa = Math.sin(p.ang); return Math.abs(dx * ca + dy * sa) < p.l / 2 - 4 && Math.abs(-dx * sa + dy * ca) < p.w / 2; }
function spawnKept(h, k) {
  const s = h.keep[k], p = h.spots[k]; if (!s || !CAR_TYPES[s.type]) { h.keep[k] = null; return; }
  if (cars.some(o => dist(o.x, o.y, p.x, p.y) < 24)) return;           // something stands there: later
  const c = makeCar(s.type, p.x, p.y, p.ang, null, typeof s.color === 'string' ? s.color : undefined);
  if (typeof s.hp === 'number' && isFinite(s.hp)) c.hp = clamp(s.hp, 1, c.hp);
  if (Number.isInteger(s.radio) && s.radio < RADIO.length) c.radio = Math.max(-1, s.radio);
  tuneSet(c, s.tune);                                              // the tuning stays with the car (js/08y)
  c.searched = true; c.keep = true; c.home = { h, k }; cars.push(c); h.live[k] = c;
}
function safeCars(dt) {
  if (!safeOn()) return;
  for (const h of SAFES) {
    if (!h.own || !h.spots.length) continue;
    const d = dist(h.door.x, h.door.y, P.x, P.y);
    h.spots.forEach((p, k) => {
      const c = h.live[k];
      if (c) {
        if (!cars.includes(c) || c.dead || c.sunk) { h.live[k] = null; h.keep[k] = null; return; }           // wrecked or gone
        if (dist(c.x, c.y, p.x, p.y) > 34) { h.live[k] = null; h.keep[k] = null; c.keep = false; c.home = null; return; }   // driven away: not kept any more
        if (d > 2300 && P.car !== c) { h.keep[k] = carState(c); cars.splice(cars.indexOf(c), 1); h.live[k] = null; }   // far away: put away till you come back
        return;
      }
      if (h.keep[k]) { if (d < 1600) spawnKept(h, k); return; }
      if (d > 700) return;
      for (const o of cars) {                                            // a free space: a car left standing in it is kept
        if (o.home || o.driver || o.dead || o.burn > 0 || o === P.car || o.t.cop && o.crewOut || carSpeed(o) > 6 || !inSpot(o, p)) continue;
        h.keep[k] = carState(o); h.live[k] = o; o.home = { h, k }; o.keep = true; o.lot = null; o.searched = true;
        if (dist(o.x, o.y, P.x, P.y) < 160) toast(p.bay ? 'KEPT IN YOUR GARAGE' : 'PARKED IN YOUR SPACE - KEPT');
        break;
      }
    });
  }
}

/* ---------- saved games ---------- */
function safeSave() {
  const cars = {};
  for (const h of SAFES) { h.live.forEach((c, k) => { if (c) h.keep[k] = carState(c); }); if (h.keep.some(Boolean)) cars[h.id] = h.keep.slice(); }
  return { own: SAFES.filter(h => h.own).map(h => h.id), stash: Object.assign({}, SAFEST.stash), cars };
}
function safeLoad(d) {                    // js/15b applySave (older saves: only the free room, nothing stashed)
  if (!d || typeof d !== 'object') return;
  const n = v => typeof v === 'number' && isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  if (Array.isArray(d.own)) for (const h of SAFES) if (d.own.includes(h.id)) h.own = true;
  if (d.stash && typeof d.stash === 'object') for (const id in d.stash) { const s = d.stash[id]; if (WEAPONS.some(w => w.id === id) && Array.isArray(s)) SAFEST.stash[id] = [n(s[0]), n(s[1])]; }
  if (d.cars && typeof d.cars === 'object') for (const h of SAFES) {
    const a = d.cars[h.id]; if (!Array.isArray(a)) continue;
    h.keep = h.spots.map((p, k) => { const s = a[k]; return s && CAR_TYPES[s.type] ? { type: s.type, color: typeof s.color === 'string' ? s.color : undefined, hp: n(s.hp) || undefined, radio: s.radio, tune: tuneClean(s.tune) || undefined } : null; });
  }
}

/* ---------- js/13: roofs, doors, the markers ---------- */
let safeT = 0;
function gfxSafes(time) {
  const dt = Math.min(0.1, Math.max(0, time - safeT)); safeT = time;
  if (safeGroup) safeGroup.visible = safeOn();
  const me = P.car || P;
  for (const h of SAFES) {
    if (h.mk && safeOn()) {
      const k = h.mk, mine = h.own; k.ringMat.color.setHex(mine ? 0x3dff7a : 0xffffff); k.padMat.color.setHex(mine ? 0x3dff7a : 0xffffff); k.im.color.setHex(mine ? 0x3dff7a : 0xffffff);
      k.sign.visible = !mine; const show = !h.site || !mine; k.ring.visible = k.pad.visible = k.icon.visible = show;
      k.icon.rotation.y = time * 1.4; k.icon.position.y = 22 + Math.sin(time * 2.4) * 2; k.ringMat.opacity = 0.65 + 0.3 * Math.sin(time * 4);
    }
    const pt = h.pt; if (!h.lm || !h.lm.mesh || !pt) continue;
    const inside = !P.dead && shIn(h, me.x, me.y, -6), roof = inside ? 0.08 : 1;
    pt.cur = pt.cur === undefined ? 1 : pt.cur + (roof - pt.cur) * Math.min(1, dt * 6);
    if (Math.abs(pt.cur - pt.op) > 0.003) { pt.op = pt.cur; pt.roofMat.opacity = pt.roofGlow.opacity = pt.cur; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = pt.cur > 0.97; pt.roof.visible = pt.cur > 0.02; }
    for (const { gs, d } of pt.doors) {
      if (d.k === 'garage') { gs[0].scale.y = Math.max(0.03, 1 - d.open); gs[0].visible = d.open < 0.99; }
      else for (const g of gs) { const s = 1 - 0.92 * d.open; if (d.ax === 'x' || d.k === 'gate') g.scale.x = s; else g.scale.z = s; }
    }
  }
}

/* ---------- js/14: a house on the minimap and the city map - green for yours, white with a € for sale ---------- */
function safeIcons(g, X, Y, q, inView) {
  if (!safeOn()) return;
  for (const h of SAFES) {
    const x = X(h.site ? h.site.cx : h.door.x), y = Y(h.site ? h.site.cy : h.door.y); if (!inView(x, y)) continue;
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = h.own ? '#3dff7a' : '#f4f4f6'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.fillStyle = h.own ? '#0b2a14' : '#16161c'; g.beginPath(); g.moveTo(x, y - q * 0.75); g.lineTo(x + q * 0.75, y - q * 0.05); g.lineTo(x - q * 0.75, y - q * 0.05); g.closePath(); g.fill();
    g.fillRect(x - q * 0.5, y - q * 0.05, q, q * 0.7);
    if (!h.own) { g.fillStyle = '#e0364f'; g.font = 'bold ' + Math.round(q * 0.95) + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('€', x + q * 0.62, y - q * 0.55); }
  }
}
