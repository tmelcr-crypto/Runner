'use strict';
/* ---------- 1l. PLACES SETTINGS ----------
   The airport gates, the military base, the port, the lunapark and the space center (js/08j, js/08k, js/10g, js/10h): guards and
   soldiers, the base's warning and stock, ship traffic, the rides. tools/settings_sheet.py exports this table to Apple Numbers or
   Excel and writes an edited copy back:  python3 tools/settings_sheet.py places export places.numbers  /  ... places import places.numbers
   Keep the JSON between the markers valid. */
const PLACES_TABLE = /*PLACES-JSON*/{
"settings": [
  {"id": "gateStop", "group": "Airport gates", "name": "Stop at the barrier for", "unit": "s", "min": 0.2, "max": 10, "v": 1.5, "note": "Stand still at an airport gate's barrier this long and the guard lifts it."},
  {"id": "gateStars", "group": "Airport gates", "name": "Crashing through the barrier gives", "unit": "stars", "min": 0, "max": 5, "v": 1, "note": "Wanted level for driving through without stopping (while a guard is there to see it)."},
  {"id": "gateGuards", "group": "Airport gates", "name": "Police guards per gate", "unit": "count", "min": 0, "max": 4, "v": 2, "note": "Officers standing by each booth. They act like police on foot."},
  {"id": "baseWarn", "group": "Military base", "name": "Warning before the alarm", "unit": "s", "min": 1, "max": 30, "v": 5, "note": "Inside the base fence a RESTRICTED AREA countdown runs; still inside when it ends, the alarm goes."},
  {"id": "baseStars", "group": "Military base", "name": "The alarm gives", "unit": "stars", "min": 1, "max": 5, "v": 4, "note": "Wanted level the moment the alarm goes."},
  {"id": "baseCalm", "group": "Military base", "name": "The alarm stops after you are out for", "unit": "s", "min": 5, "max": 600, "v": 60, "note": "Away from the base this long and the soldiers stand down (the police may still be after you)."},
  {"id": "soldiers", "group": "Military base", "name": "Soldiers", "unit": "count", "min": 0, "max": 40, "v": 16, "note": "Guards at the gate and the armoury, by the watchtowers, and patrols. Half carry an SMG, half a machine gun."},
  {"id": "soldierHp", "group": "Military base", "name": "Soldier health", "unit": "hp", "min": 10, "max": 500, "v": 90, "note": "A passer-by has 30, a cop 45."},
  {"id": "soldierRange", "group": "Military base", "name": "Soldiers fire from", "unit": "m", "min": 5, "max": 120, "v": 45, "note": "They need a clear line of sight (fences do not block it)."},
  {"id": "soldierAcc", "group": "Military base", "name": "Soldier hit chance", "unit": "%", "min": 0, "max": 100, "v": 35, "note": "Per shot, at middle range."},
  {"id": "soldierDmg", "group": "Military base", "name": "Damage per soldier hit", "unit": "hp", "min": 1, "max": 100, "v": 9, "note": "To you on foot; a car takes four times as much."},
  {"id": "soldierBack", "group": "Military base", "name": "A dead soldier is replaced after", "unit": "s", "min": 10, "max": 3600, "v": 180, "note": "Only while you are away from the base."},
  {"id": "restock", "group": "Military base", "name": "Armoury, vehicles and helicopter restock after", "unit": "min", "min": 0.5, "max": 120, "v": 3, "note": "What you took or destroyed comes back this long after you left the base."},
  {"id": "armWeapons", "group": "Military base", "name": "Heavy weapons in the armoury", "unit": "count", "min": 0, "max": 40, "v": 12, "note": "Rocket launchers, machine guns, sniper rifles, shotguns, SMGs, grenades and pipe bombs on racks."},
  {"id": "armAmmo", "group": "Military base", "name": "Ammo boxes in the ammo store", "unit": "count", "min": 0, "max": 60, "v": 18, "note": "Every kind of ammunition, in the fenced store inside the armoury."},
  {"id": "heliHp", "group": "Military base", "name": "Helicopter health", "unit": "hp", "min": 10, "max": 20000, "v": 600, "note": "The helicopter on the pad: gunfire wears it down, a blast close by blows it up."},
  {"id": "shipEvery", "group": "Port", "name": "A ship arrives or sails every", "unit": "s", "min": 30, "max": 1800, "v": 120, "note": "One movement at a time: in from the sea to a free berth, or out to sea."},
  {"id": "shipsMin", "group": "Port", "name": "Ships at the berths at least", "unit": "count", "min": 0, "max": 5, "v": 3, "note": "Fewer moored and the next movement is an arrival. There are five berths."},
  {"id": "shipsMax", "group": "Port", "name": "Ships at the berths at most", "unit": "count", "min": 0, "max": 5, "v": 4, "note": "More moored and the next movement is a departure."},
  {"id": "shipSpeed", "group": "Port", "name": "Ship speed", "unit": "km/h", "min": 3, "max": 60, "v": 16, "note": "At sea; they slow down as they come alongside and are pushed in sideways by tugs."},
  {"id": "craneCycle", "group": "Port", "name": "A crane moves a container every", "unit": "s", "min": 5, "max": 120, "v": 22, "note": "While its ship is moored the crane lifts containers between the ship and the quay."},
  {"id": "visitors", "group": "Lunapark", "name": "Visitors around you", "unit": "count", "min": 0, "max": 80, "v": 30, "note": "People strolling inside the lunapark while you are there."},
  {"id": "wheelRpm", "group": "Lunapark", "name": "Ferris wheel turns per minute", "unit": "count", "min": 0, "max": 6, "v": 1, "note": "0 stops it."},
  {"id": "coaster", "group": "Lunapark", "name": "Coaster top speed", "unit": "km/h", "min": 20, "max": 160, "v": 75, "note": "At the bottom of the first drop; the trains speed up and slow down with the hills."},
  {"id": "spaceGuards", "group": "Space center", "name": "Guards at the space center gate", "unit": "count", "min": 0, "max": 4, "v": 2, "note": "The gate stays shut for now: the way in comes with the story."}
]
}/*END-PLACES-JSON*/;
/* PLC: the same settings in game units: km/h and m become game speeds and distances, minutes seconds, % a fraction */
const PLC = (() => { const o = {}; for (const r of PLACES_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === 'min' ? r.v * 60 : r.unit === '%' ? r.v / 100 : r.v; return o; })();
