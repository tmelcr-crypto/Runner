'use strict';
/* ---------- 7c. EFFECTS: particles, rings, tracers, decals, skid marks, score pops ---------- */
const MAXP = 700, pGeo = new THREE.BufferGeometry();
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
    const u = p.life / p.max, s = lerp(p.s1, p.s0, u);
    if (p.ring) { if (rn < RINGS.length) { const m = RINGS[rn++]; m.visible = true; m.position.set(p.x, 4, p.y); m.scale.set(s, 1, s); m.material.opacity = u * 0.9; } continue; }
    if (n >= MAXP) break;
    const c = rgb(p.col);
    pPos[n * 3] = p.x; pPos[n * 3 + 1] = p.z === undefined ? 6 : p.z; pPos[n * 3 + 2] = p.y; pSize[n] = s * (p.alpha ? 1.5 : 1.3) + 1;
    pCol[n * 4] = c[0]; pCol[n * 4 + 1] = c[1]; pCol[n * 4 + 2] = c[2]; pCol[n * 4 + 3] = u * (p.alpha || 1); n++;
  }
  for (let k = rn; k < RINGS.length; k++) RINGS[k].visible = false;
  pGeo.setDrawRange(0, n); aPos.needsUpdate = aSize.needsUpdate = aCol.needsUpdate = true;
}
const MAXT = 48, tGeo = new THREE.BufferGeometry(), tPos = new Float32Array(MAXT * 6);
tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
const tracerMesh = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({ color: 0xfff3a0 })); tracerMesh.frustumCulled = false; scene.add(tracerMesh);
function gfxTracers() {
  let n = 0; for (const t of tracers) { if (n >= MAXT) break; tPos.set([t.x1, 13, t.y1, t.x2, 13, t.y2], n * 6); n++; }
  tGeo.setDrawRange(0, n * 2); tGeo.attributes.position.needsUpdate = true;
}
const MAXD = 170, decalMesh = new THREE.InstancedMesh(GCirc, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), MAXD);
{ const c = new THREE.Color(0); for (let k = 0; k < MAXD; k++) decalMesh.setColorAt(k, c); }
decalMesh.frustumCulled = false; decalMesh.count = 0; scene.add(decalMesh);
const _dm = new THREE.Object3D(), _dc = new THREE.Color();
function gfxDecals() {
  let n = 0;
  for (const d of decals) {
    if (n >= MAXD) break; const sc = d.r * clamp(d.life / 6, 0.05, 1);
    _dm.position.set(d.x, 3.5, d.y); _dm.scale.set(sc, 1, sc); _dm.updateMatrix(); decalMesh.setMatrixAt(n, _dm.matrix);
    _dc.set(d.scorch ? 0x000000 : 0x7d0c1e); decalMesh.setColorAt(n, _dc); n++;
  }
  decalMesh.count = n; decalMesh.instanceMatrix.needsUpdate = true; if (decalMesh.instanceColor) decalMesh.instanceColor.needsUpdate = true;
}
const MAXS = 420, sGeo = new THREE.BufferGeometry(), sPos = new Float32Array(MAXS * 18), sCol = new Float32Array(MAXS * 18);
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
const skidMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); skidMesh.frustumCulled = false; scene.add(skidMesh);
function gfxSkids() {
  const n = Math.min(MAXS, skids.length);
  for (let k = 0; k < n; k++) {
    const s = skids[k], dx = s.x2 - s.x1, dy = s.y2 - s.y1, m = Math.hypot(dx, dy) || 1, px = -dy / m * 1.6, py = dx / m * 1.6, y = 0.5, f = 1 - 0.78 * clamp(s.a / 0.55, 0, 1);
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

