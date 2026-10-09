# Block Runner

Top-down GTA 1 style crime sandbox in neon 3D. Vanilla JS + three.js r128 (loaded from cdnjs). No build step.

Run it: serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or open `index.html` directly.

## Menus and saved games

- **Title**: *Continue* (the latest save, with when and where it was made), *New game*, *Load game*, *Help*, and *City file preview*. The arrow keys move between the buttons, Enter picks, Esc goes back; everything also works by mouse or touch.
- **New game** choices, remembered for next time:
  - *Time of day*: dawn, morning, noon, evening (17:30) or night.
  - *Weather*: changing, or always clear, cloudy, rain, storm or fog.
  - *Clock*: a 12, 24 or 48 minute day, or stopped.
  - *Police*: relaxed, normal or tough - more or less heat for each crime, how many cars they send and how soon, and how long they search.
  - *Streets*: quiet, busy or packed - how much traffic and how many people.
  - *Start in*: the usual spot, a random street, or any of the 13 districts.
- **Pause** with Esc, P or the MENU button (top); the game also pauses when you switch to another app or tab. From there: resume, save, load, new game, help, quit to the title.
- **Saving**: an autosave every minute while no police are after you (and when you pause by switching away or quit to the title), plus three slots, each with a small picture of the screen, the time, the weather, the district and the score. You cannot save while you are wanted. A save keeps where you are (and the car you are in), health, weapons and ammo, score and kills, the clock, the weather and the New game choices. Saves live in the browser (localStorage); *Download save file* and *Open save file* move a game to another device.
- **Help**: four pages - controls (keyboard and touch), playing (points, cars, pickups, wasted and busted), the police, and the city (map, day and weather, services, saving).

## The city

A made-up bay city on the outline of a reference map: two main islands, a few bay islands joined by straight bridges, a long ocean beach on the east side and an airfield in the south-west. Only the shape of the land, the beaches and the water come from the reference image; every street and building is generated.

- **Streets**: every island has a ring road along its coast, built only from straight runs at 0, 45 and 90 degrees, so every turn is 45, 90 or 135 degrees. Inside the ring the land is cut again and again by straight streets into an irregular grid (new streets line up with old ones so crossings meet properly), with one 45 degree avenue in a few districts. No junction joins more than four streets and there are no dead ends: the only road that ends is a short driveway to a landmark gate.
- **Streets as streets**: two traffic lanes, a parking lane on each side and a sidewalk for people. Parked cars only stand where they fit inside the parking lane, so they never block traffic or the sidewalk.
- **Blocks**: rows of buildings along every street side, turned to face their street, with corner buildings facing the side street. The rows of a block stand back to back, or back to back across a back alley, so their backs line up; whatever is left inside a block becomes parking lots, service yards, gardens, gas stations, plazas with fountains, basketball courts, pocket parks and parks. No ground is left over: leftover land is a yard, a promenade along the water, a quay or the airport apron. Towers downtown and along the beach; warehouses, container yards and cranes at the docks; hangars and planes at the airfield.
- **Back alleys and yards**: dumpsters, trash bags, crates, pallets, bins, barrels, puddles, washing lines across the narrow alleys, lamps over the back doors. The backs of the buildings have back doors, drainpipes, window AC boxes, graffiti and iron fire escapes (a landing at every floor, stairs between them, a drop ladder and a ladder over the roof edge); warehouses get a roller door and a loading dock. Dumpsters, crate stacks and AC units are solid. Promenades get palms, benches and lamps, quays get bollards, the apron gets floodlights and baggage carts.
- **Parking lots** work like real ones: every lot opens onto a street (its entrance faces it; lots the street plan left without one became gardens or service yards) and belongs to the building next to it, whose colour its P sign carries (a lot with no building next door got a small one of its own at the back). Nose-in stalls along the back kerb, the aisle open to the entrance, a second row along the front of the deep ones. Lots near you are about half full.
- **Hospitals and police stations**: four of each, spread over the city. A hospital is white with a big red cross on its roof, a red cross and a HOSPITAL sign over the entrance; a police station is blue with POLICE written on its roof, a POLICE sign, blue lamps at the door, a blue and white checkered band and a flag, and its parking lot holds its patrol cars. Both show on the minimap and the city map. Wasted, you start again at the door of the nearest hospital; busted, at the nearest police station.
- **Landmarks**: Bayfront Park downtown (a lake with a boathouse, a pier, paddle boats, a fountain and a band shell), the Bay TV tower over Mercado, the Twist (a glass tower that turns a quarter turn as it rises), the Crown (a stepped deco tower with a gold sunburst crown and a spire), the Sail hotel and the Bay Wheel on the beach, the golf links as one big park with lakes, the Neon Bowl stadium, the Pearl Key estate, Bayside Mall, the lighthouse, Skyport terminal with its runways, control tower and hangars, Heron Studios, and the Colony Hotel at 736 Ocean Drive (white Streamline front, turquoise bands, the inverted-T sign in blue neon).
- **Closed driveways**: traffic never turns into a driveway to a landmark, and a boom gate stops every car except a police car (people walk past it).
- **Real-world speeds** at 12 world units to the metre: people stroll at about 1.4 m/s, run at 5 and sprint at 7 (you are 15% quicker than everyone else); town traffic drives at 40-55 km/h; cars reach 130-260 km/h depending on type, and traffic accelerates, brakes and corners like real cars.
- **Your car drives arcade style**: it picks up about twice as fast as the real car, brakes harder, keeps its grip unless you pull the handbrake to drift, and turns tightly at any speed.
- **Stealing cars**: an empty car is yours after a second and drives off at once. Carjacking takes three seconds of fighting the driver for the wheel while the car lurches and swerves; let go (E again) and you drop off beside it.
- Traffic keeps to its lane, brakes in time for what is ahead and waits at a busy junction; police take the shortest route by road and only drive straight at you when nothing is in between. People walk the sidewalks, and some stroll about the back alleys, the parks, the beaches and the promenades. Nobody walks through anybody: people push each other aside and step round cars, parked or not, and never into a wall.
- The sea is everywhere outside the coast: you can wade a little; a car you drive off the shore sinks (traffic and police stop at the water and cannot be shoved in). Bridges have rails.
- **TAB**, or a tap / click on the minimap, opens the whole city map; the game waits while it is open, and a tap (or TAB) closes it. The district name shows when you enter a new one.
- Only what is near the camera exists as meshes; the low buildings are merged per area into one mesh each. Buildings and landmarks between the camera and the player turn see-through.

## Police

The police only know what they see or hear, and they come in small numbers.

- **Seeing**: a cop sees you within 37.5 m by day (less at night, in the rain and in fog - see Day, night & weather), inside an 80 degree cone in front of them, with nothing in between; once they have you they keep watching all round for a moment. A crime counts only when a cop sees it or hears it (gunshots as far as each weapon is heard, explosions within 25 m). Each crime adds heat, and enough heat is a wanted level: a seen carjacking is 1 star; carjacking a police car, killing someone in front of a cop or hurting a cop is 2 stars.
- **Radio and search**: whoever sees you tells the others where you are. When nobody sees you they search around the spot where you were last seen: a red circle on the minimap and the city map, growing to 60-140 m, and the stars blink. Police cars cruise the streets inside it and cops on foot walk to the spot and look round. Stay out of sight for 12 s at 1 star up to 50 s at 5 stars and they give up; inside the circle that takes about three times longer.
- **Fewer cops, later**: two foot patrols walk the sidewalks around you, and patrol cars are part of the traffic (how many is set in the vehicle table). At 1 star one police car comes (patrol cars nearby join at once, otherwise one is sent after 15 s); 2, 3, 5 and 7 cars at the higher levels, sent sooner; extra officers on foot from 3 stars.
- **1 star, a stop order**: a cop near you shouts STOP. Stand still - on foot or in your car - for 3 s and you pay a fine of 250 and the stars go. Keep moving for 3 s while they can see you and it is 2 stars.
- **2 stars, an arrest**: police cars follow you and pull up beside you when you stop; the crew gets out, and a cop who holds you for a second (on foot, or beside your car while it does under 12 km/h) arrests you. Drive away and the crew runs back to their car and carries on. No shooting unless you fired a gun where they could see or hear it, rammed a police car or hurt a cop.
- **3 stars and up**: police cars ram your car; cops on foot shout a warning, then shoot from up to 27 m, more often missing the further away you are, and never with a passer-by in the line of fire. From 3 stars an armoured APC may come too, at 5 stars a tank that drives straight at you, on foot or not.
- **Busted or wasted** is not the end: you start again at the door of the nearest police station (bail: 10% of your score, and they keep your weapons except the pistol) or hospital (the bill: 10%); see Hospitals and police stations above.

Every one of these numbers is in one table, `js/01b-police-data.js`, in everyday units. `tools/settings_sheet.py` turns it into an Apple Numbers file or an Excel workbook and reads an edited copy (either kind) back (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/settings_sheet.py police export police.numbers      # or police.xlsx
python3 tools/settings_sheet.py police import police.numbers [--dry-run]
```

(`tools/police_sheet.py export|import ...` still works and does the same.)

Both have a sheet per kind of setting - Wanted levels (one column per star), Settings, Crimes - and a How to fill sheet. Yellow cells are the values and YES / NO cells are pop-up menus. The Excel workbook also has grey Check cells that say OK or what is wrong; a Numbers file is written without formulas. The import checks every value against its allowed range, lists what changed and only then rewrites the table.

## Vehicles

| Vehicle | Length | Top speed | Notes |
|---|---|---|---|
| Sedan, estate | 4.5 m, 5.5 m | 180 km/h | the everyday cars; the estate has a long roof and roof rails |
| Sports | 3.2 m | 260 km/h | fast, slides easily |
| Pickup | 6.5 m | 150 km/h | open bed; 2.4 m wide, so it parks only in parking lots |
| Limo | 10 m | 144 km/h | long and low |
| Motorbike | 3 m | 330 km/h | one seat; leans into bends, stands on its stand when parked; the rider is in the open (you ride in yellow) |
| Truck | 6.5 m | 130 km/h | box truck |
| Bus | 10 m | 100 km/h | slow, wide turns, never parks |
| Trash truck | 7 m | 80 km/h | stops at the bins along its way, beacon flashing; armoured |
| Ambulance | 6 m | 147 km/h | comes for the dead with its lights on and takes the body away |
| Fire engine | 8 m | 120 km/h | comes to explosions and burning wrecks and hoses them down |
| Police car | 4.5 m | 220 km/h | patrols in traffic and chases you |
| APC | 5 m | 130 km/h | armoured police, in traffic and in chases from 3 stars |
| Tank | 6 m | 80 km/h | one stands at a secret spot (always the same parking lot) for you to find; driving it, FIRE launches rockets straight ahead (one every 1.5 s, no ammo needed); the police send their own only at 5 stars, and it just rams |

Ambulances and fire engines on a call take the shortest way by road at up to 65 km/h; one already in traffic nearby takes the call, otherwise one comes from further away. Drivers sit inside under the roof behind tinted glass. Long vehicles keep their distance in traffic from their front bumper, not their middle, and use more collision circles along their length.

Every vehicle is one column of `js/01c-vehicle-data.js`: size, speed, acceleration, braking, steering, grip, health, weight, armour, how often it drives in traffic, parks or is sent by the police (and from which wanted level), how many are hidden, its job, its weapon, its colours. Acceleration given to a speed at or above the top speed counts as the time to reach top speed. `tools/vehicle_sheet.py` exports it to Apple Numbers or Excel and imports an edited copy (`export vehicles.numbers`, `import vehicles.numbers [--dry-run]`): one column per vehicle, rows found by their label, every value checked; a new column becomes a new vehicle (body `new` until its model is built).

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

The **weapon button** at the top shows the weapon in hand and its ammo; tap it (or press **Q**) for the weapon wheel, which shows every weapon with its picture and ammo. The game waits until you tap one; tap outside the wheel to go back. **1 - 4** pick directly, the mouse wheel cycles.

| Weapon | Magazine | Between shots | Reload | Range | How it fires |
|---|---|---|---|---|---|
| Pistol | 7 | 0.27 s | 5 s | 47 m | tap FIRE |
| Machine gun | 30 | 0.085 s | 5 s | 50 m | hold FIRE |
| Sniper rifle | 5 | 1.5 s | 10 s | the whole screen | stand still, hold FIRE and drag to the target, let go to shoot |
| Rocket launcher | 1 | - | 5 s | up to 217 m | like the rifle: stand still, hold FIRE and drag, let go to fire |

**The weapon table.** Every weapon is one entry of `js/01f-weapon-data.js`, in everyday units, and `tools/weapon_sheet.py` exports it to Apple Numbers or Excel - one column per weapon, in the order of the weapon wheel - and reads an edited copy back, checking every value (needs numbers-parser for `.numbers`, openpyxl for `.xlsx`):

```
python3 tools/weapon_sheet.py export weapons.numbers      # or weapons.xlsx
python3 tools/weapon_sheet.py import weapons.numbers [--dry-run]
```

The rows come in sections:
- *Weapon*: name, short name, status, class, sound, and two lists that say which mechanics it needs - **how you use it** (tap, hold, scope; swing and throw not built yet; new) and **what it fires** (bullet, rocket; grenade and melee not built yet; new).
- *Mechanics in words*: **how to use** (one or two sentences, shown under the weapon wheel and on the Help page's WEAPONS tab), **how it works** (a full description of the behaviour) and look / sound / ideas.
- *Hitting*: damage, bullets per shot (above 1 = a shotgun), spread, range, time between shots, damage to vehicles, goes through cover.
- *Ammo*: magazine, spare rounds, most carried, rounds per pickup, pickup weight, reload, have it at the start, kept when busted.
- *Police and noise*: heat per shot, heard within, people flee within, screen shake.
- *Scope or sight*: zoom, sight shape, blur, line of sight, sight stays up.
- *Explosives*: blast radius, flight speed, dud chance and angle, and for grenades fuse, throw range and bounce.
- *Melee*: reach, swing arc, knockdown, push back.

A weapon that works like an existing one (another pistol, a shotgun, another rifle or launcher) can go in the game straight from the table. One that needs a new mechanic - melee, grenades or anything else - is a **draft**: describe it in *how to use* and *how it works*, fill the numbers you can, and the game leaves it out until its mechanics are built. The table has two example drafts, a BASEBALL BAT and a GRENADE. Saved games keep ammo per weapon ID, so weapons can be added or reordered without breaking them.

The sniper rifle aims through a scope that sits just above your finger (so the finger never covers it) and shows what is under it 4x bigger; everything outside the scope is blurred, and the game keeps running. The shot goes off when you lift your finger. The scope then stays where it was for the 1.5 s the bolt takes (it ignores the finger meanwhile) and disappears; then you can aim again. After the last round of a magazine it stays for the same 1.5 s, which already count toward the 10 s reload. The ring is yellow while it cannot fire yet (next round, reloading, or you are moving), cyan when ready and pink when the crosshair is on a person or a car. With a mouse the scope is on the pointer; holding J, the arrow keys move it. You can only shoot what you can see: with a building between you and the crosshair the scope says NO LINE OF SIGHT and letting go does not fire. One shot kills a person. The round goes through props (dumpsters, crates, AC units, pumps, fountains, cranes, containers, planes, sign posts) and through one car, damaging it, to hit what is behind; a building, a second car or an armoured vehicle stops it. Rifle ammo comes in long cases with a yellow stripe.

The **rocket launcher** aims the same way (and also fires only while you stand still) through a different sight: a wide amber 2x viewfinder with corner brackets, a diamond reticle and a range readout (DANGER CLOSE when the blast would reach you); the rest of the view is darkened, not blurred, and the sight goes as soon as you let go. The rocket flies level and straight at the spot you aimed at - it does not follow a target that moves - and explodes on the first thing in its way: a building, a prop, a gate, a car or a person. If it gets past that spot without hitting anything it keeps going, and only from there it wanders: its heading swings in slow waves that change at random but never turn sharply, until it hits something or its motor burns out and it drops. Its motor glows and lights the street; the smoke is thick right behind it and spreads into a white trail that takes five seconds to fade. One rocket in twenty is a dud that leaves the tube 40 degrees off. Rockets come in olive crates with orange bands.

**Explosions** (rockets and cars blowing up) show a fireball that swells and rises, a burst of flame, debris, embers, a shock ring, a ragged scorch mark and a column of dark smoke that hangs around for a few seconds. They throw everything they do not destroy: cars hop, spin and slide, people go flying (in small steps, so they bounce off walls, props, cars and other people instead of passing through them), and dumpsters, crates, bags, bins, barrels, pallets, AC units, carts, planters, benches, hydrants and newspaper boxes tumble through the air and stay where they land (solid again there); a new game puts them back.

**Street junk.** Shops put out piles of cardboard boxes, heaps of garbage bags and wheelie bins along the backs of the sidewalks, and the back alleys are full of boxes, bags, bins, barrels, crates and pallets. Drive into them (from about 12 km/h) and cardboard boxes, garbage bags, single crates and pallets burst: bits fly the way you were going and a patch of mess stays on the road. Bins, barrels and newspaper boxes are knocked flying and spill their trash; a hydrant is knocked off and a fountain of water shoots up for a few seconds. Each hit slows the car a little (a bus or the tank hardly notices). A blast throws all of it and shreds the light things near its middle. What was smashed or knocked away is put back after a minute and a half, once you are far enough away not to see it.

`js/00-map-data.js` is generated by `tools/build_city.py` from a reference map image: `python tools/build_city.py <map image> js/00-map-data.js [preview.png]` (needs numpy, opencv-python-headless, scikit-image, shapely 2, pillow). Landmark places, bridges, runways, district names and the start point are set in the script; the random seed is fixed, so the same image always gives the same city. After laying out the blocks it checks every parking lot: a lot that does not open onto a street is turned to face the one it touches, or becomes a garden or a service yard if it touches none, and each lot is tied to the building next to it (`lots[6]`). It then picks the four police stations (buildings with a lot of their own) and the four hospitals, spread over the city (`services`).

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
| `js/02-audio.js` | synthesized Web Audio (including the rain and thunder) |
| `js/02b-radio.js` | the car radio: plays the station of the car you are in, live position, tuning, fading, the station name |
| `js/03-input.js` | keyboard, mouse, touch, shifter |
| `js/04-world.js` | spatial hash, collision with turned boxes, raycast, distance-to-shore field, bridge rails, driveway gates, road graph queries and shortest paths, district building styles |
| `js/05-entities.js` | entity and effect data |
| `js/06-gameplay.js` | state, heat and wanted level, combat, enter/exit vehicles |
| `js/07-vehicles-traffic-police.js` | car physics, lane following traffic, road routing for the police |
| `js/08-pedestrians-pickups-spawning.js` | sidewalk pedestrians, pickups, spawning |
| `js/08b-police.js` | the police: who sees you, crime reports, the search, sending cars, police driving, cops on foot (stop order, arrest, shooting), busted and wasted, starting again |
| `js/08c-services.js` | trash truck stops at bins, ambulance and fire engine calls, the hidden tank, the tank's rockets |
| `js/09-render-core-buildings.js` | three.js setup, facade atlases, building meshes |
| `js/10-render-city-map.js` | sea, coast, roads, sidewalks and markings, parking lots, bridges, parks, beaches, street lights and furniture, traffic lights, gates, streaming, see-through fade |
| `js/10b-render-landmarks.js` | landmarks and props (Colony Hotel, Bayfront Park, TV tower, Twist, Crown, Sail, Bay Wheel, stadium, estate, mall, lighthouse, airport and runways, studio, cranes, containers, planes, gas stations, plazas, courts) and their collision boxes |
| `js/10c-render-fill.js` | the low street-front buildings, merged per area, with their back doors and fire escapes, and the see-through hole over the player |
| `js/10d-render-clutter.js` | back alleys, yards, promenades, quays and the apron, and everything lying about in them; box piles, bag heaps and wheelie bins (also used on the sidewalks) |
| `js/10e-render-services.js` | hospitals and police stations: the roof cross and lettering, signs, lamps, checkered band, flag |
| `js/11-render-dynamic-meshes.js` | vehicle models (one per body, drivers inside under the roof), people, pickups |
| `js/12-render-effects.js` | particles, tracers, decals, skid marks, score pops |
| `js/12b-rockets.js` | rockets: flight, wandering after the target, hits, the glowing motor and the smoke trail |
| `js/12c-blast.js` | explosions: fireball, flames, smoke, debris, and throwing cars, people, pickups and props |
| `js/12d-sky-weather.js` | the clock and the weather: light, sun and moon, fog, sea, window and neon glow, street lights and headlights, wet roads, rain and splashes, lightning; grip and police sight |
| `js/12e-smash.js` | street junk under wheels: boxes, bags, crates and pallets burst, bins and hydrants are knocked flying (with a fountain), shredding in blasts, putting it all back later |
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

1. Make Octagrid exports playable: they already have roads and building outlines, so they can be turned into the same map format as `js/00-map-data.js`.
2. Honor `bounds` and `edges` from the export.
3. Convert the scripts to ES modules once the globals are untangled.
4. Police, later: roadblocks, spike strips and a helicopter at 4-5 stars; a respray shop and changing cars to shake them off.
