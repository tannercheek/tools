// Custom foods (SPEC §3.2): reading the form, and the core doc changes that add, edit
// and delete them. Pure: no DOM, so it can be tested in Node.

const NUMBER_KEYS = ['kcal', 'protein', 'fat', 'carbs'];

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

// fields: readFoodForm's fields.
export function createCustomFood(fields) {
  return { id: `custom-${crypto.randomUUID()}`, ...fields, custom: true, archived: false };
}

// Each change returns a new core doc and leaves the one passed in as it was.

export function addCustomFood(doc, food) {
  return { ...doc, foods: [...(doc.foods ?? []), food] };
}

// The food keeps its id, so the meals that use it pick up the change.
export function updateCustomFood(doc, id, fields) {
  return { ...doc, foods: (doc.foods ?? []).map((food) => (food.id === id ? { ...food, ...fields } : food)) };
}

// In use: in a saved meal, or planned in a slot (SPEC §3.4).
export function isFoodInUse(doc, id) {
  const uses = (items = []) => items.some((item) => item.foodId === id);
  return (
    (doc.meals ?? []).some((meal) => uses(meal.items)) ||
    Object.values(doc.template ?? {}).some((slot) => uses(slot.foods))
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
