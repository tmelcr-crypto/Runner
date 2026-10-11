# Agreed with the owner: what to build next, and how

These are the owner's answers (October 2026), so the work can go on without more questions. Build in this order; each finished
step is tested, pushed and merged into `main` (the owner chose: merge each finished part). Every new feature gets a row in the
modes table (`js/01j-mode-data.js`) - all of these are for **both** free roam and story - and its numbers in a data table.

## 1. Pay 'n' Spray - done
Four garages, see-through roof, any colour, €100, police lose you unseen. See the README.

## 2. Fixes and small items
- **Pipe bombs** sometimes missing from the weapon wheel after picking them up: find and fix.
- **Police tank at 5 stars** fires rockets: one every 4 s, only at you, only with a clear line, up to about 60 m, leading a moving car
  a little; the blast is the rocket launcher's (cars and people near it too).
- **APC turret machine gun**, for you and the police: driving an APC, FIRE shoots the turret at the nearest target ahead - endless
  belts of 100, reload time as the machine gun on foot. A police APC (3 stars up) fires at you the same way when it sees you.
- **Edge glow**: a lime glow (the guide line's colour) on the screen edge toward a ringing phone booth, and toward the guide line's
  target (job fare, race start, export bay, next checkpoint) whenever it is off screen; it pulses gently, stronger as you get close.

## 3. The Colony on the beach, the lunapark car park
- **The Colony hotel** is rebuilt on the Sandbar beach east of the start, between the Bay Wheel and the lighthouse: three times
  bigger, solid (the old one by the hospital had see-through faces; its lot becomes ordinary buildings), with its own park and a
  fountain between the hotel and the sea, a driveway from the avenue. Its free room is the first safehouse (see 4).
- **Lunapark car park** (the old lot half in the water goes): a multi-storey car park beside the lunapark gate - concrete, ramps up
  to 3 decks and an open roof deck; the decks above you turn see-through so you always see your floor; parked cars on every deck;
  a pay booth with a barrier at the entrance. Map remodel version 4 (`tools/remodel_city.py`).

## 4. Safehouses
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

## 5. Car showroom and tuning (Sunstrip)
- A glass showroom on a main street in Sunstrip, cars on turntables: every car kind plus three rare ones sold only there (a
  supercar, a classic convertible, a muscle car). A bought car is delivered to a safehouse garage or parking space you choose.
- **Tuning** at its workshop: paint, a two-tone roof, racing stripes; wheel rim and underglow colours; a spoiler, a bonnet scoop;
  engine, brakes, armour in price steps (vehicle table). Tuning is kept with the car in your garages and saves.

## 6. Junkyard and car crusher (Gravel Flats)
- A fenced yard in the industrial north-west: stacks of wrecks (solid, some smashable), a magnet crane, the crusher, a shack and a
  guard dog that chases you on foot. Drive a car onto the crane's spot and get out: the magnet lifts it into the crusher, a cube
  comes out, you are paid by kind and damage (economy table). Crushing a police car is a crime only if a cop sees it.

## 7. Police: roadblocks and the helicopter
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
