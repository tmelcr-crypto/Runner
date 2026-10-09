'use strict';
/* ---------- 8b. WEAPON WHEEL AND RIFLE SCOPE ----------
   The weapon button opens a wheel with every weapon, its picture and its ammo; the game waits until you tap one (tap outside to go back).
   The sniper rifle aims through a scope: hold FIRE and drag. The scope sits above your finger, so the finger does not cover it, and shows
   what is under its centre at 4x; everything outside it is blurred. Let go to shoot - only standing still, with a round chambered.
   The game keeps running while you aim. With a mouse the scope is on the pointer; with the J key the arrow keys move it. */

// pictures, side view, pointing right; all in the same 96 x 40 box
const WICON = {
  pistol: '<svg viewBox="0 0 96 40" fill="currentColor"><rect x="26" y="8" width="44" height="9" rx="2"/><rect x="66" y="6" width="3" height="3"/><rect x="34" y="17" width="28" height="4"/>' +
    '<path d="M36 18h13l-4 19H32z"/><path d="M50 21v3a5 5 0 0 1-5 5h-1" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  mg: '<svg viewBox="0 0 96 40" fill="currentColor"><rect x="22" y="9" width="46" height="12" rx="2"/><rect x="66" y="12" width="20" height="5"/><rect x="84" y="10" width="3" height="9"/>' +
    '<rect x="6" y="12" width="17" height="4"/><rect x="3" y="9" width="5" height="12" rx="1"/><path d="M44 21h9l-2 17h-9z"/><path d="M28 21h8l-3 12h-8z"/><rect x="30" y="5" width="22" height="4"/></svg>',
  sniper: '<svg viewBox="0 0 96 40" fill="currentColor"><path d="M2 16l28-3 2 11H21l-9 7H2z"/><rect x="28" y="13" width="28" height="9" rx="1"/><rect x="55" y="15.5" width="39" height="3"/>' +
    '<rect x="91" y="14" width="4" height="6"/><rect x="33" y="4" width="22" height="6" rx="3"/><rect x="31" y="5" width="3" height="4"/><rect x="38" y="10" width="3" height="3"/><rect x="47" y="10" width="3" height="3"/>' +
    '<rect x="41" y="22" width="7" height="7"/><path d="M30 22h7l-3 10h-6z"/><path d="M78 18l-5 13M79 18l5 13" stroke="currentColor" stroke-width="2"/></svg>'
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
const SCOPE = { on: false, by: null, sx: 0, sy: 0, R: 100, aim: null, ready: false, hit: false, tag: '' };
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
function updateScope(inp, dt) {         // called from updatePlayer while the rifle is out and you are on foot
  const w = WEAPONS[P.weapon], held = inp.held, R = SCOPE.R = scopeRadius();
  if (held && !SCOPE.on && !P.trig) {                            // a fresh press starts aiming
    SCOPE.on = true; SCOPE.by = held;
    if (held === 'key') { const q = worldToScreen(P.x + Math.cos(P.ang) * 360, P.y + Math.sin(P.ang) * 360); SCOPE.sx = q.x; SCOPE.sy = q.y; }
  }
  if (!SCOPE.on) return;
  if (held === 'touch') { SCOPE.sx = TS.fx; SCOPE.sy = TS.fy - R - 46; }          // just above the finger
  else if (held === 'mouse') { SCOPE.sx = mouse.x; SCOPE.sy = mouse.y; }
  else if (held === 'key') { SCOPE.sx += inp.ix * 520 * dt; SCOPE.sy += inp.iy * 520 * dt; }
  SCOPE.sx = clamp(SCOPE.sx, R + 4, VW - R - 4); SCOPE.sy = clamp(SCOPE.sy, R + 4, VH - R - 4);
  SCOPE.aim = scopePick(SCOPE.sx, SCOPE.sy); SCOPE.hit = !!(SCOPE.aim && SCOPE.aim.hit);
  if (SCOPE.aim) P.ang = Math.atan2(SCOPE.aim.y - P.y, SCOPE.aim.x - P.x);
  const still = Math.hypot(P.vx, P.vy) < 12 && (SCOPE.by === 'key' || inp.mag <= 0.4);   // a stick pushed only far enough to turn you still counts as standing
  let tag = 'READY', ready = false;
  if (P.relW === P.weapon) tag = 'RELOADING ' + Math.max(0, w.reload - P.rel).toFixed(1) + 'S';
  else if (P.mag[P.weapon] <= 0) tag = P.ammo[P.weapon] > 0 ? 'RELOADING' : 'NO AMMO';
  else if (P.cool > 0) tag = 'NEXT ROUND ' + P.cool.toFixed(1) + 'S';
  else if (!still) tag = 'STAND STILL TO SHOOT';
  else ready = true;
  SCOPE.ready = ready; SCOPE.tag = ready && SCOPE.hit ? 'ON TARGET' : tag;
  if (!held) {                                                   // let go: the shot
    SCOPE.on = false;
    if (ready && SCOPE.aim) { fireWeapon(SCOPE.aim); if (P.mag[P.weapon] > 0) Snd.bolt(); }
    else Snd.tone(120, 90, 0.06, 0.12, 'square');
  }
}
const scopeLive = () => SCOPE.on && state === 'play' && !P.car && !P.act && !P.dead && !bigOpen && !wheelOpen && !!WEAPONS[P.weapon].scope;

/* the frame while aiming: the whole view at half size (it gets blurred), the zoomed circle, then both put together on screen */
let scopeRT = null, blurRT = null, compMat = null, compScene = null, compCam = null;
function scopeSetup() {
  scopeRT = new THREE.WebGLRenderTarget(4, 4); blurRT = new THREE.WebGLRenderTarget(4, 4);
  compMat = new THREE.ShaderMaterial({
    uniforms: { tMain: { value: blurRT.texture }, tScope: { value: scopeRT.texture }, uC: { value: new THREE.Vector2() }, uR: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: new THREE.Vector2() } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tMain, tScope; uniform vec2 uC, uRes, uPx; uniform float uR;',
      'void main() {',
      '  vec2 fc = gl_FragCoord.xy; float d = distance(fc, uC);',
      '  if (d < uR) { vec3 c = texture2D(tScope, (fc - uC) / (2.0 * uR) + 0.5).rgb; c *= 1.0 - 0.45 * smoothstep(uR * 0.8, uR, d); gl_FragColor = vec4(c, 1.0); return; }',
      '  vec2 uv = fc / uRes; vec3 c = vec3(0.0);',
      '  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) c += texture2D(tMain, uv + vec2(float(i), float(j)) * uPx * 1.7).rgb;',
      '  gl_FragColor = vec4(c / 25.0 * (0.62 - 0.3 * smoothstep(uR + 40.0, uR, d)), 1.0);',
      '}'].join('\n'),
    depthTest: false, depthWrite: false
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat); q.frustumCulled = false;
  compScene = new THREE.Scene(); compScene.add(q); compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}
function renderWithScope() {
  if (!compMat) scopeSetup();
  const pr = renderer.getPixelRatio(), W = Math.round(VW * pr), Hh = Math.round(VH * pr), R = SCOPE.R, Z = WEAPONS[P.weapon].scope, S = Math.round(2 * R * pr);
  const bw = Math.max(1, W >> 1), bh = Math.max(1, Hh >> 1);
  if (blurRT.width !== bw || blurRT.height !== bh) blurRT.setSize(bw, bh);
  if (scopeRT.width !== S) scopeRT.setSize(S, S);
  const u = partMat.uniforms.uScale, us = u.value;                // particles keep their size in each view
  u.value = us / 2; renderer.setRenderTarget(blurRT); renderer.render(scene, camera);
  camera.setViewOffset(VW, VH, SCOPE.sx - R / Z, SCOPE.sy - R / Z, 2 * R / Z, 2 * R / Z);   // the patch under the scope, Z times bigger
  u.value = us * Z; renderer.setRenderTarget(scopeRT); renderer.render(scene, camera);
  camera.clearViewOffset(); u.value = us; renderer.setRenderTarget(null);
  const U = compMat.uniforms; U.uC.value.set(SCOPE.sx * pr, (VH - SCOPE.sy) * pr); U.uR.value = R * pr; U.uRes.value.set(W, Hh); U.uPx.value.set(1 / bw, 1 / bh);
  renderer.render(compScene, compCam);
}
function scopeUi() {                    // the ring, the crosshair and what the rifle is doing, over the zoomed circle
  const el = $('scope'), live = scopeLive();
  if (!live) { if (!el.hidden) el.hidden = true; return; }
  const R = SCOPE.R; el.hidden = false;
  el.style.width = el.style.height = 2 * R + 'px'; el.style.transform = 'translate(' + (SCOPE.sx - R) + 'px,' + (SCOPE.sy - R) + 'px)';
  el.className = SCOPE.ready ? (SCOPE.hit ? 'hit' : '') : 'wait';
  setText('scopeTag', 'scopeTag', SCOPE.tag);
}
