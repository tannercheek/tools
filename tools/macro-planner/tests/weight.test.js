import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIGHT_DOC_ID,
  WeightLogUnavailableError,
  addWeighIn,
  createWeightLog,
  currentWeight,
  listedWeighIns,
  loadCoreDoc,
  readWeighInDate,
  removeWeighIn,
} from '../js/data.js';
import { CORE_DOC_ID, createLocalPersist, createLocalStore, createPersonalStore } from '../js/store.js';
import { createFakePersist } from './fake-persist.js';
import { createFakeStorage } from './fake-storage.js';

function freshStore() {
  return createLocalStore(createFakeStorage());
}

// --- Weigh-in helpers ---

test('adding weigh-ins out of date order keeps them oldest first', () => {
  let weighIns = [];
  weighIns = addWeighIn(weighIns, { date: '2026-10-15', kg: 82.4 });
  weighIns = addWeighIn(weighIns, { date: '2026-10-01', kg: 83.1 });
  weighIns = addWeighIn(weighIns, { date: '2026-10-08', kg: 82.9 });
  assert.deepEqual(weighIns, [
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-08', kg: 82.9 },
    { date: '2026-10-15', kg: 82.4 },
  ]);
});

test('a weigh-in for a date that has one replaces it', () => {
  const first = addWeighIn([{ date: '2026-10-14', kg: 82.6 }], { date: '2026-10-15', kg: 82.4 });
  assert.deepEqual(addWeighIn(first, { date: '2026-10-15', kg: 81.9 }), [
    { date: '2026-10-14', kg: 82.6 },
    { date: '2026-10-15', kg: 81.9 },
  ]);
});

test('removing a weigh-in drops only that date', () => {
  const weighIns = [
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-15', kg: 82.4 },
  ];
  assert.deepEqual(removeWeighIn(weighIns, '2026-10-15'), [{ date: '2026-10-01', kg: 83.1 }]);
  assert.deepEqual(removeWeighIn(weighIns, '2026-10-10'), weighIns);
});

test('the weigh-in helpers return new lists and leave their input alone', () => {
  const weighIns = [{ date: '2026-10-15', kg: 82.4 }];
  addWeighIn(weighIns, { date: '2026-10-01', kg: 83.1 });
  addWeighIn(weighIns, { date: '2026-10-15', kg: 81.9 });
  removeWeighIn(weighIns, '2026-10-15');
  assert.deepEqual(weighIns, [{ date: '2026-10-15', kg: 82.4 }]);
});

test('current weight is the latest weigh-in by date, or null with none', () => {
  assert.equal(currentWeight([]), null);
  assert.equal(
    currentWeight([
      { date: '2026-10-15', kg: 82.4 },
      { date: '2026-10-01', kg: 83.1 },
    ]),
    82.4,
  );
});

test('addWeighIn rejects a bad date or weight', () => {
  assert.throws(() => addWeighIn([], { date: '15/10/2026', kg: 82.4 }), RangeError);
  for (const kg of [0, -1, NaN, Infinity, '82.4', null]) {
    assert.throws(() => addWeighIn([], { date: '2026-10-15', kg }), RangeError);
  }
  assert.throws(() => removeWeighIn([], 'today'), RangeError);
});

test('a weigh-in can be for today or an earlier day, however far back', () => {
  assert.equal(readWeighInDate('2026-10-20', '2026-10-20'), '2026-10-20');
  assert.equal(readWeighInDate('2026-10-19', '2026-10-20'), '2026-10-19');
  assert.equal(readWeighInDate('2024-01-31', '2026-10-20'), '2024-01-31');
});

test('a weigh-in can’t be for a day after today, including across a month or year', () => {
  assert.equal(readWeighInDate('2026-10-21', '2026-10-20'), null);
  assert.equal(readWeighInDate('2026-11-01', '2026-10-31'), null);
  assert.equal(readWeighInDate('2027-01-01', '2026-12-31'), null);
});

test('a weigh-in date must be a YYYY-MM-DD date', () => {
  for (const text of ['', '   ', '20/10/2026', '2026-10-2', 'today', null, undefined]) {
    assert.equal(readWeighInDate(text, '2026-10-20'), null);
  }
  assert.throws(() => readWeighInDate('2026-10-20', 'today'), RangeError);
});

test('Stats lists the last 12 weeks of weigh-ins, today and the 83 days before, newest first', () => {
  const weighIns = [
    { date: '2026-07-27', kg: 85.0 }, // 85 days ago
    { date: '2026-07-28', kg: 84.8 }, // 84 days ago
    { date: '2026-07-29', kg: 84.6 }, // 83 days ago
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-20', kg: 82.4 },
  ];
  assert.deepEqual(
    listedWeighIns(weighIns, '2026-10-20').map((w) => w.date),
    ['2026-10-20', '2026-10-01', '2026-07-29'],
  );
});

test('the 12 weeks run back across a year boundary', () => {
  const weighIns = [
    { date: '2025-11-10', kg: 84.0 },
    { date: '2025-11-11', kg: 83.9 },
    { date: '2026-01-15', kg: 83.0 },
  ];
  assert.deepEqual(
    listedWeighIns(weighIns, '2026-02-02').map((w) => w.date),
    ['2026-01-15', '2025-11-11'],
  );
});

test('the latest weigh-in is listed even when it’s older than 12 weeks, since it’s still the profile’s weight', () => {
  const weighIns = [
    { date: '2025-01-05', kg: 86.0 },
    { date: '2025-03-01', kg: 85.2 },
  ];
  assert.deepEqual(listedWeighIns(weighIns, '2026-10-20'), [{ date: '2025-03-01', kg: 85.2 }]);
});

test('with no weigh-ins, Stats lists none, and the log passed in is left alone', () => {
  assert.deepEqual(listedWeighIns([], '2026-10-20'), []);
  const weighIns = [
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-20', kg: 82.4 },
  ];
  listedWeighIns(weighIns, '2026-10-20');
  assert.deepEqual(weighIns.map((w) => w.date), ['2026-10-01', '2026-10-20']);
});

// --- Weight log ---

test('the weight log with no weigh-ins lists nothing and has no current weight', async () => {
  const log = createWeightLog(freshStore());
  assert.deepEqual(await log.list(), []);
  assert.equal(await log.currentWeight(), null);
});

test('the weight log saves weigh-ins oldest first, whatever order they’re added in', async () => {
  const store = freshStore();
  const log = createWeightLog(store);
  await log.add({ date: '2026-10-15', kg: 82.4 });
  await log.add({ date: '2026-09-20', kg: 84.0 });
  await log.add({ date: '2026-10-01', kg: 83.1 });
  const expected = [
    { date: '2026-09-20', kg: 84.0 },
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-15', kg: 82.4 },
  ];
  assert.deepEqual(await store.load(WEIGHT_DOC_ID), { weighIns: expected });
  assert.deepEqual(await log.list(), expected);
  assert.equal(await log.currentWeight(), 82.4);
});

test('a weigh-in for an earlier date doesn’t change the current weight', async () => {
  const log = createWeightLog(freshStore());
  await log.add({ date: '2026-10-15', kg: 82.4 });
  await log.add({ date: '2026-10-10', kg: 83.0 });
  assert.equal(await log.currentWeight(), 82.4);
});

test('the weight log replaces a same-date weigh-in rather than adding a second', async () => {
  const log = createWeightLog(freshStore());
  await log.add({ date: '2026-10-15', kg: 82.4 });
  assert.deepEqual(await log.add({ date: '2026-10-15', kg: 81.9 }), [{ date: '2026-10-15', kg: 81.9 }]);
  assert.equal(await log.currentWeight(), 81.9);
});

test('removing the latest weigh-in falls back to the one before', async () => {
  const log = createWeightLog(freshStore());
  await log.add({ date: '2026-10-01', kg: 83.1 });
  await log.add({ date: '2026-10-15', kg: 82.4 });
  assert.deepEqual(await log.remove('2026-10-15'), [{ date: '2026-10-01', kg: 83.1 }]);
  assert.equal(await log.currentWeight(), 83.1);
  await log.remove('2026-10-01');
  assert.equal(await log.currentWeight(), null);
});

test('weigh-ins are never pruned, however old', async () => {
  const log = createWeightLog(freshStore());
  await log.add({ date: '2024-01-02', kg: 90.2 });
  await log.add({ date: '2026-10-15', kg: 82.4 });
  assert.deepEqual(
    (await log.list()).map(({ date }) => date),
    ['2024-01-02', '2026-10-15'],
  );
});

test('a stored log that’s out of order still lists oldest first', async () => {
  // An imported doc (step 6.2) may not be sorted.
  const store = freshStore();
  await store.save(WEIGHT_DOC_ID, {
    weighIns: [
      { date: '2026-10-15', kg: 82.4 },
      { date: '2026-10-01', kg: 83.1 },
    ],
  });
  const log = createWeightLog(store);
  assert.deepEqual(
    (await log.list()).map(({ date }) => date),
    ['2026-10-01', '2026-10-15'],
  );
  assert.equal(await log.currentWeight(), 82.4);
});

test('the weight log works on a synced store', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  const log = createWeightLog(store);
  await log.add({ date: '2026-10-15', kg: 82.4 });
  assert.deepEqual(await createWeightLog(store).list(), [{ date: '2026-10-15', kg: 82.4 }]);
});

// --- Weight log offline guard ---

// An offline store reading this device's cache, as persist.js does when it can't reach
// the cloud. With weighIns given, the cache holds a log this device loaded before.
async function offlineStore(storage, weighIns) {
  if (weighIns) await (await createPersonalStore(createLocalPersist(storage))).save(WEIGHT_DOC_ID, { weighIns });
  return createPersonalStore(createLocalPersist(storage));
}

test('offline on a device that never loaded the weight log, add and remove are refused', async () => {
  const storage = createFakeStorage();
  const log = createWeightLog(await offlineStore(storage));
  await assert.rejects(log.add({ date: '2026-10-15', kg: 82.4 }), WeightLogUnavailableError);
  await assert.rejects(log.remove('2026-10-01'), WeightLogUnavailableError);
  assert.equal(storage.length, 0);
});

test('the refusal is a clear error saying nothing was saved', async () => {
  const log = createWeightLog(await offlineStore(createFakeStorage()));
  await assert.rejects(log.add({ date: '2026-10-15', kg: 82.4 }), {
    name: 'WeightLogUnavailableError',
    message: /nothing was saved/,
  });
});

test('offline on a device that loaded the weight log before, writes build on the cached copy', async () => {
  const storage = createFakeStorage();
  const log = createWeightLog(await offlineStore(storage, [{ date: '2026-10-01', kg: 83.1 }]));
  assert.deepEqual(await log.add({ date: '2026-10-15', kg: 82.4 }), [
    { date: '2026-10-01', kg: 83.1 },
    { date: '2026-10-15', kg: 82.4 },
  ]);
  assert.deepEqual(await log.remove('2026-10-01'), [{ date: '2026-10-15', kg: 82.4 }]);
  assert.deepEqual(await createWeightLog(await offlineStore(storage)).list(), [{ date: '2026-10-15', kg: 82.4 }]);
});

test('offline, a cached log with every weigh-in deleted still allows writes', async () => {
  const log = createWeightLog(await offlineStore(createFakeStorage(), []));
  assert.deepEqual(await log.add({ date: '2026-10-15', kg: 82.4 }), [{ date: '2026-10-15', kg: 82.4 }]);
});

test('online, a write builds on the log in the cloud', async () => {
  const persist = createFakePersist();
  persist.cloud.set(WEIGHT_DOC_ID, { json: JSON.stringify({ weighIns: [{ date: '2026-10-01', kg: 83.1 }] }) });
  const log = createWeightLog(await createPersonalStore(persist.openDoc));
  await log.add({ date: '2026-10-15', kg: 82.4 });
  persist.finishWrites();
  assert.deepEqual(JSON.parse(persist.cloud.get(WEIGHT_DOC_ID).json), {
    weighIns: [
      { date: '2026-10-01', kg: 83.1 },
      { date: '2026-10-15', kg: 82.4 },
    ],
  });
});

test('online with no weight log anywhere yet, the first weigh-in saves', async () => {
  const log = createWeightLog(await createPersonalStore(createFakePersist().openDoc));
  assert.deepEqual(await log.add({ date: '2026-10-15', kg: 82.4 }), [{ date: '2026-10-15', kg: 82.4 }]);
});

// The store's status covers every doc, so it can't tell whether the weight doc's own read
// failed. These two cases got past a guard that checked it.

test('a profile edit saved offline doesn’t let a weigh-in through on a device that never loaded the log', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  const core = await loadCoreDoc(store, '2026-10-15');
  persist.setOnline(false);

  // Firestore queues the write while offline, so the store reads 'saved-locally', not 'offline'.
  await store.save(CORE_DOC_ID, { ...core, profile: { ...core.profile, age: 34 } });
  let status;
  store.onStatus((next) => (status = next))();

  const log = createWeightLog(store);
  await assert.rejects(log.add({ date: '2026-10-15', kg: 82.4 }), WeightLogUnavailableError);
  assert.equal(status, 'saved-locally');
  persist.finishWrites();
  assert.equal(persist.cloud.has(WEIGHT_DOC_ID), false);
});

test('a weigh-in is still refused once the network is back, until the log is read again', async () => {
  const persist = createFakePersist();
  persist.cloud.set(WEIGHT_DOC_ID, { json: JSON.stringify({ weighIns: [{ date: '2026-10-01', kg: 83.1 }] }) });
  const store = await createPersonalStore(persist.openDoc);
  persist.setOnline(false);
  const log = createWeightLog(store);
  assert.deepEqual(await log.list(), []);

  // Back online, another doc's write lands and the store reads 'synced', but this page's
  // copy of the weight log is still the empty one from the failed read.
  persist.setOnline(true);
  await store.save(CORE_DOC_ID, { schemaVersion: 1 });
  persist.finishWrites();
  await assert.rejects(log.remove('2026-10-01'), WeightLogUnavailableError);
  assert.deepEqual(JSON.parse(persist.cloud.get(WEIGHT_DOC_ID).json).weighIns, [{ date: '2026-10-01', kg: 83.1 }]);

  // A reload reads it from the cloud, and writes work again.
  const reloaded = createWeightLog(await createPersonalStore(persist.openDoc));
  assert.deepEqual(await reloaded.remove('2026-10-01'), []);
});
