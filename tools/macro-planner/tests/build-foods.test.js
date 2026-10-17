import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CATEGORY_EMOJI,
  buildFoods,
  entryProblems,
  foodId,
  indexDataset,
  isSingleEmoji,
  parseCsv,
  portionLabel,
  readTable,
} from '../scripts/build-foods.mjs';

const UNITS = [
  { id: '1001', name: 'tablespoon' },
  { id: '1124', name: 'egg' },
  { id: '9999', name: 'undetermined' },
];

// A one-dataset USDA index from compact rows:
// foods [fdcId, description], nutrients [fdcId, nutrientId, amount],
// portions [fdcId, amount, unitId, modifier, grams]. Superseded foods are in food.csv
// but not in the dataset's own food list.
function usda({ foods = [], superseded = [], nutrients = [], portions = [] }) {
  return indexDataset('SR Legacy', {
    list: foods.map(([fdc_id]) => ({ fdc_id })),
    food: [...foods, ...superseded].map(([fdc_id, description]) => ({ fdc_id, description })),
    nutrients: nutrients.map(([fdc_id, nutrient_id, amount]) => ({ fdc_id, nutrient_id, amount })),
    portions: portions.map(([fdc_id, amount, measure_unit_id, modifier, gram_weight]) => ({
      fdc_id,
      amount,
      measure_unit_id,
      portion_description: '',
      modifier,
      gram_weight,
    })),
    units: UNITS,
  });
}

// SR Legacy's "Egg, whole, raw, fresh", per 100 g.
const EGG = {
  foods: [['171287', 'Egg, whole, raw, fresh']],
  nutrients: [
    ['171287', '1008', '143'],
    ['171287', '1003', '12.56'],
    ['171287', '1004', '9.51'],
    ['171287', '1005', '0.72'],
  ],
  portions: [
    ['171287', '1', '9999', 'large', '50'],
    ['171287', '1', '9999', 'medium', '44'],
  ],
};

// A food with all four values except energy, so each test can supply its own.
function withEnergy(...energyRows) {
  return usda({
    foods: [['1', 'Test food']],
    nutrients: [['1', '1003', '20'], ['1', '1004', '10'], ['1', '1005', '0'], ...energyRows.map(([id, amount]) => ['1', id, amount])],
  });
}

const entry = (overrides = {}) => ({ fdcId: 171287, name: 'Egg, large', emoji: '🥚', ...overrides });

// --- CSV ---

test('CSV parsing handles quoted commas, "" escapes, empty fields, CRLF and line breaks in quotes', () => {
  const text = '"a","b, c","say ""hi"""\r\n"1","",x\n"two\nlines","2","3"\n';
  assert.deepEqual([...parseCsv(text)], [
    ['a', 'b, c', 'say "hi"'],
    ['1', '', 'x'],
    ['two\nlines', '2', '3'],
  ]);
});

test('CSV parsing keeps a last row with no line break after it', () => {
  assert.deepEqual([...parseCsv('"a","b"\n"1","2"')], [['a', 'b'], ['1', '2']]);
});

test('a table keys rows by the header, filters while reading and skips blank lines', () => {
  const text = '"fdc_id","amount"\n"1","5"\n\n"2","6"\n"3","7"\n';
  assert.deepEqual(readTable(text), [
    { fdc_id: '1', amount: '5' },
    { fdc_id: '2', amount: '6' },
    { fdc_id: '3', amount: '7' },
  ]);
  assert.deepEqual(readTable(text, (row) => row.fdc_id !== '2'), [
    { fdc_id: '1', amount: '5' },
    { fdc_id: '3', amount: '7' },
  ]);
});

// --- Portions ---

test('an SR Legacy portion is labelled from its modifier, without the "undetermined" unit', () => {
  const label = portionLabel({ amount: 1, unit: 'undetermined', description: '', modifier: 'large', grams: 50 });
  assert.equal(label, '1 large = 50 g');
});

test('a Foundation portion is labelled with its unit, description and modifier', () => {
  assert.equal(
    portionLabel({ amount: 1, unit: 'egg', description: '', modifier: 'whole without shell', grams: 50.3 }),
    '1 egg, whole without shell = 50.3 g',
  );
  assert.equal(
    portionLabel({ amount: 1, unit: 'cup', description: 'shredded', modifier: ' ', grams: 105 }),
    '1 cup, shredded = 105 g',
  );
});

test('portion amounts and weights are read as numbers, so "1.0" labels as 1', () => {
  const index = usda({ foods: [['1', 'Test']], portions: [['1', '1.0', '1124', 'whole', '50.30']] });
  assert.deepEqual(index.get('1').portions, [{ label: '1 egg, whole = 50.3 g', amount: 1, grams: 50.3 }]);
});

test('portions without an amount or a gram weight are left out', () => {
  const index = usda({
    foods: [['1', 'Test']],
    portions: [['1', '', '9999', 'cup', '100'], ['1', '1', '9999', 'cup', ''], ['1', '1', '9999', 'slice', '0']],
  });
  assert.deepEqual(index.get('1').portions, []);
});

// --- Building foods ---

test('with no portion, a food is per 100 g with USDA values as given, in the SPEC §3.2 shape', () => {
  const { foods, problems } = buildFoods([entry({ name: 'Egg, whole, raw' })], usda(EGG));
  assert.deepEqual(problems, []);
  assert.deepEqual(foods, [
    {
      id: 'usda-171287',
      name: 'Egg, whole, raw',
      serving: { qty: 100, unit: 'g' },
      emoji: '🥚',
      kcal: 143,
      protein: 12.56,
      fat: 9.51,
      carbs: 0.72,
      custom: false,
      archived: false,
    },
  ]);
  assert.deepEqual(Object.keys(foods[0]), ['id', 'name', 'serving', 'emoji', 'kcal', 'protein', 'fat', 'carbs', 'custom', 'archived']);
});

test('a portion sets the serving and scales the numbers to its gram weight', () => {
  const { foods, problems } = buildFoods([entry({ portion: '1 large = 50 g', unit: 'egg' })], usda(EGG));
  assert.deepEqual(problems, []);
  const [egg] = foods;
  assert.deepEqual(egg.serving, { qty: 1, unit: 'egg' });
  assert.deepEqual([egg.kcal, egg.protein, egg.fat, egg.carbs], [71.5, 6.28, 4.755, 0.36]);
});

test("a portion's amount becomes the serving qty", () => {
  const index = usda({
    foods: [['2', 'Peanut butter']],
    nutrients: [['2', '1008', '598'], ['2', '1003', '22.21'], ['2', '1004', '51.36'], ['2', '1005', '22.31']],
    portions: [['2', '2', '9999', 'tbsp', '32']],
  });
  const { foods } = buildFoods([{ fdcId: 2, name: 'Peanut butter', portion: '2 tbsp = 32 g', unit: 'tbsp', emoji: '🥜' }], index);
  assert.deepEqual(foods[0].serving, { qty: 2, unit: 'tbsp' });
  assert.equal(foods[0].kcal, 191.36);
});

test('scaling strips float noise but keeps USDA precision', () => {
  // 148 × 50.3 / 100 is 74.44399999999999 in floating point.
  const index = usda({
    foods: [['3', 'Egg']],
    nutrients: [['3', '1008', '148.0'], ['3', '1003', '12.4'], ['3', '1004', '9.96'], ['3', '1005', '0.96']],
    portions: [['3', '1.0', '1124', 'whole without shell', '50.3']],
  });
  const { foods } = buildFoods([{ fdcId: 3, name: 'Egg', portion: '1 egg, whole without shell = 50.3 g', unit: 'egg', emoji: '🥚' }], index);
  assert.deepEqual([foods[0].kcal, foods[0].protein, foods[0].fat, foods[0].carbs], [74.444, 6.2372, 5.00988, 0.48288]);
});

test('a portion that does not match fails and lists the portions to choose from', () => {
  const { foods, problems } = buildFoods([entry({ portion: '1 large', unit: 'egg' })], usda(EGG));
  assert.deepEqual(foods, []);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /entry 1 \(Egg, large\): no portion "1 large"/);
  assert.match(problems[0], /"1 large = 50 g", "1 medium = 44 g"/);
});

test('a portion without a unit, or a unit without a portion, fails', () => {
  for (const half of [{ portion: '1 large = 50 g' }, { unit: 'egg' }]) {
    const { foods, problems } = buildFoods([entry(half)], usda(EGG));
    assert.deepEqual(foods, []);
    assert.match(problems[0], /portion and unit go together/);
  }
});

// --- Emoji ---

test('a category fills in its default emoji from SPEC §3.2', () => {
  const { foods } = buildFoods([entry({ emoji: undefined, category: 'poultry' })], usda(EGG));
  assert.equal(foods[0].emoji, '🍗');
});

test('an exact emoji wins over a category', () => {
  const { foods } = buildFoods([entry({ emoji: '🥚', category: 'dairy' })], usda(EGG));
  assert.equal(foods[0].emoji, '🥚');
});

test('every SPEC §3.2 category has its default emoji', () => {
  assert.deepEqual(CATEGORY_EMOJI, {
    meat: '🥩',
    poultry: '🍗',
    fish: '🐟',
    grains: '🌾',
    legumes: '🫘',
    dairy: '🥛',
    vegetables: '🥦',
    fruit: '🍎',
    'nuts/seeds': '🥜',
    'oils/fats': '🫒',
    supplements: '🥤',
  });
});

test('an entry with neither an emoji nor a category fails', () => {
  const { foods, problems } = buildFoods([entry({ emoji: undefined })], usda(EGG));
  assert.deepEqual(foods, []);
  assert.deepEqual(problems, ['entry 1 (Egg, large): needs an emoji or a category']);
});

test('an unknown category fails', () => {
  const { problems } = buildFoods([entry({ emoji: undefined, category: 'eggs' })], usda(EGG));
  assert.deepEqual(problems, ['entry 1 (Egg, large): unknown category "eggs"']);
});

test('an emoji must be one emoji character', () => {
  assert.equal(isSingleEmoji('🥚'), true);
  assert.equal(isSingleEmoji('🍽️'), true); // with its variation selector
  assert.equal(isSingleEmoji('egg'), false);
  assert.equal(isSingleEmoji('🥚🥚'), false);
  assert.equal(isSingleEmoji('1'), false);
  assert.equal(isSingleEmoji(''), false);
  const { problems } = buildFoods([entry({ emoji: 'egg' })], usda(EGG));
  assert.deepEqual(problems, ['entry 1 (Egg, large): emoji "egg" isn\'t a single emoji character']);
});

// --- Which foods and values are used ---

test('an fdcId that is not in the datasets fails', () => {
  const { foods, problems } = buildFoods([entry({ fdcId: 999 })], usda(EGG));
  assert.deepEqual(foods, []);
  assert.deepEqual(problems, ["entry 1 (Egg, large): fdcId 999 isn't a current Foundation or SR Legacy food"]);
});

test("a superseded food (in food.csv but not the dataset's own list) is not used", () => {
  const index = usda({ ...EGG, superseded: [['322892', 'Milk, whole, older version']] });
  const { problems } = buildFoods([{ fdcId: 322892, name: 'Milk', emoji: '🥛' }], index);
  assert.deepEqual(problems, ["entry 1 (Milk): fdcId 322892 isn't a current Foundation or SR Legacy food"]);
});

test('energy comes from Energy (1008) when USDA has it', () => {
  const { foods } = buildFoods([{ fdcId: 1, name: 'Test', emoji: '🥚' }], withEnergy(['2047', '170'], ['2048', '175'], ['1008', '176']));
  assert.equal(foods[0].kcal, 176);
});

test('without 1008, energy comes from the Atwater specific factors (2048)', () => {
  const { foods, sources } = buildFoods([{ fdcId: 1, name: 'Test', emoji: '🥚' }], withEnergy(['2047', '170'], ['2048', '175']));
  assert.equal(foods[0].kcal, 175);
  assert.equal(sources[0].energy, 'Energy (Atwater Specific Factors)');
});

test('with only the Atwater general factors (2047), energy comes from those', () => {
  const { foods } = buildFoods([{ fdcId: 1, name: 'Test', emoji: '🥚' }], withEnergy(['2047', '170']));
  assert.equal(foods[0].kcal, 170);
});

test('a missing value fails rather than counting as 0', () => {
  const { foods, problems } = buildFoods([{ fdcId: 1, name: 'Test', emoji: '🥚' }], withEnergy());
  assert.deepEqual(foods, []);
  assert.deepEqual(problems, ['entry 1 (Test): USDA has no kcal value for it']);
});

test('an empty amount in the CSV counts as missing, not 0', () => {
  const index = usda({
    foods: [['1', 'Test']],
    nutrients: [['1', '1008', '100'], ['1', '1003', ''], ['1', '1004', '1'], ['1', '1005', '1']],
  });
  const { problems } = buildFoods([{ fdcId: 1, name: 'Test', emoji: '🥚' }], index);
  assert.deepEqual(problems, ['entry 1 (Test): USDA has no protein value for it']);
});

test('conflicting rows for one nutrient fail; identical repeats are fine', () => {
  const conflicting = usda({ ...EGG, nutrients: [...EGG.nutrients, ['171287', '1003', '12.6']] });
  assert.deepEqual(buildFoods([entry()], conflicting).problems, [
    'entry 1 (Egg, large): USDA has conflicting protein values: 12.56, 12.6',
  ]);
  const repeated = usda({ ...EGG, nutrients: [...EGG.nutrients, ['171287', '1003', '12.56']] });
  assert.deepEqual(buildFoods([entry()], repeated).problems, []);
});

const large = { portion: '1 large = 50 g', unit: 'egg' };
const medium = { name: 'Egg, medium', portion: '1 medium = 44 g', unit: 'egg' };

test('the same fdcId twice without variants fails, since both would be usda-<fdcId>', () => {
  const { foods, problems } = buildFoods([entry(large), entry(medium)], usda(EGG));
  assert.equal(foods.length, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^entry 2 \(Egg, medium\): id usda-171287 is already entry 1's/);
});

test('variants let one USDA food give several entries, each with its own id and serving', () => {
  const list = [entry({ ...large, variant: 'large' }), entry({ ...medium, variant: 'medium' })];
  const { foods, problems } = buildFoods(list, usda(EGG));
  assert.deepEqual(problems, []);
  assert.deepEqual(foods.map(({ id, kcal }) => [id, kcal]), [['usda-171287-large', 71.5], ['usda-171287-medium', 62.92]]);
});

test('a variant can be added beside an existing plain id, which stays as it is', () => {
  const { foods, problems } = buildFoods([entry(large), entry({ ...medium, variant: 'medium' })], usda(EGG));
  assert.deepEqual(problems, []);
  assert.deepEqual(foods.map(({ id }) => id), ['usda-171287', 'usda-171287-medium']);
});

test('the same variant twice fails', () => {
  const { problems } = buildFoods([entry({ ...large, variant: 'large' }), entry({ ...medium, variant: 'large' })], usda(EGG));
  assert.match(problems[0], /^entry 2 \(Egg, medium\): id usda-171287-large is already entry 1's/);
});

test('a variant is lowercase letters, digits and hyphens', () => {
  assert.equal(foodId({ fdcId: 171287, variant: 'extra-large' }), 'usda-171287-extra-large');
  for (const variant of ['Medium', 'extra large', '', '-small']) {
    assert.match(entryProblems(entry({ variant })).join(), /must be lowercase letters, digits and hyphens/, variant);
  }
});

test('every problem is reported, not just the first', () => {
  const list = [entry({ emoji: undefined }), entry({ fdcId: 999, name: 'Missing' })];
  assert.equal(buildFoods(list, usda(EGG)).problems.length, 2);
});

test('an entry needs a whole-number fdcId and a name', () => {
  assert.deepEqual(entryProblems({ fdcId: '171287', name: ' ', emoji: '🥚' }), ['fdcId must be a whole number', 'name is missing']);
});

// --- The committed files ---

const foodList = JSON.parse(readFileSync(new URL('../scripts/food-list.json', import.meta.url), 'utf8'));
const bundledFoods = JSON.parse(readFileSync(new URL('../data/foods.json', import.meta.url), 'utf8'));

test('food-list.json entries are all valid, with no id used twice', () => {
  assert.deepEqual(foodList.flatMap((item) => entryProblems(item).map((problem) => `${item.name}: ${problem}`)), []);
  assert.equal(new Set(foodList.map(foodId)).size, foodList.length);
});

test('foods.json was rebuilt from the current food-list.json', () => {
  assert.deepEqual(
    bundledFoods.map(({ id, name, emoji, serving }) => ({ id, name, emoji, unit: serving.unit })),
    foodList.map((item) => ({
      id: foodId(item),
      name: item.name,
      emoji: item.emoji ?? CATEGORY_EMOJI[item.category],
      unit: item.unit ?? 'g',
    })),
  );
});

test('every bundled food has a USDA id, one emoji character, a serving and four numbers', () => {
  for (const food of bundledFoods) {
    assert.match(food.id, /^usda-\d+(-[a-z0-9]+)*$/, food.name);
    assert.ok(isSingleEmoji(food.emoji), food.name);
    assert.ok(food.serving.qty > 0 && food.serving.unit !== '', food.name);
    for (const key of ['kcal', 'protein', 'fat', 'carbs']) {
      assert.ok(Number.isFinite(food[key]) && food[key] >= 0, `${food.name} ${key}`);
    }
    assert.equal(food.custom, false);
    assert.equal(food.archived, false);
  }
});
