'use strict';
/* ---------- 1s. PARKS, SQUARES AND PLAZAS ----------
   60 places of the city, each its own design (js/10p builds them): the 44 plazas on the streets, the 6 sports courts and 10 parks on
   the biggest open lawns. Every plaza used to be the same fountain square; now no two are alike - ponds, gardens, playgrounds, a skate
   spot, sculptures, a bandstand... Each has its name on a sign at its entrance.
   kind: what is built there (the list in tools/parks_sheet.py) - a plaza kind goes on a plaza, a court kind on a court, a park kind on a
   park; c: its colour (flowers, paint, the sign). The game picks the places once with the city; always the same ones.
   tools/parks_sheet.py exports this table to Apple Numbers or Excel and reads an edited copy back:
     python3 tools/parks_sheet.py export parks.numbers  /  ... import parks.numbers [--dry-run]
   Keep the JSON between the markers valid. */
const PARKS_TABLE = /*PARKS-JSON*/{
"settings": [
  {"id": "parkMin", "name": "A park needs an open lawn at least this long", "unit": "m", "min": 8, "max": 40, "v": 10, "note": "The side of the biggest clear rectangle on the grass (off the streets); the 10 parks take the biggest such lawns first."},
  {"id": "parkSpacing", "name": "Two parks at least this far apart", "unit": "m", "min": 0, "max": 300, "v": 60, "note": "So the 10 parks spread over the city."}
],
"places": [
  {"id": "fountain_square", "name": "FOUNTAIN SQUARE", "kind": "fountain", "c": "#3fe8ff", "note": "A tiled square round a three-tier fountain, benches facing it, palms in planters at the corners."},
  {"id": "splash_plaza", "name": "SPLASH PLAZA", "kind": "splash", "c": "#2bf3ff", "note": "A splash pad: a soft blue floor with rings of ground jets, shade umbrellas, benches round the edge."},
  {"id": "sculpture_court", "name": "SCULPTURE COURT", "kind": "sculpture", "c": "#ff2bd6", "note": "Abstract sculptures on plinths: a ring, stacked cubes, a twisted column, a big sphere; gravel and lawn."},
  {"id": "clock_square", "name": "CLOCK SQUARE", "kind": "clock", "c": "#ffd23f", "note": "A tall clock column in a ring of flower beds, four faces, lamp posts on the corners."},
  {"id": "veterans_square", "name": "VETERANS SQUARE", "kind": "obelisk", "c": "#e6e0f0", "note": "A white obelisk on steps, flags on three poles, wreaths, a lawn round it."},
  {"id": "bandstand_green", "name": "BANDSTAND GREEN", "kind": "bandstand", "c": "#ff7ab6", "note": "An octagonal bandstand with a striped roof on a lawn, rows of folding chairs in front."},
  {"id": "chess_corner", "name": "CHESS CORNER", "kind": "chess", "c": "#f4f4f6", "note": "A giant chessboard with big pieces mid-game, stone tables with boards round it."},
  {"id": "kids_corner", "name": "KIDS CORNER", "kind": "playground", "c": "#ff4d4d", "note": "A playground on soft red ground: a slide tower, swings, a climbing dome, a sandpit, a see-saw."},
  {"id": "skate_spot", "name": "SKATE SPOT", "kind": "skate", "c": "#a259ff", "note": "A concrete skate spot: quarter pipes, a funbox, a grind rail, ledges, graffiti on the walls."},
  {"id": "fit_plaza", "name": "FIT PLAZA", "kind": "gym", "c": "#3dffa6", "note": "An outdoor gym on rubber mats: pull-up bars, parallel bars, a climbing wall, sit-up benches."},
  {"id": "dog_run", "name": "DOG RUN", "kind": "dogs", "c": "#ffb02e", "note": "A fenced dog run: a red hydrant, jumps, a tunnel, a water bowl, a bench for the owners."},
  {"id": "rose_garden", "name": "ROSE GARDEN", "kind": "roses", "c": "#ff4d6d", "note": "Rings of rose beds in reds and pinks round a sundial-less centre, rose arches over the paths."},
  {"id": "zen_garden", "name": "ZEN GARDEN", "kind": "zen", "c": "#e8e4d8", "note": "Raked white gravel in lines and rings round dark rocks, a stone lantern, a bamboo hedge."},
  {"id": "palm_court", "name": "PALM COURT", "kind": "palms", "c": "#2f8f4e", "note": "A grid of tall palms over pale paving, loungers and side tables in their shade."},
  {"id": "little_theatre", "name": "LITTLE THEATRE", "kind": "theatre", "c": "#ffe14a", "note": "Half-round stepped stone seats facing a small stage under a shell."},
  {"id": "food_truck_plaza", "name": "FOOD TRUCK PLAZA", "kind": "trucks", "c": "#ff7a3d", "note": "Three food trucks, picnic tables, string lights on poles."},
  {"id": "farmers_market", "name": "FARMERS MARKET", "kind": "market", "c": "#3dffa6", "note": "Rows of stalls under striped awnings, crates of fruit and vegetables."},
  {"id": "reflecting_pool", "name": "REFLECTING POOL", "kind": "mirror", "c": "#9fd8ff", "note": "A long shallow pool of still water with lamps along both sides and a bench at each end."},
  {"id": "hedge_maze", "name": "HEDGE MAZE", "kind": "maze", "c": "#2f7a3a", "note": "A square hedge maze with a little statue in the middle."},
  {"id": "pirate_golf", "name": "PIRATE GOLF", "kind": "minigolf", "c": "#ff2bd6", "note": "Mini golf: putting greens with holes and flags, a pirate ship, a skull rock, a waterfall pool."},
  {"id": "carousel_square", "name": "CAROUSEL SQUARE", "kind": "carousel", "c": "#ffd23f", "note": "A small carousel with horses under a striped canopy, turning."},
  {"id": "pergola_walk", "name": "PERGOLA WALK", "kind": "pergola", "c": "#c45aff", "note": "White pergolas covered in purple bougainvillea over a path, benches beneath."},
  {"id": "butterfly_garden", "name": "BUTTERFLY GARDEN", "kind": "butterflies", "c": "#ffe14a", "note": "Wavy beds of bright flowers, a mesh butterfly house, stepping stones."},
  {"id": "bocce_club", "name": "BOCCE CLUB", "kind": "bocce", "c": "#d8b878", "note": "Two bocce lanes of fine gravel with wooden edges, balls in play, a shade roof and benches."},
  {"id": "sundial_square", "name": "SUNDIAL SQUARE", "kind": "sundial", "c": "#ffd23f", "note": "A great sundial: a bronze gnomon over a disc ringed with hour stones."},
  {"id": "the_labyrinth", "name": "THE LABYRINTH", "kind": "labyrinth", "c": "#e6e0f0", "note": "A round stone labyrinth path set in the lawn, a stone seat at its heart."},
  {"id": "flamingo_pond", "name": "FLAMINGO POND", "kind": "flamingos", "c": "#ff7ab6", "note": "A pond with pink flamingo statues standing in it, reeds and lilies round the edge."},
  {"id": "cactus_garden", "name": "CACTUS GARDEN", "kind": "desert", "c": "#d8a878", "note": "Sand and gravel, tall cacti, agaves, boulders, a weathered wagon wheel."},
  {"id": "topiary_garden", "name": "TOPIARY GARDEN", "kind": "topiary", "c": "#3f8a4a", "note": "Hedges clipped into animals - an elephant, a giraffe, a rabbit - and balls on stems."},
  {"id": "rainbow_arches", "name": "RAINBOW ARCHES", "kind": "arches", "c": "#ff2bd6", "note": "An art installation: a row of arches in every colour of the rainbow over a white path."},
  {"id": "picnic_grove", "name": "PICNIC GROVE", "kind": "picnic", "c": "#d84a3a", "note": "Shady trees over picnic tables with checked cloths, barbecue grills, bins."},
  {"id": "lily_pond", "name": "LILY POND", "kind": "lilies", "c": "#3fd0ff", "note": "A round pond covered with lily pads and pink flowers, a frog fountain, a small wooden bridge."},
  {"id": "palm_house", "name": "PALM HOUSE", "kind": "palmhouse", "c": "#bff6ff", "note": "A Victorian glass palm house with a curved roof, palms showing through, beds round it."},
  {"id": "dancing_fountain", "name": "DANCING FOUNTAIN", "kind": "jets", "c": "#2bf3ff", "note": "Rows of jets in a dark pool, lit in colours, that rise and fall in turn."},
  {"id": "heroes_square", "name": "HEROES SQUARE", "kind": "statue", "c": "#c9b26a", "note": "A bronze rider on a tall plinth, lamp posts, flower urns."},
  {"id": "peace_bell_garden", "name": "PEACE BELL GARDEN", "kind": "bell", "c": "#c9773a", "note": "A bronze bell hung in a timber frame, a ring of stones, olive trees."},
  {"id": "water_wall_plaza", "name": "WATER WALL PLAZA", "kind": "waterwall", "c": "#3fe8ff", "note": "A long stone wall with water sheeting down it into a basin, benches facing it."},
  {"id": "mosaic_plaza", "name": "MOSAIC PLAZA", "kind": "mosaic", "c": "#ff7a3d", "note": "Colourful broken-tile mosaic ground, a wavy mosaic bench, a mosaic lizard."},
  {"id": "wind_garden", "name": "WIND GARDEN", "kind": "pinwheels", "c": "#2bf3ff", "note": "Kinetic sculptures: tall poles with turning pinwheels in bright colours."},
  {"id": "sailors_square", "name": "SAILORS SQUARE", "kind": "anchor", "c": "#2a4aa8", "note": "A huge anchor, a ship's wheel, a mast with signal flags, rope bollards."},
  {"id": "domino_corner", "name": "DOMINO CORNER", "kind": "dominoes", "c": "#f4f4f6", "note": "Tables under a pergola where the old men play dominoes, a mural on the wall."},
  {"id": "ping_pong_plaza", "name": "PING PONG PLAZA", "kind": "pingpong", "c": "#3dffa6", "note": "Concrete ping pong tables with nets, benches, a scoreboard."},
  {"id": "open_air_stage", "name": "OPEN AIR STAGE", "kind": "stage", "c": "#ff2bd6", "note": "A stage with a lighting truss and speakers, a standing area in front."},
  {"id": "play_street", "name": "PLAY STREET", "kind": "hopscotch", "c": "#ffd23f", "note": "Games painted on the ground: hopscotch, four square, a giant snakes and ladders, chalk drawings."},
  {"id": "hoops_court", "name": "HOOPS COURT", "kind": "basketball", "c": "#2a5fb0", "note": "An outdoor basketball court with two hoops."},
  {"id": "tennis_courts", "name": "TENNIS COURTS", "kind": "tennis", "c": "#2f8f4e", "note": "A tennis court with its net, a high fence round it, an umpire's chair."},
  {"id": "beach_volley", "name": "BEACH VOLLEY", "kind": "volleyball", "c": "#e8d8a8", "note": "A sand volleyball court with its net and a ball, ropes for the lines."},
  {"id": "handball_walls", "name": "HANDBALL WALLS", "kind": "handball", "c": "#ffb02e", "note": "Two handball walls back to back on concrete, painted lines."},
  {"id": "pickleball_club", "name": "PICKLEBALL CLUB", "kind": "pickleball", "c": "#3fd0ff", "note": "Two small pickleball courts side by side, low nets, a fence."},
  {"id": "futsal_pitch", "name": "FUTSAL PITCH", "kind": "futsal", "c": "#3dbf6a", "note": "A small football pitch with goals and a cage fence round it."},
  {"id": "swan_lake_park", "name": "SWAN LAKE PARK", "kind": "lake", "c": "#3fe8ff", "note": "A lake with an island, a footbridge to it, swan boats, paths and benches round it."},
  {"id": "botanic_garden", "name": "BOTANIC GARDEN", "kind": "botanic", "c": "#3dffa6", "note": "Themed beds, a glasshouse, a pond with a fountain, paths between them."},
  {"id": "adventure_fort", "name": "ADVENTURE FORT", "kind": "fort", "c": "#c9773a", "note": "A wooden fort with towers and bridges, a zip line, a climbing net, a sandpit."},
  {"id": "community_garden", "name": "COMMUNITY GARDEN", "kind": "allotments", "c": "#7a5a3a", "note": "Vegetable beds in rows, a tool shed, water butts, a scarecrow, compost bins."},
  {"id": "japanese_garden", "name": "JAPANESE GARDEN", "kind": "japanese", "c": "#e0364f", "note": "A koi pond with a red arched bridge, a pagoda, stone lanterns, maples and raked gravel."},
  {"id": "little_league_field", "name": "LITTLE LEAGUE FIELD", "kind": "ballfield", "c": "#c9653a", "note": "A baseball diamond with its bases, a backstop, dugouts and bleachers."},
  {"id": "wildflower_meadow", "name": "WILDFLOWER MEADOW", "kind": "meadow", "c": "#ffe14a", "note": "Long grass full of wild flowers, a mown path through it, beehives, a bench."},
  {"id": "mango_orchard", "name": "MANGO ORCHARD", "kind": "orchard", "c": "#ff9f2e", "note": "Rows of mango trees with fruit, a farm stand, crates."},
  {"id": "bmx_track", "name": "BMX TRACK", "kind": "bmx", "c": "#c99a5a", "note": "A dirt track of jumps and berms with a start ramp."},
  {"id": "lookout_hill", "name": "LOOKOUT HILL", "kind": "lookout", "c": "#7a5a3a", "note": "A grassy hill with a wooden lookout tower, a winding path up, benches at the top."}
]
}/*END-PARKS-JSON*/;
const PARKS = Object.fromEntries(PARKS_TABLE.settings.map(r => [r.id, r.v]));
