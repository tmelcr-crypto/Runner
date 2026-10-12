'use strict';
/* ---------- 1m. STREETS SETTINGS ----------
   Traffic lights and the rules of the road (js/07b), the walk signals at the crossings, lights and sirens, the heat reducers lying
   on the road or in the back alleys (js/08d), the visitors at the Colony and the cement works (js/08x), and the city's own sound (js/02d). tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited
   copy back:  python3 tools/settings_sheet.py streets export streets.numbers  /  ... streets import streets.numbers
   Keep the JSON between the markers valid. */
const STREETS_TABLE = /*STREETS-JSON*/{
"settings": [
  {"id": "green", "group": "Traffic lights", "name": "Green lasts", "unit": "s", "min": 4, "max": 60, "v": 12, "note": "Every junction has lights. Opposite approaches get green together; at a T-junction the side road has its own turn."},
  {"id": "amber", "group": "Traffic lights", "name": "Amber lasts", "unit": "s", "min": 1, "max": 6, "v": 3, "note": "On amber a driver stops if there is room to stop; too close and the car goes on."},
  {"id": "allRed", "group": "Traffic lights", "name": "All red between turns", "unit": "s", "min": 0, "max": 5, "v": 1.5, "note": "Every approach red for a moment, so the junction clears before the next green."},
  {"id": "turnGap", "group": "Drivers", "name": "Turning across traffic waits for a gap of", "unit": "s", "min": 1, "max": 10, "v": 4, "note": "A car turning across the oncoming lane gives way until no oncoming car would get there within this time."},
  {"id": "walkMin", "group": "Pedestrians", "name": "People start crossing with at least", "unit": "s", "min": 2, "max": 30, "v": 7, "note": "Walk time left on the signal. With less, people wait at the kerb for the next walk signal."},
  {"id": "sirenRed", "group": "Lights and sirens", "name": "Ambulances and fire engines cross a red light at", "unit": "km/h", "min": 5, "max": 80, "v": 25, "note": "On a call they go through red lights, slowly, and wait for cars already crossing."},
  {"id": "copRed", "group": "Lights and sirens", "name": "Police in a chase cross a red light at", "unit": "km/h", "min": 5, "max": 150, "v": 45, "note": "Police cars after you slow down to this at a junction where their light is not green."},
  {"id": "pullDist", "group": "Lights and sirens", "name": "Traffic pulls over for a siren within", "unit": "m", "min": 5, "max": 100, "v": 30, "note": "A car with a siren this close behind moves to the right and slows down to let it pass."},
  {"id": "pullSide", "group": "Lights and sirens", "name": "Pulling over moves a car right by", "unit": "m", "min": 0, "max": 2, "v": 1, "note": "Further and it would hit the cars parked at the kerb."},
  {"id": "pullSlow", "group": "Lights and sirens", "name": "A car pulling over slows to", "unit": "%", "min": 0, "max": 100, "v": 40, "note": "Of its usual speed. Waiting at a red light it rolls slowly over the junction instead, to make room."},
  {"id": "roadStars", "group": "Heat reducers", "name": "A heat reducer lies on the road from", "unit": "stars", "min": 1, "max": 5, "v": 3, "note": "One at a time, in the middle of a street ahead of you, just out of sight. Not on the maps. It goes when you drop below this level."},
  {"id": "roadAhead", "group": "Heat reducers", "name": "It lies ahead of you at about", "unit": "m", "min": 30, "max": 300, "v": 70, "note": "Measured from you; at least out of sight, in the direction you are going."},
  {"id": "roadBack", "group": "Heat reducers", "name": "The next one comes after", "unit": "s", "min": 5, "max": 600, "v": 30, "note": "After the last one was taken or left far behind."},
  {"id": "roadLeave", "group": "Heat reducers", "name": "Left behind once you are this far from it", "unit": "m", "min": 50, "max": 500, "v": 170, "note": "Then it goes and the next one comes after the wait above."},
  {"id": "alleyCount", "group": "Heat reducers", "name": "Heat reducers in back alleys", "unit": "count", "min": 0, "max": 30, "v": 10, "note": "Always in the same alleys and always showing, but only taken while you are wanted. Story mode has its share of them (modes table, pickups)."},
  {"id": "waterRange", "group": "Water cannon", "name": "The fire engine's water cannon reaches", "unit": "m", "min": 5, "max": 60, "v": 25, "note": "When you drive the fire engine FIRE sprays a jet straight ahead, this far."},
  {"id": "waterKnock", "group": "Water cannon", "name": "Someone hit by the jet stays down for", "unit": "s", "min": 0, "max": 10, "v": 2.5, "note": "People and cops are knocked down; no damage. Spraying people counts like a punch for the police."},
  {"id": "waterPush", "group": "Water cannon", "name": "The jet pushes people away at", "unit": "m", "min": 0, "max": 15, "v": 4, "note": "Metres per second while they are in the jet."},
  {"id": "waterCarPush", "group": "Water cannon", "name": "The jet pushes a car of 1.4 t at", "unit": "m", "min": 0, "max": 20, "v": 3, "note": "Metres per second per second; heavier vehicles move less. Burning cars are put out (they stay wrecks)."},
  {"id": "alleyBack", "group": "Heat reducers", "name": "An alley heat reducer comes back after", "unit": "min", "min": 0.5, "max": 30, "v": 2, "note": "In the same spot. Every heat reducer is taken from inside a car too."},
  {"id": "visitEvery", "group": "Visitors", "name": "A visitor turns in about every", "unit": "s", "min": 3, "max": 600, "v": 25, "note": "At the Colony and at the cement works, each on its own, while you are near: a car in the traffic just before the junction turns into the site's street and parks there (js/08x). Mode: visitors."},
  {"id": "visitMax", "group": "Visitors", "name": "Visitors' cars at a site at most", "unit": "count", "min": 0, "max": 12, "v": 3, "note": "Parked there or on the way in or out."},
  {"id": "visitStayMin", "group": "Visitors", "name": "A visit lasts at least", "unit": "s", "min": 5, "max": 1200, "v": 40, "note": "From parking until someone walks out to the car."},
  {"id": "visitStayMax", "group": "Visitors", "name": "... and at most", "unit": "s", "min": 5, "max": 1200, "v": 150, "note": "A random time between the two."},
  {"id": "visitNear", "group": "Visitors", "name": "Visits happen while you are within", "unit": "m", "min": 50, "max": 600, "v": 220, "note": "Distance from the site's car park; farther away nobody comes or goes."},
  {"id": "csVolume", "group": "City sound", "name": "City sound volume", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Everything below together. 0 switches the city sound off."},
  {"id": "csTraffic", "group": "City sound", "name": "Traffic hum and tyres", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Grows with the moving cars around you; quieter at night when there are fewer."},
  {"id": "csHorns", "group": "City sound", "name": "Horns and brakes", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Drivers honk when they are stuck or you are in their way; brakes squeal when a car stops hard."},
  {"id": "csHornAfter", "group": "City sound", "name": "A driver you block honks after", "unit": "s", "min": 0.5, "max": 30, "v": 2.5, "note": "With you (on foot or in a car) right in front of a stopped car. A driver stuck in a queue honks only after four times as long, and only now and then."},
  {"id": "csPeople", "group": "City sound", "name": "People talking and shouting", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Arcade-style chatter, more where more people are; half at night, little in the rain. Shouts and screams when people run from trouble."},
  {"id": "csNature", "group": "City sound", "name": "Birds, crickets, gulls, waves and wind", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Birds in the trees by day, crickets in the green at night, gulls and the surf near the sea, wind that grows with storms."},
  {"id": "csFar", "group": "City sound", "name": "Far-off sounds", "unit": "%", "min": 0, "max": 200, "v": 100, "note": "Sirens, dogs barking, a building site's hammers and drills (by day), a plane passing over, a car alarm - far away, soft and muffled."},
  {"id": "csFarEvery", "group": "City sound", "name": "A far-off sound about every", "unit": "s", "min": 3, "max": 300, "v": 18, "note": "A random time around this."},
  {"id": "csHear", "group": "City sound", "name": "Cars and people are heard within", "unit": "m", "min": 10, "max": 150, "v": 60, "note": "From the middle of the screen. Louder the closer, and from their side (left or right speaker)."},
  {"id": "csInCar", "group": "City sound", "name": "Inside a car the city sounds at", "unit": "%", "min": 0, "max": 100, "v": 45, "note": "Of its volume, muffled; the radio and your engine stay as they are."}
]
}/*END-STREETS-JSON*/;
/* STR: the same settings in game units: km/h and m become game speeds and distances, minutes seconds, % a fraction */
const STR = (() => { const o = {}; for (const r of STREETS_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === 'min' ? r.v * 60 : r.unit === '%' ? r.v / 100 : r.v; return o; })();
