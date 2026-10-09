# Block Runner

Top-down GTA 1 style crime sandbox in neon 3D. Vanilla JS + three.js r128 (loaded from cdnjs). No build step.

Run it: serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or open `index.html` directly.

## The city

A made-up bay city on the outline of a reference map: two main islands, a few bay islands joined by straight bridges, a long ocean beach on the east side and an airfield in the south-west. Only the shape of the land, the beaches and the water come from the reference image; every street and building is generated.

- **Streets**: every island has a ring road along its coast, built only from straight runs at 0, 45 and 90 degrees, so every turn is 45, 90 or 135 degrees. Inside the ring the land is cut again and again by straight streets into an irregular grid (new streets line up with old ones so crossings meet properly), with one 45 degree avenue in a few districts. No junction joins more than four streets and there are no dead ends: the only road that ends is a short driveway to a landmark gate.
- **Streets as streets**: two traffic lanes, a parking lane on each side and a sidewalk for people. Parked cars only stand where they fit inside the parking lane, so they never block traffic or the sidewalk.
- **Blocks**: rows of buildings along every street side, turned to face their street, with corner buildings facing the side street. The rows of a block stand back to back, or back to back across a back alley, so their backs line up; whatever is left inside a block becomes parking lots, service yards, gardens, gas stations, plazas with fountains, basketball courts, pocket parks and parks. No ground is left over: leftover land is a yard, a promenade along the water, a quay or the airport apron. Towers downtown and along the beach; warehouses, container yards and cranes at the docks; hangars and planes at the airfield.
- **Back alleys and yards**: dumpsters, trash bags, crates, pallets, bins, barrels, puddles, washing lines across the narrow alleys, lamps over the back doors. The backs of the buildings have back doors, drainpipes, window AC boxes, graffiti and iron fire escapes (a landing at every floor, stairs between them, a drop ladder and a ladder over the roof edge); warehouses get a roller door and a loading dock. Dumpsters, crate stacks and AC units are solid. Promenades get palms, benches and lamps, quays get bollards, the apron gets floodlights and baggage carts.
- **Parking lots** face the street or alley they are entered from: nose-in stalls along the back kerb with the aisle open to the entrance, and a second row along the front of the deep ones.
- **Landmarks**: Bayfront Park downtown (a lake with a boathouse, a pier, paddle boats, a fountain and a band shell), the Bay TV tower over Mercado, the Twist (a glass tower that turns a quarter turn as it rises), the Crown (a stepped deco tower with a gold sunburst crown and a spire), the Sail hotel and the Bay Wheel on the beach, the golf links as one big park with lakes, the Neon Bowl stadium, the Pearl Key estate, Bayside Mall, the lighthouse, Skyport terminal with its runways, control tower and hangars, Heron Studios, and the Colony Hotel at 736 Ocean Drive (white Streamline front, turquoise bands, the inverted-T sign in blue neon).
- **Closed driveways**: traffic never turns into a driveway to a landmark, and a boom gate stops every car except a police car (people walk past it).
- **Real-world speeds** at 12 world units to the metre: people stroll at about 1.4 m/s, run at 5 and sprint at 7 (you are 15% quicker than everyone else); town traffic drives at 40-55 km/h; cars reach 130-260 km/h depending on type, and traffic accelerates, brakes and corners like real cars.
- **Your car drives arcade style**: it picks up about twice as fast as the real car, brakes harder, keeps its grip unless you pull the handbrake to drift, and turns tightly at any speed.
- **Stealing cars**: an empty car is yours after a second and drives off at once. Carjacking takes three seconds of fighting the driver for the wheel while the car lurches and swerves; let go (E again) and you drop off beside it.
- Traffic keeps to its lane, brakes in time for what is ahead and waits at a busy junction; police take the shortest route by road and only drive straight at you when nothing is in between. People walk the sidewalks.
- The sea is everywhere outside the coast: you can wade a little; a car you drive off the shore sinks (traffic and police stop at the water and cannot be shoved in). Bridges have rails.
- **TAB** (or the **MAP** button) opens the whole city map; the game waits while it is open. The district name shows when you enter a new one.
- Only what is near the camera exists as meshes; the low buildings are merged per area into one mesh each. Buildings and landmarks between the camera and the player turn see-through.

## Weapons

The **weapon button** at the top shows the weapon in hand and its ammo; tap it (or press **Q**) for the weapon wheel, which shows every weapon with its picture and ammo. The game waits until you tap one; tap outside the wheel to go back. **1 - 4** pick directly, the mouse wheel cycles.

| Weapon | Magazine | Between shots | Reload | Range | How it fires |
|---|---|---|---|---|---|
| Pistol | 7 | 0.27 s | 5 s | 560 | tap FIRE |
| Machine gun | 30 | 0.085 s | 5 s | 600 | hold FIRE |
| Sniper rifle | 5 | 1.5 s | 10 s | the whole screen | stand still, hold FIRE and drag to the target, let go to shoot |
| Rocket launcher | 1 | - | 5 s | up to 2,600 | like the rifle: stand still, hold FIRE and drag, let go to fire |

The sniper rifle aims through a scope that sits just above your finger (so the finger never covers it) and shows what is under it 4x bigger; everything outside the scope is blurred, and the game keeps running. The shot goes off when you lift your finger. The scope then stays where it was for the 1.5 s the bolt takes (it ignores the finger meanwhile) and disappears; then you can aim again. After the last round of a magazine it stays for the same 1.5 s, which already count toward the 10 s reload. The ring is yellow while it cannot fire yet (next round, reloading, or you are moving), cyan when ready and pink when the crosshair is on a person or a car. With a mouse the scope is on the pointer; holding J, the arrow keys move it. You can only shoot what you can see: with a building between you and the crosshair the scope says NO LINE OF SIGHT and letting go does not fire. One shot kills a person. The round goes through props (dumpsters, crates, AC units, pumps, fountains, cranes, containers, planes, sign posts) and through one car, damaging it, to hit what is behind; a building, a second car or an armoured vehicle stops it. Rifle ammo comes in long cases with a yellow stripe.

The **rocket launcher** aims the same way (and also fires only while you stand still) through a different sight: a wide amber 2x viewfinder with corner brackets, a diamond reticle and a range readout (DANGER CLOSE when the blast would reach you); the rest of the view is darkened, not blurred, and the sight goes as soon as you let go. The rocket flies level and straight at the spot you aimed at - it does not follow a target that moves - and explodes on the first thing in its way: a building, a prop, a gate, a car or a person. If it gets past that spot without hitting anything it keeps going, and only from there it wanders: its heading swings in slow waves that change at random but never turn sharply, until it hits something or its motor burns out and it drops. Its motor glows and lights the street; the smoke is thick right behind it and spreads into a white trail that takes five seconds to fade. One rocket in twenty is a dud that leaves the tube 40 degrees off. Rockets come in olive crates with orange bands.

**Explosions** (rockets and cars blowing up) show a fireball that swells and rises, a burst of flame, debris, embers, a shock ring, a ragged scorch mark and a column of dark smoke that hangs around for a few seconds. They throw everything they do not destroy: cars hop, spin and slide, people go flying, and dumpsters, crates, bags, bins, barrels, pallets, AC units, carts, planters, benches, hydrants and newspaper boxes tumble through the air and stay where they land (solid again there); a new game puts them back.

`js/00-map-data.js` is generated by `tools/build_city.py` from a reference map image: `python tools/build_city.py <map image> js/00-map-data.js [preview.png]` (needs numpy, opencv-python-headless, scikit-image, shapely 2, pillow). Landmark places, bridges, runways, district names and the start point are set in the script; the random seed is fixed, so the same image always gives the same city.

## Layout

`index.html` loads the scripts in order. They are plain scripts that share globals, so keep the order.

| File | Contents |
|---|---|
| `js/00-map-data.js` | the map: land, grass and sand polygons, road graph, buildings, lots, alleys, yards, landmarks, props, districts (generated) |
| `js/01-config.js` | constants, helpers, `$()` |
| `js/02-audio.js` | synthesized Web Audio |
| `js/03-input.js` | keyboard, mouse, touch, shifter |
| `js/04-world.js` | spatial hash, collision with turned boxes, raycast, distance-to-shore field, bridge rails, driveway gates, road graph queries and shortest paths, district building styles |
| `js/05-entities.js` | entity and effect data |
| `js/06-gameplay.js` | state, wanted level, combat, enter/exit vehicles |
| `js/07-vehicles-traffic-police.js` | car physics, lane following traffic, police routing |
| `js/08-pedestrians-pickups-spawning.js` | sidewalk pedestrians, officers, pickups, spawning |
| `js/09-render-core-buildings.js` | three.js setup, facade atlases, building meshes |
| `js/10-render-city-map.js` | sea, coast, roads, sidewalks and markings, parking lots, bridges, parks, beaches, street lights and furniture, traffic lights, gates, streaming, see-through fade |
| `js/10b-render-landmarks.js` | landmarks and props (Colony Hotel, Bayfront Park, TV tower, Twist, Crown, Sail, Bay Wheel, stadium, estate, mall, lighthouse, airport and runways, studio, cranes, containers, planes, gas stations, plazas, courts) and their collision boxes |
| `js/10c-render-fill.js` | the low street-front buildings, merged per area, with their back doors and fire escapes, and the see-through hole over the player |
| `js/10d-render-clutter.js` | back alleys, yards, promenades, quays and the apron, and everything lying about in them |
| `js/11-render-dynamic-meshes.js` | cars, people, pickups |
| `js/12-render-effects.js` | particles, tracers, decals, skid marks, score pops |
| `js/12b-rockets.js` | rockets: flight, wandering after the target, hits, the glowing motor and the smoke trail |
| `js/12c-blast.js` | explosions: fireball, flames, smoke, debris, and throwing cars, people, pickups and props |
| `js/13-render-frame.js` | per-frame render |
| `js/14-hud-minimap.js` | HUD, minimap, full city map, district name |
| `js/14b-weapon-wheel-scope.js` | weapon wheel and button pictures, aiming through the sniper scope and the rocket sight (zoomed view, blurred or darkened surroundings) |
| `js/15-game-flow-loop.js` | menu, play, dying, game over, main loop |
| `js/16-octagrid-map-preview.js` | loads an Octagrid export and shows it in 3D (look only) |
| `js/main.js` | starts the game; must load last |

## Octagrid preview

*Load city file* on the start card reads an `octagrid-city` JSON export from the Octagrid city builder and shows it with the full building detail. It is a preview only: the imported map is not playable yet.
Not yet used by the preview: `bounds`, `edges` (city limit and edge style).

## Next steps

1. Make Octagrid exports playable: they already have roads and building outlines, so they can be turned into the same map format as `js/00-map-data.js`.
2. Honor `bounds` and `edges` from the export.
3. Convert the scripts to ES modules once the globals are untangled.
