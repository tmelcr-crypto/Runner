'use strict';
/* ---------- 7zd. THE FUNHOUSE: a lunapark attraction on Heron Key, the top-down kind (both modes) ----------
   West of the snack booths, beside the wooden coaster: a striped box with a big clown face over the door and FUNHOUSE in pink neon;
   its roof turns see-through while you are inside, like the Pay 'n' Spray. Inside, from the door: the hall (a clown painted on the
   floor, clown faces on the walls, the ticket booth and its clown), then the MIRROR MAZE (glass walls with glowing tops, always the
   same maze; in at the hall's far left, out at its back right) and the TILTED ROOM down the right side - a crooked floor that slides
   you toward the low wall (places table, Lunapark funhouse) - which opens back into the hall. Open whenever the lunapark is.
   FUN.S: { cx, cy, a, ca, sa, hw, hd, H, maze: { x0, z0, cw, ch, cols, rows }, tilt: { x0, x1, z0, z1 }, door, fay } (local x across,
   z from the back wall to the door). A quest can hold it (FUN.ms): no clown at the booth. Mode: funhouse. */
const FUN = { S: null, ms: null };
const FUN_WT = 4, FUN_DW = 24, FUN_MH = 24;  // wall thickness, the door's width, the mirrors' height
const funOn = () => feat('funhouse') && feat('lunapark') && !!FUN.S;
function funWorld(lx, lz, out) { return ixWorld(FUN.S, lx, lz, out); }
const _funq = {};
function funIn(x, y, m) { const S = FUN.S; if (!S) return false; ixLocal(S, x, y, _funq); return Math.abs(_funq.x) < S.hw - FUN_WT - (m || 0) && Math.abs(_funq.z) < S.hd - FUN_WT - (m || 0); }
function genFunhouse() {                    // js/04 genWorld: always the same spot, west of the snack booths
  FUN.S = null; if (!MAP.lunapark) return;
  const hw = 75, hd = 100, S = FUN.S = { cx: 9533, cy: 3700, a: 0, ca: 1, sa: 0, hw, hd, H: 34, roof: 1 };
  const W = FUN_WT, sol = (lx, lz, w, h) => { const p = funWorld(lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, h), S.a, { bld: true }); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);   // the back and the sides
  for (const s of [-1, 1]) sol(s * (hw + FUN_DW / 2) / 2, hd - W / 2, hw - FUN_DW / 2, W);          // the front, either side of the door
  const M = S.maze = { x0: -hw + W, z0: -hd + W, cols: 4, rows: 6, x1: 25, z1: 56 }; M.cw = (M.x1 - M.x0) / M.cols; M.ch = (M.z1 - M.z0) / M.rows;   // cells wide enough for a person
  S.tilt = { x0: M.x1, x1: hw - W, z0: -hd + W, z1: M.z1 };
  const open = withSeed(6611, () => {                                // the maze: a depth-first carve, the same every game
    const R = M.rows, Cn = M.cols, seen = new Set(), pass = new Set(), key = (c, r) => c + ',' + r, stack = [[0, R - 1]]; seen.add(key(0, R - 1));
    while (stack.length) {
      const [c, r] = stack[stack.length - 1], nb = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < Cn && b < R && !seen.has(key(a, b)));
      if (!nb.length) { stack.pop(); continue; }
      const [a, b] = pick(nb); seen.add(key(a, b)); pass.add(key(c, r) + '|' + key(a, b)); pass.add(key(a, b) + '|' + key(c, r)); stack.push([a, b]);
    }
    return pass;
  });
  const walls = S.walls = [];                                        // [x0, z0, x1, z1] in local units (for the model too)
  for (let c = 0; c < M.cols; c++) for (let r = 0; r < M.rows; r++) {
    const x = M.x0 + c * M.cw, z = M.z0 + r * M.ch;
    if (c < M.cols - 1 && !open.has(c + ',' + r + '|' + (c + 1) + ',' + r)) walls.push([x + M.cw, z, x + M.cw, z + M.ch]);
    if (r < M.rows - 1 && !open.has(c + ',' + r + '|' + c + ',' + (r + 1))) walls.push([x, z + M.ch, x + M.cw, z + M.ch]);
  }
  walls.push([M.x1, M.z0 + M.ch, M.x1, M.z1]);                        // the maze's right side: out at the back row, into the tilted room
  walls.push([M.x0 + M.cw, M.z1, M.x1, M.z1]);                        // its front: in from the hall at the left column
  for (const [x0, z0, x1, z1] of walls) sol((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + 2, Math.abs(z1 - z0) + 2);
  S.booth = { x: 52, z: 80 }; sol(S.booth.x, S.booth.z, 16, 12);      // the ticket booth
  S.fay = { x: 50, z: -84 }; S.door = funWorld(0, hd + 18); S.inside = funWorld(0, hd - 22); S.mazeIn = funWorld(M.x0 + M.cw / 2, M.z1 + 8);
  LM_CLEAR.push([S.cx, S.cy, hw + 8, hd + 8]);
  S.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 40, make: () => withSeed(6612, () => makeFunhouse(S)), mesh: null }; LMS.push(S.lm);
  const bp = funWorld(S.booth.x, S.booth.z);                                        // the ticket clown in the booth
  addPost({ x: bp.x, y: bp.y + 9, a: Math.PI / 2, kind: 'funclerk', back: 200, need: () => funOn() && !FUN.ms, step: standStep,
    make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt: '#ff2bd6', pants: '#ffd23f', ang: po.a }); return p; } });
}

/* ---------- the model ---------- */
let _clownTex = null;
function clownTex() {                       // a clown's face: white, a red nose and grin, blue diamonds round the eyes, orange hair
  if (_clownTex) return _clownTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#ff7a1a'; for (const [x, y] of [[50, 110], [206, 110], [70, 60], [186, 60]]) { g.beginPath(); g.arc(x, y, 46, 0, TAU); g.fill(); }
  g.fillStyle = '#f8f4ec'; g.beginPath(); g.arc(128, 140, 96, 0, TAU); g.fill();
  g.fillStyle = '#2a5fc8'; for (const x of [92, 164]) { g.beginPath(); g.moveTo(x, 86); g.lineTo(x + 18, 112); g.lineTo(x, 138); g.lineTo(x - 18, 112); g.fill(); }
  g.fillStyle = '#14141a'; for (const x of [92, 164]) { g.beginPath(); g.arc(x, 112, 9, 0, TAU); g.fill(); }
  g.fillStyle = '#e8262a'; g.beginPath(); g.arc(128, 150, 20, 0, TAU); g.fill();
  g.strokeStyle = '#e8262a'; g.lineWidth = 16; g.beginPath(); g.arc(128, 162, 56, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  return (_clownTex = finishTex(c));
}
function makeFunhouse(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = FUN_WT, M = S.maze, tl = S.tilt;
  const red = C('#e8262a'), white = C('#f4f0e8'), yel = C('#ffd23f'), pink = C('#ff2bd6'), cyan = C('#2bf3ff'), mirror = C('#c8dcef'), frame = C('#5a5f7a');
  flat(T, -hw, -hd, hw, hd, 0.4, C('#1a1430'));                                       // the floor: dark, a checkerboard in the hall, stripes in the tilted room
  for (let x = -hw + W; x < hw - W; x += 10) for (let z = M.z1; z < hd - W; z += 10) if (((x + z) / 10 & 1) === 0) flat(T, x, z, Math.min(x + 10, hw - W), Math.min(z + 10, hd - W), 0.5, white);
  for (let z = tl.z0, k = 0; z < tl.z1; z += 12, k++) face(T, [[tl.x0, 0.55, z], [tl.x1, 0.55, z + 6], [tl.x1, 0.55, z + 12], [tl.x0, 0.55, z + 6]], [0, 1, 0], k % 2 ? yel : C('#2a2236'));   // crooked stripes: the floor leans
  for (let x = M.x0; x < M.x1; x += 8) for (let z = M.z0; z < M.z1; z += 8) if (rand(0, 1) < 0.12) flat(T, x + 3, z + 3, x + 4.2, z + 4.2, 0.5, cyan);   // star specks under the mirrors
  flat(T, -FUN_DW / 2 - 10, hd, FUN_DW / 2 + 10, hd + 22, 0.45, red);                // a red carpet out front
  /* the shell: red and white stripes, a yellow band on top */
  for (let x = -hw, k = 0; x < hw; x += 12, k++) { const x1 = Math.min(hw, x + 12), col = k % 2 ? red : white; box5(T, x, 0, -hd, x1, H, -hd + W, col); if (x1 <= -FUN_DW / 2 || x >= FUN_DW / 2) box5(T, x, 0, hd - W, x1, H, hd, col); else box5(T, x, 26, hd - W, x1, H, hd, col); }
  for (let z = -hd, k = 0; z < hd; z += 12, k++) { const z1 = Math.min(hd, z + 12), col = k % 2 ? red : white; box5(T, -hw, 0, z, -hw + W, H, z1, col); box5(T, hw - W, 0, z, hw, H, z1, col); }
  for (const [x0, z0, x1, z1] of [[-hw, -hd, hw, -hd + W], [-hw, hd - W, hw, hd], [-hw, -hd, -hw + W, hd], [hw - W, -hd, hw, hd]]) box5(T, x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 2, z1 + 0.3, yel);
  /* the mirrors: silver panes in dark frames, glowing tops */
  for (const [x0, z0, x1, z1] of S.walls) {
    const t = 1, a0 = Math.min(x0, x1) - t, a1 = Math.max(x0, x1) + t, b0 = Math.min(z0, z1) - t, b1 = Math.max(z0, z1) + t;
    box5(T, a0, 0, b0, a1, FUN_MH, b1, mirror); box5(G, a0, FUN_MH, b0, a1, FUN_MH + 0.6, b1, cyan);
    box5(T, a0 - 0.2, 0, b0 - 0.2, a1 + 0.2, 1.5, b1 + 0.2, frame);
  }
  box5(T, S.booth.x - 8, 0, S.booth.z - 6, S.booth.x + 8, 16, S.booth.z + 6, C('#a259ff')); box5(G, S.booth.x - 9, 16, S.booth.z - 7, S.booth.x + 9, 17, S.booth.z + 7, pink);   // the ticket booth
  for (let k = 0; k < 6; k++) box5(G, -hw + 14 + k * 24, H - 4, 70, -hw + 18 + k * 24, H - 3, 74, C(RIDE_COLS[k % RIDE_COLS.length]));   // coloured bulbs over the hall
  /* the roof (it fades while you are inside): a striped big-top slope, a pennant pole */
  for (let x = -hw, k = 0; x < hw; x += 12, k++) { const x1 = Math.min(hw, x + 12); face(R, [[x, H + 2, -hd], [x1, H + 2, -hd], [x1, H + 2, hd], [x, H + 2, hd]], [0, 1, 0], k % 2 ? red : white); }
  box5(RG, hw - 12, H + 2, hd - 12, hw - 10, H + 24, hd - 10, yel); box5(RG, hw - 10, H + 18, hd - 11.3, hw + 1, H + 23, hd - 10.7, pink);
  const m = lmMesh(T, G), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof);
  const cm = new THREE.MeshBasicMaterial({ map: clownTex(), transparent: true, alphaTest: 0.05 });
  const rm = new THREE.MeshBasicMaterial({ map: clownTex(), transparent: true, alphaTest: 0.05 }), big = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), rm);   // a giant clown on the roof, grinning up at the sky
  big.rotation.order = 'YXZ'; big.rotation.set(-Math.PI / 2, S.a, 0); big.position.set(0, H + 2.6, -34); m.add(big);
  const floorFace = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), cm); floorFace.rotation.x = -Math.PI / 2; floorFace.position.set(-30, 0.7, 76); m.add(floorFace);   // painted on the hall floor
  for (const [x, z, ry] of [[-hw + W + 0.6, 76, Math.PI / 2], [hw - W - 0.6, 30, -Math.PI / 2], [hw - W - 0.6, -40, -Math.PI / 2]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), cm); f.position.set(x, 16, z); f.rotation.y = ry; m.add(f); }
  const sign = fasciaSign('FUNHOUSE', '#ff2bd6', 60, 8); sign.position.set(0, 30, hd + 0.9); m.add(sign);
  const top = fasciaSign('FUNHOUSE', '#ff2bd6', 110, 22); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(0, H + 3, 40); m.add(top);
  own.push(roofMat, roofGlow, cm, rm, sign.material, top.material);
  S.pt = { roof, roofMat, roofGlow, top, rm, op: -1 };
  return m;
}

/* ---------- at work: the tilted room slides you, the roof fades over you ---------- */
function funReset() { FUN.ms = null; if (FUN.S) FUN.S.roof = 1; }
function funTick(dt) {                     // js/15 update
  const S = FUN.S; if (!S || !funOn() || P.car || P.dead) return;
  ixLocal(S, P.x, P.y, _funq); const t = S.tilt;
  if (_funq.x > t.x0 + 2 && _funq.x < t.x1 - 6 && _funq.z > t.z0 && _funq.z < t.z1) {        // the leaning floor: toward the low (outer) wall
    const k = PLC.funSlide * UNITS_PER_M * dt, nx = P.x + S.ca * k, ny = P.y + S.sa * k; if (!pedBlocked(nx, ny)) { P.x = nx; P.y = ny; }
  }
}
let funT = 0;
function gfxFun(time) {                    // js/13
  const dt = Math.min(0.1, Math.max(0, time - funT)); funT = time;
  const S = FUN.S; if (!S || !S.lm.mesh || !S.pt) return;
  const pt = S.pt, me = P.car || P, inside = !P.dead && funIn(me.x, me.y, -6);
  S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
  if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.roofGlow.opacity = pt.top.material.opacity = pt.rm.opacity = S.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = S.roof > 0.97; pt.top.material.transparent = true; }
}
