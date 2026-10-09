'use strict';
/* ---------- 7b2. WEAPON MODELS ----------
   Small 3D models of every weapon, pointing along +x from the grip, in world units (12 to the metre): held in your hand, and turning
   inside the coloured bubbles of the pickups (js/08d). Unknown ids get a model for their class. weaponModel(id) returns a new group. */
const _wm = {}, wmat = (c, basic) => { if (WM_TINT) c = '#' + new THREE.Color(c).lerp(WM_TINT, 0.45).getHexString(); const k = c + (basic ? 'b' : ''); return _wm[k] || (_wm[k] = basic ? mBas(c) : mc(c)); };
let WM_TINT = null;                     // while set, every part is lightened toward this colour (the pickups, so dark guns show up in their bubbles)
const WM_DARK = '#1b1d24', WM_STEEL = '#aab4c0', WM_WOOD = '#7a5236';
function wbox(g, c, sx, sy, sz, x, y, z, basic) { return part(g, GB, wmat(c, basic), sx, sy, sz, x, y, z); }
function wcyl(g, c, len, r, x, y, z, basic) { const m = part(g, GCyl, wmat(c, basic), r * 2, len, r * 2, x, y, z); m.rotation.z = Math.PI / 2; return m; }   // a cylinder lying along x
const WMODEL = {
  fists: g => { },
  pistol: g => { wbox(g, WM_DARK, 7, 1.8, 1.4, 3, 1.2, 0); wbox(g, WM_DARK, 1.8, 3.4, 1.3, 0.4, -1.1, 0); },
  revolver: g => { wcyl(g, WM_STEEL, 7, 0.55, 5, 1.5, 0); wcyl(g, WM_STEEL, 2.2, 1.2, 1.4, 1.2, 0); wbox(g, WM_WOOD, 1.8, 3.4, 1.3, -0.4, -1, 0); },
  smg: g => { wbox(g, WM_DARK, 9, 2.4, 1.6, 3.5, 1.2, 0); wbox(g, WM_DARK, 1.4, 4.2, 1.2, 4.5, -1.6, 0); wbox(g, WM_DARK, 1.6, 3, 1.3, 0.6, -0.9, 0); wbox(g, WM_DARK, 3, 0.8, 0.8, -2.5, 1.4, 0); },
  shotgun: g => { wcyl(g, WM_DARK, 15, 0.6, 7.5, 1.7, 0); wbox(g, WM_WOOD, 5, 1.4, 1.4, 9, 0.7, 0); wbox(g, WM_WOOD, 6, 2.2, 1.4, -2.5, 0.6, 0); },
  lmg: g => { wbox(g, WM_DARK, 11, 3, 2, 4, 1.4, 0); wcyl(g, WM_DARK, 9, 0.55, 14, 1.8, 0); wbox(g, '#3a4a2a', 3.2, 3, 2.6, 4, -1.2, 0); wbox(g, WM_DARK, 4, 2, 1.4, -3, 1, 0);
    for (const s of [-1, 1]) { const b = wbox(g, WM_DARK, 0.5, 4, 0.5, 15, -0.6, s * 0.8); b.rotation.x = s * 0.4; } },
  sniper: g => { wbox(g, WM_DARK, 12, 2, 1.4, 4, 1.2, 0); wcyl(g, WM_DARK, 10, 0.45, 14.5, 1.5, 0); wcyl(g, '#2a2410', 6, 0.9, 4.5, 3.4, 0); wbox(g, WM_WOOD, 5, 2.4, 1.3, -3.5, 0.6, 0); },
  rocket: g => { wcyl(g, '#3d4528', 18, 1.5, 6, 2.5, 0); wcyl(g, '#2a2d22', 3, 1.9, -2.6, 2.5, 0); const h = part(g, GCone || GSph, wmat('#5a6a3a'), 2.6, 4, 2.6, 16.5, 2.5, 0); h.rotation.z = -Math.PI / 2; wbox(g, WM_DARK, 1.4, 3, 1.2, 4, 0, 0); },
  bat: g => { wcyl(g, WM_WOOD, 5, 0.45, 2.5, 0, 0); wcyl(g, '#a8784a', 9, 0.85, 9.5, 0, 0); wcyl(g, '#5a3a22', 0.6, 0.7, 0, 0, 0); },
  knife: g => { wbox(g, '#14161c', 3, 1.1, 0.8, 1.3, 0, 0); wbox(g, WM_STEEL, 4.5, 1.2, 0.25, 5, 0.1, 0, true); },
  machete: g => { wbox(g, '#14161c', 3, 1.1, 0.8, 1.3, 0, 0); wbox(g, WM_STEEL, 9, 2, 0.25, 7.5, 0.3, 0, true); },
  golf: g => { wcyl(g, '#e8e8ee', 3, 0.5, 1.5, 0, 0); wcyl(g, WM_STEEL, 12, 0.25, 9, 0, 0); wbox(g, '#cfd6de', 1.4, 2.2, 1.2, 15.4, -0.8, 0); },
  grenade: g => { part(g, GSph, wmat('#3d5a2a'), 1.7, 2, 1.7, 0, 0, 0); wcyl(g, '#ffd23f', 0.5, 1.75, 0, 0, 0); wbox(g, WM_STEEL, 1, 1, 0.8, 0, 2, 0); },
  pipebomb: g => { wcyl(g, '#7a808c', 5, 1.1, 0, 0, 0); wcyl(g, '#c0283a', 0.8, 1.3, -2.8, 0, 0); wcyl(g, '#c0283a', 0.8, 1.3, 2.8, 0, 0); wbox(g, '#14161c', 1.4, 2.4, 2.4, 0, 0, 0); },
};
const WMODEL_CLASS = { handgun: 'pistol', automatic: 'smg', shotgun: 'shotgun', rifle: 'sniper', launcher: 'rocket', melee: 'bat', thrown: 'grenade', other: 'pistol' };
function weaponModel(id, tint) {        // tint: a colour to lighten it toward (for the pickups)
  const g = new THREE.Group(), w = WEAPONS.find(q => q.id === id), f = WMODEL[id] || WMODEL[WMODEL_CLASS[w && w.cls] || 'pistol'];
  WM_TINT = tint ? new THREE.Color(tint) : null; try { f(g); } finally { WM_TINT = null; }
  return g;
}
function ammoModel(color) {              // a box of ammunition with a band of the weapon's colour
  const g = new THREE.Group();
  wbox(g, '#22262e', 7, 4.4, 5, 0, 0, 0); wbox(g, color, 7.2, 1.2, 5.2, 0, 0.6, 0, true); wbox(g, '#d9b04a', 1, 1.4, 1, -2, 2.8, 0); wbox(g, '#d9b04a', 1, 1.4, 1, 0, 2.8, 0); wbox(g, '#d9b04a', 1, 1.4, 1, 2, 2.8, 0);
  return g;
}
