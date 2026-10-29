import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastSevenDaysAverage } from '../js/calc.js';
import { addEntry, createCoreDoc, emptyDay, foodEntry, quickEntry } from '../js/data.js';
import { lockPastDays } from '../js/lock-in.js';
import { createMeal } from '../js/saved-meals.js';
import { addPlannedMeal, setSlotBudget } from '../js/slots.js';

// Old-shape day changes (SPEC §3.5), for checking lock-in still reads data saved before slots
// held items. See old-slot-model-reference.js.
const swapChange = (day, slotId, mealId) => ({ ...day, changes: { ...day.changes, [slotId]: { mealId } } });
const skipChange = (day, slotId) => ({ ...day, changes: { ...day.changes, [slotId]: { mealId: null } } });
const portionChange = (day, slotId, portion) => ({ ...day, changes: { ...day.changes, [slotId]: { portion } } });

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, name, kcal, protein, fat, carbs) => ({
  id,
  name,
  emoji: '🍚',
  serving: { qty: 100, unit: 'g' },
  kcal,
  protein,
  fat,
  carbs,
});
const RICE = per100g('rice', 'Rice', 100, 2, 0, 20);
const FOODS = [per100g('oats', 'Oats', 400, 10, 10, 60), RICE, per100g('beef', 'Beef', 200, 20, 10, 0)];

function meal(name, items) {
  return { ...createMeal({ name }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 400 / 10 / 10 / 60
const OATS = meal('Oats', [['oats', 100]]);
// 400 / 24 / 10 / 40
const RICE_BEEF = meal('Rice & beef', [['rice', 200], ['beef', 100]]);
// 300 / 6 / 0 / 60
const RICE_BOWL = meal('Rice bowl', [['rice', 300]]);
// 800 / 50 / 30 / 80
const DINNER_BUDGET = { kcal: 800, protein: 50, fat: 30, carbs: 80 };

const TODAY = '2026-10-15';

// Breakfast: Oats, Lunch: Rice & beef, Dinner: flex with a pinned budget, so a plain day is
// 1600 / 84 / 50 / 180. Started well before the window, so every day in it locks in.
function plannedDoc(startedOn = '2026-10-01') {
  let doc = { ...createCoreDoc(startedOn), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch, dinner] = doc.slots;
  doc = addPlannedMeal(doc, breakfast.id, OATS.id);
  doc = addPlannedMeal(doc, lunch.id, RICE_BEEF.id);
  return setSlotBudget(doc, dinner.id, DINNER_BUDGET);
}

const quick = (slot, kcal, protein, fat, carbs, label) => quickEntry(slot, { kcal, protein, fat, carbs }, label);

// The days doc on TODAY before lock-in: a week that strays from the plan in a different way each day.
function weekOfDays(doc) {
  const [breakfast, lunch, dinner] = doc.slots;
  return {
    // 8 days ago: outside the window, though the doc hasn't been saved, and so pruned, since.
    '2026-10-07': addEntry(emptyDay(), quick(dinner, 5000, 300, 200, 500, 'Feast')),
    // 2026-10-08 has no record: never opened, so on plan. 1600 / 84 / 50 / 180.
    // Lunch swapped for the rice bowl: 1500 / 66 / 40 / 200.
    '2026-10-09': swapChange(emptyDay(), lunch.id, RICE_BOWL.id),
    // Breakfast skipped, a bar added at lunch: 1400 / 84 / 45 / 145.
    '2026-10-10': addEntry(skipChange(emptyDay(), breakfast.id), quick(lunch, 200, 10, 5, 25, 'Bar')),
    // Off plan with nothing added: no entries, so it doesn't count.
    '2026-10-11': { ...emptyDay(), offPlan: true },
    // A 1.5× breakfast: 1800 / 89 / 55 / 210.
    '2026-10-12': portionChange(emptyDay(), breakfast.id, 1.5),
    // Dinner filled with 250 g of rice, so its budget no longer counts: 1050 / 39 / 20 / 150.
    '2026-10-13': addEntry(emptyDay(), foodEntry(dinner, RICE, 250)),
    // Off plan with a restaurant meal, which is all that counts: 1650 / 100 / 60 / 195.
    '2026-10-14': addEntry({ ...emptyDay(), offPlan: true }, quick(lunch, 1650, 100, 60, 195, 'Restaurant')),
    // Today: still in progress.
    '2026-10-15': addEntry(emptyDay(), quick(dinner, 9000, 500, 300, 900, 'Today')),
  };
}

const lockIn = (daysDoc, doc) => lockPastDays(daysDoc, TODAY, doc, FOODS);

test('a week of test data averages to the hand calculation', () => {
  const doc = plannedDoc();
  const { average, loggedDays } = lastSevenDaysAverage(lockIn(weekOfDays(doc), doc), TODAY);
  assert.equal(loggedDays, 6);
  // kcal: (1600 + 1500 + 1400 + 1800 + 1050 + 1650) / 6 = 9000 / 6
  // P:    (84 + 66 + 84 + 89 + 39 + 100) / 6 = 462 / 6
  // F:    (50 + 40 + 45 + 55 + 20 + 60) / 6 = 270 / 6
  // C:    (180 + 200 + 145 + 210 + 150 + 195) / 6 = 1080 / 6
  assertTotals(average, { kcal: 1500, protein: 77, fat: 45, carbs: 180 });
});

test('an off-plan day with nothing added doesn’t count, so 6 of the last 7 do', () => {
  const doc = plannedDoc();
  const locked = lockIn(weekOfDays(doc), doc);
  assert.deepEqual(locked['2026-10-11'].entries, []);
  assert.equal(lastSevenDaysAverage(locked, TODAY).loggedDays, 6);

  // On plan, the same day locks in its plan and counts, so all 7 do.
  const onPlan = lockIn({ ...weekOfDays(doc), '2026-10-11': emptyDay() }, doc);
  const { average, loggedDays } = lastSevenDaysAverage(onPlan, TODAY);
  assert.equal(loggedDays, 7);
  assertTotals(average, { kcal: 10600 / 7, protein: 546 / 7, fat: 320 / 7, carbs: 1260 / 7 });
});

test('today doesn’t count, and neither does 8 days ago', () => {
  const doc = plannedDoc();
  const { '2026-10-07': eightDaysAgo, '2026-10-15': today, ...window } = weekOfDays(doc);
  assert.ok(eightDaysAgo.entries.length > 0 && today.entries.length > 0);
  assert.deepEqual(
    lastSevenDaysAverage(lockIn(weekOfDays(doc), doc), TODAY),
    lastSevenDaysAverage(lockIn(window, doc), TODAY),
  );
});

test('a day with every slot skipped or open doesn’t count', () => {
  let doc = plannedDoc();
  const [breakfast, lunch, dinner] = doc.slots;
  // Dinner open, with no budget: a plain day is 800 / 34 / 20 / 100.
  doc = setSlotBudget(doc, dinner.id, null);
  const allSkipped = skipChange(skipChange(emptyDay(), breakfast.id), lunch.id);
  const locked = lockIn({ '2026-10-12': allSkipped }, doc);
  assert.deepEqual(locked['2026-10-12'].entries, []);
  const { average, loggedDays } = lastSevenDaysAverage(locked, TODAY);
  assert.equal(loggedDays, 6);
  assertTotals(average, { kcal: 800, protein: 34, fat: 20, carbs: 100 });
});

test('days before the app was first used don’t count', () => {
  // Started 2 days ago: those 2 days lock in on plan, and the 5 before stay empty.
  const twoDaysIn = lastSevenDaysAverage(lockIn({}, plannedDoc('2026-10-13')), TODAY);
  assert.equal(twoDaysIn.loggedDays, 2);
  assertTotals(twoDaysIn.average, { kcal: 1600, protein: 84, fat: 50, carbs: 180 });

  // A first run, started today: nothing has passed yet.
  assert.deepEqual(lastSevenDaysAverage(lockIn({}, plannedDoc(TODAY)), TODAY), { average: null, loggedDays: 0 });
});
