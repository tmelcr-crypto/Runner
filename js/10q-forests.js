'use strict';
/* ---------- 7r. WOODS ON THE BIG LAWNS ----------
   The city's large green expanses get woods (places table, City: forestMin, forestCover, forestGap): every lawn at least forestMin
   across - the golf links, the big parks, the islands' greens, but not a landmark's park (Bayfront, the mall's, the Colony's) or a
   designed one (js/10p) - is wooded in patches covering forestCover of it, meadows and clearings between; the space center's grounds
   get low pine scrub away from its buildings, pad and crawlerway. Trees stand about forestGap apart, pines and broadleaves mixed, a
   few in flower; like every tree they fall when a vehicle drives into them (js/12g), and the saw palmetto is flattened like a bush. Always the same: the patches come from a
   fixed noise, not from chance. */
let FOREST_TREES = 0;                     // how many trees the woods got (a check for the tests)
const fr1 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };   // a fixed random number per grid point
function frNoise(x, y) {                  // smooth value noise, two octaves, 0..1: where the woods are
  const oct = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return (fr1(i, j) * (1 - su) + fr1(i + 1, j) * su) * (1 - sv) + (fr1(i, j + 1) * (1 - su) + fr1(i + 1, j + 1) * su) * sv; };
  return oct(x / 520, y / 520) * 0.7 + oct(x / 190 + 17, y / 190 + 5) * 0.3;
}
function forestAreas() {                  // the lawns that get woods, and the space center's grounds (scrub)
  const out = [], side = PLC.forestMin, skip = MAP.lm.filter(L => L.t === 'park' || L.t === 'mall' || L.t === 'colony').map(L => [L.x - (L.w || 0) / 2 - 200, L.y - (L.h || 0) / 2 - 200, L.x + (L.w || 0) / 2 + 200, L.y + (L.h || 0) / 2 + 200]);
  for (const g of MAP.grass) {
    if (Math.abs(polyArea(g.o)) < side * side || spwIn(g.o[0][0], g.o[0][1])) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; if (skip.some(b => cx > b[0] && cx < b[2] && cy > b[1] && cy < b[3])) continue;
    out.push({ g, box: [x0, y0, x1, y1], scrub: false });
  }
  if (MAP.space) for (const g of MAP.space.area) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of g.o) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } out.push({ g, box: [x0, y0, x1, y1], scrub: true }); }
  return out;
}
function spaceClear(x, y) {               // the space center's working ground stays open: the crawlerway, the pad, the buildings round them
  const S = MAP.space; if (!S) return true;
  const [ax, ay] = S.crawlerway[0], [bx, by] = S.crawlerway[1], t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1), 0, 1);
  if (Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t) < S.cw / 2 + 70) return false;
  if (dist(x, y, S.pad[0], S.pad[1]) < S.pad[2] + 110) return false;
  for (const k of ['vab', 'lcc', 'office', 'lot']) { const [rx, ry, rw, rh] = S[k]; if (Math.abs(x - rx) < rw / 2 + 60 && Math.abs(y - ry) < rh / 2 + 60) return false; }
  for (const [tx, ty, r] of S.tanks) if (dist(x, y, tx, ty) < r * 2 + 40) return false;
  for (const [mx, my] of S.masts) if (dist(x, y, mx, my) < 50) return false;
  return dist(x, y, S.water[0], S.water[1]) > 60 && dist(x, y, S.garden[0], S.garden[1]) > 80 && dist(x, y, S.tower[0], S.tower[1]) > 50;
}
function plantForests(trunks, crowns, pines, tufts, clear, TV) {  // js/10 buildCity, after the park trees: the woods (TV: a tree's parts, js/12g)
  const gap = Math.max(18, PLC.forestGap), cover = PLC.forestCover, GREEN = ['#1f8a5a', '#17784e', '#23955f', '#2e7a4a', '#1d6e48'];
  let n = 0;
  for (const A of forestAreas()) {
    const [x0, y0, x1, y1] = A.box, thr = A.scrub ? 0.42 : cover;
    for (let y = y0 + gap / 2; y < y1; y += gap) for (let x = x0 + gap / 2; x < x1; x += gap) {
      const jx = x + (fr1(x, y) - 0.5) * gap * 0.9, jy = y + (fr1(y, x) - 0.5) * gap * 0.9;
      if (frNoise(jx, jy) > thr || !inPoly(jx, jy, A.g) || !clear(jx, jy, 18) || (A.scrub && !spaceClear(jx, jy))) continue;
      const r = fr1(jx * 0.37, jy * 0.53), tm = partMark(TV); n++;
      if (A.scrub) {                                               // scrub: low pines and saw palmetto
        if (r < 0.6) { const h = 26 + r * 30, w = h * 0.3, col = pick(['#3a6a3a', '#4a7a3a', '#2f5f36']); trunks.push({ x: jx, y: 3, z: jy, sx: 1.4, sy: 6, sz: 1.4, c: '#4a3626' }); pines.push({ x: jx, y: 2, z: jy, sx: w, sy: h, sz: w, ry: r * TAU, c: col }); addTree(jx, jy, w, h, 'pine', '#4a3626', col, partsSince(TV, tm)); }
        else { for (let i = 0; i < 3; i++) crowns.push({ x: jx + (i - 1) * 4, y: 3, z: jy + ((i * 5) % 3 - 1) * 4, sx: 6, sy: 3.4, sz: 6, c: pick(['#5a7a3a', '#6a8a42', '#4f6a36']) }); registerThrow(jx, jy, partsSince(TV, tm), null, 0.3, 'bush'); }
        continue;
      }
      if (r < 0.55) { const h = 52 + r * 50, w = h * (0.24 + r * 0.1), col = pick(['#0f6b4f', '#145c46', '#1a6a4a', '#0d5a48']); trunks.push({ x: jx, y: 4, z: jy, sx: 2, sy: 8, sz: 2, c: '#3b2a1e' }); pines.push({ x: jx, y: 3, z: jy, sx: w, sy: h, sz: w, ry: r * TAU, c: col }); addTree(jx, jy, w, h, 'pine', '#3b2a1e', col, partsSince(TV, tm)); }
      else { const h = 20 + r * 14, cr = 12 + r * 8, col = r > 0.97 ? pick(['#d94fa0', '#7a35d6']) : pick(GREEN);
        trunks.push({ x: jx, y: h / 2, z: jy, sx: 2.6, sy: h, sz: 2.6, c: '#3b2a1e' }); crowns.push({ x: jx, y: h + cr * 0.35, z: jy, sx: cr, sy: cr * 0.9, sz: cr, c: col });
        const a = r * 40; crowns.push({ x: jx + Math.cos(a) * cr * 0.5, y: h + 2, z: jy + Math.sin(a) * cr * 0.5, sx: cr * 0.7, sy: cr * 0.62, sz: cr * 0.7, c: shade(col, 10) });
        addTree(jx, jy, cr * 1.25, h, 'leafy', '#3b2a1e', col, partsSince(TV, tm)); }
      if (r > 0.82) tufts.push({ x: jx + 6, y: 0, z: jy + 4, sx: 1.8, sy: 2, sz: 1.8, ry: r * TAU, c: '#4f7a3a' });   // undergrowth
    }
  }
  return (FOREST_TREES = n);
}
