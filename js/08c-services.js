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
  if (!feat('services')) return;                                   // a mode without city services (js/01j)
  if (!Object.values(CAR_TYPES).some(t => t.job === kind)) return;
  if (CALLS.some(k => k.kind === kind && !k.done && dist(k.x, k.y, x, y) < (kind === 'fire' ? 300 : 40))) return;
  CALLS.push({ kind, x, y, obj, car: null, t: gameT, done: false });
}
const bodyTime = p => p.gibbed ? 0 : p.medicHold ? 1e9 : CALLS.some(k => k.obj === p && !k.done) ? 120 : 25;   // a body waits for the ambulance coming for it, or the paramedics who have it (js/08h)
function startCall(c, k) {
  const field = new Float64Array(RN.length), r = roadFieldTo(k.x, k.y, field); if (!r) return false;
  c.task = { k, field, r, on: false, work: 0, t: gameT }; k.car = c; c.nx = null; return true;
}
function endCall(c) { if (!c.task) return; if (c.task.k) c.task.k.car = null; c.task = null; c.nx = null; c.stopT = 0; }
function updateServices(dt) {
  if ((svcT -= dt) > 0) return; svcT = 0.5;
  for (const c of cars) if (c.task && (c.dead || c.driver !== 'ai' || gameT - c.task.t > (c.task.hosp ? 150 : 90))) endCall(c);   // stolen, wrecked or hopelessly stuck
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
  if (c.task && c.task.hosp) {                                    // taking the dead to hospital (js/08h): stop near its door, then out they get
    const T = c.task, d = T.hosp.door;
    if (!T.on && dist(c.x, c.y, d.x, d.y) < 170 + c.t.len / 2) T.on = true;
    if (!T.on) return false;
    hold(); if (Math.abs(c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang)) < 8) atHospital(c);
    return true;
  }
  if (c.task) {
    const T = c.task, k = T.k;
    if (!T.on && dist(c.x, c.y, k.x, k.y) < (k.kind === 'fire' ? 170 : 160) + c.t.len / 2) T.on = true;   // at the scene (the body may lie on the far sidewalk)
    if (!T.on) return false;
    hold(); T.work += dt;
    if (k.kind === 'ambulance') {
      if (feat('medics')) { if (T.work > 0.6 && Math.abs(c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang)) < 8) startTeam(c, k); }   // stopped: out come the paramedics (js/08h)
      else if (T.work > 3.5) { if (k.obj) k.obj.deadT = 1e9; k.done = true; endCall(c); }   // the body is taken away
    }
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
/* the fire engine's water cannon, when you drive it (js/01m Water cannon): FIRE sprays a jet straight ahead. People and cops in it are
   knocked down and pushed away (no damage - but it counts like a punch for the police), cars are pushed, fires and burning cars put out */
function waterCannon(c, inp, dt) {
  if (!inp.fire) { c.jetT = 0; return; }
  const a = c.ang, ux = Math.cos(a), uy = Math.sin(a), R = STR.waterRange, ox = c.x + ux * c.t.len * 0.25, oy = c.y + uy * c.t.len * 0.25;
  for (let k = 0; k < 3; k++) {                                    // the jet: drops arcing out from the roof
    const s = rand(0.9, 1.1) * R / 0.75, aa = a + rand(-0.05, 0.05);
    addP({ x: ox, y: oy, z: 30, vz: rand(40, 70), grav: 200, vx: Math.cos(aa) * s + c.vx, vy: Math.sin(aa) * s + c.vy, life: 0.75, max: 0.75, s0: 3, s1: 8, col: pick(['#cfeeff', '#9fd4ff', '#ffffff']), drag: 0.3, alpha: 0.8 });
  }
  if (Math.random() < 0.15) Snd.thud(40);
  const inJet = (x, y) => { const rx = x - ox, ry = y - oy, al = rx * ux + ry * uy; return al > 0 && al < R && Math.abs(-rx * uy + ry * ux) < 12 + al * 0.12 ? al : -1; };
  let hitPeople = false;
  const wet = (p, officer) => {
    if (p.dead || p.knocked || inJet(p.x, p.y) < 0) return;
    if (!(p.stunT > 0)) { hitPeople = true; if (officer || p.cop) { addHeat(COP.crime.hurtCop); PS.armedT = gameT; } else if (!provoke(p)) { p.state = 'flee'; p.fl = 5; p.fx = ux; p.fy = uy; } }
    p.stunT = Math.max(p.stunT || 0, STR.waterKnock);
    const st = STR.waterPush * dt, x = p.x + ux * st, y = p.y + uy * st; if (!pedBlocked(x, y)) { p.x = x; p.y = y; }
  };
  for (const p of peds) wet(p, false);
  for (const o of officers) wet(o, true);
  for (const o of cars) {
    if (o === c || o.sunk || inJet(o.x, o.y) < 0) continue;
    const k = STR.waterCarPush * dt / Math.max(0.3, o.t.mass); o.vx += ux * k; o.vy += uy * k;
    if (o.burn > 0 && !(o.jobFire && (o.wetT = (o.wetT || 0) + dt) < JB.fireSpray)) { o.burn = 0; o.dead = true; o.deadT = 0; o.driver = null; }   // put out before it blows: a wreck (a fire of the firefighter job takes a little spraying, js/08n)
    if (o.dead) o.doused = true;
  }
  if (hitPeople && (c.jetT = (c.jetT || 0) - dt) <= 0) {             // like a punch, every half second someone is in the jet
    c.jetT = 0.5; const f = WEAPONS.find(w => w.id === 'fists'); if (f) reportCrime(f.heat * COP.crime.gunfire, f.hear, P.x, P.y, false);
  }
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

/* ---------- vehicle weapons: rockets from the tank, straight ahead, one every 1.5 s, no ammo needed; the fire engine's water cannon ---------- */
function vehicleGun(c, inp, dt) {
  c.gunT = (c.gunT || 0) - dt;
  if (c.t.weapon === 'water') { if (feat('waterCannon')) waterCannon(c, inp, dt); return; }
  if (!inp.fire || c.gunT > 0 || c.t.weapon !== 'rockets') return;
  const w = WEAPONS.find(q => q.rocket) || RK_DEF, a = c.ang; c.gunT = 1.5;
  launchRocket({ x: c.x + Math.cos(a) * 900, y: c.y + Math.sin(a) * 900 }, w, c); Snd.rocket();
  c.vx -= Math.cos(a) * 30; c.vy -= Math.sin(a) * 30; cam.shake = Math.max(cam.shake, w.shake + 2);   // the recoil
  alertPeds(c.x, c.y, 500); reportCrime(w.heat * COP.crime.gunfire, w.hear, undefined, undefined, true);
}
