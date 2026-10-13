'use strict';
/* ---------- 6zs. STATS AND 100% (js/01j stats; the stats table js/01t) ----------
   The STATS card in the pause menu: 100% - everything findable, each thing counted once (safehouses bought, rampages passed, hidden
   weapons and items found, races won, jobs to level 10, cars delivered, Pay 'n' Spray garages used); STATS - kills, cars stolen,
   distance on foot and driven, top speed and more; RECORDS - the best race times and job levels. At 100%: a one-of-a-kind gold car
   (vehicles table: gold) waits in your best garage, and health and body armor go up to 200. The gold car lost - wrecked, crushed,
   sunk or left far away - a new one is back in the garage a few minutes later. The counters go into the saved game. */
const STAT = { stolen: 0, foot: 0, drive: 0, top: 0, cops: 0, busted: 0, wasted: 0, crushed: 0, tuned: 0, resprays: 0,
  found: new Set(), won: new Set(), sprays: new Set(), gold: false, due: false, lostT: null, waitTold: false, t: 0, last: -1 };
const statOn = () => feat('stats');
const goldName = () => 'GOLD ' + (CAR_TYPES.gold ? CAR_TYPES.gold.name : 'CAR');
const statTop = k => STAT.gold && statOn() ? (k === 'hp' ? STS.topHealth : STS.topArmor) : 0;   // js/08n hpMax, armorMax

/* ---------- what counts: the groups on in this mode, each { id, name, got, of, left } ---------- */
const stShare = n => { const K = modeVal('pickups', 100) / 100; return n > 0 && K > 0 ? Math.max(1, Math.round(n * K)) : 0; };   // as js/08d placeWeapons
const stWeapons = () => WEAPONS.filter(w => !w.start && stShare(w.onMap) > 0).map(w => w.id);
const stItems = () => ITEMS.filter(i => stShare(i.onMap) > 0).map(i => i.id);
function stRaces() {                      // [id, name] of every race that counts: the fixed street races, the NASCAR race, the drag strips
  const r = [];
  if (feat('streetRaces')) for (const R of ROUTES) r.push([R.id, R.name]);
  if (SPW && feat('speedway')) r.push(['nascar', 'PALM 200']);
  if (feat('dragStrip')) for (const S of SPW_STRIPS) r.push(['drag-' + S.id, S.name]);
  return r;
}
function statList() {
  const L = [], add = (id, name, got, of, left) => { if (of > 0) L.push({ id, name, got: Math.min(got, of), of, left: left || '' }); };
  if (STS.countSafes && safeOn()) { const s = SAFES.filter(h => h.price > 0); add('safes', 'SAFEHOUSES BOUGHT', s.filter(h => h.own).length, s.length); }
  if (STS.countRampages && feat('rampages')) { const r = rampsHere(); add('ramps', 'RAMPAGES PASSED', r.filter(q => rampDone.has(q.id)).length, r.length); }
  if (STS.countWeapons && feat('hiddenWeapons')) { const w = stWeapons(); add('weapons', 'HIDDEN WEAPONS FOUND', w.filter(id => STAT.found.has(id)).length, w.length); }
  if (STS.countItems && feat('hiddenItems')) { const it = stItems(); add('items', 'HIDDEN ITEMS FOUND', it.filter(id => STAT.found.has(id)).length, it.length, it.filter(id => !STAT.found.has(id)).map(id => ITEM[id].name).join(', ')); }
  if (STS.countRaces) { const r = stRaces(); add('races', 'RACES WON', r.filter(q => STAT.won.has(q[0])).length, r.length, r.filter(q => !STAT.won.has(q[0])).map(q => q[1]).join(', ')); }
  if (STS.countJobs) { const j = Object.keys(JOBK).filter(jobOn), lv = Math.round(STS.jobLevel);
    add('jobs', 'JOBS TO LEVEL ' + lv, j.filter(k => (JOB.best[k] || 0) >= lv).length, j.length, j.filter(k => (JOB.best[k] || 0) < lv).map(k => JOBK[k].name + ' ' + (JOB.best[k] || 0)).join(', ')); }
  if (STS.deliveries > 0 && feat('carDelivery')) add('dlv', 'CARS DELIVERED', DLV.done, Math.round(STS.deliveries));
  if (STS.countStunts && stuntOn() && STUNTS.length) add('stunts', 'UNIQUE STUNT JUMPS', STUNTS.filter(s => STX.done.has(s.k)).length, STUNTS.length, STUNTS.filter(s => !STX.done.has(s.k)).map(s => s.name).join(', '));
  if (STS.countSprays && feat('sprayGarage')) add('sprays', "PAY 'N' SPRAYS USED", PNS.filter(G => STAT.sprays.has(G.i)).length, PNS.length);
  return L;
}
function statPct(L) {                     // whole per cent, 100 only when all is done
  L = L || statList(); let got = 0, of = 0; for (const g of L) { got += g.got; of += g.of; }
  return of > 0 ? Math.floor(got * 100 / of) : 0;
}

/* ---------- the counters (hooks in js/06, js/08b, js/08d, js/08o, js/08q, js/08y, js/08z) ---------- */
function statSteal(c) { if (c.taken) return; c.taken = true; if (!c.home && !c.free && c.type !== 'gold') STAT.stolen++; }   // js/06 enterCar: once per car, not your own
function statFound(p) {                   // js/08d: walked up to a hidden weapon or item (not ammo, not dropped by the dead, not the road's heat reducer or the base's armoury)
  if (p.drop || p.road || p.base || p.ammo) return;
  const id = p.item || (WEAPONS[p.wi] && WEAPONS[p.wi].id); if (id) STAT.found.add(id);
}
function statWon(Ro) {                    // js/08o raceFinish: first place, not a test run
  const id = Ro.kind === 'street' ? (Ro.id !== 'random' ? Ro.id : null) : Ro.kind === 'nascar' ? 'nascar' : Ro.kind === 'drag' ? 'drag-' + Ro.S.id : null;
  if (id) STAT.won.add(id);
}
function statSpray(G) { STAT.sprays.add(G.i); STAT.resprays++; }   // js/08q pnsDone

/* ---------- js/15 update: distance, top speed, the reward, the gold car ---------- */
function statTick(dt) {
  if (!P.dead) {
    if (P.car) { const v = carSpeed(P.car); STAT.drive += v * dt; if (v > STAT.top) STAT.top = v; }
    else if (!P.knocked) STAT.foot += Math.hypot(P.vx, P.vy) * dt;
  }
  if ((STAT.t -= dt) > 0) return; STAT.t = 1;
  const on = statOn(); if (!on) return;
  const L = statList(), pct = statPct(L), done = L.reduce((a, g) => a + g.got, 0);
  if (STAT.last >= 0 && done > STAT.last && pct < 100) popup(P.x, P.y - 44, pct + '% DONE', '#ffd23f');   // one more thing toward 100%
  STAT.last = done;
  if (!STAT.gold && pct >= 100) statReward();
  if (!STAT.gold) return;
  for (const c of cars) if (c.type === 'gold' && !c.home && !c.dead) c.keep = true;   // one of a kind: the spawner never takes it away
  if (goldHere()) { STAT.lostT = null; return; }
  if (STAT.lostT === null) STAT.lostT = gameT;
  if (STAT.due || gameT - STAT.lostT >= STS.goldBack) { STAT.due = true; goldDeliver(); }
}
function statReward() {                   // 100%: the gold car, health and armor up to the top
  STAT.gold = true; STAT.due = true; STAT.lostT = -1e9; STAT.waitTold = false;
  P.hp = Math.max(P.hp, hpMax()); P.armor = Math.max(P.armor, armorMax());
  toast('100%! HEALTH AND ARMOR UP TO ' + STS.topHealth + ' - AND A ' + goldName() + ' IS YOURS');
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => Snd.tone(f, f * 1.5, 0.22, 0.14, 'square'), i * 150));
  goldDeliver();
}
function goldHere() {                     // is the gold car anywhere: driven, standing somewhere, or put away in a garage
  if (P.car && P.car.type === 'gold' && !P.car.dead) return true;
  for (const c of cars) if (c.type === 'gold' && !c.dead && !c.sunk) return true;
  return SAFES.some(h => h.own && h.keep.some(s => s && s.type === 'gold'));
}
const GOLD_LOOK = { stripes: '#17120a', rims: '#ffe14a', glow: '#ffd23f', spoiler: true };   // as it comes: black stripes, gold rims and underglow (retune it at js/08y)
function goldDeliver() {                  // into a free space of your best garage (the dearest you own); none free: later; no safehouses: at the kerb
  if (!CAR_TYPES.gold) { STAT.due = false; return; }
  const col = CAR_TYPES.gold.colors[0];
  if (safeOn() && SAFES.some(h => h.own && h.spots.length)) {
    for (const h of SAFES.filter(q => q.own && q.spots.length).sort((a, b) => b.price - a.price)) {
      const k = h.spots.findIndex((p, i) => !h.keep[i] && !h.live[i] && !cars.some(o => dist(o.x, o.y, p.x, p.y) < 24));
      if (k < 0) continue;
      h.keep[k] = { type: 'gold', color: col, tune: tuneClean(GOLD_LOOK) }; STAT.due = false; STAT.lostT = null;
      setTimeout(() => toast('THE ' + goldName() + ' WAITS AT ' + h.name), 2600); return;
    }
    if (!STAT.waitTold) { STAT.waitTold = true; setTimeout(() => toast('THE ' + goldName() + ' WAITS FOR A FREE SPACE IN ONE OF YOUR GARAGES'), 2600); }
    return;
  }
  if (P.car || P.dead) return;                                      // no garage to use: by the kerb next to you, once you are on foot
  const q = kerbBy(P.x, P.y); if (!kerbFits(q.x, q.y, q.ang, 'gold') || cars.some(o => dist(o.x, o.y, q.x, q.y) < 40)) return;
  const c = makeCar('gold', q.x, q.y, q.ang, null, col); tuneSet(c, tuneClean(GOLD_LOOK)); c.searched = true; c.keep = true; cars.push(c);
  STAT.due = false; STAT.lostT = null; toast('THE ' + goldName() + ' IS PARKED BY THE KERB');
}

/* ---------- js/13: the gold car's glint - a flash of light runs over it every few seconds ---------- */
const _glint = new THREE.Color();
function gfxGold(time) {
  for (const c of cars) {
    if (c.type !== 'gold' || c.dead || !c.m || !c.m.body || !c.m.body.emissive) continue;
    const e = Math.pow(Math.max(0, Math.sin(time * 1.9 + c.x * 0.003)), 14);
    c.m.body.emissive.copy(_glint.set(c.color)).multiplyScalar(0.1 + 0.55 * e);
  }
}

/* ---------- saved games ---------- */
function statReset() {                    // js/15 resetGame
  Object.assign(STAT, { stolen: 0, foot: 0, drive: 0, top: 0, cops: 0, busted: 0, wasted: 0, crushed: 0, tuned: 0, resprays: 0, found: new Set(), won: new Set(), sprays: new Set(),
    gold: false, due: false, lostT: null, waitTold: false, t: 0, last: -1 });
}
const statSave = () => ({ stolen: STAT.stolen, foot: Math.round(STAT.foot), drive: Math.round(STAT.drive), top: Math.round(STAT.top), cops: STAT.cops, busted: STAT.busted, wasted: STAT.wasted,
  crushed: STAT.crushed, tuned: STAT.tuned, resprays: STAT.resprays, found: [...STAT.found], won: [...STAT.won], sprays: [...STAT.sprays], gold: STAT.gold });
function statLoad(d) {                    // js/15b applySave, before health is set (the reward raises its top)
  if (!d || typeof d !== 'object') return;
  const n = v => typeof v === 'number' && isFinite(v) && v > 0 ? Math.min(v, 1e12) : 0, ids = v => Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number') : [];
  for (const k of ['stolen', 'foot', 'drive', 'top', 'cops', 'busted', 'wasted', 'crushed', 'tuned', 'resprays']) STAT[k] = n(d[k]);
  STAT.found = new Set(ids(d.found)); STAT.won = new Set(ids(d.won)); STAT.sprays = new Set(ids(d.sprays).filter(i => PNS.some(G => G.i === i)));
  STAT.gold = !!d.gold; STAT.lostT = STAT.gold ? -1e9 : null;      // not back where it was kept: a new one at once
}
function statOld() { P.has.forEach((h, i) => { if (h && !WEAPONS[i].start) STAT.found.add(WEAPONS[i].id); }); }   // a save from before the stats: the weapons you have count as found

/* ---------- the STATS card ---------- */
const kmOf = u => (u / UNITS_PER_M / 1000).toFixed(1) + ' KM';
function playTime(s) { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? h + ' H ' + String(m).padStart(2, '0') + ' MIN' : m + ' MIN'; }
let statTab = 'pct';
function openStats() { paintStats(); showCard('statsCard'); }
function paintStats() {
  for (const b of document.querySelectorAll('#ssTabs button')) b.classList.toggle('on', b.dataset.t === statTab);
  for (const id of ['pct', 'num', 'rec']) $('ss_' + id).hidden = id !== statTab;
  const L = statList(), pct = statPct(L), box = $('ss_pct'); box.innerHTML = '';
  const big = document.createElement('div'); big.className = 'ssBig'; big.innerHTML = '<b></b><i><u></u></i>'; big.querySelector('b').textContent = pct + '%'; big.querySelector('u').style.width = pct + '%'; box.append(big);
  for (const g of L) {
    const r = document.createElement('div'); r.className = 'ssRow' + (g.got >= g.of ? ' done' : '');
    r.innerHTML = '<span></span><i><u></u></i><b></b>'; r.querySelector('span').textContent = g.name; r.querySelector('u').style.width = Math.round(g.got * 100 / g.of) + '%'; r.querySelector('b').textContent = g.got + ' / ' + g.of;
    box.append(r);
    if (g.left && g.got < g.of && g.of - g.got <= 6) { const p = document.createElement('p'); p.className = 'ssLeft'; p.textContent = 'TO GO: ' + g.left; box.append(p); }
  }
  if (!L.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'NOTHING COUNTS TOWARD 100% IN THIS MODE'; box.append(p); }
  const gp = document.createElement('p'); gp.className = 'sub ssGold' + (STAT.gold ? ' got' : '');
  gp.textContent = STAT.gold ? 'DONE: THE ' + goldName() + ' IS YOURS, HEALTH AND ARMOR UP TO ' + STS.topHealth + ' / ' + STS.topArmor
    : 'AT 100%: A ONE-OF-A-KIND GOLD CAR IN YOUR BEST GARAGE, HEALTH AND ARMOR UP TO ' + STS.topHealth + ' / ' + STS.topArmor; box.append(gp);
  const sp = (k, v) => { const a = document.createElement('span'), b = document.createElement('span'); a.textContent = k; b.textContent = v; return [a, b]; };
  const num = $('ss_num'); num.innerHTML = '';
  num.append(...[['TIME PLAYED', playTime(gameT)], ['CASH', money(P.score)], ['KILLS', P.kills], ['COPS KILLED', STAT.cops], ['CARS STOLEN', STAT.stolen],
    ['ON FOOT', kmOf(STAT.foot)], ['DRIVEN', kmOf(STAT.drive)], ['TOP SPEED', Math.round(STAT.top / KMH) + ' KM/H'], ['MOST WANTED', P.maxStars + (P.maxStars === 1 ? ' STAR' : ' STARS')],
    ['BUSTED', STAT.busted], ['WASTED', STAT.wasted], ['RACES WON', RACE.wins], ['RAMPAGES PASSED', rampDone.size], ['CARS DELIVERED', DLV.done], ['CARS CRUSHED', STAT.crushed],
    ['CARS TUNED', STAT.tuned], ['RESPRAYS', STAT.resprays], ['SAFEHOUSES', SAFES.filter(h => h.own).length]].flatMap(([k, v]) => sp(k, String(v))));
  const rec = $('ss_rec'); rec.innerHTML = '';
  const won = id => STAT.won.has(id) ? ' ✓' : '';
  const rows = ROUTES.map(R => [R.name + won(R.id), RACE.best[R.id] ? raceTime(RACE.best[R.id]) : '-']);
  if (SPW) rows.push(['PALM 200' + won('nascar'), RACE.nascar ? raceTime(RACE.nascar) : '-'], ['PALM 200 BEST LAP', RACE.lap ? raceTime(RACE.lap) : '-']);
  for (const S of SPW_STRIPS) rows.push([S.name + won('drag-' + S.id), RACE.drag[S.id] ? RACE.drag[S.id].toFixed(3) + ' S' : '-']);
  if (RACE.top) rows.push(['FASTEST ON A STRIP', Math.round(RACE.top) + ' KM/H']);
  for (const k in JOBK) if (jobOn(k)) rows.push([JOBK[k].name + ' BEST LEVEL', String(JOB.best[k] || 0)]);
  rec.append(...rows.flatMap(([k, v]) => sp(k, v)));
}
for (const b of document.querySelectorAll('#ssTabs button')) b.addEventListener('click', () => { statTab = b.dataset.t; paintStats(); });
$('pStatsBtn').addEventListener('click', openStats);
