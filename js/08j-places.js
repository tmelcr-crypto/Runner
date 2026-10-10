'use strict';
/* ---------- 6c8. PLACES: guards and soldiers, gate barriers, the military base ----------
   Guard posts: police officers by the airport booths and the space center gate, soldiers in the military base - each comes back to
   its post (or its patrol) when there is nothing else to do; one killed is replaced later, out of your sight.
   Gate barriers (js/01l): at the airport a car that stops is let through, one that does not breaks the boom and gets a wanted level;
   the base's barrier never lifts. Police cars are always let through.
   The military base (js/01j base): inside its fence a RESTRICTED AREA warning counts down; still inside when it ends, the alarm goes -
   a wanted level straight away and the soldiers open fire (so they do if you shoot inside, or hurt one). They never leave the base.
   Its armoury holds heavy weapons and its ammo store every kind of ammunition; the motor pool tanks and APCs, the pad a helicopter.
   What you take or destroy comes back a while after you have left.
   Targets: things that are not cars or people but take bullets and blasts (the helicopter; the ships, which nothing can hurt). */
const BASEM = MAP.base || null;
let POSTS = [], BARRIERS = [], TARGETS = [], ARMS = [], BASEV = [], HELI = null;
const BASEX = { warnT: 0, alarm: false, outT: 0, leftAt: -1e9 };
const inBase = (x, y) => !!BASEM && inPoly(x, y, BASEM.area[0]);

/* ---------- targets ---------- */
function addTarget(o) { o.dead = false; TARGETS.push(o); return o; }   // o: { x, y, reach, circles() -> [[x, y, r]], hp (Infinity: unhurt), hit(d, byPlayer) }
function targetRay(ox, oy, dx, dy, range) {                       // js/06 bullets: the nearest target along the ray, { t, o } or null
  let best = null;
  for (const o of TARGETS) {
    if (o.off || Math.abs(o.x - ox) > range + o.reach || Math.abs(o.y - oy) > range + o.reach) continue;
    for (const k of o.circles()) { const t = rayCircle(ox, oy, dx, dy, k[0], k[1], k[2]); if (t < range && (!best || t < best.t)) best = { t, o }; }
  }
  return best;
}
function targetAt(x, y) {                                         // js/12b rockets
  for (const o of TARGETS) { if (o.off || Math.abs(o.x - x) > o.reach || Math.abs(o.y - y) > o.reach) continue; for (const k of o.circles()) if (Math.hypot(x - k[0], y - k[1]) < k[2]) return o; }
  return null;
}
function damageTarget(o, d, byPlayer) { if (!o.dead && o.hp !== Infinity && d > 0 && o.hit) o.hit(d, byPlayer); }
function blastTargets(x, y, R, src) {                              // js/06 explosion()
  for (const o of TARGETS) {
    if (o.dead || o.off || o.hp === Infinity || src === o || Math.abs(o.x - x) > R + o.reach || Math.abs(o.y - y) > R + o.reach) continue;
    let d = 1e9; for (const k of o.circles()) d = Math.min(d, Math.hypot(k[0] - x, k[1] - y) - k[2]); d = Math.max(0, d);
    if (d < R) damageTarget(o, d < AIRP.blastKill ? 1e9 : o.maxhp * 0.7 * (1 - d / R), !!(src && src.byPlayer));
  }
}

/* ---------- guard posts ---------- */
function addPost(o) { POSTS.push(Object.assign({ ped: null, deadAt: 0, i: 0 }, o)); }   // o: { x, y, a, kind: cop | soldier, arm, patrol, need() }
function makeSoldier(po) {
  const p = makePed(po.x, po.y); Object.assign(p, { soldier: true, arm: po.arm, hp: PLC.soldierHp, shirt: '#4a5a32', umb: false, speed: 1.3 * MPS, cool: rand(0.3, 1), ang: po.a, state: 'post' });
  return p;
}
function postsTick() {                                            // js/15: guards come on duty near you; the dead are replaced later, out of sight
  for (const po of POSTS) {
    if (po.need && !po.need()) { if (po.ped && peds.includes(po.ped) && !po.ped.dead) peds.splice(peds.indexOf(po.ped), 1); po.ped = null; continue; }
    const p = po.ped, d = dist(po.x, po.y, P.x, P.y);
    if (p && p.dead && !po.deadAt) po.deadAt = gameT;
    if (p && peds.includes(p) && !p.dead) continue;
    if (d > 1250 || (po.deadAt && (gameT - po.deadAt < (po.kind === 'soldier' ? PLC.soldierBack : 90) || d < 900))) continue;
    const q = po.kind === 'cop' ? makeFootCop(po.x, po.y) : makeSoldier(po);
    q.post = po; q.e = -1; q.ang = q.hd = po.a; po.ped = q; po.deadAt = 0; peds.push(q);
  }
}
function postStep(p, dt) {                                        // js/08 updatePeds: someone at a post, when not busy otherwise; true when handled
  if (p.soldier) { soldierStep(p, dt); return true; }
  const po = p.post;                                                // a cop at a post: back to it, then stand facing the road
  if (walkTo(p, po.x, po.y, WALK, dt) < 6) { p.ang = p.hd = po.a; p.vx = p.vy = 0; }
  return true;
}
function soldierStep(p, dt) {
  const po = p.post, tgt = P.car || P, d = dist(p.x, p.y, tgt.x, tgt.y); p.cool -= dt;
  if (BASEX.alarm && feat('base') && !P.dead && d < PLC.soldierRange * 1.8) {     // the alarm: after you, but never out of the base
    const see = losClear(p.x, p.y, tgt.x, tgt.y, true), a = Math.atan2(tgt.y - p.y, tgt.x - p.x); p.ang = p.hd = a;
    const go = !po.fixed && (!see || d > PLC.soldierRange * 0.8) ? 1 : d < 90 ? -0.5 : 0;
    stepInside(p, Math.cos(a) * go, Math.sin(a) * go, 4 * MPS, dt);
    if (see && d < PLC.soldierRange && p.cool <= 0) soldierShoot(p, tgt, d);
    return;
  }
  if (po.patrol) {                                                  // on patrol: from one point to the next
    const w = po.patrol[po.i % po.patrol.length]; if (walkTo(p, w[0], w[1], WALK, dt) < 10) po.i++;
  } else if (walkTo(p, po.x, po.y, WALK, dt) < 6) { p.ang = p.hd = po.a; p.vx = p.vy = 0; }
}
function stepInside(p, mx, my, sp, dt) { const ox = p.x, oy = p.y; stepCop(p, mx, my, sp, dt); if (!inBase(p.x, p.y)) { p.x = ox; p.y = oy; p.vx = p.vy = 0; } }
function soldierShoot(p, tgt, d) {
  const w = WEAPONS[p.arm], lmg = w && w.id === 'lmg'; p.cool = lmg ? rand(0.18, 0.4) : rand(0.3, 0.6); p.flash = 0.06;
  tracers.push({ x1: p.x + Math.cos(p.ang) * 14, y1: p.y + Math.sin(p.ang) * 14, x2: tgt.x + rand(-16, 16), y2: tgt.y + rand(-16, 16), life: 0.06 });
  if (dist(p.x, p.y, cam.x, cam.y) < 900) Snd.tone(lmg ? 700 : 950, 180, 0.05, 0.07, 'square');
  if (Math.random() < PLC.soldierAcc * (1.3 - 0.6 * clamp(d / PLC.soldierRange, 0, 1))) { if (P.car) damageCar(P.car, PLC.soldierDmg * 4, false); else damagePlayer(PLC.soldierDmg); }
}

/* ---------- gate barriers ---------- */
function addBarrier(o) {                                          // o: { x, y, a (deg, along the boom), w, mode: stop | shut, gate: posts that watch it }
  const a = o.a * Math.PI / 180; Object.assign(o, { ar: a, open: 0, up: false, stopT: 0, broken: 0 });
  o.s = makeSolid(o.x, o.y, o.w, 6, a, { barrier: o }); BARRIERS.push(o); return o;
}
const guardsAt = b => POSTS.some(po => po.gate === b && po.ped && peds.includes(po.ped) && !po.ped.dead);
function barrierHit(rc, c) {                                      // js/07: a car against a boom - true when it goes through (lifted, or broken)
  const b = rc.barrier;
  if (b.mode === 'stop' && c.t.cop) return true;                    // the police are always let through
  if (carSpeed(c) < 15 * KMH) return false;
  b.broken = 30; b.open = 0; b.up = false; rc.off = true; spark(b.x, b.y, 10); c.vx *= 0.92; c.vy *= 0.92;
  for (let k = 0; k < 8; k++) { const a = c.ang + rand(-0.8, 0.8), s = carSpeed(c) * rand(0.3, 0.8); addP({ x: b.x, y: b.y, z: rand(8, 16), vz: rand(40, 110), grav: 300, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.6, 1.2), max: 1.2, s0: 3, s1: 2, col: pick(['#ff3b5c', '#f1f1ee']), drag: 2 }); }
  if (c.driver === 'player') { Snd.thud(220); cam.shake = Math.max(cam.shake, 5); if (b.mode === 'stop' && feat('airportGates') && guardsAt(b)) forceWanted(PLC.gateStars); }
  return true;
}
function barriersTick(dt) {
  for (const b of BARRIERS) {
    if (b.broken > 0) { if ((b.broken -= dt) <= 0) b.s.off = false; continue; }          // mended after a while
    const c = P.car, near = c && dist(c.x, c.y, b.x, b.y) < 140;
    let cop = false; for (const q of cars) if (q.t.cop && q.driver && dist(q.x, q.y, b.x, b.y) < 180) { cop = true; break; }
    if (b.mode === 'stop' && feat('airportGates')) {
      if (near && carSpeed(c) < 1.5 * MPS && guardsAt(b)) b.stopT += dt; else if (!near) b.stopT = 0;
      if (b.stopT >= PLC.gateStop || cop) b.up = true;
      else if (b.up && !near && !cop) b.up = false;
    } else b.up = b.mode === 'stop';                                // no guards in this mode: the boom stays up
    b.open = clamp(b.open + (b.up ? 1.6 : -1.2) * dt, 0, 1); b.s.off = b.open > 0.6;
  }
}

/* ---------- the military base ---------- */
function forceWanted(n) {                                         // straight to wanted level n (never lower)
  if (RAMP.on || !feat('police') || P.stars >= n) return;
  P.heat = Math.max(P.heat, COP.lv.heat[Math.min(n, COP.lv.heat.length - 1)]); P.sinceCrime = 0; policeKnow(P.x, P.y); updateStars();
}
function raiseAlarm() {
  if (!feat('base') || BASEX.alarm) return;
  BASEX.alarm = true; BASEX.outT = 0; forceWanted(PLC.baseStars); toast('BASE ALARM!', true); Snd.tone(440, 880, 0.6, 0.15, 'sawtooth');
}
const baseHurt = (x, y) => { if (inBase(x, y)) raiseAlarm(); };     // js/06: a shot, a blast or a body inside the base
function baseTick(dt) {
  const el = $('warnBanner');
  if (!BASEM || !feat('base')) { if (!el.hidden) el.hidden = true; return; }
  const t = P.car || P, inside = !P.dead && state === 'play' && inBase(t.x, t.y);
  if (inside) {
    BASEX.outT = 0;
    if (!BASEX.alarm) { BASEX.warnT += dt; const n = Math.max(0, Math.ceil(PLC.baseWarn - BASEX.warnT)); el.innerHTML = 'RESTRICTED AREA<br><small>LEAVE NOW ' + n + '</small>'; el.hidden = false; if (BASEX.warnT >= PLC.baseWarn) raiseAlarm(); }
    else el.hidden = true;
  } else {
    if (BASEX.warnT > 0 || BASEX.alarm) BASEX.leftAt = gameT;
    BASEX.warnT = 0; el.hidden = true;
    if (BASEX.alarm && (BASEX.outT += dt) > PLC.baseCalm) BASEX.alarm = false;
  }
  if (inside) BASEX.leftAt = gameT;
  const away = gameT - BASEX.leftAt > 20 && dist(P.x, P.y, BASEM.gate.x, BASEM.gate.y) > 1100, back = s => s && gameT - s > PLC.restock && away;
  for (const s of ARMS) if (!s.p && back(s.takenAt)) putBasePick(s);       // the armoury restocks
  for (const v of BASEV) {                                           // the motor pool
    if (v.car && (P.car === v.car || v.car.dead)) { v.taken = v.taken || gameT; }
    if (v.car && !cars.includes(v.car)) v.car = null;
    if (v.car || dist(P.x, P.y, v.x, v.y) > 1600 || (v.taken && !back(v.taken))) continue;
    if (cars.some(q => Math.abs(q.x - v.x) < 50 && Math.abs(q.y - v.y) < 60)) continue;
    v.car = makeCar(v.type, v.x, v.y, v.a, null, v.type === 'tank' ? '#4a5a32' : '#55603a'); v.car.baseCar = true; v.taken = 0; cars.push(v.car);
  }
  if (HELI && HELI.dead && back(HELI.deadAt)) heliRestore();
}
function putBasePick(s) { s.p = { x: s.x, y: s.y, wi: s.wi, ammo: s.ammo, item: null, key: 'b' + s.wi, fixed: false, spot: null, base: s, bob: Math.random() * 6, mesh: null }; s.takenAt = 0; WPICKS.push(s.p); }
function baseTaken(p) { p.base.p = null; p.base.takenAt = gameT; }   // js/08d: taken from the armoury
function placeArmoury() {                                         // a new game (after the hidden weapons): racks of heavy weapons, the ammo store
  for (const s of ARMS) s.p = null; if (!BASEM || !feat('base')) return;
  for (const s of ARMS) putBasePick(s);
}
function heliRestore() { HELI.dead = false; HELI.hp = HELI.maxhp; HELI.burn = 0; if (HELI.mesh) HELI.mesh.userData.wreck(false); }
function heliHit(d, byPlayer) {
  const h = HELI; h.hp -= d; spark(h.x + rand(-20, 20), h.y + rand(-10, 10), 4); if (byPlayer) raiseAlarm();
  if (h.hp > 0) return;
  h.dead = true; h.deadAt = gameT; h.burn = 30; explosion(h.x, h.y, 150, { byPlayer, target: h }, 1); alertPeds(h.x, h.y, 500);
  if (byPlayer) reportCrime(AIRP.heat, COP.blastHear, h.x, h.y, true);
  if (h.mesh) h.mesh.userData.wreck(true);
}
let lunaWalk = null;
function lunaVisitors() {                                         // the lunapark keeps its crowd while you are near (js/01l visitors)
  if (!MAP.lunapark || !feat('lunapark')) return;
  if (!lunaWalk) { const g = MAP.lunapark.gate; lunaWalk = walkAreas().filter(a => a.k === 'promenade' && inArea(a, g.x, g.y + 60)); }   // the park's paved ground, just inside the gate
  const A = lunaWalk[0]; if (!A) return;
  const cx = (A.bb[0] + A.bb[2]) / 2, cy = (A.bb[1] + A.bb[3]) / 2; if (dist(P.x, P.y, cx, cy) > 1400) return;
  let n = 0; for (const p of peds) if (!p.dead && p.area === A) n++;
  if (n >= PLC.visitors) return;
  const q = randomIn(A.g, (x, y) => strollOk(A, x, y) && dist(x, y, P.x, P.y) > 120); if (!q) return;
  const p = makePed(q[0], q[1]); p.stroll = true; p.area = A; p.umb = false; strollTarget(p); peds.push(p);
}
function placesTick(dt) {                                         // js/15, once a frame
  postsTick(); barriersTick(dt); baseTick(dt); lunaVisitors();
  if (HELI && HELI.dead && HELI.burn > 0) { HELI.burn -= dt; if (dist(HELI.x, HELI.y, cam.x, cam.y) < 1500) { if (Math.random() < 0.7) fireFx(HELI.x + rand(-30, 30), HELI.y + rand(-12, 12)); if (Math.random() < 0.4) smokeFx(HELI.x, HELI.y, true); } }
}
function resetPlaces() {                                          // a new game
  for (const po of POSTS) { po.ped = null; po.deadAt = 0; po.i = 0; }
  for (const b of BARRIERS) { b.broken = 0; b.up = false; b.open = 0; b.stopT = 0; b.s.off = false; }
  Object.assign(BASEX, { warnT: 0, alarm: false, outT: 0, leftAt: -1e9 }); $('warnBanner').hidden = true;
  for (const v of BASEV) { v.car = null; v.taken = 0; }
  if (HELI && HELI.dead) heliRestore();
  placeArmoury();
}
