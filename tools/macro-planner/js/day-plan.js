// A day's plan on the slot items model (SPEC §3.4, §3.5): what each slot holds on a day, and the
// day's changes to its planned items. Pure: no DOM, so it can be tested in Node.
//
// A day's change for a slot is { skipped: true }, or { items }, the day's own version of the
// slot's planned items: data.js's day items, each a snapshot, so a later change to the template, a
// meal or a food doesn't reach it. A change saved before slots held items (mealId, portion,
// ingredients, entry, foods) reads as the version it describes, and is written in the new shape
// the next time the slot is changed. As planned is slots.js's clearSlotChange, which takes either
// shape off.

import { ingredientsTotals, scaleTotals } from './calc.js';
import { foodDayItem, ingredientDayItem, mealDayItem, swappedIn } from './data.js';
import { planSlots } from './slots.js';

const mealsById = (doc) => new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));

// The template's planned items in a slot as day items, as they are now. slot: one of slots.js's
// planSlots.
function plannedItems(slot, getFood) {
  return slot.items.map((item) =>
    item.meal ? mealDayItem(item.id, item.meal, getFood) : foodDayItem(item.id, item.food, item.qty, item.unit),
  );
}

// A meal day item eaten at portion: its numbers are its ingredients' total at the portion. The
// ingredients stay at 1×.
function atPortion(item, portion) {
  return { ...item, ...scaleTotals(ingredientsTotals(item.ingredients), portion), portion };
}

// Whether two day items, or lists of them, are the same snapshot. Keys are compared in sorted
// order, since a stored day can come back from sync with its keys in another order.
function sameSnapshot(a, b) {
  const sorted = (key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))
      : value;
  return JSON.stringify(a, sorted) === JSON.stringify(b, sorted);
}

// --- Changes saved before slots held items ---
// Each was made on a slot planning one meal, then its planned foods, so it reads as that: the
// slot's first meal with the change's swap, portion and ingredients, then the change's planned
// foods, or else the template's.

// The slot's meal as the change has it. A food or quick numbers swapped in is its entry, without
// the entry's own id and slot. A swap to a meal that's since been deleted falls back to the planned
// meal, and ingredients count only on the meal they were made on, kept with the meal as it is now
// for reset.
function oldShapeMeal(change, item, meals, getFood) {
  if (change.entry) {
    const { id, slotId, slotName, ...entry } = change.entry;
    return swappedIn(item.id, entry);
  }
  const swap = meals.get(change.mealId);
  const swapped = Boolean(swap) && swap.id !== item.mealId;
  const meal = mealDayItem(item.id, swapped ? swap : item.meal, getFood);
  const edit = change.ingredients;
  const edited = edit?.mealId === meal.mealId && edit.items?.length > 0;
  const eaten = edited ? { ...meal, ingredients: edit.items, originalIngredients: meal.ingredients } : meal;
  const portioned = atPortion(eaten, change.portion ?? 1);
  return swapped ? swappedIn(item.id, portioned) : portioned;
}

// The day's planned foods were kept as ingredients, without ids. Each takes the id of the
// template's planned food for the same food, or, for one swapped in, an id made from its food, as
// slots.js's slotItems makes them. It isn't marked swapped: lock-in wrote it as planned.
function oldShapeFoods(foods, plannedFoods) {
  const ids = new Map(plannedFoods.map((item) => [item.foodId, item.id]));
  return foods.map((food) => ingredientDayItem(ids.get(food.foodId) ?? `food-${food.foodId}`, food));
}

// A template saved as items after the change can plan more than one meal: the change is the first
// one's, and the others are as planned.
function oldShapeItems(change, slot, meals, getFood) {
  if (Object.hasOwn(change, 'mealId') && change.mealId === null) return [];
  const [first, ...others] = slot.items.filter((item) => item.meal);
  const mealItems = first
    ? [oldShapeMeal(change, first, meals, getFood), ...others.map((item) => mealDayItem(item.id, item.meal, getFood))]
    : [];
  const plannedFoods = slot.items.filter((item) => item.food);
  const foods = change.foods
    ? oldShapeFoods(change.foods, plannedFoods)
    : plannedFoods.map((item) => foodDayItem(item.id, item.food, item.qty, item.unit));
  return [...mealItems, ...foods];
}

// What a planned slot eats on the day, { skipped, ownVersion, items }: its own version once it has
// one, else the template's items as they are now. A change that leaves nothing is a skip: Skip
// itself, an empty version, or every planned food removed for the day before slots held items.
function readSlot(slot, change, meals, getFood) {
  if (!change || Object.keys(change).length === 0) {
    return { skipped: false, ownVersion: false, items: plannedItems(slot, getFood) };
  }
  let items;
  if (change.skipped === true) items = [];
  else if (Array.isArray(change.items)) items = change.items;
  else items = oldShapeItems(change, slot, meals, getFood);
  return items.length > 0 ? { skipped: false, ownVersion: true, items } : { skipped: true, ownVersion: false, items: [] };
}

// What each slot holds on a day (SPEC §3.4, §3.5), in order. Each is
// { id, name, flex, budget, skipped, items, ownVersion, entries }:
// - flex: whether the template plans nothing in the slot. Every slot is flex off plan. A planned
//   slot stays planned whatever the day's changes leave in it.
// - budget: a flex slot's pinned budget, or null. It counts only while the slot is open.
// - items: what the day eats of the plan, as data.js's day items, in order: the template's, as
//   they are now, until the day has its own version, then that. None while skipped, or flex.
// - ownVersion: whether the day has its own version of the slot's planned items, which a change to
//   the template no longer reaches. With skipped, whether As planned has anything to undo.
// - entries: the day's entries added to the slot. An entry in Other or for a slot that's gone
//   isn't in any (slots.js's otherEntries).
// A change is only read on a slot the template plans something in, since it was made on a planned
// slot: one left on a slot that's since turned flex is ignored. Off plan, every slot is flex with
// no budget, and the day's changes are ignored (SPEC §3.4).
// getFood: saved-meals.js's foodLookup, archived foods included.
export function dayPlan(doc, day, getFood) {
  const meals = mealsById(doc);
  return planSlots(doc, getFood).map((slot) => {
    const { id, name } = slot;
    const entries = (day.entries ?? []).filter((entry) => entry.slotId === id);
    const open = { id, name, flex: true, skipped: false, items: [], ownVersion: false, entries };
    if (day.offPlan) return { ...open, budget: null };
    if (slot.flex) return { ...open, budget: slot.budget };
    return { id, name, flex: false, budget: null, ...readSlot(slot, day.changes?.[id], meals, getFood), entries };
  });
}

// What the template plans in a slot now, as day items, whatever the day's changes: what a skipped
// slot would eat, for its actions sheet to offer. None for a flex slot or one that's gone.
export function plannedDayItems(doc, slotId, getFood) {
  const slot = planSlots(doc, getFood).find(({ id }) => id === slotId);
  return slot ? plannedItems(slot, getFood) : [];
}

// --- A day's changes (SPEC §3.5) ---
// Each returns a new day, leaving the one passed in as it was. The first change to any of a slot's
// planned items copies them all as the day's own version, each a snapshot. A change on a skipped
// slot starts again from the template, since changing an item means eating it. A slot whose items
// come back to the template's as they are now has no change at all, so As planned shows only when
// it means something. An item that isn't in the slot, say one changed on another device, leaves
// the day as it was. The slot's change is written in the new shape; other slots keep theirs.
// getFood: as dayPlan's.

// change takes the slot's items before the change and the template's, and returns the new list,
// or the list it was given to change nothing. An empty list is stored as a skip.
function changeItems(doc, day, slotId, getFood, change) {
  const slot = planSlots(doc, getFood).find(({ id }) => id === slotId);
  if (!slot || slot.flex) return day;
  const planned = plannedItems(slot, getFood);
  const now = readSlot(slot, day.changes?.[slotId], mealsById(doc), getFood);
  const before = now.ownVersion ? now.items : planned;
  const items = change(before, planned);
  if (items === before) return day;
  const changes = { ...day.changes };
  if (items.length === 0) changes[slotId] = { skipped: true };
  else if (sameSnapshot(items, planned)) delete changes[slotId];
  else changes[slotId] = { items };
  return { ...day, changes };
}

// edit takes the item and returns the changed one.
function withItem(items, itemId, edit) {
  if (!items.some((item) => item.id === itemId)) return items;
  return items.map((item) => (item.id === itemId ? edit(item) : item));
}

function assertMeal(item) {
  if (item.source !== 'meal' || !item.ingredients) throw new RangeError(`Not a meal with ingredients: ${item.label}`);
}

// Swap (SPEC §3.5): item, a day item from data.js, takes itemId's place in the slot for the day,
// under its id, marked swapped. It's new, so nothing of the old one comes with it: a meal is at 1×
// with its own ingredients. Picking exactly what the template plans there, its own meal or its own
// food at the same amount, is the item as planned, so that isn't marked.
export function swapPlannedItem(doc, day, slotId, itemId, item, getFood) {
  if (!item) throw new RangeError('A swap needs a meal, a food or quick numbers');
  return changeItems(doc, day, slotId, getFood, (items, planned) => swapIn(items, planned, itemId, item));
}

function swapIn(items, planned, itemId, item) {
  return withItem(items, itemId, () => {
    const asPlanned = planned.find(({ id }) => id === itemId);
    return asPlanned && sameSnapshot({ ...item, id: itemId }, asPlanned) ? asPlanned : swappedIn(itemId, item);
  });
}

// Swap with Make this the default (SPEC §3.4), for the day. doc already has the template changed
// by slots.js's replacePlannedItem, which put the pick in itemId's place under placedId. item: the
// pick, a meal or food day item. A day with no version of its own reads the new template as it
// is, so only a skip goes, since picking something means eating it. One with its own version
// takes the template's new item in itemId's place, unmarked, so a day whose only change was to
// that item has none left. Where the template has no new item there, since the pick was already
// in the slot, the day goes the same way: a meal it still has elsewhere just leaves, and a food or
// the item's own meal is swapped in, as by swapPlannedItem. The day's version is read against doc,
// so a change saved before slots held items, which reads against the template it was made on,
// should be written in the new shape first, by swapPlannedItem against the doc before.
export function swapPlannedItemToDefault(doc, day, slotId, itemId, item, placedId, getFood) {
  if (!item) throw new RangeError('A swap needs a meal or a food');
  const slot = planSlots(doc, getFood).find(({ id }) => id === slotId);
  if (!slot || slot.flex) return day;
  const now = readSlot(slot, day.changes?.[slotId], mealsById(doc), getFood);
  if (!now.ownVersion) {
    if (!now.skipped) return day;
    const { [slotId]: skip, ...changes } = day.changes;
    return { ...day, changes };
  }
  return changeItems(doc, day, slotId, getFood, (items, planned) => {
    if (!items.some(({ id }) => id === itemId)) return items;
    const placed = planned.find(({ id }) => id === placedId);
    if (placed) return withItem(items, itemId, () => placed);
    const elsewhere = item.source === 'meal' && items.some(({ id, mealId }) => id !== itemId && mealId === item.mealId);
    if (elsewhere) return items.filter(({ id }) => id !== itemId);
    return swapIn(items, planned, itemId, item);
  });
}

// Portion (SPEC §3.5) on a meal in the slot, edited or not: its numbers become its ingredients'
// total at portion. A food's amount is its own, so it has no portion.
export function setItemPortion(doc, day, slotId, itemId, portion, getFood) {
  if (!Number.isFinite(portion) || portion <= 0) throw new RangeError(`Not a portion above 0: ${portion}`);
  return changeItems(doc, day, slotId, getFood, (items) =>
    withItem(items, itemId, (item) => {
      assertMeal(item);
      return atPortion(item, portion);
    }),
  );
}

// The day's version of a meal in the slot (SPEC §3.5): ingredients, ingredients.js's list, are
// what's eaten, any portion already folded in, so the portion goes back to 1×. The list the meal
// had is kept the first time, as originalIngredients, for reset. A meal swapped in stays swapped.
// A meal keeps at least one ingredient: Remove for today is for eating none of it.
export function setItemIngredients(doc, day, slotId, itemId, ingredients, getFood) {
  if (!ingredients?.length) throw new RangeError('A meal keeps at least one ingredient');
  return changeItems(doc, day, slotId, getFood, (items) =>
    withItem(items, itemId, (item) => {
      assertMeal(item);
      const originalIngredients = item.originalIngredients ?? item.ingredients;
      return atPortion({ ...item, ingredients, originalIngredients }, 1);
    }),
  );
}

// Reset to original meal (SPEC §3.5): the meal as planned, or as swapped in, at 1×. The kept list
// goes with it, so a meal counts as edited only while it has one.
export function resetItemIngredients(doc, day, slotId, itemId, getFood) {
  return changeItems(doc, day, slotId, getFood, (items) =>
    withItem(items, itemId, ({ originalIngredients, ...item }) => {
      assertMeal(item);
      return atPortion({ ...item, ingredients: originalIngredients ?? item.ingredients }, 1);
    }),
  );
}

// Remove for today (SPEC §3.5). Removing the slot's last planned item skips it.
export function removePlannedItem(doc, day, slotId, itemId, getFood) {
  return changeItems(doc, day, slotId, getFood, (items) =>
    items.some(({ id }) => id === itemId) ? items.filter(({ id }) => id !== itemId) : items,
  );
}

// Skip (SPEC §3.5): the slot eats none of its planned items for the day. Its own version goes, so
// As planned and any later change start again from the template. What's been added stays.
export function skipPlannedSlot(day, slotId) {
  return { ...day, changes: { ...day.changes, [slotId]: { skipped: true } } };
}
