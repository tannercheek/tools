import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, foodDayItem, mealDayItem, swappedIn } from '../js/data.js';
import {
  dayPlan,
  removePlannedItem,
  setItemPortion,
  skipPlannedSlot,
  swapPlannedItem,
  swapPlannedItemToDefault,
} from '../js/day-plan.js';
import { replacePlannedItem } from '../js/slots.js';
import {
  APPLE,
  BANANA,
  OATS,
  RICE,
  RICE_BEEF,
  RICE_BOWL,
  getFood,
  itemsDoc,
  itemsOf,
  oldShapeDoc,
  planOf,
  slotIds,
  withChanges,
} from './day-plan-fixtures.js';

const PLACED = 'placed';
const itemsIn = (doc, day, name) => planOf(dayPlan(doc, day, getFood), name).items;

// The template changed as the swap sheet's Make this the default changes it, then the day.
function makeDefault(doc, day, slotId, itemId, item, plan) {
  const next = replacePlannedItem(doc, slotId, itemId, plan, PLACED);
  return { next, day: swapPlannedItemToDefault(next, day, slotId, itemId, item, PLACED, getFood) };
}

test('replacePlannedItem places the new item under the id it’s given', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [, banana] = itemsOf(doc, 'Breakfast');
  const next = replacePlannedItem(doc, ids.Breakfast, banana.id, { food: APPLE, qty: 1, unit: 'medium' }, PLACED);
  assert.deepEqual(itemsOf(next, 'Breakfast')[1], { id: PLACED, foodId: 'apple', qty: 1, unit: 'medium' });
});

test('a day with no version of its own reads the new template as it is, and only a skip goes', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const apple = foodDayItem(banana.id, APPLE, 1, 'medium');

  const plain = emptyDay();
  const { next, day } = makeDefault(doc, plain, ids.Breakfast, banana.id, apple, { food: APPLE, qty: 1, unit: 'medium' });
  assert.equal(day, plain);
  assert.deepEqual(itemsIn(next, day, 'Breakfast'), [mealDayItem(oats.id, OATS, getFood), foodDayItem(PLACED, APPLE, 1, 'medium')]);

  // A skip goes, and other slots keep their changes.
  let skipped = skipPlannedSlot(emptyDay(), ids.Breakfast);
  skipped = skipPlannedSlot(skipped, ids.Snack);
  const unskipped = makeDefault(doc, skipped, ids.Breakfast, banana.id, apple, { food: APPLE, qty: 1, unit: 'medium' }).day;
  assert.deepEqual(unskipped.changes, { [ids.Snack]: { skipped: true } });
});

test('a day with its own version takes the template’s new item in the item’s place, unmarked', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const rice = foodDayItem(banana.id, RICE, 150, 'g');
  const plan = { food: RICE, qty: 150, unit: 'g' };

  // Oats at 1.5× stays the day's own.
  const portioned = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  const { next, day } = makeDefault(doc, portioned, ids.Breakfast, banana.id, rice, plan);
  const [ownOats, placed] = itemsIn(next, day, 'Breakfast');
  assert.deepEqual(ownOats, itemsIn(doc, portioned, 'Breakfast')[0]);
  assert.deepEqual(placed, foodDayItem(PLACED, RICE, 150, 'g'));
  assert.equal(placed.swapped, undefined);

  // A day whose only change was to that item has none left.
  const swapped = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, foodDayItem('x', APPLE, 1, 'medium'), getFood);
  assert.deepEqual(makeDefault(doc, swapped, ids.Breakfast, banana.id, rice, plan).day.changes, {});
});

test('a meal already elsewhere in the slot stays once: the item just leaves the day, or is swapped in if the day has no other', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [riceBeef, riceBowl, apple] = itemsOf(doc, 'Lunch');
  const bowl = mealDayItem(apple.id, RICE_BOWL, getFood);
  const plan = { mealId: RICE_BOWL.id };

  const portioned = setItemPortion(doc, emptyDay(), ids.Lunch, riceBeef.id, 1.5, getFood);
  const { next, day } = makeDefault(doc, portioned, ids.Lunch, apple.id, bowl, plan);
  assert.deepEqual(itemsOf(next, 'Lunch'), [riceBeef, riceBowl]);
  assert.deepEqual(itemsIn(next, day, 'Lunch'), itemsIn(doc, portioned, 'Lunch').slice(0, 2));

  // Rice bowl removed for the day: the pick is swapped in, in the apple's place.
  const removed = removePlannedItem(doc, emptyDay(), ids.Lunch, riceBowl.id, getFood);
  const swapped = makeDefault(doc, removed, ids.Lunch, apple.id, bowl, plan).day;
  assert.deepEqual(itemsIn(next, swapped, 'Lunch'), [mealDayItem(riceBeef.id, RICE_BEEF, getFood), swappedIn(apple.id, bowl)]);
});

test('a food already elsewhere in the slot gets the amount there in the template, and is swapped in for a day with its own version', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [riceBeef, riceBowl, apple] = itemsOf(doc, 'Lunch');
  const pick = foodDayItem(riceBowl.id, APPLE, 1, 'medium');
  const plan = { food: APPLE, qty: 1, unit: 'medium' };

  const portioned = setItemPortion(doc, emptyDay(), ids.Lunch, riceBeef.id, 1.5, getFood);
  const { next, day } = makeDefault(doc, portioned, ids.Lunch, riceBowl.id, pick, plan);
  assert.deepEqual(itemsOf(next, 'Lunch'), [riceBeef, { ...apple, qty: 2 }]);
  const [ownRiceBeef, , ownApple] = itemsIn(doc, portioned, 'Lunch');
  assert.deepEqual(itemsIn(next, day, 'Lunch'), [ownRiceBeef, swappedIn(riceBowl.id, pick), ownApple]);
});

test('the item’s own meal or food changes nothing but the item, back as planned', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const ownOats = mealDayItem(oats.id, OATS, getFood);

  // Its own meal leaves the template as it was; a day with no version of its own is unchanged.
  const plain = emptyDay();
  const same = makeDefault(doc, plain, ids.Breakfast, oats.id, ownOats, { mealId: OATS.id });
  assert.equal(same.next, doc);
  assert.equal(same.day, plain);

  // On a day with its own version, the meal is back as planned at 1×, and the banana's swap stays.
  let day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, foodDayItem('x', APPLE, 1, 'medium'), getFood);
  const appleOnly = day.changes;
  day = setItemPortion(doc, day, ids.Breakfast, oats.id, 1.5, getFood);
  assert.deepEqual(makeDefault(doc, day, ids.Breakfast, oats.id, ownOats, { mealId: OATS.id }).day.changes, appleOnly);

  // Its own food at the same amount: the day eats the same, under the template's new item.
  const portioned = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 1.5, getFood);
  const ownBanana = foodDayItem(banana.id, BANANA, 1, 'medium');
  const food = makeDefault(doc, portioned, ids.Breakfast, banana.id, ownBanana, { food: BANANA, qty: 1, unit: 'medium' });
  const before = itemsIn(doc, portioned, 'Breakfast');
  assert.deepEqual(itemsIn(food.next, food.day, 'Breakfast'), [before[0], { ...before[1], id: PLACED }]);
});

test('an item that isn’t in the day’s version, or a flex slot, leaves the day as it was', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const removed = removePlannedItem(doc, emptyDay(), ids.Breakfast, banana.id, getFood);
  const pick = foodDayItem(banana.id, APPLE, 1, 'medium');
  assert.equal(makeDefault(doc, removed, ids.Breakfast, banana.id, pick, { food: APPLE, qty: 1, unit: 'medium' }).day, removed);
  const leftover = withChanges(emptyDay(), { [ids.Dinner]: { skipped: true } });
  assert.equal(swapPlannedItemToDefault(doc, leftover, ids.Dinner, oats.id, pick, PLACED, getFood), leftover);
});

test('a change saved before slots held items, swapped against its own template first, ends as the new template', () => {
  const doc = oldShapeDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  const old = withChanges(emptyDay(), { [ids.Breakfast]: { portion: 1.5 }, [ids.Lunch]: { skipped: true } });
  const bowl = mealDayItem(oats.id, RICE_BOWL, getFood);
  const next = replacePlannedItem(doc, ids.Breakfast, oats.id, { mealId: RICE_BOWL.id }, PLACED);
  const swapped = swapPlannedItem(doc, old, ids.Breakfast, oats.id, bowl, getFood);
  const day = swapPlannedItemToDefault(next, swapped, ids.Breakfast, oats.id, bowl, PLACED, getFood);
  assert.deepEqual(day.changes, { [ids.Lunch]: { skipped: true } });
  assert.deepEqual(itemsIn(next, day, 'Breakfast').map(({ label, portion }) => [label, portion]), [['Rice bowl', 1], ['Banana', undefined]]);
});
