'use strict';
/* ---------- 6zu. THE CASINO STRIP at work (js/01j casino, club; the casino table: js/01u; the buildings: js/10w) ----------
   The ROYAL FLAMINGO never closes. Its bouncer at the door to the avenue lets you in only dressed smart (one piece the clothes table
   calls smart), never while you are wanted, and not while its guards are after you. Inside, stand at a slot machine (SLOTS, or E) or at
   a dice table (DICE): the card plays it - three reels for a pull; craps on the pass line. Shooting in the casino or hurting anyone in it
   sets the guards on you (armed, js/08g) and calls the police; they calm down a while after you are out. With a gun in your hand at the
   cashier's window you can ROB the cage: stay there while the cashier fills a bag - the most stars of all, and the cage is empty for a
   while after. THE PULSE opens at night: a queue along the sidewalk, a bouncer with the same rules, inside a dancing crowd, the DJ, a
   bartender, lights, a mirror ball and the radio's dance station. At night more people stroll the avenue past the bars across it. */
const CX = { alarm: false, calmT: 0, told: 0, toldWhy: '', robbed: -1e9, rob: null, spin: null, dice: null, game: null, inC: false, inK: false, roof: 1, croof: 1, area: null, beat: 0, t: 0 };
const casinoOn = () => !!CASM && feat('casino');
const clubOn = () => !!CASM && feat('club');
const clubOpen = () => { const h = SKY.hour, a = CSN.clubOpen, b = CSN.clubClose; return a < b ? h >= a && h < b : h >= a || h < b; };
const smartNow = () => !CSN.dressCode || CL_SLOTS.some(sl => P.outfit && P.outfit[sl] && CLOTH[P.outfit[sl]] && CLOTH[P.outfit[sl]].smart);
const stripNight = () => SKY.hour >= 19 || SKY.hour < 5;
function doorWhy(kind) {                  // why the bouncer turns you away ('' : in you go)
  if (kind === 'club' && !clubOpen()) return 'THE PULSE OPENS AT ' + String(CSN.clubOpen).padStart(2, '0') + ':00';
  if (P.stars > 0) return 'NOT WHILE THE POLICE ARE AFTER YOU';
  if (kind === 'casino' && CX.alarm) return 'YOU ARE NOT WELCOME HERE';
  if (!smartNow()) return 'NOT DRESSED LIKE THAT - WEAR SOMETHING SMART';
  return '';
}

/* ---------- the people: guards, cashier, croupiers, gamblers; the club's bouncer, DJ, bartender, dancers and queue ---------- */
const CAS_SUITS = ['#1a1a22', '#2a2d3a', '#f4efe6', '#6f86ff', '#ff6fae', '#3a2a4a', '#c9b3ff'];
function casinoPosts() {                  // js/10w genCasino: every post, once
  const H = casHall(), C = casClub(), L = casLayout(), [, dy, dw] = CASM.door, inC = () => casinoOn(), open = () => clubOn() && clubOpen();
  const person = (po, o) => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post' }, o); return p; };
  const pistol = WEAPONS.findIndex(w => w.id === 'pistol');
  const guard = (x, y, a, patrol) => addPost({ x, y, a, kind: 'cguard', back: 240, patrol, need: inC, step: standStep,
    make: po => person(po, { cguard: true, arm: pistol, hp: 120, shirt: '#16161c', pants: '#16161c' }) });
  guard(H.x1 + 14, dy - dw / 2 - 12, 0);                                      // the door's bouncer, out on the sidewalk
  const spots = [[H.x1 - 24, dy - 44, Math.PI], [L.cage.win.x + 10, L.cage.y0 - 16, 0], [H.x0 + 300, dy, Math.PI, [[H.x0 + 300, dy], [H.x0 + 120, dy]]],
    [H.x0 + 250, dy + 20, 0, [[H.x0 + 250, dy + 20], [H.x1 - 60, dy + 20]]], [H.x0 + 330, H.y0 + 46, Math.PI / 2], [H.x0 + 330, H.y1 - 46, -Math.PI / 2]];
  for (const s of spots.slice(0, CSN.guards)) guard(s[0], s[1], s[2], s[3]);
  addPost({ x: L.cage.cashier.x, y: L.cage.cashier.y, a: 0, kind: 'cashier', back: 180, need: inC, step: standStep, make: po => person(po, { cashier: true, shirt: '#f2f2f2', pants: '#2a2d3a' }) });
  for (const t of L.tables) addPost({ x: t.x, y: t.y - t.f * (t.d / 2 + 12), a: t.f > 0 ? Math.PI / 2 : -Math.PI / 2, kind: 'croupier', back: 120, need: inC, step: standStep,
    make: po => person(po, { croupier: true, shirt: '#b3122a', pants: '#16161c' }) });
  const seats = [];                                                             // the gamblers: at machines and round the tables
  L.slots.forEach((s, i) => { if (i % 3 === 1) seats.push([s.x, s.y + s.f * 20, s.f > 0 ? -Math.PI / 2 : Math.PI / 2]); });
  for (const t of L.tables) seats.push([t.x - t.w / 2 - 11, t.y, 0], [t.x + t.w / 2 + 11, t.y, Math.PI], [t.x - 32, t.y + t.f * (t.d / 2 + 11), t.f > 0 ? -Math.PI / 2 : Math.PI / 2], [t.x + 32, t.y + t.f * (t.d / 2 + 11), t.f > 0 ? -Math.PI / 2 : Math.PI / 2]);
  for (let i = 0; i < Math.min(CSN.gamblers, seats.length); i++) { const k = (i * 7) % seats.length, s = seats[k];
    addPost({ x: s[0], y: s[1], a: s[2], kind: 'gambler', back: 90, need: inC, step: standStep, make: po => person(po, { gambler: true, shirt: pick(CAS_SUITS), pants: pick(['#16161c', '#2a2d3a', '#f4efe6']) }) }); }
  // THE PULSE
  const [cdx] = CASM.cdoor;
  addPost({ x: cdx + 30, y: C.y1 + 14, a: Math.PI / 2, kind: 'bouncer', back: 120, need: open, step: standStep, make: po => person(po, { bouncer: true, shirt: '#0c0a12', pants: '#0c0a12' }) });
  addPost({ x: L.dj.at.x, y: L.dj.at.y, a: Math.PI / 2, kind: 'dj', back: 120, need: open, step: danceStep, make: po => person(po, { dj: true, shirt: '#2bf3ff', pants: '#16161c' }) });
  addPost({ x: L.bar.at.x, y: L.bar.at.y, a: 0, kind: 'bartender', back: 120, need: open, step: barStep, make: po => person(po, { bartender: true, shirt: '#f2f2f2', pants: '#16161c' }) });
  const F = L.floor, NEO = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff', '#f4f4f6'];
  for (let i = 0; i < CSN.dancers; i++) { const x = F.x0 + 14 + rand(0, F.x1 - F.x0 - 28), y = F.y0 + 14 + rand(0, F.y1 - F.y0 - 28);
    addPost({ x, y, a: rand(-Math.PI, Math.PI), kind: 'dancer', back: 60, need: open, step: danceStep, make: po => person(po, { dancer: true, shirt: pick(NEO), pants: pick(['#16161c', '#2a2d3a', '#5a1a6a', '#f4f4f6']) }) }); }
  const [qx0, qy] = CASM.queue;                                          // [head x, y, tail x]
  for (let i = 0; i < CSN.queue; i++) addPost({ x: qx0 - i * 24, y: qy, a: 0, kind: 'queue', back: 60, need: open, step: standStep,
    make: po => person(po, { queuer: true, shirt: pick(NEO), pants: pick(['#16161c', '#2a2d3a', '#f4f4f6']) }) });
}
function standStep(p, dt) {               // at a post: back to it if pushed, facing its way; a guard with a round walks it
  if (p.state === 'flee') return false;
  const po = p.post;
  if (po.patrol) { const w = po.patrol[po.i % po.patrol.length]; if (walkTo(p, w[0], w[1], WALK, dt) < 6) po.i++; return true; }
  if (walkTo(p, po.x, po.y, WALK, dt) < 4) { p.vx = p.vy = 0; p.ang = p.hd = po.a + (p.queuer || p.gambler ? 0.25 * Math.sin(gameT * 0.7 + po.x) : 0); }
  return true;
}
function danceStep(p, dt) {               // on the dance floor (and the DJ behind the decks): to the beat, where they stand
  if (p.state === 'flee') { p.dance = false; return false; }
  const po = p.post; if (walkTo(p, po.x, po.y, WALK, dt) < 6) { p.vx = p.vy = 0; p.dance = true; p.ang = p.hd = po.a + (p.dj ? 0.3 : 0.9) * Math.sin(gameT * (p.dj ? 2 : 1.3) + po.x * 0.1); }
  return true;
}
function barStep(p, dt) {                 // the bartender: up and down the bar
  if (p.state === 'flee') return false;
  const B = CZ.bar, y = (B.y0 + B.y1) / 2 + Math.sin(gameT * 0.25) * ((B.y1 - B.y0) / 2 - 14);
  walkTo(p, p.post.x, y, WALK, dt); p.ang = p.hd = 0; return true;
}

/* ---------- trouble: the alarm, the guards ---------- */
function casinoAlarm() {                  // js/06: a shot or a blast of yours in the casino, someone in it hurt or killed
  if (!casinoOn()) return;
  if (!CX.alarm) { toast('THE CASINO GUARDS ARE AFTER YOU', true); const H = casHall(); alertPeds(H.cx, H.cy, 420, true); }
  CX.alarm = true; CX.calmT = 0; if (CSN.troubleStars > 0) forceWanted(CSN.troubleStars);
  for (const p of peds) if (p.cguard && !p.dead) provoke(p);
}
const casinoHurt = (x, y) => { if (CASM && inCasino(x, y, -2)) casinoAlarm(); };
function casinoCalm() {
  CX.alarm = false; CX.calmT = 0;
  for (const p of peds) if (p.cguard && !p.dead && p.hostile) { p.hostile = false; p.hostT = 0; p.state = 'post'; }
}

/* ---------- the doors ---------- */
function casinoDoors(dt) {
  const me = P.car || P; CX.inC = !P.dead && inCasino(me.x, me.y, -2); CX.inK = !P.dead && inClub(me.x, me.y, -2);
  const whyC = casinoOn() ? doorWhy('casino') : 'CLOSED', whyK = clubOn() ? doorWhy('club') : 'CLOSED';
  CZ.door.off = casinoOn() && (CX.inC || !whyC); CZ.cdoor.off = clubOn() && (CX.inK || !whyK);
  if (P.car || P.dead || state !== 'play') return;
  const [ex, ey] = [CASM.door[0], CASM.door[1]], [kx, ky] = [CASM.cdoor[0], CASM.cdoor[1]];
  const at = !CX.inC && whyC && dist(P.x, P.y, ex + 16, ey) < 34 ? whyC : !CX.inK && whyK && dist(P.x, P.y, kx, ky + 16) < 30 ? whyK : '';
  if (at && (gameT - CX.told > 4 || CX.toldWhy !== at)) { CX.told = gameT; CX.toldWhy = at; toast('THE BOUNCER: ' + at); Snd.tone(220, 165, 0.12, 0.08, 'square'); }
}

/* ---------- what you can do where you stand: a slot machine, a dice table, the cashier's window ---------- */
function casKey() {
  if (!casinoOn() || P.car || P.dead || P.act || state !== 'play' || !inCasino(P.x, P.y, 0)) return null;
  if (CX.rob) return null;
  const g = CZ.cage, w = WEAPONS[P.weapon];
  if (dist(P.x, P.y, g.win.x, g.win.y) < 24) return { kind: 'rob', ok: !isMelee(w) && !isThrown(w) && P.mag[P.weapon] + P.ammo[P.weapon] > 0 };
  for (const s of CZ.slots) { const u = (P.y - s.y) * s.f; if (Math.abs(P.x - s.x) < 11 && u > 7 && u < 32) return { kind: 'slot', s }; }
  for (const t of CZ.tables) { const u = (P.y - t.y) * t.f; if (Math.abs(P.x - t.x) < t.w / 2 + 4 && u > t.d / 2 && u < t.d / 2 + 26) return { kind: 'dice', t }; }
  return null;
}
const robReady = () => gameT - CX.robbed >= CSN.cageBack && POSTS.some(po => po.kind === 'cashier' && po.ped && !po.ped.dead && peds.includes(po.ped));
function casUi() {                        // every frame (js/14): the button by you
  const k = casKey(), b = $('casBtn');
  if (!k) { if (!b.hidden) b.hidden = true; return; }
  const label = k.kind === 'slot' ? 'SLOTS · ' + money(CSN.slotBet) : k.kind === 'dice' ? 'DICE · ' + money(CSN.diceMin) + '-' + money(CSN.diceMax) : !robReady() ? 'THE CAGE IS EMPTY' : k.ok ? 'CASHIER' : 'CASHIER · A GUN TO ROB IT';
  const go = k.kind === 'rob' ? 'ROB' : 'PLAY', key = label + go;
  if (b.hidden || b.dataset.s !== key) { b.hidden = false; b.dataset.s = key; b.querySelector('b').textContent = label; b.querySelector('.go').textContent = go; b.style.setProperty('--sc', k.kind === 'rob' ? '#ff3b4a' : '#ffd23f'); }
  doorBtnAt(b);
}
function casUse(k) {                      // E or the button
  if (k.kind === 'slot') openSlotCard();
  else if (k.kind === 'dice') openDiceCard();
  else if (k.kind === 'rob') { if (!robReady()) toast('THE CAGE IS EMPTY - COME BACK LATER'); else if (!k.ok) toast('YOU NEED A GUN IN YOUR HAND TO ROB IT'); else startRob(); }
}
$('casBtn').addEventListener('click', e => { e.stopPropagation(); const k = casKey(); if (k) casUse(k); });

/* ---------- the robbery ---------- */
function startRob() {
  CX.rob = { t: 0 }; casinoAlarm(); if (CSN.robStars > 0) forceWanted(CSN.robStars);
  toast('HANDS UP - FILL THE BAG!', true); Snd.tone(330, 660, 0.2, 0.12, 'square');
}
function robTick(dt) {
  const g = CZ.cage, R = CX.rob, d = dist(P.x, P.y, g.win.x, g.win.y), cashier = POSTS.find(po => po.kind === 'cashier'), c = cashier && cashier.ped;
  if (P.dead || P.car || d > 40 || !c || c.dead) { CX.rob = null; warnOff('casino'); if (!P.dead) toast(c && !c.dead ? 'THE CASHIER SLAMS THE SHUTTER - NOTHING' : 'NOBODY TO FILL THE BAG - NOTHING', true); return; }
  if (c.state === 'flee') { c.state = 'post'; c.fl = 0; }                       // a gun in the face: the cashier stays and fills the bag
  R.t += dt; warnSet('casino', 'FILLING THE BAG<br><small>STAY AT THE WINDOW ' + Math.max(0, Math.ceil(CSN.robTime - R.t)) + '</small>');
  if (R.t < CSN.robTime) return;
  const pay = Math.round(rand(CSN.cageMin, Math.max(CSN.cageMin, CSN.cageMax)) / 10) * 10;
  P.score += pay; CX.robbed = gameT; CX.rob = null; warnOff('casino');
  popup(P.x, P.y - 14, '+' + money(pay), '#3dffa6'); toast('THE BAG: ' + money(pay) + ' - NOW GET OUT'); Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.1, 0.12, 'square'), 110);
}

/* ---------- the slot machine ---------- */
const SLOT_SYM = [
  { id: 'cherry', w: 'wCherry', pay: 'payCherry', name: 'CHERRIES', svg: '<svg viewBox="0 0 40 40"><path d="M14 26c4-10 10-16 18-20M26 28c0-8 2-14 6-22" stroke="#3dbb4a" stroke-width="2.5" fill="none"/><circle cx="12" cy="28" r="7" fill="#e0364f"/><circle cx="26" cy="30" r="7" fill="#e0364f"/><circle cx="10" cy="26" r="2" fill="#fff" opacity=".6"/></svg>' },
  { id: 'lemon', w: 'wLemon', pay: 'payLemon', name: 'LEMONS', svg: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="21" rx="15" ry="11" fill="#ffe14a"/><path d="M5 21l-3 0M35 21l3 0" stroke="#ffe14a" stroke-width="4"/><ellipse cx="15" cy="17" rx="4" ry="2" fill="#fff" opacity=".5"/></svg>' },
  { id: 'bell', w: 'wBell', pay: 'payBell', name: 'BELLS', svg: '<svg viewBox="0 0 40 40"><path d="M20 5c-8 0-11 7-11 15v6l-4 5h30l-4-5v-6c0-8-3-15-11-15z" fill="#ffd23f"/><circle cx="20" cy="33" r="3.5" fill="#d4a52a"/></svg>' },
  { id: 'bar', w: 'wBar', pay: 'payBar', name: 'BARS', svg: '<svg viewBox="0 0 40 40"><rect x="3" y="12" width="34" height="16" rx="2" fill="#111"/><text x="20" y="25" font-size="11" font-family="Arial Black,Impact,sans-serif" text-anchor="middle" fill="#f4f4f6">BAR</text></svg>' },
  { id: 'seven', w: 'wSeven', pay: 'paySeven', name: 'SEVENS', svg: '<svg viewBox="0 0 40 40"><text x="20" y="34" font-size="34" font-family="Arial Black,Impact,sans-serif" text-anchor="middle" fill="#e0364f" stroke="#ffd23f" stroke-width="1.2">7</text></svg>' },
  { id: 'flamingo', w: 'wFlamingo', jack: true, name: 'FLAMINGOS', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="#ff4fa8" stroke-width="2.6" stroke-linecap="round"><ellipse cx="17" cy="22" rx="9" ry="5"/><path d="M24 20c4-3 2-8 0-11s0-6 4-5 4 3 4 3"/><path d="M32 7l3 3"/><path d="M17 27v10M17 27l4 5-3 1"/></svg>' }];
function reelPick() {
  const ws = SLOT_SYM.map(s => CSN[s.w]), tot = ws.reduce((a, b) => a + b, 0) || 1; let r = Math.random() * tot;
  for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) return i; } return 0;
}
function slotWin(res) {                   // what a line pays (in euros), and how to say it
  const bet = CSN.slotBet, s = SLOT_SYM[res[0]];
  if (res[0] === res[1] && res[1] === res[2]) return s.jack ? { win: CSN.jackpot, say: 'JACKPOT! THREE FLAMINGOS', jack: true } : { win: bet * CSN[s.pay], say: 'THREE ' + s.name };
  const ch = res.filter(i => SLOT_SYM[i].id === 'cherry').length;
  if (ch === 2 && CSN.payTwoCherry > 0) return { win: bet * CSN.payTwoCherry, say: 'TWO CHERRIES' };
  return { win: 0, say: 'NO WIN' };
}
function openCasCard(kind) {
  CX.game = kind; state = 'casino'; toggleBigMap(false); toggleWheel(false); hush(); $('casBtn').hidden = true;
  $('cgTag').textContent = 'ROYAL FLAMINGO · ' + (kind === 'slots' ? 'SLOTS' : 'DICE'); $('cgName').textContent = kind === 'slots' ? 'SLOT MACHINE' : 'DICE TABLE';
  $('cgSlots').hidden = $('cgPull').hidden = kind !== 'slots'; $('cgDice').hidden = $('cgRoll').hidden = kind !== 'dice'; $('cgMsg').textContent = ''; $('cgMsg').className = 'warn';
  casCash(); showCard('casCard', true);
}
const casCash = () => { $('cgCash').textContent = 'YOUR CASH ' + money(P.score); };
function openSlotCard() {
  openCasCard('slots');
  if (!CX.spin) for (let k = 0; k < 3; k++) $('cgR' + k).innerHTML = SLOT_SYM[[4, 5, 4][k]].svg;
  $('cgPull').textContent = 'PULL ' + money(CSN.slotBet);
  $('cgPays').innerHTML = SLOT_SYM.slice().reverse().map(s => '<span>' + s.svg.repeat(3) + '</span><b>' + (s.jack ? money(CSN.jackpot) : money(CSN.slotBet * CSN[s.pay])) + '</b>').join('') +
    (CSN.payTwoCherry > 0 ? '<span>' + SLOT_SYM[0].svg.repeat(2) + '</span><b>' + money(CSN.slotBet * CSN.payTwoCherry) + '</b>' : '');
}
function slotPull() {
  if (state !== 'casino' || CX.game !== 'slots' || CX.spin) return;
  const bet = CSN.slotBet; if (P.score < bet) { casSay('NOT ENOUGH CASH'); Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
  P.score -= bet; casCash(); casSay('');
  const res = [reelPick(), reelPick(), reelPick()], t0 = performance.now(), stops = [650, 1000, 1350];
  $('cgPull').disabled = true; Snd.tone(440, 330, 0.06, 0.08, 'square');
  CX.spin = { res, iv: setInterval(() => {
    const t = performance.now() - t0;
    for (let k = 0; k < 3; k++) { const el = $('cgR' + k); if (t < stops[k]) { el.innerHTML = SLOT_SYM[(Math.random() * SLOT_SYM.length) | 0].svg; el.classList.add('spin'); } else if (el.classList.contains('spin')) { el.classList.remove('spin'); el.innerHTML = SLOT_SYM[res[k]].svg; Snd.tone(300 + k * 80, 260 + k * 80, 0.05, 0.1, 'square'); } }
    if (t >= stops[2]) { clearInterval(CX.spin.iv); CX.spin = null; for (let k = 0; k < 3; k++) { const el = $('cgR' + k); el.classList.remove('spin'); el.innerHTML = SLOT_SYM[res[k]].svg; } slotDone(res); }
  }, 70) };
}
function slotDone(res) {
  const r = slotWin(res); $('cgPull').disabled = false;
  if (r.win > 0) { P.score += r.win; casCash(); casSay(r.say + ' · YOU WIN ' + money(r.win), true);
    Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.1, 0.12, 'square'), 110); if (r.jack) setTimeout(() => Snd.tone(1760, 2200, 0.3, 0.14, 'square'), 260); }
  else casSay('NO WIN - PULL AGAIN');
}
$('cgPull').addEventListener('click', slotPull);

/* ---------- the dice: craps on the pass line ---------- */
const PIPS = { 1: [[20, 20]], 2: [[11, 11], [29, 29]], 3: [[11, 11], [20, 20], [29, 29]], 4: [[11, 11], [29, 11], [11, 29], [29, 29]], 5: [[11, 11], [29, 11], [20, 20], [11, 29], [29, 29]], 6: [[11, 10], [29, 10], [11, 20], [29, 20], [11, 30], [29, 30]] };
const dieSvg = n => '<svg viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="7" fill="#f4f4f6"/>' + PIPS[n].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="#b3122a"/>').join('') + '</svg>';
function diceSteps() { const a = CSN.diceMin, b = Math.max(a, CSN.diceMax); return [...new Set([a, ...[50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000].filter(v => v > a && v < b), b])]; }
function openDiceCard() {
  openCasCard('dice');
  if (!CX.dice) CX.dice = { bet: CSN.diceMin, point: 0, rolling: false, d: [3, 4] };
  const D = CX.dice; if (!D.point) D.bet = clamp(D.bet, CSN.diceMin, Math.max(CSN.diceMin, CSN.diceMax));
  $('cgD0').innerHTML = dieSvg(D.d[0]); $('cgD1').innerHTML = dieSvg(D.d[1]); paintDice();
}
function paintDice() {
  const D = CX.dice; $('cgBet').textContent = money(D.bet); $('cgLess').disabled = $('cgMore').disabled = !!D.point || D.rolling; $('cgRoll').disabled = D.rolling;
  $('cgRule').textContent = D.point ? 'THE POINT IS ' + D.point + ' · ROLL ' + D.point + ' AGAIN BEFORE A 7 TO WIN' : '7 OR 11 WINS · 2, 3 OR 12 LOSES · ANY OTHER IS THE POINT';
  $('cgRoll').textContent = D.point ? 'ROLL AGAIN' : 'BET ' + money(D.bet) + ' AND ROLL';
  $('cgBack').textContent = D.point ? 'LEAVE (LOSE THE BET)' : 'LEAVE';
}
function diceBet(dir) {
  const D = CX.dice; if (!D || D.point || D.rolling) return;
  const st = diceSteps(), i = st.indexOf(st.reduce((b, v) => Math.abs(v - D.bet) < Math.abs(b - D.bet) ? v : b, st[0]));
  D.bet = st[clamp(i + dir, 0, st.length - 1)]; paintDice();
}
function diceRoll() {
  const D = CX.dice; if (state !== 'casino' || CX.game !== 'dice' || !D || D.rolling) return;
  if (!D.point) { if (P.score < D.bet) { casSay('NOT ENOUGH CASH'); Snd.tone(160, 110, 0.12, 0.12, 'square'); return; } P.score -= D.bet; casCash(); }
  D.rolling = true; casSay(''); paintDice(); const t0 = performance.now();
  const iv = setInterval(() => {
    const t = performance.now() - t0;
    if (t < 750) { $('cgD0').innerHTML = dieSvg(1 + ((Math.random() * 6) | 0)); $('cgD1').innerHTML = dieSvg(1 + ((Math.random() * 6) | 0)); Snd.tone(900, 700, 0.02, 0.05, 'square'); return; }
    clearInterval(iv); D.d = [1 + ((Math.random() * 6) | 0), 1 + ((Math.random() * 6) | 0)]; $('cgD0').innerHTML = dieSvg(D.d[0]); $('cgD1').innerHTML = dieSvg(D.d[1]); D.rolling = false; diceDone(D.d[0] + D.d[1]);
  }, 80);
}
function diceDone(s) {
  const D = CX.dice, win = () => { P.score += D.bet * 2; casCash(); D.point = 0; Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.1, 0.12, 'square'), 110); }, lose = () => { D.point = 0; Snd.tone(220, 140, 0.18, 0.1, 'square'); };
  if (!D.point) {
    if (s === 7 || s === 11) { win(); casSay(s + '! YOU WIN ' + money(D.bet), true); }
    else if (s === 2 || s === 3 || s === 12) { lose(); casSay(s + ' - CRAPS. THE HOUSE WINS'); }
    else { D.point = s; casSay('THE POINT IS ' + s, true); }
  } else if (s === D.point) { win(); casSay(s + ' AGAIN! YOU WIN ' + money(D.bet), true); }
  else if (s === 7) { lose(); casSay('7 - SEVEN OUT. THE HOUSE WINS'); }
  else casSay(s + ' - ROLL AGAIN');
  paintDice();
}
$('cgLess').addEventListener('click', () => diceBet(-1)); $('cgMore').addEventListener('click', () => diceBet(1)); $('cgRoll').addEventListener('click', diceRoll);
function casSay(t, ok) { $('cgMsg').textContent = t; $('cgMsg').classList.toggle('ok', !!ok); }
function closeCasCard() {                 // LEAVE, Esc, E: a point still on is lost
  if (state !== 'casino') return;
  if (CX.spin) { clearInterval(CX.spin.iv); const res = CX.spin.res; CX.spin = null; slotDone(res); }
  if (CX.dice && CX.dice.rolling) return;
  if (CX.dice && CX.dice.point) { CX.dice.point = 0; toast('YOU WALKED AWAY - THE BET IS LOST'); }
  state = 'play'; CX.game = null; closeMenus();
}

/* ---------- the strip at night: people out on the avenue's sidewalks ---------- */
function stripCrowd() {
  if (!CX.area) { const y0 = CASM.block[1] + 10; CX.area = { k: 'promenade', g: { o: [[12449, y0], [12466, y0], [12466, 7840], [12449, 7840]], h: [] }, bb: [12449, y0, 12466, 7840] }; }
  const A = CX.area, on = casinoOn() && stripNight(); let n = 0;
  for (const p of peds) if (!p.dead && p.area === A) { if (!on && offScreen(p.x, p.y)) p.vanish = true; else n++; }
  if (!on || n >= CSN.stripPeople || dist(P.x, P.y, 12458, 6900) > 1400) return;
  const q = randomIn(A.g, (x, y) => strollOk(A, x, y) && offScreen(x, y)); if (!q) return;
  const p = makePed(q[0], q[1]); Object.assign(p, { stroll: true, area: A, shirt: pick(CAS_SUITS.concat(['#ff2bd6', '#2bf3ff', '#ffe14a'])), pants: pick(['#16161c', '#2a2d3a', '#f4efe6']) }); strollTarget(p); peds.push(p);
}

/* ---------- js/15 update ---------- */
function casinoTick(dt) {
  if (!CASM) return;
  casinoDoors(dt);
  if (CX.rob) robTick(dt);
  if (CX.alarm) { if (CX.inC) CX.calmT = 0; else if ((CX.calmT += dt) >= CSN.calm) casinoCalm(); }
  stripCrowd();
}
function casinoReset() { CX.alarm = false; CX.calmT = 0; CX.rob = null; CX.robbed = -1e9; CX.dice = null; CX.told = 0; if (CASM) warnOff('casino'); }
const clubRadio = () => CX.inK && clubOn() && clubOpen() && !P.car && RADIO.length ? clamp(CSN.clubStation - 1, 0, RADIO.length - 1) : -1;   // js/02b: the club's music while you are in

/* ---------- js/13 every frame: roofs, the flamingo's legs, the dance floor, the spots, the ball, the heartbeat ---------- */
let casT = 0;
function gfxCasino(time) {
  const dt = Math.min(0.1, Math.max(0, time - casT)); casT = time; if (!CASM) return;
  const fade = (v, inside, key) => { CX[key] += ((inside ? 0.08 : 1) - CX[key]) * Math.min(1, dt * 6); if (Math.abs(CX[key] - v.op) > 0.003) { v.op = CX[key]; for (const m of v.mats) { m.opacity = CX[key]; m.depthWrite = CX[key] > 0.97; } } };
  const V = CZ.view; if (V && CZ.lm.mesh) { fade(V, CX.inC, 'roof'); const k = Math.floor(time / 0.6) % 2 === 0; V.legA.visible = k; V.legB.visible = !k; V.neonMat.color.setScalar(stripNight() || SKY.night ? 1 : 0.8); }
  const K = CZ.cview; if (!K || !CZ.clm.mesh) return;
  fade(K, CX.inK, 'croof');
  const open = clubOn() && clubOpen(), beat = Math.floor(time * 124 / 60);
  K.ecgMat.color.setScalar(open ? 0.35 + 0.65 * Math.pow(Math.max(0, Math.cos((time * 124 / 60 % 1) * Math.PI)), 6) : 0.25);
  if (beat !== CX.beat) { CX.beat = beat;                                    // the tiles: a new pattern on every beat (dark while the club is shut)
    const col = K.floorGeo.attributes.color, per = col.count / (K.n * K.mz), c = new THREE.Color();
    for (let i = 0; i < K.n; i++) for (let k = 0; k < K.mz; k++) { const t = i * K.mz + k, on = open && ((i + k + beat) % 3 === 0 || (i * 7 + k * 3 + beat) % 5 === 0);
      c.set(BAR_COLS[(i + 2 * k + beat) % BAR_COLS.length]); if (!on) c.multiplyScalar(open ? 0.22 : 0.08);
      for (let v = t * per; v < (t + 1) * per; v++) col.setXYZ(v, c.r, c.g, c.b); }
    col.needsUpdate = true; }
  K.ball.rotation.y = time * 0.8; K.ball.visible = open;
  K.spots.forEach((s, i) => { s.visible = open; if (!open) return; const F = K.F, u = time * (0.4 + i * 0.07) + i * 1.7;
    s.position.x = (F.x0 + F.x1) / 2 + Math.sin(u) * (F.x1 - F.x0) * 0.4; s.position.z = (F.z0 + F.z1) / 2 + Math.cos(u * 1.3) * (F.z1 - F.z0) * 0.4; });
}

/* ---------- js/14: the maps ---------- */
function casinoIcons(g, X, Y, q, inView) {
  if (!CASM) return;
  if (casinoOn()) { const x = X(CASM.door[0]), y = Y(CASM.door[1]); if (inView(x, y)) {
    g.fillStyle = '#000'; g.fillRect(x - q, y - q, q * 2, q * 2); g.fillStyle = '#ff3fb4'; g.beginPath(); g.arc(x, y, q * 0.8, 0, TAU); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, q * 0.45, 0, TAU); g.fill(); g.fillStyle = '#ff3fb4'; g.beginPath(); g.arc(x, y, q * 0.25, 0, TAU); g.fill(); } }
  if (clubOn()) { const x = X(CASM.cdoor[0]), y = Y(CASM.cdoor[1]); if (inView(x, y)) {
    g.fillStyle = '#000'; g.fillRect(x - q * 1.2, y - q * 0.8, q * 2.4, q * 1.6); g.strokeStyle = clubOpen() ? '#2bf3ff' : '#4a5a66'; g.lineWidth = Math.max(1.5, q * 0.25);
    g.beginPath(); g.moveTo(x - q, y); g.lineTo(x - q * 0.3, y); g.lineTo(x - q * 0.1, y - q * 0.6); g.lineTo(x + q * 0.2, y + q * 0.6); g.lineTo(x + q * 0.4, y); g.lineTo(x + q, y); g.stroke(); } }
}
