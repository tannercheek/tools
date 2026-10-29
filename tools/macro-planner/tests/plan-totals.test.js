import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPlanFlexGap, leftForFlex, templateTotal as realTemplateTotal } from '../js/calc.js';
import { createCoreDoc, emptyDay } from '../js/data.js';
import { dayPlan } from '../js/day-plan.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { addPlannedMeal, addSlot, createSlot, planSlots, replacePlannedItem, setSlotBudget, slotItems } from '../js/slots.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected) {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= 1e-9, `${key}: expected ${expected[key]}, got ${actual[key]}`);
  }
}

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

// 424 / 34.4 / 7.1 / 57.4
const OATS = meal('Oats & whey', [['oats', 80], ['whey', 30]]);
// 635 / 44 / 23.1 / 56
const RICE_BEEF = meal('Rice & beef', [['rice', 200], ['beef', 150]]);
// 390 / 7.5 / 0.9 / 84
const RICE_BOWL = meal('Rice bowl', [['rice', 300]]);

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };
const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

// Breakfast: Oats & whey, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = addPlannedMeal(doc, breakfast.id, OATS.id);
  return addPlannedMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));

// What Plan's card adds up: the template's planned items and pinned budgets.
const templateTotal = (doc) => realTemplateTotal(planSlots(doc, getFood), getFood);

// The figure as it shows: { kcal: 1541, ... } when under, or { kcal: -259, ... } for 259 over.
function leftFor(doc, targets = TARGETS) {
  const left = leftForFlex(targets, templateTotal(doc));
  return left && Object.fromEntries(Object.entries(left).map(([key, { amount, over }]) => [key, over ? -amount : amount]));
}

// --- What the template adds up to ---

test('the template adds up its planned meals', () => {
  assertTotals(templateTotal(plannedDoc()), { kcal: 1059, protein: 78.4, fat: 30.2, carbs: 113.4 });
});

test('a pinned flex budget counts in the template’s total', () => {
  const doc = plannedDoc();
  const withBudget = setSlotBudget(doc, slotIds(doc).Dinner, BUDGET);
  assertTotals(templateTotal(withBudget), { kcal: 1759, protein: 128.4, fat: 50.2, carbs: 193.4 });
});

test('a budget left on a slot that now plans a meal doesn’t count', () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const planned = addPlannedMeal(setSlotBudget(doc, Dinner, BUDGET), Dinner, RICE_BOWL.id);
  assertTotals(templateTotal(planned), { kcal: 1449, protein: 85.9, fat: 31.1, carbs: 197.4 });
});

test('changing a slot’s meal changes the total', () => {
  const doc = plannedDoc();
  const lunchId = slotIds(doc).Lunch;
  const [item] = slotItems(doc.template[lunchId]);
  const swapped = replacePlannedItem(doc, lunchId, item.id, { mealId: RICE_BOWL.id });
  assertTotals(templateTotal(swapped), { kcal: 814, protein: 41.9, fat: 8, carbs: 141.4 });
});

test('a first run’s template, all open flex, adds up to nothing and leaves the whole targets', () => {
  const doc = createCoreDoc('2026-10-15');
  assertTotals(templateTotal(doc), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  assert.deepEqual(leftFor(doc), { kcal: 2600, protein: 180, fat: 70, carbs: 300 });
});

// --- Left for flex (SPEC §3.4) ---

test('left for flex is the targets minus the meals and pinned budgets', () => {
  const doc = plannedDoc();
  // 2600 − 1059, 180 − 78, 70 − 30, 300 − 113, each shown target minus shown total.
  assert.deepEqual(leftFor(doc), { kcal: 1541, protein: 102, fat: 40, carbs: 187 });
  // 2600 − 1759, 180 − 128, 70 − 50, 300 − 193.
  assert.deepEqual(leftFor(setSlotBudget(doc, slotIds(doc).Dinner, BUDGET)), { kcal: 841, protein: 52, fat: 20, carbs: 107 });
});

test('a plan over target shows how much over, never a negative amount', () => {
  const doc = plannedDoc();
  const withBudget = setSlotBudget(doc, slotIds(doc).Dinner, BUDGET);
  const lowTargets = { kcal: 1500, protein: 70, fat: 50, carbs: 200, warnings: [] };
  const left = leftForFlex(lowTargets, templateTotal(withBudget));
  // 1759 kcal and 128 g protein are over; fat lands on 50 exactly; carbs leave 7.
  assert.deepEqual(left, {
    kcal: { amount: 259, over: true },
    protein: { amount: 58, over: true },
    fat: { amount: 0, over: false },
    carbs: { amount: 7, over: false },
  });
  for (const { amount } of Object.values(left)) assert.ok(amount >= 0);
});

test('left for flex is the shown target minus the shown total, so the card’s numbers agree', () => {
  // Calculated targets aren't whole: 180.6 shows as 181, less 78 (78.4) is 103, not 102.2 rounded.
  const targets = { kcal: 2600.4, protein: 180.6, fat: 70.4, carbs: 300.5, warnings: [] };
  assert.deepEqual(leftFor(plannedDoc(), targets), { kcal: 1541, protein: 103, fat: 40, carbs: 188 });
});

test('with two flex slots, left for flex is one figure, not split between them', () => {
  const twoFlex = addSlot(plannedDoc(), createSlot('Snack'));
  assert.deepEqual(leftFor(twoFlex), leftFor(plannedDoc()));
  assert.equal(leftFor(twoFlex).kcal, 1541);
});

test('left for flex matches what an open flex slot shows on Today with no changes', () => {
  // Snack has a pinned budget, so Dinner's gap on Today leaves it out, as Plan's figure does.
  const doc = addSlot(plannedDoc(), createSlot('Snack'));
  const withBudget = setSlotBudget(doc, slotIds(doc).Snack, BUDGET);
  const day = emptyDay();
  const gap = dayPlanFlexGap(TARGETS, day, dayPlan(withBudget, day, getFood), slotIds(withBudget).Dinner);
  assert.deepEqual(leftForFlex(TARGETS, templateTotal(withBudget)), gap);
});

test('with no targets there’s nothing left for flex, only the template’s total', () => {
  assert.equal(leftForFlex(null, templateTotal(plannedDoc())), null);
});
