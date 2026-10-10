'use strict';
/* ---------- 6l. CLOTHES SHOPS ----------
   Ten clothes shops (js/01n), each with its own range, take shop buildings spread over the city - always the same ones, apart from
   the six weapon stores. Each is a coat hanger in its colour on the minimap and the city map; at its door a ring of light, a turning
   shirt and the shop's name. Walk up on foot: SHOP (or E). Inside, your figure turns slowly: tap a piece and the figure tries it on;
   tap it again to buy it (and wear it). What you have bought is yours: the WARDROBE tab at any clothes shop puts it on for free.
   Clothes are only changed at the shops. Changing at least one piece while no cop saw you go in makes the police lose you
   (js/01n settings: up to 3 stars; above that it drops to 3). Modes: clothes (js/01j). */
let CSHOPS = null, clGroup = null;
const CLS = { at: null, tab: 'shop', sel: null, entry: null, seen: false, bought: false };
function pickClothes() {                 // shop buildings for the clothes shops: well spread, clear of the weapon stores, the first near the start
  const svc = [...SVC.police, ...SVC.hospital].map(s => s.r), used = new Set((STORES || []).map(s => s.r)), cand = [];
  for (const r of BLD) {
    if (!r.fill || !r.shop || r.special || r.lw < 30 || used.has(r)) continue;
    const zx = -r.sa, zy = r.ca; if (zy < -0.3) continue;            // the door must face the camera
    for (const off of [14, 20, 28]) {
      const x = r.cx + zx * (r.lh / 2 + off), y = r.cy + zy * (r.lh / 2 + off);
      if (pedBlocked(x, y) || shoreDist(x, y) < 10 || inLandmark(x, y) || !nearestRoad(x, y, ROAD_HALF + SW_W + 6) || svc.some(b => dist(b.cx, b.cy, x, y) < 500)
        || (STORES || []).some(s => dist(s.x, s.y, x, y) < 260) || RAMPAGES.some(q => q.placed && dist(q.x, q.y, x, y) < 250)) continue;
      cand.push({ r, x, y, zx, zy }); break;
    }
  }
  if (!cand.length) return [];
  let first = cand[0]; for (const c of cand) if (dist(c.x, c.y, MAP.start[0], MAP.start[1]) < dist(first.x, first.y, MAP.start[0], MAP.start[1])) first = c;
  const chosen = [first];
  while (chosen.length < CL_SHOPS.length) {
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.x, o.y, c.x, c.y))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 250) break; chosen.push(best);
  }
  return chosen.map((c, i) => Object.assign({}, CL_SHOPS[i], { clothes: true, r: c.r, x: c.x, y: c.y, zx: c.zx, zy: c.zy, where: districtAt(c.x, c.y) || '' }));
}
function hangerTex(col) {                // the coat hanger painted in front of the door
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = col; g.lineWidth = 8; g.shadowColor = col; g.shadowBlur = 12; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke();
  const hang = () => { g.beginPath(); g.moveTo(64, 50); g.lineTo(26, 86); g.lineTo(102, 86); g.closePath(); g.moveTo(64, 50); g.lineTo(64, 42); g.arc(64, 34, 8, Math.PI / 2, -Math.PI * 0.9, true); g.stroke(); };
  g.lineWidth = 7; hang(); g.shadowBlur = 0; g.strokeStyle = '#fff'; g.globalAlpha = 0.8; g.lineWidth = 3; hang();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function placeClothes() {                // the first game: find the shops and put up their markers (they stay for every game after)
  if (clGroup) { clGroup.visible = feat('clothes'); return; }
  CSHOPS = pickClothes(); clGroup = new THREE.Group(); scene.add(clGroup);
  for (const s of CSHOPS) {
    const g = new THREE.Group(); g.position.set(s.x, groundH(s.x, s.y), s.y);
    const flat = (geo, op, sc, y) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.scale.setScalar(sc); m.position.y = y; g.add(m); return m; };
    flat(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), 0.2, STORE_R - 4, 1.4);
    const ring = flat(new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2), 0.95, STORE_R - 4, 1.6);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: hangerTex(s.color), transparent: true, depthWrite: false }));
    badge.scale.setScalar(16); badge.position.y = 1.8; g.add(badge);
    const glow = new THREE.Mesh(GP, glowMat(s.color, 0.8)); glow.scale.set(80, 1, 80); glow.position.y = 1.3; g.add(glow);
    const icon = new THREE.Group(), cm = mBas(s.color); icon.position.y = 18; g.add(icon);   // a shirt turning above the pad
    part(icon, GB, cm, 2.4, 10, 9, 0, 0, 0); for (const z of [-1, 1]) { const sl = part(icon, GB, cm, 2.4, 3.6, 5, 0, 3.4, z * 6); sl.rotation.x = z * 0.7; }
    const sign = signMesh(s.name, s.color, 96, 24); sign.position.set(0, 84, 0); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180); g.add(sign);
    g.userData = { icon, ring }; s.g = g; clGroup.add(g);
  }
  clGroup.visible = feat('clothes');
}
function gfxClothes(time) {
  if (!CSHOPS || !clGroup.visible) return;
  for (const s of CSHOPS) { s.g.userData.icon.rotation.y = time * 1.2; s.g.userData.ring.scale.setScalar(STORE_R - 4 + Math.sin(time * 3) * 1.5); }
}
function nearClothes() {                 // the clothes shop whose door you stand at, on foot
  if (!CSHOPS || P.car || P.dead || P.act || RAMP.on || state !== 'play' || !feat('clothes')) return null;
  for (const s of CSHOPS) if (Math.abs(s.x - P.x) < STORE_R && Math.abs(s.y - P.y) < STORE_R && dist(s.x, s.y, P.x, P.y) < STORE_R) return s;
  return null;
}

/* ---------- inside: the figure, the shop's range or your wardrobe ---------- */
const CL_SLOT_NAME = { hat: 'HAT', glasses: 'GLASSES', top: 'TOP', bottoms: 'BOTTOMS', shoes: 'SHOES' };
function openClothes(s) {
  CLS.at = s; CLS.tab = 'shop'; CLS.sel = null; CLS.bought = false; CLS.entry = Object.assign({}, P.outfit); CLS.seen = P.stars > 0 && PS.seen;   // seen going in: new clothes will not fool them
  state = 'shop'; toggleBigMap(false); toggleWheel(false); hush(); $('shopBtn').hidden = true;
  $('clName').textContent = s.name; $('clName').style.color = s.color; clSay(s.theme || '');
  showCard('clothesCard', true); paintClothes(); preview(P.outfit, true);
}
function clSay(t, ok) { $('clMsg').textContent = t; $('clMsg').classList.toggle('ok', !!ok); }
function closeClothes() {                // back on the street: new clothes may lose the police; what you bought is saved
  if (state !== 'shop' || !CLS.at) return;
  const changed = CL_SLOTS.some(sl => P.outfit[sl] !== CLS.entry[sl]);
  state = 'play'; CLS.at = null; previewStop(); closeMenus();
  if (changed && P.stars > 0 && !CLS.seen && feat('police')) {
    if (P.stars <= CL.loseUpTo) clearWanted('NEW LOOK - THEY LOST YOU');
    else if (P.stars > CL.dropTo) { lowerWanted(P.stars - CL.dropTo); toast('NEW LOOK - WANTED LEVEL ' + P.stars); }
  }
  if ((CLS.bought || changed) && !saveBlock()) putSave('auto', makeSave(lastThumb));
}
function clRows() {                      // the shop's range, or what you own (and taking off the hat or the glasses)
  if (CLS.tab === 'shop') return CLOTHES_TABLE.items.filter(i => i.shop === CLS.at.id);
  const out = [];
  for (const sl of CL_SLOTS) {
    if (sl === 'hat' || sl === 'glasses') out.push({ id: 'none_' + sl, none: true, slot: sl, name: 'NO ' + CL_SLOT_NAME[sl], c1: '#3a3f5c' });
    for (const id of P.wardrobe) if (CLOTH[id] && CLOTH[id].slot === sl) out.push(CLOTH[id]);
  }
  return out;
}
const wearing = it => it.none ? !P.outfit[it.slot] : P.outfit[it.slot] === it.id;
function paintClothes() {
  const s = CLS.at; if (!s) return;
  $('clCash').textContent = 'YOUR CASH ' + money(P.score) + '  ·  ' + s.where;
  for (const b of $('clTabs').children) b.classList.toggle('on', b.dataset.t === CLS.tab);
  const box = $('clList'); box.innerHTML = '';
  for (const it of clRows()) {
    const own = it.none || P.wardrobe.includes(it.id), on = wearing(it), b = document.createElement('button'); b.type = 'button';
    b.className = 'clRow' + (CLS.sel === it.id ? ' sel' : '') + (on ? ' on' : '');
    b.innerHTML = '<span class="sw"><i></i><i></i></span><span class="nm"><b></b><small></small></span><span class="pr"></span>';
    const sw = b.querySelectorAll('.sw i'); sw[0].style.background = it.c1; sw[1].style.background = it.c2 || it.c1;
    b.querySelector('b').textContent = it.name; b.querySelector('small').textContent = CL_SLOT_NAME[it.slot];
    const pr = b.querySelector('.pr'); pr.textContent = on ? 'WEARING' : own ? (CLS.tab === 'shop' ? 'OWNED' : 'WEAR') : money(it.price); pr.classList.toggle('poor', !own && P.score < it.price);
    b.addEventListener('click', () => clTap(it));
    box.appendChild(b);
  }
}
function clTap(it) {                     // the first tap tries it on; the second buys it, or puts it on
  const own = it.none || P.wardrobe.includes(it.id);
  if (CLS.sel !== it.id) {
    CLS.sel = it.id; preview(Object.assign({}, P.outfit, { [it.slot]: it.none ? null : it.id }));
    clSay(wearing(it) ? 'YOU ARE WEARING IT' : own ? 'TAP AGAIN TO PUT IT ON' : 'TAP AGAIN TO BUY · ' + money(it.price)); paintClothes(); return;
  }
  if (wearing(it)) return;
  if (!own) {
    if (P.score < it.price) { clSay('NOT ENOUGH CASH - ' + money(it.price - P.score) + ' SHORT'); Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
    P.score -= it.price; P.wardrobe.push(it.id); CLS.bought = true;
    Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.08, 0.12, 'square'), 90);
  } else Snd.tone(600, 900, 0.06, 0.1, 'square');
  P.outfit[it.slot] = it.none ? null : it.id; CLS.sel = null; preview(P.outfit);
  clSay((own ? 'NOW WEARING: ' : 'BOUGHT: ') + it.name, true); paintClothes();
}
for (const b of document.querySelectorAll('#clTabs button')) b.addEventListener('click', () => { CLS.tab = b.dataset.t; CLS.sel = null; preview(P.outfit); clSay(CLS.tab === 'shop' ? CLS.at.theme || '' : 'WHAT YOU OWN: PUT IT ON FOR FREE'); paintClothes(); });

/* the figure turning in the shop: its own small renderer, drawn while the shop is open */
const CLP = { r: null, scene: null, cam: null, fig: null, key: null, on: false, ang: 0.5, last: 0 };
function preview(outfit, start) {
  const cv = $('clFig');
  if (!CLP.r) {
    CLP.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); CLP.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    CLP.scene = new THREE.Scene(); CLP.scene.add(new THREE.HemisphereLight(0xffffff, 0x50406a, 0.95));
    const d = new THREE.DirectionalLight(0xffffff, 0.75); d.position.set(40, 60, 50); CLP.scene.add(d);
    CLP.floor = new THREE.Mesh(new THREE.CircleGeometry(15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); CLP.scene.add(CLP.floor);
    CLP.cam = new THREE.PerspectiveCamera(30, 1, 1, 500); CLP.cam.position.set(0, 19, 68); CLP.cam.lookAt(0, 14.5, 0);
  }
  const k = outfitKey(outfit);
  if (CLP.key !== k) {
    if (CLP.fig) CLP.scene.remove(CLP.fig);
    const o = buildPerson('player', '#ffd23f', SKIN); dressPerson(o, outfit); if (o.gun) o.gun.visible = false; CLP.fig = o.g; CLP.scene.add(o.g); CLP.key = k;
  }
  if (CLS.at) CLP.floor.material.color.set(CLS.at.color);
  if (start && !CLP.on) { CLP.on = true; CLP.last = performance.now(); requestAnimationFrame(previewTick); }
}
function previewTick(now) {
  if (!CLP.on) return;
  const cv = $('clFig'), w = cv.clientWidth, h = cv.clientHeight;
  if (w && h) {
    if (cv.width !== Math.round(w * CLP.r.getPixelRatio())) { CLP.r.setSize(w, h, false); CLP.cam.aspect = w / h; CLP.cam.updateProjectionMatrix(); }
    CLP.ang += Math.min(0.1, (now - CLP.last) / 1000) * 0.9; CLP.fig.rotation.y = CLP.ang; CLP.r.render(CLP.scene, CLP.cam);
  }
  CLP.last = now; requestAnimationFrame(previewTick);
}
function previewStop() { CLP.on = false; }
