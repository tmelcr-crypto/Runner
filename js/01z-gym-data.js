'use strict';
/* ---------- 1z. BULL'S GYM AND ITS RING FIGHTS ----------
   Bull Kessler's boxing gym in a Dockside warehouse (js/10zb the building, js/08zzg at work; modes: gym, ringFights): open by day,
   boxers at the bags. In the ring, fists only: five opponents one after another, each tougher and paying more; lose and you are
   thrown out with a little health - try again any time. In STORY the gym is Kessler's and the fights stop after M12 (docs/STORY.md).
   Here: the hours, the boxers, the rules of a bout and each opponent's numbers (the pay is also in tools/economy_sheet.py).
   tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited copy back:
     python3 tools/settings_sheet.py gym export gym.numbers  /  ... gym import gym.numbers
   Keep the JSON between the markers valid. */
const GYM_TABLE = /*GYM-JSON*/{
"settings": [
  {"id": "openFrom", "group": "Hours", "name": "Open from", "unit": "h", "min": 0, "max": 23, "v": 7, "note": "Game time. From then the door is open and the boxers train."},
  {"id": "openTo", "group": "Hours", "name": "Shuts at", "unit": "h", "min": 1, "max": 24, "v": 23, "note": "Game time. From then till morning the door is locked and nobody is in."},
  {"id": "trainers", "group": "People", "name": "Boxers at the bags", "unit": "count", "min": 0, "max": 6, "v": 4, "note": "They punch the heavy bags while the gym is open."},
  {"id": "countdown", "group": "A bout", "name": "Count-in before the bell", "unit": "s", "min": 0, "max": 10, "v": 3, "note": "Both in their corners, then the bell."},
  {"id": "koHp", "group": "A bout", "name": "You go down at", "unit": "hp", "min": 1, "max": 90, "v": 10, "note": "In the ring your health never drops below this: there you are knocked out and lose the bout. Body armour does not count in the ring."},
  {"id": "loseHp", "group": "A bout", "name": "Health when thrown out", "unit": "hp", "min": 1, "max": 100, "v": 25, "note": "After a lost bout you wake up outside the gym's door with this much."},
  {"id": "reach", "group": "A bout", "name": "An opponent's reach", "unit": "m", "min": 0.5, "max": 3, "v": 1.5, "note": "How close he must be to land a punch."},
  {"id": "windup", "group": "A bout", "name": "His punch lands after", "unit": "s", "min": 0.05, "max": 1, "v": 0.25, "note": "From the start of his swing; step out of reach in time and it misses."},
  {"id": "stagger", "group": "A bout", "name": "Your punch staggers him for", "unit": "s", "min": 0, "max": 2, "v": 0.25, "note": "He cannot punch meanwhile."},
  {"id": "guardAfter", "group": "A bout", "name": "His guard goes up after", "unit": "count", "min": 2, "max": 10, "v": 3, "note": "Your punches that land within the time below: then he covers up and blocks everything for a moment, and comes back with a punch."},
  {"id": "guardIn", "group": "A bout", "name": "... landing within", "unit": "s", "min": 0.5, "max": 5, "v": 1.4, "note": ""},
  {"id": "guardFor", "group": "A bout", "name": "His guard stays up", "unit": "s", "min": 0.2, "max": 3, "v": 0.9, "note": "Every punch of yours is blocked meanwhile."},
  {"id": "koLie", "group": "A bout", "name": "A knocked-out opponent lies", "unit": "s", "min": 1, "max": 20, "v": 4, "note": "Then he gets up and goes; the next one waits for you."},
  {"id": "o1Hp", "group": "Opponent 1", "name": "Health", "unit": "hp", "min": 10, "max": 1000, "v": 56, "note": "Your jab (FISTS) takes off 8."},
  {"id": "o1Dmg", "group": "Opponent 1", "name": "His punch", "unit": "hp", "min": 1, "max": 50, "v": 5, "note": "What a punch that lands takes off you."},
  {"id": "o1Speed", "group": "Opponent 1", "name": "His footwork", "unit": "m/s", "min": 1, "max": 8, "v": 3, "note": "How fast he moves round the ring."},
  {"id": "o1Cool", "group": "Opponent 1", "name": "Time between his punches", "unit": "s", "min": 0.3, "max": 4, "v": 1.4, "note": ""},
  {"id": "o1Block", "group": "Opponent 1", "name": "He blocks", "unit": "%", "min": 0, "max": 90, "v": 10, "note": "Of your punches that would land."},
  {"id": "o1Pay", "group": "Opponent 1", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 200, "note": ""},
  {"id": "o2Hp", "group": "Opponent 2", "name": "Health", "unit": "hp", "min": 10, "max": 1000, "v": 88, "note": ""},
  {"id": "o2Dmg", "group": "Opponent 2", "name": "His punch", "unit": "hp", "min": 1, "max": 50, "v": 7, "note": ""},
  {"id": "o2Speed", "group": "Opponent 2", "name": "His footwork", "unit": "m/s", "min": 1, "max": 8, "v": 3.2, "note": ""},
  {"id": "o2Cool", "group": "Opponent 2", "name": "Time between his punches", "unit": "s", "min": 0.3, "max": 4, "v": 1.25, "note": ""},
  {"id": "o2Block", "group": "Opponent 2", "name": "He blocks", "unit": "%", "min": 0, "max": 90, "v": 15, "note": ""},
  {"id": "o2Pay", "group": "Opponent 2", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 400, "note": ""},
  {"id": "o3Hp", "group": "Opponent 3", "name": "Health", "unit": "hp", "min": 10, "max": 1000, "v": 128, "note": ""},
  {"id": "o3Dmg", "group": "Opponent 3", "name": "His punch", "unit": "hp", "min": 1, "max": 50, "v": 9, "note": ""},
  {"id": "o3Speed", "group": "Opponent 3", "name": "His footwork", "unit": "m/s", "min": 1, "max": 8, "v": 3.2, "note": ""},
  {"id": "o3Cool", "group": "Opponent 3", "name": "Time between his punches", "unit": "s", "min": 0.3, "max": 4, "v": 1.1, "note": ""},
  {"id": "o3Block", "group": "Opponent 3", "name": "He blocks", "unit": "%", "min": 0, "max": 90, "v": 20, "note": ""},
  {"id": "o3Pay", "group": "Opponent 3", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 800, "note": ""},
  {"id": "o4Hp", "group": "Opponent 4", "name": "Health", "unit": "hp", "min": 10, "max": 1000, "v": 168, "note": ""},
  {"id": "o4Dmg", "group": "Opponent 4", "name": "His punch", "unit": "hp", "min": 1, "max": 50, "v": 11, "note": ""},
  {"id": "o4Speed", "group": "Opponent 4", "name": "His footwork", "unit": "m/s", "min": 1, "max": 8, "v": 3.5, "note": ""},
  {"id": "o4Cool", "group": "Opponent 4", "name": "Time between his punches", "unit": "s", "min": 0.3, "max": 4, "v": 0.95, "note": ""},
  {"id": "o4Block", "group": "Opponent 4", "name": "He blocks", "unit": "%", "min": 0, "max": 90, "v": 25, "note": ""},
  {"id": "o4Pay", "group": "Opponent 4", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 1600, "note": ""},
  {"id": "o5Hp", "group": "Opponent 5", "name": "Health", "unit": "hp", "min": 10, "max": 1000, "v": 224, "note": ""},
  {"id": "o5Dmg", "group": "Opponent 5", "name": "His punch", "unit": "hp", "min": 1, "max": 50, "v": 13, "note": ""},
  {"id": "o5Speed", "group": "Opponent 5", "name": "His footwork", "unit": "m/s", "min": 1, "max": 8, "v": 3.7, "note": ""},
  {"id": "o5Cool", "group": "Opponent 5", "name": "Time between his punches", "unit": "s", "min": 0.3, "max": 4, "v": 0.85, "note": ""},
  {"id": "o5Block", "group": "Opponent 5", "name": "He blocks", "unit": "%", "min": 0, "max": 90, "v": 30, "note": ""},
  {"id": "o5Pay", "group": "Opponent 5", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 3200, "note": ""}
]
}/*END-GYM-JSON*/;
/* GYMT: the same settings in game units: m and m/s become game distances and speeds, % a fraction */
const GYMT = (() => { const o = {}; for (const r of GYM_TABLE.settings) o[r.id] = r.unit === 'm/s' ? r.v * MPS : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === '%' ? r.v / 100 : r.v; return o; })();
/* the five opponents: who they are (their numbers: Opponent 1-5 above) */
const GYM_FIGHTERS = [
  { name: 'KID RAMIREZ', shirt: '#2bf3ff', pants: '#1a1a24', skin: '#c99a6e', note: 'A skinny kid from Mercado: quick feet, no punch.' },
  { name: 'SAILOR DUKE', shirt: '#f2f2f2', pants: '#24345e', skin: '#e8c1a0', note: 'A merchant seaman between ships; swings wide.' },
  { name: 'THE BUTCHER', shirt: '#c0392b', pants: '#2a2a2a', skin: '#d9a07c', note: 'Works the meat market by day; slow and heavy.' },
  { name: 'IRON MIKE MORALES', shirt: '#ffd23f', pants: '#1a1a24', skin: '#8a5a3c', note: 'A Golden Gloves champion once; blocks well.' },
  { name: 'TANK', shirt: '#1a1a20', pants: '#7a1a1a', skin: '#f0c8a8', note: "Kessler's own champion: nobody has put him down." }];
const gymFoe = k => ({ hp: GYMT['o' + k + 'Hp'], dmg: GYMT['o' + k + 'Dmg'], speed: GYMT['o' + k + 'Speed'], cool: GYMT['o' + k + 'Cool'], block: GYMT['o' + k + 'Block'], pay: GYMT['o' + k + 'Pay'] });
