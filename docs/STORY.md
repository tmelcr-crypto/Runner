# Story mode - notes and open items

STORY mode is built (October 2026, `js/08zzr-story.js` and the story table `js/01za-story-data.js`; see Building STORY below). This file
collects what the owner asked to keep for it, so nothing is lost.

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
their pixel-art portrait); the missions name them by id. Portraits: 48 x 75 pixel art built from the owner's reference picture (answers 117-121), head and shoulders in its 3/4 view, three faces
(calm, angry, smiling) picked by each line's mood - drawn by `tools/portraits.py`, shown in `docs/Characters.docx` (the owner's answers,
October 2026: drawn portraits, free colours per character, everyone who speaks; three faces; one table and a Word sheet; then the
reference picture's style - 48 x 75, transparent, the game drawing the dark ground and the bubble-colour glow behind). A new character gets a row in that table (and a portrait) before their first mission. The story plan's people (Danny, Papa Joe, Esther, Crane, Mateo, Kessler, Rosa, Nina, Sachs, Holloway, Pratt, Sal and Iris) are in
the table now, drawn from the owner's answers 21-107 (October 2026); the minor people come with their quests.

## Approval list

The owner approved all 68 quests as they are (October 2026), and STORY was built from them. MISSIONS TEST keeps every quest
to play again; a new quest is still tested there first.

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
| M07 Bull's Offer | built in MISSIONS TEST (chapter 2, written from the story plan and answers 122-141); Word page `docs/quests/Quest-M07-Bulls-Offer.docx`; waiting for the owner's test | a Kessler man at the Colony; Kessler's office in BULL'S GYM (the boxers keep training); the brick phone; rent from three Dockside shops - Gus Delgado (new) won't pay until his window goes |
| M08 Valet Parking | built in MISSIONS TEST (chapter 2); Word page `docs/quests/Quest-M08-Valet-Parking.docx`; waiting for the owner's test | the first call on the brick phone; Crane's town car from the Royal Flamingo's valet bay to the junkyard and back (150 s, not badly dented); clue 2 - the cap with M. CRUZ inside |
| M09 Market Fire | built in MISSIONS TEST (chapter 2); Word page `docs/quests/Quest-M09-Market-Fire.docx`; waiting for the owner's test | Kessler's two men ride with you, then run for Rosa's stalls with petrol (8 s each); Rosa takes Danny in; Kessler an enemy from now on |
| M10 The Produce Run | built in MISSIONS TEST (chapter 2); Word page `docs/quests/Quest-M10-The-Produce-Run.docx`; waiting for the owner's test | the new produce truck from the Harbor Cold Store to Rosa's market; Kessler's cars ram it; at least 4 of the 8 crates must arrive |
| M11 Betting Shop | built in MISSIONS TEST (chapter 2); Word page `docs/quests/Quest-M11-Betting-Shop.docx`; waiting for the owner's test | Lucky Lou's again (Kessler's now); Kessler's men in two cars; the helper's first shot from a roof (Helper 1) |
| M12 Bull Run | built in MISSIONS TEST (chapter 2, its last quest); Word page `docs/quests/Quest-M12-Bull-Run.docx`; waiting for the owner's test | two of Rosa's men (new: ROSA'S MAN) storm BULL'S GYM with you; the truck chase to the port's east quay; Choice 1 by what you do - shoot him or walk 40 m away |
| C1 Dealer's Choice | built in MISSIONS TEST (the Casino storyline, the Casino line's first quest); Word page `docs/quests/Quest-C1-Dealers-Choice.docx`; waiting for the owner's test | walk Del home from the Royal Flamingo; Lenny Gold's crew (on foot and a car); Del must stay within 120 m |
| C2 Blueprints | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C2-Blueprints.docx`; waiting for the owner's test | THE CROWN's inside (side-on, new, both modes); stealth guards with torches on 8-10 (new, STORY and MISSIONS TEST); the vault plans in Crane Development's office |
| C3 The Uniform | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C3-The-Uniform.docx`; waiting for the owner's test | the laundry van (the truck with a laundry livery - no new vehicle row); the casino guard's uniform (reward clothes, new); mark three cameras and the staff door |
| C4 The Cash Van | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C4-The-Cash-Van.docx`; waiting for the owner's test | the cash depot (new, both modes) - the gate at the hut, 2 stars; the armoured van in the casino's colours; Del's lock-up at the storage yard |
| C5 Fingers | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C5-Fingers.docx`; waiting for the owner's test | the lunapark's FUNHOUSE (new, both modes: mirror maze, tilted room); free Fay from Gold's men; Fay joins |
| C6 Dry Run | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C6-Dry-Run.docx`; waiting for the owner's test | the back door to the lock-up inside 2 minutes; a patrol car sees the van (1 star) |
| C7 Lights Out | built in MISSIONS TEST (the Casino storyline); Word page `docs/quests/Quest-C7-Lights-Out.docx`; waiting for the owner's test | the substation (new, both modes: blown, the strip goes dark, a repair crew); plant three charges past two guards (5 m sight, 2 s) |
| C8 The Vault | built in MISSIONS TEST (the Casino storyline, the Casino line's finale); Word page `docs/quests/Quest-C8-The-Vault.docx`; waiting for the owner's test | the blackout; the uniform through the casino; THE VAULT side-on under the cage (count room, B1-B3); Fay cracks it; the getaway from Gold's men and the police; €100,000 |
| M13 Breaking News | built in MISSIONS TEST (chapter 3 - the trail); Word page `docs/quests/Quest-M13-Breaking-News.docx`; waiting for the owner's test | Nina's call; chase her stolen NEWS VAN, take out Crane's men, the tapes to BAY TV's newsroom; THE PHOTO - Mateo at Crane's door; €3,000 |
| M14 Follow the Money | built in MISSIONS TEST; Word page `docs/quests/Quest-M14-Follow-The-Money.docx`; waiting for the owner's test | tail Sachs' courier from FIRST CORAL BANK to the Palm Heights loft with the SUSPICION bar; Kessler finished: his gang's cars; spared: his tip - the car change at the gas station; €3,500 |
| M15 Press Pass | built in MISSIONS TEST; Word page `docs/quests/Quest-M15-Press-Pass.docx`; waiting for the owner's test | smart clothes; Crane's rally at Bayfront Park's band shell (Crane first seen); the bug in Sachs' briefcase past three guards' sight cones (a cheer turns their heads); €4,000 |
| M16 Cold Storage | built in MISSIONS TEST; Word page `docs/quests/Quest-M16-Cold-Storage.docx`; waiting for the owner's test | Sachs' lock-up at the storage yard at night, the van's LOADING bar; Kessler finished: a three-way fight; spared: the back way in; only copies; €4,500 |
| M17 The Safe | built in MISSIONS TEST; Word page `docs/quests/Quest-M17-The-Safe.docx`; waiting for the owner's test | the Palm Heights loft side-on at night, three bodyguards, the alarm cut and Sachs' door open (helper 2), the originals from his safe; Sachs runs; €5,000 |
| M18 Closing Argument | built in MISSIONS TEST; Word page `docs/quests/Quest-M18-Closing-Argument.docx`; waiting for the owner's test | Nina's call; stop Sachs' limousine before his private jet leaves (the BOARDING bar); CORNERED - Crane's driver has a ledger; Choice 2 by where you drive the files; €6,000; the loft |
| P1 Visiting Hours | built in MISSIONS TEST (the Prison storyline); Word page `docs/quests/Quest-P1-Visiting-Hours.docx`; waiting for the owner's test | Sal's letter; the ferry to Iron Key, the gate's search (as in Quest 05); 1975 over chess; Holloway's three men on the quay back; €2,000 |
| P2 Dunn's Debt | built in MISSIONS TEST; Word page `docs/quests/Quest-P2-Dunns-Debt.docx`; waiting for the owner's test | Officer Dunn's IOU; SHARKEY'S PAWN & LOAN in Mercado, two heavies; the chase for the paper; €2,500 |
| P3 Papers | built in MISSIONS TEST; Word page `docs/quests/Quest-P3-Papers.docx`; waiting for the owner's test | Sal's photo; OTTO'S PRINTING (for good, both modes); Crane's men raid while the press runs (45 s); the new passport to Dunn; €3,000 |
| P4 The Boat | built in MISSIONS TEST; Word page `docs/quests/Quest-P4-The-Boat.docx`; waiting for the owner's test | Dunn's call; Crane's white speedboat from Sunset Harbor's last berth (2 stars); the police boat; hidden at the quiet jetty; €3,000 |
| P5 Laundry Day | built in MISSIONS TEST; Word page `docs/quests/Quest-P5-Laundry-Day.docx`; waiting for the owner's test | Dunn's spare uniform; Suds & Sons' truck onto the ferry (a cutscene crossing); under 20 km/h at the gate; the tools in the third basket; €3,500 |
| P6 The Yard | built in MISSIONS TEST; Word page `docs/quests/Quest-P6-The-Yard.docx`; waiting for the owner's test | Dunn's call; visiting hours; Crane's man inside goes for Sal - the riot; keep Sal alive; €3,000 |
| P7 Night Swim | built in MISSIONS TEST; Word page `docs/quests/Quest-P7-Night-Swim.docx`; waiting for the owner's test | across the bay at night; a hole in the east shore fence; the north-east tower's power box; never in a beam; €3,500 |
| P8 The Breakout | built in MISSIONS TEST; Word page `docs/quests/Quest-P8-The-Breakout.docx`; waiting for the owner's test | Dunn's door and the riot; Sal through the fence into the speedboat; 3 stars - the police boats and the helicopter; FREE MAN at the Colony; €10,000 |
| M19 First Strike | built in MISSIONS TEST (chapter 4 - the war); Word page `docs/quests/Quest-M19-First-Strike.docx`; waiting for the owner's test | Rosa's call; hold ROSA'S MARKET against three carloads; Joe's rank before he runs out of shells; the car that ran Nina's van off the road; THE CREW; €6,000; the war room |
| M20 The Tape | built in MISSIONS TEST; Word page `docs/quests/Quest-M20-The-Tape.docx`; waiting for the owner's test | Marker N; the parcel at the Colony - Mateo's voice on a cassette (clue 4); stop the POLICE VAN with Holloway's money, take out his crooked cops, lose the police in it, to the loft; €8,000 |
| M21 The Councilman | built in MISSIONS TEST; Word page `docs/quests/Quest-M21-The-Councilman.docx`; waiting for the owner's test | Marker N; Pratt at the golf clubhouse; Choice 2 decides - files kept: he talks; files to the police: he calls Holloway, his bodyguards fight, ram his car to a stop; Thursday night; €8,000 |
| M22 The Tip | built in MISSIONS TEST; Word page `docs/quests/Quest-M22-The-Tip.docx`; waiting for the owner's test | The unknown caller (helper 3); Choice 3 by where you go - wait at the cement works' silos, or tail Holloway's cruiser from the police station; THE MEETING; the fight; Holloway gets away; €9,000 |
| M23 Badge | built in MISSIONS TEST; Word page `docs/quests/Quest-M23-Badge.docx`; waiting for the owner's test | Marker N; chase Holloway at 3 stars; your car wrecked - a black town car with the keys (helper 4); THE BRIDGE - arrested by his own officers on Nina's camera; €10,000; the police easier |
| M24 Penthouse Party | built in MISSIONS TEST; Word page `docs/quests/Quest-M24-Penthouse-Party.docx`; waiting for the owner's test | Marker N; Nina with you to the PENTHOUSE tower (side-on): lift to 16, his bodyguards on 17-19; the confession on camera; €12,000; the penthouse |
| M25 Garden Party | built in MISSIONS TEST (chapter 5 - the fall); Word page `docs/quests/Quest-M25-Garden-Party.docx`; waiting for the owner's test | Crane's call; on foot to his gate on Pearl Key (weapons left there); through the guests to Crane at the statue - THE OFFER, Danny says no; two carloads chase you off the island (260 m from them, 150 m off Pearl Key); no pay |
| M26 Locker 47 | built in MISSIONS TEST; Word page `docs/quests/Quest-M26-Locker-47.docx`; waiting for the owner's test | Mateo's whisper; the lunapark's LEFT LUGGAGE lockers before Crane's men (2:30); THE TAPE; four men and two cars - 250 m out of the lunapark alive; €15,000 |
| M27 Taken | built in MISSIONS TEST; Word page `docs/quests/Quest-M27-Taken.docx`; waiting for the owner's test | Rosa's call (the KESSLER switch decides her line); Joe's cab on the junkyard's crane (THE CRUSHER bar), four men; THE STOP BUTTON in the crane's cab; Joe home to the Colony; €15,000 |
| M28 The Proof | built in MISSIONS TEST; Word page `docs/quests/Quest-M28-The-Proof.docx`; waiting for the owner's test | Nina at the Colony's door; Choice 4 by where you drive - Bay TV or the FBI field office; Crane's cars and his black helicopter with a gunner; €18,000 |
| M29 Pearl Key | built in MISSIONS TEST; Word page `docs/quests/Quest-M29-Pearl-Key.docx`; waiting for the owner's test | THE CREW at the war room's door (whoever the side lines bring); Marco's boat or the causeway roadblock; the dock gate, Sal's tunnel, Esther's van or a charge; Rosa's men, Sal, Marco, FBI agents; Iris' satellite; clear the grounds; €20,000 |
| M30 The Fall | built in MISSIONS TEST; Word page `docs/quests/Quest-M30-The-Fall.docx`; waiting for the owner's test | Mateo in the study; Crane's helicopter won't start; the chase to Skyport (Del's armoured van with the Casino line) - ram his limousine to a stop before the terminal; ELECTION NIGHT; dawn with the brothers; the credits; €20,000; the finale |
| H1 No Vacancy | built in MISSIONS TEST (the Colony storyline); Word page `docs/quests/Quest-H1-No-Vacancy.docx`; waiting for the owner's test | Esther's marker E at the Colony's door; the Colony's side-on halls (six floors); seven of Crane's thugs thrown out in a tap-UP scuffle; €3,000 |
| H2 The Inspector | built in MISSIONS TEST; Word page `docs/quests/Quest-H2-The-Inspector.docx`; waiting for the owner's test | tail the inspector's white car (SUSPICION), watch the envelope change hands on foot (WATCHING, not too close); two of Crane's men; €3,500 |
| H3 Kitchen Fire | built in MISSIONS TEST; Word page `docs/quests/Quest-H3-Kitchen-Fire.docx`; waiting for the owner's test | four fires at the hotel's back, the fire engine's water cannon (THE KITCHEN BURNS); the arsonists' black car - ram, take them out; €4,000 |
| H4 The Band | built in MISSIONS TEST; Word page `docs/quests/Quest-H4-The-Band.docx`; waiting for the owner's test | any order: Sammy Sticks - two laps of the speedway oval against Vinnie Rapp; Lola Diamond - THE PULSE's doormen; Teddy Bell - catch his jet ski in a speedboat; each home to the Colony; €4,000 |
| H5 The Deed | built in MISSIONS TEST; Word page `docs/quests/Quest-H5-The-Deed.docx`; waiting for the owner's test | FIRST CORAL BANK held up (hostages face down, three gunmen); the man with the box runs for the getaway car - chase, ram; the deed back to Esther; €4,500 |
| H6 Pool Party | built in MISSIONS TEST; Word page `docs/quests/Quest-H6-Pool-Party.docx`; waiting for the owner's test | night; UP TO THE ROOF at the door; three waves of Crane's crew up the stairs onto the terrace (THE PARTY bar); the band plays; €5,000 |
| H7 Wrecking Crew | built in MISSIONS TEST; Word page `docs/quests/Quest-H7-Wrecking-Crew.docx`; waiting for the owner's test | the WRECKING CRANE's convoy from Skyline One (a dump truck of men, a digger trailing); stop the crane under 45% before it is 70 m from the Colony; the crew; €5,000 |
| H8 The Hearing | built in MISSIONS TEST; Word page `docs/quests/Quest-H8-The-Hearing.docx`; waiting for the owner's test | Finch from his office across town to the COURTHOUSE through two pairs of hit squads; his confession on the steps; the Colony saved; €10,000; the war room moves to the Colony |
| S1 The Pass | built in MISSIONS TEST (the Space storyline); Word page `docs/quests/Quest-S1-The-Pass.docx`; waiting for the owner's test | Iris' marker K by the space center's gate; her visitor's pass; the FUEL TRUCK from the port road to launch control's road under 25% damage, Crane's car chasing; €4,000; the pass |
| S2 Clean Room | built in MISSIONS TEST; Word page `docs/quests/Quest-S2-Clean-Room.docx`; waiting for the owner's test | the lab coat; three suspects (Hal Mercer, Dana Voss, Rick Tolan) on their rounds, their view cones (SEEN); Tolan at the rocket stage (WATCHING); CAUGHT IN THE ACT - he runs for the gate; €4,000; the lab coat |
| S3 Cargo | built in MISSIONS TEST; Word page `docs/quests/Quest-S3-Cargo.docx`; waiting for the owner's test | the guidance unit on a cargo truck from Skyport's cargo apron to the clean room's door (THE GUIDANCE UNIT bar), two BRUISERs ramming; €4,500 |
| S4 Picket Line | built in MISSIONS TEST; Word page `docs/quests/Quest-S4-Picket-Line.docx`; waiting for the owner's test | a crowd with placards and the news van at the gate; four calm men in grey suits - hurt nobody else; the crowd goes home; lead the convoy in; €4,500 |
| S5 The Mole | built in MISSIONS TEST; Word page `docs/quests/Quest-S5-The-Mole.docx`; waiting for the owner's test | Dana Voss' car round the assembly building and out across Gravel Flats; ram, she bails, take her down; the launch codes back to Iris; €5,000 |
| S6 Tracking Dish | built in MISSIONS TEST; Word page `docs/quests/Quest-S6-Tracking-Dish.docx`; waiting for the owner's test | the flight suit from the clean room's lockers; the spare dish on an army truck at the air base's motor pool; the alarm halfway out (stars, two army pickups); the dish beside launch control; €5,000; the flight suit |
| S7 Countdown | built in MISSIONS TEST; Word page `docs/quests/Quest-S7-Countdown.docx`; waiting for the owner's test | night; five blinking charges round the pad, four of Crane's men; pull each before the three-minute timer; €5,500 |
| S8 Lift-off | built in MISSIONS TEST; Word page `docs/quests/Quest-S8-Liftoff.docx`; waiting for the owner's test | Iris at her console in launch control; T-10:00 running fast (about 4 minutes); four waves (the gate, Iris' door, a boat by the pad, all together); the hold at T-0:10; the LIFT-OFF cutscene; €15,000; the pad empty |
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
  - **The Varga line's links** (answer 108, done with chapter 1): Quest 01 opens with Marco knowing Danny from Joe ("Boatman! Joe said you'd
    come..."); in Quest 06 Nico talks of his partners buying the sky, and Lucia's last line points past him ("Nico was only the face. The
    money behind Skyline One has another name."). Still for STORY itself: Del's lines in Quest 03 and Officer Dunn's in Quest 05 turn to
    "we've met" when the Casino or the Prison line came first.
  - **Places the quests dress up while they run** (props, not new buildings): UNCLE SAUL'S PAWN and LUCKY LOU'S over Mercado shop fronts;
    Dockside Motor Works (an interior, held by M03); Esther's car and Joe's cab are the quests' own cars.
- **Chapter 2 of the main story (M07-M12, built October 2026)** - how they join in STORY:
  - **M06 -> M07**: a game day after M06 a Kessler man waits at the Colony's door (his marker, then Kessler's B at BULL'S GYM).
  - **M07 -> M08**: Kessler becomes a contact; the brick phone replaces the pager and the phone booths (answer 123); a game day later Kessler calls at night. The Casino storyline opens: Del's marker D on the strip at night (answer 122 - built next).
  - **M08 -> M09**: Danny keeps Mateo's chauffeur's cap (a STORY wardrobe piece, clue 2); Kessler calls a game day later, at night.
  - **M09 -> M10**: Rosa becomes a contact - her marker R at ROSA'S MARKET the next day; Kessler is an enemy (his men may turn up in Dockside - to settle with the owner when STORY is built).
  - **M10 -> M11 -> M12**: Rosa's marker R, a game day apart each.
  - **After M12**: the Mercado flat (the safehouse already in Mercado) is Danny's, free, without its FOR SALE sign (answer 129); the gym's ring fights stop (answer 126); Choice 1 is kept for chapter 3 (M14, M16) and M27; chapter 3 starts with Nina Park's call (M13).
- **The Casino storyline (C1-C8, built October 2026)** - how it joins in STORY:
  - **Opens** after M07: Del's marker D at the Royal Flamingo's door, at night (answer 122). In C1, if Quest 03 came first, Del's lines say "we've met" (answer 83).
  - **C1 -> C2 -> C3 -> C4**: Del's marker D on the strip, a game day apart, at night. After C3 the guard's uniform is in the wardrobe (answer 137).
  - **C4 -> C5 -> C6 -> C7 -> C8**: Del's marker D at his lock-up (the storage yard's unit nearest the strip), a game day apart, at night. Fay is a contact after C5.
  - **After C8**: €100,000; the armoured van in the casino's colours stays Danny's - in the lock-up and in his garage (answer 138) - the line's gift to the finale: the chase to Skyport (M30); Papa Joe hears about the vault (answer 84). The Royal Flamingo's vault stays empty.
  - **Decided while building (ask to change)**: stealth is STORY and MISSIONS TEST only; the laundry van is the truck with a laundry livery (no new vehicle row, not in traffic); the Crown has ten floors, the night lift goes to 7; the substation stands west of the casino block across from THE PULSE; the depot is the lot just north of the casino block; the funhouse stands west of the lunapark's snack booths.
- **Chapter 3 (M13-M18, built October 2026)** - how it joins in STORY:
  - **Opens** a game day after M12 with Nina's call (M13). From M13 Nina's marker N stands at her desk in BAY TV's newsroom (answer 157).
  - **M13 -> M14 -> M15**: Nina's marker N, a game day apart (M14 and M15 by day; M15 at noon, the rally). **M15 -> M16 -> M17**: marker N at night, a game day apart. **M17 -> M18**: Nina calls the next morning.
  - **Choice 1** (M12) changes M14 (spared: Kessler's call, the courier changes cars; finished: his gang's cars attack) and M16 (spared: the back way in; finished: a three-way fight).
  - **After M15**: Crane holds a rally at Bayfront Park's band shell every game day at noon for two hours (modes: rallies; places table, Rally) until the election (chapter 5) - STORY to switch it on after M15 and off at the election.
  - **After M18**: the PALM HEIGHTS LOFT is Danny's, free (STORY; FREE ROAM still sells it); Choice 2 is kept for chapter 4 (files to the police: a star at the start of chapter 4's quests until M23, M21 a fight; kept: M21 without a fight). Chapter 4 opens with Rosa's call (M19).
  - **Decided while building (ask to change)**: the courier's route goes by the gas station up north in both versions (only the spared one changes cars); the rally has three guards and a cheer every 10-16 s that turns their heads for 4 s; M15's smart clothes: any smart piece you wear, or Nina's black suit jacket; Sachs' lock-up is the street-side unit furthest from Del's; the loft has six floors (lift to 2 at night), Sachs' office on 5; the private jet is a prop on the apron's south-west corner for M18; a lawn was cleared in front of the band shell (both modes).
- **Chapter 4 (M19-M24, built October 2026)** - how it joins in STORY:
  - **Opens** a game day after M18 with Rosa's call at night (M19). M20, M21, M23 and M24 start at Nina's marker N in the newsroom, a game day apart; M22 is the unknown caller's call late on the night after M21 (Pratt's Thursday).
  - **Choice 2 carried on**: files to the police - a star at the start of M19-M22, and M21 is the fight and the chase; files kept - M21 is a talk. **Choice 3** in M22 by where Danny goes (the silos, or the police station); kept for chapter 5 (MS_CHOICE.tip: trusted / own way).
  - **After M19**: the crew's war room behind the red door on the loft's top floor (modes table warRoom; after H8 the Colony's top floor). **After M23**: the police come a third slower and give up a third sooner for good (modes table setting copEase). **After M24**: the PENTHOUSE is Danny's, free (STORY; FREE ROAM still sells it); chapter 5 opens.
  - **Decided while building (ask to change)**: Joe's rank is the nearest taxi rank a fair drive from the market; Nina's van is run off the road a few streets from the newsroom; the police van leaves by the port's north gate; Pratt's car is a white sedan in the clubhouse car park and crawls while his bodyguards fight you; the meeting is in the cement works' car park by the gate, below the silos; Holloway's cruiser is six times as tough in M23 (you drive him to the bridge, you can't stop him); the bridge is the long one from Mercado to Fairway Isles; the lift goes to 16 in M24, the party is on floor 20; the unknown caller has no portrait on purpose (a shadow and a question mark).
- **The Colony storyline (H1-H8, built October 2026)** - how it joins in STORY:
  - **Opens** at the start of chapter 4 (with M19): Esther's marker E outside the Colony's front door on the ring drive (answer 175); each quest a game day after the last (H6 at night).
  - **H1 -> H8**: after H4 the band plays at the Colony (they are on the roof in H6); after H5 Esther holds the real 1953 deed; after H7 the WRECKING CRANE is back at Skyline One; after H8 Crane's deed and demolition order are void (Finch's confession), and Finch is a witness for chapter 5.
  - **After H8**: the crew's war room moves from the loft to the Colony's top floor (`MS_UNLOCK.colonyWar`; the same red door in the Colony's side-on view); the line's gift to the finale: Esther's staff and guests help in M29 (the laundry van through the gate as a decoy).
  - **Decided while building (ask to change)**: four new characters - Vinnie Rapp (the loan shark who races), Sammy Sticks (drums), Lola Diamond (vocals), Teddy Bell (trumpet); H4's race is two laps of the speedway oval from the east straight in Vinnie's spare BRUISER (a race on the oval rather than through the streets); THE PULSE's doormen are a bouncer with a bat and two with fists; Teddy's jet ski circles off the Colony's own beach and a speedboat waits at the water's edge behind the hotel; H5's hostages lie face down (a new pose) and get up when the hall is cleared; H6's crew pull up on the street nearest the door (the ring drive is a driveway, off the roads) and walk in; from a roof you cannot shoot people on the ground (nor they you); H7's digger trails far behind and its driver does not count; H8's Finch hides in his office about 950 m from the courthouse on the far side from the Colony (the courthouse stands close to the Colony, too close for an escort), and Esther waits on the courthouse steps.
- **The Space storyline (S1-S8, built October 2026)** - how it joins in STORY:
  - **Opens** at the start of chapter 4 (with the Colony line): Iris' marker K by the space center's gate; each quest a game day after the last (S7 at night, S8 at dusk).
  - **S1 -> S8**: after S1 the gate opens for Danny (Iris' pass, `MS_UNLOCK.spacePass`); after S2 Rick Tolan is in custody (his "I wasn't the only one" leads to S5) and Danny has the LAB COAT; after S3 the guidance unit and after S4 the second stage are in the clean room; after S5 Dana Voss is caught and the codes are back; after S6 the dish stands beside launch control and Danny has the FLIGHT SUIT (the base's guards take him for a pilot); after S8 the pad is empty (`launchEmpty`).
  - **After S8**: the line's gift to the finale: the satellite - every one of Crane's men shows on the map in chapter 5 (`MS_UNLOCK.launched`).
  - **Decided while building (ask to change)**: three new characters - Hal Mercer (fuel), Dana Voss (guidance) and Rick Tolan (the night supervisor, the saboteur in S2); the mole of S5 is Dana Voss (Tolan named no one, only that he was not the only one); the fuel truck is driven off to the port road and goes back to launch control's road; S2's suspects walk rounds of their own round the assembly building with corner waypoints (one goes into the clean room at half time); S3's cargo truck waits on Skyport's cargo apron and the unit goes to the clean room's door; S4's crowd is fourteen with placards, the four ringleaders are calm men in grey suits, and the convoy (two trucks) waits on the gate road and follows while you are within 60 m; S5's Voss drives a round of the assembly building first, then out of the gate across Gravel Flats; S6's dish is on an army truck by the motor pool's long shed (not in a hangar) and the chase is two army pickups with the base's own stars, the truck three times as tough; S7's charges blink red round the pad, each pulled by standing at it for 2.5 s; S8's countdown runs 2.5 times faster, its boat lands west of the pad with three sappers (ten seconds at the rocket and it blows), and at T-0:10 the clock holds till the attackers are gone.
- **The Prison storyline (P1-P8, built October 2026)** - how it joins in STORY:
  - **Opens** at the start of chapter 3: Sal's letter at the Colony's desk; his marker S by the Iron Key ferry's kiosk on the promenade. P2, P3, P5 and P7 start there with Officer Dunn waiting; P4, P6 and P8 start with Dunn's call.
  - **P1 -> P8**: a game day apart (P7 at night, P8 the night after P7). After P2 Dunn owes Danny; after P3 Otto is a contact and OTTO'S PRINTING stands in Mercado (both modes, from the start); after P5 Dunn's spare uniform is in the wardrobe (STORY), a disguise on Iron Key; P4's speedboat waits at the quiet jetty for P8; P7's hole in the shore fence and dark north-east tower are P8's way out.
  - **After P8**: Sal lies low at the Colony (Esther gives him a room) as Salvatore Bianchi; his marker S moves there for the finale's links (answer 156). The line's gift to the finale: Sal's story of 1975 (and Dunn on the inside).
  - **Decided while building (ask to change)**: Sharkey's pawn-and-loan is a Mercado shop front under his sign for the quest; OTTO'S PRINTING's shop front is fixed (kept from other quests); Crane's berth is Sunset Harbor's last; the quiet jetty is the one furthest from Sunset Harbor; the laundry truck is the truck with Suds & Sons' livery (as in C3); the shore fence is the quests' prop on Iron Key's east side; the searchlights' power boxes stand outside the walls at each tower's foot.
- **Chapter 5 - THE FALL (M25-M30, built October 2026)** - how it joins in STORY:
  - **Opens** a game day after M24 with Crane's call at dusk (M25). M26 is Mateo's whispered call the night after; M27 Rosa's call the next night; M28 Nina's marker N at the Colony's door the day after; M29 Rosa's marker R at the war room's door (the Colony's with the Colony line done, else the loft's) on election eve, at night; M30 follows M29 straight on.
  - **The switches** (MISSIONS TEST; STORY sets them itself): Choice 1 (KESSLER) changes Rosa's line in M27; **Choice 4** (THE PROOF) is made in M28 by where Danny drives the tape - Bay TV: two guards fewer in M29 (the city is watching) and Danny arrests Crane in M30; the FBI: Special Agent Reyes and two agents at the gate in M29, and Reyes arrests Crane. Each side line's switch is DONE in STORY once its last quest is passed (Quest 06, C8, P8, H8, S8).
  - **The side lines' gifts to the finale**: Varga - Marco's speedboat to Crane's dock (and Marco fights); Prison - Sal's tunnel from the old boathouse to the folly (and Sal fights); Colony - Esther's laundry van through the gate; Space - every guard on the map (Iris' satellite); Casino - Del's armoured van for the chase in M30.
  - **After M30**: the end - the credits, then free play. Mateo is a contact; the daily income at midnight (STORY only: Joe's cabs and Rosa's market always, the side lines' businesses when done - economy table); Crane's billboards sprayed over and the rallies stopped for good; the sunburnt tourist by the Colony's door; Crane's estate stays guarded (answer 197).
  - **Decided while building (ask to change)**: the estate was fitted to Pearl Key's south peninsula (map remodel 19) - the gate on the causeway road (north), the mansion with its door north, the helipad east, the folly in the west garden, the dock gate and jetty south; the **old boathouse** for Sal's tunnel stands on the shore outside the west wall; the LEFT LUGGAGE lockers stand just inside the lunapark's gate, west of it (clear of the big wheel); the FBI field office is a new unique building in Palm Heights (161 now); M25's party is round the statue in the west garden, your weapons are held at the gate (as in Quest 05) and you lose the chase 260 m from his men and 150 m off Pearl Key; M26's race clock is 2:30; in M27 the crane lifts slowly while you are within 250 m (about 50 s to the crusher) and Joe is taken home to the Colony; in M28 Nina waits at the Colony's door rather than the newsroom, and the helicopter has 400 health, a burst every 3.5 s, 35% of shots hitting for 16; in M29 the way in goes by the first that applies - the dock (Varga), the tunnel (Prison), the van (Colony), a charge; Sal waits at the folly whenever the Prison line is done; the FBI agents open the gate; your friends can fall without failing the quest; in M30 Crane drives for the terminal's drop-off on his way to the jet, and the quest fails if he reaches it; Special Agent Reyes is a new character (letter F).
- **All 68 quests are built** in MISSIONS TEST (October 2026) and approved by the owner; STORY joins them with the connectors above.

## Building STORY (October 2026, answers 198-206 in `docs/STORY-QA.md`)

- **The order**: the connectors above as a table - each quest's line, the quests before it (`after`) and how long after (`wait`: day -
  the next game day at its own hour, same - that night, now - at once), in `js/01za-story-data.js` (the settings in it:
  `python3 tools/settings_sheet.py story export story.numbers`). How each starts (a marker, a call, a page) comes from the missions table.
- **The start** (198, 199): a new STORY game opens with M01's arrival; Danny has €0, his fists and no car (the Colony room on credit).
- **The clock** (200): "a game day later" is the game clock - the next day at the quest's hour (or 9:00); a quest's own hour moving
  the sky does not count as time gone by.
- **Kessler's men** (201): from M09 until M12, in Dockside (modes table `kesslerHunt`; the numbers in the story table).
- **The STORY page** (202): on the pause menu (modes table `storyPage`).
- **The police** (203): a marker quest says LOSE THE POLICE FIRST; a call waits until they are gone.
- **Timed calls** (204): M13, M18 and M26 ring only near where they begin.
- **Your own car** (205): no car is put out; a quest's "your car" is the one you came in, else none.
- **No replays** (206): a passed quest is done; MISSIONS TEST plays any quest again.
- **Decided while building (ask to change)**: a marker quest is set up when you come within 45 m and goes quietly 120 m off before
  START (story table); day markers 6:00-20:00, night markers the rest; an unanswered call rings for 30 s and again an hour later; a
  failed quest waits until you have walked off its marker before it sets up again; the first quest of each main chapter shows the
  chapter's title card; the rewards as given: the safehouses (flat M12, loft M18 and M19, penthouse M24), Marco's captain's cap
  (Quest 01) and Mateo's chauffeur's cap (M08) as two new reward hats (the clothes table, a peaked cap), the guard's and prison guard's
  uniforms, the lab coat and the flight suit to the wardrobe, Marco's white speedboat to your first free berth at Sunset Harbor, the
  C8 armoured van to the first free space of a safehouse of yours; a quest's setup that dresses Danny (S2's coat) is undone if you
  walk off before START; the "we've met" lines (Del in Quest 03 and C1, Dunn in Quest 05 and P2) when the other line came first.
- **Story-wide things settled** (October 2026, `docs/STORY-QA.md`): the space center's entry (answer 31); the player speaks like
  everyone else (6); a failed quest is retried from its marker with nothing lost (63); STORY saves as now, never during a quest.

## Settled for story mode

- Hidden pickups (weapons, ammo, health, body armor, heat reducers): 30% of the free roam count (modes table, `pickups`).
- Every feature so far is on in both modes (modes table).
