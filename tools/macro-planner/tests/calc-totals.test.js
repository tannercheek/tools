import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  foodTotals,
  mealTotals,
  entriesTotals,
  remaining,
  scaleTotals,
  roundTotals,
  displayRemaining,
  ringFill,
} from '../js/calc.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

// Test fixtures with made-up round numbers, not real nutrition data.
const EGG = { id: 'egg', serving: { qty: 1, unit: 'egg' }, kcal: 70, protein: 6, fat: 5, carbs: 0.5 };
const RICE = { id: 'rice', serving: { qty: 100, unit: 'g' }, kcal: 130, protein: 2.5, fat: 0.3, carbs: 28 };
const OLD_OIL = { id: 'oil', serving: { qty: 10, unit: 'g' }, kcal: 90, protein: 0, fat: 10, carbs: 0, archived: true };
const FOODS = new Map([EGG, RICE, OLD_OIL].map((food) => [food.id, food]));
const getFood = (id) => FOODS.get(id);

const RICE_AND_EGGS = {
  id: 'm1',
  name: 'Rice & eggs',
  items: [
    { foodId: 'rice', qty: 200 },
    { foodId: 'egg', qty: 2 },
  ],
};
// 200 g rice (260 / 5 / 0.6 / 56) + 2 eggs (140 / 12 / 10 / 1).
const RICE_AND_EGGS_TOTALS = { kcal: 400, protein: 17, fat: 10.6, carbs: 57 };

// --- Food × quantity ---

test('food totals scale by quantity in the serving unit', () => {
  assertTotals(foodTotals(RICE, 150), { kcal: 195, protein: 3.75, fat: 0.45, carbs: 42 }, '150 g rice');
  assertTotals(foodTotals(RICE, 100), { kcal: 130, protein: 2.5, fat: 0.3, carbs: 28 }, '100 g rice');
  assertTotals(foodTotals(EGG, 3), { kcal: 210, protein: 18, fat: 15, carbs: 1.5 }, '3 eggs');
  assertTotals(foodTotals(EGG, 0.5), { kcal: 35, protein: 3, fat: 2.5, carbs: 0.25 }, 'half an egg');
});

test('a zero quantity gives zero totals', () => {
  assert.deepEqual(foodTotals(RICE, 0), ZERO);
});

test('food totals return only the four numbers', () => {
  assert.deepEqual(Object.keys(foodTotals(EGG, 1)), ['kcal', 'protein', 'fat', 'carbs']);
});

// --- Meals ---

test('meal totals add up every item', () => {
  assertTotals(mealTotals(RICE_AND_EGGS, getFood), RICE_AND_EGGS_TOTALS);
});

test('an empty meal totals zero', () => {
  assert.deepEqual(mealTotals({ id: 'm2', name: 'Nothing yet', items: [] }, getFood), ZERO);
});

test('an archived food still counts inside a meal', () => {
  const meal = { id: 'm3', name: 'Rice & oil', items: [{ foodId: 'rice', qty: 100 }, { foodId: 'oil', qty: 5 }] };
  assertTotals(mealTotals(meal, getFood), { kcal: 175, protein: 2.5, fat: 5.3, carbs: 28 });
});

test('a meal item whose food cannot be found throws', () => {
  const meal = { id: 'm4', name: 'Ghost', items: [{ foodId: 'gone', qty: 1 }] };
  assert.throws(() => mealTotals(meal, getFood), RangeError);
});

// --- Portion multiplier ---

test('portion multiplier scales a meal’s totals', () => {
  const meal = mealTotals(RICE_AND_EGGS, getFood);
  assertTotals(scaleTotals(meal, 0.5), { kcal: 200, protein: 8.5, fat: 5.3, carbs: 28.5 }, '0.5×');
  assertTotals(scaleTotals(meal, 1), RICE_AND_EGGS_TOTALS, '1×');
  assertTotals(scaleTotals(meal, 1.5), { kcal: 600, protein: 25.5, fat: 15.9, carbs: 85.5 }, '1.5×');
  assertTotals(scaleTotals(meal, 1.25), { kcal: 500, protein: 21.25, fat: 13.25, carbs: 71.25 }, '1.25×');
});

test('scaling returns a new object and leaves the input alone', () => {
  const meal = mealTotals(RICE_AND_EGGS, getFood);
  const copy = { ...meal };
  scaleTotals(meal, 2);
  assert.deepEqual(meal, copy);
});

// --- Days ---

const ENTRIES = [
  { id: 'e1', slotId: 's1', label: 'Rice & eggs', emoji: '🍚', kcal: 400, protein: 17, fat: 10.6, carbs: 57, source: 'meal' },
  { id: 'e2', slotId: 's2', label: 'Egg', emoji: '🥚', kcal: 70, protein: 6, fat: 5, carbs: 0.5, source: 'food' },
  { id: 'e3', slotId: 's3', label: 'Takeaway', emoji: '🍽️', kcal: 850, protein: 40, fat: 35, carbs: 90, source: 'quick' },
];

test('entries totals add up the entries’ own numbers', () => {
  assertTotals(entriesTotals(ENTRIES), { kcal: 1320, protein: 63, fat: 50.6, carbs: 147.5 });
});

test('no entries total zero, whether the list is empty or missing', () => {
  assert.deepEqual(entriesTotals([]), ZERO);
  assert.deepEqual(entriesTotals(), ZERO);
});

// --- Remaining ---

const TARGETS = { kcal: 2759, protein: 144, fat: 689.75 / 9, carbs: 373.3125, warnings: [] };

test('remaining is target minus eaten, per number', () => {
  assertTotals(remaining(TARGETS, entriesTotals(ENTRIES)), {
    kcal: 1439,
    protein: 81,
    fat: 689.75 / 9 - 50.6,
    carbs: 225.8125,
  });
});

test('on an empty day, remaining is the whole target', () => {
  assertTotals(remaining(TARGETS, entriesTotals()), { kcal: 2759, protein: 144, fat: 689.75 / 9, carbs: 373.3125 });
});

test('remaining goes negative when over target', () => {
  const big = scaleTotals(entriesTotals(ENTRIES), 3);
  const left = remaining(TARGETS, big);
  assertTotals(left, { kcal: -1201, protein: -45, fat: 689.75 / 9 - 151.8, carbs: -69.1875 });
});

// --- Display rounding ---

test('display rounding makes each number a whole number', () => {
  assert.deepEqual(roundTotals({ kcal: 399.5, protein: 16.49, fat: 10.6, carbs: 0.2 }), {
    kcal: 400,
    protein: 16,
    fat: 11,
    carbs: 0,
  });
});

test('display rounding leaves the raw totals alone', () => {
  const raw = { kcal: 399.5, protein: 16.49, fat: 10.6, carbs: 0.2 };
  roundTotals(raw);
  assert.deepEqual(raw, { kcal: 399.5, protein: 16.49, fat: 10.6, carbs: 0.2 });
});

test('totals sum raw values and round once, not round each entry first', () => {
  // Three entries of 0.5 g fat: raw 1.5 → shows 2. Rounding each first would show 3.
  // Three of 0.4 g protein: raw 1.2 → shows 1. Rounding each first would show 0.
  const small = { kcal: 3.4, protein: 0.4, fat: 0.5, carbs: 0 };
  const day = entriesTotals([small, small, small]);
  assertTotals(day, { kcal: 10.2, protein: 1.2, fat: 1.5, carbs: 0 });
  assert.deepEqual(roundTotals(day), { kcal: 10, protein: 1, fat: 2, carbs: 0 });
});

test('a ring’s three shown numbers always agree: left is shown target minus shown eaten', () => {
  // Raw: 190.4 − 89.5 = 100.9, which would show "101 left" beside "90 / 190".
  assert.deepEqual(displayRemaining(190.4, 89.5), { amount: 100, over: false });
  assert.deepEqual(displayRemaining(2759.3, 1320.4), { amount: 1439, over: false });
});

test('over target shows a whole amount over, never a negative number', () => {
  assert.deepEqual(displayRemaining(2000, 2120.6), { amount: 121, over: true });
  assert.deepEqual(displayRemaining(144, 189.8), { amount: 46, over: true });
});

test('when shown eaten equals shown target, it’s "0 left", never "0 over"', () => {
  for (const [target, eaten] of [
    [10, 10.2],
    [10, 9.6],
    [190.4, 189.6],
    [0, 0],
    [0, 0.4],
  ]) {
    assert.deepEqual(displayRemaining(target, eaten), { amount: 0, over: false }, `${target} / ${eaten}`);
  }
});

test('nothing eaten leaves the whole shown target', () => {
  const left = displayRemaining(TARGETS.fat, entriesTotals().fat);
  assert.deepEqual(left, { amount: 77, over: false });
});

// --- Ring fill ---

test('a ring fills by total over target: 0%, 50% and 100%', () => {
  assert.equal(ringFill(0, 2600), 0);
  assert.equal(ringFill(1300, 2600), 0.5);
  assert.equal(ringFill(2600, 2600), 1);
});

test('over target, a ring stays full rather than lapping', () => {
  assert.equal(ringFill(3380, 2600), 1);
  assert.equal(ringFill(247, 190), 1);
});

test('a ring fills by the shown numbers, so it agrees with them', () => {
  // Shows 2,600 of 2,600 and "0 left", so the arc is full, though raw it's a hair under.
  assert.equal(ringFill(2599.6, 2600.4), 1);
  // Shows 38 of 75 (37.5 rounds up), not raw 37.5 / 75.
  assert.equal(ringFill(37.5, 75), 38 / 75);
});

test('a total that shows as 0 draws no arc', () => {
  assert.equal(ringFill(0.4, 75), 0);
  assert.equal(ringFill(0.5, 75), 1 / 75);
});

test('a target of 0: nothing is no arc, anything is over', () => {
  assert.equal(ringFill(0, 0), 0);
  assert.equal(ringFill(12, 0), 1);
  // A target that shows as 0 counts as 0.
  assert.equal(ringFill(12, 0.4), 1);
});
