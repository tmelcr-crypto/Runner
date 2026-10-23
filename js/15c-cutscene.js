'use strict';
/* ---------- 9c. CUTSCENES ----------
   A small engine for the game's cinematics - the scenic flight (js/08v) now, story mode's scenes later. A scene is a list of shots
   played one after another while the game waits for nobody (state 'cut': no input but the skip button, the HUD hidden; traffic,
   people, the clock and the weather go on around). Each shot has a length and its own enter / tick / leave: the tick moves whatever
   acts in it and places the camera - cam for the usual view from above, or CUT.view for a free camera (where it is, the point it
   looks at, its field of view and roll). A shot can bring black bars at the top and bottom, a caption, the plane's window
   (CUT overlay #cutWin) and a fade through black at its start or end; the scene can bring music (js/02c).
   The skip button (its label is the scene's: LAND for the flight) - or Esc, Enter, Space - fades out and ends the scene at once;
   the scene's end() puts everything back. */
const CUT = { on: false, sc: null, i: -1, t: 0, T: 0, fade: 0, fadeV: 0, view: null, fog: null, xray: true, ending: false, endT: 0, hideP: false };
function cutPlay(sc) {                   // sc: { skip: 'LAND', music: 'scenic', start(), end(), shots: [{ dur, bars, cap, win, fadeIn, fadeOut, enter(), tick(dt, t, u), leave() }] }
  Object.assign(CUT, { on: true, sc, i: -1, ending: false, endT: 0, view: null, fog: null, xray: true, hideP: false, fade: 1, fadeV: 0 });
  state = 'cut'; toggleBigMap(false); toggleWheel(false); hush(); closeMenus(); inputRelease(); cutBrake();
  document.documentElement.classList.add('cut'); $('cut').hidden = false;
  $('cutSkip').textContent = sc.skip || 'SKIP'; $('cutSkip').hidden = sc.skip === null;
  if (sc.start) sc.start();
  if (sc.music) Music.play(sc.music);
  cutNext();
}
function cutNext() {                     // the next shot (or the end)
  const sc = CUT.sc, old = sc.shots[CUT.i]; if (old && old.leave) old.leave();
  if (++CUT.i >= sc.shots.length) { cutEnd(); return; }
  const s = sc.shots[CUT.i]; CUT.t = 0; CUT.T = s.dur;
  $('cut').classList.toggle('bars', !!s.bars); $('cutWin').hidden = !s.win; cutCaption(s.cap || '');
  CUT.view = null; CUT.fog = null; CUT.xray = !s.win;
  if (s.enter) s.enter();
  if (s.fadeIn !== false) { CUT.fade = 1; CUT.fadeV = -1 / (s.fadeIn || 0.7); }
}
function cutCaption(txt) { const c = $('cutCap'); if (txt) { c.textContent = txt; c.classList.add('on'); } else c.classList.remove('on'); }
function cutBrake() { const c = P.car; if (c && c.driver === 'player') { c.thr = 0; c.str = 0; c.hb = true; } }   // your car stops where it is (nobody drives it while the scene plays)
function cutFrame(dt) {                  // js/15 frame(): the world goes on, the shot moves its actors and the camera
  const sc = CUT.sc, s = sc.shots[CUT.i];
  cutBrake(); update(dt, true);                                               // traffic, people, planes, the clock and the weather (no player, no police)
  if (!CUT.on) return;
  CUT.t += dt;
  if (s && s.tick) s.tick(dt, CUT.t, Math.min(1, CUT.t / CUT.T));
  if (CUT.fadeV) { CUT.fade = clamp(CUT.fade + CUT.fadeV * dt, 0, 1); if (CUT.fade <= 0 || CUT.fade >= 1) CUT.fadeV = 0; }
  const out = s && s.fadeOut ? clamp((CUT.t - (CUT.T - s.fadeOut)) / s.fadeOut, 0, 1) : 0, end = CUT.ending ? clamp(CUT.endT / 0.8, 0, 1) : 0;
  $('cutFade').style.opacity = Math.max(CUT.fade, out, end).toFixed(3);
  if (CUT.ending) { if ((CUT.endT += dt) >= 0.85) cutEnd(); }
  else if (CUT.t >= CUT.T) cutNext();
}
function cutSkip() { if (!CUT.on || CUT.ending) return; CUT.ending = true; CUT.endT = 0; Music.stop(0.8); Snd.tone(660, 440, 0.12, 0.08, 'square'); }
function cutEnd() {
  if (!CUT.on) return;
  const sc = CUT.sc, s = sc.shots[CUT.i]; if (s && s.leave && CUT.i < sc.shots.length) s.leave();
  CUT.on = false; CUT.view = null; CUT.fog = null; CUT.hideP = false; CUT.i = sc.shots.length;
  $('cut').hidden = true; $('cut').classList.remove('bars'); $('cutWin').hidden = true; cutCaption(''); $('cutFade').style.opacity = 0;
  document.documentElement.classList.remove('cut');
  camera.fov = CAM_FOV; camera.up.set(0, 1, 0); camera.clearViewOffset(); applySize();   // the usual camera again
  Music.stop(0.6); state = 'play';
  if (sc.end) sc.end();
}
$('cutSkip').addEventListener('click', e => { e.stopPropagation(); cutSkip(); });

/* the free camera (js/13 render, after the usual one is placed): v = { x, y, h, lx, ly, lh, fov, roll } in map units */
const _cv = new THREE.Vector3();
function cutView() {
  const v = CUT.view; if (!v) return;
  setNear(30); camera.position.set(v.x, v.h, v.y); if (v.up) camera.up.set(v.up.x, v.up.y, v.up.z); else camera.up.set(0, 1, 0); camera.lookAt(_cv.set(v.lx, v.lh, v.ly));   // up: tilted with a banking plane
  if (v.roll) camera.rotateZ(v.roll);
  if (camera.fov !== v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); partMat.uniforms.uScale.value = VH * renderer.getPixelRatio() / (2 * Math.tan(v.fov * Math.PI / 360)); }
  camera.updateMatrixWorld();
}
