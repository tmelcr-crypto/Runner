'use strict';
/* ---------- 8zzk. THE STORY, CHAPTER 3 - THE TRAIL (Nina Park): the scripts of M13-M18 ----------
   Each mission's words, lines and numbers are in the missions table (js/01x); the engine and chapter 1's helpers (STORY1) in js/08zy;
   the enemies and friends in js/08zz; BAY TV's newsroom in js/10zf; the story's choices as MISSIONS TEST plays them: MS_CHOICE (js/08zy). */
const STORY3 = {
  nina(A) {                                // Nina at her desk in the newsroom (held by the quest: the door open)
    NEWS.ms = true; const S = NEWS.S, n = S.ninaAt;
    A.nina = msPed(n.x, n.y, 0, Object.assign(STORY1.look('nina'), { msName: 'nina', step: STORY1.stay, spare: true, shield: true })); STORY1.face(A.nina, newsWorld(S.nina.x - 40, S.nina.z));
    return A.nina;
  },
  meet(A, cut) {                           // the TALK TO step at Nina's desk
    return { enter(A2) { MS.mark = () => A.nina; MS.guide = NEWS.S.door; MS.start = { at: () => A.nina, label: 'START MISSION', go: () => { STORY1.face(A.nina, P); msCut(cut, () => { A.go = true; }); } }; },
      tick() { return !!A.go; } };
  },
  kessler: () => MS_CHOICE.kessler          // Choice 1 as this game has it: 'finished' or 'spared'
};

/* ================= M13 - BREAKING NEWS ================= */
MSCRIPT.m13 = (() => {
  const S1 = STORY1, S3 = STORY3, N = () => MS.m.numbers, me = () => P.car || P, at = S1.at, face = S1.face;
  function setup(A) {
    SKY.hour = N().hour; S3.nina(A); const S = NEWS.S;
    P.x = S.door.x + 40; P.y = S.door.y + 40; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y;      // MISSIONS TEST: by the TV tower, a car at the kerb
    const r0 = S1.road(S.door.x, S.door.y + 80), k0 = kerbBy(r0.x + 60, r0.y); A.mycar = msCar('estate', k0.x, k0.y, k0.ang, '#3d6fa8');
    const r = S1.road(S.cx + 500, S.cy + 300), k = kerbBy(r.x, r.y);                          // the stolen van, a few blocks off, and where it runs to
    A.route = [S1.road(S.cx + 1400, S.cy + 900), S1.road(S.cx + 2400, S.cy + 600), S1.road(S.cx + 3200, S.cy + 1600)];
    A.van = msFoeCar('newsvan', k.x, k.y, k.ang, { mode: 'park', crew: 2, gun: 'pistol', group: 'crane', speed: N().vanSpeed, to: A.route, color: '#f4f6fa', crewHp: N().menHp, shirt: '#3a3f4c', pants: '#2a2d36' });
  }
  const steps = [
    msPhone('nina', [1, 2, 3]),                                                     // the call
    { enter(A) { MS.mark = () => A.van; MS.guide = () => A.van; if (A.van.fc.mode === 'park') { A.van.fc.wait = 0.5; foeCarGo(A.van, 'flee'); msLive([4]); } },   // CHASE the van
      tick(A) { const v = A.van; if (!v.fc.out && !v.dead && v.hp < v.maxhp * 0.45) foeBail(v); if (!v.fc.out && !v.dead) return false; msLive([5], { now: true }); return true; },
      info: A => Math.round(dist(me().x, me().y, A.van.x, A.van.y) / UNITS_PER_M) + ' M TO THE VAN (GONE AT ' + N().away + ') · ' + Math.round(100 * A.van.hp / A.van.maxhp) + '%',
      jump(A) { const v = A.van; if (P.car) exitCar(true); P.x = v.x + 60; P.y = v.y + 40; foeBail(v); } },
    { enter(A) { MS.guide = null; MS.mark = () => peds.find(p => p.foe && !p.dead && p.group === 'crane'); },   // TAKE OUT Crane's men
      tick() { return msFoesLeft('crane') === 0; },
      info: () => msFoesLeft('crane') + ' LEFT',
      jump() { for (const p of peds) if (p.foe && !p.dead && p.group === 'crane') killPed(p, 'gun', false); } },
    { enter(A) { if (!A.bag) A.bag = S1.dryNear(A.van.x - Math.cos(A.van.ang) * 30, A.van.y - Math.sin(A.van.ang) * 30); MS.mark = () => A.bag && at(A.bag.x, A.bag.y); },   // COLLECT the tapes
      tick(A) { if (A.got) return true; if (P.car || !A.bag || dist(P.x, P.y, A.bag.x, A.bag.y) > N().bagR) return false; A.got = true; A.bag = null; Snd.pickup(); popup(P.x, P.y - 14, "NINA'S TAPES", '#b6ff3c'); return true; },
      jump(A) { A.got = true; A.bag = null; } },
    { enter(A) { MS.guide = NEWS.S.door; MS.mark = () => A.nina; },                 // DELIVER the tapes to Nina: the closing
      tick(A) { if (A.home || P.car || dist(P.x, P.y, A.nina.x, A.nina.y) > N().ninaR) return false; A.home = true; msCut('THE PHOTO', () => msNext()); return false; },
      info: A => Math.round(dist(me().x, me().y, A.nina.x, A.nina.y) / UNITS_PER_M) + ' M TO NINA',
      jump(A) { if (P.car) exitCar(true); const n = NEWS.S.ninaAt; P.x = n.x - 22; P.y = n.y; } }];
  function fail(A) {
    const F = MS.m.fails;
    if (A.nina.dead) return F.ninaDead;
    if (MS.k === 1 && !A.van.fc.out && (A.van.fc.gone || dist(me().x, me().y, A.van.x, A.van.y) > N().away * UNITS_PER_M)) return F.away;
    return '';
  }
  const cuts = {
    'THE PHOTO': A => [
      { dur: 5, cam: 'CLOSE', at: () => A.nina, line: [6, 7], enter: () => { face(A.nina, P); P.ang = Math.atan2(A.nina.y - P.y, A.nina.x - P.x); } },
      { dur: 5, cam: 'CLOSE', at: () => P, line: [8, 9], fadeOut: true }]
  };
  return { setup, steps, fail, cuts, cleanup() { NEWS.ms = null; } };
})();
