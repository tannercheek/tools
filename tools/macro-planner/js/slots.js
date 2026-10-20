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
// changes. Each is { id, name, meal, portion, swapped, skipped, budget, entries }:
// - meal: the meal eaten there, swapped in or from the template, or null for flex. A skipped
//   slot keeps its meal, so it can still be shown, and counts as nothing.
// - budget: a flex slot's pinned budget, or null. It counts only while the slot is open.
// - entries: the day's entries added to this slot. An entry for a slot that's gone isn't in any.
// Changes are only on slots the template plans a meal in: a swap, skip or portion is made on a
// planned slot, so one left on a slot that has since become flex is ignored. A swap to a meal
// that's since been deleted falls back to the template's meal.
// Off plan, every slot is flex with no budget, and the day's changes are ignored (SPEC §3.4).
export function daySlots(doc, day) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  return templateSlots(doc).map((slot) => {
    const entries = (day.entries ?? []).filter((entry) => entry.slotId === slot.id);
    if (day.offPlan) return { ...slot, meal: null, portion: 1, swapped: false, skipped: false, budget: null, entries };
    if (!slot.meal) {
      const budget = doc.template?.[slot.id]?.budget ?? null;
      return { ...slot, portion: 1, swapped: false, skipped: false, budget, entries };
    }
    const change = day.changes?.[slot.id] ?? {};
    const skipped = Object.hasOwn(change, 'mealId') && change.mealId === null;
    const swap = meals.get(change.mealId);
    const swapped = Boolean(swap) && swap.id !== slot.meal.id;
    return {
      ...slot,
      meal: swapped ? swap : slot.meal,
      portion: change.portion ?? 1,
      swapped,
      skipped,
      budget: null,
      entries,
    };
  });
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

// Skipping drops any swap or portion: it counts as nothing whatever it was.
export function skipSlot(day, slotId) {
  return withChange(day, slotId, { mealId: null });
}

// Keeps a swap, and takes back a skip, since a portion of nothing means eating the meal. 1× is
// the template's own portion, so it isn't stored.
export function setSlotPortion(day, slotId, portion) {
  if (!Number.isFinite(portion) || portion <= 0) throw new RangeError(`Not a portion above 0: ${portion}`);
  const { mealId, ...rest } = day.changes?.[slotId] ?? {};
  const change = { ...rest, portion };
  if (mealId) change.mealId = mealId;
  if (portion === 1) delete change.portion;
  return withChange(day, slotId, change);
}

// Swap: mealId is eaten in the slot that day instead of the template's plannedMealId. Keeps a
// portion, and takes back a skip, since picking a meal means eating it. Picking the template's own
// meal isn't stored as a swap, so a later change to the template can't turn it into one.
export function swapSlot(day, slotId, mealId, plannedMealId) {
  if (!mealId) throw new RangeError('A swap needs a meal');
  const change = { ...day.changes?.[slotId] };
  delete change.mealId;
  if (mealId !== plannedMealId) change.mealId = mealId;
  return withChange(day, slotId, change);
}

// As planned: undoes the slot's swap, skip and portion.
export function clearSlotChange(day, slotId) {
  return withChange(day, slotId, {});
}
