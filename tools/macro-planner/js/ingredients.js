// Ingredient changes (SPEC §3.5): a day's own version of a meal, as a list of ingredients. Each is
// a snapshot of one food, { foodId, name, emoji, unit, qty, kcal, protein, fat, carbs }, its
// numbers for qty, so editing or deleting the food later never changes it, and a new amount
// rescales the numbers with no food lookup. Pure: no DOM, so it can be tested in Node.
// Each change returns a new list and leaves the one passed in as it was.

import { foodTotals, scaleTotals } from './calc.js';
import { convertAmount } from './portions.js';

// qty is in the ingredient's unit.
function assertQty(qty) {
  if (!Number.isFinite(qty) || qty <= 0) throw new RangeError(`Not a quantity above 0: ${qty}`);
}

// qty of food in unit, one of portions.js's foodUnits, or in the serving's unit without one, like
// a meal item's. The ingredient keeps that unit.
export function ingredient(food, qty, unit = food.serving.unit) {
  assertQty(qty);
  const { kcal, protein, fat, carbs } = foodTotals(food, qty, unit);
  return { foodId: food.id, name: food.name, emoji: food.emoji, unit, qty, kcal, protein, fat, carbs };
}

// Items, { foodId, qty, unit } like a meal's or a slot's planned foods (SPEC §3.4), as
// ingredients. getFood: saved-meals.js's foodLookup, archived foods included.
export function itemIngredients(items, getFood) {
  return items.map(({ foodId, qty, unit }) => {
    const food = getFood(foodId);
    if (!food) throw new RangeError(`Unknown food: ${foodId}`);
    return ingredient(food, qty, unit);
  });
}

export function mealIngredients(meal, getFood) {
  return itemIngredients(meal.items, getFood);
}

function rescale(item, qty) {
  assertQty(qty);
  return { ...item, qty, ...scaleTotals(item, qty / item.qty) };
}

// Every amount and its numbers times portion: 2 eggs at 1.5× are 3.
export function scaleIngredients(items, portion) {
  return items.map((item) => rescale(item, item.qty * portion));
}

export function setIngredientQty(items, foodId, qty) {
  return items.map((item) => (item.foodId === foodId ? rescale(item, qty) : item));
}

// food's ingredient at qty in another of its units, when the amount's unit is switched (DESIGN
// §10): 2 g after 2 cups. Its numbers rescale from its own through grams, so food is only asked
// what the units weigh, and the snapshot stays its own.
export function setIngredientUnit(items, food, qty, unit) {
  assertQty(qty);
  return items.map((item) =>
    item.foodId === food.id ? { ...rescale(item, convertAmount(food, qty, unit, item.unit)), qty, unit } : item,
  );
}

// Like saved-meals.js's addItem: a food that's already in the list gets the amount added to it,
// converted into the unit it's in.
export function addIngredient(items, food, qty, unit = food.serving.unit) {
  assertQty(qty);
  const existing = items.find((item) => item.foodId === food.id);
  if (existing) {
    return setIngredientQty(items, food.id, existing.qty + convertAmount(food, qty, unit, existing.unit));
  }
  return [...items, ingredient(food, qty, unit)];
}

// A meal keeps at least one ingredient (SPEC §3.5), but that's checked where the list is kept.
export function removeIngredient(items, foodId) {
  return items.filter((item) => item.foodId !== foodId);
}

// food takes foodId's place in the list, at qty in unit. A food that's already in the list gets
// the amount added to it where it is instead, like addIngredient, so it's still listed once.
export function swapIngredient(items, foodId, food, qty, unit = food.serving.unit) {
  assertQty(qty);
  if (food.id !== foodId && items.some((item) => item.foodId === food.id)) {
    return addIngredient(removeIngredient(items, foodId), food, qty, unit);
  }
  return items.map((item) => (item.foodId === foodId ? ingredient(food, qty, unit) : item));
}

// What a slot eats (SPEC §3.5): the day's ingredients, or else its meal's, at its portion.
// plan: one of slots.js's daySlots, with a meal.
export function slotIngredients(plan, getFood) {
  return scaleIngredients(plan.ingredients ?? mealIngredients(plan.meal, getFood), plan.portion);
}

// An amount as the Ingredients sheet's field and Today's slot row show it: as entered (SPEC
// §5.2), but without the float noise a portion can leave (2 × 1.1 is 2.2000000000000002), and in
// the plain digits custom-foods.js's parseAmount reads back.
export function amountText(qty) {
  return String(Number(qty.toPrecision(12)));
}
