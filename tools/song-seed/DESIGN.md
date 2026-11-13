# Song Seed — Design rules

Rules for whoever builds or changes the Song Seed UI, including an AI coding assistant. Song Seed is a single-page tool that rolls starting settings for a new song and plays them as a loop. One person uses it on a laptop for hours at a time, and sometimes on a phone.

**Stack:** vanilla HTML, CSS and JS. Icons are hand-written inline SVG. No frameworks, no icon fonts, no images.
**Source of truth:** `tokens.css` holds every value. This file says how to use them. If this file and the round-1 mockup disagree on a size, this file wins.

---

## 1. Principles

1. **Paper and ink.** The page is flat warm paper. Blocks are slightly darker paper. There are no borders around blocks and no shadows (except the toast).
2. **Colour lives in the timeline.** Lane colours (kick, snare, cymbal, current chord) are the only real colour on screen. Outside the timeline, colour appears only for: the colour note, the current-chord highlight, and delete confirmation.
3. **Serif for music, sans for machinery.** Newsreader sets anything a musician reads: chord symbols, numerals, keys, note names, headings and saved names. Inter sets everything else: buttons, labels, hints and values.
4. **Calm.** Few moving parts. Only the playhead, the current-chord highlight and the toast change on their own.
5. **Never colour alone.** Every state has a second signal: shape, text, an icon change, weight or pattern.
6. **Full rows only.** No layout ever ends a row with leftover items (see §4).

---

## 2. Tokens

- Use `var(--token)` for every colour, size, radius, duration and font. Never write raw hex, px font sizes or ms values in component CSS.
- Light is the default. Dark overrides live in `tokens.css` under `@media (prefers-color-scheme: dark)`. Components never branch on theme.
- `--color-ink-3` (hint text) is never placed on `--color-surface-2`; use `--color-ink-2` there.
- Lane colours (`--lane-*`) are only for timeline marks, the current-chord highlight and the saved fingerprints. Never use them for buttons or text.

### Migrating from v1

The groups are kept: `--color-*`, `--lane-*`, `--grid-*`, `--playhead`, `--font-*`, `--text-*`, `--weight-*`, `--space-1…6`, `--radius-*`, `--shadow-*`, `--tap`, `--tl-*`, `--hit-*`, `--dur-*`, `--ease`. Map v1 names **by role** onto these:

| Role | Token |
|---|---|
| page background | `--color-paper` |
| card / block background | `--color-surface` |
| input background | `--color-field` |
| primary / secondary / muted text | `--color-ink` / `--color-ink-2` / `--color-ink-3` |
| card border | *(remove; blocks have no border)* |
| divider | `--color-rule` |
| input / chip outline | `--color-line` |
| primary button fill | `--color-ink` (text `--color-on-ink`) |
| accent / brand blue | *(remove; Play is ink. Use `--color-accent` only where §1.2 allows)* |
| card shadow | *(remove; only `--shadow-toast` exists)* |

**New tokens:** `--color-surface-2`, `--color-raised`, `--color-hatch`, `--color-hover`, `--color-press`, `--color-ink-hover`, `--color-accent`, `--color-on-accent`, `--color-focus`, `--lane-chord-now`, `--lane-chord-ink`, `--lane-strum`, `--lane-rest`, `--grid-step`, `--pattern-hatch`, `--leading-*`, `--tracking-*`, `--page-max`, `--page-pad`, `--section-gap`, `--band-gap`, `--row-label-w`, `--focus-*`, `--icon*`, `--seg-inset`, `--chart-*`, `--fp-*`, `--toast-hold`, `--motion`.

**Renames:** I haven't seen v1's token names, so none are forced. Rename v1 names into the table above by role, then delete any v1 token left without a role.

---

## 3. Typography

| Use | Font | Size | Weight | Notes |
|---|---|---|---|---|
| App title "Song Seed" | display | `--text-2xl` | medium | `--tracking-display`, `--leading-tight` |
| Section heading (Loop, Melody, Saved) | display | `--text-2xl` | medium | `<h2>` |
| Chord symbol (timeline) | display | `--text-xl` (compact: `--text-lg`) | medium | `white-space: nowrap` |
| Roman numeral | display *italic* | `--text-sm` | regular | `--color-ink-2` |
| Key / Mode select value, tempo number, note names | display | `--text-xl` | regular / medium | |
| Saved name, chord-tone symbol | display | `--text-lg` | regular / medium | |
| Bar numbers in ruler | display *italic* | `--text-sm` | regular | `--color-ink-3` |
| Row label, strip label, sub-heading (Scale, Chord tones) | ui | `--text-xs` | semibold | UPPERCASE, `--tracking-caps`, `--color-ink-2` |
| Field label (under a field's value), mini label | ui | `--text-xs` (compact `--text-2xs`) | semibold | UPPERCASE, `--tracking-caps`, `--color-ink-3` |
| Buttons, chips, segments | ui | `--text-sm` | medium (selected segment: semibold) | |
| Body, select text | ui | `--text-md` | regular | |
| Hints, meta, lane names, dates | ui | `--text-xs`–`--text-sm` | regular / medium | `--color-ink-3` |

- **Accidentals:** always render ♭ (U+266D) and ♯ (U+266F), never `b` or `#`, in chord symbols, numerals, keys and note names (`E♭maj7`, `♭VII`). Data can store `b`/`#`; convert at render time.
- Strum glyphs: ↓ down, ↑ up, × muted, · rest. Use the ui font at `--tl-glyph`.

---

## 4. Layout

### Page order (top to bottom)

1. Top bar (sticky)
2. **Settings toolbar** ("the strip"): Key · Mode · Tempo · Meter · Feel on one compact line (§5.6). It stays short so the Loop, the hero, sits above the fold.
3. **Loop**: header, timeline, the hint line with the MIDI links, then the **lane rows** Drums · Strum · Chords, one field bar each (§5.7, §5.10)
4. **Melody**, full width
5. **Saved**, full width, under Melody. It grows with its list; Melody keeps its own height.
6. Toast (fixed, overlays)

Page content: `max-width: var(--page-max)`, centred, side padding `--page-pad`, sections separated by `--section-gap`. The lane rows belong to the Loop section, so there is no section gap between the timeline and them.

### Breakpoints

Use `@media (max-width: 959px)` and `@media (max-width: 599px)`.

| | **wide** ≥ 960 | **medium** 600–959 | **compact** < 600 |
|---|---|---|---|
| Page side padding | 40 (`--space-6`) | 24 (`--space-5`) | 16 (`--space-4`) |
| Section gap | 40 | 24 | 24 |
| Top bar | one row: brand · transport · save/link | two rows: brand + save/link, then transport | two rows; Save/Copy link icon-only |
| Settings toolbar | one line, full width, five equal fields | same | one line; Mode takes the slack; tighter fields, `--text-lg` values |
| Timeline | fits; scrolls only if steps < `--tl-step-min` | scrolls if needed | always scrolls; `--tl-label-w-compact`, `--tl-step-min-compact` |
| Lane rows | one line each: the main field takes half, the other fields share the other half | same | one line; the other fields size to their content, the main field takes the rest |
| Melody, Saved | stacked, each full width | stacked | stacked |
| Melody: Scale \| Chord tones | 2 columns | 1 column | 1 column |
| Melody with the circle *(step 10)* | 3 columns: Scale \| Chord tones \| Circle (`minmax(0,1fr) max-content var(--circle-size)`): Chord tones and the circle as wide as their content, Scale takes the rest; even `--melody-col-gap` between them, and the circle inset `--melody-inset-end` from the right edge. The Now tag keeps its room on every row, so playback doesn't change Chord tones' width | 2 columns: Scale over Chord tones \| Circle (`minmax(0,2fr) minmax(var(--circle-size),1fr)`), circle centred | 1 column: Scale, Chord tones, then the circle centred |

Must work from 360px to 1440px with no horizontal page scroll. The timeline is the only thing that scrolls sideways, and only inside its own box.

### The grid rule (no dangling items)

1. **Never use `auto-fill`, `auto-fit`, or `flex-wrap` to lay out cards, bands or strip cells.** Those are what caused v1's 3 + 3 + 1 rows.
2. The only multi-column layouts are the ones in the table above, each written with explicit columns or named areas:
   - **Settings toolbar:** `repeat(5, minmax(auto, 1fr))`; compact `auto minmax(0,1fr) auto auto auto` (Mode takes the slack and truncates first). One line at every width.
   - **Lane row:** the main field takes half and the others share the rest: `minmax(0,1fr) minmax(min-content,1fr)` (Drums), `minmax(0,2fr) repeat(2, minmax(min-content,1fr))` (Strum), `minmax(0,3fr) repeat(3, …)` (Chords), chosen by field count with `:has()`. Compact: `minmax(0,1fr)` then `grid-auto-columns: auto`. One line at every width.
   - **Melody:** Scale + Chord tones (+ Circle), with named areas.
   - **Scale:** 7 notes, `repeat(7, minmax(0,1fr))`.
3. **Layers are fields in a field bar, never cards in a grid.** Adding a layer adds a field to a bar; a bar never wraps.
4. There are exactly three lane rows (Drums, Strum, Chords), in that order, and one strip. A new layer joins one of them; it never becomes a new band.
5. Other control rows (loop controls, the hint line) are not grids. When one wraps, it wraps whole groups, and the link group stays pushed right (`margin-left: auto`), so no line looks ragged.

### Meter

Meter is a **toolbar field, between Tempo and Feel**. It shows the current meter; its menu offers `4/4 · 3/4 · 6/8` and a lock (no reroll; §5.8). It also changes the timeline grid: steps per bar and beat lines follow the meter (4/4 = 8 steps with a beat every 2; 3/4 = 6 with a beat every 2; 6/8 = 6 with a beat every 3, on the dotted-quarter pulse). The meter shows in the loop meta line. Nothing else in the layout changes.

---

## 5. Components

Every interactive element is a real `<button>`, `<select>`, `<input>` or `<a>`, and at least `--tap` (44px) in both directions. Icon-only buttons have an `aria-label`.

### 5.1 Top bar

- `position: sticky; top: 0`, background `--color-paper`, bottom border `1px solid var(--color-rule)`, padding `--space-3` vertical and `--page-pad` horizontal.
- **Brand:** "Song Seed" (title style) followed by the sync indicator: a 7px dot plus text, `--text-xs`, `--color-ink-3`.
  - `Synced`: filled dot. `This device`: hollow ring (1.5px). `Syncing…`: filled dot that pulses opacity when `--motion: 1`. The text always names the state.
- **Transport:** Play/Stop (primary), Randomize (quiet), Back, Forward (icon buttons). Back and Forward are `disabled` at the ends of history.
- **Keep:** Save, Copy link (ghost). In compact, the labels are hidden and `aria-label` remains.
- In compact, transport buttons share the row: Play and Randomize `flex: 1`, history buttons stay 44px. Below 380px, Play goes icon-only (`aria-label` "Play"/"Stop") so Randomize keeps its label.

### 5.2 Buttons

| Variant | Fill | Text/icon | Hover | Use |
|---|---|---|---|---|
| Primary | `--color-ink` | `--color-on-ink` | `--color-ink-hover` | Play/Stop, and **Add** in the import dialog (§5.17) |
| Quiet | `--color-surface` | `--color-ink` | `--color-hover` over fill | Randomize |
| Ghost | none | `--color-ink-2` | `--color-hover` | Save, Copy link |
| Icon | none, 44×44, `--radius-md` | `--color-ink-2` | `--color-hover` | history, delete |
| Danger confirm | `--color-accent` | `--color-on-accent` | none | "Tap to delete" |
| Text link | none, no padding | `--color-ink-2`, label underlined 1px `--color-line`; icon `--icon-sm` | `--color-ink`, underline `currentColor` | MIDI downloads, Import MIDI |

- Pill radius (`--radius-pill`), height `--tap`, horizontal padding `--space-4`, icon + label gap `--space-2`, `--text-sm` medium.
- `:active` → `--color-press` wash. `:disabled` → opacity 0.35, no hover.
- Play/Stop swaps its icon (triangle ↔ square) **and** its label, and sets `aria-pressed`.

### 5.3 Segmented control

- Track: `--color-surface-2`, pill, no padding. Buttons: height `--tap`, padding `0 --space-4`, `--text-sm` medium, `--color-ink-2`.
- Selected: background `--color-raised`, `--color-ink`, **semibold**, `box-shadow: inset 0 0 0 var(--seg-inset) var(--color-surface-2)`. That inset draws the pill inside the track while keeping the full 44px hit area.
- `role="group"` with `aria-label`; each button sets `aria-pressed`.
- Used for: Feel, Meter, Bars, Chord colour, Guitar/Keys, Grid, Drums Length, Strum Length, Strum Steps.

### 5.4 Chip (mute toggles)

- Pill, 1px `--color-line` outline, height `--tap`, speaker icon + label.
- On (audible): `aria-pressed="true"`, speaker with waves, `--color-ink`.
- Muted: `aria-pressed="false"`, speaker with a slash, `--color-ink-3`, label struck through.

### 5.5 Fields

- **Select:** `appearance: none`, height `--tap`, 1px `--color-line`, `--radius-md`, background `--color-field`, padding `0 40px 0 --space-3`. Chevron is an inline SVG at the right edge, `pointer-events: none`. Used in the import dialog; the toolbar and lane rows use fields (§5.6).
- **Tempo:** no slider (step 26). It drags inside its toolbar field, and its menu has a number input (`--tempo-input-w`, display font `--text-xl`, centred) for typing (§5.6).

### 5.6 Band

Surface blocks: the **settings toolbar** and the three **lane rows** (field bars), **Melody** and **Saved**. The Rhythm and Harmony bands are gone (step 23). The lane rows sit inside the Loop section, `--space-2` apart.

- **Band (Melody, Saved):** background `--color-surface`, `--radius-lg`, padding 18/12/12 (compact 16/8/8). No border, no shadow. Header: `<h2>` + optional meta (Saved: count). Melody keeps its motif (§5.12).

### Field bars *(steps 26–27)*

The settings toolbar and the lane rows are **field bars** (`.fields`, `field-bar.js`): one compact line of fields, like a DAW's LCD. Each field shows its current value; a click opens its menu. Everything below about fields and menus applies to both.

- **Every value gets the same line box** (`--value-size` × `--leading-tight`, whatever its font), so the labels line up across a bar.

### Settings toolbar *(step 26)*

It is a `<section aria-label="Song settings">` (classes `fields strip`), not sticky, with no heading.

- **Block:** `--color-surface`, `--radius-lg`, padding `--field-bar-pad`, full width. From 600px the grid is `repeat(5, minmax(auto, 1fr))`: the fields share the width, each at least as wide as its content (room for more fields later). In compact it's `auto minmax(0,1fr) auto auto auto`, so Mode takes the slack. One line at every width.
- **Corners:** the end fields' outer corners use `--field-bar-inner-radius` (`--radius-lg` less `--field-bar-pad`), so their hover, press and hatch sit concentric with the block.
- **Field:** a `<button>` per setting, min height `--field-h`, padding `0 --field-pad-x` (compact `--field-pad-x-compact`), a 1px `--color-rule` hairline between fields. It shows:
  - the **value**, display font `--text-xl` (compact `--text-lg`), `--leading-tight`, ellipsis if it must;
  - under it the **label**, caps (`--text-xs`, compact `--text-2xs`, semibold, `--tracking-caps`, `--color-ink-3`), then a closed lock when locked, then a cue (`--icon-xs`): chevron-down ("click to choose"), or chevrons-up-down on Tempo ("drag").
  - Hover `--color-hover`, press `--color-press`. The field whose menu is open gets the `--ed-open-ring` ink ring, as a timeline cell does. A locked field gets `var(--pattern-hatch)`.

| Field | Value | Label | Menu | Reroll |
|---|---|---|---|---|
| Key | `E♭` | KEY | 12 keys, `repeat(6, …)` | yes |
| Mode | `Dorian` (the mode's own name) | MODE | 7 modes, name over its mood, `repeat(2, …)` | yes |
| Tempo | `112` | BPM | number input, "BPM", the drums' range | yes |
| Meter | `4/4` | METER | 4/4 · 3/4 · 6/8 | no |
| Feel | `Straight` | FEEL | Straight · Swing | no |

- **Menu:** the timeline menus' look (§5.18): `--color-raised`, 1px `--color-line`, `--radius-md`, items at least `--menu-item-h`. It opens under its field, inside the toolbar (compact: the toolbar's full width), above the Loop. The choices come first (current one checked), then a line with **Lock** (lock icon, "Lock" / "Locked", `menuitemcheckbox`) and **Reroll** (dice, disabled while locked). That actions line is a **footer tray**: a 1px `--color-rule` hairline across the menu's full width, on `--color-surface`, with the menu's bottom corners (`--menu-inner-radius`), so the actions read apart from the choices. Menus with no actions (Length, Steps) have no tray. A pick closes the menu; Lock and Reroll keep it open, so you can reroll again. Arrow keys, Escape and a tap outside work as in §5.18.
- **Tempo** drags: a press that moves more than `--drag-slop` becomes a drag, one BPM per `--tempo-drag-step` (up is faster), with `cursor: ns-resize` and `touch-action: none`. A press without a move opens its menu, where the number input takes focus with its text selected; Enter or leaving it commits. With the field focused, Up and Down change it by 1 (Shift: 5). Escape during a drag puts it back. One history entry per drag, key hold or typed value.
- **The drums' tempo range** ("Drums 70–92", or "…, outside") is in Tempo's menu, beside the number, and in the field's tooltip. It's the input's `aria-describedby`.
- The Loop meta line still shows bars · meter · BPM · feel.

### 5.7 Lane rows *(step 27)*

Drums, Strum and Chords sit under the timeline, inside the Loop section, each a field bar (§5.6) with the toolbar's model: every value shows, a click changes it. `<section class="fields is-lane" aria-label="{Lane}">`; `lane-bars.js` fills and wires them.

- **The main field** comes first and takes half the row: the pick (the groove's id, the strum's glyphs, the progression's id; **Custom** or **Generated** when nothing matches). Its label is the row name. Its value is the ui font, `--text-md` medium (strum glyphs at `--tl-glyph`), since ids are machinery (§1.3).
- **Its menu** (`is-wide`: `--list-menu-w`, the bar's full width in compact) is a scrolling list (`--menu-list-max-h`) of the library in labelled groups, built-ins first, then My items, the current one checked; then the actions line.
- **The other fields** share the row's other half equally, each at least as wide as its content (if that's more than its share, the main field gives way). In compact they're as wide as their content and the main field takes the rest. Their menus are a grid of choices, then a lock for layers that have one.

| Row | Main field's list | Actions | Other fields |
|---|---|---|---|
| **Drums** | grooves in the meter; My grooves | Lock · Reroll · Start over · Import · Add to library / Remove *(step 24)* | **Length** `1 · 2 · 4 · 8` bars |
| **Strum** | strums in the meter, as glyphs; My strums | Lock · Reroll · Start over · Add to library / Remove | **Length** `1 · 2` bars · **Steps** `8ths · 16ths` |
| **Chords** | progressions in the key's mode (only those that fit a locked Bars or Count), id over its chart (display italic); My progressions | Lock · Reroll · Start over · Import · Add to library / Remove *(step 24)* | **Bars** `2 · 4 · 8` + Lock · **Count** (the counts that fit) + Lock · **Colour** `Plain · Some · Lots` + Lock + Reroll |

- **Actions** keep the menu open (so Reroll can roll again); a pick closes it. Start over is disabled when nothing has changed or its source is gone. Add to library is disabled when the pattern is already in a library.
- **Remove** shows only while the pick is an unchanged My item. Two taps: the first turns it into the danger pill "Tap to remove" (`--color-accent`), which reverts after 3s or when the menu closes; the second removes it, with the toast "Removed".
- **Import** closes the menu and opens the import dialog fixed to the row's kind (§5.17); focus comes back to the row's main field.
- **Length** and **Steps** have no lock: they're part of the pattern, which the row's own lock covers.
- **Locked:** the field gets the hatch and a lock in its label (§5.8); a locked Drums, Strum or Chords also marks its timeline lanes (§5.10).
- Behaviour is unchanged from SPEC: Bars and Count are blocked with a toast while Progression is locked; Steps 16ths → 8ths drops strokes with a toast.

### 5.8 Lock, reroll and the locked state

- **Lock** = this layer is left alone by Randomize. You can still edit it by hand.
- **Where:** every lock and reroll is in its field's menu (§5.6, §5.7), on the actions line: **Lock** (lock icon, "Lock" / "Locked", `menuitemcheckbox`, closed shackle when checked), then **Reroll** (dice, disabled while locked). Step 25's pairs are gone (step 27).
- **Lock-only layers** (step 25): Meter, Feel, Bars and Count have a lock and no reroll, because picking another value already does what their reroll did. Randomize still rolls them while unlocked.
- **Locked layer**, everywhere:
  1. hatch (`var(--pattern-hatch)`) on its field, and on its timeline lanes (§5.10);
  2. a closed lock (`--icon-xs`, `--color-ink`) after the field's label, and its accessible name ends ", locked";
  3. "Locked" on the menu's Lock, and the reroll disabled (where there is one).
- Reroll on an unlocked layer rerolls only that layer. It pushes to history like Randomize does.

### 5.9 Chord chart (bar lines)

**Removed in step 23.** The timeline's chord lane shows the chords with their lengths, and on a phone the Melody band's Chord tones lists them. Remove the chart markup and styles, and the `--chart-*` tokens. Don't reintroduce a run of chord names anywhere (§9).

### 5.10 Loop / timeline

The most important and most beautiful part of the page. It sits directly on `--color-paper` with no block. *(Steps 20–22 make it editable: menus, drags, repeats and the Grid control are in §5.18.)*

**Header:** `<h2>Loop</h2>` · meta (`{bars} bars · {meter} · {bpm} BPM · {feel}`) · controls aligned right: **Grid** `8ths · 16ths` (§5.18), the mute chips for Chords and Drums, then the Guitar/Keys segmented control. In compact, the controls drop to their own line (`margin-left: 0; width: 100%`). The header holds only playback and view controls; layer controls live in the settings toolbar and the lane rows.

**Grid:** one CSS grid shared by every lane, so everything lines up.

```
.tl  grid-template-columns: var(--tl-label-w) repeat(var(--tl-steps), minmax(var(--tl-step-min), 1fr));
     grid-template-rows: var(--tl-ruler) var(--tl-chord) var(--tl-strum) repeat(3, var(--tl-lane));
     border-right: 1px solid var(--grid-bar);
```

Set `--tl-steps` inline from JS (bars × steps per bar). The wrapper `.tl-scroll` has `overflow-x: auto`. The inner box is `position: relative`, with `min-width: calc(var(--tl-label-w) + var(--tl-steps) * var(--tl-step-min))`.

**Rows, top to bottom:** ruler · Chords · Strum · Cymbal · Snare · Kick.

- **Lane names:** first column, `--text-xs` medium `--color-ink-3`. `position: sticky; left: 0; background: var(--color-paper)` so they stay put while the grid scrolls.
- **Cells:** `border-left: 1px solid var(--grid-step)`; beat starts `--grid-beat`; bar starts `--grid-bar`. Marks are centred in the cell.
- **Ruler:** bar numbers (display italic `--text-sm`, `--color-ink-3`) at each bar start; other ruler cells have no lines.
- **Chord blocks:** `<button>` spanning `grid-column: span {steps}`. Margins of `--tl-gap` keep a visible gap between blocks. Fill `--lane-chord`, text `--lane-chord-ink`, `--radius-sm`, padding 6×10. Symbol on top, numeral below. `aria-label="Hear {chord}"`. Clicking auditions the chord. `:active` darkens with `--color-press`.
  - **Current chord** (while playing): `--lane-chord-now` fill **plus** an inset top bar `box-shadow: inset 0 var(--tl-chord-now-bar) 0 var(--color-ink)`.
- **Strum lane:** glyphs `↓ ↑ ×` in `--lane-strum`; rests `·` in `--lane-rest`.
- **Drum lanes:** hit marks use `background: currentColor` and set `color` to the lane colour.

| Mark | Normal | Accent | Ghost |
|---|---|---|---|
| Cymbal | `--hit-cymbal` square, `--hit-cymbal-radius`, `--lane-cymbal` | `--hit-cymbal-acc` | outline `--hit-ghost-ring`, no fill |
| Snare | `--hit-drum` square, `--hit-radius`, `--lane-snare` | `--hit-drum-acc` | outline |
| Kick | `--hit-drum` square, `--hit-radius`, `--lane-kick` | `--hit-drum-acc` | outline |

Accent = bigger, ghost = outline, cymbal = smaller, so the marks never rely on colour alone.

**Locked lanes.** When a layer that owns timeline lanes is locked, those lanes show it:

| Lock | Lanes |
|---|---|
| Drums | Cymbal, Snare, Kick |
| Strum | Strum |
| Progression | Chords |

- Every cell in a locked lane gets `background: var(--pattern-hatch)`, repeats included. Chord blocks layer it over their fill (`background: var(--pattern-hatch), var(--lane-chord)`); the hatch is faint enough that symbols stay readable.
- The lane name gets a closed-lock glyph after it (`--icon-xs`, `--color-ink`, `aria-hidden`), and its accessible name becomes "{lane}, locked".
- Locked lanes stay editable by hand (SPEC). Bars, Count and Colour locks don't mark any lane.

**Playhead:** an absolutely positioned layer over the step columns (`left: var(--tl-label-w); right: 0; top: 0; bottom: 0; pointer-events: none`). The line is `--tl-playhead-w` wide in `--playhead`, with a round head (`--tl-playhead-head`) at the top of the ruler. Position it with `transform: translateX()` from the audio clock on each animation frame (§7). It is only rendered while playing.

**Auto-follow (when it scrolls):** while playing, keep the playhead in view by scrolling the box (smooth over `--dur-slow`; instant when `--motion: 0`). Pause auto-follow for 3s after the user scrolls the timeline by hand.

**Below:** hint "Click a chord to hear it · Space plays and stops · R randomizes" (`--text-xs`, `--color-ink-3`, margin-top `--space-3`).

**Below, right:** MIDI downloads as two text links (§5.2), download icon + **Drums.mid** / **Chords.mid**, `--space-4` apart (`role="group"`, `aria-label="Download MIDI"`). They sit on the hint's line, right-aligned (`margin-left: auto`). In compact they drop to their own line, left-aligned. They are not in the loop header, which holds only playback controls.

*(step 18)* **Import MIDI** is a third text link, upload icon + **Import MIDI**, placed before the downloads on the same line, `--space-4` apart, outside their `role="group"`. It opens the import dialog (§5.17) for a mixed batch. In compact it leads the dropped line; the three links fit at 360px. The Drums and Progression rows have their own **Import** (§5.7); this one stays for dropping a mix of files at once.

### 5.11 Melody band

- Header: Melody + motif. Nothing in it is rolled, so it has no lock or reroll.
- **Scale:** 7 tiles in `repeat(7, minmax(0,1fr))`, gap 6 (compact 3). They never wrap. Each tile is `--color-field`, `--radius-md`, min-height 56, with the note name (display `--text-xl`) above its degree (`--text-xs`, `--color-ink-3`, e.g. `♭6`). Tiles are not interactive.
  - **Colour note:** inset 2px `--color-accent` ring **plus** a 6px accent dot top-right, **plus** a hint below the scale naming it ("Ringed: E♭, the ♭6, the colour note of Aeolian").
- **Chord tones:** list; each row has the symbol (display `--text-lg`, 84px column), then the notes (`--text-sm`, `--color-ink-2`, word-spacing 6px). The current chord (while playing) gets `--lane-chord-now` **plus** a "Now" tag (10px semibold caps, `--color-on-ink` on `--color-ink`, `--radius-xs`).
- **Circle of fifths** *(step 10)*: hand-written inline SVG built in `app.js`, `role="img"`, not interactive. `--circle-size` across (about 200px), scaling down with `width: min(100%, var(--circle-size))` so it fits at 360px.
  - One thin ring (1px `--color-rule`) with the 12 notes placed on it, C at the top, going clockwise in fifths. Each note is a small circle (`--circle-note-r`) holding its name (display font `--text-md`, ♭/♯ as everywhere else).
  - **Scale note:** filled `--color-field`, text `--color-ink`. **Outside the scale:** no fill, text `--color-ink-3`.
  - **Tonic:** a heavier ring (`--circle-tonic-ring`, `--color-ink`) around its note.
  - **Colour note:** marked as on its scale tile: inset `--colour-ring` `--color-accent` ring **plus** a `--colour-dot` accent dot.
  - **Chord root:** a dot (`--circle-dot`, `--color-ink-2`) just outside the ring beside each note that roots a chord in the loop.
  - **Current chord** (while playing): its root's note gets `--lane-chord-now` fill **plus** its dot grows to `--circle-dot-now`. It changes in the same frame as the timeline and chord-tones highlights.
  - Meaning never rests on colour: fill vs no fill, ring weight, and dots carry it.
  - **Key** *(step 28)*: a list under the circle, `--space-3` below it and as wide as it (`min(100%, var(--circle-size))`; centred with it in compact). One line per mark, gap `--space-1`: a `--cof-key-swatch` swatch, then the text (`--text-xs`, `--color-ink-2`), gap `--space-2`. Each swatch is the circle's own mark drawn with the same classes, so it matches in both themes: the tonic's ringed disc, a scale note's filled disc, the colour note's accent ring and dot, and a chord-root dot. Lines: "Tonic: G" · "In the scale" · "Colour note: E♭, the ♭6" (none in Ionian) · "Chord roots in the loop". Swatches are `aria-hidden`; the text is read as a list labelled "Circle of fifths key".
  - New tokens (`--circle-size`, `--circle-note-r`, `--circle-tonic-ring`, `--circle-dot`, `--circle-dot-now`, and `--cof-key-swatch` from step 28) go in `tokens.css`. They are sizes only, so they're the same in light and dark; the colours reuse existing tokens.

### 5.12 Motifs (band heading texture)

Small fixed SVGs, 72×20, `aria-hidden`, stroke `--color-ink-3` at 1px, round caps. They are hand-drawn and never data-driven.

- **Melody:** a contour of dots, filled `--color-ink-3`, r 1.6 (r 2.2 at the peak and the low point): cx 3…69 every 6, cy `14 10 8 10 6 3 8 12 10 14 17 12`.

### 5.13 Saved band

- Header: Saved + count (meta style).
- List of ideas, newest first, divided by `--color-rule`. Each row is:
  - a **load button** (`flex: 1`, min-height 60, left-aligned) containing the fingerprint, then the name (display `--text-lg`) over the date (`--text-xs`, `--color-ink-3`, e.g. "Oct 31");
  - a **delete** icon button (trash).
- **Name:** auto-generated as `{Key} {mode} · {bpm} · {groove word}` (e.g. "E♭ Phrygian · 131 · motorik").
- **Two-tap delete:** the first tap replaces the trash icon with a danger-confirm pill "Tap to delete" (trash icon + text). A second tap deletes it and shows the toast "Deleted". The pill reverts after 3s, on Escape, or when focus or a tap goes elsewhere. Only one row can be confirming at a time.
- **Empty:** "Nothing saved yet. Press Save to keep an idea." (`--text-sm`, `--color-ink-3`, padding `--space-3`).

**Fingerprint** (a live drawing, unlike the motifs): an SVG `viewBox="0 0 64 32"`, rendered at `--fp-w`×`--fp-h` with `--fp-pad` padding on `--color-field`, `--radius-sm`, `aria-hidden`, no fill, round caps.

- *Drums (bottom):* the first 2 bars (or 1 bar repeated) as 16 slots, `x = 3 + i × 3.87`. One vertical stroke per slot, choosing the strongest hit in that slot: kick `M x 30 V 18` (stroke `--lane-kick`, 2.4), snare `V 22` (`--lane-snare`, 2.4), cymbal `V 26` (`--lane-cymbal`, 1.6). Empty slot: nothing.
- *Chords (top):* a stepped path of chord roots. Each chord holds horizontally for its share of the loop across x 2→62. `y = 15 − (scaleDegree − 1) × 2`; draw it as `M x0 y H x1 V y' H x2…`. Stroke `--color-ink-2`, 1.6.

### 5.14 Toast

- `position: fixed`, centred, `bottom: calc(var(--space-5) + env(safe-area-inset-bottom))`. Pill, height `--tap`, `--color-ink` / `--color-on-ink`, `--text-sm` medium, check icon, `box-shadow: var(--shadow-toast)` (the only shadow in the app).
- `role="status"`. Stays for `--toast-hold`, then fades out. Fades in and out over `--dur-base`; with reduced motion it simply appears and disappears.
- Messages are short past tense: "Saved", "Link copied", "Deleted", "Nothing to undo".

### 5.15 Icons

Inline SVG, `viewBox="0 0 24 24"`, `width/height: var(--icon)`, `fill: none; stroke: currentColor; stroke-width: var(--icon-stroke); stroke-linecap/linejoin: round`. Filled details (dice pips, play triangle, stop square) use a `.f` class with `fill: currentColor; stroke: none`. Always `aria-hidden="true"`; the button carries the label. Set: play, stop, shuffle, undo, redo, bookmark, link, lock (two shackles), dice (3 pips), speaker / speaker-off, trash, check, chevron-down, download, plus. *(step 18)* Add upload (Lucide `upload`) and x (Lucide `x`).

### 5.16 Strum row *(step 14; was the step 12 editor panel)*

*(Step 23. Steps 14 and 22 history: the steps line went in step 22, and strums are edited in the Loop's strum lane, §5.18.)*

*(Step 27: the Strum row is a field bar, §5.7.)* Its main field shows the pattern's glyphs; its menu lists the built-in strums, then My strums (none checked when the pattern matches no entry). The fit score isn't shown; it still drives the randomizer.

- **Add to library** (plus icon) saves the pattern to My strums, with the toast "Added to My strums". It's `disabled` when the pattern is already in either library.
- **Remove** (trash icon) replaces Add to library while the pattern is an unchanged My strum, with the two-tap confirm of §5.7.
- **Start over** (undo icon) is disabled when nothing has changed or its strum is gone.
- **Stroke menu:** unchanged from step 22; it opens from strum-lane cells only (§5.18).

### 5.17 Import dialog *(step 18)*

Opened by **Import MIDI** (§5.10) or by dropping `.mid` files on the page (desktop), both **mixed**; or by **Import** on the Drums or Progression row (§5.7), with the kind **fixed** to that row's. What it does is in SPEC §1, "Import MIDI".

- **Dialog:** native `<dialog>`, `--color-surface`, `--radius-lg`, padding as a band (§5.6), width `min(var(--dialog-w), 100% - 2 × var(--page-pad))`, max height `calc(100dvh - 2 × var(--page-pad))`. No border and **no shadow**: the `::backdrop` is `--color-scrim`, which separates it from the page. Only the toast keeps a shadow.
- **Header:** `<h2>` "Import MIDI" (section heading style; fixed: "Import grooves" / "Import progressions"), then an icon button (x, `aria-label="Close"`) pushed right.
- **Drop zone:** full width, min height `--drop-h`, `--color-field`, 1px dashed `--color-line`, `--radius-md`, centred content: upload icon, "Drop .mid files here" (`--text-sm`, `--color-ink-2`), and a ghost **Choose files** button. Drag-over: `--color-hover` wash, the outline goes solid, and the text reads "Drop to import". Once files are in, it shrinks to one line ("Drop more files, or Choose files") above the list.
- **Review list:** scrolls inside the dialog; the header, drop zone and footer stay put. Rows are divided by `--color-rule`, like Saved (§5.13), and stay **one line where it fits** (the compact-row rule):
  - **line 1:** kind select (mixed only; Groove · Progression, a small select, not the display font) · id (ui `--text-sm`, ellipsis if long) · summary (`--text-sm`, `--color-ink-2`; progression chords in the display font with ♭/♯) · Key select (progressions only, display font `--text-md`) · remove icon button (x), pushed right.
  - **line 2, only if needed:** warnings and errors as a hint (`--text-xs`, `--color-ink-3`), one sentence each, joined with " · ". When the kind is fixed, a file that reads as the other kind warns here ("This looks like a chord file").
  - In compact, line 1 wraps after the id: kind (if shown) · id · remove on top, then summary and Key select full width. Every control is still ≥ 44px.
- **Footer:** right-aligned, Cancel (ghost) then **Add N** (primary, e.g. "Add 3"). Add is `disabled` when nothing can be added. "N" counts only rows that can be added.
- **Empty and error states:** no files yet = the full drop zone only. A file that can't be read gets a row with its filename and the reason ("Not a MIDI file", "Already in your library"); it has no Key select and isn't counted.
- **New tokens** (add to `tokens.css` in step 18): `--color-scrim` (light: ink at about 35% opacity; dark: black at about 55%), `--dialog-w` (about 640px), `--drop-h` (about 120px). Sizes are the same in light and dark.

### 5.18 Editing the loop *(steps 20–22)*

The timeline (§5.10) becomes editable: chord blocks, drum cells and strum cells open small menus, and with a mouse or pen, chord edges and drum hits can be dragged. What it does is in SPEC §1, "Editing the loop". It still sits on paper with no block, and it gains no borders or shadows.

**Sizes.** Strum and drum lanes grow to `--tap` tall (`--tl-strum` and `--tl-lane` become 44px). In compact, `--tl-step-min-compact` becomes 44px, so every cell is a full tap target and the timeline scrolls further. Wide and medium keep fluid steps (min `--tl-step-min`), sized for a mouse. That is the one place a control may be narrower than 44px, and only where a pointer is fine.

**Cells are buttons.** Every chord block, strum cell and drum cell is a `<button>`. Each lane is one Tab stop, with a roving `tabindex`: Left and Right move along the lane, Home and End jump to its ends, and Enter or Space opens the cell's menu. (Space still plays and stops everywhere else.) Hover and press use the wash overlay, as chord blocks do today. The cell whose menu is open gets an inset `--ed-open-ring` `--color-ink` ring, like the Strum row's open step.

**Menus.** One look for all three, the stroke menu's from §5.16: `--color-raised`, 1px `--color-line` outline, `--radius-md`, no shadow, no entrance animation. Items are at least 44 × 44 (min height `--menu-item-h`). Each shows a glyph or symbol over a name (`--text-xs`). The current choice has a `--color-surface-2` fill **plus** a semibold `--color-ink` name. Disabled items stay in place at `--opacity-disabled`, so the menu never changes shape. Arrow keys move, Escape closes and refocuses the cell, and a tap outside closes it.
- **Placement:** in wide and medium, the menu opens under its cell, centred, and is kept inside the Loop section (not the scroll box, so it's never clipped). In compact, it spans the Loop section's full width, under the lane.

**Chord menu.** Four groups, top to bottom, `--space-2` apart. Each group has a caps label (`--text-xs` semibold, `--color-ink-2`) above its items.

| Group | Items | Columns |
|---|---|---|
| Mode | the mode's 7 chords: symbol (display `--text-md` medium) over numeral (display italic `--text-xs`, `--color-ink-2`) | `repeat(7, minmax(0, 1fr))`, gap 0 |
| Borrowed | up to 7, same item as Mode; the line may end short: these are a menu's fixed columns, not a layout, so §4's grid rule doesn't apply | the same 7 columns, so items line up |
| Extension | Auto · 7 · maj7 · sus2 · sus4 · add9 · 6 · 9 (ui `--text-sm` medium, no second line) | `repeat(4, minmax(0, 1fr))`, two lines |
| Actions | Shorter · Longer · Split · Delete: icon over name (minus, plus, scissors, trash) | `repeat(4, minmax(0, 1fr))` |

- Seven columns with no gap fit a 360px screen (328px ÷ 7 ≈ 47px). Items are separated by their own padding, and the current one by its fill.
- The current chord is marked in Mode or Borrowed (or in neither, when it's a chord from outside both). The current extension is marked in Extension.
- Delete isn't danger-coloured, because Back undoes it. Only removing from a library uses the accent pill.
- Opening the menu plays the chord, and so does each pick, so you hear it as you choose.

**Chord edges** (mouse and pen only, `@media (hover: hover) and (pointer: fine)`). Each edge between two blocks has a hit zone `--tl-edge-hit` wide, centred on the edge and the chord lane's height, with `cursor: col-resize`. On hover, a `--tl-edge-w` bar in `--color-ink` appears on the edge. While dragging, the bar follows the pointer, snapped to the pulse, and both blocks resize live (their `grid-column` spans change). Nothing else moves. Letting go commits the change, and Escape puts the edge back. The loop's last edge has no handle. There's no handle on touch, where the menu's Shorter and Longer do the job.

**Drum cells.**
- An empty cell on hover shows the mark it would add as a 1px `--color-line` outline at normal size. A click adds the hit.
- A hit opens the **hit menu**: Accent · Hit · Ghost · Delete · Earlier · Later, in one line (`repeat(6, minmax(0, 1fr))`). Accent, Hit and Ghost show their own mark (§5.10's sizes, in `--color-ink`). Delete shows the trash icon, and Earlier and Later show arrow-left and arrow-right. Earlier and Later are disabled when the next step that way is taken or past the loop's end.
- **Drag** (mouse and pen only): pressing on a hit and moving it more than `--drag-slop` starts a drag. The mark follows the pointer along its lane, snapped to the empty cells of the grid. Over a taken cell, it stays at the last free one. Letting go commits, and Escape puts it back. A press without a move opens the menu.

**Strum cells** open the §5.16 stroke menu (↓ Down · ↑ Up · × Mute · · Rest, with D / U / X / . as keys). From step 22, that menu lives only here.

**Repeats.** Cells past a pattern's length are its repeats (SPEC §1). They take two signals:
- **Lighter:** drum marks in repeats are drawn at `--repeat-opacity`, and strum glyphs in repeats use `--lane-rest` (which keeps text contrast).
- **A repeat line:** the cell where each repeat starts gets `border-left: var(--repeat-line)` (2px dashed `--grid-bar`) in that lane, in place of its bar line. Dashed versus solid carries the meaning, not colour.

Repeats are as editable as the pattern itself: editing one edits the pattern, and every repeat redraws at once. Groove and strum lengths can differ, so the drum lanes and the strum lane each draw their own repeat lines.

**Grid control.** A segmented **8ths · 16ths** (§5.3) leads the Loop header's controls, before the mute chips (`aria-label="Grid"`). While anything sits on a 16th, 8ths is `disabled`, with the title "Hits on 16ths". It's a view control, not a layer, so it has no lock or reroll.

**Rows that change:** the lane rows of §5.7 hold everything that used to be on the Drums, Strum and Progression rows: Length, Steps, Start over, Remove, Import and Add to library (in field menus from step 27). Grid stays in the Loop header.

**New tokens** (add to `tokens.css` in the step that first uses them; sizes, the same in light and dark):
- `--tl-strum` and `--tl-lane` → 44px; `--tl-step-min-compact` → 44px (step 21)
- `--menu-item-h` 52px, which replaces `--ed-step-h` (step 20; `--ed-step-h` goes in step 22)
- `--tl-edge-hit` 12px, `--tl-edge-w` 2px (step 20)
- `--drag-slop` 4px: pointer travel before a press becomes a drag (step 20)
- `--repeat-opacity` 0.5, `--repeat-line` `2px dashed var(--grid-bar)` (step 21; it follows dark mode through `--grid-bar`)

Icons (§5.15): add Lucide `minus`, `scissors`, `arrow-left` and `arrow-right` in step 20 (arrows used in step 21).

---

## 6. States

| State | Signal 1 | Signal 2 (non-colour) |
|---|---|---|
| Hover | `--color-hover` wash | cursor pointer |
| Focus | 2px `--color-focus` outline, 2px offset (`:focus-visible` only) | — |
| Pressed/selected segment | `--color-raised` fill | semibold weight, inset pill shape |
| Disabled | opacity `--opacity-disabled` | `disabled` attribute, no hover |
| Locked layer | hatch on its field | closed lock after the field's label, "Locked" in its menu, reroll disabled |
| Locked lane in the timeline | hatch on its cells | closed-lock glyph after the lane name, "{lane}, locked" |
| Field with its menu open *(steps 26–27)* | — | inset `--ed-open-ring` ink ring, `aria-expanded="true"` |
| Remove waiting for its second tap *(step 27)* | accent pill | "Tap to remove" |
| Playing | Play shows Stop | icon swap + label, playhead visible |
| Current chord | `--lane-chord-now` | ink top bar (timeline), "Now" tag (chord tones), bigger root dot (circle of fifths) |
| Muted lane | `--color-ink-3` | strikethrough + speaker-off icon |
| Colour note | accent ring + dot | hint text names it |
| Delete / remove confirm | accent pill | label "Tap to delete" / "Tap to remove" |
| Files dragged over the drop zone *(step 18)* | `--color-hover` wash | outline goes solid (from dashed), text changes to "Drop to import" |
| Import row that can't be added *(step 18)* | — | reason in text, no Key select, not counted in **Add N** |
| Timeline cell with its menu open *(steps 20–22)* | — | inset `--ed-open-ring` ink ring, `aria-expanded="true"` |
| Chord edge, hover or dragging *(step 20)* | — | `--tl-edge-w` ink bar, `col-resize` cursor |
| Repeat of a pattern *(steps 21–22)* | lighter marks / rest-coloured glyphs | dashed repeat line where each repeat starts |
| Sync | — | text: Synced / This device / Syncing… plus dot shape |

---

## 7. Motion

- What moves: the playhead, timeline auto-scroll, the toast, and colour/weight transitions on hover, press and segment change. Nothing else animates. No entrance animations, no bouncing, no parallax.
- Transitions use `var(--dur-fast)` / `var(--dur-base)` with `var(--ease)`. Under reduced motion these tokens are 0, so CSS transitions turn off with no extra code.
- **Playhead:** JS reads `getComputedStyle(document.documentElement).getPropertyValue('--motion')`.
  - `1`: update `translateX` every animation frame from the audio clock (a continuous sweep).
  - `0`: move it **once per beat**, with no transition. It is still visible, so position is still shown.
- The current-chord highlight changes on the chord boundary with a `--dur-fast` background transition (instant under reduced motion).

---

## 8. Accessibility checklist

- All text meets 4.5:1 on its background in both themes (verified for the token pairs used here; `--color-ink-3` on `--color-surface-2` is 4.38:1, so that pair is banned). Field and chip outlines (`--color-line`) are ≥ 3:1.
- Every control is ≥ 44×44 (`--tap`) (fields have `min-width: var(--tap)`; segment buttons too). Scale tiles are not controls.
- Keyboard: Space plays/stops and R randomizes, but neither fires while focus is in an input, select or textarea. Tab order follows the visual order: every field is one Tab stop, left to right, bar by bar; Enter opens its menu, and Escape closes it and refocuses the field. Escape cancels a delete confirm.
- `aria-pressed` on Play, mute chips, segments and lock buttons; `aria-label` on every icon-only button; decorative SVGs have `aria-hidden`.
- The timeline region has `aria-label="Loop"`.
- The settings toolbar is `<section aria-label="Song settings">`. Each field's name says its value ("Key: E♭", "Tempo: 112 BPM", plus ", locked"), with `aria-haspopup` and `aria-expanded`. Its menu is `role="menu"`, or `role="dialog"` for Tempo (it holds an input). Each lane row is a `<section aria-label="{Lane}">`; its fields name themselves the same way ("Drums: groove_lofi_01", "Chord count: 4, locked"). Locked lane names in the timeline read '{lane}, locked'.
- *(step 18)* The import dialog is a native `<dialog>` opened with `showModal()`, `aria-labelledby` its heading. Escape and Cancel close it; focus goes back to the link that opened it (on a page drop, to Import MIDI). After a row import that picks a file, focus goes to that row's select instead. The row links are labelled for their row: `aria-label="Import grooves from MIDI"` / `"Import progressions from MIDI"`. The drop zone's **Choose files** is a real button over a hidden file input, so it works without dragging. Each review row's remove button has `aria-label="Remove {id}"`.
- *(steps 20–22)* Each timeline lane is one Tab stop (roving `tabindex`; Left/Right, Home/End move, Enter or Space opens the menu). Cells name themselves: "Am, bar 2, 2 beats", "Kick, bar 1, beat 3: hit", "Strum, bar 1, and: up"; repeats add ", repeat". Every drag has a menu equivalent (Shorter / Longer, Earlier / Later), so nothing needs a pointer. Menus use `role="menu"` with `menuitemradio` for choices and `menuitem` for actions.
- The circle of fifths is `role="img"` with an `aria-label` that says what it shows, e.g. "Circle of fifths: D Dorian, scale notes C D E F G A B, chords on D G C".

---

## 9. Don'ts

- Don't add borders or shadows to blocks, rows or cards.
- Don't use colour for buttons beyond ink and the delete confirm.
- Don't use `auto-fill`, `auto-fit` or wrapping flex for cards, bands or toolbar fields. The toolbar never wraps.
- Don't put a slider or an always-open choice list in the toolbar: show the value, change it from its menu (or drag Tempo).
- Don't write chords as a space- or comma-separated run. They appear as timeline blocks, or one per row in Chord tones.
- Don't use `b`/`#` for accidentals.
- Don't put the timeline inside a block; it sits on paper.
- Don't put locks, rerolls or row actions anywhere but their field's menu, and don't bring back the Locked tag.
- Don't make the motifs data-driven. Fingerprints are the data-driven drawings.
- Don't use emoji, gradients (other than the hatch pattern) or tilted cards.
