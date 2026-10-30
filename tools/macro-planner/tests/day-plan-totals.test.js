import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPlanFlexGap, dayPlanSlotTotals, dayPlanTotal, ingredientsTotals, templateTotal } from '../js/calc.js';
import { addEntry, createEntry, emptyDay, foodEntry, mealDayItem, quickEntry, recentEntries } from '../js/data.js';
import { dayPlan, setItemIngredients, setItemPortion, swapPlannedItem } from '../js/day-plan.js';
import { mealIngredients, setIngredientQty } from '../js/ingredients.js';
import { lockDay } from '../js/lock-in.js';
import { deleteMeal } from '../js/saved-meals.js';
import { addPlannedMeal, planSlots, setSlotBudget } from '../js/slots.js';
import {
  oldShapeDaySlots,
  oldShapeDayTotal,
  oldShapeFlexGap,
  oldShapeSlotMealTotals,
  oldShapeSlotTotals,
} from './old-slot-model-reference.js';
import {
  APPLE_TOTALS,
  BANANA_TOTALS,
  BEEF,
  BUDGET,
  FOODS,
  OATS,
  OATS_TOTALS,
  OLD_SHAPE_DAYS,
  RICE_BEEF,
  RICE_BEEF_TOTALS,
  RICE_BOWL,
  assertTotals,
  freshDoc,
  getFood,
  itemsDoc,
  itemsOf,
  oldShapeDoc,
  planOf,
  slotIds,
  slotNamed,
  times,
  withChanges,
} from './day-plan-fixtures.js';

const KEYS = ['kcal', 'protein', 'fat', 'carbs'];
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
const sum = (...list) => Object.fromEntries(KEYS.map((key) => [key, list.reduce((total, each) => total + each[key], 0)]));

// 300 g rice.
const RICE_BOWL_TOTALS = { kcal: 390, protein: 7.5, fat: 0.9, carbs: 84 };
const TARGETS = { kcal: 2600, protein: 180, fat: 70, carbs: 300, warnings: [] };

// --- The old lock-in, kept here to check the new one against ---
// lock-in.js as it was before it read dayPlan: over slots.js's daySlots, a slot's meal, then its
// planned foods, or what was swapped in for the meal as it was stored.

const marked = (entry) => ({ ...entry, planned: true });

function oldLockedEntries(plan) {
  if (plan.skipped) return [];
  const foods = plan.foods.map(({ name, emoji, ...numbers }) => marked(createEntry(plan, { label: name, emoji, source: 'food' }, numbers)));
  if (plan.swapEntry) return [plan.swapEntry, ...foods];
  if (plan.meal) {
    const { name, emoji } = plan.meal;
    return [marked(createEntry(plan, { label: name, emoji, source: 'meal' }, oldShapeSlotMealTotals(plan, getFood))), ...foods];
  }
  if (plan.flex && plan.budget && plan.entries.length === 0) return [marked(quickEntry(plan, plan.budget))];
  return foods;
}

function oldLockDay(day, doc) {
  const fromSlots = day.offPlan ? [] : oldShapeDaySlots(doc, day, getFood).flatMap(oldLockedEntries);
  return { ...day, changes: {}, entries: [...fromSlots, ...(day.entries ?? [])], locked: true };
}

// An entry as the agreement tests compare it: where it goes, what it is and whether it's the plan.
// Not its id, which is new each lock-in, nor its numbers, compared to within a hair, nor a meal's
// portion and ingredients, which the old lock-in didn't keep.
const described = ({ slotId, slotName, label, emoji, source, planned }) => ({ slotId, slotName, label, emoji, source, planned: Boolean(planned) });

// The old lock-in's entries as the new one marks them: a meal swapped in is something chosen, so
// it's no longer marked planned (SPEC §3.5). The old one marked only a food or quick numbers.
function oldAsNowMarked(doc, day, entries) {
  const swappedMeals = new Set(oldShapeDaySlots(doc, day, getFood).filter((plan) => plan.swapped && !plan.swapEntry).map(({ id }) => id));
  return entries.map((entry) =>
    entry.planned && entry.source === 'meal' && swappedMeals.has(entry.slotId) ? { ...entry, planned: false } : entry,
  );
}

// --- Agreement with the old totals and lock-in, on days saved before slots held items ---

for (const [name, makeDay] of Object.entries(OLD_SHAPE_DAYS)) {
  test(`totals, flex gaps and lock-in agree with the old ones: ${name}`, () => {
    const saved = oldShapeDoc();
    const { day, doc = saved } = makeDay(saved, slotIds(saved));
    const plans = oldShapeDaySlots(doc, day, getFood);
    const slots = dayPlan(doc, day, getFood);

    assertTotals(dayPlanTotal(day, slots), oldShapeDayTotal(day, plans, getFood), 'day');
    for (const slot of slots) {
      assertTotals(dayPlanSlotTotals(slot), oldShapeSlotTotals(planOf(plans, slot.name), getFood), slot.name);
      assert.deepEqual(dayPlanFlexGap(TARGETS, day, slots, slot.id), oldShapeFlexGap(TARGETS, day, plans, slot.id, getFood), slot.name);
    }

    const locked = lockDay(day, doc, doc.meals, FOODS);
    const old = oldLockDay(day, doc);
    assert.deepEqual({ ...locked, entries: [] }, { ...old, entries: [] });
    assert.deepEqual(locked.entries.map(described), oldAsNowMarked(doc, day, old.entries).map(described));
    locked.entries.forEach((entry, i) => assertTotals(entry, old.entries[i], `${entry.slotName} ${entry.label}`));
    for (const entry of locked.entries.filter(({ source, ingredients }) => source === 'meal' && ingredients)) {
      assertTotals(entry, times(ingredientsTotals(entry.ingredients), entry.portion), `${entry.label} at its portion`);
    }
    assertTotals(dayPlanTotal(locked, []), oldShapeDayTotal(old, [], getFood), 'locked');
  });
}

test('with no targets there’s no flex gap', () => {
  const doc = oldShapeDoc();
  assert.equal(dayPlanFlexGap(null, emptyDay(), dayPlan(doc, emptyDay(), getFood), slotIds(doc).Dinner), null);
});

// Each template the old-shape days are read against, and the old Plan total from daySlots.
const templates = () => {
  const saved = oldShapeDoc();
  const changed = Object.values(OLD_SHAPE_DAYS).flatMap((makeDay) => makeDay(saved, slotIds(saved)).doc ?? []);
  return [freshDoc(), saved, deleteMeal(saved, OATS.id), ...changed];
};

test('the template’s total agrees with the old Plan total on templates saved before slots held items', () => {
  for (const doc of templates()) {
    assertTotals(templateTotal(planSlots(doc, getFood), getFood), oldShapeDayTotal(emptyDay(), oldShapeDaySlots(doc, emptyDay(), getFood), getFood));
  }
});

// --- Totals over slot items ---

test('a slot with two meals and a food, one meal at 1.5×, totals each at its own portion or amount', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [riceBeef] = itemsOf(doc, 'Lunch');
  const day = setItemPortion(doc, emptyDay(), ids.Lunch, riceBeef.id, 1.5, getFood);
  const slots = dayPlan(doc, day, getFood);
  const lunch = sum(times(RICE_BEEF_TOTALS, 1.5), RICE_BOWL_TOTALS, APPLE_TOTALS);
  assertTotals(dayPlanSlotTotals(planOf(slots, 'Lunch')), lunch, 'Lunch');
  const breakfast = sum(OATS_TOTALS, BANANA_TOTALS);
  assertTotals(dayPlanTotal(day, slots), sum(breakfast, lunch, APPLE_TOTALS, BUDGET), 'day');

  // Plan shows the template, so the day's portion doesn't reach it.
  const template = sum(breakfast, RICE_BEEF_TOTALS, RICE_BOWL_TOTALS, APPLE_TOTALS, APPLE_TOTALS, BUDGET);
  assertTotals(templateTotal(planSlots(doc, getFood), getFood), template, 'template');
});

test('a pinned budget counts only while its slot is open flex', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const dinnerOf = (d, day) => planOf(dayPlan(d, day, getFood), 'Dinner');
  assertTotals(dayPlanSlotTotals(dinnerOf(doc, emptyDay())), BUDGET, 'open');

  // Filled: what's in it counts, in the day's total, and the budget doesn't.
  const filled = addEntry(emptyDay(), foodEntry(slotNamed(doc, 'Dinner'), BEEF, 150, 'g'));
  assertTotals(dayPlanSlotTotals(dinnerOf(doc, filled)), ZERO, 'filled');
  const withoutDinner = dayPlanTotal(emptyDay(), dayPlan(doc, emptyDay(), getFood));
  assertTotals(dayPlanTotal(filled, dayPlan(doc, filled, getFood)), sum(withoutDinner, filled.entries[0], times(BUDGET, -1)), 'filled day');

  // Planned: a budget left on the slot stays on the template but counts nowhere.
  const planned = addPlannedMeal(setSlotBudget(doc, ids.Dinner, BUDGET), ids.Dinner, RICE_BOWL.id);
  assertTotals(dayPlanSlotTotals(dinnerOf(planned, emptyDay())), RICE_BOWL_TOTALS, 'planned');
  const templateWithBowl = templateTotal(planSlots(planned, getFood), getFood);
  assertTotals(templateWithBowl, sum(templateTotal(planSlots(doc, getFood), getFood), RICE_BOWL_TOTALS, times(BUDGET, -1)), 'template');

  // Off plan and locked, only the entries count.
  const offPlan = { ...filled, offPlan: true };
  assertTotals(dayPlanTotal(offPlan, dayPlan(doc, offPlan, getFood)), filled.entries[0], 'off plan');
  assertTotals(dayPlanTotal({ ...filled, locked: true }, dayPlan(doc, filled, getFood)), filled.entries[0], 'locked');

  // Lock-in writes the budget only while the slot is open.
  const budgets = (day) => lockDay(day, doc, doc.meals, FOODS).entries.filter(({ label }) => label === 'Dinner');
  assert.equal(budgets(emptyDay()).length, 1);
  assert.deepEqual(budgets(filled), []);
});

// --- Lock-in over slot items ---

test('lock-in writes a swapped-in meal unmarked and a portioned or edited planned meal marked, and Recent lists only the first', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  const [riceBeef] = itemsOf(doc, 'Lunch');
  const [apple] = itemsOf(doc, 'Snack');
  let day = swapPlannedItem(doc, emptyDay(), ids.Breakfast, oats.id, mealDayItem('picked', RICE_BOWL, getFood), getFood);
  day = setItemPortion(doc, day, ids.Lunch, riceBeef.id, 1.5, getFood);
  const edit = setIngredientQty(mealIngredients(RICE_BOWL, getFood), 'rice', 200);
  day = setItemIngredients(doc, day, ids.Lunch, itemsOf(doc, 'Lunch')[1].id, edit, getFood);
  day = addEntry(day, foodEntry(slotNamed(doc, 'Snack'), BEEF, 50, 'g'));
  const locked = lockDay(day, doc, doc.meals, FOODS);

  assert.deepEqual(
    locked.entries.map(({ slotName, label, source, planned }) => [slotName, label, source, Boolean(planned)]),
    [
      ['Breakfast', 'Rice bowl', 'meal', false],
      ['Breakfast', 'Banana', 'food', true],
      ['Lunch', 'Rice & beef', 'meal', true],
      ['Lunch', 'Rice bowl', 'meal', true],
      ['Lunch', 'Apple', 'food', true],
      ['Dinner', 'Dinner', 'quick', true],
      ['Snack', 'Apple', 'food', true],
      ['Snack', 'Beef, ground, cooked', 'food', false],
    ],
  );
  const [bowl, banana, beefBowl, editedBowl] = locked.entries;
  assert.deepEqual([bowl.portion, bowl.ingredients, bowl.originalIngredients], [1, mealIngredients(RICE_BOWL, getFood), undefined]);
  assertTotals(bowl, RICE_BOWL_TOTALS, 'swapped in');
  assert.deepEqual([beefBowl.portion, beefBowl.ingredients], [1.5, mealIngredients(RICE_BEEF, getFood)]);
  assertTotals(beefBowl, times(RICE_BEEF_TOTALS, 1.5), 'at 1.5×');
  assert.deepEqual([editedBowl.portion, editedBowl.ingredients, editedBowl.originalIngredients], [1, edit, mealIngredients(RICE_BOWL, getFood)]);
  assertTotals(editedBowl, ingredientsTotals(edit), 'edited');

  // A food is written like an added one, with no amount, and no entry keeps its day item's id or mark.
  assert.deepEqual(Object.keys(banana).sort(), ['carbs', 'emoji', 'fat', 'id', 'kcal', 'label', 'planned', 'protein', 'slotId', 'slotName', 'source']);
  for (const entry of locked.entries) {
    assert.ok(![oats.id, riceBeef.id, apple.id].includes(entry.id), entry.label);
    assert.equal(Object.hasOwn(entry, 'swapped'), false, entry.label);
    assert.equal(Object.hasOwn(entry, 'mealId'), false, entry.label);
  }
  assert.equal(new Set(locked.entries.map(({ id }) => id)).size, locked.entries.length);

  assertTotals(dayPlanTotal(locked, []), dayPlanTotal(day, dayPlan(doc, day, getFood)), 'same total');
  const recent = recentEntries({ '2026-10-20': locked }, '2026-10-21');
  assert.deepEqual(recent.map(({ entry }) => entry.label), ['Beef, ground, cooked', 'Rice bowl']);
});

test('lock-in reads a day’s version of the slot after the template has moved on', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [oats] = itemsOf(doc, 'Breakfast');
  const day = setItemPortion(doc, emptyDay(), ids.Breakfast, oats.id, 2, getFood);
  const later = deleteMeal(doc, OATS.id);
  const [breakfast] = lockDay(day, later, later.meals, FOODS).entries;
  assert.deepEqual([breakfast.label, breakfast.planned, breakfast.portion], ['Oats', true, 2]);
  assertTotals(breakfast, times(OATS_TOTALS, 2));
});

test('lock-in writes a portioned planned food marked planned, with its portion', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const [, banana] = itemsOf(doc, 'Breakfast');
  const day = setItemPortion(doc, emptyDay(), ids.Breakfast, banana.id, 1.5, getFood);
  const locked = lockDay(day, doc, doc.meals, FOODS);
  const bananaEntry = locked.entries.find(({ label }) => label === 'Banana');
  assert.equal(bananaEntry.portion, 1.5);
  assert.equal(bananaEntry.planned, true);
  assertTotals(bananaEntry, times(BANANA_TOTALS, 1.5));
});

test('an old-shape change left on a slot that’s since turned flex locks in nothing for it', () => {
  const doc = itemsDoc();
  const ids = slotIds(doc);
  const day = withChanges(emptyDay(), { [ids.Dinner]: { mealId: OATS.id, portion: 2 } });
  const dinner = lockDay(day, doc, doc.meals, FOODS).entries.filter(({ slotId }) => slotId === ids.Dinner);
  assert.deepEqual(dinner.map(({ label, source }) => [label, source]), [['Dinner', 'quick']]);
});
