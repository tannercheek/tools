// Editing drums in the Loop (PLAN step 21): the pure rules behind the drum
// lanes and the Drums row, and everything that reads an edited groove. The
// lanes themselves (drum-lane.js) are UI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { LAYERS, rollAll, withMeter, seededRng, strumFit } from '../js/randomize.js';
import { blankIdea, withSection, withProgression, grooveFrom } from '../js/idea.js';
import { VELOCITY, compileLoop } from '../js/loop.js';
import { drumEvents, drumsMidi, DRUM_NOTES, TICKS_PER_STEP } from '../js/export.js';
import { fingerprint } from '../js/display.js';
import { strumFrom } from '../js/strum-editor.js';
import { readTracks } from './midi-reader.js';
import { setHit, moveHit, resizeGroove, cellAt, shiftHit, startOverGroove } from '../js/groove-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const BASIC = grooveFrom(LIB.grooveById.get('groove_straight_basic_01'));
// kick 'x.......x.......', snare '....x.......x...', cymbal 'x.x.x.x.x.x.x.x.'

// A 4-bar C major idea in `meter` holding `groove`.
function ideaWith(groove, meter = '4/4') {
  const base = withMeter(rollAll(blankIdea(), none, LIB, seededRng(21)), meter, LIB, {}, seededRng(22));
  const idea = { ...base, key: { tonic: 'C', mode: 'ionian' }, feel: { type: 'straight', swing: 0 } };
  const progression = { source: 'generated', mode: 'ionian', chords: ['I', 'IV', 'V', 'I'], bars: [1, 1, 1, 1] };
  return withSection(withProgression(idea, progression), { groove });
}

// ---------- the lanes edit the groove ----------

test('a loop step edits the groove cell it plays, from any repeat', () => {
  assert.equal(cellAt(BASIC, 5), 5);
  assert.equal(cellAt(BASIC, 3 * 16 + 5), 5, 'bar 4 of a 1-bar groove');
  const two = resizeGroove(BASIC, '4/4', 2);
  assert.equal(cellAt(two, 16 + 5), 21);
  assert.equal(cellAt(two, 32 + 21), 21, 'bar 4 is a repeat of bar 2');
  const waltz = grooveFrom(LIB.grooves.find((g) => g.meter === '3/4' && g.bars === 1));
  assert.equal(cellAt(waltz, 12 + 3), 3);
});

test('Earlier and Later move a hit one column onto an empty step', () => {
  // On 8ths (2 steps a column) in a 4-bar loop over the 1-bar BASIC.
  assert.equal(shiftHit(BASIC, 'kick', 8, 1, 2, 64).tracks.kick, 'x.........x.....');
  assert.equal(shiftHit(BASIC, 'kick', 8, -1, 2, 64).tracks.kick, 'x.....x.........');
  assert.equal(shiftHit(BASIC, 'kick', 8, 1, 1, 64).tracks.kick, 'x........x......', 'on 16ths, one 16th');
  assert.deepEqual(shiftHit(BASIC, 'kick', 40, 1, 2, 64), shiftHit(BASIC, 'kick', 8, 1, 2, 64), 'the same from a repeat');
  assert.equal(shiftHit(BASIC, 'cymbal', 2, 1, 2, 64), BASIC, 'onto a taken step');
  assert.equal(shiftHit(BASIC, 'kick', 2, 1, 2, 64), BASIC, 'from a rest');
  const noCymbal = { ...BASIC, tracks: { kick: BASIC.tracks.kick, snare: BASIC.tracks.snare } };
  assert.equal(shiftHit(noCymbal, 'cymbal', 0, 1, 2, 64), noCymbal, 'a track the groove doesn’t have');
});

test('Earlier and Later stop at the loop’s ends, and go on past the groove’s end into the next repeat', () => {
  assert.equal(shiftHit(BASIC, 'kick', 0, -1, 2, 64), BASIC, 'the loop’s start');
  const late = setHit(BASIC, 'snare', 14, 'x'); // '....x.......x.x.'
  assert.equal(shiftHit(late, 'snare', 62, 1, 2, 64), late, 'the loop’s end');
  assert.equal(shiftHit(late, 'snare', 14, 1, 2, 64).tracks.snare, 'x...x.......x...', 'into bar 2, the groove’s start');
  assert.equal(shiftHit(late, 'snare', 14, 1, 2, 16), late, 'a 1-bar loop ends there');
  // A 2-bar groove: bar 1's last 8th goes on into bar 2 of the same groove.
  const two = setHit(resizeGroove(BASIC, '4/4', 2), 'snare', 14, 'x');
  assert.equal(shiftHit(two, 'snare', 14, 1, 2, 64).tracks.snare, '....x.......x...x...x.......x...');
});

// ---------- compileLoop, Drums.mid and the fingerprint read the edits ----------

test('compileLoop plays an edited groove in every repeat', () => {
  let g = setHit(BASIC, 'kick', 6, 'x');   // added
  g = moveHit(g, 'snare', 12, 14);         // moved
  g = setHit(g, 'cymbal', 0, 'X');         // re-weighted
  g = setHit(g, 'kick', 8, '.');           // deleted
  const loop = compileLoop(ideaWith(g), LIB);
  assert.equal(loop.totalSteps, 64);
  assert.equal(loop.grooveSteps, 16);
  for (let bar = 0; bar < 4; bar++) {
    const at = (track, s) => loop.drums[track][bar * 16 + s];
    assert.deepEqual([at('kick', 6), at('kick', 8), at('snare', 12), at('snare', 14), at('cymbal', 0)],
      [VELOCITY.x, 0, 0, VELOCITY.x, VELOCITY.X], `bar ${bar + 1}`);
  }
});

test('a 1-bar groove’s repeats change together, and a 2-bar groove’s bars can differ', () => {
  const snareAt15 = (groove) => [15, 31, 47, 63].map((s) => compileLoop(ideaWith(groove), LIB).drums.snare[s]);
  assert.deepEqual(snareAt15(setHit(BASIC, 'snare', 15, 'o')), Array(4).fill(VELOCITY.o));
  const two = setHit(resizeGroove(BASIC, '4/4', 2), 'snare', 31, 'o');
  assert.deepEqual(snareAt15(two), [0, VELOCITY.o, 0, VELOCITY.o]);
  assert.equal(compileLoop(ideaWith(two), LIB).grooveSteps, 32);
  // A groove longer than the loop has no repeats.
  assert.equal(compileLoop(ideaWith(resizeGroove(BASIC, '4/4', 8)), LIB).grooveSteps, 128);
  // 3/4 and 6/8 bars are 12 steps.
  for (const meter of ['3/4', '6/8']) {
    const g = grooveFrom(LIB.grooves.find((x) => x.meter === meter && x.bars === 1));
    const loop = compileLoop(ideaWith(setHit(g, 'snare', 11, 'o'), meter), LIB);
    assert.equal(loop.grooveSteps, 12);
    assert.deepEqual([11, 23, 35, 47].map((s) => loop.drums.snare[s]), Array(4).fill(VELOCITY.o), meter);
  }
});

test('Drums.mid holds an edited groove’s hits on the steps the lanes draw them', () => {
  const g = setHit(moveHit(setHit(BASIC, 'snare', 4, 'X'), 'kick', 8, 10), 'cymbal', 1, 'o');
  const idea = ideaWith(g);
  const loop = compileLoop(idea, LIB);
  const events = drumEvents(loop);
  const at = (note, step) => events.find((e) => e.note === note && e.tick === step * TICKS_PER_STEP);
  for (let bar = 0; bar < 4; bar++) {
    const s = bar * 16;
    assert.equal(at(DRUM_NOTES.snare, s + 4)?.velocity, 120, 'accent');
    assert.equal(at(DRUM_NOTES.kick, s + 10)?.velocity, 96, 'moved');
    assert.equal(at(DRUM_NOTES.kick, s + 8), undefined, 'moved from');
    assert.equal(at(DRUM_NOTES.cymbal, s + 1)?.velocity, 45, 'a ghost on a 16th');
  }
  const [, track] = readTracks(drumsMidi(idea, loop).bytes);
  const key = (e) => `${e.tick}:${e.note}:${e.velocity}`;
  assert.deepEqual(track.filter((e) => e.kind === 0x90).map(key).sort(), events.map(key).sort());
  const name = track.find((e) => e.meta === 0x03);
  assert.equal(String.fromCharCode(...name.data), BASIC.source, 'named for the groove it came from');
});

test('the fingerprint draws an edited groove', () => {
  // Step 8 is slot 4 of 16 (x 18.48); step 16, bar 2's first, is slot 8 (x 33.96).
  const plain = fingerprint(ideaWith(BASIC), LIB);
  assert.ok(plain.hits.some((h) => h.kind === 'kick' && h.d === 'M18.48 30V18'));
  const fp = fingerprint(ideaWith(setHit(setHit(BASIC, 'kick', 8, '.'), 'snare', 8, 'x')), LIB);
  assert.ok(fp.hits.some((h) => h.kind === 'snare' && h.d === 'M18.48 30V22'));
  // It draws the first two bars, so bar 2 of a 2-bar groove shows its own edits.
  const two = fingerprint(ideaWith(setHit(resizeGroove(BASIC, '4/4', 2), 'kick', 16, '.')), LIB);
  assert.ok(two.hits.some((h) => h.kind === 'kick' && h.d === 'M3 30V18'), 'bar 1 keeps its kick');
  assert.ok(two.hits.some((h) => h.kind === 'cymbal' && h.d === 'M33.96 30V26'), 'bar 2 lost it');
});

test('strum fit scores an edited groove', () => {
  const strum = strumFrom(LIB.strumById.get('strum_quarters_01')); // D.D.D.D.
  const base = strumFit(strum, BASIC, '4/4');
  const kicksOnDowns = [4, 12].reduce((g, s) => setHit(g, 'kick', s, 'x'), BASIC);
  assert.ok(strumFit(strum, kicksOnDowns, '4/4') > base, 'kicks under every down sit tighter');
  const kicksOff = moveHit(moveHit(BASIC, 'kick', 0, 2), 'kick', 8, 10);
  assert.ok(strumFit(strum, kicksOff, '4/4') < base, 'kicks moved off the downs sit looser');
});

// ---------- the Drums row ----------

test('Start over puts back the groove it came from, once something has changed', () => {
  const entry = LIB.grooveById.get('groove_straight_basic_01');
  assert.equal(startOverGroove(LIB, BASIC), null, 'unchanged');
  for (const edited of [
    setHit(BASIC, 'kick', 2, 'x'), moveHit(BASIC, 'snare', 4, 5), setHit(BASIC, 'cymbal', 0, 'X'),
    setHit(BASIC, 'kick', 0, '.'), resizeGroove(BASIC, '4/4', 2),
  ]) {
    assert.equal(startOverGroove(LIB, edited), entry);
    assert.deepEqual(grooveFrom(startOverGroove(LIB, edited)), BASIC);
  }
  assert.equal(startOverGroove(LIB, setHit(setHit(BASIC, 'kick', 2, 'x'), 'kick', 2, '.')), null, 'edited back');
  assert.equal(startOverGroove(LIB, { ...setHit(BASIC, 'kick', 2, 'x'), source: null }), null, 'nothing to go back to');
  const waltz = LIB.grooves.find((g) => g.meter === '3/4');
  assert.equal(startOverGroove(LIB, { ...setHit(BASIC, 'kick', 2, 'x'), source: waltz.id }), null, 'a source in another meter');
  // A My groove, until it's removed.
  const MY = {
    id: 'groove_my_lazy_01', meter: '4/4', res: 16, bars: 1, tempo: { min: 70, max: 100 }, tags: [],
    tracks: { kick: 'x.....x.........', snare: '....x.......x...' }, addedAt: '2026-11-10T00:00:00Z',
  };
  const withMy = withMine(LIB, { grooves: [MY] });
  const mine = setHit(grooveFrom(MY), 'cymbal', 0, 'x');
  assert.equal(startOverGroove(withMy, mine), withMy.grooveById.get(MY.id));
  assert.equal(startOverGroove(LIB, mine), null, 'removed');
});
