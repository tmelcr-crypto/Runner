'use strict';
/* ---------- 7c. EFFECTS: particles, rings, tracers, decals, skid marks, score pops ---------- */
const MAXP = 2100, pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(MAXP * 3), pSize = new Float32Array(MAXP), pCol = new Float32Array(MAXP * 4);
const aPos = new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage), aSize = new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage), aCol = new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage);
pGeo.setAttribute('position', aPos); pGeo.setAttribute('size', aSize); pGeo.setAttribute('pcolor', aCol);
const partMat = new THREE.ShaderMaterial({ uniforms: { uScale: { value: 800 } }, transparent: true, depthWrite: false,
  vertexShader: 'attribute float size;attribute vec4 pcolor;uniform float uScale;varying vec4 vC;void main(){vC=pcolor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=max(1.0,size*uScale/-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'varying vec4 vC;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*(1.0-smoothstep(0.25,0.5,d)));}' });
const pts = new THREE.Points(pGeo, partMat); pts.frustumCulled = false; scene.add(pts);
const RINGS = []; for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, depthWrite: false, side: THREE.DoubleSide })); r.visible = false; scene.add(r); RINGS.push(r); }
const _cc = {}, rgb = css => _cc[css] || (_cc[css] = (() => { const c = new THREE.Color(css); return [c.r, c.g, c.b]; })());
function gfxParticles() {
  let n = 0, rn = 0;
  for (const p of parts) {
    const u = p.life / p.max, s = p.hold ? p.s0 : lerp(p.s1, p.s0, u);   // hold: a piece that lies there at full size, fading only at the end
    if (p.ring) { if (rn < RINGS.length) { const m = RINGS[rn++]; m.visible = true; m.position.set(p.x, 4, p.y); m.scale.set(s, 1, s); m.material.opacity = u * 0.9; } continue; }
    if (n >= MAXP) break;
    const c = rgb(p.col);
    pPos[n * 3] = p.x; pPos[n * 3 + 1] = p.z === undefined ? 6 : p.z; pPos[n * 3 + 2] = p.y; pSize[n] = s * (p.alpha ? 1.5 : 1.3) + 1;
    pCol[n * 4] = c[0]; pCol[n * 4 + 1] = c[1]; pCol[n * 4 + 2] = c[2]; pCol[n * 4 + 3] = (p.hold ? Math.min(1, p.life / 1.5) : u) * (p.alpha || 1); n++;
  }
  for (let k = rn; k < RINGS.length; k++) RINGS[k].visible = false;
  pGeo.setDrawRange(0, n); aPos.needsUpdate = aSize.needsUpdate = aCol.needsUpdate = true;
}
/* Boats' wakes (js/01l In the water; mode boatWake): where a moving boat's stern has been in the last seconds of game time - two lines
   of foam opening into a V and a soft wash down the middle, fading - and at the bow the water pushed aside. Strips lying on the water,
   each lane bright along its middle and clear at its edges, in the colour a white deck has in the light of the hour. */
const MAXW = 48000, wGeo = new THREE.BufferGeometry(), wPos = new Float32Array(MAXW * 3), wAl = new Float32Array(MAXW);
const aWPos = new THREE.BufferAttribute(wPos, 3).setUsage(THREE.DynamicDrawUsage), aWAl = new THREE.BufferAttribute(wAl, 1).setUsage(THREE.DynamicDrawUsage);
wGeo.setAttribute('position', aWPos); wGeo.setAttribute('wa', aWAl);
const wakeMat = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(1, 1, 1) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: 'attribute float wa;varying float vA;void main(){vA=wa;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform vec3 uC;varying float vA;void main(){gl_FragColor=vec4(uC,vA);}' });
const wakeMesh = new THREE.Mesh(wGeo, wakeMat); wakeMesh.frustumCulled = false; scene.add(wakeMesh);
const BOW_W = {}, _wc = new THREE.Color();
function gfxWakes() {
  let n = 0; const on = feat('boatWake'), life = PLC.wakeLife, spread = 0.36 * PLC.wakeWidth, Y = WATER_Y + 0.4;
  const v = (x, y, a) => { wPos[n * 3] = x; wPos[n * 3 + 1] = Y; wPos[n * 3 + 2] = y; wAl[n++] = a; };
  const lane = (x0, y0, nx0, ny0, o0, w0, a0, x1, y1, nx1, ny1, o1, w1, a1) => {   // between two points: a lane o out along the normal, w each side of its middle
    if (n + 12 > MAXW || (a0 <= 0 && a1 <= 0)) return;
    const i0x = x0 + nx0 * (o0 - w0), i0y = y0 + ny0 * (o0 - w0), m0x = x0 + nx0 * o0, m0y = y0 + ny0 * o0, e0x = x0 + nx0 * (o0 + w0), e0y = y0 + ny0 * (o0 + w0);
    const i1x = x1 + nx1 * (o1 - w1), i1y = y1 + ny1 * (o1 - w1), m1x = x1 + nx1 * o1, m1y = y1 + ny1 * o1, e1x = x1 + nx1 * (o1 + w1), e1y = y1 + ny1 * (o1 + w1);
    v(i0x, i0y, 0); v(m0x, m0y, a0); v(m1x, m1y, a1); v(i0x, i0y, 0); v(m1x, m1y, a1); v(i1x, i1y, 0);
    v(m0x, m0y, a0); v(e0x, e0y, 0); v(e1x, e1y, 0); v(m0x, m0y, a0); v(e1x, e1y, 0); v(m1x, m1y, a1);
  };
  const wet = (x, y) => boatDist(x, y) < -3 ? 1 : 0, pts = [];
  for (const c of cars) {
    if (!c.t.boat) continue;
    const W = c.wk || (c.wk = []), L = c.t.len, ca = Math.cos(c.ang), sa = Math.sin(c.ang), spd = carSpeed(c);
    while (W.length && gameT - W[0].t > life) W.shift();
    const go = on && !!c.mesh && !c.sunk && !c.dead && !c.beached && !c.under && !(c.air > 0) && spd > PLC.wakeFrom;
    const f = clamp((spd - PLC.wakeFrom) / (c.t.max * 0.6), 0.15, 1), sx = c.x - ca * L / 2, sy = c.y - sa * L / 2, o0 = Math.max(c.t.wid * 0.58, 0.12 * spread * L);   // the V's arms at the stern: opened out from the bow
    if (go) { const q = W[W.length - 1]; if (!q || gameT - q.t > 0.07 || dist(sx, sy, q.x, q.y) > 16) W.push({ x: sx, y: sy, a: c.ang, v: spd, w: c.t.wid / 2, o: o0, f, t: gameT, r: rand(0.55, 1), l: rand(0.55, 1) }); }
    if (!W.length || !c.mesh || dist(c.x, c.y, cam.x, cam.y) > 2600) continue;
    pts.length = 0;
    for (const p of W) pts.push(p); if (go) pts.push({ x: sx, y: sy, a: c.ang, v: spd, w: c.t.wid / 2, o: o0, f, t: gameT, r: 1, l: 1 });
    let P0 = null;
    for (const p of pts) {                                           // each point: its age, the V's arms out to either side, the wash in the middle
      const g = gameT - p.t, k = Math.max(0, 1 - g / life), nx = -Math.sin(p.a), ny = Math.cos(p.a), o = p.o + spread * p.v * g, aw = 1 + 3 * g + 2 * p.f;
      const P1 = { x: p.x, y: p.y, nx, ny, o, aw, hc: p.w * (0.45 + 0.9 * g), ac: 0.42 * k * p.f * (0.7 + 0.3 * p.r) * wet(p.x, p.y), aL: 0.8 * k * p.f * p.l * wet(p.x + nx * o, p.y + ny * o), aR: 0.8 * k * p.f * p.r * wet(p.x - nx * o, p.y - ny * o) };   // r, l: the foam is patchy
      if (P0) {
        lane(P0.x, P0.y, P0.nx, P0.ny, 0, P0.hc, P0.ac, P1.x, P1.y, P1.nx, P1.ny, 0, P1.hc, P1.ac);
        lane(P0.x, P0.y, P0.nx, P0.ny, P0.o, P0.aw, P0.aL, P1.x, P1.y, P1.nx, P1.ny, P1.o, P1.aw, P1.aL);
        lane(P0.x, P0.y, P0.nx, P0.ny, -P0.o, P0.aw, P0.aR, P1.x, P1.y, P1.nx, P1.ny, -P1.o, P1.aw, P1.aR);
      }
      P0 = P1;
    }
    if (go) {                                                        // the bow wave: from the stem back past both sides, opening out to where the V's arms are at the stern
      const bw = BOW_W[c.type] || (BOW_W[c.type] = boatHalf(c.t.body, c.t.wid)(0.65)), nx = -sa, ny = ca, ax = u => c.x + ca * (u - 0.5) * L, ay = u => c.y + sa * (u - 0.5) * L;
      const o1 = Math.max(bw + 0.8 + 1.5 * f, lerp(0.4, o0, 0.35));
      for (const s of [-1, 1]) {
        lane(ax(1), ay(1), nx, ny, s * 0.4, 0.6, 0.85 * f, ax(0.65), ay(0.65), nx, ny, s * o1, 1.3, 0.8 * f);
        lane(ax(0.65), ay(0.65), nx, ny, s * o1, 1.3, 0.8 * f, ax(0), ay(0), nx, ny, s * o0, 1, 0.8 * f);
      }
    }
  }
  if (n) { _wc.copy(hemi.color).multiplyScalar(hemi.intensity).add(_tmp.copy(sun.color).multiplyScalar(sun.intensity * Math.max(0, sun.position.y / sun.position.length()))); wakeMat.uniforms.uC.value.setRGB(Math.min(1, _wc.r), Math.min(1, _wc.g), Math.min(1, _wc.b)); }
  wGeo.setDrawRange(0, n); aWPos.needsUpdate = aWAl.needsUpdate = n > 0;
}
const MAXT = 48, tGeo = new THREE.BufferGeometry(), tPos = new Float32Array(MAXT * 6);
tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
const tracerMesh = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({ color: 0xfff3a0 })); tracerMesh.frustumCulled = false; scene.add(tracerMesh);
function gfxTracers() {
  let n = 0; for (const t of tracers) { if (n >= MAXT) break; tPos.set([t.x1, t.z1 || 13, t.y1, t.x2, t.z2 || 13, t.y2], n * 6); n++; }
  tGeo.setDrawRange(0, n * 2); tGeo.attributes.position.needsUpdate = true;
}
const MAXD = 170, decalMesh = new THREE.InstancedMesh(GCirc, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), MAXD);
{ const c = new THREE.Color(0); for (let k = 0; k < MAXD; k++) decalMesh.setColorAt(k, c); }
decalMesh.frustumCulled = false; decalMesh.count = 0; scene.add(decalMesh);
const _dm = new THREE.Object3D(), _dc = new THREE.Color();
/* blood marks (js/01j bloodShapes): every mark one of SPLAT_N splash shapes drawn at load - a ragged pool, blobs at its edge, droplets
   and streaks flung out - turned, stretched and sized at random, so no two look alike */
const SPLAT_N = 14, SPLAT_MAX = 70;
function splatTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), R = 30, h = [];
  for (let k = 2; k <= 7; k++) h.push([k, rand(0.03, 0.16) / Math.sqrt(k - 1), rand(0, TAU)]);
  g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; let r = R; for (const [k, amp, ph] of h) r += R * amp * Math.sin(k * a + ph); const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.fill();
  const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  for (let k = 0, n = 2 + Math.floor(rand(0, 5)); k < n; k++) { const a = rand(0, TAU), d = R * rand(0.75, 1.15); dot(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, R * rand(0.12, 0.3)); }   // blobs at the edge
  for (let k = 0, n = 5 + Math.floor(rand(0, 12)); k < n; k++) { const a = rand(0, TAU), d = R * rand(1.15, 1.95); dot(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rand(1, 3.4)); }   // droplets
  for (let k = 0, n = Math.floor(rand(0, 4)); k < n; k++) {                                                                   // streaks flung out
    const a = rand(0, TAU), d0 = R * 0.7, d1 = R * rand(1.3, 1.9), w = rand(2, 4.5);
    g.beginPath(); g.moveTo(64 + Math.cos(a + 0.12) * d0, 64 + Math.sin(a + 0.12) * d0); g.lineTo(64 + Math.cos(a) * d1, 64 + Math.sin(a) * d1); g.lineTo(64 + Math.cos(a - 0.12) * d0, 64 + Math.sin(a - 0.12) * d0); g.fill(); dot(64 + Math.cos(a) * d1, 64 + Math.sin(a) * d1, w * 0.6);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const SPLAT = [...Array(SPLAT_N)].map(() => {
  const m = new THREE.InstancedMesh(GP, new THREE.MeshBasicMaterial({ map: splatTex(), color: 0xffffff, transparent: true, opacity: 0.86, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), SPLAT_MAX);
  const c0 = new THREE.Color(0); for (let k = 0; k < SPLAT_MAX; k++) m.setColorAt(k, c0);
  m.frustumCulled = false; m.count = 0; scene.add(m); return m;
});
const BLOODS = ['#7d0c1e', '#6a0918', '#8e1124', '#5c0714'];
function bloodMark(x, y, r, life) {      // a blood mark on the ground: its own irregular shape (or a round one with bloodShapes off)
  if (decals.length >= 150) return;
  decals.push(feat('bloodShapes') ? { x, y, r, life, blood: true, v: Math.floor(rand(0, SPLAT_N)), rot: rand(0, TAU), ax: rand(0.75, 1.3), col: pick(BLOODS) } : { x, y, r, life, blood: true });
}
function gfxDecals() {
  let n = 0; const sn = SPLAT.map(() => 0);
  for (const d of decals) {
    if (d.v !== undefined) {                                         // an irregular blood mark: the splash shape it was given, turned and stretched
      const m = SPLAT[d.v], k = sn[d.v]; if (k >= SPLAT_MAX) continue; const sc = d.r * 4 * clamp(d.life / 6, 0.05, 1);
      _dm.position.set(d.x, 3.5, d.y); _dm.rotation.set(0, d.rot, 0); _dm.scale.set(sc * d.ax, 1, sc / d.ax); _dm.updateMatrix(); m.setMatrixAt(k, _dm.matrix);
      _dc.set(d.col); m.setColorAt(k, _dc); sn[d.v]++; continue;
    }
    if (n >= MAXD) break; const sc = d.r * clamp(d.life / 6, 0.05, 1);
    _dm.position.set(d.x, 3.5, d.y); _dm.rotation.set(0, 0, 0); _dm.scale.set(sc, 1, sc); _dm.updateMatrix(); decalMesh.setMatrixAt(n, _dm.matrix);
    _dc.set(d.col || (d.scorch ? 0x1c1619 : 0x7d0c1e)); decalMesh.setColorAt(n, _dc); n++;
  }
  decalMesh.count = n; decalMesh.instanceMatrix.needsUpdate = true; if (decalMesh.instanceColor) decalMesh.instanceColor.needsUpdate = true;
  SPLAT.forEach((m, i) => { m.count = sn[i]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
}
const MAXS = 420, sGeo = new THREE.BufferGeometry(), sPos = new Float32Array(MAXS * 18), sCol = new Float32Array(MAXS * 18);
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
const skidMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); skidMesh.frustumCulled = false; scene.add(skidMesh);
function gfxSkids() {
  const n = Math.min(MAXS, skids.length);
  for (let k = 0; k < n; k++) {
    const s = skids[k], dx = s.x2 - s.x1, dy = s.y2 - s.y1, m = Math.hypot(dx, dy) || 1, px = -dy / m * 1.6, py = dx / m * 1.6, y = 1.0, f = 1 - 0.78 * clamp(s.a / 0.55, 0, 1);
    sPos.set([s.x1 + px, y, s.y1 + py, s.x1 - px, y, s.y1 - py, s.x2 - px, y, s.y2 - py, s.x1 + px, y, s.y1 + py, s.x2 - px, y, s.y2 - py, s.x2 + px, y, s.y2 + py], k * 18);
    for (let v = 0; v < 6; v++) { sCol[k * 18 + v * 3] = 0.26 * f; sCol[k * 18 + v * 3 + 1] = 0.27 * f; sCol[k * 18 + v * 3 + 2] = 0.31 * f; }
  }
  sGeo.setDrawRange(0, n * 6); sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
}
const popLayer = $('popLayer'), popEls = [], _pv = new THREE.Vector3();
function gfxPops() {
  for (let k = 0; k < pops.length; k++) {
    let el = popEls[k]; if (!el) { el = popEls[k] = document.createElement('div'); el.className = 'pop'; popLayer.appendChild(el); }
    const p = pops[k]; if (el._t !== p.txt) { el._t = p.txt; el.textContent = p.txt; el.style.color = p.col; }
    _pv.set(p.x, 20 + (p.h || 18), p.y).project(camera);
    el.style.display = 'block'; el.style.opacity = clamp(p.life * 2, 0, 1);
    el.style.transform = 'translate(' + ((_pv.x * 0.5 + 0.5) * VW).toFixed(1) + 'px,' + ((-_pv.y * 0.5 + 0.5) * VH).toFixed(1) + 'px) translate(-50%,-50%)';
  }
  for (let k = pops.length; k < popEls.length; k++) popEls[k].style.display = 'none';
}

