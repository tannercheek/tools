import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientsTotals, mealTotals, scaleTotals } from '../js/calc.js';
import { parseAmount } from '../js/custom-foods.js';
import {
  addIngredient,
  amountText,
  ingredient,
  mealIngredients,
  removeIngredient,
  scaleIngredients,
  setIngredientQty,
  swapIngredient,
} from '../js/ingredients.js';
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
const food = (id, name, emoji, serving, kcal, protein, fat, carbs) => ({ id, name, emoji, serving, kcal, protein, fat, carbs });
const EGG = food('egg', 'Egg, large', '🥚', { qty: 1, unit: 'egg' }, 70, 6, 5, 0.5);
const SOURDOUGH = food('sourdough', 'Bread, sourdough', '🍞', { qty: 1, unit: 'slice' }, 120, 4, 1, 23);
const RYE = food('rye', 'Bread, rye', '🍞', { qty: 1, unit: 'slice' }, 80, 3, 1, 15);
const BUTTER = food('butter', 'Butter', '🧈', { qty: 10, unit: 'g' }, 72, 0, 8, 0);
const JAM = food('custom-jam', 'Jam', '🍓', { qty: 1, unit: 'tbsp' }, 50, 0, 0, 13);
const FOODS = [EGG, SOURDOUGH, RYE, BUTTER, JAM];
const getFood = foodLookup(FOODS);

function meal(name, items) {
  return { ...createMeal({ name }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 2 eggs (140 / 12 / 10 / 1) + 2 slices sourdough (240 / 8 / 2 / 46) + 10 g butter (72 / 0 / 8 / 0).
const SANDWICH = meal('Breakfast sandwich', [['egg', 2], ['sourdough', 2], ['butter', 10]]);
const SANDWICH_TOTALS = { kcal: 452, protein: 20, fat: 20, carbs: 47 };

// --- Ingredient lists ---

test("a meal's ingredients are snapshots of its foods that add up to the meal's totals", () => {
  const items = mealIngredients(SANDWICH, getFood);
  assert.deepEqual(items[0], { foodId: 'egg', name: 'Egg, large', emoji: '🥚', unit: 'egg', qty: 2, kcal: 140, protein: 12, fat: 10, carbs: 1 });
  assert.deepEqual(items.map((item) => [item.foodId, item.unit, item.qty]), [['egg', 'egg', 2], ['sourdough', 'slice', 2], ['butter', 'g', 10]]);
  assertTotals(ingredientsTotals(items), mealTotals(SANDWICH, getFood));
  assertTotals(ingredientsTotals(items), SANDWICH_TOTALS);
});

test('an unknown food or an amount of 0 or less is refused', () => {
  assert.throws(() => mealIngredients(meal('Gone', [['nope', 1]]), getFood), RangeError);
  assert.throws(() => ingredient(EGG, 0), RangeError);
  assert.throws(() => setIngredientQty(mealIngredients(SANDWICH, getFood), 'egg', -1), RangeError);
});

test('a new amount rescales its numbers without looking the food up, and leaves the list as it was', () => {
  const items = mealIngredients(SANDWICH, getFood);
  const changed = setIngredientQty(items, 'egg', 3);
  assert.deepEqual(changed[0], { ...items[0], qty: 3, kcal: 210, protein: 18, fat: 15, carbs: 1.5 });
  assert.deepEqual(changed.slice(1), items.slice(1));
  assert.equal(items[0].qty, 2);
});

test('a swapped food takes the old one’s place as a snapshot of the new food', () => {
  const items = swapIngredient(mealIngredients(SANDWICH, getFood), 'sourdough', RYE, 2);
  assert.deepEqual(items.map((item) => item.foodId), ['egg', 'rye', 'butter']);
  assert.deepEqual(items[1], { foodId: 'rye', name: 'Bread, rye', emoji: '🍞', unit: 'slice', qty: 2, kcal: 160, protein: 6, fat: 2, carbs: 30 });
});

test('a food swapped in that is already in the list merges into it where it is', () => {
  const items = addIngredient(mealIngredients(SANDWICH, getFood), RYE, 1);
  assert.deepEqual(items.map((item) => item.foodId), ['egg', 'sourdough', 'butter', 'rye']);
  const merged = swapIngredient(items, 'sourdough', RYE, 2);
  assert.deepEqual(merged.map((item) => [item.foodId, item.qty]), [['egg', 2], ['butter', 10], ['rye', 3]]);
  assertTotals(merged[2], { kcal: 240, protein: 9, fat: 3, carbs: 45 });
});

test('a food is removed, and one added goes last or onto its own amount', () => {
  const items = mealIngredients(SANDWICH, getFood);
  assert.deepEqual(removeIngredient(items, 'butter').map((item) => item.foodId), ['egg', 'sourdough']);
  assert.deepEqual(addIngredient(items, JAM, 1).map((item) => item.foodId), ['egg', 'sourdough', 'butter', 'custom-jam']);
  const more = addIngredient(items, EGG, 1);
  assert.deepEqual(more.map((item) => [item.foodId, item.qty]), [['egg', 3], ['sourdough', 2], ['butter', 10]]);
});

test('scaling a list scales each amount and its numbers', () => {
  const items = scaleIngredients(mealIngredients(SANDWICH, getFood), 1.5);
  assert.deepEqual(items.map((item) => item.qty), [3, 3, 15]);
  assertTotals(ingredientsTotals(items), scaleTotals(SANDWICH_TOTALS, 1.5));
});

test('an amount shows as entered, without float noise, in digits parseAmount reads back', () => {
  assert.equal(amountText(3), '3');
  assert.equal(amountText(262.5), '262.5');
  assert.equal(amountText(2 * 1.1), '2.2');
  assert.equal(amountText(1250), '1250');
  for (const qty of [3, 262.5, 2 * 1.1, 1250, 0.75]) assert.equal(parseAmount(amountText(qty)), Number(qty.toPrecision(12)));
});
