import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefillRows, copyRow, readWeight, readRow, readRows, rowsDiffer, weightValid, repsValid } from '../js/log-rows.js';

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
