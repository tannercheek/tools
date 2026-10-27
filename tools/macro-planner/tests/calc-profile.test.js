import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, profileAge, profileTargets, targets } from '../js/calc.js';

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

// --- Birthday (SPEC §3.1) ---

const BIRTHDAY_PROFILE = { ...PROFILE, age: undefined, birthDate: '1990-04-12' };

test('the age goes up on the birthday, not the day before', () => {
  assert.equal(ageOn('1990-04-12', '2026-04-11'), 35);
  assert.equal(ageOn('1990-04-12', '2026-04-12'), 36);
  assert.equal(ageOn('1990-04-12', '2026-04-13'), 36);
  assert.equal(ageOn('1990-04-12', '2026-12-31'), 36);
  assert.equal(ageOn('1990-04-12', '2027-01-01'), 36);
});

test('a 29 February birthday counts from 1 March in a year without one', () => {
  assert.equal(ageOn('2000-02-29', '2025-02-28'), 24);
  assert.equal(ageOn('2000-02-29', '2025-03-01'), 25);
  assert.equal(ageOn('2000-02-29', '2028-02-28'), 27);
  assert.equal(ageOn('2000-02-29', '2028-02-29'), 28);
});

test('the targets use the birthday’s age on today', () => {
  const before = profileTargets(BIRTHDAY_PROFILE, WEIGHT_KG, {}, undefined, '2026-04-11');
  const on = profileTargets(BIRTHDAY_PROFILE, WEIGHT_KG, {}, undefined, '2026-04-12');
  assert.deepEqual(before, targets({ ...PROFILE, age: 35, weightKg: WEIGHT_KG }));
  assert.deepEqual(on, targets({ ...PROFILE, age: 36, weightKg: WEIGHT_KG }));
  // A year older is 5 kcal less BMR, times the activity multiplier.
  assert.ok(Math.abs(before.kcal - on.kcal - 5 * 1.55) < 1e-9);
});

test('a profile with only a stored age keeps its targets, whatever today is', () => {
  const expected = targets({ ...PROFILE, weightKg: WEIGHT_KG });
  assert.deepEqual(profileTargets(PROFILE, WEIGHT_KG, {}, undefined, '2026-10-25'), expected);
  assert.deepEqual(profileTargets(PROFILE, WEIGHT_KG, {}, undefined, '2030-01-01'), expected);
  assert.equal(profileAge(PROFILE, '2026-10-25'), 30);
});

test('a birthday takes over from a stored age once it’s entered', () => {
  const both = { ...PROFILE, birthDate: '1990-04-12' };
  assert.equal(profileAge(both, '2026-10-25'), 36);
  assert.deepEqual(
    profileTargets(both, WEIGHT_KG, {}, undefined, '2026-10-25'),
    targets({ ...PROFILE, age: 36, weightKg: WEIGHT_KG }),
  );
});

test('no targets with neither a birthday nor a stored age', () => {
  const neither = { ...PROFILE, age: null, birthDate: null };
  assert.equal(profileAge(neither, '2026-10-25'), null);
  assert.equal(profileTargets(neither, WEIGHT_KG, { kcal: 2500 }, undefined, '2026-10-25'), null);
});
