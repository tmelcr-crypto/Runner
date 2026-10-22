'use strict';
/* ---------- 10za. CRANE FOR MAYOR: Victor Crane's campaign in the city (mode craneAds: STORY and MISSIONS TEST) ----------
   Billboards on the roofs of street-front buildings along the long roads - the first on the road out of the airport - each a lit
   board on two legs, turned to the camera: Crane's smiling portrait (img/chars/crane-smile.png) beside VICTOR CRANE FOR MAYOR.
   Big posters with his face pasted over two floors of street-front buildings round the city (the shops are too low). Built once, shown only in the modes that have them. */
let adGroup = null;
const AD = { boards: 10, posters: 46, boardGap: 1500, posterGap: 380 };
let _adTex = {};

function adTexture(kind) {                // the board (512 x 256) or the poster (128 x 192), redrawn when the portrait has loaded
  if (_adTex[kind]) return _adTex[kind];
  const W = kind === 'board' ? 512 : 128, H = kind === 'board' ? 256 : 192, c = document.createElement('canvas'); c.width = W; c.height = H;
  const tex = finishTex(c), img = new Image();
  const paint = () => {
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1a3a7a'); sky.addColorStop(1, '#0c1a40'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8b04a'; g.fillRect(0, 0, W, kind === 'board' ? 10 : 6); g.fillRect(0, H - (kind === 'board' ? 10 : 6), W, kind === 'board' ? 10 : 6);
    const font = (s, w) => w + ' ' + s + 'px "Arial Black",Impact,sans-serif';
    if (kind === 'board') {
      if (img.complete && img.naturalWidth) { const w = 212 * img.naturalWidth / img.naturalHeight; g.drawImage(img, 18 + (212 - w) / 2, 22, w, 212); }   // the tall portrait (40 x 64), its own shape
      g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = font(54, 'bold'); g.fillText('VICTOR', 372, 82); g.fillText('CRANE', 372, 140);
      g.fillStyle = '#d8b04a'; g.font = font(40, 'bold'); g.fillText('FOR MAYOR', 372, 192);
      g.fillStyle = '#9fc4ff'; g.font = font(18, 'bold'); g.fillText('BUILDING TOMORROW, TODAY', 372, 228);
    } else {
      if (img.complete && img.naturalWidth) { const w = 110 * img.naturalWidth / img.naturalHeight; g.drawImage(img, 64 - w / 2, 6, w, 110); }
      g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = font(30, 'bold'); g.fillText('CRANE', 64, 140);
      g.fillStyle = '#d8b04a'; g.font = font(17, 'bold'); g.fillText('FOR MAYOR', 64, 166);
      g.fillStyle = '#c03040'; g.fillRect(0, 176, W, 10);
    }
    tex.needsUpdate = true;
  };
  img.onload = paint; img.src = 'img/chars/crane-smile.png'; paint();
  return (_adTex[kind] = tex);
}

function adFront(r) {                     // the side of a street-front building that faces its street, and the street's length
  let best = null;
  for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const hx = u * r.lw / 2, hz = v * r.lh / 2, fx = r.ca * u - r.sa * v, fy = r.sa * u + r.ca * v;
    const x = r.cx + r.ca * hx - r.sa * hz, y = r.cy + r.sa * hx + r.ca * hz, rd = nearestRoad(x + fx * 12, y + fy * 12, ROAD_HALF + SW_W + 30);
    if (!rd || RE[rd.e].nt) continue;
    if (!best || rd.d < best.d) best = { x, y, fx, fy, d: rd.d, len: RE[rd.e].len, side: u ? r.lh : r.lw };
  }
  return best;
}

function placeAds() {                     // a new game (js/15): built the first time, then shown or hidden by the mode
  if (adGroup) { adGroup.visible = feat('craneAds'); return; }
  if (!feat('craneAds')) return;
  adGroup = new THREE.Group(); scene.add(adGroup);
  withSeed(19970, () => {
    const cand = BLD.filter(r => r.fill && r.shop && !r.uniq && !r.special && !r.safe && !r.ix && !r.own && r.H < 130 && !inLandmark(r.cx, r.cy));
    const fronts = cand.map(r => ({ r, f: adFront(r), k: Math.random() })).filter(o => o.f);
    // billboards: the first by the airport's way into the city, then on long roads, well apart
    const boards = [], gate = MAP.airport && MAP.airport.gates && MAP.airport.gates[0];
    const g0 = gate ? { x: gate[0] !== undefined ? gate[0] : gate.x, y: gate[1] !== undefined ? gate[1] : gate.y } : null;
    const roof = fronts.filter(o => o.f.len > 500 && Math.min(o.r.lw, o.r.lh) >= 40);
    if (g0 && isFinite(g0.x)) {
      let b = null, bd = 1e9;
      for (const o of roof) { const d = dist(o.r.cx, o.r.cy, g0.x, g0.y); if (d > 260 && d < bd && districtAt(o.r.cx, o.r.cy) !== 'SKYPORT') { bd = d; b = o; } }
      if (b) boards.push(b);
    }
    roof.sort((a, b) => b.f.len - a.f.len || a.k - b.k);
    for (const o of roof) {
      if (boards.length >= AD.boards) break;
      if (boards.every(q => dist(q.r.cx, q.r.cy, o.r.cx, o.r.cy) > AD.boardGap)) boards.push(o);
    }
    const tex = adTexture('board'), face = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), steel = mc('#3a3f52');
    const tilt = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180);
    AD.at = [];
    for (const o of boards) {
      const r = o.r, x = r.cx + o.f.fx * Math.min(r.lw, r.lh) * 0.12, y = r.cy + o.f.fy * Math.min(r.lw, r.lh) * 0.12, h = r.H + groundH(r.cx, r.cy);
      const g = new THREE.Group(); g.position.set(x, h, y);
      for (const s of [-24, 24]) part(g, GB, steel, 2, 26, 2, s, 13, 0);                       // the legs on the roof
      part(g, GB, steel, 70, 2, 3, 0, 24, 0);                                                     // the catwalk
      const b = new THREE.Mesh(new THREE.PlaneGeometry(72, 36), face); b.position.set(0, 44, 0); b.rotation.x = tilt; g.add(b);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(74, 38), mBas(0x0c1020)); back.position.set(0, 44, -0.6); back.rotation.x = tilt; g.add(back);
      for (const s of [-30, 0, 30]) part(g, GB, mBas(0xfff0c0), 3, 1.2, 3, s, 64, 6);           // the lamps over the board
      adGroup.add(g); AD.at.push({ x, y });
    }
    // posters: on shop fronts that the camera sees (facing south-ish), spread over the city
    const pTex = adTexture('poster'), pMat = new THREE.MeshBasicMaterial({ map: pTex }), posters = [];
    const tall = BLD.filter(r => !r.uniq && !r.special && !r.safe && !r.ix && !r.own && !r.off && r.H >= GFH + 28 && !inLandmark(r.cx, r.cy))
      .map(r => ({ r, f: adFront(r), k: Math.random() })).filter(o => o.f);
    for (const o of tall.sort((a, b) => a.k - b.k)) {
      if (posters.length >= AD.posters) break;
      if (o.f.fy < 0.3 || o.f.side < 36 || boards.includes(o)) continue;                    // a front the camera sees
      if (posters.some(q => dist(q.x, q.y, o.f.x, o.f.y) < AD.posterGap)) continue;
      const off = (o.k - 0.5) * (o.f.side - 30), tx = -o.f.fy, ty = o.f.fx;                    // somewhere along the front
      const x = o.f.x + o.f.fx * 1.2 + tx * off, y = o.f.y + o.f.fy * 1.2 + ty * off;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(17, 25.5), pMat);                          // big, pasted over two floors: the camera sees walls at a slant
      m.position.set(x, groundH(x, y) + GFH + 14.5, y); m.rotation.y = Math.atan2(o.f.fx, o.f.fy);   // above the awnings
      adGroup.add(m); posters.push({ x, y });
    }
    AD.posterAt = posters;
  });
  adGroup.visible = feat('craneAds');
}
