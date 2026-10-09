'use strict';
/* ---------- 6c5. ARMED PEOPLE AND LOOT ----------
   Some passers-by carry a weapon - which, and how many, is the weapon table's "Carried by people" (js/01f; p.arm). Hurt them, pull
   them out of their car, or kill someone close to them, and they fight back instead of running: a gun is fired at you like a cop
   fires (the police table's accuracy and damage), a melee weapon swung when they reach you. They give up when you get away or after
   a while. People brought in for a rampage carry nothing (js/08f). Anyone killed drops a cash stack and the weapon they carried
   (cops: more cash, and their pistol); both blink for their last 10 seconds and vanish (js/01i). */
const NPC_RUN = 4.2 * MPS, NPC_GIVEUP = 700, NPC_ANGRY = 45;
function provoke(p) {                    // an armed passer-by turns on you; false if they have nothing to fight with
  if (!p || p.dead || p.cop || !(p.arm >= 0)) return false;
  if (!p.hostile) { p.hostile = true; p.hostT = 0; p.cool = rand(0.5, 1); }
  p.state = 'fight'; return true;
}
function calmDown(p) {                    // you got away, or they have had enough: back to walking
  p.hostile = false; p.hostT = 0; p.state = 'walk'; p.swingT = 0;
  if (p.stroll) strollTarget(p); else snapPed(p);
}
function fightBack(p, dt) {              // js/08 updatePeds, every frame while they are after you; false once they give up
  const w = WEAPONS[p.arm], tgt = P.car || P, d = dist(p.x, p.y, tgt.x, tgt.y);
  p.hostT += dt; p.cool -= dt; p.swingT = Math.max(0, (p.swingT || 0) - dt);
  if (!w || P.dead || d > NPC_GIVEUP || p.hostT > NPC_ANGRY) { calmDown(p); return false; }
  const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), ux = Math.cos(a), uy = Math.sin(a); p.ang = a;
  if (isMelee(w)) {                                                  // run up and swing
    const reach = w.reach + 16 + (P.car ? P.car.t.wid / 2 : 0);
    if (P.car && carSpeed(P.car) > 60) stepCop(p, -ux, -uy, NPC_RUN * 0.6, dt);   // out of the way of a moving car
    else if (d > reach) stepCop(p, ux, uy, NPC_RUN, dt);
    else {
      stepCop(p, 0, 0, 0, dt);
      if (p.cool <= 0) {
        p.cool = w.rate * 2.6 + rand(0, 0.4); p.swingT = 0.25; Snd.melee(w.sound, false);
        if (P.car) damageCar(P.car, w.dmg * w.carDmg, false); else damagePlayer(Math.min(15, w.dmg * 0.3));   // people hit softer than you do
      }
    }
  } else {                                                           // a gun: get a clear shot, keep a little distance, fire like a cop
    const range = Math.min(w.range, COP.fireRange), see = losClear(p.x, p.y, tgt.x, tgt.y, true);
    if (!see || d > range * 0.8) stepCop(p, ux, uy, NPC_RUN, dt);
    else if (d < 80) stepCop(p, -ux, -uy, NPC_RUN * 0.5, dt);
    else stepCop(p, 0, 0, 0, dt);
    if (see && d < range && p.cool <= 0) {
      p.cool = rand(0.9, 1.7); p.flash = 0.06;
      tracers.push({ x1: p.x + ux * 14, y1: p.y + uy * 14, x2: tgt.x + rand(-14, 14), y2: tgt.y + rand(-14, 14), life: 0.07 });
      Snd.tone(900, 200, 0.05, 0.06, 'square'); alertPeds(p.x, p.y, 200, true);
      if (Math.random() < lerp(COP.accNear, COP.accFar, clamp(d / COP.fireRange, 0, 1))) { if (P.car) damageCar(P.car, COP.dmgCar, false); else damagePlayer(COP.dmgFoot); }
    }
  }
  return true;
}
const PISTOL = WEAPONS.findIndex(w => w.id === 'pistol');
function dropLoot(p, cop) {              // a body: a cash stack and the weapon they carried, for ECO.dropTime seconds (js/01i)
  if (!feat('loot')) return;                                       // a mode without loot (js/01j)
  const until = gameT + ECO.dropTime, a = rand(0, TAU), at = (r, s) => { const x = p.x + Math.cos(a) * r * s, y = p.y + Math.sin(a) * r * s; return pedBlocked(x, y) ? [p.x, p.y] : [x, y]; };
  const amt = ecoRoll(cop ? 'copCash' : 'pedCash');
  if (amt > 0) { const [x, y] = at(9, 1); pickups.push({ x, y, type: 'cash', amt, drop: true, until, bob: rand(0, 6) }); }
  const wi = cop ? PISTOL : (p.arm >= 0 ? p.arm : -1);
  if (wi >= 0) { const [x, y] = at(11, -1); WPICKS.push({ x, y, wi, ammo: false, item: null, key: 'd' + wi, fixed: false, spot: null, drop: true, until, bob: rand(0, 6), mesh: null }); }
}
