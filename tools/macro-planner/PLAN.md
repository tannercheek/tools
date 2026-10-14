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

**Targets before Settings exist:** until step 6.1, the app uses the default profile from step 2.3, so rings and remaining numbers still work.

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

  Every later step reuses these rather than making its own. Never use the browser's `confirm()`, `prompt()` or `alert()`. Show every component on an unlinked `#/components` route for checking; step 7.3 removes it.
  _Done when:_ on `#/components`, each component matches DESIGN.md in light and dark, buttons sink into their edge when pressed, focus is visible on every control, and the sheets trap focus and close with Escape.

## Phase 1 — Core math (`js/calc.js`, no DOM)

- [ ] **1.1 Units, BMR, TDEE**
      kg/lb and cm/ft-in conversions, Mifflin-St Jeor BMR, activity multipliers, TDEE.
      _Done when:_ tests cover both sexes, every activity level, and conversion round-trips.

- [ ] **1.2 Targets**
      Goal adjustment from rate, macro defaults (protein g/kg, fat %, carbs remainder), manual overrides, warnings for below-BMR calories and clamped negative carbs.
      _Done when:_ tests cover lose/maintain/gain, each override on its own, and both warnings.

- [ ] **1.3 Totals**
      Food × quantity → kcal/P/F/C, meal totals, day totals from log entries, remaining vs targets, portion multiplier.
      _Done when:_ tests cover rounding (display rounding only — keep raw values internally), empty meals and empty days.

- [ ] **1.4 Stats math**
      N-day averages excluding empty days, days-on-target (thresholds as named constants), average weekly weight change.
      _Done when:_ tests cover gaps in data, fewer than 2 weeks of weight, and all-empty ranges.

## Phase 2 — Storage (no DOM)

- [ ] **2.1 Adapter + local implementation**
      `store.js` with the `load / save / remove / list` interface, a localStorage implementation, and an in-memory fake for tests.
      _Done when:_ tests cover save/load round-trip, remove, and prefix listing.

- [ ] **2.2 Personal adapter**
      **Ask before editing `shared/persist.js`.** Add `remove` and `list` there if feasible (otherwise use the fallback in SPEC §4.1). Wrap it as the personal adapter with localStorage fallback, chosen by `MODE`. Expose sync status and show it as the header sync icon (SPEC §4.1, DESIGN §11). This is the only UI in Phase 2.
      _Done when:_ personal mode syncs between two browsers; the sync icon shows synced after a save and offline with the network turned off in DevTools; public mode never requests `persist.js` and shows no sync icon (check the Network tab); tests still pass.

- [ ] **2.3 Data model**
      Core doc shape with defaults (default profile, slots Breakfast/Lunch/Dinner, empty foods and meals, retention 1 year, `schemaVersion: 1`). Month log helpers: `getDay(date)`, `saveDay(date, day)`, routed to the right `macro-planner-log-YYYY-MM` doc.
      _Done when:_ tests cover first-run defaults, days in different months, and month boundaries.

- [ ] **2.4 Purge**
      Retention calculation at month granularity, once-per-day guard, returns which month docs it removed.
      _Done when:_ tests cover 6 months, 1 year, never, and the once-per-day guard.

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

- [ ] **3.4a Emoji assets and picker**
      `scripts/build-emoji.mjs` takes the path to a local clone of github.com/microsoft/fluentui-emoji (kept outside the repo) and bundles only the Flat SVGs in use into `assets/emoji/`, with `manifest.json` and Fluent's `LICENSE`, per SPEC §5.1. It lists any character it couldn't find. Curate `data/emoji-picker.json`: ~80–120 food emoji, including every category default and 🍽️. `js/emoji.js` maps a character to its SVG, with the native fallback. Switch the list-row tile to use it. Build the emoji picker sheet on the 0.3 bottom sheet, per DESIGN §10. It returns the chosen character.
      _You'll need to:_ clone fluentui-emoji outside the repo (`git clone --depth 1 https://github.com/microsoft/fluentui-emoji`). It's large, and none of it is committed except the copied SVGs and license.
      _Done when:_ `assets/emoji/` holds only the SVGs in use plus `manifest.json` and `LICENSE`; Foods rows show Fluent emoji; a character with no bundled SVG renders natively; the picker opens, shows the current pick selected, and returns the new one; tests cover the character → filename mapping, including U+FE0F.

- [ ] **3.4 Custom foods**
      Add / edit / delete form in DESIGN §10 order (name, serving qty + unit, kcal, P, F, C), with an emoji tile beside the name that opens the picker. New custom foods default to 🍽️. Duplicate a bundled food into a custom one (keeps its emoji). Delete archives the food if any meal uses it, and always asks first with the confirm sheet.
      _Done when:_ custom foods and their emoji persist, sync (personal mode), and an archived food still shows correctly inside its meal.

- [ ] **3.5 Full food list**
      Expand `food-list.json` to 300–500 foods following SPEC §3.2's coverage list, then re-run both scripts. This step is data only — no code changes.
      _Done when:_ you've skimmed the list for gaps, naming clarity (raw vs cooked, dry vs cooked) and emoji choices, and `build-emoji.mjs` reports nothing missing.

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

## Phase 5 — Plan and Today

- [ ] **5.1 Rings**
      SVG ring component per DESIGN §6: eaten / target, remaining, over-target state. Render a demo on Today.
      _Done when:_ rings look right at 0%, 50%, 100% and 130%.

- [ ] **5.2 Slots and template**
      Slot count (3–6), names and order (in Settings). Plan view assigns a meal or "flex" to each slot.
      _Done when:_ the template persists and survives a reload.

- [ ] **5.3 Today, read-only**
      Rings plus slot list showing planned meals and totals; date switcher (prev / next / tap the date for today). "No meals planned" empty state from DESIGN §13.
      _Done when:_ any date shows the template; rings show 0 eaten.

- [ ] **5.4 Mark eaten**
      One tap logs a planned slot with a snapshot entry (label, emoji, numbers); portion multiplier; undo / remove.
      _Done when:_ editing the meal afterwards does **not** change the logged day.

- [ ] **5.5 Swaps**
      Swap a slot's meal for one day; "make this the default" updates the template.
      _Done when:_ a swap affects only that date unless made default.

- [ ] **5.6 Flex slot**
      Shows remaining after other slots; optional fixed budget; resolve by logging a meal, a food or quick numbers.
      _Done when:_ remaining updates live as other slots are marked eaten.

- [ ] **5.7 Quick-add and copy yesterday**
      Quick-add a food (search, qty, slot) and quick numbers (kcal + macros + optional label). Copy yesterday with the confirm sheet.
      _Done when:_ all three show up in rings and survive reload.

- [ ] **5.8 Weight check-in**
      One optional number per day on Today, in the display unit.
      _Done when:_ it saves to the day and converts correctly between units.

## Phase 6 — Settings and Stats

- [ ] **6.1 Profile and targets**
      Profile form with live calculated targets, per-target overrides, reset to calculated, units toggle. First launch opens here.
      _Done when:_ changing weight or goal updates targets immediately everywhere.

- [ ] **6.2 Retention**
      Retention setting wired to the purge on app load.
      _Done when:_ with a fake old month doc in storage, it's removed on load per the setting.

- [ ] **6.3 Export, import, reset**
      Export all docs as one JSON file; import replaces all (confirm sheet); reset everything (confirm sheet).
      _Done when:_ export → reset → import restores everything exactly.

- [ ] **6.4 Stats**
      7 / 30 day segmented control, average rings, days on target with day markers (DESIGN §7). Empty state for under 2 days of data (DESIGN §13). No daily or stacked bar charts; they aren't in SPEC.
      _Done when:_ numbers match a hand calculation on a week of test data.

- [ ] **6.5 Weight trend**
      SVG line of check-ins (DESIGN §7), average weekly change, "recalculate targets?" offer in a confirm sheet after 2+ weeks.
      _Done when:_ recalculating uses the latest weight and updates targets.

## Phase 7 — Polish and publish

- [ ] **7.1 Public build check**
      Flip `MODE` to `'public'` and verify: no `persist.js` request, no sync or passphrase UI, everything works from localStorage. Add a test that the public adapter is local-only.
      _Done when:_ verified in a private window, then flip back to `'personal'`.

- [ ] **7.2 Mobile and accessibility pass**
      Tap targets ≥ 44px, focus states, labels on inputs, reduced-motion, no horizontal scroll at 360px.
      _Done when:_ you've used it on your phone for one full day.

- [ ] **7.3 Design audit**
      Search `style.css`, `components.css` and `js/` for hard-coded colours, sizes, spacing, radii, shadows, durations, easings and z-index values, and replace each with a token (SVG geometry in viewBox units is fine). Walk the DESIGN §15 checklist item by item. Check every view and sheet in light and dark, and with reduced motion on. Remove the `#/components` route.
      _Done when:_ no hard-coded values remain outside `tokens.css`; every DESIGN §15 item passes; every view has been checked in both light and dark.

- [ ] **7.4 Ship**
      Final check of the four dashboard meta tags. Nothing to merge; all work is already on `main`.
      _Done when:_ after you push, the "Build tool index" action has run, the card shows on the live dashboard, and the tool opens from it.
