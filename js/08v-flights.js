'use strict';
/* ---------- 6v. FLIGHTS: the departures desk and the scenic flight ----------
   (js/01j flights; airport table: Flights) At the check-in booth out on the terminal's forecourt (the city side, js/10f), on its pad
   of light in front of the counter, a FLIGHTS button comes up by you, on foot: the departures board - Prague and Norfolk are COMING SOON, and a scenic flight over the city for EUR 5,000.
   The scenic flight is a cutscene (js/15c) with its own music (js/02c), at a random hour and in random weather each time:
     the walk - you cross the terminal hall (its roof taken off, js/10f) through security to gate 3;
     the push-back - the plane at the gate backs out onto the apron;
     the taxi - down the taxiway to the end of the runway;
     the flight - from your seat, through the oval window on the right: the take-off run, the climb, once round the city
       clockwise (so in the turns the window looks down on it) and in low over the water to land.
   The only button is LAND: it skips to the end. You come out at the check-in booth again, the game's own hour and weather back. */
const DESK = { x: 0, y: 0, pad: null };
const DESK_R = 30;
function placeFlights() {                // a new game: the pad of light in front of the check-in booth's counter
  if (!AIRF) return;
  DESK.x = CHECKIN.x; DESK.y = CHECKIN.y + 46;
  if (!DESK.pad) {
    const g = new THREE.Group(), m = (geo, op, sc) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#2bf3ff', transparent: true, opacity: op, depthWrite: false })); o.scale.setScalar(sc); g.add(o); return o; };
    m(GCirc, 0.18, DESK_R - 6).position.y = 1.4; const r = m(new THREE.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2), 0.9, DESK_R - 6); r.position.y = 1.6; g.userData.ring = r;
    DESK.pad = g; scene.add(g);
  }
  DESK.pad.position.set(DESK.x, groundH(DESK.x, DESK.y), DESK.y); DESK.pad.visible = feat('flights');
}
const nearFly = () => !!AIRF && feat('flights') && state === 'play' && !P.car && !P.dead && !P.act && Math.abs(P.x - DESK.x) < DESK_R && Math.abs(P.y - DESK.y) < DESK_R && dist(P.x, P.y, DESK.x, DESK.y) < DESK_R;
function flyKey() { if (!nearFly() || msShut()) return false; const c = nearestCar(); return !(c && dist(c.x, c.y, P.x, P.y) < dist(DESK.x, DESK.y, P.x, P.y) - 8); }
function flyUi(time) {                   // every frame (js/14): the FLIGHTS button by you at the booth
  const bt = $('flyBtn'), on = nearFly(); if (DESK.pad) DESK.pad.userData.ring.scale.setScalar(DESK_R - 6 + Math.sin(time * 3) * 1.5);
  if (!on || msShut()) { if (!bt.hidden) bt.hidden = true; return; }
  bt.hidden = false; doorBtnAt(bt);
}
$('flyBtn').addEventListener('click', e => { e.stopPropagation(); if (nearFly()) openFlyCard(); });
function openFlyCard() {
  state = 'fly'; toggleBigMap(false); toggleWheel(false); hush(); $('flyBtn').hidden = true;
  const hm = h => { h = ((h % 24) + 24) % 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor(h % 1 * 12) * 5).padStart(2, '0'); };
  const why = P.stars > 0 ? 'LOSE THE POLICE FIRST' : JOB.on ? 'FINISH THE JOB FIRST' : RAMP.on ? 'FINISH THE RAMPAGE FIRST' : RACE.on ? 'FINISH THE RACE FIRST' : P.score < AIRP.scenicPrice ? 'NOT ENOUGH CASH' : '';
  const rows = [['NOW', 'SCENIC FLIGHT', 'GATE 3', 'BOARDING', 'on'], [hm(SKY.hour + 1.35), 'PRAGUE', 'GATE 1', 'COMING SOON', 'soon'], [hm(SKY.hour + 2.1), 'NORFOLK', 'GATE 5', 'COMING SOON', 'soon']];
  $('flyBoard').innerHTML = ''; for (const r of rows) { const d = document.createElement('div'); d.className = 'fr ' + r[4]; for (const t of r.slice(0, 4)) { const s = document.createElement('span'); s.textContent = t; d.appendChild(s); } d.lastChild.className = 'st'; $('flyBoard').appendChild(d); }
  $('flySub').textContent = 'YOUR CASH ' + money(P.score) + '  ·  ' + skyText();
  $('flyWarn').textContent = why; $('flyWarn').hidden = !why; $('flyGo').hidden = !!why; $('flyGo').textContent = 'FLY  ·  ' + money(AIRP.scenicPrice);
  $('flyNo').classList.toggle('pri', !!why);
  showCard('flyCard', true);
}
function closeFlyCard() { if (state !== 'fly') return; state = 'play'; closeMenus(); }
$('flyGo').addEventListener('click', () => {
  closeFlyCard(); if (P.stars > 0 || JOB.on || RAMP.on || RACE.on || P.score < AIRP.scenicPrice || P.dead || !nearFly()) return;
  P.score -= AIRP.scenicPrice; scenicFlight();
});
$('flyNo').addEventListener('click', closeFlyCard);
/* ---------- the flight's rewards (js/01j flightPerks; airport table: boostPct, boostHours) ----------
   The first scenic flight gives the aviator cap (clothes table: shop reward) - in your wardrobe at any clothes shop or safehouse.
   Every flight after it makes you faster on foot for boostHours in-game hours (until the same hour the next day); another flight
   starts it again, it does not add up. The hours run with the clock (at the usual rate when the clock is stopped); sleeping in a
   safehouse uses the hours slept. A wing on the HUD shows the hours left. */
const flyFast = () => P.boostH > 0 && feat('flightPerks');
const flyBoostK = () => flyFast() ? 1 + AIRP.boostPct / 100 : 1;    // js/06: walking, running, sprinting
function flyBoostTick(dt) { if (P.boostH > 0) P.boostH = Math.max(0, P.boostH - dt * 24 * (OPT.clock || 1) / SKYP.dayMinutes); }   // js/12d
function flyReward() {                   // the toast's second half
  if (!feat('flightPerks')) return '';
  if (CLOTH.aviator_cap && !P.wardrobe.includes('aviator_cap')) { P.wardrobe.push('aviator_cap'); return ' - AN AVIATOR CAP FOR YOUR WARDROBE'; }
  P.boostH = AIRP.boostHours; return ' - +' + Math.round(AIRP.boostPct) + '% ON FOOT FOR ' + Math.round(AIRP.boostHours) + 'H';
}
function boostUi() {                     // every frame (js/14): the wing and the hours left
  const e = $('boostChip'), on = flyFast() && (state === 'play' || state === 'side');
  if (e.hidden === on) e.hidden = !on;
  if (on) { const h = Math.ceil(P.boostH) + 'H'; if (e.dataset.h !== h) { e.dataset.h = h; e.lastChild.textContent = '+' + Math.round(AIRP.boostPct) + '% ' + h; } }
}
function flyIcons(g, X, Y, q, inView) {  // js/14: a plane at the check-in booth on the maps
  if (!AIRF || !feat('flights')) return;
  const x = X(DESK.x), y = Y(DESK.y); if (!inView(x, y)) return;
  g.fillStyle = '#000'; g.fillRect(x - q - 1, y - q - 1, 2 * q + 2, 2 * q + 2); g.fillStyle = '#2bf3ff'; g.fillRect(x - q, y - q, 2 * q, 2 * q);
  g.fillStyle = '#0b0614'; g.fillRect(x - q * 0.12, y - q * 0.8, q * 0.24, q * 1.5);                       // the fuselage, nose up
  g.beginPath(); g.moveTo(x, y - q * 0.25); g.lineTo(x + q * 0.8, y + q * 0.12); g.lineTo(x - q * 0.8, y + q * 0.12); g.closePath(); g.fill();   // the wings
  g.fillRect(x - q * 0.36, y + q * 0.5, q * 0.72, q * 0.16);                                              // the tail
}

/* ---------- the scenic flight ---------- */
const SCENIC_ROUTE = [[1900, 9300], [3300, 5000], [6400, 1700], [10000, 1500], [13700, 3400], [14300, 7800], [13400, 12800], [10600, 15000], [7200, 15100], [4700, 13600], [3500, 16000], [2500, 17500], [1750, 17100], [1750, 15400]];   // once round the city, clockwise; the last points come in from the south to land
const SCENIC_WX = [['clear', 0.35], ['cloudy', 0.25], ['rain', 0.2], ['storm', 0.1], ['fog', 0.1]];
const _fp = new THREE.Object3D(), _fv = new THREE.Vector3(), _fu = new THREE.Vector3();
function scenicFlight() {
  const A = AIRF, si = Math.min(2, A.stands.length - 1), st = A.stands[si], [tx0, ty0, tx1, ty1] = A.terminal, tcx = (tx0 + tx1) / 2, tcy = (ty0 + ty1) / 2;
  const sky = { hour: SKY.hour, kind: SKY.kind, left: SKY.left, cloud: SKY.cloud, rain: SKY.rain, fog: SKY.fog, storm: SKY.storm, wet: SKY.wet }, h0 = { v: 0 };
  let pl = null, route = null, routeT0 = 0, routeT = 1, figures = [], lastCap = -99, lastDist = '', shake = 0;
  const walk = [[DESK.x, DESK.y], [tx1 + 26, tcy + 60], [tx1 - 60, tcy + 60], [tcx + 60, tcy], [tcx - 60, tcy], [tx0 + 22, st.y - 60]];   // from the booth in through the middle door
  const wlen = walk.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - walk[i][0], p[1] - walk[i][1]), 0);
  const along = (pts, s) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (s <= l || i === pts.length - 1) { const f = clamp(s / l, 0, 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]; } s -= l; } };
  const view = (x, y, h, lx, ly, lh, fov) => { CUT.view = { x, y, h, lx, ly, lh, fov }; };
  const planeView = (lx, ly, lh, tx, ty, th, fov) => {            // a camera fixed to the plane: where it is and what it looks at, in the plane's own axes
    _fp.position.set(pl.x, pl.h, pl.y); _fp.rotation.order = 'YZX'; _fp.rotation.set(pl.roll, -pl.ang, pl.pitch); _fp.updateMatrixWorld();
    _fv.set(lx, ly, lh); _fp.localToWorld(_fv); const cx = _fv.x, cy = _fv.y, cz = _fv.z; _fv.set(tx, ty, th); _fp.localToWorld(_fv);
    _fu.set(0, 1, 0).applyQuaternion(_fp.quaternion);
    CUT.view = { x: cx, y: cz, h: cy, lx: _fv.x, ly: _fv.z, lh: _fv.y, fov, up: { x: _fu.x, y: _fu.y, z: _fu.z } };
  };
  const people = () => {                 // travellers in the hall: in the queues, on the seats, at the shops
    const spots = [[150, -600], [162, -580], [174, -620], [150, 330], [162, 350], [186, 600], [-110, -130], [-90, -136], [-130, 162], [-40, -260], [-30, 220], [20, 470], [100, -40], [-170, 70]];
    for (const [lx, lz] of spots) { const o = buildPerson('ped', pick(['#e85d75', '#3fa7ff', '#ffd23f', '#5dff4f', '#a259ff', '#f2f2f2', '#ff7a3d']), pick(['#f2c6a0', '#c68e5a', '#8a5a36', '#e8b48a'])); o.g.position.set(tcx + lx, 0.8, tcy + lz); o.g.rotation.y = rand(0, TAU); scene.add(o.g); figures.push(o.g); }
  };
  cutPlay({
    skip: 'LAND', music: 'scenic',
    start() {
      const r = Math.random(); let k = 'clear', acc = 0; for (const [n, w] of SCENIC_WX) { acc += w; if (r < acc) { k = n; break; } }
      SKY.hour = rand(0, 24); setWeather(k, true); h0.v = SKY.hour; planeNext = gameT + 1e6;   // no other plane moves meanwhile (js/08i)
      P.car = null; P.vx = P.vy = 0;
    },
    shots: [
      { dur: 10, bars: true, cap: 'SKYPORT  ·  SCENIC FLIGHT', fadeIn: 0.9, fadeOut: 0.6,
        enter() { terminalRoof(true); people(); cam.zoom = 1.05; },
        tick(dt, t, u) {
          const s = wlen * smooth01(0, 1, u) , q = along(walk, s), q2 = along(walk, Math.min(wlen, s + 4));
          P.vx = (q2[0] - q[0]) / 4 * (wlen / 10); P.vy = (q2[1] - q[1]) / 4 * (wlen / 10); P.bob += Math.hypot(q[0] - P.x, q[1] - P.y) * 0.1; P.x = q[0]; P.y = q[1]; P.ang = q[2];   // the step goes on as you walk (js/06 is paused)
          cam.x = P.x - 40; cam.y = P.y; cam.zoom = lerp(1.05, 1.6, smooth01(0, 0.7, u));
        },
        leave() { terminalRoof(false); for (const g of figures) scene.remove(g); figures = []; CUT.hideP = true; P.vx = P.vy = 0; } },
      { dur: 6.5, bars: true, cap: 'FLIGHT SK 101  ·  GATE 3', fadeIn: 0.6,
        enter() {
          pl = PLANES.find(q => q.stand === si && q.mode === 'parked') || newPlane(st.x, st.y, st.a * Math.PI / 180, si);
          pl.cine = true; pl.legs = departureLegs(si); pl.mode = 'move'; pl.li = 0; pl.s = 0; pl.lift = null; startLeg(pl); pl.wait = 0.6;
        },
        tick(dt, t) { cam.x = pl.x; cam.y = pl.y; cam.zoom = 1; const a = pl.ang; view(pl.x - Math.cos(a) * 420 - Math.sin(a) * 260, pl.y - Math.sin(a) * 420 + Math.cos(a) * 260, 210 - t * 8, pl.x, pl.y, 10, 44); } },   // high over the apron, as it backs out towards you
      { dur: 7, bars: true, cap: 'CLEARED FOR TAKE-OFF', fadeIn: 0.6, fadeOut: 0.5,
        enter() { pl.li = 1; startLeg(pl); const L = pl.legs[1]; pl.s = Math.max(0, L.path.len - 900); pl.v = AIRP.taxi; pl.wait = 0; },
        tick(dt, t) { cam.x = pl.x; cam.y = pl.y; cam.zoom = 0.9; const a = pl.ang; view(pl.x - Math.cos(a) * 300 + Math.sin(a) * 160, pl.y - Math.sin(a) * 300 - Math.cos(a) * 160, 150 - t * 6, pl.x + Math.cos(a) * 220, pl.y + Math.sin(a) * 220, 10, 44); } },
      { dur: 13 + AIRP.scenicTime, win: true, cap: 'WELCOME ABOARD', fadeIn: 0.8, fadeOut: 1.6,
        enter() {
          pl.li = 2; startLeg(pl); pl.wait = 0.8; pl.v = 0; CUT.fog = [2600, 6800];   // far: the camera sees 7000 units
          Snd.burst(7, 220, 1300, 0.42, 'bandpass'); Snd.burst(9, 90, 300, 0.3);
        },
        tick(dt, t, u) {
          if (pl.mode === 'move' && pl.h > 70) {                 // off the ground: from here the route round the city
            const pts = [[pl.x, pl.y], [pl.x + Math.cos(pl.ang) * 900, pl.y + Math.sin(pl.ang) * 900], ...SCENIC_ROUTE];
            route = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); routeT0 = t; routeT = Math.max(10, CUT.T - t); pl.mode = 'cine'; pl.h0 = pl.h;
          }
          if (route) {
            const k = clamp((t - routeT0) / routeT, 0, 1), p = route.getPointAt(k), q = route.getTangentAt(Math.min(0.999, k)), q2 = route.getTangentAt(Math.min(0.999, k + 0.012));
            const cruise = AIRP.scenicHeight, land = Math.max(0, (k - 0.86) / 0.14);
            pl.x = p.x; pl.y = p.z; pl.h = lerp(pl.h0, cruise, smooth01(0, 0.12, k)) * (1 - land) + 140 * land;
            const ang = Math.atan2(q.z, q.x), turn = angDiff(ang, Math.atan2(q2.z, q2.x));
            pl.ang = ang; pl.roll = lerp(pl.roll, turn > 0 ? Math.min(0.4, turn * 6) : Math.max(-0.15, turn * 3), 1 - Math.exp(-1.5 * dt)); pl.pitch = lerp(pl.pitch, k < 0.12 ? 0.06 : land > 0 ? -0.05 : 0, 1 - Math.exp(-dt));   // right turns bank the window down onto the city; left ones barely
          } else shake = pl.v > 30 && pl.h < 2 ? 0.6 : 0.2;     // the runway rumbling under the wheels
          planeView(62 + rand(-1, 1) * (route ? 0 : shake), 26 + rand(-1, 1) * (route ? 0.1 : shake), 14, 62 + 70, 26 - 80, 314, 52);   // a seat ahead of the wing, looking out right and a little down
          const v = CUT.view, dx = v.lx - v.x, dy = v.ly - v.y, dh = v.lh - v.h, k = dh < -1 ? Math.min(4000 / Math.hypot(dx, dy), -v.h / dh) : 4000 / Math.hypot(dx, dy);
          const gx = v.x + dx * k, gy = v.y + dy * k; cam.x = (gx + v.x) / 2; cam.y = (gy + v.y) / 2; cam.zoom = 0.3;   // the city builds itself round what the window sees
          if (t > 6 && t - lastCap > 8) { const d = districtAt(gx, gy) || ''; if (d && d !== 'OPEN WATER' && d !== lastDist) { lastDist = d; lastCap = t; cutCaption('BELOW  ·  ' + d); } else if (t - lastCap > 5) cutCaption(''); }
          if (t > 3 && t < 4) cutCaption(skyText());
          rainOnWindow(dt, t);
        },
        leave() { rainOnWindow(0, 0, true); } }
    ],
    end() {
      terminalRoof(false); for (const g of figures) scene.remove(g); figures = [];
      if (pl && PLANES.includes(pl)) dropPlane(pl); planeNext = gameT + 20;
      const passed = ((SKY.hour - h0.v) + 24) % 24; Object.assign(SKY, sky); SKY.hour = (sky.hour + passed) % 24;
      P.x = DESK.x + 10; P.y = DESK.y; P.ang = 0; P.vx = P.vy = 0; cam.x = P.x; cam.y = P.y; cam.zoom = ZOOM_BASE; streamCity(true);
      toast('WELCOME BACK TO SKYPORT' + flyReward());
    }
  });
}
function rainOnWindow(dt, t, clear) {    // drops running across the window in the rain (the oval's own canvas)
  const cv = $('cutRain'), g = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  g.clearRect(0, 0, w, h); if (clear || SKY.rain < 0.15) return;
  const n = Math.round(60 * SKY.rain);
  g.strokeStyle = 'rgba(220,235,255,0.45)'; g.lineWidth = 1.4;
  for (let k = 0; k < n; k++) { const sx = (k * 97.13 % 1) * w, sp = 0.4 + (k * 37.7 % 1), y = ((t * sp * 0.35 + k * 0.137) % 1) * h, x = (sx + t * 60 * sp) % w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 14 * sp, y - 5); g.stroke(); }
}
