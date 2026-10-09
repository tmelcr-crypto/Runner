'use strict';
/* ---------- 1e. CAR RADIO ----------
   The stations you hear in a car. In a car R (or the RADIO button) tunes to the next station; one more step turns the radio off.
   Each station plays its music file from audio/radio/, looped, as if it had been on air all along: you tune in mid-song.
   The files there now are short synthesized placeholders made by tools/radio_placeholders.py. Replace any of them with real music
   under the same file name (MP3 plays in every browser; any length) - or point "file" at another name.
   volume: the radio's loudness, % (100 = as loud as the game allows). onAir: % of cars whose radio is on when you get in;
   police and service vehicles start with it off. Keep the JSON between the markers valid. */
const RADIO_TABLE = /*RADIO-JSON*/{
"volume": 70,
"onAir": 85,
"stations": [
  {"id": "neon", "name": "NEON FM", "freq": "101.1", "style": "SYNTHWAVE", "file": "neon-fm.mp3", "color": "#ff2bd6"},
  {"id": "bay", "name": "BAY BEATS", "freq": "94.7", "style": "HOUSE", "file": "bay-beats.mp3", "color": "#2bf3ff"},
  {"id": "palmera", "name": "RADIO PALMERA", "freq": "89.5", "style": "REGGAETON", "file": "radio-palmera.mp3", "color": "#ffe14a"},
  {"id": "riot", "name": "RIOT", "freq": "97.0", "style": "PUNK ROCK", "file": "riot.mp3", "color": "#ff4d5e"},
  {"id": "lowtide", "name": "LOW TIDE", "freq": "88.3", "style": "LO-FI", "file": "low-tide.mp3", "color": "#3dffa6"}
]
}/*END-RADIO-JSON*/;
const RADIO = RADIO_TABLE.stations, RADIO_DIR = 'audio/radio/';
