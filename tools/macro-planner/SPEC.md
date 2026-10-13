# Macro Planner — SPEC (v1)

A deliberately small calorie and macro tracker that doubles as a meal planner. Built for lifters who eat routine meals: set up a day of meals once, swap them with a tap, log by marking them eaten, and see four rings.

**Working title:** Macro Planner · **Slug:** `macro-planner` · **Status:** v1 spec

---

## 1. Principles

1. **Routine over flexibility.** The common case is eating the same few meals. One tap should cover it.
2. **Four numbers per food.** Calories, protein, fat, carbs. No micronutrients, no fibre, no sugar.
3. **No accounts, no backend.** Personal build syncs through `shared/persist.js`. Public build is local-only.
4. **Short memory.** History is kept for months, not years, and purged automatically.
5. **When in doubt, cut it.** Anything not in this document is out of scope for v1.

---

## 2. Stack and structure

Vanilla HTML, CSS and JS with ES modules. No framework, no build step, no dependencies. Charts and rings are hand-written SVG. The look is defined by `DESIGN.md` and `tokens.css`, which are final.

```
tools/macro-planner/
├─ index.html            # dashboard meta tags live here
├─ tokens.css            # design tokens (final; see DESIGN.md)
├─ style.css             # component and view styles, tokens only
├─ app.js                # boot, routing between views
├─ config.js             # MODE = 'personal' | 'public'
├─ assets/
│  └─ emoji/             # bundled Fluent Emoji Flat SVGs, manifest.json, LICENSE
├─ data/
│  ├─ foods.json         # bundled generic food database
│  └─ emoji-picker.json  # curated emoji picker grid
├─ js/
│  ├─ calc.js            # BMR / TDEE / targets / totals (pure functions)
│  ├─ store.js           # storage adapter interface + both implementations
│  ├─ purge.js           # history retention
│  ├─ rings.js           # SVG ring component
│  ├─ emoji.js           # emoji character → bundled SVG, native fallback
│  ├─ icons.js           # inline Lucide UI icons
│  ├─ LICENSE-lucide.txt
│  ├─ ui/                # shared components: buttons, rows, inputs, controls, sheets
│  └─ views/             # today, plan, foods, meals, stats, settings
├─ scripts/              # build-foods.mjs, food-list.json, build-emoji.mjs
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

Goal adjustment: rate in kg or lb per week × 7700 kcal/kg (≈ 3500 kcal/lb) ÷ 7. Rate options: 0.25, 0.5, 0.75 kg/week (0.5, 1, 1.5 lb/week). Negative for lose, positive for gain, zero for maintain.

**Macro defaults:**
- Protein: 1.8 g/kg bodyweight (≈ 0.8 g/lb)
- Fat: 25% of calories (9 kcal/g)
- Carbs: remaining calories (4 kcal/g)

**Rules:**
- Every target (calories, protein, fat, carbs) can be manually overridden. An override sticks until reset.
- Warn, but don't block, if the calorie target falls below BMR.
- If carbs would go negative, clamp to 0 and warn.
- Imperial/metric toggle. Store everything in metric internally; convert for display only.

### 3.2 Foods

**Bundled database:** `data/foods.json`, roughly 300–500 generic whole foods curated from USDA FoodData Central (Foundation + SR Legacy, public domain). Loaded once and searched in memory.

**Coverage priorities:** eggs (S/M/L as separate entries), meats and fish (raw and cooked), rice/oats/pasta/potatoes (dry and cooked), bread, dairy, tofu, legumes, common fruit and vegetables, oils, nut butters, protein powder (generic whey).

**Food record:**

```js
{
  id: "usda-171287",         // or "custom-<uuid>"
  name: "Egg, large",
  serving: { qty: 1, unit: "egg" },   // or { qty: 100, unit: "g" }
  emoji: "🥚",
  kcal: 72, protein: 6.3, fat: 4.8, carbs: 0.4,
  custom: false,
  archived: false
}
```

- Each food has **one** serving definition. Quantities are expressed in that unit. Egg sizes, raw vs cooked, and so on are separate entries rather than conversions.
- Name labels must be unambiguous about state: "Rice, white, cooked" vs "Rice, white, dry".
- **Emoji:** every food has an `emoji` field holding a single Unicode emoji character (never an image path). Bundled foods get an exact emoji where one exists (🥚, 🍌, 🍚), otherwise their category default: meat 🥩, poultry 🍗, fish 🐟, grains 🌾, legumes 🫘, dairy 🥛, vegetables 🥦, fruit 🍎, nuts/seeds 🥜, oils/fats 🫒, supplements 🥤. See §5.1 for how emoji render.

**Custom foods:** emoji, name, serving qty, serving unit, kcal, protein, fat, carbs. That's the whole form. Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).

- Edit and delete custom foods. Bundled foods are read-only (but can be duplicated into a custom food to adjust).
- Deleting a food that's used in a meal **archives** it: hidden from search, still resolvable inside existing meals.
- Search matches across bundled and custom foods. Custom foods rank first.

### 3.3 Meals

A meal is a named list of foods with quantities.

```js
{ id, name: "Rice & beef", emoji: "🍚", items: [{ foodId, qty }] }
```

- Totals are computed from items, never stored.
- Emoji defaults to 🍽️ and is changed with the emoji picker (§5.1).
- Create, edit, duplicate, delete.
- Adding a food to a meal: search → pick → quantity in that food's serving unit.

### 3.4 Daily plan

- **Slots:** 3–6, user-named (e.g. Breakfast, Lunch, Pre-workout, Dinner). Set in Settings.
- **Template:** each slot holds either a meal or a flex budget. The same template applies every day.
- **Swap:** tapping a slot's meal on a given day lets you swap it for another meal **for that day only**. A "make this the default" option updates the template.
- **Flex slot:** a slot with no fixed meal. It displays the **remaining** calories and macros for the day after every other slot is accounted for (planned or eaten). Optionally the user can pin a fixed budget instead. A flex slot is resolved by logging a meal, foods, or quick numbers into it.

### 3.5 Logging

- **Mark eaten:** tap a planned slot → logged. Optional portion multiplier (0.5×, 1×, 1.5×, custom).
- **Quick-add food:** search a food, enter quantity, choose slot.
- **Quick-add numbers:** kcal + macros directly, with an optional label. For restaurants and guesses.
- **Undo / remove** any entry for the day.
- **Copy yesterday:** replace today's entries with yesterday's.
- **Snapshot rule:** each log entry stores its own name, emoji and numbers at log time. Editing or deleting a food or meal later **never** changes past days. Quick numbers entries use 🍽️.

```js
// log entry
{ id, slotId, label: "Rice & beef", emoji: "🍚", kcal, protein, fat, carbs, source: "meal" | "food" | "quick" }
```

### 3.6 Today view (home)

- Four rings: calories, protein, fat, carbs. Each shows eaten / target and remaining.
- Slots listed in order, each showing planned meal (or flex remaining), its totals, and eaten state.
- Date switcher: previous/next day, back to today.
- Weight check-in field (optional, one number per day).

### 3.7 Stats

- Range toggle: 7 days / 30 days.
- The same four rings showing **daily averages** against target.
- **Days on target:** count of logged days where calories are within ±10% of target and protein ≥ 90% of target. Thresholds are constants in `calc.js`.
- **Weight trend:** simple SVG line of check-ins over the range. If enough data exists (≥ 2 weeks), show average weekly change and offer "recalculate targets?" using the latest weight.
- Days with no entries are excluded from averages, not counted as zero.

### 3.8 Settings

- Profile and targets (3.1), including overrides and "reset to calculated".
- Units: metric / imperial.
- Meal slots: count, names, order.
- **History retention:** 6 months / 1 year / never. Default 1 year.
- Export all data as JSON. Import JSON (replaces all data, after a confirm sheet).
- Reset everything (after a confirm sheet).

---

## 4. Storage

### 4.1 Adapter interface

All persistence goes through one interface in `js/store.js` so the two builds differ in one place only:

```js
await store.load(docId)        // → object or {}
await store.save(docId, data)  // full-document write
await store.remove(docId)      // delete a document
await store.list(prefix)       // → docIds starting with prefix
```

- **Personal build** (`MODE = 'personal'`): wraps `shared/persist.js`, with localStorage fallback if the import fails. Shows a small sync status icon in the header with three states: synced, saving, and offline (saved on this device). It mirrors `persist.js`'s `onStatus` (`'synced' | 'saved-locally' | 'offline'`). The localStorage fallback after a failed import counts as offline. How it looks: DESIGN §11.
- **Public build** (`MODE = 'public'`): localStorage only. Must not import `persist.js` or show any passphrase UI.

> **Dependency:** `persist.js` currently exposes `get`/`set` per key. `remove` and `list` (needed for purge) may need to be added. If that's not possible, keep an index of month docs in the core doc and blank purged months instead of deleting them.

### 4.2 Document layout

Firestore caps a document at 1 MB, so logs are split by month.

| docId | Contents |
|---|---|
| `macro-planner` | profile, targets, overrides, settings, slots, template, custom foods, meals |
| `macro-planner-log-YYYY-MM` | that month's days: `{ "2026-10-09": { entries: [], swaps: {}, weight } }` |

### 4.3 Retention

- On app load (at most once per day), delete month docs entirely older than the retention window.
- Purge works at month granularity. A 6-month setting may keep up to ~7 months; that's fine.

---

## 5. UI

All visual rules (colour, type, spacing, components, motion, accessibility) are in `DESIGN.md`, and every value is in `tokens.css`. This section only covers behaviour.

- **Mobile-first, single column.** Bottom tab bar: Today · Plan · Foods · Meals · Stats. Settings from a header icon, opening as a pushed screen with a back button (DESIGN §11).
- Large tap targets; marking a meal eaten is a single tap.
- No onboarding wizard. First launch opens Settings → Profile with sensible defaults filled in.
- Light and dark themes via `prefers-color-scheme`, handled in `tokens.css`.
- Calm, legible, numeric. Colour appears only in macro data (rings, macro dots, charts); the rest of the UI is monochrome (DESIGN §1).
- **No browser dialogs.** Confirmations use the shared confirm sheet. Text and number entry use inputs in the view or in a bottom sheet. Never `confirm()`, `prompt()` or `alert()`.

### 5.1 Icons and emoji

- **UI icons** are [Lucide](https://lucide.dev) (ISC/MIT), copied as inline SVG into `js/icons.js` (only the icons used), styled per DESIGN §12. Lucide's license is committed beside them as `js/LICENSE-lucide.txt`.
- **Emoji only identify foods and meals** (DESIGN §12). Data stores the character, never an image path.
- **Rendering:** emoji render as Microsoft's [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) Flat SVGs (MIT), not native OS emoji. `js/emoji.js` maps a character to `assets/emoji/<codepoints>.svg` (lowercase hex code points joined by `-`, with U+FE0F dropped, e.g. 🍽️ → `1f37d.svg`). If no SVG is bundled for a character, it renders the native character instead.
- **Bundled subset:** `scripts/build-emoji.mjs <path-to-fluentui-emoji-clone>` copies only the SVGs in use into `assets/emoji/`: every emoji in `data/foods.json` (exact emoji and category defaults from `food-list.json`), every emoji in `data/emoji-picker.json`, and 🍽️. It finds each character through the asset folders' `metadata.json`, writes `assets/emoji/manifest.json` (character → file and CLDR name), copies Fluent's `LICENSE` to `assets/emoji/LICENSE`, and lists any character it couldn't find. The clone stays outside the repo.
- **Emoji picker:** a bottom sheet (DESIGN §10) with a curated grid of ~80–120 food emoji from `data/emoji-picker.json`. The grid includes every category default and 🍽️. Each tile's `aria-label` is the emoji's CLDR name from the manifest.

---

## 6. Build phases

0. **Setup** — scaffold, app shell and shared base components, styled per `DESIGN.md` from the start.
1. **Core math** — `calc.js` (BMR, TDEE, targets, meal totals, averages) with tests.
2. **Storage** — adapter interface, both implementations, month docs, purge, with tests.
3. **Foods** — bundled `foods.json`, search, emoji assets and picker, custom food CRUD, archive behaviour.
4. **Meals** — meal CRUD and totals.
5. **Plan + Today** — slots, template, per-day swaps, flex slot, logging, rings.
6. **Stats + Settings** — averages, days on target, weight trend, retention, export/import.
7. **Polish and publish** — public build check, mobile pass, design audit, dashboard check.

---

## 7. Out of scope (v1)

- Micronutrients, fibre, sugar, sodium
- Barcode scanning
- Recipes with instructions or cooked-yield math
- Water, steps, exercise logging
- Social features, sharing, accounts
- Long-term history and charts beyond 30 days
- Daily calorie bars and stacked macro bars. DESIGN §7 says how they'd look, but v1 doesn't include them.

---

## 8. v2 candidates

- **Packaged foods via USDA FoodData Central API.** Runtime search → "save to My Foods", so the bundle stays small and everything lands in the existing custom-food model. Data is CC0. Needs an API key with a default rate limit of roughly 1,000 requests/hour; the public build would need a small proxy to keep the key private, or omit the feature. (Not bundled: the Branded dataset is well over a million records.)
- **Weekday templates** — a different default plan per weekday (e.g. training vs rest days).
- **Training-day / rest-day targets** — different calorie and carb targets by day type.
- **Micronutrient tracking** (would require a richer food model).
- **iOS app** — the public build serves as its beta reference.

---

## 9. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Framework | Vanilla JS | Small data model, no build step, matches other tools, `persist.js` drops in |
| Food data | Bundled curated USDA JSON | Offline, no key, no backend, public domain |
| Serving model | One serving per food | Avoids unit conversion complexity |
| Repeat | Single daily template + per-day swaps | Weekday templates deferred to v2 |
| Flex slot | Auto "remaining", optional fixed budget | Most useful default with zero setup |
| Log integrity | Snapshot numbers at log time | Edits never rewrite history |
| Log storage | One Firestore doc per month | Stays under 1 MB; purge = delete old months |
| Visual design | `DESIGN.md` + `tokens.css`, applied from step 0.1 | No restyle pass at the end |
| UI icons | Lucide, inlined SVG | Matches DESIGN §12's stroke style; no icon font or CDN |
| Food emoji | Character in data, rendered as bundled Fluent Emoji Flat SVGs | Same look on every OS; data stays portable; only the SVGs in use ship |
| Dialogs | Shared bottom sheets, never `confirm()` / `prompt()` / `alert()` | Native dialogs can't be styled and have no iOS equivalent |
