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
  {"id": "carHeat", "name": "Heat reducers taken from inside a car", "free": true, "story": true, "note": "Drive through one to lose a star. Everything else stays on foot only (footPickups)."},
  {"id": "driveBy", "name": "Drive-by: guns fire from a car", "free": true, "story": true, "note": "With a gun that can (weapon table: Fires from a car) FIRE shoots out of the car at the nearest target ahead. Off: only the tank's rockets and dropped bombs."},
  {"id": "carGrenades", "name": "Grenades into your hand in a car", "free": true, "story": true, "note": "Getting into a car without its own weapon: grenades (or pipe bombs) to drop out of the window, unless you hold a drive-by gun; back to your weapon when you get out."},
  {"id": "waterCannon", "name": "The fire engine's water cannon", "free": true, "story": true, "note": "Driving the fire engine, FIRE sprays a jet: people knocked down and pushed, cars pushed, fires put out (streets table). Off: FIRE does nothing in it."},
  {"id": "clothes", "name": "Ten clothes shops", "free": true, "story": true, "note": "Try on and buy hats, glasses, tops, bottoms and shoes; your wardrobe at every shop; new clothes lose the police up to 3 stars when unseen (clothes table). Off: no shops, you keep your clothes."},
  {"id": "carDelivery", "name": "Car delivery at the docks", "free": true, "story": true, "note": "The export bay at the port wants one car at a time (kind and colour): park it there, get out, a crane loads it on a ship and you are paid. Not while wanted. Off: no bay, no crane."},
  {"id": "taxiJob", "name": "Taxi job", "free": true, "story": true, "note": "In a taxi at a taxi rank: the rank sends you to fares and they tell you where to go; levels, pay and tips (jobs table). The reward: nitro in taxis. Off: no ranks, no job."},
  {"id": "medicJob", "name": "Paramedic job", "free": true, "story": true, "note": "In an ambulance at a hospital: patients lie about the city, up to 3 aboard, then to any hospital (jobs table). The reward: more health. Off: no job."},
  {"id": "fireJob", "name": "Firefighter job", "free": true, "story": true, "note": "In a fire engine at a fire station: put out burning cars with the water cannon before the time runs out (jobs table). The reward: fireproof. Off: no fire stations on the maps, no job."},
  {"id": "vigilanteJob", "name": "Vigilante job", "free": true, "story": true, "note": "In a police car at a police station: take down criminals fleeing in cars; from level 5 they shoot back (jobs table). The reward: more body armor. Off: no job."},
  {"id": "streetRaces", "name": "Street races", "free": true, "story": true, "note": "Phone booths ring now and then: five fixed routes and random ones, five rivals, a fee and prizes by place (races table). Off: no calls, booths stay quiet."},
  {"id": "speedway", "name": "Speedway: NASCAR race", "free": true, "story": true, "note": "The small oval on the Palm Heights beach: the race booth in its paddock puts you on the grid in a NASCAR special - 8 cars, 5 laps. A NASCAR special stands in the paddock. Off: no race, no car in the paddock (the speedway stays)."},
  {"id": "dragStrip", "name": "Speedway: drag strip", "free": true, "story": true, "note": "Two drag strips, each started at its own booth: the Palm strip beside the speedway (201 m) and the Sandbar strip on the east beach (600 m). Race a rival for a fee and a prize, or a free test run (top speed, 0-100, splits). Off: no runs."},
  {"id": "moreProps", "name": "Benches, meters, phone boxes, planters, bushes and umbrellas break", "free": true, "story": true, "note": "Under a car: benches, parking meters and beach umbrellas fly, a phone box's glass shatters, planters break, bushes are flattened. Off: cars drive through them."},
  {"id": "guideLine", "name": "A lime guide line on the streets", "free": true, "story": true, "note": "While a street race or a job is on, or you drive the car wanted at the docks: a faded lime line a bike wide along the way by road, also on the maps. Off: markers and map dots only."},
  {"id": "sprayGarage", "name": "Pay 'n' Spray garages", "free": true, "story": true, "note": "Four garages: drive in, the door shuts, pick any colour - repainted and repaired for €100 (places table); unseen going in, the police lose you. Police and army vehicles are turned away."},
  {"id": "tankRockets", "name": "The police tank fires rockets at you", "free": true, "story": true, "note": "At the top wanted level, every 4 s with a clear line, aimed a little ahead (police table: Tank and APC)."},
  {"id": "apcGun", "name": "APC turret machine gun", "free": true, "story": true, "note": "Driving an APC, FIRE shoots the turret at the nearest target ahead (belts of 100, the machine gun's reload); police APCs fire bursts at you when they see you."},
  {"id": "edgeGlow", "name": "Lime glow on the screen edge toward a target", "free": true, "story": true, "note": "Toward a ringing phone booth, and toward the guide line's target (fare, race start or checkpoint, export bay) whenever it is off screen."},
  {"id": "carPark", "name": "The lunapark car park: parked cars, the barrier", "free": true, "story": true, "note": "Cars parked on every deck, and the barrier at the way in that lifts when you stop. Off: the decks stand empty and the barrier stays up."}
],
"settings": [
  {"id": "pickups", "name": "Hidden weapons, ammo and items on the map", "unit": "%", "min": 0, "max": 100, "free": 100, "story": 30, "note": "Share of the weapon and item tables' map counts (onMap, ammoMap) hidden around the city. Cash stacks and loot are not counted."}
]
}/*END-MODE-JSON*/;
const MODE = Object.fromEntries(MODE_TABLE.modes.map(m => [m.id, m])), FEAT = Object.fromEntries(MODE_TABLE.features.map(f => [f.id, f]));
let gameMode = 'free';                                                 // the mode being played; a saved game keeps its own
const feat = id => !FEAT[id] || !!FEAT[id][gameMode];                  // is this feature on in the mode being played (a feature not in the table: on)
const MSET = Object.fromEntries((MODE_TABLE.settings || []).map(s => [s.id, s]));
const modeVal = (id, def) => MSET[id] && MSET[id][gameMode] !== undefined ? MSET[id][gameMode] : def;   // a number set per mode
