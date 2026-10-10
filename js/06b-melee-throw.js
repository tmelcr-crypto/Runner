'use strict';
/* ---------- 6b. MELEE AND THROWING ----------
   Melee (use swing): FIRE swings what is in your hand (held, it keeps swinging). Partway through the swing it hits everyone in the arc
   in front of you, out to the weapon's reach beyond your body: damage, a push and a knockdown - pushed more than 3 m they fly instead
   (js/12c). Cars in the arc take the vehicle damage; boxes, bags and crates burst, bins fly (js/12e). Nobody hears it unless the table
   says so; police who see it count it like a shot.
   Throwing (use throw), with the mouse like a slingshot: hold the button and drag the opposite way to the throw. On a touch screen FIRE
   turns into a small stick: hold it and drag toward where it should land - to the stick's edge (THROW_PAD) for the full range, so
   there is room for it in every direction even with FIRE in the corner of the screen. A row of dots shows the arc and a ring the size
   of the blast where it will land; the further you drag, the further it goes, up to the throw range. Let go to throw; a short drag
   (back to the middle) throws nothing. With the J key: hold to wind up - the longer, the further - and it goes the way you face.
   In a car FIRE drops one out of the window behind you.
   A bomb flies in an arc, bounces off walls, cars and the ground (if it bounces at all) and rolls a little, blinking faster as the
   fuse runs down, then blows up like a rocket with the weapon's blast radius. In deep water it fizzles out. */
const SWING_T = 0.24, SWING_HIT = 0.1, BODY_R = 9, GR_G = G_ACC * 1.6, THROW_ANG = 0.78, THROW_PAD = 55, THROW_DEAD = 10;   // the touch stick on FIRE: radius, dead middle (px)
let grenades = [];
const TA = { on: false, by: null, ax: 0, ay: 0, d: 0, ang: 0, wind: 0, ok: false, tx: 0, ty: 0, carTrig: false };

/* ---------- melee ---------- */
function swingWeapon(w) { P.cool = w.rate; P.swing = { t: 0, w, done: false }; Snd.melee(w.sound, false); }
function updateSwing(dt) {
  const s = P.swing; if (!s) return;
  s.t += dt;
  if (!s.done && s.t >= SWING_HIT) { s.done = true; meleeHits(s.w); }
  if (s.t >= SWING_T) P.swing = null;
}
function inArc(x, y, R, half, rr) {      // is something of radius rr at (x, y) inside the swing?
  const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy);
  if (d > R + rr) return false; if (d < BODY_R + rr) return true;    // pressed against you: always
  return Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) <= half + Math.atan2(rr, d);
}
function meleeHits(w) {
  const R = BODY_R + w.reach, half = w.arc / 2; let hit = 0;
  for (const p of peds) if (!p.dead && !p.knocked && inArc(p.x, p.y, R, half, 7)) { hitPerson(p, w, false); hit++; }
  for (const o of officers) if (!o.dead && !o.knocked && inArc(o.x, o.y, R, half, 7)) { hitPerson(o, w, true); hit++; }
  for (const c of cars) {
    if (c.dead || c === P.car || Math.abs(c.x - P.x) > R + 60 || Math.abs(c.y - P.y) > R + 60) continue;
    const q = carCircles(c).find(q => inArc(q[0], q[1], R, half, q[2])); if (!q) continue;
    spark((P.x + q[0]) / 2, (P.y + q[1]) / 2, 4); if (w.carDmg > 0) damageCar(c, w.dmg * w.carDmg, true); hit++;
  }
  const a0 = Math.floor((P.x - R + SEA) / TG), a1 = Math.floor((P.x + R + SEA) / TG), b0 = Math.floor((P.y - R + SEA) / TG), b1 = Math.floor((P.y + R + SEA) / TG);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {                // street junk in the swing (js/12e)
    const l = TGRID.get(a * 1024 + b); if (!l) continue;
    for (const o of l.slice()) {
      if (!o.smash || o.gone || o.flying || !inArc(o.x, o.y, R, half, 5)) continue;
      const d = dist(o.x, o.y, P.x, P.y) || 1, nx = (o.x - P.x) / d, ny = (o.y - P.y) / d;
      if (SHRED[o.smash]) breakProp(o, nx, ny, 160); else { throwProp(o, nx, ny, 0.45); messed(o); if (o.smash === 'hydrant') spray(o.hx, o.hy); }
      Snd.smash(o.smash, 0.8); hit++;
    }
  }
  for (let k = 0; k < 7; k++) {                                     // the swish: a fan of sparks of the weapon's colour along the arc
    const a = P.ang - half + (2 * half) * k / 6, r = R - 2;
    addP({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r, z: 13, vz: 0, grav: 0, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.16, max: 0.16, s0: 3.2, s1: 1, col: w.color, drag: 2, alpha: 0.9 });
  }
  alertPeds(P.x, P.y, w.panic);
  if (hit) { Snd.melee(w.sound, true); cam.shake = Math.max(cam.shake, w.shake); reportCrime(w.heat * COP.crime.gunfire, w.hear, P.x, P.y, false); }
}
function hitPerson(p, w, officer) {
  const a = Math.atan2(p.y - P.y, p.x - P.x), nx = Math.cos(a), ny = Math.sin(a), fly = w.push > 3 * MPS;
  bloodFx(p.x, p.y, w.dmg >= 30 ? 6 : 2, a); p.hp -= w.dmg;
  if (p.hp <= 0) { if (officer) killOfficer(p, true); else killPed(p, 'melee', true, a); }
  else if (officer || p.cop) { addHeat(COP.crime.hurtCop); PS.armedT = gameT; }
  else if (!provoke(p)) { p.state = 'flee'; p.fl = 5; p.fx = p.x - P.x; p.fy = p.y - P.y; }   // armed: hits back (js/08g)
  if (fly) { p.kx0 = P.x; p.ky0 = P.y; knock(p, nx, ny, Math.min(1.25, w.push / (8 * MPS)), 7); }   // sent flying (js/12c)
  else if (w.push > 0) {                                            // a shove, in small steps so nobody ends up inside a wall
    const n = Math.ceil(w.push / 3), st = w.push / n;
    for (let k = 0; k < n; k++) { const x = p.x + nx * st, y = p.y + ny * st; if (pedBlocked(x, y)) break; p.x = x; p.y = y; }
  }
  if (!p.dead && w.knock > 0) p.stunT = Math.max(p.stunT || 0, w.knock);   // knocked down (js/08, js/08b, js/11)
}

/* ---------- throwing ---------- */
const throwPtr = by => by === 'touch' ? { x: TS.fx, y: TS.fy } : { x: mouse.x, y: mouse.y };
function updateThrowAim(inp, dt) {       // from updatePlayer while a thrown weapon is in hand, on foot
  const w = WEAPONS[P.weapon], held = inp.held;
  if (held && !TA.on && !P.trig && P.cool <= 0 && P.relW < 0) { TA.on = true; TA.by = held; TA.wind = 0; TA.ok = false; const s = throwPtr(held); TA.ax = s.x; TA.ay = s.y; }
  if (!TA.on) return;
  if (held) {
    if (TA.by === 'key') { TA.wind = Math.min(1, TA.wind + dt / 1.1); TA.ang = P.ang; TA.d = TA.wind * w.throw; }
    else {
      const s = throwPtr(TA.by), touch = TA.by === 'touch', dead = touch ? THROW_DEAD : 14;   // touch: toward the target; mouse: away from it
      const vx = touch ? s.x - TA.ax : TA.ax - s.x, vy = touch ? s.y - TA.ay : TA.ay - s.y, m = Math.hypot(vx, vy);
      if (m > dead) { TA.ang = Math.atan2(vy, vx); P.ang = TA.ang; }
      TA.d = clamp((m - dead) / (touch ? THROW_PAD - dead : Math.min(VW, VH) * 0.3), 0, 1) * w.throw;
    }
    TA.ok = TA.d > MPS; TA.tx = P.x + Math.cos(TA.ang) * TA.d; TA.ty = P.y + Math.sin(TA.ang) * TA.d;
    return;
  }
  TA.on = false;                                                    // let go
  if (TA.ok) { if (P.mag[P.weapon] > 0) throwGrenade(w, TA.ang, TA.d); else Snd.tone(120, 90, 0.06, 0.12, 'square'); }
  TA.ok = false;
}
function throwGrenade(w, ang, d) {
  P.mag[P.weapon]--; P.cool = w.rate; P.flash = 0;
  const v = Math.min(Math.sqrt(Math.max(1, d) * GR_G / Math.sin(2 * THROW_ANG)), w.speed * 1.3 + 1), ca = Math.cos(ang), sa = Math.sin(ang);
  grenades.push({ x: P.x + ca * 10, y: P.y + sa * 10, z: 14, vx: ca * v * Math.cos(THROW_ANG), vy: sa * v * Math.cos(THROW_ANG), vz: v * Math.sin(THROW_ANG), fuse: w.fuse, w, beep: 0.3, blink: 0, rest: false, hitP: false, spin: rand(-12, 12), rot: 0 });
  Snd.melee('throw', false);
}
function carDrop(c, inp) {               // from updatePlayer in a car: FIRE drops the bomb in hand out of the window
  const w = WEAPONS[P.weapon], fire = inp.fire && !TA.carTrig; TA.carTrig = inp.fire;
  if (!fire || !isThrown(w) || P.cool > 0 || P.relW >= 0) return;
  if (P.mag[P.weapon] <= 0) { Snd.tone(120, 90, 0.06, 0.12, 'square'); return; }
  P.mag[P.weapon]--; P.cool = w.rate;
  const ca = Math.cos(c.ang), sa = Math.sin(c.ang), back = c.t.len / 2 + 9;
  grenades.push({ x: c.x - ca * back, y: c.y - sa * back, z: 10, vx: c.vx * 0.3 - ca * 30, vy: c.vy * 0.3 - sa * 30, vz: 40, fuse: w.fuse, w, beep: 0.3, blink: 0, rest: false, hitP: false, spin: rand(-12, 12), rot: 0 });
  Snd.melee('throw', false);
}
function updateGrenades(dt) {
  for (const g of grenades) {
    if (g.dead) continue;
    g.fuse -= dt; g.blink = Math.max(0, g.blink - dt);
    if (!g.rest) {
      g.vz -= GR_G * dt;
      const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt, low = g.z < 80;
      if (low && wallAtPt(nx, g.y)) { g.vx *= -0.4; g.vy *= 0.8; clink(g); } else g.x = nx;     // off a wall, each axis on its own
      if (low && wallAtPt(g.x, ny)) { g.vy *= -0.4; g.vx *= 0.8; clink(g); } else g.y = ny;
      if (g.z < 16) for (const c of cars) {                          // off a car
        if (Math.abs(c.x - g.x) > 70 || Math.abs(c.y - g.y) > 70) continue;
        for (const q of carCircles(c)) {
          const dx = g.x - q[0], dy = g.y - q[1], d = Math.hypot(dx, dy), rr = q[2] + 2;
          if (d < rr && d > 0.01) { const ux = dx / d, uy = dy / d, vn = (g.vx - c.vx) * ux + (g.vy - c.vy) * uy; g.x = q[0] + ux * rr; g.y = q[1] + uy * rr; if (vn < 0) { g.vx -= 1.4 * vn * ux; g.vy -= 1.4 * vn * uy; g.vx *= 0.6; g.vy *= 0.6; clink(g); } }
        }
      }
      if (!g.hitP && g.z < 22 && Math.hypot(g.vx, g.vy) > 60) for (const p of peds) {   // a direct hit hurts a little
        if (p.dead || Math.abs(p.x - g.x) > 9 || Math.abs(p.y - g.y) > 9) continue;
        g.hitP = true; g.vx *= -0.3; g.vy *= -0.3; p.hp -= g.w.dmg; if (p.hp <= 0) killPed(p, 'blast', true); else { p.state = 'flee'; p.fl = 4; p.fx = p.x - g.x; p.fy = p.y - g.y; } break;
      }
      g.z += g.vz * dt; g.rot += g.spin * dt;
      if (g.z <= 0) {
        g.z = 0;
        if (shoreDist(g.x, g.y) < -4) { splashFx(g.x, g.y, 10); g.dead = true; continue; }   // into deep water: it fizzles out
        if (g.w.bounce && g.vz < -70) { g.vz = -g.vz * 0.35; g.vx *= 0.62; g.vy *= 0.62; clink(g); }
        else { g.vz = 0; if (!g.w.bounce) { g.vx = g.vy = 0; g.rest = true; clink(g); } }
      }
      if (g.z === 0 && !g.rest) { const f = Math.exp(-3.4 * dt); g.vx *= f; g.vy *= f; g.spin *= f; if (Math.hypot(g.vx, g.vy) < 5) g.rest = true; }   // rolling
    }
    if ((g.beep -= dt) <= 0) { g.beep = clamp(g.fuse * 0.22, 0.07, 0.5); g.blink = 0.06; if (dist(g.x, g.y, P.x, P.y) < 450) Snd.tone(1700, 1700, 0.025, 0.05, 'square'); }
    if (g.fuse <= 0) {
      g.dead = true; explosion(g.x, g.y, g.w.blast, RK_SRC, g.w.blastThrow); alertPeds(g.x, g.y, Math.max(g.w.panic, 500)); reportCrime(COP.crime.blast, COP.blastHear, g.x, g.y, true);
    }
  }
  if (grenades.some(g => g.dead)) { for (const g of grenades) if (g.dead && g.mesh) scene.remove(g.mesh); grenades = grenades.filter(g => !g.dead); }
}
function clink(g) { if ((g.clinkT || 0) < gameT && dist(g.x, g.y, P.x, P.y) < 500) { g.clinkT = gameT + 0.12; Snd.tone(900, 700, 0.05, 0.08, 'triangle'); } }
function clearGrenades() { for (const g of grenades) if (g.mesh) scene.remove(g.mesh); grenades = []; TA.on = TA.ok = false; }

/* ---------- drawing: the bombs in flight, the aiming arc ---------- */
function gfxGrenades() {
  for (const g of grenades) {
    if (!g.mesh) {
      const m = new THREE.Group(), inner = weaponModel(g.w.id); inner.scale.setScalar(1.3); m.add(inner);
      const l = new THREE.Mesh(GSph, mBas(0xff3b3b)); l.scale.setScalar(1.1); l.position.y = 3; m.add(l); m.userData.light = l; g.mesh = m; scene.add(m);
    }
    g.mesh.position.set(g.x, g.z + 2, g.y); g.mesh.rotation.set(0, -g.rot, g.rest ? Math.PI / 2 : g.rot * 0.7); g.mesh.userData.light.visible = g.blink > 0;
  }
}
let AIM = null;
function gfxThrowAim() {
  const w = WEAPONS[P.weapon], show = TA.on && TA.ok && state === 'play' && !P.car && !P.dead && isThrown(w);
  { const ring = $('rf'), on = TA.on && TA.by === 'touch' && state === 'play' && !P.car && !P.dead && isThrown(w);   // the touch stick around FIRE
    if (ring.style.display !== (on ? 'block' : 'none')) ring.style.display = on ? 'block' : 'none';
    if (on) {
      let dx = TS.fx - TA.ax, dy = TS.fy - TA.ay; const m = Math.hypot(dx, dy); if (m > THROW_PAD) { dx *= THROW_PAD / m; dy *= THROW_PAD / m; }
      ring.style.left = (TA.ax - 60) + 'px'; ring.style.top = (TA.ay - 60) + 'px';
      $('kf').style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'; $('kf').style.background = w.color;
    } }
  if (!AIM) {
    AIM = { dots: [], ring: new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })) };
    for (let k = 0; k < 16; k++) { const d = new THREE.Mesh(GSph, new THREE.MeshBasicMaterial({ color: 0xffffff })); d.scale.setScalar(1.3); scene.add(d); AIM.dots.push(d); }
    scene.add(AIM.ring);
  }
  AIM.ring.visible = show; for (const d of AIM.dots) d.visible = show;
  if (!show) return;
  const col = new THREE.Color(w.color), H = Math.min(140, 30 + TA.d * 0.45), gy = groundH(TA.tx, TA.ty);
  AIM.dots.forEach((d, k) => {
    const t = (k + 1) / (AIM.dots.length + 1);
    d.position.set(lerp(P.x, TA.tx, t), 14 * (1 - t) + 4 * H * t * (1 - t) + gy * t, lerp(P.y, TA.ty, t)); d.material.color.copy(col);
  });
  AIM.ring.position.set(TA.tx, gy + 2, TA.ty); AIM.ring.scale.setScalar(Math.max(8, w.blast)); AIM.ring.material.color.copy(col);
}
