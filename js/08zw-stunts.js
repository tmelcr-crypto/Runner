'use strict';
/* ---------- 6zw. THE STUNT JUMPS AT WORK (the ramps: js/10y; the stunt table js/01v; modes: stunts) ----------
   Off a stunt ramp's lip (js/08zt siteJump hands over here) a car flies: the table's lift and gravity, and time in the air slows
   down. Landed on its wheels, far enough, not spun round, not smashed on the way - UNIQUE STUNT BONUS: cash by distance and height,
   the first time only, and the jump counts toward 100% (js/08zs). Too slow at the lip, not far enough, crashed: a small note, try
   again. The ramps are not on the maps; a done jump gets a tick on the big map. The jumps done go into the saved game. */
const STX = { fly: null, done: new Set(), slowT: 0, note: '', noteT: 0, bannerT: 0 };
const stuntOn = () => feat('stunts');
const stuntNeed = k => STN['need' + k] || 0, stuntFar = k => STN['far' + k] || 0;
function nearStunt(x, y) {                // js/07: a car by a stunt ramp follows its surface (siteJump)
  if (!stuntOn()) return false;
  for (const s of STUNTS) if (s.kind !== 'site' && Math.abs(x - s.J.x) < s.J.len + 60 && Math.abs(y - s.J.y) < s.J.len + 60) return true;
  return false;
}
function stuntLaunch(c, J, sp) {          // js/08zt siteJump: a car off a stunt ramp's lip
  if (!stuntOn()) return;
  if (J.stunt <= 19) { c.vz = c.vz / PLC.jumpLift * STN.lift; c.stuntG = STN.gravity; }   // the street and water ramps throw harder, and it floats longer
  if (c !== P.car || STX.fly) return;
  STX.fly = { k: J.stunt, c, x0: c.x, y0: c.y, ang0: Math.atan2(c.vy, c.vx), hp0: c.hp, top: 0, sp, ok: sp >= stuntNeed(J.stunt) - 1, t: 0 };
}
function stuntSlow() { return STX.fly && STX.fly.c.air > 0 && stuntOn() ? STN.slowmo : 1; }   // js/15: time in the air
function stuntTick(dt) {                  // js/15 update
  if (STX.bannerT > 0 && (STX.bannerT -= dt / Math.max(0.05, stuntSlow())) <= 0) $('stuntBanner').hidden = true;
  const F = STX.fly; if (!F) return;
  const c = F.c; F.t += dt;
  if (P.car !== c || c.sunk || P.dead) { STX.fly = null; return; }   // bailed out, sank, gone
  F.top = Math.max(F.top, c.air || 0);
  if ((c.air || 0) > 0 || c.vz > 0) return;                          // still in the air
  STX.fly = null;
  const k = F.k, s = STUNTS.find(q => q.k === k), d = dist(c.x, c.y, F.x0, F.y0), dm = d / UNITS_PER_M, hm = F.top / UNITS_PER_M;
  const wet = shoreDist(c.x, c.y) < 0 && !c.roof, spun = Math.abs(angDiff(F.ang0, c.ang)) > STN.upright, smashed = c.dead || F.hp0 - c.hp > STN.hardHit * c.maxhp;
  if (!F.ok) return stuntNote('TOO SLOW - ' + Math.round(stuntNeed(k) / KMH) + ' KM/H AT THE LIP');
  if (wet || d < stuntFar(k)) return stuntNote(wet ? 'INTO THE WATER - TRY AGAIN' : 'NOT FAR ENOUGH - TRY AGAIN');
  if (spun || smashed) return stuntNote('CRASHED - TRY AGAIN');
  if (STX.done.has(k)) return stuntNote('STUNT DONE BEFORE - ' + Math.round(dm) + ' M');
  const pay = clamp(Math.round((STN.perMetre * dm + STN.perHeight * hm) / 10) * 10, STN.bonusMin, Math.max(STN.bonusMin, STN.bonusMax));
  STX.done.add(k); P.score += pay;
  const b = $('stuntBanner'); b.innerHTML = 'UNIQUE STUNT BONUS!<small>' + (s ? s.name : '') + ' · ' + Math.round(dm) + ' M · ' + money(pay) + '</small>'; b.hidden = false; STX.bannerT = 3.5;
  popup(c.x, c.y - 30, '+' + money(pay), '#3dffa6'); Snd.tone(660, 990, 0.12, 0.14, 'square'); setTimeout(() => Snd.tone(990, 1480, 0.16, 0.12, 'square'), 140);
}
function stuntNote(t) { toast(t); }
function stuntSave() { return [...STX.done]; }
function stuntLoad(v) { STX.done = new Set(Array.isArray(v) ? v.filter(k => Number.isInteger(k) && k >= 1 && k <= STUNTS.length) : []); }
function stuntReset() { STX.fly = null; STX.done = new Set(); STX.bannerT = 0; $('stuntBanner').hidden = true; }
function stuntGfx() {                     // js/13: the ramps only while the mode has them
  const on = stuntOn(); for (const s of STUNTS) if (s.lm && s.lm.mesh && s.lm.mesh.visible !== on) s.lm.mesh.visible = on;
}
function stuntIcons(g, X, Y, q, inView) {  // the big map: a tick where a jump is done (the rest stay hidden)
  if (!stuntOn()) return;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + Math.round(q * 1.5) + 'px Arial';
  for (const s of STUNTS) { if (!STX.done.has(s.k)) continue; const x = X(s.x), y = Y(s.y); if (!inView(x, y)) continue;
    g.fillStyle = '#000'; g.fillRect(x - q * 0.7 - 1, y - q * 0.7 - 1, q * 1.4 + 2, q * 1.4 + 2); g.fillStyle = '#ffd23f'; g.fillRect(x - q * 0.7, y - q * 0.7, q * 1.4, q * 1.4); g.fillStyle = '#16161c'; g.fillText('✓', x, y + q * 0.06); }
}
