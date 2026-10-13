'use strict';
/* ---------- 7z. THE STUNT RAMPS (map remodel 18: MAP.stunts; at work: js/08zw; the stunt table js/01v) ----------
   Fourteen street ramps and five over the water, all alike so you learn to spot them: a steel wedge with a ribbed deck, yellow and
   black chevrons pointing up it and a checkered flag on a pole at each corner of its lip. Each is one of the jumps a car follows up
   (js/08zt siteJump) and takes off from at its lip; Skyline One's launch ramp (js/10v) is the twentieth stunt jump. The ground ahead
   is kept free of trees and street furniture. Mode: stunts (off: no ramps). */
const STUNTS = [];                          // { k (1-20), kind, name, x, y (the lip), ux, uy, J (its jump), lm }
function genStunts() {                     // js/04 genWorld, after the site (its launch ramp is SK.jumps' top one)
  STUNTS.length = 0; if (!SK.jumps) SK.jumps = [];
  (MAP.stunts || []).forEach((s, i) => {
    const a = s.a * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), k = i + 1;
    const J = { kind: 'ramp', x: s.x, y: s.y, ux, uy, len: s.len, w: s.w, h: s.h, z: 0, stunt: k };
    SK.jumps.push(J);
    const st = { k, kind: s.kind, name: STUNT_NAMES[i] || 'STUNT ' + k, x: s.x + ux * s.len, y: s.y + uy * s.len, ux, uy, J, s };
    for (let d = -320; d <= s.len + 600; d += 70) LM_CLEAR.push([s.x + ux * d, s.y + uy * d, 44, 44]);   // the run-up, the ramp, the flight and the landing: no trees, no benches
    LMS.push(st.lm = { cx: s.x, cy: s.y, a, rad: s.len + 40, make: () => makeStuntRamp(s), mesh: null });
    STUNTS.push(st);
  });
  const top = SK.jumps.find(J => J.top);                            // Skyline One's launch ramp off the top deck
  if (top) { top.stunt = 20; STUNTS.push({ k: 20, kind: 'site', name: STUNT_NAMES[19] || 'SKYLINE DROP', x: top.x + top.ux * top.len, y: top.y + top.uy * top.len, ux: top.ux, uy: top.uy, J: top }); }
}
function makeStuntRamp(s) {                // along +x from its foot (0) to its lip (len), w wide, h high at the lip
  const T = new GeoBuilder(), G = new GeoBuilder(), L = s.len, w = s.w / 2, h = s.h;
  const steel = _C('#7f8796'), dark = _C('#3a3f4c'), yel = _C('#ffd23f'), blk = _C('#16161c'), red = _C('#e0364f'), wht = _C('#f4f4f6');
  const up = (x, z) => [x, h * x / L + 0.25, z];
  face(T, [[0, 0.2, -w], [L, h, -w], [L, h, w], [0, 0.2, w]], [-h, L, 0], steel);   // the deck
  for (const sz of [-1, 1]) face(T, [[0, 0, sz * w], [L, 0, sz * w], [L, h, sz * w], [0, 0.2, sz * w]], [0, 0, sz], dark);   // its sides
  face(T, [[L, 0, -w], [L, 0, w], [L, h, w], [L, h, -w]], [1, 0, 0], dark);          // the back under the lip
  for (let x = 6; x < L - 4; x += 7) face(T, [up(x, -w + 1), up(x + 1.4, -w + 1), up(x + 1.4, w - 1), up(x, w - 1)], [-h, L, 0], dark);   // ribs
  for (let k = 0; k < 3; k++) {                                     // chevrons pointing up the deck
    const x0 = 14 + k * 22;
    for (const sz of [-1, 1]) face(G, [up(x0, 0), up(x0 + 9, 0), up(x0 + 1, sz * (w - 4)), up(x0 - 8, sz * (w - 4))].map(p => [p[0], p[1] + 0.1, p[2]]), [-h, L, 0], k % 2 ? blk : yel);
  }
  box5(G, L - 3, h, -w, L, h + 0.6, w, yel);                          // the lip's edge
  for (const sz of [-1, 1]) {                                        // a flag at each corner of the lip
    T.prism(L - 2, sz * (w - 2), 0.5, h, h + 26, dark, 6, 0.5, true);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) box5(G, L - 2 - (a + 1) * 4, h + 18 + b * 4, sz * (w - 2) - 0.3, L - 2 - a * 4, h + 22 + b * 4, sz * (w - 2) + 0.3, (a + b) % 2 ? red : wht);
  }
  return lmMesh(T, G);
}
