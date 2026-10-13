'use strict';
/* ---------- 1v. THE STUNT JUMPS ----------
   Twenty unique stunt jumps (js/10y the ramps, js/08zw at work; modes: stunts): fourteen street ramps and five over the water (map
   remodel 18: MAP.stunts, in this order) and Skyline One's launch ramp, the twentieth. Hit one fast enough, fly far enough and land
   on your wheels: UNIQUE STUNT BONUS, paid once for each jump, each counted once toward 100%. In the air time slows down. The ramps
   are not on the maps until done. Here: the slow motion, how a stunt ramp throws a car, what a good landing is, the bonus, and for
   each jump the speed it needs and how far you must fly. tools/settings_sheet.py exports this table to Apple Numbers or Excel and
   writes an edited copy back:  python3 tools/settings_sheet.py stunts export stunts.numbers  /  ... stunts import stunts.numbers
   (the money is also in tools/economy_sheet.py). Keep the JSON between the markers valid. */
const STUNT_TABLE = /*STUNT-JSON*/{
"settings": [
  {"id": "slowmo", "group": "In the air", "name": "Time in the air runs at", "unit": "%", "min": 10, "max": 100, "v": 35, "note": "Of its usual speed, from the lip of a stunt ramp until you land (100: no slow motion)."},
  {"id": "gravity", "group": "In the air", "name": "A car off a stunt ramp falls at", "unit": "m/s²", "min": 10, "max": 100, "v": 35, "note": "The game's cars usually fall at 75 m/s² (they come down fast); lower flies further. Skyline One's launch ramp keeps the usual. Change it, or the lift, and the speeds needed below no longer match."},
  {"id": "lift", "group": "In the air", "name": "The ramp throws a car up at", "unit": "%", "min": 50, "max": 300, "v": 150, "note": "Of the speed it climbs the ramp with."},
  {"id": "upright", "group": "The landing", "name": "Landed straight enough within", "unit": "degrees", "min": 10, "max": 180, "v": 70, "note": "Of the way it flew off the ramp: spun round further than this it is a crash and does not count."},
  {"id": "hardHit", "group": "The landing", "name": "A crash: the car loses more than", "unit": "%", "min": 5, "max": 100, "v": 40, "note": "Of its health between the lip and the landing (hitting something in the air, a hard landing) - it does not count."},
  {"id": "perMetre", "group": "The bonus", "name": "Pays per metre flown", "unit": "€", "min": 0, "max": 1000, "v": 50, "note": "Paid once, the first time each jump is done - UNIQUE STUNT BONUS."},
  {"id": "perHeight", "group": "The bonus", "name": "and per metre of height", "unit": "€", "min": 0, "max": 5000, "v": 200, "note": ""},
  {"id": "bonusMin", "group": "The bonus", "name": "At least", "unit": "€", "min": 0, "max": 100000, "v": 500, "note": ""},
  {"id": "bonusMax", "group": "The bonus", "name": "At most", "unit": "€", "min": 0, "max": 100000, "v": 5000, "note": ""},
  {"id": "need1", "group": "1 SUNSTRIP SKYHOP", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far1", "group": "1 SUNSTRIP SKYHOP", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need2", "group": "2 BOULEVARD BOUNCE", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far2", "group": "2 BOULEVARD BOUNCE", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need3", "group": "3 MERCADO MULE KICK", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far3", "group": "3 MERCADO MULE KICK", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need4", "group": "4 SOUTHSIDE SAILOR", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far4", "group": "4 SOUTHSIDE SAILOR", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need5", "group": "5 MARKET FLYER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far5", "group": "5 MARKET FLYER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need6", "group": "6 PALM HEIGHTS HOP", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far6", "group": "6 PALM HEIGHTS HOP", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need7", "group": "7 LAKESIDE LEAP", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far7", "group": "7 LAKESIDE LEAP", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need8", "group": "8 FAIRWAY DRIVE", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far8", "group": "8 FAIRWAY DRIVE", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need9", "group": "9 BUNKER BUSTER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far9", "group": "9 BUNKER BUSTER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need10", "group": "10 THE BACK NINE", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far10", "group": "10 THE BACK NINE", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need11", "group": "11 SEAVIEW SOARER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far11", "group": "11 SEAVIEW SOARER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need12", "group": "12 CORAL CANNON", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far12", "group": "12 CORAL CANNON", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need13", "group": "13 SANDBAR SCREAMER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far13", "group": "13 SANDBAR SCREAMER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need14", "group": "14 DUNE DIVER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 110, "note": "A street ramp: slower than this, TOO SLOW."},
  {"id": "far14", "group": "14 DUNE DIVER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 25, "note": "From the lip to where it lands."},
  {"id": "need15", "group": "15 CANAL CRUISER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 100, "note": "Over the water: slower than this, TOO SLOW."},
  {"id": "far15", "group": "15 CANAL CRUISER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 20, "note": "From the lip to where it lands - across the water onto the far bank."},
  {"id": "need16", "group": "16 LAGOON LAUNCH", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 140, "note": "Over the water: slower than this, TOO SLOW."},
  {"id": "far16", "group": "16 LAGOON LAUNCH", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 38, "note": "From the lip to where it lands - across the water onto the far bank."},
  {"id": "need17", "group": "17 ISLAND HOPPER", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 120, "note": "Over the water: slower than this, TOO SLOW."},
  {"id": "far17", "group": "17 ISLAND HOPPER", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 30, "note": "From the lip to where it lands - across the water onto the far bank."},
  {"id": "need18", "group": "18 HOLE IN ONE", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 130, "note": "Over the water: slower than this, TOO SLOW."},
  {"id": "far18", "group": "18 HOLE IN ONE", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 33, "note": "From the lip to where it lands - across the water onto the far bank."},
  {"id": "need19", "group": "19 SPLASHDOWN DARE", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 115, "note": "Over the water: slower than this, TOO SLOW."},
  {"id": "far19", "group": "19 SPLASHDOWN DARE", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 26, "note": "From the lip to where it lands - across the water onto the far bank."},
  {"id": "need20", "group": "20 SKYLINE DROP", "name": "Speed needed at the lip", "unit": "km/h", "min": 20, "max": 300, "v": 50, "note": "Skyline One's launch ramp, off the top deck over the avenue: slower than this, TOO SLOW."},
  {"id": "far20", "group": "20 SKYLINE DROP", "name": "Fly at least", "unit": "m", "min": 5, "max": 150, "v": 15, "note": "From the lip to where it lands - on the street or a roof across the avenue."}
]
}/*END-STUNT-JSON*/;
/* STN: the same settings in game units: km/h and m become game speeds and distances, m/s² an acceleration, % a fraction */
const STN = (() => { const o = {}; for (const r of STUNT_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' || r.unit === 'm/s²' ? r.v * UNITS_PER_M : r.unit === '%' ? r.v / 100 : r.unit === 'degrees' ? r.v * Math.PI / 180 : r.v; return o; })();
const STUNT_NAMES = STUNT_TABLE.settings.filter(r => /^need\d+$/.test(r.id)).map(r => r.group.replace(/^\d+\s+/, ''));
