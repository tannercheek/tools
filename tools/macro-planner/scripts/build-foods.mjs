#!/usr/bin/env node
// Builds data/foods.json from USDA FoodData Central CSV downloads.
//
//   node tools/macro-planner/scripts/build-foods.mjs <usda-folder>
//
// <usda-folder> holds the unzipped Foundation and SR Legacy CSV downloads from
// fdc.nal.usda.gov/download-datasets. Keep it outside the repo. Only the foods listed in
// scripts/food-list.json are written, and every number comes straight from USDA.
//
// food-list.json is an array of entries like these:
//   { "fdcId": 171287, "variant": "large", "name": "Egg, large", "portion": "1 large = 50 g", "unit": "egg", "emoji": "🥚" }
//   { "fdcId": 168878, "name": "Rice, white, cooked", "emoji": "🍚", "portions": [{ "portion": "1 cup = 158 g", "unit": "cup" }] }
//   { "fdcId": 2646170, "name": "Chicken breast, skinless, raw", "category": "poultry", "portions": [{ "unit": "oz" }] }
// - The id is usda-<fdcId>, plus -<variant> when one USDA food gives several entries (egg sizes).
//   Ids must be unique and never change once set, because meals refer to foods by id.
// - portion + unit: the serving is that USDA portion, counted in `unit`. Without them it's 100 g.
//   A portion that doesn't match fails the build and lists the food's portions to copy from.
// - portions: the food's other units (SPEC §3.2), the first one its default. Each is a USDA
//   portion shown as `unit`, matched like the serving's, or { "unit": "oz" }, which needs no
//   USDA portion because an ounce is the same weight on any food.
// - emoji, or a category for its default emoji (SPEC §3.2). An emoji wins over a category.
//
// Any problem fails the whole build and writes nothing, so foods.json is never half-built.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FOOD_LIST = join(SCRIPT_DIR, 'food-list.json');
const FOODS_JSON = join(SCRIPT_DIR, '..', 'data', 'foods.json');

// Each download's own food list names its current foods. food.csv also holds superseded
// versions and the lab samples behind them, which mustn't be used.
const DATASETS = [
  { name: 'Foundation', listFile: 'foundation_food.csv' },
  { name: 'SR Legacy', listFile: 'sr_legacy_food.csv' },
];

// SPEC §3.2.
export const CATEGORY_EMOJI = Object.freeze({
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

// Units that are weights, in grams by definition, so they need no USDA portion. USDA's own
// "3 oz = 85 g" rows are rounded to the gram, so they'd make 12 oz differ between foods.
export const WEIGHT_UNITS = Object.freeze({ oz: 28.349523125 });

// USDA nutrient ids, most preferred first. SR Legacy always has Energy (1008). Many
// Foundation foods only report energy from Atwater factors; where one has both, 1008
// matches the specific-factor value (2048), so that comes next.
const NUTRIENT_IDS = {
  kcal: ['1008', '2048', '2047'],
  protein: ['1003'],
  fat: ['1004'],
  carbs: ['1005'],
};

const ENERGY_NAMES = {
  1008: 'Energy',
  2048: 'Energy (Atwater Specific Factors)',
  2047: 'Energy (Atwater General Factors)',
};

// --- CSV ---

// Rows of a CSV file as arrays of strings. Handles quoted fields, "" escapes, and
// commas or line breaks inside quotes.
export function* parseCsv(text) {
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      yield row;
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    yield row;
  }
}

// A CSV file's rows as objects keyed by its header. keep(row) filters while reading,
// so the big nutrient tables only hold the foods being built.
export function readTable(text, keep = () => true) {
  const rows = parseCsv(text);
  const header = rows.next().value ?? [];
  const table = [];
  for (const cells of rows) {
    if (cells.length === 1 && cells[0] === '') continue;
    const row = Object.fromEntries(header.map((key, i) => [key, cells[i] ?? '']));
    if (keep(row)) table.push(row);
  }
  return table;
}

// USDA leaves a missing value empty, and Number('') is 0, so empty must not become a number.
function toNumber(text) {
  const value = text.trim() === '' ? NaN : Number(text);
  return Number.isFinite(value) ? value : null;
}

// --- USDA index ---

// How a portion is named in food-list.json: "1 large = 50 g", "1 egg, whole without shell = 50.3 g".
// SR Legacy puts the whole description in the modifier and gives the unit as "undetermined".
export function portionLabel({ amount, unit, description, modifier, grams }) {
  const words = [unit === 'undetermined' ? '' : unit, description, modifier]
    .map((text) => text.trim())
    .filter(Boolean);
  return `${[amount, words.join(', ')].filter(Boolean).join(' ')} = ${grams} g`;
}

// One dataset's current foods by fdcId, each with its nutrient amounts per 100 g and its
// portions. tables holds parsed CSVs: list (the dataset's own food list), food,
// nutrients (food_nutrient), portions (food_portion) and units (measure_unit).
export function indexDataset(dataset, tables) {
  const current = new Set(tables.list.map((row) => row.fdc_id));
  const foods = new Map();
  for (const row of tables.food) {
    if (!current.has(row.fdc_id)) continue;
    foods.set(row.fdc_id, { dataset, description: row.description, nutrients: new Map(), portions: [] });
  }

  for (const row of tables.nutrients) {
    const food = foods.get(row.fdc_id);
    const amount = toNumber(row.amount);
    if (!food || amount === null) continue;
    food.nutrients.set(row.nutrient_id, [...(food.nutrients.get(row.nutrient_id) ?? []), amount]);
  }

  const unitNames = new Map(tables.units.map((row) => [row.id, row.name]));
  for (const row of tables.portions) {
    const food = foods.get(row.fdc_id);
    const amount = toNumber(row.amount);
    const grams = toNumber(row.gram_weight);
    if (!food || !(amount > 0) || !(grams > 0)) continue;
    const label = portionLabel({
      amount,
      unit: unitNames.get(row.measure_unit_id) ?? '',
      description: row.portion_description,
      modifier: row.modifier,
      grams,
    });
    food.portions.push({ label, amount, grams });
  }
  return foods;
}

// --- Building foods ---

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

// One emoji character: "🥚" or "🍽️", not "egg" or "🥚🥚".
export function isSingleEmoji(text) {
  return (
    typeof text === 'string' &&
    [...graphemes.segment(text)].length === 1 &&
    /\p{Extended_Pictographic}/u.test(text)
  );
}

const VARIANT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The bundled food's id: "usda-171287", or "usda-171287-medium" with a variant.
export function foodId(entry) {
  return `usda-${entry.fdcId}${entry.variant === undefined ? '' : `-${entry.variant}`}`;
}

// What's wrong with a food-list entry on its own, without the USDA data.
export function entryProblems(entry) {
  const problems = [];
  if (!Number.isInteger(entry.fdcId) || entry.fdcId <= 0) problems.push('fdcId must be a whole number');
  if (typeof entry.name !== 'string' || entry.name.trim() === '') problems.push('name is missing');
  if (entry.variant !== undefined && !VARIANT_PATTERN.test(entry.variant)) {
    problems.push(`variant "${entry.variant}" must be lowercase letters, digits and hyphens, like "medium"`);
  }
  if (entry.emoji !== undefined) {
    if (!isSingleEmoji(entry.emoji)) problems.push(`emoji "${entry.emoji}" isn't a single emoji character`);
  } else if (entry.category === undefined) {
    problems.push('needs an emoji or a category');
  } else if (!Object.hasOwn(CATEGORY_EMOJI, entry.category)) {
    problems.push(`unknown category "${entry.category}"`);
  }
  if ((entry.portion === undefined) !== (entry.unit === undefined)) {
    problems.push('portion and unit go together: give both, or neither for 100 g');
  }
  if (entry.portions !== undefined && !Array.isArray(entry.portions)) {
    problems.push('portions must be a list');
  } else {
    problems.push(...portionProblems(entry));
  }
  return problems;
}

// Grams is always one of a bundled food's units, and so is its serving's unit, so a portion
// can't repeat either, or another portion.
function portionProblems(entry) {
  const problems = [];
  const units = new Set(['g', entry.unit ?? 'g']);
  (entry.portions ?? []).forEach((item, index) => {
    const { portion, unit } = item ?? {};
    const named = typeof unit === 'string' && unit.trim() !== '';
    const which = `portion ${index + 1}${named ? ` (${unit})` : ''}`;
    if (!named) {
      problems.push(`${which} needs a unit`);
      return;
    }
    const isWeight = Object.hasOwn(WEIGHT_UNITS, unit);
    if (portion === undefined && !isWeight) {
      problems.push(`${which} needs the USDA portion it comes from; only oz goes without one`);
    } else if (portion !== undefined && isWeight) {
      problems.push(`${which} is always ${WEIGHT_UNITS[unit]} g, so leave out its portion`);
    }
    if (units.has(unit)) problems.push(`${which} is already one of the food's units`);
    units.add(unit);
  });
  return problems;
}

// A value per 100 g scaled to the serving. Rounding to 12 significant digits only strips
// float noise from the multiply (74.44399999999999 → 74.444); USDA's precision is kept.
function perServing(per100g, grams) {
  return Number(((per100g * grams) / 100).toPrecision(12));
}

// The USDA portion with this label, or a problem listing the food's portions to copy from.
function findPortion(usda, label) {
  const portion = usda.portions.find((option) => option.label === label);
  if (portion) return { portion };
  const options = usda.portions.map((option) => `"${option.label}"`).join(', ') || 'none';
  return { problem: `no portion "${label}". USDA's portions for this food: ${options}` };
}

// The entry's portions as { unit, grams }, grams being the weight of 1 of the unit, so
// "2 tbsp = 32 g" is { unit: "tbsp", grams: 16 }. Leaves out the ones entryProblems reports.
function buildPortions(entry, usda, problems) {
  const portions = [];
  for (const item of Array.isArray(entry.portions) ? entry.portions : []) {
    const { portion: label, unit } = item ?? {};
    if (Object.hasOwn(WEIGHT_UNITS, unit)) {
      if (label === undefined) portions.push({ unit, grams: WEIGHT_UNITS[unit] });
      continue;
    }
    if (label === undefined) continue;
    const { portion, problem } = findPortion(usda, label);
    if (problem) problems.push(problem);
    else portions.push({ unit, grams: Number((portion.grams / portion.amount).toPrecision(12)) });
  }
  return portions;
}

function buildFood(entry, usdaFoods) {
  const problems = entryProblems(entry);
  const usda = usdaFoods.get(String(entry.fdcId));
  if (!usda) {
    problems.push(`fdcId ${entry.fdcId} isn't a current Foundation or SR Legacy food`);
    return { problems };
  }

  let serving = { qty: 100, unit: 'g' };
  let grams = 100;
  if (entry.portion !== undefined) {
    const { portion, problem } = findPortion(usda, entry.portion);
    if (portion) {
      serving = { qty: portion.amount, unit: entry.unit };
      grams = portion.grams;
    } else {
      problems.push(problem);
    }
  }
  const portions = buildPortions(entry, usda, problems);

  const per100g = {};
  let energyId;
  for (const [key, ids] of Object.entries(NUTRIENT_IDS)) {
    const id = ids.find((nutrientId) => usda.nutrients.has(nutrientId));
    const amounts = [...new Set(usda.nutrients.get(id) ?? [])];
    if (amounts.length === 0) problems.push(`USDA has no ${key} value for it`);
    else if (amounts.length > 1) problems.push(`USDA has conflicting ${key} values: ${amounts.join(', ')}`);
    else per100g[key] = amounts[0];
    if (key === 'kcal') energyId = id;
  }

  if (problems.length > 0) return { problems };
  const food = {
    id: foodId(entry),
    name: entry.name.trim(),
    serving,
    emoji: entry.emoji ?? CATEGORY_EMOJI[entry.category],
    kcal: perServing(per100g.kcal, grams),
    protein: perServing(per100g.protein, grams),
    fat: perServing(per100g.fat, grams),
    carbs: perServing(per100g.carbs, grams),
    grams,
    portions,
    custom: false,
    archived: false,
  };
  const source = { dataset: usda.dataset, description: usda.description, grams, energy: ENERGY_NAMES[energyId] };
  return { food, source, problems };
}

// food-list entries → foods.json records, plus where each one came from for the build log.
// Collects every problem rather than stopping at the first.
export function buildFoods(foodList, usdaFoods) {
  const foods = [];
  const sources = [];
  const problems = [];
  const entryById = new Map();
  foodList.forEach((entry, index) => {
    const where = `entry ${index + 1}${typeof entry.name === 'string' ? ` (${entry.name})` : ''}`;
    const id = foodId(entry);
    const earlier = entryById.get(id);
    if (earlier !== undefined) {
      problems.push(`${where}: id ${id} is already entry ${earlier}'s. To use one USDA food twice, give each entry its own variant`);
      return;
    }
    if (Number.isInteger(entry.fdcId)) entryById.set(id, index + 1);

    const built = buildFood(entry, usdaFoods);
    problems.push(...built.problems.map((problem) => `${where}: ${problem}`));
    if (built.food) {
      foods.push(built.food);
      sources.push(built.source);
    }
  });
  return { foods, sources, problems };
}

// --- Command line ---

function fail(message) {
  console.error(message);
  process.exit(1);
}

// The dataset's unzipped folder: `folder` itself or one level down, found by its food list.
function findDatasetDir(folder, { name, listFile }) {
  const subfolders = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(folder, entry.name));
  const found = [folder, ...subfolders].filter((dir) => existsSync(join(dir, listFile)));
  if (found.length === 0) fail(`No ${name} download in ${folder} (looked for ${listFile}). Unzip it there.`);
  if (found.length > 1) fail(`More than one ${name} download in ${folder}: ${found.map((dir) => basename(dir)).join(', ')}. Keep one.`);
  return found[0];
}

function loadDataset(dir, dataset, fdcIds) {
  const read = (file, keep) => readTable(readFileSync(join(dir, file), 'utf8'), keep);
  const wanted = (row) => fdcIds.has(row.fdc_id);
  return indexDataset(dataset.name, {
    list: read(dataset.listFile, wanted),
    food: read('food.csv', wanted),
    nutrients: read('food_nutrient.csv', wanted),
    portions: read('food_portion.csv', wanted),
    units: read('measure_unit.csv'),
  });
}

function logLine(food, source) {
  const n = (value) => value.toFixed(1);
  const kcalFrom = source.energy === ENERGY_NAMES[1008] ? '' : `, kcal is ${source.energy}`;
  const grams = food.serving.unit === 'g' ? '' : ` (${source.grams} g)`;
  const portions = food.portions.map((portion) => `1 ${portion.unit} = ${portion.grams} g`).join(', ');
  return [
    `  ${food.emoji} ${food.name}: ${food.serving.qty} ${food.serving.unit}${grams} · ` +
      `${n(food.kcal)} kcal, P ${n(food.protein)}, F ${n(food.fat)}, C ${n(food.carbs)}`,
    `      ${food.id}, ${source.dataset}: "${source.description}"${kcalFrom}`,
    ...(portions ? [`      portions: ${portions}`] : []),
  ].join('\n');
}

function main([folder]) {
  if (!folder) fail('Usage: node tools/macro-planner/scripts/build-foods.mjs <folder with the unzipped USDA CSV downloads>');
  if (!existsSync(folder)) fail(`No such folder: ${folder}`);

  const foodList = JSON.parse(readFileSync(FOOD_LIST, 'utf8'));
  if (!Array.isArray(foodList)) fail('food-list.json must be an array of entries.');
  const fdcIds = new Set(foodList.map((entry) => String(entry.fdcId)));

  const usdaFoods = new Map();
  for (const dataset of DATASETS) {
    const dir = findDatasetDir(folder, dataset);
    console.log(`${dataset.name}: ${basename(dir)}`);
    for (const [fdcId, food] of loadDataset(dir, dataset, fdcIds)) usdaFoods.set(fdcId, food);
  }

  const { foods, sources, problems } = buildFoods(foodList, usdaFoods);
  if (problems.length > 0) {
    fail(`\nfoods.json not written. Fix food-list.json:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }

  // One food per line, so a diff shows exactly which foods changed.
  mkdirSync(dirname(FOODS_JSON), { recursive: true });
  writeFileSync(FOODS_JSON, `[\n${foods.map((food) => `  ${JSON.stringify(food)}`).join(',\n')}\n]\n`);

  console.log(`\nWrote ${foods.length} foods to ${relative(process.cwd(), FOODS_JSON)}. Check each matches its USDA food:\n`);
  console.log(foods.map((food, i) => logLine(food, sources[i])).join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
