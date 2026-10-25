// Saved meals (SPEC §3.3): changes to a meal, and the core doc changes that add, edit and
// delete them. Pure: no DOM, so it can be tested in Node. Totals are never stored: get them
// from calc.js's mealTotals.

import { DEFAULT_EMOJI } from './data.js';
import { assertUnit, convertAmount } from './portions.js';

// A meal lists each food once, so items are found by foodId. An item's qty is in its unit, or in
// the food's serving unit when it has none, as in meals saved before portions (SPEC §3.3).
function assertQty(qty) {
  if (!Number.isFinite(qty) || qty <= 0) throw new RangeError(`Not a quantity above 0: ${qty}`);
}

// The getFood that calc.js's mealTotals takes. foods: bundled and custom foods together,
// archived ones included, since meals keep using them.
export function foodLookup(foods) {
  const byId = new Map(foods.map((food) => [food.id, food]));
  return (id) => byId.get(id);
}

export function createMeal({ name, emoji = DEFAULT_EMOJI }) {
  return { id: crypto.randomUUID(), name, emoji, items: [] };
}

// Each change to a meal returns a new meal and leaves the one passed in as it was.

export function renameMeal(meal, name) {
  return { ...meal, name };
}

export function setMealEmoji(meal, emoji) {
  return { ...meal, emoji };
}

// Tags (SPEC §3.3) match ignoring case. A meal saved without `tags` has none.
const tagKey = (tag) => tag.toLowerCase();
const tagOrder = new Intl.Collator(undefined, { sensitivity: 'base' });

// tags: the meal's tags as typed or picked. Each is trimmed, and blank ones are dropped. One
// that matches a tag in knownTags takes its spelling, so "mexican" becomes an existing
// "Mexican". The meal keeps each tag once, at its first spelling.
export function setMealTags(meal, tags, knownTags = []) {
  const known = new Map(knownTags.map((tag) => [tagKey(tag), tag]));
  const kept = new Map();
  for (const typed of tags) {
    const tag = typed.trim();
    if (tag && !kept.has(tagKey(tag))) kept.set(tagKey(tag), known.get(tagKey(tag)) ?? tag);
  }
  return { ...meal, tags: [...kept.values()] };
}

// Every tag the meals use, once each at its first spelling, A–Z. There's no list of tags
// apart from this, so a tag no meal uses is gone.
export function allTags(meals) {
  const byKey = new Map();
  for (const meal of meals) {
    for (const tag of meal.tags ?? []) if (!byKey.has(tagKey(tag))) byKey.set(tagKey(tag), tag);
  }
  return [...byKey.values()].sort(tagOrder.compare);
}

// The meals with the tag, in their own order. null is the filter's "All": every meal.
export function filterMeals(meals, tag) {
  if (tag === null) return meals;
  return meals.filter((meal) => (meal.tags ?? []).some((own) => tagKey(own) === tagKey(tag)));
}

// qty of food in unit, one of portions.js's foodUnits, or in the serving's unit without one. A
// food that's already in the meal gets the amount added to its item, not a second item,
// converted into the unit the item is in: 1 cup of cooked rice onto 100 g makes 258 g.
export function addItem(meal, food, qty, unit = food.serving.unit) {
  assertQty(qty);
  assertUnit(food, unit);
  const existing = meal.items.find((item) => item.foodId === food.id);
  if (existing) {
    const added = convertAmount(food, qty, unit, existing.unit ?? food.serving.unit);
    return updateItem(meal, food.id, existing.qty + added);
  }
  return { ...meal, items: [...meal.items, { foodId: food.id, qty, unit }] };
}

// unit: the one qty is in now, one of portions.js's foodUnits, when the amount's unit is switched
// (DESIGN §10); without it, the item keeps the unit it's in.
export function updateItem(meal, foodId, qty, unit) {
  assertQty(qty);
  const updated = (item) => (unit === undefined ? { ...item, qty } : { ...item, qty, unit });
  return { ...meal, items: meal.items.map((item) => (item.foodId === foodId ? updated(item) : item)) };
}

export function removeItem(meal, foodId) {
  return { ...meal, items: meal.items.filter((item) => item.foodId !== foodId) };
}

// A new meal with its own id. "copy" in the name tells it apart from the original in the list.
// It keeps the original's tags, if it has any.
export function duplicateMeal(meal) {
  const copy = {
    ...meal,
    id: crypto.randomUUID(),
    name: `${meal.name} copy`,
    items: meal.items.map((item) => ({ ...item })),
  };
  if (meal.tags) copy.tags = [...meal.tags];
  return copy;
}

// Each core doc change returns a new doc and leaves the one passed in as it was.

export function addMeal(doc, meal) {
  return { ...doc, meals: [...(doc.meals ?? []), meal] };
}

// change takes the stored meal and returns the new one, e.g. (meal) => addItem(meal, food, qty).
export function updateMeal(doc, id, change) {
  return { ...doc, meals: (doc.meals ?? []).map((meal) => (meal.id === id ? change(meal) : meal)) };
}

export function isMealPlanned(doc, id) {
  return Object.values(doc.template ?? {}).some((slot) => slot.mealId === id);
}

// Template slots that planned the meal become flex, so nothing points at a meal that's gone.
// Past days keep it: they're locked in as snapshot entries in the days doc (SPEC §3.5).
export function deleteMeal(doc, id) {
  const template = Object.fromEntries(
    Object.entries(doc.template ?? {}).map(([slotId, slot]) => [
      slotId,
      slot.mealId === id ? { ...slot, mealId: null } : slot,
    ]),
  );
  return { ...doc, meals: (doc.meals ?? []).filter((meal) => meal.id !== id), template };
}
