import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ftInToCm, goalAdjustment, lbToKg, profileTargets, targets } from '../js/calc.js';
import { createCoreDoc } from '../js/data.js';
import {
  ageText,
  heightCmText,
  heightFtInText,
  rateOption,
  rateOptions,
  readAmount,
  readBirthDate,
  readHeightFtIn,
  readHeightPart,
  readPercent,
  readSplit,
  readTarget,
  readWeight,
  setOverride,
  setProfileField,
  setSplitBodyweight,
  setSplitPercent,
  setUnits,
  splitBy,
  startingSplit,
  targetText,
  weightText,
} from '../js/profile.js';

function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

// --- Goal rate ---

test('rate options are 0.25 / 0.5 / 0.75 kg and 0.5 / 1 / 1.5 lb a week, stored in kg', () => {
  assert.deepEqual(rateOptions('metric'), [
    { amount: 0.25, kg: 0.25 },
    { amount: 0.5, kg: 0.5 },
    { amount: 0.75, kg: 0.75 },
  ]);
  assert.deepEqual(
    rateOptions('imperial').map(({ amount }) => amount),
    [0.5, 1, 1.5],
  );
  rateOptions('imperial').forEach(({ amount, kg }) => assertClose(kg, lbToKg(amount)));
});

test('a stored rate shows as its own option', () => {
  for (const units of ['metric', 'imperial']) {
    for (const option of rateOptions(units)) assert.deepEqual(rateOption(option.kg, units), option);
  }
});

test('in the other system, a rate shows as its match: 0.5 lb ↔ 0.25 kg, 1 lb ↔ 0.5 kg, 1.5 lb ↔ 0.75 kg', () => {
  const pairs = [
    [0.25, 0.5],
    [0.5, 1],
    [0.75, 1.5],
  ];
  for (const [kg, lb] of pairs) {
    assert.equal(rateOption(kg, 'imperial').amount, lb, `${kg} kg`);
    assert.equal(rateOption(lbToKg(lb), 'metric').amount, kg, `${lb} lb`);
  }
});

test('no rate shows as no option', () => {
  assert.equal(rateOption(null, 'metric'), null);
  assert.equal(rateOption(undefined, 'imperial'), null);
});

// --- Core doc changes ---

test('setUnits records the units and snaps the rate, leaving the doc passed in alone', () => {
  const doc = setProfileField(createCoreDoc('2026-10-18'), 'rateKgPerWeek', 0.5);
  const imperial = setUnits(doc, 'imperial');
  assert.equal(imperial.settings.units, 'imperial');
  assertClose(imperial.profile.rateKgPerWeek, lbToKg(1));
  assert.equal(doc.settings.units, 'metric');
  assert.equal(doc.profile.rateKgPerWeek, 0.5);
  // And back again, exactly.
  assert.equal(setUnits(imperial, 'metric').profile.rateKgPerWeek, 0.5);
});

test('snapping the rate moves the calorie target by 25–77 kcal/day', () => {
  const moves = rateOptions('metric').map(({ kg }) => {
    const snapped = rateOption(kg, 'imperial').kg;
    return Math.abs(goalAdjustment('lose', kg) - goalAdjustment('lose', snapped));
  });
  assert.ok(moves.every((move) => move >= 25 && move <= 77), moves.join(', '));
});

test('setUnits with no rate yet keeps none', () => {
  const doc = createCoreDoc('2026-10-18');
  assert.equal(setUnits(doc, 'imperial').profile.rateKgPerWeek, null);
});

test('setUnits keeps the doc’s other settings and profile fields', () => {
  const doc = { ...setProfileField(createCoreDoc('2026-10-18'), 'birthDate', '1990-04-12'), settings: { units: 'metric', other: 1 } };
  const next = setUnits(doc, 'imperial');
  assert.deepEqual(next.settings, { units: 'imperial', other: 1 });
  assert.equal(next.profile.birthDate, '1990-04-12');
  assert.equal(next.meals, doc.meals);
});

test('setProfileField changes one field and leaves the doc passed in alone', () => {
  const doc = createCoreDoc('2026-10-18');
  const next = setProfileField(doc, 'sex', 'female');
  assert.equal(next.profile.sex, 'female');
  assert.equal(next.profile.birthDate, null);
  assert.equal(doc.profile.sex, null);
  assert.equal(next.foods, doc.foods);
});

test('setOverride sets one target, and null resets it to calculated', () => {
  const doc = createCoreDoc('2026-10-18');
  const overridden = setOverride(doc, 'protein', 180);
  assert.deepEqual(overridden.overrides, { kcal: null, protein: 180, fat: null, carbs: null });
  assert.deepEqual(doc.overrides, { kcal: null, protein: null, fat: null, carbs: null });
  assert.deepEqual(setOverride(overridden, 'protein', null).overrides, doc.overrides);
});

// --- Weight ---

test('weight shows to one decimal, in kg or lb', () => {
  assert.equal(weightText(82.43, 'metric'), '82.4');
  assert.equal(weightText(82, 'metric'), '82.0');
  assert.equal(weightText(80, 'imperial'), '176.4');
});

test('180 lb entered shows 180.0 lb again, never 179.9', () => {
  for (const lb of [100, 150.5, 180, 199.9, 250]) {
    assert.equal(weightText(readWeight(String(lb), 'imperial'), 'imperial'), lb.toFixed(1));
  }
});

test('no weight yet shows as an empty field', () => {
  assert.equal(weightText(null, 'metric'), '');
  assert.equal(weightText(undefined, 'imperial'), '');
});

test('a typed weight is kept in kg, converted from lb', () => {
  assert.equal(readWeight('82.4', 'metric'), 82.4);
  assertClose(readWeight('180', 'imperial'), lbToKg(180));
});

test('a weight must be an amount above 0', () => {
  for (const text of ['', '  ', '0', '-80', '82,4', 'abc']) {
    assert.equal(readWeight(text, 'metric'), null, JSON.stringify(text));
  }
});

// --- Height ---

test('height shows as whole cm', () => {
  assert.equal(heightCmText(180), '180');
  assert.equal(heightCmText(180.34), '180');
  assert.equal(heightCmText(177.5), '178');
  assert.equal(heightCmText(null), '');
});

test('height shows as feet and whole inches, rounded before splitting', () => {
  assert.deepEqual(heightFtInText(180), { ft: '5', inches: '11' });
  assert.deepEqual(heightFtInText(182), { ft: '6', inches: '0' });
  assert.deepEqual(heightFtInText(152.4), { ft: '5', inches: '0' });
  assert.deepEqual(heightFtInText(null), { ft: '', inches: '' });
});

test('every whole inch from 4 ft 0 in to 7 ft 11 in reads back as itself', () => {
  for (let ft = 4; ft <= 7; ft++) {
    for (let inches = 0; inches < 12; inches++) {
      const cm = readHeightFtIn(String(ft), String(inches));
      assertClose(cm, ftInToCm(ft, inches));
      assert.deepEqual(heightFtInText(cm), { ft: String(ft), inches: String(inches) });
    }
  }
});

test('each part of a height reads as a number, a blank one as 0', () => {
  assert.equal(readHeightPart('5'), 5);
  assert.equal(readHeightPart(' 10.5 '), 10.5);
  assert.equal(readHeightPart(''), 0);
  assert.equal(readHeightPart('  '), 0);
  for (const text of ['x', '-1', '5 ft']) assert.equal(readHeightPart(text), null, JSON.stringify(text));
});

test('a blank part of a height counts as 0', () => {
  assertClose(readHeightFtIn('6', ''), ftInToCm(6, 0));
  assertClose(readHeightFtIn('', '70'), ftInToCm(0, 70));
});

test('a height needs both parts to be numbers, and to come to something', () => {
  for (const [ft, inches] of [
    ['', ''],
    ['0', '0'],
    ['5', 'abc'],
    ['five', '10'],
    ['-5', '10'],
  ]) {
    assert.equal(readHeightFtIn(ft, inches), null, `${ft} ft ${inches} in`);
  }
});

test('heights in cm must be amounts above 0', () => {
  assert.equal(readAmount('30'), 30);
  assert.equal(readAmount(' 178.5 '), 178.5);
  for (const text of ['', '0', '-1', '30 years', 'abc']) assert.equal(readAmount(text), null, JSON.stringify(text));
});

test('a birthday must be a date, today or earlier', () => {
  assert.equal(readBirthDate('1990-04-12', '2026-10-25'), '1990-04-12');
  assert.equal(readBirthDate('2026-10-25', '2026-10-25'), '2026-10-25');
  for (const text of ['', '2026-10-26', '12/04/1990', '1990-4-12', null, undefined]) {
    assert.equal(readBirthDate(text, '2026-10-25'), null, JSON.stringify(text));
  }
});

test('the age under the birthday reads as years old', () => {
  assert.equal(ageText(35), '35 years old');
  assert.equal(ageText(1), '1 year old');
});

// --- Targets ---

test('a calorie target must be above 0, but a macro target can be 0', () => {
  assert.equal(readTarget('kcal', '2500'), 2500);
  assert.equal(readTarget('kcal', '0'), null);
  for (const key of ['protein', 'fat', 'carbs']) {
    assert.equal(readTarget(key, '0'), 0, key);
    assert.equal(readTarget(key, '150.5'), 150.5, key);
  }
  for (const text of ['', '-10', '2,500', 'abc']) {
    assert.equal(readTarget('kcal', text), null, JSON.stringify(text));
    assert.equal(readTarget('carbs', text), null, JSON.stringify(text));
  }
});

test('a target field shows an override as entered and a calculated target rounded', () => {
  const values = { kcal: 2759.4, protein: 150.5, fat: 76.6, carbs: 0 };
  const overrides = { kcal: null, protein: 150.5, fat: null, carbs: 0 };
  assert.equal(targetText('kcal', values, overrides), '2759');
  assert.equal(targetText('protein', values, overrides), '150.5');
  assert.equal(targetText('fat', values, overrides), '77');
  assert.equal(targetText('carbs', values, overrides), '0');
});

// --- Macro split ---

// TDEE 2759 by bodyweight: 144 g protein, 76.6 g fat, 373.3 g carbs. As in calc.test.js.
const MALE_PLAN = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain', rateKgPerWeek: 0.5 };

test('a doc without a macro split is by bodyweight', () => {
  assert.equal(splitBy(createCoreDoc('2026-10-15')), 'bodyweight');
  assert.equal(splitBy({ macroSplit: { by: 'percent', percent: { protein: 30, fat: 25, carbs: 45 } } }), 'percent');
});

test('switching to percent starts from the saved percents, else the targets, else 30 / 25 / 45', () => {
  const saved = { protein: 40, fat: 30, carbs: 30 };
  const bodyweight = targets(MALE_PLAN);
  assert.deepEqual(startingSplit({ macroSplit: { by: 'bodyweight', percent: saved } }, bodyweight), saved);
  assert.deepEqual(startingSplit(createCoreDoc('2026-10-15'), bodyweight), { protein: 21, fat: 25, carbs: 54 });
  assert.deepEqual(startingSplit(createCoreDoc('2026-10-15'), null), { protein: 30, fat: 25, carbs: 45 });
});

test('the targets barely move on switching to percent from them', () => {
  const doc = createCoreDoc('2026-10-15');
  const bodyweight = targets(MALE_PLAN);
  const percent = targets(MALE_PLAN, {}, setSplitPercent(doc, startingSplit(doc, bodyweight)).macroSplit);
  assert.equal(percent.kcal, bodyweight.kcal);
  // Half a percent of 2,759 kcal at most: 3.4 g of protein or carbs, 1.5 g of fat.
  for (const key of ['protein', 'fat', 'carbs']) {
    assert.ok(Math.abs(percent[key] - bodyweight[key]) <= 3.5, `${key}: ${bodyweight[key]} → ${percent[key]}`);
  }
});

test('a saved split moves the targets, and switching back to bodyweight keeps it for next time', () => {
  const doc = setSplitPercent(createCoreDoc('2026-10-15'), { protein: 35, fat: 25, carbs: 40 });
  assert.deepEqual(doc.macroSplit, { by: 'percent', percent: { protein: 35, fat: 25, carbs: 40 } });
  assertClose(profileTargets(MALE_PLAN, 80, {}, doc.macroSplit).protein, (0.35 * 2759) / 4);

  const back = setSplitBodyweight(doc);
  assert.deepEqual(back.macroSplit, { by: 'bodyweight', percent: { protein: 35, fat: 25, carbs: 40 } });
  assertClose(profileTargets(MALE_PLAN, 80, {}, back.macroSplit).protein, 144);
  assert.deepEqual(startingSplit(back, targets(MALE_PLAN)), { protein: 35, fat: 25, carbs: 40 });
});

test('switching to bodyweight with no percents saved stores none', () => {
  assert.deepEqual(setSplitBodyweight(createCoreDoc('2026-10-15')).macroSplit, { by: 'bodyweight' });
});

test('the split changes leave the doc passed in as it was', () => {
  const doc = setSplitPercent(createCoreDoc('2026-10-15'), { protein: 30, fat: 25, carbs: 45 });
  const before = structuredClone(doc);
  setSplitPercent(doc, { protein: 40, fat: 30, carbs: 30 });
  setSplitBodyweight(doc);
  assert.deepEqual(doc, before);
});

test('a percent is a whole number, with a blank as 0', () => {
  assert.equal(readPercent('35'), 35);
  assert.equal(readPercent(' 0 '), 0);
  assert.equal(readPercent(''), 0);
  for (const text of ['30.5', '-5', '30%', 'abc', '1e2']) assert.equal(readPercent(text), null, JSON.stringify(text));
});

test('a split as typed gives its total, and the split only when it adds up to 100', () => {
  assert.deepEqual(readSplit({ protein: '35', fat: '25', carbs: '40' }), {
    total: 100,
    percent: { protein: 35, fat: 25, carbs: 40 },
  });
  assert.deepEqual(readSplit({ protein: '35', fat: '25', carbs: '45' }), { total: 105, percent: null });
  assert.deepEqual(readSplit({ protein: '', fat: '25', carbs: '45' }), { total: 70, percent: null });
  assert.deepEqual(readSplit({ protein: '30', fat: '', carbs: '70' }), { total: 100, percent: { protein: 30, fat: 0, carbs: 70 } });
  assert.deepEqual(readSplit({ protein: '30.5', fat: '25', carbs: '44.5' }), { total: null, percent: null });
});
