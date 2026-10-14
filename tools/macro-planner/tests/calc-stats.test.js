import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageDailyTotals, weekDates } from '../js/calc.js';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function entry(kcal, protein, fat = 0, carbs = 0) {
  return { kcal, protein, fat, carbs };
}

// Each item is a day's entries, or null for a day with no log at all.
function days(perDay) {
  return perDay.map((entries) => (entries ? { entries, swaps: {} } : {}));
}

// --- Averages ---

test('averages are over logged days only; empty days are left out, not counted as zero', () => {
  const week = days([
    null,
    [entry(2000, 150, 60, 200)],
    null,
    [entry(2200, 120, 70, 230)],
    [],
    [entry(2400, 180, 80, 260)],
    null,
  ]);
  const { average, loggedDays } = averageDailyTotals(week);
  assert.equal(loggedDays, 3);
  assertClose(average.kcal, 2200);
  assertClose(average.protein, 150);
  assertClose(average.fat, 70);
  assertClose(average.carbs, 230);
});

test('a day’s entries are added up before averaging across days', () => {
  const { average } = averageDailyTotals(days([[entry(1000, 50), entry(1000, 70)], [entry(2600, 160)]]));
  assertClose(average.kcal, 2300);
  assertClose(average.protein, 140);
});

test('a day with only a swap and no entries is still empty', () => {
  const week = [{ entries: [], swaps: { s1: 'm2' } }, { swaps: { s2: 'm3' } }, { entries: [entry(1800, 140)] }];
  const { average, loggedDays } = averageDailyTotals(week);
  assert.equal(loggedDays, 1);
  assertClose(average.kcal, 1800);
});

test('an all-empty week has no average, rather than zeros', () => {
  assert.deepEqual(averageDailyTotals(days([null, [], null, null, null, null, null])), {
    average: null,
    loggedDays: 0,
  });
  assert.deepEqual(averageDailyTotals([]), { average: null, loggedDays: 0 });
});

// --- This week's dates ---

test('a week runs from Monday to today', () => {
  assert.deepEqual(weekDates('2026-10-14'), ['2026-10-12', '2026-10-13', '2026-10-14']); // Wednesday
});

test('on a Monday the week is just that day', () => {
  assert.deepEqual(weekDates('2026-10-12'), ['2026-10-12']);
});

test('on a Sunday the week is all seven days', () => {
  assert.deepEqual(weekDates('2026-10-18'), [
    '2026-10-12',
    '2026-10-13',
    '2026-10-14',
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
  ]);
});

test('a week can start in the previous month', () => {
  assert.deepEqual(weekDates('2026-03-01'), [
    '2026-02-23',
    '2026-02-24',
    '2026-02-25',
    '2026-02-26',
    '2026-02-27',
    '2026-02-28',
    '2026-03-01',
  ]);
});

test('a week can start in the previous year', () => {
  assert.deepEqual(weekDates('2026-01-01'), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01']);
});

test('a week includes a leap day', () => {
  assert.deepEqual(weekDates('2028-03-01'), ['2028-02-28', '2028-02-29', '2028-03-01']);
});

test('weeks with a clock change still have one entry per day', () => {
  // Europe springs forward on 29 Mar 2026; the US falls back on 1 Nov 2026.
  assert.deepEqual(weekDates('2026-03-29'), [
    '2026-03-23',
    '2026-03-24',
    '2026-03-25',
    '2026-03-26',
    '2026-03-27',
    '2026-03-28',
    '2026-03-29',
  ]);
  assert.equal(weekDates('2026-11-01').length, 7);
  assert.equal(weekDates('2026-11-01')[0], '2026-10-26');
});

test('every week starts on a Monday and ends today', () => {
  for (let day = 1; day <= 31; day++) {
    const today = `2026-12-${String(day).padStart(2, '0')}`;
    const week = weekDates(today);
    assert.equal(new Date(`${week[0]}T00:00:00Z`).getUTCDay(), 1, `${today} starts ${week[0]}`);
    assert.equal(week.at(-1), today);
    assert.ok(week.length >= 1 && week.length <= 7, `${today}: ${week.length} days`);
  }
});

test('weekDates rejects a date that isn’t YYYY-MM-DD', () => {
  for (const today of ['Oct 14', '2026-10-1', '', undefined]) {
    assert.throws(() => weekDates(today), RangeError, String(today));
  }
});

// --- A week of test data ---

test('this week’s average from a Wednesday, with Tuesday empty', () => {
  const log = {
    '2026-10-11': { entries: [entry(5000, 300)] }, // Sunday: last week, not counted
    '2026-10-12': { entries: [entry(2100, 150, 70, 220), entry(300, 20, 10, 30)] },
    '2026-10-14': { entries: [entry(2000, 140, 60, 210)] },
  };
  const week = weekDates('2026-10-14').map((date) => log[date] ?? {});
  const { average, loggedDays } = averageDailyTotals(week);
  assert.equal(loggedDays, 2);
  assertClose(average.kcal, 2200);
  assertClose(average.protein, 155);
  assertClose(average.fat, 70);
  assertClose(average.carbs, 230);
});
