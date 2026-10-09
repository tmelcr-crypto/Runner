'use strict';
/* ---------- 7a5. HOSPITALS & POLICE STATIONS ----------
   Four of each, picked by tools/build_city.py and spread over the city (MAP.services, SVC in js/04). The building itself is a normal
   street building restyled (white for a hospital, blue for a police station); this adds what makes it recognisable from above and
   from the street:
   hospital - a big red cross on a white roof pad, a red cross and a HOSPITAL sign over the entrance, an entrance canopy;
   police station - POLICE written large on the roof, a POLICE sign and two blue lamps at the door, a blue and white checkered band,
   a flag. Its parking lot holds the patrol cars (js/08). Wasted, you start again at a hospital door; busted, at a police station's. */
const SV_RED = mBas(0xe0364f), SV_BLUE = mBas(0x3f6bff);
function serviceDecor() {
  for (const k of ['hospital', 'police']) for (const s of SVC[k]) {
    const r = s.r; LMS.push({ cx: r.cx, cy: r.cy, a: r.a, rad: Math.hypot(r.lw, r.lh) / 2 + 30, make: () => makeServiceDecor(r, k), mesh: null });
  }
}
function makeServiceDecor(r, k) {               // in the building's own frame: x along its width, +z out of its front
  const g = new THREE.Group(), own = [], W = r.lw, D = r.lh, H = r.H + SIDE_H, fz = D / 2;   // H: the roof deck (js/10c)
  const add = (o, mat) => { g.add(o); if (mat) own.push(mat); return o; };
  const sign = (text, col, w, h, x, y, z, flat) => { const m = signMesh(text, col, w, h); m.position.set(x, y, z); if (flat) m.rotation.x = -Math.PI / 2; return add(m, m.material); };
  if (k === 'hospital') {
    const red = SV_RED, S = Math.min(W, D) * 0.62;
    part(g, GB, mc(0xf7f7fa), S * 1.2, 1, S * 1.2, 0, H + 0.5, 0);                     // the roof pad
    part(g, GB, red, S, 1.6, S * 0.3, 0, H + 1.6, 0); part(g, GB, red, S * 0.3, 1.6, S, 0, H + 1.6, 0);   // the big red cross
    const cs = Math.min(18, W * 0.2);                                                    // a red cross over the door
    part(g, GB, red, cs, cs * 0.32, 1, -W * 0.28, H * 0.62, fz + 0.8); part(g, GB, red, cs * 0.32, cs, 1, -W * 0.28, H * 0.62, fz + 0.8);
    sign('HOSPITAL', '#ff4d5e', Math.min(W * 0.55, 110), 16, W * 0.12, H - 9, fz + 1);
    part(g, GB, mc(0xf1f1ee), Math.min(40, W * 0.4), 2, 16, W * 0.12, 13, fz + 8);      // the entrance canopy on two posts
    for (const s of [-1, 1]) part(g, GB, mc(0xb8bcc8), 1.4, 12, 1.4, W * 0.12 + s * Math.min(18, W * 0.18), 6, fz + 15);
    const pool = add(new THREE.Mesh(GP, glowMat('#ff4d5e', 0.5, true))); pool.scale.set(90, 1, 50); pool.position.set(0, 1.5, fz + 26);
  } else {
    const blue = SV_BLUE, white = mc(0xf1f1ee), navy = mc(0x1d2a5a);
    sign('POLICE', '#7fa2ff', Math.min(W * 0.8, 120), Math.min(D * 0.3, 28), 0, H + 1.2, 0, true);   // written on the roof, for the camera
    sign('POLICE', '#7fa2ff', Math.min(W * 0.5, 90), 15, 0, H - 9, fz + 1);
    const n = Math.max(4, Math.floor(W / 8));                                            // the checkered band along the front
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) part(g, GB, (i + j) % 2 ? white : navy, W / n, 4, 0.8, -W / 2 + (i + 0.5) * W / n, 16 + j * 4, fz + 0.6);
    for (const s of [-1, 1]) {                                                           // the blue lamps either side of the door
      part(g, GB, mc(0x2b2e38), 1.4, 14, 1.4, s * 14, 7, fz + 6); part(g, GB, blue, 4, 4, 4, s * 14, 16, fz + 6);
    }
    const pool = add(new THREE.Mesh(GP, glowMat('#3f6bff', 0.55, true))); pool.scale.set(80, 1, 44); pool.position.set(0, 1.5, fz + 20);
    part(g, GB, mc(0xb8bcc8), 1, 46, 1, W / 2 - 6, 23, fz + 10);                          // the flag
    part(g, GB, blue, 12, 7, 0.4, W / 2 - 12, 42, fz + 10);
  }
  g.userData.own = own; return g;
}
