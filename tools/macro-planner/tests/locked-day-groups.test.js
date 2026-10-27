import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OTHER, addEntry, createCoreDoc, emptyDay, foodEntry, quickEntry } from '../js/data.js';
import { lockDay } from '../js/lock-in.js';
import { createMeal } from '../js/saved-meals.js';
import { addSlot, createSlot, lockedDayGroups, moveSlot, removeSlot, renameSlot, setSlotMeal } from '../js/slots.js';

// Test fixtures with made-up round numbers, not real nutrition data.
const OATS_FOOD = { id: 'oats', name: 'Oats', emoji: '🌾', serving: { qty: 100, unit: 'g' }, kcal: 380, protein: 13, fat: 7, carbs: 68 };
const BANANA = { id: 'custom-banana', name: 'Banana', emoji: '🍌', serving: { qty: 100, unit: 'g' }, kcal: 90, protein: 1, fat: 0.5, carbs: 23 };
const OATS = { ...createMeal({ name: 'Oats', emoji: '🥣' }), items: [{ foodId: 'oats', qty: 100 }] };
const SNACK = { kcal: 250, protein: 10, fat: 12, carbs: 25 };

// Breakfast, Lunch, Dinner, all flex.
const freshDoc = () => createCoreDoc('2026-10-15');
const slotNamed = (doc, name) => doc.slots.find((slot) => slot.name === name);
const quick = (doc, name, label) => quickEntry(slotNamed(doc, name), SNACK, label);

const summary = (groups) => groups.map(({ name, entries }) => [name, entries.map((entry) => entry.label)]);

test('groups follow today’s slot order, not the order the entries were written in', () => {
  const doc = freshDoc();
  const entries = [quick(doc, 'Dinner', 'Pizza'), quick(doc, 'Breakfast', 'Bagel'), quick(doc, 'Lunch', 'Salad')];
  assert.deepEqual(summary(lockedDayGroups(entries, doc.slots)), [
    ['Breakfast', ['Bagel']],
    ['Lunch', ['Salad']],
    ['Dinner', ['Pizza']],
  ]);

  // Reordering the slots later reorders the groups.
  const moved = moveSlot(doc, slotNamed(doc, 'Dinner').id, -2);
  assert.deepEqual(
    lockedDayGroups(entries, moved.slots).map(({ name }) => name),
    ['Dinner', 'Breakfast', 'Lunch'],
  );
});

test('entries keep the order they were written in within a group', () => {
  const doc = freshDoc();
  const entries = [quick(doc, 'Lunch', 'First'), quick(doc, 'Breakfast', 'Bagel'), quick(doc, 'Lunch', 'Second'), quick(doc, 'Lunch', 'Third')];
  const [, lunch] = lockedDayGroups(entries, doc.slots);
  assert.deepEqual(lunch.entries, [entries[0], entries[2], entries[3]]);
  assert.equal(lunch.slotId, slotNamed(doc, 'Lunch').id);
});

test('a group is named by its saved slot name, so renaming a slot later changes nothing', () => {
  const doc = freshDoc();
  const entries = [quick(doc, 'Lunch', 'Salad')];
  const renamed = renameSlot(doc, slotNamed(doc, 'Lunch').id, 'Midday');
  assert.deepEqual(summary(lockedDayGroups(entries, renamed.slots)), [['Lunch', ['Salad']]]);
});

test('a removed slot’s group comes after the others, under its saved name', () => {
  // Five slots, so two can be removed and still leave the minimum.
  let doc = addSlot(addSlot(freshDoc(), createSlot('Snack')), createSlot('Supper'));
  const lunchId = slotNamed(doc, 'Lunch').id;
  const entries = [quick(doc, 'Lunch', 'Salad'), quick(doc, 'Snack', 'Bar'), quick(doc, 'Dinner', 'Pizza'), quick(doc, 'Lunch', 'Soup')];
  doc = removeSlot(removeSlot(doc, lunchId), slotNamed(doc, 'Snack').id);
  const groups = lockedDayGroups(entries, doc.slots);
  assert.deepEqual(summary(groups), [
    ['Dinner', ['Pizza']],
    ['Lunch', ['Salad', 'Soup']],
    ['Snack', ['Bar']],
  ]);
  assert.equal(groups[1].slotId, lunchId);
});

test('Other comes last, after a removed slot’s group, under "Other"', () => {
  const doc = freshDoc();
  const other = quickEntry(OTHER, SNACK, 'Vending machine');
  const gone = quickEntry({ id: 'gone', name: 'Pre-workout' }, SNACK, 'Shake');
  const entries = [other, gone, quick(doc, 'Dinner', 'Pizza')];
  const groups = lockedDayGroups(entries, doc.slots);
  assert.deepEqual(summary(groups), [
    ['Dinner', ['Pizza']],
    ['Pre-workout', ['Shake']],
    ['Other', ['Vending machine']],
  ]);
  assert.equal(groups.at(-1).slotId, OTHER.id);
});

test('a planned breakfast with a banana added locks in as one Breakfast group, the meal first', () => {
  let doc = { ...freshDoc(), meals: [OATS] };
  const breakfast = slotNamed(doc, 'Breakfast');
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  const day = lockDay(addEntry(emptyDay(), foodEntry(breakfast, BANANA, 120)), doc, doc.meals, [OATS_FOOD, BANANA]);
  assert.deepEqual(summary(lockedDayGroups(day.entries, doc.slots)), [['Breakfast', ['Oats', 'Banana']]]);
});

test('no entries give no groups, and the entries passed in are left as they were', () => {
  const doc = freshDoc();
  assert.deepEqual(lockedDayGroups([], doc.slots), []);
  const entries = [quick(doc, 'Dinner', 'Pizza'), quick(doc, 'Breakfast', 'Bagel')];
  const copy = structuredClone(entries);
  lockedDayGroups(entries, doc.slots);
  assert.deepEqual(entries, copy);
});
