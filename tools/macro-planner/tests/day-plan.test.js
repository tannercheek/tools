import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientsTotals } from '../js/calc.js';
import {
  DEFAULT_EMOJI,
  OTHER,
  addEntry,
  emptyDay,
  foodDayItem,
  foodEntry,
  ingredientDayItem,
  mealDayItem,
  quickDayItem,
  quickEntry,
  swappedIn,
} from '../js/data.js';
import {
  dayPlan,
  removePlannedItem,
  resetItemIngredients,
  setItemIngredients,
  setItemPortion,
  skipPlannedSlot,
  swapPlannedItem,
} from '../js/day-plan.js';
import { ingredient, mealIngredients, removeIngredient, scaleIngredients, setIngredientQty } from '../js/ingredients.js';
import { deleteMeal, foodLookup, updateItem, updateMeal } from '../js/saved-meals.js';
import { addPlannedFood, addPlannedMeal, clearSlotChange, removePlannedItem as removeTemplateItem } from '../js/slots.js';
import {
  oldShapeAddFood,
  oldShapeDaySlots,
  oldShapeSetFoods,
  oldShapeSetPortion,
  oldShapeSlotMealTotals,
  oldShapeSwap,
  oldShapeSwapToEntry,
} from './old-slot-model-reference.js';
import {
  APPLE,
  APPLE_TOTALS,
  BANANA,
  BANANA_TOTALS,
  BEEF,
  BUDGET,
  FOODS,
  NUMBERS,
  OATS,
  OATS_EDIT,
  OATS_TOTALS,
  OLD_SHAPE_DAYS,
  RICE,
  RICE_BEEF,
  RICE_BEEF_TOTALS,
  RICE_BOWL,
  RICE_BOWL_EDIT,
  assertTotals,
  bananaForApple,
  getFood,
  itemsDoc,
  itemsOf,
  oldShapeDoc,
  planOf,
  slotIds,
  slotNamed,
  times,
  withChanges,
} from './day-plan-fixtures.js';

// --- Day items ---

test('a meal day item is the meal at 1× with its ingredients, its numbers their total', () => {
  const ingredients = mealIngredients(RICE_BEEF, getFood);
  const item = mealDayItem('lunch-meal', RICE_BEEF, getFood);
  assert.deepEqual(item, {
    id: 'lunch-meal',
    label: 'Rice & beef',
    emoji: '🍚',
    ...ingredientsTotals(ingredients),
    source: 'meal',
    mealId: RICE_BEEF.id,
    portion: 1,
    ingredients,
  });
  assertTotals(item, RICE_BEEF_TOTALS);
});

test('a food day item keeps its amount and unit, the serving’s by default, and reads the same from its ingredient', () => {
  const banana = foodDayItem('snack-food', BANANA, 1, 'medium');
  const { kcal, protein, fat, carbs, ...rest } = banana;
  assert.deepEqual(rest, { id: 'snack-food', label: 'Banana', emoji: '🍌', source: 'food', foodId: 'banana', qty: 1, unit: 'medium' });
  assertTotals(banana, BANANA_TOTALS);
  const inGrams = foodDayItem('snack-food', BANANA, 120);
  assert.equal(inGrams.unit, 'g');
  assertTotals(inGrams, BANANA_TOTALS);
  assert.deepEqual(ingredientDayItem('snack-food', ingredient(BANANA, 1, 'medium')), banana);
  assert.throws(() => foodDayItem('snack-food', BANANA, 0), RangeError);
});

test('quick numbers take their label, or else the slot’s name, with 🍽️, and swappedIn marks an item with the id it replaces', () => {
  const lunch = { id: 'lunch', name: 'Lunch' };
  assert.deepEqual(quickDayItem('item-1', lunch, NUMBERS, ' Burrito place '), {
    id: 'item-1',
    label: 'Burrito place',
    emoji: DEFAULT_EMOJI,
    ...NUMBERS,
    source: 'quick',
  });
  assert.equal(quickDayItem('item-1', lunch, NUMBERS).label, 'Lunch');
  const apple = foodDayItem('picked', APPLE, 1, 'medium');
  assert.deepEqual(swappedIn('item-1', apple), { ...apple, id: 'item-1', swapped: true });
});

// --- Agreement with daySlots on days saved before slots held items ---

// A slot as the agreement tests compare it: what each item is, its amounts and its numbers, but not
// its id, which the old model didn't have.
function newView({ id, name, flex, budget, skipped, items, entries }) {
  return {
    id,
    name,
    flex,
    budget,
    skipped,
    entries,
    items: items.map(({ id: itemId, swapped, ...item }) => ({ ...item, swapped: Boolean(swapped) })),
  };
}

// The same from one of daySlots' plans: its meal, or what was swapped in for it, then its planned
// foods. An edited meal is kept with the meal as saved, which is what its reset went back to.
function oldView(plan) {
  const { id, name, flex, budget, skipped, entries } = plan;
  return { id, name, flex, budget, skipped, entries, items: oldItems(plan) };
}

function oldItems(plan) {
  if (plan.flex || plan.skipped) return [];
  const foods = plan.foods.map(({ name, ...food }) => ({ label: name, ...food, source: 'food', swapped: false }));
  if (plan.swapEntry) {
    const { id, slotId, slotName, ...entry } = plan.swapEntry;
    return [{ ...entry, swapped: true }, ...foods];
  }
  if (!plan.meal) return foods;
  const asSaved = mealIngredients(plan.meal, getFood);
  const meal = {
    label: plan.meal.name,
    emoji: plan.meal.emoji,
    ...oldShapeSlotMealTotals(plan, getFood),
    source: 'meal',
    mealId: plan.meal.id,
    portion: plan.portion,
    ingredients: plan.ingredients ?? asSaved,
    swapped: plan.swapped,
  };
  return [plan.edited ? { ...meal, originalIngredients: asSaved } : meal, ...foods];
}


for (const [name, makeDay] of Object.entries(OLD_SHAPE_DAYS)) {
  test(`a day saved before slots held items reads as before: ${name}`, () => {
    const saved = oldShapeDoc();
    const { day, doc = saved } = makeDay(saved, slotIds(saved));
    assert.deepEqual(dayPlan(doc, day, getFood).map(newView), oldShapeDaySlots(doc, day, getFood).map(oldView));
  });
}

test('every planned food removed for the day, on a slot planning nothing else, now reads as a skip', () => {
  const doc = oldShapeDoc();
  const day = oldShapeSetFoods(emptyDay(), slotIds(doc).Snack, []);
  const old = planOf(oldShapeDaySlots(doc, day, getFood), 'Snack');
  assert.equal(old.skipped, false);
  assert.deepEqual(oldItems(old), []);
  const snack = planOf(dayPlan(doc, day, getFood), 'Snack');
  assert.deepEqual([snack.skipped, snack.ownVersion, snack.items], [true, false, []]);
});

test('a change saved before slots held items reads under the template’s ids, and a food swapped in under one made from its food', () => {
  let doc = oldShapeDoc();
  const ids = slotIds(doc);
  doc = oldShapeAddFood(doc, ids.Breakfast, RICE, 50, 'g');
  let day = oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id);
  day = oldShapeSetFoods(day, ids.Breakfast, bananaForApple(doc));
  day = oldShapeSwapToEntry(day, ids.Lunch, quickEntry(slotNamed(doc, 'Lunch'), NUMBERS, 'Burrito place'));
  const plans = dayPlan(doc, day, getFood);
  const breakfast = planOf(plans, 'Breakfast');
  assert.deepEqual(
    breakfast.items.map(({ id, label, swapped }) => [id, label, Boolean(swapped)]),
    [
      [`meal-${OATS.id}`, 'Rice bowl', true],
      ['food-apple', 'Apple', false],
      ['food-rice', 'Rice, white, cooked', false],
    ],
  );
  assert.equal(breakfast.ownVersion, true);
  const [quick] = planOf(plans, 'Lunch').items;
  assert.deepEqual([quick.id, quick.label, quick.source, quick.swapped], [`meal-${RICE_BEEF.id}`, 'Burrito place', 'quick', true]);
});

test('a change saved before reads against a template since saved as items: the first meal takes it', () => {
  const saved = oldShapeDoc();
  const ids = slotIds(saved);
  const day = oldShapeSetPortion(emptyDay(), ids.Breakfast, 1.5);
  const doc = addPlannedMeal(saved, ids.Breakfast, RICE_BEEF.id);
  const [oats, banana, riceBeef] = itemsOf(doc, 'Breakfast');
  const items = planOf(dayPlan(doc, day, getFood), 'Breakfast').items;
  assert.deepEqual(items.map(({ id }) => id), [oats.id, riceBeef.id, banana.id]);
  assertTotals(items[0], times(OATS_TOTALS, 1.5));
  assert.deepEqual(items[1], mealDayItem(riceBeef.id, RICE_BEEF, getFood));
});

test('a change to a slot with a change saved before writes it in the new shape, and the other slots keep theirs', () => {
  const doc = oldShapeDoc();
  const ids = slotIds(doc);
  let day = oldShapeSetFoods(oldShapeSetPortion(emptyDay(), ids.Breakfast, 1.5), ids.Breakfast, bananaForApple(doc));
  day = oldShapeSwapToEntry(day, ids.Lunch, quickEntry(slotNamed(doc, 'Lunch'), NUMBERS, 'Burrito place'));
  const [, apple] = planOf(dayPlan(doc, day, getFood), 'Breakfast').items;
  const next = setItemPortion(doc, day, ids.Breakfast, `meal-${OATS.id}`, 2, getFood);
  assert.deepEqual(Object.keys(next.changes[ids.Breakfast]), ['items']);
  const [oats, kept] = next.changes[ids.Breakfast].items;
  assert.deepEqual([oats.label, oats.portion], ['Oats', 2]);
  assertTotals(oats, times(OATS_TOTALS, 2));
  assert.deepEqual(kept, apple);
  assert.equal(next.changes[ids.Lunch], day.changes[ids.Lunch]);
});

test('As planned takes a change off in either shape', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  let day = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  day = withChanges(day, { [ids.Lunch]: { mealId: RICE_BOWL.id, portion: 2 } });
  day = clearSlotChange(clearSlotChange(day, ids.Breakfast), ids.Lunch);
  assert.deepEqual(day.changes, {});
});

// --- dayPlan ---

test('each slot holds what the template plans, as day items, and the entries added to it', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  let day = addEntry(emptyDay(), foodEntry(slotNamed(doc, 'Lunch'), RICE, 100, 'g'));
  day = addEntry(day, foodEntry(OTHER, BANANA, 1, 'medium'));
  const plans = dayPlan(doc, day, getFood);
  assert.deepEqual(plans.map(({ name }) => name), ['Breakfast', 'Lunch', 'Dinner', 'Snack']);
  const [riceBeef, riceBowl, apple] = itemsOf(doc, 'Lunch');
  assert.deepEqual(planOf(plans, 'Lunch'), {
    id: ids.Lunch,
    name: 'Lunch',
    flex: false,
    budget: null,
    skipped: false,
    items: [
      mealDayItem(riceBeef.id, RICE_BEEF, getFood),
      mealDayItem(riceBowl.id, RICE_BOWL, getFood),
      foodDayItem(apple.id, APPLE, 1, 'medium'),
    ],
    ownVersion: false,
    entries: [day.entries[0]],
  });
  assert.deepEqual(planOf(plans, 'Dinner'), {
    id: ids.Dinner,
    name: 'Dinner',
    flex: true,
    budget: BUDGET,
    skipped: false,
    items: [],
    ownVersion: false,
    entries: [],
  });
});

test('a template change reaches a day with no version of its own, and not one that has one', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  const own = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  const breakfastOf = (changed, day, foods = getFood) => planOf(dayPlan(changed, day, foods), 'Breakfast').items;
  const ownBefore = breakfastOf(doc, own);

  // Oats made with 120 g of oats, and an apple planned at breakfast.
  let changed = updateMeal(doc, OATS.id, (saved) => updateItem(saved, 'oats', 120));
  changed = addPlannedFood(changed, ids.Breakfast, APPLE, 1, 'medium');
  const plain = breakfastOf(changed, emptyDay());
  assert.deepEqual(plain.map(({ label }) => label), ['Oats', 'Banana', 'Apple']);
  assertTotals(plain[0], times(OATS_TOTALS, 1.2));
  assert.deepEqual(breakfastOf(changed, own), ownBefore);

  // Oats deleted, and the banana's numbers changed.
  const deleted = deleteMeal(changed, OATS.id);
  const heavierBanana = foodLookup([...FOODS.filter(({ id }) => id !== 'banana'), { ...BANANA, kcal: 200 }]);
  const after = breakfastOf(deleted, emptyDay(), heavierBanana);
  assert.deepEqual(after.map(({ label }) => label), ['Banana', 'Apple']);
  assertTotals(after[0], { ...BANANA_TOTALS, kcal: 240 });
  assert.deepEqual(breakfastOf(deleted, own, heavierBanana), ownBefore);

  // Lunch has no version of its own that day, so it follows the template.
  const lunch = planOf(dayPlan(addPlannedFood(doc, ids.Lunch, APPLE, 1, 'medium'), own, getFood), 'Lunch');
  assert.equal(lunch.items.at(-1).qty, 2);
});

test('off plan ignores everything, and a flex slot ignores a leftover change', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  let day = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  day = skipPlannedSlot(day, ids.Lunch);
  day = addEntry(day, foodEntry(slotNamed(doc, 'Dinner'), BEEF, 150, 'g'));
  day = addEntry(day, foodEntry(OTHER, BANANA, 1, 'medium'));
  const offPlan = dayPlan(doc, { ...day, offPlan: true }, getFood);
  for (const plan of offPlan) {
    const { flex, budget, skipped, items, ownVersion } = plan;
    assert.deepEqual({ flex, budget, skipped, items, ownVersion }, { flex: true, budget: null, skipped: false, items: [], ownVersion: false }, plan.name);
  }
  assert.deepEqual(planOf(offPlan, 'Dinner').entries, [day.entries[0]]);

  // Changes left on Dinner, flex in the template, and on Snack, which has turned flex since.
  const [apple] = itemsOf(doc, 'Snack');
  day = swapPlannedItem(doc, emptyDay(), ids.Snack, apple.id, foodDayItem('picked', BANANA, 1, 'medium'), getFood);
  day = withChanges(day, { [ids.Dinner]: { items: [foodDayItem('x', BANANA, 1, 'medium')] } });
  const flexed = removeTemplateItem(doc, ids.Snack, apple.id);
  for (const name of ['Dinner', 'Snack']) {
    const { flex, skipped, items, ownVersion } = planOf(dayPlan(flexed, day, getFood), name);
    assert.deepEqual({ flex, skipped, items, ownVersion }, { flex: true, skipped: false, items: [], ownVersion: false }, name);
  }
  assert.deepEqual(planOf(dayPlan(flexed, day, getFood), 'Dinner').budget, BUDGET);
});

// --- A day's changes ---

test('a swap keeps its place and id, marked swapped, and the rest of the slot is copied as it was', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, foodDayItem('picked', APPLE, 1, 'medium'), getFood);
  const breakfast = planOf(dayPlan(doc, day, getFood), 'Breakfast');
  assert.deepEqual(breakfast.items, [mealDayItem(oats.id, OATS, getFood), swappedIn(banana.id, foodDayItem('picked', APPLE, 1, 'medium'))]);
  assertTotals(breakfast.items[1], APPLE_TOTALS);
  assert.deepEqual([breakfast.skipped, breakfast.ownVersion], [false, true]);
  assert.deepEqual(day.changes[ids.Breakfast], { items: breakfast.items });
});

test('quick numbers or another meal swapped in for a meal are new, so nothing of the old meal comes with them', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const breakfastSlot = slotNamed(doc, 'Breakfast');
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const edited = setItemIngredients(doc, emptyDay(), ids.Breakfast, oats.id, OATS_EDIT, getFood);
  const portioned = setItemPortion(doc, edited, ids.Breakfast, oats.id, 1.5, getFood);

  const quick = swapPlannedItem(doc, portioned, ids.Breakfast, oats.id, quickDayItem('picked', breakfastSlot, NUMBERS, 'Burrito place'), getFood);
  const [burrito] = planOf(dayPlan(doc, quick, getFood), 'Breakfast').items;
  assert.deepEqual(burrito, { id: oats.id, label: 'Burrito place', emoji: DEFAULT_EMOJI, ...NUMBERS, source: 'quick', swapped: true });
  const unlabelled = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, quickDayItem('picked', breakfastSlot, NUMBERS), getFood);
  assert.equal(planOf(dayPlan(doc, unlabelled, getFood), 'Breakfast').items[1].label, 'Breakfast');

  const riceBowl = swapPlannedItem(doc, portioned, ids.Breakfast, oats.id, mealDayItem('picked', RICE_BOWL, getFood), getFood);
  assert.deepEqual(planOf(dayPlan(doc, riceBowl, getFood), 'Breakfast').items[0], swappedIn(oats.id, mealDayItem('picked', RICE_BOWL, getFood)));
});

test('picking what the template plans there is the item as planned, unmarked, and a slot back to the template has no change', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const apple = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, foodDayItem('picked', APPLE, 1, 'medium'), getFood);
  const back = swapPlannedItem(doc, apple, ids.Breakfast, banana.id, foodDayItem('picked', BANANA, 1, 'medium'), getFood);
  assert.deepEqual(back.changes, {});
  // The same food at another amount is still a swap.
  const two = swapPlannedItem(doc, apple, ids.Breakfast, banana.id, foodDayItem('picked', BANANA, 2, 'medium'), getFood);
  assert.equal(planOf(dayPlan(doc, two, getFood), 'Breakfast').items[1].swapped, true);
  // Its own meal again is the meal as planned, at 1×; the banana's swap stays.
  let day = setItemPortion(doc, apple, ids.Breakfast, oats.id, 1.5, getFood);
  day = swapPlannedItem(doc, day, ids.Breakfast, oats.id, mealDayItem('picked', OATS, getFood), getFood);
  assert.deepEqual(day.changes[ids.Breakfast], apple.changes[ids.Breakfast]);
  // A portion back to 1× is as planned too.
  const portion = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  assert.deepEqual(setItemPortion(doc, portion, ids.Breakfast, oats.id, 1, getFood).changes, {});
});

test('a slot whose items come back to the template’s has no change, even with its keys stored in another order', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  // A sync that hands every object back with its keys reversed.
  const reversed = (value) =>
    JSON.parse(
      JSON.stringify(value, (key, each) =>
        each && typeof each === 'object' && !Array.isArray(each) ? Object.fromEntries(Object.entries(each).reverse()) : each,
      ),
    );
  const day = reversed(setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood));
  assert.deepEqual(setItemPortion(doc, day, ids.Breakfast, oats.id, 1, getFood).changes, {});
});

test('a portion and an ingredient change on one of two meals leave the other alone, and reset goes back to the meal as planned at 1×', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [riceBeef, riceBowl, apple] = itemsOf(doc, 'Lunch');
  const others = [mealDayItem(riceBowl.id, RICE_BOWL, getFood), foodDayItem(apple.id, APPLE, 1, 'medium')];
  const lunchOf = (day) => planOf(dayPlan(doc, day, getFood), 'Lunch');

  let day = setItemPortion(doc, emptyDay(), ids.Lunch, riceBeef.id, 1.5, getFood);
  let [first, ...rest] = lunchOf(day).items;
  assert.equal(first.portion, 1.5);
  assertTotals(first, times(RICE_BEEF_TOTALS, 1.5));
  assert.deepEqual(first.ingredients, mealIngredients(RICE_BEEF, getFood));
  assert.deepEqual(rest, others);

  // Edited at 1.5×: the amounts as eaten, the portion back to 1×, the meal as planned kept for reset.
  const eaten = setIngredientQty(scaleIngredients(first.ingredients, 1.5), 'beef', 100);
  day = setItemIngredients(doc, day, ids.Lunch, riceBeef.id, eaten, getFood);
  [first, ...rest] = lunchOf(day).items;
  assert.deepEqual([first.portion, first.ingredients, first.originalIngredients], [1, eaten, mealIngredients(RICE_BEEF, getFood)]);
  assertTotals(first, ingredientsTotals(eaten));
  assert.deepEqual(rest, others);
  // A second edit keeps the meal as planned.
  day = setItemIngredients(doc, day, ids.Lunch, riceBeef.id, removeIngredient(eaten, 'beef'), getFood);
  assert.deepEqual(lunchOf(day).items[0].originalIngredients, mealIngredients(RICE_BEEF, getFood));

  // Reset, with Rice bowl at 0.5×: Rice & beef is as planned, at 1×, and Rice bowl stays at 0.5×.
  day = setItemPortion(doc, day, ids.Lunch, riceBowl.id, 0.5, getFood);
  day = resetItemIngredients(doc, day, ids.Lunch, riceBeef.id, getFood);
  [first, ...rest] = lunchOf(day).items;
  assert.deepEqual(first, mealDayItem(riceBeef.id, RICE_BEEF, getFood));
  assert.equal(rest[0].portion, 0.5);
  // With nothing else changed, resetting the last change leaves no change.
  day = setItemPortion(doc, day, ids.Lunch, riceBowl.id, 1, getFood);
  assert.deepEqual(day.changes, {});
});

test('a meal swapped in and edited resets to the meal as swapped in, still swapped', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  let day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, oats.id, mealDayItem('picked', RICE_BOWL, getFood), getFood);
  day = setItemIngredients(doc, day, ids.Breakfast, oats.id, RICE_BOWL_EDIT, getFood);
  const [edited] = planOf(dayPlan(doc, day, getFood), 'Breakfast').items;
  assert.deepEqual([edited.label, edited.swapped, edited.ingredients], ['Rice bowl', true, RICE_BOWL_EDIT]);
  day = resetItemIngredients(doc, day, ids.Breakfast, oats.id, getFood);
  assert.deepEqual(planOf(dayPlan(doc, day, getFood), 'Breakfast').items[0], swappedIn(oats.id, mealDayItem('picked', RICE_BOWL, getFood)));
});

test('a portion and ingredients are only for a meal, a portion is above 0, and a meal keeps an ingredient', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  assert.throws(() => setItemPortion(doc, emptyDay(), ids.Breakfast, banana.id, 1.5, getFood), RangeError);
  assert.throws(() => setItemIngredients(doc, emptyDay(), ids.Breakfast, banana.id, OATS_EDIT, getFood), RangeError);
  assert.throws(() => resetItemIngredients(doc, emptyDay(), ids.Breakfast, banana.id, getFood), RangeError);
  for (const portion of [0, -1, NaN]) {
    assert.throws(() => setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, portion, getFood), RangeError);
  }
  assert.throws(() => setItemIngredients(doc, emptyDay(), ids.Breakfast, oats.id, [], getFood), RangeError);
  assert.throws(() => swapPlannedItem(doc, emptyDay(), ids.Breakfast, oats.id, null, getFood), RangeError);
});

test('an item that isn’t in the slot, or a slot that plans nothing, leaves the day as it was', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  const day = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  const apple = foodDayItem('picked', APPLE, 1, 'medium');
  assert.equal(swapPlannedItem(doc, day, ids.Breakfast, 'gone', apple, getFood), day);
  assert.equal(setItemPortion(doc, day, ids.Breakfast, 'gone', 2, getFood), day);
  assert.equal(removePlannedItem(doc, day, ids.Breakfast, 'gone', getFood), day);
  assert.equal(removePlannedItem(doc, day, ids.Dinner, oats.id, getFood), day);
  assert.equal(removePlannedItem(doc, day, 'no-such-slot', oats.id, getFood), day);
});

test('removing the last planned item skips the slot, and As planned brings the template back with the added entries kept', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [apple] = itemsOf(doc, 'Snack');
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const snackOf = (day) => planOf(dayPlan(doc, day, getFood), 'Snack');

  const added = addEntry(emptyDay(), foodEntry(slotNamed(doc, 'Snack'), BANANA, 1, 'medium'));
  let day = removePlannedItem(doc, added, ids.Snack, apple.id, getFood);
  assert.deepEqual(day.changes[ids.Snack], { skipped: true });
  const skipped = snackOf(day);
  assert.deepEqual([skipped.flex, skipped.skipped, skipped.items, skipped.entries], [false, true, [], added.entries]);
  day = clearSlotChange(day, ids.Snack);
  assert.deepEqual(snackOf(day).items, [foodDayItem(apple.id, APPLE, 1, 'medium')]);
  assert.deepEqual(snackOf(day).entries, added.entries);

  // One of two leaves the other; removing both skips the slot.
  day = removePlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, getFood);
  assert.deepEqual(planOf(dayPlan(doc, day, getFood), 'Breakfast').items, [mealDayItem(oats.id, OATS, getFood)]);
  day = removePlannedItem(doc, day, ids.Breakfast, oats.id, getFood);
  assert.deepEqual(day.changes[ids.Breakfast], { skipped: true });
});

test('Skip drops the day’s version, and a change on a skipped slot starts again from the template', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  let day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, foodDayItem('picked', APPLE, 1, 'medium'), getFood);
  day = skipPlannedSlot(day, ids.Breakfast);
  assert.deepEqual(day.changes[ids.Breakfast], { skipped: true });
  const skipped = planOf(dayPlan(doc, day, getFood), 'Breakfast');
  assert.deepEqual([skipped.skipped, skipped.ownVersion, skipped.items], [true, false, []]);

  day = setItemPortion(doc, day, ids.Breakfast, oats.id, 1.5, getFood);
  const [first, second] = planOf(dayPlan(doc, day, getFood), 'Breakfast').items;
  assert.equal(first.portion, 1.5);
  assert.deepEqual(second, foodDayItem(banana.id, BANANA, 1, 'medium'));
});
