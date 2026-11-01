'use strict';
/* ---------- 7zg. CRANE'S RALLY at Bayfront Park's band shell (STORY after M15; M15 plays one) ----------
   A CRANE FOR MAYOR banner over the band shell, Crane at the stage's lip, a crowd before him facing the stage; now and then they cheer.
   STORY: every game day from rallyHour for rallyLen hours (places table, Rally), while you are near. A quest builds its own with
   rallyUp(true) and takes it down with rallyDown(). Mode: rallies. */
const RALLY = { on: false, ms: false, crowd: [], crane: null, sign: null, cheerT: 0, cheerAt: -99 };
function rallyShell() {                     // the band shell's middle and the stage's front (world)
  const L = MAP.lm.find(l => l.t === 'park'); if (!L) return null;
  const lk = L.lake, y = lk[1] - (lk[3] + 110) - 80; return { x: lk[0], y, front: y + 52 };
}
function rallyUp(forQuest) {
  const S = rallyShell(); if (!S || RALLY.on) return S; RALLY.on = true; RALLY.ms = !!forQuest; RALLY.cheerT = rand(6, 10);
  const n = PLC.rallyCrowd, rows = Math.ceil(n / 9);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / 9), k = i % 9, x = S.x + (k - 4) * 19 + (r % 2 ? 9 : 0) + rand(-3, 3), y = S.front + 34 + r * 24 + rand(-3, 3);
    if (pedBlocked(x, y)) continue;
    const p = makePed(x, y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', ang: -Math.PI / 2, shirt: pick(['#e8e8ee', '#3d6fa8', '#d4a020', '#a8323a', '#2a8a5a', '#f4f1ea']), pants: pick(['#2a2d3a', '#4a4458', '#6a5a48']), rally: true, keep: true });
    p.post = { x, y, a: -Math.PI / 2, step: standStep }; peds.push(p); RALLY.crowd.push(p);
  }
  if (!forQuest) { const c = makePed(S.x, S.front - 4); Object.assign(c, { arm: -1, umb: false, speed: 0, state: 'post', ang: Math.PI / 2, shirt: msWho('crane').shirt, pants: msWho('crane').pants, rally: true, keep: true }); c.post = { x: c.x, y: c.y, a: Math.PI / 2, step: standStep }; peds.push(c); RALLY.crane = c; }
  const m = fasciaSign('CRANE FOR MAYOR', '#ff3b4a', 70, 10); m.position.set(S.x, groundH(S.x, S.y) + 52, S.y + 30); scene.add(m); RALLY.sign = m;
  return S;
}
function rallyDown() {
  for (const p of RALLY.crowd.concat(RALLY.crane ? [RALLY.crane] : [])) { const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); }
  if (RALLY.sign) { scene.remove(RALLY.sign); RALLY.sign.material.dispose(); }
  Object.assign(RALLY, { on: false, ms: false, crowd: [], crane: null, sign: null });
}
function rallyCheer() {                     // the crowd roars: confetti over the heads, a cheer
  const S = rallyShell(); if (!S) return; RALLY.cheerAt = gameT;
  for (let k = 0; k < 40; k++) { const x = S.x + rand(-90, 90), y = S.front + rand(30, 110); addP({ x, y, z: rand(30, 50), vz: rand(10, 40), grav: 40, vx: rand(-15, 15), vy: rand(-15, 15), life: rand(1.5, 2.5), max: 2.5, s0: 1.6, s1: 1.2, col: pick(['#ff3b4a', '#f4f6fa', '#3d6fa8', '#ffd23f']), drag: 0.6, hold: true }); }
  if (dist(P.x, P.y, S.x, S.y) < 900) Snd.tone(420, 620, 0.5, 0.05, 'triangle');
}
function rallyTick(dt) {                    // js/15 update
  if (RALLY.ms) { if ((RALLY.cheerT -= dt) <= 0) { RALLY.cheerT = rand(10, 16); rallyCheer(); } }
  else {
    const S = rallyShell(), h = SKY.hour, want = feat('rallies') && storyOn() && stDone('m15') && !MS_UNLOCK.finale && !(typeof MS !== 'undefined' && MS.on) && S && h >= PLC.rallyHour && h < PLC.rallyHour + PLC.rallyLen && dist(P.x, P.y, S.x, S.y) < 1400;
    if (want && !RALLY.on) rallyUp(false); else if (!want && RALLY.on) rallyDown();
    if (RALLY.on && (RALLY.cheerT -= dt) <= 0) { RALLY.cheerT = rand(10, 16); rallyCheer(); }
  }
}
