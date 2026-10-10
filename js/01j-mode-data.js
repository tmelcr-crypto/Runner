'use strict';
/* ---------- 1j. GAME MODES ----------
   FREE ROAM: the city as it is, no story - do as you like. STORY: missions told as a story, built later (ready: false shows it as
   COMING SOON on the New game screen). features: which features each mode has, yes or no per mode. Every new feature gets a row
   here - free roam, story or both - and the game asks feat(id) before using it. A saved game keeps its mode.
   tools/mode_sheet.py exports the features to Apple Numbers or Excel and reads an edited copy back. Keep the JSON valid. */
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
  {"id": "bloodShapes", "name": "Irregular blood marks", "free": true, "story": true, "note": "Every mark its own shape. Off: round marks."}
]
}/*END-MODE-JSON*/;
const MODE = Object.fromEntries(MODE_TABLE.modes.map(m => [m.id, m])), FEAT = Object.fromEntries(MODE_TABLE.features.map(f => [f.id, f]));
let gameMode = 'free';                                                 // the mode being played; a saved game keeps its own
const feat = id => !FEAT[id] || !!FEAT[id][gameMode];                  // is this feature on in the mode being played (a feature not in the table: on)
