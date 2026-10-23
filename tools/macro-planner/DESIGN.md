# Macro Planner — Design System

Rules for building Macro Planner's UI. Every value comes from `tokens.css`. **Never hard-code a colour, size, space, radius, shadow, duration or easing.** If a value you need is missing, add a token first, then use it.

Stack: vanilla HTML/CSS/JS, no frameworks. Rings and charts are hand-written inline SVG. Theme follows `prefers-color-scheme`; motion follows `prefers-reduced-motion`. Both are handled at token level.

---

## 1. Principles

1. **Numbers are the content.** Every screen exists to show a few numbers clearly. Numbers get the heaviest weight and largest size on the screen. Chrome stays quiet.
2. **Monochrome UI, coloured data.** All interface elements are ink, paper and greys. Colour appears only in macro data: rings, macro dots and chart series.
3. **Flat sticker shapes.** Use 2px outlines, a 12px radius and flat fills. No gradients, glows, blur or soft shadows. The only "shadow" is the hard bottom edge on pressable controls.
4. **One idea per card.** Each card answers one question. When in doubt, split the card or cut content.
5. **Fun to tap, calm at rest.** Motion happens only in response to a tap. Nothing loops, pulses or animates on load.
6. **Never colour alone.** Every coloured mark has a text label or letter next to it.
7. **Native-ready.** Use patterns with a direct iOS equivalent: tab bar, bottom sheets, segmented controls and list rows. Avoid hover-only behaviour, custom scrollbars and web-only idioms.

---

## 2. Colour

### UI roles
| Token | Use for | Never use for |
|---|---|---|
| `--color-bg` | Page background | Cards |
| `--color-surface` | Cards, list rows, tab bar, sheets, secondary buttons | Page background |
| `--color-surface-sunken` | Emoji tiles, active tab, pressed icon button, input wells inside cards | Large areas |
| `--color-border` | Card and row outlines, dividers, chart gridlines | Interactive outlines |
| `--color-border-strong` | Outlines on things you can tap or type into: inputs, secondary buttons, toggles, tiles, dashed placeholders | Static cards |
| `--color-text` | Primary text and **all numbers** | — |
| `--color-text-2` | Units, eyebrows, helper text, "left" lines, inactive tabs | Primary numbers |
| `--color-text-3` | Placeholders, disabled labels, chart target lines | Anything a user must read |
| `--color-ink` | The accent: focus ring, focused input border, selected segment | Body text (use `--color-text`) |
| `--color-btn-face` / `--color-btn-edge` / `--color-on-ink` | Primary button, switch (on) | Anything not pressable |
| `--color-error` | Validation borders and messages, always with an icon and text | Destructive buttons, data |
| `--color-scrim` | Behind bottom sheets and dialogs | — |

### Macro roles
| Macro | Stroke / fill | Track / tint | Label |
|---|---|---|---|
| Calories | `--macro-kcal` | `--macro-kcal-soft` | "Calories", unit "kcal" |
| Protein | `--macro-protein` | `--macro-protein-soft` | "Protein", letter **P** |
| Fat | `--macro-fat` | `--macro-fat-soft` | "Fat", letter **F** |
| Carbs | `--macro-carbs` | `--macro-carbs-soft` | "Carbs", letter **C** |

- **Order is fixed everywhere:** Calories, Protein, Fat, Carbs. This applies to rings, lists, forms, legends and stacked bars.
- **Macro colours are for marks only:** ring arcs, dots, chart lines, bars and segments. **Never set text in a macro colour.** Text is always `--color-text` or `--color-text-2`.
- **`-soft` tints are for ring tracks and chart backgrounds only.** Never put text on a tint.
- **Calories share the ink colour on purpose.** It's the headline number, and that is how it matches the accent.
- **Why fat is a cool avocado:** the palette is tuned so all four colours stay distinct under protanopia, deuteranopia and tritanopia. They differ in lightness as well as hue. Don't swap in a warmer olive for fat: under red-green colour blindness it looks the same as protein.

---

## 3. Typography

Two families:
- `--font-display` (Nunito, rounded) for **numbers, headings, button labels, tab labels and macro names**.
- `--font-body` (Nunito Sans) for **sentences, eyebrows, helper text and text inputs**.

Every element showing a number gets `font-variant-numeric: var(--numeric)`. Nunito's digits are already equal-width; the property keeps fallback fonts aligned.

### Type scale: roles

| Role | Family | Size / line | Weight | Tracking | Example |
|---|---|---|---|---|---|
| Hero number (max **one** per screen) | display | `5xl` | black | tight | "1,260" kcal left |
| Stat number | display | `4xl` | black | tight | "5" days on target |
| Ring centre, hero | display | `3xl` | black | snug | "1,340" |
| Screen / section title | display | `2xl` | black | snug | "Meals", "Today" |
| Ring centre, macro | display | `2xl` | black | snug | "89" |
| Numeric input | display | `xl` | heavy | normal | "82.6" |
| Card title, meal name | display | `lg` | heavy | normal | "Rice & beef bowl" |
| Body | body | `base` | regular | normal | Empty-state sentence, text inputs |
| Button label, macro name | display | `md` | heavy (primary: black) | normal | "Save", "Protein" |
| Secondary info | body | `sm` | semibold | normal | "101 g left", "P 34" |
| Eyebrow | body | `xs`, UPPERCASE | bold | eyebrow | "BREAKFAST · SWAPPED" |
| Tab label | display | `xs` | bold (active: heavy) | normal | "Plan" |
| Ring sub-label | body | `xs` | semibold | normal | "of 2,600" |
| Ring unit | body | `2xs` | bold | normal | "/190g" |

Use the matching `--line-*` with every `--font-size-*`.

### Number formatting
- Thousands separator: 2,600. Show kcal and grams as integers. Show bodyweight to one decimal.
- **The unit follows the number at a smaller size in `--color-text-2`:** "1,260" then "kcal left".
- **Remaining values never go negative.** Write "120 g over" instead of "−120 g left".
- Format as total / target in rings ("89 /190g") and as "N of M" in prose ("5 of the last 7 days").

---

## 4. Spacing and layout

Everything sits on a 4px grid (`--space-*`).

| Gap | Token |
|---|---|
| Page side padding | `--gutter` |
| Between cards in a stack | `--stack-gap` |
| Between sections (title + its cards) | `--section-gap` |
| Between list rows | `--row-gap` |
| Inside a row: tile ↔ text ↔ control | `--inline-gap` |
| Card padding | `--card-pad` (hero card: `--card-pad-lg`) |
| Row padding | `--row-pad` |

- **Single column.** On screens wider than `--content-max`, centre the column. The header and tab bar match the column width. Don't add multi-column layouts at desktop size. The phone layout is the layout.
- **No horizontal scroll at 360px.** Long names truncate with an ellipsis on one line. Number rows use `flex-wrap: wrap`.
- **Layout siblings with flex or grid plus `gap`,** never with margins on children.
- Stacking order: header `--z-header`, tab bar `--z-tabbar`, sheets `--z-sheet`, toasts `--z-toast`. No other z-index values.
- The tab bar's bottom padding is `--space-6` plus `--safe-bottom`. Scrollable content gets enough bottom padding to clear it.

---

## 5. Shape

- **Radius:** `--radius-md` is the default for cards, buttons, inputs, rows, tiles and tab items. `--radius-sm` for chips and chart bars. `--radius-lg` for bottom sheet top corners only. `--radius-pill` for switches, segmented controls and tag pills.
- **Outlines:** always `--border-width` solid.
  - Static grouping uses `--color-border`.
  - Interactive elements use `--color-border-strong`.
  - Placeholders (flex slot, empty slot, add tile) use **dashed** `--color-border-strong`.
- **Edges:** only pressable controls have them: `--edge-primary` and `--edge-secondary`. Cards never do.
- **Focus:** `outline: var(--focus-width) solid var(--color-ink); outline-offset: var(--focus-offset)`, on `:focus-visible` only.

---

## 6. Rings

All rings are inline SVG with `viewBox="0 0 100 100"`, rotated −90° so progress starts at 12 o'clock.

```
r = 50 − stroke / 2            circumference C = 2πr
track: circle, stroke = --macro-X-soft
arc:   circle, stroke = --macro-X, stroke-linecap: round,
       stroke-dasharray: 2C 2C, stroke-dashoffset: C × (2 − min(total / target, 1))
```

- **Why the doubled dash:** `--ease-spring` overshoots by about 10%. With dashes and gaps twice the circumference, an arc that springs past full stays full instead of opening a gap at 12 o'clock.

| Ring | Size | Stroke | Where |
|---|---|---|---|
| Hero | `--ring-hero-size` | `--ring-hero-stroke` | Calories on Today |
| Macro | `--ring-macro-size` | `--ring-macro-stroke` | Protein, Fat and Carbs on Today, in a 3-column grid |
| Mini | `--ring-mini-size` | `--ring-mini-stroke` | Four in a row, calories first: Plan totals and Stats' daily averages; no centre text |

- **The SVG is `aria-hidden="true"`.** The label and numbers beside it are real text. The container's accessible name reads like "Protein, 89 of 190 grams, 101 left".
- **Centre text:** the day's total (display, black) over target (`--color-text-2`). Below the ring: macro name, then "N g left" or "N g over".
- **Mini rings** have no centre text. Under each: the macro name, the total, then "of N g", or "N g over" once over target. On Stats the total is the daily average; "of target" suits days already over better than what's left.
- **Over target:** the arc stays full and the text switches to "over". Don't use a second lap, a colour change or a warning colour.
- **Zero:** show the track only. Don't draw a rounded-cap dot at 0%.
- **Animate only `stroke-dashoffset`:** `transition: stroke-dashoffset var(--dur-ring) var(--ease-spring)`.

---

## 7. Charts (Stats)

- **No chart library.** Build charts as inline SVG sized to `--chart-height`, full card width, with `preserveAspectRatio="none"` only on the plot group (never on text).
- **Gridlines:** at most 3 horizontal lines, `--chart-grid-width` in `--chart-grid`. No vertical gridlines and no chart border.
- **Axis text:** `--font-size-xs` `--chart-axis-text` with tabular figures. Label the first, middle and last x-ticks only.
- **Target line:** dashed (`--chart-target-dash`) in `--chart-target`, labelled at the right end ("Target 2,600").
- **Bodyweight trend:** a single `--chart-line` path at `--chart-line-width` with round joins and caps, and no area fill. The x-axis is time, so each weigh-in sits at its date. Join the weigh-ins in date order; weigh-ins are occasional, so the uneven spacing shows the gaps, and nothing is drawn where there was no weigh-in. Show a point (`--chart-point-size`) only on the latest value, labelled with its number.
- **Goal pace:** styled like the target line, but sloped: it starts at the first weigh-in in the window and follows the goal rate, labelled "Goal pace" at the right end. For maintain it's flat.
- **Rate line under the chart:** the latest weight in display heavy with tabular figures, its date in `--color-text-2`, then "−0.3 kg/week · goal −0.5" in body `--color-text-2`. Plain text, no colour or icon for ahead or behind.
- **Daily bars:** `--radius-sm` top corners only (`--chart-bar-radius`), single series in `--macro-kcal`.
- **Stacked macro bars:** segments in the fixed order Protein → Fat → Carbs from bottom to top. Separate segments with a `--chart-bar-gap` gap in `--chart-bar-gap-fill`, so boundaries show without colour. Always pair with a direct text legend.
- **7 / 30 toggle:** a segmented control (see §9).
- **"Days on target":** a stat number ("5"), with "of 7 days on target" in body `--color-text-2`, plus a row of mini day markers. A filled ink circle with a check means hit; an outlined circle means miss. Shape carries the meaning, not just fill.

---

## 8. List rows

All rows: `--color-surface` fill, `--border-width` `--color-border` outline, `--radius-md`, `--row-pad`, `--row-gap` between rows. A row's full height is ≥ `--tap-min`.

**Anatomy, left to right:** emoji tile → text stack (flex 1, `min-width: 0`) → one trailing control.

**Text stack:**
1. Eyebrow (optional): slot name or category, plus any change ("BREAKFAST · SWAPPED", "LUNCH · SKIPPED", "DINNER · 1.5×", "BREAKFAST · EDITED"). Several changes go in the order swapped, edited, portion: "BREAKFAST · SWAPPED · EDITED · 1.5×".
2. Title: meal or food name, card-title style, one line with ellipsis.
3. Numbers line: kcal in `--color-text` heavy, then `P n  F n  C n`. Each macro letter has a `--dot-size` dot in its macro colour before it. Use `--color-text-2` semibold and tabular figures, separated by `--space-2`.

**Variants:**
- **Meal slot (Today):** the whole row opens the slot actions sheet. Trailing: a chevron. Extras added to the slot are listed under it as plain text lines (emoji, label, kcal).
- **Edited meal slot (Today):** a meal slot with "EDITED" in the eyebrow lists every ingredient under the numbers line first, as plain text lines like extras: emoji, name, then the amount and unit at the slot's portion ("3 egg", as the Ingredients sheet shows it) in place of kcal, in `--color-text-2`. A long name truncates; the amount always shows. Extras added to the slot follow below a `--border-width` `--color-border` divider, so foods in the meal and foods added beside it read as two lists. A slot with no ingredient change shows no ingredient lines. A filled flex slot whose one entry is an edited added meal lists that meal's ingredients the same way, at the amounts in its Ingredients sheet.
- **Edited extra (Today):** an edited added meal that's one of the lines under a slot (an extra beside a meal, or one of the items in a filled flex slot or a slot swapped to a food or quick numbers) lists its ingredients under its own line, in the same style as an edited meal slot's, indented so they line up with that line's label rather than its emoji. Other extras stay one line.
- **Skipped slot:** the meal's title and tile stay, with the title and numbers line in `--color-text-2` and the numbers line reading "Skipped". No strike-through and no colour.
- **Entry row (locked past day):** an entry's emoji, label and numbers, with its slot in the eyebrow. Trailing: a 44px remove icon button.
- **Added entry (slot sheets):** an entry row without the eyebrow, since the sheet's title names the slot. A meal added with its ingredients is one row button with a trailing chevron that opens its Ingredients sheet, where its remove is. Anything else, a meal added before entries kept their ingredients included, keeps the 44px remove icon button.
- **Flex slot (open):** no fill, **dashed** `--color-border-strong` outline, and a dashed tile with an outline icon instead of emoji. Title: "N kcal to fill", or "N kcal over" when the rest of the day is already over target, with nothing left on the numbers line. The numbers line shows what's left for the day. With a pinned budget, the title is "Budget" and the numbers line shows the budget. With no targets, or on a past day, the title is "Open", with no numbers line and no Log. Trailing control: a secondary "Log" button that opens the add sheet.
- **Filled flex slot (Today):** once something is added, it's no longer a placeholder: a solid row like a meal slot, with "FLEX" in the eyebrow ("DINNER · FLEX"). One entry shows its own emoji and label. Several show 🍽️ and "N items", each listed under it as plain text lines like a meal slot's extras. The numbers line is their total. Trailing: a chevron. The whole row opens the filled flex sheet.
- **Swapped-in food or quick numbers (Today):** a planned slot swapped to a food or quick numbers (SPEC §3.5) looks like a filled flex slot, with "SWAPPED" in the eyebrow in place of "FLEX" ("LUNCH · SWAPPED"). What it holds comes first, then anything added to it, as one list with no divider. One thing shows its own emoji and label. Several show 🍽️ and "N items", each listed under it. The numbers line is their total. Trailing: a chevron. The whole row opens the slot actions sheet.
- **Empty slot (Plan):** same dashed treatment. Title: "Add a meal", or "Budget" with the budget on the numbers line when one is pinned. The whole row is the button.
- **Food search result:** title plus serving ("100 g") in the eyebrow. Trailing: a 44px add icon button.
- **Food row (Foods list):** like a food search result, but the whole row is one button. A custom food's eyebrow starts with "Custom" ("CUSTOM · 150 G"). Trailing: a `--icon-size-sm` outline icon in `--color-text-2` that shows what a tap does, a pencil on custom foods (edit) and a copy icon on bundled foods (duplicate). It's a hint inside the row button, not a button of its own, and the action is also in the row's accessible name. Adding a food here means "Add custom food", a full-width secondary button above the search field.
- **Saved meal:** trailing chevron. The row navigates to the editor.
- **Ingredient row (meal editor):** the title wraps instead of truncating, and the quantity field always sits on its own line under the numbers line, so every row has the same layout and the fields line up down the list. The tile stays beside the title. Trailing: a 44px remove icon button, centred on the row. Live totals sit in a sticky card above the list.
- **Ingredient row (Ingredients sheet):** the meal editor's ingredient row, for one food in the day's version of a meal: its own emoji, name and numbers, and its amount at the slot's portion. The quantity field is `--qty-input-w-lg` wide, since a portion makes amounts like "262.5". Trailing: a 44px swap icon button (§12), centred on the row, labelled like "Swap Bread, white".
- **Recent entry (add sheet):** like a food search result: the entry's emoji, label and numbers, with "Yesterday" or the weekday in the eyebrow. Trailing: a 44px add icon button.
- **Weigh-in row (Stats):** no emoji tile, because emoji only identify foods and meals (§12). Eyebrow: the date ("TUE 14 OCT"). Title: the weight to one decimal with its unit, tabular figures. Trailing: a 44px delete icon button labelled like "Delete weigh-in, 14 October".
- **Off-plan line (Today):** one row above the slots, `--color-surface-sunken` fill, no tile. Text: "Off plan until Fri 23 Oct" (or "Off plan today") in body bold. Trailing: a secondary "Back on plan" button. Monochrome, like the rest of the chrome.

**Quick actions (Today):** a row of four equal compact buttons (§9), `--space-2` apart, between the rings and the slots: "Add food" (Lucide `apple`), "Quick" (`hash`), "Weigh in" (`weight`) and "Off plan" (`calendar-off`). "Quick" is quick numbers, named after the add sheet segment it opens on, since "Quick numbers" doesn't fit at 360px; its accessible name is "Quick numbers". Add food and Quick open the locked day's slot chooser ("Add to which slot?"), then the add sheet on its Food or Quick segment. Weigh in opens the Stats "Log weigh-in" sheet. Off plan opens the "Off plan until [date]" sheet. A button that doesn't apply is disabled (§9) rather than hidden, so the row keeps its four places: Add food and Quick on a past day that isn't locked, and Off plan before today, more than 30 days ahead or on a day already off plan, whose off-plan line sits under the row.

**Slot actions sheet:** a bottom sheet (§10) titled with the slot and meal ("Breakfast · Oats & whey"), or with what was swapped in ("Lunch · Banana"). In order: a row of three equal secondary buttons on one line, "Swap", "Skip" and "Edit" (short labels, since the title names the slot), then Portion, "Add to this slot" as a full-width secondary button, the slot's added entries, then As planned as a full-width secondary button when the slot has a change, an ingredient change included. The row holds what acts on the planned meal; Add sits apart because it acts on the slot. A row button that doesn't apply is disabled (§9) rather than hidden, so the row keeps its three places: Skip and Edit on a skipped slot, and Edit on a slot swapped to a food or quick numbers, which has no ingredients. Portion doesn't show on a slot swapped to a food or quick numbers. Portion is a segmented control (0.5× · 1× · 1.5× · Custom); Custom shows a numeric input. Skip and As planned apply and close straight away, with no confirm sheet, because either one undoes the other. Added entries are added entry rows (above): a remove icon button each, or a chevron for a meal added with its ingredients. Removing asks first with the confirm sheet.

**Swap sheet:** a bottom sheet titled with the slot ("Lunch · Swap"), opened by the slot actions sheet's Swap. A segmented control (Meal · Food · Quick) picks what to swap in, each laid out as in the add sheet: the meal picker with its tag filter row, with "Make this the default" as a switch above it; food search then an amount; or quick numbers. The switch is on Meal only, since the template plans meals. The sheet opens on Meal, or on Food when there's no other saved meal. Tapping a meal swaps it in. Food and Quick each end in one primary button: "Swap food", "Swap numbers". Each applies and closes with no confirm sheet, since As planned undoes it.

**Ingredients sheet:** a bottom sheet titled with the meal ("Breakfast sandwich · Ingredients"), opened by the slot actions sheet's Edit, holding the day's version of the meal (SPEC §3.5). In order: the meal editor's totals card, an ingredient row per food, "Add food" as a full-width secondary button that opens the meal editor's add food sheet, then "Reset to original meal" as a full-width secondary button once something has changed. Each change saves as it's made, with no Save button, and the rings move behind the sheet. Reset applies and closes, like As planned. Opened from a meal added to a slot (its added entry row), it holds that entry's ingredients, Reset goes back to the meal as it was added, and it ends in "Remove from slot", a full-width secondary button that closes the sheet and asks first with the confirm sheet. The sheet scrolls on its own, so the totals card sticks to its top edge instead of under the header, a `--stack-gap` down, with the gap above it filled in `--color-surface`.

**Ingredient swap sheet:** opened by an ingredient row's swap button and titled with the food ("Bread, white · Swap"): "Remove from meal" as a full-width secondary button, disabled on the meal's last ingredient, then food search as in the add food sheet. A picked food's amount starts at the old amount when it's counted in the same unit, otherwise at one serving, and its primary button is "Swap food". Removing and swapping apply with no confirm sheet, since Reset to original meal undoes either.

**Filled flex sheet:** a bottom sheet titled with the slot ("Dinner · Flex"): its entries as added entry rows, as in the slot actions sheet, then Add to this slot.

**Add sheet:** a bottom sheet titled with the slot ("Dinner · Log"), opened by Log, by the slot actions sheet's Add to this slot, by the filled flex sheet's Add to this slot and by a locked day's Add. A segmented control (Recent · Meal · Food · Quick) picks what to add: Recent entries, the meal picker with its tag filter row, food search then an amount, or quick numbers (an optional label, then the four numbers laid out like the custom food form's). It opens on Recent when Recent has entries, otherwise on Meal; an empty Recent shows one line of `--color-text-2` body text. Tapping a meal, or a Recent entry's add button, adds it. Food and Quick each end in one primary button: "Log food", "Log numbers".

**Budget sheet (Plan):** opened from a flex slot's "Pin a budget" (or "Change budget"), above its meal list. Titled "Dinner · Budget": one sentence, the four numbers laid out like the custom food form's, a primary "Pin budget", and a secondary "Remove budget" when one is pinned.

---

## 9. Buttons and controls

| Type | Fill | Outline | Edge | Text | Height |
|---|---|---|---|---|---|
| **Primary** | `--color-btn-face` | same as fill | `--edge-primary` | `--color-on-ink`, display black `md` | `--control-h` |
| **Secondary** | `--color-surface` | `--color-border-strong` | `--edge-secondary` | `--color-text`, display heavy `md` | `--control-h-sm` |
| **Compact** | `--color-surface` | `--color-border-strong` | `--edge-secondary` | `--color-text`, an `--icon-size` icon over display heavy `xs` | `--control-h-compact` |
| **Icon button** | transparent | none | none | `--color-text` icon | `--tap-min` square |
| **Text link** | none | none | none | `--color-text`, underlined | ≥ `--tap-min` hit area |

- **Press:** on `:active`, `transform: translateY(var(--press-depth))` (secondary: `--press-depth-sm`) and `box-shadow: var(--edge-none)`. Transition `transform` and `box-shadow` over `--dur-press` with `--ease-out`. The button visibly sinks into its edge.
- **Icon button press:** `--color-surface-sunken` background and `scale(0.92)`.
- **One primary per screen or sheet.** Everything else is secondary.
- **Destructive actions** (delete meal, clear history, import over existing data) use a **secondary** button with an explicit verb ("Delete meal") and a confirm sheet. There's no red button.
- **Disabled:** `--color-text-3` text, `--color-border` outline, no edge, no press.
- **Compact button** (Today's quick actions, §8): a secondary button for a row too narrow for its padding and `md` label, such as four across at 360px, about 76px each. An icon over a one-line label, `--space-1` apart, like a tab bar item (§11), with `0 var(--space-1)` padding. It fills its column, and presses and disables like a secondary button. Keep the label short enough to fit at 360px. If one ever runs out of room it truncates with an ellipsis rather than wrapping.
- **Segmented control** (Meals / Foods, the add sheet's Recent / Meal / Food / Quick, 7/30 days, units, sex): a `--color-surface-sunken` track with `--radius-pill` and a `--border-width` `--color-border-strong` outline. The selected segment is a `--color-surface` pill with an ink outline. Items are ≥ `--tap-min` high. The pill slides over `--dur-base` with `--ease-spring`. With nothing selected yet (a profile field not filled in), there's no pill and every label stays `--color-text-2`.
- **Switch** (settings toggles, and the Foods list's "Custom foods only" filter): use the platform-like pill. Track `--color-border-strong` when off, `--color-btn-face` when on; knob `--color-surface`. Pair it with a visible text label.
- **Tag pill** (meal tags, SPEC §3.3): a toggle button with `aria-pressed`, `--control-h-sm` high, `--radius-pill`, padding `0 var(--space-4)`, display heavy `sm` label on one line. Off: `--color-surface` fill, `--border-width` `--color-border-strong` outline, `--color-text`. On: `--color-btn-face` fill and outline, `--color-on-ink` text. No edge, no press depth; the fill change is the feedback. Pills sit `--space-2` apart.
  - **Filter row** (Meals list, meal pickers): "All" first, then the tags. One line that scrolls sideways inside its own strip, with no visible scrollbar, so the page never scrolls sideways (§4). The strip bleeds to the screen edges and pads its content by `--gutter`, so the first pill lines up with the column. It's a single-select group: selecting one deselects the rest, and one is always on.
  - **Meal editor:** the meal's tags as "on" pills on a wrapping row under the name, each one removing its tag when tapped, then a "New tag" pill with a **dashed** `--color-border-strong` outline and a plus icon. "New tag" opens a bottom sheet (§10) with a text field and the existing tags as "off" pills to pick from; typing filters them.

---

## 10. Inputs

- **Box:** height `--control-h`, `--radius-md`, `--border-width` `--color-border-strong`, `--color-bg` fill inside cards (so it reads as a well), padding `0 var(--space-4)`.
- **Label:** a visible `<label>` above the input, display heavy `lg` or body semibold `sm` in dense forms. Never use the placeholder as the label.
- **Numeric fields** (kcal, P, F, C, weight, quantity): `inputmode="decimal"`, display heavy `xl` with tabular figures, and the unit as a suffix inside the box in body bold `md` `--color-text-2`.
- **Focus:** the border becomes `--color-ink` (no glow).
- **Error:** the border becomes `--color-error`. Add an error icon and message below in `--font-size-sm`, linked with `aria-describedby`.
- **Search field:** a 24px outline search icon as a prefix and a clear (×) icon button as a suffix when it has a value.
- **Custom food form:** the order is Name → Serving (amount and unit) → kcal → Protein → Fat → Carbs. Put the macro fields in a 2-column grid at ≥ 360px, with a `--dot-size` macro dot before each label.
- **Emoji picker:** a bottom sheet with a grid of `--tile-size-sm` tiles, emoji at `--emoji-size-sm`. The selected tile gets an ink outline.

---

## 11. Header and tab bar

**Header** (`--header-h`, `--color-bg`, no outline):
- Today: previous-day icon button, date stack (title "Today" or the weekday, plus an `sm` `--color-text-2` date), next-day icon button. Settings icon button on the right.
- Other tabs: the screen title (`2xl` black) on the left, Settings on the right.
- Meals: like other tabs. Its Meals / Foods segmented control is a full-width control at the top of the content, under the header, not part of it.
- **Brand mark:** the four tab screens start with the colour mark (§17), lined up with the content gutter. Pushed screens start with Back instead.
- Tapping the date title jumps back to today.
- **Sync status:** one `--icon-size` outline icon in `--color-text-2`, just left of Settings on every screen. A cloud with a check (Lucide `cloud-check`) means synced. A cloud with an up arrow (`cloud-upload`) means saving, shown only if a save is still in flight after a second, so normal saves don't flicker. A crossed-out cloud (`cloud-off`) means offline, with changes kept on this device. It isn't a button. It sits in a `role="status"` element with visually hidden text ("Synced", "Saving", "Offline, saved on this device"). The icon swaps with no animation. Shape carries the meaning, not colour.

**Tab bar:**
- Fixed to the bottom, `--color-surface` fill, `--border-width` `--color-border` top outline, `--z-tabbar`.
- 4 equal columns: Today, Plan, Meals, Stats. Each item is `--tabbar-h` high with `--radius-md`: a 24px icon over an `xs` label.
- **Active item:** `aria-current="page"`, `--color-surface-sunken` fill, `--color-border-strong` outline, label weight heavy, `--color-text`.
- **Inactive items:** `--color-text-2`, no fill.
- Labels are always visible. Never show icon-only tabs.
- Settings opens as a pushed screen with a back button, not a tab.

---

## 12. Icons and emoji

- **UI icons:** rendered at `--icon-size` from a 24×24 viewBox, `fill="none"`, `stroke="currentColor"`, `stroke-width` = `--icon-stroke`, round caps and joins. Inline SVG, `aria-hidden="true"`. Icon-only buttons carry an `aria-label`.
- **Tab icons:** Today (ring), Plan (calendar), Meals (bowl), Stats (bars), Settings (gear).
- **Swap icon:** two opposed arrows (Lucide `arrow-left-right`), on an ingredient row's swap button in the Ingredients sheet (§8).
- **Emoji only identify foods and meals.** Never use them as UI icons, decoration, status or empty-state art.
- **Emoji tile:** `--tile-size` square, `--radius-md`, `--color-surface-sunken` fill, `--border-width` `--color-border-strong` outline, emoji at `--emoji-size`, centred.
- Generic foods have a fixed emoji in the database. Custom foods and meals default to 🍽️ until the user picks one.
- **Icon source:** Lucide, inlined from `js/icons.js`. Lucide's 24×24 outline style already matches the rules above. Set size and stroke from tokens in CSS, not in SVG attributes.
- **Emoji source:** native OS emoji, as text at `--emoji-size` (picker: `--emoji-size-sm`). Data stores the character. In a list row the tile is `aria-hidden="true"`, because the title beside it names the item. (Bundled Fluent Emoji SVGs are a v2 candidate, SPEC §8.)

---

## 13. Empty states

An empty state is a single card:
- dashed `--color-border-strong` outline
- a `--tile-size` dashed tile holding a UI outline icon
- a card-title-style heading
- one sentence of body text in `--color-text-2`
- **one** primary button

Centre it within the content area. No illustrations, no emoji, no jokes.

| Screen | Heading | Button |
|---|---|---|
| Today, nothing planned | "No meals planned" | "Plan today" |
| Meals, none saved | "No saved meals yet" | "Build a meal" |
| Meals › Foods, search with no results | "No match for '…'" | "Add custom food" |
| Meals › Foods, "Custom foods only" with none yet | "No custom foods yet" | "Add custom food" |
| Stats, under 2 days counted in the last 7 | "Your 7-day averages show up after a couple of days" | none (no action makes sense) |
| Stats, under 2 weigh-ins in 12 weeks | "Weigh in a couple of times to see a trend" | "Log weigh-in" |

Rings with no targets set show tracks only and a single line: "Set your targets in Settings" (text link).

---

## 14. Motion

Only animate in response to a user action. Every duration is a token, and reduced motion collapses them all to near zero in `tokens.css`, so no extra media queries are needed for transitions. Gate any JS-driven animation on `matchMedia('(prefers-reduced-motion: reduce)')`.

| Moment | What moves | Timing |
|---|---|---|
| Press any button | translateY by edge depth, edge collapses | `--dur-press`, `--ease-out` |
| Add to a slot | the add icon button "pop": scale 1 → `--pop-scale-down` → `--pop-scale-up` → 1 | `--dur-pop`, `--ease-spring` |
| Add to a slot | the slot's emoji tile "hop": translateY `--hop-lift` and rotate `--hop-tilt`, then back | `--dur-hop`, `--ease-spring` |
| Ring value changes | `stroke-dashoffset` | `--dur-ring`, `--ease-spring` |
| Chart switches 7/30 | bars/line morph to new values | `--dur-ring`, `--ease-out` |
| Colour / border change | fill, outline | `--dur-fast`, `--ease-out` |
| Bottom sheet | translateY in from bottom; scrim fades. Dismiss uses `--ease-in-out` | `--dur-base`, `--ease-out` |
| Segmented control | selected pill slides | `--dur-base`, `--ease-spring` |

- **Pop and hop** run only when something is added to a slot, not on remove, skip or As planned.
- **Never** loop, pulse, shimmer, auto-play, parallax or animate on page load. Skeleton loaders are flat `--color-surface-sunken` blocks, not shimmering.
- **Only animate `transform`, `opacity` and `stroke-dashoffset`.** Never animate layout properties.

---

## 15. Accessibility checklist

- [ ] Every hit target is ≥ `--tap-min` in both axes.
- [ ] Works at 360px with no horizontal scroll, and at 200% browser zoom on a desktop-width window. Zoom on a phone isn't covered: type sizes are px tokens, so 200% on a 360px phone lays out at 180px, narrower than the tab bar and ring grid allow.
- [ ] Text contrast is ≥ 4.5:1. `--color-text-3` is never used for essential text.
- [ ] Every macro mark has a text label or letter next to it.
- [ ] Rings and charts are `aria-hidden`, with the same numbers available as text.
- [ ] Toggles use `aria-pressed`, tabs use `aria-current`, icon buttons have an `aria-label`, and inputs have a `<label>`.
- [ ] Focus is visible on every control (§5).
- [ ] Real `<button>`, `<a>`, `<input>` and `<label>` elements are used. Never a clickable `<div>`.

---

## 16. Mapping to iOS

| Web | iOS |
|---|---|
| `--font-display` | SF Pro Rounded |
| `--font-body` | SF Pro Text |
| Tab bar | `TabView` |
| Settings push | `NavigationStack` push |
| Bottom sheets | `.sheet` with detents |
| Segmented control | `Picker(.segmented)` |
| Light/dark tokens | Asset-catalog colour sets with Any/Dark appearances, same names minus `--` |
| `--ease-spring` | `.spring(response: 0.4, dampingFraction: 0.6)` |
| Press edge | a `ButtonStyle` that offsets y by the edge depth when `isPressed` |
| Haptics (iOS only) | light impact on press, success notification on adding to a slot |

---

## 17. Brand mark

The mark is a prep box: an outline around three compartments, one per macro. It's the brand, not an emoji or a UI icon.

### Assets

Served from `icons/`. `design/` holds the source files and is never referenced by the app.

| File | For |
|---|---|
| `favicon.svg` | Browser tab icon |
| `favicon-32.png`, `favicon-16.png` | Tab icon for browsers without SVG favicons |
| `favicon-48.png` | Spare size, not linked |
| `apple-touch-icon.png` | iOS "Add to Home Screen" icon, 180×180 |
| `icon-192.png`, `icon-512.png` | Manifest icons, purpose `any` |
| `icon-maskable-512.png` | Manifest icon, purpose `maskable`; Android crops it to its own shape |
| `og-image.png` | Link preview, 1200×630. `og:image` needs its absolute URL |
| `logo-mark-color.svg` | Full-colour mark, light values |
| `logo-mark.svg` | One-colour mark, `fill="currentColor"` |

### Colour

| Part | Token |
|---|---|
| Icon background | `--color-bg` |
| Outline | `--color-text` |
| Interior | `--color-surface` |
| Protein, carbs, fat compartments | `--macro-protein`, `--macro-carbs`, `--macro-fat` |

- The dark variant uses the same tokens' dark values. The exported PNGs and `logo-mark-color.svg` bake in the light values, so wherever the mark should follow the theme, inline it with token fills, as the header does.
- **Never recolour, reorder or redraw the compartments:** protein is the big one on the left, carbs top right, fat bottom right.
- Use `logo-mark.svg` wherever the mark must take on the text colour. `currentColor` only works inline; as an `<img>` it falls back to black.

### In the app

- The header's colour mark is `--logo-size` high, which puts its outline at `--border-width`. It's `aria-hidden`; the title beside it names the screen.
- It's the one place macro colours appear outside data, because its compartments stand for the macros.
- Emoji rules are unchanged (§12). The mark isn't an emoji or a UI icon, and neither stands in for it.

---

## Don'ts

- Don't use gradients, blur, glows, soft shadows or transparency effects (except `--color-scrim`).
- Don't use colour in the UI chrome. Macro colours are never used for buttons, text, links or tabs.
- Don't use emoji outside food and meal tiles.
- Don't put more than one hero number on a screen, or more than one primary button per view.
- Don't hard-code values. Don't add new colours outside `tokens.css`.
