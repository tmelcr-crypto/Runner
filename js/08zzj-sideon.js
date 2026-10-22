'use strict';
/* ---------- 8zzj. SIDE-ON BUILDINGS: THE CROWN's offices (the side-on view of js/08t, for buildings that are not homes) ----------
   THE CROWN, the stepped deco tower downtown (js/10b), in both modes: in at its door on the south side (the ENTER button, or E). The
   lobby (glass doors, the reception desk - a receptionist by day, the night guard asleep over it at night - the elevator, the stairs)
   and ten floors of offices, the firm's name on every door, all locked outside the Casino quest C2; CRANE DEVELOPMENT has the top floor.
   The stairs switch ends from floor to floor: to climb on, you cross the hall. Office workers walk the halls by day.
   Stealth (a quest's guards, C2): each walks his floor's hall and turns at the ends; now and then he stops, or looks back. At night he
   carries a torch: a beam where he looks. When he sees you, a "!" over him and a rising tone - get out of his sight within 2 seconds
   (behind him, into an office, off the floor, or hidden: DOWN at a door or a plant hides you while you stand still) or the quest fails
   (SPOTTED). The numbers: the missions table (Stealth). Modes: crown. */
const SB = { ms: null };                   // ms: a quest's hold on the building { guards, liftTop, open, item: { fl, room, x, label, got }, spotted }
const SB_PX = 30;                          // the side-on view's pixels to a metre (a person is about 60 tall)
const SB_NAMES = ['ATLAS INSURANCE', 'BAYSHORE TITLE CO.', 'MERIDIAN LAW', 'SUNCOAST TRAVEL', 'PALM HEIGHTS DENTAL', 'NEON ADVERTISING', 'GULFSTREAM IMPORTS', 'KOHL & PARTNERS', 'VISTA REALTY', 'OCEAN DRIVE RECORDS', 'CORAL MORTGAGE', 'HARBOR SHIPPING', 'MIAMI DATA SYSTEMS', 'GOLD COAST ESCROW', 'FLAMINGO TALENT', 'SKYLINE ARCHITECTS', 'BLUE WAVE MEDIA', 'TROPIC TEMPS', 'SUNRISE MODELS', 'PELICAN ACCOUNTING'];
const sbNight = () => SKY.hour >= 20 || SKY.hour < 6;
function sbCrown() {                       // the Crown as a side-on building: its street door on the south face
  const L = MAP.lm.find(l => l.t === 'crown'); if (!L) return null;
  return { id: 'crown', kind: 'crown', name: 'THE CROWN', floors: 10, home: -1, door: { x: L.x, y: L.y + 112, fx: 0, fy: 1 } };
}
function sbLayout(h) {                    // js/08t svLayout: the halls, the doors with their firms' names, the stairs, the plants
  if (h.kind === 'vault') return vaultLayout(h);
  return withSeed(8821, () => {
    const W = 1400, doors = [], names = SB_NAMES.slice();
    const name = () => names.length ? names.splice(randi(0, names.length - 1), 1)[0] : 'SUITE';
    for (let f = 1; f <= h.floors; f++) {
      if (f === h.floors) { [240, 380, 760].forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, name: k === 2 ? 'CRANE DEVELOPMENT - ARCHIVE' : name() })); doors.push({ f, x: 1010, n: f * 100 + 9, name: 'CRANE DEVELOPMENT', crane: true, wide: true }); }
      else { if (!names.length) names.push(...SB_NAMES); [240, 380, 820, 960, 1110].forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, name: name() })); }
    }
    return { W, doors, plants: [470, 680], up: f => f % 2 === 0 ? W - 110 : 110, tint: '#232a3c', carpet: '#3a2a4a' };   // up(f): the stairs up from floor f (right end on even floors, left on odd)
  });
}
function sbNpcs(h) {                       // office workers by day (none at night, none while a quest holds the building)
  if (sbNight() || SB.ms) return [];
  return withSeed(4410, () => Array.from({ length: 12 }, () => ({ fl: randi(0, h.floors - 1), x: rand(150, 1240), dir: pick([-1, 1]), sp: rand(30, 50), wait: 0, gone: 0,
    shirt: pick(['#e8e8ee', '#cfd8e8', '#3a4a6a', '#6a1f3a', '#f2e6c8', '#2a2d3a']), legs: pick(['#2a2d3a', '#3a3f5c', '#1d2230', '#4a4458']), skin: pick(['#f2c6a0', '#d9a074', '#a8714a', '#7a4d30']) })));
}
const sbOpen = d => d.vault ? !!(SB.ms && SB.ms.cracked) : d.shut ? false : !!(SB.ms && SB.ms.open);   // the offices: locked, except while a quest holds the building; the vault: once it is cracked
function sbLiftLock(f) { return !!(SB.ms && SB.ms.liftTop != null && f > SB.ms.liftTop); }   // the night lift: the higher floors need a keycard

/* ---------- the door in the street ---------- */
function sbKey() {
  if (!feat('crown') || P.car || P.dead || P.act || state !== 'play' || CUT.on || SV.on) return null;
  const h = sbCrown(); if (!h || dist(P.x, P.y, h.door.x, h.door.y + 18) > 30) return null;
  return h;
}
function sbUse(h) {
  if (P.stars > 0) { toast('NOT WITH THE POLICE ON YOUR TAIL', true); return; }
  $('sbBtn').hidden = true; P.vx = P.vy = 0; SV.hide = false; openSide(h);
  if (sbNight()) SV.greeted = true;                                   // the night man is asleep over the desk
  if (SB.ms) for (const g of SB.ms.guards || []) Object.assign(g, { x: g.x00, dir: g.dir0, alert: 0, lost: 0, wait: 0, look: 0 });   // a quest's guards back on their rounds
}
function sbUi() {                          // every frame (js/14): the ENTER button by the door
  const h = sbKey(), b = $('sbBtn'); if (!b) return;
  if (!h) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden) { b.hidden = false; b.querySelector('b').textContent = 'THE CROWN'; b.querySelector('.go').textContent = 'ENTER'; b.style.setProperty('--sc', '#ffd23f'); }
  doorBtnAt(b);
}
if ($('sbBtn')) $('sbBtn').addEventListener('click', e => { e.stopPropagation(); const h = sbKey(); if (h) sbUse(h); });

/* ---------- inside: where you can go (js/08t svSpot, svPress hand over here) ---------- */
function sbSpot() {
  const B = SV.B, x = SV.x, R = SV.room, M = SB.ms;
  if (R) {
    if (Math.abs(x - 60) < 34) return { k: 'leave', label: 'BACK TO THE HALL' };
    const it = M && M.item; if (it && !it.got && R.door.f === it.fl && R.door.name === it.room && Math.abs(x - it.x) < 40) return { k: 'take', label: it.label };
    return null;
  }
  if (SV.fl === 0 && x < 110) return { k: 'out', label: B.outLabel || 'OUT TO THE STREET' };
  if (B.lift !== false && Math.abs(x - SV_LIFT) < 34) return { k: 'lift', label: 'ELEVATOR' };
  const deep = SV.h.kind === 'vault';                                  // the vault goes down: its next floor is below
  if (SV.fl < SV.h.floors && Math.abs(x - B.up(SV.fl)) < 36) return { k: 'up', label: deep ? 'STAIRS DOWN' : 'STAIRS UP' };
  if (SV.fl > 0 && Math.abs(x - B.up(SV.fl - 1)) < 36) return { k: 'down', label: deep ? 'STAIRS UP' : 'STAIRS DOWN' };
  if (SV.fl > 0) {
    const d = B.doors.find(o => o.f === SV.fl && Math.abs(o.x - x) < (o.wide ? 40 : 26));
    if (d && d.vault && !sbOpen(d)) return { k: 'crack', d, label: SB.ms && SB.ms.cracking ? 'FAY IS ON THE DIAL...' : 'THE VAULT DOOR  ·  ▲ FAY, OPEN IT' };
    if (d) return { k: 'door', d, label: d.name + (sbOpen(d) ? '' : ' - LOCKED') + (SB.ms ? '  ·  ▼ HIDE' : '') };
    if (SB.ms && B.plants.some(px => Math.abs(px - x) < 22)) return { k: 'plant', label: 'A BIG PLANT  ·  ▼ HIDE' };
  }
  return null;
}
function sbPress(k) {
  const s = sbSpot();
  if (k === 'down') {
    if (s && s.k === (SV.h.kind === 'vault' ? 'up' : 'down')) { sbFloor(SV.fl + (SV.h.kind === 'vault' ? 1 : -1)); return; }
    if (s && (s.k === 'door' || s.k === 'plant') && SB.ms) { SV.hide = !SV.hide; Snd.tone(SV.hide ? 200 : 260, SV.hide ? 150 : 300, 0.08, 0.05, 'sine'); return; }
    if (s && (s.k === 'leave' || s.k === 'out')) sbPress('up');
    return;
  }
  if (!s) return;
  if (s.k === 'out') { closeSide(); return; }
  if (s.k === 'leave') { SV.x = SV.room.door.x; SV.room = null; SV.fade = 1; Snd.tone(260, 200, 0.08, 0.06, 'sine'); return; }
  if (s.k === 'up') { sbFloor(SV.fl + 1); return; }
  if (s.k === 'down') { sbFloor(SV.fl - 1); return; }
  if (s.k === 'lift') { svLiftPanel(); return; }
  if (s.k === 'plant') return;
  if (s.k === 'crack') { const M = SB.ms; if (M && !M.cracking && !M.cracked) { M.cracking = true; M.crackLeft = M.crackT || 15; if (M.onCrack) M.onCrack(); Snd.tone(300, 320, 0.2, 0.05, 'sine'); } return; }
  if (s.k === 'door') {
    if (sbOpen(s.d)) { SV.room = { door: s.d, crane: !!s.d.crane, vault: !!s.d.vault, W: s.d.crane ? 900 : s.d.vault ? 700 : 620 }; SV.hide = false; SV.x = 60; SV.face = 1; SV.fade = 1; Snd.tone(240, 300, 0.1, 0.06, 'sine'); }
    else { SV.say = { t: 1.6, x: s.d.x, fl: SV.fl, text: s.d.crane ? 'PRIVATE' : pick(['LOCKED', 'CLOSED', 'OFFICE HOURS 9-5']) }; Snd.tone(160, 120, 0.08, 0.08, 'square'); }
    return;
  }
  if (s.k === 'take') { const it = SB.ms.item; it.got = true; Snd.pickup(); svToast(it.toast || 'GOT IT'); if (it.done) it.done(); }
}
function sbFloor(f) { Snd.tone(300, f > SV.fl ? 360 : 240, 0.08, 0.06, 'sine'); SV.fl = f; SV.hide = false; SV.fade = 1; }

/* ---------- every frame inside (js/08t sideFrame): the guards, who sees you, the quest ---------- */
function sbSees(g) {
  if (g.fl !== SV.fl || SV.room || SV.lift || SV.fade > 0.3) return false;
  if (SV.hide || !feat('stealth')) return false;
  if (SB.ms && SB.ms.disguise && CASL.uniform() && feat('guardUniform')) return false;   // in the casino guard's uniform they take you for one of them (C8)                                          // flat in a doorway or behind a plant, standing still
  const face = g.alert > 0 ? g.face : g.look > 0 ? -g.dir : g.dir, d = (SV.x - g.x) * face;
  return d > -16 && d < (sbNight() ? MSN.seeNight : MSN.seeDay) * SB_PX;   // ahead of him, in his beam; right at his shoulder he feels you there
}
function sbTick(dt) {
  const M = SB.ms;
  if (M && M.guards) for (const g of M.guards) {
    if (sbSees(g)) {                                                  // seen: he stops and stares; the tone rises
      if (!g.alert) { g.face = Math.sign(SV.x - g.x) || g.dir; g.toneT = 0; }
      g.alert += dt; g.lost = 0;
      if ((g.toneT -= dt) <= 0) { g.toneT = 0.22; Snd.tone(500 + 900 * clamp(g.alert / MSN.warnT, 0, 1), 520 + 900 * clamp(g.alert / MSN.warnT, 0, 1), 0.12, 0.08, 'square'); }
      if (g.alert >= MSN.warnT) M.spotted = true;
      continue;
    }
    if (g.alert > 0) { g.alert = 0; g.lost = 1.4; }                  // gone from his sight: a "?" and on with his round
    if (g.lost > 0) { g.lost -= dt; continue; }
    if (g.look > 0) { g.look -= dt; continue; }
    if (g.wait > 0) { g.wait -= dt; if (g.wait <= 0 && g.turn) { g.dir *= -1; g.turn = false; } continue; }
    g.x += g.dir * MSN.guardWalk * SB_PX * dt;
    if (g.x < g.x0 || g.x > g.x1) { g.x = clamp(g.x, g.x0, g.x1); g.wait = rand(1.2, 2.2); g.turn = true; }
    else if (Math.random() < dt * 0.1) { if (Math.random() < 0.45) g.look = rand(1.2, 2); else g.wait = rand(0.8, 1.6); }   // a stop now and then; sometimes a look back
  }
  if (M && M.mate) {                                                  // a friend beside you (Fay, C8): a few steps behind, along the hall, down the stairs with you
    const m = M.mate; if (m.fl !== SV.fl) { m.fl = SV.fl; m.x = SV.x - SV.face * 30; } else if (!SV.room) { const tx = SV.x - SV.face * 40; m.x += clamp(tx - m.x, -170 * dt, 170 * dt); m.walk = Math.abs(tx - m.x) > 4 ? (m.walk || 0) + dt * 9 : 0; m.face = Math.sign(SV.x - m.x) || 1; }
  }
  if (M && M.cracking && !M.cracked) { M.crackLeft -= dt; SV.note = { text: 'FAY IS ON THE DIAL... ' + Math.ceil(Math.max(0, M.crackLeft)) + ' S', t: 0.2 };
    if ((M.clickT = (M.clickT || 0) - dt) <= 0) { M.clickT = rand(0.25, 0.6); Snd.tone(1800, 1700, 0.02, 0.04, 'square'); }
    if (M.crackLeft <= 0) { M.cracked = true; M.cracking = false; Snd.tone(220, 110, 0.6, 0.1, 'sawtooth'); svToast('THE VAULT IS OPEN'); if (M.onOpen) M.onOpen(); } }
  if (MS.on) msTick(dt);                                              // the quest runs on in here (the city's own update waits)
  const o = $('svObj'); if (o) { const t = MS.on && MS.m ? MS.m.steps[MS.k].show : ''; if (o.textContent !== t) o.textContent = t; o.hidden = !t; }
  const warn = M && M.guards ? Math.max(0, ...M.guards.map(g => g.alert || 0)) : 0; $('sideView').classList.toggle('seen', warn > 0);
}
function sbGuard(fl, x0, x1, x, dir) { return { fl, x0, x1, x, x00: x, dir, dir0: dir, alert: 0, lost: 0, wait: 0, look: 0, face: dir, turn: false, toneT: 0 }; }   // a quest's guard on his round

/* ---------- drawing (js/08t drawSide hands over here) ---------- */
function sbDraw(time) {
  if (SV.h.kind === 'vault') { vaultDraw(time); return; }
  const g = svG, Wc = svCv.width, Hc = svCv.height, s = Math.min(Hc / (SV_FH * 2.9), Wc / 420), B = SV.B, h = SV.h, night = sbNight(), M = SB.ms;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05030c'; g.fillRect(0, 0, Wc, Hc); g.textAlign = 'center';
  const me = svMe(), meA = SV.hide ? 0.4 : 1;
  if (SV.room) {                          // an office: desks, filing cabinets, a window on the city; Crane's: the big desk, the model, the plans
    const R = SV.room, cx = clamp(SV.x, Wc / s / 2, Math.max(Wc / s / 2, R.W - Wc / s / 2)), X = x => (x - cx) * s + Wc / 2, fy = Hc * 0.72, Y = y => fy - y * s;
    g.fillStyle = '#120e1e'; g.fillRect(X(0), 0, R.W * s, Y(SV_FH)); g.fillRect(X(0), fy + 14 * s, R.W * s, Hc - fy);
    g.fillStyle = '#1c1630'; g.fillRect(X(0), Y(SV_FH) - 12 * s, R.W * s, 12 * s);
    g.fillStyle = R.crane ? '#2a2236' : '#2a3040'; g.fillRect(X(0), Y(SV_FH), R.W * s, SV_FH * s);
    g.fillStyle = R.crane ? '#5a1f2a' : '#3a4050'; g.fillRect(X(0), fy, R.W * s, 14 * s);
    g.fillStyle = '#1d1a2c'; g.fillRect(X(36), Y(96), 48 * s, 96 * s); g.strokeStyle = '#b8a0ff'; g.lineWidth = 2 * s; g.strokeRect(X(36), Y(96), 48 * s, 96 * s);
    if (R.crane) {
      svWindow(g, X(360), Y(140), 500 * s, 56 * s, s, time);
      g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(12 * s) + 'px "Arial Black",Arial'; g.fillText('CRANE', X(235), Y(118)); g.fillText('DEVELOPMENT', X(235), Y(102));
      g.fillStyle = '#4a2a1a'; g.fillRect(X(160), Y(36), 150 * s, 36 * s); g.fillStyle = '#6a3a22'; g.fillRect(X(156), Y(40), 158 * s, 6 * s);   // the big desk
      g.fillStyle = '#2a1a12'; g.fillRect(X(220), Y(66), 30 * s, 30 * s); g.fillStyle = '#ffe9a8'; g.fillRect(X(290), Y(60), 6 * s, 20 * s); g.fillRect(X(284), Y(64), 18 * s, 6 * s);   // the chair, the lamp
      g.fillStyle = '#d8d4e8'; g.fillRect(X(360), Y(30), 110 * s, 30 * s); for (const [bx, bh] of [[368, 40], [384, 64], [404, 52], [424, 80], [444, 46]]) { g.fillStyle = '#9aa0ab'; g.fillRect(X(bx), Y(30 + bh), 12 * s, bh * s); }   // the scale model of the city
      const it = M && M.item; g.fillStyle = '#5a4a3a'; g.fillRect(X(560), Y(44), 120 * s, 6 * s); g.fillRect(X(570), Y(38), 6 * s, 38 * s); g.fillRect(X(664), Y(38), 6 * s, 38 * s);   // the drafting table
      if (it && !it.got && R.door.name === it.room) { g.fillStyle = '#cfe6ff'; g.fillRect(X(580), Y(52), 80 * s, 8 * s); g.fillStyle = '#2f6fd8'; for (let k = 0; k < 4; k++) g.fillRect(X(586 + k * 18), Y(51), 10 * s, 1.5 * s);
        g.strokeStyle = 'rgba(182,255,60,' + (0.5 + 0.5 * Math.sin(time * 5)).toFixed(2) + ')'; g.lineWidth = 3 * s; g.strokeRect(X(574), Y(62), 92 * s, 16 * s); }
      g.fillStyle = '#3a3f4c'; g.fillRect(X(760), Y(60), 56 * s, 60 * s); g.fillStyle = '#9aa0ab'; g.beginPath(); g.arc(X(788), Y(30), 9 * s, 0, TAU); g.fill();   // the safe
    } else {
      svWindow(g, X(260), Y(126), 200 * s, 70 * s, s, time);
      for (const dx of [140, 330, 480]) { g.fillStyle = '#8a7a6a'; g.fillRect(X(dx), Y(30), 80 * s, 6 * s); g.fillRect(X(dx + 4), Y(24), 5 * s, 24 * s); g.fillRect(X(dx + 70), Y(24), 5 * s, 24 * s);
        g.fillStyle = '#d8d4c8'; g.fillRect(X(dx + 24), Y(52), 30 * s, 22 * s); g.fillStyle = night ? '#1a3a2a' : '#3aff9a'; g.fillRect(X(dx + 27), Y(49), 24 * s, 15 * s); }   // desks and computers
      g.fillStyle = '#6a6a74'; g.fillRect(X(560), Y(70), 34 * s, 70 * s); g.fillStyle = '#4a4a54'; for (let k = 0; k < 3; k++) g.fillRect(X(564), Y(64 - k * 22), 26 * s, 2 * s);   // a filing cabinet
    }
    if (night) { g.fillStyle = 'rgba(4,2,16,.45)'; g.fillRect(X(0), Y(SV_FH), R.W * s, SV_FH * s); }
    g.globalAlpha = meA; svPerson(g, X(SV.x), fy, s, me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat); g.globalAlpha = 1;
  } else {
    const camY = SV.lift ? lerp(SV.lift.from, SV.lift.to, clamp(SV.lift.t / SV.lift.T, 0, 1)) : SV.fl;
    const cx = clamp(SV.x, Wc / s / 2 - 20, Math.max(Wc / s / 2 - 20, B.W - Wc / s / 2 + 20)), X = x => (x - cx) * s + Wc / 2, Y = (f, y) => Hc * 0.62 - ((f - camY) * SV_FH + y) * s;
    for (let f = Math.max(0, Math.floor(camY) - 2); f <= Math.min(h.floors, Math.ceil(camY) + 2); f++) {
      const y0 = Y(f, 0), y1 = Y(f, SV_FH);
      g.fillStyle = f === 0 ? '#2e2a3a' : B.tint; g.fillRect(X(0), y1, B.W * s, y0 - y1);
      g.fillStyle = f === 0 ? '#d8d0c0' : B.carpet; g.fillRect(X(0), y0 - 4 * s, B.W * s, 4 * s);
      g.fillStyle = '#14101e'; g.fillRect(X(0), y0, B.W * s, 10 * s);
      if (f === 0) { g.fillStyle = '#2a2438'; g.fillRect(0, y0 + 10 * s, Wc, Hc); }
      svWindow(g, X(10), y1 + 26 * s, 50 * s, 74 * s, s, time); svWindow(g, X(B.W - 60), y1 + 26 * s, 50 * s, 74 * s, s, time);
      for (let lx = 160; lx < B.W - 80; lx += 220) { g.fillStyle = night ? '#4a4a3a' : '#fff3c0'; g.fillRect(X(lx), y1 + 2 * s, 30 * s, 4 * s); if (!night) { g.fillStyle = 'rgba(255,243,192,.07)'; g.beginPath(); g.moveTo(X(lx), y1 + 6 * s); g.lineTo(X(lx - 40), y0); g.lineTo(X(lx + 70), y0); g.lineTo(X(lx + 30), y1 + 6 * s); g.fill(); } }
      g.fillStyle = '#3a3f4c'; g.fillRect(X(SV_LIFT - 34), y1, 68 * s, SV_FH * s);           // the elevator
      const open = !SV.lift && SV.fl === f && Math.abs(SV.x - SV_LIFT) < 34;
      g.fillStyle = open ? '#ffe9a8' : '#b8a878'; g.fillRect(X(SV_LIFT - 26), y0 - 100 * s, 52 * s, 100 * s); g.fillStyle = '#5a5f6a'; g.fillRect(X(SV_LIFT - 0.8), y0 - 100 * s, 1.6 * s, 100 * s);
      g.fillStyle = sbLiftLock(f) ? '#ff3b5c' : '#3dff7a'; g.fillRect(X(SV_LIFT - 4), y0 - 112 * s, 8 * s, 6 * s);
      const stairs = (x, up) => { g.fillStyle = '#3a3428'; g.fillRect(X(x - 36), y0 - 104 * s, 72 * s, 104 * s); g.fillStyle = '#6a5a3a';
        for (let k = 0; k < 5; k++) g.fillRect(X(x + (up ? -30 + k * 12 : 18 - k * 12)), y0 - (20 + k * 18) * s, 12 * s, 4 * s);
        g.fillStyle = '#3dff7a'; g.font = 'bold ' + Math.round(10 * s) + 'px Arial'; g.fillText(up ? 'STAIRS ▲' : 'STAIRS ▼', X(x), y0 - 108 * s); };
      if (f < h.floors) stairs(B.up(f), true); if (f > 0) stairs(B.up(f - 1), false);
      if (f === 0) {                                                                         // the lobby: glass doors, the desk, plants, the name in gold
        g.fillStyle = 'rgba(160,220,255,.35)'; g.fillRect(X(40), y0 - 110 * s, 60 * s, 110 * s); g.strokeStyle = '#d8d4e8'; g.lineWidth = 3 * s; g.strokeRect(X(40), y0 - 110 * s, 60 * s, 110 * s);
        if (night) { svPerson(g, X(300), y0 - 14 * s, s, '#1f2a44', '#1d2230', '#d9a074', -1, 0, '#1f2a44'); g.fillStyle = '#cfe6ff'; g.font = 'bold ' + Math.round(11 * s) + 'px Arial'; g.fillText('Z z z', X(318 + Math.sin(time * 2) * 3), y0 - 80 * s - (time * 10 % 12) * s); }
        else svPerson(g, X(300), y0 - 4 * s, s, '#e8e8ee', '#1d2230', '#a8714a', -1, 0, '#2a1a12');
        g.fillStyle = '#5a4a3a'; g.fillRect(X(240), y0 - 40 * s, 120 * s, 40 * s); g.fillStyle = '#ffd23f'; g.fillRect(X(240), y0 - 42 * s, 120 * s, 3 * s);
        g.fillStyle = '#2f8f4e'; for (const px of [180, 420, 760, 1100]) { g.beginPath(); g.arc(X(px), y0 - 36 * s, 12 * s, 0, TAU); g.fill(); g.fillStyle = '#7a5a3a'; g.fillRect(X(px - 6), y0 - 24 * s, 12 * s, 20 * s); g.fillStyle = '#2f8f4e'; }
        g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(20 * s) + 'px "Arial Black",Arial'; g.fillText('♛ THE CROWN', X(900), y1 + 46 * s);
      } else {
        for (const px of B.plants) { g.fillStyle = '#2f8f4e'; g.beginPath(); g.arc(X(px), y0 - 44 * s, 15 * s, 0, TAU); g.fill(); g.beginPath(); g.arc(X(px + 8), y0 - 30 * s, 11 * s, 0, TAU); g.fill(); g.fillStyle = '#7a5a3a'; g.fillRect(X(px - 8), y0 - 24 * s, 16 * s, 20 * s); }
        for (const d of B.doors) if (d.f === f) {
          const w = d.wide ? 76 : 44;
          g.fillStyle = '#1a1622'; g.fillRect(X(d.x - w / 2 - 6), y0 - 104 * s, (w + 12) * s, 104 * s);   // the recess (a dark doorway to hide in)
          g.fillStyle = d.crane ? '#5a2a1a' : '#6a5038'; g.fillRect(X(d.x - w / 2), y0 - 96 * s, w * s, 96 * s);
          g.fillStyle = 'rgba(200,220,240,.35)'; g.fillRect(X(d.x - w / 2 + 6), y0 - 86 * s, (w - 12) * s, 30 * s);   // frosted glass
          if (d.wide) { g.fillStyle = '#2a1a12'; g.fillRect(X(d.x - 0.8), y0 - 96 * s, 1.6 * s, 96 * s); }
          g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(X(d.x + w / 2 - 8), y0 - 46 * s, 2.5 * s, 0, TAU); g.fill();
          g.fillStyle = d.crane ? '#ffd23f' : '#e8e8ee'; g.font = 'bold ' + Math.round((d.crane ? 9 : 6.5) * s) + 'px Arial'; g.fillText(d.name, X(d.x), y0 - 108 * s);
        }
      }
      if (night && f > 0) { g.fillStyle = 'rgba(4,2,16,.55)'; g.fillRect(X(0), y1, B.W * s, y0 - y1); g.fillStyle = '#3dff7a'; for (const ex of [B.up(f - 1), f < h.floors ? B.up(f) : -1]) if (ex > 0) { g.fillRect(X(ex - 14), y1 + 8 * s, 28 * s, 9 * s); } }   // the lights off; the green EXIT signs
      for (const n of SV.npcs) if (n.fl === f && n.gone <= 0) svPerson(g, X(n.x), y0 - 4 * s, s, n.shirt, n.legs, n.skin, n.dir, n.wait > 0 ? 0 : gameT * 8 + n.x * 0.1);
      if (M && M.guards) for (const gd of M.guards) if (gd.fl === f) {                     // a guard: a torch beam ahead at night, "!" when he sees you
        const face = gd.alert > 0 ? gd.face : gd.look > 0 ? -gd.dir : gd.dir, gy = y0 - 4 * s, reach = (night ? MSN.seeNight : MSN.seeDay) * SB_PX;
        if (night) { const gr = g.createLinearGradient(X(gd.x), 0, X(gd.x + face * reach), 0); gr.addColorStop(0, 'rgba(255,240,170,.55)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(X(gd.x + face * 10), gy - 40 * s); g.lineTo(X(gd.x + face * reach), gy - 92 * s); g.lineTo(X(gd.x + face * reach), gy); g.closePath(); g.fill(); }
        svPerson(g, X(gd.x), gy, s, '#1f2a44', '#141a2a', '#d9a074', face, gd.wait > 0 || gd.look > 0 || gd.alert > 0 || gd.lost > 0 ? 0 : gameT * 6 + gd.x * 0.1, '#1f2a44');
        g.fillStyle = '#ffd23f'; g.fillRect(X(gd.x - 3), gy - 40 * s, 6 * s, 4 * s);        // the badge
        if (gd.alert > 0 || gd.lost > 0) { const t = gd.alert > 0 ? '!' : '?', k = gd.alert / MSN.warnT; g.font = 'bold ' + Math.round(26 * s) + 'px "Arial Black",Arial'; g.fillStyle = gd.alert > 0 ? (k > 0.6 ? '#ff3b4a' : '#ffd23f') : '#cfd3dc'; g.fillText(t, X(gd.x), gy - 74 * s); }
      }
      g.fillStyle = '#e8e8ee'; g.font = 'bold ' + Math.round(14 * s) + 'px "Arial Black",Arial'; g.textAlign = 'left'; g.fillText(f === 0 ? 'L' : String(f), X(B.W) - 30 * s, y1 + 20 * s); g.textAlign = 'center';
    }
    if (SV.lift) { const yl = Y(camY, 0); g.fillStyle = '#ffe9a8'; g.fillRect(X(SV_LIFT - 26), yl - 100 * s, 52 * s, 100 * s); svPerson(g, X(SV_LIFT), yl - 4 * s, s, me.shirt, me.legs, '#f2c6a0', 1, 0, me.hat); }
    else { g.globalAlpha = meA; svPerson(g, X(SV.x), Y(SV.fl, 0) - 4 * s, s * (SV.hide ? 0.92 : 1), me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat); g.globalAlpha = 1; }
    if (SV.say) { const sx = X(SV.say.x), sy = Y(SV.say.fl, 0) - 84 * s; g.font = 'bold ' + Math.round(12 * s) + 'px Arial'; const tw = g.measureText(SV.say.text).width + 14 * s;
      g.fillStyle = '#fff'; g.fillRect(sx - tw / 2, sy - 18 * s, tw, 22 * s); g.fillStyle = '#111'; g.fillText(SV.say.text, sx, sy - 3 * s); }
  }
  if (SV.fade > 0) { g.fillStyle = 'rgba(5,3,12,' + SV.fade.toFixed(2) + ')'; g.fillRect(0, 0, Wc, Hc); }
}

/* ---------- THE VAULT under the Royal Flamingo (C8): the side-on view going down ----------
   From the staff door behind the cashier's cage: the COUNT ROOM (shelves of cash, the counting table and its machine), then three
   floors down - B1 with the guards' room, B2 with the security office and the archive, B3 with the VAULT at the far end (a round steel
   door; Fay works the dial). The stairs switch ends floor by floor. Guards walk the corridors; in the casino guard's uniform they nod
   and walk on. Not open outside the quest. */
function sbVault() {
  const L = casLayout(), w = { x: L.cage.x0 + 30, y: L.cage.y0 - 14 };
  return { id: 'vault', kind: 'vault', name: 'THE VAULT', floors: 3, home: -1, door: { x: w.x, y: w.y, fx: 0, fy: -1 } };
}
function vaultLayout(h) {
  const W = 1100, doors = [{ f: 1, x: 520, n: 1, name: "GUARDS' ROOM", shut: true }, { f: 1, x: 780, n: 2, name: 'STORE', shut: true },
    { f: 2, x: 420, n: 3, name: 'SECURITY', shut: true }, { f: 2, x: 700, n: 4, name: 'ARCHIVE', shut: true }, { f: 3, x: 860, n: 5, name: 'THE VAULT', vault: true, wide: true }];
  return { W, doors, plants: [], lift: false, outLabel: 'UP TO THE CASINO FLOOR', up: f => f % 2 === 0 ? W - 110 : 110, tint: '#3a3f46', carpet: '#2a2d33' };
}
function vaultDraw(time) {
  const g = svG, Wc = svCv.width, Hc = svCv.height, s = Math.min(Hc / (SV_FH * 2.9), Wc / 420), B = SV.B, h = SV.h, M = SB.ms;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05030c'; g.fillRect(0, 0, Wc, Hc); g.textAlign = 'center';
  const me = svMe(), meA = SV.hide ? 0.4 : 1, dark = stripDark();
  if (SV.room) {                                                   // the vault itself: gold bars, stacks of cash, the bags
    const R = SV.room, cx = clamp(SV.x, Wc / s / 2, Math.max(Wc / s / 2, R.W - Wc / s / 2)), X = x => (x - cx) * s + Wc / 2, fy = Hc * 0.72, Y = y => fy - y * s;
    g.fillStyle = '#1c1a14'; g.fillRect(X(0), Y(SV_FH), R.W * s, SV_FH * s); g.fillStyle = '#3a3428'; g.fillRect(X(0), fy, R.W * s, 14 * s);
    g.fillStyle = '#8a8f9c'; g.beginPath(); g.arc(X(60), Y(54), 50 * s, 0, TAU); g.fill(); g.fillStyle = '#14141a'; g.beginPath(); g.arc(X(60), Y(54), 42 * s, 0, TAU); g.fill();   // the open door behind you
    for (let k = 0; k < 6; k++) for (let r = 0; r < 4; r++) { g.fillStyle = r % 2 ? '#ffd23f' : '#e8b820'; g.fillRect(X(170 + k * 40), Y(12 + r * 9), 34 * s, 8 * s); }   // gold bars
    for (let k = 0; k < 5; k++) for (let r = 0; r < 6; r++) { g.fillStyle = '#3d8a4a'; g.fillRect(X(440 + k * 44), Y(16 + r * 16), 38 * s, 14 * s); g.fillStyle = '#e8f0e0'; g.fillRect(X(455 + k * 44), Y(16 + r * 16), 8 * s, 14 * s); }   // cash on the shelves
    const it = M && M.item; if (it && !it.got && it.room === R.door.name) { for (let k = 0; k < 4; k++) { g.fillStyle = '#6a5a3a'; g.beginPath(); g.ellipse(X(it.x - 30 + k * 20), Y(12), 11 * s, 13 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(9 * s) + 'px Arial'; g.fillText('€', X(it.x - 30 + k * 20), Y(9)); }
      g.strokeStyle = 'rgba(182,255,60,' + (0.5 + 0.5 * Math.sin(time * 5)).toFixed(2) + ')'; g.lineWidth = 3 * s; g.strokeRect(X(it.x - 46), Y(30), 92 * s, 30 * s); }
    if (M && M.mate) svPerson(g, X(100), fy, s, '#1a1a20', '#2a2a3a', '#f2c6a0', 1, 0, '#d8262a');
    g.globalAlpha = meA; svPerson(g, X(SV.x), fy, s, me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat); g.globalAlpha = 1;
  } else {
    const camY = SV.fl, cx = clamp(SV.x, Wc / s / 2 - 20, Math.max(Wc / s / 2 - 20, B.W - Wc / s / 2 + 20)), X = x => (x - cx) * s + Wc / 2, Y = (f, y) => Hc * 0.62 - ((camY - f) * SV_FH + y) * s;   // floor 1 is below floor 0
    for (let f = Math.max(0, camY - 2); f <= Math.min(h.floors, camY + 2); f++) {
      const y0 = Y(f, 0), y1 = Y(f, SV_FH);
      g.fillStyle = f === 0 ? '#2a3a30' : B.tint; g.fillRect(X(0), y1, B.W * s, y0 - y1);
      g.fillStyle = f === 0 ? '#5a3a2a' : B.carpet; g.fillRect(X(0), y0 - 4 * s, B.W * s, 4 * s); g.fillStyle = '#14101e'; g.fillRect(X(0), y0, B.W * s, 10 * s);
      g.fillStyle = '#4a4f58'; g.fillRect(X(0), y1 + 6 * s, B.W * s, 5 * s); g.fillStyle = '#5a5f68'; g.fillRect(X(0), y1 + 14 * s, B.W * s, 3 * s);   // pipes under the ceiling
      for (let lx = 160; lx < B.W - 80; lx += 220) { g.fillStyle = dark ? '#5a2020' : '#fff3c0'; g.fillRect(X(lx), y1 + 18 * s, 14 * s, 6 * s); }   // caged bulbs (red emergency light while the strip is dark)
      const stairs = (x, down) => { g.fillStyle = '#3a3428'; g.fillRect(X(x - 36), y0 - 104 * s, 72 * s, 104 * s); g.fillStyle = '#6a5a3a';
        for (let k = 0; k < 5; k++) g.fillRect(X(x + (down ? 18 - k * 12 : -30 + k * 12)), y0 - (20 + k * 18) * s, 12 * s, 4 * s);
        g.fillStyle = '#3dff7a'; g.font = 'bold ' + Math.round(10 * s) + 'px Arial'; g.fillText(down ? 'STAIRS ▼' : 'STAIRS ▲', X(x), y0 - 108 * s); };
      if (f < h.floors) stairs(B.up(f), true); if (f > 0) stairs(B.up(f - 1), false);
      if (f === 0) {                                                 // the count room: the cage's bars, shelves of cash, the counting table
        g.fillStyle = '#c9a227'; for (let x = 20; x < 110; x += 9) g.fillRect(X(x), y1 + 20 * s, 2 * s, SV_FH * s - 24 * s);
        for (let k = 0; k < 4; k++) { g.fillStyle = '#5a4a3a'; g.fillRect(X(260 + k * 90), y0 - 96 * s, 70 * s, 4 * s); g.fillRect(X(260 + k * 90), y0 - 60 * s, 70 * s, 4 * s);
          g.fillStyle = '#3d8a4a'; for (let j = 0; j < 4; j++) { g.fillRect(X(264 + k * 90 + j * 16), y0 - 112 * s, 12 * s, 16 * s); g.fillRect(X(264 + k * 90 + j * 16), y0 - 76 * s, 12 * s, 16 * s); } }
        g.fillStyle = '#6a5038'; g.fillRect(X(700), y0 - 34 * s, 140 * s, 34 * s); g.fillStyle = '#9aa0ab'; g.fillRect(X(740), y0 - 50 * s, 40 * s, 16 * s);
        g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(18 * s) + 'px "Arial Black",Arial'; g.fillText('COUNT ROOM', X(560), y1 + 46 * s);
      } else for (const d of B.doors) if (d.f === f) {
        if (d.vault) { const open = sbOpen(d), cxv = X(d.x), cyv = y0 - 52 * s; g.fillStyle = '#5a5f6a'; g.beginPath(); g.arc(cxv, cyv, 54 * s, 0, TAU); g.fill();
          if (open) { g.fillStyle = '#2a2008'; g.beginPath(); g.arc(cxv, cyv, 46 * s, 0, TAU); g.fill(); g.fillStyle = '#ffd23f'; g.globalAlpha = 0.25; g.beginPath(); g.arc(cxv, cyv, 46 * s, 0, TAU); g.fill(); g.globalAlpha = 1; }
          else { g.fillStyle = '#9aa0ab'; g.beginPath(); g.arc(cxv, cyv, 46 * s, 0, TAU); g.fill(); g.strokeStyle = '#3a3f4c'; g.lineWidth = 4 * s; const a = M && M.cracking ? time * 3 : 0;
            for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cxv, cyv); g.lineTo(cxv + Math.cos(a + k * TAU / 3) * 30 * s, cyv + Math.sin(a + k * TAU / 3) * 30 * s); g.stroke(); }
            g.fillStyle = '#3a3f4c'; g.beginPath(); g.arc(cxv, cyv, 8 * s, 0, TAU); g.fill(); }
          g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(11 * s) + 'px Arial'; g.fillText('THE VAULT', cxv, y0 - 114 * s); continue; }
        g.fillStyle = '#1a1622'; g.fillRect(X(d.x - 28), y0 - 104 * s, 56 * s, 104 * s); g.fillStyle = '#6a6f78'; g.fillRect(X(d.x - 22), y0 - 96 * s, 44 * s, 96 * s);
        if (d.name === "GUARDS' ROOM") { g.fillStyle = '#ffe9a8'; g.fillRect(X(d.x - 14), y0 - 84 * s, 28 * s, 18 * s); g.fillStyle = '#16161c'; for (const k of [-6, 6]) { g.beginPath(); g.arc(X(d.x + k), y0 - 72 * s, 4 * s, 0, TAU); g.fill(); } }   // a window: two heads over the cards
        g.fillStyle = '#e8e8ee'; g.font = 'bold ' + Math.round(7 * s) + 'px Arial'; g.fillText(d.name, X(d.x), y0 - 108 * s);
      }
      if (M && M.guards) for (const gd of M.guards) if (gd.fl === f) {
        const face = gd.alert > 0 ? gd.face : gd.look > 0 ? -gd.dir : gd.dir, gy = y0 - 4 * s;
        svPerson(g, X(gd.x), gy, s, '#16161c', '#16161c', '#d9a074', face, gd.wait > 0 || gd.look > 0 || gd.alert > 0 ? 0 : gameT * 6 + gd.x * 0.1, '#16161c');
        g.fillStyle = '#ffd23f'; g.fillRect(X(gd.x - 3), gy - 40 * s, 6 * s, 4 * s);
        if (gd.alert > 0 || gd.lost > 0) { g.font = 'bold ' + Math.round(26 * s) + 'px "Arial Black",Arial'; g.fillStyle = gd.alert > 0 ? '#ff3b4a' : '#cfd3dc'; g.fillText(gd.alert > 0 ? '!' : '?', X(gd.x), gy - 74 * s); }
      }
      if (M && M.mate && M.mate.fl === f) svPerson(g, X(M.mate.x), y0 - 4 * s, s, '#1a1a20', '#2a2a3a', '#f2c6a0', M.mate.face || 1, M.mate.walk || 0, '#d8262a');   // Fay: the red undercut
      g.fillStyle = '#e8e8ee'; g.font = 'bold ' + Math.round(14 * s) + 'px "Arial Black",Arial'; g.textAlign = 'left'; g.fillText(f === 0 ? 'C' : 'B' + f, X(B.W) - 34 * s, y1 + 20 * s); g.textAlign = 'center';
    }
    g.globalAlpha = meA; svPerson(g, X(SV.x), Y(SV.fl, 0) - 4 * s, s * (SV.hide ? 0.92 : 1), me.shirt, me.legs, '#f2c6a0', SV.face, SV.walk, me.hat); g.globalAlpha = 1;
    if (SV.say) { const sx = X(SV.say.x), sy = Y(SV.say.fl, 0) - 84 * s; g.font = 'bold ' + Math.round(12 * s) + 'px Arial'; const tw = g.measureText(SV.say.text).width + 14 * s;
      g.fillStyle = '#fff'; g.fillRect(sx - tw / 2, sy - 18 * s, tw, 22 * s); g.fillStyle = '#111'; g.fillText(SV.say.text, sx, sy - 3 * s); }
  }
  if (dark) { g.fillStyle = 'rgba(60,0,0,.18)'; g.fillRect(0, 0, Wc, Hc); }
  if (SV.fade > 0) { g.fillStyle = 'rgba(5,3,12,' + SV.fade.toFixed(2) + ')'; g.fillRect(0, 0, Wc, Hc); }
}
