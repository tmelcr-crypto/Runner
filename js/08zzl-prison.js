'use strict';
/* ---------- 8zzl. THE PRISON STORYLINE (Sal Moretti, the breakout): the scripts of P1-P8 ----------
   Each quest's words, lines and numbers are in the missions table (js/01x); Iron Key and its ferry in js/08zp; the visit's search at
   the gate as in Quest 05 (weapons wait in the booth). The line opens at the start of chapter 3 with Sal's letter at the Colony's desk;
   his marker S stands by the Iron Key ferry's kiosk on the promenade. */
const PRISONL = {
  holdKit(A) {                             // searched at the gate: every weapon but your fists waits in the booth
    if (A.kit) return; A.kit = { has: P.has.slice(), ammo: P.ammo.slice(), mag: P.mag.slice(), weapon: P.weapon };
    P.has = WEAPONS.map(w => !!w.start); P.weapon = Math.max(0, P.has.indexOf(true)); P.swing = null;
  },
  kitBack(A) {                             // back on the way out (and whatever happens, at the end)
    const k = A.kit; if (!k || A.kitBack) return; A.kitBack = true;
    for (let i = 0; i < WEAPONS.length; i++) { P.has[i] = P.has[i] || k.has[i]; P.ammo[i] = Math.max(P.ammo[i], k.ammo[i]); P.mag[i] = Math.max(P.mag[i], k.mag[i]); }
    if (P.has[k.weapon]) P.weapon = k.weapon;
  },
  kiosk() {                                // a free spot by the ferry kiosk on the promenade (marker S)
    const [kx, ky] = PRZ.kiosk; return [[-60, 0], [-50, 40], [0, 50], [-70, -30]].map(([dx, dy]) => ({ x: kx + dx, y: ky + dy })).find(q => !pedBlocked(q.x, q.y) && shoreDist(q.x, q.y) > 6) || { x: kx - 60, y: ky };
  }
};

/* ================= P1 - VISITING HOURS ================= */
MSCRIPT.p1 = (() => {
  const S1 = STORY1, L = PRISONL, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    prisonReset(); PRX.visit = false;
    const [gx, gy] = PRZ.gate; A.gateOut = at(gx, gy + 46); A.gateIn = at(gx, gy - 46);
    A.sal = msPed(8870, 3742, -Math.PI / 2, Object.assign(S1.look('sal'), { msName: 'sal', step: S1.stay, spare: true, shield: true }));   // Sal in the yard, by the chess tables
    A.ferryPier = at((PRZ.mhead[0] + PRZ.mhead[2]) / 2, (PRZ.mhead[1] + PRZ.mhead[3]) / 2);
    const st = A.kiosk = L.kiosk(); P.x = st.x; P.y = st.y; P.vx = P.vy = 0; P.swim = false; cam.x = P.x; cam.y = P.y;   // MISSIONS TEST: by the ferry kiosk (marker S)
  }
  const steps = [
    { enter(A) { MS.mark = () => A.ferryPier; MS.start = { at: () => P, label: "SAL'S LETTER", go2: 'READ IT', go: () => msCut('THE LETTER', () => { A.read = true; MS.guide = A.ferryPier; }) }; },   // the letter; GO TO Iron Key
      tick(A) { return !!A.read && !P.ferry && onIsland(me().x, me().y); },
      info: A => A.read ? 'THE FERRY TO IRON KEY' : '',
      jump(A) { MS.start = null; A.read = true; if (P.car) exitCar(true); P.x = PRZ.path[2][0]; P.y = PRZ.path[2][1]; P.swim = false; } },
    { enter(A) { MS.mark = () => A.gateOut; MS.guide = A.gateOut; },                            // GO TO the gate: the search
      tick(A) { if (A.kit) return true; if (P.car || dist(P.x, P.y, A.gateOut.x, A.gateOut.y) > N().gateR) return false; L.holdKit(A); PRX.visit = PRX.gateOpen = true; popup(P.x, P.y - 14, 'WEAPONS LEFT AT THE GATE', '#ffd23f'); return true; },
      jump(A) { if (P.car) exitCar(true); L.holdKit(A); PRX.visit = PRX.gateOpen = true; P.x = A.gateIn.x; P.y = A.gateIn.y; } },
    { enter(A) { MS.mark = () => A.sal; MS.guide = () => A.sal; MS.start = { at: () => A.sal, label: msWho('sal').name, go: () => { face(A.sal, P); msCut('1975', () => { A.told = true; }); } }; },   // TALK TO Sal over chess
      tick: A => !!A.told,
      jump(A) { P.x = A.sal.x + 30; P.y = A.sal.y + 10; } },
    { enter(A) { MS.mark = () => A.gateOut; MS.guide = A.gateOut; },                            // GO TO the gate: your weapons back
      tick(A) { if (inPrison(me().x, me().y) || dist(me().x, me().y, A.gateOut.x, A.gateOut.y) > 160) return false; L.kitBack(A); Snd.pickup(); popup(P.x, P.y - 14, 'YOUR WEAPONS', '#b6ff3c'); return true; },
      jump(A) { L.kitBack(A); P.x = A.gateOut.x; P.y = A.gateOut.y; } },
    { enter(A) { MS.mark = () => A.ferryPier; MS.guide = null; },                               // GO TO the mainland: back on the ferry
      tick(A) { if (P.ferry || onIsland(me().x, me().y)) return false;
        const o = me(); A.men = [[60, 40], [-50, 50], [10, 80]].map(([dx, dy]) => { const q = S1.free(o.x + dx, o.y + dy, 10);   // Holloway's men waiting on the quay
          return msFoe(q.x, q.y, { gun: 'pistol', group: 'holl', hp: N().menHp, alert: true, shirt: '#3a4a6a', pants: '#2a2d36', a: Math.atan2(o.y - q.y, o.x - q.x) }); });
        msLive([7, 8], { now: true }); return true; },
      jump(A) { const k = A.kiosk; if (P.car) exitCar(true); P.x = k.x; P.y = k.y; P.swim = false; } },
    { enter(A) { MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'holl'); },     // TAKE OUT Holloway's men
      tick(A) { if (msFoesLeft('holl') > 0) return false; if (!A.fin0) { A.fin0 = true; msLive([9], { now: true, done: () => { A.fin = true; } }); } return !!A.fin; },
      info: () => msFoesLeft('holl') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'holl') killPed(p, 'gun', false); } }];
  function fail(A) { const F = MS.m.fails; if (A.sal.dead) return F.salDead; return ''; }
  const cuts = {
    'THE LETTER': A => [
      { dur: 6, cam: 'CLOSE', at: () => P, line: [1, 2], fadeOut: true }],
    '1975': A => [
      { dur: 7, cam: 'CLOSE', at: () => A.sal, line: [3, 4], enter: () => { face(A.sal, P); P.ang = Math.atan2(A.sal.y - P.y, A.sal.x - P.x); } },
      { dur: 6, cam: 'CLOSE', at: () => A.sal, line: [5] },
      { dur: 4, cam: 'CLOSE', at: () => P, line: [6], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup(A) { if (A) PRISONL.kitBack(A); prisonReset(); } };
})();
