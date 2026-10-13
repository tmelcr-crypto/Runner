'use strict';
/* ---------- 8zy. MISSIONS: the engine, MISSIONS TEST, and each mission's script ----------
   A mission (its words and numbers: js/01x MISSIONS) runs step by step: each step has its words on screen (the objective bar), a
   target (the lime guide line and an arrow over it), and its script says when it is done and what fails it. Dialogue pauses the game:
   the speaker's portrait (the owner's picture, or a silhouette with the letter until it comes) and a bubble filling letter by letter
   with the speaker's own mumble; tap, E, Space or Enter for the next line. Cutscenes are the owner's shot lists played on the
   cutscene engine (js/15c) with the usual camera from above: WIDE, CLOSE, FOLLOW, OVERHEAD, FIXED, PAN.
   MISSIONS TEST (mode test, docs/STORY.md): picked from a list (MISSIONS on the pause menu, and when the mode starts), you start with
   everything, never saved; helpers: restart, jump to any step, replay a cutscene; the step's info in a corner. */
const MS = { on: false, id: '', m: null, s: null, k: -1, t: 0, A: null, guide: null, mark: null, talk: null, objT: 0, end: null };
const MSCRIPT = {};                        // each mission's script: { setup(A), steps: [{ enter, tick → true when done, jump, info }], fail(A) → why, cuts: { name: A => shots } }
const msTest = () => gameMode === 'test';

/* ---------- MISSIONS TEST: the kit and the list ---------- */
function testKit() {                       // js/15 startGame: lots of cash, every weapon full, full health and armour - then the list
  P.score = Math.max(P.score, 1000000);
  WEAPONS.forEach((w, i) => { P.has[i] = true; if (!isMelee(w)) { P.mag[i] = Math.max(P.mag[i] || 0, w.mag || 0); P.ammo[i] = Math.max(P.ammo[i] || 0, w.maxAmmo || 0); } });
  P.hp = hpMax(); P.armor = armorMax();
  setTimeout(() => { if (state === 'play' && msTest() && !MS.on) msOpenList(); }, 600);
}
function msOpenList() { pauseRet = 'play'; toggleBigMap(false); toggleWheel(false); state = 'pause'; hush(); showCard('pauseCard', true); showCard('msCard'); }
function paintMsCard() {
  const L = $('msList'); L.innerHTML = '';
  for (const m of MISSION_TABLE.missions) {
    const g = (m.chars.find(c => c.id === m.giver) || {}).name || '', b = document.createElement('button');
    b.type = 'button'; b.className = 'big alt msPick'; b.innerHTML = m.no + ' · ' + m.title + '<small>' + g + ' · ' + m.where.toUpperCase() + '</small>';
    b.addEventListener('click', () => msStart(m.id, 0)); L.appendChild(b);
  }
  const on = MS.on, H = $('msHelp'); H.hidden = !on; if (!on) return;
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
$('pMsBtn').addEventListener('click', () => showCard('msCard'));

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
  MS.k = k; MS.t = 0; MS.guide = null; MS.mark = null;
  const st = MS.s.steps[k]; if (st.enter) st.enter(MS.A);
  msObjective(MS.m.steps[k].show);
}
function msObjective(txt) { const o = $('msObj'); o.textContent = txt || ''; o.hidden = !txt; o.classList.add('big'); MS.objT = MSN.objTime; }
function msTick(dt) {                       // js/15 update
  if (MS.objT > 0 && (MS.objT -= dt) <= 0) $('msObj').classList.remove('big');
  if (!MS.on || MS.talk || CUT.on) return;
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
  MS.on = false; MS.A = null; MS.guide = null; MS.mark = null; msTalkClose();
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
  const p = makePed(x, y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', ms: true }, o);
  p.post = { x, y, a, step: o.step || standStep, i: 0 }; p.e = -1; p.ang = p.hd = a; peds.push(p); MS.A.list.push(p); return p;
}
function msCar(type, x, y, ang, color) { const c = makeCar(type, x, y, ang, null, color); c.searched = true; c.ms = true; cars.push(c); MS.A.list.push(c); return c; }
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
  const b = MS.on && MS.A && MS.A.bag;
  if (b) {
    if (!MS_BAG) { MS_BAG = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), new THREE.MeshLambertMaterial({ color: 0x5a4030 })); scene.add(MS_BAG); }
    MS_BAG.visible = true; MS_BAG.position.set(b.x, groundH(b.x, b.y) + 4 + Math.sin(time * 3) * 1.5, b.y); MS_BAG.rotation.y = time;
  } else if (MS_BAG) MS_BAG.visible = false;
}
const msGuide = () => { const g = MS.on && MS.guide; if (!g) return null; const t = typeof g === 'function' ? g() : g; return t ? { x: t.x, y: t.y, key: 'ms' + MS.k } : null; };

/* ---------- dialogue: the portrait, the bubble, the mumble; the game waits ---------- */
const MS_PICS = {};
function msPortrait(ch) {                  // the owner's picture (img/chars/<pic>) or a silhouette with the letter till it comes
  const cv = $('msPic'), g = cv.getContext('2d'), W = cv.width;
  g.fillStyle = '#12101c'; g.fillRect(0, 0, W, W);
  const img = ch.pic ? (MS_PICS[ch.pic] || (MS_PICS[ch.pic] = Object.assign(new Image(), { src: 'img/chars/' + ch.pic }))) : null;
  if (img && img.complete && img.naturalWidth) { g.drawImage(img, 0, 0, W, W); return; }
  if (img) img.onload = () => { if (MS.talk) msPortrait(ch); };
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
    const mu = T.ch.mumble || {}, every = Math.max(1, Math.round(MSN.letters / Math.max(1, mu.rate || 8)));
    for (let k = T.shown; k < n; k++) if (k % every === 0 && /[a-z0-9]/i.test(L.text[k]) && MSN.mumble > 0 && Snd.tone) {
      const f = (mu.low || 200) + Math.random() * ((mu.high || 300) - (mu.low || 200)); Snd.tone(f, f * 0.85, 0.07, 0.07 * MSN.mumble, mu.wave || 'square');
    }
    T.shown = n; $('msLine').textContent = L.text.slice(0, n); if (n >= L.text.length) $('msMore').hidden = false;
  }
  requestAnimationFrame(msTalkLoop);
}
function msTalkNext() {
  const T = MS.talk; if (!T) return;
  const L = T.lines[T.i];
  if (T.shown < L.text.length) { T.shown = L.text.length; T.t = 1e9; $('msLine').textContent = L.text; $('msMore').hidden = false; return; }
  if (T.i + 1 < T.lines.length) { msLine(T.i + 1); return; }
  const done = T.done, ret = T.ret; msTalkClose(); if (ret) state = ret; if (done) done();
}
function msTalkClose() { if (MS.talk && MS.talk.ret && state === 'talk') state = MS.talk.ret; MS.talk = null; $('msTalk').hidden = true; }
$('msTalk').addEventListener('click', e => { e.stopPropagation(); msTalkNext(); });
window.addEventListener('keydown', e => {   // before the game's own keys: E, Space and Enter turn the page (and do not skip the cutscene)
  if (!MS.talk || !['KeyE', 'Space', 'Enter', 'KeyF'].includes(e.code)) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) msTalkNext();
}, true);

/* ---------- cutscenes from the shot lists: the usual camera from above ---------- */
const MS_CAM = { WIDE: 0.7, CLOSE: 1.9, FOLLOW: 1.3, OVERHEAD: 1.5, FIXED: 1.1, PAN: 1.0 };
function msCut(name, done) {               // a shot: { dur, cam, at() → {x, y}, to() (PAN), line, enter(A), tick(A, dt, u), fadeOut }
  const make = MS.s.cuts && MS.s.cuts[name]; if (!make) { done(); return; }
  const A = MS.A, list = make(A);
  const shots = list.map((s, i) => ({ dur: s.dur, bars: true, fadeIn: i === 0 ? 0.6 : false, fadeOut: s.fadeOut || (i === list.length - 1 ? 0.6 : 0),
    enter() { s.said = false; if (s.enter) s.enter(A); this.tick(0, 0, 0); },
    tick(dt, t, u) {
      const place = () => { const p = s.at ? s.at(A) : P, q = s.cam === 'PAN' && s.to ? s.to(A) : null;
        cam.x = q ? lerp(p.x, q.x, smooth01(0, 1, u)) : p.x; cam.y = q ? lerp(p.y, q.y, smooth01(0, 1, u)) : p.y; cam.zoom = MS_CAM[s.cam] || 1.2; };
      if (MS.talk) { CUT.t = Math.max(0, CUT.t - dt); place(); return; }        // a line on screen: the shot waits for it, the camera stays
      if (s.line && !s.said && t >= MSN.lineGap) { s.said = true; msSay([s.line], () => {}); place(); return; }
      if (s.tick) s.tick(A, dt, u);
      place();
    } }));
  cutPlay({ skip: 'SKIP', shots, end: () => { msTalkClose(); done(); } });
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

/* ================= QUEST 01 - HARBOUR FAVOUR ================= */
MSCRIPT.q01 = (() => {
  const N = () => MS.m.numbers, me = () => P.car || P;
  const at = (x, y) => ({ x, y });
  function setup(A) {
    const M = MARINA, d = M.door;
    A.door = at(d[0] + 22, d[1] + 4);                                   // Marco: on the quay at the office door
    A.marco = msPed(A.door.x, A.door.y, 0, { shirt: msWho('marco').shirt, pants: msWho('marco').pants, msName: 'marco' });
    const b = M.berths[2]; A.boat = msCar('speedboat', b[0], b[1], 0, '#f4f4f6');            // berth two
    A.empty = at(M.berths[0][0], M.berths[0][1]);                     // pier 1's empty berth
    A.tboat = msCar('speedboat', M.fuel[2] + 40, M.fuel[3] + 30, 0, '#ff2bd6');               // Tito, idling off the fuel dock
    const J = JETTIES.reduce((best, j) => !best || dist(j.x, j.y, 7450, 6950) < dist(best.x, best.y, 7450, 6950) ? j : best, null), ja = J.a * Math.PI / 180;
    A.jetty = { head: at(J.x + Math.cos(ja) * (J.len - 14), J.y + Math.sin(ja) * (J.len - 14)), base: at(J.x - Math.cos(ja) * 10, J.y - Math.sin(ja) * 10), water: at(J.x + Math.cos(ja) * (J.len + 50), J.y + Math.sin(ja) * (J.len + 50)) };
    const rd = nearestRoad(A.jetty.base.x, A.jetty.base.y, 900); A.street = rd ? at(rd.x, rd.y) : A.jetty.base;
    A.route = msWaterPath([A.tboat.x + 260, A.tboat.y], [A.jetty.water.x, A.jetty.water.y]);
    P.x = A.door.x + 70; P.y = A.door.y + 60; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;
  }
  function titoRuns(A) {                                               // Tito ashore: along the jetty, off it, up the street and away
    const p = A.tito, path = [A.jetty.base, A.street, at(A.street.x + (A.street.x - A.jetty.base.x) * 3, A.street.y + (A.street.y - A.jetty.base.y) * 3)];
    p.post = { x: p.x, y: p.y, a: 0, i: 0, step: (q, dt) => { const w = path[Math.min(q.post.i, path.length - 1)]; if (walkTo(q, w.x, w.y, RUN * N().titoRun / 100, dt) < 12 && q.post.i < path.length - 1) q.post.i++; return true; } };
  }
  const steps = [
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco; },                                         // GO TO Marco: the opening
      tick(A) { if (P.car || dist(P.x, P.y, A.door.x, A.door.y) > 60 || A.opened) return false; A.opened = true; msCut('THE TAKINGS', () => msNext()); return false; } },
    { enter(A) { MS.mark = () => A.boat; },                                                              // GET IN
      tick(A) { return P.car === A.boat; },
      jump(A) { P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } },
    { enter(A) { const c = A.tboat; MARINA.routes.msTito = A.route; Object.assign(c, { driver: 'ai', boatAI: 'msTito', wi: 1, dir: 1, cruise: N().titoBoat * KMH }); MS.mark = () => A.tboat; },   // CHASE on the water
      tick(A) { const c = A.tboat, d = dist(me().x, me().y, c.x, c.y);
        c.cruise = N().titoBoat * KMH * (d > 1500 ? 0.75 : d < 450 ? 1.2 : 1);                           // he keeps the chase close
        if (dist(c.x, c.y, A.jetty.water.x, A.jetty.water.y) < 200) { c.driver = null; c.thr = 0; c.vx *= 0.3; c.vy *= 0.3; return true; }
        return false; },
      info: A => Math.round(dist(me().x, me().y, A.tboat.x, A.tboat.y) / UNITS_PER_M) + ' M TO TITO (GONE AT ' + N().awayWater + ')',
      jump(A) { const w = A.route[Math.max(0, A.route.length - 3)]; A.tboat.x = A.jetty.water.x; A.tboat.y = A.jetty.water.y; if (P.car !== A.boat) { P.x = A.boat.x; P.y = A.boat.y; enterCar(A.boat); } A.boat.x = w[0]; A.boat.y = w[1]; P.x = w[0]; P.y = w[1]; } },
    { enter(A) { const h = A.jetty.head; A.tito = msPed(h.x, h.y, 0, { shirt: msWho('tito').shirt, pants: msWho('tito').pants, msName: 'tito', speed: 1 }); titoRuns(A); MS.mark = () => A.tito; MS.guide = () => A.tito; },   // CATCH on foot
      tick(A) { if (A.caught || P.car || dist(P.x, P.y, A.tito.x, A.tito.y) > N().catch * UNITS_PER_M + 14) return false;
        A.caught = true; msCut('CAUGHT', () => { A.bag = at(A.tito.x + 10, A.tito.y + 6); A.tito.post = null; A.tito.state = 'flee'; msNext(); }); return false; },
      info: A => A.tito ? Math.round(dist(me().x, me().y, A.tito.x, A.tito.y) / UNITS_PER_M) + ' M TO TITO (GONE AT ' + N().awayFoot + ')' : '',
      jump(A) { if (P.car) exitCar(true); const h = A.jetty.head; P.x = A.jetty.base.x; P.y = A.jetty.base.y; A.tboat.driver = null; void h; } },
    { enter(A) { if (!A.bag) A.bag = at(P.x + 30, P.y); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); MS.guide = () => A.bag; },   // COLLECT the bag
      tick(A) { if (P.car || dist(P.x, P.y, A.bag.x, A.bag.y) > 26) return false; A.bag = null; A.hasBag = true; Snd.pickup(); popup(P.x, P.y - 14, 'THE BAG', '#b6ff3c'); return true; },
      jump(A) { A.bag = null; A.hasBag = true; } },
    { enter() { if (P.stars <= 0) $('msObj').hidden = true; },                                           // LOSE THE POLICE (if any)
      tick() { return P.stars <= 0; } },
    { enter(A) { MS.guide = A.door; MS.mark = () => A.marco; },                                         // DELIVER: the closing
      tick(A) { if (A.home || dist(me().x, me().y, A.door.x, A.door.y) > 70) return false; A.home = true; if (P.car) exitCar(true); msCut('SQUARE', () => msNext()); return false; },
      jump(A) { P.x = A.door.x + 300; P.y = A.door.y + 200; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.marco.dead) return F.marcoDead;
    if (A.tito && A.tito.dead && !A.caught) return F.titoDead;
    if (A.tboat && MS.k === 2 && dist(me().x, me().y, A.tboat.x, A.tboat.y) > N().awayWater * UNITS_PER_M) return F.away;
    if (A.tito && MS.k === 3 && !A.caught && dist(me().x, me().y, A.tito.x, A.tito.y) > N().awayFoot * UNITS_PER_M) return F.away;
    if (A.bag && boatDist(A.bag.x, A.bag.y) < -10) return F.bagSank;
    return '';
  }
  const face = (p, q) => { p.ang = p.hd = Math.atan2(q.y - p.y, q.x - p.x); if (p.post) p.post.a = p.ang; };
  const cuts = {
    'THE TAKINGS': A => [
      { dur: 4, cam: 'PAN', at: () => at(MARINA.door[0] + 120, MARINA.door[1] + 160), to: () => A.door, tick: (A2, dt) => { walkToP(A.door.x + 26, A.door.y + 10, dt); } },
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: 1, enter: () => face(A.marco, P) },
      { dur: 4, cam: 'CLOSE', at: () => A.empty, line: 2 },
      { dur: 5, cam: 'FOLLOW', at: () => A.tboat, line: 3, tick: (A2, dt, u) => { if (u > 0.45) { A.tboat.ang = 0; A.tboat.x += 520 * dt * smooth01(0.45, 0.7, u); } } },   // he waves, then roars off
      { dur: 4, cam: 'CLOSE', at: () => A.boat, line: 4 }],
    CAUGHT: A => [
      { dur: 3, cam: 'OVERHEAD', at: () => A.tito, line: 5, enter: () => { A.tito.post.step = q => { q.vx = q.vy = 0; return true; }; face(A.tito, P); } },
      { dur: 2, cam: 'FIXED', at: () => A.tito }],
    SQUARE: A => [
      { dur: 4, cam: 'CLOSE', at: () => A.marco, line: 6, enter: () => face(A.marco, P) },
      { dur: 5, cam: 'WIDE', at: () => at(MARINA.door[0] + 160, MARINA.door[1] + 40), line: 7 }]
  };
  function walkToP(x, y, dt) { if (P.car) return; const d = dist(P.x, P.y, x, y); if (d < 6) return; const s = Math.min(d, WALK * dt); P.x += (x - P.x) / d * s; P.y += (y - P.y) / d * s; P.ang = Math.atan2(y - P.y, x - P.x); }
  function cleanup() { if (MARINA && MARINA.routes) delete MARINA.routes.msTito; }
  return { setup, steps, fail, cuts, cleanup };
})();
