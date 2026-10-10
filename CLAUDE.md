# Block Runner - how we work

## Workflow (agreed with the owner)
- **Ask when anything is unclear** - every time, before building. Use multiple-choice questions with a recommended option; several short rounds are fine.
- **Every new in-game feature: ask whether it is for FREE ROAM, STORY or both.** Then add a row to the modes table (`js/01j-mode-data.js`, `features`) with the answer, and gate the feature in code with `feat('<id>')`.
- **Numbers and settings live in data tables, not in code.** Each table is JSON between `/*NAME-JSON*/ ... /*END-NAME-JSON*/` markers in a `js/01x-*.js` file, and has (or gets) a `tools/*_sheet.py` that exports it to Apple Numbers or Excel and imports an edited copy back, checking every value. Send the owner the exported `.numbers` file after changing a table.
- Create pull requests and merge only when the owner asks ("Merge" = open a PR from the working branch to `main` and squash-merge it, then reset the working branch to `origin/main`).
- Never commit the Vice City source image.
- No AI model names in commits, code or docs.

## The game
- Vanilla JS with three.js r128 from cdnjs; plain scripts sharing globals, loaded in order from `index.html` (data tables `01*` first). GitHub Pages deploys from `main`.
- Two modes: FREE ROAM (the game as it is) and STORY (to be built; shown as COMING SOON while `ready` is false in the modes table). Saved games keep their mode.
- Tables: police, sky and airport (`tools/settings_sheet.py`), vehicles, weapons, rampages, economy (every price, across tables), modes.
- The city map (`js/00-map-data.js`) is generated, but the reference image is not kept: change the layout in place with `tools/remodel_city.py` (bump its version for a new remodel).
- Keep the README and the in-game Help in step with every feature.

## Before pushing
- `node --check` every changed script; test in headless Chromium with Playwright (three.js routed to a local copy) - no page errors, screenshots for anything visual, phone size too.
- Rerun the earlier feature tests that the change could touch.
