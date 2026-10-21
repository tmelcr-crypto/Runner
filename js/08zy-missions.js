'use strict';
/* ---------- 8zy. MISSIONS: the engine, MISSIONS TEST, and each mission's script ----------
   A mission (its words and numbers: js/01x MISSIONS) runs step by step: each step has its words on screen (the objective bar), a
   target (the lime guide line and an arrow over it), and its script says when it is done and what fails it. Dialogue pauses the game:
   the speaker's portrait (the owner's picture, or a silhouette with the letter until it comes) and a bubble filling letter by letter
   with the speaker's own mumble; tap, E, Space or Enter for the next line. Cutscenes are the owner's shot lists played on the
   cutscene engine (js/15c) with the usual camera from above: WIDE, CLOSE, FOLLOW, OVERHEAD, FIXED, PAN.
   MISSIONS TEST (mode test, docs/STORY.md): picked from a list (MISSIONS on the pause menu, and when the mode starts), you start with
   everything, never saved; helpers: restart, jump to any step, replay a cutscene; the step's info in a corner. */
const MS = { on: false, id: '', m: null, s: null, k: -1, t: 0, A: null, guide: null, mark: null, talk: null, objT: 0, end: null, fromNew: false, next: null, start: null };
const MSCRIPT = {};                        // each mission's script: { setup(A), steps: [{ enter, tick → true when done, jump, info }], fail(A) → why, cuts: { name: A => shots } }
const msTest = () => gameMode === 'test';

/* ---------- MISSIONS TEST: the kit and the list ---------- */
function testKit() {                       // js/15 startGame: lots of cash, every weapon full, full health and armour - then the mission picked
  P.score = Math.max(P.score, 1000000);
  WEAPONS.forEach((w, i) => { P.has[i] = true; if (!isMelee(w)) { P.mag[i] = Math.max(P.mag[i] || 0, w.mag || 0); P.ammo[i] = Math.max(P.ammo[i] || 0, w.maxAmmo || 0); } });
  P.hp = hpMax(); P.armor = armorMax();
  const id = MS.next; MS.next = null;
  if (id) msStart(id, 0); else setTimeout(() => { if (state === 'play' && msTest() && !MS.on) msOpenList(); }, 600);
}
function msOpenList() { MS.fromNew = false; pauseRet = 'play'; toggleBigMap(false); toggleWheel(false); state = 'pause'; hush(); showCard('pauseCard', true); showCard('msCard'); }
function msPick(id) {                       // a mission picked: from NEW GAME a fresh MISSIONS TEST game starts with it; in a test game it starts now
  if (MS.fromNew || gameMode !== 'test' || (state !== 'pause' && state !== 'play')) { MS.fromNew = false; msClear(); Object.assign(OPT, NEWOPT); gameMode = 'test'; MS.next = id; startGame(); return; }
  msStart(id, 0);
}
function paintMsCard() {
  const L = $('msList'); L.innerHTML = '';
  for (const m of MISSION_TABLE.missions) {
    const g = (m.chars.find(c => c.id === m.giver) || {}).name || '', b = document.createElement('button');
    b.type = 'button'; b.className = 'big alt msPick'; b.innerHTML = m.no + ' · ' + m.title + '<small>' + g + ' · ' + m.where.toUpperCase() + '</small>';
    b.addEventListener('click', () => msPick(m.id)); L.appendChild(b);
  }
  $('msSub').textContent = MS.fromNew ? 'MISSIONS TEST · PICK A MISSION TO START' : 'MISSIONS TEST · PICK ONE TO PLAY';
  const on = MS.on && !MS.fromNew, H = $('msHelp'); H.hidden = !on; if (!on) return;
  $('msNow').textContent = 'NOW: ' + MS.m.no + ' · ' + MS.m.title + ' · STEP ' + (MS.k + 1) + '/' + MS.m.steps.length;
  const S = $('msSteps'); S.innerHTML = '';
  MS.m.steps.forEach((st, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'alt msStep' + (k === MS.k ? ' on' : ''); b.textContent = (k + 1) + ' ' + st.word; b.title = st.show;
    b.addEventListener('click', () => msStart(MS.id, k)); S.appendChild(b); });
  const C = $('msCuts'); C.innerHTML = '';
  for (const name in MS.s.cuts || {}) { const b = document.createElement('button'); b.type = 'button'; b.className = 'alt msStep'; b.textContent = '▶ ' + name;
    b.addEventListener('click', () => { closeMenus(); state = 'play'; msCut(name, () => {}); }); C.appendChild(b); }
}
$('msRestart').addEventListener('click', () => msStart(MS.id, 0));
$('msQuit').addEventListener('click', () => { msClear(); closeMenus(); state = 'play'; toast('MISSION STOPPED'); });
$('pMsBtn').addEventListener('click', () => { MS.fromNew = false; showCard('msCard'); });

/* ---------- running a mission ---------- */
function msStart(id, k) {                  // from the list (or RETRY / a step): fresh, at its start, or set up as if the steps before were done
  const m = MISSIONS[id], s = MSCRIPT[id]; if (!m || !s) return;
  msClear(); closeMenus(); state = 'play';
  if (P.car) exitCar(true); P.stars = 0; P.heat = 0; resetPolice();
  Object.assign(MS, { on: true, id, m, s, k: -1, t: 0, A: { list: [] }, guide: null, mark: null, end: null });
  if (msTest()) { P.hp = hpMax(); P.armor = armorMax(); }
  s.setup(MS.A);
  for (let j = 0; j < k; j++) if (s.steps[j].jump) s.steps[j].jump(MS.A);
  msEnter(k || 0);
}
function msEnter(k) {
  MS.k = k; MS.t = 0; MS.guide = null; MS.mark = null; MS.start = null;
  const st = MS.s.steps[k]; if (st.enter) st.enter(MS.A);
  msObjective(MS.m.steps[k].show);
}
function msObjective(txt) { const o = $('msObj'); o.textContent = txt || ''; o.hidden = !txt; o.classList.add('big'); MS.objT = MSN.objTime; }
function msTick(dt) {                       // js/15 update
  if (MS.objT > 0 && (MS.objT -= dt) <= 0) $('msObj').classList.remove('big');
  if (!MS.on || MS.talk || CUT.on) return;
  msLiveTick(dt);
  MS.t += dt;
  const A = MS.A, F = MS.m.fails;
  if (P.dead) return msFail(F.wasted || 'WASTED');
  if (P.busted) return msFail(F.busted || 'BUSTED');
  const why = MS.s.fail(A); if (why) return msFail(why);
  const st = MS.s.steps[MS.k];
  if (st.tick(A, dt)) msNext();
  if (msTest() && MS.on) { const s2 = MS.s.steps[MS.k]; $('msInfo').textContent = MS.m.no + ' · STEP ' + (MS.k + 1) + '/' + MS.m.steps.length + ' · ' + MS.m.steps[MS.k].word + (s2.info ? ' · ' + s2.info(MS.A) : ''); }
}
function msNext() { if (!MS.on) return; if (MS.k + 1 >= MS.s.steps.length) msPassed(); else msEnter(MS.k + 1); }
function msClear() {                        // the mission's people and vehicles go, the bar and the line too
  if (MS.A) { if (MS.s && MS.s.cleanup) MS.s.cleanup(MS.A); for (const o of MS.A.list) { if (o.t) { if (P.car !== o && cars.includes(o)) cars.splice(cars.indexOf(o), 1); } else if (peds.includes(o)) peds.splice(peds.indexOf(o), 1); } }
  MS.on = false; MS.A = null; MS.guide = null; MS.mark = null; MS.start = null; msTalkClose(); msLiveClear(); if (CUT.on && CUT.sc && CUT.sc.ms) cutEnd();   // a mission's cutscene still playing: over if ($('msBtn')) $('msBtn').hidden = true;
  $('msObj').hidden = true; $('msInfo').textContent = ''; if (MS_MARK) MS_MARK.visible = false; if (MS_BAG) MS_BAG.visible = false;
}
function msFail(why) {
  const id = MS.id; msClear();
  Snd.tone(330, 160, 0.5, 0.12, 'sawtooth');
  msEndCard('MISSION FAILED', why, [], id);
}
function msPassed() {
  const m = MS.m, r = m.reward, id = MS.id; msClear();
  if (r.cash > 0) addScore(r.cash, P.x, P.y, 'MISSION');
  Snd.tone(523, 784, 0.18, 0.12, 'square'); setTimeout(() => Snd.tone(784, 1046, 0.25, 0.12, 'square'), 180);
  const list = [r.cash > 0 && money(r.cash), r.vehicle && 'VEHICLE: ' + r.vehicle, r.clothes && 'CLOTHES: ' + r.clothes, r.place && 'PLACE: ' + r.place, r.contact && 'CONTACT: ' + r.contact, r.next && 'NEXT: ' + r.next].filter(Boolean);
  msEndCard('MISSION PASSED', m.no + ' · ' + m.title, list, id);
}
function msEndCard(head, sub, list, id) {   // over the game: what happened, then RETRY, MISSIONS or CARRY ON
  $('msEndHead').textContent = head; $('msEndHead').className = head === 'MISSION PASSED' ? 'ok' : 'bad'; $('msEndSub').textContent = sub;
  $('msEndList').innerHTML = list.map(t => '<li>' + t + '</li>').join('') + (list.length > 1 && msTest() ? '<li class="note">MISSIONS TEST: only the cash is given; the rest comes with STORY.</li>' : '');
  $('msRetry').onclick = () => msStart(id, 0);
  pauseRet = 'play'; state = 'pause'; hush(); showCard('msEndCard', true);
}
$('msEndList').addEventListener('click', e => e.stopPropagation());
$('msCarry').addEventListener('click', () => { closeMenus(); state = 'play'; });
$('msToList').addEventListener('click', () => { showCard('pauseCard', true); showCard('msCard'); });

/* ---------- actors: people and vehicles the mission brings, gone when it ends ---------- */
function msPed(x, y, a, o) {
  const p = makePed(x, y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', ms: true, keep: true }, o);   // keep: never cleared away for being far (js/08)
  p.post = { x, y, a, step: o.step || standStep, i: 0 }; p.e = -1; p.ang = p.hd = a; peds.push(p); MS.A.list.push(p); return p;
}
function msCar(type, x, y, ang, color) { const c = makeCar(type, x, y, ang, null, color); c.searched = true; c.ms = true; c.keep = true; cars.push(c); MS.A.list.push(c); return c; }
function msWho(id) { return MS.m.chars.find(c => c.id === id); }

/* ---------- the target: the guide line (js/08p) and an arrow over it ---------- */
let MS_MARK = null, MS_BAG = null;
function gfxMs(time) {
  const g = MS.on && !CUT.on ? MS.mark : null;
  if (g) {
    if (!MS_MARK) { MS_MARK = new THREE.Mesh(new THREE.ConeGeometry(9, 18, 4), new THREE.MeshBasicMaterial({ color: 0xb6ff3c })); MS_MARK.rotation.x = Math.PI; scene.add(MS_MARK); }
    const t = typeof g === 'function' ? g() : g; MS_MARK.visible = !!t;
    if (t) MS_MARK.position.set(t.x, groundH(t.x, t.y) + (t.h || 34) + Math.sin(time * 4) * 4, t.y); MS_MARK.rotation.y = time * 2;
  } else if (MS_MARK) MS_MARK.visible = false;
  const A = MS.on && MS.A, c = A && A.carry && peds.includes(A.carry) ? A.carry : null, b = A && (A.bag || c);   // on the ground, or in someone's hand
  if (b) {
    if (!MS_BAG) { MS_BAG = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), new THREE.MeshLambertMaterial({ color: 0x5a4030 })); scene.add(MS_BAG); }
    MS_BAG.visible = true;
    if (c) { const a = (c.ang || 0) + Math.PI / 2; MS_BAG.position.set(c.x + Math.cos(a) * 7, groundH(c.x, c.y) + 9, c.y + Math.sin(a) * 7); MS_BAG.rotation.y = -(c.ang || 0); }   // at his side
    else { MS_BAG.position.set(b.x, groundH(b.x, b.y) + 4 + Math.sin(time * 3) * 1.5, b.y); MS_BAG.rotation.y = time; }
  } else if (MS_BAG) MS_BAG.visible = false;
}
const msGuide = () => { const g = MS.on && !CUT.on && !MS.talk && MS.guide; if (!g) return null;   // no line while a cutscene or a dialogue plays
  const t = typeof g === 'function' ? g() : g; return t ? { x: t.x, y: t.y, key: 'ms' + MS.k } : null; };

/* ---------- START MISSION: a button by the mission's giver (MS.start = { at() → the giver, label, go() }) ---------- */
function msBusy() { return MS.on && feat('msBlock'); }          // a mission running: the side activities are shut (js/01j msBlock)
function msShut() {                        // a side activity's spot during a mission: says so now and then; true = shut
  if (!msBusy()) return false;
  if (gameT - (MS.shutT || -99) > 6) { MS.shutT = gameT; toast('NOT DURING A MISSION'); }
  return true;
}
function msKey() {
  const s = MS.on && MS.start; if (!s || P.car || P.dead || P.act || state !== 'play' || CUT.on || MS.talk) return null;
  const t = s.at(); return t && !t.dead && dist(P.x, P.y, t.x, t.y) < 60 ? s : null;
}
function msUse(s) { MS.start = null; $('msBtn').hidden = true; s.go(); }
function msUi() {                          // every frame (js/14): the button by you
  const k = msKey(), b = $('msBtn'); if (!b) return;
  if (!k) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden) { b.hidden = false; b.querySelector('b').textContent = k.label; b.style.setProperty('--sc', '#b6ff3c'); }
  doorBtnAt(b);
}
$('msBtn').addEventListener('click', e => { e.stopPropagation(); const k = msKey(); if (k) msUse(k); });

/* ---------- dialogue: the portrait, the bubble, the mumble; the game waits ---------- */
const MS_PICS = {};
function msPortrait(ch, cv = $('msPic')) {  // the owner's picture (img/chars/<pic>) or a silhouette with the letter till it comes
  const g = cv.getContext('2d'), W = cv.width;
  g.fillStyle = '#12101c'; g.fillRect(0, 0, W, W);
  const img = ch.pic ? (MS_PICS[ch.pic] || (MS_PICS[ch.pic] = Object.assign(new Image(), { src: 'img/chars/' + ch.pic }))) : null;
  if (img && img.complete && img.naturalWidth) { g.drawImage(img, 0, 0, W, W); return; }
  if (img) img.onload = () => { if (MS.talk) msPortrait(MS.talk.ch); if (MS_LIVE.cur) msPortrait(MS_LIVE.cur.ch, $('msLivePic')); };
  g.fillStyle = ch.bubble; g.globalAlpha = 0.35; g.beginPath(); g.arc(W / 2, W * 0.4, W * 0.2, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(W / 2, W * 1.02, W * 0.42, W * 0.36, 0, Math.PI, TAU); g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#fff'; g.font = 'bold ' + Math.round(W * 0.3) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch.letter, W / 2, W * 0.42);
}
function msSay(nums, done) {               // nums: line numbers (1-based) of this mission
  const lines = nums.map(n => MS.m.lines[n - 1]).filter(Boolean); if (!lines.length) { done && done(); return; }
  MS.talk = { lines, i: -1, shown: 0, t: 0, last: 0, done, ret: CUT.on ? null : state };
  if (!CUT.on) { state = 'talk'; hush(); }
  $('msTalk').hidden = false; msLine(0); requestAnimationFrame(msTalkLoop);
}
function msLine(i) {
  const T = MS.talk; T.i = i; T.shown = 0; T.t = 0; const L = T.lines[i], ch = msWho(L.who) || { name: L.who.toUpperCase(), letter: '?', bubble: '#ffffff', mumble: {} };
  T.ch = ch; $('msWho').textContent = ch.name; $('msWho').style.color = ch.bubble; $('msBub').style.borderColor = ch.bubble; $('msLine').textContent = ''; $('msMore').hidden = true; msPortrait(ch);
}
function msTalkLoop(ts) {
  const T = MS.talk; if (!T) return;
  const dt = T.last ? Math.min(0.1, (ts - T.last) / 1000) : 0; T.last = ts;
  const L = T.lines[T.i];
  if (T.shown < L.text.length) {
    T.t += dt; const n = Math.min(L.text.length, Math.floor(T.t * MSN.letters));
    msMumble(T.ch, L.text, T.shown, n);
    T.shown = n; $('msLine').textContent = L.text.slice(0, n); if (n >= L.text.length) $('msMore').hidden = false;
  }
  requestAnimationFrame(msTalkLoop);
}
function msMumble(ch, text, from, to) {    // the speaker's mumble for the letters just written
  const mu = ch.mumble || {}, every = Math.max(1, Math.round(MSN.letters / Math.max(1, mu.rate || 8)));
  for (let k = from; k < to; k++) if (k % every === 0 && /[a-z0-9]/i.test(text[k]) && MSN.mumble > 0 && Snd.tone) {
    const f = (mu.low || 200) + Math.random() * ((mu.high || 300) - (mu.low || 200)); Snd.tone(f, f * 0.85, 0.07, 0.07 * MSN.mumble, mu.wave || 'square');
  }
}

/* ---------- live lines: during play, without pausing - a shout in a fight, a phone call while you drive ---------- */
const MS_LIVE = { q: [], cur: null };
function msLive(nums, o = {}) {             // nums: line numbers (1-based); o.phone: a phone call (it rings first); o.now: drop what is waiting; o.done: after the last
  const lines = nums.map(n => MS.m.lines[n - 1]).filter(Boolean); if (!lines.length) { if (o.done) o.done(); return; }
  if (o.now) MS_LIVE.q = MS_LIVE.q.filter(e => e.phone);           // a fresh shout goes before the old ones (a call keeps its place)
  lines.forEach((L, i) => MS_LIVE.q.push({ L, phone: o.phone, ring: o.phone && i === 0, done: i === lines.length - 1 ? o.done : null }));
}
function msLiveTick(dt) {                   // msTick: one at a time, written letter by letter, then held a moment
  const S = MS_LIVE;
  if (!S.cur && S.q.length) {
    const e = S.cur = S.q.shift(), ch = msWho(e.L.who) || { name: e.L.who.toUpperCase(), letter: '?', bubble: '#ffffff', mumble: {} };
    Object.assign(e, { ch, shown: 0, t: e.ring ? -1.2 : 0, hold: MSN.liveHold + e.L.text.length / MSN.letters });
    $('msLiveWho').textContent = (e.phone ? 'PHONE · ' : '') + ch.name; $('msLiveWho').style.color = ch.bubble; $('msLiveBub').style.borderColor = ch.bubble;
    $('msLiveLine').textContent = e.ring ? '...' : ''; msPortrait(ch, $('msLivePic')); $('msLive').hidden = false;
    if (e.ring) { Snd.tone(880, 880, 0.18, 0.08, 'square'); setTimeout(() => Snd.tone(880, 880, 0.18, 0.08, 'square'), 280); }
  }
  const e = S.cur; if (!e) return;
  e.t += dt; if (e.t < 0) return;                                    // the phone still ringing
  const n = Math.min(e.L.text.length, Math.floor(e.t * MSN.letters));
  if (n > e.shown) { msMumble(e.ch, e.L.text, e.shown, n); e.shown = n; $('msLiveLine').textContent = e.L.text.slice(0, n); }
  if (e.t >= e.hold) { S.cur = null; if (!S.q.length) $('msLive').hidden = true; if (e.done) e.done(); }
}
function msLiveClear() { MS_LIVE.q = []; MS_LIVE.cur = null; $('msLive').hidden = true; }
function msTalkNext() {
  const T = MS.talk; if (!T) return;
  const L = T.lines[T.i];
  if (T.shown < L.text.length) { T.shown = L.text.length; T.t = 1e9; $('msLine').textContent = L.text; $('msMore').hidden = false; return; }
  if (T.i + 1 < T.lines.length) { msLine(T.i + 1); return; }
  const done = T.done, ret = T.ret; msTalkClose(); if (ret) state = ret; if (done) done();
}
function msTalkClose() { if (MS.talk && MS.talk.ret && state === 'talk') state = MS.talk.ret; MS.talk = null; $('msTalk').hidden = true; }
let msTapT = -1e9;                         // when a tap or a key last turned the page
const msTalkGuard = () => performance.now() - msTapT < 600;   // just after a page turn: a second press does nothing else
const msTalkOwn = e => !(e.target && e.target.closest && e.target.closest('#cutSkip, #menuBtn'));   // SKIP and MENU still work during a line
window.addEventListener('pointerdown', e => {   // a tap anywhere on the screen turns the page, at once (on the press, not the release)
  if (!MS.talk || !msTalkOwn(e)) return;
  e.preventDefault(); e.stopImmediatePropagation(); msTapT = performance.now(); msTalkNext();
}, true);
window.addEventListener('click', e => { if (msTalkGuard() && msTalkOwn(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);   // the click after that tap does nothing else
window.addEventListener('keydown', e => {   // before the game's own keys: E, Space and Enter turn the page (and do not skip the cutscene)
  if (!['KeyE', 'Space', 'Enter', 'KeyF'].includes(e.code)) return;
  if (!MS.talk) { if (msTalkGuard()) { e.preventDefault(); e.stopImmediatePropagation(); } return; }   // pressed again just after the last line: no cutscene skip, no car
  e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { msTapT = performance.now(); msTalkNext(); }
}, true);

/* ---------- cutscenes from the shot lists: the usual camera from above ---------- */
const MS_CAM = { WIDE: 0.7, CLOSE: 1.9, FOLLOW: 1.3, OVERHEAD: 1.5, FIXED: 1.1, PAN: 1.0 };
function msCut(name, done) {               // a shot: { dur, cam, at() → {x, y}, to() (PAN), line, enter(A), tick(A, dt, u), fadeOut, wait(A) → done, max }
  const make = MS.s.cuts && MS.s.cuts[name]; if (!make) { done(); return; }
  const A = MS.A, list = make(A);
  const shots = list.map((s, i) => ({ dur: s.dur, bars: true, fadeIn: i === 0 ? 0.6 : false, fadeOut: s.fadeOut || (i === list.length - 1 ? 0.6 : 0),
    enter() { s.said = false; s.readT = null; s.waitT = 0; if (s.enter) s.enter(A); this.tick(0, 0, 0); },
    tick(dt, t, u) {
      const place = () => { const p = s.at ? s.at(A) : P, q = s.cam === 'PAN' && s.to ? s.to(A) : null;
        cam.x = q ? lerp(p.x, q.x, smooth01(0, 1, u)) : p.x; cam.y = q ? lerp(p.y, q.y, smooth01(0, 1, u)) : p.y; cam.zoom = MS_CAM[s.cam] || 1.2; };
      if (MS.talk) { CUT.t = Math.max(0, CUT.t - dt); place(); return; }        // a line on screen: the shot waits for it, the camera stays
      if (s.line && !s.said && t >= MSN.lineGap) { s.said = true; msSay([s.line], () => {}); place(); return; }
      if (s.tick) s.tick(A, dt, u);
      place();
      const end = CUT.T - (this.fadeOut || 0);
      if (s.wait && !s.wait(A) && (s.waitT += dt) < (s.max || 12)) { if (CUT.t > end - 0.05) CUT.t = end - 0.05; }   // its action not done yet: the shot holds (at most max s)
      else if (s.said) { if (s.readT === null) s.readT = t; if (t - s.readT >= MSN.afterLine) CUT.t = Math.max(CUT.t, end); }   // its line read: on to the next shot
    } }));
  cutPlay({ skip: 'SKIP', ms: true, shots, end: () => { msTalkClose(); done(); } });
}

/* ---------- a path over the water from a to b (for a boat to follow): a grid search over the water field ---------- */
function msWaterPath(a, b) {
  const S = 60, x0 = Math.min(a[0], b[0]) - 2500, y0 = Math.min(a[1], b[1]) - 2500, nx = Math.ceil((Math.abs(a[0] - b[0]) + 5000) / S), ny = Math.ceil((Math.abs(a[1] - b[1]) + 5000) / S);
  const wet = (i, j) => boatDist(x0 + i * S, y0 + j * S) < -45, idx = (i, j) => j * nx + i;
  const si = Math.round((a[0] - x0) / S), sj = Math.round((a[1] - y0) / S), ti = Math.round((b[0] - x0) / S), tj = Math.round((b[1] - y0) / S);
  const g = new Float32Array(nx * ny).fill(Infinity), from = new Int32Array(nx * ny).fill(-1), open = [[0, si, sj]]; g[idx(si, sj)] = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, i, j] = open.splice(bi, 1)[0]; if (i === ti && j === tj) break;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue; const u = i + di, v = j + dj; if (u < 0 || v < 0 || u >= nx || v >= ny || !wet(u, v) && !(u === ti && v === tj)) continue;
      const c = g[idx(i, j)] + Math.hypot(di, dj); if (c >= g[idx(u, v)]) continue;
      g[idx(u, v)] = c; from[idx(u, v)] = idx(i, j); open.push([c + Math.hypot(ti - u, tj - v), u, v]);
    }
  }
  if (from[idx(ti, tj)] < 0) return [a, b];
  const pts = []; for (let k = idx(ti, tj); k >= 0; k = from[k]) pts.push([x0 + (k % nx) * S, y0 + Math.floor(k / nx) * S]);
  pts.reverse(); pts[0] = a; pts[pts.length - 1] = b;
  const clear = (p, q) => { const n = Math.ceil(dist(p[0], p[1], q[0], q[1]) / 30); for (let k = 1; k < n; k++) if (boatDist(lerp(p[0], q[0], k / n), lerp(p[1], q[1], k / n)) > -45) return false; return true; };
  const out = [pts[0]]; let k = 0;                                   // straightened: from each point, as far as the water stays clear
  while (k < pts.length - 1) { let j = pts.length - 1; while (j > k + 1 && !clear(pts[k], pts[j])) j--; out.push(pts[j]); k = j; }
  return out;
}

/* ---------- a way to run along the sidewalks from (x, y): the nearest street, then on, keeping as straight as the streets allow ---------- */
function msRunRoute(x, y, len) {
  const rd = nearestRoad(x, y, 900); if (!rd) return [];
  const E0 = RE[rd.e], fw0 = E0.len - rd.s >= rd.s ? 1 : -1, q0 = edgeAt(rd.e, rd.s, {}), near = ((x - q0.x) * (-q0.ty * fw0) + (y - q0.y) * (q0.tx * fw0)) >= 0 ? 1 : -1;
  const walk = side => {                    // along one sidewalk, on at each junction as straight as it goes; never a long jump over water or walls
    let e = rd.e, fw = fw0, s = fw > 0 ? rd.s : E0.len - rd.s, total = 0, gap = 0; const seen = new Set([e]), pts = [];
    while (total < len) {
      for (; s <= RE[e].len && total < len; s += 50, total += 50) {
        const q = sidewalkPoint({ e, fw, s, side }, 0, {});
        if (shoreDist(q.x, q.y) > 4 && !pedBlocked(q.x, q.y)) { pts.push({ x: q.x, y: q.y }); gap = 0; } else if ((gap += 50) > 150) return pts;
      }
      if (total >= len) break;
      const node = fw > 0 ? RE[e].b : RE[e].a, t = edgeAt(e, fw > 0 ? RE[e].len : 0, {}), tx = t.tx * fw, ty = t.ty * fw;
      let best = null, bd = -2;
      for (const ne of RN[node].e) { if (seen.has(ne)) continue; const F = RE[ne], f2 = F.a === node ? 1 : -1, u = edgeAt(ne, f2 > 0 ? 0 : F.len, {}), d = u.tx * f2 * tx + u.ty * f2 * ty; if (d > bd) { bd = d; best = ne; } }
      if (best === null) break;
      e = best; fw = RE[e].a === node ? 1 : -1; s = 0; seen.add(e);
    }
    return pts;
  };
  const mine = walk(near); if (mine.length * 50 >= len * 0.6) return mine;   // his own side of the street if it goes far enough, otherwise across
  const other = walk(-near); return other.length > mine.length ? other : mine;
}

/* ================= QUEST 01 - HARBOUR FAVOUR ================= */
MSCRIPT.q01 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P;
  const at = (x, y) => ({ x, y });
  function setup(A) {
    const M = MARINA, d = M.door;
    A.door = at(d[0] + 22, d[1] + 4);                                   // Marco: on the quay at the office door
    A.marco = msPed(A.door.x, A.door.y, 0, { shirt: msWho('marco').shirt, pants: msWho('marco').pants, msName: 'marco',
      step: (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); } });   // he stays at his door whatever happens
    const clear = b => {                                               // a berth for the mission's own boat: a boat moored there already goes
      for (const m of MB.moored.filter(q => dist(q.c.x, q.c.y, b[0], b[1]) < 40)) { MB.moored.splice(MB.moored.indexOf(m), 1); if (cars.includes(m.c) && P.car !== m.c) cars.splice(cars.indexOf(m.c), 1); }
      for (const c of cars.filter(q => q.t.boat && q !== P.car && dist(q.x, q.y, b[0], b[1]) < 40)) cars.splice(cars.indexOf(c), 1);
    };
    const b = M.berths[2]; clear(b); A.boat = msCar('speedboat', b[0], b[1], 0, '#f4f4f6');   // berth two: Marco's speedboat
    const b0 = M.berths[0]; clear(b0); A.empty = at(b0[0], b0[1]);   // pier 1's other side: Tito's pink speedboat, moored (empty once he is off in it)
    A.tboat = msCar('speedboat', b0[0], b0[1], 0, '#ff2bd6'); A.tboat.noEnter = true;   // never yours while Tito has it (js/06 nearestCar)
    A.hold = at(b0[0] + 180, b0[1] - 40);                              // where he waits for you, out past the pier ends
    const pr = M.piers[0], py = (pr[1] + pr[3]) / 2;
    A.tito = msPed(A.door.x + 4, A.door.y - 22, 0, { shirt: msWho('tito').shirt, pants: msWho('tito').pants, msName: 'tito', speed: 1,
      step: (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); } });   // Tito, Marco's courier: beside him with the bag
    A.carry = A.tito; face(A.tito, A.marco);
    A.tpath = [at(pr[0] - 6, py), at(b0[0], py), at(b0[0], pr[1] + 2)];   // his run: to pier 1, out along it, and over the side into his boat
    const J = JETTIES.reduce((best, j) => !best || dist(j.x, j.y, 7450, 6950) < dist(best.x, best.y, 7450, 6950) ? j : best, null), ja = J.a * Math.PI / 180;
    const on = u => at(J.x + Math.cos(ja) * u, J.y + Math.sin(ja) * u);
    A.jetty = { x: J.x, y: J.y, ja, len: J.len, w: J.w, hw: J.head[0] / 2, hd: J.head[1], base: on(-10), app: on(J.len + 220), dock: on(J.len + A.tboat.t.len / 2 + 6) };   // app: out on the jetty's line, where he lines up; dock: where his boat stops, bow to its head
    A.run = [A.jetty.base, ...msRunRoute(A.jetty.base.x, A.jetty.base.y, N().runLen * UNITS_PER_M)];   // Tito's way off the jetty: along the sidewalks
    const bay = MARINA.routes.bay, snap = (x, y) => bay.reduce((b, q) => !b || dist(q[0], q[1], x, y) < dist(b[0], b[1], x, y) ? q : b, null);
    const legs = [[A.hold.x, A.hold.y], snap(9300, 4600), snap(8526, 5320), snap(7450, 5188), snap(7450, 6950), [A.jetty.app.x, A.jetty.app.y]];
    A.route = [legs[0]]; for (let k = 1; k < legs.length; k++) A.route.push(...msWaterPath(legs[k - 1], legs[k]).slice(1));   // out round the bay, then for the jetty
    const st = [[0, 80], [-20, 80], [0, -80], [-40, 40], [-40, -40], [-60, 0]].map(([dx, dy]) => at(A.door.x + dx, A.door.y + dy)).find(q => shoreDist(q.x, q.y) > 10 && !pedBlocked(q.x, q.y)) || at(A.door.x - 40, A.door.y);
    P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // you start on the quay a few steps from Marco
  }
  function titoRuns(A) {                                               // Tito ashore: off the jetty and away along his fixed way on the sidewalks
    const p = A.tito, path = A.run; p.state = 'post';
    p.post = { x: p.x, y: p.y, a: 0, i: p.post ? p.post.i : 0, lx: p.x, ly: p.y, lt: 0, step: (q, dt) => {
      const po = q.post, w = path[Math.min(po.i, path.length - 1)];
      const crossing = nearestRoad(w.x, w.y, ROAD_HALF + 6) || nearestRoad(q.x, q.y, ROAD_HALF + 6);   // only where his way crosses the carriageway
      if (crossing && (po.wt || 0) < 3 && cars.some(o => !o.t.boat && !o.dead && carSpeed(o) > 3 * KMH && dist(o.x, o.y, q.x, q.y) < 150 && dist(o.x + o.vx * 0.6, o.y + o.vy * 0.6, q.x, q.y) < dist(o.x, o.y, q.x, q.y))) { po.wt = (po.wt || 0) + dt; q.vx = q.vy = 0; return true; }   // a car coming: he waits (3 s at most)
      if (!crossing) po.wt = 0;
      if (walkTo(q, w.x, w.y, RUN * N().titoRun / 100, dt) < 14 && po.i < path.length - 1) po.i++;
      if ((po.lt += dt) > 0.8) { if (dist(q.x, q.y, po.lx, po.ly) < 6 && po.i < path.length - 1) po.i++; po.lt = 0; po.lx = q.x; po.ly = q.y; }   // stuck: on to the next point
      return true; } };
  }
  function titoBolts(A) {                                              // the opening: off from Marco with the bag, down pier 1 and into his boat
    const t = A.tito; if (A.aboard || !t || A.bolting) return; A.bolting = true; t.post.i = 0;
    t.post.step = (q, dt) => { const po = q.post, w = A.tpath[po.i];
      if (walkTo(q, w.x, w.y, RUN * N().titoRun / 100, dt) < 6) { if (po.i < A.tpath.length - 1) po.i++; else titoAboard(A); }
      return true; };
  }
  function titoAboard(A, place) {                                      // Tito in his boat: off out of the berth to wait for you (place: there already)
    if (A.aboard) return; A.aboard = true; A.carry = null;
    const t = A.tito; if (t && peds.includes(t)) peds.splice(peds.indexOf(t), 1); A.tito = null;
    const c = A.tboat; if (place) { c.x = A.hold.x; c.y = A.hold.y; c.ang = 0; c.vx = c.vy = 0; }
    Object.assign(c, { driver: 'ai', msDrive: holdBoat });
  }
  function holdBoat(c) {                                               // js/07: out to the hold past the pier ends, then idling there
    const A = A0(); if (!A || !MS.on) { c.thr = 0; c.str = 0; return; }
    const h = A.hold, d = dist(c.x, c.y, h.x, h.y), spd = carSpeed(c); c.hb = false;
    if (d < 40) { c.thr = spd > 3 * KMH ? -0.5 : 0; c.str = 0; return; }
    c.str = clamp(angDiff(c.ang, Math.atan2(h.y - c.y, h.x - c.x)) * 2.4, -1, 1);
    c.thr = spd < Math.min(N().titoBoat * KMH, d * 0.6 + 5 * KMH) ? 1 : -0.4;
  }
  function dockBoat(c, dt, A) {                                        // the last stretch: in along the jetty's line, slower the nearer, bow to its head
    const J = A.jetty, L = J.dock, d = dist(c.x, c.y, L.x, L.y), spd = carSpeed(c), v = clamp(d / 8, 5, 28) * KMH; A.dockT = (A.dockT || 0) + dt;
    const ca = Math.cos(J.ja), sa = Math.sin(J.ja), u = Math.max(J.len + c.t.len / 2 + 6, (c.x - J.x) * ca + (c.y - J.y) * sa - 120);   // a point on the jetty's line ahead of him: he comes in straight along it
    c.str = clamp(angDiff(c.ang, Math.atan2(J.y + sa * u - c.y, J.x + ca * u - c.x)) * 2.4, -1, 1); c.hb = false;
    c.thr = spd > v * 1.15 ? -1 : spd < v ? 0.6 : 0;
    if (d < 120) {                                                     // the last metres eased in, as if on a line (firmer the nearer): off the line, out and across first (not into the T's corner)
      const v = -(c.x - J.x) * sa + (c.y - J.y) * ca, tu = J.len + c.t.len / 2 + 6 + Math.max(0, Math.abs(v) - 10), tx = J.x + ca * tu, ty = J.y + sa * tu, k = Math.min(1, dt * (0.4 + 2 * (1 - d / 120)));
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.ang += angDiff(c.ang, J.ja + Math.PI) * k; c.vx *= 1 - k; c.vy *= 1 - k;
    }
    if (d < 10 || (A.dockT > 12 && d < 40)) A.docked = true;   // only at the head: pinned out on the water by you, he keeps trying
  }
  function jettySpot(A, c) {                                           // the point of the jetty nearest his boat: where Tito steps off
    const J = A.jetty, ca = Math.cos(J.ja), sa = Math.sin(J.ja), dx = c.x - J.x, dy = c.y - J.y;
    const u = clamp(dx * ca + dy * sa, 0, J.len - 8), half = u >= J.len - J.hd ? J.hw - 8 : J.w / 2 - 6, v = clamp(-dx * sa + dy * ca, -half, half);
    return at(J.x + ca * u - sa * v, J.y + sa * u + ca * v);
  }
  function bagAt(A) {                                                  // the bag lands right where Tito is caught, a step towards you (never off into the water; a bridge's deck is ground)
    const t = A.tito, a = Math.atan2(P.y - t.y, P.x - t.x), q = at(t.x + Math.cos(a) * 8, t.y + Math.sin(a) * 8);
    return shoreDist(q.x, q.y) > -4 ? q : at(t.x, t.y);
  }
  function fleeBoat(c, dt) {                                           // js/07: Tito at the helm - round the bay for the jetty, off the shore, round boats, weaving when you close in
    const R = A0().route; if (!R || !MS.on) { c.thr = 0; c.str = 0; return; }
    if (A0().docking || (c.wi >= R.length - 1 && dist(c.x, c.y, R[c.wi][0], R[c.wi][1]) < 200)) { A0().docking = true; dockBoat(c, dt, A0()); return; }   // lined up off the jetty: in to its head
    if (c.wi < R.length - 1 && dist(c.x, c.y, R[c.wi][0], R[c.wi][1]) < 140) c.wi++;
    const w = R[c.wi], m = me(), dp = dist(c.x, c.y, m.x, m.y), spd = carSpeed(c), fx = Math.cos(c.ang), fy = Math.sin(c.ang);
    let want = Math.atan2(w[1] - c.y, w[0] - c.x), cruise = N().titoBoat * KMH * (dp > 1500 ? 0.8 : dp < 450 ? 1.25 : 1);
    if (dp < 420) want += 0.3 * Math.sin(gameT * 1.7);
    for (const o of cars) { if (o === c || o.sunk || !o.t.boat) continue; const dx = o.x - c.x, dy = o.y - c.y; if (Math.abs(dx) > 280 || Math.abs(dy) > 280) continue;
      const ah = dx * fx + dy * fy, sd = -dx * fy + dy * fx; if (ah > -10 && ah < 80 + c.t.len + spd * 0.5 && Math.abs(sd) < (c.t.wid + o.t.wid) * 0.6 + 34) want += sd > 0 ? -0.9 : 0.9; }
    const look = 60 + spd * 0.8, hx = c.x + fx * look, hy = c.y + fy * look;
    if (boatDist(hx, hy) > -70) { const g = boatGrad(hx, hy), away = Math.atan2(-g[1], -g[0]); want = away + clamp(angDiff(away, want), -1.1, 1.1); cruise *= 0.7; }
    c.str = clamp(angDiff(c.ang, want) * 2.4, -1, 1); c.thr = spd < cruise ? 1 : spd > cruise * 1.15 ? -0.4 : 0.05; c.hb = false;
    if (c.backT > 0) { c.backT -= dt; c.thr = -1; c.str = c.backS; return; }
    c.stuckT = spd < 6 * KMH && c.thr > 0.5 ? (c.stuckT || 0) + dt : 0;
    if (c.stuckT > 1) { c.stuckT = 0; c.backT = 1.1; c.backS = Math.random() < 0.5 ? -1 : 1; }   // stuck: astern a moment, swinging the bow away
  }
  const A0 = () => MS.A;
  const steps = [
    { enter(A) { MS.mark = () => A.marco; MS.start = { at: () => A.marco, label: msWho('marco').name, go: () => { A.opened = true; msCut('THE TAKINGS', () => msNext()); } }; },   // GO TO Marco (no line: the arrow over him): START MISSION by him
      tick(A) { if (P.car && !A.hinted && dist(P.car.x, P.car.y, A.door.x, A.door.y) < 140) { A.hinted = true; toast('GET OUT - TALK TO MARCO ON FOOT'); } return false; },
      jump(A) { titoAboard(A, true); } },
    { enter(A) { MS.mark = () => A.boat; },                                                              // GET IN
      tick(A) { return P.car === A.boat; },
      jump(A) { P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } },
    { enter(A) { titoAboard(A); const c = A.tboat; Object.assign(c, { driver: 'ai', msDrive: fleeBoat, wi: 1 }); MS.mark = () => A.tboat; },   // CHASE on the water (Tito aboard by now, whatever)
      tick(A) { const c = A.tboat;
        if (A.docked) { c.driver = null; c.msDrive = null; c.thr = 0; c.vx = c.vy = 0; c.noEnter = false; A.landed = true; A.landT = gameT; return true; }   // at the jetty's head
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.tboat.x, A.tboat.y) / UNITS_PER_M) + ' M TO TITO (GONE AT ' + N().awayWater + ')',
      jump(A) { const w = A.route[Math.max(0, A.route.length - 3)], c = A.tboat; Object.assign(c, { x: A.jetty.dock.x, y: A.jetty.dock.y, ang: A.jetty.ja + Math.PI, vx: 0, vy: 0, driver: null, msDrive: null, noEnter: false }); A.landed = A.docked = true; A.landT = gameT; if (P.car !== A.boat) { P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } A.boat.x = w[0]; A.boat.y = w[1]; P.x = w[0]; P.y = w[1]; } },
    { enter(A) { const h = jettySpot(A, A.tboat); A.tito = msPed(h.x, h.y, A.jetty.ja + Math.PI, { shirt: msWho('tito').shirt, pants: msWho('tito').pants, msName: 'tito', speed: 1 }); A.carry = A.tito; titoRuns(A); MS.mark = () => A.tito; MS.guide = () => A.tito; },   // CATCH on foot: off his boat onto the jetty right by it, the bag in his hand
      tick(A) { if (A.caught || P.car || P.swim || dist(P.x, P.y, A.tito.x, A.tito.y) > N().catch * UNITS_PER_M + 14) return false;   // out of the water first
        A.caught = true; msCut('CAUGHT', () => { msNext(); }); return false; },
      info: A => A.tito ? Math.round(dist(me().x, me().y, A.tito.x, A.tito.y) / UNITS_PER_M) + ' M TO TITO (GONE AT ' + awayNow() + ')' : '',
      jump(A) { if (P.car) exitCar(true); P.x = A.jetty.base.x; P.y = A.jetty.base.y; A.tboat.driver = null; A.tboat.msDrive = null; A.landed = true; A.carry = null; } },
    { enter(A) { if (!A.bag) A.bag = at(P.x + 30, P.y); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); MS.guide = () => A.bag; },   // COLLECT the bag
      tick(A) { if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > 26) return false; A.bag = null; A.hasBag = true; Snd.pickup(); popup(P.x, P.y - 14, 'THE BAG', '#b6ff3c'); return true; },
      jump(A) { A.bag = null; A.hasBag = true; } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },                                           // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco; },                                         // DELIVER: the closing
      tick(A) { if (A.home || dist(me().x, me().y, A.door.x, A.door.y) > 70) return false; A.home = true; if (P.car) exitCar(true); msCut('SQUARE', () => msNext()); return false; },
      jump(A) { P.x = A.door.x + 300; P.y = A.door.y + 200; } }];
  const awayNow = () => (P.car ? P.car.t.boat : P.swim) && gameT - (MS.A.landT || 0) < N().ashoreIn ? N().awayWater : N().awayFoot;   // Tito just ashore: a while (ashoreIn s) to come ashore yourself under the water's limit, then the foot one
  function fail(A) {
    const F = MS.m.fails;
    if (A.marco.dead) return F.marcoDead;
    if (!A.landed && A.tboat && (A.tboat.dead || A.tboat.sunk || A.tboat.hp <= 0)) return F.boatSank;   // shot to pieces or sunk with Tito aboard
    if (!A.landed && A.tboat && !cars.includes(A.tboat)) return F.away;
    if (A.tito && A.tito.dead && !A.caught) return F.titoDead;
    if (A.tboat && MS.k === 2 && dist(me().x, me().y, A.tboat.x, A.tboat.y) > N().awayWater * UNITS_PER_M) return F.away;
    if (A.tito && MS.k === 3 && !A.caught && dist(me().x, me().y, A.tito.x, A.tito.y) > awayNow() * UNITS_PER_M) return F.away;
    if (A.bag && shoreDist(A.bag.x, A.bag.y) < -10) return F.bagSank;   // in the water (on a bridge's deck it lies on the road)
    return '';
  }
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const cuts = {
    'THE TAKINGS': A => [
      { dur: 2, cam: 'FOLLOW', at: () => A.tito || A.tboat, line: 3, enter: () => titoBolts(A), wait: () => A.aboard && dist(A.tboat.x, A.tboat.y, A.empty.x, A.empty.y) > 110, max: 14 },   // Tito bolts with the bag down pier 1, shouting, and roars off in his boat
      { dur: 3, cam: 'CLOSE', at: () => A.marco, line: 1, enter: () => face(A.marco, P) },
      { dur: 3, cam: 'CLOSE', at: () => A.empty, line: 2 },
      { dur: 3, cam: 'CLOSE', at: () => A.boat, line: 4 }],
    CAUGHT: A => [
      { dur: 3, cam: 'OVERHEAD', at: () => A.tito, line: 5, enter: () => { A.tito.post.step = q => { q.vx = q.vy = 0; return true; }; face(A.tito, P); A.bag = bagAt(A); A.carry = null; } },   // he throws the bag down, right there
      { dur: 2, cam: 'FIXED', at: () => A.tito, enter: () => titoRuns(A) }],   // and runs on along his way
    SQUARE: A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: 6, enter: () => face(A.marco, P) },
      { dur: 5, cam: 'WIDE', at: () => at(MARINA.door[0] + 160, MARINA.door[1] + 40), line: 7 }]
  };
  function cleanup() { }
  return { setup, steps, fail, cuts, cleanup };
})();
