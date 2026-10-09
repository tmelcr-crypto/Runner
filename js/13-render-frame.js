'use strict';
/* ---------- 7d. FRAME RENDER ---------- */
let lastRenderT = 0;
function render(time) {
  frameId++; const dt = clamp(time - lastRenderT, 0.001, 0.05) || 0.016; lastRenderT = time;
  placeCamera(true); applySky(dt);                                    // light, fog, glows and rain for the hour and the weather (js/12d)
  for (const c of cars) syncCar(c, time, dt);
  for (const p of peds) syncPerson(p, p.cop ? 'officer' : 'ped', time, dt);
  for (const o of officers) syncPerson(o, 'officer', time, dt);
  for (const p of pickups) syncPickup(p, time);
  if (waterTex) { waterTex.offset.x = time * 0.012; waterTex.offset.y = Math.sin(time * 0.4) * 0.03; } if (foamMat) foamMat.opacity = 0.45 + 0.25 * Math.sin(time * 1.6);
  streamCity(false); for (const o of LMS) if (o.mesh && o.mesh.userData.anim) o.mesh.userData.anim(time);
  sweepDynamic(); syncPlayer(time, dt); fadeBuildings();
  gfxRockets(time); gfxBlast(dt); gfxParticles(); gfxTracers(); gfxDecals(); gfxSkids(); gfxPops();
  if (boomFlash) { boomFlash.t -= dt; boomLight.position.set(boomFlash.x, 50, boomFlash.y); boomLight.intensity = Math.max(0, boomFlash.t / 0.5) * 3.2; if (boomFlash.t <= 0) boomFlash = null; } else boomLight.intensity = 0;
  $('hurt').style.opacity = P.hurtT > 0 ? Math.min(0.5, P.hurtT * 1.6) : 0;
  if (scopeLive()) renderWithScope(); else { SCOPE.on = SCOPE.hold = false; renderer.render(scene, camera); }   // aiming the rifle: blurred view and the zoomed scope
  scopeUi();
}
rendererReady = true; applySize();
