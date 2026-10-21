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
  {"id": "liveHold", "group": "Dialogue", "name": "A live line stays after it is written", "unit": "s", "min": 0.5, "max": 10, "v": 1.6, "note": "Live lines show during play without pausing (a shout in a fight, a phone call while you drive); each stays this long, plus the time to write it."},
  {"id": "mumble", "group": "Dialogue", "name": "Mumble loudness", "unit": "%", "min": 0, "max": 100, "v": 60, "note": "Each character's own mumble while their words appear (0: silent)."},
  {"id": "lineGap", "group": "Cutscenes", "name": "A line shows after the shot starts", "unit": "s", "min": 0, "max": 5, "v": 0.3, "note": "The shot plays this long, then waits for its line to be read."},
  {"id": "afterLine", "group": "Cutscenes", "name": "After its line is read a shot moves on in", "unit": "s", "min": 0, "max": 5, "v": 0.3, "note": "Then the next shot (a shot with an action still going - Tito running to his boat - waits for it)."},
  {"id": "foeHp", "group": "Fights", "name": "An enemy's health", "unit": "hp", "min": 10, "max": 500, "v": 60, "note": "A passer-by has 30, a cop on foot 45; a pistol shot takes 20 or so (weapons table)."},
  {"id": "foeAim", "group": "Fights", "name": "How well enemies aim", "unit": "%", "min": 10, "max": 300, "v": 100, "note": "Of the armed people's aim (police table: 35% close, 8% at the longest range)."},
  {"id": "foeSee", "group": "Fights", "name": "A guard sees you at", "unit": "m", "min": 5, "max": 80, "v": 22, "note": "Closer than this and in sight, a guarding enemy starts the fight (a shot close by, or a hit, does too)."},
  {"id": "foeLeash", "group": "Fights", "name": "Enemies give up beyond", "unit": "m", "min": 30, "max": 300, "v": 90, "note": "Further away than this they go back to their place (still ready)."},
  {"id": "foeCarAim", "group": "Fights", "name": "Shooting from a moving car", "unit": "%", "min": 10, "max": 200, "v": 80, "note": "An enemy gunner's aim from a car, of the aim on foot."},
  {"id": "carBail", "group": "Fights", "name": "An enemy car's crew gets out below", "unit": "% health", "min": 0, "max": 90, "v": 30, "note": "Badly hit, or pulled up beside you, the crew gets out and fights on foot."},
  {"id": "allyHp", "group": "Fights", "name": "A friend's health", "unit": "hp", "min": 50, "max": 2000, "v": 250, "note": "Killed, the mission fails."},
  {"id": "allyRegen", "group": "Fights", "name": "A friend heals", "unit": "hp/s", "min": 0, "max": 50, "v": 4, "note": "Once nobody has hit them for a while (below)."},
  {"id": "allyRest", "group": "Fights", "name": "A friend starts healing after", "unit": "s", "min": 1, "max": 60, "v": 5, "note": "Without a hit."},
  {"id": "allyTake", "group": "Fights", "name": "A hit on a friend", "unit": "%", "min": 10, "max": 300, "v": 100, "note": "Of what the same hit does to you."},
  {"id": "allyAim", "group": "Fights", "name": "How well a friend aims", "unit": "%", "min": 10, "max": 300, "v": 110, "note": "Of the armed people's aim; from a moving car 80% of that."},
  {"id": "allyKeep", "group": "Fights", "name": "A friend keeps behind you", "unit": "m", "min": 1, "max": 20, "v": 4, "note": "On foot, a few steps behind and to one side."},
  {"id": "allyRange", "group": "Fights", "name": "A friend fights enemies within", "unit": "m", "min": 5, "max": 60, "v": 26, "note": "In sight."},
  {"id": "allyBoard", "group": "Fights", "name": "A friend gets in when you are slower than", "unit": "km/h", "min": 1, "max": 60, "v": 12, "note": "Stop near them and they get in with you (up to three); get out and so do they."},
  {"id": "allyCatch", "group": "Fights", "name": "A friend left behind catches up from", "unit": "m", "min": 20, "max": 400, "v": 70, "note": "Further than this and out of sight, they catch up with you (in your car if you have stopped)."},
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
   "numbers": {"awayWater": 300, "awayFoot": 150, "ashoreIn": 20, "catch": 3, "titoBoat": 70, "titoRun": 88, "runLen": 260},
   "reward": {"cash": 2000, "vehicle": "Marco's speedboat - waits at your berths at Sunset Harbor", "clothes": "Marco's faded captain's cap", "next": "Quest 02 - Marco phones a game day later", "place": "", "contact": "Marco can call you from now on"}},
  {"id": "q02", "no": "02", "title": "DOCK RATS", "giver": "marco", "start": "phone", "where": "A phone call, then Sunset Harbor's fuel dock",
   "story": "A day after you brought Marco his takings back, he calls: the Varga crew - the smugglers Tito owed - have sent men to his fuel dock, and his niece Lucia is there alone. Get there, fight them off with Lucia, chase Rocco when he runs for his car, take his phone and bring it to Marco.",
   "chars": [
     {"id": "marco", "name": "MARCO VALE", "letter": "M", "bubble": "#ff9a3d", "pic": "", "shirt": "#f4efe6", "pants": "#2a2d3a", "mumble": {"low": 95, "high": 140, "rate": 7, "wave": "triangle", "gap": 0.22}},
     {"id": "lucia", "name": "LUCIA VALE", "letter": "L", "bubble": "#2fe0c8", "pic": "", "shirt": "#3a6fb0", "pants": "#1c1c26", "mumble": {"low": 230, "high": 360, "rate": 12, "wave": "triangle", "gap": 0.05}},
     {"id": "rocco", "name": "ROCCO", "letter": "R", "bubble": "#ff3b4a", "pic": "", "shirt": "#e8e1d0", "pants": "#2a2d3a", "mumble": {"low": 80, "high": 120, "rate": 9, "wave": "sawtooth", "gap": 0.12}},
     {"id": "varga", "name": "VARGA MAN", "letter": "V", "bubble": "#ff7a6a", "pic": "", "shirt": "#2a2d3a", "pants": "#14121c", "mumble": {"low": 120, "high": 180, "rate": 11, "wave": "sawtooth", "gap": 0.08}}],
   "steps": [
     {"word": "GO TO", "show": "GET TO THE FUEL DOCK"},
     {"word": "TAKE OUT", "show": "TAKE OUT THE VARGA MEN"},
     {"word": "CHASE", "show": "STOP ROCCO'S CAR"},
     {"word": "TAKE OUT", "show": "TAKE OUT ROCCO"},
     {"word": "COLLECT", "show": "PICK UP ROCCO'S PHONE"},
     {"word": "LOSE THE POLICE", "show": "LOSE THE POLICE"},
     {"word": "DELIVER", "show": "TAKE THE PHONE TO MARCO"}],
   "lines": [
     {"who": "marco", "text": "It's Marco. Varga men at my fuel dock - and Lucia is there alone.", "mood": "tense", "when": "LIVE - the phone call at the start", "live": true},
     {"who": "marco", "text": "My niece. She doesn't scare - that's the trouble. Get there!", "mood": "worried", "when": "LIVE - the phone call", "live": true},
     {"who": "rocco", "text": "Nico says the dock pays rent now. Two grand a week.", "mood": "smug", "when": "Rent day, shot 1"},
     {"who": "lucia", "text": "Tell Nico he can swim for it.", "mood": "cold", "when": "Rent day, shot 2"},
     {"who": "rocco", "text": "Funny girl. Let's see you swim.", "mood": "menacing", "when": "Rent day, shot 3"},
     {"who": "lucia", "text": "About time, boatman. Grab a gun - they're Varga's!", "mood": "fierce", "when": "Rent day, shot 4"},
     {"who": "lucia", "text": "Behind the pumps! Watch the left!", "mood": "shouting", "when": "LIVE - the fight starts", "live": true},
     {"who": "varga", "text": "Get the girl!", "mood": "shouting", "when": "LIVE - in the fight", "live": true},
     {"who": "lucia", "text": "I'm fine - keep shooting!", "mood": "gritted", "when": "LIVE - when Lucia is badly hurt", "live": true},
     {"who": "rocco", "text": "Forget this! Nico will hear about you!", "mood": "panicked", "when": "LIVE - Rocco runs for his car", "live": true},
     {"who": "lucia", "text": "Rocco's running! Get us a car - you drive, I shoot!", "mood": "urgent", "when": "LIVE - Rocco runs", "live": true},
     {"who": "rocco", "text": "You don't know who you're messing with!", "mood": "furious", "when": "LIVE - his car is stopped", "live": true},
     {"who": "lucia", "text": "His phone - Nico's numbers are in there. Grab it.", "mood": "breathless", "when": "LIVE - Rocco is down", "live": true},
     {"who": "lucia", "text": "Back to Marco. He'll want to see this.", "mood": "grim", "when": "LIVE - you pick up the phone", "live": true},
     {"who": "marco", "text": "Tito owed the Vargas. Now they think the debt is mine.", "mood": "tired", "when": "Family business, shot 1"},
     {"who": "lucia", "text": "Then we stop paying.", "mood": "flat", "when": "Family business, shot 1"},
     {"who": "marco", "text": "They're not dock rats, Lucia. They're a family.", "mood": "warning", "when": "Family business, shot 2"},
     {"who": "lucia", "text": "So are we.", "mood": "quiet", "when": "Family business, shot 2"},
     {"who": "marco", "text": "Watch her back. She won't watch her own.", "mood": "dry", "when": "Family business, shot 3"},
     {"who": "lucia", "text": "I heard that. Rocco's phone has Nico's numbers - and Del at the casino keeps their books.", "mood": "sharp", "when": "Family business, shot 3"},
     {"who": "marco", "text": "Then the casino it is. Take this for today - and keep my niece breathing.", "mood": "warm", "when": "Family business, shot 3"}],
   "fails": {"luciaDead": "LUCIA IS DEAD", "marcoDead": "MARCO IS DEAD", "away": "ROCCO GOT AWAY", "phoneSank": "THE PHONE SANK", "wasted": "WASTED", "busted": "BUSTED"},
   "numbers": {"dockR": 170, "runAt": 1, "roccoSpeed": 75, "roccoStart": 2.5, "roccoHp": 140, "roccoCar": 0.8, "awayCar": 400, "marcoR": 80, "foeHp": 60},
   "reward": {"cash": 3000, "vehicle": "", "clothes": "", "next": "Quest 03 - Lucia's marker at the casino strip", "place": "", "contact": "Lucia can call you from now on"},
   "page": {
    "sub": "Written from your answers (the Varga crew) - change anything you like.",
    "glance": {"kind": "story", "given": "MARCO VALE - by phone (M on the map)", "where": "A phone call, then Sunset Harbor's fuel dock", "unlocked": "Passing Quest 01 (Marco phones a game day later)", "time": "Any", "length": "About 6 to 9 minutes", "limit": "None - Rocco sets the pace"},
    "chars": {
     "marco": {"gives": true, "role": "Gives the quest by phone and waits at the harbour office.", "looks": "Fifties, white linen shirt, grey stubble, a faded captain's cap. Calm until his family is in it.", "bubble": "Orange, like the harbour sign", "mumble": "Low and slow: round \"mm-bwah-ho\" syllables, a deep pitch, a short pause after every few words."},
     "lucia": {"gives": true, "role": "Marco's niece; fights beside you, rides in your car and shoots from it. If she is killed the quest fails.", "looks": "Late twenties, denim work shirt with the sleeves rolled, oil on her hands, short dark hair, a pistol in her belt. Quick, dry, fearless.", "bubble": "Teal, like the fuel pumps", "mumble": "Quick and bright: clipped \"ta-ki-sa\" syllables in the middle of the range, hardly any pauses."},
     "rocco": {"gives": false, "role": "The Vargas' collector; runs for his car when the fight turns.", "looks": "Forties, heavy, white vest under a cream jacket, gold chain, slicked hair. Smug until it goes wrong.", "bubble": "Red", "mumble": "Low and gruff: a buzzing \"brr-gha\", short bursts."},
     "varga": {"gives": false, "role": "Any of the Varga men (one bubble for all of them).", "looks": "Dark shirts, dark trousers, pistols and one SMG.", "bubble": "Salmon red", "mumble": "Middling, rough: \"ga-da-ka\", a few syllables a shout."}},
    "steps": [
     ["The phone rings wherever you are: Marco (live lines while you drive). You start on a street west of the harbour with a car by you.", "The lime line shows once the call ends."],
     ["Rocco and three Varga men at the fuel dock; Lucia joins you as a friend. When only one man is left, Rocco runs for his car on the street.", "Shooting before the cutscene starts the fight at once."],
     ["Rocco's BRUISER drives off on a long loop west of the harbour. Wreck it (or hit it hard) - Lucia shoots from your car. A spare car waits on the quay.", "400 m ahead, or the end of his loop, and he is gone."],
     ["Rocco gets out and fights on foot (a bar over him).", "If his car blows up with him in it, this step is skipped."],
     ["His phone where he fell (a green bubble).", "On foot only."],
     ["Only if you have stars by now; skipped if you have none.", ""],
     ["The phone to Marco at the harbour office; Lucia comes with you.", "The closing cutscene plays at the door."]],
    "fails": [
     ["Lucia is killed", "LUCIA IS DEAD"],
     ["Marco is killed", "MARCO IS DEAD"],
     ["Rocco gets away: 400 m ahead, or he reaches the end of his loop", "ROCCO GOT AWAY"],
     ["The phone falls in the water", "THE PHONE SANK"],
     ["You are wasted or busted (as always)", "WASTED / BUSTED"]],
    "cuts": [
     {"title": "DURING STEP 1 - \"RENT DAY\"", "plays": "When you reach the fuel dock (not if you start shooting first).", "shots": [
      ["The fuel dock", "Rocco, three Varga men, Lucia", "The men stand round Lucia by the pumps; Rocco leans in.", "WIDE", "3", "3"],
      ["The pumps", "Lucia", "She doesn't move.", "CLOSE on Lucia", "3", "4"],
      ["The quay", "Rocco", "He smiles and pulls his jacket open - a gun.", "CLOSE on Rocco", "3", "5"],
      ["The pumps", "Lucia, you", "She sees you and pulls her pistol.", "CLOSE on Lucia", "3", "6"]]},
     {"title": "CLOSING - \"FAMILY BUSINESS\"", "plays": "When you bring the phone to Marco.", "shots": [
      ["The harbour office door", "Marco, Lucia, you", "Marco turns Rocco's phone over in his hands.", "CLOSE on Marco", "4", "15, 16"],
      ["The quay", "Marco, Lucia", "The two of them face each other.", "WIDE", "4", "17, 18"],
      ["The office door", "Marco, Lucia, you", "Marco nods at you; Lucia rolls her eyes. Fade out.", "CLOSE on Marco", "5", "19, 20, 21"]]}],
    "start": {"how": "phone", "marker": "-", "phone": "Marco calls a game day after Quest 01 (live lines while you play); then a marker at the fuel dock. In MISSIONS TEST you start on a street west of the harbour, a car beside you."},
    "failing": "Retry from the call: it rings again at once.",
    "notes": {"places": "Sunset Harbor: the fuel dock and the quay by it, the harbour office door; the street west of the harbour (your start); Rocco's loop through the streets to the south-west.", "people": "Lucia fights beside you (new: a friend who follows, fights, rides along and shoots from your car). The Varga men guard, then fight you and Lucia (new: enemies who shoot). Rocco's car runs a set loop; badly hit it stops and he gets out.", "music": "Tense radio-free quiet at the dock; the radio during the chase.", "new": "Live lines (no pause) for the call and the fight; friends who help; enemies who shoot; enemies' cars.", "other": "Rocco can die - only the phone matters."}}}
]
}/*END-MISSIONS-JSON*/;
/* MSN: the settings by id; MISSIONS by id */
const MSN = Object.fromEntries(MISSION_TABLE.settings.map(r => [r.id, r.unit === '%' ? r.v / 100 : r.v]));
const MISSIONS = Object.fromEntries(MISSION_TABLE.missions.map(m => [m.id, m]));
