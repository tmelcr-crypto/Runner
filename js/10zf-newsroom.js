'use strict';
/* ---------- 7zf. BAY TV's NEWSROOM: a glass pavilion on the TV tower's plaza in Mercado, the top-down kind (both modes) ----------
   Blue glass walls with white frames, BAY TV 7 in lights over the door and painted on the roof; its roof turns see-through while you
   are inside. Inside: rows of desks with green-screen monitors, a wall of TV screens showing the channel, the editing booth, a small
   studio set (the news desk, a camera, the ON AIR light) and Nina Park's desk by the window. Open by day (places table, Newsroom):
   reporters at the desks; at night the door is locked. A quest can hold it (NEWS.ms): the door open, the quest's people only.
   NEWS.S: { cx, cy, a, ca, sa, hw, hd, H, door, nina, desk } (local x across, z from the back wall to the door). Mode: newsroom. */
const NEWS = { S: null, ms: null };
const NEWS_WT = 3, NEWS_DW = 26;
const newsOn = () => feat('newsroom') && !!NEWS.S;
const newsOpen = () => SKY.hour >= PLC.newsOpen && SKY.hour < PLC.newsClose;
function newsWorld(lx, lz, out) { return ixWorld(NEWS.S, lx, lz, out); }
const _nq = {};
function newsIn(x, y, m) { const S = NEWS.S; if (!S) return false; ixLocal(S, x, y, _nq); return Math.abs(_nq.x) < S.hw - NEWS_WT - (m || 0) && Math.abs(_nq.z) < S.hd - NEWS_WT - (m || 0); }
function genNewsroom() {                    // js/04 genWorld: on the plaza east of the TV tower, its door to the street on the south
  NEWS.S = null; const L = MAP.lm.find(l => l.t === 'tvtower'); if (!L) return;
  const hw = 62, hd = 52, S = NEWS.S = { cx: L.x + 140, cy: L.y + 62, a: 0, ca: 1, sa: 0, hw, hd, H: 30, roof: 1 };
  const W = NEWS_WT, sol = (lx, lz, w, h, ex) => { const p = newsWorld(lx, lz); return makeSolid(p.x, p.y, Math.max(1, w), Math.max(1, h), S.a, Object.assign({ bld: true }, ex || {})); };
  sol(0, -hd + W / 2, 2 * hw, W); sol(-hw + W / 2, 0, W, 2 * hd); sol(hw - W / 2, 0, W, 2 * hd);
  for (const s of [-1, 1]) sol(s * (hw + NEWS_DW / 2) / 2, hd - W / 2, hw - NEWS_DW / 2, W);
  S.doorSolid = sol(0, hd - W / 2, NEWS_DW + 2, W + 2, { ixDoor: true });
  S.desks = []; for (const x of [-34, -6, 22]) for (const z of [-4, 22]) { S.desks.push({ x, z }); sol(x, z, 18, 9); }   // two rows of three desks
  sol(-hw + 14, -hd + 22, 16, 30);                                  // the editing booth
  sol(30, -hd + 14, 40, 10);                                        // the studio's news desk
  S.nina = { x: hw - 20, z: -16 }; sol(hw - 12, -16, 10, 22);       // Nina's desk by the east window
  S.door = newsWorld(0, hd + 18); S.inside = newsWorld(0, hd - 16); const nw = newsWorld(S.nina.x - 14, S.nina.z); S.ninaAt = { x: nw.x, y: nw.y };
  LM_CLEAR.push([S.cx, S.cy, hw + 8, hd + 8]);
  S.lm = { cx: S.cx, cy: S.cy, a: S.a, rad: Math.hypot(hw, hd) + 30, make: () => withSeed(4471, () => makeNewsroom(S)), mesh: null }; LMS.push(S.lm);
  for (const d of S.desks.slice(0, 4)) { const w = newsWorld(d.x, d.z + 9);                       // reporters at the desks by day
    addPost({ x: w.x, y: w.y, a: -Math.PI / 2, kind: 'reporter', back: 200, need: () => newsOn() && newsOpen() && !NEWS.ms, step: standStep,
      make: po => { const p = makePed(po.x, po.y); Object.assign(p, { arm: -1, umb: false, speed: 0, state: 'post', shirt: pick(['#e8e8ee', '#3d6fa8', '#d4a020', '#a8323a']), pants: pick(['#2a2d3a', '#4a4458']), ang: po.a }); return p; } }); }
}
function makeNewsroom(S) {
  const T = new GeoBuilder(), G = new GeoBuilder(), R = new GeoBuilder(), RG = new GeoBuilder(), C = _C, { hw, hd, H } = S, W = NEWS_WT;
  const glass = C('#5a8fd8'), frame = C('#f4f6fa'), blue = C('#1f4fa8'), red = C('#ff3b4a'), desk = C('#d8d4c8'), screen = C('#3aff9a');
  flat(T, -hw, -hd, hw, hd, 0.4, C('#3a3f4c')); for (let x = -hw + 6; x < hw - 6; x += 12) flat(T, x, -hd + 6, x + 0.6, hd - 6, 0.45, C('#4a4f5c'));   // a dark carpet with lines
  flat(T, -NEWS_DW / 2 - 8, hd, NEWS_DW / 2 + 8, hd + 20, 0.45, C('#c8ccd4'));
  /* the shell: glass panes between white frames */
  const pane = (x0, z0, x1, z1) => { box5(T, x0, 0, z0, x1, 3, z1, frame); box5(G, x0, 3, z0, x1, H - 3, z1, glass); box5(T, x0, H - 3, z0, x1, H, z1, frame); };
  pane(-hw, -hd, hw, -hd + W); pane(-hw, -hd, -hw + W, hd); pane(hw - W, -hd, hw, hd); pane(-hw, hd - W, -NEWS_DW / 2, hd); pane(NEWS_DW / 2, hd - W, hw, hd);
  box5(T, -NEWS_DW / 2, 24, hd - W, NEWS_DW / 2, H, hd, frame);
  for (let x = -hw; x <= hw; x += 16) { box5(T, x - 0.8, 0, -hd - 0.4, x + 0.8, H, -hd + W + 0.4, frame); box5(T, x - 0.8, 0, hd - W - 0.4, x + 0.8, H, hd + 0.4, frame); }
  /* inside: desks with monitors, the screen wall, the editing booth, the studio set, Nina's desk */
  for (const d of S.desks) { box5(T, d.x - 9, 0, d.z - 4.5, d.x + 9, 7, d.z + 4.5, desk); box5(T, d.x - 4, 7, d.z - 3, d.x + 4, 12, d.z + 1, C('#d8d4c8')); box5(G, d.x - 3.2, 7.8, d.z + 1, d.x + 3.2, 11.4, d.z + 1.2, screen); }
  for (let k = 0; k < 6; k++) for (let r = 0; r < 2; r++) box5(G, -36 + k * 10, 10 + r * 8, -hd + W + 0.3, -28 + k * 10, 16 + r * 8, -hd + W + 0.8, C(k % 2 === r % 2 ? '#2bf3ff' : '#ff2bd6'));   // the screen wall
  box5(T, -hw + 6, 0, -hd + 7, -hw + 22, 14, -hd + 37, C('#2a2d3a')); box5(G, -hw + 22, 6, -hd + 12, -hw + 22.6, 12, -hd + 30, screen);   // the editing booth
  box5(T, 10, 0, -hd + 9, 50, 8, -hd + 19, blue); box5(G, 12, 8, -hd + 9, 48, 8.6, -hd + 10, red);   // the news desk
  box5(T, 28, 0, -hd + 34, 32, 12, -hd + 38, C('#14141a')); box5(T, 26, 12, -hd + 32, 34, 16, -hd + 40, C('#14141a'));   // the studio camera
  box5(G, 46, H - 8, -hd + W + 0.3, 56, H - 4, -hd + W + 0.8, red);                           // ON AIR
  box5(T, hw - 17, 0, -27, hw - 7, 7, -5, C('#8a6a48')); box5(G, hw - 15, 7, -20, hw - 9, 11, -19.6, screen);   // Nina's desk
  /* the roof (it fades while you are inside): white, a dish, the name painted on it */
  flat(R, -hw, -hd, hw, hd, H + 0.5, C('#e8ecf4')); box5(R, -hw, H, -hd, hw, H + 1.5, -hd + 2, blue); box5(R, -hw, H, hd - 2, hw, H + 1.5, hd, blue);
  R.prism(-hw + 18, hd - 18, 7, H + 0.5, H + 2.5, C('#d8dce4'), 12);
  const m = lmMesh(T, G), own = m.userData.own;
  const roofMat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })), roofGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
  const roof = new THREE.Mesh(mergeBuilders([R, RG]), [roofMat, roofGlow]); m.add(roof);
  const sign = fasciaSign('BAY TV 7 · NEWS', '#2bf3ff', 64, 9); sign.position.set(0, 27, hd + 0.9); m.add(sign);
  const top = fasciaSign('BAY TV 7', '#2bf3ff', 90, 22); top.rotation.order = 'YXZ'; top.rotation.set(-Math.PI / 2, S.a, 0); top.position.set(10, H + 1.2, 0); m.add(top);
  own.push(roofMat, roofGlow, sign.material, top.material);
  S.pt = { roofMat, roofGlow, top, op: -1 }; return m;
}
function newsReset() { NEWS.ms = null; if (NEWS.S) NEWS.S.roof = 1; }
function newsTick() { const S = NEWS.S; if (!S) return; S.doorSolid.off = !!NEWS.ms || (newsOn() && newsOpen()); }   // js/15 update: the door locked at night
let newsT = 0;
function gfxNews(time) {                    // js/13: the roof fades over you
  const dt = Math.min(0.1, Math.max(0, time - newsT)); newsT = time;
  const S = NEWS.S; if (!S || !S.lm.mesh || !S.pt) return;
  const pt = S.pt, me = P.car || P, inside = !P.dead && newsIn(me.x, me.y, -6);
  S.roof += ((inside ? 0.1 : 1) - S.roof) * Math.min(1, dt * 6);
  if (Math.abs(S.roof - pt.op) > 0.003) { pt.op = S.roof; pt.roofMat.opacity = pt.roofGlow.opacity = pt.top.material.opacity = S.roof; pt.roofMat.depthWrite = pt.roofGlow.depthWrite = S.roof > 0.97; pt.top.material.transparent = true; }
}
