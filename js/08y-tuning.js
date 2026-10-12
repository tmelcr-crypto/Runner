'use strict';
/* ---------- 6y. SUNSTRIP TUNING: the workshop behind the showroom (the building: js/10s) ----------
   (js/01j tuning; vehicles table: tuning; places table: Tuning workshop) Drive up to the workshop's roller door on the avenue in a
   car it takes and the door goes up; inside, stop in the bay and it comes down behind you. A card opens with three tabs:
     LOOKS - paint, a two-tone roof, racing stripes, rim and underglow colours (none: the underglow takes the paint's colour);
     PARTS - a spoiler, a bonnet scoop (on models that have room for them and none of their own);
     PERFORMANCE - engine, brakes and armour, each in three levels (top speed and acceleration, braking, less damage).
   Every pick shows on the car at once; the total is what the changes cost (a level up costs the levels between). BUY pays, the mechanic
   gets to work for a few seconds, and the door goes up. LEAVE puts the car back as it was. The tuning stays with the car: kept in a
   garage bay or reserved space of a safehouse and in your saves. Police and army vehicles are turned away, and so is a car while you
   are wanted; taxis, buses, ambulances, fire engines and trash trucks keep their livery (no paint, roof or stripes). */
const TN_LV = 3, TN_WT = 4;
const TN = { phase: 'idle', open: 0, used: false, hinted: false, car: null, t: 0, warnT: 0, mx: undefined, my: undefined, mang: 0, walk: 0, moving: false, roof: 1, ratchet: 0 };
const TNC = { car: null, orig: null, d: null, tab: 'looks', what: 'paint' };   // the card: the car as it came in, the draft, the open tab, the look being picked

/* ---------- where the parts go on each model (the same numbers as the models in js/11 buildCar) ----------
   roof: the roof's top { x (its middle along the car), y (top), l (length), w (width) }; hood: the bonnet { x0, x1, y }; deck: the boot lid;
   wing: a roof spoiler instead of one on the boot; spoiler / scoop false: the model has one of its own or no room for it; gap: half
   the gap between the twin stripes. Bodies not listed (buses, trucks of the services ...) take only rims, underglow and performance. */
const TUNE_GEO = {
  sedan: (L, W) => ({ roof: { x: -L * 0.04, y: 19.3, l: L * 0.34, w: W - 8 }, hood: { x0: L * 0.16, x1: L / 2, y: 11 }, deck: { x0: -L / 2, x1: -L * 0.24, y: 11 } }),
  sports: (L, W) => ({ roof: { x: -L * 0.06, y: 15.2, l: L * 0.24, w: W - 9 }, hood: { x0: L * 0.09, x1: L / 2, y: 9.25 }, deck: { x0: -L / 2 + 4, x1: -L * 0.21, y: 9.25 }, spoiler: false }),
  estate: (L, W) => ({ roof: { x: -L * 0.13, y: 19.3, l: L * 0.58, w: W - 8 }, hood: { x0: L * 0.19, x1: L / 2, y: 11 }, deck: null, wing: { x: -L * 0.4, y: 19.3 } }),
  pickup: (L, W) => ({ roof: { x: L * 0.12, y: 20.4, l: L * 0.24, w: W - 6 }, hood: { x0: L * 0.24, x1: L / 2, y: 12 }, deck: null, spoiler: false }),
  limo: (L, W) => ({ roof: { x: -L * 0.03, y: 18.25, l: L * 0.6, w: W - 7 }, hood: { x0: L * 0.29, x1: L / 2, y: 10.5 }, deck: { x0: -L / 2, x1: -L * 0.35, y: 10.5 } }),
  nascar: (L, W) => ({ roof: { x: -L * 0.04, y: 15.8, l: L * 0.36, w: W - 6 }, hood: { x0: L * 0.15, x1: L / 2, y: 10 }, deck: { x0: -L / 2 + 4, x1: -L * 0.23, y: 10 }, spoiler: false }),
  super: (L, W) => ({ roof: { x: -L * 0.03, y: 13.4, l: L * 0.2, w: W - 8 }, hood: { x0: L * 0.14, x1: L / 2 - 2, y: 7.9 }, deck: { x0: -L * 0.45, x1: -L * 0.15, y: 10 }, spoiler: false }),
  convertible: (L, W) => ({ roof: null, hood: { x0: L * 0.15, x1: L / 2, y: 9.9 }, deck: { x0: -L / 2, x1: -L * 0.32, y: 9.9 } }),
  muscle: (L, W) => ({ roof: { x: -L * 0.12, y: 18.1, l: L * 0.28, w: W - 8 }, hood: { x0: L * 0.04, x1: L / 2, y: 10.8 }, deck: { x0: -L / 2, x1: -L * 0.28, y: 10.8 }, scoop: false }),
  truck: (L, W) => ({ roof: { x: L * 0.35, y: 22.6, l: L * 0.3, w: W }, hood: null, deck: null, spoiler: false, scoop: false, stripes: false }),
  bike: (L, W) => ({ roof: null, hood: { x0: L * 0.08 - L * 0.11, x1: L * 0.08 + L * 0.11, y: 15.5 }, deck: null, spoiler: false, scoop: false, gap: 1 })
};
TUNE_GEO.taxi = TUNE_GEO.sedan;
const tuneGeo = t => { const f = TUNE_GEO[t.body]; return f ? f(t.len, t.wid) : { roof: null, hood: null, deck: null, spoiler: false, scoop: false, stripes: false }; };
const tuneLivery = t => isService(t) && !t.cop;                    // public service colours stay as they are
function tuneHas(t, k) {                  // can this model take that look or part?
  const g = tuneGeo(t), liv = tuneLivery(t);
  if (k === 'paint') return !liv;
  if (k === 'roof') return !liv && !!g.roof;
  if (k === 'stripes') return !liv && g.stripes !== false && !!(g.hood || g.roof || g.deck);
  if (k === 'rims' || k === 'glow') return true;
  if (k === 'spoiler') return g.spoiler !== false && !!(g.deck || g.wing);
  if (k === 'scoop') return g.scoop !== false && !!g.hood;
  return true;
}
const TUNE_NONE = () => ({ roof: null, stripes: null, rims: null, glow: null, spoiler: false, scoop: false, engine: 0, brakes: 0, armour: 0 });
function tuneClean(o) {                   // a saved tuning, checked: unknown or broken values are dropped; null when nothing is left
  if (!o || typeof o !== 'object') return null;
  const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null, lv = v => Number.isInteger(v) ? clamp(v, 0, TN_LV) : 0;
  const t = { roof: hex(o.roof), stripes: hex(o.stripes), rims: hex(o.rims), glow: hex(o.glow), spoiler: o.spoiler === true, scoop: o.scoop === true, engine: lv(o.engine), brakes: lv(o.brakes), armour: lv(o.armour) };
  return Object.values(t).some(v => v) ? t : null;
}
function tuneApply(c) {                   // the performance in numbers the physics use (js/07 stepCar, js/06 damageCar)
  const u = c.tune, row = (k, l) => l > 0 && TUNE[k + l] ? TUNE[k + l] : null;
  if (!u) { c.tk = null; return; }
  const e = row('engine', u.engine), b = row('brakes', u.brakes), a = row('armour', u.armour);
  c.tk = { top: 1 + (e ? e.top : 0) / 100, acc: 1 + (e ? e.acc : 0) / 100, brake: 1 + (b ? b.brake : 0) / 100, arm: 1 - (a ? a.armour : 0) / 100 };
}
function tuneSet(c, tune) { c.tune = tuneClean(tune); tuneApply(c); }

/* ---------- js/11 buildCar: the parts on the model ---------- */
const _tnMat = {};
function tuneMat(hex) {                   // one material per colour, shared by every tuned car
  if (!_tnMat[hex]) { const m = new THREE.MeshLambertMaterial({ color: hex }); m.emissive = new THREE.Color(hex).multiplyScalar(0.22); _tnMat[hex] = m; }
  return _tnMat[hex];
}
function tuneParts(c, m, merged, wheels) {
  const u = c.tune, t = c.t, L = t.len, Wd = t.wid, g = tuneGeo(t), out = m.tp = [];
  if (!u) return;
  const add = o => { out.push(o); return o; };
  if (u.roof && g.roof && tuneHas(t, 'roof')) add(merged('tR', tuneMat(u.roof), [[GB, g.roof.l + 0.4, 0.5, g.roof.w + 0.4, g.roof.x, g.roof.y + 0.25, 0]]));
  if (u.stripes && tuneHas(t, 'stripes')) {                         // twin stripes over the bonnet, the roof and the boot
    const gp = g.gap || 3, sw = gp < 2 ? 1.2 : 2.2, up = t.body === 'muscle' ? 0.35 : 0.15, p = [];
    const run = (x0, x1, y) => { for (const s of [-1, 1]) p.push([GB, x1 - x0, 0.3, sw, (x0 + x1) / 2, y + up, s * gp]); };
    if (g.hood) run(g.hood.x0, g.hood.x1, g.hood.y); if (g.deck) run(g.deck.x0, g.deck.x1, g.deck.y);
    if (g.roof) run(g.roof.x - g.roof.l / 2, g.roof.x + g.roof.l / 2, g.roof.y + (u.roof ? 0.5 : 0));
    if (p.length) add(merged('tS', tuneMat(u.stripes), p));
  }
  if (u.spoiler && tuneHas(t, 'spoiler')) {                         // a wing on the boot (on an estate: on the end of the roof)
    if (g.deck) { const x = g.deck.x0 + 3, y = g.deck.y, p = [[GB, 4.5, 0.9, Wd - 1, x - 0.4, y + 4.6, 0]];
      for (const s of [-1, 1]) p.push([GB, 1.4, 4.4, 1.4, x, y + 2.2, s * (Wd / 2 - 5)], [GB, 5, 3, 0.6, x - 0.4, y + 4.2, s * (Wd / 2 - 0.3)]);
      add(merged('tW', m.body, p)); }
    else if (g.wing) add(merged('tW', m.body, [[GB, 3.6, 0.8, Wd - 5, g.wing.x, g.wing.y + 0.9, 0], [GB, 1.2, 1.2, 1.2, g.wing.x + 0.6, g.wing.y + 0.2, Wd / 2 - 6], [GB, 1.2, 1.2, 1.2, g.wing.x + 0.6, g.wing.y + 0.2, -(Wd / 2 - 6)]]));
  }
  if (u.scoop && tuneHas(t, 'scoop')) {                             // an air scoop on the bonnet, its mouth to the front
    const h = g.hood, ln = (h.x1 - h.x0) * 0.42, cx = (h.x0 + h.x1) / 2;
    add(merged('tC', m.body, [[GB, ln, 2.2, Wd * 0.3, cx, h.y + 1.1, 0]])); add(merged('tK', E.black, [[GB, 0.6, 1.5, Wd * 0.25, cx + ln / 2 + 0.1, h.y + 1.25, 0]]));
  }
  if (u.rims) add(merged('tM', tuneMat(u.rims), wheels.map(w => [w[0], w[1] * 0.62, w[2] * 0.62, w[3] + 0.5, w[4], w[5], w[6]])));   // a coloured hub on each wheel
}

/* ---------- the workshop: the bay behind the roller door ---------- */
const tnRect = () => { const [x0, y0, x1, y1] = SHOWM.shop; return { x0, y0, x1, y1 }; };
function tnIn(x, y, m) { if (!SHOWM) return false; const r = tnRect(), k = TN_WT / 2 + (m || 0); return x > r.x0 + k && x < r.x1 - k && y > r.y0 + k && y < r.y1 - k; }
const carInTn = c => carCircles(c).every(q => tnIn(q[0], q[1], q[2] - 2));
function tuneKerb(x, y) { if (!SHOWM) return false; const [ex, ey, ew] = SHOWM.sdoor; return Math.abs(y - ey) < ew / 2 + 50 && Math.abs(x - ex) < 90; }   // js/08 kerbFits: nothing parks across the door
function tuneCan(c) {                     // true, or why the workshop will not take the car
  if (c.t.cop) return "WE DON'T WORK ON POLICE OR ARMY VEHICLES";
  if (P.stars > 0 && feat('police')) return 'NOT WHILE YOU ARE WANTED - LOSE THE POLICE FIRST';
  const r = tnRect(); if (c.t.len + 14 > r.x1 - r.x0 - 2 * TN_WT || c.t.wid + 6 > SHOWM.sdoor[2]) return 'TOO BIG FOR THE WORKSHOP';
  if (RACE.on && RACE.on.car === c && RACE.on.phase !== 'toStart') return 'NOT DURING A RACE';
  if (c.burn > 0 || c.dead) return 'THAT CAR IS ON FIRE';
  return true;
}
function tnDoorBlocked() {                // something standing under the door: it waits
  const [ex, ey, ew] = SHOWM.sdoor, lim = (x, y, r) => Math.abs(x - ex) < TN_WT / 2 + r + 2 && Math.abs(y - ey) < ew / 2 + r;
  for (const c of cars) { if (dist(c.x, c.y, ex, ey) > 160) continue; for (const p of carCircles(c)) if (lim(p[0], p[1], p[2])) return true; }
  for (const list of [peds, officers]) for (const p of list) if (!p.dead && dist(p.x, p.y, ex, ey) < 70 && lim(p.x, p.y, 8)) return true;
  return !P.car && !P.dead && lim(P.x, P.y, 8);
}
function tuneTick(dt) {                   // js/15 update: the door, who comes in, the work
  if (!SHOWM || !SHOW.sdoor) return;
  TN.warnT -= dt;
  const on = feat('tuning') && !P.dead, me = P.car || P, c = P.car, [ex, ey, ew] = SHOWM.sdoor;
  const pin = tnIn(me.x, me.y, 0), atDoor = me.x > ex - 10 && me.x < ex + 160 && Math.abs(me.y - ey) < ew / 2 + 70;
  const inn = !!c && on && carInTn(c);
  if (!inn && TN.used && TN.phase !== 'work') TN.used = false;
  let want = false;
  if (TN.phase === 'idle') {
    if (!on) want = false;
    else if (pin) want = true;
    else if (c && atDoor) {
      const ok = tuneCan(c); want = ok === true;
      const slow = me.x < ex + 70 && carSpeed(c) < 70;                  // turning in, not driving past
      if (!want && slow && TN.warnT <= 0) { TN.warnT = 4; toast(ok, true); }
      if (want && slow && !TN.hinted) { TN.hinted = true; toast('SUNSTRIP TUNING - DRIVE IN AND STOP'); }
    }
    if (!atDoor && !pin) TN.hinted = false;
    if (inn && !TN.used && carSpeed(c) < 10 && tuneCan(c) === true) { TN.phase = 'shut'; TN.car = c; }   // stopped in the bay: down comes the door
  } else if (TN.phase === 'shut') {
    if (!c || c !== TN.car || !inn || carSpeed(c) > 20) { TN.phase = 'idle'; want = true; }   // drove off: up again
    else if (TN.open <= 0) { TN.open = 0; openTune(); }
  } else if (TN.phase === 'work') {
    TN.t += dt; tuneWorking(dt);
    if (TN.t >= PLC.tuneTime) tuneDone();
  } else if (TN.phase === 'out') { want = true; if (!inn) TN.phase = 'idle'; }
  const was = TN.open, rate = dt / Math.max(0.1, PLC.tuneDoor);
  if (want) TN.open = Math.min(1, TN.open + rate);
  else if (TN.open > 0 && !(TN.open > 0.15 && tnDoorBlocked())) TN.open = Math.max(0, TN.open - rate);
  if ((was === 0 && TN.open > 0) || (was === 1 && TN.open < 1)) { const d = dist(me.x, me.y, ex, ey); if (d < 400) Snd.burst(PLC.tuneDoor, 260, 110, 0.14 * (1 - d / 400)); }   // the door's motor
  SHOW.sdoor.off = TN.open > 0.85;
  tnMechanic(dt);
}

/* ---------- the card ---------- */
const TN_LOOKS = ['paint', 'roof', 'stripes', 'rims', 'glow'];
const tnPrice = id => (TUNE[id] && TUNE[id].price) || 0;
function tnLevelCost(k, from, to) { let s = 0; for (let l = from + 1; l <= to; l++) s += tnPrice(k + l); return s; }
function tnTotal() {                      // what the changes cost
  const o = TNC.orig, d = TNC.d; let s = 0;
  if (d.color !== o.color) s += tnPrice('paint');
  for (const k of ['roof', 'stripes', 'rims', 'glow', 'spoiler', 'scoop']) if (d.tune[k] !== o.tune[k]) s += tnPrice(k);
  for (const k of ['engine', 'brakes', 'armour']) s += tnLevelCost(k, o.tune[k], d.tune[k]);
  return s;
}
function rebuildCar(c) { if (c.mesh) { scene.remove(c.mesh); if (c.m && c.m.body) c.m.body.dispose(); } c.mesh = null; buildCar(c); }
function tnShow() {                       // the draft on the car, at once
  const c = TNC.car; if (!c) return;
  c.color = TNC.d.color; c.tune = tuneClean(TNC.d.tune); rebuildCar(c); tnPaint();
}
function openTune() {
  const c = P.car; if (!c) { TN.phase = 'idle'; return; }
  TNC.car = c; TNC.orig = { color: c.color, tune: Object.assign(TUNE_NONE(), c.tune || {}) }; TNC.d = { color: c.color, tune: Object.assign(TUNE_NONE(), c.tune || {}) };
  TNC.tab = 'looks'; TNC.what = tuneHas(c.t, 'paint') ? 'paint' : 'rims';
  TN.phase = 'card'; state = 'tune'; toggleBigMap(false); toggleWheel(false); hush();
  $('tnName').textContent = c.t.name; tnPaint(); showCard('tuneCard', true); Snd.tone(523, 659, 0.12, 0.1, 'square');
  const top = $('tuneCard').getBoundingClientRect().top / VH;              // the camera moves so the car sits in the open space above the card
  cam.zoom = Math.max(cam.zoom, 1.3); cam.x = c.x; cam.y = c.y + clamp(0.5 - top / 2, 0, 0.42) * 2 * visHalfV() / cam.zoom;
}
function tnSay(t) { $('tnMsg').textContent = t; }
function tnPaint() {                      // the card, from the draft
  const c = TNC.car, d = TNC.d, o = TNC.orig, tot = tnTotal(), liv = tuneLivery(c.t);
  $('tnSub').textContent = 'YOUR CASH ' + money(P.score) + (liv ? '  ·  ' + c.t.name + ' KEEPS ITS LIVERY' : '');
  for (const b of document.querySelectorAll('#tnTabs button')) b.classList.toggle('on', b.dataset.t === TNC.tab);
  $('tnLooks').hidden = TNC.tab !== 'looks'; $('tnParts').hidden = TNC.tab !== 'parts'; $('tnPerf').hidden = TNC.tab !== 'perf';
  if (TNC.tab === 'looks') {
    const wb = $('tnWhat'); wb.innerHTML = '';
    for (const k of TN_LOOKS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === TNC.what ? ' on' : '') + ((k === 'paint' ? d.color !== o.color : d.tune[k] !== o.tune[k]) ? ' ch' : '');
      b.disabled = !tuneHas(c.t, k); b.innerHTML = TUNE[k].name.replace('TWO-TONE ', '').replace('RACING ', '') + '<i>' + money(tnPrice(k)) + '</i>';
      b.addEventListener('click', () => { TNC.what = k; tnPaint(); }); wb.appendChild(b);
    }
    const sw = $('tnSw'), now = TNC.what === 'paint' ? d.color : d.tune[TNC.what], was = TNC.what === 'paint' ? o.color : o.tune[TNC.what];
    const list = TNC.what === 'paint' ? [...new Set([...c.t.colors, ...pnsPalette()])] : [null, ...pnsPalette()];
    sw.innerHTML = '';
    for (const h of list) {
      const b = document.createElement('button'); b.type = 'button';
      if (h) { b.style.background = h; b.title = colourName(h); } else { b.className = 'none'; b.title = TNC.what === 'glow' ? 'THE PAINT\'S COLOUR' : 'NONE'; }
      if (h === was) b.classList.add('now'); if (h === now) b.classList.add('sel');
      b.addEventListener('click', () => { if (TNC.what === 'paint') d.color = h; else d.tune[TNC.what] = h; tnShow(); tnSay(TUNE[TNC.what].name + ': ' + (h ? colourName(h) : TNC.what === 'glow' ? 'THE PAINT\'S COLOUR' : 'NONE')); });
      sw.appendChild(b);
    }
  } else if (TNC.tab === 'parts') {
    const box = $('tnParts'); box.innerHTML = '';
    for (const k of ['spoiler', 'scoop']) {
      const r = document.createElement('div'); r.className = 'trow'; const has = tuneHas(c.t, k), g = tuneGeo(c.t);
      r.innerHTML = '<b>' + TUNE[k].name + '</b><i>' + (has ? money(tnPrice(k)) : (g[k] === false ? 'HAS ITS OWN OR NO ROOM' : 'NO ROOM ON THIS MODEL')) + '</i>';
      for (const v of [false, true]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = v ? 'ON' : 'OFF'; b.disabled = !has;
        b.classList.toggle('on', d.tune[k] === v); b.classList.toggle('now', o.tune[k] === v);
        b.addEventListener('click', () => { d.tune[k] = v; tnShow(); tnSay(TUNE[k].name + (v ? ' ON' : ' OFF')); }); r.appendChild(b);
      }
      box.appendChild(r);
    }
  } else {
    const box = $('tnPerf'); box.innerHTML = '';
    const what = { engine: l => '+' + TUNE['engine' + l].top + '% TOP SPEED · +' + TUNE['engine' + l].acc + '% PUSH', brakes: l => '+' + TUNE['brakes' + l].brake + '% BRAKING', armour: l => '-' + TUNE['armour' + l].armour + '% DAMAGE' };
    for (const k of ['engine', 'brakes', 'armour']) {
      const r = document.createElement('div'), l = d.tune[k]; r.className = 'trow lv';
      r.innerHTML = '<b>' + k.toUpperCase() + '</b><i>' + (l > 0 ? what[k](l) : 'STOCK') + '</i>';
      for (let v = 0; v <= TN_LV; v++) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = v ? String(v) : 'STOCK'; b.disabled = v < o.tune[k];
        b.title = v > o.tune[k] ? money(tnLevelCost(k, o.tune[k], v)) : v === o.tune[k] ? 'NOW' : '';
        b.classList.toggle('on', l === v); b.classList.toggle('now', o.tune[k] === v);
        b.addEventListener('click', () => { d.tune[k] = v; tnShow(); tnSay(k.toUpperCase() + (v ? ' LEVEL ' + v + ': ' + what[k](v) + (v > o.tune[k] ? ' · ' + money(tnLevelCost(k, o.tune[k], v)) : '') : ': STOCK')); }); r.appendChild(b);
      }
      box.appendChild(r);
    }
  }
  const go = $('tnGo'); go.textContent = tot > 0 ? 'BUY ' + money(tot) : 'NOTHING TO BUY'; go.disabled = tot <= 0 || P.score < tot;
  if (tot > P.score) tnSay('NOT ENOUGH CASH: ' + money(tot) + ' FOR THESE CHANGES');
}
for (const b of document.querySelectorAll('#tnTabs button')) b.addEventListener('click', () => { TNC.tab = b.dataset.t; tnPaint(); });
function closeTune(go) {                  // LEAVE: the car as it came in, the door up; BUY: pay, and the mechanic gets to work
  if (state !== 'tune' || !TNC.car) return;
  const c = TNC.car, tot = tnTotal(); state = 'play'; closeMenus();
  if (!go || tot <= 0 || P.score < tot || P.car !== c) { c.color = TNC.orig.color; tuneSet(c, TNC.orig.tune); rebuildCar(c); TN.phase = 'out'; TN.used = true; TNC.car = null; return; }
  P.score -= tot; c.color = TNC.d.color; tuneSet(c, TNC.d.tune); rebuildCar(c);
  TN.phase = 'work'; TN.t = 0; TN.car = c; TN.engineUp = TNC.d.tune.engine > TNC.orig.tune.engine; TNC.car = null;
  Snd.tone(880, 1320, 0.08, 0.14, 'square');
}
$('tnGo').addEventListener('click', () => closeTune(true));

/* ---------- the work: the mechanic goes round the car with his air wrench, sparks fly ---------- */
function tuneWorking(dt) {
  const c = TN.car; if (!c || c.dead || P.car !== c) { TN.phase = 'out'; TN.used = true; return; }
  if ((TN.ratchet -= dt) <= 0) {
    TN.ratchet = rand(0.35, 0.7);
    if (Math.random() < 0.6) { for (let k = 0; k < 5; k++) Snd.tone(1900, 1500, 0.03, 0.05, 'square', k * 0.045); }   // the air wrench
    else { Snd.metal(rand(700, 1100), 0.25, 0.08); }                                                               // a spanner on steel
    if (TN.mx !== undefined && Math.random() < 0.7) spark((TN.mx + c.x) / 2, (TN.my + c.y) / 2, 4);
  }
}
function tuneDone() {
  const c = TN.car; TN.phase = 'out'; TN.used = true;
  if (c && !c.dead && TN.engineUp) { Snd.tone(70, 260, 0.6, 0.12, 'sawtooth'); Snd.tone(140, 520, 0.6, 0.06, 'square', 0.05); }   // a rev of the new engine
  toast(c ? c.t.name + ' TUNED' : 'TUNED');
  Snd.tone(1046, 1568, 0.12, 0.13, 'square'); setTimeout(() => Snd.tone(1568, 2093, 0.1, 0.1, 'square'), 110);
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
function tnMechanic(dt) {                 // where the mechanic is (world): by the bench, or going round the car
  const r = tnRect(); let tx, ty, face, spd = 45;
  if (TN.phase === 'work' && TN.car) {
    const c = TN.car, u = (TN.t / PLC.tuneTime) * TAU * 1.1 - 2.4, rx = c.t.len / 2 + 12, ry = c.t.wid / 2 + 12, ca = Math.cos(c.ang), sa = Math.sin(c.ang);
    const ex = Math.cos(u) * rx, ey = Math.sin(u) * ry; tx = c.x + ca * ex - sa * ey; ty = c.y + sa * ex + ca * ey; face = Math.atan2(c.y - ty, c.x - tx); spd = 150;
  } else { tx = r.x0 + 40; ty = r.y0 + 30; face = -Math.PI / 2; }
  if (TN.mx === undefined) { TN.mx = tx; TN.my = ty; TN.mang = face; }
  const d = dist(TN.mx, TN.my, tx, ty), st = Math.min(d, spd * dt);
  if (d > 0.5) { TN.mx += (tx - TN.mx) / d * st; TN.my += (ty - TN.my) / d * st; TN.walk += st; }
  TN.mang = d > 6 && TN.phase !== 'work' ? Math.atan2(ty - TN.my, tx - TN.mx) : face; TN.moving = d > 0.5;
}

/* ---------- js/06: no getting out, no weapons, the car held still while it is worked on ---------- */
const tuneBusy = () => TN.phase === 'work' && TN.car === P.car;
function tuneLocked(what) { if (!P.car || !tuneBusy()) return false; if (what && TN.warnT <= 0) { TN.warnT = 1.5; toast(what, true); } return true; }
function tuneHold(c, dt) {
  if (!(TN.phase === 'work' && TN.car === c)) return;
  c.thr = 0; c.str = 0; c.hb = true; const k = Math.exp(-8 * dt); c.vx *= k; c.vy *= k; c.av *= k;
}
function tuneReset() {                    // js/15 resetGame: the door down, nobody inside
  Object.assign(TN, { phase: 'idle', open: 0, used: false, hinted: false, car: null, t: 0, mx: undefined, my: undefined });
  TNC.car = null; if (SHOW.sdoor) SHOW.sdoor.off = false;
}

/* ---------- js/13: the door, the roof, the mechanic ---------- */
let tnT = 0;
function gfxTune(time) {
  const dt = Math.min(0.1, Math.max(0, time - tnT)); tnT = time;
  const w = SHOW.wk; if (!SHOWM || !w || !SHOW.lm || !SHOW.lm.mesh) return;
  const me = P.car || P, inside = !P.dead && tnIn(me.x, me.y, -6);
  TN.roof += ((inside ? 0.1 : 1) - TN.roof) * Math.min(1, dt * 6);
  if (Math.abs(TN.roof - w.op) > 0.003) { w.op = TN.roof; w.roofMat.opacity = w.roofGlow.opacity = TN.roof; w.roofMat.depthWrite = w.roofGlow.depthWrite = TN.roof > 0.97; }
  w.door.scale.y = Math.max(0.03, 1 - TN.open); w.door.visible = TN.open < 0.99;
  const busy = TN.phase === 'shut' || TN.phase === 'card' || TN.phase === 'work';
  w.lampMat.color.setHex(!feat('tuning') ? 0x3a3d47 : busy ? 0xff3b3b : TN.open > 0.5 ? 0x3dff7a : Math.floor(time * 2) % 2 ? 0x3dff7a : 0x1d7a3a);
  const p = w.mech; if (TN.mx === undefined) return;
  p.g.position.set(TN.mx - SHOW.lm.cx, 0.4, TN.my - SHOW.lm.cy); p.g.rotation.y = -TN.mang;
  const sw = TN.moving ? Math.sin(TN.walk * 0.25) * 0.6 : 0;
  p.legs[0].rotation.z = sw; p.legs[1].rotation.z = -sw;
  const aim = TN.phase === 'work' ? -1.1 + Math.sin(time * 14) * 0.2 : 0; p.arms[0].rotation.z = aim || -sw * 0.6; p.arms[1].rotation.z = aim || sw * 0.6;
}
