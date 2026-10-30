// Meal slots and the daily template (SPEC §3.4): the core doc changes that add, rename, remove
// and reorder slots, that plan a meal, foods or flex in one, and what the slots plan on a given
// day. Pure: no DOM, so it can be tested in Node. The template is keyed by slot id, so reordering
// slots never touches it.

import { addItem } from './saved-meals.js';

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

// --- Slot items (SPEC §3.4) ---
// A template slot holds its planned items, [{ id, mealId } | { id, foodId, qty, unit }], in the
// order they were added. Either can have a portion, eaten every day; none means 1×.

// A template slot's planned items, in order. A slot saved before slots held items reads as its
// mealId, then its foods, with ids made from what they plan, so they're the same on every read
// without using positions. A slot with items ignores mealId and foods, even when its list is empty.
export function slotItems(templateSlot) {
  if (Array.isArray(templateSlot?.items)) return templateSlot.items;
  const { mealId, foods = [] } = templateSlot ?? {};
  const meal = mealId ? [{ id: `meal-${mealId}`, mealId }] : [];
  return [...meal, ...foods.map((food) => ({ id: `food-${food.foodId}`, ...food }))];
}

// Each change below returns a new core doc with the slot's items written as `items`, and its
// mealId and foods dropped, so a slot saved before is in the new shape once it's changed. Its
// budget stays. Items read from the old fields keep their made-up ids; new ones get a uuid.
function withSlotItems(doc, slotId, items) {
  const { mealId, foods, ...slot } = doc.template?.[slotId] ?? { budget: null };
  return { ...doc, template: { ...doc.template, [slotId]: { ...slot, items } } };
}

// Plans the meal in the slot every day, at 1×, after what's there. A meal is planned in a slot
// once, so one already there changes nothing, its portion included.
export function addPlannedMeal(doc, slotId, mealId) {
  if (!mealId) throw new RangeError('A planned meal needs a meal');
  const items = slotItems(doc.template?.[slotId]);
  if (items.some((item) => item.mealId === mealId)) return doc;
  return withSlotItems(doc, slotId, [...items, { id: crypto.randomUUID(), mealId }]);
}

// Plans qty of food in the slot every day, in unit, one of portions.js's foodUnits, or in the
// serving's unit without one. A food already planned there gets the amount added to it, converted
// into its unit, as in a meal (saved-meals.js's addItem, which skips the meal items), and keeps
// its portion.
export function addPlannedFood(doc, slotId, food, qty, unit) {
  const { items } = addItem({ items: slotItems(doc.template?.[slotId]) }, food, qty, unit);
  return withSlotItems(doc, slotId, items.map((item) => (item.id ? item : { id: crypto.randomUUID(), ...item })));
}

// A slot left with no items is flex again, with its pinned budget, if it had one.
export function removePlannedItem(doc, slotId, itemId) {
  const items = slotItems(doc.template?.[slotId]);
  if (!items.some((item) => item.id === itemId)) return doc;
  return withSlotItems(doc, slotId, items.filter((item) => item.id !== itemId));
}

// Make this the default (SPEC §3.4): what's planned takes itemId's place in the slot, as a new
// item at 1×. plan: { mealId }, or { food, qty, unit } with unit as addPlannedFood's. A meal
// already planned elsewhere in the slot stays once, and a food already planned elsewhere gets the
// amount added to it there instead, at its own portion, so either way the item just leaves the
// slot. Picking the item's own meal changes nothing at 1×, and puts it back to 1× at a portion;
// its own food takes the new amount. An item that isn't there changes nothing.
// id: the placed item's, for a caller that applies the change twice, to the doc it shows and to
// the one it saves, so both agree.
export function replacePlannedItem(doc, slotId, itemId, plan, id = crypto.randomUUID()) {
  const items = slotItems(doc.template?.[slotId]);
  const replaced = items.find((item) => item.id === itemId);
  if (!replaced) return doc;
  const others = items.filter((item) => item !== replaced);
  let item;
  if (plan.mealId) {
    if (replaced.mealId === plan.mealId && (replaced.portion ?? 1) === 1) return doc;
    if (others.some(({ mealId }) => mealId === plan.mealId)) return withSlotItems(doc, slotId, others);
    item = { mealId: plan.mealId };
  } else {
    const { food, qty, unit } = plan;
    if (others.some(({ foodId }) => foodId === food.id)) {
      return withSlotItems(doc, slotId, addItem({ items: others }, food, qty, unit).items);
    }
    // Made by addItem, so the amount and unit are checked as when adding.
    [item] = addItem({ items: [] }, food, qty, unit).items;
  }
  const placed = { id, ...item };
  return withSlotItems(doc, slotId, items.map((each) => (each === replaced ? placed : each)));
}

// A planned item's portion (SPEC §3.4), eaten every day the day has no version of its own
// (day-plan.js). 1× is stored as no portion, as for an item planned before portions. An item
// that isn't there changes nothing.
export function setPlannedPortion(doc, slotId, itemId, portion) {
  if (!Number.isFinite(portion) || portion <= 0) throw new RangeError(`Not a portion above 0: ${portion}`);
  const items = slotItems(doc.template?.[slotId]);
  if (!items.some((item) => item.id === itemId)) return doc;
  const atPortion = ({ portion: old, ...item }) => (portion === 1 ? item : { ...item, portion });
  return withSlotItems(doc, slotId, items.map((item) => (item.id === itemId ? atPortion(item) : item)));
}

// The slots in order, each with what the template plans in it (SPEC §3.4).
// Each is { id, name, items, flex, budget }:
// - items: slotItems, a meal as { id, mealId, meal } and a food as { id, foodId, qty, unit, food },
//   each with its portion, if it has one.
//   A meal that's since been deleted is left out, so nothing points at a meal that's gone. A food
//   is always found, since deleting one that's planned archives it.
// - flex: whether nothing's left in it.
// - budget: a flex slot's pinned budget, or null. One on a planned slot stays on the template
//   for when it's flex again, but doesn't count.
// getFood: saved-meals.js's foodLookup, archived foods included.
export function planSlots(doc, getFood) {
  const meals = new Map((doc.meals ?? []).map((meal) => [meal.id, meal]));
  return (doc.slots ?? []).map((slot) => {
    const items = slotItems(doc.template?.[slot.id]).flatMap((item) => {
      if (item.mealId) return meals.has(item.mealId) ? [{ ...item, meal: meals.get(item.mealId) }] : [];
      const food = getFood(item.foodId);
      if (!food) throw new RangeError(`Unknown food: ${item.foodId}`);
      return [{ ...item, food }];
    });
    const flex = items.length === 0;
    return { ...slot, items, flex, budget: flex ? (doc.template?.[slot.id]?.budget ?? null) : null };
  });
}

// What Other holds on a day that isn't locked (SPEC §3.5, §3.6), in the order added: the entries
// added outside the slots, and any whose slot has since been removed, since they have no slot to
// show under. slots: the core doc's slots (day-plan.js's dayPlan plans will do). A locked day
// lists every entry under the slot name it saved instead.
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

// As planned (SPEC §3.5): undoes the day's change to the slot, whatever shape it's stored in
// (day-plan.js's items, or a change saved before them), so the template's items are back.
export function clearSlotChange(day, slotId) {
  return withChange(day, slotId, {});
}
