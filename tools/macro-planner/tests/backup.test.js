import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BackupError,
  DOC_IDS,
  ExportUnavailableError,
  backupFileName,
  exportDocs,
  importDocs,
  readBackup,
  resetDocs,
} from '../js/backup.js';
import { DAYS_DOC_ID, WEIGHT_DOC_ID, createCoreDoc, createDays, createWeightLog, emptyDay, loadCoreDoc } from '../js/data.js';
import { CORE_DOC_ID, createLocalStore, createPersonalStore } from '../js/store.js';
import { createFakePersist } from './fake-persist.js';
import { createFakeStorage } from './fake-storage.js';

const TODAY = '2026-10-20';
const NOW = new Date('2026-10-20T09:30:00Z');

function freshStore() {
  return createLocalStore(createFakeStorage());
}

// A core doc with a custom food, a meal, an override, a percent macro split and a filled-in
// profile. Made-up numbers.
function usedCoreDoc() {
  const doc = createCoreDoc('2026-10-01');
  const food = { id: 'custom-1', name: 'Protein bar', emoji: '🍫', serving: { qty: 1, unit: 'bar' }, kcal: 200, protein: 20, fat: 7, carbs: 22, custom: true };
  const meal = { id: 'meal-1', name: 'Bar snack', emoji: '🍽️', items: [{ foodId: 'custom-1', qty: 1 }], tags: ['Snack'] };
  return {
    ...doc,
    profile: { sex: 'male', age: 30, heightCm: 180, activity: 'moderate', goal: 'lose', rateKgPerWeek: 0.5 },
    overrides: { ...doc.overrides, protein: 180 },
    macroSplit: { by: 'percent', percent: { protein: 30, fat: 25, carbs: 45 } },
    settings: { units: 'imperial' },
    template: { ...doc.template, [doc.slots[0].id]: { mealId: 'meal-1', budget: null } },
    foods: [food],
    meals: [meal],
  };
}

// Every past day in the window locked, as the app leaves them after lock-in, plus a day ahead.
function usedDaysDoc() {
  const entry = { id: 'e1', slotId: 's1', slotName: 'Dinner', label: 'Pizza', emoji: '🍕', kcal: 800, protein: 30, fat: 30, carbs: 90, source: 'quick' };
  const days = {};
  for (let d = 13; d <= 19; d++) days[`2026-10-${d}`] = { ...emptyDay(), locked: true };
  days['2026-10-18'] = { ...emptyDay(), entries: [entry], locked: true };
  days['2026-10-20'] = { ...emptyDay(), changes: { s1: { skipped: true } } };
  days['2026-10-25'] = { ...emptyDay(), offPlan: true };
  return days;
}

const WEIGHT = { weighIns: [{ date: '2026-10-01', kg: 83.2 }, { date: '2026-10-15', kg: 82.4 }] };

async function storeWithData(store = freshStore()) {
  await store.save(CORE_DOC_ID, usedCoreDoc());
  await store.save(DAYS_DOC_ID, usedDaysDoc());
  await store.save(WEIGHT_DOC_ID, WEIGHT);
  return store;
}

async function allDocs(store) {
  return Object.fromEntries(await Promise.all(DOC_IDS.map(async (docId) => [docId, await store.load(docId)])));
}

// As the file round-trips: written as text, read back.
function asFile(backup) {
  return JSON.stringify(backup, null, 2);
}

// --- Export ---

test('the file is named after the day it was exported', () => {
  assert.equal(backupFileName(TODAY), 'macro-planner-2026-10-20.json');
});

test('an export holds every doc as stored, marked as ours, with when it was made', async () => {
  const store = await storeWithData();
  const backup = await exportDocs(store, NOW);
  assert.equal(backup.app, 'macro-planner');
  assert.equal(backup.exportedAt, '2026-10-20T09:30:00.000Z');
  assert.deepEqual(backup.docs, await allDocs(store));
  assert.deepEqual(Object.keys(backup.docs).sort(), [CORE_DOC_ID, DAYS_DOC_ID, WEIGHT_DOC_ID].sort());
});

test('a first run with no days or weigh-ins exports, and imports again', async () => {
  const store = freshStore();
  await loadCoreDoc(store, TODAY);
  const docs = readBackup(asFile(await exportDocs(store, NOW)));
  assert.deepEqual(docs[DAYS_DOC_ID], {});
  assert.deepEqual(docs[WEIGHT_DOC_ID], {});
});

test('export is refused when the core doc has never loaded on this device', async () => {
  await assert.rejects(exportDocs(freshStore(), NOW), ExportUnavailableError);
});

test('export is refused offline when the days or weight log never loaded, so the file is never partial', async () => {
  const persist = createFakePersist();
  const online = await createPersonalStore(persist.openDoc);
  await storeWithData(online);
  persist.finishWrites();

  // Another browser that only has the core doc cached: its days and weight reads fail.
  persist.setOnline(false);
  const offline = await createPersonalStore(persist.openDoc);
  await offline.save(CORE_DOC_ID, usedCoreDoc());
  await assert.rejects(exportDocs(offline, NOW), ExportUnavailableError);
});

// --- Reading a file ---

test('readBackup gives back the docs of a file that exportDocs made', async () => {
  const store = await storeWithData();
  const backup = await exportDocs(store, NOW);
  assert.deepEqual(readBackup(asFile(backup)), backup.docs);
});

test('readBackup refuses text that isn’t JSON, or JSON that isn’t an export', () => {
  for (const text of ['', 'not json', '[]', 'null', '{"docs":{}}', JSON.stringify({ app: 'other-tool', docs: {} })]) {
    assert.throws(() => readBackup(text), BackupError, text);
  }
  assert.throws(() => readBackup('{}'), { message: 'That file isn’t a Macro Planner export, so nothing was imported.' });
});

test('readBackup refuses an export with a doc missing or the wrong shape', async () => {
  const docs = (await exportDocs(await storeWithData(), NOW)).docs;
  const withDocs = (changes) => JSON.stringify({ app: 'macro-planner', docs: { ...docs, ...changes } });
  const broken = [
    { [CORE_DOC_ID]: undefined },
    { [DAYS_DOC_ID]: undefined },
    { [WEIGHT_DOC_ID]: undefined },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], schemaVersion: 2 } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], meals: {} } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], startedOn: 'yesterday' } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], macroSplit: 'percent' } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], macroSplit: { by: 'calories' } } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], macroSplit: { by: 'percent' } } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], macroSplit: { by: 'percent', percent: { protein: 30, fat: 25, carbs: 44 } } } },
    { [CORE_DOC_ID]: { ...docs[CORE_DOC_ID], macroSplit: { by: 'bodyweight', percent: { protein: 30.5, fat: 25, carbs: 44.5 } } } },
    { [DAYS_DOC_ID]: { 'Oct 20': emptyDay() } },
    { [DAYS_DOC_ID]: { '2026-10-20': [] } },
    { [WEIGHT_DOC_ID]: { weighIns: {} } },
    { [WEIGHT_DOC_ID]: { weighIns: [{ date: '2026-10-15', kg: '82.4' }] } },
    { [WEIGHT_DOC_ID]: { weighIns: [{ date: '2026-10-15', kg: 0 }] } },
  ];
  for (const changes of broken) {
    assert.throws(() => readBackup(withDocs(changes)), { name: 'BackupError', message: 'That export is incomplete or damaged, so nothing was imported.' }, JSON.stringify(changes));
  }
});

test('readBackup takes a core doc without a macro split, or by bodyweight with or without kept percents', async () => {
  const docs = (await exportDocs(await storeWithData(), NOW)).docs;
  const { macroSplit: _split, ...withoutSplit } = docs[CORE_DOC_ID];
  for (const core of [
    withoutSplit,
    { ...withoutSplit, macroSplit: { by: 'bodyweight' } },
    { ...withoutSplit, macroSplit: { by: 'bodyweight', percent: { protein: 35, fat: 25, carbs: 40 } } },
  ]) {
    const file = JSON.stringify({ app: 'macro-planner', docs: { ...docs, [CORE_DOC_ID]: core } });
    assert.deepEqual(readBackup(file)[CORE_DOC_ID], core, JSON.stringify(core.macroSplit));
  }
});

// --- Import ---

test('import replaces every doc, including data the file doesn’t have', async () => {
  const docs = readBackup(asFile(await exportDocs(await storeWithData(), NOW)));
  const store = freshStore();
  const other = createCoreDoc('2026-09-01');
  await store.save(CORE_DOC_ID, { ...other, meals: [{ id: 'gone', name: 'Gone', emoji: '🍽️', items: [] }] });
  await store.save(DAYS_DOC_ID, { '2026-10-19': { ...emptyDay(), locked: true, entries: [{ id: 'old' }] } });
  await store.save(WEIGHT_DOC_ID, { weighIns: [{ date: '2026-10-19', kg: 90 }] });

  await importDocs(store, docs, TODAY, []);
  assert.deepEqual(await allDocs(store), docs);
});

test('export and import carry the macro split with the core doc', async () => {
  const docs = readBackup(asFile(await exportDocs(await storeWithData(), NOW)));
  assert.deepEqual(docs[CORE_DOC_ID].macroSplit, { by: 'percent', percent: { protein: 30, fat: 25, carbs: 45 } });
  const store = freshStore();
  await importDocs(store, docs, TODAY, []);
  assert.deepEqual((await store.load(CORE_DOC_ID)).macroSplit, docs[CORE_DOC_ID].macroSplit);
});

test('an imported weight log with nothing ever saved becomes an empty one the log can add to', async () => {
  const store = freshStore();
  await loadCoreDoc(store, TODAY);
  const docs = readBackup(asFile(await exportDocs(store, NOW)));
  await importDocs(store, docs, TODAY, []);
  assert.deepEqual(await store.load(WEIGHT_DOC_ID), { weighIns: [] });
  assert.deepEqual(await createWeightLog(store).add({ date: TODAY, kg: 80 }), [{ date: TODAY, kg: 80 }]);
});

test('importing an older export drops days before 7 days ago and locks the days that have passed', async () => {
  const docs = readBackup(asFile(await exportDocs(await storeWithData(), NOW)));
  const store = freshStore();
  // Four days later: the 13th to the 16th have dropped out, and the 20th has passed.
  const later = '2026-10-24';
  await importDocs(store, docs, later, []);
  const days = await store.load(DAYS_DOC_ID);
  assert.deepEqual(Object.keys(days).sort(), ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-25']);
  assert.ok(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].every((date) => days[date].locked));
  assert.deepEqual(days['2026-10-18'], docs[DAYS_DOC_ID]['2026-10-18']);
  assert.equal(days['2026-10-25'].locked, false);
});

// --- Reset ---

test('reset leaves a first run: an empty profile from today, no days and no weigh-ins', async () => {
  const store = await storeWithData();
  await resetDocs(store, TODAY);
  const core = await store.load(CORE_DOC_ID);
  const fresh = createCoreDoc(TODAY);
  assert.deepEqual({ ...core, slots: [], template: {} }, { ...fresh, slots: [], template: {} });
  assert.deepEqual(core.slots.map(({ name }) => name), ['Breakfast', 'Lunch', 'Dinner']);
  assert.deepEqual(await store.load(DAYS_DOC_ID), {});
  assert.deepEqual(await createWeightLog(store).list(), []);
  assert.deepEqual(await createDays(store).getDay(TODAY), emptyDay());
});

test('after a reset, the app can save days and weigh-ins again', async () => {
  const store = await storeWithData();
  await resetDocs(store, TODAY);
  await createDays(store).saveDay(TODAY, { ...emptyDay(), offPlan: true }, TODAY);
  await createWeightLog(store).add({ date: TODAY, kg: 80 });
  assert.equal((await createDays(store).getDay(TODAY)).offPlan, true);
  assert.deepEqual(await createWeightLog(store).list(), [{ date: TODAY, kg: 80 }]);
});

// --- Round trip (PLAN 6.2: export → reset → import restores everything exactly) ---

test('export → reset → import restores everything exactly', async () => {
  const store = await storeWithData();
  const before = await allDocs(store);
  const file = asFile(await exportDocs(store, NOW));
  await resetDocs(store, TODAY);
  assert.notDeepEqual(await allDocs(store), before);
  await importDocs(store, readBackup(file), TODAY, []);
  assert.deepEqual(await allDocs(store), before);
});

test('export → reset → import restores everything exactly in another synced browser', async () => {
  const persist = createFakePersist();
  const store = await storeWithData(await createPersonalStore(persist.openDoc));
  persist.finishWrites();
  const before = await allDocs(store);
  const file = asFile(await exportDocs(store, NOW));

  await resetDocs(store, TODAY);
  persist.finishWrites();
  await importDocs(store, readBackup(file), TODAY, []);
  persist.finishWrites();

  const other = await createPersonalStore(persist.openDoc);
  assert.deepEqual(await allDocs(other), before);
  assert.deepEqual(await other.list('macro-planner'), [...DOC_IDS].sort());
});
