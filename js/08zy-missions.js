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
  if (!MS.on) return;
  if (MS.talk || CUT.on) { if (MS_LIVE.cur) $('msLive').hidden = true; return; }   // a live line waits out a cutscene or a dialogue, out of sight
  msLiveTick(dt); msCastTick(dt);
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
  MS.on = false; MS.A = null; MS.guide = null; MS.mark = null; MS.start = null; msTalkClose(); msLiveClear(); msCastClear(); if (CUT.on && CUT.sc && CUT.sc.ms) cutEnd();   // a mission's cutscene still playing: over if ($('msBtn')) $('msBtn').hidden = true;
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
  gfxCast();                                                        // bars over friends and a boss (js/08zz)
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
  MS.talk = { lines, i: -1, shown: 0, t: 0, last: 0, done, ret: CUT.on ? null : state }; if (MS_LIVE.cur) $('msLive').hidden = true;   // a live line waits out of sight
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
  if ($('msLive').hidden) $('msLive').hidden = false;                // back after a cutscene
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
  if (MS_LIVE.cur) $('msLive').hidden = true;                        // a live line in progress waits out of sight (msLiveTick shows it again)
  const A = MS.A, list = make(A);
  const shots = list.map((s, i) => ({ dur: s.dur, bars: true, fadeIn: i === 0 ? 0.6 : false, fadeOut: s.fadeOut || (i === list.length - 1 ? 0.6 : 0),
    enter() { s.said = false; s.readT = null; s.waitT = 0; if (s.enter) s.enter(A); this.tick(0, 0, 0); },
    tick(dt, t, u) {
      const place = () => { const p = s.at ? s.at(A) : P, q = s.cam === 'PAN' && s.to ? s.to(A) : null;
        cam.x = q ? lerp(p.x, q.x, smooth01(0, 1, u)) : p.x; cam.y = q ? lerp(p.y, q.y, smooth01(0, 1, u)) : p.y; cam.zoom = MS_CAM[s.cam] || 1.2; };
      if (MS.talk) { CUT.t = Math.max(0, CUT.t - dt); place(); return; }        // a line on screen: the shot waits for it, the camera stays
      if (s.line && !s.said && t >= MSN.lineGap) { s.said = true; msSay([].concat(s.line), () => {}); place(); return; }   // one line, or several one after another
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

/* ================= QUEST 02 - DOCK RATS ================= */
MSCRIPT.q02 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P, at = (x, y) => ({ x, y });
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const road = (x, y) => { const q = nearestRoad(x, y, 900), t = edgeAt(q.e, q.s, {}); return { x: t.x, y: t.y, a: Math.atan2(t.ty, t.tx) }; };
  const stay = (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); };   // at their place whatever happens
  const look = id => ({ shirt: msWho(id).shirt, pants: msWho(id).pants });
  function dryNear(x, y) {                                            // where something dropped lies: here, or the nearest dry spot (not in the water)
    if (shoreDist(x, y) > -4) return at(x, y);
    for (let r = 12; r <= 96; r += 12) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, q = at(x + Math.cos(a) * r, y + Math.sin(a) * r); if (shoreDist(q.x, q.y) > 2) return q; }
    return at(x, y);
  }
  function setup(A) {
    const d = MARINA.door; A.door = at(d[0] + 22, d[1] + 4);
    A.marco = msPed(A.door.x, A.door.y, 0, Object.assign(look('marco'), { msName: 'marco', step: stay }));   // Marco waits at his door
    A.dock = at(8092, 4488);                                            // the fuel dock's foot, on the quay
    A.lucia = msPed(8098, 4478, Math.PI, Object.assign(look('lucia'), { msName: 'lucia', step: stay }));
    A.rocco = msFoe(8066, 4490, Object.assign(look('rocco'), { gun: 'pistol', hp: N().roccoHp, group: 'rocco', name: 'rocco' })); A.rocco.calm = true;
    A.men = [[8048, 4470, 'pistol'], [8062, 4514, 'smg'], [8146, 4493, 'pistol']].map(([x, y, g]) => Object.assign(msFoe(x, y, { gun: g, hp: N().foeHp, group: 'dock' }), { calm: true }));
    face(A.rocco, A.lucia); for (const m of A.men) face(m, A.lucia); face(A.lucia, A.rocco);
    const rc = road(7809, 4309);                                        // Rocco's BRUISER on the street by the harbour; his way out: a long loop to the south-west
    A.rcar = msFoeCar('muscle', rc.x, rc.y, rc.a, Object.assign(look('rocco'), { mode: 'park', crew: 1, gun: 'pistol', group: 'rocco', speed: N().roccoSpeed, tough: N().roccoCar, crewHp: N().roccoHp, boss: true, name: 'rocco',
      to: [road(7400, 7440), road(5200, 6440), road(5288, 4200)] }));
    const st = road(7300, 4210), sx = -Math.sin(st.a), sy = Math.cos(st.a);   // you: on a street west of the harbour, a car at the kerb
    P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;
    A.mycar = msCar('estate', st.x + sx * 30 + Math.cos(st.a) * 40, st.y + sy * 30 + Math.sin(st.a) * 40, st.a, '#3d6fa8');
    A.spare = msCar('sports', 7990, 4400, Math.atan2(4243 - 4400, 7875 - 7990), '#f2c14a');   // a spare car on the quay, for the chase
  }
  function luciaJoins(A) { if (!A.lucia.ally) msAllyFrom(A.lucia, { who: 'lucia', gun: 'pistol', fail: MS.m.fails.luciaDead, hurtLine: 9 }); }
  function roccoRuns(A) {                                              // the fight turns: Rocco runs for his car
    A.rRun = true; msLive([10, 11], { now: true });
    const r = A.rocco; r.post.lt = 0; r.post.lx = r.x; r.post.ly = r.y;
    r.post.step = (q, dt) => {
      const c = A.rcar, door = allyDoor(c), po = q.post;
      if (walkTo(q, door.x, door.y, NPC_RUN * 1.1, dt) < 18 || dist(q.x, q.y, c.x, c.y) < c.t.wid / 2 + 26 || ((po.lt += dt) > 1.2 && dist(q.x, q.y, po.lx, po.ly) < 8 && dist(q.x, q.y, cam.x, cam.y) > 700)) {   // at the door (or stuck out of sight)
        const i = peds.indexOf(q); if (i >= 0) peds.splice(i, 1); A.rInCar = true; c.fc.wait = N().roccoStart; foeCarGo(c, 'flee'); return true;
      }
      if (po.lt > 1.2) { po.lt = 0; po.lx = q.x; po.ly = q.y; }
      return true;
    };
  }
  function roccoDown(A, x, y) { if (!A.phone) A.phone = dryNear(x, y); }
  const steps = [
    { enter(A) { MS.mark = () => A.dock; msLive([1, 2], { phone: true, done: () => { A.called = true; if (MS.k === 0) MS.guide = A.dock; } }); },   // GO TO: the call, then the line
      tick(A) {
        if (A.men.some(m => m.alert) || A.rocco.alert) return true;   // you started shooting first: the fight now
        if (!A.cutGo && dist(me().x, me().y, A.dock.x, A.dock.y) < N().dockR) { A.cutGo = true; msCut('RENT DAY', () => msNext()); }
        return false; },
      jump(A) { P.x = 8000; P.y = 4460; } },
    { enter(A) { luciaJoins(A); for (const m of A.men.concat(A.rocco)) foeAlert(m); MS.mark = null; MS.guide = null; A.t1 = gameT; msLive([7], { now: true }); },   // TAKE OUT the men, with Lucia
      tick(A) {
        if (!A.said8 && gameT - A.t1 > 3) { A.said8 = true; msLive([8]); }
        const men = A.men.filter(m => !m.dead).length;
        if (A.rocco.dead && !A.rInCar) { roccoDown(A, A.rocco.x, A.rocco.y); if (!men) msEnter(4); return false; }   // Rocco shot before he reached his car: his phone, once the men are down
        if (!A.rRun && (men <= N().runAt || A.rocco.hp < N().roccoHp * 0.5)) roccoRuns(A);
        return !!A.rInCar; },
      info: A => A.men.filter(m => !m.dead).length + ' MEN LEFT',
      jump(A) {
        for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); luciaJoins(A);
        const i = peds.indexOf(A.rocco); if (i >= 0) peds.splice(i, 1); A.rRun = A.rInCar = true; foeCarGo(A.rcar, 'flee');
        const c = A.mycar, r = A.rcar; c.x = r.x - Math.cos(r.ang) * 160; c.y = r.y - Math.sin(r.ang) * 160; c.ang = r.ang; c.vx = c.vy = 0;
        if (P.car) exitCar(true); P.x = c.x; P.y = c.y; enterCar(c); allyBoard(A.lucia, c); } },
    { enter(A) { MS.mark = () => A.rcar; MS.guide = () => A.rcar; },   // CHASE his car
      tick(A) {
        const c = A.rcar;
        if (c.fc.out) { A.rocco = c.fc.men[0]; msLive([12], { now: true }); return true; }
        if (c.dead || c.burn > 0) { roccoDown(A, c.x, c.y); msLive([13], { now: true }); msEnter(4); }   // up in flames with him in it
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.rcar.x, A.rcar.y) / UNITS_PER_M) + ' M TO ROCCO (GONE AT ' + N().awayCar + ')',
      jump(A) { A.rocco = foeBail(A.rcar)[0]; } },
    { enter(A) { MS.mark = () => A.rocco; MS.guide = () => A.rocco; },   // TAKE OUT Rocco on foot
      tick(A) { if (!A.rocco.dead) return false; roccoDown(A, A.rocco.x, A.rocco.y); msLive([13], { now: true }); return true; },
      info: A => 'ROCCO ' + Math.max(0, Math.round(A.rocco.hp)) + ' HP',
      jump(A) { if (!A.rocco.dead) killPed(A.rocco, 'gun', false); roccoDown(A, A.rocco.x, A.rocco.y); } },
    { enter(A) { A.bag = A.phone || dryNear(P.x + 30, P.y); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); MS.guide = () => A.bag; },   // COLLECT his phone
      tick(A) { if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > 26) return false; A.bag = null; A.hasPhone = true; Snd.pickup(); popup(P.x, P.y - 14, "ROCCO'S PHONE", '#b6ff3c'); msLive([14], { now: true }); return true; },
      jump(A) { A.bag = null; A.hasPhone = true; } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },        // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco; },        // DELIVER: the phone to Marco, the closing
      tick(A) {
        if (A.home || dist(me().x, me().y, A.door.x, A.door.y) > N().marcoR) return false;
        A.home = true; if (P.car) exitCar(true);
        const L = A.lucia; if (L.aboard) allyAlight(L);
        if (dist(L.x, L.y, A.door.x, A.door.y) > 140) { L.x = A.door.x + 30; L.y = A.door.y + 34; L.vx = L.vy = 0; }   // she is with you
        msCut('FAMILY BUSINESS', () => msNext()); return false; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.marco.dead) return F.marcoDead;
    const f = msCastFail(); if (f) return f;
    if (A.lucia.dead) return F.luciaDead;
    if (MS.k === 2 && (A.rcar.fc.gone || dist(me().x, me().y, A.rcar.x, A.rcar.y) > N().awayCar * UNITS_PER_M)) return F.away;
    if (A.bag && shoreDist(A.bag.x, A.bag.y) < -10) return F.phoneSank;
    return '';
  }
  const cuts = {
    'RENT DAY': A => [
      { dur: 3, cam: 'WIDE', at: () => A.dock, line: 3, enter: () => face(A.rocco, A.lucia) },
      { dur: 3, cam: 'CLOSE', at: () => A.lucia, line: 4 },
      { dur: 3, cam: 'CLOSE', at: () => A.rocco, line: 5 },
      { dur: 3, cam: 'CLOSE', at: () => A.lucia, line: 6, enter: () => face(A.lucia, P) }],
    'FAMILY BUSINESS': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [15, 16], enter: () => face(A.marco, P) },
      { dur: 4, cam: 'WIDE', at: () => at(A.door.x + 60, A.door.y + 30), line: [17, 18], enter: () => { face(A.marco, A.lucia); face(A.lucia, A.marco); } },
      { dur: 5, cam: 'CLOSE', at: () => A.marco, line: [19, 20, 21], enter: () => face(A.marco, P) }]
  };
  return { setup, steps, fail, cuts, cleanup() { } };
})();

/* ================= QUEST 03 - PAPER TRAIL ================= */
MSCRIPT.q03 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P, at = (x, y) => ({ x, y });
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const road = (x, y) => { const q = nearestRoad(x, y, 900), t = edgeAt(q.e, q.s, {}); return { x: t.x, y: t.y, a: Math.atan2(t.ty, t.tx) }; };
  const stay = (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); };
  const look = id => ({ shirt: msWho(id).shirt, pants: msWho(id).pants });
  const walkOn = (p, pts, then) => { let i = 0; p.post.step = (q, dt) => { const w = pts[i]; if (walkTo(q, w.x, w.y, WALK * 1.6, dt) < 6) { if (i < pts.length - 1) i++; else { q.vx = q.vy = 0; if (then) { const f = then; then = null; f(q); } } } return true; }; };   // along a few points
  function setup(A) {
    SKY.hour = N().hour; A.clubPass = true;                             // night: The Pulse is open; Del's pass opens its door for him (and you)
    const C = casClub(), [kx, ky] = CASM.cdoor; A.cdoor = at(kx, ky + 26);
    A.lucia = msPed(11860, 6380, Math.PI, Object.assign(look('lucia'), { msName: 'lucia', step: stay }));
    A.lcar = msCar('convertible', 11905, 6418, 0, '#2fe0c8');           // Lucia's SUNDANCER at the kerb
    A.del = msPed(kx, ky - 22, Math.PI / 2, Object.assign(look('del'), { msName: 'del', step: stay }));   // inside, by the door
    A.book = at(C.x0 + 33, C.y0 + 66);                                  // the cash box at the north end of the bar
    A.men = [[C.x0 + 93, C.y0 + 154], [C.x0 + 93, C.y0 + 254], [C.x0 + 188, C.y0 + 68], [C.x0 + 128, C.y1 - 44]].map(([x, y], i) =>
      Object.assign(msFoe(x, y, { gun: i === 2 ? 'smg' : 'pistol', hp: N().foeHp, group: 'club', a: i < 2 ? Math.PI : Math.PI / 2 }), { calm: true }));
    const d = MARINA.door; A.door = at(d[0] + 22, d[1] + 4);
    A.marco = msPed(A.door.x, A.door.y, 0, Object.assign(look('marco'), { msName: 'marco', step: stay }));
    P.x = 11990; P.y = 6386; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // a few steps from Lucia
  }
  function delBack(A) { if (!A.delGone && !A.del.dead) walkOn(A.del, [at(CASM.cdoor[0], CASM.cdoor[1] + 28), at(CASM.cdoor[0], CASM.cdoor[1] - 20)], q => { const i = peds.indexOf(q); if (i >= 0) peds.splice(i, 1); A.delGone = true; }); }
  function luciaJoins(A) { if (!A.lucia.ally) { msAllyFrom(A.lucia, { who: 'lucia', gun: 'pistol', fail: MS.m.fails.luciaDead, hurtLine: 12 }); msLive([11], { now: true }); } }
  function chasers(A) {                                                // two Varga cars after you as you come out
    if (A.cars) return;
    A.cars = [road(11100, 6440), road(12379, 6700)].slice(0, N().chasers).map((r, i) =>
      msFoeCar(i ? 'sedan' : 'muscle', r.x, r.y, r.a, { crew: 2, gun: i ? 'pistol' : 'smg', group: 'chase', speed: 90 }));
  }
  const live = c => !c.dead && !c.fc.out && c.fc.crew > 0;           // still a car with men in it
  function lost(A, dt) {                                              // every Varga car wrecked or emptied (and its men down or left behind), or far behind you for a while
    const left = A.cars.filter(c => live(c) || (c.fc.men || []).some(m => !m.dead));
    if (!left.length) return true;
    const far = left.every(c => live(c) ? dist(c.x, c.y, me().x, me().y) > N().loseAt * UNITS_PER_M : c.fc.men.every(m => m.dead || dist(m.x, m.y, me().x, me().y) > MSN.foeLeash * 1.5 * UNITS_PER_M));   // a man on foot gives up beyond his leash
    A.farT = far ? (A.farT || 0) + dt : 0; return A.farT > N().loseFor;
  }
  const steps = [
    { enter(A) { MS.mark = () => A.lucia; MS.start = { at: () => A.lucia, label: msWho('lucia').name, go: () => msCut('THE CROUPIER', () => msNext()) }; },   // TALK TO Lucia
      tick() { return false; },
      jump(A) { const i = peds.indexOf(A.del); if (i >= 0) peds.splice(i, 1); A.delGone = true; } },
    { enter(A) { A.clubPass = true; MS.mark = () => A.cdoor; MS.guide = A.cdoor; delBack(A); },   // GO TO the club (Del's pass; he goes back in if the cutscene was skipped)
      tick() { return inClub(P.x, P.y, 6); },
      jump(A) { A.clubPass = true; if (P.car) exitCar(true); P.x = CASM.cdoor[0]; P.y = CASM.cdoor[1] - 30; } },
    { enter(A) { A.bag = A.book; MS.mark = () => A.bag && at(A.bag.x, A.bag.y); MS.guide = () => A.bag; },   // COLLECT the ledger
      tick(A) {
        if (!A.alarm && A.men.some(m => m.alert)) { A.alarm = true; msLive([10], { now: true }); }   // you started it before the book
        if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > 26) return false;
        A.bag = null; A.hasBook = true; Snd.pickup(); popup(P.x, P.y - 14, "NICO'S LEDGER", '#b6ff3c');
        for (const m of A.men) foeAlert(m); if (!A.alarm) { A.alarm = true; msLive([9, 10], { now: true }); }
        return true; },
      jump(A) { A.bag = null; A.hasBook = true; A.alarm = true; for (const m of A.men) foeAlert(m); } },
    { enter(A) { MS.mark = () => A.lucia; MS.guide = () => A.lucia; },   // GO TO Lucia, out of the club
      tick(A) {
        if (!inClub(me().x, me().y, -6)) chasers(A);
        if (!inClub(me().x, me().y, -6) && dist(me().x, me().y, A.lucia.x, A.lucia.y) < N().luciaR) { luciaJoins(A); return true; }
        return false; },
      jump(A) { if (P.car) exitCar(true); P.x = A.lucia.x + 30; P.y = A.lucia.y; chasers(A); luciaJoins(A); } },
    { enter(A) { chasers(A); MS.mark = null; MS.guide = null; A.t4 = gameT; },   // SURVIVE: lose the Varga cars
      tick(A, dt) {
        if (!A.called && gameT - A.t4 > 6) { A.called = true; msLive([13, 14], { phone: true }); msLive([15]); }
        if (!lost(A, dt)) return false; msLive([16], { now: true }); return true; },
      info: A => A.cars ? A.cars.filter(c => live(c)).length + ' CARS AFTER YOU' : '',
      jump(A) { for (const c of A.cars || []) { c.fc.out = true; c.fc.men = []; c.driver = null; c.msDrive = null; } } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },        // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco; },        // DELIVER: the ledger to Marco
      tick(A) {
        if (A.home || dist(me().x, me().y, A.door.x, A.door.y) > N().marcoR) return false;
        A.home = true; if (P.car) exitCar(true);
        const L = A.lucia; if (L.aboard) allyAlight(L);
        if (dist(L.x, L.y, A.door.x, A.door.y) > 140) { L.x = A.door.x + 30; L.y = A.door.y + 34; L.vx = L.vy = 0; }
        msCut('THE BOOKS', () => msNext()); return false; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.marco.dead) return F.marcoDead;
    const f = msCastFail(); if (f) return f;
    if (A.lucia.dead) return F.luciaDead;
    if (A.del.dead && !A.delGone) return F.delDead;
    return '';
  }
  const cuts = {
    'THE CROUPIER': A => [
      { dur: 3, cam: 'CLOSE', at: () => A.lucia, line: 1, enter: () => face(A.lucia, P) },
      { dur: 3, cam: 'FOLLOW', at: () => A.del, line: [2, 3], enter: () => { walkOn(A.del, [at(CASM.cdoor[0], CASM.cdoor[1] + 28), at(A.lucia.x - 40, A.lucia.y - 4)], q => face(q, A.lucia)); face(A.lucia, A.del); }, wait: () => dist(A.del.x, A.del.y, A.lucia.x, A.lucia.y) < 50, max: 6 },
      { dur: 3, cam: 'CLOSE', at: () => A.del, line: [4, 5] },
      { dur: 3, cam: 'CLOSE', at: () => A.lucia, line: [6, 7] },
      { dur: 3, cam: 'WIDE', at: () => at(A.lucia.x - 20, A.lucia.y + 20), line: 8, enter: () => { face(A.lucia, P); delBack(A); } }],
    'THE BOOKS': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [17, 18], enter: () => face(A.marco, P) },
      { dur: 4, cam: 'WIDE', at: () => at(A.door.x + 60, A.door.y + 30), line: [19, 20], enter: () => { face(A.marco, A.lucia); face(A.lucia, A.marco); } },
      { dur: 5, cam: 'CLOSE', at: () => A.marco, line: [21, 22], enter: () => face(A.marco, P) }]
  };
  return { setup, steps, fail, cuts, cleanup() { } };
})();

/* ================= QUEST 04 - HOT CARGO ================= */
MSCRIPT.q04 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P, at = (x, y) => ({ x, y });
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const road = (x, y) => { const q = nearestRoad(x, y, 900), t = edgeAt(q.e, q.s, {}); return { x: t.x, y: t.y, a: Math.atan2(t.ty, t.tx) }; };
  const walkSide = (x, y, side) => { const q = nearestRoad(x, y, 900), t = edgeAt(q.e, q.s, {}), off = walkOffset(t.x - t.ty * side * SIDEWALK, t.y + t.tx * side * SIDEWALK) * side; return at(t.x - t.ty * off, t.y + t.tx * off); };   // on the sidewalk beside a street
  const stay = (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); };
  const look = id => ({ shirt: msWho(id).shirt, pants: msWho(id).pants });
  const up = list => list.filter(p => !p.dead);
  const nearest = list => up(list).sort((a, b) => dist(a.x, a.y, me().x, me().y) - dist(b.x, b.y, me().x, me().y))[0];
  function setup(A) {
    const S = A.S = IXS.find(q => q.name === 'HARBOR COLD STORE'); S.ms = true; S.open = 1; S.ds.off = true;   // the mission holds the store: its roller door up, nobody at work (js/08zx)
    const W = (lx, lz) => ixWorld(S, lx, lz, {}), out = S.a + Math.PI / 2;   // out: the way the door faces
    A.doorIn = W(0, S.hd - 40);
    const d = MARINA.door; A.door = at(d[0] + 22, d[1] + 4); A.drop = at(8010, 4370);   // Marco at his door; the truck stops on the quay
    A.marco = msPed(A.door.x, A.door.y, 0, Object.assign(look('marco'), { msName: 'marco', step: stay }));
    A.sol = msPed(0, 0, 0, Object.assign(look('sol'), { msName: 'sol', hardhat: '#ffd23f', step: stay }));   // Sol: on the sidewalk up the street, looking at the store
    const s = walkSide(S.dx - 118, S.dy - 440, 1); A.sol.x = A.sol.post.x = s.x; A.sol.y = A.sol.post.y = s.y; face(A.sol, at(S.dx, S.dy));
    A.guards = [[-52, 30], [52, 36]].map(([lx, dz]) => { const w = W(lx, S.hd + dz); return Object.assign(msFoe(w.x, w.y, { gun: 'pistol', hp: N().foeHp, group: 'door', a: out }), { calm: true }); });
    A.men = [[-34, 140, 'pistol'], [40, 60, 'smg'], [-40, -20, 'pistol'], [36, -170, 'pistol']].map(([lx, lz, g]) => { const w = W(lx, lz);
      return Object.assign(msFoe(w.x, w.y, { gun: g, hp: N().foeHp, group: 'store', a: out }), { calm: true }); });
    const tw = W(0, -100); A.truck = msCar('truck', tw.x, tw.y, out, '#c8ccd2');   // the engine truck at the back, facing the door, the keys in it
    A.truck.hp = A.truck.maxhp = A.truck.maxhp * N().truckTough;
    const k = kerbBy(7880, 4300); A.mycar = msCar('sports', k.x, k.y, k.ang, '#f2c14a');   // a car at the kerb by the harbour
    const st = [[0, 80], [-20, 80], [0, -80], [-40, 40], [-40, -40], [-60, 0]].map(([dx, dy]) => at(A.door.x + dx, A.door.y + dy)).find(q => shoreDist(q.x, q.y) > 10 && !pedBlocked(q.x, q.y)) || at(A.door.x - 40, A.door.y);
    P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // a few steps from Marco
  }
  function solJoins(A) { if (!A.sol.ally) { A.sol.hardhat = '#ffd23f'; msAllyFrom(A.sol, { who: 'sol', gun: 'shotgun', fail: MS.m.fails.solDead, hurtLine: 13 }); } }
  function chasers(A) {                                                // two Varga cars after the truck: one from up the street, one from behind
    if (A.cars) return;
    A.cars = [road(5087, 10450), road(4748, 12400)].slice(0, N().chasers).map((r, i) =>
      msFoeCar(i ? 'sedan' : 'muscle', r.x, r.y, r.a, { crew: 2, gun: i ? 'pistol' : 'smg', group: 'chase', speed: N().chaseSpeed }));
    msLive([15], { now: true });
  }
  const live = c => !c.dead && !c.fc.out && c.fc.crew > 0;
  function lost(A, dt) {                                              // every Varga car wrecked or emptied (and its men down or left behind), or far behind you for a while
    const left = A.cars.filter(c => live(c) || (c.fc.men || []).some(m => !m.dead));
    if (!left.length) return true;
    const far = left.every(c => live(c) ? dist(c.x, c.y, me().x, me().y) > N().loseAt * UNITS_PER_M : c.fc.men.every(m => m.dead || dist(m.x, m.y, me().x, me().y) > MSN.foeLeash * 1.5 * UNITS_PER_M));   // a man on foot gives up beyond his leash
    A.farT = far ? (A.farT || 0) + dt : 0; return A.farT > N().loseFor;
  }
  const started = A => A.guards.concat(A.men).some(m => m.alert || m.dead);   // the fight is on
  const steps = [
    { enter(A) { MS.mark = () => A.marco; MS.start = { at: () => A.marco, label: msWho('marco').name, go: () => msCut('BRING THEM HOME', () => msNext()) }; },   // TALK TO Marco
      tick() { return false; } },
    { enter(A) { MS.mark = () => A.sol; MS.guide = () => A.sol; },     // GO TO Sol, up the street from the store
      tick(A) {
        if (started(A)) { solJoins(A); msLive([22], { now: true }); msEnter(2); return false; }   // you started it before meeting him: he runs to join you
        if (!A.cutGo && dist(me().x, me().y, A.sol.x, A.sol.y) < N().solR) { A.cutGo = true; msCut('THE COLD STORE', () => msNext()); }
        return false; },
      jump(A) { if (P.car) exitCar(true); P.x = A.sol.x + 30; P.y = A.sol.y; } },
    { enter(A) { solJoins(A); for (const m of A.guards) m.calm = false; MS.mark = () => nearest(A.guards); MS.guide = () => nearest(A.guards); },   // TAKE OUT the door guards: they watch now
      tick(A) {
        if (!A.said11 && A.guards.some(m => m.alert)) { A.said11 = true; msLive([11], { now: true }); }
        return !up(A.guards).length; },
      info: A => up(A.guards).length + ' AT THE DOOR',
      jump(A) { solJoins(A); for (const m of A.guards) if (!m.dead) killPed(m, 'gun', false); } },
    { enter(A) { for (const m of A.men) m.calm = false; MS.mark = () => nearest(A.men); MS.guide = () => nearest(A.men) || A.doorIn; },   // TAKE OUT the men inside
      tick(A) {
        if (!A.said12 && A.men.some(m => m.alert)) { A.said12 = true; msLive([12], { now: true }); }
        if (up(A.men).length) return false; msLive([14], { now: true }); return true; },
      info: A => up(A.men).length + ' MEN LEFT',
      jump(A) { solJoins(A); for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); if (P.car) exitCar(true); P.x = A.doorIn.x; P.y = A.doorIn.y; } },
    { enter(A) { MS.mark = () => A.truck; MS.guide = () => A.truck; },   // GET IN the truck
      tick(A) { return P.car === A.truck; },
      jump(A) { if (P.car) exitCar(true); P.x = A.truck.x; P.y = A.truck.y; enterCar(A.truck); allyBoard(A.sol, A.truck); } },
    { enter(A) { chasers(A); MS.mark = () => P.car === A.truck ? null : A.truck; MS.guide = () => P.car === A.truck ? A.drop : A.truck; A.t5 = gameT; },   // SURVIVE: the Varga cars, on the way back
      tick(A, dt) {
        if (!A.called && gameT - A.t5 > 8) { A.called = true; msLive([16, 17, 18], { phone: true }); msLive([19]); }
        if (!lost(A, dt)) return false; msLive([20], { now: true }); return true; },
      info: A => A.cars ? A.cars.filter(c => live(c)).length + ' CARS AFTER YOU' : '',
      jump(A) { chasers(A); for (const c of A.cars) { c.fc.out = true; c.fc.men = []; c.driver = null; c.msDrive = null; } } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },        // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = () => P.car === A.truck ? A.drop : A.truck; MS.mark = () => P.car === A.truck ? A.marco : A.truck; A.t7 = gameT; },   // DELIVER: the truck to the quay by Marco
      tick(A) {
        if (!A.told && gameT - A.t7 > N().storyAt && A.sol.aboard) { A.told = true; msLive([21]); }   // Sol's story on the way
        if (A.home || dist(A.truck.x, A.truck.y, A.drop.x, A.drop.y) > N().dropR) return false;
        A.home = true; if (P.car) exitCar(true);
        const L = A.sol; if (L.aboard) allyAlight(L);
        if (dist(L.x, L.y, A.door.x, A.door.y) > 160) { const d = allyDoor(A.truck); L.x = d.x; L.y = d.y; L.vx = L.vy = 0; }   // he is with you
        msCut('TWELVE ENGINES', () => msNext()); return false; },
      info: A => P.car === A.truck ? Math.round(dist(A.truck.x, A.truck.y, A.drop.x, A.drop.y) / UNITS_PER_M) + ' M TO MARCO' : 'GET BACK IN THE TRUCK' }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.marco.dead) return F.marcoDead;
    const f = msCastFail(); if (f) return f;
    if (A.sol.dead) return F.solDead;
    if (A.truck.dead || A.truck.burn > 0 || A.truck.sunk) return F.truckDead;
    return '';
  }
  const cuts = {
    'BRING THEM HOME': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [1, 2], enter: () => face(A.marco, P) },
      { dur: 4, cam: 'WIDE', at: () => at(A.door.x + 60, A.door.y + 30), line: [3, 4], enter: () => face(A.marco, at(A.marco.x - 200, A.marco.y + 600)) },
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: 5, enter: () => face(A.marco, P) }],
    'THE COLD STORE': A => [
      { dur: 3, cam: 'CLOSE', at: () => A.sol, line: 6, enter: () => face(A.sol, P) },
      { dur: 5, cam: 'WIDE', at: () => at(A.S.dx - 30, A.S.dy), line: [7, 8], enter: () => face(A.sol, at(A.S.dx, A.S.dy)) },
      { dur: 3, cam: 'CLOSE', at: () => A.sol, line: 9, enter: () => face(A.sol, P) },
      { dur: 3, cam: 'CLOSE', at: () => A.sol, line: 10, enter: () => { A.sol.arm = gunIdx('shotgun'); Snd.tone(220, 140, 0.08, 0.1, 'square'); } }],   // he racks his shotgun
    'TWELVE ENGINES': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [23, 24], enter: () => { face(A.marco, A.truck); face(A.sol, A.marco); } },
      { dur: 4, cam: 'WIDE', at: () => at(A.door.x + 60, A.door.y + 30), line: [25, 26], enter: () => face(A.marco, at(A.marco.x + 400, A.marco.y + 300)) },
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: 27, enter: () => face(A.marco, P) }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A.S) A.S.ms = false; } };
})();

/* ================= QUEST 05 - ISLAND VISIT ================= */
MSCRIPT.q05 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P, at = (x, y) => ({ x, y });
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const stay = (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); };
  const look = id => ({ shirt: msWho(id).shirt, pants: msWho(id).pants });
  const up = list => list.filter(p => !p.dead);
  const nearest = list => up(list).sort((a, b) => dist(a.x, a.y, me().x, me().y) - dist(b.x, b.y, me().x, me().y))[0];
  const free = (x, y) => !pedBlocked(x, y) && shoreDist(x, y) > 6;
  const water = (pts, d) => pts.map(([x, y]) => at(x, y)).find(q => shoreDist(q.x, q.y) < -d) || at(pts[0][0], pts[0][1]);   // the first of these well out on the water
  function setup(A) {
    prisonReset(); PRX.visit = false;                                   // the ferry at the promenade pier, no alarm
    const [gx, gy] = PRZ.gate; A.gateOut = at(gx, gy + 46); A.gateIn = at(gx, gy - 46);
    A.guard = msPed(gx + 34, gy + 32, -Math.PI / 2, Object.assign(look('guard'), { msName: 'guard', step: stay }));   // Officer Dunn by the gate, outside
    A.ivo = msPed(8870, 3742, -Math.PI / 2, Object.assign(look('ivo'), { msName: 'ivo', step: stay }));   // Ivo south of the court, facing it
    const orange = { shirt: PRI_ORANGE, pants: PRI_ORANGE };
    A.men = [[8838, 3632, 'knife'], [8866, 3622, 'bat'], [8955, 3572, 'knife'], [8790, 3600, 'bat'], [8955, 3775, 'knife']].map(([x, y, g], i) =>   // two by the hoop; three more about the yard
      Object.assign(msFoe(x, y, Object.assign({ gun: g, hp: N().riotHp, group: i < 2 ? 'riot1' : 'riot2', a: Math.atan2(3742 - y, 8870 - x) }, orange)), { calm: true }));
    const [px0, py0, px1] = PRZ.pier; A.boat = msCar('speedboat', 0, 0, Math.PI / 2, '#2fe0c8');   // Lucia's boat beside the island pier
    const bw = water([[px1 + 42, 4350], [px1 + 42, 4390], [px0 - 42, 4350], [px0 - 42, 4390]], 14); A.boat.x = bw.x; A.boat.y = bw.y;
    A.boat.hp = A.boat.maxhp = A.boat.maxhp * N().boatTough;
    const d = MARINA.door; A.door = at(d[0] + 22, d[1] + 4); const b = MARINA.berths[2]; A.drop = at(b[0], b[1]);
    const lq = [[40, 30], [30, 34], [60, 10], [-30, 40]].map(([dx, dy]) => at(A.door.x + dx, A.door.y + dy)).find(q => free(q.x, q.y)) || at(A.door.x + 30, A.door.y + 34);
    A.lucia = msPed(lq.x, lq.y, 0, Object.assign(look('lucia'), { msName: 'lucia', step: stay })); face(A.lucia, A.drop);   // on the quay, for the closing
    const [kx, ky] = PRZ.kiosk; A.ferryPier = at((PRZ.mhead[0] + PRZ.mhead[2]) / 2, (PRZ.mhead[1] + PRZ.mhead[3]) / 2);
    const st = [[-60, 0], [-50, 40], [0, 50], [-70, -30]].map(([dx, dy]) => at(kx + dx, ky + dy)).find(q => free(q.x, q.y)) || at(kx - 60, ky);
    P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // by the ferry kiosk on the promenade
  }
  function holdKit(A) {                                                // searched at the gate: every weapon but your fists waits in the booth
    if (A.kit) return; A.kit = { has: P.has.slice(), ammo: P.ammo.slice(), mag: P.mag.slice(), weapon: P.weapon };
    P.has = WEAPONS.map(w => !!w.start); P.weapon = Math.max(0, P.has.indexOf(true)); P.swing = null;
  }
  function kitBack(A) {                                                // back on the way out (and whatever happens, at the end)
    const k = A.kit; if (!k || A.kitBack) return; A.kitBack = true;
    for (let i = 0; i < WEAPONS.length; i++) { P.has[i] = P.has[i] || k.has[i]; P.ammo[i] = Math.max(P.ammo[i], k.ammo[i]); P.mag[i] = Math.max(P.mag[i], k.mag[i]); }
    if (P.has[k.weapon]) P.weapon = k.weapon;
  }
  function riot(A) {                                                   // Nico's men go for you; Ivo throws you a bat; the siren
    A.riot = true; A.t3 = gameT; PRX.lock = true;
    for (const m of A.men.filter(q => q.group === 'riot1')) foeAlert(m);
    msLive([15, 16], { now: true, done: () => { const bi = gunIdx('bat'); if (!P.has[bi]) { P.has[bi] = true; popup(P.x, P.y - 14, 'BASEBALL BAT', '#b6ff3c'); } if (!P.car) P.weapon = bi; } });
    msLive([17]); toast('LOCKDOWN!', true);
    walkOnTo(A.ivo, at(8955, 3772));
  }
  function walkOnTo(p, q) { p.post.step = (o, dt) => { if (o.state === 'flee') o.state = 'post'; if (walkTo(o, q.x, q.y, RUN, dt) < 8) { o.vx = o.vy = 0; o.post.x = q.x; o.post.y = q.y; o.post.step = stay; } return true; }; }
  function boats(A) {                                                  // the Varga boats round the point: out on open water, out of sight, from two sides
    if (A.boats) return;
    const o = me(), ring = [];
    for (let r = 1000; r <= 1600 && ring.length < 6; r += 200) for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
      if (shoreDist(x, y) < -70 && dist(x, y, cam.x, cam.y) > 800 && ring.every(q => dist(q.x, q.y, x, y) > 500)) ring.push({ x, y });
    }
    ring.sort((p, q) => dist(p.x, p.y, o.x, o.y) - dist(q.x, q.y, o.x, o.y));
    const pick = ring.length > 1 ? [ring[0], ring.slice(1).sort((p, q) => dist(q.x, q.y, ring[0].x, ring[0].y) - dist(p.x, p.y, ring[0].x, ring[0].y))[0]] : ring;   // the nearest, and the one furthest from it
    A.boats = pick.slice(0, N().boats).map((q, i) => msFoeCar('speedboat', q.x, q.y, Math.atan2(o.y - q.y, o.x - q.x), { crew: 2, gun: i ? 'pistol' : 'smg', group: 'boats', speed: N().boatSpeed, color: '#2a2d3a' }));
    msLive([22], { phone: true });
  }
  const live = c => !c.dead && !c.sunk && !c.fc.out && c.fc.crew > 0;
  function lost(A, dt) {
    const left = A.boats.filter(live); if (!left.length) return true;
    A.farT = left.every(c => dist(c.x, c.y, me().x, me().y) > N().loseAt * UNITS_PER_M) ? (A.farT || 0) + dt : 0; return A.farT > N().loseFor;
  }
  const steps = [
    { enter(A) { MS.mark = () => A.ferryPier; msLive([1, 2, 3], { phone: true, done: () => { if (MS.k === 0) MS.guide = A.ferryPier; } }); },   // the call; GO TO Iron Key (the ferry, or any boat)
      tick(A) { if (P.ferry || !onIsland(me().x, me().y)) return false; return true; },
      jump(A) { if (P.car) exitCar(true); P.x = PRZ.path[2][0]; P.y = PRZ.path[2][1]; P.swim = false; } },
    { enter(A) { MS.mark = () => A.guard; MS.guide = A.gateOut; },     // GO TO the gate: the search
      tick(A) { if (!A.cutGo && !P.car && dist(P.x, P.y, A.gateOut.x, A.gateOut.y) < N().gateR) { A.cutGo = true; msCut('VISITING HOUR', () => msNext()); } return false; },
      jump(A) { if (P.car) exitCar(true); holdKit(A); PRX.visit = PRX.gateOpen = true; P.x = A.gateIn.x; P.y = A.gateIn.y; } },
    { enter(A) { holdKit(A); PRX.visit = PRX.gateOpen = true; MS.mark = () => A.ivo; MS.guide = () => A.ivo; MS.start = { at: () => A.ivo, label: msWho('ivo').name, go: () => msCut('THE OLD MAN', () => msNext()) }; },   // TALK TO Ivo
      tick(A) { if (A.men.some(m => m.alert)) { msEnter(3); } return false; },   // you went for them first: the riot now
      jump(A) { P.x = A.ivo.x + 30; P.y = A.ivo.y + 10; } },
    { enter(A) { if (!A.riot) riot(A); MS.mark = () => nearest(A.men); MS.guide = null; A.sirT = 0; },   // TAKE OUT Nico's men (a second pair a few seconds later)
      tick(A, dt) {
        if ((A.sirT -= dt) <= 0) { A.sirT = 1.2; Snd.tone(760, 540, 0.9, 0.05, 'sawtooth'); }   // the lockdown siren
        if (!A.wave2 && (gameT - A.t3 > N().wave2 || !up(A.men.filter(q => q.group === 'riot1')).length)) { A.wave2 = true; for (const m of A.men.filter(q => q.group === 'riot2')) foeAlert(m); msLive([18], { now: true }); }   // the rest come running
        return A.wave2 && !up(A.men).length; },
      info: A => up(A.men).length + ' LEFT',
      jump(A) { if (!A.riot) riot(A); A.wave2 = true; for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); } },
    { enter(A) { msLive([19], { now: true }); MS.mark = () => A.guard; MS.guide = A.gateOut; },   // GO TO the gate: your weapons back
      tick(A, dt) {
        if ((A.sirT -= dt) <= 0) { A.sirT = 1.2; Snd.tone(760, 540, 0.9, 0.05, 'sawtooth'); }
        if (inPrison(me().x, me().y) || dist(me().x, me().y, A.gateOut.x, A.gateOut.y) > 160) return false;
        kitBack(A); Snd.pickup(); popup(P.x, P.y - 14, 'YOUR WEAPONS', '#b6ff3c'); msLive([20], { now: true }); return true; },
      jump(A) { kitBack(A); P.x = A.gateOut.x; P.y = A.gateOut.y; } },
    { enter(A) { msLive([21], { phone: true }); MS.mark = () => A.boat; MS.guide = () => A.boat; },   // GET IN Lucia's boat
      tick(A) { return P.car === A.boat; },
      jump(A) { if (P.car) exitCar(true); P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } },
    { enter(A) { boats(A); MS.mark = () => P.car === A.boat ? null : A.boat; MS.guide = () => P.car === A.boat ? null : A.boat; A.t6 = gameT; },   // SURVIVE: the Varga boats
      tick(A, dt) {
        if (!A.called && gameT - A.t6 > 8) { A.called = true; msLive([23, 24], { phone: true }); }
        if (!lost(A, dt)) return false; msLive([25], { phone: true, now: true }); return true; },
      info: A => A.boats ? A.boats.filter(live).length + ' BOATS AFTER YOU' : '',
      jump(A) { boats(A); for (const c of A.boats) { c.fc.crew = 0; c.driver = null; c.msDrive = null; } } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },        // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = () => P.car === A.boat ? A.drop : A.boat; MS.mark = () => P.car === A.boat ? A.lucia : A.boat; },   // DELIVER: the boat to Sunset Harbor's berths
      tick(A) {
        if (A.home || dist(A.boat.x, A.boat.y, A.drop.x, A.drop.y) > N().dropR) return false;
        A.home = true; if (P.car) exitCar(true);
        const L = A.lucia; P.x = L.x - 34; P.y = L.y + 6; P.vx = P.vy = 0; P.swim = false; A.boat.vx = A.boat.vy = 0;   // up onto the quay by her
        msCut('NEXT OF KIN', () => msNext()); return false; },
      info: A => P.car === A.boat ? Math.round(dist(A.boat.x, A.boat.y, A.drop.x, A.drop.y) / UNITS_PER_M) + ' M TO THE BERTHS' : 'GET BACK IN THE BOAT' }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.ivo.dead) return F.ivoDead;
    if (A.guard.dead) return F.guardDead;
    if (A.lucia.dead) return F.luciaDead;
    if (A.boat.dead || A.boat.burn > 0 || A.boat.sunk) return F.boatDead;
    return '';
  }
  const cuts = {
    'VISITING HOUR': A => [
      { dur: 3, cam: 'CLOSE', at: () => A.guard, line: 4, enter: () => { face(A.guard, P); face(P, A.guard); } },
      { dur: 4, cam: 'CLOSE', at: () => A.guard, line: 5, enter: () => { holdKit(A); Snd.tone(300, 260, 0.12, 0.08, 'square'); } },   // your guns into his crate
      { dur: 4, cam: 'WIDE', at: () => at(PRZ.gate[0], PRZ.gate[1] - 120), line: 6, enter: () => { PRX.visit = PRX.gateOpen = true; } }],
    'THE OLD MAN': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.ivo, line: [7, 8], enter: () => { face(A.ivo, P); face(P, A.ivo); } },
      { dur: 5, cam: 'WIDE', at: () => at(A.ivo.x - 40, A.ivo.y - 60), line: [9, 10] },
      { dur: 5, cam: 'CLOSE', at: () => A.ivo, line: [11, 12] },
      { dur: 4, cam: 'FOLLOW', at: () => A.men[0], line: 13, enter: () => { face(A.men[0], P); face(A.men[1], P); } },
      { dur: 3, cam: 'CLOSE', at: () => A.ivo, line: 14 }],
    'NEXT OF KIN': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.lucia, line: 26, enter: () => { face(A.lucia, P); face(P, A.lucia); } },
      { dur: 5, cam: 'WIDE', at: () => at(A.lucia.x + 80, A.lucia.y - 40), line: [27, 28], enter: () => face(A.lucia, at(A.lucia.x + 600, A.lucia.y - 300)) },
      { dur: 4, cam: 'CLOSE', at: () => A.lucia, line: 29, enter: () => face(A.lucia, P) }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { kitBack(A); PRX.visit = PRX.gateOpen = PRX.lock = false; } };
})();

/* ================= QUEST 06 - SKYLINE ================= */
MSCRIPT.q06 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P, at = (x, y) => ({ x, y });
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const stay = (p, dt) => { if (p.state === 'flee') p.state = 'post'; return standStep(p, dt); };
  const look = id => ({ shirt: msWho(id).shirt, pants: msWho(id).pants });
  const up = list => list.filter(p => !p.dead);
  const nearest = list => up(list).sort((a, b) => dist(a.x, a.y, me().x, me().y) - dist(b.x, b.y, me().x, me().y))[0];
  const free = (x, y) => !pedBlocked(x, y) && shoreDist(x, y) > 6;
  const roadAt = (x, y) => { const q = nearestRoad(x, y, 900); if (!q) return null; const t = edgeAt(q.e, q.s, {}); return at(t.x, t.y); };
  function setup(A) {
    SKY.hour = N().hour; SKX.ms = true; SKX.gate = 1;                   // night; the mission holds the site: the gate open, nobody at work (js/08zt)
    const d = MARINA.door; A.door = at(d[0] + 22, d[1] + 4);
    const spot = (offs, def) => offs.map(([dx, dy]) => at(A.door.x + dx, A.door.y + dy)).find(q => free(q.x, q.y)) || def;
    A.marco = msPed(A.door.x, A.door.y, 0, Object.assign(look('marco'), { msName: 'marco', step: stay }));
    const lq = spot([[30, 34], [40, 30], [60, 10]], at(A.door.x + 30, A.door.y + 34)); A.lucia = msPed(lq.x, lq.y, 0, Object.assign(look('lucia'), { msName: 'lucia', step: stay }));
    const sq = spot([[70, 50], [80, 20], [-40, 60]], at(A.door.x + 70, A.door.y + 50)); A.sol = msPed(sq.x, sq.y, 0, Object.assign(look('sol'), { msName: 'sol', hardhat: '#ffd23f', step: stay }));   // on the quay for the closing
    A.mycar = msCar('pickup', 7990, 4400, Math.atan2(4243 - 4400, 7875 - 7990), '#3a6f8a');   // Marco's pickup on the quay
    const T = SK.T, top = A.top = T.top, [gx, gy] = SITE.gate, [k0, k1, ky0] = SITE.kicker;
    A.gate = at(gx - 60, gy); A.topPt = at((k0 + k1) / 2, T.y0 + 200); A.kick = at((k0 + k1) / 2, ky0);
    A.men = [[6790, 2210, 'pistol'], [6830, 2420, 'pistol'], [6905, 2265, 'smg'], [6965, 2390, 'pistol'], [7000, 2300, 'pistol'], [6930, 2170, 'smg']]
      .map(([x, y, g]) => Object.assign(msFoe(x, y, { gun: g, hp: N().foeHp, group: 'yard', a: Math.PI }), { calm: true }));
    A.decks = [[7190, 2330, 2, 'smg'], [7180, 2230, 3, 'pistol'], [7200, 2370, 4, 'smg']]   // gunmen holding decks 2, 3 and 4
      .map(([x, y, lv, g]) => Object.assign(msFoe(x, y, { gun: g, hp: N().foeHp, group: 'deck' + lv, a: Math.PI / 2 }), { z: lv * T.dh, hold: true }));
    A.guards = [[7250, 2300], [7135, 2300]].map(([x, y]) => Object.assign(msFoe(x, y, { gun: 'smg', hp: N().foeHp, group: 'top', a: Math.PI / 2 }), { z: top, calm: true }));
    A.nico = msPed(7170, 2190, Math.PI / 2, Object.assign(look('nico'), { msName: 'nico', step: stay })); A.nico.z = top;   // Nico by his car at the top deck's far end
    const route = [[8300, 2600], [8300, 1300], [6300, 1100], [5500, 2500]].map(([x, y]) => roadAt(x, y)).filter(Boolean);
    A.ncar = msFoeCar('super', 7212, 2190, Math.PI / 2, Object.assign(look('nico'), { mode: 'park', crew: 1, gun: 'smg', group: 'nico', to: route, speed: N().nicoSpeed, tough: N().nicoCar, crewHp: N().nicoHp, boss: true, name: 'nico', color: '#f4f4f6' }));
    A.ncar.z = top;
    A.jcar = msCar('muscle', 7150, 2360, Math.PI / 2, '#d02a2a'); A.jcar.z = top;   // a car on the top deck (room for Marco and Lucia): follow him off the ramp
    const st = [[0, 80], [-20, 80], [0, -80], [-40, 40], [-60, 0]].map(([dx, dy]) => at(A.door.x + dx, A.door.y + dy)).find(q => free(q.x, q.y)) || at(A.door.x - 40, A.door.y);
    P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;
  }
  function join(A) {
    if (!A.marco.ally) msAllyFrom(A.marco, { who: 'marco', gun: 'shotgun', fail: MS.m.fails.marcoDead, hurtLine: 9 });
    if (!A.lucia.ally) msAllyFrom(A.lucia, { who: 'lucia', gun: 'pistol', fail: MS.m.fails.luciaDead, hurtLine: 10 });
  }
  function beside(A) {                                                 // Marco and Lucia with you (up the tower, at the harbour)
    [A.marco, A.lucia].forEach((p, i) => { if (p.dead) return; if (p.aboard) allyAlight(p);
      if (dist(p.x, p.y, P.x, P.y) > 160 || Math.abs(zOf(p) - zOf(P)) > 4) { p.x = P.x + (i ? 34 : -34); p.y = P.y + 26; p.z = zOf(P); p.vx = p.vy = 0; } });
  }
  function launchDrive(c, dt) {                                        // Nico: down the top deck and off the launch ramp, then away by road
    const A = MS.A; if (!A) return;
    if (!inTower(c.x, c.y, 0) && !(c.air > 0) && !zOf(c)) { c.fc.wait = 0; foeCarGo(c, 'flee'); c.msDrive = nicoDrive; return; }
    steerToward(c, A.kick.x, A.kick.y + 500, N().launchKmh * KMH); c.hb = false;
  }
  function nicoDrive(c, dt) {                                          // away by road, round and round his way; pinned or stuck a while near you: out he gets
    if (c.fc.gone) { c.fc.gone = false; c.fc.ti = 0; c.fc.field = null; }
    foeDrive(c, dt); const A = MS.A; if (!A || c.fc.out) return;
    A.stuckT = carSpeed(c) < 12 * KMH && dist(c.x, c.y, me().x, me().y) < 300 ? (A.stuckT || 0) + dt : 0;
    if (A.stuckT > N().stuckFor) foeBail(c);
  }
  const towerMark = A => towerWay(me(), A.topPt.x, A.topPt.y, A.top) || A.topPt;
  const steps = [
    { enter(A) { MS.mark = () => A.marco; MS.start = { at: () => A.marco, label: msWho('marco').name, go: () => msCut('ONE TOWER', () => msNext()) }; },   // TALK TO Marco
      tick() { return false; },
      jump(A) { join(A); } },
    { enter(A) { join(A); MS.mark = () => A.gate; MS.guide = A.gate; },   // GO TO Skyline One (Marco and Lucia ride with you)
      tick(A) {
        if (A.men.some(m => m.alert) || inSite(me().x, me().y, -4) || dist(me().x, me().y, A.gate.x, A.gate.y) < N().siteR) { msLive([7], { now: true }); return true; }
        return false; },
      jump(A) { if (P.car) exitCar(true); P.x = A.gate.x; P.y = A.gate.y; for (const p of [A.marco, A.lucia]) { if (p.aboard) allyAlight(p); p.x = A.gate.x - 30; p.y = A.gate.y + (p === A.marco ? 30 : -30); } } },
    { enter(A) { for (const m of A.men) foeAlert(m); msLive([8]); MS.mark = () => nearest(A.men); MS.guide = null; },   // TAKE OUT the yard
      tick(A) { if (up(A.men).length) return false; msLive([11], { now: true }); return true; },
      info: A => up(A.men).length + ' MEN LEFT',
      jump(A) { for (const m of A.men) if (!m.dead) killPed(m, 'gun', false); P.x = SK.T.x0 - 40; P.y = 2300; beside(A); } },
    { enter(A) { MS.mark = () => towerMark(A); MS.guide = () => inTower(me().x, me().y, 0) ? null : towerMark(A); },   // GO TO the top deck, up the ramps
      tick(A) {
        if (!A.said12 && A.decks.some(m => m.alert)) { A.said12 = true; msLive([12], { now: true }); }
        if (!A.said13 && zOf(me()) >= 3 * SK.T.dh - 1) { A.said13 = true; msLive([13]); }
        if (A.nico.dead) { msLive([24], { now: true }); msEnter(6); return false; }   // shot from below before he could run
        if (A.cutGo || zOf(me()) < A.top - 1) return false;
        A.cutGo = true; if (P.car) exitCar(true); beside(A); msCut('THE TOP', () => msNext()); return false; },
      info: A => 'DECK ' + Math.round(zOf(me()) / SK.T.dh) + ' OF ' + (SK.T.levels - 1),
      jump(A) { if (P.car) exitCar(true); P.x = A.topPt.x - 40; P.y = A.topPt.y + 60; P.z = A.top; beside(A); } },
    { enter(A) {                                                         // CHASE: Nico off the launch ramp
        const c = A.ncar, i = peds.indexOf(A.nico); if (i >= 0) peds.splice(i, 1); A.nicoGone = true;
        c.driver = 'ai'; c.msDrive = launchDrive; for (const g of A.guards) foeAlert(g);
        msLive([19], { now: true }); A.t4 = gameT; MS.mark = () => A.ncar; MS.guide = () => A.ncar; },
      tick(A) {
        const c = A.ncar;
        if (!A.said20 && gameT - A.t4 > 9) { A.said20 = true; msLive([20, 21]); }
        if (c.fc.out) { A.boss = c.fc.men[0]; msLive([22], { now: true }); return true; }
        if (c.dead || c.burn > 0 || c.sunk) { msLive([24], { now: true }); msEnter(6); }   // burned with him in it
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.ncar.x, A.ncar.y) / UNITS_PER_M) + ' M TO NICO (GONE AT ' + N().awayCar + ')',
      jump(A) { const c = A.ncar; if (!c.msDrive) { c.driver = 'ai'; c.msDrive = launchDrive; } A.boss = foeBail(c)[0]; } },
    { enter(A) { MS.mark = () => A.boss; MS.guide = () => A.boss; },   // TAKE OUT Nico on foot
      tick(A) {
        const b = A.boss; if (!A.said23 && b.hp < N().nicoHp * 0.4 && !b.dead) { A.said23 = true; msLive([23], { now: true }); }
        if (!b.dead) return false; msLive([24], { now: true }); return true; },
      info: A => 'NICO ' + Math.max(0, Math.round(A.boss.hp)) + ' HP',
      jump(A) { if (A.boss && !A.boss.dead) killPed(A.boss, 'gun', false); } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },        // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco.aboard ? A.door : A.marco; },   // GO TO the harbour: the closing
      tick(A) {
        if (A.home || dist(me().x, me().y, A.door.x, A.door.y) > N().marcoR) return false;
        A.home = true; if (P.car) exitCar(true);
        [A.marco, A.lucia].forEach((p, i) => { if (p.aboard) allyAlight(p); if (dist(p.x, p.y, A.door.x, A.door.y) > 140) { p.x = A.door.x + (i ? 30 : -10); p.y = A.door.y + (i ? 34 : 30); p.z = 0; p.vx = p.vy = 0; } });
        msCut('SUNSET', () => msNext()); return false; } }];
  function fail(A) {
    const F = MS.m.fails;
    const f = msCastFail(); if (f) return f;
    if (A.marco.dead) return F.marcoDead;
    if (A.lucia.dead) return F.luciaDead;
    if (MS.k === 4 && !A.ncar.fc.out && dist(me().x, me().y, A.ncar.x, A.ncar.y) > N().awayCar * UNITS_PER_M) return F.nicoAway;
    return '';
  }
  const cuts = {
    'ONE TOWER': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [1, 2], enter: () => { face(A.marco, P); face(A.lucia, P); } },
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: [3, 4], enter: () => { A.marco.arm = gunIdx('shotgun'); Snd.tone(220, 140, 0.08, 0.1, 'square'); } },
      { dur: 4, cam: 'WIDE', at: () => at(A.door.x - 40, A.door.y + 40), line: [5, 6], enter: () => { A.lucia.arm = gunIdx('pistol'); face(A.lucia, A.mycar); face(A.marco, A.mycar); } }],
    'THE TOP': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.nico, line: 14, enter: () => { face(A.nico, P); for (const g of A.guards) face(g, P); } },
      { dur: 3, cam: 'CLOSE', at: () => A.marco, line: 15, enter: () => face(A.marco, A.nico) },
      { dur: 5, cam: 'CLOSE', at: () => A.nico, line: [16, 17] },
      { dur: 3, cam: 'WIDE', at: () => at(A.ncar.x, A.ncar.y + 120), line: 18, enter: () => face(A.lucia, A.ncar) }],
    'SUNSET': A => [
      { dur: 4, cam: 'CLOSE', at: () => A.sol, line: [25, 26], enter: () => { face(A.sol, P); face(A.marco, A.sol); face(A.lucia, A.sol); } },
      { dur: 5, cam: 'WIDE', at: () => at(A.door.x + 60, A.door.y + 30), line: [27, 28], enter: () => face(A.marco, at(A.marco.x + 400, A.marco.y + 300)) },
      { dur: 5, cam: 'CLOSE', at: () => A.marco, line: [29, 30, 31], enter: () => { face(A.marco, P); face(A.lucia, P); } }]
  };
  return { setup, steps, fail, cuts, cleanup() { SKX.ms = false; } };
})();
