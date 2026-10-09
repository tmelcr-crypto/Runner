'use strict';
/* ---------- 1d. DAY, NIGHT & WEATHER SETTINGS ----------
   The clock and the weather (js/12d) in everyday units. tools/settings_sheet.py exports this table to Apple Numbers or Excel and
   writes an edited copy back:  python3 tools/settings_sheet.py sky export sky.numbers  /  ... sky import sky.numbers
   Keep the JSON between the markers valid. */
const SKY_TABLE = /*SKY-JSON*/{
"settings": [
  {"id": "dayMinutes", "group": "Time", "name": "A whole day lasts", "unit": "min", "min": 2, "max": 240, "v": 24, "note": "Real minutes from one midnight to the next. The clock stops while the game waits (map, weapon wheel)."},
  {"id": "startHour", "group": "Time", "name": "A new game starts at", "unit": "hour", "min": 0, "max": 23.99, "v": 17.5, "note": "Time of day when you press start, 0 to 24 (17.5 = half past five in the afternoon)."},
  {"id": "sunrise", "group": "Time", "name": "Sunrise", "unit": "hour", "min": 3, "max": 10, "v": 6, "note": "Dawn is the hour and a half around it."},
  {"id": "sunset", "group": "Time", "name": "Sunset", "unit": "hour", "min": 15, "max": 22, "v": 19.5, "note": "Dusk is the hour and a half around it."},
  {"id": "wxMin", "group": "Weather", "name": "Weather lasts at least", "unit": "min", "min": 0.5, "max": 60, "v": 2, "note": "Real minutes before the weather may change."},
  {"id": "wxMax", "group": "Weather", "name": "Weather lasts at most", "unit": "min", "min": 0.5, "max": 120, "v": 6, "note": "Must not be less than Weather lasts at least."},
  {"id": "blend", "group": "Weather", "name": "A change takes", "unit": "s", "min": 1, "max": 300, "v": 25, "note": "How long one weather turns into the next (clouds gather, rain starts slowly)."},
  {"id": "pClear", "group": "Weather", "name": "Chance of clear", "unit": "%", "min": 0, "max": 100, "v": 45, "note": "The five chances are weights: they need not add up to 100."},
  {"id": "pCloudy", "group": "Weather", "name": "Chance of clouds", "unit": "%", "min": 0, "max": 100, "v": 20, "note": "Overcast: the sun is weaker and the light greyer."},
  {"id": "pRain", "group": "Weather", "name": "Chance of rain", "unit": "%", "min": 0, "max": 100, "v": 20, "note": "Rain: wet roads, less grip, people with umbrellas."},
  {"id": "pStorm", "group": "Weather", "name": "Chance of a storm", "unit": "%", "min": 0, "max": 100, "v": 8, "note": "Heavy rain driven by the wind, lightning and thunder."},
  {"id": "pFog", "group": "Weather", "name": "Chance of fog", "unit": "%", "min": 0, "max": 100, "v": 7, "note": "Thick fog: you see less far, and so do the police."},
  {"id": "drops", "group": "Rain", "name": "Rain drops in view", "unit": "count", "min": 100, "max": 5000, "v": 1600, "note": "In a storm; light rain shows fewer. Lower it if an older phone stutters in the rain."},
  {"id": "rainGrip", "group": "Rain", "name": "Tyre grip on wet roads", "unit": "%", "min": 20, "max": 100, "v": 75, "note": "Grip on a soaked road, compared with dry. Your car and traffic alike."},
  {"id": "stormGrip", "group": "Rain", "name": "Tyre grip in a storm", "unit": "%", "min": 20, "max": 100, "v": 62, "note": "Grip in a downpour, compared with dry."},
  {"id": "dryTime", "group": "Rain", "name": "Roads dry in", "unit": "s", "min": 5, "max": 600, "v": 90, "note": "How long after the rain stops the roads stay wet (they get wet in about a third of that)."},
  {"id": "aiSlow", "group": "Rain", "name": "Traffic slows in the rain by", "unit": "%", "min": 0, "max": 80, "v": 20, "note": "Drivers take it easier on wet roads."},
  {"id": "sightNight", "group": "Police", "name": "Police see at night", "unit": "%", "min": 10, "max": 100, "v": 75, "note": "Share of their daytime sight range in the dark."},
  {"id": "sightRain", "group": "Police", "name": "Police see in the rain", "unit": "%", "min": 10, "max": 100, "v": 85, "note": "Share of their sight range in rain (a storm counts as heavy rain and fog together)."},
  {"id": "sightFog", "group": "Police", "name": "Police see in fog", "unit": "%", "min": 10, "max": 100, "v": 50, "note": "Share of their sight range in thick fog."},
  {"id": "dayWindows", "group": "Look", "name": "Lit windows by day", "unit": "%", "min": 0, "max": 100, "v": 12, "note": "How much the window lights still glow in daylight (100 = as at night)."},
  {"id": "dayGlow", "group": "Look", "name": "Neon by day", "unit": "%", "min": 0, "max": 100, "v": 45, "note": "How bright neon signs, trims and underglow stay in daylight. Street lights and headlights are off by day."}
]
}/*END-SKY-JSON*/;
/* SKYP: the same settings in game units: minutes become seconds, % a fraction, hours stay hours */
const SKYP = (() => { const o = {}; for (const r of SKY_TABLE.settings) o[r.id] = r.unit === 'min' ? r.v * 60 : r.unit === '%' ? r.v / 100 : r.v; return o; })();
