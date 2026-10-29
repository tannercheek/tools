import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPlanTotal } from '../js/calc.js';
import {
  OTHER,
  addEntry,
  createCoreDoc,
  emptyDay,
  foodEntry,
  mealEntry,
  quickEntry,
  recentEntries,
  setEntryIngredients,
  swapDayEntry,
} from '../js/data.js';
import { dayPlan } from '../js/day-plan.js';
import { mealIngredients, setIngredientQty } from '../js/ingredients.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

// Test fixtures with made-up round numbers, not real nutrition data.
const food = (id, name, emoji, unit, kcal, protein, fat, carbs) => ({ id, name, emoji, serving: { qty: 1, unit }, kcal, protein, fat, carbs });
const BANANA = food('banana', 'Banana', '🍌', 'medium', 100, 1, 0, 25);
const APPLE = food('apple', 'Apple', '🍎', 'medium', 90, 0, 0, 24);
const EGG = food('egg', 'Egg, large', '🥚', 'egg', 70, 6, 5, 0);
const TOAST = food('toast', 'Bread, gluten-free', '🍞', 'slice', 80, 2, 1, 15);
const getFood = foodLookup([BANANA, APPLE, EGG, TOAST]);

// 2 eggs and 2 slices: 300 kcal.
const EGGS_ON_TOAST = {
  ...createMeal({ name: 'Eggs on toast' }),
  emoji: '🍳',
  items: [{ foodId: 'egg', qty: 2 }, { foodId: 'toast', qty: 2 }],
};
const SHAKE = { kcal: 300, protein: 40, fat: 5, carbs: 20 };

const LUNCH = { id: 'lunch-id', name: 'Lunch' };
const DINNER = { id: 'dinner-id', name: 'Dinner' };

const labels = (day) => day.entries.map(({ label }) => label);

// Lunch holds quick numbers, a banana and an egg, in that order.
function lunchDay() {
  const banana = foodEntry(LUNCH, BANANA, 1);
  const day = [quickEntry(LUNCH, SHAKE, 'Shake'), banana, foodEntry(LUNCH, EGG, 1)].reduce(addEntry, emptyDay());
  return { day, banana };
}

test('a swapped-in entry takes the old one’s place in the list, in its slot', () => {
  const { day, banana } = lunchDay();
  const apple = foodEntry(LUNCH, APPLE, 1);
  const swapped = swapDayEntry(day, banana.id, apple);
  assert.deepEqual(labels(swapped), ['Shake', 'Apple', 'Egg, large']);
  assert.deepEqual(swapped.entries[1], apple);
  assert.equal(swapped.entries.length, 3);
});

test('the other entries stay exactly as they were, and the day passed in is unchanged', () => {
  const { day, banana } = lunchDay();
  const before = structuredClone(day);
  const swapped = swapDayEntry(day, banana.id, foodEntry(LUNCH, APPLE, 1));
  assert.equal(swapped.entries[0], day.entries[0]);
  assert.equal(swapped.entries[2], day.entries[2]);
  assert.deepEqual(day, before);
});

test('it keeps the old entry’s slot, even if the new one was made for another', () => {
  const { day, banana } = lunchDay();
  const swapped = swapDayEntry(day, banana.id, foodEntry(DINNER, APPLE, 1));
  assert.equal(swapped.entries[1].slotId, LUNCH.id);
  assert.equal(swapped.entries[1].slotName, LUNCH.name);
});

test('an Other entry swapped for a saved meal stays in Other', () => {
  const day = addEntry(emptyDay(), foodEntry(OTHER, BANANA, 1));
  const meal = mealEntry(OTHER, EGGS_ON_TOAST, getFood);
  const swapped = swapDayEntry(day, day.entries[0].id, meal);
  assert.equal(swapped.entries[0].slotId, null);
  assert.equal(swapped.entries[0].slotName, 'Other');
  assert.equal(swapped.entries[0].label, 'Eggs on toast');
  assert.equal(swapped.entries[0].ingredients.length, 2);
});

test('the swapped-in entry is a new snapshot with its own id, so the old one is gone', () => {
  const { day, banana } = lunchDay();
  const apple = foodEntry(LUNCH, APPLE, 1);
  const swapped = swapDayEntry(day, banana.id, apple);
  assert.notEqual(swapped.entries[1].id, banana.id);
  assert.ok(!swapped.entries.some(({ id }) => id === banana.id));
});

test('an edited added meal swapped for a food leaves none of its ingredients behind', () => {
  let day = addEntry(emptyDay(), mealEntry(DINNER, EGGS_ON_TOAST, getFood));
  const { id } = day.entries[0];
  day = setEntryIngredients(day, id, setIngredientQty(mealIngredients(EGGS_ON_TOAST, getFood), 'egg', 3));
  assert.ok(day.entries[0].originalIngredients);

  const swapped = swapDayEntry(day, id, foodEntry(DINNER, APPLE, 1));
  assert.equal(swapped.entries[0].label, 'Apple');
  assert.equal(swapped.entries[0].ingredients, undefined);
  assert.equal(swapped.entries[0].originalIngredients, undefined);
});

test('the day’s total moves by the difference', () => {
  const doc = createCoreDoc('2026-10-15');
  const { day, banana } = lunchDay();
  const before = dayPlanTotal(day, dayPlan(doc, day, getFood));
  const swapped = swapDayEntry(day, banana.id, foodEntry(LUNCH, APPLE, 2));
  const after = dayPlanTotal(swapped, dayPlan(doc, swapped, getFood));
  assertTotals(after, { kcal: before.kcal + 80, protein: before.protein - 1, fat: before.fat, carbs: before.carbs + 23 });
});

test('swapping quick numbers in for a food: the label is the slot’s name when none is given', () => {
  const { day, banana } = lunchDay();
  const swapped = swapDayEntry(day, banana.id, quickEntry(LUNCH, SHAKE));
  assert.equal(swapped.entries[1].label, 'Lunch');
  assert.equal(swapped.entries[1].source, 'quick');
});

test('an entry that isn’t in the day, say one removed on another device, leaves the day as it was', () => {
  const { day } = lunchDay();
  const swapped = swapDayEntry(day, 'gone', foodEntry(LUNCH, APPLE, 1));
  assert.deepEqual(swapped, day);
});

test('Recent lists the swapped-in entry, and not the one it replaced', () => {
  const { day, banana } = lunchDay();
  const swapped = swapDayEntry(day, banana.id, foodEntry(LUNCH, APPLE, 1));
  const recent = recentEntries({ '2026-10-18': swapped }, '2026-10-19');
  assert.deepEqual(
    recent.map(({ entry }) => entry.label),
    ['Egg, large', 'Apple', 'Shake'],
  );
});
