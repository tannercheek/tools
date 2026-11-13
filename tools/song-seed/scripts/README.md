# Song Seed — import scripts

## In the app

**Import MIDI** (under the loop, or **Import** on the Drums and Progression rows) reads the same MIDI files with the same rules as these scripts, and adds them to **My grooves** and **My progressions**. Those sync like Saved ideas and come up in rolls. Dropping `.mid` files on the page opens it too. No terminal, no pasting. See SPEC §1, "Import MIDI".

Use the scripts below when you want an import to become a **built-in**, in `js/data/*.js`, with tags and a checked tempo range.

These scripts turn MIDI files from Logic into library entries, so the app can roll my own grooves and progressions. Each script reads a folder of `.mid` files and **prints** entries to paste into a data file. It never edits the data files itself.

| Library | Script | Paste into | Status |
|---|---|---|---|
| Drum grooves | `import-grooves.mjs` | `js/data/grooves.js` | Done (PLAN step 5) |
| Chord progressions | `import-progressions.mjs` | `js/data/progressions.js` | Done (PLAN step 11) |
| Strum patterns | none: edit them on the Strum row in the app | My strums (synced), or `js/data/strums.js` by hand | Done (PLAN steps 12 and 14) |

## Every time

1. **Export from Logic.** Select the region and choose **File → Export → Selection as MIDI File…**. Export one pattern per file, starting on bar 1, and trim the region to the loop's length.
2. **Name the file after its id.** The id is the filename without `.mid`, and it must match the pack naming: `groove_words_NN.mid` or `prog_words_NN.mid`, in lower case with underscores and a two-digit number (`groove_straight_push_02.mid`, `prog_dorian_float_02.mid`). Never reuse or rename an id that's already in the library, because saved favourites point at it.
3. **Run the script** from `tools/song-seed/` (Node 18 or newer, no install needed):
   ```sh
   node scripts/import-grooves.mjs ~/Desktop/my-grooves
   node scripts/import-progressions.mjs ~/Desktop/my-chords
   ```
   To save the output to a file instead, add `> out.txt`. The "N of M files" summary still prints in the terminal.
4. **Read the `// <id>: …` comments** above each entry, fix what they point out, then delete them.
5. **Paste the entries** into the data file's list and run `npm test`. `tests/data.test.js` catches bad lengths, characters, ids and numerals.
6. **Check them in the app** (`python3 -m http.server` from the repo root, then `localhost:8000/tools/song-seed/`). Pick the new pattern from its list and listen.

## Grooves: `import-grooves.mjs`

```sh
node scripts/import-grooves.mjs <folder>
```

- **Drum notes** use General MIDI: 35/36 → kick, 37/38/40 → snare, and every hi-hat (42, 44, 46) → cymbal. Any other notes (crash, ride, toms) are skipped and listed in a comment.
- **Timing** is quantized to 16ths. If two hits land on the same step, the louder one wins. A hit pushed just ahead of the loop's end counts as step 1.
- **Velocity:** 110 and up → `X` (accent), under 50 → `o` (ghost), anything else → `x`.
- **Meter and bars** come from the file's time signature and length. A loop that ends in silence keeps its full length, as long as the region ends on a bar line.
- **Tempo** is the file's tempo ±15 and is marked `// check`. Set the range the groove actually works in.
- **Tags** are left empty for you to fill in.

## Chord progressions: `import-progressions.mjs`

```sh
node scripts/import-progressions.mjs <folder>
```

- **Block chords work best:** one chord at a time, on whole or half bars. Rhythmic parts are fine too. Re-struck chords, a bass note just before its chord, and chords pushed a little early all count once.
- **Chords per half bar:** the shortest a library chord can be is half a bar, so the notes in each half bar are read as one chord. Two chord changes inside one half bar can't be stored, and show up as a "heard …" warning.
- **Chord names** are limited to what the numerals can spell: major, minor and `°` triads, plus `maj7, 7, 9, 6, add9, sus2, sus4` (minor versions too, and `m7b5`). Anything else gets the closest chord and a warning. Inversions aren't kept; the bass note only decides between chords with the same notes (C E G A over A is Am7, over C it's C6).
- **The key is guessed.** A MIDI file doesn't say what key it's in, so the script guesses the tonic and mode from the chords. Each entry gets a line like:
  ```
  // prog_dorian_float_02: guessed D Dorian (check): Dm G Dm C
  ```
  Check the key and the chord names. Major and its relative minor use the same notes, so a loop that starts away from its tonic reads as the relative key. For example, `Am F C G` is guessed as A minor. If you meant C major, rewrite that entry's `mode` and numerals by hand.
- **Mode in the name:** the filename doesn't change the guess. Rename the file to match the mode you settle on (`prog_<mode>_<words>_NN`), as the existing ids do.
- **Warnings** appear when the bars don't add up to 2, 4 or 8, when there's only 1 chord or more than 8, when nothing starts on bar 1, or when drum-channel (10) notes were skipped.
- **Weight** is left out (default 1). Add `weight: 2` to have a progression picked more often.

## Strum patterns: the Strum row (no script)

Strums don't come from MIDI files. They're written in the app instead (PLAN step 14, SPEC §1 "Strum row and My strums"):

1. Pick the drums you want it to sit on, and a strum to start from.
2. Tap each step on the Strum row and pick ↓ ↑ × or ·. Set 1 or 2 bars, and 8ths or 16ths. The loop plays each change straight away, and Back undoes it.
3. Press **Add to library**. The pattern joins **My strums**, which sync like Saved ideas and come up in rolls.

There's no entry to copy any more. To make a My strum a built-in one, type it into the `STRUMS` list in `js/data/strums.js` with a `strum_words_NN` id and tags, and run `npm test`.

## Tests

The scripts' own tests are `tests/import-grooves.test.js` and `tests/import-progressions.test.js`. Run them with the rest using `npm test` in `tools/song-seed/`.
