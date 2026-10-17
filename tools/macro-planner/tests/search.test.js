import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchFoods } from '../js/search.js';

// Search only reads name, custom and archived, so the fixtures leave out the numbers.
function food(id, name, { custom = false, archived = false } = {}) {
  return { id, name, custom, archived };
}

const BUNDLED = [
  food('usda-1', 'Chicken breast, skinless, raw'),
  food('usda-2', 'Chicken breast, skinless, roasted'),
  food('usda-3', 'Chicken thigh, skinless, raw'),
  food('usda-4', 'Beef, ground, 90% lean, raw'),
  food('usda-5', 'Rice, white, dry'),
  food('usda-6', 'Rice, white, cooked'),
  food('usda-7', 'Rice, brown, cooked'),
  food('usda-8', 'Milk, 2%'),
];

const CUSTOM = [
  food('custom-a', 'Chicken breast, grilled', { custom: true }),
  food('custom-b', 'Rice cakes', { custom: true }),
  food('custom-c', 'Chicken wrap', { custom: true, archived: true }),
];

// Bundled first in the input, so ranking custom first has to come from the search.
const ALL = [...BUNDLED, ...CUSTOM];

function ids(foods) {
  return foods.map(({ id }) => id);
}

// --- Matching ---

test('partial words match the start of words in the name', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, 'chick bre')), ['usda-1', 'usda-2']);
  assert.deepEqual(ids(searchFoods(BUNDLED, 'chick')), ['usda-1', 'usda-2', 'usda-3']);
});

test('query words can come in any order', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, 'bre chick')), ['usda-1', 'usda-2']);
  assert.deepEqual(ids(searchFoods(BUNDLED, 'raw chicken')), ['usda-1', 'usda-3']);
});

test('every query word has to match', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, 'chick bre raw')), ['usda-1']);
  assert.deepEqual(searchFoods(BUNDLED, 'chick rice'), []);
});

test('matching is case-insensitive', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, 'CHICK Bre')), ['usda-1', 'usda-2']);
  assert.deepEqual(ids(searchFoods([food('x', 'BROWN RICE')], 'brown rice')), ['x']);
});

test('a query matches the start of a word, not the middle', () => {
  assert.deepEqual(searchFoods(BUNDLED, 'hicken'), []);
  assert.deepEqual(searchFoods(BUNDLED, 'east'), []);
  assert.deepEqual(searchFoods(BUNDLED, 'ice'), []);
});

test('punctuation separates words in names and is ignored in the query', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, '90')), ['usda-4']);
  assert.deepEqual(ids(searchFoods(BUNDLED, '90% lean')), ['usda-4']);
  assert.deepEqual(ids(searchFoods(BUNDLED, 'milk 2%')), ['usda-8']);
  assert.deepEqual(ids(searchFoods(BUNDLED, 'rice, white')), ['usda-5', 'usda-6']);
});

test('extra spaces in the query are ignored', () => {
  assert.deepEqual(ids(searchFoods(BUNDLED, '  chick   bre  ')), ['usda-1', 'usda-2']);
});

test('no match gives an empty list', () => {
  assert.deepEqual(searchFoods(ALL, 'salmon'), []);
  assert.deepEqual(searchFoods([], 'rice'), []);
});

// --- Ranking ---

test('custom foods rank first', () => {
  assert.deepEqual(ids(searchFoods(ALL, 'chick bre')), ['custom-a', 'usda-1', 'usda-2']);
  assert.deepEqual(ids(searchFoods(ALL, 'rice')), ['custom-b', 'usda-5', 'usda-6', 'usda-7']);
});

test('custom foods rank first wherever they are in the input', () => {
  assert.deepEqual(ids(searchFoods([...CUSTOM, ...BUNDLED], 'rice')), ids(searchFoods(ALL, 'rice')));
});

test('within custom and bundled foods, the input order is kept', () => {
  const reversed = [...ALL].reverse();
  assert.deepEqual(ids(searchFoods(reversed, 'rice')), ['custom-b', 'usda-7', 'usda-6', 'usda-5']);
  const twoCustom = [food('c1', 'Rice pudding', { custom: true }), ...ALL];
  assert.deepEqual(ids(searchFoods(twoCustom, 'rice')), ['c1', 'custom-b', 'usda-5', 'usda-6', 'usda-7']);
});

// --- Archived ---

test('archived foods are left out, even on an exact name match', () => {
  assert.deepEqual(searchFoods(ALL, 'chicken wrap'), []);
  assert.deepEqual(ids(searchFoods(ALL, 'chick')), ['custom-a', 'usda-1', 'usda-2', 'usda-3']);
});

test('an archived bundled food is left out too', () => {
  const foods = [food('usda-9', 'Rice, wild, cooked', { archived: true }), ...BUNDLED];
  assert.deepEqual(ids(searchFoods(foods, 'rice')), ['usda-5', 'usda-6', 'usda-7']);
});

// --- Empty query ---

test('an empty query lists every food that isn’t archived, custom first', () => {
  const expected = ['custom-a', 'custom-b', ...ids(BUNDLED)];
  assert.deepEqual(ids(searchFoods(ALL, '')), expected);
  assert.deepEqual(ids(searchFoods(ALL, '   ')), expected);
});

test('search returns a new list and leaves the input alone', () => {
  const input = [...ALL];
  const results = searchFoods(input, '');
  assert.notEqual(results, input);
  assert.deepEqual(input, ALL);
});

// --- Bundled data ---

test('"chick bre" finds both chicken breasts in foods.json and no thighs', () => {
  const bundled = JSON.parse(readFileSync(new URL('../data/foods.json', import.meta.url), 'utf8'));
  const found = ids(searchFoods(bundled, 'chick bre'));
  assert.ok(found.includes('usda-2646170'), 'Chicken breast, skinless, raw');
  assert.ok(found.includes('usda-171477'), 'Chicken breast, skinless, roasted');
  assert.ok(!found.includes('usda-2646171'), 'Chicken thigh, skinless, raw');
  assert.ok(!found.includes('usda-172388'), 'Chicken thigh, skinless, roasted');
});
