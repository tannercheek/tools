// plannedDayItems (day-plan.js): what the template plans in a slot now, whatever the day's
// changes, for the slot actions sheet to offer a skipped slot's items (PLAN 14.15).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, foodDayItem, mealDayItem } from '../js/data.js';
import { dayPlan, plannedDayItems, skipPlannedSlot } from '../js/day-plan.js';
import { BANANA, OATS, RICE_BEEF, getFood, itemsDoc, itemsOf, oldShapeDoc, planOf, slotIds } from './day-plan-fixtures.js';

test('plannedDayItems gives what the template plans in a slot as day items, whatever the day', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats, banana] = itemsOf(doc, 'Breakfast');
  const planned = [mealDayItem(oats.id, OATS, getFood), foodDayItem(banana.id, BANANA, 1, 'medium')];
  assert.deepEqual(plannedDayItems(doc, ids.Breakfast, getFood), planned);
  // A skipped slot eats none of them, but still plans them.
  assert.deepEqual(planOf(dayPlan(doc, skipPlannedSlot(emptyDay(), ids.Breakfast), getFood), 'Breakfast').items, []);
  assert.deepEqual(plannedDayItems(doc, ids.Breakfast, getFood), planned);
  // A slot saved before slots held items reads the same way, and a flex slot plans nothing.
  const old = oldShapeDoc();
  assert.deepEqual(
    plannedDayItems(old, slotIds(old).Lunch, getFood),
    [mealDayItem(`meal-${RICE_BEEF.id}`, RICE_BEEF, getFood)],
  );
  assert.deepEqual(plannedDayItems(doc, ids.Dinner, getFood), []);
});
