import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoreDoc, emptyDay } from '../js/data.js';
import { foodLookup } from '../js/saved-meals.js';
import {
  MAX_SLOTS,
  MIN_SLOTS,
  addPlannedMeal,
  addSlot,
  clearSlotChange,
  createSlot,
  moveSlot,
  planSlots,
  removeSlot,
  renameSlot,
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
  doc = addPlannedMeal(doc, lunch.id, 'meal-1');
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
  doc = addPlannedMeal(doc, doc.slots[0].id, 'meal-1');
  const moved = moveSlot(doc, doc.slots[0].id, 1);
  assert.deepEqual(moved.template, doc.template);
  const getFood = foodLookup([]);
  assert.equal(planSlots({ ...moved, meals: [{ id: 'meal-1' }] }, getFood)[1].items[0].meal.id, 'meal-1');
});

test('a slot at either end, or one that isn’t there, stays put', () => {
  const doc = freshDoc();
  assert.equal(moveSlot(doc, doc.slots[0].id, -1), doc);
  assert.equal(moveSlot(doc, doc.slots[2].id, 1), doc);
  assert.equal(moveSlot(doc, 'missing', 1), doc);
});

// --- A day's changes ---

const dayWith = (changes) => ({ ...emptyDay(), changes });

test('as planned removes the slot’s change and nothing else, and leaves the day passed in as it was', () => {
  const entry = { id: 'e1', slotId: 's1' };
  const day = { ...dayWith({ s1: { mealId: 'm2', portion: 1.5 }, s2: { mealId: null } }), entries: [entry] };
  const before = structuredClone(day);
  const cleared = clearSlotChange(day, 's1');
  assert.deepEqual(cleared.changes, { s2: { mealId: null } });
  assert.deepEqual(cleared.entries, [entry]);
  assert.equal(cleared.locked, false);
  assert.deepEqual(clearSlotChange(emptyDay(), 's1').changes, {});
  assert.deepEqual(day, before);
});
