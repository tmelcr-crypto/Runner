'use strict';
/* ---------- 9. GAME FLOW & MAIN LOOP ---------- */
function startSpot() {                       // the longest road near the map's start point
  const rs = nearRoads(MAP.start[0], MAP.start[1], 900).sort((u, v) => RE[v.e].len - RE[u.e].len);
  return rs.length ? rs[0].e : nearestRoad(MAP.start[0], MAP.start[1], 3000).e;
}
function streetIn(name) {                   // a random street, in district `name` if given (New game: START IN)
  const ok = [], q = {};
  for (const E of RE) { if (E.nt || E.len < 240) continue; edgeAt(E.i, E.len / 2, q); if (shoreDist(q.x, q.y) > 40 && (!name || districtAt(q.x, q.y) === name)) ok.push(E.i); }
  return ok.length ? pick(ok) : startSpot();
}
function resetGame(sv) {                     // a new game with the options in OPT, or the saved game sv (js/15b)
  genWorld(); buildMiniMap(); buildCity(); clearDynamic(); svReset();
  clearRockets(); resetBlast(); heliReset(); cars = []; peds = []; officers = []; pickups = []; parts = []; decals = []; pops = []; tracers = []; skids = []; pickupQ = [];
  safeReset();                                                     // the safehouses: the free room yours, nothing else (a saved game says more, js/08s)
  const e = OPT.start === 'usual' ? startSpot() : streetIn(OPT.start === 'random' ? null : OPT.start), E = RE[e], s0 = E.len / 2;
  const at = (s, off) => { const q = edgeAt(e, clamp(s, 20, E.len - 20), {}); return { x: q.x - q.ty * off, y: q.y + q.tx * off, ang: Math.atan2(q.ty, q.tx) }; };
  let sp = at(s0 - 60, SIDEWALK); if (pedBlocked(sp.x, sp.y) || shoreDist(sp.x, sp.y) < 8) sp = at(s0 - 60, -SIDEWALK);
  const side = sp.x === at(s0 - 60, SIDEWALK).x ? 1 : -1, load = sv ? saveSpot(sv) : null;   // a saved game puts you back where you were
  const home = !sv && OPT.start === 'usual' ? safeStart() : null;  // a new game: at the Colony's door (js/08s)
  if (load) sp = load; else if (home) sp = home;
  Object.assign(P, { x: sp.x, y: sp.y, ang: sp.ang, vx: 0, vy: 0, hp: 100, armor: 0, car: null, weapon: Math.max(0, WEAPONS.findIndex(w => w.start)), has: startHas(), ammo: startAmmo(), mag: startMag(), swing: null, rel: 0, relW: -1, trig: false, act: null, cool: 0, flash: 0, score: 0, kills: 0,
    heat: 0, stars: 0, maxStars: 0, sinceCrime: 99, dead: false, dry: false, bob: 0, hurtT: 0, busted: false, carSwap: null, boostH: 0,
    outfit: CL_START(), wardrobe: CLOTHES_TABLE.items.filter(i => !i.shop).map(i => i.id) });   // the clothes you start in (js/01n)
  cam.x = P.x; cam.y = P.y; cam.zoom = ZOOM_BASE; cam.shake = 0; gameT = 0; H.zone = ''; streamCity(true);
  if (load && load.car) { const c = load.car; c.searched = true; c.driver = 'player'; c.mode = 'player'; cars.push(c); P.car = c; }   // back in the car you saved in
  else if (!sv) {                                                  // starter cars in the parking lane on the player's side - at the Colony, one in your space
    const kerb = PARK_OFF, kerbT = Object.keys(CAR_TYPES).filter(k => CAR_TYPES[k].parked > 0 && CAR_TYPES[k].wid <= KERB_W).sort((a, b) => CAR_TYPES[b].parked - CAR_TYPES[a].parked);
    if (home && home.h.spots.length) home.h.keep[0] = { type: kerbT[0], color: '#d94f4f' };
    else for (const [ds, type, col] of [[-60, kerbT[0], '#d94f4f'], [50, kerbT[1] || kerbT[0], '#3fe0ff'], [160, kerbT[0], '#3d6fb0']])
      for (const dd of [0, 20, -20, 40, 60]) { const q = at(s0 + ds + dd, kerb * side); if (kerbFits(q.x, q.y, q.ang, type)) { cars.push(makeCar(type, q.x, q.y, q.ang, null, col)); break; } }
  }
  placeJobs();                                                     // the taxi ranks and the job markers, before any car is parked (js/08n)
  const crowd = OPT.crowd;                                       // quieter or busier streets (New game options)
  for (let k = 0; k < 32 * crowd; k++) spawnTraffic(true);
  for (let k = 0; k < 14 * crowd; k++) spawnParked(true);
  for (const L of LOTS) L.filled = false; fillLots(true);
  for (let k = 0; k < 50 * crowd; k++) if (k % 3 || !spawnStroller(true)) spawnPedNear(true);   // a third of them strolling off the sidewalks
  for (let k = 0; k < COP.footPatrols; k++) spawnFootCop(true);
  if (feat('townCash')) for (let k = 0; k < ECO.townN; k++) spawnPickup();   // cash stacks around town (js/01i)
  CALLS = []; clearTeams(); if (feat('hiddenCars')) placeHidden();               // the tank at its secret spot (js/08c)
  placeWeapons(); clearGrenades();                                 // weapons and ammo hidden off the streets (js/08d)
  placeStores(); placeFlights(); placeClothes(); jobLoad(null); placeRaces(); raceLoad(null); statReset(); prisonReset(); pnsReset(); tuneReset(); salvReset(); rbReset(); fwReset();   // the six stores (js/08e); no job levels or rewards yet (a saved game fills them in, js/08n); the phone booths, no race (js/08o)
  resetFence(); resetPlanes();                                     // the airport fence whole again, planes at the gates (js/10f, js/08i)
  resetPlaces(); resetShips();                                     // guards, barriers, the base and its armoury, ships at their berths (js/08j, js/08k)
  rampReset();                                                     // no rampage running, none found yet (a saved game says which, js/15b)
  if (P.car && P.car.t.hidden) cars = cars.filter(c => !(c.keep && c.type === P.car.type && c !== P.car));   // saved while driving it: it is not back at its spot too
  spawnT = 0; resetPolice(); refuges = null; resetSky(); autoT = 0;
  if (sv) applySave(sv);                                        // score, weapons, health, the clock and the weather (js/15b)
  resetDelivery(sv ? sv.dlv || {} : null);                         // the car wanted at the docks (js/08m)
  $('wasted').style.display = 'none'; $('wasted').textContent = 'WASTED';
}
function startGame(sv) {                     // sv: a saved game to carry on (js/15b), otherwise a new game with OPT
  Snd.init(); toggleBigMap(false); toggleWheel(false); resetGame(sv); state = 'play'; closeMenus();
  $('hud').hidden = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  toast(sv ? 'GAME LOADED' : 'FIND A CAR. CAUSE SOME TROUBLE.');
}
function showOver() {
  state = 'over'; toggleBigMap(false); toggleWheel(false);
  if (P.score > best) { best = P.score; try { localStorage.setItem('blockrunner.best', String(best)); } catch (e) { } }
  const s = Math.floor(gameT), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
  $('oScore').textContent = money(P.score); $('oBest').textContent = money(best); $('oKills').textContent = P.kills;
  $('oStars').textContent = P.maxStars; $('oTime').textContent = mm + ':' + ss;
  Snd.setEngine(false, 0, 0); Snd.setScreech(0); Snd.setSiren(0, 0); Snd.setRotor(0);
  $('overCard').querySelector('h1').textContent = P.busted ? 'BUSTED' : 'WASTED';
  showCard('overCard', true); $('hud').hidden = true;
  $('wasted').style.display = 'none';
}

function handleKeys() {
  if (state === 'over') { if (pressed.KeyR) startGame(); }         // menus: Enter, the arrows and Esc are handled in js/15b
  else if (state === 'shop') { if (pressed.KeyE || pressed.KeyF) { if (CLS.at) closeClothes(); else closeShop(); } }   // E leaves the store (or the clothes shop) again
  else if (state === 'ramp') { if (pressed.KeyE || pressed.KeyF) closeRamp(); }   // and the rampage's screen
  else if (state === 'job') { if (pressed.KeyE || pressed.KeyF) closeJob(); }     // and a job's START card (js/08n)
  else if (state === 'race') { if (pressed.KeyE || pressed.KeyF) closeRaceCard(); }   // and a race's card (js/08o)
  else if (state === 'pns') { if (pressed.KeyE || pressed.KeyF) closePns(false); }     // and the spray garage's colours (js/08q)
  else if (state === 'tune') { if (pressed.KeyE || pressed.KeyF) closeTune(false); }   // and the tuning workshop's card (js/08y)
  else if (state === 'safe') { if (pressed.KeyE || pressed.KeyF) closeSafeCard(); }    // a safehouse's FOR SALE card, the stash (js/08s)
  else if (state === 'fly') { if (pressed.KeyE || pressed.KeyF) closeFlyCard(); }      // the departures desk (js/08v)
  else if (state === 'cut') { if (pressed.Escape || pressed.Enter || pressed.Space) cutSkip(); }   // a cutscene: only its skip button (js/15c)
  else if (state === 'side') {                                     // inside a tower (js/08t): UP at doors, the stairs, the elevator; DOWN takes the stairs down
    if (pressed.ArrowUp || pressed.KeyW || pressed.KeyE || pressed.KeyF) svPress('up');
    if (pressed.ArrowDown || pressed.KeyS) svPress('down');
    if (pressed.Escape || pressed.KeyP) { if (!$('svLift').hidden) $('svLift').hidden = true; else pauseGame(); }
  }
  else if (state === 'play') {
    const dig = [1, 2, 3, 4, 5, 6, 7, 8, 9].findIndex(n => pressed['Digit' + n]);
    if (wheelOpen) {                                              // the weapon wheel is up and the game waits: a number picks, Q / Esc / Tab closes
      if (dig >= 0 && dig < owned().length) pickWeapon(owned()[dig]); else if (pressed.KeyQ || pressed.Escape || pressed.Tab) toggleWheel(false);
    } else {
      if (pressed.KeyR && !P.car && !isMelee(WEAPONS[P.weapon])) startReload(P.weapon);
      if ((pressed.KeyR || pressed.radio) && P.car) Radio.next();   // in a car R tunes the radio (js/02b)
      const own = owned();                                          // only the weapons you have: 1, 2, 3... and the mouse wheel
      const lock = (dig >= 0 || pressed.wheel || pressed.KeyQ) && rampLocked('WEAPON LOCKED DURING THE RAMPAGE');   // js/08f
      if (!lock && dig >= 0 && dig < own.length) P.weapon = own[dig];
      if (!lock && pressed.wheel) { const k = own.indexOf(P.weapon); P.weapon = own[(Math.max(0, k) + pressed.wheel + own.length) % own.length]; }
      if (!lock && pressed.KeyQ && !bigOpen) toggleWheel(true);
      if (pressed.Tab) toggleBigMap(); else if (pressed.Escape && bigOpen) toggleBigMap(false); else if (pressed.Escape || pressed.KeyP) pauseGame();
      if ((pressed.KeyE || pressed.KeyF || pressed.Enter || pressed.NumpadEnter) && RACE.res) closeRaceRes();   // the race's results (js/08o)
      else if ((pressed.KeyE || pressed.KeyF) && FERRY.rider && FERRY.state === 'sail') ferrySkip();   // aboard the ferry: straight across (js/08zp)
      else if ((pressed.KeyE || pressed.KeyF) && !bigOpen) { const s = shopKey(), r = rampKey(), k = raceKey(), h = safeKey(), v = showKey(); if (r) openRamp(r); else if (k) openRaceCard(k); else if (flyKey()) openFlyCard(); else if (h) safeUse(h); else if (v) openCarCard(v); else if (s) openShop(s); else tryEnterExit(); }   // a safehouse's door, bed, wardrobe or stash (js/08s)   // at a store's door E goes in, at a skull the rampage's screen
    }
  }
  if (pressed.KeyM) Snd.toggle();
  for (const k in pressed) delete pressed[k];
}

/* speed -> zoom: the faster you go the further the camera pulls back, so you can see what is coming */
const ZOOM_BASE = 1.25, ZOOM_CAR_MIN = 0.6, ZOOM_FOOT_MIN = 0.93, ZOOM_CAR_TOP = 140 * KMH, ZOOM_FOOT_TOP = SPRINT * FOOT, ZOOM_OUT_RATE = 1.3, ZOOM_IN_RATE = 2.2;
function speedZoom(spd, inCar) {
  const f = clamp(spd / (inCar ? ZOOM_CAR_TOP : ZOOM_FOOT_TOP), 0, 1), e = f * f * (3 - 2 * f);      // smoothstep: gentle at low speed, full at the top
  return ZOOM_BASE * lerp(1, inCar ? ZOOM_CAR_MIN : ZOOM_FOOT_MIN, e);        // the whole range sits 25% closer
}
function updateCam(dt, idle) {
  if (idle) { const a = gameT * 0.07; cam.x = P.x + Math.cos(a) * 520; cam.y = P.y + Math.sin(a * 1.3) * 420; cam.zoom = 0.9; }
  else {
    const t = P.car || P, k = 1 - Math.exp(-6 * dt);
    cam.x += (t.x + (t.vx || 0) * 0.28 - cam.x) * k; cam.y += (t.y + (t.vy || 0) * 0.28 - cam.y) * k;
    const spd = P.car ? carSpeed(P.car) : Math.hypot(P.vx, P.vy), tz = speedZoom(spd, !!P.car);
    cam.zoom += (tz - cam.zoom) * (1 - Math.exp(-(tz < cam.zoom ? ZOOM_OUT_RATE : ZOOM_IN_RATE) * dt));
  }
  cam.shake = Math.max(0, cam.shake - dt * 28);
}
function update(dt, idle) {
  gameT += dt; updateSky(dt);                                          // the clock and the weather (js/12d)
  const inp = idle ? null : readInput(), n = Math.min(4, Math.ceil(dt * 60 - 0.01)), h = dt / n;   // physics in steps of at most 1/60 s,
  for (let k = 0; k < n; k++) { if (!idle && !P.dead) updatePlayer(h, inp); updateCars(h); updateRockets(h); updateHoming(h); updatePlanes(h); updateShips(h); }       // so a fast car (or rocket) cannot pass through a wall
  updatePeds(dt); updateOfficers(dt); separatePeople(); updateBlast(dt); smashProps(dt); updateTrees(dt); fwTick(dt); visitTick(dt); updateGrenades(dt);   // street junk and trees under wheels (js/12e, js/12g)
  if (!idle) { updatePickups(dt); updateWeaponPicks(dt); autosaveTick(dt); rampTick(dt); jobTick(dt); raceTick(dt); pnsTick(dt); tuneTick(dt); salvTick(dt); safeTick(dt); }   // safehouse doors and kept cars (js/08s)   // vehicle jobs (js/08n)   // the autosave (js/15b); rampages: found, the clock, people and cars brought in (js/08f)
  updateMedics(dt);                                                 // paramedics with their stretchers (js/08h)
  planesTick(dt);                                                   // the airport: the next landing or take-off, burning wrecks (js/08i)
  placesTick(dt); shipsTick(dt); deliveryTick(dt);                                    // guards, barriers, the base; ships and cranes (js/08j, js/08k)
  manageSpawns(dt); updateServices(dt); updateParticles(dt);
  if (!idle) { updatePolice(dt); updateHeli(dt); rbTick(dt); statTick(dt); prisonTick(dt); }   // roadblocks ahead of you (js/08zr); distance, 100% and the gold car (js/08zs)                  // who sees you, the search, the stop order, sending cars (js/08b); the helicopter (js/08u)
  if (!idle) {
    const c = P.car;
    if (c && !P.dead) { Snd.setEngine(true, carSpeed(c) / c.t.max, c.thr); Snd.setScreech(carSpeed(c) > 80 ? clamp((c.slip - 80) / 160, 0, 1) : 0); }
    else { Snd.setEngine(false, 0, 0); Snd.setScreech(0); }
    let nd = 1e9, na = 1e9; for (const o of cars) if (!o.dead) { if (o.driver === 'cop') nd = Math.min(nd, dist(o.x, o.y, P.x, P.y)); else if (o.task && o.t.job === 'ambulance' && o.driver === 'ai' && feat('medics')) na = Math.min(na, dist(o.x, o.y, P.x, P.y)); }
    Snd.setSiren(Math.max(P.stars > 0 && nd < 1000 ? 1 - nd / 1000 : 0, na < 900 ? 1 - na / 900 : 0), gameT);   // police after you; an ambulance on a call (js/08h)
  }
  updateCam(dt, idle);
}

let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts;
  handleKeys(); cityFrame(rdt);                                     // the city's own sound follows what is around (js/02d)
  if (state === 'preview') { pvFrame(); return; }
  if (state === 'sleep' && SAFEST.sleeping) sleepTick(rdt);                // sleeping in a safehouse: the clock runs on (js/08s)
  if (SV.on) { if (state === 'side') sideFrame(rdt, ts / 1000); Radio.update(rdt); return; }   // inside a tower: the side-on view instead of the city (js/08t)
  if (state === 'cut') cutFrame(rdt);                              // a cutscene: the shots move their actors and the camera (js/15c)
  else if (state === 'play') { if (!bigOpen && !wheelOpen) update(rdt, false); }
  else if (state === 'dying') { update(rdt * 0.35, false); deadTimer += rdt; if (deadTimer > 2.4) { if (COP.respawn) respawn(); else showOver(); } }
  else if (state !== 'pause' && state !== 'shop' && state !== 'ramp' && state !== 'job' && state !== 'race' && state !== 'pns' && state !== 'tune' && state !== 'safe' && state !== 'sleep' && state !== 'fly') update(rdt, true);   // paused, in a store, at a rampage or a job's card: the picture stands still behind the menu
  Radio.update(rdt);                                                // the car radio: which station, fading in and out
  render(ts / 1000); afterRender();                                 // afterRender: a picture of the screen for a saved game (js/15b)
  if (state === 'play' || state === 'dying') updateHud(ts / 1000);
}

