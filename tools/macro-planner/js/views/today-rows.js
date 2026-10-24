// Today's slot rows (DESIGN §8): a planned meal, an open flex slot and a filled one, each with the
// slot's name and any change in its eyebrow. A slot swapped to a food or quick numbers, and a
// planned slot with anything added, show like a filled one, and so does Other, after the slots.

import { entriesTotals, slotTotals } from '../calc.js';
import { DEFAULT_EMOJI, OTHER } from '../data.js';
import { amountText, slotIngredients } from '../ingredients.js';
import { listRow, rowActionIcon } from '../ui/row.js';

const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// The slot's name and any change (DESIGN §8): "Lunch · Skipped", "Breakfast · Swapped · Edited · 1.5×".
function eyebrow(plan) {
  const marks = [plan.name];
  if (!plan.meal) marks.push('Flex');
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

// The slot's planned meal as one of the things it holds, like entryItem, at the slot's portion.
// An edited one lists its ingredients at that portion, as its Ingredients sheet opens with them.
function mealItem(plan, getFood) {
  return {
    emoji: plan.meal.emoji,
    label: plan.meal.name,
    ...slotTotals(plan, getFood),
    ingredients: plan.edited ? ingredientLines(slotIngredients(plan, getFood)) : [],
  };
}

// What a slot holds (SPEC §3.6, DESIGN §8): one thing as itself, an edited meal's ingredients
// under the row; several as 🍽️ "N items" with the whole slot's total, then a line each in order,
// an edited meal's ingredients indented under its own line. eyebrowText: the slot's eyebrow, or
// Other's. onClick: opens the slot's sheet, on a day that takes changes.
function itemsRow(eyebrowText, items, onClick) {
  const [first, ...more] = items;
  const several = more.length > 0;
  return listRow({
    emoji: several ? DEFAULT_EMOJI : first.emoji,
    eyebrow: eyebrowText,
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
// gap: calc.js's flexGap, or null. log: the Log button, on a day that takes changes.
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
  return listRow({ placeholderIcon: 'plus', eyebrow: eyebrow(plan), title, numbers, trailing: log });
}

// A flex slot with something in it is done, so it shows what's in it, like a planned meal
// (DESIGN §8). A slot swapped to a food or quick numbers shows the same way, marked swapped, with
// what was swapped in first, then what's been added to it, as one list (SPEC §3.6). onClick:
// opens what's in it, or the swapped slot's actions, on a day that takes changes.
export function filledFlexRow(plan, onClick) {
  const entries = plan.swapEntry ? [plan.swapEntry, ...plan.entries] : plan.entries;
  return itemsRow(eyebrow(plan), entries.map(entryItem), onClick);
}

// Other (SPEC §3.6, DESIGN §8): what's eaten outside the slots, as a filled flex row with "Other"
// as its whole eyebrow. entries: slots.js's otherEntries, not empty. onClick: opens the Other
// sheet, on a day that takes changes.
export function otherRow(entries, onClick) {
  return itemsRow(OTHER.name, entries.map(entryItem), onClick);
}

// A planned meal on its own shows the meal and what it adds to the day, an edited one with its
// ingredients under it, so the change shows without opening it. Once anything is added, it's
// "N items", the meal first. A skipped meal isn't one of the items (SPEC §3.6): on its own it
// stays, quietened, with "Skipped" for numbers; once anything is added, the row shows that
// instead, not quietened, still marked skipped. onClick: opens the slot's actions, on a day that
// takes changes.
export function plannedRow(plan, getFood, onClick) {
  const added = plan.entries.map(entryItem);
  if (!plan.skipped) return itemsRow(eyebrow(plan), [mealItem(plan, getFood), ...added], onClick);
  if (added.length > 0) return itemsRow(eyebrow(plan), added, onClick);
  return listRow({
    emoji: plan.meal.emoji,
    eyebrow: eyebrow(plan),
    title: plan.meal.name,
    numbers: 'Skipped',
    muted: true,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}
