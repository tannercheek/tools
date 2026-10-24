// Meal slots and the daily template (SPEC §3.4): the core doc changes that add, rename, remove
// and reorder slots, that plan a meal or flex in one, and what the slots plan on a given day.
// Pure: no DOM, so it can be tested in Node. The template is keyed by slot id, so reordering
// slots never touches it.

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

// mealId: the meal to plan in the slot, or null for flex. A pinned budget stays on the slot,
// since it only counts while the slot is flex.
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

// The slots in order, each with its planned meal, or null when it's flex. A meal that's no
// longer saved counts as flex, so nothing points at a meal that's gone.
export function templateSlots(doc) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  return (doc.slots ?? []).map((slot) => ({
    ...slot,
    meal: meals.get(doc.template?.[slot.id]?.mealId) ?? null,
  }));
}

// What each slot plans on a day (SPEC §3.4, §3.5), in order: the template after the day's
// changes. Each is { id, name, meal, portion, swapped, skipped, edited, ingredients, swapEntry,
// budget, entries }:
// - meal: the meal eaten there, swapped in or from the template, or null for flex. A skipped
//   slot keeps its meal, so it can still be shown, and counts as nothing.
// - ingredients: the day's version of the meal (ingredients.js), at 1×, or null to eat the meal
//   as saved. edited: whether there is one.
// - swapEntry: a food or quick numbers swapped in, an entry snapshot eaten in place of the meal,
//   or null. The slot keeps the template's meal as its meal, so it's still a planned slot.
// - budget: a flex slot's pinned budget, or null. It counts only while the slot is open.
// - entries: the day's entries added to this slot. An entry in Other or for a slot that's gone
//   isn't in any (otherEntries).
// Changes are only on slots the template plans a meal in: a swap, skip or portion is made on a
// planned slot, so one left on a slot that has since become flex is ignored. A swap to a meal
// that's since been deleted falls back to the template's meal. Ingredients are kept with the
// meal they were made on, so they're ignored while the slot shows any other meal.
// Off plan, every slot is flex with no budget, and the day's changes are ignored (SPEC §3.4).
export function daySlots(doc, day) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  const flex = { portion: 1, swapped: false, skipped: false, edited: false, ingredients: null, swapEntry: null };
  return templateSlots(doc).map((slot) => {
    const entries = (day.entries ?? []).filter((entry) => entry.slotId === slot.id);
    if (day.offPlan) return { ...slot, ...flex, meal: null, budget: null, entries };
    if (!slot.meal) {
      const budget = doc.template?.[slot.id]?.budget ?? null;
      return { ...slot, ...flex, budget, entries };
    }
    const change = day.changes?.[slot.id] ?? {};
    if (change.entry) return { ...slot, ...flex, swapped: true, swapEntry: change.entry, budget: null, entries };
    const skipped = Object.hasOwn(change, 'mealId') && change.mealId === null;
    const swap = meals.get(change.mealId);
    const swapped = Boolean(swap) && swap.id !== slot.meal.id;
    const meal = swapped ? swap : slot.meal;
    const edit = change.ingredients;
    const edited = !skipped && edit?.mealId === meal.id && edit.items?.length > 0;
    return {
      ...slot,
      meal,
      portion: change.portion ?? 1,
      swapped,
      skipped,
      edited,
      ingredients: edited ? edit.items : null,
      swapEntry: null,
      budget: null,
      entries,
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

// --- A day's changes (SPEC §3.5) ---
// Each takes a day and returns a new one, leaving the one passed in as it was. A slot whose change
// comes back to the template has no change at all, so "As planned" shows only when it means something.

function withChange(day, slotId, change) {
  const changes = { ...day.changes };
  if (Object.keys(change).length === 0) delete changes[slotId];
  else changes[slotId] = change;
  return { ...day, changes };
}

// Skipping drops any swap, portion or ingredients: it counts as nothing whatever it was.
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
// portion, and takes back a skip, since picking a meal means eating it. Drops any ingredients,
// since they were made on the meal it replaces, and any food or quick numbers swapped in. Picking
// the template's own meal isn't stored as a swap, so a later change to the template can't turn
// it into one.
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
// swap, skip, portion and ingredients go.
export function swapSlotToEntry(day, slotId, entry) {
  if (!entry) throw new RangeError('A swap needs a food or quick numbers');
  return withChange(day, slotId, { entry });
}

// The day's version of the slot's meal (SPEC §3.5): items, ingredients.js's list, kept with
// mealId, the meal the slot shows, so it never carries over to another meal. The amounts are
// what's eaten, any portion already folded in, so the portion goes back to 1×. Keeps a swap, and
// takes back a skip, since editing a meal means eating it. A meal keeps at least one ingredient:
// Skip is for eating none of it.
export function setSlotIngredients(day, slotId, mealId, items) {
  if (!mealId) throw new RangeError('Ingredients need the meal they were made on');
  if (!items?.length) throw new RangeError('A meal keeps at least one ingredient');
  const { mealId: swap } = day.changes?.[slotId] ?? {};
  const change = { ingredients: { mealId, items } };
  if (swap) change.mealId = swap;
  return withChange(day, slotId, change);
}

// Reset to original meal (SPEC §3.5): the saved meal at 1×, so the ingredients and portion go. A
// swap stays.
export function resetSlotIngredients(day, slotId) {
  const { ingredients, portion, ...swap } = day.changes?.[slotId] ?? {};
  return withChange(day, slotId, swap);
}

// As planned: undoes the slot's swap, a food or quick numbers included, skip, portion and
// ingredients.
export function clearSlotChange(day, slotId) {
  return withChange(day, slotId, {});
}
