import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileTargets, targets } from '../js/calc.js';

// Every field targets need. Weight isn't in the profile: it comes from the weight log.
const PROFILE = { sex: 'male', age: 30, heightCm: 180, activity: 'moderate', goal: 'lose', rateKgPerWeek: 0.5 };
const WEIGHT_KG = 80;

// A first run's profile (data.js's createCoreDoc).
const EMPTY_PROFILE = { sex: null, age: null, heightCm: null, activity: null, goal: null, rateKgPerWeek: null };

test('a complete profile gives the targets for it at the current weight', () => {
  assert.deepEqual(profileTargets(PROFILE, WEIGHT_KG), targets({ ...PROFILE, weightKg: WEIGHT_KG }));
});

test('overrides apply once the profile is complete', () => {
  const overrides = { kcal: 2500, protein: null, fat: 60, carbs: null };
  assert.deepEqual(
    profileTargets(PROFILE, WEIGHT_KG, overrides),
    targets({ ...PROFILE, weightKg: WEIGHT_KG }, overrides),
  );
});

test('no targets with any one profile field missing', () => {
  for (const key of Object.keys(PROFILE)) {
    assert.equal(profileTargets({ ...PROFILE, [key]: null }, WEIGHT_KG), null, key);
  }
});

test('a field that isn’t there at all counts as missing', () => {
  for (const key of Object.keys(PROFILE)) {
    const { [key]: _left, ...rest } = PROFILE;
    assert.equal(profileTargets(rest, WEIGHT_KG), null, key);
  }
});

test('no targets before the first weigh-in', () => {
  assert.equal(profileTargets(PROFILE, null), null);
  assert.equal(profileTargets(PROFILE, undefined), null);
});

test('maintain needs no rate', () => {
  const maintain = { ...PROFILE, goal: 'maintain', rateKgPerWeek: null };
  const result = profileTargets(maintain, WEIGHT_KG);
  assert.notEqual(result, null);
  assert.deepEqual(result, targets({ ...maintain, weightKg: WEIGHT_KG }));
  // A rate left over from another goal changes nothing.
  assert.deepEqual(profileTargets({ ...maintain, rateKgPerWeek: 0.75 }, WEIGHT_KG), result);
});

test('lose and gain both need a rate', () => {
  for (const goal of ['lose', 'gain']) {
    assert.equal(profileTargets({ ...PROFILE, goal, rateKgPerWeek: null }, WEIGHT_KG), null, goal);
  }
});

test('a first-run profile has no targets, even with every target overridden', () => {
  const overrides = { kcal: 2500, protein: 180, fat: 70, carbs: 250 };
  assert.equal(profileTargets(EMPTY_PROFILE, null), null);
  assert.equal(profileTargets(EMPTY_PROFILE, WEIGHT_KG, overrides), null);
  assert.equal(profileTargets({ ...PROFILE, age: null }, WEIGHT_KG, overrides), null);
});

test('targets appear once the last missing field is filled', () => {
  let profile = { ...EMPTY_PROFILE };
  for (const key of Object.keys(PROFILE)) {
    assert.equal(profileTargets(profile, WEIGHT_KG), null, `before ${key}`);
    profile = { ...profile, [key]: PROFILE[key] };
  }
  assert.notEqual(profileTargets(profile, WEIGHT_KG), null);
});
