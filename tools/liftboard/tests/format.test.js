import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDisplay, toKg, formatWeight, formatE1RM, heroText, prFigure, showsE1RM,
  relativeDay, shortDate, todayLabel, boardDate, plural, parseDecimal, parseReps, parseWhole,
} from '../js/format.js';

const s = (topWeightKg, topReps, bestE1RMKg = topWeightKg) =>
  ({ id: 's-aaaaaaaa', date: '2026-09-14T18:12:00.000Z', topWeightKg, topReps, bestE1RMKg });

test('weights: one decimal at most, trailing zeros stripped', () => {
  assert.equal(formatWeight(102.06, 'lb'), '225');   // 225.0045 lb
  assert.equal(formatWeight(102.5, 'kg'), '102.5');
  assert.equal(formatWeight(100, 'kg'), '100');
  assert.equal(formatWeight(46.49, 'lb'), '102.5');
  assert.equal(formatWeight(0, 'lb'), '0');
});

test('unit conversion round trips', () => {
  assert.ok(Math.abs(toKg(225, 'lb') - 102.0583) < 1e-4);
  assert.ok(Math.abs(toDisplay(toKg(225, 'lb'), 'lb') - 225) < 1e-9);
  assert.equal(toKg(100, 'kg'), 100);
});

test('e1RM shows as a whole number', () => {
  assert.equal(formatE1RM(119.07, 'lb'), '263');
  assert.equal(formatE1RM(119.07, 'kg'), '119');
});

const barbell = { equipment: 'barbell' };
const bwLift = { equipment: 'bodyweight' };
const band = { equipment: 'band' };

test('heroText: no unit; bodyweight forms', () => {
  assert.equal(heroText(s(102.06, 5), barbell, 'lb'), '225 × 5');
  assert.equal(heroText(s(0, 12), bwLift, 'lb'), 'BW × 12');
  assert.equal(heroText(s(6.8, 8), bwLift, 'lb'), 'BW+15 × 8');
  assert.equal(heroText(null, barbell, 'lb'), 'Not logged yet');
});

test('heroText: a band lift reads "Band" with no weight, and the number with one', () => {
  assert.equal(heroText(s(0, 15), band, 'lb'), 'Band × 15');
  assert.equal(heroText(s(9.07, 15, 13.61), band, 'lb'), '20 × 15');
  assert.equal(heroText(s(9.07, 15, 13.61), band, 'kg'), '9.1 × 15');
});

test('prFigure: what each kind of session shows', () => {
  assert.equal(prFigure(barbell, 'lb')(s(102.06, 5, 119.07)), 263);
  assert.equal(prFigure(bwLift, 'lb')(s(0, 12)), 12);
  assert.equal(prFigure(bwLift, 'lb')(s(9.07, 5, 10.58)), 'BW+20 × 5');
  assert.equal(prFigure(band, 'lb')(s(0, 20)), 20);
  assert.equal(prFigure(band, 'lb')(s(9.07, 15, 13.61)), 30);
});

test('showsE1RM: never on bodyweight, never for a session with no weight', () => {
  assert.equal(showsE1RM(barbell, s(102.06, 5)), true);
  assert.equal(showsE1RM(band, s(9.07, 15)), true);
  assert.equal(showsE1RM(band, s(0, 15)), false);
  assert.equal(showsE1RM(bwLift, s(9.07, 5)), false);
  assert.equal(showsE1RM(bwLift, s(0, 12)), false);
});

test('dates: relative days, short dates, the log sheet label', () => {
  const now = new Date(2026, 8, 22, 7, 0);
  assert.equal(relativeDay(new Date(2026, 8, 22, 6, 0).toISOString(), now), 'Today');
  assert.equal(relativeDay(new Date(2026, 8, 21, 23, 0).toISOString(), now), 'Yesterday');
  assert.equal(relativeDay(new Date(2026, 8, 17, 12, 0).toISOString(), now), '5 days ago');
  assert.equal(shortDate(new Date(2026, 8, 14, 12).toISOString()), 'Sep 14');
  assert.equal(todayLabel(now), 'Today, Sep 22');
});

test('plural', () => {
  assert.equal(plural(1, 'lift'), '1 lift');
  assert.equal(plural(6, 'lift'), '6 lifts');
  assert.equal(plural(0, 'lift'), '0 lifts');
});

test('parseDecimal: comma as decimal point; empty is null; bad or negative is NaN', () => {
  assert.equal(parseDecimal('102,5'), 102.5);
  assert.equal(parseDecimal(' 225 '), 225);
  assert.equal(parseDecimal('.5'), 0.5);
  assert.equal(parseDecimal('225.'), 225);
  assert.equal(parseDecimal(''), null);
  assert.ok(Number.isNaN(parseDecimal('-5')));
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal('1.2.3')));
});

test('parseReps: whole numbers 1 to 100', () => {
  assert.equal(parseReps('5'), 5);
  assert.equal(parseReps('100'), 100);
  assert.equal(parseReps(''), null);
  for (const bad of ['0', '101', '5.5', '-3', 'x']) assert.ok(Number.isNaN(parseReps(bad)), bad);
});

test("the Board's date: long weekday, short month, day, in the device's locale", () => {
  const oct4 = new Date(2023, 9, 4, 9, 30);   // a Wednesday, local time
  assert.equal(boardDate(oct4, 'en-US'), 'Wednesday, Oct 4');
  assert.match(boardDate(oct4, 'en-GB'), /^Wednesday,? 4 Oct$/);
  assert.match(boardDate(oct4, 'de-DE'), /^Mittwoch, 4\. Okt/);
  assert.equal(boardDate(oct4), new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(oct4));
  // Just before and after local midnight are different days
  assert.equal(boardDate(new Date(2023, 9, 4, 23, 59), 'en-US'), 'Wednesday, Oct 4');
  assert.equal(boardDate(new Date(2023, 9, 5, 0, 1), 'en-US'), 'Thursday, Oct 5');
});

test('whole numbers: any size; null when empty, NaN when unreadable', () => {
  assert.equal(parseWhole(' 150 '), 150);
  assert.equal(parseWhole(''), null);
  assert.ok(Number.isNaN(parseWhole('5.5')));
  assert.ok(Number.isNaN(parseWhole('-3')));
});
