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

Claude finishes the step, ticks its box here (`- [ ]` → `- [x]`) and shows you its changes, ending with a suggested commit message (`Macro Planner: <step id> — <step title>`). You review them, then commit and push the step yourself. Phases 0–13 are done; new work goes in Phase 14, which stays open.

**Model and effort:** each open step ends with a suggested model and effort (`_Model:_`), matched to how much it touches and how much care it needs. Set both before handing the step over.

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
      **Ask before editing `shared/persist.js`.** AVdd `remove` and `list` there if feasible (otherwise use the fallback in SPEC §4.1). Wrap it as the store adapter, with a localStorage fallback if the import fails. Expose sync status and show it as the header sync icon (SPEC §4.1, DESIGN §11). This is the only UI in Phase 2.
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

- [x] **13.1 Grow the food list**
      After Phase 12, so new foods get their portions as they're added. List the foods you're missing: the custom foods you've made, the searches that found nothing, and gaps in SPEC §3.2's coverage list. Add those to `food-list.json`, with portions where a household measure is how you'd measure them, and re-run `build-foods.mjs`. Every number comes from USDA with its `fdcId`, as in 3.1; a food that can't be sourced is left out and listed. This step is data only — no code changes.
      _You'll need to:_ give me the list of missing foods, and have the USDA CSVs unzipped.
      _Done when:_ every food on your list is in `foods.json` or listed as unsourced; you've skimmed the new entries for naming clarity (raw vs cooked, dry vs cooked), emoji and portion choices; you spot-check three against the USDA website.

## Phase 14 — Ongoing

One open-ended phase: steps are added here as they come up, in the order they should be built, and none of them ends the phase. Each one is committed on its own.

- [x] **14.1 Sheets above the keyboard**
      On an iPhone, the on-screen keyboard covers the bottom of a sheet, so a field near the bottom, like Log weigh-in's weight, is hidden while you type. While a sheet is open, `js/ui/sheet.js` fits it to `window.visualViewport`: when the keyboard opens, the sheet shrinks to the space above it, and the focused field scrolls into view inside the sheet. Every sheet gets this from the shared component; no view changes. Where `visualViewport` is missing, nothing changes. Add the rule to DESIGN §10, and any new value as a token.
      _Done when:_ on your iPhone, the weight field stays visible above the keyboard while you type in Stats' Log weigh-in and Today's Weigh in, and so do Quick numbers' fields and the custom food form's macro fields; closing the keyboard brings the sheet back to its full height; nothing changes on a desktop browser. A headless browser can't open an on-screen keyboard, so this is checked on the phone.

- [x] **14.2 "Added to this slot" heading**
      In a planned slot's actions sheet on Today, the items added to the slot sit under the heading "Added to this slot", and Add to this slot moves under them, so the heading, the items and the button read as one group, apart from the meal's controls above (SPEC §3.6). With nothing added, only the button shows, with no heading. The heading uses the label style of the sheet's Portion control. The filled flex sheet and the Other sheet are unchanged, since everything in them is added. Update DESIGN §8's slot actions sheet.
      _Done when:_ a planned breakfast with a banana added shows "Added to this slot", the banana, then Add to this slot; with nothing added there's no heading; the filled flex and Other sheets look as before; it works at 360px and 390px in light and dark.

- [x] **14.3 Birthday instead of age**
      The profile's age becomes a birthday, and the age is worked out from it each day (SPEC §3.1).
  - In `calc.js`, a pure `ageOn(birthDate, date)`: whole years, a 29 February birthday counting from 1 March in other years. The targets helper takes today's date and uses the birthday's age, or a stored `age` when there's no birthday.
  - In Settings' profile, a Birthday date field replaces Age, reusing the weigh-in sheet's date field. Once set, the age shows under it in body `sm` `--color-text-2` ("35 years old"). First launch shows it empty.
  - A profile saved with an age keeps its targets until a birthday is entered. Export and import carry `birthDate` with the core doc.

  _Done when:_
  - tests cover the age the day before, on and after a birthday, a 29 February birthday in a year without one, a profile with only a stored age, and no targets with neither
  - entering a birthday shows the age under it and moves the targets everywhere
  - a profile saved before this step keeps its targets until a birthday is entered
  - it works at 360px and 390px in light and dark

- [x] **14.4 Past days grouped by slot**
      A locked day lists its entries in one card per slot (SPEC §3.6), so it's clear which items belong together.
  - A pure `lockedDayGroups(entries, slots)` in `slots.js`: the entries grouped by slot in today's slot order, each group under its saved slot name, keeping the order they were written in; a group whose slot has since been removed after the others; Other last.
  - Each group is one card: the slot name above it as an eyebrow, then a line per entry (emoji, label, numbers, and its 44px remove icon button) with a `--border-width` `--color-border` divider between lines. Add stays after the cards.
  - Focus after a remove and the hop after an add work as now, on the lines.
  - Update DESIGN §8's entry row (locked past day).

  _Done when:_
  - tests cover slot order, a removed slot's group, Other last, and entries keeping their order within a group
  - a past day with a planned breakfast and a banana added shows one Breakfast card holding both
  - removing one leaves the card; removing the last takes the card away
  - long labels truncate and the remove buttons stay 44px, at 360px and 390px in light and dark

- [x] **14.5 Slot names above the cards**
      On Today and Plan, each slot's name and any change sit above its card, as a locked day's do since 14.4 (SPEC §3.4, §3.6), so the card holds only what's in the slot and the three screens match.
  - Each slot row's eyebrow moves out of the row, unchanged, to a heading above it: on Today "BREAKFAST · 1.5×", "SNACK · FLEX", "LUNCH · SWAPPED", and Other's "OTHER"; on Plan "BREAKFAST", "DINNER · FLEX". It reuses `rowGroup`'s heading and spacing from 14.4. Here each group holds one row that keeps its own look (solid, dashed while open flex or empty, muted while skipped), with no second outline around it, so `rowGroup` gains a way to leave a row's outline as it is.
  - Cards sit `--stack-gap` apart, as on a locked day: on Today under the quick actions or the off-plan line, and on Plan under the totals card.
  - The slot's name stays in its row button's accessible name, so a screen reader moving between buttons still hears which slot it is. Log keeps "Log to Snack".
  - Focus after a sheet closes and the hop after an add work as now.
  - The locked day and the sheets are unchanged.
  - Update DESIGN §8: the anatomy (a slot's tile sits level with its title, since the eyebrow is above the card), each Today slot variant that mentions its eyebrow (meal slot, skipped, open flex, filled flex, swapped-in and Other), and Plan's empty slot.

  _Done when:_
  - a 1.5× breakfast on Today shows "BREAKFAST · 1.5×" above a card holding "Oats & whey"
  - on Plan, a planned lunch shows "LUNCH" above its meal, and a flex dinner "DINNER · FLEX" above its dashed "Add a meal" or "Budget"
  - an open flex slot's dashed row and Log, a skipped slot's muted row and a "2 items" row look as before, apart from the name
  - with VoiceOver, each slot's button still says its slot, on Today and Plan
  - tapping a slot opens the same sheet, and focus comes back to it when the sheet closes
  - Other and an off-plan day's slots show their names the same way
  - it works at 360px and 390px in light and dark

- [x] **14.6 Swap in the meal editor**
      Swap a food in a saved meal without removing and re-adding it (SPEC §3.3).
  - In `saved-meals.js`, a pure `swapItem(meal, foodId, newFoodId, qty, unit)`: the new food takes the item's place; one already in the meal gets the amount added to it, converted into its unit, like `addItem`.
  - The meal editor's ingredient rows trade their remove button for the swap icon button, opening the ingredient swap sheet from the Ingredients sheet (8.5): Remove from meal, then food search, the picked food starting at the old amount when it has the same unit. Reuse that sheet rather than copy it.
  - Update DESIGN §8's ingredient row (meal editor).

  _Done when:_
  - tests cover a swap keeping its place, a swap merging into a food already in the meal in another unit, and the other items untouched
  - swapping white bread for gluten-free bread in a saved meal keeps its place and amount, and the meal's totals move
  - Remove from meal in the swap sheet removes the food
  - locked days and today's ingredient changes are unchanged
  - it works at 360px and 390px in light and dark

- [x] **14.7 Swap an added item**
      On Today, anything added to a slot or to Other can be swapped, not only removed (SPEC §3.5).
  - In `data.js`, a pure `swapDayEntry(day, entryId, entry)`: the new entry, made for the same slot, takes the old one's place in `entries`.
  - In the slot actions sheet, the filled flex sheet and the Other sheet, an added entry's row becomes one row button with a chevron. A meal added with its ingredients opens its Ingredients sheet as now, which gains "Swap meal" above Remove from slot. Anything else opens a small item sheet titled with the entry: "Swap", then "Remove from slot" (confirm sheet).
  - Swap opens the swap sheet (Meal · Food · Quick) without Make this the default, ending in Swap meal, Swap food or Swap numbers.
  - Locked days are unchanged.
  - Update DESIGN §8: the added entry row, the item sheet, and the swap sheet opened from an entry.

  _Done when:_
  - tests cover a swap keeping the entry's place and slot, and Recent listing the new entry
  - a banana added to lunch, swapped for an apple, shows the apple where the banana was, and the rings move by the difference
  - an item in a filled flex slot swaps for quick numbers, and an item in Other swaps for a saved meal
  - an edited added meal swapped for a food leaves no ingredient lines behind
  - Remove from slot still asks first
  - it works at 360px and 390px in light and dark

- [x] **14.8 Planned foods: logic**
      The pure logic for SPEC §3.4's planned foods and §3.5's changes to them, with no UI.
  - In `slots.js`: `addSlotFood`, `updateSlotFood` and `removeSlotFood` on the template slot's `foods`, adding to the amount of a food already planned there, like `addItem`. `templateSlots` gives each slot its foods. A slot with a meal or foods isn't flex.
  - `daySlots` gives each plan its planned foods as ingredient snapshots, from the template or the day's `foods` change; a skipped slot has none; an off-plan day ignores them. New day helpers set the day's version of a slot's planned foods (an empty list allowed), and `clearSlotChange` drops it; a meal swap keeps it.
  - In `calc.js`: `slotTotals` adds the planned foods, the portion scaling only the meal; Plan totals and `flexGap` count them.
  - In `lock-in.js`: each planned food becomes a `food` entry after the slot's meal, marked `planned: true`.
  - In `custom-foods.js`: deleting a custom food planned in a slot archives it, as for one used in a meal.

  _Done when:_ tests cover:
  - a slot planning only a banana counting in `dayTotal` and `flexGap`, and not being flex
  - a meal with a banana, at 1.5× scaling the meal and not the banana
  - Skip dropping both; swapping the banana for an apple and removing a food for the day; As planned bringing back the template's
  - a meal swap keeping the day's planned foods
  - `lockDay` writing the meal, then its foods marked planned, and `recentEntries` leaving them out
  - Plan totals including them; a pinned budget ignored on a slot with foods
  - an off-plan day ignoring them
  - editing or deleting the food after lock-in leaving the day as it was, and deleting a planned custom food archiving it
  - a doc without `foods` giving the same results as before

- [x] **14.9 Planned foods: Plan**
      Planned foods in the Plan view, using 14.8.
  - Tapping a slot opens its sheet as now, with its planned foods above the meal picker: a row each with its amount and a remove icon button, then "Add food", which opens the add food sheet with its amount and unit button (12.3).
  - A slot's row shows what it plans like a Today slot: one thing as itself, more than one as "N items" with the meal first, then its foods. A slot with foods and no meal no longer shows "Add a meal".
  - The totals card counts planned foods.
  - Update DESIGN §8's Plan slot rows and slot sheet.

  _Done when:_
  - adding 1 banana to a Snack slot shows "🍌 Banana" on its row, with no "Add a meal", and the totals card moves
  - adding a banana to a lunch slot with a meal shows "2 items"
  - adding a second banana makes it 2 banana, not a second line
  - removing the last food and having no meal makes the slot flex again
  - it survives a reload and syncs between browsers
  - it works at 360px and 390px in light and dark

- [x] **14.10 Planned foods: Today**
      Planned foods on Today, using 14.8.
  - Slot rows follow SPEC §3.6: one planned food alone shows as itself, and a meal with foods, several foods or anything added shows as "N items", meal first, then planned foods, then what's been added.
  - In the slot actions sheet, planned foods follow Portion as rows with a chevron, each opening the item sheet from 14.7 with "Swap" (food picker, starting at the old amount when the unit matches) and "Remove for today" (no confirm sheet, since As planned undoes it). With no meal, Swap and Edit in the top row are disabled and Portion doesn't show. The title is the slot with its meal, or with its one food ("Snack · Banana").
  - Update DESIGN §8's meal slot and slot actions sheet.

  _Done when:_
  - a Snack slot planning a banana shows "🍌 Banana" and counts in the rings without being touched
  - swapping it for an apple today shows the apple, and tomorrow is a banana again
  - Remove for today takes it out of the rings, and As planned brings it back
  - lunch with a meal and a banana shows "2 items", and 1.5× moves only the meal's numbers
  - the next day, the banana is in the locked day as a food entry, and not in Recent
  - it works at 360px and 390px in light and dark

- [x] **14.11 Slot items: the template**
      First of the slot rework (SPEC §3.4, §3.5, §3.6): a slot becomes a container of planned meals and foods. 14.11–14.13 add the new logic beside the old, with tests that check both agree on the same data, so nothing on screen changes until 14.14 switches Today over. The old functions stay until 14.19. Pure logic, no UI.
  - In `slots.js`, a pure `slotItems(templateSlot)`: its `items`, or for a slot saved before, its `mealId` then its `foods`, with ids made from what they plan (`meal-<mealId>`, `food-<foodId>`), so they're the same on every read without using positions. A slot with `items` ignores `mealId` and `foods`.
  - Template changes, each returning a new doc that writes `items` and drops `mealId` and `foods`: `addPlannedMeal` (a meal already in the slot isn't added twice), `addPlannedFood` (adding to the amount of a food already there, like `addItem`), `removePlannedItem`, and `replacePlannedItem` for Make this the default, with SPEC §3.4's rule for a meal or food already elsewhere in the slot. New items get `crypto.randomUUID()` ids.
  - A pure `planSlots(doc, getFood)`, the new `templateSlots`: each slot with its items resolved, a meal that's since been deleted left out, and `flex` when nothing's left.
  - In `custom-foods.js`: archiving checks `slotItems`, so it works on both shapes. Export and import carry `items`.

  _Done when:_ tests cover:
  - a slot saved as `mealId` and `foods` reading as items, the meal first, with the same ids every time
  - adding a meal twice leaving it once, and adding a food twice adding up its amount in its unit
  - removing the last item making the slot flex, its budget kept
  - `replacePlannedItem` keeping the item's place, and the meal-already-there and food-already-there cases
  - a written slot having `items` and no `mealId` or `foods`; a slot with both ignoring the old fields
  - a deleted meal left out; deleting a custom food planned in either shape archiving it
  - an old backup importing and reading as before
  - every existing test still passing, untouched

  _Model:_ Opus 5.5, high effort. It sets the shape everything after builds on, and has to read live data saved in the old shape.

- [x] **14.12 Slot items: the day's version**
      What each slot holds on a day, and the day's changes to it (SPEC §3.5), as pure logic beside the old. slots.js is near 300 lines, so this goes in a new `js/day-plan.js`. No UI.
  - A pure `dayPlan(doc, day, getFood)`, the new `daySlots`: each slot `{ id, name, flex, budget, skipped, items, ownVersion, entries }`. `items` are what the day eats, as day items (SPEC §3.5): the template's, live, until the day has its own version, then the day's snapshots. Off plan, every slot is flex with no items. A skipped slot has none.
  - Old-shape changes (`mealId`, `portion`, `ingredients`, `entry`, `foods`) read as the day's version they describe, meal first, then the planned foods.
  - In `data.js`, day item builders for a meal (with its ingredients, at 1×), a food and quick numbers, and `swapped`.
  - Day changes, each returning a new day: `swapPlannedItem` (the new item takes the old one's place and id, marked swapped), `setItemPortion`, `setItemIngredients`, `resetItemIngredients`, `removePlannedItem` (the last one becomes a skip), `skipPlannedSlot`. The first change copies the slot's whole list as snapshots. `clearSlotChange` works on both shapes. An empty list is stored as a skip.
  - Agreement tests: for a set of days in the old shape (a swap to a meal, a swap to a food and to quick numbers, a skip, a portion, an ingredient change, a planned foods change, and combinations), `dayPlan` gives the same items, amounts and numbers as `daySlots`.

  _Done when:_ tests cover:
  - every old-shape change reading as before (the agreement tests)
  - a template change reaching a day with no version of its own, and not one that has one
  - a swap keeping its place and id, marked swapped; quick numbers swapped in
  - a portion and an ingredient change on one of two meals in a slot leaving the other alone; reset going back to the meal as planned at 1×
  - removing the last planned item skipping the slot; As planned bringing the template back with the added entries kept
  - off plan ignoring everything; a flex slot ignoring a leftover change

  _Model:_ Opus 5.5, extra-high effort. The hardest step: every combination of old changes has to read exactly as it does now, or today's or a future day's plan changes without you touching it.

- [x] **14.13 Slot items: totals and lock-in**
      The day's total, flex remaining, Plan totals and lock-in, worked out from 14.11 and 14.12. Lock-in only reads, so it switches to the new logic here; the rest is switched over by the screens in 14.14–14.16.
  - In `calc.js`: new versions of `slotTotals`, `dayTotal`, `flexGap` and the Plan totals over `dayPlan` and `planSlots`: each meal at its own portion, each food at its amount.
  - In `lock-in.js`: each slot's day items in order, meals as `meal` entries with their ingredients and portion, foods as `food` entries, planned ones marked `planned: true` (a portion or ingredient change included) and swapped-in ones unmarked; then pinned budgets, as now.
  - Agreement tests: on the old-shape days and templates from 14.12, the new totals, flex gaps, Plan totals and `lockDay` give exactly what the old ones do.

  _Done when:_ tests cover:
  - the agreement tests
  - a slot with two meals and a food, one meal at 1.5×, totalling right
  - lock-in writing a swapped-in meal unmarked and a portioned planned meal marked; Recent listing the first and not the second
  - a pinned budget counting only while its slot is open flex
  - your real data, imported into a headless browser, locking in yesterday exactly as the old lock-in does

  _You'll need to:_ export your data from Settings and give me the file.

  _Model:_ Opus 5.5, high effort. Lock-in writes past days for good, so it has to be right before it's switched on.

- [x] **14.14 Slot items: Today's slots**
      Today's rows, rings and flex remaining read 14.12 and 14.13 (SPEC §3.6). The sheets still act through the old changes, which the new logic reads, so they keep working until 14.15.
  - Before any change, screenshots of Today for a set of seeded days (each kind of change, a filled flex slot, Other, off plan, a locked day) at 390px, light and dark, to compare against after.
  - Rows show planned items in order, then what's been added. A slot planning one item shows its changes in the name ("Breakfast · 1.5×"); with several, each item's line shows its own. A skipped slot with nothing added shows what it plans, muted.
  - Update DESIGN §8's Today slot rows.

  _Done when:_
  - the seeded days look the same as their before screenshots, apart from where SPEC §3.6 changes them
  - a slot seeded with two meals and a food shows "3 items" in order, with the right total, and a 1.5× on one meal shows on its line
  - the rings and flex remaining match the before screenshots
  - it works at 360px and 390px in light and dark

  _Model:_ Opus 5.5, high effort. Today is the screen you use every day, and every row variant has to match.

- [x] **14.15 Slot items: Today's slot actions**
      The slot actions sheet on the new model (SPEC §3.6), writing only the new day shape.
  - One planned item: its actions first, as now (Swap, Skip, Edit, then Portion for a meal; Edit off and no Portion for a food or quick numbers). Several: Skip, then a row per planned item opening its item sheet: Swap, Portion and Edit for a meal, and Remove for today.
  - Swap on any planned item opens the swap sheet (Meal · Food · Quick). A food starts at the old amount when the unit matches. No Make this the default yet: it needs 14.11's `replacePlannedItem`, which writes the new items shape, and Plan can't read that until 14.16 — using it here would make the slot go blind on Plan. Comes back once 14.16 lands.
  - Edit opens the Ingredients sheet for that meal. Remove for today has no confirm sheet; removing the last one skips the slot. As planned shows once the slot has a change.
  - "Added to this slot", Add to this slot, the filled flex sheet and Other are unchanged. 14.10's "Removed for today" row goes.
  - Update DESIGN §8's slot actions sheet and item sheet.

  _Done when:_
  - Oats & whey at 1.5×, swapped for another meal, then As planned, all work as now, in two taps
  - a banana planned alone swaps for a saved meal and for quick numbers; tomorrow it's a banana again
  - a slot with two meals: each opens its own Portion and Edit, and changing one leaves the other
  - removing the last planned item shows the slot skipped; As planned brings it all back, added items kept
  - it works at 360px and 390px in light and dark

  _Model:_ Opus 5.5, high effort. The busiest sheet in the app, with two layouts and many paths through it. If it grows past one session, split the several-items layout into its own step.

- [x] **14.16 Slot items: Plan**
      Plan on the new model (SPEC §3.4): rows and totals from `planSlots`, and the slot sheet writing `items`.
  - The slot sheet lists the planned items, each with its amount and remove, then a Meal · Food picker laid out like the add sheet's, without Recent and Quick. Picking adds to the slot and the sheet stays open; a meal already planned shows checked and isn't added twice. A flex slot keeps Pin a budget.
  - Rows show one item as itself, several as "N items" in order. The totals card counts every item.
  - Update DESIGN §8's Plan slot rows and slot sheet.

  _Done when:_
  - a Lunch slot planning two meals and a banana shows "3 items", and Today shows the same
  - adding a second banana makes it 2 banana; picking the same meal again doesn't add it
  - removing every item makes the slot flex again
  - a template saved before this step shows as before, and is saved as `items` after its first change
  - it survives a reload and syncs between browsers
  - it works at 360px and 390px in light and dark

  _Model:_ Sonnet 5, high effort. One screen with clear rules, reusing the add sheet's picker.

- [x] **14.17 Make this the default**
      "Make this the default" on the swap sheet (SPEC §3.4, PLAN 14.15), now that 14.16 has Plan reading and writing the same `items` shape as Today: a meal or a food swapped for a planned item can also replace it in the template, not just for the day. Quick numbers still can't, since the template plans meals and foods, not numbers.
  - In `slots.js`, 14.11's `replacePlannedItem` gains an optional `id` for the new item, defaulting to a uuid: a caller that applies the change twice, to the doc it shows and to the one it saves, passes the same id to both, so they agree.
  - A new `swapPlannedItemToDefault(doc, day, slotId, itemId, item, placedId, getFood)` in `day-plan.js`: doc is the core doc with the template already changed by `replacePlannedItem`, which put the pick in itemId's place under placedId. A day with no version of its own reads the new template as it is, so only a skip goes, since picking something means eating it. One with its own version takes the template's new item in itemId's place, unmarked, so a day whose only change was to that item has none left. Where the template has no new item there, since the pick was already in the slot (`replacePlannedItem`'s own merge rules: a meal already elsewhere stays once, a food already elsewhere gets the amount added there), the day goes the same way: a meal it still has elsewhere just leaves, and a food or its own meal is swapped in, as by `swapPlannedItem`.
  - The swap sheet's Meal and Food panes gain "Make this the default" as a switch above them, off each time the sheet opens.
  - In `today.js`, Swap on a planned item: without the switch, swaps for the day only, as now (14.15); with it, changes the template through `replacePlannedItem` and the day through `swapPlannedItemToDefault`, with one id made once and passed to both.
  - Update DESIGN §8's swap sheet.

  _Done when:_
  - tests cover `swapPlannedItemToDefault` for a day with no version of its own, one with its own version, a pick already in the slot (a meal already elsewhere stays once, a food already elsewhere merges), and the item's own meal or food changing nothing
  - making a planned food the default for another food changes Plan and today straight away, and tomorrow starts from it without a swap of its own
  - a swap with the switch off still only changes today; Quick has no switch
  - it works at 360px and 390px in light and dark

  _Model:_ Opus 5.5, medium effort. Small, but touches the swap sheet, Today and Plan's shared reading of the template together.

- [x] **14.18 Portion on added meals**
      Any meal in a slot has a portion, planned or added (SPEC §3.5).
  - In `data.js`, `setEntryPortion(day, entryId, portion)`: an added meal's numbers become its ingredients' total at the portion; editing its ingredients sets it back to 1×, as for a planned meal.
  - An added meal with its ingredients opens the same item sheet as a planned meal: Swap, Portion, Edit, then Remove from slot (confirm sheet). Other added entries open Swap and Remove as now.
  - Update DESIGN §8's added entry row and item sheet.

  _Done when:_
  - tests cover a portion's numbers, editing setting it back to 1×, reset, and Recent listing the meal as added
  - a meal added to Dinner at 1.5× moves the rings, and its ingredients show at 1.5×
  - Remove from slot still asks first
  - it works at 360px and 390px in light and dark

  _Model:_ Opus 5.5, medium effort. Small, but it changes how added meals open, which 14.7 built.

- [x] **14.19 Slot items: retire the old model**
      Remove what nothing uses any more: the old `templateSlots`, `daySlots`, slot change helpers and totals, and their tests. The agreement tests' old-shape data stays, as tests that it reads as SPEC §3.5 says, so old data keeps working. No behaviour changes.
  - Before removing anything, list each function with what still calls it; remove only the ones with no callers left.
  - A last headless pass over Today, Plan, a locked day and off plan, against 14.14's screenshots.

  _Done when:_
  - nothing imports a removed function, and every remaining test passes
  - the old-shape reading tests still pass
  - Today, Plan and a locked day look as they did after 14.18
  - you've opened the app on your phone with your real data and it looks as it did

  _Model:_ Sonnet 5, high effort. Mostly removal, but wide, and anything removed by mistake breaks the app.

- [x] **14.20 Custom food units: logic**
      The pure logic for SPEC §3.2's units on custom foods, with no UI.
  - In `custom-foods.js`: a custom food can have `grams` (its serving's weight, above 0) and `portions` (`[{ unit, grams }]`), each unit named once and never "g" or the serving's unit. A serving in g gives `grams` from its quantity.
  - In `portions.js`: a custom food with `grams` has units like a bundled food's: its serving's, then grams, then its portions; without `grams`, only its serving's.
  - A pure `unitsInUse(foodId, doc)`: the units its saved meals' items and the template's planned foods (`slotItems`, 14.11) are in, so the form can keep those from being removed.
  - Duplicating a bundled food keeps its `grams` and `portions`. Export and import carry them.

  _Done when:_ tests cover:
  - a custom food with a serving weight offering grams and its units, and one without offering only its serving's
  - an amount in an added unit converting through grams
  - a serving in g getting its weight from its quantity
  - a repeated unit, "g" or the serving's unit refused as a unit
  - `unitsInUse` finding a unit used in a meal and in a planned food
  - a duplicate keeping its portions
  - custom foods saved before this step unchanged

  _Model:_ Sonnet 5, high effort. Small and pure, but unit conversion is easy to get subtly wrong.

- [x] **14.21 Custom food units: form**
      The custom food form gains the serving's weight and other units, using 14.20.
  - After Carbs: "Serving weight", a numeric field with a "g" suffix, hidden when the serving is in g. Then "Other units": a row per unit (its name, then its weight with a "g" suffix, "1 cup = 158 g"), each with a remove icon button, then "Add unit" as a secondary button. Other units need the serving weight, so they show once it's filled in.
  - A unit in use can't be removed: its remove button is disabled, with one line saying which meal or slot uses it.
  - Search results and the Foods list show a custom food at its default amount, like a bundled food (DESIGN §8).
  - Update DESIGN §10's custom food form.

  _Done when:_
  - a custom protein powder with a 1 scoop serving, 31 g, can be added as 1 scoop or 45 g with the right numbers
  - a custom overnight oats with a 100 g serving and "1 cup = 240 g" shows "1 CUP · 240 G" in search, and Unit offers cup and g
  - a unit used in a meal can't be removed, and says where it's used
  - it survives a reload and syncs between browsers
  - it works at 360px and 390px in light and dark

  _Model:_ Sonnet 5, medium effort. One form, built from existing components.
