# Story mode - notes and open items

Story mode is built later (it shows as COMING SOON). This file collects what the owner asked to keep for it, so nothing is lost.
When work on story mode starts, go through the open items with the owner first.

## Open items

1. **Space center entry (Gravel Flats).** The space center is built and fenced, and its gate stays shut for now. Later the
   way in comes with the story: the guards let you through *with permission* (a mission, a pass, a contact) *or in certain
   clothes* (a disguise - a uniform, a lab coat, a flight suit). Needs a clothing / disguise system and the guards checking it.
   Asked for on 2026-10-10; to be designed together with the story.

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

## Approval list

| Quest | State | Notes |
| --- | --- | --- |
| 01 Harbour Favour | sample sent; to be built in MISSIONS TEST; waiting for the owner's changes and pictures | the player says nothing in it - asked whether the player should speak |

## Connectors - joining the quests into STORY

STORY mode is built in one piece once every quest is approved, from this list. Each quest page says how it starts and what it unlocks;
the connectors below add what happens between quests. Filled in as each quest arrives.

- **The start of STORY**: where you wake, what you carry and own (to settle with the owner), and how the first quest is found (Quest 01's
  marker M at Sunset Harbor).
- **Between two quests**, for each pair: how the next one starts (the giver's marker, or a phone call - who, and how long after), what the
  one before unlocks (a contact, a place or property, a vehicle, clothes), anything that changes in the city (a gate opens, a shop, the
  police), and whether you must be somewhere or at a time of day.
- **01 -> 02**: Marco phones a game day after Quest 01 is passed; from Quest 01 on Marco is a contact who can call you. Quest 02 is not
  written yet.
- **Story-wide things to settle before STORY is built**: the space center's entry (open item 1); whether the player speaks; saving
  between quests (STORY saves as now, never during a mission); what a failed or skipped quest does to the ones after it.

## Settled for story mode

- Hidden pickups (weapons, ammo, health, body armor, heat reducers): 30% of the free roam count (modes table, `pickups`).
- Every feature so far is on in both modes (modes table).
