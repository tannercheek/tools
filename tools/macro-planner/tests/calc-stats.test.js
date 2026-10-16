import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageDailyTotals, lastSevenDates, weightRate } from '../js/calc.js';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function entry(kcal, protein, fat = 0, carbs = 0) {
  return { kcal, protein, fat, carbs };
}

// Each item is a day's entries, or null for a day with no log at all.
function days(perDay) {
  return perDay.map((entries) => (entries ? { entries, changes: {} } : {}));
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

test('a day with only changes and no entries is still empty', () => {
  const week = [
    { entries: [], changes: { s1: { mealId: 'm2' } } },
    { changes: { s2: { mealId: null } } },
    { entries: [entry(1800, 140)] },
  ];
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

// --- The last 7 days ---

test('the last 7 days are the 7 before today, oldest first, without today', () => {
  assert.deepEqual(lastSevenDates('2026-10-15'), [
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11',
    '2026-10-12',
    '2026-10-13',
    '2026-10-14',
  ]);
});

test('the last 7 days can start in the previous month', () => {
  assert.deepEqual(lastSevenDates('2026-03-03'), [
    '2026-02-24',
    '2026-02-25',
    '2026-02-26',
    '2026-02-27',
    '2026-02-28',
    '2026-03-01',
    '2026-03-02',
  ]);
});

test('the last 7 days include a leap day', () => {
  assert.ok(lastSevenDates('2028-03-02').includes('2028-02-29'));
  assert.equal(lastSevenDates('2028-03-02')[0], '2028-02-24');
});

test('the last 7 days can start in the previous year', () => {
  assert.deepEqual(lastSevenDates('2026-01-03'), [
    '2025-12-27',
    '2025-12-28',
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
  ]);
});

test('the last 7 days across a clock change still have one entry per day', () => {
  // Europe springs forward on 29 Mar 2026; the US falls back on 1 Nov 2026.
  assert.deepEqual(lastSevenDates('2026-03-31'), [
    '2026-03-24',
    '2026-03-25',
    '2026-03-26',
    '2026-03-27',
    '2026-03-28',
    '2026-03-29',
    '2026-03-30',
  ]);
  assert.deepEqual(lastSevenDates('2026-11-03'), [
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
  ]);
});

test('every day of a year gives 7 consecutive days ending yesterday', () => {
  const oneDay = 86_400_000;
  for (let n = 0; n < 365; n++) {
    const today = new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
    const dates = lastSevenDates(today).map((date) => Date.parse(`${date}T00:00:00Z`));
    assert.equal(dates.length, 7, today);
    assert.equal(Date.parse(`${today}T00:00:00Z`) - dates.at(-1), oneDay, today);
    for (let i = 1; i < 7; i++) assert.equal(dates[i] - dates[i - 1], oneDay, today);
  }
});

test('lastSevenDates rejects a date that isn’t YYYY-MM-DD', () => {
  for (const today of ['Oct 14', '2026-10-1', '', undefined]) {
    assert.throws(() => lastSevenDates(today), RangeError, String(today));
  }
});

// --- A week of test data ---

test('the 7-day average leaves out today and 8 days ago, and skips an empty day', () => {
  const log = {
    '2026-10-07': { entries: [entry(5000, 300)] }, // 8 days ago: outside the window
    '2026-10-08': { entries: [entry(2100, 150, 70, 220), entry(300, 20, 10, 30)] }, // 7 days ago
    '2026-10-10': { entries: [] },
    '2026-10-14': { entries: [entry(2000, 140, 60, 210)] }, // yesterday
    '2026-10-15': { entries: [entry(9000, 500)] }, // today: still in progress
  };
  const week = lastSevenDates('2026-10-15').map((date) => log[date] ?? {});
  const { average, loggedDays } = averageDailyTotals(week);
  assert.equal(loggedDays, 2);
  assertClose(average.kcal, 2200);
  assertClose(average.protein, 155);
  assertClose(average.fat, 70);
  assertClose(average.carbs, 230);
});

// --- Weight rate ---

const TODAY = '2026-10-15';

function daysAgo(n) {
  return new Date(Date.UTC(2026, 9, 15 - n)).toISOString().slice(0, 10);
}

// A weigh-in on a line that changes by ratePerWeek, reaching endKg today.
function onLine(n, ratePerWeek, endKg = 82.5) {
  return { date: daysAgo(n), kg: endKg - (ratePerWeek * n) / 7 };
}

test('daily weigh-ins on a steady loss give that loss per week', () => {
  const weighIns = Array.from({ length: 28 }, (_, i) => onLine(27 - i, -0.5));
  assertClose(weightRate(weighIns, TODAY), -0.5);
});

test('sporadic weigh-ins are placed by date, in any order', () => {
  // Uneven gaps, starting in the previous month.
  const weighIns = [26, 19, 11, 10, 3].map((n) => onLine(n, 0.25));
  assertClose(weightRate(weighIns, TODAY), 0.25);
  assertClose(weightRate([...weighIns].reverse(), TODAY), 0.25);
});

test('no change gives a rate of zero, not null', () => {
  const weighIns = [21, 14, 7, 0].map((n) => ({ date: daysAgo(n), kg: 80 }));
  assertClose(weightRate(weighIns, TODAY), 0);
});

test('one heavy morning moves the slope less than a first-to-last difference', () => {
  const steady = [24, 21, 17, 14, 10, 7, 3, 0].map((n) => onLine(n, -0.5));
  const heavyToday = steady.map((w) => (w.date === TODAY ? { ...w, kg: w.kg + 1 } : w));
  const firstToLast = ((heavyToday.at(-1).kg - heavyToday[0].kg) / 24) * 7;
  const rate = weightRate(heavyToday, TODAY);
  assert.ok(rate < firstToLast, `slope ${rate} should stay nearer −0.5 than ${firstToLast}`);
  assert.ok(rate > -0.5);

  const heavyMidWindow = steady.map((w) => (w.date === daysAgo(10) ? { ...w, kg: w.kg + 1 } : w));
  assertClose(weightRate(heavyMidWindow, TODAY), -0.5, 0.05);
});

test('too few weigh-ins, or none 7 days apart, give no rate', () => {
  assert.equal(weightRate([], TODAY), null);
  assert.equal(weightRate([onLine(0, -0.5)], TODAY), null);
  assert.equal(weightRate([onLine(6, -0.5), onLine(0, -0.5)], TODAY), null);
  assert.equal(weightRate([5, 4, 2, 1, 0].map((n) => onLine(n, -0.5)), TODAY), null);
});

test('two weigh-ins exactly 7 days apart are enough', () => {
  assertClose(weightRate([onLine(7, -0.5), onLine(0, -0.5)], TODAY), -0.5);
  assertClose(weightRate([onLine(20, -0.5), onLine(13, -0.5)], TODAY), -0.5);
});

test('weigh-ins older than 28 days are ignored', () => {
  const recent = [21, 14, 7, 0].map((n) => onLine(n, -0.5));
  const old = [28, 40, 90, 400].map((n) => ({ date: daysAgo(n), kg: 95 }));
  assertClose(weightRate([...old, ...recent], TODAY), -0.5);
});

test('the window is today and the 27 days before it', () => {
  assertClose(weightRate([onLine(27, -0.5), onLine(0, -0.5)], TODAY), -0.5);
  assert.equal(weightRate([onLine(28, -0.5), onLine(0, -0.5)], TODAY), null);
});

test('an old weigh-in doesn’t count towards the 7 days apart', () => {
  assert.equal(weightRate([onLine(30, -0.5), onLine(2, -0.5), onLine(0, -0.5)], TODAY), null);
});

test('a weigh-in dated after today is ignored', () => {
  const weighIns = [onLine(14, -0.5), onLine(0, -0.5), { date: daysAgo(-3), kg: 70 }];
  assertClose(weightRate(weighIns, TODAY), -0.5);
});

test('weightRate rejects a date that isn’t YYYY-MM-DD', () => {
  assert.throws(() => weightRate([], 'Oct 15'), RangeError);
  assert.throws(() => weightRate([{ date: '2026-10-1', kg: 80 }], TODAY), RangeError);
});
