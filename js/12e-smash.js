'use strict';
/* ---------- 7f. STREET JUNK UNDER WHEELS ----------
   Cardboard boxes, garbage bags, single crates and pallets burst when a vehicle drives into them: bits fly the way it was going and
   a patch of mess stays on the ground. Bins, barrels and newspaper boxes are knocked flying and spill their trash; a hydrant is
   knocked off and a fountain of water shoots up for a few seconds. Each hit slows the vehicle a little (a heavy one hardly notices).
   Benches, parking meters and beach umbrellas are knocked flying; a phone box's glass shatters; a planter breaks; a bush is flattened
   (js/01j moreProps). A blast throws all of it (js/12c) and shreds the light things near its middle.
   Whatever was smashed or knocked away is put back after a minute and a half, once you are far enough away not to see it. */
const SMASH = {                          // debris colours, how much a 1.4 t car slows, the mess left on the ground (colour, radius)
  box: { cols: ['#a07a4c', '#8a6a44', '#c9a676', '#d9c29a', '#6e5236'], slow: 0.03, decal: '#5e4a33', r: 9 },
  bag: { cols: ['#17151e', '#2a3a2a', '#33303f', '#e8e4d8', '#ff6fae', '#ffe14a', '#3fe0ff'], slow: 0.04, decal: '#1d1a24', r: 11 },
  crate: { cols: ['#8a6a44', '#6e5236', '#9a7a50', '#c9a676'], slow: 0.07, decal: '#4e3a26', r: 8 },
  pallet: { cols: ['#9a7a50', '#7a5a3a', '#c9a676'], slow: 0.04, decal: '#4e3a26', r: 8 },
  bin: { cols: ['#1d1b24', '#e8e4d8', '#6b5a48', '#3a5f3a', '#ffe14a'], slow: 0.08 },
  hydrant: { cols: ['#e0364f', '#9fd4ff', '#cfeeff'], slow: 0.2 },
  bench: { cols: ['#7a5a3a', '#9a7a50', '#2b2e38'], slow: 0.08 },
  meter: { cols: ['#c8ccd4', '#ffd23f', '#55586a'], slow: 0.05 },
  umbrella: { cols: ['#ff2bd6', '#ffe14a', '#2bf3ff', '#e8e8e8'], slow: 0.03 },
  booth: { cols: ['#9fd8ff', '#cfeeff', '#ffffff', '#2a4aa8'], slow: 0.12, decal: '#3a5a8a', r: 9 },
  planter: { cols: ['#8d86a8', '#5e4a33', '#1f9e7a', '#23b38a'], slow: 0.1, decal: '#4e3a26', r: 10 },
  bush: { cols: ['#1f9e7a', '#178a6a', '#2e8b57', '#7fbf5a'], slow: 0.05, decal: '#24402c', r: 9 },
};
const MORE_SMASH = { bench: 1, meter: 1, umbrella: 1, booth: 1, planter: 1, bush: 1 };   // js/01j moreProps
const SHRED = { box: true, bag: true, crate: true, pallet: true, booth: true, planter: true, bush: true }, MESSED = [], SPRAYS = [];
let messT = 0;
function messed(o) { o.t = gameT; if (!MESSED.includes(o)) MESSED.push(o); }
function hideParts(o) {                  // take its pieces out of the merged street-furniture mesh
  for (const p of o.parts) {
    const it = p.it; if (!it._m) continue;
    if (!it._orig) { it._orig = new THREE.Matrix4(); it._m.getMatrixAt(it._k, it._orig); }
    it._m.setMatrixAt(it._k, _hid); it._m.instanceMatrix.needsUpdate = true;
  }
}
function breakProp(o, nx, ny, sp) {      // burst: gone, in bits, a mess left where it was
  if (o.broken) return;
  if (o.group) { scene.remove(o.group); o.group = null; } else hideParts(o);
  if (o.flying) { o.flying = false; const f = FLY.indexOf(o); if (f >= 0) FLY.splice(f, 1); }
  if (o.solid) o.solid.off = true;
  o.broken = o.gone = true; messed(o);
  const S = SMASH[o.smash] || SMASH.box, a0 = Math.atan2(ny, nx), n = o.smash === 'bag' || o.smash === 'booth' || o.smash === 'bush' ? 24 : 16;
  for (let k = 0; k < n; k++) {
    const a = a0 + rand(-1.1, 1.1), s = sp * rand(0.25, 0.8) + rand(20, 80);
    addP({ x: o.x + rand(-4, 4), y: o.y + rand(-4, 4), z: rand(3, 10), vz: rand(80, 230), grav: 600, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.7, 1.5), max: 1.5, s0: rand(2.6, 4.6), s1: 2, col: pick(S.cols), drag: 1.4, alpha: 1 });
  }
  if (decals.length < 150) decals.push({ x: o.x + nx * 6, y: o.y + ny * 6, r: S.r * rand(0.8, 1.2), life: 70, col: S.decal });
}
function spill(o, nx, ny, sp, cols) {    // trash out of a knocked bin
  for (let k = 0; k < 10; k++) {
    const a = Math.atan2(ny, nx) + rand(-0.9, 0.9), s = sp * rand(0.2, 0.6) + rand(10, 50);
    addP({ x: o.x, y: o.y, z: rand(6, 12), vz: rand(60, 160), grav: 600, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.8, 1.4), max: 1.4, s0: rand(2.4, 3.8), s1: 2, col: pick(cols), drag: 1.2, alpha: 1 });
  }
}
function spray(x, y) { if (!SPRAYS.some(s => dist(s.x, s.y, x, y) < 5)) SPRAYS.push({ x, y, t: 7 }); }   // a knocked-off hydrant
function smashProp(o, c, sp) {           // vehicle c drives into street junk o at speed sp
  const S = SMASH[o.smash], vx = c.vx / sp, vy = c.vy / sp, d = dist(o.x, o.y, c.x, c.y) || 1;
  const nx0 = vx + 0.5 * (o.x - c.x) / d, ny0 = vy + 0.5 * (o.y - c.y) / d, nl = Math.hypot(nx0, ny0) || 1, nx = nx0 / nl, ny = ny0 / nl;   // ahead, and out to the side it was on
  if (SHRED[o.smash]) breakProp(o, nx, ny, sp);
  else {
    throwProp(o, nx, ny, clamp(sp / 320, 0.3, 1.1)); messed(o); spill(o, nx, ny, sp, S.cols);
    if (o.smash === 'hydrant') spray(o.hx, o.hy);
  }
  const k = 1 - S.slow / Math.max(1, Math.sqrt(c.t.mass || 1)); c.vx *= k; c.vy *= k;
  const near = dist(o.x, o.y, P.x, P.y);
  if (near < 700) Snd.smash(o.smash, 1 - near / 700);
  if (c.driver === 'player') cam.shake = Math.max(cam.shake, o.smash === 'hydrant' ? 4 : SHRED[o.smash] ? 1.2 : 2.5);
}
function smashProps(dt) {                // every frame (js/15): vehicles against the junk around them; fountains; tidying up far away
  for (const c of cars) {
    const sp = Math.hypot(c.vx, c.vy); if (sp < 40 || c.sunk || (c.air || 0) > 10) continue;   // from about 12 km/h
    const reach = c.t.len / 2 + 14, a0 = Math.floor((c.x - reach + SEA) / TG), a1 = Math.floor((c.x + reach + SEA) / TG), b0 = Math.floor((c.y - reach + SEA) / TG), b1 = Math.floor((c.y + reach + SEA) / TG);
    let circ = null;
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
      const l = TGRID.get(a * 1024 + b); if (!l) continue;
      for (let i = l.length - 1; i >= 0; i--) {
        const o = l[i]; if (!o || !o.smash || o.gone || o.flying || (MORE_SMASH[o.smash] && !feat('moreProps')) || Math.abs(o.x - c.x) > reach || Math.abs(o.y - c.y) > reach) continue;
        circ = circ || carCircles(c);
        if (circ.some(q => Math.hypot(q[0] - o.x, q[1] - o.y) < q[2] + 6)) smashProp(o, c, sp);
      }
    }
  }
  for (let k = SPRAYS.length - 1; k >= 0; k--) {                   // the fountain: a column of water that slowly dies down
    const s = SPRAYS[k], f = Math.min(1, s.t / 3);
    for (let n = 0; n < 3; n++) addP({ x: s.x + rand(-1.5, 1.5), y: s.y + rand(-1.5, 1.5), z: 6, vz: rand(250, 340) * (0.5 + 0.5 * f), grav: 560, vx: rand(-30, 30), vy: rand(-30, 30),
      life: rand(0.8, 1.1), max: 1.1, s0: rand(2.6, 4), s1: rand(5, 8), col: pick(['#cfeeff', '#9fd4ff', '#ffffff']), drag: 0.5, alpha: 0.7 });
    if ((s.t -= dt) <= 0) SPRAYS.splice(k, 1);
  }
  if ((messT -= dt) > 0) return; messT = 2;
  for (let k = MESSED.length - 1; k >= 0; k--) {                   // put back what was knocked about, out of sight
    const o = MESSED[k];
    if (o.flying || gameT - o.t < 90 || dist(o.hx, o.hy, P.x, P.y) < 1500 || dist(o.x, o.y, P.x, P.y) < 1500) continue;
    restoreProp(o); MESSED.splice(k, 1);
  }
}
