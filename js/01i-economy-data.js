'use strict';
/* ---------- 1i. ECONOMY: WHAT YOU EARN ----------
   Your score is your cash. Where money comes from, in euros: a single value (v), or a random amount from min to max each time.
   Killing pays nothing by itself - the dead drop a cash stack (and the weapon they carried) you have to pick up; destroying pays
   nothing. The rest of the economy lives with what it belongs to: store prices in the weapon table (js/01f: a weapon and its ammo)
   and the item table (js/01g), rampage rewards in js/01h, the fine, bail and the hospital bill in the police table (js/01b).
   tools/economy_sheet.py puts all of it in one spreadsheet - column A the action or the commodity, column B its price (from), C up
   to - and writes an edited copy back to each table. Keep the JSON between the markers valid. */
const ECONOMY_TABLE = /*ECONOMY-JSON*/{
"earn": [
  {"id": "carCash", "name": "Cash found in a stolen or hijacked car", "unit": "€", "min": 4, "max": 120, "note": "Once per car, when you get in - an empty car you steal or one you pull the driver out of."},
  {"id": "pedCash", "name": "Cash dropped by a person killed", "unit": "€", "min": 1, "max": 30, "note": "A cash stack by the body: walk over it. Anyone killed drops it, whoever killed them."},
  {"id": "copCash", "name": "Cash dropped by a police officer killed", "unit": "€", "min": 20, "max": 80, "note": "With the officer's pistol."},
  {"id": "townCash", "name": "Cash stack lying in town", "unit": "€", "min": 100, "max": 300, "note": "On a sidewalk anywhere in town, not on the maps. One taken comes back somewhere else."},
  {"id": "townN", "name": "Cash stacks in town at a time", "unit": "count", "v": 10, "note": "How many lie around at once."},
  {"id": "dropTime", "name": "Dropped cash and weapons stay for", "unit": "s", "v": 60, "note": "They blink for the last 10 s, then vanish."},
  {"id": "carBoom", "name": "Blowing up a vehicle", "unit": "€", "v": 0, "note": "Destroying pays nothing."},
  {"id": "copCarBoom", "name": "Blowing up a police vehicle", "unit": "€", "v": 0, "note": "Destroying pays nothing."}
]
}/*END-ECONOMY-JSON*/;
const ECO = Object.fromEntries(ECONOMY_TABLE.earn.map(r => [r.id, r.min != null ? [Math.max(0, +r.min || 0), Math.max(+r.min || 0, +r.max || 0)] : Math.max(0, +r.v || 0)]));
const ecoRoll = id => { const v = ECO[id]; return Array.isArray(v) ? v[0] + Math.floor(Math.random() * (v[1] - v[0] + 1)) : v; };   // an amount: random between min and max
