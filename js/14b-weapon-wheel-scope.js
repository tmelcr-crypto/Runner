'use strict';
/* ---------- 8b. WEAPON WHEEL AND RIFLE SCOPE ----------
   The weapon button opens a wheel with every weapon, its picture and its ammo; the game waits until you tap one (tap outside to go back).
   The sniper rifle aims through a scope: hold FIRE and drag. The scope sits above your finger, so the finger does not cover it, and shows
   what is under its centre at 4x; everything outside it is blurred. Let go to shoot - only standing still, with a round chambered.
   The game keeps running while you aim. With a mouse the scope is on the pointer; with the J key the arrow keys move it.
   The rocket launcher aims the same way through a different sight: a wide amber 2x viewfinder with corner brackets and a range
   readout, the rest of the view darkened rather than blurred, gone as soon as the rocket is away.
   You can only shoot what you can see: a building between you and the crosshair blocks the shot (props and cars do not). */

// pictures, side view, pointing right; all in the same 96 x 40 box
const WICON = {
  pistol: '<svg viewBox="0 0 96 40" fill="currentColor"><rect x="26" y="8" width="44" height="9" rx="2"/><rect x="66" y="6" width="3" height="3"/><rect x="34" y="17" width="28" height="4"/>' +
    '<path d="M36 18h13l-4 19H32z"/><path d="M50 21v3a5 5 0 0 1-5 5h-1" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  mg: '<svg viewBox="0 0 96 40" fill="currentColor"><rect x="22" y="9" width="46" height="12" rx="2"/><rect x="66" y="12" width="20" height="5"/><rect x="84" y="10" width="3" height="9"/>' +
    '<rect x="6" y="12" width="17" height="4"/><rect x="3" y="9" width="5" height="12" rx="1"/><path d="M44 21h9l-2 17h-9z"/><path d="M28 21h8l-3 12h-8z"/><rect x="30" y="5" width="22" height="4"/></svg>',
  sniper: '<svg viewBox="0 0 96 40" fill="currentColor"><path d="M2 16l28-3 2 11H21l-9 7H2z"/><rect x="28" y="13" width="28" height="9" rx="1"/><rect x="55" y="15.5" width="39" height="3"/>' +
    '<rect x="91" y="14" width="4" height="6"/><rect x="33" y="4" width="22" height="6" rx="3"/><rect x="31" y="5" width="3" height="4"/><rect x="38" y="10" width="3" height="3"/><rect x="47" y="10" width="3" height="3"/>' +
    '<rect x="41" y="22" width="7" height="7"/><path d="M30 22h7l-3 10h-6z"/><path d="M78 18l-5 13M79 18l5 13" stroke="currentColor" stroke-width="2"/></svg>',
  rocket: '<svg viewBox="0 0 96 40" fill="currentColor"><rect x="10" y="13" width="62" height="10" rx="2"/><rect x="4" y="11" width="8" height="14" rx="1"/><path d="M72 11.5h6l13 6.5-13 6.5h-6z"/>' +
    '<rect x="38" y="6" width="10" height="7" rx="1"/><rect x="41" y="4" width="4" height="3"/><path d="M28 23h7l-2 11h-7z"/><path d="M50 23h6l-1 8h-6z"/><rect x="60" y="12" width="2" height="12" fill="#0b0618" opacity=".55"/></svg>'
};
const pad = (n, k) => String(Math.max(0, n)).padStart(k, '0');

/* ---------- the wheel ---------- */
let wheelOpen = false;
(function buildWheel() {
  const ring = $('wring'), n = WEAPONS.length;
  ring.style.background = 'repeating-conic-gradient(from ' + (-90 + 180 / n) + 'deg, rgba(122,60,255,.55) 0 0.7deg, transparent 0.7deg ' + (360 / n) + 'deg), ' +
    'radial-gradient(circle, rgba(16,6,36,.94) 0 62%, rgba(26,10,56,.9) 63%)';
  WEAPONS.forEach((w, i) => {
    const b = document.createElement('button'), a = (-90 + i * 360 / n) * Math.PI / 180;
    b.type = 'button'; b.className = 'wslot'; b.dataset.w = i;
    b.style.left = (50 + Math.cos(a) * 31) + '%'; b.style.top = (50 + Math.sin(a) * 31) + '%';
    b.innerHTML = '<span class="wico">' + WICON[w.id] + '</span><span class="wn">' + w.name + '</span><span class="wa"></span><span class="wk">' + (i + 1) + '</span>';
    b.addEventListener('click', e => { e.stopPropagation(); pickWeapon(i); });
    ring.appendChild(b);
  });
  ring.addEventListener('click', e => e.stopPropagation());
  $('wcenter').addEventListener('click', e => { e.stopPropagation(); toggleWheel(false); });
  $('wheel').addEventListener('click', () => toggleWheel(false));            // tap outside the wheel: back to the game, weapon unchanged
})();
function toggleWheel(on) {
  wheelOpen = (on === undefined ? !wheelOpen : on) && state === 'play' && !P.dead;
  $('wheel').hidden = !wheelOpen;
  if (!wheelOpen) return;
  SCOPE.on = false; if (bigOpen) toggleBigMap(false);
  for (const b of document.querySelectorAll('.wslot')) {
    const i = +b.dataset.w; b.classList.toggle('on', i === P.weapon); b.classList.toggle('empty', P.mag[i] + P.ammo[i] <= 0);
    b.querySelector('.wa').textContent = pad(P.mag[i], 2) + ' / ' + pad(P.ammo[i], 3);
  }
  $('wcName').textContent = WEAPONS[P.weapon].name;
  Snd.setEngine(false, 0, 0); Snd.setScreech(0); Snd.setSiren(0, 0); Snd.tone(520, 760, 0.06, 0.1, 'square');
}
function pickWeapon(i) {
  if (i !== P.weapon) { P.weapon = i; Snd.tone(330, 660, 0.08, 0.14, 'square'); }
  P.trig = true; toggleWheel(false);                             // the tap that picked it does not also fire
}

/* ---------- the scope ---------- */
const SCOPE = { on: false, hold: false, by: null, sx: 0, sy: 0, hw: 100, hh: 100, aim: null, ready: false, hit: false, tag: '' };   // hw, hh: half size; hold: shown after a shot while the bolt works
const _sRay = new THREE.Raycaster(), _sV = new THREE.Vector2(), _sP = new THREE.Vector3(), _sQ = new THREE.Vector3();
const scopeRadius = () => Math.round(clamp(Math.min(VW, VH) * 0.21, 74, 150));
function worldToScreen(x, y) { placeCamera(false); _sP.set(x, 0, y).project(camera); return { x: (_sP.x + 1) / 2 * VW, y: (1 - _sP.y) / 2 * VH }; }
function scopePick(sx, sy) {            // what the crosshair is on: the nearest person or car the line of sight passes through, else the ground
  placeCamera(false); _sV.set(sx / VW * 2 - 1, -(sy / VH) * 2 + 1); _sRay.setFromCamera(_sV, camera); const ray = _sRay.ray;
  let best = null, bt = Infinity;
  const test = (x, h, y, r) => {
    _sP.set(x, h, y); if (ray.distanceSqToPoint(_sP) > r * r) return;
    const t = _sQ.copy(_sP).sub(ray.origin).dot(ray.direction); if (t < bt) { bt = t; best = { x, y, hit: true }; }
  };
  for (const p of peds) if (!p.dead) test(p.x, 14, p.y, 10);
  for (const o of officers) if (!o.dead) test(o.x, 14, o.y, 10);
  for (const c of cars) if (c !== P.car && !c.sunk) for (const q of carCircles(c)) test(q[0], 9, q[1], q[2] + 2);
  if (best) return best;
  return ray.intersectPlane(_pl, _sQ) ? { x: _sQ.x, y: _sQ.z, hit: false } : null;
}
function updateScope(inp, dt) {         // called from updatePlayer while a scoped weapon is out and you are on foot
  const w = WEAPONS[P.weapon], sc = w.scope, held = inp.held, R = scopeRadius(), rect = sc.shape === 'rect';
  SCOPE.hw = rect ? Math.round(R * 1.3) : R; SCOPE.hh = rect ? Math.round(R * 0.8) : R;
  if (SCOPE.hold) {                                              // after a shot the scope stays where it was while the bolt works (1.5 s), the finger does nothing;
    if (P.cool <= 0) { SCOPE.on = SCOPE.hold = false; return; }   // after the last round the magazine reload is already running and this counts toward it
    SCOPE.tag = P.relW === P.weapon ? 'RELOADING ' + Math.max(0, w.reload - P.rel).toFixed(1) + 'S' : 'NEXT ROUND ' + P.cool.toFixed(1) + 'S';
    return;
  }
  if (held && !SCOPE.on && !P.trig) {                            // a fresh press starts aiming (once the scope from the last shot is gone)
    SCOPE.on = true; SCOPE.by = held;
    if (held === 'key') { const q = worldToScreen(P.x + Math.cos(P.ang) * 360, P.y + Math.sin(P.ang) * 360); SCOPE.sx = q.x; SCOPE.sy = q.y; }
  }
  if (!SCOPE.on) return;
  if (held === 'touch') { SCOPE.sx = TS.fx; SCOPE.sy = TS.fy - SCOPE.hh - 46; }    // just above the finger
  else if (held === 'mouse') { SCOPE.sx = mouse.x; SCOPE.sy = mouse.y; }
  else if (held === 'key') { SCOPE.sx += inp.ix * 520 * dt; SCOPE.sy += inp.iy * 520 * dt; }
  SCOPE.sx = clamp(SCOPE.sx, SCOPE.hw + 4, VW - SCOPE.hw - 4); SCOPE.sy = clamp(SCOPE.sy, SCOPE.hh + 4, VH - SCOPE.hh - 4);
  SCOPE.aim = scopePick(SCOPE.sx, SCOPE.sy); SCOPE.hit = !!(SCOPE.aim && SCOPE.aim.hit);
  if (SCOPE.aim) P.ang = Math.atan2(SCOPE.aim.y - P.y, SCOPE.aim.x - P.x);
  const still = Math.hypot(P.vx, P.vy) < 12 && (SCOPE.by === 'key' || inp.mag <= 0.4);   // a stick pushed only far enough to turn you still counts as standing
  let tag = 'READY', ready = false;
  if (P.relW === P.weapon) tag = 'RELOADING ' + Math.max(0, w.reload - P.rel).toFixed(1) + 'S';
  else if (P.mag[P.weapon] <= 0) tag = P.ammo[P.weapon] > 0 ? 'RELOADING' : 'NO AMMO';
  else if (P.cool > 0) tag = 'NEXT ROUND ' + P.cool.toFixed(1) + 'S';
  else if (sc.los && SCOPE.aim && !losClear(P.x, P.y, SCOPE.aim.x, SCOPE.aim.y, true)) tag = 'NO LINE OF SIGHT';   // a building is in the way
  else if (!still) tag = 'STAND STILL TO SHOOT';
  else ready = true;
  SCOPE.ready = ready;
  if (ready && w.rocket && SCOPE.aim) {                          // the launcher's sight reads out the range, and warns when the blast would reach you
    const m = Math.round(dist(P.x, P.y, SCOPE.aim.x, SCOPE.aim.y) / MPS);
    SCOPE.tag = (m * MPS < RK_R + 20 ? 'DANGER CLOSE ' : SCOPE.hit ? 'ON TARGET ' : 'RANGE ') + m + ' M';
  } else SCOPE.tag = ready && SCOPE.hit ? 'ON TARGET' : tag;
  if (!held) {                                                   // let go: the shot
    if (ready && SCOPE.aim) {
      fireWeapon(SCOPE.aim);
      if (sc.hold) { if (P.mag[P.weapon] > 0) Snd.bolt(); SCOPE.hold = true; SCOPE.ready = SCOPE.hit = false; }   // the rifle's scope stays up for the bolt time
      else SCOPE.on = false;                                     // the launcher's sight goes at once
    } else { SCOPE.on = false; Snd.tone(120, 90, 0.06, 0.12, 'square'); }
  }
}
const scopeLive = () => SCOPE.on && state === 'play' && !P.car && !P.act && !P.dead && !P.knocked && !bigOpen && !wheelOpen && !!WEAPONS[P.weapon].scope;

/* the frame while aiming: the whole view at half size (it gets blurred), the zoomed circle, then both put together on screen */
let scopeRT = null, blurRT = null, compMat = null, compScene = null, compCam = null;
function scopeSetup() {
  scopeRT = new THREE.WebGLRenderTarget(4, 4); blurRT = new THREE.WebGLRenderTarget(4, 4);
  compMat = new THREE.ShaderMaterial({
    uniforms: { tMain: { value: blurRT.texture }, tScope: { value: scopeRT.texture }, uC: { value: new THREE.Vector2() }, uHalf: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
      uPx: { value: new THREE.Vector2() }, uRect: { value: 0 }, uBlur: { value: 1 }, uCorner: { value: 12 } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tMain, tScope; uniform vec2 uC, uHalf, uRes, uPx; uniform float uRect, uBlur, uCorner;',
      'void main() {',
      '  vec2 fc = gl_FragCoord.xy, p = fc - uC; float sd;',           // signed distance to the scope edge, negative inside
      '  if (uRect < 0.5) sd = length(p) - uHalf.x;',
      '  else { vec2 q = abs(p) - uHalf + uCorner; sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCorner; }',
      '  if (sd < 0.0) {',
      '    vec3 c = texture2D(tScope, p / (2.0 * uHalf) + 0.5).rgb;',
      '    if (uRect < 0.5) c *= 1.0 - 0.45 * smoothstep(-0.2 * uHalf.x, 0.0, sd);',
      '    else { float l = dot(c, vec3(0.3, 0.59, 0.11));',              // the launcher sight: amber glass with scan lines
      '      c = mix(c, vec3(l * 1.3, l * 0.98, l * 0.55) + vec3(0.05, 0.025, 0.0), 0.6); c *= 0.86 + 0.14 * sin(fc.y * 1.7); c *= 1.0 - 0.35 * smoothstep(-26.0, 0.0, sd); }',
      '    gl_FragColor = vec4(c, 1.0); return;',
      '  }',
      '  vec2 uv = fc / uRes; vec3 c = vec3(0.0); float rim = 1.0 - smoothstep(0.0, 40.0, sd);',
      '  if (uBlur > 0.5) { for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) c += texture2D(tMain, uv + vec2(float(i), float(j)) * uPx * 1.7).rgb; c = c / 25.0 * (0.62 - 0.3 * rim); }',
      '  else { c = texture2D(tMain, uv).rgb; c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.65) * 0.42 + vec3(0.07, 0.02, 0.0) * rim; }',   // the launcher: the rest darkened, not blurred
      '  gl_FragColor = vec4(c, 1.0);',
      '}'].join('\n'),
    depthTest: false, depthWrite: false
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat); q.frustumCulled = false;
  compScene = new THREE.Scene(); compScene.add(q); compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}
function renderWithScope() {
  if (!compMat) scopeSetup();
  const sc = WEAPONS[P.weapon].scope, pr = renderer.getPixelRatio(), W = Math.round(VW * pr), Hh = Math.round(VH * pr), hw = SCOPE.hw, hh = SCOPE.hh, Z = sc.zoom;
  const div = sc.blur ? 2 : 1, bw = Math.max(1, Math.round(W / div)), bh = Math.max(1, Math.round(Hh / div)), sw = Math.round(2 * hw * pr), sh = Math.round(2 * hh * pr);
  if (blurRT.width !== bw || blurRT.height !== bh) blurRT.setSize(bw, bh);                 // half size when it gets blurred anyway
  if (scopeRT.width !== sw || scopeRT.height !== sh) scopeRT.setSize(sw, sh);
  const u = partMat.uniforms.uScale, us = u.value;                // particles keep their size in each view
  u.value = us / div; renderer.setRenderTarget(blurRT); renderer.render(scene, camera);
  camera.setViewOffset(VW, VH, SCOPE.sx - hw / Z, SCOPE.sy - hh / Z, 2 * hw / Z, 2 * hh / Z);   // the patch under the scope, Z times bigger
  u.value = us * Z; renderer.setRenderTarget(scopeRT); renderer.render(scene, camera);
  camera.clearViewOffset(); u.value = us; renderer.setRenderTarget(null);
  const U = compMat.uniforms; U.uC.value.set(SCOPE.sx * pr, (VH - SCOPE.sy) * pr); U.uHalf.value.set(hw * pr, hh * pr); U.uRes.value.set(W, Hh); U.uPx.value.set(1 / bw, 1 / bh);
  U.uRect.value = sc.shape === 'rect' ? 1 : 0; U.uBlur.value = sc.blur ? 1 : 0; U.uCorner.value = 14 * pr;
  renderer.render(compScene, compCam);
}
function scopeUi() {                    // the ring, the crosshair and what the rifle is doing, over the zoomed circle
  const el = $('scope'), live = scopeLive();
  if (!live) { if (!el.hidden) el.hidden = true; return; }
  const hw = SCOPE.hw, hh = SCOPE.hh; el.hidden = false;
  el.style.width = 2 * hw + 'px'; el.style.height = 2 * hh + 'px'; el.style.transform = 'translate(' + (SCOPE.sx - hw) + 'px,' + (SCOPE.sy - hh) + 'px)';
  el.className = (WEAPONS[P.weapon].scope.shape === 'rect' ? 'rkt ' : '') + (SCOPE.ready ? (SCOPE.hit || SCOPE.tag.startsWith('DANGER') ? 'hit' : '') : 'wait');
  setText('scopeTag', 'scopeTag', SCOPE.tag);
}
