'use strict';
/* ---------- 3. INPUT (keyboard, mouse, touch) ---------- */
const keys = {}, pressed = {};
const mouse = { x: 0, y: 0, down: false };
const TS = { mx: 0, my: 0, ax: 0, ay: 0, aim: false, fire: false, tap: 0, sprint: false, fx: 0, fy: 0 };  // touch state; fx, fy: where the finger on FIRE is now
let touchMode = false;

addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => { if (e.button === 0 && !touchMode) { mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; } });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
/* the browser's own touch gestures stay out of the game: pinch to zoom (Safari's gesture events, any move with two fingers or more),
   double-tap to zoom, the long-press menu. Buttons keep their taps: touch-action: manipulation already stops a double-tap zoom there */
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = e.timeStamp || Date.now(), tapTarget = e.target.closest && e.target.closest('button, a, input, select, textarea, label');
  if (now - lastTouchEnd < 350 && !tapTarget && e.cancelable) e.preventDefault();   // a second tap this soon would zoom the page
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
addEventListener('contextmenu', e => { if (touchMode) e.preventDefault(); });
cv.addEventListener('wheel', e => { pressed.wheel = e.deltaY > 0 ? 1 : -1; e.preventDefault(); }, { passive: false });

function enableTouch() {                    // a touch screen: the compact HUD - the weapon button and the action bar move under the cash (css: touch-on)
  if (touchMode) return; touchMode = true; document.documentElement.classList.add('touch-on');
  const ht = document.getElementById('hudTouch'); if (ht) ht.append(document.getElementById('weaponbar'), document.getElementById('reload'));
}
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enableTouch();
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouch(); }, true);

function bindStick(zone, ring, knob, onMove, onEnd) {
  let id = null, ox = 0, oy = 0; const R = 55;
  zone.addEventListener('pointerdown', e => {
    if (id !== null) return; id = e.pointerId;
    try { zone.setPointerCapture(id); } catch (err) { }
    ox = e.clientX; oy = e.clientY; const zr = zone.getBoundingClientRect();   // the ring sits in the zone: under the finger, not 20% lower
    ring.style.display = 'block'; ring.style.left = (ox - zr.left - 60) + 'px'; ring.style.top = (oy - zr.top - 60) + 'px';
    knob.style.transform = 'translate(0,0)'; onMove(0, 0); e.preventDefault();
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const m = Math.hypot(dx, dy);
    if (m > R) { dx = dx / m * R; dy = dy / m * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; onMove(dx / R, dy / R); e.preventDefault();
  });
  const end = e => { if (e.pointerId !== id) return; id = null; ring.style.display = 'none'; onEnd(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
bindStick($('zl'), $('rl'), $('kl'), (x, y) => { TS.mx = x; TS.my = y; }, () => { TS.mx = 0; TS.my = 0; });
function bindBtn(el, down, up) {
  el.addEventListener('pointerdown', e => { el.classList.add('down'); down(); e.preventDefault(); });
  const end = () => { el.classList.remove('down'); if (up) up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
}
(function () {                              // FIRE: held down it keeps firing; the finger may slide off it (to aim the rifle scope) and it still counts
  const b = $('bFire'); let id = null;
  b.addEventListener('pointerdown', e => {
    if (id !== null) return; id = e.pointerId; try { b.setPointerCapture(id); } catch (err) { }
    b.classList.add('down'); TS.fire = true; TS.tap = 3; TS.fx = e.clientX; TS.fy = e.clientY; e.preventDefault();
  });
  b.addEventListener('pointermove', e => { if (e.pointerId === id) { TS.fx = e.clientX; TS.fy = e.clientY; e.preventDefault(); } });
  const end = e => { if (e.pointerId !== id) return; id = null; b.classList.remove('down'); TS.fire = false; };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
})();
bindBtn($('bAct'), () => { pressed.KeyE = true; });
bindBtn($('bDash'), () => { TS.sprint = true; }, () => { TS.sprint = false; });
$('wBtn').addEventListener('click', () => { pressed.KeyQ = true; });   // opens the weapon wheel
$('mute').addEventListener('click', () => { pressed.KeyM = true; });
$('mini').addEventListener('click', () => { if (!bigOpen) pressed.Tab = true; });   // tap the minimap for the city map; tap the map to close it
$('radioBtn').addEventListener('click', () => { pressed.radio = true; });
$('bigmap').addEventListener('click', () => { pressed.Tab = true; });
function updateGearUi() {
  $('gD').classList.toggle('on', P.gear === 'D'); $('gR').classList.toggle('on', P.gear === 'R');
  $('shifter').dataset.g = P.gear;                                // no letters: the lever's place (up R, down D) and its glow (css)
}
function setGear(g) {                       // like the real dial: only shifts when you are nearly stopped
  if (P.gear === g || !P.car) return; const c = P.car;
  if (Math.abs(c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang)) > 20 * KMH) { toast('SLOW DOWN TO SHIFT', true); return; }
  P.gear = g; updateGearUi(); Snd.tone(320, 180, 0.06, 0.12, 'square');
}
bindBtn($('gR'), () => setGear('R')); bindBtn($('gD'), () => setGear('D'));
(function () {                              // drag or tap the stick up for R, down for D
  const slot = $('slot'), lever = $('lever'); let drag = false;
  const aim = e => { const r = slot.getBoundingClientRect(); setGear((e.clientY - r.top) / r.height < 0.5 ? 'R' : 'D'); };
  slot.addEventListener('pointerdown', e => { drag = true; try { slot.setPointerCapture(e.pointerId); } catch (err) { } lever.classList.add('down'); aim(e); e.preventDefault(); });
  slot.addEventListener('pointermove', e => { if (drag) aim(e); });
  const end = () => { drag = false; lever.classList.remove('down'); };
  slot.addEventListener('pointerup', end); slot.addEventListener('pointercancel', end);
})();

function readInput() {
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (Math.hypot(TS.mx, TS.my) > 0.12) { ix += TS.mx; iy += TS.my; }
  ix = clamp(ix, -1, 1); iy = clamp(iy, -1, 1);
  const tm = Math.hypot(TS.mx, TS.my), kk = Math.hypot((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0));
  const mag = Math.max(Math.min(1, tm), kk > 0 ? (keys.ShiftLeft || keys.ShiftRight ? 0.6 : 1) : 0);   // stick offset 0..1; keys run, Shift walks
  const tapFire = TS.tap > 0; if (tapFire) TS.tap--;
  return { ix, iy, mag, sprint: !!keys.Space || TS.sprint, fire: mouse.down || !!keys.KeyJ || TS.fire || tapFire,
    held: TS.fire ? 'touch' : mouse.down ? 'mouse' : keys.KeyJ ? 'key' : null };   // what is holding the trigger, for the rifle scope
}

