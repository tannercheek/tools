# Song Seed — Plan

v1 is built (see SPEC.md). These steps take it from there. Do **one step per fresh Claude Code session**, in order, unless a step says it can move.

## How to run a step

Paste this into a new Claude Code session, with the step number filled in:

```
Read these files in tools/song-seed/ before doing anything:
CLAUDE.md, SPEC.md, PLAN.md, and DESIGN.md + tokens.css if DESIGN.md exists.

Do step <N> of PLAN.md only.
1. Tell me in two or three lines what you'll create or change.
2. Do the step.
3. Run the tests (npm test in tools/song-seed/) and report the result.
4. If the tests pass and the step is done, check off its box in PLAN.md
   (change `- [ ]` to `- [x]` for that step).
5. Finish with: files changed, test results, a short "how to check it" list,
   anything you were unsure about, and a suggested commit message.

Don't start the next step. Don't run any git commands that change the repo.
```

After each step: check it locally (the box should already be ticked), commit with the suggested message.

---

## Steps

### 1. Baseline check with the real persist.js

- [x] Done

v1 was tested against a stand-in for `shared/persist.js`. Check it with the real one.

- Preview from the repo root. Save, reload, load and delete favourites with the passphrase set.
- Check the fallback: if the import fails or the passphrase is refused, favourites still work on this device, the indicator says **This device**, and nothing throws in the console.
- Check the dashboard picks the tool up (four meta tags present; `icon` is `folder` until I add a `music` icon).
- Fix only what's broken. List anything else.

**Done when:** favourites sync between two browsers, the fallback works, the console is clean, and tests pass.

### 2. MIDI file writer (pure)

- [x] Done

Add `midi.js`: a small Standard MIDI File writer, with no DOM and no dependencies.

- Format 1, 480 ticks per quarter. A tempo track (tempo, time signature, track name), then note tracks.
- Input is a list of `{ tick, note, velocity, duration, channel }` events; output is a `Uint8Array`.
- Handles variable-length quantities, puts note-offs before note-ons at the same tick, and ends each track with an end-of-track event.
- Tests: byte-exact output for a tiny file (one note), correct VLQ encoding for edge values (0, 127, 128, 16383, 16384), and events sorted by time.

**Done when:** tests pass, and a test file written to disk imports into Logic with the right tempo and note.

### 3. Export drums as MIDI

- [x] Done
- Add a **Drums .mid** button (next to Save / Copy link, or in the Loop panel; ask if DESIGN.md doesn't say).
- Build events from `compileLoop()` drums: channel 10, kick 36, snare 38, cymbal 42 (GM closed hat). Velocities: accent 120, hit 96, ghost 45. Each hit lasts one 16th.
- Straight grid (no swing baked in). Track name: groove id, plus "swing" if the feel is swing.
- Filename: `<Tonic>-<mode>_<tempo>bpm_drums.mid`, for example `D-dorian_112bpm_drums.mid`.
- Download with a Blob and a temporary link; no new library.
- Put the event-building function in a pure module with tests (note numbers, positions, length of the loop).

**Done when:** the file drags into Logic onto a Drum Machine Designer track and plays the same groove as the app, at the right tempo, for the full loop length.

### 4. Export chords as MIDI

- [x] Done
- Add a **Chords .mid** button beside the drums one.
- Block chords: each chord's guitar voicing (with colour applied, as heard) held for its full length, channel 1, velocity 90.
- Track name: the chord symbols. Filename: `<Tonic>-<mode>_<tempo>bpm_chords.mid`.
- Pure event builder plus tests (chord start ticks, lengths, half-bar chords).

**Done when:** the file imports into Logic with the right chords on the right bars and lines up with the drums file.

### 5. Groove import script

- [x] Done

A Node script that turns my Logic drum MIDI files into `data/grooves.js` entries, so the app's library and my pack stay the same.

- `node scripts/import-grooves.mjs <folder>` in `tools/song-seed/`. Prints entries to paste in; doesn't edit `grooves.js` itself.
- Reads `.mid` files (write a small reader; no dependencies). The id is the filename without `.mid`.
- Maps GM notes: 35/36 → kick, 37/38/40 → snare, 42/44/46 → cymbal. Lists any other notes it skipped.
- Quantizes to 16ths. Velocity ≥ 110 → `X`, < 50 → `o`, otherwise `x`. Works out `bars` from the file length.
- `tempo` comes from the file's tempo ±15, marked `// check` for me to adjust. Tags left empty.
- Tests for the quantizer and note mapping, using the writer from step 2 to make test files.

**Done when:** running it on a few of my files prints entries that pass `tests/data.test.js` once pasted in, and the grooves sound right in the app.

### 6. 3/4 and 6/8

- [x] Done

The data and engine already carry `meter`. This step adds the content and the UI.

- Add a **Meter** layer (4/4, 3/4, 6/8) with lock and reroll, rolled first (before feel and groove). Weights: 4/4 most of the time.
- Add starter grooves and strums for 3/4 and 6/8 (about 4 grooves and 4 strums each).
- 6/8 is compound: beat lines on the timeline, swing, and "on the beat" in `strumFit` use the dotted-quarter pulse (every 6 sixteenths). Add a `pulse` field to `meterInfo()` rather than special-casing.
- Changing meter by hand rerolls groove and strum if they don't match; locked ones block the change with a toast explaining why.
- Generated progressions keep using bars, so they work unchanged. Library progressions don't need a meter.
- Tests: rolls in every meter are valid, grids have the right length, 6/8 fit scoring uses the pulse.

**Done when:** all three meters roll, play and display correctly, and old 4/4 links still load.

### 7. Design pass (can move)

- [x] Done

Run this whenever DESIGN.md and a new tokens.css exist (made in a separate design chat).

- Apply DESIGN.md to `index.html` and `style.css`. Move the remaining raw values in `style.css` into tokens.
- Presentation changes in `app.js` are in scope too: section order, how chords are separated in text, which labels show. Rolling, playback and storage are not.
- Layer cards: no grid row may be left part-empty at any width (see DESIGN.md for how).
- If DESIGN.md asks for something SPEC doesn't cover, list it instead of building it.

**Done when:** it matches DESIGN.md in light and dark, every grid row is full from 360px to 1440px, and every value in `style.css` comes from a token.

### 9. Choose bars and chord count

- [x] Done

Set how many bars the loop has and how many chords are in it, then roll progressions inside those limits. The rules are in SPEC §1, "Bars and chord count".

- Add **Bars** (segmented 2 · 4 · 8) and **Chords** (select with the counts that fit) as rows in Harmony, between Mode and the progression row, each with a lock and reroll. Rename the progression row's label to **Progression**; its layer id stays `chords`.
- Both values are read from the progression, never stored, so the idea shape and old links don't change. Locks gain `bars` and `count`.
- `generateProgression()` takes an optional `{ bars, count }`; either can be fixed. Extend the harmonic-rhythm table so every bars × count pair offered has at least one rhythm (whole and half bars only).
- Library picks respect locked Bars and Chords, falling back to generated when nothing matches. Picking a library progression by hand updates Bars and Chords; while either is locked, the list shows only matches.
- A locked Progression fixes Bars and Chords: their dice are disabled, and changing them by hand is blocked with a toast.
- Add the two rows to DESIGN §5.7's table. They go above the chord chart (Harmony's band result).
- Lengths are in bars, so this works in any meter once step 6 is done.
- Tests: every bars × count pair generates a valid progression that follows the generator rules; locked Bars and Chords survive many Randomize rolls; library picks match the locked values; a locked Progression keeps both; an old link loads unchanged.

**Done when:** any offered bars × count pair can be set, Randomize keeps the locked ones, the chord chart and both MIDI files show the right length, and old links still load.

### 10. Circle of fifths in the Melody panel (can move)

- [x] Done

Add a circle of fifths beside the Scale and Chord tones. What it shows is in SPEC §1, "Melody panel"; how it looks is in DESIGN §5.11 and the §4 layout table.

- **Logic (pure, `theory.js`):** `circleOfFifths(tonic, modeKey, chords)` returns 12 entries in circle order from C (C G D A E B F♯ D♭ A♭ E♭ B♭ F by pitch class), each `{ pc, name, inScale, isTonic, isColour, chordIdx }`.
  - `name` is spelled for the key with `nameInKey()`, so D♭ major shows G♭, not F♯.
  - `inScale`, `isTonic` and `isColour` come from the mode, the same way the scale row works them out.
  - `chordIdx` lists the indexes of the loop's chords rooted on that note (empty if none). Use the compiled chords from `compileLoop()`, so colour doesn't matter.
- **Drawing:** hand-written inline SVG built in `app.js`, no library. Follow DESIGN §5.11: scale notes filled, other notes muted with no fill, a heavier ring on the tonic, the colour note marked as on the scale row, a dot on each chord root.
- **Playback:** the current chord's root gets the current-chord highlight. Update it in the same frame-loop code that sets `.is-current` on the chart and chord tones, so they never drift apart.
- **Layout:** Melody becomes Scale | Chord tones | Circle on wide screens, Scale over Chord tones beside the circle at medium, and one column with the circle centred in compact (DESIGN §4). Use named grid areas, not wrapping.
- **Accessibility:** `role="img"` and an `aria-label` such as "Circle of fifths: D Dorian, scale notes C D E F G A B, chords on D G C".
- All colours and sizes come from tokens; add the new size tokens DESIGN lists, which are the same in light and dark.
- **Tests:**
  - for every mode and tonic, the scale notes form 7 consecutive entries around the circle
  - spelling follows the key: G♭ in D♭ major, F♯ in D major
  - a borrowed chord (♭VII in Ionian) has its root outside the scale arc
  - `chordIdx` matches the loop's chords, and a coloured chord keeps the same root

**Done when:** tests pass, and the circle looks right in light, dark and at 360px. Check it with D Dorian, with an Ionian progression that has ♭VII (its dot sits outside the scale arc), and while playing the loop (the highlighted root moves with the chart).

### 11. Progression import script

- [x] Done

A Node script that turns my chord MIDI files into `data/progressions.js` entries, so my own progressions join the library. The generator stays; these add to the 50% library side.

- `node scripts/import-progressions.mjs <folder>` in `tools/song-seed/`. Prints entries to paste in; doesn't edit `progressions.js` itself. Reuses the groove script's MIDI reader (which now also gives each note's end). The id is the filename without `.mid`.
- Notes are grouped by half bar. A note that starts late in a half bar and rings past it (a pushed chord) belongs to the next one. Drum-channel notes are skipped and listed.
- Each half bar is named as a chord the numerals can spell (triads, `°`, and the suffixes in SPEC §2; 4+ note chords may leave out the 5th). The bass note breaks ties (C E G A over A is Am7). A half bar that repeats the chord, or holds only part of it, continues it. Anything it can't name exactly gets the closest chord and a warning.
- **Key is guessed** (a MIDI file has none): every tonic × mode is scored on how much of the chords sits in the scale, then starting, ending and dwelling on the tonic chord, the mode's signature chord, and the mode's weight. Printed as `// guessed D Dorian (check): Dm G Dm C`. Relative keys can't be told apart from the notes, so a loop that starts away from its tonic (vi IV I V) reads as the relative key.
- Bars come from the file's time signature and length. Warns if the total isn't 2, 4 or 8, if there's 1 chord or more than 8, or if nothing starts on bar 1.
- Tests: chord naming, key guessing, numerals, every library progression and 40 rolled ideas round-trip through MIDI (the app's own Chords .mid included), re-struck, pushed and half-bar chords, 6/8.

**Done when:** running it on a few of my files prints entries that pass `tests/data.test.js` once pasted in, and they play right in the app.

### 12. Strum editor (was: strum import script)

- [x] Done

A way to get my strum patterns into `data/strums.js`.

- **Settled:** an editor in the app instead of a MIDI script. It's a panel under the Strum row with a 4-choice menu per step (↓ ↑ × ·), and it copies a `strums.js` entry. The rules are in SPEC §1, "Strum editor"; how it looks is in DESIGN §5.16.
- 8ths or 16ths (`res`), 1 or 2 bars, in the idea's meter. While open, the loop plays the draft in place of the selected strum; the idea doesn't change.
- Pure draft logic in `strum-editor.js`, with tests (resizing, entries, ids, counts, the loop playing a draft).

**Done when:** copied entries pass `tests/data.test.js` once pasted in, and they sit right on the grooves in the app.

### 13. One Cymbal lane (drop the open hat)

- [x] Done

The generator makes a starting point to finish in a DAW, so one generic **Cymbal** lane replaces Hat and Open hat. Grooves become kick, snare and cymbal. Nothing in the app should mention an open hat afterwards.

- **Data:** in `grooves.js`, rename the `hatClosed` track to `cymbal`. Merge the three `hatOpen` tracks into `cymbal` so no hits are lost (`groove_four_floor_01` has no closed hat, so its open hats become its whole cymbal track). Remove the `open-hat` tags. **Don't rename any ids:** `groove_six_eight_open_01` keeps its name, because saved favourites point at it.
- **Engine:** `DRUM_TRACKS` becomes `['cymbal', 'snare', 'kick']`. `strumFit` reads only `cymbal`. In `audio.js`, the closed-hat voice becomes `cymbal`, and the open-hat voice and its choke (`openHat`) go.
- **Export:** `DRUM_NOTES` becomes `{ kick: 36, snare: 38, cymbal: 42 }`, so cymbal hits are exported as GM closed hat. Nothing is written on 46.
- **Import script:** 42, 44 and 46 all go to `cymbal`. Hits on the same step already merge to the loudest. Other cymbals (49, 51) are still skipped and listed.
- **Timeline:** three drum lanes, Cymbal · Snare · Kick (`repeat(3, var(--tl-lane))`). Remove the round open-hat mark. Fingerprint hits use kind `cymbal`.
- **Tokens and CSS:** remove `--lane-openhat` (light and dark), `--hit-open`, `--hit-open-ring` and `.k-open`. Rename `--lane-hat`, `--hit-hat*`, `--fp-stroke-hat`, `.k-hat` and `.fp-hat` to `cymbal`.
- **Idea shape:** unchanged. Ideas store groove ids, not tracks, so there's no `IDEA_VERSION` bump. Old links and favourites load with the new tracks.
- **Docs:** remove every mention of the open hat. Rename hat to cymbal for the drum lane only (`--pattern-hatch` and `--color-hatch` are the locked-row texture, so they stay). That covers:
  - SPEC: §1 Timeline, §2 groove example, §6 MIDI notes, and a decisions-log row.
  - DESIGN: §1.2, §5.10 rows and marks table, §5.13 fingerprint.
  - `scripts/README.md`.
  - The wording of done steps 3 and 5 here. Don't untick them.
- **Tests:**
  - Update `data`, `export`, `import-grooves`, `meter` and `display` for the new track name.
  - New checks: no groove has a track other than kick, snare or cymbal; the three former open-hat grooves keep every hit in `cymbal`; drum export never writes note 46; the importer merges 46 into `cymbal`; an old link to `groove_four_floor_01` loads and plays cymbal hits.
- **Check:** `grep -riE "open.?hat|hatOpen|hatClosed|lane-hat|k-hat"` finds nothing.

**Done when:** tests pass, the grep is clean, the timeline shows three drum lanes in light, dark and at 360px, and a Drums .mid from a former open-hat groove imports into Logic with those hits on 42.

### 14. The Strum row is the editor, plus My strums

- [x] Done

Step 12's editor becomes the Strum row: the steps sit on the row and are edited in place, the pattern is stored in the idea, and **Add to library** saves it to a synced My strums list. The rules are in SPEC §1, "Strum row and My strums", and §2. How it looks is in DESIGN §5.16 and the §5.7 table.

- **Idea v3:** `sections[0].strum` becomes `{ source, res, bars, pattern }` in the idea's meter. Bump `IDEA_VERSION` to 3. In `validateIdea()`, a v1/v2 strum id is looked up in the built-in strums and copied in with that id as `source`. A v3 strum is checked as SPEC §2 says, and anything off is rerolled.
- **Library:** My strums load from the synced store (`strums`) with favourites, and are merged into the library with a pure helper (for example `withMyStrums(lib, mine)`), so `lib.strums` and `lib.strumById` include them. Until they load, rolls use the built-in strums.
- **Engine:** `compileLoop()` reads the pattern from the idea. The `{ strum }` override goes. `rollStrum()` returns a strum object, not an id, picks from built-in and My strums together, and avoids landing on the current pattern (compare patterns, not ids). Meter changes still reroll an unlocked strum and are blocked by a locked one. A locked strum still holds the meter in Randomize.
- **Matching:** a pure `findStrum(lib, strum, meter)` returns the library entry with the same meter, res, bars and pattern, or null. It drives the select (an entry, or **Custom**), Add to library's disabled state, Remove, and Start over.
- **Row (`strum-panel.js`):** reuse step 12's steps, stroke menu, keys and resizing, but each change now calls `setIdea()` (one undo step per pick, per length or grid change, per Start over). Strum becomes a wide row. The select lists built-in strums, then a `My strums` optgroup, with glyphs and the fit label as now. The Fits drums tag moves to the controls line and scores the current pattern.
- **Add to library / Remove:** Add saves `{ id: 'mine-<base36 time>', meter, res, bars, pattern, addedAt }`, with toast "Added to My strums". Block an all-rest pattern with the toast "Add a stroke first". Remove uses the two-tap confirm from Saved, with toast "Removed". Write with the same sync and error handling as favourites.
- **Removed:** the Edit / Close link, the editor heading, Id field, Copy entry and entry text, the editor's own fit tag (`#edFit`, since the row's tag now scores the pattern), the strum id hint (`#strumId`), `song-seed:strum-draft` (removed on load) and `--ed-id-basis`. In `strum-editor.js`, drop what nothing uses any more (`nextFreeId`, `idProblem`, `formatEntry`, `validateDraft`, `draftFrom`) and their tests. `strumFit()` and `fitLabel()` stay.
- **Docs:** CLAUDE.md's storage rules ("Today only `favorites` is synced") and the strum section of `scripts/README.md` (no more copy entry). Leave step 12 here as it is.
- **Tests:**
  - A v2 link and a v2 favourite load with the pattern of their strum id.
  - Broken v3 strums are rerolled: wrong length for the meter, bad characters, res or bars out of range.
  - A strum with an unknown `mine-…` source still loads and plays.
  - Rolls in every meter return valid strum objects, include My strums (seeded, many rolls), and avoid the current pattern.
  - `findStrum` matches by content, not id; adding and removing My strums; ids come from time.
  - A meter change rerolls an unlocked strum; a locked strum blocks it and holds the meter in Randomize.
  - `compileLoop()` plays an edited pattern.

**Done when:** tests pass; editing a step plays straight away, is undone by Back, and survives a reload, a share link and a Saved idea; an added strum shows under My strums in a second browser and can come up on a reroll; removing it doesn't change a Saved idea that uses it; old links load; and the row looks right in light, dark and at 360px.

### 15. Import core in the browser (pure, no UI)

- [x] Done

The first of four steps that bring the import scripts into the app (SPEC §1, "Import MIDI"). This one only moves the logic so the browser can run it. Nothing on screen changes.

- **New pure module `js/midi-import.js`.** Move `readMidi`, `markOf`, `TRACK_OF_NOTE`, `grooveFromMidi`, `formatGroove`, `nameChord`, `guessKey`, `numeralFor`, `progressionFromMidi` and `formatProgression` out of the scripts, unchanged. No `node:` imports, no DOM.
- **Additions:**
  - `detectKind(filename, mid)` → `'groove'` or `'progression'`. A `groove_` or `prog_` filename prefix decides first. Otherwise: notes on channel 10, or every note in the GM drum map (`TRACK_OF_NOTE`), means groove. Anything else is a progression.
  - `guessKey` also returns `candidates`: every tonic × mode, best first, each `{ tonic, tonicPc, mode, score }`. Its main pick stays the same.
  - `progressionFromMidi` also returns its `chords` (`rootPc, quality, ext, bars`) and the key `candidates`.
  - `renumber(result, tonicPc, mode)` returns the progression (mode, numerals, symbols) re-spelled for another key, so the dialog can switch a misread relative key.
- **Scripts:** `scripts/import-grooves.mjs` and `import-progressions.mjs` become thin CLIs (folder reading and printing) that import from `js/midi-import.js`. Their printed output doesn't change.
- **Docs:** add `midi-import.js` to CLAUDE.md's list of pure modules and to SPEC §4.
- **Tests:**
  - `tests/import-grooves.test.js` and `import-progressions.test.js` import from the new module and still pass unchanged.
  - New: `detectKind` (prefix wins, a drum file without a prefix, a chord file without a prefix); the relative key is in the top 3 candidates for `vi IV I V`; `renumber` from A Aeolian to C Ionian gives `vi IV I V`, and the result passes the progression checks in `tests/data.test.js`.

**Done when:** tests pass, and both scripts print the same output as before on a few of my files.

### 16. Idea v4: the groove lives in the idea

- [x] Done

Ideas store the groove's id only, and the last idea loads before the synced store does. So an imported groove (step 17) would be rerolled on every reload, and on any device that doesn't have it. This step stores the groove's content in the idea, the same way step 14 did for strums. Rules: SPEC §2.

- **Idea v4:** `sections[0].groove` becomes `{ source, meter, res, bars, tempo, tracks }`. Bump `IDEA_VERSION` to 4. In `validateIdea()`, a v1–v3 groove id is looked up in the built-in grooves and copied in, with that id as `source`. A v4 groove is checked as SPEC §2 says. Anything off is rerolled, and an unknown `source` still plays.
- **Readers:** everything that does `lib.grooveById.get(sec.groove)` reads the idea's groove instead: `loop.js` (`compileLoop`), `randomize.js` (tempo range, strum fit, meter hold, meter change), `display.js` (fingerprint), `idea.js` (saved name) and `app.js` (Drums row, tempo hint).
- **Rolling:** `rollLayer(…, 'groove')` puts a groove object in the idea and avoids landing on the current one (compare content, not ids).
- **Matching:** a pure `findGroove(lib, groove)` returns the library entry with the same meter, res, bars and tracks, or null. The Drums select shows that entry, or a disabled **Custom** option when nothing matches (a link from a device with a My groove this one doesn't have).
- **Tests:**
  - v1, v2 and v3 links and favourites load with their groove's tracks and tempo.
  - Broken v4 grooves are rerolled: wrong track length for the meter, bad characters, an unknown track, res or bars out of range.
  - A groove with an unknown `source` loads and plays.
  - Rolls in every meter return valid groove objects and avoid the current groove.
  - A locked groove still holds the meter in Randomize and blocks a meter change.

**Done when:** tests pass, old links and Saved ideas load and sound the same, and the Drums row, tempo hint and fingerprints look as before.

### 17. My grooves and My progressions (synced)

- [x] Done

Imported patterns are stored like My strums: synced, in the roll pool, and removable. There's still no way to add one in the app (step 18 adds it), so this step is checked with tests and a seeded store. Rules: SPEC §1 and §3.

- **Storage:** synced keys `grooves` and `progressions`, in the same doc as `favorites` and `strums` (fallbacks `song-seed:grooves` and `song-seed:progressions`). They load in `init()` with the others. Until then, rolls use the built-ins.
- **Library:** replace `withMyStrums` with `withMine(lib, { strums, grooves, progressions })`. My grooves follow the built-ins in `lib.grooves` and `grooveById`, and My progressions follow them in `lib.progressions` and `progressionById`. Keep `builtInGrooves` and `builtInProgressions` the way `builtInStrums` is kept.
- **Pure helpers** (a `my-library.js`, or next to the My strums helpers in `strum-editor.js` if that stays small): clean a stored list (drop malformed entries), add (refuse an id that's already in either library), remove by id.
- **Rows:**
  - The Drums select gets a `My grooves` optgroup after the built-ins. The Progression select gets a `My progressions` optgroup.
  - While the current pick is a My item, its row's hint line ends with a **Remove** text link. The first tap turns it into the "Tap to remove" danger pill (§5.13 behaviour); the second removes it and shows the toast "Removed".
  - Removing one doesn't change ideas that use it: grooves are in the idea (step 16) and progressions already were.
- **Docs:** CLAUDE.md's storage rules (what's synced).
- **Tests:**
  - clean, add and remove
  - an id already in either library is refused
  - rolls include My grooves and My progressions (seeded, many rolls), and respect meter, mode, Bars and Chords as the built-ins do
  - removing one leaves an idea that uses it unchanged

**Done when:** tests pass, a seeded My groove and My progression show under their optgroups, come up in rolls, sync to a second browser, and can be removed with two taps, in light, dark and at 360px.

### 18. Import MIDI dialog

- [x] Done

The in-app import flow. What it does is in SPEC §1, "Import MIDI"; how it looks is in DESIGN §5.17.

- **New `js/import-panel.js`** for the dialog (UI, like `strum-panel.js`). `app.js` only wires it up.
- **Entry:** one dialog with a fixed kind or a mixed one, opened from:
  - an **Import MIDI** text link (upload icon) in the Loop footer, before Drums.mid and Chords.mid (mixed). On desktop, dropping `.mid` files anywhere on the page opens it the same way.
  - an **Import** text link (upload icon) at the right of the Drums row's hint line (grooves), and one on the Progression row's (progressions).
- **Dialog:** a native `<dialog>` with `showModal()`. Inside: a drop zone with a **Choose files** button (`<input type="file" multiple accept=".mid,.midi">`), the review list, then **Add N** and **Cancel**. Escape and Cancel close it without adding anything, and focus goes back to the link that opened it.
- **Review rows**, one per file:
  - kind select (Groove · Progression, from `detectKind`), only when mixed. With a fixed kind there's no select, and a file `detectKind` reads as the other kind gets the warning "This looks like a chord file" / "This looks like a drum file" (it can still be added).
  - id (filename)
  - summary: groove = "4/4 · 1 bar · 97–127 BPM"; progression = the chord symbols, plus a **Key** select listing the top 5 candidates (switching it calls `renumber`)
  - warnings in hint text
  - a remove (×) button
  - Files that can't be added (not MIDI, no usable notes, id already in either library, the same id twice in this drop) show why and aren't counted in Add N.
- **Add:** saves to My grooves and My progressions with step 17's helpers, closes the dialog, and shows the toast "Added 2 grooves, 1 progression". When mixed, the current idea doesn't change.
- **Pick after a row import** (SPEC §1, "Picked after a row import"): the first file added becomes the current groove or progression, in one `setIdea()` call (one undo step).
  - A groove in another meter switches the meter too, rerolling an unlocked strum. A locked Meter, or a locked Strum in the old meter, means nothing is picked, with the toast "Added. Switch to 3/4 to use it".
  - A progression also sets Key and Mode to its row's Key select, except where Key or Mode is locked. A locked Bars or Chords it doesn't match means nothing is picked, with the toast "Added. Doesn't fit the locked bars" (or "chords").
  - Put the decision in a pure helper (for example `pickImported(idea, lib, item, kind, locks)` returning the new idea or the reason it can't).
- **Untrusted input:** filenames and anything read from a file go in with `textContent` / `createElement` only. A file that throws is shown as an error row; it never breaks the dialog.
- **Docs:** `scripts/README.md` gets a short "In the app" section at the top (Import MIDI adds to My grooves and My progressions; the scripts are for making one a built-in).
- **Tests:** pure helpers only:
  - building the review rows from file results, with a mixed and a fixed kind (the wrong-kind warning)
  - the Add N count with errors and duplicates
  - `pickImported`: a groove in the same meter; another meter (unlocked, locked Meter, locked Strum); a progression sets Key and Mode, keeps a locked Key or Mode, and is refused by a locked Bars or Chords it doesn't match; a locked Drums or Progression doesn't block it

**Done when:** dropping a mix of my groove and chord files on Import MIDI adds them in one go and leaves the idea alone; importing from the Drums or Progression row picks the first file (switching meter, or setting the key, as SPEC says) and Back undoes it; a chord file on the Drums row shows the warning; a relative-key misread can be fixed with the Key select before adding; bad files show a reason; the new items play from their selects and sync to a second browser; and the dialog works in light, dark, at 360px and on my iPhone (Choose files from Files).

### 19. Loop editing core (pure, no UI)

- [x] Done

The first of five steps that make the Loop editable in place, like a MIDI region in a DAW (SPEC §1, "Editing the loop"). This one is logic only. Nothing on screen changes.

- **Lengths on the pulse:** an idea's chord lengths may now be any whole number of pulses (SPEC §2). A 3/4 beat is a third of a bar, and sums of thirds drift: about 1 in 5 random 3/4 loops added up to 3.9999… bars. Add `sumBars()` (rounds to the nearest 1/48 bar, which is exact in every meter) and use it wherever lengths are added up: `withProgression`, `shapeOf`, `fitsShape`, `validateIdea` (which also snaps each length to the nearest step before checking it), `fingerprint` and `chartText`. The idea shape doesn't change, so there's no `IDEA_VERSION` bump.
- **New pure module `js/progression-editor.js`:**
  - `setChord(prog, i, numeral)`, `moveEdge(prog, i, to, meter)` (the edge after chord i, snapped to the pulse; every chord keeps at least 1 pulse; the loop's last edge is fixed), `deleteChord(prog, i)` (the chord before takes its time, the first chord's goes to the next, never the only chord) and `splitChord(prog, i, meter)` (cut on the pulse nearest the middle; needs 2 pulses; at most 16 chords). An edit keeps a library id as `source` and turns `'generated'` into `'custom'`.
  - `chordChoices(modeKey)` → `{ diatonic, borrowed, extensions }`: the mode's 7 chords, worked out from `MODES[m].steps`; the chords of the parallel major and minor keys that aren't in the mode, without diminished ones, in degree order; and the extensions (Auto · 7 · maj7 · sus2 · sus4 · add9 · 6 · 9; only Auto and 7 on a diminished chord).
  - `findProgression(lib, prog)`: the library entry with the same mode, chords and lengths, or null (like `findGroove`).
  - `snapToMeter(prog, meter)` → `{ progression, dropped }`: edges that miss a whole step in the new meter move to the nearest pulse, and a chord squeezed to nothing merges into the one before.
- **New pure module `js/groove-editor.js`:** `setHit(groove, track, i, mark)` (`x X o .`; adds a missing track), `moveHit(groove, track, from, to)` (onto an empty step), `resizeGroove(groove, meter, bars)` (1, 2, 4 or 8; longer repeats, shorter drops the later bars, like `resizeStrum`), and `patternIndex(step, length)`, which maps a loop step to the pattern cell it repeats (strums use it too).
- **Meter:** `withMeter` runs `snapToMeter` on the progression it keeps.
- **Docs:** add both modules to CLAUDE.md's pure-module list and SPEC §4.
- **Tests:**
  - every edit in every meter, including the limits (1 pulse, the only chord, 16 chords, the fixed last edge)
  - 3/4 thirds survive a JSON round trip and add up to whole bars (seeded, many rolls)
  - a 3/4 → 4/4 change moves only the edges that miss and reports `dropped`; a half-bar progression comes through every meter change unchanged
  - `chordChoices`: 7 diatonic chords for every mode, each in its scale; borrowed chords never repeat a diatonic one and are never diminished; Ionian borrows i ♭III iv v ♭VI ♭VII
  - `findProgression` matches by content, not id
  - edited ideas pass `validateIdea()` unchanged, and old links load as before

**Done when:** tests pass, and the app looks and plays exactly as before.

### 20. Edit chords in the Loop

- [x] Done

Click a chord to change, shorten, lengthen, split or delete it, and drag the edge between two chords to move it. Rules: SPEC §1, "Editing the loop". How it looks: DESIGN §5.18.

- **Shared menu:** move the stroke menu's popover code out of `strum-panel.js` into a new `js/lane-menu.js` (opens under a cell, stays inside its box, arrow keys, Escape, a tap outside closes it). `strum-panel.js` uses it from here on, with no change on screen.
- **New `js/chord-lane.js`** (UI), wired to the timeline. `app.js` only hands it the context and `setIdea()`.
  - Clicking a block plays it (as now) and opens the chord menu: Mode, Borrowed, Extension, then Shorter · Longer · Split · Delete. Each pick is one `setIdea()` and plays the new chord. Items that can't apply are disabled (Split under 2 pulses, Delete on the only chord).
  - Mouse and pen drag the edge between two blocks. The drag is previewed on the grid without calling `setIdea()` (which rebuilds the grid); letting go is one `setIdea()`, and Escape cancels. A touch never starts a drag.
- **Progression row:** the select shows `findProgression`'s entry, otherwise a disabled **Custom** or **Generated** (by source). Remove (step 17) shows only while the progression is an unchanged My progression. Add **Start over** (back to the library progression it came from; disabled when unchanged or gone), as on the Strum row.
- **Meter change:** if `snapToMeter` merged chords, toast "Dropped N chords".
- **Docs:** SPEC §4 (`lane-menu.js`, `chord-lane.js`).
- **Tests:** pure rules only: the select value for a library, an edited and a generated progression; Remove and Start over on the content match; compileLoop and Chords.mid with edited chords.

**Done when:** every menu item and edge drag works and is one Back; edits play on the next pass while the loop runs; they survive a reload, a share link and a Saved idea; Chords.mid matches the screen; and it works in light, dark and at 390px (menus by tap, no drag).

### 21. Edit drums in the Loop

- [x] Done

Add, delete, move and re-weight drum hits in the Loop. Rules: SPEC §1, "Editing the loop". How it looks: DESIGN §5.18.

- **New `js/drum-lane.js`** (UI): click an empty cell to add a hit; click a hit for its menu (Accent · Hit · Ghost · Delete · ← →); mouse and pen drag a hit along its lane onto an empty step (one `setIdea()` on release, Escape cancels).
- **Repeats:** cells past the groove's length are drawn as repeats (DESIGN §5.18: lighter, plus a dashed repeat line). Editing one edits the pattern.
- **Grid:** an 8ths · 16ths control leading the Loop header's controls (DESIGN §5.18). It stays on 16ths while anything sits on a 16th, as now.
- **Drums row:** Length 1 · 2 · 4 · 8 bars (`resizeGroove`) and **Start over** (back to the groove it came from; disabled when unchanged or gone). The select already shows Custom for an edited groove.
- **Cell sizes (tokens):** strum and drum lanes 44px tall; in compact, steps at least 44px wide.
- **Docs:** SPEC §4 (`drum-lane.js`).
- **Tests:** compileLoop, Drums.mid and the fingerprint read an edited groove; strum fit scores it; Start over's rule.

**Done when:** adding, deleting, moving and re-weighting a hit each work and are one Back; a 1-bar groove's repeats change together, and a 2-bar groove's bars can differ; Drums.mid matches the screen; and it works in light, dark and at 390px.

### 22. Edit strums in the Loop

- [x] Done

The strum lane becomes the strum editor, and the Strum row loses its step grid. Rules: SPEC §1, "Editing the loop" and "Strum row and My strums".

- Clicking a strum-lane cell opens the stroke menu (`lane-menu.js`; ↓ ↑ × ·, with D / U / X / . as before). Repeats past the strum's length show as on the drum lanes.
- **Removed from the row:** the steps (`#strumSteps`, the `.ed-bar` / `.ed-cells` / `.ed-step` CSS, `--ed-step-h`, `--ed-cols-*`) and `lineLength()` if nothing else uses it. The select, the length and grid segments, Add to library / Remove and Start over stay.
- **Tests:** update `strum-row.test.js` and `strum-editor.test.js` for what's gone; compileLoop plays a pattern edited from the lane.

**Done when:** strums are edited in the lane only, each pick is one Back, and everything step 14 checked still holds (Add to library, Remove, Start over, length, grid, links, Saved).

### 23. Mini-DAW layout

- [x] Done

With the Loop editable, the page becomes a small DAW: global settings up top, the lanes in the middle. Rules: SPEC §1, "Editing the loop" › Layout. How it looks: DESIGN.md, from a design pass in the browser design chat once steps 20–22 are built and tried, merged into DESIGN.md and tokens.css before this step starts.

**Before this step (design pass B):**

1. Try the editing from steps 20–22 for a while.
2. Open a new chat in Claude in the browser. Attach the current `DESIGN.md`, `tokens.css` and `SPEC.md`, plus screenshots of the app at desktop width and at 390px (one in dark mode). Paste the prompt below.
3. Pick a layout, then paste its answer into a Claude Code session with: "Merge this design pass into DESIGN.md and tokens.css for PLAN step 23. Don't start step 23." Check the merge, then run this step in a fresh session.

```
I've attached the current DESIGN.md, tokens.css and SPEC.md for Song Seed, plus
screenshots. These files replace anything you remember from earlier chats: they've
been updated many times since. You can't edit my files, so give me text that I'll
paste into a coding session, which will merge it in.

The Loop timeline is now editable in place (SPEC §1 "Editing the loop", DESIGN §5.18).
So the page should become a small DAW. Please design that layout (SPEC §1
"Editing the loop" › Layout):

- A strip under the top bar: Key · Mode · Tempo · Meter · Feel, each with its own
  lock and reroll.
- The Loop (timeline), as now.
- Under the timeline, one row per lane, each with its select, lock, reroll and extras:
  - Chords: Progression select, Bars (2·4·8), Chords count, Colour (Plain·Some·Lots),
    Import / Remove, Start over
  - Strum: select, length, 8ths/16ths, Add to library / Remove, Start over
  - Drums: select, Length (1·2·4·8), Import / Remove, Start over
- A locked lane also shows the hatch in the timeline, plus a lock glyph by its name.
- Removed: the Rhythm and Harmony bands and the chord chart (§5.9).
- Melody, then Saved, stay at the bottom (Saved may move later; not now).

Constraints, all from DESIGN.md: paper and ink, no borders or shadows on blocks,
colour only in the timeline, 44px tap targets, never colour alone, no auto-fill /
auto-fit / wrapping grids for cards, rows stay on one line where they fit (I dislike
tall rows with controls stacked in a corner), and 360px to 1440px with no sideways
page scroll (my phone is an iPhone 13, 390px). Every layer keeps its own visible
lock and reroll.

Please:
1. Show 2–3 layout options as mockups (wide and 390px), with a recommendation.
2. Once I pick one, give me:
   - full replacement text for every DESIGN.md section that changes (at least §4 Layout,
     §5.6 Band, §5.7 Layer row and its table, §5.9, and §5.10's header), each under its
     section heading so it can be swapped in whole;
   - any new or changed tokens as a CSS block, saying which theme each goes in;
   - a short list of anything SPEC doesn't cover, so I can decide it.
```

- **Top strip** under the top bar: Key · Mode · Tempo · Meter · Feel, each with its lock and reroll.
- **Lane rows** under the timeline, one each for Chords, Strum and Drums, with its select, lock, reroll and extras:
  - Chords: Progression, Bars, Chords count, Colour, Import / Remove, Start over
  - Strum: length, grid, Add to library / Remove, Start over
  - Drums: length, Import / Remove, Start over
- **Locked lanes** show the hatch in the timeline too, plus a lock glyph by the lane name.
- **Removed:** the Rhythm and Harmony bands, and the chord chart (`#chart`, `renderChart()`, the chart CSS and the `--chart-*` tokens; `chartBars()` stays for `chartText()`).
- Melody stays at the bottom, then Saved. Every lock id stays the same, so saved locks keep working. The keyboard shortcuts and the Import MIDI, Drums.mid and Chords.mid links don't change.
- **Tests:** update `display.test.js` for anything removed; nothing else should change.

**Done when:** every lock and reroll works as before, saved locks load, Tab order follows the new visual order, and the page has no sideways scroll from 360px to 1440px, in light and dark.

### 24. Add edited drums and progressions to the library (optional)

- [x] Done

Like Add to library on the Strum row: save an edited groove to My grooves, or an edited progression to My progressions.

- **Decide before starting, then update SPEC:** the id rule for edited items (My groove and My progression ids are MIDI filenames today), and whether My progressions take pulse lengths (they're meter-free and accept half bars only now).

**Done when:** an edited groove and an edited progression can be added, show under their optgroups, come up in rolls, sync to a second browser, and can be removed.

### 25. Calmer strip and Chords row (can move)

- [x] Done

Step 23's strip and Chords row felt cramped: eleven lock-and-reroll pills, each as heavy as its control, in different places. Rules: SPEC §1 "Editing the loop" › Layout (step 25), DESIGN §4, §5.6–5.8.

- **One pair column:** every layer is label · control · pair, with the pair at the row's right edge. Lane rows are inset by the strip's side padding, so all pairs line up.
- **Quiet pair:** no grey track; plain icons, and a pressed lock is an ink pill.
- **Strip below 1160px:** one row per setting. From 1160px, one row of five cells as before.
- **Chord shape:** Bars, Count and Colour behind a summary on the Chords row, as sub-rows in the same columns. Locked parts show a lock in the summary. Open/closed is a pref.
- **Lock-only:** Meter, Feel, Bars and Count lose their reroll. Colour keeps it (new extensions).
- **No Locked tags.**
- The Loop header, timeline, hint line and MIDI links don't change. Lock ids don't change.
- **Tests:** `shapeSummary()` in `display.test.js`.

**Done when:** every lock works and saved locks load, the remaining rerolls work, all pairs line up at 390px, Tab goes control → lock → reroll, and the page has no sideways scroll from 360px to 1440px, in light and dark.

### 26. Settings toolbar (can move)

- [x] Done

Step 25's strip still pushed the Loop, the hero, below the fold. Key · Mode · Tempo · Meter · Feel become one compact toolbar line, like Logic's LCD. Rules: SPEC §1 "Editing the loop" › Layout (step 26), DESIGN §5.6 "Settings toolbar".

- **Fields:** each shows its value over a small label with a cue (chevron, or up-down arrows on Tempo). One line at every width, 360px to 1440px.
- **Menus:** a click opens the field's menu (the timeline menus' look): the choices, then Lock and Reroll. Meter and Feel are lock-only. Locks and rerolls stay one tap into the menu; a locked field shows the hatch and a lock in its label.
- **Tempo:** no slider. Drag the field up or down, use Up/Down, or type in its menu. One history entry per drag, key hold or typed value. The drums' range is in the menu.
- **Code:** `settings-bar.js` (reuses `lane-menu.js`). The lane rows lose step 25's inset; their pairs sit at the right edge again.
- The Loop and the lane rows don't change otherwise. Lock ids don't change.

**Done when:** the whole timeline is above the fold on an iPhone 13 and at 1200×800; every field's menu, lock and reroll work and saved locks load; a tempo drag is one undo step; no sideways scroll from 360px to 1440px, in light and dark.

### 27. Lane rows as field bars (can move)

- [x] Done

The settings toolbar's model (step 26) for the Drums, Strum and Chords rows. Rules: SPEC §1 "Editing the loop" › Layout (step 27), DESIGN §5.6 "Field bars", §5.7.

- **One line per row:** the main field (the pick: groove, strum glyphs, progression) takes the slack, then Length / Steps / Bars / Count / Colour as fields showing their values.
- **Menus:** the pick's menu lists the library (built-ins, then My items), then Lock · Reroll · Start over · Import / Add to library · [Remove] (two taps). The other fields hold their choices, plus a lock where the layer has one (Bars, Count; Colour also rerolls).
- **Gone:** the selects, the lock-and-reroll pairs, the text links on the rows, and step 25's chord-shape summary (and its `shapeOpen` pref).
- **Code:** `field-bar.js` (a bar of fields and their menus, from step 26's toolbar); `settings-bar.js` uses it; `lane-bars.js` replaces `strum-panel.js` and the rows' code in `app.js`.
- The Loop header, timeline and lock ids don't change.

**Done when:** every pick, length, lock, reroll, Start over, Import, Add to library and Remove works from the menus; saved locks load; each row stays one line from 360px to 1440px, in light and dark.

### 28. A key for the circle of fifths

- [x] Done

The circle's orange and dark dots need a key. Rules: SPEC §1 "Melody panel"; how it looks: DESIGN §5.11 "Key".

- A list under the circle, one line per mark with the mark beside it: Tonic, In the scale, Colour note (not in Ionian), Chord roots in the loop.
- Wording from a pure `circleKey(tonic, modeKey)` in `display.js`; the swatches are drawn in `app.js` with the circle's own classes. New token `--cof-key-swatch`.
- **Tests:** `circleKey` in `display.test.js` (spelling, the colour note's degree, no colour line in Ionian).

**Done when:** the key reads right for G Aeolian, D♭ Lydian and C Ionian, in light and dark, and lines up under the circle at every width from 360px to 1440px.

### My own samples (when I have them, long shot)

- [ ] Done
- Load drum and guitar samples from `samples/` (decode once, keep in memory) and use them in place of the synth voices in `audio.js`. Keep the synth voices as the fallback if a file is missing.
- Guitar samples: record single notes (one every few semitones) rather than whole strummed chords, and pitch-shift between them with `playbackRate`. That keeps every chord and colour playable.
- Keep total sample size small (aim for under 5 MB) since the repo is a public Pages site.

**Done when:** the samples play in place of the synths, and deleting a sample file falls back to the synth with no errors.

---

## Later (not planned yet)

- Sections: a "Section B" button for a chorus related to the verse (`sections[]` and `arrangement` are ready).
- Alternate tunings driving the voicings (`idea.tuning` is reserved).
- Strummed chord MIDI export as an option.
- Rename favourites and add notes to them.
