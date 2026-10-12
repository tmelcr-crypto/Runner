'use strict';
/* ---------- 7g. TREES ----------
   (js/01j trees) Every tree in the city - the woods (js/10q), the park trees and the palms along the streets, in the alleys and on the
   beaches (js/10 buildCity, js/10d), and the trees and palms of the landmarks, the designed parks, the unique buildings, the safehouse
   plots and the grove (palm() js/10b, pkTree js/10p, grovePalm js/10m) - is not solid. On foot you walk under it and through its trunk.
   A vehicle that drives into one knocks it down, takes no damage and loses the share of its speed the vehicles table gives it (tree:
   the tank 0, the motorbike 70%, the rest by weight); a blast close by fells it too. It tips over the way it was pushed, lies there a
   moment and sinks away, leaving its stump, and stands again after the places table's treeBack, once you are far enough not to see it.
   Under a standing tree - on foot, or in a vehicle that has stopped (police table: heliStill) - the helicopter's light cannot see you
   (js/08u). A new game puts every tree back. */
const TREES = [], TRGRID = new Map(), FALLING = [];
let treeT = 0;
const treeAdd = T => { T.key = tkey(T.x, T.y); let l = TRGRID.get(T.key); if (!l) TRGRID.set(T.key, l = []); l.push(T); TREES.push(T); return T; };
function addTree(x, y, r, th, kind, tc, cc, parts, cx, cy) {   // js/10, js/10d, js/10q: a tree drawn as instances (its parts, as for registerThrow)
  return treeAdd({ x, y, cx: cx === undefined ? x : cx, cy: cy === undefined ? y : cy, r, th, kind, tc, cc, parts, link: null, gone: false, t: 0 });
}
function treeNote(T, v0, t) {           // palm(), pkTree(), grovePalm(): a tree inside a model's GeoBuilder, by its vertices (registered when it streams in)
  (T.trees || (T.trees = [])).push(Object.assign(t, { v0, v1: T.pos.length / 3 }));
}
const _tv = new THREE.Vector3();
function treesIn(o) {                   // js/10 buildDrawable: the trees in a model that has just streamed in, in the world; felled ones stay down
  const list = []; o.mesh.updateMatrixWorld(true);
  o.mesh.traverse(m => { const tl = m.geometry && m.geometry.userData.trees; if (tl) for (const t of tl) list.push([m, t]); });
  if (!list.length && !o.trees) return;
  if (!o.trees || o.trees.length !== list.length) {               // the first time it is built (every later build is the same model)
    if (o.trees) for (const T of o.trees) { const l = TRGRID.get(T.key); if (l) l.splice(l.indexOf(T), 1); TREES.splice(TREES.indexOf(T), 1); }
    o.trees = list.map(([m, t]) => {
      const b = _tv.set(t.x, 0, t.z).applyMatrix4(m.matrixWorld), x = b.x, y = b.z, c = _tv.set(t.cx === undefined ? t.x : t.cx, 0, t.cz === undefined ? t.z : t.cz).applyMatrix4(m.matrixWorld);
      return treeAdd({ x, y, cx: c.x, cy: c.z, r: t.r, th: t.th, kind: t.kind, tc: t.tc, cc: t.cc, parts: null, link: null, gone: false, t: 0 });
    });
  }
  list.forEach(([m, t], i) => { const T = o.trees[i]; T.link = { geo: m.geometry, v0: t.v0, v1: t.v1, lx: t.x, lz: t.z, orig: null }; if (T.gone) treeHide(T); });
}
function treeHide(T) {                  // out of its mesh: instances scaled to nothing, a model's vertices pulled into one point
  if (T.parts) for (const p of T.parts) { const it = p.it; if (!it._m) continue; if (!it._orig) { it._orig = new THREE.Matrix4(); it._m.getMatrixAt(it._k, it._orig); } it._m.setMatrixAt(it._k, _hid); it._m.instanceMatrix.needsUpdate = true; }
  const L = T.link; if (!L) return;
  const a = L.geo.attributes.position; if (!L.orig) L.orig = a.array.slice(L.v0 * 3, L.v1 * 3);
  for (let i = L.v0; i < L.v1; i++) a.setXYZ(i, L.lx, -30, L.lz); a.needsUpdate = true;
}
function treeShow(T) {
  if (T.parts) for (const p of T.parts) if (p.it._orig) { p.it._m.setMatrixAt(p.it._k, p.it._orig); p.it._m.instanceMatrix.needsUpdate = true; }
  const L = T.link; if (L && L.orig) { const a = L.geo.attributes.position; a.array.set(L.orig, L.v0 * 3); a.needsUpdate = true; }
  T.gone = false;
}
function treeModel(T) {                 // a stand-in that falls: a trunk and a crown of the tree's colours, its foot at the origin
  const g = new THREE.Group(), add = (geo, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mc(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); };
  const th = T.th, r = T.r;
  if (T.kind === 'pine') { add(GCyl, T.tc, 0, 4, 0, 1.8, 8, 1.8); add(GPINE, T.cc, 0, 3, 0, r, th, r); }
  else if (T.kind === 'cone') add(GPINE, T.cc, 0, 0, 0, r, th, r);
  else if (T.kind === 'palm') { add(GCyl, T.tc, 0, th / 2, 0, 1.6, th, 1.6); add(GSph, T.cc, 0, th + 1, 0, r, r * 0.3, r); }
  else { add(GCyl, T.tc, 0, th / 2, 0, 1.8, th, 1.8); add(GSph, T.cc, 0, th + r * 0.35, 0, r, r * 0.9, r); add(GSph, shade(T.cc, 10), r * 0.4, th + 2, r * 0.2, r * 0.7, r * 0.62, r * 0.7); }
  return g;
}
function treeTop(T) { return T.kind === 'pine' || T.kind === 'cone' ? T.th * 0.6 : T.th + T.r * 0.3; }
function fellTree(T, nx, ny, sp) {      // knocked down the way (nx, ny) at speed sp: it tips over, leaves fly
  if (T.gone) return;
  T.gone = true; T.t = gameT; treeHide(T);
  const g = treeModel(T); g.rotation.order = 'YXZ'; g.rotation.y = Math.atan2(nx, ny); g.position.set(T.x, 0, T.y); scene.add(g);
  const len = Math.max(20, treeTop(T));
  FALLING.push({ g, T, a: 0, w: clamp(sp / len * 0.35, 0.25, 2.2), max: T.kind === 'pine' || T.kind === 'cone' ? 1.5 : 1.42, len, rest: 0, sink: 0, nx, ny, landed: false });
  const top = treeTop(T);
  for (let k = 0; k < 16; k++) {                                   // leaves shaken off the crown, bark splinters at the trunk
    const leaf = k < 11, a = Math.atan2(ny, nx) + rand(-1.2, 1.2), s = leaf ? rand(30, 110) : sp * rand(0.2, 0.5) + rand(30, 80);
    addP({ x: T.cx + rand(-T.r, T.r) * (leaf ? 0.6 : 0), y: T.cy + rand(-T.r, T.r) * (leaf ? 0.6 : 0), z: leaf ? top * rand(0.7, 1) : rand(3, 8), vz: leaf ? rand(-20, 60) : rand(80, 200), grav: leaf ? 120 : 600,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: leaf ? rand(1.2, 2.2) : rand(0.6, 1.1), max: 2.2, s0: leaf ? rand(2.4, 3.8) : rand(1.6, 2.6), s1: 1.5, col: leaf ? shade(T.cc, randi(-16, 16)) : T.tc, drag: leaf ? 2.2 : 1.4, alpha: 1 });
  }
  if (decals.length < 150) decals.push({ x: T.x, y: T.y, r: 3.4, life: Math.max(20, PLC.treeBack), col: '#3b2a1e' });   // the stump
  const near = dist(T.x, T.y, P.x, P.y); if (near < 900) Snd.smash('tree', 1 - near / 900);
}
function treesHit(c, sp) {               // vehicle c moving at sp: every standing tree its body reaches falls; each one slows it by its share
  const reach = c.t.len / 2 + 8, a0 = Math.floor((c.x - reach + SEA) / TG), a1 = Math.floor((c.x + reach + SEA) / TG), b0 = Math.floor((c.y - reach + SEA) / TG), b1 = Math.floor((c.y + reach + SEA) / TG);
  let circ = null;
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const l = TRGRID.get(a * 1024 + b); if (!l) continue;
    for (const T of l) {
      if (T.gone || Math.abs(T.x - c.x) > reach || Math.abs(T.y - c.y) > reach) continue;
      circ = circ || carCircles(c); if (!circ.some(q => Math.hypot(q[0] - T.x, q[1] - T.y) < q[2] + 3)) continue;
      const s = Math.hypot(c.vx, c.vy) || 1; fellTree(T, c.vx / s, c.vy / s, s);
      const k = 1 - clamp(c.t.tree === undefined ? 0.4 : c.t.tree, 0, 1); c.vx *= k; c.vy *= k;
      if (c.driver === 'player') cam.shake = Math.max(cam.shake, 1.2 + 2 * (c.t.tree || 0));
    }
  }
}
function fellTreesNear(x, y, R) {       // a blast (js/12c): the trees close to it fall away from it
  if (!feat('trees')) return;
  const a0 = Math.floor((x - R + SEA) / TG), a1 = Math.floor((x + R + SEA) / TG), b0 = Math.floor((y - R + SEA) / TG), b1 = Math.floor((y + R + SEA) / TG);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const l = TRGRID.get(a * 1024 + b); if (!l) continue;
    for (const T of l) { if (T.gone) continue; const d = dist(T.x, T.y, x, y); if (d < R) { const [nx, ny] = away(T.x, T.y, x, y, d); fellTree(T, nx, ny, 300 * (1 - d / R) + 60); } }
  }
}
function treeOver(x, y) {               // a standing tree's crown over this point
  const a0 = Math.floor((x - 40 + SEA) / TG), a1 = Math.floor((x + 40 + SEA) / TG), b0 = Math.floor((y - 40 + SEA) / TG), b1 = Math.floor((y + 40 + SEA) / TG);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const l = TRGRID.get(a * 1024 + b); if (!l) continue;
    for (const T of l) if (!T.gone && Math.hypot(T.cx - x, T.cy - y) < T.r * 0.9) return true;
  }
  return false;
}
function treeCover() {                  // js/08u: you are under a tree, on foot or in a vehicle that has stopped - the helicopter's light cannot see you
  if (!feat('trees') || P.dead) return false;
  if (P.car) return Math.hypot(P.car.vx, P.car.vy) < COP.heliStill && treeOver(P.car.x, P.car.y);
  return treeOver(P.x, P.y);
}

/* ---------- every frame (js/15, after the street junk) ---------- */
function updateTrees(dt) {
  if (feat('trees')) for (const c of cars) {
    const sp = Math.hypot(c.vx, c.vy); if (sp < 2 || c.sunk || c.dead || (c.air || 0) > 10) continue;
    treesHit(c, sp);
  }
  for (let k = FALLING.length - 1; k >= 0; k--) {                  // tipping over faster and faster, a little bounce, a while on the ground, then sinking away
    const F = FALLING[k];
    if (!F.landed) {
      F.w += 1.5 * 118 * Math.sin(F.a + 0.05) / F.len * dt; F.a += F.w * dt;
      if (F.a >= F.max) {
        F.a = F.max; F.w *= -0.22;
        if (Math.abs(F.w) < 0.12) {
          F.landed = true; const T = F.T, L = F.len, near = dist(T.x, T.y, P.x, P.y);
          for (let n = 0; n < 12; n++) { const d = L * rand(0.5, 1.05); addP({ x: T.x + F.nx * d + rand(-6, 6), y: T.y + F.ny * d + rand(-6, 6), z: rand(2, 6), vz: rand(40, 120), grav: 300, vx: rand(-40, 40), vy: rand(-40, 40),
            life: rand(0.6, 1.2), max: 1.2, s0: rand(2.4, 3.6), s1: 1.5, col: shade(T.cc, randi(-16, 16)), drag: 2, alpha: 1 }); }
          if (decals.length < 150) decals.push({ x: T.x + F.nx * L * 0.8, y: T.y + F.ny * L * 0.8, r: T.r * 0.9, life: 40, col: shade(T.cc, -40) });   // leaves on the ground
          if (near < 900) { Snd.smash('treefall', 1 - near / 900); if (near < 300) cam.shake = Math.max(cam.shake, 1.5); }
        }
      }
    } else if ((F.rest += dt) > 3) { F.sink += dt; F.g.position.y = -F.sink * 9; }
    F.g.rotation.x = F.a;
    if (F.sink > 1.6) { scene.remove(F.g); FALLING.splice(k, 1); }
  }
  if ((treeT -= dt) > 0) return; treeT = 2;
  for (const T of TREES) if (T.gone && gameT - T.t > PLC.treeBack && dist(T.x, T.y, P.x, P.y) > 1500 && !FALLING.some(F => F.T === T)) treeShow(T);   // standing again, out of sight
}
function resetTrees() {                 // a new game (js/12c resetBlast): every tree stands
  for (const F of FALLING) scene.remove(F.g); FALLING.length = 0;
  for (const T of TREES) if (T.gone) treeShow(T);
}
