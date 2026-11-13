// Strum patterns: editing, resizing, matching and My strums (PLAN steps 12, 14 and 22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { METERS } from '../js/loop.js';
import {
  STRUM_BARS, STRUM_RES, cellsPerBar, strumFrom, setStroke, resizeStrum, validStrum, findStrum,
  makeMyStrum, addMyStrum, removeMyStrum, cleanMyStrums, isMine, countLabel, isPulse, strumCellAt,
} from '../js/strum-editor.js';

const strum = (pattern, res = 8, bars = 1, source = 'strum_test_01') => ({ source, res, bars, pattern });
const NOW = Date.parse('2026-11-06T18:02:11Z');

test('setStroke changes one step and ignores anything else', () => {
  const s = strum('D.DU.UDU');
  assert.equal(setStroke(s, 1, 'x').pattern, 'DxDU.UDU');
  assert.equal(setStroke(s, 0, '.').pattern, '..DU.UDU');
  assert.equal(setStroke(s, 1, 'Q'), s);
  assert.equal(setStroke(s, 8, 'D'), s);
  assert.equal(s.pattern, 'D.DU.UDU', 'the strum is not mutated');
  assert.equal(setStroke(s, 1, 'x').source, 'strum_test_01', 'an edit keeps the strum it came from');
});

test('resizing bars repeats the bar going up and drops it going down', () => {
  const two = resizeStrum(strum('D.DU.UDU'), '4/4', { bars: 2 });
  assert.equal(two.strum.pattern, 'D.DU.UDUD.DU.UDU');
  assert.equal(two.dropped, 0);
  const one = resizeStrum(strum('D.DU.UDUD...D.D.', 8, 2), '4/4', { bars: 1 });
  assert.equal(one.strum.pattern, 'D.DU.UDU');
  assert.equal(one.dropped, 3);
});

test('resizing the grid keeps 8ths on the 16th grid and drops 16ths going back', () => {
  const up = resizeStrum(strum('D.DU.UDU'), '4/4', { res: 16 });
  assert.equal(up.strum.pattern, 'D...D.U...U.D.U.');
  const back = resizeStrum(setStroke(up.strum, 3, 'U'), '4/4', { res: 8 });
  assert.equal(back.strum.pattern, 'D.DU.UDU');
  assert.equal(back.dropped, 1);
});

test('resizing the meter keeps each bar\'s start', () => {
  const s = strum('D.DU.UDUD.x.D.x.', 8, 2);
  const waltz = resizeStrum(s, '4/4', { to: '3/4' });
  assert.equal(waltz.strum.pattern, 'D.DU.UD.x.D.');
  assert.equal(waltz.dropped, 3);
  assert.equal(resizeStrum(waltz.strum, '3/4', { to: '4/4' }).strum.pattern, 'D.DU.U..D.x.D...');
  assert.equal(resizeStrum(strum('DDUDDU'), '6/8', { to: '3/4' }).strum.pattern, 'DDUDDU');
});

test('every resize fits the meter, grid and length it asks for', () => {
  for (const meter of METERS) {
    for (const res of STRUM_RES) {
      for (const bars of STRUM_BARS) {
        const s = strumFrom(LIB.strums.find((x) => x.meter === meter));
        const out = resizeStrum(s, meter, { res, bars }).strum;
        assert.deepEqual(validStrum(out, meter), out, `${meter} ${res} ${bars}`);
      }
    }
  }
});

test('a strum must have a grid, length and characters that fit the meter', () => {
  const good = strum('D.DU.UDU');
  assert.deepEqual(validStrum({ ...good, extra: 1 }, '4/4'), good);
  assert.deepEqual(validStrum({ ...good, source: 7 }, '4/4'), { ...good, source: null });
  assert.deepEqual(validStrum({ res: 8, bars: 1, pattern: 'D.DU.UDU' }, '4/4'), { ...good, source: null });
  assert.equal(validStrum(null, '4/4'), null);
  assert.equal(validStrum('strum_classic_01', '4/4'), null);
  assert.equal(validStrum(good, '3/4'), null, 'a 4/4 bar is too long for 3/4');
  assert.equal(validStrum({ ...good, res: 4 }, '4/4'), null);
  assert.equal(validStrum({ ...good, bars: 3 }, '4/4'), null);
  assert.equal(validStrum({ ...good, pattern: 'D.DU.UD' }, '4/4'), null);
  assert.equal(validStrum({ ...good, pattern: 'D.DU.UDQ' }, '4/4'), null);
  for (const s of LIB.strums) assert.deepEqual(validStrum(strumFrom(s), s.meter), strumFrom(s), s.id);
});

test('findStrum matches by content, not id', () => {
  const classic = LIB.strumById.get('strum_classic_01');
  assert.equal(findStrum(LIB, strumFrom(classic), '4/4'), classic);
  assert.equal(findStrum(LIB, { ...strumFrom(classic), source: 'strum_whole_01' }, '4/4'), classic, 'source doesn\'t matter');
  assert.equal(findStrum(LIB, { ...strumFrom(classic), source: null }, '4/4'), classic);
  assert.equal(findStrum(LIB, setStroke(strumFrom(classic), 1, 'x'), '4/4'), null, 'an edit is Custom');
  // Same pattern, different meter, grid or length: no match.
  const six = LIB.strumById.get('strum_six_eight_classic_01');
  assert.equal(findStrum(LIB, strumFrom(six), '3/4'), null);
  assert.equal(findStrum(LIB, { ...strumFrom(classic), res: 16 }, '4/4'), null);
  assert.equal(findStrum(LIB, { ...strumFrom(classic), bars: 2 }, '4/4'), null);
});

test('My strums get ids from the time they were added', () => {
  const s = setStroke(strumFrom(LIB.strumById.get('strum_classic_01')), 1, 'x');
  const mine = makeMyStrum(s, '4/4', NOW);
  assert.deepEqual(mine, { id: `mine-${NOW.toString(36)}`, meter: '4/4', res: 8, bars: 1, pattern: 'DxDU.UDU', addedAt: '2026-11-06T18:02:11.000Z' });
  assert.ok(isMine(mine.id));
  assert.notEqual(makeMyStrum(s, '4/4', NOW + 1).id, mine.id);
  assert.ok(!LIB.strums.some((x) => isMine(x.id)), 'built-in ids never look like My strums');
});

test('adding and removing My strums', () => {
  const a = makeMyStrum(strum('DxDU.UDU'), '4/4', NOW);
  const b = makeMyStrum(strum('D.x.x.'), '3/4', NOW + 1000);
  let mine = addMyStrum([], a);
  mine = addMyStrum(mine, b);
  assert.deepEqual(mine.map((s) => s.id), [b.id, a.id], 'newest first');
  assert.equal(addMyStrum(mine, makeMyStrum(strum('DxDU.UDU'), '4/4', NOW + 2000)), mine, 'the same pattern isn\'t added twice');
  assert.equal(addMyStrum(mine, makeMyStrum(strum('D.x.x.'), '6/8', NOW + 2000)).length, 3,
    'the same characters in another meter are a different strum');
  assert.deepEqual(removeMyStrum(mine, a.id), [b]);
  assert.deepEqual(removeMyStrum(mine, 'mine-nope'), mine);
  assert.equal(mine.length, 2, 'nothing is mutated');
});

test('My strums join the library, after the built-in strums', () => {
  const a = makeMyStrum(strum('DxDU.UDU'), '4/4', NOW);
  const lib = withMine(LIB, { strums: [a] });
  assert.deepEqual(lib.strums, [...LIB.strums, a]);
  assert.equal(lib.strumById.get(a.id), a);
  assert.deepEqual(lib.myStrums, [a]);
  assert.equal(findStrum(lib, strumFrom(a), '4/4'), a);
  assert.equal(findStrum(LIB, strumFrom(a), '4/4'), null);
  // Replacing the list drops the old ones, and the built-in strums stay.
  const after = withMine(lib, { strums: [] });
  assert.deepEqual(after.strums, LIB.strums);
  assert.equal(after.strumById.get(a.id), undefined);
  assert.equal(LIB.myStrums.length, 0, 'the built-in library is not changed');
});

test('stored My strums are checked as they load', () => {
  const a = makeMyStrum(strum('DxDU.UDU'), '4/4', NOW);
  assert.deepEqual(cleanMyStrums([a, { ...a, extra: 1 }]), [a], 'duplicates and extra fields go');
  assert.deepEqual(cleanMyStrums(null), []);
  assert.deepEqual(cleanMyStrums({ a }), []);
  for (const bad of [
    null, { ...a, id: 'strum_classic_01' }, { ...a, id: 7 }, { ...a, meter: '5/4' }, { ...a, pattern: 'DxDU' },
    { ...a, pattern: 'DxDU.UDQ' }, { ...a, res: 4 }, { ...a, bars: 3 }, { ...a, addedAt: 5 },
  ]) {
    assert.deepEqual(cleanMyStrums([bad]), [], JSON.stringify(bad));
  }
});

test('counts read the way a musician counts', () => {
  const bar = (meter, res) => Array.from({ length: cellsPerBar(meter, res) }, (_, i) => countLabel(meter, res, i)).join(' ');
  assert.equal(bar('4/4', 8), '1 & 2 & 3 & 4 &');
  assert.equal(bar('4/4', 16), '1 e & a 2 e & a 3 e & a 4 e & a');
  assert.equal(bar('3/4', 8), '1 & 2 & 3 &');
  assert.equal(bar('6/8', 8), '1 2 3 4 5 6');
  assert.equal(bar('6/8', 16), '1 & 2 & 3 & 4 & 5 & 6 &');
  assert.equal(countLabel('4/4', 8, 10), '2', 'bar 2 counts from 1 again');
});

test('pulses fall on the beat, and on the dotted quarter in 6/8', () => {
  const pulses = (meter, res) => Array.from({ length: cellsPerBar(meter, res) }, (_, i) => i).filter((i) => isPulse(meter, res, i));
  assert.deepEqual(pulses('4/4', 8), [0, 2, 4, 6]);
  assert.deepEqual(pulses('4/4', 16), [0, 4, 8, 12]);
  assert.deepEqual(pulses('3/4', 8), [0, 2, 4]);
  assert.deepEqual(pulses('6/8', 8), [0, 3]);
  assert.deepEqual(pulses('6/8', 16), [0, 6]);
});

test('a loop step edits the pattern cell it plays, from any repeat', () => {
  const eighths = strum('D.DU.UDU');
  assert.equal(strumCellAt(eighths, 0), 0);
  assert.equal(strumCellAt(eighths, 6), 3, 'the 4th 8th');
  assert.equal(strumCellAt(eighths, 3 * 16 + 6), 3, 'bar 4 of a 1-bar strum');
  const two = strum('D.DU.UDUx.x.x.x.', 8, 2);
  assert.equal(strumCellAt(two, 16 + 6), 11, 'bar 2 of a 2-bar strum');
  assert.equal(strumCellAt(two, 48 + 6), 11, 'bar 4 is a repeat of bar 2');
  assert.equal(strumCellAt(strum('D..U..x.D.U.x...', 16), 16 + 3), 3, 'a 16th strum');
  const waltz = strum('D.DUDU');
  assert.equal(strumCellAt(waltz, 12 + 4), 2, 'a 3/4 bar is 12 steps');
});
