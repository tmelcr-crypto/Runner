'use strict';
/* ---------- 1j. GAME MODES ----------
   FREE ROAM: the city as it is, no story - do as you like. STORY: missions told as a story, built later (ready: false shows it as
   COMING SOON on the New game screen). features: which features each mode has, yes or no per mode. Every new feature gets a row
   here - free roam, story or both - and the game asks feat(id) before using it. A saved game keeps its mode.
   settings: numbers that differ by mode (modeVal(id)), each with its unit and the range allowed.
   tools/mode_sheet.py exports the features and settings to Apple Numbers or Excel and reads an edited copy back. Keep the JSON valid. */
const MODE_TABLE = /*MODE-JSON*/{
"modes": [
  {"id": "free", "name": "FREE ROAM", "ready": true, "note": "The whole city and no story: steal cars, fight, shop, find weapons, play rampages."},
  {"id": "story", "name": "STORY", "ready": false, "note": "Missions told as a story. Coming later."}
],
"features": [
  {"id": "police", "name": "Police and wanted levels", "free": true, "story": true, "note": "Crimes add heat; stars, chases, arrests. Off: the police never come after you."},
  {"id": "hiddenWeapons", "name": "Weapons and ammo hidden around the city", "free": true, "story": true, "note": "The colour bubbles off the main streets; melee weapons in fixed places."},
  {"id": "hiddenItems", "name": "Health, body armor and heat reducers hidden", "free": true, "story": true, "note": "Their own colour bubbles, hidden like the weapons."},
  {"id": "stores", "name": "The six stores", "free": true, "story": true, "note": "Markers at their doors, the $ on the maps, the SHOP button and screen."},
  {"id": "rampages", "name": "Rampages", "free": true, "story": true, "note": "The twenty skulls: timed kill or wreck missions with a locked weapon."},
  {"id": "townCash", "name": "Cash stacks lying in town", "free": true, "story": true, "note": "The stacks of $100-300 on the sidewalks (economy table)."},
  {"id": "carCash", "name": "Cash in stolen and hijacked cars", "free": true, "story": true, "note": "Found once per car when you get in."},
  {"id": "loot", "name": "The dead drop cash and their weapon", "free": true, "story": true, "note": "Off: bodies leave nothing."},
  {"id": "armedPeople", "name": "Armed passers-by who fight back", "free": true, "story": true, "note": "Off: nobody on the street carries a weapon."},
  {"id": "hiddenCars", "name": "Hidden vehicles (the tank)", "free": true, "story": true, "note": "Vehicles waiting in far-away parking lots (vehicle table: hidden)."},
  {"id": "services", "name": "Ambulances and fire engines", "free": true, "story": true, "note": "Sent to bodies, blasts and burning wrecks."},
  {"id": "medics", "name": "Paramedics carry the dead to hospital", "free": true, "story": true, "note": "Two get out with a stretcher, take up to two bodies, drive them to the nearest hospital with lights and siren. Off: the body just goes."},
  {"id": "gibs", "name": "Blasts tear people apart", "free": true, "story": true, "note": "No body left: pieces fly and fade, a large blood mark stays."},
  {"id": "bloodShapes", "name": "Irregular blood marks", "free": true, "story": true, "note": "Every mark its own shape. Off: round marks."},
  {"id": "footPickups", "name": "Pickups only on foot", "free": true, "story": true, "note": "Weapons, ammo, health, armor, cash and loot are not taken from inside a car (heat reducers are: carHeat). Off: driving over them works."},
  {"id": "planes", "name": "Planes landing, taxiing and taking off", "free": true, "story": true, "note": "About one movement a minute at the airport; deadly, and a rocket or enough gunfire blows one up. Off: planes only stand at the gates."},
  {"id": "airportGates", "name": "Airport gate barriers and police guards", "free": true, "story": true, "note": "Stop at the barrier and it lifts; crash through and you are wanted. Off: the booms stay up and nobody guards them."},
  {"id": "base", "name": "Military base: warning, alarm, soldiers, armoury", "free": true, "story": true, "note": "5 s warning inside the fence, then 4 stars and soldiers firing; heavy weapons, ammo, tanks, APCs, a helicopter. Off: an empty base."},
  {"id": "ships", "name": "Cargo ships coming and going, cranes at work", "free": true, "story": true, "note": "A movement about every two minutes at the port. Off: the ships stay moored and the cranes still."},
  {"id": "lunapark", "name": "Lunapark rides running", "free": true, "story": true, "note": "The wheel, coasters, flume, tower, swings, carousel, pirate ship, sky ride and train. Off: they stand still."},
  {"id": "spaceGuards", "name": "Space center gate guards", "free": true, "story": true, "note": "Two guards at the shut gate. The way in (permission or certain clothes) comes with the story (docs/STORY.md)."},
  {"id": "trafficLights", "name": "Traffic lights and the rules of the road", "free": true, "story": true, "note": "Lights at every junction: cars stop on red, give way when turning across traffic and to people crossing; people cross on the walk signal. Off: dark lights, cars just give way at busy junctions."},
  {"id": "sirens", "name": "Sirens go through red, traffic pulls over", "free": true, "story": true, "note": "Ambulances and fire engines on a call and police after you cross red lights slowly; cars ahead move right and slow down. Off: they wait at red like everyone."},
  {"id": "roadHeat", "name": "A heat reducer on the road at 3 stars and up", "free": true, "story": true, "note": "One at a time in the middle of a street ahead of you, out of sight, not on the maps (streets table)."},
  {"id": "alleyHeat", "name": "Heat reducers in back alleys", "free": true, "story": true, "note": "Ten in fixed alleys, always showing, taken only while wanted, back two minutes after (streets table; story has its pickups share)."},
  {"id": "carHeat", "name": "Heat reducers taken from inside a car", "free": true, "story": true, "note": "Drive through one to lose a star. Everything else stays on foot only (footPickups)."}],
"settings": [
  {"id": "pickups", "name": "Hidden weapons, ammo and items on the map", "unit": "%", "min": 0, "max": 100, "free": 100, "story": 30, "note": "Share of the weapon and item tables' map counts (onMap, ammoMap) hidden around the city. Cash stacks and loot are not counted."}
]
}/*END-MODE-JSON*/;
const MODE = Object.fromEntries(MODE_TABLE.modes.map(m => [m.id, m])), FEAT = Object.fromEntries(MODE_TABLE.features.map(f => [f.id, f]));
let gameMode = 'free';                                                 // the mode being played; a saved game keeps its own
const feat = id => !FEAT[id] || !!FEAT[id][gameMode];                  // is this feature on in the mode being played (a feature not in the table: on)
const MSET = Object.fromEntries((MODE_TABLE.settings || []).map(s => [s.id, s]));
const modeVal = (id, def) => MSET[id] && MSET[id][gameMode] !== undefined ? MSET[id][gameMode] : def;   // a number set per mode
