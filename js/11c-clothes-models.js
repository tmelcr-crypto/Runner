'use strict';
/* ---------- 9c. CLOTHES ON THE FIGURE ----------
   What you wear (js/01n): five pieces drawn on the blocky figure of js/11 buildPerson. The top colours the body and the arms (short
   sleeves: a sleeve over a bare arm), with its print, flowers, checks, hood, open front, tie, zip, reflective bands or camouflage; the
   bottoms colour the legs (shorts: bare knees), with stripes, pockets or rips; shoes at the feet; a hat and glasses on the head.
   For you in the street (js/11 syncPlayer) and for the figure in a clothes shop (js/08l). */
const SKIN = '#f2c6a0';
const outfitKey = o => o ? CL_SLOTS.map(s => o[s] || '-').join('|') : '';
const playerTopMat = () => mc((CLOTH[P.outfit && P.outfit.top] || { c1: '#ffd23f' }).c1);
function dressPerson(o, outfit) {          // o: a figure from buildPerson; outfit: { slot: item id or null }
  const pc = s => outfit && outfit[s] ? CLOTH[outfit[s]] : null, T = o.tilt, skin = mc(SKIN);
  const add = (parent, col, sx, sy, sz, x, y, z, geo, glow) => part(parent, geo || GB, glow ? mBas(col) : mc(col), sx, sy, sz, x, y, z);
  const top = pc('top'), bot = pc('bottoms'), shoe = pc('shoes'), hat = pc('hat'), gl = pc('glasses');
  // the top: body 5 deep (front at x 2.5), 11 high (y 9..20), 9.4 wide; arms hang from y 19.5
  const st = top ? top.style : 'tee', c1 = top ? top.c1 : '#ffd23f', c2 = top && top.c2;
  const sleeve = { tank: 'none', tee: 'short', hawaii: 'short', jersey: 'short' }[st] || 'long';
  o.torso.material = mc(c1); o.topMat = o.torso.material;
  o.arms.forEach(ap => {
    ap.children[0].material = st === 'hivis' ? mc('#3a3f4a') : sleeve === 'long' ? mc(c1) : skin;
    if (sleeve === 'short') add(ap, c1, 3.3, 3.8, 3.1, 0, -1.7, 0);
  });
  const fb = (col, w, h, y, z, both) => { add(T, col, 0.3, h, w, 2.6, y, z); if (both) add(T, col, 0.3, h, w, -2.6, y, z); };   // on the front (and the back)
  if (st === 'tee' && c2) fb(c2, 3.2, 3.2, 15.5, 0);
  else if (st === 'tank' && c2) add(T, c2, 5.2, 0.9, 9.6, 0, 17.2, 0);
  else if (st === 'hawaii') for (const [y, z] of [[15, 2.5], [12, -2.8], [17.6, -1.4], [11, 1.2], [18, 3.3], [13.6, 0.2]]) { fb(c2 || '#ffffff', 1.5, 1.5, y, z, true); }
  else if (st === 'shirt') { add(T, c1, 5.4, 1.1, 5, 0.2, 20.2, 0); fb(c2 || shade(c1, -45), 0.4, 10, 14.5, 0); }   // a collar, the button line
  else if (st === 'check') { for (const y of [11.8, 15.2, 18.6]) add(T, c2 || '#14161d', 5.25, 0.8, 9.65, 0, y, 0); for (const z of [-2.4, 2.4]) add(T, c2 || '#14161d', 5.25, 11.05, 0.8, 0, 14.5, z); }
  else if (st === 'hoodie') { add(T, c1, 3, 4.4, 6.4, -2.7, 21, 0); fb(c2 || '#14161d', 5.2, 2.6, 11.6, 0); for (const z of [-1.1, 1.1]) fb(c2 || '#f4f4f4', 0.4, 2.6, 17.6, z); }
  else if (st === 'jacket') { fb(c2 || '#f4efe6', 2.8, 10.6, 14.6, 0); add(T, c1, 5.4, 1.2, 9.2, 0, 20.1, 0); }
  else if (st === 'suit') { fb('#f4efe6', 2.8, 10.4, 14.8, 0); add(T, c2 || '#14161d', 0.36, 7.4, 1.1, 2.64, 15.6, 0); add(T, c1, 5.4, 1.1, 9.2, 0, 20.1, 0); }
  else if (st === 'leather') { add(T, c2 || '#c0c0c8', 0.34, 10.6, 0.5, 2.62, 14.5, 0.9); add(T, c1, 5.6, 1.5, 9.8, 0, 20.2, 0); add(T, '#14141a', 5.3, 1, 9.7, 0, 9.6, 0); }
  else if (st === 'hivis') { for (const y of [12.4, 16.6]) add(T, c2 || '#d8dde6', 5.3, 1, 9.7, 0, y, 0); }
  else if (st === 'jersey') { add(T, c2 || '#ffffff', 0.3, 4.2, 3.4, -2.6, 15.4, 0); for (const z of [-4.55, 4.55]) add(T, c2 || '#ffffff', 5.05, 11, 0.4, 0, 14.5, z); fb(c2 || '#ffffff', 4.2, 0.8, 19.6, 0); }
  else if (st === 'camo') for (const [x, y, z, w, h] of [[2.6, 12, -2, 3, 2], [2.6, 17, 2.2, 2.4, 2.6], [-2.6, 13, 1.5, 3.4, 2.2], [-2.6, 18, -2, 2.6, 1.8], [2.6, 15, 0.5, 1.6, 1.4], [0, 10.6, 4.75, 2.4, 2], [0, 16, -4.75, 2, 2.6]])
    add(T, c2 || '#2a2e1a', x ? 0.3 : 2.4, h, x ? w : 0.3, x, y, z);
  // the bottoms: legs hang from y 9, 9 long
  const bs = bot ? bot.style : 'jeans', b1 = bot ? bot.c1 : '#2a2d3a', b2 = bot && bot.c2;
  o.legs.forEach((lp, k) => {
    const s = k ? 1 : -1; lp.children[0].material = bs === 'shorts' ? skin : mc(b1);
    if (bs === 'shorts') { add(lp, b1, 3.4, 4.6, 3.6, 0, -2.3, 0); if (b2) add(lp, b2, 3.45, 4.6, 0.4, 0, -2.3, s * 1.65); }
    else if (bs === 'track') add(lp, b2 || '#ffffff', 3.25, 9, 0.4, 0, -4.5, s * 1.55);
    else if (bs === 'cargo') add(lp, b2 || '#2a281e', 2.2, 2.4, 0.4, 0.1, -4, s * 1.75);
    else if (bs === 'jeans' && b2) add(lp, b2, 0.3, 1.2, 2, 1.65, -5, 0);
    // the shoes
    const ss = shoe ? shoe.style : 'sneakers', s1 = shoe ? shoe.c1 : '#e8e8ee', s2 = shoe && shoe.c2;
    if (ss === 'sneakers') { add(lp, s1, 4.4, 1.8, 3.6, 0.6, -8.1, 0); add(lp, s2 || '#f4f4f4', 4.6, 0.6, 3.8, 0.6, -9.0, 0); }
    else if (ss === 'boots') { add(lp, s1, 4.2, 3.4, 3.8, 0.5, -7.4, 0); add(lp, s2 || '#141414', 4.4, 0.7, 3.9, 0.5, -9.0, 0); }
    else if (ss === 'sandals') { add(lp, s1, 4.4, 0.6, 3.4, 0.6, -9.1, 0); add(lp, s2 || s1, 0.7, 0.7, 3.5, 1.6, -8.5, 0); }
    else if (ss === 'loafers') { add(lp, s1, 4.4, 1.4, 3.5, 0.6, -8.3, 0); add(lp, s2 || '#1a1a1a', 4.5, 0.5, 3.6, 0.6, -9.05, 0); }
    else if (ss === 'cowboy') { add(lp, s1, 3.8, 4.4, 3.8, 0.3, -6.8, 0); add(lp, s1, 4.8, 1.6, 3.6, 0.9, -8.4, 0); add(lp, s2 || '#2a1a10', 1.2, 1.2, 3, -1.2, -9.2, 0); }
  });
  // the hat: the head is a ball of 3.9 at (0.5, 23)
  if (hat) {
    const h1 = hat.c1, h2 = hat.c2 || hat.c1, hs = hat.style;
    if (hs === 'cap') { add(T, h1, 4.3, 2.6, 4.3, 0.3, 25.8, 0, GSph); add(T, h2, 3.8, 0.5, 4.6, 4.6, 25.4, 0); }
    else if (hs === 'beanie') { add(T, h1, 4.4, 3.6, 4.4, 0.1, 25.4, 0, GSph); add(T, h2, 4.45, 1.2, 4.45, 0.1, 24.2, 0, GCyl); }
    else if (hs === 'bucket') { add(T, h1, 4, 2.6, 4, 0.3, 26.6, 0, GCyl); add(T, h1, 6.2, 0.4, 6.2, 0.3, 25.3, 0, GCyl); add(T, h2, 4.05, 0.8, 4.05, 0.3, 25.9, 0, GCyl); }
    else if (hs === 'fedora') { add(T, h1, 3.8, 3.4, 3.8, 0.3, 27.4, 0, GCyl); add(T, h2, 3.85, 0.9, 3.85, 0.3, 26.1, 0, GCyl); add(T, h1, 6.4, 0.4, 6.4, 0.3, 25.6, 0, GCyl); }
    else if (hs === 'cowboy') {
      add(T, h1, 3.6, 3.8, 3.6, 0.3, 27.6, 0, GCyl); add(T, h2, 3.65, 0.9, 3.65, 0.3, 26.2, 0, GCyl); add(T, h1, 8.4, 0.4, 7.2, 0.3, 25.6, 0, GCyl);
      for (const z of [-6.8, 6.8]) { const m = add(T, h1, 12, 0.4, 2.4, 0.3, 26.2, z); m.rotation.x = z > 0 ? 0.6 : -0.6; }   // the brim curled up at the sides
    }
    else if (hs === 'hardhat') { add(T, h1, 4.6, 3.8, 4.6, 0.3, 25.6, 0, GSph); add(T, h1, 5.9, 0.4, 5.9, 0.3, 25, 0, GCyl); add(T, hat.c2 || '#ffffff', 8.6, 0.8, 0.9, 0.3, 29.1, 0); }
    else if (hs === 'beret') { const m = add(T, h1, 4.7, 1.5, 4.7, 0, 27.1, 0.6, GSph); m.rotation.x = -0.25; add(T, h2, 0.4, 1, 1, 4.1, 26.6, -1.2); }
    else if (hs === 'bandana') { add(T, h1, 4.25, 1.7, 4.25, 0.3, 25.2, 0, GCyl); add(T, h2, 1.5, 1.5, 1.5, -4, 25, 0); }
    else if (hs === 'headband') add(T, h1, 4.15, 0.9, 4.15, 0.4, 25, 0, GCyl);
  }
  // glasses: the face at x 4.4, the eyes at about y 23.5
  if (gl) {
    const g1 = gl.c1, g2 = gl.c2 || gl.c1, gs = gl.style;
    const temples = col => { for (const z of [-3.3, 3.3]) add(T, col, 4.4, 0.4, 0.4, 2.2, 23.9, z); };
    if (gs === 'shades') { add(T, g1, 0.7, 1.3, 6.4, 4.2, 23.6, 0); add(T, g2, 0.75, 0.35, 6.5, 4.22, 24.3, 0); temples(g1); }
    else if (gs === 'aviators') { for (const z of [-1.45, 1.45]) add(T, g1, 0.6, 1.7, 2.5, 4.25, 23.4, z); add(T, g2, 0.7, 0.35, 6.4, 4.28, 24.35, 0); temples(g2); }
    else if (gs === 'round') { for (const z of [-1.5, 1.5]) add(T, g1, 0.5, 1.25, 1.25, 4.3, 23.6, z, GSph); add(T, g2, 0.6, 0.3, 6.2, 4.32, 23.7, 0); temples(g2); }
    else if (gs === 'visor') add(T, g1, 0.8, 1.8, 7.6, 4.05, 23.8, 0, GB, true);
  }
  return o;
}
