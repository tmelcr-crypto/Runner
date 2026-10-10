'use strict';
/* ---------- 6c6. PARAMEDICS ----------
   (js/01j medics) An ambulance at a body stops, and two paramedics get out with a stretcher. They carry the body back to the ambulance
   - and one more lying within 30 m, two at most - load it, get in and drive to the nearest hospital with lights and siren. There they
   carry each body to the door, where it is taken in, walk back and drive on as ordinary traffic until the next call. They are ordinary
   people: kill one, or drive off with their ambulance while they are out, and they drop the stretcher and run - the bodies stay where
   they fall and another ambulance comes for them. While both are out the ambulance stands empty. */
let TEAMS = [];
const MED_WALK = 2.4 * MPS, MED_HALF = 11, MED_PAIR = 30 * UNITS_PER_M, MED_PHASE_MAX = 45;
const carRear = c => ({ x: c.x - Math.cos(c.ang) * (c.t.len / 2 + 16), y: c.y - Math.sin(c.ang) * (c.t.len / 2 + 16) });
const aliveBody = b => b && !b.gibbed && (peds.includes(b) || officers.includes(b));
function startTeam(c, k) {                // js/08c: the ambulance has stopped at the scene; the call is done, the team takes over
  const first = k.obj, bodies = [first]; k.done = true; endCall(c);
  let best = null, bd = MED_PAIR;                                    // one more body close by: they take it too (an ambulance on its way to it turns back)
  for (const q of [...peds, ...officers]) {
    if (!q.dead || q === first || q.gibbed || q.medicHold || q.medic) continue;
    const d = dist(q.x, q.y, first.x, first.y); if (d < bd) { bd = d; best = q; }
  }
  if (best) { bodies.push(best); for (const kk of CALLS) if (kk.obj === best) { if (kk.car && kk.car.task && kk.car.task.k === kk) endCall(kk.car); kk.done = true; } }
  for (const b of bodies) { b.medicHold = true; b.deadT = 0; }
  c.driver = null; c.thr = 0; c.str = 0; c.hb = true; c.medics = true;
  const T = { car: c, phase: 'toBody', bodies, cur: null, load: 0, loaded: 0, medics: [], vx: 0, vy: 0, mesh: null, door: null, t: gameT };
  getOut(T); TEAMS.push(T);
}
function getOut(T) {                      // the two climb out at the back with the stretcher
  const r = carRear(T.car); T.x = r.x; T.y = r.y; T.ang = T.car.ang + Math.PI; T.lx = T.x; T.ly = T.y; T.lt = gameT; T.ghost = false;
  T.medics = [0, 1].map(() => { const m = makePed(r.x, r.y); m.medic = true; m.arm = -1; m.shirt = '#f4f6f8'; m.e = -1; m.umb = false; peds.push(m); return m; });
  placeMedics(T);
}
function getIn(T) { for (const m of T.medics) { const i = peds.indexOf(m); if (i >= 0) peds.splice(i, 1); } T.medics = []; }
function placeMedics(T) {                 // one at each end of the stretcher
  const fx = Math.cos(T.ang), fy = Math.sin(T.ang), [a, b] = T.medics;
  for (const [m, s] of [[a, 1], [b, -1]]) { m.x = T.x + fx * MED_HALF * s; m.y = T.y + fy * MED_HALF * s; m.vx = T.vx; m.vy = T.vy; if (!T.vx && !T.vy) m.h3 = T.ang; }
}
function teamWalk(T, tx, ty, dt) {         // the stretcher and its two carriers walk to (tx, ty); true once there
  const dx = tx - T.x, dy = ty - T.y, d = Math.hypot(dx, dy);
  if (d < 10) { T.vx = T.vy = 0; return true; }
  const sp = Math.min(MED_WALK, d / Math.max(dt, 1e-3)); T.ang = Math.atan2(dy, dx); T.vx = dx / d * sp; T.vy = dy / d * sp;
  T.x += T.vx * dt; T.y += T.vy * dt;
  if (!T.ghost) { const o = { x: T.x, y: T.y }; resolveCircle(o, 9); bumpCars(o, 9, { nx: 0, ny: 0 }); T.x = o.x; T.y = o.y; }
  if (gameT - T.lt > 4) { if (dist(T.x, T.y, T.lx, T.ly) < 8) T.ghost = true; T.lx = T.x; T.ly = T.y; T.lt = gameT; }   // stuck behind something: they find their way through
  return false;
}
function setPhase(T, ph, wait) { T.phase = ph; T.wait = wait || 0; T.t = gameT; T.ghost = false; T.lt = gameT; T.lx = T.x; T.ly = T.y; }
function dropAll(T, why) {                // a paramedic dead or the ambulance taken: drop the stretcher and run (stuck: get back in); the bodies stay for another ambulance
  for (const b of T.bodies) {
    if (b.loaded) continue;
    if (b.onStretcher) { b.onStretcher = false; b.x = T.x; b.y = T.y; }
    b.medicHold = false; b.deadT = 0; if (aliveBody(b)) callFor('ambulance', b.x, b.y, b);
  }
  if (why === 'stuck' && cars.includes(T.car) && !T.car.driver) { getIn(T); T.car.driver = 'ai'; T.car.hb = false; T.car.medics = false; T.load = 0; return; }   // could not get there: give up and drive on
  for (const m of T.medics) if (!m.dead) { m.medic = false; m.state = 'flee'; m.fl = 6; m.fx = m.x - P.x; m.fy = m.y - P.y; }
  T.medics = []; T.load = 0; if (why !== 'stolen' && cars.includes(T.car) && !T.car.driver) T.car.medics = false;
}
function headForHospital(T) {             // everyone aboard: to the nearest hospital, lights and siren
  const c = T.car; getIn(T);
  if (!T.loaded) { c.driver = 'ai'; c.hb = false; c.medics = false; return false; }   // nobody to take after all: back to traffic
  const door = serviceDoor('hospital', c.x, c.y), field = new Float64Array(RN.length), r = roadFieldTo(door.x, door.y, field);
  c.driver = 'ai'; c.hb = false; c.medics = false;
  if (!r) return false;                                              // no way there: the bodies are simply taken away
  T.door = door; c.task = { hosp: T, field, r, on: false, work: 0, t: gameT }; c.nx = null; setPhase(T, 'drive'); return true;
}
function atHospital(c) {                  // js/08c: the ambulance has stopped by the hospital: out with the first body
  const T = c.task.hosp; c.task = null; c.nx = null; c.driver = null; c.hb = true; c.medics = true;
  getOut(T); T.load = 1; T.loaded--; setPhase(T, 'toDoor');
}
function teamStep(T, dt) {                // false once the team is done (or gone)
  const c = T.car, out = T.medics.length > 0;
  const stolen = !cars.includes(c) || c.dead || c.sunk || P.car === c || (P.act && P.act.c === c) || (out && c.driver);
  if (out && (stolen || T.medics.some(m => m.dead || m.knocked || !peds.includes(m)) || gameT - T.t > MED_PHASE_MAX)) { dropAll(T, stolen ? 'stolen' : gameT - T.t > MED_PHASE_MAX ? 'stuck' : ''); return false; }
  if (!out) return T.phase === 'drive' && !stolen && !!c.task && c.task.hosp === T;   // driving to the hospital (js/07 routes it, js/08c stops it)
  if (dist(T.x, T.y, P.x, P.y) > 1300) {                             // far behind you now: they finish the job unseen
    for (const b of T.bodies) { const list = officers.includes(b) ? officers : peds, i = list.indexOf(b); if (i >= 0 && b.medicHold) list.splice(i, 1); }
    getIn(T); c.driver = 'ai'; c.hb = false; c.medics = false; return false;
  }
  if (T.wait > 0) { T.wait -= dt; T.vx = T.vy = 0; placeMedics(T); return true; }
  switch (T.phase) {
    case 'toBody': {                                                  // walk the stretcher to the next body
      const b = T.bodies.find(q => !q.loaded && aliveBody(q));
      if (!b) return headForHospital(T);
      if (teamWalk(T, b.x, b.y, dt)) { T.cur = b; setPhase(T, 'lift', 1.2); }
      break;
    }
    case 'lift': if (!aliveBody(T.cur)) { setPhase(T, 'toBody'); break; } T.cur.onStretcher = true; T.load = 1; setPhase(T, 'toCar'); break;
    case 'toCar': {                                                   // back to the ambulance with it
      const r = carRear(c); T.cur.x = T.x; T.cur.y = T.y;
      if (teamWalk(T, r.x, r.y, dt)) setPhase(T, 'loadIn', 0.9);
      break;
    }
    case 'loadIn': {                                                  // in it goes; the next body, or off to the hospital
      const b = T.cur, list = officers.includes(b) ? officers : peds, i = list.indexOf(b); if (i >= 0) list.splice(i, 1);
      b.loaded = true; T.load = 0; T.loaded++; T.cur = null;
      if (T.bodies.some(q => !q.loaded && aliveBody(q))) setPhase(T, 'toBody'); else return headForHospital(T);
      break;
    }
    case 'toDoor': if (teamWalk(T, T.door.x, T.door.y, dt)) setPhase(T, 'deliver', 1); break;   // at the hospital: to the door with it
    case 'deliver': T.load = 0; setPhase(T, 'back'); break;                                        // taken in
    case 'back': {
      const r = carRear(c);
      if (teamWalk(T, r.x, r.y, dt)) { if (T.loaded > 0) { T.load = 1; T.loaded--; setPhase(T, 'toDoor', 0.9); } else { getIn(T); c.driver = 'ai'; c.hb = false; c.medics = false; return false; } }
      break;
    }
  }
  placeMedics(T); return true;
}
function updateMedics(dt) {               // js/15, every frame of play
  for (let i = TEAMS.length - 1; i >= 0; i--) if (!teamStep(TEAMS[i], dt)) { const T = TEAMS[i]; if (T.mesh) scene.remove(T.mesh); TEAMS.splice(i, 1); }
}
function stretcherModel() {               // a stretcher on wheels, and a body under a white sheet (shown while it carries one)
  const g = new THREE.Group(), steel = mc('#9aa4ae');
  for (const s of [-1, 1]) part(g, GB, steel, 26, 0.8, 0.8, 0, 0, s * 3.6);
  part(g, GB, mc('#d8e2ea'), 21, 1, 7, 0, 0.6, 0);
  for (const a of [-1, 1]) for (const s of [-1, 1]) part(g, GB, steel, 0.7, 6, 0.7, a * 8, -3, s * 3);
  const body = new THREE.Group(); part(body, GB, mc('#f4f6f8'), 17, 3, 5.6, -0.5, 2.6, 0); part(body, GSph, mc('#f4f6f8'), 2.4, 2, 2.4, 8.5, 3, 0); g.add(body);
  g.userData.body = body; return g;
}
function gfxTeams() {                     // js/13: each stretcher out on the street
  for (const T of TEAMS) {
    if (!T.medics.length) { if (T.mesh) T.mesh.visible = false; continue; }
    if (!T.mesh) { T.mesh = stretcherModel(); scene.add(T.mesh); }
    T.mesh.visible = true; T.mesh.position.set(T.x, groundH(T.x, T.y) + 9, T.y); T.mesh.rotation.y = -T.ang; T.mesh.userData.body.visible = T.load > 0;
  }
}
function clearTeams() { for (const T of TEAMS) if (T.mesh) scene.remove(T.mesh); TEAMS = []; }
