'use strict';
/* ---------- 6w. SUNSTRIP MOTORS: buying a car (the building: js/10s) ----------
   (js/01j showroom) Walk into the showroom and up to a turntable: BUY that car (E, or the button by you). The card gives its price, top
   speed, 0-100 km/h and weight, the colours it comes in (the one on the turntable repaints as you pick) and where to deliver it: a garage
   bay or reserved space of a safehouse you own that is free. Paid, it waits there - it shows up when you come by (js/08s), kept in your
   saves like any car you park there. No free space: buy a safehouse, or drive a car out of one. */
const SHOWB = { at: null, color: null, to: -1, opts: [] };
function showKey() {                      // the turntable you stand by, or null
  if (!SHOWM || !feat('showroom') || P.car || P.dead || P.act || state !== 'play' || !showIn(P.x, P.y, 0)) return null;
  let best = null, bd = 1e9; for (const S of SHOW.slots) { const d = dist(S.x, S.y, P.x, P.y); if (d < S.r + 26 && d < bd) { bd = d; best = S; } }
  return best;
}
function showUi() {                       // every frame (js/14): the BUY button by you
  const S = showKey(), b = $('carBtn');
  if (!S) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden || b.dataset.s !== S.type) { b.hidden = false; b.dataset.s = S.type; b.querySelector('b').textContent = CAR_TYPES[S.type].name + ' · ' + money(CAR_TYPES[S.type].price); }
  doorBtnAt(b);
}
$('carBtn').addEventListener('click', e => { e.stopPropagation(); const S = showKey(); if (S) openCarCard(S); });
function showSpaces() {                   // every free garage bay or reserved space of a safehouse you own: [{ h, k }]
  const out = [];
  for (const h of SAFES) if (h.own) h.keep.forEach((s, k) => { if (!s && !h.live[k]) out.push({ h, k }); });
  return out;
}
function openCarCard(S) {
  const t = CAR_TYPES[S.type], rare = !t.traffic && !t.parked;
  SHOWB.at = S; SHOWB.color = S.color; SAFEST.ret = 'play'; state = 'safe'; toggleBigMap(false); toggleWheel(false); hush(); $('carBtn').hidden = true;
  $('ccTag').textContent = 'SUNSTRIP MOTORS' + (rare ? ' · SOLD ONLY HERE' : ''); $('ccName').textContent = t.name;
  $('ccSub').textContent = 'YOUR CASH ' + money(P.score);
  const v = VEHICLE_TABLE.vehicles.find(q => q.id === S.type);
  $('ccPrice').textContent = money(t.price); $('ccTop').textContent = Math.round(v.top) + ' KM/H'; $('ccAcc').textContent = (v.accTo >= v.top ? 'TOP SPEED IN ' : '') + v.accS + ' S';
  $('ccKg').textContent = Math.round(v.kg).toLocaleString('en-US') + ' KG'; $('ccNote').textContent = v.notes && rare ? v.notes.replace(/ Sold only at the Sunstrip showroom\./, '') : '';
  const cols = $('ccCols'); cols.textContent = '';
  for (const c of t.colors) { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.title = c; b.addEventListener('click', () => pickCarColor(c)); cols.appendChild(b); }
  SHOWB.opts = showSpaces(); SHOWB.to = SHOWB.opts.length ? 0 : -1;
  const to = $('ccTo'); to.textContent = '';
  if (!SHOWB.opts.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'NO FREE SPACE: BUY A SAFEHOUSE, OR DRIVE A CAR OUT OF ONE'; to.appendChild(p); }
  const seen = new Set();
  SHOWB.opts.forEach((o, i) => { if (seen.has(o.h.id)) return; seen.add(o.h.id); const n = SHOWB.opts.filter(q => q.h === o.h).length, b = document.createElement('button'); b.type = 'button'; b.className = 'ccTo';
    b.textContent = o.h.name + ' · ' + n + ' FREE ' + (o.h.site ? (n > 1 ? 'BAYS' : 'BAY') : (n > 1 ? 'SPACES' : 'SPACE')); b.dataset.i = i; b.addEventListener('click', () => { SHOWB.to = i; paintCarCard(); }); to.appendChild(b); });
  $('ccMsg').textContent = ''; paintCarCard(); showCard('carCard', true); Snd.tone(523, 659, 0.12, 0.1, 'square');
}
function paintCarCard() {
  for (const b of $('ccCols').children) b.classList.toggle('sel', b.dataset.c === SHOWB.color);
  for (const b of $('ccTo').querySelectorAll('button')) b.classList.toggle('on', +b.dataset.i === SHOWB.to);
  const t = CAR_TYPES[SHOWB.at.type]; $('ccBuy').textContent = 'BUY ' + money(t.price); $('ccBuy').disabled = SHOWB.to < 0;
}
function pickCarColor(c) {                // the car on the turntable takes the colour too
  SHOWB.color = c; const S = SHOWB.at; S.color = c;
  if (S.car && S.car.m) { S.car.m.body.color.set(c); S.car.m.body.emissive = new THREE.Color(c).multiplyScalar(0.22); if (S.car.m.ug) S.car.m.ug.material = glowMat(c, 0.9); }
  paintCarCard();
}
function buyCar() {
  const S = SHOWB.at; if (!S || state !== 'safe') return;
  const t = CAR_TYPES[S.type], o = SHOWB.opts[SHOWB.to];
  if (!o || o.h.keep[o.k] || o.h.live[o.k]) { $('ccMsg').textContent = 'NO FREE SPACE TO DELIVER IT TO'; Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
  if (P.score < t.price) { $('ccMsg').textContent = 'NOT ENOUGH CASH - ' + money(t.price - P.score) + ' SHORT'; Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
  P.score -= t.price; o.h.keep[o.k] = { type: S.type, color: SHOWB.color };
  closeSafeCard(); toast(t.name + ' DELIVERED · ' + o.h.name);
  Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.1, 0.12, 'square'), 110);
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
$('ccBuy').addEventListener('click', buyCar);
function showIcons(g, X, Y, q, inView) {  // js/14: a car at the showroom's door on the maps
  if (!SHOWM || !feat('showroom')) return;
  const x = X(SHOWM.door[0]), y = Y(SHOWM.door[1]); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.fillRect(x - q * 1.25, y - q * 0.75, q * 2.5, q * 1.5);
  g.fillStyle = '#ff2bd6'; g.fillRect(x - q * 1.05, y - q * 0.2, q * 2.1, q * 0.7); g.fillRect(x - q * 0.55, y - q * 0.6, q * 1.1, q * 0.5);
  g.fillStyle = '#f4f4f6'; g.fillRect(x - q * 0.75, y + q * 0.42, q * 0.4, q * 0.3); g.fillRect(x + q * 0.35, y + q * 0.42, q * 0.4, q * 0.3);
}
