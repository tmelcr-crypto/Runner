'use strict';
/* ---------- 8. HUD & MINIMAP ---------- */
const MM = 600, MMS = 0.13;                 // sea margin drawn around the map, map canvas scale (px per world unit)
let mapCv = null;
function buildMiniMap() {                   // the whole city drawn once; the minimap and the big map cut from it
  if (mapCv) return;
  mapCv = document.createElement('canvas'); mapCv.width = Math.round((MW + 2 * MM) * MMS); mapCv.height = Math.round((MH + 2 * MM) * MMS);
  const m = mapCv.getContext('2d'); m.fillStyle = '#0e2f8a'; m.fillRect(0, 0, mapCv.width, mapCv.height);
  m.setTransform(MMS, 0, 0, MMS, MM * MMS, MM * MMS);
  const fill = (polys, col) => { m.fillStyle = col; for (const p of polys) { m.beginPath(); traceRing(m, p.o); for (const h of p.h) traceRing(m, h); m.fill('evenodd'); } };
  fill(MAP.land, '#4a3a7e'); fill(MAP.grass, '#0c5a58'); fill(MAP.sand, '#7a5c9a');
  m.strokeStyle = '#1e1640'; m.lineWidth = ROAD_W; m.lineJoin = m.lineCap = 'round';
  for (const E of RE) { m.beginPath(); m.moveTo(E.p[0][0], E.p[0][1]); for (let k = 1; k < E.p.length; k++) m.lineTo(E.p[k][0], E.p[k][1]); m.stroke(); }
  const box = r => { m.beginPath(); solidCorners(r).forEach(([x, y], k) => k ? m.lineTo(x, y) : m.moveTo(x, y)); m.closePath(); m.fill(); };
  m.fillStyle = '#2a2244'; for (const L of LOTS) box({ cx: L.cx, cy: L.cy, lw: L.w, lh: L.d, ca: Math.cos(L.a), sa: Math.sin(L.a) });   // parking lots
  m.fillStyle = '#1e1640'; for (const p of MAP.props) if (p.t === 'runway') { const a = p.a * Math.PI / 180; box({ cx: p.x, cy: p.y, lw: p.w, lh: p.h, ca: Math.cos(a), sa: Math.sin(a) }); }   // runways
  if (AIRF) {                                                     // the Skyport (js/10f): the airfield, the apron, the runway and taxiways
    fill(AIRF.field, '#0f4a4a'); fill((MAP.yards || []).filter(y => y.k === 'ap'), '#2a2244');
    const r = AIRF.runway; m.fillStyle = '#1e1640'; m.fillRect(r.x - r.w / 2, r.y0, r.w, r.y1 - r.y0);
    m.lineWidth = AIRF.tw; m.lineCap = 'square'; for (const t of AIRF.taxiways) { m.beginPath(); t.forEach(([x, y], k) => k ? m.lineTo(x, y) : m.moveTo(x, y)); m.stroke(); }
    m.fillStyle = '#e8e6f0'; for (let y = r.y0 + 260; y < r.y1 - 260; y += 200) m.fillRect(r.x - 4, y, 8, 110);   // the centre line
  }
  if (BASEM) fill(BASEM.area, '#3d4430'); if (SPACEM) fill(SPACEM.area, '#0f4a4a'); if (LUNA) fill(LUNA.area, '#5a3a6a');   // the base, the space center, the lunapark (js/10g)
  if (PORTM) { m.fillStyle = '#2a2244'; for (const s of PORTM.stacks) m.fillRect(s[0], s[1], s[2] - s[0], s[3] - s[1]); }
  if (SPW) { fill(SPW.area, '#2e2a3c'); mapSpeedway(m, x => x, y => y, 1); }   // the speedway (js/10i)
  m.fillStyle = '#7a4ad9'; for (const r of SOLIDS) if (!r.bld && !r.gate && !r.wall) box(r);       // landmarks and props
  m.fillStyle = '#6a2cc9'; for (const r of BLD) box(r);
  for (const s of SVC.hospital) { m.fillStyle = '#f4f4f6'; box(s.r); const k = Math.min(s.r.lw, s.r.lh) * 0.8; m.fillStyle = '#e0364f'; m.fillRect(s.r.cx - k / 2, s.r.cy - k / 6, k, k / 3); m.fillRect(s.r.cx - k / 6, s.r.cy - k / 2, k / 3, k); }   // a red cross
  for (const s of SVC.police) { m.fillStyle = '#3f6bff'; box(s.r); if (s.lot) { m.fillStyle = '#2a3a8a'; box({ cx: s.lot.cx, cy: s.lot.cy, lw: s.lot.w, lh: s.lot.d, ca: Math.cos(s.lot.a), sa: Math.sin(s.lot.a) }); } }
}
function drawMini(time) {
  const size = miniCv.width, view = 1500, sc = size / view;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#0e2f8a'; mctx.fillRect(0, 0, size, size);
  mctx.imageSmoothingEnabled = true;
  mctx.setTransform(sc, 0, 0, sc, size / 2 - P.x * sc, size / 2 - P.y * sc); mctx.drawImage(mapCv, -MM, -MM, MW + 2 * MM, MH + 2 * MM);
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const mxp = x => size / 2 + (x - P.x) * sc, myp = y => size / 2 + (y - P.y) * sc, ph = Math.floor(time * 4) % 2 === 0;
  for (const c of cars) {
    const x = mxp(c.x), y = myp(c.y); if (x < 0 || y < 0 || x > size || y > size || c.dead) continue;
    if (c.t.cop && c.driver) { mctx.fillStyle = ph ? '#ff3b5c' : '#3f6bff'; mctx.fillRect(x - 5, y - 5, 10, 10); }
    else { mctx.fillStyle = '#8b90b8'; mctx.fillRect(x - 2, y - 2, 4, 4); }
  }
  planeIcons(mctx, mxp, myp, sc, (x, y) => x > -20 && y > -20 && x < size + 20 && y < size + 20);   // the planes (js/08i)
  shipIcons(mctx, mxp, myp, sc, (x, y) => x > -40 && y > -40 && x < size + 40 && y < size + 40);   // the ships (js/08k)
  svcIcons(mctx, mxp, myp, 6, (x, y) => x > -8 && y > -8 && x < size + 8 && y < size + 8);
  jobBlips(mctx, mxp, myp, size, 6, ph);                          // where the job sends you, an arrow at the edge if it is off the minimap (js/08n)
  if (P.stars > 0 && !PS.seen) searchRing(mctx, mxp(PS.lx), myp(PS.ly), PS.r * sc, ph, 2);
  mctx.save(); mctx.translate(size / 2, size / 2); mctx.rotate(P.ang);
  mctx.fillStyle = '#ffd23f'; mctx.beginPath(); mctx.moveTo(11, 0); mctx.lineTo(-8, -7); mctx.lineTo(-4, 0); mctx.lineTo(-8, 7); mctx.fill(); mctx.restore();
}
function svcIcons(g, X, Y, q, inView) {     // hospitals: a red cross on white; police stations: a white star on blue; stores: a $; rampages: a skull
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + Math.round(q * 1.6) + 'px Arial';
  for (const s of SVC.hospital) { const x = X(s.r.cx), y = Y(s.r.cy); if (!inView(x, y)) continue;
    g.fillStyle = '#ffffff'; g.fillRect(x - q, y - q, 2 * q, 2 * q); g.fillStyle = '#e0364f'; g.fillRect(x - q * 0.75, y - q * 0.25, q * 1.5, q * 0.5); g.fillRect(x - q * 0.25, y - q * 0.75, q * 0.5, q * 1.5); }
  for (const s of SVC.police) { const x = X(s.r.cx), y = Y(s.r.cy); if (!inView(x, y)) continue;
    g.fillStyle = '#3f6bff'; g.fillRect(x - q, y - q, 2 * q, 2 * q); g.fillStyle = '#ffffff'; g.fillText('\u2605', x, y + q * 0.08); }
  for (const s of (feat('stores') && STORES) || []) { const x = X(s.x), y = Y(s.y); if (!inView(x, y)) continue;   // stores (js/08e): a $ on the store's colour, at the door
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = s.color; g.fillRect(x - q, y - q, 2 * q, 2 * q); g.fillStyle = '#0b0614'; g.fillText('€', x, y + q * 0.08); }
  for (const s of (feat('clothes') && CSHOPS) || []) { const x = X(s.x), y = Y(s.y); if (!inView(x, y)) continue;   // clothes shops (js/08l): a coat hanger on the shop's colour
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = s.color; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.strokeStyle = '#0b0614'; g.lineWidth = Math.max(1.2, q * 0.22); g.beginPath(); g.moveTo(x, y - q * 0.25); g.lineTo(x - q * 0.7, y + q * 0.5); g.lineTo(x + q * 0.7, y + q * 0.5); g.closePath();
    g.moveTo(x, y - q * 0.25); g.lineTo(x, y - q * 0.45); g.arc(x, y - q * 0.62, q * 0.17, Math.PI / 2, -Math.PI * 0.9, true); g.stroke(); }
  if (feat('rampages')) for (const r of RAMPAGES) { if (!r.placed || !rampFound.has(r.id)) continue; const x = X(r.x), y = Y(r.y); if (inView(x, y)) skullIcon(g, x, y, q, rampDone.has(r.id)); }   // rampages you have found (js/08f)
  jobIcons(g, X, Y, q, inView);                                     // taxi ranks and fire stations (js/08n)
}
function searchRing(g, x, y, r, ph, lw) {   // where the police are looking for you: a red area with a blinking red / blue edge
  g.beginPath(); g.arc(x, y, Math.max(r, 3), 0, TAU); g.fillStyle = 'rgba(255,59,92,0.18)'; g.fill();
  g.lineWidth = lw; g.strokeStyle = ph ? '#ff3b5c' : '#3f6bff'; g.stroke();
}
/* full map: Tab or a tap on the minimap; the game waits while it is open */
let bigOpen = false;
function toggleBigMap(on) {
  bigOpen = on === undefined ? !bigOpen : on; $('bigmap').hidden = !bigOpen;
  if (bigOpen) { Snd.setEngine(false, 0, 0); Snd.setScreech(0); Snd.setSiren(0, 0); }
}
function drawBigMap(time) {
  const c = $('bigCv'), pr = Math.min(2, DPR), size = Math.floor(Math.min(VW, VH - 40) * 0.94);
  if (c.width !== Math.round(size * pr)) { c.width = c.height = Math.round(size * pr); c.style.width = c.style.height = size + 'px'; }
  const g = c.getContext('2d'), span = Math.max(MW, MH) + 2 * MM, k = c.width / span, ox = (span - MW) / 2 * k, oy = (span - MH) / 2 * k;
  const X = x => ox + x * k, Y = y => oy + y * k;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0e2f8a'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(mapCv, X(-MM), Y(-MM), (MW + 2 * MM) * k, (MH + 2 * MM) * k);
  g.font = Math.round(9 * pr) + 'px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [name, r] of MAP.districts) {
    const x = X((r[0] + r[2]) / 2), y = Y((r[1] + r[3]) / 2);
    g.fillStyle = '#000'; g.fillText(name, x + 2 * pr, y + 2 * pr); g.fillStyle = '#f1ead2'; g.fillText(name, x, y);
  }
  const ph = Math.floor(time * 4) % 2 === 0;
  planeIcons(g, X, Y, k * 1.6, () => true); shipIcons(g, X, Y, k, () => true); svcIcons(g, X, Y, 7 * pr, () => true); g.font = Math.round(9 * pr) + 'px "Press Start 2P", monospace';
  if (P.stars > 0 && !PS.seen) searchRing(g, X(PS.lx), Y(PS.ly), Math.max(PS.r * k, 5 * pr), ph, 2 * pr);
  for (const o of cars) if (o.t.cop && o.driver && !o.dead) { g.fillStyle = ph ? '#ff3b5c' : '#3f6bff'; g.fillRect(X(o.x) - 4 * pr, Y(o.y) - 4 * pr, 8 * pr, 8 * pr); }
  jobBlips(g, X, Y, 0, 6 * pr, ph);                                 // the job's targets (js/08n)
  g.save(); g.translate(X(P.x), Y(P.y)); g.rotate(P.ang); g.scale(pr * 1.4, pr * 1.4);
  g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(11, 0); g.lineTo(-8, -7); g.lineTo(-4, 0); g.lineTo(-8, 7); g.closePath(); g.stroke(); g.fill(); g.restore();
}

const H = { car: undefined, zone: '', score: '', hp: -1, ammo: '', wname: '', stars: -1, fade: null, vname: '', vinfo: '', hint: '', weapon: -1, hot: null, mute: null };
(function buildHud() {
  $('hpSegs').innerHTML = '<i></i>'.repeat(10); $('arSegs').innerHTML = '<i></i>'.repeat(10); $('stars').innerHTML = '<div class="star"></div>'.repeat(5);
  for (const b of document.querySelectorAll('#weaponbar button')) b.addEventListener('click', () => b.blur());
})();
function setText(id, key, v) { if (H[key] !== v) { H[key] = v; $(id).textContent = v; } }
function updateHud(time) {
  const cash = money(P.score); setText('score', 'score', cash); setText('cash', 'cash', cash);   // your score is your cash
  const hm = hpMax(), am0 = armorMax();                               // 100, more with a job's reward (js/08n)
  { const hn = Math.ceil(clamp(P.hp, 0, hm)), an = Math.ceil(clamp(P.armor, 0, am0));   // a touch screen: health and armor as numbers
    if (H.hn !== hn) { H.hn = hn; const e = $('hpNum'); e.textContent = hn; e.classList.toggle('low', hn <= 30); }
    if (H.an !== an) { H.an = an; const e = $('arNum'); e.textContent = an; e.hidden = an <= 0; } }
  const hp = Math.ceil(clamp(P.hp / hm, 0, 1) * 10);
  if (H.hp !== hp) { H.hp = hp; const segs = $('hpSegs'); [...segs.children].forEach((e, k) => e.classList.toggle('on', k < hp)); segs.classList.toggle('low', hp <= 3); }
  const ar = Math.ceil(clamp(P.armor / am0, 0, 1) * 10);              // body armor: a blue bar under the health, only while you wear some
  if (H.ar !== ar) { H.ar = ar; $('armorRow').hidden = ar <= 0; [...$('arSegs').children].forEach((e, k) => e.classList.toggle('on', k < ar)); }
  const w = WEAPONS[P.weapon], inf = RAMP.on && P.weapon === RAMP.on.wi, am = inf ? '\u221e' : String(P.ammo[P.weapon]).padStart(3, '0');   // a rampage: endless spare rounds
  const mel = isMelee(w); setText('wname', 'wname', w.short); setText('ammo', 'ammo', mel ? '--' : String(P.mag[P.weapon]).padStart(2, '0') + ' / ' + am);   // melee: no ammo
  $('ammo').classList.toggle('empty', !mel && !inf && P.mag[P.weapon] <= 0 && P.ammo[P.weapon] <= 0);
  { const rl = $('reload'), a = P.act; let on = true, t = 0, dur = 1, lab = '', col = '';   // one bar: stealing, being arrested, the stop order, reloading
    if (a) { t = a.t; dur = a.dur; lab = a.occ ? 'CARJACKING ' : 'STEALING '; col = 'var(--cyan)'; }
    else if (PS.bustT > 0 && !P.dead) { t = PS.bustT; dur = COP.bustTime; lab = 'ARRESTING '; col = 'var(--hot)'; }
    else if (PS.stopOn && P.stars > 0 && !P.dead) { t = PS.holdT; dur = COP.stopHold; lab = 'STAND STILL '; col = 'var(--yellow)'; }
    else if (P.relW >= 0) { t = P.rel; dur = WEAPONS[P.relW].reload; lab = 'RELOADING '; }
    else on = false;
    if (H.rl !== on) { H.rl = on; rl.classList.toggle('on', on); }
    if (H.ra !== col) { H.ra = col; rl.firstElementChild.style.background = col; }
    if (on) { rl.firstElementChild.style.width = Math.min(100, t / dur * 100) + '%'; rl.lastElementChild.textContent = lab + Math.max(0, dur - t).toFixed(1) + 's'; } }
  if (H.weapon !== P.weapon) { H.weapon = P.weapon; $('wIcon').innerHTML = wIcon(w); $('wIcon').style.color = w.color; }   // the weapon button shows the weapon in hand, in its colour
  setText('wAmmo', 'wAmmo', isMelee(WEAPONS[P.weapon]) ? (touchMode ? '' : WEAPONS[P.weapon].short) : pad(P.mag[P.weapon], 2) + '/' + (inf ? '\u221e' : pad(P.ammo[P.weapon], 3)));
  if (H.stars !== P.stars) { H.stars = P.stars; [...$('stars').children].forEach((e, k) => e.classList.toggle('on', k < P.stars)); }
  const fade = P.stars > 0 && !PS.seen; if (H.fade !== fade) { H.fade = fade; $('stars').classList.toggle('fade', fade); }   // the stars blink while they search, stay lit while they see you
  setText('clock', 'clock', skyText());
  const hot = P.stars > 0; if (H.hot !== hot) { H.hot = hot; miniCv.classList.toggle('hot', hot); }
  if (Snd.muted !== H.mute) { H.mute = Snd.muted; $('mute').textContent = Snd.muted ? 'MUTED' : 'SND'; }
  const c = P.car; let vname = 'ON FOOT', vinfo = '', hint = '';
  if (c) {
    vname = c.t.name; vinfo = (touchMode ? P.gear + '  ' : '') + Math.round(carSpeed(c) / KMH) + ' KM/H';
    if (c.hp / c.maxhp < 0.25) hint = c.burn > 0 ? 'ON FIRE! BAIL OUT!' : 'CAR ABOUT TO BLOW!';
    else if (c.t.weapon) hint = (touchMode ? 'FIRE: ' : 'CLICK OR J: ') + (c.t.weapon === 'water' ? 'WATER CANNON' : 'ROCKETS');
  } else if (P.act) { vinfo = P.act.c.t.name; hint = P.act.occ ? (touchMode ? 'FIGHTING FOR THE WHEEL! TAP TO LET GO' : 'FIGHTING FOR THE WHEEL! E TO LET GO') : ''; }
  else if (RAMP.on) hint = RAMP.on.name + ': ' + goalText(RAMP.on) + (RAMP.on.target === 'cars' ? ' - THEY COUNT WHEN THEY CATCH FIRE' : '');
  else { const n = nearestCar(), s = shopKey(), r = rampKey(); if (r) { vinfo = 'RAMPAGE: ' + r.name; hint = touchMode ? 'TAP RAMPAGE TO SEE IT' : 'PRESS E FOR THE RAMPAGE'; } else if (s) { vinfo = s.name; hint = touchMode ? 'TAP SHOP TO GO IN' : 'PRESS E TO SHOP'; } else if (n) { vinfo = n.t.name + ' NEARBY'; hint = touchMode ? 'TAP ENTER / EXIT' : 'PRESS E TO ENTER ' + n.t.name; } }
  storeUi(); rampUi(); rampHudUpdate(); jobHudUpdate();             // the SHOP and RAMPAGE buttons by you (js/08e, js/08f), the rampage's count and clock, the job's (js/08n)
  if (PS.stopOn && P.stars > 0 && !P.dead) hint = PS.holdT > 0 ? 'STAY STILL FOR THE FINE' : 'POLICE: STOP! STAND STILL FOR A FINE';
  const inCar = !!c; if (H.car !== c) {                            // getting in or out: the RADIO button, the touch layout, DASH or BRAKE, the car's name for a moment
    H.car = c; $('radioBtn').hidden = !inCar; document.documentElement.classList.toggle('in-car', inCar); $('bDash').innerHTML = inCar ? 'BRAKE' : 'DASH';
    if (inCar) { $('shifter').dataset.k = c.t.shifter; const n = $('carName'); n.textContent = c.t.name; n.className = ''; void n.offsetWidth; n.className = 'show'; }
  }
  { const dh = deliveryHint(); if (dh && !P.act && !(PS.stopOn && P.stars > 0)) hint = dh; }   // at the export bay (js/08m) its word comes first
  { const jh = jobHint(); if (jh && !P.act && !(PS.stopOn && P.stars > 0) && (JOB.on || !hint)) hint = jh; }   // a vehicle job: what to do now (js/08n)
  { const nz = nitroHere(c), nb = $('bNitro'); if (nb.hidden === nz) nb.hidden = !nz; if (nz) nb.classList.toggle('wait', JOB.nitroCd > 0); }   // NITRO in a taxi, once earned
  setText('vname', 'vname', vname); setText('vinfo', 'vinfo', vinfo); setText('hint', 'hint', hint);
  const drop = !!c && isThrown(WEAPONS[P.weapon]), bf = $('bFire'), noFire = !!c && !c.t.weapon && !drop && !canDriveBy(); if (bf.hidden !== noFire) bf.hidden = noFire;   // in the tank FIRE launches rockets; with a bomb in hand it drops one; with a gun: the drive-by
  const shf = $('shifter'); if (shf.hidden === !!c) shf.hidden = !c;
  const zone = P.dead ? H.zone : districtAt(P.x, P.y);
  if (zone !== H.zone) { H.zone = zone; const z = $('zone'); z.textContent = zone; z.className = ''; void z.offsetWidth; z.className = 'show'; }
  drawMini(time);
  if (bigOpen) drawBigMap(time);
}

