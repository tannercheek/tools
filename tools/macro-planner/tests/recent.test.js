import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal } from '../js/calc.js';
import {
  addEntry,
  createCoreDoc,
  createDays,
  emptyDay,
  foodEntry,
  mealEntry,
  quickEntry,
  recentEntries,
  removeEntry,
  repeatEntry,
} from '../js/data.js';
import { lockDay, lockPastDays } from '../js/lock-in.js';
import { createMeal, foodLookup } from '../js/saved-meals.js';
import { daySlots, setSlotBudget, setSlotMeal } from '../js/slots.js';
import { createLocalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';

// Test fixtures with made-up round numbers, not real nutrition data.
const TODAY = '2026-10-19';
const LUNCH = { id: 'lunch-id', name: 'Lunch' };
const DINNER = { id: 'dinner-id', name: 'Dinner' };
const BURRITO = { kcal: 900, protein: 45, fat: 35, carbs: 100 };
const SHAKE = { kcal: 300, protein: 40, fat: 5, carbs: 20 };
const RICE = { id: 'rice', name: 'Rice, white, cooked', emoji: '🍚', serving: { qty: 100, unit: 'g' }, kcal: 130, protein: 2.5, fat: 0.3, carbs: 28 };
// 390 / 7.5 / 0.9 / 84
const BOWL = { ...createMeal({ name: 'Rice bowl' }), emoji: '🍚', items: [{ foodId: 'rice', qty: 300 }] };
const getFood = foodLookup([RICE]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function dayOf(...entries) {
  return entries.reduce((day, entry) => addEntry(day, entry), emptyDay());
}

// "date label" for each Recent entry, in order.
const listed = (recent) => recent.map(({ entry, date }) => `${date} ${entry.label}`);

// --- Which entries, in what order ---

test('Recent lists the 7 days before today, newest day first', () => {
  const daysDoc = {
    '2026-10-11': dayOf(quickEntry(LUNCH, BURRITO, '8 days ago')),
    '2026-10-12': dayOf(quickEntry(LUNCH, BURRITO, '7 days ago')),
    '2026-10-15': dayOf(quickEntry(LUNCH, BURRITO, '4 days ago')),
    '2026-10-18': dayOf(quickEntry(LUNCH, BURRITO, 'Yesterday')),
    '2026-10-19': dayOf(quickEntry(LUNCH, BURRITO, 'Today')),
    '2026-10-20': dayOf(quickEntry(LUNCH, BURRITO, 'Tomorrow')),
  };
  assert.deepEqual(listed(recentEntries(daysDoc, TODAY)), [
    '2026-10-18 Yesterday',
    '2026-10-15 4 days ago',
    '2026-10-12 7 days ago',
  ]);
});

// Breakfast: flex, Lunch: Rice bowl, Dinner: flex with a pinned budget.
function plannedDoc() {
  let doc = { ...createCoreDoc('2026-10-12'), meals: [BOWL] };
  const [, lunch, dinner] = doc.slots;
  doc = setSlotMeal(doc, lunch.id, BOWL.id);
  return setSlotBudget(doc, dinner.id, BURRITO);
}

test('the plan lock-in wrote is left out; what was added stays, the last added first', () => {
  const doc = plannedDoc();
  const [breakfast, lunch] = doc.slots;
  const locked = lockDay(dayOf(quickEntry(breakfast, SHAKE, 'Shake'), quickEntry(lunch, BURRITO, 'Leftovers')), doc, doc.meals, [RICE]);
  // The planned meal and the budget are there, but they're the plan, not something added.
  assert.deepEqual(locked.entries.map((entry) => entry.label), ['Rice bowl', 'Dinner', 'Shake', 'Leftovers']);
  assert.deepEqual(listed(recentEntries({ '2026-10-18': locked }, TODAY)), ['2026-10-18 Leftovers', '2026-10-18 Shake']);
});

test('a locked day corrected by removing its planned meal and adding what was eaten lists the correction', () => {
  const doc = plannedDoc();
  const [, lunch] = doc.slots;
  const locked = lockDay(emptyDay(), doc, doc.meals, [RICE]);
  const corrected = addEntry(removeEntry(locked, locked.entries[0].id), quickEntry(lunch, BURRITO, 'Pizza'));
  assert.deepEqual(listed(recentEntries({ '2026-10-18': corrected }, TODAY)), ['2026-10-18 Pizza']);
});

test('Recent reaches back across a month and year end', () => {
  const daysDoc = {
    '2025-12-25': dayOf(quickEntry(LUNCH, BURRITO, 'Too old')),
    '2025-12-26': dayOf(quickEntry(LUNCH, SHAKE, '7 days ago')),
    '2026-01-01': dayOf(quickEntry(LUNCH, BURRITO, 'Yesterday')),
  };
  assert.deepEqual(listed(recentEntries(daysDoc, '2026-01-02')), ['2026-01-01 Yesterday', '2025-12-26 7 days ago']);
});

test('with nothing in the last 7 days, Recent is empty', () => {
  assert.deepEqual(recentEntries({}, TODAY), []);
  assert.deepEqual(recentEntries({ '2026-10-18': emptyDay(), '2026-10-17': { changes: {} } }, TODAY), []);
});

// --- Merging ---

test('entries with the same label and numbers are one, at their newest', () => {
  const daysDoc = {
    '2026-10-14': dayOf(quickEntry(DINNER, BURRITO, 'Burrito')),
    '2026-10-17': dayOf(quickEntry(LUNCH, BURRITO, 'Burrito'), quickEntry(LUNCH, SHAKE, 'Shake')),
    '2026-10-18': dayOf(quickEntry(DINNER, SHAKE, 'Shake')),
  };
  const recent = recentEntries(daysDoc, TODAY);
  assert.deepEqual(listed(recent), ['2026-10-18 Shake', '2026-10-17 Burrito']);
  assert.equal(recent[1].entry.slotName, 'Lunch', 'the 17th’s Burrito, not the 14th’s');
});

test('a different label or different numbers keep entries apart; a different emoji alone doesn’t', () => {
  const daysDoc = {
    '2026-10-17': dayOf(
      quickEntry(LUNCH, BURRITO, 'Burrito'),
      quickEntry(LUNCH, BURRITO, 'Bowl'),
      quickEntry(LUNCH, { ...BURRITO, protein: 50 }, 'Burrito'),
      { ...quickEntry(LUNCH, BURRITO, 'Burrito'), emoji: '🌯' },
    ),
  };
  const recent = recentEntries(daysDoc, TODAY);
  assert.equal(recent.length, 3);
  assert.equal(recent[0].entry.emoji, '🌯', 'the newest one’s emoji');
});

test('numbers match as they’re shown, in whole numbers, and the newest keeps its own', () => {
  const shown195 = { kcal: 195, protein: 3.75, fat: 0.4, carbs: 42 };
  const alsoShown195 = { kcal: 195.2, protein: 3.8, fat: 0.4, carbs: 42.1 };
  const shown196 = { ...shown195, kcal: 195.5 };
  const daysDoc = {
    '2026-10-17': dayOf(quickEntry(LUNCH, shown196, 'Rice'), quickEntry(LUNCH, shown195, 'Rice'), quickEntry(LUNCH, alsoShown195, 'Rice')),
  };
  const recent = recentEntries(daysDoc, TODAY);
  assert.deepEqual(
    recent.map(({ entry }) => entry.kcal),
    [195.2, 195.5],
  );
});

// --- Adding one again ---

test('adding a Recent entry again makes a new entry in the slot it’s added to, with the same snapshot', () => {
  const original = foodEntry(LUNCH, RICE, 150);
  const again = repeatEntry(DINNER, original);
  const { id, ...rest } = again;
  const { id: originalId, ...snapshot } = original;
  assert.match(id, UUID);
  assert.notEqual(id, originalId);
  assert.deepEqual(rest, { ...snapshot, slotId: 'dinner-id', slotName: 'Dinner' });
  assert.equal(again.source, 'food');
  // Left as it was.
  assert.equal(original.slotName, 'Lunch');
});

test('a meal added on a past day stays in Recent after it’s deleted, and counts again when added', () => {
  const doc = { ...createCoreDoc('2026-10-12'), meals: [BOWL] };
  const [, , dinner] = doc.slots;
  // Added to Dinner on the 17th, then locked in with the rest of the week.
  const daysDoc = lockPastDays({ '2026-10-17': dayOf(mealEntry(dinner, BOWL, getFood)) }, TODAY, doc, [RICE]);
  const deleted = { ...doc, meals: [] };

  const recent = recentEntries(daysDoc, TODAY);
  assert.deepEqual(listed(recent), ['2026-10-17 Rice bowl']);
  const [{ entry }] = recent;
  assert.equal(entry.emoji, '🍚');
  assert.equal(entry.source, 'meal');

  const today = addEntry(emptyDay(), repeatEntry(dinner, entry));
  assert.equal(dayTotal(today, daySlots(deleted, today), getFood).kcal, 390);
});

test('a Recent entry added to a locked past day counts in that day, and is there when it’s read again', async () => {
  const days = createDays(createLocalStore(createFakeStorage()));
  await days.saveDay('2026-10-16', { ...dayOf(quickEntry(LUNCH, SHAKE, 'Shake')), locked: true }, TODAY);

  const [{ entry }] = await days.recent(TODAY);
  const added = addEntry(await days.getDay('2026-10-16'), repeatEntry(DINNER, entry));
  await days.saveDay('2026-10-16', added, TODAY);

  const reread = await days.getDay('2026-10-16');
  assert.deepEqual(
    reread.entries.map(({ label, slotName }) => `${slotName} ${label}`),
    ['Lunch Shake', 'Dinner Shake'],
  );
  assert.equal(dayTotal(reread, [], () => undefined).kcal, 600);
});
