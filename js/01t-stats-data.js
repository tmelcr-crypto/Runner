'use strict';
/* ---------- 1t. STATS AND 100% ----------
   What counts toward 100% (js/08zs; the STATS page in the pause menu) and the reward for reaching it. Each thing counts once - a
   safehouse, a rampage, a hidden weapon or item, a race, a job, a delivery, a spray garage - so the share done is the things done out
   of all of them. A group switched off here (or a feature switched off in the mode, js/01j) is left out of the count.
   tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited copy back:
     python3 tools/settings_sheet.py stats export stats.numbers  /  ... stats import stats.numbers
   Keep the JSON between the markers valid. */
const STATS_TABLE = /*STATS-JSON*/{
"settings": [
  {"id": "countSafes", "group": "Counts toward 100%", "name": "Safehouses bought", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Every safehouse with a price (the free room at the Colony is yours from the start)."},
  {"id": "countRampages", "group": "Counts toward 100%", "name": "Rampages passed", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Every rampage in the mode being played (free roam: the 20 and the 30 kill frenzies)."},
  {"id": "countWeapons", "group": "Counts toward 100%", "name": "Hidden weapons found", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Each kind of weapon that lies hidden, found once. Walking up to its bubble counts, even when you do not take it. Bought, dropped or from the base's armoury does not."},
  {"id": "countItems", "group": "Counts toward 100%", "name": "Hidden items found", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Health, body armor and the heat reducer, each found once where it lies hidden (not the one on the road)."},
  {"id": "countRaces", "group": "Counts toward 100%", "name": "Races won", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Each fixed street race, the NASCAR race and both drag strips, won once. Random street races and test runs do not count."},
  {"id": "countJobs", "group": "Counts toward 100%", "name": "Jobs to the level below", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Taxi, paramedic, firefighter and vigilante."},
  {"id": "jobLevel", "group": "Counts toward 100%", "name": "A job counts once you finish level", "unit": "level", "min": 1, "max": 30, "v": 10, "note": "Your best level in each job (the jobs table's reward comes earlier, at its own level)."},
  {"id": "deliveries", "group": "Counts toward 100%", "name": "Cars delivered at the docks", "unit": "count", "min": 0, "max": 50, "v": 10, "note": "Each one counts, up to this many. 0: deliveries are left out."},
  {"id": "countSprays", "group": "Counts toward 100%", "name": "Pay 'n' Spray garages used", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "Each garage once: a respray or a repair done there."},
  {"id": "topHealth", "group": "The reward at 100%", "name": "Health goes up to", "unit": "points", "min": 100, "max": 500, "v": 200, "note": "For the rest of the saved game; you are healed to the top when you reach 100%, and again each time you sleep."},
  {"id": "topArmor", "group": "The reward at 100%", "name": "Body armor goes up to", "unit": "points", "min": 100, "max": 500, "v": 200, "note": "The same for body armor."},
  {"id": "goldBack", "group": "The reward at 100%", "name": "A lost gold car is back in your garage after", "unit": "min", "min": 1, "max": 60, "v": 5, "note": "The gold car (vehicles table: gold) is one of a kind. Wrecked, crushed, sunk or left far away, a new one waits in your best garage after this long."}
]
}/*END-STATS-JSON*/;
/* STS: the same settings in game units: minutes become seconds (yes/no stays true or false) */
const STS = (() => { const o = {}; for (const r of STATS_TABLE.settings) o[r.id] = r.unit === 'min' ? r.v * 60 : r.v; return o; })();
