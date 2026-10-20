import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap } from '../js/calc.js';
import {
  addEntry,
  backOnPlan,
  createCoreDoc,
  createDays,
  emptyDay,
  lastOffPlanDate,
  offPlanUntil,
  quickEntry,
  setOffPlan,
} from '../js/data.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { daySlots, setSlotBudget, setSlotMeal, setSlotPortion, skipSlot, swapSlot } from '../js/slots.js';
import { createLocalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, kcal, protein, fat, carbs) => ({ id, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const getFood = foodLookup([per100g('oats', 380, 13, 7, 68), per100g('rice', 130, 2.5, 0.3, 28)]);

function meal(name, items) {
  return { ...createMeal({ name }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

const OATS = meal('Oats', [['oats', 100]]);
const RICE = meal('Rice', [['rice', 300]]);

const TODAY = '2026-10-20';
const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };
const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };
const LUNCH_NUMBERS = { kcal: 600, protein: 40, fat: 20, carbs: 60 };
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

// Breakfast: Oats, Lunch: Rice, Dinner: flex with a pinned budget.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-01'), meals: [OATS, RICE] };
  const [breakfast, lunch, dinner] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  doc = setSlotMeal(doc, lunch.id, RICE.id);
  return setSlotBudget(doc, dinner.id, BUDGET);
}

const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);

// The gap as it shows: { kcal: 2000, ... } when under, or { kcal: -120, ... } for 120 over.
function gapFor(doc, day, slotName) {
  const gap = flexGap(TARGETS, day, daySlots(doc, day), slotNamed(doc, slotName).id, getFood);
  return Object.fromEntries(Object.entries(gap).map(([key, { amount, over }]) => [key, over ? -amount : amount]));
}

function offPlanDay(fields = {}) {
  return { ...emptyDay(), offPlan: true, ...fields };
}

// --- An off-plan day's slots (SPEC §3.4) ---

test('off plan, every slot is open flex with no budget, and the template is unchanged', () => {
  const doc = plannedDoc();
  const before = structuredClone(doc);
  const plans = daySlots(doc, offPlanDay());
  assert.deepEqual(
    plans.map(({ name, meal, budget, skipped, swapped, portion }) => ({ name, meal, budget, skipped, swapped, portion })),
    ['Breakfast', 'Lunch', 'Dinner'].map((name) => ({ name, meal: null, budget: null, skipped: false, swapped: false, portion: 1 })),
  );
  assert.deepEqual(doc, before);
  assert.equal(daySlots(doc, emptyDay())[0].meal.id, OATS.id);
});

test('off plan ignores the day’s swaps, skips and portions', () => {
  const doc = plannedDoc();
  const breakfast = slotNamed(doc, 'Breakfast').id;
  const lunch = slotNamed(doc, 'Lunch').id;
  let day = swapSlot(emptyDay(), breakfast, RICE.id, OATS.id);
  day = setSlotPortion(day, breakfast, 1.5);
  day = skipSlot(day, lunch);
  const plans = daySlots(doc, { ...day, offPlan: true });
  assert.ok(plans.every((plan) => plan.meal === null && plan.portion === 1 && !plan.skipped && !plan.swapped));
  assert.deepEqual(dayTotal({ ...day, offPlan: true }, plans, getFood), ZERO);
});

test('off plan, each slot keeps its own entries', () => {
  const doc = plannedDoc();
  const lunch = slotNamed(doc, 'Lunch');
  const entry = quickEntry(lunch, LUNCH_NUMBERS, 'Tacos');
  const plans = daySlots(doc, addEntry(offPlanDay(), entry));
  assert.deepEqual(
    plans.map((plan) => plan.entries.map((e) => e.label)),
    [[], ['Tacos'], []],
  );
});

test('off plan, every open slot shows the whole day’s targets, with no planned meals or budget taken off', () => {
  const doc = plannedDoc();
  const day = offPlanDay();
  for (const name of ['Breakfast', 'Lunch', 'Dinner']) {
    assert.deepEqual(gapFor(doc, day, name), { kcal: 2600, protein: 180, fat: 70, carbs: 300 });
  }
});

test('off plan, logging into one slot updates what the others show', () => {
  const doc = plannedDoc();
  const day = addEntry(offPlanDay(), quickEntry(slotNamed(doc, 'Lunch'), LUNCH_NUMBERS));
  const left = { kcal: 2000, protein: 140, fat: 50, carbs: 240 };
  assert.deepEqual(gapFor(doc, day, 'Breakfast'), left);
  assert.deepEqual(gapFor(doc, day, 'Dinner'), left);
  assert.deepEqual(dayTotal(day, daySlots(doc, day), getFood), LUNCH_NUMBERS);
});

// --- Going off plan ---

test('off plan for three days sets all three, and not the day after', () => {
  const daysDoc = setOffPlan({}, TODAY, '2026-10-22', TODAY);
  assert.deepEqual(Object.keys(daysDoc).sort(), ['2026-10-20', '2026-10-21', '2026-10-22']);
  for (const day of Object.values(daysDoc)) assert.deepEqual(day, offPlanDay());
  assert.equal(daysDoc['2026-10-23'], undefined);
});

test('today only is a range of one day', () => {
  assert.deepEqual(setOffPlan({}, TODAY, TODAY, TODAY), { [TODAY]: offPlanDay() });
});

test('going off plan keeps a day’s changes and entries, and leaves other days alone', () => {
  const doc = plannedDoc();
  const changes = skipSlot(emptyDay(), slotNamed(doc, 'Lunch').id).changes;
  const entry = quickEntry(slotNamed(doc, 'Dinner'), LUNCH_NUMBERS);
  const yesterday = { ...emptyDay(), locked: true };
  const daysDoc = { '2026-10-19': yesterday, [TODAY]: { ...emptyDay(), changes, entries: [entry] } };
  const next = setOffPlan(daysDoc, TODAY, TODAY, TODAY);
  assert.deepEqual(next[TODAY], { changes, entries: [entry], offPlan: true, locked: false });
  assert.equal(next['2026-10-19'], yesterday);
  assert.equal(daysDoc[TODAY].offPlan, false);
});

test('off plan can start on a later day', () => {
  const daysDoc = setOffPlan({}, '2026-10-25', '2026-10-26', TODAY);
  assert.deepEqual(Object.keys(daysDoc).sort(), ['2026-10-25', '2026-10-26']);
});

test('off plan runs across month and year ends', () => {
  const daysDoc = setOffPlan({}, '2026-12-30', '2027-01-02', '2026-12-30');
  assert.deepEqual(Object.keys(daysDoc).sort(), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
});

test('off plan can end 30 days after today, and no later', () => {
  assert.equal(lastOffPlanDate(TODAY), '2026-11-19');
  assert.equal(Object.keys(setOffPlan({}, TODAY, '2026-11-19', TODAY)).length, 31);
  assert.throws(() => setOffPlan({}, TODAY, '2026-11-20', TODAY), RangeError);
});

test('off plan can’t start before today or end before it starts', () => {
  assert.throws(() => setOffPlan({}, '2026-10-19', TODAY, TODAY), RangeError);
  assert.throws(() => setOffPlan({}, '2026-10-22', '2026-10-21', TODAY), RangeError);
  assert.throws(() => setOffPlan({}, TODAY, 'tomorrow', TODAY), RangeError);
});

// --- Back on plan ---

test('back on plan clears off plan from today on, and an earlier off-plan day stays off plan', () => {
  const yesterday = offPlanDay({ locked: true });
  const daysDoc = { '2026-10-19': yesterday, ...setOffPlan({}, TODAY, '2026-10-22', TODAY) };
  const next = backOnPlan(daysDoc, TODAY);
  assert.equal(next['2026-10-19'], yesterday);
  for (const date of ['2026-10-20', '2026-10-21', '2026-10-22']) assert.equal(next[date].offPlan, false);
});

test('back on plan clears a later off-plan stretch too', () => {
  const daysDoc = { ...setOffPlan({}, TODAY, TODAY, TODAY), ...setOffPlan({}, '2026-11-01', '2026-11-02', TODAY) };
  const next = backOnPlan(daysDoc, TODAY);
  assert.ok(Object.values(next).every((day) => !day.offPlan));
});

test('back on plan restores the template, with the day’s own changes', () => {
  const doc = plannedDoc();
  const lunch = slotNamed(doc, 'Lunch').id;
  const day = offPlanDay({ changes: skipSlot(emptyDay(), lunch).changes });
  const next = backOnPlan({ [TODAY]: day }, TODAY)[TODAY];
  const plans = daySlots(doc, next);
  assert.equal(plans[0].meal.id, OATS.id);
  assert.equal(plans[1].skipped, true);
  assert.deepEqual(plans[2].budget, BUDGET);
});

test('back on plan with nothing off plan returns the same doc', () => {
  const daysDoc = { '2026-10-19': offPlanDay({ locked: true }), [TODAY]: emptyDay() };
  assert.equal(backOnPlan(daysDoc, TODAY), daysDoc);
});

// --- Where an off-plan stretch ends ---

test('a day not off plan, or with no record, has no off-plan end', () => {
  assert.equal(offPlanUntil({}, TODAY), null);
  assert.equal(offPlanUntil({ [TODAY]: emptyDay() }, TODAY), null);
});

test('an off-plan stretch ends at its last day in a row, across a month end', () => {
  const daysDoc = { ...setOffPlan({}, '2026-10-30', '2026-11-01', '2026-10-30'), '2026-11-03': offPlanDay() };
  assert.equal(offPlanUntil(daysDoc, '2026-10-30'), '2026-11-01');
  assert.equal(offPlanUntil(daysDoc, '2026-10-31'), '2026-11-01');
  assert.equal(offPlanUntil(daysDoc, '2026-11-01'), '2026-11-01');
  assert.equal(offPlanUntil(daysDoc, '2026-11-02'), null);
});

// --- In the store ---

test('off plan and back on plan are saved, and the stretch runs on into a day already off plan', async () => {
  const days = createDays(createLocalStore(createFakeStorage()));
  assert.equal(await days.setOffPlan('2026-10-23', '2026-10-24', TODAY), '2026-10-24');
  assert.equal(await days.setOffPlan(TODAY, '2026-10-22', TODAY), '2026-10-24');
  assert.equal(await days.offPlanUntil('2026-10-21'), '2026-10-24');
  assert.equal((await days.getDay('2026-10-22')).offPlan, true);

  await days.backOnPlan('2026-10-22');
  assert.equal((await days.getDay('2026-10-21')).offPlan, true);
  assert.equal((await days.getDay('2026-10-22')).offPlan, false);
  assert.equal(await days.offPlanUntil(TODAY), '2026-10-21');
});
