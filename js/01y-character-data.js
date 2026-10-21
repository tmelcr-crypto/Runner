'use strict';
/* ---------- 1y. THE CHARACTERS: one table for every mission (their names, letters, colours, voices and looks) ----------
   Each character once, the same in every mission that has them: the name and the letter on the maps, the bubble colour, the clothes
   their figure wears in the city (shirt, pants), their mumble, who they are (role) and how they look (look), and the recipe their
   pixel-art portrait is drawn from (tools/portraits.py: 48 x 48, head and shoulders in a 3/4 view, three faces - calm, angry and
   smiling, picked by the mood written on each line; img/chars/<id>-<face>.png). The missions (js/01x) name their characters by id.
   tools/characters_sheet.py exports the table to Apple Numbers or Excel and writes an edited copy back:
   python3 tools/characters_sheet.py export characters.numbers. Keep the JSON between the markers valid. */
const CHARACTER_TABLE = /*CHARACTERS-JSON*/{
"faces": {"angry": ["shouting", "furious", "screaming", "barking", "gritted", "urgent", "angry", "hard", "impatient", "snarling", "breathless", "yelling"],
          "smile": ["grinning", "laughing", "warm", "amused", "smiling", "wry", "relieved", "silky", "scoffing", "moved", "teasing", "proud"]},
"characters": [
  {"id": "marco", "name": "MARCO VALE", "letter": "M", "bubble": "#ff9a3d", "shirt": "#f4efe6", "pants": "#2a2d3a", "mumble": {"low": 95, "high": 140, "rate": 7, "wave": "triangle", "gap": 0.22},
   "role": "Owns Sunset Harbor's charter boats and the fuel dock; Lucia's uncle. Slow to anger, hard to stop.", "look": "Fifties, tanned and weathered, grey stubble, grey hair at the sides, a faded captain's cap with a gold badge, a white linen shirt open at the collar.",
   "skin": "#c98b5e", "hair": "#a3a3a6", "hairStyle": "sides", "facial": "stubble", "facialColour": "#9a9a9e", "eyes": "#4a3020", "hat": "captain", "hatColour": "#e8e2cf", "hatColour2": "#2a3550", "glasses": "none", "glassesColour": "",
   "top": "openshirt", "topColour": "#f4efe6", "topColour2": "#e0d8c6", "extras": ["wrinkles"], "smileEyes": "happy", "calmMouth": "line", "age": "old", "build": "broad"},
  {"id": "lucia", "name": "LUCIA VALE", "letter": "L", "bubble": "#2fe0c8", "shirt": "#3a6fb0", "pants": "#1c1c26", "mumble": {"low": 230, "high": 360, "rate": 12, "wave": "triangle", "gap": 0.05},
   "role": "Marco's niece; runs the fuel dock and anything with an engine. Quick, dry, fearless.", "look": "Late twenties, olive skin, short dark hair with a side fringe, a small gold earring, a denim work shirt with the sleeves rolled.",
   "skin": "#c8916a", "hair": "#1e1a24", "hairStyle": "pixie", "facial": "none", "facialColour": "", "eyes": "#3a2418", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "none", "glassesColour": "",
   "top": "denim", "topColour": "#3a6fb0", "topColour2": "#27508a", "extras": ["earring"], "smileEyes": "happy", "calmMouth": "line", "age": "young", "build": "slim"},
  {"id": "tito", "name": "TITO RUIZ", "letter": "T", "bubble": "#ff2bd6", "shirt": "#ff7ad9", "pants": "#f4efe6", "mumble": {"low": 200, "high": 320, "rate": 14, "wave": "square", "gap": 0.04},
   "role": "Marco's courier who skimmed the takings; all nerve until he is caught.", "look": "Twenties, wiry, curly black hair, a thin moustache, a gold tooth he flashes when he grins, a loud pink flower shirt.",
   "skin": "#b97a52", "hair": "#16121a", "hairStyle": "curly", "facial": "moustache", "facialColour": "#16121a", "eyes": "#2a1a12", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "none", "glassesColour": "",
   "top": "flowershirt", "topColour": "#ff7ad9", "topColour2": "#fff3a8", "extras": ["goldtooth"], "smileEyes": "happy", "calmMouth": "line", "age": "young", "build": "slim"},
  {"id": "rocco", "name": "ROCCO", "letter": "R", "bubble": "#ff3b4a", "shirt": "#e8e1d0", "pants": "#2a2d3a", "mumble": {"low": 110, "high": 170, "rate": 9, "wave": "sawtooth", "gap": 0.1},
   "role": "Nico's collector on the waterfront; smug until it goes wrong.", "look": "Forties, heavy, slicked black hair, a scar across one cheek, a cream jacket over a white vest, a gold chain.",
   "skin": "#c08a62", "hair": "#141018", "hairStyle": "slick", "facial": "stubble", "facialColour": "#2a2226", "eyes": "#2a1a12", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "none", "glassesColour": "",
   "top": "jacketvest", "topColour": "#e8e1d0", "topColour2": "#f6f4ee", "extras": ["chain", "scar"], "smileEyes": "happy", "calmMouth": "smirk", "age": "mid", "build": "broad"},
  {"id": "varga", "name": "VARGA MAN", "letter": "V", "bubble": "#ff7a6a", "shirt": "#2a2d3a", "pants": "#14121c", "mumble": {"low": 120, "high": 180, "rate": 11, "wave": "sawtooth", "gap": 0.08},
   "role": "One of Nico's men - every one of them looks much like the next.", "look": "Thirties, a buzz cut, dark glasses, stubble, a dark shirt open at the neck.",
   "skin": "#b98560", "hair": "#2a2420", "hairStyle": "buzz", "facial": "stubble", "facialColour": "#2a2420", "eyes": "#2a1a12", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "shades", "glassesColour": "#141218",
   "top": "darkshirt", "topColour": "#2a2d3a", "topColour2": "#1c1e28", "extras": [], "smileEyes": "happy", "calmMouth": "line", "age": "mid", "build": "broad"},
  {"id": "del", "name": "DEL RAMOS", "letter": "D", "bubble": "#b07cff", "shirt": "#7a1f3a", "pants": "#16161c", "mumble": {"low": 260, "high": 420, "rate": 15, "wave": "square", "gap": 0.02},
   "role": "A croupier at the casino strip who keeps the Vargas' books; nervous, clever, always counting.", "look": "Thirties, thin and pale, slicked black hair, a pencil moustache, a white shirt, a black bow tie and a wine-red croupier's waistcoat.",
   "skin": "#e0b48e", "hair": "#14121a", "hairStyle": "slick", "facial": "pencil", "facialColour": "#14121a", "eyes": "#3a2a1a", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "none", "glassesColour": "",
   "top": "waistcoat", "topColour": "#7a1f3a", "topColour2": "#f4f1ea", "extras": ["sweat"], "smileEyes": "happy", "calmMouth": "line", "age": "mid", "build": "slim"},
  {"id": "nico", "name": "NICO VARGA", "letter": "N", "bubble": "#ffd23f", "shirt": "#f4f4f6", "pants": "#16161c", "mumble": {"low": 150, "high": 230, "rate": 8, "wave": "sine", "gap": 0.18},
   "role": "Ivo's nephew, head of the Varga crew while Ivo is inside; charming, vain, ruthless.", "look": "Thirties, slicked-back dark hair, a pleasant smile that never reaches his eyes, a white linen suit, a pale gold shirt open at the neck, a gold chain.",
   "skin": "#d9a27a", "hair": "#2a1c14", "hairStyle": "slick", "facial": "none", "facialColour": "", "eyes": "#5a3a1a", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "none", "glassesColour": "",
   "top": "suit", "topColour": "#f4f4f6", "topColour2": "#efdca0", "extras": ["chain"], "smileEyes": "open", "calmMouth": "smirk", "age": "mid", "build": "normal"},
  {"id": "sol", "name": "SOL OKAFOR", "letter": "S", "bubble": "#8fe04a", "shirt": "#ff7a1a", "pants": "#2a3a6a", "mumble": {"low": 85, "high": 125, "rate": 9, "wave": "sawtooth", "gap": 0.12},
   "role": "The crane foreman at Dockside; owes Marco a boat. Steady, funny, a shotgun in the cab.", "look": "Fifties, broad, dark skin, a short grey beard, a yellow hard hat, an orange hi-vis vest with silver stripes over a navy shirt.",
   "skin": "#6b4228", "hair": "#b8b8b8", "hairStyle": "short", "facial": "beard", "facialColour": "#c4c4c4", "eyes": "#1e1410", "hat": "hardhat", "hatColour": "#ffd23f", "hatColour2": "#e0a800", "glasses": "none", "glassesColour": "",
   "top": "hivis", "topColour": "#ff7a1a", "topColour2": "#2a3a6a", "extras": ["wrinkles"], "smileEyes": "happy", "calmMouth": "line", "age": "old", "build": "broad"},
  {"id": "guard", "name": "OFFICER DUNN", "letter": "O", "bubble": "#7fb0ff", "shirt": "#2a3a5a", "pants": "#1a2230", "mumble": {"low": 140, "high": 190, "rate": 10, "wave": "square", "gap": 0.1},
   "role": "A prison officer at Iron Key's gate; tired, fair, by the book until the riot.", "look": "Forties, ruddy, a brown moustache, tired eyes with bags under them, a navy police cap with a gold badge, a navy uniform shirt, a black tie and a badge.",
   "skin": "#d6a07c", "hair": "#5a3a24", "hairStyle": "short", "facial": "moustache", "facialColour": "#5a3a24", "eyes": "#3a4a5a", "hat": "police", "hatColour": "#1f2a44", "hatColour2": "#e0b84a", "glasses": "none", "glassesColour": "",
   "top": "uniform", "topColour": "#2a3a5a", "topColour2": "#14161e", "extras": ["tired"], "smileEyes": "happy", "calmMouth": "frown", "age": "mid", "build": "normal"},
  {"id": "ivo", "name": "IVO VARGA", "letter": "I", "bubble": "#c8ccd8", "shirt": "#ff7a1a", "pants": "#ff7a1a", "mumble": {"low": 80, "high": 115, "rate": 6, "wave": "sine", "gap": 0.26},
   "role": "Nico's uncle and the head of the family before him; six years in a cell on Iron Key, still giving orders.", "look": "Sixties, gaunt, white hair combed straight back, deep lines, reading glasses on a gold cord, a prison-orange jumpsuit with a number on the chest.",
   "skin": "#d8b090", "hair": "#eceae4", "hairStyle": "combed", "facial": "none", "facialColour": "", "eyes": "#5a6a70", "hat": "none", "hatColour": "", "hatColour2": "", "glasses": "reading", "glassesColour": "#d8b04a",
   "top": "jumpsuit", "topColour": "#ff7a1a", "topColour2": "#c85a10", "extras": ["wrinkles"], "smileEyes": "happy", "calmMouth": "frown", "age": "old", "build": "slim"}
]
}/*END-CHARACTERS-JSON*/;
/* CHARS: the characters by id */
const CHARS = Object.fromEntries(CHARACTER_TABLE.characters.map(c => [c.id, c]));
