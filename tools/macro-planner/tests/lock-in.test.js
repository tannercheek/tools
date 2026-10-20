import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal } from '../js/calc.js';
import { DAYS_DOC_ID, DaysUnavailableError, createCoreDoc, createDays, emptyDay } from '../js/data.js';
import { createLockIn, lockDay, lockInPastDays, lockPastDays } from '../js/lock-in.js';
import { createMeal, deleteMeal, foodLookup, updateItem, updateMeal } from '../js/saved-meals.js';
import { daySlots, setSlotMeal, setSlotPortion, skipSlot } from '../js/slots.js';
import { CORE_DOC_ID, createLocalPersist, createLocalStore, createPersonalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Float math: compare to within a hair, not exactly.
function assertTotals(actual, expected, label = '') {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= 1e-9,
      `${label} ${key}: expected ${expected[key]}, got ${actual[key]}`,
    );
  }
}

// Test fixtures with made-up round numbers, not real nutrition data.
const per100g = (id, kcal, protein, fat, carbs) => ({ id, serving: { qty: 100, unit: 'g' }, kcal, protein, fat, carbs });
const FOODS = [
  per100g('oats', 380, 13, 7, 68),
  { id: 'whey', serving: { qty: 30, unit: 'g' }, kcal: 120, protein: 24, fat: 1.5, carbs: 3 },
  per100g('rice', 130, 2.5, 0.3, 28),
  per100g('beef', 250, 26, 15, 0),
];

function meal(name, emoji, items) {
  return { ...createMeal({ name, emoji }), items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

// 80 g oats + 30 g whey.
const OATS = meal('Oats & whey', '🥣', [['oats', 80], ['whey', 30]]);
const OATS_TOTALS = { kcal: 424, protein: 34.4, fat: 7.1, carbs: 57.4 };
// 200 g rice + 150 g beef.
const RICE_BEEF = meal('Rice & beef', '🍚', [['rice', 200], ['beef', 150]]);
const RICE_BEEF_TOTALS = { kcal: 635, protein: 44, fat: 23.1, carbs: 56 };
// 300 g rice.
const RICE_BOWL = meal('Rice bowl', '🍙', [['rice', 300]]);
const RICE_BOWL_TOTALS = { kcal: 390, protein: 7.5, fat: 0.9, carbs: 84 };

const BUDGET = { kcal: 700, protein: 50, fat: 20, carbs: 80 };

// Breakfast: Oats & whey, Lunch: Rice & beef, Dinner: flex. Started on 15 October.
function plannedDoc(startedOn = '2026-10-15') {
  let doc = { ...createCoreDoc(startedOn), meals: [OATS, RICE_BEEF, RICE_BOWL] };
  const [breakfast, lunch] = doc.slots;
  doc = setSlotMeal(doc, breakfast.id, OATS.id);
  return setSlotMeal(doc, lunch.id, RICE_BEEF.id);
}

const slotIds = (doc) => Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));

function withBudget(doc, slotId, budget) {
  return { ...doc, template: { ...doc.template, [slotId]: { ...doc.template[slotId], budget } } };
}

function day(fields) {
  return { ...emptyDay(), ...fields };
}

function quick(slotId, slotName, numbers, label = 'Snack') {
  return { id: crypto.randomUUID(), slotId, slotName, label, emoji: '🍽️', source: 'quick', ...numbers };
}

const lock = (doc, d) => lockDay(d, doc, doc.meals, FOODS);

// An entry without its new id, to compare whole entries.
function withoutId({ id, ...entry }) {
  assert.match(id, UUID);
  return entry;
}

// --- lockDay ---

test('a plain day locks in each planned meal as a snapshot entry, in slot order', () => {
  const doc = plannedDoc();
  const { Breakfast, Lunch } = slotIds(doc);
  const locked = lock(doc, emptyDay());
  assert.equal(locked.locked, true);
  assert.deepEqual(locked.changes, {});
  const fields = ({ slotId, slotName, label, emoji, source, planned }) => ({ slotId, slotName, label, emoji, source, planned });
  assert.deepEqual(locked.entries.map(withoutId).map(fields), [
    { slotId: Breakfast, slotName: 'Breakfast', label: 'Oats & whey', emoji: '🥣', source: 'meal', planned: true },
    { slotId: Lunch, slotName: 'Lunch', label: 'Rice & beef', emoji: '🍚', source: 'meal', planned: true },
  ]);
  assertTotals(locked.entries[0], OATS_TOTALS, 'breakfast');
  assertTotals(locked.entries[1], RICE_BEEF_TOTALS, 'lunch');
  assert.notEqual(locked.entries[0].id, locked.entries[1].id);
});

test('a swap locks in the swapped meal', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const [, lunch] = lock(doc, day({ changes: { [Lunch]: { mealId: RICE_BOWL.id } } })).entries;
  assert.equal(lunch.label, 'Rice bowl');
  assert.equal(lunch.emoji, '🍙');
  assertTotals(lunch, RICE_BOWL_TOTALS);
});

test('a skipped slot locks in nothing', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const locked = lock(doc, skipSlot(emptyDay(), Breakfast));
  assert.deepEqual(locked.entries.map((entry) => entry.label), ['Rice & beef']);
});

test('a 1.5× portion locks in the meal’s numbers at 1.5×', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const [, lunch] = lock(doc, setSlotPortion(emptyDay(), Lunch, 1.5)).entries;
  assert.equal(lunch.label, 'Rice & beef');
  assertTotals(lunch, { kcal: 952.5, protein: 66, fat: 34.65, carbs: 84 });
});

test('an open flex slot’s pinned budget locks in as quick numbers under the slot’s name', () => {
  let doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const dinner = lock(doc, emptyDay()).entries[2];
  assert.deepEqual(withoutId(dinner), {
    slotId: Dinner,
    slotName: 'Dinner',
    label: 'Dinner',
    emoji: '🍽️',
    ...BUDGET,
    source: 'quick',
    planned: true,
  });
});

test('a budgeted flex slot that has something added locks in what was added, not the budget', () => {
  let doc = plannedDoc();
  const { Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const added = quick(Dinner, 'Dinner', RICE_BOWL_TOTALS, 'Takeaway');
  const locked = lock(doc, day({ entries: [added] }));
  assert.deepEqual(locked.entries.map((entry) => entry.label), ['Oats & whey', 'Rice & beef', 'Takeaway']);
  assert.equal(locked.entries[2], added);
});

test('an extra added to a planned slot stays alongside its meal, after the plan', () => {
  const doc = plannedDoc();
  const { Breakfast } = slotIds(doc);
  const extra = quick(Breakfast, 'Breakfast', { kcal: 70, protein: 6, fat: 5, carbs: 0.5 }, 'Egg');
  const locked = lock(doc, day({ entries: [extra] }));
  assert.deepEqual(locked.entries.map((entry) => entry.label), ['Oats & whey', 'Rice & beef', 'Egg']);
  // Only what lock-in wrote from the plan is marked planned; what was added isn't.
  assert.deepEqual(locked.entries.map((entry) => entry.planned ?? false), [true, true, false]);
  assertTotals(dayTotal(locked, daySlots(doc, locked), foodLookup(FOODS)), {
    kcal: 1129,
    protein: 84.4,
    fat: 35.2,
    carbs: 113.9,
  });
});

test('an off-plan day keeps only what was added: no planned meals, budgets or changes', () => {
  let doc = plannedDoc();
  const { Lunch, Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const added = quick(Lunch, 'Lunch', OATS_TOTALS, 'Café');
  const changes = { [Lunch]: { mealId: RICE_BOWL.id, portion: 2 } };
  const locked = lock(doc, day({ offPlan: true, changes, entries: [added] }));
  assert.deepEqual(locked.entries, [added]);
  assert.equal(locked.offPlan, true);
  assert.equal(locked.locked, true);
  assert.deepEqual(lock(doc, day({ offPlan: true })).entries, []);
});

test('the day’s total is the same before and after lock-in', () => {
  let doc = plannedDoc();
  const { Breakfast, Lunch, Dinner } = slotIds(doc);
  doc = withBudget(doc, Dinner, BUDGET);
  const getFood = foodLookup(FOODS);
  const extra = quick(Breakfast, 'Breakfast', { kcal: 70, protein: 6, fat: 5, carbs: 0.5 });
  const open = setSlotPortion(day({ changes: { [Lunch]: { mealId: RICE_BOWL.id } }, entries: [extra] }), Lunch, 1.5);
  const locked = lock(doc, open);
  assertTotals(dayTotal(locked, daySlots(doc, locked), getFood), dayTotal(open, daySlots(doc, open), getFood));
});

test('a day already locked comes back as it was', () => {
  const doc = plannedDoc();
  const locked = lock(doc, emptyDay());
  assert.equal(lock(doc, locked), locked);
});

test('lockDay leaves the day passed in as it was', () => {
  const doc = plannedDoc();
  const { Lunch } = slotIds(doc);
  const open = setSlotPortion(emptyDay(), Lunch, 1.5);
  const before = structuredClone(open);
  lock(doc, open);
  assert.deepEqual(open, before);
});

test('a locked meal entry keeps its numbers when a food it used is archived', () => {
  const doc = plannedDoc();
  const archived = FOODS.map((food) => (food.id === 'beef' ? { ...food, archived: true } : food));
  assertTotals(lockDay(emptyDay(), doc, doc.meals, archived).entries[1], RICE_BEEF_TOTALS);
});

// --- The snapshot rule ---

test('editing a meal after its day is locked doesn’t change that day', () => {
  let doc = plannedDoc();
  const getFood = foodLookup(FOODS);
  const locked = lock(doc, emptyDay());
  const before = dayTotal(locked, daySlots(doc, locked), getFood);

  doc = updateMeal(doc, RICE_BEEF.id, (m) => ({ ...updateItem(m, 'beef', 400), name: 'Big beef', emoji: '🥩' }));
  assert.equal(lock(doc, locked), locked);
  assert.equal(locked.entries[1].label, 'Rice & beef');
  assert.equal(locked.entries[1].emoji, '🍚');
  assertTotals(dayTotal(locked, daySlots(doc, locked), getFood), before);
});

test('deleting a meal or changing the template after lock-in doesn’t change that day', () => {
  let doc = plannedDoc();
  const getFood = foodLookup(FOODS);
  const locked = lock(doc, emptyDay());
  const before = dayTotal(locked, daySlots(doc, locked), getFood);

  doc = setSlotMeal(deleteMeal(doc, OATS.id), slotIds(doc).Dinner, RICE_BOWL.id);
  assertTotals(dayTotal(locked, daySlots(doc, locked), getFood), before);
});

// --- lockPastDays ---

// Today is 20 October; the window is 13–19 October.
const TODAY = '2026-10-20';

test('every past day in the window from startedOn on is locked, and a day never opened counts as on plan', () => {
  const doc = plannedDoc('2026-10-17');
  const { Lunch } = slotIds(doc);
  const daysDoc = { '2026-10-18': skipSlot(emptyDay(), Lunch) };
  const next = lockPastDays(daysDoc, TODAY, doc, FOODS);
  assert.deepEqual(Object.keys(next).sort(), ['2026-10-17', '2026-10-18', '2026-10-19']);
  for (const date of Object.keys(next)) assert.equal(next[date].locked, true, date);
  assert.deepEqual(next['2026-10-17'].entries.map((entry) => entry.label), ['Oats & whey', 'Rice & beef']);
  assert.deepEqual(next['2026-10-18'].entries.map((entry) => entry.label), ['Oats & whey']);
});

test('a first run doesn’t lock in days before startedOn', () => {
  const doc = plannedDoc(TODAY);
  assert.deepEqual(lockPastDays({}, TODAY, doc, FOODS), {});
});

test('days before startedOn are left as they are, even with a record', () => {
  const doc = plannedDoc('2026-10-19');
  const before = { '2026-10-18': emptyDay() };
  const next = lockPastDays(before, TODAY, doc, FOODS);
  assert.equal(next['2026-10-18'], before['2026-10-18']);
  assert.equal(next['2026-10-19'].locked, true);
});

test('today and future days stay open', () => {
  const doc = plannedDoc('2026-10-01');
  const daysDoc = { [TODAY]: emptyDay(), '2026-10-22': day({ offPlan: true }) };
  const next = lockPastDays(daysDoc, TODAY, doc, FOODS);
  assert.equal(next[TODAY], daysDoc[TODAY]);
  assert.equal(next['2026-10-22'], daysDoc['2026-10-22']);
  assert.equal(Object.keys(next).length, 9, 'today, the 7 days before it, and one future day');
});

test('days already locked are kept as they are, and with nothing left to lock the same doc comes back', () => {
  const doc = plannedDoc('2026-10-01');
  const once = lockPastDays({}, TODAY, doc, FOODS);
  const again = lockPastDays(once, TODAY, doc, FOODS);
  assert.equal(again, once);
});

test('lock-in works across a month boundary', () => {
  const doc = plannedDoc('2026-10-30');
  const next = lockPastDays({}, '2026-11-02', doc, FOODS);
  assert.deepEqual(Object.keys(next).sort(), ['2026-10-30', '2026-10-31', '2026-11-01']);
});

// --- Lock-in in the store ---

async function seededStore(doc, daysDoc) {
  const store = createLocalStore(createFakeStorage());
  await store.save(CORE_DOC_ID, doc);
  if (daysDoc) await store.save(DAYS_DOC_ID, daysDoc);
  return store;
}

const bundled = FOODS;

test('lockInPastDays saves the locked days', async () => {
  const store = await seededStore(plannedDoc('2026-10-18'));
  await lockInPastDays(store, TODAY, bundled);
  const days = createDays(store);
  assert.equal((await days.getDay('2026-10-18')).locked, true);
  assert.equal((await days.getDay('2026-10-19')).locked, true);
  assert.equal((await days.getDay(TODAY)).locked, false);
});

test('lockInPastDays finds custom foods in the core doc', async () => {
  const custom = { ...per100g('custom-1', 100, 10, 1, 10), custom: true };
  const shake = meal('Shake', '🥤', [['custom-1', 300]]);
  let doc = { ...plannedDoc('2026-10-19'), foods: [custom], meals: [shake] };
  doc = setSlotMeal(doc, doc.slots[0].id, shake.id);
  const store = await seededStore(doc);
  await lockInPastDays(store, TODAY, []);
  assertTotals((await createDays(store).getDay('2026-10-19')).entries[0], { kcal: 300, protein: 30, fat: 3, carbs: 30 });
});

test('offline on a device that never loaded the days doc, lock-in saves nothing', async () => {
  const storage = createFakeStorage();
  const local = await createPersonalStore(createLocalPersist(storage));
  await local.save(CORE_DOC_ID, plannedDoc('2026-10-18'));
  const store = await createPersonalStore(createLocalPersist(storage));
  await assert.rejects(lockInPastDays(store, TODAY, bundled), DaysUnavailableError);
  assert.deepEqual(await store.load(DAYS_DOC_ID), {});
});

test('with nothing to lock, lock-in saves nothing, even offline', async () => {
  const storage = createFakeStorage();
  const local = await createPersonalStore(createLocalPersist(storage));
  await local.save(CORE_DOC_ID, plannedDoc(TODAY));
  const store = await createPersonalStore(createLocalPersist(storage));
  await lockInPastDays(store, TODAY, bundled);
  assert.deepEqual(await store.load(DAYS_DOC_ID), {});
});

test('a core doc that hasn’t loaded has no startedOn, so nothing is locked', async () => {
  const store = createLocalStore(createFakeStorage());
  await lockInPastDays(store, TODAY, bundled);
  assert.deepEqual(await store.load(DAYS_DOC_ID), {});
});

// --- createLockIn ---

test('lock-in runs once per date', async () => {
  let loads = 0;
  const store = await seededStore(plannedDoc('2026-10-01'));
  const lockIn = createLockIn(store, async () => {
    loads += 1;
    return bundled;
  });
  await Promise.all([lockIn(TODAY), lockIn(TODAY)]);
  await lockIn(TODAY);
  assert.equal(loads, 1);
  await lockIn('2026-10-21');
  assert.equal(loads, 2);
  assert.equal((await createDays(store).getDay(TODAY)).locked, true, 'the day before the new date');
});

test('a lock-in that fails is tried again on the next call', async () => {
  let fail = true;
  const store = await seededStore(plannedDoc('2026-10-01'));
  const lockIn = createLockIn(store, async () => {
    if (fail) throw new Error('offline');
    return bundled;
  });
  await assert.rejects(lockIn(TODAY), /offline/);
  fail = false;
  await lockIn(TODAY);
  assert.equal((await createDays(store).getDay('2026-10-19')).locked, true);
});
