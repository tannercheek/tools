import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toKg } from '../js/format.js';
import {
  prefillRows, copyRow, readWeight, readRow, readRows, rowsDiffer, weightValid, repsValid,
  stepValue, stepWeight, stepReps, WEIGHT_STEP, REPS_STEP,
} from '../js/log-rows.js';

const bench = { equipment: 'barbell', lastSets: [{ weightKg: 102.06, reps: 5 }, { weightKg: 102.06, reps: 4 }] };
const pullUp = { equipment: 'bodyweight', lastSets: [{ weightKg: 0, reps: 12 }, { weightKg: 6.8, reps: 8 }] };

test('prefill: lastSets in the display unit, one decimal at most', () => {
  const rows = prefillRows(bench, 'lb');
  assert.deepEqual(rows.map(r => [r.weight, r.reps]), [['225', '5'], ['225', '4']]);
  assert.equal(rows[0].prefill.kg, 102.06);
  assert.deepEqual(prefillRows(bench, 'kg').map(r => r.weight), ['102.1', '102.1']);
});

test('prefill: a first session is one empty row; no-weight bodyweight and band sets prefill empty', () => {
  assert.deepEqual(prefillRows({ equipment: 'barbell', lastSets: [] }, 'lb'), [{ weight: '', reps: '', prefill: null }]);
  assert.deepEqual(prefillRows(pullUp, 'lb').map(r => r.weight), ['', '15']);
  const band = { equipment: 'band', lastSets: [{ weightKg: 0, reps: 20 }, { weightKg: 9.07, reps: 15 }] };
  assert.deepEqual(prefillRows(band, 'lb').map(r => r.weight), ['', '20']);
});

test('weights: empty means 0 only where no weight is allowed (bodyweight, band); above 0 otherwise; comma accepted', () => {
  assert.equal(readWeight('', true), 0);
  assert.ok(Number.isNaN(readWeight('', false)));
  assert.ok(Number.isNaN(readWeight('0', false)));
  assert.equal(readWeight('0', true), 0);
  assert.equal(readWeight('102,5', false), 102.5);
  assert.ok(Number.isNaN(readWeight('-5', true)));
  assert.ok(Number.isNaN(readWeight('abc', true)));
  assert.equal(weightValid('225', false), true);
  assert.equal(weightValid('', false), false);
});

test('reps: whole numbers 1 to 100; empty is invalid', () => {
  assert.equal(repsValid('5'), true);
  assert.equal(repsValid(''), false);
  assert.equal(repsValid('0'), false);
  assert.equal(repsValid('101'), false);
  assert.equal(repsValid('5.5'), false);
});

test('an unchanged prefilled row keeps its original kg; an edited one converts', () => {
  const kgBench = { equipment: 'barbell', lastSets: [{ weightKg: 100, reps: 5 }] };
  const [row] = prefillRows(kgBench, 'lb');   // shows 220.5
  assert.equal(row.weight, '220.5');
  assert.deepEqual(readRow(row, 'lb', false), { weightKg: 100, reps: 5 });   // not 100.02
  const edited = { ...row, weight: '225' };
  assert.ok(Math.abs(readRow(edited, 'lb', false).weightKg - 102.0583) < 1e-4);
  // Retyping the same text still counts as unchanged
  assert.deepEqual(readRow({ ...row, weight: ' 220.5 ' }, 'lb', false), { weightKg: 100, reps: 5 });
  // A copied row carries the prefill with it
  assert.deepEqual(readRow(copyRow(row), 'lb', false), { weightKg: 100, reps: 5 });
});

test('readRows: all rows as sets, or null if any is invalid', () => {
  const rows = prefillRows(pullUp, 'lb');
  assert.deepEqual(readRows(rows, 'lb', true), [{ weightKg: 0, reps: 12 }, { weightKg: 6.8, reps: 8 }]);
  assert.equal(readRows([...rows, { weight: '10', reps: '', prefill: null }], 'lb', true), null);
});

test('rowsDiffer: any text edit, added row or removed row', () => {
  const initial = prefillRows(bench, 'lb');
  const same = initial.map(copyRow);
  assert.equal(rowsDiffer(initial, same), false);
  assert.equal(rowsDiffer(initial, [{ ...same[0], reps: '6' }, same[1]]), true);
  assert.equal(rowsDiffer(initial, [...same, copyRow(same[1])]), true);
  assert.equal(rowsDiffer(initial, [same[0]]), true);
  // Changing a field and changing it back is not a difference
  assert.equal(rowsDiffer(initial, [{ ...same[0], weight: '225' }, same[1]]), false);
});

test('step sizes: 5 lb, 2.5 kg, 1 rep', () => {
  assert.deepEqual(WEIGHT_STEP, { lb: 5, kg: 2.5 });
  assert.equal(REPS_STEP, 1);
});

test('stepValue: adds the step without snapping, rounded to one decimal', () => {
  assert.equal(stepValue(102.5, 5), 107.5);
  assert.equal(stepValue(107.5, -5), 102.5);
  assert.equal(stepValue(0.1, 0.2), 0.3);           // not 0.30000000000000004
  assert.equal(stepValue(22.6, 2.5), 25.1);         // not 25.100000000000001
  assert.equal(stepValue(1102.5, 2.5), 1105);
});

test('stepValue: empty counts as 0; unreadable does nothing', () => {
  assert.equal(stepValue(null, 5), 5);
  assert.equal(stepValue(null, 1, { min: 1, max: 100 }), 1);
  assert.equal(stepValue(NaN, 5), null);
  assert.equal(stepValue(NaN, -5), null);
});

test('stepValue: stays within min and max, and never moves the wrong way', () => {
  assert.equal(stepValue(100, 1, { min: 1, max: 100 }), null);   // already at the top
  assert.equal(stepValue(1, -1, { min: 1, max: 100 }), null);    // already at the bottom
  assert.equal(stepValue(null, -1, { min: 1, max: 100 }), null); // − on empty reps doesn't jump up to 1
  assert.equal(stepValue(7, -5, { min: 5 }), 5);                 // stops at the minimum
  assert.equal(stepValue(3, -5, { min: 5 }), null);              // below the minimum: − can't raise it
  assert.equal(stepValue(150, -1, { min: 1, max: 100 }), 100);   // over the top: − brings it back in range
});

test('stepWeight: 5 lb or 2.5 kg, following the unit', () => {
  assert.equal(stepWeight('225', 1, 'lb', false), '230');
  assert.equal(stepWeight('225', -1, 'lb', false), '220');
  assert.equal(stepWeight('100', 1, 'kg', false), '102.5');
  assert.equal(stepWeight('102.5', 1, 'lb', false), '107.5');
  assert.equal(stepWeight('102,5', 1, 'kg', false), '105');   // a comma reads as a decimal point
});

test('stepWeight: bodyweight and band lifts can go down to 0', () => {
  assert.equal(stepWeight('5', -1, 'lb', true), '0');
  assert.equal(stepWeight('0', -1, 'lb', true), null);
  assert.equal(stepWeight('', -1, 'lb', true), null);
  assert.equal(stepWeight('', 1, 'lb', true), '5');
  assert.equal(stepWeight('', 1, 'kg', true), '2.5');
  assert.equal(stepWeight('2.5', -1, 'kg', true), '0');
});

test('stepWeight: every other lift stops at one step', () => {
  assert.equal(stepWeight('5', -1, 'lb', false), null);
  assert.equal(stepWeight('10', -1, 'lb', false), '5');
  assert.equal(stepWeight('2.5', -1, 'kg', false), null);
  assert.equal(stepWeight('', 1, 'lb', false), '5');
  assert.equal(stepWeight('', -1, 'lb', false), null);
  assert.equal(stepWeight('7', -1, 'lb', false), '5');
});

test('stepWeight: unreadable or negative text does nothing', () => {
  assert.equal(stepWeight('abc', 1, 'lb', false), null);
  assert.equal(stepWeight('abc', -1, 'lb', true), null);
  assert.equal(stepWeight('-5', 1, 'lb', true), null);
  assert.equal(stepWeight('1.2.3', 1, 'kg', false), null);
});

test('stepReps: steps by 1 within 1 to 100; empty counts as 0', () => {
  assert.equal(stepReps('5', 1), '6');
  assert.equal(stepReps('5', -1), '4');
  assert.equal(stepReps('', 1), '1');
  assert.equal(stepReps('', -1), null);
  assert.equal(stepReps('1', -1), null);
  assert.equal(stepReps('100', 1), null);
  assert.equal(stepReps('99', 1), '100');
  assert.equal(stepReps('5.5', 1), null);
  assert.equal(stepReps('x', -1), null);
});

test('a stepped row counts as edited: it asks to discard and converts its weight', () => {
  const initial = prefillRows({ equipment: 'barbell', lastSets: [{ weightKg: 100, reps: 5 }] }, 'lb');   // 220.5
  const row = copyRow(initial[0]);
  row.weight = stepWeight(row.weight, 1, 'lb', false);
  assert.equal(row.weight, '225.5');
  assert.equal(rowsDiffer(initial, [row]), true);
  assert.ok(Math.abs(readRow(row, 'lb', false).weightKg - toKg(225.5, 'lb')) < 1e-9);
  const reps = copyRow(initial[0]);
  reps.reps = stepReps(reps.reps, 1);
  assert.equal(rowsDiffer(initial, [reps]), true);
});
