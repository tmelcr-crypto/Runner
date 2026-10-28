'use strict';
/* ---------- 7zl. THE LUNAPARK'S LOCKERS AND THE FBI FIELD OFFICE (chapter 5's scenery; both modes) ----------
   LEFT LUGGAGE: a bank of numbered lockers (41 to 72) inside the lunapark's gate, behind the east ticket booth (modes: lockers) - in M26
   Mateo's tape waits in locker 47 (LOCKERS.glow lights its door). The FBI FIELD OFFICE is one of the unique buildings (js/01r, a civic
   building in Palm Heights, js/10n picks its lot); its seal over the door is drawn with the civic model (js/10o); fbiDoor() is where
   its marker stands (M28). */
const LOCKERS = { at: null, lm: null, glow: false, door47: null };
function genLockers() {                   // js/04 genWorld, after the places: the lockers' solid and their drawable
  LOCKERS.at = null; const L = MAP.lunapark; if (!L || !L.gate) return;
  const g = L.gate, x = g.x + g.w / 2 + 110, y = g.y + 40;                                  // behind the east ticket booth, their doors to the park (south, toward the camera)
  LOCKERS.at = { x, y, w: 64, d: 10, front: { x, y: y + 22 } };
  makeSolid(x, y, 64, 10, 0, { soft: true });
  LOCKERS.door47 = { x: x - 32 + 6 * 8 + 4, y: y + 6 };                                     // the 7th column of the second row: number 47
  LMS.push(LOCKERS.lm = { cx: x, cy: y, a: 0, rad: 60, make: () => makeLockers(), mesh: null });
}
function makeLockers() {
  const T = new GeoBuilder(), G = new GeoBuilder(), C = _C, steel = C('#9aa0ab'), dark = C('#3a3d47');
  box5(T, -33, 0, -5, 33, 30, 5, dark);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {                                // 32 doors, 41 to 72, row by row from the top
    const x0 = -32 + c * 8, y0 = 26 - (r + 1) * 6.4; box5(T, x0 + 0.4, y0 + 0.4, 5, x0 + 7.6, y0 + 6, 5.6, (r + c) % 2 ? steel : C('#b4bac4'));
    box5(G, x0 + 5.4, y0 + 2.4, 5.6, x0 + 6.6, y0 + 3.6, 5.9, C('#ffd23f'));               // each door's coin lock
  }
  const m = lmMesh(T, G);
  const sg = fasciaSign('LEFT LUGGAGE', '#2bf3ff', 60, 7); sg.position.set(0, 33, 5.8); m.add(sg); m.userData.own.push(sg.material);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(7.4, 5.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xff8a1a })); glow.position.set(-32 + 6 * 8 + 4, 26 - 2 * 6.4 + 3.2, 5.9);
  glow.visible = false; m.add(glow); m.userData.glow = glow; m.userData.own.push(glow.material);
  return m;
}
function gfxLockers(time) { const m = LOCKERS.lm && LOCKERS.lm.mesh; if (m && m.userData.glow) { m.userData.glow.visible = LOCKERS.glow && Math.sin(time * 6) > -0.3; } }
function fbiSite() { return (typeof UNIQUES !== 'undefined' && UNIQUES.find(u => u.row.id === 'fbi_office')) || null; }
function fbiDoor() {                      // the FBI office's door (its marker in M28), or null when it found no lot
  const U = fbiSite(); if (!U) return null; const ca = Math.cos(U.a), sa = Math.sin(U.a), lz = U.D / 2 + 18;
  return { x: U.r.cx - sa * lz, y: U.r.cy + ca * lz };
}
