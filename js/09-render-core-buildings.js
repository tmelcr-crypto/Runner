'use strict';
/* ---------- 7. RENDERING (three.js) - chase camera tilted CAM_TILT_DEG away from straight down ---------- */
const CAM_TILT_DEG = 25;     // 0 = pure top-down, 25 = slight tilt toward the south
const CAM_FOV = 38, SIDE_H = 3, OUTSIDE_HEX = 0x08030f;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
catch (e) {
  document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;left:16px;top:16px;margin:0;color:#ff3b5c;font-family:monospace;z-index:9">WebGL is not available here, so the 3D view cannot start.</p>');
  throw e;
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(OUTSIDE_HEX);
scene.fog = new THREE.Fog(OUTSIDE_HEX, 1700, 3800);
const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 30, 7000);
scene.add(new THREE.HemisphereLight(0x8a7cff, 0x2a1245, 0.95));
const sun = new THREE.DirectionalLight(0x9fc4ff, 0.6); sun.position.set(-600, 1000, -400); scene.add(sun);   // sun in the north-west, shadows fall south-east
const flashLight = new THREE.PointLight(0xffc060, 0, 220); scene.add(flashLight);
const boomLight = new THREE.PointLight(0xff8a30, 0, 800); scene.add(boomLight);

function applySize() {
  const pr = Math.min(DPR, touchMode ? 1.5 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(VW, VH, false);
  camera.aspect = VW / VH; camera.updateProjectionMatrix();
  partMat.uniforms.uScale.value = VH * pr / (2 * Math.tan(CAM_FOV * Math.PI / 360));
}
const visHalfV = () => Math.max(330, 245 / (VW / VH));            // ground half-height we want in view
function camDist() { return visHalfV() / Math.tan(CAM_FOV * Math.PI / 360) / cam.zoom; }
function visRadius() { const h = visHalfV() * 1.4 / cam.zoom; return Math.hypot(h * (VW / VH), h); }
function placeCamera(shake) {
  const D = camDist(), tl = CAM_TILT_DEG * Math.PI / 180;
  let sx = 0, sz = 0; if (shake && cam.shake > 0) { sx = rand(-1, 1) * cam.shake * 1.4; sz = rand(-1, 1) * cam.shake * 1.4; }
  camera.position.set(cam.x + sx, D * Math.cos(tl), cam.y + D * Math.sin(tl) + sz);
  camera.lookAt(cam.x + sx, 0, cam.y + sz); camera.updateMatrixWorld();
}
const _ray = new THREE.Raycaster(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _v2 = new THREE.Vector2(), _hit = new THREE.Vector3();
function screenToWorld(sx, sy) {      // mouse position -> point on the ground (game x, y)
  placeCamera(false); _v2.set(sx / VW * 2 - 1, -(sy / VH) * 2 + 1); _ray.setFromCamera(_v2, camera);
  return _ray.ray.intersectPlane(_pl, _hit) ? { x: _hit.x, y: _hit.z } : { x: cam.x, y: cam.y };
}
const PAD = 10;                        // raised pavement around every building
const _gh = [];
function groundH(x, y) {              // the ground is flat; only the pavement around buildings sits SIDE_H higher
  bHash.query(x - PAD, y - PAD, x + PAD, y + PAD, _gh);
  for (const r of _gh) if (r.pad && inSolid(x, y, r, PAD)) return SIDE_H;
  return 0;
}

/* shared geometry and materials */
const GB = new THREE.BoxGeometry(1, 1, 1), GP = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const GCyl = new THREE.CylinderGeometry(1, 1, 1, 10), GCylZ = new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(Math.PI / 2);
const GSph = new THREE.SphereGeometry(1, 10, 8), GCirc = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
const mLam = c => new THREE.MeshLambertMaterial({ color: c }), mBas = c => new THREE.MeshBasicMaterial({ color: c });
const _mc = {}, mc = c => _mc[c] || (_mc[c] = mLam(c));
const E = { glass: mLam(0x1d2740), glassDead: mLam(0x0a0a0c), tire: mLam(0x15151a), headL: mBas(0xfff3b0), tailOff: mBas(0x7a1f1f), tailOn: mBas(0xff4040),
  white: mLam(0xf1f1ee), black: mLam(0x14161d), redOn: mBas(0xff3b5c), redOff: mBas(0x5a1f2a), blueOn: mBas(0x3f6bff), blueOff: mBas(0x1f2a5a),
  cargo: mLam(0x5c5a8c), shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }) };
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const glowMats = {};
function glowMat(col, op) { const k = col + (op || 1); return glowMats[k] || (glowMats[k] = new THREE.MeshBasicMaterial({ map: glowTex, color: col, transparent: true, opacity: op || 1, blending: THREE.AdditiveBlending, depthWrite: false })); }
const M = { asphalt: mLam(0x1a1626), instWhite: new THREE.MeshLambertMaterial({ color: 0xffffff }), instBasic: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  wall: mLam(0x2b3060), red: mBas(0xff3b5c) };

/* merged-geometry helper (used for buildings) */
function GeoBuilder() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
GeoBuilder.prototype.quad = function (a, b, c, d, n, col, uvs) {
  const P = [a, b, c, a, c, d], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]];
  for (let i = 0; i < 6; i++) { this.pos.push(P[i][0], P[i][1], P[i][2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(U[i][0], U[i][1]); this.col.push(col.r, col.g, col.b); }
};
GeoBuilder.prototype.box = function (x0, y0, z0, x1, y1, z1, col) {   // five faces, no uv use
  const z = [[0, 0], [0, 0], [0, 0], [0, 0]];
  this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, z);
  this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, z);
  this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, z);
  this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, z);
  this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, z);
};
GeoBuilder.prototype.build = function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
  g.computeBoundingSphere(); return g;
};
/* ---- building facades: 4 shared 256px atlases (tile = 4 bays x 4 floors) + 1 shopfront strip. Detail lives in textures, not triangles. ---- */
const BAY = 16, FLOOR = 14, GFH = 20;           // bay width, upper floor height, ground floor height (world units)
const ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());
function finishTex(c) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; return t;
}
const NEON_WIN = ['#ff2bd6', '#2bf3ff', '#2bf3ff', '#ffd23f', '#a259ff', '#3dffa6', '#ff7a3d', '#ff2bd6'];
function makeFacadeTex(style) {                      // returns { map, emi }: albedo + an emissive layer holding only the lit neon windows
  const S = 256, C = 64, c = document.createElement('canvas'), ce = document.createElement('canvas'); c.width = c.height = ce.width = ce.height = S;
  const g = c.getContext('2d'), ge = ce.getContext('2d');
  g.fillStyle = '#9a92c4'; g.fillRect(0, 0, S, S); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  if (style === 2) {                                // brick courses
    for (let y = 0; y < S; y += 8) for (let x = ((y / 8) % 2) * 8 - 8; x < S; x += 16) {
      g.fillStyle = 'rgba(0,0,0,' + (0.02 + Math.random() * 0.16).toFixed(3) + ')'; g.fillRect(x + 1, y + 1, 14, 6);
    }
  }
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    const x = a * C, y = b * C, lit = Math.random() < 0.42, lc = pick(NEON_WIN);
    ge.fillStyle = lc;
    if (style === 0) {                              // glass curtain wall
      const gr = g.createLinearGradient(x, y, x + C, y + C);
      gr.addColorStop(0, lit ? lc : '#4b3f8f'); gr.addColorStop(1, lit ? lc : '#0e0a2c');
      g.fillStyle = gr; g.fillRect(x + 2, y + 2, C - 4, C - 15);
      if (lit) ge.fillRect(x + 2, y + 2, C - 4, C - 15);
      else { g.fillStyle = 'rgba(120,230,255,.2)'; g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + 30, y + 2); g.lineTo(x + 2, y + 34); g.fill(); }
      g.fillStyle = '#1a1535'; g.fillRect(x, y + C - 13, C, 13);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + C - 13, C, 2);
      g.fillStyle = 'rgba(90,230,255,.4)'; g.fillRect(x, y, 2, C); g.fillRect(x + C - 2, y, 2, C); g.fillRect(x + 31, y + 2, 2, C - 15);
    } else if (style === 1) {                       // punched apartment windows
      g.fillStyle = '#2b2450'; g.fillRect(x + 11, y + 7, 42, 42);
      g.fillStyle = lit ? lc : '#150f33'; g.fillRect(x + 15, y + 11, 34, 34);
      if (lit) ge.fillRect(x + 15, y + 11, 34, 34);
      else { g.fillStyle = 'rgba(120,230,255,.16)'; g.beginPath(); g.moveTo(x + 15, y + 11); g.lineTo(x + 34, y + 11); g.lineTo(x + 15, y + 30); g.fill(); }
      g.fillStyle = '#2b2450'; g.fillRect(x + 31, y + 11, 2, 34); g.fillRect(x + 15, y + 27, 34, 2);
      g.fillStyle = '#3a2f66'; g.fillRect(x + 7, y + 49, 50, 5);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 7, y + 54, 50, 3); g.fillRect(x + 11, y + 7, 42, 2);
    } else if (style === 2) {                       // tall arched windows
      const arch = q => { q.beginPath(); q.moveTo(x + 17, y + 52); q.lineTo(x + 17, y + 24); q.arc(x + 32, y + 24, 15, Math.PI, 0); q.lineTo(x + 47, y + 52); q.closePath(); };
      arch(g); g.fillStyle = lit ? lc : '#150f33'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#3a2f66'; g.stroke();
      if (lit) { arch(ge); ge.fill(); }
      g.fillStyle = '#3a2f66'; g.fillRect(x + 31, y + 12, 2, 40); g.fillRect(x + 17, y + 33, 30, 2); g.fillRect(x + 13, y + 52, 38, 4);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 13, y + 56, 38, 3);
    } else {                                        // industrial ribbon windows
      g.fillStyle = '#1b1735'; g.fillRect(x + 3, y + 12, C - 6, 36);
      for (let k = 0; k < 3; k++) {
        const on = lit && (k === 1 || Math.random() < 0.4);
        g.fillStyle = on ? lc : '#2c3a63'; g.fillRect(x + 6 + k * 18, y + 15, 16, 30);
        if (on) ge.fillRect(x + 6 + k * 18, y + 15, 16, 30); else { g.fillStyle = 'rgba(120,230,255,.15)'; g.fillRect(x + 6 + k * 18, y + 15, 16, 6); }
      }
      g.fillStyle = '#3a3560'; g.fillRect(x + 1, y + 48, C - 2, 4);
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + C - 2, C, 2);      // floor line
  }
  return { map: finishTex(c), emi: finishTex(ce) };
}
function makeShopTex() {                            // 4 bays wide x 1 floor high, neon sign band on top
  const c = document.createElement('canvas'), ce = document.createElement('canvas'); c.width = ce.width = 256; c.height = ce.height = 64;
  const g = c.getContext('2d'), ge = ce.getContext('2d');
  g.fillStyle = '#9a92c4'; g.fillRect(0, 0, 256, 64); ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 64);
  for (let a = 0; a < 4; a++) {
    const x = a * 64, door = a === 1 || (a === 3 && Math.random() < 0.3), lit = Math.random() < 0.8, lc = pick(NEON_WIN), sc = pick(NEON_WIN);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, 0, 64, 12);
    g.fillStyle = sc; g.fillRect(x + 6, 5, 52, 3); ge.fillStyle = sc; ge.fillRect(x + 6, 5, 52, 3);     // neon sign tube
    g.fillStyle = '#120d2a'; g.fillRect(x + (door ? 15 : 3), 15, door ? 34 : 58, door ? 49 : 38);
    if (door) {
      g.fillStyle = lit ? lc : '#2b2a5c'; g.fillRect(x + 19, 19, 26, 30); g.fillStyle = '#120d2a'; g.fillRect(x + 31, 19, 2, 30);
      if (lit) { ge.fillStyle = lc; ge.fillRect(x + 19, 19, 12, 30); ge.fillRect(x + 33, 19, 12, 30); }
      g.fillStyle = '#9fe9ff'; g.fillRect(x + 21, 40, 6, 2);
    } else {
      g.fillStyle = lit ? lc : '#2b2a5c'; g.fillRect(x + 6, 18, 52, 32);
      if (lit) {
        ge.fillStyle = lc; ge.fillRect(x + 6, 18, 52, 32);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, 30, 52, 2); g.fillRect(x + 6, 40, 52, 2);
        ge.fillStyle = 'rgba(0,0,0,.6)'; ge.fillRect(x + 6, 30, 52, 2); ge.fillRect(x + 6, 40, 52, 2);
        for (let k = 0; k < 5; k++) { const kc = pick(NEON_WIN); g.fillStyle = kc; g.fillRect(x + 9 + k * 10, 24 + (k % 2) * 10, 6, 5); ge.fillStyle = kc; ge.fillRect(x + 9 + k * 10, 24 + (k % 2) * 10, 6, 5); }
      }
      g.fillStyle = '#120d2a'; g.fillRect(x + 30, 18, 3, 32);
      g.fillStyle = '#1a1535'; g.fillRect(x + 3, 53, 58, 11);
    }
  }
  return { map: finishTex(c), emi: finishTex(ce) };
}
const FAC = [0, 1, 2, 3].map(makeFacadeTex), SHOPTEX = makeShopTex();

function makeRoofTex(k) {                           // 128px tile = 48 world units: membrane / corrugated metal / concrete pavers
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  if (k === 0) {
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.09).toFixed(3) + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.beginPath(); g.ellipse(Math.random() * 128, Math.random() * 128, 14 + Math.random() * 14, 8 + Math.random() * 8, Math.random() * 3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 1); g.fillRect(31, 0, 1, 128); g.fillRect(95, 0, 1, 128);
  } else if (k === 1) {
    for (let x = 0; x < 128; x += 8) { g.fillStyle = '#d9dbe0'; g.fillRect(x, 0, 4, 128); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, 0, 1, 128); g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x + 3, 0, 1, 128); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,70,40,' + (Math.random() * 0.12).toFixed(3) + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 6, 14); }
  } else {
    for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) { g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.08).toFixed(3) + ')'; g.fillRect(x, y, 16, 16); }
    g.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i <= 128; i += 16) { g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); }
  }
  return finishTex(c);
}
const ROOFTEX = [0, 1, 2].map(makeRoofTex);

/* the static city */
let cityGroup = null;
function instanced(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length)), d = new THREE.Object3D(), col = new THREE.Color();
  items.forEach((it, k) => {
    d.position.set(it.x, it.y, it.z); d.scale.set(it.sx, it.sy, it.sz); d.rotation.set(0, it.ry || 0, 0); d.updateMatrix(); it._m = m; it._k = k;   // so a blast can lift it out
    m.setMatrixAt(k, d.matrix); col.set(it.c); m.setColorAt(k, col);
  });
  m.count = items.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false; cityGroup.add(m); return m;
}
/* lean geometry helpers: the camera only ever sees south, east and west faces plus tops, so we never emit north faces or undersides */
const Z4 = [[0, 0], [0, 0], [0, 0], [0, 0]];
GeoBuilder.prototype.lbox = function (x0, y0, z0, x1, y1, z1, col, top) {
  this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, Z4);
  this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, Z4);
  this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, Z4);
  if (top !== false) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, Z4);
};
GeoBuilder.prototype.tri = function (a, b, c, n, col) {
  for (const p of [a, b, c]) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(0, 0); this.col.push(col.r, col.g, col.b); }
};
GeoBuilder.prototype.prism = function (cx, cz, r, y0, y1, col, seg, rTop, cap) {   // cylinder / cone frustum
  rTop = rTop === undefined ? r : rTop;
  const h = y1 - y0, P = (a, rr, y) => [cx + rr * Math.cos(a), y, cz + rr * Math.sin(a)];
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, am = (a0 + a1) / 2;
    let nx = Math.cos(am) * h, ny = r - rTop, nz = Math.sin(am) * h; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    this.quad(P(a1, r, y0), P(a0, r, y0), P(a0, rTop, y1), P(a1, rTop, y1), [nx, ny, nz], col, Z4);
    if (cap) this.tri([cx, y1, cz], P(a1, rTop, y1), P(a0, rTop, y1), [0, 1, 0], col);
  }
};
GeoBuilder.prototype.ring = function (ax0, az0, ax1, az1, ya, yb, wd, col) {         // parapet / ledge frame
  this.lbox(ax0, ya, az1 - wd, ax1, yb, az1, col); this.lbox(ax0, ya, az0, ax1, yb, az0 + wd, col);
  this.lbox(ax0, ya, az0 + wd, ax0 + wd, yb, az1 - wd, col); this.lbox(ax1 - wd, ya, az0 + wd, ax1, yb, az1 - wd, col);
};
function mergeBuilders(list) {
  let pos = [], nor = [], uv = [], col = [], off = 0; const g = new THREE.BufferGeometry(), groups = [];
  list.forEach((b, i) => { const n = b.pos.length / 3; if (!n) return; groups.push([off, n, i]); off += n; pos = pos.concat(b.pos); nor = nor.concat(b.nor); uv = uv.concat(b.uv); col = col.concat(b.col); });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  for (const q of groups) g.addGroup(q[0], q[1], q[2]);
  g.computeBoundingSphere(); return g;
}

/* ---- one building = ONE merged mesh (4 draw calls: facade, shopfront, trim + roof kit, glow). Kinds: glass, deco, office, apartment, brick, warehouse ---- */
const AWN = ['#d6168f', '#0f9ec9', '#5a2bd1', '#d19b00', '#12a57a', '#d4421f'], GLOW = ['#ff2bd6', '#2bf3ff', '#ffe14a', '#a259ff', '#3dffa6'];
const SIGN_WORDS = ['BAR', 'NOODLES', 'HOTEL', '24H', 'CYBER', 'CLUB', 'TECH', 'NEON', 'RAMEN', 'ARCADE', 'PUB', 'CLINIC', 'SUSHI', 'TAXI', 'DRINKS', 'HACK'];
const SIGNTEX = (() => {                              // 2 x 8 cells of glowing neon words
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#0a0614'; g.fillRect(0, 0, 256, 512);
  SIGN_WORDS.forEach((w, k) => {
    const x = (k % 2) * 128, y = Math.floor(k / 2) * 64, col = GLOW[k % GLOW.length];
    g.save(); g.shadowColor = col; g.shadowBlur = 10; g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(x + 5, y + 5, 118, 54);
    let fs = 32; g.font = 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; while (g.measureText(w).width > 100 && fs > 12) { fs -= 2; g.font = 'bold ' + fs + 'px "Arial Black",Impact,sans-serif'; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.shadowBlur = 14; g.fillText(w, x + 64, y + 33); g.shadowBlur = 4; g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.fillText(w, x + 64, y + 33); g.restore();
  });
  return finishTex(c);
})();
const signUV = k => { const cx = k % 2, ry = Math.floor(k / 2), u0 = cx * 0.5, u1 = u0 + 0.5, v1 = 1 - ry / 8, v0 = v1 - 1 / 8; return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; };
function makeBuilding(r) {
  const x0 = r.x, x1 = r.x + r.w, z0 = r.y, z1 = r.y + r.h, y0 = SIDE_H, e = 1.5;
  let kind = r.kind || (r.H >= 108 ? pick(['glass', 'deco']) : pick(['office', 'apartment', 'apartment', 'brick', 'brick', 'warehouse']));
  const condo = kind === 'condo'; if (condo) kind = 'apartment';                    // coastal condo: a tall apartment block, white, lots of balconies
  const inr = r.inner || 0, inS = inr & 2, inE = inr & 8, inW = inr & 4, mn = Math.min(r.w, r.h);   // inner sides touch another piece of the same block
  const style = { glass: 0, office: 0, apartment: 1, deco: 1, brick: 2, warehouse: 3 }[kind];
  let nF = Math.max(r.H < 40 ? 1 : 2, Math.round((r.H - GFH) / FLOOR));
  if (kind === 'warehouse') nF = randi(2, 3); else if (kind === 'brick') nF = Math.min(nF, randi(3, 6)); else if (kind === 'apartment' && !condo) nF = Math.min(nF, 8);
  const tiers = [];
  if ((kind === 'glass' || kind === 'deco') && mn > 110 && nF >= 6) {
    tiers.push({ ins: 0, f: Math.max(2, Math.round(nF * 0.5)) }, { ins: 18, f: Math.max(1, Math.round(nF * 0.28)) }, { ins: 40, f: Math.max(1, Math.round(nF * 0.22)) });
  } else if ((kind === 'glass' || kind === 'deco') && mn > 64 && nF >= 4) { const f0 = Math.ceil(nF * 0.7); tiers.push({ ins: 0, f: f0 }, { ins: 14, f: nF - f0 }); }
  else if (kind === 'office' && nF >= 4 && mn > 80 && Math.random() < 0.4) { const f0 = Math.ceil(nF * 0.65); tiers.push({ ins: 0, f: f0 }, { ins: 22, f: nF - f0 }); }
  else tiers.push({ ins: 0, f: nF });
  r.H = GFH + tiers.reduce((s, t) => s + t.f, 0) * FLOOR;

  const C = h => new THREE.Color(h), base = C(r.c);
  const tint = r.pastel ? base.clone().lerp(C(0xffffff), 0.15) : condo ? base.clone().lerp(C(0xffffff), 0.6) : kind === 'glass' ? base.clone().lerp(C(0x9fb8d8), 0.65) : kind === 'brick' ? base.clone().multiplyScalar(0.85).lerp(C(0xb5654a), 0.5)
    : kind === 'warehouse' ? base.clone().lerp(C(0xb9bcc4), 0.7) : base.clone().lerp(C(0xffffff), 0.35);
  const trimC = r.pastel || condo ? C(0xf4efe6).multiplyScalar(0.8) : (kind === 'deco' ? C(0xd9c27a) : tint.clone().lerp(C(0xf0ece0), 0.7)).multiplyScalar(0.55), gfC = tint.clone().lerp(C(0xdad5c9), 0.55).multiplyScalar(0.7);
  const roofC = r.pastel ? tint.clone().lerp(C(0xffffff), 0.45).multiplyScalar(0.8) : condo ? C(0xe6e6ea).multiplyScalar(0.7) : (kind === 'warehouse' ? C(0xc2c6d0) : (kind === 'glass' || kind === 'deco') ? C(0xcfcbc0) : C(0x8a8d97).lerp(base, 0.12)).multiplyScalar(0.42), roofTex = { glass: 2, deco: 2, office: 0, apartment: 0, brick: 0, warehouse: 1 }[kind];
  const NEO = C(pick(GLOW)), NEO2 = C(pick(GLOW));
  const iron = C(0x2b2e38), roofD = C(0x353841), acC = C(0x9aa0ab), fanC = C(0x555a66), skyC = C(0x4d6aa8);
  const U = new GeoBuilder(), G = new GeoBuilder(), T = new GeoBuilder(), L = new GeoBuilder(), R = new GeoBuilder(), S = new GeoBuilder(), W1 = C('#ffffff');

  function wallFaces(gb, ax0, az0, ax1, az1, ya, yb, col, gf) {
    const v = gf ? 1 : (yb - ya) / FLOOR / 4, ov = gf ? 0 : randi(0, 3) / 4, fu = w => Math.max(1, Math.round(w / BAY)) / 4;
    let u = fu(ax1 - ax0), ou = randi(0, 3) / 4;
    gb.quad([ax0, ya, az1], [ax1, ya, az1], [ax1, yb, az1], [ax0, yb, az1], [0, 0, 1], col, [[ou, ov], [ou + u, ov], [ou + u, ov + v], [ou, ov + v]]);
    u = fu(az1 - az0); ou = randi(0, 3) / 4;
    gb.quad([ax1, ya, az1], [ax1, ya, az0], [ax1, yb, az0], [ax1, yb, az1], [1, 0, 0], col, [[ou, ov], [ou + u, ov], [ou + u, ov + v], [ou, ov + v]]);
    ou = randi(0, 3) / 4;
    gb.quad([ax0, ya, az0], [ax0, ya, az1], [ax0, yb, az1], [ax0, yb, az0], [-1, 0, 0], col, [[ou, ov], [ou + u, ov], [ou + u, ov + v], [ou, ov + v]]);
  }
  function piers(ax0, az0, ax1, az1, ya, yb, col) {                 // vertical stone piers every 4 bays
    const nbS = Math.max(1, Math.round((ax1 - ax0 - 2 * e) / BAY)), bwS = (ax1 - ax0 - 2 * e) / nbS;
    for (let k = 4; k < nbS - 1; k += 4) { const px = ax0 + e + k * bwS; T.lbox(px - 1, ya, az1 - e - 0.2, px + 1, yb, az1, col, false); }
    const nbE = Math.max(1, Math.round((az1 - az0 - 2 * e) / BAY)), bwE = (az1 - az0 - 2 * e) / nbE;
    for (let k = 4; k < nbE - 1; k += 4) { const pz = az0 + e + k * bwE; T.lbox(ax1 - e - 0.2, ya, pz - 1, ax1, yb, pz + 1, col, false); T.lbox(ax0, ya, pz - 1, ax0 + e + 0.2, yb, pz + 1, col, false); }
  }
  const taken = [];
  function spot(ax0, az0, ax1, az1, w, d) {                           // random free place on a roof
    if (ax1 - ax0 < w + 14 || az1 - az0 < d + 14) return null;
    for (let t = 0; t < 24; t++) {
      const px = rand(ax0 + 7, ax1 - 7 - w), pz = rand(az0 + 7, az1 - 7 - d);
      if (taken.every(q => px > q[2] + 3 || px + w < q[0] - 3 || pz > q[3] + 3 || pz + d < q[1] - 3)) { taken.push([px, pz, px + w, pz + d]); return [px, pz]; }
    }
    return null;
  }
  const acUnit = (x, z, yt, s) => { T.lbox(x, yt, z, x + 8 * s, yt + 5 * s, z + 8 * s, acC); T.lbox(x + 1.5 * s, yt + 5 * s, z + 1.5 * s, x + 6.5 * s, yt + 5.5 * s, z + 6.5 * s, fanC); };
  const antenna = (cx, cz, yt, h) => {
    T.lbox(cx - 0.5, yt, cz - 0.5, cx + 0.5, yt + h, cz + 0.5, iron, false); T.lbox(cx - 3.5, yt + h - 7, cz - 0.3, cx + 3.5, yt + h - 6.4, cz + 0.3, iron, false);
    L.lbox(cx - 1.2, yt + h, cz - 1.2, cx + 1.2, yt + h + 2.4, cz + 1.2, C('#ff3b5c'));
  };
  const waterTower = (cx, cz, yt) => {
    for (const [dx, dz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) T.lbox(cx + dx - 0.5, yt, cz + dz - 0.5, cx + dx + 0.5, yt + 7, cz + dz + 0.5, iron, false);
    T.prism(cx, cz, 5.2, yt + 7, yt + 15, C(0x8a6a48), 8); T.prism(cx, cz, 5.45, yt + 9, yt + 9.8, iron, 8); T.prism(cx, cz, 5.45, yt + 12.5, yt + 13.3, iron, 8);
    T.prism(cx, cz, 5.8, yt + 15, yt + 19.5, roofD, 8, 0.4, true);
  };
  const chimney = (x, z, yt) => { const h = rand(8, 14); T.lbox(x, yt, z, x + 4, yt + h, z + 4, C(0x8a4a3a).lerp(base, 0.1)); T.lbox(x - 0.6, yt + h, z - 0.6, x + 4.6, yt + h + 1.2, z + 4.6, trimC); };
  const penthouse = (x, z, yt, w, d, h) => { T.lbox(x, yt, z, x + w, yt + h, z + d, tint.clone().lerp(C(0xcfcfd4), 0.5)); T.lbox(x + w / 2 - 2, yt, z + d, x + w / 2 + 2, yt + 5.5, z + d + 0.25, iron, false); T.lbox(x - 0.5, yt + h, z - 0.5, x + w + 0.5, yt + h + 1, z + d + 0.5, trimC); };
  const solar = (x, z, yt, n) => { for (let k = 0; k < n; k++) { const xa = x + k * 9.5, xb = xa + 8.5, c = C(k % 2 ? 0x2c4f86 : 0x335a96); T.quad([xa, yt + 0.8, z + 7], [xb, yt + 0.8, z + 7], [xb, yt + 4.4, z], [xa, yt + 4.4, z], [0, 0.85, 0.52], c, Z4); T.lbox(xa + 1, yt, z + 6.4, xa + 1.6, yt + 1, z + 7, iron, false); T.lbox(xb - 1.6, yt, z + 6.4, xb - 1, yt + 1, z + 7, iron, false); } };
  const dish = (cx, cz, yt) => { T.prism(cx, cz, 0.5, yt, yt + 3, iron, 5); T.prism(cx, cz, 3.2, yt + 3, yt + 5.6, C(0xe8eaee), 10, 0.8, true); };
  const garden = (x, z, yt, w, d) => { T.lbox(x, yt, z, x + w, yt + 1.4, z + d, C(0x3d8a3a)); for (let k = 0; k < Math.round(w * d / 45); k++) { const rr = rand(1.6, 3); T.prism(x + rand(rr, w - rr), z + rand(rr, d - rr), rr, yt + 1.4, yt + 1.4 + rand(3, 6), C(pick([0x2c6b2c, 0x347a35, 0x4a9a3f])), 7, rr * 0.35, true); } };
  const helipad = (cx, cz, yt) => { T.prism(cx, cz, 13, yt, yt + 0.5, C(0x5a5f69), 18, 13, true); const w = C(0xf2f2ee); T.lbox(cx - 6, yt + 0.5, cz - 6, cx - 4, yt + 0.62, cz + 6, w); T.lbox(cx + 4, yt + 0.5, cz - 6, cx + 6, yt + 0.62, cz + 6, w); T.lbox(cx - 4, yt + 0.5, cz - 1, cx + 4, yt + 0.62, cz + 1, w); };
  const silo = (cx, cz, yt) => { T.prism(cx, cz, 6, yt, yt + 13, C(0xc9ccd2), 10); T.prism(cx, cz, 6.3, yt + 4, yt + 5, iron, 10); T.prism(cx, cz, 6.3, yt + 9, yt + 10, iron, 10); T.prism(cx, cz, 6.2, yt + 13, yt + 16, C(0xaeb2ba), 10, 1, true); };
  const stack = (x, z, yt) => { T.prism(x, z, 1.3, yt, yt + rand(7, 11), C(0x8a8f99), 6, 1.3, true); T.prism(x, z, 1.8, yt + 5, yt + 5.8, iron, 6); };
  const roofSign = (x, z, yt) => {
    const gc = C(pick(GLOW)); T.lbox(x + 3, yt, z, x + 4.2, yt + 10, z + 1, iron, false); T.lbox(x + 21.8, yt, z, x + 23, yt + 10, z + 1, iron, false);
    T.lbox(x, yt + 10, z, x + 26, yt + 19, z + 1.2, iron);
    L.quad([x + 1.5, yt + 11.5, z + 1.3], [x + 24.5, yt + 11.5, z + 1.3], [x + 24.5, yt + 17.5, z + 1.3], [x + 1.5, yt + 17.5, z + 1.3], [0, 0, 1], gc, Z4);
  };

  /* base: plinth, shopfront with recessed wall, stone ledge above it */
  T.lbox(x0, y0, z0, x1, y0 + 2.5, z1, tint.clone().multiplyScalar(0.55), false);
  wallFaces(G, x0 + e, z0 + e, x1 - e, z1 - e, y0 + 2.5, y0 + GFH, gfC, true);
  T.ring(x0, z0, x1, z1, y0 + GFH - 1.2, y0 + GFH + 1.2, e + 1.4, trimC);
  for (const [px, pz] of [[x0, z0], [x1 - 4, z0], [x0, z1 - 4], [x1 - 4, z1 - 4]]) T.lbox(px, y0 + 2.5, pz, px + 4, y0 + GFH - 1.2, pz + 4, trimC, false);

  /* shop awnings, blade sign (not on warehouses) */
  if (!inS && (kind !== 'warehouse' && kind !== 'glass' && kind !== 'deco' || Math.random() < (r.pastel ? 0.75 : 0.3))) {
    const nb = Math.max(1, Math.round((x1 - x0 - 2 * e) / BAY)), bw = (x1 - x0 - 2 * e) / nb, ac1 = C(pick(AWN)), ac2 = C(0xf4efe6), yH = y0 + GFH - 3, yL = y0 + GFH - 8.5, zW = z1 - e, zF = z1 + 4.2;
    for (let k = 0; k < nb; k++) {
      if (nb > 3 && Math.random() < 0.2) continue;
      const xa = x0 + e + k * bw + 0.8, xb = x0 + e + (k + 1) * bw - 0.8, sw = (xb - xa) / 4, nl = Math.hypot(5.5, 6), n = [0, 5.5 / nl, 6 / nl];
      for (let s = 0; s < 4; s++) { const c = s % 2 ? ac2 : ac1, a = xa + s * sw, b = a + sw; T.quad([a, yL, zF], [b, yL, zF], [b, yH, zW], [a, yH, zW], n, c, Z4); T.quad([a, yL - 2.4, zF], [b, yL - 2.4, zF], [b, yL, zF], [a, yL, zF], [0, 0, 1], c, Z4); }
    }
    if (Math.random() < 0.6) { const bx = x0 + e + rand(2, 3) * bw; L.lbox(bx, y0 + 6, z1 - e, bx + 1.4, y0 + 17, z1 + 6, C(pick(GLOW))); }
  }

  /* upper tiers */
  let yc = y0 + GFH, tops = [];
  tiers.forEach((tr, ti) => {
    const ax0 = x0 + tr.ins, ax1 = x1 - tr.ins, az0 = z0 + tr.ins, az1 = z1 - tr.ins, yt = yc + tr.f * FLOOR;
    wallFaces(U, ax0 + e, az0 + e, ax1 - e, az1 - e, yc, yt, tint.clone().multiplyScalar(1 - ti * 0.04), false);
    for (const [px, pz] of [[ax0, az0], [ax1 - 4, az0], [ax0, az1 - 4], [ax1 - 4, az1 - 4]]) T.lbox(px, yc, pz, px + 4, yt, pz + 4, trimC, false);
    if (kind !== 'glass' && kind !== 'office' && kind !== 'warehouse' || Math.random() < 0.3) piers(ax0, az0, ax1, az1, yc, yt, trimC);
    if (kind === 'warehouse') piers(ax0, az0, ax1, az1, yc, yt, trimC.clone().multiplyScalar(0.8));
    if (kind === 'deco' || (kind === 'brick' && tr.f > 3)) for (let f = 4; f < tr.f; f += 4) T.ring(ax0, az0, ax1, az1, yc + f * FLOOR - 1, yc + f * FLOOR + 1.2, e + 1.2, trimC);   // belt courses
    T.ring(ax0, az0, ax1, az1, yt - 2.6, yt, e + 1.6, trimC.clone().multiplyScalar(0.92));                                    // cornice
    { const ru = (ax1 - ax0) / 48, rv = (az1 - az0) / 48; R.quad([ax0, yt, az1], [ax1, yt, az1], [ax1, yt, az0], [ax0, yt, az0], [0, 1, 0], roofC, [[0, 0], [ru, 0], [ru, rv], [0, rv]]); }                             // roof deck
    T.ring(ax0, az0, ax1, az1, yt, yt + 3.2, 2.4, trimC.clone().multiplyScalar(0.85));                                        // parapet
    if (kind === 'glass') L.quad([ax0 + 2, yt + 0.8, az1 + 0.1], [ax1 - 2, yt + 0.8, az1 + 0.1], [ax1 - 2, yt + 2, az1 + 0.1], [ax0 + 2, yt + 2, az1 + 0.1], [0, 0, 1], C('#3fe0ff'), Z4);
    L.ring(ax0 - 0.4, az0 - 0.4, ax1 + 0.4, az1 + 0.4, yt + 3.2, yt + 4.6, 1.3, ti % 2 ? NEO2 : NEO);       // neon crown
    tops.push({ ax0, az0, ax1, az1, yt, last: ti === tiers.length - 1 });
    yc = yt;
  });

  { const yTop0 = y0 + GFH + tiers[0].f * FLOOR; L.lbox(x1 - 1.6, y0 + GFH, z1 - 1.6, x1 + 0.4, yTop0, z1 + 0.4, NEO2); L.lbox(x0 - 0.4, y0 + GFH, z1 - 1.6, x0 + 1.6, yTop0, z1 + 0.4, NEO); }   // glowing corner tubes

  /* neon blade signs poking out of the facade, and cantilevered upper floors that overhang the pavement */
  { const nF0 = tiers[0].f, ybase = y0 + GFH, nBlade = (kind === 'glass' || kind === 'deco' || kind === 'office') ? randi(2, 3) : randi(1, 2);
    const SIDES = ['s', 's', 'e', 'w'].filter(q => !(q === 's' && inS) && !(q === 'e' && inE) && !(q === 'w' && inW));
    for (let k = 0; k < nBlade && nF0 >= 2 && SIDES.length && mn > 34; k++) {
      const ya = ybase + randi(1, Math.max(1, nF0 - 1)) * FLOOR - 6, yb = ya + 10, side = pick(SIDES), kk = randi(0, 15), uv = signUV(kk), gc = C(pick(GLOW));
      if (side === 's') {
        const bx = rand(x0 + 14, x1 - 14);
        T.lbox(bx - 1.1, ya, z1, bx + 1.1, yb, z1 + 20, iron);
        S.quad([bx + 1.2, ya, z1 + 20], [bx + 1.2, ya, z1], [bx + 1.2, yb, z1], [bx + 1.2, yb, z1 + 20], [1, 0, 0], W1, uv);
        S.quad([bx - 1.2, ya, z1], [bx - 1.2, ya, z1 + 20], [bx - 1.2, yb, z1 + 20], [bx - 1.2, yb, z1], [-1, 0, 0], W1, uv);
        L.lbox(bx - 1.5, ya - 0.6, z1 + 19.4, bx + 1.5, yb + 0.6, z1 + 20.6, gc);
      } else {
        const zc = rand(z0 + 14, z1 - 14), xe = side === 'e' ? x1 : x0, dx = side === 'e' ? 20 : -20, xa = Math.min(xe, xe + dx), xb = Math.max(xe, xe + dx);
        T.lbox(xa, ya, zc - 1.1, xb, yb, zc + 1.1, iron);
        if (side === 'e') S.quad([xe, ya, zc + 1.2], [xe + 20, ya, zc + 1.2], [xe + 20, yb, zc + 1.2], [xe, yb, zc + 1.2], [0, 0, 1], W1, uv);
        else S.quad([xe, ya, zc + 1.2], [xe - 20, ya, zc + 1.2], [xe - 20, yb, zc + 1.2], [xe, yb, zc + 1.2], [0, 0, 1], W1, uv);
        L.lbox(xe + dx - 1.2, ya - 0.6, zc - 1.5, xe + dx + 1.2, yb + 0.6, zc + 1.5, gc);
      }
    }
    if ((kind === 'glass' || kind === 'deco' || kind === 'office') && nF0 >= 7 && !inS && x1 - x0 > 40 && Math.random() < 0.7) {     // overhanging block, three floors tall
      const fo = randi(2, nF0 - 5), ya = ybase + fo * FLOOR, yb = ya + 3 * FLOOR, ax0 = x0 + 8, ax1 = x1 - 8, zF = z1 + 16, cx = (ax0 + ax1) / 2, uv = signUV(randi(0, 15));
      wallFaces(U, ax0, z1 - 4, ax1, zF, ya, yb, tint.clone().multiplyScalar(0.95), false);
      R.quad([ax0, yb, zF], [ax1, yb, zF], [ax1, yb, z1], [ax0, yb, z1], [0, 1, 0], roofC, [[0, 0], [(ax1 - ax0) / 48, 0], [(ax1 - ax0) / 48, 16 / 48], [0, 16 / 48]]);
      T.ring(ax0, z1 - 4, ax1, zF, yb, yb + 2.2, 2, trimC);
      L.lbox(ax0, ya - 1.2, zF - 1.6, ax1, ya + 0.6, zF + 0.4, NEO);                                          // glowing lip under the overhang
      L.lbox(ax0, yb + 2.2, zF - 1.6, ax1, yb + 3.4, zF + 0.4, NEO2);
      S.quad([cx - 28, ya + 7, zF + 0.3], [cx + 28, ya + 7, zF + 0.3], [cx + 28, ya + 35, zF + 0.3], [cx - 28, ya + 35, zF + 0.3], [0, 0, 1], W1, uv);
      for (const px of [ax0 + 4, ax1 - 8]) T.lbox(px, y0, zF - 5, px + 3, ya, zF - 2, iron);                      // columns down to the pavement
    }
  }

  /* balconies and fire escape on apartment blocks */
  if (kind === 'apartment') {
    const t0 = tiers[0], nbS = Math.max(1, Math.round((x1 - x0 - 2 * e) / BAY)), bwS = (x1 - x0 - 2 * e) / nbS, ironL = C(0x4a4e5c);
    for (let f = 1; f < t0.f; f++) for (let k = 1; k < nbS - 1; k++) if (!inS && Math.random() < (condo ? 0.55 : 0.2)) {
      const bx = x0 + e + (k + 0.5) * bwS, yf = y0 + GFH + f * FLOOR + 0.5;
      T.lbox(bx - 5.5, yf, z1 - e, bx + 5.5, yf + 0.9, z1 + 4, trimC); T.lbox(bx - 5.5, yf + 0.9, z1 + 3.4, bx + 5.5, yf + 3.8, z1 + 4, ironL);
    }
    const zc = z0 + r.h * rand(0.35, 0.65);
    for (let f = 1; f <= (inE || condo ? 0 : t0.f); f++) {
      const yf = y0 + GFH + f * FLOOR - 1, yp = yf - FLOOR, dir = f % 2 ? 1 : -1, xs = x1 + 4.1;
      T.lbox(x1 - e, yf, zc - 6, x1 + 4.5, yf + 0.8, zc + 6, iron); T.lbox(x1 + 3.9, yf + 0.8, zc - 6, x1 + 4.5, yf + 4.2, zc + 6, ironL, false);
      if (f > 1) { const za = zc + 6 * dir, zb = zc - 6 * dir; T.quad([xs, yp + 0.8, za], [xs, yf + 0.8, zb], [xs, yf + 2, zb], [xs, yp + 2, za], [1, 0, 0], iron, Z4); }
    }
  }

  /* roof kit per kind */
  for (const tp of tops) {
    const { ax0, az0, ax1, az1, yt } = tp, n = tp.last ? randi(1, 3) : 1;
    for (let i = 0; i < n; i++) { const s = spot(ax0, az0, ax1, az1, 9, 9); if (s) acUnit(s[0], s[1], yt, rand(0.8, 1.2)); }
    if (!tp.last) { if (Math.random() < 0.6) { const ga = spot(ax0, az0, ax1, az1, 18, 10); if (ga) garden(ga[0], ga[1], yt, 18, 10); } continue; }
    if (kind === 'glass' || kind === 'deco' || kind === 'office') {                                // big textured neon board on the roof
      const bs = spot(ax0, az0, ax1, az1, 46, 4), uv = signUV(randi(0, 15));
      if (bs && Math.random() < 0.85) {
        const bx = bs[0], bz = bs[1] + 1; T.lbox(bx + 4, yt, bz, bx + 6, yt + 12, bz + 1.2, iron, false); T.lbox(bx + 38, yt, bz, bx + 40, yt + 12, bz + 1.2, iron, false);
        T.lbox(bx, yt + 12, bz, bx + 44, yt + 34, bz + 1.2, iron);
        S.quad([bx + 1, yt + 12.5, bz + 1.3], [bx + 43, yt + 12.5, bz + 1.3], [bx + 43, yt + 33.5, bz + 1.3], [bx + 1, yt + 33.5, bz + 1.3], [0, 0, 1], W1, uv);
        L.lbox(bx - 0.6, yt + 33.6, bz + 0.2, bx + 44.6, yt + 35, bz + 1.6, NEO); L.lbox(bx - 0.6, yt + 11.4, bz + 0.2, bx + 44.6, yt + 12.6, bz + 1.6, NEO2);
      }
    }
    if (kind === 'glass' || kind === 'office') {
      const p = spot(ax0, az0, ax1, az1, 16, 11); if (p) penthouse(p[0], p[1], yt, 16, 11, 8);
      const a = spot(ax0, az0, ax1, az1, 4, 4); if (a) antenna(a[0] + 2, a[1] + 2, yt, rand(18, 30));
      if (kind === 'glass' && ax1 - ax0 > 70 && Math.random() < 0.5) { const hp = spot(ax0, az0, ax1, az1, 26, 26); if (hp) helipad(hp[0] + 13, hp[1] + 13, yt); }
      else { const so = spot(ax0, az0, ax1, az1, 38, 8); if (so) solar(so[0], so[1], yt, 4); }
      const ga = spot(ax0, az0, ax1, az1, 20, 12); if (ga) garden(ga[0], ga[1], yt, 20, 12);
      const ds = spot(ax0, az0, ax1, az1, 6, 6); if (ds) dish(ds[0] + 3, ds[1] + 3, yt);
      for (let i = 0; i < 2; i++) { const sk = spot(ax0, az0, ax1, az1, 4, 4); if (sk) stack(sk[0] + 2, sk[1] + 2, yt); }
    } else if (kind === 'deco') {
      const cx = (ax0 + ax1) / 2, cz = (az0 + az1) / 2; taken.push([cx - 6, cz - 6, cx + 6, cz + 6]);
      if (Math.min(ax1 - ax0, az1 - az0) >= 34) { const sp = r.pastel ? 12 : 20;
        T.lbox(cx - 9, yt, cz - 9, cx + 9, yt + 8, cz + 9, trimC); T.lbox(cx - 5, yt + 8, cz - 5, cx + 5, yt + 14, cz + 5, trimC);
        T.prism(cx, cz, 3.2, yt + 14, yt + 14 + sp, trimC.clone().multiplyScalar(0.9), 4, 0.5, true); antenna(cx, cz, yt + 14 + sp, 8); }
      for (let i = 0; i < 4; i++) { const s = spot(ax0, az0, ax1, az1, 5, 5); if (s) stack(s[0] + 2.5, s[1] + 2.5, yt); }
    } else if (kind === 'apartment') {
      const w = spot(ax0, az0, ax1, az1, 12, 12); if (w) waterTower(w[0] + 6, w[1] + 6, yt);
      if (Math.random() < 0.5) { const so = spot(ax0, az0, ax1, az1, 38, 8); if (so) solar(so[0], so[1], yt, 4); }
      const ds = spot(ax0, az0, ax1, az1, 6, 6); if (ds) dish(ds[0] + 3, ds[1] + 3, yt);
      for (let i = 0; i < 2; i++) { const c = spot(ax0, az0, ax1, az1, 4, 4); if (c) chimney(c[0], c[1], yt); }
    } else if (kind === 'brick') {
      for (let i = 0; i < 2; i++) { const c = spot(ax0, az0, ax1, az1, 4, 4); if (c) chimney(c[0], c[1], yt); }
      const sk = spot(ax0, az0, ax1, az1, 12, 10); if (sk) { T.lbox(sk[0], yt, sk[1], sk[0] + 12, yt + 3, sk[1] + 10, skyC); T.lbox(sk[0] - 0.5, yt + 3, sk[1] - 0.5, sk[0] + 12.5, yt + 3.6, sk[1] + 10.5, trimC); }
      const sg = spot(ax0, az0, ax1, az1, 26, 3); if (sg && Math.random() < 0.7) roofSign(sg[0], sg[1], yt);
      for (let i = 0; i < 2; i++) { const s = spot(ax0, az0, ax1, az1, 4, 4); if (s) stack(s[0] + 2, s[1] + 2, yt); }
      const ga = spot(ax0, az0, ax1, az1, 18, 10); if (ga && Math.random() < 0.5) garden(ga[0], ga[1], yt, 18, 10);
    } else {                                                                                        // warehouse: sawtooth roof + vents
      const dpt = az1 - az0 - 8, nt = Math.max(2, Math.round(dpt / 18)), tw = dpt / nt;
      for (let k = 0; k < nt; k++) {
        const za = az0 + 4 + k * tw, zb = za + tw, nl = Math.hypot(tw, 7), xa = ax0 + 4, xb = ax1 - 4;
        R.quad([xa, yt + 7, zb], [xb, yt + 7, zb], [xb, yt, za], [xa, yt, za], [0, tw / nl, -7 / nl], roofC.clone().multiplyScalar(0.92), [[0, 0], [(xb - xa) / 48, 0], [(xb - xa) / 48, nl / 48], [0, nl / 48]]);
        T.quad([xa, yt, zb], [xb, yt, zb], [xb, yt + 7, zb], [xa, yt + 7, zb], [0, 0, 1], skyC, Z4);
      }
      for (let i = 0; i < 2; i++) { const s = spot(ax0, az0, ax1, az1, 13, 13); if (s) silo(s[0] + 6.5, s[1] + 6.5, yt); }
      for (let i = 0; i < 2; i++) { const v = spot(ax0, az0, ax1, az1, 6, 6); if (v) { T.prism(v[0] + 3, v[1] + 3, 2.4, yt + 7, yt + 13, iron, 6); T.prism(v[0] + 3, v[1] + 3, 3.4, yt + 13, yt + 15, roofD, 6, 0.3, true); } }
    }
  }

  const mats = [new THREE.MeshLambertMaterial({ map: FAC[style].map, emissive: 0xffffff, emissiveMap: FAC[style].emi, vertexColors: true }), new THREE.MeshLambertMaterial({ map: SHOPTEX.map, emissive: 0xffffff, emissiveMap: SHOPTEX.emi, vertexColors: true }),
    new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ vertexColors: true }), new THREE.MeshLambertMaterial({ map: ROOFTEX[roofTex], vertexColors: true })];
  mats.push(new THREE.MeshBasicMaterial({ map: SIGNTEX, vertexColors: true }));
  const mesh = new THREE.Mesh(mergeBuilders([U, G, T, L, R, S]), mats); mesh.userData.own = mats; r.mesh = mesh; r.fade = 1;
  return mesh;
}
