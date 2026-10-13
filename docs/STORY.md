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

## Settled for story mode

- Hidden pickups (weapons, ammo, health, body armor, heat reducers): 30% of the free roam count (modes table, `pickups`).
- Every feature so far is on in both modes (modes table).
