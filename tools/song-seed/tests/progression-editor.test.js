// Editing the progression in the Loop (PLAN step 19).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { METERS, meterInfo, sumBars } from '../js/loop.js';
import { MODES, MODE_ORDER, parseNumeral, chordIntervals, mod12 } from '../js/theory.js';
import { seededRng } from '../js/randomize.js';
import {
  setChord, moveEdge, deleteChord, splitChord, chordChoices, findProgression, sameProgression, snapToMeter,
} from '../js/progression-editor.js';

const CHORDS = ['i', 'IV', 'v', 'bVII'];
const prog = (bars, source = 'prog_test_01') => ({ source, mode: 'dorian', chords: bars.map((_, i) => CHORDS[i % 4]), bars });

// Each chord's length in steps; fails if one isn't a whole step.
function steps(p, meter) {
  const per = meterInfo(meter).stepsPerBar;
  return p.bars.map((b) => {
    const s = Math.round(b * per);
    assert.ok(Math.abs(b * per - s) < 1e-9, `${b} bars isn't a whole step in ${meter}`);
    return s;
  });
}
const edges = (lengths) => lengths.reduce((at, s) => [...at, at.at(-1) + s], [0]);

test('setChord changes one chord and ignores anything else', () => {
  const p = prog([1, 1, 1, 1]);
  assert.deepEqual(setChord(p, 1, 'ii7'), { ...p, chords: ['i', 'ii7', 'v', 'bVII'] });
  assert.equal(setChord(p, 1, 'IV'), p, 'the same chord is no edit');
  assert.equal(setChord(p, 1, 'Q'), p);
  assert.equal(setChord(p, 4, 'ii'), p);
  assert.equal(setChord(p, -1, 'ii'), p);
  assert.deepEqual(p.chords, CHORDS, 'the progression is not mutated');
});

test('an edit keeps a library id as source and turns generated into custom', () => {
  for (const [source, want] of [['prog_dorian_float_01', 'prog_dorian_float_01'], ['generated', 'custom'], ['custom', 'custom']]) {
    const p = prog([1, 1, 1, 1], source);
    for (const next of [setChord(p, 0, 'ii'), moveEdge(p, 0, 8, '4/4'), deleteChord(p, 0), splitChord(p, 0, '4/4')]) {
      assert.notEqual(next, p);
      assert.equal(next.source, want);
      assert.equal(next.mode, 'dorian');
    }
  }
});

test('moveEdge snaps to the pulse, keeps a pulse either side and never moves the last edge', () => {
  const p = prog([1, 1, 1, 1]);
  // 4/4: the pulse is a beat, 4 steps.
  assert.deepEqual(moveEdge(p, 0, 9.9, '4/4').bars, [0.5, 1.5, 1, 1]);
  assert.deepEqual(moveEdge(p, 0, 22, '4/4').bars, [1.5, 0.5, 1, 1]);
  assert.deepEqual(moveEdge(p, 0, 0, '4/4').bars, [0.25, 1.75, 1, 1], 'the first chord keeps a beat');
  assert.deepEqual(moveEdge(p, 0, 40, '4/4').bars, [1.75, 0.25, 1, 1], 'the second chord keeps a beat');
  assert.equal(moveEdge(p, 0, 17, '4/4'), p, 'snaps back to where it was');
  assert.equal(moveEdge(p, 3, 60, '4/4'), p, 'the loop’s last edge');
  assert.equal(moveEdge(p, 4, 8, '4/4'), p);
  assert.equal(moveEdge(p, 0, NaN, '4/4'), p);
  // Shorter on the last chord moves its start: the edge before it.
  assert.deepEqual(moveEdge(p, 2, 52, '4/4').bars, [1, 1, 1.25, 0.75]);
  // 3/4: a beat is a third of a bar. 6/8: the dotted quarter, half a bar.
  assert.deepEqual(moveEdge(p, 0, 4, '3/4').bars, [1 / 3, 5 / 3, 1, 1]);
  assert.deepEqual(moveEdge(p, 2, 26, '3/4').bars, [1, 1, 1 / 3, 5 / 3]);
  assert.deepEqual(moveEdge(p, 0, 7, '6/8').bars, [0.5, 1.5, 1, 1]);
  // Two chords of one pulse each have nowhere to go.
  const short = prog([0.5, 0.5, 3]);
  for (const to of [0, 3, 9, 30]) assert.equal(moveEdge(short, 0, to, '6/8'), short);
});

test('edges between pulses stay put until they’re moved', () => {
  // 3/4 half bars sit at step 6, between beats (every 4 steps).
  const p = prog([0.5, 0.5, 1, 2]);
  assert.deepEqual(moveEdge(p, 0, 7, '3/4').bars, [2 / 3, 1 / 3, 1, 2]);
  assert.equal(moveEdge(p, 1, 11, '3/4'), p, 'the chord from step 6 keeps a beat, so its end stays at 12');
  assert.deepEqual(moveEdge(p, 1, 15, '3/4').bars, [0.5, 5 / 6, 2 / 3, 2]);
});

test('deleteChord gives its time to the chord before, or the first chord’s to the next', () => {
  const p = prog([1, 1, 1, 1]);
  assert.deepEqual(deleteChord(p, 1), { ...p, chords: ['i', 'v', 'bVII'], bars: [2, 1, 1] });
  assert.deepEqual(deleteChord(p, 0), { ...p, chords: ['IV', 'v', 'bVII'], bars: [2, 1, 1] });
  assert.deepEqual(deleteChord(p, 3), { ...p, chords: ['i', 'IV', 'v'], bars: [1, 1, 2] });
  assert.equal(deleteChord(p, 4), p);
  const thirds = prog([1 / 3, 1 / 3, 1 / 3, 3]);
  assert.deepEqual(deleteChord(thirds, 1).bars, [2 / 3, 1 / 3, 3]);
  assert.deepEqual(deleteChord(deleteChord(thirds, 1), 1).bars, [1, 3], 'thirds add up to a whole bar');
});

test('splitChord cuts on the pulse nearest the middle, the earlier one if tied', () => {
  const split = (bars, i, meter) => splitChord(prog(bars), i, meter);
  assert.deepEqual(split([1, 3], 0, '4/4'), { ...prog([1, 3]), chords: ['i', 'i', 'IV'], bars: [0.5, 0.5, 3] });
  assert.deepEqual(split([0.75, 0.25, 3], 0, '4/4').bars, [0.25, 0.5, 0.25, 3], 'three beats: the earlier');
  assert.deepEqual(split([1, 3], 0, '3/4').bars, [1 / 3, 2 / 3, 3], 'a 3/4 bar: the earlier');
  assert.deepEqual(split([1, 3], 0, '6/8').bars, [0.5, 0.5, 3]);
  assert.deepEqual(split([0.5, 1.5, 2], 1, '3/4').bars, [0.5, 5 / 6, 2 / 3, 2], 'steps 6 to 24: the middle is 15, the pulse 16');
  // Under two pulses: a half bar in 6/8 or 3/4, a beat in 4/4.
  for (const [bars, meter] of [[[0.5, 3.5], '6/8'], [[0.5, 3.5], '3/4'], [[0.25, 3.75], '4/4']]) {
    const p = prog(bars);
    assert.equal(splitChord(p, 0, meter), p, `${bars} in ${meter}`);
  }
});

test('the limits: one pulse, the only chord, 16 chords and the fixed last edge', () => {
  const beat = prog([0.25, 1.75, 2]);
  assert.equal(moveEdge(beat, 0, 0, '4/4'), beat, 'a one-beat chord can’t get shorter');
  assert.equal(splitChord(beat, 0, '4/4'), beat);
  assert.deepEqual(splitChord(prog([0.5, 3.5]), 0, '4/4').bars, [0.25, 0.25, 3.5], 'two beats split into one each');

  const only = { source: 'custom', mode: 'dorian', chords: ['i'], bars: [4] };
  assert.equal(deleteChord(only, 0), only);
  assert.equal(moveEdge(only, 0, 8, '4/4'), only, 'its edge is the loop’s end');
  assert.deepEqual(splitChord(only, 0, '4/4').bars, [2, 2]);

  const full = splitChord(prog([...Array(14).fill(0.5), 1]), 14, '4/4');
  assert.equal(full.chords.length, 16);
  for (let i = 0; i < 16; i++) assert.equal(splitChord(full, i, '4/4'), full);
});

test('every edit in every meter keeps the loop’s length, whole steps and a pulse per chord', () => {
  const rng = seededRng(190);
  for (const meter of METERS) {
    const { stepsPerBar, pulse } = meterInfo(meter);
    for (const start of [[1, 1, 1, 1], [2, 1, 0.5, 0.5], [4, 4], [0.5, 0.5, 1]]) {
      const total = sumBars(start);
      let p = prog(start);
      for (let k = 0; k < 300; k++) {
        const i = Math.floor(rng() * p.chords.length);
        const before = steps(p, meter);
        const B = edges(before);
        const r = rng();
        const op = r < 0.5 ? 'move' : r < 0.8 ? 'split' : 'delete';
        const next = op === 'move' ? moveEdge(p, i, rng() * total * stepsPerBar, meter)
          : op === 'split' ? splitChord(p, i, meter) : deleteChord(p, i);
        const after = steps(next, meter);
        const E = edges(after);
        const why = `${meter} ${op} ${i} on ${p.bars}`;
        assert.equal(sumBars(next.bars), total, why);
        assert.equal(next.chords.length, next.bars.length, why);
        assert.ok(after.every((s) => s > 0), why);
        if (op === 'move' && next !== p) {
          assert.deepEqual(E.filter((_, j) => j !== i + 1), B.filter((_, j) => j !== i + 1), `${why}: only one edge moves`);
          assert.equal(E[i + 1] % pulse, 0, `${why}: on the pulse`);
          assert.ok(after[i] >= pulse && after[i + 1] >= pulse, `${why}: a pulse either side`);
        }
        if (op === 'split') {
          // A cut is possible when a pulse leaves at least one pulse each side.
          const canCut = p.chords.length < 16
            && Array.from({ length: before[i] + 1 }, (_, d) => d).some((d) => (B[i] + d) % pulse === 0 && d >= pulse && before[i] - d >= pulse);
          assert.equal(next !== p, canCut, why);
          if (canCut) {
            assert.deepEqual(next.chords.slice(i, i + 2), [p.chords[i], p.chords[i]], why);
            assert.equal(E[i + 1] % pulse, 0, `${why}: on the pulse`);
            assert.ok(after[i] >= pulse && after[i + 1] >= pulse, why);
          }
        }
        if (op === 'delete') assert.equal(next.chords.length, Math.max(1, p.chords.length - 1), why);
        p = next;
      }
    }
  }
});

test('chordChoices: the mode’s 7 chords, each in its scale', () => {
  for (const mode of MODE_ORDER) {
    const { diatonic } = chordChoices(mode);
    const scale = new Set(MODES[mode].steps);
    assert.equal(diatonic.length, 7, mode);
    diatonic.forEach((n, d) => {
      const p = parseNumeral(n);
      assert.ok(p && !p.ext, `${mode}: ${n}`);
      assert.equal(p.degree, d + 1, `${mode}: ${n}`);
      for (const iv of chordIntervals(p.quality, null)) assert.ok(scale.has(mod12(p.offset + iv)), `${mode}: ${n}`);
    });
    for (const c of Object.keys(MODES[mode].pool)) assert.ok(diatonic.includes(c), `${mode}: pool chord ${c}`);
  }
  assert.deepEqual(chordChoices('dorian').diatonic, ['i', 'ii', 'bIII', 'IV', 'v', 'vi°', 'bVII']);
  assert.deepEqual(chordChoices('ionian').diatonic, ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual(chordChoices('lydian').diatonic, ['I', 'II', 'iii', '#iv°', 'V', 'vi', 'vii']);
});

test('chordChoices: borrowed chords never repeat a diatonic one and are never diminished', () => {
  const parallel = [...chordChoices('ionian').diatonic, ...chordChoices('aeolian').diatonic];
  for (const mode of MODE_ORDER) {
    const { diatonic, borrowed } = chordChoices(mode);
    assert.equal(new Set(borrowed).size, borrowed.length, mode);
    for (const n of borrowed) {
      assert.ok(!diatonic.includes(n), `${mode}: ${n} is the mode’s own`);
      assert.notEqual(parseNumeral(n).quality, 'dim', `${mode}: ${n}`);
      assert.ok(parallel.includes(n), `${mode}: ${n} is from the parallel major or minor`);
    }
    const degrees = borrowed.map((n) => parseNumeral(n).degree);
    assert.deepEqual(degrees, [...degrees].sort((a, b) => a - b), `${mode}: in degree order`);
  }
  assert.deepEqual(chordChoices('ionian').borrowed, ['i', 'bIII', 'iv', 'v', 'bVI', 'bVII']);
  assert.deepEqual(chordChoices('aeolian').borrowed, ['I', 'ii', 'iii', 'IV', 'V', 'vi']);
  assert.deepEqual(chordChoices('dorian').borrowed, ['I', 'iii', 'iv', 'V', 'bVI', 'vi']);
});

test('chordChoices: the extensions, and the two a diminished chord takes', () => {
  const { extensions } = chordChoices('dorian');
  assert.deepEqual(extensions.map((e) => e.label), ['Auto', '7', 'maj7', 'sus2', 'sus4', 'add9', '6', '9']);
  assert.deepEqual(extensions.filter((e) => e.dim).map((e) => e.label), ['Auto', '7']);
  assert.equal(extensions[0].ext, null, 'Auto stores the plain numeral');
  for (const { ext } of extensions.slice(1)) assert.equal(parseNumeral(`bVII${ext}`).ext, ext);
  assert.equal(parseNumeral('vi°7').ext, '7');
});

test('findProgression matches by content, not id', () => {
  for (const p of LIB.progressions) {
    const copy = { source: 'generated', mode: p.mode, chords: [...p.chords], bars: [...p.bars] };
    assert.equal(findProgression(LIB, copy), p, p.id);
    assert.equal(findProgression(LIB, { ...copy, bars: p.bars.map((b) => b + 1e-12) }), p, `${p.id}, after drift`);
  }
  const lib = LIB.progressionById.get('prog_dorian_float_01');
  const idea = { source: lib.id, mode: lib.mode, chords: [...lib.chords], bars: [...lib.bars] };
  assert.equal(findProgression(LIB, { ...idea, source: 'prog_aeolian_drift_02' }), lib, 'source doesn’t matter');
  assert.equal(findProgression(LIB, setChord(idea, 1, 'ii')), null, 'an edit is Custom');
  assert.equal(findProgression(LIB, moveEdge(idea, 0, 8, '4/4')), null);
  assert.equal(findProgression(LIB, { ...idea, mode: 'aeolian' }), null, 'the mode counts');
  assert.equal(findProgression(LIB, null), null);
  assert.ok(sameProgression(idea, lib));

  const mine = { id: 'prog_my_thing_01', mode: 'dorian', chords: ['i', 'ii', 'IV'], bars: [2, 1, 1], addedAt: '2026-11-10T00:00:00Z' };
  const withIt = withMine(LIB, { progressions: [mine] });
  const rolled = { source: 'generated', mode: 'dorian', chords: ['i', 'ii', 'IV'], bars: [2, 1, 1] };
  assert.equal(findProgression(LIB, rolled), null);
  assert.equal(findProgression(withIt, rolled), withIt.progressionById.get(mine.id), 'a My progression too');
});

test('a 3/4 → 4/4 change moves only the edges that miss, and reports what it drops', () => {
  // 2/3 of a bar misses the 4/4 grid and goes to the nearest beat; 1, 2, 2.5 and 3 don't.
  const p = prog([2 / 3, 1 / 3, 1, 0.5, 0.5, 1]);
  const { progression, dropped } = snapToMeter(p, '4/4');
  assert.deepEqual(progression, { ...p, bars: [0.75, 0.25, 1, 0.5, 0.5, 1] });
  assert.equal(dropped, 0);
  assert.deepEqual(snapToMeter(p, '6/8'), { progression: p, dropped: 0 }, 'a 3/4 beat is a whole step in 6/8');

  // A 16th between a 4/4 beat (kept, it's a 3/4 step too) and a 3/4 beat: both
  // edges land on the same 4/4 beat, and the chord between goes.
  const squeezed = prog([0.25, 1 / 12, 2 / 3, 3]);
  steps(squeezed, '3/4');
  const s = snapToMeter(squeezed, '4/4');
  assert.deepEqual(s.progression.chords, ['i', 'v', 'bVII']);
  assert.deepEqual(s.progression.bars, [0.25, 0.75, 3]);
  assert.equal(s.dropped, 1);
  assert.equal(s.progression.source, 'prog_test_01');
  assert.equal(snapToMeter({ ...squeezed, source: 'generated' }, '4/4').progression.source, 'custom');
});

test('a half-bar progression comes through every meter change unchanged', () => {
  for (const p of LIB.progressions) {
    for (const meter of METERS) assert.deepEqual(snapToMeter(p, meter), { progression: p, dropped: 0 }, `${p.id} to ${meter}`);
  }
  // So does anything edited on a 4/4 beat or a 6/8 dotted quarter, which are
  // whole steps in every meter.
  const rng = seededRng(191);
  for (const meter of ['4/4', '6/8']) {
    let p = prog([1, 1, 1, 1]);
    for (let k = 0; k < 200; k++) {
      p = moveEdge(splitChord(p, Math.floor(rng() * p.chords.length), meter), Math.floor(rng() * p.chords.length), rng() * 64, meter);
      for (const to of METERS) assert.equal(snapToMeter(p, to).progression, p, `${meter} ${p.bars} to ${to}`);
    }
  }
});
