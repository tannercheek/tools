import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABS, DEFAULT_ROUTE, hashFor, parseRoute, isPushed, routeLabel } from '../js/routes.js';

test('tabs are the five in fixed order', () => {
  assert.deepEqual(TABS.map((tab) => tab.id), ['today', 'plan', 'foods', 'meals', 'stats']);
});

test('the components showcase is not a tab, so nothing links to it', () => {
  assert.equal(TABS.some((tab) => tab.id === 'components'), false);
});

test('parseRoute reads every tab, settings and the components showcase', () => {
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

test('settings and components are pushed, tabs are not', () => {
  assert.equal(isPushed('settings'), true);
  assert.equal(isPushed('components'), true);
  for (const tab of TABS) assert.equal(isPushed(tab.id), false);
});

test('routeLabel gives screen titles', () => {
  assert.equal(routeLabel('meals'), 'Meals');
  assert.equal(routeLabel('settings'), 'Settings');
  assert.equal(routeLabel('nope'), null);
});
