// A planned item's portion in the template (SPEC §3.4): Plan's totals, what a day reads from it,
// a day's own portion on top, Make this the default, and lock-in.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPlanTotal, templateTotal } from '../js/calc.js';
import { addEntry, emptyDay, foodEntry, mealDayItem, recentEntries } from '../js/data.js';
import { dayPlan, plannedDayItems, setItemPortion, swapPlannedItem, swapPlannedItemToDefault } from '../js/day-plan.js';
import { lockDay } from '../js/lock-in.js';
import {
  addPlannedFood,
  addPlannedMeal,
  clearSlotChange,
  planSlots,
  replacePlannedItem,
  setPlannedPortion,
} from '../js/slots.js';
import {
  APPLE,
  APPLE_TOTALS,
  BANANA,
  BANANA_TOTALS,
  BUDGET,
  FOODS,
  OATS,
  OATS_TOTALS,
  RICE_BEEF_TOTALS,
  RICE_BOWL,
  assertTotals,
  getFood,
  itemsDoc,
  itemsOf,
  oldShapeDoc,
  planOf,
  slotIds,
  slotNamed,
  times,
} from './day-plan-fixtures.js';

const sum = (...list) => Object.fromEntries(['kcal', 'protein', 'fat', 'carbs'].map((key) => [key, list.reduce((n, t) => n + t[key], 0)]));

// itemsDoc with Breakfast's Oats at 1.5×.
function oatsAtOneAndAHalf() {
  const doc = itemsDoc();
  const [oats] = itemsOf(doc, 'Breakfast');
  return { doc: setPlannedPortion(doc, slotIds(doc).Breakfast, oats.id, 1.5), oatsId: oats.id };
}

const breakfast = (doc, day) => planOf(dayPlan(doc, day, getFood), 'Breakfast');

// --- setPlannedPortion ---

test('a planned item takes a portion, and 1× is stored as none', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const portioned = setPlannedPortion(setPlannedPortion(doc, ids.Breakfast, oats.id, 1.5), ids.Breakfast, banana.id, 2);
  assert.deepEqual(itemsOf(portioned, 'Breakfast'), [{ ...oats, portion: 1.5 }, { ...banana, portion: 2 }]);
  assert.deepEqual(itemsOf(doc, 'Breakfast'), [oats, banana], 'the doc passed in is unchanged');

  const back = setPlannedPortion(portioned, ids.Breakfast, oats.id, 1);
  assert.equal(Object.hasOwn(itemsOf(back, 'Breakfast')[0], 'portion'), false);
});

test('a portion is above 0, and an item that isn’t there changes nothing', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  for (const portion of [0, -1, NaN, Infinity]) {
    assert.throws(() => setPlannedPortion(doc, ids.Breakfast, oats.id, portion), RangeError);
  }
  assert.equal(setPlannedPortion(doc, ids.Breakfast, 'gone', 1.5), doc);
});

test('a slot saved before slots held items takes a portion, written as items', () => {
  const doc = oldShapeDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const portioned = setPlannedPortion(doc, ids.Breakfast, oats.id, 1.5);
  assert.deepEqual(portioned.template[ids.Breakfast], { budget: null, items: [{ ...oats, portion: 1.5 }, banana] });
});

test('adding a meal or a food that’s already planned keeps its portion', () => {
  let doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  doc = setPlannedPortion(doc, ids.Breakfast, oats.id, 1.5);
  doc = setPlannedPortion(doc, ids.Breakfast, banana.id, 2);
  doc = addPlannedMeal(doc, ids.Breakfast, OATS.id);
  doc = addPlannedFood(doc, ids.Breakfast, BANANA, 1, 'medium');
  assert.deepEqual(itemsOf(doc, 'Breakfast'), [
    { ...oats, portion: 1.5 },
    { ...banana, qty: 2, portion: 2 },
  ]);
});

// --- Plan's totals ---

test('a meal planned at 1.5× counts at 1.5× in Plan’s totals', () => {
  const { doc } = oatsAtOneAndAHalf();
  // Breakfast: Oats at 1.5× + a banana. Lunch: Rice & beef, Rice bowl and an apple. Snack: an
  // apple. Dinner: the pinned budget.
  const riceBowl = mealDayItem('bowl', RICE_BOWL, getFood);
  const expected = sum(times(OATS_TOTALS, 1.5), BANANA_TOTALS, RICE_BEEF_TOTALS, riceBowl, APPLE_TOTALS, APPLE_TOTALS, BUDGET);
  assertTotals(templateTotal(planSlots(doc, getFood), getFood), expected);
});

test('a food planned at a portion counts at its amount times the portion in Plan’s totals', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [, banana] = itemsOf(doc, 'Breakfast');
  const before = templateTotal(planSlots(doc, getFood), getFood);
  const after = templateTotal(planSlots(setPlannedPortion(doc, ids.Breakfast, banana.id, 1.5), getFood), getFood);
  assertTotals(after, sum(before, times(BANANA_TOTALS, 0.5)));
});

test('planSlots carries each item’s portion', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const [oats, banana] = planOf(planSlots(doc, getFood), 'Breakfast').items;
  assert.equal(oats.id, oatsId);
  assert.equal(oats.portion, 1.5);
  assert.equal(Object.hasOwn(banana, 'portion'), false);
});

// --- What a day reads ---

test('a day with no changes eats a meal planned at 1.5× at 1.5×, with no As planned to offer', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const slot = breakfast(doc, emptyDay());
  assert.equal(slot.ownVersion, false);
  assert.deepEqual(slot.items[0], { ...mealDayItem(oatsId, OATS, getFood), ...times(OATS_TOTALS, 1.5), portion: 1.5 });
  assertTotals(slot.items[0], times(OATS_TOTALS, 1.5));

  const dayTotal = (d) => dayPlanTotal(emptyDay(), dayPlan(d, emptyDay(), getFood));
  assertTotals(dayTotal(doc), sum(dayTotal(itemsDoc()), times(OATS_TOTALS, 0.5)), 'the day’s total');
});

test('a food planned at a portion is eaten at it, and one at 1× has no portion, as before', () => {
  const doc = itemsDoc();
  const [, banana] = itemsOf(doc, 'Breakfast');
  assert.equal(Object.hasOwn(breakfast(doc, emptyDay()).items[1], 'portion'), false);

  const portioned = setPlannedPortion(doc, slotIds(doc).Breakfast, banana.id, 1.5);
  const item = breakfast(portioned, emptyDay()).items[1];
  assert.equal(item.portion, 1.5);
  assertTotals(item, times(BANANA_TOTALS, 1.5));
});

test('a template portion change reaches a day with no version of its own, and not one that has one', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  // A day with its own version: the banana at 2×, copied with Oats at 1× as the template had it.
  const changed = setItemPortion(doc, emptyDay(), ids.Breakfast, banana.id, 2, getFood);
  const later = setPlannedPortion(doc, ids.Breakfast, oats.id, 1.5);

  assertTotals(breakfast(later, emptyDay()).items[0], times(OATS_TOTALS, 1.5));
  const own = breakfast(later, changed).items[0];
  assert.equal(own.portion, 1);
  assertTotals(own, OATS_TOTALS);
});

test('the first change copies the template’s portions into the day’s version', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const [, banana] = itemsOf(doc, 'Breakfast');
  const day = setItemPortion(doc, emptyDay(), slotIds(doc).Breakfast, banana.id, 2, getFood);
  const [oats] = day.changes[slotIds(doc).Breakfast].items;
  assert.equal(oats.id, oatsId);
  assert.equal(oats.portion, 1.5);
  assertTotals(oats, times(OATS_TOTALS, 1.5));
});

test('a day setting 1× on a meal planned at 1.5× eats it at 1×, and As planned brings back 1.5×', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const ids = slotIds(doc);
  const day = setItemPortion(doc, emptyDay(), ids.Breakfast, oatsId, 1, getFood);
  const slot = breakfast(doc, day);
  assert.equal(slot.ownVersion, true);
  assert.equal(slot.items[0].portion, 1);
  assertTotals(slot.items[0], OATS_TOTALS, '1× outright, not 1.5 × 1');

  const half = setItemPortion(doc, emptyDay(), ids.Breakfast, oatsId, 0.5, getFood);
  assertTotals(breakfast(doc, half).items[0], times(OATS_TOTALS, 0.5), '0.5× outright, not 1.5 × 0.5');

  const asPlanned = breakfast(doc, clearSlotChange(day, ids.Breakfast));
  assert.equal(asPlanned.ownVersion, false);
  assertTotals(asPlanned.items[0], times(OATS_TOTALS, 1.5));
});

test('setting a day’s portion back to the template’s leaves no change, for a meal and a food', () => {
  let { doc, oatsId } = oatsAtOneAndAHalf();
  const ids = slotIds(doc);
  const [, banana] = itemsOf(doc, 'Breakfast');
  doc = setPlannedPortion(doc, ids.Breakfast, banana.id, 1.5);

  let day = setItemPortion(doc, emptyDay(), ids.Breakfast, oatsId, 1, getFood);
  day = setItemPortion(doc, day, ids.Breakfast, oatsId, 1.5, getFood);
  assert.deepEqual(day.changes, {});

  // The banana's protein, 1.2 × 1.5 → 1× → 1.5×, comes back a float's last digit away.
  day = setItemPortion(doc, emptyDay(), ids.Breakfast, banana.id, 1, getFood);
  assertTotals(breakfast(doc, day).items[1], BANANA_TOTALS);
  day = setItemPortion(doc, day, ids.Breakfast, banana.id, 1.5, getFood);
  assert.deepEqual(day.changes, {});
});

test('a skipped slot offers what the template plans at its portions', () => {
  const { doc } = oatsAtOneAndAHalf();
  const [oats] = plannedDayItems(doc, slotIds(doc).Breakfast, getFood);
  assertTotals(oats, times(OATS_TOTALS, 1.5));
});

// --- Make this the default ---

test('Make this the default puts the pick in at 1×', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const ids = slotIds(doc);
  const toBowl = replacePlannedItem(doc, ids.Breakfast, oatsId, { mealId: RICE_BOWL.id }, 'bowl');
  assert.deepEqual(itemsOf(toBowl, 'Breakfast')[0], { id: 'bowl', mealId: RICE_BOWL.id });

  const toBanana = replacePlannedItem(doc, ids.Lunch, itemsOf(doc, 'Lunch')[0].id, { food: BANANA, qty: 2, unit: 'medium' }, 'b');
  assert.deepEqual(itemsOf(toBanana, 'Lunch')[0], { id: 'b', foodId: 'banana', qty: 2, unit: 'medium' });
});

test('Make this the default with the item’s own meal puts it back to 1×, and at 1× changes nothing', () => {
  const { doc, oatsId } = oatsAtOneAndAHalf();
  const ids = slotIds(doc);
  const same = replacePlannedItem(doc, ids.Breakfast, oatsId, { mealId: OATS.id }, 'again');
  assert.deepEqual(itemsOf(same, 'Breakfast')[0], { id: 'again', mealId: OATS.id });
  assert.equal(replacePlannedItem(same, ids.Breakfast, 'again', { mealId: OATS.id }), same);

  // The day swapped Oats for itself, made the default: it eats the template at 1×, with no change left.
  const pick = mealDayItem('picked', OATS, getFood);
  const day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, oatsId, pick, getFood);
  const defaulted = swapPlannedItemToDefault(same, day, ids.Breakfast, oatsId, pick, 'again', getFood);
  assert.deepEqual(defaulted.changes, {});
  assertTotals(breakfast(same, defaulted).items[0], OATS_TOTALS);
});

test('a food already planned elsewhere in the slot keeps its portion when the default adds to it', () => {
  let doc = itemsDoc();
  const ids = slotIds(doc);
  const [riceBeef, , apple] = itemsOf(doc, 'Lunch');
  doc = setPlannedPortion(doc, ids.Lunch, apple.id, 2);
  const replaced = replacePlannedItem(doc, ids.Lunch, riceBeef.id, { food: APPLE, qty: 1, unit: 'medium' });
  assert.deepEqual(itemsOf(replaced, 'Lunch').find(({ id }) => id === apple.id), { ...apple, qty: 2, portion: 2 });
});

// --- Lock-in ---

test('lock-in writes the template portion, marked planned, and Recent leaves it out', () => {
  let { doc } = oatsAtOneAndAHalf();
  const ids = slotIds(doc);
  const [, banana] = itemsOf(doc, 'Breakfast');
  doc = setPlannedPortion(doc, ids.Breakfast, banana.id, 1.5);
  const day = addEntry(emptyDay(), foodEntry(slotNamed(doc, 'Lunch'), BANANA, 1, 'medium'));
  const locked = lockDay(day, doc, doc.meals, FOODS);

  const oats = locked.entries.find(({ label }) => label === 'Oats');
  assert.equal(oats.portion, 1.5);
  assert.equal(oats.planned, true);
  assertTotals(oats, times(OATS_TOTALS, 1.5));
  const plannedBanana = locked.entries.find(({ label, slotName }) => label === 'Banana' && slotName === 'Breakfast');
  assert.equal(plannedBanana.portion, 1.5);
  assert.equal(plannedBanana.planned, true);
  assertTotals(plannedBanana, times(BANANA_TOTALS, 1.5));

  const recent = recentEntries({ '2026-10-19': locked }, '2026-10-20');
  assert.deepEqual(recent.map(({ entry }) => entry.slotName), ['Lunch'], 'only the banana added to Lunch');
});

// --- Saved before portions ---

test('a template saved before portions reads as 1×', () => {
  for (const doc of [itemsDoc(), oldShapeDoc()]) {
    const plans = planSlots(doc, getFood);
    assert.ok(plans.flatMap(({ items }) => items).every((item) => !Object.hasOwn(item, 'portion')));
    const [oats, banana] = breakfast(doc, emptyDay()).items;
    assert.equal(oats.portion, 1);
    assertTotals(oats, OATS_TOTALS);
    assert.equal(Object.hasOwn(banana, 'portion'), false);
    assertTotals(banana, BANANA_TOTALS);
  }
});
