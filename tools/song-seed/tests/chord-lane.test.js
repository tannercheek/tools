// Editing chords in the Loop (PLAN step 20): the pure rules behind the chord
// menu and the Progression row. The lane itself (chord-lane.js) is UI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { LAYERS, rollAll, withMeter, seededRng } from '../js/randomize.js';
import { blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, withSection, withProgression } from '../js/idea.js';
import { METERS, compileLoop, meterInfo, sumBars } from '../js/loop.js';
import { chordEvents, chordsMidi, TICKS_PER_STEP } from '../js/export.js';
import { readTracks } from './midi-reader.js';
import {
  setChord, moveEdge, splitChord, deleteChord, resizeChord, pickChord, pickExtension, takesExtension,
  progressionPick, myProgression, startOverFrom, progressionFrom, droppedOnMeter, snapToMeter,
} from '../js/progression-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const prog = (bars, chords = bars.map((_, i) => ['i', 'IV', 'v', 'bVII'][i % 4]), source = 'prog_test_01') =>
  ({ source, mode: 'dorian', chords, bars });

// A rolled D Dorian idea in `meter` holding `progression`.
function ideaWith(progression, meter = '4/4') {
  const base = withMeter(rollAll(blankIdea(), none, LIB, seededRng(20)), meter, LIB, {}, seededRng(21));
  const idea = { ...base, key: { tonic: 'D', mode: 'dorian' } };
  return withProgression(withSection(idea, { color: { level: 0, seed: 1 } }), progression);
}

const MY = { id: 'prog_my_lift_01', mode: 'dorian', chords: ['i', 'ii', 'IV', 'i'], bars: [1, 1, 1, 1], addedAt: '2026-11-10T00:00:00Z' };
const withMy = withMine(LIB, { progressions: [MY] });

// ---------- the Progression row ----------

test('the select shows the matching library entry, else a Generated or Custom placeholder', () => {
  const entry = LIB.progressionById.get('prog_dorian_float_01');
  const p = progressionFrom(entry);
  assert.deepEqual(progressionPick(LIB, p), { id: entry.id, placeholder: null });
  assert.deepEqual(progressionPick(LIB, setChord(p, 1, 'ii')), { id: null, placeholder: 'Custom' }, 'an edited library progression');

  const rolled = { source: 'generated', mode: 'dorian', chords: ['i', 'ii', 'IV', 'i'], bars: [2, 0.5, 0.5, 1] };
  assert.deepEqual(progressionPick(LIB, rolled), { id: null, placeholder: 'Generated' });
  assert.deepEqual(progressionPick(LIB, moveEdge(rolled, 0, 24, '4/4')), { id: null, placeholder: 'Custom' }, 'an edited generated one');
  assert.equal(moveEdge(rolled, 0, 24, '4/4').source, 'custom');

  // Matched by content: a rolled progression that is a library entry shows it,
  // and an edit back to the entry's chords shows it again.
  assert.equal(progressionPick(LIB, { ...p, source: 'generated' }).id, entry.id);
  const back = setChord(setChord(p, 1, 'ii'), 1, entry.chords[1]);
  assert.equal(progressionPick(LIB, back).id, entry.id);
  assert.equal(progressionPick(withMy, progressionFrom(MY)).id, MY.id, 'a My progression');
  assert.deepEqual(progressionPick(LIB, progressionFrom(MY)), { id: null, placeholder: 'Custom' }, 'one this device doesn’t have');
});

test('Remove shows only while the progression is an unchanged My progression', () => {
  const p = progressionFrom(MY);
  assert.equal(myProgression(withMy, p), withMy.progressionById.get(MY.id));
  assert.equal(myProgression(withMy, { ...p, source: 'generated' }), withMy.progressionById.get(MY.id), 'by content, not source');
  assert.equal(myProgression(withMy, setChord(p, 1, 'v')), null, 'edited');
  assert.equal(myProgression(withMy, moveEdge(p, 0, 12, '4/4')), null, 'an edge moved');
  assert.equal(myProgression(withMy, progressionFrom(LIB.progressions[0])), null, 'a built-in');
  assert.equal(myProgression(LIB, p), null, 'removed');
});

test('Start over puts back the library progression it came from, once something has changed', () => {
  const entry = LIB.progressionById.get('prog_dorian_float_01');
  const p = progressionFrom(entry);
  assert.equal(startOverFrom(LIB, p), null, 'unchanged');
  for (const edited of [setChord(p, 0, 'ii'), moveEdge(p, 0, 12, '4/4'), splitChord(p, 0, '4/4'), deleteChord(p, 1)]) {
    assert.equal(startOverFrom(LIB, edited), entry);
    assert.deepEqual(progressionFrom(startOverFrom(LIB, edited)), p);
  }
  assert.equal(startOverFrom(LIB, setChord({ ...p, source: 'generated' }, 0, 'ii')), null, 'custom has nothing to go back to');
  assert.equal(startOverFrom(LIB, { ...p, source: 'generated' }), null);
  // A My progression that's since been removed is gone.
  const mine = setChord(progressionFrom(MY), 1, 'v');
  assert.equal(startOverFrom(withMy, mine), withMy.progressionById.get(MY.id));
  assert.equal(startOverFrom(LIB, mine), null);
});

test('a library pick is copied, so editing it never touches the library', () => {
  const entry = LIB.progressionById.get('prog_dorian_float_01');
  const before = JSON.stringify(entry);
  const p = progressionFrom(entry);
  splitChord(setChord(p, 0, 'ii'), 0, '4/4');
  p.chords.push('x');
  assert.equal(JSON.stringify(entry), before);
});

// ---------- the chord menu ----------

test('picking a chord keeps the extension, and picking an extension keeps the chord', () => {
  assert.equal(pickChord('ii7', 'V'), 'V7');
  assert.equal(pickChord('IVmaj7', 'bVII'), 'bVIImaj7');
  assert.equal(pickChord('I', 'vi'), 'vi');
  assert.equal(pickChord('ii7', 'vi°'), 'vi°7', 'a diminished chord takes 7');
  assert.equal(pickChord('IVadd9', 'vii°'), 'vii°', '…but not add9, so it goes back to Auto');
  assert.equal(pickExtension('ii', 'maj7'), 'iimaj7');
  assert.equal(pickExtension('ii7', null), 'ii', 'Auto is the plain numeral');
  assert.equal(pickExtension('bVIIsus4', '9'), 'bVII9');
  assert.equal(pickExtension('vii°', '7'), 'vii°7');
  assert.equal(pickExtension('vii°', 'sus2'), 'vii°', 'not offered on a diminished chord');
  assert.ok(takesExtension('vii°7', null) && takesExtension('vii°', '7') && !takesExtension('vi°', '6'));
  assert.ok(['7', 'maj7', 'sus2', 'sus4', 'add9', '6', '9'].every((e) => takesExtension('bIII', e)));
});

test('Shorter and Longer move a chord’s end by a pulse, or the last chord’s start', () => {
  const p = prog([1, 1, 1, 1]);
  assert.deepEqual(resizeChord(p, 0, -1, '4/4').bars, [0.75, 1.25, 1, 1]);
  assert.deepEqual(resizeChord(p, 0, 1, '4/4').bars, [1.25, 0.75, 1, 1]);
  assert.deepEqual(resizeChord(p, 3, -1, '4/4').bars, [1, 1, 1.25, 0.75], 'the last chord: its start moves later');
  assert.deepEqual(resizeChord(p, 3, 1, '4/4').bars, [1, 1, 0.75, 1.25]);
  assert.deepEqual(resizeChord(p, 1, -1, '3/4').bars, [1, 2 / 3, 4 / 3, 1]);
  assert.deepEqual(resizeChord(p, 1, 1, '6/8').bars, [1, 1.5, 0.5, 1]);
  const one = prog([4], ['i']);
  assert.ok(resizeChord(one, 0, 1, '4/4') === one && resizeChord(one, 0, -1, '4/4') === one, 'the only chord fills the loop');
});

test('Shorter and Longer stop at one pulse and never go the wrong way', () => {
  const p = prog([0.25, 0.25, 3.5]);
  assert.equal(resizeChord(p, 0, -1, '4/4'), p, 'a beat is as short as it gets');
  assert.equal(resizeChord(p, 0, 1, '4/4'), p, 'the next chord is a beat');
  assert.equal(resizeChord(p, 2, 1, '4/4'), p, 'longer would squeeze the chord before');
  // 3/4 half bars sit between beats: they move to the nearest beat that way.
  const half = prog([0.5, 0.5, 1, 2]);
  assert.deepEqual(resizeChord(half, 0, -1, '3/4').bars, [1 / 3, 2 / 3, 1, 2]);
  assert.deepEqual(resizeChord(half, 0, 1, '3/4').bars, [2 / 3, 1 / 3, 1, 2]);
  assert.equal(resizeChord(half, 1, -1, '3/4'), half, 'steps 6–12 can’t lose a beat');
  assert.deepEqual(resizeChord(half, 1, 1, '3/4').bars, [0.5, 5 / 6, 2 / 3, 2]);
  // A chord from step 6 to 10 in 4/4: the nearest beat earlier leaves it no
  // room, and the pulse it would be clamped to is later, so it stays.
  const odd = prog([0.375, 0.25, 1.375, 2]);
  assert.equal(resizeChord(odd, 1, -1, '4/4'), odd);
  assert.equal(resizeChord(p, 0, 2, '4/4'), p);
  assert.equal(resizeChord(p, 5, 1, '4/4'), p);
});

test('every Shorter and Longer changes the chord by at most a pulse, the right way', () => {
  const rng = seededRng(2020);
  for (const meter of METERS) {
    const { stepsPerBar, pulse } = meterInfo(meter);
    let p = prog([1, 1, 1, 1]);
    for (let k = 0; k < 400; k++) {
      const i = Math.floor(rng() * p.chords.length);
      const delta = rng() < 0.5 ? -1 : 1;
      const next = resizeChord(p, i, delta, meter);
      assert.equal(sumBars(next.bars), 4, 'the loop keeps its length');
      if (next !== p) {
        const change = Math.round((next.bars[i] - p.bars[i]) * stepsPerBar);
        assert.ok(change * delta > 0 && Math.abs(change) <= pulse, `${meter} ${p.bars} chord ${i} ${delta}: ${change}`);
        assert.ok(next.bars.every((b) => Math.round(b * stepsPerBar) >= Math.min(pulse, ...p.bars.map((x) => Math.round(x * stepsPerBar)))));
      }
      p = rng() < 0.3 ? splitChord(next, Math.floor(rng() * next.chords.length), meter) : next;
      if (p.chords.length > 12) p = deleteChord(p, 0);
    }
  }
});

// ---------- meter changes ----------

test('a meter change that merges chords says how many', () => {
  const squeezed = prog([0.25, 1 / 12, 2 / 3, 3]);
  const idea = ideaWith(squeezed, '3/4');
  const next = withMeter(idea, '4/4', LIB, {}, seededRng(3));
  assert.equal(sectionOf(next).progression.chords.length, 3);
  assert.equal(droppedOnMeter(squeezed, '4/4', sectionOf(next).progression), 1);
  assert.equal(droppedOnMeter(squeezed, '6/8', snapToMeter(squeezed, '6/8').progression), 0, 'a 3/4 grid fits in 6/8');
  assert.equal(droppedOnMeter(squeezed, '3/4', squeezed), 0, 'no change');
  assert.equal(droppedOnMeter(squeezed, '4/4', prog([1, 1, 1, 1])), 0, 'a rolled progression drops nothing');
  for (const p of LIB.progressions) for (const m of METERS) assert.equal(droppedOnMeter(p, m, p), 0);
});

// ---------- the loop and Chords.mid play the edits ----------

// D Dorian in 3/4: the first edge moved to beat 3 of bar 1, the third chord
// split, and the second changed to ii7.
function editedIdea() {
  let p = prog([1, 1, 1, 1], undefined, 'generated');
  p = moveEdge(p, 0, 8, '3/4');
  p = splitChord(p, 2, '3/4');
  p = setChord(p, 1, 'ii7');
  return ideaWith(p, '3/4');
}

test('compileLoop plays edited chords where the timeline draws them', () => {
  const idea = editedIdea();
  const p = sectionOf(idea).progression;
  assert.deepEqual(p.chords, ['i', 'ii7', 'v', 'v', 'bVII']);
  assert.equal(p.source, 'custom');
  const loop = compileLoop(idea, LIB);
  assert.equal(loop.totalSteps, 48);
  assert.deepEqual(loop.chords.map((c) => [c.start, c.end]), [[0, 8], [8, 24], [24, 28], [28, 36], [36, 48]]);
  assert.deepEqual(loop.chords.map((c) => c.symbol), ['Dm', 'Em7', 'Am', 'Am', 'C']);
  assert.equal(loop.chordIndexAt[7], 0);
  assert.equal(loop.chordIndexAt[8], 1);
  assert.equal(loop.chordIndexAt[47], 4);
});

test('Chords.mid holds the edited chords on the same steps', () => {
  const idea = editedIdea();
  const loop = compileLoop(idea, LIB);
  const starts = [...new Set(chordEvents(loop).map((e) => e.tick))];
  assert.deepEqual(starts, [0, 8, 24, 28, 36].map((s) => s * TICKS_PER_STEP));
  const [, track] = readTracks(chordsMidi(idea, loop).bytes);
  const offs = track.filter((e) => e.kind === 0x80);
  assert.equal(Math.max(...offs.map((e) => e.tick)), 48 * TICKS_PER_STEP, 'it ends where the loop does');
  assert.equal(track.filter((e) => e.kind === 0x90).length, chordEvents(loop).length);
});

test('an edited idea survives a link and a Saved idea unchanged', () => {
  const idea = editedIdea();
  const back = validateIdea(decodeIdea(encodeIdea(idea)), LIB);
  assert.deepEqual(back.missing, []);
  assert.deepEqual(sectionOf(back.idea).progression, sectionOf(idea).progression);
  const saved = validateIdea(JSON.parse(JSON.stringify(idea)), LIB);
  assert.deepEqual(sectionOf(saved.idea).progression, sectionOf(idea).progression);
});
