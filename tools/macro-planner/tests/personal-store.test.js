import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalPersist, createPersonalStore } from '../js/store.js';
import { createFakePersist } from './fake-persist.js';
import { createFakeStorage } from './fake-storage.js';

const CORE_DOC = {
  schemaVersion: 1,
  profile: { sex: 'male', weightKg: 81.6466266, overrides: { kcal: 2400 } },
  foods: [{ id: 'custom-1', name: 'Egg, large', emoji: '🥚', kcal: 72, protein: 6.3 }],
};

test('save then load round-trips a document', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.save('macro-planner', CORE_DOC);
  assert.deepEqual(await store.load('macro-planner'), CORE_DOC);
});

test('load gives a copy, so changing it does not change what is stored', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.save('macro-planner', CORE_DOC);
  const loaded = await store.load('macro-planner');
  loaded.profile.weightKg = 1;
  assert.equal((await store.load('macro-planner')).profile.weightKg, 81.6466266);
});

test('load returns {} for a document that was never saved', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  assert.deepEqual(await store.load('macro-planner-log-2026-10'), {});
});

test('load returns {} for a corrupt stored value', async () => {
  const persist = createFakePersist();
  persist.cloud.set('bad', { json: '{not json' });
  const store = await createPersonalStore(persist.openDoc);
  assert.deepEqual(await store.load('bad'), {});
});

test('a save syncs to another browser', async () => {
  const persist = createFakePersist();
  const phone = await createPersonalStore(persist.openDoc);
  await phone.save('macro-planner-log-2026-10', { '2026-10-09': { changes: {}, entries: [] } });
  persist.finishWrites();

  const laptop = await createPersonalStore(persist.openDoc);
  assert.deepEqual(await laptop.load('macro-planner-log-2026-10'), { '2026-10-09': { changes: {}, entries: [] } });
  assert.deepEqual(await laptop.list('macro-planner-log-'), ['macro-planner-log-2026-10']);
});

// persist.js merges nested objects in the cloud, which is why the doc is stored as one string.
test('save replaces the whole document, including keys removed inside nested objects', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  await store.save('macro-planner', CORE_DOC);
  await store.save('macro-planner', { ...CORE_DOC, profile: { sex: 'male', weightKg: 80 } });
  persist.finishWrites();

  assert.equal(typeof persist.cloud.get('macro-planner').json, 'string');
  const reopened = await createPersonalStore(persist.openDoc);
  assert.deepEqual((await reopened.load('macro-planner')).profile, { sex: 'male', weightKg: 80 });
});

test('each document is opened once, however often it is used', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  await Promise.all([store.load('macro-planner-log-2026-10'), store.load('macro-planner-log-2026-10')]);
  await store.save('macro-planner-log-2026-10', {});
  await store.list('');
  assert.deepEqual(persist.opens, ['macro-planner', 'macro-planner-log-2026-10']);
});

test('list returns saved docIds matching the prefix, sorted', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  for (const docId of [
    'macro-planner-log-2026-10',
    'macro-planner',
    'macro-planner-log-2025-12',
    'macro-planner-log-2026-01',
  ]) {
    await store.save(docId, {});
  }

  assert.deepEqual(await store.list('macro-planner-log-'), [
    'macro-planner-log-2025-12',
    'macro-planner-log-2026-01',
    'macro-planner-log-2026-10',
  ]);
  assert.deepEqual(await store.list('macro-planner'), [
    'macro-planner',
    'macro-planner-log-2025-12',
    'macro-planner-log-2026-01',
    'macro-planner-log-2026-10',
  ]);
});

test('list returns [] when nothing matches', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  assert.deepEqual(await store.list('macro-planner-log-'), []);
});

test('saving a document twice lists it once', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.save('macro-planner-log-2026-10', { a: 1 });
  await store.save('macro-planner-log-2026-10', { a: 2 });
  assert.deepEqual(await store.list('macro-planner-log-'), ['macro-planner-log-2026-10']);
});

test('remove blanks only that document and drops it from the list', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.save('macro-planner-log-2026-09', { a: 1 });
  await store.save('macro-planner-log-2026-10', { b: 2 });
  await store.remove('macro-planner-log-2026-09');
  assert.deepEqual(await store.load('macro-planner-log-2026-09'), {});
  assert.deepEqual(await store.load('macro-planner-log-2026-10'), { b: 2 });
  assert.deepEqual(await store.list('macro-planner-log-'), ['macro-planner-log-2026-10']);
});

test('removing the core document keeps the index of the others', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.save('macro-planner', CORE_DOC);
  await store.save('macro-planner-log-2026-10', { b: 2 });
  await store.remove('macro-planner');
  assert.deepEqual(await store.load('macro-planner'), {});
  assert.deepEqual(await store.list('macro-planner'), ['macro-planner-log-2026-10']);
});

test('remove of a missing document is a no-op', async () => {
  const store = await createPersonalStore(createFakePersist().openDoc);
  await store.remove('macro-planner-log-1999-01');
  assert.deepEqual(await store.list(''), []);
});

test('loaded is true for a doc read from the cloud, even one that isn’t there yet', async () => {
  const persist = createFakePersist();
  persist.cloud.set('macro-planner-weight', { json: '{"weighIns":[]}' });
  const store = await createPersonalStore(persist.openDoc);
  assert.equal(await store.loaded('macro-planner'), true);
  assert.equal(await store.loaded('macro-planner-weight'), true);
  assert.equal(await store.loaded('macro-planner-days'), true);
});

test('loaded is false for a doc whose cloud read failed, and stays false after the network is back', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  persist.setOnline(false);
  assert.equal(await store.loaded('macro-planner-weight'), false);
  assert.equal(await store.loaded('macro-planner'), true);

  persist.setOnline(true);
  await store.save('macro-planner-weight', { weighIns: [] });
  persist.finishWrites();
  assert.equal(await store.loaded('macro-planner-weight'), false);
});

test('loaded opens the doc once, like load', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  await store.loaded('macro-planner-weight');
  await store.load('macro-planner-weight');
  assert.deepEqual(persist.opens, ['macro-planner', 'macro-planner-weight']);
});

test('loaded is false for every doc on the local stand-in, which never reaches the cloud', async () => {
  const storage = createFakeStorage({
    'toolState:macro-planner': JSON.stringify({ json: JSON.stringify(CORE_DOC) }),
  });
  const store = await createPersonalStore(createLocalPersist(storage));
  assert.equal(await store.loaded('macro-planner'), false);
  assert.equal(await store.loaded('macro-planner-weight'), false);
});

function watchStatus(store) {
  const seen = [];
  store.onStatus((status) => seen.push(status));
  return seen;
}

test('status starts as the core document loaded: synced or offline', async () => {
  const online = await createPersonalStore(createFakePersist().openDoc);
  assert.deepEqual(watchStatus(online), ['synced']);
  const offline = await createPersonalStore(createLocalPersist(createFakeStorage()));
  assert.deepEqual(watchStatus(offline), ['offline']);
});

test('status is saved-locally while a write is in flight, then synced', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  const seen = watchStatus(store);
  await store.save('macro-planner', CORE_DOC);
  assert.equal(seen.at(-1), 'saved-locally');
  persist.finishWrites();
  assert.deepEqual(seen, ['synced', 'saved-locally', 'synced']);
});

test('status is offline when a write fails', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  const seen = watchStatus(store);
  await store.save('macro-planner', CORE_DOC);
  persist.finishWrites('offline');
  assert.deepEqual(seen, ['synced', 'saved-locally', 'offline']);
});

test('status stays saved-locally until every document has finished writing', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  const seen = watchStatus(store);

  // A new month doc writes itself and the index in the core doc; the core doc lands first.
  await store.save('macro-planner-log-2026-10', { b: 2 });
  persist.finishWrites('synced', 'macro-planner');
  assert.deepEqual(seen, ['synced', 'saved-locally']);
  persist.finishWrites();
  assert.deepEqual(seen, ['synced', 'saved-locally', 'synced']);
});

test('onStatus returns an unsubscribe function', async () => {
  const persist = createFakePersist();
  const store = await createPersonalStore(persist.openDoc);
  const seen = [];
  const stop = store.onStatus((status) => seen.push(status));
  stop();
  await store.save('macro-planner', CORE_DOC);
  assert.deepEqual(seen, ['synced']);
});

test('the local stand-in reads what persist.js cached on this device', async () => {
  const storage = createFakeStorage({
    'toolState:macro-planner': JSON.stringify({ json: JSON.stringify(CORE_DOC), docIds: ['macro-planner'] }),
  });
  const store = await createPersonalStore(createLocalPersist(storage));
  assert.deepEqual(await store.load('macro-planner'), CORE_DOC);
  assert.deepEqual(await store.list('macro-planner'), ['macro-planner']);
});

test('the local stand-in writes in persist.js cache shape and survives a reload', async () => {
  const storage = createFakeStorage();
  const store = await createPersonalStore(createLocalPersist(storage));
  await store.save('macro-planner-log-2026-10', { b: 2 });

  assert.deepEqual(JSON.parse(storage.getItem('toolState:macro-planner-log-2026-10')), { json: '{"b":2}' });
  const reloaded = await createPersonalStore(createLocalPersist(storage));
  assert.deepEqual(await reloaded.load('macro-planner-log-2026-10'), { b: 2 });
  assert.deepEqual(await reloaded.list('macro-planner-log-'), ['macro-planner-log-2026-10']);
});

test('the local stand-in rejects a save when storage is full, rather than failing silently', async () => {
  const full = {
    getItem: () => null,
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  const store = await createPersonalStore(createLocalPersist(full));
  await assert.rejects(store.save('macro-planner', CORE_DOC), /QuotaExceededError/);
});
