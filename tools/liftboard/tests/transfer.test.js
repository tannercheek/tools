import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toExportFile, fromExportFile, exportFileName, ImportError } from '../js/transfer.js';
import { sampleData } from '../js/sample-data.js';
import { DEFAULT_SETTINGS } from '../js/schema.js';

const NOW = new Date(2026, 8, 22, 18, 4);
const doc = () => ({ schemaVersion: 1, settings: structuredClone(DEFAULT_SETTINGS), ...sampleData(NOW) });

test('export: the iOS shape — tag names, history, no ids, no settings', () => {
  const file = toExportFile(doc(), NOW);
  assert.deepEqual(Object.keys(file), ['schemaVersion', 'exportedAt', 'tags', 'lifts']);
  assert.deepEqual(file.tags[0], { name: 'Push' });
  const bench = file.lifts.find(l => l.name === 'Bench Press');
  assert.deepEqual(Object.keys(bench), ['name', 'pattern', 'isBodyweight', 'notes', 'tags', 'lastSets', 'history']);
  assert.deepEqual(bench.tags, ['Push', 'Upper']);
  assert.deepEqual(Object.keys(bench.history[0]), ['date', 'bestE1RMKg', 'topWeightKg', 'topReps']);
  assert.ok(!JSON.stringify(file).includes('"id"'));
  assert.equal(exportFileName(NOW), 'liftboard-2026-09-22.json');
});

test('round trip: export then import gives the same lifts, with fresh ids', () => {
  const original = doc();
  const { tags, lifts } = fromExportFile(JSON.parse(JSON.stringify(toExportFile(original, NOW))), NOW);
  const strip = d => d.lifts.map(l => ({
    name: l.name, pattern: l.pattern, isBodyweight: l.isBodyweight, notes: l.notes, sortOrder: l.sortOrder,
    tags: l.tagIds.map(id => d.tags.find(t => t.id === id).name),
    lastSets: l.lastSets,
    sessions: [...l.sessions].sort((a, b) => a.date.localeCompare(b.date)).map(({ id, ...rest }) => rest),
  }));
  assert.deepEqual(strip({ tags, lifts }), strip(original));
  assert.deepEqual(tags.map(t => t.name), original.tags.map(t => t.name));
  assert.notEqual(lifts[0].id, original.lifts[0].id);
  for (const l of lifts) for (const s of l.sessions) assert.match(s.id, /^s-[a-z0-9]{8}$/);
});

test('import: fills optional fields, creates tags named by lifts, dedupes tag names', () => {
  const { tags, lifts } = fromExportFile({
    schemaVersion: 1, tags: [{ name: 'Push' }, { name: 'push' }],
    lifts: [{ name: ' Dip ', pattern: 'verticalPush', tags: ['PUSH', 'Weighted'] }],
  }, NOW);
  assert.deepEqual(tags.map(t => t.name), ['Push', 'Weighted']);
  assert.deepEqual(lifts[0].tagIds, tags.map(t => t.id));
  assert.equal(lifts[0].name, 'Dip');
  assert.equal(lifts[0].isBodyweight, false);
  assert.deepEqual([lifts[0].notes, lifts[0].lastSets, lifts[0].sessions], ['', [], []]);
  assert.equal(lifts[0].createdAt, NOW.toISOString());
});

test('import: refuses bad files with a plain message naming the lift', () => {
  const good = () => JSON.parse(JSON.stringify(toExportFile(doc(), NOW)));
  const refuses = (mutate, pattern) => {
    const file = good(); mutate(file);
    assert.throws(() => fromExportFile(file, NOW), err => err instanceof ImportError && pattern.test(err.message), String(pattern));
  };
  refuses(f => { delete f.schemaVersion; }, /isn’t a LiftBoard export/);
  refuses(f => { f.schemaVersion = 2; }, /newer version/);
  refuses(f => { f.lifts = 'nope'; }, /missing its tags or lifts/);
  refuses(f => { f.lifts[1].pattern = 'crossfit'; }, /“Bench Press”.*movement pattern "crossfit"/);
  refuses(f => { f.lifts[1].history[2].topReps = 0; }, /“Bench Press”.*session in its history has bad numbers/);
  refuses(f => { f.lifts[1].history[0].date = 'yesterday'; }, /“Bench Press”.*bad date/);
  refuses(f => { f.lifts[2].lastSets[0].weightKg = -1; }, /“Overhead Press”.*last sets/);
  refuses(f => { delete f.lifts[3].name; }, /Lift 4 can’t be imported: it has no name/);
  refuses(f => { f.tags[0] = {}; }, /Tag 1/);
  assert.throws(() => fromExportFile(null), ImportError);
  assert.throws(() => fromExportFile([1, 2]), ImportError);
});
