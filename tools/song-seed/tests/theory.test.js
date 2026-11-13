import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chordFor, scaleNotes, parseNumeral, guitarVoicing, colorize, chordIntervals, MODES, MODE_ORDER, mod12, nameInKey,
  circleOfFifths, TONICS, notePc,
} from '../js/theory.js';
import { LIB } from '../js/library.js';
import { compileLoop } from '../js/loop.js';
import { strumFrom } from '../js/strum-editor.js';
import { blankIdea, withProgression, withSection, grooveFrom } from '../js/idea.js';

test('numerals spell the right chord in any key', () => {
  const cases = [
    ['bVII', 'D', 'C'], ['IV', 'Eb', 'Ab'], ['vi', 'C', 'Am'], ['ii', 'F', 'Gm'],
    ['bVI', 'A', 'F'], ['II', 'C', 'D'], ['Imaj7', 'C', 'Cmaj7'], ['v7', 'D', 'Am7'],
    ['i°', 'B', 'Bdim'], ['bII', 'E', 'F'], ['Isus2', 'D', 'Dsus2'], ['iadd9', 'E', 'Emadd9'],
    ['bVII', 'F#', 'E'], ['iv', 'Bb', 'Ebm'], ['bIII', 'A', 'C'],
  ];
  for (const [n, key, want] of cases) assert.equal(chordFor(n, key).symbol, want, `${n} in ${key}`);
});

test('bad numerals are rejected', () => {
  for (const bad of ['', 'VIII', 'Im', 'x', 'I7b9', 'bb2']) assert.equal(parseNumeral(bad), null, bad);
});

test('scales are spelled with one letter per degree', () => {
  assert.deepEqual(scaleNotes('D', 'dorian'), ['D', 'E', 'F', 'G', 'A', 'B', 'C']);
  assert.deepEqual(scaleNotes('Bb', 'aeolian'), ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab']);
  assert.deepEqual(scaleNotes('F', 'lydian'), ['F', 'G', 'A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(scaleNotes('E', 'phrygian'), ['E', 'F', 'G', 'A', 'B', 'C', 'D']);
  // F# major's E# falls back to the friendlier F
  assert.deepEqual(scaleNotes('F#', 'ionian'), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F']);
});

test('nameInKey prefers the key’s spelling', () => {
  assert.equal(nameInKey(10, 'D', 'ionian'), 'A#');
  assert.equal(nameInKey(10, 'F', 'ionian'), 'Bb');
  assert.equal(nameInKey(5, 'D', 'dorian'), 'F');
});

test('every mode pool chord is diatonic to its mode', () => {
  for (const key of MODE_ORDER) {
    const mode = MODES[key];
    const scale = new Set(mode.steps);
    for (const n of Object.keys(mode.pool)) {
      const p = parseNumeral(n);
      assert.ok(p, `${key}: ${n}`);
      for (const iv of chordIntervals(p.quality, null)) {
        assert.ok(scale.has(mod12(p.offset + iv)), `${key}: ${n} is not diatonic`);
      }
    }
    for (const s of mode.signature) assert.ok(s in mode.pool, `${key}: signature ${s} not in pool`);
    assert.ok(mode.tonic in mode.pool, `${key}: tonic not in pool`);
  }
});

test('voicings look like open guitar chords', () => {
  const v = (n, key) => { const c = chordFor(n, key); return guitarVoicing(c.rootPc, c.intervals); };
  assert.deepEqual(v('I', 'E'), [40, 47, 52, 56, 59, 64]);
  assert.deepEqual(v('i', 'A'), [45, 52, 57, 60, 64, 69]);
  for (const key of ['C', 'Eb', 'F#', 'B']) {
    for (const n of ['I', 'ii', 'Imaj7', 'iadd9', 'Isus4', 'vii°']) {
      const notes = v(n, key);
      assert.ok(notes.length >= 4 && notes.length <= 6, `${n} in ${key}`);
      assert.ok(notes[0] >= 40 && notes[0] <= 51 && notes.at(-1) <= 79);
      for (let i = 1; i < notes.length; i++) assert.ok(notes[i] - notes[i - 1] >= 2);
      const c = chordFor(n, key);
      for (const pc of c.pcs) assert.ok(notes.some((m) => mod12(m) === pc), `${n} in ${key} is missing a chord tone`);
    }
  }
});

test('colour only adds notes from the mode', () => {
  const nums = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII', 'iv', 'i', 'bII', 'II'];
  assert.deepEqual(colorize(nums, 'ionian', 0, 5), nums);
  for (const mode of MODE_ORDER) {
    const scale = new Set(MODES[mode].steps);
    for (let seed = 0; seed < 40; seed++) {
      const out = colorize(nums, mode, 2, seed);
      out.forEach((n, i) => {
        const p = parseNumeral(n);
        assert.ok(p);
        if (n === nums[i]) return;
        const base = chordIntervals(p.quality, null);
        for (const x of chordIntervals(p.quality, p.ext).filter((y) => !base.includes(y))) {
          assert.ok(scale.has(mod12(p.offset + x)), `${mode}: ${n} adds a clashing note`);
        }
      });
    }
  }
  assert.deepEqual(colorize(['Imaj7'], 'ionian', 2, 1), ['Imaj7']);
  assert.deepEqual(colorize(nums, 'ionian', 1, 9), colorize(nums, 'ionian', 1, 9)); // deterministic
});

// ---------- circle of fifths (PLAN step 10) ----------

// A one-chord-per-bar loop of these numerals, on the first 4/4 groove and strum.
function loopWith(chords, { tonic = 'C', mode = 'ionian', level = 0, seed = 1 } = {}) {
  const groove = LIB.grooves.find((g) => g.meter === '4/4');
  const strum = LIB.strums.find((s) => s.meter === '4/4');
  let idea = { ...blankIdea(), key: { tonic, mode } };
  idea = withSection(idea, { groove: grooveFrom(groove), strum: strumFrom(strum), color: { level, seed } });
  idea = withProgression(idea, { source: 'generated', mode, chords, bars: chords.map(() => 1) });
  return compileLoop(idea, LIB);
}

test('circle runs in fifths from C', () => {
  assert.deepEqual(circleOfFifths('C', 'ionian').map((e) => e.pc), [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
});

test('scale notes form 7 consecutive entries, with the tonic and colour note among them', () => {
  for (const tonic of TONICS) {
    for (const mode of MODE_ORDER) {
      const why = `${tonic} ${mode}`;
      const c = circleOfFifths(tonic, mode);
      assert.equal(c.filter((e) => e.inScale).length, 7, why);
      // exactly one place where the arc starts going clockwise
      const starts = c.filter((e, i) => e.inScale && !c[(i + 11) % 12].inScale).length;
      assert.equal(starts, 1, `${why}: scale notes are not one arc`);
      assert.deepEqual(c.filter((e) => e.isTonic).map((e) => e.pc), [notePc(tonic)], why);
      assert.ok(c.find((e) => e.isTonic).inScale, why);
      const colour = c.filter((e) => e.isColour);
      assert.equal(colour.length, MODES[mode].colour ? 1 : 0, why);
      if (colour.length) assert.ok(colour[0].inScale, why);
      // scale notes keep the scale row's spelling
      assert.deepEqual(new Set(c.filter((e) => e.inScale).map((e) => e.name)), new Set(scaleNotes(tonic, mode)), why);
    }
  }
});

test('circle names are spelled for the key', () => {
  assert.equal(circleOfFifths('Db', 'ionian').find((e) => e.pc === 6).name, 'Gb');
  assert.equal(circleOfFifths('D', 'ionian').find((e) => e.pc === 6).name, 'F#');
  assert.equal(circleOfFifths('F', 'ionian').find((e) => e.pc === 10).name, 'Bb');
});

test('a borrowed chord roots outside the scale arc', () => {
  const loop = loopWith(['I', 'bVII', 'IV', 'I']);
  const c = circleOfFifths('C', 'ionian', loop.chords);
  const bb = c.find((e) => e.pc === 10);
  assert.equal(bb.inScale, false);
  assert.deepEqual(bb.chordIdx, [1]);
});

test('chordIdx matches the loop’s chords, and colour keeps the roots', () => {
  const nums = ['i', 'IV', 'i', 'bVII', 'v', 'bIII'];
  const plain = circleOfFifths('D', 'dorian', loopWith(nums, { tonic: 'D', mode: 'dorian' }).chords);
  const byPc = (c) => Object.fromEntries(c.map((e) => [e.pc, e.chordIdx]));
  assert.deepEqual(byPc(plain), {
    0: [3], 7: [1], 2: [0, 2], 9: [4], 4: [], 11: [], 6: [], 1: [], 8: [], 3: [], 10: [], 5: [5],
  });
  for (let seed = 0; seed < 20; seed++) {
    const loop = loopWith(nums, { tonic: 'D', mode: 'dorian', level: 2, seed });
    assert.deepEqual(byPc(circleOfFifths('D', 'dorian', loop.chords)), byPc(plain), `seed ${seed}`);
  }
  // every chord shows up exactly once
  assert.deepEqual(plain.flatMap((e) => e.chordIdx).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});
