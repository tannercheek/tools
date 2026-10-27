import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealTotals } from '../js/calc.js';
import { createCoreDoc } from '../js/data.js';
import {
  addItem,
  addMeal,
  allTags,
  createMeal,
  deleteMeal,
  duplicateMeal,
  filterMeals,
  foodLookup,
  isMealPlanned,
  removeItem,
  renameMeal,
  setMealEmoji,
  setMealTags,
  swapItem,
  updateItem,
  updateMeal,
} from '../js/saved-meals.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

// Test fixtures with made-up round numbers, not real nutrition data. grams is the serving's
// weight, and a portion's is 1 of its unit's (SPEC §3.2).
const RICE = {
  id: 'rice', serving: { qty: 100, unit: 'g' }, grams: 100, portions: [{ unit: 'cup', grams: 158 }],
  kcal: 130, protein: 2.5, fat: 0.3, carbs: 28,
};
const BEEF = { id: 'beef', serving: { qty: 100, unit: 'g' }, kcal: 250, protein: 26, fat: 15, carbs: 0 };
const EGG = { id: 'egg', serving: { qty: 1, unit: 'egg' }, kcal: 70, protein: 6, fat: 5, carbs: 0.5 };
const WHITE_BREAD = { id: 'white-bread', serving: { qty: 1, unit: 'slice' }, grams: 30, kcal: 80, protein: 3, fat: 1, carbs: 15 };
const GF_BREAD = { id: 'gf-bread', serving: { qty: 1, unit: 'slice' }, grams: 35, kcal: 90, protein: 2, fat: 2, carbs: 17 };
const getFood = foodLookup([RICE, BEEF, EGG, WHITE_BREAD, GF_BREAD]);

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected) {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= 1e-9, `${key}: expected ${expected[key]}, got ${actual[key]}`);
  }
}

function riceAndBeef() {
  return addItem(addItem(createMeal({ name: 'Rice & beef', emoji: '🍚' }), RICE, 200), BEEF, 150);
}
// 200 g rice (260 / 5 / 0.6 / 56) + 150 g beef (375 / 39 / 22.5 / 0).
const RICE_AND_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };

function docWith(meals) {
  return { ...createCoreDoc('2026-10-15'), meals };
}

// --- Finding foods ---

test('foodLookup finds bundled, custom and archived foods by id', () => {
  const archived = { ...EGG, id: 'custom-old', custom: true, archived: true };
  const find = foodLookup([RICE, archived]);
  assert.equal(find('rice'), RICE);
  assert.equal(find('custom-old'), archived);
  assert.equal(find('beef'), undefined);
});

// --- Creating ---

test('a new meal gets a uuid id and no items', () => {
  const meal = createMeal({ name: 'Oats', emoji: '🥣' });
  assert.match(meal.id, UUID);
  assert.deepEqual({ ...meal, id: null }, { id: null, name: 'Oats', emoji: '🥣', items: [] });
  assert.notEqual(createMeal({ name: 'Oats' }).id, meal.id);
  assert.deepEqual(mealTotals(meal, getFood), ZERO);
});

test('a new meal uses 🍽️ until an emoji is picked', () => {
  assert.equal(createMeal({ name: 'Oats' }).emoji, '🍽️');
});

// --- Changing a meal ---

test('renaming changes only the name', () => {
  const meal = riceAndBeef();
  const renamed = renameMeal(meal, 'Beef bowl');
  assert.equal(renamed.name, 'Beef bowl');
  assert.deepEqual({ ...renamed, name: meal.name }, meal);
});

test('setting the emoji changes only the emoji', () => {
  const meal = riceAndBeef();
  const changed = setMealEmoji(meal, '🥩');
  assert.equal(changed.emoji, '🥩');
  assert.deepEqual({ ...changed, emoji: meal.emoji }, meal);
});

test('added items are kept in order, and the totals add them up', () => {
  const meal = riceAndBeef();
  assert.deepEqual(meal.items, [
    { foodId: 'rice', qty: 200, unit: 'g' },
    { foodId: 'beef', qty: 150, unit: 'g' },
  ]);
  assertTotals(mealTotals(meal, getFood), RICE_AND_BEEF_TOTALS);
});

test('quantities can be fractions of a serving', () => {
  const meal = addItem(createMeal({ name: 'Eggs' }), EGG, 1.5);
  assert.deepEqual(meal.items, [{ foodId: 'egg', qty: 1.5, unit: 'egg' }]);
  assertTotals(mealTotals(meal, getFood), { kcal: 105, protein: 9, fat: 7.5, carbs: 0.75 });
});

test('adding a food that’s already in the meal adds to its quantity', () => {
  const meal = addItem(riceAndBeef(), RICE, 50);
  assert.deepEqual(meal.items, [
    { foodId: 'rice', qty: 250, unit: 'g' },
    { foodId: 'beef', qty: 150, unit: 'g' },
  ]);
  // 250 g rice (325 / 6.25 / 0.75 / 70) + 150 g beef.
  assertTotals(mealTotals(meal, getFood), { kcal: 700, protein: 45.25, fat: 23.25, carbs: 70 });
});

test('updating an item sets its quantity and keeps its place', () => {
  const meal = updateItem(riceAndBeef(), 'rice', 100);
  assert.deepEqual(meal.items, [
    { foodId: 'rice', qty: 100, unit: 'g' },
    { foodId: 'beef', qty: 150, unit: 'g' },
  ]);
  assertTotals(mealTotals(meal, getFood), { kcal: 505, protein: 41.5, fat: 22.8, carbs: 28 });
});

test('removing an item drops only that food, and an emptied meal totals zero', () => {
  const beefOnly = removeItem(riceAndBeef(), 'rice');
  assert.deepEqual(beefOnly.items, [{ foodId: 'beef', qty: 150, unit: 'g' }]);
  assertTotals(mealTotals(beefOnly, getFood), { kcal: 375, protein: 39, fat: 22.5, carbs: 0 });

  const empty = removeItem(beefOnly, 'beef');
  assert.deepEqual(empty.items, []);
  assert.deepEqual(mealTotals(empty, getFood), ZERO);
});

test('updating, removing or swapping a food that isn’t in the meal changes nothing', () => {
  const meal = riceAndBeef();
  assert.deepEqual(updateItem(meal, 'egg', 2), meal);
  assert.deepEqual(removeItem(meal, 'egg'), meal);
  assert.deepEqual(swapItem(meal, 'egg', GF_BREAD, 2), meal);
  assert.deepEqual(swapItem(meal, 'egg', RICE, 1, 'cup'), meal);
});

test('quantities must be numbers above 0', () => {
  const meal = riceAndBeef();
  for (const qty of [0, -1, NaN, Infinity, '100', null, undefined]) {
    assert.throws(() => addItem(meal, EGG, qty), RangeError, `add ${qty}`);
    assert.throws(() => updateItem(meal, 'rice', qty), RangeError, `update ${qty}`);
    assert.throws(() => swapItem(meal, 'rice', EGG, qty), RangeError, `swap ${qty}`);
  }
});

test('changes to a meal leave the one passed in as it was', () => {
  const meal = riceAndBeef();
  const before = structuredClone(meal);
  renameMeal(meal, 'Beef bowl');
  setMealEmoji(meal, '🥩');
  addItem(meal, EGG, 2);
  addItem(meal, RICE, 50);
  updateItem(meal, 'beef', 100);
  removeItem(meal, 'rice');
  swapItem(meal, 'beef', EGG, 2);
  swapItem(meal, 'beef', RICE, 1, 'cup');
  setMealTags(meal, ['Dinner']);
  duplicateMeal(meal);
  assert.deepEqual(meal, before);
});

// --- Swapping a food (SPEC §3.3) ---

function eggToast() {
  return addItem(addItem(addItem(createMeal({ name: 'Egg toast', emoji: '🍳' }), EGG, 2), WHITE_BREAD, 2), BEEF, 50);
}

test('a swapped-in food takes the old one’s place at its amount, and the totals move', () => {
  const meal = eggToast();
  const swapped = swapItem(meal, 'white-bread', GF_BREAD, 2);
  assert.deepEqual(swapped.items, [
    { foodId: 'egg', qty: 2, unit: 'egg' },
    { foodId: 'gf-bread', qty: 2, unit: 'slice' },
    { foodId: 'beef', qty: 50, unit: 'g' },
  ]);
  // 2 eggs (140 / 12 / 10 / 1) + 50 g beef (125 / 13 / 7.5 / 0), with 2 slices of white bread
  // (160 / 6 / 2 / 30), then of gluten-free (180 / 4 / 4 / 34).
  assertTotals(mealTotals(meal, getFood), { kcal: 425, protein: 31, fat: 19.5, carbs: 31 });
  assertTotals(mealTotals(swapped, getFood), { kcal: 445, protein: 29, fat: 21.5, carbs: 35 });
});

test('a swap leaves the other items as they were', () => {
  const meal = eggToast();
  const swapped = swapItem(meal, 'white-bread', GF_BREAD, 2);
  assert.equal(swapped.items[0], meal.items[0]);
  assert.equal(swapped.items[2], meal.items[2]);
  assert.equal(swapped.id, meal.id);
  assert.equal(swapped.name, meal.name);
});

test('a swapped-in food is in the unit given, or its serving’s without one', () => {
  const meal = eggToast();
  assert.deepEqual(swapItem(meal, 'beef', RICE, 1, 'cup').items[2], { foodId: 'rice', qty: 1, unit: 'cup' });
  assert.deepEqual(swapItem(meal, 'egg', RICE, 150).items[0], { foodId: 'rice', qty: 150, unit: 'g' });
  assert.throws(() => swapItem(meal, 'beef', EGG, 1, 'cup'), RangeError);
});

test('swapping to a food already in the meal adds the amount to it, converted into its unit', () => {
  const meal = addItem(riceAndBeef(), EGG, 2);
  const swapped = swapItem(meal, 'beef', RICE, 1, 'cup');
  // 1 cup is 158 g, onto 200 g.
  assert.deepEqual(swapped.items, [
    { foodId: 'rice', qty: 358, unit: 'g' },
    { foodId: 'egg', qty: 2, unit: 'egg' },
  ]);
  assert.equal(swapped.items[1], meal.items[2]);
  // 358 g rice (465.4 / 8.95 / 1.074 / 100.24) + 2 eggs (140 / 12 / 10 / 1).
  assertTotals(mealTotals(swapped, getFood), { kcal: 605.4, protein: 20.95, fat: 11.074, carbs: 101.24 });
});

test('swapping a food for itself sets its amount and unit, in its place', () => {
  const swapped = swapItem(riceAndBeef(), 'rice', RICE, 1, 'cup');
  assert.deepEqual(swapped.items, [
    { foodId: 'rice', qty: 1, unit: 'cup' },
    { foodId: 'beef', qty: 150, unit: 'g' },
  ]);
});

// --- Tags ---

test('setting tags changes only the tags, and a new meal has none', () => {
  const meal = riceAndBeef();
  assert.equal('tags' in meal, false);
  const tagged = setMealTags(meal, ['Dinner', 'Mexican']);
  assert.deepEqual(tagged.tags, ['Dinner', 'Mexican']);
  assert.deepEqual({ ...tagged, tags: undefined }, { ...meal, tags: undefined });
});

test('tags are trimmed, and blank ones are dropped', () => {
  const meal = setMealTags(riceAndBeef(), ['  Dinner ', '   ', '', '\tPost-workout\n']);
  assert.deepEqual(meal.tags, ['Dinner', 'Post-workout']);
});

test('a tag typed in another case takes the spelling already in use', () => {
  const meal = setMealTags(riceAndBeef(), ['mexican', ' DINNER ', 'Spicy'], ['Dinner', 'Mexican']);
  assert.deepEqual(meal.tags, ['Mexican', 'Dinner', 'Spicy']);
});

test('a meal has each tag once, at its first spelling', () => {
  const meal = setMealTags(riceAndBeef(), ['Dinner', 'dinner', ' DINNER ', 'Mexican', 'Dinner']);
  assert.deepEqual(meal.tags, ['Dinner', 'Mexican']);
  const again = setMealTags(meal, [...meal.tags, 'mexican'], allTags([meal]));
  assert.deepEqual(again.tags, ['Dinner', 'Mexican']);
});

test('removing a tag keeps the rest in order, and removing the last leaves none', () => {
  const meal = setMealTags(riceAndBeef(), ['Breakfast', 'Dinner', 'Mexican']);
  const fewer = setMealTags(meal, meal.tags.filter((tag) => tag !== 'Dinner'));
  assert.deepEqual(fewer.tags, ['Breakfast', 'Mexican']);
  assert.deepEqual(setMealTags(fewer, []).tags, []);
});

test('the tag list is every tag the meals use, once each, A–Z ignoring case', () => {
  const meals = [
    setMealTags(createMeal({ name: 'Smoothie' }), ['Smoothies', 'breakfast']),
    setMealTags(createMeal({ name: 'Burrito' }), ['Mexican', 'Dinner']),
    setMealTags(createMeal({ name: 'Tacos' }), ['mexican', 'Dinner', 'BREAKFAST']),
  ];
  assert.deepEqual(allTags(meals), ['breakfast', 'Dinner', 'Mexican', 'Smoothies']);
  assert.deepEqual(allTags([]), []);
});

test('a tag no meal uses is gone from the tag list', () => {
  const smoothie = setMealTags(createMeal({ name: 'Smoothie' }), ['Smoothies', 'Breakfast']);
  const oats = setMealTags(createMeal({ name: 'Oats' }), ['Breakfast']);
  assert.deepEqual(allTags([setMealTags(smoothie, ['Breakfast']), oats]), ['Breakfast']);
});

test('filtering by a tag keeps the meals with it, in order, ignoring case', () => {
  const burrito = setMealTags(createMeal({ name: 'Burrito' }), ['Mexican', 'Dinner']);
  const oats = setMealTags(createMeal({ name: 'Oats' }), ['Breakfast']);
  const tacos = setMealTags(createMeal({ name: 'Tacos' }), ['Dinner', 'Mexican']);
  const meals = [burrito, oats, tacos];
  assert.deepEqual(filterMeals(meals, 'Mexican'), [burrito, tacos]);
  assert.deepEqual(filterMeals(meals, 'mexican'), [burrito, tacos]);
  assert.deepEqual(filterMeals(meals, 'Breakfast'), [oats]);
  assert.deepEqual(filterMeals(meals, 'Snacks'), []);
});

test('filtering by All (null) keeps every meal, tagged or not', () => {
  const meals = [setMealTags(createMeal({ name: 'Burrito' }), ['Mexican']), createMeal({ name: 'Oats' })];
  assert.deepEqual(filterMeals(meals, null), meals);
});

test('meals saved without tags have none, and can be given some', () => {
  const plain = { id: 'saved-before-tags', name: 'Oats', emoji: '🥣', items: [] };
  const tagged = setMealTags(createMeal({ name: 'Burrito' }), ['Mexican']);
  assert.deepEqual(allTags([plain]), []);
  assert.deepEqual(allTags([plain, tagged]), ['Mexican']);
  assert.deepEqual(filterMeals([plain, tagged], 'Mexican'), [tagged]);
  assert.deepEqual(setMealTags(plain, ['Breakfast']).tags, ['Breakfast']);
  assert.equal('tags' in duplicateMeal(plain), false);
});

// --- Duplicating ---

test('a duplicate gets its own id and a "copy" name, with the same emoji, items and totals', () => {
  const meal = riceAndBeef();
  const copy = duplicateMeal(meal);
  assert.match(copy.id, UUID);
  assert.notEqual(copy.id, meal.id);
  assert.equal(copy.name, 'Rice & beef copy');
  assert.equal(copy.emoji, '🍚');
  assert.deepEqual(copy.items, meal.items);
  assertTotals(mealTotals(copy, getFood), RICE_AND_BEEF_TOTALS);
});

test('a duplicate keeps the original’s tags, in its own list', () => {
  const meal = setMealTags(riceAndBeef(), ['Dinner', 'Mexican']);
  const copy = duplicateMeal(meal);
  assert.deepEqual(copy.tags, ['Dinner', 'Mexican']);
  assert.notEqual(copy.tags, meal.tags);
  assert.deepEqual(filterMeals([meal, copy], 'Mexican'), [meal, copy]);
});

test('a duplicate’s items are its own, not shared with the original', () => {
  const meal = riceAndBeef();
  const copy = duplicateMeal(meal);
  copy.items.forEach((item, i) => assert.notEqual(item, meal.items[i]));
  assert.notEqual(copy.items, meal.items);
});

// --- Core doc changes ---

test('adding a meal appends it and leaves the old doc alone', () => {
  const first = createMeal({ name: 'Oats' });
  const doc = docWith([first]);
  const second = riceAndBeef();
  const next = addMeal(doc, second);
  assert.deepEqual(next.meals, [first, second]);
  assert.deepEqual(doc.meals, [first]);
  assert.equal(next.template, doc.template);
});

test('updating a meal applies the change to that meal only', () => {
  const oats = createMeal({ name: 'Oats' });
  const bowl = riceAndBeef();
  const doc = docWith([oats, bowl]);
  const next = updateMeal(doc, bowl.id, (meal) => renameMeal(addItem(meal, EGG, 2), 'Rice, beef & eggs'));
  assert.equal(next.meals[0], oats);
  assert.equal(next.meals[1].id, bowl.id);
  assert.equal(next.meals[1].name, 'Rice, beef & eggs');
  assert.deepEqual(next.meals[1].items.at(-1), { foodId: 'egg', qty: 2, unit: 'egg' });
  assert.equal(doc.meals[1], bowl);
  assert.equal(bowl.items.length, 2);
});

test('updating a meal that isn’t there changes nothing', () => {
  const doc = docWith([riceAndBeef()]);
  let called = false;
  const next = updateMeal(doc, 'gone', (meal) => {
    called = true;
    return meal;
  });
  assert.equal(called, false);
  assert.deepEqual(next, doc);
});

test('deleting a meal removes it and leaves the old doc alone', () => {
  const oats = createMeal({ name: 'Oats' });
  const bowl = riceAndBeef();
  const doc = docWith([oats, bowl]);
  const next = deleteMeal(doc, oats.id);
  assert.deepEqual(next.meals, [bowl]);
  assert.deepEqual(doc.meals, [oats, bowl]);
});

test('deleting a planned meal turns the slots that planned it into flex, and leaves the rest', () => {
  const oats = createMeal({ name: 'Oats' });
  const bowl = riceAndBeef();
  const base = docWith([oats, bowl]);
  const [breakfast, lunch, dinner] = base.slots;
  const budget = { kcal: 600, protein: 40, fat: 20, carbs: 60 };
  const doc = {
    ...base,
    template: {
      [breakfast.id]: { mealId: bowl.id, budget: null },
      [lunch.id]: { mealId: bowl.id, budget: null },
      [dinner.id]: { mealId: null, budget },
    },
  };

  const next = deleteMeal(doc, bowl.id);
  assert.deepEqual(next.template, {
    [breakfast.id]: { mealId: null, budget: null },
    [lunch.id]: { mealId: null, budget: null },
    [dinner.id]: { mealId: null, budget },
  });
  assert.equal(doc.template[breakfast.id].mealId, bowl.id);

  assert.deepEqual(deleteMeal(doc, oats.id).template, doc.template);
});

test('a meal is planned when a template slot holds it', () => {
  const bowl = riceAndBeef();
  const base = docWith([bowl]);
  const [, lunch] = base.slots;
  const doc = { ...base, template: { ...base.template, [lunch.id]: { mealId: bowl.id, budget: null } } };
  assert.equal(isMealPlanned(doc, bowl.id), true);
  assert.equal(isMealPlanned(base, bowl.id), false);
  assert.equal(isMealPlanned(doc, 'gone'), false);
});

test('doc changes work on a doc saved before it had meals', () => {
  const bare = { schemaVersion: 1 };
  assert.equal(addMeal(bare, createMeal({ name: 'Oats' })).meals.length, 1);
  assert.deepEqual(updateMeal(bare, 'gone', (meal) => meal).meals, []);
  assert.deepEqual(deleteMeal(bare, 'gone').meals, []);
  assert.equal(isMealPlanned(bare, 'gone'), false);
});
