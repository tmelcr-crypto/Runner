'use strict';
/* ---------- 1w. THE INTERIORS: HANGARS, WAREHOUSES, THE STORAGE YARD ----------
   Ten buildings you can walk and drive into, the roof see-through while you are inside (js/10z the models, js/08zx at work; mode:
   interiors): the airport's three hangars, three port warehouses and three more in the industrial streets of Dockside and Gravel
   Flats, and a storage yard of eight lock-up units. Inside: cash, guns and ammo in stashes, and four rare vehicles - the CLASSIC '62
   under a dust sheet in a storage unit, the RACE BIKE in a Dockside warehouse, the PROTOTYPE in a hangar and the ARMOURED VAN (money
   in the back) in a port warehouse. Open by day, workers about (taking things is a crime if they see it); shut at night, a guard with
   a torch and a pistol inside - ram the roller door or slip in at the side door; the alarm brings stars. Here: the hours, the night,
   the loot and the rare vehicles. tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited copy back:
   python3 tools/settings_sheet.py interiors export interiors.numbers  /  ... interiors import interiors.numbers
   (the money is also in tools/economy_sheet.py). Keep the JSON between the markers valid. */
const INTERIOR_TABLE = /*INTERIORS-JSON*/{
"settings": [
  {"id": "openFrom", "group": "Hours", "name": "Doors open from", "unit": "h", "min": 0, "max": 23, "v": 7, "note": "Game time. From then the roller doors are up and the workers are in."},
  {"id": "openTo", "group": "Hours", "name": "Doors shut at", "unit": "h", "min": 1, "max": 24, "v": 20, "note": "Game time. From then till morning: doors down, a night guard inside."},
  {"id": "workers", "group": "By day", "name": "Workers in each place", "unit": "count", "min": 0, "max": 4, "v": 2, "note": "They stand at work inside; if one sees you take something it is a crime (like stealing a car in front of someone)."},
  {"id": "guardSight", "group": "At night", "name": "The guard sees you within", "unit": "m", "min": 5, "max": 60, "v": 22, "note": "In front of him, in his torch's direction, with nothing in between."},
  {"id": "guardHp", "group": "At night", "name": "The guard's health", "unit": "hp", "min": 20, "max": 300, "v": 100, "note": "He carries a pistol and shoots once the alarm is on."},
  {"id": "alarmStars", "group": "At night", "name": "The alarm brings", "unit": "stars", "min": 0, "max": 5, "v": 2, "note": "When the guard sees you, or a roller door is rammed (0: no police, only the guard)."},
  {"id": "ramSpeed", "group": "At night", "name": "Ram a roller door at", "unit": "km/h", "min": 10, "max": 150, "v": 35, "note": "Driving into a shut roller door faster than this bursts it open (and sets off the alarm)."},
  {"id": "lockTime", "group": "At night", "name": "Forcing a lock takes", "unit": "s", "min": 0.5, "max": 10, "v": 2, "note": "On foot at a side door at night, or at a storage unit's lock, any time: hold still this long."},
  {"id": "stashes", "group": "Loot", "name": "Stashes in each place", "unit": "count", "min": 0, "max": 8, "v": 3, "note": "Crates and shelves with something in them (a storage unit: one at most)."},
  {"id": "cashShare", "group": "Loot", "name": "Stashes with cash", "unit": "%", "min": 0, "max": 100, "v": 50, "note": "The rest hold a gun or ammo (half and half)."},
  {"id": "cashMin", "group": "Loot", "name": "Cash in a stash, at least", "unit": "EUR", "min": 0, "max": 100000, "v": 400, "note": "Each stash a random amount between the two."},
  {"id": "cashMax", "group": "Loot", "name": "Cash in a stash, at most", "unit": "EUR", "min": 0, "max": 100000, "v": 2500, "note": ""},
  {"id": "restock", "group": "Loot", "name": "A stash is full again after", "unit": "game h", "min": 1, "max": 240, "v": 24, "note": "Game hours after you emptied it (24: a game day)."},
  {"id": "rareBack", "group": "Rare vehicles", "name": "A new one is back after", "unit": "game h", "min": 1, "max": 240, "v": 24, "note": "Game hours after you took it - if it was lost or left (one kept in your garage stays yours, and no new one comes)."},
  {"id": "vanCash", "group": "Rare vehicles", "name": "Money in the armoured van", "unit": "EUR", "min": 0, "max": 100000, "v": 8000, "note": "Yours the first time you get in a new van."}
]
}/*END-INTERIORS-JSON*/;
/* IXT: the same settings in game units: m and km/h become game distances and speeds, % a fraction */
const IXT = (() => { const o = {}; for (const r of INTERIOR_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === '%' ? r.v / 100 : r.v; return o; })();
