'use strict';
/* ---------- 7b3. THE WEAPONS IN THE GRID ----------
   Detailed models of every weapon, only for the weapon grid (js/14b): slides with serrations, fluted cylinders, wooden grips and
   stocks with their grain, scopes with blue lenses, a rocket in its tube, a pineapple grenade with its pin and spoon, a taped pipe
   bomb with its fuse. Each is rendered once with studio light into a picture (weaponPic(id)), so the game itself keeps its small
   models (js/11b). Unknown ids get the model of their class. Built pointing along +x, about 30 units long. */
const WHD = { pics: {}, r: null };
const whM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.35 }, o || {}));
const WH_GUN = () => whM('#23262e', { roughness: 0.42, metalness: 0.65 }), WH_STEEL = () => whM('#b8c2ce', { roughness: 0.25, metalness: 0.9 });
const WH_WOOD = () => whM('#8a5a36', { roughness: 0.6, metalness: 0, map: whGrain('#8a5a36') }), WH_RUBBER = () => whM('#16171c', { roughness: 0.95, metalness: 0 });
function whGrain(col) {                   // wood grain painted on a small canvas
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 128, 32);
  for (let k = 0; k < 14; k++) { g.strokeStyle = 'rgba(40,20,8,' + (0.15 + Math.random() * 0.2) + ')'; g.lineWidth = 1 + Math.random(); g.beginPath(); let y = Math.random() * 32; g.moveTo(0, y); for (let x = 0; x <= 128; x += 16) { y += (Math.random() - 0.5) * 3; g.lineTo(x, y); } g.stroke(); }
  return new THREE.CanvasTexture(c);
}
function whBox(g, m, w, h, d, x, y, z, rz) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rz) o.rotation.z = rz; g.add(o); return o; }
function whCyl(g, m, len, r0, r1, x, y, z, seg) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1 === undefined ? r0 : r1, r0, len, seg || 20), m); o.rotation.z = -Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; }   // along +x, r0 at the back
function whShape(g, m, pts, depth, x, y, z, bevel) {   // a flat outline (x, y) extruded through z, centred on z
  const s = new THREE.Shape(); pts.forEach(([px, py], i) => i ? s.lineTo(px, py) : s.moveTo(px, py));
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2 }); geo.translate(0, 0, -depth / 2);
  const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o;
}
const WHD_MODEL = {
  fists(g) {                              // a clenched fist, knuckles forward
    const skin = whM('#f2c6a0', { metalness: 0, roughness: 0.7 });
    whBox(g, skin, 7, 6.4, 5.2, 0, 0, 0); for (let k = 0; k < 4; k++) whCyl(g, skin, 2.4, 1.3, 1.3, 3.4, 2.4 - k * 1.6, 0.4, 14);
    const th = whCyl(g, skin, 4.4, 1.1, 1.0, 1.2, -2.6, 2.8, 12); th.rotation.y = 0.5; whBox(g, whM('#ffd23f', { metalness: 0.9, roughness: 0.25 }), 0.6, 6.6, 3.2, 4.8, 0, 0.5);   // a gold ring of knuckles
    whBox(g, skin, 6, 4.6, 4.4, -5.5, 0, 0);
  },
  bat(g) {
    const pts = [[0, 0.6], [1, 0.75], [9, 0.8], [17, 1.35], [25, 1.9], [30, 1.95], [30.4, 1.6], [30.5, 0]];
    const geo = new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), 24); geo.rotateZ(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, WH_WOOD())); whCyl(g, whM('#16171c', { metalness: 0 }), 8, 0.85, 0.88, 4.5, 0, 0); whCyl(g, WH_WOOD(), 0.8, 1.15, 1.15, 0, 0, 0);   // the grip tape, the knob
  },
  knife(g) {
    whShape(g, WH_STEEL(), [[0, -0.9], [11, -0.9], [14, 0.2], [11.5, 1.2], [0, 1.2]], 0.3, 4.2, 0, 0, 0.05);   // the blade
    whShape(g, whM('#e8f0ff', { metalness: 1, roughness: 0.1 }), [[0, -0.9], [11, -0.9], [14, 0.2], [12, -0.2], [0, -0.4]], 0.34, 4.2, 0, 0);   // the honed edge
    whBox(g, WH_STEEL(), 0.8, 3.4, 1.6, 4, 0.15, 0); whBox(g, WH_RUBBER(), 6, 2, 1.6, 0.6, 0.1, 0); for (const x of [-1, 1.5]) whCyl(g, WH_STEEL(), 0.3, 0.3, 0.3, x, 0.1, 0.85, 10);
  },
  machete(g) {
    whShape(g, WH_STEEL(), [[0, -1.2], [16, -1.6], [22, -1.0], [24, 0.6], [22, 2.2], [0, 1.4]], 0.3, 4.5, 0, 0, 0.05);
    whShape(g, whM('#e8f0ff', { metalness: 1, roughness: 0.1 }), [[0, -1.2], [16, -1.6], [22, -1.0], [24, 0.6], [22.5, -0.3], [0, -0.7]], 0.34, 4.5, 0, 0);
    whBox(g, WH_WOOD(), 6.5, 2.2, 1.8, 1.2, 0.1, 0); for (const x of [-0.8, 1.2, 3.2]) whCyl(g, WH_STEEL(), 0.3, 0.32, 0.32, x, 0.1, 0.95, 10);
  },
  golf(g) {
    whCyl(g, WH_RUBBER(), 7, 0.62, 0.5, 0, 0, 0); whCyl(g, WH_STEEL(), 22, 0.28, 0.22, 14, 0, 0); whCyl(g, WH_RUBBER(), 1.2, 0.32, 0.3, 25.5, 0, 0);
    whShape(g, WH_STEEL(), [[0, 0], [1.2, 0.2], [4.6, -2.6], [4.4, -3.4], [-2.2, -3.4], [-2.6, -2.6], [-0.4, -1.4]], 1.6, 26, 0, 0, 0.15);   // the iron
  },
  pistol(g) {
    const gun = WH_GUN(); whBox(g, gun, 13, 2.6, 2, 2.5, 1.2, 0); for (let k = 0; k < 6; k++) whBox(g, whM('#101216'), 0.25, 2.2, 2.06, -3 + k * 0.6, 1.3, 0);   // the slide and its serrations
    whCyl(g, gun, 0.6, 0.55, 0.55, 9.2, 1.2, 0, 14); whBox(g, gun, 0.5, 0.6, 0.5, 8.4, 2.8, 0); whBox(g, gun, 0.8, 0.6, 1.2, -3.4, 2.8, 0);   // muzzle, sights
    whBox(g, gun, 9, 1.4, 1.8, 2, -0.6, 0); whShape(g, whM('#2a2c34', { metalness: 0.2, roughness: 0.8 }), [[0, 0], [3.4, 0], [2.4, -6], [-1.2, -6.4]], 1.9, -3.4, -0.4, 0, 0.1);   // frame, grip
    const tg = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.22, 8, 16, Math.PI), gun); tg.rotation.z = Math.PI; tg.position.set(2, -1.2, 0); g.add(tg); whBox(g, gun, 0.35, 1.4, 0.4, 1.8, -1.6, 0);   // trigger guard, trigger
  },
  revolver(g) {
    const st = WH_STEEL(); whCyl(g, st, 10, 0.75, 0.7, 7, 1.6, 0); whBox(g, st, 10, 0.5, 0.6, 7, 2.5, 0); whCyl(g, st, 4, 2, 2, 0.6, 1.2, 0, 18);   // barrel, rib, cylinder
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; whCyl(g, whM('#5a606a'), 4.1, 0.38, 0.38, 0.6, 1.2 + Math.cos(a) * 1.6, Math.sin(a) * 1.6, 8); }   // the flutes
    whBox(g, st, 5, 3, 1.8, -1.8, 1.2, 0); whBox(g, st, 1.4, 1.4, 0.8, -4, 3, 0, -0.5); whShape(g, WH_WOOD(), [[0, 0], [3, 0], [2, -6.2], [-2, -6.8], [-1.6, -3]], 2, -4.5, 0, 0, 0.2);   // frame, hammer, grip
    const tg = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 16, Math.PI), st); tg.rotation.z = Math.PI; tg.position.set(-1, -0.6, 0); g.add(tg);
  },
  smg(g) {
    const gun = WH_GUN(); whBox(g, gun, 12, 3.2, 2.2, 2, 1.2, 0); whCyl(g, gun, 7, 0.9, 0.9, 10.5, 1.4, 0); for (let k = 0; k < 4; k++) whCyl(g, whM('#08090c'), 0.5, 0.35, 0.35, 8.6 + k * 1.4, 1.4, 0.95, 8);   // receiver, shroud with holes
    whBox(g, gun, 1.6, 7, 1.4, 4.5, -3, 0, 0.12); whShape(g, WH_RUBBER(), [[0, 0], [2.6, 0], [1.8, -5], [-0.6, -5]], 1.9, -1.6, -0.4, 0, 0.1);   // magazine, grip
    whBox(g, gun, 8, 0.6, 0.6, -6, 1.8, 0.7); whBox(g, gun, 8, 0.6, 0.6, -6, 1.8, -0.7); whBox(g, gun, 0.8, 2.6, 2, -10, 1.2, 0); whBox(g, gun, 2, 1, 1, 2, 3.2, 0);   // the folding stock, a sight
  },
  shotgun(g) {
    const gun = WH_GUN(); whCyl(g, gun, 22, 0.75, 0.75, 13, 2.6, 0); whCyl(g, gun, 18, 0.6, 0.6, 11, 1.1, 0);   // barrel, tube magazine
    const fe = whCyl(g, WH_WOOD(), 7, 1.4, 1.4, 12, 1.4, 0); for (let k = 0; k < 6; k++) whCyl(g, whM('#4a2a14'), 0.25, 1.45, 1.45, 9.4 + k * 1.1, 1.4, 0);   // the pump with its grooves
    whBox(g, gun, 7, 3.4, 2, 0, 1.8, 0); whShape(g, WH_WOOD(), [[0, 1.6], [0, -1.4], [-4, -3.6], [-14, -4.6], [-14, 1.2], [-4, 1.4]], 2.1, -3.4, 2, 0, 0.2);   // receiver, stock
    whCyl(g, whM('#c8a040', { metalness: 0.9, roughness: 0.3 }), 0.4, 0.4, 0.4, 24.2, 3.5, 0, 8);
  },
  lmg(g) {
    const gun = WH_GUN(); whBox(g, gun, 14, 4.2, 3, 2, 1.6, 0); whCyl(g, gun, 14, 1.3, 1.3, 15, 2, 0); for (let k = 0; k < 7; k++) whCyl(g, whM('#08090c'), 0.6, 0.35, 0.35, 9.5 + k * 1.7, 2.4, 1.25, 8);
    whCyl(g, gun, 4, 0.5, 0.5, 23.5, 2, 0); whBox(g, whM('#4a5a32', { metalness: 0.2 }), 4.4, 4.4, 3.6, 3.5, -2.4, 0); whBox(g, gun, 4, 0.6, 1, 2, 4.6, 0); whBox(g, gun, 0.8, 1.6, 1, 0.5, 4, 0);   // ammo box, carry handle
    whShape(g, WH_RUBBER(), [[0, 0], [2.4, 0], [1.6, -4.6], [-0.6, -4.6]], 2.1, -3, -0.6, 0); whShape(g, gun, [[0, 1.6], [0, -1.6], [-9, -2.4], [-9, 1.8]], 2.4, -5, 1.6, 0, 0.1);
    for (const s of [-1, 1]) { const b = whBox(g, gun, 0.4, 6, 0.4, 19, -1.6, s * 1.2); b.rotation.x = s * 0.35; }   // the bipod
  },
  sniper(g) {
    const gun = WH_GUN(); whCyl(g, gun, 18, 0.55, 0.45, 15, 1.6, 0); whCyl(g, gun, 2, 0.8, 0.8, 24.6, 1.6, 0, 10); for (let k = 0; k < 3; k++) whBox(g, whM('#08090c'), 0.3, 0.5, 1.7, 24 + k * 0.6, 1.6, 0);   // barrel, muzzle brake
    whBox(g, gun, 9, 2.6, 2, 3, 1.4, 0); const sc = whCyl(g, gun, 10, 1.1, 1.1, 3, 4.6, 0); whCyl(g, gun, 1.6, 1.5, 1.2, -2.6, 4.6, 0); whCyl(g, gun, 1.8, 1.25, 1.55, 8.6, 4.6, 0);   // the scope
    for (const x of [-3.4, 9.5]) whCyl(g, whM('#4aa8ff', { metalness: 0.9, roughness: 0.05, emissive: '#1a4a8a' }), 0.1, x < 0 ? 1.25 : 1.45, x < 0 ? 1.25 : 1.45, x, 4.6, 0);   // the lenses
    for (const x of [0.5, 5.5]) whBox(g, gun, 0.8, 1.4, 1, x, 3.2, 0); const bolt = whCyl(g, WH_STEEL(), 2.4, 0.25, 0.25, -0.4, 1.4, 1.6); bolt.rotation.set(Math.PI / 2, 0, 0); whCyl(g, WH_STEEL(), 0.1, 0.5, 0.5, -0.4, 1.4, 2.8, 10).rotation.set(Math.PI / 2, 0, 0);   // the bolt handle and its knob
    whShape(g, WH_WOOD(), [[10, -0.2], [-2, -0.4], [-4, -3.6], [-6, -3.8], [-15, -3], [-15, 1.6], [-4, 0.9], [-2, 0.4], [10, 0.4]], 2.2, -1, 1.2, 0, 0.2);
    for (const s of [-1, 1]) { const b = whBox(g, gun, 0.35, 5, 0.35, 14, -1.6, s * 0.9); b.rotation.x = s * 0.3; }
  },
  rocket(g) {
    const tube = whM('#4a5a32', { metalness: 0.25, roughness: 0.7 }); whCyl(g, tube, 26, 2, 2, 8, 2.4, 0, 24); whCyl(g, whM('#2a3020', { metalness: 0.2 }), 3, 2.2, 2.6, -6.4, 2.4, 0, 24);   // the tube, its flared back
    whCyl(g, whM('#2a3020'), 1, 2.25, 2.25, 4, 2.4, 0); whCyl(g, whM('#2a3020'), 1, 2.25, 2.25, 14, 2.4, 0);
    const war = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5, 20), whM('#7a8a5a', { metalness: 0.4 })); war.rotation.z = -Math.PI / 2; war.position.set(23.6, 2.4, 0); g.add(war);   // the warhead
    whCyl(g, whM('#c0283a', { metalness: 0.3 }), 0.8, 1.85, 1.85, 21, 2.4, 0);
    whBox(g, WH_GUN(), 3, 2, 1.2, 7, 5, -1.4); whBox(g, whM('#ffb02e', { emissive: '#8a4a00' }), 0.3, 1, 0.8, 8.6, 5, -1.4);   // the sight with its amber glass
    whShape(g, WH_RUBBER(), [[0, 0], [2.2, 0], [1.6, -4.4], [-0.4, -4.4]], 1.8, 2, 0.6, 0); whShape(g, WH_RUBBER(), [[0, 0], [2, 0], [1.6, -3.6], [0, -3.6]], 1.8, 10, 0.6, 0);
  },
  grenade(g) {
    const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, a = t * Math.PI; pts.push(new THREE.Vector2(Math.sin(a) * (3.2 + 0.25 * Math.cos(t * 6 * Math.PI)), -Math.cos(a) * 4)); }
    const geo = new THREE.LatheGeometry(pts, 8); const body = new THREE.Mesh(geo, whM('#4a6a32', { metalness: 0.2, roughness: 0.6, flatShading: true })); g.add(body);   // the pineapple: 8 facets, ribbed
    whCyl(g, WH_STEEL(), 1.8, 1.2, 1.2, 0, 4.4, 0, 14).rotation.z = 0; whBox(g, WH_STEEL(), 1.2, 7, 0.4, 1.6, 2, 0, -0.15);   // fuse top, the spoon
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.2, 8, 20), WH_STEEL()); ring.position.set(-1.8, 5, 0.6); ring.rotation.y = 0.6; g.add(ring);   // the pin's ring
  },
  pipebomb(g) {
    whCyl(g, whM('#8a909c', { metalness: 0.8, roughness: 0.35 }), 14, 2, 2, 0, 0, 0, 24); for (const x of [-7.4, 7.4]) whCyl(g, whM('#6a707c', { metalness: 0.8 }), 1.8, 2.5, 2.5, x, 0, 0, 6);   // pipe, hex caps
    whCyl(g, whM('#14161c', { metalness: 0, roughness: 0.9 }), 4, 2.08, 2.08, -1, 0, 0); whCyl(g, whM('#c0283a', { metalness: 0 }), 1.2, 2.1, 2.1, 3, 0, 0);   // tape
    const fz = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(8.2, 0, 0), new THREE.Vector3(10, 1.5, 0), new THREE.Vector3(11, 3.5, 0.5), new THREE.Vector3(10, 5, 1)]), 20, 0.2, 6), whM('#2a2a2a'));
    g.add(fz); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb02e' })); sp.position.set(10, 5, 1); g.add(sp);   // the fuse, lit
  },
};
const WHD_CLASS = { handgun: 'pistol', automatic: 'smg', shotgun: 'shotgun', rifle: 'sniper', launcher: 'rocket', melee: 'bat', thrown: 'grenade', other: 'pistol' };
function weaponPic(id) {                  // a data URL of the weapon, 3/4 view, studio light, transparent background (made once)
  if (WHD.pics[id]) return WHD.pics[id];
  if (!WHD.r) {
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 160;
    WHD.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); WHD.r.setClearColor(0x000000, 0);
    WHD.scene = new THREE.Scene(); WHD.scene.add(new THREE.HemisphereLight(0xdde6ff, 0x3a2a4a, 0.75));
    const k = new THREE.DirectionalLight(0xffffff, 1.1); k.position.set(-10, 30, 40); const rim = new THREE.DirectionalLight(0xb08aff, 0.9); rim.position.set(30, 10, -40); WHD.scene.add(k, rim);
    WHD.cam = new THREE.PerspectiveCamera(22, 2, 1, 1000);
  }
  const w = WEAPONS.find(q => q.id === id), f = WHD_MODEL[id] || WHD_MODEL[WHD_CLASS[w && w.cls] || 'pistol'], g = new THREE.Group();
  withSeed(4700 + id.length * 17, () => f(g)); g.rotation.set(0.32, -0.38, 0.05);   // turned a little toward you, a touch from above
  WHD.scene.add(g); const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  g.position.sub(c); const D = Math.max(s.x / 2 / Math.tan(11 * Math.PI / 180) / 2, s.y / 2 / Math.tan(11 * Math.PI / 180)) * 1.15;
  WHD.cam.position.set(0, 0, D + s.z); WHD.cam.lookAt(0, 0, 0); WHD.r.render(WHD.scene, WHD.cam);
  WHD.pics[id] = WHD.r.domElement.toDataURL('image/png');
  WHD.scene.remove(g); g.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
  return WHD.pics[id];
}
(function prerender() {                   // draw the pictures one by one while the page is idle, so the grid opens at once
  const ids = WEAPONS.map(w => w.id); let k = 0;
  const next = () => { if (k >= ids.length) return; try { weaponPic(ids[k++]); } catch (e) { return; } setTimeout(next, 120); };
  setTimeout(next, 2500);
})();
