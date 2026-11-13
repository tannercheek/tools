// Bars and chord count (PLAN step 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import {
  LAYERS, LOOP_BARS, rollAll, rollLayer, seededRng, generateProgression, chordCounts, shapeOf, withShape,
} from '../js/randomize.js';
import { IDEA_VERSION, blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, grooveFrom } from '../js/idea.js';
import { compileLoop, meterInfo, METERS } from '../js/loop.js';
import { MODE_ORDER, MODES } from '../js/theory.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const shape = (idea) => shapeOf(sectionOf(idea).progression);

function assertFollowsRules(p, mode, why) {
  const n = p.chords.length;
  assert.equal(n, p.bars.length, why);
  for (const b of p.bars) assert.ok(b > 0 && Number.isInteger(b * 2), `${why}: bars must be whole or half (${p.bars})`);
  for (let j = 0; j < n; j++) {
    assert.ok(p.chords[j] in MODES[mode].pool, `${why}: ${p.chords[j]}`);
    assert.notEqual(p.chords[j], p.chords[(j + 1) % n], `${why}: repeat in ${p.chords}`);
  }
  assert.ok(p.chords.some((c) => MODES[mode].signature.includes(c)), `${why}: no signature chord in ${p.chords}`);
}

test('counts offered: 2 up to one chord per half bar, capped at 8', () => {
  assert.deepEqual(chordCounts(2), [2, 3, 4]);
  assert.deepEqual(chordCounts(4), [2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(chordCounts(8), [2, 3, 4, 5, 6, 7, 8]);
});

test('every bars × count pair generates a valid progression that follows the rules', () => {
  const rng = seededRng(91);
  for (const mode of MODE_ORDER) {
    for (const bars of LOOP_BARS) {
      for (const count of chordCounts(bars)) {
        for (let i = 0; i < 30; i++) {
          const p = generateProgression(mode, rng, { bars, count });
          assert.deepEqual(shapeOf(p), { bars, count }, `${mode} ${bars}×${count}`);
          assertFollowsRules(p, mode, `${mode} ${bars}×${count}`);
        }
      }
    }
  }
});

test('either value can be fixed on its own', () => {
  const rng = seededRng(92);
  for (let i = 0; i < 300; i++) {
    for (const bars of LOOP_BARS) assert.equal(shapeOf(generateProgression('dorian', rng, { bars })).bars, bars);
    for (const count of [2, 5, 8]) assert.equal(generateProgression('aeolian', rng, { count }).chords.length, count);
  }
});

test('with nothing fixed, generated progressions keep today’s rhythms', () => {
  const rng = seededRng(93);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const { bars, count } = shapeOf(generateProgression('ionian', rng));
    seen.add(`${bars}×${count}`);
  }
  // The extra rhythms (e.g. 6 chords in 4 bars) only show up when the count is fixed.
  assert.deepEqual([...seen].sort(), ['2×2', '2×3', '4×2', '4×3', '4×4', '4×5', '8×2', '8×4', '8×5', '8×8']);
});

test('locked Bars and Chords survive many Randomize rolls, in every meter', () => {
  const rng = seededRng(94);
  for (const meter of METERS) {
    for (const bars of LOOP_BARS) {
      for (const count of [2, chordCounts(bars).at(-1)]) {
        const start = withShape(rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng), { bars, count }, LIB, rng);
        assert.deepEqual(shape(start), { bars, count });
        for (let i = 0; i < 40; i++) {
          const next = rollAll(start, { ...none, meter: true, bars: true, count: true }, LIB, rng);
          assert.deepEqual(shape(next), { bars, count });
          assert.deepEqual(validateIdea(next, LIB).missing, []);
          const loop = compileLoop(next, LIB);
          assert.equal(loop.totalSteps, bars * meterInfo(meter).stepsPerBar);
          assert.equal(loop.chords.length, count);
        }
      }
    }
  }
  // Locked one at a time, only that value is held.
  const start = withShape(rollAll(blankIdea(), none, LIB, rng), { bars: 8, count: 3 }, LIB, rng);
  const counts = new Set();
  const lengths = new Set();
  for (let i = 0; i < 200; i++) {
    const b = shape(rollAll(start, { ...none, bars: true }, LIB, rng));
    assert.equal(b.bars, 8);
    counts.add(b.count);
    const c = shape(rollAll(start, { ...none, count: true }, LIB, rng));
    assert.equal(c.count, 3);
    lengths.add(c.bars);
  }
  assert.ok(counts.size > 1 && lengths.size > 1);
});

test('library picks match the locked values, and fall back to generated', () => {
  const rng = seededRng(95);
  const base = { ...rollAll(blankIdea(), none, LIB, rng), key: { tonic: 'C', mode: 'ionian' } };
  const four = withShape(base, { bars: 4, count: 4 }, LIB, rng);
  let fromLib = 0;
  for (let i = 0; i < 300; i++) {
    const p = sectionOf(rollLayer(four, 'chords', LIB, { bars: true, count: true }, rng)).progression;
    assert.deepEqual(shapeOf(p), { bars: 4, count: 4 });
    const libP = LIB.progressionById.get(p.source);
    if (libP) {
      fromLib++;
      assert.equal(libP.mode, 'ionian');
      assert.deepEqual(shapeOf(libP), { bars: 4, count: 4 });
    }
  }
  assert.ok(fromLib > 100 && fromLib < 200, `library ${fromLib}/300`);

  // No Ionian library progression has 8 bars and 3 chords.
  const odd = withShape(base, { bars: 8, count: 3 }, LIB, rng);
  for (let i = 0; i < 100; i++) {
    const p = sectionOf(rollLayer(odd, 'chords', LIB, { bars: true, count: true }, rng)).progression;
    assert.equal(p.source, 'generated');
    assert.deepEqual(shapeOf(p), { bars: 8, count: 3 });
  }
});

test('setting Bars or Chords keeps the other if it fits, otherwise the nearest that does', () => {
  const rng = seededRng(96);
  const start = withShape(rollAll(blankIdea(), none, LIB, rng), { bars: 4, count: 6 }, LIB, rng);
  assert.deepEqual(shape(withShape(start, { bars: 8 }, LIB, rng)), { bars: 8, count: 6 });
  assert.deepEqual(shape(withShape(start, { bars: 2 }, LIB, rng)), { bars: 2, count: 4 });
  assert.deepEqual(shape(withShape(start, { count: 3 }, LIB, rng)), { bars: 4, count: 3 });
  const two = withShape(start, { bars: 2, count: 3 }, LIB, rng);
  assert.deepEqual(shape(withShape(two, { count: 7 }, LIB, rng)), { bars: 4, count: 7 });
});

test('the Bars and Chords dice always land on a different value that fits', () => {
  const rng = seededRng(97);
  const start = withShape(rollAll(blankIdea(), none, LIB, rng), { bars: 4, count: 6 }, LIB, rng);
  for (let i = 0; i < 200; i++) {
    const b = shape(rollLayer(start, 'bars', LIB, {}, rng));
    assert.notEqual(b.bars, 4);
    assert.ok(chordCounts(b.bars).includes(b.count));
    // A locked count of 6 only fits 4 or 8 bars.
    assert.deepEqual(shape(rollLayer(start, 'bars', LIB, { count: true }, rng)), { bars: 8, count: 6 });
    const c = shape(rollLayer(start, 'count', LIB, {}, rng));
    assert.equal(c.bars, 4);
    assert.notEqual(c.count, 6);
  }
});

test('a locked Progression keeps both', () => {
  const rng = seededRng(98);
  const start = rollAll(blankIdea(), none, LIB, rng);
  for (let i = 0; i < 100; i++) {
    const next = rollAll(start, { ...none, chords: true }, LIB, rng);
    assert.deepEqual(sectionOf(next).progression, sectionOf(start).progression);
  }
  assert.equal(rollLayer(start, 'bars', LIB, { chords: true }, rng), start);
  assert.equal(rollLayer(start, 'count', LIB, { chords: true }, rng), start);
});

test('an old link (made before step 9) loads unchanged', () => {
  const old = {
    version: 2, tempo: 112, meter: '4/4',
    feel: { type: 'straight', swing: 0 },
    key: { tonic: 'D', mode: 'dorian' },
    tuning: null,
    sections: [{
      id: 'A', name: 'Loop', bars: 4, meter: null,
      groove: 'groove_straight_basic_01', strum: 'strum_classic_01',
      progression: { source: 'prog_dorian_float_01', mode: 'dorian', chords: ['i', 'IV', 'i', 'bVII'], bars: [1, 1, 1, 1] },
      color: { level: 1, seed: 123456 },
    }],
    arrangement: ['A'],
  };
  const v = validateIdea(decodeIdea(encodeIdea(old)), LIB);
  assert.deepEqual(v.missing, []);
  // Unchanged apart from idea v3's strum (PLAN step 14) and v4's groove (step 16).
  const strum = { source: 'strum_classic_01', res: 8, bars: 1, pattern: 'D.DU.UDU' };
  const groove = grooveFrom(LIB.grooveById.get('groove_straight_basic_01'));
  assert.deepEqual(v.idea, { ...old, version: IDEA_VERSION, sections: [{ ...old.sections[0], strum, groove }] });
  assert.deepEqual(shape(v.idea), { bars: 4, count: 4 });
});
