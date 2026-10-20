import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap } from '../js/calc.js';
import { readNumbers } from '../js/custom-foods.js';
import { DEFAULT_EMOJI, addEntry, createCoreDoc, emptyDay, foodEntry, mealEntry, quickEntry } from '../js/data.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { addSlot, createSlot, daySlots, setSlotBudget, setSlotMeal, setSlotPortion, skipSlot, swapSlot } from '../js/slots.js';

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, kcal, protein, fat, carbs) => ({ id, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const RICE = { ...per100g('rice', 130, 2.5, 0.3, 28), name: 'Rice, white, cooked', emoji: '🍚' };
const getFood = foodLookup([
  per100g('oats', 380, 13, 7, 68),
  { id: 'whey', serving: { qty: 30, unit: 'g' }, kcal: 120, protein: 24, fat: 1.5, carbs: 3 },
  RICE,
  per100g('beef', 250, 26, 15, 0),
]);

function meal(name, emoji, items) {
  return { ...createMeal({ name }), emoji, items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 424 / 34.4 / 7.1 / 57.4
const OATS = meal('Oats & whey', '🥣', [['oats', 80], ['whey', 30]]);
// 635 / 44 / 23.1 / 56
const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);
// 390 / 7.5 / 0.9 / 84
const RICE_BOWL = meal('Rice bowl', '🍚', [['rice', 300]]);

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };
const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

// Breakfast: Oats & whey, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);

// The gap as it shows: { kcal: 1541, ... } when under, or { kcal: -120, ... } for 120 over.
function gapFor(doc, day, slotName, targets = TARGETS) {
  const gap = flexGap(targets, day, daySlots(doc, day), slotIds(doc)[slotName], getFood);
  return gap && Object.fromEntries(Object.entries(gap).map(([key, { amount, over }]) => [key, over ? -amount : amount]));
}

// --- The gap (SPEC §3.4) ---

test('with no changes, a flex slot shows the targets minus the planned meals', () => {
  // 2600 − (424 + 635), 180 − 78.4, 70 − 30.2, 300 − 113.4, each shown target minus shown total.
  assert.deepEqual(gapFor(plannedDoc(), emptyDay(), 'Dinner'), { kcal: 1541, protein: 102, fat: 40, carbs: 187 });
});

test('the gap moves when another slot is swapped, skipped or re-portioned', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch } = slotIds(doc);
  // Rice bowl for Rice & beef: 2600 − (424 + 390).
  assert.equal(gapFor(doc, swapSlot(emptyDay(), Lunch, RICE_BOWL.id, RICE_BEEF.id), 'Dinner').kcal, 1786);
  // Breakfast skipped: 2600 − 635.
  assert.equal(gapFor(doc, skipSlot(emptyDay(), Breakfast), 'Dinner').kcal, 1965);
  // Lunch at 1.5×: 2600 − (424 + 952.5), the rest shown as 1377 (952.5 + 424 = 1376.5 rounds up).
  assert.equal(gapFor(doc, setSlotPortion(emptyDay(), Lunch, 1.5), 'Dinner').kcal, 1223);
});

test('with two flex slots, each shows the whole gap, and adding to one shrinks only the other’s', () => {
  const twoFlex = addSlot(plannedDoc(), createSlot('Snack'));
  const { Dinner } = slotIds(twoFlex);
  assert.equal(gapFor(twoFlex, emptyDay(), 'Dinner').kcal, 1541);
  assert.equal(gapFor(twoFlex, emptyDay(), 'Snack').kcal, 1541);

  const filled = addEntry(emptyDay(), quickEntry(slotNamed(twoFlex, 'Dinner'), BUDGET));
  assert.equal(filled.entries[0].slotId, Dinner);
  // The rest of Snack's day now holds Dinner's 700.
  assert.deepEqual(gapFor(twoFlex, filled, 'Snack'), { kcal: 841, protein: 52, fat: 20, carbs: 107 });
  // Filled, Dinner shows its own total on Today; its gap still leaves out its own entries.
  assert.equal(gapFor(twoFlex, filled, 'Dinner').kcal, 1541);
});

test('another open flex slot’s pinned budget counts in the rest of the day, its own doesn’t', () => {
  const doc = addSlot(plannedDoc(), createSlot('Snack'));
  const { Snack } = slotIds(doc);
  const budgeted = setSlotBudget(doc, Snack, BUDGET);
  assert.equal(gapFor(budgeted, emptyDay(), 'Dinner').kcal, 841);
  assert.equal(gapFor(budgeted, emptyDay(), 'Snack').kcal, 1541);
});

test('a budget filled with an entry counts as the entry, not the budget', () => {
  const doc = addSlot(plannedDoc(), createSlot('Snack'));
  const budgeted = setSlotBudget(doc, slotIds(doc).Snack, BUDGET);
  const filled = addEntry(emptyDay(), quickEntry(slotNamed(budgeted, 'Snack'), { kcal: 200, protein: 10, fat: 5, carbs: 30 }));
  assert.equal(gapFor(budgeted, filled, 'Dinner').kcal, 1341);
});

test('an entry whose slot is gone still counts in the rest of the day', () => {
  const doc = plannedDoc();
  const orphan = quickEntry({ id: 'gone', name: 'Pre-workout' }, { kcal: 300, protein: 20, fat: 5, carbs: 40 });
  assert.equal(gapFor(doc, addEntry(emptyDay(), orphan), 'Dinner').kcal, 1241);
});

test('a day already past its targets shows over, and every flex slot agrees with the rings', () => {
  const doc = plannedDoc();
  const small = { kcal: 900, protein: 60, fat: 40, carbs: 100, warnings: [] };
  // Over: 1059 − 900, 78.4 − 60, 113.4 − 100; fat 40 − 30.2 still leaves 10.
  assert.deepEqual(gapFor(doc, emptyDay(), 'Dinner', small), { kcal: -159, protein: -18, fat: 10, carbs: -13 });
  // With nothing added to Dinner, its gap is what the rings show as left.
  const day = emptyDay();
  const total = dayTotal(day, daySlots(doc, day), getFood);
  assert.equal(Math.round(TARGETS.kcal) - Math.round(total.kcal), gapFor(doc, day, 'Dinner').kcal);
});

test('with no targets there’s no gap', () => {
  assert.equal(gapFor(plannedDoc(), emptyDay(), 'Dinner', null), null);
});

// --- Pinning a budget ---

test('a pinned budget goes on the template slot, and null takes it off', () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const pinned = setSlotBudget(doc, Dinner, { ...BUDGET, extra: 1 });
  assert.deepEqual(pinned.template[Dinner], { mealId: null, budget: BUDGET });
  assert.deepEqual(daySlots(pinned, emptyDay())[2].budget, BUDGET);
  assert.deepEqual(setSlotBudget(pinned, Dinner, null).template[Dinner], { mealId: null, budget: null });
  // Left as it was.
  assert.equal(doc.template[Dinner].budget, null);
});

test('a budget stays on a slot that plans a meal, and counts again once it’s flex', () => {
  const doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  const planned = setSlotMeal(setSlotBudget(doc, Dinner, BUDGET), Dinner, RICE_BOWL.id);
  assert.equal(daySlots(planned, emptyDay())[2].budget, null);
  assert.deepEqual(daySlots(setSlotMeal(planned, Dinner, null), emptyDay())[2].budget, BUDGET);
});

test('a budget needs four numbers of 0 or more; 0 is fine', () => {
  const { Dinner } = slotIds(plannedDoc());
  assert.doesNotThrow(() => setSlotBudget(plannedDoc(), Dinner, { kcal: 0, protein: 0, fat: 0, carbs: 0 }));
  for (const bad of [{ ...BUDGET, fat: -1 }, { ...BUDGET, kcal: Number.NaN }, { kcal: 700, protein: 50, fat: 20 }]) {
    assert.throws(() => setSlotBudget(plannedDoc(), Dinner, bad), RangeError);
  }
});

// --- Entries (SPEC §3.5) ---

const DINNER = { id: 'dinner-id', name: 'Dinner' };

test('a meal entry snapshots the meal’s name, emoji and totals, under the slot’s name', () => {
  const entry = mealEntry(DINNER, RICE_BEEF, getFood);
  const { id, kcal, protein, fat, carbs, ...rest } = entry;
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(rest, { slotId: 'dinner-id', slotName: 'Dinner', label: 'Rice & beef', emoji: '🍚', source: 'meal' });
  assert.ok(Math.abs(kcal - 635) < 1e-9 && Math.abs(protein - 44) < 1e-9);
  assert.ok(Math.abs(fat - 23.1) < 1e-9 && Math.abs(carbs - 56) < 1e-9);
});

test('a food entry is the food at its amount, in its serving unit', () => {
  const entry = foodEntry(DINNER, RICE, 150);
  assert.equal(entry.label, 'Rice, white, cooked');
  assert.equal(entry.emoji, '🍚');
  assert.equal(entry.source, 'food');
  assert.deepEqual([entry.kcal, entry.protein, entry.carbs], [195, 3.75, 42]);
});

test('quick numbers keep their label, trimmed, or take the slot’s name, and use 🍽️', () => {
  const labelled = quickEntry(DINNER, BUDGET, '  Burrito  ');
  assert.equal(labelled.label, 'Burrito');
  assert.equal(labelled.emoji, DEFAULT_EMOJI);
  assert.equal(labelled.source, 'quick');
  assert.equal(quickEntry(DINNER, BUDGET).label, 'Dinner');
  assert.equal(quickEntry(DINNER, BUDGET, '   ').label, 'Dinner');
});

test('entries are snapshots: editing or deleting the meal later doesn’t change one', () => {
  const doc = plannedDoc();
  const day = addEntry(emptyDay(), mealEntry(slotNamed(doc, 'Dinner'), RICE_BOWL, getFood));
  const edited = { ...doc, meals: doc.meals.filter((m) => m !== RICE_BOWL) };
  assert.equal(day.entries[0].label, 'Rice bowl');
  assert.equal(dayTotal(day, daySlots(edited, day), getFood).kcal, 424 + 635 + 390);
});

test('addEntry adds last and leaves the day passed in as it was', () => {
  const first = quickEntry(DINNER, BUDGET, 'First');
  const second = quickEntry(DINNER, BUDGET, 'Second');
  const once = addEntry(emptyDay(), first);
  const twice = addEntry(once, second);
  assert.deepEqual(twice.entries, [first, second]);
  assert.deepEqual(once.entries, [first]);
  assert.deepEqual(addEntry({ changes: {} }, first).entries, [first]);
});

// --- Reading four numbers ---

test('readNumbers reads four amounts, 0 included', () => {
  assert.deepEqual(readNumbers({ kcal: '650', protein: '40.5', fat: '0', carbs: '.5' }), {
    numbers: { kcal: 650, protein: 40.5, fat: 0, carbs: 0.5 },
    errors: {},
  });
});

test('readNumbers names every number that’s blank or not an amount', () => {
  const { numbers, errors } = readNumbers({ kcal: '', protein: '-3', fat: '1,5', carbs: '12' });
  assert.equal(numbers, null);
  assert.deepEqual(Object.keys(errors), ['kcal', 'protein', 'fat']);
});
