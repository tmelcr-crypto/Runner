'use strict';
/* ---------- 1o. VEHICLE JOBS ----------
   The four jobs (js/08n), each started at its dispatch point in its own vehicle: TAXI at a taxi rank in a taxi, PARAMEDIC at a hospital
   in an ambulance, FIREFIGHTER at a fire station in a fire engine, VIGILANTE at a police station in a police car. Stop in the marker and
   the START card shows. Level 1 asks for one fare, patient, burning car or criminal car, each level after for more; every one of them
   adds time to the clock and pays, and a finished level pays its bonus. Reaching the reward level once gives a lasting reward.
   tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited copy back:
     python3 tools/settings_sheet.py jobs export jobs.numbers  /  ... jobs import jobs.numbers
   Keep the JSON between the markers valid. */
const JOBS_TABLE = /*JOBS-JSON*/{
"settings": [
  {"id": "firstCount", "group": "All jobs", "name": "Level 1 asks for", "unit": "count", "min": 1, "max": 10, "v": 1, "note": "Fares, patients, burning cars or criminal cars."},
  {"id": "moreCount", "group": "All jobs", "name": "Each level after asks for this many more", "unit": "count", "min": 0, "max": 5, "v": 1, "note": "With 1: level 2 asks for 2, level 3 for 3, and so on."},
  {"id": "rewardLevel", "group": "All jobs", "name": "The lasting reward comes with level", "unit": "level", "min": 2, "max": 30, "v": 12, "note": "Reached once, the reward stays with the saved game. The rewards are below, with each job."},
  {"id": "levelPay", "group": "All jobs", "name": "A finished level pays this, times the level", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "Level 3 done: 3 times this. On top of what each fare, patient, fire or criminal pays."},
  {"id": "outMax", "group": "All jobs", "name": "A job ends when you are out of the vehicle for", "unit": "s", "min": 3, "max": 60, "v": 10, "note": "It also ends when the time runs out or the vehicle is wrecked. Police stars do not end it."},
  {"id": "stopSpeed", "group": "All jobs", "name": "Stopped means slower than", "unit": "km/h", "min": 2, "max": 30, "v": 8, "note": "To open the START card in a marker, to pick someone up and to drop them off."},
  {"id": "ranks", "group": "Dispatch points", "name": "Taxi ranks in the city", "unit": "count", "min": 1, "max": 8, "v": 4, "note": "Always the same streets, well spread. On the minimap and the city map."},
  {"id": "rankCabs", "group": "Dispatch points", "name": "Cabs waiting at each rank", "unit": "count", "min": 0, "max": 3, "v": 2, "note": "A cab taken is back while you are away."},
  {"id": "stations", "group": "Dispatch points", "name": "Fire stations in the city", "unit": "count", "min": 1, "max": 5, "v": 3, "note": "Red buildings with bay doors, well spread. On the minimap and the city map."},
  {"id": "engines", "group": "Dispatch points", "name": "Fire engines parked at each station", "unit": "count", "min": 0, "max": 2, "v": 1, "note": "In the station's yard. An engine taken is back while you are away."},
  {"id": "taxiNear", "group": "Taxi", "name": "A call comes from at least", "unit": "m", "min": 30, "max": 1000, "v": 120, "note": "From you, by road. The rank sends you to the pickup, then the fare tells you where to go."},
  {"id": "taxiFar", "group": "Taxi", "name": "and at most", "unit": "m", "min": 60, "max": 2000, "v": 450, "note": ""},
  {"id": "tripNear", "group": "Taxi", "name": "A trip is at least", "unit": "m", "min": 50, "max": 2000, "v": 250, "note": "By road, from the pickup to the destination."},
  {"id": "tripFar", "group": "Taxi", "name": "and at most", "unit": "m", "min": 100, "max": 4000, "v": 1000, "note": ""},
  {"id": "taxiSpeed", "group": "Taxi", "name": "The clock gives time as if you drove at", "unit": "km/h", "min": 10, "max": 150, "v": 35, "note": "Over the road distance, for the way to the pickup and again for the trip."},
  {"id": "taxiExtra", "group": "Taxi", "name": "Plus, for each pickup and each trip", "unit": "s", "min": 0, "max": 120, "v": 10, "note": ""},
  {"id": "fareBase", "group": "Taxi", "name": "A fare pays", "unit": "€", "min": 0, "max": 1000, "v": 15, "note": "When you drop the fare off, plus the price by distance below."},
  {"id": "farePerKm", "group": "Taxi", "name": "plus, per km of the trip", "unit": "€", "min": 0, "max": 1000, "v": 40, "note": "By road."},
  {"id": "tipMax", "group": "Taxi", "name": "A fast trip tips up to", "unit": "%", "min": 0, "max": 200, "v": 50, "note": "Of the fare: the more of the trip's time is left, the bigger the tip."},
  {"id": "crashTip", "group": "Taxi", "name": "Each crash with a fare aboard takes off the tip", "unit": "%", "min": 0, "max": 100, "v": 10, "note": "Percentage points of the fare. The tip never goes below 0."},
  {"id": "nitroPush", "group": "Taxi", "name": "Reward, nitro in taxis: more pull", "unit": "%", "min": 0, "max": 300, "v": 100, "note": "From the reward level: NITRO in a taxi (Shift or N on a keyboard). Extra acceleration while it burns."},
  {"id": "nitroTop", "group": "Taxi", "name": "Nitro: more top speed", "unit": "%", "min": 0, "max": 100, "v": 30, "note": ""},
  {"id": "nitroLasts", "group": "Taxi", "name": "Nitro burns for", "unit": "s", "min": 0.5, "max": 10, "v": 3, "note": ""},
  {"id": "nitroBack", "group": "Taxi", "name": "Nitro is ready again after", "unit": "s", "min": 1, "max": 60, "v": 10, "note": "Counted from when it runs out."},
  {"id": "medNear", "group": "Paramedic", "name": "Patients lie at least", "unit": "m", "min": 30, "max": 1000, "v": 100, "note": "From you, by road, when the level starts. All of a level's patients are out at once."},
  {"id": "medFar", "group": "Paramedic", "name": "and at most", "unit": "m", "min": 60, "max": 2000, "v": 500, "note": ""},
  {"id": "medCarry", "group": "Paramedic", "name": "The ambulance carries up to", "unit": "count", "min": 1, "max": 6, "v": 3, "note": "Patients at once; then to any hospital."},
  {"id": "medSpeed", "group": "Paramedic", "name": "The clock gives time as if you drove at", "unit": "km/h", "min": 10, "max": 150, "v": 35, "note": "Over the road distance to each patient, and to the hospital once you have them aboard."},
  {"id": "medExtra", "group": "Paramedic", "name": "Plus, for each patient and each hospital run", "unit": "s", "min": 0, "max": 120, "v": 8, "note": ""},
  {"id": "medCrash", "group": "Paramedic", "name": "A crash with patients aboard costs", "unit": "s", "min": 0, "max": 30, "v": 3, "note": "Off the clock. Drive gently."},
  {"id": "medPay", "group": "Paramedic", "name": "A patient brought in pays", "unit": "€", "min": 0, "max": 1000, "v": 40, "note": "Plus the amount below times the level."},
  {"id": "medPayLevel", "group": "Paramedic", "name": "plus, times the level", "unit": "€", "min": 0, "max": 1000, "v": 10, "note": ""},
  {"id": "medHealth", "group": "Paramedic", "name": "Reward: more health", "unit": "points", "min": 0, "max": 200, "v": 50, "note": "Your health goes up to 100 plus this."},
  {"id": "fireNear", "group": "Firefighter", "name": "A burning car is at least", "unit": "m", "min": 30, "max": 1000, "v": 120, "note": "From you, by road."},
  {"id": "fireFar", "group": "Firefighter", "name": "and at most", "unit": "m", "min": 60, "max": 2000, "v": 500, "note": ""},
  {"id": "fireAtOnce", "group": "Firefighter", "name": "Burning at once, at most", "unit": "count", "min": 1, "max": 6, "v": 3, "note": "A level asks for more: the next catches fire as one is put out."},
  {"id": "fireSpeed", "group": "Firefighter", "name": "The clock gives time as if you drove at", "unit": "km/h", "min": 10, "max": 150, "v": 35, "note": "Over the road distance to each fire. When the time runs out the burning cars blow up."},
  {"id": "fireExtra", "group": "Firefighter", "name": "Plus, for each fire", "unit": "s", "min": 0, "max": 120, "v": 12, "note": ""},
  {"id": "fireSpray", "group": "Firefighter", "name": "A burning car is out after spraying it for", "unit": "s", "min": 0.2, "max": 10, "v": 1.5, "note": "With the water cannon (FIRE in the fire engine)."},
  {"id": "firePay", "group": "Firefighter", "name": "A fire put out pays", "unit": "€", "min": 0, "max": 1000, "v": 60, "note": "Plus the amount below times the level."},
  {"id": "firePayLevel", "group": "Firefighter", "name": "plus, times the level", "unit": "€", "min": 0, "max": 1000, "v": 15, "note": ""},
  {"id": "fireproof", "group": "Firefighter", "name": "Reward, fireproof: blasts still hurt you", "unit": "%", "min": 0, "max": 100, "v": 50, "note": "Of the usual damage. And the car you are in blowing up does not hurt you at all."},
  {"id": "vigNear", "group": "Vigilante", "name": "A criminal car is at least", "unit": "m", "min": 30, "max": 1000, "v": 150, "note": "From you, by road. It drives on like traffic until you come close, then flees."},
  {"id": "vigFar", "group": "Vigilante", "name": "and at most", "unit": "m", "min": 60, "max": 2000, "v": 500, "note": ""},
  {"id": "vigSpeed", "group": "Vigilante", "name": "The clock gives time as if you drove at", "unit": "km/h", "min": 10, "max": 150, "v": 40, "note": "Over the road distance to each criminal car."},
  {"id": "vigExtra", "group": "Vigilante", "name": "Plus, for each criminal car", "unit": "s", "min": 0, "max": 180, "v": 40, "note": "For the chase."},
  {"id": "vigFlee", "group": "Vigilante", "name": "Criminals flee at up to", "unit": "km/h", "min": 30, "max": 250, "v": 100, "note": "Through red lights."},
  {"id": "vigSee", "group": "Vigilante", "name": "They start to flee when you are within", "unit": "m", "min": 10, "max": 300, "v": 60, "note": ""},
  {"id": "vigBail", "group": "Vigilante", "name": "They get out and run when their car is down to", "unit": "%", "min": 0, "max": 90, "v": 35, "note": "Of its health. Then take them down on foot or with the car; a wrecked car with them inside counts too."},
  {"id": "vigShootFrom", "group": "Vigilante", "name": "Criminals shoot back from level", "unit": "level", "min": 1, "max": 30, "v": 5, "note": "From their car, and on foot once out."},
  {"id": "vigTwoFrom", "group": "Vigilante", "name": "Two criminal cars at once from level", "unit": "level", "min": 1, "max": 30, "v": 8, "note": ""},
  {"id": "vigCrew", "group": "Vigilante", "name": "People in a criminal car", "unit": "count", "min": 1, "max": 3, "v": 2, "note": "They all get out when it is badly damaged."},
  {"id": "vigEscape", "group": "Vigilante", "name": "They get away when this far from you", "unit": "m", "min": 100, "max": 2000, "v": 400, "note": "Then the job ends."},
  {"id": "vigPay", "group": "Vigilante", "name": "A criminal car taken down pays", "unit": "€", "min": 0, "max": 2000, "v": 100, "note": "Plus the amount below times the level."},
  {"id": "vigPayLevel", "group": "Vigilante", "name": "plus, times the level", "unit": "€", "min": 0, "max": 1000, "v": 25, "note": ""},
  {"id": "vigArmor", "group": "Vigilante", "name": "Reward: more body armor", "unit": "points", "min": 0, "max": 200, "v": 50, "note": "Body armor goes up to 100 plus this."}
]
}/*END-JOBS-JSON*/;
/* JB: the same settings in game units: km/h and m become game speeds and distances, % a fraction */
const JB = (() => { const o = {}; for (const r of JOBS_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === '%' ? r.v / 100 : r.v; return o; })();
