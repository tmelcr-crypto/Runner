'use strict';
/* ---------- 8. HUD & MINIMAP ---------- */
let mapCv = null;
function buildMiniMap() {
  const sc = 560 / W, cs = Math.round((W + 2 * MM) * sc), o = MM * sc;
  mapCv = document.createElement('canvas'); mapCv.width = mapCv.height = cs;
  const m = mapCv.getContext('2d'), X = v => o + v * sc;
  m.fillStyle = '#07030f'; m.fillRect(0, 0, cs, cs);
  const lk = k => EDGE[k] === 'lake';
  m.fillStyle = '#3a1a7a'; if (!lk('n')) m.fillRect(0, X(-EDGE_D), cs, EDGE_D * sc); if (!lk('s')) m.fillRect(0, X(W), cs, EDGE_D * sc);
  if (!lk('w')) m.fillRect(X(-EDGE_D), 0, EDGE_D * sc, cs); if (!lk('e')) m.fillRect(X(W), 0, EDGE_D * sc, cs);
  m.fillStyle = '#0e2f8a'; if (lk('n')) m.fillRect(0, 0, cs, X(-BEACH)); if (lk('s')) m.fillRect(0, X(W + BEACH), cs, cs); if (lk('w')) m.fillRect(0, 0, X(-BEACH), cs); if (lk('e')) m.fillRect(X(W + BEACH), 0, cs, cs);
  m.fillStyle = '#4a3a7e';
  const rx0 = lk('w') ? -BEACH : 0, rx1 = lk('e') ? W + BEACH : W, ry0 = lk('n') ? -BEACH : 0, ry1 = lk('s') ? W + BEACH : W;
  m.fillRect(X(rx0), X(ry0), (rx1 - rx0) * sc, (ry1 - ry0) * sc);
  m.fillStyle = '#2a1f55';
  for (let i = 0; i <= N; i++) { m.fillRect(X(i * CELL), X(0), ROAD * sc + 0.6, W * sc); m.fillRect(X(0), X(i * CELL), W * sc, ROAD * sc + 0.6); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const lx = X(i * CELL + ROAD), ly = X(j * CELL + ROAD);
    if (LOTS[i][j].park) { m.fillStyle = '#0c5a58'; m.fillRect(lx, ly, LOT * sc, LOT * sc); }
    else { m.fillStyle = '#6a2cc9'; m.fillRect(lx + SW * sc, ly + SW * sc, (LOT - 2 * SW) * sc, (LOT - 2 * SW) * sc); }
  }
}
function drawMini(time) {
  const size = miniCv.width, view = 1300, sc = size / view;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#07030f'; mctx.fillRect(0, 0, size, size);
  mctx.imageSmoothingEnabled = false;
  mctx.setTransform(sc, 0, 0, sc, size / 2 - P.x * sc, size / 2 - P.y * sc); mctx.drawImage(mapCv, -MM, -MM, W + 2 * MM, W + 2 * MM);
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

const H = { score: '', hp: -1, ammo: '', wname: '', stars: -1, fade: null, vname: '', vhp: -1, vinfo: '', hint: '', weapon: -1, hot: null, mute: null };
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
  { const rl = $('reload'), a = P.act, on = !!a || P.relW >= 0, t = a ? a.t : P.rel, dur = a ? a.dur : RELOAD_T, lab = a ? (a.k === 'steal' ? 'STEALING ' : 'STARTING ') : 'RELOADING ';
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
    vname = c.t.name; vhp = Math.round(c.hp / c.maxhp * 100); vinfo = (touchMode ? P.gear + '  ' : '') + Math.round(carSpeed(c) * 0.3) + ' KM/H';
    if (c.hp / c.maxhp < 0.25) hint = c.burn > 0 ? 'ON FIRE! BAIL OUT!' : 'CAR ABOUT TO BLOW!';
  } else { const n = nearestCar(); if (n) { vinfo = n.t.name + ' NEARBY'; hint = touchMode ? 'TAP ENTER / EXIT' : 'PRESS E TO ENTER ' + n.t.name; } }
  setText('vname', 'vname', vname); setText('vinfo', 'vinfo', vinfo); setText('hint', 'hint', hint);
  if (H.vhp !== vhp) { H.vhp = vhp; const bar = $('vbar'); bar.style.visibility = c ? 'visible' : 'hidden'; const i = bar.firstElementChild; i.style.width = vhp + '%'; i.style.background = vhp > 50 ? 'var(--good)' : vhp > 25 ? 'var(--yellow)' : 'var(--hot)'; }
  const bf = $('bFire'); if (bf.hidden !== !!c) bf.hidden = !!c;
  const shf = $('shifter'); if (shf.hidden === !!c) shf.hidden = !c;
  drawMini(time);
}

