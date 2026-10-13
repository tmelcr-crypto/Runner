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

## 4c. Figures and the time of day (asked October 2026; both modes, each part merged when done) - done
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
1. **Finish 4c** and merge it (day and night, the shop figure, livelier walking). - done
2. **People sound back to arcade**: hits and kills on people go back to the old arcade thud - no grunts, cries or screams, no
   impact per weapon. The street junk keeps its own sounds. - done
3. **30 more kill frenzies** (free roam only): the same two goals as the 20 (kill so many people, or wreck so many vehicles, with
   the weapon given, before the clock runs out), new skulls where there are none yet, every weapon used, rewards scaled. - done
4. **Weapon grid** instead of the wheel: every weapon in its cell with a refined model (the models are refined only for the grid);
   ones you don't have are grey and dim with their name. It opens the way the wheel does (Q, holding the weapon button). - done
5. **The police helicopter** (replaces the helicopter of step 7): one helicopter, and after it is lost the next only 10 minutes
   later. From 3 stars it looks for you with a searchlight; from 4 stars a short machine-gun burst every 6 s; at 5 stars it also
   drops pipe bombs toward you. Only a sniper rifle or the **AA launcher** (new) can bring it down. The AA launcher aims like the
   rocket launcher, locks on after 2 s on a target, and only a helicopter, a tank or an APC can be targeted; its rocket flies off
   in a random direction, swerves, and after 4 s hits the target - one shot kills. Carry 3 rockets at most. Very rare: one hidden
   pickup (with one rocket), and the **black market** (new shop at the docks) sells it for €25,000 and €5,000 a rocket. - done
6. **The airport**: flights to Prague and Norfolk (both COMING SOON) and a **scenic flight** for €5,000: a cinematic - you walk
   to the plane through the terminal hall (its roof see-through), the plane taxis to the runway, then 2 minutes flying round the
   city seen from your seat through an oval window; a random time of day and weather each time; the only button is LAND (skip).
   A new 90s-style synth track plays (made by the game). Build the cutscene engine so story mode can use it later. - done
7. **The map overhaul**:
   - Remove the floating name boards (SEA BREEZE, GROVE DOCK, LUNAPARK PARKING, the COLONY HOTEL roof board...); a name stays
     only where it belongs on a building (a neon sign on its facade or pylon). - done (store, unique building and landmark names
     too; a front the camera sees side-on gets a blade sign)
   - 100 more unique places: 40 more unique buildings (new kinds too: skyscrapers, a school, an arena, a parking garage, a gas
     station...) and 60 places - every park, square and plaza its own design (ponds, gardens, playgrounds, a skate park,
     sculptures, a bandstand...). No repeated patterns: everything recognisable.
     - done: the 40 buildings (skyscrapers, condo towers, schools, the arena on a park, parking garages, gas stations, museums,
       civic buildings, supermarkets, car washes, bowling alleys)
     - done: the 60 places (44 plazas, 6 courts, 10 parks; the parks table js/01s, tools/parks_sheet.py)
   - More tall buildings (future obstacles for flying). - done (towers behind the street fronts downtown; the skyscrapers and condos)
   - Large empty areas filled with forests. - done (woods on the big lawns, scrub on the space center's grounds)
   - (Asked on the way) Trees you knock down: not solid, a vehicle fells them and is slowed by weight (tank 0, motorbike 70%),
     on foot you walk through; under a tree (on foot, or stopped) the helicopter's light cannot see you, and its light alone
     holds you only 6 s without a cop on the ground. - done (js/12g; modes trees, heliLose)
   - One factory with tall smoking chimneys in Gravel Flats, next to the future junkyard. - done (the cement works on the space
     center's south-east corner, js/10r; remodel 7 keeps the gravel yard east of it, up to the street corner, for the junkyard)
   - Reroute the roads that make no real-life sense (decide and fix; no need to ask). - done (remodel 8: the avenue's U detour
     straightened, the base road ends at its gate, the south tip's zigzag coast road straightened with a beach below it)
   - Both drag strips: a band from the city through a park and a forest to the strip, then forest again to the beach; each
     strip gets a one-way exit toward the city, passable only from inside once a race is over. - done (remodel 9; the owner chose
     the band for the Sandbar strip only - the Palm strip has no room - and a sliding EXIT gate past the finish on both)
8. Then the plan's steps 5-8 below.

## 5. Car showroom and tuning (Sunstrip)
(Asked: the showroom and the workshop are interiors of the top-down kind, the roof see-through.) - done: the showroom (map remodel 10,
js/10s, js/08w) and the tuning workshop (js/08y, October 2026).
- A glass showroom on a main street in Sunstrip, cars on turntables: every car kind plus three rare ones sold only there (a
  supercar, a classic convertible, a muscle car). A bought car is delivered to a safehouse garage or parking space you choose.
- **Tuning** at its workshop: paint, a two-tone roof, racing stripes; wheel rim and underglow colours; a spoiler, a bonnet scoop;
  engine, brakes, armour in price steps (vehicle table). Tuning is kept with the car in your garages and saves.
  (Asked October 2026:) it takes every vehicle but police and army ones - taxis, buses, ambulances, fire engines and trash trucks keep
  their livery (no paint, roof or stripes; rims, underglow, parts and performance yes) - and nothing while you are wanted. Three levels
  each, moderate at the top: engine +15% top speed and +35% acceleration, brakes +50%, armour -60% damage, level 3 about €16-20,000.

## 6. Junkyard and car crusher (Gravel Flats)
(Done October 2026: Dockside Salvage in the port's maintenance yard - map remodel 12, js/10t, js/08z.)
(October 2026: the yard kept for it by the cement works became the works' road and staff car park - map remodel 11. The owner chose a new
place: **Dockside, by the port** - in the port's maintenance yard area, wrecks and containers side by side, near the black market. The
rest of this step stands.)
- A fenced yard in the industrial north-west (the gravel yard kept for it in Gravel Flats, east of the cement works by the street
  corner: MAP.gravel.junk): stacks of wrecks (solid, some smashable), a magnet crane, the crusher, a shack and a
  guard dog that chases you on foot. Drive a car onto the crane's spot and get out: the magnet lifts it into the crusher, a cube
  comes out, you are paid by kind and damage (economy table). Crushing a police car is a crime only if a cop sees it.

## 7. Police: roadblocks (the helicopter: see 4d.5, which replaces it)
(Done October 2026: js/08zr; the police table's roadblock rows.)
- **Roadblocks from 3 stars**: two police cars across a street ahead of you, cops behind them shooting; ram through or turn.
  (Asked October 2026: they grow with the stars) 3 stars: two cars, two cops with pistols; 4: three cars, four cops with SMGs; 5: an APC
  in the middle and cops with rifles. Set up 300-500 m ahead on the road you are on, about one a minute while you drive.
- **Helicopter from 4 stars**: follows you, a searchlight at night, a gunner from 5 stars; it sees you from the air, so hiding is
  harder; it can be shot down. (No spike strips.)

## 8. Stats and 100%
(Done October 2026: js/08zs, the stats table js/01t, the vehicles table's gold row. Each thing found or done counts once toward 100%.)
- A STATS page in the pause menu: kills, cars stolen, distance, best times, % done. 100% counts everything findable: safehouses
  bought, rampages passed, hidden weapons and items found, races won (each fixed route, the NASCAR race, both drag strips), level 10
  in each job, deliveries, sprays used (and stunt jumps once they exist).
- The reward at 100%: a gold one-of-a-kind car delivered to your best garage, and health and armour up to 200.

## 9. After the plan (asked October 2026; all for **both** modes; in this order, each to be asked about in detail before building)
1. **New places** (from the README's list):
   - *Prison island*: walls, watchtowers, guards. Busted, you walk out of the prison gate on its island (no longer at a police
     station), and a free ferry takes you back to the docks. Breakouts for story mode.
     (Asked October 2026:) the island lies **in the bay by Heron Key**, between the lunapark island and the mainland, seen from the
     beaches. You may go onto the island (the pier, the path to the gate) but not into the prison: the walls and the yard are
     restricted **like the military base** - a RESTRICTED AREA warning counts down, then the alarm gives stars and the tower guards
     fire rifles from their posts. Inside is seen **from above only** for now (walls, watchtowers with searchlights at night, a yard
     with prisoners in orange walking and playing ball, closed cell blocks); the cell blocks' interiors come with the story's
     breakouts. The **ferry** is free, **on foot only**, and **shuttles all day** (about 20 s at each pier; busted, it waits for you at
     the island); you **ride it for real**, standing on deck while it crosses (skippable), and walk off at the docks. **Wanted, it will
     not sail** (lose the police first). The island is called **IRON KEY**; the ferry's mainland end is a **new ferry pier on the
     Palm Heights shore across the bay** (not the port's docks, which are 10 km away), a crossing of about 30 s.
     (Done October 2026: map remodel 13, js/10u, js/08zp, the places table's Iron Key group.)
   - *Construction site*: a half-built tower, cranes, ramps and scaffolding.
     (Asked October 2026:) a whole block of **downtown Palm Heights** among the towers, cleared for it, hoardings along the streets. The
     **half-built tower**: concrete decks joined by ramps like the lunapark car park - **drive or walk up** floor by floor to the open top
     and launch off a ramp there (a stunt jump once they exist). On site: **workers in hi-vis** walking about, carrying things, some up
     on the decks (they run from trouble like anyone); **two tower cranes** turning slowly, lifting beams and pallets to the top floor;
     **a security guard at night** - the gate locked, a guard with a torch walking the fence, trespassing at night gives a star if he
     sees you; **trucks and machines** - a cement mixer, an excavator and dump trucks moving about the site, which you can steal. To play
     with: **ramps and dirt mounds** in the yard to jump cars and bikes off, and **hidden pickups up on the decks** worth the climb.
     Then: the tower is called **SKYLINE ONE** ('SKYLINE ONE - OPENING 1998' on the hoardings, the developer's logo on the crane jibs);
     **6 decks** (the ground, five decks, the open top); the **launch ramp on the top deck sends you over the street** off the tower's
     street side, landing on the avenue or the roofs across it (a hard landing damages the car); at night the gate is locked and you get
     in **on foot through a broken hoarding panel** on a side street (cars wait for the gate to open in the morning).
     (Done October 2026: map remodel 14, js/10v, js/08zt, the places table's Construction site group, the mixer, digger and dump truck
     in the vehicles table. A car flying higher than a building now comes down on its roof; you can get out and walk up there.)
   - *Casino and nightclub strip*: a neon casino, a club with a dancing crowd and a queue at the door.
     (Asked October 2026:) on a main street of **Sunstrip**, for **both modes**. The casino is the **ROYAL FLAMINGO** (a pink neon
     flamingo on the roof, gold lettering); you **go in top-down**, its roof turning see-through (like the Pay 'n' Spray), and walk
     among the tables and machines. Games: **slot machines** (€10 a pull, a rare jackpot) and **dice (craps)** (bets from €50 to
     €5,000); the house wins slightly more often. **Dress code** at both doors: the bouncers turn you away unless you wear something
     smart from the clothes shops (a suit, a dress, aviators...), and never while you are wanted. Trouble inside: shooting brings
     **armed casino guards** and stars, and the **cashier's cage can be robbed** for a big payout and more stars. The club is
     **THE PULSE** (a neon heartbeat line over the door): **inside, top-down**, a queue and a bouncer at the door, a dance floor with a
     dancing crowd, a DJ booth, a bar and lights, music from the radio. **The casino never closes; the club is open 22:00-6:00** (the
     queue and the crowd only then). Along the strip: **neon signs and more people about at night**, and **a row of bars and small clubs**
     (lit fronts, not enterable).
     (Done October 2026: map remodel 15, js/10w, js/08zu, the casino table js/01u, the clothes table's Smart column, mode rows casino and club.)
   - *Marina with boats you drive*: a speedboat, a jet ski and a yacht, each with its own speed and handling, moored at the marina
     and at the grove pier; a police patrol boat from 3 stars.
     (Asked October 2026:) the marina is **SUNSET HARBOR** (an orange sunset sign on the harbour office), on the **inner bay** near the Palm
     Heights shore and Iron Key's ferry pier, for **both modes**. Boats handle **arcade with a slide**: steered like cars but drifting
     through turns, slowing when you let go, bouncing a little on waves - the jet ski nimble, the yacht slow and heavy. You get in and out
     **anywhere and swim**: jump out on open water and swim (**fast and free** - nearly running speed, as long as you like, **no weapons
     in the water**), climb into a boat from the water or from a pier or beach. At the marina: **boats moored to steal** (speedboats, jet
     skis, a yacht, some with owners on deck), a **boat shop** (a bought boat waits at **your own berths at Sunset Harbor**, up to three,
     kept in your saves like a garage), a **fuel dock and a harbour office**, and **boats out on the water** - speedboats and jet skis
     along the coast and across the bay, fishing boats near the docks, a tour boat on a fixed loop. The **police patrol boat from 3 stars
     chases and shoots** (a cop at the bow; it rams; the helicopter's light helps it). A **wrecked boat burns and sinks** like a car, and
     you swim.
     (Added October 2026, the owner:) a **car that drops into the water** gives you **4 s to get out** (E) and swim - after that you
     drown. **About 8 small jetties round the coast** (the bay, the beaches, the islands, near the port), each by a street, where you can
     safely land a boat and go on on foot, **shown on the minimap and the big map with a small anchor**. **Boats sail under the bridges**
     (the bridges stop cars, not boats).
     (Done October 2026: map remodels 16 and 17, js/08zv, js/10x, the boat rows of the vehicles table, the places table's Sunset Harbor
     and In the water groups, mode rows marina and swim; the grove pier's motor boats are real boats too.)
   - *Stunt jumps*: twenty around the city - ramps, loading docks, rooftop gaps, the construction site; hit one fast enough and the
     camera slows down in the air, a bonus for distance and height, each counted once toward 100%.
     (Asked October 2026:) **both modes**. **15 street ramps and 5 jumps over the water**: the street ramps stand **off the traffic
     lanes** (road ends, parks, lots, by the shore) and **Skyline One's launch ramp is one of them**; the water jumps go off quays and
     jetties over the water to the far bank or an island. **Anything on wheels** counts (motorbikes, trucks, the tank too). A jump
     counts when you hit the ramp fast enough, fly far enough and **land upright on your wheels**: UNIQUE STUNT BONUS, **€500 to
     €5,000** by distance and height, each counted once toward 100%; a crash or a short jump does not count (try again), too slow
     gives a small TOO SLOW note. In the air: **slow motion only** (the usual camera). **Hidden until done** - no map icons; a done
     jump gets a small tick on the big map and the stats show how many are left. **Just the ramp** tells you: every stunt ramp looks
     the same (chevrons and two small flags on its lip). Every number in a data table.
     (Done October 2026: map remodel 18, js/08zw, js/10y, the stunt table js/01v, mode row stunts, the stats table's countStunts.)
   - *Interiors, top-down first*: the airport hangars, the port warehouses and storage units you can walk and drive into, their
     roofs turning see-through, with things to find and take inside. (The side-on kind - hotels, offices - later.)
     (Asked October 2026:) **both modes**, **about 12 places**, each different inside: the **3 airport hangars**, **3 port
     warehouses**, a **storage yard with 8 units** you can open, and **3 more warehouses** in the industrial streets (Dockside, Gravel
     Flats). Inside: **cash, weapon and ammo stashes** in crates and on shelves, and **four rare vehicles** - a 1960s **classic car**
     under a dust sheet in a storage unit, a **race bike** (the fastest thing on two wheels) in a warehouse, a **prototype supercar**
     in a hangar, an **armoured van** with money in the back at a warehouse. A rare vehicle taken is **yours** (keep it in a garage);
     lost or left, **a new one is back at its place a game day later**. **Open by day** (workers, open doors; taking things is a
     crime if seen); **at night the doors are shut** - ram the roller door or slip in at the side door; a **night guard** with a torch
     and a pistol, and an **alarm brings 2 stars** if he sees you or a door is rammed.
     (Done October 2026: js/10z, js/08zx, the interiors table js/01w; the storage yard took the office block at the port's south-west
     corner and the hangars' old closed model went.)
2. **World events**: robberies with a getaway car and an armoured cash van to ram; fires, pile-ups with tow trucks, storm blackouts;
   a rocket launch at the space center; a plane in trouble at the airport.
3. **Flying and people with real lives** (below).
Story mode is not started yet: when it is, the open items in docs/STORY.md come first.

## Boat models (asked October 2026; to build after the weekly usage window resets on 19 October)
- **Which**: the speedboat and the jet ski (the ones you drive most, and Tito's escape boat in Quest 01), the yacht and the fishing
  boat, the police boat and the tour boat. (Not the ferry or the cargo ships.)
- **Better shapes**: curved hulls with a pointed bow, a windshield, seats, rails, an outboard engine, a cabin where it fits.
- **Wake and spray**: a white V-wake behind a moving boat and spray at the bow, bigger with speed (its numbers in the places table's
  In the water group).
- Then test (screenshots of each boat, still and moving, phone size too), and **merge** - the Quest 01 fixes still on the working
  branch go live with it (the owner's answer).

## For the future (asked October 2026; ask the details before building)
- **City sounds**: improve the city's own sound (js/02d, the places table's city sound group) - the mix of traffic, people,
  the harbour, the port and the weather; what exactly to improve is to be asked first.
- **People's mumbling**: improve the passers-by voices and the mumbles in the quests' dialogue (js/02, js/08zy) - more varied,
  more like real speech without words; each character keeps their own.
- **The dialogue UI**: a new look for the quests' dialogue box (portrait, bubble, name, the next-line hint; js/08zy and the
  styles) - the layout and style to be asked first.

## Bridges boats sail under (asked October 2026; ask the details before building)
- Today a boat passing a bridge dips out of sight under the deck (js/08zv boatShore, `c.under`) - it seems to disappear. Instead the
  bridges over water are **lifted**: the span over the water high enough that boats (and the police boat, the tour boat, Tito in
  Quest 01) are seen sailing under it, the deck drawn above them, the road ramping up to it from the shore.
- To ask first: all bridges or only those over the boats' routes; a fixed high span, an arched span, or drawbridges that open for
  big boats; how steep the ramps (cars jumping off the top?); the yacht and the tour boat too (taller).
- Likely a map remodel (`tools/remodel_city.py`, the bridge heights in the map data) and the bridge models; the boats' water field
  under the bridges stays as it is.

## Rocks in the water with stunt jumps (asked October 2026; ask the details before building)
- Rocks out in the water (the bay, round the islands, off the beaches) - solid for boats and swimmers - and **stunt jumps on
  them**: ramps on the rocks for boats and jet skis to launch off (a new kind of unique stunt jump, like the twenty on land).
- To ask first: how many rocks and where; only boat jumps or car ramps onto rocks too; whether these jumps count toward 100%
  and pay the stunt bonus like the others; rocks as plain obstacles too, or only where the jumps are.
- Likely a map remodel (`tools/remodel_city.py`: the rocks in the map data, cut out of the boats' water field), the stunt table
  (js/01v) for the new jumps, and boats that can fly off a ramp (today only wheeled vehicles jump).

## Waves on the water (asked October 2026; ask the details before building)
- Waves on the sea and the bay: the water surface moving instead of flat, swell and ripples, white crests on the open sea and
  surf breaking along the beaches; calmer in the harbour and the canals.
- To ask first: how strong, and whether the weather changes them (storms rougher); only a look, or boats rocking and bouncing
  on them too (and jumping off a crest); waves washing up the beach; the phone's speed (a lighter look on small screens).
- Goes with the boat models' wake and spray (Boat models above); the numbers in the places table's In the water group.

## Jet ski races (asked October 2026; ask the details before building)
- Races on the water on jet skis: a course of buoys (gates) round the bay or the islands, rivals on jet skis, a start and a finish,
  best times kept - like the street races and the drag strip (js/08o), on the water.
- To ask first: free roam, story or both (a modes table row); how a race starts (a booth or a buoy at Sunset Harbor, a phone call,
  the race table's booths); how many courses and where (with the rocks and their jumps, and the waves?); how many rivals; the fee
  and the prize (races table, economy sheet); whether you must use a jet ski or any boat; what counts toward 100%.
- Uses the races table (js/01p) and the race engine (js/08o); the course gates as rings on the water and on the maps.

## Later (not now)
- **People with real lives** (asked again October 2026; to be asked about in detail before building): every passer-by and driver
  lives somewhere - a flat, a house, a hotel room - and goes through a day that makes sense: out of the front door in the morning,
  to their own car (parked at the kerb, in a car park or a garage), driving to work, a shop, the gas station, the beach, a
  restaurant, parking there and walking in; later walking out again, back to the car and home for the night. They go into
  buildings and come out of them (their doors), get into and out of cars and drive them like the traffic does, and the streets
  are fuller at the rush hours and emptier at night. The visiting cars at the Colony and the cement works (built October 2026)
  are the first small piece of this.
- **Flying**: see the README's Next steps.
