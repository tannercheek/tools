import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeMidi, PPQ } from '../js/midi.js';
import { chordFor, guitarVoicing, parseNumeral, MODES, MODE_ORDER, notePc } from '../js/theory.js';
import { readMidi, detectKind, progressionFromMidi, renumber } from '../js/midi-import.js';

const BAR = 4 * PPQ; // 4/4
const STEP = PPQ / 4;

// Block chords, one bar each, in `tonic`.
function chordFile(numerals, tonic) {
  const events = numerals.flatMap((n, i) => {
    const c = chordFor(n, tonic);
    return guitarVoicing(c.rootPc, c.intervals).map((note) => ({ tick: i * BAR, note, velocity: 90, duration: BAR, channel: 1 }));
  });
  return writeMidi({ bpm: 100, length: numerals.length * BAR, tracks: [{ name: 'chords', events }] });
}
// Kick, snare and hat on 8ths, on `channel`.
const drumFile = (channel) => writeMidi({
  bpm: 112,
  tracks: [{ name: 'drums', events: [36, 42, 38, 42].map((note, i) => ({ tick: i * 2 * STEP, note, velocity: 96, duration: STEP, channel })) }],
});

// The progression rules from tests/data.test.js.
function checkProgression(p) {
  assert.ok(MODES[p.mode], `unknown mode ${p.mode}`);
  assert.equal(p.chords.length, p.bars.length);
  for (const c of p.chords) assert.ok(parseNumeral(c), `can't read ${c}`);
  assert.ok([2, 4, 8].includes(p.bars.reduce((a, b) => a + b, 0)));
  for (const b of p.bars) assert.ok(Number.isInteger(b * 2) && b > 0);
}

test('detectKind: a filename prefix decides first', () => {
  assert.equal(detectKind('groove_odd_01.mid', readMidi(chordFile(['I', 'IV'], 'C'))), 'groove');
  assert.equal(detectKind('prog_odd_01.mid', readMidi(drumFile(10))), 'progression');
  assert.equal(detectKind('GROOVE_Upper_01.mid', readMidi(chordFile(['I', 'IV'], 'C'))), 'groove');
});

test('detectKind: without a prefix, drum files are grooves and chord files progressions', () => {
  assert.equal(detectKind('Beat 3.mid', readMidi(drumFile(10))), 'groove');
  assert.equal(detectKind('Beat 3.mid', readMidi(drumFile(1))), 'groove', 'only GM drum notes, off channel 10');
  assert.equal(detectKind('Verse chords.mid', readMidi(chordFile(['i', 'bVI', 'bIII', 'bVII'], 'A'))), 'progression');
});

test('guessKey candidates: every key, best first, led by the main pick', () => {
  const r = progressionFromMidi('prog_test_01', chordFile(['vi', 'IV', 'I', 'V'], 'C'));
  assert.equal(r.key, 'A minor');
  assert.equal(r.candidates.length, 12 * MODE_ORDER.length);
  assert.deepEqual({ ...r.candidates[0], score: undefined }, { tonic: 'A', tonicPc: notePc('A'), mode: 'aeolian', score: undefined });
  r.candidates.slice(1).forEach((c, i) => assert.ok(c.score <= r.candidates[i].score, 'sorted best first'));
  const top3 = r.candidates.slice(0, 3).map((c) => `${c.tonic} ${c.mode}`);
  assert.ok(top3.includes('C ionian'), `relative key in the top 3: ${top3}`);
});

test('progressionFromMidi returns its chords', () => {
  const r = progressionFromMidi('prog_test_01', chordFile(['vi', 'IV', 'I', 'V'], 'C'));
  assert.deepEqual(r.chords, [
    { rootPc: notePc('A'), quality: 'min', ext: null, bars: 1 },
    { rootPc: notePc('F'), quality: 'maj', ext: null, bars: 1 },
    { rootPc: notePc('C'), quality: 'maj', ext: null, bars: 1 },
    { rootPc: notePc('G'), quality: 'maj', ext: null, bars: 1 },
  ]);
});

test('renumber switches a misread relative key', () => {
  const r = progressionFromMidi('prog_test_01', chordFile(['vi', 'IV', 'I', 'V'], 'C'));
  assert.deepEqual(r.progression.chords, ['i', 'bVI', 'bIII', 'bVII']);
  const c = renumber(r, notePc('C'), 'ionian');
  assert.deepEqual(c.progression, { id: 'prog_test_01', mode: 'ionian', chords: ['vi', 'IV', 'I', 'V'], bars: [1, 1, 1, 1] });
  assert.equal(c.key, 'C major');
  assert.deepEqual(c.symbols, ['Am', 'F', 'C', 'G']);
  checkProgression(c.progression);
  // and back again, without touching the original
  assert.deepEqual(renumber(c, notePc('A'), 'aeolian').progression, r.progression);
  assert.equal(r.progression.mode, 'aeolian');
});

test('renumber spells numerals and symbols for the new key', () => {
  const r = progressionFromMidi('prog_test_01', chordFile(['I', 'II', 'IV', 'I'], 'D'));
  const lyd = renumber(r, notePc('D'), 'lydian');
  assert.deepEqual(lyd.progression.chords, ['I', 'II', 'IV', 'I']);
  assert.deepEqual(lyd.symbols, ['D', 'E', 'G', 'D']);
  checkProgression(lyd.progression);
  const flat = renumber(progressionFromMidi('prog_test_01', chordFile(['I', 'IV'], 'Db')), notePc('Db'), 'ionian');
  assert.deepEqual(flat.symbols, ['Db', 'Gb']);
});
