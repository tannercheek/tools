// 4/4, 3/4 and 6/8 (PLAN step 6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, rollLayer, withMeter, seededRng, strumFit } from '../js/randomize.js';
import { blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, validGroove } from '../js/idea.js';
import { METERS, compileLoop, meterInfo, swingSteps } from '../js/loop.js';
import { validStrum } from '../js/strum-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));

test('meterInfo gives steps per bar and the felt pulse', () => {
  assert.deepEqual(meterInfo('4/4'), { beats: 4, unit: 4, stepsPerBar: 16, stepsPerBeat: 4, pulse: 4 });
  assert.deepEqual(meterInfo('3/4'), { beats: 3, unit: 4, stepsPerBar: 12, stepsPerBeat: 4, pulse: 4 });
  assert.deepEqual(meterInfo('6/8'), { beats: 6, unit: 8, stepsPerBar: 12, stepsPerBeat: 2, pulse: 6 });
});

test('every meter has grooves and strums', () => {
  for (const m of METERS) {
    assert.ok(LIB.grooves.filter((g) => g.meter === m).length >= 4, `${m} grooves`);
    assert.ok(LIB.strums.filter((s) => s.meter === m).length >= 4, `${m} strums`);
  }
});

test('rolls in every meter are valid, with grids the right length', () => {
  const rng = seededRng(21);
  for (const meter of METERS) {
    for (let i = 0; i < 200; i++) {
      const idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng);
      assert.equal(idea.meter, meter);
      assert.deepEqual(validateIdea(idea, LIB).missing, [], JSON.stringify(idea));
      const sec = sectionOf(idea);
      assert.deepEqual(validGroove(sec.groove, meter), sec.groove, 'a groove object in the meter');
      assert.deepEqual(validStrum(sec.strum, meter), sec.strum, 'a strum object in the meter');
      const loop = compileLoop(idea, LIB);
      const steps = sec.bars * meterInfo(meter).stepsPerBar;
      assert.equal(loop.totalSteps, steps);
      assert.equal(loop.strum.length, steps);
      for (const lane of Object.values(loop.drums)) assert.equal(lane.length, steps);
      assert.equal(loop.chords.at(-1).end, steps);
    }
  }
});

test('Randomize lands on 4/4 most of the time, and on every meter', () => {
  const rng = seededRng(4);
  const count = Object.fromEntries(METERS.map((m) => [m, 0]));
  for (let i = 0; i < 1000; i++) count[rollAll(blankIdea(), none, LIB, rng).meter]++;
  assert.ok(count['4/4'] > 700, JSON.stringify(count));
  for (const m of METERS) assert.ok(count[m] > 0, JSON.stringify(count));
});

test('a locked groove or strum keeps its meter through Randomize', () => {
  const rng = seededRng(8);
  const start = rollAll({ ...blankIdea(), meter: '6/8' }, { ...none, meter: true }, LIB, rng);
  for (const layer of ['groove', 'strum']) {
    for (let i = 0; i < 100; i++) {
      const next = rollAll(start, { ...none, [layer]: true }, LIB, rng);
      assert.equal(next.meter, '6/8');
      assert.deepEqual(sectionOf(next)[layer], sectionOf(start)[layer]);
    }
  }
});

test('changing meter rerolls groove and strum to match, and leaves the rest', () => {
  const rng = seededRng(12);
  const start = rollAll({ ...blankIdea(), meter: '4/4' }, { ...none, meter: true }, LIB, rng);
  for (const meter of ['3/4', '6/8']) {
    const next = withMeter(start, meter, LIB, {}, rng);
    const sec = sectionOf(next);
    assert.equal(next.meter, meter);
    assert.deepEqual(validGroove(sec.groove, meter), sec.groove);
    assert.equal(LIB.strumById.get(sec.strum.source).meter, meter);
    assert.deepEqual(validStrum(sec.strum, meter), sec.strum);
    assert.deepEqual(next.key, start.key);
    assert.deepEqual(sec.progression, sectionOf(start).progression);
    assert.equal(next.tempo, start.tempo);
  }
  // Same meter: nothing to reroll.
  assert.deepEqual(withMeter(start, '4/4', LIB, {}, rng), start);
  // The meter's own dice usually moves somewhere new (the current pick keeps 5% weight).
  let moved = 0;
  for (let i = 0; i < 200; i++) if (rollLayer(start, 'meter', LIB, {}, rng).meter !== '4/4') moved++;
  assert.ok(moved > 140, `moved ${moved}/200`);
});

test('6/8 fit scoring uses the dotted-quarter pulse', () => {
  const cymbal = { res: 16, tracks: { cymbal: 'x.x.x.x.x.x.' } };
  const fit = (pattern) => strumFit({ pattern, res: 8 }, cymbal, '6/8');
  // Only the pulse counts as on the beat: a down-strum there scores more,
  // and an up-strum on the 2nd or 3rd 8th counts as off the beat.
  assert.ok(fit('D.....') > fit('.D....'));
  assert.ok(fit('...D..') > fit('..D...'));
  assert.ok(fit('.U....') > fit('U.....'));
  // In 3/4 the beat is the quarter note, as in 4/4.
  assert.equal(strumFit({ pattern: '..D...', res: 8 }, cymbal, '3/4'), strumFit({ pattern: 'D.....', res: 8 }, cymbal, '3/4'));
});

test('swing pushes the off-beat 8th in 4/4 and the later 8ths of the pulse in 6/8', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((s) => swingSteps(s, 4, 0.55)), [0, 0.275, 0.55, 0.275, 0]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((s) => swingSteps(s, 6, 0.55)), [0, 0.275, 0.55, 0.55, 0.55, 0.275, 0]);
  assert.equal(swingSteps(2, 4, 0), 0);
});

test('an old 4/4 link loads unchanged, and unknown meters fall back to 4/4', () => {
  const old = rollAll(blankIdea(), { ...none, meter: true }, LIB, seededRng(30));
  assert.equal(old.meter, '4/4');
  const v = validateIdea(decodeIdea(encodeIdea(old)), LIB);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(v.idea, old);

  const odd = validateIdea({ ...old, meter: '5/4' }, LIB);
  assert.equal(odd.idea.meter, '4/4');
  assert.deepEqual(odd.missing, []);
  const swapped = validateIdea({ ...old, meter: '6/8' }, LIB);
  assert.deepEqual(swapped.missing.sort(), ['groove', 'strum']);
});
