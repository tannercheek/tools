import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';

const CORE_DOC = {
  schemaVersion: 1,
  profile: { sex: 'male', weightKg: 81.6466266 },
  foods: [{ id: 'custom-1', name: 'Egg, large', emoji: '🥚', kcal: 72, protein: 6.3 }],
};

test('save then load round-trips a document', async () => {
  const store = createLocalStore(createFakeStorage());
  await store.save('macro-planner', CORE_DOC);
  assert.deepEqual(await store.load('macro-planner'), CORE_DOC);
});

test('load gives a copy, so changing it does not change what is stored', async () => {
  const store = createLocalStore(createFakeStorage());
  await store.save('macro-planner', CORE_DOC);
  const loaded = await store.load('macro-planner');
  loaded.profile.weightKg = 1;
  assert.equal((await store.load('macro-planner')).profile.weightKg, 81.6466266);
});

test('save replaces the whole document', async () => {
  const store = createLocalStore(createFakeStorage());
  await store.save('macro-planner', { a: 1, b: 2 });
  await store.save('macro-planner', { a: 3 });
  assert.deepEqual(await store.load('macro-planner'), { a: 3 });
});

test('load returns {} for a document that was never saved', async () => {
  const store = createLocalStore(createFakeStorage());
  assert.deepEqual(await store.load('macro-planner'), {});
});

test('load returns {} for corrupt JSON or a stored null', async () => {
  const storage = createFakeStorage({ 'toolState:bad': '{not json', 'toolState:empty': 'null' });
  const store = createLocalStore(storage);
  assert.deepEqual(await store.load('bad'), {});
  assert.deepEqual(await store.load('empty'), {});
});

test('load returns {} when storage is blocked', async () => {
  const blocked = {
    getItem() {
      throw new Error('SecurityError');
    },
  };
  assert.deepEqual(await createLocalStore(blocked).load('macro-planner'), {});
});

test('save rejects when storage is full, rather than failing silently', async () => {
  const full = {
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  await assert.rejects(createLocalStore(full).save('macro-planner', CORE_DOC), /QuotaExceededError/);
});

test('documents are stored under the same keys persist.js caches to', async () => {
  const storage = createFakeStorage();
  await createLocalStore(storage).save('macro-planner', CORE_DOC);
  assert.deepEqual(JSON.parse(storage.getItem('toolState:macro-planner')), CORE_DOC);
});

test('remove deletes only that document', async () => {
  const store = createLocalStore(createFakeStorage());
  await store.save('macro-planner-log-2026-09', { a: 1 });
  await store.save('macro-planner-log-2026-10', { b: 2 });
  await store.remove('macro-planner-log-2026-09');
  assert.deepEqual(await store.load('macro-planner-log-2026-09'), {});
  assert.deepEqual(await store.load('macro-planner-log-2026-10'), { b: 2 });
  assert.deepEqual(await store.list('macro-planner-log-'), ['macro-planner-log-2026-10']);
});

test('remove of a missing document is a no-op', async () => {
  const store = createLocalStore(createFakeStorage());
  await store.remove('macro-planner-log-1999-01');
  assert.deepEqual(await store.list(''), []);
});

test('list returns matching docIds, sorted, and nothing else', async () => {
  const storage = createFakeStorage({
    toolsPassphrase: 'secret',
    'toolState:habit-tracker': '{}',
    'unrelated:macro-planner-log-2026-01': '{}',
  });
  const store = createLocalStore(storage);
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
  const store = createLocalStore(createFakeStorage({ 'toolState:habit-tracker': '{}' }));
  assert.deepEqual(await store.list('macro-planner-log-'), []);
});

test('loaded is always true, since localStorage is the only copy', async () => {
  const store = createLocalStore(createFakeStorage());
  assert.equal(await store.loaded('macro-planner-weight'), true);
});
