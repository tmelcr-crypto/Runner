'use strict';
/* ---------- 6c2. HIDDEN WEAPONS AND ITEMS ----------
   Apart from your fists every weapon has to be found. Weapons and their ammunition lie hidden off the main streets - in back alleys,
   yards, parks, parking lots, on beaches and promenades - each floating and turning in a bubble of the weapon's own colour (js/01f):
   the weapon itself, or a box of its ammunition. How many of each: onMap and ammoMap in the weapon table.
   Health, body armor and the heat reducer (js/01g) lie hidden the same way, each in its own colour - the heat reducer's bubble
   flashes red and blue - and come back elsewhere like the guns. Health and armor are only taken when you need them, the heat
   reducer only while you are wanted. None of it is shown on the maps.
   Melee weapons are the most common. They always lie in the same places, never go away, and you do not pick one up while you carry
   that weapon (its bubble is faint then). Guns, bombs and ammo lie in different places every game; one you take comes back somewhere
   else, out of sight, a minute later. Ammo is taken even before you have its gun, and kept for it. Walking or driving over works.
   Cash still lies on the sidewalks (js/08). */
let WPICKS = [], WSPOTS = null, wpQ = [];
const WP_BACK = 60, WP_R = 22, WP_GAP = 160;
function hiddenOk(x, y) {               // off the streets and sidewalks, on open ground, not in a wall or the water
  return !nearestRoad(x, y, ROAD_HALF + SW_W + 14) && !pedBlocked(x, y) && shoreDist(x, y) > 14 && !inLandmark(x, y) && groundH(x, y) === 0;
}
function buildSpots() {                  // every hiding place, the same every game (a fixed seed)
  const out = [], add = (x, y, k) => { if (hiddenOk(x, y)) out.push({ x, y, k, used: null }); };
  for (const a of MAP.alleys || []) {
    const ang = a[4] * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    for (let t = -a[2] / 2 + 30; t < a[2] / 2 - 30; t += 70) { const o = (Math.random() - 0.5) * a[3] * 0.4; add(a[0] + ux * t + nx * o, a[1] + uy * t + ny * o, 'alley'); }
  }
  const scatter = (polys, per, most, k) => { for (const p of polys || []) { const n = clamp(Math.floor(Math.abs(polyArea(p.o)) / per), 1, most); for (let i = 0; i < n; i++) { const q = randomIn(p, hiddenOk); if (q) add(q[0], q[1], k); } } };
  scatter((MAP.yards || []).filter(y => y.k !== 'ap'), 12000, 10, 'yard');
  scatter(MAP.grass, 20000, 16, 'park');
  scatter(MAP.sand, 40000, 8, 'beach');
  for (const L of LOTS) {                                           // the back corners of the parking lots, clear of the stalls' fronts
    const ca = Math.cos(L.a), sa = Math.sin(L.a);
    for (const sx of [-1, 1]) { const lx = sx * (L.w / 2 - 10), lz = -L.d / 2 + 10; add(L.cx + ca * lx - sa * lz, L.cy + sa * lx + ca * lz, 'lot'); }
  }
  return out;
}
function freeSpot(rnd, away, key) {      // an unused hiding place, not too close to other pickups (or to (away) = the player)
  for (let tr = 0; tr < 80; tr++) {
    const s = WSPOTS[Math.floor(rnd() * WSPOTS.length)];
    if (!s || s.used || s.ramp) continue;
    if (away && dist(s.x, s.y, away.x, away.y) < away.r) continue;
    if (WPICKS.some(q => dist(q.x, q.y, s.x, s.y) < (q.key === key ? 600 : WP_GAP))) continue;   // the same thing well spread out
    return s;
  }
  return null;
}
function placeWeapons() {                // a new game: melee in their fixed places, the rest at random
  if (!WSPOTS) { WSPOTS = withSeed(1979, buildSpots); pickRampages(); }   // the rampages take some of the hiding places (js/08f)
  for (const s of WSPOTS) s.used = null; WPICKS = []; wpQ = [];
  if (feat('hiddenWeapons')) withSeed(2024, () => {                // melee weapons: the same places every game (modes: js/01j)
    WEAPONS.forEach((w, wi) => { if (isMelee(w)) for (let k = 0; k < w.onMap; k++) putPick(freeSpot(Math.random, null, 'w' + wi), wi, false, true); });
  });
  const start = { x: P.x, y: P.y, r: 300 };
  if (feat('hiddenWeapons')) WEAPONS.forEach((w, wi) => {
    if (isMelee(w)) return;
    for (let k = 0; k < w.onMap; k++) putPick(freeSpot(Math.random, start, 'w' + wi), wi, false, false);
    for (let k = 0; k < w.ammoMap; k++) putPick(freeSpot(Math.random, start, 'w' + wi), wi, true, false);
  });
  if (feat('hiddenItems')) for (const it of ITEMS) for (let k = 0; k < (it.onMap || 0); k++) putPick(freeSpot(Math.random, start, 'i' + it.id), -1, false, false, it.id);   // health, armor, heat reducers
}
function putPick(s, wi, ammo, fixed, item) {
  if (!s) return;
  const key = item ? 'i' + item : 'w' + wi;
  s.used = key; WPICKS.push({ x: s.x, y: s.y, wi, ammo, item: item || null, key, fixed, spot: s, bob: Math.random() * 6, mesh: null });
}
function takeItem(p) {                   // health, armor or a heat reducer: false while you do not need it (it stays)
  const it = ITEM[p.item];
  if (p.item === 'health') { if (P.hp >= it.max) return false; P.hp = Math.min(it.max, P.hp + it.amount); popup(p.x, p.y - 12, '+' + it.amount + ' HEALTH', '#ff6b86'); }
  else if (p.item === 'armor') { if (P.armor >= it.max) return false; P.armor = Math.min(it.max, P.armor + it.amount); popup(p.x, p.y - 12, '+' + it.amount + ' ARMOR', it.color); }
  else if (p.item === 'bribe') { if (P.stars <= 0) return false; lowerWanted(it.amount); popup(p.x, p.y - 12, '-' + it.amount + ' STAR', '#ffe14a'); }
  return true;
}
function lowerWanted(n) {                // the heat reducer: n stars less, as if the police had cooled off that much
  const s = Math.max(0, P.stars - n);
  if (s === 0) { clearWanted('HEAT GONE'); return; }
  P.heat = COP.lv.heat[s]; P.stars = s; P.sinceCrime = 0; toast('WANTED LEVEL ' + s);
}
function updateWeaponPicks(dt) {
  const px = P.car ? P.car.x : P.x, py = P.car ? P.car.y : P.y, reach = P.car ? WP_R + P.car.t.wid / 2 : WP_R;
  for (let k = WPICKS.length - 1; k >= 0; k--) {
    const p = WPICKS[k]; p.bob += dt * 3;
    if (p.drop && gameT > p.until) { WPICKS.splice(k, 1); continue; }   // dropped by the dead (js/08g) and left lying too long
    if (P.dead || Math.abs(p.x - px) > reach || Math.abs(p.y - py) > reach || dist(p.x, p.y, px, py) > reach) continue;
    if (RAMP.on && p.wi === RAMP.on.wi) continue;                     // the rampage's own weapon and ammo wait until it is over (js/08f)
    if (p.item) { if (!takeItem(p)) continue; }
    else { const w = WEAPONS[p.wi], i = p.wi, col = w.color;
    if (p.ammo) {                                                    // ammo: kept even before you have the gun
      if (P.ammo[i] >= w.maxAmmo) continue;
      const n = Math.min(w.pickup, w.maxAmmo - P.ammo[i]); P.ammo[i] += n; popup(p.x, p.y - 12, '+' + n + ' ' + w.short, col);
    } else if (isMelee(w)) {                                         // melee: only if you do not carry it; it stays where it is
      if (P.has[i]) continue;
      P.has[i] = true; popup(p.x, p.y - 12, '+' + w.name, col); toast(w.name + ': ' + w.howTo);
      if (WEAPONS[P.weapon].id === 'fists' && !P.car && !RAMP.on) P.weapon = i;
    } else {                                                         // a gun or a bomb: yours, loaded, with its spare rounds
      if (P.has[i] && P.ammo[i] >= w.maxAmmo) continue;
      const fresh = !P.has[i]; P.has[i] = true;
      if (fresh) P.mag[i] = Math.max(P.mag[i], w.mag);
      P.ammo[i] = Math.min(Math.max(w.maxAmmo, P.ammo[i]), P.ammo[i] + (p.drop ? 0 : w.ammo) + (fresh ? 0 : w.mag));   // a dropped gun: just what was in it, one magazine
      popup(p.x, p.y - 12, '+' + w.name, col); if (fresh) toast(w.name + ': ' + w.howTo);
      if (fresh && !P.car && !RAMP.on && (isMelee(WEAPONS[P.weapon]) || P.mag[P.weapon] + P.ammo[P.weapon] <= 0)) P.weapon = i;   // a new gun goes into your hand
    } }
    Snd.pickup();
    if (p.fixed) continue;
    if (p.drop) { WPICKS.splice(k, 1); continue; }                    // gone for good
    p.spot.used = null; WPICKS.splice(k, 1); wpQ.push({ t: gameT + WP_BACK, wi: p.wi, ammo: p.ammo, item: p.item, key: p.key });   // comes back elsewhere later
  }
  for (let k = wpQ.length - 1; k >= 0; k--) {
    if (wpQ[k].t > gameT) continue;
    const q = wpQ[k], s = freeSpot(Math.random, { x: P.x, y: P.y, r: offDist() + 200 }, q.key);   // out of sight
    if (s) { putPick(s, q.wi, q.ammo, false, q.item); wpQ.splice(k, 1); } else q.t = gameT + 5;
  }
}

/* ---------- drawing: the weapon (or its ammo box) turning inside a bubble of its colour, a glow on the ground ---------- */
const _bub = {}, _rim = {}, RIM_G = new THREE.RingGeometry(0.93, 1.02, 40).rotateX(-Math.PI / 2), rimMat = c => _rim[c] || (_rim[c] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
function bubbleMat(col, faint) {
  const k = col + (faint ? 'f' : ''); return _bub[k] || (_bub[k] = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: faint ? 0.07 : 0.2, depthWrite: false }));
}
function syncWeaponPicks(time) {
  const R = visRadius() * 1.25;
  for (const p of WPICKS) {
    if (Math.abs(p.x - cam.x) > R || Math.abs(p.y - cam.y) > R) continue;   // far ones are dropped (js/11 sweepDynamic) and rebuilt when near
    const w = p.item ? ITEM[p.item] : WEAPONS[p.wi], faint = !p.ammo && !p.item && (p.fixed || (p.drop && isMelee(w))) && P.has[p.wi];
    if (!p.mesh) {
      const g = new THREE.Group(), it = p.item ? itemModel(p.item) : p.ammo ? ammoModel(w.color) : weaponModel(w.id, w.color), spin = new THREE.Group(); spin.add(it);
      if (!p.ammo && !p.item) { const b = new THREE.Box3().setFromObject(it), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); it.position.sub(c); spin.scale.setScalar(Math.min(1.6, 18 / Math.max(5, s.x, s.y, s.z))); }   // centred, filling the bubble
      g.add(spin);
      const bub = new THREE.Mesh(GSph, bubbleMat(w.color, false)); bub.scale.setScalar(11); bub.position.y = 13; g.add(bub);
      const glow = new THREE.Mesh(GP, glowMat(w.color, 0.6)); glow.scale.set(46, 1, 46); glow.position.y = 1.2; g.add(glow);
      const rim = new THREE.Mesh(RIM_G, rimMat(w.color)); rim.scale.setScalar(11); rim.position.y = 13; g.add(rim);   // a crisp outline seen from above
      g.userData = { spin, bub, rim, faint: null }; p.mesh = g; scene.add(g);
    }
    track(p); const u = p.mesh.userData;
    if (u.faint !== faint) { u.faint = faint; u.bub.material = bubbleMat(w.color, faint); u.rim.visible = !faint; }   // a melee weapon you carry: faint, no rim
    if (p.item === 'bribe') { const c = Math.floor(time / 0.35) % 2 ? '#2f6bff' : w.color; u.bub.material = bubbleMat(c, false); u.rim.material = rimMat(c); }   // flashing like a light bar
    p.mesh.position.set(p.x, groundH(p.x, p.y), p.y); p.mesh.visible = !(p.drop && p.until - gameT < 10 && Math.floor(gameT * 6) % 2);   // blinking: about to go
    u.spin.position.y = 13 + Math.sin(p.bob) * 1.6; u.spin.rotation.y = time * 1.4; u.bub.scale.setScalar(11 + Math.sin(p.bob * 1.3) * 0.5);
  }
}
