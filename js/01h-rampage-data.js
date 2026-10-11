'use strict';
/* ---------- 1h. RAMPAGES ----------
   Fifty rampages (kill frenzies) hidden around the city (js/08f), each marked by a turning skull with its weapon circling it - twenty
   in both modes and thirty more in free roam only (mode: both | free; the mode row moreFrenzies). Walk up to one and
   START it: for "time" seconds you have "weapon" in hand with endless spare ammo (reloading still takes its time), you stay on foot,
   and the police look the other way. Kill "count" people, or wreck "count" vehicles ("target"), with that weapon before the time runs
   out. The first time you pass one you get "reward" euros and keep the weapon with its basic load (a full magazine and its spare
   rounds when found); after that you can play it again for fun, without the reward. They cannot be started while you are wanted.
   target: people (anyone on foot, police included) or cars (any vehicle; it counts when it catches fire). The places are picked by
   the game: hiding places near a street, spread over the city, the first in the table nearest to where you start.
   Edit by hand or with tools/rampage_sheet.py (Apple Numbers or Excel). Keep the JSON between the markers valid. */
const RAMPAGE_TABLE = /*RAMPAGE-JSON*/{
"rampages": [
  {"id": "r01", "name": "KNUCKLE SANDWICH", "weapon": "fists", "target": "people", "count": 8, "time": 120, "reward": 1000, "notes": "The first one, near the start: learn to punch.", "mode": "both"},
  {"id": "r02", "name": "BATTER UP", "weapon": "bat", "target": "people", "count": 15, "time": 90, "reward": 1500, "notes": "", "mode": "both"},
  {"id": "r03", "name": "PISTOL WHIP", "weapon": "pistol", "target": "people", "count": 12, "time": 120, "reward": 1500, "notes": "", "mode": "both"},
  {"id": "r04", "name": "SHARP PRACTICE", "weapon": "knife", "target": "people", "count": 12, "time": 90, "reward": 1500, "notes": "", "mode": "both"},
  {"id": "r05", "name": "FORE!", "weapon": "golf", "target": "people", "count": 10, "time": 120, "reward": 1500, "notes": "", "mode": "both"},
  {"id": "r06", "name": "CHOP SHOP", "weapon": "machete", "target": "people", "count": 15, "time": 120, "reward": 2000, "notes": "", "mode": "both"},
  {"id": "r07", "name": "SIX FEET UNDER", "weapon": "revolver", "target": "people", "count": 18, "time": 120, "reward": 2000, "notes": "", "mode": "both"},
  {"id": "r08", "name": "HUBCAP HUNTER", "weapon": "pistol", "target": "cars", "count": 4, "time": 150, "reward": 2000, "notes": "", "mode": "both"},
  {"id": "r09", "name": "SPRAY AND PRAY", "weapon": "smg", "target": "people", "count": 20, "time": 120, "reward": 2500, "notes": "", "mode": "both"},
  {"id": "r10", "name": "SCRAP METAL", "weapon": "smg", "target": "cars", "count": 6, "time": 150, "reward": 2500, "notes": "", "mode": "both"},
  {"id": "r11", "name": "BUCKSHOT BOULEVARD", "weapon": "shotgun", "target": "people", "count": 16, "time": 120, "reward": 2500, "notes": "", "mode": "both"},
  {"id": "r12", "name": "BODY SHOP", "weapon": "shotgun", "target": "cars", "count": 8, "time": 120, "reward": 3000, "notes": "", "mode": "both"},
  {"id": "r13", "name": "LONG SHOT", "weapon": "sniper", "target": "people", "count": 12, "time": 120, "reward": 3000, "notes": "", "mode": "both"},
  {"id": "r14", "name": "BELT FED", "weapon": "lmg", "target": "people", "count": 30, "time": 120, "reward": 4000, "notes": "", "mode": "both"},
  {"id": "r15", "name": "RUSH HOUR", "weapon": "lmg", "target": "cars", "count": 10, "time": 120, "reward": 4000, "notes": "", "mode": "both"},
  {"id": "r16", "name": "PINEAPPLE PARTY", "weapon": "grenade", "target": "people", "count": 12, "time": 120, "reward": 3500, "notes": "", "mode": "both"},
  {"id": "r17", "name": "TRAFFIC CALMING", "weapon": "revolver", "target": "cars", "count": 6, "time": 150, "reward": 3500, "notes": "", "mode": "both"},
  {"id": "r18", "name": "DEMOLITION DERBY", "weapon": "pipebomb", "target": "cars", "count": 6, "time": 150, "reward": 4000, "notes": "", "mode": "both"},
  {"id": "r19", "name": "FIREWORKS", "weapon": "rocket", "target": "people", "count": 22, "time": 120, "reward": 5000, "notes": "", "mode": "both"},
  {"id": "r20", "name": "WRECKING CREW", "weapon": "rocket", "target": "cars", "count": 10, "time": 150, "reward": 6000, "notes": "", "mode": "both"},
  {"id": "r21", "name": "BARE KNUCKLES", "weapon": "fists", "target": "people", "count": 12, "time": 120, "reward": 1500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r22", "name": "GRAND SLAM", "weapon": "bat", "target": "people", "count": 20, "time": 120, "reward": 2000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r23", "name": "BACK ALLEY", "weapon": "knife", "target": "people", "count": 16, "time": 90, "reward": 2000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r24", "name": "HOLE IN ONE", "weapon": "golf", "target": "people", "count": 14, "time": 120, "reward": 2000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r25", "name": "CANE CUTTER", "weapon": "machete", "target": "people", "count": 20, "time": 120, "reward": 2500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r26", "name": "DOUBLE TAP", "weapon": "pistol", "target": "people", "count": 16, "time": 120, "reward": 2000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r27", "name": "FENDER BENDER", "weapon": "pistol", "target": "cars", "count": 5, "time": 150, "reward": 2500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r28", "name": "HIGH NOON", "weapon": "revolver", "target": "people", "count": 20, "time": 120, "reward": 2500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r29", "name": "HOT WHEELS", "weapon": "revolver", "target": "cars", "count": 7, "time": 150, "reward": 3500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r30", "name": "STREET SWEEPER", "weapon": "smg", "target": "people", "count": 25, "time": 120, "reward": 3000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r31", "name": "BUMPER CARS", "weapon": "smg", "target": "cars", "count": 8, "time": 150, "reward": 3000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r32", "name": "CLOSE QUARTERS", "weapon": "shotgun", "target": "people", "count": 20, "time": 120, "reward": 3000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r33", "name": "SHOTGUN WEDDING", "weapon": "shotgun", "target": "cars", "count": 9, "time": 120, "reward": 3500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r34", "name": "CROSSHAIRS", "weapon": "sniper", "target": "people", "count": 15, "time": 120, "reward": 3500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r35", "name": "ENGINE BLOCK", "weapon": "sniper", "target": "cars", "count": 5, "time": 150, "reward": 4000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r36", "name": "HAILSTORM", "weapon": "lmg", "target": "people", "count": 35, "time": 120, "reward": 4500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r37", "name": "SCRAPYARD", "weapon": "lmg", "target": "cars", "count": 12, "time": 150, "reward": 4500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r38", "name": "SPLASH ZONE", "weapon": "grenade", "target": "people", "count": 16, "time": 120, "reward": 4000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r39", "name": "CAR BOMB", "weapon": "grenade", "target": "cars", "count": 8, "time": 150, "reward": 4500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r40", "name": "BOOM TOWN", "weapon": "pipebomb", "target": "people", "count": 14, "time": 150, "reward": 4000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r41", "name": "GRIDLOCK", "weapon": "pipebomb", "target": "cars", "count": 9, "time": 150, "reward": 5000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r42", "name": "SKY HIGH", "weapon": "rocket", "target": "people", "count": 28, "time": 120, "reward": 6000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r43", "name": "BLOCKBUSTER", "weapon": "rocket", "target": "cars", "count": 14, "time": 150, "reward": 7000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r44", "name": "PUNCH DRUNK", "weapon": "fists", "target": "people", "count": 15, "time": 90, "reward": 2500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r45", "name": "NIGHT SHIFT", "weapon": "knife", "target": "people", "count": 20, "time": 120, "reward": 2500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r46", "name": "LUMBERJACK", "weapon": "machete", "target": "people", "count": 25, "time": 120, "reward": 3000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r47", "name": "SIX SHOOTER", "weapon": "revolver", "target": "people", "count": 24, "time": 120, "reward": 3000, "notes": "Free roam only.", "mode": "free"},
  {"id": "r48", "name": "LEAD RAIN", "weapon": "smg", "target": "people", "count": 30, "time": 120, "reward": 3500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r49", "name": "SCATTERSHOT", "weapon": "shotgun", "target": "people", "count": 26, "time": 120, "reward": 3500, "notes": "Free roam only.", "mode": "free"},
  {"id": "r50", "name": "GRAND FINALE", "weapon": "rocket", "target": "people", "count": 35, "time": 150, "reward": 8000, "notes": "Free roam only.", "mode": "free"}
]
}/*END-RAMPAGE-JSON*/;
const RAMPAGES = RAMPAGE_TABLE.rampages.filter(r => WEAPONS.some(w => w.id === r.weapon) && (r.target === 'people' || r.target === 'cars') && r.count > 0 && r.time > 0)
  .map((r, i) => Object.assign({}, r, { n: i + 1, wi: WEAPONS.findIndex(w => w.id === r.weapon), reward: r.reward || 0, x: 0, y: 0 }));
