'use strict';
/* ---------- 6zv. SUNSET HARBOR and the boats (map remodel 16: MAP.marina; boats: the vehicles table's boat bodies, js/01c) ----------
   Boats are vehicles that stay on the water: they drive like cars with little grip (they slide through turns), water drag slows them
   when you let go, and the shore and the piers push them back (a hard hit damages them). A wrecked boat burns and sinks.
   (Work in progress: the marina's moored boats, the shop, boat traffic, swimming and the police boat come next.) */
const MARINA = MAP.marina || null;
const SWIM_IN = 18, SWIM_OUT = 12;                                    // deeper than this you swim; shallower again, you wade out

/* ---------- swimming (modes: swim) ---------- */
function swimCheck() {                     // js/06 on foot: in deep water you swim (under the bridges too: their decks are water for a swimmer)
  if (!feat('swim')) { P.swim = false; return; }
  P.swim = P.swim ? boatDist(P.x, P.y) < -SWIM_OUT : shoreDist(P.x, P.y) < -SWIM_IN;
}
function drownTick(dt) {                   // js/06 in a car gone into the water: get out before it is under
  const c = P.car; if (!c || !P.drown) return;
  const was = Math.ceil(P.drown); P.drown = Math.max(0, P.drown - dt);
  if (Math.ceil(P.drown) !== was && P.drown > 0) { toast('THE CAR IS SINKING - GET OUT! ' + Math.ceil(P.drown), true); Snd.tone(330, 220, 0.08, 0.1, 'square'); }
  if (P.drown <= 0) { P.drown = 0; c.driver = null; $('wasted').textContent = 'DROWNED'; killPlayer(); }
}
function boatShore(c) {                   // js/07 after collideCarWorld: a boat is held on the water; a hard knock against the shore hurts it
  if (c.sunk) return;
  if (c.dead) {                                                       // wrecked: it burns a while, then goes under (you are thrown in the water)
    c.wreckT = (c.wreckT || 0) + 1 / 60;
    if (c.wreckT > 5) { c.sunk = true; c.sinkT = 0; c.burn = 0; splashFx(c.x, c.y, 30); if (P.car === c) exitCar(true); c.driver = null; }
    return;
  }
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), m = c.t.wid * 0.45 + 2;
  c.under = shoreDist(c.x, c.y) > -m * 0.5;                           // under a bridge: drawn low, out of sight below the deck (js/11)
  for (const k of [0, 0.42, -0.42]) {                                 // its middle, bow and stern
    const x = c.x + fx * c.t.len * k, y = c.y + fy * c.t.len * k, sd = boatDist(x, y);   // the bridges' decks count as water: under them (js/04)
    if (sd > 60) { c.beached = true; continue; }                      // well up on land (dropped there): it does not move
    if (sd <= -m) continue;
    const g = boatGrad(x, y), pen = sd + m, vin = c.vx * g[0] + c.vy * g[1];
    c.x -= g[0] * pen; c.y -= g[1] * pen;
    if (vin > 0) { c.vx -= vin * g[0] * 1.4; c.vy -= vin * g[1] * 1.4; if (vin > 140 && c.hitCd <= 0) { c.hitCd = 0.2; damageCar(c, (vin - 140) * 0.12, false); splashFx(x, y, 6); } }
  }
}
