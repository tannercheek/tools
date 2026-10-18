import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TABS,
  SEGMENTS,
  DEFAULT_ROUTE,
  backRoute,
  hashFor,
  mealRoute,
  parseRoute,
  isPushed,
  routeLabel,
  routeParam,
  tabFor,
} from '../js/routes.js';

const MEAL_ID = '6f1c2a9e-3b4d-4c5e-8f60-718293a4b5c6';

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

// --- Meal screens: #/meal/<id> ---

test('parseRoute reads a meal screen with its id, and mealRoute builds one', () => {
  assert.equal(parseRoute(hashFor(mealRoute(MEAL_ID))), `meal/${MEAL_ID}`);
  assert.equal(routeParam(parseRoute(`#/meal/${MEAL_ID}`)), MEAL_ID);
});

test('parseRoute rejects a meal screen without an id, and an id where none belongs', () => {
  const hashes = ['#/meal', '#/meal/', `#/meal/${MEAL_ID}/`, '#/meal/a/b', '#/meal/ABC', '#/meal/a b'];
  hashes.push(`#/settings/${MEAL_ID}`, `#/today/${MEAL_ID}`, `#/foods/${MEAL_ID}`, `#/nope/${MEAL_ID}`);
  for (const hash of hashes) assert.equal(parseRoute(hash), null, hash);
});

test('a meal screen is pushed, has its own view and is titled Meal', () => {
  const route = mealRoute(MEAL_ID);
  assert.equal(isPushed(route), true);
  assert.equal(tabFor(route), 'meal');
  assert.equal(routeLabel(route), 'Meal');
  assert.equal(TABS.some((tab) => tab.id === 'meal'), false);
});

test('a route without an id has no param', () => {
  for (const id of ['today', 'meals', 'foods', 'settings']) assert.equal(routeParam(id), null);
});

test('Back with nothing to pop goes from a meal screen to Meals, and from the rest to Today', () => {
  assert.equal(backRoute(mealRoute(MEAL_ID)), 'meals');
  assert.equal(backRoute('settings'), DEFAULT_ROUTE);
  assert.equal(backRoute('components'), DEFAULT_ROUTE);
});
