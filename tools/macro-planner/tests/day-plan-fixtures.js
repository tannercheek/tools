// Fixtures shared by the slot items tests (day-plan.test.js, day-plan-totals.test.js): foods,
// meals, a template saved before slots held items and one saved as items, and a set of days
// changed in the old shape, for checking the new model agrees with the old on the same data.

import assert from 'node:assert/strict';
import { OTHER, addEntry, createCoreDoc, emptyDay, foodEntry, quickEntry } from '../js/data.js';
import { addIngredient, itemIngredients, mealIngredients, setIngredientQty, swapIngredient } from '../js/ingredients.js';
import { addMeal, createMeal, deleteMeal, foodLookup } from '../js/saved-meals.js';
import { addPlannedFood, addPlannedMeal, addSlot, createSlot, setSlotBudget, slotItems } from '../js/slots.js';
import {
  oldShapeAddFood,
  oldShapeRemoveFood,
  oldShapeSetFoods,
  oldShapeSetIngredients,
  oldShapeSetMeal,
  oldShapeSetPortion,
  oldShapeSkip,
  oldShapeSwap,
  oldShapeSwapToEntry,
} from './old-slot-model-reference.js';

// Float math: compare to within a hair, not exactly.
export function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

export const KEYS = ['kcal', 'protein', 'fat', 'carbs'];
export const times = (totals, n) => Object.fromEntries(KEYS.map((key) => [key, totals[key] * n]));

// Test fixtures with made-up round numbers, not real nutrition data. The fruit are counted like
// bundled foods, per 100 g with a medium portion, so amounts can be in either unit.
export const per100g = (id, name, emoji, kcal, protein, fat, carbs) => ({ id, name, emoji, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
export const fruit = (medium, ...rest) => ({ ...per100g(...rest), grams: 100, portions: [{ unit: 'medium', grams: medium }] });
export const OATS_FOOD = per100g('oats', 'Oats', '🌾', 380, 13, 7, 68);
export const RICE = per100g('rice', 'Rice, white, cooked', '🍚', 130, 2.5, 0.3, 28);
export const BEEF = per100g('beef', 'Beef, ground, cooked', '🥩', 250, 26, 15, 0);
// 1 medium is 120 g.
export const BANANA = fruit(120, 'banana', 'Banana', '🍌', 90, 1, 0.5, 23);
// 1 medium is 180 g.
export const APPLE = fruit(180, 'apple', 'Apple', '🍎', 50, 0.3, 0.2, 14);
export const FOODS = [OATS_FOOD, RICE, BEEF, BANANA, APPLE];
export const getFood = foodLookup(FOODS);

export const BANANA_TOTALS = { kcal: 108, protein: 1.2, fat: 0.6, carbs: 27.6 };
export const APPLE_TOTALS = { kcal: 90, protein: 0.54, fat: 0.36, carbs: 25.2 };

export function meal(name, emoji, items) {
  return { ...createMeal({ name, emoji }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 100 g oats.
export const OATS = meal('Oats', '🥣', [['oats', 100]]);
export const OATS_TOTALS = { kcal: 380, protein: 13, fat: 7, carbs: 68 };
// 200 g rice + 150 g beef.
export const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);
export const RICE_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };
// 300 g rice.
export const RICE_BOWL = meal('Rice bowl', '🍙', [['rice', 300]]);

export const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };
export const NUMBERS = { kcal: 900, protein: 40, fat: 35, carbs: 100 };

// Oats with 80 g of oats and half a banana; Rice bowl with beef for its rice.
export const OATS_EDIT = addIngredient(setIngredientQty(mealIngredients(OATS, getFood), 'oats', 80), BANANA, 0.5, 'medium');
export const RICE_BOWL_EDIT = swapIngredient(mealIngredients(RICE_BOWL, getFood), 'rice', BEEF, 120, 'g');

// A first-run core doc with the three meals saved and a Snack slot added after Breakfast, Lunch and
// Dinner.
export function freshDoc() {
  const doc = [OATS, RICE_BEEF, RICE_BOWL].reduce((each, saved) => addMeal(each, saved), createCoreDoc('2026-10-15'));
  return addSlot(doc, createSlot('Snack'));
}

export const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
export const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);
export const planOf = (plans, name) => plans.find((plan) => plan.name === name);
export const itemsOf = (doc, name) => slotItems(doc.template[slotNamed(doc, name).id]);
export const withChanges = (day, changes) => ({ ...day, changes: { ...day.changes, ...changes } });

// The template as saved before slots held items: Breakfast plans Oats and 120 g of banana, Lunch
// Rice & beef, Snack 1 medium apple, and Dinner is flex with a pinned budget.
export function oldShapeDoc() {
  let doc = freshDoc();
  const ids = slotIds(doc);
  doc = oldShapeSetMeal(doc, ids.Breakfast, OATS.id);
  doc = oldShapeAddFood(doc, ids.Breakfast, BANANA, 120, 'g');
  doc = oldShapeSetMeal(doc, ids.Lunch, RICE_BEEF.id);
  doc = oldShapeAddFood(doc, ids.Snack, APPLE, 1, 'medium');
  return setSlotBudget(doc, ids.Dinner, BUDGET);
}

// The template saved as items: Breakfast plans Oats and a banana, Lunch Rice & beef, Rice bowl and
// an apple, Snack an apple, and Dinner is flex with a pinned budget.
export function itemsDoc() {
  let doc = freshDoc();
  const ids = slotIds(doc);
  doc = addPlannedMeal(doc, ids.Breakfast, OATS.id);
  doc = addPlannedFood(doc, ids.Breakfast, BANANA, 1, 'medium');
  doc = addPlannedMeal(doc, ids.Lunch, RICE_BEEF.id);
  doc = addPlannedMeal(doc, ids.Lunch, RICE_BOWL.id);
  doc = addPlannedFood(doc, ids.Lunch, APPLE, 1, 'medium');
  doc = addPlannedFood(doc, ids.Snack, APPLE, 1, 'medium');
  return setSlotBudget(doc, ids.Dinner, BUDGET);
}

// The template's planned foods in a slot as ingredients, what the old helpers changed for the day
// (the old reading of a fresh day: a slot's foods straight off the template).
export const plannedFoods = (doc, name) => itemIngredients(doc.template[slotNamed(doc, name).id].foods ?? [], getFood);
export const bananaForApple = (doc) => swapIngredient(plannedFoods(doc, 'Breakfast'), 'banana', APPLE, 1, 'medium');

// Each makes a day on oldShapeDoc with the old change helpers, or by hand where they can't make
// it, and returns { day }, with doc too when the template changed after the day's change.
export const OLD_SHAPE_DAYS = {
  'no change': () => ({ day: emptyDay() }),
  'a swap to a meal': (doc, ids) => ({ day: oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id) }),
  'a swap to a food': (doc, ids) => ({
    day: oldShapeSwapToEntry(emptyDay(), ids.Lunch, foodEntry(slotNamed(doc, 'Lunch'), APPLE, 2, 'medium')),
  }),
  'a swap to quick numbers': (doc, ids) => ({
    day: oldShapeSwapToEntry(emptyDay(), ids.Lunch, quickEntry(slotNamed(doc, 'Lunch'), NUMBERS, 'Burrito place')),
  }),
  'a swap to quick numbers with no label': (doc, ids) => ({
    day: oldShapeSwapToEntry(emptyDay(), ids.Lunch, quickEntry(slotNamed(doc, 'Lunch'), NUMBERS)),
  }),
  'a skip': (doc, ids) => ({ day: oldShapeSkip(emptyDay(), ids.Breakfast) }),
  'a portion': (doc, ids) => ({ day: oldShapeSetPortion(emptyDay(), ids.Breakfast, 1.5) }),
  'an ingredient change': (doc, ids) => ({ day: oldShapeSetIngredients(emptyDay(), ids.Breakfast, OATS.id, OATS_EDIT) }),
  'a planned food swapped': (doc, ids) => ({ day: oldShapeSetFoods(emptyDay(), ids.Breakfast, bananaForApple(doc)) }),
  'the planned food removed beside the meal': (doc, ids) => ({ day: oldShapeSetFoods(emptyDay(), ids.Breakfast, []) }),
  'a swap to a meal, its ingredients changed, then a portion': (doc, ids) => {
    let day = oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id);
    day = oldShapeSetIngredients(day, ids.Breakfast, RICE_BOWL.id, RICE_BOWL_EDIT);
    return { day: oldShapeSetPortion(day, ids.Breakfast, 0.5) };
  },
  'an ingredient change, then a portion': (doc, ids) => ({
    day: oldShapeSetPortion(oldShapeSetIngredients(emptyDay(), ids.Breakfast, OATS.id, OATS_EDIT), ids.Breakfast, 1.5),
  }),
  'a portion and a planned food swapped': (doc, ids) => ({
    day: oldShapeSetFoods(oldShapeSetPortion(emptyDay(), ids.Breakfast, 2), ids.Breakfast, bananaForApple(doc)),
  }),
  'a planned food swapped, then a swap to a food': (doc, ids) => ({
    day: oldShapeSwapToEntry(
      oldShapeSetFoods(emptyDay(), ids.Breakfast, bananaForApple(doc)),
      ids.Breakfast,
      foodEntry(slotNamed(doc, 'Breakfast'), RICE, 150, 'g'),
    ),
  }),
  'a planned food swapped on a skipped slot': (doc, ids) => ({
    day: oldShapeSetFoods(oldShapeSkip(emptyDay(), ids.Breakfast), ids.Breakfast, bananaForApple(doc)),
  }),
  'ingredients made on another meal': (doc, ids) => ({
    day: oldShapeSetIngredients(emptyDay(), ids.Breakfast, RICE_BOWL.id, RICE_BOWL_EDIT),
  }),
  'the template’s meal changed since, leaving an ingredient change behind': (doc, ids) => ({
    day: oldShapeSetPortion(oldShapeSetIngredients(emptyDay(), ids.Breakfast, OATS.id, OATS_EDIT), ids.Breakfast, 1.5),
    doc: oldShapeSetMeal(doc, ids.Breakfast, RICE_BOWL.id),
  }),
  'the template’s planned foods changed since': (doc, ids) => ({
    day: oldShapeSetFoods(emptyDay(), ids.Breakfast, bananaForApple(doc)),
    doc: oldShapeAddFood(oldShapeRemoveFood(doc, ids.Breakfast, 'banana'), ids.Breakfast, RICE, 50, 'g'),
  }),
  'a swap to a meal that’s since been deleted': (doc, ids) => {
    let day = oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id);
    day = oldShapeSetPortion(oldShapeSetIngredients(day, ids.Breakfast, RICE_BOWL.id, RICE_BOWL_EDIT), ids.Breakfast, 1.5);
    return { day, doc: deleteMeal(doc, RICE_BOWL.id) };
  },
  'the template’s meal deleted, leaving its planned foods': (doc, ids) => ({
    day: oldShapeSetPortion(oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id), ids.Breakfast, 1.5),
    doc: deleteMeal(doc, OATS.id),
  }),
  'a change left on a slot that’s since turned flex': (doc, ids) => ({
    day: oldShapeSetFoods(oldShapeSetPortion(emptyDay(), ids.Breakfast, 1.5), ids.Breakfast, bananaForApple(doc)),
    doc: oldShapeRemoveFood(oldShapeSetMeal(doc, ids.Breakfast, null), ids.Breakfast, 'banana'),
  }),
  'a swap, portion and ingredients left on a slot that plans only foods': (doc, ids) => ({
    day: withChanges(emptyDay(), {
      [ids.Snack]: { mealId: RICE_BOWL.id, portion: 2, ingredients: { mealId: RICE_BOWL.id, items: RICE_BOWL_EDIT } },
    }),
  }),
  'a swap to quick numbers left on a slot that plans only foods': (doc, ids) => ({
    day: withChanges(emptyDay(), { [ids.Snack]: { entry: quickEntry(slotNamed(doc, 'Snack'), NUMBERS) } }),
  }),
  'a change left on a flex slot': (doc, ids) => ({
    day: withChanges(emptyDay(), { [ids.Dinner]: { mealId: OATS.id, portion: 2 } }),
  }),
  'every kind at once, with entries': everyKindAtOnce,
  'off plan': (doc, ids) => {
    const { day } = everyKindAtOnce(doc, ids);
    return { day: { ...day, offPlan: true } };
  },
};

export function everyKindAtOnce(doc, ids) {
  let day = oldShapeSwap(emptyDay(), ids.Breakfast, RICE_BOWL.id, OATS.id);
  day = oldShapeSetFoods(oldShapeSetPortion(day, ids.Breakfast, 1.5), ids.Breakfast, bananaForApple(doc));
  day = oldShapeSwapToEntry(day, ids.Lunch, foodEntry(slotNamed(doc, 'Lunch'), APPLE, 2, 'medium'));
  day = oldShapeSetFoods(day, ids.Snack, swapIngredient(plannedFoods(doc, 'Snack'), 'apple', BANANA, 1, 'medium'));
  day = addEntry(day, foodEntry(slotNamed(doc, 'Lunch'), RICE, 100, 'g'));
  day = addEntry(day, foodEntry(slotNamed(doc, 'Dinner'), BEEF, 150, 'g'));
  return { day: addEntry(day, foodEntry(OTHER, BANANA, 1, 'medium')) };
}
