'use strict';
/* ---------- 1c. VEHICLES ----------
   Every vehicle in the game, in everyday units: length and width in metres, speeds in km/h, braking in m/s², weight in kg.
   tools/vehicle_sheet.py exports this table to a spreadsheet for Apple Numbers or Excel and writes an edited copy back:
     python3 tools/vehicle_sheet.py export vehicles.numbers
     python3 tools/vehicle_sheet.py import vehicles.numbers
   The tool reads and rewrites the JSON between the two markers, so keep it valid JSON.
   body: the 3D model (js/11). role police: patrols, joins chases from chaseFrom stars on (chase = how often it is sent).
   traffic / parked: how often it drives in traffic / stands parked. hidden: how many stand at secret spots. job: trash / ambulance / fire.
   weapon rockets: FIRE launches rockets when you drive it; water: FIRE sprays the water cannon (js/08c). shifter: the look of the gear selector on a touch screen. accTo at or above top speed means "the time to reach top speed". */
const VEHICLE_TABLE = /*VEHICLE-JSON*/{
"vehicles": [
  {"id": "sedan", "name": "SEDAN", "body": "sedan", "role": "civilian", "len": 4.5, "wid": 2.17, "top": 180, "accTo": 100, "accS": 7, "brake": 9.5, "steer": 2.7, "grip": 5.5, "hp": 200, "kg": 1400, "armored": false, "traffic": 30, "parked": 2, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "auto", "colors": ["#ff2bd6", "#2bf3ff", "#a259ff", "#ffe14a", "#3dffa6", "#6f86ff"], "notes": "The everyday car."},
  {"id": "sports", "name": "SPORTS", "body": "sports", "role": "civilian", "len": 3.2, "wid": 2, "top": 260, "accTo": 100, "accS": 4, "brake": 10.5, "steer": 3, "grip": 3.4, "hp": 180, "kg": 1190, "armored": false, "traffic": 11, "parked": 1, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "sport", "colors": ["#ff2bd6", "#ffe14a", "#2bf3ff", "#ff4d4d"], "notes": "Fast, fragile, slides easily."},
  {"id": "truck", "name": "TRUCK", "body": "truck", "role": "civilian", "len": 6.5, "wid": 2.75, "top": 130, "accTo": 100, "accS": 12, "brake": 7.5, "steer": 1.9, "grip": 6.5, "hp": 400, "kg": 3360, "armored": false, "traffic": 15, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "tall", "colors": ["#3d6fff", "#ff7a3d", "#3dffa6", "#b79cff"], "notes": "Box truck; too wide to park at the kerb."},
  {"id": "police", "name": "POLICE", "body": "police", "role": "police", "len": 4.5, "wid": 2.17, "top": 220, "accTo": 100, "accS": 5.5, "brake": 10, "steer": 2.9, "grip": 5, "hp": 130, "kg": 1540, "armored": false, "traffic": 5, "parked": 0, "chase": 1, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "auto", "colors": ["#171a24"], "notes": "Patrols in traffic; chases you when you are wanted."},
  {"id": "bus", "name": "BUS", "body": "bus", "role": "civilian", "len": 10, "wid": 2.75, "top": 100, "accTo": 100, "accS": 27, "brake": 7, "steer": 1, "grip": 7, "hp": 400, "kg": 4500, "armored": false, "traffic": 3, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "tall", "colors": ["#ffd23f", "#ff9d2b"], "notes": "Slow, do not park,"},
  {"id": "trash", "name": "TRASH", "body": "trash", "role": "civilian", "len": 7, "wid": 2.75, "top": 80, "accTo": 100, "accS": 16, "brake": 6.3, "steer": 1.3, "grip": 6.5, "hp": 400, "kg": 5700, "armored": true, "traffic": 1, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "trash", "weapon": "", "shifter": "tall", "colors": ["#2fbf71", "#3a8f5c"], "notes": "Stoping near trsh containers"},
  {"id": "ambulance", "name": "AMBULANCE", "body": "ambulance", "role": "civilian", "len": 6, "wid": 2.75, "top": 147, "accTo": 100, "accS": 10, "brake": 10, "steer": 2, "grip": 6.5, "hp": 250, "kg": 2923, "armored": false, "traffic": 2, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "ambulance", "weapon": "", "shifter": "tall", "colors": ["#f4f4f6"], "notes": "Coming for killed npcs"},
  {"id": "fire", "name": "FIREX", "body": "fire", "role": "civilian", "len": 8, "wid": 2.75, "top": 120, "accTo": 100, "accS": 12, "brake": 6.5, "steer": 1.8, "grip": 7, "hp": 334, "kg": 5000, "armored": false, "traffic": 2, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "fire", "weapon": "water", "shifter": "tall", "colors": ["#e0364f"], "notes": "Comming toward fires and blasts"},
  {"id": "tank", "name": "TANK", "body": "tank", "role": "police", "len": 6, "wid": 2.75, "top": 80, "accTo": 100, "accS": 30, "brake": 30, "steer": 4.7, "grip": 3, "hp": 15000, "kg": 27000, "armored": true, "traffic": 0, "parked": 0, "chase": 0.1, "chaseFrom": 5, "hidden": 1, "job": "", "weapon": "rockets", "shifter": "throttle", "colors": ["#5c6b3a"], "notes": "Only chase you while max heat, 1 hidden on map, can shoot rockets"},
  {"id": "apc", "name": "APC", "body": "apc", "role": "police", "len": 5, "wid": 2.7, "top": 130, "accTo": 100, "accS": 12, "brake": 14, "steer": 3.1, "grip": 4.3, "hp": 477, "kg": 3700, "armored": true, "traffic": 1, "parked": 0, "chase": 0.2, "chaseFrom": 3, "hidden": 0, "job": "", "weapon": "", "shifter": "throttle", "colors": ["#1d2a5a"], "notes": "Same as police heat 3star up"},
  {"id": "estate", "name": "ESTATE", "body": "estate", "role": "civilian", "len": 5.5, "wid": 2.3, "top": 180, "accTo": 100, "accS": 9, "brake": 10, "steer": 3.1, "grip": 6.5, "hp": 200, "kg": 1500, "armored": false, "traffic": 30, "parked": 1, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "auto", "colors": ["#3dffa6", "#ff7a3d", "#6f86ff", "#ffe14a", "#c9c9d6"], "notes": "Common"},
  {"id": "bike", "name": "MBIKE", "body": "bike", "role": "civilian", "len": 3, "wid": 1.5, "top": 330, "accTo": 100, "accS": 3, "brake": 15.3, "steer": 4, "grip": 7, "hp": 80, "kg": 350, "armored": false, "traffic": 5, "parked": 1, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "bar", "colors": ["#ff2bd6", "#2bf3ff", "#ffe14a", "#ff4d4d"], "notes": "Only for passanger super fast."},
  {"id": "pickup", "name": "PICKUP", "body": "pickup", "role": "civilian", "len": 6.5, "wid": 2.4, "top": 150, "accTo": 100, "accS": 7.7, "brake": 10.7, "steer": 2.7, "grip": 5.7, "hp": 250, "kg": 2700, "armored": false, "traffic": 10, "parked": 1, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "auto", "colors": ["#ff7a3d", "#3d6fff", "#c0c4cc", "#2fbf71"], "notes": "Common"},
  {"id": "limo", "name": "LIMO", "body": "limo", "role": "civilian", "len": 10, "wid": 2.33, "top": 144, "accTo": 100, "accS": 14.7, "brake": 12, "steer": 2.1, "grip": 6.5, "hp": 253, "kg": 3000, "armored": false, "traffic": 2, "parked": 0, "chase": 0, "chaseFrom": 1, "hidden": 0, "job": "", "weapon": "", "shifter": "auto", "colors": ["#111116", "#f4f4f6"], "notes": "Slow wide turns"}
]
}/*END-VEHICLE-JSON*/;

/* CAR_TYPES: the same vehicles in game units (12 units to the metre). acc is the throttle force that reaches accTo km/h in accS seconds. */
const CAR_TYPES = (() => {
  const force = (top, to, secs) => -top * KMH * Math.log(1 - Math.min(to, top * 0.9) / top) / secs;
  const o = {};
  for (const v of VEHICLE_TABLE.vehicles) o[v.id] = {
    id: v.id, name: v.name, body: v.body === 'new' ? 'sedan' : v.body, cop: v.role === 'police', len: v.len * UNITS_PER_M, wid: v.wid * UNITS_PER_M,
    max: v.top * KMH, acc: force(v.top, v.accTo, v.accS), brake: v.brake * MPS, turn: v.steer, grip: v.grip, hp: v.hp, mass: v.kg / 1400, armored: v.armored,
    traffic: v.traffic, parked: v.parked, chase: v.chase, chaseFrom: v.chaseFrom, hidden: v.hidden, job: v.job, weapon: v.weapon, shifter: v.shifter || 'auto',
    colors: v.colors.length ? v.colors : ['#c8c8d0'] };
  return o;
})();
const KERB_W = 2.33 * UNITS_PER_M, STALL_W = 2.5 * UNITS_PER_M;   // widest vehicle for the kerb parking lane / a parking lot stall
function pickType(weight, ok) {          // a vehicle type at random, by one of its weights (traffic, parked, chase), among those ok() allows
  let sum = 0; for (const k in CAR_TYPES) if (!ok || ok(CAR_TYPES[k])) sum += CAR_TYPES[k][weight];
  let r = Math.random() * sum, last = null; if (sum <= 0) return null;
  for (const k in CAR_TYPES) { const t = CAR_TYPES[k]; if ((ok && !ok(t)) || t[weight] <= 0) continue; last = k; if ((r -= t[weight]) <= 0) return k; }
  return last;
}
