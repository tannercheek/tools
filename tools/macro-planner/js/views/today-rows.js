// Today's slot rows (DESIGN §8): a planned meal, an open flex slot and a filled one, each under
// the slot's name and any change, its eyebrow, which today.js puts above the row. A slot swapped
// to a food or quick numbers, and a planned slot with anything added, show like a filled one, and
// so does Other, after the slots. A planned slot's planned foods are among what it holds (SPEC
// §3.6). A row that's a button keeps its eyebrow as hidden text, so it still says which slot it
// is. Plan's planned slots show what they plan with itemsRow too.

import { entriesTotals, slotMealTotals } from '../calc.js';
import { DEFAULT_EMOJI, OTHER } from '../data.js';
import { amountText, slotIngredients } from '../ingredients.js';
import { listRow, rowActionIcon } from '../ui/row.js';

const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// The slot's name and any change (DESIGN §8): "Lunch · Skipped", "Breakfast · Swapped · Edited · 1.5×".
// A slot planning only foods isn't flex, so it's just its name.
export function slotEyebrow(plan) {
  const marks = [plan.name];
  if (plan.flex) marks.push('Flex');
  else if (plan.skipped) marks.push('Skipped');
  else {
    if (plan.swapped) marks.push('Swapped');
    if (plan.edited) marks.push('Edited');
    if (plan.portion !== 1) marks.push(`${portionFormat.format(plan.portion)}×`);
  }
  return marks.join(' · ');
}

// An edited meal's ingredients as lines under its row (SPEC §3.6, DESIGN §8): each food with its
// amount as its Ingredients sheet shows it ("3 egg"), in place of kcal.
function ingredientLines(items) {
  return items.map(({ emoji, name, qty, unit }) => ({ emoji, label: name, amount: `${amountText(qty)} ${unit}` }));
}

// Something added to a slot, as one of the things the slot holds: { emoji, label, kcal, protein,
// fat, carbs, ingredients }, its line under the row and its share of the slot's total. An added
// meal changed since it was added (it has originalIngredients) lists its ingredients as they are
// in its Ingredients sheet (SPEC §3.6, DESIGN §8 edited extra). The rest stay one line.
function entryItem({ emoji, label, kcal, protein, fat, carbs, ingredients, originalIngredients }) {
  return { emoji, label, kcal, protein, fat, carbs, ingredients: originalIngredients ? ingredientLines(ingredients) : [] };
}

// A planned food (SPEC §3.4), an ingredient snapshot at its own amount, as one of the things the
// slot holds. It's one line, like an added food.
function foodItem({ emoji, name, kcal, protein, fat, carbs }) {
  return { emoji, label: name, kcal, protein, fat, carbs, ingredients: [] };
}

// The slot's planned meal as one of the things it holds, like entryItem, at the slot's portion.
// An edited one lists its ingredients at that portion, as its Ingredients sheet opens with them.
function mealItem(plan, getFood) {
  return {
    emoji: plan.meal.emoji,
    label: plan.meal.name,
    ...slotMealTotals(plan, getFood),
    ingredients: plan.edited ? ingredientLines(slotIngredients(plan, getFood)) : [],
  };
}

// What a slot holds (SPEC §3.6, DESIGN §8): one thing as itself, an edited meal's ingredients
// under the row; several as 🍽️ "N items" with the whole slot's total, then a line each in order,
// an edited meal's ingredients indented under its own line. eyebrowText: the slot's eyebrow, or
// Other's, kept in the button's name. onClick: opens the slot's sheet, on a day that takes changes.
export function itemsRow(eyebrowText, items, onClick) {
  const [first, ...more] = items;
  const several = more.length > 0;
  return listRow({
    emoji: several ? DEFAULT_EMOJI : first.emoji,
    hiddenEyebrow: eyebrowText,
    title: several ? `${items.length} items` : first.label,
    numbers: entriesTotals(items),
    lines: several ? items : first.ingredients,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}

// An open flex slot (DESIGN §8): dashed, with its pinned budget, or else the gap to fill, the
// targets minus the rest of the day, which never shows negative: a day already over shows "over"
// and nothing left. With no targets, or on a day that's passed, it's just open (SPEC §3.4).
// gap: calc.js's flexGap, or null. log: the Log button, on a day that takes changes, which names
// the slot itself ("Log to Snack").
export function openFlexRow(plan, gap, log) {
  let title = 'Open';
  let numbers;
  if (plan.budget) {
    title = 'Budget';
    numbers = plan.budget;
  } else if (gap) {
    title = `${integer.format(gap.kcal.amount)} kcal ${gap.kcal.over ? 'over' : 'to fill'}`;
    numbers = Object.fromEntries(Object.entries(gap).map(([key, { amount, over }]) => [key, over ? 0 : amount]));
  }
  return listRow({ placeholderIcon: 'plus', title, numbers, trailing: log });
}

// A flex slot with something in it is done, so it shows what's in it, like a planned meal
// (DESIGN §8). A slot swapped to a food or quick numbers shows the same way, marked swapped, with
// what was swapped in first, then its planned foods, then what's been added to it, as one list
// (SPEC §3.6). A flex slot plans no foods. onClick: opens what's in it, or the swapped slot's
// actions, on a day that takes changes.
export function filledFlexRow(plan, onClick) {
  const swapped = plan.swapEntry ? [entryItem(plan.swapEntry)] : [];
  const items = [...swapped, ...plan.foods.map(foodItem), ...plan.entries.map(entryItem)];
  return itemsRow(slotEyebrow(plan), items, onClick);
}

// Other (SPEC §3.6, DESIGN §8): what's eaten outside the slots, as a filled flex row with "Other"
// as its whole eyebrow. entries: slots.js's otherEntries, not empty. onClick: opens the Other
// sheet, on a day that takes changes.
export function otherRow(entries, onClick) {
  return itemsRow(OTHER.name, entries.map(entryItem), onClick);
}

// What a planned slot holds (SPEC §3.6): one thing as itself, its meal or its one planned food,
// an edited meal with its ingredients under it, so the change shows without opening it. More than
// one is "N items": the meal first, then its planned foods, then what's been added. A skipped
// meal isn't one of the items, nor are its planned foods, which are skipped with it. A slot left
// holding nothing stays, quietened, as what it plans: its meal, or else its planned foods, with
// "Skipped", or "Removed for today" once the day's planned foods are all removed. Once anything is
// added, the row shows that instead, not quietened, still marked skipped. plannedFoods: the
// template's planned foods as ingredients, for that quiet row on a slot with no meal. onClick:
// opens the slot's actions, on a day that takes changes.
export function plannedRow(plan, getFood, onClick, plannedFoods = []) {
  const meal = plan.meal && !plan.skipped ? [mealItem(plan, getFood)] : [];
  const items = [...meal, ...plan.foods.map(foodItem), ...plan.entries.map(entryItem)];
  if (items.length > 0) return itemsRow(slotEyebrow(plan), items, onClick);
  const [first, ...more] = plannedFoods;
  const several = more.length > 0;
  return listRow({
    emoji: plan.meal?.emoji ?? (several ? DEFAULT_EMOJI : first.emoji),
    hiddenEyebrow: slotEyebrow(plan),
    title: plan.meal?.name ?? (several ? `${plannedFoods.length} items` : first.name),
    numbers: plan.skipped ? 'Skipped' : 'Removed for today',
    muted: true,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}
