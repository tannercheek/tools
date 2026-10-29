// Custom foods (SPEC §3.2): reading the form, and the core doc changes that add, edit
// and delete them. Pure: no DOM, so it can be tested in Node.

import { slotItems } from './slots.js';

const NUMBER_KEYS = ['kcal', 'protein', 'fat', 'carbs'];
const GRAMS = 'g';

// An amount as typed: digits with an optional decimal point ("34", "34.5", ".5").
// Anything else is null, including commas, signs and blanks.
export function parseAmount(text) {
  const trimmed = String(text ?? '').trim();
  return /^(\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : null;
}

// The four numbers as typed { kcal, protein, fat, carbs }: a food's, quick numbers or a pinned
// budget (SPEC §3.4). Returns { numbers, errors }: numbers is null if any is wrong, and errors
// maps each wrong one to its message.
export function readNumbers(values) {
  const numbers = {};
  const errors = {};
  for (const key of NUMBER_KEYS) {
    numbers[key] = parseAmount(values[key]);
    if (numbers[key] === null) errors[key] = 'Enter a number, like 34 or 34.5';
  }
  return { numbers: Object.keys(errors).length > 0 ? null : numbers, errors };
}

// values: the form's text { name, servingQty, servingUnit, kcal, protein, fat, carbs },
// plus the chosen emoji. Returns { fields, errors }: fields is the food without its id,
// or null if anything is wrong, and errors maps each wrong field to its message.
export function readFoodForm(values) {
  const errors = {};
  const name = values.name.trim();
  const qty = parseAmount(values.servingQty);
  const unit = values.servingUnit.trim();
  if (!name) errors.name = 'Enter a name';
  if (!qty) errors.servingQty = 'Enter an amount above 0';
  if (!unit) errors.servingUnit = 'Enter a unit, like g or slice';

  const { numbers, errors: numberErrors } = readNumbers(values);
  Object.assign(errors, numberErrors);

  if (Object.keys(errors).length > 0) return { fields: null, errors };
  return { fields: { name, serving: { qty, unit }, emoji: values.emoji, ...numbers }, errors };
}

// A custom food's units (SPEC §3.2): `grams`, the serving's weight, above 0, and `portions`,
// each a unit named once and never "g" or the serving's own, since those already apply without
// being added. A serving already counted in g needs no weight of its own, since it's already
// known from the serving's quantity. Left alone unless the caller sets `grams` or `portions`
// itself, so a food that's never had either keeps its old shape exactly.
function sanitizeUnits(food) {
  if (food.grams === undefined && food.portions === undefined) return food;
  const grams = food.grams > 0 ? food.grams : food.serving.unit === GRAMS ? food.serving.qty : undefined;
  if (!grams) return { ...food, grams: undefined, portions: [] };
  const seen = new Set([GRAMS, food.serving.unit]);
  const portions = (food.portions ?? []).filter((portion) => {
    if (seen.has(portion.unit)) return false;
    seen.add(portion.unit);
    return true;
  });
  return { ...food, grams, portions };
}

// fields: readFoodForm's fields, plus optionally `grams` and `portions` (SPEC §3.2).
export function createCustomFood(fields) {
  return sanitizeUnits({ id: `custom-${crypto.randomUUID()}`, ...fields, custom: true, archived: false });
}

// Each change returns a new core doc and leaves the one passed in as it was.

export function addCustomFood(doc, food) {
  return { ...doc, foods: [...(doc.foods ?? []), food] };
}

// The food keeps its id, so the meals that use it pick up the change.
export function updateCustomFood(doc, id, fields) {
  return {
    ...doc,
    foods: (doc.foods ?? []).map((food) => (food.id === id ? sanitizeUnits({ ...food, ...fields }) : food)),
  };
}

// The units a custom food's saved meals' items and the template's planned foods (`slotItems`,
// 14.11) are counted in (SPEC §3.2), so a unit a meal or a plan needs isn't removed from under it.
export function unitsInUse(foodId, doc) {
  const unitsOf = (items = []) =>
    items.filter((item) => item.foodId === foodId && item.unit).map((item) => item.unit);
  const mealUnits = (doc.meals ?? []).flatMap((meal) => unitsOf(meal.items));
  const slotUnits = Object.values(doc.template ?? {}).flatMap((slot) => unitsOf(slotItems(slot)));
  return [...new Set([...mealUnits, ...slotUnits])];
}

// The name of the first saved meal or slot that counts a food in a unit (SPEC §3.2), for the
// custom food form's "can't remove, in use" line. null if nothing does.
export function unitUsedBy(foodId, unit, doc) {
  const uses = (items = []) => items.some((item) => item.foodId === foodId && item.unit === unit);
  const meal = (doc.meals ?? []).find((meal) => uses(meal.items));
  if (meal) return meal.name;
  const slot = (doc.slots ?? []).find((slot) => uses(slotItems(doc.template?.[slot.id])));
  return slot?.name ?? null;
}

// In use: in a saved meal, or planned in a slot (SPEC §3.4), as items or as a slot saved before
// slots held items.
export function isFoodInUse(doc, id) {
  const uses = (items = []) => items.some((item) => item.foodId === id);
  return (
    (doc.meals ?? []).some((meal) => uses(meal.items)) ||
    Object.values(doc.template ?? {}).some((slot) => uses(slotItems(slot)))
  );
}

// A food a meal still uses, or a slot plans, is archived: hidden from search and the foods list,
// but still there for the meal or the template to resolve. A food nothing uses is removed.
export function deleteCustomFood(doc, id) {
  const foods = doc.foods ?? [];
  return {
    ...doc,
    foods: isFoodInUse(doc, id)
      ? foods.map((food) => (food.id === id ? { ...food, archived: true } : food))
      : foods.filter((food) => food.id !== id),
  };
}
