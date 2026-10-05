import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY, EQUIPMENT, PATTERNS, libraryGroups, libraryEquipment, allowsNoWeight } from '../js/library.js';

test('library: every entry has a known pattern and equipment', () => {
  for (const [name, pattern, equipment] of LIBRARY) {
    assert.ok(Object.hasOwn(PATTERNS, pattern), `${name}: ${pattern}`);
    assert.ok(Object.hasOwn(EQUIPMENT, equipment), `${name}: ${equipment}`);
  }
});

test('library: grouped by equipment in picker order, empty groups left out', () => {
  assert.deepEqual(libraryGroups().map(g => g.label), ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight']);
  const names = eq => libraryGroups().find(g => g.equipment === eq).lifts.map(l => l.name);
  assert.deepEqual(names('cable'), ['Lat Pulldown', 'Seated Cable Row', 'Cable Fly', 'Tricep Pushdown']);
  assert.deepEqual(names('machine'), ['Leg Press', 'Chest Press Machine', 'Leg Extension', 'Leg Curl', 'Calf Raise']);
});

test('library: name lookup ignores case and outer spaces', () => {
  assert.equal(libraryEquipment('  pull-up '), 'bodyweight');
  assert.equal(libraryEquipment('Zercher Squat'), null);
});

test('allowsNoWeight: bodyweight and band only', () => {
  const ok = Object.keys(EQUIPMENT).filter(equipment => allowsNoWeight({ equipment }));
  assert.deepEqual(ok, ['bodyweight', 'band']);
});
