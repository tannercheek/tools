import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TARGET_WARNINGS, profileTargets, splitFromTargets, targets, validSplit } from '../js/calc.js';
import { createCoreDoc } from '../js/data.js';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function assertTargets(actual, expected, label) {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assertClose(actual[key], expected[key], 1e-9, `${label} ${key}:`);
  }
  assert.deepEqual(actual.warnings, expected.warnings ?? [], `${label} warnings`);
}

// BMR 1500 (10 × 70 + 6.25 × 160 − 5 × 41 + 5), TDEE 2325, plus 275 for 0.25 kg/week: 2,600 kcal.
const PLAN_2600 = { sex: 'male', age: 41, heightCm: 160, weightKg: 70, activity: 'moderate', goal: 'gain', rateKgPerWeek: 0.25 };
const SPLIT = { by: 'percent', percent: { protein: 30, fat: 25, carbs: 45 } };

// TDEE 2759 (BMR 1780 × 1.55); default protein 144 g (1.8 × 80 kg). As in calc.test.js.
const MALE_PLAN = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain', rateKgPerWeek: 0.5 };
const MALE_PLAN_BODYWEIGHT = { kcal: 2759, protein: 144, fat: 689.75 / 9, carbs: 373.3125 };

// --- Targets by percent ---

test('30 / 25 / 45 at 2,600 kcal gives 195 g protein, 72.2 g fat and 292.5 g carbs', () => {
  const t = targets(PLAN_2600, {}, SPLIT);
  assertTargets(t, { kcal: 2600, protein: 195, fat: 650 / 9, carbs: 292.5 }, '30/25/45');
  assert.equal(t.fat.toFixed(1), '72.2');
});

test('by percent, protein is its share of the calories, not worked out from bodyweight', () => {
  // The same 2,600 kcal at 70 and 90 kg: by bodyweight 126 g and 162 g, by percent 195 g both.
  assertClose(targets({ ...PLAN_2600, weightKg: 90 }, { kcal: 2600 }).protein, 162);
  for (const weightKg of [70, 90]) {
    assertClose(targets({ ...PLAN_2600, weightKg }, { kcal: 2600 }, SPLIT).protein, 195, 1e-9, `${weightKg} kg`);
  }
});

test('each macro’s override on its own leaves the other two at their percents', () => {
  assertTargets(
    targets(PLAN_2600, { protein: 200 }, SPLIT),
    { kcal: 2600, protein: 200, fat: 650 / 9, carbs: 292.5 },
    'protein 200',
  );
  assertTargets(
    targets(PLAN_2600, { fat: 60 }, SPLIT),
    { kcal: 2600, protein: 195, fat: 60, carbs: 292.5 },
    'fat 60',
  );
  assertTargets(
    targets(PLAN_2600, { carbs: 250 }, SPLIT),
    { kcal: 2600, protein: 195, fat: 650 / 9, carbs: 250 },
    'carbs 250',
  );
});

test('a 0 override is a real one by percent too', () => {
  assertTargets(
    targets(PLAN_2600, { fat: 0 }, SPLIT),
    { kcal: 2600, protein: 195, fat: 0, carbs: 292.5 },
    'fat 0',
  );
});

test('a calorie override moves all three macros by percent', () => {
  assertTargets(
    targets(PLAN_2600, { kcal: 2000 }, SPLIT),
    { kcal: 2000, protein: 150, fat: 500 / 9, carbs: 225 },
    'kcal 2000',
  );
});

test('a calorie override doesn’t move a macro that’s overridden itself', () => {
  assertTargets(
    targets(PLAN_2600, { kcal: 2000, protein: 180 }, SPLIT),
    { kcal: 2000, protein: 180, fat: 500 / 9, carbs: 225 },
    'kcal 2000, protein 180',
  );
});

// --- Warnings ---

test('by percent, carbs are never clamped or warned about', () => {
  // 600 g protein is 2,400 kcal: by bodyweight that leaves no room for carbs.
  assert.deepEqual(targets(PLAN_2600, { protein: 600 }).warnings, [TARGET_WARNINGS.CARBS_CLAMPED]);
  const t = targets(PLAN_2600, { protein: 600 }, SPLIT);
  assertClose(t.carbs, 292.5);
  assert.deepEqual(t.warnings, []);

  const noCarbs = targets(PLAN_2600, {}, { by: 'percent', percent: { protein: 50, fat: 50, carbs: 0 } });
  assert.equal(noCarbs.carbs, 0);
  assert.deepEqual(noCarbs.warnings, []);
});

test('calories below BMR warn in both modes, but not at BMR exactly', () => {
  for (const split of [undefined, SPLIT]) {
    const label = split ? 'percent' : 'bodyweight';
    assert.deepEqual(targets(PLAN_2600, { kcal: 1400 }, split).warnings, [TARGET_WARNINGS.BELOW_BMR], label);
    assert.deepEqual(targets(PLAN_2600, { kcal: 1500 }, split).warnings, [], label);
  }
  // Calculated calories too: BMR 1345.25, TDEE 1614.3, minus 825 for 0.75 kg/week.
  const female = { sex: 'female', age: 25, heightCm: 165, weightKg: 60, activity: 'sedentary', goal: 'lose', rateKgPerWeek: 0.75 };
  assert.deepEqual(targets(female, {}, SPLIT).warnings, [TARGET_WARNINGS.BELOW_BMR]);
});

// --- Without a split, or by bodyweight ---

test('a doc without macroSplit gives the same targets as before', () => {
  assertTargets(targets(MALE_PLAN), MALE_PLAN_BODYWEIGHT, 'no split');
  assertTargets(targets(MALE_PLAN, {}, undefined), MALE_PLAN_BODYWEIGHT, 'undefined');
  assertTargets(targets(MALE_PLAN, {}, null), MALE_PLAN_BODYWEIGHT, 'null');

  const { weightKg, ...profile } = MALE_PLAN;
  const doc = { ...createCoreDoc('2026-10-23'), profile };
  assert.equal(doc.macroSplit, undefined);
  assertTargets(profileTargets(doc.profile, weightKg, doc.overrides, doc.macroSplit), MALE_PLAN_BODYWEIGHT, 'first-run doc');
});

test('by bodyweight, the percents kept for next time change nothing', () => {
  const kept = { by: 'bodyweight', percent: { protein: 30, fat: 25, carbs: 45 } };
  assertTargets(targets(MALE_PLAN, {}, kept), MALE_PLAN_BODYWEIGHT, 'bodyweight');
  assert.deepEqual(targets(MALE_PLAN, { protein: 600 }, kept), targets(MALE_PLAN, { protein: 600 }));
});

test('profileTargets passes the split through, and still needs a complete profile', () => {
  const { weightKg, ...profile } = PLAN_2600;
  assert.deepEqual(profileTargets(profile, weightKg, {}, SPLIT), targets(PLAN_2600, {}, SPLIT));
  assert.equal(profileTargets({ ...profile, age: null }, weightKg, {}, SPLIT), null);
  assert.equal(profileTargets(profile, null, { kcal: 2600 }, SPLIT), null);
});

// --- validSplit ---

test('a split of whole numbers from 0 to 100 adding up to 100 is valid', () => {
  for (const percent of [
    { protein: 30, fat: 25, carbs: 45 },
    { protein: 100, fat: 0, carbs: 0 },
    { protein: 0, fat: 0, carbs: 100 },
    { protein: 34, fat: 33, carbs: 33 },
  ]) {
    assert.equal(validSplit(percent), true, JSON.stringify(percent));
  }
});

test('a split adding up to 99 or 101, or with a fraction, is invalid', () => {
  for (const percent of [
    { protein: 30, fat: 25, carbs: 44 },
    { protein: 30, fat: 25, carbs: 46 },
    { protein: 30.5, fat: 25, carbs: 44.5 },
    { protein: 30, fat: 25.25, carbs: 44.75 },
  ]) {
    assert.equal(validSplit(percent), false, JSON.stringify(percent));
  }
});

test('a split with a negative, a missing macro or text in it is invalid', () => {
  for (const percent of [
    { protein: -5, fat: 55, carbs: 50 },
    { protein: 110, fat: -10, carbs: 0 },
    { protein: 30, fat: 70 },
    { protein: '30', fat: 25, carbs: 45 },
    { protein: NaN, fat: 50, carbs: 50 },
    { protein: null, fat: 50, carbs: 50 },
    {},
    null,
    undefined,
  ]) {
    assert.equal(validSplit(percent), false, JSON.stringify(percent));
  }
});

// --- splitFromTargets ---

test('splitFromTargets gives back a split’s own percents', () => {
  assert.deepEqual(splitFromTargets(targets(PLAN_2600, {}, SPLIT)), SPLIT.percent);
  assert.deepEqual(splitFromTargets(targets(PLAN_2600, { kcal: 1750 }, SPLIT)), SPLIT.percent);
});

test('splitFromTargets adds up to 100 when rounding each share would give 99', () => {
  // 30.4% / 25.4% / 44.2% of 1,800 kcal: rounded alone, 30 + 25 + 44 = 99.
  const split = splitFromTargets({ kcal: 1800, protein: 136.8, fat: 50.8, carbs: 198.9 });
  assert.deepEqual(split, { protein: 30, fat: 25, carbs: 45 });
  assert.equal(validSplit(split), true);
});

test('splitFromTargets adds up to 100 when rounding each share would give 101', () => {
  // 30.5% / 25.5% / 44% of 1,800 kcal: rounded alone, 31 + 26 + 44 = 101.
  const split = splitFromTargets({ kcal: 1800, protein: 137.25, fat: 51, carbs: 198 });
  assert.deepEqual(split, { protein: 31, fat: 26, carbs: 43 });
  assert.equal(validSplit(split), true);
});

test('splitFromTargets adds up to 100 for bodyweight targets, and the targets barely move', () => {
  const profiles = [MALE_PLAN, { sex: 'female', age: 25, heightCm: 165, weightKg: 60, activity: 'light', rateKgPerWeek: 0.25 }];
  for (const profile of profiles) {
    for (const goal of ['lose', 'maintain', 'gain']) {
      for (const overrides of [{}, { kcal: 2333 }, { protein: 171 }, { fat: 77 }]) {
        const label = `${profile.sex} ${goal} ${JSON.stringify(overrides)}`;
        const before = targets({ ...profile, goal }, overrides);
        const split = splitFromTargets(before);
        assert.equal(validSplit(split), true, label);
        // Whole percents move protein and fat by at most half a percent of the calories each,
        // and carbs, taking up both, by at most one.
        const after = targets({ ...profile, goal }, overrides, { by: 'percent', percent: split });
        assert.equal(after.kcal, before.kcal, label);
        assert.ok(Math.abs(after.protein - before.protein) * 4 <= 0.005 * before.kcal + 1e-9, `${label} protein`);
        assert.ok(Math.abs(after.fat - before.fat) * 9 <= 0.005 * before.kcal + 1e-9, `${label} fat`);
        assert.ok(Math.abs(after.carbs - before.carbs) * 4 <= 0.01 * before.kcal + 1e-9, `${label} carbs`);
      }
    }
  }
});

test('splitFromTargets for the 2,759 kcal maintain plan is 21 / 25 / 54', () => {
  // 576 kcal of protein is 20.9%, fat is 25% exactly, and carbs take the rest.
  assert.deepEqual(splitFromTargets(targets(MALE_PLAN)), { protein: 21, fat: 25, carbs: 54 });
});

test('splitFromTargets still adds up to 100 when protein and fat pass the calories', () => {
  // 600 g protein is 87% of 2,759 kcal, and fat another 25%, so carbs were clamped to 0.
  const clamped = targets(MALE_PLAN, { protein: 600 });
  assert.deepEqual(clamped.warnings, [TARGET_WARNINGS.CARBS_CLAMPED]);
  assert.deepEqual(splitFromTargets(clamped), { protein: 87, fat: 13, carbs: 0 });
  // Protein alone past the calories.
  assert.deepEqual(splitFromTargets(targets(MALE_PLAN, { protein: 800 })), { protein: 100, fat: 0, carbs: 0 });
});
