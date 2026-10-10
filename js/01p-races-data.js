'use strict';
/* ---------- 1p. RACES ----------
   Street races, the NASCAR race at the speedway and the drag strip (js/08o, the speedway itself in js/10i).
   Street races come by phone: now and then a booth rings (on the maps while it rings); answer it on foot to hear the race. A fixed race
   (one of the routes below, best times kept) rings with a double ring, a random one (a new route each time) with a fast trill. Accept,
   pay the fee, and you have a minute to reach the start in a car of your choice - not a public service vehicle; stop at the start and
   it counts down. During a race the doors and FIRE are locked. The NASCAR race starts at the speedway's race booth (in the paddock by the
   shore street of the Palm Heights beach): you are put in a NASCAR special on the grid. The drag strip beside the oval: stop in the
   staging lane for an eighth-mile run against a rival.
   tools/settings_sheet.py exports the settings to Apple Numbers or Excel and writes an edited copy back:
     python3 tools/settings_sheet.py races export races.numbers  /  ... races import races.numbers
   routes: the fixed street races - a name, then the streets' junctions it goes through (x, y), start first, finish last; the race takes
   the shortest way by road between them. Keep the JSON between the markers valid. */
const RACES_TABLE = /*RACES-JSON*/{
"settings": [
  {"id": "booths", "group": "Phone booths", "name": "Phone booths in the city", "unit": "count", "min": 1, "max": 20, "v": 8, "note": "Always the same sidewalks, well spread. A booth shows on the maps only while it rings."},
  {"id": "ringEvery", "group": "Phone booths", "name": "A booth rings about every", "unit": "s", "min": 20, "max": 1200, "v": 120, "note": "Counted from when the last call ended. Never while you race, do a job or a rampage, or are wanted."},
  {"id": "ringFor", "group": "Phone booths", "name": "It rings for", "unit": "s", "min": 10, "max": 300, "v": 60, "note": "Get there and answer before it stops."},
  {"id": "ringNear", "group": "Phone booths", "name": "The ringing booth is at most", "unit": "m", "min": 50, "max": 2000, "v": 500, "note": "From you, as the crow flies: one of the booths around you rings."},
  {"id": "fixedShare", "group": "Phone booths", "name": "A booth by a fixed race's start offers that race in", "unit": "%", "min": 0, "max": 100, "v": 60, "note": "Of its calls (double ring); the rest are random races (fast trill). Booths far from every fixed start always offer random races."},
  {"id": "reachStart", "group": "Street races", "name": "After accepting you have to reach the start", "unit": "s", "min": 10, "max": 300, "v": 60, "note": "In a car of your choice, not a public service vehicle. Miss it and the race is off; the fee is not given back."},
  {"id": "countStreet", "group": "Street races", "name": "The start counts down", "unit": "s", "min": 1, "max": 10, "v": 3, "note": "Once you stop at the start in an allowed car."},
  {"id": "rivals", "group": "Street races", "name": "Rivals", "unit": "count", "min": 1, "max": 7, "v": 5, "note": "In fast civilian cars, waiting at the start."},
  {"id": "randomNear", "group": "Street races", "name": "A random race is at least", "unit": "m", "min": 200, "max": 3000, "v": 500, "note": "By road, start to finish. Its start is a short drive from the booth."},
  {"id": "randomFar", "group": "Street races", "name": "and at most", "unit": "m", "min": 300, "max": 5000, "v": 1000, "note": ""},
  {"id": "cpEvery", "group": "Street races", "name": "Checkpoints at least every", "unit": "m", "min": 30, "max": 500, "v": 120, "note": "And at every turn of the route. Pass each one in order."},
  {"id": "cpSize", "group": "Street races", "name": "A checkpoint counts within", "unit": "m", "min": 3, "max": 20, "v": 8, "note": "Of its centre."},
  {"id": "rivalPace", "group": "Street races", "name": "Rivals drive at up to", "unit": "%", "min": 50, "max": 120, "v": 92, "note": "Of their car's top speed on straights; they brake for corners and do not wait for you."},
  {"id": "randomFee", "group": "Street races", "name": "A random race costs", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "Paid when you accept."},
  {"id": "randomPrize1", "group": "Street races", "name": "A random race pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 600, "note": ""},
  {"id": "randomPrize2", "group": "Street races", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 250, "note": ""},
  {"id": "randomPrize3", "group": "Street races", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 100, "note": "Fourth and later: nothing."},
  {"id": "seaviewFee", "group": "Seaview Sprint", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "605 m from Seaview down the coast to Sunstrip."},
  {"id": "seaviewPrize1", "group": "Seaview Sprint", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 700, "note": ""},
  {"id": "seaviewPrize2", "group": "Seaview Sprint", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 300, "note": ""},
  {"id": "seaviewPrize3", "group": "Seaview Sprint", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 120, "note": ""},
  {"id": "palmFee", "group": "Palm Heights Run", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "555 m through the blocks of Palm Heights."},
  {"id": "palmPrize1", "group": "Palm Heights Run", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 700, "note": ""},
  {"id": "palmPrize2", "group": "Palm Heights Run", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 300, "note": ""},
  {"id": "palmPrize3", "group": "Palm Heights Run", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 120, "note": ""},
  {"id": "bridgeFee", "group": "Bridge Dash", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 200, "note": "940 m from Mercado over the bridges by Pearl Key to Coral Shore."},
  {"id": "bridgePrize1", "group": "Bridge Dash", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 1200, "note": ""},
  {"id": "bridgePrize2", "group": "Bridge Dash", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 500, "note": ""},
  {"id": "bridgePrize3", "group": "Bridge Dash", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 200, "note": ""},
  {"id": "docksFee", "group": "Dockside Dash", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 200, "note": "975 m from the docks up through Mercado."},
  {"id": "docksPrize1", "group": "Dockside Dash", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 1200, "note": ""},
  {"id": "docksPrize2", "group": "Dockside Dash", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 500, "note": ""},
  {"id": "docksPrize3", "group": "Dockside Dash", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 200, "note": ""},
  {"id": "coralFee", "group": "Coral Circuit", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "502 m from Coral Shore up to Sunstrip."},
  {"id": "coralPrize1", "group": "Coral Circuit", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 600, "note": ""},
  {"id": "coralPrize2", "group": "Coral Circuit", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 250, "note": ""},
  {"id": "coralPrize3", "group": "Coral Circuit", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 100, "note": ""},
  {"id": "nascarCars", "group": "NASCAR race", "name": "Cars in the race", "unit": "count", "min": 2, "max": 12, "v": 8, "note": "You and the rest, every one a NASCAR special."},
  {"id": "nascarLaps", "group": "NASCAR race", "name": "Laps", "unit": "count", "min": 1, "max": 30, "v": 5, "note": "Of the oval, about 195 m a lap."},
  {"id": "nascarCount", "group": "NASCAR race", "name": "The start counts down", "unit": "s", "min": 2, "max": 15, "v": 7, "note": "After you are put on the grid."},
  {"id": "nascarPace", "group": "NASCAR race", "name": "Rivals drive at up to", "unit": "%", "min": 50, "max": 120, "v": 95, "note": "Of the car's top speed on the straights and of the grip in the turns."},
  {"id": "nascarFee", "group": "NASCAR race", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 250, "note": "Paid at the race booth."},
  {"id": "nascarPrize1", "group": "NASCAR race", "name": "Pays the winner", "unit": "€", "min": 0, "max": 100000, "v": 2500, "note": ""},
  {"id": "nascarPrize2", "group": "NASCAR race", "name": "second place", "unit": "€", "min": 0, "max": 100000, "v": 1200, "note": ""},
  {"id": "nascarPrize3", "group": "NASCAR race", "name": "third place", "unit": "€", "min": 0, "max": 100000, "v": 600, "note": ""},
  {"id": "dragFee", "group": "Drag strip", "name": "Fee", "unit": "€", "min": 0, "max": 10000, "v": 100, "note": "An eighth of a mile (201 m) against one rival in a fast car."},
  {"id": "dragPrize", "group": "Drag strip", "name": "A win pays", "unit": "€", "min": 0, "max": 100000, "v": 400, "note": ""},
  {"id": "dragReact", "group": "Drag strip", "name": "The rival is off the line after", "unit": "s", "min": 0, "max": 2, "v": 0.35, "note": "On average, after the green light."},
  {"id": "resultsFor", "group": "Results", "name": "The results show for", "unit": "s", "min": 2, "max": 60, "v": 10, "note": "Or close them sooner. Meanwhile your car stops; after the NASCAR race you are back at the race booth."}
],
"routes": [
  {"id": "seaview", "name": "SEAVIEW SPRINT", "via": [[11383, 3160], [11120, 4210], [11787, 4850], [12379, 4850], [12379, 9057]]},
  {"id": "palm", "name": "PALM HEIGHTS RUN", "via": [[5630, 2600], [6274, 3660], [7268, 4850], [5288, 5644]]},
  {"id": "bridge", "name": "BRIDGE DASH", "via": [[6274, 6440], [7460, 9630], [10581, 10472]]},
  {"id": "docks", "name": "DOCKSIDE DASH", "via": [[4748, 13752], [6274, 11960], [6117, 9900], [4748, 6440]]},
  {"id": "coral", "name": "CORAL CIRCUIT", "via": [[9987, 11960], [12207, 10472], [11491, 8243]]}
]
}/*END-RACES-JSON*/;
/* RC: the settings in game units: km/h and m become game speeds and distances, % a fraction */
const RC = (() => { const o = {}; for (const r of RACES_TABLE.settings) o[r.id] = r.unit === 'km/h' ? r.v * KMH : r.unit === 'm' ? r.v * UNITS_PER_M : r.unit === '%' ? r.v / 100 : r.v; return o; })();
const RACE_ROUTES = RACES_TABLE.routes;
