import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAYS_DOC_ID,
  createCoreDoc,
  createDays,
  emptyDay,
  loadCoreDoc,
  pruneDays,
} from '../js/data.js';
import { CORE_DOC_ID, createLocalPersist, createLocalStore, createPersonalStore } from '../js/store.js';
import { createFakePersist } from './fake-persist.js';
import { createFakeStorage } from './fake-storage.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function freshStore() {
  return createLocalStore(createFakeStorage());
}

// A day with something in it, so it's easy to tell apart from an empty one.
function dayWith(label) {
  const entry = { id: label, slotId: 's1', label, emoji: '🍽️', kcal: 500, protein: 30, fat: 20, carbs: 50, source: 'quick' };
  return { ...emptyDay(), entries: [entry] };
}

// --- Core doc ---

test('a first-run core doc has the defaults and starts on the first-run date', () => {
  const doc = createCoreDoc('2026-10-15');
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.startedOn, '2026-10-15');
  assert.deepEqual(
    doc.slots.map(({ name }) => name),
    ['Breakfast', 'Lunch', 'Dinner'],
  );
  assert.deepEqual(doc.foods, []);
  assert.deepEqual(doc.meals, []);
  assert.deepEqual(doc.overrides, { kcal: null, protein: null, fat: null, carbs: null });
  assert.equal(doc.settings.units, 'metric');
});

test('default slots have their own uuids, and each starts as flex with no budget', () => {
  const doc = createCoreDoc('2026-10-15');
  const ids = doc.slots.map(({ id }) => id);
  ids.forEach((id) => assert.match(id, UUID));
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(Object.keys(doc.template).sort(), [...ids].sort());
  for (const id of ids) assert.deepEqual(doc.template[id], { mealId: null, budget: null });
});

test('a first-run profile is empty, with no weight, since weight comes from the weight log', () => {
  assert.deepEqual(createCoreDoc('2026-10-15').profile, {
    sex: null,
    age: null,
    heightCm: null,
    activity: null,
    goal: null,
    rateKgPerWeek: null,
  });
});

test('each first-run doc is its own copy, with new slot ids', () => {
  const a = createCoreDoc('2026-10-15');
  const b = createCoreDoc('2026-10-15');
  a.profile.age = 30;
  assert.equal(b.profile.age, null);
  assert.notEqual(a.slots[0].id, b.slots[0].id);
});

test('createCoreDoc rejects a date that isn’t YYYY-MM-DD', () => {
  assert.throws(() => createCoreDoc('Oct 15'), RangeError);
});

test('the first load saves the defaults, so startedOn and slot ids stay fixed', async () => {
  const store = freshStore();
  const first = await loadCoreDoc(store, '2026-10-15');
  assert.equal(first.startedOn, '2026-10-15');
  assert.deepEqual(await store.load(CORE_DOC_ID), first);

  const later = await loadCoreDoc(store, '2026-10-20');
  assert.equal(later.startedOn, '2026-10-15');
  assert.deepEqual(later.slots, first.slots);
});

test('a first run on a synced store saves the defaults', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  const first = await loadCoreDoc(store, '2026-10-15');
  assert.deepEqual(await store.load(CORE_DOC_ID), first);
});

test('an empty core doc while offline gets defaults that aren’t saved', async () => {
  // Offline, an empty doc may be a failed cloud read, not a first run.
  const store = await createPersonalStore(createLocalPersist(createFakeStorage()));
  const doc = await loadCoreDoc(store, '2026-10-15');
  assert.equal(doc.startedOn, '2026-10-15');
  assert.equal(doc.slots.length, 3);
  assert.deepEqual(await store.load(CORE_DOC_ID), {});
  assert.deepEqual(await store.list(''), []);
});

test('offline, an existing core doc still loads', async () => {
  const storage = createFakeStorage();
  const saved = createCoreDoc('2026-09-01');
  await (await createPersonalStore(createLocalPersist(storage))).save(CORE_DOC_ID, saved);
  const offline = await createPersonalStore(createLocalPersist(storage));
  assert.deepEqual(await loadCoreDoc(offline, '2026-10-15'), saved);
});

test('an existing core doc loads as it is, without being rewritten', async () => {
  const store = freshStore();
  const saved = { ...createCoreDoc('2026-09-01'), meals: [{ id: 'm1', name: 'Rice & beef', emoji: '🍚', items: [] }] };
  await store.save(CORE_DOC_ID, saved);
  assert.deepEqual(await loadCoreDoc(store, '2026-10-15'), saved);
});

// --- Days ---

test('an empty day has no changes or entries, and is neither off plan nor locked', () => {
  assert.deepEqual(emptyDay(), { changes: {}, entries: [], offPlan: false, locked: false });
  const a = emptyDay();
  a.entries.push({});
  assert.deepEqual(emptyDay().entries, []);
});

test('a missing day reads as an empty day', async () => {
  const days = createDays(freshStore());
  assert.deepEqual(await days.getDay('2026-10-15'), emptyDay());
});

test('a saved day reads back, and other dates stay empty', async () => {
  const days = createDays(freshStore());
  await days.saveDay('2026-10-14', dayWith('lunch out'), '2026-10-15');
  assert.deepEqual(await days.getDay('2026-10-14'), dayWith('lunch out'));
  assert.deepEqual(await days.getDay('2026-10-13'), emptyDay());
});

test('saving one day leaves the other days as they were', async () => {
  const days = createDays(freshStore());
  await days.saveDay('2026-10-13', dayWith('a'), '2026-10-15');
  await days.saveDay('2026-10-14', dayWith('b'), '2026-10-15');
  await days.saveDay('2026-10-14', dayWith('c'), '2026-10-15');
  assert.deepEqual(await days.getDay('2026-10-13'), dayWith('a'));
  assert.deepEqual(await days.getDay('2026-10-14'), dayWith('c'));
});

// --- The rolling window ---

test('the prune keeps 7 days ago and drops 8 days ago', () => {
  const kept = pruneDays({ '2026-10-07': 'x', '2026-10-08': 'x', '2026-10-15': 'x' }, '2026-10-15');
  assert.deepEqual(Object.keys(kept), ['2026-10-08', '2026-10-15']);
});

test('the prune edge works across a month boundary', () => {
  const kept = pruneDays({ '2026-02-23': 'x', '2026-02-24': 'x', '2026-03-03': 'x' }, '2026-03-03');
  assert.deepEqual(Object.keys(kept), ['2026-02-24', '2026-03-03']);
});

test('the prune edge works across a year boundary', () => {
  const kept = pruneDays({ '2025-12-26': 'x', '2025-12-27': 'x', '2026-01-03': 'x' }, '2026-01-03');
  assert.deepEqual(Object.keys(kept), ['2025-12-27', '2026-01-03']);
});

test('the prune keeps future days, however far ahead', () => {
  const kept = pruneDays({ '2026-10-16': 'x', '2026-11-14': 'x', '2027-01-01': 'x' }, '2026-10-15');
  assert.deepEqual(Object.keys(kept), ['2026-10-16', '2026-11-14', '2027-01-01']);
});

test('the prune returns a new object and leaves its input alone', () => {
  const daysDoc = { '2026-10-01': 'x', '2026-10-15': 'x' };
  pruneDays(daysDoc, '2026-10-15');
  assert.deepEqual(Object.keys(daysDoc), ['2026-10-01', '2026-10-15']);
});

test('every save drops days before 7 days ago and keeps future ones', async () => {
  const store = freshStore();
  const days = createDays(store);
  await days.saveDay('2026-10-07', dayWith('8 days ago'), '2026-10-14');
  await days.saveDay('2026-10-20', dayWith('future'), '2026-10-14');
  // A day later, 2026-10-07 is 8 days ago.
  await days.saveDay('2026-10-15', dayWith('today'), '2026-10-15');
  assert.deepEqual(Object.keys(await store.load(DAYS_DOC_ID)).sort(), ['2026-10-15', '2026-10-20']);
});

test('a device closed for weeks drops its stale days on its next save', async () => {
  const store = freshStore();
  await store.save(DAYS_DOC_ID, { '2026-09-01': dayWith('old'), '2026-09-02': dayWith('old') });
  await createDays(store).saveDay('2026-10-15', dayWith('today'), '2026-10-15');
  assert.deepEqual(Object.keys(await store.load(DAYS_DOC_ID)), ['2026-10-15']);
});

test('a day older than 7 days ago isn’t kept, even when it’s the one being saved', async () => {
  const store = freshStore();
  const days = createDays(store);
  await days.saveDay('2026-10-07', dayWith('too old'), '2026-10-15');
  assert.deepEqual(await store.load(DAYS_DOC_ID), {});
  assert.deepEqual(await days.getDay('2026-10-07'), emptyDay());
});

test('getDay and saveDay reject a date that isn’t YYYY-MM-DD', async () => {
  const days = createDays(freshStore());
  await assert.rejects(days.getDay('2026-10-1'), RangeError);
  await assert.rejects(days.saveDay('Oct 15', emptyDay(), '2026-10-15'), RangeError);
  await assert.rejects(days.saveDay('2026-10-15', emptyDay(), 'today'), RangeError);
});
