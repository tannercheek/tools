import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';
import { newSessionId, SEED_TAGS } from '../js/schema.js';
import { sampleData } from '../js/sample-data.js';
import { latest, badge, isTrendingUp, comparablePR } from '../js/derive.js';

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

test('addLift: adds an untagged, never-logged lift at the end, writing only "lifts"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  let notified = 0;
  store.subscribe(() => notified++);
  const id = store.addLift({ name: '  Pull-Up ', pattern: 'verticalPull', isBodyweight: true });
  assert.match(id, /^l-[0-9a-f-]{36}$/);
  const lift = store.lift(id);
  assert.equal(lift.name, 'Pull-Up');
  assert.equal(lift.pattern, 'verticalPull');
  assert.equal(lift.isBodyweight, true);
  assert.equal(lift.notes, '');
  assert.equal(lift.sortOrder, 1);
  assert.deepEqual([lift.tagIds, lift.lastSets, lift.sessions], [[], [], []]);
  assert.ok(!Number.isNaN(Date.parse(lift.createdAt)));
  assert.deepEqual(p.writes, ['lifts']);
  assert.equal(notified, 1);
  assert.equal(p.map.get('lifts').length, 2);
});

test('addLift: duplicate names are allowed; an empty name or unknown pattern is not kept', () => {
  const store = createStore(fakePersist());
  const a = store.addLift({ name: 'Curl', pattern: 'accessory' });
  const b = store.addLift({ name: 'Curl', pattern: 'nonsense' });
  assert.notEqual(a, b);
  assert.equal(store.lift(b).pattern, 'accessory');
  assert.equal(store.lift(a).sortOrder, 0);
  assert.equal(store.lift(b).sortOrder, 1);
  assert.throws(() => store.addLift({ name: '   ', pattern: 'squat' }));
  assert.equal(store.state.lifts.length, 2);
});

test('updateLift: changes the editable fields only; id, sessions and tags stay', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  store.updateLift('l-1', { name: 'Paused Bench', notes: '2-count pause', id: 'l-hacked', sessions: [] });
  const lift = store.lift('l-1');
  assert.equal(lift.name, 'Paused Bench');
  assert.equal(lift.notes, '2-count pause');
  assert.equal(lift.pattern, 'horizontalPush');
  assert.equal(lift.sessions.length, 1);
  assert.deepEqual(lift.tagIds, ['t-1']);
  assert.equal(store.lift('l-hacked'), null);
  assert.deepEqual(p.writes, ['lifts']);
  assert.equal(p.map.get('lifts')[0].name, 'Paused Bench');
});

test('deleteLift: removes the lift and its sessions, keeps tags, writes only "lifts"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  store.deleteLift('l-1');
  assert.deepEqual(store.state.lifts, []);
  assert.equal(store.state.tags.length, 1);
  assert.deepEqual(p.writes, ['lifts']);
  assert.deepEqual(p.map.get('lifts'), []);
});

test('logSession: replaces lastSets and appends one summary, writing only "lifts"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  const now = new Date('2026-09-22T18:00:00.000Z');
  const id = store.logSession('l-1', [
    { weightKg: 104.326, reps: 5 }, { weightKg: 106.594, reps: 3 }, { weightKg: 90.7185, reps: 8 },
  ], now);
  const lift = store.lift('l-1');
  assert.match(id, /^s-[a-z0-9]{8}$/);
  assert.deepEqual(lift.lastSets, [{ weightKg: 104.33, reps: 5 }, { weightKg: 106.59, reps: 3 }, { weightKg: 90.72, reps: 8 }]);
  assert.equal(lift.sessions.length, 2);
  const s = lift.sessions.at(-1);
  assert.deepEqual(s, { id, date: now.toISOString(), bestE1RMKg: 121.72, topWeightKg: 106.59, topReps: 3 });
  assert.deepEqual(p.writes, ['lifts']);
  assert.deepEqual(p.map.get('lifts')[0].sessions.at(-1), s);
});

test('logSession: two sessions the same day are both kept; the later sets become lastSets', () => {
  const store = createStore(fakePersist(validDoc()));
  store.logSession('l-1', [{ weightKg: 100, reps: 5 }], new Date('2026-09-22T10:00:00Z'));
  const second = store.logSession('l-1', [{ weightKg: 80, reps: 10 }], new Date('2026-09-22T19:00:00Z'));
  const lift = store.lift('l-1');
  assert.equal(lift.sessions.length, 3);
  assert.deepEqual(lift.lastSets, [{ weightKg: 80, reps: 10 }]);
  assert.equal(lift.sessions.at(-1).id, second);
  assert.equal(new Set(lift.sessions.map(s => s.id)).size, 3);
});

test('logSession: bodyweight lifts accept 0; other lifts need weight; bad input changes nothing', () => {
  const p = fakePersist();
  const store = createStore(p);
  const bw = store.addLift({ name: 'Pull-Up', pattern: 'verticalPull', isBodyweight: true });
  const bench = store.addLift({ name: 'Bench Press', pattern: 'horizontalPush' });
  store.logSession(bw, [{ weightKg: 0, reps: 12 }]);
  assert.equal(store.lift(bw).sessions[0].topReps, 12);
  assert.equal(store.lift(bw).sessions[0].topWeightKg, 0);
  p.writes.length = 0;
  assert.throws(() => store.logSession(bench, [{ weightKg: 0, reps: 5 }]));
  assert.throws(() => store.logSession(bench, []));
  assert.throws(() => store.logSession(bench, [{ weightKg: 100, reps: 0 }]));
  assert.throws(() => store.logSession(bench, [{ weightKg: 100, reps: 5.5 }]));
  assert.throws(() => store.logSession(bench, [{ weightKg: -1, reps: 5 }]));
  assert.throws(() => store.logSession('l-missing', [{ weightKg: 100, reps: 5 }]));
  assert.deepEqual(store.lift(bench).sessions, []);
  assert.deepEqual(p.writes, []);
});

test('replaceAll: swaps tags and lifts, keeps settings but clears the filter', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  const tags = [{ id: 't-new', name: 'Legs', sortOrder: 0 }];
  const lifts = [{ id: 'l-new', name: 'Squat', pattern: 'squat', sortOrder: 0, createdAt: '2026-09-01T00:00:00.000Z', tagIds: ['t-new'], lastSets: [], sessions: [] }];
  store.replaceAll({ tags, lifts });
  assert.deepEqual(store.state.tags, tags);
  assert.equal(store.state.lifts[0].name, 'Squat');
  assert.equal(store.state.lifts[0].notes, '');   // defaults filled
  assert.equal(store.state.settings.unit, 'kg');
  assert.deepEqual(store.state.settings.filterTagIds, []);
  assert.deepEqual(p.writes.sort(), ['lifts', 'settings', 'tags']);
  lifts[0].name = 'changed after';
  assert.equal(store.state.lifts[0].name, 'Squat', 'stores a copy');
});

test('replaceAll: refuses malformed data and changes nothing', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  assert.throws(() => store.replaceAll({ tags: [], lifts: [{ name: 'no id' }] }));
  assert.equal(store.state.lifts[0].name, 'Bench Press');
  assert.deepEqual(p.writes, []);
});

test('addTag: unique names ignoring case; reusing writes nothing', () => {
  const p = fakePersist();
  const store = createStore(p);
  p.writes.length = 0;
  const id = store.addTag('  Barbell ');
  assert.match(id, /^t-[0-9a-f-]{36}$/);
  const tag = store.state.tags.find(t => t.id === id);
  assert.deepEqual([tag.name, tag.sortOrder], ['Barbell', 5]);
  assert.deepEqual(p.writes, ['tags']);
  p.writes.length = 0;
  assert.equal(store.addTag('barbell'), id);
  assert.equal(store.addTag('PUSH'), store.state.tags[0].id);
  assert.deepEqual(p.writes, []);
  assert.throws(() => store.addTag('  '));
});

test('setLiftTags: keeps known tags once each, writing only "lifts"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  const legs = store.addTag('Legs');
  p.writes.length = 0;
  store.setLiftTags('l-1', [legs, 't-1', legs, 't-deleted']);
  assert.deepEqual(store.lift('l-1').tagIds, [legs, 't-1']);
  assert.deepEqual(p.writes, ['lifts']);
});

test('setSetting: valid values only, writing only "settings"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  store.setSetting('sort', 'recent');
  store.setSetting('filterTagIds', ['t-1', 't-1']);
  assert.equal(store.state.settings.sort, 'recent');
  assert.deepEqual(store.state.settings.filterTagIds, ['t-1']);
  assert.deepEqual(p.writes, ['settings', 'settings']);
  assert.throws(() => store.setSetting('sort', 'random'));
  assert.throws(() => store.setSetting('retention', 'forever'));
  assert.throws(() => store.setSetting('filterTagIds', 't-1'));
  assert.throws(() => store.setSetting('nonsense', 'x'));
  assert.equal(p.writes.length, 2);
});

test('deleteSession: removes one session, leaves lastSets, writes only "lifts"', () => {
  const p = fakePersist(validDoc());
  const store = createStore(p);
  const id = store.logSession('l-1', [{ weightKg: 110, reps: 5 }]);
  p.writes.length = 0;
  store.deleteSession('l-1', id);
  const lift = store.lift('l-1');
  assert.deepEqual(lift.sessions.map(s => s.id), ['s-7d19mz3a']);
  assert.deepEqual(lift.lastSets, [{ weightKg: 110, reps: 5 }]);
  assert.deepEqual(p.writes, ['lifts']);
});


const sampleStore = (now = new Date(2026, 8, 22, 12)) => {
  const p = fakePersist();
  const store = createStore(p);
  store.replaceAll(sampleData(now));
  p.writes.length = 0;
  return { p, store };
};

test('moveLift / moveTag: swap with the neighbour and renumber; ends do nothing', () => {
  const { p, store } = sampleStore();
  const order = list => [...list].sort((a, b) => a.sortOrder - b.sortOrder).map(x => x.name).slice(0, 3).join(',');
  const bench = store.state.lifts.find(l => l.name === 'Bench Press').id;
  store.moveLift(bench, -1);
  assert.equal(order(store.state.lifts), 'Bench Press,Back Squat,Overhead Press');
  store.moveLift(bench, -1);   // already first
  assert.deepEqual(p.writes, ['lifts']);
  assert.deepEqual(store.state.lifts.map(l => l.sortOrder).sort(), [0, 1, 2, 3, 4, 5, 6]);
  const pull = store.state.tags.find(t => t.name === 'Pull').id;
  store.moveTag(pull, -1);
  assert.equal(order(store.state.tags), 'Pull,Push,Legs');
  assert.deepEqual(p.writes, ['lifts', 'tags']);
});

test('renameTag: renames, allows a change of case, refuses a clash', () => {
  const { p, store } = sampleStore();
  const push = store.state.tags.find(t => t.name === 'Push').id;
  store.renameTag(push, 'Pushing');
  store.renameTag(push, 'PUSHING');
  assert.equal(store.state.tags.find(t => t.id === push).name, 'PUSHING');
  assert.throws(() => store.renameTag(push, 'legs'), /already a tag called “Legs”/);
  assert.throws(() => store.renameTag(push, '  '));
  assert.deepEqual(p.writes, ['tags', 'tags']);
});

test('deleteTag: removes it from tags, lifts and the filter; never deletes a lift', () => {
  const { p, store } = sampleStore();
  const push = store.state.tags.find(t => t.name === 'Push').id;
  store.setSetting('filterTagIds', [push]);
  p.writes.length = 0;
  store.deleteTag(push);
  assert.ok(!store.state.tags.some(t => t.id === push));
  assert.ok(store.state.lifts.every(l => !l.tagIds.includes(push)));
  assert.deepEqual(store.state.settings.filterTagIds, []);
  assert.equal(store.state.lifts.length, 7);
  assert.deepEqual(p.writes.sort(), ['lifts', 'settings', 'tags']);
});

test('pruneHistory: counts first, deletes only old non-record sessions, keeps every card the same', () => {
  const now = new Date(2026, 8, 22, 12);
  const { p, store } = sampleStore(now);
  const cards = () => store.state.lifts.map(l => JSON.stringify([latest(l)?.id, comparablePR(l)?.id, badge(l, now), isTrendingUp(l)]));
  const before = cards();
  const count = store.countPrunable('6m', now);
  assert.ok(count > 0, 'the sample data has sessions older than 6 months');
  assert.deepEqual(p.writes, [], 'counting changes nothing');
  store.setSetting('retention', '6m');
  assert.equal(store.pruneHistory(now), count);
  assert.deepEqual(cards(), before);
  assert.equal(store.countPrunable('6m', now), 0);
  p.writes.length = 0;
  assert.equal(store.pruneHistory(now), 0);
  assert.deepEqual(p.writes, [], 'nothing to prune writes nothing');
});

test('exportDoc / importDoc round trip; a bad import changes nothing', () => {
  const { p, store } = sampleStore();
  const file = JSON.parse(JSON.stringify(store.exportDoc()));
  const target = createStore(fakePersist(validDoc()));
  target.importDoc(file);
  assert.deepEqual(target.state.lifts.map(l => l.name), store.state.lifts.map(l => l.name));
  assert.deepEqual(target.state.settings.unit, 'kg', 'settings are kept');
  const bad = { ...file, schemaVersion: 99 };
  p.writes.length = 0;
  assert.throws(() => store.importDoc(bad), /newer version/);
  assert.equal(store.state.lifts.length, 7);
  assert.deepEqual(p.writes, []);
});

test('deleteAll: a fresh start, saving all four keys', () => {
  const { p, store } = sampleStore();
  store.setSetting('accent', 'ink');
  p.writes.length = 0;
  store.deleteAll();
  assert.deepEqual(store.state.lifts, []);
  assert.deepEqual(store.state.tags.map(t => t.name), SEED_TAGS);
  assert.equal(store.state.settings.accent, 'cobalt');
  assert.deepEqual(p.writes.sort(), ['lifts', 'schemaVersion', 'settings', 'tags']);
});
