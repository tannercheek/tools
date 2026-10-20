import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, slotTotals } from '../js/calc.js';
import { createCoreDoc, emptyDay } from '../js/data.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { clearSlotChange, daySlots, setSlotMeal, setSlotPortion, skipSlot, swapSlot } from '../js/slots.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, kcal, protein, fat, carbs) => ({ id, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const getFood = foodLookup([
  per100g('oats', 380, 13, 7, 68),
  { id: 'whey', serving: { qty: 30, unit: 'g' }, kcal: 120, protein: 24, fat: 1.5, carbs: 3 },
  per100g('rice', 130, 2.5, 0.3, 28),
  per100g('beef', 250, 26, 15, 0),
]);

function meal(name, items) {
  return { ...createMeal({ name }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 80 g oats (304 / 10.4 / 5.6 / 54.4) + 30 g whey (120 / 24 / 1.5 / 3).
const OATS = meal('Oats & whey', [['oats', 80], ['whey', 30]]);
const OATS_TOTALS = { kcal: 424, protein: 34.4, fat: 7.1, carbs: 57.4 };
// 200 g rice (260 / 5 / 0.6 / 56) + 150 g beef (375 / 39 / 22.5 / 0).
const RICE_BEEF = meal('Rice & beef', [['rice', 200], ['beef', 150]]);
const RICE_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };
// 300 g rice.
const RICE_BOWL = meal('Rice bowl', [['rice', 300]]);
const RICE_BOWL_TOTALS = { kcal: 390, protein: 7.5, fat: 0.9, carbs: 84 };

const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

// Breakfast: Oats & whey, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));

function withBudget(doc, slotId, budget) {
  return { ...doc, template: { ...doc.template, [slotId]: { ...doc.template[slotId], budget } } };
}

function day(fields) {
  return { ...emptyDay(), ...fields };
}

function entry(slotId, numbers, label = 'Entry') {
  return { id: crypto.randomUUID(), slotId, slotName: 'Saved name', label, emoji: '🍽️', source: 'quick', ...numbers };
}

const total = (doc, d) => dayTotal(d, daySlots(doc, d), getFood);

// --- What each slot plans on a day ---

test('with no changes, each slot plans its template meal or flex, in slot order', () => {
  const doc = plannedDoc();
  const plans = daySlots(doc, emptyDay());
  assert.deepEqual(
    plans.map(({ name, meal, portion, swapped, skipped, budget, entries }) => ({
      name,
      meal: meal?.name ?? null,
      portion,
      swapped,
      skipped,
      budget,
      entries,
    })),
    [
      { name: 'Breakfast', meal: 'Oats & whey', portion: 1, swapped: false, skipped: false, budget: null, entries: [] },
      { name: 'Lunch', meal: 'Rice & beef', portion: 1, swapped: false, skipped: false, budget: null, entries: [] },
      { name: 'Dinner', meal: null, portion: 1, swapped: false, skipped: false, budget: null, entries: [] },
    ],
  );
});

test('a swap plans the other meal for the day, and the template keeps its own', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const lunch = daySlots(doc, day({ changes: { [Lunch]: { mealId: RICE_BOWL.id } } }))[1];
  assert.equal(lunch.meal, RICE_BOWL);
  assert.equal(lunch.swapped, true);
  assert.equal(daySlots(doc, emptyDay())[1].meal, RICE_BEEF);
});

test('a swap changes only the day it’s made on', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const swappedDay = swapSlot(emptyDay(), Lunch, RICE_BOWL.id, RICE_BEEF.id);
  assert.equal(daySlots(doc, swappedDay)[1].meal, RICE_BOWL);
  assert.equal(daySlots(doc, emptyDay())[1].meal, RICE_BEEF);
  assert.equal(doc.template[Lunch].mealId, RICE_BEEF.id);
});

// Made the default: the template plans the new meal, and the day it was made on needs no swap.
test('a swap made the default plans the meal on every day, with no swap left on its day', () => {
  const planned = plannedDoc();
  const { Lunch } = slotIds(planned);
  const doc = setSlotMeal(planned, Lunch, RICE_BOWL.id);
  const madeOn = swapSlot(day({ changes: { [Lunch]: { mealId: RICE_BOWL.id, portion: 1.5 } } }), Lunch, RICE_BOWL.id, RICE_BOWL.id);
  assert.deepEqual(madeOn.changes, { [Lunch]: { portion: 1.5 } });
  for (const d of [madeOn, emptyDay()]) {
    const lunch = daySlots(doc, d)[1];
    assert.equal(lunch.meal, RICE_BOWL);
    assert.equal(lunch.swapped, false);
  }
});

test('a swap to the template’s own meal isn’t a swap', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const lunch = daySlots(doc, day({ changes: { [Lunch]: { mealId: RICE_BEEF.id } } }))[1];
  assert.equal(lunch.swapped, false);
});

test('a skipped slot keeps its meal to show, marked skipped', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const breakfast = daySlots(doc, day({ changes: { [Breakfast]: { mealId: null } } }))[0];
  assert.equal(breakfast.meal, OATS);
  assert.equal(breakfast.skipped, true);
});

test('a portion on its own keeps the template meal', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const lunch = daySlots(doc, day({ changes: { [Lunch]: { portion: 1.5 } } }))[1];
  assert.equal(lunch.meal, RICE_BEEF);
  assert.equal(lunch.portion, 1.5);
  assert.equal(lunch.swapped, false);
  assert.equal(lunch.skipped, false);
});

test('a swap to a meal that’s since been deleted falls back to the template’s meal', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const lunch = daySlots(doc, day({ changes: { [Lunch]: { mealId: 'deleted-meal', portion: 0.5 } } }))[1];
  assert.equal(lunch.meal, RICE_BEEF);
  assert.equal(lunch.swapped, false);
  assert.equal(lunch.portion, 0.5);
});

test('a change left on a slot that has since become flex is ignored', () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const changes = { [Dinner]: { mealId: OATS.id, portion: 2 } };
  const dinner = daySlots(doc, day({ changes }))[2];
  assert.equal(dinner.meal, null);
  assert.equal(dinner.portion, 1);
  assert.equal(dinner.swapped, false);
  assert.equal(daySlots(doc, day({ changes: { [Dinner]: { mealId: null } } }))[2].skipped, false);
});

test('only a flex slot carries its pinned budget', () => {
  let doc = plannedDoc();
  const { Lunch, Dinner } = slotIds(doc);
  doc = withBudget(withBudget(doc, Dinner, BUDGET), Lunch, BUDGET);
  const plans = daySlots(doc, emptyDay());
  assert.equal(plans[1].budget, null, 'a budget left on a slot that plans a meal');
  assert.deepEqual(plans[2].budget, BUDGET);
});

test('each slot gets the day’s entries added to it, and an entry for a slot that’s gone is in none', () => {
  const doc = plannedDoc();
  const { Lunch, Dinner } = slotIds(doc);
  const extra = entry(Lunch, { kcal: 70, protein: 6, fat: 5, carbs: 0.5 });
  const filled = entry(Dinner, BUDGET);
  const orphan = entry('removed-slot', BUDGET);
  const plans = daySlots(doc, day({ entries: [extra, filled, orphan] }));
  assert.deepEqual(plans.map((plan) => plan.entries), [[], [extra], [filled]]);
});

test('a doc with no slots plans nothing', () => {
  assert.deepEqual(daySlots({}, emptyDay()), []);
});

// --- What a slot adds ---

test('a slot adds its meal at its portion, and nothing when skipped or open', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch } = slotIds(doc);
  const changes = { [Breakfast]: { mealId: null }, [Lunch]: { portion: 0.5 } };
  const [breakfast, lunch, dinner] = daySlots(doc, day({ changes }));
  assert.deepEqual(slotTotals(breakfast, getFood), ZERO);
  assertTotals(slotTotals(lunch, getFood), { kcal: 317.5, protein: 22, fat: 11.55, carbs: 28 });
  assert.deepEqual(slotTotals(dinner, getFood), ZERO);
});

// --- The day's total ---

test('a plain template totals its planned meals, and an open flex slot adds nothing', () => {
  assertTotals(total(plannedDoc(), emptyDay()), { kcal: 1059, protein: 78.4, fat: 30.2, carbs: 113.4 });
});

test('a day with nothing planned and nothing added totals zero', () => {
  assert.deepEqual(total(createCoreDoc('2026-10-15'), emptyDay()), ZERO);
  assert.deepEqual(dayTotal(emptyDay(), [], getFood), ZERO);
});

test('an open flex slot’s pinned budget counts like a planned meal', () => {
  const doc = plannedDoc();
  const withPin = withBudget(doc, slotIds(doc).Dinner, BUDGET);
  assertTotals(total(withPin, emptyDay()), { kcal: 1759, protein: 128.4, fat: 50.2, carbs: 193.4 });
});

test('once something is added to a budgeted flex slot, it counts instead of the budget', () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const withPin = withBudget(doc, Dinner, BUDGET);
  const d = day({ entries: [entry(Dinner, { kcal: 800, protein: 40, fat: 30, carbs: 90 })] });
  assertTotals(total(withPin, d), { kcal: 1859, protein: 118.4, fat: 60.2, carbs: 203.4 });
});

test('swaps, skips and portions change the day’s total', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch } = slotIds(doc);
  assertTotals(total(doc, day({ changes: { [Lunch]: { mealId: RICE_BOWL.id } } })), {
    kcal: 814,
    protein: 41.9,
    fat: 8,
    carbs: 141.4,
  });
  assertTotals(total(doc, day({ changes: { [Breakfast]: { mealId: null } } })), RICE_BEEF_TOTALS);
  assertTotals(total(doc, day({ changes: { [Lunch]: { portion: 1.5 } } })), {
    kcal: 1376.5,
    protein: 100.4,
    fat: 41.75,
    carbs: 141.4,
  });
});

test('a skipped slot drops out of the day’s total, and as planned brings it back', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const skipped = skipSlot(emptyDay(), Breakfast);
  assertTotals(total(doc, skipped), RICE_BEEF_TOTALS);
  assertTotals(total(doc, clearSlotChange(skipped, Breakfast)), total(doc, emptyDay()));
  assertTotals(total(doc, setSlotPortion(skipped, Breakfast, 0.5)), {
    kcal: 847,
    protein: 61.2,
    fat: 26.65,
    carbs: 84.7,
  });
});

test('an extra added to a planned slot counts alongside its meal', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch } = slotIds(doc);
  const d = day({
    changes: { [Lunch]: { mealId: null } },
    entries: [entry(Breakfast, { kcal: 70, protein: 6, fat: 5, carbs: 0.5 })],
  });
  assertTotals(total(doc, d), { kcal: 494, protein: 40.4, fat: 12.1, carbs: 57.9 });
});

test('an entry whose slot is gone still counts', () => {
  const doc = plannedDoc();
  const d = day({ entries: [entry('removed-slot', RICE_BOWL_TOTALS)] });
  assertTotals(total(doc, d), { kcal: 1449, protein: 85.9, fat: 31.1, carbs: 197.4 });
});

test('off plan, only the entries count: planned meals, budgets and changes are ignored', () => {
  let doc = plannedDoc();
  const { Lunch, Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const changes = { [Lunch]: { mealId: RICE_BOWL.id, portion: 2 } };
  assert.deepEqual(total(doc, day({ offPlan: true, changes })), ZERO);
  const d = day({ offPlan: true, changes, entries: [entry(Lunch, OATS_TOTALS)] });
  assertTotals(total(doc, d), OATS_TOTALS);
});

test('a locked day is its entries alone, whatever the template or changes say now', () => {
  let doc = plannedDoc();
  const { Breakfast, Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const entries = [
    entry(Breakfast, { kcal: 500, protein: 30, fat: 10, carbs: 60 }, 'Oats & whey'),
    entry(Dinner, { kcal: 300, protein: 20, fat: 5, carbs: 40 }, 'Dinner'),
  ];
  const d = day({ locked: true, changes: { [Breakfast]: { portion: 3 } }, entries });
  assertTotals(total(doc, d), { kcal: 800, protein: 50, fat: 15, carbs: 100 });
  assert.deepEqual(total(doc, day({ locked: true })), ZERO);
});
