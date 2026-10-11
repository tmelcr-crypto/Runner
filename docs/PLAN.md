# Agreed with the owner: what to build next, and how

These are the owner's answers (October 2026), so the work can go on without more questions. Build in this order; each finished
step is tested, pushed and merged into `main` (the owner chose: merge each finished part). Every new feature gets a row in the
modes table (`js/01j-mode-data.js`) - all of these are for **both** free roam and story - and its numbers in a data table.

## 1. Pay 'n' Spray - done
Four garages, see-through roof, any colour, €100, police lose you unseen. See the README.

## 2. Fixes and small items - done
- **Pipe bombs** sometimes missing from the weapon wheel after picking them up: find and fix.
- **Police tank at 5 stars** fires rockets: one every 4 s, only at you, only with a clear line, up to about 60 m, leading a moving car
  a little; the blast is the rocket launcher's (cars and people near it too).
- **APC turret machine gun**, for you and the police: driving an APC, FIRE shoots the turret at the nearest target ahead - endless
  belts of 100, reload time as the machine gun on foot. A police APC (3 stars up) fires at you the same way when it sees you.
- **Edge glow**: a lime glow (the guide line's colour) on the screen edge toward a ringing phone booth, and toward the guide line's
  target (job fare, race start, export bay, next checkpoint) whenever it is off screen; it pulses gently, stronger as you get close.

## 3. The Colony on the beach, the lunapark car park - done
- **The Colony hotel** is rebuilt on the Sandbar beach east of the start, between the Bay Wheel and the lighthouse: three times
  bigger, solid (the old one by the hospital had see-through faces; its lot becomes ordinary buildings), with its own park and a
  fountain between the hotel and the sea, a driveway from the avenue. Its free room is the first safehouse (see 4).
- **Lunapark car park** (the old lot half in the water goes): a multi-storey car park beside the lunapark gate - concrete, ramps up
  to 3 decks and an open roof deck; the decks above you turn see-through so you always see your floor; parked cars on every deck;
  a pay booth with a barrier at the entrance. Map remodel version 4 (`tools/remodel_city.py`).

## 4. Safehouses - done
- **What they give**: SLEEP (save to a slot, full health and armour, skip to 8:00 at night or 20:00 by day), a garage or parking
  spaces for your cars, a wardrobe (any clothes you own) and a weapon stash (kept even when busted or wasted). Not a respawn point.
- **Saving**: the autosave stays; the three save slots are only chosen when you SLEEP in a safehouse (the pause menu's SAVE goes).
- **Ten, each unique**: a free room at the Colony (to start), a Coral Shore trailer €3,000, a Mercado flat €8,000, a houseboat at the
  docks €15,000, a Heron Key beach bungalow €20,000, a Palm Heights loft €30,000, a Seaview condo €45,000, a Sunstrip deco apartment
  €60,000, a Fairway Isles mansion €120,000, a penthouse on top of a tower €150,000 (economy table, editable).
- **Cars**: houses keep cars in a garage you drive into through a roller door (like the Pay 'n' Spray): trailer 1, bungalow 2,
  mansion 4 (with a pool and a gate); houseboat 0 (a boat later). Flats and towers (Colony room 1, flat 1, loft 2, condo 2,
  deco apartment 3, penthouse 4) have **dedicated parking spaces** instead - painted, reserved stalls by the building. A kept car
  keeps its colour and damage; a car left anywhere else is gone as now.
- **Inside, by building**: houses (trailer, bungalow, mansion, houseboat) are top-down with the roof turning see-through - furnished
  rooms (bed, wardrobe, safe, kitchen, TV) and the garage. Towers (Colony room, flat, loft, condo, deco apartment, penthouse) switch
  to the **side-on 2D view**: every floor alive - lobby with a desk clerk, neighbours walking the hallways, a few doors that open
  (empty rooms), stairs as well as the elevator, your door, your flat (bed, wardrobe, safe, window view).
- **Side-on controls**: left / right buttons to walk and an UP button at doors, stairs and the elevator; on a keyboard the arrows or
  A / D, and W or E; the stick works too.
- **Buying**: a FOR SALE sign at the door; a card with the price, the cars it keeps and a picture; BUY. Map icons: a green house
  for yours, a white house with € for one for sale. Going in unseen loses the police (like the Pay 'n' Spray).

## 4b. Before the showroom (asked October 2026; both modes, each part merged when done) - done
- **Sounds**: hitting and breaking street objects sounds different for each kind, made in the game like the other sounds: cardboard
  thump, bag rustle, wood crack (crates, pallets, benches), metal clang (bins, barrels, meters, newspaper boxes), the hydrant's clank
  and water hiss, glass shattering (phone box), a pot smashing (planter), leaves (bush), an umbrella flapping. People: a different
  impact for fists, bats, knives, bullets and being run over, a short pained grunt on a hit and a cry when someone dies - higher and
  lower voices, never twice the same.
- **The Colony**: an O-ring drive in front of the entrance (a loop round a planted island) and a valet in uniform at the door who greets
  you - scenery only.
- **The lunapark car park**: a palm forest around it, a rocky coast, and one wooden pier with a few moored boats (scenery now; the
  boats you can drive, when they come, tie up there).
- **120 unique buildings**, each its own model, colours and neon name, like the original Colony on its lot - a Miami mix: Art Deco and
  Streamline hotels on the beach streets, MiMo motels, Mediterranean villas, diners, cinemas, banks, churches, nightclubs, shops and
  offices. Spread over every district, the most along the beachfront (Sandbar, Sunstrip, Coral Shore), each replacing ordinary
  buildings on its lot. The SEA BREEZE (the hotel by the old start) becomes one of them.

## 4c. Figures and the time of day (asked October 2026; both modes, each part merged when done)
- **The shop figure**: the big preview in the clothes shops (and the wardrobes) gets a rounded, detailed figure - neck, shaped
  torso and hips, tapered arms and legs, hands, shoes with soles, a face (eyes, brows, nose, mouth), ears, hair - with the clothes'
  details (collars, buttons, prints, belts) on a lit stage that turns slowly.
- **In the street**: livelier walking for you and the people - arms swinging with the step, the head bobbing, a lean when running,
  heads turning. (The figures themselves stay as they are.)
- **Day and night**: a bright, warm, sunny day in true colours (not the purple tint) with sharp sun shadows; a much darker night in
  deep blue where street lamps cast pools of light and lit windows, headlights and neon stand out; orange-pink dusk and dawn
  between. How dark the night is goes in the sky table.

## 4d. The owner's next round (asked October 2026; build in this order, each part merged when done)
All of these are for **both** modes except the kill frenzies (free roam only).
1. **Finish 4c** and merge it (day and night, the shop figure, livelier walking).
2. **People sound back to arcade**: hits and kills on people go back to the old arcade thud - no grunts, cries or screams, no
   impact per weapon. The street junk keeps its own sounds.
3. **30 more kill frenzies** (free roam only): the same two goals as the 20 (kill so many people, or wreck so many vehicles, with
   the weapon given, before the clock runs out), new skulls where there are none yet, every weapon used, rewards scaled.
4. **Weapon grid** instead of the wheel: every weapon in its cell with a refined model (the models are refined only for the grid);
   ones you don't have are grey and dim with their name. It opens the way the wheel does (Q, holding the weapon button).
5. **The police helicopter** (replaces the helicopter of step 7): one helicopter, and after it is lost the next only 10 minutes
   later. From 3 stars it looks for you with a searchlight; from 4 stars a short machine-gun burst every 6 s; at 5 stars it also
   drops pipe bombs toward you. Only a sniper rifle or the **AA launcher** (new) can bring it down. The AA launcher aims like the
   rocket launcher, locks on after 2 s on a target, and only a helicopter, a tank or an APC can be targeted; its rocket flies off
   in a random direction, swerves, and after 4 s hits the target - one shot kills. Carry 3 rockets at most. Very rare: one hidden
   pickup (with one rocket), and the **black market** (new shop at the docks) sells it for EUR 25,000 and EUR 5,000 a rocket.
6. **The airport**: flights to Prague and Norfolk (both COMING SOON) and a **scenic flight** for EUR 5,000: a cinematic - you walk
   to the plane through the terminal hall (its roof see-through), the plane taxis to the runway, then 2 minutes flying round the
   city seen from your seat through an oval window; a random time of day and weather each time; the only button is LAND (skip).
   A new 90s-style synth track plays (made by the game). Build the cutscene engine so story mode can use it later.
7. **The map overhaul**:
   - Remove the floating name boards (SEA BREEZE, GROVE DOCK, LUNAPARK PARKING, the COLONY HOTEL roof board...); a name stays
     only where it belongs on a building (a neon sign on its facade or pylon).
   - 100 more unique places: 40 more unique buildings (new kinds too: skyscrapers, a school, an arena, a parking garage, a gas
     station...) and 60 places - every park, square and plaza its own design (ponds, gardens, playgrounds, a skate park,
     sculptures, a bandstand...). No repeated patterns: everything recognisable.
   - More tall buildings (future obstacles for flying).
   - Large empty areas filled with forests.
   - One factory with tall smoking chimneys in Gravel Flats, next to the future junkyard.
   - Reroute the roads that make no real-life sense (decide and fix; no need to ask).
   - Both drag strips: a band from the city through a park and a forest to the strip, then forest again to the beach; each
     strip gets a one-way exit toward the city, passable only from inside once a race is over.
8. Then the plan's steps 5-8 below.

## 5. Car showroom and tuning (Sunstrip)
- A glass showroom on a main street in Sunstrip, cars on turntables: every car kind plus three rare ones sold only there (a
  supercar, a classic convertible, a muscle car). A bought car is delivered to a safehouse garage or parking space you choose.
- **Tuning** at its workshop: paint, a two-tone roof, racing stripes; wheel rim and underglow colours; a spoiler, a bonnet scoop;
  engine, brakes, armour in price steps (vehicle table). Tuning is kept with the car in your garages and saves.

## 6. Junkyard and car crusher (Gravel Flats)
- A fenced yard in the industrial north-west: stacks of wrecks (solid, some smashable), a magnet crane, the crusher, a shack and a
  guard dog that chases you on foot. Drive a car onto the crane's spot and get out: the magnet lifts it into the crusher, a cube
  comes out, you are paid by kind and damage (economy table). Crushing a police car is a crime only if a cop sees it.

## 7. Police: roadblocks (the helicopter: see 4d.5, which replaces it)
- **Roadblocks from 3 stars**: two police cars across a street ahead of you, cops behind them shooting; ram through or turn.
- **Helicopter from 4 stars**: follows you, a searchlight at night, a gunner from 5 stars; it sees you from the air, so hiding is
  harder; it can be shot down. (No spike strips.)

## 8. Stats and 100%
- A STATS page in the pause menu: kills, cars stolen, distance, best times, % done. 100% counts everything findable: safehouses
  bought, rampages passed, hidden weapons and items found, races won (each fixed route, the NASCAR race, both drag strips), level 10
  in each job, deliveries, sprays used (and stunt jumps once they exist).
- The reward at 100%: a gold one-of-a-kind car delivered to your best garage, and health and armour up to 200.

## Later (not now)
- **People with real lives**: from home to their car, to a shop, to the gas station... and back to a parking lot and home.
- **Flying**: see the README's Next steps.
