'use strict';
/* ---------- 1i. ECONOMY: WHAT YOU EARN ----------
   Your score is your cash. What each deed pays, in dollars. The rest of the economy lives with what it belongs to: store prices in
   the weapon table (js/01f: a weapon and its ammo) and the item table (js/01g), rampage rewards in js/01h, the fine, bail and the
   hospital bill in the police table (js/01b). tools/economy_sheet.py puts all of it in one spreadsheet - column A the action or the
   commodity, column B its price - and writes an edited copy back to each table. Keep the JSON between the markers valid. */
const ECONOMY_TABLE = /*ECONOMY-JSON*/{
"earn": [
  {"id": "carjack", "name": "Carjacking (pulling a driver out)", "v": 50, "note": "Stealing a car someone is driving. An empty car pays nothing."},
  {"id": "roadkill", "name": "Running someone over", "v": 100, "note": "A person killed by the car you drive (ROADKILL)."},
  {"id": "takedown", "name": "Taking someone down", "v": 50, "note": "A person killed on foot: fists, melee, guns, bombs, blasts."},
  {"id": "copKill", "name": "Killing a police officer", "v": 200, "note": "COP DOWN. Adds a lot of heat."},
  {"id": "carBoom", "name": "Blowing up a vehicle", "v": 60, "note": "Any vehicle you wrecked that blows up (BOOM)."},
  {"id": "copCarBoom", "name": "Blowing up a police vehicle", "v": 300, "note": "Instead of the vehicle price above."},
  {"id": "cash", "name": "Cash pickup on the sidewalk", "v": 500, "note": "The green bundles lying on the sidewalks (also on the maps)."}
]
}/*END-ECONOMY-JSON*/;
const ECO = Object.fromEntries(ECONOMY_TABLE.earn.map(r => [r.id, Math.max(0, Math.round(+r.v || 0))]));
