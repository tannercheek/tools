import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { meterInfo, patternSteps } from '../js/loop.js';
import { writeMidi, PPQ } from '../js/midi.js';
import { DRUM_NOTES } from '../js/export.js';
import { readMidi, grooveFromMidi, formatGroove, markOf } from '../js/midi-import.js';

const STEP = PPQ / 4; // one 16th
const BAR = 16 * STEP; // 4/4

const hit = (tick, note, velocity = 96, duration = STEP) => ({ tick, note, velocity, duration, channel: 10 });
const file = (events, opts = {}) => writeMidi({ bpm: 112, tracks: [{ name: 'drums', events }], ...opts });
const groove = (events, opts) => grooveFromMidi('groove_test_01', file(events, opts));

test('maps GM notes to tracks and lists the ones it skipped', () => {
  const notes = [35, 36, 37, 38, 40, 42, 44, 46, 49, 51, 51];
  const { groove: g, skipped } = groove(notes.map((n, i) => hit(i * STEP, n)));
  assert.deepEqual(g.tracks, {
    kick:   'xx..............',
    snare:  '..xxx...........',
    cymbal: '.....xxx........',
  });
  assert.deepEqual([...skipped], [[49, 1], [51, 2]]);
});

test('note 46 merges into cymbal, and the louder hit wins a shared step', () => {
  const { groove: g, skipped } = groove([hit(0, 42, 60), hit(0, 46, 120), hit(2 * STEP, 46, 40), hit(4 * STEP, 44)]);
  assert.deepEqual(g.tracks, { cymbal: 'X.o.x...........' });
  assert.equal(skipped.size, 0);
});

test('quantizes to the nearest 16th, and the louder of two hits wins', () => {
  const { groove: g } = groove([
    hit(STEP + 50, 36), // late, still step 1
    hit(3 * STEP - 50, 36), // early, step 3
    hit(8 * STEP - 10, 38, 60), hit(8 * STEP + 10, 38, 115), // both on step 8
  ]);
  assert.equal(g.tracks.kick, '.x.x............');
  assert.equal(g.tracks.snare, '........X.......');
});

test('a hit pushed just ahead of the loop end lands on step 0', () => {
  const { groove: g } = groove([hit(4 * STEP, 38), hit(BAR - 20, 36)], { length: BAR });
  assert.equal(g.bars, 1);
  assert.equal(g.tracks.kick, 'x...............');
});

test('velocity marks: ≥ 110 accent, < 50 ghost, otherwise hit', () => {
  assert.deepEqual([127, 110, 109, 50, 49, 1].map(markOf), ['X', 'X', 'x', 'x', 'o', 'o']);
});

test('bars come from the notes, or from a file length on a bar line', () => {
  assert.equal(groove([hit(0, 36), hit(BAR + 4 * STEP, 38)]).groove.bars, 2);
  // a long last note doesn't add a bar
  assert.equal(groove([hit(0, 36), hit(15 * STEP, 42, 96, BAR)]).groove.bars, 1);
  // a 2-bar loop whose second bar is silent
  const { groove: g } = groove([hit(0, 36)], { length: 2 * BAR });
  assert.equal(g.bars, 2);
  assert.equal(g.tracks.kick.length, 32);
  // an odd length gets a warning
  assert.match(groove([hit(2 * BAR, 36)]).warnings.join(), /3 bars/);
});

test('tempo is the file tempo ±15, kept inside 40–220', () => {
  assert.deepEqual(groove([hit(0, 36)]).groove.tempo, { min: 97, max: 127 });
  assert.deepEqual(groove([hit(0, 36)], { bpm: 50 }).groove.tempo, { min: 40, max: 65 });
  assert.deepEqual(groove([hit(0, 36)], { bpm: 215 }).groove.tempo, { min: 200, max: 220 });
});

test('reads the meter from the time signature', () => {
  const { groove: g } = groove([hit(0, 36), hit(6 * STEP, 38)], { meter: '6/8' });
  assert.equal(g.meter, '6/8');
  assert.equal(g.tracks.kick, 'x...........');
});

test('a file with no drum notes is refused', () => {
  assert.throws(() => groove([hit(0, 49)]), /no kick, snare or cymbal/);
  assert.throws(() => grooveFromMidi('x', new Uint8Array([1, 2, 3])), /not a MIDI file/);
});

test('reads format 0 with running status and note-on velocity 0 as note-off', () => {
  const track = [
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, // 120 BPM
    0x00, 0x99, 36, 100, // note on, ch 10
    0x00, 38, 40, // running status: another note on
    0x83, 0x60, 36, 0, // 480 ticks later, velocity 0 = off
    0x00, 38, 0,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const bytes = Uint8Array.from([
    ...[0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0], // MThd, format 0, 480 PPQ
    ...[0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, track.length], ...track,
  ]);
  const mid = readMidi(bytes);
  assert.deepEqual(mid.notes, [{ tick: 0, end: 480, note: 36, velocity: 100, channel: 10 }, { tick: 0, end: 480, note: 38, velocity: 40, channel: 10 }]);
  assert.equal(mid.length, 480);
  const { groove: g } = grooveFromMidi('groove_test_01', bytes);
  assert.equal(g.tracks.kick, 'x...............');
  assert.equal(g.tracks.snare, 'o...............');
});

// Every library groove written out the way Drums .mid does it comes back unchanged.
test('library grooves survive a round trip through MIDI', () => {
  const velocity = { X: 120, x: 96, o: 45 };
  for (const g of LIB.grooves) {
    const events = Object.entries(g.tracks).flatMap(([t, s]) =>
      patternSteps(s, g.res).flatMap((c, step) => (c ? [hit(step * STEP, DRUM_NOTES[t], velocity[c])] : [])));
    const length = g.bars * meterInfo(g.meter).stepsPerBar * STEP;
    const back = grooveFromMidi(g.id, writeMidi({ bpm: 100, meter: g.meter, length, tracks: [{ name: g.id, events }] })).groove;
    assert.equal(back.bars, g.bars, g.id);
    assert.equal(back.meter, g.meter, g.id);
    for (const [t, s] of Object.entries(g.tracks)) {
      if (s.includes('x') || s.includes('X') || s.includes('o')) assert.equal(back.tracks[t], s, `${g.id}.${t}`);
    }
  }
});

test('printed entries are valid JS that pass the library checks', async () => {
  const results = [
    groove([hit(0, 36, 120), hit(4 * STEP, 38), hit(6 * STEP, 49), ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => hit(s * STEP, 42, 40))]),
    grooveFromMidi('groove_two_bar_01', file([hit(0, 36), hit(18 * STEP, 38)], { meter: '3/4' })),
  ];
  const text = results.map((r) => formatGroove(r, new Set(['groove_two_bar_01']))).join('\n');
  assert.match(text, /\/\/ groove_test_01: skipped notes: 49 ×1/);
  assert.match(text, /\/\/ groove_two_bar_01: this id is already in grooves.js/);
  assert.match(text, /tags: \[\], \/\/ check \(file is 112 BPM\)/);

  const { default: pasted } = await import(`data:text/javascript,${encodeURIComponent(`export default [\n${text}\n];`)}`);
  assert.deepEqual(pasted, results.map((r) => r.groove));
  for (const g of pasted) {
    const m = meterInfo(g.meter);
    assert.ok(g.tempo.min < g.tempo.max);
    assert.match(g.id, /^groove_[a-z0-9]+(_[a-z0-9]+)*_\d{2}$/);
    for (const s of Object.values(g.tracks)) {
      assert.equal(s.length, g.bars * m.beats * (g.res / m.unit));
      assert.match(s, /^[xXo.]+$/);
    }
  }
  assert.equal(pasted[1].bars, 2);
});

test('flags a filename that does not match the pack naming', () => {
  const r = grooveFromMidi('My Groove', file([hit(0, 36)]));
  assert.match(formatGroove(r), /id doesn't match groove_words_NN/);
});
