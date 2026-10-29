'use strict';
/* ---------- 8zzr. STORY MODE: the 68 quests as one story ----------
   The quests of MISSIONS TEST (js/08zy and the chapter files) in the order of the connectors (docs/STORY.md; the order and the numbers:
   js/01za). A new STORY game starts with M01's arrival; then each quest opens when the ones before it are passed - the next game day
   at its own hour, that night, or at once (the clock: STY.clock, game hours since the start). Danny starts with nothing (EUR 0, fists,
   no car) and always uses his own car: a quest puts out no car for him (answers 198-206).
   - A marker quest: its giver waits at the marker - the giver's letter on the minimap and the city map, in their colour (a day quest's
     marker by day, a night quest's at night). Come within offerR and the quest is set up where you are (the giver, its people and cars);
     START MISSION by the giver begins it; walk off before that and it goes quietly, to wait again.
   - A call or a page: the brick phone (the pager in chapter 1) rings when it is due - not while the police are after you, nor during
     another activity; a timed quest (near) only within nearCall of where it begins. Unanswered after ringWait it stops and rings again
     retryH game hours later.
   - Passed: done for good (no replays in STORY - MISSIONS TEST plays any quest), the rewards (cash, safehouses, clothes, the armoured
     van, the unlocks), the choices made, the quests it opens. Failed: retry from the marker (or the next call) with nothing lost.
   - The first quest of a chapter shows its title card; the STORY page in the pause menu lists the chapters and lines, done and open.
   - Saved with the game (STY in the save); never during a quest. Modes: story (the mode), storyPage, kesslerHunt. */
const STY = { done: {}, at: {}, clock: 0, lastH: -1, mk: {}, offer: null, retry: {}, hold: {}, card: null, cardT: 0, sayT: 0, car: null, kess: { t: 0, men: [], car: null } };
const storyOn = () => gameMode === 'story';
const STQ = Object.fromEntries(STORYMODE_TABLE.quests.map(q => [q.id, q]));
const STL = Object.fromEntries(STORYMODE_TABLE.lines.map(l => [l.id, l]));
const stDone = id => !!STY.done[id];
const stHour = id => { const n = MISSIONS[id] && MISSIONS[id].numbers; return n && typeof n.hour === 'number' ? n.hour : null; };
const stNight = h => h !== null && (h >= STM.dayTo || h < STM.dayFrom);
const stCall = id => MISSIONS[id] && MISSIONS[id].start === 'phone';
const stMine = c => storyOn() && !!c && c === STY.car;          // STORY: your own car - a quest clearing its spot leaves it be (js/08zy and the chapter files)
const MS_CHOICE_TEST = Object.assign({}, MS_CHOICE);           // MISSIONS TEST's switches as they start (js/08zy)
const MS_CHOICE_STORY = { kessler: 'finished', files: 'police', tip: 'trusted', proof: 'bay tv', varga: 'not done', casino: 'not done', prison: 'not done', colony: 'not done', space: 'not done' };

/* ---------- the clock and the quests' order ---------- */
function stClock() {                      // game hours since the start, from the sky's clock (a quest moving it back a little counts as nothing)
  const h = SKY.hour; if (STY.lastH < 0) { STY.lastH = h; if (!STY.clock) STY.clock = h; return; }   // a new story starts its count at today's hour (days turn at midnight)
  let dh = h - STY.lastH; STY.lastH = h; if (dh < -12) dh += 24; if (dh > 0) STY.clock += dh;
}
function stDue(q, now) {                  // when a quest opened at `now` comes: at once, that day at its hour, or the next day at its hour
  if (q.wait === 'now') return now;
  const h = stHour(q.id) ?? STM.dayHour, d0 = Math.floor(now / 24);
  if (q.wait === 'same') { const t = d0 * 24 + h; return t >= now + STM.sameGap ? t : t + 24; }
  return (d0 + 1) * 24 + h;
}
function stOpenUp(now) {                   // every quest whose quests before are all passed gets its time (once)
  for (const q of STORYMODE_TABLE.quests) if (!stDone(q.id) && STY.at[q.id] === undefined && q.after.every(stDone)) STY.at[q.id] = stDue(q, now);
}
function stWindow(id) {                    // is it the time of day for this quest's marker or call?
  const h = stHour(id); if (h === null) return true;
  const n = SKY.hour >= STM.dayTo || SKY.hour < STM.dayFrom;
  return stNight(h) ? n : !n;
}
const stOpen = id => !stDone(id) && STY.at[id] !== undefined && STY.clock >= STY.at[id];

/* ---------- where a marker quest's giver waits (set up once, read, taken down again) ---------- */
function stSpot(id) {
  if (STY.mk[id]) return STY.mk[id];
  const keep = { x: P.x, y: P.y, ang: P.ang, hour: SKY.hour, cx: cam.x, cy: cam.y }, me = stSnap();
  let t = null, s0 = null;
  try {
    Object.assign(MS, { on: true, id, m: MISSIONS[id], s: MSCRIPT[id], k: -1, t: 0, A: { list: [] }, guide: null, mark: null, end: null, probe: true });
    MS.s.setup(MS.A); s0 = { x: P.x, y: P.y }; msEnter(0);
    const st = MS.start, mk = MS.mark; t = st && st.at ? st.at() : typeof mk === 'function' ? mk() : mk;
  } catch (e) { console.error('STORY: ' + id, e); }
  const set = stSnap(); MS.probe = false; msClear(); SKY.hour = keep.hour; STY.lastH = keep.hour; stBack(me, set);
  Object.assign(P, { x: keep.x, y: keep.y, ang: keep.ang }); cam.x = keep.cx; cam.y = keep.cy;
  const at = t || s0 || { x: P.x, y: P.y };
  return STY.mk[id] = { x: at.x, y: at.y, sx: (s0 || at).x, sy: (s0 || at).y };
}

/* ---------- every frame (js/15 update): offers, a call ringing, the hunt, the card ---------- */
function stBusy() {                        // another activity, a card, the water, the police
  return state !== 'play' || P.dead || P.busted || RAMP.on || JOB.on || RACE.on || P.ferry || P.swim || SV.on || (P.car && P.car.t.boat);
}
function storyTick(dt) {
  if (!storyOn()) return;
  stClock(); stOpenUp(STY.clock); stCardTick(dt); kessTick(dt); stSpotsAhead();
  if (P.car && !P.car.t.boat) STY.car = P.car;
  const me = P.car || P, M = UNITS_PER_M, O = STY.offer;
  for (const id in STY.hold) { const s = STY.mk[id]; if (!s || dist(me.x, me.y, s.x, s.y) > STM.leaveR * M) delete STY.hold[id]; }   // walked off after a fail: it may set up again
  if (O) {                                                          // a quest set up and waiting to begin
    if (!MS.on || MS.id !== O.id) { STY.offer = null; return; }
    if (MS.k > 0 || CUT.on || MS.talk || (O.kind === 'call' && !MS.ring)) { STY.offer = null; stBegun(O.id); return; }   // under way: START pressed, a cutscene, a line, the phone answered
    if (O.kind === 'marker' && dist(me.x, me.y, O.x, O.y) > STM.leaveR * M) stDrop();
    else if (O.kind === 'call' && (O.t += dt) > STM.ringWait) { STY.retry[O.id] = STY.clock + STM.retryH; stDrop(); }
    return;
  }
  if (MS.on || stBusy()) return;
  for (const q of STORYMODE_TABLE.quests) {
    const id = q.id; if (!stOpen(id) || !stWindow(id) || !MSCRIPT[id]) continue;
    if (stCall(id)) {                                               // a call (or a page) when it is due
      if (P.stars > 0 || STY.clock < (STY.retry[id] || 0)) continue;
      if (q.near) { const s = stSpot(id); if (dist(me.x, me.y, s.sx, s.sy) > (q.near === true ? STM.nearCall : q.near) * M) continue; }
      stBegin(id, 'call'); return;
    }
    if (STY.hold[id]) continue;
    const s = stSpot(id); if (dist(me.x, me.y, s.x, s.y) > STM.offerR * M) continue;   // a giver at a marker: set up when you come close
    if (P.stars > 0) { if (gameT > STY.sayT) { STY.sayT = gameT + 6; toast('LOSE THE POLICE FIRST', true); } continue; }
    stBegin(id, 'marker', s); return;
  }
}
function stBegin(id, kind, s) {            // set the quest up where you are (js/08zy msStart, its STORY path)
  const me = stSnap(); msStart(id, 0); if (!MS.on) return;
  STY.offer = { id, kind, x: s ? s.x : P.x, y: s ? s.y : P.y, t: 0, me, set: stSnap() };
}
function stBegun(id) {                     // under way: the chapter's title card for its first quest
  const L = STL[STQ[id].line]; if (!L || !L.ch) return;
  const first = STORYMODE_TABLE.quests.find(q => q.line === L.id);
  if (first && first.id === id) stCard(L.name);
}
function stUsed() { const O = STY.offer; if (O && O.id === MS.id) { STY.offer = null; stBegun(O.id); } }   // START MISSION pressed (or the call answered): no longer just set up
function stDrop() { const O = STY.offer; STY.offer = null; msClear(); if (O && O.me) stBack(O.me, O.set); }   // walked off, or the call not answered: it waits again, nothing changed
const stSnap = () => ({ outfit: Object.assign({}, P.outfit), wardrobe: P.wardrobe.slice() });   // the clothes a quest's setup may put on Danny (S2's coat, the guard's uniform)
function stBack(was, set) {                // a setup taken down: what it put on goes again (what you changed since stays); weapons: the quests' own cleanup
  for (const sl in set.outfit) if (P.outfit[sl] === set.outfit[sl] && set.outfit[sl] !== was.outfit[sl]) P.outfit[sl] = was.outfit[sl];
  for (const id of set.wardrobe) if (!was.wardrobe.includes(id)) { const i = P.wardrobe.indexOf(id); if (i >= 0) P.wardrobe.splice(i, 1); }
}
function stOwnCar(A, keep) {               // STORY: no car put out for you - the quest's "your car" is the one you came in, else none (answer 205)
  if (!A.mycar) return;
  const c = A.mycar, i = cars.indexOf(c); if (i >= 0 && P.car !== c) cars.splice(i, 1); A.list = A.list.filter(o => o !== c);
  const own = keep.car || STY.car;
  A.mycar = own && !own.dead && !own.sunk && cars.includes(own) && dist(own.x, own.y, P.x, P.y) < 1500 ? own : null;
}
function stKeep(A, keep) {                 // msStart in STORY: the quest begins where you are
  Object.assign(P, { x: keep.x, y: keep.y, ang: keep.ang }); if (keep.car && !P.car && cars.includes(keep.car)) P.car = keep.car;
  cam.x = P.x; cam.y = P.y; stOwnCar(A, keep);
}

const stMet = m => m.lines.some(l => l.met && stDone(l.met.after)) ? Object.assign({}, m, { lines: m.lines.map(l => l.met && stDone(l.met.after) ? Object.assign({}, l, { text: l.met.text }) : l) }) : m;   // a line's 'we've met' text (answer 83)

/* ---------- passed, failed (js/08zy msPassed, msFail) ---------- */
const ST_PLACE = { m12: 'flat', m18: 'loft', m19: 'loft', m24: 'penthouse' };   // the safehouses the main story gives (answer 81)
const ST_WEAR = { q01: ['captain_cap'], m08: ['chauffeur_cap'], c3: ['cas_guard', 'cas_guard_trousers'], p5: ['pri_guard', 'pri_guard_trousers'], s2: ['lab_coat'], s6: ['flight_suit', 'flight_trousers'] };   // clothes kept in the wardrobe
function stPassed(id) {
  STY.done[id] = true; delete STY.at[id]; delete STY.retry[id]; STY.hold = {}; stOpenUp(STY.clock);
  const h = ST_PLACE[id] && SAFES.find(s => s.id === ST_PLACE[id]); if (h) h.own = true;
  for (const c of ST_WEAR[id] || []) if (CLOTH[c] && !P.wardrobe.includes(c)) P.wardrobe.push(c);
  if (id === 'c8') stKeepVan();
  if (id === 'q01') marinaGive('speedboat', '#f4f4f6');            // Marco's white speedboat, at your first free berth in Sunset Harbor (js/08zv)
}
function stFailed(id) { if (STQ[id]) { STY.hold[id] = true; if (stCall(id)) STY.retry[id] = STY.clock + STM.retryH; } }
function stKeepVan() {                     // C8: the armoured van in the casino's colours stays Danny's - the first free space of a safehouse of his
  for (const h of SAFES) if (h.own && h.spots && h.spots.length) for (let k = 0; k < h.spots.length; k++) if (!h.keep[k]) { h.keep[k] = { type: 'armorvan', color: null }; return; }
}

/* ---------- a chapter's title card ---------- */
function stCard(text) {
  let el = $('stCard'); if (!el) { el = document.createElement('div'); el.id = 'stCard'; document.body.appendChild(el); }
  const [a, b] = text.split(' - '); el.innerHTML = '<b>' + a + '</b>' + (b ? '<span>' + b + '</span>' : ''); el.hidden = false; el.classList.remove('out');
  STY.cardT = STM.cardTime;
}
function stCardTick(dt) {
  if (!(STY.cardT > 0)) return; const el = $('stCard'); if (!el) return;
  if ((STY.cardT -= dt) <= 0.6) el.classList.add('out'); if (STY.cardT <= 0) el.hidden = true;
}

/* ---------- Kessler's men in Dockside (M09 to M12; answer 201; modes: kesslerHunt) ---------- */
function kessTick(dt) {
  const K = STY.kess, on = feat('kesslerHunt') && stDone('m09') && !stDone('m12') && !MS.on;
  K.men = K.men.filter(p => peds.includes(p) && !p.dead);
  if (!on) { if (K.men.length || K.car) kessGone(); return; }
  const me = P.car || P, M = UNITS_PER_M;
  if (K.car || K.men.length) { if (K.men.every(p => dist(p.x, p.y, me.x, me.y) > STM.kessLose * M) && (!K.car || dist(K.car.x, K.car.y, me.x, me.y) > STM.kessLose * M)) kessGone(); return; }
  if ((K.t -= dt) > 0) return; K.t = STM.kessEvery;
  if (districtAt(me.x, me.y) !== 'DOCKSIDE' || stBusy() || P.dead || Math.random() * 100 >= STM.kessChance) return;
  const r = STORY1.road(me.x + rand(-500, 500), me.y + rand(-500, 500)); if (!r || dist(r.x, r.y, me.x, me.y) < 250) return;
  const k = kerbBy(r.x, r.y), c = K.car = makeCar('sedan', k.x, k.y, k.ang, null, '#2a2a2e'); c.searched = true; cars.push(c);
  for (let i = 0; i < STM.kessMen; i++) {
    const p = makePed(k.x + Math.cos(k.ang + Math.PI / 2) * (20 + i * 12), k.y + Math.sin(k.ang + Math.PI / 2) * (20 + i * 12));
    Object.assign(p, { arm: i < 2 ? gunIdx('pistol') : gunIdx('bat'), hp: STM.kessHp, shirt: '#f4f4f4', pants: '#2a3a5a', keep: true, kess: true });
    peds.push(p); K.men.push(p); provoke(p); p.hostT = -60;            // after you at once, and longer than a passer-by (js/08g)
  }
  toast("KESSLER'S MEN!", true);
}
function kessGone() {
  const K = STY.kess; for (const p of K.men) if (peds.includes(p) && !p.dead && dist(p.x, p.y, cam.x, cam.y) > 300) peds.splice(peds.indexOf(p), 1);
  K.men = []; if (K.car && cars.includes(K.car) && P.car !== K.car && dist(K.car.x, K.car.y, cam.x, cam.y) > 300) cars.splice(cars.indexOf(K.car), 1); K.car = null;
}

/* ---------- the maps: a giver's letter at each open marker (js/14) ---------- */
function storyIcons(g, X, Y, q, inView) {
  if (!storyOn() || (MS.on && !STY.offer)) return;
  for (const qq of STORYMODE_TABLE.quests) {
    const id = qq.id; if (!stOpen(id) || stCall(id) || !stWindow(id) || !STY.mk[id]) continue;
    const s = STY.mk[id], x = X(s.x), y = Y(s.y); if (!inView(x, y)) continue;
    const ch = CHARS[MISSIONS[id].giver] || { letter: '?', bubble: '#ffffff' }, r = q * 1.25;
    g.fillStyle = '#000'; g.fillRect(x - r - 1.5, y - r - 1.5, 2 * r + 3, 2 * r + 3); g.fillStyle = ch.bubble; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.fillStyle = '#0b0614'; g.font = 'bold ' + Math.round(r * 1.5) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch.letter, x, y + r * 0.08);
  }
}
function stSpotsAhead() {                  // the open markers' spots, one a frame (so the map shows them before you are near)
  if (!storyOn() || MS.on) return;
  for (const q of STORYMODE_TABLE.quests) if (stOpen(q.id) && !stCall(q.id) && !STY.mk[q.id] && MSCRIPT[q.id]) { stSpot(q.id); return; }
}

/* ---------- the STORY page (the pause menu; modes: storyPage) ---------- */
function stWhere(id) {                     // where the next quest starts, in words
  const m = MISSIONS[id], ch = CHARS[m.giver], st = (m.page && m.page.start) || {};
  if (!stOpen(id)) { const t = STY.at[id]; if (t === undefined) return ''; const days = Math.floor(t / 24) - Math.floor(STY.clock / 24), h = t % 24, hh = String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round(h % 1 * 60)).padStart(2, '0');
    return (days <= 0 ? 'LATER TODAY' : days === 1 ? 'TOMORROW' : 'IN ' + days + ' DAYS') + ' AT ' + hh; }
  if (stCall(id)) return (ch ? ch.name : 'SOMEONE') + ' WILL CALL' + (STQ[id].near ? ' (NEAR ' + (m.where || '').toUpperCase().split(/[;,]/)[0] + ')' : '');
  const t = (st.marker || ((ch ? ch.letter + ' - ' + ch.name : '') + ' · ' + (m.where || ''))).toUpperCase(), w = stWindow(id) ? '' : stNight(stHour(id)) ? 'AT NIGHT' : 'BY DAY';
  return t + (w && !t.includes(w) ? ' · ' + w : '');
}
function paintStory() {
  const el = $('stList'); if (!el) return; const rows = [];
  let done = 0; for (const q of STORYMODE_TABLE.quests) if (stDone(q.id)) done++;
  $('stSub').textContent = 'STORY · ' + done + ' OF ' + STORYMODE_TABLE.quests.length + ' QUESTS DONE';
  for (const L of STORYMODE_TABLE.lines) {
    const qs = STORYMODE_TABLE.quests.filter(q => q.line === L.id), seen = qs.filter(q => stDone(q.id) || STY.at[q.id] !== undefined);
    if (!seen.length) continue;
    rows.push('<h3>' + L.name + '</h3><ul>');
    for (const q of qs) {
      const m = MISSIONS[q.id];
      if (stDone(q.id)) rows.push('<li class="done">✓ ' + m.no + ' ' + m.title + '</li>');
      else if (STY.at[q.id] !== undefined) rows.push('<li class="open">▶ ' + m.no + ' ' + m.title + '<small>' + stWhere(q.id) + '</small></li>');
    }
    const left = qs.filter(q => !stDone(q.id) && STY.at[q.id] === undefined).length; if (left) rows.push('<li class="more">' + left + ' MORE TO COME</li>');
    rows.push('</ul>');
  }
  el.innerHTML = rows.join('');
}

/* ---------- a new game, saves ---------- */
function storyReset() {                    // js/15 resetGame: STORY from the start - or MISSIONS TEST's switches back as they were
  Object.assign(STY, { done: {}, at: {}, clock: 0, lastH: -1, mk: {}, offer: null, retry: {}, hold: {}, cardT: 0, car: null });
  STY.kess.men = []; STY.kess.car = null; STY.kess.t = 0;
  for (const k in MS_UNLOCK) MS_UNLOCK[k] = false;
  Object.assign(MS_CHOICE, storyOn() ? MS_CHOICE_STORY : MS_CHOICE_TEST);
  const el = $('stCard'); if (el) el.hidden = true;
}
function storyStart() {                    // js/15 startGame, a new STORY game: no car, the arrival
  if (!storyOn()) return;
  for (const h of SAFES) h.keep = h.keep.map(() => null);       // nothing waiting in your space at the Colony
  STY.at.m01 = 0; msStart('m01', 0); stBegun('m01');
}
function storySave() { return storyOn() ? { done: Object.keys(STY.done), at: STY.at, clock: STY.clock, retry: STY.retry, unlock: Object.assign({}, MS_UNLOCK), choice: Object.fromEntries(Object.keys(MS_CHOICE_STORY).map(k => [k, MS_CHOICE[k]])) } : undefined; }
function storyLoad(d) {                    // js/15b applySave
  if (!storyOn() || !d) return;
  for (const id of d.done || []) if (STQ[id]) STY.done[id] = true;
  for (const id in d.at || {}) if (STQ[id] && typeof d.at[id] === 'number') STY.at[id] = d.at[id];
  for (const id in d.retry || {}) if (STQ[id] && typeof d.retry[id] === 'number') STY.retry[id] = d.retry[id];
  STY.clock = typeof d.clock === 'number' ? d.clock : 0; STY.lastH = -1;
  for (const k in d.unlock || {}) if (k in MS_UNLOCK) MS_UNLOCK[k] = !!d.unlock[k];
  for (const k in d.choice || {}) if (k in MS_CHOICE_STORY && typeof d.choice[k] === 'string') MS_CHOICE[k] = d.choice[k];
  stOpenUp(STY.clock);
}
$('pStoryBtn').addEventListener('click', () => { paintStory(); showCard('storyCard'); });
