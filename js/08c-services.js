'use strict';
/* ---------- 6e. CITY SERVICES & SPECIAL VEHICLES ----------
   Vehicles with a job (js/01c): the trash truck stops at the bins along its way; an ambulance comes for the dead and takes the body
   away; a fire engine comes to explosions and burning wrecks and hoses them down. A vehicle with that job already in traffic nearby
   takes the call, otherwise one comes from further away. On a call it drives the shortest way by road (js/07 routeEdge) at up to
   65 km/h with its lights flashing.
   Also here: vehicles parked at secret spots (the tank), and vehicle weapons (the tank's rockets, fired by you). */
let BINS = [], CALLS = [], svcT = 0;                  // BINS: the street bins { x, y, t: when last emptied }, filled by js/10
const svcSpawnT = { ambulance: 0, fire: 0 }, SVC_REACH = 2200;
function callFor(kind, x, y, obj) {                  // a body for an ambulance, a blast or a burning wreck for a fire engine
  if (!Object.values(CAR_TYPES).some(t => t.job === kind)) return;
  if (CALLS.some(k => k.kind === kind && !k.done && dist(k.x, k.y, x, y) < (kind === 'fire' ? 300 : 40))) return;
  CALLS.push({ kind, x, y, obj, car: null, t: gameT, done: false });
}
const bodyTime = p => CALLS.some(k => k.obj === p && !k.done) ? 120 : 25;   // a body waits for the ambulance that is coming for it
function startCall(c, k) {
  const field = new Float64Array(RN.length), r = roadFieldTo(k.x, k.y, field); if (!r) return false;
  c.task = { k, field, r, on: false, work: 0, t: gameT }; k.car = c; c.nx = null; return true;
}
function endCall(c) { if (!c.task) return; c.task.k.car = null; c.task = null; c.nx = null; c.stopT = 0; }
function updateServices(dt) {
  if ((svcT -= dt) > 0) return; svcT = 0.5;
  for (const c of cars) if (c.task && (c.dead || c.driver !== 'ai' || gameT - c.task.t > 90)) endCall(c);   // stolen, wrecked or hopelessly stuck
  for (let i = CALLS.length - 1; i >= 0; i--) {
    const k = CALLS[i], body = k.kind === 'ambulance';
    if (k.done || gameT - k.t > 120 || dist(k.x, k.y, P.x, P.y) > SVC_REACH || (body && !(peds.includes(k.obj) || officers.includes(k.obj)))) {
      if (k.car && k.car.task && k.car.task.k === k) endCall(k.car);
      CALLS.splice(i, 1);
    }
  }
  for (const k of CALLS) {
    if (k.car && k.car.task && k.car.task.k === k && cars.includes(k.car)) continue;
    k.car = null; let best = null, bd = SVC_REACH;
    for (const c of cars) if (c.t.job === k.kind && c.driver === 'ai' && !c.dead && !c.task) { const d = dist(c.x, c.y, k.x, k.y); if (d < bd) { bd = d; best = c; } }
    if (!best && gameT > svcSpawnT[k.kind]) {                        // none around: one comes from further away
      const type = pickType('traffic', t => t.job === k.kind) || Object.keys(CAR_TYPES).find(id => CAR_TYPES[id].job === k.kind);
      const s = laneSpot(offDist(), offDist() + 600, null, type);
      if (s) { best = makeCar(type, s.x, s.y, s.ang, 'ai'); best.e = s.e; best.fw = s.fw; best.s = s.s; cars.push(best); svcSpawnT[k.kind] = gameT + 6; }
    }
    if (best) startCall(best, k);
  }
}
function serviceStop(c, dt) {                        // called by aiDrive for vehicles with a job: true while it stands still for the job
  const hold = () => { const vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang); c.thr = vf > 8 ? -1 : vf < -8 ? 1 : 0; c.str = 0; c.hb = Math.abs(vf) < 8; };
  if (c.task) {
    const T = c.task, k = T.k;
    if (!T.on && dist(c.x, c.y, k.x, k.y) < (k.kind === 'fire' ? 170 : 160) + c.t.len / 2) T.on = true;   // at the scene (the body may lie on the far sidewalk)
    if (!T.on) return false;
    hold(); T.work += dt;
    if (k.kind === 'ambulance') { if (T.work > 3.5) { if (k.obj) k.obj.deadT = 1e9; k.done = true; endCall(c); } }   // the body is taken away
    else { hose(c, k.x, k.y); if (T.work > 6) { douse(k.x, k.y); k.done = true; endCall(c); } }
    return true;
  }
  if (c.t.job !== 'trash') return false;
  if (c.stopT > 0) { c.stopT -= dt; hold(); if (c.stopT <= 0) c.binT = gameT; return true; }   // emptying a bin
  if (gameT - (c.binT || -99) < 4) return false;
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
  for (const b of BINS) {
    if (gameT - b.t < 90 || Math.abs(b.x - c.x) > 90 || Math.abs(b.y - c.y) > 90) continue;
    const rx = b.x - c.x, ry = b.y - c.y, al = rx * fx + ry * fy, lat = Math.abs(-rx * fy + ry * fx);
    if (al > -10 && al < 25 && lat < 70) { b.t = gameT; c.stopT = rand(3, 4.5); hold(); return true; }   // a bin on its side of the street
  }
  return false;
}
function hose(c, x, y) {                             // water from the fire engine's ladder toward the fire
  const a = Math.atan2(y - c.y, x - c.x), d = dist(c.x, c.y, x, y);
  for (let k = 0; k < 3; k++) {
    const s = rand(0.85, 1.15) * Math.max(120, d) / 0.9, aa = a + rand(-0.08, 0.08);
    addP({ x: c.x, y: c.y, z: 26, vz: rand(150, 200), grav: 380, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: 0.9, max: 0.9, s0: 3, s1: 7, col: pick(['#cfeeff', '#9fd4ff', '#ffffff']), drag: 0.4, alpha: 0.8 });
  }
  if (Math.random() < 0.3) addP({ x: x + rand(-30, 30), y: y + rand(-30, 30), z: 6, vz: rand(15, 35), grav: 0, vx: rand(-10, 10), vy: rand(-10, 10), life: rand(1.2, 2), max: 2, s0: 10, s1: 28, col: '#e6ecf2', drag: 1, alpha: 0.5 });   // steam
}
function douse(x, y) {                               // put out burning cars and smoking wrecks around (x, y)
  for (const c of cars) {
    if (dist(c.x, c.y, x, y) > 220) continue;
    if (c.burn > 0) { c.burn = 0; c.dead = true; c.deadT = 0; c.driver = null; }   // burning: put out before it blows
    if (c.dead) c.doused = true;
  }
}

/* ---------- vehicles at secret spots: always the same parking lots, the ones furthest from the start, one per lot ---------- */
function placeHidden() {
  const lots = LOTS.filter(L => L.w >= 130 && L.d >= (L.rows === 2 ? 180 : 110) && !(L.owner && L.owner.special)).sort((a, b) => dist(b.cx, b.cy, MAP.start[0], MAP.start[1]) - dist(a.cx, a.cy, MAP.start[0], MAP.start[1]));
  const used = [];
  for (const id in CAR_TYPES) for (let n = 0; n < CAR_TYPES[id].hidden; n++) {
    const L = lots.find(o => !used.includes(o) && used.every(u => dist(u.cx, u.cy, o.cx, o.cy) > 3000)) || lots.find(o => !used.includes(o)); if (!L) return;
    used.push(L); const z = L.rows === 2 ? 0 : 36, ca = Math.cos(L.a), sa = Math.sin(L.a);   // across the aisle, clear of the stalls
    const c = makeCar(id, L.cx - sa * z, L.cy + ca * z, L.a, null); c.keep = true; cars.push(c);
  }
}

/* ---------- vehicle weapons: rockets from the tank, straight ahead, one every 1.5 s, no ammo needed ---------- */
function vehicleGun(c, inp, dt) {
  c.gunT = (c.gunT || 0) - dt;
  if (!inp.fire || c.gunT > 0 || c.t.weapon !== 'rockets') return;
  const w = WEAPONS.find(q => q.rocket), a = c.ang; c.gunT = 1.5;
  launchRocket({ x: c.x + Math.cos(a) * 900, y: c.y + Math.sin(a) * 900 }, w, c); Snd.rocket();
  c.vx -= Math.cos(a) * 30; c.vy -= Math.sin(a) * 30; cam.shake = Math.max(cam.shake, w.shake + 2);   // the recoil
  alertPeds(c.x, c.y, 500); reportCrime(w.heat * COP.crime.gunfire, w.hear, undefined, undefined, true);
}
