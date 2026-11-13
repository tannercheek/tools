import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, seededRng } from '../js/randomize.js';
import { blankIdea } from '../js/idea.js';
import { compileLoop, meterInfo } from '../js/loop.js';
import { writeMidi, PPQ } from '../js/midi.js';
import { chordsMidi } from '../js/export.js';
import { chordFor, guitarVoicing, notePc, parseNumeral, MODES, TONICS } from '../js/theory.js';
import { nameChord, guessKey, numeralFor, progressionFromMidi, formatProgression } from '../js/midi-import.js';

const BAR = 4 * PPQ; // 4/4
const pcsOf = (...names) => new Set(names.map(notePc));
const label = (c) => `${TONICS[c.rootPc]} ${c.quality} ${c.ext ?? ''}`.trim();

// Block chords: each numeral's guitar voicing held for its bars, in `tonic`.
function chordFile(numerals, bars, { tonic = 'D', meter = '4/4', length } = {}) {
  const barTicks = meterInfo(meter).stepsPerBar * (PPQ / 4);
  let tick = 0;
  const events = numerals.flatMap((n, i) => {
    const c = chordFor(n, tonic);
    const duration = bars[i] * barTicks;
    const out = guitarVoicing(c.rootPc, c.intervals).map((note) => ({ tick, note, velocity: 90, duration, channel: 1 }));
    tick += duration;
    return out;
  });
  return writeMidi({ bpm: 100, meter, length: length ?? tick, tracks: [{ name: 'chords', events }] });
}
const note = (tick, n, duration = BAR, channel = 1) => ({ tick, note: n, velocity: 90, duration, channel });
const notesFile = (events, opts = {}) => writeMidi({ bpm: 100, tracks: [{ name: 'chords', events }], ...opts });
const imported = (bytes) => progressionFromMidi('prog_test_01', bytes);

// The absolute chords a progression plays in a key (root + notes), so two
// spellings of the same loop in relative keys compare equal.
const sounds = (chords, tonic) => chords.map((n) => {
  const c = chordFor(n, tonic);
  return `${c.rootPc}:${[...c.pcs].sort((a, b) => a - b)}`;
});

test('names triads, sevenths, sus and diminished chords', () => {
  const cases = [
    [['C', 'E', 'G'], 'C', 'C maj'],
    [['A', 'C', 'E'], 'A', 'A min'],
    [['B', 'D', 'F'], 'B', 'B dim'],
    [['D', 'E', 'A'], 'D', 'D maj sus2'],
    [['D', 'G', 'A'], 'D', 'D maj sus4'],
    [['G', 'B', 'D', 'F'], 'G', 'G maj 7'],
    [['D', 'F', 'A', 'C'], 'D', 'D min 7'],
    [['F', 'A', 'C', 'E'], 'F', 'F maj maj7'],
    [['B', 'D', 'F', 'A'], 'B', 'B dim 7'],
    [['C', 'E', 'G', 'D'], 'C', 'C maj add9'],
    [['A', 'C', 'E', 'G', 'B'], 'A', 'A min 9'],
    [['G', 'B', 'F'], 'G', 'G maj 7'], // no 5th
  ];
  for (const [notes, bass, want] of cases) {
    const c = nameChord(pcsOf(...notes), notePc(bass));
    assert.equal(label(c), want, notes.join(' '));
    assert.ok(c.exact, notes.join(' '));
  }
});

test('the bass note decides between chords with the same notes', () => {
  assert.equal(label(nameChord(pcsOf('C', 'E', 'G', 'A'), notePc('A'))), 'A min 7');
  assert.equal(label(nameChord(pcsOf('C', 'E', 'G', 'A'), notePc('C'))), 'C maj 6');
});

test('notes no numeral can spell get the closest chord, marked inexact', () => {
  const c = nameChord(pcsOf('C', 'G'), notePc('C')); // a power chord
  assert.equal(label(c), 'C maj');
  assert.equal(c.exact, false);
});

test('guesses the key from the chords', () => {
  const key = (symbols) => {
    const chords = symbols.map(([root, quality]) => ({ rootPc: notePc(root), quality, ext: null, bars: 1 }))
      .map((c) => ({ ...c, pcs: nameChord(new Set([c.rootPc, (c.rootPc + (c.quality === 'maj' ? 4 : 3)) % 12, (c.rootPc + 7) % 12]), c.rootPc).pcs }));
    const k = guessKey(chords);
    return `${k.tonic} ${k.mode}`;
  };
  assert.equal(key([['C', 'maj'], ['G', 'maj'], ['A', 'min'], ['F', 'maj']]), 'C ionian');
  assert.equal(key([['A', 'min'], ['F', 'maj'], ['C', 'maj'], ['G', 'maj']]), 'A aeolian');
  assert.equal(key([['D', 'min'], ['G', 'maj'], ['D', 'min'], ['C', 'maj']]), 'D dorian');
  assert.equal(key([['G', 'maj'], ['F', 'maj'], ['C', 'maj'], ['G', 'maj']]), 'G mixolydian');
  assert.equal(key([['E', 'min'], ['F', 'maj']]), 'E phrygian');
  assert.equal(key([['F', 'maj'], ['G', 'maj']]), 'F lydian');
  // the tonic is spelled the usual way for the key
  assert.equal(key([['C#', 'min'], ['A', 'maj'], ['E', 'maj'], ['B', 'maj']]), 'C# aeolian');
  assert.equal(key([['Db', 'maj'], ['Gb', 'maj']]), 'Db ionian');
});

test('numerals follow the major scale of the tonic', () => {
  const at = (root, quality, ext = null, mode = 'aeolian') => numeralFor({ rootPc: notePc(root), quality, ext }, notePc('A'), mode);
  assert.equal(at('A', 'min'), 'i');
  assert.equal(at('F', 'maj'), 'bVI');
  assert.equal(at('G', 'maj', '7'), 'bVII7');
  assert.equal(at('B', 'dim'), 'ii°');
  assert.equal(at('D#', 'maj', null, 'locrian'), 'bV');
  assert.equal(at('D#', 'maj', null, 'lydian'), '#IV');
});

test('every library progression comes back with the same chords and bars', () => {
  let sameMode = 0;
  let onTonic = 0;
  for (const p of LIB.progressions) {
    const startsOnTonic = parseNumeral(p.chords[0]).base === MODES[p.mode].tonic;
    if (startsOnTonic) onTonic++;
    for (const tonic of ['D', 'Ab']) {
      // the loop's tonic in this key, so the guessed key can be compared
      const { progression: got, key } = imported(chordFile(p.chords, p.bars, { tonic }));
      const gotTonic = key.split(' ')[0];
      assert.deepEqual(got.bars, p.bars, p.id);
      assert.deepEqual(sounds(got.chords, gotTonic), sounds(p.chords, tonic), `${p.id} in ${tonic}`);
      for (const c of got.chords) assert.ok(parseNumeral(c), `${p.id}: ${c}`);
      if (startsOnTonic && tonic === 'D' && got.mode === p.mode && gotTonic === 'D') sameMode++;
    }
  }
  // Progressions that start away from their tonic (vi IV I V) read as the relative key, so only those that start on it count.
  assert.equal(sameMode, onTonic, `${sameMode} of ${onTonic} that start on the tonic guessed right`);
});

test('the app\'s own chord export comes back as the coloured chords it plays', () => {
  const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
  for (let seed = 1; seed <= 40; seed++) {
    const idea = rollAll(blankIdea(), none, LIB, seededRng(seed));
    const loop = compileLoop(idea, LIB);
    const { progression: got, key } = imported(chordsMidi(idea, loop).bytes);
    const tonic = key.split(' ')[0];
    const want = loop.chords.map((c) => `${c.rootPc}:${[...c.pcs].sort((a, b) => a - b)}`);
    assert.deepEqual(sounds(got.chords, tonic), want, `seed ${seed}`);
    assert.deepEqual(got.bars, idea.sections[0].progression.bars, `seed ${seed}`);
  }
});

test('a re-struck chord, a bass note before its chord and a pushed chord each count once', () => {
  const D = [50, 57, 62, 65], G = [43, 50, 55, 59]; // Dm, G
  const { progression: p, warnings } = imported(notesFile([
    // Dm struck on every beat of bar 1
    ...[0, 1, 2, 3].flatMap((b) => D.map((n) => note(b * PPQ, n, PPQ))),
    // bar 2: G's bass alone, then the rest an 8th later
    note(BAR, 43), ...G.slice(1).map((n) => note(BAR + PPQ / 2, n, BAR - PPQ / 2)),
    // bar 3: Dm pushed an 8th early, top notes re-struck on beat 3
    ...D.map((n) => note(2 * BAR - PPQ / 2, n, BAR)), ...D.slice(2).map((n) => note(2 * BAR + 2 * PPQ, n, 2 * PPQ)),
    // bar 4: C
    ...[48, 55, 60, 64].map((n) => note(3 * BAR, n)),
  ]));
  assert.equal(p.mode, 'dorian');
  assert.deepEqual(p.chords, ['i', 'IV', 'i', 'bVII']);
  assert.deepEqual(p.bars, [1, 1, 1, 1]);
  assert.deepEqual(warnings, []);
});

test('half-bar chords and a held chord keep their lengths', () => {
  const { progression: p } = imported(chordFile(['i', 'bVI', 'bIII', 'bVII', 'v'], [2, 1, 0.5, 0.5, 4], { tonic: 'E' }));
  assert.deepEqual(p.bars, [2, 1, 0.5, 0.5, 4]);
});

test('bars come from the notes, or from a file length on a bar line', () => {
  // a 4-bar loop whose last bar is silent
  assert.deepEqual(imported(chordFile(['i', 'IV', 'bVII'], [1, 1, 1], { length: 4 * BAR })).progression.bars, [1, 1, 2]);
  // a 3-bar loop gets a warning
  assert.match(imported(chordFile(['i', 'IV', 'bVII'], [1, 1, 1])).warnings.join(), /3 bars/);
});

test('bars are read in the file\'s meter', () => {
  const { progression: p } = imported(chordFile(['i', 'bVI', 'bIII', 'bVII'], [1, 1, 1, 1], { meter: '6/8', tonic: 'A' }));
  assert.deepEqual(p.bars, [1, 1, 1, 1]);
  assert.deepEqual(p.chords, ['i', 'bVI', 'bIII', 'bVII']);
});

test('warns about drums, a late start, odd notes and long progressions', () => {
  const w = (bytes) => imported(bytes).warnings.join(' / ');
  const D = [50, 57, 62, 65], C = [48, 55, 60, 64];
  assert.match(w(notesFile([...D.map((n) => note(0, n)), note(0, 36, 120, 10), ...C.map((n) => note(BAR, n))], { length: 2 * BAR })), /drum channel/);
  assert.match(w(notesFile([...D.map((n) => note(BAR, n)), ...C.map((n) => note(2 * BAR, n))], { length: 4 * BAR })), /nothing starts on bar 1/);
  assert.match(w(notesFile([note(0, 50), note(0, 57), ...C.map((n) => note(BAR, n))], { length: 2 * BAR })), /bar 1: heard D A, written as/);
  const nine = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'IV', 'V', 'I'];
  assert.match(w(chordFile(nine, [1, 1, 1, 1, 1, 1, 1, 0.5, 0.5])), /9 chords/);
  assert.throws(() => imported(notesFile([note(0, 36, 120, 10)])), /no notes/);
});

test('the printed entry is one line that matches the library format', () => {
  const result = imported(chordFile(['i', 'IV'], [2, 2]));
  const text = formatProgression(result, new Set(['prog_test_01']));
  const lines = text.split('\n');
  assert.match(lines.at(-1), /^ {2}\{ id: 'prog_test_01', mode: 'dorian', chords: \['i', 'IV'\], bars: \[2, 2\] \},$/);
  assert.match(text, /guessed D Dorian \(check\): Dm G/);
  assert.match(text, /already in progressions\.js/);
  assert.match(formatProgression({ ...result, progression: { ...result.progression, id: 'My Chords' } }), /rename the file/);
  // the entry passes the same checks as tests/data.test.js
  const p = result.progression;
  assert.ok(MODES[p.mode]);
  assert.equal(p.chords.length, p.bars.length);
  assert.ok([2, 4, 8].includes(p.bars.reduce((a, b) => a + b, 0)));
});
