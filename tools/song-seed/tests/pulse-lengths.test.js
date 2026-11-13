// Chord lengths on the pulse (PLAN step 19): an edited 3/4 length is a third
// of a bar, and sums of thirds drift in floating point. They still add up to
// whole bars, survive links, and keep to the grid across meter changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, withMeter, seededRng, shapeOf, fitsShape } from '../js/randomize.js';
import { blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, withProgression } from '../js/idea.js';
import { METERS, compileLoop, meterInfo, sumBars } from '../js/loop.js';
import { chartText, fingerprint } from '../js/display.js';
import { setChord, moveEdge, deleteChord, splitChord, chordChoices } from '../js/progression-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const progOf = (idea) => sectionOf(idea).progression;
const rolled = (meter, seed) => rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, seededRng(seed));
const plainSum = (bars) => bars.reduce((a, b) => a + b, 0);

// 4, 2, 4 and 2 beats of 3/4.
const DRIFTS = [4 / 3, 2 / 3, 4 / 3, 2 / 3];

// One edit, as the chord menu or an edge drag makes it.
function randomEdit(p, meter, rng) {
  const i = Math.floor(rng() * p.chords.length);
  const r = rng();
  if (r < 0.6) return moveEdge(p, i, rng() * sumBars(p.bars) * meterInfo(meter).stepsPerBar, meter);
  if (r < 0.85) return splitChord(p, i, meter);
  if (r < 0.95) return setChord(p, i, chordChoices(p.mode).diatonic[Math.floor(rng() * 7)]);
  return deleteChord(p, i);
}

test('sumBars rounds a total to whole steps in every meter', () => {
  assert.notEqual(plainSum(DRIFTS), 4, 'adding thirds plainly drifts');
  assert.equal(sumBars(DRIFTS), 4);
  assert.equal(sumBars([0.5, 0.5, 1, 2]), 4);
  assert.equal(sumBars([1 / 3, 1 / 3]), 2 / 3);
  assert.equal(sumBars([0.25, 1 / 12]), 1 / 3);
  assert.equal(sumBars([]), 0);
});

test('Bars, Chords, the loop, the chart and the fingerprint read drifting thirds as whole bars', () => {
  const idea = withProgression(rolled('3/4', 1), { source: 'custom', mode: 'dorian', chords: ['i', 'IV', 'v', 'bVII'], bars: DRIFTS });
  const p = progOf(idea);
  assert.deepEqual(shapeOf(p), { bars: 4, count: 4 });
  assert.ok(fitsShape(p, { bars: 4, count: 4 }));
  assert.equal(sectionOf(idea).bars, 4);
  const loop = compileLoop(idea, LIB);
  assert.equal(loop.totalSteps, 48);
  assert.deepEqual(loop.chords.map((c) => [c.start, c.end]), [[0, 16], [16, 24], [24, 40], [40, 48]]);
  assert.equal(chartText(p.chords, p.bars, '3/4'), 'i | % IV | v | % ♭VII');
  assert.match(fingerprint(idea, LIB).chords, /H62$/, 'the last chord ends at the right edge');
});

test('3/4 thirds survive a JSON round trip and add up to whole bars', () => {
  const rng = seededRng(193);
  let drifted = 0;
  for (let i = 0; i < 300; i++) {
    let idea = rollAll({ ...blankIdea(), meter: '3/4' }, { ...none, meter: true }, LIB, rng);
    const { bars } = shapeOf(progOf(idea));
    for (let k = 0; k < 8; k++) idea = withProgression(idea, randomEdit(progOf(idea), '3/4', rng));
    if (plainSum(progOf(idea).bars) !== bars) drifted++;
    const back = JSON.parse(JSON.stringify(idea));
    assert.deepEqual(back, idea);
    assert.equal(shapeOf(progOf(back)).bars, bars);
    assert.equal(sectionOf(back).bars, bars);
    assert.deepEqual(validateIdea(decodeIdea(encodeIdea(back)), LIB), { idea, missing: [] });
    const loop = compileLoop(back, LIB);
    assert.equal(loop.totalSteps, bars * 12);
    assert.equal(loop.chords.at(-1).end, loop.totalSteps);
  }
  assert.ok(drifted > 10, `${drifted} of 300 drift when added up plainly`);
});

test('edited ideas pass validateIdea() unchanged, in every meter', () => {
  const rng = seededRng(194);
  for (const meter of METERS) {
    for (let i = 0; i < 100; i++) {
      let idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng);
      for (let k = 0; k < 6; k++) idea = withProgression(idea, randomEdit(progOf(idea), meter, rng));
      assert.deepEqual(validateIdea(decodeIdea(encodeIdea(idea)), LIB), { idea, missing: [] }, `${meter}: ${progOf(idea).bars}`);
    }
  }
});

test('validateIdea snaps each length to the nearest step before checking it', () => {
  const base = rolled('3/4', 2);
  const raw = (bars) => withProgression(base, { source: 'custom', mode: 'dorian', chords: bars.map(() => 'i'), bars });
  const v = validateIdea(raw([0.333, 0.667, 1, 2]), LIB);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(progOf(v.idea).bars, [1 / 3, 2 / 3, 1, 2]);
  assert.equal(sectionOf(v.idea).bars, 4);
  assert.ok(validateIdea(raw([0.01, 3.99]), LIB).missing.includes('chords'), 'under half a step is nothing');
  assert.ok(validateIdea(raw(['1', 3]), LIB).missing.includes('chords'));
  assert.ok(validateIdea(raw([8, 8, 1]), LIB).missing.includes('chords'), 'over 16 bars');
});

test('old links load as before: library lengths are untouched in every meter', () => {
  for (const meter of METERS) {
    const base = rolled(meter, 3);
    for (const p of LIB.progressions) {
      const idea = withProgression(base, { source: p.id, mode: p.mode, chords: [...p.chords], bars: [...p.bars] });
      assert.deepEqual(validateIdea(decodeIdea(encodeIdea(idea)), LIB), { idea, missing: [] }, `${p.id} in ${meter}`);
    }
  }
});

test('a meter change keeps the progression, moving only edges that miss the new grid', () => {
  const rng = seededRng(195);
  const base = rolled('3/4', 4);
  const idea = withProgression(base, { source: 'custom', mode: base.key.mode, chords: ['i', 'IV', 'v', 'bVII'], bars: [2 / 3, 1 / 3, 1, 2] });
  const four = withMeter(idea, '4/4', LIB, {}, rng);
  assert.deepEqual(progOf(four), { ...progOf(idea), bars: [0.75, 0.25, 1, 2] });
  assert.equal(sectionOf(four).bars, 4);
  assert.deepEqual(validateIdea(four, LIB).missing, []);
  assert.equal(compileLoop(four, LIB).chords[0].end, 12, 'the first chord now lasts three 4/4 beats');
  assert.deepEqual(progOf(withMeter(idea, '6/8', LIB, {}, rng)), progOf(idea), 'nothing misses in 6/8');

  // A half-bar progression comes through every meter change unchanged.
  for (const from of METERS) {
    for (let i = 0; i < 20; i++) {
      const start = rollAll({ ...blankIdea(), meter: from }, { ...none, meter: true }, LIB, rng);
      for (const to of METERS) assert.deepEqual(progOf(withMeter(start, to, LIB, {}, rng)), progOf(start), `${from} → ${to}`);
    }
  }
});
