import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap, slotMealTotals, slotTotals } from '../js/calc.js';
import { addCustomFood, createCustomFood, deleteCustomFood, isFoodInUse } from '../js/custom-foods.js';
import { addEntry, createCoreDoc, emptyDay, foodEntry, quickEntry, recentEntries } from '../js/data.js';
import { mealIngredients, removeIngredient, swapIngredient } from '../js/ingredients.js';
import { lockDay } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import {
  addSlot,
  addSlotFood,
  clearSlotChange,
  createSlot,
  daySlots,
  removeSlotFood,
  resetSlotIngredients,
  setSlotBudget,
  setSlotFoods,
  setSlotIngredients,
  setSlotMeal,
  setSlotPortion,
  skipSlot,
  swapSlot,
  swapSlotToEntry,
  templateSlots,
  updateSlotFood,
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

const KEYS = ['kcal', 'protein', 'fat', 'carbs'];
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
const sum = (...list) => Object.fromEntries(KEYS.map((key) => [key, list.reduce((total, t) => total + t[key], 0)]));
const times = (totals, n) => Object.fromEntries(KEYS.map((key) => [key, totals[key] * n]));

// Test fixtures with made-up round numbers, not real nutrition data. The fruit are counted like
// bundled foods, per 100 g with a medium portion, so amounts can be in either unit.
const per100g = (id, name, emoji, kcal, protein, fat, carbs) => ({ id, name, emoji, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const fruit = (medium, ...rest) => ({ ...per100g(...rest), grams: 100, portions: [{ unit: 'medium', grams: medium }] });
const OATS_FOOD = per100g('oats', 'Oats', '🌾', 380, 13, 7, 68);
const RICE = per100g('rice', 'Rice, white, cooked', '🍚', 130, 2.5, 0.3, 28);
const BEEF = per100g('beef', 'Beef, ground, cooked', '🥩', 250, 26, 15, 0);
// 1 medium is 120 g.
const BANANA = fruit(120, 'banana', 'Banana', '🍌', 90, 1, 0.5, 23);
// 1 medium is 180 g.
const APPLE = fruit(180, 'apple', 'Apple', '🍎', 50, 0.3, 0.2, 14);
const FOODS = [OATS_FOOD, RICE, BEEF, BANANA, APPLE];
const getFood = foodLookup(FOODS);

const BANANA_TOTALS = { kcal: 108, protein: 1.2, fat: 0.6, carbs: 27.6 };
const APPLE_TOTALS = { kcal: 90, protein: 0.54, fat: 0.36, carbs: 25.2 };

function meal(name, emoji, items) {
  return { ...createMeal({ name, emoji }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 100 g oats.
const OATS = meal('Oats', '🥣', [['oats', 100]]);
const OATS_TOTALS = { kcal: 380, protein: 13, fat: 7, carbs: 68 };
// 200 g rice + 150 g beef.
const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);
const RICE_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };
// 300 g rice.
const RICE_BOWL = meal('Rice bowl', '🍙', [['rice', 300]]);
const RICE_BOWL_TOTALS = { kcal: 390, protein: 7.5, fat: 0.9, carbs: 84 };

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };
const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);

// Breakfast: Oats, Lunch: Rice & beef, Dinner: flex, Snack: flex. No planned foods yet, and the
// template saved without `foods`, as before this step.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  doc = addSlot(doc, createSlot('Snack'));
  const { Breakfast, Lunch } = slotIds(doc);
  doc = setSlotMeal(doc, Breakfast, OATS.id);
  return setSlotMeal(doc, Lunch, RICE_BEEF.id);
}

// plannedDoc with a medium banana with lunch, and one as the snack.
function bananaDoc() {
  const doc = plannedDoc();
  const { Lunch, Snack } = slotIds(doc);
  return addSlotFood(addSlotFood(doc, Lunch, BANANA, 1, 'medium'), Snack, BANANA, 1, 'medium');
}

const planFor = (doc, day, slotId, lookup = getFood) => daySlots(doc, day, lookup).find((plan) => plan.id === slotId);
const total = (doc, day, lookup = getFood) => dayTotal(day, daySlots(doc, day, lookup), lookup);

// --- The template ---

test('a planned food goes on the template slot, and planning it again adds to its amount', () => {
  const doc = plannedDoc();
  const { Lunch, Snack } = slotIds(doc);
  const once = addSlotFood(doc, Snack, BANANA, 1, 'medium');
  assert.deepEqual(once.template[Snack].foods, [{ foodId: 'banana', qty: 1, unit: 'medium' }]);
  assert.equal(doc.template[Snack].foods, undefined, 'the doc passed in is left as it was');

  // Like a meal's addItem: a second banana makes 2, and 60 g more is half a medium one.
  const twice = addSlotFood(once, Snack, BANANA, 1, 'medium');
  assert.deepEqual(twice.template[Snack].foods, [{ foodId: 'banana', qty: 2, unit: 'medium' }]);
  assert.deepEqual(addSlotFood(twice, Snack, BANANA, 60, 'g').template[Snack].foods, [{ foodId: 'banana', qty: 2.5, unit: 'medium' }]);

  // Without a unit it's in the serving's; another food is a second line, after the first.
  const withApple = addSlotFood(once, Snack, APPLE, 150);
  assert.deepEqual(withApple.template[Snack].foods, [
    { foodId: 'banana', qty: 1, unit: 'medium' },
    { foodId: 'apple', qty: 150, unit: 'g' },
  ]);

  // The slot's meal and budget stay.
  const lunch = addSlotFood(doc, Lunch, BANANA, 1, 'medium').template[Lunch];
  assert.equal(lunch.mealId, RICE_BEEF.id);
  assert.equal(lunch.budget, null);

  assert.throws(() => addSlotFood(doc, Snack, BANANA, 0, 'medium'), RangeError);
  assert.throws(() => addSlotFood(doc, Snack, BANANA, 1, 'slice'), RangeError);
});

test('a planned food’s amount changes, in its unit or another, and it can be removed', () => {
  const plain = plannedDoc();
  const { Snack } = slotIds(plain);
  const doc = addSlotFood(plain, Snack, BANANA, 1, 'medium');
  assert.deepEqual(updateSlotFood(doc, Snack, 'banana', 2).template[Snack].foods, [{ foodId: 'banana', qty: 2, unit: 'medium' }]);
  assert.deepEqual(updateSlotFood(doc, Snack, 'banana', 150, 'g').template[Snack].foods, [{ foodId: 'banana', qty: 150, unit: 'g' }]);

  const removed = removeSlotFood(doc, Snack, 'banana');
  assert.deepEqual(removed.template[Snack].foods, []);
  assert.equal(templateSlots(removed).find(({ id }) => id === Snack).flex, true, 'no meal and no foods is flex again');
});

test('templateSlots gives each slot its foods, and a slot with a meal or foods isn’t flex', () => {
  const doc = bananaDoc();
  const [breakfast, lunch, dinner, snack] = templateSlots(doc);
  assert.deepEqual(breakfast.foods, []);
  assert.equal(breakfast.flex, false);
  assert.deepEqual(lunch.foods, [{ foodId: 'banana', qty: 1, unit: 'medium' }]);
  assert.equal(lunch.meal, RICE_BEEF);
  assert.equal(lunch.flex, false);
  assert.equal(dinner.flex, true);
  assert.equal(snack.meal, null);
  assert.equal(snack.flex, false);
});

// --- The day ---

test('a slot planning only a banana counts in dayTotal and flexGap, and isn’t flex', () => {
  const plain = plannedDoc();
  const doc = addSlotFood(plain, slotIds(plain).Snack, BANANA, 1, 'medium');
  const { Dinner, Snack } = slotIds(doc);
  const day = emptyDay();

  const snack = planFor(doc, day, Snack);
  assert.equal(snack.flex, false);
  assert.equal(snack.meal, null);
  assert.equal(snack.budget, null);
  assert.deepEqual(snack.foods.map(({ foodId, name, emoji, qty, unit }) => ({ foodId, name, emoji, qty, unit })), [
    { foodId: 'banana', name: 'Banana', emoji: '🍌', qty: 1, unit: 'medium' },
  ]);
  assertTotals(snack.foods[0], BANANA_TOTALS, 'snapshot');
  assertTotals(slotTotals(snack, getFood), BANANA_TOTALS);
  assertTotals(total(doc, day), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BANANA_TOTALS));

  const gap = (d) => flexGap(TARGETS, day, daySlots(d, day, getFood), Dinner, getFood);
  assert.equal(gap(doc).kcal.amount, gap(plain).kcal.amount - BANANA_TOTALS.kcal);
});

test('a meal with a banana at 1.5× scales the meal and not the banana', () => {
  const doc = bananaDoc();
  const { Lunch } = slotIds(doc);
  const lunch = planFor(doc, setSlotPortion(emptyDay(), Lunch, 1.5), Lunch);
  assert.equal(lunch.foods[0].qty, 1);
  assertTotals(slotMealTotals(lunch, getFood), times(RICE_BEEF_TOTALS, 1.5), 'meal');
  assertTotals(slotTotals(lunch, getFood), sum(times(RICE_BEEF_TOTALS, 1.5), BANANA_TOTALS), 'slot');
});

test('Skip drops the meal and its planned foods both, and the day’s version of them', () => {
  const doc = bananaDoc();
  const { Lunch, Snack } = slotIds(doc);
  for (const slotId of [Lunch, Snack]) {
    const plan = planFor(doc, skipSlot(emptyDay(), slotId), slotId);
    assert.equal(plan.skipped, true);
    assert.deepEqual(plan.foods, []);
    assert.equal(plan.flex, false, 'a skipped slot is still planned, not open');
    assertTotals(slotTotals(plan, getFood), ZERO);
  }
  const ownVersion = setSlotFoods(emptyDay(), Snack, []);
  assert.deepEqual(skipSlot(ownVersion, Snack).changes[Snack], { mealId: null });
});

test('a planned food swapped for an apple or removed is for the day only, and As planned brings back the template’s', () => {
  const doc = bananaDoc();
  const { Snack } = slotIds(doc);
  const { foods } = planFor(doc, emptyDay(), Snack);

  const apple = setSlotFoods(emptyDay(), Snack, swapIngredient(foods, 'banana', APPLE, 1, 'medium'));
  const snack = planFor(doc, apple, Snack);
  assert.deepEqual(snack.foods.map(({ name }) => name), ['Apple']);
  assertTotals(slotTotals(snack, getFood), APPLE_TOTALS);
  assert.deepEqual(doc.template[Snack].foods, [{ foodId: 'banana', qty: 1, unit: 'medium' }], 'the template is unchanged');
  assertTotals(slotTotals(planFor(doc, emptyDay(), Snack), getFood), BANANA_TOTALS, 'the next day');

  // Removed: nothing left in it, but still planned rather than an open flex slot.
  const removed = setSlotFoods(emptyDay(), Snack, removeIngredient(foods, 'banana'));
  assert.deepEqual(removed.changes[Snack], { foods: [] });
  const empty = planFor(doc, removed, Snack);
  assert.deepEqual(empty.foods, []);
  assert.equal(empty.flex, false);
  assertTotals(slotTotals(empty, getFood), ZERO);
  assertTotals(total(doc, removed), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BANANA_TOTALS), 'lunch’s banana stays');

  for (const changed of [apple, removed]) {
    assert.deepEqual(clearSlotChange(changed, Snack).changes, {});
    assertTotals(slotTotals(planFor(doc, clearSlotChange(changed, Snack), Snack), getFood), BANANA_TOTALS);
  }
  assert.throws(() => setSlotFoods(emptyDay(), Snack, null), RangeError);
});

test('the day’s version of the planned foods is its own: the template and the food changing later don’t reach it', () => {
  const doc = bananaDoc();
  const { Snack } = slotIds(doc);
  const { foods } = planFor(doc, emptyDay(), Snack);
  const day = setSlotFoods(emptyDay(), Snack, swapIngredient(foods, 'banana', APPLE, 1, 'medium'));

  const threeBananas = updateSlotFood(doc, Snack, 'banana', 3);
  assertTotals(slotTotals(planFor(threeBananas, day, Snack), getFood), APPLE_TOTALS);
  const appleEdited = foodLookup(FOODS.map((f) => (f === APPLE ? { ...APPLE, kcal: 70 } : f)));
  assertTotals(slotTotals(planFor(doc, day, Snack, appleEdited), appleEdited), APPLE_TOTALS);
});

test('a meal swap keeps the day’s planned foods, and so do a swap to a food, a portion, ingredients and Reset', () => {
  const doc = bananaDoc();
  const { Lunch } = slotIds(doc);
  const lunch = slotNamed(doc, 'Lunch');
  const apples = swapIngredient(planFor(doc, emptyDay(), Lunch).foods, 'banana', APPLE, 1, 'medium');
  const day = setSlotFoods(emptyDay(), Lunch, apples);

  const swapped = swapSlot(day, Lunch, RICE_BOWL.id, RICE_BEEF.id);
  assert.deepEqual(swapped.changes[Lunch], { foods: apples, mealId: RICE_BOWL.id });
  assertTotals(slotTotals(planFor(doc, swapped, Lunch), getFood), sum(RICE_BOWL_TOTALS, APPLE_TOTALS), 'meal swap');

  const oats = foodEntry(lunch, OATS_FOOD, 50);
  assert.deepEqual(swapSlotToEntry(day, Lunch, oats).changes[Lunch], { entry: oats, foods: apples });
  const swappedIn = planFor(doc, swapSlotToEntry(day, Lunch, oats), Lunch);
  assertTotals(slotTotals(swappedIn, getFood), sum(times(OATS_TOTALS, 0.5), APPLE_TOTALS), 'food swap');

  const items = mealIngredients(RICE_BEEF, getFood);
  for (const kept of [setSlotPortion(day, Lunch, 1.5), setSlotIngredients(day, Lunch, RICE_BEEF.id, items)]) {
    assert.deepEqual(kept.changes[Lunch].foods, apples);
    assert.deepEqual(resetSlotIngredients(kept, Lunch).changes[Lunch], { foods: apples });
  }

  // With no version of its own, a swap keeps the template's banana.
  const plain = planFor(doc, swapSlot(emptyDay(), Lunch, RICE_BOWL.id, RICE_BEEF.id), Lunch);
  assertTotals(slotTotals(plain, getFood), sum(RICE_BOWL_TOTALS, BANANA_TOTALS), 'template banana');
});

test('changes left on a slot that now plans only foods, or nothing, are ignored where they no longer apply', () => {
  const doc = bananaDoc();
  const { Lunch } = slotIds(doc);
  const lunch = slotNamed(doc, 'Lunch');
  const swapped = setSlotPortion(swapSlot(emptyDay(), Lunch, RICE_BOWL.id, RICE_BEEF.id), Lunch, 1.5);
  const swappedIn = swapSlotToEntry(emptyDay(), Lunch, quickEntry(lunch, BUDGET));

  // The template's lunch keeps its banana but loses its meal: a meal's changes don't apply.
  const foodsOnly = setSlotMeal(doc, Lunch, null);
  for (const day of [swapped, swappedIn]) {
    const plan = planFor(foodsOnly, day, Lunch);
    assert.equal(plan.meal, null);
    assert.equal(plan.swapped, false);
    assert.equal(plan.swapEntry, null);
    assert.equal(plan.portion, 1);
    assertTotals(slotTotals(plan, getFood), BANANA_TOTALS);
  }

  // Then loses its banana too, so it's flex, and a day's version of its foods is ignored.
  const flex = removeSlotFood(foodsOnly, Lunch, 'banana');
  const plan = planFor(flex, setSlotFoods(emptyDay(), Lunch, mealIngredients(OATS, getFood)), Lunch);
  assert.equal(plan.flex, true);
  assert.deepEqual(plan.foods, []);
  assertTotals(slotTotals(plan, getFood), ZERO);
});

test('Plan totals include planned foods, and a pinned budget is ignored on a slot with foods', () => {
  const templateTotal = (doc) => total(doc, emptyDay());
  const doc = plannedDoc();
  const { Dinner, Snack } = slotIds(doc);
  assertTotals(templateTotal(addSlotFood(doc, Snack, BANANA, 1, 'medium')), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BANANA_TOTALS), 'snack');

  const pinned = setSlotBudget(doc, Dinner, BUDGET);
  assertTotals(templateTotal(pinned), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BUDGET), 'budget');
  const withBanana = addSlotFood(pinned, Dinner, BANANA, 1, 'medium');
  assert.equal(planFor(withBanana, emptyDay(), Dinner).budget, null);
  assertTotals(templateTotal(withBanana), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BANANA_TOTALS), 'budget ignored');
  assertTotals(templateTotal(removeSlotFood(withBanana, Dinner, 'banana')), sum(OATS_TOTALS, RICE_BEEF_TOTALS, BUDGET), 'budget back');
});

test('an off-plan day ignores them', () => {
  const doc = bananaDoc();
  const { Snack } = slotIds(doc);
  const day = { ...setSlotFoods(emptyDay(), Snack, mealIngredients(OATS, getFood)), offPlan: true };
  const plans = daySlots(doc, day, getFood);
  assert.ok(plans.every((plan) => plan.flex && plan.foods.length === 0));
  assertTotals(total(doc, day), ZERO);
  assert.deepEqual(lockDay(day, doc, doc.meals, FOODS).entries, []);
});

// --- Lock-in ---

test('lockDay writes the meal, then its foods marked planned, and Recent leaves them out', () => {
  const doc = bananaDoc();
  const { Breakfast, Lunch, Dinner, Snack } = slotIds(doc);
  const extra = quickEntry(slotNamed(doc, 'Dinner'), BUDGET, 'Burrito place');
  const day = addEntry(setSlotPortion(emptyDay(), Lunch, 1.5), extra);
  const locked = lockDay(day, doc, doc.meals, FOODS);

  const written = locked.entries.map(({ slotId, slotName, label, emoji, source, planned }) => ({ slotId, slotName, label, emoji, source, planned }));
  assert.deepEqual(written, [
    { slotId: Breakfast, slotName: 'Breakfast', label: 'Oats', emoji: '🥣', source: 'meal', planned: true },
    { slotId: Lunch, slotName: 'Lunch', label: 'Rice & beef', emoji: '🍚', source: 'meal', planned: true },
    { slotId: Lunch, slotName: 'Lunch', label: 'Banana', emoji: '🍌', source: 'food', planned: true },
    { slotId: Snack, slotName: 'Snack', label: 'Banana', emoji: '🍌', source: 'food', planned: true },
    { slotId: Dinner, slotName: 'Dinner', label: 'Burrito place', emoji: '🍽️', source: 'quick', planned: undefined },
  ]);
  assertTotals(locked.entries[1], times(RICE_BEEF_TOTALS, 1.5), 'meal at 1.5×');
  assertTotals(locked.entries[2], BANANA_TOTALS, 'banana at its own amount');
  assertTotals(dayTotal(locked, [], getFood), total(doc, day), 'same total');

  const recent = recentEntries({ '2026-10-20': locked }, '2026-10-21');
  assert.deepEqual(recent.map(({ entry }) => entry.label), ['Burrito place']);
});

test('a slot swapped to a food or quick numbers locks in what was swapped in, then its planned foods', () => {
  const doc = bananaDoc();
  const { Lunch } = slotIds(doc);
  const burrito = quickEntry(slotNamed(doc, 'Lunch'), BUDGET, 'Burrito place');
  const locked = lockDay(swapSlotToEntry(emptyDay(), Lunch, burrito), doc, doc.meals, FOODS);
  const lunch = locked.entries.filter(({ slotId }) => slotId === Lunch);
  assert.deepEqual(lunch[0], burrito);
  assert.deepEqual(lunch.slice(1).map(({ label, planned }) => [label, planned]), [['Banana', true]]);
});

test('editing or deleting the food after lock-in leaves the day as it was, and deleting a planned custom food archives it', () => {
  const bar = createCustomFood({ name: 'Protein bar', serving: { qty: 1, unit: 'bar' }, emoji: '🍽️', kcal: 200, protein: 20, fat: 7, carbs: 22 });
  const plain = addCustomFood(plannedDoc(), bar);
  const { Snack } = slotIds(plain);
  const doc = addSlotFood(plain, Snack, bar, 1);
  const foods = [...doc.foods, ...FOODS];
  const locked = lockDay(emptyDay(), doc, doc.meals, foods);
  const before = dayTotal(locked, [], getFood);
  assertTotals(before, sum(OATS_TOTALS, RICE_BEEF_TOTALS, bar));

  // Planned in a slot, it's in use, so deleting it archives it and the template still resolves it.
  assert.equal(isFoodInUse(doc, bar.id), true);
  assert.equal(isFoodInUse(plain, bar.id), false);
  const deleted = deleteCustomFood(doc, bar.id);
  assert.deepEqual(deleted.foods, [{ ...bar, archived: true }]);
  assertTotals(total(deleted, emptyDay(), foodLookup([...deleted.foods, ...FOODS])), before, 'archived, still planned');
  assert.deepEqual(deleteCustomFood(plain, bar.id).foods, [], 'used nowhere, it goes');

  // The locked day is its entries: the bar gone for good, or edited, changes nothing.
  for (const lookup of [foodLookup(FOODS), foodLookup([{ ...bar, kcal: 250 }, ...FOODS])]) {
    assertTotals(dayTotal(locked, [], lookup), before);
  }
});

test('a doc saved without planned foods gives the same results as before', () => {
  const doc = plannedDoc();
  assert.ok(Object.values(doc.template).every((slot) => !('foods' in slot)));
  const plans = daySlots(doc, emptyDay(), getFood);
  assert.deepEqual(plans.map(({ flex }) => flex), [false, false, true, true]);
  assert.ok(plans.every((plan) => plan.foods.length === 0));
  assertTotals(total(doc, emptyDay()), sum(OATS_TOTALS, RICE_BEEF_TOTALS));

  const locked = lockDay(emptyDay(), doc, doc.meals, FOODS);
  assert.deepEqual(locked.entries.map(({ label, source }) => [label, source]), [['Oats', 'meal'], ['Rice & beef', 'meal']]);
  assertTotals(locked.entries[1], RICE_BEEF_TOTALS);
});
