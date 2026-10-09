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
  m.fillStyle = '#7a4ad9'; for (const r of SOLIDS) if (!r.bld && !r.gate) box(r);       // landmarks and props
  m.fillStyle = '#6a2cc9'; for (const r of BLD) box(r);
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
    if (c.type === 'police' && c.driver) { mctx.fillStyle = ph ? '#ff3b5c' : '#3f6bff'; mctx.fillRect(x - 5, y - 5, 10, 10); }
    else { mctx.fillStyle = '#8b90b8'; mctx.fillRect(x - 2, y - 2, 4, 4); }
  }
  for (const p of pickups) { const x = mxp(p.x), y = myp(p.y); if (x < 0 || y < 0 || x > size || y > size) continue; mctx.fillStyle = p.type === 'cash' ? '#58e08a' : p.type === 'health' ? '#ff6b86' : '#3fe0ff'; mctx.fillRect(x - 2, y - 2, 4, 4); }
  mctx.save(); mctx.translate(size / 2, size / 2); mctx.rotate(P.ang);
  mctx.fillStyle = '#ffd23f'; mctx.beginPath(); mctx.moveTo(11, 0); mctx.lineTo(-8, -7); mctx.lineTo(-4, 0); mctx.lineTo(-8, 7); mctx.fill(); mctx.restore();
}
/* full map: Tab or the MAP button; the game waits while it is open */
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
  for (const p of pickups) { g.fillStyle = p.type === 'cash' ? '#58e08a' : p.type === 'health' ? '#ff6b86' : '#3fe0ff'; g.fillRect(X(p.x) - 2 * pr, Y(p.y) - 2 * pr, 4 * pr, 4 * pr); }
  for (const o of cars) if (o.type === 'police' && o.driver && !o.dead) { g.fillStyle = ph ? '#ff3b5c' : '#3f6bff'; g.fillRect(X(o.x) - 4 * pr, Y(o.y) - 4 * pr, 8 * pr, 8 * pr); }
  g.save(); g.translate(X(P.x), Y(P.y)); g.rotate(P.ang); g.scale(pr * 1.4, pr * 1.4);
  g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(11, 0); g.lineTo(-8, -7); g.lineTo(-4, 0); g.lineTo(-8, 7); g.closePath(); g.stroke(); g.fill(); g.restore();
}

const H = { zone: '', score: '', hp: -1, ammo: '', wname: '', stars: -1, fade: null, vname: '', vhp: -1, vinfo: '', hint: '', weapon: -1, hot: null, mute: null };
(function buildHud() {
  $('hpSegs').innerHTML = '<i></i>'.repeat(10); $('stars').innerHTML = '<div class="star"></div>'.repeat(5);
  for (const b of document.querySelectorAll('#weaponbar button')) b.addEventListener('click', () => b.blur());
})();
function setText(id, key, v) { if (H[key] !== v) { H[key] = v; $(id).textContent = v; } }
function updateHud(time) {
  setText('score', 'score', String(P.score).padStart(8, '0'));
  const hp = Math.ceil(clamp(P.hp, 0, 100) / 10);
  if (H.hp !== hp) { H.hp = hp; const segs = $('hpSegs'); [...segs.children].forEach((e, k) => e.classList.toggle('on', k < hp)); segs.classList.toggle('low', hp <= 3); }
  const w = WEAPONS[P.weapon], am = String(P.ammo[P.weapon]).padStart(3, '0');
  setText('wname', 'wname', w.name); setText('ammo', 'ammo', String(P.mag[P.weapon]).padStart(2, '0') + ' / ' + am);
  $('ammo').classList.toggle('empty', P.mag[P.weapon] <= 0 && P.ammo[P.weapon] <= 0);
  { const rl = $('reload'), a = P.act, on = !!a || P.relW >= 0, t = a ? a.t : P.rel, dur = a ? a.dur : RELOAD_T, lab = a ? (a.occ ? 'CARJACKING ' : 'STEALING ') : 'RELOADING ';
    if (H.rl !== on) { H.rl = on; rl.classList.toggle('on', on); }
    if (H.ra !== !!a) { H.ra = !!a; rl.firstElementChild.style.background = a ? 'var(--cyan)' : ''; }
    if (on) { rl.firstElementChild.style.width = Math.min(100, t / dur * 100) + '%'; rl.lastElementChild.textContent = lab + Math.max(0, dur - t).toFixed(1) + 's'; } }
  if (H.weapon !== P.weapon) { H.weapon = P.weapon; $('w0').classList.toggle('on', P.weapon === 0); $('w1').classList.toggle('on', P.weapon === 1); }
  if (H.stars !== P.stars) { H.stars = P.stars; [...$('stars').children].forEach((e, k) => e.classList.toggle('on', k < P.stars)); }
  const fade = P.stars > 0 && P.sinceCrime > 5; if (H.fade !== fade) { H.fade = fade; $('stars').classList.toggle('fade', fade); }
  const hot = P.stars > 0; if (H.hot !== hot) { H.hot = hot; miniCv.classList.toggle('hot', hot); }
  if (Snd.muted !== H.mute) { H.mute = Snd.muted; $('mute').textContent = Snd.muted ? 'MUTED' : 'SND'; }
  const c = P.car; let vname = 'ON FOOT', vinfo = '', vhp = 0, hint = '';
  if (c) {
    vname = c.t.name; vhp = Math.round(c.hp / c.maxhp * 100); vinfo = (touchMode ? P.gear + '  ' : '') + Math.round(carSpeed(c) / KMH) + ' KM/H';
    if (c.hp / c.maxhp < 0.25) hint = c.burn > 0 ? 'ON FIRE! BAIL OUT!' : 'CAR ABOUT TO BLOW!';
  } else if (P.act) { vinfo = P.act.c.t.name; hint = P.act.occ ? (touchMode ? 'FIGHTING FOR THE WHEEL! TAP TO LET GO' : 'FIGHTING FOR THE WHEEL! E TO LET GO') : ''; }
  else { const n = nearestCar(); if (n) { vinfo = n.t.name + ' NEARBY'; hint = touchMode ? 'TAP ENTER / EXIT' : 'PRESS E TO ENTER ' + n.t.name; } }
  setText('vname', 'vname', vname); setText('vinfo', 'vinfo', vinfo); setText('hint', 'hint', hint);
  if (H.vhp !== vhp) { H.vhp = vhp; const bar = $('vbar'); bar.style.visibility = c ? 'visible' : 'hidden'; const i = bar.firstElementChild; i.style.width = vhp + '%'; i.style.background = vhp > 50 ? 'var(--good)' : vhp > 25 ? 'var(--yellow)' : 'var(--hot)'; }
  const bf = $('bFire'); if (bf.hidden !== !!c) bf.hidden = !!c;
  const shf = $('shifter'); if (shf.hidden === !!c) shf.hidden = !c;
  const zone = P.dead ? H.zone : districtAt(P.x, P.y);
  if (zone !== H.zone) { H.zone = zone; const z = $('zone'); z.textContent = zone; z.className = ''; void z.offsetWidth; z.className = 'show'; }
  drawMini(time);
  if (bigOpen) drawBigMap(time);
}

