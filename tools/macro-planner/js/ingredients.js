// Ingredient changes (SPEC §3.5): a day's own version of a meal, as a list of ingredients. Each is
// a snapshot of one food, { foodId, name, emoji, unit, qty, kcal, protein, fat, carbs }, its
// numbers for qty, so editing or deleting the food later never changes it, and a new amount
// rescales the numbers with no food lookup. Pure: no DOM, so it can be tested in Node.
// Each change returns a new list and leaves the one passed in as it was.

import { foodTotals, scaleTotals } from './calc.js';

// qty is in the food's serving unit, like a meal item's.
function assertQty(qty) {
  if (!Number.isFinite(qty) || qty <= 0) throw new RangeError(`Not a quantity above 0: ${qty}`);
}

export function ingredient(food, qty) {
  assertQty(qty);
  const { kcal, protein, fat, carbs } = foodTotals(food, qty);
  return { foodId: food.id, name: food.name, emoji: food.emoji, unit: food.serving.unit, qty, kcal, protein, fat, carbs };
}

// The meal's items as ingredients. getFood: saved-meals.js's foodLookup, archived foods included.
export function mealIngredients(meal, getFood) {
  return meal.items.map(({ foodId, qty }) => {
    const food = getFood(foodId);
    if (!food) throw new RangeError(`Unknown food: ${foodId}`);
    return ingredient(food, qty);
  });
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

// Like saved-meals.js's addItem: a food that's already in the list gets the amount added to it.
export function addIngredient(items, food, qty) {
  assertQty(qty);
  const existing = items.find((item) => item.foodId === food.id);
  if (existing) return setIngredientQty(items, food.id, existing.qty + qty);
  return [...items, ingredient(food, qty)];
}

// A meal keeps at least one ingredient (SPEC §3.5), but that's checked where the list is kept.
export function removeIngredient(items, foodId) {
  return items.filter((item) => item.foodId !== foodId);
}

// food takes foodId's place in the list, at qty. A food that's already in the list gets the
// amount added to it where it is instead, like addIngredient, so it's still listed once.
export function swapIngredient(items, foodId, food, qty) {
  assertQty(qty);
  if (food.id !== foodId && items.some((item) => item.foodId === food.id)) {
    return addIngredient(removeIngredient(items, foodId), food, qty);
  }
  return items.map((item) => (item.foodId === foodId ? ingredient(food, qty) : item));
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
