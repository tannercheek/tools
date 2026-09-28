import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';
import { newSessionId, SEED_TAGS } from '../js/schema.js';

/** Stands in for persist.js: a Map behind get and set, with a status feed. */
function fakePersist(initial = {}) {
  const map = new Map(Object.entries(structuredClone(initial)));
  const writes = [];
  const listeners = new Set();
  return {
    map, writes,
    get: key => map.get(key),
    set: (key, value) => { writes.push(key); map.set(key, value); },
    onStatus(fn) { listeners.add(fn); fn('synced'); return () => listeners.delete(fn); },
    emit: status => listeners.forEach(fn => fn(status)),
  };
}

const validDoc = () => ({
  schemaVersion: 1,
  settings: { unit: 'kg', accent: 'brick', retention: '2y', sort: 'name', filterTagIds: ['t-1'] },
  tags: [{ id: 't-1', name: 'Push', sortOrder: 0 }],
  lifts: [{
    id: 'l-1', name: 'Bench Press', pattern: 'horizontalPush', isBodyweight: false, notes: '',
    sortOrder: 0, createdAt: '2026-09-01T17:02:11.000Z', tagIds: ['t-1'],
    lastSets: [{ weightKg: 102.06, reps: 5 }],
    sessions: [{ id: 's-7d19mz3a', date: '2026-09-14T18:12:00.000Z', bestE1RMKg: 119.07, topWeightKg: 102.06, topReps: 5 }],
  }],
});

test('first run seeds the five tags and default settings, and saves all four keys', () => {
  const p = fakePersist();
  const store = createStore(p);
  assert.equal(store.loadError, null);
  assert.deepEqual(store.state.tags.map(t => t.name), SEED_TAGS);
  assert.deepEqual(store.state.tags.map(t => t.sortOrder), [0, 1, 2, 3, 4]);
  for (const t of store.state.tags) assert.match(t.id, /^t-[0-9a-f-]{36}$/);
  assert.equal(store.state.settings.retention, '1y');
  assert.equal(store.state.settings.unit, 'lb');
  assert.deepEqual(store.state.lifts, []);
  assert.deepEqual(p.writes.sort(), ['lifts', 'schemaVersion', 'settings', 'tags']);
});

test('reloading reads the same data back and writes nothing', () => {
  const p = fakePersist();
  const first = createStore(p);
  p.writes.length = 0;
  const second = createStore(p);
  assert.deepEqual(second.state, first.state);
  assert.deepEqual(p.writes, []);
});

test('saved data loads as-is, as a copy of what persist.js holds', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  assert.equal(store.loadError, null);
  assert.deepEqual(store.state, validDoc());
  assert.deepEqual(p.writes, []);
  p.map.get('lifts')[0].name = 'Changed underneath';
  assert.equal(store.state.lifts[0].name, 'Bench Press');
});

test('values handed to persist.js are copies too', () => {
  const p = fakePersist();
  const store = createStore(p);
  store.state.tags[0].name = 'Mutated';
  assert.equal(p.map.get('tags')[0].name, 'Push');
});

test('migrate fills defaults for missing fields without saving', () => {
  const doc = validDoc();
  delete doc.settings.accent;
  delete doc.settings.filterTagIds;
  delete doc.lifts[0].notes;
  delete doc.lifts[0].tagIds;
  delete doc.lifts[0].isBodyweight;
  const p = fakePersist(doc);
  const store = createStore(p);
  assert.equal(store.loadError, null);
  assert.equal(store.state.settings.accent, 'cobalt');
  assert.deepEqual(store.state.settings.filterTagIds, []);
  assert.equal(store.state.settings.unit, 'kg');
  assert.equal(store.state.lifts[0].notes, '');
  assert.deepEqual(store.state.lifts[0].tagIds, []);
  assert.equal(store.state.lifts[0].isBodyweight, false);
  assert.deepEqual(p.writes, []);
});

test('partly saved data is not re-seeded', () => {
  const p = fakePersist({ settings: { unit: 'kg' } });
  const store = createStore(p);
  assert.equal(store.loadError, null);
  assert.deepEqual(store.state.tags, []);
  assert.equal(store.state.schemaVersion, 1);
  assert.deepEqual(p.writes, []);
});

test('malformed data is reported and never overwritten', () => {
  const cases = {
    'lifts not a list': d => { d.lifts = { oops: true }; },
    'lift missing name': d => { delete d.lifts[0].name; },
    'session with bad reps': d => { d.lifts[0].sessions[0].topReps = 0; },
    'set with negative weight': d => { d.lifts[0].lastSets[0].weightKg = -5; },
    'unknown retention': d => { d.settings.retention = 'forever'; },
    'tags not a list': d => { d.tags = 'Push'; },
    'duplicate lift ids': d => { d.lifts.push(structuredClone(d.lifts[0])); },
    'newer schema': d => { d.schemaVersion = 2; },
  };
  for (const [name, breakIt] of Object.entries(cases)) {
    const doc = validDoc();
    breakIt(doc);
    const p = fakePersist(doc);
    const store = createStore(p);
    assert.ok(store.loadError, `${name}: should fail validation`);
    assert.deepEqual(p.writes, [], `${name}: nothing saved`);
    assert.deepEqual(p.map.get('lifts'), doc.lifts, `${name}: saved lifts untouched`);
  }
});

test('onSyncStatus passes persist.js status through', () => {
  const p = fakePersist();
  const store = createStore(p);
  const seen = [];
  const stop = store.onSyncStatus(s => seen.push(s));
  p.emit('saved-locally');
  p.emit('offline');
  stop();
  p.emit('synced');
  assert.deepEqual(seen, ['synced', 'saved-locally', 'offline']);
});

test('session ids: "s-" plus 8 characters, unique within their lift', () => {
  const taken = new Set();
  for (let i = 0; i < 2000; i++) {
    const id = newSessionId(taken);
    assert.match(id, /^s-[a-z0-9]{8}$/);
    assert.ok(!taken.has(id));
    taken.add(id);
  }
});
