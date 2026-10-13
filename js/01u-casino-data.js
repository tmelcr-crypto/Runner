'use strict';
/* ---------- 1u. THE CASINO STRIP ----------
   The ROYAL FLAMINGO casino and THE PULSE nightclub on the beach avenue in Sunstrip, and the bars along it (js/10w, js/08zu; modes:
   casino, club): the doors and their dress code (which pieces are smart: the clothes table's Smart column), the slot machines' reels and
   what they pay, the dice table's bets, the guards and the trouble they make, the cashier's cage, the club's hours and crowd, the people
   on the strip at night. tools/settings_sheet.py exports this table to Apple Numbers or Excel and writes an edited copy back:
     python3 tools/settings_sheet.py casino export casino.numbers  /  ... casino import casino.numbers
   (the money is also in tools/economy_sheet.py). Keep the JSON between the markers valid. */
const CASINO_TABLE = /*CASINO-JSON*/{
"settings": [
  {"id": "dressCode", "group": "Doors", "name": "Dress code at both doors", "unit": "yes/no", "min": 0, "max": 1, "v": true, "note": "YES: the bouncers turn you away unless you wear at least one smart piece (clothes table: Smart). Nobody gets in while wanted, and the club only while it is open."},
  {"id": "slotBet", "group": "Slot machines", "name": "A pull costs", "unit": "€", "min": 1, "max": 1000, "v": 10, "note": "Every slot machine; what three of a kind pays is this times the pay below."},
  {"id": "jackpot", "group": "Slot machines", "name": "Three flamingos: the jackpot", "unit": "€", "min": 0, "max": 1000000, "v": 25000, "note": "A fixed sum, whatever the pull costs."},
  {"id": "paySeven", "group": "Slot machines", "name": "Three sevens pay", "unit": "x bet", "min": 0, "max": 5000, "v": 100, "note": ""},
  {"id": "payBar", "group": "Slot machines", "name": "Three bars pay", "unit": "x bet", "min": 0, "max": 5000, "v": 25, "note": ""},
  {"id": "payBell", "group": "Slot machines", "name": "Three bells pay", "unit": "x bet", "min": 0, "max": 5000, "v": 15, "note": ""},
  {"id": "payLemon", "group": "Slot machines", "name": "Three lemons pay", "unit": "x bet", "min": 0, "max": 5000, "v": 10, "note": ""},
  {"id": "payCherry", "group": "Slot machines", "name": "Three cherries pay", "unit": "x bet", "min": 0, "max": 5000, "v": 8, "note": ""},
  {"id": "payTwoCherry", "group": "Slot machines", "name": "Two cherries pay", "unit": "x bet", "min": 0, "max": 100, "v": 1, "note": "Anywhere on the line (1: your money back)."},
  {"id": "wFlamingo", "group": "Slot machines", "name": "Flamingos on each reel", "unit": "count", "min": 0, "max": 20, "v": 1, "note": "Each reel has this many of each picture; the rarer one is, the more seldom it lands. With these numbers a machine pays back about 92% of what goes in."},
  {"id": "wSeven", "group": "Slot machines", "name": "Sevens on each reel", "unit": "count", "min": 0, "max": 20, "v": 2, "note": ""},
  {"id": "wBar", "group": "Slot machines", "name": "Bars on each reel", "unit": "count", "min": 0, "max": 20, "v": 4, "note": ""},
  {"id": "wBell", "group": "Slot machines", "name": "Bells on each reel", "unit": "count", "min": 0, "max": 20, "v": 5, "note": ""},
  {"id": "wLemon", "group": "Slot machines", "name": "Lemons on each reel", "unit": "count", "min": 0, "max": 20, "v": 6, "note": ""},
  {"id": "wCherry", "group": "Slot machines", "name": "Cherries on each reel", "unit": "count", "min": 1, "max": 20, "v": 7, "note": ""},
  {"id": "diceMin", "group": "Dice", "name": "The smallest bet", "unit": "€", "min": 1, "max": 100000, "v": 50, "note": "Craps, the pass line: 7 or 11 on the first roll wins, 2, 3 or 12 loses; any other total is the point - roll it again before a 7 to win. A win pays what you bet; the house wins slightly more often."},
  {"id": "diceMax", "group": "Dice", "name": "The biggest bet", "unit": "€", "min": 1, "max": 1000000, "v": 5000, "note": ""},
  {"id": "gamblers", "group": "People", "name": "Gamblers in the casino", "unit": "count", "min": 0, "max": 20, "v": 10, "note": "At the slot machines and round the dice tables, day and night."},
  {"id": "guards", "group": "Guards and trouble", "name": "Armed guards inside", "unit": "count", "min": 0, "max": 6, "v": 4, "note": "Black suits, pistols; one more stands at the door. A guard killed is replaced a few minutes later, while you are away."},
  {"id": "troubleStars", "group": "Guards and trouble", "name": "Trouble inside gives", "unit": "stars", "min": 0, "max": 5, "v": 2, "note": "Shooting in the casino, or hurting anyone in it: the guards draw their guns and the police are called."},
  {"id": "calm", "group": "Guards and trouble", "name": "The guards calm down after you are out for", "unit": "s", "min": 5, "max": 600, "v": 60, "note": ""},
  {"id": "cageMin", "group": "Cashier's cage", "name": "Robbing the cage pays at least", "unit": "€", "min": 0, "max": 1000000, "v": 15000, "note": "With a gun in your hand at the cage's window: ROB. The cashier fills a bag while you wait there."},
  {"id": "cageMax", "group": "Cashier's cage", "name": "and at most", "unit": "€", "min": 0, "max": 1000000, "v": 40000, "note": ""},
  {"id": "robStars", "group": "Cashier's cage", "name": "A robbery gives", "unit": "stars", "min": 0, "max": 5, "v": 4, "note": "At once; the guards open fire too."},
  {"id": "robTime", "group": "Cashier's cage", "name": "Filling the bag takes", "unit": "s", "min": 1, "max": 30, "v": 6, "note": "Step away from the window before it is done and you get nothing."},
  {"id": "cageBack", "group": "Cashier's cage", "name": "The cage has cash again after", "unit": "min", "min": 1, "max": 600, "v": 20, "note": ""},
  {"id": "clubOpen", "group": "THE PULSE", "name": "The club opens at", "unit": "hour", "min": 0, "max": 23, "v": 22, "note": "Then the queue forms at the door, the dancers fill the floor and the music plays; the casino never closes."},
  {"id": "clubClose", "group": "THE PULSE", "name": "and closes at", "unit": "hour", "min": 0, "max": 23, "v": 6, "note": ""},
  {"id": "dancers", "group": "THE PULSE", "name": "People dancing", "unit": "count", "min": 0, "max": 30, "v": 14, "note": ""},
  {"id": "queue", "group": "THE PULSE", "name": "People queuing at the door", "unit": "count", "min": 0, "max": 12, "v": 6, "note": "Along the sidewalk, waiting their turn; you walk past them if you are dressed for it."},
  {"id": "clubStation", "group": "THE PULSE", "name": "The music: radio station number", "unit": "count", "min": 1, "max": 5, "v": 2, "note": "Its number in the radio list (1 NEON FM, 2 BAY BEATS, 3 RADIO PALMERA, 4 RIOT, 5 LOW TIDE); it plays while you are inside."},
  {"id": "stripPeople", "group": "The strip", "name": "People out on the strip at night", "unit": "count", "min": 0, "max": 40, "v": 14, "note": "Strolling the avenue's sidewalks between the casino and the bars, from dusk."}
]
}/*END-CASINO-JSON*/;
/* CSN: the same settings in game units: minutes become seconds */
const CSN = (() => { const o = {}; for (const r of CASINO_TABLE.settings) o[r.id] = r.unit === 'min' ? r.v * 60 : r.v; return o; })();
