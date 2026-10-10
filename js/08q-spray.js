'use strict';
/* ---------- 6q. PAY 'N' SPRAY ----------
   The garages are built with the city (js/10j). Drive up to one in a car it takes and the roller door goes up (a green lamp);
   inside, stop in the bay and the door comes down behind you. A card asks for the colour - the kind's own paints first, then any
   colour (places table: hues) - and the car shows each one as you pick it. SPRAY pays (places table: price), the painter walks round
   the car with his gun in a cloud of the new colour, and it comes out repaired and repainted. Nobody saw you go in: the police lose
   you (up to the places table's stars). Taxis, buses, ambulances, fire engines and trash trucks are repaired and keep their livery;
   police cars, the tank and the APC are turned away, and so is a car too big for the bay or a driver short of cash (the door stays
   shut, a red lamp). On foot the door stays down, unless you are inside. Mode: sprayGarage. */
const PNSR = { at: null, sel: null, orig: null, liv: false, warnT: 0 };
const pnsPrice = () => Math.round(PLC.sprayPrice);
const pnsLivery = t => isService(t) && !t.cop;                       // public service colours stay as they are
let PNS_PAL = null;
function pnsPalette() {                   // any colour: each hue light, bright and dark, then white to black
  if (PNS_PAL) return PNS_PAL;
  const n = Math.max(4, Math.round(PLC.sprayHues)), c = new THREE.Color(), out = [];
  for (const [s, l] of [[0.85, 0.74], [1, 0.52], [0.9, 0.3]]) for (let k = 0; k < n; k++) out.push('#' + c.setHSL(k / n, s, l).getHexString());
  out.push('#f4f4f6', '#c9ccd6', '#8a8e98', '#55585f', '#2a2c33', '#111114');
  return (PNS_PAL = out);
}
function pnsCan(G, c) {                   // true, or why this garage will not take the car
  if (c.t.cop) return "WE DON'T TOUCH POLICE OR ARMY VEHICLES";
  if (c.t.len + 14 > 2 * (G.hd - PNS_WT) || c.t.wid + 6 > G.dw) return 'TOO BIG FOR THE SPRAY BAY';
  if (RACE.on && RACE.on.car === c && RACE.on.phase !== 'toStart') return 'NOT DURING A RACE';
  if (P.score < pnsPrice()) return money(pnsPrice()) + ' FOR A RESPRAY - YOU HAVE ' + money(P.score);
  return true;
}
function carInPns(G, c) { return carCircles(c).every(q => pnsIn(G, q[0], q[1], q[2] - 2)); }   // the whole car behind the door line
function pnsPaint(c, hex) {               // the car's colour (and its underglow), as it would be built in it
  c.color = hex; if (!c.baseCol) return;
  c.baseCol.set(hex); c.hpShown = -1; c.glowing = true;                 // js/11 sets the body (and its glow) again on the next frame
  if (c.m && c.m.ug) c.m.ug.material = glowMat(hex, 0.9);
}
function doorBlocked(G) {                 // something standing under the door: it waits
  const q = {}, lim = (x, z, r) => Math.abs(x) < G.dw / 2 + r && Math.abs(z - (G.hd - PNS_WT / 2)) < PNS_WT / 2 + r + 2;
  for (const c of cars) { if (dist(c.x, c.y, G.dx, G.dy) > 160) continue; for (const p of carCircles(c)) { pnsLocal(G, p[0], p[1], q); if (lim(q.x, q.z, p[2])) return true; } }
  for (const list of [peds, officers]) for (const p of list) { if (p.dead || dist(p.x, p.y, G.dx, G.dy) > 60) continue; pnsLocal(G, p.x, p.y, q); if (lim(q.x, q.z, 8)) return true; }
  if (!P.car && !P.dead) { pnsLocal(G, P.x, P.y, q); if (lim(q.x, q.z, 8)) return true; }
  return false;
}
const _pnl = {};
function pnsTick(dt) {                    // js/15 update: the doors, who comes in, the spraying
  if (!PNS.length) return;
  PNSR.warnT -= dt;
  const on = feat('sprayGarage') && !P.dead, me = P.car || P, c = P.car;
  for (const G of PNS) {
    pnsLocal(G, me.x, me.y, _pnl);
    const pin = pnsIn(G, me.x, me.y, 0), atDoor = Math.abs(_pnl.x) < G.dw / 2 + 90 && _pnl.z > G.hd - 10 && _pnl.z < G.hd + 150;
    const close = pin || (Math.abs(_pnl.x) < G.dw / 2 + 40 && _pnl.z > G.hd - 10 && _pnl.z < G.hd + 60);
    if (!close && G.phase !== 'spray') G.seen = false;                     // they must see you at the door or inside
    else if (P.stars > 0 && PS.seen && G.phase !== 'spray') G.seen = true;
    const inn = !!c && on && carInPns(G, c);
    if (!inn && G.used && G.phase !== 'spray') G.used = false;
    let want = false;
    if (G.phase === 'idle') {
      if (!on) want = false;
      else if (pin) want = true;
      else if (c && atDoor) {
        const ok = pnsCan(G, c); want = ok === true;
        const slow = _pnl.z < G.hd + 60 && carSpeed(c) < 70;                // turning in, not driving past
        if (!want && slow && PNSR.warnT <= 0) { PNSR.warnT = 4; toast(ok, true); }
        if (want && slow && !G.hinted) { G.hinted = true; toast("PAY 'N' SPRAY - DRIVE IN AND STOP · " + money(pnsPrice())); }
      }
      if (!atDoor && !pin) G.hinted = false;
      if (inn && !G.used && carSpeed(c) < 10 && pnsCan(G, c) === true) {   // stopped in the bay: down comes the door
        G.phase = 'shut'; G.car = c; if (c.burn > 0) { c.burn = 0; c.hp = Math.max(c.hp, 1); }   // a burning car: the crew puts it out first
      }
    } else if (G.phase === 'shut') {
      if (!c || c !== G.car || !inn || carSpeed(c) > 20) { G.phase = 'idle'; want = true; }   // drove off: up again
      else if (G.open <= 0) { G.open = 0; openPns(G); }
    } else if (G.phase === 'spray') {
      G.t += dt; pnsSpraying(G, dt);
      if (G.t >= PLC.sprayTime) pnsDone(G);
    } else if (G.phase === 'out') {
      want = true; if (!inn) G.phase = 'idle';
    }
    const was = G.open, rate = dt / Math.max(0.1, PLC.sprayDoor);
    if (want) G.open = Math.min(1, G.open + rate);
    else if (G.open > 0 && !(G.open > 0.15 && doorBlocked(G))) G.open = Math.max(0, G.open - rate);
    if ((was === 0 && G.open > 0) || (was === 1 && G.open < 1)) { const d = dist(me.x, me.y, G.dx, G.dy); if (d < 400) Snd.burst(PLC.sprayDoor, 260, 110, 0.14 * (1 - d / 400)); }   // the door's motor
    G.ds.off = G.open > 0.85;
    pnsPainter(G, dt);
  }
}

/* ---------- the card: the car's own paints, any colour, SPRAY or LEAVE ---------- */
function openPns(G) {
  const c = P.car; if (!c) { G.phase = 'idle'; return; }
  PNSR.at = G; PNSR.orig = c.color; PNSR.liv = pnsLivery(c.t);
  const any = pnsPalette().filter(h => h !== c.color);
  PNSR.sel = PNSR.liv ? null : any[Math.floor(Math.random() * any.length)];   // a new colour to start with: SPRAY (or Enter) takes it
  G.phase = 'card'; state = 'pns'; toggleBigMap(false); toggleWheel(false); hush();
  $('pnsName').textContent = c.t.name; $('pnsSub').textContent = 'YOUR CASH ' + money(P.score) + '  ·  RESPRAY AND REPAIR ' + money(pnsPrice());
  $('pnsPaints').hidden = PNSR.liv; $('pnsGo').textContent = (PNSR.liv ? 'REPAIR ' : 'SPRAY ') + money(pnsPrice());
  const fill = (box, list) => {
    box.innerHTML = '';
    for (const h of list) {
      const b = document.createElement('button'); b.type = 'button'; b.style.background = h; b.dataset.h = h; b.title = colourName(h);
      if (h === c.color) b.classList.add('now');
      b.addEventListener('click', () => pnsPick(h)); box.appendChild(b);
    }
  };
  if (!PNSR.liv) { fill($('pnsOwn'), [...new Set(c.t.colors)]); fill($('pnsAny'), pnsPalette()); pnsPick(PNSR.sel); }
  else pnsSay('A ' + c.t.name + ' KEEPS ITS LIVERY: A FULL REPAIR');
  showCard('pnsCard', true); Snd.tone(523, 659, 0.12, 0.1, 'square');
  const top = $('pnsCard').getBoundingClientRect().top / VH;              // the camera moves so the car sits in the open space above the card
  cam.zoom = Math.max(cam.zoom, 1.3); cam.x = c.x; cam.y = c.y + clamp(0.5 - top / 2, 0, 0.42) * 2 * visHalfV() / cam.zoom;
}
function pnsPick(h) {                     // the car shows it at once
  PNSR.sel = h; pnsPaint(P.car, h);
  for (const b of document.querySelectorAll('#pnsCard .sws button')) b.classList.toggle('sel', b.dataset.h === h);
  pnsSay(colourName(h) + (h === PNSR.orig ? ' - THE SAME AS NOW' : ''));
}
function pnsSay(t) { $('pnsMsg').textContent = t; }
function closePns(go) {                   // LEAVE: the old colour back and the door up; SPRAY: pay, and the painter gets to work
  if (state !== 'pns' || !PNSR.at) return;
  const G = PNSR.at, c = P.car; state = 'play'; closeMenus(); PNSR.at = null;
  if (c && !PNSR.liv) pnsPaint(c, PNSR.orig);
  if (!go || !c || P.score < pnsPrice()) { G.phase = 'out'; G.used = true; return; }
  P.score -= pnsPrice(); G.phase = 'spray'; G.t = 0; G.liv = PNSR.liv; G.from = new THREE.Color(PNSR.orig); G.to = PNSR.liv ? PNSR.orig : PNSR.sel || PNSR.orig; G.car = c; G.hiss = 0;
  Snd.tone(880, 1320, 0.08, 0.14, 'square');
}
$('pnsGo').addEventListener('click', () => closePns(true));

/* ---------- spraying: the painter goes round the car, the paint mists over it and the new colour comes through ---------- */
const _pc = new THREE.Color();
function pnsSpraying(G, dt) {
  const c = G.car; if (!c || c.dead || P.car !== c) { G.phase = 'out'; G.used = true; return; }
  const k = clamp((G.t / PLC.sprayTime - 0.15) / 0.7, 0, 1);
  if (!G.liv && c.baseCol) { c.baseCol.copy(G.from).lerp(_pc.set(G.to), k); c.hpShown = -1; c.glowing = true; }
  const col = G.liv ? '#e8eef6' : G.to; G.mist = (G.mist || 0) + dt * 70;
  while (G.mist >= 1 && G.px !== undefined) {                            // a cloud from the gun toward the car, and a haze settling on it
    G.mist -= 1;
    if (Math.random() < 0.65) {
      const a = Math.atan2(c.y - G.py, c.x - G.px), s = rand(70, 140);
      addP({ x: G.px + Math.cos(a) * 8, y: G.py + Math.sin(a) * 8, z: rand(14, 24), vz: rand(-2, 12), grav: 0, vx: Math.cos(a + rand(-0.35, 0.35)) * s, vy: Math.sin(a + rand(-0.35, 0.35)) * s, life: rand(0.5, 0.9), max: 0.9, s0: 4, s1: 20, col, drag: 2.5, alpha: 0.6 });
    } else {
      const o = rand(-0.5, 0.5) * c.t.len, w = rand(-0.5, 0.5) * c.t.wid;
      addP({ x: c.x + Math.cos(c.ang) * o - Math.sin(c.ang) * w, y: c.y + Math.sin(c.ang) * o + Math.cos(c.ang) * w, z: rand(22, 34), vz: rand(-6, 4), grav: 0, vx: rand(-12, 12), vy: rand(-12, 12), life: rand(0.8, 1.4), max: 1.4, s0: 8, s1: 22, col, drag: 1, alpha: 0.35 });
    }
  }
  if ((G.hiss -= dt) <= 0) { G.hiss = 0.32; Snd.burst(0.36, 7000, 3500, 0.05, 'highpass'); }
}
function pnsDone(G) {                     // done: repaired and repainted; nobody saw you go in, nobody is after you
  const c = G.car; G.phase = 'out'; G.used = true;
  if (c && !c.dead) { if (!G.liv) pnsPaint(c, G.to); c.hp = c.maxhp; c.burn = 0; c.hpShown = -1; }
  let msg = G.liv ? 'REPAIRED' : 'RESPRAYED ' + colourName(G.to);
  if (P.stars > 0 && feat('police')) {
    if (!G.seen && P.stars <= PLC.sprayLose) { clearWanted(msg + ' - THEY LOST YOU'); msg = null; }
    else msg += G.seen ? ' - THEY SAW YOU GO IN' : ' - STILL WANTED';
  }
  if (msg) toast(msg);
  Snd.tone(1046, 1568, 0.12, 0.13, 'square'); setTimeout(() => Snd.tone(1568, 2093, 0.1, 0.1, 'square'), 110);
  if (!saveBlock()) putSave('auto', makeSave(lastThumb));
}
function pnsPainter(G, dt) {              // where the painter is (world): by the bench, or going round the car
  const B = PNS_BAY / 2, q = {};
  let tx, ty, face, spd = 45;
  if (G.phase === 'spray' && G.car) {
    const c = G.car, u = (G.t / PLC.sprayTime) * TAU * 1.1 - 2.4, rx = c.t.len / 2 + 13, ry = c.t.wid / 2 + 13, ca = Math.cos(c.ang), sa = Math.sin(c.ang);
    const ex = Math.cos(u) * rx, ey = Math.sin(u) * ry; tx = c.x + ca * ex - sa * ey; ty = c.y + sa * ex + ca * ey; face = Math.atan2(c.y - ty, c.x - tx); spd = 160;
  } else { pnsWorld(G, -B - 3, -G.hd + PNS_WT + 22, q); tx = q.x; ty = q.y; face = G.a; }
  if (G.px === undefined) { G.px = tx; G.py = ty; G.pang = face; G.walk = 0; }
  const d = dist(G.px, G.py, tx, ty), st = Math.min(d, spd * dt);
  if (d > 0.5) { G.px += (tx - G.px) / d * st; G.py += (ty - G.py) / d * st; G.walk += st; }
  G.pang = d > 6 && G.phase !== 'spray' ? Math.atan2(ty - G.py, tx - G.px) : face;
  G.moving = d > 0.5;
}

/* ---------- js/06: no getting out, no weapons, the car held still while it is sprayed ---------- */
const pnsBusy = () => PNS.some(G => G.phase === 'spray' && G.car === P.car);
function pnsLocked(what) { if (!P.car || !pnsBusy()) return false; if (what && PNSR.warnT <= 0) { PNSR.warnT = 1.5; toast(what, true); } return true; }
function pnsHold(c, dt) {
  if (!PNS.some(G => G.phase === 'spray' && G.car === c)) return;
  c.thr = 0; c.str = 0; c.hb = true; const k = Math.exp(-8 * dt); c.vx *= k; c.vy *= k; c.av *= k;
}

function pnsReset() {                     // js/15 resetGame: every door down, nobody inside
  for (const G of PNS) { G.phase = 'idle'; G.open = 0; G.used = G.seen = G.hinted = false; G.car = null; G.px = undefined; if (G.ds) G.ds.off = false; }
  PNSR.at = null;
}

/* ---------- js/13: door, roof, lamp, sign and painter ---------- */
let pnsT = 0;
function gfxPns(time) {
  const dt = Math.min(0.1, Math.max(0, time - pnsT)); pnsT = time;
  const me = P.car || P, q = {};
  for (const G of PNS) {
    const pt = G.pt; if (!G.lm.mesh || !pt) continue;
    const inside = !P.dead && pnsIn(G, me.x, me.y, -6);
    G.roof += ((inside ? 0.1 : 1) - G.roof) * Math.min(1, dt * 6);
    if (Math.abs(G.roof - pt.op) > 0.003) {
      pt.op = G.roof; pt.roofMat.opacity = pt.roofGlow.opacity = G.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = G.roof > 0.97;
      pt.sign.material.opacity = G.roof; pt.sign.visible = G.roof > 0.15;
    }
    pt.door.scale.y = Math.max(0.03, 1 - G.open); pt.door.visible = G.open < 0.99;
    const busy = G.phase === 'shut' || G.phase === 'card' || G.phase === 'spray', open = G.open > 0.5;
    pt.lampMat.color.setHex(!feat('sprayGarage') ? 0x3a3d47 : busy ? 0xff3b3b : open ? 0x3dff7a : Math.floor(time * 2) % 2 ? 0x3dff7a : 0x1d7a3a);
    const p = pt.painter; if (G.px === undefined) continue;
    pnsLocal(G, G.px, G.py, q); p.g.position.set(q.x, 0.4, q.z); p.g.rotation.y = -(G.pang - G.a);
    const sw = G.moving ? Math.sin(G.walk * 0.25) * 0.6 : 0;
    p.legs[0].rotation.z = sw; p.legs[1].rotation.z = -sw;
    const aim = G.phase === 'spray' ? -1.35 : 0; p.arms[0].rotation.z = aim || -sw * 0.6; p.arms[1].rotation.z = aim || sw * 0.6;
  }
}

/* ---------- js/14: a spray can on the minimap and the city map ---------- */
function pnsIcons(g, X, Y, q, inView) {
  if (!feat('sprayGarage')) return;
  for (const G of PNS) {
    const x = X(G.dx), y = Y(G.dy); if (!inView(x, y)) continue;
    g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#ff2bd6'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
    g.fillStyle = '#0b0614'; g.fillRect(x - q * 0.55, y - q * 0.3, q * 0.7, q * 1.05); g.fillRect(x - q * 0.4, y - q * 0.58, q * 0.4, q * 0.3);
    g.fillStyle = '#ffffff'; for (const [dx, dy] of [[0.45, -0.6], [0.7, -0.35], [0.5, -0.1], [0.75, 0.15]]) g.fillRect(x + dx * q - 1, y + dy * q - 1, 2, 2);
  }
}
