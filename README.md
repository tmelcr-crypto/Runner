# Block Runner

Top-down GTA 1 style crime sandbox in neon 3D. Vanilla JS + three.js r128 (loaded from cdnjs). No build step.

Run it: serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or open `index.html` directly.

## Game modes

**NEW GAME** first asks how you want to play: **FREE ROAM** - the city as it is, no story, everything below - or **STORY**, missions told as a story, which is built later and shows as *COMING SOON* until then. Free roam then goes on to its options. A saved game keeps its mode (the save list and the pause menu show it); saves from before the modes are free roam.

Which features each mode has is a table, `js/01j-mode-data.js`: one row per feature - police and wanted levels, hidden weapons, hidden items, the stores, rampages, cash stacks in town, cash in cars, loot from the dead, armed passers-by, hidden vehicles, ambulances and fire engines, paramedics with stretchers, blasts tearing people apart, irregular blood marks, pickups only on foot, planes landing and taking off, the airport gate barriers and guards, the military base, cargo ships and cranes, the lunapark rides, the space center guards, traffic lights and the rules of the road, sirens going through red, the heat reducer on the road, the heat reducers in back alleys, heat reducers taken from a car, the drive-by, grenades in a car, the water cannon, the clothes shops, car delivery at the docks, the Pay 'n' Spray garages, the lunapark car park, the safehouses, the boats at the grove pier, boats' wake and spray, job vehicles tougher during a job, police following you into buildings, the Colony's valet, the sunny day and dark night, the shop figure, livelier walking, the thirty more kill frenzies, the weapon grid, the police helicopter, the black market at the docks, the departures desk and the scenic flight - with yes / no for free roam and for story (story has everything but the thirty extra frenzies for now). The game asks the table before using a feature, and every new feature gets a row. A second sheet holds numbers that differ by mode: story mode hides 30% as many weapons, ammo and items around the city as free roam (`pickups`). What is kept for story mode - like the way into the space center - is written down in `docs/STORY.md`. `tools/mode_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back:

```
python3 tools/mode_sheet.py export modes.numbers      # or modes.xlsx
python3 tools/mode_sheet.py import modes.numbers [--dry-run]
```

## Menus and saved games

- **Title**: *Continue* (the latest save, with when and where it was made), *New game*, *Load game*, *Help*, and *City file preview*. The arrow keys move between the buttons, Enter picks, Esc goes back; everything also works by mouse or touch.
- **Touch screens (phone and tablet)** get a compact HUD: top left your cash (**€12,345**), health and armor as two numbers (pink and blue; armor only while you wear some), and the weapon as an icon with its ammo under it (tap it for the weapon wheel); in a car a radio icon beside it. Stars and the clock sit small under the minimap; getting into a car its name shows there for a moment. There is no car health bar and no ON FOOT box, no sound button (the device's volume) and no MENU on screen: tap the minimap and MENU is in the corner of the city map. In a car you point the left stick where you want to go and the car drives that way, turning almost on the spot (there is no gear selector and no reverse on a touch screen; the keyboard keeps S / DOWN for reverse); BRAKE and FIRE sit side by side in the right corner for the other thumb. On a phone held sideways the buttons gather in the bottom right corner, clear of the minimap, the stars and the clock: DASH beside FIRE and ENTER / EXIT above DASH; in a car ENTER / EXIT above BRAKE. The move stick's ring shows right under your thumb. Desktop keeps the full HUD.
- **Touch screens**: the browser's own gestures are switched off - pinch to zoom, double-tap to zoom, the long-press menu, text selection - so the page never zooms in or out or shrinks under your fingers (Safari on iPad and iPhone included). Buttons still take quick taps.
- **New game**: first the mode (*Game modes* above), then the free roam choices, remembered for next time:
  - *Time of day*: dawn, morning, noon, evening (17:30) or night.
  - *Weather*: changing, or always clear, cloudy, rain, storm or fog.
  - *Clock*: a 12, 24 or 48 minute day, or stopped.
  - *Police*: relaxed, normal or tough - more or less heat for each crime, how many cars they send and how soon, and how long they search.
  - *Streets*: quiet, busy or packed - how much traffic and how many people.
  - *Start in*: the usual spot (the door of your room at the Colony, your car in its reserved space in the guests' lot), a random street, or any of the 13 districts.
- **Pause** with Esc, P or the MENU button (top; inside a tower too); the game also pauses when you switch to another app or tab. From there: resume, load, new game, help, quit to the title.
- **Saving**: an autosave every minute while no police are after you (and when you pause by switching away, quit to the title, buy something, leave a safehouse), plus three slots, each with a small picture of the screen, the time, the weather, the district and the score. The slots are chosen only when you **SLEEP in a safehouse** (*Safehouses*); the pause menu has no SAVE any more (with the mode row `safehouses` off it has). You cannot save while you are wanted. A save keeps where you are (and the car you are in), health and body armor, weapons and ammo, the rampages found and passed, score and kills, the clock, the weather, the New game choices, and the safehouses you own, the cars they keep and the weapon stash, and the stats (*Stats and 100%*). Saves live in the browser (localStorage); *Download save file* and *Open save file* (on the save slots after sleeping, and on Load game) move a game to another device.
- **Help**: five pages - controls (keyboard and touch), playing (points, cars, pickups, stores, rampages, wasted and busted), the weapons (from the weapon table), the police, and the city (map, day and weather, services, saving).

## The city

A made-up bay city on the outline of a reference map: two main islands, a few bay islands joined by straight bridges, a long ocean beach on the east side, the Skyport airport in the south-west with a military base north of it, a container port at Dockside, a lunapark on Heron Key and a space center at Gravel Flats. Only the shape of the land, the beaches and the water come from the reference image; every street and building is generated.

- **Streets**: every island has a ring road along its coast, built only from straight runs at 0, 45 and 90 degrees, so every turn is 45, 90 or 135 degrees; a road keeps its full width through every bend (the pieces meet at their mitre on the inside, the outside is rounded). Inside the ring the land is cut again and again by straight streets into an irregular grid (new streets line up with old ones so crossings meet properly), with one 45 degree avenue in a few districts. No junction joins more than four streets and there are no dead ends: the only road that ends is a short driveway to a landmark gate.
- **Streets as streets**: two traffic lanes, a parking lane on each side and a sidewalk for people. Parked cars only stand where they fit inside the parking lane, so they never block traffic or the sidewalk.
- **Blocks**: rows of buildings along every street side, turned to face their street, with corner buildings facing the side street. The rows of a block stand back to back, or back to back across a back alley, so their backs line up; whatever is left inside a block becomes parking lots, service yards, gardens, gas stations, plazas with fountains, basketball courts, pocket parks and parks. No ground is left over: leftover land is a yard, a promenade along the water, a quay or the airport apron. Towers downtown and along the beach; warehouses, container yards and cranes at the docks.
- **Back alleys and yards**: dumpsters, trash bags, crates, pallets, bins, barrels, puddles, washing lines across the narrow alleys, lamps over the back doors. The backs of the buildings have back doors, drainpipes, window AC boxes, graffiti and iron fire escapes (a landing at every floor, stairs between them, a drop ladder and a ladder over the roof edge); warehouses get a roller door and a loading dock. Dumpsters, crate stacks and AC units are solid, and stand only where an alley is wide enough to leave a car's width clear down the middle, so every alley can be driven through. Promenades get palms, benches and lamps, quays get bollards, the apron gets floodlights and baggage carts.
- **Parking lots** work like real ones: every lot opens onto a street (its entrance faces it; lots the street plan left without one became gardens or service yards) and belongs to the building next to it, whose colour its P sign carries (a lot with no building next door got a small one of its own at the back). Nose-in stalls along the back kerb, the aisle open to the entrance, a second row along the front of the deep ones. Lots near you are about half full; the airport's big lot about a third.
- **Hospitals and police stations**: four of each, spread over the city. A hospital is white with a big red cross on its roof, a red cross and a HOSPITAL sign over the entrance; a police station is blue with POLICE written on its roof, a POLICE sign, blue lamps at the door, a blue and white checkered band and a flag, and its parking lot holds its patrol cars. Both show on the minimap and the city map. Wasted, you start again at the door of the nearest hospital; busted, at the nearest police station.
- **Landmarks**: Bayfront Park downtown (a lake with a boathouse, a pier, paddle boats, a fountain and a band shell), the Bay TV tower over Mercado, the Twist (a glass tower that turns a quarter turn as it rises), the Crown (a stepped deco tower with a gold sunburst crown and a spire), the Sail hotel and the Bay Wheel on the beach, the golf links as one big park with lakes, the Neon Bowl stadium, the Pearl Key estate, Bayside Mall in a park that covers its whole peninsula (lawns, trees, paths with benches and lamps round a pond, a paved walk round the mall and its driveway), the lighthouse, the Skyport airport, the port, the lunapark, the military base and the space center (below), and **the Colony** on the Sandbar beach east of the start (below).
- **Names on the buildings**: every name in the city is on what it names - a facade, a parapet, an arch, a gateway or a pylon - and nothing floats in the air: NEON BOWL on a gateway over the stadium's south entrance between two pylons, BAYSIDE MALL on the entrance front carried up over the roof, THE TWIST and THE SAIL on name walls on their podiums, BAY TV on the tower's base, SKYPORT on the terminal's south front, the lunapark's name on its arch, LUNAPARK PARKING on the car park's south face, the stores' and clothes shops' names over their doors. A front that faces east or west, which the camera sees side-on, gets a blade sign standing out from it toward the camera.
- **Parks**: tall leafy trees (now and then one in flower), pines, bushes and patches of tall grass; a car flattens a bush.
- **Autumn** (mode `autumn`, both modes): it is always autumn - the leafy trees and bushes in reds, oranges, yellows and browns (now and then one still green), the pines a duller green, the undergrowth dry; palms stay as they are. A few leaves drift down from the trees around you, and a flattened bush leaves brown leaves, not green.
- **Trees you knock down** (mode `trees`, both modes): every tree - in the woods, the parks, the designed parks and the landmarks' grounds, the palms along the streets, in the alleys, on the beaches and in the grove - is no wall. On foot you walk under it and straight through its trunk. A vehicle that drives into one knocks it down and takes no damage, but loses a share of its speed for each tree, by weight (vehicles table, *Slowed by each tree*): the motorbike 70%, a sports car 50%, a sedan 48%, a police car 46%, a pickup 37%, a limo 35%, a truck 34%, the APC 32%, a bus 29%, the fire engine 27%, the trash truck 25% - and the **tank** nothing, it ploughs through a wood. A blast close by fells trees too. A tree tips over the way it was pushed, faster and faster, thuds down with its leaves flying, lies a moment and sinks away, leaving its stump; it stands again after 1.5 minutes once you are far enough not to see it (places table, *City*: `treeBack`). **Under a tree** - on foot, or in a vehicle that has stopped - the police helicopter's searchlight cannot see you (`js/12g-trees.js`).
- **Towers downtown**: in Palm Heights, Sunstrip and Seaview, half of the bigger buildings behind the street fronts rise as towers of 8 to 20 floors (never one whose front is on a street, so no sidewalk disappears behind it) - with the skyscrapers and condo towers, the skyline a flight will have to clear. The share and the heights are in the places table (*City*).
- **Woods**: every lawn at least 50 m across - the golf links, the big parks, the long greens - is wooded in patches over about half of it, meadows and clearings between; pines and broadleaves about 3.5 m apart, a few in flower. The space center's grounds get low pine scrub and saw palmetto away from its buildings, pad and crawlerway. The landmark parks and the designed ones keep their own look. Like every tree, they fall when a vehicle drives into them (above); the saw palmetto is flattened like a bush (`js/10q-forests.js`; places table, *City*).
- **Closed driveways**: traffic never turns into a driveway to a landmark, and a boom gate stops every car except a police car (people walk past it).
- **Real-world speeds** at 12 world units to the metre: people stroll at about 1.4 m/s, run at 5 and sprint at 7 (you are 15% quicker than everyone else); town traffic drives at 40-55 km/h; cars reach 130-260 km/h depending on type, and traffic accelerates, brakes and corners like real cars.
- **Damage you can see**: there is no car health bar (anywhere) - a damaged vehicle shows it. Thin white wisps from the bonnet, then thick grey smoke and sparks, then black smoke, flames from the bonnet and the paint throbbing dull red; once it catches fire it burns all over, flickering orange, until it blows. The paint scorches darker the more damage it takes.
- **Weapons in a car**: getting into an ordinary car puts grenades in your hand (or pipe bombs), to drop out of the window - unless you hold a gun that fires from a car; getting out, you have your weapon back. The tank fires its rockets, the APC its **turret machine gun** and the fire engine its **water cannon** instead - no bombs from those. The APC's turret turns to the nearest target ahead (a wide arc) and fires while FIRE is held: belts of 100 that never run out, each new one taking the machine gun's reload time (the panel under the speed shows BELT 64 or RELOADING 9 S; police table, *Tank and APC*). The water cannon sprays a jet 25 m straight ahead: people and cops in it are knocked down and pushed away (no damage, but it counts like a punch for the police), cars are pushed, and burning cars are put out before they blow (streets table, *Water cannon*). Modes: `carGrenades`, `waterCannon`.
- **Drive-by**: with a pistol, revolver, SMG or machine gun in hand (weapon table: *fires from a car*), FIRE in a car shoots out of the window at the nearest target ahead - a person, a cop, a vehicle - within the gun's range and in sight; with nobody there, straight ahead. A little less accurate than on foot; it uses ammo, reloads, and counts as gunfire for the police. Other guns stay on foot; a grenade or pipe bomb is dropped out of the window. Modes: `driveBy`.
- **Your car drives arcade style**: it picks up about twice as fast as the real car, brakes harder, keeps its grip unless you pull the handbrake to drift, and turns tightly at any speed.
- **Stealing cars**: an empty car is yours after a second and drives off at once. Taking a car is a crime the police can see, unless it is already yours: one you have taken before, one from your garage, one you bought, the gold car. Carjacking takes three seconds of fighting the driver for the wheel while the car lurches and swerves; let go (E again) and you drop off beside it.
- Traffic keeps to its lane, brakes in time for what is ahead and keeps to the traffic lights (below); police take the shortest route by road and only drive straight at you when nothing is in between. People walk the sidewalks and cross at the zebras on the walk signal, and some stroll about the back alleys, the parks, the beaches and the promenades. Nobody walks through anybody: people push each other aside and step round cars, parked or not, and never into a wall.
- The sea is everywhere outside the coast: you can wade a little; a car you drive off the shore sinks (traffic and police stop at the water and cannot be shoved in). Bridges have rails.
- **TAB**, or a tap / click on the minimap, opens the whole city map; the game waits while it is open, and a tap (or TAB) closes it. The district name shows when you enter a new one.
- Only what is near the camera exists as meshes; the low buildings are merged per area into one mesh each. Buildings and landmarks between the camera and the player turn see-through.

`js/00-map-data.js` is generated by `tools/build_city.py` from a reference map image: `python tools/build_city.py <map image> js/00-map-data.js [preview.png]` (needs numpy, opencv-python-headless, scikit-image, shapely 2, pillow). Landmark places, bridges, runways, district names and the start point are set in the script; the random seed is fixed, so the same image always gives the same city. After laying out the blocks it checks every parking lot: a lot that does not open onto a street is turned to face the one it touches, or becomes a garden or a service yard if it touches none, and each lot is tied to the building next to it (`lots[6]`). It then picks the four police stations (buildings with a lot of their own) and the four hospitals, spread over the city (`services`).

The reference image is not kept in the repository, so later changes to the city are made in place: `python3 tools/remodel_city.py [js/00-map-data.js]` (shapely 2) edits the generated file and leaves everything else exactly as it is. It cleared the ground west of the avenue from the hangars to the south shore and laid out the airport there (`airport`: the airfield's grass, the runway, taxiways and links, the apron with its taxi lane and five gates, the terminal, hangars, tower, the fence and its two gates; the service roads and forecourt as yards; the big lot as four lots side by side, `lots[7]` = share of stalls taken); the south shore road that crossed the airfield now runs up the avenue. It turned the mall's peninsula into one park (grass, paths as yards of kind `pk`, a pond cut out of the land so it is real water) with the mall's driveway kept. Version 2 turned Dockside into the port (straight quays with five berths, crane rails, container yards, warehouses, a maintenance yard, a tug pier; `port`), grew Heron Key and laid out the lunapark on it with a car park across the street (`lunapark`), cleared Gravel Flats for the space center (`space`; its police station moved to a building with a lot in Palm Heights), made the peninsula north of the airport the military base (`base`) and added roads from the airport gates. Version 3 put a small speedway on the Palm Heights beach (`speedway`: the oval, the grandstand on ground won from the sea, the paddock with the garages and the race booth by the shore street) and two drag strips (`speedway.strips`, each with its booth: the eighth-mile Palm strip along that beach's east edge and the 600 m Sandbar strip down the east beach with its lane from the avenue; yards of kind `sp`). It also tidied three generated streets that doubled others (one lay over the Seaview street, two ran right alongside a street so their sidewalks and junk stood in the middle of a wide road): the first is gone, the other two now meet the street they shadowed, and the strips left over became lawn and paving. Street furniture and lamps never stand on another street's carriageway, nor in front of a gate, a driveway or a door (Skyline One's gate, the safehouses' drives, the interiors' doors and the rest). Version 4 moved the Colony to the Sandbar beach (`lm` colony with its size, park, fountain, driveway and lot; two frontage buildings made way for its driveway, and the old Colony lot by the hospital has its own buildings back) and replaced the lunapark's two lots (one half in the water) with a multi-storey car park on ground grown for it (`lunapark.carpark`: footprint, levels, deck height). Version 5 made plots for the safehouses that are houses (`safe`: each plot's centre, width, depth, the way it faces, the driveway): the trailer on a Coral Shore gravel yard (two shops made way), the bungalow on Heron Key with a new beach behind it, the mansion on a corner of the golf links by the diagonal street, and the houseboat's deck and gangplank at the port's west quay; it also points the Colony at its guests' lot again (the index had gone stale). Version 6 made the rest of the car park's knob of land north of the street a palm grove (grass inland, a strip of sand along the shore) with a pier off its north shore (`lunapark.grove`: the grove's outline, the shoreline where the rocks go, the pier and its T-head, the moored boats). Version 7 gave the space center's empty south-east corner below launch control to the cement works (`gravel.factory`: its yard, fence and gate, and where the hall, the tower, the kiln, the cooler, the silos, the chimneys, the piles, the trucks and the lamps stand) and kept the yard east of it, up to the street corner, for the junkyard (`gravel.junk`); both are gravel yards, and the space center's area and fence shrank. Version 8 rerouted three streets that made no sense: the long avenue south of the bay runs straight on where it dipped round a block in a U (the buildings in its way gone, the U's ground a lawn), the road along the military base's south side ends just past the base gate instead of running on to the shore, and at the south tip of Coral Shore the coast road's zigzags became a rectangular block and a straight road with one 45-degree bend, a beach between it and the sea. Version 9 gave each drag strip an exit past its finish (`speedway.strips[].exit`: how far along, the gate's width, the lane to the street and its width) and laid the Sandbar strip's beach out as a band: a park by the city (grass of kind `lawn`), woods up to the strip (kind `wood`), woods beyond it, then the beach. Version 10 cleared a Sunstrip block for the car showroom (`showroom`: the block, the hall, its doors, the tuning workshop and its door, the stock yard). Version 11 gave the Colony and the cement works dead-end streets for their visitors (edges with `v`: `colony`, `factory`; closed to traffic - `nt` - but without a boom): the Colony's from a new junction on the beach avenue into the ring drive, the works' from the corner by the space center along its fence to the gate, with a staff car park of four bays (`gravel.factory.vlot`; the Colony's car park is `vlot` on its `lm`); the space center's corner was cut back for it and the shore filled where the road touched the bay. What is left of the old junkyard plot stays `gravel.junk`, unused. Version 12 made the junkyard in the port's maintenance yard instead (`salvage`: the fenced yard, its gate, the crane's spot, the crane, the crusher, the cube pile, the office shack, the kennel); the workshop that stood there went. Each version runs once: `remodel` in the file says which are done.

## Traffic lights and the rules of the road

- **Lights at every junction** (all 144): a pole on the near right corner of each approach, an arm over the road with red, amber and green facing the traffic, and a walk lamp on the pole for the crossing. Opposite approaches get green together; at a T-junction the side road has a turn of its own. Green 12 s, amber 3 s, then 1.5 s of all red before the next group. Junctions are not in step with each other.
- **Drivers** stop at the line before the zebra on red, and on amber when there is room to stop (too close and they carry on). Turning across the oncoming lane they give way to oncoming cars until there is a gap of 4 s; two cars turning across in front of each other both go. Turning into a street they stop for people on its crossing, and they wait while someone is still crossing the junction from another way - a car late on amber, a siren, you. Cars in a queue stop a little short of the bumper ahead.
- **Pedestrians** go round the corners and cross at the zebras. At the kerb they wait for the walk signal: green while the traffic over that crossing has red, with at least 7 s of it left. Over the road they walk a little quicker.
- **Lights and sirens**: an ambulance or fire engine on a call, and police cars after you, go through red lights slowly (25 km/h; police 45 km/h) and wait for cars already crossing. Cars ahead of a siren, and those coming the other way, keep a metre to the right and slow down; one waiting at a red light rolls slowly over the junction to make room. A vehicle on a call drives down the middle of the road.
- **You** may run red lights: it is not a crime.
- Every number is in `js/01m-streets-data.js` (with the heat reducers, *Items and stores*): `python3 tools/settings_sheet.py streets export streets.numbers` / `... streets import streets.numbers`. The modes table can switch the lights (`trafficLights`; off: dark lights flashing amber, and cars just give way at a busy junction) and the sirens (`sirens`) off per mode.

## The airport

Skyport fills the south-west of the main island, fenced off from the city:

- **The airfield**: short grass, one long north-south runway along the west shore (centre line, threshold bars, touchdown zones and aiming points, edge lights that turn red and green at the ends, approach lights out over the water), a parallel taxiway with three links and blue edge lights, and the apron in front of the terminal with a yellow taxi lane and a lead-in line, stop bar and red safety box at each of the five gates. Three hangars with their own apron in the north, the control tower and a windsock.
- **The terminal**: a long glass hall on the apron with a jet bridge to every gate and the SKYPORT sign; on the city side a canopy over the forecourt along the avenue, and next to it one large parking lot (four rows of two, about 200 stalls).
- **Planes**: three or four stand at the gates. About once a minute one moves, one at a time so they never meet: a plane comes in low over the sea from the south (its shadow on the water), touches down with a puff of tyre smoke, brakes, turns off at the middle link and taxis across the apron into a free gate; or a parked one is pushed back, taxis down to the south end, lines up and takes off to the north, climbing away over the city until it is gone. Below a gate count the next movement is a landing, above it a take-off. Planes show white on the minimap and the city map.
- **Danger**: a moving plane runs over whatever is in its way - people die, cars are wrecked and flung aside (you too, on foot). Parked planes and wrecks are solid; ram one and both take damage.
- **Blowing one up**: gunfire wears a plane down like a car (about 900 health); a rocket, grenade or burning car within 7 m of it sets off its tanks. A huge explosion, two more at the wing tanks a moment later, then a burning wreck that is cleared away after 45 seconds, freeing the gate. A plane hit low in the air falls and blows up where it comes down; in the sea it just sinks. Blowing one up while the police see or hear it adds heat; like any vehicle it pays nothing.
- **The gates**: an asphalt road from the north gate past the hangars to the taxiway, and one from the avenue gate to the apron. At each gate a booth with two police officers and a barrier: stop at it and it lifts after a second and a half; drive through without stopping and the boom breaks and you get a wanted star. Police cars are always let through. The officers act like police on foot.
- **The fence** runs along the city side, with a guarded gate in the north (by the hangars) and on the avenue south of the terminal. It stops people and cars but not bullets or eyes; a vehicle of 3300 kg or more (truck, bus, trash truck, fire engine, APC, tank) going 20 km/h or faster breaks through a panel. A new game mends it.
- **Departures** (mode `flights`): a glass **check-in booth** stands out in the open on the terminal's forecourt (the city side), in front of the middle door - a clerk in the airline's blue at the counter, CHECK-IN over it and a tall lit **FLIGHTS** board on a post behind, a plane on the minimap and the city map. On its pad of light, on foot, a **FLIGHTS** button comes up by you (or press **E**) and opens the departures board: flights to **Prague** and **Norfolk** show as COMING SOON, and a **scenic flight** over the city costs **€5,000** (not while you are wanted, on a job, a rampage or a race).
- **The scenic flight** is a cutscene (below) at a random hour and in random weather each time, with its own music - *Neon Skyline*, a 90s synth track the game plays itself (kick, claps and hi-hats, a pumping octave bass, wide pads, an echoing arpeggio and a lead hook, built in sections so it never sounds like one short loop). You cross the terminal hall - its roof lifted off: check-in islands with their queues and lit departure boards, the security lanes, shops and a café, the gates' seats - and go through to gate 3; the plane backs out onto the apron and taxis to the end of the runway; then you are in your seat, looking out through the oval window on the right: the take-off run (the runway rumbling), the climb, and two minutes once round the city clockwise - over Gravel Flats, Heron Key, the Sandbar, the east beach, Coral Shore and the docks - banking into the turns so the window looks down on it, with a caption naming the district below; in the rain, drops run across the glass. It comes in low over the water to land. The only button is **LAND**: it skips to the end. You come out at the desk again, with the game's own hour and weather back. The price, the flight's length and its height are in the airport table (*Flights*).
- **The flight's rewards** (mode `flightPerks`): your first scenic flight puts an **aviator cap** - a leather flying helmet with goggles pushed up - in your wardrobe (never sold; put it on at any clothes shop or safehouse wardrobe). Every flight after it makes you **50% faster on foot** until the same hour the next in-game day; a wing with the hours left shows under the clock. Another flight starts the day again, it does not add up; the hours run with the clock and sleeping uses the hours slept (airport table: `boostPct`, `boostHours`).

## The military base

The peninsula north of the airport, behind a double fence with razor wire, watchtowers with sweeping searchlights and a barrier that never lifts. Inside: the command building, barracks, the mess, a motor pool with two tanks and three APCs parked in a row, a helipad with a military helicopter, the parade ground and flag, a fuel depot, and the armoury - a fenced yard of weapon racks (rocket launchers, machine guns, sniper rifles, shotguns, SMGs, grenades, pipe bombs) with a fenced ammo store inside it (every kind of ammunition (but the AA launcher's rockets), an earth-covered magazine).

- Get in any way you like - on foot past the barrier, by ramming it, or through the fence in a heavy vehicle - and a **RESTRICTED AREA** warning counts down from 5. Still inside when it ends: the alarm, an instant 4-star wanted level, and the soldiers open fire. Shooting inside, a blast you set off there, or hurting a soldier sets it off at once.
- Sixteen soldiers with SMGs and machine guns: at the gate, the armoury and the towers, and on patrol. They never leave the base; outside, the police take over. A minute away and the alarm stops. A dead soldier is replaced later, out of sight.
- The tanks and APCs can be stolen, the helicopter blown up (it is not flyable). What you take or destroy - weapons, ammo, vehicles, the helicopter - comes back three minutes after you have left.

## The port

Dockside is one container port: straight quays on the east and south shore with five berths, two gantry cranes per berth on rails along the quay, blocks of containers stacked one to four high, an empty-container depot, warehouses, a container freight station and the port office, a maintenance yard with workshops, a tug pier with two tugboats, floodlight masts, bollards and fenders. The streets stay as port roads.

- Three or four ships lie moored. About every two minutes one moves, one at a time: a ship comes up from the sea, swings round, and is pushed sideways onto a free berth; or one is pushed off and sails out to sea, leaving a wake. Ships are solid and nothing hurts them - bullets and rockets stop at the hull.
- While a ship lies at its berth its two cranes roll to it along the rails and lift containers between ship and quay, the trolley running out along the boom, the spreader going down and up.

## The Colony

The Colony Hotel stands on the Sandbar beach east of the start - the white Streamline Moderne hotel of Ocean Drive, three times the size: seven floors, rounded front corners with eyebrow ledges wrapping them, turquoise bands, a stepped parapet, the inverted-T neon sign (COLONY down a pylon that rises over the roof, HOTEL across the bar over the door), balconies over the sea side, a pool and loungers on the roof. It faces the avenue across a paved forecourt; the driveway from the avenue becomes a ring drive - a loop round a long planted island (a lawn, three palms lit from below at night, flower beds and bushes, a white kerb with a turquoise band) with arrows painted on it: in on the right, round the island in front of the doors and out again. The island is solid but low, so you see and shoot over it. The guests' lot is beside the drive.

**Its street and its visitors** (mode `visitors`, both modes; map remodel 11). The Colony has a street of its own, a dead end from the beach avenue into the ring drive, closed to ordinary traffic (no boom across it - only the visitors and the police turn in). While you are near, now and then a car in the traffic turns in instead of driving on, goes round the ring, pulls nose first into a free bay of the car park beside the drive and stops; its driver gets out and walks in through the doors. After a while someone walks out to the car, gets in, backs out and drives off into the traffic. The cement works has the same: a dead-end road from the corner where the street turns round the space center, along the space center's fence (its corner cut back) to the works' gate, and a staff car park of four bays beside it. Up to three visitors' cars at a site, a new one about every 25 s, staying 40 s to 2.5 min (streets table: *Visitors*). A visitor's car is a car like any other: take it, ram it or blow it up and the visit is over.

**The valet.** By the doors, beside the valet stand, a valet in a red jacket and cap turns to watch you come. Walk up, or roll up slower than 15 km/h, and the valet waves and greets you - GOOD EVENING, WELCOME TO THE COLONY, NICE RIDE... - with a bright arcade ding-dong, once, until you have been away and come back (the places table: `valetGreet`, 9 m; `valetAgain`, 40 s). Only a greeting, for now. Trouble scares the valet off like anyone else; then back to the door. Mode: `valet`. Behind it, between the hotel and the sea, its own park: lawns, paths, palms, flower beds, benches and lamps round a three-tier fountain. Its free room is your first safehouse, yours from the start: new games begin at its door (*Safehouses*).

## 160 unique buildings

All over the city, 160 buildings are one of a kind. Each has its own model, its own colours and its name in neon, the way the Colony first stood on its lot (the unique buildings table, `js/01r-buildings-data.js`). The name is always on the building - down a tower, on a parapet, a frieze or a crown, over the doors, on a pole sign - and where the front faces east or west, so that the camera would see it side-on, a blade sign stands out from the front at the corner toward the camera with the name down it. A Miami mix:

- **Art Deco hotels** (28, the SEA BREEZE among them, on the building by the old start whose sign it was): a terrace with umbrellas at the front, eyebrows over every row of windows, a finned centre tower with a ziggurat top and the name down its fins.
- **Streamline hotels** (14): rounded front corners, racing bands, a glass-block lobby under a curved canopy, a short name down a pylon over the roof, a long one on a parapet beside it.
- **MiMo motels** (12): two floors of rooms off open walkways, a cheese-hole screen, a pool and loungers in front, a boomerang sign on a pole with the name and VACANCY on it.
- **Mediterranean villas** (12): stucco, red tile roofs, arched windows, a tower, a courtyard with a fountain and palms, the name on a stucco gable over the eaves.
- **Diners** (8): stainless steel with rounded ends and a coloured stripe, the long lit window with OPEN 24H in it, the name on a stand on the roof, their own little car park.
- **Cinemas** (8): the marquee with chasing lights and NOW SHOWING, a tall blade sign on the front over the marquee, rising past the roof, the ticket booth, posters.
- **Banks** (6): steps, columns, a pediment, bronze doors, the name on the frieze.
- **Churches** (6): a mission gable, a rose window, a bell tower with a cross, a lawn round them, the name over the doors.
- **Nightclubs** (8): dark boxes striped with neon, a canopy of bulbs, a velvet rope, a neon frame round the roof, the name on a parapet over the front.
- **Shops** (12): a striped awning, lit windows, and something that says what they sell. Surfboards, an ice-cream cone, a green cross, flowers, café umbrellas, a diamond, an arcade's lights, a camera, a record or a pile of books. The name on a parapet over the front.
- **Offices** (6): sun-shade fins, a glass lobby, the name on the front of the crown.

And 40 of the city's own (`js/10o-unique-more.js`):

- **Skyscrapers** (8, downtown first): a podium with a glass lobby and the name over its front, a glass shaft banded floor by floor with lit windows, and a top of its own - setbacks and a spire, a slanted top lit along its edges, a lit crown with a helipad, or a glass pyramid - and a red light on the very top. 260-420 high: what a flight will have to clear.
- **Condo towers** (6, the beachfront first): balconies with glass rails across the front on every floor, a pool deck with loungers on the podium, a lit crown with the name.
- **Schools** (3): two floors of classrooms, an entrance with a clock and the name, the gym under a curved roof, a flagpole, the yellow bus, a court in the yard.
- **The arena** (1): SUNDOME ARENA takes the middle of a big park of its own - a round drum ringed with a lit glass concourse and piers, a shallow dome, lamps and planters on its plaza, the name on a marquee by the street.
- **Parking garages** (3): open decks on columns with cars parked on them, lights under every deck, a stair tower, the name over the way in.
- **Gas stations** (4): the shop at the back, a canopy in the brand's colours, lit round its edge, over two pump islands, the name on a price pylon at the corner and on the canopy.
- **Museums** (2): white galleries stacked out over a glass hall with gardens on their roofs and hanging off them; the science museum has a planetarium dome and a rocket on its fins out front. The name on a low wall by the street.
- **Civic buildings** (4): steps, columns and the name on the frieze - CITY HALL with a dome and a flag, the COURTHOUSE with a clock tower, the POST OFFICE with flags and mailboxes, the PUBLIC LIBRARY with benches and a tree on its lawn.
- **Supermarkets** (3): a big striped box at the back, a tall entrance with the name, cart corrals and its car park in front.
- **Car washes** (3): an open tunnel along the street you can drive through, big brushes inside, bubbles on the roof, vacuum posts out front.
- **Bowling alleys** (3): Googie style - a long hall with a zig-zag roof edge, a giant pin by the door, a starburst over the pylon with the name.

**Where they stand.**
- Each one takes the lot of an ordinary building that faces a street (a villa or a hotel set back from the road faces the nearest one), and stands where that building stood. The lot must suit the kind (its size and its district), and its front must be one the camera can see (not facing north).
- Every district with a lot that suits has at least one; the busiest give one up where needed.
- Hotels, motels, clubs and diners go to the beachfront first: within 80 m of a sand beach, and three hotels in four. The rest stand anywhere.
- No two stand closer than 25 m.
- The arena does not take a building's lot: it takes the middle of a big park (the biggest square that stays on the grass, away from the other unique buildings), and faces the nearest street.
- Where a model leaves part of its lot open (a diner's car park, a motel's pool court, a villa's courtyard, a church's lawn, a school's yard, a gas station's forecourt, a supermarket's car park, a museum's front, the car wash's tunnel, the arena's plaza), only what stands is solid.
- The lots are picked once with the city and are always the same.
- Scenery: both modes.

The table holds each building's id, name, kind, wall colour and neon colour, and the settings: the spacing, the beachfront distance, and the share of hotels on the beachfront. `tools/buildings_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back, checking every value (kinds, colours as #RRGGBB, names of up to 24 letters, each name used once):

```
python3 tools/buildings_sheet.py export buildings.numbers   # or .xlsx
python3 tools/buildings_sheet.py import buildings.numbers [--dry-run]
```

## 60 parks, squares and plazas

Every plaza on the streets used to be the same fountain square; now each one is its own place, and so are the six sports courts and ten parks on the biggest open lawns - 60 in all, no two alike (the parks table, `js/01s-parks-data.js`; built by `js/10p-parks.js`). Each has its name on a sign by its entrance, turned to whichever side the camera sees.

- **The 44 plazas**: Fountain Square (the old three-tier fountain), a splash pad with rings of jets, a sculpture court, Clock Square, Veterans Square with its obelisk and flags, a bandstand on a green, a giant chessboard with stone chess tables, a playground (slide tower, swings, climbing dome, sandpit, see-saw), a skate spot, an outdoor gym, a fenced dog run, a rose garden with arches, a zen garden of raked gravel, a palm court with loungers, a little open-air theatre, a food truck plaza under string lights, a farmers market, a reflecting pool, a hedge maze, pirate mini golf, a turning carousel, a pergola walk under bougainvillea, a butterfly garden with a mesh dome, a bocce club, a great sundial, a stone labyrinth, a flamingo pond, a cactus garden, a topiary garden (an elephant, a giraffe, a rabbit), rainbow arches, a picnic grove with grills, a lily pond with a frog fountain, a glass palm house, a dancing fountain whose lit jets rise and fall, Heroes Square with a bronze rider, a peace bell garden, a water wall, a mosaic plaza with a mosaic lizard, a wind garden of turning pinwheels, Sailors Square with an anchor and a ship's wheel, Domino Corner, ping pong tables, an open-air stage, and a play street with hopscotch and four square.
- **The 6 courts**: basketball, tennis, beach volleyball, handball walls, pickleball and futsal.
- **The 10 parks**: Swan Lake Park (an island, a footbridge, swan boats), a botanic garden with a glasshouse, an adventure fort with rope bridges and a zip line, a community garden, a Japanese garden (koi, a red bridge, a pagoda), a little league field, a wildflower meadow with beehives, a mango orchard with its farm stand, a BMX track and Lookout Hill with its tower.
- What stands is solid (a fountain, a statue, the stalls, the fences); the rest is walked on, and people stroll through.
- The places are picked once with the city and are always the same: each plaza or court takes the row of its kind in a fixed shuffle; each park takes the biggest clear rectangle of a lawn (off the streets, away from the landmarks and the unique buildings), the biggest lawns first, spread apart, facing the nearest street.
- Scenery: both modes.

The table holds each place's name, kind, colour and notes (plaza kinds go on plazas, court kinds on courts, park kinds on parks), and the settings: how big a lawn a park needs, and how far apart the parks are. `tools/parks_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back, checking every value:

```
python3 tools/parks_sheet.py export parks.numbers   # or .xlsx
python3 tools/parks_sheet.py import parks.numbers [--dry-run]
```

## The lunapark

Heron Key grew into the bay to make room for a lunapark in the spirit of the big European-village parks. The street runs round its north and east side, outside the railings; the multi-storey car park is across the street (below). Only people get in: a grand arch with the park's name on it, ticket booths and turnstiles (free entry); cars stop at the turnstiles.

- The rides run on their own (you cannot ride them yet): a Ferris wheel with gondolas that stay upright, a wooden out-and-back coaster on a white lattice, a steel coaster with two loops, a log flume with a splash-down, a drop tower, chair swings that fly out as they spin, a carousel, a swinging pirate ship, a sky ride across the park and a little steam train round it. The coaster trains are fastest at the bottom of the drops.
- A German village with half-timbered houses, a clock tower and the Festhaus beer hall, an Italian piazza with a fountain and cafe umbrellas, game booths, food stands (hot dogs, ice cream, pretzels, pizza...), lawns, trees and lamps. About thirty visitors stroll about while you are there.

### The car park

Across the street from the lunapark gate: a concrete car park - the ground floor, two decks and an open roof deck, a blue P on the maps. The way in is at its south-east corner: stop at the barrier by the pink pay booth and it lifts after a moment (drive through and it breaks; nobody minds). Ramps climb the side strips - up the west side from the ground to deck 1, up the east side to deck 2, up the west side again to the roof - so you drive round and up deck by deck; you can walk up them too. About half the stalls on every deck have a car parked in them. While you are inside, the decks above you turn see-through and the cars on them are hidden, so you always see your own floor. The police in the street do not see you up on a deck. Mode: `carPark` (the parked cars and the barrier).

How it works: everything has a height (`z`, 0 on the ground) that follows the decks and ramps in there; walls can stand at some heights only (the walls along each ramp and at its ends), and cars and people only meet cars at their own height (`js/10k-carpark.js`).

**The palm grove.** The rest of the car park's piece of land, round it to the shore, is a grove of tall palms - leaning a little this way and that, coconuts under the fronds - on a lawn, with a strip of sand along the water and grey boulders all along the waterline. Off its north shore a wooden pier runs out to a T-head with bollards, lamps and a bench facing the sea (GROVE DOCK on an arch over the way onto it); a yacht, a fishing boat, a sailboat and three speedboats are tied up there, bobbing on the water. The boats are scenery for now - when boats you can drive come, they moor here. The bigger rocks are solid, the palms fall when a vehicle drives into them; the pier is walked on like land, and people stroll among the palms (`js/10m-grove.js`; mode: `groveBoats`, the boats).

## The space center

Gravel Flats is the Bay Space Center, behind a security fence: the launch pad with a rocket and its boosters beside a red and white tower, lightning masts, the fuel spheres and a water tower, the crawlerway with the crawler-transporter parked on it, the huge assembly building with its flag, launch control, offices with a car park and a rocket garden by the gate. The gate is shut and guarded: the way in - with permission, or in certain clothes - comes with the story (`docs/STORY.md`).

**The cement works.** The space center's empty south-east corner, between its fence and the shore, is a cement works behind a chain-link fence (`js/10r-factory.js`, scenery in both modes): a long hall with a saw-tooth roof and GRAVEL FLATS CEMENT along its front; behind it three tall chimneys (46, 40 and 35 m), concrete with red and white bands at the top and red lights blinking on them, smoke rising from them and drifting off on the wind (further in a storm); a steel preheater tower with its cyclones, the long kiln on its piers, the cooler, three silos with a catwalk over their tops, piles of gravel and clinker with a conveyor up to the hall, a cement mixer with its drum turning, a tanker and a wheel loader, a gatehouse by the open gate and floodlights over the yard at night. Everything there is solid (the police helicopter climbs over the chimneys); a heavy vehicle fast enough breaks through the fence. Between it and the street corner to the east lies an empty gravel yard, kept for the junkyard. The chimneys' height and the smoke are in the places table (*Factory*).

Every number for the gates, the base, the port, the lunapark, the space center (and the Pay 'n' Spray garages, the Colony's valet, the city's towers, woods and trees, the cement works, Iron Key and Skyline One) is in `js/01l-places-data.js` (the casino strip's in `js/01u-casino-data.js`): `python3 tools/settings_sheet.py places export places.numbers` / `... places import places.numbers`.

Every number of the airport is in `js/01k-airport-data.js` (how often, gates, taxi, take-off and landing speeds, the take-off run and landing roll, the climb angle, plane health, blast distance, explosion radius, burn time, the speed above which a plane kills, the heat, and the fence): `python3 tools/settings_sheet.py airport export airport.numbers` / `... airport import airport.numbers`. The mode table's `planes` row turns the movements off (the planes then only stand at their gates).

## Cutscenes

The game's cinematics run on a small engine (`js/15c-cutscene.js`), built for the scenic flight and for story mode later. A scene is a list of shots played one after another; while it runs the HUD and the touch buttons are hidden and only its skip button works (its label is the scene's own - LAND for the flight - or Esc, Enter, Space), but the city goes on around it: traffic, people, planes, the clock and the weather. Each shot has a length, moves whatever acts in it and places the camera: the usual view from above, or a free camera anywhere (low over the apron, behind a taxiing plane, in a seat by a window), tilting with a banking plane. A shot can bring black bars at the top and bottom, a caption, an overlay (the plane's window: the cabin wall round an oval pane) and a fade through black at its start or end; a scene can bring music (`js/02c-music.js`). Skipping fades out and ends the scene at once, and the scene puts back everything it changed.

## Police

The police only know what they see or hear, and they come in small numbers.

- **Seeing**: a cop sees you within 37.5 m by day (less at night, in the rain and in fog - see Day, night & weather), inside an 80 degree cone in front of them, with nothing in between; once they have you they keep watching all round for a moment. A crime counts only when a cop sees it or hears it (gunshots as far as each weapon is heard, explosions within 25 m). Each crime adds heat, and enough heat is a wanted level: a seen carjacking is 1 star; carjacking a police car, killing someone in front of a cop or hurting a cop is 2 stars.
- **Radio and search**: whoever sees you tells the others where you are. When nobody sees you they search around the spot where you were last seen: a red circle on the minimap and the city map, growing to 60-140 m, and the stars blink. Police cars cruise the streets inside it and cops on foot walk to the spot and look round. Stay out of sight for 12 s at 1 star up to 50 s at 5 stars and they give up; inside the circle that takes about three times longer.
- **Fewer cops, later**: two foot patrols walk the sidewalks around you, and patrol cars are part of the traffic (how many is set in the vehicle table). At 1 star one police car comes (patrol cars nearby join at once, otherwise one is sent after 15 s); 2, 3, 5 and 7 cars at the higher levels, sent sooner; extra officers on foot from 3 stars.
- **1 star, a stop order**: a cop near you shouts STOP. Stand still - on foot or in your car - for 3 s and you pay a fine of 250 and the stars go. Keep moving for 3 s while they can see you and it is 2 stars.
- **2 stars, an arrest**: police cars follow you and pull up beside you when you stop; the crew gets out, and a cop who holds you for a second (on foot, or beside your car while it does under 12 km/h) arrests you. Drive away and the crew runs back to their car and carries on. No shooting unless you fired a gun where they could see or hear it, rammed a police car or hurt a cop.
- **3 stars and up**: police cars ram your car; cops on foot shout a warning, then shoot from up to 27 m, more often missing the further away you are, and never with a passer-by in the line of fire. From 3 stars an armoured APC may come too, at 5 stars a tank that drives straight at you, on foot or not. **The tank fires rockets** at you (mode `tankRockets`): one every 4 s, only with a clear line, from up to 60 m, aimed a little ahead of a moving car; its turret turns to follow you and the blast hurts whoever is near (it is not your crime). **A police APC fires its turret machine gun** (mode `apcGun`): bursts of 6 when its crew sees you, up to 40 m, a 22% chance per round (less far away), 5 damage to you on foot or 9 to your car; after a belt of 100 it takes the machine gun's reload. All of it in the police table (*Tank and APC*).
- **Roadblocks** (mode `roadblocks`, both modes; `js/08zr-roadblocks.js`): from 3 stars, about once a minute while you drive, the police set up a roadblock 300-500 m ahead on the road you are on - out of sight, carried straight on through the junctions, never in a junction: police cars across the street with their lights going and cops behind them who hold their places and shoot when they see you. It grows with the stars: **3 stars** two cars and two cops with pistols; **4** three cars and four cops with SMGs (in bursts); **5** the APC in the middle of three and four cops with rifles (far, slow and hard). Ram through (the cars are parked: heavy, but they move - a truck goes through easily), turn off, or shoot your way past; a police car you take from it is yours (a crime if seen). It is taken down once you are 650 m from it and it is out of sight, or 15 s after your stars drop below 3. Numbers: the police table - per wanted level *Roadblock: police cars across the street*, *cops behind it*, *cops' guns* (1 pistols, 2 SMGs, 3 rifles), *an APC in the middle*; and the *Roadblocks* settings (how often, how far ahead, when it is taken down).
- **The helicopter** (mode `policeHeli`): from 3 stars one police helicopter - white and police blue, red and blue strobes, POLICE on its roof - flies in from the side of the nearest police station, its rotor thudding. It looks for you with a **searchlight**: first where you were last seen, then sweeping the search area. Once the light finds you it follows you at up to 75 km/h - faster, in a car on an open road, and you slip out of it; under a car park deck it cannot see you, nor **under a tree** (on foot, or in a vehicle that has stopped). Its light alone holds you only **6 s** (mode `heliLose`): when no cop on the ground has seen you for that long it loses you and sweeps the search area again; once its light has left you it can find you again, for another 6 s - or for as long as a cop on the ground sees you. While you are in the light every unit knows where you are, and crimes in it count. From **4 stars** it fires a short machine-gun burst at you every 6 s while the light is on you; at **5 stars** it also drops **pipe bombs** where you will be when they land (their blasts are not your crime). It circles a little south of its light, so on screen it hovers over it, flies at 24 m and climbs over taller roofs, and shows on the minimap and the city map as a blinking red and blue rotor. When your stars drop below 3 it flies off. Only the **sniper rifle** (three hits; the rifle's scope finds it overhead) or the **AA launcher** (one rocket) brings it down: it spins down trailing smoke and fire and blows up where it falls - in the street a blast like a car's, on a roof it burns there, in the water it sinks - and shooting it down always adds heat. The next helicopter comes only **10 minutes** later. The numbers are in the police table (Settings, group *Helicopter*: also `heliLose`, the 6 s, and `heliStill`, how slow a vehicle under a tree must be to stay hidden; shooting it down is a crime in *Crimes*).
- **Into buildings** (mode `copsInside`, both modes): cops on foot follow you into the places you can walk into - the hangars, the warehouses, the storage units, the Pay 'n' Spray, the casino and the club, the showroom and its workshop - round the building and in through a door you could use yourself (a roller door shut at night only once you have rammed it), then down the middle aisle to you. Your safehouses stay safe: they wait outside. Inside a building (or a safehouse, or a tower's halls) the **helicopter** can neither see nor shoot you: it circles over where you went in, takes you up again if you come out while it is there, and after 40 s flies off (police table: `heliInside`) - not to come back while you stay in.
- **Ways out**: stay out of sight, pay the fine at 1 star, take a heat reducer (Items and stores), change your clothes (Clothes shops) or drive into a Pay 'n' Spray unseen (it loses them at any level).
- **Busted or wasted** is not the end: busted, you are let out of the prison gate on **Iron Key** (bail: 10% of your score, and they keep every weapon you found - only your fists are left) and take the ferry back (*Iron Key* below; with the mode row `prison` off, at the door of the nearest police station); wasted, you wake at the nearest hospital (the bill: 10%); see Hospitals and police stations above.

Every one of these numbers is in one table, `js/01b-police-data.js`, in everyday units. `tools/settings_sheet.py` turns it into an Apple Numbers file or an Excel workbook and reads an edited copy (either kind) back (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/settings_sheet.py police export police.numbers      # or police.xlsx
python3 tools/settings_sheet.py police import police.numbers [--dry-run]
```

(`tools/police_sheet.py export|import ...` still works and does the same.)

Both have a sheet per kind of setting - Wanted levels (one column per star), Settings, Crimes - and a How to fill sheet. Yellow cells are the values and YES / NO cells are pop-up menus. The Excel workbook also has grey Check cells that say OK or what is wrong; a Numbers file is written without formulas. The import checks every value against its allowed range, lists what changed and only then rewrites the table.

## Vehicle jobs

Four jobs, each in its own vehicle and started at its own **dispatch point**. The point's marker - a ring, a beam of light and the job's name painted on it - shows only while you sit in the right vehicle; stop in it and the START card opens (the job's level 1, your best level, the level bonus, the reward; *ENTER* starts it).

| Job | Vehicle | Dispatch point | What you do | Reward at level 8 |
|---|---|---|---|---|
| **Taxi** | a taxi | a taxi rank | the rank sends you to a fare waiting at the kerb; stop by them, they get in and say where to; stop at the destination's marker. Paid by the distance, plus a tip for the time left (each crash with a fare aboard costs some of it) | **nitro** in taxis: Shift or N (the NITRO button on a touch screen) - more pull and top speed for 3 s, ready again 10 s later |
| **Paramedic** | an ambulance | a hospital | all the level's patients lie about the city at once; stop by one to take them aboard, up to 3, then stop at any hospital's marker. A crash with patients aboard costs 3 s; a patient who dies ends the job | **+50 max health** (150) |
| **Firefighter** | a fire engine | a fire station | cars burn about the city, up to 3 at a time; spray each with the water cannon (FIRE) until it is out (1.5 s). When the time runs out they blow up | **fireproof**: blasts hurt you half as much, and the car you are in blowing up does not hurt you |
| **Vigilante** | a police car (one in a police station's yard is free to take - no crime) | a police station | criminals drive about like traffic until you come within 60 m, then flee at up to 100 km/h through red lights, always away from you. Wreck their car - or once it is down to 35% they get out and run: take them down. From level 5 they shoot back (from the car and on foot), from level 8 two cars at once. 400 m away and they got away. Killing them is no crime | **+50 max body armor** (150) |

- **Levels**: level 1 asks for one fare, patient, fire or criminal car, each level after for one more. Each one adds time to the clock - the road distance as if you drove it at 35-40 km/h, plus a few seconds - and pays when done; a finished level pays €100 times the level, and the next level begins at once.
- **The job ends** when the time runs out, the vehicle is wrecked or you are out of it for 10 s (another vehicle of the same kind will do), or when you stop it: tap or click the job's panel at the top - STOP THE JOB? Police stars do not end it. Your best level is kept, and the reward once you reach level 8 - both are saved with the game. While a job runs: the level, the count and the clock at the top; a ring, a beam and an arrow on what to do, and a dot on the minimap (an arrow at its edge when it is off it) and on the city map.
- **Taxi ranks**: four, on long streets well spread over the city - yellow kerb paint, a lit TAXI sign on a pole and two cabs waiting. **Fire stations**: three red buildings with bay doors, FIRE STATION over them and FIRE on the roof, their engine in the yard. Both are on the minimap and the city map (a yellow cab sign, a flame on red). A hospital's yard keeps an ambulance; a police station's yard has its patrol cars. A vehicle taken from there is back once you have been away.
- **The taxi** is a new vehicle: a yellow cab with a lit roof box and a checker band; a few drive in traffic.
- **Tough while working** (mode `jobTough`, both modes): while a job is on, its vehicle takes six times the damage before it breaks (+500%, the jobs table's `tough`); when the job ends it is as tough as any other again.
- Every number is in `js/01o-jobs-data.js` (`tools/settings_sheet.py jobs`; the pay is also in the economy sheet). Modes: `taxiJob`, `medicJob`, `fireJob`, `vigilanteJob` - both modes.

## Races

Street races, a NASCAR race and a drag strip, in both modes. Every number - fees, prizes, rivals, pace, timers - is in `js/01p-races-data.js` (`tools/settings_sheet.py races`; the fees and prizes are also in the economy sheet).

- **Street races** (mode `streetRaces`): now and then (about every 2 minutes, never while you race, do a job or a rampage, or are wanted) one of the eight phone booths within 500 m of you rings for a minute - a blinking phone on the minimap and the city map, a glow and PHONE over the booth, and you hear it. On foot at the booth, **ANSWER** (or E) shows the race: a **fixed** race rings with a double ring (one of five routes - Seaview Sprint, Palm Heights Run, Bridge Dash, Dockside Dash, Coral Circuit - each with its best time kept) and a **random** one with a fast trill (a new route each time: its start a short drive from the booth, 500-1000 m to the finish). **ACCEPT** pays the fee (never given back). Then you have **60 s** to stop at the start in a car of your choice - any but a public service vehicle (police, taxi, ambulance, fire engine, trash truck, bus, tank, APC) - and not while wanted. Stopped in the start's marker, the start counts down 3 s and you race 5 rivals in fast cars through the checkpoints - at every turn of the route and at least every 120 m, each in order (the next two show as rings with beams, the route as a yellow line on the maps, the rivals as orange dots).
- **Rivals** drive their own route as fast as the corners and their brakes allow (92% of their car's top speed), round slower cars, through red lights; no catch-up either way. One that crashes out is out.
- **From the countdown to the results** you cannot get out of the car and FIRE is locked. The race ends for you if your car is wrecked, you are busted or wasted, or 30 s after everyone else has finished.
- **The speedway** (modes `speedway`, `dragStrip`): a small oval on the Palm Heights beach, with a grandstand full of people on ground won from the sea, grass in the infield and a scoring pylon. Its paddock by the shore street has the pit garages, a **NASCAR special** to take (free - no crime; another is there once you have been away) and the **race booth**: on foot, **RACE** (or E) - pay the fee and you are put in a NASCAR special on the grid with 7 others; the start counts down 7 s; 5 laps of 195 m. Afterwards you are back on foot at the booth.
- **Two drag strips**, each with its own race booth by its staging lanes (a DRAG kiosk, a chequered flag on the maps): the **Palm strip** beside the speedway, running north along the beach's east edge - an eighth of a mile (201 m) - and the **Sandbar strip** down the middle of the east beach, reached by a lane from the avenue's north corner - **600 m** timed, long enough to see a car's top speed. Stop by the booth in a car (any but a public service vehicle; on foot the card tells you to bring one): **RACE** a rival in a sports car waiting in the right lane (fee, the win pays; €100 / €400 on the Palm strip, €200 / €800 on the Sandbar strip) or a **TEST RUN** alone (free): you are put in the left lane, three ambers half a second apart, then green - go. After the line a parachute stops you. The results give the time, the reaction, 0-100 km/h, the split times (60 ft, 201 m, 402 m), the trap speed and the top speed; the best time on each strip and the best top speed are kept.
- **The way out**: past the finish each strip has an **EXIT** gate in its city-side fence, with a lane to the nearest street. It is shut while a race runs and always from outside; once your race or test run is over (or whenever no race is running) it slides open as you come up to it from inside, stays open while you pass and shuts behind you, its lamp red or green. The **Sandbar strip runs through woods**: from the avenue's buildings a park, then woods up to its fence, beyond it more woods and then the beach down to the sea (map remodel 9; the woods are trees all over, `js/10q-forests.js`).
- **The guide line** (mode `guideLine`): while a street race is on (the way to its start, then the race's route), during a vehicle job (to the nearest fare, patient, hospital, fire or criminal) or while you drive the car wanted at the docks, a faded lime line about a bike wide lies on the streets in the right-hand lane along the shortest way by road, and on the minimap and the city map. It is worked out again as you go.
- **The edge glow** (mode `edgeGlow`): while the guide line's target (the next fare or patient, a race's start or next checkpoint, the export bay) is off screen, the screen's edge toward it glows lime; while a phone booth rings off screen, the edge toward the booth glows in the booth's own colour on the maps (yellow for a fixed race, cyan for the others), so you can tell them apart. Both pulse, stronger the closer it is, point the way on the map wherever it lies (behind the camera too), and go as soon as the target is on screen.
- **Results**: your place, time, the gap to the winner, best lap (NASCAR), top speed or the trap speed and reaction (drag), crashes, the prize and NEW RECORD - for 10 s, or close them (CLOSE, E or Enter). Meanwhile your car is held still. Prizes go to 1st, 2nd and 3rd. Best times, the NASCAR record and best lap, the best time on each drag strip, the best top speed and your wins are saved with the game.
- **The NASCAR special** is a new vehicle (vehicles table): low, a big spoiler, roundels and a number; 300 km/h.

## Vehicles

| Vehicle | Length | Top speed | Notes |
|---|---|---|---|
| Sedan, estate | 4.5 m, 5.5 m | 180 km/h | the everyday cars; the estate has a long roof and roof rails |
| Taxi | 4.6 m | 175 km/h | yellow cab with a lit roof box and a checker band; waits at the taxi ranks; the taxi job |
| Sports | 3.2 m | 260 km/h | fast, slides easily |
| Pickup | 6.5 m | 150 km/h | open bed; 2.4 m wide, so it parks only in parking lots |
| Limo | 10 m | 144 km/h | long and low |
| Motorbike | 3 m | 330 km/h | one seat; leans into bends, stands on its stand when parked; the rider is in the open (you ride in yellow) |
| Truck | 6.5 m | 130 km/h | box truck |
| Bus | 10 m | 100 km/h | slow, wide turns, never parks |
| Trash truck | 7 m | 80 km/h | stops at the bins along its way, beacon flashing; armoured |
| Ambulance | 6 m | 147 km/h | comes for the dead with lights and siren; its paramedics take the bodies to hospital |
| Fire engine | 8 m | 120 km/h | comes to explosions and burning wrecks and hoses them down |
| Police car | 4.5 m | 220 km/h | patrols in traffic and chases you |
| APC | 5 m | 130 km/h | armoured police, in traffic and in chases from 3 stars |
| Cement mixer, dump truck | 8 m, 7.5 m | 80, 70 km/h | the construction site's machines: the mixer's drum turns; the dump truck shuttles about the yard by day; both armoured, yours to take (see Skyline One) |
| Digger | 6.5 m | 12 km/h | the excavator at the construction site's pit: tracks, a turning cab and a digging arm |
| Tank | 6 m | 80 km/h | one stands at a secret spot (always the same parking lot) for you to find; driving it, FIRE launches rockets straight ahead (one every 1.5 s, no ammo needed); the police send their own only at 5 stars, and it just rams |

Ambulances and fire engines on a call take the shortest way by road at up to 65 km/h; one already in traffic nearby takes the call, otherwise one comes from further away.

**Paramedics.** An ambulance at a body stops with its lights flashing and two paramedics get out with a stretcher. They walk it to the body, lift it on (under a white sheet), carry it back and load it - and then one more body lying within 30 m, two at most per trip; an ambulance already on its way to that one turns back. Aboard, they drive to the nearest hospital with lights and siren, carry each body to the door, where it is taken in, walk back and drive on as ordinary traffic until the next call. While both are out the ambulance stands empty with the handbrake on. Their legs walk as they carry. They are ordinary people: hit one - a punch, a shot, a knock from a car - or kill one, and they drop the stretcher (the body rolls off beside it, and another ambulance comes for it) and run; once calm they walk back to the ambulance and drive off. Drive off with their ambulance while they are out and they just run. If they cannot get to the body or back, they give up after 45 seconds and drive on; a team far behind you finishes unseen. Drivers sit inside under the roof behind tinted glass. Long vehicles keep their distance in traffic from their front bumper, not their middle, and use more collision circles along their length.

Every vehicle is one column of `js/01c-vehicle-data.js`: size, speed, acceleration, braking, steering, grip, health, weight, how much each tree it knocks down slows it, armour, how often it drives in traffic, parks or is sent by the police (and from which wanted level), how many are hidden, its job, its weapon, its delivery price at the docks, its colours. Acceleration given to a speed at or above the top speed counts as the time to reach top speed. `tools/vehicle_sheet.py` exports it to Apple Numbers or Excel and imports an edited copy (`export vehicles.numbers`, `import vehicles.numbers [--dry-run]`): one column per vehicle, rows found by their label, every value checked; a new column becomes a new vehicle (body `new` until its model is built).

## City sound

The city has a sound of its own under everything else (mode row `citySound`, on in both modes), all made by the game like its other sounds, heard from the middle of the screen - cars and people from the side they are on, louder the closer (within 60 m):
- **traffic** - a low hum and a tyre hiss that grow with the moving cars around you (quieter at night, the hiss wetter in the rain); a driver honks when you stand or park right in front of their stopped car (after 2.5 s), now and then when stuck in a queue for long, and when you come at them fast; buses and trucks honk low, sports cars and bikes high; brakes squeal when a car stops hard;
- **people** - arcade-style chatter from the people about (each with a voice of their own; now a question, now a laugh), more where there are more people, half at night and little in the rain; a shout when someone turns on you, screams when people run;
- **nature** - birds in the trees by day, crickets in the green at night, gulls and the surf rolling in and out near the sea, wind that grows with the storms;
- **far off** - about every 18 s something soft and muffled in the distance: a siren, dogs barking, a building site's hammer or drill (by day), a plane passing over, a car alarm, a horn.

Inside a car the whole mix is muffled and at 45%; with the map, the weapon grid, a menu, a shop or a cutscene it fades out. Every layer has its own loudness in the streets table (group *City sound*: volume, traffic, horns and brakes, people, nature, far-off sounds and how often, how far cars and people are heard, how loud inside a car); 0% switches a layer off.

## Car radio

Most cars have the radio on when you get in (85%; police and service vehicles start with it off). **R** in a car, or the **RADIO** button (top, shown in a car), tunes to the next station with a burst of static, and the last step turns it off; the station's name shows above the speedometer. Each car keeps its station, and a saved game keeps the one you were driving with.

| Station | Style | File |
|---|---|---|
| NEON FM 101.1 | synthwave | `audio/radio/neon-fm.mp3` |
| BAY BEATS 94.7 | house | `audio/radio/bay-beats.mp3` |
| RADIO PALMERA 89.5 | reggaeton | `audio/radio/radio-palmera.mp3` |
| RIOT 97.0 | punk rock | `audio/radio/riot.mp3` |
| LOW TIDE 88.3 | lo-fi | `audio/radio/low-tide.mp3` |

The stations are "live": each runs on its own clock, so you tune in mid-song, and coming back later you hear it further on (this needs a server that sends parts of files, as GitHub Pages does; elsewhere a station starts from the top). The radio fades out when you get out, die or pause, and M mutes it with everything else.

**Uploading a track**: upload it under its final name (for example `neon-fm.mp3`) - renaming an MP3 afterwards in GitHub's web editor turns it into a broken two-byte file and the station shows NO SIGNAL. NEON FM now plays the owner's own track.

The music files now are placeholders: 50-60 s seamless loops synthesized by `tools/radio_placeholders.py` (numpy, scipy and ffmpeg; `python3 tools/radio_placeholders.py [station ids]`). **Replace any of them with real music under the same file name** - MP3 plays in every browser, any length, and it loops. Names, frequencies, styles, colours, files, the radio volume and how many cars have it on are in `js/01e-radio-data.js`.

## Day, night & weather

A clock runs with the game, shown under the stars: a whole day lasts 24 real minutes and a new game starts at half past five in the afternoon (both can be changed on the New game screen, and the weather can be fixed there too). The clock stops while the game waits (city map, weapon wheel, pause menu).

- **The hour**: a bright, warm, sunny day, an orange-pink dawn around 6:00 and dusk around 19:30, and a dark night in deep blue. By day the ground shows its true colours - the purple of the night turns to grey streets and sidewalks, green grass and sandy beaches - and the buildings throw sharp, dark shadows; at night they almost vanish. The sun crosses the sky from east to west, so the lit side of the buildings turns with the hours; by night a faint, cold moonlight comes from the north-west and the city is dark, so street lamps cast pools of light and lit windows, neon and headlights stand out (mode: `dayNight`; off, the old look - a hazy blue day, a pink dawn, a purple dusk and the neon night). The sky table's *Look* rows set how much light the night keeps (40%), how far the ground turns to its daylight colours (100%) and how dark the shadows are in the sun (45%).
- **Lights**: lit windows glow faintly by day and fully at night; neon signs, trims and underglow are dimmer by day; street lights and headlights come on at dusk and go off at dawn.
- **Weather** changes every 2 to 6 minutes and blends in over 25 s: clear (45%), cloudy (20%), rain (20%), storm (8%), fog (7%).
  - *Cloudy*: a weaker sun and greyer light.
  - *Rain*: streaks and splashes, roads that get wet and shine with the lights at night, the hiss of rain, people under umbrellas and in a hurry, fewer people strolling. Wet roads give 75% of the grip (a hard stop from 80 km/h takes 30 m instead of 25 m), and traffic drives 20% slower. Roads dry 90 s after the rain stops.
  - *Storm*: a wind-driven downpour, 62% grip, lightning that lights up the screen and thunder after it.
  - *Fog*: you see less far, and so do the police.
- **The police see less far**: 75% at night, 85% in the rain, 50% in fog (the factors multiply, so a stormy night is a good time to lose them).
- **Fireworks at midnight** (mode `fireworks`): when the clock passes midnight a show starts over one random park, plaza or beach for a minute - rockets climbing on a trail of sparks and bursting as peonies, rings, golden willows and crackling white stars in the city's neon colours, a whistle and a bang you hear from far away (450 m); a toast says where (MIDNIGHT FIREWORKS OVER PALM HEIGHTS). Nothing is hurt. Sky table: *Fireworks*.

Every number is in `js/01d-sky-data.js`, in everyday units, and `tools/settings_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back, like the police table:

```
python3 tools/settings_sheet.py sky export sky.numbers      # or sky.xlsx
python3 tools/settings_sheet.py sky import sky.numbers [--dry-run]
```

## Weapons

You start with nothing but your **fists**. Every other weapon has to be found: weapons and their ammunition lie hidden off the main streets - in back alleys, yards, parks, parking lots, on the beaches and promenades - each one turning inside a bubble of the weapon's own colour (the weapon itself, or a box of its ammo with a band of that colour). Walking over one picks it up - only on foot: driving over pickups (weapons, ammo, items, cash) does nothing.
- **Melee weapons** are the most common. They always lie in the same places and never go away; you do not pick one up while you carry that weapon (its bubble is faint then).
- **Guns and bombs** lie in different places every game, fewer of each. One you take comes back somewhere else, out of sight, a minute later. A newly found gun goes straight into your hand.
- **Ammo** is taken even before you have its gun, and kept for it.
- **Busted**, the police take everything you found; **wasted**, you keep it.
- Story mode hides only 30% as many, but a weapon the map holds at all is there at least once (the one AA launcher).

The **weapon button** at the top shows the weapon in hand (in its colour) and its ammo; tap it (or press **Q**) for the weapon grid: every weapon in the game in its own cell, with a detailed picture of it (drawn once, only for the grid - in the street the weapons keep their small models), its name in its colour and its ammo. The ones you have not found yet are grey and dim, marked NOT FOUND; tap one to see where it is sold (or that it is hidden in the city). The one in your hand is lit cyan; the ones you have carry their number key. The game waits until you tap one; tap outside the grid to go back (mode: `weaponGrid`; off, the old wheel with only the weapons you have). **1 - 9** pick directly, the mouse wheel cycles.

| Weapon | Colour | Kind | Damage | How you use it | Hidden on the map |
|---|---|---|---|---|---|
| Fists | peach | melee | 8 | tap FIRE to punch | always yours |
| Baseball bat | amber | melee | 35, knocks down 1.5 s | tap FIRE to swing | 12 |
| Knife | silver | melee | 100, short and narrow | tap FIRE to stab | 12 |
| Machete | mint | melee | 55, wide arc | tap FIRE to slash | 8 |
| Golf club | pink | melee | 22, sends people flying | tap FIRE for a full swing | 8 |
| Pistol | cyan | handgun | 28 | tap FIRE | 6 + 8 ammo |
| Revolver | blue | handgun | 60, 6 rounds | tap FIRE | 3 + 4 ammo |
| SMG | purple | automatic | 13 | hold FIRE | 4 + 6 ammo |
| Shotgun | orange | shotgun | 5 pellets x 70, 23 m | tap FIRE | 4 + 5 ammo |
| Machine gun | magenta | automatic | 15, 100-round belt, 100 m | hold FIRE | 2 + 3 ammo |
| Sniper rifle | yellow | rifle | 160 | stand still, hold FIRE and drag to the target, let go to shoot | 2 + 3 ammo |
| Rocket launcher | red | launcher | blast 10.8 m | like the rifle: stand still, hold FIRE and drag, let go to fire | 2 + 3 ammo |
| AA launcher | sky blue | launcher | one hit destroys a helicopter, tank or APC | stand still, hold FIRE, keep the sight on the target until it locks (2 s), let go | 1 (with one rocket) |
| Grenade | green | thrown | blast 5 m, 2.5 s fuse, bounces | hold FIRE and drag the opposite way, let go to throw | 4 + 4 ammo |
| Pipe bomb | lime | thrown | blast 9 m, 4 s fuse, stays put | like the grenade, a shorter throw | 2 + 2 ammo |

**Melee.** FIRE swings what is in your hand (held, it keeps swinging). Partway through the swing it hits everyone in the arc in front of you, out to the weapon's reach: damage, a push and a knockdown - people lie on the ground for the knockdown time - or, pushed more than 3 m (the golf club), they fly through the air and bounce off walls and cars. Cars in the arc take damage; boxes, bags and crates burst, bins fly. Melee is silent; police who see it count it like a shot, and hitting a cop is hurting a cop.

**How people move** (mode: `liveWalk`): arms swing with each step, the body sways a little and bounces; running, people lean forward with their arms out. Their heads bob as they walk; standing about they look around, and when you come close they glance at you. You move the same way, and stood still you look about too.

**Throwing.** On a touch screen FIRE turns into a little stick while a grenade or pipe bomb is in hand: hold FIRE and drag toward where it should land - to the edge of the ring for the full range, so it works in every direction, up and left too, with FIRE in the corner of the screen. With the mouse, like a slingshot: hold the button and drag the opposite way to the throw. A row of dots in the weapon's colour shows the arc and a ring the size of the blast shows where it will land; the further you drag, the further it goes, up to the throw range. Let go to throw; a short drag throws nothing. With the keyboard: hold J to wind up (the longer, the further) and it goes the way you face. A grenade bounces off walls, cars and the ground and rolls; a pipe bomb stops where it lands. Both blink faster as the fuse runs down, then blow up like a rocket with their own blast radius; in deep water they fizzle out. In a car FIRE drops one out of the window behind you.

**The weapon table.** Every weapon is one entry of `js/01f-weapon-data.js`, in everyday units, and `tools/weapon_sheet.py` exports it to Apple Numbers or Excel - one column per weapon, in the order of the weapon wheel - and reads an edited copy back, checking every value (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/weapon_sheet.py export weapons.numbers      # or weapons.xlsx
python3 tools/weapon_sheet.py import weapons.numbers [--dry-run]
```

The rows come in sections:
- *Weapon*: name, short name, status, class, sound, **bubble colour** (each weapon its own), and two lists that say which mechanics it needs - **how you use it** (tap, hold, scope, swing, throw; new) and **what it fires** (bullet, rocket, homing, melee, grenade; new).
- *Mechanics in words*: **how to use** (one or two sentences, shown under the weapon wheel and on the Help page's WEAPONS tab), **how it works** (a full description of the behaviour) and look / sound / ideas.
- *Hitting*: damage, bullets per shot (above 1 = a shotgun), spread, range, time between shots, damage to vehicles, goes through cover.
- *Shops*: price of the weapon and of one ammo pickup in the stores (empty: not sold).
- *Ammo and finding it*: magazine, spare rounds when found, most carried, rounds per ammo pickup, how many weapon pickups and ammo pickups lie hidden on the map, the share of people carrying it, reload, have it at the start (only fists), kept when busted, fires from a car (the drive-by).
- *Police and noise*: heat per shot, heard within, people flee within, screen shake.
- *Scope or sight*: zoom, sight shape, blur, line of sight, sight stays up.
- *Explosives*: blast radius, how hard the blast throws things (*Blast throw*, %), flight speed, dud chance and angle, for grenades fuse, throw range and bounce, and for homing rockets the lock-on time and the flight time.
- *Melee*: reach, swing arc, knockdown, push back.

A weapon that works like an existing one - another pistol, a shotgun, another melee weapon or bomb - can go in the game straight from the table. One that needs a mechanic that does not exist yet is a **draft** (use or fires: new): describe it in *how to use* and *how it works*, fill the numbers you can, and the game leaves it out until it is built. Saved games keep each weapon by its ID (whether you have it, its magazine and spare rounds), so weapons can be added or reordered without breaking them.

The sniper rifle aims through a scope that sits just above your finger (so the finger never covers it; near the bottom edge it comes down to the finger) and shows what is under it 4x bigger. The crosshair reaches every part of the screen, edges and corners too - the scope around it simply runs off the edge, and its words stay on the screen; everything outside the scope is blurred, and the game keeps running. The shot goes off when you lift your finger. The scope then stays where it was for the 1.5 s the bolt takes (it ignores the finger meanwhile) and disappears; then you can aim again. After the last round of a magazine it stays for the same 1.5 s, which already count toward the 10 s reload. The ring is yellow while it cannot fire yet (next round, reloading, or you are moving), cyan when ready and pink when the crosshair is on a person or a car. With a mouse the scope is on the pointer; holding J, the arrow keys move it. You can only shoot what you can see: with a building between you and the crosshair the scope says NO LINE OF SIGHT and letting go does not fire. One shot kills a person. The round goes through props (dumpsters, crates, AC units, pumps, fountains, cranes, containers, planes, sign posts) and through one car, damaging it, to hit what is behind; a building, a second car or an armoured vehicle stops it. Rifle ammo comes in long cases with a yellow stripe.

The **rocket launcher** aims the same way (and also fires only while you stand still) through a different sight: a wide amber 2x viewfinder with corner brackets, a diamond reticle and a range readout (DANGER CLOSE when the blast would reach you); the rest of the view is darkened, not blurred, and the sight goes as soon as you let go. The rocket flies level and straight at the spot you aimed at - it does not follow a target that moves - and explodes on the first thing in its way: a building, a prop, a gate, a car or a person. If it gets past that spot without hitting anything it keeps going, and only from there it wanders: its heading swings in slow waves that change at random but never turn sharply, until it hits something or its motor burns out and it drops. Its motor glows and lights the street; the smoke is thick right behind it and spreads into a white trail that takes five seconds to fade. One rocket in twenty is a dud that leaves the tube 40 degrees off. Rockets come in olive crates with orange bands.

The **AA launcher** (anti-aircraft) uses the rocket launcher's sight, but it only takes a **helicopter** (the police helicopter, or the army's on its pad), a **tank** or an **APC**. Keep one anywhere inside the sight's frame: the readout counts LOCKING 2.0S down while the beeps quicken and rise, then LOCKED with a steady tone and the sight lit; let go and the rocket is away - without a lock it does not fire (NO LOCK). The rocket leaves in a random direction, climbs and swerves about the sky trailing white smoke, and after 4 s strikes the target wherever it has gone: one hit destroys it (a target already gone: it blows up where the target was). You carry three rockets at most - one loaded, two spare. It is very rare: one lies hidden somewhere in the city (with one rocket in it), and the black market at the docks sells it for €25,000 and its rockets for €5,000 each (*Items and stores*).

**Explosions** (rockets and cars blowing up) show a fireball that swells and rises, a burst of flame, debris, embers, a shock ring, a ragged scorch mark and a column of dark smoke that hangs around for a few seconds. People inside a blast are torn apart: no body is left - a burst of blood, pieces flung away from the blast that lie a few seconds and fade, a large blood mark with smaller ones around it - and no ambulance comes; what they carried still drops. Every blood mark, from a blast, a body or a hit, is one of 14 splash shapes drawn when the game starts (a ragged pool, blobs, droplets and streaks), turned, stretched, sized and tinted at random, so no two look alike. They throw everything they do not destroy - as hard as the weapon table's *Blast throw* says: a rocket 40% (yours and the tank's), grenades, pipe bombs and exploding cars 100%; the damage and the look of the blast do not change with it: cars hop, spin and slide, people go flying (in small steps, so they bounce off walls, props, cars and other people instead of passing through them), and dumpsters, crates, bags, bins, barrels, pallets, AC units, carts, planters, benches, hydrants and newspaper boxes tumble through the air and stay where they land (solid again there); a new game puts them back.

**Street junk.** Shops put out piles of cardboard boxes, heaps of garbage bags and wheelie bins along the backs of the sidewalks, and the back alleys are full of boxes, bags, bins, barrels, crates and pallets. Drive into them (from about 12 km/h) and cardboard boxes, garbage bags, single crates and pallets burst: bits fly the way you were going and a patch of mess stays on the road. Bins, barrels and newspaper boxes are knocked flying and spill their trash; a hydrant is knocked off and a fountain of water shoots up for a few seconds. Benches, parking meters (on the busy shopping streets) and beach umbrellas are knocked flying too, a phone box's glass shatters, a planter breaks and a bush in a park is flattened (mode: `moreProps`). Each hit slows the car a little (a bus or the tank hardly notices). Each kind has its own sound, a little different every time: cardboard thumps as it folds, a garbage bag bursts and rustles, crates and pallets splinter crack-crack-crack, a bench's slats crack while its iron frame rings, a phone box's glass cracks and shatters with shards tinkling down, a clay planter cracks and rings, a bush thrashes and a twig snaps, an umbrella's canvas whumps, a hydrant clanks and then gushes and hisses, a parking meter pings and spills jingling coins, a newspaper box bangs and its papers flutter, a wheelie bin bonks hollow, an oil drum booms and a street bin clangs (also when you swing at them). A blast throws all of it and shreds the light things near its middle. What was smashed or knocked away is put back after a minute and a half, once you are far enough away not to see it.

## Items and stores

**Hidden items.** Health, body armor and the heat reducer lie hidden like the guns - off the main streets, each turning in a bubble of its own colour, coming back somewhere else out of sight a minute after you take one. Only cash lies on the sidewalks, and none of it shows on the minimap or the city map (*Economy*).

| Item | Bubble | What it does | Hidden | In stores |
|---|---|---|---|---|
| Health | white, a white box with a red cross | +50 health, taken only when you are hurt | 10 | €150 |
| Body armor | blue, a blue vest | +50 armor, up to 100: a blue bar under the health bar that takes the damage before your health does | 6 | €250 |
| Heat reducer | flashing red and blue, a police star with an arrow down | one star less, taken only while you are wanted - from inside a car too | 4, 10 in back alleys, 1 on the road from 3 stars | not sold |

**Heat reducers.** Besides the four hidden ones: from 3 stars up one lies in the middle of a street ahead of you, just out of sight (about 70 m, never on the maps); a new one comes 30 s after it was taken or left far behind (170 m), and it goes when you drop below 3 stars. Ten more stand in fixed back alleys - always showing, but taken only while you are wanted, each back in its alley 2 minutes after you took it (story mode has 3, its share of the hidden pickups). Every heat reducer is taken from inside a car too - drive through it; everything else is taken on foot only. The numbers are in the streets table, `js/01m-streets-data.js`.

**Stores.** Six stores stand on shopping streets spread over the city, and the **black market** in a warehouse at the docks (Dockside; mode `blackMarket`) - always the same buildings, each with a front the camera can see. Each is a **€** in its own colour on the minimap and the city map, its name on a band over the door (and, where the front faces east or west, on a blade standing out from the wall toward the camera too), and at its door a ring of light with a € and the store's first weapon turning above it. Walk up to the door on foot and a **SHOP** button appears next to you: tap it, click it or press **E** (a car standing closer than the door gets E instead). The game waits while you shop; **LEAVE**, **Esc** or **E** goes back out, and what you bought is saved by the autosave. Your score is your cash.

| Store | Colour | Sells |
|---|---|---|
| Bat Cave Sports | amber | baseball bat, golf club, knife, health |
| Lucky Pawn | lime | pistol, revolver, machete, knife, body armor |
| Bullseye Guns | cyan | pistol, SMG, shotgun, health, body armor |
| Army Surplus | green | machine gun, grenades, machete, body armor |
| Trophy Hunt & Fish | yellow | sniper rifle, shotgun, revolver, health |
| Back Room Deals | magenta | rocket launcher, pipe bombs, grenades, machine gun, body armor |
| Black Market (at the docks) | sky blue | the AA launcher and its rockets - sold nowhere else |

Each gun or bomb a store sells comes with a row for its ammo (one ammo pickup's worth). A weapon you have shows OWNED; ammo, health and armor show FULL when you cannot carry more; a price you cannot pay is red.

| Weapon | Price | Ammo | | Weapon | Price | Ammo |
|---|---|---|---|---|---|---|
| Baseball bat | €150 | - | | Shotgun | €1,000 | €120 (7) |
| Knife | €120 | - | | Machine gun | €3,500 | €400 (100) |
| Machete | €250 | - | | Sniper rifle | €2,500 | €300 (10) |
| Golf club | €200 | - | | Rocket launcher | €5,000 | €800 (2) |
| Pistol | €400 | €60 (24) | | Grenade | €600 | €450 (3) |
| Revolver | €700 | €80 (12) | | Pipe bomb | €900 | €600 (2) |
| SMG | €1,200 | €150 (60) | | AA launcher | €25,000 | €5,000 (1) |

The items and the stores are `js/01g-shop-data.js` (what each item gives, its colour, how many are hidden, its price; each store's name, colour and what it sells - weapon ids from the weapon table and item ids). Weapon and ammo prices are two rows of the weapon table (*Shops* section of `tools/weapon_sheet.py`); an empty price means it is never sold.

## Car delivery at the docks

On the south-east corner of the port quay is the **export bay**: yellow lines with EXPORT painted inside, a board beside it, a slewing crane on the quay edge and a small car carrier, the *Rolling Star*, moored alongside. It is not on the maps - you find it at the port.

- **One car is wanted at a time**: the board says which - the kind and the colour (a swatch and its name) and what it pays at most. Coming near with a new request, you are told it. The colour is always one of that kind's usual paints in the vehicle table, never one only a car salon would paint.
- **Delivering**: park the wanted car in the bay and get out. The crane lines it up, lowers its lifting frame onto it and lifts it - you are paid as it rises - swings it over the ship and lowers it into the hold. A wrong car: *NOT THE WANTED CAR*. Not while the police are after you: *LOSE THE POLICE FIRST*.
- **Pay**: each kind's *delivery price* (vehicle table: sedan €600, estate €700, motorbike €450, pickup €900, truck €1,000, sports car €1,500, limo €2,500; never police, service vehicles, the bus, the tank or the APC), less half the car's damage in % (a car 40% damaged pays 20% less).
- **The next car** is wanted 2 minutes later (the board says *NOTHING WANTED - COME BACK LATER* meanwhile). While a car is wanted, 30% of the cars of that kind that appear come in the wanted colour, so one can be found.
- The wanted car is kept in saved games. The timings and shares are in the places table (*Car delivery*); the prices in the vehicle table and the economy sheet. Modes: `carDelivery`.

## Pay 'n' Spray

Four paint shops, spread over the city (the first a short drive from the start, the others in Palm Heights and Seaview): low white workshops with neon bands, a roller door to the street between yellow and black posts, PAY 'N' SPRAY over the door and a giant spray can on the roof. Each is a spray can on a pink square on the minimap and the city map. Mode: `sprayGarage`.

- **Driving in**: come up to the door in a car it takes and the door rolls up (a green lamp beside it); drive in, stop in the bay and it comes down behind you. On foot the door stays down (unless you are already inside).
- **Inside**: while you are in, the roof turns see-through and you see the workshop - the spray bay between yellow lines under a gantry of nozzles, shelves of paint, a workbench and a compressor, a car up on the lift, a tool chest, drums and tyres - and the painter in white overalls. It is the first building you go inside; the top-down kind of interior (others, and rooms of their own, come later).
- **The colours**: a card at the bottom of the screen, the car in view above it. First the kind's own paints, then any colour - 12 hues, each light, bright and dark, then white, greys and black. The car shows each colour as you tap it (one is picked to start with); **SPRAY** pays €100, **LEAVE** (or Esc, E) puts the old colour back, pays nothing and opens the door.
- **The respray**: the door shuts and the painter walks round the car with his gun in a cloud of the new colour; 4 seconds later it comes out fully repaired - a burning car is put out - in the new colour (you cannot get out or fire meanwhile). Autosaved.
- **The police**: if no cop saw you at the door or going in, they lose you, at any wanted level. Seen: you are repaired and repainted, and still wanted (*THEY SAW YOU GO IN*).
- **Who it takes**: cars, trucks, bikes, the sports car, the limo - repainted. Taxis, buses, ambulances, fire engines and trash trucks are repaired and keep their livery (*REPAIR €100*). Police cars, the tank and the APC are turned away, and so is a vehicle too big for the bay (a bus in the shorter ones) or a driver with less than €100 - the door stays down and a red line says why. No respray during a race.
- **The car wanted at the docks**: its colour is a name (pink, blue...) - spray a car of the wanted kind that colour and the dockers take it.
- **Never in the way**: no lamps, trees, bins or parked cars across a garage's door; no street junk inside.

The count, the price, how long spraying and the door take, the stars a respray loses and the number of hues are in the places table (*Spray garages*): `python3 tools/settings_sheet.py places export places.numbers`; the price is in the economy sheet too.

## Safehouses

Ten places of your own, each unique (the safehouse table, `js/01q-safehouse-data.js`). The Colony room is yours from the start; the others are for sale. Each is a house on the minimap and the city map: green for yours, white with a red € for sale. Mode: `safehouses`.

| Place | Where | Price | Cars | Inside |
|---|---|---|---|---|
| Colony Hotel room | the Colony, the Sandbar beach | free | 1 reserved space in the guests' lot | the hotel, 6 floors, your room on the 3rd |
| Coral Shore trailer | a fenced gravel yard on a Coral Shore street | €3,000 | garage for 1 | a silver trailer |
| Mercado flat | an old brick block in Mercado | €8,000 | 1 reserved space | 4 floors, your flat on the 2nd |
| Houseboat | the port's west quay, Dockside | €15,000 | none (a boat later) | a cabin on a pontoon, a gangplank to the quay |
| Heron Key bungalow | its own beach beside the lunapark car park | €20,000 | garage for 2 | a pastel bungalow, a terrace to the sea |
| Palm Heights loft | a brick building downtown | €30,000 | 2 reserved spaces | 6 floors, your loft on the 5th |
| Seaview condo | a condo tower by the sea | €45,000 | 2 reserved spaces | 10 floors, yours on the 8th |
| Sunstrip deco apartment | a pastel deco block | €60,000 | 3 reserved spaces | 6 floors, yours on the 4th |
| Fairway Isles mansion | the golf links, behind a wall and a gate | €120,000 | garage for 4 | a white villa, a pool in the front garden |
| Penthouse | the top of the tallest glass tower, Palm Heights | €150,000 | 4 reserved spaces | 20 floors, the top one yours |

- **Buying**: a FOR SALE sign with the price stands at the door (at a house, by its gate). Walk up on foot and a **BUY** button appears by you (or press E): a card with a picture of the place, the price, the cars it keeps and what is inside; **BUY** pays and it is yours (autosaved), **NOT NOW** (Esc, E) leaves.
- **Towers** (the Colony room, the flat, the loft, the condo, the deco apartment, the penthouse): at the door, **GO IN**, and the screen turns into a side-on cut of the building - the lobby with glass doors, a desk clerk and a sofa, an elevator and stairs up every floor, hallways with numbered doors and neighbours walking them, going in and out of their doors; a few doors open on empty rooms, the rest are locked. Your door glows cyan; inside it your flat: a sofa and TV, a bed, a wardrobe, a safe, a kitchen and a window on the city (night or day as outside). Walk with the arrow buttons (or the arrow keys, A / D, the stick); **▲** (W or E) at a door, the stairs or the elevator - the elevator shows its floors, yours marked - and **▼** (S) takes the stairs down. Out of the glass doors in the lobby you are back in the street. MENU (Esc) pauses as usual; the city waits while you are inside.
- **Houses** (the trailer, the bungalow, the mansion, the houseboat): the doors open for you - the front door on foot, the roller door of the garage in a car (and the mansion's gate) - and stay shut for everyone else. Inside, the roof turns see-through and you see the rooms: furniture everywhere, and the bed, the wardrobe and the safe each with a button by it.
- **SLEEP** (at the bed): the screen goes dark and the clock runs on - at night you wake at 8:00, by day at 20:00 (table) - with full health and armour, then the save slots: pick one, or BACK. Not while you are wanted.
- **WARDROBE**: the clothes shop's wardrobe - everything you have bought, free to put on.
- **WEAPON STASH** (at the safe): tap a weapon on you to put it away with its ammo, tap one in the stash to take it. One stash shared by every safehouse; busted or wasted, what is in it stays.
- **Your cars**: leave a car standing in a garage bay or one of your reserved spaces (painted yellow, RESERVED) and it is kept - *KEPT IN YOUR GARAGE* - with its colour and its damage; it is there whenever you come back, and in your saved games. Drive it away and the space is free again. A car left anywhere else is gone as before. Nobody else parks in a reserved space.
- **The police**: going in unseen - into a tower, or into a house or its garage - loses them, at any wanted level (table: up to 5 stars). A cop who sees you go in is not fooled (*THEY SAW YOU GO IN*).

The table holds the ten places (name, kind, district, price, cars, floors, your floor) and the settings: the wake-up hours, the stars lost going in unseen, how many neighbours walk a tower's halls and how many empty rooms open. `tools/safehouse_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back; the prices are in the economy sheet too:

```
python3 tools/safehouse_sheet.py export safehouses.numbers   # or .xlsx
python3 tools/safehouse_sheet.py import safehouses.numbers [--dry-run]
```

The houses stand on plots of their own (map remodel version 5, `safe` in the map file); the towers are buildings of the city chosen by district and size and given the look the table describes; the houseboat's deck and gangplank count as ground in the water. Both kinds of inside are here now: top-down with a see-through roof (houses, like the Pay 'n' Spray) and the side-on view (towers, `js/08t-sideview.js`).


## The car showroom

**Sunstrip Motors** (mode `showroom`, both modes; `js/10s-showroom.js`, `js/08w-showroom.js`) fills the block at the corner of Sunstrip's beach avenue and the street south of the big park (map remodel version 10, `showroom` in the map file): a glass hall facing that street, SUNSTRIP MOTORS over the door and on a pylon by the avenue, a pink car on the maps.

- **Inside** (an interior of the top-down kind: the roof turns see-through while you are in): walk in through the glass doors - bollards keep cars out - and every car it sells turns on a turntable of its own: the sedan, estate, taxi, sports car, pickup, truck, limo and motorbike (cyan lights), and at the front three **rare cars sold only here** (gold lights): the **VELOCE** supercar (€120,000, 340 km/h), the **SUNDANCER** - a 1950s convertible with tail fins and chrome (€60,000) - and the **BRUISER** muscle car with its bonnet scoop and stripes (€45,000).
- **Buying**: walk up to a car and press E (or tap BUY): the card gives its price, top speed, 0-100 km/h and weight, the colours it comes in - the car on the turntable repaints as you choose - and where to **deliver** it: any free garage bay or reserved space of a safehouse you own. Paid, it waits there, kept in your saves like any car you leave there. No free space: buy a safehouse, or drive a car out of one.
- Behind the hall: the **TUNING** workshop (below) and a stock yard of cars under strings of pennants.
- The prices are the vehicles table's **Showroom price** (also in the economy sheet); a vehicle with no traffic and no parked weight is sold only here.

## The tuning workshop

**Sunstrip Tuning** (mode `tuning`, both modes; `js/08y-tuning.js`, the building in `js/10s-showroom.js`) is the workshop behind the showroom, its roller door to the beach avenue under a yellow TUNING sign, a lamp beside it (green: open, blinking: come in, red: busy). Inside - the roof turns see-through while you are in, an interior of the top-down kind - a checkered bay runs from the door between yellow lines, round it red tool chests and a workbench, a stack of tyres, a rack of coloured rims, a car up on the lift, an engine on a stand and the mechanic in blue overalls.

- **Driving in**: come up to the door in a car it takes and it rolls up; stop in the bay and it comes down behind you. It turns away **police and army vehicles** and any car **while you are wanted** (lose the police first), a car on fire and one in a race. Nothing parks across its door.
- **The card** has three tabs, and every pick shows on the car at once:
  - **LOOKS** - **paint** (the car's own colours, then any colour), a **two-tone roof**, **racing stripes** (twin stripes over the bonnet, the roof and the boot), **rims** and **underglow** in any colour (or none: the underglow then follows the paint). Taxis, buses, ambulances, fire engines and trash trucks keep their livery: no paint, roof or stripes for them;
  - **PARTS** - a **spoiler** (a wing on the boot; on the estate a wing on the end of the roof) and a **bonnet scoop**, on the models with room for them and none of their own (the sports car, the NASCAR special and the VELOCE have wings of their own and the BRUISER its scoop; a pickup takes only a scoop; trucks, bikes and the big service vehicles take neither);
  - **PERFORMANCE** - **engine**, **brakes** and **armour** in three levels: engine +5 / +10 / +15% top speed and +10 / +20 / +35% acceleration, brakes +15 / +30 / +50%, armour 20 / 40 / 60% less damage (bullets, crashes and blasts).
- **The price** is what the changes cost: €400 paint, €350 roof, €500 stripes, €600 rims, €800 underglow, €1,500 spoiler, €1,200 scoop; engine €4,000 / €8,000 / €16,000, brakes €2,000 / €4,500 / €9,000, armour €5,000 / €10,000 / €20,000 a level - going up two levels costs both. Levels you have are kept (no going back down). **BUY** pays, the mechanic goes round the car with his air wrench while sparks fly (5 s; the door stays down, you cannot drive or get out), a new engine revs, the door rolls up and the game saves. **LEAVE** puts the car back as it came in.
- **It stays with the car**: park it in a garage bay or reserved space of a safehouse and it is kept, tuned, in your saves; drive off in it after loading a game and it still has everything.
- Numbers: the vehicles table's **Tuning** sheet (`tools/vehicle_sheet.py`: each look, part and level with its price and what it does; the prices also in the economy sheet, TUNING), and the places table's *Tuning workshop* group (how long the mechanic works, how fast the door rolls).

## The junkyard

**Dockside Salvage** (mode `junkyard`, both modes; `js/08z-salvage.js`, the yard in `js/10t-salvage.js`; map remodel 12) fills the south part of the port's maintenance yard, a short walk from the black market: a dirt yard behind a chain-link fence topped with barbed wire, its gateway to the shore street under a DOCKSIDE SALVAGE sign (a magnet over a cube on the maps). Inside: stacks of flattened wrecks along the fences, a yellow-hatched **spot** just inside the gate, a yellow crawler crane with a magnet on its boom, the crusher with its press, the pile of cubes it makes, the office shack (CASH FOR CARS), the kennel and two floodlights. The fence, the stacks, the crane, the crusher, the pile and the shack are solid.

- **Scrapping a car**: drive onto the spot and stop - it tells you what the yard pays - then get out. The crane turns, its magnet comes down onto the roof and lifts the car, swings it over to the crusher and drops it in; the press comes down, the car folds into a cube that goes onto the pile (the last 12 stay there), and you are paid: the vehicle's **scrap price**, less for damage - a car nearly done for still pays 35% (sedan or taxi €300, estate €350, police car €350, pickup €450, truck or ambulance €600, sports car or trash truck €700, bus or fire engine €900, limo, BRUISER or NASCAR special €1,200, SUNDANCER €1,500, APC €1,800, tank €2,500, VELOCE €3,000, motorbike €200). The whole thing takes about 9 seconds; nobody can get back into the car once the magnet has it.
- Any car goes, yours too: a car from your safehouse garage, tuned or not, is gone for good once it is crushed. Crushing a **police car** is a crime only when a cop can see the crusher (one star).
- **The guard dog** (tan and black, a red collar) lies by its kennel. Come into the yard on foot - or within 22 m of it - and it runs at you (faster than you run) and bites (4 health about every second) until you are 44 m away or in a car. It stays back while the crane works on your car and for 15 s after you are paid. Kill it - a gun, a swing, a car, a blast (40 health) - and a new one is there 3 minutes after, once you are out of sight of the yard.
- Numbers: the vehicles table's **Scrap price** (also in the economy sheet, JUNKYARD), the places table's *Junkyard* group (what a wreck still pays, the crane's and the crusher's times, cubes kept, the dog's range, speed, bite, health and how soon a new one comes).

## Iron Key, the prison island

**IRON KEY** (mode `prison`, both modes; `js/08zp-prison.js`, the island and its models in `js/10u-prison.js`; map remodel 13) is a rocky island in the bay between the Palm Heights shore and Heron Key, a district of its own on the maps (orange bars; the ferry pier is a cyan boat). The prison fills most of it: a concrete wall with barbed wire on top, a **watchtower** at each corner, two **cell blocks** (BLOCK A and B, three floors of barred slits), the office by the gate, and the **yard** with a basketball court where prisoners in orange walk about and shoot hoops. The gate in the south wall is under IRON KEY STATE PRISON, with a guard booth and two guards outside; a paved path runs down to a wooden pier at the island's south tip. At night a searchlight on each tower sweeps the island and the water.

- **Busted**, you are let out of the gate (no longer at a police station): it opens for you, you walk out, and the **ferry** waits at the pier until you are aboard. Bail and what they keep are as before (police table).
- **The ferry** is free and **on foot only**. It shuttles all day between the island's pier and the **ferry pier off the Palm Heights promenade** across the bay (a ticket kiosk, FERRY TO IRON KEY, bollards that keep cars off), waiting 20 s at each end. Walk aboard over its ramp (or climb aboard from the water) and you **take a seat** on a bench on the open deck; it casts off a few seconds later (**E** before then gets you off again). You stay in your seat while it crosses - about 25 s; **SKIP THE CROSSING** or **E** goes straight across - and at the other end you **step off onto the pier** by yourself and carry on. It is double-ended, so it never turns round: you get off at the end you did not get on. **While you are wanted it will not sail** - lose the police first. You cannot save on board, nor inside the prison's walls - the game does not autosave there either (a save made inside before this rule starts you outside the gate).
- **Inside the walls is restricted**, like the military base: a RESTRICTED AREA warning counts down (5 s); still inside, the **alarm** gives 3 stars and the **tower guards fire rifles** from their walkways at you anywhere on the island - over the walls, a cell block hides you only when you are close behind it. Shooting inside the walls or at a guard sets it off at once. It stops a minute after you are out of the walls. Let out after being busted, the warning waits until you have walked out. A guard killed is replaced 3 minutes later, while you are away.
- The cell blocks' insides are not built yet: they come with the story's breakouts.
- Numbers: the places table's *Iron Key* group - the ferry's speed and its waits, the warning, the alarm's stars and how long it lasts, the tower guards' range, hit chance and damage, how soon a guard is replaced, how many prisoners are in the yard.

## Skyline One, the construction site

**SKYLINE ONE** (mode `site`, both modes; `js/08zt-site.js`, the site and its models in `js/10v-site.js`; map remodel 14) fills a whole downtown block of Palm Heights, cleared for it: blue hoardings along the streets with SKYLINE ONE - OPENING 1998 on them, a gate on the west street and a site office of stacked cabins. On the east half stands the **half-built tower**: six concrete decks (the ground and five above it, the top one open to the sky) on columns, with yellow and black barriers along the edges, rebar and formwork, and scaffolding up its street side. Two **tower cranes** with SKYLINE ONE on their jibs turn slowly, lifting loads. In the yard: piles of rebar, bricks, pipes and pallets, a pit, dirt mounds and two plank ramps.

- **Up the tower**: drive or walk up from deck to deck by the **ramps** in the side strips (like the lunapark car park; the decks above you fade so you can see). On the top deck the **launch ramp** at the street edge throws you **over the avenue**: you come down on the street or, fast enough, on the **roofs across it** - a car flying higher than a building clears it and lands on its roof. Up there you can drive about and get out and walk; off the edge the car falls and you drop (a long drop on foot hurts). A hard landing damages the car (higher than 8 m).
- **The yard's ramps and mounds** throw a fast car or bike into the air.
- **By day** (7:00 to 19:00) the **rolling gate** is open (rolled back along the hoarding), workers in hi-vis and hard hats walk the yard (three more stand up on the decks), the cement mixer's drum turns, the **digger** digs at the pit and a **dump truck** shuttles across the yard - all three yours to take (an armoured MIXER and DUMPER, and the slow DIGGER on tracks).
- **At night** the rolling gate is shut across the way in (a striped bar from above; it waits while anything stands in the gateway) - but there is a **broken hoarding panel** on the north street to get in on foot, and a car driven into the gate faster than 35 km/h knocks it off its track: the alarm goes (the guard's stars) and the gate is mended in the morning. The three machines are always there when you come (a taken one comes back a while after you have gone). A **security guard** walks the yard with his torch: if he sees you inside you get a star.
- **Pickups on the decks**: a weapon on the top deck and health or armour three decks up; taken, they come back a while after you have gone.
- Numbers: the places table's *Construction site* group - opening hours, how many workers, the guard's sight and stars, how hard the ramps throw a car, the drop a car takes without damage, the drop on foot that hurts and how much, the dump truck's speed, the speed that rams the gate open at night, how soon a machine or a deck pickup comes back. The machines are rows of the vehicles table.

## The casino strip: the ROYAL FLAMINGO and THE PULSE

On the Sunstrip beach avenue (modes `casino` and `club`, both modes; `js/08zu-casino.js`, the buildings in `js/10w-casino.js`; map remodel 15) the block at the north end of the avenue holds the **ROYAL FLAMINGO** casino and **THE PULSE** nightclub; the beachfront row across the avenue is a strip of **bars and small clubs** - TIKI TIKI, CLUB 84, NEON RAIN and the rest - their names glowing on their roofs, a neon band and a lit door at street level. At night more people stroll the avenue's sidewalks.

- **The doors and the dress code**: a bouncer stands at each door. He lets you in only when you wear **at least one smart piece** (a suit or blazer, the silk shirt, the fedora, aviators, loafers or oxfords, pressed trousers, the round glasses - the clothes table's *Smart* column), never while you are wanted, and not while the casino's guards are after you. Cars stop at the bollards.
- **The ROYAL FLAMINGO** never closes: cream walls with gold trim, a big pink neon flamingo on the roof (it kicks a leg), the name in gold over the south edge and on the bulb-lit canopy over its door to the avenue. Inside (the roof turns see-through, an interior of the top-down kind) a red carpet with gold lines, slot machines along two walls, two dice tables with their croupiers, the cashier's cage, gamblers, and armed guards in black suits.
  - **Slot machines**: stand at one and tap **SLOTS** (or **E**): **PULL** (€10) spins three reels - flamingo, seven, bar, bell, lemon, cherry. Three of a kind pays, two cherries give the money back, three flamingos are the **jackpot** (€25,000). A machine pays back about 92% of what goes in.
  - **Dice** (craps on the pass line): at a table tap **DICE**, set your bet (€50 to €5,000) and **ROLL**. 7 or 11 on the first roll wins what you bet, 2, 3 or 12 loses it; any other total is the point - roll it again before a 7 to win. Leaving with a point on loses the bet.
  - **Trouble**: shooting in the casino or hurting anyone in it - the guards draw their pistols and come for you, and you get 2 stars. They calm down a minute after you are out.
  - **Robbing the cage**: at the cashier's window with a gun in your hand, tap **ROB**: stay at the window while the cashier fills a bag (6 s) - between €15,000 and €40,000, 4 stars and every guard after you. Step away and you get nothing. The cage has cash again 20 minutes later.
- **THE PULSE** is open from 22:00 to 6:00: a queue along the sidewalk behind a velvet rope (walk past it, dressed for it), the name and a neon heartbeat over the door and on the roof. Inside (top-down, its roof see-through) a dance floor of tiles lighting up to the beat, a dancing crowd, the DJ between speaker stacks, a bartender, sofas, moving spots and a mirror ball, and the radio's dance station (BAY BEATS) playing while you are in. By day it is shut.
- Numbers: the **casino table** (`js/01u-casino-data.js`; `python3 tools/settings_sheet.py casino export casino.numbers`): the dress code, the pull's price and the jackpot, what each picture pays and how many of it each reel holds, the dice bets, gamblers, guards, the stars for trouble and for a robbery, what the cage pays and when it fills again, the club's hours, dancers, queue and music, the people out on the strip. The money is also in the economy sheet; which clothes are smart is in the clothes sheet.

## Sunset Harbor, boats and swimming

On the inner bay just south of Iron Key's ferry pier (modes `marina` and `swim`, both modes; `js/08zv-marina.js`, the models in `js/10x-marina.js`; map remodels 16 and 17) lies **SUNSET HARBOR**, the marina: a paved quay with the white harbour office under a blue roof, a little red-banded lighthouse on its corner and SUNSET HARBOR under an orange neon sunset on its roof edge; three wooden finger piers on piles with cleats and lamps, the berths marked on the water; and the fuel dock with two pumps at the quay's south end. On the maps: an orange anchor.

- **Boats** are vehicles (rows of the vehicles table): the **speedboat**, the **jet ski**, the **yacht**, the **fishing boat**, the **tour boat** and the **police boat**. Arcade handling with a slide - off the throttle the water slows you quickly. Get in with **E** anywhere: from a pier, or swimming up to one. They stay on the water: a hard knock against the shore or a pier damages them. They pass **under the bridges** (the bridges stop cars, not boats), bump off the Iron Key ferry and the port's ships, and the boats out on the water steer round anything lying still in their way (backing off when they get stuck). A boat wrecked burns for a few seconds and sinks - you are thrown in the water.
- **What they look like** (`js/11-render-dynamic-meshes.js`, made to be seen from above): every hull curves in from its beam to a pointed bow, the transom a little narrower. The **speedboat** has a white foredeck with stripes in its colour and a chrome bow rail, a windshield in a shallow V, two bucket seats and a bench in the cockpit, a sunpad aft and an outboard; the **jet ski** a hood in its colour, a black bumper, a long saddle, the bars and footwells; the **yacht** a navy toe rail round a teak deck, a white deckhouse in a band of dark windows, a flybridge on top with the helm and a sofa under the radar arch, a sunpad on the foredeck and a swim platform; the **fishing boat** a working deck with nets, floats, fish crates and a winch, a wheelhouse forward, a mast with its boom and two outrigger poles; the **police boat** a grey fender collar, white chevrons on the foredeck, a white cabin with the light bar and a searchlight, twin outboards; the **tour boat** a glazed saloon and an open top deck with rows of blue benches full of tourists, a striped awning aft, the wheelhouse forward, life rings and a flag at the bow.
- **Wake and spray** (mode `boatWake`, both modes): a moving boat pushes a bow wave aside that opens into a white **V of foam** behind it, with a soft wash down the middle - longer and brighter with speed, following every turn, fading after a few seconds (never over land); faster still, **spray** flies up and aside at the bow, more in a hard turn.
- **Swimming**: out of your depth you swim - about as fast as you run (90%), as far as you like, under the bridges too; no weapons in the water. Get out wherever the shore or a pier lets you climb.
- **A car in the water** sinks: you have **4 seconds** to get out (**E**, or the car button) and swim. Still inside: DROWNED.
- **At the harbour**: speedboats, jet skis and a yacht lie moored at the berths, yours to take - some owners stand on the pier by their boat, and they shout and come at you (or run) when you take it. The **BOAT SHOP** at the office door sells the speedboat (€40,000), the jet ski (€12,000) and the yacht (€250,000); a boat you buy waits at **your own berths** (the three with yellow lines - up to three boats), back there whenever you return, and is kept in your saves. Wrecked, it is lost.
- **Out on the water**: speedboats and jet skis cruise round the bay (keeping to starboard), fishing boats work off the port's quays, and the **tour boat** sails round Iron Key all day.
- **The police boat**: when you are on the water (in a boat or swimming) with 3 stars or more, a police boat comes - it chases you, rams you, and the cop on deck shoots. It goes where the police last saw you; the helicopter's light shows it the way. You cannot save on the water.
- **Jetties**: eight small wooden jetties round the coast, each where a street runs close by the open water, so a boat can land you a few steps from a road - a blue anchor on the minimap and the big map.
- Numbers: the places table's *Sunset Harbor* group (boats out on the bay, fishing boats, the tour boat, boats moored, the stars that bring the police boat) and *In the water* group (how fast you swim, the time to get out of a sinking car, the speed a wake starts at, how long it lasts and how wide it opens, the speed spray starts at and how much); the boats themselves are rows of the vehicles table, their prices in the economy sheet too.

## Stunt jumps

Twenty **unique stunt jumps** (mode `stunts`, both modes; `js/08zw-stunts.js`, the ramps in `js/10y-stunts.js`; map remodel 18): fourteen **street ramps** on the open ground off the traffic lanes - lawns, parks, beaches, a few flying across a street - and five **over the water**, from the shore across a canal or an inlet in Fairway Isles to the far bank; the twentieth is **Skyline One's launch ramp** off the top deck over the avenue.

- **Spotting them**: every stunt ramp looks the same - a steel wedge with yellow and black chevrons up its deck and a checkered flag at each corner of its lip. They are **not on the maps** until done; the ground before and after each is kept clear of trees and benches.
- **The jump**: hit the ramp fast enough (each jump has its own speed, 100 to 140 km/h; Skyline One's 50) and the car flies off the lip - **time slows down** while it is in the air (the usual camera). Land **on your wheels**, far enough (25 to 55 m), not spun round and not smashed on the way: **UNIQUE STUNT BONUS** - €500 to €5,000 by the distance and the height, paid the first time only, and the jump counts toward **100%**. Too slow at the lip, short (or into the water), crashed: a small note - try again. Done again: STUNT DONE BEFORE.
- **Any vehicle on wheels** counts - cars, trucks, buses, motorbikes, the tank.
- **The big map** shows a yellow tick where a jump is done; the STATS card's 100% tab lists the ones still to do. The jumps done are kept in the saved game.
- Numbers: the **stunt table** (`js/01v-stunt-data.js`; `python3 tools/settings_sheet.py stunts export stunts.numbers`): the slow motion, how hard a stunt ramp throws a car and how fast it falls, what a good landing is, the bonus per metre flown and per metre of height and its least and most, and for each of the twenty jumps the speed needed at the lip and how far you must fly. The money is also in the economy sheet.

## MISSIONS TEST and the missions

A third mode on the NEW GAME screen, **MISSIONS TEST** (mode `test`, `js/08zy-missions.js`): every new mission is played here before it goes into STORY. Its column in the modes table is STORY's, so the city is the one STORY will have. You start with €1,000,000, every weapon full, full health and armour, and it is **never saved**. Tap MISSIONS TEST and the **MISSIONS** list opens: tap a mission and a fresh game starts with it, at its beginning. The list is also on the pause menu (MISSIONS) to play another. While one runs, the same list has the **test helpers** - restart it, jump to any step (set up as if the steps before were done), replay any of its cutscenes, stop it - and the step's number, word and checks (how far ahead the target is, when it is gone) show in the bottom-left corner.

- **A mission** starts by its giver: walk up to them on foot and tap **START MISSION** (or E). It runs step by step, each step's words at the top of the screen (big for a moment, then small), the lime guide line and a green arrow over the target (both hidden while a cutscene or a dialogue plays). The mission's people and vehicles stay however far you go.
- **Dialogue**: the game waits; the speaker's portrait (the owner's picture from `img/chars/`, or a silhouette with their letter until it comes) and a bubble in their colour, the words appearing letter by letter with the speaker's own mumble. Tap the bubble (or E, Space, Enter) to show the rest of the line, again for the next one.
- **Cutscenes** play by themselves in the real city, letterboxed, the camera from above in the shot list's words (WIDE, CLOSE, FOLLOW, OVERHEAD, FIXED, PAN); a shot with a line waits for it to be read. SKIP ends one.
- **No side activities while a mission runs** (modes table: msBlock): rampages (not even found), street races and the ringing phone, the vehicle jobs, the scenic flight, the casino's slots, dice and cage, the night break-ins and the car delivery at the docks are shut, and standing at one says NOT DURING A MISSION; sleeping and saving wait for the end too. Shops, the Pay 'n' Spray and stunt jumps stay open.
- **MISSION FAILED** shows the reason; **MISSION PASSED** the rewards (in MISSIONS TEST only the cash is given - the vehicle, the clothes and what it unlocks come with STORY). PLAY IT AGAIN, MISSIONS or CARRY ON.
- **Quest 01 - HARBOUR FAVOUR** (Marco Vale, Sunset Harbor): the opening at the harbour office; Marco's speedboat at berth two; chase Tito's pink speedboat - he runs out round the bay before making for the jetty in Mercado, steering round boats and off the shore, faster and weaving when you close in; catch him on foot (alive) as he runs his fixed way along the sidewalks (waiting for cars where he crosses), the bag he throws down, lose the police if any, the bag to Marco (who never leaves his door) and the closing. Fails: Tito gets away (300 m on the water, 150 m on foot), his boat sunk or wrecked with him aboard, Tito or Marco killed, the bag in the water, wasted or busted.
- The missions are written from the owner's quest pages (`docs/quests/`, a Word layout that opens in Pages) into the missions table (`js/01x-mission-data.js`: the characters, steps, lines, fails, numbers and rewards; what the people and vehicles do is each mission's script in `js/08zy-missions.js`). Its settings (how fast the words appear, the mumble's loudness, the cutscene timing): `python3 tools/settings_sheet.py missions export missions.numbers`. Which missions are approved and how they join into STORY: `docs/STORY.md`.

## Hangars, warehouses and the storage yard

Ten buildings you can **walk and drive into**, the roof turning see-through while you are inside like the Pay 'n' Spray's (mode `interiors`, both modes; `js/08zx-interiors.js`, the models in `js/10z-interiors.js`): the airport's **three hangars** (HANGAR 1-3, their doors onto the apron), three **port warehouses** (PIER 4 WAREHOUSE, BAYSIDE FREIGHT, HARBOR COLD STORE), three more in the industrial streets (DOCKSIDE MOTOR WORKS, ACME TOOL & DIE, FLATS MACHINE SHOP in Gravel Flats) and the **storage yard** at the port's south-west corner, LOCK-UP STORAGE, with **eight lock-ups** in two rows. Each has a roller door to the street and a side door beside it; on the maps a brown crate.

- **Inside**: containers in the port warehouses, shelving and machines in the works, workbenches and tool chests in the hangars - and **stashes**: cash, a gun or ammo, waiting on the floor (on foot, like any pickup). An emptied stash is full again a game day later.
- **Four rare vehicles**: the **CLASSIC '62** under a dust sheet in lock-up 6, the **RACE BIKE** in the Dockside Motor Works, the **PROTOTYPE** under spotlights in hangar 2 and the **ARMOURED VAN** in Bayside Freight - get in the van and the money in the back is yours. A rare vehicle is **yours** once you drive off (keep it in a garage); lost or left, **a new one is back at its place a game day later**.
- **By day** (7:00-20:00) the doors are up and two workers stand at work inside: take a stash in front of one and you get a star.
- **At night** the doors are down and a **night guard** walks the aisle with a torch and a pistol. **Ram the roller door** (fast enough: it bursts in, and the alarm goes off) or **force the side door** on foot (stand at it: SLIP IN, or E, and hold still a moment). If the guard sees you, the **alarm brings 2 stars** and he shoots. In the morning the doors are mended and locked again.
- **The lock-ups** have no guard: at a lock-up's door, **FORCE** (or E) and hold still - or ram it. An opened lock-up stays open a game day.
- Numbers: the **interiors table** (`js/01w-interior-data.js`; `python3 tools/settings_sheet.py interiors export interiors.numbers`): the opening hours, the workers, how far the guard sees, the stars of the alarm, the speed that rams a door, how long a lock takes, the stashes and their cash, how long until a stash and a rare vehicle are back, the money in the van. The money is also in the economy sheet; the rare vehicles are rows of the vehicles table.

## Stats and 100%

**STATS** in the pause menu (mode `stats`, both modes; `js/08zs-stats.js`) - its button and the pause line show how much of the city you have done, as a per cent. The card has three tabs:

- **100%** - everything findable, each thing counted once, with a bar per group: **safehouses bought** (the nine with a price), **rampages passed** (50 in free roam, 20 in story), **hidden weapons found** (each of the 14 kinds that lie hidden - walking up to its bubble counts, even when you do not take it; one bought, dropped by the dead or from the base's armoury does not), **hidden items found** (health, body armor, the heat reducer - not the one on the road), **races won** (the five fixed street races, the NASCAR race, both drag strips - not random races or test runs), **jobs to level 10** (taxi, paramedic, firefighter, vigilante), **cars delivered** at the docks (10), **Pay 'n' Spray garages used** (each once) and **unique stunt jumps** (20). 122 things in free roam; the per cent is the things done out of all of them, rounded down, so 100% means every one. When only a few are left in a group, it says which (*TO GO: BRIDGE DASH, SANDBAR STRIP*). 
- **STATS** - time played, cash, kills and cops killed, cars stolen (once per car; not your own from a garage), distance on foot and driven, top speed, the most wanted you have been, busted and wasted, races won, rampages passed, cars delivered, crushed and tuned, resprays, safehouses.
- **RECORDS** - the best time on each fixed street race, the NASCAR race and its best lap, each drag strip and the fastest trap speed, a ✓ on every race you have won; and your best level in each job.

**The reward at 100%**: health and body armor go up to **200** for the rest of the saved game (you are healed to the top there and then, and again each time you sleep), and a one-of-a-kind **gold AUREA** - a supercar in gold with black stripes, gold rims and gold underglow, a glint running over it, 355 km/h - waits in the dearest safehouse you own that has a free garage bay or space (no free one: it waits until there is). It is never in traffic, parked about or for sale; tune it, paint it or crush it like any car. Lost - wrecked, crushed, sunk, or left somewhere when you save - a new one is back in your garage 5 minutes later.

Saved games keep the counters (an older save counts the weapons you have as found). Numbers: the stats table, `js/01t-stats-data.js` - which groups count, the job level and the deliveries that count, the reward's health and armor and how soon a lost gold car comes back: `python3 tools/settings_sheet.py stats export stats.numbers` / `... stats import stats.numbers`; the car itself is the vehicles table's `gold` row.

## Clothes shops

Ten clothes shops, each with its own range, take shop buildings spread over the city (always the same ones, clear of the six weapon stores). Each is a coat hanger in its colour on the minimap and the city map; its name over the door (and on a blade where the front faces east or west), at the door a ring of light and a turning shirt. Walk up on foot and tap **SHOP** (or press **E**).

- **Five pieces**: hat, glasses, top, bottoms, shoes - each bought and worn on its own, mixed as you like. You start in a yellow T-shirt, dark jeans and old sneakers, no hat, no glasses.
- **Trying on**: inside, your figure turns slowly on a lit turntable next to the list (the ring and the light behind it in the shop's colour). It is a detailed one, not the small blocky figure of the street: a shaped body, hands, a face with eyes, brows, nose and mouth, ears and hair, and the clothes with their details - collars and buttons, the Hawaiian shirt's flowers, the check, the camouflage, the suit's shirt and tie, the hoodie's hood and pocket, the biker jacket's zip, the jersey's number on the back, the hi-vis bands, belts, seams, ripped knees, laces and soles. It stands at ease, its arms swaying and its head looking about (mode: `shopFigure`; off, the blocky figure). The safehouse wardrobes show it too. Tap a piece and the figure tries it on (*TAP AGAIN TO BUY*); tap it again to buy it, and you wear it at once. Not enough cash: it says how much you are short.
- **Your wardrobe**: what you have bought is yours. The **WARDROBE** tab at any clothes shop lists it, with NO HAT and NO GLASSES; putting something on is free (tap, tap again). Clothes are only changed at the shops. They are saved with the game and kept when you are wasted or busted.
- **New clothes lose the police**: change at least one piece while no cop saw you go in and the police lose you - up to 3 stars; at 4 or 5 the level drops to 3. Seen going in, it does nothing.
- **The shops**: SUNSET SURF (beachwear), NEON THREADS (80s pastel suits, aviators), BLOCK KINGS (streetwear), VELVET & GOLD (luxury suits, fedoras), IRON & INK (biker leather), LONE STAR (western), FLEX ATHLETICS (sportswear), HARD HAT (workwear), ARMY & NAVY (surplus), MIDNIGHT (punk and club wear) - 87 pieces from €20 to €1,500. The space center's clothes are not sold: they come with the story.

Everything is in `js/01n-clothes-data.js`: the shops (name, colour, what they sell), every piece (name, shop, slot, style - the shape it is drawn with -, two colours, price) and the two police settings. `tools/clothes_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back, checking every value (a style must fit its slot; new rows are new pieces or shops); the prices are also in the economy sheet.

```
python3 tools/clothes_sheet.py export clothes.numbers      # or clothes.xlsx
python3 tools/clothes_sheet.py import clothes.numbers [--dry-run]
```

## Rampages

Fifty rampages (kill frenzies) are hidden around the city - twenty in both modes and thirty more in free roam only (mode: `moreFrenzies`; the rampage table's *Modes* column) - in alleys, yards, parks and parking lots near a street: a white skull facing you over a red ring, with the rampage's weapon circling it. The first is close to where you start; the others are spread as far apart as they can be. Come near one and it is **found**: from then on it is a skull on the minimap and the city map (green once you have passed it).

On foot at a skull a **RAMPAGE** button appears by you (or press **E**). It opens the rampage's screen - the goal, the weapon, the time and the reward - and **START RAMPAGE** begins it. You cannot start one while you are wanted: lose the police first.

During a rampage:
- the weapon is in your hand and stays there: the weapon wheel and the number keys are locked, and you cannot get into a car;
- it has endless spare ammo (the HUD shows ∞), but reloads still take their time;
- the police look the other way: no crime adds heat;
- a red bar at the top counts the kills or wrecks and the time left (the last ten seconds blink and beep);
- people (for a people rampage) or vehicles (for a vehicle one) are brought in around you, out of sight, so there are always about 18 people or 10 vehicles nearby. Police officers count as people; a vehicle counts when it catches fire.

Reach the count in time and the rampage is **passed**: the first time you get the cash and keep the weapon with its basic load (a full magazine and the spare rounds it comes with). A passed rampage can be played again for fun, without the reward. Running out of time or dying fails it, and a failed or replayed rampage gives you back the weapons you had before. Saved games remember which rampages you have found and passed (the pause menu shows how many); you cannot save during one.

| # | Rampage | Weapon | Goal | Time | Reward |
|---|---|---|---|---|---|
| 1 | Knuckle Sandwich | Fists | kill 8 people | 2:00 | €1,000 |
| 2 | Batter Up | Baseball bat | kill 15 people | 1:30 | €1,500 |
| 3 | Pistol Whip | Pistol | kill 12 people | 2:00 | €1,500 |
| 4 | Sharp Practice | Knife | kill 12 people | 1:30 | €1,500 |
| 5 | Fore! | Golf club | kill 10 people | 2:00 | €1,500 |
| 6 | Chop Shop | Machete | kill 15 people | 2:00 | €2,000 |
| 7 | Six Feet Under | Revolver | kill 18 people | 2:00 | €2,000 |
| 8 | Hubcap Hunter | Pistol | wreck 4 vehicles | 2:30 | €2,000 |
| 9 | Spray And Pray | SMG | kill 20 people | 2:00 | €2,500 |
| 10 | Scrap Metal | SMG | wreck 6 vehicles | 2:30 | €2,500 |
| 11 | Buckshot Boulevard | Shotgun | kill 16 people | 2:00 | €2,500 |
| 12 | Body Shop | Shotgun | wreck 8 vehicles | 2:00 | €3,000 |
| 13 | Long Shot | Sniper rifle | kill 12 people | 2:00 | €3,000 |
| 14 | Belt Fed | Machine gun | kill 30 people | 2:00 | €4,000 |
| 15 | Rush Hour | Machine gun | wreck 10 vehicles | 2:00 | €4,000 |
| 16 | Pineapple Party | Grenade | kill 12 people | 2:00 | €3,500 |
| 17 | Traffic Calming | Revolver | wreck 6 vehicles | 2:30 | €3,500 |
| 18 | Demolition Derby | Pipe bomb | wreck 6 vehicles | 2:30 | €4,000 |
| 19 | Fireworks | Rocket launcher | kill 22 people | 2:00 | €5,000 |
| 20 | Wrecking Crew | Rocket launcher | wreck 10 vehicles | 2:30 | €6,000 |

A bot that aims perfectly but walks badly played every rampage in a headless browser while they were tuned; it passed them using roughly a fifth to two thirds of the time. Grenades are not used against vehicles: a grenade thrown at a car bounces off it and goes off too far away to do much damage.

The rampages are `js/01h-rampage-data.js` - name, weapon, target (people or cars), how many, the time and the reward - and `tools/rampage_sheet.py` exports them to Apple Numbers or Excel (one row per rampage, Weapon and Target as pop-up lists) and reads an edited copy back, checking every value:

```
python3 tools/rampage_sheet.py export rampages.numbers      # or rampages.xlsx
python3 tools/rampage_sheet.py import rampages.numbers [--dry-run]
```

The first row is the rampage nearest to where you start, so make it an easy one. The game picks the places itself.

## Economy

Your score is your cash. Killing and destroying pay nothing by themselves - money is something you pick up:
- **Cars**: every car you steal or hijack has **€4-120** inside, found when you get in (once per car).
- **The dead** drop a cash stack by the body - **€1-30**, police officers **€20-80** - and the weapon they carried (officers and foot cops: their pistol). Whoever killed them. Walk over it; it blinks for its last 10 seconds and vanishes after a minute.
- **Cash stacks** of **€100-300** lie on sidewalks around town, **10** at a time, not on the maps; one taken comes back somewhere else.
- **Rampages** pay €1,000-6,000 the first time you pass them.

What it costs: the fine at 1 star (€250), bail when busted and the hospital bill when wasted (10% of your cash each), and the stores (*Items and stores*).

Every amount is in `js/01i-economy-data.js` - one value, or a random amount from *min* to *max* - together with how many stacks lie in town and how long drops last. `tools/economy_sheet.py` puts every price in the game into one spreadsheet: column A the action or the commodity, column B its price (or, for a random amount, the least), C *Up to* (the most), then the unit, a note (such as which stores sell it) and a grey key. Sections: earnings, rampage rewards, fines and bills, store health and armor, store weapons, store ammo. Each price still lives with what it belongs to, and an import writes it back there, changing only that number: what deeds pay in `js/01i-economy-data.js`, rampage rewards in `js/01h-rampage-data.js`, the fine, bail and hospital bill in the police table (`js/01b-police-data.js`), health and armor in `js/01g-shop-data.js`, weapons and ammo in the weapon table (`js/01f-weapon-data.js`). So the weapon, rampage and police sheets and the economy sheet can be used side by side. An empty price for store goods means it is not sold.

```
python3 tools/economy_sheet.py export economy.numbers      # or economy.xlsx
python3 tools/economy_sheet.py import economy.numbers [--dry-run]
```

## Armed people

About one passer-by in four or five carries a weapon - a pistol (10%), a revolver (2%), an SMG (1%), a baseball bat or a knife (3% each), a machete or a golf club (2% each); the weapon table's row *Carried by people (%)* sets which and how many (melee weapons and guns that fire bullets on tap or hold; at most 100% together). You only see it when they use it:
- hurt them, pull them out of their car, or kill someone within about 13 m of them, and they **fight back** instead of running - unarmed people still run;
- a gun is fired at you the way the police fire, from a clear line of sight, keeping a little distance; in a car they shoot the car. The hit chance falls the farther you are (the police table: 35% close up down to 8% at full range); each hit does the police's damage times the gun's damage against the pistol's - a revolver about twice as hard but about 1.4 times slower, an SMG in bursts of 3 to 5 bullets that each do about half (police table, group *Armed people*: the time between shots and the burst size);
- a melee weapon is swung when they reach you, softer than you hit (30% of the weapon's damage, at most 15), at under half your pace; a moving car they keep away from;
- they give up when you get 58 m away or after 45 seconds.

Gunfire alone only makes people run. Killed, they drop their weapon in its colour bubble: a melee weapon you do not have yet, or a gun with one magazine (a pistol +7 rounds if you have one already). People brought in for a rampage carry nothing, so rampages play as tuned. Their shots and swings add no heat to you; what you do to them does.

## Layout

`index.html` loads the scripts in order. They are plain scripts that share globals, so keep the order.

| File | Contents |
|---|---|
| `js/00-map-data.js` | the map: land, grass and sand polygons, road graph, buildings, lots, alleys, yards, landmarks, props, districts (generated) |
| `js/01-config.js` | constants, helpers, `$()` |
| `js/01b-police-data.js` | the police table: every police number in everyday units (edit by hand or with `tools/settings_sheet.py police`), converted to game units as `COP` |
| `js/01c-vehicle-data.js` | the vehicle table in everyday units (edit by hand or with `tools/vehicle_sheet.py`), converted to `CAR_TYPES`; picking a vehicle type by weight |
| `js/01d-sky-data.js` | the day, night and weather settings in everyday units (edit by hand or with `tools/settings_sheet.py sky`), converted to `SKYP` |
| `js/01e-radio-data.js` | the car radio stations: name, frequency, style, colour, music file; radio volume |
| `js/01f-weapon-data.js` | the weapon table in everyday units (edit by hand or with `tools/weapon_sheet.py`), converted to `WEAPONS`; drafts are left out |
| `js/01g-shop-data.js` | the hidden items (health, body armor, heat reducer) and the stores - six in town and the black market at the docks (`at`: a district): what each sells |
| `js/01h-rampage-data.js` | the fifty rampages: weapon, target, count, time, reward, modes (edit by hand or with `tools/rampage_sheet.py`) |
| `js/01i-economy-data.js` | where cash comes from (cars, the dead, stacks in town; amounts and ranges, drop time); every price in the game is in `tools/economy_sheet.py` |
| `js/01j-mode-data.js` | the game modes (free roam, story) and which features each has; `feat(id)` |
| `js/01k-airport-data.js` | the airport settings in everyday units (edit by hand or with `tools/settings_sheet.py airport`), converted to `AIRP` |
| `js/01l-places-data.js` | the airport gates, the military base, the port, the lunapark, the space center and the spray garages in everyday units (`tools/settings_sheet.py places`), converted to `PLC` |
| `js/01m-streets-data.js` | traffic lights, drivers, pedestrians, sirens, the heat reducers on the road and in the alleys, the visitors and the city sound, in everyday units (`tools/settings_sheet.py streets`), converted to `STR` |
| `js/01n-clothes-data.js` | the ten clothes shops, every piece of clothing (slot, style, colours, price) and the clothes' police settings (`tools/clothes_sheet.py`) |
| `js/01o-jobs-data.js` | the vehicle jobs: dispatch points, levels, the clock, pay, rewards, nitro (`tools/settings_sheet.py jobs`) |
| `js/01p-races-data.js` | the races: phone booths, street races and their five fixed routes, the NASCAR race, the drag strip, results (`tools/settings_sheet.py races`) |
| `js/01q-safehouse-data.js` | the ten safehouses (kind, district, price, cars, floors) and their settings (`tools/safehouse_sheet.py`), `SAFE`, `SAFE_HOUSES` |
| `js/01r-buildings-data.js` | the 160 unique buildings (name, kind, wall and neon colours) and where they go (`tools/buildings_sheet.py`), `UNIQUE_TABLE`, `UNIQ` |
| `js/01s-parks-data.js` | the 60 parks, squares and plazas (name, kind, colour) and how the parks are picked (`tools/parks_sheet.py`), `PARKS_TABLE`, `PARKS` |
| `js/01t-stats-data.js` | what counts toward 100% and the reward at 100% (`tools/settings_sheet.py stats`), converted to `STS` |
| `js/02-audio.js` | synthesized Web Audio (including the rain and thunder) |
| `js/02c-music.js` | the cutscenes' music, played by the game itself: a sequencer (drums, bass, pads, arpeggio, lead) and the track *Neon Skyline* |
| `js/02d-city-sound.js` | the city's own sound: traffic hum, horns and brakes, people's chatter and screams, birds, crickets, gulls, surf, wind and far-off sounds |
| `js/02b-radio.js` | the car radio: plays the station of the car you are in, live position, tuning, fading, the station name |
| `js/03-input.js` | keyboard, mouse, touch |
| `js/04-world.js` | spatial hash, collision with turned boxes, raycast, distance-to-shore field, bridge rails, driveway gates, road graph queries and shortest paths, district building styles |
| `js/05-entities.js` | entity and effect data |
| `js/06-gameplay.js` | state, heat and wanted level, combat, enter/exit vehicles |
| `js/06b-melee-throw.js` | melee swings (arc hits, knockdown, people sent flying), throwing bombs (the aim - a little stick on FIRE for touch, a slingshot for the mouse - with its arc and ring, flight, bounces, fuse, blast), dropping them from a car |
| `js/07-vehicles-traffic-police.js` | car physics, lane following traffic, road routing for the police |
| `js/07b-traffic-lights.js` | traffic lights: the junctions, light groups and timing, the rules for drivers (stop line, amber, giving way, people crossing), sirens and pulling over, people round the corners and over the crossings, the signal heads |
| `js/08l-clothes-shops.js` | the clothes shops: placement, door markers, the shop screen with the turning figure, trying on, buying, the wardrobe, losing the police |
| `js/08m-car-delivery.js` | car delivery at the docks: the wanted car, the board, the export bay, the crane loading it on the car carrier, the pay |
| `js/08n-vehicle-jobs.js` | the vehicle jobs: taxi ranks, fire stations, dispatch markers and the START card, levels, the clock, fares, patients, fires, criminals, rewards, nitro, the job's markers and map dots |
| `js/08o-races.js` | the races: the phone booths and their calls, routes along the streets, the race card, rivals' driving, checkpoints, laps, the drag strip's lights and its EXIT gates, results, records, the race's markers and map dots |
| `js/08p-guide.js` | the lime guide line: where to (a race's start or route, a job's nearest target, the export bay), the shortest way by road, the line on the streets and the maps |
| `js/08q-spray.js` | the Pay 'n' Spray garages at work: who the door opens for, the colour card (the kind's paints, any colour), the respray and repair, losing the police, the painter's walk, the door, roof, lamp and sign, the map icons |
| `js/08s-safehouses.js` | the safehouses at work: the BUY card with its picture, GO IN, the doors of the houses, coming in unseen, SLEEP and the save slots, the wardrobe, the weapon stash, kept cars (spawned when you come near, put away when you leave), saving, the roofs, doors and markers, the map icons |
| `js/08t-sideview.js` | the side-on view inside a tower: floors, doors, stairs, the elevator and its panel, neighbours, the clerk, your flat, walking and the buttons, drawn on its own canvas |
| `js/08w-showroom.js` | Sunstrip Motors: the BUY button by a turntable, the car card (colours, where to deliver it), buying, the map icon |
| `js/08zr-roadblocks.js` | police roadblocks: where one goes on the road ahead, the cars across the street and the cops behind them by wanted level, how they hold their places and shoot (pistols, SMG bursts, rifles), taking it down |
| `js/08zp-prison.js` | Iron Key: the ferry (shuttling, boarding over the ramp, walking its deck, skipping the crossing, not while wanted), the tower and gate guards, the prisoners in the yard, the restricted area and the alarm, being let out when busted, the gate, the searchlights, the map icons |
| `js/08zu-casino.js` | the casino strip at work: the bouncers and the dress code, the slot machines' and the dice table's card, trouble and the guards, robbing the cashier's cage, the club's music and its lights, the people on the strip at night, the map icons |
| `js/08zy-missions.js` | the missions: MISSIONS TEST (the kit, the list, the helpers), the mission engine (steps, the objective, the target, dialogue with portraits and mumbles, cutscenes from shot lists, fails, the end card) and each mission's script (Quest 01) |
| `js/08zx-interiors.js` | the hangars, warehouses and lock-ups at work: the doors by the clock, ramming and forcing them, the workers and the night guard, the alarm, the stashes, the rare vehicles, the crates on the maps, saves |
| `js/08zw-stunts.js` | the stunt jumps at work: the launch off a stunt ramp, slow motion in the air, the landing judged, the bonus, the notes, 100%, the ticks on the big map |
| `js/08zv-marina.js` | the water: boats held on it and under the bridges, wrecks sinking, swimming, a sinking car's seconds to get out; Sunset Harbor at work - moored boats and their owners, the boat shop and your berths, boats out on the bay, the police boat, the anchors on the maps |
| `js/08zt-site.js` | Skyline One at work: the tower's decks and ramps (heights for cars and people), the ramps and mounds that throw a car, the launch over the avenue and the roofs a flying car comes down on, hard landings, the workers and the night guard with his torch, the machines and the dump truck's driver, the deck pickups, the gate, the fading decks and the cranes' and machines' movement |
| `js/08zs-stats.js` | stats and 100%: the counters (steals, distance, top speed, cops, busted and wasted, finds, races won, sprays), the 100% list, the STATS card, the reward - health and armor up to 200 and the gold car in your best garage, back when lost - and the saved counters |
| `js/08z-salvage.js` | the junkyard: the spot and what it pays, the crane and the crusher at work, the cube pile, the police car crime, the guard dog (a target for bullets, blasts and swings), the map icon |
| `js/08y-tuning.js` | the tuning workshop: where each part goes on each model, the parts on the car, the door and the bay, the card (LOOKS, PARTS, PERFORMANCE), the mechanic's work, the tuning kept with the car |
| `js/08x-visitors.js` | visitors at the Colony and the cement works: a car from the traffic turns into the site's street, parks in a free bay, its driver walks in; later someone walks out and drives it away |
| `js/08v-flights.js` | the check-in booth on the terminal's forecourt (the FLIGHTS button, the board) and the scenic flight: its shots, the route round the city, the window view, rain on the glass; the flight's rewards (the aviator cap, faster on foot for a day) |
| `js/08u-police-heli.js` | the police helicopter: coming in, the searchlight, the machine-gun bursts and pipe bombs, blind while you are inside a building, brought down by the rifle or the AA launcher, the crash and the wreck; its model and map icon |
| `js/08r-heavy-guns.js` | the police tank's rockets at the top wanted level and the APC's turret machine gun (yours and the police's): turrets turning to the target, belts and reloads, bursts, hits |
| `js/08-pedestrians-pickups-spawning.js` | sidewalk pedestrians, pickups, spawning |
| `js/08b-police.js` | the police: who sees you, crime reports, the search, sending cars, police driving, cops on foot (stop order, arrest, shooting, through the doors into buildings), busted and wasted, starting again |
| `js/08c-services.js` | trash truck stops at bins, ambulance and fire engine calls, the hidden tank, the tank's rockets |
| `js/08d-weapon-pickups.js` | hidden weapons, ammo and items: the hiding places off the streets, melee in fixed places, guns, ammo and items at random and coming back elsewhere, picking up, the coloured bubbles |
| `js/08e-shops.js` | the stores: which buildings, the markers at their doors, the SHOP button, the store screen and buying |
| `js/08f-rampages.js` | the rampages: where they are, the skulls, found and passed, the RAMPAGE button and screen, the locked weapon, the clock, counting kills and wrecks, people and vehicles brought in, the reward |
| `js/08g-armed-people.js` | armed passers-by fighting back, and the loot the dead drop (cash and their weapon) |
| `js/08h-paramedics.js` | paramedics: the stretcher team, up to two bodies per trip, the drive to hospital, delivering at the door; hit, they drop it, run and come back |
| `js/08j-places.js` | guard posts and soldiers, gate barriers, the base's warning and alarm, its armoury, motor pool and helicopter, the lunapark's visitors, things that take bullets (targets) |
| `js/08k-ships.js` | the port: cargo ships arriving and leaving, mooring, the gantry cranes and their work, ship icons on the maps |
| `js/08i-planes.js` | the planes: the gates, one movement a minute, landing, taxiing, push back and take-off routes, running over things, damage, explosions, wrecks, falling; their models, shadows, lights and map icons |
| `js/09-render-core-buildings.js` | three.js setup, facade atlases, building meshes |
| `js/10-render-city-map.js` | sea, coast, roads, sidewalks and markings, parking lots, bridges, parks, beaches, street lights and furniture, gates, streaming, see-through fade |
| `js/10b-render-landmarks.js` | landmarks and props (the Colony Hotel, its ring drive and its park on the beach, Bayfront Park, TV tower, Twist, Crown, Sail, Bay Wheel, stadium, estate, mall, lighthouse, airport and runways, studio, cranes, containers, planes, gas stations, plazas, courts) and their collision boxes |
| `js/10c-render-fill.js` | the low street-front buildings, merged per area, with their back doors and fire escapes, and the see-through hole over the player |
| `js/10d-render-clutter.js` | back alleys, yards, promenades, quays, park paths and the apron, and everything lying about in them; box piles, bag heaps and wheelie bins (also used on the sidewalks) |
| `js/10e-render-services.js` | hospitals and police stations: the roof cross and lettering, signs, lamps, checkered band, flag |
| `js/10g-places.js` | the base, the space center, the port's yards and the lunapark's gate, stands, village, piazza and booths: models, collision boxes, ground, roads and markings, the barriers' booms |
| `js/10h-lunapark.js` | the rides: coaster tracks and trains, the Ferris wheel, flume, drop tower, swings, carousel, pirate ship, sky ride, park train |
| `js/10i-speedway.js` | the speedway: the oval (and `ovalAt` / `ovalU` along it), walls, grandstand, garages, race booth, pylon; the two drag strips (`stripPt` / `stripAlong` / `stripSide` along and across them) with their fences, their EXIT gates, start lights, timing boards and booths; ground and markings, the map picture |
| `js/10j-spray-garage.js` | the spray garages: which buildings (well spread, the first near the start), their walls and door as solids, the workshop model - bay, gantry, shelves of paint, bench, lift, the roof that fades, the roller door, the painter |
| `js/10l-safehouses.js` | the safehouses: the towers chosen (their door on the street, reserved spaces in the parking lane), the house plans (walls, doors, rooms, furniture, garage bays, the bed, wardrobe and safe), their solids and models, the FOR SALE signs, door rings and painted spaces |
| `js/10k-carpark.js` | the lunapark car park: decks, ramps and the heights (`z`) they give, walls by height, the barrier and booth, parked cars on every deck, the model by level and the decks above you fading, its map icon |
| `js/10m-grove.js` | the palm grove by the car park: the palms and rocks (placed once, solid, streamed in pieces), the pier with its T-head, the moored boats and their bobbing |
| `js/10n-unique.js` | the unique buildings: the lots chosen (size, district, the beachfront, spacing), the solids where a model leaves its lot open, the eleven model families with their neon names |
| `js/10o-unique-more.js` | the 40 unique buildings of the city's own kinds: skyscrapers, condo towers, schools, the arena (and the park it takes), parking garages, gas stations, museums, civic buildings, supermarkets, car washes, bowling alleys; the pylon signs |
| `js/10p-parks.js` | the 60 parks, squares and plazas: the plazas' and courts' rows, the parks' lawns, each design's model and solids, the name signs |
| `js/10q-forests.js` | the woods on the big lawns and the space center's scrub: which lawns, the patches (a fixed noise), the trees |
| `js/10t-salvage.js` | the junkyard: where the wreck stacks go, the fence and the solids, the model - ground, fence, gateway and sign, the spot, the stacks, the crusher and its press, the crane (tracks, the turning house and boom, cable and magnet), the shack, the kennel, the floodlights |
| `js/10u-prison.js` | Iron Key's models and solids: the island's rocks and scrub, the wall, the towers and their searchlights, the cell blocks, the office, the yard and court, the gate, the path and the pier; the ferry pier on the Palm Heights shore; the ferry; the ferry's route |
| `js/10w-casino.js` | the casino strip's solids and models: the ROYAL FLAMINGO (walls, door, canopy, slot rows, dice tables, cage, roof with the neon flamingo), THE PULSE (walls, door and rope, DJ, bar, sofas, the dance floor, the light rig, roof with the heartbeat), the bars' neon across the avenue, the people's places |
| `js/10z-interiors.js` | the hangars, warehouses and the storage yard: which buildings, their walls and doors, the racks and containers inside, the models with roofs that fade |
| `js/10y-stunts.js` | the stunt ramps: their jumps (with Skyline One's launch ramp as the twentieth), the clear ground round them, the model |
| `js/10x-marina.js` | Sunset Harbor's solids and model (the office and lighthouse, the sunset sign, the piers, the berths, the fuel dock) and the eight jetties round the coast |
| `js/10v-site.js` | Skyline One's solids and model: the hoardings with their signs, the broken panel and the gate, the tower's decks, ramps, columns, barriers and scaffolding (a group per deck so they can fade), the launch ramp, the yard's ramps, mounds, pit and piles, the site office, the cranes |
| `js/10s-showroom.js` | the showroom: walls, doors with bollards, turntables, counter, the tuning workshop (bay, tool chests, tyres, rims, lift, engine stand, its own roof, roller door, lamp and mechanic) and stock yard; the model, the cars on show (turning), the roofs that fade |
| `js/10r-factory.js` | the cement works in Gravel Flats: its solids and fence, the model (hall, chimneys, tower, kiln, silos, piles, trucks), the smoke and the blinking lights, the floodlights |
| `js/10f-airport.js` | the airport: airfield, runway and taxiway markings and lights, apron lines, terminal with jet bridges, hangars, tower, booths, windsock, the fence (breaking and mending); the terminal's hall inside, under a roof that the scenic flight lifts off |
| `js/11-render-dynamic-meshes.js` | vehicle models (one per body, drivers inside under the roof; the boats from their hull outlines), people, pickups |
| `js/11b-weapon-models.js` | small 3D models of every weapon, an ammo box and the items (health, armor, heat reducer), for your hand, the pickups and the stores |
| `js/11c-clothes-models.js` | the clothes drawn on the figure: hats, glasses, tops, bottoms and shoes in their styles and colours |
| `js/11d-figure-hd.js` | the detailed figure for the clothes shops and wardrobes: the rounded body, face and hair, the clothes' prints painted on canvas, collars, buttons, belts, shoes, hats and glasses |
| `js/12-render-effects.js` | particles, boats' wakes, tracers, decals, skid marks, score pops |
| `js/12b-rockets.js` | rockets: flight, wandering after the target, hits, the glowing motor and the smoke trail |
| `js/12c-blast.js` | explosions: fireball, flames, smoke, debris, and throwing cars, people, pickups and props |
| `js/12d-sky-weather.js` | the clock and the weather: light, sun and moon, fog, sea, window and neon glow, street lights and headlights, wet roads, rain and splashes, lightning; grip and police sight |
| `js/12e-smash.js` | street junk under wheels: boxes, bags, crates, pallets, phone boxes, planters and bushes burst, bins, hydrants (with a fountain), benches, parking meters and beach umbrellas are knocked flying, shredding in blasts, putting it all back later |
| `js/12f-homing.js` | the AA launcher: what it can lock onto, its rocket swerving about for 4 s before it strikes, the blast in the air |
| `js/12g-trees.js` | every tree: registered where it stands (instanced or inside a model), knocked down by vehicles and blasts, the fall, standing again later, cover from the helicopter's light; the autumn colours and the leaves drifting down |
| `js/12h-fireworks.js` | the fireworks at midnight: a show over a random park, plaza or beach - rockets, bursts, whistles and bangs |
| `js/13-render-frame.js` | per-frame render |
| `js/14-hud-minimap.js` | HUD, minimap and city map (with the search area), district name |
| `js/11e-weapon-hd.js` | the detailed weapon models for the weapon grid, rendered once into pictures |
| `js/14b-weapon-wheel-scope.js` | the weapon grid (and the old wheel) and button pictures, aiming through the sniper scope and the rocket sight (zoomed view, blurred or darkened surroundings) |
| `js/15-game-flow-loop.js` | setting up a new or saved game, play, dying, starting again or game over, main loop |
| `js/15c-cutscene.js` | cutscenes: shots one after another, the free camera, black bars, captions, fades, the skip button |
| `js/15b-menus-saves.js` | the title, New game choices (`OPT`), pause menu, help pages and keys in the menus; saved games: autosave, slots, save files |
| `js/16-octagrid-map-preview.js` | loads an Octagrid export and shows it in 3D (look only) |
| `js/main.js` | starts the game; must load last |

## Octagrid preview

*City file preview* on the title menu reads an `octagrid-city` JSON export from the Octagrid city builder and shows it with the full building detail. It is a preview only: the imported map is not playable yet.
Not yet used by the preview: `bounds`, `edges` (city limit and edge style).

## Next steps

What comes next, in order and with every detail agreed with the owner (done: the Pay 'n' Spray, the fixes, the Colony on the beach, the lunapark car park, the safehouses, the sounds of street junk and of people, the palm grove, the Colony's ring drive and valet, 120 unique buildings, the showroom, the tuning workshop, the junkyard at the docks, roadblocks, stats and 100%, Iron Key (the prison island), Skyline One (the construction site), the casino strip, the marina with boats, the stunt jumps; next: new places - hangar and warehouse interiors - world events, flying and people with real lives): **`docs/PLAN.md`**. The list below is the older, rougher one.

1. Make Octagrid exports playable: they already have roads and building outlines, so they can be turned into the same map format as `js/00-map-data.js`.
2. Honor `bounds` and `edges` from the export.
3. Convert the scripts to ES modules once the globals are untangled.
4. Police: roadblocks and the helicopter are built; spike strips are not planned.
5. **New places, agreed with the owner, to build next** (each will be asked about in detail first; the spray garages are built - see Pay 'n' Spray):
   - *Car showroom and your garage*: built - Sunstrip Motors, the tuning workshop behind it, and the safehouses' garages.
   - *Prison island*: built - Iron Key (see Iron Key, the prison island); breakouts come with the story.
   - *Construction site*: built - Skyline One (see Skyline One, the construction site).
   - *Casino and nightclub strip*: built - the ROYAL FLAMINGO and THE PULSE (see The casino strip).
   - *Marina with boats*: built - Sunset Harbor, boats, swimming and the jetties (see Sunset Harbor, boats and swimming).
   - *Junkyard and car crusher*: built - Dockside Salvage (see The junkyard).
6. **Side jobs, world events and activities, agreed with the owner** (each will be asked about in detail first; the vehicle jobs, street races and the speedway with its drag strip are built - see Vehicle jobs and Races):
   - *Robberies and the cash van*: robbers run out of a store to a getaway car; an armoured cash van to ram open for its money bags.
   - *Fires, crashes and blackouts*: burning buildings with fire engines racing there, pile-ups with tow trucks, storm blackouts with the traffic lights flashing amber.
   - *Scheduled moments*: a rocket launch at the space center, a plane in trouble at the airport (the fireworks at midnight are built).
   - *Stats and a 100% screen*: built - see Stats and 100%.
7. **Building interiors, more of them** (agreed with the owner; each will be asked about in detail first): both kinds now exist - top-down with a see-through roof (the Pay 'n' Spray, the houses) and the side-on view with hallways, stairs and elevators (the towers). The top-down kind now also has the hangars, warehouses and the storage yard (see Hangars, warehouses and the storage yard); more of either kind come with the story.
8. **Flying, later** (agreed with the owner; will be asked about in detail first - which aircraft, free roam or story, how hard to fly): a new vehicle type that leaves the ground, seen from above with its shadow on the ground and the camera pulling back as it climbs. Ideas to choose from:
   - *Helicopters*: the military helicopter on the base's helipad made flyable; a police or news helicopter on a rooftop pad; hovering, landing on roofs and pads.
   - *Planes*: steal one of the airliners at the gates or a small plane from a hangar, take off from the runway, land again on it (or crash).
   - *Seaplane*: at the marina, taking off from and landing on the water.
   - *Smaller ones*: a parachute to jump out with, a jetpack or a hang glider from the tall towers.
   - Open points: the police chasing you in the air (their own helicopter, at 4-5 stars), what you can do from up there (shoot, drop bombs), running out of fuel, and the airport's own plane movements around you.
9. **People with real lives, later** (agreed with the owner; to be asked about in detail first; the details so far are in `docs/PLAN.md`, Later): every passer-by and driver lives somewhere and goes through a day that makes sense - out of their front door to their own car, driving to work, a shop, the gas station or the beach, parking and walking in, coming out again later and driving home for the night - going into and out of buildings and getting into, out of and driving cars like the traffic does. The visiting cars at the Colony and the cement works are the first small piece of it.
