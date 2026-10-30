import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoriesInUse, filterFoods } from '../js/categories.js';

function food(id, category) {
  return { id, category };
}

test('null is All: every food matches, with or without a category', () => {
  const foods = [food('a', 'Produce'), food('b', 'Meat & fish'), food('c', undefined)];
  assert.deepEqual(filterFoods(foods, null), foods);
});

test('a category filters to the foods in it, leaving out a food without one', () => {
  const foods = [food('a', 'Produce'), food('b', 'Meat & fish'), food('c', undefined)];
  assert.deepEqual(filterFoods(foods, 'Produce'), [food('a', 'Produce')]);
});

test('categoriesInUse lists only the categories present, in store order', () => {
  const foods = [food('a', 'Supplements'), food('b', 'Produce'), food('c', undefined), food('d', 'Produce')];
  assert.deepEqual(categoriesInUse(foods), ['Produce', 'Supplements']);
});

test('categoriesInUse is empty when no food has a category', () => {
  assert.deepEqual(categoriesInUse([food('a', undefined)]), []);
});

test('CATEGORIES is the supermarket walk from SPEC §3.2', () => {
  assert.deepEqual(CATEGORIES, [
    'Produce',
    'Meat & fish',
    'Dairy & eggs',
    'Tofu & plant protein',
    'Bakery',
    'Grains & pasta',
    'Beans & legumes',
    'Nuts & seeds',
    'Oils & condiments',
    'Snacks & sweets',
    'Supplements',
  ]);
});
