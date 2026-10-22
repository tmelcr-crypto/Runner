'use strict';
/* ---------- 7ze. THE SUBSTATION: the casino strip's power, on the green strip west of the casino block (both modes) ----------
   A small fenced yard across the road from THE PULSE: a concrete pad, three humming transformers (grey-green, cooling fins, white
   insulators), a steel gantry with the lines going off to the strip, a control kiosk and DANGER signs; its gate on the street side,
   shut. Blow it up - any blast in the yard, in any mode - and the strip goes dark: the Royal Flamingo's flamingo, THE PULSE's
   heartbeat and dance floor, the bars' neon all off for a minute or two (places table, Substation); the transformers burn. Then the
   repair crew's truck pulls up at the gate and the lights come back. A quest can hold it (SUBST.ms): its gate opens for the night
   guards' round, and it says how long the dark lasts. Mode: substation. */
const SUBST = { S: null, dark: false, until: 0, blown: false, crewT: 0, crew: null, humT: 0, ms: null, lm: null };
const SUB_FH = 16;
const substOn = () => feat('substation') && !!SUBST.S;
const stripDark = () => SUBST.dark;          // js/08zu: the strip's neon off
function subWorld(lx, lz, out) { return ixWorld(SUBST.S, lx, lz, out); }
function genSubstation() {                   // js/04 genWorld: always the same spot
  SUBST.S = null; if (!CASM) return;
  const S = SUBST.S = { cx: 11266, cy: 6060, a: 0, ca: 1, sa: 0, hw: 45, hd: 35, gate: 36 };
  const sol = (lx, lz, w, h, extra) => { const p = subWorld(lx, lz); return makeSolid(p.x, p.y, w, h, S.a, Object.assign({ bld: true }, extra || {})); };
  const { hw, hd } = S, g = S.gate / 2;
  sol(0, -hd, 2 * hw, 3); sol(0, hd, 2 * hw, 3); sol(-hw, 0, 3, 2 * hd);                     // north, south, west
  sol(hw, (-hd - g) / 2, 3, hd - g); sol(hw, (hd + g) / 2, 3, hd - g);                        // east, either side of the gate
  S.gateSolid = sol(hw, 0, 3, S.gate, { gate: true });
  S.units = [-24, 0, 24].map(lz => ({ lx: -6, lz })); for (const u of S.units) sol(u.lx, u.lz, 22, 16);   // the transformers
  sol(-hw + 12, hd - 12, 14, 14);                                                             // the kiosk
  const o = subWorld(hw + 26, 0); S.outside = { x: o.x, y: o.y }; const gi = subWorld(hw - 14, 0); S.inGate = { x: gi.x, y: gi.y };
  LM_CLEAR.push([S.cx, S.cy, hw + 10, hd + 10]);
  SUBST.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 30, make: () => withSeed(5521, () => makeSubstation(S)), mesh: null }; LMS.push(SUBST.lm);
}

/* ---------- the model ---------- */
function makeSubstation(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), U = new GeoBuilder(), C = _C, { hw, hd } = S, H = SUB_FH, g = S.gate / 2;
  const post = C('#8a8f9c'), mesh = C('#5a5f6a'), wire = C('#b8bcc8'), steel = C('#9aa0ab'), yel = C('#ffd23f');
  flat(T, -hw, -hd, hw, hd, 0.5, C('#8d8f94'));                                              // the concrete pad, gravel round the units
  for (const u of S.units) flat(T, u.lx - 16, u.lz - 11, u.lx + 16, u.lz + 11, 0.6, C('#6a6c70'));
  const fence = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 18)), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let k = 0; k <= n; k++) { const x = ax + ux * L * k / n, z = az + uz * L * k / n; box5(T, x - 0.7, 0, z - 0.7, x + 0.7, H + 3, z + 0.7, post); }
    for (let y = 2; y <= H; y += 2.2) box5(T, Math.min(ax, bx) - 0.25, y, Math.min(az, bz) - 0.25, Math.max(ax, bx) + 0.25, y + 0.35, Math.max(az, bz) + 0.25, mesh);
    for (const y of [H + 1.2, H + 2.6]) box5(T, Math.min(ax, bx) - 0.3, y, Math.min(az, bz) - 0.3, Math.max(ax, bx) + 0.3, y + 0.5, Math.max(az, bz) + 0.3, wire);
  };
  fence(-hw, -hd, hw, -hd); fence(-hw, hd, hw, hd); fence(-hw, -hd, -hw, hd); fence(hw, -hd, hw, -g); fence(hw, g, hw, hd);
  const gT = new GeoBuilder(); box5(gT, -1, 0, -g, 1, H, g, C('#3a3f4c')); for (let z = -g + 5; z < g; z += 5) box5(gT, -0.4, 0, z - 0.3, 0.4, H, z + 0.3, yel);
  for (const u of S.units) {                                                                   // a transformer: the tank, fins down both sides, three insulators, a bus bar to the gantry
    const { lx: x, lz: z } = u; box5(U, x - 10, 0, z - 7, x + 10, 16, z + 7, C('#5f7a68'));
    for (let k = -8; k <= 8; k += 2) { box5(U, x + k - 0.3, 2, z - 9, x + k + 0.3, 14, z - 7, C('#4e6656')); box5(U, x + k - 0.3, 2, z + 7, x + k + 0.3, 14, z + 9, C('#4e6656')); }
    for (const dz of [-4, 0, 4]) { T.prism(x + 4, z + dz, 1.4, 16, 23, C('#f2f2f2'), 8); box5(T, x + 4 - 0.4, 23, z + dz - 0.4, x + 30, 23.8, z + dz + 0.4, wire); }
  }
  for (const z of [-hd + 6, hd - 6]) box5(T, 32, 0, z - 1, 34, 30, z + 1, steel); box5(T, 32, 28, -hd + 5, 34, 30, hd - 5, steel);   // the gantry the lines leave from
  box5(T, -hw + 5, 0, hd - 19, -hw + 19, 14, hd - 5, C('#b8bcc8')); box5(T, -hw + 4, 14, hd - 20, -hw + 20, 15, hd - 4, C('#5a5f6a'));   // the kiosk
  for (const z of [-hd + 8, hd - 8]) box5(G, hw + 0.4, 8, z - 3, hw + 0.9, 12, z + 3, yel);   // DANGER plates on the street side
  const m = lmMesh(T, G), own = m.userData.own;
  const uMat = new THREE.MeshLambertMaterial({ vertexColors: true }), units = new THREE.Mesh(U.build(), uMat); m.add(units); own.push(uMat);
  const gate = new THREE.Mesh(gT.build(), LM_MAT[0]); gate.position.set(hw, 0, 0); m.add(gate);
  const sign = fasciaSign('DANGER · HIGH VOLTAGE', '#ffd23f', 44, 6); sign.position.set(hw + 1.2, 13, hd - 22); sign.rotation.y = Math.PI / 2; m.add(sign); own.push(sign.material);
  S.pt = { uMat, gate, burnt: false }; return m;
}

/* ---------- at work ---------- */
function substReset() { SUBST.dark = false; SUBST.blown = false; SUBST.until = 0; SUBST.crewT = 0; SUBST.ms = null; substCrewGone(); if (SUBST.S) SUBST.S.gateSolid.off = false; }
function substBlow(dur) {                    // the strip goes dark
  const S = SUBST.S; if (!S) return;
  SUBST.blown = true; SUBST.dark = true; SUBST.until = gameT + (dur || PLC.substDark); SUBST.crewT = 0;
  for (const u of S.units) { const w = subWorld(u.lx, u.lz); for (let k = 0; k < 14; k++) { const a = rand(0, TAU), s = rand(40, 160); addP({ x: w.x, y: w.y, z: rand(10, 20), vz: rand(40, 120), grav: 300, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 1), max: 1, s0: 2, s1: 0.5, col: pick(['#cfe6ff', '#ffffff', '#ffd23f']), drag: 1, hold: true }); } }
  Snd.tone(120, 40, 1.2, 0.12, 'sawtooth');
  if (dist(P.x, P.y, S.cx, S.cy) < 1600) toast('THE STRIP GOES DARK');
}
function substationHurt(x, y, R) {           // js/06 explosion(): a blast in the yard blows it
  const S = SUBST.S; if (!substOn() || SUBST.dark || (SUBST.ms && !SUBST.ms.blowable)) return;
  if (S.units.some(u => { const w = subWorld(u.lx, u.lz); return dist(x, y, w.x, w.y) < R + 14; })) substBlow(SUBST.ms && SUBST.ms.dark);
}
function substCrewGone() { const c = SUBST.crew; if (!c) return; if (c.car && cars.includes(c.car) && P.car !== c.car) cars.splice(cars.indexOf(c.car), 1); for (const p of c.men) { const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); } SUBST.crew = null; }
function substTick(dt) {                     // js/15 update
  const S = SUBST.S; if (!S) return;
  S.gateSolid.off = !!(SUBST.ms && SUBST.ms.gate);
  if (SUBST.dark && !(SUBST.ms && SUBST.ms.hold) && gameT > SUBST.until) {                  // the repair crew: a truck at the gate, two men at the units, then the lights
    SUBST.dark = false; SUBST.crewT = PLC.substCrew;
    if (dist(P.x, P.y, S.cx, S.cy) < 1500) {
      const k = kerbBy(S.outside.x + 30, S.outside.y), car = makeCar('pickup', k.x, k.y, k.ang, null, '#ff7a1a'); car.searched = true; cars.push(car);
      const men = [-10, 10].map(dz => { const w = subWorld(S.hw - 20, dz); const p = makePed(w.x, w.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt: '#ff7a1a', pants: '#2a3a5c', ang: Math.PI }); p.post = { x: w.x, y: w.y, a: Math.PI, step: standStep }; peds.push(p); return p; });
      SUBST.crew = { car, men }; toast('THE LIGHTS ARE BACK ON THE STRIP');
    }
  }
  if (SUBST.crewT > 0 && (SUBST.crewT -= dt) <= 0) { substCrewGone(); SUBST.blown = false; }
  if (substOn() && !SUBST.blown && (SUBST.humT -= dt) <= 0) { SUBST.humT = 1.8; const d = dist(P.x, P.y, S.cx, S.cy); if (d < 170) Snd.tone(60, 60, 1.6, 0.05 * (1 - d / 170), 'sine'); }   // the hum
}
function gfxSubst(time) {                    // js/13: burnt units while it is blown, sparks now and then; the gate slides
  const S = SUBST.S; if (!S || !S.pt || !SUBST.lm.mesh) return;
  const burnt = SUBST.blown; if (burnt !== S.pt.burnt) { S.pt.burnt = burnt; S.pt.uMat.color.setScalar(burnt ? 0.18 : 1); }
  S.pt.gate.position.z = S.gateSolid.off ? -S.gate - 2 : 0;
  if (SUBST.dark && Math.random() < 0.08) { const u = pick(S.units), w = subWorld(u.lx + rand(-6, 6), u.lz + rand(-5, 5)); addP({ x: w.x, y: w.y, z: rand(14, 22), vz: rand(10, 40), grav: 120, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.5, max: 0.5, s0: 2.4, s1: 0.4, col: pick(['#ffd23f', '#ff7a1a', '#cfe6ff']), drag: 1, hold: true }); }
}
