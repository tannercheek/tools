import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABS, SEGMENTS, DEFAULT_ROUTE, hashFor, parseRoute, isPushed, routeLabel, tabFor } from '../js/routes.js';

test('tabs are the four in fixed order', () => {
  assert.deepEqual(TABS.map((tab) => tab.id), ['today', 'plan', 'meals', 'stats']);
});

test('the Meals tab has Meals and Foods segments and opens on Meals', () => {
  assert.deepEqual(SEGMENTS.meals.map((segment) => segment.id), ['meals', 'foods']);
});

test('foods belongs to the Meals tab; every other route is its own', () => {
  assert.equal(tabFor('foods'), 'meals');
  for (const id of ['today', 'plan', 'meals', 'stats', 'settings', 'components']) assert.equal(tabFor(id), id);
});

test('every tab with segments is a tab', () => {
  for (const tab of Object.keys(SEGMENTS)) assert.ok(TABS.some(({ id }) => id === tab), tab);
});

test('the components showcase is not a tab, so nothing links to it', () => {
  assert.equal(TABS.some((tab) => tab.id === 'components'), false);
});

test('parseRoute reads every tab, the Foods segment, settings and the components showcase', () => {
  for (const id of ['today', 'plan', 'foods', 'meals', 'stats', 'settings', 'components']) {
    assert.equal(parseRoute(hashFor(id)), id);
  }
});

test('parseRoute rejects empty, unknown and malformed hashes', () => {
  for (const hash of ['', '#', '#/', '#today', '#/unknown', '#/today/', '#/Today', undefined]) {
    assert.equal(parseRoute(hash), null, String(hash));
  }
});

test('default route is a tab', () => {
  assert.ok(TABS.some((tab) => tab.id === DEFAULT_ROUTE));
});

test('settings and components are pushed, tabs and segments are not', () => {
  assert.equal(isPushed('settings'), true);
  assert.equal(isPushed('components'), true);
  for (const tab of TABS) assert.equal(isPushed(tab.id), false);
  assert.equal(isPushed('foods'), false);
});

test('routeLabel gives screen titles', () => {
  assert.equal(routeLabel('meals'), 'Meals');
  assert.equal(routeLabel('settings'), 'Settings');
  assert.equal(routeLabel('nope'), null);
});
