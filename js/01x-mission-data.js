'use strict';
/* ---------- 1x. THE MISSIONS ----------
   Every mission, written from the owner's quest pages (docs/quests/*.docx): its characters (name, map letter, bubble colour, the
   picture, the mumble), the steps with the words on screen, the dialogue lines, what fails it, the numbers it needs and the rewards.
   What the people and vehicles do is each mission's script in js/08zy (MSCRIPT). While STORY is not built, the missions are played
   in MISSIONS TEST (js/01j mode test). settings: the dialogue and the cards. tools/settings_sheet.py exports the settings to Apple
   Numbers or Excel and writes an edited copy back:  python3 tools/settings_sheet.py missions export missions.numbers
   (the missions themselves come from the Word pages). Keep the JSON between the markers valid. */
const MISSION_TABLE = /*MISSIONS-JSON*/{
"settings": [
  {"id": "letters", "group": "Dialogue", "name": "Words appear at", "unit": "letters/s", "min": 5, "max": 200, "v": 70, "note": "How fast a line fills its bubble (a tap anywhere shows the rest at once, the next tap the next line)."},
  {"id": "mumble", "group": "Dialogue", "name": "Mumble loudness", "unit": "%", "min": 0, "max": 100, "v": 60, "note": "Each character's own mumble while their words appear (0: silent)."},
  {"id": "lineGap", "group": "Cutscenes", "name": "A line shows after the shot starts", "unit": "s", "min": 0, "max": 5, "v": 0.3, "note": "The shot plays this long, then waits for its line to be read."},
  {"id": "afterLine", "group": "Cutscenes", "name": "After its line is read a shot moves on in", "unit": "s", "min": 0, "max": 5, "v": 0.3, "note": "Then the next shot (a shot with an action still going - Tito running to his boat - waits for it)."},
  {"id": "objTime", "group": "Cards", "name": "A new step's words stay big for", "unit": "s", "min": 1, "max": 10, "v": 3, "note": "Then they shrink into the bar at the top."}
],
"missions": [
  {"id": "q01", "no": "01", "title": "HARBOUR FAVOUR", "giver": "marco", "start": "marker", "where": "Sunset Harbor, the harbour office door",
   "story": "Marco's charter boat came back light: his courier Tito skimmed a week of takings and is about to leave the bay in his speedboat. Take Marco's speedboat, run Tito down, get the bag back and bring it to the harbour office - without the police.",
   "chars": [
     {"id": "marco", "name": "MARCO VALE", "letter": "M", "bubble": "#ff9a3d", "pic": "", "shirt": "#f4efe6", "pants": "#2a2d3a",
      "mumble": {"low": 95, "high": 140, "rate": 7, "wave": "triangle", "gap": 0.22}},
     {"id": "tito", "name": "TITO RUIZ", "letter": "T", "bubble": "#ff2bd6", "pic": "", "shirt": "#ff7ad9", "pants": "#f4efe6",
      "mumble": {"low": 300, "high": 520, "rate": 16, "wave": "square", "gap": 0}}],
   "steps": [
     {"word": "GO TO", "show": "GO TO MARCO AT SUNSET HARBOR"},
     {"word": "GET IN", "show": "GET IN MARCO'S SPEEDBOAT"},
     {"word": "CHASE", "show": "CHASE TITO"},
     {"word": "CHASE", "show": "CATCH TITO"},
     {"word": "COLLECT", "show": "PICK UP THE BAG"},
     {"word": "LOSE THE POLICE", "show": "LOSE THE POLICE"},
     {"word": "DELIVER", "show": "TAKE THE BAG TO MARCO"}],
   "lines": [
     {"who": "marco", "text": "You there. You look like someone who can drive a boat.", "mood": "dry"},
     {"who": "marco", "text": "My courier took a week of charter money. Every euro.", "mood": "tired"},
     {"who": "tito", "text": "Sorry, Marco! Business is business!", "mood": "cocky, shouting"},
     {"who": "marco", "text": "Take my speedboat, berth two. Bring back the bag. Leave the boy breathing.", "mood": "calm"},
     {"who": "tito", "text": "Okay! Okay! Take it! It's all there... mostly.", "mood": "panicked"},
     {"who": "marco", "text": "Mostly. Tito never was good with numbers.", "mood": "dry"},
     {"who": "marco", "text": "The boat is yours. Keep it at my berths. I'll call you.", "mood": "warm"}],
   "fails": {"away": "TITO GOT AWAY", "titoDead": "TITO IS DEAD", "marcoDead": "MARCO IS DEAD", "bagSank": "THE BAG SANK", "boatSank": "TITO WENT DOWN WITH HIS BOAT", "wasted": "WASTED", "busted": "BUSTED"},
   "numbers": {"awayWater": 300, "awayFoot": 150, "catch": 3, "titoBoat": 70, "titoRun": 88, "runLen": 260},
   "reward": {"cash": 2000, "vehicle": "Marco's speedboat - waits at your berths at Sunset Harbor", "clothes": "Marco's faded captain's cap", "next": "Quest 02 - Marco phones a game day later", "place": "", "contact": "Marco can call you from now on"}}
]
}/*END-MISSIONS-JSON*/;
/* MSN: the settings by id; MISSIONS by id */
const MSN = Object.fromEntries(MISSION_TABLE.settings.map(r => [r.id, r.unit === '%' ? r.v / 100 : r.v]));
const MISSIONS = Object.fromEntries(MISSION_TABLE.missions.map(m => [m.id, m]));
