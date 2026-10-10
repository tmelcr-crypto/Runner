'use strict';
/* ---------- 6c3. STORES ----------
   Six stores (js/01g), each selling its own set of weapons - with the ammo for its guns and bombs - and health or body armor. They
   take shop buildings on the streets, spread over the city and always the same ones; each is marked on the minimap and the city map
   ($ in the store's colour), and in front of its door a ring of light with a turning weapon and the store's name floating above.
   Walk up to the door (on foot) and a SHOP button appears by you: tap it, click it or press E, and the game waits while you shop.
   Your score is your cash. Weapons you have are marked OWNED; ammo, health and armor stop at what you can carry. */
let STORES = null, shopGroup = null, shopAt = null, shopBought = false;
const STORE_R = 26;
function pickStores() {                  // the shop buildings that become stores: well spread, the first one near where you start
  const svc = [...SVC.police, ...SVC.hospital].map(s => s.r), out = [];
  const cand = [];
  for (const r of BLD) {
    if (!r.fill || !r.shop || r.special || r.lw < 36) continue;
    const zx = -r.sa, zy = r.ca;
    if (zy < -0.3) continue;                                         // a front facing north would hide its door from the camera behind the building
    for (const off of [14, 20, 28]) {
      const x = r.cx + zx * (r.lh / 2 + off), y = r.cy + zy * (r.lh / 2 + off);
      if (pedBlocked(x, y) || shoreDist(x, y) < 10 || inLandmark(x, y) || !nearestRoad(x, y, ROAD_HALF + SW_W + 6) || svc.some(b => dist(b.cx, b.cy, x, y) < 700) || RAMPAGES.some(q => q.placed && dist(q.x, q.y, x, y) < 250)) continue;
      cand.push({ r, x, y, zx, zy }); break;
    }
  }
  if (!cand.length) return [];
  let first = cand[0]; for (const c of cand) if (dist(c.x, c.y, MAP.start[0], MAP.start[1]) < dist(first.x, first.y, MAP.start[0], MAP.start[1])) first = c;
  const chosen = [first];
  while (chosen.length < STORES_DEF.length) {                     // farthest-point: each next store as far as can be from the others
    let best = null, bd = -1;
    for (const c of cand) { const d = Math.min(...chosen.map(o => dist(o.x, o.y, c.x, c.y))); if (d > bd) { bd = d; best = c; } }
    if (!best || bd < 300) break; chosen.push(best);
  }
  chosen.forEach((c, i) => out.push(Object.assign({}, STORES_DEF[i], { r: c.r, x: c.x, y: c.y, zx: c.zx, zy: c.zy, where: districtAt(c.x, c.y) || '' })));
  return out;
}
function placeStores() {                 // the first game: find the stores and put up their markers (they stay for every game after)
  $('shopBtn').hidden = true; shopAt = null;
  if (shopGroup) { shopGroup.visible = feat('stores'); return; }
  STORES = pickStores(); shopGroup = new THREE.Group(); scene.add(shopGroup);
  for (const s of STORES) {
    const g = new THREE.Group(); g.position.set(s.x, groundH(s.x, s.y), s.y);
    const flat = (geo, op, sc, y) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.scale.setScalar(sc); m.position.y = y; g.add(m); return m; };
    flat(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), 0.2, STORE_R - 4, 1.4);                    // a pad of light in front of the door
    const ring = flat(new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2), 0.95, STORE_R - 4, 1.6);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: euroTex(s.color), transparent: true, depthWrite: false }));
    badge.scale.setScalar(16); badge.position.y = 1.8; g.add(badge);                                         // a $ on the ground
    const glow = new THREE.Mesh(GP, glowMat(s.color, 0.8)); glow.scale.set(80, 1, 80); glow.position.y = 1.3; g.add(glow);
    const beam = new THREE.Mesh(GCyl, new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.14, depthWrite: false })); beam.scale.set(14, 52, 14); beam.position.y = 26; g.add(beam);
    const first = WEAPONS.find(w => s.sells.includes(w.id)), icon = new THREE.Group(), m = first ? weaponModel(first.id, s.color) : itemModel(s.sells.find(id => ITEM[id]) || 'health');
    const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()); m.position.sub(c); icon.add(m); icon.scale.setScalar(Math.min(3, 30 / Math.max(5, sz.x, sz.y, sz.z))); icon.position.y = 16; g.add(icon);
    const sign = signMesh(s.name, s.color, 96, 24); sign.position.set(0, 84, 0); sign.rotation.x = -(Math.PI / 2 - CAM_TILT_DEG * Math.PI / 180); g.add(sign);   // turned to face the camera
    g.userData = { icon, ring }; s.g = g; shopGroup.add(g);
  }
  shopGroup.visible = feat('stores');                               // a mode without stores (js/01j)
}
function euroTex(col) {                // the € painted in front of a store's door
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = col; g.lineWidth = 8; g.shadowColor = col; g.shadowBlur = 12; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke();
  g.font = 'bold 84px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText('€', 64, 70); g.shadowBlur = 0; g.globalAlpha = 0.8; g.fillStyle = '#fff'; g.fillText('€', 64, 70);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function gfxStores(time) {
  if (!STORES) return;
  for (const s of STORES) { if (!s.g) continue; s.g.userData.icon.rotation.y = time * 1.2; s.g.userData.ring.scale.setScalar(STORE_R - 4 + Math.sin(time * 3) * 1.5); }
}
function nearStore() {                   // the store whose door you stand at, on foot
  if (!STORES || P.car || P.dead || P.act || RAMP.on || state !== 'play' || !feat('stores')) return null;
  for (const s of STORES) if (Math.abs(s.x - P.x) < STORE_R && Math.abs(s.y - P.y) < STORE_R && dist(s.x, s.y, P.x, P.y) < STORE_R) return s;
  return null;
}
function shopKey() {                    // E at a store's door (or a clothes shop's, js/08l): the shop, unless a car stands closer to you than the door
  const s = nearStore() || nearClothes(); if (!s) return null;
  const c = nearestCar(); return c && dist(c.x, c.y, P.x, P.y) < dist(s.x, s.y, P.x, P.y) ? null : s;
}
function storeUi() {                     // every frame (js/14): the SHOP button next to you at a store door, or a clothes shop's
  const s = nearStore() || nearClothes(), b = $('shopBtn');
  if (!s) { if (!b.hidden) b.hidden = true; return; }
  if (b.hidden || b.dataset.s !== s.name) { b.hidden = false; b.dataset.s = s.name; b.style.setProperty('--sc', s.color); b.querySelector('b').textContent = s.name; }
  doorBtnAt(b);
}
function doorBtnAt(b) {                  // a button by you (SHOP, RAMPAGE): up and to the right, clear of the signs and of the touch buttons
  const q = worldToScreen(P.x, P.y), hw = b.offsetWidth / 2 + 6, hh = b.offsetHeight / 2 + 6;
  b.style.left = Math.round(clamp(q.x + 95, hw, VW - hw)) + 'px'; b.style.top = Math.round(clamp(q.y - 110, hh, VH - hh)) + 'px';
}
$('shopBtn').addEventListener('click', e => { e.stopPropagation(); const s = nearStore() || nearClothes(); if (s) openShop(s); });

/* ---------- the store's screen ---------- */
const ITEM_ICON = {
  health: '<svg viewBox="0 0 96 40"><rect x="34" y="4" width="32" height="32" rx="4" fill="#f4f4f4"/><rect x="46" y="9" width="8" height="22" fill="#e0364f"/><rect x="39" y="16" width="22" height="8" fill="#e0364f"/></svg>',
  armor: '<svg viewBox="0 0 96 40" fill="currentColor"><path d="M34 6h8l6 5 6-5h8l6 8-4 4v18H36V18l-4-4z"/></svg>',
  bribe: '<svg viewBox="0 0 96 40" fill="currentColor"><path d="M48 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/></svg>',
};
function openShop(s) {
  if (s.clothes) { openClothes(s); return; }                         // a clothes shop (js/08l)
  shopAt = s; shopBought = false; state = 'shop'; toggleBigMap(false); toggleWheel(false); hush(); $('shopBtn').hidden = true;
  $('shopName').textContent = s.name; $('shopName').style.color = s.color; shopSay('');
  paintShop(); showCard('shopCard', true);
}
function shopSay(t, ok) { $('shopMsg').textContent = t; $('shopMsg').classList.toggle('ok', !!ok); }
function closeShop() {                  // back out on the street; what you bought is saved (the autosave), if you can save now
  if (state !== 'shop') return; state = 'play'; shopAt = null; closeMenus();
  if (shopBought && !saveBlock()) putSave('auto', makeSave(lastThumb));
}
function shopRows(s) {                   // what this store sells, as rows: weapons, their ammo, health and armor
  const rows = [];
  for (const id of s.sells) {
    const it = ITEM[id];
    if (it) {
      const have = id === 'health' ? P.hp : P.armor, full = have >= it.max;
      rows.push({ icon: ITEM_ICON[id], col: it.color, name: it.name + ' +' + it.amount, info: 'YOU HAVE ' + Math.round(have) + ' / ' + it.max, price: it.price, why: full ? 'FULL' : '',
        buy: () => { if (id === 'health') P.hp = Math.min(it.max, P.hp + it.amount); else P.armor = Math.min(it.max, P.armor + it.amount); } });
      continue;
    }
    const i = WEAPONS.findIndex(w => w.id === id), w = WEAPONS[i]; if (!w || w.price == null) continue;
    const mel = isMelee(w), thr = isThrown(w), many = w.name + 'S';
    rows.push({ icon: wIcon(w), col: w.color, name: w.name, info: mel ? w.howTo : thr ? (w.mag + w.ammo) + ' ' + many : w.mag + (w.mag > 1 ? ' ROUNDS' : ' LOADED') + ' + ' + w.ammo + ' SPARE', price: w.price, why: P.has[i] ? 'OWNED' : '',
      buy: () => { P.has[i] = true; if (!mel) { P.mag[i] = Math.max(P.mag[i], w.mag); P.ammo[i] = Math.min(Math.max(w.maxAmmo, P.ammo[i]), P.ammo[i] + w.ammo); } P.weapon = i; } });
    if (!mel && w.ammoPrice != null && w.pickup > 0)
      rows.push({ icon: wIcon(w), col: w.color, ammo: true, name: thr ? '+' + w.pickup + ' ' + many : w.short + ' AMMO +' + w.pickup,
        info: thr ? 'YOU HAVE ' + (P.mag[i] + P.ammo[i]) + ' / ' + (w.mag + w.maxAmmo) : 'LOADED ' + P.mag[i] + ' · SPARE ' + P.ammo[i] + ' / ' + w.maxAmmo, price: w.ammoPrice,
        why: P.ammo[i] >= w.maxAmmo ? 'FULL' : '', buy: () => { P.ammo[i] = Math.min(w.maxAmmo, P.ammo[i] + w.pickup); } });
  }
  return rows;
}
function paintShop(keep) {
  const s = shopAt; if (!s) return;
  $('shopCash').textContent = 'YOUR CASH ' + money(P.score) + '  ·  ' + s.where;
  const box = $('shopList'), rows = shopRows(s); box.innerHTML = '';
  rows.forEach((r, k) => {
    const b = document.createElement('button'), poor = !r.why && P.score < r.price; b.type = 'button'; b.className = 'shopRow' + (r.ammo ? ' ammo' : ''); b.disabled = !!r.why;
    b.innerHTML = '<span class="ico"></span><span class="nm"><b></b><small></small></span><span class="pr"></span>';
    b.querySelector('.ico').innerHTML = r.icon; b.querySelector('.ico').style.color = r.col; b.querySelector('b').textContent = r.name; b.querySelector('small').textContent = r.info;
    const pr = b.querySelector('.pr'); pr.textContent = r.why || money(r.price); pr.classList.toggle('poor', poor);
    b.addEventListener('click', () => {
      if (P.score < r.price) { shopSay('NOT ENOUGH CASH - ' + money(r.price - P.score) + ' SHORT'); Snd.tone(160, 110, 0.12, 0.12, 'square'); return; }
      P.score -= r.price; r.buy(); shopBought = true; Snd.tone(880, 1320, 0.08, 0.14, 'square'); setTimeout(() => Snd.tone(1320, 1760, 0.08, 0.12, 'square'), 90);   // ka-ching
      shopSay('BOUGHT: ' + r.name, true); paintShop(k);
    });
    box.appendChild(b);
  });
  if (keep !== undefined) { const bs = [...box.querySelectorAll('button:not(:disabled)')]; const f = bs[Math.min(keep, bs.length - 1)] || document.querySelector('#shopCard .back'); if (f) f.focus(); }
}
