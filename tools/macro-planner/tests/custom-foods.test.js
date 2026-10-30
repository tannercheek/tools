import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealTotals } from '../js/calc.js';
import {
  addCustomFood,
  createCustomFood,
  deleteCustomFood,
  isFoodInUse,
  parseAmount,
  readFoodForm,
  unitsInUse,
  unitUsedBy,
  updateCustomFood,
} from '../js/custom-foods.js';
import { createCoreDoc } from '../js/data.js';
import { foodUnits } from '../js/portions.js';
import { searchFoods } from '../js/search.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Test fixtures with made-up round numbers, not real nutrition data.
const FORM = {
  name: '  Skyr, plain  ',
  servingQty: '150',
  servingUnit: ' g ',
  kcal: '90',
  protein: '16.5',
  fat: '0',
  carbs: '6',
  emoji: '🥛',
};

function food(id, name, numbers = { kcal: 100, protein: 10, fat: 5, carbs: 1 }) {
  return { id, name, serving: { qty: 100, unit: 'g' }, emoji: '🍽️', ...numbers, custom: true, archived: false };
}

function docWith(foods, meals = []) {
  return { ...createCoreDoc('2026-10-15'), foods, meals };
}

// --- Reading the form ---

test('amounts can be whole, decimal, or start or end at the point', () => {
  assert.equal(parseAmount('34'), 34);
  assert.equal(parseAmount('34.5'), 34.5);
  assert.equal(parseAmount(' 0.5 '), 0.5);
  assert.equal(parseAmount('.5'), 0.5);
  assert.equal(parseAmount('5.'), 5);
  assert.equal(parseAmount('0'), 0);
});

test('blanks, signs, commas, exponents and words aren’t amounts', () => {
  for (const text of ['', '   ', '-1', '+1', '1,5', '1,000', '1e3', '1.2.3', '.', 'abc', '12g']) {
    assert.equal(parseAmount(text), null, JSON.stringify(text));
  }
});

test('a complete form gives the food’s fields, trimmed and as numbers', () => {
  const { fields, errors } = readFoodForm(FORM);
  assert.deepEqual(errors, {});
  assert.deepEqual(fields, {
    name: 'Skyr, plain',
    serving: { qty: 150, unit: 'g' },
    emoji: '🥛',
    kcal: 90,
    protein: 16.5,
    fat: 0,
    carbs: 6,
  });
});

test('each field left empty gets its own error, and no fields come back', () => {
  for (const key of ['name', 'servingQty', 'servingUnit', 'kcal', 'protein', 'fat', 'carbs']) {
    const { fields, errors } = readFoodForm({ ...FORM, [key]: '  ' });
    assert.equal(fields, null, key);
    assert.deepEqual(Object.keys(errors), [key]);
  }
});

test('a serving of 0 is an error, but 0 of a macro is fine', () => {
  assert.deepEqual(Object.keys(readFoodForm({ ...FORM, servingQty: '0' }).errors), ['servingQty']);
  assert.deepEqual(readFoodForm({ ...FORM, kcal: '0', protein: '0', fat: '0', carbs: '0' }).errors, {});
});

test('every wrong field is reported at once', () => {
  const { errors } = readFoodForm({ ...FORM, name: '', protein: 'lots', carbs: '-2' });
  assert.deepEqual(Object.keys(errors), ['name', 'protein', 'carbs']);
});

// --- Records ---

test('a new custom food gets a custom- uuid id and isn’t archived', () => {
  const created = createCustomFood(readFoodForm(FORM).fields);
  assert.match(created.id, /^custom-/);
  assert.match(created.id.slice('custom-'.length), UUID);
  assert.equal(created.custom, true);
  assert.equal(created.archived, false);
  assert.equal(created.emoji, '🥛');
  assert.notEqual(createCustomFood(readFoodForm(FORM).fields).id, created.id);
});

test('a duplicated bundled food becomes a new custom food with the same emoji and numbers', () => {
  const bundled = { ...food('usda-1', 'Egg, large'), emoji: '🥚', custom: false };
  const values = {
    name: bundled.name,
    servingQty: String(bundled.serving.qty),
    servingUnit: bundled.serving.unit,
    kcal: String(bundled.kcal),
    protein: String(bundled.protein),
    fat: String(bundled.fat),
    carbs: String(bundled.carbs),
    emoji: bundled.emoji,
  };
  const copy = createCustomFood(readFoodForm(values).fields);
  assert.equal(copy.emoji, '🥚');
  assert.equal(copy.custom, true);
  assert.notEqual(copy.id, bundled.id);
  assert.deepEqual({ ...copy, id: bundled.id, custom: false }, bundled);
});

// --- Category (SPEC §3.2) ---

test('a category passed in the fields is kept; a custom food without one has none', () => {
  const withCategory = createCustomFood({ ...readFoodForm(FORM).fields, category: 'Dairy & eggs' });
  assert.equal(withCategory.category, 'Dairy & eggs');
  const withoutCategory = createCustomFood(readFoodForm(FORM).fields);
  assert.equal('category' in withoutCategory, false);
});

test('duplicating a bundled food with a category keeps it', () => {
  const bundled = { ...food('usda-1', 'Egg, large'), emoji: '🥚', category: 'Dairy & eggs', custom: false };
  const copy = createCustomFood({ ...readFoodForm(FORM).fields, emoji: bundled.emoji, category: bundled.category });
  assert.equal(copy.category, bundled.category);
});

// --- Units (SPEC §3.2) ---

test('a serving weight and portions are kept when the weight is above 0, each unit its own', () => {
  const fields = { ...readFoodForm(FORM).fields, grams: 150, portions: [{ unit: 'cup', grams: 240 }] };
  const created = createCustomFood(fields);
  assert.equal(created.grams, 150);
  assert.deepEqual(created.portions, [{ unit: 'cup', grams: 240 }]);
  assert.deepEqual(foodUnits(created), ['g', 'cup']);
});

test('a weight of 0 or less is dropped, and its portions with it, on a serving not in g', () => {
  const base = { name: 'Protein bar', serving: { qty: 1, unit: 'bar' }, emoji: '🍫', kcal: 200, protein: 20, fat: 5, carbs: 15 };
  const created = createCustomFood({ ...base, grams: 0, portions: [{ unit: 'g', grams: 1 }] });
  assert.equal(created.grams, undefined);
  assert.deepEqual(created.portions, []);
  assert.deepEqual(foodUnits(created), ['bar']);
});

test('a serving already counted in g keeps its portions with no weight of its own entered', () => {
  // FORM’s serving is 150 g; the form never shows a weight field for it (14.21), so no grams is
  // passed at all, only the portions picked in the form.
  const fields = { ...readFoodForm(FORM).fields, portions: [{ unit: 'tub', grams: 450 }] };
  assert.equal('grams' in fields, false);
  const created = createCustomFood(fields);
  assert.equal(created.grams, 150);
  assert.deepEqual(created.portions, [{ unit: 'tub', grams: 450 }]);
  assert.deepEqual(foodUnits(created), ['g', 'tub']);
});

test('a portion can’t repeat a unit, or name "g" or the serving’s own unit', () => {
  const fields = {
    ...readFoodForm(FORM).fields,
    grams: 150,
    portions: [{ unit: 'cup', grams: 240 }, { unit: 'g', grams: 1 }, { unit: 'g', grams: 150 }, { unit: 'cup', grams: 250 }],
  };
  const created = createCustomFood(fields);
  assert.deepEqual(created.portions, [{ unit: 'cup', grams: 240 }]);
});

test('a food never given a weight or portions keeps its old shape exactly', () => {
  const doc = docWith([food('custom-a', 'A')]);
  const next = updateCustomFood(doc, 'custom-a', { name: 'A, renamed' });
  assert.equal('grams' in next.foods[0], false);
  assert.equal('portions' in next.foods[0], false);
});

test('updating a food keeps its weight and portions when the update doesn’t touch them', () => {
  const doc = docWith([{ ...food('custom-a', 'A'), grams: 150, portions: [{ unit: 'cup', grams: 240 }] }]);
  const next = updateCustomFood(doc, 'custom-a', { name: 'A, renamed' });
  assert.equal(next.foods[0].grams, 150);
  assert.deepEqual(next.foods[0].portions, [{ unit: 'cup', grams: 240 }]);
});

test('duplicating a bundled food into a custom one keeps its weight and portions', () => {
  const bundled = { ...food('usda-1', 'Rice, white, cooked'), grams: 100, portions: [{ unit: 'cup', grams: 158 }], custom: false };
  const fields = { ...readFoodForm(FORM).fields, grams: bundled.grams, portions: bundled.portions };
  const copy = createCustomFood(fields);
  assert.equal(copy.grams, 100);
  assert.deepEqual(copy.portions, [{ unit: 'cup', grams: 158 }]);
  assert.deepEqual(foodUnits(copy), foodUnits(bundled));
});

test('a unit used in a meal or planned in a slot is found by unitsInUse', () => {
  const meal = { id: 'm1', name: 'Bowl', emoji: '🍚', items: [{ foodId: 'custom-a', qty: 1, unit: 'cup' }] };
  const withMeal = docWith([food('custom-a', 'A')], [meal]);
  assert.deepEqual(unitsInUse('custom-a', withMeal), ['cup']);

  const bare = { ...createCoreDoc('2026-10-15'), foods: [food('custom-b', 'B')] };
  const slotId = bare.slots[0].id;
  const planned = {
    ...bare,
    template: { ...bare.template, [slotId]: { items: [{ id: 'food-custom-b', foodId: 'custom-b', qty: 1, unit: 'scoop' }] } },
  };
  assert.deepEqual(unitsInUse('custom-b', planned), ['scoop']);
  assert.deepEqual(unitsInUse('custom-a', planned), []);
});

test('unitsInUse leaves out items with no unit and other foods', () => {
  const meal = {
    id: 'm1', name: 'Bowl', emoji: '🍚',
    items: [{ foodId: 'custom-a', qty: 100 }, { foodId: 'custom-b', qty: 1, unit: 'cup' }],
  };
  const doc = docWith([food('custom-a', 'A'), food('custom-b', 'B')], [meal]);
  assert.deepEqual(unitsInUse('custom-a', doc), []);
  assert.deepEqual(unitsInUse('custom-b', doc), ['cup']);
});

test('unitUsedBy names the meal or slot a unit is counted in, meals checked first', () => {
  const meal = { id: 'm1', name: 'Smoothie', emoji: '🥤', items: [{ foodId: 'custom-a', qty: 1, unit: 'scoop' }] };
  const withMeal = docWith([food('custom-a', 'A')], [meal]);
  assert.equal(unitUsedBy('custom-a', 'scoop', withMeal), 'Smoothie');
  assert.equal(unitUsedBy('custom-a', 'cup', withMeal), null);

  const bare = { ...createCoreDoc('2026-10-15'), foods: [food('custom-b', 'B')] };
  const slotId = bare.slots[0].id;
  const planned = {
    ...bare,
    template: { ...bare.template, [slotId]: { items: [{ id: 'food-custom-b', foodId: 'custom-b', qty: 1, unit: 'tub' }] } },
  };
  assert.equal(unitUsedBy('custom-b', 'tub', planned), bare.slots[0].name);
  assert.equal(unitUsedBy('custom-b', 'g', planned), null);
});

// --- Core doc changes ---

test('adding a food appends it and leaves the old doc alone', () => {
  const doc = docWith([food('custom-a', 'A')]);
  const next = addCustomFood(doc, food('custom-b', 'B'));
  assert.deepEqual(next.foods.map(({ id }) => id), ['custom-a', 'custom-b']);
  assert.equal(doc.foods.length, 1);
  assert.equal(next.slots, doc.slots);
});

test('editing a food changes its fields but keeps its id, custom and archived flags', () => {
  const doc = docWith([food('custom-a', 'A'), food('custom-b', 'B')]);
  const next = updateCustomFood(doc, 'custom-b', readFoodForm(FORM).fields);
  assert.deepEqual(next.foods[0], doc.foods[0]);
  assert.equal(next.foods[1].id, 'custom-b');
  assert.equal(next.foods[1].name, 'Skyr, plain');
  assert.equal(next.foods[1].kcal, 90);
  assert.equal(next.foods[1].custom, true);
  assert.equal(next.foods[1].archived, false);
  assert.equal(doc.foods[1].name, 'B');
});

test('a food is in use when any meal lists it', () => {
  const doc = docWith(
    [food('custom-a', 'A'), food('custom-b', 'B')],
    [{ id: 'm1', name: 'Bowl', emoji: '🍚', items: [{ foodId: 'usda-1', qty: 1 }, { foodId: 'custom-a', qty: 2 }] }],
  );
  assert.equal(isFoodInUse(doc, 'custom-a'), true);
  assert.equal(isFoodInUse(doc, 'custom-b'), false);
});

test('deleting a food no meal uses removes it', () => {
  const doc = docWith([food('custom-a', 'A'), food('custom-b', 'B')]);
  const next = deleteCustomFood(doc, 'custom-a');
  assert.deepEqual(next.foods.map(({ id }) => id), ['custom-b']);
  assert.equal(doc.foods.length, 2);
});

test('deleting a food a meal uses archives it instead', () => {
  const meal = { id: 'm1', name: 'Bowl', emoji: '🍚', items: [{ foodId: 'custom-a', qty: 150 }] };
  const doc = docWith([food('custom-a', 'A'), food('custom-b', 'B')], [meal]);
  const next = deleteCustomFood(doc, 'custom-a');
  assert.deepEqual(
    next.foods.map(({ id, archived }) => [id, archived]),
    [
      ['custom-a', true],
      ['custom-b', false],
    ],
  );
  assert.equal(doc.foods[0].archived, false);
});

test('an archived food leaves search but still counts in its meal', () => {
  const meal = { id: 'm1', name: 'Bowl', emoji: '🍚', items: [{ foodId: 'custom-a', qty: 150 }] };
  const doc = deleteCustomFood(docWith([food('custom-a', 'Chicken wrap')], [meal]), 'custom-a');
  assert.deepEqual(searchFoods(doc.foods, 'chicken'), []);
  const getFood = (id) => doc.foods.find((f) => f.id === id);
  assert.deepEqual(mealTotals(meal, getFood), { kcal: 150, protein: 15, fat: 7.5, carbs: 1.5 });
});

test('changes work on a doc saved before it had foods or meals', () => {
  const bare = { schemaVersion: 1 };
  assert.equal(addCustomFood(bare, food('custom-a', 'A')).foods.length, 1);
  assert.equal(isFoodInUse(bare, 'custom-a'), false);
  assert.deepEqual(deleteCustomFood(bare, 'custom-a').foods, []);
});
