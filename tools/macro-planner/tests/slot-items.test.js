import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportDocs, importDocs, readBackup } from '../js/backup.js';
import { addCustomFood, createCustomFood, deleteCustomFood, isFoodInUse } from '../js/custom-foods.js';
import { DAYS_DOC_ID, WEIGHT_DOC_ID, createCoreDoc, createWeightLog } from '../js/data.js';
import { addMeal, createMeal, deleteMeal, foodLookup } from '../js/saved-meals.js';
import {
  addPlannedFood,
  addPlannedMeal,
  addSlot,
  createSlot,
  planSlots,
  removePlannedItem,
  replacePlannedItem,
  setSlotBudget,
  slotItems,
} from '../js/slots.js';
import { CORE_DOC_ID, createLocalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';
import { oldShapeAddFood, oldShapeSetMeal } from './old-slot-model-reference.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Test fixtures with made-up round numbers, not real nutrition data. The fruit are counted like
// bundled foods, per 100 g with a medium portion, so amounts can be in either unit.
const per100g = (id, name, emoji, kcal, protein, fat, carbs) => ({ id, name, emoji, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const fruit = (medium, ...rest) => ({ ...per100g(...rest), grams: 100, portions: [{ unit: 'medium', grams: medium }] });
const OATS_FOOD = per100g('oats', 'Oats', '🌾', 380, 13, 7, 68);
const RICE = per100g('rice', 'Rice, white, cooked', '🍚', 130, 2.5, 0.3, 28);
// 1 medium is 120 g.
const BANANA = fruit(120, 'banana', 'Banana', '🍌', 90, 1, 0.5, 23);
// 1 medium is 180 g.
const APPLE = fruit(180, 'apple', 'Apple', '🍎', 50, 0.3, 0.2, 14);
const FOODS = [OATS_FOOD, RICE, BANANA, APPLE];
const getFood = foodLookup(FOODS);

function meal(name, emoji, items) {
  return { ...createMeal({ name, emoji }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

const OATS = meal('Oats', '🥣', [['oats', 100]]);
const RICE_BOWL = meal('Rice bowl', '🍙', [['rice', 300]]);
const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

// A first-run core doc with both meals saved and a Snack slot added after Breakfast, Lunch and
// Dinner.
function freshDoc() {
  return addSlot(addMeal(addMeal(createCoreDoc('2026-10-15'), OATS), RICE_BOWL), createSlot('Snack'));
}

const slotId = (doc, name) => doc.slots.find((slot) => slot.name === name).id;
const planOf = (doc, name, foods = getFood) => planSlots(doc, foods).find((slot) => slot.name === name);
// What each item plans, without its id, so tests can compare lists across a uuid.
const planned = (items) => items.map(({ id, ...item }) => item);

// The live shape 14.8 saves: Breakfast plans Oats and a banana, Snack plans 1 medium apple only,
// Lunch plans Rice bowl only, Dinner is flex with a pinned budget.
function oldShapeDoc() {
  let doc = freshDoc();
  doc = oldShapeSetMeal(doc, slotId(doc, 'Breakfast'), OATS.id);
  doc = oldShapeAddFood(doc, slotId(doc, 'Breakfast'), BANANA, 120, 'g');
  doc = oldShapeAddFood(doc, slotId(doc, 'Snack'), APPLE, 1, 'medium');
  doc = oldShapeSetMeal(doc, slotId(doc, 'Lunch'), RICE_BOWL.id);
  doc = setSlotBudget(doc, slotId(doc, 'Dinner'), BUDGET);
  return doc;
}

// --- Reading a slot ---

test('a slot saved as mealId and foods reads as items, the meal first, with the same ids every time', () => {
  const doc = oldShapeDoc();
  const breakfast = doc.template[slotId(doc, 'Breakfast')];
  assert.deepEqual(slotItems(breakfast), [
    { id: `meal-${OATS.id}`, mealId: OATS.id },
    { id: 'food-banana', foodId: 'banana', qty: 120, unit: 'g' },
  ]);
  assert.deepEqual(slotItems(breakfast), slotItems(structuredClone(breakfast)));
  assert.deepEqual(slotItems(doc.template[slotId(doc, 'Snack')]), [{ id: 'food-apple', foodId: 'apple', qty: 1, unit: 'medium' }]);
});

test('a first-run slot, a slot with no template entry and an empty items list plan nothing', () => {
  const doc = freshDoc();
  assert.deepEqual(slotItems(doc.template[slotId(doc, 'Lunch')]), []);
  assert.deepEqual(slotItems(undefined), []);
  assert.deepEqual(slotItems({ items: [], budget: null }), []);
});

test('a slot with items ignores mealId and foods, even when its list is empty', () => {
  const both = { items: [{ id: 'a', foodId: 'apple', qty: 1, unit: 'medium' }], mealId: OATS.id, foods: [{ foodId: 'banana', qty: 1, unit: 'medium' }] };
  assert.deepEqual(slotItems(both), both.items);
  assert.deepEqual(slotItems({ items: [], mealId: OATS.id, budget: null }), []);
});

test('a doc with no slots yet plans nothing', () => {
  assert.deepEqual(planSlots({}, getFood), []);
});

test('planSlots resolves each item, in order, and gives a flex slot its pinned budget', () => {
  const doc = oldShapeDoc();
  const breakfast = planOf(doc, 'Breakfast');
  assert.equal(breakfast.flex, false);
  assert.equal(breakfast.budget, null);
  assert.deepEqual(breakfast.items, [
    { id: `meal-${OATS.id}`, mealId: OATS.id, meal: OATS },
    { id: 'food-banana', foodId: 'banana', qty: 120, unit: 'g', food: BANANA },
  ]);
  const dinner = planOf(doc, 'Dinner');
  assert.equal(dinner.flex, true);
  assert.deepEqual(dinner.items, []);
  assert.deepEqual(dinner.budget, BUDGET);
});

test('a pinned budget on a planned slot doesn’t count, and is back when the slot is flex again', () => {
  let doc = freshDoc();
  doc = setSlotBudget(doc, slotId(doc, 'Snack'), BUDGET);
  doc = addPlannedFood(doc, slotId(doc, 'Snack'), BANANA, 1, 'medium');
  assert.equal(planOf(doc, 'Snack').budget, null);
  const [banana] = slotItems(doc.template[slotId(doc, 'Snack')]);
  assert.deepEqual(planOf(removePlannedItem(doc, slotId(doc, 'Snack'), banana.id), 'Snack').budget, BUDGET);
});

test('a planned meal that’s since been deleted is left out, and a slot with nothing else left is flex', () => {
  let doc = freshDoc();
  doc = addPlannedMeal(doc, slotId(doc, 'Lunch'), RICE_BOWL.id);
  doc = addPlannedFood(doc, slotId(doc, 'Lunch'), APPLE, 1, 'medium');
  doc = addPlannedMeal(doc, slotId(doc, 'Dinner'), RICE_BOWL.id);
  doc = deleteMeal(doc, RICE_BOWL.id);
  assert.deepEqual(planned(planOf(doc, 'Lunch').items), [{ foodId: 'apple', qty: 1, unit: 'medium', food: APPLE }]);
  assert.equal(planOf(doc, 'Lunch').flex, false);
  assert.deepEqual(planOf(doc, 'Dinner').items, []);
  assert.equal(planOf(doc, 'Dinner').flex, true);
});

test('planSlots throws on a food that can’t be found, as a meal’s totals do', () => {
  const fresh = freshDoc();
  const doc = addPlannedFood(fresh, slotId(fresh, 'Snack'), BANANA, 1, 'medium');
  assert.throws(() => planSlots(doc, foodLookup([])), /Unknown food: banana/);
});

// --- Changing the template ---

test('a written slot has items and no mealId or foods, keeps its budget, and the doc passed in is unchanged', () => {
  const doc = oldShapeDoc();
  const before = structuredClone(doc);
  const breakfastId = slotId(doc, 'Breakfast');
  const next = addPlannedFood(doc, breakfastId, APPLE, 1, 'medium');
  const slot = next.template[breakfastId];
  assert.deepEqual(Object.keys(slot).sort(), ['budget', 'items']);
  assert.deepEqual(slot.items.slice(0, 2), slotItems(doc.template[breakfastId]));
  assert.match(slot.items[2].id, UUID);
  assert.deepEqual(doc, before);
  // Other slots aren't rewritten.
  assert.equal(next.template[slotId(doc, 'Lunch')], doc.template[slotId(doc, 'Lunch')]);

  const dinnerId = slotId(doc, 'Dinner');
  const withMeal = addPlannedMeal(doc, dinnerId, OATS.id);
  assert.deepEqual(withMeal.template[dinnerId].budget, BUDGET);
  assert.equal(Object.hasOwn(withMeal.template[dinnerId], 'mealId'), false);
});

test('adding a meal plans it once, after what’s there', () => {
  let doc = freshDoc();
  const lunchId = slotId(doc, 'Lunch');
  doc = addPlannedFood(doc, lunchId, APPLE, 1, 'medium');
  doc = addPlannedMeal(doc, lunchId, RICE_BOWL.id);
  assert.deepEqual(planned(doc.template[lunchId].items), [{ foodId: 'apple', qty: 1, unit: 'medium' }, { mealId: RICE_BOWL.id }]);
  assert.match(doc.template[lunchId].items[1].id, UUID);
  assert.equal(addPlannedMeal(doc, lunchId, RICE_BOWL.id), doc);
  assert.throws(() => addPlannedMeal(doc, lunchId, null), RangeError);
});

test('adding a meal already planned the old way leaves it once', () => {
  const doc = oldShapeDoc();
  assert.equal(addPlannedMeal(doc, slotId(doc, 'Breakfast'), OATS.id), doc);
});

test('adding a food twice adds up its amount in its unit, as one item', () => {
  let doc = freshDoc();
  const snackId = slotId(doc, 'Snack');
  doc = addPlannedFood(doc, snackId, BANANA, 1, 'medium');
  const [first] = doc.template[snackId].items;
  doc = addPlannedFood(doc, snackId, BANANA, 60, 'g');
  assert.deepEqual(doc.template[snackId].items, [{ ...first, qty: 1.5 }]);
  // A food planned the old way keeps its made-up id and its unit.
  const old = oldShapeDoc();
  const next = addPlannedFood(old, slotId(old, 'Breakfast'), BANANA, 1, 'medium');
  assert.deepEqual(next.template[slotId(old, 'Breakfast')].items[1], { id: 'food-banana', foodId: 'banana', qty: 240, unit: 'g' });
});

test('adding a food checks its amount and unit, as in a meal', () => {
  const doc = freshDoc();
  assert.throws(() => addPlannedFood(doc, slotId(doc, 'Snack'), BANANA, 0, 'g'), RangeError);
  assert.throws(() => addPlannedFood(doc, slotId(doc, 'Snack'), BANANA, 1, 'cup'), RangeError);
  // Without a unit, it's the serving's.
  const next = addPlannedFood(doc, slotId(doc, 'Snack'), RICE, 150);
  assert.deepEqual(planned(next.template[slotId(doc, 'Snack')].items), [{ foodId: 'rice', qty: 150, unit: 'g' }]);
});

test('removing an item keeps the others in order, and removing the last makes the slot flex, its budget kept', () => {
  const doc = oldShapeDoc();
  const breakfastId = slotId(doc, 'Breakfast');
  const noOats = removePlannedItem(doc, breakfastId, `meal-${OATS.id}`);
  assert.deepEqual(noOats.template[breakfastId].items, [{ id: 'food-banana', foodId: 'banana', qty: 120, unit: 'g' }]);
  assert.equal(planOf(noOats, 'Breakfast').flex, false);

  let snack = setSlotBudget(doc, slotId(doc, 'Snack'), BUDGET);
  snack = removePlannedItem(snack, slotId(doc, 'Snack'), 'food-apple');
  assert.deepEqual(snack.template[slotId(doc, 'Snack')], { budget: BUDGET, items: [] });
  assert.equal(planOf(snack, 'Snack').flex, true);
  assert.deepEqual(planOf(snack, 'Snack').budget, BUDGET);

  assert.equal(removePlannedItem(doc, breakfastId, 'not-there'), doc);
});

test('replacePlannedItem puts a meal or a food in the item’s place, as a new item', () => {
  let doc = freshDoc();
  const lunchId = slotId(doc, 'Lunch');
  doc = addPlannedMeal(doc, lunchId, OATS.id);
  doc = addPlannedFood(doc, lunchId, BANANA, 1, 'medium');
  doc = addPlannedFood(doc, lunchId, APPLE, 1, 'medium');
  const [oats, banana, apple] = doc.template[lunchId].items;

  const toMeal = replacePlannedItem(doc, lunchId, oats.id, { mealId: RICE_BOWL.id });
  const [placed] = toMeal.template[lunchId].items;
  assert.deepEqual(toMeal.template[lunchId].items.slice(1), [banana, apple]);
  assert.deepEqual(planned([placed]), [{ mealId: RICE_BOWL.id }]);
  assert.match(placed.id, UUID);
  assert.notEqual(placed.id, oats.id);

  const toFood = replacePlannedItem(doc, lunchId, banana.id, { food: RICE, qty: 150, unit: 'g' });
  assert.deepEqual(planned(toFood.template[lunchId].items), [{ mealId: OATS.id }, { foodId: 'rice', qty: 150, unit: 'g' }, { foodId: 'apple', qty: 1, unit: 'medium' }]);

  // A food can take a meal's place, and a meal a food's.
  const mealToFood = replacePlannedItem(doc, lunchId, oats.id, { food: RICE, qty: 150 });
  assert.deepEqual(planned(mealToFood.template[lunchId].items)[0], { foodId: 'rice', qty: 150, unit: 'g' });
  const foodToMeal = replacePlannedItem(doc, lunchId, apple.id, { mealId: RICE_BOWL.id });
  assert.deepEqual(planned(foodToMeal.template[lunchId].items)[2], { mealId: RICE_BOWL.id });
});

test('replacePlannedItem with a meal already elsewhere in the slot leaves it there once, and the item leaves', () => {
  const doc = oldShapeDoc();
  const breakfastId = slotId(doc, 'Breakfast');
  const next = replacePlannedItem(doc, breakfastId, 'food-banana', { mealId: OATS.id });
  assert.deepEqual(next.template[breakfastId].items, [{ id: `meal-${OATS.id}`, mealId: OATS.id }]);
});

test('replacePlannedItem with a food already elsewhere in the slot adds the amount there, in its unit, and the item leaves', () => {
  let doc = freshDoc();
  const snackId = slotId(doc, 'Snack');
  doc = addPlannedFood(doc, snackId, APPLE, 1, 'medium');
  doc = addPlannedFood(doc, snackId, BANANA, 120, 'g');
  doc = addPlannedFood(doc, snackId, RICE, 100, 'g');
  const [apple, banana, rice] = doc.template[snackId].items;
  const next = replacePlannedItem(doc, snackId, apple.id, { food: BANANA, qty: 1, unit: 'medium' });
  assert.deepEqual(next.template[snackId].items, [{ ...banana, qty: 240 }, rice]);
});

test('replacePlannedItem with the item’s own meal changes nothing, and its own food takes the new amount', () => {
  const doc = oldShapeDoc();
  const breakfastId = slotId(doc, 'Breakfast');
  assert.equal(replacePlannedItem(doc, breakfastId, `meal-${OATS.id}`, { mealId: OATS.id }), doc);
  const next = replacePlannedItem(doc, breakfastId, 'food-banana', { food: BANANA, qty: 2, unit: 'medium' });
  assert.deepEqual(planned(next.template[breakfastId].items), [{ mealId: OATS.id }, { foodId: 'banana', qty: 2, unit: 'medium' }]);
});

test('replacePlannedItem checks the food’s amount and unit, and ignores an item that isn’t there', () => {
  const doc = oldShapeDoc();
  const breakfastId = slotId(doc, 'Breakfast');
  assert.throws(() => replacePlannedItem(doc, breakfastId, 'food-banana', { food: APPLE, qty: -1, unit: 'g' }), RangeError);
  assert.throws(() => replacePlannedItem(doc, breakfastId, 'food-banana', { food: APPLE, qty: 1, unit: 'slice' }), RangeError);
  assert.equal(replacePlannedItem(doc, breakfastId, 'not-there', { mealId: RICE_BOWL.id }), doc);
});

// --- Custom foods ---

test('deleting a custom food planned in either shape archives it, and the slot still resolves it', () => {
  const bar = createCustomFood({ name: 'Protein bar', serving: { qty: 1, unit: 'bar' }, emoji: '🍫', kcal: 200, protein: 20, fat: 7, carbs: 22 });
  const base = addCustomFood(freshDoc(), bar);
  const snackId = slotId(base, 'Snack');
  const asItems = addPlannedFood(base, snackId, bar, 1);
  const asFoods = oldShapeAddFood(base, snackId, bar, 1);
  assert.ok(asItems.template[snackId].items);
  assert.ok(asFoods.template[snackId].foods);
  for (const doc of [asItems, asFoods]) {
    assert.equal(isFoodInUse(doc, bar.id), true);
    const deleted = deleteCustomFood(doc, bar.id);
    assert.deepEqual(deleted.foods, [{ ...bar, archived: true }]);
    const [item] = planOf(deleted, 'Snack', foodLookup([...FOODS, ...deleted.foods])).items;
    assert.equal(item.food.archived, true);
  }
  // Once it's no longer planned, deleting it removes it.
  const [item] = asItems.template[snackId].items;
  const unplanned = removePlannedItem(asItems, snackId, item.id);
  assert.equal(isFoodInUse(unplanned, bar.id), false);
  assert.deepEqual(deleteCustomFood(unplanned, bar.id).foods, []);
});

test('a slot with items ignores an old foods list when checking if a food is in use', () => {
  const doc = freshDoc();
  const snackId = slotId(doc, 'Snack');
  const stale = { ...doc, template: { ...doc.template, [snackId]: { items: [], foods: [{ foodId: 'custom-x', qty: 1 }], budget: null } } };
  assert.equal(isFoodInUse(stale, 'custom-x'), false);
});

// --- Export and import ---

async function exportAndImport(core) {
  const from = createLocalStore(createFakeStorage());
  await from.save(CORE_DOC_ID, core);
  await from.save(DAYS_DOC_ID, {});
  await from.save(WEIGHT_DOC_ID, createWeightLog());
  const file = JSON.stringify(await exportDocs(from, new Date('2026-10-20T09:30:00Z')));
  const to = createLocalStore(createFakeStorage());
  await importDocs(to, readBackup(file), '2026-10-20', FOODS);
  return to.load(CORE_DOC_ID);
}

test('an old backup imports and reads as before', async () => {
  const doc = oldShapeDoc();
  const imported = await exportAndImport(doc);
  assert.deepEqual(imported.template, doc.template);
  assert.deepEqual(planSlots(imported, getFood), planSlots(doc, getFood));
});

test('export and import carry a slot’s items', async () => {
  let doc = freshDoc();
  doc = addPlannedMeal(doc, slotId(doc, 'Lunch'), RICE_BOWL.id);
  doc = addPlannedFood(doc, slotId(doc, 'Lunch'), APPLE, 1, 'medium');
  const imported = await exportAndImport(doc);
  assert.deepEqual(imported.template[slotId(doc, 'Lunch')], doc.template[slotId(doc, 'Lunch')]);
  assert.deepEqual(planSlots(imported, getFood), planSlots(doc, getFood));
});
