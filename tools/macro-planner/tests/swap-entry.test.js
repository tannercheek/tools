import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, flexGap, slotTotals } from '../js/calc.js';
import { addEntry, createCoreDoc, emptyDay, foodEntry, quickEntry, recentEntries } from '../js/data.js';
import { mealIngredients } from '../js/ingredients.js';
import { lockDay } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import {
  clearSlotChange,
  daySlots,
  resetSlotIngredients,
  setSlotIngredients,
  setSlotMeal,
  setSlotPortion,
  skipSlot,
  swapSlot,
  swapSlotToEntry,
} from '../js/slots.js';

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

// 100 g oats.
const OATS = meal('Oats', '🥣', [['oats', 100]]);
const OATS_TOTALS = { kcal: 380, protein: 13, fat: 7, carbs: 68 };
// 200 g rice (260 / 5 / 0.6 / 56) + 150 g beef (375 / 39 / 22.5 / 0).
const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);
const RICE_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };
// 300 g rice.
const RICE_BOWL = meal('Rice bowl', '🍙', [['rice', 300]]);

// 120 g banana.
const BANANA_TOTALS = { kcal: 108, protein: 1.2, fat: 0.6, carbs: 27.6 };
const BURRITO = { kcal: 800, protein: 40, fat: 30, carbs: 90 };

const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };

// Breakfast: Oats, Lunch: Rice & beef, Dinner: flex.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-15'), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);
const planFor = (doc, day, slotId) => daySlots(doc, day).find((plan) => plan.id === slotId);
const total = (doc, day, lookup = getFood) => dayTotal(day, daySlots(doc, day), lookup);

// Lunch swapped for 120 g banana.
function bananaLunch(doc, day = emptyDay()) {
  const lunch = slotNamed(doc, 'Lunch');
  const entry = foodEntry(lunch, BANANA, 120);
  return { entry, day: swapSlotToEntry(day, lunch.id, entry) };
}

// --- Swapping in ---

test('a food swapped in is eaten in place of the meal, which the slot keeps as planned', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const { entry, day } = bananaLunch(doc);
  assert.deepEqual(day.changes[Lunch], { entry });

  const plan = planFor(doc, day, Lunch);
  assert.equal(plan.swapEntry, entry);
  assert.equal(plan.swapped, true);
  assert.equal(plan.skipped, false);
  assert.equal(plan.edited, false);
  assert.equal(plan.ingredients, null);
  assert.equal(plan.portion, 1);
  assert.equal(plan.meal.id, RICE_BEEF.id);
  // It isn't one of the slot's added entries.
  assert.deepEqual(plan.entries, []);
  assertTotals(slotTotals(plan, getFood), BANANA_TOTALS);
});

test('a swap to a food or quick numbers counts in dayTotal and flexGap in place of the meal', () => {
  const doc = plannedDoc();
  const { Lunch, Dinner } = slotIds(doc);
  const plain = emptyDay();
  const { day: banana } = bananaLunch(doc);
  const burrito = swapSlotToEntry(plain, Lunch, quickEntry(slotNamed(doc, 'Lunch'), BURRITO, 'Burrito place'));

  // Breakfast's oats plus whatever lunch is.
  const withLunch = (lunch) => Object.fromEntries(Object.entries(OATS_TOTALS).map(([key, value]) => [key, value + lunch[key]]));
  assertTotals(total(doc, plain), withLunch(RICE_BEEF_TOTALS), 'as planned');
  assertTotals(total(doc, banana), withLunch(BANANA_TOTALS), 'banana');
  assertTotals(total(doc, burrito), withLunch(BURRITO), 'burrito');

  const gap = (day) => flexGap(TARGETS, day, daySlots(doc, day), Dinner, getFood);
  assert.equal(gap(banana).kcal.amount, gap(plain).kcal.amount + RICE_BEEF_TOTALS.kcal - BANANA_TOTALS.kcal);
  assert.equal(gap(burrito).kcal.amount, gap(plain).kcal.amount + RICE_BEEF_TOTALS.kcal - BURRITO.kcal);
});

test('a swap to a food drops a meal swap, a skip, a portion and ingredients', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const items = mealIngredients(RICE_BEEF, getFood);
  const edited = setSlotPortion(setSlotIngredients(emptyDay(), Lunch, RICE_BEEF.id, items), Lunch, 1.5);
  const swapped = swapSlot(emptyDay(), Lunch, RICE_BOWL.id, RICE_BEEF.id);
  const skipped = skipSlot(emptyDay(), Lunch);

  for (const before of [edited, swapped, skipped]) {
    const { entry, day } = bananaLunch(doc, before);
    assert.deepEqual(day.changes[Lunch], { entry });
    assertTotals(slotTotals(planFor(doc, day, Lunch), getFood), BANANA_TOTALS);
  }

  assert.throws(() => swapSlotToEntry(emptyDay(), Lunch, null), RangeError);
});

test('a swap back to a meal, Skip, a portion and As planned each drop it, and Reset keeps it', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const { entry, day } = bananaLunch(doc);

  assert.deepEqual(swapSlot(day, Lunch, RICE_BOWL.id, RICE_BEEF.id).changes[Lunch], { mealId: RICE_BOWL.id });
  // Back to the template's own meal is no change at all.
  assert.deepEqual(swapSlot(day, Lunch, RICE_BEEF.id, RICE_BEEF.id).changes, {});
  assert.deepEqual(skipSlot(day, Lunch).changes[Lunch], { mealId: null });
  assert.deepEqual(setSlotPortion(day, Lunch, 1.5).changes[Lunch], { portion: 1.5 });
  assert.deepEqual(clearSlotChange(day, Lunch).changes, {});
  assert.deepEqual(resetSlotIngredients(day, Lunch).changes[Lunch], { entry });

  const asPlanned = planFor(doc, clearSlotChange(day, Lunch), Lunch);
  assert.equal(asPlanned.swapEntry, null);
  assert.equal(asPlanned.swapped, false);
  assertTotals(slotTotals(asPlanned, getFood), RICE_BEEF_TOTALS);
});

test("a swap left on a slot that's since turned flex is ignored", () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const { day } = bananaLunch(doc);

  // The template now plans the slot as flex, or its meal was deleted.
  for (const later of [setSlotMeal(doc, Lunch, null), { ...doc, meals: [OATS, RICE_BOWL] }]) {
    const plan = planFor(later, day, Lunch);
    assert.equal(plan.meal, null);
    assert.equal(plan.swapEntry, null);
    assert.equal(plan.swapped, false);
    assertTotals(slotTotals(plan, getFood), ZERO);
  }
});

// --- Lock-in ---

test("lockDay writes it as it is, in its slot's place and not marked planned, so Recent lists it", () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch, Dinner } = slotIds(doc);
  // The first slot swapped, so it has to come before Lunch's planned meal and the added extra.
  const entry = foodEntry(slotNamed(doc, 'Breakfast'), BANANA, 120);
  const extra = quickEntry(slotNamed(doc, 'Dinner'), BURRITO, 'Burrito place');
  const day = addEntry(swapSlotToEntry(emptyDay(), Breakfast, entry), extra);
  const locked = lockDay(day, doc, doc.meals, FOODS);

  assert.deepEqual(locked.entries.map((e) => e.slotId), [Breakfast, Lunch, Dinner]);
  assert.deepEqual(locked.entries[0], entry);
  assert.equal(locked.entries[1].label, RICE_BEEF.name);
  assert.equal(locked.entries[1].planned, true);
  assert.deepEqual(locked.entries[2], extra);
  assert.deepEqual(locked.changes, {});
  assertTotals(dayTotal(locked, [], getFood), total(doc, day), 'same total');

  const recent = recentEntries({ '2026-10-20': locked }, '2026-10-21');
  assert.deepEqual(recent.map(({ entry: e }) => e.label), ['Burrito place', 'Banana']);
});

test("deleting or editing the food afterwards leaves the day's total as it was", () => {
  const doc = plannedDoc();
  const { day } = bananaLunch(doc);
  const before = total(doc, day);

  // Banana deleted for good, or edited to new numbers.
  const deleted = FOODS.filter((f) => f !== BANANA);
  const edited = FOODS.map((f) => (f === BANANA ? { ...BANANA, kcal: 120, carbs: 30 } : f));
  for (const foods of [deleted, edited]) {
    assertTotals(total(doc, day, foodLookup(foods)), before);
    assertTotals(dayTotal(lockDay(day, doc, doc.meals, foods), [], foodLookup(foods)), before);
  }
});

test('an off-plan day ignores it', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const day = { ...bananaLunch(doc).day, offPlan: true };
  const plan = planFor(doc, day, Lunch);
  assert.equal(plan.swapEntry, null);
  assert.equal(plan.swapped, false);
  assertTotals(total(doc, day), ZERO);
  assert.deepEqual(lockDay(day, doc, doc.meals, FOODS).entries, []);
});
