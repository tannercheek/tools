import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, foodTotals, mealTotals } from '../js/calc.js';
import { createCoreDoc, emptyDay, foodEntry, mealEntry, repeatEntry } from '../js/data.js';
import {
  addIngredient,
  ingredient,
  mealIngredients,
  scaleIngredients,
  setIngredientQty,
  setIngredientUnit,
  slotIngredients,
  swapIngredient,
} from '../js/ingredients.js';
import { lockDay } from '../js/lock-in.js';
import { amountLabel, convertAmount, defaultAmount, foodUnits, toServings } from '../js/portions.js';
import { addItem, createMeal, foodLookup, updateItem } from '../js/saved-meals.js';
import { daySlots, resetSlotIngredients, setSlotIngredients, setSlotMeal } from '../js/slots.js';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, label = '') {
  assert.ok(Math.abs(actual - expected) <= 1e-9, `${label} expected ${expected}, got ${actual}`);
}

function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) assertClose(actual[key], expected[key], `${label} ${key}:`);
}

// Test fixtures shaped like bundled foods, with their USDA weights but made-up round numbers, not
// real nutrition data. grams is the serving's weight, and a portion's is 1 of its unit's.
const bundled = (id, name, emoji, serving, grams, portions, kcal, protein, fat, carbs) => ({
  id, name, emoji, serving, kcal, protein, fat, carbs, grams, portions, custom: false, archived: false,
});
const RICE = bundled('rice', 'Rice, white, cooked', '🍚', { qty: 100, unit: 'g' }, 100, [{ unit: 'cup', grams: 158 }], 130, 2.5, 0.3, 28);
const EGG = bundled('egg', 'Egg, large', '🥚', { qty: 1, unit: 'egg' }, 50, [], 70, 6, 5, 0.5);
const PEANUT_BUTTER = bundled('pb', 'Peanut butter, smooth', '🥜', { qty: 2, unit: 'tbsp' }, 32, [], 190, 8, 16, 7);
const OLIVE_OIL = bundled('oil', 'Olive oil', '🫒', { qty: 1, unit: 'tbsp' }, 13.5, [{ unit: 'tsp', grams: 4.5 }], 120, 0, 14, 0);
const CHICKEN = bundled('chicken', 'Chicken breast, roasted', '🍗', { qty: 100, unit: 'g' }, 100, [{ unit: 'oz', grams: 28.349523125 }], 160, 30, 4, 0);
const JAM = { id: 'custom-jam', name: 'Jam', emoji: '🍓', serving: { qty: 1, unit: 'tbsp' }, kcal: 50, protein: 0, fat: 0, carbs: 13, custom: true, archived: false };
const FOODS = [RICE, EGG, PEANUT_BUTTER, OLIVE_OIL, JAM];
const getFood = foodLookup(FOODS);

// 1 cup of rice is 158 g, 1.58 servings.
const CUP_OF_RICE = { kcal: 205.4, protein: 3.95, fat: 0.474, carbs: 44.24 };

const meal = (name, items) => ({ ...createMeal({ name }), items });
// Saved before portions, so its items have no unit: 200 g rice (260 / 5 / 0.6 / 56) + 2 eggs (140 / 12 / 10 / 1).
const SAVED_BEFORE = meal('Rice & eggs', [{ foodId: 'rice', qty: 200 }, { foodId: 'egg', qty: 2 }]);
const SAVED_BEFORE_TOTALS = { kcal: 400, protein: 17, fat: 10.6, carbs: 57 };
const RICE_BOWL = meal('Rice bowl', [{ foodId: 'rice', qty: 1, unit: 'cup' }]);

// --- Units ---

test("a food's units are its serving's, then grams, then its portions", () => {
  assert.deepEqual(foodUnits(RICE), ['g', 'cup']);
  assert.deepEqual(foodUnits(EGG), ['egg', 'g']);
  assert.deepEqual(foodUnits(OLIVE_OIL), ['tbsp', 'g', 'tsp']);
});

test('a custom food offers only its own unit', () => {
  assert.deepEqual(foodUnits(JAM), ['tbsp']);
  assertTotals(foodTotals(JAM, 2, 'tbsp'), { kcal: 100, protein: 0, fat: 0, carbs: 26 });
  assert.throws(() => foodTotals(JAM, 20, 'g'), RangeError);
  assert.throws(() => ingredient(JAM, 20, 'g'), RangeError);
  assert.throws(() => addItem(createMeal({ name: 'Toast' }), JAM, 20, 'g'), RangeError);
});

test("a unit the food doesn't have is refused", () => {
  assert.throws(() => toServings(EGG, 1, 'cup'), RangeError);
  assert.throws(() => convertAmount(RICE, 1, 'slice', 'g'), RangeError);
  assert.throws(() => addItem(createMeal({ name: 'Eggs' }), EGG, 1, 'cup'), RangeError);
});

// --- Amounts ---

test('an amount in any unit is a number of servings, through grams', () => {
  assertClose(toServings(RICE, 1, 'cup'), 1.58);
  assertClose(toServings(RICE, 150, 'g'), 1.5);
  assertClose(toServings(EGG, 100, 'g'), 2);
  assertClose(toServings(OLIVE_OIL, 3, 'tsp'), 1);
  // A 2 tbsp, 32 g serving: 1 tbsp and 16 g are each half of it.
  assertClose(toServings(PEANUT_BUTTER, 1, 'tbsp'), 0.5);
  assertClose(toServings(PEANUT_BUTTER, 16, 'g'), 0.5);
});

test("without a unit, an amount is in the serving's unit", () => {
  assert.equal(toServings(RICE, 150), 1.5);
  assert.equal(toServings(PEANUT_BUTTER, 1), 0.5);
  assert.equal(toServings(JAM, 3), 3);
});

test('an amount converts between units through grams', () => {
  assertClose(convertAmount(RICE, 1, 'cup', 'g'), 158);
  assertClose(convertAmount(RICE, 79, 'g', 'cup'), 0.5);
  assertClose(convertAmount(EGG, 100, 'g', 'egg'), 2);
  assertClose(convertAmount(PEANUT_BUTTER, 1, 'tbsp', 'g'), 16);
  assertClose(convertAmount(OLIVE_OIL, 1, 'tbsp', 'tsp'), 3);
  assert.equal(convertAmount(JAM, 2, 'tbsp', 'tbsp'), 2);
});

// --- Default amount ---

test('an amount starts at 1 of the first portion, else at one serving', () => {
  assert.deepEqual(defaultAmount(RICE), { qty: 1, unit: 'cup' });
  assert.deepEqual(defaultAmount(OLIVE_OIL), { qty: 1, unit: 'tsp' });
  assert.deepEqual(defaultAmount(EGG), { qty: 1, unit: 'egg' });
  assert.deepEqual(defaultAmount(PEANUT_BUTTER), { qty: 2, unit: 'tbsp' });
  assert.deepEqual(defaultAmount(JAM), { qty: 1, unit: 'tbsp' });
});

test('search shows 1 cup of rice with its weight and the numbers for a cup', () => {
  const { qty, unit } = defaultAmount(RICE);
  assert.equal(amountLabel(RICE, { qty, unit }), '1 cup · 158 g');
  assertTotals(foodTotals(RICE, qty, unit), CUP_OF_RICE);
});

test("an amount's label has its weight in whole grams only on a food with portions", () => {
  assert.equal(amountLabel(CHICKEN, defaultAmount(CHICKEN)), '1 oz · 28 g');
  assert.equal(amountLabel(OLIVE_OIL, { qty: 2, unit: 'tbsp' }), '2 tbsp · 27 g');
  assert.equal(amountLabel(RICE, { qty: 150, unit: 'g' }), '150 g');
  assert.equal(amountLabel(EGG, defaultAmount(EGG)), '1 egg');
  assert.equal(amountLabel(PEANUT_BUTTER, defaultAmount(PEANUT_BUTTER)), '2 tbsp');
  assert.equal(amountLabel(JAM, { qty: 3, unit: 'tbsp' }), '3 tbsp');
});

// --- Totals ---

test("1 cup of cooked rice gives 158 g's numbers", () => {
  assertTotals(foodTotals(RICE, 1, 'cup'), foodTotals(RICE, 158, 'g'));
  assertTotals(foodTotals(RICE, 1, 'cup'), CUP_OF_RICE);
});

test("100 g of large egg gives 2 eggs' numbers", () => {
  assertTotals(foodTotals(EGG, 100, 'g'), foodTotals(EGG, 2));
  assertTotals(foodTotals(EGG, 100, 'g'), { kcal: 140, protein: 12, fat: 10, carbs: 1 });
});

test('an item without a unit is in its serving unit, so a meal saved before portions is unchanged', () => {
  assertTotals(mealTotals(SAVED_BEFORE, getFood), SAVED_BEFORE_TOTALS);
  const withUnits = meal('Rice & eggs', [{ foodId: 'rice', qty: 200, unit: 'g' }, { foodId: 'egg', qty: 2, unit: 'egg' }]);
  assertTotals(mealTotals(withUnits, getFood), SAVED_BEFORE_TOTALS);
});

test('an item with a unit counts in it', () => {
  // 1 cup of rice, and 100 g of egg, which is 2 eggs.
  const bowl = meal('Rice & eggs', [{ foodId: 'rice', qty: 1, unit: 'cup' }, { foodId: 'egg', qty: 100, unit: 'g' }]);
  assertTotals(mealTotals(bowl, getFood), { kcal: 345.4, protein: 15.95, fat: 10.474, carbs: 45.24 });
});

// --- Meal items ---

test("a new item keeps the unit it was added in, or the serving's without one", () => {
  const bowl = addItem(addItem(createMeal({ name: 'Bowl' }), RICE, 1, 'cup'), EGG, 2);
  assert.deepEqual(bowl.items, [{ foodId: 'rice', qty: 1, unit: 'cup' }, { foodId: 'egg', qty: 2, unit: 'egg' }]);
});

test('1 cup added to an item of 100 g merges into it as 258 g', () => {
  const rice = addItem(addItem(createMeal({ name: 'Rice' }), RICE, 100, 'g'), RICE, 1, 'cup');
  assert.deepEqual(rice.items, [{ foodId: 'rice', qty: 258, unit: 'g' }]);
  assertTotals(mealTotals(rice, getFood), foodTotals(RICE, 258));
});

test('the same food added in another unit goes into the unit its item is in', () => {
  // 100 g of egg is 2 eggs.
  const eggs = addItem(addItem(createMeal({ name: 'Eggs' }), EGG, 1), EGG, 100, 'g');
  assert.deepEqual(eggs.items, [{ foodId: 'egg', qty: 3, unit: 'egg' }]);
  // An item saved before portions is in the serving's unit, grams for rice, and stays without one.
  const saved = meal('Rice', [{ foodId: 'rice', qty: 100 }]);
  assert.deepEqual(addItem(saved, RICE, 0.5, 'cup').items, [{ foodId: 'rice', qty: 179 }]);
});

test("switching an item's unit keeps its amount, now in the new unit, and moves the meal's totals", () => {
  // The editor's 1 cup of rice, typed as 200 and switched to g.
  const grams = updateItem(RICE_BOWL, 'rice', 200, 'g');
  assert.deepEqual(grams.items, [{ foodId: 'rice', qty: 200, unit: 'g' }]);
  assertTotals(mealTotals(grams, getFood), foodTotals(RICE, 200));
  // "2" stays 2, so 2 g become 2 cups.
  assertTotals(mealTotals(updateItem(grams, 'rice', 2, 'cup'), getFood), foodTotals(RICE, 316));
  // An item saved before portions gets a unit once one is picked, and the rest stay as they were.
  const switched = updateItem(SAVED_BEFORE, 'rice', 1, 'cup');
  assert.deepEqual(switched.items, [{ foodId: 'rice', qty: 1, unit: 'cup' }, { foodId: 'egg', qty: 2 }]);
  assert.deepEqual(SAVED_BEFORE.items, [{ foodId: 'rice', qty: 200 }, { foodId: 'egg', qty: 2 }]);
});

test('a new amount without a unit leaves the item in the unit it was in', () => {
  assert.deepEqual(updateItem(RICE_BOWL, 'rice', 1.5).items, [{ foodId: 'rice', qty: 1.5, unit: 'cup' }]);
  assert.deepEqual(updateItem(SAVED_BEFORE, 'rice', 150).items[0], { foodId: 'rice', qty: 150 });
});

// --- Ingredients ---

test('an ingredient keeps the unit its amount is in, from a meal item or as added', () => {
  const [rice] = mealIngredients(RICE_BOWL, getFood);
  assert.deepEqual([rice.foodId, rice.unit, rice.qty], ['rice', 'cup', 1]);
  assertTotals(rice, CUP_OF_RICE);
  assert.deepEqual(ingredient(RICE, 1, 'cup'), rice);
  assert.equal(ingredient(EGG, 2).unit, 'egg');
});

test('an ingredient in cups rescales with no food lookup', () => {
  // setIngredientQty and scaleIngredients take no food: the snapshot's own numbers rescale.
  const items = [ingredient(RICE, 1, 'cup')];
  const [two] = setIngredientQty(items, 'rice', 2);
  assert.deepEqual([two.unit, two.qty], ['cup', 2]);
  assertTotals(two, foodTotals(RICE, 316));
  const [portioned] = scaleIngredients(items, 1.5);
  assert.deepEqual([portioned.unit, portioned.qty], ['cup', 1.5]);
  assertTotals(portioned, foodTotals(RICE, 237));
});

test("the same food added to the ingredients in another unit goes into the unit it's in", () => {
  const [merged] = addIngredient([ingredient(RICE, 100, 'g')], RICE, 1, 'cup');
  assert.deepEqual([merged.unit, merged.qty], ['g', 258]);
  assertTotals(merged, foodTotals(RICE, 258));
  // Swapped in onto rice already in the list: 79 g is half a cup.
  const swapped = swapIngredient([ingredient(EGG, 2), ingredient(RICE, 1, 'cup')], 'egg', RICE, 79, 'g');
  assert.deepEqual(swapped.map(({ foodId, unit, qty }) => [foodId, unit, qty]), [['rice', 'cup', 1.5]]);
  // Swapped in on its own, it keeps the unit it was picked in.
  const [oil] = swapIngredient([ingredient(EGG, 2)], 'egg', OLIVE_OIL, 2, 'tsp');
  assert.deepEqual([oil.foodId, oil.unit, oil.qty], ['oil', 'tsp', 2]);
});

test("switching an ingredient's unit keeps its amount, now in the new unit", () => {
  const items = [ingredient(EGG, 2), ingredient(RICE, 1, 'cup')];
  const switched = setIngredientUnit(items, RICE, 200, 'g');
  assert.deepEqual(switched.map(({ foodId, unit, qty }) => [foodId, unit, qty]), [['egg', 'egg', 2], ['rice', 'g', 200]]);
  assertTotals(switched[1], foodTotals(RICE, 200));
  assert.deepEqual(switched[0], items[0]);
  // "1" stays 1, so 1 cup becomes 1 g, and 100 g of egg is 2 eggs.
  assertTotals(setIngredientUnit(items, RICE, 1, 'g')[1], foodTotals(RICE, 1));
  const [eggs] = setIngredientUnit([ingredient(EGG, 100, 'g')], EGG, 2, 'egg');
  assertTotals(eggs, foodTotals(EGG, 2));
  // The list passed in is as it was.
  assert.deepEqual([items[1].unit, items[1].qty], ['cup', 1]);
});

test("an ingredient's numbers rescale from its own snapshot when its unit is switched", () => {
  // Snapshotted when 1 cup was 300 kcal: the food is only asked what a cup and a gram weigh.
  const snapshot = { ...ingredient(RICE, 1, 'cup'), kcal: 300, protein: 6, fat: 1, carbs: 66 };
  const [half] = setIngredientUnit([snapshot], RICE, 79, 'g');
  assertTotals(half, { kcal: 150, protein: 3, fat: 0.5, carbs: 33 });
  assert.deepEqual([half.name, half.emoji, half.unit, half.qty], [snapshot.name, snapshot.emoji, 'g', 79]);
  assert.throws(() => setIngredientUnit([snapshot], RICE, 1, 'slice'), RangeError);
  assert.throws(() => setIngredientUnit([snapshot], RICE, 0, 'g'), RangeError);
});

test('a unit switched in the day’s ingredients moves the day’s total, and reset brings back the meal', () => {
  const planned = { ...createCoreDoc('2026-10-15'), meals: [RICE_BOWL] };
  const slotId = planned.slots[0].id;
  const doc = setSlotMeal(planned, slotId, RICE_BOWL.id);
  const plan = daySlots(doc, emptyDay())[0];
  const items = setIngredientUnit(slotIngredients(plan, getFood), RICE, 200, 'g');
  const edited = setSlotIngredients(emptyDay(), slotId, RICE_BOWL.id, items);
  assertTotals(dayTotal(edited, daySlots(doc, edited), getFood), foodTotals(RICE, 200));
  const reset = resetSlotIngredients(edited, slotId);
  assertTotals(dayTotal(reset, daySlots(doc, reset), getFood), CUP_OF_RICE);
  // The saved meal is still 1 cup.
  assert.deepEqual(doc.meals[0].items, [{ foodId: 'rice', qty: 1, unit: 'cup' }]);
});

// --- Entries and locked days ---

test('food and meal entries without units have the numbers they always had', () => {
  const lunch = { id: 'lunch', name: 'Lunch' };
  const food = foodEntry(lunch, RICE, 150);
  assertTotals(food, { kcal: 195, protein: 3.75, fat: 0.45, carbs: 42 });
  assert.equal('unit' in food, false);
  const added = mealEntry(lunch, SAVED_BEFORE, getFood);
  assertTotals(added, SAVED_BEFORE_TOTALS);
  assert.deepEqual(added.ingredients.map(({ unit, qty }) => [unit, qty]), [['g', 200], ['egg', 2]]);
});

test("1 cup of cooked rice added to a slot counts 158 g's numbers, and 1 g counts 1 g's", () => {
  const dinner = { id: 'dinner', name: 'Dinner' };
  const cup = foodEntry(dinner, RICE, 1, 'cup');
  assertTotals(cup, CUP_OF_RICE);
  assertTotals(cup, foodEntry(dinner, RICE, 158));
  assert.equal('unit' in cup, false);
  assertTotals(foodEntry(dinner, RICE, 1, 'g'), foodTotals(RICE, 1));
});

test('Recent adds the rice again as it was added, in cups', () => {
  const cup = foodEntry({ id: 'dinner', name: 'Dinner' }, RICE, 1, 'cup');
  const again = repeatEntry({ id: 'lunch', name: 'Lunch' }, cup);
  assert.deepEqual([again.label, again.emoji, again.source], [cup.label, cup.emoji, 'food']);
  assertTotals(again, CUP_OF_RICE);
});

test('lock-in writes an item in cups at its grams, and the locked day keeps its numbers after', () => {
  const planned = { ...createCoreDoc('2026-10-15'), meals: [RICE_BOWL] };
  const doc = setSlotMeal(planned, planned.slots[0].id, RICE_BOWL.id);
  const locked = lockDay(emptyDay(), doc, doc.meals, FOODS);
  assert.equal(locked.entries.length, 1);
  assertTotals(locked.entries[0], CUP_OF_RICE);
  assert.equal(lockDay(locked, doc, doc.meals, FOODS), locked);
  // The meal switched to 100 g afterwards doesn't change the locked day.
  const changed = { ...doc, meals: [{ ...RICE_BOWL, items: [{ foodId: 'rice', qty: 100, unit: 'g' }] }] };
  assertTotals(dayTotal(locked, daySlots(changed, locked), getFood), CUP_OF_RICE);
});
