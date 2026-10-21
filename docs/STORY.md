# Story mode - notes and open items

Story mode is built later (it shows as COMING SOON). This file collects what the owner asked to keep for it, so nothing is lost.
When work on story mode starts, go through the open items with the owner first.

## Open items

1. **Space center entry (Gravel Flats)** - answered (October 2026, `docs/STORY-QA.md` answer 31): both, by quest - a pass from
   the Space center storyline's first quest, then a lab coat or a flight suit (from the clothes) also gets you past the guards.

**The whole story** (October 2026): the owner's answers are in `docs/STORY-QA.md`; the story plan made from them - 68 quests,
the chapters, the side storylines, the choices and the finale - is `docs/STORY-PLAN.md` (a Word copy: `docs/Story-Plan.docx`,
from `tools/story_plan_doc.py`), waiting for the owner's approval. The Varga quests below are its Varga storyline (V1-V6).

## Quest pages (asked October 2026)

The owner writes each quest in a document; the game's story data is made from it. The layout, as answered:

- **A Word file (.docx) that opens in Pages**: the pages laid out with headings, grey example text and picture boxes; filled in
  on any device and sent back with the pictures. **One test mission** first, filled in by me as a worked example (two
  characters, a cutscene, a few steps, a reward) for the owner to change.
- **Characters: in each quest** (its own Characters page, even for someone who appears again). **One portrait each** from the
  owner: head and shoulders, a square PNG about 512 px, plain or see-through background, shown beside their bubble. The
  pictures are **static**; only the **speech bubbles** show, the text appearing letter by letter with a **mumble** (no real
  speech) **different for each character - I choose each one** from the picture and description.
- **Dialogue: the game pauses**; portrait and bubble; **tap (or E) for the next line**.
- **The objective part**: the story in a few sentences, then **the steps in order, each starting with a word from a menu**
  (GO TO, TALK TO, GET IN, FOLLOW, CHASE, TAKE OUT, COLLECT, DELIVER, LOSE THE POLICE, SURVIVE...), what fails it and any time limit.
- **In-game cutscenes (autoplay)** as **a shot list**: where, who is there, what they do or where they walk or drive, the camera
  (close, wide, following), how long, which dialogue line shows. (The cutscene engine from the scenic flight, js/15c, is there.)
- **Rewards**: **cash**, **vehicles and clothes** (a car in your garage, a piece for your wardrobe), **unlocks** (the next
  mission, a place or property - a safehouse, the space center's gate - a new contact). Not weapons.
- **Start**: **either** a marker on the map (the giver's initial in a circle; walk in and the opening cutscene plays) or a phone
  call - each mission says which.
- **Failing**: MISSION FAILED with the reason; **retry from the marker** any time (the opening cutscene can be skipped).

**The files** (made October 2026, sent to the owner): `docs/quests/Quest-template.docx` - the blank layout, one copy per quest -
and `docs/quests/Quest-01-Harbour-Favour.docx` - the test mission filled in: Marco Vale of the Sunset Harbor boat shop sends you
after his courier Tito Ruiz (a boat chase across the inner bay, a foot chase on the Dockside quay, the bag back to Marco; three
cutscenes, seven lines; €2,000, Marco's speedboat, his captain's cap, quest 02 by phone). Seven pages: at a glance (with the time
limit), characters (portrait box, map letter, role, looks and manner, bubble colour, picture file, the mumble I choose), story and
steps (the step-word menu, the fails and their words on screen), dialogue (who, the line, when, mood; about 90 letters a line),
cutscenes (camera words WIDE, CLOSE, FOLLOW, OVERHEAD, FIXED, PAN; a shot list per cutscene: where, who, what happens, camera,
seconds, line), rewards and start (marker or phone call, failing and retrying), notes for building (places, people and things,
music, anything new, the pictures to send). Waiting for: the owner's pictures and changes to the test mission.

## MISSIONS TEST mode (asked October 2026)

A third mode where every new mission is played in the game before it goes into STORY. As answered:

- **On the NEW GAME screen**, a third button next to FREE ROAM and STORY (for anyone who opens the game).
- **Picking a mission: only a list** - MISSIONS (on starting the mode and in the pause menu); pick one and it starts. No markers on the map.
- **The world: like STORY** - a third column `test` in the modes table, copied from STORY, so missions are tested as they will be played.
- **Helpers**: restart the mission, jump to any step, replay a cutscene; **mission info on screen** (the step's number and word, timers,
  the fail checks).
- **Never saved**: every test starts fresh (no saving, no autosave).
- **Start kit: everything** - lots of cash, every weapon full, full health and armour.
- **Approval: the owner tells me in chat** ("Quest 01 approved", or what to change); the list below keeps each quest's state.
- **Quest 01 (Harbour Favour) is built first**, from the sample in the Word file, with placeholder portraits (a plain silhouette with the
  character's letter) until the owner's pictures come.

## Characters

Every character is in one table, `js/01y-character-data.js` (name, letter, colours, mumble, who they are, how they look, the recipe of
their pixel-art portrait); the missions name them by id. Portraits: 48 x 48 pixel art, head and shoulders in a 3/4 view, three faces
(calm, angry, smiling) picked by each line's mood - drawn by `tools/portraits.py`, shown in `docs/Characters.docx` (the owner's answers,
October 2026: drawn portraits, 48 x 48, free colours per character, everyone who speaks; 3/4 view; three faces; a dark ground glowing in
the bubble colour; one table and a Word sheet). A new character gets a row in that table (and a portrait) before their first mission. The story plan's people (Danny, Papa Joe, Esther, Crane, Mateo, Kessler, Rosa, Nina, Sachs, Holloway, Pratt, Sal and Iris) are in
the table now, drawn from the owner's answers 21-107 (October 2026); the minor people come with their quests.

## Approval list

| Quest | State | Notes |
| --- | --- | --- |
| 01 Harbour Favour | built in MISSIONS TEST (placeholder portraits); the owner's first test fixed (START MISSION by Marco, no guide line in cutscenes, Tito's boat round the bay, his fixed way on foot, a sunk boat fails it); second round (October 2026): no guide line at the start, Tito by Marco with the bag runs down pier 1 to his boat in the opening, faster speech (tap anywhere), Tito docks at the jetty's head and steps off by his boat, the bag drops where he is caught, 20 s to come ashore before the 150 m foot limit (new number ashoreIn - for the Word page); waiting for the owner's next test, changes and pictures | Tito heads for the jetty in Mercado, across the bay (Dockside is 8 km away). The player says nothing - asked whether the player should speak |
| 02 Dock Rats | built in MISSIONS TEST (placeholder portraits), written by me from the owner's answers (October 2026: Quests 02-06 one story, the Varga crew; long talks + live lines; a friend who follows, fights and rides along; missions only); Word page `docs/quests/Quest-02-Dock-Rats.docx`; waiting for the owner's test | Lucia's first quest as a friend; Rocco can die (only his phone matters) |
| 03 Paper Trail | built in MISSIONS TEST (placeholder portraits), written by me (the Varga storyline); Word page `docs/quests/Quest-03-Paper-Trail.docx`; waiting for the owner's test | at night (The Pulse opens at 22:00); Nico's first lines (a phone call) |
| 04 Hot Cargo | built in MISSIONS TEST (placeholder portraits), written by me (the Varga storyline); Word page `docs/quests/Quest-04-Hot-Cargo.docx`; waiting for the owner's test | Sol Okafor (new, the crane foreman) helps with a shotgun; the Harbor Cold Store is held by the mission (door up, no workers or guard); any time of day |
| 05 Island Visit | built in MISSIONS TEST (placeholder portraits), written by me (the Varga storyline); Word page `docs/quests/Quest-05-Island-Visit.docx`; waiting for the owner's test | alone; Ivo Varga and Officer Dunn new; your weapons wait at the gate during the visit; a melee riot (a bat from Ivo); the boat chase on the bay |
| 06 Skyline | built in MISSIONS TEST (placeholder portraits), written by me (the Varga storyline, the finale); Word page `docs/quests/Quest-06-Skyline.docx`; waiting for the owner's test | at night; Marco and Lucia both help (they climb the tower with you); Nico jumps his car off the launch ramp; Sol in the closing; Lucia's last line leaves the door open for the next storylines |
| M01 Last Flight | built in MISSIONS TEST (chapter 1 of the main story, written by me from the story plan); Word page `docs/quests/Quest-M01-Last-Flight.docx`; waiting for the owner's test | the arrival cutscene at night (MIRAVISTA, 1997, the first CRANE FOR MAYOR billboard), then the morning: Joe rides in his cab, the fare runs off without paying; hurting the fare fails it |
| M02 Special Delivery | built in MISSIONS TEST (chapter 1); Word page `docs/quests/Quest-M02-Special-Delivery.docx`; waiting for the owner's test | the first page (the pager, STORY and MISSIONS TEST only) and a call from a phone booth; two scooter thieves; Uncle Saul's pawnshop (UNCLE SAUL'S PAWN over a Mercado shop front while the quest needs it) |
| M03 Grease Monkey | built in MISSIONS TEST (chapter 1); Word page `docs/quests/Quest-M03-Grease-Monkey.docx`; waiting for the owner's test | Mateo's first clue from Manny at Dockside Motor Works (the quest holds the garage); the hot car brings 2 stars; the junkyard only with no stars |
| M04 Collection Day | built in MISSIONS TEST (chapter 1); Word page `docs/quests/Quest-M04-Collection-Day.docx`; waiting for the owner's test | Lucky Lou's betting shop (LUCKY LOU'S over a Mercado shop front); two heavies with a bat and fists; Lou's convertible; the first time Danny hears of Bull Kessler |
| M05 Wrong Street | built in MISSIONS TEST (chapter 1); Word page `docs/quests/Quest-M05-Wrong-Street.docx`; waiting for the owner's test | Esther's page; four of Kessler's men at the airport rank; the two cops at the airport gate look the other way (my choice - Crane owns the police; the fight sits right by their post, so they would always give stars - change it if you like); Joe to the Mercado hospital in 80 s with Kessler's car behind |
| M06 Harbour Lights | built in MISSIONS TEST (chapter 1, its last quest); Word page `docs/quests/Quest-M06-Harbour-Lights.docx`; waiting for the owner's test | Joe in a sling at the hospital; Esther's turquoise convertible; lose Kessler's two cars (80 km/h at most, 120 m for 3 s); Joe drops Danny at the quay and drives Esther's car home; Marco meets "the boatman" - the Varga storyline opens |

## Connectors - joining the quests into STORY

STORY mode is built in one piece once every quest is approved, from this list. Each quest page says how it starts and what it unlocks;
the connectors below add what happens between quests. Filled in as each quest arrives.

- **The start of STORY**: where you wake, what you carry and own (to settle with the owner), and how the first quest is found (Quest 01's
  marker M at Sunset Harbor).
- **Between two quests**, for each pair: how the next one starts (the giver's marker, or a phone call - who, and how long after), what the
  one before unlocks (a contact, a place or property, a vehicle, clothes), anything that changes in the city (a gate opens, a shop, the
  police), and whether you must be somewhere or at a time of day.
- **01 -> 02**: Marco phones a game day after Quest 01 is passed; from Quest 01 on Marco is a contact who can call you. Quest 02 (Dock Rats)
  starts with that call.
- **02 -> 03**: Lucia becomes a contact; Quest 03 (Paper Trail) is her marker at the casino strip (Del the croupier keeps the Vargas' books), at night.
- **03 -> 04**: Del becomes a contact (casino tips); Quest 04 (Hot Cargo) is Marco's marker at the harbour the next day - Dockside's warehouse three, Sol the foreman.
- **04 -> 05**: Sol becomes a contact (a friend on the quays at Dockside); Lucia phones a game day later and Quest 05 (Island Visit) starts with that call - Ivo Varga on Iron Key wants to meet you.
- **05 -> 06**: Ivo becomes a contact (word from Iron Key now and then); Quest 06 (Skyline) is Marco's marker at the harbour the next day - Skyline One, Nico's tower.
- **After 06**: the Varga story is over - Marco's office stays his (the harbour safe), Marco and Lucia offer work; Ivo's money went into evidence (he won't like it). The owner's next request (October 2026): the characters' looks in pixel art, then the whole story - about 70 quests, the main line plus side storylines that tie together near its end - after at least 100 questions.
- **The Varga storyline (Quests 02-06, as answered October 2026)**: 02 Dock Rats (Marco, phone; Lucia helps) - 03 Paper Trail (Lucia; the casino
  strip, the ledger, a car chase; Lucia helps) - 04 Hot Cargo (Marco; Dockside, Marco's stolen engines on a truck; Sol the foreman helps) -
  05 Island Visit (Lucia, phone; Iron Key, the jailed Ivo Varga, a riot; alone) - 06 Skyline (Marco; Skyline One, Nico Varga; Lucia and Marco help).
- **Chapter 1 of the main story (M01-M06, built October 2026)** - how they join in STORY:
  - **The start of STORY -> M01**: STORY opens with M01's arrival cutscene at night (Skyport, the last flight); in the morning you walk out of
    the Colony's door with a room on credit (the Colony is your first safehouse) and Joe's marker J waits by his cab on the ring drive.
  - **M01 -> M02**: Joe becomes a contact who can page you; a game day later the pager buzzes (JOE - CALL ME) and M02 starts at the nearest phone booth.
  - **M02 -> M03**: Uncle Saul becomes a contact (Mercado); M03 is Joe's marker J at the Coral Shore rank the next day.
  - **M03 -> M04**: Manny becomes a contact (Dockside Motor Works); Joe pages you a game day later; M04 starts at a phone booth.
  - **M04 -> M05**: a game day later Esther pages you (a message, no call - she is your landlady at the Colony) and M05 starts at once.
  - **M05 -> M06**: Esther becomes a contact who can page you; M06 is Joe's marker J outside the Mercado hospital the next day (Joe in a sling).
  - **M06 -> chapter 2 and the Varga storyline**: Marco becomes a contact; the Varga storyline opens - Quest 01's marker M at Sunset Harbor,
    playable any time from now (answer 25); chapter 2 (M07) follows as the story plan says. The billboards and the pager are STORY only.
  - **Places the quests dress up while they run** (props, not new buildings): UNCLE SAUL'S PAWN and LUCKY LOU'S over Mercado shop fronts;
    Dockside Motor Works (an interior, held by M03); Esther's car and Joe's cab are the quests' own cars.
- **Story-wide things settled** (October 2026, `docs/STORY-QA.md`): the space center's entry (answer 31); the player speaks like
  everyone else (6); a failed quest is retried from its marker with nothing lost (63); STORY saves as now, never during a quest.

## Settled for story mode

- Hidden pickups (weapons, ammo, health, body armor, heat reducers): 30% of the free roam count (modes table, `pickups`).
- Every feature so far is on in both modes (modes table).
