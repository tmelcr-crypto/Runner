'use strict';
/* ---------- 6t. THE SIDE-ON VIEW: inside a tower ----------
   Going in at a tower safehouse's door (js/08s) the screen turns into a side-on cut of the building, drawn on its own canvas over the
   paused city: the lobby with its glass doors and a desk clerk, an elevator and stairs up every floor, hallways with numbered doors - a
   few open on empty rooms, neighbours walk the floors and go in and out of theirs - and your own door on your floor. Inside your flat:
   a bed (SLEEP), a wardrobe, a safe (the weapon stash), a sofa and TV, a kitchen, a window on the city. Walk left and right; UP at a door,
   the elevator (pick a floor) or the stairs (DOWN takes the stairs down); at the glass doors in the lobby you are back in the street.
   Keys: the arrows or A / D, W or E for UP, S for DOWN; on a phone the arrow buttons (the stick works too). */
const SV = { on: false, h: null, B: null, fl: 0, x: 0, face: 1, walk: 0, room: null, lift: null, fade: 0, npcs: [], say: null, keys: {}, hint: '', drag: 0, note: null };
const SV_FH = 150, SV_LIFT = 560;
let svCv = null, svG = null;
const svQuest = h => !!h.kind && h.kind !== 'tower';   // not a home: the Crown, the vault, the loft as a quest's building (js/08zzj); a tower safehouse is one
function svLayout(h) {                    // the building: its floors, doors, the open ones, your door - always the same for the same tower
  if (svQuest(h)) return sbLayout(h);          // not a home: the Crown (js/08zzj)
  return withSeed(h.id.length * 977 + h.floors * 31, () => {
    const W = 1300, slots = [200, 340, 760, 900, 1040], doors = [];
    for (let f = 1; f <= h.floors; f++) slots.forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, open: false, mine: f === h.home && k === 1, war: f === h.floors && k === 3 && warRoomAt(h) }));
    const others = doors.filter(d => !d.mine && !d.war);
    for (let k = 0; k < SAFE.openDoors && others.length; k++) others.splice(randi(0, others.length - 1), 1)[0].open = true;
    const tint = pick(['#2b2350', '#26304f', '#3a2440', '#203a3a']);
    return { W, stairs: W - 110, doors, tint, carpet: pick(['#6a1f3a', '#1f3a6a', '#2f5a3a', '#5a3a1f']) };
  });
}
function openSide(h) {                    // in at the front door
  if (!svCv) {
    svCv = $('svCv'); svG = svCv.getContext('2d');
    const hold = (id, k) => { const b = $(id); const on = e => { e.preventDefault(); SV.keys[k] = true; if (k === 'up' || k === 'down') svPress(k); }, off = e => { e.preventDefault(); SV.keys[k] = false; };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); };
    hold('svL', 'left'); hold('svR', 'right'); hold('svU', 'up'); hold('svD', 'down');
    let x0 = null; const end = () => { x0 = null; SV.drag = 0; };                    // a drag on the picture walks you too, like the stick
    svCv.addEventListener('pointerdown', e => { x0 = e.clientX; SV.drag = 0; }); svCv.addEventListener('pointermove', e => { if (x0 !== null) { const d = e.clientX - x0; SV.drag = Math.abs(d) > 18 ? Math.sign(d) : 0; } });
    svCv.addEventListener('pointerup', end); svCv.addEventListener('pointercancel', end);
  }
  SV.on = true; SV.h = h; SV.B = svLayout(h); SV.fl = 0; SV.x = 80; SV.face = 1; SV.room = null; SV.lift = null; SV.fade = 1; SV.say = null; SV.keys = {}; SV.drag = 0; SV.note = null; SV.greeted = false;
  SV.npcs = withSeed(h.id.length * 131, () => Array.from({ length: SAFE.neighbours }, () => ({ fl: randi(1, h.floors), x: rand(150, SV.B.W - 160), dir: pick([-1, 1]), sp: rand(28, 52), wait: 0, gone: 0,
    shirt: pick(['#e0554b', '#4f8fe0', '#e0c34a', '#58b36b', '#c97be0', '#f08a3a', '#e8e8e8', '#3fd0c0']), legs: pick(['#2a2d3a', '#3a3f5c', '#6a5a4a', '#1d2230']), skin: pick(['#f2c6a0', '#d9a074', '#a8714a', '#7a4d30']) })));
  if (svQuest(h)) SV.npcs = sbNpcs(h); SV.hide = false;
  state = 'side'; toggleBigMap(false); toggleWheel(false); hush(); $('sideView').hidden = false; svResize(); Snd.tone(330, 440, 0.1, 0.08, 'sine');
}
function closeSide() {                    // out through the glass doors, back in the street
  SV.on = false; $('sideView').hidden = true; $('svLift').hidden = true; state = 'play';
  const h = SV.h; if (h && h.door) { P.x = h.door.x + h.door.fx * 26; P.y = h.door.y + h.door.fy * 26; P.ang = Math.atan2(h.door.fy, h.door.fx); P.vx = P.vy = 0; P.z = 0; }
  $('sideView').classList.remove('seen'); if (!svQuest(h)) safeLeft(h);
}
function svResize() { if (!svCv) return; const pr = Math.min(2, DPR); svCv.width = Math.round(VW * pr); svCv.height = Math.round(VH * pr); svCv.style.width = VW + 'px'; svCv.style.height = VH + 'px'; }
addEventListener('resize', () => { if (SV.on) svResize(); });

/* ---------- where you can go from here ---------- */
function svSpot() {                       // what is right here: { k, label, ... }
  if (svQuest(SV.h)) return sbSpot();
  const B = SV.B, x = SV.x, R = SV.room;
  if (R) {
    if (Math.abs(x - 60) < 34) return { k: 'leave', label: 'BACK TO THE HALL' };
    if (R.war) { if (Math.abs(x - 230) < 60) return { k: 'board', label: 'THE BOARD' }; return null; }
    if (R.mine) {
      if (x > 290 && x < 450) return { k: 'sleep', label: 'SLEEP' };
      if (Math.abs(x - 510) < 34) return { k: 'wardrobe', label: 'WARDROBE' };
      if (Math.abs(x - 600) < 26) return { k: 'stash', label: 'WEAPON STASH' };
    }
    return null;
  }
  if (SV.fl === 0 && x < 110) return { k: 'out', label: 'OUT TO THE STREET' };
  if (Math.abs(x - SV_LIFT) < 34) return { k: 'lift', label: 'ELEVATOR' };
  if (Math.abs(x - B.stairs) < 36) return { k: 'stairs', label: SV.fl < SV.h.floors ? 'STAIRS UP' + (SV.fl > 0 ? ' (DOWN: DOWN)' : '') : 'STAIRS DOWN' };
  const d = B.doors.find(o => o.f === SV.fl && Math.abs(o.x - x) < 26);
  if (d) return { k: 'door', d, label: d.war ? 'THE WAR ROOM' : d.mine ? 'YOUR DOOR - ' + d.n : d.open ? 'DOOR ' + d.n + ' - IT IS OPEN' : 'DOOR ' + d.n + ' - LOCKED' };
  return null;
}
function svPress(k) {                     // UP or DOWN pressed
  if (!SV.on || SV.lift || SV.fade > 0.4 || state !== 'side') return;
  if (svQuest(SV.h)) { sbPress(k); return; }
  const s = svSpot();
  if (k === 'down') {
    if (s && s.k === 'stairs' && SV.fl > 0) { SV.fl--; SV.fade = 1; Snd.tone(300, 240, 0.08, 0.06, 'sine'); }
    else if (s && (s.k === 'leave' || s.k === 'out')) svPress('up');
    return;
  }
  if (!s) return;
  if (s.k === 'out') { closeSide(); return; }
  if (s.k === 'leave') { SV.x = SV.room.door.x; SV.room = null; SV.fade = 1; Snd.tone(260, 200, 0.08, 0.06, 'sine'); return; }
  if (s.k === 'stairs') { if (SV.fl < SV.h.floors) { SV.fl++; SV.fade = 1; Snd.tone(300, 360, 0.08, 0.06, 'sine'); } else if (SV.fl > 0) { SV.fl--; SV.fade = 1; } return; }
  if (s.k === 'lift') { svLiftPanel(); return; }
  if (s.k === 'door') {
    if (s.d.mine || s.d.open || s.d.war) { SV.room = { door: s.d, mine: s.d.mine, war: s.d.war, W: s.d.mine || s.d.war ? 820 : 620 }; SV.x = 60; SV.face = 1; SV.fade = 1; Snd.tone(240, 300, 0.1, 0.06, 'sine'); }
    else { SV.say = { t: 1.6, x: s.d.x, fl: SV.fl, text: pick(['LOCKED', 'NOBODY HOME', 'GO AWAY!', '...']) }; Snd.tone(160, 120, 0.08, 0.08, 'square'); }
    return;
  }
  if (s.k === 'board') { svToast(warBoard()); Snd.tone(440, 520, 0.08, 0.06, 'sine'); return; }   // js/08zzm
  if (s.k === 'sleep' || s.k === 'wardrobe' || s.k === 'stash') safeAction(s.k, SV.h);   // js/08s
}
function svLiftPanel() {                  // the elevator's buttons: the lobby and every floor
  const box = $('svFloors'); box.innerHTML = '';
  for (let f = SV.h.floors; f >= 0; f--) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = f === 0 ? 'L' : String(f); if (f === SV.fl) b.classList.add('here'); if (f === SV.h.home) b.classList.add('home');
    if (svQuest(SV.h) && sbLiftLock(f)) { b.disabled = true; b.classList.add('lock'); b.title = 'KEYCARD'; }   // the night lift (js/08zzj)
    b.addEventListener('click', () => { $('svLift').hidden = true; if (f !== SV.fl) { SV.lift = { from: SV.fl, to: f, t: 0, T: 0.8 + 0.22 * Math.abs(f - SV.fl) }; Snd.tone(520, 660, 0.12, 0.08, 'sine'); } });
    box.appendChild(b);
  }
  $('svLift').hidden = false;
}
$('svLiftX').addEventListener('click', () => { $('svLift').hidden = true; });
$('svMenu').addEventListener('click', () => { if (state === 'side') pauseGame(); });

/* ---------- every frame (js/15 frame, while state is side) ---------- */
function sideFrame(dt, time) {               // UP and DOWN keys: js/15 handleKeys
  if (!SV.on) return;
  const k = SV.keys, inp = readInput(), left = k.left || inp.ix < -0.35 || SV.drag < 0, right = k.right || inp.ix > 0.35 || SV.drag > 0;
  if (SV.fade > 0) SV.fade = Math.max(0, SV.fade - dt * 3);
  if (SV.lift) {                          // riding: the cab moves, then the doors open on the new floor
    const L = SV.lift; L.t += dt; if (L.t >= L.T) { SV.fl = L.to; SV.lift = null; SV.x = SV_LIFT; Snd.tone(880, 880, 0.12, 0.08, 'sine'); }
  } else if ($('svLift').hidden) {
    const dir = (right ? 1 : 0) - (left ? 1 : 0), Wd = SV.room ? SV.room.W : SV.B.W;
    if (dir) { SV.face = dir; SV.x = clamp(SV.x + dir * 150 * dt, 30, Wd - 30); SV.walk += dt * 9; SV.hide = false; } else SV.walk = 0;
  }
  for (const n of SV.npcs) {              // the neighbours: along the hall, now and then in at a door and out again later
    if (n.gone > 0) { n.gone -= dt; if (n.gone <= 0) { const d = pick(SV.B.doors.filter(o => o.f === n.fl)); n.x = d ? d.x : n.x; } continue; }
    if (n.wait > 0) { n.wait -= dt; continue; }
    n.x += n.dir * n.sp * dt;
    if (n.x < 140 || n.x > SV.B.W - 170) { n.dir *= -1; n.x = clamp(n.x, 140, SV.B.W - 170); }
    if (Math.random() < dt * 0.12) { const d = SV.B.doors.find(o => o.f === n.fl && !o.mine && Math.abs(o.x - n.x) < 10); if (d) n.gone = rand(4, 12); else n.wait = rand(0.5, 2); }
  }
  if (SV.say && (SV.say.t -= dt) <= 0) SV.say = null;
  if (SV.note && (SV.note.t -= dt) <= 0) SV.note = null;
  if (!SV.room && SV.fl === 0 && Math.abs(SV.x - 270) < 120 && !SV.greeted) { SV.greeted = true; SV.say = { t: 2.2, x: 270, fl: 0, clerk: true, text: SKY.hour >= 18 || SKY.hour < 5 ? 'GOOD EVENING!' : SKY.hour < 12 ? 'GOOD MORNING!' : 'GOOD AFTERNOON!' }; }
  const s = svSpot(); $('svHint').textContent = SV.note ? SV.note.text : SV.lift ? 'GOING ' + (SV.lift.to > SV.lift.from ? 'UP' : 'DOWN') + '...' : SV.hide ? 'HIDDEN - WALK ON TO COME OUT' : s ? '▲ ' + s.label : '';
  $('svTitle').textContent = SV.h.name + '  ·  ' + (SV.room ? (SV.room.war ? 'THE WAR ROOM' : SV.room.mine ? 'YOUR FLAT' : SV.room.door.name || 'ROOM ' + SV.room.door.n) : SV.h.kind === 'vault' ? (SV.fl === 0 ? 'COUNT ROOM' : 'B' + SV.fl) : SV.fl === 0 ? 'LOBBY' : 'FLOOR ' + SV.fl);
  if (svQuest(SV.h)) sbTick(dt);               // the Crown: its guards, the quest (js/08zzj)
  if (SV.on && state === 'side') drawSide(time);
}
function svThumb() {                      // a picture of the side-on view for a save made in here
  try { const g = thumbCv.getContext('2d'), W = svCv.width, H = svCv.height, sh = Math.min(H, W / 1.6), sw = sh * 1.6; g.drawImage(svCv, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 160, 100); return thumbCv.toDataURL('image/jpeg', 0.72); } catch (e) { return ''; }
}
function svToast(text) { SV.note = { text, t: 3 }; }   // a message while you are in here (the HUD's is under the view)
function svReset() { if (!SV.on) return; SV.on = false; $('sideView').hidden = true; $('svLift').hidden = true; }   // a new game, a loaded one, the title

/* ---------- drawing ---------- */
function svPerson(g, x, y, s, shirt, legs, skin, face, walk, hat) {     // a little figure standing on y (its feet), s: scale
  const sw = Math.sin(walk) * 6 * s;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 12 * s, 3 * s, 0, 0, TAU); g.fill();
  g.fillStyle = legs; g.fillRect(x - 6 * s + sw * 0.3, y - 26 * s, 5 * s, 26 * s); g.fillRect(x + 1 * s - sw * 0.3, y - 26 * s, 5 * s, 26 * s);
  g.fillStyle = '#1a1a22'; g.fillRect(x - 7 * s + sw * 0.3, y - 3 * s, 7 * s, 3 * s); g.fillRect(x + 1 * s - sw * 0.3, y - 3 * s, 7 * s, 3 * s);
  g.fillStyle = shirt; g.fillRect(x - 8 * s, y - 50 * s, 16 * s, 25 * s);
  g.fillRect(x - 11 * s, y - 48 * s, 4 * s, 18 * s); g.fillRect(x + 7 * s, y - 48 * s, 4 * s, 18 * s);
  g.fillStyle = skin; g.beginPath(); g.arc(x, y - 57 * s, 7 * s, 0, TAU); g.fill();
  g.fillStyle = hat || '#2a2018'; g.beginPath(); g.arc(x - face * 1 * s, y - 59 * s, 7.2 * s, Math.PI, TAU); g.fill();
  g.fillStyle = '#111'; g.fillRect(x + face * 3 * s - 1 * s, y - 58 * s, 2 * s, 2 * s);
}
function svMe() {                         // your clothes' colours (js/01n)
  const c = sl => P.outfit && P.outfit[sl] && CLOTH[P.outfit[sl]] ? CLOTH[P.outfit[sl]].c1 : null;
  return { shirt: c('top') || '#ffd23f', legs: c('bottoms') || '#2a3a5c', hat: c('hat') };
}
function svWindow(g, x, y, w, h, s, time) {     // a window on the city: sky by the clock, towers with lit windows, stars at night
  const night = SKY.hour >= 19 || SKY.hour < 6, gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, night ? '#0b0a24' : '#5ec8ff'); gr.addColorStop(1, night ? '#3a1f5c' : '#ffd0e8'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  if (night) { g.fillStyle = '#fff'; for (let k = 0; k < 8; k++) g.fillRect(x + ((k * 53) % w), y + ((k * 29) % (h * 0.4)), 1.5 * s, 1.5 * s); }
  for (let k = 0; k < 6; k++) {
    const bx = x + k * w / 6 + 3 * s, bw = w / 6 - 6 * s, bh = h * (0.35 + ((k * 37) % 5) / 10);
    g.fillStyle = night ? '#1a1530' : '#7a86b0'; g.fillRect(bx, y + h - bh, bw, bh);
    g.fillStyle = night ? '#ffd98a' : '#cfe6ff'; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) if ((k + r * 3 + c) % 3) g.fillRect(bx + 3 * s + c * bw / 3, y + h - bh + 4 * s + r * 9 * s, 3 * s, 4 * s);
  }
  g.strokeStyle = '#d8d4e8'; g.lineWidth = 3 * s; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
}
function drawSide(time) {
  if (svQuest(SV.h)) { sbDraw(time); return; }
  const g = svG, Wc = svCv.width, Hc = svCv.height, pr = Wc / VW, s = Math.min(Hc / (SV_FH * 2.9), Wc / 420), B = SV.B, h = SV.h;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05030c'; g.fillRect(0, 0, Wc, Hc);
  const me = svMe();
  if (SV.room) {                          // a room: one wall, its door on the left
    const R = SV.room, cx = clamp(SV.x, Wc / s / 2, Math.max(Wc / s / 2, R.W - Wc / s / 2)), X = x => (x - cx) * s + Wc / 2, fy = Hc * 0.72, Y = y => fy - y * s;
    g.fillStyle = '#120e1e'; g.fillRect(X(0), 0, R.W * s, Y(SV_FH)); g.fillRect(X(0), fy + 14 * s, R.W * s, Hc - fy);   // the floors above and below, in the dark
    g.fillStyle = '#1c1630'; g.fillRect(X(0), Y(SV_FH) - 12 * s, R.W * s, 12 * s); g.fillRect(X(0), fy + 14 * s, R.W * s, 10 * s);       // the slabs
    g.fillStyle = R.war ? '#2e2a26' : R.mine ? '#3a2f5c' : '#2c2a36'; g.fillRect(X(0), Y(SV_FH), R.W * s, SV_FH * s);
    g.fillStyle = R.war ? '#4a3a2a' : R.mine ? '#5a3a2a' : '#3a3846'; g.fillRect(X(0), fy, R.W * s, 14 * s);
    g.fillStyle = '#1d1a2c'; g.fillRect(X(36), Y(96), 48 * s, 96 * s); g.strokeStyle = '#b8a0ff'; g.lineWidth = 2 * s; g.strokeRect(X(36), Y(96), 48 * s, 96 * s);
    if (R.war) warRoomDraw(g, X, Y, s, time);   // js/08zzm: the board, the map table, the crew's chairs
    else if (R.mine) {
      svWindow(g, X(160), Y(140), 240 * s, 52 * s, s, time);
      g.fillStyle = '#4a2a5a'; g.fillRect(X(120), Y(30), 110 * s, 30 * s); g.fillStyle = '#6a3a7a'; g.fillRect(X(120), Y(44), 20 * s, 44 * s);   // the sofa
      g.fillStyle = '#111'; g.fillRect(X(250), Y(70), 50 * s, 32 * s); g.fillStyle = Math.floor(time * 3) % 2 ? '#2bf3ff' : '#ff2bd6'; g.fillRect(X(253), Y(67), 44 * s, 26 * s);   // the TV
      g.fillStyle = '#f2f0f6'; g.fillRect(X(300), Y(26), 150 * s, 26 * s); g.fillStyle = '#ff7ab6'; g.fillRect(X(300), Y(30), 150 * s, 10 * s); g.fillStyle = '#ffffff'; g.fillRect(X(300), Y(34), 32 * s, 8 * s);   // the bed
      g.fillStyle = '#5a3a2a'; g.fillRect(X(470), Y(110), 80 * s, 110 * s); g.fillStyle = '#7a5a3a'; g.fillRect(X(474), Y(106), 35 * s, 100 * s); g.fillRect(X(511), Y(106), 35 * s, 100 * s);   // the wardrobe
      g.fillStyle = '#3a3f4c'; g.fillRect(X(580), Y(40), 40 * s, 40 * s); g.fillStyle = '#9aa0ab'; g.beginPath(); g.arc(X(600), Y(20), 7 * s, 0, TAU); g.fill();   // the safe
      g.fillStyle = '#c8ccd4'; g.fillRect(X(650), Y(48), 150 * s, 48 * s); g.fillStyle = '#2a2d3a'; g.fillRect(X(650), Y(96), 150 * s, 30 * s); g.fillStyle = '#ffd98a'; g.fillRect(X(700), Y(140), 40 * s, 6 * s);   // the kitchen
    } else {
      svWindow(g, X(240), Y(118), 160 * s, 70 * s, s, time);
      g.fillStyle = '#7a5a3a'; for (const [bx, bw, bh] of [[160, 40, 30], [190, 30, 22], [470, 50, 36], [520, 30, 24]]) g.fillRect(X(bx), Y(bh), bw * s, bh * s);   // boxes, nothing else
    }
    svPerson(g, X(SV.x), fy, s, me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat);
  } else {
    const camY = SV.lift ? lerp(SV.lift.from, SV.lift.to, clamp(SV.lift.t / SV.lift.T, 0, 1)) : SV.fl;
    const cx = clamp(SV.x, Wc / s / 2 - 20, Math.max(Wc / s / 2 - 20, B.W - Wc / s / 2 + 20)), X = x => (x - cx) * s + Wc / 2, Y = (f, y) => Hc * 0.62 - ((f - camY) * SV_FH + y) * s;
    for (let f = Math.max(0, Math.floor(camY) - 2); f <= Math.min(h.floors, Math.ceil(camY) + 2); f++) {
      const y0 = Y(f, 0), y1 = Y(f, SV_FH);
      g.fillStyle = f === 0 ? '#2a2440' : B.tint; g.fillRect(X(0), y1, B.W * s, y0 - y1);
      g.fillStyle = f === 0 ? '#c8c0b0' : B.carpet; g.fillRect(X(0), y0 - 4 * s, B.W * s, 4 * s);
      g.fillStyle = '#14101e'; g.fillRect(X(0), y0, B.W * s, 10 * s);                       // the slab under the floor
      if (f === 0) { g.fillStyle = '#2a2438'; g.fillRect(0, y0 + 10 * s, Wc, Hc); g.fillStyle = '#4a4458'; g.fillRect(0, y0 + 10 * s, Wc, 6 * s); g.fillStyle = '#3a3448'; for (let gx = X(0) % (60 * s) - 60 * s; gx < Wc; gx += 60 * s) g.fillRect(gx, y0 + 16 * s, 2 * s, 30 * s); }   // the ground under the lobby
      svWindow(g, X(10), y1 + 26 * s, 50 * s, 74 * s, s, time); svWindow(g, X(B.W - 60), y1 + 26 * s, 50 * s, 74 * s, s, time);
      for (let lx = 160; lx < B.W - 80; lx += 220) { g.fillStyle = '#fff3c0'; g.fillRect(X(lx), y1 + 2 * s, 30 * s, 4 * s); g.fillStyle = 'rgba(255,243,192,.07)'; g.beginPath(); g.moveTo(X(lx), y1 + 6 * s); g.lineTo(X(lx - 40), y0); g.lineTo(X(lx + 70), y0); g.lineTo(X(lx + 30), y1 + 6 * s); g.fill(); }
      g.fillStyle = '#3a3f4c'; g.fillRect(X(SV_LIFT - 34), y1, 68 * s, SV_FH * s);           // the elevator
      const here = SV.lift && Math.round(camY) === f, open = !SV.lift && SV.fl === f && Math.abs(SV.x - SV_LIFT) < 34;
      g.fillStyle = open ? '#ffe9a8' : '#9aa0ab'; g.fillRect(X(SV_LIFT - 26), y0 - 100 * s, 52 * s, 100 * s); g.fillStyle = '#5a5f6a'; g.fillRect(X(SV_LIFT - 0.8), y0 - 100 * s, 1.6 * s, 100 * s);
      g.fillStyle = here || open ? '#3dff7a' : '#ff3b5c'; g.fillRect(X(SV_LIFT - 4), y0 - 112 * s, 8 * s, 6 * s);
      g.fillStyle = '#4a3f2c'; g.fillRect(X(B.stairs - 36), y0 - 104 * s, 72 * s, 104 * s); g.fillStyle = '#2bf3ff'; g.font = 'bold ' + Math.round(11 * s) + 'px Arial'; g.textAlign = 'center'; g.fillText('STAIRS', X(B.stairs), y0 - 108 * s);
      for (let k = 0; k < 5; k++) { g.fillStyle = '#6a5a3a'; g.fillRect(X(B.stairs - 30 + k * 12), y0 - (20 + k * 18) * s, 12 * s, 4 * s); }
      if (f === 0) {                                                                         // the lobby: glass doors, the desk and its clerk, a sofa, plants
        g.fillStyle = 'rgba(160,220,255,.35)'; g.fillRect(X(40), y0 - 110 * s, 60 * s, 110 * s); g.strokeStyle = '#d8d4e8'; g.lineWidth = 3 * s; g.strokeRect(X(40), y0 - 110 * s, 60 * s, 110 * s);
        svPerson(g, X(270), y0 - 4 * s, s, '#7a1f3a', '#1d2230', '#d9a074', -1, 0, '#111');
        g.fillStyle = '#8a6a48'; g.fillRect(X(220), y0 - 40 * s, 110 * s, 40 * s); g.fillStyle = '#ffd23f'; g.fillRect(X(220), y0 - 42 * s, 110 * s, 3 * s);
        g.fillStyle = '#4a2a5a'; g.fillRect(X(400), y0 - 24 * s, 90 * s, 20 * s); g.fillStyle = '#2f8f4e'; for (const px of [370, 520, 700]) { g.beginPath(); g.arc(X(px), y0 - 36 * s, 12 * s, 0, TAU); g.fill(); g.fillStyle = '#7a5a3a'; g.fillRect(X(px - 6), y0 - 24 * s, 12 * s, 20 * s); g.fillStyle = '#2f8f4e'; }
        g.fillStyle = '#ff2bd6'; g.font = 'bold ' + Math.round(20 * s) + 'px "Arial Black",Arial'; g.fillText(h.name.split(' ')[0], X(620), y1 + 40 * s);
      } else for (const d of B.doors) if (d.f === f) {
        g.fillStyle = d.war ? '#ff3b4a' : d.mine ? '#2bf3ff' : d.open ? '#ffd98a' : '#5a3a2a'; g.fillRect(X(d.x - 24), y0 - 96 * s, 48 * s, 96 * s);
        g.fillStyle = d.mine ? '#0b4a5a' : d.open ? '#2a1f12' : '#7a5a3a'; g.fillRect(X(d.x - 20), y0 - 92 * s, 40 * s, 92 * s);
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(X(d.x + 13), y0 - 46 * s, 2.5 * s, 0, TAU); g.fill();
        g.fillStyle = '#e8e8ee'; g.font = 'bold ' + Math.round(10 * s) + 'px Arial'; g.fillText(d.war ? 'WAR ROOM' : String(d.n), X(d.x), y0 - 102 * s);
      }
      for (const n of SV.npcs) if (n.fl === f && n.gone <= 0) svPerson(g, X(n.x), y0 - 4 * s, s, n.shirt, n.legs, n.skin, n.dir, n.wait > 0 ? 0 : gameT * 8 + n.x * 0.1);
      g.fillStyle = '#e8e8ee'; g.font = 'bold ' + Math.round(14 * s) + 'px "Arial Black",Arial'; g.textAlign = 'left'; g.fillText(f === 0 ? 'L' : String(f), X(B.W) - 30 * s, y1 + 20 * s); g.textAlign = 'center';
    }
    if (SV.lift) { const yl = Y(camY, 0); g.fillStyle = '#ffe9a8'; g.fillRect(X(SV_LIFT - 26), yl - 100 * s, 52 * s, 100 * s); svPerson(g, X(SV_LIFT), yl - 4 * s, s, me.shirt, me.legs, '#f2c6a0', 1, 0, me.hat); }
    else svPerson(g, X(SV.x), Y(SV.fl, 0) - 4 * s, s, me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat);
    if (SV.say) { const sx = X(SV.say.x), sy = Y(SV.say.fl, 0) - 84 * s; g.font = 'bold ' + Math.round(12 * s) + 'px Arial'; const tw = g.measureText(SV.say.text).width + 14 * s;
      g.fillStyle = '#fff'; g.fillRect(sx - tw / 2, sy - 18 * s, tw, 22 * s); g.fillStyle = '#111'; g.fillText(SV.say.text, sx, sy - 3 * s); }
  }
  if (SV.fade > 0) { g.fillStyle = 'rgba(5,3,12,' + SV.fade.toFixed(2) + ')'; g.fillRect(0, 0, Wc, Hc); }
}
