'use strict';
/* ---------- 7g2. FIREWORKS AT MIDNIGHT ----------
   (js/01j fireworks; sky table: Fireworks) When the clock passes midnight a show starts over one random open spot in the city - a
   park, a plaza or a beach - and lasts fwLength seconds: rockets climb from the ground on a trail of sparks and burst up high as
   peonies, rings (they read best from above), golden willows and crackling white stars, in the city's neon colours. They are heard
   from far away (fwHear) and a toast says where. Nothing is hurt. A new game, or loading one, ends a show that is running. */
const FWK = { on: false, x: 0, y: 0, t: 0, next: 0, rockets: [] };
const FW_COLS = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#3dffa6', '#ff7a3d', '#a259ff', '#ff4d5e', '#ffffff'];
function fwSpot() {                      // somewhere open: a park, a plaza or a beach, well inside the shore
  const polys = [...MAP.grass, ...MAP.sand].filter(p => Math.abs(polyArea(p.o)) > 60000);
  for (let k = 0; k < 40 && polys.length; k++) { const pt = randomIn(pick(polys), (x, y) => shoreDist(x, y) > 40); if (pt) return pt; }
  return [MAP.start[0], MAP.start[1]];
}
function fwStart() {                     // js/12d: the clock has just passed midnight
  if (!feat('fireworks') || FWK.on) return;
  const [x, y] = fwSpot(); Object.assign(FWK, { on: true, x, y, t: 0, next: 0.4, rockets: [] });
  toast('MIDNIGHT FIREWORKS OVER ' + (districtAt(x, y) || 'THE CITY'));
}
function fwReset() { FWK.on = false; FWK.rockets.length = 0; }   // js/15 resetGame
const fwVol = (x, y) => clamp(1 - dist(x, y, P.x, P.y) / (SKYP.fwHear * UNITS_PER_M), 0, 1);
function fwLaunch() {
  const a = rand(0, TAU), d = rand(0, 60), kind = pick(['peony', 'peony', 'ring', 'ring', 'willow', 'crackle', 'duo']);
  const x = FWK.x + Math.cos(a) * d, y = FWK.y + Math.sin(a) * d, top = SKYP.fwHeight * UNITS_PER_M * rand(0.75, 1.05);
  FWK.rockets.push({ x, y, z: 2, vz: top / rand(1.1, 1.5), top, kind, col: pick(FW_COLS), col2: pick(FW_COLS), drift: rand(-14, 14), trail: 0 });
  const v = fwVol(x, y); if (v > 0.02) Snd.tone(rand(380, 520), rand(1500, 2100), 1.1, 0.05 * v, 'sine');   // the whistle going up
}
function fwBurst(R) {
  const v = fwVol(R.x, R.y); if (v > 0.02) { Snd.burst(0.7, 1600, 70, 0.55 * v); Snd.tone(80, 30, 0.5, 0.35 * v, 'sine'); if (R.kind === 'crackle' || R.kind === 'willow') Snd.burst(1.1, 7000, 3500, 0.12 * v, 'highpass', 0.25); }
  const star = (vx, vy, vz, col, life, s0, grav, drag) => addP({ x: R.x, y: R.y, z: R.z, vx, vy, vz, grav, drag, life, max: life, s0, s1: s0 * 0.35, col, alpha: 1 });
  addP({ x: R.x, y: R.y, z: R.z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, life: 0.18, max: 0.18, s0: 46, s1: 20, col: '#fff6d8', alpha: 0.9 });   // the flash
  if (R.kind === 'ring') {               // a flat ring, tipped a little
    const n = 44, s = rand(110, 140), tilt = rand(-0.25, 0.25);
    for (let k = 0; k < n; k++) { const a = k / n * TAU; star(Math.cos(a) * s, Math.sin(a) * s, Math.sin(a) * s * tilt, R.col, rand(1.3, 1.7), 7, 30, 1.1); }
    for (let k = 0; k < 10; k++) { const a = rand(0, TAU), s2 = rand(20, 50); star(Math.cos(a) * s2, Math.sin(a) * s2, rand(-20, 20), R.col2, rand(0.9, 1.3), 6, 30, 1.2); }   // a heart of another colour
    return;
  }
  const n = R.kind === 'crackle' ? 90 : R.kind === 'willow' ? 64 : 72;
  for (let k = 0; k < n; k++) {          // a sphere of stars
    const u = rand(-1, 1), a = rand(0, TAU), r = Math.sqrt(1 - u * u);
    if (R.kind === 'willow') { const s = rand(60, 85); star(r * Math.cos(a) * s, r * Math.sin(a) * s, u * s, k % 3 ? '#ffd27a' : '#ffb02e', rand(2.4, 3.2), 6, 22, 0.55); }
    else if (R.kind === 'crackle') { const s = rand(70, 150); star(r * Math.cos(a) * s, r * Math.sin(a) * s, u * s, k % 4 ? '#ffffff' : '#fff3b0', rand(0.5, 1.1), 4.5, 40, 1.6); }
    else { const s = rand(100, 135); star(r * Math.cos(a) * s, r * Math.sin(a) * s, u * s, R.kind === 'duo' && k % 2 ? R.col2 : R.col, rand(1.3, 1.9), 7.5, 38, 1.2); }
  }
}
function fwTick(dt) {                    // js/15 update
  if (!FWK.on) return;
  FWK.t += dt;
  if (FWK.t < SKYP.fwLength && (FWK.next -= dt) <= 0) { FWK.next = SKYP.fwEvery * rand(0.5, 1.5); fwLaunch(); if (Math.random() < 0.18) fwLaunch(); }   // now and then two at once
  for (let k = FWK.rockets.length - 1; k >= 0; k--) {
    const R = FWK.rockets[k]; R.z += R.vz * dt; R.x += R.drift * dt; R.vz = Math.max(R.vz * Math.exp(-0.5 * dt), 40);
    if ((R.trail -= dt) <= 0) { R.trail = 0.03; addP({ x: R.x + rand(-1, 1), y: R.y + rand(-1, 1), z: R.z, vx: rand(-6, 6), vy: rand(-6, 6), vz: rand(-30, -10), grav: 60, drag: 2, life: rand(0.3, 0.5), max: 0.5, s0: 4, s1: 1, col: '#ffd9a0', alpha: 1 }); }
    if (R.z >= R.top) { fwBurst(R); FWK.rockets.splice(k, 1); }
  }
  if (FWK.t >= SKYP.fwLength && !FWK.rockets.length) FWK.on = false;
}
