import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, ingredientsTotals, mealTotals } from '../js/calc.js';
import {
  addEntry,
  createCoreDoc,
  emptyDay,
  foodEntry,
  mealEntry,
  quickEntry,
  recentEntries,
  repeatEntry,
  resetEntryIngredients,
  setEntryIngredients,
} from '../js/data.js';
import { addIngredient, mealIngredients, setIngredientQty, swapIngredient } from '../js/ingredients.js';
import { lockPastDays } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

const numbersOf = ({ kcal, protein, fat, carbs }) => ({ kcal, protein, fat, carbs });

// Test fixtures with made-up round numbers, not real nutrition data.
const food = (id, name, emoji, serving, kcal, protein, fat, carbs) => ({ id, name, emoji, serving, kcal, protein, fat, carbs });
const EGG = food('egg', 'Egg, large', '🥚', { qty: 1, unit: 'egg' }, 70, 6, 5, 0.5);
const SOURDOUGH = food('sourdough', 'Bread, sourdough', '🍞', { qty: 1, unit: 'slice' }, 120, 4, 1, 23);
const RYE = food('rye', 'Bread, rye', '🍞', { qty: 1, unit: 'slice' }, 80, 3, 1, 15);
const BUTTER = food('butter', 'Butter', '🧈', { qty: 10, unit: 'g' }, 72, 0, 8, 0);
const JAM = food('custom-jam', 'Jam', '🍓', { qty: 1, unit: 'tbsp' }, 50, 0, 0, 13);
const getFood = foodLookup([EGG, SOURDOUGH, RYE, BUTTER, JAM]);

// 2 eggs (140 / 12 / 10 / 1) + 2 slices sourdough (240 / 8 / 2 / 46) + 10 g butter (72 / 0 / 8 / 0).
const SANDWICH = {
  ...createMeal({ name: 'Breakfast sandwich' }),
  emoji: '🥪',
  items: [{ foodId: 'egg', qty: 2 }, { foodId: 'sourdough', qty: 2 }, { foodId: 'butter', qty: 10 }],
};
const SANDWICH_TOTALS = { kcal: 452, protein: 20, fat: 20, carbs: 47 };
// 3 eggs and rye for sourdough: 210 / 18 / 15 / 1.5 + 160 / 6 / 2 / 30 + 72 / 0 / 8 / 0.
const EDITED = swapIngredient(setIngredientQty(mealIngredients(SANDWICH, getFood), 'egg', 3), 'sourdough', RYE, 2);
const EDITED_TOTALS = { kcal: 442, protein: 24, fat: 25, carbs: 31.5 };
const SHAKE = { kcal: 300, protein: 40, fat: 5, carbs: 20 };

const TODAY = '2026-10-19';
const LUNCH = { id: 'lunch-id', name: 'Lunch' };
const DINNER = { id: 'dinner-id', name: 'Dinner' };

// A day with quick numbers, then the sandwich added to Dinner.
function dayWithSandwich() {
  const sandwich = mealEntry(DINNER, SANDWICH, getFood);
  return { day: addEntry(addEntry(emptyDay(), quickEntry(DINNER, SHAKE, 'Shake')), sandwich), sandwich };
}

// --- Adding a meal ---

test("an added meal keeps its ingredients, and its numbers are exactly their total", () => {
  const entry = mealEntry(DINNER, SANDWICH, getFood);
  assert.deepEqual(entry.ingredients, mealIngredients(SANDWICH, getFood));
  assert.deepEqual(numbersOf(entry), ingredientsTotals(entry.ingredients));
  assertTotals(entry, mealTotals(SANDWICH, getFood));
  assertTotals(entry, SANDWICH_TOTALS);
  assert.equal(Object.hasOwn(entry, 'originalIngredients'), false, 'not edited');
});

// --- Changing it ---

test('an edit makes the new list’s total the entry’s numbers and keeps the list as added', () => {
  const { day, sandwich } = dayWithSandwich();
  const edited = setEntryIngredients(day, sandwich.id, EDITED);
  const [shake, entry] = edited.entries;

  assert.deepEqual(entry.ingredients, EDITED);
  assert.deepEqual(numbersOf(entry), ingredientsTotals(EDITED));
  assertTotals(entry, EDITED_TOTALS);
  assert.deepEqual(entry.originalIngredients, sandwich.ingredients);
  // Still the same entry, in the same slot.
  const { id, slotId, slotName, label, emoji, source } = entry;
  assert.deepEqual(
    { id, slotId, slotName, label, emoji, source },
    { id: sandwich.id, slotId: 'dinner-id', slotName: 'Dinner', label: 'Breakfast sandwich', emoji: '🥪', source: 'meal' },
  );

  // The day's total moves with it, and nothing else does.
  assertTotals(dayTotal(edited, [], getFood), { kcal: 300 + 442, protein: 40 + 24, fat: 5 + 25, carbs: 20 + 31.5 });
  assert.equal(shake, day.entries[0]);
  assert.equal(day.entries[1], sandwich, 'the day passed in is left as it was');
  assert.equal(Object.hasOwn(sandwich, 'originalIngredients'), false);
});

test('a second edit keeps the list as first added, not the one in between', () => {
  const { day, sandwich } = dayWithSandwich();
  const once = setEntryIngredients(day, sandwich.id, EDITED);
  const more = addIngredient(EDITED, JAM, 1);
  const [, entry] = setEntryIngredients(once, sandwich.id, more).entries;
  assert.deepEqual(entry.ingredients, more);
  assertTotals(entry, { kcal: 492, protein: 24, fat: 25, carbs: 44.5 });
  assert.deepEqual(entry.originalIngredients, sandwich.ingredients);
});

test('reset gives back the ingredients and numbers exactly as added, and drops the kept list', () => {
  const { day, sandwich } = dayWithSandwich();
  const twice = setEntryIngredients(setEntryIngredients(day, sandwich.id, EDITED), sandwich.id, addIngredient(EDITED, JAM, 1));
  const reset = resetEntryIngredients(twice, sandwich.id);
  // The whole entry, as it was added: not within a hair, but the same numbers.
  assert.deepEqual(reset.entries[1], sandwich);
  assert.equal(Object.hasOwn(reset.entries[1], 'originalIngredients'), false);
  assert.deepEqual(dayTotal(reset, [], getFood), dayTotal(day, [], getFood));

  // An entry that was never edited has nothing to reset.
  assert.deepEqual(resetEntryIngredients(day, sandwich.id).entries, day.entries);
});

test('an edit with no ingredients left, or on an entry with none to change, is refused', () => {
  const { day, sandwich } = dayWithSandwich();
  assert.throws(() => setEntryIngredients(day, sandwich.id, []), RangeError);

  const shake = day.entries[0];
  assert.throws(() => setEntryIngredients(day, shake.id, EDITED), RangeError, 'quick numbers');
  const rye = foodEntry(DINNER, RYE, 2);
  assert.throws(() => setEntryIngredients(addEntry(day, rye), rye.id, EDITED), RangeError, 'a food');
  // A meal added before entries kept their ingredients.
  const { ingredients, ...older } = sandwich;
  const olderDay = { ...day, entries: [day.entries[0], older] };
  assert.throws(() => setEntryIngredients(olderDay, older.id, EDITED), RangeError, 'an older meal');
});

test('an entry that isn’t in the day, say one removed on another device, leaves the day as it was', () => {
  const { day } = dayWithSandwich();
  assert.deepEqual(setEntryIngredients(day, 'gone', EDITED).entries, day.entries);
  assert.deepEqual(resetEntryIngredients(day, 'gone').entries, day.entries);
});

// --- Recent ---

test('a Recent entry added again keeps its edited ingredients, without the list it was first added with', () => {
  const doc = createCoreDoc('2026-10-12');
  const { day, sandwich } = dayWithSandwich();
  // Edited on the 17th, then locked in with the rest of the week, as it was.
  const daysDoc = lockPastDays({ '2026-10-17': setEntryIngredients(day, sandwich.id, EDITED) }, TODAY, doc, []);
  const locked = daysDoc['2026-10-17'].entries.find((entry) => entry.id === sandwich.id);
  assert.deepEqual(locked.originalIngredients, sandwich.ingredients);

  const recent = recentEntries(daysDoc, TODAY).find(({ entry }) => entry.label === 'Breakfast sandwich');
  const again = repeatEntry(LUNCH, recent.entry);
  assert.notEqual(again.id, sandwich.id);
  assert.equal(again.slotName, 'Lunch');
  assert.deepEqual(again.ingredients, EDITED);
  assert.deepEqual(numbersOf(again), numbersOf(locked));
  assert.equal(Object.hasOwn(again, 'originalIngredients'), false, 'a new add, so not edited');

  // Its meal as added is the edited one, so a reset after another edit comes back to it.
  const today = addEntry(emptyDay(), again);
  const changed = setEntryIngredients(today, again.id, addIngredient(EDITED, JAM, 1));
  assert.deepEqual(changed.entries[0].originalIngredients, EDITED);
  assert.deepEqual(resetEntryIngredients(changed, again.id).entries[0], again);
});

test('food and quick numbers added again have no ingredients', () => {
  for (const entry of [foodEntry(DINNER, RYE, 2), quickEntry(DINNER, SHAKE, 'Shake')]) {
    assert.equal(Object.hasOwn(repeatEntry(LUNCH, entry), 'ingredients'), false, entry.source);
  }
});
