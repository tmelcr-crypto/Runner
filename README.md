# Block Runner

Top-down GTA 1 style crime sandbox in neon 3D. Vanilla JS + three.js r128 (loaded from cdnjs). No build step.

Run it: serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or open `index.html` directly.

## Game modes

**NEW GAME** first asks how you want to play: **FREE ROAM** - the city as it is, no story, everything below - or **STORY**, missions told as a story, which is built later and shows as *COMING SOON* until then. Free roam then goes on to its options. A saved game keeps its mode (the save list and the pause menu show it); saves from before the modes are free roam.

Which features each mode has is a table, `js/01j-mode-data.js`: one row per feature - police and wanted levels, hidden weapons, hidden items, the stores, rampages, cash stacks in town, cash in cars, loot from the dead, armed passers-by, hidden vehicles, ambulances and fire engines, paramedics with stretchers, blasts tearing people apart, irregular blood marks, pickups only on foot, planes landing and taking off, the airport gate barriers and guards, the military base, cargo ships and cranes, the lunapark rides, the space center guards, traffic lights and the rules of the road, sirens going through red, the heat reducer on the road, the heat reducers in back alleys, heat reducers taken from a car, the drive-by, grenades in a car, the water cannon, the clothes shops, car delivery at the docks, the Pay 'n' Spray garages - with yes / no for free roam and for story (story has everything for now). The game asks the table before using a feature, and every new feature gets a row. A second sheet holds numbers that differ by mode: story mode hides 30% as many weapons, ammo and items around the city as free roam (`pickups`). What is kept for story mode - like the way into the space center - is written down in `docs/STORY.md`. `tools/mode_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back:

```
python3 tools/mode_sheet.py export modes.numbers      # or modes.xlsx
python3 tools/mode_sheet.py import modes.numbers [--dry-run]
```

## Menus and saved games

- **Title**: *Continue* (the latest save, with when and where it was made), *New game*, *Load game*, *Help*, and *City file preview*. The arrow keys move between the buttons, Enter picks, Esc goes back; everything also works by mouse or touch.
- **Touch screens (phone and tablet)** get a compact HUD: top left your cash (**€12,345**), health and armor as two numbers (pink and blue; armor only while you wear some), and the weapon as an icon with its ammo under it (tap it for the weapon wheel); in a car a radio icon beside it. Stars and the clock sit small under the minimap; getting into a car its name shows there for a moment. There is no car health bar and no ON FOOT box, no sound button (the device's volume) and no MENU on screen: tap the minimap and MENU is in the corner of the city map. In a car you steer with the left thumb; BRAKE and FIRE sit side by side in the right corner for the other thumb, the gear lever above them - no letters: up is reverse (it glows red), down is drive (green), and each vehicle kind has its own lever (a T-handle, a sports knob, a tall truck lever, a military throttle, a handlebar switch; vehicle table). On a phone held sideways the buttons gather in the bottom right corner, clear of the minimap, the stars and the clock: DASH beside FIRE and ENTER / EXIT above DASH; in a car ENTER / EXIT above BRAKE and the gear lever left of BRAKE. The move stick's ring shows right under your thumb. Desktop keeps the full HUD.
- **Touch screens**: the browser's own gestures are switched off - pinch to zoom, double-tap to zoom, the long-press menu, text selection - so the page never zooms in or out or shrinks under your fingers (Safari on iPad and iPhone included). Buttons still take quick taps.
- **New game**: first the mode (*Game modes* above), then the free roam choices, remembered for next time:
  - *Time of day*: dawn, morning, noon, evening (17:30) or night.
  - *Weather*: changing, or always clear, cloudy, rain, storm or fog.
  - *Clock*: a 12, 24 or 48 minute day, or stopped.
  - *Police*: relaxed, normal or tough - more or less heat for each crime, how many cars they send and how soon, and how long they search.
  - *Streets*: quiet, busy or packed - how much traffic and how many people.
  - *Start in*: the usual spot, a random street, or any of the 13 districts.
- **Pause** with Esc, P or the MENU button (top); the game also pauses when you switch to another app or tab. From there: resume, save, load, new game, help, quit to the title.
- **Saving**: an autosave every minute while no police are after you (and when you pause by switching away or quit to the title), plus three slots, each with a small picture of the screen, the time, the weather, the district and the score. You cannot save while you are wanted. A save keeps where you are (and the car you are in), health and body armor, weapons and ammo, the rampages found and passed, score and kills, the clock, the weather and the New game choices. Saves live in the browser (localStorage); *Download save file* and *Open save file* move a game to another device.
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
- **Parks**: tall leafy trees (now and then one in flower), pines, bushes and patches of tall grass; a car flattens a bush.
- **Closed driveways**: traffic never turns into a driveway to a landmark, and a boom gate stops every car except a police car (people walk past it).
- **Real-world speeds** at 12 world units to the metre: people stroll at about 1.4 m/s, run at 5 and sprint at 7 (you are 15% quicker than everyone else); town traffic drives at 40-55 km/h; cars reach 130-260 km/h depending on type, and traffic accelerates, brakes and corners like real cars.
- **Damage you can see**: there is no car health bar (anywhere) - a damaged vehicle shows it. Thin white wisps from the bonnet, then thick grey smoke and sparks, then black smoke, flames from the bonnet and the paint throbbing dull red; once it catches fire it burns all over, flickering orange, until it blows. The paint scorches darker the more damage it takes.
- **Weapons in a car**: getting into an ordinary car puts grenades in your hand (or pipe bombs), to drop out of the window - unless you hold a gun that fires from a car; getting out, you have your weapon back. The tank fires its rockets, the APC its **turret machine gun** and the fire engine its **water cannon** instead - no bombs from those. The APC's turret turns to the nearest target ahead (a wide arc) and fires while FIRE is held: belts of 100 that never run out, each new one taking the machine gun's reload time (the panel under the speed shows BELT 64 or RELOADING 9 S; police table, *Tank and APC*). The water cannon sprays a jet 25 m straight ahead: people and cops in it are knocked down and pushed away (no damage, but it counts like a punch for the police), cars are pushed, and burning cars are put out before they blow (streets table, *Water cannon*). Modes: `carGrenades`, `waterCannon`.
- **Drive-by**: with a pistol, revolver, SMG or machine gun in hand (weapon table: *fires from a car*), FIRE in a car shoots out of the window at the nearest target ahead - a person, a cop, a vehicle - within the gun's range and in sight; with nobody there, straight ahead. A little less accurate than on foot; it uses ammo, reloads, and counts as gunfire for the police. Other guns stay on foot; a grenade or pipe bomb is dropped out of the window. Modes: `driveBy`.
- **Your car drives arcade style**: it picks up about twice as fast as the real car, brakes harder, keeps its grip unless you pull the handbrake to drift, and turns tightly at any speed.
- **Stealing cars**: an empty car is yours after a second and drives off at once. Carjacking takes three seconds of fighting the driver for the wheel while the car lurches and swerves; let go (E again) and you drop off beside it.
- Traffic keeps to its lane, brakes in time for what is ahead and keeps to the traffic lights (below); police take the shortest route by road and only drive straight at you when nothing is in between. People walk the sidewalks and cross at the zebras on the walk signal, and some stroll about the back alleys, the parks, the beaches and the promenades. Nobody walks through anybody: people push each other aside and step round cars, parked or not, and never into a wall.
- The sea is everywhere outside the coast: you can wade a little; a car you drive off the shore sinks (traffic and police stop at the water and cannot be shoved in). Bridges have rails.
- **TAB**, or a tap / click on the minimap, opens the whole city map; the game waits while it is open, and a tap (or TAB) closes it. The district name shows when you enter a new one.
- Only what is near the camera exists as meshes; the low buildings are merged per area into one mesh each. Buildings and landmarks between the camera and the player turn see-through.

`js/00-map-data.js` is generated by `tools/build_city.py` from a reference map image: `python tools/build_city.py <map image> js/00-map-data.js [preview.png]` (needs numpy, opencv-python-headless, scikit-image, shapely 2, pillow). Landmark places, bridges, runways, district names and the start point are set in the script; the random seed is fixed, so the same image always gives the same city. After laying out the blocks it checks every parking lot: a lot that does not open onto a street is turned to face the one it touches, or becomes a garden or a service yard if it touches none, and each lot is tied to the building next to it (`lots[6]`). It then picks the four police stations (buildings with a lot of their own) and the four hospitals, spread over the city (`services`).

The reference image is not kept in the repository, so later changes to the city are made in place: `python3 tools/remodel_city.py [js/00-map-data.js]` (shapely 2) edits the generated file and leaves everything else exactly as it is. It cleared the ground west of the avenue from the hangars to the south shore and laid out the airport there (`airport`: the airfield's grass, the runway, taxiways and links, the apron with its taxi lane and five gates, the terminal, hangars, tower, the fence and its two gates; the service roads and forecourt as yards; the big lot as four lots side by side, `lots[7]` = share of stalls taken); the south shore road that crossed the airfield now runs up the avenue. It turned the mall's peninsula into one park (grass, paths as yards of kind `pk`, a pond cut out of the land so it is real water) with the mall's driveway kept. Version 2 turned Dockside into the port (straight quays with five berths, crane rails, container yards, warehouses, a maintenance yard, a tug pier; `port`), grew Heron Key and laid out the lunapark on it with a car park across the street (`lunapark`), cleared Gravel Flats for the space center (`space`; its police station moved to a building with a lot in Palm Heights), made the peninsula north of the airport the military base (`base`) and added roads from the airport gates. Version 3 put a small speedway on the Palm Heights beach (`speedway`: the oval, the grandstand on ground won from the sea, the paddock with the garages and the race booth by the shore street) and two drag strips (`speedway.strips`, each with its booth: the eighth-mile Palm strip along that beach's east edge and the 600 m Sandbar strip down the east beach with its lane from the avenue; yards of kind `sp`). It also tidied three generated streets that doubled others (one lay over the Seaview street, two ran right alongside a street so their sidewalks and junk stood in the middle of a wide road): the first is gone, the other two now meet the street they shadowed, and the strips left over became lawn and paving. Street furniture and lamps never stand on another street's carriageway. Version 4 moved the Colony to the Sandbar beach (`lm` colony with its size, park, fountain, driveway and lot; two frontage buildings made way for its driveway, and the old Colony lot by the hospital has its own buildings back) and replaced the lunapark's two lots (one half in the water) with a multi-storey car park on ground grown for it (`lunapark.carpark`: footprint, levels, deck height). Each version runs once: `remodel` in the file says which are done.

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

## The military base

The peninsula north of the airport, behind a double fence with razor wire, watchtowers with sweeping searchlights and a barrier that never lifts. Inside: the command building, barracks, the mess, a motor pool with two tanks and three APCs parked in a row, a helipad with a military helicopter, the parade ground and flag, a fuel depot, and the armoury - a fenced yard of weapon racks (rocket launchers, machine guns, sniper rifles, shotguns, SMGs, grenades, pipe bombs) with a fenced ammo store inside it (every kind of ammunition, an earth-covered magazine).

- Get in any way you like - on foot past the barrier, by ramming it, or through the fence in a heavy vehicle - and a **RESTRICTED AREA** warning counts down from 5. Still inside when it ends: the alarm, an instant 4-star wanted level, and the soldiers open fire. Shooting inside, a blast you set off there, or hurting a soldier sets it off at once.
- Sixteen soldiers with SMGs and machine guns: at the gate, the armoury and the towers, and on patrol. They never leave the base; outside, the police take over. A minute away and the alarm stops. A dead soldier is replaced later, out of sight.
- The tanks and APCs can be stolen, the helicopter blown up (it is not flyable). What you take or destroy - weapons, ammo, vehicles, the helicopter - comes back three minutes after you have left.

## The port

Dockside is one container port: straight quays on the east and south shore with five berths, two gantry cranes per berth on rails along the quay, blocks of containers stacked one to four high, an empty-container depot, warehouses, a container freight station and the port office, a maintenance yard with workshops, a tug pier with two tugboats, floodlight masts, bollards and fenders. The streets stay as port roads.

- Three or four ships lie moored. About every two minutes one moves, one at a time: a ship comes up from the sea, swings round, and is pushed sideways onto a free berth; or one is pushed off and sails out to sea, leaving a wake. Ships are solid and nothing hurts them - bullets and rockets stop at the hull.
- While a ship lies at its berth its two cranes roll to it along the rails and lift containers between ship and quay, the trolley running out along the boom, the spreader going down and up.

## The Colony

The Colony Hotel stands on the Sandbar beach east of the start - the white Streamline Moderne hotel of Ocean Drive, three times the size: seven floors, rounded front corners with eyebrow ledges wrapping them, turquoise bands, a stepped parapet, the inverted-T neon sign (COLONY down a pylon that rises over the roof, HOTEL across the bar over the door) and a COLONY HOTEL board on the roof, balconies over the sea side, a pool and loungers on the roof. It faces the avenue across a paved forecourt with a turning circle at the door and a driveway from the avenue; the guests' lot is beside the drive. Behind it, between the hotel and the sea, its own park: lawns, paths, palms, flower beds, benches and lamps round a three-tier fountain. Its free room will be the first safehouse (`docs/PLAN.md`).

## The lunapark

Heron Key grew into the bay to make room for a lunapark in the spirit of the big European-village parks. The street runs round its north and east side, outside the railings; the multi-storey car park is across the street (below). Only people get in: a grand arch with ticket booths and turnstiles (free entry); cars stop at the turnstiles.

- The rides run on their own (you cannot ride them yet): a Ferris wheel with gondolas that stay upright, a wooden out-and-back coaster on a white lattice, a steel coaster with two loops, a log flume with a splash-down, a drop tower, chair swings that fly out as they spin, a carousel, a swinging pirate ship, a sky ride across the park and a little steam train round it. The coaster trains are fastest at the bottom of the drops.
- A German village with half-timbered houses, a clock tower and the Festhaus beer hall, an Italian piazza with a fountain and cafe umbrellas, game booths, food stands (hot dogs, ice cream, pretzels, pizza...), lawns, trees and lamps. About thirty visitors stroll about while you are there.

### The car park

Across the street from the lunapark gate: a concrete car park - the ground floor, two decks and an open roof deck, a blue P on the maps. The way in is at its south-east corner: stop at the barrier by the pink pay booth and it lifts after a moment (drive through and it breaks; nobody minds). Ramps climb the side strips - up the west side from the ground to deck 1, up the east side to deck 2, up the west side again to the roof - so you drive round and up deck by deck; you can walk up them too. About half the stalls on every deck have a car parked in them. While you are inside, the decks above you turn see-through and the cars on them are hidden, so you always see your own floor. The police in the street do not see you up on a deck. Mode: `carPark` (the parked cars and the barrier).

How it works: everything has a height (`z`, 0 on the ground) that follows the decks and ramps in there; walls can stand at some heights only (the walls along each ramp and at its ends), and cars and people only meet cars at their own height (`js/10k-carpark.js`).

## The space center

Gravel Flats is the Bay Space Center, behind a security fence: the launch pad with a rocket and its boosters beside a red and white tower, lightning masts, the fuel spheres and a water tower, the crawlerway with the crawler-transporter parked on it, the huge assembly building with its flag, launch control, offices with a car park and a rocket garden by the gate. The gate is shut and guarded: the way in - with permission, or in certain clothes - comes with the story (`docs/STORY.md`).

Every number for the gates, the base, the port, the lunapark, the space center (and the Pay 'n' Spray garages) is in `js/01l-places-data.js`: `python3 tools/settings_sheet.py places export places.numbers` / `... places import places.numbers`.

Every number of the airport is in `js/01k-airport-data.js` (how often, gates, taxi, take-off and landing speeds, the take-off run and landing roll, the climb angle, plane health, blast distance, explosion radius, burn time, the speed above which a plane kills, the heat, and the fence): `python3 tools/settings_sheet.py airport export airport.numbers` / `... airport import airport.numbers`. The mode table's `planes` row turns the movements off (the planes then only stand at their gates).

## Police

The police only know what they see or hear, and they come in small numbers.

- **Seeing**: a cop sees you within 37.5 m by day (less at night, in the rain and in fog - see Day, night & weather), inside an 80 degree cone in front of them, with nothing in between; once they have you they keep watching all round for a moment. A crime counts only when a cop sees it or hears it (gunshots as far as each weapon is heard, explosions within 25 m). Each crime adds heat, and enough heat is a wanted level: a seen carjacking is 1 star; carjacking a police car, killing someone in front of a cop or hurting a cop is 2 stars.
- **Radio and search**: whoever sees you tells the others where you are. When nobody sees you they search around the spot where you were last seen: a red circle on the minimap and the city map, growing to 60-140 m, and the stars blink. Police cars cruise the streets inside it and cops on foot walk to the spot and look round. Stay out of sight for 12 s at 1 star up to 50 s at 5 stars and they give up; inside the circle that takes about three times longer.
- **Fewer cops, later**: two foot patrols walk the sidewalks around you, and patrol cars are part of the traffic (how many is set in the vehicle table). At 1 star one police car comes (patrol cars nearby join at once, otherwise one is sent after 15 s); 2, 3, 5 and 7 cars at the higher levels, sent sooner; extra officers on foot from 3 stars.
- **1 star, a stop order**: a cop near you shouts STOP. Stand still - on foot or in your car - for 3 s and you pay a fine of 250 and the stars go. Keep moving for 3 s while they can see you and it is 2 stars.
- **2 stars, an arrest**: police cars follow you and pull up beside you when you stop; the crew gets out, and a cop who holds you for a second (on foot, or beside your car while it does under 12 km/h) arrests you. Drive away and the crew runs back to their car and carries on. No shooting unless you fired a gun where they could see or hear it, rammed a police car or hurt a cop.
- **3 stars and up**: police cars ram your car; cops on foot shout a warning, then shoot from up to 27 m, more often missing the further away you are, and never with a passer-by in the line of fire. From 3 stars an armoured APC may come too, at 5 stars a tank that drives straight at you, on foot or not. **The tank fires rockets** at you (mode `tankRockets`): one every 4 s, only with a clear line, from up to 60 m, aimed a little ahead of a moving car; its turret turns to follow you and the blast hurts whoever is near (it is not your crime). **A police APC fires its turret machine gun** (mode `apcGun`): bursts of 6 when its crew sees you, up to 40 m, a 22% chance per round (less far away), 5 damage to you on foot or 9 to your car; after a belt of 100 it takes the machine gun's reload. All of it in the police table (*Tank and APC*).
- **Ways out**: stay out of sight, pay the fine at 1 star, take a heat reducer (Items and stores), change your clothes (Clothes shops) or drive into a Pay 'n' Spray unseen (it loses them at any level).
- **Busted or wasted** is not the end: you start again at the door of the nearest police station (bail: 10% of your score, and they keep every weapon you found - only your fists are left) or hospital (the bill: 10%); see Hospitals and police stations above.

Every one of these numbers is in one table, `js/01b-police-data.js`, in everyday units. `tools/settings_sheet.py` turns it into an Apple Numbers file or an Excel workbook and reads an edited copy (either kind) back (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/settings_sheet.py police export police.numbers      # or police.xlsx
python3 tools/settings_sheet.py police import police.numbers [--dry-run]
```

(`tools/police_sheet.py export|import ...` still works and does the same.)

Both have a sheet per kind of setting - Wanted levels (one column per star), Settings, Crimes - and a How to fill sheet. Yellow cells are the values and YES / NO cells are pop-up menus. The Excel workbook also has grey Check cells that say OK or what is wrong; a Numbers file is written without formulas. The import checks every value against its allowed range, lists what changed and only then rewrites the table.

## Vehicle jobs

Four jobs, each in its own vehicle and started at its own **dispatch point**. The point's marker - a ring, a beam of light and the job's name - shows only while you sit in the right vehicle; stop in it and the START card opens (the job's level 1, your best level, the level bonus, the reward; *ENTER* starts it).

| Job | Vehicle | Dispatch point | What you do | Reward at level 8 |
|---|---|---|---|---|
| **Taxi** | a taxi | a taxi rank | the rank sends you to a fare waiting at the kerb; stop by them, they get in and say where to; stop at the destination's marker. Paid by the distance, plus a tip for the time left (each crash with a fare aboard costs some of it) | **nitro** in taxis: Shift or N (the NITRO button on a touch screen) - more pull and top speed for 3 s, ready again 10 s later |
| **Paramedic** | an ambulance | a hospital | all the level's patients lie about the city at once; stop by one to take them aboard, up to 3, then stop at any hospital's marker. A crash with patients aboard costs 3 s; a patient who dies ends the job | **+50 max health** (150) |
| **Firefighter** | a fire engine | a fire station | cars burn about the city, up to 3 at a time; spray each with the water cannon (FIRE) until it is out (1.5 s). When the time runs out they blow up | **fireproof**: blasts hurt you half as much, and the car you are in blowing up does not hurt you |
| **Vigilante** | a police car (one in a police station's yard is free to take - no crime) | a police station | criminals drive about like traffic until you come within 60 m, then flee at up to 100 km/h through red lights, always away from you. Wreck their car - or once it is down to 35% they get out and run: take them down. From level 5 they shoot back (from the car and on foot), from level 8 two cars at once. 400 m away and they got away. Killing them is no crime | **+50 max body armor** (150) |

- **Levels**: level 1 asks for one fare, patient, fire or criminal car, each level after for one more. Each one adds time to the clock - the road distance as if you drove it at 35-40 km/h, plus a few seconds - and pays when done; a finished level pays €100 times the level, and the next level begins at once.
- **The job ends** when the time runs out, the vehicle is wrecked or you are out of it for 10 s (another vehicle of the same kind will do), or when you stop it: tap or click the job's panel at the top - STOP THE JOB? Police stars do not end it. Your best level is kept, and the reward once you reach level 8 - both are saved with the game. While a job runs: the level, the count and the clock at the top; a ring, a beam and an arrow on what to do, and a dot on the minimap (an arrow at its edge when it is off it) and on the city map.
- **Taxi ranks**: four, on long streets well spread over the city - yellow kerb paint, a lit TAXI sign and two cabs waiting. **Fire stations**: three red buildings with bay doors, FIRE STATION over them and FIRE on the roof, their engine in the yard. Both are on the minimap and the city map (a yellow cab sign, a flame on red). A hospital's yard keeps an ambulance; a police station's yard has its patrol cars. A vehicle taken from there is back once you have been away.
- **The taxi** is a new vehicle: a yellow cab with a lit roof box and a checker band; a few drive in traffic.
- Every number is in `js/01o-jobs-data.js` (`tools/settings_sheet.py jobs`; the pay is also in the economy sheet). Modes: `taxiJob`, `medicJob`, `fireJob`, `vigilanteJob` - both modes.

## Races

Street races, a NASCAR race and a drag strip, in both modes. Every number - fees, prizes, rivals, pace, timers - is in `js/01p-races-data.js` (`tools/settings_sheet.py races`; the fees and prizes are also in the economy sheet).

- **Street races** (mode `streetRaces`): now and then (about every 2 minutes, never while you race, do a job or a rampage, or are wanted) one of the eight phone booths within 500 m of you rings for a minute - a blinking phone on the minimap and the city map, a glow and PHONE over the booth, and you hear it. On foot at the booth, **ANSWER** (or E) shows the race: a **fixed** race rings with a double ring (one of five routes - Seaview Sprint, Palm Heights Run, Bridge Dash, Dockside Dash, Coral Circuit - each with its best time kept) and a **random** one with a fast trill (a new route each time: its start a short drive from the booth, 500-1000 m to the finish). **ACCEPT** pays the fee (never given back). Then you have **60 s** to stop at the start in a car of your choice - any but a public service vehicle (police, taxi, ambulance, fire engine, trash truck, bus, tank, APC) - and not while wanted. Stopped in the start's marker, the start counts down 3 s and you race 5 rivals in fast cars through the checkpoints - at every turn of the route and at least every 120 m, each in order (the next two show as rings with beams, the route as a yellow line on the maps, the rivals as orange dots).
- **Rivals** drive their own route as fast as the corners and their brakes allow (92% of their car's top speed), round slower cars, through red lights; no catch-up either way. One that crashes out is out.
- **From the countdown to the results** you cannot get out of the car and FIRE is locked. The race ends for you if your car is wrecked, you are busted or wasted, or 30 s after everyone else has finished.
- **The speedway** (modes `speedway`, `dragStrip`): a small oval on the Palm Heights beach, with a grandstand full of people on ground won from the sea, grass in the infield and a scoring pylon. Its paddock by the shore street has the pit garages, a **NASCAR special** to take (free - no crime; another is there once you have been away) and the **race booth**: on foot, **RACE** (or E) - pay the fee and you are put in a NASCAR special on the grid with 7 others; the start counts down 7 s; 5 laps of 195 m. Afterwards you are back on foot at the booth.
- **Two drag strips**, each with its own race booth by its staging lanes (a DRAG kiosk, a chequered flag on the maps): the **Palm strip** beside the speedway, running north along the beach's east edge - an eighth of a mile (201 m) - and the **Sandbar strip** down the middle of the east beach, reached by a lane from the avenue's north corner - **600 m** timed, long enough to see a car's top speed. Stop by the booth in a car (any but a public service vehicle; on foot the card tells you to bring one): **RACE** a rival in a sports car waiting in the right lane (fee, the win pays; €100 / €400 on the Palm strip, €200 / €800 on the Sandbar strip) or a **TEST RUN** alone (free): you are put in the left lane, three ambers half a second apart, then green - go. After the line a parachute stops you. The results give the time, the reaction, 0-100 km/h, the split times (60 ft, 201 m, 402 m), the trap speed and the top speed; the best time on each strip and the best top speed are kept.
- **The guide line** (mode `guideLine`): while a street race is on (the way to its start, then the race's route), during a vehicle job (to the nearest fare, patient, hospital, fire or criminal) or while you drive the car wanted at the docks, a faded lime line about a bike wide lies on the streets in the right-hand lane along the shortest way by road, and on the minimap and the city map. It is worked out again as you go.
- **The edge glow** (mode `edgeGlow`): while a phone booth rings, and while the guide line's target (the next fare or patient, a race's start or next checkpoint, the export bay) is off screen, the screen's edge toward it glows in the same lime, pulsing - stronger the closer it is.
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
| Tank | 6 m | 80 km/h | one stands at a secret spot (always the same parking lot) for you to find; driving it, FIRE launches rockets straight ahead (one every 1.5 s, no ammo needed); the police send their own only at 5 stars, and it just rams |

Ambulances and fire engines on a call take the shortest way by road at up to 65 km/h; one already in traffic nearby takes the call, otherwise one comes from further away.

**Paramedics.** An ambulance at a body stops with its lights flashing and two paramedics get out with a stretcher. They walk it to the body, lift it on (under a white sheet), carry it back and load it - and then one more body lying within 30 m, two at most per trip; an ambulance already on its way to that one turns back. Aboard, they drive to the nearest hospital with lights and siren, carry each body to the door, where it is taken in, walk back and drive on as ordinary traffic until the next call. While both are out the ambulance stands empty with the handbrake on. They are ordinary people: kill one, or drive off with their ambulance while they are out, and they drop the stretcher and run - the bodies stay and another ambulance comes for them. If they cannot get to the body or back, they give up after 45 seconds and drive on; a team far behind you finishes unseen. Drivers sit inside under the roof behind tinted glass. Long vehicles keep their distance in traffic from their front bumper, not their middle, and use more collision circles along their length.

Every vehicle is one column of `js/01c-vehicle-data.js`: size, speed, acceleration, braking, steering, grip, health, weight, armour, how often it drives in traffic, parks or is sent by the police (and from which wanted level), how many are hidden, its job, its weapon, its delivery price at the docks, its gear selector (the lever's look on a touch screen), its colours. Acceleration given to a speed at or above the top speed counts as the time to reach top speed. `tools/vehicle_sheet.py` exports it to Apple Numbers or Excel and imports an edited copy (`export vehicles.numbers`, `import vehicles.numbers [--dry-run]`): one column per vehicle, rows found by their label, every value checked; a new column becomes a new vehicle (body `new` until its model is built).

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

The music files now are placeholders: 50-60 s seamless loops synthesized by `tools/radio_placeholders.py` (numpy, scipy and ffmpeg; `python3 tools/radio_placeholders.py [station ids]`). **Replace any of them with real music under the same file name** - MP3 plays in every browser, any length, and it loops. Names, frequencies, styles, colours, files, the radio volume and how many cars have it on are in `js/01e-radio-data.js`.

## Day, night & weather

A clock runs with the game, shown under the stars: a whole day lasts 24 real minutes and a new game starts at half past five in the afternoon (both can be changed on the New game screen, and the weather can be fixed there too). The clock stops while the game waits (city map, weapon wheel, pause menu).

- **The hour**: a hazy blue day in which the buildings show their own colours, a pink dawn around 6:00, a purple dusk around 19:30 and the neon night. The sun crosses the sky from east to west, so the lit side of the buildings turns with the hours; by night a cold moonlight comes from the north-west.
- **Lights**: lit windows glow faintly by day and fully at night; neon signs, trims and underglow are dimmer by day; street lights and headlights come on at dusk and go off at dawn.
- **Weather** changes every 2 to 6 minutes and blends in over 25 s: clear (45%), cloudy (20%), rain (20%), storm (8%), fog (7%).
  - *Cloudy*: a weaker sun and greyer light.
  - *Rain*: streaks and splashes, roads that get wet and shine with the lights at night, the hiss of rain, people under umbrellas and in a hurry, fewer people strolling. Wet roads give 75% of the grip (a hard stop from 80 km/h takes 30 m instead of 25 m), and traffic drives 20% slower. Roads dry 90 s after the rain stops.
  - *Storm*: a wind-driven downpour, 62% grip, lightning that lights up the screen and thunder after it.
  - *Fog*: you see less far, and so do the police.
- **The police see less far**: 75% at night, 85% in the rain, 50% in fog (the factors multiply, so a stormy night is a good time to lose them).

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

The **weapon button** at the top shows the weapon in hand (in its colour) and its ammo; tap it (or press **Q**) for the weapon wheel, which shows the weapons you have, each in its colour, with its ammo and how it is used. The game waits until you tap one; tap outside the wheel to go back. **1 - 9** pick directly, the mouse wheel cycles.

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
| Grenade | green | thrown | blast 5 m, 2.5 s fuse, bounces | hold FIRE and drag the opposite way, let go to throw | 4 + 4 ammo |
| Pipe bomb | lime | thrown | blast 9 m, 4 s fuse, stays put | like the grenade, a shorter throw | 2 + 2 ammo |

**Melee.** FIRE swings what is in your hand (held, it keeps swinging). Partway through the swing it hits everyone in the arc in front of you, out to the weapon's reach: damage, a push and a knockdown - people lie on the ground for the knockdown time - or, pushed more than 3 m (the golf club), they fly through the air and bounce off walls and cars. Cars in the arc take damage; boxes, bags and crates burst, bins fly. Melee is silent; police who see it count it like a shot, and hitting a cop is hurting a cop.

**Throwing.** On a touch screen FIRE turns into a little stick while a grenade or pipe bomb is in hand: hold FIRE and drag toward where it should land - to the edge of the ring for the full range, so it works in every direction, up and left too, with FIRE in the corner of the screen. With the mouse, like a slingshot: hold the button and drag the opposite way to the throw. A row of dots in the weapon's colour shows the arc and a ring the size of the blast shows where it will land; the further you drag, the further it goes, up to the throw range. Let go to throw; a short drag throws nothing. With the keyboard: hold J to wind up (the longer, the further) and it goes the way you face. A grenade bounces off walls, cars and the ground and rolls; a pipe bomb stops where it lands. Both blink faster as the fuse runs down, then blow up like a rocket with their own blast radius; in deep water they fizzle out. In a car FIRE drops one out of the window behind you.

**The weapon table.** Every weapon is one entry of `js/01f-weapon-data.js`, in everyday units, and `tools/weapon_sheet.py` exports it to Apple Numbers or Excel - one column per weapon, in the order of the weapon wheel - and reads an edited copy back, checking every value (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/weapon_sheet.py export weapons.numbers      # or weapons.xlsx
python3 tools/weapon_sheet.py import weapons.numbers [--dry-run]
```

The rows come in sections:
- *Weapon*: name, short name, status, class, sound, **bubble colour** (each weapon its own), and two lists that say which mechanics it needs - **how you use it** (tap, hold, scope, swing, throw; new) and **what it fires** (bullet, rocket, melee, grenade; new).
- *Mechanics in words*: **how to use** (one or two sentences, shown under the weapon wheel and on the Help page's WEAPONS tab), **how it works** (a full description of the behaviour) and look / sound / ideas.
- *Hitting*: damage, bullets per shot (above 1 = a shotgun), spread, range, time between shots, damage to vehicles, goes through cover.
- *Shops*: price of the weapon and of one ammo pickup in the stores (empty: not sold).
- *Ammo and finding it*: magazine, spare rounds when found, most carried, rounds per ammo pickup, how many weapon pickups and ammo pickups lie hidden on the map, the share of people carrying it, reload, have it at the start (only fists), kept when busted, fires from a car (the drive-by).
- *Police and noise*: heat per shot, heard within, people flee within, screen shake.
- *Scope or sight*: zoom, sight shape, blur, line of sight, sight stays up.
- *Explosives*: blast radius, how hard the blast throws things (*Blast throw*, %), flight speed, dud chance and angle, and for grenades fuse, throw range and bounce.
- *Melee*: reach, swing arc, knockdown, push back.

A weapon that works like an existing one - another pistol, a shotgun, another melee weapon or bomb - can go in the game straight from the table. One that needs a mechanic that does not exist yet is a **draft** (use or fires: new): describe it in *how to use* and *how it works*, fill the numbers you can, and the game leaves it out until it is built. Saved games keep each weapon by its ID (whether you have it, its magazine and spare rounds), so weapons can be added or reordered without breaking them.

The sniper rifle aims through a scope that sits just above your finger (so the finger never covers it) and shows what is under it 4x bigger; everything outside the scope is blurred, and the game keeps running. The shot goes off when you lift your finger. The scope then stays where it was for the 1.5 s the bolt takes (it ignores the finger meanwhile) and disappears; then you can aim again. After the last round of a magazine it stays for the same 1.5 s, which already count toward the 10 s reload. The ring is yellow while it cannot fire yet (next round, reloading, or you are moving), cyan when ready and pink when the crosshair is on a person or a car. With a mouse the scope is on the pointer; holding J, the arrow keys move it. You can only shoot what you can see: with a building between you and the crosshair the scope says NO LINE OF SIGHT and letting go does not fire. One shot kills a person. The round goes through props (dumpsters, crates, AC units, pumps, fountains, cranes, containers, planes, sign posts) and through one car, damaging it, to hit what is behind; a building, a second car or an armoured vehicle stops it. Rifle ammo comes in long cases with a yellow stripe.

The **rocket launcher** aims the same way (and also fires only while you stand still) through a different sight: a wide amber 2x viewfinder with corner brackets, a diamond reticle and a range readout (DANGER CLOSE when the blast would reach you); the rest of the view is darkened, not blurred, and the sight goes as soon as you let go. The rocket flies level and straight at the spot you aimed at - it does not follow a target that moves - and explodes on the first thing in its way: a building, a prop, a gate, a car or a person. If it gets past that spot without hitting anything it keeps going, and only from there it wanders: its heading swings in slow waves that change at random but never turn sharply, until it hits something or its motor burns out and it drops. Its motor glows and lights the street; the smoke is thick right behind it and spreads into a white trail that takes five seconds to fade. One rocket in twenty is a dud that leaves the tube 40 degrees off. Rockets come in olive crates with orange bands.

**Explosions** (rockets and cars blowing up) show a fireball that swells and rises, a burst of flame, debris, embers, a shock ring, a ragged scorch mark and a column of dark smoke that hangs around for a few seconds. People inside a blast are torn apart: no body is left - a burst of blood, pieces flung away from the blast that lie a few seconds and fade, a large blood mark with smaller ones around it - and no ambulance comes; what they carried still drops. Every blood mark, from a blast, a body or a hit, is one of 14 splash shapes drawn when the game starts (a ragged pool, blobs, droplets and streaks), turned, stretched, sized and tinted at random, so no two look alike. They throw everything they do not destroy - as hard as the weapon table's *Blast throw* says: a rocket 40% (yours and the tank's), grenades, pipe bombs and exploding cars 100%; the damage and the look of the blast do not change with it: cars hop, spin and slide, people go flying (in small steps, so they bounce off walls, props, cars and other people instead of passing through them), and dumpsters, crates, bags, bins, barrels, pallets, AC units, carts, planters, benches, hydrants and newspaper boxes tumble through the air and stay where they land (solid again there); a new game puts them back.

**Street junk.** Shops put out piles of cardboard boxes, heaps of garbage bags and wheelie bins along the backs of the sidewalks, and the back alleys are full of boxes, bags, bins, barrels, crates and pallets. Drive into them (from about 12 km/h) and cardboard boxes, garbage bags, single crates and pallets burst: bits fly the way you were going and a patch of mess stays on the road. Bins, barrels and newspaper boxes are knocked flying and spill their trash; a hydrant is knocked off and a fountain of water shoots up for a few seconds. Benches, parking meters (on the busy shopping streets) and beach umbrellas are knocked flying too, a phone box's glass shatters, a planter breaks and a bush in a park is flattened (mode: `moreProps`). Each hit slows the car a little (a bus or the tank hardly notices). A blast throws all of it and shreds the light things near its middle. What was smashed or knocked away is put back after a minute and a half, once you are far enough away not to see it.

## Items and stores

**Hidden items.** Health, body armor and the heat reducer lie hidden like the guns - off the main streets, each turning in a bubble of its own colour, coming back somewhere else out of sight a minute after you take one. Only cash lies on the sidewalks, and none of it shows on the minimap or the city map (*Economy*).

| Item | Bubble | What it does | Hidden | In stores |
|---|---|---|---|---|
| Health | white, a white box with a red cross | +50 health, taken only when you are hurt | 10 | €150 |
| Body armor | blue, a blue vest | +50 armor, up to 100: a blue bar under the health bar that takes the damage before your health does | 6 | €250 |
| Heat reducer | flashing red and blue, a police star with an arrow down | one star less, taken only while you are wanted - from inside a car too | 4, 10 in back alleys, 1 on the road from 3 stars | not sold |

**Heat reducers.** Besides the four hidden ones: from 3 stars up one lies in the middle of a street ahead of you, just out of sight (about 70 m, never on the maps); a new one comes 30 s after it was taken or left far behind (170 m), and it goes when you drop below 3 stars. Ten more stand in fixed back alleys - always showing, but taken only while you are wanted, each back in its alley 2 minutes after you took it (story mode has 3, its share of the hidden pickups). Every heat reducer is taken from inside a car too - drive through it; everything else is taken on foot only. The numbers are in the streets table, `js/01m-streets-data.js`.

**Stores.** Six stores stand on shopping streets spread over the city - always the same buildings, each with a front the camera can see. Each is a **€** in its own colour on the minimap and the city map, and at its door a ring of light with a $, the store's first weapon turning above it and the store's name floating higher. Walk up to the door on foot and a **SHOP** button appears next to you: tap it, click it or press **E** (a car standing closer than the door gets E instead). The game waits while you shop; **LEAVE**, **Esc** or **E** goes back out, and what you bought is saved by the autosave. Your score is your cash.

| Store | Colour | Sells |
|---|---|---|
| Bat Cave Sports | amber | baseball bat, golf club, knife, health |
| Lucky Pawn | lime | pistol, revolver, machete, knife, body armor |
| Bullseye Guns | cyan | pistol, SMG, shotgun, health, body armor |
| Army Surplus | green | machine gun, grenades, machete, body armor |
| Trophy Hunt & Fish | yellow | sniper rifle, shotgun, revolver, health |
| Back Room Deals | magenta | rocket launcher, pipe bombs, grenades, machine gun, body armor |

Each gun or bomb a store sells comes with a row for its ammo (one ammo pickup's worth). A weapon you have shows OWNED; ammo, health and armor show FULL when you cannot carry more; a price you cannot pay is red.

| Weapon | Price | Ammo | | Weapon | Price | Ammo |
|---|---|---|---|---|---|---|
| Baseball bat | €150 | - | | Shotgun | €1,000 | €120 (7) |
| Knife | €120 | - | | Machine gun | €3,500 | €400 (100) |
| Machete | €250 | - | | Sniper rifle | €2,500 | €300 (10) |
| Golf club | €200 | - | | Rocket launcher | €5,000 | €800 (2) |
| Pistol | €400 | €60 (24) | | Grenade | €600 | €450 (3) |
| Revolver | €700 | €80 (12) | | Pipe bomb | €900 | €600 (2) |
| SMG | €1,200 | €150 (60) | | | | |

The items and the stores are `js/01g-shop-data.js` (what each item gives, its colour, how many are hidden, its price; each store's name, colour and what it sells - weapon ids from the weapon table and item ids). Weapon and ammo prices are two rows of the weapon table (*Shops* section of `tools/weapon_sheet.py`); an empty price means it is never sold.

## Car delivery at the docks

On the south-east corner of the port quay is the **export bay**: yellow lines with EXPORT painted inside, a board beside it, a slewing crane on the quay edge and a small car carrier, the *Rolling Star*, moored alongside. It is not on the maps - you find it at the port.

- **One car is wanted at a time**: the board says which - the kind and the colour (a swatch and its name) and what it pays at most. Coming near with a new request, you are told it. The colour is always one of that kind's usual paints in the vehicle table, never one only a car salon would paint.
- **Delivering**: park the wanted car in the bay and get out. The crane lines it up, lowers its lifting frame onto it and lifts it - you are paid as it rises - swings it over the ship and lowers it into the hold. A wrong car: *NOT THE WANTED CAR*. Not while the police are after you: *LOSE THE POLICE FIRST*.
- **Pay**: each kind's *delivery price* (vehicle table: sedan €600, estate €700, motorbike €450, pickup €900, truck €1,000, sports car €1,500, limo €2,500; never police, service vehicles, the bus, the tank or the APC), less half the car's damage in % (a car 40% damaged pays 20% less).
- **The next car** is wanted 2 minutes later (the board says *NOTHING WANTED - COME BACK LATER* meanwhile). While a car is wanted, 30% of the cars of that kind that appear come in the wanted colour, so one can be found.
- The wanted car is kept in saved games. The timings and shares are in the places table (*Car delivery*); the prices in the vehicle table and the economy sheet. Modes: `carDelivery`.

## Pay 'n' Spray

Four paint shops, spread over the city (the first a short drive from the start, the others in Palm Heights and Seaview): low white workshops with neon bands, a roller door to the street between yellow and black posts, PAY 'N' SPRAY and a giant spray can on the roof. Each is a spray can on a pink square on the minimap and the city map. Mode: `sprayGarage`.

- **Driving in**: come up to the door in a car it takes and the door rolls up (a green lamp beside it); drive in, stop in the bay and it comes down behind you. On foot the door stays down (unless you are already inside).
- **Inside**: while you are in, the roof turns see-through and you see the workshop - the spray bay between yellow lines under a gantry of nozzles, shelves of paint, a workbench and a compressor, a car up on the lift, a tool chest, drums and tyres - and the painter in white overalls. It is the first building you go inside; the top-down kind of interior (others, and rooms of their own, come later).
- **The colours**: a card at the bottom of the screen, the car in view above it. First the kind's own paints, then any colour - 12 hues, each light, bright and dark, then white, greys and black. The car shows each colour as you tap it (one is picked to start with); **SPRAY** pays €100, **LEAVE** (or Esc, E) puts the old colour back, pays nothing and opens the door.
- **The respray**: the door shuts and the painter walks round the car with his gun in a cloud of the new colour; 4 seconds later it comes out fully repaired - a burning car is put out - in the new colour (you cannot get out or fire meanwhile). Autosaved.
- **The police**: if no cop saw you at the door or going in, they lose you, at any wanted level. Seen: you are repaired and repainted, and still wanted (*THEY SAW YOU GO IN*).
- **Who it takes**: cars, trucks, bikes, the sports car, the limo - repainted. Taxis, buses, ambulances, fire engines and trash trucks are repaired and keep their livery (*REPAIR €100*). Police cars, the tank and the APC are turned away, and so is a vehicle too big for the bay (a bus in the shorter ones) or a driver with less than €100 - the door stays down and a red line says why. No respray during a race.
- **The car wanted at the docks**: its colour is a name (pink, blue...) - spray a car of the wanted kind that colour and the dockers take it.
- **Never in the way**: no lamps, trees, bins or parked cars across a garage's door; no street junk inside.

The count, the price, how long spraying and the door take, the stars a respray loses and the number of hues are in the places table (*Spray garages*): `python3 tools/settings_sheet.py places export places.numbers`; the price is in the economy sheet too.

## Clothes shops

Ten clothes shops, each with its own range, take shop buildings spread over the city (always the same ones, clear of the six weapon stores). Each is a coat hanger in its colour on the minimap and the city map; at the door a ring of light, a turning shirt and the shop's name. Walk up on foot and tap **SHOP** (or press **E**).

- **Five pieces**: hat, glasses, top, bottoms, shoes - each bought and worn on its own, mixed as you like. You start in a yellow T-shirt, dark jeans and old sneakers, no hat, no glasses.
- **Trying on**: inside, your figure turns slowly next to the list. Tap a piece and the figure tries it on (*TAP AGAIN TO BUY*); tap it again to buy it, and you wear it at once. Not enough cash: it says how much you are short.
- **Your wardrobe**: what you have bought is yours. The **WARDROBE** tab at any clothes shop lists it, with NO HAT and NO GLASSES; putting something on is free (tap, tap again). Clothes are only changed at the shops. They are saved with the game and kept when you are wasted or busted.
- **New clothes lose the police**: change at least one piece while no cop saw you go in and the police lose you - up to 3 stars; at 4 or 5 the level drops to 3. Seen going in, it does nothing.
- **The shops**: SUNSET SURF (beachwear), NEON THREADS (80s pastel suits, aviators), BLOCK KINGS (streetwear), VELVET & GOLD (luxury suits, fedoras), IRON & INK (biker leather), LONE STAR (western), FLEX ATHLETICS (sportswear), HARD HAT (workwear), ARMY & NAVY (surplus), MIDNIGHT (punk and club wear) - 87 pieces from €20 to €1,500. The space center's clothes are not sold: they come with the story.

Everything is in `js/01n-clothes-data.js`: the shops (name, colour, what they sell), every piece (name, shop, slot, style - the shape it is drawn with -, two colours, price) and the two police settings. `tools/clothes_sheet.py` exports it to Apple Numbers or Excel and reads an edited copy back, checking every value (a style must fit its slot; new rows are new pieces or shops); the prices are also in the economy sheet.

```
python3 tools/clothes_sheet.py export clothes.numbers      # or clothes.xlsx
python3 tools/clothes_sheet.py import clothes.numbers [--dry-run]
```

## Rampages

Twenty rampages are hidden around the city, in alleys, yards, parks and parking lots near a street: a white skull facing you over a red ring, with the rampage's weapon circling it. The first is close to where you start; the others are spread as far apart as they can be. Come near one and it is **found**: from then on it is a skull on the minimap and the city map (green once you have passed it).

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

About one passer-by in five carries a weapon - a pistol (10%), a baseball bat or a knife (3% each), a machete or a golf club (2% each); the weapon table's row *Carried by people (%)* sets which and how many (melee weapons and guns that fire bullets on tap or hold; at most 100% together). You only see it when they use it:
- hurt them, pull them out of their car, or kill someone within about 13 m of them, and they **fight back** instead of running - unarmed people still run;
- a gun is fired at you the way the police fire (the police table's accuracy and damage), from a clear line of sight, keeping a little distance; in a car they shoot the car;
- a melee weapon is swung when they reach you, softer than you hit (30% of the weapon's damage, at most 15), at under half your pace; a moving car they keep away from;
- they give up when you get 58 m away or after 45 seconds.

Gunfire alone only makes people run. Killed, they drop their weapon in its colour bubble: a melee weapon you do not have yet, or a pistol with one magazine (+7 rounds if you have one already). People brought in for a rampage carry nothing, so rampages play as tuned. Their shots and swings add no heat to you; what you do to them does.

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
| `js/01g-shop-data.js` | the hidden items (health, body armor, heat reducer) and the six stores: what each sells |
| `js/01h-rampage-data.js` | the twenty rampages: weapon, target, count, time, reward (edit by hand or with `tools/rampage_sheet.py`) |
| `js/01i-economy-data.js` | where cash comes from (cars, the dead, stacks in town; amounts and ranges, drop time); every price in the game is in `tools/economy_sheet.py` |
| `js/01j-mode-data.js` | the game modes (free roam, story) and which features each has; `feat(id)` |
| `js/01k-airport-data.js` | the airport settings in everyday units (edit by hand or with `tools/settings_sheet.py airport`), converted to `AIRP` |
| `js/01l-places-data.js` | the airport gates, the military base, the port, the lunapark, the space center and the spray garages in everyday units (`tools/settings_sheet.py places`), converted to `PLC` |
| `js/01m-streets-data.js` | traffic lights, drivers, pedestrians, sirens and the heat reducers on the road and in the alleys, in everyday units (`tools/settings_sheet.py streets`), converted to `STR` |
| `js/01n-clothes-data.js` | the ten clothes shops, every piece of clothing (slot, style, colours, price) and the clothes' police settings (`tools/clothes_sheet.py`) |
| `js/01o-jobs-data.js` | the vehicle jobs: dispatch points, levels, the clock, pay, rewards, nitro (`tools/settings_sheet.py jobs`) |
| `js/01p-races-data.js` | the races: phone booths, street races and their five fixed routes, the NASCAR race, the drag strip, results (`tools/settings_sheet.py races`) |
| `js/02-audio.js` | synthesized Web Audio (including the rain and thunder) |
| `js/02b-radio.js` | the car radio: plays the station of the car you are in, live position, tuning, fading, the station name |
| `js/03-input.js` | keyboard, mouse, touch, shifter |
| `js/04-world.js` | spatial hash, collision with turned boxes, raycast, distance-to-shore field, bridge rails, driveway gates, road graph queries and shortest paths, district building styles |
| `js/05-entities.js` | entity and effect data |
| `js/06-gameplay.js` | state, heat and wanted level, combat, enter/exit vehicles |
| `js/06b-melee-throw.js` | melee swings (arc hits, knockdown, people sent flying), throwing bombs (the aim - a little stick on FIRE for touch, a slingshot for the mouse - with its arc and ring, flight, bounces, fuse, blast), dropping them from a car |
| `js/07-vehicles-traffic-police.js` | car physics, lane following traffic, road routing for the police |
| `js/07b-traffic-lights.js` | traffic lights: the junctions, light groups and timing, the rules for drivers (stop line, amber, giving way, people crossing), sirens and pulling over, people round the corners and over the crossings, the signal heads |
| `js/08l-clothes-shops.js` | the clothes shops: placement, door markers, the shop screen with the turning figure, trying on, buying, the wardrobe, losing the police |
| `js/08m-car-delivery.js` | car delivery at the docks: the wanted car, the board, the export bay, the crane loading it on the car carrier, the pay |
| `js/08n-vehicle-jobs.js` | the vehicle jobs: taxi ranks, fire stations, dispatch markers and the START card, levels, the clock, fares, patients, fires, criminals, rewards, nitro, the job's markers and map dots |
| `js/08o-races.js` | the races: the phone booths and their calls, routes along the streets, the race card, rivals' driving, checkpoints, laps, the drag strip's lights, results, records, the race's markers and map dots |
| `js/08p-guide.js` | the lime guide line: where to (a race's start or route, a job's nearest target, the export bay), the shortest way by road, the line on the streets and the maps |
| `js/08q-spray.js` | the Pay 'n' Spray garages at work: who the door opens for, the colour card (the kind's paints, any colour), the respray and repair, losing the police, the painter's walk, the door, roof, lamp and sign, the map icons |
| `js/08r-heavy-guns.js` | the police tank's rockets at the top wanted level and the APC's turret machine gun (yours and the police's): turrets turning to the target, belts and reloads, bursts, hits |
| `js/08-pedestrians-pickups-spawning.js` | sidewalk pedestrians, pickups, spawning |
| `js/08b-police.js` | the police: who sees you, crime reports, the search, sending cars, police driving, cops on foot (stop order, arrest, shooting), busted and wasted, starting again |
| `js/08c-services.js` | trash truck stops at bins, ambulance and fire engine calls, the hidden tank, the tank's rockets |
| `js/08d-weapon-pickups.js` | hidden weapons, ammo and items: the hiding places off the streets, melee in fixed places, guns, ammo and items at random and coming back elsewhere, picking up, the coloured bubbles |
| `js/08e-shops.js` | the six stores: which buildings, the markers at their doors, the SHOP button, the store screen and buying |
| `js/08f-rampages.js` | the rampages: where they are, the skulls, found and passed, the RAMPAGE button and screen, the locked weapon, the clock, counting kills and wrecks, people and vehicles brought in, the reward |
| `js/08g-armed-people.js` | armed passers-by fighting back, and the loot the dead drop (cash and their weapon) |
| `js/08h-paramedics.js` | paramedics: the stretcher team, up to two bodies per trip, the drive to hospital, delivering at the door |
| `js/08j-places.js` | guard posts and soldiers, gate barriers, the base's warning and alarm, its armoury, motor pool and helicopter, the lunapark's visitors, things that take bullets (targets) |
| `js/08k-ships.js` | the port: cargo ships arriving and leaving, mooring, the gantry cranes and their work, ship icons on the maps |
| `js/08i-planes.js` | the planes: the gates, one movement a minute, landing, taxiing, push back and take-off routes, running over things, damage, explosions, wrecks, falling; their models, shadows, lights and map icons |
| `js/09-render-core-buildings.js` | three.js setup, facade atlases, building meshes |
| `js/10-render-city-map.js` | sea, coast, roads, sidewalks and markings, parking lots, bridges, parks, beaches, street lights and furniture, gates, streaming, see-through fade |
| `js/10b-render-landmarks.js` | landmarks and props (the Colony Hotel and its park on the beach, Bayfront Park, TV tower, Twist, Crown, Sail, Bay Wheel, stadium, estate, mall, lighthouse, airport and runways, studio, cranes, containers, planes, gas stations, plazas, courts) and their collision boxes |
| `js/10c-render-fill.js` | the low street-front buildings, merged per area, with their back doors and fire escapes, and the see-through hole over the player |
| `js/10d-render-clutter.js` | back alleys, yards, promenades, quays, park paths and the apron, and everything lying about in them; box piles, bag heaps and wheelie bins (also used on the sidewalks) |
| `js/10e-render-services.js` | hospitals and police stations: the roof cross and lettering, signs, lamps, checkered band, flag |
| `js/10g-places.js` | the base, the space center, the port's yards and the lunapark's gate, stands, village, piazza and booths: models, collision boxes, ground, roads and markings, the barriers' booms |
| `js/10h-lunapark.js` | the rides: coaster tracks and trains, the Ferris wheel, flume, drop tower, swings, carousel, pirate ship, sky ride, park train |
| `js/10i-speedway.js` | the speedway: the oval (and `ovalAt` / `ovalU` along it), walls, grandstand, garages, race booth, pylon; the two drag strips (`stripPt` / `stripAlong` along them) with their fences, start lights, timing boards and booths; ground and markings, the map picture |
| `js/10j-spray-garage.js` | the spray garages: which buildings (well spread, the first near the start), their walls and door as solids, the workshop model - bay, gantry, shelves of paint, bench, lift, the roof that fades, the roller door, the painter |
| `js/10k-carpark.js` | the lunapark car park: decks, ramps and the heights (`z`) they give, walls by height, the barrier and booth, parked cars on every deck, the model by level and the decks above you fading, its map icon |
| `js/10f-airport.js` | the airport: airfield, runway and taxiway markings and lights, apron lines, terminal with jet bridges, hangars, tower, booths, windsock, the fence (breaking and mending) |
| `js/11-render-dynamic-meshes.js` | vehicle models (one per body, drivers inside under the roof), people, pickups |
| `js/11b-weapon-models.js` | small 3D models of every weapon, an ammo box and the items (health, armor, heat reducer), for your hand, the pickups and the stores |
| `js/11c-clothes-models.js` | the clothes drawn on the figure: hats, glasses, tops, bottoms and shoes in their styles and colours |
| `js/12-render-effects.js` | particles, tracers, decals, skid marks, score pops |
| `js/12b-rockets.js` | rockets: flight, wandering after the target, hits, the glowing motor and the smoke trail |
| `js/12c-blast.js` | explosions: fireball, flames, smoke, debris, and throwing cars, people, pickups and props |
| `js/12d-sky-weather.js` | the clock and the weather: light, sun and moon, fog, sea, window and neon glow, street lights and headlights, wet roads, rain and splashes, lightning; grip and police sight |
| `js/12e-smash.js` | street junk under wheels: boxes, bags, crates, pallets, phone boxes, planters and bushes burst, bins, hydrants (with a fountain), benches, parking meters and beach umbrellas are knocked flying, shredding in blasts, putting it all back later |
| `js/13-render-frame.js` | per-frame render |
| `js/14-hud-minimap.js` | HUD, minimap and city map (with the search area), district name |
| `js/14b-weapon-wheel-scope.js` | weapon wheel and button pictures, aiming through the sniper scope and the rocket sight (zoomed view, blurred or darkened surroundings) |
| `js/15-game-flow-loop.js` | setting up a new or saved game, play, dying, starting again or game over, main loop |
| `js/15b-menus-saves.js` | the title, New game choices (`OPT`), pause menu, help pages and keys in the menus; saved games: autosave, slots, save files |
| `js/16-octagrid-map-preview.js` | loads an Octagrid export and shows it in 3D (look only) |
| `js/main.js` | starts the game; must load last |

## Octagrid preview

*City file preview* on the title menu reads an `octagrid-city` JSON export from the Octagrid city builder and shows it with the full building detail. It is a preview only: the imported map is not playable yet.
Not yet used by the preview: `bounds`, `edges` (city limit and edge style).

## Next steps

What comes next, in order and with every detail agreed with the owner (safehouses, the Colony on the beach, the lunapark car park, the showroom and tuning, the junkyard, roadblocks and the police helicopter, stats and 100%, and a few fixes): **`docs/PLAN.md`**. The list below is the older, rougher one.

1. Make Octagrid exports playable: they already have roads and building outlines, so they can be turned into the same map format as `js/00-map-data.js`.
2. Honor `bounds` and `edges` from the export.
3. Convert the scripts to ES modules once the globals are untangled.
4. Police, later: roadblocks, spike strips and a helicopter at 4-5 stars.
5. **New places, agreed with the owner, to build next** (each will be asked about in detail first; the spray garages are built - see Pay 'n' Spray):
   - *Car showroom and your garage*: buy cars; tune them - spoilers, wheel colours, paint colours you do not see on the road; a garage near the start keeps the cars you park in it, saved with the game.
   - *Prison island*: busted, you walk out of its gate; walls, towers, guards; breakouts for the story.
   - *Construction site*: a half-built tower with cranes, ramps and scaffolding for stunt jumps.
   - *Casino and nightclub strip*: a neon casino, a club with a dancing crowd and a queue at the door.
   - *Marina with boats*: yachts and speedboats to steal and drive on the water (a new vehicle type).
   - *Junkyard and car crusher*: stacks of wrecks; drop a car in the crusher for cash.
6. **Side jobs, world events and activities, agreed with the owner** (each will be asked about in detail first; the vehicle jobs, street races and the speedway with its drag strip are built - see Vehicle jobs and Races):
   - *Robberies and the cash van*: robbers run out of a store to a getaway car; an armoured cash van to ram open for its money bags.
   - *Fires, crashes and blackouts*: burning buildings with fire engines racing there, pile-ups with tow trucks, storm blackouts with the traffic lights flashing amber.
   - *Scheduled moments*: a rocket launch at the space center, fireworks over the lunapark, a plane in trouble at the airport.
   - *Houses to buy*: 10 across the city, each one unique; a garage keeps your cars safe and a wardrobe holds every piece of clothing you bought.
   - *Stats and a 100% screen*: everything found and done, with a completion percentage.
7. **Building interiors, later** (agreed with the owner; each kind will be asked about in detail first): two kinds - in the current top-down view for storages, hangars, warehouses and the like; and a 2D side-on view (like a platform game) with hallways and elevators up to the higher floors.
8. **Flying, later** (agreed with the owner; will be asked about in detail first - which aircraft, free roam or story, how hard to fly): a new vehicle type that leaves the ground, seen from above with its shadow on the ground and the camera pulling back as it climbs. Ideas to choose from:
   - *Helicopters*: the military helicopter on the base's helipad made flyable; a police or news helicopter on a rooftop pad; hovering, landing on roofs and pads.
   - *Planes*: steal one of the airliners at the gates or a small plane from a hangar, take off from the runway, land again on it (or crash).
   - *Seaplane*: at the marina, taking off from and landing on the water.
   - *Smaller ones*: a parachute to jump out with, a jetpack or a hang glider from the tall towers.
   - Open points: the police chasing you in the air (their own helicopter, at 4-5 stars), what you can do from up there (shoot, drop bombs), running out of fuel, and the airport's own plane movements around you.
9. **People with real lives, later** (agreed with the owner; to be asked about in detail first): passers-by with a day of their own - from home to their car, to a shop, to the gas station... and back to a parking lot and home.
