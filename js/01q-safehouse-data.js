'use strict';
/* ---------- 1q. SAFEHOUSES ----------
   The ten places you can own (js/08s, js/08t, js/10l): the free room at the Colony to start, then flats in towers and houses about the
   city. kind: tower - a flat in a tall building, seen in the side-on view inside (floors: how many, home: the floor your flat is on);
   house - a house (or the houseboat: boat) seen from above with its roof turning see-through. floors: floors above the lobby; home: 1 to
   floors. price in euros (also in the economy sheet);
   cars: how many cars it keeps - a garage you drive into for a house, reserved parking spaces by the building for a tower.
   settings: when you wake after sleeping, the police, how many people live in a tower's hallways.
   tools/safehouse_sheet.py exports this table to Apple Numbers or Excel and reads an edited copy back:
     python3 tools/safehouse_sheet.py export safehouses.numbers  /  ... import safehouses.numbers [--dry-run]
   Keep the JSON between the markers valid. */
const SAFE_TABLE = /*SAFE-JSON*/{
"settings": [
  {"id": "wakeMorning", "name": "Sleeping at night, you wake at", "unit": "hour", "min": 0, "max": 23, "v": 8, "note": "Night: from the evening wake-up hour until this one."},
  {"id": "wakeEvening", "name": "Sleeping by day, you wake at", "unit": "hour", "min": 0, "max": 23, "v": 20, "note": "Day: from the morning wake-up hour until this one."},
  {"id": "loseUpTo", "name": "Going in unseen, the police lose you up to", "unit": "stars", "min": 0, "max": 5, "v": 5, "note": "A cop who sees you go in is not fooled. 0: never."},
  {"id": "neighbours", "name": "People in a tower's hallways", "unit": "count", "min": 0, "max": 30, "v": 6, "note": "Walking the floors, going in and out of their doors (the side-on view)."},
  {"id": "openDoors", "name": "Empty rooms you can walk into, per tower", "unit": "count", "min": 0, "max": 20, "v": 3, "note": "Doors on the hallways that open (the rest stay shut)."}
],
"houses": [
  {"id": "colony", "name": "COLONY HOTEL ROOM", "kind": "tower", "where": "THE SANDBAR", "price": 0, "cars": 1, "floors": 6, "home": 3, "note": "Yours from the start: a room on the third floor; a reserved space in the guests' lot."},
  {"id": "trailer", "name": "CORAL SHORE TRAILER", "kind": "house", "where": "CORAL SHORE", "price": 3000, "cars": 1, "floors": 1, "home": 0, "note": "A silver trailer on a fenced yard with a carport garage."},
  {"id": "flat", "name": "MERCADO FLAT", "kind": "tower", "where": "MERCADO", "price": 8000, "cars": 1, "floors": 4, "home": 2, "note": "Two rooms in an old brick block; a reserved space on the street."},
  {"id": "houseboat", "name": "HOUSEBOAT", "kind": "boat", "where": "DOCKSIDE", "price": 15000, "cars": 0, "floors": 1, "home": 0, "note": "Moored at the port's west quay; a gangplank from the quay. No room for a car (a boat later)."},
  {"id": "bungalow", "name": "HERON KEY BUNGALOW", "kind": "house", "where": "HERON KEY", "price": 20000, "cars": 2, "floors": 1, "home": 0, "note": "On its own beach beside the lunapark car park; a garage for two."},
  {"id": "loft", "name": "PALM HEIGHTS LOFT", "kind": "tower", "where": "PALM HEIGHTS", "price": 30000, "cars": 2, "floors": 6, "home": 5, "note": "A loft high in a brick building downtown; two reserved spaces."},
  {"id": "condo", "name": "SEAVIEW CONDO", "kind": "tower", "where": "SEAVIEW", "price": 45000, "cars": 2, "floors": 10, "home": 8, "note": "A condo with a sea view; two reserved spaces."},
  {"id": "deco", "name": "SUNSTRIP DECO APARTMENT", "kind": "tower", "where": "SUNSTRIP", "price": 60000, "cars": 3, "floors": 6, "home": 4, "note": "Pastel art deco, neon on the roof; three reserved spaces."},
  {"id": "mansion", "name": "FAIRWAY ISLES MANSION", "kind": "house", "where": "FAIRWAY ISLES", "price": 120000, "cars": 4, "floors": 1, "home": 0, "note": "Behind a gate on the golf links: a pool, palms, a garage for four."},
  {"id": "penthouse", "name": "PENTHOUSE", "kind": "tower", "where": "PALM HEIGHTS", "price": 150000, "cars": 4, "floors": 20, "home": 20, "note": "The top of the tallest glass tower; four reserved spaces."}
]
}/*END-SAFE-JSON*/;
/* SAFE: the settings by id; SAFE_HOUSES: the rows (js/08s fills in where each one is) */
const SAFE = Object.fromEntries(SAFE_TABLE.settings.map(r => [r.id, r.v]));
const SAFE_HOUSES = SAFE_TABLE.houses.map(h => Object.assign({}, h));
