'use strict';
/* ---------- 1k. AIRPORT SETTINGS ----------
   The Skyport airport (js/10f) and its planes (js/08i): how often they land and take off, how fast they go, what it takes to blow one
   up, and what breaks the airfield fence. tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited
   copy back:  python3 tools/settings_sheet.py airport export airport.numbers  /  ... airport import airport.numbers
   Keep the JSON between the markers valid. */
const AIRPORT_TABLE = /*AIRPORT-JSON*/{
"settings": [
  {"id": "every", "group": "Traffic", "name": "A plane lands or takes off every", "unit": "s", "min": 20, "max": 600, "v": 60, "note": "One movement at a time: a landing, the taxi to a gate and parking, or the push back, the taxi and the take-off."},
  {"id": "gatesMin", "group": "Traffic", "name": "Planes at the gates at least", "unit": "count", "min": 0, "max": 5, "v": 3, "note": "With fewer parked, the next movement is a landing. There are five gates."},
  {"id": "gatesMax", "group": "Traffic", "name": "Planes at the gates at most", "unit": "count", "min": 0, "max": 5, "v": 4, "note": "With more parked, the next movement is a take-off. In between they take turns."},
  {"id": "taxi", "group": "Speeds", "name": "Taxi speed", "unit": "km/h", "min": 5, "max": 80, "v": 32, "note": "On the taxiways and the apron; slower in the turns and into the gate."},
  {"id": "vTake", "group": "Speeds", "name": "Take-off speed", "unit": "km/h", "min": 80, "max": 400, "v": 170, "note": "The wheels leave the runway at this speed."},
  {"id": "takeRun", "group": "Speeds", "name": "Take-off run", "unit": "m", "min": 100, "max": 380, "v": 260, "note": "From standing to lift-off. The runway is about 400 m long."},
  {"id": "vLand", "group": "Speeds", "name": "Landing speed", "unit": "km/h", "min": 80, "max": 400, "v": 160, "note": "Speed on the approach and at touchdown."},
  {"id": "landRoll", "group": "Speeds", "name": "Landing roll", "unit": "m", "min": 60, "max": 300, "v": 165, "note": "From touchdown to taxi speed, braking hard."},
  {"id": "climb", "group": "Speeds", "name": "Climb and descent angle", "unit": "deg", "min": 2, "max": 20, "v": 7, "note": "How steeply they come in over the water and climb away over the city."},
  {"id": "hp", "group": "Damage", "name": "Gunfire to destroy a plane", "unit": "hp", "min": 50, "max": 20000, "v": 900, "note": "Like a car's health: a pistol round does about 15, a car about 200 to 400. Planes can be hit on the ground and low in the air."},
  {"id": "blastKill", "group": "Damage", "name": "A blast this close destroys it", "unit": "m", "min": 0, "max": 30, "v": 7, "note": "A rocket, grenade or burning car within this distance of the plane blows it up at once (fuel tanks); further away a blast only damages it."},
  {"id": "boom", "group": "Damage", "name": "Explosion radius", "unit": "m", "min": 5, "max": 40, "v": 17, "note": "The plane's own explosion; two smaller ones follow at the wing tanks."},
  {"id": "burn", "group": "Damage", "name": "The wreck burns for", "unit": "s", "min": 5, "max": 300, "v": 45, "note": "Then it is cleared away and the gate is free for a new plane."},
  {"id": "deadly", "group": "Damage", "name": "Runs over anything from", "unit": "km/h", "min": 1, "max": 60, "v": 6, "note": "A moving plane faster than this kills whoever it hits and wrecks cars; slower it only pushes them aside. Parked planes are solid."},
  {"id": "heat", "group": "Damage", "name": "Heat for destroying a plane", "unit": "count", "min": 0, "max": 9999, "v": 80, "note": "Wanted-level heat when you blow one up, seen or heard (police table, for comparison: killing someone 50, a rocket blast 30). Destroying pays nothing, like any vehicle."},
  {"id": "fenceKg", "group": "Fence", "name": "Vehicles that break the fence weigh from", "unit": "kg", "min": 500, "max": 50000, "v": 3300, "note": "Trucks, buses, the trash truck, fire engine, APC and tank (vehicle table: kg). Lighter cars bounce off."},
  {"id": "fenceKmh", "group": "Fence", "name": "... and hit it at least at", "unit": "km/h", "min": 1, "max": 150, "v": 20, "note": "Slower they just push against it."}
]
}/*END-AIRPORT-JSON*/;
/* AIRP: the same settings in game units: km/h and m become game speeds and distances, degrees radians */
const AIRP = (() => { const o = {}; for (const r of AIRPORT_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === 'deg' ? r.v * Math.PI / 180 : r.v; return o; })();
