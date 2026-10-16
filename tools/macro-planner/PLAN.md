# PLAN.md — Macro Planner build steps

Small, reviewable steps. Each one should take a single Claude Code session and end with a diff you can read in a few minutes.

## How to run a step

All work happens on `main`. Hand Claude Code this, changing the step id:

```
Read CLAUDE.md, SPEC.md, PLAN.md and DESIGN.md in tools/macro-planner/.
Do step 1.1 only. Follow CLAUDE.md's working style: say what you'll change,
do it, run the tests, then show me this step's changes and a "how to check
it" list. Don't run git commands that change the repo, and don't start the
next step.
```

Claude finishes the step, ticks its box here (`- [ ]` → `- [x]`) and shows you its changes. You review them and move on. Commits happen once per phase: on a phase's last step, Claude also suggests a commit message (`Macro Planner: Phase <n> — <phase title>`), and you commit and push the whole phase yourself.

**Design:** `DESIGN.md` and `tokens.css` are final and apply from step 0.1. Every UI step builds to them with the base components from step 0.3, so there's no restyle pass at the end.

**Targets:** the profile starts empty (SPEC §5), so there are no targets until it's filled in. Step 5.0 builds the profile form before the rest of Phase 5, so rings, flex remaining and Plan totals can be checked against your real profile.

---

## Phase 0 — Setup

- [x] **0.1 Scaffold**
      Create the folder structure from SPEC §2. `index.html` with the four dashboard meta tags. It loads the Google Fonts `<link>` from `tokens.css`'s header comment, then `tokens.css`, then `style.css`. Add `app.js`, `config.js` (`MODE = 'personal'`), empty `js/` and `js/views/`, and `tests/` with one smoke test. The page background, text colour and fonts already come from tokens.
      _Done when:_ page loads at `/tools/macro-planner/` with a title, Nunito fonts and no console errors, in light and dark; `node --test` passes.

- [x] **0.2 App shell**
      Header and tab bar per DESIGN §11. On Today, the header has previous/next-day icon buttons around the date stack (inert until 5.3) and Settings on the right. Other tabs show the screen title and Settings. The fixed bottom tab bar has five equal items (Today · Plan · Foods · Meals · Stats), each a Lucide icon over a label, with `aria-current="page"` on the active one. Settings opens as a pushed screen with a back button. Add the icons to `js/icons.js` and Lucide's license as `js/LICENSE-lucide.txt`. A tiny router swaps view modules, each rendering a placeholder heading. Hash-based routes (`#/today` etc.) so refresh keeps your place.
      _Done when:_ every tab and Settings shows its placeholder; back/forward and refresh work; header and tab bar match DESIGN §11 at 360px in light and dark.

- [x] **0.3 Base components**
      Shared components in `js/ui/`, with their styles in `style.css`, per DESIGN §5 and §8–§10:
  - primary, secondary and icon buttons with press edges
  - list row (emoji tile → text stack → one trailing control; the tile shows the native character until 3.4a)
  - text input and numeric input (unit suffix, `inputmode="decimal"`, error state)
  - segmented control
  - switch
  - bottom sheet (scrim, slides in, closes on scrim tap and Escape, keeps focus inside, returns focus on close)
  - confirm sheet built on the bottom sheet: title, one sentence, an explicit-verb button; resolves `true` or `false`

  Every later step reuses these rather than making its own. Never use the browser's `confirm()`, `prompt()` or `alert()`. Show every component on an unlinked `#/components` route for checking; step 7.2 removes it.
  _Done when:_ on `#/components`, each component matches DESIGN.md in light and dark, buttons sink into their edge when pressed, focus is visible on every control, and the sheets trap focus and close with Escape.

## Phase 1 — Core math (`js/calc.js`, no DOM)

- [x] **1.1 Units, BMR, TDEE**
      kg/lb and cm/ft-in conversions, Mifflin-St Jeor BMR, activity multipliers, TDEE.
      _Done when:_ tests cover both sexes, every activity level, and conversion round-trips.

- [x] **1.2 Targets**
      Goal adjustment from rate, macro defaults (protein g/kg, fat %, carbs remainder), manual overrides, warnings for below-BMR calories and clamped negative carbs.
      _Done when:_ tests cover lose/maintain/gain, each override on its own, and both warnings.

- [x] **1.3 Totals**
      Food × quantity → kcal/P/F/C, meal totals, day totals from log entries, remaining vs targets, portion multiplier.
      _Done when:_ tests cover rounding (display rounding only — keep raw values internally), empty meals and empty days.

- [x] **1.4 Stats math**
      Average daily totals over the days logged, excluding empty days. This week's dates, Monday to today.
      _Done when:_ tests cover gaps in data, all-empty weeks, and weeks across month and year boundaries.

## Phase 2 — Storage (no DOM)

- [x] **2.1 Adapter + local implementation**
      `store.js` with the `load / save / remove / list` interface, a localStorage implementation, and an in-memory fake for tests.
      _Done when:_ tests cover save/load round-trip, remove, and prefix listing.

- [x] **2.2 Personal adapter**
      **Ask before editing `shared/persist.js`.** Add `remove` and `list` there if feasible (otherwise use the fallback in SPEC §4.1). Wrap it as the store adapter, with a localStorage fallback if the import fails. Expose sync status and show it as the header sync icon (SPEC §4.1, DESIGN §11). This is the only UI in Phase 2.
      Call `gate('#app')` before first render.
      _Done when:_ data syncs between two browsers; the sync icon shows synced after a save and offline with the network turned off in DevTools; tests still pass.

- [x] **2.3 Last 7 days and weight rate**
      In `calc.js`, replace `weekDates` (step 1.4) with `lastSevenDates(today)`: the 7 days before today, oldest first (SPEC §3.7). Add `weightRate(weighIns, today)`: the least-squares slope in kg/week through the weigh-ins from the last 28 days, or `null` with fewer than two weigh-ins at least 7 days apart (SPEC §3.1).
      _Done when:_ `weekDates` and its tests are gone; tests cover the last 7 dates across month, year and DST boundaries, a steady loss, sporadic weigh-ins, a single noisy point, too few weigh-ins, and weigh-ins older than 28 days being ignored.

- [x] **2.4 Data model and days**
      `js/data.js`. Core doc shape with defaults (empty profile, slots Breakfast/Lunch/Dinner, empty foods and meals, `startedOn` set to the first-run date, `schemaVersion: 1`). Day shape from SPEC §3.5 (`changes`, `entries`, `offPlan`, `locked`). Day helpers on the `macro-planner-days` doc: `getDay(date)` (an empty day if none) and `saveDay(date, day, today)`. Each save drops dates before 7 days ago and keeps future dates (SPEC §4.3).
      _Done when:_ tests cover first-run defaults including `startedOn`, a missing day, the prune at its edge (7 days ago kept, 8 dropped), the prune across month and year boundaries, and future days kept.

- [x] **2.5 Weight log**
      Weigh-in helpers in `js/data.js` on the `macro-planner-weight` doc: add (same date replaces), remove, list oldest first, and current weight (latest weigh-in, else `null`). No pruning.
      _Done when:_ tests cover adding out of date order, same-date replacement, removing the latest, and current weight with no weigh-ins.

## Phase 3 — Foods

- [ ] **3.1 Food data pipeline (starter set)**
      `scripts/build-foods.mjs` reads USDA FoodData Central CSV downloads (SR Legacy + Foundation) from a local folder you pass as an argument (kept outside the repo), filters by `scripts/food-list.json` (fdcId + display name + serving choice + emoji), and writes `data/foods.json`. Servings come from USDA portion data (e.g. "1 large egg") or default to 100 g. Each `food-list.json` entry has either an exact `emoji` (e.g. 🥚) or a `category`. The script fills in the category default from SPEC §3.2 and fails on an entry with neither. Start with ~50 foods to prove it works.
      _You'll need to:_ download the two CSV zips from fdc.nal.usda.gov/download-datasets and unzip them outside the repo.
      _Done when:_ `foods.json` has ~50 entries, each with `fdcId` and an `emoji` character; you spot-check three against the USDA website.

- [ ] **3.2 Search**
      Pure search function: case-insensitive, word-prefix matching, custom foods ranked first, archived foods excluded.
      _Done when:_ tests cover partial words ("chick bre"), ranking, and archived exclusion.

- [ ] **3.3 Foods view**
      Search field (DESIGN §10) and result rows (DESIGN §8 food search result) showing emoji, name, serving and the four numbers. Add the "No match" empty state from DESIGN §13; its button is wired up in 3.4.
      _Done when:_ searching the starter set feels instant on your phone.

- [ ] **3.4a Emoji picker**
      Curate `data/emoji-picker.json`: ~40 food emoji as `{ char, name }`, including every category default and 🍽️ (SPEC §5.1). Build the emoji picker sheet on the 0.3 bottom sheet, per DESIGN §10, with native emoji. Each tile's `aria-label` is its name. It returns the chosen character. No Fluent SVGs; they're a v2 candidate.
      _Done when:_ the picker opens, shows the current pick selected, and returns the new one; every category default and 🍽️ is in the grid; tests check that the JSON has no duplicate characters and every entry has a name.

- [ ] **3.4 Custom foods**
      Add / edit / delete form in DESIGN §10 order (name, serving qty + unit, kcal, P, F, C), with an emoji tile beside the name that opens the picker. New custom foods default to 🍽️. Duplicate a bundled food into a custom one (keeps its emoji). Delete archives the food if any meal uses it, and always asks first with the confirm sheet.
      _Done when:_ custom foods and their emoji persist, sync between browsers, and an archived food still shows correctly inside its meal.

## Phase 4 — Meals

- [ ] **4.1 Meal operations**
      Pure functions: create, rename, add/remove/update item, duplicate, delete. Totals via `calc.js`.
      _Done when:_ tests pass.

- [ ] **4.2 Meals list**
      Saved meal rows (DESIGN §8) with emoji and totals; new, duplicate, delete (confirm sheet). "No saved meals yet" empty state from DESIGN §13.
      _Done when:_ meals persist and totals match the editor.

- [ ] **4.3 Meal editor**
      Emoji (picker, default 🍽️), name, ingredient rows with quantities in each food's serving unit, add food via search, live totals in a sticky card above the list.
      _Done when:_ you can build "Rice & beef" with an emoji in under 30 seconds.

## Phase 5 — Profile, Plan and Today

- [ ] **5.0 Profile and targets**
      Profile form with live calculated targets, per-target overrides, reset to calculated, units toggle. Every field starts empty (SPEC §5): age, height and weight show placeholders naming the field ("Age", "Height", "Weight"), and sex, activity, goal and rate start with nothing selected, which needs the 0.3 segmented control to allow no selection (DESIGN §9). A pure helper in `calc.js` returns the targets, or `null` until the profile is complete (SPEC §3.1). The weight field shows the current weight; entering a new one logs a weigh-in for today (SPEC §3.1). First launch opens here.
      _Done when:_ a first launch shows every field empty and no targets; targets appear once the last field is filled; tests cover the helper with each field missing and with maintain needing no rate; changing weight or goal updates targets immediately everywhere; a weight entered here appears as today's weigh-in.

- [ ] **5.1 Rings**
      SVG ring component per DESIGN §6: total / target, remaining, over-target state, and the no-targets state (DESIGN §13). Render a demo on Today.
      _Done when:_ rings look right at 0%, 50%, 100% and 130%, and with no targets.

- [ ] **5.2 Slots and template**
      Slot count (3–6), names and order (in Settings). Plan view assigns a meal or "flex" to each slot.
      _Done when:_ the template persists and survives a reload.

- [ ] **5.3 Today, read-only**
      A pure `dayTotal` (SPEC §3.5: planned meals after changes, pinned budgets of open flex slots, added entries; entries only when off plan or locked). Rings show the day's total; slot list shows planned meals and totals; date switcher (prev / next / tap the date for today). Previous stops at 7 days ago; next has no limit. "No meals planned" empty state from DESIGN §13.
      _Done when:_ tests cover `dayTotal` for a plain template, a pinned budget, off plan and a locked day; any date in range shows the template and the rings show its totals; previous is disabled at 7 days ago.

- [ ] **5.4 Skip, portion and lock-in**
      Tapping a planned slot opens its actions sheet (DESIGN §8): Skip, Portion (0.5×, 1×, 1.5×, custom), As planned; Swap and Add are wired in 5.5 and 5.7. Changes go in the day's `changes`. Pure `lockDay(day, template, meals, foods)` writes the snapshot entries (SPEC §3.5); app load and a date change lock every unlocked past day in the window from `startedOn` on. A locked day lists its entries with remove.
      _Done when:_ tests cover `lockDay` with a swap, a skip, a 1.5× portion, a pinned budget, an off-plan day and an extra entry; a skipped slot drops out of the rings; editing a meal after its day is locked does **not** change that day; a first run doesn't lock in days before `startedOn`.

- [ ] **5.5 Swaps**
      Swap a slot's meal for one day (stored in `changes`); "make this the default" updates the template.
      _Done when:_ a swap affects only that date unless made default.

- [ ] **5.6 Flex slot**
      Shows the gap: targets minus the rest of the day; optional pinned budget of four numbers (kcal, P, F, C) on the template slot, set from Plan; filled by adding a meal, a food or quick numbers. With more than one open flex slot, each shows the full remaining; nothing is split (SPEC §3.4).
      _Done when:_ with no changes, it shows the targets minus the planned meals; it updates live when another slot is swapped, skipped or re-portioned; with two flex slots, adding to one updates what the other shows; an open flex slot on a past day just shows as open; with no targets, an open flex slot shows as open with no remaining.

- [ ] **5.7 Quick-add and Recent**
      The add sheet: a saved meal, a food (search, qty) or quick numbers (kcal + macros + optional label), into the chosen slot. A "Recent" list in the same sheet shows entries from the last 7 days, newest first, merged when label and numbers match; one tap adds it again (SPEC §3.5). Added to a planned slot, an entry is an extra alongside the meal.
      _Done when:_ all four show up in rings and survive reload; an entry added on a past locked day shows in that day; Recent still shows an entry whose meal has since been deleted.

- [ ] **5.8 Plan totals**
      On Plan, a totals card above the slots: what the template adds up to (its meals plus any pinned flex budgets) against targets, and one "left for flex" figure that isn't split between flex slots (SPEC §3.4).
      _Done when:_ changing a slot's meal updates the card straight away, and a plan over target shows "over", never a negative number; with no targets, it shows the template's totals only.

- [ ] **5.9 Off plan**
      "Off plan until [date]" sheet from Today (default today, up to 30 days ahead) sets `offPlan: true` on each of those days. On an off-plan day every slot behaves as a flex slot with the 5.6 remaining logic, planned meals, pinned budgets and changes are ignored, and an "Off plan" line shows "Back on plan", which clears it from today on (SPEC §3.4).
      _Done when:_ setting it for three days makes all three all-flex while the template is unchanged; logging into one slot updates what the others show; "Back on plan" restores the template from today, and an earlier off-plan day stays off plan.

## Phase 6 — Settings and Stats

- [ ] **6.1 Weigh-ins**
      On Stats: "Log weigh-in" sheet (weight with unit suffix, date defaulting to today), and the recent weigh-ins listed below it, newest first, each with delete (confirm sheet).
      _Done when:_ a weigh-in for an earlier date slots into order; one for an existing date replaces it; deleting the latest moves targets to the one before.

- [ ] **6.2 Export, import, reset**
      Export all docs as one JSON file; import replaces all (confirm sheet); reset everything (confirm sheet).
      _Done when:_ export → reset → import restores everything exactly.

- [ ] **6.3 Stats: last 7 days**
      Average rings over the 7 days before today that have entries, under "Daily average · last 7 days", or "· N of the last 7 days" when fewer count (SPEC §3.7). Empty state for fewer than 2 counted days (DESIGN §13). No range toggle, days on target or bar charts; they aren't in SPEC.
      _Done when:_ numbers match a hand calculation on a week of test data; today doesn't count, and neither does 8 days ago; an off-plan day with nothing added drops the heading to "6 of the last 7 days".

- [ ] **6.4 Weight trend**
      SVG line chart of the weigh-ins from the last 12 weeks, plotted by date, latest value labelled, dashed goal-rate line from the first weigh-in in the window (DESIGN §7). Below it: latest weight and date, and actual rate vs goal ("−0.3 kg/week · goal −0.5"), shown only when `weightRate` returns one. Empty state with fewer than 2 weigh-ins in the window.
      _Done when:_ with sporadic test weigh-ins the line connects them by date, the rate matches `weightRate`, and imperial shows lb/week.

## Phase 7 — Polish and publish

- [ ] **7.1 Mobile and accessibility pass**
      Tap targets ≥ 44px, focus states, labels on inputs, reduced-motion, no horizontal scroll at 360px.
      _Done when:_ you've used it on your phone for one full day.

- [ ] **7.2 Design audit**
      Search `style.css`, `components.css` and `js/` for hard-coded colours, sizes, spacing, radii, shadows, durations, easings and z-index values, and replace each with a token (SVG geometry in viewBox units is fine). Walk the DESIGN §15 checklist item by item. Check every view and sheet in light and dark, and with reduced motion on. Remove the `#/components` route.
      _Done when:_ no hard-coded values remain outside `tokens.css`; every DESIGN §15 item passes; every view has been checked in both light and dark.

- [ ] **7.3 Ship**
      Final check of the four dashboard meta tags. Nothing to merge; all work is already on `main`.
      _Done when:_ after you push, the "Build tool index" action has run, the card shows on the live dashboard, and the tool opens from it.

## Phase 8 — After a week of use

- [ ] **8.1 Grow the food list**
      Only after a week of real use with the ~50 starter foods. List the foods you added as custom or went looking for, then add those to `food-list.json`, guided by SPEC §3.2's coverage list. Re-run `build-foods.mjs`. This step is data only — no code changes.
      _Done when:_ every food you missed during the week is in `foods.json`, and you've skimmed the new entries for naming clarity (raw vs cooked, dry vs cooked) and emoji choices.
