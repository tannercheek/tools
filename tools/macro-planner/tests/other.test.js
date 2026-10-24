import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap } from '../js/calc.js';
import {
  OTHER,
  addEntry,
  createCoreDoc,
  emptyDay,
  foodEntry,
  mealEntry,
  quickEntry,
  recentEntries,
  repeatEntry,
} from '../js/data.js';
import { lockDay } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { addSlot, createSlot, daySlots, otherEntries, removeSlot, setSlotMeal } from '../js/slots.js';

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

const plus = (a, b) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + b[key]]));

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, name, emoji, kcal, protein, fat, carbs) => ({ id, name, emoji, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const OATS_FOOD = per100g('oats', 'Oats', '🌾', 380, 13, 7, 68);
const RICE = per100g('rice', 'Rice, white, cooked', '🍚', 130, 2.5, 0.3, 28);
const BEEF = per100g('beef', 'Beef, ground, cooked', '🥩', 250, 26, 15, 0);
const BANANA = per100g('custom-banana', 'Banana', '🍌', 90, 1, 0.5, 23);
const FOODS = [OATS_FOOD, RICE, BEEF, BANANA];
const getFood = foodLookup(FOODS);

function meal(name, emoji, items) {
  return { ...createMeal({ name, emoji }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 100 g oats: 380 kcal.
const OATS = meal('Oats', '🥣', [['oats', 100]]);
// 200 g rice + 150 g beef: 635 kcal.
const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);

// 120 g banana.
const BANANA_TOTALS = { kcal: 108, protein: 1.2, fat: 0.6, carbs: 27.6 };
const SNACK = { kcal: 250, protein: 10, fat: 12, carbs: 25 };

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };

// Breakfast: Oats, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);
const total = (doc, day) => dayTotal(day, daySlots(doc, day), getFood);

// 120 g banana eaten outside the slots.
const otherBanana = () => foodEntry(OTHER, BANANA, 120);

// --- Entries ---

test('the entry helpers take Other in place of a slot: no slot id, and "Other" as its name', () => {
  const added = [mealEntry(OTHER, RICE_BEEF, getFood), otherBanana(), quickEntry(OTHER, SNACK, 'Vending machine')];
  for (const entry of added) {
    assert.equal(entry.slotId, null, entry.label);
    assert.equal(entry.slotName, 'Other', entry.label);
    assert.equal(entry.planned, undefined, entry.label);
  }
  // A meal keeps its ingredients, so it can be changed for the day like one in a slot.
  assert.deepEqual(added[0].ingredients.map((item) => item.foodId), ['rice', 'beef']);

  // Quick numbers with no label take Other's name, as they'd take a slot's.
  assert.equal(quickEntry(OTHER, SNACK).label, 'Other');

  // A Recent entry from a slot, added again to Other.
  const again = repeatEntry(OTHER, foodEntry(slotNamed(plannedDoc(), 'Lunch'), BANANA, 120));
  assert.equal(again.slotId, null);
  assert.equal(again.slotName, 'Other');
  assert.equal(again.label, 'Banana');
});

// --- The day's total and the gap ---

test("an Other entry counts in dayTotal and in an open flex slot's flexGap, without filling it", () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const plain = emptyDay();
  const day = addEntry(plain, otherBanana());

  assertTotals(total(doc, day), plus(total(doc, plain), BANANA_TOTALS));

  // It's in no slot, so Dinner is still open, and shows 2,600 − 380 − 635, then less the banana.
  assert.ok(daySlots(doc, day).every((plan) => plan.entries.length === 0));
  const gap = (d) => flexGap(TARGETS, d, daySlots(doc, d), Dinner, getFood);
  assert.equal(gap(plain).kcal.amount, 1585);
  assert.equal(gap(day).kcal.amount, 1477);
});

// --- otherEntries ---

test('otherEntries picks up an entry whose slot was removed, and leaves out entries in a slot', () => {
  const preWorkout = createSlot('Pre-workout');
  const doc = addSlot(plannedDoc(), preWorkout);
  const first = otherBanana();
  const inDinner = quickEntry(slotNamed(doc, 'Dinner'), SNACK, 'Burrito');
  const shake = quickEntry(preWorkout, SNACK, 'Shake');
  const last = quickEntry(OTHER, SNACK, 'Vending machine');
  const day = [first, inDinner, shake, last].reduce(addEntry, emptyDay());

  // While Pre-workout is there, the shake is its.
  assert.deepEqual(otherEntries(day, doc.slots), [first, last]);

  // Once it's removed, the shake joins Other in the order added, and still counts in the day.
  const removed = removeSlot(doc, preWorkout.id);
  assert.deepEqual(otherEntries(day, removed.slots), [first, shake, last]);
  assert.deepEqual(otherEntries(day, daySlots(removed, day)), [first, shake, last]);
  assertTotals(total(removed, day), total(doc, day));

  assert.deepEqual(otherEntries(emptyDay(), doc.slots), []);
});

// --- Lock-in and Recent ---

test('lockDay keeps an Other entry as it is, and recentEntries lists it', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch, Dinner } = slotIds(doc);
  const banana = otherBanana();
  const day = addEntry(emptyDay(), banana);
  const locked = lockDay(day, doc, doc.meals, FOODS);

  // The plan in slot order, then the banana as it was added.
  assert.deepEqual(locked.entries.map((e) => e.slotId), [Breakfast, Lunch, null]);
  assert.deepEqual(locked.entries[2], banana);
  assertTotals(dayTotal(locked, [], getFood), total(doc, day));

  const recent = recentEntries({ '2026-10-20': locked }, '2026-10-21');
  assert.deepEqual(recent.map(({ entry }) => entry), [banana]);
  // Added again, it goes wherever it's added this time.
  assert.equal(repeatEntry(slotNamed(doc, 'Dinner'), recent[0].entry).slotId, Dinner);
});

// --- Off plan ---

test('an off-plan day counts it', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const banana = otherBanana();
  const day = { ...addEntry(emptyDay(), banana), offPlan: true };

  assertTotals(total(doc, day), BANANA_TOTALS);
  // Every slot is open flex off plan, and shows 2,600 less the banana.
  assert.equal(flexGap(TARGETS, day, daySlots(doc, day), Breakfast, getFood).kcal.amount, 2492);
  assert.deepEqual(otherEntries(day, doc.slots), [banana]);
  assert.deepEqual(lockDay(day, doc, doc.meals, FOODS).entries, [banana]);
});
