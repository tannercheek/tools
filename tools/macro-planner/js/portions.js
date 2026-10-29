// Food portions (SPEC §3.2): the units a food's amounts can be in, converted through grams. Pure:
// no DOM, so it can be tested in Node.
// A food's numbers are for its serving. A bundled food also has `grams`, the serving's weight,
// and `portions`, [{ unit, grams }] with grams the weight of 1 of the unit. A custom food has
// neither, so it has one unit, its serving's.

const GRAMS = 'g';

// Quantities show as entered (SPEC §5.2); a weight shows in whole grams (DESIGN §3).
const quantityFormat = new Intl.NumberFormat();
const gramsFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// The serving's weight in grams: a bundled food always has `grams`; a custom food has it only
// once it's given one (SPEC §3.2), except a serving already counted in grams, whose weight is
// its quantity, known without being stored.
function servingGrams(food) {
  if (food.grams) return food.grams;
  return food.serving.unit === GRAMS ? food.serving.qty : undefined;
}

// The units a food's amounts can be in, each once, the default first: the serving's unit, then
// grams if the serving isn't in grams, then the portions. A custom food with no weight for its
// serving has only its own unit (SPEC §3.2).
export function foodUnits(food) {
  if (!servingGrams(food)) return [food.serving.unit];
  const portionUnits = (food.portions ?? []).map((portion) => portion.unit);
  return [...new Set([food.serving.unit, GRAMS, ...portionUnits])];
}

export function assertUnit(food, unit) {
  if (!foodUnits(food).includes(unit)) throw new RangeError(`${food.name ?? food.id} has no unit ${unit}`);
}

// The serving's unit weighs the serving over its qty: with a 2 tbsp, 32 g serving, 1 tbsp is 16 g.
function gramsPerUnit(food, unit) {
  assertUnit(food, unit);
  if (unit === food.serving.unit) return servingGrams(food) / food.serving.qty;
  if (unit === GRAMS) return 1;
  return food.portions.find((portion) => portion.unit === unit).grams;
}

// qty of unit as a number of the food's servings, so its numbers times this are the amount's:
// 1 cup of cooked rice, 158 g, is 1.58 of its 100 g servings. Without a unit, qty is in the
// serving's, which needs no grams, so a custom food works too.
export function toServings(food, qty, unit = food.serving.unit) {
  if (unit === food.serving.unit) return qty / food.serving.qty;
  return (qty * gramsPerUnit(food, unit)) / servingGrams(food);
}

// qty of from, in to: 1 cup of cooked rice is 158 g.
export function convertAmount(food, qty, from, to) {
  if (from === to) return qty;
  return (qty * gramsPerUnit(food, from)) / gramsPerUnit(food, to);
}

// Where an amount starts (SPEC §3.2): 1 of the first portion, the food's default, else one
// serving. Search results and the Foods list show a food at this amount.
export function defaultAmount(food) {
  const [first] = food.portions ?? [];
  return first ? { qty: 1, unit: first.unit } : { qty: food.serving.qty, unit: food.serving.unit };
}

// An amount as a food row's eyebrow shows it (DESIGN §8): "1 cup · 158 g", with its weight on a
// food with portions, or just "100 g" or "1 egg" on one without.
export function amountLabel(food, { qty, unit }) {
  const amount = `${quantityFormat.format(qty)} ${unit}`;
  if (unit === GRAMS || !food.portions?.length) return amount;
  return `${amount} · ${gramsFormat.format(convertAmount(food, qty, unit, GRAMS))} ${GRAMS}`;
}
