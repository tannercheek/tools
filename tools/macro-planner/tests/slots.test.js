import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoreDoc, emptyDay } from '../js/data.js';
import { createMeal, deleteMeal } from '../js/saved-meals.js';
import {
  MAX_SLOTS,
  MIN_SLOTS,
  addSlot,
  clearSlotChange,
  createSlot,
  moveSlot,
  removeSlot,
  renameSlot,
  setSlotMeal,
  setSlotPortion,
  skipSlot,
  swapSlot,
  templateSlots,
} from '../js/slots.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function freshDoc() {
  return createCoreDoc('2026-10-15');
}

const names = (doc) => doc.slots.map((slot) => slot.name);

function docWithSlots(count) {
  let doc = freshDoc();
  while (doc.slots.length < count) doc = addSlot(doc, createSlot(`Slot ${doc.slots.length + 1}`));
  return doc;
}

// --- Creating and adding ---

test('a new slot gets a uuid id and a trimmed name', () => {
  const slot = createSlot('  Pre-workout ');
  assert.match(slot.id, UUID);
  assert.equal(slot.name, 'Pre-workout');
  assert.notEqual(createSlot('Pre-workout').id, slot.id);
});

test('a slot needs a name', () => {
  assert.throws(() => createSlot('   '), RangeError);
  assert.throws(() => createSlot(''), RangeError);
});

test('an added slot goes last, as flex with no budget', () => {
  const doc = freshDoc();
  const slot = createSlot('Snack');
  const next = addSlot(doc, slot);
  assert.deepEqual(names(next), ['Breakfast', 'Lunch', 'Dinner', 'Snack']);
  assert.deepEqual(next.template[slot.id], { mealId: null, budget: null });
  assert.equal(doc.slots.length, 3, 'the doc passed in is unchanged');
  assert.equal(doc.template[slot.id], undefined);
});

test(`slots can go up to ${MAX_SLOTS}, and no further`, () => {
  const full = docWithSlots(MAX_SLOTS);
  assert.equal(full.slots.length, MAX_SLOTS);
  assert.throws(() => addSlot(full, createSlot('One more')), RangeError);
});

// --- Renaming ---

test('renaming changes only that slot, trimmed, and leaves its template entry', () => {
  const doc = freshDoc();
  const [, lunch] = doc.slots;
  const next = renameSlot(doc, lunch.id, ' Midday ');
  assert.deepEqual(names(next), ['Breakfast', 'Midday', 'Dinner']);
  assert.equal(next.slots[1].id, lunch.id);
  assert.deepEqual(next.template, doc.template);
  assert.deepEqual(names(doc), ['Breakfast', 'Lunch', 'Dinner']);
});

test('a slot can’t be renamed to nothing', () => {
  const doc = freshDoc();
  assert.throws(() => renameSlot(doc, doc.slots[0].id, '  '), RangeError);
});

// --- Removing ---

test('removing a slot drops it and its template entry', () => {
  let doc = docWithSlots(4);
  const lunch = doc.slots[1];
  doc = setSlotMeal(doc, lunch.id, 'meal-1');
  const next = removeSlot(doc, lunch.id);
  assert.deepEqual(names(next), ['Breakfast', 'Dinner', 'Slot 4']);
  assert.equal(lunch.id in next.template, false);
  assert.equal(Object.keys(next.template).length, 3);
  assert.equal(doc.slots.length, 4, 'the doc passed in is unchanged');
});

test(`there are always at least ${MIN_SLOTS} slots`, () => {
  const doc = docWithSlots(MIN_SLOTS);
  assert.throws(() => removeSlot(doc, doc.slots[0].id), RangeError);
});

// --- Reordering ---

test('a slot moves up and down one place at a time', () => {
  const doc = freshDoc();
  const dinner = doc.slots[2];
  const up = moveSlot(doc, dinner.id, -1);
  assert.deepEqual(names(up), ['Breakfast', 'Dinner', 'Lunch']);
  assert.deepEqual(names(moveSlot(up, dinner.id, -1)), ['Dinner', 'Breakfast', 'Lunch']);
  assert.deepEqual(names(moveSlot(up, dinner.id, 1)), ['Breakfast', 'Lunch', 'Dinner']);
  assert.deepEqual(names(doc), ['Breakfast', 'Lunch', 'Dinner'], 'the doc passed in is unchanged');
});

test('moving keeps the template as it was, since it is keyed by slot id', () => {
  let doc = freshDoc();
  doc = setSlotMeal(doc, doc.slots[0].id, 'meal-1');
  const moved = moveSlot(doc, doc.slots[0].id, 1);
  assert.deepEqual(moved.template, doc.template);
  assert.equal(templateSlots({ ...moved, meals: [{ id: 'meal-1' }] })[1].meal.id, 'meal-1');
});

test('a slot at either end, or one that isn’t there, stays put', () => {
  const doc = freshDoc();
  assert.equal(moveSlot(doc, doc.slots[0].id, -1), doc);
  assert.equal(moveSlot(doc, doc.slots[2].id, 1), doc);
  assert.equal(moveSlot(doc, 'missing', 1), doc);
});

// --- Planning meals ---

test('a slot plans a meal, and goes back to flex with null', () => {
  const doc = freshDoc();
  const breakfast = doc.slots[0];
  const planned = setSlotMeal(doc, breakfast.id, 'meal-1');
  assert.deepEqual(planned.template[breakfast.id], { mealId: 'meal-1', budget: null });
  assert.deepEqual(setSlotMeal(planned, breakfast.id, null).template[breakfast.id], { mealId: null, budget: null });
  assert.equal(doc.template[breakfast.id].mealId, null, 'the doc passed in is unchanged');
});

test('planning a meal leaves the other slots and a pinned budget alone', () => {
  const doc = freshDoc();
  const [breakfast, lunch] = doc.slots;
  const budget = { kcal: 500, protein: 40, fat: 15, carbs: 50 };
  const pinned = { ...doc, template: { ...doc.template, [lunch.id]: { mealId: null, budget } } };
  const next = setSlotMeal(pinned, lunch.id, 'meal-1');
  assert.deepEqual(next.template[lunch.id], { mealId: 'meal-1', budget });
  assert.deepEqual(next.template[breakfast.id], doc.template[breakfast.id]);
});

// --- The template in order ---

test('templateSlots lists the slots in order with their planned meal, or null for flex', () => {
  const oats = createMeal({ name: 'Oats', emoji: '🥣' });
  let doc = { ...freshDoc(), meals: [oats] };
  const [breakfast, lunch, dinner] = doc.slots;
  doc = moveSlot(setSlotMeal(doc, breakfast.id, oats.id), dinner.id, -1);
  const slots = templateSlots(doc);
  assert.deepEqual(
    slots.map(({ id, name, meal }) => ({ id, name, meal })),
    [
      { id: breakfast.id, name: 'Breakfast', meal: oats },
      { id: dinner.id, name: 'Dinner', meal: null },
      { id: lunch.id, name: 'Lunch', meal: null },
    ],
  );
});

test('a slot planning a meal that’s gone counts as flex', () => {
  const oats = createMeal({ name: 'Oats' });
  let doc = { ...freshDoc(), meals: [oats] };
  doc = setSlotMeal(doc, doc.slots[0].id, 'deleted-meal');
  assert.equal(doc.template[doc.slots[0].id].mealId, 'deleted-meal');
  assert.ok(templateSlots(doc).every(({ meal }) => meal === null));
});

test('deleting a planned meal leaves its slot flex', () => {
  const oats = createMeal({ name: 'Oats' });
  let doc = { ...freshDoc(), meals: [oats] };
  doc = setSlotMeal(doc, doc.slots[0].id, oats.id);
  const after = deleteMeal(doc, oats.id);
  assert.equal(templateSlots(after)[0].meal, null);
  assert.equal(after.template[doc.slots[0].id].mealId, null);
});

test('a doc with no slots yet lists none', () => {
  assert.deepEqual(templateSlots({}), []);
});

// --- A day's changes ---

const dayWith = (changes) => ({ ...emptyDay(), changes });

test('skip sets the slot’s meal to null, dropping a swap or portion', () => {
  assert.deepEqual(skipSlot(emptyDay(), 's1').changes, { s1: { mealId: null } });
  assert.deepEqual(skipSlot(dayWith({ s1: { mealId: 'm2', portion: 1.5 } }), 's1').changes, { s1: { mealId: null } });
});

test('a portion keeps a swap and leaves other slots alone', () => {
  const day = dayWith({ s1: { mealId: 'm2' }, s2: { portion: 0.5 } });
  assert.deepEqual(setSlotPortion(day, 's1', 1.5).changes, { s1: { mealId: 'm2', portion: 1.5 }, s2: { portion: 0.5 } });
});

test('a portion on a skipped slot takes the skip back', () => {
  assert.deepEqual(setSlotPortion(dayWith({ s1: { mealId: null } }), 's1', 0.5).changes, { s1: { portion: 0.5 } });
});

test('1× isn’t stored, so a slot back at the template has no change', () => {
  assert.deepEqual(setSlotPortion(dayWith({ s1: { portion: 1.5 } }), 's1', 1).changes, {});
  assert.deepEqual(setSlotPortion(dayWith({ s1: { mealId: 'm2', portion: 1.5 } }), 's1', 1).changes, { s1: { mealId: 'm2' } });
  assert.deepEqual(setSlotPortion(dayWith({ s1: { mealId: null } }), 's1', 1).changes, {});
});

test('a custom portion is kept as it is', () => {
  assert.deepEqual(setSlotPortion(emptyDay(), 's1', 0.75).changes, { s1: { portion: 0.75 } });
});

test('a portion must be a number above 0', () => {
  for (const portion of [0, -1, NaN, Infinity, '1.5']) {
    assert.throws(() => setSlotPortion(emptyDay(), 's1', portion), RangeError, String(portion));
  }
});

test('a swap stores the meal and leaves other slots alone', () => {
  const day = dayWith({ s2: { portion: 0.5 } });
  assert.deepEqual(swapSlot(day, 's1', 'm2', 'm1').changes, { s1: { mealId: 'm2' }, s2: { portion: 0.5 } });
});

test('a swap keeps a portion and replaces an earlier swap', () => {
  assert.deepEqual(swapSlot(dayWith({ s1: { portion: 1.5 } }), 's1', 'm2', 'm1').changes, { s1: { mealId: 'm2', portion: 1.5 } });
  assert.deepEqual(swapSlot(dayWith({ s1: { mealId: 'm2' } }), 's1', 'm3', 'm1').changes, { s1: { mealId: 'm3' } });
});

test('a swap on a skipped slot takes the skip back', () => {
  assert.deepEqual(swapSlot(dayWith({ s1: { mealId: null } }), 's1', 'm2', 'm1').changes, { s1: { mealId: 'm2' } });
});

test('swapping back to the template’s meal isn’t stored, so only a portion stays', () => {
  assert.deepEqual(swapSlot(dayWith({ s1: { mealId: 'm2' } }), 's1', 'm1', 'm1').changes, {});
  assert.deepEqual(swapSlot(dayWith({ s1: { mealId: 'm2', portion: 1.5 } }), 's1', 'm1', 'm1').changes, { s1: { portion: 1.5 } });
  assert.deepEqual(swapSlot(dayWith({ s1: { mealId: null } }), 's1', 'm1', 'm1').changes, {});
});

test('a swap needs a meal', () => {
  for (const mealId of [null, undefined, '']) {
    assert.throws(() => swapSlot(emptyDay(), 's1', mealId, 'm1'), RangeError, String(mealId));
  }
});

test('as planned removes the slot’s change and nothing else', () => {
  const day = dayWith({ s1: { mealId: 'm2', portion: 1.5 }, s2: { mealId: null } });
  assert.deepEqual(clearSlotChange(day, 's1').changes, { s2: { mealId: null } });
  assert.deepEqual(clearSlotChange(emptyDay(), 's1').changes, {});
});

test('day changes leave the day passed in as it was, and keep its other fields', () => {
  const entry = { id: 'e1', slotId: 's1' };
  const day = { ...dayWith({ s1: { portion: 1.5 } }), entries: [entry] };
  const before = structuredClone(day);
  const changed = [skipSlot(day, 's1'), setSlotPortion(day, 's1', 0.5), swapSlot(day, 's1', 'm2', 'm1'), clearSlotChange(day, 's1')];
  for (const next of changed) {
    assert.deepEqual(next.entries, [entry]);
    assert.equal(next.locked, false);
  }
  assert.deepEqual(day, before);
});
