// Meal slots and the daily template (SPEC §3.4): the core doc changes that add, rename, remove
// and reorder slots, that plan a meal, foods or flex in one, and what the slots plan on a given
// day. Pure: no DOM, so it can be tested in Node. The template is keyed by slot id, so reordering
// slots never touches it.

import { itemIngredients } from './ingredients.js';
import { addItem, removeItem, updateItem } from './saved-meals.js';

export const MIN_SLOTS = 3;
export const MAX_SLOTS = 6;

// Trimmed; a blank name is a mistake in the caller, since the form checks first.
function slotName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new RangeError('A slot needs a name');
  return trimmed;
}

export function createSlot(name) {
  return { id: crypto.randomUUID(), name: slotName(name) };
}

// Each change returns a new core doc and leaves the one passed in as it was.

// A new slot goes last, as flex with no budget, like a first run's slots.
export function addSlot(doc, slot) {
  const slots = doc.slots ?? [];
  if (slots.length >= MAX_SLOTS) throw new RangeError(`At most ${MAX_SLOTS} slots`);
  return {
    ...doc,
    slots: [...slots, slot],
    template: { ...doc.template, [slot.id]: { mealId: null, budget: null } },
  };
}

export function renameSlot(doc, slotId, name) {
  const trimmed = slotName(name);
  return { ...doc, slots: (doc.slots ?? []).map((slot) => (slot.id === slotId ? { ...slot, name: trimmed } : slot)) };
}

// Its template entry goes with it. A day's changes for it are left alone: nothing reads a
// change for a slot that isn't there.
export function removeSlot(doc, slotId) {
  const slots = doc.slots ?? [];
  if (slots.length <= MIN_SLOTS) throw new RangeError(`At least ${MIN_SLOTS} slots`);
  const template = Object.fromEntries(Object.entries(doc.template ?? {}).filter(([id]) => id !== slotId));
  return { ...doc, slots: slots.filter((slot) => slot.id !== slotId), template };
}

// offset: -1 moves the slot up one place, 1 down one. A slot already at that end stays put.
export function moveSlot(doc, slotId, offset) {
  const slots = [...(doc.slots ?? [])];
  const from = slots.findIndex((slot) => slot.id === slotId);
  const to = from + offset;
  if (from === -1 || to < 0 || to >= slots.length) return doc;
  const [slot] = slots.splice(from, 1);
  slots.splice(to, 0, slot);
  return { ...doc, slots };
}

// mealId: the meal to plan in the slot, or null for none, which is flex unless the slot plans
// foods. A pinned budget stays on the slot, since it only counts while the slot is flex.
export function setSlotMeal(doc, slotId, mealId) {
  const slot = doc.template?.[slotId] ?? { mealId: null, budget: null };
  return { ...doc, template: { ...doc.template, [slotId]: { ...slot, mealId } } };
}

// budget: { kcal, protein, fat, carbs } to pin on the slot, or null to take it off. Like the
// meal, it's on the template, so it applies every day. It counts only while the slot is open flex.
export function setSlotBudget(doc, slotId, budget) {
  let pinned = null;
  if (budget) {
    const { kcal, protein, fat, carbs } = budget;
    pinned = { kcal, protein, fat, carbs };
    for (const [key, value] of Object.entries(pinned)) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError(`Not a budget ${key} of 0 or more: ${value}`);
    }
  }
  const slot = doc.template?.[slotId] ?? { mealId: null, budget: null };
  return { ...doc, template: { ...doc.template, [slotId]: { ...slot, budget: pinned } } };
}

// A slot's planned foods are listed like a meal's items, [{ foodId, qty, unit }], each food once,
// so saved-meals.js's item changes keep them. change takes and returns a meal-like { items }.
function changeSlotFoods(doc, slotId, change) {
  const slot = doc.template?.[slotId] ?? { mealId: null, budget: null };
  const { items } = change({ items: slot.foods ?? [] });
  return { ...doc, template: { ...doc.template, [slotId]: { ...slot, foods: items } } };
}

// Plans qty of food in the slot every day (SPEC §3.4), in unit, one of portions.js's foodUnits,
// or in the serving's unit without one. A food already planned there gets the amount added to it,
// converted into its unit, as in a meal.
export function addSlotFood(doc, slotId, food, qty, unit) {
  return changeSlotFoods(doc, slotId, (list) => addItem(list, food, qty, unit));
}

// unit: the one qty is in now, when the amount's unit is switched; without it, the food keeps its
// unit.
export function updateSlotFood(doc, slotId, foodId, qty, unit) {
  return changeSlotFoods(doc, slotId, (list) => updateItem(list, foodId, qty, unit));
}

// A slot left with no meal and no foods is flex again.
export function removeSlotFood(doc, slotId, foodId) {
  return changeSlotFoods(doc, slotId, (list) => removeItem(list, foodId));
}

// The slots in order, each with its planned meal, or null, and its planned foods, the template's
// [{ foodId, qty, unit }], or [] for a slot saved without them. flex: whether it plans neither
// (SPEC §3.4). A meal that's no longer saved counts as none, so nothing points at a meal that's
// gone.
export function templateSlots(doc) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  return (doc.slots ?? []).map((slot) => {
    const meal = meals.get(doc.template?.[slot.id]?.mealId) ?? null;
    const foods = doc.template?.[slot.id]?.foods ?? [];
    return { ...slot, meal, foods, flex: !meal && foods.length === 0 };
  });
}

// What each slot plans on a day (SPEC §3.4, §3.5), in order: the template after the day's
// changes. Each is { id, name, flex, meal, portion, swapped, skipped, edited, ingredients,
// swapEntry, foods, budget, entries }:
// - flex: whether the template plans neither a meal nor foods in the slot. Every slot is flex off
//   plan. A planned slot stays planned whatever the day's changes leave in it.
// - meal: the meal eaten there, swapped in or from the template, or null. A skipped slot keeps
//   its meal, so it can still be shown, and counts as nothing.
// - ingredients: the day's version of the meal (ingredients.js), at 1×, or null to eat the meal
//   as saved. edited: whether there is one.
// - swapEntry: a food or quick numbers swapped in, an entry snapshot eaten in place of the meal,
//   or null. The slot keeps the template's meal as its meal, so it's still a planned slot.
// - foods: the planned foods eaten there, as ingredients (ingredients.js) at their own amounts,
//   since a portion is only the meal's: the day's version, or else the template's. A skipped slot
//   eats none.
// - budget: a flex slot's pinned budget, or null. It counts only while the slot is open.
// - entries: the day's entries added to this slot. An entry in Other or for a slot that's gone
//   isn't in any (otherEntries).
// Changes are only on slots the template plans a meal or foods in: they're made on a planned
// slot, so one left on a slot that has since become flex is ignored. A swap, portion or
// ingredients are made on the meal, so they're ignored on a slot that plans only foods. A swap
// to a meal that's since been deleted falls back to the template's meal. Ingredients are kept
// with the meal they were made on, so they're ignored while the slot shows any other meal.
// Off plan, every slot is flex with no budget, and the day's changes are ignored (SPEC §3.4).
// getFood: saved-meals.js's foodLookup, archived foods included, for the template's planned foods.
export function daySlots(doc, day, getFood) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  const unchanged = { portion: 1, swapped: false, skipped: false, edited: false, ingredients: null, swapEntry: null };
  return templateSlots(doc).map((slot) => {
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

// What Other holds on a day that isn't locked (SPEC §3.5, §3.6), in the order added: the entries
// added outside the slots, and any whose slot has since been removed, since they have no slot to
// show under. slots: the core doc's slots (daySlots' plans will do). A locked day lists every entry
// under the slot name it saved instead.
export function otherEntries(day, slots) {
  const slotIds = new Set(slots.map((slot) => slot.id));
  return (day.entries ?? []).filter((entry) => !slotIds.has(entry.slotId));
}

// A locked day's entries by slot (SPEC §3.6): a group per slot in today's slot order, each
// { slotId, name, entries }, named by the slot name its entries saved (SPEC §3.5), Other's
// "Other", and keeping the order they were written in. A slot that's since been removed has its
// group after the others, in the order they were first written to; Other's, whose entries have
// no slot id (data.js's OTHER), comes last. slots: the core doc's slots.
export function lockedDayGroups(entries, slots) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.slotId)) groups.set(entry.slotId, { slotId: entry.slotId, name: entry.slotName, entries: [] });
    groups.get(entry.slotId).entries.push(entry);
  }
  const order = new Map(slots.map((slot, i) => [slot.id, i]));
  const rank = ({ slotId }) => (slotId === null ? slots.length + 1 : (order.get(slotId) ?? slots.length));
  // A stable sort, so removed slots' groups keep the order they were first written to.
  return [...groups.values()].sort((a, b) => rank(a) - rank(b));
}

// --- A day's changes (SPEC §3.5) ---
// Each takes a day and returns a new one, leaving the one passed in as it was. A slot whose change
// comes back to the template has no change at all, so "As planned" shows only when it means something.

function withChange(day, slotId, change) {
  const changes = { ...day.changes };
  if (Object.keys(change).length === 0) delete changes[slotId];
  else changes[slotId] = change;
  return { ...day, changes };
}

// Skipping drops any swap, portion, ingredients or day's planned foods: it counts as nothing
// whatever it was, its planned foods included.
export function skipSlot(day, slotId) {
  return withChange(day, slotId, { mealId: null });
}

// Keeps a swap and any ingredients, which are then eaten at this portion, and takes back a skip,
// since a portion of nothing means eating the meal. A portion is of a meal, so it takes back a
// swap to a food or quick numbers too. 1× is the template's own portion, so it isn't stored.
export function setSlotPortion(day, slotId, portion) {
  if (!Number.isFinite(portion) || portion <= 0) throw new RangeError(`Not a portion above 0: ${portion}`);
  const { mealId, entry, ...rest } = day.changes?.[slotId] ?? {};
  const change = { ...rest, portion };
  if (mealId) change.mealId = mealId;
  if (portion === 1) delete change.portion;
  return withChange(day, slotId, change);
}

// Swap: mealId is eaten in the slot that day instead of the template's plannedMealId. Keeps a
// portion and the day's planned foods, and takes back a skip, since picking a meal means eating
// it. Drops any ingredients, since they were made on the meal it replaces, and any food or quick
// numbers swapped in. Picking the template's own meal isn't stored as a swap, so a later change
// to the template can't turn it into one.
export function swapSlot(day, slotId, mealId, plannedMealId) {
  if (!mealId) throw new RangeError('A swap needs a meal');
  const change = { ...day.changes?.[slotId] };
  delete change.mealId;
  delete change.ingredients;
  delete change.entry;
  if (mealId !== plannedMealId) change.mealId = mealId;
  return withChange(day, slotId, change);
}

// Swap to a food or quick numbers (SPEC §3.5): entry, data.js's foodEntry or quickEntry for the
// slot, is eaten that day in place of its meal. It has no portion or ingredients, so any meal
// swap, skip, portion and ingredients go. Like any swap of the meal, it keeps the day's planned
// foods.
export function swapSlotToEntry(day, slotId, entry) {
  if (!entry) throw new RangeError('A swap needs a food or quick numbers');
  const { foods } = day.changes?.[slotId] ?? {};
  return withChange(day, slotId, foods ? { entry, foods } : { entry });
}

// The day's version of the slot's meal (SPEC §3.5): items, ingredients.js's list, kept with
// mealId, the meal the slot shows, so it never carries over to another meal. The amounts are
// what's eaten, any portion already folded in, so the portion goes back to 1×. Keeps a swap and
// the day's planned foods, and takes back a skip, since editing a meal means eating it. A meal
// keeps at least one ingredient: Skip is for eating none of it.
export function setSlotIngredients(day, slotId, mealId, items) {
  if (!mealId) throw new RangeError('Ingredients need the meal they were made on');
  if (!items?.length) throw new RangeError('A meal keeps at least one ingredient');
  const { mealId: swap, foods } = day.changes?.[slotId] ?? {};
  const change = { ingredients: { mealId, items } };
  if (swap) change.mealId = swap;
  if (foods) change.foods = foods;
  return withChange(day, slotId, change);
}

// The day's version of the slot's planned foods (SPEC §3.5): foods, ingredients.js's list, eaten
// that day in place of the template's, so a later change to the template's foods doesn't reach
// it. Made from daySlots' foods with ingredients.js's swapIngredient or removeIngredient. An empty
// list is every planned food removed for the day. The rest of the slot's change stays, since a
// swap, portion or ingredients are the meal's.
export function setSlotFoods(day, slotId, foods) {
  if (!Array.isArray(foods)) throw new RangeError('Planned foods for the day need a list');
  return withChange(day, slotId, { ...day.changes?.[slotId], foods });
}

// Reset to original meal (SPEC §3.5): the saved meal at 1×, so the ingredients and portion go. A
// swap and the day's planned foods stay.
export function resetSlotIngredients(day, slotId) {
  const { ingredients, portion, ...rest } = day.changes?.[slotId] ?? {};
  return withChange(day, slotId, rest);
}

// As planned: undoes the slot's swap, a food or quick numbers included, skip, portion,
// ingredients and planned foods for the day, so the template's foods are back.
export function clearSlotChange(day, slotId) {
  return withChange(day, slotId, {});
}
