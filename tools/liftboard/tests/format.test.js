import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDisplay, toKg, formatWeight, formatE1RM, heroText, prFigure,
  relativeDay, shortDate, todayLabel, plural, parseDecimal, parseReps,
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

test('heroText: no unit; bodyweight forms', () => {
  const lift = { isBodyweight: false };
  const bwLift = { isBodyweight: true };
  assert.equal(heroText(s(102.06, 5), lift, 'lb'), '225 × 5');
  assert.equal(heroText(s(0, 12), bwLift, 'lb'), 'BW × 12');
  assert.equal(heroText(s(6.8, 8), bwLift, 'lb'), 'BW+15 × 8');
  assert.equal(heroText(null, lift, 'lb'), 'Not logged yet');
});

test('prFigure: what each kind of session shows', () => {
  assert.equal(prFigure({ isBodyweight: false }, 'lb')(s(102.06, 5, 119.07)), 263);
  assert.equal(prFigure({ isBodyweight: true }, 'lb')(s(0, 12)), 12);
  assert.equal(prFigure({ isBodyweight: true }, 'lb')(s(9.07, 5, 10.58)), 'BW+20 × 5');
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
