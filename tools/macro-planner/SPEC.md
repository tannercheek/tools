# Macro Planner — SPEC (v1)

A deliberately small calorie and macro tracker that doubles as a meal planner. Built for lifters who eat routine meals: set up a day of meals once, note only what changes, and see on four rings where the day will land.

**Working title:** Macro Planner · **Slug:** `macro-planner` · **Status:** v1 spec

---

## 1. Principles

1. **Routine over flexibility.** The common case is eating the same few meals. On a normal day, that takes no taps at all.
2. **The plan is what you eat.** Planned meals count without being marked. You only record what changes: a swap, a skip, a portion, an ingredient, and what goes in flex slots. The plan answers "what should I aim for at dinner?", and nothing nags, warns or marks a day incomplete. An open flex slot is just open.
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

**Inputs:** sex, birthday, height, weight, activity level, goal, goal rate, unit system.

**Calculation:**

| Step | Formula |
|---|---|
| BMR (Mifflin-St Jeor) | `10 × kg + 6.25 × cm − 5 × age + 5` (male) / `− 161` (female) |
| TDEE | BMR × activity multiplier |
| Calorie target | TDEE + goal adjustment |

Activity multipliers: sedentary 1.2 · light 1.375 · moderate 1.55 · very active 1.725 · extreme 1.9

Goal adjustment: rate in kg per week × 7700 kcal/kg ÷ 7. Rate options: 0.25, 0.5, 0.75 kg/week (0.5, 1, 1.5 lb/week). The rate is stored in kg; an imperial option is converted from lb, so 1 lb/week gives ≈ 499 kcal/day, not 500. Negative for lose, positive for gain, zero for maintain.

**Macro split:** by bodyweight (the default) or by percent, chosen in Settings.
- **By bodyweight:**
  - Protein: 1.8 g/kg bodyweight (≈ 0.8 g/lb)
  - Fat: 25% of calories (9 kcal/g)
  - Carbs: remaining calories (4 kcal/g)
- **By percent:** whole-number percents of the calorie target for protein, fat and carbs, adding up to 100. Each macro's grams are its share of the calories at 4, 9 and 4 kcal/g: 30% protein of 2,600 kcal is 195 g.
  - Switching to percent starts from the percents saved last time, else the current targets as percents (rounded, carbs taking up the rounding, so the targets barely move), else 30 / 25 / 45 with no targets yet.
  - While the three don't add up to 100, the targets keep the last split that did.
  - The percents are kept when switching back to bodyweight, for next time.
- Stored in the core doc as `macroSplit: { by: "bodyweight" | "percent", percent: { protein, fat, carbs } }`. A doc without it is by bodyweight, so existing data needs no migration.

**Rules:**
- Every target (calories, protein, fat, carbs) can be manually overridden. An override sticks until reset. By percent, an override replaces that one target and the others keep their percents; nothing is rebalanced. Overriding calories moves every macro worked out from it: fat and carbs by bodyweight, all three by percent.
- Warn, but don't block, if the calorie target falls below BMR.
- By bodyweight, if carbs would go negative, clamp to 0 and warn. By percent they can't.
- Imperial/metric toggle. Store everything in metric internally; convert for display only.
- **Age comes from the birthday:** the age in whole years on today's date, so it goes up on the birthday with nothing to update. Stored in the profile as `birthDate` ("1990-04-12"). A 29 February birthday counts from 1 March in years without one. A profile saved before birthdays, with an `age` and no `birthDate`, keeps that age until a birthday is entered; nothing guesses a birthday from it.
- **Weight comes from the weight log.** The profile's weight is the latest weigh-in. Adding one recalculates the targets straight away. Until the first weigh-in, there's no weight.
- **Targets need a complete profile:** sex, birthday (or an age saved before birthdays), height, weight, activity level and goal, plus a rate unless the goal is maintain. Until then there are no targets, calculated or overridden. The rings show the no-targets state (DESIGN §13), open flex slots show no remaining (§3.4), and Plan totals show the template's totals only.
- Switching units snaps the goal rate to the matching option in the new system (0.5 lb ↔ 0.25 kg, 1 lb ↔ 0.5 kg, 1.5 lb ↔ 0.75 kg per week), so the calorie target can move by 25–77 kcal/day.

**Weight log:** for weighing in whenever you happen to, not on a schedule.

```js
// weigh-in
{ date: "2026-10-15", kg: 82.4 }
```

- Add a weigh-in from Stats or Today's Weigh in (§3.6), or by entering a weight in the profile form, which logs one for today. The date defaults to today and can be set to an earlier day.
- One weigh-in per date. Adding another for the same date replaces it.
- Delete a weigh-in (confirm sheet). The profile weight falls back to the latest one left.
- Gaps are normal. Nothing reminds you to weigh in or marks a gap as missed.
- Weigh-ins are kept indefinitely. A year of them is about 10 KB.
- **Actual rate:** the least-squares slope through the weigh-ins from the last 28 days, in kg/week (shown as lb/week in imperial). It needs at least two weigh-ins at least 7 days apart. With fewer, no rate is shown. A slope uses every weigh-in, so one heavy morning moves it less than it would move a first-to-last difference.

### 3.2 Foods

**Bundled database:** `data/foods.json`, generic whole foods curated from USDA FoodData Central (Foundation + SR Legacy, public domain). Loaded once and searched in memory. It started at ~50 foods for v1's build phases, then grew to ~320 in step 13.1, leaning gluten-free and vegetarian/vegan per the priorities below. Growth stopped near there because the Foods list and the food picker render every food when the search is empty, and much past 320 slows that down on a phone (PLAN §13.1).

**Coverage priorities:** eggs (S/M/L as separate entries), meats and fish (raw and cooked), rice/oats/pasta/potatoes (dry and cooked) including gluten-free alternatives, bread, dairy and plant milks, tofu and other meatless proteins, legumes, nuts and seeds, common fruit and vegetables, oils, nut butters, protein powder (generic whey and soy).

**Food record:**

```js
{
  id: "usda-168878",         // "usda-<fdcId>", plus "-<variant>" if needed (below); or "custom-<uuid>"
  name: "Rice, white, cooked",
  serving: { qty: 100, unit: "g" },   // or { qty: 1, unit: "egg" }; the unit amounts are counted in
  emoji: "🍚",
  kcal: 130, protein: 2.7, fat: 0.3, carbs: 28.2,   // for the serving
  grams: 100,                         // the serving's weight; bundled foods, and custom foods given one
  portions: [{ unit: "cup", grams: 158 }],   // other units, 1 of each; bundled foods, and custom foods given some
  category: "Grains & pasta",         // a supermarket section (below); bundled foods, and custom foods given one
  custom: false,
  archived: false
}
```

- Each food has **one serving**: the unit its amounts are counted in, and what its numbers are for. It never changes once set, like the id, so meals, ingredients and entries keep their meaning.
- **Portions:** a bundled food also records its serving's weight in grams and a few household portions from USDA ("cup", "medium", "tbsp"), each with its weight.
  - An amount can be entered in the serving's unit, in grams, or in any portion. It's converted through grams, so 1 cup of cooked rice counts as 158 g.
  - The first portion is the food's default: search results and the Foods list show the food at 1 of it, with its numbers, and the amount field starts there. A food with no portions shows and starts at one serving.
  - Portions are picked per food in `scripts/food-list.json`, only where a household measure is how you'd measure it. Each one's weight comes from USDA, except oz: an ounce is exactly 28.349523125 g on any food, so it needs no USDA portion. Meat and fish get oz, since you can guess a 12 oz steak or a 4 oz patty but not its grams, and so do other foods sold by weight (cheese, tofu, dry pasta, nuts).
- Egg sizes, raw vs cooked, and so on are still separate entries, since their numbers differ.
- **Bundled ids:** `usda-<fdcId>`. When one USDA food gives several entries, each gets a variant suffix: egg sizes are one USDA food with three portions, so they're `usda-171287-small`, `-medium` and `-large`. Ids never change once set, because meals refer to foods by id.
- Name labels must be unambiguous about state: "Rice, white, cooked" vs "Rice, white, dry".
- **Emoji:** every food has an `emoji` field holding a single Unicode emoji character (never an image path). Bundled foods get an exact emoji where one exists (🥚, 🍌, 🍚), otherwise an emoji group's default: meat 🥩, poultry 🍗, fish 🐟, grains 🌾, legumes 🫘, dairy 🥛, vegetables 🥦, fruit 🍎, nuts/seeds 🥜, oils/fats 🫒, supplements 🥤. See §5.1 for how emoji render.
- **Category:** every bundled food has a `category`, a supermarket section in the order you'd walk a store: Produce, Meat & fish, Dairy & eggs, Tofu & plant protein, Bakery, Grains & pasta, Beans & legumes, Nuts & seeds, Oils & condiments, Snacks & sweets, Supplements (`js/categories.js`'s `CATEGORIES`). It's separate from the emoji group above: an exact-emoji food still has a category, and the two don't always match. A custom food can have one; without it, it shows under All only. The food picker and the Foods list filter by category with a pill row above their lists, like the meal picker's tag filter (§3.3).

**Custom foods:** emoji, name, serving qty, serving unit, kcal, protein, fat, carbs, then optionally the serving's weight in grams, other units, and a category. Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).

- **Units:** a custom food is counted in its serving's unit. Given the serving's weight (known already for a serving in g), it can also be counted in grams and in any other units you add, each as its weight ("1 cup = 158 g"), converted through grams like a bundled food's portions. The first added unit is its default, as for a bundled food. Without a weight, it has one unit, its serving's. The weight and units are yours to enter, not USDA's.
- A unit that a saved meal or a planned food (§3.4) is counted in can't be removed, since their amounts are in it.

- Edit and delete custom foods. Bundled foods are read-only (but can be duplicated into a custom food to adjust). A duplicate keeps the serving, numbers, weight, portions and category.
- Deleting a food that's used in a meal or planned in a slot (§3.4) **archives** it: hidden from search, still resolvable inside existing meals and the template.
- Search matches across bundled and custom foods. Custom foods rank first.
- **Foods list:** the Foods segment of the Meals tab (§5). It lists every food that isn't archived, with search, an "Add custom food" button, and a "Custom foods only" switch that hides bundled foods. The switch isn't saved, so it starts off each visit. Custom foods are edited and deleted from here, and bundled foods are duplicated from here.

### 3.3 Meals

A meal is a named list of foods with quantities.

```js
{ id, name: "Rice & beef", emoji: "🍚", tags: ["Dinner", "Mexican"], items: [{ foodId, qty, unit }] }
// unit: the unit qty is in (§3.2); absent means the food's serving unit, as in meals saved before portions
```

- Totals are computed from items, never stored.
- Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).
- Create, edit, duplicate, delete.
- Adding a food to a meal: search → pick → amount in any unit the food has. A food that's already in the meal gets the amount added to it, converted into the unit it's in.
- **Swapping a food in a meal:** in the meal editor, a food's swap button picks another food, which takes its place, starting at the old amount when it has the same unit. A food that's already in the meal gets the amount added to it, as when adding. The same sheet has Remove from meal.
- **Tags:** your own categories ("Breakfast", "Smoothies", "Mexican"), added and removed in the meal editor. `tags` is optional; a meal without it has no tags, so existing meals need no migration.
  - A tag is short text, trimmed. Matching ignores case: typing "mexican" reuses an existing "Mexican", and the first spelling is kept. A meal has each tag once.
  - The tag list is every tag your meals use, A–Z. There's no tag management: a tag no meal uses is gone, and renaming one means editing the meals that use it.
  - A duplicated meal keeps its tags.
- **Filter:** above the Meals list, a single row of pills: "All", then each tag. One is selected at a time, and the list shows the meals with that tag. The row is hidden while no meal has a tag. Like the "Custom foods only" switch, the filter isn't saved and starts on All each visit; if the selected tag stops existing, it goes back to All. Every place you pick a saved meal (a Plan slot, a swap, the add sheet; §3.4, §3.5) shows the same row above its list.

### 3.4 Daily plan

- **Slots:** 3–6, user-named (e.g. Breakfast, Lunch, Pre-workout, Dinner). Set in Settings.
- **Template:** each slot is a container. The same template applies every day.
  - **Planned items:** what you plan to eat in the slot every day: meals and foods, any number of either, in any mix. A banana as a snack, a meal for lunch, or a meal with a banana. A food has an amount in any of its units, like a meal's items. Either can be planned at a portion (0.5×, 1×, 1.5× or custom; none is 1×), eaten every day: "1.5× Oats & whey", or 2 bananas at 1.5×.
  - A slot with planned items is **planned**. One with none is **flex**, optionally with a pinned budget.
  - Items keep the order they were added in. Adding a food already planned in the slot adds to its amount, as in a meal, and keeps its portion. A meal is planned in a slot once, so adding it again keeps its portion too.
  - A planned meal that's since been deleted is left out of the slot. Deleting a food planned in a slot archives it (§3.2).
  - Stored on the template slot as `items: [{ id, mealId, portion } | { id, foodId, qty, unit, portion }]`, each item with its own id and `portion` only when it isn't 1×, and `budget` (below).
- **Swap:** on Today, any planned item can be swapped **for that day only**, for a saved meal, a food or quick numbers (§3.5). For a meal or a food, a "make this the default" option puts it in that item's place in the template, at 1×. Quick numbers can't be the default, since the template plans meals and foods. A food already planned elsewhere in the slot gets the amount added to it there instead, and a meal already planned elsewhere in the slot stays once, so in either case the swapped item just leaves the template.
- **Flex slot:** a slot with no planned items. While it's **open**, with nothing added yet, it displays the **remaining** calories and macros for the day: the targets minus the rest of the day (§3.5), meaning the planned items after the day's changes, the pinned budgets of other open flex slots, and everything added to other slots. This is the gap to fill. Optionally the user can pin a budget instead: four numbers (kcal, protein, fat, carbs), entered like quick numbers. It's stored on the template slot as `budget: { kcal, protein, fat, carbs }`. A flex slot is filled by adding a meal, foods, quick numbers or a Recent entry to it. **Once filled, it's done:** it shows the total of what's in it, like a planned slot, instead of the gap, and its pinned budget no longer counts. Removing everything from it makes it open again.
- **More than one flex slot:** what's left is never split between them. Each open flex slot shows the full remaining, because you might fill it all with the first one or skip one. Once one is filled, the others show what's still left.
- **Open flex slots are normal.** A flex slot with nothing in it is just open, today or on a past day. It isn't shown as missed or incomplete. With no targets yet (§3.1), it shows as open, with no remaining. An open flex slot counts as nothing in the day's total, unless it has a pinned budget, which counts like a planned item.
- **Off plan:** for vacations and days when the plan doesn't apply. "Off plan until [date]" (default: today only) turns every slot into a flex slot for those days. Each one shows what's left for the day, and you add meals, foods, quick numbers or Recent entries to it as usual. Planned items, pinned budgets and changes are ignored on those days, and the template is unchanged. "Back on plan" clears it from today on. It's stored per day (`offPlan: true`), so past off-plan days stay off plan. Range: today up to 30 days ahead.
- **Plan view:** the plan totals, then the slots in order, each a card under the slot's name ("Dinner · Flex" for a flex slot), as on Today (§3.6). The card shows what the slot plans: one item as itself, more than one as "N items", each listed under it.
- **Plan slot sheet:** tapping a slot lists its planned items, each with its amount and remove, then the same Meal · Food picker as Today's add sheet (§3.5), without Recent and Quick, since the template plans meals and foods, not snapshots or numbers. Picking a meal or a food adds it to the slot. Each add and remove saves straight away and the sheet stays open. A flex slot also has its pinned budget.
- **Plan totals:** the Plan view shows what the template adds up to (its planned items at their portions, plus any pinned flex budgets) against the targets, and one "left for flex" figure that isn't split between flex slots. A plan over target shows as over, never as a negative number. With no targets yet (§3.1), it shows the template's totals only, with no "left for flex". A day's changes never move it: Plan shows the template, Today shows the day.

### 3.5 Changes and the day's total

The plan counts as eaten. A day is the template plus what you change and add. Each slot holds two kinds of thing, kept apart in the data: its **planned items**, from the template, and what you **add** on the day. On screen they're one list, planned items first.

**Changing the plan for the day:**

- **Swap** a planned item for a saved meal, a food or quick numbers (§3.4). A food is searched and given an amount, and quick numbers are entered, as in the add sheet. What's picked takes the item's place in the slot, so it counts and the item doesn't. A food starts at the old amount when it's counted in the same unit.
- **Portion:** 0.5×, 1×, 1.5× or custom, on a meal or a food in a slot, planned or added. On a planned item it replaces the template's portion rather than multiplying it: 1× on a meal planned at 1.5× eats it at 1×.
- **Ingredients:** open a meal in a slot, planned or added, and change it for that day only: an amount (3 eggs, not 2), a food swapped for another (a different bread), a food removed, or one added.
  - The saved meal and the template don't change, so the next day starts from the saved meal again.
  - The list shows what you eat at the meal's portion: 2 eggs at 1.5× shows as 3. Editing keeps those amounts and sets the portion back to 1×.
  - "Reset to original meal" goes back to the meal as planned or as added, at 1×. As planned also undoes it on a planned meal, along with the slot's other changes. Swapping the meal drops it.
  - A meal keeps at least one ingredient. Remove the meal to eat none of it.
  - Meals added before ingredients were kept have none, so they can't be opened.
- **Remove for today:** a planned item can be removed for the day, with no confirm sheet, since As planned undoes it. Removing a slot's last planned item skips the slot.
- **Skip** a planned slot: it counts as nothing that day, every planned item in it. What's been added still counts.
- **As planned** undoes a slot's skip and every change to its planned items, so the template's items are back. What's been added stays.
- **The day's version:** the first change to any of a slot's planned items gives the day its own version of the slot's planned items, each a snapshot at its template portion, so editing or deleting a food or meal later never changes it, and a later change to the template doesn't reach a day that has its own version. Until then, the slot shows the template as it is.

**Adding to the day:**

- **Add a meal or food:** pick a saved meal, or search a food and enter an amount in any of its units, then choose a slot. In a flex slot it fills the slot. In a planned slot it's added after the planned items.
- **Other:** something eaten outside the slots, like an unplanned snack, is added to Other instead of a slot. It counts in the day's total and in what open flex slots show as left, like anything added, and it's never part of the plan.
- **Add quick numbers:** kcal + macros directly, with an optional label. For restaurants and guesses. Uses 🍽️.
- **Swap an added entry:** on Today, anything added to a slot or to Other can be swapped for a saved meal, a food or quick numbers. The new entry takes its place, in its slot, as a new snapshot, so Recent lists it like anything added. A locked day isn't swapped: remove the entry and add what you ate.
- **Recent:** the add sheet lists what you added or swapped in over the last 7 days, newest first, merged when label and numbers match. The planned items and budgets that lock-in writes aren't listed: they're the plan, not something you chose. One tap adds one again to the chosen slot. It covers leftovers, a repeated restaurant order and the same stand-in breakfast two days running. It reads the snapshot fields, so it works even if the food or meal has since been edited or deleted.
- **Remove** any added entry, after a confirm sheet: on Today from the slot's sheet (§3.6), on a locked day from its list. Unlike a planned item, nothing brings it back.

**The day's total** is the planned items (after the day's changes and skips), the pinned budgets of open flex slots, and every added entry. On an off-plan day it's the added entries only.

```js
// day in macro-planner-days
{
  changes: { "<slotId>": { skipped: true } | { items: [dayItem] } }, // only slots that differ from the template
                   // items: the day's version of the slot's planned items; an empty list isn't kept, it's a skip
  entries: [],     // added foods, meals, quick numbers and Recent entries; after lock-in, the whole day
  offPlan: false,
  locked: false,
  kcalTarget: 2500 // set by lock-in: the day's calorie target, when there were targets (§3.7)
}

// dayItem: a planned item as the day eats it, a snapshot shaped like an entry, without slotId and slotName
{ id, label, emoji, kcal, protein, fat, carbs, source: "meal" | "food" | "quick", swapped: true }
// id: the template item's id; something swapped in keeps the id of the item it replaced
// swapped: on something swapped in for the planned item, absent while it's the item as planned
// meal: mealId, portion, ingredients, and originalIngredients once they've been changed, for reset
// food: foodId, qty, unit, portion

// entry
{ id, slotId, slotName: "Lunch", label: "Rice & beef", emoji: "🍚", kcal, protein, fat, carbs, source: "meal" | "food" | "quick", planned: true }
// slotId: null for Other, with slotName "Other"
// planned: only on the entries lock-in writes from the plan; absent on anything added or swapped in
// on a meal: portion, ingredients, and originalIngredients once they've been changed, for reset;
// its numbers are its ingredients' total at its portion
// on a food: portion; its numbers are its amount's, times the portion

// ingredient: one food in a day's version of a meal, a snapshot; its numbers are for qty, in unit,
// the unit the amount was entered in (§3.2), so a new amount rescales them without looking the food up
{ foodId, name: "Bread, sourdough", emoji: "🍞", unit: "slice", qty: 2, kcal, protein, fat, carbs }
```

**Data saved before slots held items** reads as it did, with nothing converted in bulk:

- A template slot's `mealId` and `foods` read as its items, the meal first, and are written as `items` the next time the template is saved. A slot with `items` ignores them.
- A day's change in the old shape (`mealId`, `portion`, `ingredients`, `entry`, `foods`) reads as the day's version it describes, and is written in the new shape the next time that day is saved.
- Locked days are lists of entries, so they're unaffected.
- A copy of the app opened before the update reads the new shape as flex slots until it's reloaded, so reload any open copies after updating. There's no offline cache, so a reload always gets the new version.

**Lock-in:** once a day has passed, its plan is written into `entries` as snapshot entries and `locked` is set:

- Each slot's planned items (after the day's changes and skips) become entries in order, each under its own name and emoji: a meal as a `meal` entry at its portion, with its ingredients, and a food as a `food` entry. Each open flex slot with a pinned budget becomes a `quick` entry labelled with the slot's name. All of these are marked `planned: true`, so Recent can leave them out, a portion or ingredient change included. Something swapped in is written as it is, in its item's place and without `planned`: it's something you chose rather than the plan, so Recent lists it like anything added. `changes` is then ignored.
- It also stores the day's calorie target as `kcalTarget`, for days on target (§3.7).
- It runs on app load and when the date changes while the app is open, for every past day in the window that isn't locked, from the core doc's `startedOn` date on. Days you never opened count as on plan. Days before you started using the app don't count.
- Any edit to a meal or the template happens in a session that has already locked every past day, so it can only affect today and later.
- A locked day is a list of entries. Correct it by removing an entry and adding what you actually ate.

**Snapshot rule:** each entry stores its own name, emoji and numbers when it's added or locked in. Editing or deleting a food or meal later **never** changes a past day.

The same goes for slots: an entry also stores its slot's name (`slotName`) when it's added or locked in. A locked day lists and labels its entries by that saved name, so renaming, reordering or removing a slot later never changes a past day. On any day, an entry whose slot no longer exists stays and still counts in that day's total. A locked day lists it under its saved slot name. A day that isn't locked shows it in Other (§3.6), since it has no slot to show under.

### 3.6 Today view (home)

- Four rings: calories, protein, fat, carbs. Each shows the day's total / target and what's left. The rings show where the day will land, not progress through it. With no targets yet (§3.1), they show the no-targets state (DESIGN §13).
- **Streak:** under the rings, the current streak (§3.7) from yesterday back, shown only today, since it isn't part of other days, and only once it's 2 or more. Tapping it opens Stats.
- **Quick actions:** a row of four buttons between the rings and the slots, each opening a sheet found elsewhere too.
  - **Add food** and **Quick numbers** ask which slot, or Other, as a locked day's Add does, then open the add sheet (§3.5) on Food or Quick. Recent and Meal stay one tap away in it. They work on today, later days and a locked past day.
  - **Weigh in** logs a weigh-in, as on Stats. The targets move with it (§3.1), and the rings straight away.
  - **Off plan** opens "Off plan until [date]" (§3.4) on a day it can start: today up to 30 days ahead, and not already off plan.
  - A button that doesn't apply to the day shown is disabled, not hidden.
- Slots listed in order, each a card under the slot's name, with any change after it ("Breakfast · 1.5×", "Lunch · Skipped", "Dinner · Flex"), as on a locked day. Each shows what it holds and the whole slot's total: one thing as itself, more than one as "N items", each listed under it, planned items first, then what's been added.
  - A slot's name carries its own changes (flex, skipped), and, while it plans one item, that item's (swapped, edited, a portion). With several, each item's line shows its own.
  - A skipped slot's planned items add nothing, so they aren't among its items: the slot shows what's been added to it, still marked skipped, or, with nothing added, what it plans, muted.
  - A flex slot shows the remaining while it's open, and what's in it once filled.
  - A meal with an ingredient change (§3.5), planned or added, lists its ingredients with their amounts, so the change shows without opening the slot: under the slot when it's all the slot holds, or indented under its own line when it's one of the items.
- **Tapping a planned slot** opens its actions:
  - While it plans one item, that item's actions come first: Swap, Skip and Edit (a meal's ingredients) in one row, then Portion for a meal or a food. Edit is disabled for a food or quick numbers, and Portion doesn't show for quick numbers.
  - With several planned items, Skip comes first, then a row per planned item, each opening its own actions: Swap, Portion for a meal or a food, Edit for a meal, and Remove for today.
  - Then the items added to it under "Added to this slot", each opening Swap and Remove, and Portion for a meal or a food, and Edit for a meal (§3.5); then Add to this slot, and As planned once the slot has a change.
- An open flex slot's Log opens the add sheet. Tapping a filled flex slot lists what's in it, each opening its actions as an added item's, plus Add to this slot.
- **Other:** after the slots, a card for what was eaten outside them (§3.5), shown only once something's in it. It shows like a filled flex slot, under "Other". Tapping it lists what's in it, each opening its actions as an added item's, plus Add to Other. An entry whose slot has since been removed shows here too.
- On a locked past day, the slots list that day's entries instead, grouped by slot: one card per slot under the slot's saved name, each entry a line in it with remove, plus Add. Other's entries come last, under "Other".
- Date switcher: previous/next day, back to today. It goes back to 7 days ago (the oldest kept day, §4.3) and forward without a limit, for planning swaps or off-plan days ahead.
- On an off-plan day, a short "Off plan" line sits above the slots, with "Back on plan".

### 3.7 Stats

**Last 7 days:** the 7 days before today, all locked in. Today is still in progress, so it stays on Today. No range toggle, nothing further back.

- The same four rings showing **daily averages** against target, over the days in the last 7 that have entries. Open flex slots count as nothing, so the averages are low by whatever went unrecorded. The weight trend is the real check.
- A day with no entries isn't counted, rather than counted as zero. That covers an off-plan day with nothing added, a day before you started, or a day with every slot skipped or open.
- Heading: "Daily average · last 7 days". If fewer than 7 days count, it reads "Daily average · 5 of the last 7 days". Never "logged" or "missed": you don't log days, and an uncounted day isn't a failure.
- With fewer than 2 counted days, show the empty state (DESIGN §13).

**Days on target:** how many of the last 7 days landed on the calorie target, a marker for each, and a streak. How it looks: DESIGN §7.

- A day is **on target** when its calories are within ±10% of its calorie target: 2,250 to 2,750 kcal against 2,500. Both are compared as shown, in whole kcal. A day with no entries isn't counted, as in the averages: it isn't on target or a miss.
- **The day's target:** lock-in stores it on the day as `kcalTarget` (§3.5), worked out for that date from the latest weigh-in up to it, so a later weigh-in or profile change doesn't change whether a past day was on target. A day locked before days kept their target, or locked while there were no targets, uses the current target. With no targets, nothing counts: there are no markers and no streak.
- **Streak:** the days on target in a row up to yesterday. A miss starts it again from 0; a day with no entries neither breaks it nor adds to it. Today is still in progress, so it isn't part of it.
  - The days doc only keeps 7 days (§4.3), so the core doc keeps `streak: { count, through }`, the run up to `through`, a day that's since been pruned. Before a save prunes days, they're taken into it.
  - The streak shown is that run carried on through the kept days, worked out each time, so removing or adding an entry on a locked day moves it.
  - A gap with no days, from not opening the app for more than a week, starts it again from 0.
  - Export and import carry it with the core doc.

**Weight trend:**

- A line through the weigh-ins from the last 12 weeks, plotted by date, with the latest value labelled. A dashed line shows the goal rate starting from the first weigh-in in the window, so you can see whether you're on pace.
- Below the chart: the latest weight and its date, and the actual rate against the goal rate, e.g. "−0.3 kg/week · goal −0.5". This is information, not a verdict. Nothing is marked as missed or failed.
- "Log weigh-in" opens a sheet (weight, date). The weigh-ins from the last 12 weeks, the chart's window, are listed below, newest first, each with delete. The latest is listed even when it's older, since it's still the profile's weight.
- With fewer than 2 weigh-ins in the window, the chart, rate and button are replaced by the empty state (DESIGN §13), whose button is "Log weigh-in". The list still shows.

### 3.8 Settings

- Profile and targets (3.1), including the macro split, overrides and "reset to calculated".
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
| `macro-planner` | profile (without weight), targets, overrides, macro split, settings, slots, template, custom foods, meals, `startedOn` (first-run date), `streak` (§3.7) |
| `macro-planner-days` | days by date: `{ "2026-10-15": { changes: {}, entries: [], offPlan: false, locked: false } }` (§3.5) |
| `macro-planner-weight` | weigh-ins, oldest first: `{ weighIns: [{ date, kg }] }` |

All three stay far below Firestore's 1 MB cap: about 20 KB of days with ingredient changes, and about 10 KB of weigh-ins a year.

### 4.3 Rolling window

- Every save of `macro-planner-days` drops dates before 7 days ago, after taking them into the core doc's streak (§3.7), so it holds today, the 7 days before it (Stats' window), and any future days with changes or off plan set. There's no setting and no separate purge.
- "Today" is the device's local date. A device that's been closed for a while drops its stale days on its next save.
- Weigh-ins are never dropped automatically.

---

## 5. UI

All visual rules (colour, type, spacing, components, motion, accessibility) are in `DESIGN.md`, and every value is in `tokens.css`. This section only covers behaviour.

- **Mobile-first, single column.** Bottom tab bar: Today · Plan · Meals · Stats. The Meals tab has two segments at the top, Meals (saved meals, §3.3) and Foods (the foods list, §3.2), and opens on Meals. Settings from a header icon, opening as a pushed screen with a back button (DESIGN §11).
- Large tap targets. A day that goes to plan needs no taps; a swap, skip or portion on a slot planning one item is two (open the slot, choose), and three with several (open the slot, the item, choose).
- No onboarding wizard. First launch opens Settings → Profile with every field empty: number fields show a placeholder naming the field ("Height", "Weight"), the birthday starts empty, and choices start with nothing selected.
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
- **Food quantities:** as entered, in the unit picked (1.5 eggs, 150 g, 1 cup).
- **Macro percents:** whole numbers.

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
8. **Post-v1 improvements** — Settings gear, compact slot actions, quick actions on Today, ingredient changes on Today.
9. **Today's slot rows** — the tile at the top, and "N items" for any slot holding more than one thing.
10. **Food outside the slots** — Other, for what's eaten outside them.
11. **Macro split by percent** — P/F/C percents as an alternative to bodyweight.
12. **Food portions** — household portions on bundled foods, amounts in any unit.
13. **Grow the food list** — add the foods you're missing, with their portions.
14. **Ongoing** — features added as they come up, one step at a time, with no phase end.

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
- Daily calorie bars and stacked macro bars. DESIGN §7 says how they'd look, but v1 doesn't include them.

---

## 8. v2 candidates

- **Targets from the actual rate** — the strongest candidate. Once the weight trend has been lived with, suggest adjusted targets when the actual rate differs from the goal.
- **Edit an entry** — change a quantity or numbers in place, instead of remove and re-add. Entries are snapshots, so this touches nothing else. An added meal's ingredients can already be changed (§3.5); this would cover food and quick entries, and entries on locked days.
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
| Serving model | One serving per food, the unit it's counted in; bundled foods add portions converted through grams | The serving never changes, so meals and snapshots keep their meaning with no migration. USDA's gram weights make cups and pieces exact conversions, and custom foods stay a one-unit form |
| Ounces | oz on meat, fish and other foods sold by weight, at exactly 28.349523125 g | Eating out or at home, you can guess ounces but not grams. USDA lists oz for only some of these foods, rounded to the gram ("3 oz = 85 g"), and an ounce weighs the same on any food |
| Slot totals | Any slot holding more than one thing is "N items" with the whole slot's total | The number on a slot is always all of it. A planned meal with extras is listed like anything else, so there's no second list or divider to read |
| Slot names | Above each slot's card, on Today, Plan and a locked day | The name and any change read as the slot's title, so the card holds only what's in the slot, and the three screens look alike |
| Food outside the slots | Other: an entry with no slot, shown after the slots once it holds something | Unplanned food still has to count, and a slot for it would change the template. It also gives an entry whose slot was removed a place on Today |
| Macro split | By bodyweight (default) or by percent; overrides on top, never rebalanced | Protein by bodyweight suits lifting; a percent split suits one set by a coach or a diet. What you override is exactly what you get |
| Repeat | Single daily template + per-day changes | Weekday templates deferred to v2 |
| Flex slot | Auto "remaining", optional pinned budget of four numbers | Most useful default with zero setup; four numbers so a budget counts in the rings and lock-in like a meal |
| Logging model | Plan by exception: planned items count, you record changes | You eat the plan most days; marking every meal eaten is busywork |
| Day integrity | Snapshot entries when added, and lock-in of past days | Edits to meals or the template never change a past day |
| Ingredient changes | Part of the meal in the day's version of the slot, each ingredient a snapshot | The saved meal and the template stay untouched, so the next day is back to normal with nothing to clean up. A food deleted or edited later can't change or break the day |
| Slot model | A slot is a container of planned meals and foods, in any number and mix; flex when it plans nothing | Meals and foods work the same everywhere: planned, swapped, added or removed, through the same pickers. A slot built around one meal made a planned snack a special case, and foods couldn't be swapped for meals |
| Planned vs. added | Kept apart in the data, shown as one list | Recent and lock-in need to know what was the plan; As planned brings the plan back without touching what you added |
| Changing a planned item | The day keeps its own version of the slot's planned items, all snapshots, from its first change | One shape for every change (swap, portion, ingredients, remove), so totals, flex slots and lock-in read one list. A later template change doesn't reach a day that's already been changed |
| Data from before items | Read either shape, write the new one; no bulk conversion | Nothing is rewritten that isn't being saved anyway, and a backup from before still imports |
| Goal rate | Stored in kg/week, one constant (7700 kcal/kg) | Store metric; imperial options convert from lb rather than using a separate 3500 kcal/lb |
| Stats range | The 7 days before today, rolling | Always a full week of finished days; today is still in progress and has its own rings. What you ate weeks ago doesn't change what to eat today |
| Days on target | Within ±10% of the day's calorie target, kept on the day at lock-in; a streak of them kept across pruning in the core doc | Close enough to count a normal day of guesses and quick numbers, but not a day well over or under. Keeping the target on the day means a new weigh-in or profile change doesn't rewrite past days, as the snapshot rule does for food |
| Stats wording | "Daily average · last 7 days", or "· 5 of the last 7 days" when some don't count | Nothing is logged, so "days logged" is wrong; the count only appears when it's informative, and never as missed |
| Weight | Weight log, latest weigh-in is the profile weight | A trend is the one thing that needs history: it shows whether the chosen rate is actually happening. Tiny data, sporadic entries are fine |
| Day storage | One rolling `macro-planner-days` doc, pruned to the last 7 days on save | Nothing reads older days, so no month docs, retention setting or purge |
| Repeating a day | "Recent" entries, not copy yesterday | What repeats is single items (leftovers, a usual order), not whole days; copying a day would overwrite today and needs a confirm sheet |
| No-plan days | Off plan: every slot becomes flex, stored per day | Reuses the flex slot; vacations need no new logging model |
| Visual design | `DESIGN.md` + `tokens.css`, applied from step 0.1 | No restyle pass at the end |
| UI icons | Lucide, inlined SVG | Matches DESIGN §12's stroke style; no icon font or CDN |
| Food emoji | Character in data, rendered natively; small curated picker | Fluent SVGs were polish, not part of the loop; postponed to v2 with no data change needed |
| Food list size | ~50 to start, grown to ~320 in step 13.1 | You'll find out which foods are missing faster by using it than by guessing 300–500 up front; growth stopped near 320 because the Foods list and food picker render every food unfiltered, and much more would slow that down on a phone |
| Foods placement | A Foods segment inside the Meals tab, not a tab of its own | Foods matter mostly as meal ingredients, so they sit beside meals and the bar keeps four tabs. Food search also appears where it's used: the meal editor and the add sheet |
| Meal categories | Your own tags on meals, a single-select pill filter | A long meal list needs a way in. Tags come from the meals themselves, so there's no tag list to manage, and one pill at a time keeps the filter predictable |
| Dialogs | Shared bottom sheets, never `confirm()` / `prompt()` / `alert()` | Native dialogs can't be styled and have no iOS equivalent |
| First-run profile | Empty: placeholder hints, nothing selected, no targets until complete | Pre-filled values would just be overwritten, and a skipped form would give confident targets for someone else |
| Food categories | Supermarket sections (Produce, Meat & fish, …), separate from the emoji default's group | A long food list needs a way in, like the meal tag filter; the emoji default's grouping (meat/poultry/fish/…) is tuned for icon choice, not for browsing, so it's kept as `emojiGroup` and the new `category` is its own field |
