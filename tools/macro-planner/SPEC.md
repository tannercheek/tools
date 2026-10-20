# Macro Planner — SPEC (v1)

A deliberately small calorie and macro tracker that doubles as a meal planner. Built for lifters who eat routine meals: set up a day of meals once, note only what changes, and see on four rings where the day will land.

**Working title:** Macro Planner · **Slug:** `macro-planner` · **Status:** v1 spec

---

## 1. Principles

1. **Routine over flexibility.** The common case is eating the same few meals. On a normal day, that takes no taps at all.
2. **The plan is what you eat.** Planned meals count without being marked. You only record what changes: a swap, a skip, a portion, and what goes in flex slots. The plan answers "what should I aim for at dinner?", and nothing nags, warns or marks a day incomplete. An open flex slot is just open.
3. **Four numbers per food.** Calories, protein, fat, carbs. No micronutrients, no fibre, no sugar.
4. **No accounts, no backend.** Syncs through `shared/persist.js`. A public, local-only version would be a later port to its own repo (§4.1).
5. **Today and the last 7 days.** Day records cover today and the 7 days before it, never further back. Older days are dropped automatically. Bodyweight is the one exception: weigh-ins are kept, because a trend needs weeks (§3.1).
6. **When in doubt, cut it.** Anything not in this document is out of scope for v1.

---

## 2. Stack and structure

Vanilla HTML, CSS and JS with ES modules. No framework, no build step, no dependencies. Charts and rings are hand-written SVG. The look is defined by `DESIGN.md` and `tokens.css`, which are final.

```
tools/macro-planner/
├─ index.html            # dashboard meta tags live here
├─ tokens.css            # design tokens (final; see DESIGN.md)
├─ components/           # shared component styles, one per js/ui/ module, tokens only
├─ style.css             # base, shell and view styles, tokens only
├─ app.js                # boot, storage, routing between views
├─ data/
│  ├─ foods.json         # bundled generic food database
│  └─ emoji-picker.json  # small curated emoji picker grid, with names
├─ js/
│  ├─ calc.js            # BMR / TDEE / targets / totals (pure functions)
│  ├─ store.js           # storage adapter interface + both implementations
│  ├─ data.js            # doc shapes and defaults, day and weigh-in helpers
│  ├─ rings.js           # SVG ring component
│  ├─ icons.js           # inline Lucide UI icons
│  ├─ LICENSE-lucide.txt
│  ├─ ui/                # shared components: buttons, rows, inputs, controls, sheets
│  └─ views/             # today, plan, foods, meals, stats, settings
├─ scripts/              # build-foods.mjs, food-list.json
└─ tests/                # node --test, pure functions only
```

**Dashboard metadata** (in `index.html`):

```html
<title>Macro Planner</title>
<meta name="description" content="Plan routine meals, track four macros">
<meta name="icon" content="chart">
<meta name="tags" content="health, nutrition, fitness">
```

---

## 3. Features

### 3.1 Profile and targets

**Inputs:** sex, age, height, weight, activity level, goal, goal rate, unit system.

**Calculation:**

| Step | Formula |
|---|---|
| BMR (Mifflin-St Jeor) | `10 × kg + 6.25 × cm − 5 × age + 5` (male) / `− 161` (female) |
| TDEE | BMR × activity multiplier |
| Calorie target | TDEE + goal adjustment |

Activity multipliers: sedentary 1.2 · light 1.375 · moderate 1.55 · very active 1.725 · extreme 1.9

Goal adjustment: rate in kg per week × 7700 kcal/kg ÷ 7. Rate options: 0.25, 0.5, 0.75 kg/week (0.5, 1, 1.5 lb/week). The rate is stored in kg; an imperial option is converted from lb, so 1 lb/week gives ≈ 499 kcal/day, not 500. Negative for lose, positive for gain, zero for maintain.

**Macro defaults:**
- Protein: 1.8 g/kg bodyweight (≈ 0.8 g/lb)
- Fat: 25% of calories (9 kcal/g)
- Carbs: remaining calories (4 kcal/g)

**Rules:**
- Every target (calories, protein, fat, carbs) can be manually overridden. An override sticks until reset.
- Warn, but don't block, if the calorie target falls below BMR.
- If carbs would go negative, clamp to 0 and warn.
- Imperial/metric toggle. Store everything in metric internally; convert for display only.
- **Weight comes from the weight log.** The profile's weight is the latest weigh-in. Adding one recalculates the targets straight away. Until the first weigh-in, there's no weight.
- **Targets need a complete profile:** sex, age, height, weight, activity level and goal, plus a rate unless the goal is maintain. Until then there are no targets, calculated or overridden. The rings show the no-targets state (DESIGN §13), open flex slots show no remaining (§3.4), and Plan totals show the template's totals only.
- Switching units snaps the goal rate to the matching option in the new system (0.5 lb ↔ 0.25 kg, 1 lb ↔ 0.5 kg, 1.5 lb ↔ 0.75 kg per week), so the calorie target can move by 25–77 kcal/day.

**Weight log:** for weighing in whenever you happen to, not on a schedule.

```js
// weigh-in
{ date: "2026-10-15", kg: 82.4 }
```

- Add a weigh-in from Stats, or by entering a weight in the profile form, which logs one for today. The date defaults to today and can be set to an earlier day.
- One weigh-in per date. Adding another for the same date replaces it.
- Delete a weigh-in (confirm sheet). The profile weight falls back to the latest one left.
- Gaps are normal. Nothing reminds you to weigh in or marks a gap as missed.
- Weigh-ins are kept indefinitely. A year of them is about 10 KB.
- **Actual rate:** the least-squares slope through the weigh-ins from the last 28 days, in kg/week (shown as lb/week in imperial). It needs at least two weigh-ins at least 7 days apart. With fewer, no rate is shown. A slope uses every weigh-in, so one heavy morning moves it less than it would move a first-to-last difference.

### 3.2 Foods

**Bundled database:** `data/foods.json`, generic whole foods curated from USDA FoodData Central (Foundation + SR Legacy, public domain). Loaded once and searched in memory. It starts with ~50 foods. It grows after a week of real use, adding what you actually missed (PLAN Phase 8), aiming at the priorities below rather than a target count.

**Coverage priorities:** eggs (S/M/L as separate entries), meats and fish (raw and cooked), rice/oats/pasta/potatoes (dry and cooked), bread, dairy, tofu, legumes, common fruit and vegetables, oils, nut butters, protein powder (generic whey).

**Food record:**

```js
{
  id: "usda-171287-large",   // "usda-<fdcId>", plus "-<variant>" if needed (below); or "custom-<uuid>"
  name: "Egg, large",
  serving: { qty: 1, unit: "egg" },   // or { qty: 100, unit: "g" }
  emoji: "🥚",
  kcal: 72, protein: 6.3, fat: 4.8, carbs: 0.4,
  custom: false,
  archived: false
}
```

- Each food has **one** serving definition. Quantities are expressed in that unit. Egg sizes, raw vs cooked, and so on are separate entries rather than conversions.
- **Bundled ids:** `usda-<fdcId>`. When one USDA food gives several entries, each gets a variant suffix: egg sizes are one USDA food with three portions, so they're `usda-171287-small`, `-medium` and `-large`. Ids never change once set, because meals refer to foods by id.
- Name labels must be unambiguous about state: "Rice, white, cooked" vs "Rice, white, dry".
- **Emoji:** every food has an `emoji` field holding a single Unicode emoji character (never an image path). Bundled foods get an exact emoji where one exists (🥚, 🍌, 🍚), otherwise their category default: meat 🥩, poultry 🍗, fish 🐟, grains 🌾, legumes 🫘, dairy 🥛, vegetables 🥦, fruit 🍎, nuts/seeds 🥜, oils/fats 🫒, supplements 🥤. See §5.1 for how emoji render.

**Custom foods:** emoji, name, serving qty, serving unit, kcal, protein, fat, carbs. That's the whole form. Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).

- Edit and delete custom foods. Bundled foods are read-only (but can be duplicated into a custom food to adjust).
- Deleting a food that's used in a meal **archives** it: hidden from search, still resolvable inside existing meals.
- Search matches across bundled and custom foods. Custom foods rank first.
- **Foods list:** the Foods segment of the Meals tab (§5). It lists every food that isn't archived, with search, an "Add custom food" button, and a "Custom foods only" switch that hides bundled foods. The switch isn't saved, so it starts off each visit. Custom foods are edited and deleted from here, and bundled foods are duplicated from here.

### 3.3 Meals

A meal is a named list of foods with quantities.

```js
{ id, name: "Rice & beef", emoji: "🍚", tags: ["Dinner", "Mexican"], items: [{ foodId, qty }] }
```

- Totals are computed from items, never stored.
- Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).
- Create, edit, duplicate, delete.
- Adding a food to a meal: search → pick → quantity in that food's serving unit.
- **Tags:** your own categories ("Breakfast", "Smoothies", "Mexican"), added and removed in the meal editor. `tags` is optional; a meal without it has no tags, so existing meals need no migration.
  - A tag is short text, trimmed. Matching ignores case: typing "mexican" reuses an existing "Mexican", and the first spelling is kept. A meal has each tag once.
  - The tag list is every tag your meals use, A–Z. There's no tag management: a tag no meal uses is gone, and renaming one means editing the meals that use it.
  - A duplicated meal keeps its tags.
- **Filter:** above the Meals list, a single row of pills: "All", then each tag. One is selected at a time, and the list shows the meals with that tag. The row is hidden while no meal has a tag. Like the "Custom foods only" switch, the filter isn't saved and starts on All each visit; if the selected tag stops existing, it goes back to All. Every place you pick a saved meal (a Plan slot, a swap, the add sheet; §3.4, §3.5) shows the same row above its list.

### 3.4 Daily plan

- **Slots:** 3–6, user-named (e.g. Breakfast, Lunch, Pre-workout, Dinner). Set in Settings.
- **Template:** each slot holds either a meal or flex, optionally with a pinned budget. The same template applies every day.
- **Swap:** a planned slot's actions let you swap its meal for another **for that day only**. A "make this the default" option updates the template.
- **Flex slot:** a slot with no fixed meal. While it's **open**, with nothing added yet, it displays the **remaining** calories and macros for the day: the targets minus the rest of the day (§3.5), meaning the planned meals after swaps, skips and portions, the pinned budgets of other open flex slots, and everything added to other slots. This is the gap to fill. Optionally the user can pin a budget instead: four numbers (kcal, protein, fat, carbs), entered like quick numbers. It's stored on the template slot as `budget: { kcal, protein, fat, carbs }`. A flex slot is filled by adding a meal, foods, quick numbers or a Recent entry to it. **Once filled, it's done:** it shows the total of what's in it, like a planned meal, instead of the gap, and its pinned budget no longer counts. Removing everything from it makes it open again.
- **More than one flex slot:** what's left is never split between them. Each open flex slot shows the full remaining, because you might fill it all with the first one or skip one. Once one is filled, the others show what's still left.
- **Open flex slots are normal.** A flex slot with nothing in it is just open, today or on a past day. It isn't shown as missed or incomplete. With no targets yet (§3.1), it shows as open, with no remaining. An open flex slot counts as nothing in the day's total, unless it has a pinned budget, which counts like a planned meal.
- **Off plan:** for vacations and days when the plan doesn't apply. "Off plan until [date]" (default: today only) turns every slot into a flex slot for those days. Each one shows what's left for the day, and you add meals, foods, quick numbers or Recent entries to it as usual. Planned meals, pinned budgets and changes are ignored on those days, and the template is unchanged. "Back on plan" clears it from today on. It's stored per day (`offPlan: true`), so past off-plan days stay off plan. Range: today up to 30 days ahead.
- **Plan totals:** the Plan view shows what the template adds up to (its meals plus any pinned flex budgets) against the targets, and one "left for flex" figure that isn't split between flex slots. A plan over target shows as over, never as a negative number. With no targets yet (§3.1), it shows the template's totals only, with no "left for flex".

### 3.5 Changes and the day's total

The plan counts as eaten. A day is the template plus what you change:

- **Swap** a planned slot's meal for that day (§3.4).
- **Skip** a planned slot: it counts as nothing that day.
- **Portion:** 0.5×, 1×, 1.5× or custom, on a planned slot's meal.
- **As planned** undoes a slot's swap, skip and portion.
- **Add a meal or food:** pick a saved meal, or search a food and enter a quantity, then choose a slot. In a flex slot it fills the slot. In a planned slot it's an extra alongside the meal.
- **Add quick numbers:** kcal + macros directly, with an optional label. For restaurants and guesses. Uses 🍽️.
- **Recent:** the add sheet lists what you added in the last 7 days, newest first, merged when label and numbers match. The planned meals and budgets that lock-in writes aren't listed: they're the plan, not something you added. One tap adds one again to the chosen slot. It covers leftovers, a repeated restaurant order and the same stand-in breakfast two days running. It reads the snapshot fields, so it works even if the food or meal has since been edited or deleted.
- **Remove** any added entry, after a confirm sheet: on Today from the slot's sheet (§3.6), on a locked day from its list.

**The day's total** is the planned meals (after swaps, skips and portions), the pinned budgets of open flex slots, and every added entry. On an off-plan day it's the added entries only.

```js
// day in macro-planner-days
{
  changes: { "<slotId>": { mealId, portion } }, // only slots that differ from the template.
                                                 // mealId: a swap; null: skipped; absent: the template's meal
  entries: [],     // added foods, quick numbers and Recent entries; after lock-in, the whole day
  offPlan: false,
  locked: false
}

// entry
{ id, slotId, slotName: "Lunch", label: "Rice & beef", emoji: "🍚", kcal, protein, fat, carbs, source: "meal" | "food" | "quick", planned: true }
// planned: only on the entries lock-in writes from the plan; absent on anything added
```

**Lock-in:** once a day has passed, its plan is written into `entries` as snapshot entries and `locked` is set:

- Each planned meal (after swaps, skips and portions) becomes a `meal` entry. Each open flex slot with a pinned budget becomes a `quick` entry labelled with the slot's name. Both are marked `planned: true`, so Recent can leave them out. `changes` is then ignored.
- It runs on app load and when the date changes while the app is open, for every past day in the window that isn't locked, from the core doc's `startedOn` date on. Days you never opened count as on plan. Days before you started using the app don't count.
- Any edit to a meal or the template happens in a session that has already locked every past day, so it can only affect today and later.
- A locked day is a list of entries. Correct it by removing an entry and adding what you actually ate.

**Snapshot rule:** each entry stores its own name, emoji and numbers when it's added or locked in. Editing or deleting a food or meal later **never** changes a past day.

The same goes for slots: an entry also stores its slot's name (`slotName`) when it's added or locked in. A locked day lists and labels its entries by that saved name, so renaming, reordering or removing a slot later never changes a past day. On any day, an entry whose slot no longer exists stays, still counts in that day's total, and shows under its saved slot name.

### 3.6 Today view (home)

- Four rings: calories, protein, fat, carbs. Each shows the day's total / target and what's left. The rings show where the day will land, not progress through it. With no targets yet (§3.1), they show the no-targets state (DESIGN §13).
- Slots listed in order. Each shows its meal (planned, swapped or skipped, with any portion) and its totals, or for a flex slot the remaining while it's open and the total of what's in it once filled, with anything added to it listed under it. Tapping a planned slot opens its actions: Swap, Skip, Portion, its added entries with remove, Add to this slot, As planned. An open flex slot's Log opens the add sheet. Tapping a filled flex slot lists what's in it, each with remove, plus Add to this slot.
- On a locked past day, the slots list that day's entries instead, each with remove, plus Add.
- Date switcher: previous/next day, back to today. It goes back to 7 days ago (the oldest kept day, §4.3) and forward without a limit, for planning swaps or off-plan days ahead.
- On an off-plan day, a short "Off plan" line sits above the slots, with "Back on plan".

### 3.7 Stats

**Last 7 days:** the 7 days before today, all locked in. Today is still in progress, so it stays on Today. No range toggle, nothing further back.

- The same four rings showing **daily averages** against target, over the days in the last 7 that have entries. Open flex slots count as nothing, so the averages are low by whatever went unrecorded. The weight trend is the real check.
- A day with no entries isn't counted, rather than counted as zero. That covers an off-plan day with nothing added, a day before you started, or a day with every slot skipped or open.
- Heading: "Daily average · last 7 days". If fewer than 7 days count, it reads "Daily average · 5 of the last 7 days". Never "logged" or "missed": you don't log days, and an uncounted day isn't a failure.
- With fewer than 2 counted days, show the empty state (DESIGN §13).

**Weight trend:**

- A line through the weigh-ins from the last 12 weeks, plotted by date, with the latest value labelled. A dashed line shows the goal rate starting from the first weigh-in in the window, so you can see whether you're on pace.
- Below the chart: the latest weight and its date, and the actual rate against the goal rate, e.g. "−0.3 kg/week · goal −0.5". This is information, not a verdict. Nothing is marked as missed or failed.
- "Log weigh-in" opens a sheet (weight, date). The most recent weigh-ins are listed below, each with delete.
- With fewer than 2 weigh-ins in the window, the chart, rate and button are replaced by the empty state (DESIGN §13), whose button is "Log weigh-in". The list still shows.

### 3.8 Settings

- Profile and targets (3.1), including overrides and "reset to calculated".
- Units: metric / imperial.
- Meal slots: count, names, order.
- Export all data as JSON. Import JSON (replaces all data, after a confirm sheet).
- Reset everything (after a confirm sheet).

---

## 4. Storage

### 4.1 Adapter interface

All persistence goes through one interface in `js/store.js`, so storage can be swapped in one place:

```js
await store.load(docId)        // → object or {}
await store.save(docId, data)  // full-document write
await store.remove(docId)      // delete a document
await store.list(prefix)       // → docIds starting with prefix
```

- **This app:** wraps `shared/persist.js`, with localStorage fallback if the import fails. Shows a small sync status icon in the header with three states: synced, saving, and offline (saved on this device). It mirrors `persist.js`'s `onStatus` (`'synced' | 'saved-locally' | 'offline'`). The localStorage fallback after a failed import counts as offline. How it looks: DESIGN §11.
- Calls `gate('#app')` before first render.
- **Public port (not built here):** a public version would be a copy of this app in its own repo, using localStorage only, since it has no Firestore. `store.js` keeps `createLocalStore`, a tested localStorage-only adapter, for that port. This app doesn't use it. The port would switch `app.js` to it and drop `persist.js`, the gate and the sync icon.

> **Dependency:** `persist.js` only exposes `get`/`set` per key, so the personal adapter keeps an index of docs in the core doc and blanks a doc instead of deleting it (step 2.2). The app has a fixed set of docs (§4.2) and never needs `remove` or `list` in normal use. They stay on the interface for the public port and for reset.

### 4.2 Document layout

Three fixed docs. Each one is saved whole, so days and weigh-ins are kept out of the core doc, and a change to a day never rewrites foods and meals.

| docId | Contents |
|---|---|
| `macro-planner` | profile (without weight), targets, overrides, settings, slots, template, custom foods, meals, `startedOn` (first-run date) |
| `macro-planner-days` | days by date: `{ "2026-10-15": { changes: {}, entries: [], offPlan: false, locked: false } }` (§3.5) |
| `macro-planner-weight` | weigh-ins, oldest first: `{ weighIns: [{ date, kg }] }` |

All three stay far below Firestore's 1 MB cap: about 5 KB of days, and about 10 KB of weigh-ins a year.

### 4.3 Rolling window

- Every save of `macro-planner-days` drops dates before 7 days ago, so it holds today, the 7 days before it (Stats' window), and any future days with changes or off plan set. There's no setting and no separate purge.
- "Today" is the device's local date. A device that's been closed for a while drops its stale days on its next save.
- Weigh-ins are never dropped automatically.

---

## 5. UI

All visual rules (colour, type, spacing, components, motion, accessibility) are in `DESIGN.md`, and every value is in `tokens.css`. This section only covers behaviour.

- **Mobile-first, single column.** Bottom tab bar: Today · Plan · Meals · Stats. The Meals tab has two segments at the top, Meals (saved meals, §3.3) and Foods (the foods list, §3.2), and opens on Meals. Settings from a header icon, opening as a pushed screen with a back button (DESIGN §11).
- Large tap targets. A day that goes to plan needs no taps; a swap, skip or portion is two (open the slot, choose).
- No onboarding wizard. First launch opens Settings → Profile with every field empty: number fields show a placeholder naming the field ("Age", "Height", "Weight"), and choices start with nothing selected.
- Light and dark themes via `prefers-color-scheme`, handled in `tokens.css`.
- Calm, legible, numeric. Colour appears only in macro data (rings, macro dots, charts); the rest of the UI is monochrome (DESIGN §1).
- **No browser dialogs.** Confirmations use the shared confirm sheet. Text and number entry use inputs in the view or in a bottom sheet. Never `confirm()`, `prompt()` or `alert()`.

### 5.1 Icons and emoji

- **UI icons** are [Lucide](https://lucide.dev) (ISC/MIT), copied as inline SVG into `js/icons.js` (only the icons used), styled per DESIGN §12. Lucide's license is committed beside them as `js/LICENSE-lucide.txt`.
- **Emoji only identify foods and meals** (DESIGN §12). Data stores the character, never an image path.
- **Rendering:** emoji render as native OS emoji, as text in the emoji tile. Bundled Fluent Emoji SVGs are postponed to v2 (§8). Because data stores only the character, switching later needs no data change.
- **Emoji picker:** a bottom sheet (DESIGN §10) with a small curated grid of ~40 food emoji from `data/emoji-picker.json`, stored as `[{ "char": "🍚", "name": "cooked rice" }]`. The grid includes every category default and 🍽️. Each tile's `aria-label` is its `name` (the emoji's CLDR short name).

---

### 5.2 Numbers and rounding

Storage and math keep raw values. Only what's shown is rounded, to what's useful:

- **kcal and grams:** whole numbers (DESIGN §3). On a ring, "left" is the shown target minus the shown total, so the three numbers on screen always agree.
- **Bodyweight:** one decimal, in kg or lb. It's stored unrounded, so 180 lb entered shows 180.0 lb again, never 179.9.
- **Height:** whole cm, or feet and whole inches.
- **Goal rate:** shown as its option (0.5 / 1 / 1.5 lb per week), never as a converted value like 0.454 kg.
- **Food quantities:** as entered (1.5 eggs, 150 g).

---

## 6. Build phases

0. **Setup** — scaffold, app shell and shared base components, styled per `DESIGN.md` from the start.
1. **Core math** — `calc.js` (BMR, TDEE, targets, meal totals, averages) with tests.
2. **Storage** — adapter interface, both implementations, doc shapes, the rolling days doc and the weight log, with tests.
3. **Foods** — starter `foods.json`, search, emoji picker, custom food CRUD, archive behaviour.
4. **Meals** — meal CRUD and totals.
5. **Profile, Plan + Today** — profile and targets, slots, template, per-day changes, lock-in, flex slot, adding entries, off plan, rings.
6. **Stats + Settings** — weigh-ins, last 7 days' averages, weight trend, export/import.
7. **Polish and publish** — mobile pass, design audit, dashboard check.
8. **After a week of use** — grow the food list from what you actually missed.

---

## 7. Out of scope (v1)

- Micronutrients, fibre, sugar, sodium
- Barcode scanning
- Recipes with instructions or cooked-yield math
- Water, steps, exercise logging
- Social features, sharing, accounts
- Meal history, and stats beyond the last 7 days
- Weigh-in reminders, body-fat or measurement tracking
- Automatically adjusting targets from the actual weight rate
- Days-on-target counts. DESIGN §7 says how they'd look, but v1 doesn't include them.
- Daily calorie bars and stacked macro bars. DESIGN §7 says how they'd look, but v1 doesn't include them.

---

## 8. v2 candidates

- **Targets from the actual rate** — the strongest candidate. Once the weight trend has been lived with, suggest adjusted targets when the actual rate differs from the goal.
- **Edit an entry** — change a quantity or numbers in place, instead of remove and re-add. Entries are snapshots, so this touches nothing else.
- **Fluent Emoji** — render food and meal emoji as bundled Microsoft Fluent Emoji Flat SVGs (MIT) for the same look on every OS. A build script copies only the SVGs in use; the native character stays as the fallback. Data already stores the character, so nothing migrates.
- **Packaged foods via USDA FoodData Central API.** Runtime search → "save to My Foods", so the bundle stays small and everything lands in the existing custom-food model. Data is CC0. Needs an API key with a default rate limit of roughly 1,000 requests/hour; a public port would need a small proxy to keep the key private, or omit the feature. (Not bundled: the Branded dataset is well over a million records.)
- **Weekday templates** — a different default plan per weekday (e.g. training vs rest days).
- **Training-day / rest-day targets** — different calorie and carb targets by day type.
- **Micronutrient tracking** (would require a richer food model).
- **iOS app** — a public port would serve as its beta reference.
- **Per-date weight keys** would remove whole-log overwrites entirely; revisit if weight is logged from several devices.

---

## 9. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Framework | Vanilla JS | Small data model, no build step, matches other tools, `persist.js` drops in |
| Builds | One: this personal app, synced through `persist.js` | A public, local-only version is a later port to its own repo; `createLocalStore` is kept for it |
| Food data | Bundled curated USDA JSON | Offline, no key, no backend, public domain |
| Serving model | One serving per food | Avoids unit conversion complexity |
| Repeat | Single daily template + per-day changes | Weekday templates deferred to v2 |
| Flex slot | Auto "remaining", optional pinned budget of four numbers | Most useful default with zero setup; four numbers so a budget counts in the rings and lock-in like a meal |
| Logging model | Plan by exception: planned meals count, you record changes | You eat the plan most days; marking every meal eaten is busywork |
| Day integrity | Snapshot entries when added, and lock-in of past days | Edits to meals or the template never change a past day |
| Goal rate | Stored in kg/week, one constant (7700 kcal/kg) | Store metric; imperial options convert from lb rather than using a separate 3500 kcal/lb |
| Stats range | The 7 days before today, rolling | Always a full week of finished days; today is still in progress and has its own rings. What you ate weeks ago doesn't change what to eat today |
| Stats wording | "Daily average · last 7 days", or "· 5 of the last 7 days" when some don't count | Nothing is logged, so "days logged" is wrong; the count only appears when it's informative, and never as missed |
| Weight | Weight log, latest weigh-in is the profile weight | A trend is the one thing that needs history: it shows whether the chosen rate is actually happening. Tiny data, sporadic entries are fine |
| Day storage | One rolling `macro-planner-days` doc, pruned to the last 7 days on save | Nothing reads older days, so no month docs, retention setting or purge |
| Repeating a day | "Recent" entries, not copy yesterday | What repeats is single items (leftovers, a usual order), not whole days; copying a day would overwrite today and needs a confirm sheet |
| No-plan days | Off plan: every slot becomes flex, stored per day | Reuses the flex slot; vacations need no new logging model |
| Visual design | `DESIGN.md` + `tokens.css`, applied from step 0.1 | No restyle pass at the end |
| UI icons | Lucide, inlined SVG | Matches DESIGN §12's stroke style; no icon font or CDN |
| Food emoji | Character in data, rendered natively; small curated picker | Fluent SVGs were polish, not part of the loop; postponed to v2 with no data change needed |
| Food list size | ~50 to start, grown from real use | You'll find out which foods are missing faster by using it than by guessing 300–500 up front |
| Foods placement | A Foods segment inside the Meals tab, not a tab of its own | Foods matter mostly as meal ingredients, so they sit beside meals and the bar keeps four tabs. Food search also appears where it's used: the meal editor and the add sheet |
| Meal categories | Your own tags on meals, a single-select pill filter | A long meal list needs a way in. Tags come from the meals themselves, so there's no tag list to manage, and one pill at a time keeps the filter predictable |
| Dialogs | Shared bottom sheets, never `confirm()` / `prompt()` / `alert()` | Native dialogs can't be styled and have no iOS equivalent |
| First-run profile | Empty: placeholder hints, nothing selected, no targets until complete | Pre-filled values would just be overwritten, and a skipped form would give confident targets for someone else |
