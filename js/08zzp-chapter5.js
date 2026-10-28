'use strict';
/* ---------- 6zzp. CHAPTER 5 - THE FALL: the shared pieces (the quests M25-M30 are in js/08zzq) ----------
   Crane's BLACK HELICOPTER (M28): it follows your car at rooftop height and its gunner fires bursts at it; bullets (it is a target,
   js/08j) or one AA rocket (js/12f) bring it down - it spins down smoking and blows up where it falls. ch5HeliUp(x, y, numbers) /
   ch5HeliOff(). The junkyard crane's stop (M27): JYR.rate slows it, JYR.stop holds it (js/08z).
   THE CREDITS (modes: credits): after the finale, the names roll over a slow flight across the city at dawn to the game's synth track -
   every character met, with their portrait; SKIP works. creditsPlay(done).
   After the finale (MS_UNLOCK.finale): the DAILY INCOME (modes: dailyIncome, STORY only) is paid into your cash at midnight - Papa Joe's
   cab firm and Rosa's market always, the rest by the side lines done (economy table); Crane's billboards are sprayed over with LOSER and
   handcuffs (modes: craneDefaced); his rallies stop; a sunburnt tourist by the Colony's door asks after his suitcase (modes:
   finaleTourist). The MISSIONS list's switches (js/08zy MS_CHOICES): THE PROOF and one per side line. */
const CH5 = { heli: null, lastH: -1, defaced: false, tourist: null, sayT: 0 };
const lineDone = k => MS_CHOICE[k] === 'done';                 // a side line finished (MISSIONS TEST: its switch; STORY: its last quest passed)

/* ---------- the black helicopter ---------- */
function ch5HeliUp(x, y, N) {
  ch5HeliOff(); const g = makeCraneHeli(); scene.add(g);
  const H = CH5.heli = { x, y, h: 170, ang: 0, hp: N.heliHp, maxhp: N.heliHp, N, mesh: g, gunT: 3, burst: 0, shotT: 0, dead: false, fall: -1, spin: 0 };
  H.tg = addTarget({ x, y, reach: 90, hp: N.heliHp, circles: () => [[H.x, H.y, 28]], hit: (d, byP) => ch5HeliHurt(d, byP) });
  return H;
}
function ch5HeliHurt(d, byP) {
  const H = CH5.heli; if (!H || H.dead) return; H.hp -= d; spark(H.x + rand(-20, 20), H.y + rand(-10, 10), 4); Snd.metal(rand(300, 600), 0.15, 0.08);
  if (H.hp > 0) return;
  H.dead = true; H.fall = 0; H.tg.off = true; toast("CRANE'S HELICOPTER IS GOING DOWN!"); Snd.tone(300, 120, 1.2, 0.12, 'sawtooth');
}
function ch5HeliTick(dt) {
  const H = CH5.heli; if (!H) return;
  if (H.dead) {                                                    // spinning down, smoke behind, a blast where it lands
    H.fall += dt; H.spin += dt * 9; H.h = Math.max(0, H.h - dt * (40 + H.fall * 70)); H.x += Math.cos(H.ang) * dt * 60; H.y += Math.sin(H.ang) * dt * 60;
    if (Math.random() < dt * 20) smokeFx(H.x, H.y, false, 1.6);
    if (H.h <= 2 && H.fall < 99) { H.fall = 99; explosion(H.x, H.y, 120, null); H.mesh.visible = false; }
    if (H.fall >= 99 && (H.gone = (H.gone || 0) + dt) > 1) ch5HeliOff();
  } else {
    const t = P.car || P, N = H.N, back = Math.atan2(t.vy || 0, t.vx || 0), sp = Math.hypot(t.vx || 0, t.vy || 0);
    const ox = sp > 40 ? -Math.cos(back) * 110 : -90, oy = sp > 40 ? -Math.sin(back) * 110 + 60 : 90;   // behind you and to the side
    const tx = t.x + ox, ty = t.y + oy, d = dist(H.x, H.y, tx, ty), v = Math.min(d / dt, N.heliSpeed * KMH + sp);
    if (d > 1) { H.x += (tx - H.x) / d * v * dt; H.y += (ty - H.y) / d * v * dt; }
    H.ang = Math.atan2(t.y - H.y, t.x - H.x); H.h += (Math.max(170, roofAt(H.x, H.y, 60) + 60) - H.h) * Math.min(1, dt * 2);
    H.gunT -= dt;                                                  // the gunner: a burst, then a pause
    if (H.gunT <= 0 && !P.dead && dist(H.x, H.y, t.x, t.y) < N.heliRange * UNITS_PER_M) { H.burst = 5; H.gunT = N.heliGap; }
    if (H.burst > 0 && (H.shotT -= dt) <= 0) {
      H.burst--; H.shotT = 0.12; tracers.push({ x1: H.x, y1: H.y, x2: t.x + rand(-16, 16), y2: t.y + rand(-16, 16), life: 0.07 }); Snd.tone(1000, 200, 0.04, 0.06, 'square');
      if (Math.random() < N.heliAcc / 100) { if (P.car) damageCar(P.car, N.heliDmg, false); else damagePlayer(N.heliDmg / 4); }
    }
  }
  H.tg.x = H.x; H.tg.y = H.y;
  const m = H.mesh; m.position.set(H.x, groundH(H.x, H.y) + H.h, H.y); m.rotation.y = -H.ang + H.spin; m.userData.rotor.rotation.y += dt * 30;
}
function ch5HeliOff() {
  const H = CH5.heli; if (!H) return; CH5.heli = null;
  scene.remove(H.mesh); const i = TARGETS.indexOf(H.tg); if (i >= 0) TARGETS.splice(i, 1);
}

/* ---------- the credits: a slow flight over the city at dawn, the names rolling up ---------- */
const CREDIT_SKIP = ['craneman', 'cguard', 'bull', 'rosaman', 'varga', 'anon', 'kid'];
function creditsPlay(done) {
  let el = $('credits'); if (!el) { el = document.createElement('div'); el.id = 'credits'; document.body.appendChild(el); }
  const who = CHARACTER_TABLE.characters.filter(c => !CREDIT_SKIP.includes(c.id) && c.id !== 'danny');
  const row = c => '<div class="crRow"><img src="img/chars/' + c.id + '-calm.png" alt=""><div><b>' + c.name + '</b><small>' + (c.role || '').split(/[.;-]/)[0] + '</small></div></div>';
  el.innerHTML = '<div class="crRoll"><h1>BLOCK RUNNER</h1><p>MIRAVISTA, 1997</p><h2>DANNY CRUZ</h2>' + row(CHARS.danny || { id: 'danny', name: 'DANNY CRUZ', role: '' }) + '<h2>STARRING</h2>' + who.map(row).join('') +
    '<h2>AND</h2><p>THE PEOPLE OF MIRAVISTA</p><h1 class="crEnd">THE END</h1><p>THE CITY IS YOURS</p></div>';
  const way = [[11700, 12900], [7200, 3540], [5660, 8780], [9650, 2900], [8250, 10330], [3400, 1500], [2600, 12000], [11700, 13100]].map(([x, y]) => ({ x, y }));
  const T = 7, total = T * (way.length - 1);
  const shots = way.slice(0, -1).map((a, i) => ({ dur: T, bars: true, fadeIn: i === 0 ? 1.2 : false, fadeOut: i === way.length - 2 ? 1.2 : 0,
    tick(dt, t, u) { const b = way[i + 1]; cam.x = lerp(a.x, b.x, u); cam.y = lerp(a.y, b.y, u); cam.zoom = 0.42; } }));
  SKY.hour = 6.2; SKY.kind = 'clear';
  cutPlay({ skip: 'SKIP', music: 'scenic', shots,
    start: () => { el.hidden = false; const r = el.firstChild; r.style.animation = 'none'; void r.offsetWidth; r.style.animation = 'crRoll ' + total + 's linear forwards'; },
    end: () => { el.hidden = true; if (done) done(); } });
}

/* ---------- after the finale: the income, the billboards, the tourist ---------- */
const adDefaced = () => feat('craneDefaced') && !!MS_UNLOCK.finale;
function incomeTick() {                   // at midnight: the day's takings, straight into your cash
  const h = SKY.hour, was = CH5.lastH; CH5.lastH = h;
  if (!(was > 20 && h < 4) || !feat('dailyIncome') || !MS_UNLOCK.finale || MS.on) return;
  const parts = [['incomeJoe', true], ['incomeRosa', true], ['incomeMarco', lineDone('varga')], ['incomeCasino', lineDone('casino')], ['incomeColony', lineDone('colony')], ['incomeSpace', lineDone('space')]];
  const sum = parts.reduce((s, [k, on]) => s + (on ? ecoRoll(k) : 0), 0); if (sum <= 0) return;
  addScore(sum, P.x, P.y, 'DAILY INCOME'); toast('DAILY INCOME: ' + money(sum)); Snd.pickup();
}
function touristTick() {                  // a sunburnt tourist by the Colony's door, asking after his suitcase
  const want = feat('finaleTourist') && !!MS_UNLOCK.finale && !MS.on && typeof STORY1 !== 'undefined';
  let p = CH5.tourist; if (p && (!want || p.dead || !peds.includes(p))) { if (!p.dead && peds.includes(p)) peds.splice(peds.indexOf(p), 1); CH5.tourist = p = null; }
  if (!want) return;
  const C = STORY1.colony(), x = C.door.x + C.door.fx * 10 + 26, y = C.door.y + 34;
  if (!p) { if (dist(P.x, P.y, x, y) > 900) return; p = CH5.tourist = makePed(x, y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt: '#ff7ab6', pants: '#f4e9d0', skin: '#ff9a8a', ang: Math.PI / 2, post: { x, y, a: Math.PI / 2, step: standStep } }); peds.push(p); }
  if (!P.car && dist(P.x, P.y, p.x, p.y) < 50 && gameT > CH5.sayT) { CH5.sayT = gameT + 14; toast("TOURIST: HAS ANYBODY SEEN MY SUITCASE? IT'S BROWN. WITH WHEELS."); }
}
function ch5Tick(dt) {                    // js/15 update
  ch5HeliTick(dt); incomeTick(); touristTick();
  const d = adDefaced(); if (d !== CH5.defaced) { CH5.defaced = d; for (const k in _adTex) if (_adTex[k].paintAd) _adTex[k].paintAd(); }
}
function ch5Reset() { ch5HeliOff(); CH5.lastH = -1; CH5.sayT = 0; if (CH5.tourist && peds.includes(CH5.tourist)) peds.splice(peds.indexOf(CH5.tourist), 1); CH5.tourist = null; LOCKERS.glow = false; }
