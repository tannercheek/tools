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
      Header and tab bar per DESIGN §11. On Today, the header has previous/next-day icon buttons around the date stack (inert until 5.4) and Settings on the right. Other tabs show the screen title and Settings. The fixed bottom tab bar has five equal items (Today · Plan · Foods · Meals · Stats), each a Lucide icon over a label, with `aria-current="page"` on the active one. Settings opens as a pushed screen with a back button. Add the icons to `js/icons.js` and Lucide's license as `js/LICENSE-lucide.txt`. A tiny router swaps view modules, each rendering a placeholder heading. Hash-based routes (`#/today` etc.) so refresh keeps your place.
      _Done when:_ every tab and Settings shows its placeholder; back/forward and refresh work; header and tab bar match DESIGN §11 at 360px in light and dark.

- [x] **0.3 Base components**
      Shared components in `js/ui/`, with their styles in `style.css`, per DESIGN §5 and §8–§10:
  - primary, secondary and icon buttons with press edges
  - list row (emoji tile → text stack → one trailing control; the tile shows the native character until 3.5a)
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

- [x] **3.1 Food data pipeline (starter set)**
      `scripts/build-foods.mjs` reads USDA FoodData Central CSV downloads (SR Legacy + Foundation) from a local folder you pass as an argument (kept outside the repo), filters by `scripts/food-list.json` (fdcId + display name + serving choice + emoji), and writes `data/foods.json`. Servings come from USDA portion data (e.g. "1 large egg") or default to 100 g. Each `food-list.json` entry has either an exact `emoji` (e.g. 🥚) or a `category`. The script fills in the category default from SPEC §3.2 and fails on an entry with neither. Start with ~50 foods to prove it works.
      _You'll need to:_ download the two CSV zips from fdc.nal.usda.gov/download-datasets and unzip them outside the repo.
      _Done when:_ `foods.json` has ~50 entries, each with `fdcId` and an `emoji` character; you spot-check three against the USDA website.

- [x] **3.2 Search**
      Pure search function: case-insensitive, word-prefix matching, custom foods ranked first, archived foods excluded.
      _Done when:_ tests cover partial words ("chick bre"), ranking, and archived exclusion.

- [x] **3.3 Foods view**
      Search field (DESIGN §10) and result rows (DESIGN §8 food search result) showing emoji, name, serving and the four numbers. Add the "No match" empty state from DESIGN §13; its button is wired up in 3.5.
      _Done when:_ searching the starter set feels instant on your phone.

- [x] **3.4 Foods inside Meals**
      Foods moves into the Meals tab (SPEC §5). The tab bar drops to four items, Today · Plan · Meals · Stats (DESIGN §11). The Meals tab gets a full-width Meals / Foods segmented control at the top and opens on Meals, which keeps its placeholder until 4.2. Foods is the 3.3 view plus a "Custom foods only" switch (SPEC §3.2) and the "No custom foods yet" empty state (DESIGN §13), whose button is wired up in 3.5.
      _Done when:_ the tab bar shows four equal items at 360px in light and dark; the Meals tab opens on Meals; switching to Foods and refreshing keeps you on Foods; with "Custom foods only" on, Foods shows the "No custom foods yet" state, since custom foods arrive in 3.5.

- [x] **3.5a Emoji picker**
      Curate `data/emoji-picker.json`: ~40 food emoji as `{ char, name }`, including every category default and 🍽️ (SPEC §5.1). Build the emoji picker sheet on the 0.3 bottom sheet, per DESIGN §10, with native emoji. Each tile's `aria-label` is its name. It returns the chosen character. No Fluent SVGs; they're a v2 candidate.
      _Done when:_ the picker opens, shows the current pick selected, and returns the new one; every category default and 🍽️ is in the grid; tests check that the JSON has no duplicate characters and every entry has a name.

- [x] **3.5 Custom foods**
      Add / edit / delete form in DESIGN §10 order (name, serving qty + unit, kcal, P, F, C), with an emoji tile beside the name that opens the picker. New custom foods default to 🍽️. Every "Add custom food" button on Foods opens it. Duplicate a bundled food into a custom one (keeps its emoji). Delete archives the food if any meal uses it, and always asks first with the confirm sheet.
      _Done when:_ custom foods and their emoji persist, sync between browsers, show first in the Foods list and alone with "Custom foods only" on, and an archived food still shows correctly inside its meal.

## Phase 4 — Meals

- [x] **4.1 Meal operations**
      Pure functions: create, rename, add/remove/update item, duplicate, delete. Totals via `calc.js`.
      _Done when:_ tests pass.

- [x] **4.2 Meals list**
      In the Meals tab's Meals segment (3.4): saved meal rows (DESIGN §8) with emoji and totals; new, duplicate, delete (confirm sheet). "No saved meals yet" empty state from DESIGN §13.
      _Done when:_ meals persist and totals match the editor.

- [x] **4.3 Meal editor**
      Emoji (picker, default 🍽️), name, ingredient rows with quantities in each food's serving unit, add food via search, live totals in a sticky card above the list.
      _Done when:_ you can build "Rice & beef" with an emoji in under 30 seconds.

## Phase 5 — Profile, Plan and Today

- [x] **5.0 Profile and targets**
      Profile form with live calculated targets, per-target overrides, reset to calculated, units toggle. Every field starts empty (SPEC §5): age, height and weight show placeholders naming the field ("Age", "Height", "Weight"), and sex, activity, goal and rate start with nothing selected, which needs the 0.3 segmented control to allow no selection (DESIGN §9). A pure helper in `calc.js` returns the targets, or `null` until the profile is complete (SPEC §3.1). The weight field shows the current weight; entering a new one logs a weigh-in for today (SPEC §3.1). First launch opens here.
      _Done when:_ a first launch shows every field empty and no targets; targets appear once the last field is filled; tests cover the helper with each field missing and with maintain needing no rate; changing weight or goal updates targets immediately everywhere; a weight entered here appears as today's weigh-in.

- [x] **5.1 Meal tags**
      Pure `setMealTags`, `allTags(meals)` and `filterMeals(meals, tag)` in `saved-meals.js` (SPEC §3.3); `duplicateMeal` copies the tags. A reusable tag pill and single-select filter row in `js/ui/controls.js` (DESIGN §9), shown on `#/components`. The Meals list gets the filter row above its rows; the meal editor gets the tag row under the name and the "New tag" sheet. The meal pickers in later steps reuse the filter row.
      _Done when:_ tests cover trimming, case-insensitive reuse of an existing spelling, no duplicates on a meal, the A–Z union, filtering, meals saved without `tags`, and a duplicate keeping its tags; tagging two meals shows the filter row and picking a tag filters the list; removing a tag's last use drops its pill and the filter goes back to All; the row scrolls sideways inside its strip with no page scroll at 390px, in light and dark.

- [x] **5.2 Rings**
      SVG ring component per DESIGN §6: total / target, remaining, over-target state, and the no-targets state (DESIGN §13). Render a demo on Today.
      _Done when:_ rings look right at 0%, 50%, 100% and 130%, and with no targets.

- [x] **5.3 Slots and template**
      Slot count (3–6), names and order (in Settings). Plan view assigns a meal or "flex" to each slot; its meal picker has the 5.1 tag pill row (SPEC §3.3).
      _Done when:_ the template persists and survives a reload.

- [x] **5.4 Today, read-only**
      A pure `dayTotal` (SPEC §3.5: planned meals after changes, pinned budgets of open flex slots, added entries; entries only when off plan or locked). Rings show the day's total; slot list shows planned meals and totals; date switcher (prev / next / tap the date for today). Previous stops at 7 days ago; next has no limit. "No meals planned" empty state from DESIGN §13.
      _Done when:_ tests cover `dayTotal` for a plain template, a pinned budget, off plan and a locked day; any date in range shows the template and the rings show its totals; previous is disabled at 7 days ago.

- [x] **5.5 Skip, portion and lock-in**
      Tapping a planned slot opens its actions sheet (DESIGN §8): Skip, Portion (0.5×, 1×, 1.5×, custom), As planned; Swap and Add are wired in 5.6 and 5.7. Changes go in the day's `changes`. Pure `lockDay(day, template, meals, foods)` writes the snapshot entries (SPEC §3.5); app load and a date change lock every unlocked past day in the window from `startedOn` on. A locked day lists its entries with remove.
      _Done when:_ tests cover `lockDay` with a swap, a skip, a 1.5× portion, a pinned budget, an off-plan day and an extra entry; a skipped slot drops out of the rings; editing a meal after its day is locked does **not** change that day; a first run doesn't lock in days before `startedOn`.

- [x] **5.6 Swaps**
      Swap a slot's meal for one day (stored in `changes`); "make this the default" updates the template. The meal picker has the 5.1 tag pill row (SPEC §3.3).
      _Done when:_ a swap affects only that date unless made default.

- [x] **5.7 Flex slot**
      Shows the gap: targets minus the rest of the day; optional pinned budget of four numbers (kcal, P, F, C) on the template slot, set from Plan. With more than one open flex slot, each shows the full remaining; nothing is split (SPEC §3.4). The add sheet (DESIGN §8): a saved meal (picker with the 5.1 tag pill row, SPEC §3.3), a food (search, qty) or quick numbers (kcal + macros + optional label), opened by an open flex slot's Log and by "Add to this slot". Once something is in it, a flex slot is filled and shows its total; tapping it lists its entries, each with remove (confirm sheet), plus Add to this slot. A planned slot's actions sheet lists its extras with remove and gets Add to this slot; extras show under the meal.
      _Done when:_ with no changes, it shows the targets minus the planned meals; it updates live when another slot is swapped, skipped or re-portioned; with two flex slots, adding to one updates what the other shows; an open flex slot on a past day just shows as open; with no targets, an open flex slot shows as open with no remaining; a filled flex slot shows its total, and removing its last entry opens it again; an extra added to a planned slot shows under the meal and counts in the rings; entries survive reload.

- [x] **5.8 Recent and past days**
      A Recent segment in the add sheet (5.7), alongside Meal, Food and Quick, shows what was added in the last 7 days, newest first, merged when label and numbers match; one tap adds it again to the slot (SPEC §3.5). Planned meals and pinned budgets aren't listed, since they're the plan, not something added. The sheet opens on Recent when it has entries, otherwise on Meal. A locked past day gets Add, which opens the same sheet for a chosen slot (SPEC §3.6).
      _Done when:_ a Recent entry shows up in the rings and survives reload; an entry added on a past locked day shows in that day; Recent still shows an added entry whose meal has since been deleted, but not the plan a day locked in.

- [x] **5.9 Plan totals**
      On Plan, a totals card above the slots: what the template adds up to (its meals plus any pinned flex budgets) against targets, and one "left for flex" figure that isn't split between flex slots (SPEC §3.4).
      _Done when:_ changing a slot's meal updates the card straight away, and a plan over target shows "over", never a negative number; with no targets, it shows the template's totals only.

- [x] **5.10 Off plan**
      "Off plan until [date]" sheet from Today (default today, up to 30 days ahead) sets `offPlan: true` on each of those days. On an off-plan day every slot behaves as a flex slot with the 5.7 remaining logic, planned meals, pinned budgets and changes are ignored, and an "Off plan" line shows "Back on plan", which clears it from today on (SPEC §3.4).
      _Done when:_ setting it for three days makes all three all-flex while the template is unchanged; logging into one slot updates what the others show; "Back on plan" restores the template from today, and an earlier off-plan day stays off plan.

## Phase 6 — Settings and Stats

- [x] **6.1 Weigh-ins**
      On Stats: "Log weigh-in" sheet (weight with unit suffix, date defaulting to today), and the recent weigh-ins listed below it, newest first, each with delete (confirm sheet).
      _Done when:_ a weigh-in for an earlier date slots into order; one for an existing date replaces it; deleting the latest moves targets to the one before.

- [x] **6.2 Export, import, reset**
      Export all docs as one JSON file; import replaces all (confirm sheet); reset everything (confirm sheet).
      _Done when:_ export → reset → import restores everything exactly.

- [x] **6.3 Stats: last 7 days**
      Average rings over the 7 days before today that have entries, under "Daily average · last 7 days", or "· N of the last 7 days" when fewer count (SPEC §3.7). Empty state for fewer than 2 counted days (DESIGN §13). No range toggle, days on target or bar charts; they aren't in SPEC.
      _Done when:_ numbers match a hand calculation on a week of test data; today doesn't count, and neither does 8 days ago; an off-plan day with nothing added drops the heading to "6 of the last 7 days".

- [x] **6.4 Weight trend**
      SVG line chart of the weigh-ins from the last 12 weeks, plotted by date, latest value labelled, dashed goal-rate line from the first weigh-in in the window (DESIGN §7). Below it: latest weight and date, and actual rate vs goal ("−0.3 kg/week · goal −0.5"), shown only when `weightRate` returns one. Empty state with fewer than 2 weigh-ins in the window.
      _Done when:_ with sporadic test weigh-ins the line connects them by date, the rate matches `weightRate`, and imperial shows lb/week.

## Phase 7 — Polish and publish

- [x] **7.1 Mobile and accessibility pass**
      Tap targets ≥ 44px, focus states, labels on inputs, reduced-motion, no horizontal scroll at 360px.
      _Done when:_ you've used it on your phone for one full day.

- [x] **7.2 Design audit**
      Search `style.css`, `components/` and `js/` for hard-coded colours, sizes, spacing, radii, shadows, durations, easings and z-index values, and replace each with a token (SVG geometry in viewBox units is fine). Walk the DESIGN §15 checklist item by item. Check every view and sheet in light and dark, and with reduced motion on. Remove the `#/components` route.
      _Done when:_ no hard-coded values remain outside `tokens.css`; every DESIGN §15 item passes; every view has been checked in both light and dark.

- [x] **7.3 Ship**
      Final check of the four dashboard meta tags. Nothing to merge; all work is already on `main`.
      _Done when:_ after you push, the "Build tool index" action has run, the card shows on the live dashboard, and the tool opens from it.

## Phase 8 — Post-v1 improvements

- [x] **8.1 Settings gear**
      The header's Settings icon button becomes a gear: Lucide `settings` replaces `sliders-horizontal` in `js/icons.js`, and the unused one goes. Its accessible name stays "Settings". Update DESIGN §12's tab icons line to "Settings (gear)".
      _Done when:_ every screen's header shows the gear at the same size and stroke as the other header icons, in light and dark; `js/icons.js` has no `sliders-horizontal`; DESIGN §12 says gear.

- [x] **8.2 Compact slot actions**
      In the slot actions sheet, Swap, Skip and Add to this slot become one row of three equal secondary buttons at the top, labelled "Swap", "Skip" and "Add", since the sheet's title already names the slot. Portion, the slot's added entries and As planned follow, in that order. A button that doesn't apply (Swap with no other saved meal, Skip on a skipped slot) is disabled rather than hidden, so the row keeps its three places. The filled flex sheet is unchanged. Update DESIGN §8's slot actions sheet to match.
      _Done when:_ the three buttons share one line at 360px and 390px with no truncated labels and tap targets of at least 44px, in light and dark; each does what its full-width button did; Swap and Skip show disabled when they don't apply; DESIGN §8 describes the row.

- [x] **8.3 Quick actions on Today**
      A row of four equal buttons between the rings and the slots, opening sheets that already exist. It replaces the full-width "Go off plan" button under the slots.
  - **Add food** and **Quick numbers** ask which slot (the locked day's slot chooser, 5.8), then open the add sheet on its Food or Quick segment. Recent and Meal stay one tap away in that sheet.
  - **Weigh in** opens the Stats "Log weigh-in" sheet (6.1). A new weigh-in moves the targets, so the rings update straight away (SPEC §3.1).
  - **Off plan** opens the "Off plan until [date]" sheet (5.10). It's disabled on days off plan can't start (before today, more than 30 days ahead) and on a day that's already off plan, whose off-plan line with "Back on plan" sits under the row.

  At 360px each button gets about 76px, too narrow for a secondary button's padding and `md` label, so the row uses a compact button: an icon over an `xs` label, like a tab bar item (DESIGN §11). Add it to DESIGN §9, with any new value as a token in `tokens.css`. Add the row to SPEC §3.6 and DESIGN §8.
  _Done when:_ the row fits on one line at 360px and 390px with no truncated labels and tap targets of at least 44px, in light and dark; "Go off plan" no longer shows under the slots; an entry added through Add food or Quick numbers lands in the chosen slot and counts in the rings, on today and on a locked past day; a weigh-in from Today shows on Stats and moves the targets; going off plan from the row, then back on plan, works as in 5.10; SPEC §3.6, DESIGN §8 and DESIGN §9 describe the row.

- [x] **8.4 Ingredient changes**
      The pure logic for SPEC §3.5's ingredient changes, with no UI.
  - A new `js/ingredients.js`:
    - an ingredient snapshot from a food and an amount, and a meal's ingredients
    - scaling a list by a portion
    - changing an amount, whose numbers rescale in proportion with no food lookup
    - swapping a food in place, merging into the same food if it's already in the list, like `addItem`
    - removing a food and adding one
    - the list a slot eats: its ingredients, or else its meal's, at its portion
  - In `slots.js`:
    - `daySlots` gives each plan `ingredients` and `edited`, applied only when the change's `mealId` is the meal the slot shows that day.
    - `setSlotIngredients` keeps a swap, clears the portion and refuses an empty list.
    - `resetSlotIngredients` takes the change back off.
    - `swapSlot` drops the ingredients.
  - In `calc.js`: `ingredientsTotals`, and `slotTotals` uses a plan's ingredients when it has them.
  - `lock-in.js` and Plan need no change.

  _Done when:_ tests cover:
  - a meal's ingredients adding up to `mealTotals`
  - an amount change, a swap keeping its place, a swap merging, and a remove
  - 1.5× folded into the amounts with the portion cleared
  - the change ignored after a swap, a template change and a deleted meal
  - Swap and Skip dropping it, As planned clearing it, and Reset keeping a swap
  - `dayTotal`, `flexGap` and `lockDay` using the edited numbers while Plan's total doesn't move
  - deleting or editing a food afterwards leaving the day's total as it was
  - an off-plan day ignoring it

- [x] **8.5 Ingredients sheet**
      In a planned slot's actions sheet, "Edit ingredients" goes after Portion and is hidden while the slot is skipped.
  - It opens the Ingredients sheet, titled with the meal ("Breakfast sandwich · Ingredients"). In order:
    - the meal editor's sticky totals card
    - a row per ingredient, with its amount in the row and a trailing swap icon button (Lucide `arrow-left-right`)
    - "Add food"
    - "Reset to original meal", once something has changed
  - The swap button opens a sheet with "Remove from meal" (disabled on the last ingredient) above food search. The picked food's amount starts at the old one when the units match.
  - Each change saves straight away and the rings move behind the sheet. Reset applies and closes, like As planned.
  - The sheet opens from the slot as it is now, so a portion just picked is folded in.
  - The slot's eyebrow gains "Edited" ("Breakfast · Swapped · Edited · 1.5×"), and As planned shows for an edited slot.
  - Reuse rather than copy:
    - Move the meal editor's totals card into `js/ui/`, with its styles in `components/`.
    - `ingredientRow` takes its trailing action.
    - `foodPicker` takes a starting amount.
  - Add the sheet, the swap sheet, the row and "EDITED" to DESIGN §8, and the icon to DESIGN §12.

  _Done when:_
  - swapping the bread and setting 3 eggs in today's breakfast shows "Edited" and moves the rings and an open flex slot's "to fill" by the difference, while Plan's total and the saved meal stay as they were
  - tomorrow shows the saved meal, and Reset brings it back today
  - at 1.5× the sheet shows the amounts ×1.5, and an edit sets Portion to 1×
  - a custom food swapped in and then deleted leaves today's totals unchanged after a reload
  - the day locks in with the edited numbers
  - the sheet works at 360px and 390px in light and dark
  - DESIGN §8 and §12 describe it

- [x] **8.6 Edit in the slot actions row**
      In the slot actions sheet, Swap, Skip and Edit share the top row, since all three act on the planned meal. "Edit" opens the Ingredients sheet, as "Edit ingredients" did, and is disabled rather than hidden on a skipped slot, so the row keeps its three places. Add moves to where Edit ingredients was, after Portion, as a full-width "Add to this slot", since it acts on the slot rather than the meal. Update SPEC §3.6 and DESIGN §8 to match.
      _Done when:_ the three buttons share one line at 360px and 390px with no truncated labels, in light and dark; Edit opens the Ingredients sheet and shows disabled on a skipped slot; Add to this slot opens the add sheet; SPEC §3.6 and DESIGN §8 describe the new order.

- [x] **8.7 Swap to a food or quick numbers**
      The pure logic for SPEC §3.5's swap to a food or quick numbers, with no UI. The swapped-in thing is an entry snapshot from data.js's `foodEntry` or `quickEntry`, kept in the slot's change.
  - In `slots.js`:
    - A new `swapSlotToEntry(day, slotId, entry)` sets the change to `{ entry }`, dropping any meal swap, portion and ingredients.
    - `swapSlot`, `skipSlot` and `clearSlotChange` drop it.
    - `daySlots` gives the plan `swapEntry`, with `swapped: true`, no ingredients and a portion of 1, applied only on a slot the template still plans a meal in.
  - In `calc.js`: `slotTotals` uses a plan's `swapEntry` when it has one, so `dayTotal` and `flexGap` follow.
  - In `lock-in.js`: a slot with a `swapEntry` writes it as it is, in the slot's place among the planned entries, without `planned`.

  _Done when:_ tests cover:
  - a swap to a food and to quick numbers counting in `dayTotal` and `flexGap` in place of the meal
  - a swap to a food on an edited slot at 1.5× dropping both
  - a swap back to a meal, Skip and As planned each dropping it
  - a change left on a slot that's since turned flex being ignored
  - `lockDay` writing it in slot order without `planned`, and `recentEntries` then listing it
  - editing or deleting the food afterwards leaving the day's total as it was
  - an off-plan day ignoring it

- [x] **8.8 Swap sheet: Meal · Food · Quick**
      The swap sheet gains a Meal · Food · Quick segmented control (DESIGN §8 swap sheet), using 8.7.
  - Food and Quick reuse the add sheet's food picker and quick numbers form, ending in "Swap food" and "Swap numbers". "Make this the default" shows on Meal only. The sheet opens on Meal, or on Food when there's no other saved meal.
  - Swap is no longer disabled when there's no other saved meal, so `canSwap` goes.
  - On a slot swapped to a food or quick numbers, the slot actions sheet is titled with what was swapped in, Edit is disabled and Portion doesn't show.
  - Today's row for that slot is the filled flex row with "SWAPPED" in place of "FLEX" (DESIGN §8 swapped-in food or quick numbers). Reuse the filled flex row rather than copy it.

  _Done when:_
  - swapping lunch for a banana shows "🍌 Banana" under "Lunch · Swapped", and the rings and an open flex slot's "to fill" move by the difference
  - adding a yogurt to it then shows 🍽️ "2 items", the banana first, with their total
  - swapping for quick numbers labelled "Burrito place" shows that label with 🍽️, and with no label shows the slot's name
  - As planned, Skip and a swap back to a meal each bring back the meal's row, and the yogurt stays as an extra
  - on the swapped slot, Edit shows disabled and Portion is gone; Make this the default shows on Meal only
  - with one saved meal, Swap opens on Food
  - the next day, the banana is in that day's locked entries and in Recent
  - the sheet and row work at 360px and 390px in light and dark

- [x] **8.9 Ingredients of added meals**
      A meal added to a slot keeps its ingredients: `mealEntry` saves them, and `repeatEntry` carries them over from Recent.
  - New in `data.js`:
    - `setEntryIngredients`: the entry's numbers become the ingredients' total, and the list as added is kept the first time.
    - `resetEntryIngredients`: back to the list and numbers as added. The kept list goes with it, so an entry counts as edited only while it has one (8.10).
    - A Recent entry added again carries its ingredients as they are, but not the kept list: it's a new add, so that's the meal as added.
  - In the slot actions sheet and the filled flex sheet, a meal entry with ingredients is a row with a chevron. It opens the 8.5 sheet, which then ends in "Remove from slot" (confirm sheet).
  - Food and quick entries, and meals added before this step, keep their remove button. Locked days are unchanged.
  - Update DESIGN §8's entry rows.

  _Done when:_
  - tests cover an added meal's ingredients adding up to its numbers, an edit changing its numbers and keeping the original list once, reset giving back the numbers exactly as added and dropping the kept list, and a Recent entry added again keeping its edited ingredients without a kept list
  - a meal added to a flex slot opens, takes an edit that shows in its numbers and the rings, and resets
  - "Remove from slot" in the sheet takes the entry out after the confirm sheet
  - an entry added before this step still shows its remove button

- [x] **8.10 Ingredients on the slot row**
      On Today, a planned slot with an ingredient change lists its ingredients under its numbers line, so the change shows without opening the slot (SPEC §3.6, DESIGN §8 edited meal slot). Today only: nothing new is stored, and locked days, which list entries, are unchanged.
  - Every ingredient, in the sheet's order: emoji, name, then the amount and unit at the slot's portion, matching the Ingredients sheet. No kcal per line.
  - Only edited slots. A slot without an ingredient change looks as it does now.
  - Ingredients first, then any extras added to the slot below a divider.
  - A filled flex slot whose one entry is an edited added meal (it has `originalIngredients`, 8.9) lists that meal's ingredients the same way. An edited added meal that's one line among others stays one line until 8.11.
  - Reuse rather than copy: the row's extras lines in `js/ui/row.js` take an amount in place of kcal, and the amount uses the Ingredients sheet's formatting.

  _Done when:_
  - an edited breakfast lists each food with its amount, matching the Ingredients sheet, also at 1.5×
  - a slot with no ingredient change looks as before
  - with an edit and an added food, the ingredients come first and the added food sits below the divider
  - a meal added to an empty flex slot shows no ingredient lines until it's edited, then lists them, and Reset takes them away
  - a long food name truncates while its amount stays whole, at 360px and 390px in light and dark
  - Reset, As planned, Swap and Skip take the lines away

- [x] **8.11 Ingredients of added meals on the slot row**
      An edited added meal that's one of the lines under a slot lists its ingredients indented under its own line (SPEC §3.6, DESIGN §8 edited extra): an extra beside a planned meal, or one of the items in a filled flex slot or a slot swapped to a food or quick numbers (8.8). Same lines as 8.10, indented to line up with the meal line's label. Other extras stay one line. Today only, like 8.10. Add the indent to `tokens.css` if no token fits, and call it out.

  _Done when:_
  - an edited meal added beside an edited planned meal shows the planned meal's ingredients, the divider, then the added meal's line with its own ingredients indented under it
  - in a filled flex slot with several items, only the edited meal gets indented lines, and the slot's total doesn't change
  - in a slot swapped to a food, an edited meal added to it gets indented lines under its own line, and the food doesn't
  - Reset on the added meal takes its lines away
  - indented names truncate while their amounts stay whole, at 360px and 390px in light and dark

## Phase 9 — Today's slot rows

- [x] **9.1 Tile at the top**
      On Today, a slot row with lines under its numbers keeps its emoji tile at the top, level with the eyebrow, instead of centred. The chevron stays centred on the row (DESIGN §8 anatomy). Rows with nothing under their numbers don't change.
      _Done when:_ a slot with an edited meal and two extras has its tile beside the slot's name, at 360px and 390px in light and dark; a slot with nothing under its numbers looks as before; the meal editor's and the Ingredients sheet's ingredient rows are unchanged.

- [x] **9.2 "N items" for any slot with more than one thing**
      A planned slot with anything added shows as "N items" (SPEC §3.6, DESIGN §8 meal slot).
  - 🍽️, the whole slot's total on the numbers line, then the meal as the first line, its kcal at the slot's portion, then what's been added.
  - An edited planned meal's ingredients go indented under its own line, through 8.11's nesting. 8.10's divider and its styles go, since nothing uses them.
  - A skipped meal isn't an item: the row shows what's been added, one thing as itself or several as "N items", not muted, with "SKIPPED" still in the eyebrow.
  - A planned meal on its own, open and filled flex slots, swapped slots and locked days are unchanged.

  _Done when:_
  - breakfast plus a banana shows "2 items" with their total, the meal first, its kcal at 1.5× when portioned
  - editing breakfast's ingredients indents them under its line
  - skipping breakfast with the banana added shows the banana under "Breakfast · Skipped"
  - removing the banana brings back the meal's own row
  - the rings don't move in any of these
  - no divider is left in `row.js` or `row.css`
  - it works at 360px and 390px in light and dark

## Phase 10 — Food outside the slots

- [x] **10.1 Other: logic**
      Entries outside the slots (SPEC §3.5), with no UI. An Other entry has `slotId: null` and `slotName: "Other"`.
  - In `data.js`, the entry helpers take Other in place of a slot.
  - In `slots.js`, a pure `otherEntries(day, slots)`: the day's entries with no slot or whose slot is gone, in the order added.
  - Check that `dayTotal`, `flexGap`, `lockDay` and `recentEntries` treat them like any other added entry, and fix any that don't.

  _Done when:_ tests cover:
  - an Other entry counting in `dayTotal` and in an open flex slot's `flexGap`
  - `otherEntries` picking up an entry whose slot was removed, and leaving out entries in a slot
  - `lockDay` keeping an Other entry as it is, and `recentEntries` listing it
  - an off-plan day counting it

- [x] **10.2 Other: UI**
  - The slot chooser (DESIGN §8), opened by Today's Add food and Quick and by a locked day's Add, lists "Other" after the slots.
  - Today shows the Other row after the slots once it holds something, reusing the filled flex row. Its sheet reuses the filled flex sheet, titled "Other" and ending in "Add to Other".
  - A locked day lists Other's entries last, under "Other".

  _Done when:_
  - a banana added to Other through Add food shows in an "OTHER" row after the slots, counts in the rings, and lowers an open flex slot's "to fill"
  - tapping the row lists the banana with remove; removing it (confirm sheet) takes the row away
  - an edited meal in Other lists its ingredients, as in a filled flex slot
  - removing a slot in Settings that has something added today moves that entry into Other
  - the next day, the banana is in the locked list under "Other" and in Recent
  - it works at 360px and 390px in light and dark

## Phase 11 — Macro split by percent

- [x] **11.1 Macro split: logic**
      In `calc.js`, `targets` takes the core doc's `macroSplit` (SPEC §3.1). By percent, each macro's grams come from its percent of the calorie target, override included. Add a pure `validSplit(percent)` (whole numbers 0–100 adding up to 100) and `splitFromTargets(targets)` (the targets as whole percents adding up to 100, carbs taking up the rounding), for filling the fields. A doc without `macroSplit` is by bodyweight. Export and import carry it with the core doc.
      _Done when:_ tests cover:
  - 30 / 25 / 45 at 2,600 kcal giving 195 g, 72.2 g and 292.5 g
  - each macro's override on its own leaving the other two at their percents
  - a calorie override moving all three
  - no clamped-carbs warning by percent, and the below-BMR warning in both modes
  - a split adding up to 99 or 101, or with a fraction, being invalid
  - `splitFromTargets` adding up to 100 for targets that round awkwardly
  - a doc without `macroSplit` giving the same targets as before

- [x] **11.2 Macro split: Settings**
      The macro split control in Settings' profile and targets (DESIGN §10 macro split). Switching to percent fills the fields from the saved percents, else from the current targets, else 30 / 25 / 45. A change that adds up to 100 saves and moves the targets straight away. One that doesn't shows the error and saves nothing.
      _Done when:_
  - switching to percent shows fields adding up to 100, and the targets barely move
  - protein 35 and carbs 40 moves the targets live everywhere: Today's rings, open flex slots, Plan totals
  - 35 / 25 / 45 shows "Adds up to 105%" as an error, and the targets don't move
  - an override still sticks and resets to calculated
  - switching back to bodyweight brings back its targets, and switching to percent again brings back the saved percents
  - it survives a reload and syncs between browsers
  - it works at 360px and 390px in light and dark

## Phase 12 — Food portions

- [x] **12.1 Portions in the food data**
      `food-list.json` entries gain `portions`: USDA portion labels with the unit each shows as, first one the default, e.g. `{ "portion": "1 cup = 158 g", "unit": "cup" }`. `build-foods.mjs` writes each food's `grams` (its serving's weight) and `portions` as `{ unit, grams }`, and fails on a portion USDA doesn't have, listing the ones it does, as it already does for servings. Propose portions for the starter foods where a household measure is how you'd measure them (rice, oats and pasta by the cup; potatoes and fruit by the piece; oils and nut butters by the tbsp) and show me the list before building. Meat and fish may have grams only. No food's `id`, `serving` or numbers change.
      _You'll need to:_ have the USDA CSVs unzipped again.
      _Done when:_ tests cover the script reading portions and its failure message; every bundled food has `grams`; the foods you'd measure by volume or piece have portions; `git diff data/foods.json` shows only added fields; you spot-check three portions against the USDA website.

- [x] **12.2 Amounts in any unit: logic**
      Pure functions in a new `js/portions.js`, with `calc.js`, `saved-meals.js` and `ingredients.js` using them (SPEC §3.2, §3.3):
  - a food's units: its serving's unit, then grams if that isn't grams, then its portions; a custom food has only its serving's
  - an amount in any unit as servings, through grams
  - `foodTotals` and `mealTotals` for an item with a `unit`; an item without one is in the serving's unit, so saved meals need no change
  - `addItem` and `addIngredient` merging the same food in another unit, converted into the unit it's already in
  - an ingredient snapshot from an amount in any unit, keeping that unit

  _Done when:_ tests cover:
  - 1 cup of cooked rice giving 158 g's numbers
  - 100 g of large egg giving 2 eggs' numbers
  - an item without `unit` unchanged
  - 1 cup merged into an item of 100 g
  - a custom food offering only its own unit
  - an ingredient in cups rescaling with no food lookup
  - entries and locked days unchanged

- [x] **12.3 Unit choice when adding**
  - The amount field's unit button and the Unit sheet (DESIGN §10 unit choice, §12), built as a shared component in `js/ui/`.
  - The food picker starts at 1 of the default portion, else one serving.
  - Food search results and the Foods list show the default portion with its weight and numbers (DESIGN §8).
  - Used in the add sheet's Food segment and the swap sheet's Food.

  _Done when:_
  - adding 1 cup of cooked rice to a flex slot counts 158 g's numbers
  - "1" with the unit switched from cup to g shows 1 g's numbers
  - a custom food's unit stays plain text
  - Recent adds the rice again as it was added
  - search shows "1 CUP · 158 G" with the numbers for a cup
  - the unit button and the Unit sheet's buttons are at least 44px, at 360px and 390px in light and dark

- [x] **12.4 Unit choice in meals and ingredients**
      The meal editor's ingredient rows and the Ingredients sheet's rows get the same unit button, and their add food sheets start at the default portion. The ingredient swap sheet starts at the old amount when the new food has the old unit (DESIGN §8). Today's ingredient lines (8.10) show each amount in its own unit. If the quantity field needs more width for the button, add a token and call it out.
      _Done when:_
  - a meal with 1 cup of rice shows "1 cup" in the editor, with the same numbers after a reload
  - switching it to 200 g changes its numbers and the meal's totals
  - a meal saved before this phase opens with its amounts and numbers unchanged
  - in today's Ingredients sheet, changing a unit moves the rings, and Reset brings back the original
  - the rows' fields still line up, at 360px and 390px in light and dark

## Phase 13 — Grow the food list

- [ ] **13.1 Grow the food list**
      After Phase 12, so new foods get their portions as they're added. List the foods you're missing: the custom foods you've made, the searches that found nothing, and gaps in SPEC §3.2's coverage list. Add those to `food-list.json`, with portions where a household measure is how you'd measure them, and re-run `build-foods.mjs`. Every number comes from USDA with its `fdcId`, as in 3.1; a food that can't be sourced is left out and listed. This step is data only — no code changes.
      _You'll need to:_ give me the list of missing foods, and have the USDA CSVs unzipped.
      _Done when:_ every food on your list is in `foods.json` or listed as unsourced; you've skimmed the new entries for naming clarity (raw vs cooked, dry vs cooked), emoji and portion choices; you spot-check three against the USDA website.
