// A frozen copy of the slot model as it stood before PLAN 14.11-14.19 (the mealId/foods template,
// daySlots, and the day-change helpers), kept only so the agreement tests can build old-shape
// fixtures and check that day-plan.js's model still reads them exactly as SPEC §3.5 describes.
// The real implementation was retired from slots.js and calc.js in 14.19; nothing here is used by
// the app. Don't add to this file for new work — it exists purely as a regression reference.

import { entriesTotals, ingredientsTotals, mealTotals, scaleTotals } from '../js/calc.js';
import { itemIngredients } from '../js/ingredients.js';
import { addItem, removeItem, updateItem } from '../js/saved-meals.js';

function oldSlot(doc, slotId) {
  return doc.template?.[slotId] ?? { mealId: null, budget: null };
}

export function oldShapeSetMeal(doc, slotId, mealId) {
  return { ...doc, template: { ...doc.template, [slotId]: { ...oldSlot(doc, slotId), mealId } } };
}

function oldShapeChangeFoods(doc, slotId, change) {
  const slot = oldSlot(doc, slotId);
  const { items } = change({ items: slot.foods ?? [] });
  return { ...doc, template: { ...doc.template, [slotId]: { ...slot, foods: items } } };
}

export function oldShapeAddFood(doc, slotId, food, qty, unit) {
  return oldShapeChangeFoods(doc, slotId, (list) => addItem(list, food, qty, unit));
}

export function oldShapeUpdateFood(doc, slotId, foodId, qty, unit) {
  return oldShapeChangeFoods(doc, slotId, (list) => updateItem(list, foodId, qty, unit));
}

export function oldShapeRemoveFood(doc, slotId, foodId) {
  return oldShapeChangeFoods(doc, slotId, (list) => removeItem(list, foodId));
}

export function oldShapeTemplateSlots(doc) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  return (doc.slots ?? []).map((slot) => {
    const meal = meals.get(doc.template?.[slot.id]?.mealId) ?? null;
    const foods = doc.template?.[slot.id]?.foods ?? [];
    return { ...slot, meal, foods, flex: !meal && foods.length === 0 };
  });
}

export function oldShapeDaySlots(doc, day, getFood) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  const unchanged = { portion: 1, swapped: false, skipped: false, edited: false, ingredients: null, swapEntry: null };
  return oldShapeTemplateSlots(doc).map((slot) => {
    const entries = (day.entries ?? []).filter((entry) => entry.slotId === slot.id);
    if (day.offPlan) return { ...slot, ...unchanged, flex: true, meal: null, foods: [], budget: null, entries };
    if (slot.flex) {
      const budget = doc.template?.[slot.id]?.budget ?? null;
      return { ...slot, ...unchanged, budget, entries };
    }
    const change = day.changes?.[slot.id] ?? {};
    const skipped = Object.hasOwn(change, 'mealId') && change.mealId === null;
    const foods = skipped ? [] : (change.foods ?? itemIngredients(slot.foods, getFood));
    const planned = { ...slot, ...unchanged, skipped, foods, budget: null, entries };
    if (!slot.meal) return planned;
    if (change.entry) return { ...planned, swapped: true, swapEntry: change.entry };
    const swap = meals.get(change.mealId);
    const swapped = Boolean(swap) && swap.id !== slot.meal.id;
    const meal = swapped ? swap : slot.meal;
    const edit = change.ingredients;
    const edited = !skipped && edit?.mealId === meal.id && edit.items?.length > 0;
    return {
      ...planned,
      meal,
      portion: change.portion ?? 1,
      swapped,
      edited,
      ingredients: edited ? edit.items : null,
    };
  });
}

function oldShapeWithChange(day, slotId, change) {
  const changes = { ...day.changes };
  if (Object.keys(change).length === 0) delete changes[slotId];
  else changes[slotId] = change;
  return { ...day, changes };
}

export function oldShapeSkip(day, slotId) {
  return oldShapeWithChange(day, slotId, { mealId: null });
}

export function oldShapeSetPortion(day, slotId, portion) {
  if (!Number.isFinite(portion) || portion <= 0) throw new RangeError(`Not a portion above 0: ${portion}`);
  const { mealId, entry, ...rest } = day.changes?.[slotId] ?? {};
  const change = { ...rest, portion };
  if (mealId) change.mealId = mealId;
  if (portion === 1) delete change.portion;
  return oldShapeWithChange(day, slotId, change);
}

export function oldShapeSwap(day, slotId, mealId, plannedMealId) {
  if (!mealId) throw new RangeError('A swap needs a meal');
  const change = { ...day.changes?.[slotId] };
  delete change.mealId;
  delete change.ingredients;
  delete change.entry;
  if (mealId !== plannedMealId) change.mealId = mealId;
  return oldShapeWithChange(day, slotId, change);
}

export function oldShapeSwapToEntry(day, slotId, entry) {
  if (!entry) throw new RangeError('A swap needs a food or quick numbers');
  const { foods } = day.changes?.[slotId] ?? {};
  return oldShapeWithChange(day, slotId, foods ? { entry, foods } : { entry });
}

export function oldShapeSetIngredients(day, slotId, mealId, items) {
  if (!mealId) throw new RangeError('Ingredients need the meal they were made on');
  if (!items?.length) throw new RangeError('A meal keeps at least one ingredient');
  const { mealId: swap, foods } = day.changes?.[slotId] ?? {};
  const change = { ingredients: { mealId, items } };
  if (swap) change.mealId = swap;
  if (foods) change.foods = foods;
  return oldShapeWithChange(day, slotId, change);
}

export function oldShapeSetFoods(day, slotId, foods) {
  if (!Array.isArray(foods)) throw new RangeError('Planned foods for the day need a list');
  return oldShapeWithChange(day, slotId, { ...day.changes?.[slotId], foods });
}

export function oldShapeResetIngredients(day, slotId) {
  const { ingredients, portion, ...rest } = day.changes?.[slotId] ?? {};
  return oldShapeWithChange(day, slotId, rest);
}

export function oldShapeClearChange(day, slotId) {
  return oldShapeWithChange(day, slotId, {});
}

// --- Totals over the old plan shape (calc.js's retired slotMealTotals, slotTotals, dayTotal,
// flexGap), built from the totals helpers calc.js still has (mealTotals, scaleTotals, etc). ---

const TOTAL_KEYS = ['kcal', 'protein', 'fat', 'carbs'];

function oldSumTotals(list) {
  const sum = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  for (const totals of list) {
    for (const key of TOTAL_KEYS) sum[key] += totals[key];
  }
  return sum;
}

export function oldShapeSlotMealTotals(plan, getFood) {
  const meal = plan.ingredients ? ingredientsTotals(plan.ingredients) : mealTotals(plan.meal, getFood);
  return scaleTotals(meal, plan.portion);
}

export function oldShapeSlotTotals(plan, getFood) {
  if (plan.skipped) return oldSumTotals([]);
  const foods = ingredientsTotals(plan.foods);
  if (plan.swapEntry) return oldSumTotals([plan.swapEntry, foods]);
  if (plan.meal) return oldSumTotals([oldShapeSlotMealTotals(plan, getFood), foods]);
  if (!plan.flex) return foods;
  const open = plan.entries.length === 0;
  return open && plan.budget ? oldSumTotals([plan.budget]) : oldSumTotals([]);
}

export function oldShapeDayTotal(day, plans, getFood) {
  const entries = entriesTotals(day.entries);
  if (day.offPlan || day.locked) return entries;
  return oldSumTotals([...plans.map((plan) => oldShapeSlotTotals(plan, getFood)), entries]);
}

function oldDisplayRemaining(target, eaten) {
  const left = Math.round(target) - Math.round(eaten);
  return { amount: Math.abs(left), over: left < 0 };
}

export function oldShapeFlexGap(targetValues, day, plans, slotId, getFood) {
  if (!targetValues) return null;
  const others = plans.filter((plan) => plan.id !== slotId);
  const entries = (day.entries ?? []).filter((entry) => entry.slotId !== slotId);
  const rest = oldShapeDayTotal({ ...day, entries }, others, getFood);
  return Object.fromEntries(TOTAL_KEYS.map((key) => [key, oldDisplayRemaining(targetValues[key], rest[key])]));
}
