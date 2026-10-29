'use strict';
/* ---------- 9d. THE FIGURE IN THE SHOP ----------
   The big figure on the turntable of a clothes shop (and of a safehouse wardrobe, js/08l preview): rounded and detailed - a shaped
   torso and hips, tapered arms and legs with elbows and knees, hands with thumbs, a neck, a face (eyes, brows, nose, mouth), ears and
   hair - wearing the outfit (js/01n) with its details: collars, buttons, pockets, prints (flowers, checks, camouflage, a number on the
   back), a tie, a zip, a hood, belts, seams, laces and soles. In the street the figures stay the small blocky ones (js/11).
   Mode: shopFigure (off: the blocky figure in the shop too). The figure faces +z; its height is about 29 units, the feet at y 0. */
const HDF = { hair: '#3a2a1a', eye: '#2a1d14', lip: '#b8645a', brow: '#2e2016', seg: 22 };
const hdM = (col, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.82, metalness: 0 }, o || {}));
const hdSph = (r, a, b) => new THREE.SphereGeometry(r, a || HDF.seg, b || 16);
const hdCyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || HDF.seg);
function hdAdd(parent, geo, mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx) m.scale.set(sx, sy || sx, sz || sx); parent.add(m); return m;
}
function hdTex(draw) {                     // a 256 x 256 canvas painted by draw(g, W, H): u around the body (the front in the middle), v up
  const c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d'), 256, 256);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
/* the torso and hips: lathes with even steps in height, so a texture maps straight; turned so that u 0.5 is the front */
const HD_TORSO = [[15.2, 3.1], [16.5, 3.3], [18, 3.65], [19.5, 3.85], [20.8, 3.8], [21.7, 3.55], [22.3, 2.9], [22.9, 1.4]];
const HD_HIPS = [[12.3, 2.75], [12.9, 3.1], [13.8, 3.25], [14.6, 3.2], [15.35, 3.08]];
const hdR = (prof, y) => { for (let k = 0; k < prof.length - 1; k++) { const [y0, r0] = prof[k], [y1, r1] = prof[k + 1]; if (y <= y1) return r0 + (r1 - r0) * clamp((y - y0) / (y1 - y0), 0, 1); } return prof[prof.length - 1][1]; };
const HD_SX = 1.24, HD_SZ = 0.72;           // the body is wider than it is deep
function hdLathe(prof, n) {
  const y0 = prof[0][0], y1 = prof[prof.length - 1][0], pts = [];
  for (let k = 0; k <= n; k++) { const y = y0 + (y1 - y0) * k / n; pts.push(new THREE.Vector2(hdR(prof, y), y)); }
  const g = new THREE.LatheGeometry(pts, 32); g.rotateY(Math.PI); g.scale(HD_SX, 1, HD_SZ); return g;
}
const hdFrontZ = (prof, y) => hdR(prof, y) * HD_SZ;   // the body's front at height y
const hdMix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/* ---------- fabric: the pattern alone (sleeves, legs) and the torso with its front ---------- */
function hdPattern(g, W, H, st, c1, c2) {
  g.fillStyle = c1; g.fillRect(0, 0, W, H);
  const R = (a, b) => a + Math.random() * (b - a);
  if (st === 'hawaii') {                   // hibiscus and leaves
    for (let k = 0; k < 26; k++) { const x = R(0, W), y = R(0, H), s = R(7, 12); g.fillStyle = hdMix(c1, '#0c3a1c', 0.55); g.beginPath(); g.ellipse(x + s, y + s * 0.4, s, s * 0.4, R(0, 3), 0, TAU); g.fill(); }
    for (let k = 0; k < 22; k++) {
      const x = R(0, W), y = R(0, H), s = R(6, 10); g.fillStyle = c2 || '#ffffff';
      for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6, s * 0.5, 0, TAU); g.fill(); }
      g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(x, y, s * 0.25, 0, TAU); g.fill();
    }
  } else if (st === 'check') {             // a lumberjack check
    g.globalAlpha = 0.55; g.fillStyle = c2 || '#14161d';
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 14, H);
    for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 14);
    g.globalAlpha = 0.35; g.fillStyle = '#ffffff'; for (let x = 22; x < W; x += 32) g.fillRect(x, 0, 2, H); for (let y = 22; y < H; y += 32) g.fillRect(0, y, W, 2); g.globalAlpha = 1;
  } else if (st === 'camo') {
    for (const [col, n] of [[hdMix(c1, c2 || '#2a2e1a', 0.5), 30], [c2 || '#2a2e1a', 26], ['#1a1c12', 14]]) for (let k = 0; k < n; k++) {
      g.fillStyle = col; g.beginPath(); const x = R(0, W), y = R(0, H); for (let p = 0; p < 7; p++) { const a = p / 7 * TAU, r = R(8, 20); g.lineTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r); } g.fill();
    }
  } else if (st === 'denim' || st === 'jeans') {
    g.globalAlpha = 0.12; g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (let k = -H; k < W; k += 4) { g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke(); } g.globalAlpha = 1;
  } else { g.globalAlpha = 0.06; g.fillStyle = '#000000'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1); g.globalAlpha = 1; }   // a faint weave
}
function hdTopTex(st, c1, c2) {             // canvas y 0 is the neck (y 22.9), H the waist (y 15.2); x W/2 the front, 0 and W the back
  return hdTex((g, W, H) => {
    hdPattern(g, W, H, st, c1, c2);
    const F = W / 2, yOf = y => (22.9 - y) / (22.9 - 15.2) * H, dark = hdMix(c1, '#000000', 0.35);
    const vline = (x, col, w) => { g.fillStyle = col; g.fillRect(x - w / 2, 0, w, H); };
    if (st === 'tee' && c2) { g.fillStyle = c2; g.beginPath(); g.arc(F, yOf(19), 22, 0, TAU); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(F, yOf(19), 11, 0, TAU); g.fill(); }
    if (st === 'tank') {                    // bare shoulders: skin above the neckline but for the straps
      g.fillStyle = SKIN; g.fillRect(0, 0, W, yOf(21.6)); g.beginPath(); g.ellipse(F, yOf(22.4), 36, yOf(19.8) - yOf(22.4), 0, 0, TAU); g.fill();
      g.fillStyle = c1; for (const x of [F - 46, F + 46, 46, W - 46]) g.fillRect(x - 9, 0, 18, yOf(21.4));
      if (c2) { g.fillStyle = c2; g.fillRect(0, H - 10, W, 10); }
    }
    if (st === 'shirt' || st === 'check' || st === 'hawaii') {   // the button placket, a pocket
      vline(F, st === 'shirt' ? (c2 || dark) : hdMix(c1, '#000000', 0.15), 7);
      g.strokeStyle = dark; g.lineWidth = 2; g.strokeRect(F + 22, yOf(20.6), 22, 22);
    }
    if (st === 'hoodie') {                  // the kangaroo pocket, a ribbed hem
      g.fillStyle = hdMix(c1, '#000000', 0.2); g.beginPath(); g.moveTo(F - 40, H - 14); g.lineTo(F - 30, yOf(17.6)); g.lineTo(F + 30, yOf(17.6)); g.lineTo(F + 40, H - 14); g.closePath(); g.fill();
      g.fillStyle = dark; for (let x = 0; x < W; x += 5) g.fillRect(x, H - 12, 2, 12);
      if (c2) { g.fillStyle = c2; g.fillRect(F - 30, yOf(20), 60, 12); }
    }
    if (st === 'jacket' || st === 'suit' || st === 'leather') {
      const inner = st === 'suit' ? '#f4efe6' : st === 'jacket' ? (c2 || '#f4efe6') : '#2a2a30';
      if (st === 'leather') {               // the biker's diagonal zip and a belt at the hem
        g.fillStyle = '#14141a'; g.beginPath(); g.moveTo(F - 16, 0); g.lineTo(F + 6, 0); g.lineTo(F + 30, H); g.lineTo(F + 8, H); g.fill();
        g.strokeStyle = c2 || '#c0c0c8'; g.lineWidth = 3; g.beginPath(); g.moveTo(F - 4, 0); g.lineTo(F + 20, H); g.stroke();
        g.fillStyle = '#0c0c10'; g.fillRect(0, H - 14, W, 10); g.fillStyle = c2 || '#c0c0c8'; g.fillRect(F + 30, H - 15, 10, 12);
      } else {                              // open front: the shirt beneath, lapels; the suit's tie
        g.fillStyle = inner; g.beginPath(); g.moveTo(F - 26, 0); g.lineTo(F + 26, 0); g.lineTo(F + (st === 'suit' ? 4 : 18), H); g.lineTo(F - (st === 'suit' ? 4 : 18), H); g.fill();
        g.fillStyle = dark; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(F + s * 26, 0); g.lineTo(F + s * 40, yOf(20.6)); g.lineTo(F + s * 8, yOf(18)); g.closePath(); g.fill(); }
        if (st === 'suit') { g.fillStyle = c2 || '#b3122a'; g.beginPath(); g.moveTo(F - 5, yOf(22.4)); g.lineTo(F + 5, yOf(22.4)); g.lineTo(F + 8, yOf(17.4)); g.lineTo(F, yOf(16.4)); g.lineTo(F - 8, yOf(17.4)); g.fill();
          g.fillStyle = '#ffffff'; g.fillRect(F + 44, yOf(20.4), 14, 6); }   // a pocket square
        else { g.fillStyle = '#c8ccd4'; g.fillRect(F - 21, 0, 3, H); g.fillRect(F + 18, 0, 3, H); }   // the zip's two sides
      }
    }
    if (st === 'hivis') { g.fillStyle = c2 || '#d8dde6'; for (const y of [17, 19.2]) g.fillRect(0, yOf(y) - 7, W, 14); for (const x of [F - 40, F + 40, 40, W - 40]) g.fillRect(x - 7, 0, 14, yOf(19.2)); }
    if (st === 'jersey') {                  // stripes down the sides, a V-neck, the number on the back
      g.fillStyle = c2 || '#ffffff'; for (const x of [W / 4, 3 * W / 4]) g.fillRect(x - 9, 0, 18, H);
      g.beginPath(); g.moveTo(F - 22, 0); g.lineTo(F, yOf(21.2)); g.lineTo(F + 22, 0); g.lineWidth = 6; g.strokeStyle = c2 || '#ffffff'; g.stroke();
      g.font = 'bold 74px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const x of [0, W]) g.fillText('10', x, yOf(19)); g.font = 'bold 26px "Arial Black",Impact,sans-serif'; g.fillText('10', F + 26, yOf(20.4));
    }
  });
}
function hdLegTex(bs, b1, b2, side) {      // a leg: u 0 the front, 0.25 its +x side, 0.75 its -x side; side: which way is out
  return hdTex((g, W, H) => {
    hdPattern(g, W, H, bs === 'jeans' ? 'jeans' : 'plain', b1, b2);
    const out = side > 0 ? W / 4 : 3 * W / 4, dark = hdMix(b1, '#000000', 0.35);
    if (bs === 'jeans') { g.strokeStyle = '#d8a35a'; g.globalAlpha = 0.7; g.lineWidth = 2; for (const x of [out - 4, out + 4]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } g.globalAlpha = 1;
      if (b2) { g.fillStyle = '#e8dcc8'; g.fillRect(4, H * 0.42, 24, 18); g.fillRect(W - 28, H * 0.42, 24, 18); g.fillStyle = SKIN; g.fillRect(8, H * 0.45, 16, 10); g.fillRect(W - 24, H * 0.45, 16, 10); } }   // ripped knees
    else if (bs === 'trousers') { g.fillStyle = dark; g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H); }   // the crease down the front
    else if (bs === 'track') { g.fillStyle = b2 || '#ffffff'; g.fillRect(out - 12, 0, 6, H); g.fillRect(out + 6, 0, 6, H); }
    else if (bs === 'cargo') { g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(out, 0); g.lineTo(out, H); g.stroke(); }
    else if (bs === 'shorts' && b2) { g.fillStyle = b2; g.fillRect(out - 6, 0, 12, H); }
  });
}

/* ---------- the body ---------- */
function buildFigureHD(outfit) {
  const pc = s => outfit && outfit[s] ? CLOTH[outfit[s]] : null, top = pc('top'), bot = pc('bottoms'), shoe = pc('shoes'), hat = pc('hat'), gl = pc('glasses');
  const st = top ? top.style : 'tee', c1 = top ? top.c1 : '#ffd23f', c2 = top && top.c2;
  const bs = bot ? bot.style : 'jeans', b1 = bot ? bot.c1 : '#2a2d3a', b2 = bot && bot.c2;
  const g = new THREE.Group(), skin = hdM(SKIN, { roughness: 0.65 }), fig = { g, arms: [], legs: [], torso: null };
  const topM = hdM('#ffffff', { map: hdTopTex(st, c1, c2) }), sleeveM = st === 'hivis' ? hdM('#3a3f4a') : hdM('#ffffff', { map: hdTex((x, W, H) => hdPattern(x, W, H, st, c1, c2)) });
  const sleeve = { tank: 'none', tee: 'short', hawaii: 'short', jersey: 'short' }[st] || 'long';
  // torso, hips, neck
  fig.torso = hdAdd(g, hdLathe(HD_TORSO, 14), topM);
  const shortsTop = bs === 'shorts', hipM = hdM('#ffffff', { map: hdLegTex(bs, b1, b2, 1) });
  hdAdd(g, hdLathe(HD_HIPS, 8), hipM);
  hdAdd(g, hdCyl(1.05, 1.15, 1.9), skin, 0, 23.6, 0.1);
  // the head: a face toward +z
  const head = new THREE.Group(); head.position.set(0, 26.2, 0.15); g.add(head); fig.head = head;
  hdAdd(head, hdSph(2.55), skin, 0, 0, 0, 0.93, 1.08, 1);
  hdAdd(head, hdSph(1.7), skin, 0, -1.25, 0.65, 1, 0.75, 1);                                    // the jaw and chin
  for (const s of [-1, 1]) {
    hdAdd(head, hdSph(0.42, 12, 10), hdM('#ffffff', { roughness: 0.4 }), s * 0.85, 0.2, 2.18, 1, 0.85, 0.55);   // eyes
    hdAdd(head, hdSph(0.24, 10, 8), hdM(HDF.eye, { roughness: 0.3 }), s * 0.85, 0.2, 2.42, 1, 1, 0.5);
    const br = hdAdd(head, new THREE.BoxGeometry(0.95, 0.2, 0.25), hdM(HDF.brow), s * 0.9, 0.92, 2.25); br.rotation.z = s * -0.12;
    hdAdd(head, hdSph(0.55, 12, 10), skin, s * 2.35, -0.1, -0.1, 0.45, 1, 0.75);                   // ears
  }
  hdAdd(head, hdSph(0.36, 12, 10), hdM(hdMix(SKIN, '#c87a5a', 0.25), { roughness: 0.6 }), 0, -0.45, 2.55, 0.85, 1.05, 1);   // the nose
  hdAdd(head, new THREE.BoxGeometry(1.05, 0.2, 0.2), hdM(HDF.lip), 0, -1.35, 2.25);              // the mouth
  const hairM = hdM(HDF.hair, { roughness: 0.9 });
  hdAdd(head, new THREE.SphereGeometry(2.7, HDF.seg, 14, 0, TAU, 0, Math.PI * 0.36), hairM, 0, 0.12, -0.15, 0.96, 1.12, 1.04);   // hair: the crown, above the brow
  hdAdd(head, new THREE.SphereGeometry(2.66, HDF.seg, 14, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.42), hairM, 0, 0, -0.05, 0.98, 1.1, 1.05);   // and down the back, behind the ears (phi 1.5 pi is the back)
  const fr = hdAdd(head, new THREE.BoxGeometry(3.6, 0.55, 1.1), hairM, 0.3, 1.95, 1.85); fr.rotation.set(0.55, 0, -0.12);   // a fringe swept to the side
  // arms: from the shoulders, a little out from the body, elbows a little bent
  const armM = sleeve === 'long' ? sleeveM : skin;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 4.35, 21.55, 0); sh.rotation.z = s * 0.11; g.add(sh); fig.arms.push(sh);
    hdAdd(sh, hdSph(1.38), sleeve === 'none' ? skin : sleeveM, 0, 0, 0, 1, 1, 0.95);
    hdAdd(sh, hdCyl(1.22, 1.02, 4.8), armM, 0, -2.4, 0);
    if (sleeve === 'short') { hdAdd(sh, hdCyl(1.42, 1.32, 2.6), sleeveM, 0, -1.2, 0); if (st === 'jersey') hdAdd(sh, hdCyl(1.34, 1.34, 0.35), hdM(c2 || '#ffffff'), 0, -2.45, 0); }
    const el = new THREE.Group(); el.position.set(0, -4.8, 0); el.rotation.x = -0.18; sh.add(el);
    hdAdd(el, hdSph(1.03), armM);
    hdAdd(el, hdCyl(1.0, 0.82, 4.3), armM, 0, -2.15, 0);
    if (sleeve === 'long') hdAdd(el, hdCyl(0.9, 0.9, 0.6), st === 'suit' ? hdM('#f4efe6') : st === 'hoodie' ? hdM(hdMix(c1, '#000000', 0.25)) : sleeveM, 0, -4.05, 0);   // the cuff
    const hand = hdAdd(el, hdSph(0.95), skin, 0, -4.95, 0.05, 0.62, 1.05, 0.95);
    hdAdd(el, hdSph(0.38, 10, 8), skin, -s * 0.15, -4.55, 0.75, 0.7, 1.3, 0.7);                   // the thumb
    fig.hands = (fig.hands || []).concat(hand);
  }
  // legs from the hips
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(s * 1.72, 13.4, 0); g.add(hp); fig.legs.push(hp);
    const legM = hdM('#ffffff', { map: hdLegTex(bs, b1, b2, s) }), lower = shortsTop ? skin : legM;
    hdAdd(hp, hdCyl(1.62, 1.22, 6.1), shortsTop ? skin : legM, 0, -3.05, 0);
    if (shortsTop) hdAdd(hp, hdCyl(1.8, 1.55, 4.2), legM, 0, -2.0, 0);
    hdAdd(hp, hdSph(1.2), lower, 0, -6.1, 0.05);
    hdAdd(hp, hdCyl(1.18, 0.85, 5.6), lower, 0, -8.9, 0);
    if (bs === 'cargo') hdAdd(hp, new THREE.BoxGeometry(0.7, 2.2, 1.8), hdM(b2 || hdMix(b1, '#000000', 0.2)), s * 1.5, -3.8, 0);   // the side pocket
    if (bs === 'track') hdAdd(hp, hdCyl(0.95, 0.95, 0.6), hdM(hdMix(b1, '#000000', 0.25)), 0, -11.4, 0);           // elastic cuffs
    hdShoe(hp, shoe, s);
  }
  // collars, buttons, a hood, a belt
  const yN = 22.65, collarC = st === 'suit' || st === 'jacket' ? c1 : st === 'hivis' ? '#3a3f4a' : st === 'tank' ? null : c1;
  if (collarC) { const t = hdAdd(g, new THREE.TorusGeometry(1.32, st === 'tee' || st === 'jersey' || st === 'hoodie' ? 0.22 : 0.36, 10, 24), hdM(hdMix(collarC, '#000000', 0.12)), 0, yN, 0.12); t.rotation.x = Math.PI / 2 - 0.15; }
  if (['shirt', 'check', 'hawaii', 'suit', 'leather'].includes(st)) for (const s of [-1, 1]) {   // collar points
    const p = hdAdd(g, new THREE.BoxGeometry(1.4, 0.25, 1.3), hdM(st === 'suit' ? '#f4efe6' : hdMix(c1, '#000000', 0.1)), s * 0.9, yN - 0.3, 1.25); p.rotation.set(0.5, s * 0.55, s * 0.4);
  }
  if (['shirt', 'check', 'hawaii'].includes(st)) for (let y = 21.4; y > 15.6; y -= 1.3) hdAdd(g, hdSph(0.17, 8, 6), hdM('#f4f4f4', { roughness: 0.3 }), 0, y, hdFrontZ(HD_TORSO, y) + 0.08, 1, 1, 0.5);
  if (st === 'suit') for (const y of [16.6, 17.8]) hdAdd(g, hdSph(0.2, 8, 6), hdM('#14141a', { roughness: 0.3 }), 0.25, y, hdFrontZ(HD_TORSO, y) + 0.1, 1, 1, 0.5);
  if (st === 'hoodie') {
    hdAdd(g, hdSph(2.3), hdM(c1), 0, 22.7, -1.9, 1.15, 0.7, 0.8);                                 // the hood, down on the back
    for (const s of [-1, 1]) hdAdd(g, hdCyl(0.09, 0.09, 2.4, 6), hdM(c2 || '#f4f4f4'), s * 0.55, 21.1, hdFrontZ(HD_TORSO, 21.1) + 0.15);
  }
  if (bs !== 'track' && bs !== 'shorts') {   // a belt and its buckle
    const bt = hdAdd(g, new THREE.TorusGeometry(3.12, 0.34, 8, 32), hdM(bs === 'jeans' ? '#5a3a22' : '#16161a', { roughness: 0.5 }), 0, 15.15, 0); bt.rotation.x = Math.PI / 2; bt.scale.set(HD_SX, HD_SZ, 1);
    hdAdd(g, new THREE.BoxGeometry(1.1, 0.8, 0.25), hdM('#d8c070', { metalness: 0.8, roughness: 0.3 }), 0, 15.15, 3.08 * HD_SZ + 0.3);
  } else hdAdd(g, hdCyl(3.1 * HD_SX, 3.1 * HD_SX, 0.6, 32), hdM(hdMix(b1, '#000000', 0.2)), 0, 15.15, 0, 1, 1, HD_SZ / HD_SX);   // a waistband
  if (hat) hdHat(head, hat);
  if (gl) hdGlasses(head, gl);
  return fig;
}
function hdShoe(hp, shoe, s) {             // the foot under the shin, toes toward +z; the sole at y 0 (hip 13.4 above)
  const ss = shoe ? shoe.style : 'sneakers', s1 = shoe ? shoe.c1 : '#e8e8ee', s2 = shoe && shoe.c2, y = -13.4, M1 = hdM(s1, { roughness: ss === 'loafers' ? 0.35 : 0.7 }), M2 = hdM(s2 || (ss === 'sneakers' ? '#f4f4f4' : '#1a1a1a'));
  const f = new THREE.Group(); f.position.set(0, y, 0.6); hp.add(f);
  if (ss === 'sandals') {
    hdAdd(f, new THREE.BoxGeometry(2.1, 0.45, 4.4), M1, 0, 0.22, 0.2);
    hdAdd(f, hdSph(1.0), hdM(SKIN, { roughness: 0.65 }), 0, 0.85, 0.3, 0.95, 0.55, 1.9);           // the bare foot
    for (const z of [-0.6, 0.9]) hdAdd(f, new THREE.BoxGeometry(2.2, 0.35, 0.5), M2, 0, 1.15, z);
    return;
  }
  const low = ss === 'loafers' || ss === 'sneakers';
  hdAdd(f, new THREE.BoxGeometry(2.25, ss === 'sneakers' ? 0.7 : 0.45, 4.6), M2, 0, ss === 'sneakers' ? 0.35 : 0.22, 0.25);   // the sole
  hdAdd(f, hdSph(1.15), M1, 0, 1.0, 1.2, 0.98, 0.72, ss === 'cowboy' ? 1.6 : 1.25);                   // the toe
  hdAdd(f, new THREE.BoxGeometry(2.15, 1.5, 2.6), M1, 0, 1.15, -0.55);                                // the heel end
  if (ss === 'sneakers') { for (let k = 0; k < 3; k++) hdAdd(f, new THREE.BoxGeometry(1.2, 0.15, 0.25), M2, 0, 1.85, 0.3 + k * 0.45); hdAdd(f, new THREE.BoxGeometry(0.1, 0.5, 2.0), M2, s * 1.1, 1.0, 0.2); }
  if (ss === 'loafers') hdAdd(f, new THREE.BoxGeometry(1.5, 0.2, 0.5), M2, 0, 1.75, 0.9);
  if (!low) {                               // boots: the shaft up the shin
    const H = ss === 'cowboy' ? 5.4 : 4.4; hdAdd(f, hdCyl(1.05, 1.15, H), M1, 0, 1.2 + H / 2, -0.55);
    if (ss === 'cowboy') { hdAdd(f, new THREE.BoxGeometry(1.4, 1.0, 1.0), M2, 0, 0.5, -1.4); for (let k = 0; k < 3; k++) hdAdd(f, new THREE.BoxGeometry(0.12, 2.2, 0.1), M2, (k - 1) * 0.45, 3.4, 0.55); }   // the heel, stitching
    else { hdAdd(f, new THREE.BoxGeometry(2.3, 0.8, 4.7), M2, 0, 0.4, 0.25); for (let k = 0; k < 4; k++) hdAdd(f, new THREE.BoxGeometry(1.0, 0.14, 0.2), M2, 0, 2.0 + k * 0.7, 0.55); }
  }
}
function hdHat(head, hat) {                // on the head (its centre; the crown about 2.9 above)
  const h1 = hdM(hat.c1), h2 = hdM(hat.c2 || hat.c1), hs = hat.style, D = (r, h) => hdCyl(r, r, h, 28);
  if (hs === 'cap') { hdAdd(head, new THREE.SphereGeometry(2.85, 24, 12, 0, TAU, 0, Math.PI / 2), h1, 0, 0.55, -0.05, 1, 0.95, 1.05); const b = hdAdd(head, D(2.1, 0.22), h2, 0, 0.75, 2.85, 1, 1, 1.15); b.rotation.x = 0.12; }
  else if (hs === 'peaked') { hdAdd(head, hdCyl(3.2, 2.75, 1.4, 28), h1, 0, 2.0, 0); hdAdd(head, D(2.8, 0.85), h2, 0, 1.05, 0); const b = hdAdd(head, D(1.9, 0.2), h2, 0, 0.75, 2.6, 1, 1, 1.1); b.rotation.x = 0.28; }   // a peaked cap: the flat crown, the band, the visor
  else if (hs === 'beanie') { hdAdd(head, new THREE.SphereGeometry(2.9, 24, 12, 0, TAU, 0, Math.PI / 2), h1, 0, 0.5, -0.05, 1, 1.2, 1.05); hdAdd(head, D(2.95, 1.1), h2, 0, 0.75, -0.05, 1, 1, 1.05); }
  else if (hs === 'bucket') { hdAdd(head, hdCyl(2.3, 2.85, 2.2, 28), h1, 0, 2.0, 0); hdAdd(head, hdCyl(2.9, 4.1, 0.5, 28), h1, 0, 0.75, 0); hdAdd(head, D(2.75, 0.55), h2, 0, 1.25, 0); }
  else if (hs === 'fedora' || hs === 'cowboy') {
    const cw = hs === 'cowboy'; hdAdd(head, hdCyl(2.35, 2.6, 2.7, 28), h1, 0, 2.2, 0); hdAdd(head, D(2.66, 0.75), h2, 0, 1.2, 0);
    const br = hdAdd(head, D(cw ? 5.2 : 4.3, 0.28), h1, 0, 0.8, 0, cw ? 1.15 : 1, 1, 1);
    if (cw) for (const s of [-1, 1]) { const w = hdAdd(head, new THREE.BoxGeometry(2.0, 0.28, 8.4), h1, s * 5.4, 1.35, 0); w.rotation.z = s * 0.7; }
    else br.rotation.x = 0.06;
  }
  else if (hs === 'hardhat') { hdAdd(head, new THREE.SphereGeometry(3.0, 24, 12, 0, TAU, 0, Math.PI / 2), h1, 0, 0.6, 0); hdAdd(head, D(3.55, 0.3), h1, 0, 0.62, 0.25); hdAdd(head, new THREE.BoxGeometry(0.7, 0.6, 5.6), hdM(hat.c2 || '#ffffff'), 0, 3.4, 0); }
  else if (hs === 'beret') { const b = hdAdd(head, hdSph(3.1), h1, 0.5, 1.9, -0.2, 1, 0.42, 1); b.rotation.z = -0.25; hdAdd(head, hdCyl(0.15, 0.2, 0.6, 8), h2, 0.6, 3.25, -0.2); }
  else if (hs === 'bandana') { hdAdd(head, D(2.72, 1.3), h1, 0, 1.0, -0.05, 1, 1, 1.05); hdAdd(head, hdSph(0.6), h2, 0, 1.0, -2.8); for (const s of [-1, 1]) { const t = hdAdd(head, new THREE.BoxGeometry(0.6, 1.6, 0.2), h1, s * 0.4, 0.1, -2.95); t.rotation.z = s * 0.4; } }
  else if (hs === 'headband') hdAdd(head, D(2.62, 0.7), h1, 0, 1.3, -0.05, 1, 1, 1.05);
  else if (hs === 'aviator') {                                       // a leather flying helmet: shell, fleece rim, ear flaps with a strap, goggles pushed up on the forehead
    const lea = hdM(hat.c1, { roughness: 0.55 }); hdAdd(head, new THREE.SphereGeometry(2.98, 24, 12, 0, TAU, 0, Math.PI / 2), lea, 0, 0.35, -0.15, 1.02, 1.05, 1.08);
    hdAdd(head, D(3.02, 0.5), hdM('#f2e6c9', { roughness: 0.95 }), 0, 0.45, -0.1, 1, 1, 1.06);
    for (const s of [-1, 1]) { hdAdd(head, new THREE.BoxGeometry(0.45, 2.6, 2.0), lea, s * 2.9, -0.9, -0.25); hdAdd(head, new THREE.BoxGeometry(0.2, 1.8, 0.35), hdM('#2a1a10'), s * 2.7, -2.4, 0.6); }
    hdAdd(head, D(3.07, 0.42), hdM('#2a1a10'), 0, 1.45, -0.05, 1, 1, 1.07);
    for (const s of [-1, 1]) { const r = hdAdd(head, hdCyl(0.78, 0.78, 0.5, 18), hdM('#c8ccd4', { roughness: 0.3, metalness: 0.7 }), s * 0.98, 1.55, 2.75); r.rotation.x = Math.PI / 2;
      const l = hdAdd(head, hdCyl(0.62, 0.62, 0.56, 18), h2, s * 0.98, 1.55, 2.8); l.rotation.x = Math.PI / 2; }
  }
}
function hdGlasses(head, gl) {             // over the eyes (y 0.2, z 2.2 on the head)
  const g1 = hdM(gl.c1, { roughness: 0.25, metalness: 0.3 }), g2 = hdM(gl.c2 || gl.c1, { roughness: 0.3, metalness: 0.6 }), gs = gl.style;
  const temples = M => { for (const s of [-1, 1]) hdAdd(head, new THREE.BoxGeometry(0.15, 0.15, 2.6), M, s * 2.15, 0.35, 1.2); };
  if (gs === 'shades') { for (const s of [-1, 1]) hdAdd(head, new THREE.BoxGeometry(1.55, 0.95, 0.2), g1, s * 0.9, 0.2, 2.62); hdAdd(head, new THREE.BoxGeometry(4.2, 0.25, 0.25), g2, 0, 0.7, 2.6); temples(g2); }
  else if (gs === 'aviators') { for (const s of [-1, 1]) hdAdd(head, hdSph(0.8, 16, 10), g1, s * 0.92, 0.05, 2.62, 1, 1.05, 0.2); hdAdd(head, new THREE.BoxGeometry(2.4, 0.12, 0.15), g2, 0, 0.75, 2.65); temples(g2); }
  else if (gs === 'round') { for (const s of [-1, 1]) { hdAdd(head, new THREE.TorusGeometry(0.62, 0.1, 6, 20), g2, s * 0.9, 0.2, 2.62); hdAdd(head, new THREE.CircleGeometry(0.6, 20), hdM(gl.c1, { transparent: true, opacity: 0.6, roughness: 0.1 }), s * 0.9, 0.2, 2.6); } hdAdd(head, new THREE.BoxGeometry(0.6, 0.1, 0.12), g2, 0, 0.3, 2.66); temples(g2); }
  else if (gs === 'visor') { const v = hdAdd(head, new THREE.CylinderGeometry(2.75, 2.75, 1.1, 24, 1, true, -1.1, 2.2), new THREE.MeshBasicMaterial({ color: gl.c1, side: THREE.DoubleSide }), 0, 0.3, 0.1); v.scale.set(0.98, 1, 1.02); }
}
