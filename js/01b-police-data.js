'use strict';
/* ---------- 1b. POLICE SETTINGS ----------
   Every number the police work with, in everyday units (metres, seconds, km/h, %). The game converts them when it starts (COP below).
   tools/police_sheet.py exports this table to a spreadsheet for iOS Numbers or Excel and writes an edited copy back:
     python3 tools/police_sheet.py export police.xlsx
     python3 tools/police_sheet.py import police.xlsx
   The tool reads and rewrites the JSON between the two markers, so keep it valid JSON (double quotes, no trailing commas).
   levels: one value per wanted level, 1 to 5 stars. settings: one value each. crimes: the heat a crime adds. */
const POLICE_TABLE = /*POLICE-JSON*/{
"levels": [
  {"id": "heat", "name": "Heat needed", "unit": "points", "min": 1, "max": 9999, "v": [20, 50, 90, 140, 200], "note": "Heat you need for this level. Crimes the police see or hear add heat (Crimes sheet). Each level must need more than the one before."},
  {"id": "stop", "name": "Stop order and fine", "unit": "yes/no", "v": [true, false, false, false, false], "note": "YES: a cop who sees you near orders you to stop. Stand still and you pay a fine and the stars go; keep moving and it becomes 2 stars. NO: they try to arrest you."},
  {"id": "cars", "name": "Police cars after you", "unit": "count", "min": 0, "max": 20, "v": [1, 2, 3, 5, 7], "note": "Most police cars chasing or searching for you at once. Patrol cars nearby join first; the rest are sent from further away."},
  {"id": "respond", "name": "Patrol cars join from within", "unit": "m", "min": 0, "max": 180, "v": [100, 150, 180, 180, 180], "note": "A patrol car this close to where you were last seen joins at once. Cars further than about 180 m away are not in the game, so more has no effect."},
  {"id": "delay", "name": "First car sent after", "unit": "s", "min": 0, "max": 300, "v": [15, 8, 5, 3, 2], "note": "Seconds from the report until the first car sent from further away arrives (when the patrol cars nearby are not enough)."},
  {"id": "every", "name": "Then another car every", "unit": "s", "min": 0.5, "max": 300, "v": [20, 10, 6, 4, 3], "note": "Seconds between further cars sent, until there are as many as Police cars after you."},
  {"id": "officers", "name": "Extra officers on foot", "unit": "count", "min": 0, "max": 20, "v": [0, 0, 2, 4, 6], "note": "Officers sent on foot while you are on foot, besides the crews that get out of their cars."},
  {"id": "speed", "name": "Chase speed up to", "unit": "km/h", "min": 20, "max": 220, "v": [70, 110, 130, 150, 170], "note": "Fastest the police cars drive at this level (a police car does 220 km/h at most)."},
  {"id": "ram", "name": "Cars ram you", "unit": "yes/no", "v": [false, false, true, true, true], "note": "YES: police cars drive straight into you. NO: they follow you and pull up beside you when you stop, and the crew gets out."},
  {"id": "shoot", "name": "Shoot on sight", "unit": "yes/no", "v": [false, false, true, true, true], "note": "YES: cops on foot shoot at you (after one warning). NO: they only shoot when Shoot back if attacked says so."},
  {"id": "shootBack", "name": "Shoot back if attacked", "unit": "yes/no", "v": [false, true, true, true, true], "note": "YES: cops shoot for a while after you fire a gun where they see or hear it, ram a police car or hurt a cop (Settings: Remember you as armed)."},
  {"id": "searchMax", "name": "Search area grows to", "unit": "m", "min": 5, "max": 400, "v": [60, 80, 100, 120, 140], "note": "Largest radius of the search area around the spot where you were last seen (the red circle on the map)."},
  {"id": "lose", "name": "Out of sight to lose them", "unit": "s", "min": 1, "max": 600, "v": [12, 20, 30, 40, 50], "note": "Seconds no cop may see you before they give up and the stars go. Inside the search area the time runs slower (Settings)."}
],
"settings": [
  {"id": "sight", "group": "Seeing", "name": "Sight range", "unit": "m", "min": 5, "max": 150, "v": 37.5, "note": "How far a cop sees you, inside the field of view and with nothing in between."},
  {"id": "fov", "group": "Seeing", "name": "Field of view", "unit": "deg", "min": 10, "max": 360, "v": 80, "note": "The cone in front of a cop (or a police car) in which they see you."},
  {"id": "track", "group": "Seeing", "name": "Keep watching for", "unit": "s", "min": 0, "max": 10, "v": 1.5, "note": "A cop who has just seen you keeps you in view all round (not only in the cone) for this long, while nothing is in between."},
  {"id": "blastHear", "group": "Seeing", "name": "Explosions heard within", "unit": "m", "min": 0, "max": 200, "v": 25, "note": "A cop this close hears an explosion and knows it was you."},
  {"id": "impactHear", "group": "Seeing", "name": "Bullet hits heard within", "unit": "m", "min": 0, "max": 50, "v": 4, "note": "A cop this close to where a bullet lands notices it. (How far a gunshot is heard is set per weapon.)"},
  {"id": "footPatrols", "group": "Patrols", "name": "Foot patrols around", "unit": "count", "min": 0, "max": 20, "v": 2, "note": "Cops walking the sidewalks within about 120 m of you, wherever you are."},
  {"id": "trafficShare", "group": "Patrols", "name": "Police cars in traffic", "unit": "%", "min": 0, "max": 100, "v": 5, "note": "Share of the moving traffic that is a patrol car."},
  {"id": "searchStart", "group": "Search", "name": "Search area at first", "unit": "m", "min": 1, "max": 200, "v": 15, "note": "Radius of the search area the moment they lose sight of you."},
  {"id": "searchGrow", "group": "Search", "name": "Search area grows by", "unit": "m/s", "min": 0, "max": 50, "v": 3, "note": "How fast the search area widens while they cannot see you (up to the level's Search area grows to)."},
  {"id": "insideRate", "group": "Search", "name": "Losing them inside the area", "unit": "%", "min": 0, "max": 100, "v": 35, "note": "While you are still inside the search area the lose-them time runs at this % (0 = you must get out of the area)."},
  {"id": "searchSpeed", "group": "Search", "name": "Searching cars drive at", "unit": "km/h", "min": 10, "max": 150, "v": 40, "note": "Police cars cruise the streets of the search area at this speed."},
  {"id": "coolBelow", "group": "Search", "name": "Heat fades with no stars", "unit": "points/s", "min": 0, "max": 50, "v": 1, "note": "Heat below 1 star fades by this much each second, from 5 s after your last crime."},
  {"id": "stopRange", "group": "Stop order", "name": "Stop order from within", "unit": "m", "min": 1, "max": 100, "v": 20, "note": "A cop who sees you this close gives the stop order (levels with Stop order and fine)."},
  {"id": "still", "group": "Stop order", "name": "Standing still means under", "unit": "km/h", "min": 0.5, "max": 30, "v": 4, "note": "Slower than this on foot or in a car counts as stopped."},
  {"id": "stopHold", "group": "Stop order", "name": "Stand still for", "unit": "s", "min": 0, "max": 30, "v": 3, "note": "Stay stopped this long, with a cop near, to get the fine and lose the stars."},
  {"id": "fine", "group": "Stop order", "name": "Fine", "unit": "points", "min": 0, "max": 100000, "v": 250, "note": "Taken off your score (never below 0)."},
  {"id": "stopIgnore", "group": "Stop order", "name": "Ignoring the order for", "unit": "s", "min": 0, "max": 30, "v": 3, "note": "Keep moving this long while they can see you after the order and it becomes 2 stars (resisting)."},
  {"id": "pullUp", "group": "Arrest", "name": "Cars pull up at", "unit": "m", "min": 2, "max": 30, "v": 6, "note": "A police car that does not ram stops about this far from you; then the crew gets out."},
  {"id": "bustReach", "group": "Arrest", "name": "Arrest reach on foot", "unit": "m", "min": 0.5, "max": 10, "v": 1.6, "note": "How close a cop must get to grab you when you are on foot."},
  {"id": "bustCarSpeed", "group": "Arrest", "name": "Pulled out of a car under", "unit": "km/h", "min": 0, "max": 100, "v": 12, "note": "A cop next to your car can pull you out while it is slower than this."},
  {"id": "bustTime", "group": "Arrest", "name": "Held for", "unit": "s", "min": 0, "max": 10, "v": 1, "note": "A cop must hold you this long to arrest you; get away before that and you are free."},
  {"id": "footSpeed", "group": "Arrest", "name": "Cops run at", "unit": "m/s", "min": 1, "max": 12, "v": 5.5, "note": "Running speed of cops on foot. You run at 5.75 m/s and sprint at 8."},
  {"id": "warn", "group": "Shooting", "name": "Warning before shooting", "unit": "s", "min": 0, "max": 20, "v": 1.5, "note": "When the police may first shoot they shout a warning and wait this long."},
  {"id": "fireRange", "group": "Shooting", "name": "Shooting range", "unit": "m", "min": 1, "max": 200, "v": 27, "note": "Cops only shoot this close, with a clear line to you."},
  {"id": "accNear", "group": "Shooting", "name": "Hit chance close up", "unit": "%", "min": 0, "max": 100, "v": 35, "note": "Chance a shot hits you point blank. It falls off with distance to Hit chance at full range."},
  {"id": "accFar", "group": "Shooting", "name": "Hit chance at full range", "unit": "%", "min": 0, "max": 100, "v": 8, "note": "Chance a shot hits you at the end of the shooting range."},
  {"id": "gapMin", "group": "Shooting", "name": "Time between shots from", "unit": "s", "min": 0.1, "max": 10, "v": 0.6, "note": "Each cop waits a random time between this and the next value before shooting again."},
  {"id": "gapMax", "group": "Shooting", "name": "Time between shots to", "unit": "s", "min": 0.1, "max": 10, "v": 1.1, "note": "Must not be less than Time between shots from."},
  {"id": "dmgFoot", "group": "Shooting", "name": "Damage to you per hit", "unit": "hp", "min": 0, "max": 100, "v": 6, "note": "You have 100 health."},
  {"id": "dmgCar", "group": "Shooting", "name": "Damage to your car per hit", "unit": "hp", "min": 0, "max": 500, "v": 5, "note": "A sedan has 100, a truck 220."},
  {"id": "armedFor", "group": "Shooting", "name": "Remember you as armed for", "unit": "s", "min": 0, "max": 600, "v": 30, "note": "How long Shoot back if attacked lasts after you fire where they see or hear it, ram a police car or hurt a cop."},
  {"id": "bystanders", "group": "Shooting", "name": "Hold fire near bystanders", "unit": "yes/no", "v": true, "note": "YES: a cop does not shoot while a passer-by is in the line of fire."},
  {"id": "respawn", "group": "Busted and wasted", "name": "Carry on after busted or wasted", "unit": "yes/no", "v": true, "note": "YES: you start again at the nearest police station (busted) or hospital (wasted). NO: the game ends, as before."},
  {"id": "bustedCash", "group": "Busted and wasted", "name": "Busted: score lost", "unit": "%", "min": 0, "max": 100, "v": 10, "note": "Bail: this share of your score."},
  {"id": "bustedWeapons", "group": "Busted and wasted", "name": "Busted: weapons taken", "unit": "yes/no", "v": true, "note": "YES: you keep only the pistol with its starting ammo."},
  {"id": "wastedCash", "group": "Busted and wasted", "name": "Wasted: score lost", "unit": "%", "min": 0, "max": 100, "v": 10, "note": "Hospital bill: this share of your score."},
  {"id": "wastedWeapons", "group": "Busted and wasted", "name": "Wasted: weapons lost", "unit": "yes/no", "v": false, "note": "YES: you keep only the pistol with its starting ammo."}
],
"crimes": [
  {"id": "steal", "name": "Steal a parked car", "unit": "points", "min": 0, "max": 500, "v": 5, "note": "Only when a cop sees it, like every crime below that says seen."},
  {"id": "carjack", "name": "Carjack a driver (seen)", "unit": "points", "min": 0, "max": 500, "v": 20, "note": ""},
  {"id": "stealCop", "name": "Steal an empty police car (seen)", "unit": "points", "min": 0, "max": 500, "v": 30, "note": ""},
  {"id": "carjackCop", "name": "Carjack a police car", "unit": "points", "min": 0, "max": 500, "v": 50, "note": "The crew always sees it."},
  {"id": "runOver", "name": "Run someone over (seen)", "unit": "points", "min": 0, "max": 500, "v": 20, "note": ""},
  {"id": "kill", "name": "Kill someone (seen)", "unit": "points", "min": 0, "max": 500, "v": 50, "note": "With a gun or an explosion."},
  {"id": "hurtCop", "name": "Hurt a cop", "unit": "points", "min": 0, "max": 500, "v": 50, "note": "Always counts, seen or not."},
  {"id": "killCop", "name": "Kill a cop", "unit": "points", "min": 0, "max": 500, "v": 70, "note": "Always counts, seen or not."},
  {"id": "ramCop", "name": "Damage a police car, per 10 damage (seen)", "unit": "points", "min": 0, "max": 100, "v": 2.5, "note": "A hard crash does 10 to 40 damage."},
  {"id": "ramCopMax", "name": "Damage a police car, most per hit", "unit": "points", "min": 0, "max": 500, "v": 8, "note": ""},
  {"id": "copCarBoom", "name": "Blow up a police car (seen or heard)", "unit": "points", "min": 0, "max": 500, "v": 25, "note": ""},
  {"id": "blast", "name": "Rocket explosion (seen or heard)", "unit": "points", "min": 0, "max": 500, "v": 30, "note": ""},
  {"id": "gunfire", "name": "Gunshot (seen or heard)", "unit": "%", "min": 0, "max": 1000, "v": 100, "note": "Percent of the weapon's own heat per shot: pistol 3.2, machine gun 1.5, sniper rifle 6, rocket launch 10."}
]
}/*END-POLICE-JSON*/;

/* COP: the same numbers in game units. COP.sight, COP.fine ... for settings; COP.lv.cars[stars] ... per level (index 0 = no stars);
   COP.crime.carjack ... for crimes. Metres and m/s become game units (12 to the metre), km/h game units per second, % a fraction,
   degrees radians, yes/no true / false. */
const COP = (() => {
  const k = { m: MPS, 'm/s': MPS, 'km/h': KMH, '%': 0.01, deg: Math.PI / 180 };
  const conv = (u, v) => u === 'yes/no' ? !!v : v * (k[u] || 1);
  const o = { lv: {}, crime: {} };
  for (const r of POLICE_TABLE.settings) o[r.id] = conv(r.unit, r.v);
  for (const r of POLICE_TABLE.levels) o.lv[r.id] = [r.unit === 'yes/no' ? false : 0].concat(r.v.map(v => conv(r.unit, v)));
  for (const r of POLICE_TABLE.crimes) o.crime[r.id] = conv(r.unit, r.v);
  o.lv.heat[0] = 0;
  return o;
})();
