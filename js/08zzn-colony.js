'use strict';
/* ---------- 8zzn. THE COLONY STORYLINE (Esther Bloom) - save the hotel: H1-H8, and the pieces it needs ----------
   Esther's marker E stands outside the Colony's front door on the ring drive. The roof terrace (modes: colonyRoof) is built with the
   hotel (js/10b colonyTerrace); here it is shown or hidden by the mode. Each quest's words, lines and numbers are in the missions table
   (js/01x); the engine in js/08zy, the enemies and friends in js/08zz. */
function gfxWrecker(time) { for (const c of cars) if (c.m && c.m.swing) c.m.swing.rotation.x = Math.sin(time * 1.3 + c.x * 0.01) * (0.12 + Math.min(0.5, carSpeed(c) * 0.004)); }   // js/13: the iron ball swings (more on the move)
function gfxColonyRoof() { const r = COLONY && COLONY.roofMesh; if (r) { const on = feat('colonyRoof'); if (r.visible !== on) r.visible = on; } }   // js/13

/* ---------- the Colony's halls as a quest's side-on building (H1): Crane's men in the corridors, thrown out in a scuffle ----------
   SB.ms.thugs: [{ fl, x, x0, x1, dir, out, fall }]; SB.ms.scuffle: { t, k } - walk into one and tap UP fast: the bar fills as you push,
   he pushes back; full, he goes flying down the stairs; empty, he shoves you off (it hurts). The numbers are the quest's (H1). */
function sbColony() {
  const h = SAFES.find(s => s.id === 'colony'); if (!h || !h.door) return null;
  return { id: 'colonyq', kind: 'hotel', name: 'COLONY HOTEL', floors: h.floors, home: -1, door: h.door };
}
function hotelLayout(h) {                 // js/08zzj sbLayout: the guests' rooms along each hall, palms in pots, the stairs switching ends
  const doors = [];
  for (let f = 1; f <= h.floors; f++) [200, 340, 760, 900, 1040].forEach((x, k) => doors.push({ f, x, n: f * 100 + k + 1, name: 'ROOM ' + (f * 100 + k + 1), shut: true }));
  return { W: 1300, doors, plants: [270, 690, 1110], up: f => f % 2 === 0 ? 1190 : 110, tint: '#1e3a3c', carpet: '#5a1f3a', lobby: 'COLONY HOTEL' };
}
const scufN = () => (MS.on && MS.m.numbers) || {};
function thugNear() {                     // the one you are at (or holding)
  const M = SB.ms; if (M.scuffle) return M.scuffle.t;
  return M.thugs.find(t => !t.out && t.fl === SV.fl && Math.abs(t.x - SV.x) < 34) || null;
}
function scuffleTap(t) {                  // UP: start the scuffle, or push harder
  const M = SB.ms;
  if (!M.scuffle) { M.scuffle = { t, k: 0.45 }; SV.face = Math.sign(t.x - SV.x) || 1; Snd.tone(220, 180, 0.08, 0.08, 'square'); return; }
  M.scuffle.k += scufN().tapK || 0.1; Snd.tone(300 + 400 * M.scuffle.k, 260 + 400 * M.scuffle.k, 0.04, 0.05, 'square');
}
function thugsTick(dt) {                  // js/08zzj sbTick: they walk their halls; a scuffle runs; the thrown ones tumble away
  const M = SB.ms, sc = M.scuffle;
  for (const t of M.thugs) {
    if (t.out) { if (t.fall < 1) t.fall = Math.min(1, t.fall + dt * 1.6); continue; }
    if (sc && sc.t === t) continue;
    if ((t.wait -= dt) > 0) continue;
    t.x += t.dir * 36 * dt; if (t.x < t.x0 || t.x > t.x1) { t.x = clamp(t.x, t.x0, t.x1); t.dir *= -1; t.wait = rand(1, 2.5); }
  }
  if (!sc) return;
  if (sc.t.fl !== SV.fl) { M.scuffle = null; return; }
  sc.k -= (scufN().pushK || 0.22) * dt; SV.x = sc.t.x - (SV.face || 1) * 22;
  if (sc.k >= 1) {                        // he goes flying, down the stairs and out
    sc.t.out = true; sc.t.fall = 0; sc.t.flyDir = SV.face || 1; M.scuffle = null; M.thrown = (M.thrown || 0) + 1;
    Snd.tone(520, 180, 0.3, 0.1, 'sawtooth'); const left = M.thugs.filter(q => !q.out).length; svToast(left ? 'THROWN OUT!  ' + left + ' LEFT' : 'THE LAST OF THEM IS OUT!');
  } else if (sc.k <= 0) {                 // he shoves you off
    M.scuffle = null; damagePlayer(scufN().hurt || 8); SV.x = clamp(SV.x - (SV.face || 1) * 60, 40, SV.B.W - 40); SV.fade = 0.3; svToast('HE SHOVED YOU OFF - TAP FASTER');
  }
}
function thugsDraw(g, X, f, y0, s, time) { // js/08zzj sbDraw: grey suits; the scuffle's bar over the two of you; the thrown one flying
  const M = SB.ms, sc = M.scuffle;
  for (const t of M.thugs) {
    if (t.fl !== f) continue;
    if (t.out) { if (t.fall >= 1) continue; g.globalAlpha = 1 - t.fall; const dx = t.flyDir * t.fall * 160, dy = -Math.sin(t.fall * Math.PI) * 50; g.save(); g.translate(X(t.x + dx), y0 - 4 * s + dy * s); g.rotate(t.flyDir * t.fall * 5); svPerson(g, 0, 0, s, '#3a3f4c', '#2a2d36', '#d9a074', t.flyDir, 0, '#1a1a1a'); g.restore(); g.globalAlpha = 1; continue; }
    const fighting = sc && sc.t === t, wob = fighting ? Math.sin(time * 30) * 2 : 0;
    svPerson(g, X(t.x + wob), y0 - 4 * s, s, '#3a3f4c', '#2a2d36', '#d9a074', fighting ? -(SV.face || 1) : t.dir, fighting || t.wait > 0 ? 0 : gameT * 7 + t.x * 0.1, '#1a1a1a');
    if (fighting) { const bx = X(t.x - (SV.face || 1) * 11) - 30 * s, by = y0 - 96 * s; g.fillStyle = '#111'; g.fillRect(bx, by, 60 * s, 8 * s); g.fillStyle = sc.k > 0.7 ? '#3dff7a' : sc.k > 0.35 ? '#ffd23f' : '#ff3b4a'; g.fillRect(bx + 1 * s, by + 1 * s, 58 * s * clamp(sc.k, 0, 1), 6 * s); }
  }
}
