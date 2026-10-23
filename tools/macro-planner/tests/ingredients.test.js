import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap, ingredientsTotals, mealTotals, scaleTotals, slotTotals } from '../js/calc.js';
import { createCoreDoc, emptyDay } from '../js/data.js';
import { parseAmount } from '../js/custom-foods.js';
import {
  addIngredient,
  amountText,
  ingredient,
  mealIngredients,
  removeIngredient,
  scaleIngredients,
  setIngredientQty,
  slotIngredients,
  swapIngredient,
} from '../js/ingredients.js';
import { lockDay } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import {
  clearSlotChange,
  daySlots,
  resetSlotIngredients,
  setSlotIngredients,
  setSlotMeal,
  setSlotPortion,
  skipSlot,
  swapSlot,
} from '../js/slots.js';

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
const RICE = food('rice', 'Rice, white, cooked', '🍚', { qty: 100, unit: 'g' }, 130, 2.5, 0.3, 28);
const BEEF = food('beef', 'Beef, ground, cooked', '🥩', { qty: 100, unit: 'g' }, 250, 26, 15, 0);
const JAM = food('custom-jam', 'Jam', '🍓', { qty: 1, unit: 'tbsp' }, 50, 0, 0, 13);
const FOODS = [EGG, SOURDOUGH, RYE, BUTTER, RICE, BEEF, JAM];
const getFood = foodLookup(FOODS);

function meal(name, items) {
  return { ...createMeal({ name }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 2 eggs (140 / 12 / 10 / 1) + 2 slices sourdough (240 / 8 / 2 / 46) + 10 g butter (72 / 0 / 8 / 0).
const SANDWICH = meal('Breakfast sandwich', [['egg', 2], ['sourdough', 2], ['butter', 10]]);
const SANDWICH_TOTALS = { kcal: 452, protein: 20, fat: 20, carbs: 47 };
// 200 g rice (260 / 5 / 0.6 / 56) + 150 g beef (375 / 39 / 22.5 / 0).
const RICE_BEEF = meal('Rice & beef', [['rice', 200], ['beef', 150]]);
// 300 g rice.
const RICE_BOWL = meal('Rice bowl', [['rice', 300]]);
const RICE_BOWL_TOTALS = { kcal: 390, protein: 7.5, fat: 0.9, carbs: 84 };

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };

// Breakfast: Breakfast sandwich, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [SANDWICH, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, SANDWICH.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
const planFor = (doc, day, slotId) => daySlots(doc, day).find((plan) => plan.id === slotId);
const total = (doc, day, lookup = getFood) => dayTotal(day, daySlots(doc, day), lookup);
const planTotal = (doc) => total(doc, emptyDay());

// The sandwich with 3 eggs and rye for sourdough: 210 / 18 / 15 / 1.5 + 160 / 6 / 2 / 30 + 72 / 0 / 8 / 0.
const EDITED = swapIngredient(setIngredientQty(mealIngredients(SANDWICH, getFood), 'egg', 3), 'sourdough', RYE, 2);
const EDITED_TOTALS = { kcal: 442, protein: 24, fat: 25, carbs: 31.5 };

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

// --- A slot's ingredients ---

test("a slot eats its meal's ingredients at its portion, or its own ingredients once edited", () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const plain = planFor(doc, emptyDay(), Breakfast);
  assert.equal(plain.edited, false);
  assert.equal(plain.ingredients, null);
  assert.deepEqual(slotIngredients(plain, getFood), mealIngredients(SANDWICH, getFood));

  const day = setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, EDITED);
  const edited = planFor(doc, day, Breakfast);
  assert.equal(edited.edited, true);
  assert.deepEqual(edited.ingredients, EDITED);
  assert.deepEqual(slotIngredients(edited, getFood), EDITED);
  assertTotals(slotTotals(edited, getFood), EDITED_TOTALS);
});

test('editing at 1.5× folds the portion into the amounts and clears it', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const day = setSlotPortion(emptyDay(), Breakfast, 1.5);
  const items = slotIngredients(planFor(doc, day, Breakfast), getFood);
  assert.deepEqual(items.map((item) => item.qty), [3, 3, 15]);

  const edited = setSlotIngredients(day, Breakfast, SANDWICH.id, items);
  assert.equal(Object.hasOwn(edited.changes[Breakfast], 'portion'), false);
  const plan = planFor(doc, edited, Breakfast);
  assert.equal(plan.portion, 1);
  assertTotals(slotTotals(plan, getFood), scaleTotals(SANDWICH_TOTALS, 1.5));
});

test('a portion picked after an edit is eaten of the edited list', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const day = setSlotPortion(setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, EDITED), Breakfast, 0.5);
  const plan = planFor(doc, day, Breakfast);
  assert.equal(plan.edited, true);
  assertTotals(slotTotals(plan, getFood), scaleTotals(EDITED_TOTALS, 0.5));
});

test('setting ingredients keeps a swap, takes back a skip and refuses an empty list', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const swapped = swapSlot(emptyDay(), Breakfast, RICE_BOWL.id, SANDWICH.id);
  const bowl = scaleIngredients(mealIngredients(RICE_BOWL, getFood), 0.5);
  const edited = setSlotIngredients(swapped, Breakfast, RICE_BOWL.id, bowl);
  const plan = planFor(doc, edited, Breakfast);
  assert.equal(plan.swapped, true);
  assert.equal(plan.edited, true);
  assertTotals(slotTotals(plan, getFood), scaleTotals(RICE_BOWL_TOTALS, 0.5));

  const unskipped = setSlotIngredients(skipSlot(emptyDay(), Breakfast), Breakfast, SANDWICH.id, EDITED);
  assert.equal(planFor(doc, unskipped, Breakfast).skipped, false);

  assert.throws(() => setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, []), RangeError);
  assert.throws(() => setSlotIngredients(emptyDay(), Breakfast, null, EDITED), RangeError);
});

test('ingredients are ignored while the slot shows another meal: a swap, a template change or a deleted meal', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const edited = setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, EDITED);

  // A swap stored alongside an edit made on the template's meal.
  const swappedDay = { ...edited, changes: { [Breakfast]: { ...edited.changes[Breakfast], mealId: RICE_BOWL.id } } };
  const swapped = planFor(doc, swappedDay, Breakfast);
  assert.equal(swapped.edited, false);
  assertTotals(slotTotals(swapped, getFood), RICE_BOWL_TOTALS);

  // The template now plans another meal in the slot.
  const changed = planFor(setSlotMeal(doc, Breakfast, RICE_BOWL.id), edited, Breakfast);
  assert.equal(changed.edited, false);
  assertTotals(slotTotals(changed, getFood), RICE_BOWL_TOTALS);

  // An edit on a swapped-in meal that's since been deleted: back to the template's meal, as saved.
  const bowlDay = setSlotIngredients(swapSlot(emptyDay(), Breakfast, RICE_BOWL.id, SANDWICH.id), Breakfast, RICE_BOWL.id, mealIngredients(RICE_BOWL, getFood));
  const withoutBowl = { ...doc, meals: [SANDWICH, RICE_BEEF] };
  const fallback = planFor(withoutBowl, bowlDay, Breakfast);
  assert.equal(fallback.meal.id, SANDWICH.id);
  assert.equal(fallback.edited, false);
  assertTotals(slotTotals(fallback, getFood), SANDWICH_TOTALS);

  // The edited meal itself deleted: the slot is flex, and the edit counts for nothing.
  const flex = planFor({ ...doc, meals: [RICE_BEEF, RICE_BOWL] }, edited, Breakfast);
  assert.equal(flex.meal, null);
  assert.equal(flex.edited, false);
  assert.equal(flex.ingredients, null);
});

test('Swap and Skip drop the edit, As planned clears it, and Reset keeps a swap', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const edited = setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, EDITED);

  const swapped = swapSlot(edited, Breakfast, RICE_BOWL.id, SANDWICH.id);
  assert.deepEqual(swapped.changes[Breakfast], { mealId: RICE_BOWL.id });
  // Swapping back to the template's meal doesn't bring the edit back.
  assert.equal(planFor(doc, swapSlot(swapped, Breakfast, SANDWICH.id, SANDWICH.id), Breakfast).edited, false);

  assert.deepEqual(skipSlot(edited, Breakfast).changes[Breakfast], { mealId: null });
  assert.deepEqual(clearSlotChange(edited, Breakfast).changes, {});

  // Reset: the saved meal at 1×, so the portion goes too, and a slot with nothing else has no change.
  assert.deepEqual(resetSlotIngredients(setSlotPortion(edited, Breakfast, 1.5), Breakfast).changes, {});
  const swappedEdit = setSlotIngredients(swapped, Breakfast, RICE_BOWL.id, mealIngredients(RICE_BOWL, getFood));
  const reset = resetSlotIngredients(swappedEdit, Breakfast);
  assert.deepEqual(reset.changes[Breakfast], { mealId: RICE_BOWL.id });
  const plan = planFor(doc, reset, Breakfast);
  assert.equal(plan.swapped, true);
  assert.equal(plan.edited, false);
});

// --- The day's total ---

test("dayTotal, flexGap and lockDay use the edited numbers, while Plan's total doesn't move", () => {
  const doc = plannedDoc();
  const { Breakfast, Dinner } = slotIds(doc);
  const before = planTotal(doc);
  const plain = emptyDay();
  const edited = setSlotIngredients(plain, Breakfast, SANDWICH.id, EDITED);
  const difference = { kcal: -10, protein: 4, fat: 5, carbs: -15.5 };

  const expected = Object.fromEntries(Object.entries(total(doc, plain)).map(([key, value]) => [key, value + difference[key]]));
  assertTotals(total(doc, edited), expected, 'dayTotal');

  const gapBefore = flexGap(TARGETS, plain, daySlots(doc, plain), Dinner, getFood);
  const gapAfter = flexGap(TARGETS, edited, daySlots(doc, edited), Dinner, getFood);
  assert.equal(gapAfter.kcal.amount, gapBefore.kcal.amount + 10);
  assert.equal(gapAfter.protein.amount, gapBefore.protein.amount - 4);

  const locked = lockDay(edited, doc, doc.meals, FOODS);
  const breakfast = locked.entries.find((entry) => entry.slotId === Breakfast);
  assert.equal(breakfast.label, 'Breakfast sandwich');
  assertTotals(breakfast, EDITED_TOTALS, 'lockDay');
  assertTotals(dayTotal(locked, [], getFood), expected, 'locked');

  assertTotals(planTotal(doc), before, 'Plan');
  assertTotals(mealTotals(SANDWICH, getFood), SANDWICH_TOTALS, 'saved meal');
});

test("deleting or editing a food afterwards leaves the day's total as it was", () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const items = addIngredient(EDITED, JAM, 2);
  const day = setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, items);
  const before = total(doc, day);

  // Jam deleted for good, and eggs edited to new numbers.
  const later = foodLookup(FOODS.filter((f) => f !== JAM).map((f) => (f === EGG ? { ...EGG, kcal: 90, protein: 7 } : f)));
  assertTotals(total(doc, day, later), before);

  const laterFoods = FOODS.filter((f) => f !== JAM);
  const locked = lockDay(day, doc, doc.meals, laterFoods);
  assertTotals(dayTotal(locked, [], later), before);
});

test('an off-plan day ignores the edit', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const day = { ...setSlotIngredients(emptyDay(), Breakfast, SANDWICH.id, EDITED), offPlan: true };
  const plan = planFor(doc, day, Breakfast);
  assert.equal(plan.edited, false);
  assert.equal(plan.ingredients, null);
  assertTotals(total(doc, day), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  assert.deepEqual(lockDay(day, doc, doc.meals, FOODS).entries, []);
});
