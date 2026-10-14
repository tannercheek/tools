import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lbToKg,
  kgToLb,
  ftInToCm,
  cmToFtIn,
  bmr,
  ACTIVITY_MULTIPLIERS,
  tdee,
  goalAdjustment,
  TARGET_WARNINGS,
  targets,
} from '../js/calc.js';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

const MALE = { sex: 'male', age: 30, heightCm: 180, weightKg: 80 };
const FEMALE = { sex: 'female', age: 25, heightCm: 165, weightKg: 60 };

// --- Units ---

test('pounds and kilograms use the exact definition, 1 lb = 0.45359237 kg', () => {
  assertClose(lbToKg(1), 0.45359237);
  assertClose(lbToKg(100), 45.359237);
  assertClose(kgToLb(45.359237), 100);
  assertClose(kgToLb(80), 176.369809, 1e-6);
});

test('kg → lb → kg and lb → kg → lb round-trip', () => {
  for (const value of [0, 0.25, 1, 57.3, 82.6, 100, 180.5, 250]) {
    assertClose(lbToKg(kgToLb(value)), value, 1e-9, `${value}:`);
    assertClose(kgToLb(lbToKg(value)), value, 1e-9, `${value}:`);
  }
});

test('feet and inches convert to centimetres, 1 in = 2.54 cm', () => {
  assertClose(ftInToCm(5, 11), 180.34);
  assertClose(ftInToCm(6, 0), 182.88);
  assertClose(ftInToCm(0, 1), 2.54);
  assertClose(ftInToCm(5, 7.5), 171.45);
});

test('centimetres split into whole feet and unrounded leftover inches', () => {
  const { ft, inches } = cmToFtIn(180);
  assert.equal(ft, 5);
  assertClose(inches, 180 / 2.54 - 60);
});

test('cm → ft-in → cm round-trips, with leftover inches in [0, 12)', () => {
  for (const cm of [100, 150, 165.5, 172, 180, 182.88, 199.9, 213]) {
    const { ft, inches } = cmToFtIn(cm);
    assert.ok(Number.isInteger(ft), `${cm} cm: ft ${ft}`);
    assert.ok(inches >= 0 && inches < 12, `${cm} cm: inches ${inches}`);
    assertClose(ftInToCm(ft, inches), cm, 1e-9, `${cm} cm:`);
  }
});

test('ft-in → cm → ft-in round-trips for every whole inch from 3 ft 0 in to 8 ft 11 in', () => {
  for (let ft = 3; ft <= 8; ft++) {
    for (let inches = 0; inches < 12; inches++) {
      const back = cmToFtIn(ftInToCm(ft, inches));
      assert.equal(back.ft, ft, `${ft} ft ${inches} in`);
      assertClose(back.inches, inches, 1e-9, `${ft} ft ${inches} in:`);
    }
  }
});

// --- BMR ---

test('BMR, male: 10 × kg + 6.25 × cm − 5 × age + 5', () => {
  // 800 + 1125 − 150 + 5
  assertClose(bmr(MALE), 1780);
});

test('BMR, female: 10 × kg + 6.25 × cm − 5 × age − 161', () => {
  // 600 + 1031.25 − 125 − 161
  assertClose(bmr(FEMALE), 1345.25);
});

test('with the same body, female BMR is 166 kcal below male', () => {
  assertClose(bmr(MALE) - bmr({ ...MALE, sex: 'female' }), 166);
});

test('each BMR term moves by its own coefficient', () => {
  const base = bmr(MALE);
  assertClose(bmr({ ...MALE, weightKg: 81 }) - base, 10);
  assertClose(bmr({ ...MALE, heightCm: 181 }) - base, 6.25);
  assertClose(bmr({ ...MALE, age: 31 }) - base, -5);
});

test('BMR from imperial input matches the metric profile once converted', () => {
  const imperial = { sex: 'male', age: 30, heightCm: ftInToCm(5, 11), weightKg: lbToKg(180) };
  // 816.4663 + 1127.125 − 150 + 5
  assertClose(bmr(imperial), 1798.591266, 1e-6);
});

test('BMR rejects an unknown sex', () => {
  for (const sex of ['other', 'Male', '', undefined, 'toString']) {
    assert.throws(() => bmr({ ...MALE, sex }), RangeError, String(sex));
  }
});

// --- TDEE ---

test('activity levels are the five from the spec, in order', () => {
  assert.deepEqual(Object.entries(ACTIVITY_MULTIPLIERS), [
    ['sedentary', 1.2],
    ['light', 1.375],
    ['moderate', 1.55],
    ['very-active', 1.725],
    ['extreme', 1.9],
  ]);
  assert.ok(Object.isFrozen(ACTIVITY_MULTIPLIERS));
});

test('TDEE is BMR × multiplier, for every activity level and both sexes', () => {
  // Worked by hand from BMR 1780 (male) and 1345.25 (female).
  const expected = {
    male: { sedentary: 2136, light: 2447.5, moderate: 2759, 'very-active': 3070.5, extreme: 3382 },
    female: {
      sedentary: 1614.3,
      light: 1849.71875,
      moderate: 2085.1375,
      'very-active': 2320.55625,
      extreme: 2555.975,
    },
  };
  for (const profile of [MALE, FEMALE]) {
    for (const activity of Object.keys(ACTIVITY_MULTIPLIERS)) {
      assertClose(tdee(bmr(profile), activity), expected[profile.sex][activity], 1e-9, `${profile.sex} ${activity}:`);
    }
  }
});

test('TDEE rejects an unknown activity level', () => {
  for (const activity of ['very active', 'Light', '', undefined, 'toString']) {
    assert.throws(() => tdee(1780, activity), RangeError, String(activity));
  }
});

// --- Goal adjustment ---

test('goal adjustment is rate × 7700 ÷ 7: negative to lose, positive to gain', () => {
  const expected = { 0.25: 275, 0.5: 550, 0.75: 825 };
  for (const [rate, kcal] of Object.entries(expected)) {
    assertClose(goalAdjustment('lose', Number(rate)), -kcal, 1e-9, `lose ${rate}:`);
    assertClose(goalAdjustment('gain', Number(rate)), kcal, 1e-9, `gain ${rate}:`);
  }
});

test('maintain adds nothing, whatever rate is stored', () => {
  for (const rate of [0, 0.25, 0.5, 0.75]) {
    assert.equal(goalAdjustment('maintain', rate), 0);
  }
});

test('imperial rates convert from lb, so 1 lb/week is ≈ 499 kcal/day, not 500', () => {
  assertClose(goalAdjustment('lose', lbToKg(0.5)), -249.475804, 1e-6);
  assertClose(goalAdjustment('lose', lbToKg(1)), -498.951607, 1e-6);
  assertClose(goalAdjustment('gain', lbToKg(1.5)), 748.427411, 1e-6);
});

test('goal adjustment rejects an unknown goal', () => {
  for (const goal of ['cut', 'Lose', '', undefined, 'toString']) {
    assert.throws(() => goalAdjustment(goal, 0.5), RangeError, String(goal));
  }
});

// --- Targets ---

// TDEE 2759 (BMR 1780 × 1.55); default protein 144 g (1.8 × 80 kg).
const MALE_PLAN = { ...MALE, activity: 'moderate', goal: 'maintain', rateKgPerWeek: 0.5 };

function assertTargets(actual, expected, label) {
  for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
    assertClose(actual[key], expected[key], 1e-9, `${label} ${key}:`);
  }
  assert.deepEqual(actual.warnings, expected.warnings ?? [], `${label} warnings`);
}

test('default targets for lose, maintain and gain', () => {
  // Fat is 25% of calories ÷ 9; carbs are what's left ÷ 4.
  assertTargets(
    targets({ ...MALE_PLAN, goal: 'lose', rateKgPerWeek: 0.5 }),
    { kcal: 2209, protein: 144, fat: 552.25 / 9, carbs: 270.1875 },
    'lose',
  );
  assertTargets(
    targets(MALE_PLAN),
    { kcal: 2759, protein: 144, fat: 689.75 / 9, carbs: 373.3125 },
    'maintain',
  );
  assertTargets(
    targets({ ...MALE_PLAN, goal: 'gain', rateKgPerWeek: 0.25 }),
    { kcal: 3034, protein: 144, fat: 758.5 / 9, carbs: 424.875 },
    'gain',
  );
});

test('default macros add back up to the calorie target', () => {
  for (const goal of ['lose', 'maintain', 'gain']) {
    for (const profile of [MALE_PLAN, { ...FEMALE, activity: 'light', rateKgPerWeek: 0.25 }]) {
      const t = targets({ ...profile, goal });
      assertClose(t.protein * 4 + t.fat * 9 + t.carbs * 4, t.kcal, 1e-9, `${profile.sex} ${goal}:`);
    }
  }
});

test('calorie override replaces the calculated target, and fat and carbs follow it', () => {
  assertTargets(
    targets(MALE_PLAN, { kcal: 2500 }),
    { kcal: 2500, protein: 144, fat: 625 / 9, carbs: 324.75 },
    'kcal 2500',
  );
});

test('protein override leaves calories and fat alone, carbs take up the difference', () => {
  assertTargets(
    targets(MALE_PLAN, { protein: 200 }),
    { kcal: 2759, protein: 200, fat: 689.75 / 9, carbs: 317.3125 },
    'protein 200',
  );
});

test('fat override leaves calories and protein alone, carbs take up the difference', () => {
  assertTargets(
    targets(MALE_PLAN, { fat: 60 }),
    { kcal: 2759, protein: 144, fat: 60, carbs: 410.75 },
    'fat 60',
  );
});

test('carbs override changes carbs only', () => {
  assertTargets(
    targets(MALE_PLAN, { carbs: 300 }),
    { kcal: 2759, protein: 144, fat: 689.75 / 9, carbs: 300 },
    'carbs 300',
  );
});

test('a null override means calculated, but 0 is a real override', () => {
  const calculated = targets(MALE_PLAN);
  assert.deepEqual(targets(MALE_PLAN, { kcal: null, protein: null, fat: null, carbs: null }), calculated);
  assert.deepEqual(targets(MALE_PLAN, {}), calculated);
  assertTargets(
    targets(MALE_PLAN, { fat: 0 }),
    { kcal: 2759, protein: 144, fat: 0, carbs: 545.75 },
    'fat 0',
  );
});

test('warns, but keeps the target, when calculated calories fall below BMR', () => {
  // BMR 1345.25, TDEE 1614.3, minus 825 for 0.75 kg/week.
  const t = targets({ ...FEMALE, activity: 'sedentary', goal: 'lose', rateKgPerWeek: 0.75 });
  assertClose(t.kcal, 789.3);
  assert.deepEqual(t.warnings, [TARGET_WARNINGS.BELOW_BMR]);
});

test('warns when a calorie override is below BMR, but not at BMR exactly', () => {
  assert.deepEqual(targets(MALE_PLAN, { kcal: 1500 }).warnings, [TARGET_WARNINGS.BELOW_BMR]);
  assert.deepEqual(targets(MALE_PLAN, { kcal: 1780 }).warnings, []);
});

test('clamps carbs to 0 and warns when protein and fat use up the calories', () => {
  // 600 g protein = 2400 kcal, plus 689.75 kcal fat, is more than 2759.
  const t = targets(MALE_PLAN, { protein: 600 });
  assert.equal(t.carbs, 0);
  assert.equal(t.kcal, 2759);
  assert.deepEqual(t.warnings, [TARGET_WARNINGS.CARBS_CLAMPED]);
});

test('both warnings together', () => {
  // 700 kcal: 576 protein + 175 fat leaves −51 kcal for carbs.
  const t = targets(MALE_PLAN, { kcal: 700 });
  assert.equal(t.carbs, 0);
  assert.deepEqual(t.warnings, [TARGET_WARNINGS.BELOW_BMR, TARGET_WARNINGS.CARBS_CLAMPED]);
});

test('a carbs override is never clamped or warned about', () => {
  const t = targets(MALE_PLAN, { protein: 600, carbs: 50 });
  assert.equal(t.carbs, 50);
  assert.deepEqual(t.warnings, []);
});

test('targets reject an unknown goal or activity', () => {
  assert.throws(() => targets({ ...MALE_PLAN, goal: 'cut' }), RangeError);
  assert.throws(() => targets({ ...MALE_PLAN, activity: 'very active' }), RangeError);
});
