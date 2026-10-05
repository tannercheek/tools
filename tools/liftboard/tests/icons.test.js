import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, EQUIPMENT_PATHS, equipmentIcon } from '../js/icons.js';
import { EQUIPMENT } from '../js/library.js';

test('equipment icons: every equipment type has its own icon, and nothing else does', () => {
  assert.deepEqual(Object.keys(EQUIPMENT_PATHS).sort(), Object.keys(EQUIPMENT).sort());
  for (const equipment of Object.keys(EQUIPMENT)) {
    assert.match(EQUIPMENT_PATHS[equipment], /^<path d="M[^"]+"/, `${equipment} has no icon`);
    assert.ok(equipmentIcon(equipment).includes(EQUIPMENT_PATHS[equipment]), `${equipment} doesn’t draw its own icon`);
  }
});

test('equipment icons: no two share a drawing, and none is a UI icon', () => {
  const all = Object.values(EQUIPMENT_PATHS);
  assert.equal(new Set(all).size, all.length);
  for (const paths of all) assert.ok(!Object.values(PATHS).includes(paths));
});

test('equipment icons: on the 24×24 grid in currentColor; unknown equipment gets "other"', () => {
  for (const equipment of Object.keys(EQUIPMENT)) {
    const svg = equipmentIcon(equipment);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /fill="currentColor" stroke="currentColor"/);
    assert.match(svg, /aria-hidden="true"/);
  }
  assert.equal(equipmentIcon('sled'), equipmentIcon('other'));
});
