'use strict';
/* ---------- 9. GAME FLOW & MAIN LOOP ---------- */
function resetGame() {
  genWorld(); buildMiniMap(); buildCity(); clearDynamic();
  cars = []; peds = []; officers = []; pickups = []; parts = []; decals = []; pops = []; tracers = []; skids = [];
  const ci = Math.floor(N / 2), cj = Math.floor(N / 2), ox = ci * CELL, oy = cj * CELL, sp = cornerPos(ci, cj, 0);
  Object.assign(P, { x: sp[0], y: sp[1], ang: 0, vx: 0, vy: 0, hp: 100, car: null, weapon: 0, ammo: [60, 120], mag: [7, 30], rel: 0, relW: -1, trig: false, act: null, cool: 0, flash: 0, score: 0, kills: 0,
    heat: 0, stars: 0, maxStars: 0, sinceCrime: 99, dead: false, dry: false, bob: 0, hurtT: 0, gear: 'D', busted: false }); updateGearUi();
  cam.x = P.x; cam.y = P.y; cam.zoom = ZOOM_BASE; cam.shake = 0; gameT = 0;
  const starter = makeCar('sedan', ox + 90, oy + 150, -Math.PI / 2, null, '#d94f4f'); cars.push(starter);
  cars.push(makeCar('sports', ox + 90, oy + 330, -Math.PI / 2, null, '#3fe0ff'));
  cars.push(makeCar('truck', ox + 160, oy + 60, 0, null, '#3d6fb0'));
  for (let k = 0; k < 32; k++) spawnTraffic(true);
  for (let k = 0; k < 14; k++) spawnParked(true);
  for (let k = 0; k < 50; k++) spawnPedNear(true);
  for (let k = 0; k < 6; k++) spawnFootCop(true);
  for (let k = 0; k < 40; k++) spawnPickup();
  spawnT = copT = offT = 0;
  $('wasted').style.display = 'none'; $('wasted').textContent = 'WASTED';
}
function startGame() {
  Snd.init(); resetGame(); state = 'play';
  $('overlay').hidden = true; $('hud').hidden = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  toast('FIND A CAR. CAUSE SOME TROUBLE.');
}
function showOver() {
  state = 'over';
  if (P.score > best) { best = P.score; try { localStorage.setItem('blockrunner.best', String(best)); } catch (e) { } }
  const s = Math.floor(gameT), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
  $('oScore').textContent = P.score; $('oBest').textContent = best; $('oKills').textContent = P.kills;
  $('oStars').textContent = P.maxStars; $('oTime').textContent = mm + ':' + ss;
  Snd.setEngine(false, 0, 0); Snd.setScreech(0); Snd.setSiren(0, 0);
  $('overCard').querySelector('h1').textContent = P.busted ? 'BUSTED' : 'WASTED';
  $('shifter').hidden = true; $('startCard').hidden = true; $('overCard').hidden = false; $('overlay').hidden = false; $('hud').hidden = true;
  $('wasted').style.display = 'none';
}
$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);

function handleKeys() {
  if (state === 'menu') { if (pressed.Enter || pressed.NumpadEnter) startGame(); }
  else if (state === 'over') { if (pressed.Enter || pressed.KeyR) startGame(); }
  else if (state === 'play') {
    if (pressed.KeyR && !P.car) startReload(P.weapon);
    if (pressed.Digit1) P.weapon = 0;
    if (pressed.Digit2) P.weapon = 1;
    if (pressed.wheel) P.weapon = 1 - P.weapon;
    if (pressed.KeyE || pressed.KeyF) tryEnterExit();
  }
  if (pressed.KeyM) Snd.toggle();
  for (const k in pressed) delete pressed[k];
}

/* speed -> zoom: the faster you go the further the camera pulls back, so you can see what is coming */
const ZOOM_BASE = 1.25, ZOOM_CAR_MIN = 0.6, ZOOM_FOOT_MIN = 0.93, ZOOM_CAR_TOP = 520 * SPEED_K, ZOOM_FOOT_TOP = 235 * SPEED_K, ZOOM_OUT_RATE = 1.3, ZOOM_IN_RATE = 2.2;
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
  gameT += dt;
  if (!idle && !P.dead) updatePlayer(dt, readInput());
  updateCars(dt); updatePeds(dt); updateOfficers(dt);
  if (!idle) updatePickups(dt);
  manageSpawns(dt); updateParticles(dt);
  if (!idle && P.heat > 0 && P.sinceCrime > 5) {
    let near = false;
    for (const c of cars) if (c.driver === 'cop' && dist(c.x, c.y, P.x, P.y) < 420) { near = true; break; }
    if (!near) for (const o of officers) if (!o.dead && dist(o.x, o.y, P.x, P.y) < 420) { near = true; break; }
    P.heat = Math.max(0, P.heat - (near ? 0.7 : 5) * dt); updateStars();
  }
  if (!idle) {
    const c = P.car;
    if (c && !P.dead) { Snd.setEngine(true, carSpeed(c) / c.t.max, c.thr); Snd.setScreech(carSpeed(c) > 80 ? clamp((c.slip - 80) / 160, 0, 1) : 0); }
    else { Snd.setEngine(false, 0, 0); Snd.setScreech(0); }
    let nd = 1e9; for (const o of cars) if (o.driver === 'cop' && !o.dead) nd = Math.min(nd, dist(o.x, o.y, P.x, P.y));
    Snd.setSiren(P.stars > 0 && nd < 1000 ? 1 - nd / 1000 : 0, gameT);
  }
  updateCam(dt, idle);
}

let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts;
  handleKeys();
  if (state === 'preview') { pvFrame(); return; }
  if (state === 'play') update(rdt, false);
  else if (state === 'dying') { update(rdt * 0.35, false); deadTimer += rdt; if (deadTimer > 2.4) showOver(); }
  else update(rdt, true);
  render(ts / 1000);
  if (state === 'play' || state === 'dying') updateHud(ts / 1000);
}

