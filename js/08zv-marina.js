'use strict';
/* ---------- 6zv. SUNSET HARBOR and the boats (map remodel 16: MAP.marina; boats: the vehicles table's boat bodies, js/01c) ----------
   Boats are vehicles that stay on the water: they drive like cars with little grip (they slide through turns), water drag slows them
   when you let go, and the shore and the piers push them back (a hard hit damages them). A wrecked boat burns and sinks.
   (Work in progress: the marina's moored boats, the shop, boat traffic, swimming and the police boat come next.) */
const MARINA = MAP.marina || null;
function boatShore(c) {                   // js/07 after collideCarWorld: a boat is held on the water; a hard knock against the shore hurts it
  if (c.dead && c.sunk) return;
  const fx = Math.cos(c.ang), fy = Math.sin(c.ang), m = c.t.wid * 0.45 + 2;
  for (const k of [0, 0.42, -0.42]) {                                 // its middle, bow and stern
    const x = c.x + fx * c.t.len * k, y = c.y + fy * c.t.len * k, sd = shoreDist(x, y);
    if (sd > 60) { c.beached = true; continue; }                      // well up on land (dropped there): it does not move
    if (sd <= -m) continue;
    const g = shoreGrad(x, y), pen = sd + m, vin = c.vx * g[0] + c.vy * g[1];
    c.x -= g[0] * pen; c.y -= g[1] * pen;
    if (vin > 0) { c.vx -= vin * g[0] * 1.4; c.vy -= vin * g[1] * 1.4; if (vin > 140 && c.hitCd <= 0) { c.hitCd = 0.2; damageCar(c, (vin - 140) * 0.12, false); splashFx(x, y, 6); } }
  }
}
