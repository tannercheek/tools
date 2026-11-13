# Song Seed — Spec

Rolls the starting settings for a new indie song (key, mode, tempo, feel, drum groove, strum pattern, chord progression and chord colour), plays them back as a loop, and saves the ones worth keeping.

It follows my writing process: drums → tempo → chords → strum → let it cook → melody. The app handles everything up to the melody. The melody stays mine; the app only gives reference notes.

**Status:** v1 built (one loop, synthesized placeholder sounds). 3/4 and 6/8 added in PLAN step 6. Import MIDI in the app added (PLAN steps 15–18). Editing the Loop in place, and a mini-DAW layout, planned (PLAN steps 19–23).

---

## 1. What it does

### Layers
Each layer has a **lock**, and most have a **reroll** (dice) button. You can also set any layer by hand. *(step 25)* Meter, Feel, Bars and Chords (count) are lock-only: tapping another value already does what their reroll did, so it was left out. Randomize still rolls them while they're unlocked.

| Layer | Set by hand | Rolled from |
|---|---|---|
| Key (tonic) | select, 12 keys | weighted: C, D, E, G, A ×2 |
| Mode | select, 7 modes | weighted per mode (Locrian rare). Follows the chords if Chords is locked |
| Tempo | drag the field up or down, arrow keys, or type in its menu; 40–220 *(step 26)* | inside the current groove's `tempo` range |
| Meter | 4/4 · 3/4 · 6/8 | weighted 8/1/1 (4/4 most of the time). Follows a locked Drums or Strum |
| Feel | Straight / Swing | 75% straight; swing amount 0.55 |
| Drums | select a groove, or edit its hits in the Loop *(step 21)* | grooves matching the meter; prefers ones whose range fits a locked tempo |
| Strum | select (shows arrows), or tap the steps to edit the pattern in place *(step 14; in the Loop's strum lane from step 22)* | built-in strums and My strums in the meter: top half by fit with the groove, weighted by score |
| Bars *(step 9)* | 2 · 4 · 8 | read from the progression (see below) |
| Chords *(step 9)* | select: the counts that fit the bars | read from the progression (see below) |
| Progression | select a library progression, or edit its chords in the Loop *(step 20)* | 50% library (same mode), 50% generated. Keeps locked Bars and Chords. Labelled "Chords" until step 9 |
| Chord colour | Plain / Some / Lots | weighted 25/45/30 |

- **Randomize** (button or `R`) rerolls every unlocked layer, in this order: meter, tonic, mode, feel, groove, tempo, chords, strum, color. Order matters because later layers read earlier ones.
- A reroll avoids landing on the same choice again (the current pick gets 5% weight). Randomize rolls Meter with its plain weights, so it stays mostly 4/4.
- Locks are saved per device.

### Bars and chord count *(PLAN step 9)*
Choose how long the loop is and how many chords it has, then roll progressions inside those limits.
- Both values are **read from the progression**: Bars is the sum of `progression.bars`, Chords is `progression.chords.length`. Neither is stored on its own, so the idea shape doesn't change and old links still load.
- **Unlocked**, they follow whatever Progression rolls, with today's weights (so the 50/50 library/generated split and the 2/4/8 loop-length weights stay the same). Randomize doesn't roll them on their own.
- **Locked**, Progression rolls keep them: library picks come only from progressions with the same bars and count, and generated ones are made to fit. If no library progression matches, it's generated.
- **Set by hand:** rolls a new progression with that value fixed (the same 50/50 rule). The other value is kept if it still fits, otherwise the nearest count that fits. *(step 25: their dice are gone, since picking another value does the same.)*
- **Counts offered:** 2 up to 2 × bars (a chord is at least half a bar), capped at 8. So 2 bars → 2–4 chords; 4 or 8 bars → 2–8.
- **Picking a library progression by hand** updates Bars and Chords to match it. While Bars or Chords is locked, the Progression list shows only progressions that match.
- **A locked Progression fixes both.** Changing them by hand is blocked with a toast that says why.
- Lock ids are `bars` and `count`. The progression row's layer id stays `chords`, so saved locks keep working.
- *(step 20)* Splitting or deleting a chord in the Loop changes the count by hand, and can go past the counts offered above (a select lists the current count even when it isn't offered). A locked Chords then holds the new count. Editing never changes Bars: the loop's last edge doesn't move.

### Meter
- Grooves and strums are each written in one meter. The Drums and Strum lists show only the current meter's patterns.
- **Changing the meter** (by hand or with its dice) rerolls the groove and strum if they don't match. A locked Drums or Strum blocks the change, with a toast that says why ("Drums are locked in 6/8").
- **6/8 is compound:** beat lines, swing, the reduced-motion playhead and "on the beat" in strum fit use the dotted-quarter pulse (every 6 sixteenths). `meterInfo()` gives this as `pulse`; in 4/4 and 3/4 it's the beat.
- Progressions are in bars, so they work in every meter. Library progressions don't have a meter.
- *(step 19)* A progression is kept across a meter change. Lengths edited in the Loop can miss the new meter's grid (a third of a bar, one 3/4 beat, is 5⅓ steps in 4/4). Those edges move to the nearest pulse, a chord squeezed to nothing merges into the one before, and a toast says how many were dropped ("Dropped 1 chord"). Edges already on a whole step don't move, so half-bar progressions never change.
- Tempo is always quarter-note BPM, in every meter.

### Timeline
Chords, strum and drums are stacked on one grid with a moving playhead.
- The grid shows 8th-note columns. It switches to 16ths automatically if a groove has 16th-note hits or a strum is written in 16ths.
- Bar lines are heavier than beat lines.
- Clicking a chord block plays that chord. *(step 20: and opens its menu; see "Editing the loop".)*
- Three drum lanes, top to bottom: Cymbal, Snare, Kick. Cymbal is one generic lane for hats and rides; the loop is a starting point to finish in a DAW. *(PLAN step 13)*
- Drum hits: accent = bigger square, ghost = small outline, and cymbal marks are smaller than kick and snare. Shape carries meaning, not only colour.

### Editing the loop *(PLAN steps 19–23)*
The Loop is edited in place, like a MIDI region in a DAW: chords (step 20), drum hits (step 21) and strums (step 22). Rolling works as before, so there's simply less to set by hand. Pure logic: `progression-editor.js` and `groove-editor.js` (step 19); strums keep `strum-editor.js`.
- **History:** every pick, and every drag once you let go, is one `setIdea()`, so it's one undo step and is kept in the link, the last idea and Saved ideas. The idea shape doesn't change (still v4).
- **Locks** hold only against Randomize, as on the Strum row: a locked lane can still be edited by hand. A select, reroll or Randomize replaces the whole lane; Back brings the edits back. Setting Bars by hand still rolls a new progression, and a meter change still rerolls an unlocked groove and strum.
- **Repeats:** grooves and strums tile across the loop. Cells past a pattern's length are its repeats, drawn lighter, with a mark where the pattern ends. Editing a repeat edits the pattern, so every repeat changes. To make bars differ, lengthen the pattern first (longer repeats what's there).
- **Mouse, pen and touch:** dragging is for mouse and pen only. On touch, the menus do the same (move, shorter, longer), so a drag never fights the timeline's scroll. Lanes are 44px tall; on a phone, steps are 44px wide and the timeline scrolls further; on desktop, steps stay mouse-sized.
- **Chords** *(step 20)*:
  - Clicking a block plays it and opens its menu:
    - **Mode:** the mode's 7 chords, worked out from its scale (Dorian: i ii ♭III IV v vi° ♭VII).
    - **Borrowed:** chords of the parallel major and minor keys that aren't in the mode, without diminished ones, in degree order (Ionian: i ♭III iv v ♭VI ♭VII).
    - **Extension:** Auto · 7 · maj7 · sus2 · sus4 · add9 · 6 · 9. Auto stores the plain numeral, so Colour may still add to it at playback; anything else stores that suffix, which Colour leaves alone. A diminished chord offers only Auto and 7. Picking a chord keeps the extension, and picking an extension keeps the chord.
    - **Shorter · Longer · Split · Delete.**

    Each pick plays the new chord. Numerals stay Roman, relative to the tonic's major scale, as everywhere.
  - **Edges:** dragging the edge between two blocks moves it, snapped to the pulse (a beat in 4/4 and 3/4, the dotted quarter in 6/8). The chords on both sides change length, and every chord keeps at least one pulse. The loop's last edge doesn't move: Bars sets the length. Shorter and Longer move a chord's end by one pulse; for the last chord they move its start. Edges that sit between pulses (half bars in 3/4 from the library or generator) stay put until they're moved.
  - **Delete:** the chord before takes over its time (for the first chord, the one after does). The only chord can't be deleted.
  - **Split:** two of the same chord, cut on the pulse nearest the middle (the earlier one if tied). It needs at least two pulses, and a loop holds at most 16 chords. Change either half afterwards.
  - **Colour:** `colorize()` chooses by position, so after a Split or Delete the chords that follow may change colour. Plain colour, or a Colour reroll, settles it.
  - **Progression row:** the select shows the library entry with the same mode, chords and lengths, matched by content like grooves and strums. When nothing matches, it shows a disabled **Generated** (a rolled progression) or **Custom** (an edited one). An edit keeps a library id as `source` and turns `'generated'` into `'custom'`. Remove shows only while the progression is an unchanged My progression. **Start over** puts back the library progression it came from, and is disabled when nothing has changed or that progression is gone.
- **Drums** *(step 21)*:
  - Click an empty cell in a drum lane to add a hit. Click a hit for its menu: Accent · Hit · Ghost · Delete, then ← → to move it one step onto an empty step. Drag a hit along its lane onto an empty step.
  - Hits go on the grid the timeline shows. A **Grid** control (8ths · 16ths) sets it, and it stays on 16ths while anything sits on a 16th.
  - A track the groove doesn't have (no cymbal) is added when a hit goes on it.
  - **Drums row:** **Length** 1 · 2 · 4 · 8 bars (longer repeats what's there, shorter drops the later bars) and **Start over** (back to the groove it came from; disabled when unchanged or gone). An edited groove shows **Custom** in the select, as now, and keeps its tempo range.
- **Strum** *(step 22)*: clicking a strum-lane cell opens the Strum row's stroke menu (↓ Down, ↑ Up, × Mute, · Rest; the same keys). The lane has one cell per 8th, or per 16th for a strum in 16ths. The Strum row loses its steps and keeps the select, length, grid, Add to library / Remove and Start over.
- **Layout** *(step 23)*: the page becomes a small DAW. How it looks is DESIGN.md's.
  - A strip under the top bar holds Key · Mode · Tempo · Meter · Feel. *(step 26)* It's one compact toolbar line, like a DAW's LCD, so the Loop stays above the fold: each field shows its value, and a click opens a menu with the choices, then Lock and Reroll.
  - Under the Loop, one row per lane holds its select, lock, reroll and extras:
    - **Chords:** Progression, Bars, Chords count, Colour, Import / Remove, Start over
    - **Strum:** length, grid, Add to library / Remove, Start over
    - **Drums:** length, Import / Remove, Start over
  - A locked lane shows the hatch in the timeline too, plus a lock glyph by its name.
  - The Rhythm and Harmony bands and the chord chart go: the timeline shows the chords, and Chord tones lists them on a phone. Melody and Saved stay at the bottom.
  - Every layer keeps its lock, with the same lock ids, so saved locks keep working.
  - *(step 25)* Meter, Feel, Bars and Count lose their reroll; the "Locked" tags go.
  - *(step 27)* The Drums, Strum and Chords rows work like the toolbar: each is one line of fields showing their values (the pick, then Length, Steps, Bars, Count, Colour). A click opens a field's menu. The pick's menu lists the library, then Lock, Reroll, Start over and the row's own actions (Import, Add to library, Remove). The others hold their choices, and a lock where the layer has one. Selects and the chord-shape summary are gone; a locked layer shows a lock in its field's label.

### Playback
- Plain Web Audio API, no library. Synth drums, plus a plucked-string guitar (Karplus–Strong).
- **Guitar** plays the chords through the strum pattern. Down-strums roll low→high (12 ms per string) and up-strums roll high→low over the top 4 strings. `x` is a muted chuck that damps the strings.
- **Keys** holds each chord for its full length instead.
- Mute buttons for Chords and Drums. Space plays and stops.
- Swing pushes the off-beat 8th late by `swing × one 16th`. It works on the pulse: in 6/8 the 2nd and 3rd 8ths of each dotted quarter are pushed.
- Chord voicings are guitar-like: the bass root sits between E2 and D#3, with notes stacked upward and no minor 2nds (gives open-chord shapes for E, Am, C…).

### Melody panel
- The scale for the key and mode, with the mode's **colour note** marked (for example the major 6th in Dorian).
- The notes in each chord, highlighted in time with playback.
- *(PLAN step 10)* A **circle of fifths**: the 12 notes around one ring, C at the top, then G D A E B F♯ D♭ A♭ E♭ B♭ F clockwise (by pitch class). It shows at a glance where the key sits and which chords are borrowed.
  - Note names are spelled for the current key (D♭ major shows G♭, not F♯).
  - The mode's 7 scale notes are marked; they always form one unbroken arc of the circle. The tonic and the colour note are marked as well.
  - Every note that roots a chord in the loop gets a dot, so a borrowed chord (♭VII in Ionian) shows as a dot outside the scale arc. Roots come from the compiled chords, so chord colour doesn't change them.
  - While playing, the current chord's root is highlighted in step with the other current-chord highlights.
  - Logic is pure: `circleOfFifths(tonic, modeKey, chords)` in `theory.js` returns 12 entries in circle order, each `{ pc, name, inScale, isTonic, isColour, chordIdx }`, where `chordIdx` lists the indexes of the chords rooted on that note (empty if none).
  - *(PLAN step 28)* A **key** under the circle says what its marks mean, one line each, beside the mark itself: **Tonic: G**, **In the scale**, **Colour note: E♭, the ♭6** (left out in Ionian, which has none) and **Chord roots in the loop**. Notes are spelled for the key. The wording comes from the pure `circleKey(tonic, modeKey)` in `display.js`.

### Strum row and My strums *(PLAN step 14)*
The Strum row is the strum editor: the pattern's steps sit on the row and you edit them in place. It replaces step 12's Edit panel, which played a draft beside the idea and copied out a `strums.js` entry. *(step 22: the steps move into the Loop's strum lane; see "Editing the loop". Everything else here stays.)*
- **The pattern is part of the idea** (idea v3, §2). Every change goes through `setIdea()`, so it's in undo/redo, the share link and Saved ideas, and Randomize leaves it alone while Strum is locked.
- **Select:** picks a strum. It lists the built-in strums, then a **My strums** group, all in the current meter and shown as arrows ("↓ · ↓ ↑ · ↑ ↓ ↑"). When the pattern doesn't match any entry, the select shows **Custom**.
- The fit score (§2, "Strum fit") isn't shown. It still scores the current pattern on the groove, driving which strums the randomizer favours.
- **Steps:** one per 8th, or per 16th with the grid set to 16ths. Each step opens a small menu: ↓ Down, ↑ Up, × Mute, · Rest. Steps show the count (1 & 2 &, 1 e & a, or 1–6 in 6/8). Each pick is one undo step.
- **Length:** 1 or 2 bars. Going to 2 repeats bar 1; going to 1 drops bar 2. Switching 16ths back to 8ths drops strokes between 8ths and says how many in a toast.
- **Start over** puts back the pattern of the strum it came from (the last one picked or rolled). It's disabled when nothing has changed, or when that strum was a My strum that has since been removed.
- **Lock and reroll** work as on every row. A locked strum can still be edited by hand. Reroll and Randomize replace the pattern with a rolled strum; undo brings back an edited pattern.
- **Meter:** the pattern is in the idea's meter. Changing the meter rerolls an unlocked strum, and a locked one blocks the change with a toast, as before.
- **Add to library** saves the pattern to My strums, which is synced like Saved ideas (§3). It's disabled when the pattern is already in either library. While the pattern is an unchanged My strum, the button is **Remove** instead, with the two-tap confirm used to delete a Saved idea. Removing one doesn't touch ideas that use it, because they store the pattern.
- My strums have no names or tags. They join the roll pool and are scored on the groove like built-in strums.
- Built-in strums are still added by hand in `js/data/strums.js`. There's no copy-entry step any more.
- Logic is pure: `strum-editor.js` (resizing, matching a pattern to a library entry, making and removing My strums, counts).

### Import MIDI, My grooves and My progressions *(PLAN steps 15–18)*
Drop MIDI files from Logic into the app to add my own grooves and progressions. It does what the import scripts do, without the terminal or pasting.
- **Where they go:** **My grooves** and **My progressions**, synced like My strums (§3). The page is static, so it can't edit `js/data/*.js`. The scripts stay as the way to make one a built-in.
- **Entry:** one dialog, opened from three places. Several files can be imported at once from any of them.
  - **Import MIDI** beside the MIDI downloads, for a mixed batch. On desktop, dropping `.mid` files anywhere on the page opens it the same way.
  - **Import** on the Drums row: every file is a groove.
  - **Import** on the Progression row: every file is a progression.
- **Kind:** from a row's Import, the row decides; nothing is guessed. If `detectKind` reads a file as the other kind, its row warns ("This looks like a chord file") but it can still be added. From Import MIDI or a page drop, kind is worked out per file (`detectKind`): a `groove_` or `prog_` filename prefix decides, if there is one. Without one, a file with notes on channel 10, or only GM drum notes, is a groove; anything else is a progression. No renaming is needed. It can be changed per file before adding.
- **Reading** uses the scripts' rules unchanged (PLAN steps 5 and 11): GM note mapping, 16th quantizing and velocity marks for grooves, with tempo = file tempo ±15; half-bar chord naming and key guessing for progressions. The logic lives in the pure `midi-import.js`, shared by the scripts and the app.
- **Review before adding:** each file is one row showing its kind (a select, only from Import MIDI), id (the filename without `.mid`), a short summary (groove: meter, bars, tempo range; progression: chord symbols), and the script's warnings.
  - A progression's row has a **Key** select with the 5 best guesses, best first. Changing it re-spells the mode and numerals (`renumber`), which fixes a relative-key misread (`Am F C G` read as A minor when it's C major).
  - A file can't be added if it isn't a MIDI file, has no usable notes, its id is already in the built-in or My library, or the same id appears twice in the drop. Its row says why.
  - Tags are left empty and tempo ranges aren't edited here. The saved name falls back to the id's last word, as it does today for a groove with no tags.
- **Add** saves the files that can be added, then shows a toast ("Added 2 grooves, 1 progression"). From Import MIDI or a page drop, the current idea doesn't change.
- **Picked after a row import:** from a row's Import, the first file added (in list order) becomes the current pick, as if chosen from the select. It goes through `setIdea()` as one undo step, so Back undoes all of it. Locks on Drums or Progression don't stop it (locks only hold against Randomize).
  - **Groove in another meter:** the meter switches to the groove's, as a hand meter change does (an unlocked strum is rerolled). If Meter is locked, or a locked Strum is in the old meter, nothing is picked and the toast says why ("Added. Switch to 3/4 to use it").
  - **Progression:** Key and Mode are set to the row's **Key** select (the file's key), so it sounds like the file. A locked Key or Mode is kept, and the progression plays in it. If a locked Bars or Chords doesn't match, nothing is picked and the toast says why ("Added. Doesn't fit the locked bars").
- **In the app:** My grooves follow the built-ins in the Drums select (in a `My grooves` group) and My progressions follow them in the Progression select. Both join the roll pools with the same rules as built-ins (meter for grooves; mode, Bars and Chords for progressions).
- **Remove:** while the current Drums or Progression pick is a My item, its row offers **Remove** with the two-tap confirm. Ideas that use it keep working, because the idea holds the groove (idea v4, §2) and the progression.
- My grooves and progressions have no tags or weight (weight 1). Ids are the filenames, so they still match the Logic pack.

### Add edited drums and progressions to the library *(PLAN step 24)*
Like Add to library on the Strum row: an edited groove or progression can be saved to My grooves or My progressions.
- **Where:** **Add to library** in the Drums and Chords pick menus, after Import. It's disabled while the pick is already in either library (matched by content, as the field's value is). While the pick is an unchanged My item, Remove takes its place (two taps, as before). A generated progression can be added too: it's in no library.
- Adding doesn't change the idea, so it isn't an undo step. The field then shows the new id, and the toast says "Added to My grooves" / "Added to My progressions". A groove with no hits can't be added ("Add a hit first").
- **Id:** the id it came from, plus `edit` and the next number free in both libraries: `groove_straight_push_01` → `groove_straight_push_edit_01`, and an edit of that → `groove_straight_push_edit_02`. With no library-style id to go on (a generated or custom progression, or an import whose filename isn't `groove_…` / `prog_…`), the base is `prog_<mode>` or `groove`: `prog_dorian_edit_01`, `groove_edit_01`. Ids stay readable in the menus and can't clash with a Logic pack file.
- **Groove:** the idea's groove as it is (meter, bars, tempo range, tracks), plus the tags of the groove it came from, so Saved names still read "… · push".
- **Progression:** the mode it was written for, its chords and lengths. Lengths can be any pulse edited in the Loop (a 4/4 beat is a quarter bar, a 3/4 beat a third). My progressions stay meter-free, but one is listed and rolled only in meters where every chord change lands on a whole step (`fitsMeter`): quarter bars fit every meter; thirds fit 3/4 and 6/8, not 4/4. Library progressions and imports are in whole and half bars, so they fit everywhere.

### History, links and saving
- Back/forward through up to 50 previous ideas (this session only).
- The current idea is always encoded in the URL (`#i=…`). Copy link copies it, and opening a link restores that idea exactly.
- **Save** adds the idea to the Saved list. Load or delete from there (delete takes two taps).
- On load: a link in the URL wins, then the last idea on this device, then a fresh roll.

---

## 2. Data model

All timing is in **bars and steps**, never seconds. Tempo is applied only at playback. Internally everything runs on a 16th-note grid.

### Library items (`data/*.js`)
Ids match the filenames in my Logic MIDI packs: `groove_straight_basic_01` ↔ `groove_straight_basic_01.mid`. Id pattern: `(groove|strum|prog)_words_NN`.

**Groove**
```js
{
  id: 'groove_straight_push_01', meter: '4/4', res: 16, bars: 1,
  tempo: { min: 95, max: 125 }, tags: ['push'],
  tracks: {               // kick, snare, cymbal; any may be left out
    kick:   'x.......x..x....',
    snare:  '....x.......x...',
    cymbal: 'x.x.x.x.x.x.x.x.',
  },
}
// x = hit (velocity 0.8), X = accent (1.0), o = ghost (0.35), . = rest
// Length of each string = bars × beats × (res / beat unit)
```

**Strum**
```js
{ id: 'strum_classic_01', meter: '4/4', res: 8, bars: 1, pattern: 'D.DU.UDU', tags: ['classic'] }
// D = down, U = up, x = muted chuck, . = rest (let it ring)
```

**Progression**
```js
{ id: 'prog_dorian_float_01', mode: 'dorian', chords: ['i', 'IV', 'i', 'bVII'], bars: [1, 1, 1, 1], weight: 1 }
```
- Numerals are relative to the **major scale of the tonic**, whatever the mode: `bVII` is always a major chord a whole step below the tonic.
- Case gives the quality (upper = major, lower = minor), and `°` = diminished. Optional suffix: `maj7, 7, 9, 6, add9, sus2, sus4`.
- `bars` are whole or half bars and must add up to 2, 4 or 8. (An idea's progression can also hold lengths edited in the Loop; see "The idea" below.)

**My strum** *(step 14)*: kept in the synced store (§3), never in a data file.
```js
{ id: 'mine-lq3k9x2a', meter: '4/4', res: 8, bars: 1, pattern: 'D.DU.UxU', addedAt: '2026-11-06T18:02:11Z' }
// id = 'mine-' + base36 time it was added, never a list position
```

**My groove / My progression** *(steps 17–18)*: kept in the synced store (§3), never in a data file. The same shape as a built-in, plus `addedAt`. The id is the filename, so it must not clash with any id in either library. *(step 24)* One added from the Loop gets `<base>_edit_NN` instead (§1, "Add edited drums and progressions"), and a My progression's lengths may be any multiple of 1/48 bar (the Loop's pulses), not only half bars.
```js
{ id: 'groove_lofi_lazy_03', meter: '4/4', res: 16, bars: 1, tempo: { min: 70, max: 100 }, tags: [], tracks: { … }, addedAt: '2026-11-07T18:02:11Z' }
{ id: 'prog_aeolian_drift_02', mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [1, 1, 1, 1], addedAt: '2026-11-07T18:02:11Z' }
```

### The idea (one saved result)
```js
{
  version: 4,
  tempo: 112,
  meter: '4/4',                    // '4/4' | '3/4' | '6/8'
  feel: { type: 'straight' | 'swing', swing: 0 | 0.55 },
  key: { tonic: 'D', mode: 'dorian' },
  tuning: null,                    // reserved for alternate tunings
  sections: [{
    id: 'A', name: 'Loop',
    bars: 4,                       // = sum of progression.bars
    meter: null,                   // reserved: per-section override
    groove: {                      // v4: the groove itself, in the idea's meter
      source: 'groove_straight_basic_01', // the groove it was picked or rolled from (a My groove's id too), or null
      meter: '4/4', res: 16, bars: 1,
      tempo: { min: 85, max: 120 },
      tracks: { kick: 'x.......x.......', snare: '....x.......x...', cymbal: 'x.x.x.x.x.x.x.x.' },
    },
    strum: {                       // v3: the pattern itself, in the idea's meter
      source: 'strum_classic_01',  // the strum it was picked or rolled from ('mine-…' for a My strum), or null
      res: 8, bars: 1,
      pattern: 'D.DU.UDU',
    },
    progression: {
      source: 'prog_dorian_float_01' | 'generated',
      mode: 'dorian',              // the mode it was written for
      chords: ['i', 'IV', 'i', 'bVII'],
      bars: [1, 1, 1, 1],
    },
    color: { level: 0 | 1 | 2, seed: 123456 },
  }],
  arrangement: ['A'],              // reserved: ['A','B','A','B']
}
```
- v1 always has exactly one section, and `arrangement` is always `['A']`.
- Grooves and strums **tile** to fill the section (a 1-bar groove repeats).
- **Chord colour is applied at playback, not stored.** `colorize()` uses `level` and `seed` to add extensions, so the same idea always sounds the same. It only adds notes that are in the mode's scale. Numerals that already have a suffix are left alone.
- `validateIdea()` cleans up any idea coming from a link, a favourite or storage. Unknown or broken layers are reported, and only those layers get rerolled. If the shape of the idea changes, bump `version` and migrate inside `validateIdea()`. v2 dropped `melodyPrompts`; v1 ideas still load and simply lose it.
- *(step 14)* v3 stores the strum's pattern rather than its id. A v1 or v2 idea's strum id is looked up in the built-in strums and copied in, with that id as `source`. A v3 strum is valid when `res` is 8 or 16, `bars` is 1 or 2, and `pattern` is `bars × cellsPerBar(meter, res)` characters of `D U x .`. Anything else is rerolled. `source` is kept only if it's a string, so a link from another device with an unknown `mine-…` source still plays (its Start over is disabled).
- Whether the pattern matches a library entry is worked out from the pattern (same meter, res, bars and pattern), never stored. So the select is right even after a My strum is added or removed.
- *(step 16)* v4 stores the groove rather than its id, so an idea with a My groove still plays after a reload (the last idea loads before the synced store) and on a device that doesn't have that groove. A v1–v3 groove id is looked up in the built-in grooves and copied in, with that id as `source`. A v4 groove is valid when `meter` is the idea's meter, `res` is 16, `bars` is 1, 2, 4 or 8, `tempo` is a min ≤ max inside 40–220, and `tracks` holds only `kick`, `snare` and `cymbal` (at least one), each `bars × stepsPerBar` characters of `x X o .`. Anything else is rerolled. `source` is kept only if it's a string. As with strums, which library entry it matches is worked out from its content (`findGroove`), never stored; no match shows **Custom** in the Drums select.
- *(step 19)* An idea's `progression.bars` can also hold lengths edited in the Loop: any whole number of the meter's pulses, so a 3/4 beat is a third of a bar. Sums of thirds drift in floating point (3.9999… bars), so every total goes through `sumBars()`, which rounds to the nearest 1/48 bar (exact for every length in every meter). `validateIdea()` snaps each length to the nearest step before checking it. `source` may also be `'custom'` (a generated progression that was edited). The shape doesn't change, so there's no version bump. Which library progression it matches is worked out from its content (`findProgression`), like grooves and strums.

### Modes
| Mode | Signature chord(s) | Colour note | Feel |
|---|---|---|---|
| Ionian (major) | IV, V | — | Bright and resolved |
| Dorian | IV | 6 | Minor but hopeful |
| Phrygian | bII | 2 | Dark and tense |
| Lydian | II | 4 | Floaty and dreamy |
| Mixolydian | bVII | 7 | Major but loose |
| Aeolian (minor) | bVI, bVII | 6 | Melancholy |
| Locrian | bV | 5 | Unstable and uneasy |

Each mode has a weighted chord pool in `theory.js`. The pool chords are all diatonic to the mode (a test checks this).

### Generated progressions
1. Pick a loop length: 2, 4 or 8 bars (weights 1 / 5 / 1.5), unless Bars is fixed.
2. Pick a harmonic rhythm for that length, for example `[1,1,1,1]`, `[2,1,1]`, `[3,1]` or `[1,1,1,0.5,0.5]`. If the chord count is fixed, only rhythms with that many chords qualify. *(Step 9: every bars × count pair offered has at least one rhythm, using whole and half bars.)*
3. Start on the tonic 75% of the time.
4. Never repeat the same chord twice in a row, including the wrap-around. Already-used chords get half weight. The last chord rarely resolves to the tonic.
5. If the mode's signature chord didn't come up, swap it in somewhere.

### Strum fit
`strumFit(strum, groove)` scores how well a strum sits on a groove:
- + down-strums on kicks and snares, + chucks on snares, + up-strums off the beat (the beat is the pulse, so the dotted quarter in 6/8)
- − up-strums or chucks on kicks
- − a big difference in density between the strum and the groove

Labels: **tight** ≥ 1.4, **good** ≥ 0.9, otherwise **loose**. The randomizer picks from the top half of strums by score, built-in and My strums together. The score is worked out from the pattern each time, so My strums need nothing extra.

---

## 3. Storage

| What | Where | Key |
|---|---|---|
| Favourites | `shared/persist.js` → `toolState/song-seed`, falling back to localStorage | `favorites` (fallback: `song-seed:favorites`) |
| Last idea | localStorage | `song-seed:last` |
| Locks | localStorage | `song-seed:locks` |
| Prefs (sound, mutes, the Loop's grid *(step 21)*) | localStorage | `song-seed:prefs` |
| My strums *(step 14)* | `shared/persist.js`, same as favourites | `strums` (fallback: `song-seed:strums`) |
| My grooves *(step 17)* | `shared/persist.js`, same as favourites | `grooves` (fallback: `song-seed:grooves`) |
| My progressions *(step 17)* | `shared/persist.js`, same as favourites | `progressions` (fallback: `song-seed:progressions`) |
| History | memory only | — |

- Favourite shape: `{ id: 'fav-<base36 time>', name, savedAt (ISO), idea }`. The id is built from the time it was saved, never from its position in the list.
- One favourite is about 0.6 KB, so the 1 MB Firestore doc holds over 1,000. Split the doc if that ever becomes a problem.
- *(step 14)* My strums share that doc. One is about 0.1 KB, so even a few hundred barely count. My strums load with favourites; until they arrive, rolls use the built-in strums only.
- *(step 17)* My grooves (about 0.3 KB each) and My progressions (about 0.15 KB) share that doc too and load with it. Until they arrive, rolls use the built-ins. A few hundred of each still leaves most of the 1 MB.
- *(step 14)* The step 12 draft key `song-seed:strum-draft` is no longer read, and is removed on load.
- The sync indicator next to the title shows **Synced** or **This device**.

---

## 4. Files

```
tools/song-seed/
├─ index.html        markup, the 4 meta tags
├─ tokens.css        every design value (colour, type, space, motion), light + dark
├─ style.css         layout and components; reads tokens only
├─ app.js            UI wiring, state, history, favourites, keyboard
├─ audio.js          Web Audio engine: voices + step scheduler
├─ icons.js          inline Lucide icons
├─ theory.js         modes, numerals, spelling, voicings, colour   (pure)
├─ loop.js           idea → playable 16th-step loop                (pure)
├─ randomize.js      rolling layers, generator, strum fit          (pure)
├─ idea.js           idea shape, validation, share links           (pure)
├─ library.js        gathers data files into lookups               (pure)
├─ midi.js           Standard MIDI File writer                      (pure)
├─ strum-editor.js   strum patterns: resizing, matching, My strums   (pure)
├─ field-bar.js      a bar of fields with their menus: the settings toolbar and the lane rows (steps 26–27)
├─ settings-bar.js   the settings toolbar: Key, Mode, Tempo (drag), Meter, Feel (step 26)
├─ lane-bars.js      the Drums, Strum and Chords rows: picks, lengths, shape, colour, locks and row actions (step 27)
├─ lane-menu.js      the small menu that opens under a cell: placing it, arrow keys, Escape, a tap outside (step 20; the chord, hit and stroke menus)
├─ chord-lane.js     the Loop's chord lane: the chord menu, roving focus and edge drags (step 20)
├─ drum-lane.js      the Loop's drum lanes: adding hits, the hit menu, roving focus and hit drags (step 21)
├─ strum-lane.js     the Loop's strum lane: the stroke menu and roving focus (step 22)
├─ progression-editor.js  chords edited in the Loop: change, move, split, delete, menu choices, matching, meter snap (step 19), meter fit (step 24) (pure)
├─ groove-editor.js  drum hits edited in the Loop: add, move, re-weight, length (step 19)   (pure)
├─ my-library.js     My grooves and progressions: clean, add, remove (step 17); import review and pick (step 18); edited ones and their ids (step 24) (pure)
├─ midi-import.js    MIDI file → groove or progression (step 15)   (pure)
├─ import-panel.js   the Import MIDI dialog (step 18)
├─ data/             grooves.js, strums.js, progressions.js
├─ scripts/          command-line wrappers around midi-import.js (see scripts/README.md)
├─ tests/            node --test (theory, randomize, data checks)
└─ package.json      "type": "module", npm test
```
"Pure" means no DOM and no audio, so those files run in Node tests.

---

## 5. Out of scope (for now)

- Writing or generating melodies.
- Capo and shape suggestions, and chord diagrams (they don't fit alternate tunings).
- More than one section per idea.
- Meters other than 4/4, 3/4 and 6/8.
- Writing to `js/data/*.js` from the app. Making an import a built-in is still done with the scripts.
- A public build. This is a personal tool.

## 6. Later ideas (v2+)

- **MIDI export:** drums on channel 10 with General MIDI notes (kick 36, snare 38, cymbal 42, the closed hat), and chords as a separate file. See PLAN.
- **Import my Logic MIDI packs** into the library with a script. Grooves (PLAN step 5) and progressions (step 11) are done. Strums got an in-app editor instead (step 12). Importing in the app is planned (steps 15–18).
- Editing an imported groove's tags and tempo range in the app.
- **Sections:** a "Section B" button that makes a chorus related to the verse (same key, contrasting progression or groove).
- **My own samples** in place of the synth voices.
- **Alternate tunings:** `idea.tuning` drives the guitar voicings.
- Favourite notes and renaming.

## 7. Open questions

- **MIDI export and swing:** export on the straight grid and let Logic's swing do the work, or bake the app's swing into the note timing? *Proposed: straight grid, with "swing" in the track name.*
- **Chord MIDI:** block chords for the whole length, or strummed in the strum rhythm? *Proposed: block chords first, strummed as an option later.*

## 8. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Lock + reroll per layer, and Randomize rolls only the unlocked layers | One mechanic covers every workflow |
| 2026-10-27 | Time stored in bars/steps, 16th grid internally; strums written in 8ths, grooves in 16ths | Indie strums rarely need 16ths; cymbals and ghosts sometimes do |
| 2026-10-27 | Chords stored as Roman numerals relative to the tonic's major scale | Work in any key and mode |
| 2026-10-27 | Progressions come from both the library and the generator, 50/50 | Variety plus my favourites |
| 2026-10-27 | All 7 modes; the generator always includes the mode's signature chord | Makes each mode sound like itself |
| 2026-10-27 | Library ids = Logic MIDI pack filenames | Bridges the app and my packs before export exists |
| 2026-10-27 | Strum↔groove fit is scored automatically, not hand-tagged | Less data entry |
| 2026-10-27 | Feel (straight/swing) belongs to the idea, not to each pattern | Any pattern can be swung |
| 2026-10-27 | Colour is applied at playback from level + seed, never stored in numerals | Library stays plain; colour is repeatable |
| 2026-10-27 | Idea shape has `sections[]`, `arrangement`, `tuning`, per-section `meter` from v1 | Future features without a rewrite |
| 2026-10-27 | Plain Web Audio instead of Tone.js | No library to vet; easy to swap in samples |
| 2026-10-27 | Data files are `.js` modules, not JSON | No fetch; the files are easy to edit by hand |
| 2026-10-27 | No capo/shape suggestions | I use alternate tunings |
| 2026-10-27 | Neutral look, with every value in `tokens.css` | Design pass comes later |
| 2026-11-04 | Melody prompts removed (cards, layer and `melodyPrompts`; idea v2) | They weren't useful; Scale and Chord tones are |
| 2026-11-04 | Bars and chord count are lockable layers read from the progression, not stored (PLAN step 9) | Choose the shape of the loop with the usual lock + reroll, with no idea-shape change |
| 2026-11-04 | Meter is a lockable layer (4/4, 3/4, 6/8), rolled first; 6/8 runs on a dotted-quarter `pulse` (PLAN step 6) | Grooves and strums are written in one meter, so it has to come before them |
| 2026-11-04 | Circle of fifths in the Melody panel, as hand-written inline SVG (PLAN step 10) | Shows the key and borrowed chords at a glance; no chart library needed |
| 2026-11-05 | Strums are written in an in-app editor that copies a `strums.js` entry, not imported from MIDI (PLAN step 12) | Tapping a pattern in is quicker than making strum MIDI files in Logic, and it's heard on the real groove while you write it |
| 2026-11-06 | One **Cymbal** lane replaces the two hi-hat lanes; grooves are kick, snare and cymbal, and cymbal exports on GM note 42 (PLAN step 13) | The loop is a starting point to finish in a DAW, so one generic lane is enough. Ideas store groove ids, so old links still load |
| 2026-11-05 | The progression import script guesses each file's tonic and mode from its chords and marks them `// check` (PLAN step 11) | MIDI files carry no key, and naming or sorting files by key is extra work |
| 2026-11-07 | MIDI import moves into the app: one **Import MIDI** dialog that takes several files, works out groove vs progression per file, and saves to synced **My grooves** / **My progressions** (PLAN steps 15–18) | The page is static and can't write the data files; synced lists work on the live site and the phone, as My strums do. One entry point beats a menu of two, since the filename prefix already says the kind |
| 2026-11-07 | Import is also on the Drums and Progression rows: the row sets the kind, and the first file added is picked (meter, key and mode follow unless locked). Import MIDI by the downloads stays for mixed batches and leaves the idea alone | The row is where that list lives and where you'd pick from next, as Add to library is on the Strum row. A row import says what you want to use; a mixed batch doesn't |
| 2026-11-07 | The groove is stored in the idea (v4), like the strum in v3 (PLAN step 16) | The last idea loads before the synced store, and links travel to devices without my imports; an id alone would be rerolled |
| 2026-11-06 | The Strum row becomes the strum editor; the pattern is stored in the idea (v3), and **Add to library** saves it to a synced My strums list that rolls use too (PLAN step 14) | Editing in place is quicker than opening a panel, and a pattern in the idea survives undo, links and Saved ideas. |
| 2026-11-09 | The Loop is edited in place: chords, drum hits and strums, with a menu on click and dragging with a mouse (PLAN steps 19–22) | Editing where you hear it, like a MIDI region in a DAW, is quicker than separate editors; rolls and locks still do most of the work |
| 2026-11-09 | Editing a repeat edits the pattern, so every repeat changes; lengthen the pattern to make bars differ | Grooves and strums stay short and keep matching the library and strum fit; it's how the Strum row already works |
| 2026-11-09 | Chord edges snap to the pulse (a beat; the dotted quarter in 6/8). Lengths stay in bars, with totals rounded by `sumBars()`, and a meter change moves only edges that miss the new grid | Chord changes on beat 3 or 4 are common; keeping bars as the unit means no idea-shape change |
| 2026-11-09 | The chord menu offers the mode's chords, then borrowed ones from the parallel major and minor, then extensions | Short enough for a phone, and covers the borrowed chords indie songs lean on |
| 2026-11-09 | Timeline cells are 44px on a phone and mouse-sized on desktop; dragging is mouse and pen only, and the menus do the rest | Keeps the 44px rule on touch without making the desktop timeline scroll; a drag would fight the scroll on touch |
| 2026-11-09 | Mini-DAW layout: Key, Mode, Tempo, Meter and Feel in a strip at the top, lane rows under the Loop, no chord chart (PLAN step 23) | Once the Loop is editable, the bands and the chart repeat what the timeline shows |
| 2026-11-11 | Locks and rerolls in one right-hand column; Bars, Count and Colour behind a summary; Meter, Feel, Bars and Count lock-only; no Locked tags (PLAN step 25) | Eleven grey pills in different places made the strip and the Chords row cramped and hard to scan. A reroll that does what a tap does isn't worth its space |
| 2026-11-11 | Key, Mode, Tempo, Meter and Feel become a one-line toolbar: value over label, a menu per field holding the choices, Lock and Reroll; Tempo drags (PLAN step 26) | The strip pushed the Loop below the fold. A DAW's LCD shows the current value and changes it in place, which fits in one line on a phone |
| 2026-11-12 | Edited grooves and progressions can be added to My grooves / My progressions, as `<source>_edit_NN`; My progressions take pulse lengths and are listed and rolled only in meters they fit (PLAN step 24) | Readable in the menus, in the pack's naming, and never clashing with a Logic file. Refusing beat lengths would block common edits (a change on beat 4); snapping them on pick would show Custom straight away |
| 2026-11-12 | The circle of fifths gets a key under it: tonic, in the scale, colour note, chord roots (PLAN step 28) | The orange and dark dots weren't readable without already knowing what they meant |
| 2026-11-11 | The Drums, Strum and Chords rows become field bars like the toolbar; selects, pairs, links and the chord-shape summary go into field menus (PLAN step 27) | One way of working for every setting on the page, and every row fits on one line, so the Chords row no longer needs a fold |
