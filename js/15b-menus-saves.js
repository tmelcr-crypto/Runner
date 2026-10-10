'use strict';
/* ---------- 9b. MENUS, NEW GAME OPTIONS, SAVED GAMES ----------
   The title menu (continue, new game, load game, help, the city file preview), the New game screen (its choices go into OPT, js/06),
   the pause menu (Esc, P or the MENU button; the game also pauses when you switch away from it), the help pages, and saved games:
   an autosave every minute while no police are after you, three slots, and save files to download and open again (to move a game
   to another device). Saves live in this browser's localStorage, with a small picture of the screen.
   Keys in the menus: the arrows move between the buttons, left / right change an option, Enter picks, Esc goes back. */

/* ---------- the New game choices ---------- */
const hhmm = h => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
const dayLen = f => Math.round(SKYP.dayMinutes / 60 / f) + ' MIN DAY';
const NEW_OPTS = [
  { k: 'time', name: 'TIME OF DAY', tip: 'The hour on the clock when the game starts.',
    vals: [[SKYP.sunrise, 'DAWN'], [9, 'MORNING'], [12, 'NOON'], [SKYP.startHour, 'EVENING'], [23, 'NIGHT']].map(([v, n]) => [v, n + ' ' + hhmm(v)]) },
  { k: 'weather', name: 'WEATHER', vals: [['change', 'CHANGING', 'It starts clear and changes every few minutes: clouds, rain, storms, fog.'], ['clear', 'ALWAYS CLEAR'], ['cloudy', 'ALWAYS CLOUDY'],
    ['rain', 'ALWAYS RAIN', 'Wet roads all game: less grip, slower traffic, umbrellas.'], ['storm', 'ALWAYS STORM', 'A downpour all game, with lightning and thunder. Slippery.'], ['fog', 'ALWAYS FOG', 'You see less far all game - and so do the police.']] },
  { k: 'clock', name: 'CLOCK', vals: [[2, 'FAST: ' + dayLen(2)], [1, 'NORMAL: ' + dayLen(1)], [0.5, 'SLOW: ' + dayLen(0.5)], [0, 'STOPPED', 'The hour never changes: it stays the time of day you start at.']],
    tip: 'How long a whole day lasts, from one midnight to the next.' },
  { k: 'police', name: 'POLICE', vals: [[0.6, 'RELAXED', 'Less heat for each crime, fewer cars sent and later, and they give up sooner.'], [1, 'NORMAL', 'As set in the police table.'],
    [1.5, 'TOUGH', 'More heat for each crime, more cars sent sooner, and they search longer.']] },
  { k: 'crowd', name: 'STREETS', vals: [[0.55, 'QUIET'], [1, 'BUSY'], [1.35, 'PACKED', 'The most traffic and people. Lower it if an older phone stutters.']], tip: 'How much traffic and how many people are about.' },
  { k: 'start', name: 'START IN', tip: 'Where you stand when the game starts. The hospitals and police stations are on the map (TAB).',
    vals: [['usual', 'USUAL SPOT: ' + (districtAt(MAP.start[0], MAP.start[1]) || 'THE CITY')], ['random', 'A RANDOM STREET'], ...MAP.districts.map(d => [d[0], d[0]])] },
];
const NEWOPT = Object.assign({}, OPT_DEF);           // what the New game screen shows: the last choices, kept in this browser
try { const o = JSON.parse(localStorage.getItem('blockrunner.opts')); if (o) for (const r of NEW_OPTS) if (r.vals.some(v => v[0] === o[r.k])) NEWOPT[r.k] = o[r.k]; } catch (e) { }
const optAt = r => Math.max(0, r.vals.findIndex(v => v[0] === NEWOPT[r.k]));
function stepOpt(r, d) {
  NEWOPT[r.k] = r.vals[(optAt(r) + d + r.vals.length) % r.vals.length][0]; paintOpts(); optTip(r);
  try { localStorage.setItem('blockrunner.opts', JSON.stringify(NEWOPT)); } catch (e) { }
}
function paintOpts() { for (const b of $('optRows').children) b.querySelector('b').textContent = (r => r.vals[optAt(r)][1])(NEW_OPTS.find(r => r.k === b.dataset.k)); }
function optTip(r) { const v = r.vals[optAt(r)]; $('optTip').textContent = v[2] || r.tip || ''; }
for (const r of NEW_OPTS) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = r.k;
  b.innerHTML = '<span>' + r.name + '</span><span class="ov"><i class="l" aria-label="previous">&#9664;</i><b></b><i class="r" aria-label="next">&#9654;</i></span>';
  b.addEventListener('click', e => stepOpt(r, e.target.classList.contains('l') ? -1 : 1));   // a tap: the next choice (the left arrow: the one before)
  b.addEventListener('focus', () => optTip(r));
  $('optRows').appendChild(b);
}
paintOpts();
function newGame() { Object.assign(OPT, NEWOPT); gameMode = newMode; startGame(); }

/* the modes (js/01j): NEW GAME asks first - FREE ROAM goes on to its options; one that is not built yet shows COMING SOON */
let newMode = 'free';
function paintModes() {
  for (const b of document.querySelectorAll('#modeCard .modeBtn')) {
    const m = MODE[b.dataset.mode]; b.disabled = !m.ready; b.innerHTML = m.name + (m.ready ? '' : '<small>COMING SOON</small>');
    document.querySelector('#modeCard .modeNote[data-mode="' + m.id + '"]').textContent = m.note;
  }
}
for (const b of document.querySelectorAll('#modeCard .modeBtn')) b.addEventListener('click', () => { newMode = b.dataset.mode; $('newTitle').textContent = MODE[newMode].name; showCard('newCard'); });
const modeOf = d => (MODE[d && d.mode] && MODE[d.mode].ready ? d.mode : 'free');   // a saved game's mode (older saves: free roam)

/* ---------- the cards: one shows at a time; Back returns to the one before ---------- */
let cardStack = [];
const curCard = () => cardStack[cardStack.length - 1];
function showCard(id, fresh) {                       // fresh: start a new stack (the title, the pause menu, game over)
  if (fresh) cardStack = []; if (curCard() !== id) cardStack.push(id);
  for (const c of document.querySelectorAll('#overlay > .card')) c.hidden = c.id !== id;
  const ov = $('overlay'); ov.hidden = false; ov.classList.toggle('dim', state === 'pause' || state === 'shop' || state === 'ramp'); document.documentElement.classList.add('menus');
  if (id === 'startCard') paintTitle(); else if (id === 'pauseCard') paintPause(); else if (id === 'newCard') { $('newWarn').hidden = state !== 'pause'; optTip(NEW_OPTS[0]); } else if (id === 'modeCard') paintModes();
  const first = $(id).querySelector('.pri:not([hidden])') || $(id).querySelector('button:not([hidden]):not(:disabled)'); if (first) first.focus({ preventScroll: true });   // .pri: what Enter does
  $('overlay').scrollTop = 0;
}
function back() {
  const id = curCard();
  if (id === 'pauseCard') resumeGame();
  else if (id === 'shopCard') closeShop();
  else if (id === 'rampCard') closeRamp();
  else if (cardStack.length > 1) { cardStack.pop(); const prev = cardStack.pop(); showCard(prev); }
}
function closeMenus() { cardStack = []; $('overlay').hidden = true; $('overlay').classList.remove('dim'); document.documentElement.classList.remove('menus'); }
for (const b of document.querySelectorAll('#overlay .back')) b.addEventListener('click', back);

/* the title */
function paintTitle() {
  const d = latestSave();
  $('contBtn').hidden = !d; $('contInfo').hidden = !d; if (d) $('contInfo').textContent = saveLine(d);
  $('newBtn').classList.toggle('alt', !!d);                       // with a save to continue, CONTINUE is the main button
  $('bestLine').textContent = best > 0 ? 'MOST CASH ' + money(best) : 'Steal a car, make trouble, outrun the police.';
}
function showTitle() { state = 'menu'; $('hud').hidden = true; $('shifter').hidden = true; hush(); showCard('startCard', true); }
$('contBtn').addEventListener('click', () => { const d = latestSave(); if (d) loadGame(d); });
$('newBtn').addEventListener('click', () => showCard('modeCard'));
$('goBtn').addEventListener('click', newGame);
$('loadBtn').addEventListener('click', () => openSlots('load'));
$('helpBtn').addEventListener('click', () => showCard('helpCard'));

/* the pause menu */
function hush() { Snd.setEngine(false, 0, 0); Snd.setScreech(0); Snd.setSiren(0, 0); Snd.setRain(0); }
function pauseGame() {
  if (state !== 'play') return;
  toggleBigMap(false); toggleWheel(false); state = 'pause'; hush(); showCard('pauseCard', true);
  snapReq.push(t => { lastThumb = t; });                          // a picture for the save, taken from the next frame
}
function resumeGame() { if (state !== 'pause') return; state = 'play'; closeMenus(); }
function paintPause() {
  $('pauseInfo').textContent = MODE[gameMode].name + '  ·  ' + skyText() + '  ·  ' + (districtAt(P.x, P.y) || 'THE CITY') + '  ·  ' + money(P.score) + (feat('rampages') ? '  ·  RAMPAGES ' + rampDone.size + '/' + RAMPAGES.length : '');
  const why = saveBlock(); $('saveBtn').disabled = !!why; $('saveWhy').textContent = why; $('saveWhy').hidden = !why;
}
function quitToTitle() {
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
  if (P.score > best) { best = P.score; try { localStorage.setItem('blockrunner.best', String(best)); } catch (e) { } }
  showTitle();
}
$('menuBtn').addEventListener('click', () => { if (state === 'play') pauseGame(); });
$('mapMenu').addEventListener('click', e => { e.stopPropagation(); if (state !== 'play') return; toggleBigMap(false); pauseGame(); });   // the city map's MENU (on a touch screen the only one)
$('resumeBtn').addEventListener('click', resumeGame);
$('saveBtn').addEventListener('click', () => openSlots('save'));
$('pLoadBtn').addEventListener('click', () => openSlots('load'));
$('pNewBtn').addEventListener('click', () => showCard('modeCard'));
$('pHelpBtn').addEventListener('click', () => showCard('helpCard'));
$('quitBtn').addEventListener('click', quitToTitle);
document.addEventListener('visibilitychange', () => {           // switching to another app or tab: pause, and keep the game safe
  if (document.hidden && state === 'play') { if (!saveBlock()) putSave('auto', makeSave(lastThumb)); pauseGame(); }
  else if (document.hidden && state === 'shop' && shopBought && !saveBlock()) putSave('auto', makeSave(lastThumb));   // in a store: keep what you bought
});

/* game over (only when starting again at a hospital or police station is switched off in the police table) */
$('againBtn').addEventListener('click', () => startGame());
$('oLoadBtn').addEventListener('click', () => openSlots('load'));
$('oMenuBtn').addEventListener('click', showTitle);

/* help: one page per tab; the WEAPONS page comes from the weapon table (js/01f): its name and how to use it; the points from js/01i */
{ const rg = id => Array.isArray(ECO[id]) ? money(ECO[id][0]) + '-' + ECO[id][1] : money(ECO[id]);
  $('helpPoints').textContent = 'Your score is your cash. Every car you steal or hijack has ' + rg('carCash') + ' inside. Killing pays nothing by itself: the dead drop a cash stack ('
    + rg('pedCash') + ', police ' + rg('copCash') + ') and the weapon they carried - pick them up within ' + ECO.dropTime + ' s. ' + ECO.townN + ' cash stacks of ' + rg('townCash')
    + ' lie around town (not on the maps). Destroying pays nothing.'; }
for (const w of WEAPONS) { const d = document.createElement('div'), h = document.createElement('h3'), u = document.createElement('ul'), li = document.createElement('li'); h.textContent = w.name; li.textContent = w.howTo || ''; u.append(li); d.append(h, u); $('helpArms').append(d); }
for (const t of document.querySelectorAll('#helpTabs button')) t.addEventListener('click', () => {
  for (const u of document.querySelectorAll('#helpTabs button')) u.classList.toggle('on', u === t);
  for (const p of document.querySelectorAll('#helpCard .page')) p.hidden = p.dataset.tab !== t.dataset.tab;
});

/* ---------- saved games ---------- */
const SAVE_KEY = 'blockrunner.save.', SLOTS = ['auto', '1', '2', '3'], SAVE_V = 1;
let autoT = 0, lastThumb = '';
const snapReq = [];                                  // jobs waiting for the next frame's picture (afterRender, called by js/15 right after render)
function getSave(s) { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY + s)); return d && d.v === SAVE_V && d.P ? d : null; } catch (e) { return null; } }
function putSave(s, d) { try { localStorage.setItem(SAVE_KEY + s, JSON.stringify(d)); return true; } catch (e) { return false; } }
function latestSave() { let b = null; for (const s of SLOTS) { const d = getSave(s); if (d && (!b || d.t > b.t)) b = d; } return b; }
function saveBlock() {                               // why you cannot save now ('' = you can)
  if (RAMP.on) return 'FINISH THE RAMPAGE FIRST';
  if (P.stars > 0) return 'LOSE THE POLICE FIRST';
  if (P.dead || P.busted) return 'NOT NOW';
  if (P.act) return 'FINISH THE CARJACKING FIRST';
  if (P.car && (P.car.dead || P.car.burn > 0 || P.car.sunk || P.car.air > 0)) return 'GET OUT OF THAT WRECK FIRST';
  return '';
}
function makeSave(thumb) {
  const c = P.car;
  return { v: SAVE_V, t: Date.now(), mode: gameMode, where: districtAt(P.x, P.y) || '', opt: Object.assign({}, OPT), gameT,
    P: { x: P.x, y: P.y, ang: P.ang, hp: P.hp, armor: P.armor, weapon: WEAPONS[P.weapon].id, arms: Object.fromEntries(WEAPONS.map((w, i) => [w.id, [P.mag[i], P.ammo[i], P.has[i] ? 1 : 0]])), score: P.score, kills: P.kills, maxStars: P.maxStars },
    car: c ? { type: c.type, color: c.color, hp: c.hp, x: c.x, y: c.y, ang: c.ang, radio: c.radio } : null,
    ramp: { found: [...rampFound], done: [...rampDone] },
    sky: { hour: SKY.hour, kind: SKY.kind, left: SKY.left, cloud: SKY.cloud, rain: SKY.rain, fog: SKY.fog, storm: SKY.storm, wet: SKY.wet }, thumb: thumb || '' };
}
function saveSpot(sv) {                              // where a saved game puts you (null: the spot is no good on this map, start at the usual one)
  const p = sv.P || {}, c = sv.car, num = v => typeof v === 'number' && isFinite(v);
  if (c && CAR_TYPES[c.type] && num(c.x) && num(c.y) && shoreDist(c.x, c.y) > 0) {
    const car = makeCar(c.type, c.x, c.y, num(c.ang) ? c.ang : 0, null, typeof c.color === 'string' ? c.color : undefined);
    if (num(c.hp)) car.hp = clamp(c.hp, 1, car.hp);
    if (Number.isInteger(c.radio) && c.radio < RADIO.length) car.radio = Math.max(-1, c.radio);
    return { x: car.x, y: car.y, ang: car.ang, car };
  }
  if (num(p.x) && num(p.y) && !pedBlocked(p.x, p.y) && shoreDist(p.x, p.y) > 4) return { x: p.x, y: p.y, ang: num(p.ang) ? p.ang : 0 };
  return null;
}
function applySave(sv) {                             // called by resetGame (js/15) once the city is set up again
  const p = sv.P, n = (v, lo, hi, d) => typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d;
  P.hp = n(p.hp, 1, 100, 100); P.armor = n(p.armor, 0, 100, 0); P.score = Math.round(n(p.score, 0, 1e9, 0)); P.kills = Math.round(n(p.kills, 0, 1e7, 0)); P.maxStars = Math.round(n(p.maxStars, 0, 5, 0));
  const wi = typeof p.weapon === 'string' ? WEAPONS.findIndex(w => w.id === p.weapon) : Math.round(n(p.weapon, 0, WEAPONS.length - 1, 0));
  P.weapon = Math.max(0, wi);
  if (p.arms && typeof p.arms === 'object') {                     // by weapon id, so the weapon table can change between saves
    const a = id => Array.isArray(p.arms[id]) ? p.arms[id] : null;
    P.mag = WEAPONS.map((w, i) => a(w.id) ? Math.round(n(a(w.id)[0], 0, w.mag, 0)) : P.mag[i]); P.ammo = WEAPONS.map((w, i) => a(w.id) ? Math.round(n(a(w.id)[1], 0, 99999, 0)) : P.ammo[i]);
    P.has = WEAPONS.map((w, i) => w.start || (a(w.id) ? (a(w.id)[2] === undefined ? a(w.id)[0] + a(w.id)[1] > 0 : !!a(w.id)[2]) : false));   // older saves: a weapon with ammo counts as yours
  } else {                                                          // older saves: by position
    if (Array.isArray(p.ammo)) P.ammo = WEAPONS.map((w, i) => Math.round(n(p.ammo[i], 0, 9999, w.ammo)));
    if (Array.isArray(p.mag)) P.mag = WEAPONS.map((w, i) => Math.round(n(p.mag[i], 0, w.mag, w.mag)));
  }
  if (!(p.arms && typeof p.arms === 'object')) P.has = WEAPONS.map((w, i) => w.start || P.mag[i] + P.ammo[i] > 0);   // a save from before weapons had to be found
  if (!P.has[P.weapon]) P.weapon = Math.max(0, P.has.indexOf(true));
  gameT = n(sv.gameT, 0, 1e9, 0);
  const rp = sv.ramp || {}, ids = v => Array.isArray(v) ? v.filter(id => RAMPAGES.some(r => r.id === id)) : [];   // rampages found and passed (js/08f)
  rampFound = new Set(ids(rp.found)); rampDone = new Set(ids(rp.done)); for (const id of rampDone) rampFound.add(id);
  const s = sv.sky;
  if (s) {
    SKY.hour = n(s.hour, 0, 23.999, SKY.hour); setWeather(WX_KINDS[s.kind] ? s.kind : 'clear', true); SKY.left = n(s.left, 1, 1e5, SKY.left);
    for (const k of ['cloud', 'rain', 'fog', 'storm', 'wet']) SKY[k] = n(s[k], 0, 1, SKY[k]);
  }
}
function loadGame(sv) { Object.assign(OPT, OPT_DEF, sv.opt || {}); gameMode = modeOf(sv); startGame(sv); }
function autosaveTick(dt) {
  if (state !== 'play' || (autoT += dt) < 60 || saveBlock()) return;
  autoT = 0; snapReq.push(t => { lastThumb = t; putSave('auto', makeSave(t)); });
}
const thumbCv = document.createElement('canvas'); thumbCv.width = 160; thumbCv.height = 100;
function afterRender() {                             // the WebGL picture can only be read right after it is drawn
  if (!snapReq.length) return;
  let t = '';
  try { const g = thumbCv.getContext('2d'), W = cv.width, H = cv.height, sh = Math.min(H, W / 1.6), sw = sh * 1.6; g.drawImage(cv, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 160, 100); t = thumbCv.toDataURL('image/jpeg', 0.72); } catch (e) { }
  for (const f of snapReq.splice(0)) f(t);
}

/* the slot list: Load game shows the autosave and the three slots, Save game the three slots */
let slotMode = 'load';
const SLOT_NAME = { auto: 'AUTOSAVE', 1: 'SLOT 1', 2: 'SLOT 2', 3: 'SLOT 3' };
function saveLine(d) {
  const wx = d.sky ? hhmm(d.sky.hour) + (d.sky.kind !== 'clear' ? ' ' + (WX_NAME[d.sky.kind] || '') : '') : '';
  return [MODE[modeOf(d)].name, wx, d.where, money(d.P.score || 0), ago(d.t)].filter(Boolean).join('  ·  ');
}
function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'JUST NOW'; if (s < 3600) return Math.round(s / 60) + ' MIN AGO'; if (s < 86400) return Math.round(s / 3600) + ' H AGO';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}
function openSlots(mode) { slotMode = mode; $('slotMsg').textContent = ''; paintSlots(); showCard('slotCard'); }
function paintSlots() {
  const save = slotMode === 'save', box = $('slotList'); box.innerHTML = '';
  $('slotTitle').textContent = save ? 'SAVE GAME' : 'LOAD GAME'; $('fileBtn').textContent = save ? 'DOWNLOAD SAVE FILE' : 'OPEN SAVE FILE';
  for (const s of SLOTS) {
    if (save && s === 'auto') continue;
    const d = getSave(s), row = document.createElement('div'), b = document.createElement('button');
    row.className = 'slotRow'; b.type = 'button'; b.className = 'slot'; b.disabled = !save && !d;
    b.innerHTML = (d && d.thumb ? '<img alt="" src="' + d.thumb + '">' : '<span class="noimg"></span>') + '<span><span class="sn"></span><span class="sd"></span></span>';
    b.querySelector('.sn').textContent = SLOT_NAME[s];
    b.querySelector('.sd').textContent = d ? saveLine(d) + '  ·  ' + (d.P.kills || 0) + ' KILLS' : save ? 'EMPTY - SAVE HERE' : 'EMPTY';
    b.addEventListener('click', () => slotClick(s, b, d));
    row.appendChild(b);
    if (d && !save) { const x = document.createElement('button'); x.type = 'button'; x.className = 'del'; x.textContent = 'DELETE'; x.setAttribute('aria-label', 'Delete ' + SLOT_NAME[s]); x.addEventListener('click', () => delClick(s, x)); row.appendChild(x); }
    else if (!save) { const x = document.createElement('span'); x.className = 'del ph'; x.textContent = 'DELETE'; row.appendChild(x); }   // keeps the rows lined up
    box.appendChild(row);
  }
}
function slotClick(s, b, d) {
  if (slotMode === 'load') { if (d) loadGame(d); return; }
  if (d && !b.classList.contains('armed')) { b.classList.add('armed'); b.querySelector('.sd').textContent = 'PRESS AGAIN TO SAVE OVER IT'; return; }   // overwriting: ask once
  const ok = putSave(s, makeSave(lastThumb)); paintSlots();
  $('slotMsg').textContent = ok ? 'SAVED IN ' + SLOT_NAME[s] : 'COULD NOT SAVE: THE BROWSER STORAGE IS FULL OR BLOCKED';
  const nb = $('slotList').querySelectorAll('button.slot')[SLOTS.indexOf(s) - 1]; if (nb) nb.focus();
}
function delClick(s, x) {
  if (x.textContent !== 'SURE?') { x.textContent = 'SURE?'; return; }
  try { localStorage.removeItem(SAVE_KEY + s); } catch (e) { }
  paintSlots(); $('slotMsg').textContent = SLOT_NAME[s] + ' DELETED'; const f = $('slotList').querySelector('button:not(:disabled)') || $('fileBtn'); f.focus();
}
$('fileBtn').addEventListener('click', () => {
  if (slotMode === 'load') { $('saveFile').click(); return; }
  const d = makeSave(lastThumb), a = document.createElement('a'), stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = 'block-runner-save-' + stamp + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  $('slotMsg').textContent = 'SAVE FILE DOWNLOADED';
});
$('saveFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { let d = null; try { d = JSON.parse(String(rd.result)); } catch (err) { } if (d && d.v === SAVE_V && d.P) loadGame(d); else $('slotMsg').textContent = 'THAT IS NOT A BLOCK RUNNER SAVE FILE'; };
  rd.onerror = () => { $('slotMsg').textContent = 'COULD NOT READ THAT FILE'; }; rd.readAsText(f);
});

/* ---------- keys in the menus ---------- */
addEventListener('keydown', e => {
  if ($('overlay').hidden || state === 'preview') return;
  const card = $(curCard() || 'startCard'), items = [...card.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null), a = document.activeElement, i = items.indexOf(a);
  let used = true;
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { const n = items.length; if (n) items[i < 0 ? 0 : (i + (e.code === 'ArrowDown' ? 1 : -1) + n) % n].focus(); }
  else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && a && a.classList.contains('opt')) stepOpt(NEW_OPTS.find(r => r.k === a.dataset.k), e.code === 'ArrowLeft' ? -1 : 1);
  else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && a && a.parentNode.id === 'helpTabs') { const t = [...a.parentNode.children], j = (t.indexOf(a) + (e.code === 'ArrowLeft' ? -1 : 1) + t.length) % t.length; t[j].focus(); t[j].click(); }
  else if (e.code === 'Escape') back();
  else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && i < 0) { const b = card.querySelector('.pri:not([hidden])') || items[0]; if (b) b.click(); }   // nothing picked yet: the main button
  else used = false;
  if (used) e.preventDefault();
  if (used || e.code === 'Enter' || e.code === 'NumpadEnter') delete pressed[e.code];   // the game does not see keys the menu used
});

showTitle();
