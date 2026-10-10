'use strict';
/* ---------- 6c7. VEHICLE JOBS ----------
   Four jobs (js/01o), each in its own vehicle and started at its own dispatch point: TAXI at a taxi rank in a taxi, PARAMEDIC at a
   hospital in an ambulance, FIREFIGHTER at a fire station in a fire engine, VIGILANTE at a police station in a police car. The marker
   shows while you sit in the right vehicle; stop in it and the START card opens. Level 1 asks for one fare, patient, burning car or
   criminal car, each level after for more. Each one adds time to the clock (the road distance at the table's speed, plus a little) and
   pays when done; a finished level pays its bonus and the next begins. The job ends when the clock runs out, the vehicle is wrecked or
   you are out of it too long - police stars do not end it. The reward level, once per saved game: nitro in taxis, more health,
   fireproof, more body armor.
   TAXI: the rank sends you to a fare waiting at the kerb; stop by them and they get in and say where to; stop there to be paid by the
   distance, with a tip for the time left (each crash costs some of it). PARAMEDIC: the level's patients all lie about at once; stop by one
   to take them aboard, as many as the ambulance holds, then stop at any hospital's marker; a patient who dies ends the job, a crash
   with patients aboard costs time. FIREFIGHTER: cars burn about the city, a few at a time; spray each with the water cannon until it is
   out; when time runs out they blow up. VIGILANTE: criminals drive about like traffic until you come near, then flee through red lights,
   away from you; from a level on they shoot back. Wreck their car, or take them down once a badly damaged car makes them get out and run;
   too far away and they got away. Killing them is no crime.
   Also here: the taxi ranks (a sign and cabs waiting at the kerb), the fire stations (picked in js/04 genWorld, drawn by js/10e), the
   vehicles waiting at the stations (js/08 fillLots), the map icons, the markers, nitro. */
const JOBK = {
  taxi: { name: 'TAXI', feat: 'taxiJob', col: '#ffd23f', fits: t => t.job === 'taxi', at: 'A TAXI RANK', one: 'FARE', many: 'FARES', veh: 'TAXI' },
  medic: { name: 'PARAMEDIC', feat: 'medicJob', col: '#ff4d5e', fits: t => t.job === 'ambulance', at: 'A HOSPITAL', one: 'PATIENT', many: 'PATIENTS', veh: 'AMBULANCE' },
  fire: { name: 'FIREFIGHTER', feat: 'fireJob', col: '#ff8a2b', fits: t => t.job === 'fire', at: 'A FIRE STATION', one: 'FIRE', many: 'FIRES', veh: 'FIRE ENGINE' },
  vigilante: { name: 'VIGILANTE', feat: 'vigilanteJob', col: '#4d8dff', fits: t => t.body === 'police', at: 'A POLICE STATION', one: 'CRIMINAL CAR', many: 'CRIMINAL CARS', veh: 'POLICE CAR' } };
const JOB = { on: null, car: null, level: 0, need: 0, got: 0, t: 0, outT: 0, cash: 0, tg: [], st: null, aboard: 0, hospRun: false, hp: 0, crashCd: 0, beep: 0,
  best: {}, rew: new Set(), newRew: false, mark: null, shown: false, at: null, lastCar: null, toldT: {}, nitroCd: 0 };
const JOB_MR = 46, JOB_TR = 64, FIRE_RED = '#c8232f';
let RANKS = [], DISPATCH = [], jobGroup = null;
const jobKind = c => { if (!c) return null; for (const k in JOBK) if (JOBK[k].fits(c.t)) return k; return null; };
const jobOn = k => feat(JOBK[k].feat);
const typeOf = f => Object.keys(CAR_TYPES).find(id => f(CAR_TYPES[id])) || null;
const jobCount = L => JB.firstCount + (L - 1) * JB.moreCount;
const hpMax = () => 100 + (JOB.rew.has('medic') && jobOn('medic') ? JB.medHealth : 0);                   // the paramedic's reward
const armorMax = () => (ITEM.armor ? ITEM.armor.max : 100) + (JOB.rew.has('vigilante') && jobOn('vigilante') ? JB.vigArmor : 0);   // the vigilante's
const blastHurt = () => JOB.rew.has('fire') && jobOn('fire') ? JB.fireproof : 1;                       // the firefighter's: fireproof
const stationCar = c => JB.stationFree && jobOn('vigilante') && !!c.lot && !!c.lot.owner && c.lot.owner.special === 'police'   // js/06 enterCar: taking it is no crime
  && dist(c.x, c.y, c.lot.cx, c.lot.cy) < Math.hypot(c.lot.w, c.lot.d) / 2;
const rewardText = k => ({ taxi: 'NITRO IN TAXIS', medic: '+' + JB.medHealth + ' MAX HEALTH', fire: 'FIREPROOF', vigilante: '+' + JB.vigArmor + ' MAX BODY ARMOR' })[k];

/* ---------- road distances: one field from a point, then the distance to anywhere by road ---------- */
function fieldFrom(x, y) { const f = new Float64Array(RN.length); return roadFieldTo(x, y, f) ? f : null; }
function roadDist(F, x, y) {
  if (!F) return Infinity; const r = nearestRoad(x, y, 400); if (!r) return Infinity;
  const E = RE[r.e]; return Math.min(F[E.a] + r.s, F[E.b] + E.len - r.s) + r.d;
}
function kerbBy(px, py) {                 // the parking lane of the street next to (px, py), on that side
  const r = nearestRoad(px, py, 400); if (!r) return { x: px, y: py, ang: 0 };
  const d = Math.hypot(px - r.x, py - r.y) || 1, t = edgeAt(r.e, r.s, {});
  return { x: r.x + (px - r.x) / d * PARK_OFF, y: r.y + (py - r.y) / d * PARK_OFF, ang: Math.atan2(t.ty, t.tx) };
}
function lotSpot(L, x) { const z = L.rows === 2 ? 0 : 36, ca = Math.cos(L.a), sa = Math.sin(L.a); return { x: L.cx + ca * x - sa * z, y: L.cy + sa * x + ca * z, ang: L.a }; }   // in a lot's aisle
function sideSpot(minD, maxD, F, lo, hi, avoid) {   // a sidewalk point between lo and hi by road (F: the field from where you are)
  let best = null, bd = Infinity;
  for (let tr = 0; tr < 36; tr++) {
    const w = sidewalkSpot(minD, maxD, 4); if (!w || RE[w.e].nt || inLandmark(w.x, w.y) || shoreDist(w.x, w.y) < 30 || (avoid && avoid(w))) continue;
    const dn = districtAt(w.x, w.y); if (!dn || dn === 'OPEN WATER') continue;                       // not on a bridge or a pier
    const d = roadDist(F, w.x, w.y); if (!isFinite(d)) continue;
    if (d >= lo && d <= hi) return { w, d };
    const off = d < lo ? lo - d : d - hi; if (off < bd) { bd = off; best = { w, d }; }
  }
  return best;
}

/* ---------- the fire stations: street-front buildings with a yard of their own, well spread (js/04 genWorld, before the city is drawn) ---------- */
function pickFireStations() {
  SVC.fire = [];
  const svc = [...SVC.police, ...SVC.hospital].map(s => s.r), cand = [];
  for (const L of LOTS) {
    const r = L.owner; if (!r || r.special || !r.fill || r.lw < 40 || L.w < 120 || inLandmark(r.cx, r.cy) || shoreDist(L.cx, L.cy) < 40) continue;
    if (svc.some(b => dist(b.cx, b.cy, r.cx, r.cy) < 600) || cand.some(c => c.r === r)) continue;
    cand.push({ r, L, face: r.ca >= -0.3 });                         // face: the bay doors toward the camera
  }
  if (cand.some(c => c.face)) cand.splice(0, cand.length, ...cand.filter(c => c.face));
  if (!cand.length) return;
  let first = cand[0]; for (const c of cand) if (dist(c.r.cx, c.r.cy, MAP.start[0], MAP.start[1]) < dist(first.r.cx, first.r.cy, MAP.start[0], MAP.start[1])) first = c;
  const chosen = [first];
  while (chosen.length < JB.stations) {
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.r.cx, o.r.cy, c.r.cx, c.r.cy))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 800) break; chosen.push(best);
  }
  for (const { r, L } of chosen) {                                  // red, two floors, bay doors instead of a shopfront (js/10c, js/10e)
    r.special = 'fire'; r.shop = false; r.kind = 'office'; r.pastel = false; r.c = FIRE_RED; r.H = GFH + FLOOR;
    SVC.fire.push({ r, lot: L });
  }
}

/* ---------- the taxi ranks: always the same long streets, well spread; a sign, yellow kerb paint, cabs waiting ---------- */
function pickRanks() {
  const cand = [], svc = [...SVC.police, ...SVC.hospital, ...(SVC.fire || [])].map(s => s.r), keep = ROAD_HALF + SW_W + 70;
  const taxi = typeOf(t => t.job === 'taxi'); if (!taxi) return [];
  for (const E of RE) {
    if (E.nt || E.len < 2 * keep + 240) continue;
    for (const fw of [1, -1]) {
      const s0 = E.len / 2 - 80, pts = [0, 75, 150].map(ds => lanePoint(E.i, fw, s0 + ds, PARK_OFF, {}));
      if (pts.some(q => shoreDist(q.x, q.y) < 70 || inLandmark(q.x, q.y))) continue;
      if (pts.slice(1).some(q => !kerbFits(q.x, q.y, Math.atan2(q.ty, q.tx), taxi))) continue;
      if (svc.some(b => dist(b.cx, b.cy, pts[0].x, pts[0].y) < 300)) continue;
      const sg = lanePoint(E.i, fw, s0 + 110, SIDEWALK + 4, {}); if (pedBlocked(sg.x, sg.y)) continue;
      cand.push({ e: E.i, fw, x: pts[0].x, y: pts[0].y, ang: Math.atan2(pts[0].ty, pts[0].tx), cabs: pts.slice(1).map(q => ({ x: q.x, y: q.y, ang: Math.atan2(q.ty, q.tx) })), sign: { x: sg.x, y: sg.y, ang: Math.atan2(sg.ty, sg.tx) },
        paint: [lanePoint(E.i, fw, s0 + 75, PARK_OFF + 10, {})], filled: false });
    }
  }
  if (!cand.length) return [];
  let first = null; for (const c of cand) { const d = dist(c.x, c.y, MAP.start[0], MAP.start[1]); if (d > 150 && (!first || d < dist(first.x, first.y, MAP.start[0], MAP.start[1]))) first = c; }
  const chosen = [first || cand[0]];
  while (chosen.length < JB.ranks) {
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.x, o.y, c.x, c.y))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 800) break; chosen.push(best);
  }
  return chosen;
}
const JOB_LOT = 230;                     // a yard at least this long holds the marker beside the vehicles waiting there; a shorter one, only the vehicle
function stationSpot(s) {                // the dispatch marker at a hospital, police or fire station: in its yard's aisle, else at the kerb in front
  if (s.lot && s.lot.w >= JOB_LOT) return lotSpot(s.lot, s.lot.w / 4);
  const r = s.r, zx = -r.sa, zy = r.ca; return kerbBy(r.cx + zx * (r.lh / 2 + 30), r.cy + zy * (r.lh / 2 + 30));
}
function placeJobs() {                   // a new game (js/15): the first one finds the ranks and builds the markers; they stay for every game after
  JOB.on = null; JOB.mark = null; JOB.shown = false; JOB.lastCar = null; JOB.tg = []; JOB.st = null; $('jobHud').hidden = true; $('bNitro').hidden = true;
  for (const R of RANKS) R.filled = false;
  if (jobGroup) return;
  RANKS = pickRanks(); DISPATCH = [];
  for (const R of RANKS) DISPATCH.push({ kind: 'taxi', x: R.x, y: R.y, ang: R.ang, rank: R });
  for (const [k, list] of [['medic', SVC.hospital], ['vigilante', SVC.police], ['fire', SVC.fire || []]]) for (const s of list) { const p = stationSpot(s); DISPATCH.push({ kind: k, x: p.x, y: p.y, ang: p.ang, svc: s }); }
  jobGroup = new THREE.Group(); scene.add(jobGroup);
  for (const d of DISPATCH) {
    const col = JOBK[d.kind].col, g = new THREE.Group(); g.position.set(d.x, groundH(d.x, d.y), d.y);
    const pad = new THREE.Mesh(RAMP_PAD, rampMat(col, 0.2)); pad.scale.setScalar(JOB_MR); pad.position.y = 1.4;
    const ring = new THREE.Mesh(RAMP_RING, rampMat(col, 0.9)); ring.scale.setScalar(JOB_MR); ring.position.y = 1.6;
    const beam = new THREE.Mesh(GCyl, rampMat(col, 0.12)); beam.scale.set(18, 70, 18); beam.position.y = 35;
    const sign = signMesh(JOBK[d.kind].name + ' JOB', col, 110, 22); sign.position.set(0, 78, 0); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180);
    g.add(pad, ring, beam, sign); g.userData.ring = ring; g.visible = false; d.g = g; jobGroup.add(g);
  }
  for (const R of RANKS) {                                         // the rank: a pole with a lit TAXI sign, yellow paint along the kerb
    const g = new THREE.Group(); g.position.set(R.sign.x, groundH(R.sign.x, R.sign.y), R.sign.y);
    part(g, GB, mc(0x2b2e38), 1.4, 30, 1.4, 0, 15, 0);
    const box = part(g, GB, mBas(0xffd23f), 12, 6, 1.2, 0, 31, 0); box.rotation.y = -R.sign.ang;
    const sign = signMesh('TAXI', '#ffd23f', 40, 12); sign.position.set(0, 46, 0); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180); g.add(sign);   // turned to the camera
    const paint = new THREE.Group(), q = R.paint[0]; paint.position.set(q.x, groundH(q.x, q.y) + 0.9, q.y); paint.rotation.y = -Math.atan2(q.ty, q.tx);
    part(paint, GB, mBas(0xd8b52a), 230, 0.3, 1.6, 0, 0, 0);
    R.deco = [g, paint]; jobGroup.add(g, paint);
  }
}
function ranksTick() {                   // cabs wait at the ranks near you - put there while out of sight; one taken is back once you have been away
  if (!jobOn('taxi')) return;
  const taxi = typeOf(t => t.job === 'taxi'); if (!taxi) return;
  for (const R of RANKS) {
    const d = dist(R.x, R.y, P.x, P.y);
    if (R.filled) { if (d > 2400) R.filled = false; continue; }
    if (d > 1500 || d < offDist() + 160) continue;
    R.filled = true;
    for (const q of R.cabs.slice(0, JB.rankCabs)) if (!cars.some(c => dist(c.x, c.y, q.x, q.y) < 40)) { const c = makeCar(taxi, q.x, q.y, q.ang, null); c.lot = R; cars.push(c); }
  }
}
function jobLotCars(L) {                 // js/08 fillLots: a fire station's yard holds its engine(s), a hospital's an ambulance - in the aisle, clear of the marker
  const k = L.owner && L.owner.special, job = k === 'fire' ? 'fire' : k === 'hospital' ? 'medic' : null;
  if (!job || !jobOn(job) || L.w < 110) return;
  const type = typeOf(t => t.job === (job === 'fire' ? 'fire' : 'ambulance')); if (!type) return;
  const n = job === 'fire' ? (L.w >= 300 ? JB.engines : Math.min(1, JB.engines)) : 1;
  for (let i = 0; i < n; i++) { const p = lotSpot(L, (L.w >= JOB_LOT ? -L.w / 4 : 0) - i * 115); if (cars.some(c => !c.dead && dist(c.x, c.y, p.x, p.y) < 45)) continue; const c = makeCar(type, p.x, p.y, p.ang, null); c.lot = L; cars.push(c); }   // the stalls are clear of the aisle
}

/* ---------- the START card ---------- */
function jobMarkTick() {                 // in the right vehicle, stopped in its marker: the card (once per stop - drive out and in again for it)
  const c = P.car, k = c && !c.dead ? jobKind(c) : null;
  if (c !== JOB.lastCar) {                                        // getting into a job vehicle: where its job starts (not too often)
    JOB.lastCar = c;
    if (k && jobOn(k) && !(gameT < (JOB.toldT[k] || 0))) { JOB.toldT[k] = gameT + 90; toast(JOBK[k].veh + ': DRIVE TO ' + JOBK[k].at + ' FOR THE ' + JOBK[k].name + ' JOB'); }
  }
  if (state !== 'play') return;                                   // the card is up: keep which marker you are in
  if (!k || !jobOn(k)) { JOB.mark = null; return; }
  let m = null; for (const d of DISPATCH) if (d.kind === k && Math.abs(d.x - c.x) < JOB_MR && Math.abs(d.y - c.y) < JOB_MR && dist(d.x, d.y, c.x, c.y) < JOB_MR) m = d;
  if (m !== JOB.mark) { JOB.mark = m; JOB.shown = false; }
  if (m && !JOB.shown && carSpeed(c) < JB.stopSpeed) { JOB.shown = true; openJob(k); }
}
const JOB_RULES = {
  taxi: 'The rank sends you to a fare waiting at the kerb. Stop by them, then take them where they want to go before the time runs out. Fast trips tip more; crashes cost the tip.',
  medic: () => 'Patients lie about the city. Stop by them to take them aboard, up to ' + JB.medCarry + ' at a time, and bring them to any hospital. A crash with patients aboard costs time; a patient who dies ends the job.',
  fire: 'Cars are burning about the city. Get there and spray them with the water cannon (FIRE) until they are out. When the time runs out they blow up.',
  vigilante: () => 'Criminals are out in cars and flee when you come close. Wreck their car, or take them down when they get out and run. From level ' + JB.vigShootFrom + ' they shoot back. Killing them is no crime.' };
function openJob(k) {
  JOB.at = k; state = 'job'; toggleBigMap(false); toggleWheel(false); hush();
  const K = JOBK[k], best = JOB.best[k] || 0, rew = JOB.rew.has(k), rules = typeof JOB_RULES[k] === 'function' ? JOB_RULES[k]() : JOB_RULES[k];
  $('jobCard').style.setProperty('--jc', K.col);
  $('jobName').textContent = K.name; $('jobSub').textContent = best ? 'BEST: LEVEL ' + best + ' DONE' : 'NOT DONE YET';
  $('jobGoal').textContent = 'LEVEL 1: ' + jobCount(1) + ' ' + (jobCount(1) === 1 ? K.one : K.many);
  $('jobReward').textContent = rew ? 'GOT IT: ' + rewardText(k) : 'AT LEVEL ' + JB.rewardLevel + ': ' + rewardText(k);
  $('jobBonus').textContent = money(JB.levelPay) + ' × THE LEVEL';
  $('jobRules').textContent = rules + ' Each level asks for more. The job ends when the time runs out, the ' + K.veh.toLowerCase() + ' is wrecked or you are out of it for ' + JB.outMax + ' s.';
  showCard('jobCard', true);
}
function closeJob() { if (state !== 'job') return; state = 'play'; JOB.at = null; closeMenus(); }
function openJobStop() {                 // a tap on the job's panel: stop it?
  if (!JOB.on || state !== 'play') return;
  const K = JOBK[JOB.on]; state = 'job'; toggleBigMap(false); toggleWheel(false); hush();
  $('jobStopCard').style.setProperty('--jc', K.col); $('jsName').textContent = 'STOP THE ' + K.name + ' JOB?';
  $('jsSub').textContent = 'LEVEL ' + JOB.level + '  ·  ' + JOB.got + ' / ' + JOB.need + '  ·  ' + money(JOB.cash) + ' EARNED';
  showCard('jobStopCard', true);
}
$('jobHud').addEventListener('click', e => { e.stopPropagation(); openJobStop(); });
$('jsStop').addEventListener('click', () => { closeJob(); jobEnd('YOU STOPPED IT'); });
$('jobGo').addEventListener('click', () => { const k = JOB.at; closeJob(); if (k && P.car && jobKind(P.car) === k && !JOB.on) jobStart(k); });

/* ---------- running a job ---------- */
function addTime(s) { JOB.t += s; }
function jobStart(k) {
  Object.assign(JOB, { on: k, car: P.car, level: 0, t: 0, outT: 0, cash: 0, tg: [], st: null, aboard: 0, hospRun: false, hp: P.car.hp, crashCd: 0, beep: 6, newRew: false });
  $('jobHud').hidden = false; $('jobHud').style.setProperty('--jc', JOBK[k].col); $('jobHudName').textContent = JOBK[k].name; H.jobL = H.jobN = H.jobT = null;
  Snd.tone(330, 990, 0.3, 0.15, 'square'); nextLevel();
}
function nextLevel() {
  const k = JOB.on, K = JOBK[k]; JOB.level++; JOB.need = jobCount(JOB.level); JOB.got = 0;
  toast(K.name + ' LEVEL ' + JOB.level + ': ' + JOB.need + ' ' + (JOB.need === 1 ? K.one : K.many));
  if (k === 'taxi') { if (!JOB.st || JOB.st.phase === 'none') newCall(); }
  else if (k === 'medic') spawnPatients(JOB.need);
  else if (k === 'fire') fillFires();
  else fillCrims();
}
function jobPay(n, x, y, label) { n = Math.round(n); if (n <= 0) return; P.score += n; JOB.cash += n; popup(x, y - 18, '+' + money(n) + (label ? ' ' + label : ''), '#3dffa6'); }
function jobDone(x, y, pay, label) {      // one fare, patient, fire or criminal car done
  JOB.got++; jobPay(pay, x, y, label); Snd.tone(660, 990, 0.12, 0.12, 'square');
  $('jobHud').classList.remove('bump'); void $('jobHud').offsetWidth; $('jobHud').classList.add('bump');
  if (JOB.got < JOB.need) return;
  const k = JOB.on, L = JOB.level;                                  // the level is done: its bonus, maybe the reward, the next level
  JOB.best[k] = Math.max(JOB.best[k] || 0, L); jobPay(JB.levelPay * L, P.x, P.y - 24, 'LEVEL ' + L);
  toast(JOBK[k].name + ' LEVEL ' + L + ' DONE! +' + money(JB.levelPay * L));
  if (L >= JB.rewardLevel && !JOB.rew.has(k)) grantReward(k);
  nextLevel();
}
function grantReward(k) {
  JOB.rew.add(k); JOB.newRew = true;
  if (k === 'medic') P.hp = hpMax(); else if (k === 'vigilante') P.armor = armorMax();
  setTimeout(() => toast('REWARD: ' + rewardText(k) + '!'), 1600); Snd.tone(523, 1047, 0.18, 0.15, 'square'); setTimeout(() => Snd.tone(784, 1568, 0.3, 0.15, 'square'), 160);
}
function jobEnd(why) {
  const k = JOB.on; if (!k) return;
  if (k === 'taxi') { const f = JOB.st && JOB.st.fare; if (f) { f.wait = 0; f.fare = false; f.keep = false; } }
  for (const o of JOB.tg) {
    if (k === 'medic') { o.patient = false; o.keep = false; o.stunT = 0.6; }                       // they get up and walk off
    else if (k === 'fire') { o.jobFire = false; o.keep = false; if (o.burn > 0) o.burn = rand(0.6, 2.6); }   // the fires were not put out: they blow
    else if (k === 'vigilante') { const K = o.crim; o.crim = null; o.keep = false; o.nx = null; for (const p of K.men) { p.crim = false; p.keep = false; } }
  }
  JOB.on = null; JOB.tg = []; JOB.st = null; JOB.aboard = 0; $('jobHud').hidden = true;
  toast(JOBK[k].name + ' JOB OVER' + (why ? ': ' + why : '') + '  ·  LEVEL ' + JOB.level + (JOB.cash ? '  ·  ' + money(JOB.cash) : ''), true);
  Snd.tone(330, 110, 0.6, 0.15, 'sawtooth');
  if (JOB.newRew && !saveBlock()) putSave('auto', makeSave(lastThumb));   // the reward is kept even if you close the game now
  JOB.newRew = false;
}
function jobCrash() {                     // a knock on the job vehicle
  const S = JOB.st, c = JOB.car;
  if (JOB.on === 'taxi' && S && S.phase === 'ride') { S.crash++; popup(c.x, c.y - 22, '-TIP', '#ff6b6b'); }
  else if (JOB.on === 'medic' && JOB.aboard > 0 && JB.medCrash > 0) { JOB.t -= JB.medCrash; popup(c.x, c.y - 22, '-' + JB.medCrash + ' s', '#ff6b6b'); }
}
function jobTick(dt) {                    // js/15, every frame of play
  ranksTick();
  if (!JOB.on) { jobMarkTick(); return; }
  const k = JOB.on, K = JOBK[k];
  if (!jobOn(k)) { jobEnd(); return; }
  if (P.dead || P.busted) { jobEnd(P.busted ? 'BUSTED' : 'WASTED'); return; }
  if (P.car && P.car !== JOB.car && K.fits(P.car.t) && !P.car.dead) { JOB.car = P.car; JOB.hp = P.car.hp; }   // another vehicle of the kind will do
  const c = JOB.car;
  if (!c || c.dead || c.hp <= 0 || c.sunk || !cars.includes(c)) { jobEnd('THE ' + K.veh + ' IS WRECKED'); return; }
  if (P.car !== c) { if ((JOB.outT += dt) > JB.outMax) { jobEnd('YOU LEFT THE ' + K.veh); return; } } else JOB.outT = 0;
  JOB.crashCd -= dt; if (c.hp < JOB.hp - 2 && JOB.crashCd <= 0) { JOB.crashCd = 0.7; jobCrash(); } JOB.hp = c.hp;
  JOB.t -= dt;
  if (JOB.t <= JOB.beep - 1 && JOB.t > 0) { JOB.beep = Math.ceil(JOB.t); Snd.tone(1200, 1200, 0.06, 0.1, 'square'); }
  else if (JOB.t > JOB.beep) JOB.beep = 6;
  if (JOB.t <= 0) { jobEnd('OUT OF TIME'); return; }
  if (k === 'taxi') taxiTick(dt, c); else if (k === 'medic') medicTick(dt, c); else if (k === 'fire') fireTick(dt, c); else vigTick(dt, c);
}
const jStopped = c => P.car === c && carSpeed(c) < JB.stopSpeed;
const jNear = (c, x, y, r) => Math.abs(c.x - x) < r + c.t.len / 2 && Math.abs(c.y - y) < r + c.t.len / 2 && dist(c.x, c.y, x, y) < r + c.t.len / 4;

/* taxi: a call, the pickup, the trip */
function newCall() {
  const c = JOB.car, F = fieldFrom(c.x, c.y), s = sideSpot(JB.taxiNear * 0.5, JB.taxiFar, F, JB.taxiNear, JB.taxiFar);
  if (!s) { jobEnd('NO CALLS HERE - TRY ANOTHER RANK'); return; }
  const p = makePed(s.w.x, s.w.y, s.w); p.arm = -1; p.wait = 1e9; p.fare = true; p.keep = true; peds.push(p);
  JOB.st = { phase: 'call', fare: p, crash: 0 }; addTime(s.d / JB.taxiSpeed + JB.taxiExtra);
  toast('CALL: A FARE IN ' + (districtAt(p.x, p.y) || 'TOWN'));
}
function taxiTick(dt, c) {
  const S = JOB.st; if (!S) return;
  if (S.phase === 'call') {
    const f = S.fare;
    if (!f || f.dead || !peds.includes(f)) { toast('THE FARE IS GONE - NEXT CALL', true); S.phase = 'none'; newCall(); return; }
    if (f.state === 'flee' && f.fl < 1) { f.state = 'walk'; f.wait = 1e9; }   // scared off for a moment: back to waiting
    if (jStopped(c) && jNear(c, f.x, f.y, 50)) {                    // they get in and say where to
      peds.splice(peds.indexOf(f), 1);
      const F = fieldFrom(c.x, c.y), s = sideSpot(JB.tripNear * 0.5, JB.tripFar, F, JB.tripNear, JB.tripFar);
      if (!s) { S.phase = 'none'; newCall(); return; }
      const m = kerbBy(s.w.x, s.w.y);
      Object.assign(S, { phase: 'ride', fare: null, dest: { x: m.x, y: m.y, w: s.w, where: districtAt(s.w.x, s.w.y) || 'TOWN' }, dist: s.d, leg: s.d / JB.taxiSpeed + JB.taxiExtra, legT: 0, crash: 0 });
      addTime(S.leg); toast('TO ' + S.dest.where); Snd.tone(880, 880, 0.08, 0.1, 'square');
    }
  } else if (S.phase === 'ride') {
    S.legT += dt;
    if (jStopped(c) && jNear(c, S.dest.x, S.dest.y, JOB_TR)) {      // there: the fare by distance, the tip for the time left
      const fare = JB.fareBase + JB.farePerKm * S.dist / (1000 * UNITS_PER_M), tip = fare * Math.max(0, JB.tipMax * Math.max(0, 1 - S.legT / S.leg) - S.crash * JB.crashTip);
      const w = S.dest.w, p = makePed(w.x, w.y, w); p.arm = -1; peds.push(p);   // out they get, on the sidewalk
      S.phase = 'none'; jobDone(c.x, c.y, fare + tip, tip >= 1 ? 'FARE + TIP' : 'FARE');
      if (JOB.on === 'taxi' && JOB.st && JOB.st.phase === 'none') newCall();
    }
  }
}

/* paramedic: the level's patients all at once; aboard, up to the ambulance's room; any hospital */
function spawnPatients(n) {
  const c = JOB.car, F = fieldFrom(c.x, c.y); let made = 0;
  for (let k = 0; k < n; k++) {
    const s = sideSpot(JB.medNear * 0.5, JB.medFar, F, JB.medNear, JB.medFar, w => JOB.tg.some(q => dist(q.x, q.y, w.x, w.y) < 220)); if (!s) continue;
    const p = makePed(s.w.x, s.w.y, s.w); p.arm = -1; p.patient = true; p.stunT = 1e9; p.keep = true; p.umb = false; peds.push(p); JOB.tg.push(p); made++;
    addTime(s.d / JB.medSpeed + JB.medExtra);
  }
  if (!made) { jobEnd('NOBODY TO PICK UP HERE'); return; }
  JOB.need = JOB.got + made + JOB.aboard;
}
function nearestHospital(c) {
  let best = null, bd = Infinity; const F = fieldFrom(c.x, c.y);
  for (const d of DISPATCH) if (d.kind === 'medic') { const r = roadDist(F, d.x, d.y); if (r < bd) { bd = r; best = d; } }
  return best ? { d: best, dist: bd } : null;
}
function medicTick(dt, c) {
  for (const p of JOB.tg) if (p.dead || !peds.includes(p)) { jobEnd('A PATIENT DIED'); return; }
  if (JOB.aboard < JB.medCarry && jStopped(c)) for (const p of JOB.tg.slice()) {
    if (JOB.aboard >= JB.medCarry || !jNear(c, p.x, p.y, 55)) continue;
    peds.splice(peds.indexOf(p), 1); JOB.tg.splice(JOB.tg.indexOf(p), 1); JOB.aboard++; popup(c.x, c.y - 22, 'PATIENT ABOARD', '#ff8a96'); Snd.tone(880, 880, 0.08, 0.1, 'square');
  }
  if (JOB.aboard > 0 && !JOB.hospRun && (JOB.aboard >= JB.medCarry || !JOB.tg.length)) {   // full, or nobody left out there: time for the hospital run
    JOB.hospRun = true; const h = nearestHospital(c); if (h && isFinite(h.dist)) addTime(h.dist / JB.medSpeed + JB.medExtra); toast('TO A HOSPITAL!');
  }
  if (JOB.aboard > 0 && jStopped(c) && DISPATCH.some(d => d.kind === 'medic' && jNear(c, d.x, d.y, JOB_TR))) {   // at a hospital: in they go
    const n = JOB.aboard; JOB.aboard = 0; JOB.hospRun = false;
    for (let i = 0; i < n && JOB.on === 'medic'; i++) jobDone(c.x, c.y - i * 16, JB.medPay + JB.medPayLevel * JOB.level, 'PATIENT');
  }
}

/* firefighter: cars set burning about the city, a few at a time; the water cannon puts each out (js/08c waterCannon: JB.fireSpray of spraying) */
function spawnFire() {
  const c = JOB.car, F = fieldFrom(c.x, c.y), lo = JB.fireNear, hi = JB.fireFar;
  let pick = null, pd = 0;
  for (const o of cars) {                                           // a parked car will do
    if (o.driver || o.dead || o.keep || o.hook || o.lot || o === P.car || o.t.job || o.t.cop || o.burn > 0 || JOB.tg.includes(o)) continue;
    const s = dist(o.x, o.y, c.x, c.y); if (s < lo * 0.5 || s > hi) continue;
    const d = roadDist(F, o.x, o.y); if (d >= lo && d <= hi && !JOB.tg.some(q => dist(q.x, q.y, o.x, o.y) < 220)) { pick = o; pd = d; break; }
  }
  for (let tr = 0; tr < 24 && !pick; tr++) {                        // or one put at the kerb
    const type = pickType('parked', t => t.wid <= KERB_W && !t.cop && !t.job); if (!type) break;
    const s = laneSpot(lo * 0.5, hi, type); if (!s) continue;
    const d = roadDist(F, s.x, s.y); if (d < lo || d > hi * 1.2 || JOB.tg.some(q => dist(q.x, q.y, s.x, s.y) < 220)) continue;
    pick = makeCar(type, s.x, s.y, s.ang, null); cars.push(pick); pd = d;
  }
  if (!pick) return false;
  Object.assign(pick, { jobFire: true, keep: true, hp: 0, burn: 1e6, wetT: 0, driver: null, doused: false }); JOB.tg.push(pick);
  addTime(pd / JB.fireSpeed + JB.fireExtra); return true;
}
function fillFires() {
  const want = Math.min(JB.fireAtOnce, JOB.need - JOB.got) - JOB.tg.length;
  for (let k = 0; k < want; k++) if (!spawnFire()) { if (!JOB.tg.length) jobEnd('NOTHING TO PUT OUT HERE'); return; }
}
function fireTick(dt, c) {
  for (const o of JOB.tg.slice()) {
    if (o.burn > 0 && cars.includes(o)) continue;
    JOB.tg.splice(JOB.tg.indexOf(o), 1); o.jobFire = false; o.keep = false;
    if (o.doused) jobDone(o.x, o.y, JB.firePay + JB.firePayLevel * JOB.level, 'FIRE OUT'); else { jobEnd('A CAR BLEW UP'); return; }
  }
  if (JOB.on === 'fire') fillFires();
}

/* vigilante: criminals in cars - like traffic until you come near, then fleeing; out and running once their car is badly hit */
function fleeEdge(c) {                    // js/07 aiDrive: at a junction take the street that leads furthest from you
  const E = RE[c.e], node = c.fw > 0 ? E.b : E.a; let best = null, bs = -Infinity;
  for (const ei of RN[node].e) {
    if (ei === c.e || RE[ei].nt) continue;
    const F = RE[ei], far = RN[F.a === node ? F.b : F.a], sc = dist(far.x, far.y, P.x, P.y) + rand(0, 500);
    if (sc > bs) { bs = sc; best = { e: ei, fw: F.a === node ? 1 : -1 }; }
  }
  return best || { e: c.e, fw: -c.fw };
}
function spawnCrim() {
  const c = JOB.car, F = fieldFrom(c.x, c.y);
  for (let tr = 0; tr < 30; tr++) {
    const type = pickType('traffic', t => !t.cop && !t.job && !t.weapon && !t.armored && !['bike', 'bus', 'truck', 'limo'].includes(t.body)); if (!type) return false;
    const s = laneSpot(JB.vigNear * 0.5, JB.vigFar, null, type); if (!s) continue;
    const d = roadDist(F, s.x, s.y); if (d < JB.vigNear || d > JB.vigFar * 1.2) continue;
    const o = makeCar(type, s.x, s.y, s.ang, 'ai'); o.e = s.e; o.fw = s.fw; o.s = s.s; o.vx = Math.cos(o.ang) * 40 * KMH; o.vy = Math.sin(o.ang) * 40 * KMH;
    o.crim = { shoot: JOB.level >= JB.vigShootFrom, flee: false, out: false, men: [], cool: 1, stuck: 0 }; o.keep = true; o.radio = -1;
    cars.push(o); JOB.tg.push(o); addTime(d / JB.vigSpeed + JB.vigExtra); return true;
  }
  return false;
}
function fillCrims() {
  const want = Math.min(JOB.level >= JB.vigTwoFrom ? 2 : 1, JOB.need - JOB.got) - JOB.tg.length;
  for (let k = 0; k < want; k++) if (!spawnCrim()) { if (!JOB.tg.length) jobEnd('NO CRIMINALS AROUND HERE'); return; }
}
const PISTOL_I = () => WEAPONS.findIndex(w => w.id === 'pistol');
function bail(o) {                        // the car is done for: everyone out and running (armed from the shooting level on: they fight)
  const K = o.crim; K.out = true; o.driver = null; o.thr = 0; o.str = 0;
  const ux = -Math.sin(o.ang), uy = Math.cos(o.ang);
  for (let i = 0; i < JB.vigCrew; i++) {
    const s = i % 2 ? 1 : -1; let x = o.x + ux * s * (o.t.wid / 2 + 12) + Math.cos(o.ang) * (i > 1 ? -20 : 0), y = o.y + uy * s * (o.t.wid / 2 + 12) + Math.sin(o.ang) * (i > 1 ? -20 : 0);
    if (pedBlocked(x, y)) { x = o.x + ux * -s * (o.t.wid / 2 + 12); y = o.y + uy * -s * (o.t.wid / 2 + 12); }
    const p = makePed(x, y); p.crim = true; p.keep = true; p.hp = 40; p.umb = false; p.arm = K.shoot ? Math.max(0, PISTOL_I()) : -1; p.shirt = '#2a2d3a';
    if (K.shoot) provoke(p); else { p.state = 'flee'; p.fl = 3; p.fx = p.x - P.x; p.fy = p.y - P.y; }
    peds.push(p); K.men.push(p);
  }
  popup(o.x, o.y - 22, 'THEY RUN!', JOBK.vigilante.col);
}
function crimShoot(o, dt) {               // from the car, at you, like a cop would (js/08g)
  const K = o.crim; if ((K.cool -= dt) > 0) return;
  const tgt = P.car || P, d = dist(o.x, o.y, tgt.x, tgt.y);
  if (d > COP.fireRange || !losClear(o.x, o.y, tgt.x, tgt.y, true)) return;
  K.cool = rand(0.9, 1.6); const a = Math.atan2(tgt.y - o.y, tgt.x - o.x);
  tracers.push({ x1: o.x + Math.cos(a) * 16, y1: o.y + Math.sin(a) * 16, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: 0.07 });
  Snd.tone(900, 200, 0.05, 0.06, 'square'); alertPeds(o.x, o.y, 200, true);
  if (Math.random() < lerp(COP.accNear, COP.accFar, clamp(d / COP.fireRange, 0, 1)) * 0.8) { if (P.car) damageCar(P.car, COP.dmgCar, false); else damagePlayer(COP.dmgFoot); }
}
function vigTick(dt, c) {
  for (const o of JOB.tg.slice()) {
    const K = o.crim;
    if (!K.out) {
      if (o.dead || o.hp <= 0 || o.sunk || !cars.includes(o)) { JOB.tg.splice(JOB.tg.indexOf(o), 1); o.crim = null; o.keep = false; jobDone(o.x, o.y, JB.vigPay + JB.vigPayLevel * JOB.level, 'CRIMINALS DOWN'); if (JOB.on !== 'vigilante') return; continue; }
      const d = dist(o.x, o.y, P.x, P.y);
      if (!K.flee && (d < JB.vigSee || o.hp < o.maxhp)) { K.flee = true; o.nx = null; popup(o.x, o.y - 22, 'THEY FLEE!', JOBK.vigilante.col); }
      if (K.flee && d > JB.vigEscape) { jobEnd('THE CRIMINALS GOT AWAY'); return; }
      K.stuck = K.flee && carSpeed(o) < 10 * KMH ? K.stuck + dt : 0;
      if (o.hp < o.maxhp * JB.vigBail || K.stuck > 4) bail(o);
      else if (K.shoot && K.flee) crimShoot(o, dt);
    } else {
      let alive = 0;
      for (const p of K.men) {
        if (p.dead) continue; alive++;
        if (!peds.includes(p) || dist(p.x, p.y, P.x, P.y) > JB.vigEscape) { jobEnd('A CRIMINAL GOT AWAY'); return; }
        if (p.arm >= 0) { if (!p.hostile && dist(p.x, p.y, P.x, P.y) < 600) provoke(p); }
        else if (!(p.stunT > 0)) { p.state = 'flee'; p.fl = 3; p.fx = p.x - P.x; p.fy = p.y - P.y; }
      }
      if (!alive) { JOB.tg.splice(JOB.tg.indexOf(o), 1); o.crim = null; o.keep = false; jobDone(o.x, o.y, JB.vigPay + JB.vigPayLevel * JOB.level, 'CRIMINALS DOWN'); if (JOB.on !== 'vigilante') return; }
    }
  }
  if (JOB.on === 'vigilante') fillCrims();
}

/* ---------- nitro: the taxi job's reward ---------- */
const nitroHere = c => !!c && c.t.job === 'taxi' && JOB.rew.has('taxi') && jobOn('taxi');
function jobNitro(c, dt) {                // js/06 updatePlayer, in a car: Shift or N (the NITRO button on a touch screen)
  c.nitroT = Math.max(0, (c.nitroT || 0) - dt); JOB.nitroCd = Math.max(0, JOB.nitroCd - dt);
  if (!nitroHere(c)) return;
  if ((keys.ShiftLeft || keys.ShiftRight || keys.KeyN || TS.nitro) && JOB.nitroCd <= 0) {
    c.nitroT = JB.nitroLasts; JOB.nitroCd = JB.nitroLasts + JB.nitroBack; Snd.burst(0.5, 600, 200, 0.2, 'lowpass'); cam.shake = Math.max(cam.shake, 3);
  }
  if (c.nitroT > 0) { const ca = Math.cos(c.ang), sa = Math.sin(c.ang), bx = c.x - ca * (c.t.len / 2 + 4), by = c.y - sa * (c.t.len / 2 + 4);
    addP({ x: bx, y: by, z: 6, vz: 0, grav: 0, vx: -ca * 160 + c.vx * 0.6, vy: -sa * 160 + c.vy * 0.6, life: 0.22, max: 0.22, s0: 4, s1: 1, col: pick(['#7fd8ff', '#ffffff', '#ffb02e']), drag: 3, alpha: 0.95 }); }
}
bindBtn($('bNitro'), () => { TS.nitro = true; }, () => { TS.nitro = false; });

/* ---------- HUD, maps, markers ---------- */
function jobHudUpdate() {                 // js/14: the level, the count and the clock at the top
  if (!JOB.on) return;
  const L = 'LEVEL ' + JOB.level, n = JOB.got + ' / ' + JOB.need, t = rampTimeText(JOB.t);
  if (H.jobL !== L) { H.jobL = L; $('jobLevel').textContent = L; }
  if (H.jobN !== n) { H.jobN = n; $('jobCount').textContent = n; }
  if (H.jobT !== t) { H.jobT = t; $('jobClock').textContent = t; $('jobHud').classList.toggle('late', JOB.t <= 10); }
}
function jobHint() {                      // js/14: what to do now
  const c = P.car;
  if (!JOB.on) {
    if (c && JOB.mark && JOB.shown && carSpeed(c) < JB.stopSpeed) return 'DRIVE OUT AND STOP IN THE MARKER AGAIN FOR THE JOB';
    if (c && nitroHere(c) && JOB.nitroCd <= 0 && !touchMode) return 'SHIFT OR N: NITRO';
    return '';
  }
  const K = JOBK[JOB.on];
  if (P.car !== JOB.car) return 'BACK IN THE ' + K.veh + '! ' + Math.max(0, Math.ceil(JB.outMax - JOB.outT));
  if (JOB.on === 'taxi') { const S = JOB.st; return !S ? '' : S.phase === 'call' ? 'PICK UP THE FARE - STOP BY THEM' : S.phase === 'ride' ? 'TAKE THE FARE TO ' + S.dest.where + ' - STOP AT THE MARKER' : ''; }
  if (JOB.on === 'medic') return JOB.aboard >= JB.medCarry || (JOB.aboard && !JOB.tg.length) ? 'TO A HOSPITAL - ' + JOB.aboard + ' ABOARD' : 'PICK UP THE PATIENTS - ' + JOB.aboard + ' ABOARD' + (JOB.aboard ? ', OR DROP THEM AT A HOSPITAL' : '');
  if (JOB.on === 'fire') return 'PUT OUT THE BURNING CARS - ' + (touchMode ? 'FIRE' : 'CLICK OR J') + ': WATER CANNON';
  return JOB.tg.some(o => o.crim && o.crim.out) ? 'TAKE DOWN THE CRIMINALS ON FOOT' : 'CHASE DOWN THE CRIMINAL CAR' + (JOB.tg.length > 1 ? 'S' : '');
}
function jobTargets() {                   // where to go now: { x, y, col, car }
  const out = [], k = JOB.on; if (!k) return out;
  const col = JOBK[k].col;
  if (k === 'taxi') { const S = JOB.st; if (S && S.phase === 'call' && S.fare) out.push({ x: S.fare.x, y: S.fare.y, col }); else if (S && S.phase === 'ride') out.push({ x: S.dest.x, y: S.dest.y, col, ring: true }); }
  else if (k === 'medic') {
    if (JOB.aboard < JB.medCarry) for (const p of JOB.tg) out.push({ x: p.x, y: p.y, col });
    if (JOB.aboard > 0) for (const d of DISPATCH) if (d.kind === 'medic') out.push({ x: d.x, y: d.y, col: '#ffffff', ring: true });
  }
  else if (k === 'fire') for (const o of JOB.tg) out.push({ x: o.x, y: o.y, col, car: o });
  else for (const o of JOB.tg) { const K = o.crim; if (!K) continue; if (!K.out) out.push({ x: o.x, y: o.y, col, car: o }); else for (const p of K.men) if (!p.dead) out.push({ x: p.x, y: p.y, col }); }
  return out;
}
function jobBlips(g, X, Y, size, q, ph) {      // the minimap (size: its width, an arrow at the edge for what is off it) or the city map (size 0)
  for (const t of jobTargets()) {
    let x = X(t.x), y = Y(t.y);
    if (size) {
      const m = 8, cx = size / 2, inside = x > m && y > m && x < size - m && y < size - m;
      if (!inside) {
        const a = Math.atan2(y - cx, x - cx), k = (cx - m) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
        x = cx + Math.cos(a) * k; y = cx + Math.sin(a) * k;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = t.col; g.strokeStyle = '#000'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(q * 1.3, 0); g.lineTo(-q * 0.8, -q); g.lineTo(-q * 0.8, q); g.closePath(); g.stroke(); g.fill(); g.restore(); continue;
      }
    }
    g.beginPath(); g.arc(x, y, q * (ph ? 1.1 : 0.85), 0, TAU); g.fillStyle = t.col; g.fill(); g.lineWidth = Math.max(1.5, q * 0.3); g.strokeStyle = '#000'; g.stroke();
  }
}
function jobIcons(g, X, Y, q, inView) {   // js/14 svcIcons: the taxi ranks (a yellow cab sign) and the fire stations (a flame on red)
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (jobOn('taxi')) for (const R of RANKS) { const x = X(R.x), y = Y(R.y); if (!inView(x, y)) continue;
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q * 0.75 - 1, 2 * q + 2, 1.5 * q + 2); g.fillStyle = '#ffd23f'; g.fillRect(x - q, y - q * 0.75, 2 * q, 1.5 * q);
    g.fillStyle = '#14161d'; for (let i = 0; i < 4; i++) g.fillRect(x - q + i * q * 0.5, y + q * (i % 2 ? 0.05 : -0.2), q * 0.5, q * 0.25); }
  if (jobOn('fire')) for (const s of SVC.fire || []) { const x = X(s.r.cx), y = Y(s.r.cy); if (!inView(x, y)) continue;
    g.fillStyle = FIRE_RED; g.fillRect(x - q, y - q, 2 * q, 2 * q); g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(x, y - q * 0.8); g.quadraticCurveTo(x + q * 0.75, y - q * 0.05, x + q * 0.45, y + q * 0.55); g.quadraticCurveTo(x, y + q * 0.85, x - q * 0.45, y + q * 0.55);
    g.quadraticCurveTo(x - q * 0.7, y, x - q * 0.1, y - q * 0.35); g.quadraticCurveTo(x - q * 0.05, y - q * 0.6, x, y - q * 0.8); g.fill(); }
}
let JM = [];
const JCONE = new THREE.ConeGeometry(1, 1.6, 4).rotateX(Math.PI);
function gfxJobs(time) {                  // js/13: the dispatch markers (only in the right vehicle), the rank signs, the markers on what to do
  if (!jobGroup) return;
  const c = P.car, k = !JOB.on && c ? jobKind(c) : null;
  for (const d of DISPATCH) { const on = k === d.kind && jobOn(k); if (d.g.visible !== on) d.g.visible = on; if (on) d.g.userData.ring.scale.setScalar(JOB_MR + Math.sin(time * 3) * 2); }
  const ranks = jobOn('taxi'); for (const R of RANKS) for (const m of R.deco) m.visible = ranks;
  const tg = jobTargets(), bm = (op) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  while (JM.length < tg.length) {                                   // a ring on the ground, a beam of light, an arrow bobbing above
    const g = new THREE.Group(), ring = new THREE.Mesh(RAMP_RING, bm(0.95)), pad = new THREE.Mesh(RAMP_PAD, bm(0.18)), beam = new THREE.Mesh(GCyl, bm(0.2));
    ring.position.y = 1.7; pad.position.y = 1.5; beam.scale.set(22, 120, 22); beam.position.y = 60;
    const cone = new THREE.Mesh(JCONE, new THREE.MeshBasicMaterial({ color: 0xffffff })), edge = new THREE.Mesh(JCONE, new THREE.MeshBasicMaterial({ color: 0x0b0614, side: THREE.BackSide }));
    cone.scale.set(11, 15, 11); edge.scale.set(13.5, 18, 13.5); cone.add(edge); edge.scale.divide(cone.scale);
    g.add(ring, pad, beam, cone); g.userData = { ring, pad, beam, cone }; scene.add(g); JM.push(g);
  }
  JM.forEach((g, i) => {
    const t = tg[i]; g.visible = !!t; if (!t) return;
    const u = g.userData; for (const m of [u.ring, u.pad, u.beam, u.cone]) m.material.color.set(t.col);
    const r = t.ring ? JOB_TR * 0.8 : t.car ? t.car.t.len / 2 + 12 : 26;
    g.position.set(t.x, groundH(t.x, t.y), t.y); u.ring.scale.setScalar(r + Math.sin(time * 3) * 2); u.pad.scale.setScalar(r);
    u.cone.position.y = (t.car ? 56 : 44) + Math.sin(time * 4) * 4; u.cone.rotation.y = time * 2;
  });
}
const jobSave = () => ({ best: Object.assign({}, JOB.best), rew: [...JOB.rew] });
function jobLoad(sv) {                    // js/15b applySave (and a new game: sv null)
  JOB.best = {}; JOB.rew = new Set();
  if (!sv || typeof sv !== 'object') return;
  if (sv.best && typeof sv.best === 'object') for (const k in JOBK) { const v = sv.best[k]; if (typeof v === 'number' && isFinite(v)) JOB.best[k] = Math.max(0, Math.min(999, Math.round(v))); }
  if (Array.isArray(sv.rew)) for (const k of sv.rew) if (JOBK[k]) JOB.rew.add(k);
}
